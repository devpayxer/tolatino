// 25 nov (LAUNCH «el dinero dice lo que pasó», letra g) · Lo que pasa de verdad con lo retenido cuando Stripe no contesta o ya lo había cobrado.
// Antes: pasarela.liberar daba ok ante «payment_intent_unexpected_state» sin mirar el intento (si la captura ya había salido y la base no lo sabía, el libro
// quedaba 'released' con el dinero cobrado y la alerta liberar: se cerraba sola); la captura tarde a la que Stripe no contestaba (ok:false de red, sin
// lanzar) soltaba sin alerta captura:; y ninguna prueba ejecutaba alertarCapturaTarde. Ahora:
//   1. Viaje cancelado tarde por quien pagó (el servidor de verdad, viajeAccion): con ···· 0404 la captura no contesta y no sale → la retención se suelta,
//      UNA alerta hold_stuck captura:<cobro> que dice que no se sabe si salió, sin cobrada:. Con ···· 0408 la captura sale y la respuesta se pierde → al
//      soltar, Stripe (el simulador) la encuentra cobrada: el libro la anota cobrada (nunca 'released'), la regla de la cancelación tarde se aplica con lo
//      cobrado (se queda la mitad, se devuelve el resto) y hay UNA alerta, cobrada:<cobro>, que lo dice (sin captura:); los avisos lo dicen ($22.50).
//      El viaje y su cobro se siembran en una sentencia justo antes de la acción (el barrido de cada minuto no alcanza a cobrarlo antes).
//   2. alertarCapturaTarde (cobros.ts real, sin servidor): UNA fila hold_stuck captura:<cobro> por cobro; una segunda llamada (y una tercera que lanza) no la
//      duplica; el barrido de alertas no la cierra; sin cobro, nada y sin tirar.
//   3. El barrido de pagos (repararPagos, cobros.ts real con el simulador real): una retención de una operación cancelada que Stripe ya había cobrado
//      queda 'captured' con lo que de verdad se cobró, con UNA alerta cobrada:<cobro> que el barrido de alertas no cierra; el segundo barrido no la duplica.
//      Si era un viaje cancelado tarde por quien pagó, aplica la regla (la mitad y la devolución del resto, llave vcx-<número>); un evento privado tarde,
//      el depósito se queda (perdio). Un aceptado cuyo intento Stripe canceló: alerta cobrar:<cobro> una vez y el barrido no lo reintenta.
//      Y la pasarela real ante Stripe (con un Stripe de mentira): unexpected_state se mira (cancelado = soltada; cobrado = { cobrado }; sin respuesta = no);
//      cobrar ante unexpected_state: cancelado = no se cobró, cobrado = con lo que Stripe capturó; el simulador no reescribe lo ya capturado.
//      (revisión de 483a3af) Cuando el barrido aplica la regla, quien pagó y el negocio reciben UN aviso con lo aplicado (avisoCobro); el aceptado con el
//      código terminal pero sin su alerta se reintenta hasta que la alerta exista; la captura tarde de una cancelada no alerta cobrar:; cobrar: se cierra
//      sola cuando el cobro deja de estar retenido.
//   4. «cobrada» por relectura (el barrido ganó la carrera): devolverAlCancelar dice la regla que aplicó (la mitad; la devolución hecha o en camino) y
//      cobroMitad vuelve a decir la mitad, sin mover dinero otra vez.
//   (revisión de 621f214)
//   1b. La cancelación con el aviso ya reclamado (details.avisoCobro) no manda nada (viaje y evento privado, el servidor de verdad). Y los avisos REALES de
//      lo que aplicó el barrido (viajes › avisarViajeTardeCobrado, evento-privado › avisarEvpTardeCobrado): el panel de Hoy del negocio corre el barrido de
//      pagos en el servidor y se leen las filas de notifications (ES; EN para quien tiene lang en; el negocio).
//   3. El barrido de cada minuto del servidor corre a la vez que esta prueba sobre la misma base: lo que aplica la regla se comprueba por la base (la regla,
//      details.avisoCobro y el aviso: el de mentira de aquí o la fila real de notifications si lo hizo el servidor), nunca solo por los avisos de mentira.
//   4. Sin nada más que devolver, devolverAlCancelar dice lo que pasó con la devolución de su llave (la segunda «cobrada»); la devolución en camino de esta
//      prueba se termina aquí mismo (ejecutarDevolucionPago): no queda nada pendiente en la base compartida.
//   5. barrerCobradasTarde: la cancelación tarde cobrada sin su regla (el proceso murió) se repara (regla, alerta y aviso, una vez); el aviso del barrido
//      que no quedó devuelve el reclamo, la alerta lo dice y el reintento manda solo lo que falta.
//   (revisión de efe56b9)
//   5. El caso DV acepta los dos textos válidos de la devolución (hecha / en camino) y espera a que el libro la diga: el barrido del servidor puede tomar la
//      misma fila a la vez. H2: un viaje cobrado hace 3 días y cancelado tarde ahora (la ventana es la de la cancelación) se repara; el que salió de la
//      ventana sin repararse abre su alerta reparar:. H4: el reintento espera (AVISO_TARDE_ESPERA_MIN) y, agotado, la alerta aviso:.
//   6. H1 con los avisos REALES (lib/avisos.ts): la fila que quedó con un SMS que falla dice que quedó y no se repite; el reintento del negocio no repite a
//      la dueña que ya lo tiene, solo al dueño que faltaba (unaVez).
//   Al final, las alertas hold_stuck que abrió la prueba (cobrada:, aviso:, reparar:, captura:) se marcan resueltas como lo haría el equipo (notaAlerta).
//   (revisión de ae940a7) Las filas que el barrido de cada minuto del servidor podría tomar se siembran recientes y se envejecen justo antes de la pasada de
//   la prueba (sin escapes «lo hizo el servidor»); la cancelación tarde que quedó a medias DESPUÉS de empezar la regla (reglaCobradaAt) se completa; la
//   sección 6 usa el destino de push con su parámetro (el stub sin él hacía fallar la consulta de avisar: «false» sin fila) y el SMS cuyo estado no se
//   anota en el aviso (lib/sms no lanza: lo que lanza es la base después) no lo deja «fallo»; el cierre de las alertas también corre en el finally.
//   (revisión de 90170a1) A medias con la marca: sin ninguna devolución todavía, la regla se aplica de verdad (UNA devolución); con la devolución de la llave
//   ya fallida (renombrada «~fallida-»), ninguna fila nueva en refunds: se lee lo que pasó y la alerta lo dice.
//   (revisión de 51a794d) La devolución que no se pudo ni anotar (refund_stuck cancelacion:vcx-, sin fila) en la regla y en su relectura: «no salió», sin
//   pedir otra; la que el equipo ya devolvió a mano: «hecha», nunca «no salió» ni «$0». «completar» sin regla (la regla lanza): bajo el tope, nada;
//   al tope, «No se pudo completar» en su alerta cobrada:; con la cobrada: ya abierta, su alerta propia completar:; si esa no se anota, el tope vuelve
//   atrás y la próxima pasada la anota. Las refund_stuck de la prueba también se cierran al final.
// Precondiciones propias (corre dos veces seguidas): su negocio, su dueña y sus clientes (teléfonos 555 libres), la salida, los cobros y el simulador.
const ENT = require('../lib/entorno.cjs');
const { sinMas } = require('../lib/usd.cjs'); // «$15» sin «.00» ni más dígitos detrás
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
// (revisión de 621f214) · Cuántos avisos de una plantilla tiene la operación (los reales, en notifications) y lo anotado del aviso en la operación.
const cuantos = (num, tpl) => sql(`select count(*) from notifications where tpl = '${tpl}' and ref_id = '${num}'`);
const det = (num, k) => sql(`select coalesce(details->>'${k}', '') from operations where number = '${num}'`);
const espera = async (f, ms = 15000) => { const t0 = Date.now(); for (;;) { const v = await f(); if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 500)); } };
const numV = () => `V-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`, numE = () => `EP-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`;

(async () => {
  const persona = (nombre) => { const t = telPropio(); sql(`insert into users (phone, first_name, last_name) values ('+1${t}', '${nombre}', 'Nueve X')`); return { tel: t, id: sql(`select id from users where phone = '+1${t}'`) }; };
  const DUENA = persona('Dueña');
  const negocio = (id, nombre, cat = 'NEG-TRANS') => {
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${id}', 'hzl', '${cat}', '${nombre}', 'active')`);
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
  // El viaje confirmado y lo retenido (el libro y el simulador) en UNA sentencia, justo antes de cancelar: el barrido de pagos de cada minuto cobra lo retenido
  // de un viaje confirmado, y no puede alcanzarlo entre la siembra y la acción.
  const detV = (extra = {}) => JSON.stringify({ k: 'asiento', run: SAL, svc: { es: `Hazleton → Allentown ${RUN}`, en: `Hazleton → Allentown ${RUN}` }, svcId: SV, adults: 1, kids: 0, inc: [], from: { es: 'Hazleton', en: 'Hazleton' }, to: { es: 'Allentown', en: 'Allentown' }, terms: { feePct: 50, cancelH: 24 }, ...extra });
  const viaje = (U, num, l4, extra = {}) => {
    const det = detV(extra);
    const pi = `pi_sim_9x_${RUN}_${num}`;
    const op = primero(sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, pay_mode, client_key, is_test, confirmed_at, pay_status)
        values ('${num}', 'trip', 'hzl', '${BV}', '${U.id}', 'confirmed', (select run_at from trip_runs where id = ${SAL}), 120, '${det}'::jsonb, 1, 4500, 4500, 'app', gen_random_uuid(), true, now(), 'held') returning id),
      s as (insert into run_seats (operation_id, run_id, seats) select id, ${SAL}, 1 from o),
      i as (insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', 4500, 0, 'acct_sim_${BV}', 'requires_capture', 0, 0, 'pm_sim_visa_${l4}', 'manual')),
      p as (insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated)
        select id, '${U.id}', '${BV}', 'hzl', 'full', 'card', '${pi}', 4500, 4500, 0, 'held', 'visa', '${l4}', now(), true from o)
      select id from o`));
    return { op, pi };
  };
  const telefono = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const b = await chromium.launch(); const err = [];
  try {
    const nuevo = (nombre) => ({ ...persona(nombre), num: `V-9${String(crypto.randomInt(1e8)).padStart(8, '0')}` });
    const V1 = nuevo('Calla'), V2 = nuevo('Cobra y calla');
    for (const [V, l4] of [[V1, '0404'], [V2, '0408']]) {
      const m = await (await telefono(b)).newPage(); m.on('pageerror', (e) => err.push(e.message));
      // La página del viaje antes de sembrarlo (la acción vive en esa ruta; lo que muestre ahora no importa): la siembra va justo antes de la acción.
      await entrarComo(m, V.tel); await m.goto(B + `/viaje/${V.num}`);
      Object.assign(V, viaje(V, V.num, l4));
      const r = await accion(m, 'viajeAccion', [V.num, 'cancelar']);
      ok(r.j?.ok === true && sql(`select status || '|' || cancelled_by || '|' || cancel_reason from operations where number = '${V.num}'`) === 'cancelled|user|tarde', `${V.num} (···· ${l4}): el cliente canceló tarde`);
      V.pid = pidDe(V.num);
      await m.context().close();
    }
    // 0404: la captura no salió; la retención se suelta; la alerta dice que no se sabe si salió.
    ok(sql(`select status from sim_intents where id = '${V1.pi}'`) === 'canceled' && pago(V1.num) === 'released|4500|0', `${V1.num}: la captura no salió y la retención se soltó (simulador cancelado, ${pago(V1.num)})`);
    ok(alertas(`captura:${V1.pid}`) === '1' && alertas(`cobrada:${V1.pid}`) === '0', `${V1.num}: UNA alerta hold_stuck captura:<cobro> y ninguna cobrada:`);
    const d1 = detalle(`captura:${V1.pid}`);
    ok(d1.includes('Stripe no contestó a la captura tarde (red): no se sabe si salió') && d1.includes('Después la retención se soltó ($45)'), `la alerta dice lo que se sabe (${d1})`);
    ok(sql(`select details->>'cobroMitad' from operations where number = '${V1.num}'`) === '0', 'cobroMitad 0: no se cobró la mitad');
    const a1 = aviso(V1.num, 'viaje_cx');
    ok(a1.includes('No se cobró nada: la retención de $45 se suelta de tu tarjeta.') && !/Se cobró la mitad/.test(a1), `viaje_cx: «No se cobró nada», nunca «Se cobró la mitad» (${a1})`);
    // 0408: la captura SÍ salió y la respuesta se perdió; al soltar, el simulador la encuentra cobrada.
    ok(sql(`select status || '|' || captured_cents || '|' || refunded_cents from sim_intents where id = '${V2.pi}'`) === 'succeeded|4500|2250', `${V2.num}: Stripe (el simulador) cobró $45 y devolvió $22.50 (${sql(`select status || '|' || captured_cents || '|' || refunded_cents from sim_intents where id = '${V2.pi}'`)})`);
    ok(pago(V2.num) === 'partially_refunded|4500|2250', `${V2.num}: el libro la dice cobrada (nunca 'released'): $45 cobrados, $22.50 devueltos (${pago(V2.num)})`);
    ok(alertas(`cobrada:${V2.pid}`) === '1' && alertas(`captura:${V2.pid}`) === '0' && alertas(`liberar:${V2.pid}`) === '0', `${V2.num}: UNA sola alerta, cobrada: (ni captura: ni liberar:)`);
    const d2 = detalle(`cobrada:${V2.pid}`);
    ok(d2.includes('Stripe ya la había cobrado ($45) y la base no lo sabía') && d2.includes('Se aplicó la cancelación tarde: se quedó $22.50 y se devolvieron $22.50') && d2.includes('no devuelvas nada más'), `la alerta dice lo cobrado y la regla que se aplicó (${d2})`);
    ok(sql(`select details->>'cobroMitad' from operations where number = '${V2.num}'`) === '2250', 'cobroMitad $22.50: la regla de la cancelación tarde siguió con lo cobrado');
    const a2 = aviso(V2.num, 'viaje_cx'), n2 = aviso(V2.num, 'biz_viaje_cx');
    ok(a2.includes('Se cobró la mitad: $22.50.') && a2.includes('Te devolvimos $22.50 a tu tarjeta') && !/No se cobró nada|se suelta/.test(a2), `viaje_cx: la mitad cobrada y el resto devuelto (${a2})`);
    ok(n2.includes('Se cobró la mitad: $22.50.') && !/\{dep\}|\{d/.test(n2), `biz_viaje_cx: lo que se cobró (${n2})`);

    // ── 1b (revisión de 621f214) · El aviso que dice lo cobrado ya lo dijo otro (details.avisoCobro en true): la cancelación no manda nada ──
    console.log('1b · La cancelación con el aviso ya reclamado no manda nada; los avisos reales de lo que aplicó el barrido (ES, EN y el negocio)');
    const V3 = nuevo('Ya avisado');
    {
      const m = await (await telefono(b)).newPage(); m.on('pageerror', (e) => err.push(e.message));
      await entrarComo(m, V3.tel); await m.goto(B + `/viaje/${V3.num}`);
      Object.assign(V3, viaje(V3, V3.num, '4242', { avisoCobro: true }));
      const r = await accion(m, 'viajeAccion', [V3.num, 'cancelar']);
      ok(r.j?.ok === true && sql(`select status || '|' || cancel_reason from operations where number = '${V3.num}'`) === 'cancelled|tarde' && pago(V3.num) === 'partially_refunded|4500|2250' && det(V3.num, 'cobroMitad') === '2250',
        `${V3.num}: canceló tarde con el aviso ya reclamado: la regla se aplicó igual ($22.50 cobrados, $22.50 devueltos: ${pago(V3.num)})`);
      ok(cuantos(V3.num, 'viaje_cx') === '0' && cuantos(V3.num, 'biz_viaje_cx') === '0', `${V3.num}: ni viaje_cx ni biz_viaje_cx (viajes.ts: el reclamo ya estaba tomado)`);
      await m.context().close();
    }
    // El evento privado igual (evento-privado.ts › cancelarEvp): el depósito ya cobrado se queda con el restaurante y nadie recibe otro aviso. Lo cobrado (no
    // retenido) no lo toca el barrido de pagos: se siembra antes de abrir la pantalla.
    const BF = `d9xf-${RUN}`; negocio(BF, `Fogón 9x ${RUN}`, 'NEG-FOOD');
    const E3 = { ...persona('Evento ya avisado'), num: numE() };
    {
      const dE = JSON.stringify({ occ: 'familia', area: 'salon', horas: 3, bud: '30', menu: { k: 'buffet', es: 'Buffet criollo', en: 'Creole buffet', cents: 2600 }, ext: [], avisoCobro: true }), piE = `pi_sim_9x_${RUN}_${E3.num}`;
      E3.op = primero(sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key, is_test, confirmed_at, pay_status)
          values ('${E3.num}', 'private_event', 'hzl', '${BF}', '${E3.id}', 'confirmed', now() + interval '2 days', 180, '${dE}'::jsonb, 20, 50000, 50000, 10000, 'app', gen_random_uuid(), true, now(), 'captured') returning id),
        i as (insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${piE}', 10000, 0, 'acct_sim_${BF}', 'succeeded', 10000, 0, 'pm_sim_visa_4242', 'manual')),
        p as (insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated)
          select id, '${E3.id}', '${BF}', 'hzl', 'deposit', 'card', '${piE}', 10000, 10000, 0, 'captured', 'visa', '4242', now(), now(), true from o)
        select id from o`));
      const m = await (await telefono(b)).newPage(); m.on('pageerror', (e) => err.push(e.message));
      await entrarComo(m, E3.tel); await m.goto(B + `/privado/${E3.num}`);
      const r = await accion(m, 'evpClienteAccion', [E3.num, 'cancelar']);
      ok(r.j?.ok === true && sql(`select status || '|' || cancelled_by || '|' || cancel_reason from operations where number = '${E3.num}'`) === 'cancelled|user|tarde' && det(E3.num, 'perdio') === 'true' && pago(E3.num) === 'captured|10000|0',
        `${E3.num}: canceló tarde con el aviso ya reclamado: el depósito se queda con el restaurante (${pago(E3.num)})`);
      ok(cuantos(E3.num, 'evp_cancelado') === '0' && cuantos(E3.num, 'evp_biz_cx') === '0', `${E3.num}: ni evp_cancelado ni evp_biz_cx (evento-privado.ts: el reclamo ya estaba tomado)`);
      await m.context().close();
    }
    // Los avisos REALES de lo que aplicó el barrido: cancelaciones tarde a las que se les dijo «No se cobró nada…» (lo retenido en el libro), que Stripe (el
    // simulador) sí había cobrado. El panel de Hoy del negocio corre el barrido de pagos en el servidor (repararPagos); el de cada minuto también puede
    // ganar: es el mismo código del servidor, lo que se mira es la base.
    const cobradaSinSaber = (U, num, kind) => {
      const pi = `pi_sim_9x_${RUN}_${num}`, trip = kind === 'trip', cents = trip ? 4500 : 10000;
      const d = trip ? detV({ cobroMitad: 0 }) : JSON.stringify({ occ: 'familia', area: 'salon', horas: 3, bud: '30', menu: { k: 'buffet', es: 'Buffet criollo', en: 'Creole buffet', cents: 2600 }, ext: [], perdio: false });
      return primero(sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key, is_test, confirmed_at, cancelled_by, cancel_reason, cancelled_at, pay_status)
          values ('${num}', '${kind}', 'hzl', '${BV}', '${U.id}', 'cancelled', now() + interval '5 hours', ${trip ? 120 : 180}, '${d}'::jsonb, ${trip ? 1 : 20}, ${trip ? 4500 : 50000}, ${trip ? 4500 : 50000}, ${trip ? 0 : 10000}, 'app', gen_random_uuid(), true, now(), 'user', 'tarde', now(), 'held') returning id),
        i as (insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', ${cents}, 0, 'acct_sim_${BV}', 'succeeded', ${cents}, 0, 'pm_sim_visa_4242', 'manual')),
        p as (insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated)
          select id, '${U.id}', '${BV}', 'hzl', '${trip ? 'full' : 'deposit'}', 'card', '${pi}', ${cents}, ${cents}, 0, 'held', 'visa', '4242', now(), true from o)
        select id from o`));
    };
    const T4 = nuevo('Cobrada es'), T5 = nuevo('Cobrada en'), E5 = { ...persona('Cobrada evento'), num: numE() };
    sql(`update users set lang = 'en' where id = '${T5.id}'`);
    T4.op = cobradaSinSaber(T4, T4.num, 'trip'); T5.op = cobradaSinSaber(T5, T5.num, 'trip'); E5.op = cobradaSinSaber(E5, E5.num, 'private_event');
    {
      const pd = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); pd.on('pageerror', (e) => err.push(e.message));
      await entrarComo(pd, DUENA.tel); await pd.goto(B + `/panel/${BV}/hoy`);
      ok(await espera(() => cuantos(T4.num, 'viaje_cx') === '1' && cuantos(T5.num, 'viaje_cx') === '1' && cuantos(E5.num, 'evp_cancelado') === '1' && cuantos(E5.num, 'evp_biz_cx') === '1', 150000),
        `el barrido del servidor encontró las tres cobradas y mandó los avisos reales (viaje_cx ${cuantos(T4.num, 'viaje_cx')}/${cuantos(T5.num, 'viaje_cx')} · evp_cancelado ${cuantos(E5.num, 'evp_cancelado')})`);
      await pd.context().close();
    }
    const a4 = aviso(T4.num, 'viaje_cx'), n4 = aviso(T4.num, 'biz_viaje_cx'), a5 = aviso(T5.num, 'viaje_cx'), e5 = aviso(E5.num, 'evp_cancelado'), f5 = aviso(E5.num, 'evp_biz_cx');
    ok(a4.includes('La retención sí se había cobrado. Se cobró la mitad: $22.50. Te devolvimos $22.50 a tu tarjeta') && !/No se cobró nada|\{d/.test(a4), `viaje_cx real (ES): lo que aplicó el barrido (${a4})`);
    ok(n4.includes('La retención sí se había cobrado. Se cobró la mitad: $22.50.') && cuantos(T4.num, 'biz_viaje_cx') === '1' && !/\{dep\}/.test(n4), `biz_viaje_cx real (el negocio): lo que se cobró (${n4})`);
    ok(a5.includes('The hold had in fact been charged. Half was charged: $22.50. We refunded $22.50 to your card') && !/retención|Se cobró|\{d/.test(a5), `viaje_cx real (EN, lang en): en inglés (${a5})`);
    ok(e5.includes('La retención sí se había cobrado. El depósito de $100 se queda con el restaurante.') && f5.includes('La retención sí se había cobrado. El depósito de $100 se queda contigo.'), `evp_cancelado y evp_biz_cx reales: el depósito se quedó (${e5} · ${f5})`);
    for (const x of [T4, T5, E5]) ok(det(x.num, 'avisoCobro') === 'true' && sql(`select (details ? 'avisoCobroFalta')::text from operations where number = '${x.num}'`) === 'false'
      // La alerta la anota el primero que llega: el que mandó el aviso dice que llegó; si el panel y el barrido de cada minuto la encontraron cobrada a la
      // vez, la del que perdió el reclamo no habla del aviso. Nunca «NO le llegó».
      && ((d) => d.includes('Se aplicó la cancelación tarde') && (d.includes('Quien pagó y el negocio ya tienen el aviso con lo aplicado.') || !/aviso/.test(d)))(detalle(`cobrada:${pidDe(x.num)}`)),
      `${x.num}: el reclamo anotado, nada pendiente y la alerta dice lo aplicado (${detalle(`cobrada:${pidDe(x.num)}`)})`);
    ok(pago(T4.num) === 'partially_refunded|4500|2250' && pago(E5.num) === 'captured|10000|0' && det(E5.num, 'perdio') === 'true', `la regla aplicada: ${pago(T4.num)} · ${pago(E5.num)}`);
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
  // (revisión de 483a3af) · Los avisos de la cancelación tarde que el barrido manda cuando aplica la regla (cobros › avisarTardeCobrada): se anotan aquí;
  // el reclamo de una vez (details.avisoCobro) es el real, en la base.
  // (revisión de 621f214) · Como los reales, dicen qué aviso quedó ({ cli, neg }; lo que no se pidió cuenta como quedó). FALLA: el número cuyo aviso a quien
  // pagó no queda la próxima vez (una sola).
  // (revisión de efe56b9) · FALLA_SIEMPRE: el número cuyo aviso a quien pagó no queda nunca (los reintentos se agotan: alerta aviso:).
  const AV = [], FALLA = new Set(), FALLA_SIEMPRE = new Set();
  const quedo = (num, partes) => { if (FALLA_SIEMPRE.has(num)) return { cli: !partes.cli, neg: true }; if (FALLA.has(num)) { FALLA.delete(num); return { cli: !partes.cli, neg: true }; } return { cli: true, neg: true }; };
  const viajesM = { avisarViajeTardeCobrado: async (num, regla, partes = { cli: true, neg: true }) => { AV.push(['v', num, regla, partes]); return quedo(num, partes); } };
  const evpM = { avisarEvpTardeCobrado: async (num, queda, cobrado, partes = { cli: true, neg: true }) => { AV.push(['e', num, queda, cobrado, partes]); return quedo(num, partes); } };
  // El aviso lo mandó esta prueba (de mentira, UNO) o el barrido del servidor (la fila real), nunca los dos ni ninguno; y el reclamo quedó anotado.
  const unAviso = (num, tpl, L) => det(num, 'avisoCobro') === 'true' && ((L.length === 1 && cuantos(num, tpl) === '0') || (L.length === 0 && cuantos(num, tpl) === '1'));
  const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': PS, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertasM,
    './viajes': viajesM, './evento-privado': evpM,
    './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC,
    './mercado': { repararMercado: async () => undefined }, './apartados': { repararApartados: async () => undefined }, './estimados': { repararEstimados: async () => undefined } });
  // (revisión de efe56b9) · Las alertas hold_stuck que abrió esta prueba (cobrada:, aviso:, reparar:, captura:) no se quedan abiertas en la base compartida:
  // el equipo las marca resueltas, con su nota (alertas › notaAlerta, como en Super Admin › Planes › Ingresos). Al final del try y en el finally.
  let EQ = null;
  const cerrarAlertas = async () => {
    EQ = EQ ?? persona('Equipo');
    // (revisión de 51a794d) · También completar: y las refund_stuck cancelacion:vcx-<número> que siembra la prueba (por el cobro de su operación).
    const abiertas = () => sql(`select a.id from money_alerts a join payments p on p.id = case when a.kind = 'hold_stuck' and a.subject_id ~ '^(cobrada|aviso|reparar|captura|completar):[0-9]{1,18}$' then split_part(a.subject_id, ':', 2)::bigint
          when a.kind = 'refund_stuck' and a.subject_id like 'cancelacion:vcx-%' then (select y.id from payments y join operations o on o.id = y.operation_id where o.number = substr(a.subject_id, 17) order by y.id desc limit 1) end
        where a.kind in ('hold_stuck', 'refund_stuck') and p.business_id like 'd9x_-${RUN}' and not exists (select 1 from money_alert_notes n where n.alert_id = a.id and n.action in ('resuelta', 'resuelta_sola', 'resuelta_a_mano'))`).split('\n').filter((l) => /^\d+$/.test(l));
    const L0 = abiertas(), malas = [];
    for (const id of L0) { const r = await alertasM.notaAlerta({ id: EQ.id, cities: [] }, id, 'resuelta', 'Prueba din9x: revisado en Stripe, cuadra con lo aplicado.'); if (!r.ok) malas.push([id, r.msg]); }
    return { n: L0.length, malas, quedan: abiertas().length };
  };
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
    sql(`update payments set status = 'released', released_at = now() where id = ${pa}`);
    sql(`update sim_intents set status = 'canceled' where id = (select stripe_payment_intent from payments where id = ${pa})`);
    // (revisión de 483a3af) · El barrido de alertas de cada minuto (barrerAlertasDinero) no se llama aquí: anotaría y cerraría alertas de otras pruebas en la
    // base compartida. Su ÚNICO camino que cierra alertas es cerrarAlertasResueltas (al final de barrerAlertasDinero; lo demás solo anota refund_stuck,
    // transfer_reversal_stuck, dispute_due y payout_failed, nunca hold_stuck), y es el que se llama aquí, con lo de esta prueba ya soltado. El guardián
    // liberarMira lo vigila: barrerAlertasDinero no cierra nada por su cuenta y cerrarAlertasResueltas no mira ni captura: ni cobrada:.
    await alertasM.cerrarAlertasResueltas();
    ok(notas(`captura:${pa}`) === '0' && alertas(`captura:${pa}`) === '1', 'el barrido de alertas no la cierra (ni con el cobro ya soltado): alguien mira en Stripe');

    console.log('3 · El barrido de pagos ante lo que Stripe ya había cobrado; la pasarela real ante unexpected_state');
    // Una operación cancelada con lo retenido en el libro y COBRADO en el simulador ($25 de $30: lo que de verdad se cobró).
    const C = operacion('cancelled'); const piC = retenido(C.op, U.id, BR, 3000, { st: 'succeeded', cap: 2500 }), pc = pidDe(C.num);
    // Y otra que el simulador ya tenía cancelada: se da por soltada.
    const X = operacion('cancelled'); retenido(X.op, U.id, BR, 3000, { st: 'canceled' });
    // Un viaje que quien pagó canceló TARDE, con lo retenido ya cobrado en Stripe: el barrido aplica la regla (se queda la mitad, se devuelve el resto).
    const T = operacion('cancelled'); sql(`update operations set cancelled_by = 'user', cancel_reason = 'tarde', cancelled_at = now() where id = ${T.op}`);
    const piT = retenido(T.op, U.id, BR, 3000, { st: 'succeeded', cap: 3000 }), pt = pidDe(T.num);
    // Un evento privado cancelado tarde por quien pagó, igual: el depósito se queda con el restaurante (perdio).
    const ENUM = `EP-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`;
    const E = { num: ENUM, op: primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key, is_test, cancelled_by, cancel_reason, cancelled_at)
      values ('${ENUM}', 'private_event', 'hzl', '${BR}', '${U.id}', 'cancelled', now() + interval '2 days', 180, '{"perdio":false}'::jsonb, 20, 50000, 50000, 10000, 'app', gen_random_uuid(), true, 'user', 'tarde', now()) returning id`)) };
    retenido(E.op, U.id, BR, 10000, { st: 'succeeded', cap: 10000 }); sql(`update payments set kind = 'deposit' where operation_id = ${E.op}`); const pe = pidDe(E.num);
    // Uno aceptado cuyo intento Stripe ya canceló: no se cobra, alerta una vez y el barrido no lo reintenta.
    const N = operacion('confirmed'); retenido(N.op, U.id, BR, 3000, { st: 'canceled' }); const pn = pidDe(N.num);
    // (revisión de 483a3af) · Uno aceptado con el código terminal ya escrito pero SIN su alerta (alertar había fallado): el barrido lo vuelve a intentar y alerta.
    const M = operacion('confirmed'); retenido(M.op, U.id, BR, 3000, { st: 'canceled' }); const pm = pidDe(M.num);
    sql(`update payments set failure_code = 'canceled' where id = ${pm}`);
    // La captura tarde de una cancelación (la operación ya cancelada) que Stripe ya no deja cobrar: no alerta cobrar: (la retención se suelta acto seguido).
    const L = operacion('cancelled'); retenido(L.op, U.id, BR, 3000, { st: 'canceled' }); const pl = pidDe(L.num);
    const capL = await cobros.cobrarOperacion(L.op);
    // (revisión de 621f214) · Si el barrido del servidor la soltó primero, ya no hay nada retenido: cobrarOperacion vuelve null y el cobro está soltado.
    ok(((capL && capL.ok === false && capL.codigo === 'canceled') || (capL === null && pago(L.num) === 'released|3000|0')) && alertas(`cobrar:${pl}`) === '0',
      `la captura tarde de una cancelada que ya no se deja cobrar: sin alerta cobrar: (${JSON.stringify(capL)} · ${pago(L.num)})`);
    await cobros.repararPagos(BR);
    ok(alertas(`cobrar:${pm}`) === '1' && pago(M.num) === 'held|3000|0', 'el aceptado con el código terminal y sin alerta: el barrido lo reintenta y la alerta cobrar: queda anotada');
    ok(pago(L.num) === 'released|3000|0', `la cancelada con la captura tarde que no salió: el barrido la suelta (${pago(L.num)})`);
    // El barrido aplicó la regla de la cancelación tarde (T, E): quien pagó y el negocio reciben el aviso con lo aplicado, una vez; sin regla (C, X), nada.
    // (revisión de 621f214) · Lo aplicó este barrido (el aviso de mentira, con lo aplicado) o el del servidor (la fila real): se mira la base.
    const avT = AV.filter((x) => x[1] === T.num), avE = AV.filter((x) => x[1] === E.num);
    ok(unAviso(T.num, 'viaje_cx', avT) && (!avT.length || (avT[0][0] === 'v' && avT[0][2].queda === 1500 && avT[0][2].dev?.e === 'hecha' && avT[0][2].dev.monto === 1500)),
      `viaje tarde ya cobrado, por el barrido: UN aviso con lo aplicado (la mitad y lo devuelto) y el reclamo anotado (${JSON.stringify(avT)} · reales ${cuantos(T.num, 'viaje_cx')})`);
    ok(unAviso(E.num, 'evp_cancelado', avE) && (!avE.length || (avE[0][0] === 'e' && avE[0][2] === 10000 && avE[0][3] === 10000)),
      `evento privado tarde ya cobrado, por el barrido: UN aviso con lo que se quedó (${JSON.stringify(avE)} · reales ${cuantos(E.num, 'evp_cancelado')})`);
    ok(!AV.some((x) => [C.num, X.num, N.num, M.num, L.num].includes(x[1])) && [C, X, N, M, L].every((x) => cuantos(x.num, 'viaje_cx') === '0'), 'sin regla aplicada (no era la cancelación tarde de quien pagó): ningún aviso');
    ok(pago(C.num) === 'captured|2500|0' && sql(`select pay_status from operations where id = ${C.op}`) === 'captured', `la que Stripe ya había cobrado queda cobrada con lo que se cobró ($25), nunca 'released' (${pago(C.num)})`);
    ok(sql(`select status from sim_intents where id = '${piC}'`) === 'succeeded', 'el simulador sigue cobrado (no se canceló lo cobrado)');
    ok(alertas(`cobrada:${pc}`) === '1' && alertas(`liberar:${pc}`) === '0' && detalle(`cobrada:${pc}`).includes('Revisa en Stripe si ese cobro correspondía'), 'UNA alerta hold_stuck cobrada:<cobro> (y ninguna liberar:)');
    ok(sql(`select count(*) from operation_events where operation_id = ${C.op} and kind = 'payment_captured' and note->>'es' like 'No se pudo soltar la retención: Stripe ya había cobrado $25 en la tarjeta%'`) === '1', 'el historial dice lo que pasó');
    ok(pago(X.num) === 'released|3000|0', `la que el simulador ya tenía cancelada: soltada (${pago(X.num)})`);
    ok(pago(T.num) === 'partially_refunded|3000|1500' && sql(`select details->>'cobroMitad' from operations where id = ${T.op}`) === '1500' && sql(`select refunded_cents from sim_intents where id = '${piT}'`) === '1500'
      && sql(`select count(*) from refunds where idem_key = 'vcx-${T.num}' and status = 'done' and amount_cents = 1500`) === '1', `viaje tarde ya cobrado, por el barrido: se queda la mitad y se devuelve el resto con la llave de la cancelación (${pago(T.num)})`);
    ok(alertas(`cobrada:${pt}`) === '1' && sinMas('Se aplicó la cancelación tarde: se quedó $15 y se devolvieron $15').test(detalle(`cobrada:${pt}`)), 'su alerta dice la regla que se aplicó y lo devuelto');
    ok(pago(E.num) === 'captured|10000|0' && sql(`select details->>'perdio' from operations where id = ${E.op}`) === 'true' && sinMas('Se aplicó la cancelación tarde: se quedó $100.').test(detalle(`cobrada:${pe}`)), 'evento privado tarde ya cobrado, por el barrido: el depósito se queda con el restaurante (perdio) y la alerta lo dice');
    ok(pago(N.num) === 'held|3000|0' && sql(`select failure_code from payments where id = ${pn}`) === 'canceled' && alertas(`cobrar:${pn}`) === '1', 'el aceptado que Stripe ya no deja cobrar: sigue retenido con su código y UNA alerta cobrar:<cobro>');
    await cobros.repararPagos(BR);
    await alertasM.cerrarAlertasResueltas();
    ok(alertas(`cobrada:${pc}`) === '1' && notas(`cobrada:${pc}`) === '0' && pago(C.num) === 'captured|2500|0', 'otro barrido: ni otra alerta ni se cierra sola; el cobro sigue igual');
    ok(sql(`select count(*) from refunds where idem_key = 'vcx-${T.num}'`) === '1' && pago(T.num) === 'partially_refunded|3000|1500', 'ni otra devolución del viaje tarde');
    ok(unAviso(T.num, 'viaje_cx', AV.filter((x) => x[1] === T.num)) && unAviso(E.num, 'evp_cancelado', AV.filter((x) => x[1] === E.num)) && notas(`cobrar:${pn}`) === '0', 'ni otro aviso; la alerta cobrar: del que sigue retenido sigue abierta');
    // El aceptado que Stripe ya no deja cobrar queda fuera del barrido: aunque el intento volviera a poder cobrarse, nadie lo reintenta solo.
    sql(`update sim_intents set status = 'requires_capture' where id = (select stripe_payment_intent from payments where id = ${pn})`);
    await cobros.repararPagos(BR);
    ok(pago(N.num) === 'held|3000|0' && alertas(`cobrar:${pn}`) === '1', 'el barrido no lo reintenta (ni abre otra alerta)');
    sql(`update sim_intents set status = 'canceled' where id = (select stripe_payment_intent from payments where id = ${pn})`);
    // (revisión de 483a3af) · La alerta cobrar: se cierra sola cuando el cobro deja de estar retenido (como liberar:): aquí, el equipo lo soltó.
    sql(`update payments set status = 'released', released_at = now() where id = ${pn}`);
    await alertasM.cerrarAlertasResueltas();
    ok(notas(`cobrar:${pn}`) === '1' && sql(`select n.action from money_alert_notes n join money_alerts a on a.id = n.alert_id where a.kind = 'hold_stuck' and a.subject_id = 'cobrar:${pn}'`) === 'resuelta_sola', 'cobrar: se cierra sola cuando el cobro ya no está retenido');

    console.log('4 · «cobrada» por relectura: el barrido ganó la carrera y aplicó la regla; la cancelación dice lo que aplicó');
    {
      // Un viaje que quien pagó canceló tarde; el barrido ya lo encontró cobrado ($30), aplicó la regla (devolvió $15 con vcx-<número>) y la cancelación, que
      // había leído el cobro retenido, dejó cobroMitad en 0. Su devolverAlCancelar (pay 'held', como lo llama la cancelación) ya no encuentra nada retenido.
      // (carrera con el barrido de cada minuto) · Cada uno se siembra ya en su estado final en UNA sola llamada a la base (una transacción): operación cancelada
      // tarde, cobro y devolución de su llave. Antes se sembraba retenido y se cambiaba después, y si el barrido de pagos (repararPagos: retenido de una cancelada
      // que Stripe ya cobró) pasaba entre las dos escrituras, aplicaba él la regla y devolverAlCancelar decía otra cosa ({"e":"cobrada","monto":1500} sin regla).
      const sembrarCobrada = (pagoSt, refSt) => {
        const num = `V-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`, pi = `pi_sim_9x_${RUN}_${num}`;
        sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, pay_mode, client_key, is_test, cancelled_by, cancel_reason, cancelled_at, pay_status)
            values ('${num}', 'trip', 'hzl', '${BR}', '${U.id}', 'cancelled', now() + interval '3 days', 120, '{"k":"asiento","cobroMitad":0}'::jsonb, 1, 3000, 3000, 'app', gen_random_uuid(), true, 'user', 'tarde', now(), 'held');
          insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', 3000, 0, 'acct_sim_${BR}', 'succeeded', 3000, 0, 'pm_sim_visa_4242', 'manual');
          insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, refunded_cents, card_brand, card_last4, held_at, captured_at, simulated)
            select id, '${U.id}', '${BR}', 'hzl', 'full', 'card', '${pi}', 3000, 3000, 0, '${pagoSt}', ${pagoSt === 'partially_refunded' ? 1500 : 0}, 'visa', '4242', now(), now(), true from operations where number = '${num}';
          insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key, done_at)
            select p.id, 1500, 'Cancelación tarde: se cobra la mitad', 'policy', '${refSt}', 'vcx-${num}', ${refSt === 'done' ? 'now()' : 'null'} from payments p join operations o on o.id = p.operation_id where o.number = '${num}'`);
        return { num, op: sql(`select id from operations where number = '${num}'`), pid: pidDe(num) };
      };
      const R = sembrarCobrada('partially_refunded', 'done'), pr = R.pid;
      const dr = await cobros.devolverAlCancelar({ id: R.op, pay: 'held', pid: pr, amount: 3000, refunded: 0 }, { actorId: U.id, motivo: 'Cancelación tarde (no se sabe si la captura salió)', idem: `vcx-${R.num}`, por: 'policy', seQueda: 0 });
      ok(dr.e === 'cobrada' && dr.regla?.queda === 1500 && dr.regla?.dev?.e === 'hecha' && dr.regla.dev.monto === 1500, `devolverAlCancelar dice la regla que aplicó el barrido: la mitad y lo devuelto (${JSON.stringify(dr)})`);
      ok(sql(`select details->>'cobroMitad' from operations where id = ${R.op}`) === '1500' && sql(`select count(*) from refunds where payment_id = ${pr}`) === '1' && pago(R.num) === 'partially_refunded|3000|1500',
        'cobroMitad vuelve a decir la mitad; nada se movió otra vez (ni otra devolución)');
      // Con la devolución todavía en camino (otro viaje igual, cobrado y con la devolución pendiente): dice «en camino». Esa devolución la termina el barrido
      // de devoluciones del servidor con el simulador (el intento está cobrado), como cualquier otra.
      const R2 = sembrarCobrada('captured', 'pending'), pr2 = R2.pid;
      const dp = await cobros.devolverAlCancelar({ id: R2.op, pay: 'held', pid: pr2, amount: 3000, refunded: 0 }, { actorId: U.id, motivo: 'x', idem: `vcx-${R2.num}`, por: 'policy', seQueda: 0 });
      ok(dp.e === 'cobrada' && dp.regla?.queda === 1500 && dp.regla?.dev?.e === 'en_camino' && dp.regla.dev.monto === 1500 && sql(`select details->>'cobroMitad' from operations where id = ${R2.op}`) === '1500',
        `con la devolución en camino: «en camino» y cobroMitad la mitad (${JSON.stringify(dp)})`);
      // (revisión de 621f214) · La segunda «cobrada» (la cancelación y el barrido la encontraron cobrada los dos): sin nada más que devolver, devolverAlCancelar
      // dice lo que pasó con la devolución de su llave (hecha · en camino), nunca «nada»; sin devolución con esa llave, «nada».
      const d2 = await cobros.devolverAlCancelar({ id: R.op, pay: 'partially_refunded', pid: pr, amount: 3000, refunded: 1500 }, { actorId: U.id, motivo: 'x', idem: `vcx-${R.num}`, por: 'policy', seQueda: 1500 });
      const d3 = await cobros.devolverAlCancelar({ id: R2.op, pay: 'captured', pid: pr2, amount: 3000, refunded: 1500 }, { actorId: U.id, motivo: 'x', idem: `vcx-${R2.num}`, por: 'policy', seQueda: 1500 });
      const d4 = await cobros.devolverAlCancelar({ id: R.op, pay: 'partially_refunded', pid: pr, amount: 3000, refunded: 1500 }, { actorId: U.id, motivo: 'x', idem: `vcx-otra-${R.num}`, por: 'policy', seQueda: 1500 });
      ok(d2.e === 'hecha' && d2.monto === 1500 && d3.e === 'en_camino' && d3.monto === 1500 && d4.e === 'nada' && sql(`select count(*) from refunds where payment_id in (${pr}, ${pr2})`) === '2',
        `sin nada más que devolver: la de su llave hecha / en camino; sin ella, «nada»; nada nuevo se pide (${JSON.stringify([d2, d3, d4])})`);
      // La devolución en camino de esta prueba se termina aquí mismo (la ejecución real de una devolución con el simulador, solo esa): nada pendiente queda en
      // la base compartida para el barrido de devoluciones del servidor.
      const rf2 = sql(`select id from refunds where idem_key = 'vcx-${R2.num}'`);
      const e2 = await cobros.ejecutarDevolucionPago(rf2);
      ok(e2.ok === true && sql(`select status from refunds where id = ${rf2}`) === 'done' && pago(R2.num) === 'partially_refunded|3000|1500' && sql(`select refunded_cents from sim_intents where id = (select stripe_payment_intent from payments where id = ${pr2})`) === '1500',
        `la devolución en camino de la prueba quedó hecha: nada pendiente (${pago(R2.num)})`);
      ok(sql(`select count(*) from refunds r join payments p on p.id = r.payment_id where p.business_id in ('${BR}', '${BV}') and r.status = 'pending'`) === '0', 'ninguna devolución pendiente de esta prueba en la base');
    }
    console.log('5 · barrerCobradasTarde: la cancelación tarde cobrada sin su regla se repara; el aviso del barrido que no quedó se reintenta (solo lo que falta)');
    {
      // Una cancelación tarde de quien pagó, en una sentencia: el cobro (libro y simulador) y la operación; hace: los minutos desde que se canceló y se cobró.
      // (revisión de efe56b9) · cobradoHace: los minutos desde que se cobró (un viaje se cobra al aceptarse, días antes de cancelarse); biz: el negocio.
      const tardeCobrada = (kind, { retenido, hace = 0, detalles, cobradoHace = hace, biz = BR }) => {
        const trip = kind === 'trip', num = trip ? numV() : numE(), cents = trip ? 3000 : 10000, pi = `pi_sim_9x_${RUN}_${num}`;
        const op = primero(sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key, is_test, cancelled_by, cancel_reason, cancelled_at, pay_status)
            values ('${num}', '${kind}', 'hzl', '${biz}', '${U.id}', 'cancelled', now() + interval '2 days', ${trip ? 120 : 180}, '${detalles}'::jsonb, ${trip ? 1 : 20}, ${trip ? 3000 : 50000}, ${trip ? 3000 : 50000}, ${trip ? 0 : 10000}, 'app', gen_random_uuid(), true, 'user', 'tarde', now() - interval '${hace} minutes', '${retenido ? 'held' : 'captured'}') returning id),
          i as (insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', ${cents}, 0, 'acct_sim_${biz}', 'succeeded', ${cents}, 0, 'pm_sim_visa_4242', 'manual')),
          p as (insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated)
            select id, '${U.id}', '${biz}', 'hzl', '${trip ? 'full' : 'deposit'}', 'card', '${pi}', ${cents}, ${cents}, 0, '${retenido ? 'held' : 'captured'}', 'visa', '4242', now() - interval '${cobradoHace} minutes', ${retenido ? 'null' : `now() - interval '${cobradoHace} minutes'`}, true from o)
          select id from o`));
        return { num, op, pid: pidDe(num) };
      };
      // El proceso murió entre «cobrada» y la regla (hace 10 minutos): el viaje quedó cobrado entero, sin la devolución de la mitad; el evento privado, con
      // perdio en false. Ni alerta ni aviso. El barrido de cada minuto del servidor también los encuentra: se mira la base.
      const DV = tardeCobrada('trip', { retenido: false, hace: 10, detalles: '{"k":"asiento","cobroMitad":0}' });
      const DE = tardeCobrada('private_event', { retenido: false, hace: 10, detalles: '{"perdio":false}' });
      // Una recién cobrada (la cancelación sigue en curso): no se toca todavía.
      const DN = tardeCobrada('trip', { retenido: false, hace: 0, detalles: '{"k":"asiento","cobroMitad":0}' });
      await cobros.barrerCobradasTarde({ negocio: BR });
      // (revisión de efe56b9) · Si el barrido de cada minuto del servidor tomó la misma fila a la vez, la devolución de la llave la pidió el primero y la
      // alerta del segundo la dice «en camino»: los dos textos son válidos, y el libro se espera hasta que la diga hecha.
      await espera(() => pago(DV.num) === 'partially_refunded|3000|1500' && sql(`select count(*) from refunds where idem_key = 'vcx-${DV.num}' and status = 'done'`) === '1');
      ok(pago(DV.num) === 'partially_refunded|3000|1500' && det(DV.num, 'cobroMitad') === '1500' && sql(`select count(*) from refunds where idem_key = 'vcx-${DV.num}' and status = 'done' and amount_cents = 1500`) === '1',
        `el viaje cobrado sin su regla: se queda la mitad y se devuelve el resto con la llave de la cancelación (${pago(DV.num)})`);
      ok(alertas(`cobrada:${DV.pid}`) === '1' && detalle(`cobrada:${DV.pid}`).includes('la cancelación tarde quedó cobrada ($30) sin aplicar su regla')
        && ['Se aplicó la cancelación tarde: se quedó $15 y se devolvieron $15', 'Se aplicó la cancelación tarde: se quedó $15 y la devolución de $15 va en camino'].some((t) => sinMas(t).test(detalle(`cobrada:${DV.pid}`))),
        `UNA alerta cobrada: que dice lo que pasó y lo aplicado (${detalle(`cobrada:${DV.pid}`)})`);
      ok(unAviso(DV.num, 'viaje_cx', AV.filter((x) => x[1] === DV.num)), `y UN aviso con lo aplicado (${JSON.stringify(AV.filter((x) => x[1] === DV.num))} · reales ${cuantos(DV.num, 'viaje_cx')})`);
      ok(pago(DE.num) === 'captured|10000|0' && det(DE.num, 'perdio') === 'true' && alertas(`cobrada:${DE.pid}`) === '1' && sinMas('Se aplicó la cancelación tarde: se quedó $100').test(detalle(`cobrada:${DE.pid}`))
        && unAviso(DE.num, 'evp_cancelado', AV.filter((x) => x[1] === DE.num)), 'el evento privado cobrado sin su regla: el depósito se queda (perdio), su alerta y su aviso');
      ok(pago(DN.num) === 'captured|3000|0' && alertas(`cobrada:${DN.pid}`) === '0' && sql(`select count(*) from refunds where idem_key = 'vcx-${DN.num}'`) === '0', 'la recién cobrada (la cancelación en curso) no se toca');
      await cobros.barrerCobradasTarde({ negocio: BR });
      ok(sql(`select count(*) from refunds where idem_key = 'vcx-${DV.num}'`) === '1' && alertas(`cobrada:${DV.pid}`) === '1' && unAviso(DV.num, 'viaje_cx', AV.filter((x) => x[1] === DV.num)) && unAviso(DE.num, 'evp_cancelado', AV.filter((x) => x[1] === DE.num)),
        'otra pasada: ni otra devolución, ni otra alerta, ni otro aviso');
      // DN no se queda cobrada entera en la base compartida: su devolución también sale (la regla, con su llave).
      sql(`update operations set cancelled_at = now() - interval '10 minutes' where id = ${DN.op}`); sql(`update payments set captured_at = now() - interval '10 minutes' where id = ${DN.pid}`);
      await cobros.barrerCobradasTarde({ negocio: BR });
      ok(pago(DN.num) === 'partially_refunded|3000|1500' && sql(`select count(*) from refunds where idem_key = 'vcx-${DN.num}' and status = 'done'`) === '1', `pasados los 5 minutos, también se repara (${pago(DN.num)})`);

      // M4 · El aviso del barrido que NO quedó (avisos › avisar dice que no): el reclamo vuelve, la alerta lo dice y el reintento manda solo lo que falta. La
      // siembra y la acción, juntas (el barrido de pagos del servidor no alcanza a soltarla antes).
      const F = tardeCobrada('trip', { retenido: true, detalles: '{"k":"asiento","cobroMitad":0}' });
      FALLA.add(F.num);
      const sF = await cobros.soltarRetencion(F.op, cobros.SWEEP);
      ok(sF.e === 'cobrada' && sF.regla?.queda === 1500 && det(F.num, 'avisoCobro') === 'false' && sql(`select details->'avisoCobroFalta' from operations where id = ${F.op}`) === '["cli"]' && det(F.num, 'avisoCobroIntentos') === '1',
        `el aviso a quien pagó no quedó: el reclamo vuelve (avisoCobro false) con lo que falta (cli) y su intento (${sql(`select details from operations where id = ${F.op}`)})`);
      ok(detalle(`cobrada:${F.pid}`).includes('El aviso con lo aplicado NO le llegó a quien pagó: el barrido lo vuelve a mandar') && sql(`select detail->>'en' from money_alerts where kind = 'hold_stuck' and subject_id = 'cobrada:${F.pid}'`).includes('did NOT reach the payer'),
        'la alerta cobrada: dice (ES/EN) que el aviso no le llegó a quien pagó');
      // (revisión de efe56b9) · La alerta no pide «díselo tú» sin saberlo: remite a la alerta aviso:, que se abre solo si se agotan los reintentos.
      ok(!/díselo tú/i.test(detalle(`cobrada:${F.pid}`)) && detalle(`cobrada:${F.pid}`).includes(`si no llega, se abre la alerta aviso:${F.pid}.`), 'la alerta cobrada: remite a la alerta aviso: (no dice «díselo tú»)');
      // El reintento espera (AVISO_TARDE_ESPERA_MIN: el primero, 1 minuto): enseguida no sale; con el reclamo de hace 2 minutos, sí.
      await cobros.barrerCobradasTarde({ negocio: BR });
      ok(AV.filter((x) => x[1] === F.num).length === 1 || cuantos(F.num, 'viaje_cx') !== '0', `el reintento espera su minuto (${AV.filter((x) => x[1] === F.num).length} avisos de mentira)`);
      sql(`update operations set details = details || jsonb_build_object('avisoCobroAt', now() - interval '2 minutes') where id = ${F.op} and coalesce((details->>'avisoCobro')::boolean, false) = false`);
      await cobros.barrerCobradasTarde({ negocio: BR });
      const avF = AV.filter((x) => x[1] === F.num);
      ok(det(F.num, 'avisoCobro') === 'true' && sql(`select (details ? 'avisoCobroFalta')::text from operations where id = ${F.op}`) === 'false'
        && ((avF.length === 2 && avF[1][3].cli === true && avF[1][3].neg === false && cuantos(F.num, 'viaje_cx') === '0') || (avF.length === 1 && cuantos(F.num, 'viaje_cx') === '1' && cuantos(F.num, 'biz_viaje_cx') === '0')),
        `el reintento mandó solo el de quien pagó (no otra vez el del negocio) y ya no queda nada pendiente (${JSON.stringify(avF.map((x) => x[3]))} · reales ${cuantos(F.num, 'viaje_cx')}/${cuantos(F.num, 'biz_viaje_cx')})`);
      const nF = AV.filter((x) => x[1] === F.num).length;
      await cobros.barrerCobradasTarde({ negocio: BR });
      ok(AV.filter((x) => x[1] === F.num).length === nF && cuantos(F.num, 'viaje_cx') === String(nF === 2 ? 0 : 1), 'otra pasada: ningún aviso más');

      // H4 (revisión de efe56b9) · El aviso que nunca queda: agotados los reintentos, la alerta propia aviso:<cobro> (dice a quién no le llegó y remite a
      // cobrada:); el barrido ya no lo manda. Los cuatro primeros reintentos se dan por hechos (avisoCobroIntentos 5, con su espera cumplida).
      const G = tardeCobrada('trip', { retenido: true, detalles: '{"k":"asiento","cobroMitad":0}' });
      FALLA_SIEMPRE.add(G.num);
      await cobros.soltarRetencion(G.op, cobros.SWEEP);
      sql(`update operations set details = details || jsonb_build_object('avisoCobroIntentos', ${cobros.AVISO_TARDE_INTENTOS}, 'avisoCobroAt', now() - interval '5 hours') where id = ${G.op} and details ? 'avisoCobroFalta' and coalesce((details->>'avisoCobro')::boolean, false) = false`);
      await cobros.barrerCobradasTarde({ negocio: BR });
      // (revisión de ae940a7) · Sin escape: el reintento lo hizo esta pasada (el aviso de mentira que falla), nunca el servidor (ningún aviso real).
      ok(alertas(`aviso:${G.pid}`) === '1' && det(G.num, 'avisoCobroIntentos') === String(cobros.AVISO_TARDE_INTENTOS + 1) && cuantos(G.num, 'viaje_cx') === '0'
        && detalle(`aviso:${G.pid}`).includes(`no le llegó a quien pagó después de ${cobros.AVISO_TARDE_INTENTOS} reintentos`) && detalle(`aviso:${G.pid}`).includes(`cobrada:${G.pid}`)
        && sql(`select detail->>'en' from money_alerts where kind = 'hold_stuck' and subject_id = 'aviso:${G.pid}'`).includes('did not reach the payer'),
        `agotado: UNA alerta aviso: que dice (ES/EN) a quién no le llegó y remite a cobrada: (${detalle(`aviso:${G.pid}`)} · intentos ${det(G.num, 'avisoCobroIntentos')})`);
      const nG = AV.filter((x) => x[1] === G.num).length;
      sql(`update operations set details = details || jsonb_build_object('avisoCobroAt', now() - interval '5 hours') where id = ${G.op}`);
      await cobros.barrerCobradasTarde({ negocio: BR });
      ok(AV.filter((x) => x[1] === G.num).length === nG && alertas(`aviso:${G.pid}`) === '1' && cuantos(G.num, 'viaje_cx') === '0', 'agotado: el barrido ya no lo manda ni abre otra alerta');
      FALLA_SIEMPRE.delete(G.num);

      // (revisión de ae940a7) · A medias DESPUÉS de empezar la regla (reglaCobradaAt): la mitad ya devuelta con su llave, sin aviso ni alerta cobrada: (el
      // proceso murió ahí). Se siembra reciente y se envejece justo antes de la pasada. El barrido la completa: ni otra devolución, el aviso y la alerta.
      // Y la misma sin la marca (una cancelación de antes, o la normal que no pasó por la regla de lo cobrado): no se toca.
      const envejecer = (x, min = 10) => sql(`with o as (update operations set cancelled_at = now() - make_interval(mins => ${min}),
          details = case when details ? 'reglaCobradaAt' then details || jsonb_build_object('reglaCobradaAt', now() - make_interval(mins => ${min})) else details end where id = ${x.op} returning id)
        update payments set captured_at = now() - make_interval(mins => ${min}), held_at = now() - make_interval(mins => ${min}) where id = ${x.pid}`);
      const aMedias = (marca) => {
        const x = tardeCobrada('trip', { retenido: false, hace: 0, detalles: JSON.stringify({ k: 'asiento', cobroMitad: 1500, ...(marca ? { reglaCobradaAt: new Date().toISOString() } : {}) }) });
        sql(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key, done_at) values (${x.pid}, 1500, 'Cancelación tarde: se cobra la mitad', 'policy', 'done', 'vcx-${x.num}', now())`);
        sql(`update payments set status = 'partially_refunded', refunded_cents = 1500 where id = ${x.pid}`);
        sql(`update sim_intents set refunded_cents = 1500 where id = (select stripe_payment_intent from payments where id = ${x.pid})`);
        return x;
      };
      const M3 = aMedias(true), M0 = aMedias(false);
      envejecer(M3); envejecer(M0);
      await cobros.barrerCobradasTarde({ negocio: BR });
      const avM3 = AV.filter((x) => x[1] === M3.num);
      ok(sql(`select count(*) from refunds where idem_key = 'vcx-${M3.num}'`) === '1' && pago(M3.num) === 'partially_refunded|3000|1500' && det(M3.num, 'cobroMitad') === '1500'
        && avM3.length === 1 && avM3[0][2].queda === 1500 && avM3[0][2].dev?.e === 'hecha' && det(M3.num, 'avisoCobro') === 'true'
        && alertas(`cobrada:${M3.pid}`) === '1' && detalle(`cobrada:${M3.pid}`).includes('la cancelación tarde quedó a medias') && sinMas('se quedó $15 y se devolvieron $15').test(detalle(`cobrada:${M3.pid}`)),
        `a medias después de la regla: se completa (el aviso con lo aplicado y la alerta), sin otra devolución (${JSON.stringify(avM3.map((x) => x[2]))} · ${detalle(`cobrada:${M3.pid}`)})`);
      ok(alertas(`cobrada:${M0.pid}`) === '0' && !AV.some((x) => x[1] === M0.num) && det(M0.num, 'avisoCobro') === '', 'la misma sin la marca de la regla: no se toca (ni aviso ni alerta)');
      await cobros.barrerCobradasTarde({ negocio: BR });
      ok(AV.filter((x) => x[1] === M3.num).length === 1 && alertas(`cobrada:${M3.pid}`) === '1' && sql(`select count(*) from refunds where idem_key = 'vcx-${M3.num}'`) === '1', 'otra pasada: nada más');

      // (revisión de 90170a1) · A medias con la marca y SIN ninguna devolución todavía (murió justo después de la marca): la regla se aplica de verdad, UNA
      // devolución con la llave de la cancelación. Y con la devolución de su llave ya FALLIDA (Stripe la rechazó: su fila se renombra «vcx-<número>~fallida-<id>»
      // y la tiene el equipo en su alerta): ninguna fila nueva en refunds, el simulador sin devolver nada, y la alerta dice que no salió.
      const conMarca = () => tardeCobrada('trip', { retenido: false, hace: 0, detalles: JSON.stringify({ k: 'asiento', cobroMitad: 1500, reglaCobradaAt: new Date().toISOString() }) });
      const MS = conMarca(), MF = conMarca();
      sql(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key, last_error) values (${MF.pid}, 1500, 'Cancelación tarde: se cobra la mitad', 'policy', 'failed', 'vcx-${MF.num}~fallida-1', 'stripe:expired_or_canceled_card')`);
      envejecer(MS); envejecer(MF);
      await cobros.barrerCobradasTarde({ negocio: BR });
      await espera(() => pago(MS.num) === 'partially_refunded|3000|1500');
      ok(sql(`select count(*) from refunds where payment_id = ${MS.pid}`) === '1' && sql(`select count(*) from refunds where idem_key = 'vcx-${MS.num}' and status = 'done' and amount_cents = 1500`) === '1' && pago(MS.num) === 'partially_refunded|3000|1500'
        && detalle(`cobrada:${MS.pid}`).includes('quedó a medias') && detalle(`cobrada:${MS.pid}`).includes('Se completó.') && sinMas('se devolvieron $15').test(detalle(`cobrada:${MS.pid}`)),
        `a medias sin ninguna devolución: la regla se aplica de verdad, UNA devolución (${pago(MS.num)} · ${detalle(`cobrada:${MS.pid}`)})`);
      const avMF = AV.filter((x) => x[1] === MF.num);
      ok(sql(`select count(*) from refunds where payment_id = ${MF.pid}`) === '1' && pago(MF.num) === 'captured|3000|0' && sql(`select refunded_cents from sim_intents where id = (select stripe_payment_intent from payments where id = ${MF.pid})`) === '0'
        && detalle(`cobrada:${MF.pid}`).includes('y la devolución de $15 no salió (tiene su propia alerta)') && avMF.length === 1 && avMF[0][2].dev?.e === 'fallida',
        `a medias con la devolución fallida: ninguna fila nueva en refunds ni devolución en Stripe; la alerta y el aviso dicen que no salió (${pago(MF.num)} · ${detalle(`cobrada:${MF.pid}`)})`);
      await cobros.barrerCobradasTarde({ negocio: BR });
      ok(sql(`select count(*) from refunds where payment_id in (${MS.pid}, ${MF.pid})`) === '2' && alertas(`cobrada:${MS.pid}`) === '1' && alertas(`cobrada:${MF.pid}`) === '1', 'otra pasada: ni otra devolución ni otra alerta');

      // (revisión de 51a794d) · La devolución de la llave que no se pudo ni anotar (refund_stuck cancelacion:vcx-<número>, sin fila en refunds): la regla
      // (soltar: reglaTardeConLoCobrado) y su relectura («completar»: reglaTardeLeida) la dicen «no salió» con lo que faltaba, sin pedir otra.
      const atascar = (x) => alertasM.alertar('refund_stuck', `cancelacion:vcx-${x.num}`, { monto: 1500, negocio: BR, ciudad: 'hzl', detalle: { es: `${x.num}: la devolución de $15 no se pudo anotar (prueba din9x).`, en: `${x.num}: the $15 refund could not be recorded (din9x test).` } });
      const devueltoSim = (x) => sql(`select refunded_cents from sim_intents where id = (select stripe_payment_intent from payments where id = ${x.pid})`);
      const RS = tardeCobrada('trip', { retenido: true, detalles: '{"k":"asiento","cobroMitad":0}' });
      await atascar(RS);
      const sRS = await cobros.soltarRetencion(RS.op, cobros.SWEEP), avRS = AV.filter((x) => x[1] === RS.num);
      ok(sRS.e === 'cobrada' && sRS.regla?.queda === 1500 && sRS.regla?.dev?.e === 'fallida' && sRS.regla?.dev?.monto === 1500 && sql(`select count(*) from refunds where payment_id = ${RS.pid}`) === '0'
        && pago(RS.num) === 'captured|3000|0' && devueltoSim(RS) === '0' && detalle(`cobrada:${RS.pid}`).includes('se quedó $15 y la devolución de $15 no salió (tiene su propia alerta)')
        && avRS.length === 1 && avRS[0][2].dev?.e === 'fallida' && avRS[0][2].dev?.monto === 1500,
        `la regla con la devolución que no se pudo anotar: ninguna fila en refunds ni devolución en Stripe; la alerta y el aviso dicen que no salió (${JSON.stringify(sRS.regla)} · ${detalle(`cobrada:${RS.pid}`)})`);
      const RL = conMarca();
      await atascar(RL);
      envejecer(RL);
      await cobros.barrerCobradasTarde({ negocio: BR });
      const avRL = AV.filter((x) => x[1] === RL.num);
      ok(sql(`select count(*) from refunds where payment_id = ${RL.pid}`) === '0' && pago(RL.num) === 'captured|3000|0' && devueltoSim(RL) === '0'
        && detalle(`cobrada:${RL.pid}`).includes('quedó a medias') && detalle(`cobrada:${RL.pid}`).includes('se quedó $15 y la devolución de $15 no salió (tiene su propia alerta)')
        && avRL.length === 1 && avRL[0][2].dev?.e === 'fallida' && avRL[0][2].dev?.monto === 1500,
        `«completar» con la devolución que no se pudo anotar: la lee (ninguna fila en refunds) y dice que no salió (${detalle(`cobrada:${RL.pid}`)})`);
      // Y la que el equipo ya devolvió a mano (su propia devolución, con otra llave): sin nada más que devolver, «hecha» con lo devuelto, nunca «no salió»
      // ni «$0». Sin fila de la llave (refund_stuck) y con la fila de la llave fallida.
      const aMano = (x) => {
        sql(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key, done_at) values (${x.pid}, 1500, 'Devuelta a mano por el equipo (prueba din9x)', 'admin', 'done', 'mano-${x.num}', now())`);
        sql(`update payments set status = 'partially_refunded', refunded_cents = 1500 where id = ${x.pid}`);
        sql(`update sim_intents set refunded_cents = 1500 where id = (select stripe_payment_intent from payments where id = ${x.pid})`);
      };
      const HS = conMarca(), HF = conMarca();
      await atascar(HS); aMano(HS);
      sql(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key, last_error) values (${HF.pid}, 1500, 'Cancelación tarde: se cobra la mitad', 'policy', 'failed', 'vcx-${HF.num}~fallida-1', 'stripe:expired_or_canceled_card')`); aMano(HF);
      envejecer(HS); envejecer(HF);
      await cobros.barrerCobradasTarde({ negocio: BR });
      for (const x of [HS, HF]) {
        const d = detalle(`cobrada:${x.pid}`), av = AV.filter((y) => y[1] === x.num);
        ok(sinMas('se quedó $15 y se devolvieron $15').test(d) && !d.includes('no salió') && !sinMas('$0').test(d) && av.length === 1 && av[0][2].dev?.e === 'hecha' && av[0][2].dev?.monto === 1500
          && sql(`select count(*) from refunds where payment_id = ${x.pid} and split_part(idem_key, '~fallida-', 1) = 'vcx-${x.num}' and status <> 'failed'`) === '0' && pago(x.num) === 'partially_refunded|3000|1500',
          `${x === HS ? 'sin fila (refund_stuck)' : 'con la fila fallida'} y ya devuelta a mano: «hecha», ni «no salió» ni «$0», sin pedir otra (${d} · ${JSON.stringify(av.map((y) => y[2].dev))})`);
      }

      // (revisión de 51a794d) · «completar» sin regla: la regla LANZA (una base que no deja leerla, solo para estas operaciones: FALLA_REGLA; y alertas que
      // no se anotan a pedido: FALLA_AL). Los primeros intentos se dan por hechos (reglaCompletarIntentos), como en H4.
      const FALLA_REGLA = new Set(), FALLA_AL = new Set();
      const DR = { ...D, db: () => { const x = D.db(); return { query: (q, a) => (FALLA_REGLA.has(String(a?.[0])) && /^\s*select o\.kind, o\.number as num, o\.status as st,/.test(q) ? Promise.reject(new Error('la base no dejó leer la regla')) : x.query(q, a)) }; } };
      const alertasR = { ...alertasM, alertar: (k, suj, x) => (FALLA_AL.has(suj) ? Promise.reject(new Error('la base no anotó la alerta')) : alertasM.alertar(k, suj, x)) };
      const cobrosR = cargar('apps/web/lib/cobros.ts', { './db': DR, './pagos/pasarela': PS, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertasR,
        './viajes': viajesM, './evento-privado': evpM, './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC,
        './mercado': { repararMercado: async () => undefined }, './apartados': { repararApartados: async () => undefined }, './estimados': { repararEstimados: async () => undefined } });
      const intentos = (x, k) => sql(`update operations set details = details || jsonb_build_object('reglaCompletarIntentos', ${k}) where id = ${x.op}`);
      const sinDinero = (x) => sql(`select count(*) from refunds where payment_id = ${x.pid}`) === '0' && pago(x.num) === 'captured|3000|0' && !AV.some((y) => y[1] === x.num) && det(x.num, 'avisoCobro') === '';
      const enIngles = (suj) => sql(`select detail->>'en' from money_alerts where kind = 'hold_stuck' and subject_id = '${suj}'`);
      // El tope sin alerta previa: bajo el tope, nada (el barrido lo vuelve a intentar); al tope, «No se pudo completar» en SU alerta cobrada:; después, nada.
      const TA = conMarca(); intentos(TA, cobrosR.COMPLETAR_INTENTOS - 2); FALLA_REGLA.add(TA.op); envejecer(TA);
      await cobrosR.barrerCobradasTarde({ negocio: BR });
      ok(det(TA.num, 'reglaCompletarIntentos') === String(cobrosR.COMPLETAR_INTENTOS - 1) && alertas(`cobrada:${TA.pid}`) === '0' && alertas(`completar:${TA.pid}`) === '0' && sinDinero(TA),
        `«completar» sin regla bajo el tope: ni alerta, ni dinero, ni aviso; el barrido lo vuelve a intentar (intento ${det(TA.num, 'reglaCompletarIntentos')})`);
      await cobrosR.barrerCobradasTarde({ negocio: BR });
      ok(det(TA.num, 'reglaCompletarIntentos') === String(cobrosR.COMPLETAR_INTENTOS) && alertas(`cobrada:${TA.pid}`) === '1' && detalle(`cobrada:${TA.pid}`).includes('quedó a medias')
        && detalle(`cobrada:${TA.pid}`).includes('No se pudo completar: aplícala a mano') && !detalle(`cobrada:${TA.pid}`).includes('Se completó') && enIngles(`cobrada:${TA.pid}`).includes('It could not be completed: apply it by hand')
        && alertas(`completar:${TA.pid}`) === '0' && sinDinero(TA),
        `al tope: «No se pudo completar» en su alerta cobrada: (ES/EN), nunca «Se completó»; sin alerta completar: de más (${detalle(`cobrada:${TA.pid}`)})`);
      await cobrosR.barrerCobradasTarde({ negocio: BR });
      ok(det(TA.num, 'reglaCompletarIntentos') === String(cobrosR.COMPLETAR_INTENTOS) && alertas(`cobrada:${TA.pid}`) === '1' && alertas(`completar:${TA.pid}`) === '0', 'otra pasada al tope: el barrido ya no la elige');
      // El caso de la revisión: la alerta cobrada: YA estaba (la anotó el proceso que se cortó antes del aviso) y nadie reclamó el aviso. Al tope, alertar no
      // la reescribe: su alerta propia completar:<cobro> dice que no se pudo completar y que ni quien pagó ni el negocio tienen el aviso.
      const previa = (x) => alertasM.alertar('hold_stuck', `cobrada:${x.pid}`, { monto: 3000, negocio: BR, ciudad: 'hzl', detalle: { es: `${x.num}: la alerta de antes (la anotó el proceso que se cortó).`, en: `${x.num}: the earlier alert.` } });
      const TB = conMarca(); await previa(TB); intentos(TB, cobrosR.COMPLETAR_INTENTOS - 1); FALLA_REGLA.add(TB.op); envejecer(TB);
      await cobrosR.barrerCobradasTarde({ negocio: BR });
      ok(det(TB.num, 'reglaCompletarIntentos') === String(cobrosR.COMPLETAR_INTENTOS) && alertas(`cobrada:${TB.pid}`) === '1' && detalle(`cobrada:${TB.pid}`).includes('la alerta de antes')
        && alertas(`completar:${TB.pid}`) === '1' && detalle(`completar:${TB.pid}`).includes(`No se pudo completar después de ${cobrosR.COMPLETAR_INTENTOS} pasadas del barrido y nadie mandó su aviso`)
        && detalle(`completar:${TB.pid}`).includes(`la alerta cobrada:${TB.pid} ya estaba abierta`) && detalle(`completar:${TB.pid}`).includes('díselo a quien pagó y al negocio')
        && enIngles(`completar:${TB.pid}`).includes(`It could not be completed after ${cobrosR.COMPLETAR_INTENTOS} sweep passes`) && sinDinero(TB),
        `al tope con la alerta cobrada: ya abierta: UNA alerta completar: (ES/EN) que lo dice, sin tocar la de antes ni el dinero (${detalle(`completar:${TB.pid}`)})`);
      await cobrosR.barrerCobradasTarde({ negocio: BR });
      ok(alertas(`completar:${TB.pid}`) === '1' && alertas(`cobrada:${TB.pid}`) === '1' && det(TB.num, 'reglaCompletarIntentos') === String(cobrosR.COMPLETAR_INTENTOS), 'otra pasada: ni otra alerta');
      // Y si la alerta completar: no se anota: el tope vuelve un paso atrás y la próxima pasada la anota (nunca en silencio).
      const TC = conMarca(); await previa(TC); intentos(TC, cobrosR.COMPLETAR_INTENTOS - 1); FALLA_REGLA.add(TC.op); FALLA_AL.add(`completar:${TC.pid}`); envejecer(TC);
      await cobrosR.barrerCobradasTarde({ negocio: BR });
      ok(alertas(`completar:${TC.pid}`) === '0' && det(TC.num, 'reglaCompletarIntentos') === String(cobrosR.COMPLETAR_INTENTOS - 1) && sinDinero(TC),
        `la alerta completar: que no se anotó: el tope vuelve un paso atrás (${det(TC.num, 'reglaCompletarIntentos')})`);
      FALLA_AL.delete(`completar:${TC.pid}`);
      await cobrosR.barrerCobradasTarde({ negocio: BR });
      ok(alertas(`completar:${TC.pid}`) === '1' && det(TC.num, 'reglaCompletarIntentos') === String(cobrosR.COMPLETAR_INTENTOS) && sinDinero(TC), 'la pasada siguiente la anota');
      FALLA_REGLA.clear();

      // H2 (revisión de efe56b9) · Un viaje cobrado hace 3 días (al aceptarse) y cancelado tarde hace 10 minutos, con la devolución sin hacer: la ventana es la
      // de la cancelación (antes, la de captured_at de dos días: nunca lo veía).
      const D3 = tardeCobrada('trip', { retenido: false, hace: 10, cobradoHace: 3 * 24 * 60, detalles: '{"k":"asiento","cobroMitad":0}' });
      await cobros.barrerCobradasTarde({ negocio: BR });
      await espera(() => pago(D3.num) === 'partially_refunded|3000|1500' && sql(`select count(*) from refunds where idem_key = 'vcx-${D3.num}' and status = 'done'`) === '1');
      ok(pago(D3.num) === 'partially_refunded|3000|1500' && det(D3.num, 'cobroMitad') === '1500' && sql(`select count(*) from refunds where idem_key = 'vcx-${D3.num}' and status = 'done' and amount_cents = 1500`) === '1' && alertas(`cobrada:${D3.pid}`) === '1',
        `cobrado hace 3 días y cancelado tarde ahora: el barrido lo repara (la mitad, la devolución del resto y su alerta) (${pago(D3.num)})`);
      // Y la que salió de la ventana sin repararse (cancelada hace 8 días): no se repara sola, abre UNA alerta reparar:<cobro> (nunca en silencio).
      const D8 = tardeCobrada('trip', { retenido: false, hace: 8 * 24 * 60, detalles: '{"k":"asiento","cobroMitad":0}' });
      await cobros.barrerCobradasTarde({ negocio: BR });
      await cobros.barrerCobradasTarde({ negocio: BR });
      ok(alertas(`reparar:${D8.pid}`) === '1' && detalle(`reparar:${D8.pid}`).includes('lleva más de 7 días así: el barrido ya no la repara') && pago(D8.num) === 'captured|3000|0'
        && sql(`select count(*) from refunds where idem_key = 'vcx-${D8.num}'`) === '0' && alertas(`cobrada:${D8.pid}`) === '0', `fuera de la ventana: UNA alerta reparar: y nada se mueve solo (${detalle(`reparar:${D8.pid}`)})`);

      console.log('6 · H1: el aviso que quedó no se repite (los avisos reales: el SMS que falla después, el dueño que ya lo tiene)');
      {
        // lib/avisos.ts REAL: la base de verdad (salvo el aviso del dueño que «falla»: su fila no se anota), el SMS que siempre falla al salir, sin push.
        // La base de verdad, salvo: la fila del aviso del dueño que «falla» (FALLA_U) y anotar el SMS en su aviso (lo único que lanza después de la fila:
        // lib/sms › enviarSms nunca lanza). lib/sms de mentira: cuenta los SMS pedidos y contesta como el de verdad cuando no pudo ni anotarlo (null).
        const SMSF = { n: 0 }, FALLA_U = new Set();
        const DF = { ...D, db: () => { const x = D.db(); return { query: (q, a) => (FALLA_U.has(a?.[0]) && /^\s*with k as \(insert into notif_once/.test(q) ? Promise.reject(new Error('la base no anotó el aviso'))
          : /^update notifications set sms_id/.test(q) ? Promise.reject(new Error('la base no anotó el SMS en su aviso')) : x.query(q, a)) }; } };
        // El push: el destino de verdad usa su parámetro de canales ($3); sin canales encendidos, ningún teléfono (el stub sin el parámetro rompía la consulta).
        const avisosR = cargar('apps/web/lib/avisos.ts', { './db': DF, './entorno': { MODO_SMS: 'pruebas' }, './sms': { enviarSms: async () => { SMSF.n++; return null; } },
          './push/cola': { canales: async () => [], destino: (u, app, can) => `t.user_id = ${u} and t.app = ${app} and t.provider = any(${can})`, encolar: async () => 0, estadoPushSql: () => `'no'` },
          './cifrado': { huella: (t) => crypto.createHash('sha256').update(String(t)).digest('hex'), cifrar: (t) => t }, './devolucion-cancelar': {} });
        // Un aviso con SMS siempre (crit, sin push): la fila queda, el SMS se pide y anotarlo en su aviso falla después → quedó (true), una fila, y su estado
        // no pasa a «fallo» (el SMS pudo haber salido: lo dice sms_outbox).
        const P1 = persona('Aviso SMS'), refP = `H1-${RUN}`;
        const r1 = await avisosR.avisar(P1.id, 'cuenta_tel_cambio', { ultimos: '0000' }, { ref: ['trip', refP] });
        const filaP = () => sql(`select count(*) || '|' || coalesce(max(sms_status), '') from notifications where user_id = '${P1.id}' and tpl = 'cuenta_tel_cambio' and ref_id = '${refP}'`);
        ok(r1 === true && SMSF.n === 1 && filaP() === '1|pruebas', `la fila quedó y anotar el SMS falló después: avisar dice que quedó, una fila, sin «fallo» (${r1} · ${filaP()} · ${SMSF.n} SMS)`);
        // unaVez: el mismo aviso con su llave dos veces, una fila (la segunda dice que quedó: ya lo tenía).
        const kP = `prueba-una-vez:${RUN}`, rA = await avisosR.avisar(P1.id, 'cuenta_tel_cambio', { ultimos: '0001' }, { ref: ['trip', `${refP}-u`], unaVez: kP }), rB = await avisosR.avisar(P1.id, 'cuenta_tel_cambio', { ultimos: '0001' }, { ref: ['trip', `${refP}-u`], unaVez: kP });
        ok(rA === true && rB === true && sql(`select count(*) from notifications where user_id = '${P1.id}' and ref_id = '${refP}-u'`) === '1' && sql(`select count(*) from notif_once where key = '${kP}:${P1.id}'`) === '1',
          'unaVez: la marca y la fila en la misma sentencia; la segunda vez no anota otra fila y dice que quedó');
        // El barrido con esos avisos: quien pagó (el SMS falla) y los dos dueños del negocio (el segundo, la primera vez, no queda).
        const BH = `d9xh-${RUN}`; negocio(BH, `Van avisos ${RUN}`); const DUENO2 = persona('Dueño dos');
        sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${BH}', '${DUENO2.id}', 'owner', 'Dueño dos')`);
        const viajesH = { avisarViajeTardeCobrado: async (num, regla, partes = { cli: true, neg: true }) => ({
          cli: !partes.cli || (await avisosR.avisar(U.id, 'cuenta_tel_cambio', { ultimos: '0000' }, { ref: ['trip', num], unaVez: `cobrada:prueba-cli:${num}` })) !== false,
          neg: !partes.neg || (await avisosR.avisarNegocio(BH, 'cuenta_tel_cambio', { ultimos: '0000' }, { ref: ['trip', num], unaVez: `cobrada:prueba:${num}` })) !== false }) };
        const cobrosH = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': PS, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertasM,
          './viajes': viajesH, './evento-privado': evpM, './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC,
          './mercado': { repararMercado: async () => undefined }, './apartados': { repararApartados: async () => undefined }, './estimados': { repararEstimados: async () => undefined } });
        // Reciente al sembrarla (el barrido del servidor no la toma: cobro y cancelación de menos de 5 minutos) y envejecida justo antes de la pasada.
        const H = tardeCobrada('trip', { retenido: false, hace: 0, biz: BH, detalles: '{"k":"asiento","cobroMitad":0}' });
        const de = (uid) => sql(`select count(*) from notifications where user_id = '${uid}' and tpl = 'cuenta_tel_cambio' and ref_id = '${H.num}'`);
        FALLA_U.add(DUENO2.id);
        envejecer(H);
        await cobrosH.barrerCobradasTarde({ negocio: BH });
        ok(cuantos(H.num, 'viaje_cx') === '0' && de(U.id) === '1' && de(DUENA.id) === '1' && de(DUENO2.id) === '0' && sql(`select details->'avisoCobroFalta' from operations where id = ${H.op}`) === '["neg"]',
          `quien pagó tiene su aviso (anotar su SMS falló: igual quedó, no falta); la dueña también; falta solo el del dueño que no quedó (${de(U.id)}/${de(DUENA.id)}/${de(DUENO2.id)} · ${sql(`select details from operations where id = ${H.op}`)})`);
        FALLA_U.delete(DUENO2.id);
        sql(`update operations set details = details || jsonb_build_object('avisoCobroAt', now() - interval '2 minutes') where id = ${H.op} and coalesce((details->>'avisoCobro')::boolean, false) = false`);
        await cobrosH.barrerCobradasTarde({ negocio: BH });
        await cobrosH.barrerCobradasTarde({ negocio: BH });
        ok(cuantos(H.num, 'viaje_cx') === '0' && de(U.id) === '1' && de(DUENA.id) === '1' && de(DUENO2.id) === '1' && sql(`select (details ? 'avisoCobroFalta')::text from operations where id = ${H.op}`) === 'false'
          && sql(`select count(*) from notif_once where key in ('cobrada:prueba:${H.num}:${DUENA.id}', 'cobrada:prueba:${H.num}:${DUENO2.id}', 'cobrada:prueba-cli:${H.num}:${U.id}')`) === '3',
          `el reintento le llegó solo al dueño que faltaba: ni quien pagó (su SMS falló) ni la dueña lo reciben otra vez (${de(U.id)}/${de(DUENA.id)}/${de(DUENO2.id)})`);
      }
    }

    // La pasarela real ante Stripe: unexpected_state se mira.
    ST.estado = 'succeeded'; const l1 = await PM.pasarela.liberar('pi_9x_mentira');
    ST.estado = 'canceled'; const l2 = await PM.pasarela.liberar('pi_9x_mentira');
    ST.estado = null; const l3 = await PM.pasarela.liberar('pi_9x_mentira');
    ok(l1.ok === false && l1.cobrado === 2500 && l2.ok === true && l3.ok === false && l3.cobrado === undefined, `liberar ante unexpected_state: cobrado → { cobrado: 2500 } · cancelado → soltada · sin respuesta → no (${JSON.stringify([l1, l2, l3])})`);
    ST.estado = 'canceled'; const c1 = await PM.pasarela.cobrar('pi_9x_mentira', 2500, 0);
    ST.estado = 'succeeded'; const c2 = await PM.pasarela.cobrar('pi_9x_mentira', 2500, 0);
    ok(c1.ok === false && c1.codigo === 'canceled' && c2.ok === true && c2.cobrado === 2500, `cobrar ante unexpected_state: cancelado → no se cobró · cobrado → cobrado con lo que Stripe capturó (${JSON.stringify([c1, c2])})`);
    // El simulador: cobrar lo ya capturado no reescribe lo capturado ni la comisión.
    const piS = `pi_sim_9x_${RUN}_ya`;
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${piS}', 3000, 0, 'acct_sim_${BR}', 'succeeded', 2000, 0, 'pm_sim_visa_4242', 'manual')`);
    const c3 = await PS.pasarela.cobrar(piS, 3000, 300);
    ok(c3.ok === true && c3.cobrado === 2000 && sql(`select captured_cents || '|' || fee_cents from sim_intents where id = '${piS}'`) === '2000|0', `el simulador ante lo ya capturado: vuelve con lo capturado y no lo reescribe (${JSON.stringify(c3)})`);
    ok(cobros.capturaSinRespuesta({ ok: false, codigo: 'red' }) && cobros.capturaSinRespuesta({ ok: false, codigo: 'api_error' }) && !cobros.capturaSinRespuesta({ ok: false, codigo: 'canceled' }) && !cobros.capturaSinRespuesta({ ok: true }) && !cobros.capturaSinRespuesta(null),
      'capturaSinRespuesta: la red y el error de Stripe sí; un «no» claro, un «sí» o nada retenido, no');

    const c = await cerrarAlertas();
    ok(c.n > 0 && c.malas.length === 0 && c.quedan === 0, `las ${c.n} alertas que abrió la prueba quedan resueltas por el equipo (${JSON.stringify(c.malas)})`);
  } finally {
    // (revisión de ae940a7) · También si algo falló antes: ninguna alerta de la prueba se queda abierta en la base compartida.
    await cerrarAlertas().catch((e) => console.error('no se pudieron cerrar las alertas de la prueba:', e.message));
    await D.db().end();
  }
  console.log(`\nOK din9x (${n} ✓)`);
})().catch((e) => { console.error(e); process.exit(1); });
