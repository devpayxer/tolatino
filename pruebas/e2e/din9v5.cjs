// 9v (25 nov, quinta tanda) · Lo que se le dice AL NEGOCIO cuando cancela quien pagó, y la retención que se suelta sin cancelación (vence, «No hay mesa»,
// «No me sirve»…), dichos como pasaron y no como se decidieron. Antes biz_noche_cx decía «Se le devuelve el depósito de $X» sin mirar a la pasarela (y
// «El depósito de $X se queda contigo» con el depósito entero aunque ya hubiera una devolución parcial); y quien soltaba una retención tiraba lo que
// contestaba liberarOperacion: noche_no / biz_noche_alt_no decían «Se liberó tu/su depósito» y el panel «se liberó su depósito» aunque la pasarela no la
// hubiera soltado (sigue en la tarjeta, sin alerta a nadie). Ahora (cobros › soltarRetencion, devolucion-cancelar › dineroAlNegocio, 0222):
//   1. Noche · el cliente cancela antes del corte: devuelta y Stripe dice que no → biz_noche_cx dice «Se le devolvieron $40.00» / «no salió»; tarde con una
//      devolución parcial previa → «Lo que quedaba del depósito ($25) se queda contigo» (al local y al cliente).
//   2. Noche · «No hay mesa» con una retención que la pasarela NO suelta (un cobro que no es del simulador: la pasarela real contesta que no): sigue
//      retenida, UNA alerta hold_stuck, noche_no lo dice (ES), el panel recibe retenida; nunca «Se liberó tu depósito».
//   3. Noche · «No me sirve» desde el teléfono con la retención que no se suelta: la pantalla y biz_noche_alt_no lo dicen; cuando la retención vuelve a ser
//      soltable, el panel (Hoy: el barrido repararPagos) la suelta y entonces sí llega «Liberamos» (pay_released).
//   4. Cita · el cliente cancela (sexta tanda, 0223): a tiempo y devuelta → «Te devolvimos $20» (pantalla) y «Se le devolvieron $20.00» (biz_cita_cx); a tiempo y
//      Stripe dice que no → «no salió» en los dos (nunca «Te devolvemos» ni «Se queda con»); tarde con una devolución parcial → lo que quedaba ($15).
//   5. Apartado con envío y 6. mercado · cancelar con la retención que la pasarela no suelta: la acción lo dice (retenida), la pantalla también (nunca «Se
//      liberó lo retenido» ni «Liberamos la retención»), sigue retenida y hay UNA alerta hold_stuck.
// Precondiciones propias (corre dos veces seguidas): su negocio, su dueña y sus clientes (teléfonos 555 libres), su mesa y los cobros.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const crypto = require('crypto'); const fs = require('fs');
const { entrarComo, sql } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.S + '/cap/';
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l));
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
// Las acciones del servidor por su id del build (como din9v3/din9v4): la misma llamada que hace la pantalla, desde una página donde vive la acción.
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
const pago = (num) => sql(`select p.status || '|' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${num}' order by p.id desc limit 1`);
const holdStuck = (num) => sql(`select count(*) from money_alerts a join payments p on a.subject_id = 'liberar:' || p.id join operations o on o.id = p.operation_id where o.number = '${num}' and a.kind = 'hold_stuck'`);
const texto = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t0 = Date.now(); for (;;) { const v = await f(); if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 250)); } };

(async () => {
  const persona = (nombre) => { const t = telPropio(); sql(`insert into users (phone, first_name, last_name) values ('+1${t}', '${nombre}', 'Nueve V')`); return { tel: t, id: sql(`select id from users where phone = '+1${t}'`) }; };
  const DUENA = persona('Dueña');
  const BN = `d9v5n-${RUN}`;
  sql(`insert into businesses (id, city_id, category_id, name, status) values ('${BN}', 'hzl', 'NEG-NOCHE', 'Noche 9v5 ${RUN}', 'active')`);
  sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${BN}', '${DUENA.id}', 'owner', 'Dueña')`);
  sql(`insert into business_stats_cache (business_id, plan) values ('${BN}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
  sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${BN}', 'acct_sim_${BN}', 'enabled', true, true, true)`);
  const SN = primero(sql(`insert into items (business_id, name, price_cents) values ('${BN}', '{"es":"Mesa 9v5 ${RUN}","en":"Table 9v5 ${RUN}"}'::jsonb, 0) returning id`));
  // Una mesa con su depósito de $40. st: 'confirmed' | 'pending' | 'change_proposed'; cut: el corte (minutos desde el mediodía de esa noche).
  const mesa = (nombre, { st = 'confirmed', cut = 1290 } = {}) => {
    const U = persona(nombre), num = `N-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`;
    const det = JSON.stringify({ k: 'mesa', item: SN, svc: { es: `Mesa 9v5 ${RUN}`, en: `Table 9v5 ${RUN}` }, arrive: 1320, occ: null, door_cents: null, list_until: null, cover_cents: 0, after: null, min_cents: 12000, hr: false, edad: 21, hold: 30, sms: true, cut, inc: [] });
    const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, night_date, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key, is_test, confirmed_at, respond_by)
      values ('${num}', 'night', 'hzl', '${BN}', '${U.id}', '${st}', ((now() at time zone 'America/New_York')::date + 3 + time '22:00') at time zone 'America/New_York', 60, '${det}'::jsonb, 4,
              (now() at time zone 'America/New_York')::date + 3, 0, 0, 4000, 'app', gen_random_uuid(), true, ${st === 'confirmed' ? 'now()' : 'null'}, ${st === 'confirmed' ? 'null' : "now() + interval '25 minutes'"}) returning id`));
    return { ...U, num, op };
  };
  // El cobro del depósito: cobrado (captured / con devolución parcial / que Stripe no devuelve) o solo retenido. atascada: un cobro que no es del
  // simulador (pi_… sin «sim»): la pasarela real contesta que no al soltarlo, como un Stripe caído.
  const cobro = (m, { retenido = false, rechaza = false, parcial = 0, atascada = false } = {}) => {
    const pi = atascada ? `pi_9v5atascada_${RUN}_${m.op}` : `pi_sim_9v5_${RUN}_${m.op}`;
    if (!atascada) sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', 4000, 0, 'acct_sim_${BN}', '${retenido ? 'requires_capture' : 'succeeded'}', ${retenido ? 0 : 4000}, ${rechaza ? 4000 : parcial}, 'pm_sim_visa_4242_9v5', 'manual')`);
    const st = retenido ? 'held' : parcial ? 'partially_refunded' : 'captured';
    sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, refunded_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated)
         values (${m.op}, '${m.id}', '${BN}', 'hzl', 'deposit', 'card', '${pi}', 4000, 4000, ${parcial}, 0, '${st}', 'visa', '4242', now(), ${retenido ? 'null' : 'now()'}, ${!atascada})`);
    sql(`update operations set pay_status = '${st}' where id = ${m.op}`);
  };
  const telefono = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const b = await chromium.launch(); const err = [];
  try {
    // ── 1 · El cliente cancela: lo que se le dice al local ──
    console.log('1 · Noche: el cliente cancela (devuelta · Stripe dice que no · tarde con devolución parcial): biz_noche_cx dice lo que pasó');
    const N1 = mesa('Cancela sale'), N2 = mesa('Cancela rechazo'), N3 = mesa('Cancela tarde', { cut: -100000 });
    cobro(N1); cobro(N2, { rechaza: true }); cobro(N3, { parcial: 1500 });
    for (const N of [N1, N2, N3]) {
      const m = await (await telefono(b)).newPage(); m.on('pageerror', (e) => err.push(e.message));
      await entrarComo(m, N.tel); await m.goto(B + `/noche/${N.num}`);
      const r = await accion(m, 'nocheAccion', [N.num, 'cancelar']);
      ok(r.j?.ok === true && sql(`select status || '|' || cancelled_by from operations where number = '${N.num}'`) === 'cancelled|user', `${N.num}: el cliente canceló`);
      await m.context().close();
    }
    ok(pago(N1.num) === 'refunded|4000' && pago(N2.num) === 'captured|0' && pago(N3.num) === 'partially_refunded|1500', `la base: devuelta · sin devolver · nada más devuelto (${pago(N1.num)} · ${pago(N2.num)} · ${pago(N3.num)})`);
    const b1 = aviso(N1.num, 'biz_noche_cx'), b2 = aviso(N2.num, 'biz_noche_cx'), b3 = aviso(N3.num, 'biz_noche_cx');
    ok(b1.includes('canceló su Mesa 9v5') && b1.includes('Se le devolvieron $40 a su tarjeta.') && !/Se le devuelve|\{d/.test(b1), `al local, la devuelta: «Se le devolvieron $40» (${b1})`);
    ok(b2.includes("La devolución de $40 no salió: el equipo de To'Latino ya tiene el aviso") && !/Se le devuelve|devolvieron|\{d/.test(b2), `al local, la que Stripe no devolvió: «no salió», nunca «Se le devuelve» (${b2})`);
    ok(/Lo que quedaba del depósito \(\$25(\.00)?\) se queda contigo\./.test(b3) && !/\$40|\{d/.test(b3), `al local, tarde con devolución parcial: lo que queda ($25), no el depósito entero (${b3})`);
    const c3 = aviso(N3.num, 'noche_cx');
    ok(/Lo que quedaba del depósito \(\$25(\.00)?\) se quedó con Noche 9v5/.test(c3) && !/\$40/.test(c3), `al cliente, lo mismo (${c3})`);

    // ── 2 · «No hay mesa» con la retención que la pasarela no suelta ──
    console.log('2 · Noche: «No hay mesa» con una retención que la pasarela no suelta: retenida, UNA alerta, el aviso y el panel lo dicen');
    const N4 = mesa('No hay mesa', { st: 'pending' }); cobro(N4, { retenido: true, atascada: true });
    const pd = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); pd.on('pageerror', (e) => err.push(e.message));
    await entrarComo(pd, DUENA.tel); await pd.goto(B + `/panel/${BN}`);
    const r4 = await accion(pd, 'nocheResponder', [BN, N4.num, 'nohay']);
    ok(r4.j?.ok === true && r4.j?.soltada?.e === 'retenida' && sql(`select status from operations where number = '${N4.num}'`) === 'declined', `el local dijo «No hay mesa» y el panel sabe que la retención no se soltó (${JSON.stringify(r4.j)})`);
    ok(pago(N4.num) === 'held|0' && holdStuck(N4.num) === '1', `la retención sigue en la tarjeta (${pago(N4.num)}) y el equipo de dinero tiene UNA alerta hold_stuck`);
    const a4 = aviso(N4.num, 'noche_no');
    ok(a4.includes('No se cobró nada, pero la retención de $40 todavía no se soltó de tu tarjeta') && !/Se liberó/.test(a4), `noche_no lo dice, nunca «Se liberó tu depósito» (${a4})`);
    ok(sql(`select count(*) from notifications where tpl = 'pay_released' and ref_id = '${N4.num}'`) === '0', 'sin «Liberamos …» (pay_released): no se soltó');

    // ── 3 · «No me sirve» desde el teléfono con la retención que no se suelta ──
    console.log('3 · Noche: «No me sirve» con la retención que no se suelta (pantalla, aviso al local); después el barrido la suelta');
    const N5 = mesa('No me sirve', { st: 'change_proposed' }); cobro(N5, { retenido: true, atascada: true });
    sql(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by) values (${N5.op}, 'time', '{"m":1380}'::jsonb, '${DUENA.id}', 'business', now() + interval '25 minutes')`);
    const m5 = await (await telefono(b)).newPage(); m5.on('pageerror', (e) => err.push(e.message));
    await entrarComo(m5, N5.tel); await m5.goto(B + `/noche/${N5.num}`);
    await m5.getByRole('button', { name: 'No me sirve' }).first().click();
    // 26 nov (LAUNCH (2)) · La nota de la pantalla es la del aviso (devolucion-cancelar › notaAlSoltar).
    await m5.getByText("Listo. No se cobró nada, pero la retención de $40 todavía no se soltó de tu tarjeta: la seguimos soltando sola y el equipo de To'Latino ya tiene el aviso.").first().waitFor();
    const t5 = await texto(m5);
    ok(!/se liberó tu depósito/i.test(t5), 'la pantalla: «La retención todavía no se soltó…», nunca «Listo: se liberó tu depósito»');
    await m5.screenshot({ path: OUT + 'd9v5-noche-no-me-sirve-retenida-m.png' });
    ok(await espera(() => sql(`select status from operations where number = '${N5.num}'`) === 'cancelled') && pago(N5.num) === 'held|0' && holdStuck(N5.num) === '1', `${N5.num}: cancelada, la retención sigue y UNA alerta hold_stuck`);
    const a5 = aviso(N5.num, 'biz_noche_alt_no');
    ok(a5.includes('no aceptó la otra hora. No se había cobrado nada, pero la retención de $40 de su tarjeta no se soltó todavía') && !/Se liberó su depósito/.test(a5), `biz_noche_alt_no lo dice, nunca «Se liberó su depósito» (${a5})`);
    // Cuando la retención vuelve a ser soltable (aquí: la del simulador), el panel (Hoy · repararPagos) la suelta y entonces sí llega «Liberamos».
    const pi5 = `pi_sim_9v5_${RUN}_${N5.op}`;
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi5}', 4000, 0, 'acct_sim_${BN}', 'requires_capture', 0, 0, 'pm_sim_visa_4242_9v5', 'manual')`);
    sql(`update payments set stripe_payment_intent = '${pi5}', simulated = true where operation_id = ${N5.op}`);
    await pd.goto(B + `/panel/${BN}/hoy`);
    ok(await espera(() => pago(N5.num) === 'released|0'), `el barrido del panel la soltó después (${pago(N5.num)})`);
    ok(sql(`select count(*) from notifications where tpl = 'pay_released' and ref_id = '${N5.num}'`) === '1' && holdStuck(N5.num) === '1', 'ahora sí «Liberamos …» (pay_released), una vez; y no hay otra alerta');
    // La de «No hay mesa» también se vuelve soltable: así el barrido no la reintenta para siempre (precondiciones limpias para la próxima corrida).
    const pi4 = `pi_sim_9v5_${RUN}_${N4.op}`;
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi4}', 4000, 0, 'acct_sim_${BN}', 'requires_capture', 0, 0, 'pm_sim_visa_4242_9v5', 'manual')`);
    sql(`update payments set stripe_payment_intent = '${pi4}', simulated = true where operation_id = ${N4.op}`);
    await pd.goto(B + `/panel/${BN}/hoy`);
    ok(await espera(() => pago(N4.num) === 'released|0'), `y la de «No hay mesa» también (${pago(N4.num)})`);

    // ── 4 · Cita · el cliente cancela (sexta tanda, 0223) ──
    console.log('4 · Cita: el cliente cancela a tiempo (devuelta · Stripe dice que no) y tarde con una devolución parcial: base, pantalla y biz_cita_cx');
    const BC = `d9v5c-${RUN}`;
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${BC}', 'hzl', 'NEG-BELL', 'Barbería 9v5 ${RUN}', 'active')`);
    sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${BC}', '${DUENA.id}', 'owner', 'Dueña')`);
    const MC = sql(`select id from business_members where business_id = '${BC}' and kind = 'owner'`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${BC}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
    sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${BC}', 'acct_sim_${BC}', 'enabled', true, true, true)`);
    // Una cita confirmada con su depósito de $20 cobrado. horas: cuánto falta (con 2 h de cancelación gratis, 72 h es a tiempo y 1 h es tarde).
    const cita = (nombre, { horas = 72, rechaza = false, parcial = 0 } = {}) => {
      const U = persona(nombre), num = 'C-' + sql(`select nextval('operations_appt_seq')`);
      const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, details, subtotal_cents, total_cents, deposit_cents, pay_mode, confirmed_at, answered_at, client_key, is_test)
        values ('${num}', 'appointment', 'hzl', '${BC}', '${U.id}', '${MC}', 'confirmed', date_trunc('minute', now()) + interval '${horas} hours', 30,
                '{"svc":{"es":"Corte 9v5","en":"Haircut 9v5"},"para":"me"}'::jsonb, 6000, 6000, 2000, 'app', now(), now(), gen_random_uuid(), true) returning id`));
      const pi = `pi_sim_9v5c_${RUN}_${op}`;
      sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', 2000, 0, 'acct_sim_${BC}', 'succeeded', 2000, ${rechaza ? 2000 : parcial}, 'pm_sim_visa_4242_9v5', 'manual')`);
      const st = parcial ? 'partially_refunded' : 'captured';
      sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, refunded_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated)
           values (${op}, '${U.id}', '${BC}', 'hzl', 'deposit', 'card', '${pi}', 2000, 2000, ${parcial}, 0, '${st}', 'visa', '4242', now(), now(), true)`);
      if (parcial) sql(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key, done_at) select id, ${parcial}, 'Ayuda con la cita', 'business', 'done', 'd9v5c-parcial-${RUN}-${op}', now() from payments where operation_id = ${op}`);
      sql(`update operations set pay_status = '${st}' where id = ${op}`);
      return { ...U, num, op };
    };
    const C1 = cita('Cita sale'), C2 = cita('Cita rechazo', { rechaza: true }), C3 = cita('Cita tarde', { horas: 1, parcial: 500 });
    const vistas = {};
    for (const C of [C1, C2, C3]) {
      const m = await (await telefono(b)).newPage(); m.on('pageerror', (e) => err.push(e.message));
      await entrarComo(m, C.tel); await m.goto(B + `/cita/${C.num}`);
      const r = await accion(m, 'citaAccion', [C.num, 'cancelar']);
      ok(r.j?.ok === true && !r.j?.soltada && sql(`select status || '|' || cancelled_by from operations where number = '${C.num}'`) === 'cancelled|user', `${C.num}: el cliente canceló (${JSON.stringify(r.j)})`);
      await m.goto(B + `/cita/${C.num}`); await m.getByText('CANCELADA').first().waitFor();
      vistas[C.num] = { m, t: await texto(m) };
    }
    ok(pago(C1.num) === 'refunded|2000' && pago(C2.num) === 'captured|0' && pago(C3.num) === 'partially_refunded|500', `la base: devuelta · sin devolver · nada más devuelto (${pago(C1.num)} · ${pago(C2.num)} · ${pago(C3.num)})`);
    ok(sql(`select string_agg(r.status, ',' order by r.id) from refunds r join payments p on p.id = r.payment_id where p.operation_id = ${C2.op}`) === 'failed', 'la de Stripe que dijo que no queda «failed» en la base');
    const t1 = vistas[C1.num].t, t2 = vistas[C2.num].t, t3 = vistas[C3.num].t;
    ok(t1.includes('Cancelaste a tiempo. Te devolvimos $20 a tu tarjeta · 3 a 5 días hábiles.') && t1.includes('Depósito devuelto') && !/Te devolvemos/.test(t1), 'pantalla, la devuelta: «Te devolvimos $20 a tu tarjeta», nunca «Te devolvemos»');
    ok(t2.includes('La devolución de $20 no salió: escríbenos en Soporte y lo resolvemos.') && t2.includes('La devolución no salió') && !/Te devolv|Se queda con/.test(t2), 'pantalla, la que Stripe no devolvió: «no salió», nunca «Te devolvemos» ni «Se queda con»');
    await vistas[C2.num].m.screenshot({ path: OUT + 'd9v5-cita-devolucion-no-salio-m.png' });
    ok(/lo que quedaba del depósito \(\$15\) se quedó con Barbería 9v5/.test(t3) && !/depósito de \$20 se queda/.test(t3), 'pantalla, tarde con devolución parcial: lo que quedaba ($15), no el depósito entero');
    for (const C of [C1, C2, C3]) await vistas[C.num].m.context().close();
    const k1 = aviso(C1.num, 'biz_cita_cx'), k2 = aviso(C2.num, 'biz_cita_cx'), k3 = aviso(C3.num, 'biz_cita_cx');
    ok(k1.includes('canceló Corte 9v5') && k1.includes('Se le devolvieron $20 a su tarjeta.') && !/\{d/.test(k1), `al negocio, la devuelta: «Se le devolvieron $20» (${k1})`);
    ok(k2.includes("La devolución de $20 no salió: el equipo de To'Latino ya tiene el aviso") && !/devolvieron|\{d/.test(k2), `al negocio, la que Stripe no devolvió: «no salió» (${k2})`);
    ok(k3.includes('Lo que quedaba del depósito ($15) se queda contigo.') && !/\$20|\{d/.test(k3), `al negocio, tarde con devolución parcial: lo que queda ($15) (${k3})`);

    // Una solicitud (pendiente) con el depósito solo retenido, que la pasarela no suelta: «Cancelar solicitud» desde el teléfono lo dice (retenida) y la
    // pantalla también, nunca «Te devolvemos»; sigue retenida y UNA alerta hold_stuck; al negocio, que no se soltó todavía.
    const C4 = persona('Cita atascada'), C4N = 'C-' + sql(`select nextval('operations_appt_seq')`);
    const C4O = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, details, subtotal_cents, total_cents, deposit_cents, pay_mode, respond_by, client_key, is_test)
      values ('${C4N}', 'appointment', 'hzl', '${BC}', '${C4.id}', '${MC}', 'pending', date_trunc('minute', now()) + interval '72 hours', 30,
              '{"svc":{"es":"Corte 9v5","en":"Haircut 9v5"},"para":"me"}'::jsonb, 6000, 6000, 2000, 'app', now() + interval '2 hours', gen_random_uuid(), true) returning id`));
    sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, refunded_cents, fee_cents, status, card_brand, card_last4, held_at, simulated)
         values (${C4O}, '${C4.id}', '${BC}', 'hzl', 'deposit', 'card', 'pi_9v5atascada_${RUN}_${C4O}', 2000, 2000, 0, 0, 'held', 'visa', '4242', now(), false)`);
    const m4 = await (await telefono(b)).newPage(); m4.on('pageerror', (e) => err.push(e.message));
    await entrarComo(m4, C4.tel); await m4.goto(B + `/cita/${C4N}`);
    await m4.getByRole('button', { name: 'Cancelar solicitud' }).first().click();
    await m4.getByRole('button', { name: 'Sí, cancelar' }).first().click();
    await m4.getByText("Listo. No se cobró nada, pero la retención de $20 todavía no se soltó de tu tarjeta: la seguimos soltando sola y el equipo de To'Latino ya tiene el aviso.").first().waitFor();
    ok(sql(`select status from operations where number = '${C4N}'`) === 'cancelled' && pago(C4N) === 'held|0' && holdStuck(C4N) === '1', `${C4N}: cancelada, la retención sigue (${pago(C4N)}) y UNA alerta hold_stuck`);
    await m4.getByText('No se cobró nada, pero la retención de $20 todavía no se soltó de tu tarjeta').first().waitFor();
    const t4 = await texto(m4);
    ok(!/Te devolv|Depósito devuelto/.test(t4) && t4.includes('Depósito retenido'), 'la pantalla de la cita: «la retención de $20 todavía no se soltó» y «Depósito retenido», nunca «Te devolvemos» ni «Depósito devuelto»');
    await m4.screenshot({ path: OUT + 'd9v5-cita-retenida-m.png' });
    await m4.context().close();
    const k4 = aviso(C4N, 'biz_cita_cx');
    ok(k4.includes('No se había cobrado nada, pero la retención de $20 de su tarjeta no se soltó todavía') && !/\{d/.test(k4), `al negocio, la retención que no se soltó (${k4})`);

    // ── 5 · Apartado con envío · el cliente cancela y la retención no se suelta ──
    console.log('5 · Apartado con envío: cancelar con una retención que la pasarela no suelta (pantalla, aviso en la pantalla, base)');
    const BT = `d9v5t-${RUN}`;
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${BT}', 'hzl', 'NEG-TIENDA', 'Tienda 9v5 ${RUN}', 'active')`);
    sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${BT}', '${DUENA.id}', 'owner', 'Dueña')`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${BT}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
    sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${BT}', 'acct_sim_${BT}', 'enabled', true, true, true)`);
    const UA = persona('Apartado atascado'), AN = 'A-' + sql(`select nextval('hold_seq')`);
    const AO = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, scheduled_at, ready_at, respond_by, details, subtotal_cents, delivery_cents, total_cents, pay_mode, client_key, is_test)
      values ('${AN}', 'hold', 'hzl', '${BT}', '${UA.id}', 'pending', 'sent', 'delivery', now(), now() + interval '6 days', now() + interval '4 hours',
              '{"sms":true,"como":"envio","ship":true,"to":{"label":"casa","street":"420 N Wyoming St"},"ship_days":"3-5","hold_hours":48}'::jsonb, 2500, 500, 3000, 'app', gen_random_uuid(), true) returning id`));
    sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, refunded_cents, fee_cents, status, card_brand, card_last4, held_at, simulated)
         values (${AO}, '${UA.id}', '${BT}', 'hzl', 'full', 'card', 'pi_9v5atascada_${RUN}_${AO}', 3000, 3000, 0, 0, 'held', 'visa', '4242', now(), false)`);
    const ma = await (await telefono(b)).newPage(); ma.on('pageerror', (e) => err.push(e.message));
    await entrarComo(ma, UA.tel); await ma.goto(B + `/apartado/${AN}`);
    await ma.getByRole('button', { name: 'Cancelar', exact: true }).first().click();
    await ma.getByRole('button', { name: 'Sí, cancelar' }).first().click();
    await ma.getByText("Listo. No se cobró nada, pero la retención de $30 todavía no se soltó de tu tarjeta: la seguimos soltando sola y el equipo de To'Latino ya tiene el aviso.").first().waitFor();
    ok(sql(`select status from operations where number = '${AN}'`) === 'cancelled' && pago(AN) === 'held|0' && holdStuck(AN) === '1', `${AN}: cancelado, la retención sigue en la tarjeta (${pago(AN)}) y UNA alerta hold_stuck`);
    await ma.getByText('No se cobró nada, pero la retención de $30 todavía no se soltó de tu tarjeta').first().waitFor();
    const ta = await texto(ma);
    ok(!/Se liberó lo retenido/.test(ta), 'la pantalla del apartado: «la retención de $30 todavía no se soltó», nunca «Se liberó lo retenido»');
    await ma.screenshot({ path: OUT + 'd9v5-apartado-retenida-m.png' });
    await ma.context().close();

    // ── 6 · Mercado · el cliente cancela y la retención no se suelta ──
    console.log('6 · Mercado: cancelar con una retención que la pasarela no suelta (la acción y la pantalla lo dicen)');
    const BM = `d9v5m-${RUN}`;
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${BM}', 'hzl', 'NEG-MERC', 'Mercado 9v5 ${RUN}', 'active')`);
    sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${BM}', '${DUENA.id}', 'owner', 'Dueña')`);
    sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${BM}', 'acct_sim_${BM}', 'enabled', true, true, true)`);
    const UM = persona('Mercado atascado'), MN = 'M-' + sql(`select nextval('market_seq')`);
    const MO = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, mode, scheduled_at, respond_by, details, subtotal_cents, total_cents, pay_mode, client_key, is_test)
      values ('${MN}', 'market_order', 'hzl', '${BM}', '${UM.id}', 'pending', 'pickup', now() + interval '2 hours', now() + interval '10 minutes', '{"est_cents":2500}'::jsonb, 2500, 2500, 'app', gen_random_uuid(), true) returning id`));
    sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, refunded_cents, fee_cents, status, card_brand, card_last4, held_at, simulated)
         values (${MO}, '${UM.id}', '${BM}', 'hzl', 'full', 'card', 'pi_9v5atascada_${RUN}_${MO}', 2500, 2500, 0, 0, 'held', 'visa', '4242', now(), false)`);
    const mm = await (await telefono(b)).newPage(); mm.on('pageerror', (e) => err.push(e.message));
    await entrarComo(mm, UM.tel); await mm.goto(B + `/mercado/${MN}`);
    const rm = await accion(mm, 'mercCancelar', [MN]);
    ok(rm.j?.ok === true && rm.j?.soltada?.e === 'retenida' && sql(`select status from operations where number = '${MN}'`) === 'cancelled' && pago(MN) === 'held|0' && holdStuck(MN) === '1', `${MN}: cancelado, retenida y UNA alerta hold_stuck (${JSON.stringify(rm.j)})`);
    await mm.goto(B + `/mercado/${MN}`); await mm.getByText('CANCELADO').first().waitFor();
    const tm = await texto(mm);
    ok(tm.includes('No se cobró nada, pero la retención de $25 todavía no se soltó de tu tarjeta') && !/Liberamos la retención/.test(tm), 'la pantalla del mercado: «la retención de $25 todavía no se soltó», nunca «Liberamos la retención»');
    await mm.context().close();
    // Precondiciones limpias para la próxima corrida: las dos retenciones atascadas vuelven a ser soltables (el barrido las suelta; nada queda reintentándose).
    for (const [op, biz, amt] of [[AO, BT, 3000], [MO, BM, 2500], [C4O, BC, 2000]]) {
      const pi = `pi_sim_9v5_${RUN}_${op}`;
      sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', ${amt}, 0, 'acct_sim_${biz}', 'requires_capture', 0, 0, 'pm_sim_visa_4242_9v5', 'manual')`);
      sql(`update payments set stripe_payment_intent = '${pi}', simulated = true where operation_id = ${op}`);
    }
    ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  } finally { await b.close(); }
  console.log(`\nOK din9v5 (${n} ✓)`);
})().catch((e) => { console.error(e); process.exit(1); });
