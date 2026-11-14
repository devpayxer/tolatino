import "server-only";
import { avisar } from "../avisos";
import { valores } from "../config";
import { BASE_URL, encolar } from "../correo";
import { marco } from "../correo/plantillas";
import { db, tx } from "../db";
import { AVISO_DESDE, AVISO_HASTA } from "./comun";

/* 9i · El aviso «tu ciudad abrió» a su lista de espera (fase9-apertura.md §4 9i; LAUNCH 9h → 9i: city_waitlist «Avísame» y early_access de la landing).
   - Lo dispara el paso 7 del asistente (la ciudad queda «on» con su apertura «abierta»); lo manda el barrido, por partes (ciudad_aviso_lote por pasada),
     SOLO de 9 AM a 9 PM de la ciudad: de noche espera a la mañana (nunca rompe las horas de silencio).
   - UNA vez por persona y ciudad: city_notices (único por ciudad y persona, solo inserción) se reclama en la misma escritura del lote; abrir otra vez la
     ciudad, dos barridos a la vez o una persona en las dos listas no repiten el aviso. Cada fila de la lista queda marcada (notified_at + notice_result:
     avisado · ya_avisado · sin_cuenta) y early_access.notified_at también.
   - Por los canales de siempre: la bandeja y el push (avisar, plantilla ciudad_abierta; push primero), el SMS solo si no tiene la app (sms_mode
     «sin_push», con STOP y modo pruebas como todo SMS) y el correo si lo tiene verificado (email_outbox, plantilla city_open). Nada de red dentro de la
     transacción.
   - Quien pidió la ciudad SIN cuenta (un teléfono que nunca se verificó con código, «Avísame» del selector): no se le escribe (decisión de 9i en
     REVISION: un SMS a un número no verificado no se manda); queda «sin_cuenta». Si ese teléfono ya tiene cuenta, se le avisa a la cuenta. */

type Ciu = { id: string; name: string; launch: string };
export async function avisarAperturas(): Promise<number> {
  const cfg = await valores("ciudad_aviso_lote");
  const C = (await db().query<Ciu>(
    `select c.id, c.name, l.id::text as launch from cities c
       join lateral (select x.id from city_launches x where x.city_id = c.id and x.status = 'abierta' order by x.id desc limit 1) l on true
      where c.status = 'on' and extract(hour from now() at time zone c.timezone) between ${AVISO_DESDE} and ${AVISO_HASTA}
        and (exists (select 1 from city_waitlist w where w.city_id = c.id and w.notified_at is null and w.removed_at is null)
          or exists (select 1 from early_access e where e.city_id = c.id and e.notified_at is null and e.removed_at is null))
      order by c.sort limit 5`)).rows;
  let n = 0;
  for (const c of C) n += await lote(c, Math.max(50, Math.min(5000, cfg.ciudad_aviso_lote)));
  return n;
}

async function lote(c: Ciu, max: number): Promise<number> {
  const r = await tx(async (q) => {
    const W = (await q.query<{ id: string; uid: string | null }>(
      `select w.id::text, coalesce(w.user_id, (select u.id from users u where w.user_id is null and u.phone = w.contact and u.status <> 'deleted' limit 1))::text as uid
         from city_waitlist w where w.city_id = $1 and w.notified_at is null and w.removed_at is null order by w.id limit $2 for update of w skip locked`, [c.id, max])).rows;
    const E = (await q.query<{ id: string; uid: string }>(
      `select e.id::text, e.user_id::text as uid from early_access e where e.city_id = $1 and e.notified_at is null and e.removed_at is null order by e.id limit $2 for update skip locked`, [c.id, max])).rows;
    const uids = [...new Set([...W, ...E].map((x) => x.uid).filter((x): x is string => !!x))];
    // Una sola escritura reclama a cada persona (único por ciudad y persona): quien ya recibió el aviso de esta ciudad no sale aquí.
    const reclamados = (await q.query<{ uid: string }>(
      `insert into city_notices (city_id, launch_id, user_id, por_correo)
       select $1, $2::bigint, u.id, coalesce(u.email_verified, false) and u.email is not null from users u where u.id = any($3::uuid[]) and u.status <> 'deleted'
       on conflict (city_id, user_id) do nothing returning user_id::text as uid`, [c.id, c.launch, uids])).rows;
    const avisados = reclamados.map((x) => x.uid);
    const nuevos = avisados.length ? (await q.query<{ uid: string; correo: string | null; lang: string }>(
      `select u.id::text as uid, case when coalesce(u.email_verified, false) then u.email::text end as correo, coalesce(u.lang, 'es') as lang from users u where u.id = any($1::uuid[])`, [avisados])).rows : [];
    if (W.length) await q.query(
      `update city_waitlist w set notified_at = now(), notice_launch_id = $1::bigint,
              notice_result = case when x.uid is null then 'sin_cuenta' when x.uid = any($2::uuid[]) and x.primera then 'avisado' else 'ya_avisado' end
         from (select id, uid, row_number() over (partition by uid order by id) = 1 as primera from unnest($3::bigint[], $4::uuid[]) as t(id, uid)) x
        where w.id = x.id`, [c.launch, avisados, W.map((x) => x.id), W.map((x) => x.uid)]);
    if (E.length) await q.query(`update early_access set notified_at = now() where id = any($1::bigint[])`, [E.map((x) => x.id)]);
    return { nuevos, n: W.length + E.length };
  });
  const base = BASE_URL();
  for (const u of r.nuevos) {
    await avisar(u.uid, "ciudad_abierta", { ciudad: c.name }, { href: "/", ref: ["city", c.id] });
    if (!u.correo) continue;
    const es = u.lang !== "en";
    const { html, text } = marco({ es, pre: es ? `To'Latino ya abrió en ${c.name}` : `To'Latino is now open in ${c.name}`, titulo: es ? `To'Latino ya abrió en ${c.name}` : `To'Latino is now open in ${c.name}`,
      intro: es ? `Ya puedes ver los negocios, los eventos y la comunidad de ${c.name}. Te lo avisamos una sola vez, como prometimos.` : `You can now see the businesses, events and community of ${c.name}. We tell you just once, as promised.`,
      cta: { l: es ? "Abrir To'Latino" : "Open To'Latino", href: `${base}/` },
      pie: es ? "Te llega porque pediste que te avisáramos cuando abriera tu ciudad. No te vamos a escribir otra vez por esto." : "You get this because you asked us to tell you when your city opened. We will not write again about this." });
    await encolar({ userId: u.uid, city: c.id, to: u.correo, tpl: "city_open", subject: es ? `To'Latino ya abrió en ${c.name}` : `To'Latino is now open in ${c.name}`, html, text, ref: ["city", c.id], idem: `ciudad:${c.id}:${u.uid}` }).catch(() => null);
  }
  return r.n;
}

/* El avance del aviso de la última apertura de una ciudad (Super Admin › Ciudades). */
export async function progresoAviso(ciudadId: string) {
  const r = (await db().query<{ avisados: number; ya: number; sin: number; faltan: number; correo: number; hora: number }>(
    `select (select count(*)::int from city_notices n where n.city_id = $1 and n.launch_id = (select max(id) from city_launches where city_id = $1 and status = 'abierta')) as avisados,
            (select count(*)::int from city_waitlist w where w.city_id = $1 and w.notice_result = 'ya_avisado') as ya,
            (select count(*)::int from city_waitlist w where w.city_id = $1 and w.notice_result = 'sin_cuenta') as sin,
            (select count(*)::int from city_waitlist w where w.city_id = $1 and w.notified_at is null and w.removed_at is null)
              + (select count(*)::int from early_access e where e.city_id = $1 and e.notified_at is null and e.removed_at is null) as faltan,
            (select count(*)::int from city_notices n where n.city_id = $1 and n.por_correo) as correo,
            extract(hour from now() at time zone (select timezone from cities where id = $1))::int as hora`, [ciudadId])).rows[0]!;
  return { ...r, saleAhora: r.hora >= AVISO_DESDE && r.hora <= AVISO_HASTA };
}
