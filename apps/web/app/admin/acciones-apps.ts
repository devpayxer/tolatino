"use server";
/* 8a · Super Admin › Sistema › Apps e Integraciones. Cada acción revisa el permiso AQUÍ (servidor): cambiar builds y pausar una app, solo un
   Admin con apps:editar; retirar o comprobar una llave, solo un Admin con integ:retirar / integ:ver. El motivo queda en la auditoría. */
import { revalidatePath } from "next/cache";
import { staff } from "@/lib/admin";
import { cambiarBuild, pausarApp } from "@/lib/app-nativa";
import { comprobar, retirar } from "@/lib/tiendas/llavero";
import { cambiarConfig } from "@/lib/config";
import { cambiarCanal, pushPrueba } from "@/lib/push/admin";
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

/* 8c · Sistema › Integraciones › Push. Encender o apagar un canal y cambiar sus límites: solo un Admin con integ:editar, con motivo y auditoría
   (cambiarConfig revisa la clave, que se cambie en esta pantalla, el entero y los límites, y deja el antes → después). La prueba: integ:ver. */
const CLAVES_PUSH = ["push_ttl_h", "push_reintentos", "push_lote", "push_por_minuto", "push_inactivo_dias"] as const;
export async function pushCanal(canal: string, encender: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("integ", "editar")) return { ok: false, mensaje: "Solo un Admin enciende o apaga un canal de push." };
  const r = await cambiarCanal(s, String(canal ?? ""), !!encender, motivoOk(motivo));
  revalidatePath("/admin/sistema/integraciones");
  return { ok: r.ok, mensaje: r.msg };
}
export async function pushConfig(clave: string, valor: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("integ", "editar")) return { ok: false, mensaje: "Solo un Admin cambia los límites del push." };
  if (!(CLAVES_PUSH as readonly string[]).includes(String(clave))) return { ok: false, mensaje: "Ese valor no es del push." };
  const m = motivoOk(motivo);
  if (m.length < 3) return { ok: false, mensaje: "Escribe el motivo." };
  const r = await cambiarConfig(s.id, String(clave), String(valor ?? ""), m, { desde: "/admin/sistema/integraciones" });
  if (!r.ok) return { ok: false, mensaje: r.msg };
  revalidatePath("/admin/sistema/integraciones");
  return { ok: true, mensaje: `Guardado: ${r.antes} → ${r.v}.` };
}
export async function pushProbar(): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("integ", "ver")) return { ok: false, mensaje: "Tu rol no puede." };
  const r = await pushPrueba(s);
  return { ok: r.ok, mensaje: r.msg };
}

/* 8i · Fichas de las tiendas, cuentas de revisión y «Lo que te toca»: solo un Admin con apps:editar; motivo y auditoría en el servidor. */
export async function fichasSubir(app: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("apps", "editar")) return { ok: false, mensaje: "Solo un Admin sube las fichas." };
  const r = await (await import("@/lib/tiendas/fichas")).subirFichas(s, { app: String(app ?? ""), motivo: motivoOk(motivo) });
  revalidatePath("/admin/sistema/apps");
  const det = r.detalle.map((d) => `${d.tienda === "apple" ? "Apple" : "Google"} ${d.app}: ${d.estado === "borrador" ? "borrador" : d.estado === "sin_llave" ? "sin llave" : d.estado === "sin_version" ? "sin versión" : "error"}`).join(" · ");
  return { ok: r.ok, mensaje: det ? `${r.msg} ${det}`.slice(0, 400) : r.msg };
}
export async function revisionCuenta(id: string, activar: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("apps", "editar")) return { ok: false, mensaje: "Solo un Admin cambia las cuentas de revisión." };
  const r = await (await import("@/lib/tiendas/fichas")).cambiarCuentaRevision(s, String(id ?? ""), !!activar, motivoOk(motivo));
  revalidatePath("/admin/sistema/apps");
  return { ok: r.ok, mensaje: r.msg };
}
export async function revisionInterruptor(encender: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("apps", "editar")) return { ok: false, mensaje: "Solo un Admin enciende o apaga las cuentas de revisión." };
  const r = await (await import("@/lib/tiendas/fichas")).cambiarInterruptorRevision(s, !!encender, motivoOk(motivo));
  revalidatePath("/admin/sistema/apps");
  return { ok: r.ok, mensaje: r.msg };
}
export async function pasoMarcar(k: string, hecho: boolean, nota: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("apps", "editar")) return { ok: false, mensaje: "Solo un Admin marca los pasos." };
  if (!/^8-[0-3]\.[0-9]{1,2}$/.test(String(k ?? ""))) return { ok: false, mensaje: "Ese paso no existe." };
  const r = await (await import("@/lib/tiendas/paquete")).marcarPaso(s, String(k), !!hecho, motivoOk(nota));
  revalidatePath("/admin/sistema/apps");
  return { ok: r.ok, mensaje: r.msg };
}
