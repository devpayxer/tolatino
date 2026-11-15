"use client";
/* 9c · El ancho de la ventana para elegir teléfono o escritorio, sin salto al cargar: arranca con lo que estimó el servidor (lib/ancho.ts) y
   después mide. Guarda el ancho en la cookie tl_ancho para que la próxima vez el servidor pinte ya con el bueno. Un solo hook para todo. */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const Ctx = createContext(390);
export function AnchoInicial({ w, children }: { w: number; children: ReactNode }) {
  return <Ctx.Provider value={w}>{children}</Ctx.Provider>;
}
export function useAncho() {
  const w0 = useContext(Ctx);
  const [w, setW] = useState(w0);
  useEffect(() => {
    let t: number | undefined;
    const guardar = (x: number) => { try { document.cookie = `tl_ancho=${x}; path=/; max-age=31536000; samesite=lax`; } catch { /* sin cookies: la próxima vez se estima otra vez */ } };
    const f = () => {
      const x = window.innerWidth;
      setW(x);
      clearTimeout(t);
      t = window.setTimeout(() => guardar(x), 400);
    };
    setW(window.innerWidth);
    guardar(window.innerWidth); // al montar, ya: la página siguiente (aunque se cambie enseguida) se pinta con el ancho bueno
    window.addEventListener("resize", f);
    return () => { window.removeEventListener("resize", f); clearTimeout(t); };
  }, []);
  return w;
}
