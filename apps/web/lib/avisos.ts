import "server-only";
import { db } from "./db";
import { MODO_SMS } from "./entorno";

/* Avisos (Super Admin secNotif): cada evento deja un aviso en la bandeja de la persona (siempre) y, si la plantilla va por
   SMS, decide si sale: lo crítico siempre; lo demás respeta sus preferencias (users.notif_prefs) y las horas de silencio
   (10 PM – 7 AM de su ciudad). La solicitud nueva al negocio (biz_req) no espera: solo llega mientras el negocio recibe. En el sandbox el SMS queda «en modo pruebas»; en producción sale por Telnyx con la clave del
   entorno (TELNYX_API_KEY, TELNYX_FROM) o queda «sin proveedor». Nunca rompe la acción que lo dispara. */
type Vars = Record<string, string | number>;
const llenar = (t: string, v: Vars) => t.replace(/\{(\w+)\}/g, (_, k: string) => (v[k] != null ? String(v[k]) : `{${k}}`));

async function smsTelnyx(to: string, texto: string): Promise<"enviado" | "fallo" | "sin_proveedor"> {
  const key = process.env.TELNYX_API_KEY, from = process.env.TELNYX_FROM;
  if (!key || !from) return "sin_proveedor";
  try {
    const r = await fetch("https://api.telnyx.com/v2/messages", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ from, to, text: texto }), signal: AbortSignal.timeout(8000) });
    return r.ok ? "enviado" : "fallo";
  } catch { return "fallo"; }
}

export async function avisar(userId: string, tpl: string, v: Vars, o: { href?: string; ref?: [string, string]; sinSms?: boolean; actor?: string | null } = {}) {
  try {
    const r = (await db().query<{ grp: string; pref: string | null; sms: boolean; title: { es: string; en: string }; body: { es: string; en: string }; lang: string; phone: string; prefs: Record<string, boolean>; city: string | null; tz: string; silencio: boolean }>(
      `select t.grp, t.pref, t.sms, t.title, t.body, u.lang, u.phone, u.notif_prefs as prefs, u.home_city_id as city, coalesce(c.timezone, 'America/New_York') as tz,
              extract(hour from now() at time zone coalesce(c.timezone, 'America/New_York')) not between 7 and 21 as silencio
         from notif_templates t, users u left join cities c on c.id = u.home_city_id where t.key = $1 and u.id = $2`, [tpl, userId])).rows[0];
    if (!r) return;
    const es = r.lang !== "en", title = es ? r.title.es : r.title.en, body = llenar(es ? r.body.es : r.body.en, v).slice(0, 480);
    const apagado = r.pref ? r.prefs?.[r.pref] === false : false, quiet = r.grp !== "crit" && tpl !== "biz_req" && r.silencio && r.prefs?.quiet !== false;
    // 5i · Grupo Comunidad (Mi cuenta › Avisos): apagado = no llega (no tiene SMS); «Un resumen al día» = se guarda para el resumen
    // (no sale en la campana hasta el resumen de la hora de Configuración; lo arma resumenComunidad en el barrido).
    if (r.grp === "community" && apagado) return;
    const guardado = r.grp === "community" && !!r.pref && r.prefs?.dig === true;
    const st = !r.sms ? "no" : apagado || o.sinSms ? "apagado" : quiet ? "silencio" : MODO_SMS === "pruebas" ? "pruebas" : "pendiente";
    const id = (await db().query<{ id: string }>(
      `insert into notifications (user_id, city_id, tpl, title, body, href, ref_kind, ref_id, sms_status, sms_to, actor_user_id, held_digest) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id::text`,
      [userId, r.city, tpl, title, body, o.href ?? null, o.ref?.[0] ?? null, o.ref?.[1] ?? null, st, r.sms ? r.phone : null, o.actor ?? null, guardado])).rows[0]!.id;
    if (st === "pendiente") {
      const res = await smsTelnyx(r.phone, `To'Latino: ${body}`);
      await db().query(`update notifications set sms_status = $2, sms_at = now() where id = $1::bigint`, [id, res]);
    }
  } catch { /* un aviso nunca rompe la acción que lo dispara */ }
}

/* 6d · Un aviso a un TELÉFONO (el boleto que te mandan o una cortesía): si el número ya tiene cuenta, es un aviso normal (bandeja + SMS
   según la plantilla y sus horas de silencio); si todavía no tiene cuenta, solo el SMS, guardado en phone_messages con el teléfono
   cifrado y su huella (nunca en claro). El silencio es el de la ciudad del evento. Nunca rompe la acción que lo dispara. */
export async function avisarTelefono(tel: string, tpl: string, v: Vars, o: { href?: string; ref?: [string, string]; city?: string | null; en?: boolean } = {}): Promise<void> {
  try {
    const u = (await db().query<{ id: string }>(`select id::text from users where phone = $1 and status <> 'deleted' limit 1`, [tel])).rows[0];
    if (u) { await avisar(u.id, tpl, v, o); return; }
    const t = (await db().query<{ grp: string; sms: boolean; body: { es: string; en: string }; silencio: boolean }>(
      `select t.grp, t.sms, t.body, extract(hour from now() at time zone coalesce((select timezone from cities where id = $2), 'America/New_York')) not between 7 and 21 as silencio
         from notif_templates t where t.key = $1`, [tpl, o.city ?? null])).rows[0];
    if (!t?.sms) return;
    const { cifrar, huella } = await import("./cifrado");
    const body = llenar(o.en ? t.body.en : t.body.es, v).slice(0, 480);
    const st = t.grp !== "crit" && t.silencio ? "silencio" : MODO_SMS === "pruebas" ? "pruebas" : "pendiente";
    const id = (await db().query<{ id: string }>(`insert into phone_messages (phone_enc, phone_hash, city_id, tpl, body, ref_kind, ref_id, sms_status) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id::text`,
      [cifrar(tel), huella(tel), o.city ?? null, tpl, body, o.ref?.[0] ?? null, o.ref?.[1] ?? null, st])).rows[0]!.id;
    if (st === "pendiente") {
      const res = await smsTelnyx(tel, `To'Latino: ${body}`);
      await db().query(`update phone_messages set sms_status = $2, sms_at = now() where id = $1::bigint`, [id, res]);
    }
  } catch { /* un aviso nunca rompe la acción que lo dispara */ }
}

/* El mismo aviso a muchas personas en una sola escritura (p. ej. el resultado de una encuesta a quienes votaron). Solo plantillas
   sin SMS (las que llevan SMS van una por una con avisar()). Las variables pueden cambiar con el idioma de cada persona. */
export async function avisarMuchos(ids: string[], tpl: string, v: { es: Vars; en: Vars }, o: { href?: string; ref?: [string, string]; actor?: string | null } = {}) {
  const L = [...new Set(ids)].filter(Boolean);
  if (!L.length) return;
  try {
    const t = (await db().query<{ sms: boolean; grp: string; pref: string | null; title: { es: string; en: string }; body: { es: string; en: string } }>(`select sms, grp, pref, title, body from notif_templates where key = $1`, [tpl])).rows[0];
    if (!t) return;
    if (t.sms) { for (const id of L) await avisar(id, tpl, v.es, o); return; }
    for (let i = 0; i < L.length; i += 1000) {
      // 5i · Grupo Comunidad: lo apagado no llega; con «Un resumen al día», se guarda para el resumen (como avisar()).
      const com = t.grp === "community" && !!t.pref;
      await db().query(
        `insert into notifications (user_id, city_id, tpl, title, body, href, ref_kind, ref_id, sms_status, sms_to, actor_user_id, held_digest)
         select u.id, u.home_city_id, $2, case when u.lang = 'en' then $4 else $3 end, case when u.lang = 'en' then $6 else $5 end, $7, $8, $9, 'no', null, $10::uuid,
                $11 and coalesce(u.notif_prefs->>'dig', '') = 'true'
           from users u where u.id = any($1::uuid[]) and not ($11 and coalesce(u.notif_prefs->>$12, '') = 'false')`,
        [L.slice(i, i + 1000), tpl, t.title.es, t.title.en, llenar(t.body.es, v.es).slice(0, 480), llenar(t.body.en, v.en).slice(0, 480), o.href ?? null, o.ref?.[0] ?? null, o.ref?.[1] ?? null, o.actor ?? null, com, t.pref ?? ""]);
    }
  } catch { /* un aviso nunca rompe la acción que lo dispara */ }
}

/* Los dueños activos de un negocio (para los avisos al negocio). */
export async function avisarNegocio(negocio: string, tpl: string, v: Vars, o: { href?: string; ref?: [string, string] } = {}) {
  const L = (await db().query<{ id: string }>(`select user_id::text as id from business_members where business_id = $1 and status = 'active' and kind = 'owner'`, [negocio]).catch(() => ({ rows: [] as { id: string }[] }))).rows;
  for (const u of L) await avisar(u.id, tpl, v, o);
}

/* Atajos por evento: leen lo necesario del pedido, la mesa, la solicitud o la ayuda. */
export async function avisarPedido(numero: string, tpl: "ord_ok" | "ord_no" | "ord_ready" | "ord_way") {
  const o = (await db().query<{ uid: string; negocio: string; hora: string }>(
    `select o.user_id::text as uid, b.name as negocio, to_char(coalesce(o.ready_at, now()) at time zone c.timezone, 'FMHH12:MI AM') as hora
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id where o.number = $1 and o.kind = 'order'`, [numero]).catch(() => ({ rows: [] }))).rows[0];
  if (o) await avisar(o.uid, tpl, { negocio: o.negocio, num: numero, hora: o.hora }, { href: `/pedido/${numero}`, ref: ["order", numero] });
}
export async function avisarMesa(numero: string, tpl: "rsv_ok" | "rsv_alt" | "rsv_no" | "rsv_chg_ok" | "rsv_chg_no", alt?: string) {
  const o = (await db().query<{ uid: string; negocio: string; dia: string; hora: string }>(
    `select o.user_id::text as uid, b.name as negocio, to_char(o.scheduled_at at time zone c.timezone, 'FMDD/FMMM') as dia, to_char(o.scheduled_at at time zone c.timezone, 'FMHH12:MI AM') as hora
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id where o.number = $1 and o.kind = 'table'`, [numero]).catch(() => ({ rows: [] }))).rows[0];
  let a = alt ?? "";
  if (o && tpl === "rsv_alt" && !a) {
    const p = (await db().query<{ at: string | null }>(`select p.proposed->>'at' as at from change_proposals p join operations o on o.id = p.operation_id where o.number = $1 and p.status = 'open' order by p.created_at desc limit 1`, [numero]).catch(() => ({ rows: [] }))).rows[0];
    if (p?.at) { const [h, m] = p.at.split(":").map(Number); a = `${(h! % 12) || 12}:${String(m ?? 0).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`; }
  }
  if (o) await avisar(o.uid, tpl, { negocio: o.negocio, dia: o.dia, hora: o.hora, alt: a }, { href: `/reserva/${numero}`, ref: ["table", numero] });
}

/* 5c · Bloquear es mutuo e invisible también en la bandeja: un aviso que provocó alguien con quien hay un bloqueo (en cualquier
   sentido) deja de verse y de contar, aunque haya llegado antes del bloqueo (guardián bloqueoMutuo). */
const SIN_BLOQUEO_AVISO = `(n.actor_user_id is null or not exists (select 1 from user_blocks ub where ub.removed_at is null and ub.kind = 'block'
  and ((ub.user_id = n.user_id and ub.target_user_id = n.actor_user_id) or (ub.user_id = n.actor_user_id and ub.target_user_id = n.user_id))))`;
/* La bandeja (APP-NOTIF): los avisos de la persona, los nuevos primero sin leer, con cursor. */
export async function misAvisos(userId: string, antes: string | null) {
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const L = (await db().query<{ id: string; tpl: string; title: string; body: string; href: string | null; at: string; leido: boolean }>(
    `select id::text, tpl, title, body, href, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, read_at is not null as leido
       from notifications n where n.user_id = $1 and not n.held_digest and ($2::bigint is null or n.id < $2::bigint) and ${SIN_BLOQUEO_AVISO}
      order by n.id desc limit 31`, [userId, cur])).rows;
  return { filas: L.slice(0, 30), sig: L.length > 30 ? L[29]!.id : null };
}
export async function noLeidos(userId: string) {
  return (await db().query<{ n: number }>(`select count(*)::int as n from notifications n where n.user_id = $1 and n.read_at is null and not n.held_digest and ${SIN_BLOQUEO_AVISO}`, [userId])).rows[0]?.n ?? 0;
}
export async function marcarLeidos(userId: string) {
  await db().query(`update notifications set read_at = now() where user_id = $1 and read_at is null`, [userId]);
}

/* 5i · El resumen diario de la Comunidad (APP-NOTIF «Un resumen al día en vez de cada aviso», Mi cuenta › Avisos › Comunidad): a la hora
   de Configuración (com_resumen_hora, día local de la ciudad de la persona), quien tiene avisos de la Comunidad guardados recibe UNO con
   cuántos de cada cosa. Una vez por persona y día (notif_digests, pk): correrlo otra vez no manda otro. Lo que provocó alguien con quien
   hay un bloqueo (en cualquier sentido) no se cuenta ni se nombra (SIN_BLOQUEO_AVISO). Sin SMS. Lo llama el barrido cada minuto. */
const RESUMEN: [RegExp, [string, string], [string, string]][] = [
  [/^com_(comment|reply)$/, ["respuesta", "respuestas"], ["reply", "replies"]], [/^com_mention$/, ["mención", "menciones"], ["mention", "mentions"]],
  [/^com_best$/, ["«Me sirvió»", "«Me sirvió»"], ["«Helped me»", "«Helped me»"]], [/^com_votes_10$/, ["publicación con 10 votos", "publicaciones con 10 votos"], ["post with 10 votes", "posts with 10 votes"]],
  [/^com_poll_closed$/, ["encuesta cerrada", "encuestas cerradas"], ["closed poll", "closed polls"]], [/^com_follow$/, ["seguidor nuevo", "seguidores nuevos"], ["new follower", "new followers"]],
  [/^dm_message$/, ["mensaje de un vecino", "mensajes de vecinos"], ["message from a neighbor", "messages from neighbors"]], [/^gam_/, ["aviso de tu rango", "avisos de tu rango"], ["rank update", "rank updates"]],
];
const juntar = (L: string[], es: boolean) => (L.length < 2 ? L.join("") : `${L.slice(0, -1).join(", ")} ${es ? "y" : "and"} ${L[L.length - 1]}`);
export function textoResumen(cuenta: Record<string, number>, es: boolean): string {
  const partes: string[] = [];
  for (const [re, l1, l2] of RESUMEN) {
    const n = Object.entries(cuenta).filter(([k]) => re.test(k)).reduce((a, [, v]) => a + v, 0);
    if (n) partes.push(`${n} ${(es ? l1 : l2)[n === 1 ? 0 : 1]}`);
  }
  return (es ? `Hoy en la Comunidad: ${juntar(partes, true)}.` : `Today in the Community: ${juntar(partes, false)}.`).slice(0, 480);
}
export async function resumenComunidad(): Promise<number> {
  const P = (await db().query<{ uid: string; dia: string }>(
    `select u.id::text as uid, (now() at time zone z.tz)::date::text as dia
       from (select distinct user_id from notifications where held_digest and digest_id is null) h
       join users u on u.id = h.user_id left join cities ci on ci.id = u.home_city_id cross join lateral (select coalesce(ci.timezone, 'America/New_York') as tz) z
      where extract(hour from now() at time zone z.tz) >= cfg_int('com_resumen_hora')
        and not exists (select 1 from notif_digests d where d.user_id = u.id and d.local_day = (now() at time zone z.tz)::date)
      limit 500`)).rows;
  let n = 0;
  for (const p of P) {
    const c = await db().connect();
    try {
      await c.query("begin");
      await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`resumen:${p.uid}`]);
      if ((await c.query(`select 1 from notif_digests where user_id = $1 and local_day = $2::date`, [p.uid, p.dia])).rowCount) { await c.query("rollback"); continue; }
      const H = (await c.query<{ id: string; tpl: string }>(
        `select n.id::text, n.tpl from notifications n where n.user_id = $1 and n.held_digest and n.digest_id is null and ${SIN_BLOQUEO_AVISO} order by n.id for update`, [p.uid])).rows;
      let nid: string | null = null;
      if (H.length) {
        const u = (await c.query<{ lang: string; city: string | null; title: { es: string; en: string } }>(
          `select u.lang, u.home_city_id as city, t.title from users u, notif_templates t where u.id = $1 and t.key = 'com_resumen'`, [p.uid])).rows[0]!;
        const es = u.lang !== "en", cuenta: Record<string, number> = {};
        for (const h of H) cuenta[h.tpl] = (cuenta[h.tpl] ?? 0) + 1;
        nid = (await c.query<{ id: string }>(
          `insert into notifications (user_id, city_id, tpl, title, body, href, ref_kind, ref_id, sms_status) values ($1, $2, 'com_resumen', $3, $4, '/comunidad', 'resumen', $5, 'no') returning id::text`,
          [p.uid, u.city, es ? u.title.es : u.title.en, textoResumen(cuenta, es), p.dia])).rows[0]!.id;
        await c.query(`update notifications set digest_id = $2::bigint where id = any($1::bigint[])`, [H.map((h) => h.id), nid]);
      }
      await c.query(`insert into notif_digests (user_id, local_day, notification_id, n) values ($1, $2::date, $3::bigint, $4)`, [p.uid, p.dia, nid, H.length]);
      await c.query("commit");
      if (nid) n++;
    } catch { await c.query("rollback").catch(() => {}); } finally { c.release(); }
  }
  return n;
}
