"use server";
/* La consulta con un profesional: horas libres (las decide el servidor) y enviar. Ver horas no pide cuenta; enviar sí. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { avisarCitaPro, enviarCitaPro, type CitaProIn } from "@/lib/citas-pro";
import { horasSalud } from "@/lib/citas-salud";

// solo lectura
export async function horasDeTramite(negocio: string, svc: string, con: string, i: number, remoto: boolean) {
  return horasSalud(String(negocio ?? ""), String(svc ?? ""), String(con ?? "any"), Number(i), "NEG-PRO", remoto === true);
}
export async function pedirTramite(negocio: string, f: CitaProIn) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para enviar.", en: "Sign in to send." }, entrar: true as const };
  const r = await enviarCitaPro(u.id, String(negocio ?? ""), f, process.env.TOLATINO_ENTORNO ?? "pruebas");
  if (r.ok) await avisarCitaPro(r.numero, u.first_name ?? "").catch(() => undefined);
  return r;
}
