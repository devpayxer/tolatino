"use server";
/* Mensajes del vecino: enviar, traer lo nuevo y reportar. Solo con sesión; el servidor revisa todo (lib/mensajes). */
import { after } from "next/server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { enviarCliente, nuevosCliente, reportarChat, type Msj, type ResM } from "@/lib/mensajes";

const SIN = { ok: false as const, msg: { es: "Entra para escribir.", en: "Sign in to write." } };
export async function mensajeEnviar(negocio: string, texto: string, op?: string | null): Promise<ResM> {
  if (!(await mismoOrigen())) return SIN;
  const u = await yo();
  if (!u) return SIN;
  const r = await enviarCliente(u.id, String(negocio ?? ""), texto, op ? String(op) : null);
  // 7f · Si El Compa va a contestar (Pro, encendido, fuera del horario), contesta DESPUÉS de responder a la persona: nadie espera al modelo.
  // Si esto no corre, el barrido lo retoma; si falla, sale la respuesta de siempre.
  if (r.ok && r.compa && r.id) { const hilo = r.id; after(() => import("@/lib/compa/respuesta-auto").then((m) => m.contestarAuto(hilo)).catch(() => undefined)); }
  return r;
}
export async function mensajesNuevos(hilo: string, desde: string): Promise<Msj[]> {
  if (!(await mismoOrigen())) return [];
  const u = await yo();
  if (!u) return [];
  return nuevosCliente(u.id, String(hilo ?? ""), String(desde ?? "0"));
}
export async function mensajeReportar(hilo: string, motivo: string, nota: string): Promise<ResM> {
  if (!(await mismoOrigen())) return SIN;
  const u = await yo();
  if (!u) return SIN;
  return reportarChat(u.id, String(hilo ?? ""), "user", null, String(motivo ?? ""), String(nota ?? ""));
}
