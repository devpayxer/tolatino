"use client";
/* 8a · El registro técnico (TLReporte, lo mínimo de 8a; fase8-apps.md §3.1): un anillo de las últimas líneas (pantalla abierta, errores de la
   página, cambios de señal) para «Reportar un problema» (8f), que solo sale al tocar «Enviar». Nunca lo que la persona escribe, ni la ruta con
   números (familia de ruta: /pedido/:n). En la app vive en el nativo (sobrevive a un cierre de la app); en la web, en la memoria de la pestaña.
   8f · Y lo demás de TLReporte: la captura de la pantalla (solo en la app; queda en el teléfono hasta «Enviar»), agitar para reportar (solo en las
   builds de prueba: lo enciende el servidor con beta_agitar) y los cierres de la vez anterior (MetricKit en iOS, ApplicationExitInfo y el
   manejador de excepciones en Android), que lib/nativo/errores.ts manda a /api/errores. En la web no hay captura, ni agitar, ni cierres. */
import { plugin } from "./puente";

type Escucha = { remove(): Promise<void> };
export type Cierre = { tipo: "cierre" | "nativo"; titulo: string; pila: string };
type TLReporte = {
  anotar(o: { linea: string }): Promise<void>; leer(): Promise<{ lineas: string[] }>;
  ultimaCaptura(): Promise<{ imagen?: string }>; agitar(o: { on: boolean }): Promise<void>; cierres(): Promise<{ cierres?: Cierre[] }>;
};
/* addListener es de Capacitor (todo plugin lo trae), no un método propio de TLReporte. */
type ConEscucha = { addListener(e: "agitado", f: () => void): Promise<Escucha> };
const ANILLO = 200, memoria: string[] = [];

/* La familia de una ruta: los números, códigos y tokens se tapan. */
export const familia = (ruta: string) => ruta.split("?")[0]!.replace(/\/[^/]*\d[^/]*/g, "/:n").slice(0, 80);
const linea = (t: string) => `${new Date().toISOString().slice(11, 19)} ${t.replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, 160)}`;

export async function anotar(texto: string): Promise<void> {
  const p = plugin<TLReporte>("TLReporte");
  if (!p) { memoria.push(linea(texto)); if (memoria.length > ANILLO) memoria.splice(0, memoria.length - ANILLO); return; }
  await p.anotar({ linea: linea(texto) }).catch(() => undefined);
}
export async function registro(): Promise<string[]> {
  const p = plugin<TLReporte>("TLReporte");
  if (!p) return [...memoria];
  return (await p.leer().catch(() => ({ lineas: [] as string[] }))).lineas ?? [];
}

/* La captura que la app tomó al agitar. Una imagen JPEG en base64 que NO sale del teléfono hasta «Enviar». La web no tiene: se elige un archivo. */
export async function capturaGuardada(): Promise<Blob | null> {
  const p = plugin<TLReporte>("TLReporte");
  if (!p) return null;
  try { const r = await p.ultimaCaptura(); return r?.imagen ? aBlob(r.imagen) : null; } catch { return null; } // una cáscara vieja no lo trae
}
function aBlob(b64: string): Blob | null {
  if (!/^[A-Za-z0-9+/=\s]{100,}$/.test(b64) || b64.length > 12_000_000) return null;
  const s = atob(b64.replace(/\s+/g, "")), u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return new Blob([u], { type: "image/jpeg" });
}

/* Agitar para reportar: el nativo escucha el acelerómetro solo mientras esto está encendido y, al agitar, toma la captura y avisa. La web no agita.
   Una cáscara de antes (sin «agitar») contesta «no implementado»: entonces no se escucha nada (primero agitar, después el evento). */
export async function agitar(on: boolean, alAgitar: () => void): Promise<() => void> {
  const p = plugin<TLReporte>("TLReporte");
  if (!p) return () => undefined;
  try { await p.agitar({ on }); } catch { return () => undefined; }
  let e: Escucha | null = null;
  try { e = on ? await (p as unknown as ConEscucha).addListener("agitado", alAgitar) : null; } catch { e = null; }
  return () => { void e?.remove().catch(() => undefined); void p.agitar({ on: false }).catch(() => undefined); };
}

/* Los cierres de la vez anterior (el nativo los entrega una vez y los olvida). La web no tiene cierres nativos; una cáscara de antes, tampoco. */
export async function cierres(): Promise<Cierre[]> {
  const p = plugin<TLReporte>("TLReporte");
  if (!p) return [];
  try { const r = await p.cierres(); return (r?.cierres ?? []).filter((c) => c && (c.tipo === "cierre" || c.tipo === "nativo")).slice(0, 5); } catch { return []; }
}
