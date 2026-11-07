"use server";
/* Pedir la fecha (APP-NEG-FIESTA-BOOKING). Ver la página no pide cuenta; enviar sí, y el servidor vuelve a revisar todo
   (día libre, hora, invitados, zona, depósito) con el candado del día. */
import { ipCliente, mismoOrigen, yo } from "@/lib/cuenta";
import { avisarFiestaNueva, pedirFecha, type FiestaIn } from "@/lib/fiestas-reservas";

export async function pedirFechaAccion(negocio: string, f: FiestaIn) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para enviar.", en: "Sign in to send." }, entrar: true as const };
  const r = await pedirFecha(u.id, String(negocio ?? ""), f, process.env.TOLATINO_ENTORNO ?? "pruebas", await ipCliente());
  if (r.ok) await avisarFiestaNueva(r.numero).catch(() => undefined);
  return r;
}
