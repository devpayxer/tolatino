"use server";
/* 7a · Textos y páginas › Ayuda · acciones: pausar un artículo para el Centro de ayuda y El Compa, y volver a usarlo. Permiso cms:editar;
   motivo obligatorio; libro help_article_log (solo inserción) y auditoría en la misma transacción (lib/compa/ayuda-indice.ts).
   9e · Textos y páginas › Páginas · acciones (lib/legal.ts): marcar la revisión del abogado (cms:editar), publicar (cms:aprobar; con motivo y,
   para Términos y Privacidad, si pide aceptar otra vez; en producción solo revisada) y retirar (cms:aprobar). Libro legal_page_log (solo
   inserción) y auditoría en la misma transacción. */
import { staff } from "@/lib/admin";
import { pausarAyuda } from "@/lib/compa/ayuda-indice";
import { marcarRevisada, publicarLegal, retirarLegal } from "@/lib/legal";
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

export async function legalRevisada(id: string, despacho: string, fecha: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cms", "editar")) return { ok: false, mensaje: "Tu rol no marca la revisión de una página legal." };
  const r = await marcarRevisada(s, String(id ?? ""), String(despacho ?? ""), String(fecha ?? ""), String(motivo ?? ""));
  return r.ok ? { ok: true, mensaje: "Marcada como revisada por el abogado. Quedó en el historial." } : { ok: false, mensaje: r.msg };
}
export async function legalPublicar(id: string, motivo: string, forzar: boolean): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cms", "aprobar")) return { ok: false, mensaje: "Tu rol no publica páginas legales." };
  const r = await publicarLegal(s, String(id ?? ""), String(motivo ?? ""), forzar === true);
  return r.ok ? { ok: true, mensaje: forzar ? "Publicada. Quien entre después verá la hoja para aceptarla." : "Publicada. Quedó en el historial." } : { ok: false, mensaje: r.msg };
}
export async function legalRetirar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cms", "aprobar")) return { ok: false, mensaje: "Tu rol no retira páginas legales." };
  const r = await retirarLegal(s, String(id ?? ""), String(motivo ?? ""));
  return r.ok ? { ok: true, mensaje: "Retirada. Quedó en el historial." } : { ok: false, mensaje: r.msg };
}
