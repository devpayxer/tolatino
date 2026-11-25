// 9v (25 nov, tercera tanda) · Cuando el NEGOCIO cancela, el dinero se dice como pasó, no como se decidió. Antes, al cancelar la salida de un viaje, la mesa de
// la noche, una inscripción o la fecha de una fiesta, el código tiraba lo que devolvía devolverPago: el aviso decía «Te devolvemos todo», el panel «todos
// reciben su dinero» y, como la pedía el negocio (por 'business'), un «no» de Stripe no alertaba a nadie. Ahora (cobros › devolverAlCancelar, 0220):
//   1. Viaje · el negocio cancela una salida con tres pasajeros: uno cobrado (la devolución sale), uno cobrado al que Stripe le dice que no (el simulador no
//      tiene saldo que devolver) y uno solo retenido. La base: hecha / fallida con UNA alerta al equipo de dinero / liberada. La acción del panel responde lo
//      que pasó (1 hecha · 1 no salió). El aviso viaje_cancelada y la pantalla del viaje de cada pasajero dicen lo suyo, nunca «Te devolvemos todo».
//   2. Noche · el local cancela dos mesas con depósito cobrado: una devolución sale y la otra Stripe la rechaza. Lo mismo: base, alerta, acción, aviso y pantalla.
//   3. Super Admin › «Probar en mi teléfono»: {dinero} sale lleno (MUESTRA) y el título de bol_devuelto ya no da la devolución por hecha (0220).
// Lo que va en camino (Stripe no contesta) no se puede forzar en el simulador por prueba: lo cubre el guardián devueltoSoloSiSalio (en camino nunca es «hecha»).
// Precondiciones propias (corre dos veces seguidas): sus dos negocios, su dueña y sus clientes (teléfonos 555 libres), sus servicios, la salida y los cobros.
// El admin es el de siempre (570-555-0199).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const crypto = require('crypto'); const fs = require('fs');
const { entrarComo, sql } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.S + '/cap/';
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l));
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
// Las acciones del servidor por su id del build (como din9v): la misma llamada que hace la pantalla, desde una página donde vive la acción.
const MAN = JSON.parse(fs.readFileSync(ENT.RAIZ + '/apps/web/.next/server/server-reference-manifest.json', 'utf8')).node;
const ACT = Object.fromEntries(Object.entries(MAN).map(([id, v]) => [v.exportedName, id]));
const accion = async (p, nombre, args) => {
  if (!ACT[nombre]) throw new Error('acción sin id en el build: ' + nombre);
  const r = await p.evaluate(async ([id, args]) => { const x = await fetch(location.pathname + location.search, { method: 'POST', headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, body: JSON.stringify(args) }); return { st: x.status, t: await x.text() }; }, [ACT[nombre], args]);
  const l = r.t.split('\n').find((x) => /^1:/.test(x));
  let j = null; try { j = l ? JSON.parse(l.slice(2)) : null; } catch { j = null; }
  return { st: r.st, j, t: r.t };
};
const aviso = (num, tpl) => sql(`select n.title || ' | ' || n.body from notifications n join operations o on o.user_id = n.user_id where o.number = '${num}' and n.tpl = '${tpl}' and n.ref_id = '${num}' order by n.id desc limit 1`);
const devolucion = (num) => sql(`select r.status from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${num}' order by r.id desc limit 1`);
const pago = (num) => sql(`select p.status || '|' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${num}' order by p.id desc limit 1`);
const alertas = (num) => sql(`select count(*) from money_alerts a join refunds r on a.subject_id = r.id::text join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${num}' and a.kind = 'refund_stuck'`);
const texto = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');

(async () => {
  // ── Precondiciones propias ──
  const persona = (nombre) => { const t = telPropio(); sql(`insert into users (phone, first_name, last_name) values ('+1${t}', '${nombre}', 'Nueve V')`); return { tel: t, id: sql(`select id from users where phone = '+1${t}'`) }; };
  const DUENA = persona('Dueña');
  const negocio = (id, cat, nombre) => {
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${id}', 'hzl', '${cat}', '${nombre}', 'active')`);
    sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${id}', '${DUENA.id}', 'owner', 'Dueña')`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${id}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
    sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${id}', 'acct_sim_${id}', 'enabled', true, true, true)`);
    return primero(sql(`insert into items (business_id, name, price_cents) values ('${id}', '{"es":"Servicio 9v ${RUN}","en":"Service 9v ${RUN}"}'::jsonb, 4500) returning id`));
  };
  // Un cobro de la operación: el del libro y el del simulador. retenido: solo la autorización; rechaza: Stripe dirá que no al devolver (sin saldo).
  const cobro = (op, uid, biz, kind, cents, { retenido = false, rechaza = false } = {}) => {
    const pi = `pi_sim_9v3_${RUN}_${op}`;
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', ${cents}, 0, 'acct_sim_${biz}', '${retenido ? 'requires_capture' : 'succeeded'}', ${retenido ? 0 : cents}, ${rechaza ? cents : 0}, 'pm_sim_visa_4242_9v3', 'manual')`);
    sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated)
         values (${op}, '${uid}', '${biz}', 'hzl', '${kind}', 'card', '${pi}', ${cents}, ${cents}, 0, '${retenido ? 'held' : 'captured'}', 'visa', '4242', now(), ${retenido ? 'null' : 'now()'}, true)`);
    sql(`update operations set pay_status = '${retenido ? 'held' : 'captured'}' where id = ${op}`);
  };

  const b = await chromium.launch(); const err = [];
  try {
    // ── 1 · Viaje: la salida cancelada por el negocio ──
    console.log('1 · Viaje: el negocio cancela la salida (hecha · Stripe dice que no · solo retenido)');
    const BV = `d9v3v-${RUN}`, SV = negocio(BV, 'NEG-TRANS', `Van 9v ${RUN}`);
    const SAL = primero(sql(`insert into trip_runs (business_id, city_id, item_id, run_at, seats_total) values ('${BV}', 'hzl', ${SV}, ((now() at time zone 'America/New_York')::date + 2 + time '19:00') at time zone 'America/New_York', 14) returning id`));
    const viaje = (nombre, o) => {
      const U = persona(nombre), num = `V-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`;
      const det = JSON.stringify({ k: 'asiento', run: SAL, svc: { es: `Hazleton → Allentown ${RUN}`, en: `Hazleton → Allentown ${RUN}` }, svcId: SV, adults: 1, kids: 0, inc: [], from: { es: 'Hazleton', en: 'Hazleton' }, to: { es: 'Allentown', en: 'Allentown' }, terms: { feePct: 50, cancelH: 24 } });
      const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, pay_mode, client_key, is_test, confirmed_at)
        values ('${num}', 'trip', 'hzl', '${BV}', '${U.id}', 'confirmed', (select run_at from trip_runs where id = ${SAL}), 120, '${det}'::jsonb, 1, 4500, 4500, 'app', gen_random_uuid(), true, now()) returning id`));
      sql(`insert into run_seats (operation_id, run_id, seats) values (${op}, ${SAL}, 1)`);
      cobro(op, U.id, BV, 'full', 4500, o);
      return { ...U, num, op };
    };
    const V1 = viaje('Sale', {}), V2 = viaje('Rechazo', { rechaza: true }), V3 = viaje('Retenido', { retenido: true });
    const pd = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); pd.on('pageerror', (e) => err.push(e.message));
    await entrarComo(pd, DUENA.tel); await pd.goto(B + `/panel/${BV}`);
    const r1 = await accion(pd, 'viajeCancelarSalida', [BV, SAL, 'Se dañó la van']);
    ok(r1.j?.ok === true && sql(`select status from trip_runs where id = ${SAL}`) === 'cancelled', 'la salida queda cancelada');
    // 9v (cuarta tanda) · La retención soltada se cuenta aparte (liberadas): el panel ya no la llama «devolución».
    ok(JSON.stringify(r1.j.devolucion) === JSON.stringify({ hechas: 1, camino: 0, fallidas: 1, liberadas: 1, retenidas: 0 }), `el panel sabe lo que pasó: 1 hecha, 1 que no salió y 1 retención soltada (${JSON.stringify(r1.j.devolucion)})`);
    ok(devolucion(V1.num) === 'done' && pago(V1.num) === 'refunded|4500', `${V1.num}: la devolución salió (hecha, $45 devueltos)`);
    ok(devolucion(V2.num) === 'failed' && pago(V2.num) === 'captured|0', `${V2.num}: Stripe dijo que no: fallida y nada devuelto en el libro`);
    ok(alertas(V2.num) === '1' && alertas(V1.num) === '0', 'el «no» de Stripe le llega al equipo de dinero: UNA alerta (y ninguna por la que salió)');
    ok(pago(V3.num).startsWith('released|') && sql(`select status from sim_intents where id = 'pi_sim_9v3_${RUN}_${V3.op}'`) === 'canceled', `${V3.num}: solo retenido: se libera, no se devuelve nada`);
    const a1 = aviso(V1.num, 'viaje_cancelada'), a2 = aviso(V2.num, 'viaje_cancelada'), a3 = aviso(V3.num, 'viaje_cancelada');
    ok(a1.includes('Se dañó la van. Te devolvimos $45 a tu tarjeta') && !/Te devolvemos todo/.test(a1), `el aviso de quien recibió su dinero: «Te devolvimos $45» (${a1})`);
    ok(a2.includes('La devolución de $45 no salió: el equipo de To\'Latino ya tiene el aviso') && !/Te devolv/.test(a2), `el aviso de quien no lo recibió no dice «te devolvemos» (${a2})`);
    ok(a3.includes('No se cobró nada: la retención de $45 se suelta de tu tarjeta') && !/Te devolv/.test(a3), `el aviso de quien solo tenía la retención (${a3})`);
    const m1 = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); m1.on('pageerror', (e) => err.push(e.message));
    await entrarComo(m1, V1.tel); await m1.goto(B + `/viaje/${V1.num}`); await m1.getByText('CANCELADO').first().waitFor();
    const t1 = await texto(m1);
    ok(t1.includes('«Se dañó la van». Te devolvimos $45.') && !/Te devolvemos todo/.test(t1), 'la pantalla del viaje: el motivo y «Te devolvimos $45.»');
    const m2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); m2.on('pageerror', (e) => err.push(e.message));
    await entrarComo(m2, V2.tel); await m2.goto(B + `/viaje/${V2.num}`); await m2.getByText('CANCELADO').first().waitFor();
    const t2 = await texto(m2);
    ok(t2.includes('La devolución de $45 no salió: escríbenos en Soporte y lo resolvemos.') && !/Te devolv/.test(t2), 'la pantalla del viaje de quien no lo recibió: «no salió», nunca «te devolvemos»');
    await m2.screenshot({ path: OUT + 'd9v3-viaje-no-salio-m.png', fullPage: true });
    const r1b = await accion(pd, 'viajeCancelarSalida', [BV, SAL, 'Se dañó la van']);
    ok(r1b.j?.ok === false && sql(`select count(*) from refunds r join payments p on p.id = r.payment_id where p.business_id = '${BV}'`) === '2', 'cancelar otra vez no devuelve otra vez («Esa salida ya cambió»)');

    // ── 2 · Noche: el local cancela dos mesas con depósito cobrado ──
    console.log('2 · Noche: el local cancela la mesa (hecha · Stripe dice que no)');
    const BN = `d9v3n-${RUN}`, SN = negocio(BN, 'NEG-NOCHE', `Noche 9v ${RUN}`);
    const mesa = (nombre, o) => {
      const U = persona(nombre), num = `N-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`;
      const det = JSON.stringify({ k: 'mesa', item: SN, svc: { es: `Mesa 9v ${RUN}`, en: `Table 9v ${RUN}` }, arrive: 1320, occ: null, door_cents: null, list_until: null, cover_cents: 0, after: null, min_cents: 12000, hr: false, edad: 21, hold: 30, sms: true, cut: 1290, inc: [] });
      const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, night_date, door_code, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key, is_test, confirmed_at)
        values ('${num}', 'night', 'hzl', '${BN}', '${U.id}', 'confirmed', ((now() at time zone 'America/New_York')::date + 3 + time '22:00') at time zone 'America/New_York', 60, '${det}'::jsonb, 4,
                (now() at time zone 'America/New_York')::date + 3, null, 0, 0, 4000, 'app', gen_random_uuid(), true, now()) returning id`));
      cobro(op, U.id, BN, 'deposit', 4000, o);
      return { ...U, num, op };
    };
    const N1 = mesa('Mesa', {}), N2 = mesa('Mesa rechazo', { rechaza: true });
    await pd.goto(B + `/panel/${BN}`);
    const n1 = await accion(pd, 'nocheCancelarNeg', [BN, N1.num, 'Se fue la luz']), n2 = await accion(pd, 'nocheCancelarNeg', [BN, N2.num, 'Se fue la luz']);
    ok(n1.j?.ok === true && n2.j?.ok === true && sql(`select string_agg(status, ',' order by id) from operations where number in ('${N1.num}', '${N2.num}')`) === 'cancelled,cancelled', 'las dos mesas quedan canceladas');
    ok(JSON.stringify(n1.j.devolucion) === JSON.stringify({ hechas: 1, camino: 0, fallidas: 0, liberadas: 0, retenidas: 0 }) && JSON.stringify(n2.j.devolucion) === JSON.stringify({ hechas: 0, camino: 0, fallidas: 1, liberadas: 0, retenidas: 0 }), `el panel sabe lo que pasó con cada una (${JSON.stringify(n1.j.devolucion)} · ${JSON.stringify(n2.j.devolucion)})`);
    ok(devolucion(N1.num) === 'done' && pago(N1.num) === 'refunded|4000', `${N1.num}: el depósito volvió (hecha, $40)`);
    ok(devolucion(N2.num) === 'failed' && pago(N2.num) === 'captured|0' && alertas(N2.num) === '1', `${N2.num}: Stripe dijo que no: fallida, nada devuelto y UNA alerta al equipo de dinero`);
    const b1 = aviso(N1.num, 'noche_biz_cx'), b2 = aviso(N2.num, 'noche_biz_cx');
    ok(b1.includes('Se fue la luz. Te devolvimos $40 a tu tarjeta') && !/Te devolvemos todo/.test(b1), `el aviso de la mesa devuelta (${b1})`);
    ok(b2.includes('La devolución de $40 no salió: el equipo de To\'Latino ya tiene el aviso') && !/Te devolv/.test(b2), `el aviso de la mesa que no se devolvió (${b2})`);
    const m3 = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); m3.on('pageerror', (e) => err.push(e.message));
    await entrarComo(m3, N2.tel); await m3.goto(B + `/noche/${N2.num}`); await m3.getByText('CANCELADA').first().waitFor();
    const t3 = await texto(m3);
    ok(t3.includes('«Se fue la luz». La devolución de $40 no salió: escríbenos en Soporte y lo resolvemos.') && !/Te devolv/.test(t3), 'la pantalla de la noche de quien no lo recibió: «no salió»');
    const m4 = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); m4.on('pageerror', (e) => err.push(e.message));
    await entrarComo(m4, N1.tel); await m4.goto(B + `/noche/${N1.num}`); await m4.getByText('CANCELADA').first().waitFor();
    ok((await texto(m4)).includes('«Se fue la luz». Te devolvimos $40 · 3 a 5 días.'), 'la pantalla de la noche de quien sí lo recibió: «Te devolvimos $40 · 3 a 5 días.»');
    // ── 3 · Super Admin › Notificaciones › «Probar en mi teléfono»: {dinero} sale lleno (antes salía la llave escrita) y el título ya no da la devolución por hecha ──
    console.log('3 · «Probar en mi teléfono» con {dinero} y los títulos de 0220');
    const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); ad.on('pageerror', (e) => err.push(e.message));
    await entrarComo(ad, '5705550199'); await ad.goto(B + '/admin/notificaciones');
    const ADMID = sql(`select id from users where phone = '+15705550199'`), ult = (tpl) => sql(`select title || ' | ' || body from notifications where user_id = '${ADMID}' and tpl = '${tpl}' order by id desc limit 1`);
    for (const tpl of ['viaje_cancelada', 'bol_devuelto']) {
      const r = await accion(ad, 'plantillaProbar', [tpl]);
      const t = ult(tpl);
      ok(r.j?.ok === true && t.includes('Te devolvimos $45.00 a tu tarjeta') && !t.includes('{dinero}'), `«Probar en mi teléfono» (${tpl}) sale con {dinero} lleno: ${t}`);
    }
    ok(ult('bol_devuelto').startsWith('Tus boletos: la devolución | '), 'el título de bol_devuelto ya no dice «Te devolvieron tus boletos»');
    ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  } finally { await b.close(); }
  console.log(`\nOK din9v3 (${n} ✓)`);
})().catch((e) => { console.error(e); process.exit(1); });
