"use server";
import { revalidatePath } from "next/cache";
import { requerir } from "@/lib/admin";
import {
  ajustarCiudad, cambiarRegla, cancelarAsistente, confirmarPaso, decidirCierre, guardarBarrio, invitarBeta, pedirCierre, ponerEnBeta, quitarInvitacion, retirarBarrio, retirarCierre,
} from "@/lib/ciudades/apertura";
import type { Res } from "@/lib/ciudades/comun";

/* 9i · Super Admin › Ciudades: cada acción revisa el permiso del equipo (requerir) y la regla la decide lib/ciudades/apertura.ts (con su auditoría). */
const otra = (id: string) => { revalidatePath("/admin/ciudades"); revalidatePath(`/admin/ciudades/${id}`); };
const C = (x: unknown) => String(x ?? "").slice(0, 3);

export async function ciudadPaso(ciudad: string, paso: number, motivo: string, abrirIgual: boolean): Promise<Res> {
  const s = await requerir("ciud", "aprobar");
  const r = await confirmarPaso(s, C(ciudad), Number(paso), String(motivo ?? ""), abrirIgual === true);
  if (r.ok) otra(C(ciudad));
  return r;
}
export async function ciudadCancelarAsistente(ciudad: string, motivo: string): Promise<Res> {
  const s = await requerir("ciud", "aprobar");
  const r = await cancelarAsistente(s, C(ciudad), String(motivo ?? ""));
  if (r.ok) otra(C(ciudad));
  return r;
}
export async function ciudadBeta(ciudad: string, motivo: string): Promise<Res> {
  const s = await requerir("ciud", "aprobar");
  const r = await ponerEnBeta(s, C(ciudad), String(motivo ?? ""));
  if (r.ok) otra(C(ciudad));
  return r;
}
export async function ciudadInvitar(ciudad: string, telefono: string, motivo: string): Promise<Res> {
  const s = await requerir("ciud", "aprobar");
  const r = await invitarBeta(s, C(ciudad), String(telefono ?? ""), String(motivo ?? ""));
  if (r.ok) otra(C(ciudad));
  return r;
}
export async function ciudadQuitarInvitacion(ciudad: string, invitacion: string, motivo: string): Promise<Res> {
  const s = await requerir("ciud", "aprobar");
  const r = await quitarInvitacion(s, String(invitacion ?? ""), String(motivo ?? ""));
  if (r.ok) otra(C(ciudad));
  return r;
}
export async function ciudadPedirCierre(ciudad: string, a: string, motivo: string): Promise<Res> {
  const s = await requerir("ciud", "aprobar");
  const r = await pedirCierre(s, C(ciudad), String(a ?? ""), String(motivo ?? ""));
  if (r.ok) otra(C(ciudad));
  return r;
}
export async function ciudadDecidirCierre(ciudad: string, pedido: string, aprobar: boolean, motivo: string): Promise<Res> {
  const s = await requerir("ciud", "aprobar");
  const r = await decidirCierre(s, String(pedido ?? ""), aprobar === true, String(motivo ?? ""));
  if (r.ok) otra(C(ciudad));
  return r;
}
export async function ciudadRetirarCierre(ciudad: string, pedido: string, motivo: string): Promise<Res> {
  const s = await requerir("ciud", "aprobar");
  const r = await retirarCierre(s, String(pedido ?? ""), String(motivo ?? ""));
  if (r.ok) otra(C(ciudad));
  return r;
}
export async function ciudadRegla(ciudad: string, v: { listos: number; espera: number; cats: Record<string, number> }, motivo: string): Promise<Res> {
  const s = await requerir("ciud", "aprobar");
  const r = await cambiarRegla(s, C(ciudad), v, String(motivo ?? ""));
  if (r.ok) otra(C(ciudad));
  return r;
}
export async function ciudadAjuste(ciudad: string, campo: string, valor: string, motivo: string): Promise<Res> {
  const s = await requerir("ciud", "editar");
  const r = await ajustarCiudad(s, C(ciudad), String(campo ?? ""), String(valor ?? ""), String(motivo ?? ""));
  if (r.ok) otra(C(ciudad));
  return r;
}
export async function ciudadBarrio(ciudad: string, b: { id?: string | null; es: string; en: string; calleEs: string; calleEn: string; lat: number; lng: number }, motivo: string): Promise<Res> {
  const s = await requerir("ciud", "editar");
  const r = await guardarBarrio(s, C(ciudad), b, String(motivo ?? ""));
  if (r.ok) otra(C(ciudad));
  return r;
}
export async function ciudadRetirarBarrio(ciudad: string, zona: string, motivo: string): Promise<Res> {
  const s = await requerir("ciud", "editar");
  const r = await retirarBarrio(s, String(zona ?? ""), String(motivo ?? ""));
  if (r.ok) otra(C(ciudad));
  return r;
}
