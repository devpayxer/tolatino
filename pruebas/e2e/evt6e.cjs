// 6e · Cambios del evento y dinero del organizador, de punta a punta (teléfono 390 y escritorio 1360) contra el simulador de pagos:
// pausar / reanudar (y congelar de To'Latino), avisos a los que van (sin SMS, tope de Configuración), cambiar la hora con avisos (SMS crítico)
// y la elección del comprador («Me quedo» / «Devolución total» al 100 %), cancelar UNA fecha y TODO el evento con devolución total en lote
// (Stripe fallando en 2 órdenes, lote en el acto de 2 y el resto por el barrido = una cancelación cortada a la mitad que sigue sola; nada
// dos veces), la liquidación del martes (reloj movido: neto exacto, una transferencia por fecha, nunca antes, nunca con disputa abierta ni
// con la cuenta retenida), el primer evento de un organizador nuevo sobre $2,000 retenido hasta que Finanzas lo suelta, una disputa
// perdida después de pagar que se descuenta de la siguiente (una sola vez) y, sin siguiente, revierte la transferencia, Confianza al
// cancelar seguido, el Super Admin (cancelar y devolver todo, liquidaciones, CSV, colas) e IDOR repitiendo cada llamada nueva con otras cuentas.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const crypto = require('crypto');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrido = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const webhook = async (ev) => { const cuerpo = JSON.stringify(ev), t = Math.floor(Date.now() / 1000), sig = crypto.createHmac('sha256', ENT.sec('STRIPE_WEBHOOK_SECRET')).update(`${t}.${cuerpo}`).digest('hex');
  const r = await fetch(B + '/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${sig}` }, body: cuerpo }); return r.status; };
const RUN = Date.now().toString(36), TAG = `[e6e ${RUN}]`;
const C1 = '5705550122', C2 = '5705550299', C3 = '5705550288', TERRAZA = '5705550366', ADM = '5705550199', JUAN = '5705550444', LUIS = '5705550422';
const NEG = 'la-terraza-night', PAR = 'parroquia-santa-maria';
const btn = (p, t) => p.locator('button, [role="button"]', { hasText: t });
const acciones = [];
const espiar = (p) => p.on('request', (r) => { const a = r.headers()['next-action']; if (a && r.method() === 'POST') acciones.push({ url: r.url(), a, body: r.postData() || '' }); });
const accion = (re) => [...acciones].reverse().find((x) => re.test(x.body));
const repetir = async (ctx, cap, body) => (await (await ctx.request.post(cap.url, { headers: { 'next-action': cap.a, 'content-type': 'text/plain;charset=UTF-8', origin: B, accept: 'text/x-component' }, data: body ?? cap.body })).text());

(async () => {
  const ADMID = uid(ADM), U1 = uid(C1), U2 = uid(C2), U3 = uid(C3);
  const PREFS = Object.fromEntries([U1, U2, U3].map((u) => [u, sql(`select notif_prefs::text from users where id = '${u}'`)]));
  const TENIA_CUENTA = sql(`select count(*) from stripe_accounts where business_id = '${PAR}'`) !== '0';
  const limpiar = () => {
    sql(`delete from platform_config where key in ('evt_cancelar_lote', 'evt_aviso_max', 'evt_ajuste_dias')`);
    sql(`update ticket_holds set status = 'released' where status = 'held' and event_id in (select id from events where title->>'es' like '%[e6e %')`);
    sql(`update tickets set status = 'void', void_reason = 'prueba' where status in ('valid', 'used') and event_id in (select id from events where title->>'es' like '%[e6e %')`);
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba', sales_frozen_at = null where title->>'es' like '%[e6e %' and status <> 'cancelled'`);
    sql(`update stripe_accounts set payouts_paused = false, paused_reason = null where business_id = '${NEG}' and paused_reason = 'prueba e6e'`);
    // Fixtures de corridas anteriores de esta prueba (solo eventos [e6e]): sus liquidaciones no cuentan para «organizador nuevo» ni para la deuda.
    sql(`begin; set local session_replication_role = replica; delete from event_settlement_reversals where settlement_id in (select s.id from event_settlements s join events e on e.id = s.event_id where e.title->>'es' like '%[e6e %');
         delete from event_settlements where event_id in (select id from events where title->>'es' like '%[e6e %'); commit;`);
    sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and queue in ('evtcx', 'evtpago')`);
    sql(`update event_organizers set payout_cleared_at = null, payout_cleared_by = null, payout_cleared_note = null where business_id = '${PAR}'`);
  };
  limpiar();
  // Para esta prueba la Parroquia cobra con una cuenta simulada (se quita al final si no tenía).
  if (!TENIA_CUENTA) sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${PAR}', 'acct_sim_${PAR}', 'enabled', true, true, true)`);
  for (const u of Object.keys(PREFS)) sql(`update users set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || '{"quiet": false}'::jsonb where id = '${u}'`);
  // 9b-1 · Una tarjeta por persona y últimos 4 (antes una nueva en cada corrida: Marisol llegó a 11 y la lista de la app muestra 10).
  const tarjeta = (tel) => { const u = uid(tel); sql(`update payment_methods set is_default = false where user_id = '${u}'`); sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, status, simulated) values ('${u}', 'pm_sim_visa_4242_${crypto.createHash('md5').update(tel).digest('hex').slice(0, 8)}', 'visa', '4242', '12/30', true, 'active', true) on conflict (stripe_pm_id) do update set is_default = true, status = 'active'`); };
  const evento = (biz, fmt, titulo, dias, precio, cap) => {
    const tk = JSON.stringify([{ id: 'gen', n: { es: 'General', en: 'General' }, s: { es: '', en: '' }, p: precio, cap, off: false }]);
    const id = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, tables_cfg, addons_cfg)
      values ('', 'hzl', '${biz}', '${fmt}', '{"es":"${titulo} ${TAG}","en":"${titulo} ${TAG}"}', (now() at time zone 'America/New_York')::date + ${dias}, 1200, 1380, 'tickets', 'live', now(), now(), '${ADMID}', 30, '${ADMID}', 0,
              '${tk}'::jsonb, '[]'::jsonb, '[]'::jsonb) returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${id})`);
    return { id, F: sql(`select id from event_dates where event_id = ${id} order by starts_at limit 1`), SLUG: sql(`select slug from events where id = ${id}`), T: sql(`select id from ticket_types where event_id = ${id}`) };
  };
  // Una fecha que ya terminó hace 8 días (su martes ya pasó) — el reloj movido.
  const terminar = (fid, dias = 8) => sql(`update event_dates set starts_at = now() - interval '${dias} days', doors_at = now() - interval '${dias} days' - interval '30 minutes', ends_at = now() - interval '${dias} days' + interval '3 hours', local_date = ((now() - interval '${dias} days') at time zone 'America/New_York')::date where id = ${fid}`);
  const pago = (num) => sql(`select p.status || '|' || p.amount_cents || '|' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${num}'`);
  const pi = (num) => sql(`select p.stripe_payment_intent from payments p join operations o on o.id = p.operation_id where o.number = '${num}'`);
  const liq = (fid) => sql(`select status || '|' || coalesce(hold_kind, '') || '|' || net_cents || '|' || carry_cents || '|' || coalesce(transfer_id, '') from event_settlements where event_date_id = ${fid}`);
  // Lo del organizador calculado aparte (de los boletos, sin evt_liq_calc): precio − comisión de cada boleto pagado que sigue vivo.
  const netoBoletos = (fid) => Number(sql(`select coalesce(sum(price_cents - fee_cents), 0) from tickets where event_date_id = ${fid} and kind = 'paid' and status in ('valid', 'used')`));
  const br = await chromium.launch();
  const ctx = async (w, h, mobile) => br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile });
  const comprar = async (p, slug, fecha, tipo, k) => {
    await p.goto(B + `/eventos/${slug}/boletos?fecha=${fecha}`);
    for (let i = 0; i < k; i++) await clic(p.locator(`[data-tipo="${tipo}"] >> text="+"`));
    await clic(btn(p, 'Continuar')); await p.waitForURL(/\/eventos\/pagar\//);
    await clic(btn(p, /^Pagar \$/)); await p.waitForURL(/\/eventos\/orden\/B-/, { timeout: 20000 });
    return p.url().split('/').pop();
  };
  try {
    const c1 = await ctx(390, 844, true), p1 = await c1.newPage(); espiar(p1);
    const c2 = await ctx(390, 844, true), p2 = await c2.newPage(); espiar(p2);
    const c3 = await ctx(390, 844, true), p3 = await c3.newPage(); espiar(p3);
    await entrar(p1, C1); tarjeta(C1); await entrar(p2, C2); tarjeta(C2); await entrar(p3, C3); tarjeta(C3);
    const cn = await ctx(1360, 900), pn = await cn.newPage(); espiar(pn); await entrar(pn, TERRAZA);
    const cj = await ctx(1360, 900), pj = await cj.newPage(); await entrar(pj, JUAN);
    const ca = await ctx(1360, 900), pa = await ca.newPage(); espiar(pa); await entrar(pa, ADM);

    // ── 1 · Evento A (La Terraza, $15): tres compradores ──
    const A = evento(NEG, 'noche', 'Noche de cambios', 5, 1500, 30);
    const OA1 = await comprar(p1, A.SLUG, A.F, A.T, 2), OA2 = await comprar(p2, A.SLUG, A.F, A.T, 1), OA3 = await comprar(p3, A.SLUG, A.F, A.T, 1);
    ok(pago(OA1) === 'captured|3000|0' && pago(OA2) === 'captured|1500|0' && pago(OA3) === 'captured|1500|0', `A: ${OA1} (2), ${OA2} (1), ${OA3} (1) cobrados`);

    // ── 2 · VENTA: pausar y reanudar desde el panel ──
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${A.id}`);
    ok(await contiene(pn, 'VENTA') && await contiene(pn, 'Vendiendo') && await contiene(pn, 'AVISOS A LOS QUE VAN') && await contiene(pn, 'DINERO DEL EVENTO'), 'panel › la ficha: VENTA (Vendiendo), AVISOS A LOS QUE VAN y DINERO DEL EVENTO · POR FECHA');
    ok(await contiene(pn, 'PRÓXIMA') && await contiene(pn, 'Se paga el mar'), 'el dinero de la fecha: PRÓXIMA · «Se paga el mar …» (el martes después)');
    await pn.screenshot({ path: OUT + 'e6e-panel-ficha-d.png', fullPage: true });
    await clic(pn.locator('[role="switch"][aria-label="Vendiendo"]'));
    ok(await espera(() => sql(`select status from events where id = ${A.id}`) === 'paused'), 'pausar: el evento queda «paused»');
    ok(await contiene(pn, 'Venta pausada: la página dice «Venta pausada». Los que ya compraron entran igual.'), 'el panel lo dice: «Los que ya compraron entran igual.»');
    await p3.goto(B + `/eventos/${A.SLUG}?fecha=${A.F}`); ok(await contiene(p3, 'Venta pausada'), 'la ficha del evento: «Venta pausada»');
    await p3.screenshot({ path: OUT + 'e6e-ficha-pausada-m.png', fullPage: true });
    const capPausa = accion(new RegExp(`"${NEG}","${A.id}",true`));
    await clic(pn.locator('[role="switch"][aria-label="Venta pausada"]'));
    ok(await espera(() => sql(`select status from events where id = ${A.id}`) === 'live'), 'reanudar: vuelve a «live»');
    ok(sql(`select string_agg(kind || ':' || by_kind, ',' order by id) from event_changes where event_id = ${A.id}`) === 'paused:business,resumed:business', 'event_changes (solo inserción): paused y resumed del negocio');
    // IDOR: Juan (dueño de otro negocio) y un vecino repiten «pausar» → sin acceso; con su propio negocio y el evento de La Terraza → no existe.
    ok(!!capPausa, 'se tiene la llamada de «pausar» del panel');
    ok(!/"ok":true/.test(await repetir(cj, capPausa)) && !/"ok":true/.test(await repetir(c3, capPausa)) && sql(`select status from events where id = ${A.id}`) === 'live', 'IDOR: el dueño de otro negocio y un vecino repiten «pausar» → sin acceso, nada cambia');
    const JUANBIZ = sql(`select business_id from business_members where user_id = '${uid(JUAN)}' and kind = 'owner' and status = 'active' order by business_id limit 1`);
    ok(/no existe|No tienes acceso/.test(await repetir(cj, capPausa, capPausa.body.replace(`"${NEG}"`, `"${JUANBIZ}"`))) && sql(`select status from events where id = ${A.id}`) === 'live', 'IDOR: con su propio negocio y el evento de otro → «Ese evento no existe»');

    // ── 3 · AVISOS A LOS QUE VAN (push y en la app, nunca SMS; tope de Configuración) ──
    await clic(btn(pn, 'Escribir aviso')); await clic(btn(pn, 'Estacionamiento gratis detrás del local.'));
    await clic(btn(pn, 'Enviar a 3 personas'));
    ok(await contiene(pn, 'Aviso enviado a 3 personas'), '«Enviar a 3 personas» → «Aviso enviado a 3 personas en la app»');
    const AV = sql(`select count(*) || '|' || string_agg(distinct sms_status, ',') from notifications where tpl = 'evt_aviso' and user_id in ('${U1}', '${U2}', '${U3}') and ref_id = (select max(id)::text from event_notices where event_id = ${A.id})`);
    ok(AV === '3|no', 'el aviso llega a los 3 (en la app), sin SMS');
    await p1.goto(B + `/eventos/${A.SLUG}?fecha=${A.F}`); ok(await contiene(p1, 'Estacionamiento gratis detrás del local.'), 'la ficha: el aviso sale primero en «Antes de ir»');
    const capAviso = accion(new RegExp(`"${NEG}","${A.id}","Estacionamiento`));
    sql(`insert into platform_config (key, value, updated_by) values ('evt_aviso_max', '1', '${ADMID}') on conflict (key) do update set value = excluded.value`);
    const rAv = await repetir(cn, capAviso); if (!/Hasta 1 avisos/.test(rAv)) console.log('DBG', !!capAviso, rAv.slice(0, 400));
    ok(/Hasta 1 avisos por fecha/.test(rAv) && sql(`select count(*) from event_notices where event_id = ${A.id}`) === '1', 'tope de Configuración (1): el segundo aviso → «Hasta 1 avisos por fecha» (lo cuenta la base)');
    sql(`delete from platform_config where key = 'evt_aviso_max'`);
    ok(!/"ok":true/.test(await repetir(cj, capAviso)) && sql(`select count(*) from event_notices where event_id = ${A.id}`) === '1', 'IDOR: Juan repite el aviso → sin acceso');

    // ── 4 · Cambiar la hora: SMS crítico a los que van y la elección del comprador ──
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${A.id}`);
    await clic(btn(pn, 'Cambiar fecha u hora'));
    ok(await contiene(pn, 'CAMBIAR FECHA U HORA') && await contiene(pn, 'Les avisamos a las 3 personas que van'), 'hoja «Cambiar fecha u hora»: el calendario, las horas y «Les avisamos a las 3 personas que van»');
    await clic(pn.locator('button[aria-label="Empieza +"]')); await clic(pn.locator('button[aria-label="Empieza +"]'));
    await pn.screenshot({ path: OUT + 'e6e-panel-mover-d.png', fullPage: true });
    await clic(btn(pn, 'Cambiar la fecha'));
    ok(await contiene(pn, 'Avisamos a 3 personas'), '«Cambiar la fecha» → «Listo. Avisamos a 3 personas.»');
    const CH = sql(`select id || '|' || kind || '|' || (after->>'h0') from event_changes where event_id = ${A.id} and kind in ('moved', 'time_changed') order by id desc limit 1`).split('|');
    ok(CH[1] === 'time_changed' && CH[2] === '1260' && sql(`select to_char(starts_at at time zone 'America/New_York', 'HH24:MI') from event_dates where id = ${A.F}`) === '21:00', 'la base: time_changed (antes → después) y la fecha empieza a las 9 PM');
    ok(sql(`select count(*) || '|' || string_agg(distinct sms_status, ',') from notifications where tpl = 'evt_hora_cambio' and ref_id = '${CH[0]}'`) === '3|pruebas', 'a los 3 les llega «Tu evento cambió de hora» por SMS (crítico; en el sandbox, modo pruebas)');
    const capMover = accion(new RegExp(`"${NEG}","${A.F}",\\{`));
    ok(!/"ok":true/.test(await repetir(cj, capMover)) && sql(`select count(*) from event_changes where event_id = ${A.id} and kind in ('moved', 'time_changed')`) === '1', 'IDOR: Juan repite «Cambiar la fecha» → sin acceso');
    // C1 se queda; C2 pide la devolución total (100 %, la comisión no se cobra).
    await p1.goto(B + `/eventos/orden/${OA1}`);
    ok(await contiene(p1, 'El evento cambió de fecha') && await contiene(p1, 'Me quedo con la nueva fecha') && await contiene(p1, 'Devolución total') && await contiene(p1, 'AVISOS DEL ORGANIZADOR'), 'la orden: «El evento cambió de fecha» con «Me quedo con la nueva fecha» / «Devolución total» y los avisos');
    await p1.screenshot({ path: OUT + 'e6e-orden-movido-m.png', fullPage: true });
    await clic(btn(p1, 'Me quedo con la nueva fecha'));
    ok(await espera(() => sql(`select choice from ticket_choices where change_id = ${CH[0]} and operation_id = (select id from operations where number = '${OA1}')`) === 'keep'), 'C1: «Me quedo» (ticket_choices keep); sus boletos siguen');
    await p2.goto(B + `/eventos/orden/${OA2}`); await clic(btn(p2, 'Devolución total'));
    ok(await espera(() => pago(OA2) === 'refunded|1500|1500'), 'C2: «Devolución total» → $15 de vuelta (100 %, cargos incluidos)');
    ok(sql(`select r.initiated_by || '|' || r.status from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${OA2}'`) === 'event_moved|done'
      && sql(`select fee_waived_cents::text from ticket_refund_lines where operation_id = (select id from operations where number = '${OA2}')`) === sql(`select fee_cents::text from tickets where operation_id = (select id from operations where number = '${OA2}')`), 'la devolución es «event_moved» y la comisión de ese boleto no se cobra (fee_waived)');
    ok(sql(`select refunded_cents from sim_intents where id = '${pi(OA2)}'`) === '1500', 'el simulador devolvió exactamente $15');
    const capElegir = accion(new RegExp(`"${OA2}","refund"`));
    ok(/"ok":true/.test(await repetir(c2, capElegir)) && sql(`select count(*) from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${OA2}'`) === '1', 'repetir la elección → la misma devolución (una sola)');
    ok(!/"ok":true/.test(await repetir(c3, capElegir)) && /no tiene un cambio de fecha/.test(await repetir(c3, capElegir)), 'IDOR: C3 repite la elección de C2 → «Esta orden no tiene un cambio de fecha…», nada cambia');
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${A.id}`);
    ok(await contiene(pn, 'Cambiaste la fecha (antes:') && await contiene(pn, '1 se quedan · 1 pidieron devolución · 1 sin responder'), 'panel: «Cambiaste la fecha (antes: …)» con 1 se queda · 1 devolución · 1 sin responder');
    await p3.goto(B + `/eventos/${A.SLUG}?fecha=${A.F}`); ok(await contiene(p3, 'Cambió de fecha') && await contiene(p3, 'Antes era'), 'la ficha: «Cambió de fecha · Antes era …»');
    await p3.screenshot({ path: OUT + 'e6e-ficha-movido-m.png', fullPage: true });

    // ── 5 · La liquidación del martes (reloj movido): nunca antes; neto exacto; una sola vez ──
    terminar(A.F, 0);
    sql(`update event_dates set starts_at = now() - interval '4 hours', doors_at = now() - interval '5 hours', ends_at = now() - interval '1 hour' where id = ${A.F}`);
    barrido();
    ok(liq(A.F).startsWith('pending|') && sql(`select pay_on > (now() at time zone 'America/New_York')::date from event_settlements where event_date_id = ${A.F}`) === 't', 'la fecha terminó hace 1 h: su liquidación espera al martes (pendiente, nada transferido)');
    ok(/evt_liq_antes/.test(sqlErr(`update event_settlements set status = 'paying' where event_date_id = ${A.F}`)), 'la base no deja pagar antes del martes (evt_liq_antes), aunque alguien lo intente a mano');
    terminar(A.F, 8);
    sql(`begin; set local session_replication_role = replica; update event_settlements set pay_on = evt_pago_dia(((now() - interval '8 days') at time zone 'America/New_York')::date) where event_date_id = ${A.F}; commit;`);
    const esperado = netoBoletos(A.F);
    barrido();
    const LA = liq(A.F).split('|');
    ok(LA[0] === 'paid' && Number(LA[2]) === esperado && esperado === 3975, `martes: pagada con el neto exacto ${esperado} ¢ (cobrado − devuelto − comisión, de los boletos)`);
    ok(sql(`select amount_cents || '|' || destination || '|' || transfer_group from sim_transfers where id = '${LA[4]}'`) === `${esperado}|acct_sim_${NEG}|evt-${A.id}`, 'una transferencia al organizador con su transfer_group');
    barrido();
    ok(sql(`select count(*) from sim_transfers where id like 'tr_sim_evt-liq-${A.F}%'`) === '1' && liq(A.F).split('|')[0] === 'paid', 'otro barrido: la misma fecha no se paga dos veces');
    ok(/evt_liq_estado|evt_liq_fija/.test(sqlErr(`update event_settlements set status = 'paying' where event_date_id = ${A.F}`)) && /evt_liq_fija/.test(sqlErr(`update event_settlements set net_cents = net_cents + 100, base_cents = base_cents + 100 where event_date_id = ${A.F}`)), 'la base: una liquidación pagada no vuelve a «paying» ni cambia su monto');
    ok(sql(`select count(*) from audit_entries where action = 'evento.liquidacion.pagar' and target_id = (select id::text from event_settlements where event_date_id = ${A.F})`) === '1' && sql(`select count(*) from notifications where tpl = 'evt_pago' and ref_id = (select id::text from event_settlements where event_date_id = ${A.F})`) === '1', 'auditoría (solo inserción) y el aviso «Te pagamos lo de tu evento»');
    await pn.goto(B + `/panel/${NEG}/cobros`);
    ok(await contiene(pn, 'PAGOS DE EVENTOS · POR FECHA') && await contiene(pn, 'PAGADA') && await contiene(pn, '$39.75'), 'Panel › Cobros: PAGOS DE EVENTOS con la fecha PAGADA ($39.75)');
    await pn.screenshot({ path: OUT + 'e6e-cobros-d.png', fullPage: true });

    // ── 6 · Disputa perdida DESPUÉS de pagar → se descuenta de la siguiente, una sola vez; una disputa abierta retiene la fecha ──
    const DP1 = 'dp_e6e_' + RUN + '_1';
    ok(await webhook({ id: 'evt_' + DP1, type: 'charge.dispute.created', data: { object: { id: DP1, payment_intent: pi(OA3), amount: 1500, reason: 'fraudulent', status: 'needs_response', evidence_details: { due_by: Math.floor(Date.now() / 1000) + 5 * 86400 } } } }) === 200, 'webhook firmado: disputa sobre el boleto de C3 (fecha ya pagada)');
    const QD = sql(`select q.id from queue_items q join disputes d on d.id::text = q.subject_id where q.queue = 'disputa' and d.stripe_dispute_id = '${DP1}'`);
    await pa.goto(B + `/admin/colas?caso=${QD}`); await pa.getByText('EVIDENCIA QUE TENEMOS').first().waitFor();
    ok(await contiene(pa, `Orden de boletos ${OA3}`) && await contiene(pa, 'válido, sin usar'), 'Colas › Disputas: la evidencia del boleto (orden, evento, cada boleto con su estado)');
    await pa.screenshot({ path: OUT + 'e6e-admin-disputa-d.png', fullPage: true });
    await webhook({ id: 'evt_c_' + DP1, type: 'charge.dispute.closed', data: { object: { id: DP1, status: 'lost' } } });
    await webhook({ id: 'evt_c2_' + DP1, type: 'charge.dispute.closed', data: { object: { id: DP1, status: 'lost' } } });
    ok(sql(`select evt_liq_deuda('${NEG}')`) === '1325', 'perdida (el webhook repetido no cambia nada): el organizador debe $13.25 (lo que se le pagó de ese boleto)');
    // Evento C (La Terraza): C1 compra 2; C3 compra 1 y la disputa; la fecha termina.
    const Cv = evento(NEG, 'noche', 'Noche del ajuste', 4, 1500, 30);
    const OC1 = await comprar(p1, Cv.SLUG, Cv.F, Cv.T, 2), OC3 = await comprar(p3, Cv.SLUG, Cv.F, Cv.T, 1);
    terminar(Cv.F, 8);
    const DP2 = 'dp_e6e_' + RUN + '_2';
    await webhook({ id: 'evt_' + DP2, type: 'charge.dispute.created', data: { object: { id: DP2, payment_intent: pi(OC3), amount: 1500, reason: 'product_not_received', status: 'needs_response', evidence_details: { due_by: Math.floor(Date.now() / 1000) + 5 * 86400 } } } });
    sql(`update stripe_accounts set payouts_paused = true, paused_reason = 'prueba e6e' where business_id = '${NEG}'`);
    barrido();
    ok(liq(Cv.F).startsWith('held|disputa|0|'), 'C terminó con una disputa abierta: la liquidación queda RETENIDA (disputa) y no se transfiere nada');
    ok(/evt_liq_disputa/.test(sqlErr(`begin; update event_settlements set status = 'pending', hold_kind = null where event_date_id = ${Cv.F}; update event_settlements set status = 'paying' where event_date_id = ${Cv.F}; commit;`)), 'la base no deja pagar una fecha con disputa abierta');
    await pn.goto(B + `/panel/${NEG}/cobros`); ok(await contiene(pn, 'RETENIDA') && await contiene(pn, 'Hay una disputa abierta con el banco de un comprador'), 'Cobros: RETENIDA con su motivo (disputa abierta)');
    await webhook({ id: 'evt_c_' + DP2, type: 'charge.dispute.closed', data: { object: { id: DP2, status: 'lost' } } });
    barrido();
    ok(liq(Cv.F).startsWith('held|cuenta|0|'), 'la disputa se cerró pero la cuenta de cobro está retenida por To’Latino: sigue RETENIDA (cuenta)');
    sql(`update stripe_accounts set payouts_paused = false, paused_reason = null where business_id = '${NEG}'`);
    const baseC = netoBoletos(Cv.F) - Number(sql(`select sum(price_cents - fee_cents) from tickets where operation_id = (select id from operations where number = '${OC3}')`));
    barrido();
    const LC = liq(Cv.F).split('|');
    ok(LC[0] === 'paid' && Number(LC[3]) === 1325 && Number(LC[2]) === baseC - 1325 && baseC === 2650, `C pagada: base $26.50 (sin el boleto disputado) − $13.25 de la disputa anterior = ${LC[2]} ¢ transferidos`);
    ok(sql(`select evt_liq_deuda('${NEG}')`) === '0', 'la deuda queda en 0: la disputa no se cobra dos veces');
    barrido(); ok(sql(`select count(*) from sim_transfers where id like 'tr_sim_evt-liq-${Cv.F}%'`) === '1' && sql(`select evt_liq_deuda('${NEG}')`) === '0', 'otro barrido: nada más se descuenta ni se transfiere');

    // ── 7 · Cancelar UNA fecha (B con dos fechas) y TODO el evento, con Stripe fallando y el lote cortado ──
    const Bv = evento(NEG, 'noche', 'Noche que se cancela', 6, 2000, 40);
    const F2 = sql(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, day_index) select id, city_id, ((start_date + 2)::timestamp + interval '20 hours') at time zone 'America/New_York', ((start_date + 2)::timestamp + interval '23 hours') at time zone 'America/New_York', ((start_date + 2)::timestamp + interval '19 hours 30 minutes') at time zone 'America/New_York', start_date + 2, 0 from events where id = ${Bv.id} returning id`).split('\n')[0];
    sql(`select evt_sincronizar_venta(${Bv.id})`);
    const OB = [await comprar(p1, Bv.SLUG, Bv.F, Bv.T, 2), await comprar(p2, Bv.SLUG, Bv.F, Bv.T, 1), await comprar(p3, Bv.SLUG, Bv.F, Bv.T, 3), await comprar(p1, Bv.SLUG, Bv.F, Bv.T, 1), await comprar(p2, Bv.SLUG, Bv.F, Bv.T, 2)];
    const OB2 = await comprar(p3, Bv.SLUG, F2, Bv.T, 1);
    sql(`update tickets set status = 'used' where id = (select min(id) from tickets where operation_id = (select id from operations where number = '${OB[2]}'))`);
    ok(OB.every((o) => pago(o).startsWith('captured|')) && pago(OB2).startsWith('captured|'), `B: 5 órdenes en la primera fecha (una con un boleto ya usado) y 1 en la segunda`);
    // Stripe «se cae» para 2 órdenes; el lote en el acto es de 2 (el resto lo sigue el barrido, como si el servidor se hubiera cortado).
    for (const o of [OB[1], OB[3]]) sql(`update sim_intents set status = 'requires_capture' where id = '${pi(o)}'`);
    sql(`insert into platform_config (key, value, updated_by) values ('evt_cancelar_lote', '2', '${ADMID}') on conflict (key) do update set value = excluded.value`);
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${Bv.id}`);
    await clic(btn(pn, 'Cancelar una fecha o la serie'));
    ok(await contiene(pn, 'QUÉ CANCELAS') && await contiene(pn, '¿POR QUÉ? LO VEN LOS QUE IBAN') && await contiene(pn, 'Devolvemos $180 completo a los 5 que compraron'), 'cancelar: QUÉ CANCELAS · ¿POR QUÉ? y «Devolvemos $180 completo a los 5 que compraron» (lo de la primera fecha)');
    await clic(btn(pn, 'El artista no puede venir'));
    await pn.screenshot({ path: OUT + 'e6e-panel-cancelar-d.png', fullPage: true });
    await clic(btn(pn, /^Sí, cancelar el /));
    ok(await contiene(pn, 'Cancelado. Devolvemos todo a los compradores.'), '«Sí, cancelar el …» → «Cancelado. Devolvemos todo a los compradores.»');
    const CX = sql(`select id || '|' || scope || '|' || status || '|' || orders_n from event_cancellations where event_id = ${Bv.id}`).split('|');
    ok(CX[1] === 'date' && CX[2] === 'running' && CX[3] === '2', 'una cancelación de la fecha: 2 órdenes en el acto (lote de Configuración) y sigue «running»');
    ok(sql(`select status from event_dates where id = ${Bv.F}`) === 'cancelled' && sql(`select status from event_dates where id = ${F2}`) === 'scheduled' && sql(`select status from events where id = ${Bv.id}`) === 'live', 'solo esa fecha se canceló; la otra sigue en venta y el evento sigue publicado');
    const capCx = accion(new RegExp(`"${NEG}","${Bv.id}","date"`));
    ok(!/"ok":true/.test(await repetir(cj, capCx)) && !/"ok":true/.test(await repetir(c3, capCx)), 'IDOR: Juan y un vecino repiten «cancelar» → sin acceso');
    ok(/ya se canceló|ya no está en pie/.test(await repetir(cn, capCx)) && sql(`select count(*) from event_cancellations where event_id = ${Bv.id}`) === '1', 'repetir la misma cancelación → «Esta fecha ya se canceló» (una sola)');
    barrido();
    const refB = (o) => sql(`select coalesce(sum(r.amount_cents), 0) || '|' || count(r.id) || '|' || coalesce(string_agg(r.status, ',' order by r.id), '') from payments p left join refunds r on r.payment_id = p.id join operations o on o.id = p.operation_id where o.number = '${o}'`);
    ok(OB.every((o) => refB(o).split('|')[1] === '1'), 'el barrido siguió la cancelación cortada: cada una de las 5 órdenes tiene UNA devolución');
    ok(OB.every((o) => Number(refB(o).split('|')[0]) === Number(pago(o).split('|')[1])), 'cada devolución es el 100 % de lo cobrado (cargos incluidos; también el boleto usado)');
    ok(refB(OB[1]).endsWith('|pending') && refB(OB[3]).endsWith('|pending') && sql(`select attempts > 0 from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${OB[1]}'`) === 't', 'las 2 con Stripe caído quedan pendientes con intentos (el dinero no se pierde)');
    ok(sql(`select status from event_cancellations where id = ${CX[0]}`) === 'running' || sql(`select status from event_cancellations where id = ${CX[0]}`) === 'done', 'la cancelación terminó de anotar todo');
    for (const o of [OB[1], OB[3]]) sql(`update sim_intents set status = 'succeeded' where id = '${pi(o)}'`);
    sql(`update refunds set created_at = created_at - interval '1 minute' where status = 'pending' and payment_id in (select p.id from payments p join operations o on o.id = p.operation_id where o.number in ('${OB[1]}', '${OB[3]}'))`);
    barrido(); barrido();
    ok(OB.every((o) => pago(o) === `refunded|${pago(o).split('|')[1]}|${pago(o).split('|')[1]}` && Number(sql(`select refunded_cents from sim_intents where id = '${pi(o)}'`)) === Number(pago(o).split('|')[1])), 'Stripe vuelve: el barrido las hace con la MISMA llave; las 5 devueltas al 100 % en la base y en el simulador (ni una de más)');
    ok(sql(`select count(*) from sim_refunds where payment_intent in (${OB.map((o) => `'${pi(o)}'`).join(',')})`) === '5', 'el simulador registra exactamente 5 devoluciones (una por orden)');
    ok(sql(`select status || '|' || refunded_cents from event_cancellations where id = ${CX[0]}`) === `done|${OB.reduce((s, o) => s + Number(pago(o).split('|')[1]), 0)}`, 'la cancelación queda «done» con lo devuelto exacto');
    ok(pago(OB2).startsWith('captured|') && sql(`select count(*) from tickets where operation_id = (select id from operations where number = '${OB2}') and status = 'valid'`) === '1', 'la orden de la otra fecha no se tocó');
    ok(sql(`select count(distinct user_id) || '|' || count(*) || '|' || string_agg(distinct sms_status, ',') from notifications where tpl = 'evt_fecha_cancelada' and ref_id = '${CX[0]}'`) === '3|3|pruebas', 'a cada persona (3) le llega UN aviso «Se canceló una fecha» por SMS (crítico), aunque el barrido corrió varias veces');
    await p2.goto(B + `/eventos/orden/${OB[1]}`);
    ok(await contiene(p2, 'Este evento fue cancelado por el organizador') && await contiene(p2, 'Se te devuelve todo') && await contiene(p2, 'El evento se canceló: te devolvemos'), 'la orden: «Este evento fue cancelado por el organizador · Se te devuelve todo…»');
    await p2.screenshot({ path: OUT + 'e6e-orden-cancelada-m.png', fullPage: true });
    // Todo el evento: la segunda fecha (el lote vuelve al de fábrica).
    sql(`delete from platform_config where key = 'evt_cancelar_lote'`);
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${Bv.id}`);
    await clic(btn(pn, 'Cancelar evento')); await clic(btn(pn, 'Mal tiempo')); await clic(btn(pn, 'Sí, cancelar el evento'));
    ok(await espera(() => sql(`select status from events where id = ${Bv.id}`) === 'cancelled') && await espera(() => pago(OB2).startsWith('refunded|')), 'cancelar el evento: queda «cancelled» y la última orden se devuelve al 100 %');
    ok(await espera(() => sql(`select count(*) from queue_items where queue = 'evtcx' and subject_id = '${NEG}' and status = 'open'`) === '1'), 'Confianza: 2 cancelaciones con boletos en 90 días → UN caso «Organizadores que cancelan»');
    await p1.goto(B + `/eventos/${Bv.SLUG}`); ok(await contiene(p1, 'Evento cancelado') && await contiene(p1, 'Si compraste, te devolvemos todo'), 'el enlace del evento cancelado: «Evento cancelado · Si compraste, te devolvemos todo…»');
    await p1.screenshot({ path: OUT + 'e6e-ficha-cancelada-m.png', fullPage: true });
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${Bv.id}`); ok(await contiene(pn, 'Cancelado · Mal tiempo'), 'panel: «Cancelado · Mal tiempo · Devolvemos todo…» con el progreso');
    await pn.screenshot({ path: OUT + 'e6e-panel-cancelado-d.png', fullPage: true });
    // La liquidación de una fecha cancelada: $0, sin transferencia.
    terminar(Bv.F, 9); barrido();
    ok(liq(Bv.F).startsWith('paid||0|0|') || liq(Bv.F).startsWith('paid|') && liq(Bv.F).split('|')[2] === '0', 'la fecha cancelada se liquida en $0 (todo devuelto; la comisión no se cobró), sin transferencia');

    // ── 8 · Primer evento grande de un organizador nuevo (Parroquia): retenido hasta que Finanzas lo suelta; luego, sin siguiente, se revierte ──
    const P = evento(PAR, 'fe', 'Retiro grande', 3, 45000, 20);
    const OP = await comprar(p1, P.SLUG, P.F, P.T, 5);
    ok(pago(OP) === 'captured|225000|0', `Parroquia: ${OP} — 5 boletos de $450 = $2,250 (sobre el tope de $2,000)`);
    terminar(P.F, 8); barrido();
    ok(liq(P.F).startsWith('held|nuevo|0|'), 'primer evento de un organizador nuevo sobre $2,000: RETENIDO (nuevo), nada transferido');
    ok(/evt_liq_nuevo/.test(sqlErr(`begin; update event_settlements set status = 'pending', hold_kind = null where event_date_id = ${P.F}; update event_settlements set status = 'paying' where event_date_id = ${P.F}; commit;`)), 'la base tampoco deja pagarlo a mano (evt_liq_nuevo)');
    const QP = sql(`select id from queue_items where queue = 'evtpago' and subject_id = (select id::text from event_settlements where event_date_id = ${P.F}) and status = 'open'`);
    ok(!!QP && sql(`select count(*) from notifications where tpl = 'evt_pago_retenido' and ref_id like (select id::text from event_settlements where event_date_id = ${P.F}) || ':nuevo'`) !== '0', 'caso en Colas «Pagos de eventos retenidos» y el aviso al organizador');
    barrido(); ok(sql(`select count(*) from queue_items where queue = 'evtpago' and subject_id = (select id::text from event_settlements where event_date_id = ${P.F})`) === '1', 'otro barrido no abre otro caso ni lo paga');
    await pa.goto(B + `/admin/colas?caso=${QP}`);
    ok(await contiene(pa, 'LE TOCA AL ORGANIZADOR') && await contiene(pa, 'Soltar el pago'), 'Colas › el caso: bruto, lo del organizador, su historial y «Soltar el pago»');
    await pa.screenshot({ path: OUT + 'e6e-admin-evtpago-d.png', fullPage: true });
    // IDOR: un vecino (C1) repite «Soltar» → nada; luego Finanzas (admin) lo suelta.
    await clic(btn(pa, 'Soltar el pago')); await clic(pa.getByText('El evento pasó sin problemas', { exact: true })); await clic(pa.getByRole('button', { name: 'Soltar' }).last());
    ok(await contiene(pa, 'Soltada'), 'Finanzas «Soltar el pago» con motivo');
    const capSoltar = accion(/El evento pasó sin problemas/);
    ok(!!capSoltar && !/"ok":true/.test(await repetir(c1, capSoltar).catch(() => '')), 'IDOR: un vecino repite «Soltar» → nada');
    barrido();
    const LP = liq(P.F).split('|'), netoP = netoBoletos(P.F);
    ok(LP[0] === 'paid' && Number(LP[2]) === netoP && netoP === 213250, `soltado: se paga ${netoP} ¢ ($2,250 − 5 × $23.50 de comisión)`);
    ok(sql(`select payout_cleared_at is not null from event_organizers where business_id = '${PAR}'`) === 't' && sql(`select count(*) from audit_entries where action = 'evento.liquidacion.soltar' and target_id = (select id::text from event_settlements where event_date_id = ${P.F})`) === '1', 'la Parroquia queda revisada (sus próximos eventos no se retienen por ser nueva) y queda en la auditoría');
    // Disputa perdida después de pagar y sin otra liquidación → se revierte la transferencia (nunca más de lo transferido).
    const DP3 = 'dp_e6e_' + RUN + '_3';
    await webhook({ id: 'evt_' + DP3, type: 'charge.dispute.created', data: { object: { id: DP3, payment_intent: pi(OP), amount: 225000, reason: 'fraudulent', status: 'needs_response' } } });
    await webhook({ id: 'evt_c_' + DP3, type: 'charge.dispute.closed', data: { object: { id: DP3, status: 'lost' } } });
    ok(sql(`select evt_liq_deuda('${PAR}')`) === String(netoP), 'perdida: la Parroquia debe lo que se le pagó');
    sql(`insert into platform_config (key, value, updated_by) values ('evt_ajuste_dias', '1', '${ADMID}') on conflict (key) do update set value = excluded.value`);
    sql(`begin; set local session_replication_role = replica; update event_settlements set paid_at = now() - interval '2 days' where event_date_id = ${P.F}; commit;`);
    barrido(); barrido();
    ok(liq(P.F).startsWith('reversed|') && sql(`select reversed_cents from sim_transfers where id = '${LP[4]}'`) === String(netoP) && sql(`select count(*) from event_settlement_reversals where settlement_id = (select id from event_settlements where event_date_id = ${P.F})`) === '1', 'sin otra liquidación en el plazo: se revierte la transferencia (una vez, por lo transferido)');
    ok(sql(`select evt_liq_deuda('${PAR}')`) === '0', 'la deuda queda en 0');
    ok(/evt_rev_de_mas/.test(sqlErr(`insert into event_settlement_reversals (settlement_id, business_id, city_id, amount_cents, idem_key) values ((select id from event_settlements where event_date_id = ${P.F}), '', '', 1, 'evt-rev-${sql(`select id from event_settlements where event_date_id = ${P.F}`)}-99')`)), 'la base no deja revertir más de lo transferido');
    sql(`delete from platform_config where key = 'evt_ajuste_dias'`);

    // ── 9 · Super Admin: congelar, cancelar y devolver todo; Liquidaciones con CSV; el caso de Confianza ──
    const E = evento(NEG, 'noche', 'Noche del admin', 7, 1000, 20);
    const OE = await comprar(p2, E.SLUG, E.F, E.T, 1);
    await pa.goto(B + `/admin/eventos/${E.id}`);
    await clic(btn(pa, 'Congelar ventas')); await clic(pa.getByText('Revisión de Confianza', { exact: true })); await clic(pa.getByRole('button', { name: 'Congelar' }).last());
    ok(await espera(() => sql(`select status || '|' || (sales_frozen_at is not null) from events where id = ${E.id}`) === 'paused|true'), 'admin «Congelar ventas»: pausado y congelado');
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${E.id}`);
    ok(await contiene(pn, 'To’Latino congeló la venta: Revisión de Confianza'), 'el panel lo dice con el motivo');
    await clic(pn.locator('[role="switch"][aria-label="Venta pausada"]'));
    ok(await contiene(pn, 'To\'Latino congeló la venta') && sql(`select status from events where id = ${E.id}`) === 'paused', 'el organizador no la puede reabrir (el servidor y la base lo impiden)');
    ok(/evt_congelado/.test(sqlErr(`update events set status = 'live' where id = ${E.id}`)), 'la base tampoco deja reabrir un evento congelado');
    await pa.goto(B + `/admin/eventos/${E.id}`);
    await clic(btn(pa, 'Cancelar y devolver todo')); await clic(pa.getByText('El evento no va a pasar', { exact: true })); await clic(pa.getByRole('button', { name: 'Cancelar y devolver' }).last());
    ok(await espera(() => pago(OE) === 'refunded|1000|1000') && sql(`select by_kind || '|' || reason_key from event_cancellations where event_id = ${E.id}`) === 'admin|admin', 'admin «Cancelar y devolver todo»: devuelto al 100 % (cancelación del admin, con motivo)');
    ok(sql(`select count(*) from audit_entries where action = 'evento.cancelar' and target_id = '${E.id}'`) === '1', 'en la auditoría');
    await pa.screenshot({ path: OUT + 'e6e-admin-evento-d.png', fullPage: true });
    await pa.goto(B + '/admin/eventos/liquidaciones');
    ok(await contiene(pa, 'Liquidaciones de eventos') && await contiene(pa, 'POR PAGAR') && await contiene(pa, 'PAGADO · 30 DÍAS') && await contiene(pa, 'Noche de cambios'), 'Super Admin › Liquidaciones: KPI y la lista por fecha');
    await pa.screenshot({ path: OUT + 'e6e-admin-liquidaciones-d.png', fullPage: true });
    const [dl] = await Promise.all([pa.waitForEvent('download'), clic(btn(pa, 'Exportar CSV'))]);
    const csv = require('fs').readFileSync(await dl.path(), 'utf8');
    ok(/Liquidación,Negocio,Evento/.test(csv) && csv.includes('39.75') && sql(`select count(*) from audit_entries where action = 'evento.liquidaciones_exportar' and at > now() - interval '2 minutes'`) !== '0', 'Exportar CSV (montos en dólares) y queda en la auditoría');
    // Un vecino no abre el Super Admin.
    { const r = await p1.goto(B + '/admin/eventos/liquidaciones'); ok(r.status() === 404 || /\/entrar|\/admin\/sin-permiso|\/$/.test(p1.url()) || !(await texto(p1)).includes('Liquidaciones de eventos'), 'un vecino no ve Liquidaciones'); }
    const QX = sql(`select id from queue_items where queue = 'evtcx' and subject_id = '${NEG}' and status = 'open'`);
    await pa.goto(B + `/admin/colas?caso=${QX}`);
    ok(await contiene(pa, 'CADA CANCELACIÓN') && await contiene(pa, 'COSTO DE TARJETA'), 'Colas › «Organizadores que cancelan»: cada cancelación con lo devuelto y el costo de la tarjeta que puso To’Latino');
    await pa.screenshot({ path: OUT + 'e6e-admin-evtcx-d.png', fullPage: true });
    await clic(btn(pa, 'Revisado, sin cambios')); await clic(pa.getByText('A todos se les devolvió completo.', { exact: true })); await clic(pa.getByRole('button', { name: 'Cerrar el caso' }).last());
    ok(await espera(() => sql(`select status from queue_items where id = ${QX}`) === 'decided'), 'cerrado como revisado (con motivo y auditoría)');

    // ── 10 · Capturas de teléfono y escritorio ──
    const pnm = await (await ctx(390, 844, true)).newPage(); await entrar(pnm, TERRAZA);
    await pnm.goto(B + `/panel/${NEG}/eventos?det=evt:${A.id}`); await pnm.screenshot({ path: OUT + 'e6e-panel-ficha-m.png', fullPage: true });
    await pnm.goto(B + `/panel/${NEG}/cobros`); await pnm.screenshot({ path: OUT + 'e6e-cobros-m.png', fullPage: true });
    const pd = await (await ctx(1360, 900)).newPage(); await entrar(pd, C1);
    await pd.goto(B + `/eventos/orden/${OA1}`); await pd.screenshot({ path: OUT + 'e6e-orden-movido-d.png', fullPage: true });
    await pd.goto(B + `/eventos/${Bv.SLUG}`); await pd.screenshot({ path: OUT + 'e6e-ficha-cancelada-d.png', fullPage: true });
    await pd.goto(B + `/eventos/orden/${OB[0]}`); await pd.screenshot({ path: OUT + 'e6e-orden-cancelada-d.png', fullPage: true });
    const pam = await (await ctx(390, 844, true)).newPage(); await entrar(pam, ADM);
    await pam.goto(B + '/admin/eventos/liquidaciones'); await pam.screenshot({ path: OUT + 'e6e-admin-liquidaciones-m.png', fullPage: true });
    ok(true, 'capturas de teléfono (390) y escritorio (1360) en cap/e6e-*');
    console.log(`\n${n} ✓ · evt6e`);
  } finally {
    limpiar();
    for (const [u, p] of Object.entries(PREFS)) sql(p ? `update users set notif_prefs = '${p}'::jsonb where id = '${u}'` : `update users set notif_prefs = null where id = '${u}'`);
    if (!TENIA_CUENTA) sql(`delete from stripe_accounts where business_id = '${PAR}' and stripe_account_id = 'acct_sim_${PAR}'`);
    await br.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
