// 9w (25 nov, restos de la clase «el dinero dice lo que pasó») · «Rechazar» de Panel › Pedidos y el aviso ord_no, y lo que la cita dice ANTES de actuar.
// Antes: ord_no y «Rechazar» no tenían prueba propia; ord_no caía en «No se te cobró nada» si la consulta del cobro fallaba; las hojas de confirmar de la cita
// decían «Te devolvemos los $X» antes de intentar nada (también de una retención que solo se suelta) y «Te propone otra hora» igual; un cobro que no se hizo
// (failed) salía como «sigue cobrado»; y el panel de citas decía «la solicitud venció y se devolvió el depósito» sin mirar.
//   1. Pedido pagado con tarjeta (retenido) · la dueña lo rechaza desde el detalle del panel: la base (declined, released), la pantalla del cliente y ord_no
//      con lo que pasó («se soltó la retención de $15.00»), y «Liberamos» (pay_released).
//   2. El mismo rechazo con una retención que la pasarela NO suelta (un cobro que no es del simulador): el panel lo dice (retenida), la base sigue held con UNA
//      alerta hold_stuck, ord_no y la pantalla dicen que no se soltó todavía; nunca «No se te cobró nada» a secas.
//   2b. «Rechazar» (pedidoPaso) como otro dueño y como el cliente: ok:false y la base no cambia.
//   3. Cita · la hoja de «Cancelar solicitud» dice lo que se pedirá (ES y EN), nunca «Te devolvemos»; después la pantalla dice lo que pasó. «Te propone otra
//      hora» solo la retención. Un cobro failed dice «El depósito no se cobró»; confirmada con el cobro retenido, «todavía no se cobró», nunca «pagado».
//      El panel que responde una solicitud vencida dice en pantalla lo que pasó con la retención.
// Precondiciones propias (corre dos veces seguidas): su negocio, su dueña y sus clientes (teléfonos 555 libres), sus pedidos, sus citas y sus cobros.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const crypto = require('crypto'); const fs = require('fs');
const { entrarComo, sql } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.S + '/cap/';
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l));
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
// Las acciones del servidor por su id del build (como din9v5): la misma llamada que hace la pantalla, desde una página donde vive la acción.
const MAN = JSON.parse(fs.readFileSync(ENT.RAIZ + '/apps/web/.next/server/server-reference-manifest.json', 'utf8')).node;
const ACT = Object.fromEntries(Object.entries(MAN).map(([id, v]) => [v.exportedName, id]));
const accion = async (p, nombre, args, ruta = null) => {
  if (!ACT[nombre]) throw new Error('acción sin id en el build: ' + nombre);
  const r = await p.evaluate(async ([id, args, ruta]) => { const x = await fetch(ruta ?? location.pathname + location.search, { method: 'POST', headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, body: JSON.stringify(args) }); return { st: x.status, t: await x.text() }; }, [ACT[nombre], args, ruta]);
  const l = r.t.split('\n').find((x) => /^1:/.test(x));
  let j = null; try { j = l ? JSON.parse(l.slice(2)) : null; } catch { j = null; }
  return { st: r.st, j, t: r.t };
};
const aviso = (num, tpl) => sql(`select n.title || ' | ' || n.body from notifications n where n.tpl = '${tpl}' and n.ref_id = '${num}' order by n.id desc limit 1`);
const pago = (num) => sql(`select p.status || '|' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${num}' order by p.id desc limit 1`);
const holdStuck = (num) => sql(`select count(*) from money_alerts a join payments p on a.subject_id = 'liberar:' || p.id join operations o on o.id = p.operation_id where o.number = '${num}' and a.kind = 'hold_stuck'`);
// La alerta hold_stuck de un cobro, cerrada sola (su última nota es «resuelta_sola»: dinero-alertas › cerrarAlertasResueltas, en el barrido).
const alertaCerrada = (num) => sql(`select coalesce((select n.action from money_alert_notes n where n.alert_id = a.id order by n.at desc, n.id desc limit 1), '') from money_alerts a join payments p on a.subject_id = 'liberar:' || p.id join operations o on o.id = p.operation_id where o.number = '${num}' and a.kind = 'hold_stuck'`) === 'resuelta_sola';
const barrer = () => { try { return JSON.parse(require('child_process').execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString()).corrio === true; } catch { return false; } };
const texto = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t0 = Date.now(); for (;;) { const v = await f(); if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 250)); } };

(async () => {
  const persona = (nombre) => { const t = telPropio(); sql(`insert into users (phone, first_name, last_name) values ('+1${t}', '${nombre}', 'Nueve W')`); return { tel: t, id: sql(`select id from users where phone = '+1${t}'`) }; };
  const DUENA = persona('Dueña');
  const BF = `d9w-${RUN}`;
  sql(`insert into businesses (id, city_id, category_id, name, status) values ('${BF}', 'hzl', 'NEG-FOOD', 'Cocina 9w ${RUN}', 'active')`);
  sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${BF}', '${DUENA.id}', 'owner', 'Dueña')`);
  sql(`insert into business_stats_cache (business_id, plan) values ('${BF}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
  sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${BF}', 'acct_sim_${BF}', 'enabled', true, true, true)`);
  const PLATO = primero(sql(`insert into items (business_id, name, price_cents) values ('${BF}', '{"es":"Mofongo 9w","en":"Mofongo 9w"}'::jsonb, 1500) returning id`));
  // Un pedido pendiente de $15 pagado con tarjeta (retenido). atascada: un cobro que no es del simulador (pi_… sin «sim»): la pasarela real contesta que no al
  // soltarlo, como un Stripe caído.
  const pedido = (nombre, { atascada = false } = {}) => {
    const U = persona(nombre), k = crypto.randomUUID();
    const num = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, pay_mode, subtotal_cents, total_cents, sent_at, respond_by, client_key, is_test)
      values (nextval('operations_order_seq')::text, 'order', 'hzl', '${BF}', '${U.id}', 'pending', 'sent', 'pickup', 'app', 1500, 1500, now(), now() + interval '10 minutes', '${k}', true) returning number`).split('\n')[0];
    const op = sql(`select id from operations where client_key = '${k}'`);
    sql(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct) values (${op}, ${PLATO}, '{"es":"Mofongo 9w","en":"Mofongo 9w"}'::jsonb, 1, 1500, 1500, 0)`);
    const pi = atascada ? `pi_9watascada_${RUN}_${op}` : `pi_sim_9w_${RUN}_${op}`;
    if (!atascada) sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', 1500, 0, 'acct_sim_${BF}', 'requires_capture', 0, 0, 'pm_sim_visa_4242_9w', 'manual')`);
    sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, refunded_cents, fee_cents, status, card_brand, card_last4, held_at, simulated)
         values (${op}, '${U.id}', '${BF}', 'hzl', 'full', 'card', '${pi}', 1500, 1500, 0, 0, 'held', 'visa', '4242', now(), ${!atascada})`);
    sql(`update operations set pay_status = 'held' where id = ${op}`);
    return { ...U, num, op };
  };
  const telefono = (b, extra = {}) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ...extra });
  const b = await chromium.launch(); const err = [];
  try {
    const pd = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); pd.on('pageerror', (e) => err.push(e.message));
    await entrarComo(pd, DUENA.tel);
    const rechazar = async (P) => {
      await pd.goto(B + `/panel/${BF}/hoy?det=ped:${P.num}`);
      const det = pd.locator('aside[data-screen-label="Panel v2 · detalle"]');
      await det.getByText('Rechazar', { exact: true }).first().click();
    };

    // ── 1 · Rechazar un pedido pagado con tarjeta: la retención se suelta ──
    console.log('1 · Pedido con tarjeta: la dueña lo rechaza desde el panel (base, pantalla del cliente, ord_no con lo que pasó)');
    const P1 = pedido('Pedido rechazado');
    await rechazar(P1);
    await pd.getByText('Pedido ya ve que no se pudo.').first().waitFor();
    ok(!/no se soltó todavía/.test(await texto(pd)), 'el panel: «… ya ve que no se pudo.», sin decir que la retención sigue');
    ok(sql(`select status from operations where number = '${P1.num}'`) === 'declined', `#${P1.num}: rechazado en la base`);
    ok(await espera(() => pago(P1.num) === 'released|0') && holdStuck(P1.num) === '0', `la retención se soltó (${pago(P1.num)}) y sin alerta hold_stuck`);
    ok(sql(`select status from sim_intents where id = 'pi_sim_9w_${RUN}_${P1.op}'`) === 'canceled', 'en la pasarela (simulador), la intención quedó cancelada: la retención salió de la tarjeta');
    const a1 = aviso(P1.num, 'ord_no');
    ok(a1.includes(`no pudo aceptar tu pedido #${P1.num}. No se te cobró nada: se soltó la retención de $15 de tu tarjeta.`) && !/todavía no se soltó|\{d/.test(a1), `ord_no dice lo que pasó: «se soltó la retención de $15» (${a1})`);
    ok(sql(`select count(*) from notifications where tpl = 'pay_released' and ref_id = '${P1.num}'`) === '1', '«Liberamos …» (pay_released), una vez');
    const m1 = await (await telefono(b)).newPage(); m1.on('pageerror', (e) => err.push(e.message));
    await entrarComo(m1, P1.tel); await m1.goto(B + `/pedido/${P1.num}`);
    await m1.getByText('no pudo aceptarlo.', { exact: false }).first().waitFor();
    const t1 = await texto(m1);
    ok(/no pudo aceptarlo\. No se cobró nada\./.test(t1) && !/todavía no se soltó|Se cobraron/.test(t1), 'la pantalla del cliente: «no pudo aceptarlo. No se cobró nada.»');
    await m1.screenshot({ path: OUT + 'd9w-pedido-rechazado-m.png' });
    await m1.context().close();

    // ── 2 · Rechazar con la retención que la pasarela no suelta ──
    console.log('2 · Pedido con tarjeta: rechazo con una retención que la pasarela no suelta (panel, base, alerta, ord_no y pantalla)');
    const P2 = pedido('Pedido atascado', { atascada: true });
    await rechazar(P2);
    // 26 nov (LAUNCH (2)) · La nota del panel es la del aviso al negocio (devolucion-cancelar › notaAlSoltar).
    await pd.getByText("Pedido ya ve que no se pudo. No se había cobrado nada, pero la retención de $15 de su tarjeta no se soltó todavía: se sigue soltando sola y el equipo de To'Latino ya tiene el aviso.").first().waitFor();
    await pd.screenshot({ path: OUT + 'd9w-panel-rechazar-retenida-d.png' });
    ok(true, 'el panel: «No se había cobrado nada, pero la retención de $15 de su tarjeta no se soltó todavía…»');
    ok(sql(`select status from operations where number = '${P2.num}'`) === 'declined' && pago(P2.num) === 'held|0' && holdStuck(P2.num) === '1', `#${P2.num}: rechazado, la retención sigue (${pago(P2.num)}) y UNA alerta hold_stuck`);
    const a2 = aviso(P2.num, 'ord_no');
    ok(a2.includes('No se cobró nada, pero la retención de $15 todavía no se soltó de tu tarjeta') && !/No se te cobró nada|se soltó la retención de|\{d/.test(a2), `ord_no: no se soltó todavía, nunca «No se te cobró nada» a secas (${a2})`);
    ok(sql(`select count(*) from notifications where tpl = 'pay_released' and ref_id = '${P2.num}'`) === '0', 'sin «Liberamos …»: no se soltó');
    const m2 = await (await telefono(b)).newPage(); m2.on('pageerror', (e) => err.push(e.message));
    await entrarComo(m2, P2.tel); await m2.goto(B + `/pedido/${P2.num}`);
    await m2.getByText('todavía no se soltó de tu tarjeta', { exact: false }).first().waitFor();
    const t2 = await texto(m2);
    ok(/No se cobró nada, pero la retención de \$15 todavía no se soltó de tu tarjeta/.test(t2), 'la pantalla del cliente: la retención de $15.00 todavía no se soltó');
    await m2.screenshot({ path: OUT + 'd9w-pedido-retenida-m.png' });
    await m2.context().close();
    // Precondiciones limpias: la retención atascada vuelve a ser soltable y el barrido del panel (Hoy) la suelta.
    const pi2 = `pi_sim_9w_${RUN}_${P2.op}`;
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi2}', 1500, 0, 'acct_sim_${BF}', 'requires_capture', 0, 0, 'pm_sim_visa_4242_9w', 'manual')`);
    sql(`update payments set stripe_payment_intent = '${pi2}', simulated = true where operation_id = ${P2.op}`);
    await pd.goto(B + `/panel/${BF}/hoy`);
    ok(await espera(() => pago(P2.num) === 'released|0'), `el barrido del panel la soltó después (${pago(P2.num)})`);
    ok(await espera(() => (barrer(), alertaCerrada(P2.num)), 30000) && holdStuck(P2.num) === '1', 'y la alerta hold_stuck se cerró sola en el barrido (resuelta_sola), sin otra alerta');

    // ── 2b · Seguridad: «Rechazar» solo lo puede su negocio ──
    console.log('2b · «Rechazar» como otro dueño y como el cliente: no pasa nada');
    const P3 = pedido('Pedido ajeno');
    const OTRO = persona('Otro dueño'), BO = `d9wo-${RUN}`;
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${BO}', 'hzl', 'NEG-FOOD', 'Otra cocina 9w ${RUN}', 'active')`);
    sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${BO}', '${OTRO.id}', 'owner', 'Otro')`);
    const po = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); po.on('pageerror', (e) => err.push(e.message));
    await entrarComo(po, OTRO.tel); await po.goto(B + `/panel/${BO}/hoy`);
    const ro = await accion(po, 'pedidoPaso', [BF, P3.num, 'rechazar']);
    ok(ro.j?.ok === false, `otro dueño: pedidoPaso de un negocio que no es suyo → ok:false (${JSON.stringify(ro.j?.mensaje ?? ro.st)})`);
    const ro2 = await accion(po, 'pedidoPaso', [BO, P3.num, 'rechazar']);
    ok(ro2.j?.ok === false, `otro dueño: con su propio negocio y un pedido ajeno → ok:false (${JSON.stringify(ro2.j?.mensaje ?? ro2.st)})`);
    await po.context().close();
    const pc = await (await telefono(b)).newPage(); pc.on('pageerror', (e) => err.push(e.message));
    await entrarComo(pc, P3.tel); await pc.goto(B + `/pedido/${P3.num}`);
    const rc = await accion(pc, 'pedidoPaso', [BF, P3.num, 'rechazar'], `/panel/${BF}/hoy`);
    ok(rc.j?.ok === false, `el cliente: pedidoPaso de su propio pedido → ok:false (${JSON.stringify(rc.j?.mensaje ?? rc.st)})`);
    await pc.context().close();
    ok(sql(`select status from operations where number = '${P3.num}'`) === 'pending' && pago(P3.num) === 'held|0' && aviso(P3.num, 'ord_no') === ''
      && sql(`select count(*) from audit_entries where action = 'pedido.rechazar' and before->>'pedido' = '#${P3.num}'`) === '0', `#${P3.num}: sigue pendiente y retenido, sin ord_no ni auditoría de rechazo`);

    // ── 3 · Cita: lo que se dice antes de actuar ──
    console.log('3 · Cita: la hoja de cancelar y «Te propone otra hora» dicen lo que se pedirá; failed; la solicitud vencida en el panel');
    const BC = `d9wc-${RUN}`;
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${BC}', 'hzl', 'NEG-BELL', 'Barbería 9w ${RUN}', 'active')`);
    sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${BC}', '${DUENA.id}', 'owner', 'Dueña')`);
    const MC = sql(`select id from business_members where business_id = '${BC}' and kind = 'owner'`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${BC}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
    sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${BC}', 'acct_sim_${BC}', 'enabled', true, true, true)`);
    // Una cita con su depósito de $20. st: el estado; pay: held (retenido, del simulador) o failed (el cobro no se hizo); vencida: la hora para responder ya pasó.
    const cita = (nombre, { st = 'pending', pay = 'held', vencida = false } = {}) => {
      const U = persona(nombre), num = 'C-' + sql(`select nextval('operations_appt_seq')`);
      const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, details, subtotal_cents, total_cents, deposit_cents, pay_mode, respond_by, answered_at, client_key, is_test)
        values ('${num}', 'appointment', 'hzl', '${BC}', '${U.id}', '${MC}', '${st}', date_trunc('minute', now()) + interval '72 hours', 30,
                '{"svc":{"es":"Corte 9w","en":"Haircut 9w"},"para":"me"}'::jsonb, 6000, 6000, 2000, 'app', now() + interval '${vencida ? '-1 minute' : '2 hours'}', ${st === 'pending' ? 'null' : 'now()'}, gen_random_uuid(), true) returning id`));
      const pi = `pi_sim_9wc_${RUN}_${op}`;
      sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', 2000, 0, 'acct_sim_${BC}', 'requires_capture', 0, 0, 'pm_sim_visa_4242_9w', 'manual')`);
      sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, refunded_cents, fee_cents, status, card_brand, card_last4, held_at, simulated)
           values (${op}, '${U.id}', '${BC}', 'hzl', 'deposit', 'card', '${pi}', 2000, 2000, 0, 0, '${pay}', 'visa', '4242', now(), true)`);
      sql(`update operations set pay_status = '${pay}' where id = ${op}`);
      return { ...U, num, op };
    };
    // La hoja de «Cancelar solicitud» (ES): lo que se pedirá, nunca «Te devolvemos»; al confirmar, la pantalla dice lo que pasó.
    const C1 = cita('Cita solicitud');
    const c1 = await (await telefono(b)).newPage(); c1.on('pageerror', (e) => err.push(e.message));
    await entrarComo(c1, C1.tel); await c1.goto(B + `/cita/${C1.num}`);
    ok((await texto(c1)).includes('Depósito retenido') && !/Depósito cobrado|se devuelve si no se confirma/.test(await texto(c1)), 'mientras espera: «Depósito retenido · se cobra solo si confirman», nunca «Depósito cobrado · se devuelve…»');
    await c1.getByRole('button', { name: 'Cancelar solicitud' }).first().click();
    const hoja = c1.locator('[data-screen-label="Cita · cancelar"]');
    await hoja.getByText('Pedimos que se suelte la retención de $20 de tu tarjeta; aquí ves cuando se suelte.', { exact: false }).first().waitFor();
    ok(!/Te devolvemos/.test((await hoja.innerText())), 'la hoja: «Es gratis. Pedimos que se suelte la retención de $20…», nunca «Te devolvemos»');
    await c1.screenshot({ path: OUT + 'd9w-cita-hoja-cancelar-m.png' });
    await hoja.getByRole('button', { name: 'Sí, cancelar' }).first().click();
    ok(await espera(() => pago(C1.num) === 'released|0'), `cancelada y la retención soltada (${pago(C1.num)})`);
    await c1.goto(B + `/cita/${C1.num}`);
    await c1.getByText('No se cobró nada: se soltó la retención de $20 de tu tarjeta.', { exact: false }).first().waitFor();
    ok(true, 'después: «No se cobró nada: se soltó la retención de $20 de tu tarjeta.»');
    await c1.context().close();
    // La misma hoja en inglés.
    const C2 = cita('Cita ingles');
    const c2 = await (await telefono(b)).newPage(); c2.on('pageerror', (e) => err.push(e.message));
    await entrarComo(c2, C2.tel); await c2.context().addCookies([{ name: 'tl_lang', value: 'en', url: B }]); await c2.goto(B + `/cita/${C2.num}`);
    await c2.getByRole('button', { name: 'Cancel request' }).first().click();
    const hoja2 = c2.locator('[data-screen-label="Cita · cancelar"]');
    await hoja2.getByText('We ask for the $20 hold to come off your card; you see here when it does.', { exact: false }).first().waitFor();
    ok(!/We refund/.test(await hoja2.innerText()), 'EN: «We ask for the $20 hold to come off your card…», never «We refund»');
    await c2.context().close();
    // «Te propone otra hora»: lo que se pedirá si no te sirve.
    const C3 = cita('Cita otra hora', { st: 'change_proposed' });
    const ymd = sql(`select ((now() at time zone 'America/New_York')::date + 4)::text`);
    sql(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by) values (${C3.op}, 'time', '{"ymd":"${ymd}","m":600,"member":"${MC}"}'::jsonb, '${DUENA.id}', 'business', now() + interval '2 hours')`);
    const c3 = await (await telefono(b)).newPage(); c3.on('pageerror', (e) => err.push(e.message));
    await entrarComo(c3, C3.tel); await c3.goto(B + `/cita/${C3.num}`);
    await c3.getByText('Si no te sirve, pedimos que se suelte la retención de $20 de tu tarjeta.', { exact: false }).first().waitFor();
    const t3 = await texto(c3);
    ok(!/te devolvemos|pedimos la devolución/i.test(t3), '«Te propone otra hora»: «Si no te sirve, pedimos que se suelte la retención de $20…», nunca «te devolvemos» ni «pedimos la devolución»');
    ok(t3.includes('se cobra solo si aceptas la otra hora') && !t3.includes('se cobra solo si confirman'), 'la fila: «Depósito retenido · se cobra solo si aceptas la otra hora»');
    await c3.context().close();
    // Un cobro que no se hizo (failed): lo que es, nunca «sigue cobrado».
    const C4 = cita('Cita failed', { st: 'declined', pay: 'failed' });
    const c4 = await (await telefono(b)).newPage(); c4.on('pageerror', (e) => err.push(e.message));
    await entrarComo(c4, C4.tel); await c4.goto(B + `/cita/${C4.num}`);
    await c4.getByText('El cobro del depósito de $20 no se hizo: no se te cobró nada.', { exact: false }).first().waitFor();
    const t4 = await texto(c4);
    ok(t4.includes('El depósito no se cobró') && !/sigue cobrado|Depósito cobrado|Te devolv/.test(t4), 'failed: «El cobro del depósito de $20 no se hizo» y «El depósito no se cobró», nunca «sigue cobrado»');
    await c4.screenshot({ path: OUT + 'd9w-cita-failed-m.png' });
    await c4.context().close();
    // Confirmada con la captura que no salió (el cobro sigue retenido): «Depósito retenido · todavía no se cobró», nunca «Depósito pagado».
    const C6 = cita('Cita sin captura', { st: 'confirmed' });
    const c6 = await (await telefono(b)).newPage(); c6.on('pageerror', (e) => err.push(e.message));
    await entrarComo(c6, C6.tel); await c6.goto(B + `/cita/${C6.num}`);
    await c6.getByText('todavía no se cobró', { exact: false }).first().waitFor();
    const t6 = await texto(c6);
    ok(t6.includes('Depósito retenido') && !/Depósito pagado|se descuenta del total|se descontó del total/.test(t6) && pago(C6.num) === 'held|0', 'confirmada y retenida: «Depósito retenido · todavía no se cobró», nunca «Depósito pagado»');
    await c6.screenshot({ path: OUT + 'd9w-cita-confirmada-retenida-m.png' });
    await c6.context().close();
    // El panel responde una solicitud que venció mientras la miraba: lo que pasó con la retención, en la pantalla, nunca «se devolvió el depósito».
    const C5 = cita('Cita vencida');
    await pd.goto(B + `/panel/${BC}/hoy?det=cita:${C5.num}`);
    const det5 = pd.locator('aside[data-screen-label="Panel v2 · detalle"]');
    await det5.getByRole('button', { name: 'Confirmar' }).first().waitFor();
    sql(`update operations set respond_by = now() - interval '1 minute' where id = ${C5.op}`);
    await det5.getByRole('button', { name: 'Confirmar' }).first().click();
    await pd.getByText('Pasó el tiempo para responder: la solicitud venció. No se había cobrado nada: se soltó la retención de $20 de su tarjeta.').first().waitFor();
    ok(!/se devolvió el depósito/.test(await texto(pd)), 'el panel, en pantalla: «venció. No se había cobrado nada: se soltó la retención de $20», nunca «se devolvió el depósito»');
    await pd.screenshot({ path: OUT + 'd9w-panel-cita-vencida-d.png' });
    ok(pago(C5.num) === 'released|0' && sql(`select status from operations where number = '${C5.num}'`) === 'expired', `la base: vencida y soltada (${pago(C5.num)})`);
    ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  } finally { await b.close(); }
  console.log(`\nOK din9w (${n} ✓)`);
})().catch((e) => { console.error(e); process.exit(1); });
