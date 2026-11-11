"use client";
/* 8a · La señal, en un solo lugar (guardián senalHonesta): ninguna pantalla lee navigator.onLine ni escucha online/offline por su cuenta.
   - sinRed(): lo que dice el teléfono. Si dice «sin red» (modo avión, sin Wi-Fi ni datos) es verdad; si dice «con red», NO prueba que nuestro
     servidor responda (un portal cautivo, un Wi-Fi sin internet, el servidor caído). En Android lo cuenta la cáscara (RedWebView).
   - haySenal(): la prueba real. Una petición HEAD corta a un archivo estático de NUESTRO servidor (sin cookies, sin caché, con tiempo
     límite; desde una isla, al servidor de la cáscara por urlServidor). Cualquier respuesta del servidor = hay señal. Los service workers
     de /puerta y /cuenta/boletos solo atienden GET: un HEAD nunca sale de su caché.
   - useSenal(): para una pantalla que ofrece «hay señal, abre la app en línea»: null mientras prueba; vuelve a probar al volver la red y
     cada `cada` ms; «sin red» del teléfono apaga al momento.
   - alCambiarRed(): el aviso del teléfono (online/offline) para volver a intentar o anotar; nunca para afirmar que hay señal. */
import { useEffect, useState } from "react";
import { urlServidor } from "./puente";

const PRUEBA = "/assets/logo-tolatino.svg", T_PRUEBA = 4000;

export function sinRed(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export async function haySenal(ms = T_PRUEBA): Promise<boolean> {
  if (typeof window === "undefined" || sinRed()) return false;
  const ab = new AbortController(), t = setTimeout(() => ab.abort(), ms);
  try {
    await fetch(await urlServidor(`${PRUEBA}?senal=${Date.now()}`), { method: "HEAD", mode: "no-cors", cache: "no-store", credentials: "omit", signal: ab.signal });
    return true;
  } catch { return false; } finally { clearTimeout(t); }
}

export function alCambiarRed(f: (red: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const on = () => f(true), off = () => f(false);
  window.addEventListener("online", on); window.addEventListener("offline", off);
  return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
}

export function useSenal(cada = 20000): boolean | null {
  const [s, setS] = useState<boolean | null>(null);
  useEffect(() => {
    let vivo = true, n = 0;
    const probar = async () => { const k = ++n; const r = await haySenal(); if (vivo && k === n) setS(r); };
    void probar();
    const quitar = alCambiarRed((red) => { if (red) void probar(); else { n++; setS(false); } });
    const i = setInterval(() => { void probar(); }, cada);
    return () => { vivo = false; quitar(); clearInterval(i); };
  }, [cada]);
  return s;
}
