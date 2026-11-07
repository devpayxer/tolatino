"use server";
/* Super Admin › Contenido › Publicaciones (Comunidad, 5a): ocultar o restaurar con motivo (cont:retirar; el autor recibe el aviso con
   el motivo, sin SMS), fijar arriba de su ciudad hasta 7 días y bloquear o abrir los comentarios (cont:editar). Comentarios de vecinos
   (5b): ocultar o restaurar con motivo (cont:retirar), igual. Cada una: permiso y ciudad de quien actúa → cambio → auditoría con motivo
   y antes → después, en una transacción. Nada se borra. */
import { revalidatePath } from "next/cache";
import { auditar, staff } from "@/lib/admin";
import { avisar } from "@/lib/avisos";
import { tx } from "@/lib/db";
import type { ResAdm } from "./acciones-colas";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");
const TIPO: Record<string, string> = { pregunta: "pregunta", recomendacion: "recomendación", encuesta: "encuesta", publicacion: "publicación" };
type P = { city_id: string; status: string; kind: string; autor: string | null; body: string; fijada: boolean; cerrados: boolean };

async function hacer(id: unknown, accion: "retirar" | "editar", motivo: unknown, fn: (c: import("pg").PoolClient, s: NonNullable<Awaited<ReturnType<typeof staff>>>, p: P, m: string) => Promise<string | null>, ok: string) {
  const s = await staff();
  if (!s || !s.puede("cont", accion)) return { r: no("Tu rol no puede hacer esto.") };
  if (typeof id !== "string" || !/^\d{1,18}$/.test(id)) return { r: no("Esa publicación no existe.") };
  const m = motivoOk(motivo);
  if (!m) return { r: no("Escribe el motivo.") };
  const e = await tx(async (c) => {
    const p = (await c.query<P>(
      `select city_id, status, kind, author_user_id::text as autor, body, coalesce(pinned_until > now(), false) as fijada, comments_locked_at is not null as cerrados
         from com_posts where id = $1::bigint and status <> 'deleted' and (cardinality($2::text[]) = 0 or city_id = any($2::text[])) for update`, [id, s.cities])).rows[0];
    if (!p) return { err: "Esa publicación ya no está.", p: null };
    return { err: await fn(c, s, p, m), p };
  });
  if (e.err) return { r: no(e.err) };
  revalidatePath("/admin/contenido");
  return { r: { ok: true, mensaje: ok } as ResAdm, p: e.p, m };
}

/* Ocultar (sale del muro y de la publicación para todos menos su autor, que ve el motivo) o restaurar. */
export async function pubOcultar(id: string, ocultar: boolean, motivo: string): Promise<ResAdm> {
  const h = await hacer(id, "retirar", motivo, async (c, s, p, m) => {
    if ((p.status === "hidden") === ocultar) return ocultar ? "Ya está oculta." : "Ya se ve.";
    await c.query(
      `update com_posts set status = $2, hidden_by = $3, hidden_staff_id = $4, hidden_reason = $5, hidden_at = $6,
              pinned_until = case when $2 = 'hidden' then null else pinned_until end where id = $1::bigint`,
      [id, ocultar ? "hidden" : "visible", ocultar ? "admin" : null, ocultar ? s.id : null, ocultar ? m : null, ocultar ? new Date() : null]);
    await auditar(c, { actor: s.id, action: ocultar ? "com.publicacion.ocultar" : "com.publicacion.restaurar", targetKind: "com_post", targetId: id, city: p.city_id,
      before: { publicacion: `${TIPO[p.kind] ?? "publicación"}: ${p.body.slice(0, 80)}`, estado: ocultar ? "visible" : "oculta" }, after: { estado: ocultar ? "oculta" : "visible" }, reason: m });
    return null;
  }, ocultar ? "Publicación oculta. El autor ve el motivo." : "La publicación se ve otra vez.");
  if (h.r.ok && h.p?.autor) {
    await avisar(h.p.autor, ocultar ? "com_hide" : "com_restore", { motivo: String(h.m).slice(0, 140) }, { href: `/comunidad/p/${id}`, ref: ["com_post", id], sinSms: true }).catch(() => undefined);
  }
  return h.r;
}

/* Fijar arriba de su ciudad (7 días; una a la vez: la anterior se desfija) o desfijar. No cambia votos ni orden de las demás. */
export async function pubFijar(id: string, fijar: boolean, motivo: string): Promise<ResAdm> {
  return (await hacer(id, "editar", motivo, async (c, s, p, m) => {
    if (p.status !== "visible") return "Solo se fija una publicación que se ve.";
    if (p.fijada === fijar) return fijar ? "Ya está fijada." : "No está fijada.";
    if (fijar) await c.query(`update com_posts set pinned_until = null where city_id = $1 and pinned_until > now() and id <> $2::bigint`, [p.city_id, id]);
    await c.query(`update com_posts set pinned_until = $2 where id = $1::bigint`, [id, fijar ? new Date(Date.now() + 7 * 86_400_000) : null]);
    await auditar(c, { actor: s.id, action: fijar ? "com.publicacion.fijar" : "com.publicacion.desfijar", targetKind: "com_post", targetId: id, city: p.city_id,
      before: { publicacion: p.body.slice(0, 80), fijada: fijar ? "no" : "sí" }, after: { fijada: fijar ? "sí, 7 días" : "no" }, reason: m });
    return null;
  }, fijar ? "Fijada arriba de su ciudad por 7 días." : "Ya no está fijada.")).r;
}

/* Bloquear o abrir los comentarios (el hilo lo respeta desde 5b). */
export async function pubComentarios(id: string, bloquear: boolean, motivo: string): Promise<ResAdm> {
  return (await hacer(id, "editar", motivo, async (c, s, p, m) => {
    if (p.cerrados === bloquear) return bloquear ? "Los comentarios ya están bloqueados." : "Los comentarios ya están abiertos.";
    await c.query(`update com_posts set comments_locked_at = $2 where id = $1::bigint`, [id, bloquear ? new Date() : null]);
    await auditar(c, { actor: s.id, action: bloquear ? "com.publicacion.comentarios_bloquear" : "com.publicacion.comentarios_abrir", targetKind: "com_post", targetId: id, city: p.city_id,
      before: { publicacion: p.body.slice(0, 80), comentarios: bloquear ? "abiertos" : "bloqueados" }, after: { comentarios: bloquear ? "bloqueados" : "abiertos" }, reason: m });
    return null;
  }, bloquear ? "Comentarios bloqueados." : "Comentarios abiertos otra vez.")).r;
}

/* Comentarios de vecinos (5b): ocultar (sale del hilo para todos; si tiene respuestas queda «Comentario oculto por las reglas») o restaurar. */
export async function cmComOcultar(id: string, ocultar: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cont", "retirar")) return no("Tu rol no puede hacer esto.");
  if (typeof id !== "string" || !/^\d{1,18}$/.test(id)) return no("Ese comentario no existe.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const e = await tx(async (c) => {
    const x = (await c.query<{ city_id: string; status: string; autor: string; body: string; post: string }>(
      `select city_id, status, author_user_id::text as autor, body, post_id::text as post from com_comments
        where id = $1::bigint and status <> 'deleted' and (cardinality($2::text[]) = 0 or city_id = any($2::text[])) for update`, [id, s.cities])).rows[0];
    if (!x) return { err: "Ese comentario ya no está." };
    if ((x.status === "hidden") === ocultar) return { err: ocultar ? "Ya está oculto." : "Ya se ve." };
    await c.query(`update com_comments set status = $2, hidden_by = $3, hidden_staff_id = $4, hidden_reason = $5, hidden_at = $6 where id = $1::bigint`,
      [id, ocultar ? "hidden" : "visible", ocultar ? "admin" : null, ocultar ? s.id : null, ocultar ? m : null, ocultar ? new Date() : null]);
    await auditar(c, { actor: s.id, action: ocultar ? "com.comentario.ocultar" : "com.comentario.restaurar", targetKind: "com_comment", targetId: id, city: x.city_id,
      before: { comentario: x.body.slice(0, 80), estado: ocultar ? "visible" : "oculto" }, after: { estado: ocultar ? "oculto" : "visible" }, reason: m });
    return { err: null, x };
  });
  if (e.err || !e.x) return no(e.err ?? "Ese comentario ya no está.");
  revalidatePath("/admin/contenido");
  await avisar(e.x.autor, ocultar ? "com_cm_hide" : "com_cm_restore", { motivo: m.slice(0, 140) }, { href: `/comunidad/p/${e.x.post}`, ref: ["com_comment", id], sinSms: true }).catch(() => undefined);
  return { ok: true, mensaje: ocultar ? "Comentario oculto. El autor ve el motivo." : "El comentario se ve otra vez." };
}
