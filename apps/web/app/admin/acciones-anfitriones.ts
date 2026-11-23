"use server";
/* Super Admin › Contenido › Anfitriones (decisión AO): encender y apagar cada voz y editar su estilo, los tipos de publicación, la pregunta del día,
   el control por ciudad y «Pausar a todos». Todo lo decide lib/anfitriones.ts (permiso, límites y auditoría con motivo). Nada aquí llama al modelo. */
import { revalidatePath } from "next/cache";
import { staff } from "@/lib/admin";
import { ciudadCambiar, pausarTodos, preguntaAgregar, preguntaRetirar, tipoCambiar, vozCambiar, type ResAnf } from "@/lib/anfitriones";
import type { ResAdm } from "./acciones-colas";

const fin = (r: ResAnf): ResAdm => { if (r.ok) revalidatePath("/admin/contenido"); return r.ok ? { ok: true, mensaje: r.mensaje } : { ok: false, mensaje: r.mensaje ?? "No se pudo." }; };
const sinRol: ResAdm = { ok: false, mensaje: "Tu rol no puede hacer esto." };

export async function anfVoz(id: string, p: { active?: boolean; style?: string }, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s) return sinRol;
  return fin(await vozCambiar(s, String(id ?? ""), { active: typeof p?.active === "boolean" ? p.active : undefined, style: typeof p?.style === "string" ? p.style : undefined }, String(motivo ?? "")));
}
export async function anfTipo(key: string, active: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s) return sinRol;
  return fin(await tipoCambiar(s, String(key ?? ""), active === true, String(motivo ?? "")));
}
export async function anfPregunta(body: string, voz: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s) return sinRol;
  return fin(await preguntaAgregar(s, String(body ?? ""), String(voz ?? ""), String(motivo ?? "")));
}
export async function anfPreguntaRetirar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s) return sinRol;
  return fin(await preguntaRetirar(s, String(id ?? ""), String(motivo ?? "")));
}
export async function anfCiudad(ciudad: string, mode: string, mp: number, mr: number, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s) return sinRol;
  return fin(await ciudadCambiar(s, String(ciudad ?? ""), { mode: String(mode ?? ""), mp: Number(mp), mr: Number(mr) }, String(motivo ?? "")));
}
export async function anfPausa(pausa: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s) return sinRol;
  return fin(await pausarTodos(s, pausa === true, String(motivo ?? "")));
}
