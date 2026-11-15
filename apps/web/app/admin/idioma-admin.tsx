"use client";
/* 9f-4 · El idioma del Super Admin en el cliente: el marco (Shell) lo recibe del servidor (idioma() de la persona) y lo da a todas las piezas
   compartidas (confirmar con motivo, avisos, menú) y a cada pantalla que lo lea con useE(). Sin proveedor (una pantalla suelta), español. */
import { createContext, useContext, type ReactNode } from "react";

export type LangAdmin = "es" | "en";
const Ctx = createContext<LangAdmin>("es");
export function IdiomaAdmin({ lang, children }: { lang: LangAdmin; children: ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}
export const useLangAdmin = () => useContext(Ctx);
/* E("español", "English") según el idioma de la persona del equipo. */
export function useE() {
  const l = useContext(Ctx);
  return (es: string, en: string) => (l === "en" ? en : es);
}
