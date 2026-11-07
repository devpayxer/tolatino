"use server";
/* Hoy en el barrio · la página siguiente (público: solo negocios y lo que publicaron). */
import { yo } from "@/lib/cuenta";
import { hoyEnElBarrio } from "@/lib/hoy";
import { catHoy, type PaginaHoy } from "@/lib/hoy-comun";
import { ubicacion } from "@/lib/ubicacion";

// solo lectura
export async function hoyMas(c: string, cursor: string): Promise<PaginaHoy> {
  const loc = await ubicacion(await yo());
  return hoyEnElBarrio(loc.c.id, catHoy(String(c ?? "")).cat, String(cursor ?? "").slice(0, 120), loc);
}
