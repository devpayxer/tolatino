#!/usr/bin/env node
/* 9b-3 · Las apps con 1 M de vecinos (planes 8c, 8e, 8g; LAUNCH L1210, L1260, L1305): avisos encolados con 5 M de avisos en la base y la
   posición del repartidor (2 000 repartidores en ruta, cada uno manda cada 10 s: 200 por segundo sostenidas). Copia la entrega en camino de la
   semilla del sandbox 2 000 veces (cada copia con su repartidor y su token) y llama al código real (guardarPosiciones) con la firma de cada
   token. Uso: DATABASE_URL=… node scripts/carga/apps-1m.mjs [--sin-generar] */
import { createHash, randomBytes } from "node:crypto";
import { analizar, anotar, app, candado, fin, generar, guardarMeta, medir, meta, n, porLotes, q, uno } from "./lib/comun.mjs";

await candado();
const AV = n(5_000_000), RUTAS = Math.max(20, n(2_000));
// La huella del token de una ruta es su sha256 (lib/ruta.ts): el teléfono manda el token, la base guarda la huella.
const huella = (t) => createHash("sha256").update(t).digest("hex");

if (!process.argv.includes("--sin-generar")) {
  if (!(await meta("avisos"))) await porLotes("avisos", AV, `
    insert into notifications (user_id, city_id, tpl, title, body, href, created_at, read_at, push_status)
    select u.id, u.home_city_id, 'com_poll_closed', 'Encuesta cerrada', 'Ganó «La Patria» con 52% de 1,204 votos.', '/comunidad', now() - make_interval(secs => g % 31536000),
           case when g % 3 = 0 then now() end, 'enviado'
      from generate_series($1::int, $2::int) g join users u on u.phone = '+1999' || lpad((1 + g % ${n(1_000_000)})::text, 7, '0')`, 500_000);
  await guardarMeta("avisos", AV);
  // ── 2 000 entregas en camino: la de la semilla copiada, cada una con su repartidor (un vecino de la carga), su equipo y su token ──
  const base = await uno(`select o.id, o.business_id as b from operations o join delivery_drivers d on d.id = o.driver_id where o.kind = 'order' and o.mode = 'delivery' order by (o.status = 'confirmed') desc, o.id limit 1`);
  if (!base) { console.error("[carga] la semilla no trae una entrega a domicilio"); process.exit(2); }
  const tokens = Array.from({ length: RUTAS }, () => randomBytes(32).toString("base64url"));
  await generar("repartidores y entregas", [
    `drop table if exists carga_r`,
    `create unlogged table carga_r (k int primary key, user_id uuid, token text, th text)`,
    ...[0].map(() => `insert into carga_r (k, user_id, token, th) select x.i, (select v.id from carga_v v where v.k = 1 + (x.i * 7919) % (select count(*) from carga_v)), x.t, x.h
       from unnest($1::text[], $2::text[]) with ordinality as x(t, h, i)`.replace("$1::text[]", `array[${tokens.map((t) => `'${t}'`).join(",")}]`).replace("$2::text[]", `array[${tokens.map((t) => `'${huella(t)}'`).join(",")}]`)),
    `delete from carga_r where user_id is null`,
    `insert into delivery_drivers (business_id, user_id, display_name, phone, status, accepted_at)
       select '${base.b}', r.user_id, 'Repartidor ' || r.k, '+1570' || lpad((2000000 + r.k)::text, 7, '0'), 'active', now() from carga_r r`,
    `insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, stage, mode, driver_id, details, is_test)
       select 'P-CARGA-' || r.k, 'order', o.city_id, o.business_id, o.user_id, o.pay_mode, gen_random_uuid(), 'confirmed', 'on_the_way', 'delivery',
              (select d.id from delivery_drivers d where d.user_id = r.user_id and d.business_id = o.business_id), o.details, true
         from carga_r r cross join operations o where o.id = ${base.id}`,
    `insert into delivery_tracks (operation_id, city_id, business_id, rider_user_id, driver_id, started_step, token_hash, token_at, sharing_from, is_test)
       select o.id, o.city_id, o.business_id, r.user_id, o.driver_id, 'recogi', r.th, now(), now() - interval '5 minutes', true
         from carga_r r join operations o on o.number = 'P-CARGA-' || r.k`]);
  await guardarMeta("rutas", RUTAS);
  await analizar();
}

const VS = (await q(`select id::text from users where phone like '+1999%' order by phone limit 300`)).map((x) => x.id);
const av = await app("lib/avisos.ts");
await medir("avisar", { linea: "L1210", presupuesto: 30, veces: 200, que: "avisar() con el push encolado (5 M de avisos en la base)" },
  (i) => av.avisar(VS[i % VS.length], "com_poll_closed", { texto: "¿Cuál es el mejor mofongo?", resultado: "Ganó «La Patria»." }, { sinSms: true }));
await medir("mis-avisos", { linea: "L1210", presupuesto: 50, que: "la bandeja de avisos de una persona (cursor)" }, (i) => av.misAvisos(VS[i % VS.length], null));

// ── La ruta: 200 posiciones por segundo durante 30 s, repartidas entre los repartidores (cada uno cada 10 s) ──
const ruta = await app("lib/ruta.ts");
const R = await q(`select r.token, st_y(c.center::geometry) as lat, st_x(c.center::geometry) as lng from carga_r r join delivery_tracks t on t.token_hash = r.th join cities c on c.id = t.city_id order by r.k`);
if (!R.length) anotar("ruta", { linea: "L1260", que: "no hay entregas de la carga en camino", valor: 1, tope: 0, unidad: "error" });
else {
  const pos = new Map(R.map((r) => [r.token, { lat: r.lat, lng: r.lng }]));
  let j = 0;
  const una = (r) => { const p = pos.get(r.token); p.lat += 0.0003; p.lng += 0.0002; return ruta.guardarPosiciones(r.token, { p: [{ t: Date.now(), lat: p.lat, lng: p.lng, acc: 8, vel: 6, rumbo: 90 }] }, "app"); };
  await medir("posicion", { linea: "L1260", presupuesto: 30, veces: 100, que: "guardar una posición del repartidor" }, async () => {
    const r = await una(R[j++ % R.length]);
    if (!r?.activa || r.aceptadas !== 1) throw new Error(`la posición no entró: ${JSON.stringify(r)}`);
  });
  // Ritmo: 200 por segundo durante 30 s (con 4 conexiones, como un proceso de la app). Cuenta lo que entró y lo que se atrasó.
  // Cada repartidor manda cada 10 s (ubic_cada_s): con 2 000 son 200 por segundo; la base rechaza las que llegan antes de tiempo.
  const S = 30, porSeg = Math.max(1, Math.round(R.length / 10)), t0 = Date.now();
  let hechas = 0, malas = 0;
  const lat = [];
  // Cada envío sale a SU hora (t0 + i × 1000/porSeg ms), sin esperar a que terminen los anteriores (como teléfonos de verdad); al final se esperan todos.
  const todos = [];
  for (let i = 0; i < S * porSeg; i++) {
    const cuando = t0 + Math.floor((i * 1000) / porSeg) - Date.now();
    if (cuando > 0) await new Promise((ok) => setTimeout(ok, cuando));
    const r = R[j++ % R.length], a = performance.now();
    todos.push(una(r).catch(() => null).then((x) => { lat.push(performance.now() - a); if (x?.aceptadas === 1) hechas++; else malas++; }));
  }
  await Promise.all(todos);
  const seg = (Date.now() - t0) / 1000;
  anotar("posiciones-por-segundo", { linea: "L1260", que: `posiciones sostenidas (${S} s, ${R.length} repartidores cada 10 s; ${malas} no entraron)`, valor: Math.round(hechas / seg), tope: null, unidad: "por segundo" });
  const ord = lat.sort((a, b) => a - b);
  anotar("posiciones-p95-en-ritmo", { linea: "L1260", que: `p95 de guardar una posición mientras entran ${porSeg} por segundo (un proceso, 10 conexiones)`, valor: +ord[Math.floor(ord.length * 0.95)].toFixed(1), tope: 30, unidad: "ms" });
  anotar("posiciones-que-faltaron", { linea: "L1260", que: `de las ${porSeg} por segundo, cuántas no se sostuvieron (tope: 5 %)`, valor: Math.max(0, porSeg - Math.round(hechas / seg)), tope: Math.max(1, porSeg * 0.05), unidad: "por segundo de menos" });
}
process.exit(await fin() ? 1 : 0);
