import "server-only";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import type { DiaFiesta, HerrFiesta } from "./fiestas-comun";

/* Fiestas (Fase 4 · bloque 4t). Plan: docs/diseno/plan/fase4-fiestas-transporte.md §2 y §4t. Diseño: neg-fiesta.js
   (busy, dep, cap, zone), dash2-cat.js TOOLS['NEG-FIESTA'] «Calendario y depósito».
   - Una fecha está OCUPADA si el negocio la marcó o si sus reservas confirmadas de ese día ya llenan los eventos por día.
     Se deriva siempre; nadie la escribe a mano. Un día con una reserva confirmada no se puede «liberar».
   - Los filtros de Buscar («Libre este sábado», paquete, montaje…) salen de aquí y de los servicios; se recalculan al guardar
     y cada vez que alguien mira la página de la categoría (las fechas cambian solas a medianoche de la ciudad). */
type Q = Pool | PoolClient;
const SEMANAS = 9;

/* Las fechas desde hoy (ciudad del negocio) hasta N días: marcadas, con reservas y si están ocupadas. */
export async function diasOcupados(negocio: string, desde: string, hasta: string, c: Q = db()): Promise<DiaFiesta[]> {
  const per = Number((await c.query<{ n: number }>(`select coalesce((select events_per_day from fiesta_settings where business_id = $1), 1)::int as n`, [negocio])).rows[0]!.n);
  const R = (await c.query<{ day: string; manual: boolean; nums: string[] }>(
    `select p.day::text as day, bool_or(p.source = 'manual') as manual,
            coalesce(array_agg(o.number order by o.number) filter (where p.source = 'booking'), '{}') as nums
       from party_days p left join operations o on o.id = p.operation_id
      where p.business_id = $1 and p.removed_at is null and p.day between $2::date and $3::date group by p.day order by p.day`, [negocio, desde, hasta])).rows;
  return R.map((x) => ({ day: x.day, manual: x.manual, reservas: x.nums.map((num) => ({ num })), ocupada: x.manual || x.nums.length >= per }));
}

export async function herramientaFiesta(negocio: string, c: Q = db()): Promise<HerrFiesta | null> {
  const b = (await c.query<{ cat: string; zone: number | null; hoy: string }>(
    `select b.category_id as cat, b.service_radius_mi as zone, (now() at time zone ci.timezone)::date::text as hoy from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0];
  if (!b || b.cat !== "NEG-FIESTA") return null;
  const s = (await c.query<{ dep: number; guests: number | null; per: number; ahead: number; cancel: number }>(
    `select deposit_cents as dep, guests_max as guests, events_per_day as per, book_ahead_days as ahead, cancel_full_days as cancel from fiesta_settings where business_id = $1`, [negocio])).rows[0];
  const hasta = (await c.query<{ d: string }>(`select ($1::date + ($2::int * 7))::text as d`, [b.hoy, SEMANAS])).rows[0]!.d;
  return { dep: s?.dep ?? 0, guests: s?.guests ?? null, perDay: s?.per ?? 1, ahead: s?.ahead ?? 180, cancel: s?.cancel ?? 30, zone: b.zone, hoy: b.hoy,
    dias: await diasOcupados(negocio, b.hoy, hasta, c), cambiado: !!s };
}

/* Marcar o liberar un día (Tu herramienta). No libera un día con reserva confirmada. */
export async function marcarDia(c: PoolClient, negocio: string, dia: string, ocupada: boolean, actor: string): Promise<{ ok: true } | { ok: false; es: string; en: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return { ok: false, es: "Esa fecha no es válida.", en: "That date is not valid." };
  const b = (await c.query<{ city: string; ok: boolean }>(
    `select b.city_id as city, $2::date between (now() at time zone ci.timezone)::date and (now() at time zone ci.timezone)::date + 730 as ok
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio, dia])).rows[0];
  if (!b?.ok) return { ok: false, es: "Elige una fecha de hoy en adelante (hasta 2 años).", en: "Pick a date from today on (up to 2 years)." };
  if (ocupada) {
    await c.query(`insert into party_days (business_id, city_id, day, source, created_by) values ($1, $2, $3::date, 'manual', $4) on conflict do nothing`, [negocio, b.city, dia, actor]);
    return { ok: true };
  }
  const r = (await c.query<{ num: string }>(
    `select o.number as num from party_days p join operations o on o.id = p.operation_id where p.business_id = $1 and p.day = $2::date and p.source = 'booking' and p.removed_at is null limit 1`, [negocio, dia])).rows[0];
  if (r) return { ok: false, es: `Ese día tienes la fiesta ${r.num}; cancélala primero.`, en: `You have party ${r.num} that day; cancel it first.` };
  await c.query(`update party_days set removed_at = now() where business_id = $1 and day = $2::date and source = 'manual' and removed_at is null`, [negocio, dia]);
  return { ok: true };
}

/* Los filtros de Fiestas que salen de los datos (nunca se editan a mano). Los demás (esp, finde, noche, niños, y10, cita…)
   salen del horario, la subcategoría o el catálogo y se conservan. */
const DER = ["d:sab", "d:dom", "d:sab2", "paquete", "montaje", "traslado", "visita", "hora", "deposit"];
export async function recalcularFiltrosFiesta(c: Q, negocio: string) {
  const b = (await c.query<{ cat: string; fv: string[]; zone: number | null; sab: string; dom: string; sab2: string }>(
    `select b.category_id as cat, b.filter_values as fv, b.service_radius_mi as zone,
            (h.hoy + ((6 - extract(dow from h.hoy)::int + 7) % 7))::text as sab, (h.hoy + ((7 - extract(dow from h.hoy)::int) % 7))::text as dom,
            (h.hoy + ((6 - extract(dow from h.hoy)::int + 7) % 7) + 7)::text as sab2
       from businesses b join cities ci on ci.id = b.city_id cross join lateral (select (now() at time zone ci.timezone)::date as hoy) h where b.id = $1`, [negocio])).rows[0];
  if (!b || b.cat !== "NEG-FIESTA") return;
  const s = (await c.query<{ dep: number }>(`select deposit_cents as dep from fiesta_settings where business_id = $1`, [negocio])).rows[0];
  const S = (await c.query<{ k: string; mont: boolean }>(
    `select svc_kind as k, coalesce((svc_attrs->>'mont')::boolean, false) as mont from items where business_id = $1 and module = 'svc' and removed_at is null and sell and status = 'live'`, [negocio])).rows;
  const D = await diasOcupados(negocio, b.sab < b.dom ? b.sab : b.dom, b.sab2, c), libre = (d: string) => !D.some((x) => x.day === d && x.ocupada);
  const F = new Set<string>();
  if (libre(b.sab)) F.add("d:sab");
  if (libre(b.dom)) F.add("d:dom");
  if (libre(b.sab2)) F.add("d:sab2");
  if (S.some((x) => x.k === "pack")) F.add("paquete");
  if (S.some((x) => x.mont)) F.add("montaje");
  if ((b.zone ?? 0) > 0) F.add("traslado");
  if (S.some((x) => x.k === "visita")) F.add("visita");
  if (S.some((x) => x.k === "hora")) F.add("hora");
  if ((s?.dep ?? 0) > 0) F.add("deposit");
  const fv = [...(b.fv ?? []).filter((x) => !DER.includes(x)), ...F];
  await c.query(`update businesses set filter_values = $2, updated_at = now() where id = $1 and filter_values is distinct from $2`, [negocio, fv]);
}
/* Las fechas cambian solas a medianoche: al mirar la categoría (o el barrido) se recalculan las de una ciudad. Barato:
   solo negocios de Fiestas de esa ciudad. */
export async function refrescarFiestasCiudad(city: string) {
  const L = (await db().query<{ id: string }>(`select id from businesses where city_id = $1 and category_id = 'NEG-FIESTA' and status = 'active' limit 300`, [city])).rows;
  for (const x of L) await recalcularFiltrosFiesta(db(), x.id);
}
