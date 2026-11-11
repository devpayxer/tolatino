"use server";
/* 8a · Super Admin › Sistema › Apps e Integraciones. Cada acción revisa el permiso AQUÍ (servidor): cambiar builds y pausar una app, solo un
   Admin con apps:editar; retirar o comprobar una llave, solo un Admin con integ:retirar / integ:ver. El motivo queda en la auditoría. */
import { revalidatePath } from "next/cache";
import { staff } from "@/lib/admin";
import { cambiarBuild, pausarApp } from "@/lib/app-nativa";
import { comprobar, retirar } from "@/lib/tiendas/llavero";
import type { ResAdm } from "./acciones-colas";

const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 300) : "");
const ID = /^\d{1,18}$/;

export async function appBuild(app: string, plat: string, tipo: string, valor: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("apps", "editar")) return { ok: false, mensaje: "Solo un Admin cambia las versiones de las apps." };
  const r = await cambiarBuild(s, String(app ?? ""), String(plat ?? ""), String(tipo ?? ""), String(valor ?? ""), motivoOk(motivo));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  revalidatePath("/admin/sistema/apps");
  return { ok: true, mensaje: r.msg };
}

export async function appPausa(app: string, abrir: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("apps", "editar")) return { ok: false, mensaje: "Solo un Admin pausa una app." };
  const r = await pausarApp(s, String(app ?? ""), !!abrir, motivoOk(motivo));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  revalidatePath("/admin/sistema/apps");
  return { ok: true, mensaje: r.msg };
}

export async function llaveRetirar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("integ", "retirar")) return { ok: false, mensaje: "Solo un Admin retira llaves." };
  const m = motivoOk(motivo);
  if (!ID.test(String(id ?? ""))) return { ok: false, mensaje: "Esa llave no existe." };
  if (m.length < 3) return { ok: false, mensaje: "Escribe el motivo." };
  const r = await retirar(String(id), s.id, m);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  revalidatePath("/admin/sistema/integraciones");
  return { ok: true, mensaje: r.msg };
}

export async function llaveComprobar(id: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("integ", "ver")) return { ok: false, mensaje: "Solo un Admin comprueba llaves." };
  if (!ID.test(String(id ?? ""))) return { ok: false, mensaje: "Esa llave no existe." };
  const r = await comprobar(String(id), s.id);
  revalidatePath("/admin/sistema/integraciones");
  return { ok: r.ok, mensaje: r.msg } as ResAdm;
}
