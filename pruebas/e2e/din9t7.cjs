// 9t7 (21 nov) · Dinero, séptima tanda (LAUNCH «Preguntarle a la pasarela, lo que quedó de 9t6»): las devoluciones de un cobro (las de lib/cobros y las de
// boletos), las reversiones al organizador y la devolución de lo que sobró le preguntan a la pasarela. «Sin respuesta» no es «rechazado», y lo que una
// persona cierra el servidor lo comprueba con la pasarela. Contra la base de pruebas y con una pasarela de mentira (sin servidor), con los archivos REALES de
// apps/web (cobros, boletos-despues, evt-liquidacion, devolucion-consulta, consulta-pasarela, revision-pasarela, dinero-alertas), transpilados con
// pruebas/lib/ts-servidor.cjs. La misma armazón que din9t6.
//   1. Devolución de un cobro: sin respuesta dentro de la ventana (anotada antes, con su dato; la misma llave la termina); pasada la llave: salió y la
//      respuesta se perdió (la consulta la cierra, sin otra llamada), fallida (como un «no»: alerta), no hallada antes del margen (sigue, alerta una vez) y
//      después (la MISMA devolución vuelve a valer con OTRA llave y sale una vez), nunca llegó con el cobro cambiado (fallida, no se vuelve a mandar), varias
//      (gateway_review: «Elegir cuál vale», solo vale), otro monto (sin «Elegir»; se resuelve a mano), la consulta caída (no cambia nada).
//   2. «Resolver a mano»: Stripe dice que sí salió (se cierra como hecha, no a mano), que no la tiene (se marca), sin contestar (no cambia nada); dos personas
//      a la vez (una sola vez); «Preguntar a Stripe ahora».
//   3. Una devolución anotada antes de 0206 (sin el dato): nunca se da por «no llegó» ni se pregunta en el barrido; solo alerta.
//   4. Boletos: fallida por la consulta (el libro coherente y la alerta con los boletos) y salió (el mismo cierre); nunca llegó (otra llave).
//   5. Reversión al organizador: anotada con su dato; nunca llegó (otra llave); salió y se perdió; «Resolver a mano» con Stripe diciendo que salió.
//   6. La devolución de lo que sobró: «Resolver a mano» con un «no» de Stripe (se marca) y con Stripe diciendo que salió (se cierra como hecha).
//   7. La base: el dato se anota una vez; la llave vuelve a valer solo pasada la ventana; una decisión sobre una devolución es solo «vale».
// Uso: DATABASE_URL=… node pruebas/e2e/din9t7.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
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
const avisos = { avisar: async () => undefined, avisarMuchos: async () => undefined, avisarNegocio: async () => undefined };
const auditarStaff = async (c, a) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, after, reason) values ('staff', $1, $2, $3, $4, $5, $6)`,
  [a.actor, a.action, a.targetKind, a.targetId ?? null, JSON.stringify(a.after ?? null), a.reason ?? null]);
// La pasarela de mentira: una vez por llave (como Stripe con Idempotency-Key), guarda la metadata y contesta la consulta como Stripe (las devoluciones de ESE
// cobro o las reversiones de ESA transferencia, por su metadata tl_intencion). `stripe`: lo que la consulta encuentra para una intención, en lugar de lo hecho.
const P = {
  modo: () => 'simulador', hechas: new Map(), plan: [], para: null, stripe: new Map(), caida: false, idems: [], consultas: 0,
  paso(idem) { return this.plan.length && (!this.para || idem.startsWith(this.para)) ? this.plan.shift() : 'ok'; },
  dev(objeto, n, idem, meta, pre) {
    this.idems.push(idem);
    const paso = this.paso(idem);
    if (paso === 'red') return { ok: false, codigo: 'red' };
    if (paso === 'no') return { ok: false, codigo: 'charge_disputed' };
    if (!this.hechas.has(idem)) this.hechas.set(idem, { id: `${pre}_fake_9t7_${hex()}`, objeto, n, meta: { ...(meta ?? {}) } });
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'red' };
    return { ok: true, id: this.hechas.get(idem).id };
  },
  async devolver(pi, n, idem, o = {}) { return this.dev(pi, n, idem, o.meta, 're'); },
  async revertirTransferencia(tr, n, idem, meta) { return this.dev(tr, n, idem, meta, 'trr'); },
  async buscarDevolucion(ref, medio, objeto) {
    this.consultas++;
    if (this.caida) return { ok: false };
    const H = this.stripe.get(ref) ?? [...this.hechas.values()].filter((d) => d.objeto === objeto && d.meta.tl_intencion === ref).map((d) => ({ id: d.id, estado: 'hecho', centavos: d.n }));
    return H.length > 1 ? { ok: true, varios: H } : { ok: true, hallado: H[0] ?? null };
  },
  buscarCobro: async () => ({ ok: false }), buscarTransferencia: async () => ({ ok: false }), liberar: async () => ({ ok: true }), cliente: async () => null, intento: async () => null,
  llamadasCon(k) { return this.idems.filter((x) => x === k).length; },
  conDato(ref) { return [...this.hechas.values()].filter((d) => d.meta.tl_intencion === ref); },
};
const K = {}, DC = {}, LQ = {}, RV = {}, BO = {};
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: auditarStaff }, './consulta-pasarela': K, './devolucion-consulta': DC,
  './evt-liquidacion': LQ, './revision-pasarela': RV, './cobro-fuera': {}, './suscripcion': {}, './renovar-retencion': {} });
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC });
Object.assign(K, cargar('apps/web/lib/consulta-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas }));
const evtComun = { bi: (x) => x?.es ?? '', diaCorto: () => '', dinero: (c) => `$${(c / 100).toFixed(2)}`, hora: () => '', cuandoBi: () => ({ es: '', en: '' }) };
Object.assign(BO, cargar('apps/web/lib/boletos-despues.ts', { './config': { cfgSql: () => '0', valores: async () => ({}) }, './cuenta': { normalizarTelefono: (x) => x }, './db': D, './evt-comun': evtComun,
  './pagos/pasarela': { pasarela: P }, './pases/pronto': { pasesPronto: () => undefined }, './cobros': cobros, './devolucion-consulta': DC, './consulta-pasarela': K, './dinero-alertas': alertas }));
Object.assign(LQ, cargar('apps/web/lib/evt-liquidacion.ts', { './config': { cfgSql: () => '7', valor: async () => 2 }, './db': D, './evt-comun': evtComun, './pagos/pasarela': { pasarela: P },
  './cobros': cobros, './dinero-alertas': alertas, './avisos': avisos, './consulta-pasarela': K }));
Object.assign(DC, cargar('apps/web/lib/devolucion-consulta.ts', { './db': D, './cobros': cobros, './consulta-pasarela': K, './boletos-despues': BO, './evt-liquidacion': LQ, './revision-pasarela': RV,
  './admin': { auditar: auditarStaff } }));
Object.assign(RV, cargar('apps/web/lib/revision-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './cobro-fuera': { SIN_RESPUESTA: new Set(['red', 'api_error', 'error']) },
  './dinero-alertas': alertas, './admin': { auditar: auditarStaff }, './consulta-pasarela': K, './suscripcion': {}, './evt-liquidacion': LQ, './renovar-retencion': {}, './devolucion-consulta': DC }));

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
const n1 = async (s, v = []) => Number((await q1(s, v)).n);
// Lo que la app nunca escribe así (filas «de otro día»): con los triggers apagados en ESTA conexión y vueltos a encender antes de soltarla.
async function crudo(fn) {
  const k = await db.connect();
  try { await k.query('set session_replication_role = replica'); return await fn(k); } finally { await k.query('set session_replication_role = default').catch(() => undefined); k.release(); }
}
// «Hace N minutos» (0209: también el último envío, como lo deja la app): la devolución (anotada y mandada, y su llave si volvió a valer) y sus consultas.
const envejecer = (t, id, min) => crudo(async (k) => {
  if (t === 'refunds') await k.query(`update refunds set created_at = created_at - make_interval(mins => $2::int), sent_at = sent_at - make_interval(mins => $2::int), last_sent_at = last_sent_at - make_interval(mins => $2::int), key_from = key_from - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]);
  if (t === 'event_settlement_reversals') await k.query(`update event_settlement_reversals set created_at = created_at - make_interval(mins => $2::int), sent_at = sent_at - make_interval(mins => $2::int), last_sent_at = last_sent_at - make_interval(mins => $2::int), key_from = key_from - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]);
  if (t === 'gateway_refunds') await k.query(`update gateway_refunds set created_at = created_at - make_interval(mins => $2::int), sent_at = sent_at - make_interval(mins => $2::int), last_sent_at = last_sent_at - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]);
  await k.query(`update gateway_checks set at = at - make_interval(mins => $2::int) where subject_kind = $3 and subject_id = $1::bigint`, [id, min, t]);
});
const devDe = (k) => q1(`select id::text, status as st, gateway_ref as gref, sent_at is not null as mandada, key_n::int as kn, key_from is not null as reabierta, stripe_refund_id as re, last_error as err, idem_key as k, manual_at is not null as mano, attempts::int as n from refunds where idem_key = $1 or idem_key like $1 || '~fallida-%'`, [k]);
const pago = (id) => q1(`select refunded_cents::int as dev, status from payments where id = $1::bigint`, [id]);
const alertasDe = (kind, sujeto) => n1(`select count(*)::int as n from money_alerts where kind = $1 and subject_id = $2`, [kind, String(sujeto)]);
const idAlerta = async (kind, sujeto) => (await q1(`select id::text from money_alerts where kind = $1 and subject_id = $2`, [kind, String(sujeto)]))?.id;
const detalleDe = async (kind, sujeto) => (await q1(`select detail->>'es' as d from money_alerts where kind = $1 and subject_id = $2`, [kind, String(sujeto)]))?.d ?? '';
const cerradaSola = (kind, sujeto) => n1(`select count(*)::int as n from money_alert_notes n join money_alerts a on a.id = n.alert_id where a.kind = $1 and a.subject_id = $2 and n.action = 'resuelta_sola'`, [kind, String(sujeto)]);
const consultasDe = (t, id) => n1(`select count(*)::int as n from gateway_checks where subject_kind = $1 and subject_id = $2::bigint`, [t, id]);
const auditadas = (accion, id, tipo) => n1(`select count(*)::int as n from audit_entries where action = $1 and target_id = $2 and target_kind = $3`, [accion, String(id), tipo]);
async function tel() {
  for (let i = 0; i < 500; i++) {
    const t = `+1570555${String(crypto.randomInt(10000)).padStart(4, '0')}`;
    if (!esFijo(t) && !(await db.query(`select 1 from users where phone = $1`, [t])).rowCount) return t;
  }
  throw new Error('no quedó un +1570555xxxx libre');
}
async function datos() {
  const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Septima') returning id::text`, [await tel()])).id;
  const b = (await q1(`insert into businesses (id, city_id, category_id, name) values ($1, 'hzl', 'NEG-FOOD', 'Prueba 9t7') returning id`, [`p9w-${hex().slice(0, 8)}`])).id;
  return { u, b };
}
let NUM = Number(String(Date.now()).slice(-6)) * 10 + 7;
async function cobro(X, monto = 5000, o = {}) {
  const num = String(++NUM);
  const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, total_cents, subtotal_cents, details) values ($1, 'order', 'hzl', $2, $3, 'app', gen_random_uuid(), 'confirmed', $4, $4, '{}'::jsonb) returning id::text`,
    [num, X.b, X.u, monto])).id;
  const pi = `pi_fake_9t7_${num}_${hex()}`;
  const p = (await q1(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, captured_at, transfer_group)
                         values ($1::bigint, $2, $3, 'hzl', 'full', 'card', $4, $5, 500, 'captured', now(), $6) returning id::text`, [op, X.u, X.b, pi, monto, o.grupo ?? null])).id;
  return { op, p, pi, num };
}
const devolver = (c, n, k) => cobros.devolverPago({ paymentId: c.p, centavos: n, por: 'admin', actorId: null, motivo: 'prueba 9t7', idem: k });
// Una devolución de boletos (con su línea: así la reconoce el barrido de boletos).
async function devBoletos(c, monto, k) {
  const rf = (await q1(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key) values ($1::bigint, $2, 'boletos', 'buyer', 'pending', $3) returning id::text`, [c.p, monto, k])).id;
  const l = (await q1(`insert into operation_lines (operation_id, name, qty, unit_price_cents, line_total_cents) values ($1::bigint, '{"es":"Extra","en":"Extra"}'::jsonb, 1, $2, $2) returning id::text`, [c.op, monto])).id;
  await db.query(`insert into ticket_refund_lines (refund_id, operation_id, line_id, city_id, amount_cents) values ($1::bigint, $2::bigint, $3::bigint, 'hzl', $4)`, [rf, c.op, l, monto]);
  return rf;
}
// Una liquidación de un evento ya pagada con su transferencia (para revertir de ella).
let EV = 0;
async function liquidacionPagada(biz, net) {
  return crudo(async (k) => {
    const e = (await k.query(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, approved_at)
                               values ($1, 'hzl', $2, 'noche', '{"es":"Prueba 9t7","en":"Test 9t7"}'::jsonb, current_date - 10, 1200, 1320, 'tickets', 'done', now()) returning id::text`, [`p9w-${hex()}-${++EV}`, biz])).rows[0].id;
    const f = (await k.query(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date) values ($1::bigint, 'hzl', now() - interval '10 days', now() - interval '10 days' + interval '2 hours', now() - interval '10 days', current_date - 10) returning id::text`, [e])).rows[0].id;
    const tr = `tr_fake_9t7_${hex()}`;
    const id = (await k.query(`insert into event_settlements (event_date_id, event_id, business_id, city_id, pay_on, status, idem_key, gross_cents, base_cents, net_cents, destination, paying_at, transfer_id, paid_at)
                                values ($1::bigint, $2::bigint, $3, 'hzl', current_date - 3, 'paid', 'evt-liq-' || $1, $4, $4, $4, 'acct_fake_9t7', now() - interval '2 days', $5, now() - interval '2 days') returning id::text`, [f, e, biz, net, tr])).rows[0].id;
    return { id, tr };
  });
}
async function reversion(L, n) {
  const k = `evt-rev-${L.id}-${crypto.randomInt(1, 999999)}`;
  const id = (await q1(`insert into event_settlement_reversals (settlement_id, business_id, city_id, amount_cents, idem_key) values ($1::bigint, '', '', $2, $3) returning id::text`, [L.id, n, k])).id;
  await crudo((x) => x.query(`update event_settlement_reversals set created_at = created_at - interval '2 minutes' where id = $1::bigint`, [id]));
  return { id, k };
}
const revDe = (id) => q1(`select status as st, gateway_ref as gref, sent_at is not null as mandada, key_n::int as kn, stripe_reversal_id as trr, manual_at is not null as mano from event_settlement_reversals where id = $1::bigint`, [id]);

(async () => {
  const X = await datos();
  const staffU = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Dinero') returning id::text`, [await tel()])).id;
  const staffV = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Dos') returning id::text`, [await tel()])).id;
  for (const s of [staffU, staffV]) await db.query(`insert into staff_members (user_id, role, status) values ($1, 'admin', 'active') on conflict (user_id) do update set role = 'admin', status = 'active'`, [s]);
  const S = { id: staffU, role: 'admin', cities: [] }, S2 = { id: staffV, role: 'admin', cities: [] };
  const filaAlerta = async (kind, sujeto) => (await alertas.alertasDinero(S, false, null, 300)).filas.find((a) => a.kind === kind && a.sujeto === String(sujeto));
  // Una devolución de un cobro que Stripe no contestó, pasada la llave (`min` minutos desde que se anotó y se mandó); `paso`: lo que hizo la pasarela.
  async function vieja(paso, min = 25 * 60, monto = 900) {
    const c = await cobro(X), k = `t9w-${hex()}`;
    P.para = k; P.plan = [paso];
    await devolver(c, monto, k);
    const f = await devDe(k);
    await envejecer('refunds', f.id, min);
    return { c, k, f, ref: `refunds:${f.id}` };
  }

  console.log('1 · Devolución de un cobro: «sin respuesta» no es «rechazado»');
  {
    const c = await cobro(X), k = `t9w-${hex()}`;
    P.para = k; P.plan = ['red'];
    const r = await devolver(c, 1500, k);
    let f = await devDe(k);
    ok(!r.ok && r.enCamino && f.st === 'pending' && f.mandada && f.gref === `refunds:${f.id}` && f.n === 1, `sin respuesta dentro de la ventana: en camino, anotada antes con su dato buscable (${f.st}, ${f.gref})`);
    await envejecer('refunds', f.id, 3);
    await cobros.barrerDevolucionesPago();
    f = await devDe(k);
    const hecha = P.hechas.get(k);
    ok(f.st === 'done' && f.re === hecha?.id && P.llamadasCon(k) === 2 && hecha?.meta.tl_intencion === `refunds:${f.id}` && (await pago(c.p)).dev === 1500,
      `el barrido la termina con la MISMA llave, una vez, y la devolución lleva su dato (tl_intencion) (${f.st}, ${P.llamadasCon(k)} llamadas)`);
  }
  {
    const V = await vieja('red-pero-hizo');
    const n0 = P.llamadasCon(V.k);
    await cobros.barrerDevolucionesPago();
    const f = await devDe(V.k);
    ok(f.st === 'done' && f.re === P.hechas.get(V.k).id && P.llamadasCon(V.k) === n0 && (await pago(V.c.p)).dev === 900 && await auditadas('dinero.consulta.cerrar', f.id, 'refunds') === 1,
      `salió y la respuesta se perdió: pasada la llave no se manda otra vez; la consulta la encuentra y se cierra por el mismo cierre, una vez (${f.st})`);
    await cobros.barrerDevolucionesPago();
    ok((await pago(V.c.p)).dev === 900 && await auditadas('dinero.consulta.cerrar', f.id, 'refunds') === 1, 'otra vuelta no la cuenta dos veces');
  }
  {
    const V = await vieja('red');
    P.stripe.set(V.ref, [{ id: `re_fake_9t7_f_${hex()}`, estado: 'fallido', centavos: 900 }]);
    await cobros.barrerDevolucionesPago();
    const f = await devDe(V.k);
    ok(f.st === 'failed' && /~fallida-/.test(f.k) && (await pago(V.c.p)).dev === 0 && await alertasDe('refund_failed', f.id) === 1 && /fallida/.test(await detalleDe('refund_failed', f.id)) && P.llamadasCon(V.k) === 1,
      `Stripe la tiene como fallida: queda fallida (su llave y su saldo libres, como un «no») y una alerta (${f.st})`);
  }
  {
    // No hallada ANTES del margen (23 h 30 min desde que se mandó): sigue, una alerta, nada se manda.
    const V = await vieja('red', 23 * 60 + 30);
    await cobros.barrerDevolucionesPago();
    let f = await devDe(V.k);
    ok(f.st === 'pending' && f.kn === 0 && P.llamadasCon(V.k) === 1 && await alertasDe('refund_stuck', f.id) === 1 && /pregunta a Stripe/.test(await detalleDe('refund_stuck', f.id)) && await consultasDe('refunds', f.id) === 1,
      `no hallada antes del margen: sigue en camino, sin otra llamada, y UNA alerta que dice que el servidor sigue preguntando (${f.st})`);
    await cobros.barrerDevolucionesPago();
    ok(await consultasDe('refunds', f.id) === 1, 'el barrido no vuelve a preguntar antes de CADA_MIN');
    // Pasado el margen: nunca llegó y lo debido sigue igual → la MISMA devolución con OTRA llave, una vez.
    await envejecer('refunds', f.id, 60);
    await cobros.barrerDevolucionesPago();
    f = await devDe(V.k);
    ok(f.st === 'done' && f.kn === 1 && f.reabierta && P.llamadasCon(`${V.k}-r1`) === 1 && P.llamadasCon(V.k) === 1 && P.conDato(V.ref).length === 1 && (await pago(V.c.p)).dev === 900,
      `pasado el margen: nunca llegó; vuelve a valer con OTRA llave (${V.k.slice(0, 8)}…-r1) y sale una vez (${f.st}, key_n ${f.kn})`);
    ok(await cerradaSola('refund_stuck', f.id) === 1, 'y su alerta se cierra sola');
  }
  {
    // Nunca llegó, pero el cobro cambió mientras tanto (se devolvió entero por otro lado): no se vuelve a mandar.
    const V = await vieja('red');
    await crudo((x) => x.query(`update payments set refunded_cents = amount_cents, status = 'refunded' where id = $1::bigint`, [V.c.p]));
    await cobros.barrerDevolucionesPago();
    const f = await devDe(V.k);
    ok(f.st === 'failed' && f.err === 'nunca_llego' && P.llamadasCon(`${V.k}-r1`) === 0 && await alertasDe('refund_failed', f.id) === 1 && /nunca llegó/.test(await detalleDe('refund_failed', f.id)),
      `nunca llegó y lo debido cambió: queda fallida «nunca llegó», no sale otra, y la alerta lo dice (${f.st}, ${f.err})`);
  }
  {
    // Varias en Stripe para una sola devolución: gateway_review; «Elegir cuál vale» (solo vale; lo que salió de más se nombra, no se devuelve).
    const V = await vieja('red');
    const A = `re_fake_9t7_va_${hex()}`, B = `re_fake_9t7_vb_${hex()}`;
    P.stripe.set(V.ref, [{ id: A, estado: 'hecho', centavos: 900 }, { id: B, estado: 'hecho', centavos: 900 }]);
    await cobros.barrerDevolucionesPago();
    let f = await devDe(V.k);
    const al = await idAlerta('gateway_review', V.ref), fila = await filaAlerta('gateway_review', V.ref);
    ok(f.st === 'pending' && !!al && fila?.revisar?.vale.join() === [A, B].join() && fila.revisar.ninguno === false && fila.revisar.devuelve === true && /no se deshace/.test(await detalleDe('gateway_review', V.ref)),
      'varias: no se cierra sola; la alerta ofrece elegir cuál vale (sin «ninguno») y dice que lo de más no se deshace desde aquí');
    const r0 = await RV.decidirRevision(S, al, 'ninguno', 'Ninguna vale.');
    ok(!r0.ok && await n1(`select count(*)::int as n from gateway_reviews where subject_kind = 'refunds' and subject_id = $1::bigint`, [f.id]) === 0, `«ninguno» en una devolución: rechazado («${r0.msg}»)`);
    const [x1, x2] = await Promise.all([RV.decidirRevision(S, al, A, 'Devolución duplicada: vale la primera.'), RV.decidirRevision(S2, al, A, 'Devolución duplicada: vale la primera (otra).')]);
    f = await devDe(V.k);
    ok([x1, x2].filter((x) => x.ok).length === 1 && f.st === 'done' && f.re === A && (await pago(V.c.p)).dev === 900 && await n1(`select count(*)::int as n from gateway_reviews where subject_kind = 'refunds' and subject_id = $1::bigint`, [f.id]) === 1,
      `dos personas a la vez: una decide; la devolución queda hecha con la elegida, una vez (${[x1, x2].map((x) => (x.ok ? 'ok' : x.msg)).join(' | ')})`);
    ok([x1, x2].some((x) => x.ok && x.msg.includes(B) && /no se deshace/.test(x.msg)) && P.llamadasCon(V.k) === 1, 'lo que salió de más se nombra (no se devuelve con otra devolución) y nada se manda');
  }
  {
    // Otro monto: no se elige; la alerta dice que se resuelva a mano, y «Resolver a mano» lo deja (el servidor pregunta antes).
    const V = await vieja('red');
    P.stripe.set(V.ref, [{ id: `re_fake_9t7_m_${hex()}`, estado: 'hecho', centavos: 800 }]);
    await cobros.barrerDevolucionesPago();
    const f = await devDe(V.k), fila = await filaAlerta('gateway_review', V.ref);
    ok(f.st === 'pending' && !!fila && fila.revisar === null && /resuélvela a mano/.test(await detalleDe('gateway_review', V.ref)) && (await filaAlerta('refund_stuck', f.id))?.aMano === true,
      'otro monto: gateway_review sin «Elegir cuál vale», que dice resolverla a mano; la devolución atascada ofrece «Resolver a mano»');
    const r = await alertas.notaAlerta(S, await idAlerta('refund_stuck', f.id), 'resuelta_a_mano', 'Cheque al cliente por la diferencia.');
    ok(r.ok && (await devDe(V.k)).mano, `y se resuelve a mano (${r.ok ? 'ok' : r.msg})`);
  }
  {
    // La consulta no contesta: nada cambia; «Preguntar a Stripe ahora» tampoco cambia nada; cuando contesta, se cierra.
    const V = await vieja('red-pero-hizo');
    P.caida = true;
    await cobros.barrerDevolucionesPago();
    let f = await devDe(V.k);
    const al = await idAlerta('refund_stuck', f.id);
    ok(f.st === 'pending' && f.kn === 0 && !!al && (await q1(`select result from gateway_checks where subject_kind = 'refunds' and subject_id = $1::bigint order by id desc limit 1`, [f.id]))?.result === 'sin_respuesta',
      'la consulta no contesta: sigue en camino, sin otra llave, con su alerta');
    const fila = await filaAlerta('refund_stuck', f.id);
    ok(fila?.preguntar === true && fila.consulta?.resultado === 'sin_respuesta', 'la alerta ofrece «Preguntar a Stripe ahora» y dice qué dijo la última consulta');
    const p1 = await alertas.preguntarPorAlerta(S, al, 'Reviso la alerta de hoy.');
    ok(p1.ok && /no contestó/.test(p1.msg) && (await devDe(V.k)).st === 'pending', `«Preguntar a Stripe ahora» sin respuesta: no cambia nada («${p1.msg}»)`);
    P.caida = false;
    const p2 = await alertas.preguntarPorAlerta(S, al, 'Reviso la alerta de hoy.');
    f = await devDe(V.k);
    ok(p2.ok && /quedó hecha/.test(p2.msg) && f.st === 'done' && f.re === P.hechas.get(V.k).id && await auditadas('dinero.alerta.preguntar', al, 'money_alert') === 2 && await cerradaSola('refund_stuck', f.id) === 1,
      `cuando contesta, «Preguntar a Stripe ahora» la cierra con lo que dijo, con su auditoría, y la alerta se cierra sola («${p2.msg}»)`);
  }

  console.log('2 · «Resolver a mano» le pregunta antes a Stripe');
  {
    // Stripe dice que SÍ salió: se cierra como hecha; no se marca a mano.
    const V = await vieja('red-pero-hizo');
    P.caida = true; await cobros.barrerDevolucionesPago(); P.caida = false;
    const f0 = await devDe(V.k), al = await idAlerta('refund_stuck', f0.id);
    const r = await alertas.notaAlerta(S, al, 'resuelta_a_mano', 'Se le mandó un cheque al cliente.');
    const f = await devDe(V.k);
    ok(r.ok && /sí salió/.test(r.msg) && f.st === 'done' && !f.mano && f.re === P.hechas.get(V.k).id && await n1(`select count(*)::int as n from money_alert_notes where alert_id = $1::bigint and action = 'resuelta_a_mano'`, [al]) === 0,
      `Stripe dice que salió: se cierra como hecha y NO se marca a mano («${r.ok ? r.msg : r.msg}»)`);
    ok((await pago(V.c.p)).dev === 900 && await auditadas('dinero.alerta.preguntar', al, 'money_alert') === 1, 'el libro la cuenta una vez y la consulta queda en la auditoría con quien la pidió');
  }
  {
    // Stripe no la tiene: se marca a mano, y nadie la vuelve a mandar.
    const V = await vieja('red');
    P.caida = true; await cobros.barrerDevolucionesPago(); P.caida = false;
    const f0 = await devDe(V.k), al = await idAlerta('refund_stuck', f0.id);
    // Dos personas a la vez: una sola vez.
    const [m1, m2] = await Promise.all([alertas.notaAlerta(S, al, 'resuelta_a_mano', 'Se le mandó un cheque al cliente.'), alertas.notaAlerta(S2, al, 'resuelta_a_mano', 'Transferencia bancaria; comprobante en el caso.')]);
    const f = await devDe(V.k);
    ok([m1, m2].filter((x) => x.ok).length === 1 && [m1, m2].some((x) => !x.ok && /Ya no está pendiente/.test(x.msg)) && f.mano && f.st === 'pending'
      && await n1(`select count(*)::int as n from money_alert_notes where alert_id = $1::bigint and action = 'resuelta_a_mano'`, [al]) === 1,
      `Stripe no la tiene: se resuelve a mano, una vez aunque dos personas toquen a la vez (${[m1, m2].map((x) => (x.ok ? 'ok' : x.msg)).join(' | ')})`);
    const n0 = P.idems.length;
    await envejecer('refunds', f0.id, 120);
    await cobros.barrerDevolucionesPago();
    ok(P.idems.length === n0 && (await devDe(V.k)).st === 'pending', 'resuelta a mano: el barrido no la vuelve a mandar ni le da otra llave');
  }
  {
    // Stripe no contesta: no cambia nada.
    const V = await vieja('red');
    P.caida = true; await cobros.barrerDevolucionesPago();
    const f0 = await devDe(V.k), al = await idAlerta('refund_stuck', f0.id);
    const r = await alertas.notaAlerta(S, al, 'resuelta_a_mano', 'Se le mandó un cheque al cliente.');
    P.caida = false;
    ok(!r.ok && /no contestó/.test(r.msg) && !(await devDe(V.k)).mano && await n1(`select count(*)::int as n from money_alert_notes where alert_id = $1::bigint`, [al]) === 0, `Stripe no contesta: no se marca nada («${r.msg}»)`);
  }

  console.log('3 · Una devolución anotada antes de 0206 (sin el dato)');
  {
    const c = await cobro(X), k = `t9w-vieja-${hex()}`;
    const id = await crudo(async (x) => (await x.query(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key, attempts, last_error, created_at, sent_at)
      values ($1::bigint, 700, 'prueba', 'admin', 'pending', $2, 2, 'red', now() - interval '3 days', now() - interval '3 days') returning id::text`, [c.p, k])).rows[0].id);
    await cobros.barrerDevolucionesPago(); await cobros.barrerDevolucionesPago();
    let f = await devDe(k);
    ok(f.st === 'pending' && f.kn === 0 && await consultasDe('refunds', id) === 0 && await alertasDe('refund_stuck', id) === 1 && /sin el dato/.test(await detalleDe('refund_stuck', id)) && P.llamadasCon(k) === 0,
      'sin el dato: el barrido no la pregunta ni la manda; una alerta que dice que se anotó sin el dato');
    const r = await DC.resolverDevolucion(id, { origen: 'equipo', staff: staffU });
    f = await devDe(k);
    const v = await K.veredicto('refunds', id);
    ok(r.resultado === 'no_hallado' && v?.noLlego === false && f.st === 'pending' && f.kn === 0 && P.llamadasCon(`${k}-r1`) === 0, `aunque Stripe «no la tenga», nunca se da por «no llegó» (${r.resultado}, ${r.quedo})`);
  }

  console.log('4 · Boletos');
  {
    const c = await cobro(X), k = `t9w-bol-${hex()}`;
    const rf = await devBoletos(c, 1200, k);
    P.para = k; P.plan = ['red'];
    await BO.ejecutarDevolucion(rf);
    let f = await devDe(k);
    ok(f.st === 'pending' && f.gref === `refunds:${rf}` && f.mandada, 'la devolución de boletos también se anota antes, con su dato');
    await envejecer('refunds', rf, 25 * 60);
    P.stripe.set(`refunds:${rf}`, [{ id: `re_fake_9t7_bf_${hex()}`, estado: 'fallido', centavos: 1200 }]);
    await BO.barrerDevolucionesBoletos();
    f = await devDe(k);
    ok(f.st === 'failed' && (await pago(c.p)).dev === 0 && await alertasDe('refund_failed', rf) === 1 && /orden de boletos/.test(await detalleDe('refund_failed', rf)) && await auditadas('dinero.consulta.cerrar', rf, 'refunds') === 1
      && await n1(`select count(*)::int as n from operation_events where operation_id = $1::bigint and kind = 'refund_failed'`, [c.op]) === 1,
      `boletos, Stripe la tiene fallida: queda fallida, el libro coherente y la alerta dice la orden (${f.st})`);
  }
  {
    const c = await cobro(X), k = `t9w-bol-${hex()}`;
    const rf = await devBoletos(c, 1300, k);
    P.para = k; P.plan = ['red-pero-hizo'];
    await BO.ejecutarDevolucion(rf);
    await envejecer('refunds', rf, 25 * 60);
    await BO.barrerDevolucionesBoletos();
    const f = await devDe(k);
    ok(f.st === 'done' && f.re === P.hechas.get(k).id && P.llamadasCon(k) === 1 && (await pago(c.p)).dev === 1300, `boletos, salió y se perdió: la consulta la encuentra y se cierra por el mismo cierre (${f.st})`);
  }
  {
    const c = await cobro(X), k = `t9w-bol-${hex()}`;
    const rf = await devBoletos(c, 1400, k);
    P.para = k; P.plan = ['red'];
    await BO.ejecutarDevolucion(rf);
    await envejecer('refunds', rf, 25 * 60);
    await BO.barrerDevolucionesBoletos();
    const f = await devDe(k);
    ok(f.st === 'done' && f.kn === 1 && P.llamadasCon(`${k}-r1`) === 1 && (await pago(c.p)).dev === 1400 && await n1(`select count(*)::int as n from ticket_refund_lines where refund_id = $1::bigint`, [rf]) === 1,
      `boletos, nunca llegó: la MISMA devolución (con sus líneas) sale con otra llave, una vez (${f.st})`);
  }

  console.log('5 · Reversión al organizador');
  {
    const L = await liquidacionPagada(X.b, 6000);
    const R1 = await reversion(L, 1000);
    P.para = R1.k; P.plan = ['red'];
    await LQ.repararLiquidaciones();
    let r = await revDe(R1.id);
    ok(r.st === 'pending' && r.mandada && r.gref === `event_settlement_reversals:${R1.id}`, 'la reversión se anota antes, con su dato buscable');
    await envejecer('event_settlement_reversals', R1.id, 25 * 60);
    await LQ.repararLiquidaciones();
    r = await revDe(R1.id);
    ok(r.st === 'done' && r.kn === 1 && P.llamadasCon(`${R1.k}-r1`) === 1 && P.hechas.get(`${R1.k}-r1`)?.meta.tl_intencion === `event_settlement_reversals:${R1.id}` && await auditadas('evento.liquidacion.revertir_otra_vez', L.id, 'event_settlement') === 1,
      `nunca llegó: la reversión sale con OTRA llave, una vez, con su auditoría (${r.st})`);
    const R2 = await reversion(L, 1100);
    P.para = R2.k; P.plan = ['red-pero-hizo'];
    await LQ.repararLiquidaciones();
    await envejecer('event_settlement_reversals', R2.id, 25 * 60);
    const n0 = P.idems.length;
    await LQ.repararLiquidaciones();
    r = await revDe(R2.id);
    ok(r.st === 'done' && r.trr === P.hechas.get(R2.k).id && P.idems.length === n0, `salió y se perdió: la consulta la encuentra y se cierra sin otra llamada (${r.st})`);
    // «Resolver a mano» de una reversión que Stripe sí hizo: se cierra como hecha.
    const R3 = await reversion(L, 1200);
    P.para = R3.k; P.plan = ['red-pero-hizo'];
    await LQ.repararLiquidaciones();
    await envejecer('event_settlement_reversals', R3.id, 25 * 60);
    P.caida = true; await LQ.repararLiquidaciones(); P.caida = false;
    const al = await idAlerta('transfer_reversal_stuck', R3.id);
    const m = await alertas.notaAlerta(S, al, 'resuelta_a_mano', 'El organizador pagó por transferencia.');
    r = await revDe(R3.id);
    ok(!!al && m.ok && /sí salió/.test(m.msg) && r.st === 'done' && !r.mano && r.trr === P.hechas.get(R3.k).id, `«Resolver a mano» de una reversión que Stripe sí hizo: se cierra como hecha («${m.ok ? m.msg : m.msg}»)`);
  }

  console.log('6 · La devolución de lo que sobró: «Resolver a mano»');
  {
    // Una decisión del equipo (como la de din9t6) con su devolución de lo que sobró, armada directo en la base.
    async function sobra() {
      const c = await cobro(X), oc = String(crypto.randomInt(1, 2 ** 31));
      const ck = (await q1(`insert into gateway_checks (subject_kind, subject_id, lookup, origin, result, found_n, city_id) values ('offsession_charges', $1::bigint, $2, 'barrido', 'varios', 2, 'hzl') returning id::text`, [oc, `offsession_charges:${oc}`])).id;
      const rv = (await q1(`insert into gateway_reviews (subject_kind, subject_id, check_id, decision, stripe_id, amount_cents, staff_id, note, city_id) values ('offsession_charges', $1::bigint, $2::bigint, 'vale', $3, 900, $4, 'Duplicado: vale el primero.', 'hzl') returning id::text`,
        [oc, ck, `pi_fake_9t7_vale_${hex()}`, staffU])).id;
      const id = (await q1(`insert into gateway_refunds (review_id, subject_kind, subject_id, medio, plataforma, stripe_id, amount_cents, idem_key, business_id, city_id) values ($1::bigint, 'offsession_charges', $2::bigint, 'refund', false, $3, 900, $4, $5, 'hzl') returning id::text`,
        [rv, oc, c.pi, `gwr-${rv}-${hex()}`, X.b])).id;
      return { id, k: (await q1(`select idem_key as k from gateway_refunds where id = $1::bigint`, [id])).k };
    }
    const gr = (id) => q1(`select status as st, manual_at is not null as mano, stripe_refund_id as re from gateway_refunds where id = $1::bigint`, [id]);
    const G1 = await sobra();
    P.para = G1.k; P.plan = ['no'];
    await RV.ejecutarDevolucionSobra(G1.id);
    const al1 = await idAlerta('extra_refund_stuck', G1.id), f1 = await filaAlerta('extra_refund_stuck', G1.id);
    ok((await gr(G1.id)).st === 'failed' && f1?.aMano === true && /resuélvela a mano/.test(await detalleDe('extra_refund_stuck', G1.id)), 'Stripe dijo que no a la devolución de lo que sobró: la alerta ofrece «Resolver a mano» (antes solo «Resuelta»)');
    const m1 = await alertas.notaAlerta(S, al1, 'resuelta_a_mano', 'Se le devolvió por transferencia bancaria.');
    ok(m1.ok && (await gr(G1.id)).mano && (await filaAlerta('extra_refund_stuck', G1.id))?.estado === 'resuelta', `Stripe no la tiene: se resuelve a mano y la alerta queda resuelta (${m1.ok ? 'ok' : m1.msg})`);
    const G2 = await sobra();
    P.para = G2.k; P.plan = ['red-pero-hizo'];
    await RV.ejecutarDevolucionSobra(G2.id);
    await envejecer('gateway_refunds', G2.id, 25 * 60);
    P.caida = true; await RV.ejecutarDevolucionSobra(G2.id); P.caida = false;
    const al2 = await idAlerta('extra_refund_stuck', G2.id);
    const m2 = await alertas.notaAlerta(S, al2, 'resuelta_a_mano', 'Se le devolvió por transferencia bancaria.');
    const g2 = await gr(G2.id);
    ok(!!al2 && m2.ok && /sí salió/.test(m2.msg) && g2.st === 'done' && !g2.mano && g2.re === P.hechas.get(G2.k).id, `Stripe dice que salió: se cierra como hecha, no a mano («${m2.ok ? m2.msg : m2.msg}»)`);
  }

  console.log('7 · La base');
  {
    const c = await cobro(X), k = `t9w-base-${hex()}`;
    P.para = k; P.plan = ['red'];
    await devolver(c, 500, k);
    const f = await devDe(k);
    let e1 = null; try { await db.query(`update refunds set gateway_ref = 'refunds:1' where id = $1::bigint`, [f.id]); } catch (e) { e1 = e.message; }
    let e2 = null; try { await db.query(`update refunds set key_from = now(), key_n = 1 where id = $1::bigint`, [f.id]); } catch (e) { e2 = e.message; }
    const ck = (await q1(`select id::text from gateway_checks order by id desc limit 1`)).id;
    let e3 = null; try { await db.query(`insert into gateway_reviews (subject_kind, subject_id, check_id, decision, amount_cents, staff_id, note) values ('refunds', $1::bigint, $2::bigint, 'ninguno', 500, $3, 'Ninguna vale.')`, [f.id, ck, staffU]); } catch (e) { e3 = e.message; }
    let e4 = null; try { await db.query(`update gateway_refunds set manual_at = now(), manual_by = $1, manual_note = 'Otra vez.' where manual_at is not null and id = (select id from gateway_refunds where manual_at is not null order by id desc limit 1)`, [staffU]); } catch (e) { e4 = e.message; }
    ok(/gateway_ref se anota una vez/.test(e1 ?? '') && /devolucion_llave/.test(e2 ?? '') && /gateway_reviews_devolucion_solo_vale/.test(e3 ?? '') && /ya se resolvió a mano/.test(e4 ?? ''),
      'la base: el dato se anota una vez; la llave no vuelve a valer dentro de la ventana; una decisión sobre una devolución es solo «vale»; lo resuelto a mano no cambia');
  }

  await db.end();
  console.log(`\n${checks - fallas}/${checks} · ${fallas ? 'FALLA' : 'bien'}`);
  process.exit(fallas ? 1 : 0);
})().catch(async (e) => { console.error('✗', e); try { await D.db().end(); } catch { /* */ } process.exit(1); });
