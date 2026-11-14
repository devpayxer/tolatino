// 9n · Lo diferido del negocio, el Repartidor y la operación del Super Admin (fase9-apertura.md §4 9n), de punta a punta, a 390 y a 1360:
//  1 · Panel › Entrega pide código de recogida y prueba de entrega; el negocio ofrece un pedido a sus repartidores en línea y el repartidor ve la
//      oferta con su cuenta regresiva; «Aceptar» es el paso que inicia la entrega (el pedido pasa a él y el negocio recibe el aviso).
//  2 · Una oferta que nadie acepta vence (Configuración › Repartidor a 20 s): el barrido la cierra y el negocio recibe «Nadie aceptó el pedido».
//  3 · El código de recogida que dice el negocio (uno equivocado no sirve); el repartidor le escribe al cliente dentro de la app y nunca recibe su
//      teléfono; el código del cliente equivocado resta intentos; la foto de la entrega (privada) es la prueba y «Entregado» cierra; el cliente ve su
//      foto y otra cuenta no (404); la base no deja cerrar un delivery sin prueba.
//  4 · Super Admin › Repartidores: la lista, el 360°, una incidencia (el repartidor reporta un accidente) que sale en Colas y se resuelve con motivo;
//      suspender (el repartidor no puede ponerse en línea) y levantar.
//  5 · Colas › Ajustes (quién ve cada cola y feriados del equipo) y Configuración: «Grupos cancelados que abren un caso», antes en solo lectura, se
//      cambia y Colas › Grupos que no abrieron lo dice con el número nuevo; se devuelve.
//  6 · Panel › Horario: feriados, vacaciones y temporada; Panel › Más › Lo que te avisamos (apagar «Pedidos» y el aviso no llega).
// Precondiciones propias (existenciaPropia): el repartidor, la clienta, la otra cuenta y el Admin son teléfonos 555 libres de esta corrida; los
// pedidos son de esta corrida (client_key propio); el Admin entra con segundo factor por staff_mfa_pruebas y deja el equipo al terminar; lo que se
// cambia de Sabor Dominicano y de Configuración se devuelve en finally. Cuenta solo SUS filas (por número de pedido y por persona).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const { telefonoLibre } = require('../lib/telefono-libre.cjs');
const OUT = ENT.OUT, B = ENT.B, BIZ = 'sabor-dominicano', P = '/panel/' + BIZ, DUENO = '5705550133';
const sql = (q) => execSync(`docker exec -i ${ENT.DB} psql -U tolatino -d tolatino -At -v ON_ERROR_STOP=1`, { input: q, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await dormir(250); } throw new Error('no visible: ' + l); };
const espera = async (f, v, veces = 60) => { for (let i = 0; i < veces; i++) { if (f() === v) return v; await dormir(250); } return f(); };
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const M = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, D = { viewport: { width: 1360, height: 900 } };
const ID = crypto.randomBytes(3).toString('hex');
const ck = (i) => `c0e1c6b0-9a9a-4000-8000-${ID}${String(i).padStart(6, '0')}`;

(async () => {
  const REP = telefonoLibre('5705557'), CLI = telefonoLibre('5705558'), OTRO = telefonoLibre('5705559'), ADM = telefonoLibre('5705556');
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values
        ('+1${REP}', now(), 'Rolando', 'Neg${ID}', 'hzl', 'es', true), ('+1${CLI}', now(), 'Celia', 'Neg${ID}', 'hzl', 'es', true),
        ('+1${OTRO}', now(), 'Otto', 'Neg${ID}', 'hzl', 'es', true), ('+1${ADM}', now(), 'Adela', 'Neg${ID}', 'hzl', 'es', true) on conflict (phone) do nothing;`);
  const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
  const RU = uid(REP), CU = uid(CLI), AU = uid(ADM);
  sql(`insert into staff_members (user_id, role, status) values ('${AU}', 'admin', 'active') on conflict (user_id) do update set role = 'admin', status = 'active';
       insert into staff_mfa_pruebas (phone, note) values ('+1${ADM}', 'neg9n · Admin propio de la corrida') on conflict do nothing;`);
  // Sabor Dominicano: delivery con su equipo, abierto, código de recogida y prueba de entrega (se devuelve al terminar).
  // El horario de esta corrida: abierto todo el día (el estado abierto/cerrado no depende de la hora a la que corre); se devuelve al terminar.
  const horas = sql(`select coalesce(json_agg(json_build_object('w', weekday, 'o', open, 'r', ranges)), '[]') from business_hours where business_id = '${BIZ}' and module = ''`);
  sql(`update business_hours set ranges = '[["00:00","00:00"]]'::jsonb, open = true where business_id = '${BIZ}' and module = ''`);
  const antes = sql(`select coalesce(proof::text, 'f') || '|' || coalesce(pickup_code::text, 'f') from delivery_settings where business_id = '${BIZ}'`);
  sql(`update delivery_settings set delivery = true, who = 'team', proof = true, pickup_code = true where business_id = '${BIZ}';
       delete from business_notif_prefs where business_id = '${BIZ}';
       update delivery_offers set status = 'cancelled' where business_id = '${BIZ}' and status = 'open';
       insert into delivery_drivers (business_id, user_id, display_name, phone, vehicle, status, online, online_at, accepted_at) values ('${BIZ}', '${RU}', 'Rolando Neg${ID}', '+1${REP}', 'moto', 'active', true, now(), now());`);
  const DID = sql(`select id from delivery_drivers where user_id = '${RU}' and business_id = '${BIZ}' and status = 'active'`);
  // Un delivery aceptado y sin repartidor, de esta corrida.
  const pedido = (i) => sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, details, subtotal_cents, delivery_cents, tax_cents, total_cents, pay_mode,
        sent_at, answered_at, confirmed_at, ready_at, client_key, is_test)
      values (nextval('operations_order_seq')::text, 'order', 'hzl', '${BIZ}', '${CU}', 'confirmed', 'preparing', 'delivery',
        jsonb_build_object('to', jsonb_build_object('label', 'casa', 'street', '${100 + i} W Oak St', 'apt', null, 'zip', '18201', 'mi', 0.6), 'drop', jsonb_build_object('drop', 'mano', 'at', '["timbre"]'::jsonb, 'note', '')),
        900, 300, 54, 1254, 'app', now(), now(), now(), now() + interval '10 minutes', '${ck(i)}', true) returning id, number)
      select number from o;`);
  const N1 = pedido(1), N2 = pedido(2);
  const op = (num, c) => sql(`select ${c} from operations where number = '${num}'`);
  const b = await chromium.launch();
  const err = [];
  const watch = (p, tag) => { p.on('pageerror', (e) => err.push(tag + ' ' + e.message)); };
  const prefs = { oferta: sql(`select value::text from platform_config where key = 'oferta_seg'`), grupos: sql(`select value::text from platform_config where key = 'insc_grupos_n'`) };
  try {
    // ── 1 · Panel › Entrega y la oferta con cuenta regresiva ──
    const dCtx = await b.newContext(D), d = await dCtx.newPage(); watch(d, 'panel'); await entrar(d, DUENO);
    await d.goto(B + P + '/entrega'); await d.getByText('AL RECOGER Y AL ENTREGAR').first().waitFor();
    ok(await d.getByText('Código de recogida', { exact: true }).first().isVisible() && await d.getByText('Prueba de entrega', { exact: true }).first().isVisible(), 'Panel › Entrega: código de recogida y prueba de entrega');
    await d.screenshot({ path: OUT + 'neg9n-1-entrega-1360.png', fullPage: true });
    await d.goto(B + P + `/hoy?det=ped:${N1}`); const det = d.locator('aside[data-screen-label="Panel v2 · detalle"]');
    await clic(det.getByText('Ofrecer a los que están en línea', { exact: true }));
    ok(await espera(() => sql(`select count(*) from delivery_offers f join operations o on o.id = f.operation_id where o.number = '${N1}' and f.status = 'open'`), '1') === '1', `pedido #${N1}: oferta abierta a los repartidores en línea`);
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RU}' and tpl = 'drv_oferta' and ref_id = '${N1}'`), '1') === '1', 'al repartidor le llega «Pedido para llevar»');
    await d.goto(B + P + `/hoy?det=ped:${N1}`); await det.getByText(/vence en \d+ s/).first().waitFor();
    await d.screenshot({ path: OUT + 'neg9n-1-oferta-panel-1360.png' });
    const rCtx = await b.newContext(M), r = await rCtx.newPage(); watch(r, 'repartidor'); await entrar(r, REP);
    await r.goto(B + '/repartidor'); await r.getByText(/te ofrece un pedido · quedan \d+ s/).first().waitFor();
    ok((await r.getByText(/te ofrece un pedido · quedan \d+ s/).count()) === 1, 'una sola oferta abierta (la de esta corrida)');
    const s1 = Number((await r.getByText(/quedan \d+ s/).first().innerText()).match(/quedan (\d+) s/)[1]); await dormir(2200);
    const s2 = Number((await r.getByText(/quedan \d+ s/).first().innerText()).match(/quedan (\d+) s/)[1]);
    ok(s1 > 0 && s1 <= 60 && s2 < s1, `la cuenta regresiva baja (${s1} → ${s2} s; el servidor dice cuánto queda)`);
    await r.screenshot({ path: OUT + 'neg9n-1-oferta-390.png', fullPage: true });
    await clic(r.getByRole('button', { name: 'Aceptar', exact: true }));
    ok(await espera(() => op(N1, `driver_id::text`), DID) === DID, '«Aceptar»: el pedido pasa al repartidor');
    ok(sql(`select f.status from delivery_offers f join operations o on o.id = f.operation_id where o.number = '${N1}'`) === 'accepted' && sql(`select count(*) from operation_events e join operations o on o.id = e.operation_id where o.number = '${N1}' and e.kind = 'driver_started'`) === '1', 'la oferta queda aceptada y la entrega empezó (el paso que inicia la ruta)');
    ok(await espera(() => sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+1${DUENO}' and n.tpl = 'biz_oferta_ok' and n.ref_id = '${N1}'`), '1') === '1', 'el negocio recibe «Aceptaron el pedido»');

    // ── 2 · La oferta que vence ──
    sql(`insert into platform_config (key, value, note) values ('oferta_seg', '20'::jsonb, 'neg9n') on conflict (key) do update set value = excluded.value`);
    await dormir(1500);
    await d.goto(B + P + `/hoy?det=ped:${N2}`); await clic(det.getByText('Ofrecer a los que están en línea', { exact: true }));
    ok(await espera(() => sql(`select count(*) from delivery_offers f join operations o on o.id = f.operation_id where o.number = '${N2}' and f.status = 'open' and f.expires_at < now() + interval '25 seconds'`), '1') === '1', 'segunda oferta con el tiempo de Configuración (20 s)');
    await dormir(21000); barrer();
    ok(await espera(() => sql(`select f.status from delivery_offers f join operations o on o.id = f.operation_id where o.number = '${N2}'`), 'expired') === 'expired', 'nadie la aceptó: el barrido la cierra');
    ok(await espera(() => sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+1${DUENO}' and n.tpl = 'biz_oferta_vencio' and n.ref_id = '${N2}'`), '1') === '1', 'el negocio recibe «Nadie aceptó el pedido»');
    ok(op(N2, `coalesce(driver_id::text, '-')`) === '-', 'el pedido sigue sin repartidor');

    // ── 3 · Recoger con el código, escribirle al cliente, la prueba de entrega ──
    await r.goto(B + `/repartidor?p=${N1}`); await r.getByText('CÓDIGO DE RECOGIDA · TE LO DICE EL NEGOCIO').first().waitFor();
    const html = await r.content(), telCli = CLI.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1|$2|$3').split('|');
    ok(!html.includes(CLI) && !html.includes(`(${telCli[0]}) ${telCli[1]}-${telCli[2]}`) && !html.includes(`tel:+1${CLI}`), 'el repartidor nunca recibe el teléfono del cliente');
    ok((await r.getByText('Llamar al negocio', { exact: true }).count()) >= 1 && (await r.getByRole('button', { name: 'Llamar', exact: true }).count()) === 0, '«Llamar» es al negocio; al cliente se le escribe');
    const rec = sql(`select recogida from delivery_codes dc join operations o on o.id = dc.operation_id where o.number = '${N1}'`), cli = sql(`select cliente from delivery_codes dc join operations o on o.id = dc.operation_id where o.number = '${N1}'`);
    ok(!html.includes(rec + '<') && !html.includes(`"${cli}"`), 'el repartidor no recibe ni el código de recogida ni el del cliente');
    await d.goto(B + P + `/hoy?det=ped:${N1}`); await det.getByText('CÓDIGO DE RECOGIDA').first().waitFor();
    ok(await det.getByText(rec, { exact: true }).first().isVisible(), `el negocio ve el código de recogida (${rec})`);
    await d.screenshot({ path: OUT + 'neg9n-3-recogida-panel-1360.png' });
    const malo = String((Number(rec) + 1) % 10000).padStart(4, '0');
    await r.locator('input').first().fill(malo); await clic(r.getByRole('button', { name: 'Recogí, voy en camino' }));
    await r.getByText('Ese no es el código de recogida. Pídeselo al negocio.').first().waitFor(); ok(op(N1, 'stage') === 'preparing', 'un código de recogida equivocado no avanza');
    await r.locator('input').first().fill(rec); await clic(r.getByRole('button', { name: 'Recogí, voy en camino' }));
    ok(await espera(() => op(N1, 'stage'), 'on_the_way') === 'on_the_way', 'con el código correcto: en camino');
    await r.getByRole('button', { name: 'Llegué' }).first().waitFor(); await clic(r.getByRole('button', { name: 'Escribir' }));
    await clic(r.getByText('Llegué, estoy afuera.', { exact: true })); await r.screenshot({ path: OUT + 'neg9n-3-escribir-390.png', fullPage: true });
    await clic(r.getByRole('button', { name: 'Enviar', exact: true }));
    ok(await espera(() => sql(`select count(*) from delivery_messages m join operations o on o.id = m.operation_id where o.number = '${N1}' and m.kind = 'afuera'`), '1') === '1', 'el repartidor le escribe al cliente dentro de la app');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${CU}' and tpl = 'ord_rep_msg' and ref_id = '${N1}'`), '1') === '1', 'a la clienta le llega «Tu repartidor te escribió»');
    await clic(r.getByRole('button', { name: 'Llegué' })); await r.getByText('PRUEBA DE ENTREGA · LA PIDE EL NEGOCIO').first().waitFor();
    ok(await r.getByRole('button', { name: 'Entregado', exact: true }).isDisabled(), 'sin foto ni código, «Entregado» no se puede tocar');
    const mal2 = String((Number(cli) + 1) % 10000).padStart(4, '0');
    await r.getByLabel('O EL CÓDIGO DEL CLIENTE · 4 NÚMEROS').fill(mal2); await clic(r.getByRole('button', { name: 'Entregado', exact: true }));
    await r.getByText(/Ese no es el código del cliente\. Te quedan \d+ intentos\./).first().waitFor();
    ok(op(N1, 'status') === 'confirmed' && sql(`select intentos from delivery_codes dc join operations o on o.id = dc.operation_id where o.number = '${N1}'`) === '1', 'un código del cliente equivocado resta un intento y no entrega');
    // La foto de la entrega (privada).
    const foto = path.join(ENT.S, 'neg9n-entrega.jpg');
    const sharp = require(path.join(ENT.RAIZ, 'apps/web/node_modules/sharp'));
    await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 200, g: 120, b: 40 } } }).jpeg().toFile(foto);
    await r.locator('input[type=file]').setInputFiles(foto);
    await r.getByText('Foto de la entrega lista').first().waitFor(); await r.screenshot({ path: OUT + 'neg9n-3-prueba-390.png', fullPage: true });
    await clic(r.getByRole('button', { name: 'Entregado', exact: true }));
    ok(await espera(() => op(N1, `status || '|' || stage`), 'done|delivered') === 'done|delivered', 'con la foto: entregado');
    const mid = sql(`select media_id from delivery_proofs p join operations o on o.id = p.operation_id where o.number = '${N1}' and p.kind = 'foto'`);
    ok(/^[0-9a-f-]{36}$/.test(mid) && sql(`select url like 'privado/e/%' and private from media where id = '${mid}'`) === 't', 'la prueba es la foto privada (privado/e/…)');
    const cCtx = await b.newContext(M), c = await cCtx.newPage(); watch(c, 'cliente'); await entrar(c, CLI);
    await c.goto(B + `/pedido/${N1}`); await c.getByText('Ver la foto de la entrega').first().waitFor(); await c.getByText('Llegué, estoy afuera.').first().waitFor();
    await c.screenshot({ path: OUT + 'neg9n-3-cliente-390.png', fullPage: true });
    ok((await c.evaluate(async (u) => (await fetch(u)).status, `/api/entrega/foto/${mid}`)) === 200, 'la clienta ve su foto');
    const oCtx = await b.newContext(M), o = await oCtx.newPage(); await entrar(o, OTRO);
    ok((await o.evaluate(async (u) => (await fetch(u)).status, `/api/entrega/foto/${mid}`)) === 404, 'otra cuenta no (404, no se dice si existe)');
    // La base no deja cerrar sin prueba un delivery con repartidor de un negocio que la pide.
    const N3 = pedido(3); sql(`update operations set driver_id = ${DID} where number = '${N3}'`);
    let rechazo = ''; try { sql(`update operations set status = 'done', stage = 'delivered', done_at = now() where number = '${N3}'`); } catch (e) { rechazo = String(e.stderr || e.message); }
    ok(/entrega sin prueba/.test(rechazo), 'la base rechaza «entregado» sin prueba');

    // ── 4 · Super Admin › Repartidores: lista, 360°, incidencia en Colas, suspender y levantar ──
    sql(`update operations set driver_id = null where number = '${N3}'`);
    const N4 = pedido(4); sql(`update operations set driver_id = ${DID} where number = '${N4}'`);
    await r.goto(B + `/repartidor?p=${N4}`); await clic(r.getByRole('button', { name: 'Reportar un problema' }));
    await clic(r.getByText('Tuve un accidente o un problema con el vehículo', { exact: true })); await clic(r.getByRole('button', { name: 'Enviar al negocio' }));
    ok(await espera(() => sql(`select count(*) from delivery_incidents i join operations o on o.id = i.operation_id where o.number = '${N4}' and i.kind = 'accidente' and i.status = 'open'`), '1') === '1', 'el accidente abre una incidencia');
    ok(await espera(() => sql(`select count(*) from queue_items q join delivery_incidents i on i.id::text = q.subject_id join operations o on o.id = i.operation_id where q.queue = 'entrega' and o.number = '${N4}' and q.status = 'open' and q.priority = 'alta'`), '1') === '1', 'y su caso en Colas (Incidencias de entrega, prioridad alta)');
    const aCtx = await b.newContext(D), a = await aCtx.newPage(); watch(a, 'admin'); await entrar(a, ADM);
    await a.goto(B + `/admin/repartidores?q=Neg${ID}`); await a.getByText(`Rolando Neg${ID}`).first().waitFor();
    ok(true, 'Super Admin › Repartidores: la lista encuentra al repartidor'); await a.screenshot({ path: OUT + 'neg9n-4-lista-1360.png', fullPage: true });
    await a.goto(B + `/admin/repartidores/${RU}`); await a.getByText('INCIDENCIAS · 1 ABIERTA').first().waitFor();
    ok(await a.getByText(`#${N1}`, { exact: false }).first().isVisible(), 'el 360°: sus entregas (con la prueba) e incidencias'); await a.screenshot({ path: OUT + 'neg9n-4-360-1360.png', fullPage: true });
    const qid = sql(`select q.id from queue_items q join delivery_incidents i on i.id::text = q.subject_id join operations o on o.id = i.operation_id where q.queue = 'entrega' and o.number = '${N4}'`);
    await a.goto(B + `/admin/colas?cola=entrega&caso=${qid}`); await a.getByText(/Accidente o problema con el vehículo/).first().waitFor();
    await a.screenshot({ path: OUT + 'neg9n-4-cola-1360.png' });
    await clic(a.getByRole('button', { name: 'Resolver', exact: true })); await clic(a.getByText('Fue un accidente: nadie salió herido', { exact: true })); await clic(a.getByRole('button', { name: 'Resolver', exact: true }));
    ok(await espera(() => sql(`select i.status || '|' || q.status from delivery_incidents i join queue_items q on q.subject_id = i.id::text and q.queue = 'entrega' where q.id = ${qid}`), 'resolved|decided') === 'resolved|decided', 'resuelta desde Colas: la incidencia y su caso, con motivo');
    ok(sql(`select count(*) from audit_entries where actor_id = '${AU}' and action = 'repartidor.incidencia.resolver' and target_id = '${RU}'`) === '1', 'y queda en la auditoría');
    await a.goto(B + `/admin/repartidores/${RU}`); await clic(a.getByRole('button', { name: 'Sancionar', exact: true }));
    await clic(a.getByText('Suspender', { exact: true })); await a.getByLabel(/DÍAS DE SUSPENSIÓN/).fill('1');
    await clic(a.getByText('No entregó pedidos que aceptó', { exact: true })); await clic(a.getByRole('button', { name: 'Sancionar', exact: true }));
    ok(await espera(() => sql(`select repartidor_sancionado('${RU}')`), 'suspension') === 'suspension', 'suspendido 1 día');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RU}' and tpl = 'drv_sancion'`), '1') === '1' && sql(`select online::text from delivery_drivers where id = ${DID}`) === 'false', 'le llega el motivo y queda fuera de línea');
    await r.goto(B + '/repartidor'); await r.getByText(/Tu cuenta de repartidor está suspendida/).first().waitFor();
    await clic(r.getByRole('switch').first()); await r.getByText(/está suspendida\. Te avisamos el motivo/).first().waitFor();
    ok(sql(`select online::text from delivery_drivers where id = ${DID}`) === 'false', 'suspendido: no se pone en línea'); await r.screenshot({ path: OUT + 'neg9n-4-suspendido-390.png', fullPage: true });
    await a.goto(B + `/admin/repartidores/${RU}`); await clic(a.getByRole('button', { name: 'Levantar', exact: true }));
    await clic(a.getByText('Se aclaró con el negocio', { exact: true })); await clic(a.getByRole('button', { name: 'Levantar', exact: true }));
    ok(await espera(() => sql(`select coalesce(repartidor_sancionado('${RU}'), '-')`), '-') === '-', 'levantada: ya puede repartir');
    await r.goto(B + '/repartidor'); await r.getByText(/Estás fuera de línea/).first().waitFor(); await clic(r.getByRole('switch').first());
    ok(await espera(() => sql(`select online::text from delivery_drivers where id = ${DID}`), 'true') === 'true', 'levantada: se pone en línea otra vez');
    const a3 = await (await b.newContext(M)).newPage(); await entrar(a3, ADM); await a3.goto(B + `/admin/repartidores/${RU}`); await a3.getByText('SANCIONES').first().waitFor();
    await a3.screenshot({ path: OUT + 'neg9n-4-360-390.png', fullPage: true }); ok(true, 'el 360° a 390');

    // ── 5 · Colas › Ajustes y Configuración: un plazo antes en solo lectura, editable y dicho en su texto ──
    await a.goto(B + '/admin/colas?ajustes=1'); await a.getByText('Quién ve cada cola').first().waitFor(); await a.getByText('FERIADOS DEL EQUIPO · EL PLAZO DE SOPORTE NO LOS CUENTA').first().waitFor();
    ok(true, 'Colas › Ajustes: quién ve cada cola y los feriados del equipo'); await a.screenshot({ path: OUT + 'neg9n-5-colas-ajustes-1360.png', fullPage: true });
    await a.goto(B + '/admin/sistema/configuracion'); await clic(a.getByText(/Grupos cancelados que abren un caso/).first());
    await a.getByLabel(/VALOR NUEVO/).fill('4'); await clic(a.getByText('Ajuste con datos reales', { exact: true })); await clic(a.getByRole('button', { name: 'Guardar', exact: true }));
    ok(await espera(() => sql(`select cfg_int('insc_grupos_n')`), '4') === '4', 'Configuración: «Grupos cancelados que abren un caso» ya se cambia (antes, solo lectura)');
    await dormir(1200); await a.goto(B + '/admin/colas?cola=grupo'); await a.getByText(/El lugar canceló 4 grupos en 90 días/).first().waitFor();
    ok(true, 'Colas › Grupos que no abrieron lo dice con el número nuevo (4 grupos en 90 días)'); await a.screenshot({ path: OUT + 'neg9n-5-texto-1360.png' });

    // ── 6 · Panel › Horario (feriados, vacaciones, temporada) y Lo que te avisamos ──
    const pm = await (await b.newContext(M)).newPage(); watch(pm, 'panel-m'); await entrar(pm, DUENO);
    await pm.goto(B + P + '/pagina/hor'); await pm.getByText('FERIADOS · TOCA LOS QUE CIERRAS').first().waitFor(); await pm.getByText('ABRO POR TEMPORADA').first().waitFor();
    await pm.screenshot({ path: OUT + 'neg9n-6-horario-390.png', fullPage: true }); ok(true, 'Panel › Horario: feriados, vacaciones y temporada a 390');
    await d.goto(B + P + '/pagina/hor'); await d.getByText('VACACIONES Y DÍAS PROPIOS').first().waitFor(); await d.screenshot({ path: OUT + 'neg9n-6-horario-1360.png', fullPage: true });
    const hoy = sql(`select (now() at time zone 'America/New_York')::date::text`);
    ok(sql(`select negocio_abierto('${BIZ}', (now() at time zone 'America/New_York')::timestamp)::text`) === 'true', 'abierto antes de las vacaciones');
    await clic(d.getByText('Agregar vacaciones o un día', { exact: true })); await d.getByLabel('DESDE · AAAA-MM-DD').fill(hoy); await clic(d.getByRole('button', { name: 'Guardar el día' }));
    ok(await espera(() => sql(`select negocio_abierto('${BIZ}', (now() at time zone 'America/New_York')::timestamp)::text`), 'false') === 'false', 'vacaciones hoy: el estado abierto/cerrado dice cerrado');
    const eid = sql(`select id from special_hours where business_id = '${BIZ}' and kind = 'vacation' and status = 'active' and date_from = '${hoy}' order by id desc limit 1`);
    await d.goto(B + P + '/pagina/hor'); await clic(d.getByRole('button', { name: 'Quitar', exact: true }));
    ok(await espera(() => sql(`select status from special_hours where id = ${eid}`), 'removed') === 'removed' && sql(`select negocio_abierto('${BIZ}', (now() at time zone 'America/New_York')::timestamp)::text`) === 'true', 'quitar deja el día «removed» (nada se borra) y vuelve a abrir');
    await pm.goto(B + P + '/mas'); await pm.getByText('LO QUE TE AVISAMOS').first().waitFor(); await pm.screenshot({ path: OUT + 'neg9n-6-avisos-390.png', fullPage: true });
    await clic(pm.locator('div', { hasText: /^Pedidos y entregas/ }).getByRole('switch').first());
    ok(await espera(() => sql(`select off::text from business_notif_prefs where business_id = '${BIZ}' and pref = 'pedidos'`), 'true') === 'true', 'Lo que te avisamos: «Pedidos y entregas» apagado');
    // Una oferta solo para Rolando (en el sandbox hay otros repartidores de Sabor Dominicano en línea): la rechaza y se cierra.
    const N5 = pedido(5); await d.goto(B + P + `/hoy?det=ped:${N5}`); await det.getByText(/¿QUIÉN LO LLEVA\?/).first().waitFor();
    await clic(det.locator('div', { hasText: new RegExp(`^Rolando Neg${ID}`) }).getByRole('button', { name: 'Ofrecer', exact: true }));
    await espera(() => sql(`select count(*) from delivery_offers f join operations o on o.id = f.operation_id where o.number = '${N5}'`), '1');
    await r.goto(B + '/repartidor'); await clic(r.getByRole('button', { name: 'Rechazar', exact: true }));
    ok(await espera(() => sql(`select f.status from delivery_offers f join operations o on o.id = f.operation_id where o.number = '${N5}'`), 'expired') === 'expired', 'Rolando rechaza la oferta que era solo para él: se cierra');
    await dormir(800);
    ok(sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+1${DUENO}' and n.tpl = 'biz_oferta_vencio' and n.ref_id = '${N5}'`) === '0', 'con «Pedidos» apagado, «Nadie aceptó» no le llega (lo sigue viendo en el panel)');
    ok(!err.length, `sin errores en la página${err.length ? ': ' + err.join(' · ') : ''}`);
  } finally {
    try {
      const [pr, pc] = (antes || 'f|f').split('|');
      sql(`update delivery_settings set proof = ${pr === 'true' ? 'true' : 'false'}, pickup_code = ${pc === 'true' ? 'true' : 'false'} where business_id = '${BIZ}';
           delete from business_notif_prefs where business_id = '${BIZ}';
           update special_hours set status = 'removed', removed_at = now() where business_id = '${BIZ}' and status = 'active' and kind = 'vacation' and created_at > now() - interval '1 hour';
           update delivery_offers set status = 'cancelled' where status = 'open' and business_id = '${BIZ}';
           update operations set driver_id = null where driver_id = ${DID || 'null'} and status = 'confirmed';
           update operations set status = 'cancelled', cancelled_by = 'business', cancelled_at = now(), cancel_reason = 'neg9n' where client_key::text like 'c0e1c6b0-9a9a-4000-8000-${ID}%' and status = 'confirmed';
           update delivery_drivers set status = 'removed', removed_at = now(), removed_reason = 'neg9n', online = false where user_id = '${RU}' and status <> 'removed';
           update staff_members set status = 'removed' where user_id = '${AU}';`);
      for (const h of JSON.parse(horas || '[]')) sql(`update business_hours set open = ${h.o}, ranges = '${JSON.stringify(h.r)}'::jsonb where business_id = '${BIZ}' and module = '' and weekday = ${h.w}`);
      sql(prefs.oferta ? `update platform_config set value = '${prefs.oferta}'::jsonb where key = 'oferta_seg'` : `delete from platform_config where key = 'oferta_seg'`);
      sql(prefs.grupos ? `update platform_config set value = '${prefs.grupos}'::jsonb where key = 'insc_grupos_n'` : `delete from platform_config where key = 'insc_grupos_n'`);
    } catch (e) { console.log('  (limpieza) ' + String(e.message).slice(0, 200)); }
    await b.close();
  }
  console.log(`\nneg9n: ${n} ✓`);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
