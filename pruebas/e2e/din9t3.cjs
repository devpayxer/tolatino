// 9t3 (21 nov) · «Dinero por clase, 21 nov · lo que quedó» (LAUNCH, puntos a, b, c, d, e y f) contra la base de pruebas y con una pasarela de
// mentira (sin servidor), con los archivos REALES de apps/web (cobros, evt-liquidacion, suscripcion, dinero-alertas, ayuda-cita y el webhook de
// Stripe), transpilados con pruebas/lib/ts-servidor.cjs. La misma armazón que din9t y din9t2.
//   1. Transferencias al organizador y sus reversiones: pasadas 23 h no se pide otra vez con la misma llave; una alerta; dentro de 23 h el barrido
//      la termina con su llave, una vez.
//   2. Cobro de Pro: la intención antes de la pasarela; sin respuesta (o el proceso muere) el barrido lo termina con la misma llave; pasadas 23 h,
//      la alerta y ningún cobro más; nunca dos cobros del mismo período; un «no» del banco sí cuenta como intento.
//   3. «Resolver a mano»: también lo que lleva 23 h sin un solo intento; nunca antes (la base y la pantalla dicen lo mismo).
//   4. Una devolución de boletos que Stripe da por fallida: el libro coherente (la cancelación del evento resta, la comisión cedida deja de contar),
//      los boletos no se reponen solos y la alerta dice qué boletos y de quién; una vez.
//   5. Ayuda de la cita con un «no» de Stripe en una parte: no se reabre si otra parte salió; la persona ve lo que de verdad salió.
//   6. El webhook: cada evento que escucha está en su lista escrita.
// Uso: DATABASE_URL=… node pruebas/e2e/din9t3.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar, RAIZ } = require('../lib/ts-servidor.cjs');
const crypto = require('crypto'), fs = require('fs'), path = require('path');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Los módulos reales, con lo de afuera de mentira ──
const D = cargar('apps/web/lib/db.ts');
const avisados = [];
const avisos = { avisar: async () => undefined, avisarMuchos: async () => undefined, avisarNegocio: async (b, t) => { avisados.push([b, t]); } };
const auditarStaff = async (c, a) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, after) values ('staff', $1, $2, $3, $4, $5)`, [a.actor, a.action, a.targetKind, a.targetId ?? null, JSON.stringify(a.after ?? null)]);
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: auditarStaff } });
// La pasarela de mentira: una vez por llave (como Stripe con Idempotency-Key) y la cuenta de lo que salió de verdad. El plan es solo para las llaves
// de ESTA prueba (para): los barridos también terminan lo de otras corridas y no deben gastarlo.
const P = {
  modo: () => 'simulador', salio: new Map(), llamadas: 0, plan: [], para: null, saldo: new Map(), trans: new Map(), revs: new Map(), cargos: new Map(),
  paso(idem) { return this.plan.length && (!this.para || idem.startsWith(this.para)) ? this.plan.shift() : 'ok'; },
  async devolver(pi, n, idem) {
    this.llamadas++;
    const paso = this.paso(idem);
    if (paso === 'no') return { ok: false, codigo: 'charge_disputed' };
    if (paso === 'red') return { ok: false, codigo: 'red' };
    const ya = this.salio.get(idem);
    if (ya) return ya.n === n ? { ok: true, id: ya.id } : { ok: false, codigo: 'idempotency_error' };
    const libre = (this.saldo.get(pi) ?? 0) - [...this.salio.values()].filter((x) => x.pi === pi).reduce((s, x) => s + x.n, 0);
    if (n > libre) return { ok: false, codigo: 'amount_too_large' };
    const r = { id: `re_fake_${crypto.randomBytes(6).toString('hex')}`, n, pi };
    this.salio.set(idem, r);
    return { ok: true, id: r.id };
  },
  async transferir(x) {
    this.llamadas++;
    const paso = this.paso(x.idem);
    if (paso === 'red') return { ok: false, codigo: 'api_error' };
    const ya = this.trans.get(x.idem);
    if (ya) return ya.n === x.centavos ? { ok: true, id: ya.id } : { ok: false, codigo: 'idempotency_error' };
    const t = { id: `tr_fake_${crypto.randomBytes(6).toString('hex')}`, n: x.centavos };
    this.trans.set(x.idem, t);
    return { ok: true, id: t.id };
  },
  async revertirTransferencia(tr, n, idem) {
    this.llamadas++;
    const paso = this.paso(idem);
    if (paso === 'red') return { ok: false, codigo: 'api_error' };
    if (!this.revs.has(idem)) this.revs.set(idem, { id: `trr_fake_${crypto.randomBytes(6).toString('hex')}`, n });
    return { ok: true, id: this.revs.get(idem).id };
  },
  async cobrarDirecto(x) {
    this.llamadas++;
    const paso = this.paso(x.idem);
    if (paso === 'red') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    if (paso === 'no') return { ok: false, codigo: 'card_declined', mensaje: { es: 'Tu banco la rechazó.', en: 'Declined.' } };
    if (!this.cargos.has(x.idem)) this.cargos.set(x.idem, { id: `pi_fake_pro_${crypto.randomBytes(6).toString('hex')}`, n: x.centavos });
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    return { ok: true, id: this.cargos.get(x.idem).id };
  },
  cliente: async () => null, intento: async () => null, liberar: async () => ({ ok: true }),
  // 9t5 · La consulta a la pasarela (lo de más de 23 h): aquí no contesta; lo que hace con cada respuesta lo prueba din9t5.
  buscarCobro: async () => ({ ok: false }), buscarTransferencia: async () => ({ ok: false }),
  vecesSalio(idem) { return [...this.salio.keys()].filter((k) => k === idem).length; },
  cobrosDe(biz) { return [...this.cargos.keys()].filter((k) => k.startsWith(`sub-${biz}-`)).length; },
};
const SE = {};
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': SE, './soporte': { avisarCaso: async () => undefined } });
const evtComun = { bi: (x) => x?.es ?? '', diaCorto: () => '', dinero: (c) => `$${(c / 100).toFixed(2)}`, hora: () => '' };
const K = cargar('apps/web/lib/consulta-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas });
const LQ = cargar('apps/web/lib/evt-liquidacion.ts', { './config': { cfgSql: () => '7', valor: async () => 2 }, './db': D, './evt-comun': evtComun, './pagos/pasarela': { pasarela: P },
  './cobros': cobros, './dinero-alertas': alertas, './avisos': avisos, './consulta-pasarela': K });
const SU = cargar('apps/web/lib/suscripcion.ts', { './db': D, './pagos/pasarela': { pasarela: P, registrarAccion: async () => undefined }, './plan': { PRECIO_PRO: 30 }, './avisos': avisos,
  './correo/recibos': { reciboPro: async () => undefined }, './dinero-alertas': alertas, './consulta-pasarela': K });
const AY = cargar('apps/web/lib/ayuda-cita.ts', { './config': { cfgSql: () => '24', valor: async () => 24 }, './plazo-txt': { horasTxt: () => '' }, './colas': { COLA_AYUDA_SQL: "'sop'" }, './db': D, './cobros': cobros,
  './ayuda': { escalarVencidas: async () => undefined }, './ayuda-estafa': { esEstafa: () => false, pausarPorAyuda: async () => undefined }, './avisos': avisos });

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
// 21 nov · Teléfonos de prueba SIEMPRE 570-555 (el repo es público) y con sus 10 dígitos. Antes salían de la hora: números que pueden ser de
// alguien y, donde pasaban por Number(), uno de cada diez con un dígito de menos (users_phone_check; din9t4 roja en el CI 44884103116).
const { esFijo } = require('../lib/telefonos-fijos.cjs');
const telNuevo = async () => { for (let i = 0; i < 400; i++) { const t = '570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); if (!esFijo(t) && !(await q1(`select 1 as x from users where phone = $1`, ['+1' + t]))) return '+1' + t; } throw new Error('no queda un teléfono 570-555 libre'); };
const n1 = async (s, v = []) => Number((await q1(s, v)).n);
const RUN = crypto.randomBytes(4).toString('hex');
// Lo que la app nunca escribe así (filas «de otro día»): con los triggers apagados en ESTA conexión y vueltos a encender antes de soltarla.
async function crudo(fn) {
  const k = await db.connect();
  try { await k.query('set session_replication_role = replica'); return await fn(k); } finally { await k.query('set session_replication_role = default').catch(() => undefined); k.release(); }
}
const alertasDe = (kind, sujeto) => n1(`select count(*)::int as n from money_alerts where kind = $1 and subject_id = $2`, [kind, sujeto]);

async function datos(cat = 'NEG-FOOD') {
  const tel = await telNuevo();
  const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Dinero') returning id::text`, [tel])).id;
  const b = (await q1(`insert into businesses (id, city_id, category_id, name) values ($1, 'hzl', $2, 'Prueba 9t3') returning id`, [`p9v-${crypto.randomBytes(4).toString('hex')}`, cat])).id;
  await dormir(2);
  return { u, b };
}
let NUM = Number(String(Date.now()).slice(-6)) * 10 + 3;
async function cobro(x, monto = 5000, o = {}) {
  const num = o.num ?? String(++NUM);
  const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, total_cents, subtotal_cents, details) values ($1, $5, 'hzl', $2, $3, 'app', gen_random_uuid(), 'confirmed', $4, $4, $6::jsonb) returning id::text`,
    [num, x.b, x.u, monto, o.kind ?? 'order', JSON.stringify(o.details ?? {})])).id;
  const pi = `pi_fake_${num.replace(/\W/g, '')}_${RUN}`;
  const p = (await q1(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, captured_at, transfer_group)
                         values ($1::bigint, $2, $3, 'hzl', $5, 'card', $4, $6, $7, 'captured', now(), $8) returning id::text`, [op, x.u, x.b, pi, o.pkind ?? 'full', monto, o.fee ?? 500, o.grupo ?? null])).id;
  P.saldo.set(pi, monto);
  return { op, p, pi, num };
}
const pago = (id) => q1(`select refunded_cents::int as dev, status from payments where id = $1::bigint`, [id]);
const atrasar = (id, min) => db.query(`update refunds set created_at = created_at - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]);
// Un evento con una fecha que ya terminó (hace 10 días), de un negocio.
let EV = 0;
async function evento(biz) {
  return crudo(async (k) => {
    const e = (await k.query(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, approved_at)
                               values ($1, 'hzl', $2, 'noche', '{"es":"Prueba 9t3","en":"Test 9t3"}'::jsonb, current_date - 10, 1200, 1320, 'tickets', 'done', now()) returning id::text`, [`p9v-${RUN}-${++EV}`, biz])).rows[0].id;
    const f = (await k.query(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date) values ($1::bigint, 'hzl', now() - interval '10 days', now() - interval '10 days' + interval '2 hours', now() - interval '10 days', current_date - 10) returning id::text`, [e])).rows[0].id;
    return { e, f };
  });
}
async function liquidacion(biz, net, o = {}) {
  const { e, f } = await evento(biz);
  const id = await crudo(async (k) => (await k.query(
    `insert into event_settlements (event_date_id, event_id, business_id, city_id, pay_on, status, idem_key, gross_cents, base_cents, net_cents, destination, paying_at, transfer_id, paid_at)
     values ($1::bigint, $2::bigint, $3, 'hzl', current_date - 3, $4, 'evt-liq-' || $1, $5, $5, $5, 'acct_fake_9t3', now() - make_interval(mins => $6::int), $7, $8) returning id::text`,
    [f, e, biz, o.st ?? 'paying', net, o.min ?? 5, o.tr ?? null, o.st === 'paid' ? new Date().toISOString() : null])).rows[0].id);
  return { id, e, f, idem: `evt-liq-${f}` };
}

(async () => {
  const X = await datos();
  const staffU = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Dinero') returning id::text`, [await telNuevo()])).id;
  await db.query(`insert into staff_members (user_id, role, status) values ($1, 'admin', 'active') on conflict (user_id) do update set role = 'admin', status = 'active'`, [staffU]);
  const S = { id: staffU, role: 'admin', cities: [] };
  const filaAlerta = async (kind, sujeto) => (await alertas.alertasDinero(S, false, null, 200)).filas.find((a) => a.kind === kind && a.sujeto === sujeto);
  const idAlerta = async (kind, sujeto) => (await q1(`select id::text from money_alerts where kind = $1 and subject_id = $2`, [kind, sujeto]))?.id;

  console.log('1 · Transferencias al organizador y reversiones: 23 h con la misma llave, no más');
  {
    const L1 = await liquidacion(X.b, 3000, { min: 24 * 60 });
    const antes = P.llamadas;
    await LQ.repararLiquidaciones(); await LQ.repararLiquidaciones();
    const r = await LQ.pagarUna(L1.id);
    const s = await q1(`select status, transfer_id from event_settlements where id = $1::bigint`, [L1.id]);
    ok(!r && !P.trans.has(L1.idem) && s.status === 'paying' && !s.transfer_id, `una transferencia en camino desde hace 24 h no vuelve a Stripe (ni el barrido ni otra llamada): sigue en camino (${s.status})`);
    ok(await alertasDe('transfer_stuck', L1.id) === 1, 'el equipo de dinero recibe UNA alerta transfer_stuck');
    const f = await filaAlerta('transfer_stuck', L1.id);
    ok(f && f.aMano === false && /sin respuesta de Stripe en 23 h/.test(f.detalle.es), 'la alerta es informativa (sin «Resolver a mano») y dice que ya no se pide otra vez');
    void antes;

    const L2 = await liquidacion(X.b, 2000, { min: 5 });
    P.para = L2.idem; P.plan = ['red'];
    await LQ.repararLiquidaciones();
    let s2 = await q1(`select status, attempts from event_settlements where id = $1::bigint`, [L2.id]);
    ok(s2.status === 'paying' && s2.attempts === 1 && !P.trans.has(L2.idem), 'dentro de las 23 h: Stripe no contesta, sigue en camino (un intento)');
    await LQ.repararLiquidaciones(); await LQ.repararLiquidaciones();
    s2 = await q1(`select status, transfer_id from event_settlements where id = $1::bigint`, [L2.id]);
    ok(s2.status === 'paid' && s2.transfer_id === P.trans.get(L2.idem)?.id && await n1(`select count(*)::int as n from audit_entries where action = 'evento.liquidacion.pagar' and target_id = $1`, [L2.id]) === 1,
      'el barrido la termina con la MISMA llave: una transferencia, pagada una vez, auditada una vez');

    // Reversiones: una de hace 24 h sin un intento (el proceso murió antes de mandarla) y la de una liquidación pagada.
    const L3 = await liquidacion(X.b, 4000, { st: 'paid', tr: `tr_fake_9t3_${RUN}` });
    const rv = await crudo(async (k) => (await k.query(`insert into event_settlement_reversals (settlement_id, business_id, city_id, amount_cents, idem_key, created_at) values ($1::bigint, $2, 'hzl', 1500, $3, now() - interval '24 hours') returning id::text`,
      [L3.id, X.b, `evt-rev-${L3.id}-1`])).rows[0].id);
    await LQ.repararLiquidaciones(); await LQ.repararLiquidaciones();
    ok(!P.revs.has(`evt-rev-${L3.id}-1`) && (await q1(`select status from event_settlement_reversals where id = $1::bigint`, [rv])).status === 'pending', 'una reversión de hace 24 h no vuelve a Stripe');
    ok(await alertasDe('transfer_reversal_stuck', rv) === 1, 'el equipo de dinero recibe UNA alerta de esa reversión');
    const fr = await filaAlerta('transfer_reversal_stuck', rv);
    ok(fr && fr.aMano === true, 'sin un solo intento pero pasadas 23 h, la alerta SÍ ofrece «Resolver a mano» (nadie la va a mandar ya)');
    const nm = await alertas.notaAlerta(S, await idAlerta('transfer_reversal_stuck', rv), 'resuelta_a_mano', 'Se le cobró al organizador por transferencia');
    const rvm = await q1(`select manual_at is not null as mano, status from event_settlement_reversals where id = $1::bigint`, [rv]);
    ok(nm.ok && rvm.mano && rvm.status === 'pending', `y la base lo deja: resuelta a mano, con su nota (${nm.ok ? 'ok' : nm.msg})`);
    await LQ.repararLiquidaciones();
    ok(!P.revs.has(`evt-rev-${L3.id}-1`), 'resuelta a mano, nadie la vuelve a pedir a Stripe');
  }

  console.log('2 · Cobro de Pro: la intención antes de la pasarela');
  const pmDe = async (u, b) => { const pm = `pm_fake_${RUN}_${b}`; await db.query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp) values ($1, $2, 'visa', '4242', '12/30')`, [u, pm]); return pm; };
  const sub = (b) => q1(`select status, failed_attempts::int as n, to_char(current_period_end at time zone 'UTC', 'YYYY-MM-DD') as fin from subscriptions where business_id = $1`, [b]);
  const intenciones = (b) => db.query(`select status, idem_key as k, attempts::int as n from subscription_charges where business_id = $1 order by id`, [b]).then((r) => r.rows);
  const audPro = (b) => async (c) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id) values ('user', $1, 'plan.seguir_pro', 'business', $2)`, [X.u, b]);
  const nAudPro = (b) => n1(`select count(*)::int as n from audit_entries where action = 'plan.seguir_pro' and target_id = $1`, [b]);
  const nEv = (b, kind) => n1(`select count(*)::int as n from subscription_events where business_id = $1 and kind = $2`, [b, kind]);
  const atrasarCobro = (b, min) => crudo((k) => k.query(`update subscription_charges set created_at = created_at - make_interval(mins => $2::int) where business_id = $1 and status = 'pending'`, [b, min]));
  {
    // «Volver a Pro»: Stripe cobró pero la respuesta se perdió.
    const b = (await datos()).b, pm = await pmDe(X.u, b);
    P.para = `sub-${b}-`; P.plan = ['red-pero-hizo'];
    const r = await SU.seguirConPro(b, X.u, pm, 'month', audPro(b));
    let I = await intenciones(b);
    ok(!r.ok && /en camino/.test(r.msg.es) && I.length === 1 && I[0].status === 'pending' && (await sub(b)).status === 'ended', `sin respuesta de Stripe: la intención queda en camino y el plan no cambia («${r.ok ? '' : r.msg.es}»)`);
    ok(await nAudPro(b) === 1, 'la auditoría del dueño entró con la intención (en su transacción)');
    const r2 = await SU.seguirConPro(b, X.u, pm, 'month', audPro(b));
    I = await intenciones(b);
    ok(r2.ok && I.length === 1 && I[0].status === 'done' && (await sub(b)).status === 'active' && P.cobrosDe(b) === 1, `tocar otra vez termina ESA intención con su llave: un cobro, Pro activo (${(await sub(b)).status})`);
    ok(await nAudPro(b) === 1 && await nEv(b, 'charged') === 1 && await nEv(b, 'back_to_pro') === 1, 'sin otra auditoría, un «cobrado» y un «volvió a Pro»');
  }
  {
    // Lo mismo, pero lo termina el barrido (el dueño cerró la app).
    const b = (await datos()).b, pm = await pmDe(X.u, b);
    P.para = `sub-${b}-`; P.plan = ['red-pero-hizo'];
    await SU.seguirConPro(b, X.u, pm, 'year', audPro(b));
    await atrasarCobro(b, 3);
    await SU.barrerCobrosPro(); await SU.barrerCobrosPro();
    const I = await intenciones(b), s = await sub(b);
    ok(I.length === 1 && I[0].status === 'done' && s.status === 'active' && P.cobrosDe(b) === 1 && await nEv(b, 'charged') === 1 && await nEv(b, 'back_to_pro') === 1,
      `el barrido lo termina con la misma llave: un cobro, Pro activo, un «cobrado» (${s.status}, ${I.map((x) => x.status)})`);
  }
  {
    // El proceso murió justo después de anotar (antes de llamar a Stripe): el barrido lo manda con esa llave.
    const b = (await datos()).b, pm = await pmDe(X.u, b);
    await db.query(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, current_period_end) values ($1, 'active', 'month', $2, $3, now() - interval '1 hour')`, [b, X.u, pm]);
    const desde = (await q1(`select current_period_end as d from subscriptions where business_id = $1`, [b])).d;
    const k = `sub-${b}-${new Date(desde).toISOString()}-${pm.slice(-16)}-0`;
    await db.query(`insert into subscription_charges (business_id, city_id, period_start, cycle, amount_cents, pm, payer_user_id, idem_key) values ($1, 'hzl', $2, 'month', 3000, $3, $4, $5)`, [b, desde, pm, X.u, k]);
    await atrasarCobro(b, 3);
    await SU.barrerCobrosPro();
    const s = await sub(b);
    ok(P.cargos.has(k) && P.cobrosDe(b) === 1 && s.status === 'active' && s.fin > new Date().toISOString().slice(0, 10), `murió entre la intención y Stripe: el barrido cobra con ESA llave, una vez, y el período avanza (${s.fin})`);
    await SU.procesar(b);
    ok(P.cobrosDe(b) === 1, 'procesar después no cobra otra vez el mismo período');
    let dup = null;
    try { await db.query(`insert into subscription_charges (business_id, city_id, period_start, cycle, amount_cents, pm, payer_user_id, idem_key) values ($1, 'hzl', $2, 'month', 3000, $3, $4, $5)`, [b, desde, pm, X.u, `${k}-otra`]);
      await db.query(`update subscription_charges set status = 'done' where idem_key = $1`, [`${k}-otra`]); } catch (e) { dup = e.message; }
    ok(!!dup && /subscription_charges_un_cobro_por_periodo/.test(dup), 'la base no deja dos cobros hechos del mismo período');
    // Esa otra intención quedó pendiente (de un período ya cobrado, nunca mandada): el barrido no la manda a Stripe, la deja fallida.
    await atrasarCobro(b, 3);
    await SU.barrerCobrosPro();
    const otra = await q1(`select status, last_error from subscription_charges where idem_key = $1`, [`${k}-otra`]);
    ok(!P.cargos.has(`${k}-otra`) && otra.status === 'failed' && otra.last_error === 'periodo_ya_cobrado', `una intención de un período ya cobrado nunca llega a Stripe (${otra.status}, ${otra.last_error})`);
  }
  {
    // Pasadas 23 h sin respuesta: no se cobra otra vez, alerta una vez, y el plan no se da por fallido.
    const b = (await datos()).b, pm = await pmDe(X.u, b);
    await db.query(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, current_period_end) values ($1, 'active', 'month', $2, $3, now() - interval '1 day')`, [b, X.u, pm]);
    const desde = (await q1(`select current_period_end as d from subscriptions where business_id = $1`, [b])).d;
    const k = `sub-${b}-${new Date(desde).toISOString()}-${pm.slice(-16)}-0`;
    await crudo((c) => c.query(`insert into subscription_charges (business_id, city_id, period_start, cycle, amount_cents, pm, payer_user_id, idem_key, status, attempts, last_error, created_at) values ($1, 'hzl', $2, 'month', 3000, $3, $4, $5, 'pending', 4, 'red', now() - interval '24 hours')`, [b, desde, pm, X.u, k]));
    await SU.procesar(b); await SU.procesar(b); await SU.barrerCobrosPro();
    const s = await sub(b);
    ok(P.cobrosDe(b) === 0 && !P.cargos.has(k), 'un cobro de Pro de hace 24 h sin respuesta no vuelve a Stripe (ni procesar ni el barrido)');
    ok(await alertasDe('charge_stuck', k) === 1, 'el equipo de dinero recibe UNA alerta charge_stuck');
    ok(s.status === 'active' && s.n === 0, `y no cuenta como «cobro fallido» (otro intento sería otra llave: podría cobrar dos veces) (${s.status}, ${s.n})`);
    let dup = null;
    try { await db.query(`insert into subscription_charges (business_id, city_id, period_start, cycle, amount_cents, pm, payer_user_id, idem_key) values ($1, 'hzl', now(), 'month', 3000, $2, $3, $4)`, [b, pm, X.u, `${k}-otra`]); } catch (e) { dup = e.message; }
    ok(!!dup && /subscription_charges_una_en_camino/.test(dup), 'la base no deja anotar otro cobro mientras ese sigue en camino');
  }
  {
    // La renovación con Stripe sin contestar: no pasa a «cobro fallido»; el siguiente paso la termina con la misma llave.
    const b = (await datos()).b, pm = await pmDe(X.u, b);
    await db.query(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, current_period_end) values ($1, 'active', 'month', $2, $3, now() - interval '1 hour')`, [b, X.u, pm]);
    P.para = `sub-${b}-`; P.plan = ['red'];
    await SU.procesar(b);
    let s = await sub(b), I = await intenciones(b);
    ok(s.status === 'active' && s.n === 0 && I.length === 1 && I[0].status === 'pending' && I[0].n === 1, `renovación sin respuesta: sigue activa, sin intento fallido, la intención en camino (${s.status}, ${s.n})`);
    await SU.procesar(b);
    s = await sub(b); I = await intenciones(b);
    ok(I.length === 1 && I[0].status === 'done' && P.cobrosDe(b) === 1 && s.fin > new Date().toISOString().slice(0, 10), 'el siguiente paso la termina con la misma llave: un cobro y el período avanza');
  }
  {
    // Un «no» del banco sí es un intento fallido (el siguiente es otra llave).
    const b = (await datos()).b, pm = await pmDe(X.u, b);
    await db.query(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, current_period_end) values ($1, 'active', 'month', $2, $3, now() - interval '1 hour')`, [b, X.u, pm]);
    P.para = `sub-${b}-`; P.plan = ['no'];
    await SU.procesar(b);
    const s = await sub(b), I = await intenciones(b);
    ok(s.status === 'past_due' && s.n === 1 && I.length === 1 && I[0].status === 'failed' && P.cobrosDe(b) === 0, `el banco dice que no: intención rechazada y «cobro fallido» (${s.status}, ${s.n}, ${I[0]?.status})`);
  }

  console.log('3 · «Resolver a mano» lo que lleva 23 h sin intentos (nunca antes)');
  {
    const c = await cobro(X), k = `t9v-${crypto.randomUUID()}`;
    const rf = (await q1(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key) values ($1::bigint, 700, 'prueba', 'admin', 'pending', $2) returning id::text`, [c.p, k])).id;
    await atrasar(rf, 24 * 60);
    await cobros.barrerDevolucionesPago(); await cobros.barrerDevolucionesPago();
    ok(!P.salio.has(k) && await alertasDe('refund_stuck', rf) === 1, 'murió antes del primer intento y pasaron 24 h: no se manda; una alerta');
    const f = await filaAlerta('refund_stuck', rf);
    ok(f && f.aMano === true, 'la pantalla ofrece «Resolver a mano» (lo decide el servidor)');
    const n = await alertas.notaAlerta(S, await idAlerta('refund_stuck', rf), 'resuelta_a_mano', 'Cheque al cliente');
    ok(n.ok && (await q1(`select manual_at is not null as m from refunds where id = $1::bigint`, [rf])).m, 'y la base lo deja: resuelta a mano');
    const c2 = await cobro(X), k2 = `t9v-${crypto.randomUUID()}`;
    const rf2 = (await q1(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key) values ($1::bigint, 500, 'prueba', 'admin', 'pending', $2) returning id::text`, [c2.p, k2])).id;
    await alertas.alertar('refund_stuck', rf2, { monto: 500, detalle: { es: 'prueba', en: 'test' } });
    const f2 = await filaAlerta('refund_stuck', rf2);
    let err = null; try { await db.query(`update refunds set manual_at = now(), manual_by = $2::uuid, manual_note = 'Cheque al cliente' where id = $1::bigint`, [rf2, staffU]); } catch (e) { err = e.message; }
    ok(f2 && f2.aMano === false && /dinero_a_mano/.test(err ?? ''), 'recién anotada y sin intentos: ni la pantalla lo ofrece ni la base lo deja (alguien todavía podría mandarla)');
  }

  console.log('4 · Boletos: la devolución que Stripe da por fallida después');
  {
    const B = await datos();
    await db.query(`update users set first_name = 'Rosa', last_name = 'Marte' where id = $1::uuid`, [B.u]);
    const { e, f } = await evento(B.b);
    const c = await cobro(B, 4000, { kind: 'tickets', num: `B-${++NUM}`, details: { event_id: Number(e), event_date_id: Number(f) }, fee: 400, grupo: `evt-${e}` });
    const AL = 'ABCDEFGHJKMNPQRSTUVWXYZ', cod = () => `TL-${Array.from({ length: 3 }, () => AL[crypto.randomInt(AL.length)]).join('')}-${Array.from({ length: 4 }, () => 2 + crypto.randomInt(8)).join('')}`;
    const codes = [cod(), cod()];
    const cx = await crudo(async (k) => {
      const tt = (await k.query(`insert into ticket_types (event_id, city_id, cfg_key, name, price_cents, quantity) values ($1::bigint, 'hzl', 'gen', '{"es":"General","en":"General"}'::jsonb, 2000, 10) returning id::text`, [e])).rows[0].id;
      const T = [];
      for (const code of codes) T.push((await k.query(`insert into tickets (code, event_id, event_date_id, city_id, operation_id, ticket_type_id, holder_user_id, admits, kind, price_cents, fee_cents, status)
                                                       values ($1, $2::bigint, $3::bigint, 'hzl', $4::bigint, $5::bigint, $6::uuid, 1, 'paid', 2000, 200, 'refunded') returning id::text`, [code, e, f, c.op, tt, B.u])).rows[0].id);
      const x = (await k.query(`insert into event_cancellations (event_id, event_date_id, business_id, city_id, scope, reason_key, by_kind, status, orders_n, refunded_cents, card_cost_cents) values ($1::bigint, $2::bigint, $3, 'hzl', 'date', 'clima', 'business', 'done', 1, 4000, 146) returning id::text`, [e, f, B.b])).rows[0].id;
      const sid = `re_fake_bol_${RUN}_${x}`;
      const rf = (await k.query(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key, stripe_refund_id, done_at, fee_absorbed_by) values ($1::bigint, 4000, 'Evento cancelado', 'event_cancelled', 'done', $2, $3, now(), 'platform') returning id::text`, [c.p, `evtcx-${x}-${c.op}`, sid])).rows[0].id;
      for (const t of T) await k.query(`insert into ticket_refund_lines (refund_id, operation_id, ticket_id, city_id, amount_cents, fee_kept_cents, fee_waived_cents) values ($1::bigint, $2::bigint, $3::bigint, 'hzl', 2000, 0, 200)`, [rf, c.op, t]);
      await k.query(`update payments set refunded_cents = 4000, status = 'refunded' where id = $1::bigint`, [c.p]);
      return { x, rf, sid };
    });
    const liq0 = await q1(`select fee::int, refunded::int as dev, base::int from evt_liq_calc($1::bigint)`, [f]);
    const r = await cobros.devolucionFallidaEnStripe(cx.sid, 'expired_or_canceled_card', 4000);
    const rf = await q1(`select status from refunds where id = $1::bigint`, [cx.rf]), p = await pago(c.p);
    const T = (await db.query(`select status from tickets where code = any($1::text[])`, [codes])).rows;
    const x1 = await q1(`select refunded_cents::int as dev, status from event_cancellations where id = $1::bigint`, [cx.x]);
    const liq = await q1(`select fee::int, refunded::int as dev, base::int from evt_liq_calc($1::bigint)`, [f]);
    ok(r === 'anotada' && rf.status === 'failed' && p.dev === 0 && p.status === 'captured', `la devolución queda fallida y el saldo vuelve al cobro (${rf.status}, ${p.dev}, ${p.status})`);
    ok(x1.dev === 0 && x1.status === 'done', `la cancelación del evento resta lo que contaba como devuelto (${x1.dev}), en la misma transacción`);
    ok(liq0.fee === 0 && liq0.dev === 4000 && liq.fee === 400 && liq.dev === 0 && liq.base === 3600, `la liquidación de esa fecha la ve del libro: sin lo devuelto y sin la comisión cedida (${liq0.fee}/${liq0.dev} → ${liq.fee}/${liq.dev}/${liq.base})`);
    ok(T.length === 2 && T.every((t) => t.status === 'refunded'), 'los boletos NO se reponen solos (siguen devueltos: no entran)');
    const a = await q1(`select detail from money_alerts where kind = 'refund_failed' and subject_id = $1`, [cx.rf]);
    ok(a && codes.every((k) => a.detail.es.includes(k) && a.detail.en.includes(k)) && /Rosa M/.test(a.detail.es) && a.detail.es.includes(c.num), `la alerta dice qué boletos, de qué orden y de quién («${a?.detail.es.slice(0, 150)}…»)`);
    const r2 = await cobros.devolucionFallidaEnStripe(cx.sid, 'expired_or_canceled_card', 4000);
    ok(r2 === 'ya' && (await q1(`select refunded_cents::int as dev from event_cancellations where id = $1::bigint`, [cx.x])).dev === 0 && await alertasDe('refund_failed', cx.rf) === 1 && !P.salio.has(`evtcx-${cx.x}-${c.op}`),
      'el mismo aviso otra vez no resta otra vez, no alerta otra vez y no devuelve solo');
  }

  console.log('5 · Ayuda de la cita: un «no» de Stripe en una parte');
  {
    const XB = await datos('NEG-BELL');
    async function ayuda() {
      const c = await cobro(XB, 3000, { num: `C-${++NUM}`, kind: 'appointment', pkind: 'deposit' });
      const pi2 = `pi_fake_est_${c.num.replace(/\W/g, '')}_${RUN}`;
      const p2 = (await q1(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, captured_at) values ($1::bigint, $2, $3, 'hzl', 'estimate', 'card', $4, 1000, 100, 'captured', now()) returning id::text`,
        [c.op, XB.u, XB.b, pi2])).id;
      P.saldo.set(pi2, 1000);
      const h = (await q1(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, wants, amount_cents, status) values ($1, $2::bigint, $3, 'hzl', $4, 'cobro', 'devolver', 3500, 'open') returning id::text`, [`H-${c.num}`, c.op, XB.b, XB.u])).id;
      return { ...c, p2, h };
    }
    const hr = (h) => q1(`select status, offer_cents::int as offer, refunded_cents::int as dev, reply from help_requests where id = $1::bigint`, [h]);
    {
      const k = await ayuda();
      P.para = `ayb-h${k.h}-`; P.plan = ['ok', 'no'];
      const r = await AY.responderAyudaCita(XB.b, k.num, { decision: 'ok', texto: 'Te devolvemos todo.', monto: '35', clave: crypto.randomUUID() }, XB.u, true);
      const h = await hr(k.h);
      ok(!r.ok && /salieron \$30/.test(r.msg.es) && /no pudo devolver \$5/.test(r.msg.es) && /went back/.test(r.msg.en), `el negocio lee lo que pasó («${r.ok ? '' : r.msg.es}»)`);
      ok(h.status === 'answered' && h.reply === 'Te devolvemos todo.' && h.offer === 3000 && h.dev === 3000, `una parte salió: la solicitud NO se reabre y la persona ve lo que de verdad le devolvimos (${h.status}, ${h.offer}, ${h.dev})`);
      const r2 = await AY.responderAyudaCita(XB.b, k.num, { decision: 'ok', texto: 'Otra vez.', monto: '35', clave: crypto.randomUUID() }, XB.u, true);
      ok(!r2.ok && P.vecesSalio(`ayb-h${k.h}-p${k.p}`) === 1, 'responder otra vez no se puede (ya cambió) y nada sale dos veces');
    }
    {
      const k = await ayuda();
      P.para = `ayb-h${k.h}-`; P.plan = ['red', 'no'];
      const r = await AY.responderAyudaCita(XB.b, k.num, { decision: 'ok', texto: 'Te devolvemos todo.', monto: '35', clave: crypto.randomUUID() }, XB.u, true);
      let h = await hr(k.h);
      ok(!r.ok && /en camino/.test(r.msg.es) && h.status === 'answered' && h.offer === 3000 && h.dev === 0, `una parte en camino y otra rechazada: no se reabre; se ofrece lo que va en camino (${h.status}, ${h.offer})`);
      const f = await q1(`select id::text from refunds where idem_key = $1`, [`ayb-h${k.h}-p${k.p}`]);
      await atrasar(f.id, 3);
      await cobros.barrerDevolucionesPago(); await cobros.barrerDevolucionesPago();
      h = await hr(k.h);
      ok(h.dev === 3000 && h.offer === 3000 && P.vecesSalio(`ayb-h${k.h}-p${k.p}`) === 1, `el barrido la termina: lo devuelto y lo ofrecido coinciden (${h.dev})`);
    }
    {
      const k = await ayuda();
      P.para = `ayb-h${k.h}-`; P.plan = ['no', 'no'];
      const r = await AY.responderAyudaCita(XB.b, k.num, { decision: 'ok', texto: 'Te devolvemos todo.', monto: '35', clave: crypto.randomUUID() }, XB.u, true);
      const h = await hr(k.h);
      ok(!r.ok && h.status === 'open' && h.offer === null && h.dev === 0, 'Stripe dice que no a todo: nada salió y la solicitud vuelve a quedar abierta (como antes)');
    }
  }

  console.log('6 · El webhook: la lista escrita de sus eventos');
  {
    const t = fs.readFileSync(path.join(RAIZ, 'apps/web/app/api/stripe/webhook/route.ts'), 'utf8');
    const lista = (/EVENTOS QUE ESCUCHA([\s\S]*?)FIN DE LA LISTA/.exec(t)?.[1] ?? '');
    const casos = [...t.matchAll(/case "([a-z_.]+)":/g)].map((m) => m[1]);
    const doc = fs.readFileSync(path.join(RAIZ, 'docs/ayuda/admin-conciliacion.md'), 'utf8');
    const faltan = casos.filter((c) => !new RegExp(`(^|[\\s·])${c.replace(/\./g, '\\.')}($|[\\s·])`, 'm').test(lista) || !doc.includes(`\`${c}\``));
    ok(casos.length >= 14 && casos.includes('charge.refund.updated') && !faltan.length, `los ${casos.length} eventos del webhook están en su lista y en la ayuda del equipo${faltan.length ? ` (faltan: ${faltan})` : ''}`);
  }

  await db.end();
  console.log(`\n${checks - fallas}/${checks} · ${fallas ? 'FALLA' : 'bien'}`);
  process.exit(fallas ? 1 : 0);
})().catch(async (e) => { console.error('✗', e); try { await D.db().end(); } catch { /* */ } process.exit(1); });
