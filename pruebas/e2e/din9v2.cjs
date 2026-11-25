// 9v (25 nov) · Dinero del organizador y de los patrocinios: lo que la medida de consultas halló sin ejecutar en el SERVIDOR en lib/evt-liquidacion.ts,
// lib/revision-pasarela.ts y lib/patrocinio.ts, ahora por el servidor local (simulador de pagos), con el barrido, las acciones del Super Admin y del panel
// (sus ids del manifiesto del build) y lo que de verdad queda en la base y en el simulador:
//   1. La transferencia al organizador que Stripe rechaza (la llave ya se usó con otro monto): sigue en camino con su intento y su código, nunca «pagada»;
//      cuando Stripe la tiene con ese monto, el barrido la cierra pagada una vez.
//   2. La transferencia que nunca llegó a Stripe (un día sin respuesta): su llave vuelve a valer y el barrido la manda otra vez (una transferencia).
//   3. La transferencia que Stripe tiene DOS veces: el barrido abre la alerta gateway_review y el equipo elige cuál vale (la liquidación queda pagada con
//      esa; la otra se revierte con su intención).
//   4. Revertir al organizador cuando Stripe dice que no (ya no hay saldo en esa transferencia): sigue pendiente con su código, nunca «hecha».
//   5. La reversión que nunca llegó a Stripe: vuelve a valer con OTRA llave y sale una vez.
//   6. La reversión que Stripe tiene DOS veces: el equipo elige cuál vale (solo «vale»: lo de más no se deshace con otra).
//   7. Super Admin › Liquidaciones: retener con motivo (la cola se decide, la auditoría, el aviso al organizador); otra vez, «ya está retenida».
//   8. Panel › Patrocinio: «Renovar solo» apagado y encendido; «Cancelar reserva» cuando Stripe NO acepta la devolución: la pantalla no dice «te
//      devolvemos»; dice lo que pasó (la intención queda fallida, con su auditoría y UNA alerta al equipo).
//   9. La renovación sola que Stripe cobró sin contestar y, mientras tanto, otro negocio tomó el último puesto: no se aplica, el patrocinio termina con
//      su nota y el equipo de dinero recibe la alerta (nunca se cobra otra vez).
// Precondiciones propias (corre dos veces seguidas): sus negocios, su dueño (teléfono 555 libre), sus eventos, liquidaciones y patrocinios, y los
// objetos del simulador con sus ids. El admin es el de siempre (570-555-0199). patrocinio_puestos se pone en 1 solo para el paso 9 y vuelve a como estaba.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const crypto = require('crypto'); const fs = require('fs');
const { entrarComo, sql, tarjeta } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, ADM = '5705550199';
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l));
const uno = (q) => primero(sql(q));
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
const barrido = async () => { const r = await fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': ENT.TOK } }); return r.json(); };
const MAN = JSON.parse(fs.readFileSync(ENT.RAIZ + '/apps/web/.next/server/server-reference-manifest.json', 'utf8')).node;
const ACT = Object.fromEntries(Object.entries(MAN).map(([id, v]) => [v.exportedName, id]));
const accion = async (p, nombre, args) => {
  if (!ACT[nombre]) throw new Error('acción sin id en el build: ' + nombre);
  const r = await p.evaluate(async ([id, args]) => { const x = await fetch(location.pathname + location.search, { method: 'POST', headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, body: JSON.stringify(args) }); return { st: x.status, t: await x.text() }; }, [ACT[nombre], args]);
  const l = r.t.split('\n').find((x) => /^1:/.test(x));
  let j = null; try { j = l ? JSON.parse(l.slice(2)) : null; } catch { j = null; }
  return { st: r.st, j, t: r.t };
};
const REPLICA = 'set session_replication_role = replica; ';

(async () => {
  const PUESTOS0 = sql(`select value from platform_config where key = 'patrocinio_puestos'`);
  const restaurar = () => { try { sql(PUESTOS0 ? `update platform_config set value = '${PUESTOS0}' where key = 'patrocinio_puestos'` : `delete from platform_config where key = 'patrocinio_puestos'`); } catch { /* sin base */ } };
  process.on('exit', restaurar);
  // ── Precondiciones propias ──
  const ADMID = sql(`select id from users where phone = '+1${ADM}'`);
  const tel = telPropio();
  sql(`insert into users (phone, first_name, last_name) values ('+1${tel}', 'Dueño', 'Nueve V')`);
  const U = sql(`select id from users where phone = '+1${tel}'`);
  const negocio = (sufijo, cat) => {
    const id = `d9v2${sufijo}-${RUN}`;
    sql(`insert into businesses (id, city_id, category_id, name, status, modules_on) values ('${id}', 'rdg', '${cat}', 'Liquidaciones 9v ${sufijo} ${RUN}', 'active', '{eventos}')`);
    sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${id}', '${U}', 'owner', 'Dueño')`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${id}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
    sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${id}', 'acct_sim_${id}', 'enabled', true, true, true)`);
    return id;
  };
  // Lo vivo que dejó una corrida anterior de esta prueba en su categoría (Reading · Hogar) termina (estados, nada se borra): el paso 9 cuenta los puestos.
  sql(`update sponsorships set status = 'terminado', end_kind = 'admin', end_reason = 'prueba 9v', ended_at = now(), auto_renew = false where business_id like 'd9v2%' and status in ('activo', 'reservado')`);
  const BIZ = negocio('a', 'NEG-NOCHE'), DEST = `acct_sim_${BIZ}`;
  // Una fecha que ya pasó (y su liquidación: paying hace `min` minutos, o pendiente con día de pago por delante).
  let EV = 0;
  const liquidacion = (net, o = {}) => {
    const e = uno(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, approved_at)
                   values ('d9v2-${RUN}-${++EV}', 'rdg', '${BIZ}', 'noche', '{"es":"Liquidación 9v ${RUN} ${EV}","en":"Payout 9v ${RUN} ${EV}"}'::jsonb, current_date - 10, 1200, 1320, 'tickets', 'done', now()) returning id`);
    const f = uno(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date) values (${e}, 'rdg', now() - interval '10 days', now() - interval '10 days' + interval '2 hours', now() - interval '10 days', current_date - 10) returning id`);
    const st = o.st ?? 'paying';
    const id = uno(`${REPLICA}insert into event_settlements (event_date_id, event_id, business_id, city_id, pay_on, status, idem_key, gross_cents, base_cents, net_cents, destination, paying_at, sent_at, gateway_ref)
                    values (${f}, ${e}, '${BIZ}', 'rdg', current_date ${st === 'pending' ? '+ 3' : '- 3'}, '${st}', 'evt-liq-${f}', ${net}, ${net}, ${net}, '${DEST}', ${st === 'paying' ? `now() - interval '${o.min ?? 2} minutes'` : 'null'},
                            ${o.viejo ? `now() - interval '${o.min} minutes'` : 'null'}, null) returning id`);
    if (o.viejo) sql(`${REPLICA}update event_settlements set gateway_ref = 'event_settlements:' || id where id = ${id}`);
    return { id, e, f, idem: `evt-liq-${f}`, ref: `event_settlements:${id}` };
  };
  const liq = (id) => sql(`select status || '|' || coalesce(transfer_id, '') || '|' || attempts || '|' || coalesce(last_error, '') from event_settlements where id = ${id}`);
  // Una liquidación pagada (con su transferencia en el simulador) y una reversión pendiente sobre ella.
  const pagada = (net, trId, revertido = 0) => {
    const L = liquidacion(net);
    sql(`insert into sim_transfers (id, destination, amount_cents, transfer_group, reversed_cents) values ('${trId}', '${DEST}', ${net}, 'evt-${L.e}', ${revertido})`);
    sql(`update event_settlements set status = 'paid', transfer_id = '${trId}', paid_at = now() - interval '40 days' where id = ${L.id}`);
    return L;
  };
  const reversion = (L, amt, o = {}) => {
    const id = uno(`insert into event_settlement_reversals (settlement_id, business_id, city_id, amount_cents, idem_key) values (${L.id}, '', '', ${amt}, 'evt-rev-${L.id}-1') returning id`);
    const hace = o.min ?? 2;
    sql(`${REPLICA}update event_settlement_reversals set created_at = now() - interval '${hace} minutes'${o.viejo ? `, sent_at = now() - interval '${hace} minutes', last_sent_at = now() - interval '${hace} minutes', gateway_ref = 'event_settlement_reversals:' || id, attempts = 2, last_error = 'red'` : ''} where id = ${id}`);
    return { id, ref: `event_settlement_reversals:${id}` };
  };
  const rev = (id) => sql(`select status || '|' || attempts || '|' || coalesce(last_error, '') || '|' || key_n || '|' || coalesce(stripe_reversal_id, '') from event_settlement_reversals where id = ${id}`);
  const alertas = (kind, sujeto) => sql(`select count(*) from money_alerts where kind = '${kind}' and subject_id = '${sujeto}'`);
  const UN_DIA = 25 * 60;

  const b = await chromium.launch();
  try {
    const ca = await b.newContext({ viewport: { width: 1360, height: 900 } }), a = await ca.newPage();
    await entrarComo(a, ADM);

    // ── 1 · Stripe rechaza la transferencia ──
    console.log('1 · La transferencia que Stripe rechaza');
    const L1 = liquidacion(5000);
    sql(`insert into sim_transfers (id, destination, amount_cents, transfer_group, metadata) values ('tr_sim_${L1.idem}', '${DEST}', 4000, 'evt-${L1.e}', '{}'::jsonb)`);
    // ── 2 · Nunca llegó a Stripe (un día sin respuesta) ──
    const L2 = liquidacion(6100, { viejo: true, min: UN_DIA });
    // ── 3 · Stripe la tiene dos veces ──
    const L3 = liquidacion(7200, { viejo: true, min: UN_DIA });
    const TA = `tr_sim_9v_${RUN}_a`, TB = `tr_sim_9v_${RUN}_b`;
    for (const [id, min] of [[TA, UN_DIA - 1], [TB, UN_DIA - 9]]) sql(`insert into sim_transfers (id, destination, amount_cents, transfer_group, metadata, created_at) values ('${id}', '${DEST}', 7200, 'evt-${L3.e}', '{"tl_intencion":"${L3.ref}"}'::jsonb, now() - interval '${min} minutes')`);
    // ── 4 · Revertir sin saldo ──
    const P4 = pagada(3000, `tr_sim_9v_${RUN}_p4`, 3000), R4 = reversion(P4, 1000);
    // ── 5 · La reversión que nunca llegó ──
    const P5 = pagada(3000, `tr_sim_9v_${RUN}_p5`), R5 = reversion(P5, 1200, { viejo: true, min: UN_DIA });
    // ── 6 · La reversión que Stripe tiene dos veces ──
    const P6 = pagada(3000, `tr_sim_9v_${RUN}_p6`), R6 = reversion(P6, 900, { viejo: true, min: UN_DIA });
    const VA = `trr_sim_9v_${RUN}_a`, VB = `trr_sim_9v_${RUN}_b`;
    for (const [id, min] of [[VA, UN_DIA - 1], [VB, UN_DIA - 9]]) sql(`insert into sim_transfer_reversals (id, transfer_id, amount_cents, metadata, created_at) values ('${id}', 'tr_sim_9v_${RUN}_p6', 900, '{"tl_intencion":"${R6.ref}"}'::jsonb, now() - interval '${min} minutes')`);
    sql(`update sim_transfers set reversed_cents = 1800 where id = 'tr_sim_9v_${RUN}_p6'`);

    await barrido();
    ok(liq(L1.id) === 'paying||1|idempotency_error', 'Stripe dijo que no: sigue en camino con su intento y su código (nunca pagada)');
    ok(sql(`select count(*) from audit_entries where action = 'evento.liquidacion.pagar' and target_id = '${L1.id}'`) === '0' && sql(`select count(*) from notifications where tpl = 'evt_pago' and ref_id = '${L1.id}'`) === '0', '… sin auditoría de «pagada» ni aviso «te pagamos» al organizador');
    ok(liq(L2.id).startsWith('paying||') && sql(`select last_error || '|' || (key_from is not null) from event_settlements where id = ${L2.id}`) === 'nunca_llego|true' && sql(`select count(*) from audit_entries where action = 'evento.liquidacion.reintentar' and target_id = '${L2.id}'`) === '1', 'nunca llegó: su llave vuelve a valer, con su auditoría');
    ok(alertas('gateway_review', L3.ref) === '1' && liq(L3.id).startsWith('paying|'), `Stripe la tiene dos veces: alerta gateway_review (${L3.ref}) y sigue en camino`);
    ok(rev(R4.id) === 'pending|1|amount_too_large|0|', 'revertir sin saldo: sigue pendiente con su intento y su código (nunca hecha)');
    ok(/^done\|\d+\|\|1\|trr_sim_/.test(rev(R5.id)), 'la reversión que nunca llegó: vuelve a valer con OTRA llave y sale (una vez): ' + rev(R5.id));
    ok(sql(`select count(*) from sim_transfer_reversals where transfer_id = 'tr_sim_9v_${RUN}_p5'`) === '1' && sql(`select count(*) from audit_entries where action = 'evento.liquidacion.revertir_otra_vez' and target_id = '${P5.id}'`) === '1', '… una sola en el simulador, con su auditoría');
    ok(alertas('gateway_review', R6.ref) === '1' && rev(R6.id).startsWith('pending|'), `la reversión que Stripe tiene dos veces: alerta gateway_review (${R6.ref})`);

    // 1 (cont.) · Stripe la tiene con ese monto (la misma llave): el siguiente barrido la cierra pagada, una vez.
    sql(`update sim_transfers set amount_cents = 5000 where id = 'tr_sim_${L1.idem}'`);
    // 2 (cont.) · el siguiente barrido la manda con la misma llave.
    await barrido();
    ok(liq(L1.id) === `paid|tr_sim_${L1.idem}|1|` && sql(`select count(*) from audit_entries where action = 'evento.liquidacion.pagar' and target_id = '${L1.id}'`) === '1', 'con la transferencia en Stripe por ese monto: pagada una vez, con su auditoría');
    ok(liq(L2.id) === `paid|tr_sim_${L2.idem}|0|` && sql(`select count(*) from sim_transfers where id = 'tr_sim_${L2.idem}' and amount_cents = 6100`) === '1', 'la que nunca llegó: sale con la MISMA llave y el mismo monto, una transferencia');

    // ── 3 y 6 · «Elegir cuál vale» (Super Admin › Planes › Ingresos) ──
    console.log('3 · Transferencia duplicada: el equipo elige cuál vale');
    await a.goto(B + '/admin/planes?tab=ing');
    const alerta = (ref) => sql(`select id from money_alerts where kind = 'gateway_review' and subject_id = '${ref}'`);
    {
      const r = await accion(a, 'alertaDecidir', [alerta(L3.ref), TA, 'Transferencia duplicada: vale la primera.']);
      ok(r.j?.ok, 'decidido: ' + (r.j?.mensaje ?? r.t.slice(0, 300)));
      ok(sql(`select decision || '|' || stripe_id || '|' || staff_id from gateway_reviews where subject_kind = 'event_settlements' and subject_id = ${L3.id}`) === `vale|${TA}|${ADMID}`, 'la decisión: vale la primera, con quien decidió (una sola)');
      ok(liq(L3.id).startsWith(`paid|${TA}|`), 'la liquidación queda pagada con esa transferencia');
      ok(sql(`select medio || '|' || stripe_id || '|' || amount_cents from gateway_refunds where subject_kind = 'event_settlements' and subject_id = ${L3.id}`) === `reversal|${TB}|7200`, 'la que sobró se revierte con su intención (medio reversión, por su monto)');
      const otra = await accion(a, 'alertaDecidir', [alerta(L3.ref), TB, 'Otra vez, la segunda.']);
      ok(otra.j?.ok === false, 'decidir otra vez no cambia nada: ' + otra.j?.mensaje);
    }
    console.log('6 · Reversión duplicada: el equipo elige cuál vale');
    {
      const r = await accion(a, 'alertaDecidir', [alerta(R6.ref), VA, 'Reversión duplicada: vale la primera.']);
      ok(r.j?.ok, 'decidido: ' + (r.j?.mensaje ?? r.t.slice(0, 300)));
      ok(rev(R6.id).startsWith('done|') && rev(R6.id).endsWith(`|${VA}`), 'la reversión queda hecha con esa');
      ok(sql(`select count(*) from gateway_refunds where subject_kind = 'event_settlement_reversals' and subject_id = ${R6.id}`) === '0' && sql(`select count(*) from sim_transfer_reversals where transfer_id = 'tr_sim_9v_${RUN}_p6'`) === '2', 'lo de más no se deshace con otra (ni intención nueva ni otra en el simulador)');
      const nin = await accion(a, 'alertaDecidir', [alerta(R6.ref), 'ninguno', 'Ninguna vale.']);
      ok(nin.j?.ok === false, 'ya decidida: ' + nin.j?.mensaje);
    }

    // ── 7 · Super Admin › Liquidaciones: retener ──
    console.log('7 · Retener una liquidación (Super Admin)');
    {
      const L7 = liquidacion(4400, { st: 'pending' });
      sql(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('evtpago', 'event_settlement', '${L7.id}', '${BIZ}', 'rdg')`);
      await a.goto(B + '/admin/eventos/liquidaciones');
      const r = await accion(a, 'liqRetener', [L7.id, 'Revisión de Confianza 9v']);
      ok(r.j?.ok && r.j.mensaje === 'Retenida. El organizador ve el motivo en Cobros.', 'retenida: ' + (r.j?.mensaje ?? r.t.slice(0, 200)));
      ok(sql(`select status || '|' || hold_kind || '|' || hold_note || '|' || held_by from event_settlements where id = ${L7.id}`) === `held|admin|Revisión de Confianza 9v|${ADMID}`, 'queda retenida por To\'Latino con el motivo y quién');
      ok(sql(`select status || '|' || decision from queue_items where queue = 'evtpago' and subject_id = '${L7.id}'`) === 'decided|retener', 'su caso de la cola queda decidido «retener»');
      ok(sql(`select count(*) from audit_entries where action = 'evento.liquidacion.retener' and target_id = '${L7.id}' and actor_id = '${ADMID}'`) === '1', 'con su auditoría');
      ok(sql(`select count(*) from notifications n join business_members m on m.user_id = n.user_id and m.business_id = '${BIZ}' where n.tpl = 'evt_pago_retenido' and n.ref_id = '${L7.id}:admin'`) === '1', 'el organizador recibe el aviso con el motivo');
      const otra = await accion(a, 'liqRetener', [L7.id, 'Otra vez']);
      ok(otra.j?.ok === false && otra.j.mensaje === "Ya está retenida por To'Latino.", '«Ya está retenida por To\'Latino.»');
      const pag = await accion(a, 'liqRetener', [L1.id, 'Tarde']);
      ok(pag.j?.ok === false && pag.j.mensaje === 'Ya se pagó o va en camino: no se retiene.', 'una ya pagada no se retiene');
    }
    await ca.close();

    // ── 8 · Panel › Patrocinio ──
    console.log('8 · Patrocinio: renovar solo y cancelar la reserva cuando Stripe no devuelve');
    const PM = tarjeta(tel, '4242');
    const BP = negocio('p', 'NEG-HOGAR');
    const patrocinio = (biz, a0, z, st, ren, pm = PM) => uno(`with x as (insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
      values ('${biz}', 'NEG-HOGAR', 'rdg', ${a0}, ${z}, 'week', '${st}', 1500, '${U}', '${pm}', ${ren}) returning id) select id from x`);
    const cobro = (sid, biz, cents, pm = PM) => { const pi = `pi_sim_9v_${RUN}_${sid}`;
      sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card, capture_method) values ('${pi}', ${cents}, 0, 'tolatino', 'succeeded', ${cents}, '${pm}', 'automatic')`);
      sql(`insert into sponsorship_payments (kind, ref_id, business_id, city_id, payer_user_id, amount_cents, pi, idem_key, card_brand, card_last4, reason) values ('negocio', ${sid}, '${biz}', 'rdg', '${U}', ${cents}, '${pi}', 'd9v-${pi}', 'visa', '4242', 'compra')`);
      return pi; };
    const cd = await b.newContext({ viewport: { width: 1360, height: 900 } }), pd = await cd.newPage();
    await entrarComo(pd, tel); await pd.goto(B + `/panel/${BP}`);
    {
      const S = patrocinio(BP, "now() + interval '40 days'", "now() + interval '47 days'", 'reservado', true), pi = cobro(S, BP, 1500);
      const off = await accion(pd, 'patRenovarSolo', [BP, S, false]);
      ok(off.j?.ok && sql(`select auto_renew from sponsorships where id = ${S}`) === 'f' && sql(`select count(*) from audit_entries where action = 'patrocinio.renovar_solo_off' and target_id = '${BP}'`) === '1', '«Renovar solo» apagado, con su auditoría');
      const on = await accion(pd, 'patRenovarSolo', [BP, S, true]);
      ok(on.j?.ok && sql(`select auto_renew from sponsorships where id = ${S}`) === 't', '… y encendido otra vez');
      const ajeno = await accion(pd, 'patRenovarSolo', [BIZ, S, false]);
      ok(ajeno.j?.ok === false && sql(`select auto_renew from sponsorships where id = ${S}`) === 't', 'desde otro negocio (del mismo dueño) no cambia el patrocinio ajeno');
      // Stripe no acepta la devolución: ese cobro ya se devolvió por fuera (el simulador no tiene saldo que devolver).
      sql(`update sim_intents set refunded_cents = captured_cents where id = '${pi}'`);
      const r = await accion(pd, 'patTerminar', [BP, S]);
      const pd0 = sql(`select status || '|' || attempts || '|' || last_error from sponsorship_refunds where kind = 'negocio' and ref_id = ${S}`);
      ok(r.j?.ok && sql(`select status from sponsorships where id = ${S}`) === 'cancelado', 'la reserva queda cancelada');
      ok(pd0 === 'failed|1|amount_too_large', 'la devolución: Stripe dijo que no, queda fallida con su código (no se reintenta sola): ' + pd0);
      ok(sql(`select count(*) from audit_entries where action = 'patrocinio.devolucion_fallida' and target_id = '${BP}'`) === '1' && alertas('refund_stuck', `sponsorship_refunds:${sql(`select id from sponsorship_refunds where kind = 'negocio' and ref_id = ${S}`)}`) === '1', 'con su auditoría y UNA alerta al equipo de dinero');
      ok(sql(`select count(*) from sponsorship_payments where ref_id = ${S} and reason = 'devolucion'`) === '0', 'el libro no tiene ninguna devolución');
      ok(!r.j.devuelto && r.j.devolucion === 'fallida', `la pantalla no dice «te devolvemos»: lo que pasó es que no salió (devuelto ${r.j.devuelto}, devolucion ${r.j.devolucion})`);
    }

    // ── 9 · La renovación cobrada sin respuesta y el último puesto tomado ──
    console.log('9 · Renovación cobrada sin respuesta y el puesto ya tomado');
    {
      const PMX = tarjeta(tel, '0408', { predeterminada: false });
      const S = patrocinio(BP, "now() - interval '7 days'", "now() - interval '1 minute'", 'activo', true, PMX);
      cobro(S, BP, 1500, PMX);
      sql(PUESTOS0 ? `update platform_config set value = '1' where key = 'patrocinio_puestos'` : `insert into platform_config (key, value) values ('patrocinio_puestos', '1')`);
      await barrido();
      ok(sql(`select status from sponsorships where id = ${S}`) === 'activo' && sql(`select count(*) from offsession_charges where kind = 'patrocinio_negocio' and ref_id = '${S}' and status = 'pending' and sent_at is not null`) === '1', 'Stripe no contestó: el patrocinio sigue igual y la renovación queda en camino (mandada)');
      // Mientras tanto otro negocio de la categoría toma el último puesto de la semana que viene.
      const BQ = negocio('q', 'NEG-HOGAR');
      const SQ = patrocinio(BQ, 'now()', "now() + interval '7 days'", 'activo', false);
      await barrido();
      ok(sql(`select status || '|' || renew_note from sponsorships where id = ${S}`) === 'terminado|no quedaba puesto' && sql(`select count(*) from sponsorships where renewed_from = ${S}`) === '0', 'el cobro salió pero ya no quedaba puesto: no se aplica (termina con su nota, sin patrocinio nuevo)');
      ok(sql(`select count(*) from money_alerts where kind = 'offsession_unapplied' and subject_id = 'pat-negocio-renov-${S}'`) === '1' && sql(`select count(*) from sim_intents where card = '${PMX}' and status = 'succeeded' and amount_cents = 1500 and id <> 'pi_sim_9v_${RUN}_${S}'`) === '1', 'el equipo de dinero recibe la alerta y el simulador tiene UN cobro (nunca otro)');
      ok(sql(`select count(*) from notifications n join business_members m on m.user_id = n.user_id and m.business_id = '${BP}' where n.tpl = 'biz_patrocinio_no_renovo' and n.created_at > now() - interval '5 minutes'`) !== '0', 'el negocio recibe el aviso de que no se renovó');
      sql(`update sponsorships set status = 'terminado', end_kind = 'admin', end_reason = 'prueba 9v', ended_at = now(), auto_renew = false where id = ${SQ}`);
      restaurar();
    }

    // ── 10 · La devolución de un patrocinio que nunca llegó a Stripe ──
    console.log('10 · Devolución de un patrocinio que nunca llegó (un día sin respuesta)');
    {
      const S = patrocinio(BP, "now() + interval '60 days'", "now() + interval '67 days'", 'reservado', false), pi = cobro(S, BP, 1500);
      // La reserva se canceló (la base decide devolver todo y anota la intención) y se mandó hace un día sin respuesta.
      sql(`update sponsorships set status = 'cancelado', end_kind = 'dueno', ended_at = now(), ended_by = '${U}', refund_cents = 1500, refund_days = 7, refund_motive = 'reserva_cancelada' where id = ${S}`);
      const z = sql(`select id from sponsorship_refunds where kind = 'negocio' and ref_id = ${S}`);
      ok(z && sql(`select status from sponsorship_refunds where id = ${z}`) === 'pending', 'la base anota la intención de devolver');
      sql(`${REPLICA}update sponsorship_refunds set created_at = now() - interval '${UN_DIA} minutes', sent_at = now() - interval '${UN_DIA} minutes', last_sent_at = now() - interval '${UN_DIA} minutes', gateway_ref = 'sponsorship_refunds:' || id, attempts = 2, last_error = 'red' where id = ${z}`);
      await barrido();
      ok(sql(`select status || '|' || key_n || '|' || (stripe_refund_id like 're_sim_%') from sponsorship_refunds where id = ${z}`) === 'done|1|true', 'el barrido pregunta: nunca llegó → vuelve a valer con OTRA llave y sale');
      ok(sql(`select count(*) from sim_refunds where payment_intent = '${pi}'`) === '1' && sql(`select refunded_cents from sim_intents where id = '${pi}'`) === '1500', 'una sola devolución en el simulador, por lo decidido');
      ok(sql(`select count(*) from sponsorship_payments where ref_id = ${S} and reason = 'devolucion' and amount_cents = 1500`) === '1', 'el libro: una devolución');
      await barrido();
      ok(sql(`select count(*) from sim_refunds where payment_intent = '${pi}'`) === '1', 'otro barrido no devuelve otra vez');
    }
    await cd.close();
  } finally { restaurar(); await b.close(); }
  console.log(`OK · ${n} comprobaciones`);
})().catch((e) => { console.error(e); process.exit(1); });
