"use server";
/* 7a · Textos y páginas › Ayuda · acciones: pausar un artículo para el Centro de ayuda y El Compa, y volver a usarlo. Permiso cms:editar;
   motivo obligatorio; libro help_article_log (solo inserción) y auditoría en la misma transacción (lib/compa/ayuda-indice.ts). */
import { staff } from "@/lib/admin";
import { pausarAyuda } from "@/lib/compa/ayuda-indice";
import type { ResAdm } from "./acciones-colas";

export async function ayudaPausar(slug: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cms", "editar")) return { ok: false, mensaje: "Tu rol no pausa artículos de ayuda." };
  const r = await pausarAyuda(s, String(slug ?? ""), String(motivo ?? ""), true);
  return r.ok ? { ok: true, mensaje: "Pausado: ya no sale en el Centro de ayuda ni lo usará El Compa. Quedó en el historial." } : { ok: false, mensaje: r.msg };
}
export async function ayudaVolver(slug: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cms", "editar")) return { ok: false, mensaje: "Tu rol no cambia artículos de ayuda." };
  const r = await pausarAyuda(s, String(slug ?? ""), String(motivo ?? ""), false);
  return r.ok ? { ok: true, mensaje: "Otra vez en uso en el Centro de ayuda. Quedó en el historial." } : { ok: false, mensaje: r.msg };
}
