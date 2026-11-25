// 25 nov (LAUNCH «el dinero dice lo que pasó», letra g) · Lo que pasa de verdad con lo retenido cuando Stripe no contesta o ya lo había cobrado.
// Antes: pasarela.liberar daba ok ante «payment_intent_unexpected_state» sin mirar el intento (si la captura ya había salido y la base no lo sabía, el libro
// quedaba 'released' con el dinero cobrado y la alerta liberar: se cerraba sola); la captura tarde a la que Stripe no contestaba (ok:false de red, sin
// lanzar) soltaba sin alerta captura:; y ninguna prueba ejecutaba alertarCapturaTarde. Ahora:
//   1. Viaje cancelado tarde por quien pagó (el servidor de verdad, viajeAccion): con ···· 0404 la captura no contesta y no sale → la retención se suelta,
//      UNA alerta hold_stuck captura:<cobro> que dice que no se sabe si salió, sin cobrada:. Con ···· 0408 la captura sale y la respuesta se pierde → al
//      soltar, Stripe (el simulador) la encuentra cobrada: el libro la anota cobrada (nunca 'released'), alerta cobrada:<cobro> y captura:<cobro>, y la regla
//      de la cancelación tarde sigue con lo cobrado (se queda la mitad, se devuelve el resto); los avisos lo dicen.
//   2. alertarCapturaTarde (cobros.ts real, sin servidor): UNA fila hold_stuck captura:<cobro> por cobro; una segunda llamada (y una tercera que lanza) no la
//      duplica; el barrido de alertas no la cierra; sin cobro, nada y sin tirar.
//   3. El barrido de pagos (repararPagos, cobros.ts real con el simulador real): una retención de una operación cancelada que Stripe ya había cobrado
//      queda 'captured' con lo que de verdad se cobró, con UNA alerta cobrada:<cobro> que el barrido de alertas no cierra; el segundo barrido no la duplica.
//      Y la pasarela real ante Stripe (con un Stripe de mentira): unexpected_state se mira (cancelado = soltada; cobrado = { cobrado }; sin respuesta = no);
//      cobrar ante unexpected_state de un intento cancelado no es «cobrado».
// Precondiciones propias (corre dos veces seguidas): su negocio, su dueña y sus clientes (teléfonos 555 libres), la salida, los cobros y el simulador.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const crypto = require('crypto'); const fs = require('fs');
const { entrarComo, sql } = require('../lib/negocio-nuevo.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const B = ENT.B;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l));
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
// Las acciones del servidor por su id del build (como din9v4): la misma llamada que hace la pantalla, desde una página donde vive la acción.
const MAN = JSON.parse(fs.readFileSync(ENT.RAIZ + '/apps/web/.next/server/server-reference-manifest.json', 'utf8')).node;
const ACT = Object.fromEntries(Object.entries(MAN).map(([id, v]) => [v.exportedName, id]));
const accion = async (p, nombre, args) => {
  if (!ACT[nombre]) throw new Error('acción sin id en el build: ' + nombre);
  const r = await p.evaluate(async ([id, args]) => { const x = await fetch(location.pathname + location.search, { method: 'POST', headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, body: JSON.stringify(args) }); return { st: x.status, t: await x.text() }; }, [ACT[nombre], args]);
  const l = r.t.split('\n').find((x) => /^1:/.test(x));
  let j = null; try { j = l ? JSON.parse(l.slice(2)) : null; } catch { j = null; }
  return { st: r.st, j, t: r.t };
};
const aviso = (num, tpl) => sql(`select n.title || ' | ' || n.body from notifications n where n.tpl = '${tpl}' and n.ref_id = '${num}' order by n.id desc limit 1`);
const pago = (num) => sql(`select p.status || '|' || p.amount_cents || '|' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${num}' order by p.id desc limit 1`);
const pidDe = (num) => sql(`select p.id from payments p join operations o on o.id = p.operation_id where o.number = '${num}' order by p.id desc limit 1`);
const alertas = (suj) => sql(`select count(*) from money_alerts where kind = 'hold_stuck' and subject_id = '${suj}'`);
const detalle = (suj) => sql(`select detail->>'es' from money_alerts where kind = 'hold_stuck' and subject_id = '${suj}'`);
const notas = (suj) => sql(`select count(*) from money_alert_notes n join money_alerts a on a.id = n.alert_id where a.kind = 'hold_stuck' and a.subject_id = '${suj}'`);

(async () => {
  const persona = (nombre) => { const t = telPropio(); sql(`insert into users (phone, first_name, last_name) values ('+1${t}', '${nombre}', 'Nueve X')`); return { tel: t, id: sql(`select id from users where phone = '+1${t}'`) }; };
  const DUENA = persona('Dueña');
  const negocio = (id, nombre) => {
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${id}', 'hzl', 'NEG-TRANS', '${nombre}', 'active')`);
    sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${id}', '${DUENA.id}', 'owner', 'Dueña')`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${id}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
    sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${id}', 'acct_sim_${id}', 'enabled', true, true, true)`);
    return primero(sql(`insert into items (business_id, name, price_cents) values ('${id}', '{"es":"Servicio 9x ${RUN}","en":"Service 9x ${RUN}"}'::jsonb, 4500) returning id`));
  };
  // Lo retenido: el libro (held) y el simulador. tarjeta: los 4 últimos (0404 · 0408 ensayan la captura sin respuesta); st y cap: el estado del simulador.
  const retenido = (op, uid, biz, cents, { l4 = '4242', st = 'requires_capture', cap = 0 } = {}) => {
    const pi = `pi_sim_9x_${RUN}_${op}`;
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', ${cents}, 0, 'acct_sim_${biz}', '${st}', ${cap}, 0, 'pm_sim_visa_${l4}', 'manual')`);
    sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated)
         values (${op}, '${uid}', '${biz}', 'hzl', 'full', 'card', '${pi}', ${cents}, ${cents}, 0, 'held', 'visa', '${l4}', now(), true)`);
    sql(`update operations set pay_status = 'held' where id = ${op}`);
    return pi;
  };

  // ── 1 · Viaje cancelado tarde: la captura no contesta ──
  console.log('1 · Viaje: cancelado tarde con la captura sin respuesta (0404: no salió · 0408: salió y la respuesta se perdió)');
  const BV = `d9xv-${RUN}`, SV = negocio(BV, `Van 9x ${RUN}`);
  const SAL = primero(sql(`insert into trip_runs (business_id, city_id, item_id, run_at, seats_total) values ('${BV}', 'hzl', ${SV}, now() + interval '5 hours', 14) returning id`));
  const viaje = (nombre) => {
    const U = persona(nombre), num = `V-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`;
    const det = JSON.stringify({ k: 'asiento', run: SAL, svc: { es: `Hazleton → Allentown ${RUN}`, en: `Hazleton → Allentown ${RUN}` }, svcId: SV, adults: 1, kids: 0, inc: [], from: { es: 'Hazleton', en: 'Hazleton' }, to: { es: 'Allentown', en: 'Allentown' }, terms: { feePct: 50, cancelH: 24 } });
    const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, pay_mode, client_key, is_test, confirmed_at)
      values ('${num}', 'trip', 'hzl', '${BV}', '${U.id}', 'confirmed', (select run_at from trip_runs where id = ${SAL}), 120, '${det}'::jsonb, 1, 4500, 4500, 'app', gen_random_uuid(), true, now()) returning id`));
    sql(`insert into run_seats (operation_id, run_id, seats) values (${op}, ${SAL}, 1)`);
    return { ...U, num, op };
  };
  const telefono = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const b = await chromium.launch(); const err = [];
  try {
    const V1 = viaje('Calla'), V2 = viaje('Cobra y calla');
    for (const [V, l4] of [[V1, '0404'], [V2, '0408']]) {
      const m = await (await telefono(b)).newPage(); m.on('pageerror', (e) => err.push(e.message));
      await entrarComo(m, V.tel); await m.goto(B + `/viaje/${V.num}`);
      // Lo retenido entra justo antes de cancelar (el barrido de pagos de cada minuto no alcanza a capturarlo antes).
      V.pi = retenido(V.op, V.id, BV, 4500, { l4 });
      const r = await accion(m, 'viajeAccion', [V.num, 'cancelar']);
      ok(r.j?.ok === true && sql(`select status || '|' || cancelled_by || '|' || cancel_reason from operations where number = '${V.num}'`) === 'cancelled|user|tarde', `${V.num} (···· ${l4}): el cliente canceló tarde`);
      V.pid = pidDe(V.num);
      await m.context().close();
    }
    // 0404: la captura no salió; la retención se suelta; la alerta dice que no se sabe si salió.
    ok(sql(`select status from sim_intents where id = '${V1.pi}'`) === 'canceled' && pago(V1.num) === 'released|4500|0', `${V1.num}: la captura no salió y la retención se soltó (simulador cancelado, ${pago(V1.num)})`);
    ok(alertas(`captura:${V1.pid}`) === '1' && alertas(`cobrada:${V1.pid}`) === '0', `${V1.num}: UNA alerta hold_stuck captura:<cobro> y ninguna cobrada:`);
    const d1 = detalle(`captura:${V1.pid}`);
    ok(d1.includes('Stripe no contestó a la captura tarde (red): no se sabe si salió') && d1.includes('Después la retención se soltó ($45.00)'), `la alerta dice lo que se sabe (${d1})`);
    ok(sql(`select details->>'cobroMitad' from operations where number = '${V1.num}'`) === '0', 'cobroMitad 0: no se cobró la mitad');
    const a1 = aviso(V1.num, 'viaje_cx');
    ok(a1.includes('No se cobró nada: la retención de $45.00 se suelta de tu tarjeta.') && !/Se cobró la mitad/.test(a1), `viaje_cx: «No se cobró nada», nunca «Se cobró la mitad» (${a1})`);
    // 0408: la captura SÍ salió y la respuesta se perdió; al soltar, el simulador la encuentra cobrada.
    ok(sql(`select status || '|' || captured_cents || '|' || refunded_cents from sim_intents where id = '${V2.pi}'`) === 'succeeded|4500|2250', `${V2.num}: Stripe (el simulador) cobró $45 y devolvió $22.50 (${sql(`select status || '|' || captured_cents || '|' || refunded_cents from sim_intents where id = '${V2.pi}'`)})`);
    ok(pago(V2.num) === 'partially_refunded|4500|2250', `${V2.num}: el libro la dice cobrada (nunca 'released'): $45 cobrados, $22.50 devueltos (${pago(V2.num)})`);
    ok(alertas(`captura:${V2.pid}`) === '1' && alertas(`cobrada:${V2.pid}`) === '1' && alertas(`liberar:${V2.pid}`) === '0', `${V2.num}: UNA alerta captura: y UNA cobrada:, ninguna liberar:`);
    ok(detalle(`captura:${V2.pid}`).includes('Stripe dijo que ya estaba cobrada ($45.00)') && detalle(`cobrada:${V2.pid}`).includes('Stripe ya la había cobrado ($45.00) y la base no lo sabía'), 'las dos alertas dicen que Stripe ya la había cobrado');
    ok(sql(`select details->>'cobroMitad' from operations where number = '${V2.num}'`) === '2250', 'cobroMitad $22.50: la regla de la cancelación tarde siguió con lo cobrado');
    const a2 = aviso(V2.num, 'viaje_cx'), n2 = aviso(V2.num, 'biz_viaje_cx');
    ok(a2.includes('Se cobró la mitad: $22.50.') && a2.includes('Te devolvimos $22.50 a tu tarjeta') && !/No se cobró nada|se suelta/.test(a2), `viaje_cx: la mitad cobrada y el resto devuelto (${a2})`);
    ok(n2.includes('Se cobró la mitad: $22.50.') && !/\{dep\}|\{d/.test(n2), `biz_viaje_cx: lo que se cobró (${n2})`);
    ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  } finally { await b.close(); }

  // ── 2 y 3 · cobros.ts real (sin servidor) ──
  const D = cargar('apps/web/lib/db.ts');
  const avisos = { avisar: async () => undefined, avisarMuchos: async () => undefined, avisarNegocio: async () => undefined };
  const K = {}, DC = {};
  const alertasM = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC,
    './evt-liquidacion': {}, './revision-pasarela': {}, './cobro-fuera': {}, './suscripcion': {}, './renovar-retencion': {} });
  // La pasarela REAL (el simulador del sandbox: sin STRIPE_SECRET_KEY) y una con un Stripe de mentira para los caminos de Stripe.
  class ErrorStripe extends Error { constructor(tipo, codigo) { super(codigo ?? tipo); this.tipo = tipo; this.codigo = codigo; this.rechazo = null; } }
  const ST = { estado: null, cuenta: 0 };
  const stripeMentira = async (metodo, ruta) => {
    ST.cuenta++;
    if (metodo === 'POST') throw new ErrorStripe('invalid_request_error', 'payment_intent_unexpected_state');
    if (ST.estado === null) throw new ErrorStripe('red', null);
    return { status: ST.estado, amount_received: ST.estado === 'succeeded' ? 2500 : 0 };
  };
  const pasarelaCon = (stripe) => cargar('apps/web/lib/pagos/pasarela.ts', { '../db': D, '../entorno': { ENTORNO: 'pruebas' }, './stripe': { ErrorStripe, stripe, stripeArchivo: async () => { throw new Error('sin Stripe'); } },
    '../tiendas/revision': { pagoBloqueado: async () => null } });
  const PS = pasarelaCon(async () => { throw new Error('sin Stripe'); }), PM = pasarelaCon(stripeMentira);
  const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': PS, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertasM,
    './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC,
    './mercado': { repararMercado: async () => undefined }, './apartados': { repararApartados: async () => undefined }, './estimados': { repararEstimados: async () => undefined } });
  try {
    console.log('2 · alertarCapturaTarde: una fila por cobro, sin duplicar, que el barrido de alertas no cierra');
    const BR = `d9xr-${RUN}`; negocio(BR, `Van alerta ${RUN}`); const U = persona('Alerta');
    const operacion = (st) => { const num = `V-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`; return { num, op: primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, pay_mode, client_key, is_test)
      values ('${num}', 'trip', 'hzl', '${BR}', '${U.id}', '${st}', now() + interval '3 days', 120, '{"k":"asiento"}'::jsonb, 1, 3000, 3000, 'app', gen_random_uuid(), true) returning id`)) }; };
    const A = operacion('cancelled'); retenido(A.op, U.id, BR, 3000); const pa = pidDe(A.num);
    await cobros.alertarCapturaTarde(A.num, pa, { codigo: 'red' }, { e: 'liberada', monto: 3000 });
    await cobros.alertarCapturaTarde(A.num, pa, { codigo: 'red' }, { e: 'liberada', monto: 3000 });
    await cobros.alertarCapturaTarde(A.num, pa, { err: new Error('la base se cayó') }, { e: 'retenida', monto: 3000 });
    ok(alertas(`captura:${pa}`) === '1', 'tres llamadas (dos sin respuesta y una que lanzó): UNA fila hold_stuck captura:<cobro>');
    ok(detalle(`captura:${pa}`).includes('Stripe no contestó a la captura tarde (red): no se sabe si salió') && sql(`select detail->>'en' from money_alerts where kind = 'hold_stuck' and subject_id = 'captura:${pa}'`).includes('it is not known whether it went through'), 'la primera manda: dice (ES/EN) que no se sabe si salió');
    await cobros.alertarCapturaTarde(A.num, null, { codigo: 'red' }, null);
    ok(sql(`select count(*) from money_alerts where kind = 'hold_stuck' and subject_id like 'captura:%' and detail->>'es' like '${A.num}%'`) === '1', 'sin cobro: no anota nada y no tira');
    await alertasM.barrerAlertasDinero();
    sql(`update payments set status = 'released', released_at = now() where id = ${pa}`);
    await alertasM.cerrarAlertasResueltas();
    ok(notas(`captura:${pa}`) === '0' && alertas(`captura:${pa}`) === '1', 'el barrido de alertas no la cierra (ni con el cobro ya soltado): alguien mira en Stripe');

    console.log('3 · El barrido de pagos ante lo que Stripe ya había cobrado; la pasarela real ante unexpected_state');
    // Una operación cancelada con lo retenido en el libro y COBRADO en el simulador ($25 de $30: lo que de verdad se cobró).
    const C = operacion('cancelled'); const piC = retenido(C.op, U.id, BR, 3000, { st: 'succeeded', cap: 2500 }), pc = pidDe(C.num);
    // Y otra que el simulador ya tenía cancelada: se da por soltada.
    const X = operacion('cancelled'); retenido(X.op, U.id, BR, 3000, { st: 'canceled' });
    await cobros.repararPagos(BR);
    ok(pago(C.num) === 'captured|2500|0' && sql(`select pay_status from operations where id = ${C.op}`) === 'captured', `la que Stripe ya había cobrado queda cobrada con lo que se cobró ($25), nunca 'released' (${pago(C.num)})`);
    ok(sql(`select status from sim_intents where id = '${piC}'`) === 'succeeded', 'el simulador sigue cobrado (no se canceló lo cobrado)');
    ok(alertas(`cobrada:${pc}`) === '1' && alertas(`liberar:${pc}`) === '0' && detalle(`cobrada:${pc}`).includes('Revisa en Stripe si ese cobro correspondía'), 'UNA alerta hold_stuck cobrada:<cobro> (y ninguna liberar:)');
    ok(sql(`select count(*) from operation_events where operation_id = ${C.op} and kind = 'payment_captured' and note->>'es' like 'No se pudo soltar la retención: Stripe ya había cobrado $25.00%'`) === '1', 'el historial dice lo que pasó');
    ok(pago(X.num) === 'released|3000|0', `la que el simulador ya tenía cancelada: soltada (${pago(X.num)})`);
    await cobros.repararPagos(BR);
    await alertasM.cerrarAlertasResueltas();
    ok(alertas(`cobrada:${pc}`) === '1' && notas(`cobrada:${pc}`) === '0' && pago(C.num) === 'captured|2500|0', 'otro barrido: ni otra alerta ni se cierra sola; el cobro sigue igual');
    // La pasarela real ante Stripe: unexpected_state se mira.
    ST.estado = 'succeeded'; const l1 = await PM.pasarela.liberar('pi_9x_mentira');
    ST.estado = 'canceled'; const l2 = await PM.pasarela.liberar('pi_9x_mentira');
    ST.estado = null; const l3 = await PM.pasarela.liberar('pi_9x_mentira');
    ok(l1.ok === false && l1.cobrado === 2500 && l2.ok === true && l3.ok === false && l3.cobrado === undefined, `liberar ante unexpected_state: cobrado → { cobrado: 2500 } · cancelado → soltada · sin respuesta → no (${JSON.stringify([l1, l2, l3])})`);
    ST.estado = 'canceled'; const c1 = await PM.pasarela.cobrar('pi_9x_mentira', 2500, 0);
    ST.estado = 'succeeded'; const c2 = await PM.pasarela.cobrar('pi_9x_mentira', 2500, 0);
    ok(c1.ok === false && c1.codigo === 'canceled' && c2.ok === true, `cobrar ante unexpected_state: cancelado → no se cobró · cobrado → cobrado (${JSON.stringify([c1, c2])})`);
    ok(cobros.capturaSinRespuesta({ ok: false, codigo: 'red' }) && cobros.capturaSinRespuesta({ ok: false, codigo: 'api_error' }) && !cobros.capturaSinRespuesta({ ok: false, codigo: 'canceled' }) && !cobros.capturaSinRespuesta({ ok: true }) && !cobros.capturaSinRespuesta(null),
      'capturaSinRespuesta: la red y el error de Stripe sí; un «no» claro, un «sí» o nada retenido, no');
  } finally { await D.db().end(); }
  console.log(`\nOK din9x (${n} ✓)`);
})().catch((e) => { console.error(e); process.exit(1); });
