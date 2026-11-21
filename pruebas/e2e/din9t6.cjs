// 9t6 (21 nov) · Dinero, sexta tanda (LAUNCH «Preguntarle a la pasarela, lo que quedó de 9t5»): (1) renovar una retención (el depósito de una renta, lo
// retenido de un estimado) es una intención: «sin respuesta» no es «el banco no dejó»; (2) una gateway_review la cierra una persona del equipo eligiendo
// cuál vale, y el servidor vuelve a preguntar a la pasarela antes de decidir; lo que sobra se devuelve por su propia intención. Contra la base de pruebas
// y con una pasarela de mentira (sin servidor), con los archivos REALES de apps/web (renovar-retencion, revision-pasarela, consulta-pasarela, rentas,
// estimados, cobro-fuera, planes, suscripcion, dinero-alertas, cobros), transpilados con pruebas/lib/ts-servidor.cjs. La misma armazón que din9t5.
//   1. Renta: sin respuesta dentro de la ventana (nada se suelta ni se avisa) → la misma llave → renovada; salió y la respuesta se perdió → pasada la
//      ventana la consulta la encuentra; no hallado antes del margen (sigue, alerta una vez) y después («nunca llegó», aviso sin «el banco»); el banco dijo
//      que no; la consulta no contesta; «Preguntar a Stripe ahora»; la renta volvió mientras tanto (la nueva se suelta).
//   2. Estimado: un «no» de verdad; varios hallados → el equipo elige cuál vale; otro monto → «ninguno» (lo hallado se suelta, aviso sin «tu banco»).
//   3. Plan del Hogar con varios cobros en Stripe: el elegido que no está, otro en curso, la consulta caída, «Resuelta» sin decidir, dos personas a la
//      vez (una sola vez), el elegido con otro monto; lo que sobra se devuelve con su llave.
//   4. Pro cobrado dos veces el mismo período: solo «ninguno» (devolver), sin contar como rechazo, y el negocio se cobra el período siguiente.
//   5. La devolución de lo que sobró: sin respuesta (misma llave), la respuesta perdida (pasada la llave la consulta la encuentra), un «no» (alerta).
// Uso: DATABASE_URL=… node pruebas/e2e/din9t6.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const { esFijo } = require('../lib/telefonos-fijos.cjs');
const crypto = require('crypto');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };

// ── Los módulos reales, con lo de afuera de mentira ──
const D = cargar('apps/web/lib/db.ts');
const avisados = [];
const avisos = { avisar: async (u, t, v) => { avisados.push(['u', u, t, v]); }, avisarMuchos: async () => undefined, avisarNegocio: async (b, t, v) => { avisados.push(['b', b, t, v]); } };
const auditarStaff = async (c, a) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, after, reason) values ('staff', $1, $2, $3, $4, $5, $6)`,
  [a.actor, a.action, a.targetKind, a.targetId ?? null, JSON.stringify(a.after ?? null), a.reason ?? null]);
const SU = {}, CF = {}, LQ = {}, K = {}, RR = {}, RV = {}, ES = {}, RE = {}, PL = {}, PA = {};
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: auditarStaff }, './suscripcion': SU, './cobro-fuera': CF, './evt-liquidacion': LQ,
  './consulta-pasarela': K, './renovar-retencion': RR, './revision-pasarela': RV });
// La pasarela de mentira: una vez por llave (como Stripe con Idempotency-Key), guarda la metadata de cada cobro, retención y devolución y contesta la
// consulta como Stripe (por la metadata tl_intencion). `stripe`: lo que la consulta encuentra para una intención, en lugar de lo cobrado o retenido.
const hex = () => crypto.randomBytes(6).toString('hex');
const P = {
  modo: () => 'simulador', plan: [], para: null, devPlan: [], cargos: new Map(), holds: new Map(), devs: new Map(), liberados: new Set(), stripe: new Map(), caida: false, idems: [], consultas: 0,
  paso(idem) { return this.plan.length && (!this.para || idem.startsWith(this.para)) ? this.plan.shift() : 'ok'; },
  cobro(x) {
    this.idems.push(x.idem);
    const paso = this.paso(x.idem);
    if (paso === 'red') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    if (paso === 'no') return { ok: false, codigo: 'card_declined', mensaje: { es: 'Tu banco la rechazó.', en: 'Declined.' } };
    if (!this.cargos.has(x.idem)) this.cargos.set(x.idem, { id: `pi_fake_9t6_${hex()}`, n: x.centavos, meta: { ...x.meta } });
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    return { ok: true, id: this.cargos.get(x.idem).id, marca: 'visa', ultimos4: '4242' };
  },
  async cobrarFuera(x) { return this.cobro(x); },
  async cobrarDirecto(x) { return this.cobro(x); },
  async retener(x) {
    this.idems.push(x.idem);
    const paso = this.paso(x.idem);
    if (paso === 'red') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    if (paso === 'no') return { ok: false, codigo: 'card_declined', mensaje: { es: 'Tu banco la rechazó.', en: 'Declined.' } };
    if (!this.holds.has(x.idem)) this.holds.set(x.idem, { pi: `pi_fake_9t6h_${hex()}`, n: x.centavos, meta: { ...x.meta } });
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    return { ok: true, pi: this.holds.get(x.idem).pi, estado: 'retenido', marca: 'visa', ultimos4: '4242' };
  },
  async liberar(pi) { this.liberados.add(pi); return { ok: true }; },
  dev(objeto, n, idem, meta, plataforma) {
    this.idems.push(idem);
    const paso = this.devPlan.length ? this.devPlan.shift() : 'ok';
    if (paso === 'red') return { ok: false, codigo: 'red' };
    if (paso === 'no') return { ok: false, codigo: 'charge_already_refunded' };
    if (!this.devs.has(idem)) this.devs.set(idem, { id: `re_fake_9t6_${hex()}`, objeto, n, meta: { ...(meta ?? {}) }, plataforma });
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'red' };
    return { ok: true, id: this.devs.get(idem).id };
  },
  async devolver(pi, n, idem, o = {}) { return this.dev(pi, n, idem, o.meta, !!o.plataforma); },
  async revertirTransferencia(tr, n, idem, meta) { return this.dev(tr, n, idem, meta, true); },
  async buscarCobro(ref) {
    this.consultas++;
    if (this.caida) return { ok: false };
    const H = this.stripe.get(ref) ?? [...[...this.cargos.values()].map((c) => ({ id: c.id, n: c.n, meta: c.meta })), ...[...this.holds.values()].map((h) => ({ id: h.pi, n: h.n, meta: h.meta }))]
      .filter((c) => c.meta.tl_intencion === ref).map((c) => ({ id: c.id, estado: 'hecho', centavos: c.n }));
    return H.length > 1 ? { ok: true, varios: H } : { ok: true, hallado: H[0] ?? null };
  },
  async buscarDevolucion(ref, medio, objeto) {
    this.consultas++;
    if (this.caida) return { ok: false };
    const H = [...this.devs.values()].filter((d) => d.objeto === objeto && d.meta.tl_intencion === ref).map((d) => ({ id: d.id, estado: 'hecho', centavos: d.n }));
    return H.length > 1 ? { ok: true, varios: H } : { ok: true, hallado: H[0] ?? null };
  },
  async buscarTransferencia() { return { ok: false }; },
  cliente: async () => null, intento: async () => null,
  llamadasCon(pref) { return this.idems.filter((k) => k.startsWith(pref)).length; },
};
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined } });
Object.assign(K, cargar('apps/web/lib/consulta-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas }));
Object.assign(CF, cargar('apps/web/lib/cobro-fuera.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas, './planes': PL, './rentas': RE, './patrocinio': PA,
  './patrocinio-evento': {}, './consulta-pasarela': K }));
Object.assign(PL, cargar('apps/web/lib/planes.ts', { './dias-especiales': { cerradoElDia: () => false, diasEspeciales: async () => [] }, './fecha-local': { hoyEn: () => new Date().toISOString().slice(0, 10) },
  './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './cobro-fuera': CF, './avisos': avisos }));
Object.assign(RE, cargar('apps/web/lib/rentas.ts', { './dias-especiales': { diasEspeciales: async () => [], rangosDia: () => [] }, './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P },
  './cobro-fuera': CF, './avisos': avisos, './renovar-retencion': RR, './consulta-pasarela': K }));
Object.assign(ES, cargar('apps/web/lib/estimados.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './pagos/verificacion': { bancoPide: () => null }, './vista-equipo': { soloLectura: () => false },
  './avisos': avisos, './renovar-retencion': RR, './consulta-pasarela': K }));
Object.assign(RR, cargar('apps/web/lib/renovar-retencion.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './cobro-fuera': CF, './consulta-pasarela': K, './dinero-alertas': alertas,
  './rentas': RE, './estimados': ES }));
Object.assign(SU, cargar('apps/web/lib/suscripcion.ts', { './db': D, './pagos/pasarela': { pasarela: P, registrarAccion: async () => undefined }, './plan': { PRECIO_PRO: 30 }, './avisos': avisos,
  './correo/recibos': { reciboPro: async () => undefined }, './dinero-alertas': alertas, './consulta-pasarela': K }));
Object.assign(RV, cargar('apps/web/lib/revision-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './cobro-fuera': CF, './dinero-alertas': alertas, './admin': { auditar: auditarStaff },
  './consulta-pasarela': K, './suscripcion': SU, './evt-liquidacion': LQ, './renovar-retencion': RR }));

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
const n1 = async (s, v = []) => Number((await q1(s, v)).n);
// Lo que la app nunca escribe así (filas «de otro día»): con los triggers apagados en ESTA conexión y vueltos a encender antes de soltarla.
async function crudo(fn) {
  const k = await db.connect();
  try { await k.query('set session_replication_role = replica'); return await fn(k); } finally { await k.query('set session_replication_role = default').catch(() => undefined); k.release(); }
}
// «Hace N minutos»: la renovación (anotada y mandada), su retención vieja (y lo que la renovación anotó de ella) y sus consultas.
const envejecerRenov = (id, min) => crudo(async (k) => {
  await k.query(`update hold_renewals set created_at = created_at - make_interval(mins => $2::int), sent_at = sent_at - make_interval(mins => $2::int), old_held_at = old_held_at - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]);
  await k.query(`update payments set held_at = held_at - make_interval(mins => $2::int) where id = (select payment_id from hold_renewals where id = $1::bigint)`, [id, min]);
  await k.query(`update gateway_checks set at = at - make_interval(mins => $2::int) where subject_kind = 'hold_renewals' and subject_id = $1::bigint`, [id, min]);
});
const envejecer = (t, id, min) => crudo(async (k) => {
  if (t === 'offsession_charges') await k.query(`update offsession_charges set created_at = created_at - make_interval(mins => $2::int), sent_at = sent_at - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]);
  if (t === 'subscription_charges') await k.query(`update subscription_charges set created_at = created_at - make_interval(mins => $2::int), sent_at = sent_at - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]);
  if (t === 'gateway_refunds') await k.query(`update gateway_refunds set created_at = created_at - make_interval(mins => $2::int), sent_at = sent_at - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]);
  await k.query(`update gateway_checks set at = at - make_interval(mins => $2::int) where subject_kind = $3 and subject_id = $1::bigint`, [id, min, t]);
});
const renovDe = (pago) => q1(`select id::text, status as st, sent_at is not null as mandada, gateway_ref as gref, stripe_pi as pi, last_error as err, attempts::int as n, new_payment_id::text as nuevo from hold_renewals where payment_id = $1::bigint`, [pago]);
const pago = (id) => q1(`select status as st, stripe_payment_intent as pi from payments where id = $1::bigint`, [id]);
const eventos = (op, kind) => n1(`select count(*)::int as n from operation_events where operation_id = $1::bigint and kind = $2`, [op, kind]);
const alertasDe = (kind, sujeto) => n1(`select count(*)::int as n from money_alerts where kind = $1 and subject_id = $2`, [kind, sujeto]);
const idAlerta = async (kind, sujeto) => (await q1(`select id::text from money_alerts where kind = $1 and subject_id = $2`, [kind, sujeto]))?.id;
const cerradaSola = (kind, sujeto) => n1(`select count(*)::int as n from money_alert_notes n join money_alerts a on a.id = n.alert_id where a.kind = $1 and a.subject_id = $2 and n.action = 'resuelta_sola' and n.staff_id is null`, [kind, sujeto]);
const auditadas = (accion, id, tipo) => n1(`select count(*)::int as n from audit_entries where action = $1 and target_id = $2 and target_kind = $3`, [accion, String(id), tipo]);
const avisosDe = (tpl, a) => avisados.filter((x) => x[2] === tpl && x[1] === a);
const RUN = hex();
async function tel() {
  for (let i = 0; i < 500; i++) {
    const t = `+1570555${String(crypto.randomInt(10000)).padStart(4, '0')}`;
    if (!esFijo(t) && !(await db.query(`select 1 from users where phone = $1`, [t])).rowCount) return t;
  }
  throw new Error('no quedó un +1570555xxxx libre');
}
async function datos(cat = 'NEG-HOGAR') {
  const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Sexta') returning id::text`, [await tel()])).id;
  const b = (await q1(`insert into businesses (id, city_id, category_id, name) values ($1, 'hzl', $2, 'Prueba 9t6') returning id`, [`p9s-${hex().slice(0, 8)}`, cat])).id;
  await db.query(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ($1, $2, 'enabled', true, true, true)`, [b, `acct_sim_9t6_${b}`]);
  return { u, b, pm: `pm_sim_visa_4242_${hex().slice(0, 8)}` };
}
const hoy = async () => (await q1(`select (now() at time zone 'America/New_York')::date::text as h`)).h;
// Una renta afuera con su depósito retenido hace `horas` (la tarjeta lo suelta a las 168).
async function renta(X, horas = 165) {
  const it = (await q1(`insert into items (business_id, module, name, price_cents, deposit_cents, stock_mode, stock_left, sell, status) values ($1, 'renta', '{"es":"Taladro 9t6","en":"Drill 9t6"}'::jsonb, 2500, 5000, 'qty', 5, true, 'live') returning id::text`, [X.b])).id;
  const num = `T-6${String(Date.now()).slice(-6)}${crypto.randomInt(100)}`, h = await hoy();
  const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key) values ($1, 'rental', 'hzl', $2, $3, 'confirmed', '{}'::jsonb, 5000, 5000, 5000, 'app', gen_random_uuid()) returning id::text`, [num, X.b, X.u])).id;
  await db.query(`insert into rentals (operation_id, business_id, user_id, city_id, item_id, item_name, price_cents, deposit_cents, days, rent_cents, pick_on, due_on, expires_at, payment_method, status)
                  values ($1::bigint, $2, $3, 'hzl', $4::bigint, '{"es":"Taladro 9t6","en":"Drill 9t6"}'::jsonb, 2500, 5000, 30, 75000, $5::date - 7, $5::date + 23, now() + interval '2 days', $6, 'out')`, [op, X.b, X.u, it, h, X.pm]);
  const pid = await crudo(async (k) => (await k.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, held_at, simulated, payment_method)
    values ($1::bigint, $2, $3, 'hzl', 'security', 1, 'card', $4, 5000, 5000, 0, 'held', now() - make_interval(hours => $5::int), false, $6) returning id::text`, [op, X.u, X.b, `pi_fake_9t6_old_${hex()}`, horas, X.pm])).rows[0].id);
  return { num, op, pago: pid, idem: `renta-renov-${pid}` };
}
// Una cita del Hogar confirmada con lo del estimado retenido hace `horas`.
async function estimado(X, horas = 165) {
  const num = `C-6${String(Date.now()).slice(-6)}${crypto.randomInt(100)}`;
  const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, client_key) values ($1, 'appointment', 'hzl', $2, $3, 'confirmed', '{"rubro":"hogar"}'::jsonb, 20000, 20000, 'app', gen_random_uuid()) returning id::text`,
    [num, X.b, X.u])).id;
  const pid = await crudo(async (k) => (await k.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, held_at, simulated, payment_method)
    values ($1::bigint, $2, $3, 'hzl', 'estimate', 1, 'card', $4, 20000, 20000, 0, 'held', now() - make_interval(hours => $5::int), false, $6) returning id::text`, [op, X.u, X.b, `pi_fake_9t6_est_${hex()}`, horas, X.pm])).rows[0].id);
  return { num, op, pago: pid, idem: `renov-${pid}` };
}
// Un plan del Hogar de $149 que cobra hoy (como din9t4 y din9t5).
async function plan(X) {
  const it = (await q1(`insert into items (business_id, name, price_cents, svc_kind, sell, status) values ($1, '{"es":"Plan 9t6","en":"Plan 9t6"}'::jsonb, 14900, 'plan', true, 'live') returning id::text`, [X.b])).id;
  const num = `PL-6${String(Date.now()).slice(-6)}${crypto.randomInt(100)}`;
  const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, client_key) values ($1, 'plan', 'hzl', $2, $3, 'confirmed', '{"svc":{"es":"Plan 9t6","en":"Plan 9t6"}}'::jsonb, 14900, 14900, 'app', gen_random_uuid()) returning id::text`,
    [num, X.b, X.u])).id;
  const h = await hoy();
  const id = (await q1(`insert into plan_subscriptions (operation_id, business_id, user_id, city_id, item_id, price_cents, dow, nth, window_m, charge_day, first_visit_on, next_visit_on, next_charge_on, payment_method)
                         values ($1::bigint, $2, $3, 'hzl', $4::bigint, 14900, 2, 2, 540, 5, $5::date, null, $5::date, $6) returning id::text`, [op, X.b, X.u, it, h, X.pm])).id;
  return { id, num, op, pref: `plan-${id}-` };
}
const intencion = (kind, ref) => q1(`select id::text, status as st, stripe_pi as pi, last_error as err from offsession_charges where kind = $1 and ref_id = $2 order by id desc limit 1`, [kind, String(ref)]);
// Un plan cuyo cobro quedó sin respuesta y la consulta (pasadas 25 h) halló `H` en Stripe (varios, otro monto…): su gateway_review.
async function planEnRevision(X, H) {
  const L = await plan(X);
  P.para = L.pref; P.plan = ['red'];
  await PL.barrerPlanes({ numero: L.num });
  const a = await intencion('plan', L.id);
  await envejecer('offsession_charges', a.id, 25 * 60);
  const ref = `offsession_charges:${a.id}`;
  P.stripe.set(ref, H);
  await CF.barrerCobrosFuera();
  return { ...L, a, ref, alerta: await idAlerta('gateway_review', ref) };
}
const devsDe = (t, id) => db.query(`select id::text, stripe_id as stripe, status as st, amount_cents as n, plataforma, attempts::int as intentos, idem_key as k, stripe_refund_id as re, last_error as err from gateway_refunds where subject_kind = $1 and subject_id = $2::bigint order by id`, [t, id]).then((r) => r.rows);
const revisiones = (t, id) => n1(`select count(*)::int as n from gateway_reviews where subject_kind = $1 and subject_id = $2::bigint`, [t, id]);

(async () => {
  const X = await datos();
  const staffU = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Dinero') returning id::text`, [await tel()])).id;
  const staffV = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Dos') returning id::text`, [await tel()])).id;
  for (const s of [staffU, staffV]) await db.query(`insert into staff_members (user_id, role, status) values ($1, 'admin', 'active') on conflict (user_id) do update set role = 'admin', status = 'active'`, [s]);
  const S = { id: staffU, role: 'admin', cities: [] }, S2 = { id: staffV, role: 'admin', cities: [] };
  const filaAlerta = async (kind, sujeto) => (await alertas.alertasDinero(S, false, null, 300)).filas.find((a) => a.kind === kind && a.sujeto === sujeto);

  console.log('1 · Renta: renovar el depósito con «sin respuesta»');
  {
    const R = await renta(X);
    P.para = R.idem; P.plan = ['red'];
    await RE.barrerRentas({ numero: R.num });
    let h = await renovDe(R.pago), v = await pago(R.pago);
    ok(h?.st === 'pending' && h.mandada && h.gref === `hold_renewals:${h.id}` && h.n === 1 && v.st === 'held' && !P.liberados.has(v.pi),
      `sin respuesta dentro de la ventana: la renovación queda en camino (anotada, con su dato buscable) y la vieja sigue retenida (${h?.st}, ${v.st})`);
    ok(avisosDe('biz_renta', X.b).length === 0 && await eventos(R.op, 'hold_failed') === 0, 'y no se le avisa nada a nadie («el banco ya no deja» sería falso)');
    P.plan = [];
    await RE.barrerRentas({ numero: R.num });
    h = await renovDe(R.pago); v = await pago(R.pago);
    const nuevo = h.nuevo ? await q1(`select status as st, stripe_payment_intent as pi, renewed_from::text as de from payments where id = $1::bigint`, [h.nuevo]) : null;
    const hold = P.holds.get(R.idem);
    ok(h.st === 'done' && nuevo?.st === 'held' && nuevo.de === R.pago && nuevo.pi === hold?.pi && v.st === 'released' && P.liberados.has(v.pi) && P.llamadasCon(R.idem) === 2 && P.holds.size >= 1,
      `el siguiente barrido la termina con la MISMA llave: la nueva anotada (renewed_from) y DESPUÉS se suelta la vieja (${h.st}, ${P.llamadasCon(R.idem)} llamadas, una llave)`);
    ok(hold?.meta.tl_intencion === `hold_renewals:${h.id}` && await eventos(R.op, 'hold_renewed') === 1, 'la retención nueva lleva el dato buscable (tl_intencion) y la renta dice «se renovó» una vez');
    await RE.barrerRentas({ numero: R.num });
    ok(P.llamadasCon(R.idem) === 2 && await n1(`select count(*)::int as n from payments where operation_id = $1::bigint and kind = 'security'`, [R.op]) === 2, 'otra vuelta no renueva otra vez');
  }
  {
    // La retención SÍ salió y la respuesta se perdió; la vieja muere antes de que Stripe olvide la llave: ya no se manda, se pregunta.
    const R = await renta(X);
    P.para = R.idem; P.plan = ['red-pero-hizo'];
    await RE.barrerRentas({ numero: R.num });
    let h = await renovDe(R.pago);
    await envejecerRenov(h.id, 5 * 60);
    const n0 = P.llamadasCon(R.idem);
    await RE.barrerRentas({ numero: R.num });
    h = await renovDe(R.pago);
    const v = await pago(R.pago), hold = P.holds.get(R.idem);
    ok(h.st === 'done' && h.pi === hold.pi && P.llamadasCon(R.idem) === n0 && v.st === 'released' && P.liberados.has(v.pi),
      `la vieja ya murió (168 h): no se vuelve a mandar con la llave; la consulta encuentra la retención y se anota (${h.st}, ${P.llamadasCon(R.idem) - n0} llamadas más)`);
    ok(await auditadas('dinero.consulta.cerrar', h.id, 'hold_renewals') === 1 && avisosDe('biz_renta', X.b).length === 0, 'la auditoría dice que la cerró la consulta a la pasarela; nadie recibe un aviso falso');
  }
  {
    // No está en Stripe: antes del margen (mandada hace 5 h) sigue en camino con su alerta (una); pasado el margen, «nunca llegó» y el aviso verdadero.
    const R = await renta(X);
    P.para = R.idem; P.plan = ['red'];
    await RE.barrerRentas({ numero: R.num });
    let h = await renovDe(R.pago);
    await envejecerRenov(h.id, 5 * 60);
    await RE.barrerRentas({ numero: R.num });
    const c1 = P.consultas;
    await RE.barrerRentas({ numero: R.num });
    h = await renovDe(R.pago);
    ok(h.st === 'pending' && (await pago(R.pago)).st === 'held' && await alertasDe('hold_stuck', h.id) === 1 && P.consultas === c1 && avisosDe('biz_renta', X.b).length === 0,
      `no está en Stripe a las 5 h: sigue en camino, la vieja no se suelta, UNA alerta al equipo y el barrido no vuelve a preguntar antes de 15 min (${h.st})`);
    const f = await filaAlerta('hold_stuck', h.id);
    ok(f?.preguntar === true && f.consulta?.resultado === 'no_hallado', 'la alerta muestra lo que dijo la consulta y ofrece «Preguntar a Stripe ahora»');
    // «Preguntar a Stripe ahora» (el equipo): la misma función, con su auditoría.
    const pr = await alertas.preguntarPorAlerta(S, f.id, 'Reviso la alerta de hoy.');
    ok(pr.ok && /sigue en camino/.test(pr.msg) && await auditadas('dinero.alerta.preguntar', f.id, 'money_alert') === 1
      && (await db.query(`select 1 from gateway_checks where subject_kind = 'hold_renewals' and subject_id = $1::bigint and origin = 'equipo' and staff_id = $2::uuid`, [h.id, staffU])).rowCount === 1,
      `«Preguntar a Stripe ahora»: la consulta con quien la pidió y la auditoría («${pr.msg}»)`);
    await envejecerRenov(h.id, 20 * 60);
    await RE.barrerRentas({ numero: R.num });
    h = await renovDe(R.pago);
    const av = avisosDe('biz_renta', X.b).map((x) => x[3].que);
    ok(h.st === 'failed' && h.err === 'nunca_llego' && (await pago(R.pago)).st === 'released' && av.length === 1 && /no se pudo renovar/.test(av[0]) && !/banco/.test(av[0]),
      `pasado el margen (25 h): «nunca llegó»; la vieja se suelta y el negocio lee el motivo verdadero, sin «el banco» («${av[0]}»)`);
    ok(await cerradaSola('hold_stuck', h.id) === 1, 'y la alerta se cerró sola, una vez');
    avisados.length = 0;
  }
  {
    // El banco dijo que no (la consulta lo halló cancelado): eso sí es «el banco ya no deja».
    const R = await renta(X);
    P.para = R.idem; P.plan = ['red'];
    await RE.barrerRentas({ numero: R.num });
    let h = await renovDe(R.pago);
    await envejecerRenov(h.id, 5 * 60);
    P.stripe.set(`hold_renewals:${h.id}`, [{ id: `pi_fake_9t6_cx_${hex()}`, estado: 'fallido', centavos: 5000 }]);
    await RE.barrerRentas({ numero: R.num });
    h = await renovDe(R.pago);
    const av = avisosDe('biz_renta', X.b).map((x) => x[3].que);
    ok(h.st === 'failed' && h.err === 'consulta_fallido' && (await pago(R.pago)).st === 'released' && av.length === 1 && /el banco ya no deja/.test(av[0]) && await eventos(R.op, 'hold_failed') === 1,
      `el banco dijo que no: se suelta la vieja y se avisa «el banco ya no deja» (${h.err})`);
    avisados.length = 0;
  }
  {
    // La consulta no contesta: nada cambia.
    const R = await renta(X);
    P.para = R.idem; P.plan = ['red'];
    await RE.barrerRentas({ numero: R.num });
    let h = await renovDe(R.pago);
    await envejecerRenov(h.id, 30 * 60);
    P.caida = true;
    await RE.barrerRentas({ numero: R.num });
    P.caida = false;
    h = await renovDe(R.pago);
    const g = await q1(`select result from gateway_checks where subject_kind = 'hold_renewals' and subject_id = $1::bigint order by id desc limit 1`, [h.id]);
    ok(h.st === 'pending' && g?.result === 'sin_respuesta' && (await pago(R.pago)).st === 'held' && avisosDe('biz_renta', X.b).length === 0 && await alertasDe('hold_stuck', h.id) === 1,
      `Stripe no contesta la consulta: nada se suelta ni se avisa; la alerta queda (${h.st}, ${g?.result})`);
  }
  {
    // La renta volvió (el depósito viejo se liquidó) mientras la renovación iba en camino: la nueva, si salió, se suelta (nunca dos retenciones vivas).
    const R = await renta(X);
    P.para = R.idem; P.plan = ['red-pero-hizo'];
    await RE.barrerRentas({ numero: R.num });
    let h = await renovDe(R.pago);
    await crudo((k) => k.query(`update payments set status = 'captured', captured_at = now() where id = $1::bigint`, [R.pago]));
    await crudo((k) => k.query(`update hold_renewals set created_at = created_at - interval '3 minutes' where id = $1::bigint`, [h.id]));
    await RR.barrerRenovaciones();
    h = await renovDe(R.pago);
    const hold = P.holds.get(R.idem);
    ok(h.st === 'dropped' && P.liberados.has(hold.pi) && await n1(`select count(*)::int as n from payments where operation_id = $1::bigint and kind = 'security'`, [R.op]) === 1,
      `la vieja ya no estaba retenida: la nueva (que sí salió) se suelta y no se anota (${h.st})`);
  }

  console.log('2 · Estimado: un «no» de verdad, varios hallados y otro monto');
  {
    const E = await estimado(X);
    P.para = E.idem; P.plan = ['no'];
    await ES.renovarRetenciones(X.b);
    const h = await renovDe(E.pago);
    ok(h.st === 'failed' && (await pago(E.pago)).st === 'released' && avisosDe('hold_fallo', X.u).length === 1 && avisosDe('biz_hold_fallo', X.b).length === 1 && avisosDe('hold_no_renovada', X.u).length === 0,
      `el banco dijo que no (card_declined): se suelta la vieja y la persona lee «tu banco no dejó» (${h.st}, ${h.err})`);
    avisados.length = 0;
  }
  {
    const E = await estimado(X);
    P.para = E.idem; P.plan = ['red'];
    await ES.renovarRetenciones(X.b);
    let h = await renovDe(E.pago);
    await envejecerRenov(h.id, 5 * 60);
    const ref = `hold_renewals:${h.id}`, A = `pi_fake_9t6_a_${hex()}`, B = `pi_fake_9t6_b_${hex()}`;
    P.stripe.set(ref, [{ id: A, estado: 'hecho', centavos: 20000 }, { id: B, estado: 'hecho', centavos: 20000 }]);
    await ES.renovarRetenciones(X.b);
    h = await renovDe(E.pago);
    const al = await idAlerta('gateway_review', ref), f = await filaAlerta('gateway_review', ref);
    ok(h.st === 'pending' && !!al && f?.revisar?.vale.length === 2 && f.revisar.ninguno === true && (await pago(E.pago)).st === 'held', `dos retenciones en Stripe para una renovación: no se cierra sola; gateway_review con qué elegir (${f?.revisar?.vale.length})`);
    const r = await RV.decidirRevision(S, al, A, 'Retención duplicada: vale la primera.');
    h = await renovDe(E.pago);
    const nuevo = h.nuevo ? await q1(`select status as st, stripe_payment_intent as pi from payments where id = $1::bigint`, [h.nuevo]) : null;
    ok(r.ok && h.st === 'done' && nuevo?.pi === A && nuevo.st === 'held' && P.liberados.has(B) && !P.liberados.has(A) && (await pago(E.pago)).st === 'released',
      `el equipo elige la que vale: queda anotada, la que sobra se suelta y la vieja también («${r.msg}»)`);
    ok(await revisiones('hold_renewals', h.id) === 1 && await auditadas('dinero.alerta.decidir', al, 'money_alert') === 1 && (await filaAlerta('gateway_review', ref))?.estado === 'resuelta', 'una decisión, auditada, y la alerta queda resuelta');
  }
  {
    const E = await estimado(X);
    P.para = E.idem; P.plan = ['red'];
    await ES.renovarRetenciones(X.b);
    let h = await renovDe(E.pago);
    await envejecerRenov(h.id, 5 * 60);
    const ref = `hold_renewals:${h.id}`, C = `pi_fake_9t6_c_${hex()}`;
    P.stripe.set(ref, [{ id: C, estado: 'hecho', centavos: 15000 }]);
    await ES.renovarRetenciones(X.b);
    const al = await idAlerta('gateway_review', ref);
    const r0 = await RV.decidirRevision(S, al, C, 'La de otro monto vale.');
    ok(!r0.ok && /no vale/.test(r0.msg) && await revisiones('hold_renewals', h.id) === 0, `una retención con otro monto no puede valer («${r0.msg}»)`);
    const r = await RV.decidirRevision(S, al, 'ninguno', 'Otro monto: se suelta.');
    h = await renovDe(E.pago);
    ok(r.ok && h.st === 'failed' && h.err === 'devuelto' && P.liberados.has(C) && (await pago(E.pago)).st === 'released', `«ninguno»: la hallada se suelta, la vieja también y la renovación falla «devuelto» (${h.err})`);
    ok(avisosDe('hold_no_renovada', X.u).length === 1 && avisosDe('hold_fallo', X.u).length === 0 && avisosDe('biz_hold_fallo', X.b).length === 1, 'la persona lee «no se pudo renovar» (no «tu banco no dejó»)');
    avisados.length = 0;
  }

  console.log('3 · Plan del Hogar con varios cobros en Stripe: elegir cuál vale');
  {
    const A = `pi_fake_9t6_pa_${hex()}`, B = `pi_fake_9t6_pb_${hex()}`;
    const L = await planEnRevision(X, [{ id: A, estado: 'hecho', centavos: 14900 }, { id: B, estado: 'hecho', centavos: 14900 }]);
    let f = await filaAlerta('gateway_review', L.ref);
    ok(!!L.alerta && f?.revisar?.vale.includes(A) && f.revisar.vale.includes(B) && f.revisar.ninguno === true && (await intencion('plan', L.id)).st === 'pending', 'varios cobros: gateway_review con qué elegir (lo dice el servidor)');
    const r1 = await RV.decidirRevision(S, L.alerta, `pi_fake_9t6_no_${hex()}`, 'Vale este otro.');
    ok(!r1.ok && /no está entre/.test(r1.msg) && await revisiones('offsession_charges', L.a.id) === 0, `uno que no está entre lo hallado: rechazado («${r1.msg}»)`);
    P.stripe.set(L.ref, [{ id: A, estado: 'hecho', centavos: 14900 }, { id: B, estado: 'en_curso', centavos: 14900 }]);
    const r2 = await RV.decidirRevision(S, L.alerta, A, 'Vale el primero.');
    ok(!r2.ok && /en curso/.test(r2.msg) && await revisiones('offsession_charges', L.a.id) === 0, `Stripe vuelve a contestar y uno sigue en curso: no se decide todavía («${r2.msg}»)`);
    P.stripe.set(L.ref, [{ id: A, estado: 'hecho', centavos: 14900 }, { id: B, estado: 'hecho', centavos: 14900 }]);
    P.caida = true;
    const r3 = await RV.decidirRevision(S, L.alerta, A, 'Vale el primero.');
    P.caida = false;
    ok(!r3.ok && /no contestó/.test(r3.msg) && await revisiones('offsession_charges', L.a.id) === 0, `la pasarela no contesta al decidir: no cambia nada («${r3.msg}»)`);
    const rn = await alertas.notaAlerta(S, L.alerta, 'resuelta', 'Lo vi en Stripe.');
    ok(!rn.ok && /Elegir cuál vale/.test(rn.msg), `«Resuelta» sin decidir no se deja (la intención seguiría en camino): «${rn.ok ? '' : rn.msg}»`);
    // Dos personas a la vez: una sola decisión, una devolución, un cierre.
    const [x1, x2] = await Promise.all([RV.decidirRevision(S, L.alerta, A, 'Duplicado: vale el primero.'), RV.decidirRevision(S2, L.alerta, A, 'Duplicado: vale el primero (otra).')]);
    const a = await intencion('plan', L.id), dv = await devsDe('offsession_charges', L.a.id);
    const s = await q1(`select charges_ok::int as n from plan_subscriptions where id = $1::bigint`, [L.id]);
    ok([x1, x2].filter((x) => x.ok).length === 1 && [x1, x2].some((x) => !x.ok && /otra persona/.test(x.msg)) && await revisiones('offsession_charges', L.a.id) === 1,
      `dos personas a la vez: una decide, la otra lee «ya lo decidió otra persona» (${[x1, x2].map((x) => (x.ok ? 'ok' : x.msg)).join(' | ')})`);
    ok(a.st === 'done' && a.pi === A && s.n === 1 && await n1(`select count(*)::int as n from payments where operation_id = $1::bigint and stripe_payment_intent = $2`, [L.op, A]) === 1,
      `la intención se cierra con el elegido por el cierre del flujo (el plan avanza, un pago en el libro) (${a.st})`);
    ok(dv.length === 1 && dv[0].stripe === B && dv[0].st === 'done' && dv[0].n === 14900 && dv[0].plataforma === false && P.llamadasCon(dv[0].k) === 1 && P.devs.get(dv[0].k)?.meta.tl_intencion === `gateway_refunds:${dv[0].id}`,
      `lo que sobra (${B}) se devuelve una vez, con su llave y su dato buscable (${dv[0]?.st})`);
    ok(await auditadas('dinero.alerta.decidir', L.alerta, 'money_alert') === 1 && (await filaAlerta('gateway_review', L.ref))?.estado === 'resuelta', 'una auditoría y la alerta resuelta');
  }
  {
    const A = `pi_fake_9t6_ma_${hex()}`, B = `pi_fake_9t6_mb_${hex()}`;
    const L = await planEnRevision(X, [{ id: A, estado: 'hecho', centavos: 14900 }, { id: B, estado: 'hecho', centavos: 9900 }]);
    const r1 = await RV.decidirRevision(S, L.alerta, B, 'Vale el de 99.');
    ok(!r1.ok && /no vale/.test(r1.msg), `el elegido con otro monto: rechazado («${r1.msg}»)`);
    const r2 = await RV.decidirRevision(S, L.alerta, A, 'Vale el de 149.');
    const dv = await devsDe('offsession_charges', L.a.id);
    ok(r2.ok && (await intencion('plan', L.id)).pi === A && dv.length === 1 && dv[0].stripe === B && dv[0].n === 9900 && dv[0].st === 'done', `con el monto que cuadra, sí; se devuelve el otro por SU monto ($99) (${dv[0]?.st})`);
  }

  console.log('4 · Pro cobrado dos veces el mismo período');
  {
    const b = (await datos('NEG-FOOD')).b, pm = `pm_fake_9t6_${RUN}_${b}`;
    await db.query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp) values ($1, $2, 'visa', '4242', '12/30')`, [X.u, pm]);
    await db.query(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, current_period_end) values ($1, 'active', 'month', $2, $3, now() + interval '20 days')`, [b, X.u, pm]);
    const desde = (await q1(`select now() - interval '10 days' as d`)).d;
    await crudo((k) => k.query(`insert into subscription_charges (business_id, city_id, period_start, cycle, amount_cents, pm, payer_user_id, idem_key, status, stripe_pi, sent_at) values ($1, 'hzl', $2, 'month', 3000, $3, $4, $5, 'done', $6, now() - interval '26 hours')`,
      [b, desde, pm, X.u, `sub-${b}-y-${RUN}`, `pi_fake_9t6_y_${hex()}`]));
    const x = (await crudo((k) => k.query(`insert into subscription_charges (business_id, city_id, period_start, cycle, amount_cents, pm, payer_user_id, idem_key, status, attempts, last_error, sent_at, created_at, gateway_ref)
      values ($1, 'hzl', $2, 'month', 3000, $3, $4, $5, 'pending', 2, 'error', now() - interval '25 hours', now() - interval '25 hours', null) returning id::text`, [b, desde, pm, X.u, `sub-${b}-x-${RUN}`]))).rows[0].id;
    await crudo((k) => k.query(`update subscription_charges set gateway_ref = 'subscription_charges:' || id where id = $1::bigint`, [x]));
    const ref = `subscription_charges:${x}`, PX = `pi_fake_9t6_x_${hex()}`;
    P.stripe.set(ref, [{ id: PX, estado: 'hecho', centavos: 3000 }]);
    await SU.barrerCobrosPro();
    const al = await idAlerta('gateway_review', ref), f = await filaAlerta('gateway_review', ref);
    ok(!!al && f?.revisar?.vale.length === 0 && f.revisar.ninguno === true && (await q1(`select status from subscription_charges where id = $1::bigint`, [x])).status === 'pending',
      'la consulta lo halla hecho y el período ya estaba cobrado: gateway_review (solo se puede devolver)');
    const r1 = await RV.decidirRevision(S, al, PX, 'Vale este.');
    ok(!r1.ok && await revisiones('subscription_charges', x) === 0, `que valga otra vez el mismo período: rechazado («${r1.msg}»)`);
    const r2 = await RV.decidirRevision(S, al, 'ninguno', 'Se cobró dos veces el mismo período: devolver.');
    const c = await q1(`select status, last_error as err from subscription_charges where id = $1::bigint`, [x]), s = await q1(`select status, failed_attempts::int as n from subscriptions where business_id = $1`, [b]);
    const dv = await devsDe('subscription_charges', x);
    ok(r2.ok && c.status === 'failed' && c.err === 'devuelto' && s.status === 'active' && s.n === 0, `«ninguno»: la intención falla «devuelto», sin contar como cobro fallido (${c.err}, intento ${s.n})`);
    ok(dv.length === 1 && dv[0].stripe === PX && dv[0].plataforma === true && dv[0].st === 'done' && dv[0].n === 3000 && P.llamadasCon(dv[0].k) === 1, `se devuelve el cobro de más (directo a To'Latino: sin transferencia que revertir), una vez (${dv[0]?.st})`);
    ok(await cerradaSola('charge_stuck', `sub-${b}-x-${RUN}`) <= 1 && await alertasDe('charge_stuck', `sub-${b}-x-${RUN}`) <= 1, 'la alerta «sin respuesta», si la había, se cierra sola');
    // El período siguiente: el negocio se vuelve a cobrar (nada en camino lo bloquea).
    await db.query(`update subscriptions set current_period_end = now() - interval '1 hour' where business_id = $1`, [b]);
    P.para = `sub-${b}-`; P.plan = [];
    await SU.procesar(b);
    const C = (await db.query(`select status from subscription_charges where business_id = $1 and id > $2::bigint order by id`, [b, x])).rows;
    const s2 = await q1(`select status, to_char(current_period_end at time zone 'UTC', 'YYYY-MM-DD') as fin from subscriptions where business_id = $1`, [b]);
    ok(C.length === 1 && C[0].status === 'done' && s2.status === 'active' && s2.fin > new Date().toISOString().slice(0, 10), `el período siguiente se cobra una vez y el plan avanza (${C.map((y) => y.status).join(',')}, hasta ${s2.fin})`);
  }

  console.log('5 · La devolución de lo que sobró: sin respuesta no es «rechazado»');
  {
    const A = `pi_fake_9t6_da_${hex()}`, B = `pi_fake_9t6_db_${hex()}`;
    const L = await planEnRevision(X, [{ id: A, estado: 'hecho', centavos: 14900 }, { id: B, estado: 'hecho', centavos: 14900 }]);
    P.devPlan = ['red'];
    const r = await RV.decidirRevision(S, L.alerta, A, 'Duplicado: vale el primero.');
    let [d] = await devsDe('offsession_charges', L.a.id);
    ok(r.ok && /en camino/.test(r.msg) && d.st === 'pending' && d.intentos === 1 && await alertasDe('extra_refund_stuck', d.id) === 0, `Stripe no contesta la devolución: sigue en camino, sin «rechazada» ni alerta («${r.msg}»)`);
    await envejecer('gateway_refunds', d.id, 3);
    await RV.barrerDevolucionesSobra();
    [d] = await devsDe('offsession_charges', L.a.id);
    ok(d.st === 'done' && P.llamadasCon(d.k) === 2 && [...P.devs.keys()].filter((k) => k === d.k).length === 1, `el barrido la termina con la MISMA llave (una devolución en Stripe) (${d.st})`);
  }
  {
    const A = `pi_fake_9t6_ea_${hex()}`, B = `pi_fake_9t6_eb_${hex()}`;
    const L = await planEnRevision(X, [{ id: A, estado: 'hecho', centavos: 14900 }, { id: B, estado: 'hecho', centavos: 14900 }]);
    P.devPlan = ['red-pero-hizo'];
    await RV.decidirRevision(S, L.alerta, A, 'Duplicado: vale el primero.');
    let [d] = await devsDe('offsession_charges', L.a.id);
    await envejecer('gateway_refunds', d.id, 25 * 60);
    const n0 = P.llamadasCon(d.k);
    await RV.barrerDevolucionesSobra();
    [d] = await devsDe('offsession_charges', L.a.id);
    ok(d.st === 'done' && d.re === P.devs.get(d.k).id && P.llamadasCon(d.k) === n0 && await auditadas('dinero.consulta.cerrar', d.id, 'gateway_refunds') === 1,
      `salió y la respuesta se perdió: pasada la llave no se manda otra vez; la consulta la encuentra y se cierra (${d.st}, ${d.re})`);
  }
  {
    const A = `pi_fake_9t6_fa_${hex()}`, B = `pi_fake_9t6_fb_${hex()}`;
    const L = await planEnRevision(X, [{ id: A, estado: 'hecho', centavos: 14900 }, { id: B, estado: 'hecho', centavos: 14900 }]);
    P.devPlan = ['no'];
    const r = await RV.decidirRevision(S, L.alerta, A, 'Duplicado: vale el primero.');
    const [d] = await devsDe('offsession_charges', L.a.id);
    ok(r.ok && /rechazó/.test(r.msg) && d.st === 'failed' && await alertasDe('extra_refund_stuck', d.id) === 1 && (await intencion('plan', L.id)).st === 'done',
      `Stripe dijo que no a la devolución: queda fallida y el equipo recibe UNA alerta para hacerla por otro lado (${d.st}, ${d.err})`);
  }

  // La base: una decisión no se cambia ni se borra; una devolución viva por objeto de Stripe.
  {
    const g = await q1(`select id::text from gateway_reviews order by id desc limit 1`);
    let e1 = null; try { await db.query(`update gateway_reviews set note = 'otra' where id = $1::bigint`, [g.id]); } catch (e) { e1 = e.message; }
    const d = await q1(`select review_id::text as r, subject_kind as t, subject_id::text as s, medio, plataforma, stripe_id as x, amount_cents as n, business_id as b, city_id as c from gateway_refunds where status = 'done' order by id desc limit 1`);
    let e2 = null; try { await db.query(`insert into gateway_refunds (review_id, subject_kind, subject_id, medio, plataforma, stripe_id, amount_cents, idem_key, business_id, city_id) values ($1::bigint, $2, $3::bigint, $4, $5, $6, $7, $8, $9, $10)`, [d.r, d.t, d.s, d.medio, d.plataforma, d.x, d.n, `gwr-otra-${hex()}`, d.b, d.c]); } catch (e) { e2 = e.message; }
    ok(!!e1 && /solo de inserción/.test(e1) && !!e2 && /gateway_refunds_uno_por_objeto/.test(e2), 'la base: la decisión es solo de inserción y no deja dos devoluciones vivas del mismo cobro');
  }

  await db.end();
  console.log(`\n${checks - fallas}/${checks} · ${fallas ? 'FALLA' : 'bien'}`);
  process.exit(fallas ? 1 : 0);
})().catch(async (e) => { console.error('✗', e); try { await D.db().end(); } catch { /* */ } process.exit(1); });
