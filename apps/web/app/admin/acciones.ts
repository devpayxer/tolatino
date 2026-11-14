"use server";
/* Acciones del Super Admin. Cada una: permiso en el servidor → cambio → auditoría con motivo, en una transacción.
   Las server actions de Next ya rechazan peticiones de otro origen. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { arrancar, auditar, requerir, type Accion } from "@/lib/admin";
import { normalizarTelefono } from "@/lib/cuenta";
import { tx } from "@/lib/db";

export type Resultado = { ok: boolean; mensaje?: string };
const motivoOk = (m: unknown) => (typeof m === "string" ? m.trim().slice(0, 500) : "");

export async function accionArranque(_: Resultado | null, f: FormData): Promise<Resultado> {
  const ok = await arrancar(String(f.get("codigo") ?? ""));
  if (!ok) return { ok: false, mensaje: "Ese código no sirve, o ya hay un Admin." };
  redirect("/admin");
}

export async function cambiarPermiso(_: Resultado | null, f: FormData): Promise<Resultado> {
  const s = await requerir("sys", "editar");
  const role = String(f.get("rol")), section = String(f.get("seccion")), action = String(f.get("accion")) as Accion;
  const motivo = motivoOk(f.get("motivo"));
  if (!motivo) return { ok: false, mensaje: "Escribe el motivo." };
  if (role === "admin" && section === "sys") return { ok: false, mensaje: "El Admin no puede perder Sistema: te quedarías sin poder deshacerlo." };
  await tx(async (c) => {
    const r = await c.query<{ allowed: boolean }>(
      `update role_permissions set allowed = not allowed, updated_at = now(), updated_by = $4
        where role = $1 and section = $2 and action = $3 returning allowed`,
      [role, section, action, s.id],
    );
    if (!r.rows[0]) throw new Error("permiso no encontrado");
    await auditar(c, { actor: s.id, action: "equipo.permiso", targetKind: "role_permission", targetId: `${role}/${section}/${action}`, before: { allowed: !r.rows[0].allowed }, after: { allowed: r.rows[0].allowed }, reason: motivo });
  });
  revalidatePath("/admin/permisos");
  return { ok: true };
}

export async function agregarMiembro(_: Resultado | null, f: FormData): Promise<Resultado> {
  const s = await requerir("sys", "editar");
  const tel = normalizarTelefono(String(f.get("telefono") ?? "")), role = String(f.get("rol") ?? ""), motivo = motivoOk(f.get("motivo"));
  if (!tel) return { ok: false, mensaje: "Revisa el teléfono (10 dígitos)." };
  if (!motivo) return { ok: false, mensaje: "Escribe el motivo." };
  const res = await tx(async (c) => {
    const u = await c.query<{ id: string; first_name: string | null }>("select id, first_name from users where phone = $1", [tel]);
    if (!u.rows[0]) return "La persona tiene que crear su cuenta primero (entrar con su teléfono).";
    const ok = await c.query("select 1 from staff_roles where key = $1", [role]);
    if (!ok.rowCount) return "Rol no válido.";
    const antes = await c.query<{ role: string; status: string }>("select role, status from staff_members where user_id = $1", [u.rows[0].id]);
    await c.query(
      `insert into staff_members (user_id, role, added_by) values ($1, $2, $3)
       on conflict (user_id) do update set role = excluded.role, status = 'active', updated_at = now()`,
      [u.rows[0].id, role, s.id],
    );
    await auditar(c, { actor: s.id, action: "equipo.miembro", targetKind: "staff", targetId: u.rows[0].id, before: antes.rows[0] ?? null, after: { role, status: "active" }, reason: motivo });
    return null;
  });
  if (res) return { ok: false, mensaje: res };
  revalidatePath("/admin/equipo");
  return { ok: true, mensaje: "Listo: ya es parte del equipo." };
}

/* 9j · Restablecer los dos pasos de OTRA persona del equipo (perdió el teléfono y los códigos de recuperación): su app de códigos queda revocada y sus
   sesiones vuelven a pedir el segundo factor. Solo sys:editar, nunca a uno mismo, con motivo, auditoría y aviso. */
export async function restablecerDosPasos(_: Resultado | null, f: FormData): Promise<Resultado> {
  const s = await requerir("sys", "editar");
  const id = String(f.get("usuario") ?? ""), motivo = motivoOk(f.get("motivo"));
  if (!motivo || motivo.length < 3) return { ok: false, mensaje: "Escribe el motivo." };
  if (id === s.id) return { ok: false, mensaje: "Tus propios dos pasos los restablece otra persona del equipo." };
  const { restablecerEn, avisarRestablecido } = await import("@/lib/equipo/dos-pasos");
  const hecho = await tx(async (c) => {
    if (!(await c.query("select 1 from staff_members where user_id = $1 and status = 'active'", [id])).rowCount) return false;
    const ok = await restablecerEn(c, s.id, id, motivo);
    if (ok) await auditar(c, { actor: s.id, action: "equipo.dos_pasos.restablecer", targetKind: "staff", targetId: id, before: { segundo_factor: "app de códigos" }, after: { segundo_factor: "por dar de alta" }, reason: motivo });
    return ok;
  });
  if (!hecho) return { ok: false, mensaje: "No tenía nada que restablecer." };
  await avisarRestablecido(id);
  revalidatePath("/admin/sistema");
  return { ok: true, mensaje: "Listo: da de alta su app de códigos otra vez al entrar." };
}

export async function quitarMiembro(_: Resultado | null, f: FormData): Promise<Resultado> {
  const s = await requerir("sys", "editar");
  const id = String(f.get("usuario") ?? ""), motivo = motivoOk(f.get("motivo"));
  if (!motivo) return { ok: false, mensaje: "Escribe el motivo." };
  if (id === s.id) return { ok: false, mensaje: "No puedes quitarte a ti mismo." };
  await tx(async (c) => {
    const r = await c.query<{ role: string }>("update staff_members set status = 'removed', updated_at = now() where user_id = $1 and status <> 'removed' returning role", [id]);
    if (r.rows[0]) await auditar(c, { actor: s.id, action: "equipo.quitar", targetKind: "staff", targetId: id, before: { role: r.rows[0].role, status: "active" }, after: { status: "removed" }, reason: motivo });
  });
  revalidatePath("/admin/equipo");
  return { ok: true };
}
