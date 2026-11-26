// 26 nov (LAUNCH «el dinero dice lo que pasó» (1)) · Soltar una retención que no es la de una operación con su regla (cobros › soltarSuelta) dice lo que
// pasó y, si Stripe no la suelta o ya la había cobrado, el equipo de dinero lo sabe. Antes ~50 sitios llamaban pasarela.liberar directo y tiraban lo que
// contestaba (.catch(() => undefined)) o miraban `ok` y reintentaban sin fin en silencio: la persona quedaba con el dinero retenido o cobrado y nadie lo
// sabía. La pasarela se hace fallar como en din9v5: un intento que no es del simulador (pi_… sin «sim») y la pasarela real sin Stripe contesta que no.
//   1. El rollback de una retención recién creada (nadie más sabe de ella), con el código real (patrocinio › soltarRetenido y verificacion › bancoPide;
//      cobros.ts real, la base de verdad): Stripe no la suelta → UNA alerta hold_stuck suelta:<pi> (ES/EN: qué retención, de quién, con qué negocio,
//      cuánto, «Nadie más la va a soltar»), idempotente; a la persona, lo de siempre (no se cobró nada: es verdad). Stripe ya la había cobrado → la alerta
//      lo dice y la persona NO recibe «No se cobró nada». La que sí se suelta: ninguna alerta.
//   2. Una retención guardada (el extra de un pedido del mercado al liquidar, mercado › liquidarMercado real): Stripe ya la había cobrado → el libro la
//      anota 'captured' con lo que Stripe capturó (nunca 'released'), UNA alerta, y el aviso a la persona dice lo que de verdad se cobró ($40, sin
//      «se liberan»). La que no se suelta la sigue soltando el barrido, ya no en silencio: sin alerta hasta el tope (SUELTA_INTENTOS, contado en la
//      operación), con alerta al tope; nunca 'released'; cuando Stripe la suelta, el libro la suelta y la alerta se cierra sola.
//   3. Lo mismo por el servidor de verdad (el barrido, POST /api/interno/barrido, con el build servido): un pedido del mercado terminado con su extra ya
//      cobrado en Stripe queda 'captured', con su alerta y el aviso real merc_cobrado «Se cobraron $40», nunca «se liberan».
//   Al final, las alertas que abrió la prueba se marcan resueltas como lo haría el equipo (notaAlerta).
// Precondiciones propias (corre dos veces seguidas): sus negocios, su dueña y sus clientes (teléfonos 555 libres), sus pedidos, sus cobros y el simulador.
const ENT = require('../lib/entorno.cjs');
const crypto = require('crypto');
const { sql } = require('../lib/negocio-nuevo.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const B = ENT.B;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l));
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
const alertas = (suj) => sql(`select count(*) from money_alerts where kind = 'hold_stuck' and subject_id = '${suj}'`);
const detalle = (suj, l = 'es') => sql(`select detail->>'${l}' from money_alerts where kind = 'hold_stuck' and subject_id = '${suj}'`);
const espera = async (f, ms = 15000) => { const t0 = Date.now(); for (;;) { const v = await f(); if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 500)); } };

(async () => {
  const persona = (nombre) => { const t = telPropio(); sql(`insert into users (phone, first_name, last_name) values ('+1${t}', '${nombre}', 'Nueve Z')`); return { tel: t, id: sql(`select id from users where phone = '+1${t}'`), nombre: `${nombre} Nueve Z` }; };
  const DUENA = persona('Dueña');
  const negocio = (id, nombre, cat) => {
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${id}', 'hzl', '${cat}', '${nombre}', 'active')`);
    sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${id}', '${DUENA.id}', 'owner', 'Dueña')`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${id}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
    sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${id}', 'acct_sim_${id}', 'enabled', true, true, true)`);
    return primero(sql(`insert into items (business_id, name, price_cents) values ('${id}', '{"es":"Artículo 9z ${RUN}","en":"Item 9z ${RUN}"}'::jsonb, 1000) returning id`));
  };

  // ── El código real, sin el servidor (como din9x): la base de verdad, la pasarela del sandbox (sin STRIPE_SECRET_KEY: un intento que no es del simulador
  // no se suelta) y cobros.ts real. PX: la misma pasarela, salvo los intentos que «Stripe ya soltó» (SUELTA_YA: el equipo los soltó en Stripe). ──
  const D = cargar('apps/web/lib/db.ts');
  const AV = [];
  const avisos = { avisar: async (uid, tpl, v) => { AV.push([uid, tpl, v]); return true; }, avisarMuchos: async () => undefined, avisarNegocio: async () => true };
  const alertasM = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: async () => undefined }, './consulta-pasarela': {}, './devolucion-consulta': {},
    './evt-liquidacion': {}, './revision-pasarela': {}, './cobro-fuera': {}, './suscripcion': {}, './renovar-retencion': {} });
  class ErrorStripe extends Error { constructor(tipo, codigo) { super(codigo ?? tipo); this.tipo = tipo; this.codigo = codigo; this.rechazo = null; } }
  const PS = cargar('apps/web/lib/pagos/pasarela.ts', { '../db': D, '../entorno': { ENTORNO: 'pruebas' }, './stripe': { ErrorStripe, stripe: async () => { throw new Error('sin Stripe'); }, stripeArchivo: async () => { throw new Error('sin Stripe'); } },
    '../tiendas/revision': { pagoBloqueado: async () => null } });
  const SUELTA_YA = new Set();
  const PX = { pasarela: Object.assign(Object.create(PS.pasarela), { liberar: async (pi) => (SUELTA_YA.has(pi) ? { ok: true } : PS.pasarela.liberar(pi)) }) };
  const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': PX, './vista-equipo': { soloLectura: () => false }, './dinero-alertas': alertasM });
  const PAT = cargar('apps/web/lib/patrocinio.ts', { './config': {}, './db': D, './cobros': cobros, './cobro-fuera': {}, './pagos/pasarela': PX, './categoria': {}, './punto': {}, './tarjeta': {} });
  const VER = cargar('apps/web/lib/pagos/verificacion.ts', { '../db': D, './pasarela': PX, '../cobros': cobros });
  const MER = cargar('apps/web/lib/mercado.ts', { './dias-especiales': {}, './cobros': cobros, './devolucion-cancelar': cargar('apps/web/lib/devolucion-cancelar.ts'), './db': D, './menu': {},
    './pagos/pasarela': PX, './pagos/verificacion': VER, './pedir': {}, './avisos': avisos, './dinero-alertas': alertasM });
  const TOPE = cobros.SUELTA_INTENTOS;

  // Las alertas hold_stuck suelta:<pi> que abrió esta prueba (sus intentos llevan «9z_<RUN>» / «9zatascada_<RUN>»): el equipo las marca resueltas.
  let EQ = null;
  const cerrarAlertas = async () => {
    EQ = EQ ?? persona('Equipo');
    const abiertas = () => sql(`select a.id from money_alerts a where a.kind = 'hold_stuck' and a.subject_id like 'suelta:pi\\_%' and a.subject_id like '%${RUN}%'
        and coalesce((select n.action from money_alert_notes n where n.alert_id = a.id order by n.at desc, n.id desc limit 1), '') not in ('resuelta', 'resuelta_sola', 'resuelta_a_mano')`).split('\n').filter((l) => /^\d+$/.test(l));
    const L0 = abiertas(), malas = [];
    for (const id of L0) { const r = await alertasM.notaAlerta({ id: EQ.id, cities: [] }, id, 'resuelta', 'Prueba din9z: revisado en Stripe.'); if (!r.ok) malas.push([id, r.msg]); }
    return { n: L0.length, malas, quedan: abiertas().length };
  };

  try {
    // ── 1 · El rollback de una retención recién creada ──
    console.log('1 · Rollback de una retención recién creada (patrocinio › soltarRetenido, verificacion › bancoPide): Stripe no la suelta o ya la cobró');
    const BP = `d9zp-${RUN}`; negocio(BP, `Patrocinio 9z ${RUN}`, 'NEG-FOOD');
    const UP = persona('Patrocinio');
    const ctx = (pi) => ({ que: { es: `Patrocinio del negocio (pat-negocio-${BP}-${pi.slice(-1)}; la compra no se guardó)`, en: `Business sponsorship (pat-negocio-${BP}-${pi.slice(-1)}; the purchase was not saved)` }, monto: 4500, persona: UP.id, negocio: BP, ciudad: 'hzl' });
    // a) Stripe no la suelta (un intento que no es del simulador).
    const piA = `pi_9zatascada_${RUN}_a`;
    const rA = await PAT.soltarRetenido(piA, new PAT.SinCaptura(piA), ctx(piA));
    const dA = detalle(`suelta:${piA}`), dAen = detalle(`suelta:${piA}`, 'en');
    ok(alertas(`suelta:${piA}`) === '1' && dA.includes(`no se pudo soltar la retención ${piA} de $45 de ${UP.nombre} con Patrocinio 9z ${RUN}`) && dA.includes('Nadie más la va a soltar'),
      `no se soltó: UNA alerta suelta:<pi> con qué retención, de quién, con qué negocio y cuánto (${dA})`);
    ok(dAen.includes(`the $45 hold ${piA} of ${UP.nombre} with Patrocinio 9z ${RUN} could not be released`) && dAen.includes('Nobody else will release it'), 'la alerta en inglés también');
    ok(rA && rA.ok === false && rA.msg.es === 'Tu banco no aceptó el cobro. No se cobró nada: prueba otra vez o con otra tarjeta.', `a la persona, lo de siempre (no se cobró nada: es verdad) (${rA?.msg?.es})`);
    await PAT.soltarRetenido(piA, new PAT.SinCaptura(piA), ctx(piA));
    ok(alertas(`suelta:${piA}`) === '1', 'idempotente: otra vez, la misma alerta (ninguna más)');
    // b) Stripe ya la había cobrado (el simulador: la retención ya capturada).
    const piB = `pi_sim_9z_${RUN}_b`;
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${piB}', 4500, 0, 'tolatino', 'succeeded', 4500, 0, 'pm_sim_visa_4242', 'manual')`);
    const rB = await PAT.soltarRetenido(piB, new PAT.SinCaptura(piB), ctx(piB));
    const dB = detalle(`suelta:${piB}`);
    ok(alertas(`suelta:${piB}`) === '1' && dB.includes('pero Stripe ya la había cobrado ($45)') && dB.includes('Mira en Stripe si ese cobro correspondía') && sql(`select status from sim_intents where id = '${piB}'`) === 'succeeded',
      `ya cobrada: UNA alerta que lo dice y el simulador sigue cobrado (${dB})`);
    ok(rB && rB.ok === false && !/No se cobró nada/.test(rB.msg.es) && !/Nothing was charged/.test(rB.msg.en) && rB.msg.es === "No se pudo terminar la compra: el equipo de To'Latino revisa el cobro en tu tarjeta.",
      `a la persona, nunca «No se cobró nada» de lo cobrado (${rB?.msg?.es})`);
    // c) La que sí se suelta: ninguna alerta.
    const piC = `pi_sim_9z_${RUN}_c`;
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${piC}', 4500, 0, 'tolatino', 'requires_capture', 0, 0, 'pm_sim_visa_4242', 'manual')`);
    const rC = await PAT.soltarRetenido(piC, new Error('patrocinio_cruza'), ctx(piC));
    ok(rC === null && alertas(`suelta:${piC}`) === '0' && sql(`select status from sim_intents where id = '${piC}'`) === 'canceled', 'se soltó: el simulador la canceló y ninguna alerta');
    // d) bancoPide (los 9 flujos de la app cuando el banco pide verificar sin verificación a nombre de quien paga): la misma regla.
    const piD = `pi_9zatascada_${RUN}_d`;
    const rD = await VER.bancoPide({ ok: true, pi: piD, estado: 'accion', marca: 'visa', ultimos4: '4242' }, { que: { es: `Cita C-9z${RUN} (se retuvo el depósito y no se guardó)`, en: `Appointment C-9z${RUN} (deposit held and not saved)` }, monto: 2000, persona: UP.id, negocio: BP, ciudad: 'hzl' });
    ok(rD.ok === false && rD.msg.es === 'Tu banco pide una verificación extra. Prueba con otra tarjeta.' && alertas(`suelta:${piD}`) === '1' && detalle(`suelta:${piD}`).includes(`Cita C-9z${RUN} (se retuvo el depósito y no se guardó): no se pudo soltar la retención ${piD} de $20`),
      `bancoPide: lo que no se suelta alerta con su contexto (${detalle(`suelta:${piD}`)})`);

    // ── 2 · Una retención guardada: el extra de un pedido del mercado al liquidar ──
    console.log('2 · Mercado › liquidarMercado: el extra que Stripe ya cobró y el que no se suelta (tope, alerta, se cierra sola)');
    const BM = `d9zm-${RUN}`, IM = negocio(BM, `Mercado 9z ${RUN}`, 'NEG-MERC');
    // Un pedido terminado (status done) con su línea, su cobro «full» retenido y su «extra» retenido, todo en UNA sentencia (el barrido del servidor, si
    // corre, no lo alcanza a medias). piFull: retenido en el simulador. piExtra: el que diga la prueba.
    const pedido = (U, linea, full, extra, piExtra, simExtra) => {
      const num = `M-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`, piFull = `pi_sim_9z_${RUN}_${num}_f`;
      const op = primero(sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, mode, scheduled_at, details, subtotal_cents, total_cents, pay_mode, client_key, is_test, pay_status)
          values ('${num}', 'market_order', 'hzl', '${BM}', '${U.id}', 'done', 'pickup', now(), '{"est_cents":${linea}}'::jsonb, ${linea}, ${linea}, 'app', gen_random_uuid(), true, 'held') returning id),
        l as (insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) select o.id, ${IM}, '{"es":"Artículo 9z","en":"Item 9z"}'::jsonb, 1, ${linea}, ${linea}, 0, '[]'::jsonb from o),
        s as (insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method)
              select '${piFull}', ${full}, 0, 'acct_sim_${BM}', 'requires_capture', 0, 0, 'pm_sim_visa_4242', 'manual'
              ${simExtra ? `union all select '${piExtra}', ${extra}, 0, 'acct_sim_${BM}', '${simExtra.st}', ${simExtra.cap}, 0, 'pm_sim_visa_4242', 'manual'` : ''}),
        p as (insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated)
              select o.id, '${U.id}'::uuid, '${BM}', 'hzl', 'full', 'card', '${piFull}', ${full}, ${full}, 0, 'held', 'visa', '4242', now(), true from o
              union all select o.id, '${U.id}'::uuid, '${BM}', 'hzl', 'extra', 'card', '${piExtra}', ${extra}, ${extra}, 0, 'held', 'visa', '4242', now(), ${simExtra ? 'true' : 'false'} from o)
        select id from o`));
      return { num, op, piFull, pidExtra: () => sql(`select id from payments where operation_id = ${op} and kind = 'extra'`) };
    };
    const pagoDe = (op, kind) => sql(`select status || '|' || amount_cents || '|' || coalesce(failure_code, '') from payments where operation_id = ${op} and kind = '${kind}'`);
    // a) El extra ($10) que Stripe ya había cobrado; lo pedido, $30 (la línea).
    const U1 = persona('Mercado cobrado'), piX1 = `pi_sim_9z_${RUN}_x1`;
    const M1 = pedido(U1, 3000, 3000, 1000, piX1, { st: 'succeeded', cap: 1000 });
    const t1 = await MER.liquidarMercado(M1.op);
    const d1 = detalle(`suelta:${piX1}`);
    ok(pagoDe(M1.op, 'full') === 'captured|3000|' && pagoDe(M1.op, 'extra') === 'captured|1000|' && sql(`select pay_status from operations where id = ${M1.op}`) === 'captured',
      `${M1.num}: el extra queda 'captured' con lo que Stripe capturó, nunca 'released' (${pagoDe(M1.op, 'extra')}; liquidó ${JSON.stringify(t1)})`);
    ok(alertas(`suelta:${piX1}`) === '1' && d1.includes(`Pedido del mercado ${M1.num}`) && d1.includes('pero Stripe ya la había cobrado ($10). La base ya la dice cobrada.') && d1.includes(U1.nombre) && d1.includes(`Mercado 9z ${RUN}`),
      `UNA alerta suelta:<pi> que lo dice, con la persona y el negocio (${d1})`);
    const av1 = AV.filter((x) => x[1] === 'merc_cobrado' && x[2]?.num === M1.num);
    ok(av1.length === 1 && av1[0][2].monto === '$40' && av1[0][2].libre === '', `el aviso a la persona dice lo que de verdad se cobró ($40), sin «se liberan» (${JSON.stringify(av1.map((x) => x[2]))})`);
    ok(sql(`select count(*) from operation_events where operation_id = ${M1.op} and kind = 'payment_released'`) === '0', 'ningún evento de «se liberó» de lo cobrado');
    // b) El extra ($5) que Stripe no suelta: el barrido (liquidarMercado otra vez) lo sigue intentando; sin alerta antes del tope, con alerta al tope.
    const U2 = persona('Mercado atascado'), piX2 = `pi_9zatascada_${RUN}_x2`;
    const M2 = pedido(U2, 2000, 2000, 500, piX2, null);
    const pid2 = M2.pidExtra(), vueltas = () => Number(sql(`select coalesce(details->'soltarIntentos'->>'${pid2}', '0') from operations where id = ${M2.op}`));
    let pasadas = 0;
    for (; pasadas < TOPE + 2 && alertas(`suelta:${piX2}`) === '0'; pasadas++) {
      await MER.liquidarMercado(M2.op);
      const v = vueltas(), a = alertas(`suelta:${piX2}`);
      ok((a === '1') === (v >= TOPE), `vuelta ${v} de ${TOPE}: ${a === '1' ? 'al tope, la alerta' : 'todavía sin alerta (el barrido lo vuelve a intentar)'}`);
    }
    const d2 = detalle(`suelta:${piX2}`);
    ok(alertas(`suelta:${piX2}`) === '1' && vueltas() >= TOPE && d2.includes(`no se pudo soltar la retención ${piX2} de $5 de ${U2.nombre}`) && d2.includes('El barrido la sigue soltando y esta alerta se cierra sola si lo logra'),
      `al tope (${TOPE}), UNA alerta que dice que el barrido la sigue soltando (${d2})`);
    ok(/^held\|500\|liberar:/.test(pagoDe(M2.op, 'extra')) && pagoDe(M2.op, 'full') === 'captured|2000|', `el extra sigue 'held' con su motivo (nunca 'released' sin soltarse): ${pagoDe(M2.op, 'extra')}`);
    // Stripe la suelta (el equipo, o Stripe vuelve): la próxima vuelta la suelta en el libro y la alerta se cierra sola.
    SUELTA_YA.add(piX2);
    await MER.liquidarMercado(M2.op);
    ok(/^released\|500\|/.test(pagoDe(M2.op, 'extra')) && sql(`select pay_status from operations where id = ${M2.op}`) === 'captured', `soltada: el libro la suelta (${pagoDe(M2.op, 'extra')})`);
    ok(sql(`select n.action from money_alert_notes n join money_alerts a on a.id = n.alert_id where a.kind = 'hold_stuck' and a.subject_id = 'suelta:${piX2}' order by n.id desc limit 1`) === 'resuelta_sola', 'y su alerta se cierra sola');

    // ── 3 · Lo mismo por el servidor de verdad (el barrido del build servido) ──
    console.log('3 · El barrido del servidor: el extra de un pedido terminado que Stripe ya cobró');
    const U3 = persona('Mercado servidor'), piX3 = `pi_sim_9z_${RUN}_x3`;
    const M3 = pedido(U3, 3000, 3000, 1000, piX3, { st: 'succeeded', cap: 1000 });
    const listo = await espera(async () => {
      if (pagoDe(M3.op, 'extra') === 'captured|1000|' && alertas(`suelta:${piX3}`) === '1') return true;
      await fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': ENT.TOK } }).then((r) => r.text()).catch(() => '');
      return pagoDe(M3.op, 'extra') === 'captured|1000|' && alertas(`suelta:${piX3}`) === '1';
    }, 150000);
    ok(listo && pagoDe(M3.op, 'full') === 'captured|3000|' && detalle(`suelta:${piX3}`).includes('pero Stripe ya la había cobrado ($10)'), `${M3.num}: el servidor lo dejó 'captured' con su alerta (${pagoDe(M3.op, 'extra')})`);
    const n3 = sql(`select n.body from notifications n where n.tpl = 'merc_cobrado' and n.ref_id = '${M3.num}'`);
    ok(n3.includes(`Se cobraron $40 de tu pedido ${M3.num}.`) && !/se liberan/.test(n3) && AV.every((x) => x[2]?.num !== M3.num), `el aviso real: «${n3}»`);

    const c = await cerrarAlertas();
    ok(c.n > 0 && c.malas.length === 0 && c.quedan === 0, `las ${c.n} alertas que abrió la prueba quedan resueltas por el equipo (${JSON.stringify(c.malas)})`);
  } finally {
    await cerrarAlertas().catch((e) => console.error('no se pudieron cerrar las alertas de la prueba:', e.message));
    await D.db().end();
  }
  console.log(`\nOK din9z (${n} ✓)`);
})().catch((e) => { console.error(e); process.exit(1); });
