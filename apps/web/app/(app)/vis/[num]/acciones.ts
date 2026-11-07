"use server";
/* Tu visita: cancelar (gratis siempre, un toque), aceptar la otra hora o «No me sirve». El servidor decide. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { cancelarVisita, decidirOtraHora } from "@/lib/visitas-inm";

export async function visAccion(numero: string, que: "cancelar" | "aceptar" | "nogracias") {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  const n = String(numero ?? "");
  if (que === "cancelar") return cancelarVisita({ userId: u.id }, n);
  if (que === "aceptar" || que === "nogracias") return decidirOtraHora(u.id, n, que === "aceptar");
  return { ok: false as const, msg: { es: "No se pudo.", en: "Could not do it." } };
}
