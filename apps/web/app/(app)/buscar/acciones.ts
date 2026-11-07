"use server";
/* Buscar › Vecinos · la página siguiente. Solo con cuenta (guardián buscarVecinosConSesion): sin sesión no se lee nada. */
import { yo } from "@/lib/cuenta";
import { entender, tsq } from "@/lib/buscar";
import { buscarVecinos } from "@/lib/comunidad-portada";
import { idioma } from "@/lib/idioma";
import { ubicacion } from "@/lib/ubicacion";
import { filaVecino, type FilaVecino } from "./vecinos";

// solo lectura
export async function vecinosMas(q: string, cursor: string): Promise<{ items: FilaVecino[]; mas: string | null }> {
  const u = await yo();
  if (!u) return { items: [], mas: null };
  const [loc, lang, E] = await Promise.all([ubicacion(u), idioma(), entender(String(q ?? "").slice(0, 120))]);
  if (!E.grupos.length) return { items: [], mas: null };
  const r = await buscarVecinos(u.id, loc.ciudad, tsq(E.grupos, true), String(cursor ?? "").slice(0, 80) || null, 10);
  return { items: r.items.map((x) => filaVecino(x, E, lang === "es")), mas: r.mas };
}
