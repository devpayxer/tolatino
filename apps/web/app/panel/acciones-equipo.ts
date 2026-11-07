"use server";
import { randomBytes } from "node:crypto";
import { mismoOrigen, normalizarTelefono } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { semanaValida } from "@/lib/panel-reglas";
import { recalcularFiltrosSP } from "@/lib/salud-pro";

/* Tu página · Equipo (dash2-stf.js): invitar por SMS, reenviar, cancelar, aceptar a quien pide unirse, lo que pone el
   negocio de cada persona, si sale en la página y quitar del equipo. Nada se borra: estados ('removed' + motivo).
   Solo sale quien aceptó; la foto, la bio y los idiomas los pone cada persona (el dueño, los suyos). */
type Bi = { es: string; en: string };
export type ResEq = { ok: true; sms?: boolean } | { ok: false; mensaje: Bi };
const no = (es: string, en: string): ResEq => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const limpio = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const limpioArea = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, max) : "");
const NO_RENTA = ["NEG-FOOD", "NEG-MERC", "NEG-TIENDA", "NEG-NOCHE", "NEG-BELL"];

async function entrar(id: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, "page") : null;
}
async function auditar(a: Acceso, action: string, mid: string, after: unknown) {
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after, meta) values ('user', $1, $2, 'business', $3, $4, $5::jsonb, $6::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? null), JSON.stringify({ member: mid })]);
}
type Fila = { id: string; kind: string; status: string; user_id: string | null; display_name: string; invite_sends: number; invited_at: string | null };
async function persona(a: Acceso, mid: unknown): Promise<Fila | null> {
  if (typeof mid !== "string" || !UUID.test(mid)) return null;
  return (await db().query<Fila>(`select id, kind, status, user_id, display_name, invite_sends, invited_at from business_members where id = $1 and business_id = $2`, [mid, a.negocio.id])).rows[0] ?? null;
}
/* El SMS de invitación («{Dueño} te invitó al equipo de {Negocio}… tolatino.app/e/{código}. Vence en 7 días»). El
   proveedor de SMS se conecta en la Fase 2 (decisión E2, LAUNCH-CHECKLIST): hasta entonces la invitación queda guardada
   y la pantalla lo dice con la verdad (sms: false). */
function enviarInvitacion(_code: string): boolean {
  void _code;
  return false;
}

export async function equipoInvitar(id: string, x: { kind: string; name: string; phone: string; role: string }): Promise<ResEq> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const name = limpio(x?.name, 40), role = limpio(x?.role, 40), tel = normalizarTelefono(typeof x?.phone === "string" ? x.phone : "");
  const kind = x?.kind === "renta" && !NO_RENTA.includes(a.negocio.category_id) ? "renter" : "staff";
  const falta = [name.length < 2 ? "nombre" : null, !tel ? "teléfono de 10 números" : null, !role && a.negocio.category_id !== "NEG-BELL" ? "qué hace" : null].filter(Boolean);
  if (falta.length) return no(`Para enviar falta: ${falta.join(" · ")}.`, "Some fields are missing.");
  const hoy = (await db().query<{ n: number }>(`select count(*)::int as n from business_members where business_id = $1 and invited_at > now() - interval '1 day'`, [a.negocio.id])).rows[0]!.n;
  if (hoy >= 20) return no("Mandaste muchas invitaciones hoy. Prueba mañana.", "You sent many invites today. Try tomorrow.");
  const code = randomBytes(6).toString("base64url");
  try {
    const r = await db().query<{ id: string }>(
      `insert into business_members (business_id, kind, display_name, role, phone, status, show_on_page, same_as_business_hours, invite_code, invited_by, invited_at, invite_expires_at, invite_sends, sort)
       values ($1, $2, $3, $4::jsonb, $5, 'invited', true, true, $6, $7, now(), now() + interval '7 days', 1,
               (select coalesce(max(sort), 0) + 1 from business_members where business_id = $1)) returning id`,
      [a.negocio.id, kind, name, JSON.stringify({ es: role, en: "" }), tel, code, a.yo.id]);
    await auditar(a, "panel.equipo_invitar", r.rows[0]!.id, { name, kind });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return no("Ese teléfono ya está en tu equipo.", "That phone is already on your team.");
    throw e;
  }
  return { ok: true, sms: enviarInvitacion(code) };
}

export async function equipoReenviar(id: string, mid: string): Promise<ResEq> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const m = await persona(a, mid);
  if (!m || m.status !== "invited") return no("Esa invitación ya no está.", "That invite is gone.");
  if (m.invite_sends >= 5) return no("Ya le mandamos varias veces el SMS. Llámale para que lo busque.", "We already texted several times. Call them to find it.");
  const code = randomBytes(6).toString("base64url");
  await db().query(`update business_members set invite_code = $2, invited_at = now(), invite_expires_at = now() + interval '7 days', invite_sends = invite_sends + 1, updated_at = now() where id = $1`, [m.id, code]);
  await auditar(a, "panel.equipo_reenviar", m.id, null);
  return { ok: true, sms: enviarInvitacion(code) };
}

export async function equipoCancelar(id: string, mid: string): Promise<ResEq> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const m = await persona(a, mid);
  if (!m || m.status !== "invited") return no("Esa invitación ya no está.", "That invite is gone.");
  await db().query(`update business_members set status = 'removed', removed_reason = 'canceled', removed_at = now(), invite_code = null, updated_at = now() where id = $1`, [m.id]);
  await auditar(a, "panel.equipo_cancelar", m.id, null);
  return { ok: true };
}

export async function equipoResponder(id: string, mid: string, aceptar: boolean): Promise<ResEq> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const m = await persona(a, mid);
  if (!m || m.status !== "requested") return no("Esa solicitud ya no está.", "That request is gone.");
  if (aceptar) await db().query(`update business_members set status = 'active', show_on_page = true, same_as_business_hours = true, updated_at = now() where id = $1`, [m.id]);
  else await db().query(`update business_members set status = 'removed', removed_reason = 'declined', removed_at = now(), updated_at = now() where id = $1`, [m.id]);
  await auditar(a, aceptar ? "panel.equipo_aceptar" : "panel.equipo_no_aceptar", m.id, null);
  return { ok: true };
}

export async function equipoMostrar(id: string, mid: string, show: boolean): Promise<ResEq> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const m = await persona(a, mid);
  if (!m || m.status !== "active" || m.kind === "owner") return no("Esa persona ya no está en tu equipo.", "That person is no longer on your team.");
  await db().query(`update business_members set show_on_page = $2, updated_at = now() where id = $1`, [m.id, !!show]);
  await auditar(a, show ? "panel.equipo_mostrar" : "panel.equipo_ocultar", m.id, null);
  return { ok: true };
}

export async function equipoQuitar(id: string, mid: string): Promise<ResEq> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const m = await persona(a, mid);
  if (!m || m.status !== "active" || m.kind === "owner") return no("Esa persona ya no está en tu equipo.", "That person is no longer on your team.");
  await tx(async (c) => {
    await c.query(`update business_members set status = 'removed', removed_reason = 'owner', removed_at = now(), show_on_page = false, panel_access = '{}', updated_at = now() where id = $1`, [m.id]);
    // Su licencia se va con la persona (nada se borra: queda retirada) y los filtros dejan de contarla.
    await c.query(`update licenses set status = 'withdrawn', updated_at = now() where member_id = $1 and status <> 'withdrawn'`, [m.id]);
    await c.query(`update queue_items set status = 'decided', decision = 'withdrawn', reason = 'La persona salió del equipo', decided_at = now() where queue = 'lic' and status = 'open' and subject_id in (select id::text from licenses where member_id = $1)`, [m.id]);
    await c.query(`select licencias_refrescar($1)`, [a.negocio.id]); await (await import("@/lib/ninos")).recalcularFiltrosNinos(c, a.negocio.id); // Niños: la tarjeta sigue a la licencia del DHS (4eb)
    await recalcularFiltrosSP(c, a.negocio.id);
  });
  await auditar(a, "panel.equipo_quitar", m.id, null);
  return { ok: true };
}

/* Lo que pone el negocio (rol, desde, especialidades, horario) y, si es el perfil propio del dueño, su foto, sus
   palabras y sus idiomas. Lo de cada persona solo lo cambia esa persona. */
export async function equipoGuardar(id: string, mid: string, x: {
  role: [string, string]; y: number | null; sp: [string, string][]; same: boolean; wk: unknown; photo?: string | null; bio?: [string, string]; langs?: string[];
}): Promise<ResEq> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const m = await persona(a, mid);
  if (!m || m.status !== "active") return no("Esa persona ya no está en tu equipo.", "That person is no longer on your team.");
  const role = { es: limpio(x?.role?.[0], 40), en: limpio(x?.role?.[1], 40) };
  if (!role.es && a.negocio.category_id !== "NEG-BELL") return no("Para guardar falta: rol.", "To save, add: role.");
  const y = x?.y == null ? null : Number(x.y);
  if (y !== null && !(Number.isInteger(y) && y >= 1970 && y <= new Date().getFullYear())) return no("Revisa el año.", "Check the year.");
  const sp = Array.isArray(x?.sp) ? x.sp.map((s) => ({ es: limpio(s?.[0], 24), en: limpio(s?.[1], 24) })).filter((s) => s.es).slice(0, 4) : [];
  const same = m.kind === "renter" ? true : !!x?.same;
  if (!same && !(semanaValida(x?.wk) && x.wk.some(Boolean))) return no("Para guardar falta: al menos un día de trabajo.", "To save, add: at least one work day.");
  const propio = m.kind === "owner" && m.user_id === a.yo.id;
  await tx(async (c) => {
    await c.query(
      `update business_members set role = $2::jsonb, since_year = $3, specialties = $4::jsonb, same_as_business_hours = $5, weekly_schedule = $6::jsonb, updated_at = now() where id = $1`,
      [m.id, JSON.stringify(role), y, JSON.stringify(sp), same, same ? null : JSON.stringify(x.wk)]);
    if (propio) {
      const bio = { es: limpioArea(x?.bio?.[0], 280), en: limpioArea(x?.bio?.[1], 280) };
      const langs = Array.isArray(x?.langs) ? [...new Set(x.langs.filter((l) => ["es", "en", "pt"].includes(l)))] : ["es"];
      let photo: string | null = null;
      if (typeof x?.photo === "string" && UUID.test(x.photo)) {
        // Foto nueva: la que la persona acaba de subir (/api/medios) pasa a su perfil del equipo.
        photo = (await c.query<{ url: string }>(
          `update media set owner_kind = 'member', owner_id = $1, sort = 0 where id = $2::uuid and owner_kind = 'user' and owner_id = $3 and status = 'visible' returning url`,
          [m.id, x.photo, a.yo.id])).rows[0]?.url ?? null;
        if (photo) await c.query(`update media set status = 'removed', removed_reason = 'replaced', removed_by = $3 where owner_kind = 'member' and owner_id = $1 and status = 'visible' and id <> $2::uuid`, [m.id, x.photo, a.yo.id]);
      } else if (typeof x?.photo === "string") photo = (await c.query<{ photo_url: string | null }>(`select photo_url from business_members where id = $1`, [m.id])).rows[0]?.photo_url ?? null;
      else if (x?.photo === null) await c.query(`update media set status = 'removed', removed_reason = 'owner', removed_by = $2 where owner_kind = 'member' and owner_id = $1 and status = 'visible'`, [m.id, a.yo.id]);
      await c.query(`update business_members set bio = $2::jsonb, languages = $3, photo_url = $4, updated_at = now() where id = $1`,
        [m.id, bio.es || bio.en ? JSON.stringify(bio) : null, langs.length ? langs : ["es"], photo]);
    }
    await recalcularFiltrosSP(c, a.negocio.id); // sus idiomas cuentan para «El médico habla español»
  });
  await auditar(a, "panel.equipo_guardar", m.id, { role, y, sp, same });
  return { ok: true };
}
