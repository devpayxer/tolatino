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
//   4. (26 nov, LAUNCH (i)) Renovar una retención (renovar-retencion › cerrarNueva / cerrarSin, con rentas y estimados reales): el libro ya no dice
//      «soltada» antes de que Stripe la suelte. Renovada y la vieja no se suelta → la vieja sigue 'held' con su failure_code y su alerta (el barrido la
//      sigue soltando), la nueva retenida; después el barrido del SERVIDOR la suelta (reintentarViejas) y la alerta se cierra sola. Sin nueva (el banco dijo
//      que no) y la vieja no se suelta → 'held', alerta, y biz_renta lo dice (ES/EN), nunca «ya no hay depósito retenido». Sin nueva y la vieja ya cobrada
//      en Stripe → 'captured' con lo capturado y biz_renta lo dice con esa cifra. El estimado ya cobrado: hold_fallo_suelta y biz_hold_fallo_suelta (0226),
//      nunca «Pagas eso en el negocio» ni «cóbralo en el local».
//   5. (26 nov, LAUNCH (2)) Las pantallas de quien suelta con la retención ya COBRADA en el simulador (el servidor de verdad, en el navegador): «No me sirve»
//      de la noche (ES y EN), «No hay mesa» del panel (ES y EN) y «Cancelar» del apartado dicen lo del aviso («ya se habían cobrado $X»), nunca «se liberó».
//   6. (26 nov, revisión de efe56b9 a) Un aviso que quedó en la campana con su push «pendiente» y sin fila en la cola (encolar falló después de anotarlo):
//      el barrido del servidor lo encola (push_outbox) y sale (push_status «pruebas» en el sandbox); otra pasada no lo repite.
//   Al final, las alertas que abrió la prueba se marcan resueltas como lo haría el equipo (notaAlerta).
// Precondiciones propias (corre dos veces seguidas): sus negocios, su dueña y sus clientes (teléfonos 555 libres), sus pedidos, sus cobros y el simulador.
const ENT = require('../lib/entorno.cjs');
const crypto = require('crypto');
const { sql } = require('../lib/negocio-nuevo.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const { chromium } = require('playwright');
const { entrarComo } = require('../lib/negocio-nuevo.cjs');
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
  const AV = [], AVN = [];
  const avisos = { avisar: async (uid, tpl, v) => { AV.push([uid, tpl, v]); return true; }, avisarMuchos: async () => undefined, avisarNegocio: async (biz, tpl, v) => { AVN.push([biz, tpl, v]); return true; } };
  const alertasM = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: async () => undefined }, './consulta-pasarela': {}, './devolucion-consulta': {},
    './evt-liquidacion': {}, './revision-pasarela': {}, './cobro-fuera': {}, './suscripcion': {}, './renovar-retencion': {} });
  class ErrorStripe extends Error { constructor(tipo, codigo) { super(codigo ?? tipo); this.tipo = tipo; this.codigo = codigo; this.rechazo = null; } }
  const PS = cargar('apps/web/lib/pagos/pasarela.ts', { '../db': D, '../entorno': { ENTORNO: 'pruebas' }, './stripe': { ErrorStripe, stripe: async () => { throw new Error('sin Stripe'); }, stripeArchivo: async () => { throw new Error('sin Stripe'); } },
    '../tiendas/revision': { pagoBloqueado: async () => null } });
  const SUELTA_YA = new Set(), NO_SUELTA = new Set();
  // NO_SUELTA: los intentos del simulador que «Stripe no suelta» en esta prueba (red); el servidor de verdad sí los suelta después (§4).
  const PX = { pasarela: Object.assign(Object.create(PS.pasarela), { liberar: async (pi) => (SUELTA_YA.has(pi) ? { ok: true } : NO_SUELTA.has(pi) ? { ok: false, codigo: 'red' } : PS.pasarela.liberar(pi)) }) };
  const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': PX, './vista-equipo': { soloLectura: () => false }, './dinero-alertas': alertasM });
  const PAT = cargar('apps/web/lib/patrocinio.ts', { './config': {}, './db': D, './cobros': cobros, './cobro-fuera': {}, './pagos/pasarela': PX, './categoria': {}, './punto': {}, './tarjeta': {} });
  const VER = cargar('apps/web/lib/pagos/verificacion.ts', { '../db': D, './pasarela': PX, '../cobros': cobros });
  const MER = cargar('apps/web/lib/mercado.ts', { './dias-especiales': {}, './cobros': cobros, './devolucion-cancelar': cargar('apps/web/lib/devolucion-cancelar.ts'), './db': D, './menu': {},
    './pagos/pasarela': PX, './pagos/verificacion': VER, './pedir': {}, './avisos': avisos, './dinero-alertas': alertasM });
  const TOPE = cobros.SUELTA_INTENTOS;
  // §4 · La renovación real (renovar-retencion) con rentas y estimados reales, la misma pasarela del sandbox (PX) y las alertas reales.
  const DC = cargar('apps/web/lib/devolucion-cancelar.ts');
  const K = { CADA_MIN: 5 }, CFs = { SIN_RESPUESTA: new Set(['red', 'api_error', 'error', 'rate_limit', 'rate_limit_error', 'lock_timeout', 'idempotency_key_in_use', 'idempotency_error', 'processing']) };
  const RR = {}, RE = {}, ES = {};
  Object.assign(RE, cargar('apps/web/lib/rentas.ts', { './dias-especiales': { diasEspeciales: async () => [], rangosDia: () => [] }, './db': D, './cobros': cobros, './pagos/pasarela': PX, './cobro-fuera': CFs,
    './avisos': avisos, './renovar-retencion': RR, './consulta-pasarela': K, './dinero-alertas': alertasM }));
  Object.assign(ES, cargar('apps/web/lib/estimados.ts', { './db': D, './cobros': cobros, './pagos/pasarela': PX, './pagos/verificacion': VER, './vista-equipo': { soloLectura: () => false }, './avisos': avisos,
    './renovar-retencion': RR, './consulta-pasarela': K, './dinero-alertas': alertasM, './devolucion-cancelar': DC }));
  Object.assign(RR, cargar('apps/web/lib/renovar-retencion.ts', { './db': D, './cobros': cobros, './pagos/pasarela': PX, './cobro-fuera': CFs, './consulta-pasarela': K, './dinero-alertas': alertasM,
    './rentas': RE, './estimados': ES }));
  const barrido = () => fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': ENT.TOK } }).then((r) => r.text()).catch(() => '');

  // Las alertas hold_stuck suelta:<pi> que abrió esta prueba (sus intentos llevan «9z_<RUN>» / «9zatascada_<RUN>»): el equipo las marca resueltas.
  let EQ = null;
  const cerrarAlertas = async () => {
    EQ = EQ ?? persona('Equipo');
    const abiertas = () => sql(`select a.id from money_alerts a where a.kind = 'hold_stuck' and ((a.subject_id like 'suelta:pi\\_%' and a.subject_id like '%${RUN}%')
        or a.subject_id in (select 'cobrada:' || p.id from payments p where p.stripe_payment_intent like '%${RUN}%'))
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
      await barrido();
      return pagoDe(M3.op, 'extra') === 'captured|1000|' && alertas(`suelta:${piX3}`) === '1';
    }, 150000);
    ok(listo && pagoDe(M3.op, 'full') === 'captured|3000|' && detalle(`suelta:${piX3}`).includes('pero Stripe ya la había cobrado ($10)'), `${M3.num}: el servidor lo dejó 'captured' con su alerta (${pagoDe(M3.op, 'extra')})`);
    const n3 = sql(`select n.body from notifications n where n.tpl = 'merc_cobrado' and n.ref_id = '${M3.num}'`);
    ok(n3.includes(`Se cobraron $40 de tu pedido ${M3.num}.`) && !/se liberan/.test(n3) && AV.every((x) => x[2]?.num !== M3.num), `el aviso real: «${n3}»`);

    // ── 4 · Renovar una retención: el libro y el aviso al negocio dicen lo que pasó con la vieja ──
    console.log('4 · Renovar una retención (rentas y estimados reales): la vieja que Stripe no suelta o que ya había cobrado');
    const BR = `d9zr-${RUN}`; negocio(BR, `Rentas 9z ${RUN}`, 'NEG-FOOD');
    // Una renta fuera ($50 de depósito retenido hace 100 h) con la tarjeta pm; la vieja es pi (del simulador con sim, o una que la pasarela no suelta).
    const renta = (U, pm, pi, sim) => {
      const num = `T-9z${String(crypto.randomInt(1e7)).padStart(7, '0')}`;
      const it = primero(sql(`insert into items (business_id, module, name, price_cents, deposit_cents, stock_mode, stock_left, sell, status) values ('${BR}', 'renta', '{"es":"Taladro 9z","en":"Drill 9z"}'::jsonb, 2500, 5000, 'qty', 5, true, 'live') returning id`));
      const op = primero(sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key, is_test)
            values ('${num}', 'rental', 'hzl', '${BR}', '${U.id}', 'confirmed', '{}'::jsonb, 5000, 5000, 5000, 'app', gen_random_uuid(), true) returning id),
          r as (insert into rentals (operation_id, business_id, user_id, city_id, item_id, item_name, price_cents, deposit_cents, days, rent_cents, pick_on, due_on, expires_at, payment_method, status, out_at)
            select o.id, '${BR}', '${U.id}'::uuid, 'hzl', ${it}, '{"es":"Taladro 9z","en":"Drill 9z"}'::jsonb, 2500, 5000, 2, 5000, current_date, current_date + 2, now() + interval '2 days', '${pm}', 'out', now() from o),
          ${sim ? `s as (insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', 5000, 0, 'acct_sim_${BR}', '${sim.st}', ${sim.cap}, 0, '${pm}', 'manual')),` : ''}
          p as (insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method)
            select o.id, '${U.id}'::uuid, '${BR}', 'hzl', 'security', 1, 'card', '${pi}', 5000, 5000, 0, 'held', 'visa', '4242', now() - interval '100 hours', ${!!sim}, '${pm}' from o)
        select id from o`));
      return { num, op, pid: sql(`select id from payments where operation_id = ${op} and kind = 'security' and seq = 1`) };
    };
    const libro = (pid) => sql(`select status || '|' || amount_cents || '|' || coalesce(failure_code, '') from payments where id = ${pid}`);
    const renov = (pid) => sql(`select status from hold_renewals where payment_id = ${pid}`);
    // a) Renovada, y la vieja no se suelta (Stripe «no contesta» al soltarla): la vieja sigue 'held' con su motivo y su alerta; la nueva, retenida.
    const UR1 = persona('Renta renovada'), piR1 = `pi_sim_9z_${RUN}_r1`; NO_SUELTA.add(piR1);
    const R1 = renta(UR1, 'pm_sim_visa_4242', piR1, { st: 'requires_capture', cap: 0 });
    const q1 = await RR.renovarRetencion(await RE.renovacionDeposito(R1.pid));
    ok(q1 === 'hecha' && renov(R1.pid) === 'done' && sql(`select status || '|' || held_cents || '|' || (renewed_from = ${R1.pid}) from payments where operation_id = ${R1.op} and kind = 'security' and seq = 2`) === 'held|5000|true',
      `${R1.num}: renovada (la nueva retenida, renewed_from) (${q1})`);
    ok(libro(R1.pid) === 'held|5000|liberar:red', `la vieja NO se dice soltada: sigue 'held' con su motivo (${libro(R1.pid)}), nunca 'released' antes de que Stripe la suelte`);
    const dR1 = detalle(`suelta:${piR1}`);
    ok(alertas(`suelta:${piR1}`) === '1' && dR1.includes('la retención vieja, ya renovada') && dR1.includes('El barrido la sigue soltando y esta alerta se cierra sola si lo logra'), `UNA alerta: la sigue soltando el barrido (${dR1})`);
    ok(AVN.filter((x) => x[1] === 'biz_renta').length === 0, 'renovada: nada que decirle al negocio');
    // El barrido del servidor (reintentarViejas): la vieja ya «vieja» (más de HORAS_RENOVAR) y su renovación cerrada hace más de 2 minutos.
    sql(`update payments set held_at = now() - interval '170 hours' where id = ${R1.pid}`);
    sql(`update hold_renewals set done_at = now() - interval '5 minutes' where payment_id = ${R1.pid}`);
    const suelta1 = await espera(async () => { if (libro(R1.pid).startsWith('released|')) return true; await barrido(); return libro(R1.pid).startsWith('released|'); }, 150000);
    ok(suelta1 && sql(`select status from sim_intents where id = '${piR1}'`) === 'canceled', `el barrido del servidor la soltó en Stripe y el libro la dice soltada después (${libro(R1.pid)})`);
    ok(sql(`select n.action from money_alert_notes n join money_alerts a on a.id = n.alert_id where a.kind = 'hold_stuck' and a.subject_id = 'suelta:${piR1}' order by n.id desc limit 1`) === 'resuelta_sola', 'y su alerta se cierra sola');
    ok(sql(`select status from payments where operation_id = ${R1.op} and kind = 'security' and seq = 2`) === 'held', 'la nueva sigue retenida (el depósito de la renta)');
    // b) Sin nueva (el banco dijo que no: ···· 0002) y la vieja no se suelta: 'held', alerta y biz_renta lo dice, nunca «ya no hay depósito retenido».
    const UR2 = persona('Renta atascada'), piR2 = `pi_9zatascada_${RUN}_r2`;
    const R2 = renta(UR2, 'pm_sim_visa_0002', piR2, null);
    const n0 = AVN.length;
    const q2 = await RR.renovarRetencion(await RE.renovacionDeposito(R2.pid));
    ok(q2 === 'fallida' && renov(R2.pid) === 'failed' && /^held\|5000\|liberar:/.test(libro(R2.pid)), `${R2.num}: sin nueva; la vieja sigue 'held' con su motivo (${libro(R2.pid)})`);
    ok(alertas(`suelta:${piR2}`) === '1' && detalle(`suelta:${piR2}`).includes('la retención vieja que no se pudo renovar'), 'UNA alerta suelta:<pi>');
    const a2 = AVN.slice(n0).filter((x) => x[1] === 'biz_renta');
    const q2es = a2[0]?.[2]?.que?.es ?? '', q2en = a2[0]?.[2]?.que?.en ?? '';
    ok(a2.length === 1 && q2es === "el banco ya no deja retener el depósito de $50: ya no cuenta como depósito, pero la retención todavía no se soltó de su tarjeta; se sigue soltando sola y el equipo de To'Latino ya tiene el aviso"
      && !/ya no hay depósito retenido/.test(q2es), `biz_renta (ES): «${q2es}»`);
    ok(q2en === "the bank no longer allows holding the $50 deposit: it no longer counts as a deposit, but the hold has not come off their card yet; it keeps being released automatically and the To'Latino team already has the alert"
      && !/no deposit held anymore/.test(q2en), `biz_renta (EN): «${q2en}»`);
    // c) Sin nueva y la vieja YA COBRADA en Stripe ($30 de los $50): 'captured' con lo capturado; biz_renta lo dice con esa cifra.
    const UR3 = persona('Renta cobrada'), piR3 = `pi_sim_9z_${RUN}_r3`;
    const R3 = renta(UR3, 'pm_sim_visa_0002', piR3, { st: 'succeeded', cap: 3000 });
    const n1 = AVN.length;
    const q3 = await RR.renovarRetencion(await RE.renovacionDeposito(R3.pid));
    ok(q3 === 'fallida' && libro(R3.pid) === 'captured|3000|', `${R3.num}: la vieja ya cobrada queda 'captured' con lo que Stripe capturó, nunca 'released' (${libro(R3.pid)})`);
    ok(alertas(`suelta:${piR3}`) === '1' && detalle(`suelta:${piR3}`).includes('pero Stripe ya la había cobrado ($30). La base ya la dice cobrada.'), 'UNA alerta que lo dice');
    const a3 = AVN.slice(n1).filter((x) => x[1] === 'biz_renta');
    const q3es = a3[0]?.[2]?.que?.es ?? '', q3en = a3[0]?.[2]?.que?.en ?? '';
    ok(a3.length === 1 && q3es === "el banco ya no deja retener el depósito de $50: al soltar la retención, Stripe ya la había cobrado ($30) en su tarjeta; el equipo de To'Latino ya tiene el aviso y lo revisa con el cliente", `biz_renta (ES): «${q3es}»`);
    ok(q3en === "the bank no longer allows holding the $50 deposit: when releasing the hold, Stripe had already charged it ($30) to their card; the To'Latino team already has the alert and reviews it with the client", `biz_renta (EN): «${q3en}»`);
    // d) El estimado sin nueva (el banco dijo que no: ···· 0002) con lo retenido YA COBRADO ($20 de $40): hold_fallo_suelta y biz_hold_fallo_suelta, nunca «Pagas eso».
    const UE = persona('Estimado cobrado'), EN_ = 'C-' + sql(`select nextval('operations_appt_seq')`), piE = `pi_sim_9z_${RUN}_e1`;
    const EO = primero(sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, member_id, status, status_detail, scheduled_at, duration_min, details, subtotal_cents, total_cents, deposit_cents, pay_mode, confirmed_at, answered_at, client_key, is_test)
          select '${EN_}', 'appointment', 'hzl', '${BR}', '${UE.id}'::uuid, (select id from business_members where business_id = '${BR}' and kind = 'owner' limit 1), 'confirmed', 'work', now() - interval '4 days', 120, '{"rubro":"hogar"}'::jsonb, 8900, 8900, 0, 'local', now(), now(), gen_random_uuid(), true returning id),
        s as (insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${piE}', 4000, 0, 'acct_sim_${BR}', 'succeeded', 2000, 0, 'pm_sim_visa_0002', 'manual')),
        p as (insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method)
          select o.id, '${UE.id}'::uuid, '${BR}', 'hzl', 'estimate', 1, 'card', '${piE}', 4000, 4000, 0, 'held', 'visa', '4242', now() - interval '100 hours', true, 'pm_sim_visa_0002' from o)
      select id from o`));
    const pE = sql(`select id from payments where operation_id = ${EO} and kind = 'estimate'`), nA = AV.length, nN = AVN.length;
    const qE = await RR.renovarRetencion(await ES.renovacionRetencion(pE));
    ok(qE === 'fallida' && libro(pE) === 'captured|2000|', `${EN_}: sin nueva, la vieja ya cobrada queda 'captured' con $20 (${libro(pE)}; ${qE})`);
    const ce = AV.slice(nA).filter((x) => x[1] === 'hold_fallo_suelta'), ne = AVN.slice(nN).filter((x) => x[1] === 'biz_hold_fallo_suelta');
    ok(AV.slice(nA).every((x) => !/^hold_(fallo|no_renovada)$/.test(x[1])) && AVN.slice(nN).every((x) => x[1] !== 'biz_hold_fallo'), 'nunca «Pagas eso en el negocio» ni «cóbralo en el local» (hold_fallo, hold_no_renovada, biz_hold_fallo)');
    ok(ce.length === 1 && ce[0][2].monto === '$40' && ce[0][2].dinero.es === " La retención no se pudo soltar: ya se habían cobrado $20 en tu tarjeta. El equipo de To'Latino ya tiene el aviso para revisarlo contigo."
      && ce[0][2].dinero.en === " The hold could not be released: $20 had already been charged to your card. The To'Latino team already has the alert to review it with you.", `a la persona (ES/EN): «${ce[0]?.[2]?.dinero?.es}»`);
    ok(ne.length === 1 && /ya se habían cobrado \$20 en su tarjeta\. .* No lo cobres en el local hasta que To'Latino lo revise\.$/.test(ne[0][2].dinero.es) && /\$20 had already been charged to their card\. .* Do not collect it in person until To'Latino reviews it\.$/.test(ne[0][2].dinero.en),
      `al negocio (ES/EN): «${ne[0]?.[2]?.dinero?.es}»`);
    ok(sql(`select count(*) from notif_templates where key in ('hold_fallo_suelta', 'biz_hold_fallo_suelta') and body->>'es' like '%{dinero}' and body->>'en' like '%{dinero}'`) === '2', 'las dos plantillas (0226) existen, con {dinero} en ES y EN');

    // ── 5 · Las pantallas de quien suelta con la retención YA COBRADA en el simulador (el servidor de verdad, en el navegador) ──
    console.log('5 · Pantallas de quien suelta con la retención ya cobrada en Stripe: «No me sirve» (noche, ES/EN), «No hay mesa» (panel, ES/EN), «Cancelar» (apartado)');
    const BN = `d9zn-${RUN}`, SN = negocio(BN, `Noche 9z ${RUN}`, 'NEG-NOCHE');
    const mesa = (nombre, st) => {
      const U = persona(nombre), num = `N-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`;
      const det = JSON.stringify({ k: 'mesa', item: Number(SN), svc: { es: `Mesa 9z ${RUN}`, en: `Table 9z ${RUN}` }, arrive: 1320, occ: null, door_cents: null, list_until: null, cover_cents: 0, after: null, min_cents: 12000, hr: false, edad: 21, hold: 30, sms: true, cut: 1290, inc: [] });
      const pi = `pi_sim_9z_${RUN}_${num}`;
      // La mesa, su depósito de $40 'held' en el libro y en Stripe YA COBRADO (la captura salió y la base no lo supo), en UNA sentencia.
      const op = primero(sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, night_date, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key, is_test, confirmed_at, respond_by, pay_status)
            values ('${num}', 'night', 'hzl', '${BN}', '${U.id}', '${st}', ((now() at time zone 'America/New_York')::date + 3 + time '22:00') at time zone 'America/New_York', 60, '${det}'::jsonb, 4,
                    (now() at time zone 'America/New_York')::date + 3, 0, 0, 4000, 'app', gen_random_uuid(), true, null, now() + interval '25 minutes', 'held') returning id),
          s as (insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', 4000, 0, 'acct_sim_${BN}', 'succeeded', 4000, 0, 'pm_sim_visa_4242', 'manual')),
          p as (insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, refunded_cents, fee_cents, status, card_brand, card_last4, held_at, simulated)
            select o.id, '${U.id}'::uuid, '${BN}', 'hzl', 'deposit', 'card', '${pi}', 4000, 4000, 0, 0, 'held', 'visa', '4242', now(), true from o)
        select id from o`));
      if (st === 'change_proposed') sql(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by) values (${op}, 'time', '{"m":1380}'::jsonb, '${DUENA.id}', 'business', now() + interval '25 minutes')`);
      return { ...U, num, op, pi };
    };
    const pagoN = (num) => sql(`select p.status || '|' || p.amount_cents from payments p join operations o on o.id = p.operation_id where o.number = '${num}' order by p.id desc limit 1`);
    const texto = async (pg) => (await pg.locator('body').innerText()).replace(/\s+/g, ' ');
    const b = await chromium.launch();
    try {
      const ctx = async (en, movil) => { const c = await b.newContext(movil ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } : { viewport: { width: 1360, height: 900 } }); if (en) await c.addCookies([{ name: 'tl_lang', value: 'en', url: B }]); return c; };
      // a) «No me sirve» de la noche, ES y EN.
      for (const [en, boton, nota] of [[false, 'No me sirve', "Listo. La retención no se pudo soltar: ya se habían cobrado $40 en tu tarjeta. El equipo de To'Latino ya tiene el aviso para revisarlo contigo."],
        [true, 'Doesn’t work', "Done. The hold could not be released: $40 had already been charged to your card. The To'Latino team already has the alert to review it with you."]]) {
        const M = mesa(en ? 'No me sirve EN' : 'No me sirve', 'change_proposed');
        const pg = await (await ctx(en, true)).newPage();
        await entrarComo(pg, M.tel); await pg.goto(B + `/noche/${M.num}`);
        await pg.getByRole('button', { name: boton }).first().click();
        await pg.getByText(nota).first().waitFor({ timeout: 20000 });
        const t = await texto(pg);
        ok(!/se liberó tu depósito|your deposit was released|todavía no se soltó|has not come off/i.test(t) && pagoN(M.num) === 'captured|4000', `${M.num} «${boton}» (${en ? 'EN' : 'ES'}): «${nota}»; el libro la dice cobrada (${pagoN(M.num)})`);
        await pg.screenshot({ path: `${ENT.S}/cap/d9z-noche-nomesirve-cobrada-${en ? 'en' : 'es'}-m.png` });
        await pg.context().close();
      }
      // b) «No hay mesa» del panel, ES y EN.
      for (const [en, boton, nota] of [[false, 'No hay mesa', "Listo: el cliente sabe. La retención no se pudo soltar: ya se habían cobrado $40 en su tarjeta. El equipo de To'Latino ya tiene el aviso y lo revisa con el cliente."],
        [true, 'No table', "Done: the client knows. The hold could not be released: $40 had already been charged to their card. The To'Latino team already has the alert and reviews it with the client."]]) {
        const M = mesa(en ? 'No hay mesa EN' : 'No hay mesa', 'pending');
        const pg = await (await ctx(en, false)).newPage();
        await entrarComo(pg, DUENA.tel); await pg.goto(B + `/panel/${BN}/hoy?det=noche:${M.num}`);
        const det = pg.locator('aside[data-screen-label="Panel v2 · detalle"]');
        await det.getByText(boton, { exact: true }).first().click();
        await pg.getByText(nota).first().waitFor({ timeout: 20000 });
        const t = await texto(pg);
        ok(!/se liberó su depósito|the deposit was released|no se soltó todavía|has not been released yet/i.test(t) && pagoN(M.num) === 'captured|4000', `panel «${boton}» (${en ? 'EN' : 'ES'}): «${nota}» (${pagoN(M.num)})`);
        await pg.screenshot({ path: `${ENT.S}/cap/d9z-panel-nohaymesa-cobrada-${en ? 'en' : 'es'}-d.png` });
        await pg.context().close();
      }
      // c) «Cancelar» del apartado con envío (ES).
      const BT = `d9zt-${RUN}`; negocio(BT, `Tienda 9z ${RUN}`, 'NEG-TIENDA');
      const UA = persona('Apartado cobrado'), AN = 'A-' + sql(`select nextval('hold_seq')`), piA = `pi_sim_9z_${RUN}_apt`;
      sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, scheduled_at, ready_at, respond_by, details, subtotal_cents, delivery_cents, total_cents, pay_mode, client_key, is_test, pay_status)
            values ('${AN}', 'hold', 'hzl', '${BT}', '${UA.id}', 'pending', 'sent', 'delivery', now(), now() + interval '6 days', now() + interval '4 hours',
                    '{"sms":true,"como":"envio","ship":true,"to":{"label":"casa","street":"420 N Wyoming St"},"ship_days":"3-5","hold_hours":48}'::jsonb, 2500, 500, 3000, 'app', gen_random_uuid(), true, 'held') returning id),
          s as (insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${piA}', 3000, 0, 'acct_sim_${BT}', 'succeeded', 3000, 0, 'pm_sim_visa_4242', 'manual'))
        insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, refunded_cents, fee_cents, status, card_brand, card_last4, held_at, simulated)
          select o.id, '${UA.id}'::uuid, '${BT}', 'hzl', 'full', 'card', '${piA}', 3000, 3000, 0, 0, 'held', 'visa', '4242', now(), true from o`);
      const pa = await (await ctx(false, true)).newPage();
      await entrarComo(pa, UA.tel); await pa.goto(B + `/apartado/${AN}`);
      await pa.getByRole('button', { name: 'Cancelar', exact: true }).first().click();
      await pa.getByRole('button', { name: 'Sí, cancelar' }).first().click();
      const notaA = "Listo. La retención no se pudo soltar: ya se habían cobrado $30 en tu tarjeta. El equipo de To'Latino ya tiene el aviso para revisarlo contigo.";
      await pa.getByText(notaA).first().waitFor({ timeout: 20000 });
      ok(!/todavía no se soltó de tu tarjeta: la seguimos/.test(await texto(pa)) && pagoN(AN) === 'captured|3000', `${AN} «Cancelar»: «${notaA}» (${pagoN(AN)})`);
      await pa.screenshot({ path: `${ENT.S}/cap/d9z-apartado-cobrada-m.png` });
      await pa.context().close();
    } finally { await b.close(); }

    // ── 6 · El push que no llegó a la cola: lo encola el barrido ──
    console.log('6 · Un aviso con su push «pendiente» y sin fila en la cola: el barrido del servidor lo encola y sale, una vez');
    const UP6 = persona('Push sin cola');
    sql(`insert into push_tokens (user_id, app, platform, provider, token_enc, token_hash) values ('${UP6.id}', 'cliente', 'ios', 'sim', decode(repeat('00', 40), 'hex'), md5('${RUN}p6') || md5('${RUN}p6x'))`);
    // La fila del aviso como la deja avisar() cuando encolar falla justo después (push «pendiente», sin nada en push_outbox), anotada hace 5 minutos.
    const nid = primero(sql(`insert into notifications (user_id, city_id, tpl, title, body, sms_status, push_status, created_at) values ('${UP6.id}', null, 'pay_released', 'Retención liberada', 'Prueba 9z ${RUN}: push sin cola.', 'no', 'pendiente', now() - interval '5 minutes') returning id`));
    const cola = () => sql(`select count(*) || '|' || coalesce(string_agg(status, ',' order by id), '') from push_outbox where notification_id = ${nid}`);
    ok(cola() === '0|', 'antes: el aviso está en la campana y su push «pendiente», sin ninguna fila en la cola (así quedaba para siempre)');
    const salio = await espera(async () => { const st = sql(`select push_status from notifications where id = ${nid}`); if (st !== 'pendiente') return st; await barrido(); return sql(`select push_status from notifications where id = ${nid}`) !== 'pendiente' ? 'ok' : null; }, 150000);
    const st6 = sql(`select push_status from notifications where id = ${nid}`);
    ok(salio && st6 === 'pruebas' && cola() === '1|hecho', `el barrido lo encoló y salió (push ${st6}; cola ${cola()})`);
    await barrido();
    ok(cola() === '1|hecho' && sql(`select count(*) from push_deliveries where notification_id = ${nid}`) === '1', 'otra pasada del barrido no lo repite (una fila en la cola, una entrega)');

    const c = await cerrarAlertas();
    ok(c.n > 0 && c.malas.length === 0 && c.quedan === 0, `las ${c.n} alertas que abrió la prueba quedan resueltas por el equipo (${JSON.stringify(c.malas)})`);
  } finally {
    await cerrarAlertas().catch((e) => console.error('no se pudieron cerrar las alertas de la prueba:', e.message));
    await D.db().end();
  }
  console.log(`\nOK din9z (${n} ✓)`);
})().catch((e) => { console.error(e); process.exit(1); });
