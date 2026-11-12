const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const crypto = require('crypto');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const PEDRO = "(select id from users where phone='+15705550133')";
const webhook = async (ev) => { const cuerpo = JSON.stringify(ev), t = Math.floor(Date.now() / 1000), sig = crypto.createHmac('sha256', ENT.sec('STRIPE_WEBHOOK_SECRET')).update(`${t}.${cuerpo}`).digest('hex');
  const r = await fetch(B + '/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${sig}` }, body: cuerpo }); return { st: r.status, j: await r.json().catch(() => ({})) }; };
(async () => {
  // 9b-1 · Sus propios dos pedidos pagados con tarjeta (antes: borraba TODAS las disputas y sus casos de la base y tomaba «el último cobro» de
  // Sabor Dominicano, que en una base nueva no existía y en la vieja era de otra prueba, sin «El negocio lo aceptó» en su línea de tiempo).
  // Dos pedidos de Marisol, terminados, con su línea, sus eventos (enviado → aceptado → listo → recogido) y su cobro capturado del simulador.
  const pedido = (n) => { const k = crypto.randomUUID();
    const num = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, pay_mode, subtotal_cents, tax_cents, total_cents, sent_at, done_at, client_key, is_test)
      values (nextval('operations_order_seq')::text, 'order', 'hzl', '${BIZ}', (select id from users where phone = '+15705550122'), 'done', 'picked_up', 'pickup', 'app', 1650, 99, 1749, now() - interval '3 hours', now() - interval '2 hours', '${k}', true) returning number`).split('\n')[0];
    sql(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct) select o.id, x.id, x.name, 1, 1650, 1650, 6 from operations o, items x where o.client_key = '${k}' and x.business_id = '${BIZ}' and x.removed_at is null order by x.id limit 1`);
    for (const [ev, h] of [['sent', 3], ['accepted', 2.9], ['ready', 2.5], ['picked_up', 2]]) sql(`insert into operation_events (operation_id, kind, actor, actor_id, at) select id, '${ev}', '${ev === 'sent' || ev === 'picked_up' ? 'user' : 'business'}', '${ev === 'sent' || ev === 'picked_up' ? "' || user_id || '" : BIZ}', now() - interval '${h} hours' from operations where client_key = '${k}'`);
    const pi = `pi_sim_disp2r_${n}_${k.slice(0, 8)}`;
    const id = sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, refunded_cents, status, card_brand, card_last4, captured_at, simulated, seq)
      select id, user_id, business_id, city_id, 'full', 'card', '${pi}', 1749, 81, 0, 'captured', 'visa', '4242', now() - interval '2 hours', true, 1 from operations where client_key = '${k}' returning id`).split('\n')[0];
    return [id, num, pi]; };
  const P1 = pedido(1), P2 = pedido(2), st2 = 'captured';
  const n0 = Number(sql(`select count(*) from notifications where tpl = 'biz_dispute' and user_id = ${PEDRO}`)), e0 = Number(sql(`select count(*) from notifications where tpl = 'biz_dispute_end' and user_id = ${PEDRO}`));
  const b = await chromium.launch(); const err = [];
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p = [a];
  a.on('pageerror', e => err.push(e.message)); a.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  await entrar(a, '5705550199');
  // 1) Simular disputa desde Transacciones (sandbox)
  await a.goto(B + `/admin/transacciones?q=${P1[1]}`); await clic(a.getByText('Simular disputa', { exact: true }));
  await clic(a.getByText('No recibió el pedido', { exact: true })); await clic(a.getByText('Prueba de disputa en el sandbox.', { exact: true })); await clic(a.getByRole('button', { name: 'Simular' }).last());
  await a.getByText(/Disputa simulada/).first().waitFor();
  const D1 = sql(`select id from disputes where payment_id = ${P1[0]}`); ok(!!D1 && sql(`select status from disputes where id = ${D1}`) === 'needs_response', 'disputa registrada (falta responder)');
  const Q1 = sql(`select id from queue_items where queue = 'disputa' and subject_id = '${D1}' and status = 'open'`); ok(!!Q1, 'caso abierto en la cola');
  ok(Number(sql(`select count(*) from notifications where tpl = 'biz_dispute' and user_id = ${PEDRO}`)) === n0 + 1, 'aviso al dueño');
  // 2) La cola: evidencia y responder
  await a.goto(B + '/admin/colas?caso=' + Q1); await a.getByText('EVIDENCIA QUE TENEMOS').first().waitFor();
  ok(!!(await vis(a.getByText(new RegExp(`Pedido #${P1[1]} en Sabor Dominicano`)).first())), 'evidencia: el pedido'); ok(!!(await vis(a.getByText(/El negocio lo aceptó/).first())), 'evidencia: línea de tiempo');
  await a.screenshot({ path: OUT + 'r1-disputa-d.png', fullPage: true });
  await clic(a.getByRole('button', { name: 'Responder con evidencia' })); await clic(a.getByText(/The customer placed this order/).first()); await clic(a.getByRole('button', { name: 'Enviar al banco' }));
  await a.getByText(/Respondida. El banco decide/).first().waitFor();
  ok(sql(`select status from disputes where id = ${D1}`) === 'under_review' && sql(`select status from queue_items where id = ${Q1}`) === 'decided', 'respondida: el banco revisa; caso cerrado');
  ok(sql(`select count(*) from audit_entries where action = 'disputa.responder' and at > now() - interval '1 minute'`) !== '0', 'auditado');
  // 3) Resultado del banco (simulado): gana el negocio
  await a.goto(B + `/admin/transacciones?q=${P1[1]}`); await clic(a.getByText('Banco: gana el negocio', { exact: true })); await clic(a.getByText('Prueba en el sandbox.', { exact: true })); await clic(a.getByRole('button', { name: 'Simular' }).last());
  await a.getByText(/El banco dio la razón: el dinero se queda/).first().waitFor();
  ok(sql(`select status from disputes where id = ${D1}`) === 'won', 'ganada'); ok(Number(sql(`select count(*) from notifications where tpl = 'biz_dispute_end' and user_id = ${PEDRO}`)) === e0 + 1, 'resultado al dueño');
  // 4) Webhook real (firmado): charge.dispute.created sobre otro cobro, repetido no duplica
  const ev = { id: 'evt_dp_' + Date.now(), type: 'charge.dispute.created', data: { object: { id: 'dp_test_' + Date.now(), payment_intent: P2[2], amount: 1234, reason: 'fraudulent', status: 'needs_response', evidence_details: { due_by: Math.floor(Date.now() / 1000) + 5 * 86400 } } } };
  const w1 = await webhook(ev), w2 = await webhook(ev); ok(w1.st === 200 && w2.j.repetido === true, 'webhook firmado; el repetido se ignora');
  const D2 = sql(`select id from disputes where stripe_dispute_id = '${ev.data.object.id}'`); ok(!!D2 && sql(`select count(*) from queue_items where queue = 'disputa' and subject_id = '${D2}'`) === '1', 'una sola disputa y un solo caso');
  const bad = await fetch(B + '/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=00' }, body: JSON.stringify(ev) }); ok(bad.status === 400, 'webhook sin firma válida: rechazado');
  // 5) Aceptar devolución desde la cola
  const Q2 = sql(`select id from queue_items where queue = 'disputa' and subject_id = '${D2}' and status = 'open'`);
  await a.goto(B + '/admin/colas?caso=' + Q2); await a.getByText('No hizo la compra').first().waitFor().catch(() => {});
  await clic(a.getByRole('button', { name: 'Aceptar devolución' })); await clic(a.getByText('No tenemos evidencia suficiente.', { exact: true })); await clic(a.getByRole('button', { name: 'Aceptar devolución' }).last());
  await a.getByText(/Aceptada: el dinero vuelve al cliente/).first().waitFor(); ok(sql(`select status from disputes where id = ${D2}`) === 'accepted', 'aceptada');
  const w3 = await webhook({ id: 'evt_dpc_' + Date.now(), type: 'charge.dispute.closed', data: { object: { id: ev.data.object.id, status: 'lost' } } });
  ok(w3.st === 200 && sql(`select status from disputes where id = ${D2}`) === 'accepted', 'un cierre tarde del banco no cambia una disputa ya cerrada');
  // 6) Panel del negocio: Cobros
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })).newPage(); globalThis.__p.push(p); p.on('pageerror', e => err.push(e.message));
  await entrar(p, '5705550133'); await p.goto(B + `/panel/${BIZ}/cobros`); await p.getByText('GANADA', { exact: true }).first().waitFor(); ok(true, 'Cobros del negocio: GANADA');
  await p.screenshot({ path: OUT + 'r2-cobros-m.png', fullPage: true });
  ok(err.length === 0, 'sin errores: ' + err.join(' | '));
  sql(`update payments set status = '${st2}' where id = ${P2[0]}`); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} process.exit(1); });
