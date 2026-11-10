import "server-only";
import { db } from "../db";
import { disponible } from "./interruptores";
import type { Canal, UsoTokens, Uso } from "./modelo";

/* 7c · El tope de gasto de El Compa (decisión F; fase7-compa.md §3 «Tope e interruptores»; guardián compaPorElTope y el de Costos de PLAN §5).
   Toda llamada al modelo pasa por gastar() ANTES y por anotarUso() DESPUÉS:
   - gastar(): vuelve a leer el interruptor del nivel, del canal, de la ciudad y del negocio, y reserva en la base el máximo que puede costar
     la llamada (compa_reservar: candado de la fila del mes, contra compa_tope_mes_cents leído en ese momento). Si no cabe, NO se llama:
     contestan las reglas fijas con «Con una persona». Con 20 a la vez, la suma nunca pasa del tope.
   - anotarUso(): liquida con los tokens que devolvió el proveedor (o lo reservado si no se sabe: tiempo agotado o red) y escribe el libro
     compa_usage (solo inserción, sin texto). Los precios salen de compa_models en la base: aquí no hay ninguno.
   - Alertas: al pasar compa_alerta_pct y al llegar al tope, aviso al equipo Admin (una vez al mes) y en Super Admin › Inicio. */
export type Reserva = { ok: true; id: string; modelo: string } | { ok: false; por: "cap" | "off" };

/* El modelo de cada papel (cotidiano = Haiku; copiloto = Sonnet), de compa_models. */
export async function modeloDe(uso: Uso): Promise<string | null> {
  return (await db().query<{ id: string }>(`select id from compa_models where role = $1 and status = 'on'`, [uso === "copilot" ? "copiloto" : "cotidiano"])).rows[0]?.id ?? null;
}

export async function gastar(x: { uso: Uso; canal: Canal; ciudad: string | null; negocio?: string | null; modelo: string; entradaMax: number; salidaMax: number }): Promise<Reserva> {
  const d = await disponible({ uso: x.uso, canal: x.canal, ciudad: x.ciudad, negocio: x.negocio ?? null });
  if (!d.ok) return { ok: false, por: "off" };
  const r = (await db().query<{ id: string | null }>(`select compa_reservar($1, $2, $3, $4)::text as id`, [x.uso, x.modelo, Math.ceil(x.entradaMax), Math.ceil(x.salidaMax)])).rows[0];
  if (!r?.id) {
    const primera = (await db().query<{ v: boolean }>(`select compa_marcar_tope() as v`)).rows[0]?.v;
    if (primera) await avisarTope("cap").catch(() => undefined);
    return { ok: false, por: "cap" };
  }
  return { ok: true, id: r.id, modelo: x.modelo };
}

export type Anotar = {
  reserva: string | null; conversacion: number | null; uso: Uso; ciudad: string | null; negocio?: string | null; userId?: string | null;
  modelo: string; tokens?: UsoTokens; ms: number; resultado: "ok" | "timeout" | "error" | "refusal" | "invalid" | "cap" | "off" | "limit"; cobrarReservado?: boolean;
};
export async function anotarUso(a: Anotar): Promise<void> {
  const t = a.tokens ?? { entrada: 0, cacheLeida: 0, cacheEscrita: 0, salida: 0 };
  const r = (await db().query<{ alerta: string | null }>(
    `select compa_anotar($1::uuid, $2::bigint, $3, $4, $5, $6::uuid, $7, $8, $9, $10, $11, $12, $13, $14) as alerta`,
    [a.reserva, a.conversacion, a.uso, a.ciudad, a.negocio ?? null, a.userId ?? null, a.modelo, Math.max(0, Math.round(t.entrada)), Math.max(0, Math.round(t.cacheLeida)),
      Math.max(0, Math.round(t.cacheEscrita)), Math.max(0, Math.round(t.salida)), Math.max(0, Math.round(a.ms)), a.resultado, !!a.cobrarReservado])).rows[0];
  if (r?.alerta === "pct") await avisarTope("pct").catch(() => undefined);
}

/* El gasto del mes (Super Admin). */
export type GastoMes = { mes: string; gastado: number; reservado: number; tope: number; alertaPct: number; pct: number; alertaEn: string | null; topeEn: string | null;
  porNivel: { uso: Uso; costo: number; llamadas: number; alTope: number; aReglas: number }[] };
export async function gastoDelMes(): Promise<GastoMes> {
  const [g, n] = await Promise.all([
    db().query<{ mes: string; gastado: string; reservado: string; tope: number; alerta: number; alerta_en: string | null; tope_en: string | null }>(
      `select compa_mes() as mes, coalesce(s.spent_microusd, 0)::text as gastado, coalesce(s.reserved_microusd, 0)::text as reservado,
              cfg_int('compa_tope_mes_cents') as tope, cfg_int('compa_alerta_pct') as alerta,
              to_char(s.alert_pct_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as alerta_en, to_char(s.alert_cap_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as tope_en
         from (select 1) x left join compa_spend_month s on s.month = compa_mes()`),
    db().query<{ uso: Uso; costo: string; llamadas: number; al_tope: number; a_reglas: number }>(
      `select use as uso, coalesce(costo_microusd, 0)::text as costo, llamadas, al_tope, a_reglas from compa_gasto_mes where month = compa_mes()`),
  ]);
  const x = g.rows[0]!, gastado = Number(x.gastado) / 10000, tope = x.tope;   // centavos (con decimales)
  return { mes: x.mes, gastado, reservado: Number(x.reservado) / 10000, tope, alertaPct: x.alerta, pct: tope > 0 ? Math.min(100, Math.floor((gastado / tope) * 100)) : 100,
    alertaEn: x.alerta_en, topeEn: x.tope_en,
    porNivel: n.rows.map((r) => ({ uso: r.uso, costo: Number(r.costo) / 10000, llamadas: r.llamadas, alTope: r.al_tope, aReglas: r.a_reglas })) };
}

const dinero = (centavos: number) => `$${(centavos / 100).toFixed(2)}`;
async function avisarTope(cual: "pct" | "cap") {
  const g = await gastoDelMes();
  const { avisar } = await import("../avisos");
  const admins = (await db().query<{ id: string }>(`select user_id::text as id from staff_members where role = 'admin' and status = 'active'`)).rows;
  for (const a of admins)
    await avisar(a.id, cual === "cap" ? "compa_tope_100" : "compa_tope_80", { pct: g.pct, gastado: dinero(g.gastado), tope: dinero(g.tope) }, { href: "/admin/compa", ref: ["compa", g.mes], sinSms: true });
}
