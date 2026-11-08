"use server";
/* 5h · «Ver traducción» (D3). Una sola acción para publicaciones, comentarios, reseñas, respuestas del negocio y comentarios de
   Novedades. Viene de nuestra página (mismoOrigen); el idioma destino es el de la app (cookie tl_lang, lo decide el servidor); el límite
   es por persona (o por dispositivo sin cuenta). Las reglas viven en lib/traduccion.ts. */
import { dispositivo, mismoOrigen, yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { traducir } from "@/lib/traduccion";
import type { ResTr } from "@/lib/traduccion-comun";

export async function verTraduccion(kind: string, id: string): Promise<ResTr> {
  if (!(await mismoOrigen())) return { ok: false, motivo: "no_esta", msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const [u, dst] = await Promise.all([yo(), idioma()]);
  const dev = u ? null : await dispositivo(true);
  return traducir(String(kind ?? "").slice(0, 20), String(id ?? "").slice(0, 20), { userId: u?.id ?? null, dispositivo: dev }, dst);
}
