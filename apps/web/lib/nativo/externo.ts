"use client";
/* 8a · Abrir algo FUERA de la cáscara (fase8-apps.md §3.1 «Alcance de navegación»): una ruta de otra app, el Super Admin, un mapa o un sitio
   ajeno nunca se abre en el WebView del puente. En la app: AppLauncher.openUrl (el sistema decide: la otra app si está instalada —enlace
   universal— o el navegador). En la web: una pestaña nueva para lo ajeno y la misma pestaña para lo nuestro. */
import { plugin } from "./puente";

type AppLauncher = { openUrl(o: { url: string }): Promise<{ completed: boolean }> };

export async function abrirFuera(url: string, o: { mismaPestana?: boolean } = {}): Promise<void> {
  const p = plugin<AppLauncher>("AppLauncher");
  if (!p) {
    if (o.mismaPestana) location.assign(url);
    else window.open(url, "_blank", "noopener");
    return;
  }
  // Una ruta nuestra va con el origen del servidor (la cáscara la manda al sistema, que elige la app o el navegador).
  const abs = /^https?:\/\//.test(url) ? url : new URL(url, location.origin).toString();
  await p.openUrl({ url: abs }).catch(() => { window.open(abs, "_blank", "noopener"); });
}
