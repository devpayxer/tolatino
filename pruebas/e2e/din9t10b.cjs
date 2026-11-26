// 22 nov (0209) · Dinero, por la PANTALLA (din9t10.cjs lo prueba por debajo, con los módulos reales y una pasarela de mentira, sin servidor ni navegador).
// Super Admin › Planes › Ingresos (alertas del dinero) contra el servidor local en modo simulador de pagos:
//   1) (d) La devolución de un patrocinio que primero quedó «sin respuesta» y después Stripe dio por fallida: la fila dice «Devolución que Stripe dio por
//      fallida», «el banco dijo que no o se canceló» y su código; ofrece «Resolver a mano» (no «Preguntar a Stripe ahora»: ya no está en camino); al
//      resolverla (el servidor le pregunta antes al simulador, que no la tiene) queda marcada a mano con quién y la nota, y la alerta resuelta.
//   2) (a) «Devolver otra vez» unos boletos desde su refund_failed: el botón dice el monto; la hoja dice que se devuelve lo mismo, una vez; sin nota no
//      guarda; al guardar, el simulador hace la devolución, el aviso lo dice, en la base hay UNA devolución de otra vez hecha (con su llave y su auditoría),
//      y la alerta queda resuelta sin acciones. El mismo pedido otra vez (reenviado tal cual) no devuelve más.
//   3) En el teléfono (390): el recorrido de (d) en otra alerta igual, con clics de verdad, sin que la página pase de 390.
//   4) En inglés (tl_lang=en): el botón y la hoja de «Devolver otra vez».
// Precondiciones propias (orden indiferente): su negocio, sus cobros del simulador, sus devoluciones y sus alertas.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const crypto = require('crypto');
const { entrarComo, sql } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT, ADM = '5705550199';
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400)); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = async (p, t) => (await texto(p)).includes(t);
const desk = (b) => b.newContext({ viewport: { width: 1360, height: 900 } });
const tel390 = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const arriba = (p) => p.evaluate(() => window.scrollTo(0, 0));
const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l));
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
const usd = require('../lib/usd.cjs'); // la regla real del dinero (lib/dinero-comun › usd)
const usados = new Set();
const montoLibre = () => { for (;;) { const c = 1100 + crypto.randomInt(3000); if (!usados.has(c)) { usados.add(c); return c; } } };
let NUM = Number(String(Date.now()).slice(-8)) * 10 + 9;

// (d) Un patrocinio terminado con devolución: su intención, primero «sin respuesta» (la alerta, de una vez) y después fallida por la consulta (failed_at, la
// consulta «fallido»). Lo que la app escribe en otras transacciones se escribe aquí de una vez, con los triggers apagados en esa sentencia.
function patFallida(X, tag) {
  const amt = montoLibre(), pi = `pi_sim_0209p_${RUN}${tag}`;
  const sp = primero(sql(`set session_replication_role = replica;
    insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, auto_renew, ended_at, end_kind, end_reason)
      values ('${X.b}', 'NEG-HOGAR', 'hzl', now() - interval '2 days', now() + interval '5 days', 'week', 'terminado', ${amt}, '${X.u}', false, now(), 'admin', 'Prueba 0209b') returning id;
    set session_replication_role = default`));
  const pago = primero(sql(`insert into sponsorship_payments (kind, ref_id, business_id, city_id, payer_user_id, amount_cents, pi, idem_key, card_brand, card_last4, reason)
    values ('negocio', ${sp}, '${X.b}', 'hzl', '${X.u}', ${amt}, '${pi}', 'pat-negocio-${X.b}-${RUN}${tag}', 'visa', '4242', 'compra') returning id`));
  const z = primero(sql(`insert into sponsorship_refunds (kind, ref_id, payment_id, business_id, city_id, pi, amount_cents, idem_key) values ('negocio', ${sp}, ${pago}, '${X.b}', 'hzl', '${pi}', ${amt}, 'pat-dev-negocio-${sp}') returning id`));
  sql(`set session_replication_role = replica;
    update sponsorship_refunds set status = 'failed', attempts = 1, last_error = 'card_closed', sent_at = now() - interval '25 hours', gateway_ref = 'sponsorship_refunds:' || id, created_at = now() - interval '25 hours', failed_at = now() - interval '5 minutes' where id = ${z};
    set session_replication_role = default`);
  sql(`insert into gateway_checks (subject_kind, subject_id, lookup, origin, result, city_id) values ('sponsorship_refunds', ${z}, 'sponsorship_refunds:${z}', 'barrido', 'fallido', 'hzl')`);
  sql(`insert into money_alerts (kind, subject_id, business_id, city_id, amount_cents, detail) values ('refund_stuck', 'sponsorship_refunds:${z}', '${X.b}', 'hzl', ${amt},
    '{"es":"Devolución de ${usd(amt)} de lo no usado de un patrocinio (${sp}): sin respuesta de Stripe en 23 h (1 intentos, red): ya no se manda con esa llave.","en":"Refund of ${usd(amt)} for the unused part of a sponsorship (${sp}): no answer from Stripe in 23 h (1 attempts, red): it is not sent with that key again."}'::jsonb)`);
  return { amt, z, sp, al: sql(`select id from money_alerts where kind = 'refund_stuck' and subject_id = 'sponsorship_refunds:${z}'`) };
}
// (a) Una orden de boletos pagada (cobro de la plataforma, con su intención del simulador) y su devolución de boletos que Stripe dio por fallida, con su alerta.
function bolFallida(X, tag) {
  const amt = montoLibre(), num = `B-${++NUM}`, pi = `pi_sim_0209b_${RUN}${tag}`;
  const e = primero(sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, approved_at)
    values ('p0209b-${RUN}${tag}', 'hzl', '${X.b}', 'noche', '{"es":"Prueba 0209b","en":"Test 0209b"}'::jsonb, current_date + 10, 1200, 1320, 'tickets', 'cancelled', now()) returning id`));
  const fid = primero(sql(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date) values (${e}, 'hzl', now() + interval '10 days', now() + interval '10 days 2 hours', now() + interval '10 days', current_date + 10) returning id`));
  const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, total_cents, subtotal_cents, details)
    values ('${num}', 'tickets', 'hzl', '${X.b}', '${X.u}', 'app', gen_random_uuid(), 'confirmed', 5000, 5000, jsonb_build_object('event_date_id', ${fid}, 'event_id', ${e})) returning id`));
  const pago = primero(sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, captured_at, transfer_group)
    values (${op}, '${X.u}', '${X.b}', 'hzl', 'full', 'card', '${pi}', 5000, 500, 'captured', now(), 'evt-${e}') returning id`));
  sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card, metadata, capture_method)
    values ('${pi}', 5000, 500, 'acct_sim_${X.b}', 'succeeded', 5000, 'pm_sim_visa_4242_${RUN}', '{}'::jsonb, 'automatic')`);
  const rf = primero(sql(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key) values (${pago}, ${amt}, 'Evento cancelado', 'event_cancelled', 'pending', 'evtx-${RUN}${tag}') returning id`));
  const l = primero(sql(`insert into operation_lines (operation_id, name, qty, unit_price_cents, line_total_cents) values (${op}, '{"es":"Extra","en":"Extra"}'::jsonb, 1, ${amt}, ${amt}) returning id`));
  sql(`insert into ticket_refund_lines (refund_id, operation_id, line_id, city_id, amount_cents, fee_kept_cents, fee_waived_cents) values (${rf}, ${op}, ${l}, 'hzl', ${amt}, 0, 0)`);
  sql(`set session_replication_role = replica;
    update refunds set status = 'failed', last_error = 'stripe:expired_or_canceled_card', idem_key = idem_key || '~fallida-' || id, stripe_refund_id = 're_sim_0209b_${RUN}${tag}' where id = ${rf};
    set session_replication_role = default`);
  sql(`insert into money_alerts (kind, subject_id, business_id, city_id, amount_cents, detail) values ('refund_failed', '${rf}', '${X.b}', 'hzl', ${amt},
    '{"es":"Stripe dio por fallida la devolución de ${usd(amt)} de la orden de boletos ${num} (expired_or_canceled_card). Boletos: solo extras.","en":"Stripe marked the ${usd(amt)} refund of ticket order ${num} as failed (expired_or_canceled_card). Tickets: extras only."}'::jsonb)`);
  return { amt, rf, pago, num, al: sql(`select id from money_alerts where kind = 'refund_failed' and subject_id = '${rf}'`) };
}
const patDe = (P) => sql(`select status || '|' || (manual_at is not null) || '|' || coalesce(manual_by::text, '') || '|' || coalesce(manual_note, '') from sponsorship_refunds where id = ${P.z}`);
const otraDe = (L) => sql(`select coalesce(string_agg(status || '|' || amount_cents || '|' || idem_key || '|' || lines_of, ','), '') from refunds where retry_of = ${L.rf}`);
const notas = (al, accion) => sql(`select count(*) from money_alert_notes where alert_id = ${al} and action = '${accion}'`);
const audit = (al, accion) => sql(`select count(*) from audit_entries where action = '${accion}' and target_kind = 'money_alert' and target_id = '${al}'`);

(async () => {
  const tel = telPropio();
  sql(`insert into users (phone, first_name, last_name) values ('+1${tel}', 'Prueba', 'CeroDosCeroNueve')`);
  const X = { u: uid(tel), b: `p0209b-${RUN}` };
  const NEG = `Hogar 0209b ${RUN}`;
  sql(`insert into businesses (id, city_id, category_id, name) values ('${X.b}', 'hzl', 'NEG-HOGAR', '${NEG}')`);
  const P1 = patFallida(X, 'a'), P2 = patFallida(X, 'b'), L1 = bolFallida(X, 'c'), L2 = bolFallida(X, 'd');
  ok(!!P1.al && !!P2.al && !!L1.al && !!L2.al && patDe(P1) === 'failed|false||', `dos devoluciones de patrocinio fallidas tras «sin respuesta» y dos de boletos fallidas, con sus alertas`);
  const b = await chromium.launch();
  const abiertas = [], err = [];
  const mirar = (p, tag) => { p.on('pageerror', (e) => err.push(`${tag} ${e.message}`)); };
  const fila = (p, amt, btn) => p.locator('div').filter({ has: p.getByText(NEG, { exact: false }) }).filter({ has: p.getByText(usd(amt), { exact: false }) }).filter({ has: p.getByRole('button', { name: btn }) }).last();
  const ingresos = async (p, amt) => { await p.goto(B + '/admin/planes?tab=ing'); await p.getByText(usd(amt), { exact: false }).first().waitFor({ timeout: 20000 }); };
  const aviso = async (p, re) => { const l = p.getByRole('status').filter({ hasText: re }).first(); await l.waitFor({ timeout: 30000 }); return (await l.innerText()).replace(/\s+/g, ' '); };
  const ancho = (p) => p.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  const shot = (p, nom, m = false) => p.screenshot({ path: OUT + `d9t10b-${nom}-${m ? 'm' : 'd'}.png` });
  try {
    const ca = await desk(b), a = await ca.newPage(); abiertas.push(ca); mirar(a, 'admin');
    await entrarComo(a, ADM);
    const stf = uid(ADM);

    console.log('1 · (d) Patrocinio: primero «sin respuesta», después fallida');
    await ingresos(a, P1.amt);
    const f1 = fila(a, P1.amt, /Resolver a mano/);
    const t1 = (await f1.innerText()).replace(/\s+/g, ' ');
    ok(t1.includes(`Devolución que Stripe dio por fallida · ${usd(P1.amt)}`) && t1.includes('sin respuesta de Stripe') && t1.includes('el banco dijo que no o se canceló (card_closed)'),
      'la fila dice lo último que dijo Stripe (el título y «el banco dijo que no o se canceló» con su código), aunque el texto de la alerta sea el de «sin respuesta»');
    ok((await vis(f1.getByRole('button', { name: 'Resolver a mano', exact: true }))) !== null && (await vis(f1.getByRole('button', { name: 'Preguntar a Stripe ahora', exact: true }))) === null,
      'ofrece «Resolver a mano» y ya no «Preguntar a Stripe ahora» (no está en camino)');
    await f1.scrollIntoViewIfNeeded(); await shot(a, 'pat-alerta');
    await clic(f1.getByRole('button', { name: 'Resolver a mano', exact: true }));
    await a.getByText('La devolución se hizo fuera de Stripe').first().waitFor();
    await clic(a.getByText('Se le mandó un cheque al cliente.', { exact: true }));
    await clic(a.getByRole('button', { name: 'Resolver a mano', exact: true }));
    const m1 = await aviso(a, /Resuelta fuera de Stripe/);
    ok(patDe(P1) === `failed|true|${stf}|Se le mandó un cheque al cliente.` && notas(P1.al, 'resuelta_a_mano') === '1' && audit(P1.al, 'dinero.alerta.preguntar') === '1',
      `«Resolver a mano»: le preguntó antes al simulador (no la tiene) y quedó marcada a mano con quién y la nota (${m1})`);
    await shot(a, 'pat-res');

    console.log('2 · (a) «Devolver otra vez» unos boletos');
    await ingresos(a, L1.amt);
    const f2 = fila(a, L1.amt, /Devolver otra vez/);
    ok((await vis(f2.getByRole('button', { name: 'Devolver otra vez', exact: true }))) !== null && (await f2.innerText()).includes(`Devolución que Stripe dio por fallida · ${usd(L1.amt)}`), 'la alerta de la devolución de boletos fallida ofrece «Devolver otra vez»');
    await f2.scrollIntoViewIfNeeded(); await shot(a, 'bol-alerta');
    await clic(f2.getByRole('button', { name: 'Devolver otra vez', exact: true }));
    await a.getByText(`Devolver otra vez · ${usd(L1.amt)}`).first().waitFor();
    ok(await contiene(a, 'Se devuelve lo mismo que falló, a la misma tarjeta, una sola vez. Los boletos siguen devueltos.') && await contiene(a, 'La nota queda en la auditoría con tu nombre.'), 'la hoja dice qué se devuelve y a quién le llega la nota');
    const cta = a.getByRole('button', { name: 'Devolver otra vez', exact: true });
    ok(await cta.last().isDisabled(), 'sin nota, no guarda');
    await arriba(a); await shot(a, 'bol-hoja');
    await clic(a.getByText('Hablé con la persona: quiere su dinero de vuelta.', { exact: true }));
    const pedido = a.waitForRequest((q) => q.method() === 'POST' && !!q.headers()['next-action'] && (q.postData() ?? '').includes(L1.al));
    await clic(cta);
    const q = await pedido;
    const m2 = await aviso(a, /Devueltos otra vez/);
    const o2 = otraDe(L1);
    ok(m2.includes(`Devueltos otra vez ${usd(L1.amt)}`) && o2 === `done|${L1.amt}|bol-otra-${L1.rf}|${L1.rf}`, `el simulador la hizo: UNA devolución de otra vez, hecha, con su llave (${o2}) · «${m2}»`);
    ok(audit(L1.al, 'dinero.alerta.devolver_otra_vez') === '1' && sql(`select count(*) from audit_entries where action = 'dinero.alerta.devolver_otra_vez' and target_id = '${L1.al}' and actor_id = '${stf}' and reason = 'Hablé con la persona: quiere su dinero de vuelta.'`) === '1', 'su auditoría, con quién y por qué');
    ok(notas(L1.al, 'resuelta_sola') === '1' && sql(`select refunded_cents from payments where id = ${L1.pago}`) === String(L1.amt), 'la alerta se cerró sola y el cobro cuenta lo devuelto una vez');
    await shot(a, 'bol-res');
    // El mismo pedido otra vez, tal cual lo mandó la pantalla: no devuelve más.
    const r = await a.evaluate(async ({ url, h, body }) => (await fetch(url, { method: 'POST', headers: h, body })).status, { url: q.url(), h: { 'next-action': q.headers()['next-action'], 'content-type': q.headers()['content-type'] ?? 'text/plain;charset=UTF-8', accept: 'text/x-component' }, body: q.postData() });
    ok(r === 200 && otraDe(L1).split(',').length === 1 && sql(`select refunded_cents from payments where id = ${L1.pago}`) === String(L1.amt) && audit(L1.al, 'dinero.alerta.devolver_otra_vez') === '1', 'el mismo pedido otra vez no devuelve más ni audita otra vez');

    console.log('3 · En el teléfono (390)');
    const cm = await tel390(b), m = await cm.newPage(); abiertas.push(cm); mirar(m, 'tel');
    await entrarComo(m, ADM);
    await ingresos(m, P2.amt);
    let w = await ancho(m);
    const fm = fila(m, P2.amt, /Resolver a mano/);
    ok((await fm.innerText()).includes('el banco dijo que no o se canceló (card_closed)'), 'en el teléfono, la fila dice lo último que dijo Stripe');
    await fm.scrollIntoViewIfNeeded(); await shot(m, 'pat-alerta', true);
    await clic(fm.getByRole('button', { name: 'Resolver a mano', exact: true }));
    await m.getByText('La devolución se hizo fuera de Stripe').first().waitFor();
    w = await ancho(m);
    ok(w.inner === m.viewportSize().width && w.scroll <= w.inner && w.body <= w.inner, `la hoja a ${w.inner} (el ancho del teléfono): innerWidth ${w.inner}, scrollWidth ${w.scroll}, body ${w.body}`);
    await clic(m.getByText('Se le devolvió por transferencia bancaria; comprobante en el caso.', { exact: true }));
    await clic(m.getByRole('button', { name: 'Resolver a mano', exact: true }));
    await aviso(m, /Resuelta fuera de Stripe/);
    ok(patDe(P2) === `failed|true|${stf}|Se le devolvió por transferencia bancaria; comprobante en el caso.`, 'en el teléfono, marcada a mano igual');
    await shot(m, 'pat-res', true);

    console.log('4 · En inglés');
    const ce = await desk(b); abiertas.push(ce);
    await ce.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    const e = await ce.newPage(); mirar(e, 'en');
    await entrarComo(e, ADM);
    await ingresos(e, L2.amt);
    const fe = fila(e, L2.amt, /Refund again/);
    ok((await fe.innerText()).includes(`Refund Stripe marked as failed · ${usd(L2.amt)}`), 'en inglés, el título de la alerta');
    await clic(fe.getByRole('button', { name: 'Refund again', exact: true }));
    await e.getByText(`Refund again · ${usd(L2.amt)}`).first().waitFor();
    ok(await contiene(e, 'The same amount that failed is refunded to the same card, only once. The tickets stay refunded.') && await contiene(e, 'The note stays in the audit log with your name.'), 'en inglés, la hoja');
    ok(otraDe(L2) === '', 'abrir la hoja no cambia nada');

    ok(!err.length, 'sin errores en las páginas' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
    console.log(`\nOK · ${n} comprobaciones`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => undefined);
    await b.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
