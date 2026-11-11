"use client";
/* 8a · La pantalla (TLPantalla, fase8-apps.md §3.1): mantenerla encendida mientras la Puerta escanea (y, desde 8e, mientras el Repartidor
   tiene una entrega) y subir el brillo al mostrar un QR (8e). En la app: el plugin nativo (iOS isIdleTimerDisabled / brillo de UIScreen;
   Android FLAG_KEEP_SCREEN_ON / screenBrightness de la ventana; se devuelve solo al salir). En la web: Wake Lock si el navegador lo
   tiene; el brillo no se puede tocar desde la web (no hace nada). */
import { useEffect } from "react";
import { plugin } from "./puente";

type TLPantalla = { mantener(o: { on: boolean }): Promise<void>; brillo(o: { max: boolean }): Promise<void> };
let candado: { release(): Promise<void> } | null = null;

export async function mantenerEncendida(on: boolean): Promise<void> {
  const p = plugin<TLPantalla>("TLPantalla");
  if (!p) {
    try {
      const wl = (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock;
      if (on && wl && !candado) candado = await wl.request("screen");
      if (!on && candado) { await candado.release(); candado = null; }
    } catch { /* el navegador no lo deja (pestaña oculta, sin permiso): sigue igual */ }
    return;
  }
  await p.mantener({ on }).catch(() => undefined);
}

export async function brilloMaximo(on: boolean): Promise<void> {
  const p = plugin<TLPantalla>("TLPantalla");
  if (!p) return; // la web no puede cambiar el brillo
  await p.brillo({ max: on }).catch(() => undefined);
}

/* 8e · La linterna de la Puerta en iOS: el WebView de iOS no deja prender la luz desde la cámara de la página (la restricción «torch» no existe
   ahí), así que la prende el nativo (AVCaptureDevice). En Android y en la web la prende la página con la restricción «torch» (Escaner.tsx).
   Devuelve false si no hay plugin o el teléfono no tiene luz. A verificar en un iPhone real que no choca con la cámara del WebView. */
type TLPantallaLuz = { linterna(o: { on: boolean }): Promise<{ ok: boolean }> };
export async function linternaNativa(on: boolean): Promise<boolean> {
  const p = plugin<TLPantallaLuz>("TLPantalla");
  if (!p) return false;
  try { return !!(await p.linterna({ on })).ok; } catch { return false; } // una cáscara de antes sin linterna
}

/* 8e · «Fijar la Puerta en esta pantalla» (kiosco sin MDM, LAUNCH L862): en To'Latino Puerta de Android, la fijación de pantalla del sistema
   (startLockTask): el sistema pide confirmar y dice cómo soltarla. iOS no deja que una app se fije sola sin MDM: ahí se explica Acceso guiado.
   En la web no se puede (devuelve «no»). */
type TLPantallaFijar = { fijar(): Promise<{ ok: boolean }>; soltar(): Promise<void>; fijada(): Promise<{ fijada: boolean }> };
export async function fijarPantalla(): Promise<"ok" | "no"> {
  const p = plugin<TLPantallaFijar>("TLPantalla");
  if (!p) return "no";
  try { return (await p.fijar()).ok ? "ok" : "no"; } catch { return "no"; }
}
export async function soltarPantalla(): Promise<void> {
  const p = plugin<TLPantallaFijar>("TLPantalla");
  if (p) await p.soltar().catch(() => undefined);
}
export async function pantallaFijada(): Promise<boolean> {
  const p = plugin<TLPantallaFijar>("TLPantalla");
  if (!p) return false;
  try { return !!(await p.fijada()).fijada; } catch { return false; }
}

/* 8e · Mientras se ve un QR de boleto (To'Latino: el boleto, la orden, la isla sin señal): brillo al máximo, y se devuelve al salir de la pantalla
   o al taparla (la ventana también lo suelta sola al salir de la app). Siempre en pareja: lo que sube aquí se baja aquí (guardián brilloSeDevuelve). */
export function useBrilloQr(on: boolean): void {
  useEffect(() => {
    if (!on) return;
    void brilloMaximo(true);
    const f = () => { if (document.visibilityState === "visible") void brilloMaximo(true); };
    document.addEventListener("visibilitychange", f);
    return () => { document.removeEventListener("visibilitychange", f); void brilloMaximo(false); };
  }, [on]);
}
