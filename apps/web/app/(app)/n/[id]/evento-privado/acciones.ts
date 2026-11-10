"use server";
/* Pedir un evento privado (APP-NEG-EVENTO-PRIVADO). Ver no pide cuenta; enviar sí. El servidor vuelve a revisar todo (personas, fecha,
   anticipación, área, menú, extras, solicitudes abiertas) y NO cobra nada: el depósito se cobra solo al aceptar una propuesta. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { avisarEvpNueva, pedirEvp, type EvpIn } from "@/lib/evento-privado";

export async function pedirEvpAccion(negocio: string, f: EvpIn) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para enviar.", en: "Sign in to send." }, entrar: true as const };
  const r = await pedirEvp(u.id, String(negocio ?? ""), f, process.env.TOLATINO_ENTORNO ?? "pruebas");
  if (r.ok) await avisarEvpNueva(r.numero).catch(() => undefined);
  return r;
}
