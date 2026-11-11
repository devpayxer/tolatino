"use client";
/* 8e · Compartir (fase8-apps.md §3.6: «compartir y háptica» en To'Latino). En la app: la hoja nativa del sistema (@capacitor/share; el WebView de
   Android no tiene navigator.share). En la web: navigator.share si el navegador lo tiene; si no, copia el enlace. Ningún otro archivo llama a
   navigator.share (guardián compartirPorElPuente). Devuelve lo que pasó para que la pantalla diga «Enlace copiado» solo cuando se copió. */
import { plugin } from "./puente";

type Share = { share(o: { title?: string; text?: string; url?: string; dialogTitle?: string }): Promise<unknown> };
export type Compartido = "compartido" | "copiado" | "cancelado" | "no";

export async function compartir(o: { titulo: string; texto?: string; url: string; copiar?: string }): Promise<Compartido> {
  const p = plugin<Share>("Share");
  if (!p) return compartirWeb(o);
  try { await p.share({ title: o.titulo, text: o.texto, url: o.url, dialogTitle: o.titulo }); return "compartido"; }
  catch (e) { if (/cancel/i.test(String((e as { message?: string })?.message ?? e))) return "cancelado"; return compartirWeb(o); } // otro fallo: lo de la web
}
async function compartirWeb(o: { titulo: string; texto?: string; url: string; copiar?: string }): Promise<Compartido> {
  const n = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null;
  if (n?.share) {
    try { await n.share({ title: o.titulo, text: o.texto, url: o.url }); return "compartido"; }
    catch (e) { if ((e as { name?: string })?.name === "AbortError") return "cancelado"; }
  }
  try { await navigator.clipboard.writeText(o.copiar ?? o.url); return "copiado"; } catch { return "no"; }
}
