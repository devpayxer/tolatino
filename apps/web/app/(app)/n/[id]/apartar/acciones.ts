"use server";
import { ipCliente, mismoOrigen, yo } from "@/lib/cuenta";
import { apartar, type ApartarIn } from "@/lib/apartados";

/* Mandar un apartado. El servidor revisa los artículos, las unidades, el día y la hora; apartar no cobra nada. */
type Bi = { es: string; en: string };
export async function mandarApartado(f: ApartarIn): Promise<{ ok: true; numero: string } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  // La IP queda con el acuerdo del plan (layaway) que se acepta al enviar.
  return apartar(u.id, f, process.env.TOLATINO_ENTORNO ?? "pruebas", await ipCliente());
}
