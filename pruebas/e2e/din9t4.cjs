// 9t4 (21 nov) · «Dinero por clase, 21 nov · lo que quedó» (LAUNCH, punto 4): los cobros con tarjeta guardada fuera de sesión (plan del Hogar cada mes,
// la renta al recoger, «un día más» y los días tarde, la renovación sola de un patrocinio) anotan su intención antes de la pasarela, como el cobro de
// Pro (din9t3). Contra la base de pruebas y con una pasarela de mentira (sin servidor), con los archivos REALES de apps/web (cobro-fuera, planes,
// rentas, patrocinio, cobros, dinero-alertas), transpilados con pruebas/lib/ts-servidor.cjs. La misma armazón que din9t, din9t2 y din9t3.
//   1. Plan: sin respuesta no es rechazo (ni fallo, ni reintento, ni aviso); el siguiente paso o el barrido lo termina con la MISMA llave; un «no» del
//      banco sí cuenta y el siguiente intento es otra llave; pasadas 23 h, la alerta y ningún cobro más; cancelado en camino: el cobro queda en el libro
//      y alerta (sin aplicarse); la base no deja dos cobros del mismo período ni dos en camino.
//   2. Renta: «La recogió» sin respuesta deja la renta apartada y el depósito retenido con la llave de la intención; otro toque o el barrido terminan
//      con las mismas llaves (un depósito, una renta); un «no» suelta el depósito; «un día más» terminado a la vez por el toque y el barrido = un cobro; los días tarde quedan en
//      camino y el barrido los cobra; un cobro en camino no deja cancelar ni vencer el apartado.
//   3. Patrocinio: la renovación sola sin respuesta no termina el patrocinio ni avisa; el siguiente barrido renueva con la misma llave (un cobro, un
//      renglón en el libro); un «no» termina con su motivo; lo que nunca salió se suelta; lo que salió de un patrocinio ya terminado alerta; 23 h, alerta.
// Uso: DATABASE_URL=… node pruebas/e2e/din9t4.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const crypto = require('crypto');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };

// ── Los módulos reales, con lo de afuera de mentira ──
const D = cargar('apps/web/lib/db.ts');
const avisados = [];
const avisos = { avisar: async (u, t, v) => { avisados.push(['u', u, t, v]); }, avisarMuchos: async () => undefined, avisarNegocio: async (b, t, v) => { avisados.push(['b', b, t, v]); } };
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: async () => undefined } });
// La pasarela de mentira: una vez por llave (como Stripe con Idempotency-Key) y la cuenta de lo que salió de verdad. El plan es solo para las llaves de
// ESTA prueba (para): los barridos también terminan lo de otras corridas y no deben gastarlo.
const P = {
  modo: () => 'simulador', llamadas: 0, idems: [], plan: [], para: null, cargos: new Map(), holds: new Map(), liberados: new Set(),
  paso(idem) { return this.plan.length && (!this.para || idem.startsWith(this.para)) ? this.plan.shift() : 'ok'; },
  cobro(x) {
    this.llamadas++; this.idems.push(x.idem);
    const paso = this.paso(x.idem);
    if (paso === 'red') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    if (paso === 'no') return { ok: false, codigo: 'card_declined', mensaje: { es: 'Tu banco la rechazó.', en: 'Declined.' } };
    const ya = this.cargos.get(x.idem);
    if (ya && ya.n !== x.centavos) return { ok: false, codigo: 'idempotency_error', mensaje: { es: '', en: '' } };
    if (!ya) this.cargos.set(x.idem, { id: `pi_fake_9t4_${crypto.randomBytes(6).toString('hex')}`, n: x.centavos, destino: x.destino ?? null });
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    return { ok: true, id: this.cargos.get(x.idem).id, marca: 'visa', ultimos4: '4242' };
  },
  async cobrarFuera(x) { return this.cobro(x); },
  async cobrarDirecto(x) { return this.cobro(x); },
  async retener(x) {
    if (!this.holds.has(x.idem)) this.holds.set(x.idem, { pi: `pi_fake_9t4h_${crypto.randomBytes(6).toString('hex')}`, n: x.centavos });
    return { ok: true, pi: this.holds.get(x.idem).pi, estado: 'retenido', marca: 'visa', ultimos4: '4242' };
  },
  async liberar(pi) { this.liberados.add(pi); return { ok: true }; },
  cliente: async () => null,
  // 9t5 · La consulta a la pasarela (lo de más de 23 h): aquí no contesta; lo que hace con cada respuesta lo prueba din9t5.
  buscarCobro: async () => ({ ok: false }),
  cobrosCon(pref) { return [...this.cargos.keys()].filter((k) => k.startsWith(pref)).length; },
  holdsCon(pref) { return [...this.holds.keys()].filter((k) => k.startsWith(pref)).length; },
};
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined } });
const PL = {}, RE = {}, PA = {};
const K = cargar('apps/web/lib/consulta-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas });
const CF = cargar('apps/web/lib/cobro-fuera.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas, './planes': PL, './rentas': RE, './patrocinio': PA,
  './patrocinio-evento': {}, './consulta-pasarela': K });
Object.assign(PL, cargar('apps/web/lib/planes.ts', { './dias-especiales': { cerradoElDia: () => false, diasEspeciales: async () => [] }, './fecha-local': { hoyEn: () => new Date().toISOString().slice(0, 10) },
  './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './cobro-fuera': CF, './avisos': avisos }));
Object.assign(RE, cargar('apps/web/lib/rentas.ts', { './dias-especiales': { diasEspeciales: async () => [], rangosDia: () => [] }, './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P },
  './cobro-fuera': CF, './avisos': avisos }));
Object.assign(PA, cargar('apps/web/lib/patrocinio.ts', { './config': { valores: async () => ({ patrocinio_semana_cents: 1500, patrocinio_mes_cents: 4500, patrocinio_puestos: 6, patrocinio_dias_adelante: 30 }) },
  './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './categoria': {}, './dinero-alertas': alertas, './avisos': avisos, './cobro-fuera': CF }));

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
// 21 nov · Teléfonos de prueba SIEMPRE 570-555 (el repo es público) y con sus 10 dígitos. Antes salían de la hora: números que pueden ser de
// alguien y, donde pasaban por Number(), uno de cada diez con un dígito de menos (users_phone_check; din9t4 roja en el CI 44884103116).
const { esFijo } = require('../lib/telefonos-fijos.cjs');
const telNuevo = async () => { for (let i = 0; i < 400; i++) { const t = '570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); if (!esFijo(t) && !(await q1(`select 1 as x from users where phone = $1`, ['+1' + t]))) return '+1' + t; } throw new Error('no queda un teléfono 570-555 libre'); };
const n1 = async (s, v = []) => Number((await q1(s, v)).n);
// Lo que la app nunca escribe así (filas «de otro día»): con los triggers apagados en ESTA conexión y vueltos a encender antes de soltarla.
async function crudo(fn) {
  const k = await db.connect();
  try { await k.query('set session_replication_role = replica'); return await fn(k); } finally { await k.query('set session_replication_role = default').catch(() => undefined); k.release(); }
}
const alertasDe = (kind, sujeto) => n1(`select count(*)::int as n from money_alerts where kind = $1 and subject_id = $2`, [kind, sujeto]);
const intenciones = (kind, ref) => db.query(`select status as st, idem_key as k, attempts::int as n, purpose as para, sent_at is not null as mandada, hold_pi as hold from offsession_charges where kind = $1 and ref_id = $2 order by id`, [kind, String(ref)]).then((r) => r.rows);
const atrasar = (kind, ref, min) => crudo((k) => k.query(`update offsession_charges set created_at = created_at - make_interval(mins => $3::int) where kind = $1 and ref_id = $2 and status = 'pending'`, [kind, String(ref), min]));
const avisosDe = (tpl) => avisados.filter((a) => a[2] === tpl);
async function datos(cat = 'NEG-HOGAR') {
  const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Fuera') returning id::text`, [await telNuevo()])).id;
  const b = (await q1(`insert into businesses (id, city_id, category_id, name) values ($1, 'hzl', $2, 'Prueba 9t4') returning id`, [`p9w-${crypto.randomBytes(4).toString('hex')}`, cat])).id;
  await db.query(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ($1, $2, 'enabled', true, true, true)`, [b, `acct_sim_9t4_${b}`]);
  return { u, b, pm: `pm_sim_visa_4242_${crypto.randomBytes(4).toString('hex')}` };
}
const hoy = async () => (await q1(`select (now() at time zone 'America/New_York')::date::text as h`)).h;

// Un plan del Hogar de $149 que cobra hoy (sin visitas: next_visit_on nulo).
async function plan(X) {
  const it = (await q1(`insert into items (business_id, name, price_cents, svc_kind, sell, status) values ($1, '{"es":"Plan 9t4","en":"Plan 9t4"}'::jsonb, 14900, 'plan', true, 'live') returning id::text`, [X.b])).id;
  const num = `PL-9${String(Date.now()).slice(-6)}${crypto.randomInt(100)}`;
  const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, client_key) values ($1, 'plan', 'hzl', $2, $3, 'confirmed', '{"svc":{"es":"Plan 9t4","en":"Plan 9t4"}}'::jsonb, 14900, 14900, 'app', gen_random_uuid()) returning id::text`,
    [num, X.b, X.u])).id;
  const h = await hoy();
  const id = (await q1(`insert into plan_subscriptions (operation_id, business_id, user_id, city_id, item_id, price_cents, dow, nth, window_m, charge_day, first_visit_on, next_visit_on, next_charge_on, payment_method)
                         values ($1::bigint, $2, $3, 'hzl', $4::bigint, 14900, 2, 2, 540, 5, $5::date, null, $5::date, $6) returning id::text`, [op, X.b, X.u, it, h, X.pm])).id;
  return { id, num, op, idem0: `plan-${id}-${h}-i0`, pref: `plan-${id}-` };
}
const sub = (id) => q1(`select status as st, fail_count::int as fails, retry_on::text as retry, next_charge_on::text as next, charges_ok::int as cobros from plan_subscriptions where id = $1::bigint`, [id]);
const pagosDe = (op, kind) => n1(`select count(*)::int as n from payments where operation_id = $1::bigint and ($2::text is null or kind = $2)`, [op, kind ?? null]);

// Una renta de $25 al día por 2 días ($50) con depósito de $50, apartada para hoy (o ya fuera, con su día de devolver).
async function renta(X, o = {}) {
  const it = (await q1(`insert into items (business_id, module, name, price_cents, deposit_cents, stock_mode, stock_left, sell, status) values ($1, 'renta', '{"es":"Taladro 9t4","en":"Drill 9t4"}'::jsonb, 2500, $2, 'qty', 5, true, 'live') returning id::text`,
    [X.b, o.dep ?? 5000])).id;
  const num = `T-9${String(Date.now()).slice(-6)}${crypto.randomInt(100)}`;
  const h = await hoy();
  const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key) values ($1, 'rental', 'hzl', $2, $3, 'confirmed', '{}'::jsonb, 5000, 5000, $4, 'app', gen_random_uuid()) returning id::text`,
    [num, X.b, X.u, o.dep ?? 5000])).id;
  const rid = (await q1(`insert into rentals (operation_id, business_id, user_id, city_id, item_id, item_name, price_cents, deposit_cents, days, rent_cents, pick_on, due_on, expires_at, payment_method, status, out_at)
                          values ($1::bigint, $2, $3, 'hzl', $4::bigint, '{"es":"Taladro 9t4","en":"Drill 9t4"}'::jsonb, 2500, $5, 2, 5000, $6::date, $6::date + $8::int, now() + interval '2 days', $7, $9, $10) returning id::text`,
    [op, X.b, X.u, it, o.dep ?? 5000, h, X.pm, o.due ?? 2, o.st ?? 'held', o.st === 'out' ? new Date().toISOString() : null])).id;
  return { rid, num, op, pref: `renta-${rid}-` };
}
const rnt = (rid) => q1(`select status as st, days::int as dias, card_failed as cf, late_cents::int as late from rentals where id = $1::bigint`, [rid]);

(async () => {
  const X = await datos();

  console.log('1 · Plan del Hogar: la intención antes de la pasarela');
  {
    // Sin respuesta (nada salió): no es un rechazo.
    const L = await plan(X);
    P.para = L.pref; P.plan = ['red'];
    await PL.barrerPlanes({ numero: L.num });
    let s = await sub(L.id), I = await intenciones('plan', L.id);
    ok(s.st === 'active' && s.fails === 0 && s.retry === null && s.cobros === 0 && I.length === 1 && I[0].st === 'pending' && I[0].n === 1 && I[0].mandada,
      `sin respuesta: el plan no cambia (sin fallo ni reintento) y la intención queda en camino (${s.st}, ${s.fails}, ${I.map((x) => x.st)})`);
    ok(!avisosDe('plan_fallo').some((a) => a[1] === X.u), 'y a la persona no le llega «tu banco rechazó el cobro»');
    await PL.barrerPlanes({ numero: L.num });
    s = await sub(L.id); I = await intenciones('plan', L.id);
    ok(I.length === 1 && I[0].st === 'done' && P.cobrosCon(L.pref) === 1 && P.cargos.has(L.idem0) && s.cobros === 1 && s.next > await hoy() && await pagosDe(L.op, 'plan') === 1,
      `el siguiente paso la termina con la MISMA llave: un cobro, un pago, el período avanza (${s.next})`);
    await PL.barrerPlanes({ numero: L.num });
    ok(P.cobrosCon(L.pref) === 1 && await pagosDe(L.op, 'plan') === 1, 'mirar otra vez no cobra dos veces');
  }
  {
    // Stripe cobró pero la respuesta se perdió; lo termina el barrido de los cobros (la persona no abrió el plan).
    const L = await plan(X);
    P.para = L.pref; P.plan = ['red-pero-hizo'];
    await PL.barrerPlanes({ numero: L.num });
    ok((await sub(L.id)).cobros === 0 && await pagosDe(L.op) === 0, 'cobró pero no contestó: todavía nada en el libro ni en el plan');
    await atrasar('plan', L.id, 3);
    await CF.barrerCobrosFuera(); await CF.barrerCobrosFuera();
    const s = await sub(L.id), I = await intenciones('plan', L.id);
    ok(I.length === 1 && I[0].st === 'done' && P.cobrosCon(L.pref) === 1 && s.cobros === 1 && await pagosDe(L.op, 'plan') === 1 && avisosDe('plan_cobro').filter((a) => a[1] === X.u).length >= 1,
      `el barrido de los cobros la termina con su llave: un cobro, un pago, «cobro de tu plan» (${I.map((x) => x.st)})`);
  }
  {
    // Un «no» del banco: fallo, reintento a los 2 días; el siguiente intento es OTRA intención con otra llave.
    const L = await plan(X);
    P.para = L.pref; P.plan = ['no'];
    await PL.barrerPlanes({ numero: L.num });
    let s = await sub(L.id), I = await intenciones('plan', L.id);
    ok(s.fails === 1 && s.retry !== null && I.length === 1 && I[0].st === 'failed' && P.cobrosCon(L.pref) === 0, `el banco dice que no: fallo 1, reintento en 2 días, intención rechazada (${s.fails}, ${s.retry})`);
    await db.query(`update plan_subscriptions set retry_on = (now() at time zone 'America/New_York')::date where id = $1::bigint`, [L.id]);
    await PL.barrerPlanes({ numero: L.num });
    s = await sub(L.id); I = await intenciones('plan', L.id);
    ok(I.length === 2 && I[1].st === 'done' && I[1].k.endsWith('-i1') && I[0].k !== I[1].k && P.cobrosCon(L.pref) === 1 && s.fails === 0 && s.cobros === 1, `el reintento va con otra llave (${I.map((x) => x.k.split('-').pop())}) y cobra una vez`);
  }
  {
    // En camino y la persona cancela: el cobro que salió queda en el libro (sin aplicarse) y el equipo de dinero decide; el plan sigue cancelado.
    const L = await plan(X);
    P.para = L.pref; P.plan = ['red-pero-hizo'];
    await PL.barrerPlanes({ numero: L.num });
    await db.query(`update plan_subscriptions set status = 'cancelled', cancelled_at = now(), next_charge_on = null where id = $1::bigint`, [L.id]);
    await atrasar('plan', L.id, 3);
    await CF.barrerCobrosFuera(); await CF.barrerCobrosFuera();
    const s = await sub(L.id), I = await intenciones('plan', L.id);
    ok(s.st === 'cancelled' && s.cobros === 0 && I[0].st === 'done' && P.cobrosCon(L.pref) === 1 && await pagosDe(L.op, 'plan') === 1, `cancelado en camino: el plan sigue cancelado, el cobro que salió está en el libro (${s.st}, ${I[0].st})`);
    ok(await alertasDe('offsession_unapplied', L.idem0) === 1, 'y el equipo de dinero recibe UNA alerta offsession_unapplied');
    // Anotada y nunca mandada, y el plan se pausó: se suelta sin preguntar a Stripe.
    const L2 = await plan(X);
    await db.query(`insert into offsession_charges (kind, ref_id, purpose, operation_id, business_id, city_id, payer_user_id, amount_cents, fee_cents, destination, pm, idem_key, detail)
                    values ('plan', $1, $2, $3::bigint, $4, 'hzl', $5::uuid, 14900, 1192, $6, $7, $8, $9::jsonb)`,
      [L2.id, `periodo-${await hoy()}`, L2.op, X.b, X.u, `acct_sim_9t4_${X.b}`, X.pm, L2.idem0, JSON.stringify({ next: await hoy(), day: 5 })]);
    await db.query(`update plan_subscriptions set status = 'paused' where id = $1::bigint`, [L2.id]);
    await atrasar('plan', L2.id, 3);
    await CF.barrerCobrosFuera();
    const I2 = await intenciones('plan', L2.id);
    ok(I2[0].st === 'failed' && !P.idems.some((k) => k.startsWith(L2.pref)) && !P.cargos.has(L2.idem0), `nunca mandada y el plan ya no la espera: se suelta sin llamar a Stripe (${I2[0].st})`);
  }
  {
    // Pasadas 23 h sin respuesta: no se cobra otra vez, alerta una vez, y el plan no se da por fallido.
    const L = await plan(X), h = await hoy();
    await crudo((k) => k.query(`insert into offsession_charges (kind, ref_id, purpose, operation_id, business_id, city_id, payer_user_id, amount_cents, fee_cents, destination, pm, idem_key, detail, status, sent_at, attempts, last_error, created_at)
                                values ('plan', $1, $2, $3::bigint, $4, 'hzl', $5::uuid, 14900, 1192, $6, $7, $8, $9::jsonb, 'pending', now() - interval '24 hours', 3, 'error', now() - interval '24 hours')`,
      [L.id, `periodo-${h}`, L.op, X.b, X.u, `acct_sim_9t4_${X.b}`, X.pm, L.idem0, JSON.stringify({ next: h, day: 5 })]));
    await PL.barrerPlanes({ numero: L.num }); await PL.barrerPlanes({ numero: L.num }); await CF.barrerCobrosFuera();
    const s = await sub(L.id);
    ok(P.cobrosCon(L.pref) === 0, 'un cobro del plan de hace 24 h sin respuesta no vuelve a Stripe (ni el barrido del plan ni el de los cobros)');
    ok(await alertasDe('offsession_stuck', L.idem0) === 1, 'el equipo de dinero recibe UNA alerta offsession_stuck');
    ok(s.st === 'active' && s.fails === 0 && s.cobros === 0, `y no cuenta como rechazo: el plan no cambia (${s.st}, ${s.fails})`);
    let dup = null;
    try { await db.query(`insert into offsession_charges (kind, ref_id, purpose, business_id, payer_user_id, amount_cents, pm, idem_key) values ('plan', $1, 'periodo-x', $2, $3::uuid, 100, $4, $5)`, [L.id, X.b, X.u, X.pm, `${L.idem0}-otra`]); } catch (e) { dup = e.message; }
    ok(!!dup && /offsession_charges_una_en_camino/.test(dup), 'la base no deja anotar otro cobro de ese plan mientras uno sigue en camino');
    const f = (await alertas.alertasDinero({ id: X.u, role: 'admin', cities: [] }, false, null, 200)).filas.find((a) => a.kind === 'offsession_stuck' && a.sujeto === L.idem0);
    ok(f && f.aMano === false && /sin respuesta de Stripe en 23 h/.test(f.detalle.es), 'la alerta es informativa y dice que no se cobra otra vez');
  }
  {
    // La base: un solo cobro hecho por plan y período.
    const L = await plan(X);
    await PL.barrerPlanes({ numero: L.num });
    const h = await hoy();
    let dup = null;
    try {
      await crudo((k) => k.query(`insert into offsession_charges (kind, ref_id, purpose, business_id, payer_user_id, amount_cents, pm, idem_key, status, stripe_pi, sent_at) values ('plan', $1, $2, $3, $4::uuid, 100, $5, $6, 'done', 'pi_x', now())`,
        [L.id, `periodo-${h}`, X.b, X.u, X.pm, `${L.idem0}-dos`]));
    } catch (e) { dup = e.message; }
    ok(!!dup && /offsession_charges_un_cobro_por_proposito/.test(dup), 'la base no deja dos cobros hechos del mismo período');
    let borra = null; try { await db.query(`delete from offsession_charges where idem_key = $1`, [L.idem0]); } catch (e) { borra = e.message; }
    ok(!!borra && /no se borra/.test(borra), 'un cobro fuera de sesión no se borra (estados)');
  }

  console.log('2 · Renta: al recoger, un día más y los días tarde');
  const R = await datos('NEG-HOGAR');
  {
    // «La recogió» sin respuesta de Stripe en la renta: sigue apartada, el depósito retenido con la llave de la intención; otro toque termina con las mismas.
    const T = await renta(R);
    P.para = T.pref; P.plan = ['red'];
    const r1 = await RE.rentaNegocio(R.b, T.num, { que: 'recogio' }, R.u, (c) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id) values ('user', $1, 'renta.recogio', 'business', $2)`, [R.u, T.num]));
    let x = await rnt(T.rid), I = await intenciones('renta', T.rid);
    ok(!r1.ok && /quedó en camino/.test(r1.msg.es) && /no lo repitas/.test(r1.msg.es) && /on its way/.test(r1.msg.en), `el negocio lee «quedó en camino, no lo repitas» («${r1.ok ? '' : r1.msg.es}»)`);
    ok(x.st === 'held' && !x.cf && I.length === 1 && I[0].st === 'pending' && I[0].mandada && !!I[0].hold && await pagosDe(T.op) === 0, `la renta sigue apartada (no es «la tarjeta no pasó»), la intención en camino con su depósito (${x.st}, ${x.cf})`);
    ok(await n1(`select count(*)::int as n from audit_entries where action = 'renta.recogio' and target_id = $1`, [T.num]) === 1, 'la auditoría de quien tocó entró con la intención');
    const r2 = await RE.rentaNegocio(R.b, T.num, { que: 'recogio' }, R.u, (c) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id) values ('user', $1, 'renta.recogio', 'business', $2)`, [R.u, T.num]));
    x = await rnt(T.rid); I = await intenciones('renta', T.rid);
    ok(r2.ok && x.st === 'out' && I.length === 1 && I[0].st === 'done' && P.cobrosCon(T.pref) === 1 && P.holdsCon(T.pref) === 1, `otro toque termina ESA intención: la tiene, una renta cobrada, un depósito (${x.st})`);
    ok(await pagosDe(T.op, 'rental') === 1 && await pagosDe(T.op, 'security') === 1 && await n1(`select count(*)::int as n from audit_entries where action = 'renta.recogio' and target_id = $1`, [T.num]) === 1,
      'en el libro: una renta y un depósito; sin otra auditoría');
  }
  {
    // Un «no» del banco en la renta: se suelta el depósito, «cambia la tarjeta»; el siguiente toque es otra intención (otra llave).
    const T = await renta(R);
    P.para = T.pref; P.plan = ['no'];
    const r1 = await RE.rentaNegocio(R.b, T.num, { que: 'recogio' }, R.u);
    let x = await rnt(T.rid), I = await intenciones('renta', T.rid);
    const hold = P.holds.get(`${I[0].k}-dep`);
    ok(!r1.ok && /no pasó: no se cobró nada/.test(r1.msg.es) && x.st === 'held' && x.cf && I[0].st === 'failed' && hold && P.liberados.has(hold.pi), `el banco dice que no: nada cobrado, el depósito se suelta, «cambia la tarjeta» (${x.cf})`);
    const r2 = await RE.rentaNegocio(R.b, T.num, { que: 'recogio' }, R.u);
    x = await rnt(T.rid); I = await intenciones('renta', T.rid);
    ok(r2.ok && x.st === 'out' && I.length === 2 && I[1].k.endsWith('-i1') && P.cobrosCon(T.pref) === 1, `el siguiente toque es otra intención con otra llave y cobra (${I.map((y) => y.st)})`);
  }
  {
    // Cobró pero no contestó y el negocio no volvió a tocar: el barrido la termina (y le avisa al negocio). Mientras va en camino no se cancela ni vence.
    const T = await renta(R);
    P.para = T.pref; P.plan = ['red-pero-hizo'];
    await RE.rentaNegocio(R.b, T.num, { que: 'recogio' }, R.u);
    const c1 = await RE.rentaCliente(R.u, T.num, 'cancelar');
    const c2 = await RE.rentaNegocio(R.b, T.num, { que: 'cancelar' }, R.u);
    await db.query(`update rentals set expires_at = now() - interval '1 minute' where id = $1::bigint`, [T.rid]);
    await RE.barrerRentas({ numero: T.num });
    ok(!c1.ok && !c2.ok && /en camino/.test(c1.msg.es) && (await rnt(T.rid)).st === 'held', `con un cobro en camino no se cancela ni vence el apartado («${c1.ok ? '' : c1.msg.es}»)`);
    await atrasar('renta', T.rid, 3);
    await CF.barrerCobrosFuera(); await CF.barrerCobrosFuera();
    const x = await rnt(T.rid), I = await intenciones('renta', T.rid);
    ok(x.st === 'out' && I[0].st === 'done' && P.cobrosCon(T.pref) === 1 && P.holdsCon(T.pref) === 1 && await pagosDe(T.op, 'rental') === 1 && await pagosDe(T.op, 'security') === 1,
      `el barrido la termina con las mismas llaves: la tiene, una renta y un depósito (${x.st})`);
    ok(avisados.some((a) => a[0] === 'b' && a[1] === R.b && a[2] === 'biz_renta' && /ya se cobró/.test(a[3]?.que ?? '')), 'y le avisa al negocio que ya se cobró');
  }
  {
    // «Un día más»: sin respuesta, la fecha no se mueve y la persona lee «en camino»; dos toques a la vez cobran un día, una vez.
    const T = await renta(R, { st: 'out' });
    P.para = T.pref; P.plan = ['red'];
    const r1 = await RE.rentaCliente(R.u, T.num, 'dia');
    let x = await rnt(T.rid);
    ok(!r1.ok && /quedó en camino/.test(r1.msg.es) && !r1.tarjeta && x.dias === 2 && P.cobrosCon(T.pref) === 0, `sin respuesta: «quedó en camino», sin pedir otra tarjeta, la fecha no se mueve (${x.dias} días)`);
    const r2 = await RE.rentaCliente(R.u, T.num, 'dia');
    x = await rnt(T.rid);
    const I = await intenciones('renta', T.rid);
    ok(r2.ok && x.dias === 3 && P.cobrosCon(T.pref) === 1 && I.length === 1 && I[0].st === 'done' && await pagosDe(T.op, 'rental') === 1, `tocar otra vez termina ESA intención: un día más, un cobro (${x.dias} días, ${P.cobrosCon(T.pref)} cobro)`);
    // Dos que terminan la MISMA intención a la vez (el toque y el barrido): un cobro y un día, una vez.
    const T2 = await renta(R, { st: 'out' });
    P.para = T2.pref; P.plan = ['red'];
    await RE.rentaCliente(R.u, T2.num, 'dia');
    const a = await CF.enCamino('renta', T2.rid);
    const [u, v] = await Promise.all([RE.terminarCobroRenta(a), RE.terminarCobroRenta(a, true)]);
    const x2 = await rnt(T2.rid);
    ok(u.ok && v.ok && x2.dias === 3 && P.cobrosCon(T2.pref) === 1 && await pagosDe(T2.op, 'rental') === 1, `dos a la vez sobre la misma intención: un día más y un cobro, una vez (${x2.dias} días)`);
  }
  {
    // Los días tarde sin depósito: la devolución anota la intención en su transacción; sin respuesta queda en camino y el barrido la cobra.
    const T = await renta(R, { st: 'out', dep: 0, due: -2 });
    P.para = T.pref; P.plan = ['red-pero-hizo'];
    const r = await RE.rentaNegocio(R.b, T.num, { que: 'devolvio' }, R.u);
    let x = await rnt(T.rid), I = await intenciones('renta', T.rid);
    const aviso = avisados.filter((y) => y[2] === 'renta_devuelta' && y[1] === R.u).pop();
    ok(r.ok && x.st === 'back' && x.late === 0 && I.length === 1 && I[0].para === 'tarde' && I[0].st === 'pending' && await pagosDe(T.op) === 0, `devuelta 2 días tarde: el cobro de $50 queda en camino (${x.st}, ${I.map((y) => y.st)})`);
    ok(aviso && /quedó en camino/.test(aviso[3].que), `la persona lee que quedó en camino, no «se cobraron» («${aviso?.[3].que}»)`);
    await atrasar('renta', T.rid, 3);
    await CF.barrerCobrosFuera(); await CF.barrerCobrosFuera();
    x = await rnt(T.rid); I = await intenciones('renta', T.rid);
    ok(x.late === 5000 && I[0].st === 'done' && P.cobrosCon(T.pref) === 1 && await pagosDe(T.op, 'rental') === 1, `el barrido la termina con su llave: $50 cobrados una vez (${x.late})`);
  }

  console.log('3 · Patrocinio: la renovación sola');
  const PB = await datos('NEG-BELL');
  await db.query(`update businesses set status = 'active' where id = $1`, [PB.b]);
  await db.query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp) values ($1, $2, 'visa', '4242', '12/30')`, [PB.u, PB.pm]);
  const vivos = [];
  async function patrocinio() {
    const id = (await crudo((k) => k.query(`insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
                                             values ($1, 'NEG-BELL', 'hzl', now() - interval '7 days 1 minute', now() - interval '1 minute', 'week', 'activo', 1500, $2, $3, true) returning id::text`, [PB.b, PB.u, PB.pm]))).rows[0].id;
    vivos.push(id);
    return { id, idem: `pat-negocio-renov-${id}` };
  }
  const pat = (id) => q1(`select status as st, renew_note as nota from sponsorships where id = $1::bigint`, [id]);
  const nuevos = (id) => db.query(`select id::text, status as st from sponsorships where renewed_from = $1::bigint`, [id]).then((r) => r.rows);
  const libro = (idem) => n1(`select count(*)::int as n from sponsorship_payments where idem_key like $1 || '%'`, [idem]);
  {
    const S = await patrocinio();
    P.para = S.idem; P.plan = ['red-pero-hizo'];
    const n0 = avisados.length;
    await PA.barrerPatrocinios();
    let s = await pat(S.id), I = await intenciones('patrocinio_negocio', S.id);
    ok(s.st === 'activo' && !(await nuevos(S.id)).length && I.length === 1 && I[0].st === 'pending' && await libro(S.idem) === 0, `sin respuesta: el patrocinio no termina ni se renueva todavía; la intención en camino (${s.st}, ${I.map((x) => x.st)})`);
    ok(!avisados.slice(n0).some((a) => a[1] === PB.b && /patrocinio_(no_renovo|termino)/.test(a[2])), 'y al negocio no le llega «no se renovó»');
    await PA.barrerPatrocinios(); await PA.barrerPatrocinios();
    s = await pat(S.id); I = await intenciones('patrocinio_negocio', S.id);
    const N = await nuevos(S.id);
    ok(s.st === 'terminado' && N.length === 1 && N[0].st === 'activo' && I[0].st === 'done' && P.cobrosCon(S.idem) === 1 && await libro(S.idem) === 1, `el siguiente barrido renueva con la MISMA llave: un cobro, un renglón en el libro, un patrocinio nuevo (${s.st}, ${N.length})`);
    vivos.push(...N.map((x) => x.id));
  }
  {
    const S = await patrocinio();
    P.para = S.idem; P.plan = ['no'];
    await PA.barrerPatrocinios();
    const s = await pat(S.id), I = await intenciones('patrocinio_negocio', S.id);
    ok(s.st === 'terminado' && /rechaz/.test(s.nota ?? '') && I[0].st === 'failed' && P.cobrosCon(S.idem) === 0 && !(await nuevos(S.id)).length, `un «no» del banco: termina con su motivo («${s.nota}»)`);
  }
  {
    // Anotada y nunca mandada; el Super Admin lo terminó mientras: se suelta sin llamar a Stripe. Mandada y Stripe cobró: alerta sin aplicar.
    const S = await patrocinio();
    await db.query(`insert into offsession_charges (kind, ref_id, purpose, business_id, city_id, payer_user_id, amount_cents, pm, idem_key) values ('patrocinio_negocio', $1, 'renovacion', $2, 'hzl', $3::uuid, 1500, $4, $5)`, [S.id, PB.b, PB.u, PB.pm, S.idem]);
    await db.query(`update sponsorships set status = 'terminado', end_kind = 'admin', end_reason = 'Prueba 9t4', ended_at = now(), auto_renew = false where id = $1::bigint`, [S.id]);
    await atrasar('patrocinio_negocio', S.id, 3);
    await CF.barrerCobrosFuera();
    ok((await intenciones('patrocinio_negocio', S.id))[0].st === 'failed' && !P.idems.includes(S.idem), 'nunca mandada y el patrocinio ya terminó: se suelta sin llamar a Stripe');
    const S2 = await patrocinio();
    await db.query(`insert into offsession_charges (kind, ref_id, purpose, business_id, city_id, payer_user_id, amount_cents, pm, idem_key) values ('patrocinio_negocio', $1, 'renovacion', $2, 'hzl', $3::uuid, 1500, $4, $5)`, [S2.id, PB.b, PB.u, PB.pm, S2.idem]);
    await db.query(`update offsession_charges set sent_at = now() where idem_key = $1`, [S2.idem]);
    P.cargos.set(S2.idem, { id: `pi_fake_9t4_${crypto.randomBytes(6).toString('hex')}`, n: 1500 });
    await db.query(`update sponsorships set status = 'terminado', end_kind = 'admin', end_reason = 'Prueba 9t4', ended_at = now(), auto_renew = false where id = $1::bigint`, [S2.id]);
    await atrasar('patrocinio_negocio', S2.id, 3);
    await CF.barrerCobrosFuera(); await CF.barrerCobrosFuera();
    ok((await intenciones('patrocinio_negocio', S2.id))[0].st === 'done' && await alertasDe('offsession_unapplied', S2.idem) === 1 && !(await nuevos(S2.id)).length,
      'mandada y Stripe cobró, con el patrocinio ya terminado: queda hecha, no renueva, y UNA alerta offsession_unapplied');
  }
  {
    // Pasadas 23 h: ni el barrido del patrocinio ni el de los cobros la mandan; una alerta; el patrocinio no cambia por eso.
    const S = await patrocinio();
    await crudo((k) => k.query(`insert into offsession_charges (kind, ref_id, purpose, business_id, city_id, payer_user_id, amount_cents, pm, idem_key, status, sent_at, attempts, last_error, created_at)
                                values ('patrocinio_negocio', $1, 'renovacion', $2, 'hzl', $3::uuid, 1500, $4, $5, 'pending', now() - interval '24 hours', 2, 'error', now() - interval '24 hours')`, [S.id, PB.b, PB.u, PB.pm, S.idem]));
    await PA.barrerPatrocinios(); await PA.barrerPatrocinios(); await CF.barrerCobrosFuera();
    ok(P.cobrosCon(S.idem) === 0 && await alertasDe('offsession_stuck', S.idem) === 1 && (await pat(S.id)).st === 'activo', 'una renovación de hace 24 h sin respuesta no vuelve a Stripe; UNA alerta; el patrocinio no cambia');
  }
  // Los patrocinios de esta corrida dejan libre su puesto (la siguiente corrida cabe).
  await db.query(`update sponsorships set status = 'terminado', end_kind = 'admin', end_reason = 'Prueba 9t4', ended_at = coalesce(ended_at, now()), auto_renew = false where id = any($1::bigint[]) and status in ('activo', 'reservado')`, [vivos]);

  await db.end();
  console.log(`\n${checks - fallas}/${checks} · ${fallas ? 'FALLA' : 'bien'}`);
  process.exit(fallas ? 1 : 0);
})().catch(async (e) => { console.error('✗', e); try { await D.db().end(); } catch { /* */ } process.exit(1); });
