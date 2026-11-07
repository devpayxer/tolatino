"use server";
/* Decisiones de las colas (ADM-COLAS). Cada una: permiso (colas:aprobar), la cola es de su rol y de su ciudad, el
   caso sigue abierto → cambio en la fuente + caso decidido + auditoría con motivo, en una transacción. */
import { revalidatePath } from "next/cache";
import { recalcularFiltrosSP } from "@/lib/salud-pro";
import type { PoolClient } from "pg";
import { auditar, staff, type Staff } from "@/lib/admin";
import { colasVisibles } from "@/lib/admin-colas";
import type { Cola } from "@/lib/colas";
import { tx } from "@/lib/db";

export type ResAdm = { ok: true; mensaje?: string; caso?: string } | { ok: false; mensaje: string };
const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");
type Fila = { id: string; queue: Cola; subject_kind: string; subject_id: string; business_id: string | null; city_id: string | null; status: string; assigned_to: string | null; assignee: string | null };

async function abrir(c: PoolClient, s: Staff, id: string): Promise<Fila | string> {
  if (!/^\d{1,18}$/.test(String(id))) return "Ese caso no existe.";
  const q = (await c.query<Fila>(
    `select q.id::text, q.queue, q.subject_kind, q.subject_id, q.business_id, q.city_id, q.status, q.assigned_to, u.first_name as assignee
       from queue_items q left join users u on u.id = q.assigned_to where q.id = $1 for update of q`, [id])).rows[0];
  if (!q || !colasVisibles(s).includes(q.queue) || (s.cities.length && (!q.city_id || !s.cities.includes(q.city_id)))) return "Ese caso no existe.";
  if (q.status !== "open") return "Este caso ya se decidió.";
  return q;
}
async function quien(): Promise<Staff | null> {
  const s = await staff();
  return s && s.puede("colas", "aprobar") ? s : null;
}
const cerrar = (c: PoolClient, q: Fila, s: Staff, decision: string, motivo: string) =>
  c.query(`update queue_items set status = 'decided', decision = $2, reason = $3, decided_by = $4, decided_at = now() where id = $1`, [q.id, decision, motivo, s.id]);
const EST_CUENTA: Record<string, string> = { active: "activa", muted: "silenciada", suspended: "suspendida", banned: "baneada" };
const listo = () => { revalidatePath("/admin/colas"); revalidatePath("/admin"); revalidatePath("/admin/negocios"); };

/* Tomar un caso (bloqueo suave: «Lo está viendo X»). */
export async function tomarCaso(id: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.assigned_to === s.id) return "ok";
    await c.query(`update queue_items set assigned_to = $2, assigned_at = now() where id = $1`, [q.id, s.id]);
    await auditar(c, { actor: s.id, action: "cola.tomar", targetKind: "case", targetId: q.id, city: q.city_id, before: { asignado: q.assignee ?? null }, after: { asignado: s.first_name } });
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  return { ok: true, mensaje: "Lo tomaste. Nadie más lo trabaja mientras tanto." };
}

/* Tomar siguiente: el primero sin asignar de MIS colas (la más vieja contra su plazo). */
export async function tomarSiguiente(): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver las colas.");
  const vis = colasVisibles(s);
  const { COLAS } = await import("@/lib/colas");
  const sla = `case q.queue ${Object.entries(COLAS).map(([k, v]) => `when '${k}' then ${v.sla}`).join(" ")} else 24 end`;
  const r = await tx(async (c) => {
    const q = (await c.query<{ id: string; city_id: string }>(
      `select q.id::text, q.city_id from queue_items q
        where q.status = 'open' and q.assigned_to is null and q.queue = any($1::text[]) and (cardinality($2::text[]) = 0 or q.city_id = any($2::text[]))
        order by extract(epoch from now() - q.opened_at) / (${sla} * 3600) desc limit 1 for update skip locked`, [vis, s.cities])).rows[0];
    if (!q) return null;
    await c.query(`update queue_items set assigned_to = $2, assigned_at = now() where id = $1`, [q.id, s.id]);
    await auditar(c, { actor: s.id, action: "cola.tomar", targetKind: "case", targetId: q.id, city: q.city_id, before: { asignado: null }, after: { asignado: s.first_name } });
    return q.id;
  });
  if (!r) return no("No hay nada sin asignar en tus colas.");
  listo();
  return { ok: true, caso: r, mensaje: "Lo tomaste. Nadie más lo trabaja mientras tanto." };
}

/* Sello: aprobar (las 3 comprobaciones), pedir un dato o no aprobar. */
export async function decidirSello(id: string, accion: "aprobar" | "info" | "no", motivo: string, checks: Record<string, boolean>): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = accion === "aprobar" ? "Las tres comprobaciones pasaron" : motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const marcas = { existe: !!checks?.existe, representa: !!checks?.representa, coincide: !!checks?.coincide };
  if (accion === "aprobar" && !(marcas.existe && marcas.representa && marcas.coincide)) return no("Marca las tres comprobaciones primero.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "sello") return "Ese caso no es de esta cola.";
    const est = accion === "aprobar" ? "ok" : accion;
    await c.query(`update verification_requests set status = $2, checks = $3::jsonb, note = $4, reviewed_by = $5, decided_at = now() where id = $1::bigint`,
      [q.subject_id, est, JSON.stringify({ ...marcas, por: s.id, at: new Date().toISOString() }), accion === "aprobar" ? null : m, s.id]);
    if (accion === "aprobar") await c.query(`update business_stats_cache set verified = true, updated_at = now() where business_id = $1`, [q.business_id]);
    await cerrar(c, q, s, accion, m);
    await auditar(c, { actor: s.id, action: accion === "aprobar" ? "negocio.sello.aprobar" : accion === "info" ? "negocio.sello.pedir_dato" : "negocio.sello.rechazar", targetKind: "business", targetId: q.business_id, city: q.city_id, before: { sello: "en revisión" }, after: { sello: accion === "aprobar" ? "verificado" : accion === "info" ? "te falta un dato" : "no aprobado" }, reason: m });
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  return { ok: true, mensaje: accion === "aprobar" ? "Sello otorgado. El negocio lo ve en su panel y en su ficha." : "Listo. Quedó en la auditoría." };
}

/* Negocios nuevos: todo bien (revisado) u ocultar con motivo. */
export async function decidirNuevo(id: string, accion: "ok" | "ocultar", motivo: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = accion === "ok" ? "Revisión ligera sin hallazgos" : motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "nuevo") return "Ese caso no es de esta cola.";
    if (accion === "ocultar") {
      await c.query(`update businesses set status = 'hidden', status_reason = $2, status_at = now(), status_by = $3, updated_at = now() where id = $1 and status = 'active'`, [q.business_id, m, s.id]);
      await auditar(c, { actor: s.id, action: "negocio.ocultar", targetKind: "business", targetId: q.business_id, city: q.city_id, before: { estado: "visible" }, after: { estado: "oculto" }, reason: m });
    } else {
      await auditar(c, { actor: s.id, action: "negocio.revisado", targetKind: "business", targetId: q.business_id, city: q.city_id, before: { revision: "nuevo" }, after: { revision: "revisado" }, reason: m });
    }
    await cerrar(c, q, s, accion, m);
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  return { ok: true, mensaje: accion === "ok" ? "Listo. Quedó en la auditoría." : "Oculto. El dueño ve el motivo en su panel." };
}

/* Medios marcados: está bien (se mantiene) o quitar foto con motivo. La única foto visible no se quita. */
export async function decidirMedios(id: string, accion: "mantener" | "quitar", motivo: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = accion === "mantener" ? "Falso positivo" : motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "medios") return "Ese caso no es de esta cola.";
    if (accion === "quitar") {
      const n = (await c.query<{ n: number }>(`select count(*)::int as n from media where owner_kind = 'business' and owner_id = $1 and status = 'visible'`, [q.business_id])).rows[0]!.n;
      if (n <= 1) return "Es la única foto visible: para quitarla, pide al dueño que suba otra.";
      await c.query(`update media set status = 'removed', removed_reason = 'admin', removed_note = $2, removed_by = $3, removed_at = now() where id = $1::uuid and status = 'visible'`, [q.subject_id, m, s.id]);
      await c.query(`update business_stats_cache set photo_count = (select count(*) from media where owner_kind = 'business' and owner_id = $1 and status = 'visible'), updated_at = now() where business_id = $1`, [q.business_id]);
    }
    await c.query(`update photo_reports set status = $2, decided_by = $3, decided_at = now(), decision_reason = $4 where media_id = $1::uuid and status = 'open'`, [q.subject_id, accion === "quitar" ? "removed" : "kept", s.id, m]);
    await cerrar(c, q, s, accion, m);
    await auditar(c, { actor: s.id, action: accion === "quitar" ? "negocio.foto.quitar" : "foto.reporte.mantener", targetKind: "media", targetId: q.subject_id, city: q.city_id, before: { foto: "marcada" }, after: { foto: accion === "quitar" ? "quitada" : "aprobada", negocio: q.business_id }, reason: m });
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  return { ok: true, mensaje: accion === "quitar" ? "Quitada. El dueño ve el motivo en su panel." : "Listo. Quedó en la auditoría." };
}

/* Recomendaciones: ya existe (con cuál) o descartar con motivo. «Crear semilla» llega con Reclamar negocio. */
export async function decidirRec(id: string, accion: "existe" | "descartar", motivo: string, negocio?: string | null): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = accion === "existe" ? "Ya estaba en To’Latino" : motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "rec") return "Ese caso no es de esta cola.";
    let bid: string | null = null;
    if (accion === "existe") {
      bid = typeof negocio === "string" && /^[a-z0-9-]{1,80}$/.test(negocio) ? ((await c.query<{ id: string }>(`select id from businesses where id = $1 and city_id = $2`, [negocio, q.city_id])).rows[0]?.id ?? null) : null;
      if (!bid) return "Elige cuál negocio es.";
    }
    await c.query(`update recommendations set status = $2, business_id = coalesce($3, business_id), decided_by = $4, decided_at = now(), decision_reason = $5 where id = $1::bigint`,
      [q.subject_id, accion === "existe" ? "duplicate" : "declined", bid, s.id, m]);
    await cerrar(c, q, s, accion, m);
    await auditar(c, { actor: s.id, action: accion === "existe" ? "recomendacion.duplicada" : "recomendacion.descartar", targetKind: "recommendation", targetId: q.subject_id, city: q.city_id, before: { estado: "recomendación" }, after: { estado: accion === "existe" ? "duplicada" : "descartada", negocio: bid }, reason: m });
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  return { ok: true, mensaje: "Listo. Quedó en la auditoría." };
}

/* Licencias: verificada (coincide con el registro), vencida o no aparece. La ficha Licencia muestra el estado real; la
   tarjeta, el chip y el filtro «Licencia verificada» solo cuentan las verificadas (licencias_refrescar). */
export async function decidirLicencia(id: string, accion: "valid" | "expired" | "not_found", motivo: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  if (!["valid", "expired", "not_found"].includes(accion)) return no("Esa decisión no existe.");
  const m = accion === "valid" ? "Coincide con el registro oficial" : motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "lic") return "Ese caso no es de esta cola.";
    const l = (await c.query<{ status: string; kind: string; titulo: string }>(
      `select l.status, l.kind, coalesce(nullif(l.title, '{}'::jsonb), k.title)->>'es' as titulo from licenses l join license_kinds k on k.key = l.kind where l.id = $1::bigint for update of l`, [q.subject_id])).rows[0];
    if (!l || l.status === "withdrawn") return "El negocio retiró esa licencia.";
    await c.query(
      `update licenses set status = $2, status_reason = $3, checked_at = now(), checked_by = $4, updated_at = now(),
              verified_at = case when $2 = 'valid' then now() else verified_at end, verified_by = case when $2 = 'valid' then $4 else verified_by end,
              next_review = case when $2 = 'valid' then (now() + interval '3 months')::date else next_review end
        where id = $1::bigint`, [q.subject_id, accion, m, s.id]);
    await c.query(`select licencias_refrescar($1)`, [q.business_id]); await (await import("@/lib/ninos")).recalcularFiltrosNinos(c, q.business_id ?? ""); // Niños: la tarjeta sigue a la licencia del DHS (4eb)
    if (q.business_id) await recalcularFiltrosSP(c, q.business_id); // «El médico habla español» sale de las licencias verificadas del equipo
    await cerrar(c, q, s, accion, m);
    const L: Record<string, string> = { valid: "verificada", expired: "vencida", not_found: "no se pudo verificar" };
    await auditar(c, { actor: s.id, action: accion === "valid" ? "licencia.verificar" : accion === "expired" ? "licencia.vencida" : "licencia.no_aparece", targetKind: "business", targetId: q.business_id, city: q.city_id, before: { licencia: l.titulo, estado: l.status === "valid" ? "verificada, revisión por vencer" : L[l.status] ?? "por verificar" }, after: { licencia: l.titulo, estado: L[accion] }, reason: m });
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  return { ok: true, mensaje: "Listo. Quedó en la auditoría." };
}

/* Reclamo (Cambios sensibles): aplicar el cambio de dueño o rechazarlo. Con dueño anterior (decisión R2): solo un Admin
   y solo pasados 7 días desde que el dueño vio el aviso en su panel. Nada se borra: el dueño anterior sale del panel
   como miembro «removed / claim». */
export async function decidirReclamo(id: string, aprobar: boolean, motivo: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "cambio" || q.subject_kind !== "claim") return "Ese caso no es de esta cola.";
    const cl = (await c.query<{ id: string; user_id: string; status: string; role: string; owner_notified_at: string | null }>(
      `select id, user_id, status, role, owner_notified_at from claims where id = $1 for update`, [q.subject_id])).rows[0];
    if (!cl || cl.status !== "pending") return "Este reclamo ya se decidió.";
    const b = (await c.query<{ owner: string | null; status: string; name: string }>(`select owner_user_id as owner, status, name from businesses where id = $1 for update`, [q.business_id])).rows[0];
    if (!b || b.status !== "active") return "El negocio ya no está activo.";
    if (aprobar && b.owner && b.owner !== cl.user_id) {
      if (s.role !== "admin") return "Este negocio ya tiene dueño: solo un Admin aprueba el cambio.";
      if (!cl.owner_notified_at || Date.now() - new Date(cl.owner_notified_at).getTime() < 7 * 86_400_000) return "El dueño actual tiene 7 días desde el aviso para responder. Todavía no se puede aplicar.";
    }
    if (aprobar) {
      const u = (await c.query<{ nombre: string; phone: string }>(`select coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), 'Dueño') as nombre, phone from users where id = $1`, [cl.user_id])).rows[0]!;
      await c.query(`update business_members set status = 'removed', removed_reason = 'claim', removed_at = now(), panel_access = '{}', updated_at = now()
                      where business_id = $1 and kind = 'owner' and status = 'active' and user_id is distinct from $2`, [q.business_id, cl.user_id]);
      const ya = (await c.query(`update business_members set kind = 'owner', panel_access = '{all}', status = 'active', updated_at = now() where business_id = $1 and user_id = $2 and status = 'active'`, [q.business_id, cl.user_id])).rowCount;
      if (!ya) await c.query(`insert into business_members (business_id, user_id, kind, display_name, phone, panel_access, status) values ($1, $2, 'owner', $3, $4, '{all}', 'active')`, [q.business_id, cl.user_id, u.nombre, u.phone]);
      await c.query(`update businesses set owner_user_id = $2, origin = case when origin = 'self' then origin else 'claim' end, updated_at = now() where id = $1`, [q.business_id, cl.user_id]);
      const antes = b.owner ? (await c.query<{ n: string }>(`select coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), phone) as n from users where id = $1`, [b.owner])).rows[0]?.n : null;
      await auditar(c, { actor: s.id, action: "negocio.dueno.cambiar", targetKind: "business", targetId: q.business_id, city: q.city_id, before: { dueno: antes ?? "sin dueño", ref: { usuario: b.owner } }, after: { dueno: u.nombre, reclamo: cl.id, ref: { usuario: cl.user_id } }, reason: m });
    }
    await c.query(`update claims set status = $2, reason = $3, decided_by = $4, decided_at = now() where id = $1`, [cl.id, aprobar ? "approved" : "rejected", m, s.id]);
    await cerrar(c, q, s, aprobar ? "aprobar" : "rechazar", m);
    await auditar(c, { actor: s.id, action: aprobar ? "reclamo.aprobar" : "reclamo.rechazar", targetKind: "claim", targetId: cl.id, city: q.city_id, before: { estado: "en revisión" }, after: { estado: aprobar ? "aprobado" : "no aprobado" }, reason: m });
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  return { ok: true, mensaje: aprobar ? "Cambio aplicado. Ya es el dueño." : "Listo. Quien reclamó ve el motivo." };
}

/* Cambios sensibles de una cuenta (por ahora, borrar): lo pide una persona del equipo y lo aplica OTRA. Al aplicar el
   borrado: la cuenta queda «borrándose» 30 días (se puede restaurar), sus sesiones se cierran y no puede entrar. */
export async function decidirCambio(id: string, aprobar: boolean, motivo: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "cambio" || q.subject_kind !== "sensitive_change") return "Ese caso no es de esta cola.";
    const sc = (await c.query<{ id: string; type: string; status: string; target_id: string; requested_by: string }>(
      `select id, type, status, target_id, requested_by from sensitive_changes where id = $1 for update`, [q.subject_id])).rows[0];
    if (!sc || sc.status !== "pending") return "Este cambio ya se decidió.";
    if (sc.requested_by === s.id) return "Lo pediste tú: lo aplica otra persona del equipo.";
    if (sc.type !== "deleteUser") return "Este cambio todavía no se puede aplicar.";
    if (aprobar) {
      const u = (await c.query<{ status: string; staff: boolean }>(
        `select status, exists (select 1 from staff_members m where m.user_id = u.id and m.status = 'active') as staff from users u where u.id::text = $1 for update`, [sc.target_id])).rows[0];
      if (!u || ["deleted_pending", "deleted", "merged"].includes(u.status)) return "Esta cuenta ya está borrada.";
      if (u.staff) return "Es del equipo de To’Latino: quítale el rol en Sistema › Equipo antes.";
      await c.query(`update users set status = 'deleted_pending', delete_at = now() + interval '30 days', status_until = null where id::text = $1`, [sc.target_id]);
      await c.query(`update sessions set signed_out_at = now() where user_id::text = $1 and signed_out_at is null`, [sc.target_id]);
      await auditar(c, { actor: s.id, action: "usuario.borrar", targetKind: "user", targetId: sc.target_id, city: q.city_id, before: { estado: EST_CUENTA[u.status] ?? "activa" }, after: { estado: "borrándose · 30 días de gracia", pedido: sc.id }, reason: m });
    }
    await c.query(`update sensitive_changes set status = $2, decided_by = $3, decided_at = now(), decision_reason = $4 where id = $1`, [sc.id, aprobar ? "applied" : "rejected", s.id, m]);
    await cerrar(c, q, s, aprobar ? "aplicar" : "rechazar", m);
    await auditar(c, { actor: s.id, action: aprobar ? "cambio.aplicar" : "cambio.rechazar", targetKind: "sensitive_change", targetId: sc.id, city: q.city_id, before: { estado: "pendiente" }, after: { estado: aprobar ? "aplicado" : "rechazado" }, reason: m });
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  revalidatePath("/admin/usuarios");
  return { ok: true, mensaje: aprobar ? "Aplicado. La cuenta tiene 30 días de gracia." : "Rechazado. Queda en el historial." };
}

/* Recomendaciones · «Crear semilla»: negocio no reclamado que sale al final de «También en {ciudad}» de su categoría
   hasta que el dueño lo publique (decisión I: las semillas solo nacen de recomendaciones). */
export async function crearSemilla(id: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = "Negocio no reclamado creado; el dueño puede reclamarlo";
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "rec") return "Ese caso no es de esta cola.";
    const rec = (await c.query<{ id: string; business_name: string; category_id: string | null; where: string | null; address: string | null; contact_phone: string | null; contact_kind: string | null }>(
      `select id::text, business_name, category_id, "where", address, contact_phone, contact_kind from recommendations where id = $1::bigint for update`, [q.subject_id])).rows[0];
    if (!rec) return "Esa recomendación no existe.";
    if (!rec.category_id) return "La recomendación no tiene categoría.";
    const tel = rec.contact_kind === "phone" && /^\+1[2-9]\d{9}$/.test(rec.contact_phone ?? "") ? rec.contact_phone : null;
    const sd = (await c.query<{ id: string }>(
      `insert into seed_listings (recommendation_id, city_id, category_id, name, "where", address, phone, created_by)
       values ($1::bigint, $2, $3, $4, $5, $6, $7, $8) returning id::text`,
      [rec.id, q.city_id, rec.category_id, rec.business_name.slice(0, 80), rec.where === "sin_local" ? "sin_local" : "address", rec.where === "sin_local" ? null : rec.address, tel, s.id])).rows[0]!;
    await c.query(`update recommendations set status = 'seeded', seed_id = $2::bigint, decided_by = $3, decided_at = now(), decision_reason = $4 where id = $1::bigint`, [rec.id, sd.id, s.id, m]);
    await cerrar(c, q, s, "semilla", m);
    await auditar(c, { actor: s.id, action: "recomendacion.semilla", targetKind: "recommendation", targetId: rec.id, city: q.city_id, before: { estado: "recomendación" }, after: { estado: "negocio no reclamado", semilla: sd.id }, reason: m });
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  return { ok: true, mensaje: "Semilla creada. Sale al final de su categoría como «sin reclamar»." };
}

/* Reportes de contenido · reseña: se queda (los reportes se descartan; si el negocio la pidió revisar, queda «revisada»)
   u se oculta con motivo (sale de la página y de las ★; el autor ve el motivo). Con sanción, además, al autor. */
const SANC_CONTENIDO = ["adv", "mute7", "nopub", "susp14"] as const;
/* Ayuda con pedidos y citas: To'Latino resuelve con un mensaje que el cliente ve en su pedido o su cita y el negocio en
   su panel. Con monto (solo quien aprueba dinero en Transacciones), además devuelve a la tarjeta lo pagado en la app
   (el pedido con tarjeta o el depósito de la cita); idempotente por la clave del intento. */
export async function decidirSop(id: string, mensaje: string, monto?: string | null, clave?: string | null): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(mensaje);
  if (!m) return no("Escribe la respuesta para el cliente.");
  if (m.length > 500) return no("Máximo 500 letras.");
  const cents = monto ? Math.round((parseFloat(String(monto).replace(/[^0-9.]/g, "")) || 0) * 100) : 0;
  let devuelto = 0;
  if (cents > 0) {
    if (!s.puede("tx", "aprobar")) return no("Tu rol no devuelve dinero.");
    if (!/^[0-9a-f-]{36}$/.test(String(clave ?? ""))) return no("Prueba de nuevo.");
    const p = (await (await import("@/lib/db")).db().query<{ pid: string; hid: string }>(
      `select p.id::text as pid, h.id::text as hid from queue_items q join help_requests h on h.id = q.subject_id::bigint join payments p on p.operation_id = h.operation_id
        where q.id = $1::bigint and q.queue in ('sop', 'cuidado', 'salir') and q.status = 'open' and (cardinality($2::text[]) = 0 or q.city_id = any($2::text[])) and p.status in ('captured', 'partially_refunded') order by p.id desc limit 1`, [id, s.cities])).rows[0];
    if (!p) return no("Ahí no hay nada pagado en la app para devolver (o el caso ya se decidió).");
    const d = await (await import("@/lib/cobros")).devolverPago({ paymentId: p.pid, centavos: cents, por: "admin", actorId: s.id, motivo: m, idem: `sop-${clave}` });
    if (!d.ok) return no(d.msg.es);
    devuelto = cents;
  }
  return tx(async (c) => {
    const q = (await c.query<{ subject_id: string; business_id: string | null; city_id: string }>(
      `select subject_id, business_id, city_id from queue_items where id = $1::bigint and queue in ('sop', 'cuidado', 'salir') and status = 'open' and (cardinality($2::text[]) = 0 or city_id = any($2::text[])) for update`, [id, s.cities])).rows[0];
    if (!q) return no("Este caso ya se decidió.");
    const h = await c.query(`update help_requests set status = 'resolved', resolution = $2, resolved_at = now(), resolved_by = $3, closed_by = 'admin', refunded_cents = refunded_cents + $4, updated_at = now()
                              where id = $1::bigint and status in ('open', 'answered', 'escalated') returning number`, [q.subject_id, m, s.id, devuelto]);
    if (!h.rowCount) return no("Esta solicitud ya se resolvió.");
    await c.query(`update queue_items set status = 'decided', decision = 'resuelta', reason = $2, decided_by = $3, decided_at = now() where id = $1::bigint`, [id, m, s.id]);
    await auditar(c, { actor: s.id, action: "soporte.resolver", targetKind: "business", targetId: q.business_id ?? "", city: q.city_id, before: { solicitud: (h.rows[0] as { number: string }).number, estado: "abierta" }, after: { estado: "resuelta", ...(devuelto ? { devuelto: `$${(devuelto / 100).toFixed(2)}` } : {}) }, reason: m });
    return { ok: true as const, mensaje: `Resuelta${devuelto ? ` y devueltos $${(devuelto / 100).toFixed(2)}` : ""}. El cliente la ve en su pedido o su cita.`, caso: q.subject_id };
  }).then(async (r) => {
    if (r.ok && r.caso) {
      const n = (await import("@/lib/db")).db; const o = (await n().query<{ num: string; k: string }>(`select o.number as num, o.kind as k from help_requests h join operations o on o.id = h.operation_id where h.id = $1::bigint`, [r.caso])).rows[0];
      // Solo la ayuda de un pedido de comida usa avisarAyuda (enlace a /pedido/…); las demás (citas, mercado, apartados, fiestas, viajes,
      // noche, inscripciones y visitas) usan avisarAyudaCita, que enlaza a su propia pantalla (guardián avisoAyudaPorTipo).
      if (o?.k === "order") await (await import("@/lib/ayuda")).avisarAyuda(o.num, "help_done");
      else if (o) await (await import("@/lib/ayuda-cita")).avisarAyudaCita(o.num, "help_done");
    }
    return r.ok ? { ok: true as const, mensaje: r.mensaje } : r;
  });
}

export async function decidirRep(id: string, accion: "mantener" | "ocultar", motivo: string, sancion?: string | null): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const sk = accion === "ocultar" && sancion ? (SANC_CONTENIDO as readonly string[]).includes(sancion) ? sancion as typeof SANC_CONTENIDO[number] : null : null;
  if (sancion && !sk) return no("Esa sanción no existe.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "rep") return "Ese caso no es de esta cola.";
    const rv = (await c.query<{ id: string; user_id: string; business_id: string; status: string; estado: string | null; city_id: string }>(
      `select id::text, user_id::text, business_id, status, review_state as estado, city_id from reviews where id = $1::bigint for update`, [q.subject_id])).rows[0];
    if (!rv) return "Esa reseña ya no existe.";
    if (accion === "ocultar") {
      if (rv.status === "visible") await c.query(`update reviews set status = 'hidden', hidden_reason = $2, hidden_by = $3, hidden_at = now() where id = $1::bigint`, [rv.id, m, s.id]);
      await c.query(`select reviews_stats($1)`, [rv.business_id]);
      if (sk) {
        const { SANCIONES } = await import("@/lib/sanciones");
        const k = SANCIONES[sk], fin = k.dias ? `now() + interval '${k.dias} days'` : "null";
        const yaStaff = (await c.query(`select 1 from staff_members where user_id = $1 and status = 'active'`, [rv.user_id])).rowCount;
        if (yaStaff) return "El autor es del equipo de To’Latino: sanciónalo desde Sistema › Equipo.";
        await c.query(`insert into sanctions (target_kind, target_id, city_id, kind, reason, by_staff, ends_at) values ('user', $1, $2, $3, $4, $5, ${fin})`, [rv.user_id, rv.city_id, sk, m, s.id]);
        if (sk !== "adv") await c.query(`update users set status = $2, status_until = ${fin}, status_reason = $3 where id = $1 and status not in ('banned', 'deleted', 'merged')`, [rv.user_id, k.estado, m]);
        if (sk === "susp14") await c.query(`update sessions set signed_out_at = now() where user_id = $1 and signed_out_at is null`, [rv.user_id]);
        await auditar(c, { actor: s.id, action: "usuario.sancionar", targetKind: "user", targetId: rv.user_id, city: rv.city_id, before: null, after: { sancion: k.es, por: "reseña" }, reason: m });
      }
    } else if (rv.estado === "disp") {
      await c.query(`update reviews set review_state = 'kept', review_state_at = now() where id = $1::bigint`, [rv.id]);
    }
    await c.query(`update content_reports set status = $2, decided_by = $3, decided_at = now() where target_kind = 'review' and target_id = $1 and status = 'open'`, [rv.id, accion === "ocultar" ? "actioned" : "dismissed", s.id]);
    await cerrar(c, q, s, accion, m);
    await auditar(c, { actor: s.id, action: accion === "ocultar" ? "resena.ocultar" : "resena.mantener", targetKind: "review", targetId: rv.id, city: rv.city_id, before: { resena: "reportada" }, after: { resena: accion === "ocultar" ? "oculta" : "se queda", negocio: rv.business_id }, reason: m });
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  return { ok: true, mensaje: accion === "ocultar" ? (sk ? "Oculta y sanción aplicada. El autor ve el motivo." : "Oculta. El autor ve el motivo.") : "Se queda. Quedó en la auditoría." };
}

/* Mensajes reportados: ocultar un mensaje (avisa a quien lo escribió) y cerrar el caso (Todo bien / Resuelto). El hilo
   solo se toca con el caso abierto. Nada se borra. */
export async function chatOcultarMensaje(id: string, mensaje: string, motivo: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "chat") return "Ese caso no es de esta cola.";
    if (q.subject_kind === "dm_thread") {
      // 5c · Mensaje entre vecinos: solo con el caso y un reporte abiertos (lib/admin-dm.ts).
      const d = await (await import("@/lib/admin-dm")).ocultarDm(c, q.subject_id, mensaje, m, s.id);
      if (!d) return "Ese mensaje no está en esta conversación o ya está oculto.";
      await auditar(c, { actor: s.id, action: "mensaje.vecino.ocultar", targetKind: "dm_message", targetId: d.id, city: q.city_id, before: { mensaje: "visible" }, after: { mensaje: "oculto" }, reason: m });
      return { id: d.id, autor: d.autor, de: "vecino" };
    }
    const x = (await c.query<{ id: string; autor: string | null; de: string }>(
      `update chat_messages set hidden_at = now(), hidden_reason = $3, hidden_by = $4 where id = $1::bigint and thread_id = $2::bigint and hidden_at is null
       returning id::text, sender_user_id::text as autor, sender as de`, [String(mensaje ?? "0").replace(/\D/g, "") || "0", q.subject_id, m, s.id])).rows[0];
    if (!x) return "Ese mensaje no está en esta conversación o ya está oculto.";
    await auditar(c, { actor: s.id, action: "mensaje.ocultar", targetKind: "chat_message", targetId: x.id, city: q.city_id, before: { mensaje: "visible" }, after: { mensaje: "oculto" }, reason: m });
    return x;
  });
  if (typeof r === "string") return no(r);
  if (r.autor && r.de === "vecino") {
    const { avisar } = await import("@/lib/avisos");
    await avisar(r.autor, "dm_hide", { motivo: m }, { href: "/comunidad/mensajes" }).catch(() => undefined);
  } else if (r.autor && (r.de === "user" || r.de === "business")) {
    const { avisar } = await import("@/lib/avisos");
    await avisar(r.autor, "mod_hide", { tipo: "mensaje", motivo: m }, { href: r.de === "user" ? "/cuenta/mensajes" : undefined }).catch(() => undefined);
  }
  listo();
  return { ok: true, mensaje: "Mensaje oculto. Quien lo escribió ve el motivo." };
}
export async function decidirChat(id: string, accion: "mantener" | "resuelto", motivo: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "chat") return "Ese caso no es de esta cola.";
    await c.query(`update content_reports set status = $2, decided_by = $3, decided_at = now() where target_kind = $4 and target_id = $1 and status = 'open'`, [q.subject_id, accion === "resuelto" ? "actioned" : "dismissed", s.id, q.subject_kind === "dm_thread" ? "dm" : "chat"]);
    await cerrar(c, q, s, accion, m);
    await auditar(c, { actor: s.id, action: accion === "resuelto" ? "chat.resuelto" : "chat.mantener", targetKind: q.subject_kind === "dm_thread" ? "dm_thread" : "chat_thread", targetId: q.subject_id, city: q.city_id, before: { conversacion: "reportada" }, after: { conversacion: accion === "resuelto" ? "resuelta" : "todo bien" }, reason: m });
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  return { ok: true, mensaje: accion === "resuelto" ? "Caso cerrado. La conversación ya no se puede leer desde aquí." : "Todo bien. Caso cerrado." };
}

/* Disputas con el banco: responder con evidencia (resumen del equipo + lo que tenemos) o aceptar la devolución. Pide
   colas:aprobar y, por tocar dinero, tx:aprobar. El banco decide después (webhook). */
export async function decidirDisputa(id: string, accion: "responder" | "aceptar", texto: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  if (!s.puede("tx", "aprobar")) return no("Tu rol no decide sobre dinero.");
  const m = motivoOk(texto);
  if (m.length < 10) return no(accion === "responder" ? "Escribe el resumen para el banco (mínimo 10 letras)." : "Escribe el motivo.");
  const q = await tx(async (c) => abrir(c, s, id));
  if (typeof q === "string") return no(q);
  if (q.queue !== "disputa") return no("Ese caso no es de esta cola.");
  const D = await import("@/lib/disputas");
  const r = accion === "responder" ? await D.responderDisputa(q.subject_id, s.id, m) : await D.aceptarDisputa(q.subject_id);
  if (!r.ok) return no(r.msg);
  await tx(async (c) => {
    const q2 = await abrir(c, s, id);
    if (typeof q2 === "string") return;
    await cerrar(c, q2, s, accion, m);
    await auditar(c, { actor: s.id, action: accion === "responder" ? "disputa.responder" : "disputa.aceptar", targetKind: "dispute", targetId: q.subject_id, city: q.city_id,
      before: { disputa: "abierta" }, after: { disputa: accion === "responder" ? "respondida con evidencia" : "aceptada · devuelto al cliente" }, reason: m });
  });
  listo();
  return { ok: true, mensaje: accion === "responder" ? "Respondida. El banco decide; te avisamos el resultado y al negocio también." : "Aceptada: el dinero vuelve al cliente." };
}

/* 4ne · Noche (Mesas no respetadas / Sin identificación): pausar mesas y lista del local o cerrar como revisado. */
export async function decidirNoche(id: string, pausar: boolean, texto: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(texto);
  if (m.length < 4) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if ((q.queue !== "mesa" && q.queue !== "noid" && q.queue !== "grupo" && q.queue !== "plantones") || !q.business_id) return "Ese caso no es de esta cola.";
    // 4eg · «Grupos que no abrieron» pausa las inscripciones (svc); Noche pausa mesas y lista (rsv).
    // 4ie · «Plantones» pausa las visitas y pruebas de manejo (svc).
    const mod = q.queue === "grupo" || q.queue === "plantones" ? "svc" : "rsv";
    if (pausar) {
      await c.query(`update businesses set modules_off = modules_off || jsonb_build_object($4::text, jsonb_build_object('reason', $2::text, 'at', now(), 'by', $3::text)), updated_at = now() where id = $1 and not (modules_off ? $4::text)`, [q.business_id, m, s.id, mod]);
      await auditar(c, { actor: s.id, action: "negocio.modulo.pausar", targetKind: "business", targetId: q.business_id, city: q.city_id, before: { modulo: q.queue === "grupo" ? "Inscripciones" : q.queue === "plantones" ? "Visitas" : "Mesas y lista", estado: "activo" }, after: { estado: "pausado", cola: q.queue === "mesa" ? "Mesas no respetadas" : q.queue === "plantones" ? "Plantones" : q.queue === "grupo" ? "Grupos que no abrieron" : "Sin identificación" }, reason: m });
    }
    await cerrar(c, q, s, pausar ? "pausar" : "revisado", m);
    await auditar(c, { actor: s.id, action: pausar ? "noche.cola_pausar" : "noche.cola_revisado", targetKind: "case", targetId: q.id, city: q.city_id, before: { caso: "abierto" }, after: { caso: pausar ? "mesas y lista en pausa" : "revisado, sin cambios" }, reason: m });
    return `ok:${mod}`;
  });
  if (!r.startsWith("ok:")) return no(r);
  const mod = r.slice(3);
  listo();
  return { ok: true, mensaje: pausar ? (mod === "svc" ? "En pausa (inscripciones o visitas). El dueño ve el motivo en su panel." : "Mesas y lista en pausa. El dueño ve el motivo en su panel.") : "Caso cerrado como revisado." };
}

/* Daño de una renta (4f-2): descontarlo del depósito o liberarlo. Pide decidir sobre dinero (tx:aprobar). */
export async function decidirRenta(id: string, cobrar: boolean, texto: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  if (!s.puede("tx", "aprobar")) return no("Tu rol no decide sobre dinero.");
  const m = motivoOk(texto);
  if (m.length < 4) return no("Escribe el motivo.");
  const q = await tx(async (c) => abrir(c, s, id));
  if (typeof q === "string") return no(q);
  if (q.queue !== "renta") return no("Ese caso no es de esta cola.");
  const R = await import("@/lib/rentas"), num = await R.numeroDeRenta(q.subject_id);
  if (!num) return no("Esa renta no existe.");
  const r = await R.resolverDano(num, !!cobrar, s.id);
  if (!r.ok) return no(r.msg.es);
  await tx(async (c) => {
    const q2 = await abrir(c, s, id);
    if (typeof q2 === "string") return;
    await cerrar(c, q2, s, cobrar ? "descontar" : "no_descontar", m);
    await auditar(c, { actor: s.id, action: cobrar ? "renta.dano_descontar" : "renta.dano_no", targetKind: "rental", targetId: num, city: q.city_id,
      before: { dano: "sin acuerdo" }, after: { dano: cobrar ? "descontado del depósito" : "no se descuenta · depósito liberado" }, reason: m });
  });
  listo();
  return { ok: true, mensaje: cobrar ? "Descontado del depósito. Los dos ya lo saben." : "No se descuenta: el depósito se liberó. Los dos ya lo saben." };
}

/* 4eg · «Cuidado de niños»: ver los datos del niño exige un rol de Soporte o Admin y escribir el motivo; queda en la auditoría y la
   respuesta solo se muestra en la pantalla (nunca en un registro ni en el caso). */
export async function verNinoCaso(id: string, texto: string): Promise<ResAdm> {
  const s = await quien();
  if (!s || !["admin", "soporte"].includes(s.role)) return no("Solo Soporte o Admin ven los datos de un niño.");
  const m = motivoOk(texto);
  if (m.length < 10) return no("Escribe para qué necesitas verlos (10 letras o más).");
  const q = (await (await import("@/lib/db")).db().query<{ op: string; city: string }>(
    `select h.operation_id::text as op, q.city_id as city from queue_items q join help_requests h on h.id::text = q.subject_id
      where q.id = $1::bigint and q.queue = 'cuidado' and q.status = 'open' and (cardinality($2::text[]) = 0 or q.city_id = any($2::text[]))`, [String(id ?? ""), s.cities])).rows[0];
  if (!q) return no("Ese caso ya no está abierto.");
  const n = await (await import("@/lib/ninos-privado")).leerNino(q.op, { cola: String(id) });
  await tx((c) => auditar(c, { actor: s.id, action: "nino.ver", targetKind: "case", targetId: String(id), city: q.city, before: null, after: { datos: n ? "vistos" : "ya borrados" }, reason: m }));
  if (!n) return { ok: true, mensaje: "Los datos de ese niño ya se borraron (30 días después de terminar)." };
  return { ok: true, mensaje: `${n.nombre} · ${n.edad != null ? `${n.edad} años` : n.grado ?? "—"}${n.escuela ? ` · escuela: ${n.escuela}` : ""}${n.nota ? ` · nota: «${n.nota}»` : ""}` };
}


/* 4if · «Posible estafa» (Iglesias, Bienes Raíces, Autos). Sancionar: lo pausado se queda fuera con el motivo de To'Latino y queda una
   advertencia al negocio. Sin acción: lo pausado vuelve a verse. En los dos, la solicitud se resuelve con tu mensaje (lo ve la persona) y al
   negocio le llega el aviso. AQUÍ NUNCA SE DEVUELVE DINERO: no pasó por la app (guardián sinDineroEnAyuda). */
export async function decidirEstafa(id: string, accion: "sancion" | "sin_accion", texto: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(texto);
  if (m.length < 8) return no("Escribe lo que encontraste (lo ve la persona y el negocio).");
  if (accion !== "sancion" && accion !== "sin_accion") return no("Elige qué decides.");
  const E = await import("@/lib/ayuda-estafa");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "estafa") return "Ese caso no es de esta cola.";
    const h = (await c.query<{ id: string; number: string; status: string }>(`select id::text, number, status from help_requests where id = $1::bigint for update`, [q.subject_id])).rows[0];
    if (!h || h.status === "resolved") return "Esta solicitud ya se resolvió.";
    const item = accion === "sancion" ? await E.sancionarPorAyuda(c, h.id, s.id, m) : await E.reanudarPausa(c, h.id, s.id, m);
    await c.query(`update help_requests set status = 'resolved', resolution = $2, resolved_at = now(), resolved_by = $3, closed_by = 'admin', updated_at = now() where id = $1::bigint`, [h.id, m, s.id]);
    await cerrar(c, q, s, accion === "sancion" ? "sancion" : "sin_accion", m);
    await auditar(c, { actor: s.id, action: accion === "sancion" ? "estafa.sancionar" : "estafa.sin_accion", targetKind: "business", targetId: q.business_id ?? "", city: q.city_id, before: { solicitud: h.number, caso: "abierto" }, after: { caso: accion === "sancion" ? "sanción: advertencia y anuncio retirado" : "sin acción", anuncio: item ?? "—" }, reason: m });
    return `ok|${h.number}|${q.business_id ?? ""}|${item ?? ""}`;
  });
  if (!r.startsWith("ok|")) return no(r);
  const [, hnum, biz, item] = r.split("|");
  const { db } = await import("@/lib/db");
  const o = (await db().query<{ num: string }>(`select o.number as num from help_requests h join operations o on o.id = h.operation_id where h.number = $1`, [hnum])).rows[0];
  if (o) await (await import("@/lib/ayuda-cita")).avisarAyudaCita(o.num, "help_done");
  if (biz) {
    const { avisarNegocio } = await import("@/lib/avisos");
    if (accion === "sancion") await avisarNegocio(biz, "biz_help_sancion", { num: hnum!, motivo: m.endsWith(".") ? m : `${m}.`, item: item ? `«${item}»` : "" }, { ref: ["help", hnum!] });
    else if (item) await avisarNegocio(biz, "biz_help_reanuda", { num: hnum!, motivo: m, item: `«${item}»` }, { ref: ["help", hnum!] });
  }
  listo();
  return { ok: true, mensaje: accion === "sancion" ? "Sancionado: el anuncio queda fuera y el negocio tiene una advertencia. La persona ve tu respuesta." : item ? "Sin acción: el anuncio se ve otra vez. La persona ve tu respuesta." : "Sin acción. La persona ve tu respuesta." };
}

/* 4if · Pausar o reanudar lo señalado mientras decides (con motivo; queda en la auditoría). */
export async function pausaEstafa(id: string, pausar: boolean, texto: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(texto);
  if (m.length < 4) return no("Escribe el motivo.");
  const E = await import("@/lib/ayuda-estafa");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "estafa") return "Ese caso no es de esta cola.";
    const h = (await c.query<{ id: string; number: string; business_id: string; city_id: string; user_id: string; on: boolean }>(
      `select id::text, number, business_id, city_id, user_id::text, paused_at is not null and unpaused_at is null as on from help_requests where id = $1::bigint for update`, [q.subject_id])).rows[0];
    if (!h) return "Esa solicitud ya no existe.";
    if (h.on === pausar) return pausar ? "Ya está en pausa." : "No está en pausa.";
    const item = pausar ? await E.pausarPorAyuda(c, h, { kind: "staff", id: s.id }) : await E.reanudarPausa(c, h.id, s.id, m);
    if (item == null) return pausar ? "No hay nada que pausar (ya no se ve en su página)." : "No se pudo reanudar: otra revisión abierta o el equipo lo ocultó por otra razón.";
    await auditar(c, { actor: s.id, action: pausar ? "estafa.pausar" : "estafa.reanudar", targetKind: "case", targetId: q.id, city: q.city_id, before: { anuncio: pausar ? "visible" : "en pausa" }, after: { anuncio: pausar ? "en pausa" : "visible", solicitud: h.number }, reason: m });
    return "ok";
  });
  if (r !== "ok") return no(r);
  listo();
  return { ok: true, mensaje: pausar ? "En pausa mientras decides." : "Se ve otra vez; el caso sigue abierto." };
}

/* 4ig · «Vivienda justa». Una propiedad para mayores: «Confirmar» la deja como está; «No se confirma» la oculta con el motivo (la misma decisión
   que Negocios 360°, lib/vivienda-cola.ts). Textos frenados: «Revisado, sin acción» cierra el caso; «Advertir» deja una advertencia al negocio
   (sanctions) y le avisa. En los cuatro, el caso se cierra con el motivo y queda en la auditoría; el negocio recibe el aviso salvo en «revisado». */
export async function decidirVivienda(id: string, accion: "confirmar" | "rechazar" | "revisado" | "advertir", texto: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  if (!["confirmar", "rechazar", "revisado", "advertir"].includes(accion)) return no("Elige qué decides.");
  const m = motivoOk(texto) || (accion === "confirmar" ? "La declaración de vivienda para mayores está en orden" : "");
  if (m.length < 4) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id);
    if (typeof q === "string") return q;
    if (q.queue !== "vivienda" || !q.business_id) return "Ese caso no es de esta cola.";
    const esProp = q.subject_kind === "listing";
    if (esProp !== (accion === "confirmar" || accion === "rechazar")) return "Esa decisión no es de este caso.";
    let nombre = "";
    if (esProp) {
      const V = await (await import("@/lib/vivienda-cola")).revisarMayores(c, q.business_id, q.subject_id, accion === "confirmar", m, s.id);
      if (!V.ok) return V.error;
      nombre = V.nombre;
      await auditar(c, { actor: s.id, action: accion === "confirmar" ? "inm.mayores.confirmar" : "inm.mayores.rechazar", targetKind: "business", targetId: q.business_id, city: q.city_id, before: { propiedad: V.nombre, mayores: "por revisar" }, after: { mayores: accion === "confirmar" ? "confirmada" : "no confirmada" }, reason: m });
    } else {
      if (accion === "advertir") await c.query(`insert into sanctions (target_kind, target_id, city_id, kind, reason, by_staff) values ('business', $1, $2, 'adv', $3, $4)`, [q.business_id, q.city_id, `Vivienda justa: ${m}`.slice(0, 500), s.id]);
      await cerrar(c, q, s, accion, m);
      await auditar(c, { actor: s.id, action: accion === "advertir" ? "vivienda.advertir" : "vivienda.revisado", targetKind: "business", targetId: q.business_id, city: q.city_id, before: { caso: "abierto" }, after: { caso: accion === "advertir" ? "advertencia al negocio" : "revisado, sin acción" }, reason: m });
    }
    return `ok|${q.business_id}|${nombre}`;
  });
  if (!r.startsWith("ok|")) return no(r);
  const [, biz, nombre] = r.split("|");
  const mm = m.endsWith(".") ? m : `${m}.`, A = await import("@/lib/avisos"), href = `/panel/${encodeURIComponent(biz!)}/vendes`;
  if (accion === "confirmar" || accion === "rechazar") await A.avisarNegocio(biz!, accion === "confirmar" ? "biz_mayores_ok" : "biz_mayores_no", { item: `«${nombre}»`, motivo: mm }, { href }).catch(() => undefined);
  if (accion === "advertir") await A.avisarNegocio(biz!, "biz_vivienda_aviso", { motivo: mm }, { href }).catch(() => undefined);
  listo();
  return { ok: true, mensaje: accion === "confirmar" ? "Confirmada: sale como vivienda para mayores. El dueño recibe el aviso." : accion === "rechazar" ? "No confirmada: la propiedad queda oculta con el motivo. El dueño recibe el aviso."
    : accion === "advertir" ? "Advertencia al negocio. Recibe el aviso." : "Caso cerrado como revisado." };
}
