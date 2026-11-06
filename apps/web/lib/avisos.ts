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

export async function avisar(userId: string, tpl: string, v: Vars, o: { href?: string; ref?: [string, string]; sinSms?: boolean } = {}) {
  try {
    const r = (await db().query<{ grp: string; pref: string | null; sms: boolean; title: { es: string; en: string }; body: { es: string; en: string }; lang: string; phone: string; prefs: Record<string, boolean>; city: string | null; tz: string; silencio: boolean }>(
      `select t.grp, t.pref, t.sms, t.title, t.body, u.lang, u.phone, u.notif_prefs as prefs, u.home_city_id as city, coalesce(c.timezone, 'America/New_York') as tz,
              extract(hour from now() at time zone coalesce(c.timezone, 'America/New_York')) not between 7 and 21 as silencio
         from notif_templates t, users u left join cities c on c.id = u.home_city_id where t.key = $1 and u.id = $2`, [tpl, userId])).rows[0];
    if (!r) return;
    const es = r.lang !== "en", title = es ? r.title.es : r.title.en, body = llenar(es ? r.body.es : r.body.en, v).slice(0, 480);
    const apagado = r.pref ? r.prefs?.[r.pref] === false : false, quiet = r.grp !== "crit" && tpl !== "biz_req" && r.silencio && r.prefs?.quiet !== false;
    const st = !r.sms ? "no" : apagado || o.sinSms ? "apagado" : quiet ? "silencio" : MODO_SMS === "pruebas" ? "pruebas" : "pendiente";
    const id = (await db().query<{ id: string }>(
      `insert into notifications (user_id, city_id, tpl, title, body, href, ref_kind, ref_id, sms_status, sms_to) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id::text`,
      [userId, r.city, tpl, title, body, o.href ?? null, o.ref?.[0] ?? null, o.ref?.[1] ?? null, st, r.sms ? r.phone : null])).rows[0]!.id;
    if (st === "pendiente") {
      const res = await smsTelnyx(r.phone, `To'Latino: ${body}`);
      await db().query(`update notifications set sms_status = $2, sms_at = now() where id = $1::bigint`, [id, res]);
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

/* La bandeja (APP-NOTIF): los avisos de la persona, los nuevos primero sin leer, con cursor. */
export async function misAvisos(userId: string, antes: string | null) {
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const L = (await db().query<{ id: string; tpl: string; title: string; body: string; href: string | null; at: string; leido: boolean }>(
    `select id::text, tpl, title, body, href, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, read_at is not null as leido
       from notifications where user_id = $1 and ($2::bigint is null or id < $2::bigint) order by id desc limit 31`, [userId, cur])).rows;
  return { filas: L.slice(0, 30), sig: L.length > 30 ? L[29]!.id : null };
}
export async function noLeidos(userId: string) {
  return (await db().query<{ n: number }>(`select count(*)::int as n from notifications where user_id = $1 and read_at is null`, [userId])).rows[0]?.n ?? 0;
}
export async function marcarLeidos(userId: string) {
  await db().query(`update notifications set read_at = now() where user_id = $1 and read_at is null`, [userId]);
}
