import "server-only";
import { avisar } from "./avisos";
import { db } from "./db";

/* 9m · Alertas de la persona (L318, L336): las de «Avísame cuando haya» (búsquedas) y «Avísame de nuevas vacantes», listadas en Mi cuenta › Avisos con
   «Quitar» (queda removed_at: nada se borra). La de vacantes es una por persona y ciudad; el barrido avisa UNA vez por vacante nueva publicada
   después de la alerta (notif_once), de 9 AM a 9 PM de la ciudad y con un tope de 3 al día por persona. */
export type Alerta = { id: string; kind: "busqueda" | "vacantes"; q: string; ciudad: string; at: string; avisada: boolean };

export async function misAlertas(userId: string): Promise<Alerta[]> {
  return (await db().query<Alerta>(
    `select a.id::text, a.kind, a.query as q, c.name as ciudad, to_char(a.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, a.notified_at is not null as avisada
       from search_alerts a join cities c on c.id = a.city_id where a.user_id = $1 and a.removed_at is null order by a.created_at desc limit 50`, [userId])).rows;
}

export async function quitarAlerta(userId: string, id: string): Promise<boolean> {
  if (!/^\d{1,18}$/.test(String(id))) return false;
  return ((await db().query(`update search_alerts set removed_at = now() where id = $1::bigint and user_id = $2 and removed_at is null`, [id, userId])).rowCount ?? 0) > 0;
}

/* «Avísame de nuevas vacantes» en una ciudad (una viva por persona y ciudad). Devuelve si quedó (o ya estaba). */
export async function avisameVacantes(userId: string, ciudad: string): Promise<boolean> {
  if (!/^[a-z]{2,8}$/.test(ciudad)) return false;
  await db().query(
    `insert into search_alerts (user_id, city_id, query, filters, kind) select $1, $2, 'vacantes', '{"kind":"vacantes"}'::jsonb, 'vacantes'
      where exists (select 1 from cities where id = $2) on conflict do nothing`, [userId, ciudad]);
  return ((await db().query(`select 1 from search_alerts where user_id = $1 and city_id = $2 and kind = 'vacantes' and removed_at is null`, [userId, ciudad])).rowCount ?? 0) > 0;
}
export async function tieneAlertaVacantes(userId: string, ciudad: string): Promise<boolean> {
  return ((await db().query(`select 1 from search_alerts where user_id = $1 and city_id = $2 and kind = 'vacantes' and removed_at is null`, [userId, ciudad])).rowCount ?? 0) > 0;
}

/* El barrido: cada vacante publicada (y visible) después de la alerta, una vez por alerta y vacante; de 9 AM a 9 PM de la ciudad; ≤ 3 al día por
   persona (lo que pasa del tope sale en la próxima vuelta del día siguiente). */
export async function barrerVacantes(): Promise<number> {
  const L = (await db().query<{ a: string; uid: string; job: string; puesto: string; negocio: string; bid: string; ciudad: string }>(
    `select a.id::text as a, a.user_id::text as uid, j.id::text as job, coalesce(j.title->>(case when u.lang = 'en' then 'en' else 'es' end), j.title->>'es') as puesto,
            b.name as negocio, b.id as bid, c.name as ciudad
       from search_alerts a join cities c on c.id = a.city_id join users u on u.id = a.user_id and u.status = 'active'
       join job_postings j on j.city_id = a.city_id and vacante_en_vivo(j) and j.published_at > a.created_at and j.published_at > now() - interval '14 days'
       join businesses b on b.id = j.business_id and b.status = 'active'
      where a.kind = 'vacantes' and a.removed_at is null
        and extract(hour from now() at time zone c.timezone) between 9 and 20
        and not exists (select 1 from notif_once o where o.key = 'vacante:' || a.id || ':' || j.id)
        and (select count(*) from notif_once o where o.key like 'vacante:' || a.id || ':%' and o.at > now() - interval '24 hours') < 3
      order by j.published_at limit 300`)).rows;
  let n = 0;
  const hoy = new Map<string, number>();
  for (const x of L) {
    if ((hoy.get(x.a) ?? 0) >= 3) continue;
    const r = await db().query(`insert into notif_once (key) values ($1) on conflict do nothing`, [`vacante:${x.a}:${x.job}`]);
    if (!r.rowCount) continue;
    hoy.set(x.a, (hoy.get(x.a) ?? 0) + 1);
    await avisar(x.uid, "vacante_nueva", { ciudad: x.ciudad, negocio: x.negocio, puesto: String(x.puesto ?? "").slice(0, 60) }, { href: `/n/${x.bid}/empleo/${x.job}`, ref: ["job", x.job] }).catch(() => undefined);
    await db().query(`update search_alerts set notified_at = now() where id = $1::bigint`, [x.a]);
    n++;
  }
  return n;
}
