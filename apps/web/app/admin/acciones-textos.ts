"use server";
/* 7a · Textos y páginas › Ayuda · acciones: pausar un artículo para el Centro de ayuda y El Compa, y volver a usarlo. Permiso cms:editar;
   motivo obligatorio; libro help_article_log (solo inserción) y auditoría en la misma transacción (lib/compa/ayuda-indice.ts).
   9e · Textos y páginas › Páginas · acciones (lib/legal.ts): marcar la revisión del abogado (cms:editar), publicar (cms:aprobar; con motivo y,
   para Términos y Privacidad, si pide aceptar otra vez; en producción solo revisada) y retirar (cms:aprobar). Libro legal_page_log (solo
   inserción) y auditoría en la misma transacción.
   9f · Cadenas, Rótulos, Home por ciudad y Anuncios (lib/cms-admin.ts); el idioma del admin (cookie tl_lang). Los avisos de estas acciones salen en el
   idioma de quien las usa. */
import { cookies } from "next/headers";
import { staff } from "@/lib/admin";
import { pausarAyuda } from "@/lib/compa/ayuda-indice";
import { crearAnuncio, editarCadena, editarRotulo, guardarHome, ponerEstado, retirarAnuncio, revisarIngles, volverAlCodigo, type Res } from "@/lib/cms-admin";
import { idioma } from "@/lib/idioma";
import { marcarRevisada, publicarLegal, retirarLegal } from "@/lib/legal";
import type { ResAdm } from "./acciones-colas";

const bi = async (es: string, en: string) => ((await idioma()) === "en" ? en : es);
const no = async (es: string, en: string): Promise<ResAdm> => ({ ok: false, mensaje: await bi(es, en) });
const si = async (es: string, en: string): Promise<ResAdm> => ({ ok: true, mensaje: await bi(es, en) });
const sal = async (r: Res): Promise<ResAdm> => { const l = await idioma(); return r.ok ? { ok: true, mensaje: r.msg[l] } : { ok: false, mensaje: r.msg[l] }; };

/* El idioma de quien usa el admin: la misma cookie que el botón ES/EN de la web. */
export async function idiomaAdmin(l: string): Promise<void> {
  if (!(await staff())) return;
  (await cookies()).set("tl_lang", l === "en" ? "en" : "es", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: false });
}

export async function ayudaPausar(slug: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cms", "editar")) return no("Tu rol no pausa artículos de ayuda.", "Your role cannot pause help articles.");
  const r = await pausarAyuda(s, String(slug ?? ""), String(motivo ?? ""), true);
  return r.ok ? si("Pausado: ya no sale en el Centro de ayuda ni lo usará El Compa. Quedó en el historial.", "Paused: it no longer shows in the Help Center and El Compa will not use it. It is in the history.") : { ok: false, mensaje: r.msg };
}
export async function ayudaVolver(slug: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cms", "editar")) return no("Tu rol no cambia artículos de ayuda.", "Your role cannot change help articles.");
  const r = await pausarAyuda(s, String(slug ?? ""), String(motivo ?? ""), false);
  return r.ok ? si("Otra vez en uso en el Centro de ayuda. Quedó en el historial.", "Back in use in the Help Center. It is in the history.") : { ok: false, mensaje: r.msg };
}

export async function legalRevisada(id: string, despacho: string, fecha: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cms", "editar")) return no("Tu rol no marca la revisión de una página legal.", "Your role cannot mark a legal page as reviewed.");
  const r = await marcarRevisada(s, String(id ?? ""), String(despacho ?? ""), String(fecha ?? ""), String(motivo ?? ""));
  return r.ok ? si("Marcada como revisada por el abogado. Quedó en el historial.", "Marked as reviewed by the lawyer. It is in the history.") : { ok: false, mensaje: r.msg };
}
export async function legalPublicar(id: string, motivo: string, forzar: boolean): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cms", "aprobar")) return no("Tu rol no publica páginas legales.", "Your role cannot publish legal pages.");
  const r = await publicarLegal(s, String(id ?? ""), String(motivo ?? ""), forzar === true);
  return r.ok ? (forzar ? si("Publicada. Quien entre después verá la hoja para aceptarla.", "Published. Anyone who comes in next sees the sheet to accept it.") : si("Publicada. Quedó en el historial.", "Published. It is in the history.")) : { ok: false, mensaje: r.msg };
}
export async function legalRetirar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cms", "aprobar")) return no("Tu rol no retira páginas legales.", "Your role cannot retire legal pages.");
  const r = await retirarLegal(s, String(id ?? ""), String(motivo ?? ""));
  return r.ok ? si("Retirada. Quedó en el historial.", "Retired. It is in the history.") : { ok: false, mensaje: r.msg };
}

// 9f · Cadenas
export async function cadenaEditar(id: string, es: string, en: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return no("Sin sesión del equipo.", "No team session.");
  return sal(await editarCadena(s, String(id ?? ""), String(es ?? ""), String(en ?? ""), String(motivo ?? "")));
}
export async function cadenaVolver(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return no("Sin sesión del equipo.", "No team session.");
  return sal(await volverAlCodigo(s, String(id ?? ""), String(motivo ?? "")));
}
export async function cadenaEstado(id: string, vivo: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return no("Sin sesión del equipo.", "No team session.");
  return sal(await ponerEstado(s, String(id ?? ""), vivo === true, String(motivo ?? "")));
}
export async function cadenaIngles(id: string, revisado: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return no("Sin sesión del equipo.", "No team session.");
  return sal(await revisarIngles(s, String(id ?? ""), revisado === true ? "revisado" : "pendiente", String(motivo ?? "")));
}
// 9f · Rótulos por categoría
export async function rotuloEditar(cat: string, campo: string, es: string, en: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return no("Sin sesión del equipo.", "No team session.");
  return sal(await editarRotulo(s, String(cat ?? ""), String(es ?? ""), String(en ?? ""), campo === "name" ? "name" : "short", String(motivo ?? "")));
}
// 9f · Home por ciudad y anuncios
export async function homeGuardar(ciudad: string, avisoEs: string, avisoEn: string, bloques: { key: string; on: boolean }[], motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return no("Sin sesión del equipo.", "No team session.");
  const hay = String(avisoEs ?? "").trim() || String(avisoEn ?? "").trim();
  return sal(await guardarHome(s, String(ciudad ?? ""), hay ? { es: String(avisoEs ?? ""), en: String(avisoEn ?? "") } : null, Array.isArray(bloques) ? bloques.map((b) => ({ key: String(b?.key), on: b?.on === true })) : [], String(motivo ?? "")));
}
export async function anuncioCrear(ciudad: string, audiencia: string, es: string, en: string, desde: string, hasta: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return no("Sin sesión del equipo.", "No team session.");
  return sal(await crearAnuncio(s, String(ciudad ?? ""), String(audiencia ?? ""), String(es ?? ""), String(en ?? ""), String(desde ?? ""), String(hasta ?? ""), String(motivo ?? "")));
}
export async function anuncioRetirar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return no("Sin sesión del equipo.", "No team session.");
  return sal(await retirarAnuncio(s, String(id ?? ""), String(motivo ?? "")));
}
