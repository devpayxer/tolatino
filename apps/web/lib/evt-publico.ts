import "server-only";
import { hoyEn } from "./fecha-local";
import { valor } from "./config";
import { db } from "./db";
import { bi, dinero, diaCorto, hora, mesCorto, repL, spanL, sumarDias, type Bi, type Boleto, type Entrada, type FormatoEvt, type FormatoKey, type HorarioDia, type Mesa, type Repite } from "./evt-comun";
import { centroSQL, DIRECCION_EVENTO, PUNTO_EVENTO, radioSQL, type Punto } from "./punto";
import { ventaFicha, type VentaFicha } from "./boletos";

/* 6b · El módulo Eventos del cliente (fase6-eventos.md §4 6b; prototipo «To'Latino Eventos» bqVals / nvVals / lsVals). El servidor decide:
   - Solo sale lo que la base marca `listable` (evento publicado y aprobado, sin ocultar, fecha programada, negocio con el módulo Eventos
     encendido y sin pausa, organizador sin bloquear: evt_listable en 0107). Nada en revisión, oculto, pausado por To'Latino ni bloqueado.
   - Una consulta por página sobre event_dates con el índice (city_id, starts_at, id) where listable, 20 por página con cursor
     (starts_at, id) y una de más para saber si hay otra página; sin offset (guardián eventosConCursor). Sin N+1: el cartel, el precio
     «desde», «guardado» y «vas» salen como subconsultas de la misma fila.
   - El radio es el de Ciudad (lo que ves en Negocios, Eventos y Buscar); el punto público de un evento sale de PUNTO_EVENTO (quien trabaja
     desde casa sale como zona; nunca su casa) y la dirección de DIRECCION_EVENTO (guardián puntoPublico).
   - 6c · La venta de boletos y mesas la decide lib/boletos.ts (ventaFicha): abierta, pausada, cerrada, agotada o no disponible. Lo inventado del prototipo (caras, «van», vistas) no se copia: «van» es
     going_n de la base. */
export const POR_PAGINA_EVT = 20;
export type FiltroFecha = "todos" | "hoy" | "finde" | "prox";
export type Grupo = "hoy" | "semana" | "finde" | "despues";
export type TagEvt = { t: string; k: "vas" | "hoy" | "gratis" | "quedan" };
export type TarjetaEvt = {
  id: string; fecha: string; href: string; img: string | null; bm: string; bd: number; title: string; meta: string; price: string; tag: TagEvt | null; dark: boolean;
  saved: boolean; going: boolean; g: Grupo; cuando: string; venue: string; mi: number | null; edad: number; free: boolean; fmt: FormatoKey; van: number; desde: number | null;
  /* 6f · Una serie sale UNA vez (su próxima fecha) con «CADA JUEVES · +7 FECHAS»; varios días, con su rango. */
  serie: string | null;
};

type FilaT = {
  eid: string; fid: string; slug: string; title: Bi; fmt: FormatoKey; dark: boolean; entry: Entrada; edad: number; ldate: string; h0: number; h1: number; venue: string;
  img: string | null; desde: number | null; quedan: number | null; van: number; saved: boolean; going: boolean; mi: number | null; cur: string; genres: string[];
  kind: "single" | "series" | "span"; rep: Repite | null; span: number; inicio: string; mas: number;
};
/* Hoy en la ciudad y el fin de semana (vie–dom; si hoy es viernes, sábado o domingo, desde hoy). */
type Dias = { hoy: string; vie: string; dom: string };
async function diasCiudad(ciudad: string): Promise<Dias> {
  const r = (await db().query<{ hoy: string; dow: number }>(`select to_char(now() at time zone timezone, 'YYYY-MM-DD') as hoy, extract(dow from now() at time zone timezone)::int as dow from cities where id = $1`, [ciudad])).rows[0];
  const hoy = r?.hoy ?? hoyEn(), dow = r?.dow ?? 0;
  const dom = sumarDias(hoy, (7 - dow) % 7), vie = dow === 0 || dow >= 5 ? hoy : sumarDias(dom, -2);
  return { hoy, vie, dom };
}
const grupo = (d: string, D: Dias): Grupo => (d === D.hoy ? "hoy" : d >= D.vie && d <= D.dom ? "finde" : d < D.vie ? "semana" : "despues");

/* Las columnas de una tarjeta (una fila por fecha). `$1` = quien mira (o null). */
const COLS_T = (centro: string | null) => `
  e.id::text as eid, d.id::text as fid, e.slug, e.title, e.format as fmt, f.dark, e.entry, e.min_age as edad, d.local_date::text as ldate,
  (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
  (extract(epoch from d.ends_at - d.starts_at) / 60)::int + (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h1,
  case when e.venue_mode = 'other' then e.venue_name else b.name end as venue,
  (select m.url from media m where m.owner_kind = 'event' and m.owner_id = e.id::text and m.status = 'visible' order by m.sort, m.created_at limit 1) as img,
  case when e.entry = 'tickets' then (select min((x->>'p')::int) from jsonb_array_elements(e.tickets_cfg) x where not coalesce((x->>'off')::boolean, false)) end as desde,
  case when e.entry <> 'tickets' and e.rsvp_capacity > 0 then greatest(0, e.rsvp_capacity - d.rsvp_n) end as quedan, d.going_n as van, e.genres,
  coalesce($1::uuid is not null and exists (select 1 from favorites v where v.user_id = $1::uuid and v.kind = 'event' and v.target_id = e.id::text), false) as saved,
  coalesce($1::uuid is not null and exists (select 1 from rsvps r where r.user_id = $1::uuid and r.event_date_id = d.id and r.status = 'going'), false) as going,
  ${centro ? `case when d.geom is null then null else round((st_distance(d.geom, ${centro}) / 1609.34)::numeric, 1)::float end` : "null::float"} as mi,
  to_char(d.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || d.id as cur,
  e.kind, e.rep, e.span_days as span, e.start_date::text as inicio,
  case when e.kind = 'series' then (select count(*)::int from event_dates q where q.event_id = e.id and q.listable and q.ends_at > now() and (q.starts_at, q.id) > (d.starts_at, d.id)) else 0 end as mas`;
const DESDE_T = `from event_dates d join events e on e.id = d.event_id join businesses b on b.id = e.business_id join event_formats f on f.key = e.format join cities ci on ci.id = d.city_id`;
/* Lo vivo: listable, que no haya terminado. El rango de starts_at usa el índice (city_id, starts_at, id) where listable. */
const VIVO = `d.listable and d.starts_at > now() - interval '18 hours' and d.ends_at > now()`;
/* 6f · Una serie o un evento de varios días sale UNA vez en las listas: su primera fecha viva (dentro del mismo filtro de fecha, si hay).
   Una consulta: un anti-join por fila sobre (event_id, starts_at); el cursor (starts_at, id) sigue igual. Lo usan las listas de una ventana corta
   (hoy, la semana, una búsqueda); la lista de la ciudad (eventosCiudad) elige sus fechas por ventanas (9b-3, ver allí). */
const PRIMERA = (filtroP = "") => `not exists (select 1 from event_dates p where p.event_id = d.event_id and p.listable and p.starts_at > now() - interval '18 hours' and p.ends_at > now()${filtroP ? ` and ${filtroP}` : ""}
  and (p.starts_at, p.id) < (d.starts_at, d.id))`;
/* «Esta fecha es la primera viva de su evento» como columna (una búsqueda por el índice (event_id, starts_at) que para en la primera). */
const ES_PRIMERA = (filtroP = "") => `d.id = (select p.id from event_dates p where p.event_id = d.event_id and p.listable and p.starts_at > now() - interval '18 hours' and p.ends_at > now()${filtroP ? ` and ${filtroP}` : ""}
  order by p.starts_at, p.id limit 1)`;
const enP = (f: string | null) => (f ? f.replace(/\bd\.local_date\b/g, "p.local_date") : "");
const EN_RADIO = (centro: string, rad: string) => `(d.geom is null or st_dwithin(d.geom, ${centro}, ${rad} * 1609.34))`;

function tarjeta(x: FilaT, es: boolean, D: Dias): TarjetaEvt {
  const E2 = (a: string, b: string) => (es ? a : b), free = x.entry !== "tickets", g = grupo(x.ldate, D);
  const tag: TagEvt | null = x.going ? { t: E2("VAS", "GOING"), k: "vas" } : g === "hoy" ? { t: x.fmt === "noche" ? E2("ESTA NOCHE", "TONIGHT") : E2("HOY", "TODAY"), k: "hoy" }
    : x.quedan != null && x.quedan <= 20 ? { t: x.quedan === 0 ? E2("CUPO LLENO", "FULL") : E2(`QUEDAN ${x.quedan}`, `${x.quedan} LEFT`), k: "quedan" } : free ? { t: E2("GRATIS", "FREE"), k: "gratis" } : null;
  const cuando = x.kind === "span" ? `${spanL(x.inicio, x.span, es).toUpperCase()} · ${x.span} ${E2("DÍAS", "DAYS")}` : `${g === "hoy" ? E2("HOY", "TODAY") : diaCorto(x.ldate, es).toUpperCase()} · ${hora(x.h0)}`;
  const serie = x.kind === "series" && x.rep ? `${repL(x.inicio, x.rep, es).toUpperCase()}${x.mas ? E2(` · +${x.mas} ${x.mas === 1 ? "FECHA" : "FECHAS"}`, ` · +${x.mas} ${x.mas === 1 ? "DATE" : "DATES"}`) : ""}` : null;
  return {
    id: x.eid, fecha: x.fid, href: `/eventos/${x.slug}?fecha=${x.fid}`, img: x.img, bm: mesCorto(x.ldate, es), bd: Number(x.ldate.slice(8, 10)), title: bi(x.title, es),
    meta: `${x.venue} · ${hora(x.h0)}`.toUpperCase(), price: free ? E2("Gratis", "Free") : x.desde != null ? `${E2("Desde ", "From ")}${dinero(x.desde)}` : E2("Con boletos", "Ticketed"),
    tag, dark: x.dark, saved: x.saved, going: x.going, g, cuando, venue: x.venue, mi: x.mi, edad: x.edad, free, fmt: x.fmt, van: x.van, desde: x.desde, serie,
  };
}

/* Filtros de tipo: Todo · Gratis · Con boleto · géneros · Comunidad (prototipo bqVals tOpts). */
export async function generosFiltro() {
  return (await db().query<{ key: string; label: Bi }>(`select key, label from event_genres where enabled order by sort`)).rows;
}
function filtroTipo(t: string, generos: string[], v: unknown[]) {
  if (t === "gratis") return `e.entry <> 'tickets'`;
  if (t === "boleto") return `e.entry = 'tickets'`;
  if (t === "comunidad") return `e.format in ('comunidad', 'fe', 'comida', 'clase')`;
  if (generos.includes(t)) { v.push(t); return `e.genres @> array[$${v.length}::text]`; }
  return null;
}
function filtroFecha(d: FiltroFecha, D: Dias, v: unknown[]) {
  if (d === "hoy") { v.push(D.hoy); return `d.local_date = $${v.length}::date`; }
  if (d === "finde") { v.push(D.vie, D.dom); return `d.local_date between $${v.length - 1}::date and $${v.length}::date`; }
  if (d === "prox") { v.push(D.dom); return `d.local_date > $${v.length}::date`; }
  return null;
}

/* La lista del módulo (APP-EVT-BUSQ): una página de 20 con cursor. */
export async function eventosCiudad(p: Punto, f: { d: FiltroFecha; t: string }, cursor: string | null, viewer: string | null, es: boolean): Promise<{ items: TarjetaEvt[]; mas: string | null; total: number }> {
  const centro = centroSQL(p), R = radioSQL(p), [D, G] = await Promise.all([diasCiudad(p.ciudad), generosFiltro()]);
  const v: unknown[] = [viewer, p.ciudad], w = [VIVO, `d.city_id = $2`, EN_RADIO(centro, R)];
  const ff = filtroFecha(f.d, D, v), ft = filtroTipo(f.t, G.map((g) => g.key), v);
  if (ff) w.push(ff);
  if (ft) w.push(ft);
  // 9b-3 · Las fechas de la página se eligen por VENTANAS de 400 en orden (starts_at, id), quedándose con la primera viva de cada evento, hasta
  // juntar 21; después se arma la tarjeta solo de esas. Con todo en una consulta, el plan juntaba y ordenaba todas las fechas vivas de la ciudad
  // con su evento y su negocio antes de quedarse con 21 (1,3 s con 1 M de fechas en la carga). Con el LIMIT de la ventana, Postgres recorre el
  // índice (city_id, starts_at, id) en orden y para.
  const K = 400, ids: string[] = [];
  let ca: string | null = null, cb: string | null = null;
  if (cursor && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{1,6})?Z\|\d{1,18}$/.test(cursor)) [ca, cb] = cursor.split("|") as [string, string];
  // En el WHERE va solo lo que es el índice (listable, ciudad, desde cuándo y el cursor): así el plan lo recorre en orden y para en la ventana.
  // Lo demás (que no haya terminado, el radio, el día y el tipo) se mira en cada fila, y la «primera» solo en las que pasan.
  const resto = [`d.ends_at > now()`, EN_RADIO(centro, R), ...(ff ? [ff] : []), ...(ft ? [ft] : [])].join(" and ");
  for (let vuelta = 0; vuelta < 40 && ids.length <= POR_PAGINA_EVT; vuelta++) {
    const vv = [...v], ww = [`d.listable`, `d.city_id = $2`, `d.starts_at > now() - interval '18 hours'`];
    if (ca && cb) { vv.push(ca, cb); ww.push(`(d.starts_at, d.id) > ($${vv.length - 1}::timestamptz, $${vv.length}::bigint)`); }
    const r = await db().query<{ id: string; at: string; primera: boolean }>(
      `select d.id::text, to_char(d.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at, case when ${resto} then ${ES_PRIMERA(enP(ff))} else false end as primera
         from event_dates d join events e on e.id = d.event_id, (select $1::uuid as quien) q where ${ww.join(" and ")} order by d.starts_at, d.id limit ${K}`, vv);
    for (const x of r.rows) if (x.primera && ids.length <= POR_PAGINA_EVT) ids.push(x.id);
    if (r.rows.length < K) break;
    [ca, cb] = [r.rows.at(-1)!.at, r.rows.at(-1)!.id];
  }
  const [L, T] = await Promise.all([
    ids.length ? db().query<FilaT>(`select ${COLS_T(centro)} ${DESDE_T} where d.id = any($2::bigint[]) order by d.starts_at, d.id`, [viewer, ids]) : Promise.resolve({ rows: [] as FilaT[] }),
    // Cuántos eventos (hasta 1000): uno por evento de la ciudad que tenga una fecha viva en el filtro (una búsqueda por evento en el índice
    // (event_id, starts_at) que para en la primera).
    cursor ? Promise.resolve(null) : db().query<{ n: number }>(
      `select count(*)::int as n from (select 1 from events e cross join lateral (select 1 from event_dates d where d.event_id = e.id and ${w.join(" and ")} limit 1) x
         where e.city_id = $2 limit 1000) y, (select $1::uuid as quien) q`, v),
  ]);
  const filas = L.rows.slice(0, POR_PAGINA_EVT);
  return { items: filas.map((x) => tarjeta(x, es, D)), mas: L.rows.length > POR_PAGINA_EVT ? filas.at(-1)!.cur : null, total: T?.rows[0]?.n ?? 0 };
}

/* «Esta noche» (historias y la pantalla APP-EVT-NOCHE): lo de hoy en la ciudad, en el radio. */
export type HistoriaEvt = TarjetaEvt & { hora: string; lugar: string; precioT: string; ctaRsvp: boolean };
export async function estaNoche(p: Punto, viewer: string | null, es: boolean, n = 12): Promise<HistoriaEvt[]> {
  const centro = centroSQL(p), R = radioSQL(p), D = await diasCiudad(p.ciudad), E2 = (a: string, b: string) => (es ? a : b);
  const r = await db().query<FilaT>(`select ${COLS_T(centro)} ${DESDE_T} where ${VIVO} and d.city_id = $2 and d.local_date = $3::date and ${EN_RADIO(centro, R)} and ${PRIMERA("p.local_date = $3::date")}
                                     order by d.starts_at, d.id limit ${Math.max(1, Math.min(24, n))}`, [viewer, p.ciudad, D.hoy]);
  return r.rows.map((x) => {
    const t = tarjeta(x, es, D);
    return { ...t, hora: `${E2("HOY", "TONIGHT")} · ${hora(x.h0)} – ${hora(x.h1)}${x.edad ? ` · ${x.edad}+` : ""}`, lugar: `${x.venue}${x.mi != null ? ` · ${x.mi} MI` : ""}`,
      precioT: x.entry === "free" ? E2("ENTRADA LIBRE · SIN LISTA", "FREE ENTRY · NO LIST") : x.entry === "rsvp" ? E2("GRATIS · CON RSVP", "FREE · WITH RSVP") : x.desde != null ? E2(`DESDE ${dinero(x.desde)} · CARGOS INCLUIDOS`, `FROM ${dinero(x.desde)} · FEES INCLUDED`) : E2("CON BOLETOS", "TICKETED"),
      ctaRsvp: x.entry === "rsvp" };
  });
}

/* El destacado (EventPromo): la próxima fiesta o show con cartel en el radio; si no hay, el próximo evento con cartel. */
export async function destacado(p: Punto, viewer: string | null, es: boolean): Promise<TarjetaEvt | null> {
  const centro = centroSQL(p), R = radioSQL(p), D = await diasCiudad(p.ciudad);
  const r = await db().query<FilaT>(`select * from (select ${COLS_T(centro)}, f.dark as d0 ${DESDE_T} where ${VIVO} and d.city_id = $2 and ${EN_RADIO(centro, R)} and ${PRIMERA()}
                                       order by d.starts_at, d.id limit 40) x where x.img is not null order by x.d0 desc, x.cur limit 1`, [viewer, p.ciudad]);
  return r.rows[0] ? tarjeta(r.rows[0], es, D) : null;
}

/* «Mis boletos y RSVP»: los RSVP vivos de la persona (los boletos llegan con 6c). */
export async function misRsvpN(userId: string | null) {
  if (!userId) return 0;
  return (await db().query<{ n: number }>(`select count(*)::int as n from rsvps r join event_dates d on d.id = r.event_date_id where r.user_id = $1 and r.status = 'going' and d.listable and d.ends_at > now()`, [userId])).rows[0]?.n ?? 0;
}

/* Inicio › Esta semana: lo de los próximos 7 días en el radio (6 tarjetas). */
export async function eventosSemana(p: Punto, viewer: string | null, es: boolean, n = 6): Promise<TarjetaEvt[]> {
  const centro = centroSQL(p), R = radioSQL(p), D = await diasCiudad(p.ciudad);
  const r = await db().query<FilaT>(`select ${COLS_T(centro)} ${DESDE_T} where ${VIVO} and d.city_id = $2 and d.local_date <= $3::date and ${EN_RADIO(centro, R)} and ${PRIMERA()}
                                     order by d.starts_at, d.id limit ${Math.max(1, Math.min(12, n))}`, [viewer, p.ciudad, sumarDias(D.hoy, 6)]);
  return r.rows.map((x) => tarjeta(x, es, D));
}

/* Ficha del negocio › Eventos (solo réplica, MEM 1360): sus fechas vivas. */
export async function eventosDelOrganizador(negocio: string, viewer: string | null, es: boolean): Promise<TarjetaEvt[]> {
  const r = await db().query<FilaT & { city: string }>(`select ${COLS_T(null)}, d.city_id as city ${DESDE_T} where ${VIVO} and e.business_id = $2 and ${PRIMERA()} order by d.starts_at, d.id limit 12`, [viewer, negocio]);
  if (!r.rows.length) return [];
  const D = await diasCiudad(r.rows[0]!.city);
  return r.rows.map((x) => tarjeta(x, es, D));
}

/* Buscar › Eventos (GIN sobre events.tsv): los que encajan con la búsqueda, en el radio. */
export async function buscarEventos(consulta: string, p: Punto, evF: "all" | "d0" | "wk" | "free", viewer: string | null, es: boolean, lim = 4): Promise<{ items: TarjetaEvt[]; total: number }> {
  if (!consulta) return { items: [], total: 0 };
  const centro = centroSQL(p), R = radioSQL(p), D = await diasCiudad(p.ciudad);
  const v: unknown[] = [viewer, p.ciudad, consulta], w = [VIVO, `d.city_id = $2`, `e.tsv @@ to_tsquery('simple', $3)`, EN_RADIO(centro, R), PRIMERA()];
  const T = await db().query<{ n: number }>(`select count(*)::int as n from (select 1 ${DESDE_T} where ${w.join(" and ")} limit 100) x, (select $1::uuid as quien) q`, [...v]);
  w.pop();
  let fd: string | null = null;
  if (evF === "d0") { v.push(D.hoy); fd = `d.local_date = $${v.length}::date`; w.push(fd); }
  if (evF === "wk") { v.push(D.vie, D.dom); fd = `d.local_date between $${v.length - 1}::date and $${v.length}::date`; w.push(fd); }
  if (evF === "free") w.push(`e.entry <> 'tickets'`);
  w.push(PRIMERA(enP(fd)));
  const r = await db().query<FilaT>(`select ${COLS_T(centro)} ${DESDE_T} where ${w.join(" and ")} order by d.starts_at, d.id limit ${Math.max(1, Math.min(40, lim))}`, v);
  return { items: r.rows.map((x) => tarjeta(x, es, D)), total: T.rows[0]?.n ?? 0 };
}

/* Ciudad: cuántos eventos hay en el radio (fechas vivas de eventos distintos). */
export async function eventosEnRadio(p: Punto, rad?: number) {
  const centro = centroSQL(p), R = radioSQL(rad ? { ...p, rad } : p);
  return (await db().query<{ n: number }>(`select count(distinct d.event_id)::int as n from event_dates d where ${VIVO} and d.city_id = $1 and ${EN_RADIO(centro, R)}`, [p.ciudad])).rows[0]?.n ?? 0;
}

/* ── La ficha del evento (APP-EVT-LISTING) ── */
export type FichaEvt = {
  id: string; fecha: string; slug: string; href: string; fmt: FormatoKey; F: FormatoEvt; dark: boolean; status: "live" | "paused";
  title: string; desc: string; img: string | null; gal: string[]; dia: string; ldate: string; h0: number; h1: number; doors: number | null; hoy: boolean; pasado: boolean;
  venue: string; addr: string | null; zona: string | null; lat: number | null; lng: number | null; mi: number | null; ciudad: string; estado: string;
  edad: number; pideId: boolean; vest: string; kids: "fam" | "care" | null; comidaLocal: boolean; antes: string[]; generos: string[];
  entry: Entrada; free: boolean; cupo: number; quedan: number | null; partyMax: number; van: number;
  boletos: { n: string; s: string; p: number }[]; mesas: { z: string; seats: number; min: number; dep: number }[];
  lu: { t: string; who: string; role: string }[];
  org: { id: string; name: string; ini: string; verified: boolean; pro: boolean };
  mio: { rsvp: { party: number } | null; saved: boolean };
  rsvpAbierto: boolean; lleno: boolean; hasta: string; guardaMin: number; fechas: { id: string; l: string; on: boolean }[];
  rel: TarjetaEvt[];
  seo: { start: string; end: string; addr: string | null };
  // 6c · La venta de esta fecha (lo decide el servidor) y los boletos que ya tiene quien mira.
  venta: VentaFicha | null; mios: { n: number; numero: string | null; codigo: string | null };
  // 6d · Lista de espera: mi lugar (o mi oferta de 30 min) y hasta cuántos por grupo.
  espera: { mia: import("./espera").MiEspera; max: number; min: number } | null;
  // 6e · La fecha cambió (antes …) y el último aviso del organizador (sale primero en «Antes de ir»).
  cambio: { antes: string | null; aviso: string | null };
  // 6f · Serie («CADA JUEVES»: cada fecha tiene sus boletos) o varios días (rango, DÍAS Y HORARIO; la venta vive en el último día).
  kind: "single" | "series" | "span"; serie: string | null; rango: string | null; dias: { id: string; l: string; s: string; on: boolean }[]; fechaVenta: string;
};
type FilaF = {
  eid: string; fid: string; slug: string; fmt: FormatoKey; status: "live" | "paused"; title: Bi; description: Bi; ldate: string; h0: number; h1: number; dmin: number; venue_mode: "own" | "other";
  venue: string; addr: string | null; lat: number | null; lng: number | null; mi: number | null; ciudad: string; estado: string; edad: number; pide: boolean; vest: Bi | null; kids: "fam" | "care" | null;
  comida: boolean; antes: Bi[]; genres: string[]; entry: Entrada; cupo: number; rsvp_n: number; going_n: number; party_max: number; tickets: Boleto[]; mesas: Mesa[];
  biz: string; bname: string; casa: boolean; verified: boolean; pro: boolean; hoyL: string; pasado: boolean; abierto: boolean; hasta_min: number; start: string; end: string;
  mia: number | null; saved: boolean; city: string; label: Bi; sub: Bi; icon: string; dark: boolean; ages: number[]; fields: FormatoEvt["f"];
  kind: "single" | "series" | "span"; rep: Repite | null; span: number; inicio: string; luo: { h: number; who: string; role: Bi }[] | null; ancla: string | null;
};
const ID = /^\d{1,18}$/;
/* `slug` = …-{id} (0106 lo arma así): se busca por id y se comprueba el slug. `fecha` = la fecha de una serie (si no, la próxima viva). */
export async function fichaEvento(slug: string, fecha: string | null, viewer: string | null, p: Punto | null, es: boolean): Promise<FichaEvt | null> {
  const m = /^[a-z0-9-]{1,80}-(\d{1,18})$/.exec(String(slug ?? ""));
  if (!m) return null;
  const eid = m[1]!, fid = fecha && ID.test(fecha) ? fecha : null, centro = p ? centroSQL(p) : null;
  const guarda = await valor("rsvp_guarda_min");
  const r = (await db().query<FilaF>(
    `select e.id::text as eid, d.id::text as fid, e.slug, e.format as fmt, e.status, e.title, e.description, d.local_date::text as ldate,
            (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
            (extract(epoch from d.ends_at - d.starts_at) / 60)::int + (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h1,
            (extract(epoch from d.starts_at - d.doors_at) / 60)::int as dmin, e.venue_mode,
            case when e.venue_mode = 'other' then e.venue_name else b.name end as venue, ${DIRECCION_EVENTO("e", "b")} as addr, ${PUNTO_EVENTO("e", "b")},
            ${centro ? `case when d.geom is null then null else round((st_distance(d.geom, ${centro}) / 1609.34)::numeric, 1)::float end` : "null::float"} as mi,
            ci.name as ciudad, ci.state as estado, e.min_age as edad, e.id_required as pide, e.dress_code as vest, e.kids, e.food_paid_at_venue as comida, e.before_you_go as antes,
            e.genres, e.entry, e.rsvp_capacity as cupo, d.rsvp_n, d.going_n, e.party_max, e.tickets_cfg as tickets, e.tables_cfg as mesas,
            b.id as biz, b.name as bname, b.works_from_home as casa, coalesce(s.verified, false) as verified, coalesce(s.plan, 'free') = 'pro' as pro,
            to_char(now() at time zone ci.timezone, 'YYYY-MM-DD') as "hoyL", d.ends_at <= now() as pasado,
            now() < d.doors_at + make_interval(mins => $4::int) as abierto,
            (extract(hour from (d.doors_at + make_interval(mins => $4::int)) at time zone ci.timezone) * 60 + extract(minute from (d.doors_at + make_interval(mins => $4::int)) at time zone ci.timezone))::int as hasta_min,
            to_char(d.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as start, to_char(d.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "end",
            (select r.party from rsvps r where r.user_id = $3::uuid and r.event_date_id = d.id and r.status = 'going') as mia,
            coalesce($3::uuid is not null and exists (select 1 from favorites v where v.user_id = $3::uuid and v.kind = 'event' and v.target_id = e.id::text), false) as saved,
            d.city_id as city, f.label, f.sub, f.icon, f.dark, f.ages::int[] as ages, f.fields,
            e.kind, e.rep, e.span_days as span, e.start_date::text as inicio, d.lineup_override as luo, evt_ancla(e.id)::text as ancla
       from events e join event_dates d on d.event_id = e.id join businesses b on b.id = e.business_id join cities ci on ci.id = d.city_id join event_formats f on f.key = e.format
       left join business_stats_cache s on s.business_id = b.id
      where e.id = $1::bigint and d.listable and ($2::bigint is null or d.id = $2::bigint)
      order by (d.ends_at > now()) desc, d.starts_at limit 1`, [eid, fid, viewer, guarda])).rows[0];
  if (!r || r.slug !== slug) return null;
  const E2 = (a: string, b: string) => (es ? a : b), nm = (x: Bi | null | undefined) => (x ? bi(x, es) : "");
  const [L, G, Fe, gen, rel] = await Promise.all([
    db().query<{ h: number; who: string; role: Bi; dy: number }>(`select at_min as h, who, role, day_index as dy from event_lineup where event_id = $1::bigint and removed_at is null order by day_index, sort, at_min`, [eid]),
    db().query<{ url: string }>(`select url from media where owner_kind = 'event' and owner_id = $1 and status = 'visible' order by sort, created_at limit 12`, [eid]),
    db().query<{ id: string; ldate: string; h0: number; h1: number }>(`select d.id::text, d.local_date::text as ldate,
       (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
       (extract(epoch from d.ends_at - d.starts_at) / 60)::int + (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h1
       from event_dates d join cities ci on ci.id = d.city_id where d.event_id = $1::bigint and ${VIVO} order by d.starts_at limit ${r.kind === "span" ? 30 : 12}`, [eid]),
    db().query<{ key: string; label: Bi }>(`select key, label from event_genres where key = any($1::text[])`, [r.genres]),
    relacionados(r.city, r.eid, r.biz, r.fmt, viewer, centro, es),
  ]);
  const F: FormatoEvt = { key: r.fmt, label: r.label, sub: r.sub, icon: r.icon, dark: r.dark, ages: r.ages, f: r.fields };
  // 6f · Varios días: los boletos y la lista de espera viven en el ancla (el último día); el RSVP es de cada día.
  const fv = r.kind === "span" && r.ancla ? r.ancla : r.fid;
  const venta = r.entry === "tickets" ? await ventaFicha(fv, es) : null;
  // 6d · «Mis boletos»: la orden si la compró esta persona; si se lo transfirieron (o es una cortesía), el boleto.
  const mios = viewer && r.entry === "tickets" ? (await db().query<{ n: number; num: string | null; codigo: string | null }>(
    `select count(*)::int as n, max(o.number) filter (where o.user_id = $1 and o.pay_mode = 'app') as num, min(t.code) as codigo from tickets t join operations o on o.id = t.operation_id
      where t.holder_user_id = $1 and t.event_date_id = $2::bigint and t.status in ('valid', 'used')`, [viewer, fv])).rows[0] : null;
  const cfgE = r.entry === "tickets" && venta ? await (await import("./config")).valores("evt_boletos_por_orden_max", "evt_boletos_persona_fecha_max", "espera_oferta_min") : null;
  const espera = cfgE ? { mia: await (await import("./espera")).miEspera(viewer, fv), max: Math.min(10, cfgE.evt_boletos_por_orden_max, cfgE.evt_boletos_persona_fecha_max), min: cfgE.espera_oferta_min } : null;
  const free = r.entry !== "tickets", quedan = free && r.cupo > 0 ? Math.max(0, r.cupo - r.rsvp_n) : null;
  const zona = r.venue_mode === "own" && r.casa ? E2(`Zona de ${r.ciudad} · la dirección exacta te la da el organizador`, `${r.ciudad} area · the organizer gives you the exact address`) : null;
  return {
    id: r.eid, fecha: r.fid, slug: r.slug, href: `/eventos/${r.slug}?fecha=${r.fid}`, fmt: r.fmt, F, dark: r.dark, status: r.status,
    title: nm(r.title), desc: nm(r.description), img: G.rows[0]?.url ?? null, gal: G.rows.slice(1).map((x) => x.url), dia: diaCorto(r.ldate, es).toUpperCase(), ldate: r.ldate,
    h0: r.h0, h1: r.h1, doors: r.dmin > 0 ? r.h0 - r.dmin : null, hoy: r.ldate === r.hoyL, pasado: r.pasado,
    venue: r.venue, addr: r.addr, zona, lat: r.lat, lng: r.lng, mi: r.mi, ciudad: r.ciudad, estado: r.estado,
    edad: r.edad, pideId: r.pide, vest: nm(r.vest), kids: r.kids, comidaLocal: r.comida, antes: (r.antes ?? []).map(nm).filter(Boolean), generos: gen.rows.map((g) => nm(g.label)),
    entry: r.entry, free, cupo: r.cupo, quedan, partyMax: r.party_max, van: r.going_n,
    boletos: free ? [] : (r.tickets ?? []).filter((b) => !b.off).map((b) => ({ n: nm(b.n), s: nm(b.s), p: b.p })),
    mesas: free ? [] : (r.mesas ?? []).map((x) => ({ z: nm(x.z), seats: x.seats, min: x.min, dep: x.dep })),
    // 6f · El programa de ESTA fecha de la serie (si el organizador cambió el artista solo esta fecha) o, en varios días, el de cada día.
    lu: (r.luo ?? L.rows).map((l) => ({ t: r.kind === "span" ? `${diaCorto(sumarDias(r.inicio, (l as { dy?: number }).dy ?? 0), es).toUpperCase()} · ${hora(l.h)}` : hora(l.h), who: l.who, role: nm(l.role) })),
    org: { id: r.biz, name: r.bname, ini: r.bname.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ]/.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join(""), verified: r.verified, pro: r.pro },
    mio: { rsvp: r.mia != null ? { party: r.mia } : null, saved: r.saved },
    rsvpAbierto: r.abierto && !r.pasado && r.entry === "rsvp", lleno: quedan === 0, hasta: hora(r.hasta_min), guardaMin: guarda,
    fechas: r.kind === "span" ? [] : Fe.rows.map((x) => ({ id: x.id, l: diaCorto(x.ldate, es).toUpperCase(), on: x.id === r.fid })),
    rel, seo: { start: r.start, end: r.end, addr: r.addr }, venta, mios: { n: mios?.n ?? 0, numero: mios?.num ?? null, codigo: mios?.codigo ?? null }, espera,
    cambio: await (await import("./evt-cambios")).cambioFicha(r.fid),
    kind: r.kind, serie: r.kind === "series" && r.rep ? repL(r.inicio, r.rep, es) : null, fechaVenta: fv,
    rango: r.kind === "span" ? `${spanL(r.inicio, r.span, es).toUpperCase()} · ${r.span} ${E2("DÍAS", "DAYS")}` : null,
    dias: r.kind === "span" ? Fe.rows.map((x) => ({ id: x.id, l: `${E2("Día ", "Day ")}${Math.round((Date.parse(`${x.ldate}T12:00:00Z`) - Date.parse(`${r.inicio}T12:00:00Z`)) / 864e5) + 1} · ${diaCorto(x.ldate, es)}`, s: `${hora(x.h0)} – ${hora(x.h1)}`, on: x.id === r.fid })) : [],
  };
}
async function relacionados(ciudad: string, eid: string, biz: string, fmt: string, viewer: string | null, centro: string | null, es: boolean) {
  const D = await diasCiudad(ciudad);
  const r = await db().query<FilaT>(`select distinct on (x.eid) * from (select ${COLS_T(centro)} ${DESDE_T} where ${VIVO} and d.city_id = $2 and e.id <> $3::bigint and (e.format = $4 or e.business_id = $5) and ${PRIMERA()}
                                     order by d.starts_at, d.id limit 30) x order by x.eid, x.cur limit 4`, [viewer, ciudad, eid, fmt, biz]);
  return r.rows.sort((a, b) => a.cur.localeCompare(b.cur)).map((x) => tarjeta(x, es, D));
}

/* Para el admin y el panel: los últimos RSVP de un evento (nombre + inicial; nunca teléfono). El panel pasa su negocio: solo los de sus eventos. */
export async function ultimosRsvp(eventoId: string, n = 20, negocio: string | null = null) {
  if (!ID.test(eventoId)) return [];
  return (await db().query<{ nombre: string; party: number; st: string; at: string; dia: string }>(
    `select coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Vecino') as nombre, r.party, r.status as st,
            to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, d.local_date::text as dia
       from rsvps r join users u on u.id = r.user_id join event_dates d on d.id = r.event_date_id
      where r.event_id = $1::bigint and ($3::text is null or exists (select 1 from events e where e.id = r.event_id and e.business_id = $3))
      order by r.created_at desc, r.id desc limit $2`, [eventoId, Math.max(1, Math.min(100, n)), negocio])).rows;
}
