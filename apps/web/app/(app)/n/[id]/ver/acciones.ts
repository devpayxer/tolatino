"use server";
/* Pedir visita, prueba de manejo, cita, precalificación u oferta. Ver la página no pide cuenta; enviar sí, y el servidor vuelve a revisar
   todo (la hora con su candado, una viva por persona, el tope de Free, la nota filtrada). Nada se cobra. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { avisarVisitaNueva, pedirVisita, type VisIn } from "@/lib/visitas-inm";

export async function pedirVisitaAccion(negocio: string, f: VisIn) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para enviar.", en: "Sign in to send." }, entrar: true as const };
  const r = await pedirVisita(u.id, String(negocio ?? ""), f, process.env.TOLATINO_ENTORNO ?? "pruebas");
  if (r.ok) await avisarVisitaNueva(r.numero).catch(() => undefined);
  return r;
}
