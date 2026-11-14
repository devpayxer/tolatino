"use server";
/* 9l · Super Admin › Notificaciones › Plantillas de WhatsApp: mandarla a Meta y, en el sandbox, simular la respuesta de Meta. Permiso notif:editar; motivo
   y auditoría (lib/canales/plantillas-wa.ts lo vuelve a revisar). El mensaje vuelve en el idioma del admin. */
import { staff } from "@/lib/admin";
import { mandarAMeta, simularMeta } from "@/lib/canales/plantillas-wa";
import { idioma } from "@/lib/idioma";
import type { ResAdm } from "./acciones-colas";

async function quien(): Promise<{ s: NonNullable<Awaited<ReturnType<typeof staff>>>; es: boolean } | ResAdm> {
  const [s, l] = await Promise.all([staff(), idioma()]);
  if (!s || !s.puede("notif", "editar")) return { ok: false, mensaje: l === "en" ? "Your role does not manage templates." : "Tu rol no maneja plantillas." };
  return { s, es: l !== "en" };
}
export async function waMandar(id: string, motivo: string): Promise<ResAdm> {
  const p = await quien();
  if ("ok" in p) return p;
  const r = await mandarAMeta(p.s, String(id ?? ""), motivo);
  return { ok: r.ok, mensaje: p.es ? r.msg.es : r.msg.en } as ResAdm;
}
export async function waSimular(id: string, aprobar: boolean, motivo: string): Promise<ResAdm> {
  const p = await quien();
  if ("ok" in p) return p;
  const r = await simularMeta(p.s, String(id ?? ""), !!aprobar, motivo);
  return { ok: r.ok, mensaje: p.es ? r.msg.es : r.msg.en } as ResAdm;
}
