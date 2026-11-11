"use client";
/* 8a · El puente con la cáscara nativa (fase8-apps.md §3.1 «Puente»). ÚNICO archivo de la web que importa @capacitor/* (guardián
   capacitorSoloEnPuente); las demás piezas de lib/nativo/ piden aquí su plugin y, si no está (la web, otra app o un marco ajeno),
   hacen lo mismo con lo del navegador (guardián nativoConRespaldo). La web nunca depende de que esto exista.
   Defensa del puente: solo el documento de arriba lo usa (un marco —un iframe de Stripe o de quien sea— nunca recibe un plugin), y la
   cáscara solo inyecta su puente en el marco principal de nuestro origen (iOS: forMainFrameOnly + el filtro de origen de TLBridge;
   Android: addWebMessageListener con las reglas de origen de Capacitor). */
import { Capacitor, registerPlugin } from "@capacitor/core";

/* ¿Corre dentro de una de las cuatro cáscaras y en el documento de arriba? */
export function esApp(): boolean {
  if (typeof window === "undefined") return false;
  try { if (window.self !== window.top) return false; } catch { return false; }
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}
export function plataforma(): "ios" | "android" | "web" {
  if (!esApp()) return "web";
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : "web";
}
/* ¿Es una isla local (la página empaquetada en la cáscara, sin servidor)? Viven en el origen local de Capacitor: capacitor://localhost (iOS)
   o https://localhost sin puerto (Android). */
export function enIsla(): boolean {
  return esApp() && typeof location !== "undefined" && location.hostname === "localhost" && !location.port && (location.protocol === "capacitor:" || location.protocol === "https:");
}

const cache = new Map<string, unknown>();
/* El plugin si la cáscara lo trae; null en la web (y en un marco). Quien lo pide decide qué hacer sin él. */
export function plugin<T>(nombre: string): T | null {
  if (!esApp() || !Capacitor.isPluginAvailable(nombre)) return null;
  if (!cache.has(nombre)) cache.set(nombre, registerPlugin<T & object>(nombre));
  return cache.get(nombre) as T;
}

/* La dirección del servidor desde una isla (el origen local no es el servidor): la escribe scripts/generar.mjs en /app.json de cada cáscara.
   En la web (o en la app servida) es la misma ruta. */
let base: Promise<string> | null = null;
export async function urlServidor(ruta: string): Promise<string> {
  if (!enIsla()) return ruta;
  base ??= fetch("/app.json").then((r) => r.json()).then((j: { url?: string }) => String(j.url ?? "").replace(/\/$/, "")).catch(() => "");
  const b = await base;
  return b ? b + ruta : ruta;
}
/* Ir a una pantalla del servidor (desde una isla, al servidor de la cáscara; en la web, la misma ruta). */
export async function irAlServidor(ruta: string) {
  location.href = await urlServidor(ruta);
}
