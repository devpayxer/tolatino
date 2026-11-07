"use server";
/* Super Admin › Contenido › Hoy en el barrio y Cuenta oficial (5e).
   - «Retirar de Hoy» (cont:retirar): la novedad sale de Hoy en el barrio y se queda en la página del negocio; motivo obligatorio, auditoría
     con antes → después y aviso al negocio con el motivo (sin SMS). «Devolver a Hoy» lo deshace (si todavía está en sus 24 h).
   - Cuenta oficial (roles Admin y Ciudad manager con cont:editar, en sus ciudades): escribir, programar y fijar (lib/oficial.ts).
   El servidor decide todo; nada se borra. */
import { revalidatePath } from "next/cache";
import { auditar, staff } from "@/lib/admin";
import { avisarNegocio } from "@/lib/avisos";
import { tx } from "@/lib/db";
import { fijarOficial, publicarOficial, type EntradaOficial } from "@/lib/oficial";
import type { ResAdm } from "./acciones-colas";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");

export async function hoyRetirar(id: string, retirar: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cont", "retirar")) return no("Tu rol no puede hacer esto.");
  if (typeof id !== "string" || !/^\d{1,18}$/.test(id)) return no("Esa novedad no existe.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const e = await tx(async (c) => {
    const p = (await c.query<{ biz: string; title: string; city_id: string; off: boolean; reciente: boolean }>(
      `select business_id as biz, title, city_id, hoy_off_at is not null as off, publish_at > now() - interval '24 hours' as reciente from business_posts
        where id = $1::bigint and status <> 'removed' and (cardinality($2::text[]) = 0 or city_id = any($2::text[])) for update`, [id, s.cities])).rows[0];
    if (!p) return { err: "Esa novedad ya no está." };
    if (p.off === retirar) return { err: retirar ? "Ya está fuera de Hoy." : "Ya sale en Hoy." };
    if (!retirar && !p.reciente) return { err: "Ya pasaron sus 24 horas: no vuelve a Hoy." };
    await c.query(`update business_posts set hoy_off_at = $2, hoy_off_by = $3, hoy_off_reason = $4, updated_at = now() where id = $1::bigint`,
      [id, retirar ? new Date() : null, retirar ? s.id : null, retirar ? m : null]);
    await auditar(c, { actor: s.id, action: retirar ? "hoy.retirar" : "hoy.devolver", targetKind: "business", targetId: p.biz, city: p.city_id,
      before: { novedad: p.title, hoy: retirar ? "sale en Hoy" : "fuera de Hoy" }, after: { hoy: retirar ? "fuera de Hoy" : "sale en Hoy" }, reason: m });
    return { err: null, p };
  });
  if (e.err || !e.p) return no(e.err ?? "Esa novedad ya no está.");
  if (retirar) await avisarNegocio(e.p.biz, "hoy_retirada", { titulo: e.p.title.slice(0, 60), motivo: m.slice(0, 140) }, { href: `/panel/${e.p.biz}/pagina/nov`, ref: ["business_post", id] }).catch(() => undefined);
  revalidatePath("/admin/contenido");
  return { ok: true, mensaje: retirar ? "Fuera de Hoy en el barrio. El negocio recibió el motivo; sigue en su página." : "Sale otra vez en Hoy en el barrio." };
}

export async function oficialPublicar(ciudad: string, p: EntradaOficial): Promise<ResAdm> {
  const s = await staff();
  if (!s) return no("Tu rol no puede hacer esto.");
  const r = await publicarOficial(s, String(ciudad ?? ""), p ?? { kind: "", body: "" });
  if (r.ok) revalidatePath("/admin/contenido");
  return { ok: r.ok, mensaje: r.mensaje };
}

export async function oficialFijar(id: string, dias: number, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s) return no("Tu rol no puede hacer esto.");
  const r = await fijarOficial(s, String(id ?? ""), Number(dias), String(motivo ?? ""));
  if (r.ok) revalidatePath("/admin/contenido");
  return { ok: r.ok, mensaje: r.mensaje };
}
