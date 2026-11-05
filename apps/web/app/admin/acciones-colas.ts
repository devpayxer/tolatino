"use server";
/* Decisiones de las colas (ADM-COLAS). Cada una: permiso (colas:aprobar), la cola es de su rol y de su ciudad, el
   caso sigue abierto → cambio en la fuente + caso decidido + auditoría con motivo, en una transacción. */
import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { auditar, staff, type Staff } from "@/lib/admin";
import { colasVisibles } from "@/lib/admin-colas";
import type { Cola } from "@/lib/colas";
import { tx } from "@/lib/db";

export type ResAdm = { ok: true; mensaje?: string; caso?: string } | { ok: false; mensaje: string };
const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");
type Fila = { id: string; queue: Cola; subject_id: string; business_id: string | null; city_id: string; status: string; assigned_to: string | null; assignee: string | null };

async function abrir(c: PoolClient, s: Staff, id: string): Promise<Fila | string> {
  if (!/^\d{1,18}$/.test(String(id))) return "Ese caso no existe.";
  const q = (await c.query<Fila>(
    `select q.id::text, q.queue, q.subject_id, q.business_id, q.city_id, q.status, q.assigned_to, u.first_name as assignee
       from queue_items q left join users u on u.id = q.assigned_to where q.id = $1 for update of q`, [id])).rows[0];
  if (!q || !colasVisibles(s).includes(q.queue) || (s.cities.length && !s.cities.includes(q.city_id))) return "Ese caso no existe.";
  if (q.status !== "open") return "Este caso ya se decidió.";
  return q;
}
async function quien(): Promise<Staff | null> {
  const s = await staff();
  return s && s.puede("colas", "aprobar") ? s : null;
}
const cerrar = (c: PoolClient, q: Fila, s: Staff, decision: string, motivo: string) =>
  c.query(`update queue_items set status = 'decided', decision = $2, reason = $3, decided_by = $4, decided_at = now() where id = $1`, [q.id, decision, motivo, s.id]);
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
