// 9t2 (21 nov) · «Dinero por clase, 21 nov» (LAUNCH, nueve puntos) contra la base de pruebas y con una pasarela de mentira (sin servidor), con los
// archivos REALES de apps/web (cobros, boletos-despues, patrocinio, ayuda-cita, soporte-equipo, pagos-banco, suscripcion, dinero-alertas, disputas,
// la acción de Negocio 360° › Dinero y el webhook de Stripe con su firma), transpilados con pruebas/lib/ts-servidor.cjs. La misma armazón que din9t.
//   1. Boletos: el cierre toma lo devuelto del libro (el webhook charge.refunded llegó antes: no cuenta dos veces).
//   2. Boletos y patrocinios: pasadas 23 h no se pregunta más con la misma llave; una alerta al equipo de dinero.
//   3. Ayuda de la cita: llave del caso, auditoría con la intención, refunded_cents una vez también si la termina el barrido.
//   4. Soporte: con la devolución en camino, el barrido cierra la fila y el caso (una vez) y la respuesta sale entonces.
//   5. Pausar pagos: la decisión antes de Stripe; si Stripe no contesta (o el proceso muere), el barrido deja los dos iguales.
//   6. Cobro de Pro: una cortesía puesta mientras se cobraba no se pisa; el cobro alerta.
//   7. «Resolver a mano» solo con la devolución todavía pendiente.
//   8. Webhook charge.refund.updated (firmado): la devolución fallida días después, el saldo de vuelta al cobro y la alerta; una vez.
//   9. Webhook charge.dispute.closed: el caso de Colas se cierra una vez, con auditoría del sistema.
// Uso: DATABASE_URL=… node pruebas/e2e/din9t2.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const crypto = require('crypto');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Los módulos reales, con lo de afuera de mentira ──
const D = cargar('apps/web/lib/db.ts');
const avisados = [];
const avisos = { avisar: async () => undefined, avisarMuchos: async () => undefined, avisarNegocio: async (b, t) => { avisados.push([b, t]); } };
let PATSUJ = null;
const K = {}, DC = {}, BOS = {}; // 9t7 · se llenan abajo (consulta a la pasarela y lo de más de 23 h)
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './devolucion-consulta': DC, './admin': { auditar: async (c, a) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, after) values ('staff', $1, $2, $3, $4, $5)`, [a.actor, a.action, a.targetKind, a.targetId ?? null, JSON.stringify(a.after ?? null)]) } });
// La pasarela de mentira (la de din9t): devuelve una vez por llave y lleva la cuenta de lo que salió de verdad.
const P = {
  modo: () => 'simulador', salio: new Map(), llamadas: 0, porLlave: new Map(), plan: [], para: null, saldo: new Map(), pausas: [], pausaPlan: [],
  async devolver(pi, n, idem) {
    this.llamadas++; this.porLlave.set(idem, (this.porLlave.get(idem) ?? 0) + 1);
    // El plan es solo para las llaves de ESTA prueba (para): el barrido también termina devoluciones de otras corridas y no debe gastarlo.
    const paso = this.plan.length && (!this.para || idem.startsWith(this.para)) ? this.plan.shift() : 'ok';
    if (paso === 'no') return { ok: false, codigo: 'charge_disputed' };
    if (paso === 'red') return { ok: false, codigo: 'red' };
    const ya = this.salio.get(idem);
    if (ya) return ya.n === n ? { ok: true, id: ya.id } : { ok: false, codigo: 'idempotency_error' };
    const libre = (this.saldo.get(pi) ?? 0) - [...this.salio.values()].filter((x) => x.pi === pi).reduce((s, x) => s + x.n, 0);
    if (n > libre) return { ok: false, codigo: 'amount_too_large' };
    const r = { id: `re_fake_${crypto.randomBytes(6).toString('hex')}`, n, pi };
    this.salio.set(idem, r);
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'red' };
    return { ok: true, id: r.id };
  },
  async cuentaPagos(cuenta, pausar) { const paso = this.pausaPlan.length ? this.pausaPlan.shift() : 'ok'; if (paso !== 'ok') return false; this.pausas.push([cuenta, pausar]); return true; },
  // 9t7 · La consulta a la pasarela (lo de más de 23 h y «Resolver a mano»): Stripe no tiene la devolución (así se puede resolver a mano, como antes); lo
  // que pasa con cada otra respuesta lo prueba din9t7.
  buscarDevolucion: async () => ({ ok: true, hallado: null }),
  vecesSalio(idem) { return [...this.salio.keys()].filter((k) => k === idem).length; },
};
const SE = {}; // lib/soporte-equipo (se llena abajo: cobros lo importa al cerrar una devolución de Soporte)
// 9t7 · Lo que pasó la ventana de la llave se le pregunta a la pasarela (lib/devolucion-consulta.ts, lib/consulta-pasarela.ts): los módulos reales. Esta
// pasarela de mentira dice que Stripe no tiene la devolución (nada se cierra solo, como antes); lo que hace con cada respuesta lo prueba din9t7.
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': SE, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC });
Object.assign(K, cargar('apps/web/lib/consulta-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas }));
Object.assign(DC, cargar('apps/web/lib/devolucion-consulta.ts', { './db': D, './cobros': cobros, './consulta-pasarela': K, './boletos-despues': BOS,
  './admin': { auditar: async (c, a) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, after, reason) values ('staff', $1, $2, $3, $4, $5, $6)`, [a.actor, a.action, a.targetKind, a.targetId ?? null, JSON.stringify(a.after ?? null), a.reason ?? null]) } }));
const tapar = (t) => ({ texto: String(t) });
Object.assign(SE, cargar('apps/web/lib/soporte-equipo.ts', { './reportar': {}, './admin': { auditar: async (c, a) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason) values ('staff', $1, $2, $3, $4, $5, $6, $7, $8)`,
  [a.actor, a.action, a.targetKind, a.targetId ?? null, a.city ?? null, a.before === undefined ? null : JSON.stringify(a.before), a.after === undefined ? null : JSON.stringify(a.after), a.reason ?? null]) },
  './compa/tapar': { tapar }, './db': D, './panel': { telefonoBonito: (x) => x }, './soporte': { NUM_TK: /^TK-\d{4,12}$/, avisarCaso: async () => undefined, horario: () => null, prometido: () => null },
  './soporte-comun': { TEMAS: {} }, './cobros': cobros }));

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
// 21 nov · Teléfonos de prueba SIEMPRE 570-555 (el repo es público) y con sus 10 dígitos. Antes salían de la hora: números que pueden ser de
// alguien y, donde pasaban por Number(), uno de cada diez con un dígito de menos (users_phone_check; din9t4 roja en el CI 44884103116).
const { esFijo } = require('../lib/telefonos-fijos.cjs');
const telNuevo = async () => { for (let i = 0; i < 400; i++) { const t = '570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); if (!esFijo(t) && !(await q1(`select 1 as x from users where phone = $1`, ['+1' + t]))) return '+1' + t; } throw new Error('no queda un teléfono 570-555 libre'); };
const n1 = async (s, v = []) => Number((await q1(s, v)).n);
const RUN = crypto.randomBytes(4).toString('hex');

async function datos(cat = 'NEG-FOOD') {
  const tel = await telNuevo();
  const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Dinero') returning id::text`, [tel])).id;
  const b = (await q1(`insert into businesses (id, city_id, category_id, name) values ($1, 'hzl', $2, 'Prueba 9t2') returning id`, [`p9u-${crypto.randomBytes(4).toString('hex')}`, cat])).id;
  await dormir(2);
  return { u, b };
}
let NUM = Number(String(Date.now()).slice(-6)) * 10;
async function cobro(x, monto = 5000, o = {}) {
  const num = o.num ?? String(++NUM);
  const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, total_cents, subtotal_cents) values ($1, $5, 'hzl', $2, $3, 'app', gen_random_uuid(), 'confirmed', $4, $4) returning id::text`,
    [num, x.b, x.u, monto, o.kind ?? 'order'])).id;
  const pi = `pi_fake_${num.replace(/\W/g, '')}_${RUN}`;
  const p = (await q1(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, captured_at)
                         values ($1::bigint, $2, $3, 'hzl', $5, 'card', $4, $6, 500, 'captured', now()) returning id::text`, [op, x.u, x.b, pi, o.pkind ?? 'full', monto])).id;
  P.saldo.set(pi, monto);
  return { op, p, pi, num };
}
const pago = (id) => q1(`select refunded_cents::int as dev, status from payments where id = $1::bigint`, [id]);
const atrasar = (id, min) => db.query(`update refunds set created_at = created_at - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]);
const alertasDe = (kind, sujeto) => n1(`select count(*)::int as n from money_alerts where kind = $1 and subject_id = $2`, [kind, sujeto]);

(async () => {
  const X = await datos();

  console.log('1 · Boletos: lo devuelto sale del libro');
  const pases = { pasesPronto: () => undefined };
  const BO = cargar('apps/web/lib/boletos-despues.ts', { './config': { cfgSql: () => '0', valores: async () => ({}) }, './cuenta': { normalizarTelefono: (x) => x }, './db': D,
    './evt-comun': { bi: (x) => x?.es ?? '', diaCorto: () => '', dinero: (c) => `$${(c / 100).toFixed(2)}`, hora: () => '' }, './pagos/pasarela': { pasarela: P }, './pases/pronto': pases, './cobros': cobros,
    './devolucion-consulta': DC, './consulta-pasarela': K, './dinero-alertas': alertas });
  Object.assign(BOS, BO);
  async function devBoletos(c, monto, idem) {
    const rf = (await q1(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key) values ($1::bigint, $2, 'boletos', 'buyer', 'pending', $3) returning id::text`, [c.p, monto, idem])).id;
    const l = (await q1(`insert into operation_lines (operation_id, name, qty, unit_price_cents, line_total_cents) values ($1::bigint, '{"es":"Extra","en":"Extra"}'::jsonb, 1, $2, $2) returning id::text`, [c.op, monto])).id;
    await db.query(`insert into ticket_refund_lines (refund_id, operation_id, line_id, city_id, amount_cents) values ($1::bigint, $2::bigint, $3::bigint, 'hzl', $4)`, [rf, c.op, l, monto]);
    return rf;
  }
  {
    const c = await cobro(X), k = `t9u-bol-${crypto.randomUUID()}`;
    const rf = await devBoletos(c, 1200, k);
    // Stripe devolvió y el webhook charge.refunded llegó ANTES del cierre: el libro ya cuenta los $12.
    await P.devolver(c.pi, 1200, k);
    await db.query(`update payments set refunded_cents = greatest(refunded_cents, 1200), status = 'partially_refunded' where id = $1::bigint`, [c.p]);
    const r = await BO.ejecutarDevolucion(rf);
    const p = await pago(c.p);
    ok(r && p.dev === 1200 && p.status === 'partially_refunded' && P.vecesSalio(k) === 1, `el cierre de boletos no cuenta dos veces lo que el webhook ya contó (${p.dev} de 5000)`);
    const r2 = await BO.ejecutarDevolucion(rf);
    ok(r2 && (await pago(c.p)).dev === 1200, 'repetir el cierre no cambia nada');
  }

  console.log('2 · Pasadas 23 h, ni boletos ni patrocinios preguntan otra vez');
  {
    const c = await cobro(X), k = `t9u-bol-${crypto.randomUUID()}`;
    const rf = await devBoletos(c, 900, k);
    await atrasar(rf, 24 * 60);
    // 25 nov · Se cuentan las llamadas con SU llave: el barrido también manda (bien) las devoluciones de boletos pendientes de otras corridas que siguen
    // dentro de las 23 h, y con ellas en la base contar todas las llamadas daba rojo sin que esta devolución hubiera vuelto a la pasarela.
    await BO.barrerDevolucionesBoletos(); await BO.barrerDevolucionesBoletos();
    const r = await BO.ejecutarDevolucion(rf);
    // (revisión de 483a3af) · Con la llave renovada también (llaveDe: `${k}-r1`, …): ninguna llamada cuya llave empiece por la suya.
    ok(![...P.porLlave.keys()].some((x) => x.startsWith(k)) && !r &&(await q1(`select status from refunds where id = $1::bigint`, [rf])).status === 'pending', 'boletos: una devolución de hace más de 23 h no vuelve a la pasarela (ni el barrido ni otra llamada)');
    ok(await alertasDe('refund_stuck', rf) === 1, 'boletos: el equipo de dinero recibe UNA alerta');
    const c2 = await cobro(X), k2 = `t9u-bol-${crypto.randomUUID()}`;
    const rf2 = await devBoletos(c2, 700, k2);
    await atrasar(rf2, 3); P.para = k2; P.plan = ['red'];
    await BO.barrerDevolucionesBoletos();
    await BO.barrerDevolucionesBoletos();
    ok((await q1(`select status from refunds where id = $1::bigint`, [rf2])).status === 'done' && P.vecesSalio(k2) === 1, 'boletos: dentro de las 23 h el barrido la termina con la misma llave');
  }
  {
    // 9t8 (0207) · La devolución de un patrocinio es una intención (sponsorship_refunds): la que quedó en camino hace más de 23 h se le pregunta a la pasarela
    // (con su dato) o, sin él (como la de esta prueba: anotada antes de 0207), solo alerta; nunca vuelve a Stripe con la llave vieja. Lo demás lo prueba din9t8.
    const PAT = cargar('apps/web/lib/patrocinio.ts', { './config': { valores: async () => ({}) }, './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './categoria': {}, './dinero-alertas': alertas, './avisos': avisos,
      './cobro-fuera': { SIN_RESPUESTA: new Set(['red', 'api_error', 'error']) }, './consulta-pasarela': K });
    const cat = (await q1(`select id from categories limit 1`))?.id ?? 'NEG-FOOD';
    const s = (await q1(`insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, refund_cents, refund_days, refund_motive, ended_at)
                          values ($1, $2, 'hzl', now() - interval '3 days', now() - interval '2 days', 'week', 'terminado', 5000, $3, 2000, 2, 'pausa', now() - interval '2 days') returning id::text`, [X.b, cat, X.u]).catch((e) => ({ err: e.message })));
    if (s?.err) ok(false, `patrocinio de prueba: ${s.err}`);
    else {
      await db.query(`insert into sponsorship_payments (kind, ref_id, business_id, city_id, payer_user_id, amount_cents, pi, idem_key, reason) values ('negocio', $1::bigint, $2, 'hzl', $3, 5000, $4, $5, 'compra')`, [s.id, X.b, X.u, `pi_fake_pat_${s.id}`, `pat-${RUN}-${s.id}`]);
      // La intención como la dejó 0207 para lo de antes: en camino, dada por mandada sin el dato, con la fecha del fin.
      const k = await db.connect();
      try {
        await k.query('set session_replication_role = replica');
        await k.query(`insert into sponsorship_refunds (kind, ref_id, payment_id, business_id, city_id, pi, amount_cents, idem_key, status, sent_at, created_at)
                       select 'negocio', $1::bigint, p.id, $2, 'hzl', p.pi, 2000, 'pat-dev-negocio-' || $1, 'pending', now() - interval '2 days', now() - interval '2 days' from sponsorship_payments p where p.idem_key = $3`, [s.id, X.b, `pat-${RUN}-${s.id}`]);
      } finally { await k.query('set session_replication_role = default').catch(() => undefined); k.release(); }
      const d = await PAT.devolverPatrocinio('negocio', s.id);
      await PAT.devolverPendientes('negocio'); await PAT.devolverPendientes('negocio');
      ok(d === 0 && ![...P.porLlave.keys()].some((x) => x.startsWith(`pat-dev-negocio-${s.id}`)), 'patrocinio: terminado hace más de 23 h, la devolución no vuelve a la pasarela con la misma llave'); // solo SUS llaves: devolverPendientes también manda las devoluciones pendientes de otras corridas
      const sr = (await q1(`select id::text from sponsorship_refunds where kind = 'negocio' and ref_id = $1::bigint`, [s.id])).id;
      PATSUJ = `sponsorship_refunds:${sr}`;
      ok(await alertasDe('refund_stuck', PATSUJ) === 1, 'patrocinio: el equipo de dinero recibe UNA alerta (la de su intención, sponsorship_refunds:<id>)');
    }
  }

  console.log('3 · Ayuda de la cita: llave del caso y lo devuelto una vez');
  const XB = await datos('NEG-BELL');
  const AY = cargar('apps/web/lib/ayuda-cita.ts', { './config': { cfgSql: () => '24', valor: async () => 24 }, './plazo-txt': { horasTxt: () => '' }, './colas': { COLA_AYUDA_SQL: "'sop'" }, './db': D, './cobros': cobros,
    './ayuda': { escalarVencidas: async () => undefined }, './ayuda-estafa': { esEstafa: () => false, pausarPorAyuda: async () => undefined }, './avisos': avisos });
  async function ayuda() {
    const c = await cobro(XB, 3000, { num: `C-${++NUM}`, kind: 'appointment', pkind: 'deposit' });
    const h = (await q1(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, wants, amount_cents, status) values ($1, $2::bigint, $3, 'hzl', $4, 'cobro', 'devolver', 2000, 'open') returning id::text`, [`H-${c.num}`, c.op, XB.b, XB.u])).id;
    return { ...c, h };
  }
  const audCita = (accion) => async (c) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id) values ('staff', $1, $2, 'operation', null)`, [XB.u, `${accion}.${RUN}`]);
  const nAud = (accion) => n1(`select count(*)::int as n from audit_entries where action = $1`, [`${accion}.${RUN}`]);
  {
    const k = await ayuda();
    P.para = `ayb-h${k.h}-`; P.plan = ['red'];
    const r = await AY.responderAyudaCita(XB.b, k.num, { decision: 'ok', texto: 'Te devolvemos el depósito.', monto: '20', clave: crypto.randomUUID() }, XB.u, true, audCita('ay.encamino'));
    const f = await q1(`select id::text, status, idem_key from refunds where payment_id = $1::bigint`, [k.p]);
    let h = await q1(`select status, refunded_cents::int as dev from help_requests where id = $1::bigint`, [k.h]);
    ok(!r.ok && /en camino/.test(r.msg.es) && f?.status === 'pending' && f.idem_key === `ayb-h${k.h}-p${k.p}` && h.status === 'answered' && h.dev === 0, `sin respuesta de Stripe: la respuesta queda, la devolución en camino con la llave del caso (${f?.idem_key})`);
    ok(await nAud('ay.encamino') === 1, 'la auditoría del negocio entró con la intención (en su transacción), aunque el dinero vaya en camino');
    await atrasar(f.id, 3);
    await cobros.barrerDevolucionesPago(); await cobros.barrerDevolucionesPago();
    h = await q1(`select status, refunded_cents::int as dev from help_requests where id = $1::bigint`, [k.h]);
    ok(h.dev === 2000 && (await pago(k.p)).dev === 2000 && P.vecesSalio(`ayb-h${k.h}-p${k.p}`) === 1, `el barrido la termina y la solicitud suma lo devuelto UNA vez (${h.dev})`);
    const otra = await AY.responderAyudaCita(XB.b, k.num, { decision: 'ok', texto: 'Otra vez.', monto: '20', clave: crypto.randomUUID() }, XB.u, true, audCita('ay.encamino'));
    ok(!otra.ok && (await n1(`select count(*)::int as n from refunds where payment_id = $1::bigint`, [k.p])) === 1, 'responder otra vez no anota otra devolución (la solicitud ya cambió)');
  }
  {
    const k = await ayuda();
    const r = await AY.responderAyudaCita(XB.b, k.num, { decision: 'ok', texto: 'Te devolvemos el depósito.', monto: '15', clave: crypto.randomUUID() }, XB.u, true, audCita('ay.bien'));
    const h = await q1(`select status, refunded_cents::int as dev from help_requests where id = $1::bigint`, [k.h]);
    ok(r.ok && h.dev === 1500 && (await pago(k.p)).dev === 1500 && await nAud('ay.bien') === 1, `Stripe dice que sí: devuelta, sumada una vez y auditada una vez (${h.dev})`);
  }
  {
    const k = await ayuda();
    P.para = `ayb-h${k.h}-`; P.plan = ['no'];
    const r = await AY.responderAyudaCita(XB.b, k.num, { decision: 'ok', texto: 'Te devolvemos el depósito.', monto: '10', clave: crypto.randomUUID() }, XB.u, true, audCita('ay.no'));
    const h = await q1(`select status, refunded_cents::int as dev from help_requests where id = $1::bigint`, [k.h]);
    ok(!r.ok && h.status === 'open' && h.dev === 0, 'Stripe dice que no: la solicitud vuelve a quedar abierta y nada se suma');
    const r2 = await AY.responderAyudaCita(XB.b, k.num, { decision: 'ok', texto: 'Otra vez.', monto: '10', clave: crypto.randomUUID() }, XB.u, true, audCita('ay.no'));
    const h2 = await q1(`select status, refunded_cents::int as dev from help_requests where id = $1::bigint`, [k.h]);
    ok(r2.ok && h2.dev === 1000 && (await pago(k.p)).dev === 1000, 'responder otra vez (otro toque) usa la misma llave del caso, libre después del «no»: sale una vez');
  }

  console.log('4 · Soporte: la devolución en camino cierra la fila y el caso al terminar');
  const staffU = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Soporte') returning id::text`, [await telNuevo()])).id;
  await db.query(`insert into staff_members (user_id, role, status) values ($1, 'admin', 'active') on conflict (user_id) do update set role = 'admin', status = 'active'`, [staffU]);
  const S = { id: staffU, role: 'admin', cities: [], first_name: 'Equipo', puede: () => true };
  async function caso() {
    const c = await cobro(X);
    const num = `TK-${String(++NUM).slice(-8)}`;
    const k = (await q1(`insert into support_cases (number, user_id, city_id, topic, sla_due_at, operation_id, business_id) values ($1, $2, 'hzl', 'pago', now() + interval '1 day', $3::bigint, $4) returning id::text`, [num, X.u, c.op, X.b])).id;
    return { ...c, k, num };
  }
  {
    const k = await caso(), clave = crypto.randomUUID();
    P.para = `tk-${clave}`; P.plan = ['red'];
    const r = await SE.resolverYDevolver(S, k.num, '12.00', clave, 'Te devolvimos lo del pedido.', null);
    let fila = await q1(`select status from support_refunds where idem_key = $1`, [`tk-${clave}`]);
    let kc = await q1(`select status, refunded_cents::int as dev from support_cases where id = $1::bigint`, [k.k]);
    ok(!r.ok && /en camino/.test(r.mensaje) && fila.status === 'pending' && kc.status !== 'resolved', `sin respuesta de Stripe: la fila y el caso quedan esperando («${r.ok ? '' : r.mensaje}»)`);
    ok(await n1(`select count(*)::int as n from audit_entries where action = 'soporte.devolver' and target_id = $1`, [k.num]) === 1, 'la auditoría de quien decide entró con la intención');
    const f = await q1(`select id::text from refunds where idem_key = $1`, [`tk-${clave}`]);
    await atrasar(f.id, 3);
    await cobros.barrerDevolucionesPago(); await cobros.barrerDevolucionesPago();
    fila = await q1(`select status from support_refunds where idem_key = $1`, [`tk-${clave}`]);
    kc = await q1(`select status, refunded_cents::int as dev from support_cases where id = $1::bigint`, [k.k]);
    const msj = (await db.query(`select sender, sys_key, body, internal from support_messages where case_id = $1::bigint order by id`, [k.k])).rows;
    ok(fila.status === 'done' && kc.status === 'resolved' && kc.dev === 1200 && P.vecesSalio(`tk-${clave}`) === 1, `el barrido termina el dinero y cierra la fila y el caso solos, una vez (${fila.status}, ${kc.status}, ${kc.dev})`);
    ok(msj.filter((m) => m.sys_key === 'devuelto').length === 1 && msj.filter((m) => m.sender === 'staff' && !m.internal && m.body === 'Te devolvimos lo del pedido.').length === 1, 'la persona ve «Te devolvimos» y la respuesta del equipo, una vez cada una');
    ok(await n1(`select count(*)::int as n from audit_entries where action = 'soporte.devolucion_hecha' and target_id = $1`, [k.num]) === 1, 'el cierre del caso queda auditado (sistema), una vez');
    const r2 = await SE.resolverYDevolver(S, k.num, '12.00', clave, 'Te devolvimos lo del pedido.', null);
    ok(r2.ok && /Ya se devolvió/.test(r2.mensaje) && P.vecesSalio(`tk-${clave}`) === 1, 'volver a tocar: «Ya se devolvió», nada sale otra vez');
  }
  {
    const k = await caso(), clave = crypto.randomUUID();
    const r = await SE.resolverYDevolver(S, k.num, '8.00', clave, 'Listo, devuelto.', null);
    const kc = await q1(`select status, refunded_cents::int as dev from support_cases where id = $1::bigint`, [k.k]);
    const msj = (await db.query(`select sender, sys_key, body from support_messages where case_id = $1::bigint and not internal order by id`, [k.k])).rows;
    ok(r.ok && kc.status === 'resolved' && kc.dev === 800 && msj.filter((m) => m.body === 'Listo, devuelto.').length === 1 && msj.filter((m) => m.sys_key === 'devuelto').length === 1, `Stripe dice que sí: caso resuelto con su respuesta, una vez (${r.ok ? r.mensaje : r.mensaje})`);
  }
  {
    const k = await caso(), clave = crypto.randomUUID();
    P.para = `tk-${clave}`; P.plan = ['red', 'no'];
    await SE.resolverYDevolver(S, k.num, '5.00', clave, 'Te devolvemos.', null);
    const f = await q1(`select id::text from refunds where idem_key = $1`, [`tk-${clave}`]);
    await atrasar(f.id, 3);
    await cobros.barrerDevolucionesPago();
    const fila = await q1(`select status from support_refunds where idem_key = $1`, [`tk-${clave}`]);
    ok(fila.status === 'failed' && (await q1(`select status from support_cases where id = $1::bigint`, [k.k])).status !== 'resolved', 'el barrido recibe un «no»: la fila del caso queda fallida sola (el caso sigue abierto)');
  }

  console.log('5 · Pausar pagos: la decisión antes de Stripe');
  const PB = cargar('apps/web/lib/pagos-banco.ts', { './db': D, './pagos/pasarela': { pasarela: P } });
  const auditarAdm = async (c, a) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason) values ('staff', $1, $2, $3, $4, $5, $6, $7, $8)`,
    [a.actor, a.action, a.targetKind, a.targetId ?? null, a.city ?? null, JSON.stringify(a.before ?? null), JSON.stringify(a.after ?? null), a.reason ?? null]);
  const ADM = cargar('apps/web/app/admin/acciones-dinero.ts', { '@/lib/admin': { auditar: auditarAdm, staff: async () => S }, '@/lib/avisos': avisos, '@/lib/db': D, '@/lib/pagos-banco': PB });
  {
    const b = (await datos()).b, acct = `acct_fake_${RUN}_${b}`;
    await db.query(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled) values ($1, $2, 'enabled', true, true)`, [b, acct]);
    // Solo las llamadas de ESTA cuenta (el barrido también termina las marcas que dejaron otras corridas).
    const mias = () => P.pausas.filter(([x]) => x === acct);
    P.pausaPlan = ['no'];
    const r = await ADM.pagosPausar(b, true, 'Disputa abierta');
    let a = await q1(`select payouts_paused as p, payouts_sync_at is not null as sync from stripe_accounts where business_id = $1`, [b]);
    ok(r.ok && /Stripe no respondió/.test(r.mensaje) && a.p && a.sync && mias().length === 0, `Stripe no contesta: la pausa ya está anotada (con su auditoría) y marcada para pedírsela otra vez («${r.mensaje}»)`);
    ok(await n1(`select count(*)::int as n from audit_entries where action = 'negocio.pagos.pausar' and target_id = $1`, [b]) === 1, 'la auditoría entró con la decisión');
    await PB.sincronizarPausas();
    ok((await q1(`select payouts_sync_at is not null as sync from stripe_accounts where business_id = $1`, [b])).sync && mias().length === 0, 'el barrido espera un minuto (puede ir en camino)');
    await db.query(`update stripe_accounts set payouts_sync_at = payouts_sync_at - interval '2 minutes' where business_id = $1`, [b]);
    await PB.sincronizarPausas();
    a = await q1(`select payouts_paused as p, payouts_sync_at is not null as sync from stripe_accounts where business_id = $1`, [b]);
    ok(a.p && !a.sync && mias().length === 1 && mias()[0][1] === true, 'el barrido se lo pide a Stripe con lo que dice la base: los dos quedan en pausa');
    // El proceso muere entre la base y Stripe (reanudar): la base dice activos; el barrido deja Stripe igual.
    await db.query(`update stripe_accounts set payouts_paused = false, paused_reason = null, paused_at = null, paused_by = null, payouts_sync_at = now() - interval '2 minutes' where business_id = $1`, [b]);
    await PB.sincronizarPausas();
    ok(mias().length === 2 && mias()[1][1] === false && !(await q1(`select payouts_sync_at is not null as sync from stripe_accounts where business_id = $1`, [b])).sync, 'el proceso murió después de anotar: el barrido deja Stripe como la base');
    // Una decisión que cambió mientras Stripe contestaba no se da por confirmada.
    await db.query(`update stripe_accounts set payouts_paused = true, payouts_sync_at = now() - interval '2 minutes' where business_id = $1`, [b]);
    const P0 = P.cuentaPagos; P.cuentaPagos = async (c2, p2) => { await db.query(`update stripe_accounts set payouts_paused = false, payouts_sync_at = now() where business_id = $1`, [b]); return P0.call(P, c2, p2); };
    await PB.sincronizarPausas(); P.cuentaPagos = P0;
    ok((await q1(`select payouts_sync_at is not null as sync from stripe_accounts where business_id = $1`, [b])).sync, 'si la decisión cambió mientras Stripe contestaba, la marca queda y el barrido pide lo nuevo');
  }

  console.log('6 · Cobro de Pro: una cortesía puesta en ese segundo no se pisa');
  {
    const b = (await datos()).b, pm = `pm_fake_${RUN}_${b}`;
    await db.query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp) values ($1, $2, 'visa', '4242', '12/30')`, [X.u, pm]);
    const PS = { ...P, intento: async () => null, liberar: async () => ({ ok: true }), cliente: async () => null,
      cobrarDirecto: async () => { await db.query(`insert into subscriptions (business_id, status, courtesy_until, courtesy_reason) values ($1, 'courtesy', now() + interval '30 days', 'prueba') on conflict (business_id) do update set status = 'courtesy', courtesy_until = now() + interval '30 days'`, [b]); return { ok: true, id: `pi_fake_pro_${b}` }; } };
    const SU = cargar('apps/web/lib/suscripcion.ts', { './db': D, './pagos/pasarela': { pasarela: PS, registrarAccion: async () => undefined }, './plan': { PRECIO_PRO: 30 }, './avisos': avisos, './correo/recibos': { reciboPro: async () => undefined }, './dinero-alertas': alertas });
    avisados.length = 0;
    const r = await SU.seguirConPro(b, X.u, pm, 'month');
    const s = await q1(`select status from subscriptions where business_id = $1`, [b]);
    const ev = await q1(`select note->>'no_aplicado' as na, idem_key as k from subscription_events where business_id = $1 and kind = 'charged'`, [b]);
    ok(s.status === 'courtesy' && ev?.na === 'courtesy', `«Volver a Pro» cobró mientras le daban cortesía: la cortesía se queda y el cobro queda en el historial sin aplicar (${s.status}, ${ev?.na}) (${r.ok})`);
    ok(await alertasDe('charge_unapplied', ev?.k ?? '-') === 1 && !avisados.some(([x, t]) => x === b && t === 'pro_charged'), 'el equipo de dinero recibe la alerta y al dueño no se le dice «cobrado»');
  }

  console.log('7 · «Resolver a mano» solo con la devolución pendiente');
  {
    const c = await cobro(X), k = `t9u-${crypto.randomUUID()}`;
    P.para = k; P.plan = ['red', 'no'];
    await cobros.devolverPago({ paymentId: c.p, centavos: 400, por: 'admin', actorId: null, motivo: 'prueba', idem: k });
    const f = await q1(`select id::text from refunds where payment_id = $1::bigint`, [c.p]);
    await atrasar(f.id, 3);
    await cobros.barrerDevolucionesPago();
    const c2 = await cobro(X), k2 = `t9u-${crypto.randomUUID()}`;
    P.para = k2; P.plan = ['red'];
    await cobros.devolverPago({ paymentId: c2.p, centavos: 300, por: 'admin', actorId: null, motivo: 'prueba', idem: k2 });
    const f2 = await q1(`select id::text from refunds where idem_key = $1`, [k2]);
    await alertas.alertar('refund_stuck', f2.id, { monto: 300, detalle: { es: 'prueba', en: 'test' } });
    // 0209 · Recién mandada no se ofrece (la base no deja en los 10 minutos siguientes a un envío: din9t10); aquí, su último envío hace 11 minutos.
    { const k = await db.connect(); try { await k.query('set session_replication_role = replica'); await k.query(`update refunds set last_sent_at = last_sent_at - interval '11 minutes' where id = $1::bigint`, [f2.id]); } finally { await k.query('set session_replication_role = default').catch(() => undefined); k.release(); } }
    const L = (await alertas.alertasDinero({ id: staffU, cities: [] }, false, null, 200)).filas;
    const fall = L.find((a) => a.kind === 'refund_stuck' && a.sujeto === f.id), pend = L.find((a) => a.kind === 'refund_stuck' && a.sujeto === f2.id);
    ok(fall && fall.aMano === false, 'la alerta de una devolución que ya quedó fallida no ofrece «Resolver a mano» (informativa)');
    ok(pend && pend.aMano === true, 'la de una devolución que sigue pendiente (Stripe ya la intentó) sí lo ofrece');
    // 9t8 · La de un patrocinio ya es una intención (sponsorship_refunds): en camino hace más de 23 h, la ofrece (antes de marcar, el servidor pregunta).
    const pat = L.find((a) => a.kind === 'refund_stuck' && a.sujeto === PATSUJ);
    ok(!PATSUJ || (pat && pat.aMano === true), 'la de un patrocinio (su intención, en camino hace más de 23 h) también lo ofrece');
    const n = await alertas.notaAlerta({ id: staffU, cities: [] }, (await q1(`select id::text from money_alerts where kind = 'refund_stuck' and subject_id = $1`, [f.id])).id, 'resuelta_a_mano', 'Cheque al cliente');
    ok(!n.ok, `y si alguien lo intenta igual, el servidor lo rechaza («${n.ok ? '' : n.msg}»)`);
  }

  console.log('8 · Webhook charge.refund.updated (firmado)');
  process.env.STRIPE_WEBHOOK_SECRET = `whsec_prueba_${RUN}`;
  const stripe = cargar('apps/web/lib/pagos/stripe.ts');
  const DI = cargar('apps/web/lib/disputas.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './avisos': avisos });
  class Resp { constructor(b, i) { this.body = b; this.status = i?.status ?? 200; } static json(j) { const r = new Resp(JSON.stringify(j)); r.j = j; return r; } }
  const WH = cargar('apps/web/app/api/stripe/webhook/route.ts', { 'next/server': { NextResponse: Resp }, '@/lib/db': D, '@/lib/disputas': DI, '@/lib/pagos/stripe': stripe, '@/lib/cobros': cobros });
  const webhook = async (ev, firma = true) => {
    const cuerpo = JSON.stringify(ev), t = Math.floor(Date.now() / 1000), sig = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${t}.${cuerpo}`).digest('hex');
    const r = await WH.POST({ text: async () => cuerpo, headers: { get: () => (firma ? `t=${t},v1=${sig}` : `t=${t},v1=${'0'.repeat(64)}`) } });
    return { st: r.status, j: r.j ?? {} };
  };
  {
    const k0 = await ayuda();
    const r0 = await AY.responderAyudaCita(XB.b, k0.num, { decision: 'ok', texto: 'Te devolvemos el depósito.', monto: '20', clave: crypto.randomUUID() }, XB.u, true);
    const f = await q1(`select id::text, stripe_refund_id as sid from refunds where payment_id = $1::bigint and status = 'done'`, [k0.p]);
    ok(r0.ok && !!f?.sid && (await pago(k0.p)).dev === 2000, 'una devolución hecha (la de una ayuda de cita: $20)');
    const ev = { id: `evt_fake_rf_${RUN}`, type: 'charge.refund.updated', data: { object: { id: f.sid, object: 'refund', status: 'failed', failure_reason: 'expired_or_canceled_card', amount: 2000, payment_intent: k0.pi } } };
    const malo = await webhook(ev, false);
    ok(malo.st === 400 && (await q1(`select status from refunds where id = $1::bigint`, [f.id])).status === 'done', 'sin firma válida: rechazado, nada cambia');
    const w1 = await webhook(ev), w2 = await webhook(ev);
    const rf = await q1(`select status, idem_key from refunds where id = $1::bigint`, [f.id]), p = await pago(k0.p);
    const h = await q1(`select refunded_cents::int as dev from help_requests where id = $1::bigint`, [k0.h]);
    ok(w1.st === 200 && w2.j.repetido === true && rf.status === 'failed' && rf.idem_key.includes('~fallida-'), 'firmado: la devolución queda fallida (su llave libre); el repetido se ignora');
    ok(p.dev === 0 && p.status === 'captured' && h.dev === 0, `el saldo vuelve al cobro (del libro) y la solicitud resta lo que había sumado (${p.dev}, ${p.status}, ${h.dev})`);
    ok(await alertasDe('refund_failed', f.id) === 1, 'el equipo de dinero recibe UNA alerta refund_failed');
    await webhook({ ...ev, id: `evt_fake_rf2_${RUN}` });
    const rf2 = await q1(`select idem_key, last_error from refunds where id = $1::bigint`, [f.id]);
    ok((await pago(k0.p)).dev === 0 && await alertasDe('refund_failed', f.id) === 1 && rf2.idem_key.split('~fallida-').length === 2, 'otro evento de la misma devolución no la toca otra vez (una sola «~fallida-»), no resta ni alerta otra vez');
    // Con otra devolución hecha del mismo cobro, la fallida no baja de lo que el libro todavía cuenta.
    const c = await cobro(X);
    await cobros.devolverPago({ paymentId: c.p, centavos: 1000, por: 'admin', actorId: null, motivo: 'a', idem: `t9u-${crypto.randomUUID()}` });
    await cobros.devolverPago({ paymentId: c.p, centavos: 1500, por: 'admin', actorId: null, motivo: 'b', idem: `t9u-${crypto.randomUUID()}` });
    const sid = (await q1(`select stripe_refund_id as s from refunds where payment_id = $1::bigint and amount_cents = 1500`, [c.p])).s;
    await webhook({ id: `evt_fake_rf3_${RUN}`, type: 'charge.refund.updated', data: { object: { id: sid, status: 'failed', amount: 1500 } } });
    const pc = await pago(c.p);
    ok(pc.dev === 1000 && pc.status === 'partially_refunded', `con otra devolución hecha, el cobro queda con lo que el libro cuenta (${pc.dev})`);
    await webhook({ id: `evt_fake_rf4_${RUN}`, type: 'charge.refund.updated', data: { object: { id: `re_fuera_${RUN}`, status: 'failed', amount: 700 } } });
    ok(await alertasDe('refund_failed', `re_fuera_${RUN}`) === 1, 'una fallida que no está en el libro (hecha desde Stripe) solo alerta');
    await webhook({ id: `evt_fake_rf5_${RUN}`, type: 'charge.refund.updated', data: { object: { id: sid, status: 'succeeded', amount: 1500 } } });
    ok((await pago(c.p)).dev === 1000, 'una actualización que no es «fallida» no cambia nada');
  }

  console.log('9 · Webhook charge.dispute.closed: su caso en Colas se cierra');
  {
    const c = await cobro(X);
    const dpk = `dp_fake_${RUN}_${c.num}`;
    await webhook({ id: `evt_fake_dc_${RUN}`, type: 'charge.dispute.created', data: { object: { id: dpk, payment_intent: c.pi, amount: 5000, reason: 'fraudulent', status: 'needs_response' } } });
    const d = (await q1(`select id::text from disputes where stripe_dispute_id = $1`, [dpk])).id;
    ok(await n1(`select count(*)::int as n from queue_items where queue = 'disputa' and subject_id = $1 and status = 'open'`, [d]) === 1, 'la disputa abre su caso en Colas');
    await webhook({ id: `evt_fake_dx_${RUN}`, type: 'charge.dispute.closed', data: { object: { id: dpk, status: 'won' } } });
    await webhook({ id: `evt_fake_dx2_${RUN}`, type: 'charge.dispute.closed', data: { object: { id: dpk, status: 'won' } } });
    const q = await q1(`select status, decision, decided_by from queue_items where queue = 'disputa' and subject_id = $1`, [d]);
    const au = (await db.query(`select actor_kind, after->>'quien' as quien from audit_entries where action = 'disputa.cerrada_banco' and target_id = $1`, [d])).rows;
    ok(q.status === 'decided' && q.decision === 'ganada' && q.decided_by === null, `el banco la cerró (ganada): el caso queda decidido (${q.status}, ${q.decision})`);
    ok(au.length === 1 && au[0].actor_kind === 'system' && au[0].quien === 'sistema', 'una auditoría, de solo inserción, quién: «sistema» (el segundo evento no escribe otra)');
  }

  await db.end();
  console.log(`\n${checks - fallas}/${checks} · ${fallas ? 'FALLA' : 'bien'}`);
  process.exit(fallas ? 1 : 0);
})().catch(async (e) => { console.error('✗', e); try { await D.db().end(); } catch { /* */ } process.exit(1); });
