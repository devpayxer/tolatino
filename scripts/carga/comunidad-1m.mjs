#!/usr/bin/env node
/* 9b-3 · La Comunidad con 1 M de vecinos, 1 M de publicaciones y 5 M de comentarios (planes 5a–5i; LAUNCH L578, L588, L590, L603, L627, L631,
   L648, L665, L701, L193, L76). Genera en una base DESECHABLE y mide el código real de la app contra el presupuesto de cada fase.
   Uso: DATABASE_URL=postgres://…@127.0.0.1/… node scripts/carga/comunidad-1m.mjs [--sin-generar]   (CARGA_ESCALA=0.01 para probar el guion) */
import { analizar, anotar, app, candado, fin, generar, guardarMeta, medir, meta, n, porLotes, q, STAFF, uno } from "./lib/comun.mjs";

await candado();
const V = n(1_000_000), P = n(1_000_000), C = n(5_000_000), F = n(2_000_000), DM = n(500_000), NEG = n(20_000);
const HZL = "hzl";

if (!process.argv.includes("--sin-generar")) {
  // ── Vecinos: 60 % Hazleton, el resto en las otras cuatro (teléfonos +1999…: no existen en el plan de numeración) ──
  await porLotes("vecinos", V, `
    insert into users (phone, first_name, last_name, home_city_id, lang, is_test, created_at, last_seen_at)
    select '+1999' || lpad(g::text, 7, '0'), 'Vecino', 'C' || g, (array['hzl','hzl','hzl','alw','wbr','scr','rdg','hzl','hzl','hzl'])[1 + g % 10],
           case when g % 4 = 0 then 'en' else 'es' end, true, now() - make_interval(days => g % 700), now() - make_interval(hours => g % 2000)
      from generate_series($1::int, $2::int) g on conflict (phone) do nothing`);
  await generar("perfiles de la comunidad", `
    insert into community_profiles (user_id, rank_level, points_total, coins, followers_n, following_n, posts_n)
    select id, 1 + (abs(hashtext(id::text)) % 6), abs(hashtext(id::text)) % 5000, abs(hashtext(id::text)) % 900, 0, 0, 0 from users where phone like '+1999%'
    on conflict (user_id) do nothing`);
  await generar("tabla de vecinos de la carga", [
    `drop table if exists carga_v`,
    `create unlogged table carga_v as select row_number() over (order by id) as k, id, home_city_id as c from users where phone like '+1999%'`,
    `create index on carga_v (k)`, `analyze carga_v`]);
  const nv = (await uno(`select count(*)::int as n from carga_v`)).n;

  // ── Negocios de carga: 20 mil en Hazleton repartidos en las 17 categorías (~1 200 por categoría: el umbral de L76 para dejar la página numerada) ──
  await porLotes("negocios", NEG, `
    insert into businesses (id, city_id, category_id, name, status, geo, subcategory_ids, created_at, modules_on)
    select 'carga-' || g, 'hzl', k.cat, 'Negocio de carga ' || g, 'active', st_setsrid(st_makepoint(-75.97 + (g % 100) / 5000.0, 40.95 + (g / 100 % 100) / 5000.0), 4326)::geography,
           coalesce((select subcategory_ids from businesses where category_id = k.cat and subcategory_ids is not null limit 1), '{}'), now() - make_interval(days => g % 400), case when g % 5 = 0 then array['nov'] else '{}'::text[] end
      from generate_series($1::int, $2::int) g
      cross join lateral (select (select array_agg(id order by id) from categories)[1 + g % (select count(*)::int from categories)] as cat) k on conflict do nothing`);
  await generar("negocios: estadísticas", `insert into business_stats_cache (business_id, plan, verified, rating_avg, review_count) select id, case when substr(id, 7)::int % 5 = 0 then 'pro' else 'free' end, random() < 0.5, 3.5 + random() * 1.5, (random() * 80)::int from businesses where id like 'carga-%' on conflict do nothing`);
  // ── Publicaciones: 70 % Hazleton, en su ciudad, un año hacia atrás; los contadores ya calculados ──
  await porLotes("publicaciones", P, `
    insert into com_posts (city_id, author_kind, author_user_id, geom, kind, topic, body, lang, publish_at, created_at, status, up_n, down_n, score, comments_n, hot, last_activity_at, business_id, hidden_by, hidden_reason, hidden_at)
    select ci.id, 'user', v.id, st_setsrid(st_makepoint(st_x(ci.center::geometry) + ((g::bigint * 7919) % 1000 - 500) / 20000.0, st_y(ci.center::geometry) + ((g::bigint * 104729) % 1000 - 500) / 20000.0), 4326)::geography,
           (array['pregunta','recomendacion','publicacion','publicacion'])[1 + g % 4], (array['comida','belleza','autos','hogar','salud','tramites','fiestas','ninos','otro'])[1 + g % 9],
           'Publicación de carga ' || g || ': ¿alguien sabe dónde arreglan un carro cerca del centro?', 'es',
           now() - make_interval(secs => (g::bigint * 31) % 31536000), now() - make_interval(secs => (g::bigint * 31) % 31536000),
           case when g % 97 = 0 then 'hidden' else 'visible' end, g % 40, g % 5, g % 40 - g % 5, 0,
           ((g % 40) - (g % 5))::float8 / power(((g::bigint * 31) % 31536000) / 3600.0 + 2, 1.5), now(), case when g % 4 = 1 then 'carga-' || (1 + g % ${NEG}) end,
           case when g % 97 = 0 then 'auto' end, case when g % 97 = 0 then 'Carga: oculta' end, case when g % 97 = 0 then now() end
      from generate_series($1::int, $2::int) g
      join carga_v v on v.k = 1 + (g::bigint * 7) % ${nv}
      join cities ci on ci.id = case when g % 10 < 7 then 'hzl' else v.c end`);
  await generar("tabla de publicaciones", [`drop table if exists carga_p`, `create unlogged table carga_p as select row_number() over (order by id) as k, id, city_id as c from com_posts where body like 'Publicación de carga %'`, `create index on carga_p (k)`, `analyze carga_p`]);
  const np = (await uno(`select count(*)::int as n from carga_p`)).n;

  // ── El hilo grande: 20 raíces con 24 respuestas cada una (500 comentarios) en la publicación más nueva de Hazleton ──
  const hilo = (await uno(`select p.id from com_posts p join carga_p x on x.id = p.id where p.city_id = 'hzl' and p.status = 'visible' order by p.publish_at desc limit 1`)).id;
  await generar("el hilo de 500", [
    `insert into com_comments (post_id, city_id, author_user_id, body, lang, score, up_n, replies_n, created_at)
     select ${hilo}, 'hzl', v.id, 'Raíz ' || g || ' del hilo grande', 'es', 40 - g, 40 - g, 24, now() - make_interval(mins => 600 - g) from generate_series(1, 20) g join carga_v v on v.k = 1 + g`,
    `insert into com_comments (post_id, city_id, parent_id, author_user_id, body, lang, score, created_at)
     select r.post_id, 'hzl', r.id, v.id, 'Respuesta ' || g, 'es', g % 7, r.created_at + make_interval(mins => g) from com_comments r cross join generate_series(1, 24) g join carga_v v on v.k = 100 + g
      where r.post_id = ${hilo} and r.parent_id is null`,
    `update com_posts set comments_n = 500 where id = ${hilo}`]);
  await guardarMeta("hilo", hilo);
  // ── Los 5 M de comentarios repartidos (raíces y respuestas) ──
  await porLotes("comentarios", C, `
    insert into com_comments (post_id, city_id, author_user_id, body, lang, score, up_n, created_at)
    select p.id, p.c, v.id, 'Comentario de carga ' || g || ': yo fui la semana pasada y me atendieron bien.', 'es', g % 9, g % 9, now() - make_interval(secs => (g::bigint * 17) % 31536000)
      from generate_series($1::int, $2::int) g join carga_p p on p.k = 1 + (g::bigint * 13) % ${np} join carga_v v on v.k = 1 + (g::bigint * 11) % ${nv} where p.id <> ${hilo}`, 500_000);
  await generar("conteo de comentarios", `update com_posts p set comments_n = x.n from (select post_id, count(*)::int as n from com_comments group by 1) x where x.post_id = p.id and p.comments_n <> x.n`);
  // ── Votos (3 por publicación en promedio) y una encuesta de 100 mil votos que cierra ──
  await porLotes("votos", n(3_000_000), `
    insert into com_votes (target_kind, target_id, user_id, v, created_at) select 'post', p.id, v.id, case when g % 6 = 0 then -1 else 1 end, now() - make_interval(secs => g % 2592000)
      from generate_series($1::int, $2::int) g join carga_p p on p.k = 1 + (g::bigint * 3) % ${np} join carga_v v on v.k = 1 + (g::bigint * 101) % ${nv} on conflict do nothing`, 500_000);
  await generar("encuesta de 100 mil", [
    `insert into com_posts (city_id, author_kind, author_user_id, geom, kind, body, lang, poll_options, poll_counts, poll_ends_at, publish_at, status)
     select 'hzl', 'user', v.id, ci.center, 'encuesta', 'Encuesta de carga: ¿cuál es el mejor mofongo?', 'es', array['La Patria','El Rincón','Sabor'], array[0,0,0], now() - interval '1 minute', now() - interval '7 days', 'visible'
       from carga_v v, cities ci where v.k = 1 and ci.id = 'hzl'`,
    `insert into com_poll_votes (post_id, user_id, opt) select (select max(id) from com_posts where kind = 'encuesta' and body like 'Encuesta de carga%'), v.id, (v.k % 3)::int
       from carga_v v where v.k <= ${n(100_000)} on conflict do nothing`,
    `update com_posts set poll_counts = array[(select count(*) from com_poll_votes where post_id = com_posts.id and opt = 0), (select count(*) from com_poll_votes where post_id = com_posts.id and opt = 1), (select count(*) from com_poll_votes where post_id = com_posts.id and opt = 2)]::int[]
      where kind = 'encuesta' and body like 'Encuesta de carga%'`]);
  // ── Seguidores (2 M), mensajes directos (500 mil conversaciones y 2 M de mensajes) ──
  await porLotes("seguidores", F, `
    insert into follows (follower_user_id, target_kind, target_id, created_at) select a.id, 'user', b.id::text, now() - make_interval(secs => g % 31536000)
      from generate_series($1::int, $2::int) g join carga_v a on a.k = 1 + (g % ${Math.max(1, Math.floor(nv / 5))}) join carga_v b on b.k = 1 + (g::bigint * 7 + 3) % ${nv} where a.id <> b.id on conflict do nothing`, 500_000);
  await porLotes("conversaciones", DM, `
    insert into dm_threads (a_user_id, b_user_id, city_id, started_by, created_at, last_at, last_text, last_from)
    select least(a.id, b.id), greatest(a.id, b.id), a.c, a.id, now() - make_interval(secs => g % 31536000), now() - make_interval(secs => g % 86400), 'Hola, ¿todavía tienes el sofá?', a.id
      from generate_series($1::int, $2::int) g join carga_v a on a.k = 1 + g % 1000 join carga_v b on b.k = 1000 + (g::bigint * 7) % ${Math.max(2, nv - 1000)} where a.id <> b.id on conflict do nothing`);
  await porLotes("mensajes directos", n(2_000_000), `
    insert into dm_messages (thread_id, sender_user_id, city_id, body, created_at)
    select t.id, t.a_user_id, t.city_id, 'Mensaje de carga ' || g, t.created_at + make_interval(secs => g % 3600)
      from generate_series($1::int, $2::int) g join dm_threads t on t.id = (select min(id) from dm_threads) + (g % ${DM})`, 500_000);
  // ── Hoy (business_posts) y cupones ──
  await porLotes("novedades (Hoy)", n(200_000), `
    insert into business_posts (business_id, city_id, kind, title, body, status, publish_at, ends_at, audience, created_at)
    select 'carga-' || (1 + g % ${NEG}), 'hzl', (array['hoy','aviso','novedad'])[1 + g % 3], 'Novedad ' || g, 'Hoy tenemos sancocho', 'live', now() - make_interval(secs => (g::bigint * 37) % 15552000),
           now() + interval '1 day' - make_interval(secs => (g::bigint * 37) % 15552000), 'all', now() - make_interval(secs => (g::bigint * 37) % 15552000)
      from generate_series($1::int, $2::int) g`);
  await generar("cupones", [`insert into coupons (business_id, city_id, title, cost_coins, monthly_stock, valid_days, status, created_at)
     select 'carga-' || g, 'hzl', jsonb_build_object('es', 'Cupón de carga ' || g, 'en', 'Load coupon ' || g), 80 + (g % 50) * 10, 100, 30, 'live', now() - make_interval(days => g % 60) from generate_series(1, ${n(5_000)}) g`]);
  // ── La Tabla del mes (monthly_boards) para todos los de Hazleton ──
  await generar("tabla del barrio", `insert into monthly_boards (city_id, month, user_id, points, recs, answers) select v.c, date_trunc('month', now() at time zone 'America/New_York')::date, v.id, (v.k * 7919) % 3000, v.k % 13, v.k % 17 from carga_v v on conflict do nothing`);
  await analizar();
}

// ── Medir: el código de la app ──
const VI = (await uno(`select id::text from carga_v where c = 'hzl' order by k limit 1 offset 37`)).id;
const VS = (await q(`select id::text from carga_v where c = 'hzl' order by k limit 200`)).map((x) => x.id);
const centro = await uno(`select st_y(center::geometry) as lat, st_x(center::geometry) as lng from cities where id = 'hzl'`);
const PT = { ciudad: HZL, lat: centro.lat, lng: centro.lng, rad: 10 };
const com = await app("lib/comunidad.ts"), comun = await app("lib/comunidad-comun.ts"), hil = await app("lib/comunidad-hilo.ts");
const F0 = comun.FILTROS0;

await medir("muro-top", { linea: "L578", presupuesto: 50, que: "muro de Hazleton, 20 con cursor (Lo mejor)" }, (i) => com.muro(VS[i % VS.length], HZL, PT, F0, null));
await medir("muro-nuevo", { linea: "L578", presupuesto: 50, que: "muro de Hazleton (Lo nuevo)" }, (i) => com.muro(VS[i % VS.length], HZL, PT, { ...F0, orden: "new" }, null));
let cur = null; for (let k = 0; k < 5; k++) cur = (await com.muro(VI, HZL, PT, F0, cur)).mas;
await medir("muro-pagina-6", { linea: "L578", presupuesto: 50, que: "muro, sexta página por cursor" }, () => com.muro(VI, HZL, PT, F0, cur));
await medir("muro-5-millas", { linea: "L578", presupuesto: 50, que: "muro a 5 millas (st_dwithin)" }, (i) => com.muro(VS[i % VS.length], HZL, PT, { ...F0, dist: 5 }, null));
await medir("muro-siguiendo", { linea: "L603", presupuesto: 50, que: "muro «Siguiendo» de quien sigue a 10" }, (i) => com.muro(VS[i % VS.length], HZL, PT, { ...F0, tab: "sig" }, null));
const HILO = await meta("hilo");
await medir("hilo-500", { linea: "L588", presupuesto: 60, que: "hilo de 500 comentarios en 20 raíces" }, async (i) => { if (!HILO) throw new Error("no está el hilo de 500 (carga_meta)"); const r = await hil.hilo(HILO, VS[i % VS.length], null, "top"); if (!r) throw new Error("el hilo no salió"); return r; });
// Publicaciones de otros (la app no deja votar lo propio: «Lo tuyo lo votan los demás»).
const POSTS = (await q(`select x.id::text from carga_p x join com_posts p on p.id = x.id where x.c = 'hzl' and p.status = 'visible' and p.author_user_id <> all($1::uuid[]) order by x.k desc limit 60`, [VS])).map((x) => x.id);
await medir("votar", { linea: "L588", presupuesto: 30, veces: 100, que: "votar una publicación (contadores)" }, (i) => hil.votar(VS[(i * 7) % VS.length], "post", POSTS[i % POSTS.length], i % 2 ? 1 : -1, null));
await medir("encuesta-100k", { linea: "L590", presupuesto: null, veces: 1, calentar: 0, que: "cerrar una encuesta de 100 mil votos y avisar a todos (avisarMuchos)" }, () => hil.barrerEncuestas());

const vec = await app("lib/vecinos.ts"), msj = await app("lib/mensajes-vecinos.ts");
const MUCHOS = (await uno(`select target_id from follows where target_kind = 'user' group by 1 order by count(*) desc limit 1`)).target_id;
await medir("mensajes", { linea: "L603", presupuesto: 50, que: "Mensajes: mis conversaciones (cursor)" }, (i) => msj.misConversaciones(VS[i % 20], null));
await medir("seguidores", { linea: "L603", presupuesto: 50, que: "seguidores de quien más tiene" }, () => vec.seguidores(MUCHOS, null, true));
await medir("siguiendo", { linea: "L603", presupuesto: 50, que: "a quién sigue" }, (i) => vec.siguiendo(VS[i % VS.length], null, true));

const mod = await app("lib/moderacion.ts"), { db, tx } = await app("lib/db.ts");
await medir("auto-ocultar", { linea: "L627", presupuesto: 30, que: "autoOcultar (reportes de un contenido)" }, (i) => mod.autoOcultar(db(), "com_post", POSTS[i % POSTS.length]));
await medir("revisar-al-escribir", { linea: "L627", presupuesto: 50, que: "revisarAlEscribir (parecidos con pg_trgm en 24 h)" },
  (i) => tx((c) => mod.revisarAlEscribir(c, { kind: "com_post", id: POSTS[i % POSTS.length], autor: VS[i % VS.length], ciudad: HZL, texto: "Publicación de carga: ¿alguien sabe dónde arreglan un carro cerca del centro?" })));
await medir("red-de-cuentas", { linea: "L627", presupuesto: 5000, veces: 3, calentar: 0, que: "redDeCuentas (votos de 7 días; tarea del barrido)" }, () => mod.redDeCuentas());

// Lo que el barrido rehace cada 10 min (sin servidor en la carga no corre solo): se rehace aquí, medido, antes de medir lo que lo lee.
await medir("barrido-comunidad", { linea: "L631", presupuesto: 10000, veces: 1, calentar: 0, que: "barrido: resúmenes de la Comunidad (rangos, activos, candidatos de Recomendados)" }, () => q(`select com_cifras_resumir()`));
const hoy = await app("lib/hoy.ts"), port = await app("lib/comunidad-portada.ts");
await medir("hoy", { linea: "L631", presupuesto: 40, que: "Hoy en el barrio de Hazleton" }, () => hoy.hoyEnElBarrio(HZL, null, null, PT));
await medir("recomendados", { linea: "L631", presupuesto: 50, que: "recomendados por vecinos (180 días)" }, (i) => port.recomendadosPorVecinos(HZL, VS[i % VS.length]));
const tab = await app("lib/tabla.ts");
await medir("tabla", { linea: "L648", presupuesto: 40, que: "Tabla del mes (general)" }, (i) => tab.tabla(VS[i % VS.length], HZL, "actual", "general", null));
await medir("tabla-corta", { linea: "L648", presupuesto: 40, que: "Tabla corta (mi lugar)" }, (i) => tab.tablaCorta(VS[i % VS.length], HZL));
const cup = await app("lib/cupones.ts");
await medir("cupones", { linea: "L665", presupuesto: 50, que: "cupones de Hazleton (20 por página)" }, (i) => cup.cuponesCiudad(VS[i % VS.length], HZL, null));
await medir("mis-canjes", { linea: "L665", presupuesto: 50, que: "mis cupones y movimientos" }, (i) => cup.misCanjes(VS[i % VS.length], null));

const ADM = (await uno(`select user_id::text as id from staff_members where status = 'active' and role = 'admin' limit 1`))?.id ?? VI;
const S = STAFF(ADM);
const gam = await app("lib/admin-gam.ts"), cont = await app("lib/admin-contenido.ts"), ana = await app("lib/admin-analitica.ts"), usr = await app("lib/admin-usuarios.ts"), avi = await app("lib/avisos.ts");
await medir("en-circulacion", { linea: "L665", presupuesto: 300, veces: 10, que: "Super Admin › Gamificación (EN CIRCULACIÓN por ciudad)" }, () => gam.gamificacion(S, { tab: "coin" }));
await q(`select contenido_contar()`);
await medir("contenido", { linea: "L701", presupuesto: 80, que: "Super Admin › Contenido (UNION de 6 tipos con cursor)" }, () => cont.listaContenido(S, cont.leerFiltrosCont({})));
await medir("contenido-totales", { linea: "L701", presupuesto: 10000, veces: 1, calentar: 0, que: "barrido: recontar los totales de Contenido (contenido_contar)" }, () => q(`select contenido_contar()`));
await medir("contenido-reportados", { linea: "L701", presupuesto: 80, que: "Super Admin › Contenido › «Con reporte»" }, () => cont.listaContenido(S, cont.leerFiltrosCont({ rep: "1" })));
const SIG = (await cont.listaContenido(S, cont.leerFiltrosCont({}))).sig;
if (SIG) await medir("contenido-p2", { linea: "L701", presupuesto: 80, que: "Super Admin › Contenido, segunda página (cursor)" }, () => cont.listaContenido(S, { ...cont.leerFiltrosCont({}), c: SIG }));
await medir("analitica-comunidad-al-dia", { linea: "L701", presupuesto: 10000, veces: 1, calentar: 0, que: "barrido: rehacer Analítica › Comunidad de los últimos 40 días (com_analitica_resumir)" }, () => q(`select com_analitica_resumir((now() at time zone 'America/New_York')::date - 40)`));
await medir("analitica-comunidad", { linea: "L701", presupuesto: 300, veces: 5, que: "Analítica › Comunidad (30 días)" }, () => ana.comunidadAnalitica(S, 30));
await medir("resumen-diario", { linea: "L701", presupuesto: 30000, veces: 1, calentar: 0, que: "resumen diario de la Comunidad (una vuelta del barrido)" }, () => avi.resumenComunidad());
const FU = usr.leerFiltros({});
await medir("usuarios-p1", { linea: "L193", presupuesto: 80, veces: 10, que: "Super Admin › Usuarios, página 1 (OFFSET y conteos)" }, () => usr.listaUsuarios(S, FU));
await medir("usuarios-p100", { linea: "L193", presupuesto: 80, veces: 10, que: "Super Admin › Usuarios, página 100" }, () => usr.listaUsuarios(S, { ...FU, pag: 100 }));
const cat = await app("lib/categoria.ts");
const NEGC = (await uno(`select count(*)::int as n from businesses where city_id = 'hzl' and category_id = 'NEG-FOOD' and status = 'active'`)).n;
const pedido = (pagina) => ({ punto: { ...PT, rad: 30 }, cat: "NEG-FOOD", sub: null, filtros: [], orden: cat.ORDENES?.[0] ?? "rec", pagina });
await medir("categoria-p1", { linea: "L76", presupuesto: 50, veces: 10, que: `Comida de Hazleton (${NEGC.toLocaleString("es-US")} negocios), página 1` }, () => cat.resultados(pedido(1)));
await medir("categoria-p50", { linea: "L76", presupuesto: 50, veces: 10, que: "Comida de Hazleton, página 50 (OFFSET)" }, () => cat.resultados(pedido(50)));
anotar("comunidad-filas", { linea: "-", que: "filas generadas", valor: (await uno(`select (select count(*) from users)::int + (select count(*) from com_posts)::int + (select count(*) from com_comments)::int as n`)).n, unidad: "filas" });

process.exit(await fin() ? 1 : 0);
