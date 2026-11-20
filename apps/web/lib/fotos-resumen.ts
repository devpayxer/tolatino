import "server-only";
import { db } from "./db";
import { cifrasRevisionFotos, type CifrasRevision } from "./fotos-revision";

/* R3 · Revisión automática de las fotos públicas (decisión AJ) · Lo que leen los DOS lugares donde una persona del equipo ve cómo va: Super Admin ›
   Contenido › Auto-moderación (admin-confianza.ts) y el reporte diario del fundador (reporte-diario.ts). Todo sale de las cifras que ya arma
   lib/fotos-revision.ts (cifrasRevisionFotos: por capa, publicadas / retenidas / rechazadas / ocultas, el gasto de la capa 2 y cinco publicadas
   por los modelos, al azar, para mirar) y del libro del gasto del mes (photo_review_spend, el mismo que cuenta el tope de la capa 2).
   Aquí solo se leen: nada se escribe y nunca sale una persona (solo el número de la foto y su dirección pública). Las ventanas son días de Hazleton
   (America/New_York), como el resto del reporte. Es el ÚNICO archivo, fuera de la subida, el barrido, el reporte de una foto y la apelación, que
   importa lib/fotos-revision.ts (guardián fotosRevisionPrivacidad). */
export type TotalesFotos = { publicadas: number; retenidas: number; rechazadas: number; ocultadas: number };
export type ResumenFotos = {
  porCapa: CifrasRevision["porCapa"]; totales: TotalesFotos;
  muestra: { mediaId: string; capa: string; puntaje: number | null; url: string }[];
};
export type GastoFotos = { gastadoUsd: number; reservadoUsd: number; topeUsd: number; llamadasMes: number };

/* Una ventana de días de Hazleton: desde = el comienzo del día de hace `desde` días; hasta = el comienzo del día de hace `hasta` días (hasta < desde).
   Hoy = (0, -1) · ayer = (1, 0) · los últimos 7 días con hoy = (6, -1). */
async function ventana(desde: number, hasta: number): Promise<[Date, Date]> {
  const r = (await db().query<{ d: Date; h: Date }>(
    `select ((now() at time zone 'America/New_York')::date - $1::int)::timestamp at time zone 'America/New_York' as d,
            ((now() at time zone 'America/New_York')::date - $2::int)::timestamp at time zone 'America/New_York' as h`, [desde, hasta])).rows[0]!;
  return [r.d, r.h];
}

export async function resumenFotos(desde: number, hasta: number): Promise<ResumenFotos> {
  const [d, h] = await ventana(desde, hasta);
  const c = await cifrasRevisionFotos(d, h);
  // De la muestra solo lo que sigue publicado (una foto que se ocultó después ya no tiene dirección pública): su miniatura sale por la pieza de fotos.
  const ids = c.muestra.map((x) => x.mediaId);
  const vivas = ids.length ? (await db().query<{ id: string; url: string }>(
    `select id::text, url from media where id = any($1::uuid[]) and status = 'visible' and purged_at is null and url like '/medios/n/%'`, [ids])).rows : [];
  const total = (k: keyof TotalesFotos) => c.porCapa.reduce((s, x) => s + x[k], 0);
  return {
    porCapa: c.porCapa, totales: { publicadas: total("publicadas"), retenidas: total("retenidas"), rechazadas: total("rechazadas"), ocultadas: total("ocultadas") },
    muestra: c.muestra.flatMap((x) => { const v = vivas.find((y) => y.id === x.mediaId); return v ? [{ mediaId: x.mediaId, capa: x.capa, puntaje: x.puntaje, url: v.url }] : []; }),
  };
}

/* El gasto del mes de la segunda opinión contra su tope (la regla foto2: tope_cents). El tope y lo gastado salen de la base (foto2_tope_microusd,
   photo_review_spend): los mismos números con los que foto2_reservar decide si llama o no. */
export async function gastoFotosMes(): Promise<GastoFotos> {
  const r = (await db().query<{ gastado: string; reservado: string; tope: string; llamadas: number }>(
    `select coalesce(s.spent_microusd, 0)::text as gastado, coalesce(s.reserved_microusd, 0)::text as reservado, foto2_tope_microusd()::text as tope,
            (select count(*)::int from photo_reviews p where p.capa = 'c2' and p.modelo is not null and p.created_at >= date_trunc('month', now() at time zone 'America/New_York') at time zone 'America/New_York') as llamadas
       from (select 1) x left join photo_review_spend s on s.month = compa_mes()`)).rows[0]!;
  return { gastadoUsd: Number(r.gastado) / 1_000_000, reservadoUsd: Number(r.reservado) / 1_000_000, topeUsd: Number(r.tope) / 1_000_000, llamadasMes: r.llamadas };
}
