"use server";
/* El evento privado del cliente: aceptar la propuesta (versión exacta, con la tarjeta: se retiene y se cobra el depósito que calculó la base),
   pedir un cambio, «No, gracias», aceptar un cambio y cancelar (con la regla que aplica). Nunca se manda un monto: lo decide el servidor. */
import { headers } from "next/headers";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { aceptarCambioEvp, aceptarEvp, cancelarEvp, noGraciasEvp, pedirCambioEvp, rechazarCambioEvp, type CambioIn } from "@/lib/evento-privado";

const NO = { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
async function quien() {
  if (!(await mismoOrigen())) return null;
  return yo();
}
export async function aceptarEvpAccion(numero: string, version: number, pm: string | null, clave: string) {
  const u = await quien(); if (!u) return NO;
  const h = await headers(), ip = (h.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || h.get("x-real-ip");
  return aceptarEvp(u.id, String(numero ?? ""), Number(version), pm == null ? null : String(pm), ip, String(clave ?? ""));
}
export async function cambioEvpAccion(numero: string, f: CambioIn) {
  const u = await quien(); if (!u) return NO;
  return pedirCambioEvp(u.id, String(numero ?? ""), { nota: String(f?.nota ?? ""), personas: f?.personas == null ? null : Number(f.personas), fecha: f?.fecha == null ? null : String(f.fecha), m: f?.m == null ? null : Number(f.m) });
}
export async function evpClienteAccion(numero: string, que: "nogracias" | "cancelar" | "cambio_ok" | "cambio_no", version?: number) {
  const u = await quien(); if (!u) return NO;
  if (que === "nogracias") return noGraciasEvp(u.id, String(numero ?? ""));
  if (que === "cancelar") return cancelarEvp(u.id, String(numero ?? ""));
  if (que === "cambio_ok") return aceptarCambioEvp(u.id, String(numero ?? ""), Number(version));
  if (que === "cambio_no") return rechazarCambioEvp(u.id, String(numero ?? ""));
  return NO;
}
