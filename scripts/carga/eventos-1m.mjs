#!/usr/bin/env node
/* 9b-3 · Eventos con 1 M de fechas y 5 M de boletos, 50 mil en una sola fecha (planes 6b–6h; LAUNCH L747, L851, L869, L898). Copia un evento
   publicado de la semilla del sandbox (con boletos) 20 mil veces como serie semanal de 52 fechas y llena una fecha de HOY con 50 mil boletos para
   la puerta. Mide el código real: la lista de una ciudad (cursor), la ficha, la puerta en línea (escaneo y búsqueda por nombre), el paquete sin
   conexión de 10 mil boletos y subir 500 escaneos. Uso: DATABASE_URL=… node scripts/carga/eventos-1m.mjs [--sin-generar] */
import { randomUUID } from "node:crypto";
import { analizar, anotar, app, candado, fin, generar, guardarMeta, medir, meta, n, porLotes, q, uno } from "./lib/comun.mjs";

await candado();
const EV = n(20_000), FECHAS = 52, BOL = n(5_000_000), GRANDE = n(50_000);
const tpl = await uno(`select e.id, e.business_id as b from events e where e.entry = 'tickets' and e.status = 'live' and e.approved_at is not null and e.kind = 'single'
                         and exists (select 1 from ticket_types t where t.event_id = e.id) order by e.id limit 1`);
if (!tpl) { console.error("[carga] la semilla no trae un evento publicado con boletos"); process.exit(2); }
// Un código de boleto válido (TL-XXX-NNNN) y único por número.
const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODIGO = (x) => `'TL-' || substr('${A}', 1 + (${x} / 4096 / 1024) % 32, 1) || substr('${A}', 1 + (${x} / 4096 / 32) % 32, 1) || substr('${A}', 1 + (${x} / 4096) % 32, 1)
  || '-' || (2 + ${x} / 512 % 8) || (2 + ${x} / 64 % 8) || (2 + ${x} / 8 % 8) || (2 + ${x} % 8)`;
const OP = (await uno(`select id from operations where kind = 'tickets' order by id limit 1`))?.id ?? (await uno(`select min(id) as id from operations`)).id;

if (!process.argv.includes("--sin-generar")) {
  // ── 20 mil eventos copiados del de la semilla (70 % Hazleton), cada uno serie semanal ──
  await porLotes("eventos", EV, `
    insert into events (slug, city_id, business_id, format, title, description, genres, min_age, venue_mode, venue_name, venue_address, geom, kind, start_date, start_min, end_min,
                        doors_before_min, entry, sales_until, max_per_person, tickets_cfg, status, approved_at, version, origin, created_at, rep, span_days)
    select e.slug || '-carga-' || g, c.id, e.business_id, e.format, jsonb_build_object('es', 'Evento de carga ' || g, 'en', 'Load event ' || g), e.description, e.genres, e.min_age, e.venue_mode, e.venue_name, e.venue_address,
           st_setsrid(st_makepoint(st_x(c.center::geometry) + (g % 100 - 50) / 4000.0, st_y(c.center::geometry) + (g / 100 % 100 - 50) / 4000.0), 4326)::geography,
           'series', (now() at time zone 'America/New_York')::date - 70, e.start_min, e.end_min, e.doors_before_min, e.entry, e.sales_until, e.max_per_person, e.tickets_cfg,
           'live', now(), 1, 'panel', now() - interval '80 days', jsonb_build_object('k', 'w', 'n', ${FECHAS}, 'days', jsonb_build_array(4), 'skip', '[]'::jsonb), 1
      from generate_series($1::int, $2::int) g cross join events e
      join cities c on c.id = case when g % 10 < 7 then 'hzl' else (array['alw','wbr','scr','rdg'])[1 + g % 4] end
     where e.id = ${tpl.id}`);
  await generar("tipos de boleto", `insert into ticket_types (event_id, city_id, cfg_key, name, price_cents, quantity, sort)
    select e.id, e.city_id, t.cfg_key, t.name, t.price_cents, 5000, t.sort from events e join ticket_types t on t.event_id = ${tpl.id} where e.slug like '%-carga-%' on conflict do nothing`);
  // ── 52 fechas por evento (10 semanas atrás, 42 adelante): ~1 M de fechas ──
  await generar("fechas", `insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, day_index, status, geom, listable, sold_n)
    select e.id, e.city_id, s.t, s.t + interval '4 hours', s.t - interval '30 minutes', (s.t at time zone 'America/New_York')::date, 0,
           case when s.t < now() then 'done' else 'scheduled' end, e.geom, s.t >= now(), 0
      from events e cross join lateral (select ((e.start_date + 7 * k)::timestamp + make_interval(mins => (e.start_min + (e.id % 5) * 30)::int)) at time zone 'America/New_York' as t from generate_series(0, ${FECHAS - 1}) k) s
     where e.slug like '%-carga-%'`);
  // ── La fecha grande: hoy, puertas en una hora, 50 mil boletos (para la puerta y el paquete) ──
  const g0 = await uno(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, day_index, status, geom, listable, sold_n)
    select e.id, e.city_id, now() + interval '90 minutes', now() + interval '6 hours', now() + interval '1 hour', (now() at time zone 'America/New_York')::date, 0, 'scheduled', e.geom, true, ${GRANDE}
      from events e where e.slug like '%-carga-1' limit 1 returning id, event_id`);
  await guardarMeta("fecha_grande", g0.id);
  await porLotes("boletos de la fecha grande", GRANDE, `
    insert into tickets (code, event_id, event_date_id, city_id, ticket_type_id, operation_id, holder_user_id, holder_name, admits, kind, price_cents, fee_cents, status, created_at)
    select ${CODIGO("g")}, ${g0.event_id}, ${g0.id}, 'hzl', (select min(id) from ticket_types where event_id = ${g0.event_id}), ${OP},
           (select id from users where phone like '+1999%' order by phone limit 1 offset (g % 1000)), 'Invitado Carga ' || g, 1, 'paid', 2500, 250, 'valid', now() - make_interval(mins => g % 10000)
      from generate_series($1::int, $2::int) g`, 50_000);
  // ── El resto de los 5 M de boletos en las fechas que ya pasaron y las próximas ──
  await generar("fechas para boletos", [`drop table if exists carga_f`, `create unlogged table carga_f as select row_number() over (order by id) as k, id, event_id, city_id, (select min(t.id) from ticket_types t where t.event_id = d.event_id) as tt from event_dates d where exists (select 1 from events e where e.id = d.event_id and e.slug like '%-carga-%')`, `create index on carga_f (k)`, `analyze carga_f`]);
  const nf = (await uno(`select count(*)::int as n from carga_f`)).n;
  await porLotes("boletos", Math.max(0, BOL - GRANDE), `
    insert into tickets (code, event_id, event_date_id, city_id, ticket_type_id, operation_id, holder_name, admits, kind, price_cents, fee_cents, status, created_at)
    select ${CODIGO("(g + 100000)")}, f.event_id, f.id, f.city_id, f.tt, ${OP}, 'Persona ' || g, 1, 'paid', 2500, 250, case when g % 3 = 0 then 'used' else 'valid' end, now() - make_interval(mins => g % 100000)
      from generate_series($1::int, $2::int) g join carga_f f on f.k = 1 + (g * 7) % ${nf}`, 500_000);
  await analizar();
}

const centro = await uno(`select st_y(center::geometry) as lat, st_x(center::geometry) as lng from cities where id = 'hzl'`);
const PT = { ciudad: "hzl", lat: centro.lat, lng: centro.lng, rad: 30 };
const VS = (await q(`select id::text from users where phone like '+1999%' order by phone limit 50`)).map((x) => x.id);
const pub = await app("lib/evt-publico.ts");
await medir("eventos-lista", { linea: "L747", presupuesto: 50, que: "Eventos de Hazleton, 20 con cursor (1 M de fechas)" }, (i) => pub.eventosCiudad(PT, { d: "todos", t: "" }, null, VS[i % VS.length] ?? null, true));
let cur = null; for (let k = 0; k < 5; k++) { const r = await pub.eventosCiudad(PT, { d: "todos", t: "" }, cur, null, true); cur = r?.mas ?? r?.siguiente ?? r?.cursor ?? null; if (!cur) break; }
if (cur) await medir("eventos-lista-p6", { linea: "L747", presupuesto: 50, que: "Eventos, sexta página por cursor" }, () => pub.eventosCiudad(PT, { d: "todos", t: "" }, cur, null, true));
await medir("eventos-finde", { linea: "L851", presupuesto: 50, que: "Eventos este fin de semana (series de 52 fechas, sin repetir la serie)" }, () => pub.eventosCiudad(PT, { d: "finde", t: "" }, null, null, true));
const SLUGS = (await q(`select slug from events where slug like '%-carga-%' and city_id = 'hzl' order by id limit 40`)).map((x) => x.slug);
await medir("evento-ficha", { linea: "L747", presupuesto: 40, que: "ficha de un evento (serie de 52 fechas)" }, (i) => pub.fichaEvento(SLUGS[i % SLUGS.length], null, VS[i % VS.length] ?? null, PT, true));

// ── La puerta: el dueño abre la puerta de la fecha grande ──
const G = await uno(`select d.id::text as fecha, d.event_id::text as evento, e.business_id as b from event_dates d join events e on e.id = d.event_id where d.id = $1::bigint`, [await meta("fecha_grande")]);
const DUENO = (await uno(`select user_id::text as u from business_members where business_id = $1 and status = 'active' and (kind = 'owner' or panel_access && array['all','evt']::text[]) limit 1`, [G.b]))?.u;
const pta = await app("lib/puerta.ts"), qr = await app("lib/boletos-qr.ts"), paq = await app("lib/puerta-paquete.ts"), sync = await app("lib/puerta-sync.ts");
const ab = DUENO ? await pta.abrirPuerta(DUENO, G.fecha, "Carga", null, null) : { ok: false, msg: { es: "sin dueño" } };
if (!ab.ok) anotar("puerta", { linea: "L869", que: `no se pudo abrir la puerta: ${ab.msg?.es}`, valor: 1, tope: 0, unidad: "error" });
else {
  const ctx = await pta.accesoPuerta(DUENO, ab.sesion);
  const B = await q(`select id::text, qr_ver as ver, admits from tickets where event_date_id = $1::bigint and status = 'valid' order by id limit 400`, [G.fecha]);
  let k = 0;
  await medir("puerta-escanear", { linea: "L869", presupuesto: 150, veces: Math.min(100, Math.max(5, GRANDE / 4 - 10)), que: "escanear un QR en línea (50 mil boletos en la fecha)" },
    async () => { const b = B[k++]; if (!b) throw new Error("no quedan boletos para escanear"); return pta.escanearQR(ctx, await qr.firmarQR({ id: b.id, fecha: G.fecha, ver: b.ver, admits: b.admits }), { id: randomUUID(), at: Date.now(), dir: "in" }, true); });
  // El tope de búsquedas por minuto de la puerta (puerta_buscar_min) es por persona: para medir 30 seguidas se sube al máximo y se vuelve a dejar.
  await q(`insert into platform_config (key, value, note) select key, to_jsonb(max), 'carga' from config_keys where key = 'puerta_buscar_min' on conflict (key) do update set value = excluded.value`);
  await medir("puerta-buscar-nombre", { linea: "L869", presupuesto: 150, que: "buscar por nombre en la puerta (like dentro de la fecha)" }, (i) => pta.buscar(ctx, `Carga ${4000 + i * 37}`, true));
  await q(`delete from platform_config where key = 'puerta_buscar_min' and note = 'carga'`);
  let tam = 0;
  await medir("paquete", { linea: "L898", presupuesto: 1000, veces: 5, calentar: 1, que: `paquete sin conexión (${GRANDE.toLocaleString("es-US")} boletos)` }, async () => {
    const r = await paq.armarPaquete(ctx, null, null, true, true);
    if (!r.ok) throw new Error(JSON.stringify(r.msg ?? r));
    tam = Buffer.from(r.c, "base64").length;
  });
  anotar("paquete-tamano", { linea: "L898", que: "tamaño del paquete cifrado y comprimido", valor: Math.round(tam / 1024), tope: 1024, unidad: "KB" });
  const lote = (await uno(`select cfg_int('puerta_sync_lote') as n`)).n;
  const C = await q(`select id::text, qr_ver as ver, admits from tickets where event_date_id = $1::bigint and status = 'valid' order by id desc limit 500`, [G.fecha]);
  const escaneos = await Promise.all(C.map(async (b) => ({ id: randomUUID(), at: Date.now() - 60_000, tipo: "qr", qr: await qr.firmarQR({ id: b.id, fecha: G.fecha, ver: b.ver, admits: b.admits }), dir: "in", res: "valid", entro: true })));
  await medir("subir-500", { linea: "L898", presupuesto: 2000, veces: 1, calentar: 0, que: `subir 500 escaneos sin conexión (en subidas de ${lote})` }, async () => {
    for (let i = 0; i < escaneos.length; i += lote) { const r = await sync.aplicarCola(DUENO, ab.sesion, null, Date.now(), escaneos.slice(i, i + lote)); if (!r.ok) throw new Error(JSON.stringify(r.msg ?? r)); }
  });
}
anotar("eventos-filas", { linea: "-", que: "fechas y boletos generados", valor: (await uno(`select (select count(*) from event_dates)::int + (select count(*) from tickets)::int as n`)).n, unidad: "filas" });
process.exit(await fin() ? 1 : 0);
