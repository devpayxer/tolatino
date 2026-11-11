"use client";
/* 8f · Los errores de la página y los cierres de la app, a /api/errores (fase8-apps.md §4 8f; colector propio, sin Sentry ni GlitchTip). En la web
   y en las cuatro cáscaras. Lo que sale de aquí: el tipo, el nombre y el mensaje del error, su stack y la FAMILIA de la pantalla (/pedido/:n).
   NUNCA la dirección con sus números ni lo de después de «?», ni el valor de un campo, ni nada de la persona (guardián erroresTapados; el
   servidor vuelve a tapar todo). Hasta 10 por página abierta y cada error distinto una vez; sin señal no se manda nada. «Script error.» (otro
   origen, sin datos) y el ruido de extensiones del navegador no se mandan. En una isla sin servidor, se manda al servidor de la cáscara. */
import { esApp, urlServidor } from "./puente";
import { anotar, cierres, familia } from "./reporte";
import { sinRed } from "./senal";

const MAX = 10, vistos = new Set<string>();
let enviados = 0;

function mandar(x: { tipo: "js" | "red" | "cierre" | "nativo"; nombre?: string; mensaje: string; stack?: string }) {
  if (enviados >= MAX || sinRed()) return;
  const k = `${x.tipo}|${x.mensaje.slice(0, 200)}|${(x.stack ?? "").slice(0, 200)}`;
  if (vistos.has(k)) return;
  vistos.add(k); enviados++;
  const cuerpo = JSON.stringify({ tipo: x.tipo, nombre: (x.nombre ?? "").slice(0, 80), mensaje: x.mensaje.slice(0, 2000), stack: (x.stack ?? "").slice(0, 16000), ruta: familia(location.pathname) });
  void urlServidor("/api/errores").then((u) => fetch(u, { method: "POST", body: cuerpo, keepalive: true, headers: { "content-type": "text/plain;charset=UTF-8" }, credentials: "include" })).catch(() => undefined);
}
const ruido = (m: string, s: string) => /^Script error\.?$/i.test(m) || /(chrome|moz|safari-web)-extension:\/\//.test(s) || /ResizeObserver loop/.test(m);

/* Montado una vez en el marco raíz (app/_cascara/Arranque.tsx). Devuelve cómo quitarlo. */
export function vigilarErrores(): () => void {
  const err = (e: ErrorEvent) => {
    const m = String(e.message ?? ""), s = String((e.error as Error | undefined)?.stack ?? "");
    if (ruido(m, s)) return;
    mandar({ tipo: "js", nombre: (e.error as Error | undefined)?.name, mensaje: m, stack: s });
    // En la web también queda en el registro de «Reportar un problema» (en la app ya lo anota Arranque).
    if (!esApp()) void anotar(`error ${m.replace(/\d{3,}/g, "#").slice(0, 120)}`);
  };
  const rej = (e: PromiseRejectionEvent) => {
    const r = e.reason as { name?: string; message?: string; stack?: string } | undefined, m = String(r?.message ?? (typeof e.reason === "string" ? e.reason : "Promesa rechazada"));
    if (ruido(m, String(r?.stack ?? ""))) return;
    mandar({ tipo: /Failed to fetch|Load failed|NetworkError/i.test(m) ? "red" : "js", nombre: r?.name, mensaje: m, stack: String(r?.stack ?? "") });
  };
  window.addEventListener("error", err);
  window.addEventListener("unhandledrejection", rej);
  // Los cierres nativos de la vez anterior (solo en la app): se mandan al abrir otra vez.
  if (esApp()) void cierres().then((L) => { for (const c of L) mandar({ tipo: c.tipo, mensaje: c.titulo, stack: c.pila }); });
  return () => { window.removeEventListener("error", err); window.removeEventListener("unhandledrejection", rej); };
}
