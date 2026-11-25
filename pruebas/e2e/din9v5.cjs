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
    ok(b1.includes('canceló su Mesa 9v5') && b1.includes('Se le devolvieron $40.00 a su tarjeta.') && !/Se le devuelve|\{d/.test(b1), `al local, la devuelta: «Se le devolvieron $40.00» (${b1})`);
    ok(b2.includes("La devolución de $40.00 no salió: el equipo de To'Latino ya tiene el aviso") && !/Se le devuelve|devolvieron|\{d/.test(b2), `al local, la que Stripe no devolvió: «no salió», nunca «Se le devuelve» (${b2})`);
    ok(/Lo que quedaba del depósito \(\$25(\.00)?\) se queda contigo\./.test(b3) && !/\$40|\{d/.test(b3), `al local, tarde con devolución parcial: lo que queda ($25), no el depósito entero (${b3})`);
    const c3 = aviso(N3.num, 'noche_cx');
    ok(/Lo que quedaba del depósito \(\$25(\.00)?\) se quedó con Noche 9v5/.test(c3) && !/\$40/.test(c3), `al cliente, lo mismo (${c3})`);

    // ── 2 · «No hay mesa» con la retención que la pasarela no suelta ──
    console.log('2 · Noche: «No hay mesa» con una retención que la pasarela no suelta: retenida, UNA alerta, el aviso y el panel lo dicen');
    const N4 = mesa('No hay mesa', { st: 'pending' }); cobro(N4, { retenido: true, atascada: true });
    const pd = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); pd.on('pageerror', (e) => err.push(e.message));
    await entrarComo(pd, DUENA.tel); await pd.goto(B + `/panel/${BN}`);
    const r4 = await accion(pd, 'nocheResponder', [BN, N4.num, 'nohay']);
    ok(r4.j?.ok === true && r4.j?.retenida === true && sql(`select status from operations where number = '${N4.num}'`) === 'declined', `el local dijo «No hay mesa» y el panel sabe que la retención no se soltó (${JSON.stringify(r4.j)})`);
    ok(pago(N4.num) === 'held|0' && holdStuck(N4.num) === '1', `la retención sigue en la tarjeta (${pago(N4.num)}) y el equipo de dinero tiene UNA alerta hold_stuck`);
    const a4 = aviso(N4.num, 'noche_no');
    ok(a4.includes('No se cobró nada, pero la retención de $40.00 todavía no se soltó de tu tarjeta') && !/Se liberó/.test(a4), `noche_no lo dice, nunca «Se liberó tu depósito» (${a4})`);
    ok(sql(`select count(*) from notifications where tpl = 'pay_released' and ref_id = '${N4.num}'`) === '0', 'sin «Liberamos …» (pay_released): no se soltó');

    // ── 3 · «No me sirve» desde el teléfono con la retención que no se suelta ──
    console.log('3 · Noche: «No me sirve» con la retención que no se suelta (pantalla, aviso al local); después el barrido la suelta');
    const N5 = mesa('No me sirve', { st: 'change_proposed' }); cobro(N5, { retenido: true, atascada: true });
    sql(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by) values (${N5.op}, 'time', '{"m":1380}'::jsonb, '${DUENA.id}', 'business', now() + interval '25 minutes')`);
    const m5 = await (await telefono(b)).newPage(); m5.on('pageerror', (e) => err.push(e.message));
    await entrarComo(m5, N5.tel); await m5.goto(B + `/noche/${N5.num}`);
    await m5.getByRole('button', { name: 'No me sirve' }).first().click();
    await m5.getByText('Listo. La retención todavía no se soltó de tu tarjeta: la seguimos soltando sola.').first().waitFor();
    const t5 = await texto(m5);
    ok(!/se liberó tu depósito/i.test(t5), 'la pantalla: «La retención todavía no se soltó…», nunca «Listo: se liberó tu depósito»');
    await m5.screenshot({ path: OUT + 'd9v5-noche-no-me-sirve-retenida-m.png' });
    ok(await espera(() => sql(`select status from operations where number = '${N5.num}'`) === 'cancelled') && pago(N5.num) === 'held|0' && holdStuck(N5.num) === '1', `${N5.num}: cancelada, la retención sigue y UNA alerta hold_stuck`);
    const a5 = aviso(N5.num, 'biz_noche_alt_no');
    ok(a5.includes('no aceptó la otra hora. No se había cobrado nada, pero la retención de $40.00 de su tarjeta no se soltó todavía') && !/Se liberó su depósito/.test(a5), `biz_noche_alt_no lo dice, nunca «Se liberó su depósito» (${a5})`);
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
    ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  } finally { await b.close(); }
  console.log(`\nOK din9v5 (${n} ✓)`);
})().catch((e) => { console.error(e); process.exit(1); });
