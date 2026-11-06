"use server";
import { avisarMesa } from "@/lib/avisos";
import { mismoOrigen } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { rsvCambio, rsvPaso, type PasoMesa } from "@/lib/reservas";
import type { Res } from "./acciones";

/* Reservaciones desde el panel (Panel v2 · Hoy, Clientes y Lo que vendes › Reservaciones). Responder y marcar llegadas
   pide «Hoy y pedidos» (ord); los ajustes, «Lo que vendes» (cat). Todo queda en la auditoría. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const PASOS = new Set<PasoMesa>(["confirmar", "otra", "nohay", "llegaron", "nollegaron", "sefueron"]);
const PASO_L: Record<PasoMesa, string> = { confirmar: "Confirmada", otra: "Otra hora propuesta", nohay: "Sin mesa", llegaron: "Llegaron", nollegaron: "No llegaron", sefueron: "Se fueron" };

async function entrar(id: unknown, parte: string): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, parte) : null;
}
async function auditar(a: Acceso, action: string, before: unknown, after: unknown) {
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb, $6::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(before ?? null), JSON.stringify(after ?? null)]);
}

/* Responder al cambio que pidió el cliente en una reservación confirmada. */
export async function mesaCambio(id: string, numero: string, que: "aceptar" | "rechazar"): Promise<Res> {
  const a = await entrar(id, "ord");
  if (!a) return SIN_ACCESO;
  if (que !== "aceptar" && que !== "rechazar") return no("Esa acción no existe.", "That action does not exist.");
  const r = await rsvCambio(a.negocio.id, String(numero ?? ""), que, a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, `reserva.cambio.${que}`, { reservacion: numero }, { reservacion: numero, cambio: que === "aceptar" ? "Aceptado" : "No se pudo" });
  await avisarMesa(String(numero), que === "aceptar" ? "rsv_chg_ok" : "rsv_chg_no");
  return { ok: true };
}
export async function mesaPaso(id: string, numero: string, paso: PasoMesa): Promise<Res> {
  const a = await entrar(id, "ord");
  if (!a) return SIN_ACCESO;
  if (!PASOS.has(paso)) return no("Esa acción no existe.", "That action does not exist.");
  const r = await rsvPaso(a.negocio.id, String(numero ?? ""), paso, a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, `reserva.${paso}`, { reservacion: numero }, { reservacion: numero, paso: PASO_L[paso] });
  const AV = { confirmar: "rsv_ok", otra: "rsv_alt", nohay: "rsv_no" } as const;
  if (paso in AV) await avisarMesa(String(numero), AV[paso as keyof typeof AV]);
  return { ok: true };
}

export async function reservasModulo(id: string, on: boolean): Promise<Res> {
  const a = await entrar(id, "cat");
  if (!a) return SIN_ACCESO;
  await db().query(
    `update businesses set modules_on = case when $2 then array(select distinct x from unnest(modules_on || array['rsv']) x) else array_remove(modules_on, 'rsv') end, updated_at = now() where id = $1`,
    [a.negocio.id, !!on]);
  await auditar(a, on ? "reservas.encender" : "reservas.apagar", null, { modulo: "Reservaciones", estado: on ? "Encendido" : "Apagado" });
  return { ok: true };
}

export type AjustesIn = {
  ar: Record<string, { on: boolean; t: Record<string, number> }>; join: boolean; joinMax: number; walk: number; dur: number; days: number[];
  sv: Record<string, { on: boolean; f: number; t: number }>; auto: boolean; tol: number; cxH: number; minH: number; maxD: number; resp: number;
};
const AREAS = ["salon", "terraza", "barra"], TURNOS = ["almuerzo", "cena"];
export async function reservasAjustes(id: string, d: AjustesIn): Promise<Res> {
  const a = await entrar(id, "cat");
  if (!a) return SIN_ACCESO;
  const ar = Object.fromEntries(AREAS.map((k) => {
    const x = d?.ar?.[k], t = Object.fromEntries([2, 4, 6, 8].map((z) => [z, Math.max(0, Math.min(40, Math.round(Number(x?.t?.[z]) || 0)))]));
    return [k, { on: !!x?.on, t }];
  }));
  const conMesas = AREAS.some((k) => ar[k]!.on && Object.values(ar[k]!.t).some((n) => n > 0));
  const sv = Object.fromEntries(TURNOS.map((k) => { const x = d?.sv?.[k]; return [k, { on: !!x?.on, f: Math.round(Number(x?.f)), t: Math.round(Number(x?.t)) }]; }));
  const days = Array.isArray(d?.days) ? [...new Set(d.days.map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort() : [];
  const faltan = [!conMesas ? ["mesas en al menos un área", "tables in at least one area"] : null, !TURNOS.some((k) => sv[k]!.on) ? ["al menos un turno", "at least one shift"] : null, !days.length ? ["al menos un día", "at least one day"] : null].filter(Boolean) as string[][];
  if (faltan.length) return no(`Para guardar falta: ${faltan.map((x) => x[0]).join(" · ")}.`, `To save, add: ${faltan.map((x) => x[1]).join(" · ")}.`);
  for (const k of TURNOS) { const x = sv[k]!; if (x.on && !(x.f >= 0 && x.t <= 1410 && x.f % 30 === 0 && x.t % 30 === 0 && x.t >= x.f)) return no("Revisa las horas de los turnos.", "Check the shift times."); }
  if (sv.almuerzo!.on && sv.cena!.on && sv.cena!.f <= sv.almuerzo!.t) return no("Los turnos se cruzan: la cena empieza antes de la última mesa del almuerzo.", "Shifts overlap: dinner starts before the last lunch table.");
  const pick = (v: number, ok: number[], def: number) => (ok.includes(Math.round(Number(v))) ? Math.round(Number(v)) : def);
  const vals = {
    join: !!d.join, joinMax: Math.max(2, Math.min(40, Math.round(Number(d.joinMax) || 8))), walk: Math.max(0, Math.min(40, Math.round(Number(d.walk) || 0))),
    dur: pick(d.dur, [60, 90, 120], 90), auto: !!d.auto, tol: pick(d.tol, [10, 15, 20, 30], 15), cxH: pick(d.cxH, [1, 2, 4, 24], 2), minH: pick(d.minH, [1, 2, 24], 1),
    maxD: pick(d.maxD, [7, 14, 30], 14), resp: pick(d.resp, [5, 10, 15, 30], 10),
  };
  await tx(async (c) => {
    await c.query(
      `insert into reservation_settings (business_id, areas, join_tables, join_max, walk_in, dur_min, days, periods, auto_confirm, hold_min, cancel_free_h, min_ahead_h, max_days, reply_min)
       values ($1, $2::jsonb, $3, $4, $5, $6, $7::smallint[], $8::jsonb, $9, $10, $11, $12, $13, $14)
       on conflict (business_id) do update set areas = $2::jsonb, join_tables = $3, join_max = $4, walk_in = $5, dur_min = $6, days = $7::smallint[], periods = $8::jsonb, auto_confirm = $9,
         hold_min = $10, cancel_free_h = $11, min_ahead_h = $12, max_days = $13, reply_min = $14, updated_at = now()`,
      [a.negocio.id, JSON.stringify(ar), vals.join, vals.joinMax, vals.walk, vals.dur, days, JSON.stringify(sv), vals.auto, vals.tol, vals.cxH, vals.minH, vals.maxD, vals.resp]);
  });
  const mesas = AREAS.filter((k) => ar[k]!.on).map((k) => `${k === "salon" ? "Salón" : k === "terraza" ? "Terraza" : "Barra"}: ${Object.entries(ar[k]!.t).filter(([, n]) => n > 0).map(([z, n]) => `${n} de ${z}`).join(", ")}`).join(" · ");
  await auditar(a, "reservas.ajustes", null, { mesas, dura: `${vals.dur} min`, confirmar_al_instante: vals.auto ? "Sí" : "No", guardan_la_mesa: `${vals.tol} min`, cancelar_gratis: `${vals.cxH} h antes` });
  return { ok: true };
}

/* Días sin reservaciones: cerrar un día, un turno o un área (y quitar el cierre). */
export async function reservasBloqueo(id: string, p: { dia?: string; turno?: string; area?: string; quitar?: string }): Promise<Res> {
  const a = await entrar(id, "cat");
  if (!a) return SIN_ACCESO;
  if (p?.quitar) {
    if (!/^\d{1,18}$/.test(p.quitar)) return no("Ese cierre no existe.", "That closure does not exist.");
    await db().query(`update reservation_blocks set removed_at = now() where id = $1::bigint and business_id = $2 and removed_at is null`, [p.quitar, a.negocio.id]);
    await auditar(a, "reservas.abrir_dia", { cierre: p.quitar }, null);
    return { ok: true };
  }
  const dia = String(p?.dia ?? ""), turno = String(p?.turno ?? "all"), area = String(p?.area ?? "all");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !["all", "almuerzo", "cena"].includes(turno) || !["all", ...AREAS].includes(area)) return no("Elige el día, el turno y el área.", "Pick the day, shift and area.");
  const ok = await db().query(
    `insert into reservation_blocks (business_id, day, period, area, created_by)
     select $1, $2::date, $3, $4, $5 from businesses b join cities c on c.id = b.city_id where b.id = $1 and $2::date >= (now() at time zone c.timezone)::date returning id`,
    [a.negocio.id, dia, turno, area, a.yo.id]);
  if (!ok.rowCount) return no("Ese día ya pasó.", "That day has passed.");
  await auditar(a, "reservas.cerrar_dia", null, { dia, turno: turno === "all" ? "Todo el día" : turno === "almuerzo" ? "Almuerzo" : "Cena", area: area === "all" ? "Todas" : area === "salon" ? "Salón" : area === "terraza" ? "Terraza" : "Barra" });
  return { ok: true };
}
