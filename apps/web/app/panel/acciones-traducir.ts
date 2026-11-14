"use server";
import { mismoOrigen } from "@/lib/cuenta";
import { accesoPanel } from "@/lib/panel";
import { SinTraductor, traducirTexto } from "@/lib/traductor";
import type { Res } from "./acciones";

/* 9n-2 · «Traducir con El Compa» en los editores del panel (vacantes y Menú; L319): el traductor propio (5h) pasa el texto en español a inglés y la persona lo
   revisa antes de guardar; nada se guarda aquí. Pide acceso a «Lo que vendes» (cat) o «Tu página» (page); hasta 6 textos de 400 letras por vez. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
export async function panelTraducir(negocio: string, textos: string[]): Promise<Res & { en?: string[] }> {
  if (!(await mismoOrigen()) || typeof negocio !== "string") return no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
  const a = (await accesoPanel(negocio, "cat")) ?? (await accesoPanel(negocio, "page"));
  if (!a) return no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
  const L = (Array.isArray(textos) ? textos : []).slice(0, 6).map((t) => String(t ?? "").slice(0, 400));
  try {
    const en: string[] = [];
    for (const t of L) en.push(t.trim() ? (await traducirTexto(t, "es", "en")).texto : "");
    return { ok: true, en };
  } catch (e) {
    if (e instanceof SinTraductor) return no("La traducción no está disponible ahora. Escríbelo tú.", "Translation is not available right now. Type it yourself.");
    throw e;
  }
}
