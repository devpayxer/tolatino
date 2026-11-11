"use server";
/* 7c · Super Admin › El Compa · acciones: encender o pausar un nivel o un canal, pausar en una ciudad o un negocio (y levantar la pausa) y
   cambiar el tope. Permiso compa:aprobar (Admin); motivo obligatorio; auditoría en la misma transacción (lib/compa/interruptores.ts,
   lib/compa/admin-compa.ts → lib/config.ts).
   7f · «Apagar El Compa aquí»: en un NEGOCIO (las respuestas automáticas; la pausa del negocio de 7c con el nivel auto_reply; compa:aprobar; aviso
   al dueño con el motivo, que apela por Soporte) y en UNA conversación de Mensajes reportada (quien decide esos casos — colas:aprobar — o el
   equipo de El Compa — compa:editar; encenderla otra vez, compa:aprobar). Motivo obligatorio y auditoría. */
import { staff } from "@/lib/admin";
import { cambiarTope, decidirNoSupo, marcarConversacion, quitarMarca } from "@/lib/compa/admin-compa";
import { db } from "@/lib/db";
import { apagarEnHilo, cambiarInterruptor, levantarPausa, NIVELES, pausaAuto, pausarEn } from "@/lib/compa/interruptores";
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

export async function compaAutoNegocio(negocio: string, apagar: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("compa", "aprobar")) return SIN;
  const id = String(negocio ?? "").trim().slice(0, 80);
  const b = (await db().query<{ name: string }>(`select name from businesses where id = $1`, [id])).rows[0];
  if (!b) return { ok: false, mensaje: "Ese negocio no existe." };
  if (apagar) {
    const r = await pausarEn(s, { scope: "business", donde: id, uso: "auto_reply" }, String(motivo ?? ""));
    if (!r.ok) return res(r);
    await (await import("@/lib/avisos")).avisarNegocio(id, "compa_auto_apagado", { negocio: b.name, motivo: String(motivo ?? "").trim().slice(0, 200) }, { href: `/panel/${id}/compa` }).catch(() => undefined);
    return { ok: true, mensaje: `Respuestas automáticas apagadas en ${b.name}. El dueño recibió el motivo; sus clientes vuelven a la respuesta de siempre.` };
  }
  const p = await pausaAuto(id);
  if (!p) return { ok: false, mensaje: "To'Latino no las tiene apagadas ahí." };
  const r = await levantarPausa(s, p.id, String(motivo ?? ""));
  if (!r.ok) return res(r);
  await (await import("@/lib/avisos")).avisarNegocio(id, "compa_auto_levantado", { negocio: b.name }, { href: `/panel/${id}/compa` }).catch(() => undefined);
  return { ok: true, mensaje: `Listo: ${b.name} puede volver a usar las respuestas automáticas.` };
}
export async function compaHilo(caso: string, encender: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !(encender ? s.puede("compa", "aprobar") : s.puede("colas", "aprobar") || s.puede("compa", "editar"))) return SIN;
  // Solo la conversación de un caso ABIERTO de «Mensajes reportados» que esa persona del equipo puede ver (su ciudad).
  const q = /^\d{1,18}$/.test(String(caso ?? "")) ? (await db().query<{ hilo: string; city: string | null }>(
    `select subject_id as hilo, city_id as city from queue_items where id = $1 and queue = 'chat' and subject_kind = 'chat_thread' and status = 'open'`, [caso])).rows[0] : undefined;
  if (!q || (s.cities.length && (!q.city || !s.cities.includes(q.city)))) return { ok: false, mensaje: "Ese caso no existe o ya se decidió." };
  return res(await apagarEnHilo(s, q.hilo, !!encender, String(motivo ?? "")));
}

/* 7h · Canales (WhatsApp y SMS): conectar o retirar un número que recibe (de To'Latino o de un negocio) y el simulador del sandbox. Conectar y
   retirar: compa:aprobar, motivo y auditoría. El simulador: compa:aprobar, nunca en producción (lo revisa lib/compa/canales.ts) y anotado. */
export async function compaNumero(tipo: string, valor: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("compa", "aprobar")) return SIN;
  const [canal, proveedor] = String(tipo ?? "").split(":");
  const [numero, negocio] = String(valor ?? "").split(",").map((x) => x.trim());
  const { agregarNumero } = await import("@/lib/compa/canales");
  return res(await agregarNumero(s, { canal: canal ?? "", proveedor: proveedor ?? "", numero: numero ?? "", negocio: negocio ?? "" }, String(motivo ?? "")));
}
export async function compaNumeroRetirar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("compa", "aprobar")) return SIN;
  const { retirarNumero } = await import("@/lib/compa/canales");
  return res(await retirarNumero(s, String(id ?? ""), String(motivo ?? "")));
}
export async function compaSimular(numero: string, telefono: string, texto: string): Promise<import("@/lib/compa/canales").Simulado> {
  const s = await staff();
  if (!s || !s.puede("compa", "aprobar")) return { ok: false, msg: "Tu rol no usa el simulador." };
  const { simular } = await import("@/lib/compa/canales");
  return simular(s, { numero: String(numero ?? ""), telefono: String(telefono ?? "").slice(0, 20), texto: String(texto ?? "").slice(0, 1000) });
}

/* 7i · «Marcar respuesta incorrecta» / «Quitar la marca» en la ficha de una conversación y «Anotado» / «Corregido en {artículo}» en «Lo que El
   Compa no supo»: compa:editar (Admin y Soporte; la función lo vuelve a revisar con sus ciudades), motivo y auditoría. */
const SIN_MARCA: ResAdm = { ok: false, mensaje: "Tu rol ve las cifras de El Compa; marcar es de Admin y Soporte." };
export async function compaMarcar(numero: string, motivo: string, nota: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("compa", "editar")) return SIN_MARCA;
  return res(await marcarConversacion(s, String(numero ?? ""), String(motivo ?? ""), String(nota ?? "")));
}
export async function compaDesmarcar(numero: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("compa", "editar")) return SIN_MARCA;
  return res(await quitarMarca(s, String(numero ?? ""), String(motivo ?? "")));
}
export async function compaNoSupo(id: string, accion: string, nota: string, slug: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("compa", "editar")) return SIN_MARCA;
  if (accion !== "noted" && accion !== "fixed") return { ok: false, mensaje: "Eso no se puede." };
  return res(await decidirNoSupo(s, String(id ?? ""), accion, { nota: String(nota ?? ""), slug: String(slug ?? "") }));
}
