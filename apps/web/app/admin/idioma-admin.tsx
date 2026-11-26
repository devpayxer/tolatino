"use client";
/* 9f-4 · El idioma del Super Admin en el cliente: el marco (Shell) lo recibe del servidor (idioma() de la persona) y lo da a todas las piezas
   compartidas (confirmar con motivo, avisos, menú) y a cada pantalla que lo lea con useE2(). Sin proveedor (una pantalla suelta), español. */
import { createContext, useContext, type ReactNode } from "react";
import { dosIdiomas } from "@/lib/dos-idiomas";

export type LangAdmin = "es" | "en";
const Ctx = createContext<LangAdmin>("es");
export function IdiomaAdmin({ lang, children }: { lang: LangAdmin; children: ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}
export const useLangAdmin = () => useContext(Ctx);
/* E2("español", "English") según el idioma de la persona del equipo; pasa por dosIdiomas (lo editado en Super Admin › Cadenas sale aquí). Se usa: const { E2 } = useE2(). */
export function useE2() {
  const l = useContext(Ctx);
  const E2 = (a: string, b: string) => dosIdiomas(l !== "en", a, b);
  return { E2 };
}
