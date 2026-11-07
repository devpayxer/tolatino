"use server";
/* Reservar un viaje (APP-NEG-TRANS-RESERVA). Ver las salidas no pide cuenta; reservar sí, y el servidor vuelve a revisar todo
   (licencia, salida y asientos con el candado de la salida, recogida en la zona, total) antes de retener. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { avisarViajeNuevo, reservarViaje, type ViajeIn } from "@/lib/viajes";

export async function reservarViajeAccion(negocio: string, f: ViajeIn) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para reservar.", en: "Sign in to book." }, entrar: true as const };
  const r = await reservarViaje(u.id, String(negocio ?? ""), f, process.env.TOLATINO_ENTORNO ?? "pruebas");
  if (r.ok) await avisarViajeNuevo(r.numero).catch(() => undefined);
  return r;
}
