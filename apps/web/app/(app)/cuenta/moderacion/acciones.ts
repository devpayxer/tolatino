"use server";
/* 5d · Apelar (Mi cuenta › Avisos de moderación). Pide sesión y mismo origen; lo decide lib/apelaciones.ts (una vez, 20–500 letras,
   14 días, solo lo propio). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { apelar } from "@/lib/apelaciones";

export async function apelarAccion(k: string, id: string, texto: string) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para apelar.", en: "Sign in to appeal." } };
  return apelar(u.id, String(k ?? "").slice(0, 20), String(id ?? "").slice(0, 40), String(texto ?? "").slice(0, 600));
}
