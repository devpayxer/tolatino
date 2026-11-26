"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { aprobarPeso, cancelarMercado, decidirSustituto, noMasMercado } from "@/lib/mercado";

/* El cliente en su pedido del mercado: aceptar o no un cambio, «Está bien, cobrar» y cancelar antes de que lo acepten. */
type Bi = { es: string; en: string };
type R = { ok: true; mensaje?: Bi } | { ok: false; msg: Bi };
import { usd as money } from "@/lib/dinero-comun";
const SIN = { ok: false as const, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
export async function mercSustituto(numero: string, prop: string, si: boolean): Promise<R> {
  if (!(await mismoOrigen())) return SIN;
  const u = await yo(); if (!u) return SIN;
  return decidirSustituto(u.id, String(numero ?? ""), String(prop ?? ""), si === true);
}
export async function mercAprobar(numero: string): Promise<R> {
  if (!(await mismoOrigen())) return SIN;
  const u = await yo(); if (!u) return SIN;
  const r = await aprobarPeso(u.id, String(numero ?? ""));
  if (!r.ok) return r;
  return { ok: true, mensaje: r.cobrado ? { es: `Cobrado ${money(r.cobrado)}${r.liberado ? ` · se liberan ${money(r.liberado)}` : ""}`, en: `${money(r.cobrado)} charged${r.liberado ? ` · ${money(r.liberado)} released` : ""}` } : undefined };
}
/* 9n-4 · «No, que corten»: no quiere pagar más de lo retenido. */
export async function mercNoMas(numero: string): Promise<R> {
  if (!(await mismoOrigen())) return SIN;
  const u = await yo(); if (!u) return SIN;
  return noMasMercado(u.id, String(numero ?? ""));
}
export async function mercCancelar(numero: string): Promise<R> {
  if (!(await mismoOrigen())) return SIN;
  const u = await yo(); if (!u) return SIN;
  return cancelarMercado(u.id, String(numero ?? ""));
}
