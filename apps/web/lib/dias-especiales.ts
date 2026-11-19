import "server-only";

/* 9n-10 · Los días especiales y la temporada en TODOS los calendarios (LAUNCH «La temporada en las citas» y su clase): el estado abierto/cerrado
   (negocio_abierto, 0144) ya los miraba, pero los calendarios que ofrecen días y horas a futuro (citas, reservaciones, pedidos programados, Noche,
   apartados, rentas, mercado, planes, entrevistas, visitas) armaban el día solo con el horario de la semana: ofrecían Navidad o un día fuera de
   temporada. Una sola lectura por negocio y ventana: para cada fecha, «cerrado» (feriado, vacaciones, día propio cerrado, cierre temporal o fuera
   de la temporada) o sus horas propias; sin entrada, el horario de la semana. */
type Q = { query: <T extends object = Record<string, unknown>>(q: string, v?: unknown[]) => Promise<{ rows: T[] }> };
export type Rango = [string, string];
export type DiasEsp = { esp: { desde: string; hasta: string; closed: boolean; ranges: Rango[] }[]; temporadas: { desde: string; hasta: string }[]; cerradoHasta: string | null };

export async function diasEspeciales(c: Q, negocio: string, desde: string, dias: number): Promise<DiasEsp> {
  const e = await c.query<{ desde: string; hasta: string; closed: boolean; ranges: Rango[] | null; season: boolean }>(
    `select date_from::text as desde, date_to::text as hasta, closed, ranges, kind = 'season' as season from special_hours
      where business_id = $1 and status = 'active' and (kind = 'season' or (date_to >= $2::date and date_from <= $2::date + $3::int))
      order by closed desc, id desc`, [negocio, desde, Math.max(1, Math.min(400, dias))]);
  const b = await c.query<{ hasta: string | null }>(
    `select (b.temp_closed_until at time zone ci.timezone)::date::text as hasta from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.temp_closed_until > now()`, [negocio]);
  return {
    esp: e.rows.filter((x) => !x.season).map((x) => ({ desde: x.desde, hasta: x.hasta, closed: x.closed, ranges: x.ranges ?? [] })),
    temporadas: e.rows.filter((x) => x.season).map((x) => ({ desde: x.desde, hasta: x.hasta })),
    cerradoHasta: b.rows[0]?.hasta ?? null,
  };
}

/* 9t · Lo mismo para varios negocios en UNA lectura (sin N+1: «Otros restaurantes con mesa» mira hasta 24 a la vez). */
export async function diasEspecialesVarios(c: Q, negocios: string[], desde: string, dias: number): Promise<Map<string, DiasEsp>> {
  const out = new Map<string, DiasEsp>(negocios.map((n) => [n, { esp: [], temporadas: [], cerradoHasta: null }]));
  if (!negocios.length) return out;
  const e = await c.query<{ b: string; desde: string; hasta: string; closed: boolean; ranges: Rango[] | null; season: boolean }>(
    `select business_id as b, date_from::text as desde, date_to::text as hasta, closed, ranges, kind = 'season' as season from special_hours
      where business_id = any($1::text[]) and status = 'active' and (kind = 'season' or (date_to >= $2::date and date_from <= $2::date + $3::int))
      order by business_id, closed desc, id desc`, [negocios, desde, Math.max(1, Math.min(400, dias))]);
  const b = await c.query<{ b: string; hasta: string }>(
    `select b.id as b, (b.temp_closed_until at time zone ci.timezone)::date::text as hasta from businesses b join cities ci on ci.id = b.city_id
      where b.id = any($1::text[]) and b.temp_closed_until > now()`, [negocios]);
  for (const x of e.rows) {
    const d = out.get(x.b);
    if (!d) continue;
    if (x.season) d.temporadas.push({ desde: x.desde, hasta: x.hasta });
    else d.esp.push({ desde: x.desde, hasta: x.hasta, closed: x.closed, ranges: x.ranges ?? [] });
  }
  for (const x of b.rows) { const d = out.get(x.b); if (d) d.cerradoHasta = x.hasta; }
  return out;
}

/* Las horas de una fecha: null = usa el horario de la semana; [] = cerrado ese día; si no, sus horas propias. */
export function horasDelDia(d: DiasEsp, ymd: string): Rango[] | null {
  if (d.cerradoHasta && ymd <= d.cerradoHasta) return [];
  if (d.temporadas.length && !d.temporadas.some((t) => t.desde <= ymd && ymd <= t.hasta)) return [];
  const e = d.esp.find((x) => x.desde <= ymd && ymd <= x.hasta);
  if (!e) return null;
  return e.closed ? [] : e.ranges.length ? e.ranges : null;
}
export const cerradoElDia = (d: DiasEsp, ymd: string) => { const h = horasDelDia(d, ymd); return h !== null && h.length === 0; };

/* Las horas de una fecha con el horario de la semana (filas de business_hours) de respaldo: lo que usan los calendarios que leen la semana. */
export type Semana = { weekday: number; open: boolean; ranges: Rango[] | null }[];
export function rangosDia(H: Semana, d: DiasEsp, ymd: string): Rango[] {
  const e = horasDelDia(d, ymd);
  if (e !== null) return e;
  const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay(), h = H.find((x) => x.weekday === dow);
  return h?.open && h.ranges?.length ? h.ranges : [];
}
