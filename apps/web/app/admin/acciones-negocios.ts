"use server";
/* Acciones del 360° de un negocio (ADM-NEG). Cada una: permiso de la matriz (neg:editar / neg:retirar; cerrar = rol
   Admin) y ciudad de la persona → cambio → auditoría con motivo (y antes → después), en una transacción. El dueño ve
   el resultado y el motivo en su panel; la página, lo que corresponde (triángulo panel ↔ página ↔ admin). */
import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { auditar, staff, type Staff } from "@/lib/admin";
import { normalizarTelefono } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import type { ResAdm } from "./acciones-colas";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
type B = { id: string; city_id: string; status: string; name: string; temp_closed_until: string | null };

async function entrar(id: unknown, accion: "editar" | "retirar", motivo: unknown, sinMotivo = false) {
  const s = await staff();
  if (!s || !s.puede("neg", accion)) return { error: "Tu rol no puede hacer esto." } as const;
  if (typeof id !== "string" || !ID.test(id)) return { error: "Ese negocio no existe." } as const;
  const m = motivoOk(motivo);
  if (!m && !sinMotivo) return { error: "Escribe el motivo." } as const;
  return { s, m } as const;
}
async function negocio(c: PoolClient, s: Staff, id: string): Promise<B | null> {
  return (await c.query<B>(
    `select id, city_id, status, name, temp_closed_until from businesses where id = $1 and (cardinality($2::text[]) = 0 or city_id = any($2::text[])) for update`, [id, s.cities])).rows[0] ?? null;
}
const listo = (id: string) => { revalidatePath(`/admin/negocios/${id}`); revalidatePath("/admin/negocios"); };
async function hacer(id: string, accion: "editar" | "retirar", motivo: unknown, fn: (c: PoolClient, s: Staff, b: B, m: string) => Promise<string | null>, ok: string, sinMotivo = false): Promise<ResAdm> {
  const e = await entrar(id, accion, motivo, sinMotivo);
  if ("error" in e) return no(e.error!);
  const r = await tx(async (c) => {
    const b = await negocio(c, e.s, id);
    if (!b) return "Ese negocio no existe.";
    return fn(c, e.s, b, e.m);
  });
  if (r) return no(r);
  listo(id);
  return { ok: true, mensaje: ok };
}
const LIC_EST: Record<string, string> = { review: "en revisión", valid: "verificada", expired: "vencida", not_found: "no se pudo verificar", revoked: "no se pudo verificar" };
const ESTADO_L: Record<string, string> = { active: "visible", hidden: "oculto", suspended: "suspendido", closed: "cerrado", temp_closed: "cerrado temporal", draft: "borrador" };

/* Ocultar · Suspender · Cerrar (neg:retirar; cerrar solo el rol Admin). Sale de búsquedas y de la categoría. */
export async function cambiarEstado(id: string, estado: "hidden" | "suspended" | "closed", motivo: string): Promise<ResAdm> {
  if (!["hidden", "suspended", "closed"].includes(estado)) return no("Ese estado no existe.");
  if (estado === "closed") { const s = await staff(); if (s?.role !== "admin") return no("Solo un Admin cierra negocios."); }
  return hacer(id, "retirar", motivo, async (c, s, b, m) => {
    if (b.status !== "active") return "El negocio ya no está activo. Restáuralo primero.";
    await c.query(`update businesses set status = $2, status_reason = $3, status_at = now(), status_by = $4, updated_at = now() where id = $1`, [b.id, estado, m, s.id]);
    await auditar(c, { actor: s.id, action: estado === "hidden" ? "negocio.ocultar" : estado === "suspended" ? "negocio.suspender" : "negocio.cerrar", targetKind: "business", targetId: b.id, city: b.city_id, before: { estado: "visible" }, after: { estado: ESTADO_L[estado] }, reason: m });
    return null;
  }, estado === "hidden" ? "Oculto. El dueño ve el motivo en su panel." : estado === "suspended" ? "Suspendido. El dueño ve el motivo en su panel." : "Cerrado. Se puede reabrir.");
}

export async function restaurar(id: string, motivo: string): Promise<ResAdm> {
  return hacer(id, "retirar", motivo, async (c, s, b, m) => {
    if (!["hidden", "suspended", "closed"].includes(b.status)) return "El negocio ya está activo.";
    await c.query(`update businesses set status = 'active', status_reason = null, status_at = now(), status_by = $2, updated_at = now() where id = $1`, [b.id, s.id]);
    await auditar(c, { actor: s.id, action: "negocio.restaurar", targetKind: "business", targetId: b.id, city: b.city_id, before: { estado: ESTADO_L[b.status] }, after: { estado: "visible" }, reason: m });
    return null;
  }, "Restaurado.");
}

/* Cierre temporal por To'Latino: 1, 3, 7 o 14 días. La ficha dice «Cerrado temporalmente»; vuelve sola. */
export async function cierreTemporal(id: string, dias: number, motivo: string): Promise<ResAdm> {
  if (![1, 3, 7, 14].includes(Number(dias))) return no("Elige por cuántos días.");
  return hacer(id, "editar", motivo, async (c, s, b, m) => {
    if (b.status !== "active") return "Solo se cierra temporalmente un negocio activo.";
    await c.query(`update businesses set temp_closed_until = now() + make_interval(days => $2), temp_closed_reason = $3, temp_closed_by = $4, updated_at = now() where id = $1`, [b.id, Number(dias), m, s.id]);
    await auditar(c, { actor: s.id, action: "negocio.cierre_temporal", targetKind: "business", targetId: b.id, city: b.city_id, before: { estado: "abierto" }, after: { estado: `cerrado temporal ${dias} d` }, reason: m });
    return null;
  }, "Cerrado temporalmente. El dueño ve el motivo en su panel.");
}
export async function reabrir(id: string, motivo: string): Promise<ResAdm> {
  return hacer(id, "editar", motivo, async (c, s, b, m) => {
    if (!b.temp_closed_until || new Date(b.temp_closed_until).getTime() <= Date.now()) return "No está cerrado temporalmente.";
    await c.query(`update businesses set temp_closed_until = null, temp_closed_reason = null, temp_closed_by = null, updated_at = now() where id = $1`, [b.id]);
    await auditar(c, { actor: s.id, action: "negocio.reabrir", targetKind: "business", targetId: b.id, city: b.city_id, before: { estado: "cerrado temporal" }, after: { estado: "abierto" }, reason: m });
    return null;
  }, "Reabierto.");
}

/* Sello desde el 360: dar (solo Pro sin sello) o quitar. */
export async function sello(id: string, dar: boolean, motivo: string): Promise<ResAdm> {
  return hacer(id, "editar", motivo, async (c, s, b, m) => {
    const st = (await c.query<{ plan: string; verified: boolean }>(`select plan, verified from business_stats_cache where business_id = $1`, [b.id])).rows[0];
    if (dar && (st?.plan !== "pro" || st.verified)) return "El sello se da a negocios Pro sin sello.";
    if (!dar && !st?.verified) return "Este negocio no tiene el sello.";
    await c.query(`insert into verification_requests (business_id, status, note, reviewed_by, decided_at, evidence) values ($1, $2, $3, $4, now(), '{"origen":"360"}'::jsonb)`, [b.id, dar ? "ok" : "revoked", m, s.id]);
    await c.query(`update queue_items set status = 'decided', decision = $2, reason = $3, decided_by = $4, decided_at = now() where business_id = $1 and queue = 'sello' and status = 'open'`, [b.id, dar ? "aprobar" : "no", m, s.id]);
    await c.query(`update verification_requests set status = 'canceled' where business_id = $1 and status in ('review', 'info') `, [b.id]);
    await c.query(`update business_stats_cache set verified = $2, updated_at = now() where business_id = $1`, [b.id, dar]);
    await auditar(c, { actor: s.id, action: dar ? "negocio.sello.dar" : "negocio.sello.quitar", targetKind: "business", targetId: b.id, city: b.city_id, before: { sello: dar ? "sin sello" : "verificado" }, after: { sello: dar ? "verificado" : "sin sello" }, reason: m });
    return null;
  }, dar ? "Sello otorgado." : "Sello retirado.");
}

/* Editar en nombre del negocio: nombre, Quiénes somos, teléfono, dirección. Queda la marca «EDITADO POR TO'LATINO»
   (el dueño la ve en su panel) hasta que el dueño vuelva a editar ese campo. */
const CAMPOS = { name: "Nombre", about: "Quiénes somos", phone: "Teléfono", address: "Dirección" } as const;
export async function editarCampo(id: string, campo: keyof typeof CAMPOS, valor: string, motivo: string): Promise<ResAdm> {
  if (!(campo in CAMPOS)) return no("Ese campo no se edita aquí.");
  const v = typeof valor === "string" ? valor.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim() : "";
  return hacer(id, "editar", motivo, async (c, s, b, m) => {
    let antes: unknown, despues: unknown;
    if (campo === "name") {
      if (v.length < 2 || v.length > 80) return "El nombre va de 2 a 80 letras.";
      antes = b.name; despues = v;
      await c.query(`update businesses set name = $2 where id = $1`, [b.id, v]);
    } else if (campo === "about") {
      if (v.length > 300) return "Máximo 300 letras.";
      const a = (await c.query<{ about: { es: string; en: string } | null }>(`select about from businesses where id = $1`, [b.id])).rows[0]?.about ?? null;
      antes = a?.es ?? ""; despues = v;
      await c.query(`update businesses set about = $2::jsonb where id = $1`, [b.id, v ? JSON.stringify({ es: v, en: a?.en ?? "" }) : null]);
    } else if (campo === "phone") {
      const t = normalizarTelefono(v);
      if (!t) return "Revisa el teléfono (10 dígitos).";
      antes = (await c.query<{ phone: string | null }>(`select phone from businesses where id = $1`, [b.id])).rows[0]?.phone; despues = t;
      await c.query(`update businesses set phone = $2 where id = $1`, [b.id, t]);
    } else {
      if (v.length < 5 || v.length > 160) return "Revisa la dirección.";
      antes = (await c.query<{ address: string | null }>(`select address from businesses where id = $1`, [b.id])).rows[0]?.address; despues = v;
      await c.query(`update businesses set address = $2 where id = $1`, [b.id, v]);
    }
    await c.query(`update businesses set admin_edits = admin_edits || jsonb_build_object($2::text, jsonb_build_object('at', now(), 'by', $3::text)), updated_at = now() where id = $1`, [b.id, campo, s.id]);
    await auditar(c, { actor: s.id, action: "negocio.editar", targetKind: "business", targetId: b.id, city: b.city_id, before: { [campo]: antes }, after: { [campo]: despues }, reason: m });
    return null;
  }, "Guardado. El dueño lo ve en su panel.");
}

/* Fotos: quitar (nunca la única visible) o restaurar una que quitó el equipo. */
export async function foto(id: string, mediaId: string, quitar: boolean, motivo: string): Promise<ResAdm> {
  if (typeof mediaId !== "string" || !UUID.test(mediaId)) return no("Esa foto no existe.");
  return hacer(id, "retirar", motivo, async (c, s, b, m) => {
    if (quitar) {
      const n = (await c.query<{ n: number }>(`select count(*)::int as n from media where owner_kind = 'business' and owner_id = $1 and status = 'visible'`, [b.id])).rows[0]!.n;
      if (n <= 1) return "Es la única foto visible: para quitarla, pide al dueño que suba otra.";
      const r = await c.query(`update media set status = 'removed', removed_reason = 'admin', removed_note = $3, removed_by = $4, removed_at = now() where id = $2::uuid and owner_kind = 'business' and owner_id = $1 and status = 'visible'`, [b.id, mediaId, m, s.id]);
      if (!r.rowCount) return "Esa foto no existe.";
    } else {
      const r = await c.query(`update media set status = 'visible', removed_reason = null, removed_note = null, removed_by = null, removed_at = null where id = $2::uuid and owner_kind = 'business' and owner_id = $1 and status = 'removed' and removed_reason = 'admin'`, [b.id, mediaId]);
      if (!r.rowCount) return "Esa foto no se puede restaurar.";
    }
    await c.query(`update business_stats_cache set photo_count = (select count(*) from media where owner_kind = 'business' and owner_id = $1 and status = 'visible'), updated_at = now() where business_id = $1`, [b.id]);
    await auditar(c, { actor: s.id, action: quitar ? "negocio.foto.quitar" : "negocio.foto.restaurar", targetKind: "business", targetId: b.id, city: b.city_id, before: { foto: quitar ? "visible" : "quitada", media: mediaId }, after: { foto: quitar ? "quitada" : "visible", media: mediaId }, reason: m });
    return null;
  }, quitar ? "Quitada. El dueño ve el motivo en su panel." : "La foto se ve otra vez.");
}

/* Staff: quitar de la página o volver a mostrar a una persona (sigue en el equipo del negocio). */
export async function staffPagina(id: string, memberId: string, quitar: boolean, motivo: string): Promise<ResAdm> {
  if (typeof memberId !== "string" || !UUID.test(memberId)) return no("Esa persona no existe.");
  return hacer(id, "retirar", motivo, async (c, s, b, m) => {
    const r = await c.query(
      `update business_members set hidden_by_admin = case when $3 then now() else null end, hidden_reason = case when $3 then $4 else null end, updated_at = now()
        where id = $2::uuid and business_id = $1 and status = 'active' and kind <> 'owner'`, [b.id, memberId, quitar, m]);
    if (!r.rowCount) return "Esa persona no está en el equipo.";
    await auditar(c, { actor: s.id, action: quitar ? "negocio.staff.quitar" : "negocio.staff.mostrar", targetKind: "business", targetId: b.id, city: b.city_id, before: { persona: memberId, sale: quitar }, after: { persona: memberId, sale: !quitar }, reason: m });
    return null;
  }, quitar ? "Quitada de la página. El dueño ve el motivo en su panel." : "Se ve otra vez en la ficha.");
}

/* Nota interna (solo el equipo; el negocio nunca la ve). */
export async function nota(id: string, texto: string): Promise<ResAdm> {
  return hacer(id, "editar", texto, async (c, s, b, m) => {
    await c.query(`insert into admin_notes (target_kind, target_id, city_id, text, by_staff) values ('business', $1, $2, $3, $4)`, [b.id, b.city_id, m, s.id]);
    await auditar(c, { actor: s.id, action: "negocio.nota", targetKind: "business", targetId: b.id, city: b.city_id, after: { nota: "nota interna" } });
    return null;
  }, "Nota guardada.");
}

/* Licencia desde el 360 › Lo que vende: la misma decisión que la cola Licencias (cierra su caso abierto). */
export async function licencia(id: string, licId: string, accion: "valid" | "not_found", motivo: string): Promise<ResAdm> {
  if (!/^\d{1,18}$/.test(String(licId)) || !["valid", "not_found"].includes(accion)) return no("Esa licencia no existe.");
  return hacer(id, "editar", motivo, async (c, s, b, m) => {
    const l = (await c.query<{ kind: string; status: string; titulo: string }>(
      `select l.kind, l.status, coalesce(nullif(l.title, '{}'::jsonb), k.title)->>'es' as titulo from licenses l join license_kinds k on k.key = l.kind where l.id = $1::bigint and l.business_id = $2 for update of l`, [licId, b.id])).rows[0];
    if (!l || l.status === "withdrawn") return "Esa licencia no existe.";
    await c.query(
      `update licenses set status = $2, status_reason = $3, checked_at = now(), checked_by = $4, updated_at = now(),
              verified_at = case when $2 = 'valid' then now() else verified_at end, verified_by = case when $2 = 'valid' then $4 else verified_by end,
              next_review = case when $2 = 'valid' then (now() + interval '3 months')::date else next_review end where id = $1::bigint`, [licId, accion, m, s.id]);
    await c.query(`select licencias_refrescar($1)`, [b.id]);
    await c.query(`update queue_items set status = 'decided', decision = $2, reason = $3, decided_by = $4, decided_at = now() where queue = 'lic' and subject_id = $1 and status = 'open'`, [String(licId), accion, m, s.id]);
    await auditar(c, { actor: s.id, action: accion === "valid" ? "licencia.verificar" : "licencia.no_aparece", targetKind: "business", targetId: b.id, city: b.city_id, before: { licencia: l.titulo, estado: LIC_EST[l.status] ?? "en revisión" }, after: { licencia: l.titulo, estado: accion === "valid" ? "verificada" : "no se pudo verificar" }, reason: m });
    return null;
  }, accion === "valid" ? "Licencia verificada." : "Listo. Quedó en la auditoría.");
}

/* Menú (Comida): ocultar o volver a mostrar un plato (neg:retirar). El dueño ve el motivo en su panel; el cliente
   deja de verlo en el menú. */
export async function platoOcultar(id: string, itemId: string, ocultar: boolean, motivo: string): Promise<ResAdm> {
  if (!/^\d{1,18}$/.test(String(itemId))) return no("Ese plato no existe.");
  return hacer(id, "retirar", motivo, async (c, s, b, m) => {
    const it = (await c.query<{ name: string; status: string }>(`select name->>'es' as name, status from items where id = $1::bigint and business_id = $2 and removed_at is null for update`, [itemId, b.id])).rows[0];
    if (!it) return "Ese plato ya no está en el menú.";
    if ((it.status === "hidden") === ocultar) return ocultar ? "Ya está oculto." : "Ya se ve en el menú.";
    await c.query(`update items set status = $3, hidden_reason = $4, hidden_by = $5, updated_at = now() where id = $1::bigint and business_id = $2`, [itemId, b.id, ocultar ? "hidden" : "live", ocultar ? m : null, ocultar ? s.id : null]);
    await auditar(c, { actor: s.id, action: ocultar ? "menu.plato.ocultar" : "menu.plato.mostrar", targetKind: "business", targetId: b.id, city: b.city_id, before: { plato: it.name, estado: ocultar ? "visible" : "oculto" }, after: { estado: ocultar ? "oculto" : "visible" }, reason: m });
    return null;
  }, ocultar ? "Plato oculto. El dueño ve el motivo en su panel." : "El plato se ve otra vez.");
}

/* Contenido · ocultar o restaurar una reseña con motivo (neg:retirar). Sale de la página y de las ★; el autor ve el motivo. */
export async function resenaOcultar(id: string, resena: string, ocultar: boolean, motivo: string): Promise<ResAdm> {
  if (!/^\d{1,18}$/.test(String(resena))) return no("Esa reseña no existe.");
  return hacer(id, "retirar", motivo, async (c, s, b, m) => {
    const r = (await c.query<{ status: string; quien: string }>(
      `select r.status, coalesce(u.first_name, 'Vecino') as quien from reviews r join users u on u.id = r.user_id where r.id = $1::bigint and r.business_id = $2 and r.status <> 'removed' for update of r`, [resena, b.id])).rows[0];
    if (!r) return "Esa reseña ya no está.";
    if ((r.status === "hidden") === ocultar) return ocultar ? "Ya está oculta." : "Ya se ve.";
    await c.query(`update reviews set status = $2, hidden_reason = $3, hidden_by = $4, hidden_at = $5 where id = $1::bigint`, [resena, ocultar ? "hidden" : "visible", ocultar ? m : null, ocultar ? s.id : null, ocultar ? new Date() : null]);
    await c.query(`select reviews_stats($1)`, [b.id]);
    await auditar(c, { actor: s.id, action: ocultar ? "resena.ocultar" : "resena.restaurar", targetKind: "review", targetId: resena, city: b.city_id, before: { resena: `de ${r.quien}`, estado: ocultar ? "visible" : "oculta" }, after: { estado: ocultar ? "oculta" : "visible", negocio: b.id }, reason: m });
    return null;
  }, ocultar ? "Reseña oculta. El autor ve el motivo." : "La reseña se ve otra vez.");
}

/* Contenido · ocultar o mostrar una novedad con motivo (neg:retirar). Sale de su página; el dueño ve el motivo en su panel. */
export async function novedadOcultar(id: string, post: string, ocultar: boolean, motivo: string): Promise<ResAdm> {
  if (!/^\d{1,18}$/.test(String(post))) return no("Esa novedad no existe.");
  return hacer(id, "retirar", motivo, async (c, s, b, m) => {
    const p = (await c.query<{ title: string; hidden: boolean }>(`select title, hidden_at is not null as hidden from business_posts where id = $1::bigint and business_id = $2 and status <> 'removed' for update`, [post, b.id])).rows[0];
    if (!p) return "Esa novedad ya no está.";
    if (p.hidden === ocultar) return ocultar ? "Ya está oculta." : "Ya se ve.";
    await c.query(`update business_posts set hidden_at = $3, hidden_reason = $4, hidden_by = $5, pinned = case when $3::timestamptz is null then pinned else false end, updated_at = now() where id = $1::bigint and business_id = $2`,
      [post, b.id, ocultar ? new Date() : null, ocultar ? m : null, ocultar ? s.id : null]);
    await auditar(c, { actor: s.id, action: ocultar ? "novedad.ocultar" : "novedad.mostrar", targetKind: "business", targetId: b.id, city: b.city_id, before: { novedad: p.title, estado: ocultar ? "visible" : "oculta" }, after: { estado: ocultar ? "oculta" : "visible" }, reason: m });
    return null;
  }, ocultar ? "Novedad oculta. El dueño ve el motivo en su panel." : "La novedad se ve otra vez.");
}

/* Contenido · ocultar o mostrar una vacante con motivo (neg:retirar). Sale de su página y nadie nuevo aplica; el dueño ve
   el motivo en su panel. Las solicitudes que ya tiene se quedan. */
export async function vacanteOcultar(id: string, job: string, ocultar: boolean, motivo: string): Promise<ResAdm> {
  if (!/^\d{1,18}$/.test(String(job))) return no("Esa vacante no existe.");
  return hacer(id, "retirar", motivo, async (c, s, b, m) => {
    const j = (await c.query<{ title: string; hidden: boolean }>(`select title->>'es' as title, hidden_at is not null as hidden from job_postings where id = $1::bigint and business_id = $2 and status <> 'removed' for update`, [job, b.id])).rows[0];
    if (!j) return "Esa vacante ya no está.";
    if (j.hidden === ocultar) return ocultar ? "Ya está oculta." : "Ya se ve.";
    await c.query(`update job_postings set hidden_at = $3, hidden_reason = $4, hidden_by = $5, updated_at = now() where id = $1::bigint and business_id = $2`,
      [job, b.id, ocultar ? new Date() : null, ocultar ? m : null, ocultar ? s.id : null]);
    await auditar(c, { actor: s.id, action: ocultar ? "vacante.ocultar" : "vacante.mostrar", targetKind: "business", targetId: b.id, city: b.city_id, before: { vacante: j.title, estado: ocultar ? "visible" : "oculta" }, after: { estado: ocultar ? "oculta" : "visible" }, reason: m });
    return null;
  }, ocultar ? "Vacante oculta. El dueño ve el motivo en su panel." : "La vacante se ve otra vez.");
}

/* Contenido · ocultar o mostrar un comentario de una novedad con motivo (neg:retirar). Sale de la novedad; queda en la auditoría. */
export async function comentarioOcultar(id: string, comentario: string, ocultar: boolean, motivo: string): Promise<ResAdm> {
  if (!/^\d{1,18}$/.test(String(comentario))) return no("Ese comentario no existe.");
  return hacer(id, "retirar", motivo, async (c, s, b, m) => {
    const x = (await c.query<{ status: string; body: string }>(
      `select c.status, c.body from post_comments c join business_posts p on p.id = c.post_id where c.id = $1::bigint and p.business_id = $2 and c.status <> 'removed' for update of c`, [comentario, b.id])).rows[0];
    if (!x) return "Ese comentario ya no está.";
    if ((x.status === "hidden") === ocultar) return ocultar ? "Ya está oculto." : "Ya se ve.";
    await c.query(`update post_comments set status = $2 where id = $1::bigint`, [comentario, ocultar ? "hidden" : "visible"]);
    await auditar(c, { actor: s.id, action: ocultar ? "comentario.ocultar" : "comentario.mostrar", targetKind: "business", targetId: b.id, city: b.city_id, before: { comentario: x.body.slice(0, 80), estado: ocultar ? "visible" : "oculto" }, after: { estado: ocultar ? "oculto" : "visible" }, reason: m });
    return null;
  }, ocultar ? "Comentario oculto." : "El comentario se ve otra vez.");
}

/* Pausar o reanudar un módulo (Menú, Pedidos en línea, Reservaciones) con motivo (neg:retirar). */
export async function moduloPausar(id: string, modulo: "menu" | "pedidos" | "delivery" | "rsv" | "nov" | "jobs", pausar: boolean, motivo: string): Promise<ResAdm> {
  if (!["menu", "pedidos", "delivery", "rsv", "nov", "jobs"].includes(modulo)) return no("Ese módulo no existe.");
  const nombre = modulo === "menu" ? "Menú" : modulo === "jobs" ? "Jobs" : modulo === "nov" ? "Novedades" : modulo === "rsv" ? "Reservaciones" : modulo === "delivery" ? "Delivery" : "Pedidos en línea";
  return hacer(id, "retirar", motivo, async (c, s, b, m) => {
    const cur = (await c.query<{ off: Record<string, unknown> }>(`select modules_off as off from businesses where id = $1`, [b.id])).rows[0]?.off ?? {};
    if (!!cur[modulo] === pausar) return pausar ? "Ya está pausado." : "No está pausado.";
    await c.query(pausar ? `update businesses set modules_off = modules_off || jsonb_build_object($2::text, jsonb_build_object('reason', $3::text, 'at', now(), 'by', $4::text)), updated_at = now() where id = $1`
      : `update businesses set modules_off = modules_off - $2::text, updated_at = now() where id = $1`, pausar ? [b.id, modulo, m, s.id] : [b.id, modulo]);
    await auditar(c, { actor: s.id, action: pausar ? "negocio.modulo.pausar" : "negocio.modulo.reanudar", targetKind: "business", targetId: b.id, city: b.city_id, before: { modulo: nombre, estado: pausar ? "activo" : "pausado" }, after: { estado: pausar ? "pausado" : "activo" }, reason: m });
    return null;
  }, pausar ? `${nombre} pausado. El dueño ve el motivo en su panel.` : `${nombre} reanudado.`);
}

