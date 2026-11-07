"use server";
/* Anotarse en la lista / pedir la mesa (APP-NEG-NOCHE-RESERVA). Ver la página no pide cuenta; enviar sí, y el servidor vuelve a
   revisar todo (noche abierta, hora, personas, cupo real con candado, depósito retenido antes de guardar). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { avisarNocheNueva, reservarNoche, type NocheIn } from "@/lib/noche-reservas";

export async function reservarNocheAccion(negocio: string, f: NocheIn) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para enviar.", en: "Sign in to send." }, entrar: true as const };
  const r = await reservarNoche(u.id, String(negocio ?? ""), f, process.env.TOLATINO_ENTORNO ?? "pruebas");
  if (r.ok) await avisarNocheNueva(r.numero).catch(() => undefined);
  return r;
}
