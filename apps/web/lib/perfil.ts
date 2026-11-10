import "server-only";
import { consumirCodigo, guardarPerfil, normalizarTelefono, pedirCodigo, ErrorCuenta, type Yo } from "./cuenta";
import { db, tx } from "./db";

/* Mi cuenta · Perfil, Teléfono, Avisos, Mi ciudad, Privacidad y Borrar (diseño profV, phoneV, notifV, cityV, privV, delV).
   Todo lo decide el servidor; cada cambio sensible queda en account_changes. */
type Bi = { es: string; en: string };
export type ResP = { ok: true; codigoPrueba?: string } | { ok: false; msg: Bi; campo?: string };
const no = (es: string, en: string, campo?: string): ResP => ({ ok: false, msg: { es, en }, campo });
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const ERR: Record<string, [string, string]> = {
  telefono_invalido: ["Escribe los 10 números.", "Enter all 10 digits."], espera: ["Espera un momento para pedir otro código.", "Wait a moment to ask for another code."],
  demasiados: ["Demasiados intentos. Pide un código nuevo en un rato.", "Too many tries. Ask for a new code in a while."], sin_proveedor: ["No pudimos mandar el código ahora. Prueba más tarde.", "We could not send the code right now. Try later."],
  codigo_incorrecto: ["Ese código no es. Revísalo.", "That code is not right. Check it."], codigo_vencido: ["El código venció. Pide uno nuevo.", "The code expired. Ask for a new one."],
};
const deError = (e: unknown): ResP => { const k = e instanceof ErrorCuenta ? e.codigo : ""; const m = ERR[k] ?? ["No se pudo. Prueba de nuevo.", "Could not do it. Try again."]; return no(m[0], m[1]); };

/* ── Perfil ── */
export async function perfilDe(userId: string) {
  return (await db().query<{ first: string | null; last: string | null; nick: string | null; email: string | null; verif: boolean; foto: string | null; quitada: string | null; phone: string; ciudad: string | null }>(
    `select u.first_name as first, u.last_name as last, u.nick, u.email::text as email, coalesce(u.email_verified, false) as verif, u.photo_url as foto, u.photo_removed_reason as quitada, u.phone,
            (select c.name from cities c where c.id = u.home_city_id) as ciudad
       from users u where u.id = $1`, [userId])).rows[0] ?? null;
}
export async function guardarPerfilTodo(u: Yo, p: { first: string; last: string; nick?: string; email?: string }): Promise<ResP> {
  const first = String(p.first ?? "").trim(), last = String(p.last ?? "").trim(), email = String(p.email ?? "").trim().toLowerCase();
  if (first.length < 2) return no("Escribe tu nombre.", "Enter your first name.", "first");
  if (!last) return no("Escribe tu apellido.", "Enter your last name.", "last");
  if (email && !EMAIL.test(email)) return no("Revisa el correo.", "Check the email.", "email");
  await guardarPerfil({ first: first.slice(0, 24), last: last.slice(0, 24), nick: String(p.nick ?? "").slice(0, 20) });
  const antes = (await db().query<{ e: string | null }>(`select email::text as e from users where id = $1`, [u.id])).rows[0]?.e ?? null;
  if ((antes ?? "") !== email) {
    const usado = email ? (await db().query(`select 1 from users where email = $1 and id <> $2`, [email, u.id])).rowCount : 0;
    if (usado) return no("Ese correo ya está en otra cuenta.", "That email is on another account.", "email");
    await tx(async (c) => {
      await c.query(`update users set email = nullif($2, ''), email_verified = false where id = $1`, [u.id, email]);
      await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'email', $2, $3, 'user')`, [u.id, antes, email || null]);
    });
  }
  return { ok: true };
}
/* La foto: una que la persona subió (media de dueño «user») o ninguna. */
export async function fotoPerfil(userId: string, mediaId: string | null): Promise<ResP> {
  if (mediaId === null) {
    await tx(async (c) => {
      await c.query(`update users set photo_url = null where id = $1`, [userId]);
      await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'photo', 'foto', null, 'user')`, [userId]);
    });
    return { ok: true };
  }
  if (!/^[0-9a-f-]{36}$/.test(mediaId)) return no("Esa foto no existe.", "That photo does not exist.");
  const m = (await db().query<{ url: string }>(`select url from media where id = $1::uuid and uploaded_by = $2 and owner_kind = 'user' and owner_id = $2::text and status = 'visible'`, [mediaId, userId])).rows[0];
  if (!m) return no("Esa foto no existe.", "That photo does not exist.");
  await tx(async (c) => {
    await c.query(`update users set photo_url = $2, photo_removed_reason = null where id = $1`, [userId, m.url]);
    await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'photo', null, 'foto', 'user')`, [userId]);
  });
  return { ok: true };
}

/* ── Cambiar el teléfono: un código al número nuevo ── */
export async function codigoTelNuevo(u: Yo, entrada: string): Promise<ResP> {
  const tel = normalizarTelefono(String(entrada ?? ""));
  if (!tel) return no("Escribe los 10 números.", "Enter all 10 digits.", "ph");
  if (tel === u.phone) return no("Es el mismo número que ya tienes.", "That is the number you already have.", "ph");
  if ((await db().query(`select 1 from users where phone = $1`, [tel])).rowCount) return no("Ese número ya tiene una cuenta en To'Latino. Si es tuyo, entra con él.", "That number already has a To'Latino account. If it is yours, sign in with it.", "ph");
  try { const r = await pedirCodigo(tel, "phone_change"); return { ok: true, codigoPrueba: r.codigoPrueba }; } catch (e) { return deError(e); }
}
export async function cambiarTelefono(u: Yo, entrada: string, codigo: string): Promise<ResP> {
  const tel = normalizarTelefono(String(entrada ?? ""));
  if (!tel) return no("Escribe los 10 números.", "Enter all 10 digits.", "ph");
  const r = await tx(async (c) => {
    const v = await consumirCodigo(c, tel, "phone_change", String(codigo ?? ""));
    if (v !== "ok") return v;
    const x = await c.query(`update users set phone = $2, phone_verified_at = now() where id = $1 and not exists (select 1 from users where phone = $2) returning 1`, [u.id, tel]);
    if (!x.rowCount) return "usado";
    await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'phone', $2, $3, 'user')`, [u.id, u.phone, tel]);
    return "ok";
  });
  if (r === "ok") return { ok: true };
  if (r === "usado") return no("Ese número ya tiene una cuenta en To'Latino.", "That number already has a To'Latino account.", "ph");
  const m = ERR[r]!; return no(m[0], m[1], "code");
}

/* ── Avisos: se guardan hoy; se aplican cuando salgan los avisos ── */
/* 6j · Eventos: evt = «Boletos y cambios» (lo que no es crítico), evtR = «Recordatorios» (el día antes y «¡Es hoy!»), evtG = «Eventos que
   guardas». Lo crítico de Eventos no tiene interruptor (plantillas del grupo `events` sin pref, y las `crit`). */
export const AVISOS = ["ord", "cit", "emp", "com", "dig", "msg", "evt", "evtR", "evtG", "hoy", "of", "mailR", "mailW", "quiet"] as const;
export const AVISOS_DEF: Record<(typeof AVISOS)[number], boolean> = { ord: true, cit: true, emp: true, com: true, dig: false, msg: true, evt: true, evtR: true, evtG: true, hoy: true, of: false, mailR: true, mailW: false, quiet: true };
export async function avisosDe(userId: string) {
  const p = (await db().query<{ p: Record<string, boolean> }>(`select notif_prefs as p from users where id = $1`, [userId])).rows[0]?.p ?? {};
  return Object.fromEntries(AVISOS.map((k) => [k, typeof p[k] === "boolean" ? p[k] : AVISOS_DEF[k]])) as Record<(typeof AVISOS)[number], boolean>;
}
export async function guardarAviso(userId: string, k: string, v: boolean): Promise<ResP> {
  if (!(AVISOS as readonly string[]).includes(k)) return no("Ese aviso no existe.", "That notification does not exist.");
  await db().query(`update users set notif_prefs = notif_prefs || jsonb_build_object($2::text, $3::boolean) where id = $1`, [userId, k, v === true]);
  return { ok: true };
}

/* ── Mi ciudad: se cambia cada 30 días, solo a una ciudad abierta ── */
export async function ciudadDe(userId: string) {
  const [u, c] = await Promise.all([
    db().query<{ id: string | null; name: string | null; desde: string | null; puede: string | null; ok: boolean }>(
      `select u.home_city_id as id, c.name, to_char(coalesce(u.home_city_changed_at, u.created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde,
              to_char((coalesce(u.home_city_changed_at, u.created_at) + interval '30 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as puede,
              (u.home_city_changed_at is null or u.home_city_changed_at <= now() - interval '30 days') as ok
         from users u left join cities c on c.id = u.home_city_id where u.id = $1`, [userId]),
    db().query<{ id: string; name: string; negocios: number }>(
      `select c.id, c.name, (select count(*)::int from businesses b where b.city_id = c.id and b.status = 'active') as negocios from cities c where c.status = 'on' order by c.name`),
  ]);
  return { ...u.rows[0]!, abiertas: c.rows };
}
export async function cambiarCiudad(userId: string, cityId: string): Promise<ResP> {
  return tx(async (c) => {
    const u = (await c.query<{ cur: string | null; ok: boolean }>(`select home_city_id as cur, (home_city_changed_at is null or home_city_changed_at <= now() - interval '30 days') as ok from users where id = $1 for update`, [userId])).rows[0];
    if (!u) return no("Entra otra vez.", "Sign in again.");
    if (u.cur === cityId) return no("Ya es tu ciudad.", "It is already your city.");
    if (!u.ok) return no("Tu ciudad se cambia cada 30 días.", "Your city can change every 30 days.");
    const ok = (await c.query(`select 1 from cities where id = $1 and status = 'on'`, [String(cityId ?? "")])).rowCount;
    if (!ok) return no("Esa ciudad todavía no está abierta.", "That city is not open yet.");
    await c.query(`update users set home_city_id = $2, home_city_changed_at = now() where id = $1`, [userId, cityId]);
    await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'city', $2, $3, 'user')`, [userId, u.cur, cityId]);
    return { ok: true } as ResP;
  });
}

/* ── Privacidad: sesiones abiertas ── */
export async function sesionesDe(userId: string, actual: string | null) {
  return (await db().query<{ id: string; ua: string | null; ip: string | null; visto: string; esta: boolean }>(
    `select s.id::text, s.user_agent as ua, host(s.ip) as ip, to_char(coalesce(s.last_seen_at, s.created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as visto, s.token_hash = $2 as esta
       from sessions s where s.user_id = $1 and s.signed_out_at is null and s.expires_at > now() order by (s.token_hash = $2) desc, coalesce(s.last_seen_at, s.created_at) desc limit 20`, [userId, actual ?? ""])).rows;
}
export async function cerrarSesionOtra(userId: string, id: string, actual: string | null): Promise<ResP> {
  if (!/^[0-9a-f-]{36}$/.test(String(id))) return no("Esa sesión no existe.", "That session does not exist.");
  const r = await db().query(`update sessions set signed_out_at = now() where id = $1::uuid and user_id = $2 and signed_out_at is null and token_hash <> $3`, [id, userId, actual ?? ""]);
  return r.rowCount ? { ok: true } : no("Esa sesión ya estaba cerrada.", "That session was already closed.");
}

/* ── Borrar la cuenta: código a tu teléfono, 30 días para arrepentirte ── */
const POR = new Set(["uso", "avisos", "priv", "ciudad", "otra"]);
export async function codigoBorrar(u: Yo): Promise<ResP> {
  try { const r = await pedirCodigo(u.phone, "account_delete"); return { ok: true, codigoPrueba: r.codigoPrueba }; } catch (e) { return deError(e); }
}
export async function borrarCuenta(u: Yo, codigo: string, por: string): Promise<ResP> {
  const r = await tx(async (c) => {
    const v = await consumirCodigo(c, u.phone, "account_delete", String(codigo ?? ""));
    if (v !== "ok") return v;
    await c.query(`update users set delete_at = now() + interval '30 days', delete_reason = $2 where id = $1 and delete_at is null`, [u.id, POR.has(por) ? por : null]);
    await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'delete', null, $2, 'user')`, [u.id, POR.has(por) ? por : null]);
    return "ok";
  });
  if (r === "ok") return { ok: true };
  const m = ERR[r]!; return no(m[0], m[1], "code");
}
export async function cancelarBorrado(userId: string): Promise<ResP> {
  const r = await db().query(`update users set delete_at = null, delete_reason = null where id = $1 and delete_at is not null and coalesce(delete_reason, '') <> 'admin' and status = 'active'`, [userId]);
  if (r.rowCount) await db().query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'undelete', null, null, 'user')`, [userId]);
  return r.rowCount ? { ok: true } : no("No hay un borrado que cancelar.", "There is no deletion to cancel.");
}
export async function borradoDe(userId: string) {
  return (await db().query<{ d: string | null; admin: boolean }>(`select to_char(delete_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as d, coalesce(delete_reason, '') = 'admin' as admin from users where id = $1`, [userId])).rows[0] ?? { d: null, admin: false };
}
