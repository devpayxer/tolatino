"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { apartarRenta, type RentaIn } from "@/lib/rentas";

/* Apartar una herramienta para rentar. El servidor revisa el artículo, la unidad libre, los días, el día de recoger y la
   tarjeta; hoy no se cobra nada. */
type Bi = { es: string; en: string };
export async function apartarLaRenta(f: RentaIn): Promise<{ ok: true; numero: string } | { ok: false; msg: Bi; tarjeta?: boolean }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  return apartarRenta(u.id, f, process.env.TOLATINO_ENTORNO ?? "pruebas");
}
