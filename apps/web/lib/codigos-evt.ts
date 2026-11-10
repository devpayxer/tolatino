import "server-only";
import { valor } from "./config";
import { db } from "./db";
import type { Bi } from "./evt-comun";

/* 6c · Códigos de descuento del organizador (evCodeDet: porcentaje o monto fijo, usos; «El descuento sale de lo tuyo»).
   - Aplicar un código (validarCodigo) tiene límite de intentos por persona y dispositivo (evt_codigo_intentos_max en 15 min): quien
     prueba códigos al azar se queda sin intentos; cada intento queda en discount_attempts (solo inserción).
   - El uso se aparta en el apartado (discount_codes.held_n) y se cuenta al pagar (used_n); la base no deja pasar del tope (check) y
     una persona usa un código una vez por evento (lib/boletos.ts lo revisa con la fila del código bloqueada).
   - El código de la plataforma (TOLATINO5 del prototipo) no existe (§6 #13): solo códigos del organizador. */
export const RE_CODIGO = /^[A-Z0-9]{3,16}$/;
export const normalizarCodigo = (x: unknown) => String(x ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
const no = (es: string, en: string) => ({ ok: false as const, msg: { es, en } as Bi });

export async function validarCodigo(userId: string, device: string | null, eventoId: string, raw: unknown): Promise<{ ok: true; id: string } | { ok: false; msg: Bi; intentos?: true }> {
  const code = normalizarCodigo(raw);
  const max = await valor("evt_codigo_intentos_max");
  const fallidos = (await db().query<{ n: number }>(
    `select count(*)::int as n from discount_attempts where not ok and at > now() - interval '15 minutes' and (user_id = $1 or ($2::uuid is not null and device = $2::uuid))`, [userId, device])).rows[0]?.n ?? 0;
  if (fallidos >= max) return { ...no("Demasiados códigos que no existen. Espera unos minutos y vuelve a intentarlo.", "Too many codes that do not exist. Wait a few minutes and try again."), intentos: true };
  const c = RE_CODIGO.test(code) ? (await db().query<{ id: string; status: string }>(`select id::text, status from discount_codes where event_id = $1::bigint and code = $2`, [eventoId, code])).rows[0] : undefined;
  await db().query(`insert into discount_attempts (user_id, device, event_id, ok) values ($1, $2, $3::bigint, $4)`, [userId, device, eventoId, !!c && c.status === "on"]);
  if (!c || c.status !== "on") return no("Ese código no existe para este evento.", "That code does not exist for this event.");
  return { ok: true, id: c.id };
}

/* ── Panel › Eventos › CÓDIGOS DE DESCUENTO ── */
export type CodigoPanel = { id: string; code: string; kind: "pct" | "amount"; value: number; usos: number; usados: number; apartados: number; on: boolean };
export async function codigosDelEvento(negocio: string, eventoId: string): Promise<CodigoPanel[]> {
  return (await db().query<CodigoPanel>(
    `select id::text, code, kind, value, uses_max as usos, used_n as usados, held_n as apartados, status = 'on' as on
       from discount_codes where business_id = $1 and event_id = $2::bigint order by created_at desc limit 50`, [negocio, eventoId])).rows;
}
export async function crearCodigo(negocio: string, userId: string, eventoId: string, x: { code: unknown; kind: unknown; value: unknown; usos: unknown }): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  const code = normalizarCodigo(x.code), kind = x.kind === "amount" ? "amount" : "pct", value = Math.floor(Number(x.value)), usos = Math.floor(Number(x.usos));
  if (!RE_CODIGO.test(code)) return no("El código lleva de 3 a 16 letras o números.", "The code has 3 to 16 letters or numbers.");
  if (kind === "pct" && !(value >= 5 && value <= 90)) return no("El porcentaje va de 5 % a 90 %.", "The percentage goes from 5% to 90%.");
  if (kind === "amount" && !(value >= 100 && value <= 50000)) return no("El monto va de $1 a $500.", "The amount goes from $1 to $500.");
  if (!(usos >= 1 && usos <= 10000)) return no("Los usos van de 1 a 10,000.", "Uses go from 1 to 10,000.");
  const e = (await db().query<{ city: string; entry: string }>(`select city_id as city, entry from events where id = $1::bigint and business_id = $2 and status not in ('cancelled', 'rejected', 'done')`, [eventoId, negocio])).rows[0];
  if (!e) return no("Ese evento no existe.", "That event does not exist.");
  if (e.entry !== "tickets") return no("Los códigos son para eventos con boletos.", "Codes are for ticketed events.");
  const r = await db().query(`insert into discount_codes (event_id, city_id, business_id, code, kind, value, uses_max, created_by) values ($1::bigint, $2, $3, $4, $5, $6, $7, $8) on conflict (event_id, code) do nothing`,
    [eventoId, e.city, negocio, code, kind, value, usos, userId]);
  if (!r.rowCount) return no("Ya tienes ese código en este evento.", "You already have that code for this event.");
  return { ok: true };
}
export async function cambiarCodigo(negocio: string, id: string, on: boolean): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!/^\d{1,18}$/.test(id)) return no("Ese código no existe.", "That code does not exist.");
  const r = await db().query(`update discount_codes set status = $3 where id = $1::bigint and business_id = $2`, [id, negocio, on ? "on" : "off"]);
  return r.rowCount ? { ok: true } : no("Ese código no existe.", "That code does not exist.");
}
