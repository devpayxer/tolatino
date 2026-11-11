"use client";
/* 8a · El registro técnico (TLReporte, lo mínimo de 8a; fase8-apps.md §3.1): un anillo de las últimas líneas (pantalla abierta, errores de la
   página, cambios de señal) para «Reportar un problema» (8f), que solo sale al tocar «Enviar». Nunca lo que la persona escribe, ni la ruta con
   números (familia de ruta: /pedido/:n). En la app vive en el nativo (sobrevive a un cierre de la app); en la web, en la memoria de la pestaña. */
import { plugin } from "./puente";

type TLReporte = { anotar(o: { linea: string }): Promise<void>; leer(): Promise<{ lineas: string[] }> };
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
