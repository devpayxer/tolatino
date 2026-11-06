"use server";
/* El Booking de Doctores: las horas libres (las decide el servidor) y enviar. Ver las horas no pide cuenta; enviar sí, y el
   servidor vuelve a revisar todo (seguro tuyo, hora libre, profesional con licencia). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { avisarCitaSalud, enviarCitaSalud, horasSalud, type CitaSaludIn } from "@/lib/citas-salud";

// solo lectura
export async function horasDeConsulta(negocio: string, svc: string, con: string, i: number) {
  return horasSalud(String(negocio ?? ""), String(svc ?? ""), String(con ?? "any"), Number(i));
}
export async function pedirConsulta(negocio: string, f: CitaSaludIn) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para enviar.", en: "Sign in to send." }, entrar: true as const };
  const r = await enviarCitaSalud(u.id, String(negocio ?? ""), f, process.env.TOLATINO_ENTORNO ?? "pruebas");
  if (r.ok) await avisarCitaSalud(r.numero).catch(() => undefined);
  return r;
}
