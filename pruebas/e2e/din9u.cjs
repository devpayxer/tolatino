// 9u (25 nov) · Dinero: lo que la medida de consultas (pruebas/lib/consultas-medir.cjs) halló sin ejecutar en el SERVIDOR en lib/cobros.ts, lib/suscripcion.ts y
// lib/revision-pasarela.ts, ahora por el servidor local (simulador de pagos), con lo que de verdad queda en la base:
//   1. Webhook charge.refund.updated (firmado): Stripe da por fallida una devolución ya hecha de una ayuda resuelta en Colas (llave sop-q<caso>), de un caso de
//      Soporte (tk-<clave>) y de una ayuda de cita (ayb-h<solicitud>-p<cobro>): la devolución queda fallida, lo devuelto vuelve al cobro y a la operación, lo que
//      cada caso había sumado se resta y el equipo de dinero recibe UNA alerta; el mismo aviso otra vez (otro evento) no cambia nada; una que no está en el libro
//      solo alerta.
//   2. Cobrar lo retenido cuando la pasarela dice que no (la autorización ya no se deja cobrar): el barrido no marca nada cobrado, anota el código y sigue
//      retenido; cuando la pasarela vuelve a dejar, el mismo barrido lo cobra una vez.
//   3. La devolución de lo que sobró (gateway_refunds) que nunca llegó a Stripe: pasada la llave y el margen, el barrido le pregunta al simulador, la da por
//      «nunca llegó» y sale OTRA con otra llave (-r1), que se hace una vez; otra por más de lo que queda en ese cobro: Stripe dice que no, queda fallida con
//      su código y el equipo recibe UNA alerta.
//   4. Tu plan (el dueño, en el teléfono): la renovación pide verificar al banco (3-D Secure) y queda en cobro fallido; «Cambiar tarjeta» con una que el banco
//      rechaza suelta la verificación vieja (vencida; su intención, fallida) y NO dice «ya tienes Pro»; con una buena mientras otro tiene el candado del
//      plan, «se está procesando» (tarjeta cambiada, ningún cobro intentado) y al soltarse se cobra y queda Pro; «Pasar a Free» y «Seguir con Pro» lo
//      deshace; el tercer intento rechazado desde «Cambiar tarjeta» pasa a Free y lo dice.
//   5. Super Admin › Planes: «Reintentar cobro» con una tarjeta que el banco rechaza (queda el intento y su auditoría, sigue en cobro fallido), con una de
//      3-D Secure («pide confirmar»: el cobro de ahora en 'action' con su verificación pendiente) y «Quitar
//      cortesía» (pasa a Free hoy, nada se borra).
//   6. La devolución de lo que sobró que el simulador tiene DOS veces: el barrido abre la alerta gateway_review y el equipo elige cuál vale (la intención queda
//      hecha con esa; lo que salió de más no se deshace con otra devolución).
// Precondiciones propias (orden indiferente, corre dos veces seguidas): su persona (teléfono 555 libre), su negocio, sus cobros e intenciones del simulador, sus
// casos y su plan. El admin es el de siempre (570-555-0199).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const crypto = require('crypto'); const { spawn } = require('child_process');
const { entrarComo, sql, tarjeta } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT, ADM = '5705550199', SEC = ENT.sec('STRIPE_WEBHOOK_SECRET');
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400)); };
const espera = async (f, v, veces = 60) => { for (let i = 0; i < veces; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l)); // el id de un «returning» (psql también imprime la etiqueta de cada sentencia)
const uno = (q) => primero(sql(q));
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
const barrido = async () => { const r = await fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': ENT.TOK } }); return r.json(); };
const webhook = async (ev) => {
  const cuerpo = JSON.stringify(ev), t = Math.floor(Date.now() / 1000);
  const r = await fetch(B + '/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${crypto.createHmac('sha256', SEC).update(`${t}.${cuerpo}`).digest('hex')}` }, body: cuerpo });
  return { st: r.status, j: await r.json().catch(() => null) };
};
const alertas = (kind, sujeto) => sql(`select count(*) from money_alerts where kind = '${kind}' and subject_id = '${sujeto}'`);
let NUM = Number(String(Date.now()).slice(-8)) * 10 + 9;

(async () => {
  // ── Precondiciones propias ──
  const tel = telPropio();
  sql(`insert into users (phone, first_name, last_name) values ('+1${tel}', 'Prueba', 'Nueve U')`);
  const U = sql(`select id from users where phone = '+1${tel}'`), STF = sql(`select id from users where phone = '+1${ADM}'`);
  const BIZ = `p9u-${RUN}`, NEG = `Cobros 9u ${RUN}`;
  sql(`insert into businesses (id, city_id, category_id, name) values ('${BIZ}', 'hzl', 'NEG-FOOD', '${NEG}')`);
  // Un cobro de la app (operación + cobro + su intención en el simulador). o.held: retenido (sin cobrar), con la intención en o.sim.
  const cobro = (monto, o = {}) => {
    const num = String(++NUM), pi = `pi_sim_9u_${RUN}_${num}`;
    const op = uno(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, total_cents, subtotal_cents, pay_status)
      values ('${num}', 'order', 'hzl', '${BIZ}', '${U}', 'app', gen_random_uuid(), '${o.held ? 'confirmed' : 'done'}', ${monto}, ${monto}, '${o.held ? 'held' : 'captured'}') returning id`);
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card, capture_method) values ('${pi}', ${monto}, 0, 'acct_sim_${BIZ}', '${o.sim ?? 'succeeded'}', ${o.held ? 0 : monto}, 'pm_sim_visa_4242', '${o.held ? 'manual' : 'automatic'}')`);
    const p = uno(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, captured_at, held_at, simulated)
      values (${op}, '${U}', '${BIZ}', 'hzl', 'full', 'card', '${pi}', ${monto}, ${monto}, 100, '${o.held ? 'held' : 'captured'}', ${o.held ? 'null' : 'now()'}, now() - interval '1 hour', true) returning id`);
    return { op, p, pi, num };
  };
  // Una devolución HECHA de ese cobro, con su llave (como la deja el cierre: 'done', su objeto de Stripe y lo devuelto en el cobro y la operación).
  const devHecha = (c, amt, idem) => {
    const id = uno(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key) values (${c.p}, ${amt}, 'prueba 9u', 'admin', 'pending', '${idem}') returning id`);
    const sid = `re_sim_9u_${RUN}_${id}`;
    sql(`update refunds set status = 'done', stripe_refund_id = '${sid}', done_at = now() where id = ${id}`);
    sql(`update payments set refunded_cents = refunded_cents + ${amt}, status = case when refunded_cents + ${amt} >= amount_cents then 'refunded' else 'partially_refunded' end where id = ${c.p}`);
    sql(`update operations set pay_status = (select status from payments where id = ${c.p}) where id = ${c.op}`);
    return { id, sid };
  };
  const fallida = (d, amt, pi) => ({ id: `evt_9u_${RUN}_${d.id}_${crypto.randomBytes(3).toString('hex')}`, type: 'charge.refund.updated',
    data: { object: { id: d.sid, object: 'refund', status: 'failed', failure_reason: 'expired_or_canceled_card', amount: amt, payment_intent: pi } } });
  const pago = (c) => sql(`select p.refunded_cents || '|' || p.status || '|' || o.pay_status from payments p join operations o on o.id = p.operation_id where p.id = ${c.p}`);
  const dev = (id) => sql(`select status || '|' || (idem_key like '%~fallida-' || id::text) from refunds where id = ${id}`);

  // ── 1 · Webhook charge.refund.updated ──
  console.log('1 · Stripe da por fallida una devolución ya hecha (webhook firmado)');
  {
    // (a) Ayuda resuelta en Colas › Ayuda con devolución: la llave del caso es sop-q<caso de la cola>.
    const c = cobro(4100);
    const h = uno(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, wants, amount_cents, status, refunded_cents) values ('H-9U${NUM}', ${c.op}, '${BIZ}', 'hzl', '${U}', 'cobro', 'devolver', 1500, 'answered', 1500) returning id`);
    const q = uno(`insert into queue_items (queue, subject_kind, subject_id, status, city_id, business_id) values ('sop', 'help_request', '${h}', 'decided', 'hzl', '${BIZ}') returning id`);
    const d = devHecha(c, 1500, `sop-q${q}`);
    ok(pago(c) === '1500|partially_refunded|partially_refunded', `una devolución hecha de $15 de una ayuda resuelta en Colas (llave sop-q${q})`);
    const w = await webhook(fallida(d, 1500, c.pi));
    ok(w.st === 200 && w.j?.ok, 'el webhook firmado se acepta');
    ok(dev(d.id) === 'failed|true', 'la devolución queda fallida y su llave libre («~fallida-»)');
    ok(pago(c) === '0|captured|captured', `lo devuelto vuelve al cobro y a la operación (${pago(c)})`);
    ok(sql(`select refunded_cents from help_requests where id = ${h}`) === '0', 'la ayuda resta lo que había sumado ($15 → $0)');
    ok(alertas('refund_failed', d.id) === '1' && sql(`select count(*) from operation_events where operation_id = ${c.op} and kind = 'refund_failed'`) === '1', 'una alerta refund_failed al equipo de dinero y el renglón en la operación');
    // El mismo aviso de Stripe otra vez (otro evento): ya está fallida; nada cambia ni se alerta otra vez.
    const w2 = await webhook(fallida(d, 1500, c.pi));
    ok(w2.st === 200 && pago(c) === '0|captured|captured' && sql(`select refunded_cents from help_requests where id = ${h}`) === '0' && alertas('refund_failed', d.id) === '1'
      && sql(`select count(*) from operation_events where operation_id = ${c.op} and kind = 'refund_failed'`) === '1', 'otro evento de la misma devolución fallida: nada cambia, ni otra alerta');
  }
  {
    // (b) Un caso de Soporte resuelto con devolución (llave tk-<clave>): support_refunds hecha y el caso con lo devuelto.
    const c = cobro(5200), clave = crypto.randomUUID(), idem = `tk-${clave}`;
    const caso = uno(`insert into support_cases (number, user_id, business_id, city_id, topic, operation_id, summary) values ('TK-9${String(NUM).slice(-9)}', '${U}', '${BIZ}', 'hzl', 'pago', ${c.op}, 'Prueba 9u') returning id`);
    sql(`insert into support_refunds (case_id, payment_id, idem_key, amount_cents, staff_id) values (${caso}, ${c.p}, '${idem}', 2000, '${STF}')`);
    sql(`update support_refunds set status = 'done', done_at = now() where idem_key = '${idem}'`);
    const d = devHecha(c, 2000, idem);
    sql(`update support_cases set refunded_cents = 2000, status = 'resolved', resolved_at = now(), resolved_by = 'staff' where id = ${caso}`);
    await webhook(fallida(d, 2000, c.pi));
    ok(dev(d.id) === 'failed|true' && pago(c) === '0|captured|captured', 'Soporte (tk-…): la devolución fallida y lo devuelto de vuelta en el cobro');
    ok(sql(`select refunded_cents from support_cases where id = ${caso}`) === '0', 'el caso de Soporte resta lo que había sumado ($20 → $0)');
    ok(alertas('refund_failed', d.id) === '1', 'y su alerta, una');
  }
  {
    // (c) Una ayuda de cita que el negocio devolvió (llave ayb-h<solicitud>-p<cobro>), con otra devolución hecha del mismo cobro que sigue valiendo.
    const c = cobro(6000);
    const h = uno(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, wants, amount_cents, status, refunded_cents) values ('H-9U${NUM}c', ${c.op}, '${BIZ}', 'hzl', '${U}', 'cobro', 'devolver', 1000, 'answered', 1000) returning id`);
    devHecha(c, 700, `t9u-${crypto.randomUUID()}`);
    const d = devHecha(c, 1000, `ayb-h${h}-p${c.p}`);
    await webhook(fallida(d, 1000, c.pi));
    ok(dev(d.id) === 'failed|true' && pago(c) === '700|partially_refunded|partially_refunded', `ayuda de cita: con otra devolución hecha, el cobro queda con lo que el libro cuenta (${pago(c)})`);
    ok(sql(`select refunded_cents from help_requests where id = ${h}`) === '0', 'la solicitud resta lo suyo ($10 → $0)');
  }
  {
    // (d) Una devolución que no está en el libro (hecha desde Stripe): solo alerta, con el id de Stripe.
    const sid = `re_sim_9u_${RUN}_fuera`;
    await webhook({ id: `evt_9u_${RUN}_fuera`, type: 'charge.refund.updated', data: { object: { id: sid, object: 'refund', status: 'failed', amount: 900 } } });
    ok(alertas('refund_failed', sid) === '1', 'una fallida que no está en el libro solo alerta (con su id de Stripe)');
  }

  // ── 2 · Cobrar lo retenido cuando la pasarela no deja ──
  console.log('2 · Cobrar lo retenido: la pasarela dice que no, y después sí');
  {
    const c = cobro(3100, { held: true, sim: 'canceled' });
    const st = () => sql(`select p.status || '|' || coalesce(p.failure_code, '') || '|' || o.pay_status from payments p join operations o on o.id = p.operation_id where p.id = ${c.p}`);
    ok(st() === 'held||held', 'un pedido aceptado con su cobro retenido (y la autorización que ya no se deja cobrar en el simulador)');
    const b1 = await barrido();
    ok(b1.corrio !== false, 'el barrido corrió');
    ok(st() === 'held|error|held', `la pasarela dijo que no: nada se marca cobrado, queda el código y sigue retenido (${st()})`);
    ok(sql(`select count(*) from operation_events where operation_id = ${c.op} and kind = 'payment_captured'`) === '0', 'y la operación no dice «Se cobraron»');
    sql(`update sim_intents set status = 'requires_capture' where id = '${c.pi}'`);
    await barrido(); await barrido();
    ok(st() === 'captured||captured', `cuando la pasarela deja, el barrido lo cobra y borra el código (${st()})`);
    ok(sql(`select status || '|' || captured_cents from sim_intents where id = '${c.pi}'`) === 'succeeded|3100' && sql(`select count(*) from operation_events where operation_id = ${c.op} and kind = 'payment_captured'`) === '1', 'cobrado una vez en el simulador y un solo «Se cobraron»');
  }

  // ── 3 · La devolución de lo que sobró que nunca llegó a Stripe ──
  console.log('3 · Devolución de lo que sobró: nunca llegó → otra con otra llave');
  {
    const c = cobro(2600);
    const oc = sql(`select nextval(pg_get_serial_sequence('offsession_charges', 'id'))`); // un id de intención que nadie más usa (la decisión es una por intención)
    const chk = uno(`insert into gateway_checks (subject_kind, subject_id, lookup, origin, result, found_n, city_id) values ('offsession_charges', ${oc}, 'offsession_charges:${oc}', 'barrido', 'varios', 2, 'hzl') returning id`);
    const rv = uno(`insert into gateway_reviews (subject_kind, subject_id, check_id, decision, stripe_id, amount_cents, staff_id, note, city_id) values ('offsession_charges', ${oc}, ${chk}, 'vale', 'pi_sim_9u_${RUN}_vale', 2600, '${STF}', 'Prueba 9u: vale el primero.', 'hzl') returning id`);
    const idem = `gwr-${rv}-${c.pi}`;
    // Anotada y mandada hace 30 h (pasada la llave de 23 h y el margen de 1 h), con su dato, sin respuesta: como la deja ejecutarDevolucionSobra.
    const g = uno(`set session_replication_role = replica; insert into gateway_refunds (review_id, subject_kind, subject_id, medio, plataforma, stripe_id, amount_cents, idem_key, business_id, city_id, status, sent_at, last_sent_at, attempts, last_error, created_at)
      values (${rv}, 'offsession_charges', ${oc}, 'refund', true, '${c.pi}', 2600, '${idem}', '${BIZ}', 'hzl', 'pending', now() - interval '30 hours', now() - interval '30 hours', 2, 'red', now() - interval '30 hours') returning id`);
    sql(`set session_replication_role = replica; update gateway_refunds set gateway_ref = 'gateway_refunds:' || id where id = ${g}`);
    const fila = (id) => sql(`select status || '|' || coalesce(last_error, '') from gateway_refunds where id = ${id}`);
    ok(fila(g) === 'pending|red' && sql(`select count(*) from sim_refunds where payment_intent = '${c.pi}'`) === '0', 'una devolución de lo que sobró en camino, mandada hace 30 h y sin rastro en el simulador');
    await barrido();
    ok(fila(g) === 'failed|nunca_llego', `el barrido pregunta, el simulador no la tiene: queda «nunca llegó» (${fila(g)})`);
    ok(sql(`select result from gateway_checks where subject_kind = 'gateway_refunds' and subject_id = ${g} order by id desc limit 1`) === 'no_hallado', 'la consulta quedó anotada (no hallada)');
    const nueva = sql(`select id || '|' || idem_key || '|' || status || '|' || coalesce(stripe_refund_id, '') from gateway_refunds where review_id = ${rv} and id <> ${g}`).split('|');
    ok(nueva[1] === `${idem}-r1` && nueva[2] === 'done' && nueva[3].startsWith('re_sim_'), `salió otra con otra llave (${nueva[1]}) y quedó hecha`);
    ok(sql(`select count(*) || '|' || coalesce(sum(amount_cents), 0) from sim_refunds where payment_intent = '${c.pi}' and metadata->>'tl_intencion' = 'gateway_refunds:${nueva[0]}'`) === '1|2600', 'el simulador la devolvió una vez ($26), con el dato de la nueva');
    await barrido();
    ok(sql(`select count(*) from gateway_refunds where review_id = ${rv}`) === '2' && sql(`select count(*) from sim_refunds where payment_intent = '${c.pi}'`) === '1', 'otro barrido no saca otra ni devuelve otra vez');
    // Otra de la misma decisión, recién anotada (sin mandar), de otro cobro y por más de lo que se cobró en él: Stripe (el simulador) dice que no.
    const c2 = cobro(800);
    const g2 = uno(`set session_replication_role = replica; insert into gateway_refunds (review_id, subject_kind, subject_id, medio, plataforma, stripe_id, amount_cents, idem_key, business_id, city_id, status, attempts, created_at)
      values (${rv}, 'offsession_charges', ${oc}, 'refund', true, '${c2.pi}', 900, 'gwr-${rv}-${c2.pi}', '${BIZ}', 'hzl', 'pending', 0, now() - interval '3 minutes') returning id`);
    await barrido();
    ok(fila(g2) === 'failed|amount_too_large', `Stripe dijo que no (no queda saldo en ese cobro): fallida con su código (${fila(g2)})`);
    ok(sql(`select attempts from gateway_refunds where id = ${g2}`) === '1' && alertas('extra_refund_stuck', g2) === '1' && sql(`select count(*) from sim_refunds where payment_intent = '${c2.pi}'`) === '0', 'cuenta el intento, alerta al equipo UNA vez y nada salió');
    await barrido();
    ok(fila(g2) === 'failed|amount_too_large' && alertas('extra_refund_stuck', g2) === '1', 'otro barrido no la vuelve a mandar ni alerta otra vez');
  }

  // ── 4 · Tu plan (el dueño) ──
  console.log('4 · Tu plan: verificación vieja, cambiar tarjeta (rechazada y buena), pasar a Free y deshacer');
  sql(`insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours)
       values ('${BIZ}', '${U}', 'owner', 'Prueba Nueve U', '{"es":"Prueba","en":"Test"}'::jsonb, 'active', false, '{all}', 2020, 9, true)`);
  const buena = tarjeta(tel, '4242'), mala = tarjeta(tel, '0002', { predeterminada: false }), tresDS = tarjeta(tel, '3184', { predeterminada: false });
  const subq = (c = "status || '|' || failed_attempts") => sql(`select ${c} from subscriptions where business_id = '${BIZ}'`);
  // Pro activo con la tarjeta que pide verificar al banco, y el período terminado hace un minuto: al abrir Tu plan se renueva.
  sql(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, trial_choice, current_period_end) values ('${BIZ}', 'active', 'month', '${U}', '${tresDS}', 'card', now() - interval '1 minute')`);
  sql(`insert into business_stats_cache (business_id, plan) values ('${BIZ}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
  const b = await chromium.launch();
  const err = [];
  try {
    const cd = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), d = await cd.newPage();
    d.on('pageerror', (e) => err.push('panel ' + e.message));
    await entrarComo(d, tel);
    await d.goto(B + `/panel/${BIZ}/cobros/plan`);
    await d.getByText(/intento 1 de 3/).first().waitFor({ timeout: 20000 });
    const pi3 = sql(`select stripe_pi from subscription_charges where business_id = '${BIZ}' and status = 'action'`);
    ok(subq() === 'past_due|1' && /^pi_sim_/.test(pi3) && sql(`select status from payment_actions where pi = '${pi3}'`) === 'pendiente',
      `la renovación pidió verificar al banco: cobro fallido (intento 1 de 3), su intención esperando al banco y la verificación pendiente (${pi3})`);
    await d.screenshot({ path: OUT + 'd9u-plan-verificar-m.png', fullPage: true });
    const hoja = d.locator('[data-screen-label="Método de pago"]');
    const usar = async (l4) => { await clic(d.getByText('Cambiar tarjeta', { exact: true })); await clic(hoja.getByText(new RegExp(`Visa ·· ${l4}`))); await clic(hoja.getByText(new RegExp(`^Usar Visa ·· ${l4}`))); };
    // (a) Cambiar a una tarjeta que el banco rechaza: la verificación vieja se suelta; el cobro con la nueva se intenta y NO se dice «ya tienes Pro».
    await usar('0002');
    await d.getByText(/rechazó el cobro/).first().waitFor({ timeout: 20000 });
    ok(!(await d.getByText(/ya tienes Pro/).count()), 'con la tarjeta rechazada la pantalla NO dice «ya tienes Pro»: dice que el banco rechazó el cobro');
    ok(subq("status || '|' || failed_attempts || '|' || card_pm") === `past_due|2|${mala}`, 'la tarjeta quedó cambiada y el cobro fallido cuenta su intento (2 de 3)');
    ok(sql(`select status from payment_actions where pi = '${pi3}'`) === 'vencida', 'la verificación vieja del banco quedó vencida (nunca cobra después)');
    ok(sql(`select status || '|' || last_error from subscription_charges where stripe_pi = '${pi3}'`) === 'failed|verificacion_vencida', 'y su intención, fallida «verificación vencida»');
    ok(sql(`select status from sim_intents where id = '${pi3}'`) === 'canceled', 'en el simulador, soltada');
    ok(sql(`select count(*) from subscription_charges where business_id = '${BIZ}' and status = 'done'`) === '0' && sql(`select plan from business_stats_cache where business_id = '${BIZ}'`) === 'pro', 'nada cobrado; sigue con Pro mientras quedan intentos');
    await d.screenshot({ path: OUT + 'd9u-plan-rechazada-m.png', fullPage: true });
    // (b) Con una buena MIENTRAS otro tiene el candado del plan (el barrido cobrando): la tarjeta queda cambiada, no se intenta ningún cobro y la
    //     pantalla dice «se está procesando» (ni «rechazó» ni «ya tienes Pro»). Al soltarse, Tu plan lo cobra con la buena y queda Pro.
    await d.goto(B + `/panel/${BIZ}/cobros/plan`); await d.getByText(/intento 2 de 3/).first().waitFor({ timeout: 20000 });
    const cargos0 = sql(`select count(*) from subscription_charges where business_id = '${BIZ}'`), app = `din9u-candado-${RUN}`;
    const libre = () => sql(`select pg_try_advisory_lock(hashtext('sub:${BIZ}'))`); // si está libre, lo toma y lo suelta al cerrar su sesión
    const k = spawn('docker', ['exec', '-e', `PGAPPNAME=${app}`, ENT.DB, 'psql', '-U', 'tolatino', '-d', 'tolatino', '-qAt', '-c', `select pg_advisory_lock(hashtext('sub:${BIZ}')); select pg_sleep(120);`], { stdio: 'ignore' });
    try {
      ok(await espera(libre, 'f') === 'f', 'otra sesión tiene el candado del plan (como el barrido mientras cobra)');
      await usar('4242');
      await d.getByText(/El cobro se está procesando en este momento/).first().waitFor({ timeout: 20000 });
      ok(!(await d.getByText(/ya tienes Pro|rechazó el cobro/).count()), 'la pantalla dice «se está procesando»: ni «ya tienes Pro» ni «rechazó»');
      ok(subq("status || '|' || failed_attempts || '|' || card_pm") === `past_due|2|${buena}`, 'la tarjeta quedó cambiada y el cobro fallido no sube de intento (2 de 3)');
      ok(sql(`select count(*) from subscription_charges where business_id = '${BIZ}'`) === cargos0, 'no se intentó ningún cobro (ninguna intención nueva)');
      await d.screenshot({ path: OUT + 'd9u-plan-procesando-m.png', fullPage: true });
    } finally { sql(`select pg_terminate_backend(pid) from pg_stat_activity where application_name = '${app}'`); k.kill(); }
    ok(await espera(libre, 't') === 't', 'el candado se soltó');
    await d.goto(B + `/panel/${BIZ}/cobros/plan`); await d.getByText(/Próximo cobro:/).first().waitFor({ timeout: 20000 });
    ok(subq("status || '|' || failed_attempts || '|' || card_pm || '|' || (current_period_end > now() + interval '27 days')") === `active|0|${buena}|true`, 'con la buena: cobrado, Pro por un mes y sin intentos fallidos');
    ok(sql(`select count(*) from subscription_charges where business_id = '${BIZ}' and status = 'done'`) === '1' && sql(`select count(*) from audit_entries where action = 'plan.seguir_pro' and target_id = '${BIZ}'`) === '2', 'un solo cobro hecho y cada cambio de tarjeta en la auditoría');
    // (c) Pasar a Free y deshacer («Seguir con Pro» mientras sigue el período).
    await d.goto(B + `/panel/${BIZ}/cobros/plan`); await d.getByText(/Próximo cobro:/).first().waitFor({ timeout: 20000 });
    await clic(d.getByRole('button', { name: 'Pasar a Free' })); await d.getByText(/Sigues con Pro hasta el/).first().waitFor();
    ok(await espera(() => subq('status'), 'canceling') === 'canceling', 'pasar a Free: sigue con Pro hasta el fin del período');
    await clic(d.getByRole('button', { name: 'Seguir con Pro' })); await d.getByText(/Listo: sigues con Pro/).first().waitFor();
    ok(await espera(() => subq('status'), 'active') === 'active' && sql(`select count(*) from subscription_events where business_id = '${BIZ}' and kind = 'undo_free'`) === '1'
      && sql(`select count(*) from audit_entries where action = 'plan.deshacer' and target_id = '${BIZ}'`) === '1', '«Seguir con Pro» lo deshace: activo otra vez, su evento y su auditoría');
    // (d) El último intento: con dos fallidos, «Cambiar tarjeta» a una que el banco rechaza → Free hoy (nada se borra) y la pantalla lo dice.
    sql(`update subscriptions set status = 'past_due', card_pm = '${buena}', failed_attempts = 2, next_attempt_at = now() + interval '4 days', current_period_end = now() - interval '1 minute' where business_id = '${BIZ}'`);
    await d.goto(B + `/panel/${BIZ}/cobros/plan`); await d.getByText(/intento 2 de 3/).first().waitFor({ timeout: 20000 });
    await usar('0002');
    await d.getByText(/rechazó el cobro y tu página pasó a Free/).first().waitFor({ timeout: 20000 });
    ok(subq("status || '|' || (ended_at is not null) || '|' || card_pm") === `ended|true|${mala}` && sql(`select plan from business_stats_cache where business_id = '${BIZ}'`) === 'free', 'tercer intento rechazado desde «Cambiar tarjeta»: Free hoy y la pantalla lo dice');
    ok(sql(`select count(*) from subscription_events where business_id = '${BIZ}' and kind = 'ended' and note->>'por' = 'cobro_fallido'`) === '1' && sql(`select count(*) from subscription_charges where business_id = '${BIZ}' and status = 'done'`) === '1', 'su evento «ended» (cobro fallido), una vez, y nada más cobrado');
    await cd.close();

    // ── 5 · Super Admin › Planes ──
    console.log('5 · Super Admin: reintentar un cobro rechazado y quitar una cortesía');
    sql(`update subscriptions set status = 'past_due', card_pm = '${mala}', failed_attempts = 1, next_attempt_at = now() + interval '3 days', current_period_end = now() - interval '1 minute' where business_id = '${BIZ}'`);
    const ca = await b.newContext({ viewport: { width: 1360, height: 900 } }), a = await ca.newPage();
    a.on('pageerror', (e) => err.push('admin ' + e.message));
    await entrarComo(a, ADM);
    const fila = (accion) => a.locator('div', { has: a.getByText(NEG, { exact: true }) }).filter({ has: a.getByText(accion, { exact: true }) }).last();
    await a.goto(B + '/admin/planes?tab=subs&est=past_due'); await a.getByText(NEG, { exact: true }).first().waitFor({ timeout: 20000 });
    await clic(fila('Reintentar cobro').getByText('Reintentar cobro', { exact: true }));
    await clic(a.getByText('El dueño cambió su tarjeta.', { exact: true })); await clic(a.getByText('Reintentar', { exact: true }).last());
    await a.getByText(/el banco volvió a rechazarla/).first().waitFor({ timeout: 20000 });
    ok(subq() === 'past_due|2', 'reintentar con la tarjeta rechazada: sigue en cobro fallido y cuenta el intento (2 de 3)');
    ok(sql(`select count(*) from subscription_events where business_id = '${BIZ}' and kind = 'retry_admin'`) === '1' && sql(`select count(*) from audit_entries where action = 'plan.reintentar_cobro' and target_id = '${BIZ}' and actor_id = '${STF}'`) === '1',
      'la decisión («retry_admin») y su auditoría quedan aunque el banco diga que no');
    ok(sql(`select count(*) from subscription_charges where business_id = '${BIZ}' and status = 'pending'`) === '0', 'nada quedó en camino');
    await a.screenshot({ path: OUT + 'd9u-admin-reintentar-d.png' });
    // Con la tarjeta de 3-D Secure: el banco pide confirmar el cobro de ahora (no «volvió a rechazarla»).
    sql(`update subscriptions set status = 'past_due', card_pm = '${tresDS}', failed_attempts = 1, next_attempt_at = now() + interval '3 days', current_period_end = now() - interval '2 minutes' where business_id = '${BIZ}'`);
    await a.goto(B + '/admin/planes?tab=subs&est=past_due'); await a.getByText(NEG, { exact: true }).first().waitFor({ timeout: 20000 });
    await clic(fila('Reintentar cobro').getByText('Reintentar cobro', { exact: true }));
    await clic(a.getByText('El banco ya lo autorizó.', { exact: true })); await clic(a.getByText('Reintentar', { exact: true }).last());
    await a.getByText(/El banco pide confirmar el cobro/).first().waitFor({ timeout: 20000 });
    ok(!(await a.getByText(/volvió a rechazarla/).count()), 'la pantalla dice que el banco pide confirmar (no «volvió a rechazarla»)');
    const ult = sql(`select status || '|' || coalesce(stripe_pi, '') || '|' || pm from subscription_charges where business_id = '${BIZ}' order by id desc limit 1`).split('|');
    ok(ult[0] === 'action' && /^pi_sim_/.test(ult[1]) && ult[2] === tresDS, `el cobro de ahora quedó esperando al banco ('action', ${ult[1]})`);
    ok(sql(`select status || '|' || kind from payment_actions where pi = '${ult[1]}'`) === 'pendiente|renovacion', 'con su verificación pendiente a nombre del dueño');
    ok(subq() === 'past_due|2' && sql(`select count(*) from subscription_events where business_id = '${BIZ}' and kind = 'retry_admin'`) === '2', 'cuenta como intento (2 de 3) y queda su «retry_admin»');
    sql(`update subscriptions set status = 'courtesy', courtesy_until = now() + interval '20 days', failed_attempts = 0, next_attempt_at = null where business_id = '${BIZ}'`);
    await a.goto(B + '/admin/planes?tab=subs&est=courtesy'); await a.getByText(NEG, { exact: true }).first().waitFor({ timeout: 20000 });
    await clic(fila('Quitar cortesía').getByText('Quitar cortesía', { exact: true }));
    await (await vis(a.getByRole('textbox').last())).fill('Prueba 9u: termina la cortesía.');
    await clic(a.getByText('Quitar', { exact: true }).last());
    await a.getByText(/Cortesía quitada/).first().waitFor({ timeout: 20000 });
    ok(subq("status || '|' || (ended_at is not null) || '|' || (courtesy_until is null)") === 'ended|true|true' && sql(`select plan from business_stats_cache where business_id = '${BIZ}'`) === 'free', 'quitar la cortesía: Free hoy (nada se borra)');
    ok(sql(`select count(*) from subscription_events where business_id = '${BIZ}' and kind = 'courtesy_removed'`) === '1' && sql(`select count(*) from audit_entries where action = 'plan.quitar_cortesia' and target_id = '${BIZ}'`) === '1', 'su evento y su auditoría');

    // ── 6 · Una devolución de lo que sobró que Stripe tiene DOS veces: el equipo elige cuál vale ──
    console.log('6 · Devolución de lo que sobró con dos en Stripe: «Elegir cuál vale»');
    {
      const c = cobro(3300);
      const oc = sql(`select nextval(pg_get_serial_sequence('offsession_charges', 'id'))`);
      const chk = uno(`insert into gateway_checks (subject_kind, subject_id, lookup, origin, result, found_n, city_id) values ('offsession_charges', ${oc}, 'offsession_charges:${oc}', 'barrido', 'varios', 2, 'hzl') returning id`);
      const rv = uno(`insert into gateway_reviews (subject_kind, subject_id, check_id, decision, stripe_id, amount_cents, staff_id, note, city_id) values ('offsession_charges', ${oc}, ${chk}, 'vale', 'pi_sim_9u_${RUN}_vale2', 3300, '${STF}', 'Prueba 9u: vale el primero.', 'hzl') returning id`);
      // Mandada hace 23 h 30 min (pasada la llave), sin respuesta; en el simulador salieron DOS devoluciones con su dato (la respuesta de la primera se perdió).
      const g = uno(`set session_replication_role = replica; insert into gateway_refunds (review_id, subject_kind, subject_id, medio, plataforma, stripe_id, amount_cents, idem_key, business_id, city_id, status, sent_at, last_sent_at, attempts, last_error, created_at)
        values (${rv}, 'offsession_charges', ${oc}, 'refund', true, '${c.pi}', 3300, 'gwr-${rv}-${c.pi}', '${BIZ}', 'hzl', 'pending', now() - interval '23 hours 30 minutes', now() - interval '23 hours 30 minutes', 2, 'red', now() - interval '23 hours 30 minutes') returning id`);
      sql(`set session_replication_role = replica; update gateway_refunds set gateway_ref = 'gateway_refunds:' || id where id = ${g}`);
      const ref = `gateway_refunds:${g}`, RA = `re_sim_9u_${RUN}_dosa`, RB = `re_sim_9u_${RUN}_dosb`;
      for (const [id, min] of [[RA, 23 * 60 + 29], [RB, 23 * 60 + 20]]) sql(`insert into sim_refunds (id, payment_intent, amount_cents, metadata, created_at) values ('${id}', '${c.pi}', 3300, '{"tl_intencion":"${ref}"}'::jsonb, now() - interval '${min} minutes')`);
      await barrido();
      ok(alertas('gateway_review', ref) === '1' && sql(`select status from gateway_refunds where id = ${g}`) === 'pending', `el barrido pregunta, el simulador tiene dos: alerta gateway_review (${ref}) y sigue en camino`);
      await a.goto(B + '/admin/planes?tab=ing'); await a.getByText(ref, { exact: false }).first().waitFor({ timeout: 20000 });
      const f = a.locator('div').filter({ has: a.getByText(NEG, { exact: false }) }).filter({ has: a.getByText(ref, { exact: false }) }).filter({ has: a.getByRole('button', { name: 'Elegir cuál vale' }) }).last();
      await clic(f.getByRole('button', { name: 'Elegir cuál vale' }));
      await a.getByText('Qué vale de lo que tiene Stripe').first().waitFor();
      await clic(a.getByText(new RegExp(`^\\$[0-9.]+ · .+ · ${RA}$`)));
      await clic(a.getByText('Devolución duplicada: vale la primera.', { exact: true }));
      await clic(a.getByRole('button', { name: 'Decidir', exact: true }));
      await a.getByText(/Decidido: vale /).first().waitFor({ timeout: 30000 });
      ok(sql(`select decision || '|' || stripe_id || '|' || staff_id from gateway_reviews where subject_kind = 'gateway_refunds' and subject_id = ${g}`) === `vale|${RA}|${STF}`, 'la decisión: vale la primera, con quien decidió (una sola)');
      ok(sql(`select status || '|' || stripe_refund_id from gateway_refunds where id = ${g}`) === `done|${RA}`, 'la devolución de lo que sobró quedó hecha con esa');
      ok(sql(`select count(*) from gateway_refunds where review_id = ${rv}`) === '1' && sql(`select count(*) from sim_refunds where payment_intent = '${c.pi}'`) === '2', 'lo que salió de más no se deshace con otra devolución (ni nueva fila ni otra en el simulador)');
      ok(sql(`select count(*) from audit_entries where action = 'dinero.alerta.decidir' and target_id = (select id::text from money_alerts where kind = 'gateway_review' and subject_id = '${ref}') and actor_id = '${STF}'`) === '1', 'y su auditoría «dinero.alerta.decidir»');
      await a.screenshot({ path: OUT + 'd9u-admin-decidido-d.png' });
    }
    await ca.close();
    ok(err.length === 0, 'sin errores en las páginas: ' + err.join(' | '));
  } finally { await b.close(); }
  console.log(`OK · ${n} comprobaciones`);
})().catch((e) => { console.error(e); process.exit(1); });
