// 9v (25 nov, cuarta tanda) · Cuando cancela QUIEN PAGÓ (su viaje) y cuando se cancela un EVENTO PRIVADO (el cliente o el restaurante), el dinero se dice
// como pasó, no como se decidió. Antes viaje_cx / evp_cancelado llenaban {dev} con «Te devolvemos …» sin mirar a la pasarela, evp_cancelado_negocio decía
// «Te devolvemos el depósito completo», el panel «el cliente recibe su depósito completo» y la pantalla del evento «Te devolvemos $X» aunque Stripe dijera
// que no; el barrido del evento privado volvía a mandar cada minuto la devolución rechazada. Ahora (cobros › devolverAlCancelar, 0221):
//   1. Viaje · el cliente cancela a tiempo: una devolución sale; a otro Stripe le dice que no (el simulador no tiene saldo). Base, alerta al equipo de
//      dinero (una), aviso viaje_cx y la pantalla del viaje.
//   2. Evento privado · el cliente cancela a tiempo desde su pantalla (hecha y rechazada) y el restaurante cancela desde el panel (rechazada y hecha): base,
//      alerta (una, y el barrido no la vuelve a mandar), avisos evp_cancelado / evp_cancelado_negocio, lo que responde el panel y la pantalla del cliente.
//   3. La retención que la pasarela no suelta (cobros.ts real con una pasarela de mentira, sin servidor): «retenida», UNA alerta hold_stuck, el aviso y el
//      panel lo dicen; cuando se suelta, «liberada» y la alerta se cierra sola. Y el panel nunca cuenta una retención soltada como «Le devolvimos todo».
// Precondiciones propias (corre dos veces seguidas): sus negocios, su dueña y sus clientes (teléfonos 555 libres), sus servicios, la salida y los cobros.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const crypto = require('crypto'); const fs = require('fs');
const { entrarComo, sql } = require('../lib/negocio-nuevo.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const B = ENT.B, OUT = ENT.S + '/cap/';
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l));
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
// Las acciones del servidor por su id del build (como din9v3): la misma llamada que hace la pantalla, desde una página donde vive la acción.
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
const devoluciones = (num) => sql(`select coalesce(string_agg(r.status, ',' order by r.id), '') from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${num}'`);
const pago = (num) => sql(`select p.status || '|' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${num}' order by p.id desc limit 1`);
const alertas = (num) => sql(`select count(*) from money_alerts a join refunds r on a.subject_id = r.id::text join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${num}' and a.kind = 'refund_stuck'`);
const texto = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t0 = Date.now(); for (;;) { const v = await f(); if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 250)); } };

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
    const pi = `pi_sim_9v4_${RUN}_${op}`;
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', ${cents}, 0, 'acct_sim_${biz}', '${retenido ? 'requires_capture' : 'succeeded'}', ${retenido ? 0 : cents}, ${rechaza ? cents : 0}, 'pm_sim_visa_4242_9v4', 'manual')`);
    sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated)
         values (${op}, '${uid}', '${biz}', 'hzl', '${kind}', 'card', '${pi}', ${cents}, ${cents}, 0, '${retenido ? 'held' : 'captured'}', 'visa', '4242', now(), ${retenido ? 'null' : 'now()'}, true)`);
    sql(`update operations set pay_status = '${retenido ? 'held' : 'captured'}' where id = ${op}`);
    return pi;
  };
  const telefono = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  const b = await chromium.launch(); const err = [];
  try {
    // ── 1 · Viaje: el cliente cancela a tiempo ──
    console.log('1 · Viaje: el cliente cancela a tiempo (hecha · Stripe dice que no)');
    const BV = `d9v4v-${RUN}`, SV = negocio(BV, 'NEG-TRANS', `Van 9v4 ${RUN}`);
    const SAL = primero(sql(`insert into trip_runs (business_id, city_id, item_id, run_at, seats_total) values ('${BV}', 'hzl', ${SV}, ((now() at time zone 'America/New_York')::date + 3 + time '19:00') at time zone 'America/New_York', 14) returning id`));
    const viaje = (nombre, o) => {
      const U = persona(nombre), num = `V-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`;
      const det = JSON.stringify({ k: 'asiento', run: SAL, svc: { es: `Hazleton → Allentown ${RUN}`, en: `Hazleton → Allentown ${RUN}` }, svcId: SV, adults: 1, kids: 0, inc: [], from: { es: 'Hazleton', en: 'Hazleton' }, to: { es: 'Allentown', en: 'Allentown' }, terms: { feePct: 50, cancelH: 24 } });
      const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, pay_mode, client_key, is_test, confirmed_at)
        values ('${num}', 'trip', 'hzl', '${BV}', '${U.id}', 'confirmed', (select run_at from trip_runs where id = ${SAL}), 120, '${det}'::jsonb, 1, 4500, 4500, 'app', gen_random_uuid(), true, now()) returning id`));
      sql(`insert into run_seats (operation_id, run_id, seats) values (${op}, ${SAL}, 1)`);
      cobro(op, U.id, BV, 'full', 4500, o);
      return { ...U, num, op };
    };
    const V1 = viaje('Sale', {}), V2 = viaje('Rechazo', { rechaza: true });
    for (const V of [V1, V2]) {
      const m = await (await telefono(b)).newPage(); m.on('pageerror', (e) => err.push(e.message));
      await entrarComo(m, V.tel); await m.goto(B + `/viaje/${V.num}`);
      const r = await accion(m, 'viajeAccion', [V.num, 'cancelar']);
      ok(r.j?.ok === true && sql(`select status || '|' || cancelled_by from operations where number = '${V.num}'`) === 'cancelled|user', `${V.num}: el cliente canceló`);
      V.m = m;
    }
    ok(devoluciones(V1.num) === 'done' && pago(V1.num) === 'refunded|4500' && alertas(V1.num) === '0', `${V1.num}: la devolución salió ($45 devueltos) y no hay alerta`);
    ok(devoluciones(V2.num) === 'failed' && pago(V2.num) === 'captured|0' && alertas(V2.num) === '1', `${V2.num}: Stripe dijo que no: fallida, nada devuelto y UNA alerta al equipo de dinero`);
    const a1 = aviso(V1.num, 'viaje_cx'), a2 = aviso(V2.num, 'viaje_cx');
    ok(a1.includes('Cancelaste tu viaje') && a1.includes('Te devolvimos $45 a tu tarjeta') && !/Te devolvemos|\{d/.test(a1), `viaje_cx de quien recibió su dinero: «Te devolvimos $45» (${a1})`);
    ok(a2.includes('La devolución de $45 no salió: el equipo de To\'Latino ya tiene el aviso') && !/Te devolv|\{d/.test(a2), `viaje_cx de quien no lo recibió no dice «te devolvemos» (${a2})`);
    await V2.m.reload(); await V2.m.getByText('CANCELADO').first().waitFor();
    const t2 = await texto(V2.m);
    ok(t2.includes('La devolución de $45 no salió: escríbenos en Soporte y lo resolvemos.') && !/Te devolv/.test(t2), 'la pantalla del viaje de quien no lo recibió: «no salió»');

    // ── 2 · Evento privado ──
    console.log('2 · Evento privado: cancela el cliente (hecha · no) y el restaurante (no · hecha)');
    const BE = `d9v4e-${RUN}`; negocio(BE, 'NEG-FOOD', `Fogón 9v4 ${RUN}`);
    const evento = (nombre, o) => {
      const U = persona(nombre), num = `EP-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`;
      const det = JSON.stringify({ occ: 'familia', area: 'salon', horas: 3, bud: '30', menu: { k: 'buffet', es: 'Buffet criollo', en: 'Creole buffet', cents: 2600 }, ext: [] });
      const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key, is_test, confirmed_at)
        values ('${num}', 'private_event', 'hzl', '${BE}', '${U.id}', 'confirmed', now() + interval '5 days', 180, '${det}'::jsonb, 20, 50000, 50000, 10000, 'app', gen_random_uuid(), true, now()) returning id`));
      cobro(op, U.id, BE, 'deposit', 10000, o);
      return { ...U, num, op };
    };
    const E1 = evento('Evento sale', {}), E2 = evento('Evento rechazo', { rechaza: true }), E3 = evento('Restaurante rechazo', { rechaza: true }), E4 = evento('Restaurante sale', {});
    // El cliente cancela desde su pantalla (los mismos botones que toca).
    for (const E of [E1, E2]) {
      const m = await (await telefono(b)).newPage(); m.on('pageerror', (e) => err.push(e.message));
      await entrarComo(m, E.tel); await m.goto(B + `/privado/${E.num}`);
      await m.getByRole('button', { name: 'Cancelar el evento' }).first().click();
      await m.getByRole('button', { name: 'Sí, cancelar' }).first().click();
      ok(await espera(() => sql(`select status from operations where number = '${E.num}'`) === 'cancelled'), `${E.num}: el cliente canceló desde su pantalla`);
      await m.getByText('CANCELADO').first().waitFor();
      E.m = m;
    }
    ok(devoluciones(E1.num) === 'done' && pago(E1.num) === 'refunded|10000' && alertas(E1.num) === '0', `${E1.num}: el depósito volvió ($100, hecha)`);
    ok(devoluciones(E2.num) === 'failed' && pago(E2.num) === 'captured|0' && alertas(E2.num) === '1', `${E2.num}: Stripe dijo que no: fallida, nada devuelto y UNA alerta`);
    const e1 = aviso(E1.num, 'evp_cancelado'), e2 = aviso(E2.num, 'evp_cancelado');
    ok(e1.includes('Cancelaste tu evento privado') && e1.includes('Te devolvimos $100 a tu tarjeta') && !/Te devolvemos|\{d/.test(e1), `evp_cancelado de quien recibió su depósito (${e1})`);
    ok(e2.includes('La devolución de $100 no salió: el equipo de To\'Latino ya tiene el aviso') && !/Te devolv|\{d/.test(e2), `evp_cancelado de quien no lo recibió (${e2})`);
    await espera(async () => /Te devolvimos/.test(await texto(E1.m)));
    const s1 = await texto(E1.m);
    ok(/Te devolvimos \$100(\.00)? a tu Visa/.test(s1) && !/Te devolvemos/.test(s1), 'la pantalla de quien recibió su depósito: «Te devolvimos $100 a tu Visa ·· 4242»');
    await espera(async () => /no salió/.test(await texto(E2.m)));
    const s2 = await texto(E2.m);
    ok(/La devolución de \$100(\.00)? no salió/.test(s2) && s2.includes('Escríbenos en Soporte y lo resolvemos') && !/Te devolv/.test(s2), 'la pantalla de quien no lo recibió: «La devolución de $100 no salió», nunca «Te devolvemos»');
    await E2.m.screenshot({ path: OUT + 'd9v4-privado-no-salio-m.png', fullPage: true });
    // El barrido (al abrir la pantalla: vencerEvp) no vuelve a mandar la devolución que Stripe rechazó (antes: una nueva y una alerta nueva cada minuto).
    await E2.m.reload(); await E2.m.getByText('CANCELADO').first().waitFor(); await E2.m.reload(); await E2.m.getByText('CANCELADO').first().waitFor();
    ok(devoluciones(E2.num) === 'failed' && alertas(E2.num) === '1', `dos aperturas después: sigue UNA devolución fallida y UNA alerta (${devoluciones(E2.num)} · ${alertas(E2.num)})`);
    // El restaurante cancela desde el panel.
    const pd = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); pd.on('pageerror', (e) => err.push(e.message));
    await entrarComo(pd, DUENA.tel); await pd.goto(B + `/panel/${BE}`);
    const r3 = await accion(pd, 'evpCancelarNeg', [BE, E3.num, 'Se nos dañó la cocina']), r4 = await accion(pd, 'evpCancelarNeg', [BE, E4.num, 'Se nos dañó la cocina']);
    ok(r3.j?.ok === true && r4.j?.ok === true && sql(`select string_agg(status || '/' || cancelled_by, ',' order by id) from operations where number in ('${E3.num}', '${E4.num}')`) === 'cancelled/business,cancelled/business', 'el restaurante canceló los dos eventos');
    const cero = { hechas: 0, camino: 0, fallidas: 0, liberadas: 0, retenidas: 0 };
    ok(JSON.stringify(r3.j.devolucion) === JSON.stringify({ ...cero, fallidas: 1 }) && JSON.stringify(r4.j.devolucion) === JSON.stringify({ ...cero, hechas: 1 }), `el panel sabe lo que pasó con cada uno (${JSON.stringify(r3.j.devolucion)} · ${JSON.stringify(r4.j.devolucion)})`);
    ok(devoluciones(E3.num) === 'failed' && pago(E3.num) === 'captured|0' && alertas(E3.num) === '1' && sql(`select r.initiated_by from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${E3.num}'`) === 'business', `${E3.num}: Stripe dijo que no: fallida (por el negocio) y UNA alerta al equipo de dinero`);
    ok(devoluciones(E4.num) === 'done' && pago(E4.num) === 'refunded|10000', `${E4.num}: el depósito volvió completo`);
    const e3 = aviso(E3.num, 'evp_cancelado_negocio'), e4 = aviso(E4.num, 'evp_cancelado_negocio');
    ok(e3.includes('Se nos dañó la cocina. La devolución de $100 no salió') && !/Te devolv|\{d/.test(e3), `evp_cancelado_negocio sin la devolución: nunca «Te devolvemos el depósito completo» (${e3})`);
    ok(e4.includes('Se nos dañó la cocina. Te devolvimos $100 a tu tarjeta') && !/Te devolvemos/.test(e4), `evp_cancelado_negocio con la devolución hecha (${e4})`);
    const m3 = await (await telefono(b)).newPage(); m3.on('pageerror', (e) => err.push(e.message));
    await entrarComo(m3, E3.tel); await m3.goto(B + `/privado/${E3.num}`); await m3.getByText('CANCELADO').first().waitFor();
    const s3 = await texto(m3);
    ok(s3.includes('canceló el evento') && /La devolución de \$100(\.00)? no salió/.test(s3) && !/Te devolv/.test(s3), 'la pantalla del cliente cuando el restaurante canceló y no salió: «no salió»');
    ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  } finally { await b.close(); }

  // ── 3 · La retención que la pasarela no suelta (cobros.ts real, pasarela de mentira, sin servidor) ──
  console.log('3 · La retención que no se suelta: «retenida», UNA alerta hold_stuck; soltada después: «liberada» y la alerta se cierra sola');
  const D = cargar('apps/web/lib/db.ts');
  const avisos = { avisar: async () => undefined, avisarMuchos: async () => undefined, avisarNegocio: async () => undefined };
  let suelta = false;
  const P = { liberar: async (pi) => { if (!suelta) return { ok: false }; await D.db().query(`update sim_intents set status = 'canceled' where id = $1`, [pi]); return { ok: true }; } };
  const K = {}, DC = {};
  const alertasM = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC,
    './evt-liquidacion': {}, './revision-pasarela': {}, './cobro-fuera': {}, './suscripcion': {}, './renovar-retencion': {} });
  const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertasM,
    './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC });
  const DCX = cargar('apps/web/lib/devolucion-cancelar.ts');
  try {
    const BR = `d9v4r-${RUN}`, SR = negocio(BR, 'NEG-TRANS', `Van retenida ${RUN}`), U = persona('Retenida');
    const num = `V-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`;
    const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, pay_mode, client_key, is_test)
      values ('${num}', 'trip', 'hzl', '${BR}', '${U.id}', 'cancelled', now() + interval '3 days', 120, '{"k":"asiento","svcId":${SR}}'::jsonb, 1, 4500, 4500, 'app', gen_random_uuid(), true) returning id`));
    cobro(op, U.id, BR, 'full', 4500, { retenido: true });
    const pid = sql(`select id from payments where operation_id = ${op}`);
    const o = { id: op, pay: 'held', pid, amount: 4500, refunded: 0 }, x = { actorId: null, motivo: 'Cancelación a tiempo', idem: `vcx-${num}`, por: 'policy' };
    const d1 = await cobros.devolverAlCancelar(o, x), d2 = await cobros.devolverAlCancelar(o, x);
    const hs = () => sql(`select count(*) from money_alerts where kind = 'hold_stuck' and subject_id = 'liberar:${pid}'`);
    ok(d1.e === 'retenida' && d1.monto === 4500 && d2.e === 'retenida' && pago(num) === 'held|0', `la pasarela no la soltó: «retenida» y el cobro sigue retenido (${d1.e}, ${pago(num)})`);
    ok(hs() === '1', 'UNA alerta hold_stuck al equipo de dinero (aunque se mire dos veces)');
    const t = DCX.dineroAlCancelar(d1), pr = DCX.textoPanelCancelar(DCX.contar(DCX.sinDevoluciones(), d1));
    ok(t.es.startsWith('No se cobró nada, pero la retención de $45 todavía no se soltó de tu tarjeta') && !/se suelta de tu tarjeta\./.test(t.es) && t.en.includes('has not come off your card yet'), `el aviso lo dice (ES/EN): «${t.es}»`);
    ok(pr.es.includes('la retención de su tarjeta no se soltó todavía') && !/Le devolvimos/.test(pr.es), `el panel lo dice: «${pr.es}»`);
    suelta = true;
    const d3 = await cobros.devolverAlCancelar(o, x);
    ok(d3.e === 'liberada' && pago(num) === 'released|0', `soltada después: «liberada» (${pago(num)})`);
    await alertasM.cerrarAlertasResueltas();
    ok(sql(`select n.action from money_alert_notes n join money_alerts a on a.id = n.alert_id where a.kind = 'hold_stuck' and a.subject_id = 'liberar:${pid}' order by n.id desc limit 1`) === 'resuelta_sola', 'la alerta hold_stuck se cierra sola cuando el cobro ya no está retenido');
    // El panel: 1 hecha + 1 solo retenida (soltada) nunca es «Le devolvimos todo».
    const c2 = DCX.contar(DCX.contar(DCX.sinDevoluciones(), { e: 'hecha', monto: 4500 }), { e: 'liberada', monto: 4500 });
    const p2 = DCX.textoPanelCancelar(c2);
    ok(p2.es === 'Devoluciones: 1 hecha. Retenciones (no se había cobrado): 1 soltada.' && p2.en === 'Refunds: 1 done. Holds (nothing had been charged): 1 released.', `1 hecha + 1 soltada: «${p2.es}» / «${p2.en}»`);
    ok(DCX.textoPanelCancelar(DCX.contar(DCX.sinDevoluciones(), { e: 'liberada', monto: 4500 })).es === 'No se había cobrado nada: se soltó la retención de su tarjeta. Le avisamos.', 'solo una retención soltada: «No se había cobrado nada: se soltó la retención…»');
  } finally { await D.db().end(); }
  console.log(`\nOK din9v4 (${n} ✓)`);
})().catch((e) => { console.error(e); process.exit(1); });
