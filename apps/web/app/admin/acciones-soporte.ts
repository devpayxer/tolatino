"use server";
/* 7b · Super Admin › Soporte: cada acción revisa primero quién es (staff()) y lib/soporte-equipo vuelve a revisar el permiso de la matriz
   (sección «sop»), la ciudad del caso y el estado, cambia y deja la auditoría en la misma transacción. «Resolver y devolver» pasa por
   devolverPago con la llave del intento; el tope del rol lo pone la base. */
import { revalidatePath } from "next/cache";
import { staff } from "@/lib/admin";
import * as S from "@/lib/soporte-equipo";

type R = S.ResE;
const SIN: R = { ok: false, mensaje: "Entra con tu cuenta del equipo." };
const listo = (r: R) => { if (r.ok) { revalidatePath("/admin/soporte"); revalidatePath("/admin/colas"); revalidatePath("/admin"); } return r; };

export async function sopTomar(numero: string): Promise<R> { const s = await staff(); if (!s) return SIN; return listo(await S.tomar(s, String(numero ?? ""))); }
export async function sopTomarSiguiente(): Promise<R> { const s = await staff(); if (!s) return SIN; return listo(await S.tomarSiguienteSop(s)); }
export async function sopResponder(numero: string, texto: string, macro?: string | null, borrador?: string | null): Promise<R> {
  const s = await staff(); if (!s) return SIN;
  return listo(await S.responder(s, String(numero ?? ""), String(texto ?? ""), macro ? String(macro) : null, borrador ? String(borrador) : null));
}
export async function sopNota(numero: string, texto: string): Promise<R> { const s = await staff(); if (!s) return SIN; return listo(await S.notaInterna(s, String(numero ?? ""), String(texto ?? ""))); }
export async function sopResolver(numero: string, texto: string): Promise<R> { const s = await staff(); if (!s) return SIN; return listo(await S.resolver(s, String(numero ?? ""), String(texto ?? ""))); }
export async function sopDevolver(numero: string, monto: string, clave: string, texto: string): Promise<R> {
  const s = await staff(); if (!s) return SIN;
  return listo(await S.resolverYDevolver(s, String(numero ?? ""), String(monto ?? ""), String(clave ?? ""), String(texto ?? "")));
}
export async function sopEscalar(numero: string, a: string, motivo: string): Promise<R> { const s = await staff(); if (!s) return SIN; return listo(await S.pasarAFinanzas(s, String(numero ?? ""), String(a ?? ""), String(motivo ?? ""))); }
export async function sopUnir(numero: string, destino: string, motivo: string): Promise<R> { const s = await staff(); if (!s) return SIN; return listo(await S.unir(s, String(numero ?? ""), String(destino ?? ""), String(motivo ?? ""))); }
export async function sopReabrir(numero: string, motivo: string): Promise<R> { const s = await staff(); if (!s) return SIN; return listo(await S.reabrir(s, String(numero ?? ""), String(motivo ?? ""))); }
export async function sopLigar(numero: string, ref: string, motivo: string): Promise<R> { const s = await staff(); if (!s) return SIN; return listo(await S.ligar(s, String(numero ?? ""), String(ref ?? ""), String(motivo ?? ""))); }
export async function sopOcultar(numero: string, id: string, motivo: string): Promise<R> { const s = await staff(); if (!s) return SIN; return listo(await S.ocultarMensaje(s, String(numero ?? ""), String(id ?? ""), String(motivo ?? ""))); }
export async function sopMacroGuardar(x: { key?: string | null; tituloEs: string; tituloEn: string; textoEs: string; textoEn: string; tema?: string | null }, motivo: string): Promise<R> {
  const s = await staff(); if (!s) return SIN;
  return listo(await S.guardarMacro(s, x, String(motivo ?? "")));
}
export async function sopMacroEstado(key: string, on: boolean, motivo: string): Promise<R> { const s = await staff(); if (!s) return SIN; return listo(await S.estadoMacro(s, String(key ?? ""), on === true, String(motivo ?? ""))); }
