// 22 nov (0209) · Dinero, lo que queda después de 9t8 (LAUNCH «Dinero por clase: lo que queda después de 9t8» (a), (b) y (d)). Contra la base de pruebas y con
// una pasarela de mentira (sin servidor), con los archivos REALES de apps/web (cobros, boletos-despues, dinero-alertas, devolucion-consulta, consulta-pasarela,
// patrocinio), transpilados con pruebas/lib/ts-servidor.cjs. La misma armazón que din9t7 y din9t8.
//   1. «Devolver otra vez» unos boletos desde su refund_failed: lo ofrece el servidor (el monto de la fallida); dos personas a la vez = una sola devolución,
//      una llamada a Stripe, una auditoría; el mismo toque otra vez no devuelve más; la persona recibe su aviso; la alerta de antes se cierra; la comisión
//      cedida y lo devuelto de la cancelación del evento vuelven a contar (el libro del organizador: evt_liq_calc).
//   2. Stripe dice que no a la de otra vez: queda fallida con SU alerta (desde la que se puede devolver otra vez) y la de antes se reabre; la cadena cuenta la
//      comisión una sola vez. Sin respuesta: en camino y el barrido la termina con la misma llave. Stripe la da por fallida después (webhook): su alerta con
//      los boletos y la de antes se reabre.
//   3. Los límites (la base): nunca más de lo cobrado menos lo devuelto (devolución parcial previa), no con disputa, no de una que no falló, no por otro monto,
//      no sin persona del equipo, no de una que no es de boletos, una sola por fallida, la fallida no deja de estarlo.
//   4. La carrera de «Resolver a mano» mientras el barrido la manda, con el orden controlado: la pasarela se detiene a mitad del envío, «Resolver a mano»
//      pregunta (Stripe todavía no la muestra) e intenta marcarla; la base no lo deja (se mandó hace menos de 10 minutos); al soltar, Stripe contesta y
//      queda hecha una vez (sin el arreglo: queda marcada a mano Y devuelta en Stripe, el cliente cobra dos veces). Pasados los minutos, sí se deja.
//   5. (d) La devolución de un patrocinio que primero quedó «sin respuesta» y después Stripe dio por fallida: la fila dice lo último que dijo Stripe (cuándo y
//      con qué código) y ofrece «Resolver a mano», que la cierra.
// Uso: DATABASE_URL=… node pruebas/e2e/din9t10.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const { esFijo } = require('../lib/telefonos-fijos.cjs');
const crypto = require('crypto');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };
const hex = () => crypto.randomBytes(6).toString('hex');

// ── Los módulos reales, con lo de afuera de mentira ──
const D = cargar('apps/web/lib/db.ts');
const avisados = [];
const avisos = { avisar: async (u, t, v) => { avisados.push(['u', u, t, v]); }, avisarMuchos: async () => undefined, avisarNegocio: async (b, t, v) => { avisados.push(['b', b, t, v]); } };
const auditarStaff = async (c, a) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, after, reason) values ('staff', $1, $2, $3, $4, $5, $6)`,
  [a.actor, a.action, a.targetKind, a.targetId ?? null, JSON.stringify(a.after ?? null), a.reason ?? null]);
// La pasarela de mentira: una vez por llave (como Stripe con Idempotency-Key), guarda la metadata y contesta la consulta como Stripe. `freno`: una promesa que
// detiene la llamada ANTES de que Stripe la registre (la carrera de la parte 4: mientras tanto, la consulta no la ve).
const P = {
  modo: () => 'simulador', hechas: new Map(), plan: [], para: null, stripe: new Map(), caida: false, idems: [], freno: null, enFreno: null,
  paso(idem) { return this.plan.length && (!this.para || idem.startsWith(this.para)) ? this.plan.shift() : 'ok'; },
  async devolver(pi, n, idem, o = {}) {
    this.idems.push(idem);
    if (this.freno && (!this.para || idem.startsWith(this.para))) { const f = this.freno; this.freno = null; this.enFreno?.(); await f; }
    const paso = this.paso(idem);
    if (paso === 'red') return { ok: false, codigo: 'red' };
    if (paso === 'no') return { ok: false, codigo: 'expired_or_canceled_card' };
    if (!this.hechas.has(idem)) this.hechas.set(idem, { id: `re_fake_0209_${hex()}`, objeto: pi, n, meta: { ...(o.meta ?? {}) } });
    return { ok: true, id: this.hechas.get(idem).id };
  },
  async buscarDevolucion(ref, medio, objeto) {
    if (this.caida) return { ok: false };
    const H = this.stripe.get(ref) ?? [...this.hechas.values()].filter((d) => d.objeto === objeto && d.meta.tl_intencion === ref).map((d) => ({ id: d.id, estado: 'hecho', centavos: d.n }));
    return H.length > 1 ? { ok: true, varios: H } : { ok: true, hallado: H[0] ?? null };
  },
  buscarCobro: async () => ({ ok: false }), buscarTransferencia: async () => ({ ok: false }), liberar: async () => ({ ok: true }), cliente: async () => null, intento: async () => null,
  revertirTransferencia: async () => ({ ok: false, codigo: 'red' }),
  llamadasCon(k) { return this.idems.filter((x) => x === k).length; },
};
const K = {}, DC = {}, RV = {}, PA = {}, PE = {}, CF = {}, BO = {};
const alertas = {};
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC });
Object.assign(alertas, cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: auditarStaff }, './consulta-pasarela': K, './devolucion-consulta': DC,
  './revision-pasarela': RV, './patrocinio': PA, './evt-liquidacion': {}, './cobro-fuera': CF, './suscripcion': {}, './renovar-retencion': {}, './cobros': cobros }));
Object.assign(K, cargar('apps/web/lib/consulta-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas }));
const evtComun = { bi: (x) => x?.es ?? '', diaCorto: () => '', dinero: (c) => `$${(c / 100).toFixed(2)}`, hora: () => '' };
Object.assign(BO, cargar('apps/web/lib/boletos-despues.ts', { './config': { cfgSql: () => '0', valores: async () => ({}) }, './cuenta': { normalizarTelefono: (x) => x }, './db': D, './evt-comun': evtComun,
  './pagos/pasarela': { pasarela: P }, './pases/pronto': { pasesPronto: () => undefined }, './cobros': cobros, './devolucion-consulta': DC, './consulta-pasarela': K, './dinero-alertas': alertas }));
Object.assign(DC, cargar('apps/web/lib/devolucion-consulta.ts', { './db': D, './cobros': cobros, './consulta-pasarela': K, './boletos-despues': BO, './evt-liquidacion': {}, './revision-pasarela': RV,
  './admin': { auditar: auditarStaff }, './patrocinio': PA }));
Object.assign(CF, cargar('apps/web/lib/cobro-fuera.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas, './planes': {}, './rentas': {}, './patrocinio': PA,
  './patrocinio-evento': PE, './consulta-pasarela': K }));
Object.assign(RV, cargar('apps/web/lib/revision-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './cobro-fuera': CF, './dinero-alertas': alertas, './admin': { auditar: auditarStaff },
  './consulta-pasarela': K, './suscripcion': {}, './evt-liquidacion': {}, './renovar-retencion': {}, './devolucion-consulta': DC, './patrocinio': PA }));
const valoresPat = async () => ({ patrocinio_semana_cents: 1500, patrocinio_mes_cents: 4500, patrocinio_puestos: 6, patrocinio_dias_adelante: 30, patrocinio_evt_semana_cents: 2000, patrocinio_evt_mes_cents: 6000, patrocinio_evt_puestos: 6 });
Object.assign(PA, cargar('apps/web/lib/patrocinio.ts', { './config': { valores: valoresPat }, './db': D, './cobros': cobros, './cobro-fuera': CF, './pagos/pasarela': { pasarela: P }, './categoria': {},
  './dinero-alertas': alertas, './avisos': avisos, './consulta-pasarela': K, './patrocinio-evento': PE }));

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
const n1 = async (s, v = []) => Number((await q1(s, v)).n);
async function crudo(fn) {
  const k = await db.connect();
  try { await k.query('set session_replication_role = replica'); return await fn(k); } finally { await k.query('set session_replication_role = default').catch(() => undefined); k.release(); }
}
const falla = async (fn) => { try { await fn(); return ''; } catch (e) { return String(e.message ?? e); } };
const pago = (id) => q1(`select refunded_cents::int as dev, status from payments where id = $1::bigint`, [id]);
const refund = (id) => q1(`select id::text, status as st, amount_cents::int as amt, retry_of::text as otra, lines_of::text as lineas, idem_key as k, manual_at is not null as mano, stripe_refund_id as re from refunds where id = $1::bigint`, [id]);
const otraDe = (id) => q1(`select id::text, status as st, amount_cents::int as amt, lines_of::text as lineas, idem_key as k, stripe_refund_id as re from refunds where retry_of = $1::bigint`, [id]);
const idAlerta = async (kind, sujeto) => (await q1(`select id::text from money_alerts where kind = $1 and subject_id = $2`, [kind, String(sujeto)]))?.id;
const ultNota = async (alerta) => (await q1(`select action from money_alert_notes where alert_id = $1::bigint order by at desc, id desc limit 1`, [alerta]))?.action ?? null;
const detalleDe = async (kind, sujeto) => (await q1(`select detail->>'es' as d from money_alerts where kind = $1 and subject_id = $2`, [kind, String(sujeto)]))?.d ?? '';
const auditadas = (accion, id) => n1(`select count(*)::int as n from audit_entries where action = $1 and target_id = $2 and target_kind = 'money_alert'`, [accion, String(id)]);
const liq = (fid) => q1(`select (evt_liq_calc($1::bigint)).*`, [fid]);
const cancelada = async (cx) => (await q1(`select refunded_cents::int as n from event_cancellations where id = $1::bigint`, [cx])).n;
async function tel() {
  for (let i = 0; i < 500; i++) {
    const t = `+1570555${String(crypto.randomInt(10000)).padStart(4, '0')}`;
    if (!esFijo(t) && !(await db.query(`select 1 from users where phone = $1`, [t])).rowCount) return t;
  }
  throw new Error('no quedó un +1570555xxxx libre');
}

(async () => {
  const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Cerocientos') returning id::text`, [await tel()])).id;
  const b = (await q1(`insert into businesses (id, city_id, category_id, name, status) values ($1, 'hzl', 'NEG-BELL', 'Prueba 0209', 'active') returning id`, [`p0209-${hex().slice(0, 8)}`])).id;
  const staffU = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Uno') returning id::text`, [await tel()])).id;
  const staffV = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Dos') returning id::text`, [await tel()])).id;
  for (const s of [staffU, staffV]) await db.query(`insert into staff_members (user_id, role, status) values ($1, 'admin', 'active') on conflict (user_id) do update set role = 'admin', status = 'active'`, [s]);
  const S = { id: staffU, role: 'admin', cities: [] }, S2 = { id: staffV, role: 'admin', cities: [] };
  const filaAlerta = async (kind, sujeto) => (await alertas.alertasDinero(S, false, null, 300)).filas.find((a) => a.kind === kind && a.sujeto === String(sujeto));
  let NUM = Number(String(Date.now()).slice(-6)) * 10 + 2;
  // Un evento cancelado con una fecha, y una orden de boletos pagada en la app (cobro de la plataforma: transfer_group), con su cancelación.
  async function ordenBoletos(monto = 5000, fee = 500) {
    return crudo(async (k) => {
      const e = (await k.query(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, approved_at)
                                 values ($1, 'hzl', $2, 'noche', '{"es":"Prueba 0209","en":"Test 0209"}'::jsonb, current_date + 10, 1200, 1320, 'tickets', 'cancelled', now()) returning id::text`, [`p0209-${hex()}`, b])).rows[0].id;
      const fid = (await k.query(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date) values ($1::bigint, 'hzl', now() + interval '10 days', now() + interval '10 days 2 hours', now() + interval '10 days', current_date + 10) returning id::text`, [e])).rows[0].id;
      const num = `B-${++NUM}`;
      const op = (await k.query(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, total_cents, subtotal_cents, details)
                                  values ($1, 'tickets', 'hzl', $2, $3, 'app', gen_random_uuid(), 'confirmed', $4, $4, jsonb_build_object('event_date_id', $5::bigint, 'event_id', $6::bigint)) returning id::text`, [num, b, u, monto, fid, e])).rows[0].id;
      const pi = `pi_fake_0209_${hex()}`;
      const p = (await k.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, captured_at, transfer_group)
                                 values ($1::bigint, $2, $3, 'hzl', 'full', 'card', $4, $5, $6, 'captured', now(), $7) returning id::text`, [op, u, b, pi, monto, fee, `evt-${e}`])).rows[0].id;
      const cx = (await k.query(`insert into event_cancellations (event_id, event_date_id, business_id, city_id, scope, reason_key, by_kind, status) values ($1::bigint, $2::bigint, $3, 'hzl', 'date', 'clima', 'business', 'done') returning id::text`, [e, fid, b])).rows[0].id;
      return { e, fid, op, p, pi, num, cx };
    });
  }
  // Una devolución de boletos por la cancelación (el organizador: la comisión se cede), hecha en Stripe y después dada por fallida (webhook): la alerta.
  async function fallida(O, monto = 2000, cede = 300) {
    const idem = `evtcx-${O.cx}-${O.op}`;
    const rf = (await q1(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key, fee_absorbed_by) values ($1::bigint, $2, 'Evento cancelado', 'event_cancelled', 'pending', $3, 'platform') returning id::text`, [O.p, monto, idem])).id;
    const l = (await q1(`insert into operation_lines (operation_id, name, qty, unit_price_cents, line_total_cents) values ($1::bigint, '{"es":"Extra","en":"Extra"}'::jsonb, 1, $2, $2) returning id::text`, [O.op, monto])).id;
    await db.query(`insert into ticket_refund_lines (refund_id, operation_id, line_id, city_id, amount_cents, fee_kept_cents, fee_waived_cents) values ($1::bigint, $2::bigint, $3::bigint, 'hzl', $4, 0, $5)`, [rf, O.op, l, monto, cede]);
    await db.query(`update event_cancellations set refunded_cents = refunded_cents + $2 where id = $1::bigint`, [O.cx, monto]);
    const re = `re_fake_0209_orig_${hex()}`;
    await BO.cerrarDevolucionBoletos(rf, re);
    await cobros.devolucionFallidaEnStripe(re, 'expired_or_canceled_card', monto);
    return { rf, re };
  }

  console.log('1 · «Devolver otra vez» unos boletos desde su alerta');
  {
    const O = await ordenBoletos();
    const L0 = await liq(O.fid);
    const F = await fallida(O);
    const L1 = await liq(O.fid), a = await idAlerta('refund_failed', F.rf), fila = await filaAlerta('refund_failed', F.rf);
    ok((await refund(F.rf)).st === 'failed' && (await pago(O.p)).dev === 0 && L1.fee === 500 && L1.refunded === 0 && await cancelada(O.cx) === 0,
      `la fallida: su saldo vuelve al cobro, la comisión cedida y lo de la cancelación dejan de contar (comisión ${L0.fee}→${L1.fee}, devuelto ${L1.refunded})`);
    ok(!!a && fila?.otraVez === 2000, `el servidor ofrece «Devolver otra vez» por lo mismo que falló (${fila?.otraVez})`);
    const llave = `bol-otra-${F.rf}`;
    const n0 = avisados.length;
    const [r1, r2] = await Promise.all([alertas.devolverOtraVez(S, a, 'Hablé con la persona.'), alertas.devolverOtraVez(S2, a, 'Lo veo yo también.')]);
    const N = await otraDe(F.rf), L2 = await liq(O.fid);
    ok(r1.ok && r2.ok && N?.st === 'done' && N.amt === 2000 && N.lineas === F.rf && N.k === llave && P.llamadasCon(llave) === 1 && await n1(`select count(*)::int as n from refunds where retry_of = $1::bigint`, [F.rf]) === 1,
      `dos personas a la vez: UNA devolución (la misma llave, una llamada a Stripe) y hecha (${r1.msg} | ${r2.msg})`);
    ok((await pago(O.p)).dev === 2000 && L2.refunded === 2000 && L2.fee === 200 && await cancelada(O.cx) === 2000,
      `el libro: lo devuelto del cobro, la comisión cedida (${L2.fee}) y lo de la cancelación (${await cancelada(O.cx)}) vuelven a contar, una vez`);
    ok(await auditadas('dinero.alerta.devolver_otra_vez', a) === 1 && /Hablé con la persona|Lo veo yo también/.test((await q1(`select reason from audit_entries where action = 'dinero.alerta.devolver_otra_vez' and target_id = $1`, [a])).reason),
      'una sola auditoría, con quién y por qué');
    ok(avisados.slice(n0).filter((x) => x[2] === 'pay_refund').length === 1 && avisados.slice(n0).find((x) => x[2] === 'pay_refund')?.[3]?.num === O.num, 'la persona recibe su aviso de devolución, una vez, con su orden');
    ok(await ultNota(a) === 'resuelta_sola' && (await filaAlerta('refund_failed', F.rf))?.estado === 'resuelta' && (await filaAlerta('refund_failed', F.rf))?.otraVez == null, `la alerta de antes se cierra sola (${await ultNota(a)})`);
    const r3 = await alertas.devolverOtraVez(S, a, 'Otra vez, por si acaso.');
    ok(r3.ok && P.llamadasCon(llave) === 1 && (await pago(O.p)).dev === 2000 && await auditadas('dinero.alerta.devolver_otra_vez', a) === 1, `el mismo toque otra vez no devuelve más (${r3.msg})`);
  }

  console.log('2 · Lo que dice Stripe de la de otra vez');
  {
    const O = await ordenBoletos();
    const F = await fallida(O);
    const a = await idAlerta('refund_failed', F.rf);
    P.para = `bol-otra-${F.rf}`; P.plan = ['no'];
    const r = await alertas.devolverOtraVez(S, a, 'Hablé con la persona.');
    P.para = null;
    const N = await otraDe(F.rf);
    const aN = await idAlerta('refund_failed', N.id), filaN = await filaAlerta('refund_failed', N.id);
    ok(!r.ok && N.st === 'failed' && !!aN && /otra vez/.test(await detalleDe('refund_failed', N.id)) && await ultNota(a) === 'reabierta' && (await pago(O.p)).dev === 0 && await cancelada(O.cx) === 0,
      `Stripe dice que no: queda fallida con SU alerta, la de antes se reabre y el libro no la cuenta (${r.msg} · ${N.st} · ${!!aN} · ${await ultNota(a)} · ${(await pago(O.p)).dev} · ${await cancelada(O.cx)})`);
    ok(filaN?.otraVez === 2000 && (await filaAlerta('refund_failed', F.rf))?.otraVez == null, 'se devuelve otra vez desde la alerta nueva (la de antes ya no lo ofrece)');
    const r2 = await alertas.devolverOtraVez(S, aN, 'La persona ya puede recibirla.');
    const N2 = await otraDe(N.id), L = await liq(O.fid);
    ok(r2.ok && N2?.st === 'done' && N2.lineas === F.rf && (await pago(O.p)).dev === 2000 && L.fee === 200 && await cancelada(O.cx) === 2000,
      `la cadena: la tercera sale, guarda los boletos de la primera y la comisión cuenta una vez (${L.fee})`);
  }
  {
    const O = await ordenBoletos();
    const F = await fallida(O);
    const a = await idAlerta('refund_failed', F.rf);
    P.para = `bol-otra-${F.rf}`; P.plan = ['red'];
    const r = await alertas.devolverOtraVez(S, a, 'Hablé con la persona.');
    const N = await otraDe(F.rf);
    ok(r.ok && /en camino/.test(r.msg) && N.st === 'pending' && await ultNota(a) === 'me_hago_cargo', `sin respuesta: en camino, la alerta con dueño (${r.msg})`);
    await crudo((k) => k.query(`update refunds set created_at = created_at - interval '3 minutes' where id = $1::bigint`, [N.id]));
    await cobros.barrerDevolucionesPago();
    P.para = null;
    ok((await otraDe(F.rf)).st === 'done' && P.llamadasCon(`bol-otra-${F.rf}`) === 2 && P.hechas.size > 0 && (await pago(O.p)).dev === 2000 && await ultNota(a) === 'resuelta_sola',
      'el barrido la termina con la MISMA llave y la alerta se cierra');
    const re = (await otraDe(F.rf)).re;
    await cobros.devolucionFallidaEnStripe(re, 'expired_or_canceled_card', 2000);
    const N2 = await otraDe(F.rf);
    ok(N2.st === 'failed' && /Boletos: solo extras/.test(await detalleDe('refund_failed', N2.id)) && await ultNota(a) === 'reabierta' && (await pago(O.p)).dev === 0 && await cancelada(O.cx) === 0,
      `Stripe la da por fallida después: su alerta dice de qué orden y qué boletos, la de antes se reabre y el libro no la cuenta (${N2.st} · ${(await detalleDe('refund_failed', N2.id)).slice(0, 80)} · ${await ultNota(a)} · ${(await pago(O.p)).dev} · ${await cancelada(O.cx)})`);
  }

  console.log('3 · Los límites los pone la base');
  {
    const O = await ordenBoletos();
    const F = await fallida(O);
    const a = await idAlerta('refund_failed', F.rf);
    // Una devolución parcial por otro camino mientras tanto: el cobro ya no alcanza para devolver lo de la fallida.
    const d = await cobros.devolverPago({ paymentId: O.p, centavos: 4000, por: 'admin', actorId: staffU, motivo: 'parcial 0209', idem: `p0209-${hex()}` });
    const r = await alertas.devolverOtraVez(S, a, 'Hablé con la persona.');
    ok(d.ok && (await filaAlerta('refund_failed', F.rf))?.otraVez == null && !r.ok && /saldo|Puedes devolver hasta \$10\.00/.test(r.msg) && !(await otraDe(F.rf)) && (await pago(O.p)).dev === 4000,
      `con una devolución parcial previa, no se ofrece ni se deja: nunca más de lo cobrado menos lo devuelto (${d.ok ? '' : d.msg.es} · ${r.msg} · ${JSON.stringify(await pago(O.p))})`);
    const directo = await falla(() => db.query(`insert into refunds (payment_id, amount_cents, initiated_by, actor_id, status, idem_key, retry_of) values ($1::bigint, 2000, 'admin', $2, 'pending', $3, $4::bigint)`, [O.p, staffU, `x-${hex()}`, F.rf]));
    ok(/devolucion_de_mas/.test(directo), `la base tampoco: ${directo.slice(0, 90)}`);
  }
  {
    const O = await ordenBoletos();
    const F = await fallida(O);
    const ins = (o = {}) => falla(() => db.query(`insert into refunds (payment_id, amount_cents, initiated_by, actor_id, status, idem_key, retry_of) values ($1::bigint, $2, $3, $4, 'pending', $5, $6::bigint)`,
      [o.p ?? O.p, o.n ?? 2000, o.por ?? 'admin', o.actor === undefined ? staffU : o.actor, `x-${hex()}`, o.de ?? F.rf]));
    ok(/otra_vez: del mismo cobro y por el mismo monto/.test(await ins({ n: 1999 })), 'no por otro monto');
    ok(/otra_vez: la pide una persona del equipo/.test(await ins({ por: 'buyer' })) && /otra_vez: la pide una persona del equipo/.test(await ins({ actor: null })), 'no sin una persona del equipo');
    const C = await cobros.devolverPago({ paymentId: O.p, centavos: 100, por: 'admin', actorId: staffU, motivo: 'no boletos', idem: `p0209-${hex()}` });
    const nb = (await q1(`select id::text from refunds where payment_id = $1::bigint and amount_cents = 100`, [O.p])).id;
    ok(C.ok && /otra_vez: solo una devolución que Stripe dio por fallida/.test(await ins({ de: nb, n: 100 })), 'no de una que no falló');
    await db.query(`update refunds set status = 'failed', idem_key = idem_key || '~fallida-' || id where id = $1::bigint`, [nb]);
    ok(/otra_vez: solo devoluciones de boletos/.test(await ins({ de: nb, n: 100 })), 'no de una que no es de boletos (esas se devuelven desde Transacciones)');
    const dis = (await q1(`insert into disputes (stripe_dispute_id, payment_id, operation_id, business_id, city_id, amount_cents, status) values ($1, $2::bigint, $3::bigint, $4, 'hzl', 5000, 'needs_response') returning id::text`, [`dp_fake_0209_${hex()}`, O.p, O.op, b])).id;
    const a = await idAlerta('refund_failed', F.rf);
    const r = await alertas.devolverOtraVez(S, a, 'Hablé con la persona.');
    ok(/otra_vez: el cobro tiene una disputa/.test(await ins()) && !r.ok && /disputa/.test(r.msg) && (await filaAlerta('refund_failed', F.rf))?.otraVez == null, `no con una disputa abierta (${r.msg})`);
    await crudo((k) => k.query(`update disputes set status = 'won' where id = $1::bigint`, [dis]));
    ok(await ins() === '', 'resuelta la disputa a favor, sí');
    ok(/refunds_otra_vez_uq|duplicate key/.test(await ins()), 'una sola por devolución fallida (índice único)');
    ok(/otra_vez: ya se devolvió otra vez/.test(await falla(() => db.query(`update refunds set status = 'done' where id = $1::bigint`, [F.rf]))), 'la fallida que ya tiene la suya sigue fallida');
    ok(/otra_vez: de cuál es no cambia/.test(await falla(() => db.query(`update refunds set retry_of = null where retry_of = $1::bigint`, [F.rf]))), 'de cuál es no cambia');
  }

  console.log('4 · La carrera de «Resolver a mano» mientras el barrido la manda (orden controlado)');
  const carrera = async () => {
    // Una devolución de un cobro que Stripe no contestó: en camino, ya intentada (la base deja resolverla a mano), con su alerta; su último envío, hace 15 min.
    const O = await crudo(async (k) => {
      const num = String(++NUM);
      const op = (await k.query(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, total_cents, subtotal_cents, details) values ($1, 'order', 'hzl', $2, $3, 'app', gen_random_uuid(), 'confirmed', 5000, 5000, '{}'::jsonb) returning id::text`, [num, b, u])).rows[0].id;
      const p = (await k.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, captured_at) values ($1::bigint, $2, $3, 'hzl', 'full', 'card', $4, 5000, 500, 'captured', now()) returning id::text`, [op, u, b, `pi_fake_0209_c_${hex()}`])).rows[0].id;
      return { op, p };
    });
    const k = `c0209-${hex()}`;
    P.para = k; P.plan = ['red'];
    await cobros.devolverPago({ paymentId: O.p, centavos: 1500, por: 'admin', actorId: staffU, motivo: 'carrera', idem: k });
    const id = (await q1(`select id::text from refunds where idem_key = $1`, [k])).id;
    await crudo((x) => x.query(`update refunds set created_at = created_at - interval '20 minutes', sent_at = sent_at - interval '20 minutes', last_sent_at = last_sent_at - interval '15 minutes' where id = $1::bigint`, [id]));
    await alertas.alertar('refund_stuck', id, { monto: 1500, negocio: b, ciudad: 'hzl', detalle: { es: 'Devolución sin respuesta (prueba 0209)', en: 'Refund with no answer (test 0209)' } });
    const a = await idAlerta('refund_stuck', id);
    ok((await filaAlerta('refund_stuck', id))?.aMano === true, 'antes del envío, la fila ofrece «Resolver a mano»');
    // (1) El barrido la manda otra vez y la pasarela se detiene ANTES de que Stripe la registre.
    let soltar; const freno = new Promise((r) => { soltar = r; });
    const llego = new Promise((r) => { P.enFreno = r; });
    P.freno = freno;
    const envio = cobros.ejecutarDevolucionPago(id, { barrido: true });
    await llego;
    ok((await filaAlerta('refund_stuck', id))?.aMano === false, 'mientras va a Stripe, la fila ya no ofrece «Resolver a mano»');
    // (2) «Resolver a mano»: pregunta a Stripe (todavía no la muestra) e intenta marcarla.
    const m = await alertas.notaAlerta(S, a, 'resuelta_a_mano', 'Se le mandó un cheque al cliente.');
    // (3) Stripe contesta: la devolución salió.
    soltar();
    const e = await envio;
    const R = await refund(id);
    return { m, e, R, id, p: O.p };
  };
  {
    const C = await carrera();
    ok(!C.m.ok && /menos de 10 minutos/.test(C.m.msg), `la base no deja marcarla a mano recién mandada (${C.m.msg ?? 'sí la dejó'})`);
    ok(C.e.ok && C.R.st === 'done' && !C.R.mano && (await pago(C.p)).dev === 1500, `Stripe contesta y queda hecha una vez, sin marca a mano (no se paga dos veces) (${C.R.st}, a mano: ${C.R.mano})`);
  }
  {
    // Pasados los minutos sin envío, sí se deja (y antes pregunta: Stripe no la tiene).
    const O = await crudo(async (k) => {
      const op = (await k.query(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, total_cents, subtotal_cents, details) values ($1, 'order', 'hzl', $2, $3, 'app', gen_random_uuid(), 'confirmed', 5000, 5000, '{}'::jsonb) returning id::text`, [String(++NUM), b, u])).rows[0].id;
      return (await k.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, captured_at) values ($1::bigint, $2, $3, 'hzl', 'full', 'card', $4, 5000, 500, 'captured', now()) returning id::text`, [op, u, b, `pi_fake_0209_d_${hex()}`])).rows[0].id;
    });
    const k = `d0209-${hex()}`;
    P.para = k; P.plan = ['red'];
    await cobros.devolverPago({ paymentId: O, centavos: 700, por: 'admin', actorId: staffU, motivo: 'sin carrera', idem: k });
    P.para = null;
    const id = (await q1(`select id::text from refunds where idem_key = $1`, [k])).id;
    await alertas.alertar('refund_stuck', id, { monto: 700, negocio: b, ciudad: 'hzl', detalle: { es: 'Devolución sin respuesta (prueba 0209)', en: 'Refund with no answer (test 0209)' } });
    const a = await idAlerta('refund_stuck', id);
    const m1 = await alertas.notaAlerta(S, a, 'resuelta_a_mano', 'Se le mandó un cheque al cliente.');
    ok(!m1.ok && /menos de 10 minutos/.test(m1.msg) && !(await refund(id)).mano, `recién mandada (por quien la pidió): tampoco (${m1.msg})`);
    await crudo((x) => x.query(`update refunds set last_sent_at = last_sent_at - interval '11 minutes' where id = $1::bigint`, [id]));
    const m2 = await alertas.notaAlerta(S, a, 'resuelta_a_mano', 'Se le mandó un cheque al cliente.');
    ok(m2.ok && (await refund(id)).mano, 'pasados los minutos, sí (antes le preguntó a Stripe y no la tiene)');
    ok(/dinero_envio/.test(await falla(() => db.query(`update refunds set last_sent_at = now() where id = $1::bigint`, [id]))), 'el último envío no se anota sobre una resuelta a mano');
  }

  console.log('5 · (d) La devolución de un patrocinio: primero «sin respuesta», después fallida');
  {
    const id = (await crudo((k) => k.query(`insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, auto_renew)
                                             values ($1, 'NEG-BELL', 'hzl', now() + interval '1 day', now() + interval '8 days', 'week', 'reservado', 1500, $2, false) returning id::text`, [b, u]))).rows[0].id;
    const pi = `pi_fake_0209_p_${hex()}`;
    await db.query(`insert into sponsorship_payments (kind, ref_id, business_id, city_id, payer_user_id, amount_cents, pi, idem_key, card_brand, card_last4, reason) values ('negocio', $1::bigint, $2, 'hzl', $3, 1500, $4, $5, 'visa', '4242', 'compra')`,
      [id, b, u, pi, `pat-negocio-${b}-${crypto.randomUUID()}`]);
    P.para = `pat-dev-negocio-${id}`; P.plan = ['red'];
    P.caida = true;
    await PA.terminarPorAdmin(staffU, [], id, 'Prueba 0209', true);
    const z = (await q1(`select id::text from sponsorship_refunds where kind = 'negocio' and ref_id = $1::bigint`, [id])).id;
    const suj = `sponsorship_refunds:${z}`;
    // Pasada la llave: la consulta no la halla todavía (antes del margen) → la alerta «sin respuesta».
    await crudo((k) => k.query(`update sponsorship_refunds set created_at = created_at - interval '1440 minutes', sent_at = sent_at - interval '1440 minutes', last_sent_at = last_sent_at - interval '1440 minutes' where id = $1::bigint`, [z]));
    await PA.resolverDevolucionPat(z, { origen: 'barrido' });
    const d0 = await detalleDe('refund_stuck', suj);
    ok(/sin respuesta/.test(d0) && (await filaAlerta('refund_stuck', suj))?.fallo == null, 'primero: la alerta dice «sin respuesta» y la fila no dice fallida');
    // Después: Stripe la tiene como fallida.
    P.caida = false;
    P.stripe.set(suj, [{ id: `re_fake_0209_pf_${hex()}`, estado: 'fallido', centavos: 1500 }]);
    await crudo((k) => k.query(`update gateway_checks set at = at - interval '60 minutes' where subject_kind = 'sponsorship_refunds' and subject_id = $1::bigint`, [z]));
    await PA.resolverDevolucionPat(z, { origen: 'barrido' });
    const f = await filaAlerta('refund_stuck', suj);
    ok((await q1(`select status from sponsorship_refunds where id = $1::bigint`, [z])).status === 'failed' && /sin respuesta/.test(await detalleDe('refund_stuck', suj)),
      'después: queda fallida y el texto de la alerta sigue siendo el primero (money_alerts es de una vez)');
    ok(!!f?.fallo?.at && f.fallo.codigo === null && f.consulta?.resultado === 'fallido' && f.aMano === true && f.estado === 'abierta',
      `la fila dice lo último que dijo Stripe (fallida, ${f?.fallo?.at}) y ofrece «Resolver a mano»`);
    ok(/pat_dev: failed_at lo pone la base/.test(await falla(() => db.query(`update sponsorship_refunds set failed_at = now() - interval '1 day' where id = $1::bigint`, [z]))), 'cuándo falló lo pone la base y no cambia');
    const a = await idAlerta('refund_stuck', suj);
    const m = await alertas.notaAlerta(S, a, 'resuelta_a_mano', 'Se le devolvió por transferencia bancaria; comprobante en el caso.');
    const f2 = await filaAlerta('refund_stuck', suj);
    ok(m.ok && (await q1(`select manual_at is not null as mano from sponsorship_refunds where id = $1::bigint`, [z])).mano && f2?.fallo == null && f2?.aMano === false && f2?.estado === 'resuelta',
      `«Resolver a mano» la cierra (después de preguntarle a Stripe) (${m.msg ?? 'ok'})`);
    // Para la prueba de navegador (din9t10b): otra igual, abierta, con su número de patrocinio en el texto.
  }

  console.log(`\n${checks - fallas}/${checks} comprobaciones`);
  await db.end();
  process.exit(fallas ? 1 : 0);
})().catch(async (e) => { console.error(e); try { await db.end(); } catch { /* nada */ } process.exit(1); });
