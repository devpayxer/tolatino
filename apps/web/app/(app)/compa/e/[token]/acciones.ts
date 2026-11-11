"use server";
/* 7h · Usar el enlace de un uso de WhatsApp y SMS: desde nuestra página (mismoOrigen), con la SESIÓN de siempre (la persona sale de yo(), nunca
   del enlace ni del teléfono). lib/compa/enlace.ts revisa que el enlace sea de ESA cuenta, sin usar y sin vencer, y confirma por confirmar()
   con via «link» (la misma función y los mismos permisos de la app). */
import { usarEnlace } from "@/lib/compa/enlace";
import type { ResAccion } from "@/lib/compa/acciones";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { evento } from "@/lib/eventos";

const SIN = { es: "Entra con tu cuenta para usar este enlace.", en: "Sign in with your account to use this link." };
export async function enlaceUsar(token: string, decision: "si" | "no"): Promise<ResAccion & { enlace?: string }> {
  if (!(await mismoOrigen())) return { ok: false, estado: "no", msg: SIN };
  const u = await yo();
  if (!u) return { ok: false, estado: "no", msg: SIN };
  const r = await usarEnlace({ userId: u.id }, String(token ?? "").slice(0, 64), decision === "si" ? "si" : "no");
  if (r.ok && decision === "si") await evento("compa_accion", { props: { tipo: r.tipo } });
  return r;
}
