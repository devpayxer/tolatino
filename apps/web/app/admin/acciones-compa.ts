"use server";
/* 7c · Super Admin › El Compa · acciones: encender o pausar un nivel o un canal, pausar en una ciudad o un negocio (y levantar la pausa) y
   cambiar el tope. Permiso compa:aprobar (Admin); motivo obligatorio; auditoría en la misma transacción (lib/compa/interruptores.ts,
   lib/compa/admin-compa.ts → lib/config.ts). */
import { staff } from "@/lib/admin";
import { cambiarTope } from "@/lib/compa/admin-compa";
import { cambiarInterruptor, levantarPausa, NIVELES, pausarEn } from "@/lib/compa/interruptores";
import type { Uso } from "@/lib/compa/modelo";
import type { ResAdm } from "./acciones-colas";

const SIN: ResAdm = { ok: false, mensaje: "Tu rol no cambia los interruptores ni el tope de El Compa." };
const res = (r: { ok: boolean; msg: string }): ResAdm => (r.ok ? { ok: true, mensaje: r.msg } : { ok: false, mensaje: r.msg });

export async function compaInterruptor(clave: string, encender: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("compa", "aprobar")) return SIN;
  return res(await cambiarInterruptor(s, String(clave ?? ""), !!encender, String(motivo ?? "")));
}
export async function compaPausarEn(scope: string, donde: string, uso: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("compa", "aprobar")) return SIN;
  if (scope !== "city" && scope !== "business") return { ok: false, mensaje: "Eso no se pausa." };
  const u = NIVELES.includes(uso as Uso) ? (uso as Uso) : null;
  return res(await pausarEn(s, { scope, donde: String(donde ?? ""), uso: u }, String(motivo ?? "")));
}
export async function compaLevantar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("compa", "aprobar")) return SIN;
  return res(await levantarPausa(s, String(id ?? ""), String(motivo ?? "")));
}
export async function compaTope(dolares: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("compa", "aprobar")) return SIN;
  return res(await cambiarTope(s, String(dolares ?? ""), String(motivo ?? "")));
}
