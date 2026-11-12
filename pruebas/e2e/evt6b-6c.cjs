// 6b · El módulo Eventos del cliente, de punta a punta, en teléfono 390 y escritorio 1360:
// /eventos (Esta noche como historias, destacado, chips de fecha y tipo, secciones, 20 por página con cursor y «Ver más»), /eventos/esta-noche
// (RSVP desde la historia), la ficha oscura (fiesta) y clara (comida) con su JSON-LD, guardar (corazón, con entrar y volver) → Mi cuenta ›
// Guardados › Eventos, RSVP con personas, «Ya no voy», «Cupo lleno», 3 personas a la vez por los últimos lugares (una entra) en la
// pantalla y 10 a la vez en la base (no pasa del cupo), lo oculto / en revisión / de organizador bloqueado / con el módulo apagado o
// pausado nunca sale (lista, ficha, Buscar, Inicio, pestaña), la pestaña Eventos de la ficha, Inicio › Esta semana, Buscar › Eventos,
// Ciudad (cifra de eventos), Noche (la noche especial abre su evento), Novedad con «Ver evento» → Hoy en el barrio (y deja de salir si el
// evento se oculta), el interruptor del módulo en el panel y la pausa del Super Admin, QUIÉN VA en el panel y ÚLTIMOS RSVP en el admin,
// «otro lugar» ubicado con el geocodificador propio, quien trabaja desde casa sale como zona, y el barrido (aviso al abrir puertas,
// RSVP que vence y libera el lugar, «un evento que guardaste es mañana»). Deja los datos como estaban (fixtures cancelados o quitados).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync, exec } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', FOTO = ENT.rec('fotos') + '/portada.jpg';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
// 9b-1 · Los eventos de la semilla 0035 por su título (antes los ids 2, 3, 7, 11 y 12 de una base vieja: en una base nueva son 1, 2, 6, 10 y 11).
const evId = (t) => sql(`select id from events where title->>'es' = '${t}' and status in ('live', 'paused') order by id limit 1`);
const EJ = evId('Jueves de Bachata en Vivo'), EK = evId('Karaoke latino · entrada libre'), ES = evId('Sancocho del domingo en familia'), ET = evId('Taller gratis: inglés para tu entrevista de trabajo'), EP = evId('Comedia dominicana · Noche de risa');
const sqlA = (q) => new Promise((res) => exec(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, (e, so, se) => res(e ? 'ERR ' + se : so.trim())));
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrido = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const RUN = Date.now().toString(36), TAG = `[e6b ${RUN}]`;
const C1 = '5705550122', C2 = '5705550299', C3 = '5705550288', C4 = '5705550433', JUAN = '5705550444', PADRE = '5705550422', TERRAZA = '5705550366', SABOR = '5705550133', ADM = '5705550199', ADM2 = '5705550188';
const PARR = 'parroquia-santa-maria', CASA = 'taquiza-don-chuy';

(async () => {
  require('../lib/negocio-nuevo.cjs').equipo('5705550188'); // 9b-1 · el equipo de prueba que esta prueba usa (antes lo creaba otra prueba)
  const ADMID = uid(ADM);
  const limpiar = () => {
    sql(`update rsvps set status = 'cancelled' where status = 'going' and event_id in (select id from events where title->>'es' like '%[e6b %')`);
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba', hidden_at = null, hidden_by = null, hidden_reason = null where title->>'es' like '%[e6b %' and status <> 'cancelled'`);
    sql(`update business_posts set status = 'removed', updated_at = now() where title like '%[e6b %' and status <> 'removed'`);
    sql(`update items set removed_at = now() where name->>'es' like '%[e6b %' and removed_at is null`);
    sql(`update event_organizers set blocked_at = null, blocked_by = null, blocked_reason = null where business_id = 'el-palacio-show' and blocked_reason like '%[e6b %'`);
    sql(`update businesses set modules_on = array(select distinct x from unnest(modules_on || array['eventos']) x), modules_off = modules_off - 'eventos' where id = 'la-terraza-night'`);
    sql(`update businesses set modules_on = array_remove(modules_on, 'eventos') where id = '${CASA}' and not exists (select 1 from events e where e.business_id = '${CASA}' and e.title->>'es' not like '%[e6b %')`);
    sql(`update rsvps set status = 'cancelled' where status = 'going' and event_id in (${EJ}, ${EK}, ${ES}, ${ET})`);
    sql(`delete from geo_streets where county = 'prueba'`);
    sql(`delete from favorites where kind = 'event' and target_id in (select id::text from events where title->>'es' like '%[e6b %')`);
  };
  limpiar();
  // ── Fixtures (un evento publicado por SQL: aprobado por una persona del equipo; la fecha la arma la base) ──
  const evento = (neg, fmt, ti, dias, h0, h1, entry, o = {}) => {
    const id = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, rsvp_capacity, party_max, doors_before_min, created_by, venue_mode, venue_name, venue_address)
      values ('', 'hzl', '${neg}', '${fmt}', '{"es":"${ti} ${TAG}","en":"${ti} EN ${TAG}"}', (now() at time zone 'America/New_York')::date + ${dias}, ${h0}, ${h1}, '${entry}', '${o.st ?? 'live'}', now(), ${o.st === 'review' ? 'null' : 'now()'}, ${o.st === 'review' ? 'null' : `'${ADMID}'`}, ${o.cap ?? 0}, ${o.pmax ?? 1}, ${o.doors ?? 0}, '${ADMID}', 'own', null, null) returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${id})`);
    return id;
  };
  const fecha = (id) => sql(`select id from event_dates where event_id = ${id} order by starts_at limit 1`);
  const slug = (id) => sql(`select slug from events where id = ${id}`);
  const ahora = Number(sql(`select (extract(hour from now() at time zone 'America/New_York') * 60 + extract(minute from now() at time zone 'America/New_York'))::int`));
  // 9b-1 · Sin depender de la hora (antes: «la prueba corre antes de las 9:30 PM de Hazleton» y fallaba de noche). Los dos eventos de HOY
  // se crean a una hora cualquiera y después su fecha se pone respecto al reloj del servidor: la noche de hoy (local_date = hoy en Hazleton)
  // empieza en 2 h y la charla en 25 min con las puertas ya abiertas. Pasada la medianoche de la noche, el evento sigue siendo de su noche.
  console.log(`  (hora de Hazleton: ${Math.floor(ahora / 60)}:${String(ahora % 60).padStart(2, '0')})`);
  const mover = (id, desde, dur, puertas) => sql(`update event_dates set starts_at = now() + interval '${desde} minutes', doors_at = now() + interval '${desde - puertas} minutes', ends_at = now() + interval '${desde + dur} minutes', local_date = (now() at time zone 'America/New_York')::date where event_id = ${id}`);
  const NOCHE = evento(PARR, 'comunidad', 'Rosario en la plaza', 0, 1200, 1290, 'rsvp', { cap: 40, pmax: 4 }); mover(NOCHE, 120, 90, 30);
  const PUERTAS = evento(PARR, 'comunidad', 'Charla en la puerta', 0, 600, 675, 'rsvp', { cap: 20, pmax: 2, doors: 30 }); mover(PUERTAS, 25, 75, 30);
  const R = evento('sabor-dominicano', 'comida', 'Sancocho de prueba', 1, 780, 960, 'rsvp', { cap: 5, pmax: 6 });
  const BASE = evento(PARR, 'comunidad', 'Cupo de cuatro', 4, 600, 660, 'rsvp', { cap: 4, pmax: 2 });
  const FERIAS = Array.from({ length: 14 }, (_, i) => evento(PARR, 'comunidad', `Feria ${String(i + 1).padStart(2, '0')}`, 3 + i, 600, 720, 'free'));
  const OCULTO = evento(PARR, 'comunidad', 'Oculto por To Latino', 2, 600, 700, 'free');
  sql(`update events set hidden_at = now(), hidden_by = '${ADMID}', hidden_reason = 'prueba ${TAG}' where id = ${OCULTO}`);
  const REVISION = evento(PARR, 'comunidad', 'Esperando revision', 2, 600, 700, 'free', { st: 'review' });
  const PALACIO = evento('el-palacio-show', 'noche', 'Show de organizador bloqueado', 2, 1260, 1440, 'free');
  sql(`update businesses set modules_on = array(select distinct x from unnest(modules_on || array['eventos']) x) where id = '${CASA}'`);
  const ENCASA = evento(CASA, 'comunidad', 'Taller en casa', 2, 600, 720, 'free');
  const DIR_CASA = sql(`select address from businesses where id = '${CASA}'`).replace(/, Hazleton PA$/, '');
  sql(`insert into favorites (user_id, kind, target_id, created_at) values ('${uid(JUAN)}', 'event', '${R}', now() - interval '2 hours') on conflict do nothing`);
  sql(`insert into business_posts (business_id, city_id, kind, title, body, link_kind, event_id, audience, publish_at) values ('sabor-dominicano', 'hzl', 'novedad', 'Ven al sancocho ${TAG}', '', 'event', ${R}, 'all', now())`);
  sql(`insert into items (business_id, module, name, price_cents, svc_kind, section_id, svc_attrs, sort) values ('la-terraza-night', 'svc', '{"es":"Noche especial ${TAG}","en":""}', 1500, 'evento', (select id from item_sections where business_id = 'la-terraza-night' and name->>'es' = 'Esta noche' order by id limit 1), '{"event_id":"${EJ}"}', 99)`);
  sql(`insert into geo_streets (name, norm, l_from, l_to, r_from, r_to, zip_l, zip_r, county, geom) values ('N Wyoming St', dir_abrev('N Wyoming St'), 401, 499, 400, 498, '18201', '18201', 'prueba', st_geomfromtext('LINESTRING(-75.9782 40.9540, -75.9782 40.9570)', 4326))`);
  sql('analyze event_dates');
  const b = await chromium.launch(); const err = [];
  const nueva = async (w, h) => { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1 }); const p = await c.newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|status of 404|Failed to load resource/.test(m.text())) err.push('console: ' + m.text()); }); return p; };
  try {
    // ── 1 · /eventos (anónimo, teléfono y escritorio) ──
    const am = await nueva(390, 844), ad = await nueva(1360, 900);
    await am.goto(B + '/eventos');
    ok(await contiene(am, 'Esta noche') && await contiene(am, 'VER COMO HISTORIAS'), 'Esta noche como historias (lo de hoy en la ciudad)');
    ok(await contiene(am, 'EL PRECIO QUE VES ES EL QUE PAGAS: CARGOS INCLUIDOS.'), 'la línea fija del módulo');
    const total = Number(sql(`select count(*) from event_dates d where d.listable and d.city_id = 'hzl' and d.starts_at > now() - interval '18 hours' and d.ends_at > now() and (d.geom is null or st_dwithin(d.geom, (select center from cities where id = 'hzl'), 5 * 1609.34))
      -- 6f · una serie (o varios días) cuenta UNA vez: su primera fecha viva
      and not exists (select 1 from event_dates p where p.event_id = d.event_id and p.listable and p.starts_at > now() - interval '18 hours' and p.ends_at > now() and (p.starts_at, p.id) < (d.starts_at, d.id))`));
    ok(total > 20 && await contiene(am, `${total} EVENTOS EN HAZLETON`), `«${total} EVENTOS EN HAZLETON» (lo que la base marca listable en el radio)`);
    const txt0 = await texto(am);
    for (const [t, q] of [['Oculto por To Latino', 'oculto por To’Latino'], ['Esperando revision', 'en revisión'], ['Show de organizador bloqueado', 'de un organizador bloqueado (después de bloquear)']]) if (q.startsWith('oculto') || q.startsWith('en revisión')) ok(!txt0.includes(t), `lo ${q} no sale en la lista`);
    ok((await am.locator('[data-evento]').count()) >= 20 && await contiene(am, 'Ver más'), 'la primera página trae 20 y «Ver más»');
    await clic(am.getByRole('button', { name: 'Ver más' }));
    ok(await espera(async () => (await am.locator('[data-screen-label="APP-EVT-BUSQ · móvil"] [data-evento]').count()) === total), `«Ver más» trae el resto con el cursor: ${total} tarjetas, ninguna repetida`);
    ok(!(await vis(am.getByRole('button', { name: 'Ver más' }))), 'sin más páginas, sin «Ver más»');
    await am.screenshot({ path: OUT + 'e6b-busq-m.png', fullPage: true });
    await ad.goto(B + '/eventos'); await ad.waitForTimeout(600); await ad.screenshot({ path: OUT + 'e6b-busq-d.png', fullPage: true });
    ok(await contiene(ad, 'Rosario en la plaza'), 'escritorio: la columna de Esta noche');
    // Filtros
    await am.goto(B + '/eventos?t=boleto'); ok(await contiene(am, 'Jueves de Bachata') && !(await texto(am)).includes('Feria 01'), 'Con boleto: solo con boletos');
    await am.goto(B + '/eventos?t=bachata'); ok(await contiene(am, 'Jueves de Bachata') && !(await texto(am)).includes('Comedia dominicana'), 'género Bachata');
    await am.goto(B + '/eventos?d=hoy'); ok(await contiene(am, 'Rosario en la plaza') && !(await texto(am)).includes('Feria 01'), 'Hoy: solo lo de hoy');
    // (copia 6c) la semilla 0035 deja la «Comedia dominicana» (con boletos) HOY desde el 10 nov: el vacío se prueba con un tipo que hoy no tiene nada.
    await am.goto(B + '/eventos?d=hoy&t=salsa'); ok(await contiene(am, 'Nada con esos filtros'), 'vacío: «Nada con esos filtros»');

    // ── 2 · Esta noche (historias) y RSVP desde la historia ──
    const c1 = await nueva(390, 844); await entrar(c1, C1);
    await c1.goto(B + '/eventos/esta-noche');
    ok(await contiene(c1, 'EVENTOS · ESTA NOCHE') && await contiene(c1, 'Rosario en la plaza'), 'APP-EVT-NOCHE: historias de hoy');
    await c1.screenshot({ path: OUT + 'e6b-noche-m.png' });
    const slide = c1.locator(`[data-evento="${NOCHE}"]`).first(); await slide.scrollIntoViewIfNeeded();
    await slide.getByRole('button', { name: 'Voy · Gratis' }).click();
    ok(await contiene(c1, 'Nos vemos ahí') && await espera(() => sql(`select count(*) from rsvps where event_id = ${NOCHE} and user_id = '${uid(C1)}' and status = 'going'`) === '1'), '«Voy · Gratis» desde la historia guarda el RSVP');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${uid(C1)}' and tpl = 'rsvp_ok' and created_at > now() - interval '1 minute'`) !== '0'), 'aviso «Vas a …» en la app (sin SMS)');
    const nd = await nueva(1360, 900); await nd.goto(B + '/eventos/esta-noche'); await nd.waitForTimeout(500); await nd.screenshot({ path: OUT + 'e6b-noche-d.png' });

    // ── 3 · La ficha oscura (fiesta) y la clara (comida); JSON-LD ──
    await ad.goto(B + `/eventos/${slug(EJ)}`);
    ok(await ad.locator('[data-tema="oscuro"]').count() === 1 && await contiene(ad, 'Line-up') && await contiene(ad, 'QUEDAN'), 'fiesta o show: ficha oscura, line-up, boletos con lo que queda (6c)');
    const ld = JSON.parse(await ad.locator('script[type="application/ld+json"]').innerText());
    ok(ld['@type'] === 'Event' && ld.location?.name && ld.organizer?.name === 'La Terraza Night Club', 'schema.org/Event en la ficha pública');
    await ad.screenshot({ path: OUT + 'e6b-ficha-oscura-d.png', fullPage: true });
    await am.goto(B + `/eventos/${slug(EJ)}`); await am.waitForTimeout(500); await am.screenshot({ path: OUT + 'e6b-ficha-oscura-m.png', fullPage: true });
    await clic(am.getByRole('button', { name: 'Boletos', exact: true })); ok(await espera(async () => /\/boletos\?fecha=/.test(am.url())), 'con boletos: «Boletos» abre la compra (6c)');

    // ── 4 · Guardar (corazón): sin sesión → entrar → vuelve → Guardados › Eventos ──
    const c2 = await nueva(390, 844);
    await c2.goto(B + `/eventos/${slug(R)}`);
    ok(await c2.locator('[data-tema="claro"]').count() === 1, 'comida: ficha clara');
    await clic(c2.getByRole('button', { name: 'Guardar' }));
    ok(await espera(() => c2.url().includes('/entrar?volver=')), 'guardar sin sesión manda a entrar con «volver»');
    await entrar(c2, C2); await c2.goto(B + `/eventos/${slug(R)}`);
    await clic(c2.getByRole('button', { name: 'Guardar' }));
    ok(await contiene(c2, 'Guardado') && await espera(() => sql(`select count(*) from favorites where user_id = '${uid(C2)}' and kind = 'event' and target_id = '${R}'`) === '1'), 'guardado (favorites.kind event)');
    await c2.goto(B + '/cuenta/guardados?f=evt');
    ok(await contiene(c2, 'Sancocho de prueba'), 'Mi cuenta › Guardados › Eventos lo muestra');
    await c2.screenshot({ path: OUT + 'e6b-guardados-m.png', fullPage: true });

    // ── 5 · RSVP con personas, cambiar, «Ya no voy», cupo ──
    await c2.goto(B + `/eventos/${slug(R)}`);
    ok(await contiene(c2, 'QUEDAN 5 LUGARES') && await contiene(c2, '¿CUÁNTOS VAN?'), 'cupo de 5 · ¿cuántos van?');
    await clic(c2.getByRole('button', { name: '2', exact: true }));
    await clic(c2.getByRole('button', { name: 'Voy · 2' }));
    ok(await contiene(c2, 'Vas a este evento') && sql(`select rsvp_n from event_dates where event_id = ${R}`) === '2', 'RSVP de 2 personas: la base cuenta 2');
    await c2.screenshot({ path: OUT + 'e6b-ficha-clara-m.png', fullPage: true });
    await clic(c2.getByRole('button', { name: '1', exact: true }));
    ok(await espera(() => sql(`select rsvp_n from event_dates where event_id = ${R}`) === '1'), 'cambiar a 1 persona: la base cuenta 1');
    await clic(c2.getByRole('button', { name: 'Ya no voy' }));
    ok(await contiene(c2, 'Quitamos tu RSVP') && await espera(() => sql(`select rsvp_n from event_dates where event_id = ${R}`) === '0'), '«Ya no voy» libera el lugar');
    // Pedir más de los que quedan: la base contesta y la pantalla lo dice.
    sql(`insert into rsvps (event_date_id, user_id, party) values (${fecha(R)}, '${uid(C1)}', 2)`);
    await c2.goto(B + `/eventos/${slug(R)}`);
    // ── 3 personas a la vez por los 3 últimos lugares (en la pantalla): una entra, dos ven «Cupo lleno» ──
    const P = [];
    for (const t of [C2, C3, C4]) { const p = t === C2 ? c2 : await nueva(390, 844); if (t !== C2) await entrar(p, t); await p.goto(B + `/eventos/${slug(R)}`); await clic(p.getByRole('button', { name: '3', exact: true })); P.push(p); }
    ok(await contiene(P[0], 'QUEDAN 3 LUGARES'), 'quedan 3 lugares para los tres');
    await Promise.all(P.map(async (p) => (await vis(p.getByRole('button', { name: 'Voy · 3' }))).click()));
    await new Promise((r) => setTimeout(r, 2500));
    const vas = (await Promise.all(P.map((p) => texto(p)))).filter((t) => t.includes('Vas a este evento')).length;
    const llenos = (await Promise.all(P.map((p) => texto(p)))).filter((t) => /Cupo lleno|Solo quedan/.test(t)).length;
    ok(vas === 1 && llenos >= 2, `3 a la vez por 3 lugares con 3 personas cada uno: entra 1, ${llenos} ven «Cupo lleno»`);
    ok(sql(`select rsvp_n from event_dates where event_id = ${R}`) === '5' && sql(`select count(*) from rsvps where event_id = ${R} and status = 'going'`) === '2', 'la base: 5 de 5, dos RSVP vivos (sin sobreventa)');
    await P[P.length - 1].goto(B + `/eventos/${slug(R)}`);
    if (!(await texto(P[P.length - 1])).includes('Vas a este evento')) ok(await contiene(P[P.length - 1], 'Cupo lleno'), 'la ficha dice «Cupo lleno»');
    // ── 10 a la vez en la base por 4 lugares: exactamente 4 ──
    const U = sql(`select id from users where phone like '+1570555%' order by phone limit 10`).split('\n');
    const R10 = await Promise.all(U.map((u) => sqlA(`insert into rsvps (event_date_id, user_id, party) values (${fecha(BASE)}, '${u}', 1)`)));
    ok(R10.filter((x) => !x.startsWith('ERR')).length === 4 && sql(`select rsvp_n from event_dates where event_id = ${BASE}`) === '4', `10 a la vez en la base por 4 lugares: entran 4 (${R10.filter((x) => x.startsWith('ERR')).length} rechazados con «cupo lleno»)`);
    ok(/derivados/.test((() => { try { sql(`update event_dates set rsvp_n = 0 where event_id = ${BASE}`); return ''; } catch (e) { return String(e.stderr); } })()), 'el contador de RSVP no se edita a mano (lo lleva la base)');
    ok(/no baja/.test((() => { try { sql(`update events set rsvp_capacity = 2 where id = ${BASE}`); return ''; } catch (e) { return String(e.stderr); } })()), 'el cupo no baja de los lugares ya guardados');

    // ── 6 · Lo oculto, en revisión, de un organizador bloqueado y con el módulo apagado o pausado nunca sale ──
    sql(`insert into event_organizers (business_id, city_id, blocked_at, blocked_by, blocked_reason) values ('el-palacio-show', 'hzl', now(), '${ADMID}', 'prueba ${TAG}') on conflict (business_id) do update set blocked_at = now(), blocked_by = excluded.blocked_by, blocked_reason = excluded.blocked_reason, verified_at = null`);
    ok(sql(`select bool_or(listable)::text from event_dates where event_id in (${EP}, ${PALACIO})`) === 'false', 'organizador bloqueado: la base quita listable de todas sus fechas');
    await am.goto(B + '/eventos');
    const tx = await texto(am);
    ok(!tx.includes('Oculto por To Latino') && !tx.includes('Esperando revision') && !tx.includes('Show de organizador bloqueado') && !tx.includes('Comedia dominicana'), 'lista: nada oculto, en revisión ni de un organizador bloqueado');
    for (const [id, q] of [[OCULTO, 'oculto'], [REVISION, 'en revisión'], [PALACIO, 'organizador bloqueado']]) { const r = await am.goto(B + `/eventos/${slug(id)}`); ok(r.status() === 404, `la ficha de un evento ${q} no existe (404)`); }
    await am.goto(B + '/buscar?q=revision'); ok(!(await texto(am)).includes('Esperando revision'), 'Buscar no encuentra lo que está en revisión');
    await am.goto(B + '/buscar?q=comedia'); ok(!(await texto(am)).includes('Comedia dominicana · Noche'), 'Buscar no encuentra lo de un organizador bloqueado');
    sql(`update event_organizers set blocked_at = null, blocked_by = null, blocked_reason = null where business_id = 'el-palacio-show'`);
    ok(sql(`select listable::text from event_dates where event_id = ${EP}`) === 'true', 'al desbloquear vuelve a salir (la base lo recalcula)');
    // Interruptor del módulo en el panel (La Terraza)
    const tp = await nueva(390, 844); await entrar(tp, TERRAZA);
    await tp.goto(B + '/panel/la-terraza-night/eventos');
    ok(await contiene(tp, 'Eventos en To’Latino') && await contiene(tp, 'Encendido'), 'panel › Eventos: el interruptor del módulo, encendido');
    await clic(tp.getByRole('switch', { name: 'Eventos en To’Latino' }));
    ok(await espera(() => sql(`select bool_or(listable)::text from event_dates where event_id in (${EJ}, ${EK})`) === 'false'), 'apagado: sus fechas dejan de ser listables');
    await tp.screenshot({ path: OUT + 'e6b-panel-modulo-m.png', fullPage: true });
    await am.goto(B + '/eventos'); ok(!(await texto(am)).includes('Jueves de Bachata'), '… y no salen en Eventos');
    ok((await am.goto(B + `/eventos/${slug(EJ)}`)).status() === 404, '… ni su ficha');
    await tp.reload(); await clic(tp.getByRole('switch', { name: 'Eventos en To’Latino' }));
    ok(await espera(() => sql(`select listable::text from event_dates where event_id = ${EJ}`) === 'true'), 'encendido otra vez: vuelven a salir');
    await tp.goto(B + '/panel/la-terraza-night/vendes'); ok(await contiene(tp, 'Eventos') && await contiene(tp, 'ENCENDIDO'), 'Lo que vendes › Eventos con su estado');
    // Pausa del Super Admin
    const sa = await nueva(1360, 900); await entrar(sa, ADM);
    await sa.goto(B + '/admin/negocios/la-terraza-night?tab=cont');
    await clic(sa.getByText('Pausar Eventos')); await clic(sa.getByText('Eventos engañosos', { exact: true })); await clic(sa.getByRole('button', { name: 'Confirmar', exact: true }));
    ok(await espera(() => sql(`select (modules_off ? 'eventos')::text from businesses where id = 'la-terraza-night'`) === 'true') && sql(`select listable::text from event_dates where event_id = ${EJ}`) === 'false', 'Super Admin › Pausar Eventos: sus eventos dejan de salir');
    await tp.goto(B + '/panel/la-terraza-night/eventos'); ok(await contiene(tp, 'PAUSADO POR TO’LATINO') && await contiene(tp, 'Eventos engañosos'), 'el panel dice «PAUSADO POR TO’LATINO» con el motivo');
    await sa.reload(); await clic(sa.getByText('Reanudar').last()); { const t = await vis(sa.locator('textarea')); await t.fill('Revisado, todo en orden'); } await clic(sa.getByRole('button', { name: 'Confirmar', exact: true }));
    ok(await espera(() => sql(`select listable::text from event_dates where event_id = ${EJ}`) === 'true'), 'Reanudar: vuelven a salir');

    // ── 7 · Ficha del negocio › Eventos, Inicio › Esta semana, Buscar › Eventos, Ciudad ──
    await am.goto(B + '/n/la-terraza-night?tab=evt');
    ok(await contiene(am, 'Próximos eventos') && await contiene(am, 'Jueves de Bachata'), 'Ficha › Eventos: sus fechas vivas (réplica)');
    await am.screenshot({ path: OUT + 'e6b-tab-m.png', fullPage: true });
    await ad.goto(B + '/n/la-terraza-night?tab=evt'); await ad.waitForTimeout(400); await ad.screenshot({ path: OUT + 'e6b-tab-d.png', fullPage: true });
    await clic(ad.locator(`[data-evento="${EJ}"]`)); ok(await espera(() => ad.url().includes(`/eventos/${slug(EJ)}`)), 'la tarjeta abre la ficha del evento');
    await am.goto(B + '/'); ok(await contiene(am, 'Esta semana') && await contiene(am, 'Rosario en la plaza') && !(await texto(am)).includes('Oculto por To Latino'), 'Inicio › Esta semana (sin lo oculto)');
    await am.screenshot({ path: OUT + 'e6b-inicio-m.png', fullPage: true });
    await ad.goto(B + '/'); await ad.waitForTimeout(400); await ad.screenshot({ path: OUT + 'e6b-inicio-d.png', fullPage: true });
    await am.goto(B + '/buscar?q=sancocho'); ok(await contiene(am, 'Eventos') && await contiene(am, 'Sancocho de prueba'), 'Buscar › «sancocho»: la sección Eventos');
    await am.screenshot({ path: OUT + 'e6b-buscar-m.png', fullPage: true });
    await ad.goto(B + '/buscar?q=feria&tab=evt'); ok(await contiene(ad, 'Feria 01') && await contiene(ad, 'Este fin de semana'), 'Buscar › pestaña Eventos con sus chips');
    await ad.screenshot({ path: OUT + 'e6b-buscar-d.png', fullPage: true });
    await ad.goto(B + '/buscar?q=feria&tab=evt&ef=d0'); ok(await contiene(ad, 'No hay eventos con ese filtro.'), 'Buscar › Eventos · Hoy: «No hay eventos con ese filtro.»');
    await ad.goto(B + '/ciudad'); /* 9b-1 · la ventana de ciudad se abre con /ciudad (→ /?ciudad); «?ciudad=1» ya no: un id de ciudad es de la página */ ok(await espera(async () => /\d+ negocios · \d+ eventos/.test(await texto(ad))), 'Ciudad: «N negocios · M eventos» en el radio');

    // ── 8 · Noche: la noche especial abre su evento ──
    await am.goto(B + '/n/la-terraza-night?tab=svc');
    ok(await contiene(am, `Noche especial ${TAG}`), 'Noche: la noche especial con su evento en vivo sale en la ficha');
    await clic(am.getByRole('button', { name: 'Ver evento' })); ok(await espera(() => am.url().includes(`/eventos/${slug(EJ)}`)), '«Ver evento» abre la ficha del evento');
    sql(`update events set hidden_at = now(), hidden_by = '${ADMID}', hidden_reason = 'prueba ${TAG}' where id = ${EJ}`);
    await am.goto(B + '/n/la-terraza-night?tab=svc'); ok(!(await texto(am)).includes(`Noche especial ${TAG}`), 'con el evento oculto, la noche especial no sale');
    sql(`update events set hidden_at = null, hidden_by = null, hidden_reason = null where id = ${EJ}`);

    // ── 9 · Novedad con «Ver evento» → Hoy en el barrio ──
    await am.goto(B + '/comunidad/hoy'); ok(await contiene(am, 'EVENTO · VER EVENTO') && await contiene(am, 'Ven al sancocho'), 'Hoy en el barrio: «EVENTO · VER EVENTO»');
    await am.screenshot({ path: OUT + 'e6b-hoy-m.png', fullPage: true });
    await am.goto(B + '/n/sabor-dominicano?tab=nov'); ok(await contiene(am, 'Ver evento'), 'Novedades de la ficha: el botón «Ver evento»');
    await clic(am.getByText('Ver evento').first()); ok(await espera(() => am.url().includes(`/eventos/${slug(R)}`)), '… abre el evento');
    sql(`update events set hidden_at = now(), hidden_by = '${ADMID}', hidden_reason = 'prueba ${TAG}' where id = ${R}`);
    ok(sql(`select count(*) from business_posts p where p.title like 'Ven al sancocho ${TAG}%' and post_en_hoy(p)`) === '0', 'evento oculto: la novedad deja de estar en Hoy (post_en_vivo)');
    await am.goto(B + '/comunidad/hoy'); ok(!(await texto(am)).includes('Ven al sancocho'), '… y no sale en Hoy en el barrio');
    sql(`update events set hidden_at = null, hidden_by = null, hidden_reason = null where id = ${R}`);

    // ── 10 · QUIÉN VA (panel) y ÚLTIMOS RSVP (admin) ──
    const sp = await nueva(1360, 900); await entrar(sp, SABOR);
    await sp.goto(B + `/panel/sabor-dominicano/eventos?det=evt:${R}`);
    ok(await contiene(sp, 'QUIÉN VA · 5') && await contiene(sp, 'Marisol'), 'panel › la ficha: QUIÉN VA con personas (nombre + inicial)');
    await sp.screenshot({ path: OUT + 'e6b-panel-quien-d.png', fullPage: true });
    await sa.goto(B + `/admin/eventos/${R}`);
    ok(await contiene(sa, 'SALE EN EVENTOS') && await contiene(sa, 'ÚLTIMOS RSVP'), 'Super Admin › la ficha: si sale al público y los últimos RSVP');
    await sa.screenshot({ path: OUT + 'e6b-admin-rsvp-d.png', fullPage: true });

    // ── 11 · «Otro lugar» ubicado con el geocodificador propio (la Parroquia, verificada, lo publica) ──
    const pd = await nueva(1360, 900); await entrar(pd, PADRE);
    await pd.goto(B + `/panel/${PARR}/eventos?det=evt:new:comunidad`);
    const [fc] = await Promise.all([pd.waitForEvent('filechooser'), clic(pd.getByRole('button', { name: 'Subir cartel' }))]); await fc.setFiles(FOTO);
    await espera(async () => (await pd.locator('text=CARTEL').count()) > 1, 15000);
    await (await vis(pd.getByLabel('NOMBRE', { exact: true }))).fill(`Kermés en el salón ${TAG}`);
    await clic(pd.getByText('En otro lugar', { exact: true }));
    await (await vis(pd.getByLabel('LUGAR', { exact: true }))).fill('Salón San José');
    await (await vis(pd.getByLabel('DIRECCIÓN', { exact: true }))).fill('450 N Wyoming St');
    await (await vis(pd.getByLabel('CÓDIGO POSTAL', { exact: true }))).fill('18201');
    await pd.screenshot({ path: OUT + 'e6b-otro-lugar-d.png', fullPage: true });
    await clic(pd.getByRole('button', { name: 'Publicar evento', exact: true }));
    ok(await espera(() => sql(`select count(*) from events where title->>'es' like 'Kermés en el salón ${TAG}%' and status = 'live' and geom is not null and venue_zip = '18201'`) === '1'), 'otro lugar con código postal: ubicado en el mapa (geom) con el geocodificador propio');
    const KM = sql(`select id from events where title->>'es' like 'Kermés en el salón ${TAG}%'`);
    ok(sql(`select (geom is not null)::text from event_dates where event_id = ${KM}`) === 'true', '… y la fecha copia el punto (GIST)');
    await ad.goto(B + `/eventos/${slug(KM)}`);
    ok(await contiene(ad, 'Salón San José') && await contiene(ad, 'CÓMO LLEGAR') && await contiene(ad, ' MI'), 'la ficha: el lugar, «Cómo llegar» y la distancia');

    // ── 12 · Quien trabaja desde casa: zona, nunca su dirección ──
    await am.goto(B + `/eventos/${slug(ENCASA)}`);
    const tc = await texto(am), html = await am.content();
    ok(tc.includes('Zona de Hazleton') && !tc.includes(DIR_CASA) && !html.includes(DIR_CASA), `en casa: «Zona de Hazleton», sin la dirección (${DIR_CASA}) ni en el HTML`);
    ok(!tc.includes('CÓMO LLEGAR'), '… y sin «Cómo llegar» a su casa');

    // ── 13 · El barrido: aviso al abrir puertas, el RSVP que vence libera el lugar, «un evento que guardaste es mañana» ──
    sql(`insert into rsvps (event_date_id, user_id, party) values (${fecha(PUERTAS)}, '${uid(C3)}', 2)`);
    barrido();
    ok(sql(`select count(*) from notifications where user_id = '${uid(C3)}' and tpl = 'rsvp_vence' and ref_id = '${PUERTAS}'`) === '1' && sql(`select (doors_notified_at is not null)::text from rsvps where event_id = ${PUERTAS} and user_id = '${uid(C3)}'`) === 'true', 'al abrir puertas: «tu lugar se guarda hasta …» (una vez)');
    barrido(); ok(sql(`select count(*) from notifications where user_id = '${uid(C3)}' and tpl = 'rsvp_vence' and ref_id = '${PUERTAS}'`) === '1', '… no se repite en el siguiente barrido');
    sql(`update rsvps set hold_until = now() - interval '1 minute' where event_id = ${PUERTAS} and status = 'going'`);
    barrido();
    ok(sql(`select status from rsvps where event_id = ${PUERTAS} and user_id = '${uid(C3)}'`) === 'expired' && sql(`select rsvp_n || '|' || going_n from event_dates where event_id = ${PUERTAS}`) === '0|2', 'pasadas las puertas + rsvp_guarda_min: el RSVP vence, el lugar se libera (van sigue contando)');
    // 9b-1 · «El día antes» sale desde la hora de Configuración (evt_recordatorio_hora, 10 AM; mínimo 6 AM): antes de esa hora no sale todavía.
    // La prueba espera lo que dice la regla a la hora del servidor (antes: siempre «sí», y de madrugada fallaba).
    { const hNY = Number(sql(`select extract(hour from now() at time zone 'America/New_York')::int`)), hCfg = Number(sql(`select cfg_int('evt_recordatorio_hora')`));
      const n = sql(`select count(*) from notifications where user_id = '${uid(JUAN)}' and tpl = 'evt_guardado_cerca' and ref_id = '${R}'`);
      if (hNY >= hCfg) ok(n === '1', '«Un evento que guardaste es mañana» a quien lo guardó y no va');
      else ok(n === '0', `«Un evento que guardaste es mañana»: a las ${hNY} h todavía no (sale desde las ${hCfg} h)`); }
    ok(!err.length, `sin errores en la consola (${err.length})`);
  } finally {
    if (err.length) console.log(err.slice(0, 8).join('\n'));
    limpiar();
    await b.close();
  }
  console.log('evt6b OK');
})().catch((e) => { console.error(e); process.exit(1); });
