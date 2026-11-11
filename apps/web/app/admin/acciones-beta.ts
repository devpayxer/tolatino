"use server";
/* 8f · Super Admin › Sistema › Apps: Testers, Salud › Errores. Cada acción revisa el permiso AQUÍ (servidor): invitar, quitar, marcar en Play y
   mandar otro enlace del APK, solo un Admin con apps:editar; el estado de un grupo de errores (Visto, Resuelto en el build N, Silenciar,
   Reabrir), apps:editar. Todo con motivo y en la auditoría (lo escriben lib/beta.ts y lib/errores/admin.ts en la misma transacción). */
import { revalidatePath } from "next/cache";
import { staff } from "@/lib/admin";
import { enlace, invitar, marcarEnPlay, quitar } from "@/lib/beta";
import { cambiarEstadoGrupo } from "@/lib/errores/admin";
import type { ResAdm } from "./acciones-colas";

const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 300) : "");
const R = "/admin/sistema/apps";

export async function testerInvitar(telefono: string, app: string, canal: string, correo: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("apps", "editar")) return { ok: false, mensaje: "Solo un Admin invita testers." };
  const r = await invitar(s, { telefono: String(telefono ?? ""), app: String(app ?? ""), canal: String(canal ?? ""), correo: String(correo ?? ""), motivo: motivoOk(motivo) });
  revalidatePath(R);
  return { ok: r.ok, mensaje: r.msg };
}
export async function testerQuitar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("apps", "editar")) return { ok: false, mensaje: "Solo un Admin quita testers." };
  const r = await quitar(s, String(id ?? ""), motivoOk(motivo));
  revalidatePath(R);
  return { ok: r.ok, mensaje: r.msg };
}
export async function testerEnPlay(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("apps", "editar")) return { ok: false, mensaje: "Solo un Admin cambia los testers." };
  const m = motivoOk(motivo);
  if (m.length < 3) return { ok: false, mensaje: "Escribe el motivo." };
  const r = await marcarEnPlay(s, String(id ?? ""), m);
  revalidatePath(R);
  return { ok: r.ok, mensaje: r.msg };
}
export async function testerEnlace(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("apps", "editar")) return { ok: false, mensaje: "Solo un Admin manda enlaces del APK." };
  const m = motivoOk(motivo);
  if (m.length < 3) return { ok: false, mensaje: "Escribe el motivo." };
  const r = await enlace(s, String(id ?? ""), m);
  revalidatePath(R);
  return { ok: r.ok, mensaje: r.msg };
}
export async function errorEstado(id: string, accion: string, build: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("apps", "ver") || !s.puede("apps", "editar")) return { ok: false, mensaje: "Tu rol solo puede ver los errores." };
  const r = await cambiarEstadoGrupo(s, String(id ?? ""), String(accion ?? ""), String(build ?? ""), motivoOk(motivo));
  revalidatePath(R);
  return { ok: r.ok, mensaje: r.msg };
}

/* 8h · «Pedir un build»: lanza el flujo de las tiendas (workflow_dispatch) con el token del llavero. Solo un Admin con apps:editar; motivo y
   auditoría (lib/tiendas/tuberia.ts); tope tiendas_pedidos_hora. */
export async function buildPedir(app: string, plataforma: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("apps", "editar")) return { ok: false, mensaje: "Solo un Admin pide builds." };
  const r = await (await import("@/lib/tiendas/tuberia")).pedirBuild(s, { app: String(app ?? ""), plataforma: String(plataforma ?? ""), motivo: motivoOk(motivo) });
  revalidatePath(R);
  return { ok: r.ok, mensaje: r.msg };
}
