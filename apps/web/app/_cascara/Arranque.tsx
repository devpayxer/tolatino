"use client";
/* 8a · Montado en el marco raíz: dentro de una cáscara quita el splash al primer pintado, atiende el botón «atrás» de Android y anota la
   familia de cada pantalla en el registro técnico. En la web no hace nada (lib/nativo/* responde sin plugins). No pinta nada.
   8c · Y los avisos: el toque en la app y el refresco diario del registro (web y app). */
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { escucharToques, refrescarAvisos } from "@/lib/nativo/avisos";
import { anotarPantalla, botonAtras, quitarSplash } from "@/lib/nativo/inicio";
import { esApp } from "@/lib/nativo/puente";
import { anotar } from "@/lib/nativo/reporte";
import { alCambiarRed } from "@/lib/nativo/senal";

export function Arranque() {
  const ruta = usePathname();
  useEffect(() => {
    if (!esApp()) return;
    void quitarSplash();
    let quitar = () => undefined as void;
    void botonAtras().then((f) => { quitar = f; });
    const err = (e: ErrorEvent) => { void anotar(`error ${String(e.message ?? "").replace(/\d{3,}/g, "#").slice(0, 120)}`); };
    const quitarRed = alCambiarRed((r) => { void anotar(r ? "señal: sí" : "señal: no"); });
    window.addEventListener("error", err);
    return () => { quitar(); quitarRed(); window.removeEventListener("error", err); };
  }, []);
  useEffect(() => { if (ruta && esApp()) anotarPantalla(ruta); }, [ruta]);
  // 8c · Avisos: en la app, tocar un aviso abre su pantalla; en la app y en la web, con el permiso ya dado, el registro se refresca una vez al día
  // (el token rota y «visto» evita que venza por falta de uso). Sin permiso no hace nada.
  useEffect(() => {
    let quitar = () => undefined as void;
    void escucharToques().then((f) => { quitar = f; });
    try {
      const k = "tl-avisos-refresco", ultimo = Number(localStorage.getItem(k) ?? 0);
      if (Date.now() - ultimo > 86_400_000) { localStorage.setItem(k, String(Date.now())); void refrescarAvisos(); }
    } catch { /* sin almacenamiento */ }
    return () => quitar();
  }, []);
  return null;
}
