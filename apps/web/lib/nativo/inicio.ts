"use client";
/* 8a · Lo que la cáscara hace al abrir (fase8-apps.md §3.1 «Lo que se siente nativo»): quitar el splash con el primer pintado, el botón
   «atrás» de Android (cierra la hoja de arriba → vuelve una pantalla → en la raíz sale de la app) y anotar en el registro técnico la familia
   de cada pantalla. En la web no hace nada (cada función tiene su respaldo: no hay splash ni botón atrás del sistema que atender). */
import { plugin } from "./puente";
import { anotar, familia } from "./reporte";

type Escucha = { remove(): Promise<void> };
type App = { addListener(e: "backButton", f: (x: { canGoBack: boolean }) => void): Promise<Escucha>; exitApp(): Promise<void> };
type SplashScreen = { hide(o?: { fadeOutDuration?: number }): Promise<void> };

export async function quitarSplash(): Promise<void> {
  const p = plugin<SplashScreen>("SplashScreen");
  if (!p) return; // la web no tiene splash
  await p.hide({ fadeOutDuration: 150 }).catch(() => undefined);
}

/* El botón «atrás» del sistema (Android). Devuelve con qué quitar la escucha. */
export async function botonAtras(): Promise<() => void> {
  const p = plugin<App>("App");
  if (!p) return () => undefined; // la web: el navegador ya maneja «atrás»
  const h = await p.addListener("backButton", ({ canGoBack }) => {
    const hoja = document.querySelectorAll('[aria-modal="true"]');
    if (hoja.length) { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); (hoja[hoja.length - 1] as HTMLElement).querySelector<HTMLElement>("[data-cerrar]")?.click(); return; }
    if (canGoBack && history.length > 1) history.back();
    else void p.exitApp();
  });
  return () => { void h.remove(); };
}

export function anotarPantalla(ruta: string) { void anotar(`pantalla ${familia(ruta)}`); }
