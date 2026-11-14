import "server-only";
import { db, tx } from "./db";

/* 9n-2 · Aceptar una invitación al equipo con el código (`/e/{código}`; L101, L1741). El SMS lleva el enlace; quien lo abre entra con SU cuenta,
   pone su foto, sus palabras y sus idiomas, y acepta. Decide SIEMPRE el servidor:
   · el código es de UN solo uso (al aceptar se borra), vence a los 7 días y solo sirve con el teléfono invitado (el de la cuenta);
   · quien se equivoca de código (no existe, o es de otro teléfono) suma un intento; con 8 en una hora, espera;
   · un código que no es de esa cuenta NUNCA dice a qué negocio pertenece;
   · nada se borra: el invitado pasa a «active» y el negocio recibe el aviso. */
type Bi = { es: string; en: string };
export type ResInv<T = object> = ({ ok: true } & T) | { ok: false; mensaje: Bi };
const no = (es: string, en: string): { ok: false; mensaje: Bi } => ({ ok: false, mensaje: { es, en } });
export const CODIGO_EQ = /^[A-Za-z0-9_-]{8}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const limpioArea = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, max) : "");
const TOPE_MALOS = 8;

export type InvitacionVista = { negocio: { id: string; nombre: string }; rol: string | null; rolEn: string | null; nombre: string; dueno: string | null; renta: boolean; vence: string };

async function intentosMalos(userId: string): Promise<number> {
  return (await db().query<{ n: number }>(`select count(*)::int as n from audit_entries where actor_id = $1 and action = 'equipo.codigo_malo' and at > now() - interval '1 hour'`, [userId])).rows[0]!.n;
}
async function anotarMalo(userId: string, c?: import("pg").PoolClient) {
  await (c ?? db()).query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, after) values ('user', $1, 'equipo.codigo_malo', 'business_member', '{}'::jsonb)`, [userId]);
}

type Fila = { id: string; business_id: string; phone: string | null; status: string; vivo: boolean; nombre: string; rol: Bi | null; kind: string; negocio: string; city: string; dueno: string | null; vence: string };
const SEL = `select m.id::text, m.business_id, m.phone, m.status, coalesce(m.invite_expires_at > now(), false) as vivo, m.display_name as nombre, m.role as rol, m.kind, b.name as negocio, b.city_id as city,
                    (select o.display_name from business_members o where o.business_id = m.business_id and o.kind = 'owner' and o.status = 'active' order by o.sort limit 1) as dueno,
                    m.invite_expires_at::text as vence
               from business_members m join businesses b on b.id = m.business_id where m.invite_code = $1`;

/* Lo que ve quien abre el enlace: solo con la cuenta del teléfono invitado y con un código vivo. */
export async function verInvitacion(userId: string, tel: string, codigo: string): Promise<ResInv<{ v: InvitacionVista }>> {
  const k = String(codigo ?? "");
  if (!CODIGO_EQ.test(k)) { await anotarMalo(userId); return no("Ese código no existe o ya se usó. Pídele al negocio una invitación nueva.", "That code does not exist or was already used. Ask the business for a new invite."); }
  if ((await intentosMalos(userId)) >= TOPE_MALOS) return no("Muchos intentos. Espera una hora o pídele al negocio una invitación nueva.", "Too many tries. Wait an hour or ask the business for a new invite.");
  const m = (await db().query<Fila>(`${SEL} and m.status = 'invited'`, [k])).rows[0];
  if (!m) { await anotarMalo(userId); return no("Ese código no existe o ya se usó. Pídele al negocio una invitación nueva.", "That code does not exist or was already used. Ask the business for a new invite."); }
  if (m.phone !== tel) { await anotarMalo(userId); return no("Esa invitación es para otro teléfono. Entra con el número que le diste al negocio.", "That invite is for another phone. Sign in with the number you gave the business."); }
  if (!m.vivo) return no("Esa invitación venció. Pídele al negocio una nueva.", "That invite expired. Ask the business for a new one.");
  return { ok: true, v: { negocio: { id: m.business_id, nombre: m.negocio }, rol: m.rol?.es ?? null, rolEn: m.rol?.en || null, nombre: m.nombre, dueno: m.dueno, renta: m.kind === "renter", vence: m.vence } };
}

export async function aceptarEquipo(userId: string, tel: string, codigo: string, x: { photo?: string | null; bio?: [string, string]; langs?: string[] }): Promise<ResInv<{ negocio: { id: string; nombre: string } }>> {
  const k = String(codigo ?? "");
  if (!CODIGO_EQ.test(k)) { await anotarMalo(userId); return no("Ese código no existe o ya se usó.", "That code does not exist or was already used."); }
  if ((await intentosMalos(userId)) >= TOPE_MALOS) return no("Muchos intentos. Espera una hora o pídele al negocio una invitación nueva.", "Too many tries. Wait an hour or ask the business for a new invite.");
  const langs = Array.isArray(x?.langs) ? [...new Set(x.langs.filter((l) => ["es", "en", "pt"].includes(l)))] : ["es"];
  const bio = { es: limpioArea(x?.bio?.[0], 280), en: limpioArea(x?.bio?.[1], 280) };
  const r = await tx(async (c) => {
    // El mismo candado de siempre: dos teléfonos con el mismo código nunca aceptan los dos (la fila se bloquea y el segundo ya no la encuentra).
    const m = (await c.query<Fila>(`${SEL} and m.status = 'invited' for update of m`, [k])).rows[0];
    if (!m) { await anotarMalo(userId, c); return no("Ese código no existe o ya se usó. Pídele al negocio una invitación nueva.", "That code does not exist or was already used. Ask the business for a new invite."); }
    if (m.phone !== tel) { await anotarMalo(userId, c); return no("Esa invitación es para otro teléfono. Entra con el número que le diste al negocio.", "That invite is for another phone. Sign in with the number you gave the business."); }
    if (!m.vivo) return no("Esa invitación venció. Pídele al negocio una nueva.", "That invite expired. Ask the business for a new one.");
    if ((await c.query(`select 1 from business_members where business_id = $1 and user_id = $2 and status = 'active' and id <> $3::uuid`, [m.business_id, userId, m.id])).rowCount)
      return no("Ya estás en el equipo de este negocio.", "You are already on this business’s team.");
    let photo: string | null = null;
    if (typeof x?.photo === "string" && UUID.test(x.photo)) {
      // La foto que la persona acaba de subir (/api/medios, suya) pasa a su perfil del equipo.
      photo = (await c.query<{ url: string }>(`update media set owner_kind = 'member', owner_id = $1, sort = 0 where id = $2::uuid and owner_kind = 'user' and owner_id = $3 and status = 'visible' returning url`, [m.id, x.photo, userId])).rows[0]?.url ?? null;
    }
    await c.query(
      `update business_members set status = 'active', user_id = $2, invite_code = null, invite_expires_at = null, show_on_page = true, same_as_business_hours = true,
              photo_url = coalesce($3, photo_url), bio = $4::jsonb, languages = $5, accepted_at = now(), updated_at = now() where id = $1::uuid`,
      [m.id, userId, photo, bio.es || bio.en ? JSON.stringify(bio) : null, langs.length ? langs : ["es"]]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after, meta) values ('user', $1, 'equipo.aceptar_codigo', 'business', $2, $3, '{}'::jsonb, $4::jsonb)`,
      [userId, m.business_id, m.city, JSON.stringify({ member: m.id })]);
    return { ok: true as const, negocio: { id: m.business_id, nombre: m.negocio }, nombre: m.nombre, member: m.id, city: m.city };
  });
  if (!r.ok) return r;
  // El dueño se entera (su campana y, si lo tiene encendido, su aviso): Lo que te avisamos › Equipo.
  const { avisarNegocio } = await import("./avisos");
  await avisarNegocio(r.negocio.id, "biz_equipo_acepto", { nombre: (r as { nombre: string }).nombre }, { href: `/panel/${r.negocio.id}/pagina/equipo`, ref: ["business", r.negocio.id] });
  return { ok: true, negocio: r.negocio };
}

/* Los avisos de lo que cambia en el equipo: a la persona (si ya tiene cuenta) y al negocio. Nunca rompen la acción que los dispara. */
export async function avisarPersonaEquipo(memberId: string, tpl: "equipo_quitado" | "equipo_unirse_ok" | "equipo_unirse_no") {
  try {
    const m = (await db().query<{ uid: string | null; negocio: string; bid: string; nombre: string }>(
      `select m.user_id::text as uid, b.name as negocio, b.id as bid, m.display_name as nombre from business_members m join businesses b on b.id = m.business_id where m.id = $1::uuid`, [memberId])).rows[0];
    if (!m?.uid) return;
    const { avisar } = await import("./avisos");
    await avisar(m.uid, tpl, { negocio: m.negocio, nombre: m.nombre }, { href: tpl === "equipo_unirse_ok" ? `/n/${m.bid}` : "/cuenta", ref: ["business", m.bid] });
  } catch { /* un aviso nunca rompe la acción */ }
}
