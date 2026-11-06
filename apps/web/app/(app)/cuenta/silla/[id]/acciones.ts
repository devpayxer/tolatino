"use server";
import { headers } from "next/headers";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { conectarSilla } from "@/lib/sillas";

/* El barbero abre el alta de su cuenta de cobro (Stripe Express o el simulador en el sandbox). Solo esa silla. */
type Bi = { es: string; en: string };
export async function conectarCobro(miembro: string): Promise<{ ok: true; url?: string } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  const h = await headers(), host = h.get("x-forwarded-host") ?? h.get("host") ?? "", proto = h.get("x-forwarded-proto") ?? "https";
  return conectarSilla(u.id, String(miembro ?? ""), host ? `${proto}://${host}` : "");
}
