"use server";
/* Inscribirse (APP-NEG-EDU-INSCRIPCION) y la lista de espera. Ver la página no pide cuenta; enviar sí, y el servidor vuelve a revisar
   todo (grupo con cupo con candado, datos del niño, matrícula retenida antes de guardar, plan por escrito). */
import { ipCliente, mismoOrigen, yo } from "@/lib/cuenta";
import { anotarmeEspera, avisarInscNueva, inscribirme, salirEspera, type InscIn } from "@/lib/inscripciones";

const NO = { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
export async function inscribirmeAccion(negocio: string, f: InscIn) {
  if (!(await mismoOrigen())) return NO;
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para enviar.", en: "Sign in to send." }, entrar: true as const };
  const r = await inscribirme(u.id, String(negocio ?? ""), f, process.env.TOLATINO_ENTORNO ?? "pruebas", await ipCliente());
  if (r.ok) await avisarInscNueva(r.numero).catch(() => undefined);
  return r;
}
export async function esperaAccion(negocio: string, svc: string, grupo: string | null, banda: string | null) {
  if (!(await mismoOrigen())) return NO;
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para anotarte.", en: "Sign in to join." }, entrar: true as const };
  return anotarmeEspera(u.id, String(negocio ?? ""), String(svc ?? ""), grupo ? String(grupo) : null, banda ? String(banda) : null);
}
export async function salirEsperaAccion(id: string) {
  if (!(await mismoOrigen())) return NO;
  const u = await yo();
  if (!u) return NO;
  return salirEspera(u.id, String(id ?? ""));
}
