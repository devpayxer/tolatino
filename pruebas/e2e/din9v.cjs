// 9v (25 nov) · Dinero de los boletos: lo que la medida de consultas (pruebas/lib/consultas-medir.cjs) halló sin ejecutar en el SERVIDOR en lib/boletos.ts y
// lib/boletos-despues.ts, ahora por el servidor local (simulador de pagos), con las acciones de la app (sus ids del manifiesto del build) y el barrido, y con
// lo que de verdad queda en la base y en el simulador:
//   1. «Cambiar» en la hoja de pago con boleto, mesa, extra y código: todo vuelve (existencia, mesa, extra y el uso apartado del código).
//   2. La oferta de la lista de espera soltada («Cambiar» sobre la oferta): sale de la lista (left) y la existencia vuelve.
//   3. El banco pide 3-D Secure y la persona suelta el apartado: el barrido libera la autorización que quedó sin orden (una vez).
//   4. La autorización ya no se deja cobrar al capturar (el simulador la tiene cancelada): «No se cobró nada» y es verdad: nada capturado, la orden
//      cancelada, los boletos anulados, la existencia (boleto, mesa, extra) y el código vuelven, el cobro liberado con su código.
//   5. Algo se descuadra entre autorizar y emitir (la existencia apartada no está): no queda orden, la autorización se libera y no se cobra nada.
//   6. Pagar un apartado vencido (boleto, mesa, extra y código): se suelta y se vuelve a apartar todo, y se cobra una vez.
//   7. Panel › «Reenviar boletos» (el dueño; otro negocio no; una orden que no existe, tampoco).
//   8. «Cancelar mis boletos» de una orden con extra: el extra vuelve menos su parte del cargo (líneas de la devolución por extra), hecho por la pasarela.
//   9. El organizador cancela el evento: la orden con una disputa abierta no se devuelve (los boletos se anulan, sin dinero); la que Stripe no devolvió
//      queda pendiente; pasado un día sin llegar a Stripe y con el cobro en disputa, el barrido la da por fallida (la cancelación resta lo que contaba)
//      y el equipo de dinero recibe UNA alerta.
// Precondiciones propias (corre dos veces seguidas): su negocio, su dueño y sus compradores (teléfonos 555 libres), sus dos eventos y sus códigos.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const crypto = require('crypto'); const fs = require('fs');
const { entrarComo, sql, tarjeta } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, ADM = '5705550199', SEC = ENT.sec('STRIPE_WEBHOOK_SECRET');
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l));
const uno = (q) => primero(sql(q));
const RUN = crypto.randomBytes(4).toString('hex'), TAG = `[d9v ${RUN}]`;
// 9v (segunda tanda) · El dinero como lo escribe la app (lib/evt-comun dinero: $15 · $13.25) y el último aviso de una plantilla sobre una orden.
const din = (c) => { const x = Number(c) / 100; return '$' + (x % 1 ? x.toFixed(2) : String(x)); };
const avisoDe = (op, tpl, ref) => sql(`select n.body from notifications n join operations o on o.user_id = n.user_id where o.id = ${op} and n.tpl = '${tpl}' and n.ref_id = '${ref}' order by n.id desc limit 1`);
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
const barrido = async () => { const r = await fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': ENT.TOK } }); return r.json(); };
const webhook = async (ev) => {
  const cuerpo = JSON.stringify(ev), t = Math.floor(Date.now() / 1000);
  const r = await fetch(B + '/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${crypto.createHmac('sha256', SEC).update(`${t}.${cuerpo}`).digest('hex')}` }, body: cuerpo });
  return r.status;
};
// Las acciones del servidor por su id del build (como cfgcal9b): la misma llamada que hace la pantalla, desde una página donde vive la acción.
const MAN = JSON.parse(fs.readFileSync(ENT.RAIZ + '/apps/web/.next/server/server-reference-manifest.json', 'utf8')).node;
const ACT = Object.fromEntries(Object.entries(MAN).map(([id, v]) => [v.exportedName, id]));
const accion = async (p, nombre, args) => {
  if (!ACT[nombre]) throw new Error('acción sin id en el build: ' + nombre);
  const r = await p.evaluate(async ([id, args]) => { const x = await fetch(location.pathname + location.search, { method: 'POST', headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, body: JSON.stringify(args) }); return { st: x.status, t: await x.text() }; }, [ACT[nombre], args]);
  const l = r.t.split('\n').find((x) => /^1:/.test(x));
  let j = null; try { j = l ? JSON.parse(l.slice(2)) : null; } catch { j = null; }
  return { st: r.st, j, t: r.t };
};

(async () => {
  // ── Precondiciones propias ──
  const ADMID = sql(`select id from users where phone = '+1${ADM}'`);
  const persona = (nombre) => { const t = telPropio(); sql(`insert into users (phone, first_name, last_name) values ('+1${t}', '${nombre}', 'Nueve V')`); return { tel: t, id: sql(`select id from users where phone = '+1${t}'`) }; };
  const DUENO = persona('Dueña'), C1 = persona('Compra'), C2 = persona('Segunda'), C3 = persona('Tercera');
  const BIZ = `d9v-${RUN}`, NOMBRE = `Noche 9v ${RUN}`;
  sql(`insert into businesses (id, city_id, category_id, name, status, modules_on) values ('${BIZ}', 'hzl', 'NEG-NOCHE', '${NOMBRE}', 'active', '{eventos}')`);
  sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${BIZ}', '${DUENO.id}', 'owner', 'Dueña')`);
  sql(`insert into business_stats_cache (business_id, plan) values ('${BIZ}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
  sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${BIZ}', 'acct_sim_${BIZ}', 'enabled', true, true, true)`);
  const tk = (cap) => JSON.stringify([{ id: 'gen', n: { es: `General ${TAG}`, en: 'General' }, s: { es: '', en: '' }, p: 1500, cap, off: false }]);
  const mt = JSON.stringify([{ id: 'pista', z: { es: 'Mesa · Pista', en: 'Table · Dance floor' }, seats: 4, min: 12000, dep: 4000, cap: 2 }]);
  const ad = JSON.stringify([{ id: 'cum', n: { es: 'Detalle de cumpleaños', en: 'Birthday setup' }, s: { es: '', en: '' }, p: 3500, kind: 'detalle', mesa: true }]);
  const evento = (titulo, cap, conMesa) => {
    const ev = primero(sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, tables_cfg, addons_cfg)
      values ('', 'hzl', '${BIZ}', 'noche', '{"es":"${titulo} ${TAG}","en":"${titulo} ${TAG}"}', (now() at time zone 'America/New_York')::date + 5, 1320, 1560, 'tickets', 'live', now(), now(), '${ADMID}', 60, '${ADMID}', 21,
              '${tk(cap)}'::jsonb, '${conMesa ? mt : '[]'}'::jsonb, '${conMesa ? ad : '[]'}'::jsonb) returning id`));
    sql(`select evt_sincronizar_fechas(${ev})`);
    return { id: ev, F: sql(`select id from event_dates where event_id = ${ev}`), slug: sql(`select slug from events where id = ${ev}`), T: sql(`select id from ticket_types where event_id = ${ev} and cfg_key = 'gen'`),
      M: conMesa ? sql(`select id from event_tables where event_id = ${ev}`) : null, A: conMesa ? sql(`select id from event_addons where event_id = ${ev}`) : null };
  };
  const E1 = evento('Noche de dinero', 10, true), E2 = evento('Último lugar', 1, false);
  sql(`insert into discount_codes (event_id, city_id, business_id, code, kind, value, uses_max) values (${E1.id}, 'hzl', '${BIZ}', 'NUEVEVA', 'amount', 300, 5), (${E1.id}, 'hzl', '${BIZ}', 'NUEVEVB', 'amount', 300, 5), (${E1.id}, 'hzl', '${BIZ}', 'NUEVEVC', 'amount', 300, 5)`);
  const cod = (c) => sql(`select held_n || '|' || used_n from discount_codes where event_id = ${E1.id} and code = '${c}'`);
  const exist = () => sql(`select (select held_n || '/' || sold_n from ticket_stock where ticket_type_id = ${E1.T} and event_date_id = ${E1.F}) || '|' || (select held_n || '/' || sold_n from table_stock where table_id = ${E1.M} and event_date_id = ${E1.F}) || '|' || (select held_n || '/' || sold_n from event_addons where id = ${E1.A})`);
  const todo = (codigo) => ({ fecha: E1.F, boletos: [{ id: E1.T, q: 1 }], mesa: E1.M, extras: [E1.A], codigo });
  const hold = (id) => sql(`select status || '|' || coalesce(payment_intent, '') || '|' || (pi_released_at is not null) || '|' || pay_attempts || '|' || coalesce(operation_id::text, '') from ticket_holds where id = '${id}'`).split('|');

  const b = await chromium.launch();
  try {
    const ctx = async () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const c1 = await ctx(), p1 = await c1.newPage(), c2 = await ctx(), p2 = await c2.newPage(), c3 = await ctx(), p3 = await c3.newPage();
    await entrarComo(p1, C1.tel); await entrarComo(p2, C2.tel); await entrarComo(p3, C3.tel);
    const PM1 = tarjeta(C1.tel, '4242'), PM2 = tarjeta(C2.tel, '4242'), PM2V = tarjeta(C2.tel, '3184', { predeterminada: false }), PM3 = tarjeta(C3.tel, '4242');
    for (const p of [p1, p2, p3]) await p.goto(B + `/eventos/${E1.slug}/boletos?fecha=${E1.F}`);

    // ── 1 · «Cambiar» con boleto, mesa, extra y código ──
    console.log('1 · Soltar un apartado con boleto, mesa, extra y código');
    {
      const a = await accion(p1, 'evtApartar', [todo('NUEVEVA')]);
      ok(a.j?.ok && a.j.apartado, 'aparta boleto, mesa, extra y código ' + (a.j?.ok ? '' : a.t.slice(0, 300)));
      ok(exist() === '1/0|1/0|1/0' && cod('NUEVEVA') === '1|0', 'la existencia y el código quedan apartados');
      const s = await accion(p1, 'evtSoltar', [a.j.apartado]);
      ok(s.j?.ok && hold(a.j.apartado)[0] === 'released', '«Cambiar»: el apartado queda soltado');
      ok(exist() === '0/0|0/0|0/0' && cod('NUEVEVA') === '0|0', 'todo vuelve: el boleto, la mesa, el extra y el uso apartado del código');
      const otra = await accion(p2, 'evtSoltar', [a.j.apartado]);
      ok(otra.j?.ok && exist() === '0/0|0/0|0/0', 'otra cuenta soltando el mismo apartado no cambia nada');
    }

    // ── 2 · La oferta de la lista de espera soltada ──
    console.log('2 · La oferta de la lista de espera soltada');
    {
      await p1.goto(B + `/eventos/${E2.slug}/boletos?fecha=${E2.F}`); await p2.goto(B + `/eventos/${E2.slug}?fecha=${E2.F}`);
      const a = await accion(p1, 'evtApartar', [{ fecha: E2.F, boletos: [{ id: E2.T, q: 1 }], mesa: null, extras: [], codigo: null }]);
      ok(a.j?.ok, 'el último lugar queda apartado (se agotó)');
      const w = await accion(p2, 'esperaAnotar', [E2.F, 1]);
      ok(w.j?.ok && sql(`select status from waitlist where event_date_id = ${E2.F} and user_id = '${C2.id}'`) === 'waiting', 'la segunda persona se anota en la lista');
      await accion(p1, 'evtSoltar', [a.j.apartado]);
      const of = sql(`select hold_id from waitlist where event_date_id = ${E2.F} and user_id = '${C2.id}' and status = 'offered'`);
      ok(of && sql(`select waitlist_id is not null from ticket_holds where id = '${of}'`) === 't', 'al soltar, el lugar se le ofrece a la lista (un apartado con su oferta)');
      await p2.goto(B + `/eventos/${E2.slug}/boletos?fecha=${E2.F}`);
      const s = await accion(p2, 'evtSoltar', [of]);
      ok(s.j?.ok && hold(of)[0] === 'released' && sql(`select status from waitlist where event_date_id = ${E2.F} and user_id = '${C2.id}'`) === 'left', 'soltar la oferta = salir de la lista (left) y el apartado queda soltado');
      ok(sql(`select held_n || '/' || sold_n from ticket_stock where ticket_type_id = ${E2.T} and event_date_id = ${E2.F}`) === '0/0', 'el lugar vuelve a estar libre');
      await p1.goto(B + `/eventos/${E1.slug}/boletos?fecha=${E1.F}`); await p2.goto(B + `/eventos/${E1.slug}/boletos?fecha=${E1.F}`);
    }

    // ── 3 · 3-D Secure y la persona suelta: el barrido libera la autorización ──
    console.log('3 · Autorización sin orden (3-D Secure y «Cambiar»): la libera el barrido');
    {
      const a = await accion(p2, 'evtApartar', [{ fecha: E1.F, boletos: [{ id: E1.T, q: 1 }], mesa: null, extras: [], codigo: null }]);
      const r = await accion(p2, 'evtPagar', [a.j.apartado, PM2V, []]);
      ok(r.j && r.j.ok === false && /confirmar que eres tú/.test(r.j.msg?.es ?? '') && /no se cobró nada/i.test(r.j.msg?.es ?? ''), 'el banco pide confirmar: «no se cobró nada todavía»');
      const pi = hold(a.j.apartado)[1];
      ok(pi.startsWith('pi_sim_') && sql(`select status from sim_intents where id = '${pi}'`) === 'requires_action', 'la autorización queda pendiente de verificar en el simulador');
      await accion(p2, 'evtSoltar', [a.j.apartado]);
      ok(hold(a.j.apartado)[0] === 'released' && hold(a.j.apartado)[2] === 'false', 'soltado, la autorización sigue viva hasta el barrido');
      await barrido();
      ok(hold(a.j.apartado)[2] === 'true' && hold(a.j.apartado)[3] === '1' && sql(`select status || '|' || captured_cents from sim_intents where id = '${pi}'`) === 'canceled|0', 'el barrido la libera (cancelada en el simulador, nada cobrado) y lo anota en el apartado');
      await barrido();
      ok(hold(a.j.apartado)[3] === '1', 'una sola vez (el siguiente barrido no la toca)');
    }

    // ── 4 · La captura falla: «No se cobró nada» y es verdad ──
    console.log('4 · La autorización ya no se deja cobrar al capturar');
    {
      const a = await accion(p2, 'evtApartar', [todo('NUEVEVB')]);
      ok(a.j?.ok && exist() === '1/0|1/0|1/0', 'aparta boleto, mesa, extra y código');
      // El banco canceló la autorización (venció, o la anuló) antes de capturar: la misma llave que mandará «Pagar» la encuentra así.
      const pi = `pi_sim_${a.j.apartado}-${PM2.slice(-24)}-${hold(a.j.apartado)[3]}`;
      sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, card) values ('${pi}', ${sql(`select total_cents from ticket_holds where id = '${a.j.apartado}'`)}, 0, 'tolatino', 'canceled', '${PM2}')`);
      const r = await accion(p2, 'evtPagar', [a.j.apartado, PM2, ['Segunda']]);
      ok(r.j && r.j.ok === false && r.j.msg?.es === 'Tu banco no completó el cobro. No se cobró nada.' && r.j.msg?.en === 'Your bank did not complete the charge. Nothing was charged.', '«Tu banco no completó el cobro. No se cobró nada.» (ES/EN)');
      ok(sql(`select status || '|' || captured_cents from sim_intents where id = '${pi}'`) === 'canceled|0', '… y es verdad: el simulador no capturó nada');
      const op = sql(`select operation_id from ticket_holds where id = '${a.j.apartado}'`);
      ok(sql(`select status || '|' || pay_status || '|' || cancelled_by from operations where id = ${op}`) === 'cancelled|released|system', 'la orden queda cancelada por el sistema, con el cobro liberado');
      ok(sql(`select status || '|' || failure_code from payments where operation_id = ${op}`) === 'released|canceled', 'el cobro: liberado, con el código que dio la pasarela (canceled)');
      ok(sql(`select count(*) from tickets where operation_id = ${op} and status <> 'void'`) === '0' && sql(`select count(*) from ticket_log where operation_id = ${op} and kind = 'cobro_fallido'`) === sql(`select count(*) from tickets where operation_id = ${op}`), 'cada boleto (y la mesa) queda anulado, con su rastro');
      ok(exist() === '0/0|0/0|0/0' && cod('NUEVEVB') === '0|0', 'la existencia vuelve (boleto, mesa y extra) y el código también');
      ok(sql(`select count(*) from operation_events where operation_id = ${op} and kind = 'payment_failed'`) === '1' && sql(`select count(*) from operation_events where operation_id = ${op} and kind = 'payment_captured'`) === '0', 'el historial dice «falló el cobro» y nunca «cobrado»');
    }

    // ── 5 · Se descuadra entre autorizar y emitir ──
    console.log('5 · La existencia apartada no está al emitir');
    {
      const a = await accion(p3, 'evtApartar', [{ fecha: E1.F, boletos: [{ id: E1.T, q: 1 }], mesa: null, extras: [], codigo: null }]);
      sql(`update ticket_stock set held_n = held_n - 1 where ticket_type_id = ${E1.T} and event_date_id = ${E1.F}`);
      const r = await accion(p3, 'evtPagar', [a.j.apartado, PM3, []]);
      ok(!r.j?.ok, 'no da la compra por hecha');
      const h = hold(a.j.apartado);
      ok(h[0] === 'held' && h[4] === '' && sql(`select count(*) from operations where client_key = '${a.j.apartado}'`) === '0', 'no queda ninguna orden (todo se deshizo)');
      ok(h[2] === 'true' && h[3] === '1' && sql(`select status || '|' || captured_cents from sim_intents where id = '${h[1]}'`) === 'canceled|0', 'la autorización se liberó al momento y nada se cobró');
      sql(`update ticket_stock set held_n = held_n + 1 where ticket_type_id = ${E1.T} and event_date_id = ${E1.F}`);
      await accion(p3, 'evtSoltar', [a.j.apartado]);
      ok(exist() === '0/0|0/0|0/0', 'soltado, la existencia queda en cero');
    }

    // ── 6 · Pagar un apartado vencido ──
    console.log('6 · Pagar un apartado vencido (se vuelve a apartar todo)');
    let OA = null;
    {
      const a = await accion(p1, 'evtApartar', [todo('NUEVEVC')]);
      ok(a.j?.ok, 'aparta boleto, mesa, extra y código');
      sql(`update ticket_holds set expires_at = now() - interval '1 minute' where id = '${a.j.apartado}'`);
      const r = await accion(p1, 'evtPagar', [a.j.apartado, PM1, ['Compra']]);
      ok(r.j?.ok && /^B-\d+$/.test(r.j.numero), 'vencido, se vuelve a apartar y se paga: ' + (r.j?.numero ?? r.t.slice(0, 200)));
      OA = r.j.numero;
      const op = sql(`select id from operations where number = '${OA}'`), pi = sql(`select stripe_payment_intent from payments where operation_id = ${op}`);
      ok(exist() === '0/1|0/1|0/1' && cod('NUEVEVC') === '0|1', 'vendido: boleto, mesa y extra (nada queda apartado) y el código usado una vez');
      ok(sql(`select status || '|' || captured_cents from sim_intents where id = '${pi}'`) === `succeeded|${sql(`select total_cents from operations where id = ${op}`)}` && sql(`select status from payments where operation_id = ${op}`) === 'captured', 'cobrado una vez, lo que dice la orden');
    }

    // ── 7 · Panel › «Reenviar boletos» ──
    console.log('7 · Panel › Reenviar boletos');
    {
      const cd = await ctx(), pd = await cd.newPage();
      await entrarComo(pd, DUENO.tel); await pd.goto(B + `/panel/${BIZ}`);
      const r = await accion(pd, 'evtReenviar', [BIZ, OA]);
      ok(r.j?.ok, 'el dueño reenvía los boletos de la orden');
      ok(sql(`select count(*) from ticket_log l join operations o on o.id = l.operation_id where o.number = '${OA}' and l.kind = 'reenviado' and l.by_kind = 'business'`) === sql(`select count(*) from tickets t join operations o on o.id = t.operation_id where o.number = '${OA}'`), 'el rastro de cada boleto dice «reenviado» por el negocio');
      ok(sql(`select count(*) from notifications where user_id = '${C1.id}' and tpl = 'bol_reenviado' and ref_id = '${OA}'`) === '1', 'quien compró recibe el aviso con su orden');
      const x = await accion(pd, 'evtReenviar', [BIZ, 'B-999999999']);
      ok(x.j?.ok === false && x.j.mensaje?.es === 'Esa orden no existe.', 'una orden que no existe: «Esa orden no existe.»');
      const y = await accion(pd, 'evtReenviar', ['la-terraza-night', OA]);
      ok(y.j?.ok === false && /No tienes acceso/.test(y.j.mensaje?.es ?? ''), 'otro negocio: sin acceso');
      await cd.close();
    }

    // ── 8 · «Cancelar mis boletos» con extra ──
    console.log('8 · Cancelar mis boletos de una orden con extra');
    {
      await p1.goto(B + `/eventos/${E1.slug}?fecha=${E1.F}`);
      const op = sql(`select id from operations where number = '${OA}'`);
      const pv = await accion(p1, 'bolPrevioCancelar', [OA]);
      ok(pv.j?.abierto && pv.j.extras && pv.j.extras.monto === 3500, 'la hoja dice qué se devuelve, con el extra ($35.00)');
      const codes = sql(`select string_agg(code, ',' order by id) from tickets where operation_id = ${op} and status = 'valid'`).split(',');
      const r = await accion(p1, 'bolCancelar', [OA, codes, crypto.randomUUID()]);
      ok(r.j?.ok && r.j.monto === pv.j.total, `se devuelve lo que dijo la hoja (${r.j?.monto})`);
      const rf = sql(`select r.id from refunds r join payments p on p.id = r.payment_id where p.operation_id = ${op}`);
      ok(sql(`select count(*) from ticket_refund_lines where refund_id = ${rf} and line_id is not null`) === '1' && sql(`select amount_cents + fee_kept_cents from ticket_refund_lines where refund_id = ${rf} and line_id is not null`) === '3500', 'la devolución lleva su línea del extra (lo devuelto más su parte del cargo = $35.00)');
      ok(sql(`select status from refunds where id = ${rf}`) === 'done' && sql(`select count(*) from sim_refunds where id = (select stripe_refund_id from refunds where id = ${rf}) and amount_cents = ${r.j.monto}`) === '1', 'hecha por la pasarela, por ese monto');
      ok(sql(`select count(*) from tickets where operation_id = ${op} and status = 'refunded'`) === String(codes.length), 'los boletos quedan devueltos');
      // 9v · Salió: la respuesta y el aviso dicen «Te devolvimos», con lo que la pasarela devolvió.
      ok(r.j.devolucion === 'hecha', `la respuesta dice lo que hizo la pasarela: ${r.j.devolucion}`);
      const av = avisoDe(op, 'bol_cancelado', OA);
      ok(av.includes(`Te devolvimos ${din(r.j.monto)} a tu tarjeta`) && !/va en camino|Te devolvemos/.test(av), `el aviso «Cancelaste tus boletos» dice lo que pasó: «${av}»`);
    }

    // ── 9 · El organizador cancela: disputa abierta y una devolución que nunca llegó ──
    console.log('9 · Cancelar el evento con una orden en disputa y una devolución que no sale');
    {
      await p2.goto(B + `/eventos/${E1.slug}/boletos?fecha=${E1.F}`); await p3.goto(B + `/eventos/${E1.slug}/boletos?fecha=${E1.F}`);
      const compra = async (p, pm) => { const a = await accion(p, 'evtApartar', [{ fecha: E1.F, boletos: [{ id: E1.T, q: 1 }], mesa: null, extras: [], codigo: null }]); const r = await accion(p, 'evtPagar', [a.j.apartado, pm, []]); if (!r.j?.ok) throw new Error('no compró: ' + r.t.slice(0, 300)); return r.j.numero; };
      const OD = await compra(p3, PM3), OS = await compra(p2, PM2);
      const pago = (num) => sql(`select p.id || '|' || p.stripe_payment_intent from payments p join operations o on o.id = p.operation_id where o.number = '${num}'`).split('|');
      const [, piD] = pago(OD), [pidS, piS] = pago(OS);
      const DP = `dp_9v_${RUN}`;
      ok(await webhook({ id: 'evt_' + DP, type: 'charge.dispute.created', data: { object: { id: DP, payment_intent: piD, amount: 1500, reason: 'fraudulent', status: 'needs_response', evidence_details: { due_by: Math.floor(Date.now() / 1000) + 5 * 86400 } } } }) === 200, 'webhook firmado: disputa abierta sobre la orden de la tercera persona');
      // La pasarela no aceptará la devolución de la segunda (el simulador tiene ese cobro ya devuelto por fuera).
      sql(`update sim_intents set refunded_cents = captured_cents where id = '${piS}'`);
      const cd = await ctx(), pd = await cd.newPage();
      await entrarComo(pd, DUENO.tel); await pd.goto(B + `/panel/${BIZ}`);
      // 9v · «Devolver» del panel cuando Stripe no acepta: el panel y el aviso dicen «va en camino», nunca «Devuelto» / «te devolvimos».
      const OV = await compra(p2, PM2), opV = sql(`select id from operations where number = '${OV}'`), [, piV] = pago(OV);
      sql(`update sim_intents set refunded_cents = captured_cents where id = '${piV}'`);
      const codV = sql(`select string_agg(code, ',') from tickets where operation_id = ${opV}`).split(',');
      const dv = await accion(pd, 'evtDevolver', [BIZ, OV, codV, crypto.randomUUID()]);
      const rfV = sql(`select r.status || '|' || r.last_error from refunds r join payments p on p.id = r.payment_id where p.operation_id = ${opV}`);
      ok(dv.j?.ok && dv.j.devolucion === 'en_camino' && rfV === 'pending|amount_too_large', `«Devolver» con Stripe diciendo que no: la respuesta dice en camino (${dv.j?.devolucion}) y la devolución sigue pendiente (${rfV})`);
      { const av = avisoDe(opV, 'bol_devuelto', OV);
        ok(av.includes(`La devolución de ${din(dv.j.monto)} a tu tarjeta va en camino`) && !/Te devolvimos|te devolvió/.test(av), `el aviso «Te devolvieron tus boletos» dice lo que pasó (en camino): «${av}»`); }
      const r = await accion(pd, 'evtCancelar', [BIZ, E1.id, 'event', null, 'clima', 'Tormenta']);
      ok(r.j?.ok, 'el dueño cancela el evento');
      await cd.close();
      const opD = sql(`select id from operations where number = '${OD}'`), opS = sql(`select id from operations where number = '${OS}'`);
      ok(sql(`select string_agg(status || ':' || coalesce(void_reason, ''), ',') from tickets where operation_id = ${opD}`) === 'void:Evento cancelado · el cobro está en disputa con el banco', 'la orden en disputa: su boleto se anula con el motivo (el dinero va por el banco)');
      ok(sql(`select count(*) from refunds r join payments p on p.id = r.payment_id where p.operation_id = ${opD}`) === '0' && sql(`select count(*) from ticket_log where operation_id = ${opD} and kind = 'anulado'`) === '1', '… sin ninguna devolución y con su rastro «anulado»');
      const rf = sql(`select id from refunds where payment_id = ${pidS}`);
      ok(rf && sql(`select status || '|' || last_error || '|' || (gateway_ref is not null) from refunds where id = ${rf}`) === 'pending|amount_too_large|true', 'la de la segunda: Stripe dijo que no, sigue pendiente (anotada con su dato)');
      // 9v · El aviso del evento cancelado dice lo que pasa con el dinero de CADA quien pagó (antes: «Te devolvemos todo» a todos).
      const cx0 = sql(`select id from event_cancellations where event_id = ${E1.id}`);
      { const aD = avisoDe(opD, 'evt_cancelado', cx0), aS = avisoDe(opS, 'evt_cancelado', cx0);
        ok(aD.includes('Tu cobro está en disputa con tu banco: lo que vuelve lo decide esa disputa') && !/Te devolvemos|Te devolvimos/.test(aD), `la orden en disputa: el aviso no promete devolución, dice que lo decide la disputa: «${aD.slice(0, 200)}»`);
        ok(aS.includes('la devolución va en camino a tu tarjeta') && !/Te devolvimos|3–5 días/.test(aS), `la que Stripe no aceptó: «va en camino», nunca «te devolvimos … 3–5 días»: «${aS.slice(0, 200)}»`); }
      await p3.goto(B + `/eventos/orden/${OD}`);
      ok(await (async () => { for (let i = 0; i < 40; i++) { const t = (await p3.innerText('body')).replace(/\s+/g, ' '); if (t.includes('Tu cobro está en disputa con tu banco')) return !/Se te devuelve todo|Te devolvemos/.test(t); await new Promise((z) => setTimeout(z, 250)); } return false; })(), 'la orden en disputa: «Tu cobro está en disputa con tu banco…» (no «Se te devuelve todo»)');
      await p3.screenshot({ path: ENT.S + '/cap/d9v-orden-disputa-m.png', fullPage: true });
      const cx = sql(`select id from event_cancellations where event_id = ${E1.id}`), antes = Number(sql(`select refunded_cents from event_cancellations where id = ${cx}`)), monto = Number(sql(`select amount_cents from refunds where id = ${rf}`));
      // Un día después sin llegar a Stripe, y mientras tanto la persona abrió una disputa por ese cobro (el cobro cambió: no se vuelve a mandar).
      const DP2 = `dp_9v2_${RUN}`;
      await webhook({ id: 'evt_' + DP2, type: 'charge.dispute.created', data: { object: { id: DP2, payment_intent: piS, amount: 1500, reason: 'product_not_received', status: 'needs_response' } } });
      sql(`set session_replication_role = replica; update refunds set created_at = now() - interval '25 hours', sent_at = now() - interval '25 hours', last_sent_at = now() - interval '25 hours' where id = ${rf}`);
      await barrido();
      ok(sql(`select status || '|' || last_error from refunds where id = ${rf}`) === 'failed|nunca_llego', 'el barrido pregunta: nunca llegó y el cobro cambió → fallida (no se manda otra)');
      ok(Number(sql(`select refunded_cents from event_cancellations where id = ${cx}`)) === antes - monto, 'la cancelación deja de contarla como devuelta');
      ok(sql(`select count(*) from operation_events where operation_id = ${opS} and kind = 'refund_failed'`) === '1', 'la orden lo dice (refund_failed)');
      ok(sql(`select count(*) from money_alerts where kind = 'refund_failed' and subject_id = '${rf}'`) === '1' && sql(`select count(*) from sim_refunds where payment_intent = '${piS}'`) === '0', 'UNA alerta al equipo de dinero y ninguna devolución en la pasarela');
      ok(sql(`select count(*) from tickets where operation_id = ${opS} and status = 'refunded'`) === '1', 'el boleto sigue devuelto (no entra): lo decide el equipo con la persona');
      // 9v · La orden ya no dice «Se te devuelve todo» ni «Ya salió»: dice que no salió (y que está en disputa).
      await p2.goto(B + `/eventos/orden/${OS}`);
      { let t = ''; for (let i = 0; i < 40 && !t.includes('no salió'); i++) { t = (await p2.innerText('body')).replace(/\s+/g, ' '); if (!t.includes('no salió')) await new Promise((z) => setTimeout(z, 250)); }
        ok(t.includes(`La devolución de ${din(monto)} no salió: el equipo de To'Latino ya tiene el aviso para resolverlo contigo.`) && t.includes('Tu cobro está en disputa con tu banco') && !/Se te devuelve todo|Ya salió a tu tarjeta|Va en camino a tu tarjeta|te devolvemos/.test(t),
          `la orden con la devolución fallida: «no salió» (y la disputa), nunca «Se te devuelve todo» ni «Ya salió»: «${t.slice(t.indexOf('Este evento'), t.indexOf('Este evento') + 260)}» · prohibido hallado: ${(t.match(/.{0,60}(Se te devuelve todo|Ya salió a tu tarjeta|Va en camino a tu tarjeta|te devolvemos).{0,60}/) || ['ninguno'])[0]}`); }
      await p2.screenshot({ path: ENT.S + '/cap/d9v-orden-fallida-m.png', fullPage: true });
      await barrido();
      ok(sql(`select count(*) from money_alerts where kind = 'refund_failed' and subject_id = '${rf}'`) === '1' && sql(`select count(*) from operation_events where operation_id = ${opS} and kind = 'refund_failed'`) === '1', 'otro barrido no cambia nada');
    }
  } finally { await b.close(); }
  console.log(`OK · ${n} comprobaciones`);
})().catch((e) => { console.error(e); process.exit(1); });
