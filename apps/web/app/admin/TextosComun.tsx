"use client";
/* 9f · Super Admin › Textos y páginas: lo que comparten sus pestañas (Ayuda, Páginas, Cadenas, Rótulos, Home por ciudad): la barra de pestañas y el
   selector de idioma de quien usa el admin (cookie tl_lang, la misma del botón ES/EN de la web). El Super Admin se escribe en español primero; esta
   sección ya sale en los dos idiomas (los demás módulos del admin siguen en español: LAUNCH «Super Admin en inglés»). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { idiomaAdmin } from "./acciones-textos";

export type L = "es" | "en";
export const par = (l: L) => (a: string, b: string) => (l === "es" ? a : b);
export const RUTAS = { ayuda: "/admin/textos", paginas: "/admin/textos/paginas", cadenas: "/admin/textos/cadenas", rotulos: "/admin/textos/rotulos", home: "/admin/textos/home" } as const;
export type Pestana = keyof typeof RUTAS;

export function pestanas(l: L, activa: Pestana, router: AppRouterInstance): Bloque {
  const E = par(l);
  const nombres: Record<Pestana, string> = { ayuda: E("Ayuda", "Help"), paginas: E("Páginas", "Pages"), cadenas: E("Cadenas", "Strings"), rotulos: E("Rótulos", "Labels"), home: E("Home por ciudad", "City Home") };
  return { type: "tabs", items: (Object.keys(RUTAS) as Pestana[]).map((k) => ({ l: nombres[k], on: k === activa, onClick: () => router.push(RUTAS[k]) })) };
}

/* El selector de idioma del admin: guarda la cookie y recarga. */
export function selectorIdioma(l: L, router: AppRouterInstance): Bloque {
  const E = par(l);
  return { type: "chips", k: E("IDIOMA DEL ADMIN", "ADMIN LANGUAGE"), items: [{ l: "Español", v: l === "es" ? "selected" : "filter", onClick: async () => { await idiomaAdmin("es"); router.refresh(); } },
    { l: "English", v: l === "en" ? "selected" : "filter", onClick: async () => { await idiomaAdmin("en"); router.refresh(); } }] };
}

export const cuandoL = (l: L) => (iso: string | null) => (iso ? new Intl.DateTimeFormat(l === "es" ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");

export { PanelBloques };
