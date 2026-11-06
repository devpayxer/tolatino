"use server";
import { avisarNegocio } from "@/lib/avisos";
import { db } from "@/lib/db";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { ENTORNO } from "@/lib/entorno";
import { rsvEnviar, rsvHoras, rsvRapido, rsvRetener, type DetallesIn } from "@/lib/reservas";

/* Reservar mesa desde la ficha (pestaña Reservaciones). Ver las horas no pide cuenta; retener y enviar sí. El servidor
   vuelve a revisar la mesa en cada paso: nadie reserva una mesa ocupada aunque dos lo intenten a la vez. */
type Bi = { es: string; en: string };
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NO_ORIGEN: Bi = { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." };

// solo lectura
export async function horasMesa(negocio: string, i: number, p: number, area: string, editar?: string | null) {
  if (typeof negocio !== "string" || !ID.test(negocio)) return { grupos: [], siguientes: [] };
  return rsvHoras(negocio, Number(i) || 0, Number(p) || 2, String(area ?? ""), typeof editar === "string" && /^R-\d{1,10}$/.test(editar) ? editar : null);
}

// solo lectura
export async function rapidoMesa(negocio: string, p: number) {
  if (typeof negocio !== "string" || !ID.test(negocio)) return { i: 0, horas: [] };
  return rsvRapido(negocio, Math.max(1, Math.min(40, Number(p) || 2)));
}

export async function retenerMesa(negocio: string, i: number, h: number, p: number, area: string, editar?: string | null): Promise<{ ok: true; hold: string; area: string; vence: string } | { ok: false; msg: Bi; entrar?: true }> {
  if (!(await mismoOrigen())) return { ok: false, msg: NO_ORIGEN };
  const u = await yo();
  if (!u?.first_name) return { ok: false, entrar: true, msg: { es: "Entra para reservar.", en: "Sign in to book." } };
  if (typeof negocio !== "string" || !ID.test(negocio)) return { ok: false, msg: { es: "Ese restaurante no existe.", en: "That restaurant does not exist." } };
  return rsvRetener(u.id, negocio, Number(i), Number(h), Number(p), String(area ?? ""), typeof editar === "string" && /^R-\d{1,10}$/.test(editar) ? editar : null);
}

export async function enviarMesa(hold: string, f: DetallesIn): Promise<{ ok: true; numero: string } | { ok: false; msg: Bi; entrar?: true }> {
  if (!(await mismoOrigen())) return { ok: false, msg: NO_ORIGEN };
  const u = await yo();
  if (!u?.first_name) return { ok: false, entrar: true, msg: { es: "Entra para reservar.", en: "Sign in to book." } };
  const r = await rsvEnviar(u.id, String(hold ?? ""), f && typeof f === "object" ? f : {}, ENTORNO);
  if (r.ok && r.cambio === "pend") await avisarCambio(r.numero, u.first_name);
  else if (r.ok && !r.cambio) await avisarDeMesa(r.numero, u.first_name);
  return r;
}

/* El cliente pidió cambiar una reservación confirmada: al negocio, con la hora que pide y cuánto tiene para responder. */
async function avisarCambio(numero: string, cliente: string) {
  const o = (await db().query<{ biz: string; dia: string; hora: string; min: number }>(
    `select o.business_id as biz, to_char((p.proposed->>'ymd')::date, 'FMDD/FMMM') as dia, p.proposed->>'at' as hora, greatest(1, ceil(extract(epoch from p.respond_by - now()) / 60))::int as min
       from operations o join change_proposals p on p.operation_id = o.id and p.side = 'customer' and p.status = 'open' where o.number = $1 and o.kind = 'table'`, [numero]).catch(() => ({ rows: [] }))).rows[0];
  if (!o) return;
  const [h, m] = o.hora.split(":").map(Number);
  await avisarNegocio(o.biz, "biz_rsv_chg", { cliente, num: numero, dia: o.dia, hora: `${(h! % 12) || 12}:${String(m ?? 0).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`, min: o.min }, { href: `/panel/${o.biz}/hoy?det=rsv:${numero}`, ref: ["table", numero] });
}
async function avisarDeMesa(numero: string, cliente: string) {
  const o = (await db().query<{ biz: string; st: string }>(`select business_id as biz, status as st from operations where number = $1 and kind = 'table'`, [numero]).catch(() => ({ rows: [] }))).rows[0];
  if (o) await avisarNegocio(o.biz, "biz_req", { tipo: "reservación", cliente, min: 10 }, { href: `/panel/${o.biz}/hoy?det=rsv:${numero}`, ref: ["table", numero] });
}
