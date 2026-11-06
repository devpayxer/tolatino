"use server";
/* El Booking de un taller o un servicio del hogar: las horas o franjas libres (las decide el servidor) y enviar. Ver las
   horas no pide cuenta; enviar sí, y el servidor vuelve a revisar todo (vehículo o casa, opciones, hora, depósito). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { avisarCitaNueva } from "@/lib/citas";
import { enviarVisita, horasVisita, type PedidoVisita, type VisitaIn } from "@/lib/visitas";

// solo lectura
export async function horasDeVisita(negocio: string, q: PedidoVisita, i: number, tam: string | null) {
  return horasVisita(String(negocio ?? ""), q, Number(i), typeof tam === "string" && /^[csvmd]$/.test(tam) ? tam : null);
}
export async function pedirVisita(negocio: string, f: VisitaIn) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para enviar.", en: "Sign in to send." }, entrar: true as const };
  const r = await enviarVisita(u.id, String(negocio ?? ""), f, process.env.TOLATINO_ENTORNO ?? "pruebas");
  if (r.ok) await avisarCitaNueva(r.numero, u.first_name ?? "").catch(() => undefined);
  return r;
}
