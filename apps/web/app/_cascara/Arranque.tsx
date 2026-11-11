"use client";
/* 8a · Montado en el marco raíz: dentro de una cáscara quita el splash al primer pintado, atiende el botón «atrás» de Android y anota la
   familia de cada pantalla en el registro técnico. En la web no hace nada (lib/nativo/* responde sin plugins). No pinta nada. */
import { usePathname } from "next/navigation";
import { useEffect } from "react";
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
  return null;
}
