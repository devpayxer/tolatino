"use client";
/* 8a · La pantalla (TLPantalla, fase8-apps.md §3.1): mantenerla encendida mientras la Puerta escanea (y, desde 8e, mientras el Repartidor
   tiene una entrega) y subir el brillo al mostrar un QR (8e). En la app: el plugin nativo (iOS isIdleTimerDisabled / brillo de UIScreen;
   Android FLAG_KEEP_SCREEN_ON / screenBrightness de la ventana; se devuelve solo al salir). En la web: Wake Lock si el navegador lo
   tiene; el brillo no se puede tocar desde la web (no hace nada). */
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
