"use client";
/* C-002 · El buscador del encabezado puede ser el de la página (APP-NEG-CAT): en la computadora, el buscador del header busca DENTRO de la
   categoría («Buscar en Comida y Bebidas»); en el teléfono el header no lleva buscador en esa página (el de la categoría va sobre la portada).
   La página lo pide con usarBuscadorPagina(); al salir de la página, el header vuelve a ser el de siempre. */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type BuscadorPagina = { ph: string; href: string } | null;
const Ctx = createContext<{ b: BuscadorPagina; poner: (b: BuscadorPagina) => void }>({ b: null, poner: () => undefined });

export function ProveedorBuscador({ children }: { children: (b: BuscadorPagina) => ReactNode }) {
  const [b, poner] = useState<BuscadorPagina>(null);
  return <Ctx.Provider value={{ b, poner }}>{children(b)}</Ctx.Provider>;
}

export function usarBuscadorPagina(ph: string, href: string) {
  const { poner } = useContext(Ctx);
  useEffect(() => {
    poner({ ph, href });
    return () => poner(null);
  }, [ph, href, poner]);
}
