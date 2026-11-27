// 9t5 (21 nov) · «Preguntarle a la pasarela» (LAUNCH «Cobros fuera de sesión, lo que quedó de 9t4» y «Dinero por clase · lo que quedó» (2)): una intención
// de dinero «sin respuesta» ya no se queda en camino para siempre pasadas 23 h; el servidor le PREGUNTA a la pasarela por el dato propio que mandó al crear
// (metadata tl_intencion) y cierra con esa verdad. Contra la base de pruebas y con una pasarela de mentira (sin servidor), con los archivos REALES de
// apps/web (consulta-pasarela, cobro-fuera, planes, rentas, patrocinio, suscripcion, evt-liquidacion, cobros, dinero-alertas), transpilados con
// pruebas/lib/ts-servidor.cjs. La misma armazón que din9t3 y din9t4.
//   1. Plan del Hogar: el dato buscable se anota y se manda; sin respuesta y el cobro SÍ salió → a las 23 h se cierra hecho una vez (sin cobrar otra vez);
//      sin respuesta y NO salió → falla «nunca llegó» y el siguiente cobro del plan vuelve a salir; antes del margen no; la consulta que no contesta no
//      cambia nada; una intención vieja sin el dato no se da por «no llegó»; el banco dijo que no / en curso / varios; dos a la vez cierran una vez;
//      «Preguntar a Stripe ahora» (el Super Admin) con su auditoría, y la alerta que se cierra sola.
//   2. Renta: la que nunca llegó suelta su depósito y la renta apartada vuelve a poder cancelarse.
//   3. Pro: «se mandó» (sent_at) antes de la llamada; el período ya cobrado decide con sent_at; la consulta cierra el período o lo deja libre.
//   4. Transferencia al organizador: la consulta la cierra pagada o le devuelve su llave (la misma, el mismo monto).
//   5. El simulador del sandbox contesta igual (sus tarjetas ···· 0404 y ···· 0408 y la consulta caída).
//   6. «Ya cobrado» con el objeto todavía esperándolo (CI de 9t4, plan4f): el plan se pone al día sin cobrar otra vez; la renta y el patrocinio avisan al
//      equipo (no se quedan mudos en cada barrido).
// Uso: DATABASE_URL=… node pruebas/e2e/din9t5.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const { hoyCiudad } = require('../lib/hoy-ciudad.cjs');
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
const SU = {}, CF = {}, LQ = {}, K = {};
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: auditarStaff }, './suscripcion': SU, './cobro-fuera': CF, './evt-liquidacion': LQ,
  './consulta-pasarela': K });
// La pasarela de mentira: una vez por llave (como Stripe con Idempotency-Key), guarda la metadata de cada cobro y transferencia y contesta la consulta
// como Stripe (por la metadata tl_intencion). `stripe`: lo que la consulta encuentra para una intención (fallido, en curso, varios), en lugar de lo cobrado.
const hex = () => crypto.randomBytes(6).toString('hex');
const P = {
  modo: () => 'simulador', plan: [], para: null, cargos: new Map(), trans: new Map(), holds: new Map(), liberados: new Set(), stripe: new Map(), caida: false, idems: [], consultas: 0,
  paso(idem) { return this.plan.length && (!this.para || idem.startsWith(this.para)) ? this.plan.shift() : 'ok'; },
  cobro(x) {
    this.idems.push(x.idem);
    const paso = this.paso(x.idem);
    if (paso === 'red') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    if (paso === 'no') return { ok: false, codigo: 'card_declined', mensaje: { es: 'Tu banco la rechazó.', en: 'Declined.' } };
    const ya = this.cargos.get(x.idem);
    if (ya && ya.n !== x.centavos) return { ok: false, codigo: 'idempotency_error', mensaje: { es: '', en: '' } };
    if (!ya) this.cargos.set(x.idem, { id: `pi_fake_9t5_${hex()}`, n: x.centavos, meta: { ...x.meta } });
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    return { ok: true, id: this.cargos.get(x.idem).id, marca: 'visa', ultimos4: '4242' };
  },
  async cobrarFuera(x) { return this.cobro(x); },
  async cobrarDirecto(x) { return this.cobro(x); },
  async retener(x) {
    if (!this.holds.has(x.idem)) this.holds.set(x.idem, { pi: `pi_fake_9t5h_${hex()}`, n: x.centavos });
    return { ok: true, pi: this.holds.get(x.idem).pi, estado: 'retenido', marca: 'visa', ultimos4: '4242' };
  },
  async liberar(pi) { this.liberados.add(pi); return { ok: true }; },
  async transferir(x) {
    this.idems.push(x.idem);
    const paso = this.paso(x.idem);
    if (paso === 'red') return { ok: false, codigo: 'api_error' };
    if (!this.trans.has(x.idem)) this.trans.set(x.idem, { id: `tr_fake_9t5_${hex()}`, n: x.centavos, meta: { ...x.meta }, grupo: x.grupo });
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'api_error' };
    return { ok: true, id: this.trans.get(x.idem).id };
  },
  async buscarCobro(ref) {
    this.consultas++;
    if (this.caida) return { ok: false };
    const H = this.stripe.get(ref) ?? [...this.cargos.values()].filter((c) => c.meta.tl_intencion === ref).map((c) => ({ id: c.id, estado: 'hecho', centavos: c.n }));
    return H.length > 1 ? { ok: true, varios: H } : { ok: true, hallado: H[0] ?? null };
  },
  async buscarTransferencia(ref, grupo, liq) {
    this.consultas++;
    if (this.caida) return { ok: false };
    const H = [...this.trans.values()].filter((t) => t.grupo === grupo && (t.meta.tl_intencion === ref || t.meta.settlement === liq)).map((t) => ({ id: t.id, estado: 'hecho', centavos: t.n }));
    return H.length > 1 ? { ok: true, varios: H } : { ok: true, hallado: H[0] ?? null };
  },
  cliente: async () => null, intento: async () => null,
  cobrosCon(pref) { return [...this.cargos.keys()].filter((k) => k.startsWith(pref)).length; },
  llamadasCon(pref) { return this.idems.filter((k) => k.startsWith(pref)).length; },
};
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined } });
Object.assign(K, cargar('apps/web/lib/consulta-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas }));
const PL = {}, RE = {}, PA = {}, RR = {};
Object.assign(CF, cargar('apps/web/lib/cobro-fuera.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas, './planes': PL, './rentas': RE, './patrocinio': PA,
  './patrocinio-evento': {}, './consulta-pasarela': K }));
Object.assign(PL, cargar('apps/web/lib/planes.ts', { './dias-especiales': { cerradoElDia: () => false, diasEspeciales: async () => [] }, './fecha-local': { hoyEn: (z, d) => hoyCiudad(z, d) },
  './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './cobro-fuera': CF, './avisos': avisos }));
Object.assign(RE, cargar('apps/web/lib/rentas.ts', { './dias-especiales': { diasEspeciales: async () => [], rangosDia: () => [] }, './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './pagos/verificacion': { pideVerificar: () => null },
  './cobro-fuera': CF, './avisos': avisos, './renovar-retencion': RR, './consulta-pasarela': K }));
// 9t6 · barrerRentas renueva el depósito por lib/renovar-retencion.ts (y pregunta con lib/consulta-pasarela.ts): los módulos reales.
Object.assign(RR, cargar('apps/web/lib/renovar-retencion.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './cobro-fuera': CF, './consulta-pasarela': K, './dinero-alertas': alertas, './rentas': RE, './estimados': {} }));
Object.assign(PA, cargar('apps/web/lib/patrocinio.ts', { './config': { valores: async () => ({ patrocinio_semana_cents: 1500, patrocinio_mes_cents: 4500, patrocinio_puestos: 6, patrocinio_dias_adelante: 30 }) },
  './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './categoria': {}, './dinero-alertas': alertas, './avisos': avisos, './cobro-fuera': CF, './consulta-pasarela': K }));
Object.assign(SU, cargar('apps/web/lib/suscripcion.ts', { './db': D, './pagos/pasarela': { pasarela: P, registrarAccion: async () => undefined }, './plan': { PRECIO_PRO: 30 }, './avisos': avisos,
  './correo/recibos': { reciboPro: async () => undefined }, './dinero-alertas': alertas, './consulta-pasarela': K }));
const evtComun = { bi: (x) => x?.es ?? '', diaCorto: () => '', dinero: (c) => `$${(c / 100).toFixed(2)}`, hora: () => '', cuandoBi: () => ({ es: '', en: '' }) };
Object.assign(LQ, cargar('apps/web/lib/evt-liquidacion.ts', { './config': { cfgSql: () => '7', valor: async () => 2 }, './db': D, './evt-comun': evtComun, './pagos/pasarela': { pasarela: P },
  './cobros': cobros, './dinero-alertas': alertas, './avisos': avisos, './consulta-pasarela': K }));

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
const n1 = async (s, v = []) => Number((await q1(s, v)).n);
const RUN = hex();
// Lo que la app nunca escribe así (filas «de otro día»): con los triggers apagados en ESTA conexión y vueltos a encender antes de soltarla.
async function crudo(fn) {
  const k = await db.connect();
  try { await k.query('set session_replication_role = replica'); return await fn(k); } finally { await k.query('set session_replication_role = default').catch(() => undefined); k.release(); }
}
// Una intención «de hace N minutos»: anotada y mandada entonces (la consulta mira desde cuándo se mandó).
const envejecer = (t, id, min) => crudo((k) => k.query(`update ${t} set created_at = created_at - make_interval(mins => $2::int), sent_at = sent_at - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]));
const consultas = (t, id) => db.query(`select result, origin, staff_id::text as staff, stripe_id as stripe from gateway_checks where subject_kind = $1 and subject_id = $2::bigint order by id`, [t, id]).then((r) => r.rows);
const alertasDe = (kind, sujeto) => n1(`select count(*)::int as n from money_alerts where kind = $1 and subject_id = $2`, [kind, sujeto]);
const cerradaSola = (kind, sujeto) => n1(`select count(*)::int as n from money_alert_notes n join money_alerts a on a.id = n.alert_id where a.kind = $1 and a.subject_id = $2 and n.action = 'resuelta_sola' and n.staff_id is null`, [kind, sujeto]);
// Por acción, objeto y su tipo (los ids de tablas distintas se repiten).
const auditadas = (accion, id, tipo) => n1(`select count(*)::int as n from audit_entries where action = $1 and target_id = $2 and target_kind = $3`, [accion, String(id), tipo]);
const intenciones = (kind, ref) => db.query(`select id::text, status as st, idem_key as k, sent_at is not null as mandada, gateway_ref as gref, stripe_pi as pi, last_error as err, hold_pi as hold
                                              from offsession_charges where kind = $1 and ref_id = $2 order by id`, [kind, String(ref)]).then((r) => r.rows);
const avisosDe = (tpl, a) => avisados.filter((x) => x[2] === tpl && x[1] === a).length;
// Teléfonos de prueba: SIEMPRE +1570555xxxx, al azar, que no existan en la base ni sean de los que otra prueba o la semilla usa por su número.
async function tel() {
  for (let i = 0; i < 500; i++) {
    const t = `+1570555${String(crypto.randomInt(10000)).padStart(4, '0')}`;
    if (!esFijo(t) && !(await db.query(`select 1 from users where phone = $1`, [t])).rowCount) return t;
  }
  throw new Error('no quedó un +1570555xxxx libre');
}
async function datos(cat = 'NEG-HOGAR') {
  const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Consulta') returning id::text`, [await tel()])).id;
  const b = (await q1(`insert into businesses (id, city_id, category_id, name) values ($1, 'hzl', $2, 'Prueba 9t5') returning id`, [`p9x-${hex().slice(0, 8)}`, cat])).id;
  await db.query(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ($1, $2, 'enabled', true, true, true)`, [b, `acct_sim_9t5_${b}`]);
  return { u, b, pm: `pm_sim_visa_4242_${hex().slice(0, 8)}` };
}
const hoy = async () => (await q1(`select (now() at time zone 'America/New_York')::date::text as h`)).h;
// Un plan del Hogar de $149 que cobra hoy (como din9t4).
async function plan(X) {
  const it = (await q1(`insert into items (business_id, name, price_cents, svc_kind, sell, status) values ($1, '{"es":"Plan 9t5","en":"Plan 9t5"}'::jsonb, 14900, 'plan', true, 'live') returning id::text`, [X.b])).id;
  const num = `PL-5${String(Date.now()).slice(-6)}${crypto.randomInt(100)}`;
  const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, client_key) values ($1, 'plan', 'hzl', $2, $3, 'confirmed', '{"svc":{"es":"Plan 9t5","en":"Plan 9t5"}}'::jsonb, 14900, 14900, 'app', gen_random_uuid()) returning id::text`,
    [num, X.b, X.u])).id;
  const h = await hoy();
  const id = (await q1(`insert into plan_subscriptions (operation_id, business_id, user_id, city_id, item_id, price_cents, dow, nth, window_m, charge_day, first_visit_on, next_visit_on, next_charge_on, payment_method)
                         values ($1::bigint, $2, $3, 'hzl', $4::bigint, 14900, 2, 2, 540, 5, $5::date, null, $5::date, $6) returning id::text`, [op, X.b, X.u, it, h, X.pm])).id;
  return { id, num, op, idem0: `plan-${id}-${h}-i0`, pref: `plan-${id}-` };
}
const sub = (id) => q1(`select status as st, fail_count::int as fails, retry_on::text as retry, next_charge_on::text as next, charges_ok::int as cobros from plan_subscriptions where id = $1::bigint`, [id]);
const pagosDe = (op, kind) => n1(`select count(*)::int as n from payments where operation_id = $1::bigint and ($2::text is null or kind = $2)`, [op, kind ?? null]);
// Un plan cuyo cobro quedó «sin respuesta» hace `min` minutos (con lo que hizo Stripe según `paso`).
async function planSinRespuesta(X, paso, min = 25 * 60) {
  const L = await plan(X);
  P.para = L.pref; P.plan = [paso];
  await PL.barrerPlanes({ numero: L.num });
  const [a] = await intenciones('plan', L.id);
  await envejecer('offsession_charges', a.id, min);
  return { ...L, a, ref: `offsession_charges:${a.id}` };
}

(async () => {
  const X = await datos();
  const staffU = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Dinero') returning id::text`, [await tel()])).id;
  await db.query(`insert into staff_members (user_id, role, status) values ($1, 'admin', 'active') on conflict (user_id) do update set role = 'admin', status = 'active'`, [staffU]);
  const S = { id: staffU, role: 'admin', cities: [] };
  const filaAlerta = async (kind, sujeto) => (await alertas.alertasDinero(S, false, null, 300)).filas.find((a) => a.kind === kind && a.sujeto === sujeto);
  const idAlerta = async (kind, sujeto) => (await q1(`select id::text from money_alerts where kind = $1 and subject_id = $2`, [kind, sujeto]))?.id;

  console.log('1 · Plan del Hogar: preguntarle a la pasarela pasadas 23 h');
  {
    // Sin respuesta y el cobro SÍ salió: a las 23 h la consulta lo encuentra y se cierra hecho, una vez, sin cobrar otra vez.
    const L = await planSinRespuesta(X, 'red-pero-hizo', 0);
    const c0 = P.cargos.get(L.idem0);
    ok(L.a.st === 'pending' && L.a.mandada && L.a.gref === L.ref && c0?.meta.tl_intencion === L.ref,
      `se mandó con el dato buscable: la fila lo anota (gateway_ref) y Stripe lo recibe en la metadata (tl_intencion = ${c0?.meta.tl_intencion})`);
    await envejecer('offsession_charges', L.a.id, 25 * 60);
    const n0 = P.llamadasCon(L.pref);
    await CF.barrerCobrosFuera();
    const [a] = await intenciones('plan', L.id), s = await sub(L.id), C = await consultas('offsession_charges', L.a.id);
    ok(a.st === 'done' && a.pi === c0.id && P.cobrosCon(L.pref) === 1 && P.llamadasCon(L.pref) === n0, `la consulta lo encuentra y se cierra HECHA con el id de Stripe, sin volver a la pasarela con su llave (${a.st}, ${a.pi === c0.id ? 'mismo PI' : a.pi})`);
    ok(s.cobros === 1 && s.next > await hoy() && await pagosDe(L.op, 'plan') === 1 && avisosDe('plan_cobro', X.u) >= 1, `por el MISMO cierre del flujo: el período avanza, un pago en el libro, «cobro de tu plan» (${s.next})`);
    ok(C.length === 1 && C[0].result === 'hecho' && C[0].origin === 'barrido' && C[0].stripe === c0.id && await auditadas('dinero.consulta.cerrar', L.a.id, 'offsession_charges') === 1, 'la consulta queda anotada y la auditoría del cierre dice «consulta a la pasarela»');
    await CF.barrerCobrosFuera(); await PL.barrerPlanes({ numero: L.num });
    ok(P.cobrosCon(L.pref) === 1 && await pagosDe(L.op, 'plan') === 1 && (await consultas('offsession_charges', L.a.id)).length === 1, 'otra vuelta no pregunta ni cobra otra vez');
  }
  {
    // Sin respuesta y NO salió: «nunca llegó a la pasarela» (con el dato y pasado el margen); el plan no lo cuenta como rechazo y el siguiente cobro sale.
    const L = await planSinRespuesta(X, 'red');
    const nFallo = avisosDe('plan_fallo', X.u);
    await CF.barrerCobrosFuera();
    let I = await intenciones('plan', L.id), s = await sub(L.id);
    ok(I.length === 1 && I[0].st === 'failed' && I[0].err === 'nunca_llego' && P.cobrosCon(L.pref) === 0, `no está en Stripe: la intención falla «nunca llegó» (${I[0].st}, ${I[0].err})`);
    ok(s.st === 'active' && s.fails === 0 && s.retry === null && avisosDe('plan_fallo', X.u) === nFallo, `y no es un «no» del banco: el plan no suma un fallo ni avisa (${s.st}, ${s.fails})`);
    await PL.barrerPlanes({ numero: L.num });
    I = await intenciones('plan', L.id); s = await sub(L.id);
    ok(I.length === 2 && I[1].st === 'done' && I[1].k.endsWith('-i1') && P.cobrosCon(L.pref) === 1 && s.cobros === 1 && await pagosDe(L.op, 'plan') === 1,
      `el siguiente cobro del plan vuelve a poder salir (otra llave: ${I[1]?.k.split('-').pop()}) y cobra una vez`);
  }
  {
    // Antes del margen (mandada hace 23 h 30 min), «no está en Stripe» todavía no cuenta: la búsqueda de Stripe tarda en ver lo nuevo. Pasado el margen, sí.
    const L = await planSinRespuesta(X, 'red', 23 * 60 + 30);
    const r1 = await CF.resolverCobroFuera(L.a.id, { origen: 'barrido' });
    let [a] = await intenciones('plan', L.id);
    ok(r1.resultado === 'no_hallado' && r1.quedo === 'sigue' && a.st === 'pending', `mandada hace 23 h 30 min y no está en Stripe: sigue en camino (${r1.resultado}, ${r1.quedo})`);
    ok(await alertasDe('offsession_stuck', L.idem0) === 1 && (await filaAlerta('offsession_stuck', L.idem0))?.preguntar === true, 'con su alerta, que ofrece «Preguntar a Stripe ahora» (sigue en camino)');
    await envejecer('offsession_charges', L.a.id, 60);
    const r2 = await CF.resolverCobroFuera(L.a.id, { origen: 'barrido' });
    [a] = await intenciones('plan', L.id);
    ok(r2.quedo === 'no_llego' && a.st === 'failed' && a.err === 'nunca_llego', `pasado el margen (24 h 30 min), sí: falla «nunca llegó» (${r2.quedo})`);
    const f = await filaAlerta('offsession_stuck', L.idem0);
    ok(await cerradaSola('offsession_stuck', L.idem0) === 1 && f?.estado === 'resuelta' && f.preguntar === false && f.nota?.quien === "To'Latino" && f.consulta?.resultado === 'no_hallado',
      `la alerta se cerró sola (To'Latino, con lo que dijo la consulta) y ya no ofrece preguntar (${f?.estado})`);
  }
  {
    // Una intención VIEJA sin el dato buscable (se mandó antes de 9t5): nunca se da por «no llegó».
    const L = await plan(X), h = await hoy();
    const id = await crudo(async (k) => (await k.query(`insert into offsession_charges (kind, ref_id, purpose, operation_id, business_id, city_id, payer_user_id, amount_cents, fee_cents, destination, pm, idem_key, detail, status, sent_at, attempts, last_error, created_at)
      values ('plan', $1, $2, $3::bigint, $4, 'hzl', $5::uuid, 14900, 1192, $6, $7, $8, $9::jsonb, 'pending', now() - interval '30 hours', 3, 'error', now() - interval '30 hours') returning id::text`,
      [L.id, `periodo-${h}`, L.op, X.b, X.u, `acct_sim_9t5_${X.b}`, X.pm, L.idem0, JSON.stringify({ next: h, day: 5 })])).rows[0].id);
    await CF.barrerCobrosFuera(); await CF.resolverCobroFuera(id, { origen: 'barrido' });
    const [a] = await intenciones('plan', L.id), C = await consultas('offsession_charges', id);
    ok(a.st === 'pending' && C.length >= 1 && C.every((x) => x.result === 'no_hallado') && P.cobrosCon(L.pref) === 0, `sin dato buscable: Stripe no la encuentra, pero sigue en camino (${a.st}, ${C.length} consultas «no_hallado»)`);
    ok(await alertasDe('offsession_stuck', L.idem0) === 1 && (await sub(L.id)).fails === 0, 'con su alerta (una) y el plan sin rechazo: lo mira una persona en Stripe');
  }
  {
    // La consulta no contesta: nada cambia; la alerta sigue y dice qué dijo. El barrido no vuelve a preguntar enseguida. «Preguntar a Stripe ahora».
    P.caida = true;
    const L = await planSinRespuesta(X, 'red');
    await CF.barrerCobrosFuera();
    let [a] = await intenciones('plan', L.id), C = await consultas('offsession_charges', L.a.id);
    ok(a.st === 'pending' && C.length === 1 && C[0].result === 'sin_respuesta' && await alertasDe('offsession_stuck', L.idem0) === 1, `Stripe no contesta la consulta: nada cambia, la alerta queda (${a.st}, ${C[0]?.result})`);
    let f = await filaAlerta('offsession_stuck', L.idem0);
    ok(f && f.preguntar === true && f.consulta?.resultado === 'sin_respuesta' && f.consulta.origen === 'barrido' && !!f.consulta.at, 'la alerta muestra qué dijo la última consulta y cuándo, y ofrece «Preguntar a Stripe ahora»');
    await CF.barrerCobrosFuera();
    ok((await consultas('offsession_charges', L.a.id)).length === 1, 'el barrido no vuelve a preguntar por la misma intención antes de 15 min');
    P.caida = false;
    const aid = await idAlerta('offsession_stuck', L.idem0);
    const corta = await alertas.preguntarPorAlerta(S, aid, 'x');
    const r = await alertas.preguntarPorAlerta(S, aid, 'El negocio pregunta por este cobro.');
    [a] = await intenciones('plan', L.id); C = await consultas('offsession_charges', L.a.id);
    ok(!corta.ok && r.ok && /nunca llegó/.test(r.msg) && a.st === 'failed' && a.err === 'nunca_llego', `«Preguntar a Stripe ahora»: la misma consulta, ahora («${r.ok ? r.msg : r.msg}»)`);
    ok(C.length === 2 && C[1].origin === 'equipo' && C[1].staff === staffU && await auditadas('dinero.alerta.preguntar', aid, 'money_alert') === 1, 'queda anotada con quién la pidió y en la auditoría (con su nota)');
    f = await filaAlerta('offsession_stuck', L.idem0);
    const otra = await alertas.preguntarPorAlerta(S, aid, 'Otra vez, por si acaso.');
    ok(f?.estado === 'resuelta' && f.preguntar === false && !otra.ok, `ya no está en camino: la alerta se cerró sola y no se vuelve a preguntar («${otra.ok ? '' : otra.msg}»)`);
  }
  {
    // El banco dijo que no (Stripe tiene el cobro rechazado): la intención falla y el plan hace lo de un «no» (reintento en 2 días).
    const L = await planSinRespuesta(X, 'red');
    P.stripe.set(L.ref, [{ id: `pi_fake_9t5_no_${hex()}`, estado: 'fallido', centavos: 14900 }]);
    const r = await CF.resolverCobroFuera(L.a.id, { origen: 'barrido' });
    const [a] = await intenciones('plan', L.id), s = await sub(L.id);
    ok(r.quedo === 'fallida' && a.st === 'failed' && a.err === 'consulta_fallido' && s.fails === 1 && s.retry !== null, `el banco dijo que no: rechazada y el plan cuenta el fallo (${a.err}, ${s.fails}, ${s.retry})`);
    // En curso (p. ej. el banco pide verificar): sigue en camino con su alerta.
    const L2 = await planSinRespuesta(X, 'red');
    P.stripe.set(L2.ref, [{ id: `pi_fake_9t5_v_${hex()}`, estado: 'en_curso', centavos: 14900 }]);
    const r2 = await CF.resolverCobroFuera(L2.a.id, { origen: 'barrido' });
    ok(r2.resultado === 'en_curso' && r2.quedo === 'sigue' && (await intenciones('plan', L2.id))[0].st === 'pending' && (await filaAlerta('offsession_stuck', L2.idem0))?.consulta?.resultado === 'en_curso',
      'en curso en Stripe: sigue en camino y la alerta lo dice');
    // Varios para una sola intención: no se cierra solo; una alerta aparte (gateway_review).
    const L3 = await planSinRespuesta(X, 'red');
    P.stripe.set(L3.ref, [{ id: `pi_fake_9t5_a_${hex()}`, estado: 'hecho', centavos: 14900 }, { id: `pi_fake_9t5_b_${hex()}`, estado: 'hecho', centavos: 14900 }]);
    const r3 = await CF.resolverCobroFuera(L3.a.id, { origen: 'barrido' });
    ok(r3.resultado === 'varios' && (await intenciones('plan', L3.id))[0].st === 'pending' && await alertasDe('gateway_review', L3.ref) === 1 && (await sub(L3.id)).cobros === 0,
      'dos cobros para una intención: no se cierra solo y el equipo recibe UNA alerta gateway_review');
    // Otro monto: tampoco.
    const L4 = await planSinRespuesta(X, 'red');
    P.stripe.set(L4.ref, [{ id: `pi_fake_9t5_m_${hex()}`, estado: 'hecho', centavos: 999 }]);
    const r4 = await CF.resolverCobroFuera(L4.a.id, { origen: 'barrido' });
    ok(r4.resultado === 'monto_distinto' && (await intenciones('plan', L4.id))[0].st === 'pending' && await alertasDe('gateway_review', L4.ref) === 1, 'hallado con otro monto: no se cierra solo (gateway_review)');
  }
  {
    // Dos barridos a la vez, y el barrido con «Preguntar a Stripe ahora» a la vez: un solo cierre.
    const L = await planSinRespuesta(X, 'red-pero-hizo');
    const [u, v] = await Promise.all([CF.resolverCobroFuera(L.a.id, { origen: 'barrido' }), CF.resolverCobroFuera(L.a.id, { origen: 'barrido' })]);
    const s = await sub(L.id);
    ok([u.quedo, v.quedo].every((q) => q === 'hecha' || q === 'ya_no_estaba') && s.cobros === 1 && await pagosDe(L.op, 'plan') === 1 && await auditadas('dinero.consulta.cerrar', L.a.id, 'offsession_charges') === 1 && P.cobrosCon(L.pref) === 1,
      `dos a la vez: hecha una vez (un pago, un período, una auditoría) (${u.quedo}, ${v.quedo})`);
    P.caida = true;
    const L2 = await planSinRespuesta(X, 'red-pero-hizo');
    await CF.barrerCobrosFuera();
    P.caida = false;
    // La consulta anterior, de hace días: el barrido le toca primero.
    await crudo((k) => k.query(`update gateway_checks set at = at - interval '10 days' where subject_kind = 'offsession_charges' and subject_id = $1::bigint`, [L2.a.id]));
    const aid = await idAlerta('offsession_stuck', L2.idem0);
    const [, pr] = await Promise.all([CF.barrerCobrosFuera(), alertas.preguntarPorAlerta(S, aid, 'Lo reviso con el negocio.')]);
    const s2 = await sub(L2.id), [a2] = await intenciones('plan', L2.id);
    ok(a2.st === 'done' && s2.cobros === 1 && await pagosDe(L2.op, 'plan') === 1 && await auditadas('dinero.consulta.cerrar', L2.a.id, 'offsession_charges') === 1 && await cerradaSola('offsession_stuck', L2.idem0) === 1,
      `el barrido y el equipo a la vez: hecha una vez, la alerta cerrada una vez («${pr.ok ? pr.msg : pr.msg}»)`);
  }

  console.log('2 · Renta: la que nunca llegó suelta su depósito y la renta vuelve a moverse');
  {
    const R = await datos();
    const it = (await q1(`insert into items (business_id, module, name, price_cents, deposit_cents, stock_mode, stock_left, sell, status) values ($1, 'renta', '{"es":"Taladro 9t5","en":"Drill 9t5"}'::jsonb, 2500, 5000, 'qty', 5, true, 'live') returning id::text`, [R.b])).id;
    const num = `T-5${String(Date.now()).slice(-6)}${crypto.randomInt(100)}`, h = await hoy();
    const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key) values ($1, 'rental', 'hzl', $2, $3, 'confirmed', '{}'::jsonb, 5000, 5000, 5000, 'app', gen_random_uuid()) returning id::text`, [num, R.b, R.u])).id;
    const rid = (await q1(`insert into rentals (operation_id, business_id, user_id, city_id, item_id, item_name, price_cents, deposit_cents, days, rent_cents, pick_on, due_on, expires_at, payment_method, status)
                           values ($1::bigint, $2, $3, 'hzl', $4::bigint, '{"es":"Taladro 9t5","en":"Drill 9t5"}'::jsonb, 2500, 5000, 2, 5000, $5::date, $5::date + 2, now() + interval '2 days', $6, 'held') returning id::text`, [op, R.b, R.u, it, h, R.pm])).id;
    P.para = `renta-${rid}-`; P.plan = ['red'];
    await RE.rentaNegocio(R.b, num, { que: 'recogio' }, R.u);
    let [a] = await intenciones('renta', rid);
    const c1 = await RE.rentaCliente(R.u, num, 'cancelar');
    ok(a.st === 'pending' && !!a.hold && !c1.ok, `sin respuesta: la renta queda apartada con el depósito retenido y no se cancela mientras va en camino (${a.st})`);
    await envejecer('offsession_charges', a.id, 25 * 60);
    const nh = P.holds.size;
    await CF.barrerCobrosFuera();
    [a] = await intenciones('renta', rid);
    const x = await q1(`select status as st from rentals where id = $1::bigint`, [rid]);
    ok(a.st === 'failed' && a.err === 'nunca_llego' && P.liberados.has(a.hold) && P.holds.size === nh && x.st === 'held', `nunca llegó: se suelta el depósito (sin retener otro) y la renta sigue apartada (${a.err}, ${x.st})`);
    ok(avisados.some((y) => y[0] === 'b' && y[1] === R.b && y[2] === 'biz_renta' && /nunca llegó a Stripe/.test(((q) => (q && typeof q === 'object' ? q.es : q) ?? '')(y[3]?.que))), 'y el negocio sabe que no se cobró nada y puede volver a tocar «La recogió»');
    const c2 = await RE.rentaCliente(R.u, num, 'cancelar');
    ok(c2.ok && (await q1(`select status as st from rentals where id = $1::bigint`, [rid])).st !== 'held', `la renta apartada ya se puede cancelar (antes quedaba atorada para siempre) (${c2.ok ? 'ok' : c2.msg.es})`);
  }

  console.log('3 · Pro: «se mandó» antes de la llamada y la consulta');
  const pmDe = async (u, b) => { const pm = `pm_fake_${RUN}_${b}`; await db.query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp) values ($1, $2, 'visa', '4242', '12/30')`, [u, pm]); return pm; };
  const proSub = (b) => q1(`select status, failed_attempts::int as n, to_char(current_period_end at time zone 'UTC', 'YYYY-MM-DD') as fin from subscriptions where business_id = $1`, [b]);
  const cobrosPro = (b) => db.query(`select id::text, status, idem_key as k, sent_at is not null as mandada, gateway_ref as gref, stripe_pi as pi, last_error as err from subscription_charges where business_id = $1 order by id`, [b]).then((r) => r.rows);
  const nEv = (b, kind) => n1(`select count(*)::int as n from subscription_events where business_id = $1 and kind = $2`, [b, kind]);
  async function proSinRespuesta(paso) {
    const b = (await datos('NEG-FOOD')).b, pm = await pmDe(X.u, b);
    await db.query(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, current_period_end) values ($1, 'active', 'month', $2, $3, now() - interval '1 hour')`, [b, X.u, pm]);
    P.para = `sub-${b}-`; P.plan = [paso];
    await SU.procesar(b);
    const [c] = await cobrosPro(b);
    return { b, pm, c, ref: `subscription_charges:${c.id}` };
  }
  {
    const T = await proSinRespuesta('red-pero-hizo');
    const cargo = [...P.cargos.entries()].find(([k]) => k.startsWith(`sub-${T.b}-`))?.[1];
    ok(T.c.status === 'pending' && T.c.mandada && T.c.gref === T.ref && cargo?.meta.tl_intencion === T.ref && (await proSub(T.b)).n === 0,
      'el cobro de Pro anota «se mandó» (sent_at) y su dato buscable ANTES de la llamada, y Stripe lo recibe en la metadata');
    await envejecer('subscription_charges', T.c.id, 25 * 60);
    await SU.procesar(T.b); await SU.barrerCobrosPro();
    const [c] = await cobrosPro(T.b), s = await proSub(T.b);
    ok(c.status === 'done' && c.pi === cargo.id && s.status === 'active' && s.fin > hoyCiudad() && P.cobrosCon(`sub-${T.b}-`) === 1, `sin respuesta y sí salió: la consulta cierra el período por registrarPeriodo, una vez (${s.status}, ${s.fin})`);
    ok(await nEv(T.b, 'charged') === 1 && await auditadas('dinero.consulta.cerrar', c.id, 'subscription_charges') === 1, 'un «cobrado» y la auditoría con el origen «consulta a la pasarela»');
  }
  {
    const T = await proSinRespuesta('red');
    await envejecer('subscription_charges', T.c.id, 25 * 60);
    const r = await SU.resolverCobroPro(T.c.id, { origen: 'barrido' });
    let C = await cobrosPro(T.b), s = await proSub(T.b);
    ok(r.quedo === 'no_llego' && C[0].status === 'failed' && C[0].err === 'nunca_llego' && s.status === 'active' && s.n === 0, `nunca llegó: falla sin contar como «cobro fallido» (${C[0].err}, intento ${s.n})`);
    await SU.procesar(T.b);
    C = await cobrosPro(T.b); s = await proSub(T.b);
    ok(C.length === 2 && C[1].status === 'done' && C[1].k === `${C[0].k}-r1` && P.cobrosCon(`sub-${T.b}-`) === 1 && s.fin > hoyCiudad(), `procesar vuelve a cobrar con OTRA llave (${C[1]?.k.split('-').pop()}), una vez, y el período avanza`);
  }
  {
    // El período ya cobrado: una intención de ese período que NUNCA se mandó (sin sent_at) se suelta; una que se mandó (aunque attempts = 0: el proceso
    // murió en la llamada) no: alerta, porque Stripe pudo cobrarla también.
    const b = (await datos('NEG-FOOD')).b, pm = await pmDe(X.u, b);
    await db.query(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, current_period_end) values ($1, 'active', 'month', $2, $3, now() + interval '20 days')`, [b, X.u, pm]);
    const desde = (await q1(`select now() - interval '10 days' as d`)).d;
    await crudo((k) => k.query(`insert into subscription_charges (business_id, city_id, period_start, cycle, amount_cents, pm, payer_user_id, idem_key, status, stripe_pi, sent_at) values ($1, 'hzl', $2, 'month', 3000, $3, $4, $5, 'done', 'pi_hecho', now())`, [b, desde, pm, X.u, `sub-${b}-hecho-${RUN}`]));
    await crudo((k) => k.query(`insert into subscription_charges (business_id, city_id, period_start, cycle, amount_cents, pm, payer_user_id, idem_key, status, attempts, sent_at, created_at) values ($1, 'hzl', $2, 'month', 3000, $3, $4, $5, 'pending', 0, now() - interval '5 minutes', now() - interval '5 minutes')`, [b, desde, pm, X.u, `sub-${b}-murio-${RUN}`]));
    await SU.barrerCobrosPro();
    const m = await q1(`select status from subscription_charges where idem_key = $1`, [`sub-${b}-murio-${RUN}`]);
    ok(m.status === 'pending' && await alertasDe('charge_stuck', `sub-${b}-murio-${RUN}`) === 1 && !P.cargos.has(`sub-${b}-murio-${RUN}`), `mandada (sent_at) aunque attempts = 0: no se suelta sin preguntar; alerta (${m.status})`);
    await crudo((k) => k.query(`update subscription_charges set status = 'failed' where idem_key = $1`, [`sub-${b}-murio-${RUN}`]));
    await db.query(`insert into subscription_charges (business_id, city_id, period_start, cycle, amount_cents, pm, payer_user_id, idem_key) values ($1, 'hzl', $2, 'month', 3000, $3, $4, $5)`, [b, desde, pm, X.u, `sub-${b}-nueva-${RUN}`]);
    await crudo((k) => k.query(`update subscription_charges set created_at = now() - interval '5 minutes' where idem_key = $1`, [`sub-${b}-nueva-${RUN}`]));
    await SU.barrerCobrosPro();
    const n = await q1(`select status, last_error as err, sent_at is null as sin from subscription_charges where idem_key = $1`, [`sub-${b}-nueva-${RUN}`]);
    ok(n.status === 'failed' && n.err === 'periodo_ya_cobrado' && n.sin && !P.cargos.has(`sub-${b}-nueva-${RUN}`), `nunca mandada (sin sent_at): se suelta sin ir a Stripe (${n.status}, ${n.err})`);
    let cambia = null;
    try { await db.query(`update subscription_charges set sent_at = now() where idem_key = $1`, [`sub-${b}-hecho-${RUN}`]); } catch (e) { cambia = e.message; }
    ok(!!cambia && /sent_at se anota una vez|solo en camino/.test(cambia), 'la base no deja reescribir cuándo se mandó');
  }

  console.log('4 · Transferencia al organizador: la consulta la cierra o le devuelve su llave');
  let EV = 0;
  async function liquidacion(biz, net, min) {
    return crudo(async (k) => {
      const e = (await k.query(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, approved_at)
                                 values ($1, 'hzl', $2, 'noche', '{"es":"Prueba 9t5","en":"Test 9t5"}'::jsonb, current_date - 10, 1200, 1320, 'tickets', 'done', now()) returning id::text`, [`p9x-${RUN}-${++EV}`, biz])).rows[0].id;
      const f = (await k.query(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date) values ($1::bigint, 'hzl', now() - interval '10 days', now() - interval '10 days' + interval '2 hours', now() - interval '10 days', current_date - 10) returning id::text`, [e])).rows[0].id;
      const id = (await k.query(`insert into event_settlements (event_date_id, event_id, business_id, city_id, pay_on, status, idem_key, gross_cents, base_cents, net_cents, destination, paying_at)
                                  values ($1::bigint, $2::bigint, $3, 'hzl', current_date - 3, 'paying', 'evt-liq-' || $1, $4, $4, $4, 'acct_fake_9t5', now() - make_interval(mins => $5::int)) returning id::text`, [f, e, biz, net, min])).rows[0].id;
      return { id, e, f, idem: `evt-liq-${f}`, ref: `event_settlements:${id}` };
    });
  }
  const liq = (id) => q1(`select status as st, transfer_id as tr, sent_at is not null as mandada, gateway_ref as gref, key_from is not null as reabierta, last_error as err from event_settlements where id = $1::bigint`, [id]);
  {
    // Sin respuesta y la transferencia SÍ salió: a las 23 h, pagada con esa transferencia, una vez.
    const L = await liquidacion(X.b, 3000, 5);
    P.para = L.idem; P.plan = ['red-pero-hizo'];
    await LQ.repararLiquidaciones();
    let s = await liq(L.id);
    ok(s.st === 'paying' && s.mandada && s.gref === L.ref && P.trans.get(L.idem)?.meta.tl_intencion === L.ref, 'la transferencia se manda con su dato buscable (en la fila y en la metadata)');
    await crudo((k) => k.query(`update event_settlements set paying_at = paying_at - interval '25 hours', sent_at = sent_at - interval '25 hours' where id = $1::bigint`, [L.id]));
    await LQ.repararLiquidaciones(); await LQ.repararLiquidaciones();
    s = await liq(L.id);
    ok(s.st === 'paid' && s.tr === P.trans.get(L.idem).id && P.llamadasCon(L.idem) === 1 && await auditadas('evento.liquidacion.pagar', L.id, 'event_settlement') === 1, `la consulta la encuentra: pagada con esa transferencia, una vez, sin volver a mandarla (${s.st})`);
    // Sin respuesta y NO salió: su llave vuelve a valer (la misma, el mismo monto) y el barrido la manda otra vez.
    const L2 = await liquidacion(X.b, 2000, 5);
    P.para = L2.idem; P.plan = ['red'];
    await LQ.repararLiquidaciones();
    await crudo((k) => k.query(`update event_settlements set paying_at = paying_at - interval '25 hours', sent_at = sent_at - interval '25 hours' where id = $1::bigint`, [L2.id]));
    await LQ.repararLiquidaciones();
    s = await liq(L2.id);
    ok(s.st === 'paying' && s.reabierta && s.err === 'nunca_llego' && await auditadas('evento.liquidacion.reintentar', L2.id, 'event_settlement') === 1, `nunca llegó: su llave vuelve a valer, con su auditoría (${s.err})`);
    await LQ.repararLiquidaciones();
    s = await liq(L2.id);
    ok(s.st === 'paid' && P.trans.has(L2.idem) && P.trans.get(L2.idem).n === 2000 && s.tr === P.trans.get(L2.idem).id, 'el barrido la manda otra vez con la MISMA llave y el MISMO monto: pagada, una transferencia');
    // La consulta no contesta: sigue en camino y alerta.
    P.caida = true;
    const L3 = await liquidacion(X.b, 1500, 25 * 60);
    await LQ.repararLiquidaciones();
    P.caida = false;
    ok((await liq(L3.id)).st === 'paying' && await alertasDe('transfer_stuck', L3.id) === 1 && (await consultas('event_settlements', L3.id))[0]?.result === 'sin_respuesta', 'Stripe no contesta la consulta: sigue en camino y la alerta transfer_stuck queda');
  }

  console.log('5 · El simulador del sandbox contesta la consulta igual');
  {
    const ENT = { ENTORNO: 'pruebas' };
    const real = cargar('apps/web/lib/pagos/pasarela.ts', { '../db': D, '../entorno': ENT, './stripe': { ErrorStripe: class extends Error {}, stripe: async () => { throw new Error('sin Stripe'); }, stripeArchivo: async () => { throw new Error('sin Stripe'); } },
      '../tiendas/revision': { pagoBloqueado: async () => null } }).pasarela;
    const ref = (n) => `offsession_charges:9${String(Date.now()).slice(-8)}${n}`;
    const r1 = ref(1), r2 = ref(2), r3 = ref(3);
    const calla = await real.cobrarDirecto({ centavos: 1234, pm: 'pm_sim_visa_0404', idem: `sim9t5-${RUN}-a`, meta: { tl_intencion: r1 } });
    const b1 = await real.buscarCobro(r1);
    ok(!calla.ok && calla.codigo === 'red' && b1.ok && 'hallado' in b1 && b1.hallado === null, 'tarjeta ···· 0404: la pasarela no contesta y nada sale; la consulta dice «no está»');
    const cobra = await real.cobrarFuera({ centavos: 2500, comision: 200, destino: 'acct_sim_x', pm: 'pm_sim_visa_0408', idem: `sim9t5-${RUN}-b`, meta: { tl_intencion: r2 } });
    const b2 = await real.buscarCobro(r2), otra = await real.cobrarFuera({ centavos: 2500, comision: 200, destino: 'acct_sim_x', pm: 'pm_sim_visa_0408', idem: `sim9t5-${RUN}-b`, meta: { tl_intencion: r2 } });
    ok(!cobra.ok && cobra.codigo === 'red' && b2.ok && 'hallado' in b2 && b2.hallado?.estado === 'hecho' && b2.hallado.centavos === 2500 && otra.ok && otra.id === b2.hallado.id,
      'tarjeta ···· 0408: el cobro SÍ sale aunque la llamada no contestó; la consulta lo encuentra y la misma llave dice «hecho»');
    await real.cobrarDirecto({ centavos: 900, pm: 'pm_sim_visa_0002', idem: `sim9t5-${RUN}-c`, meta: { tl_intencion: r3 } });
    const b3 = await real.buscarCobro(r3);
    process.env.TOLATINO_SIM_CONSULTA = 'caida';
    const b4 = await real.buscarCobro(r2);
    delete process.env.TOLATINO_SIM_CONSULTA;
    ok(b3.ok && 'hallado' in b3 && b3.hallado?.estado === 'fallido' && !b4.ok, 'un rechazo del banco se encuentra como «fallido»; con la consulta caída contesta { ok: false } (nunca «no está»)');
    const L = await liquidacion(X.b, 777, 5);
    await real.transferir({ centavos: 777, destino: 'acct_sim_9t5', grupo: `evt-${L.e}`, idem: `sim9t5-${RUN}-t`, meta: { settlement: L.id, tl_intencion: L.ref } });
    const t1 = await real.buscarTransferencia(L.ref, `evt-${L.e}`, L.id);
    ok(t1.ok && 'hallado' in t1 && t1.hallado?.estado === 'hecho' && t1.hallado.centavos === 777, 'la transferencia del simulador se encuentra por su grupo y su metadata');
    await crudo((k) => k.query(`update event_settlements set status = 'paid', transfer_id = 'tr_sim_9t5_' || $2, paid_at = now() where id = $1::bigint`, [L.id, RUN]));
  }

  console.log('6 · «Ya cobrado» con el objeto todavía esperándolo: nunca mudo, nunca otro cobro');
  {
    // Plan: el período de hoy cobrado; alguien (un arreglo a mano) le devuelve el próximo cobro a hoy. Se pone al día SIN cobrar otra vez, una vez.
    const L = await plan(X), h = await hoy();
    P.para = L.pref; P.plan = [];
    await PL.barrerPlanes({ numero: L.num });
    const s1 = await sub(L.id);
    await db.query(`update plan_subscriptions set next_charge_on = $2::date where id = $1::bigint`, [L.id, h]);
    await PL.barrerPlanes({ numero: L.num }); await PL.barrerPlanes({ numero: L.num });
    const s2 = await sub(L.id);
    ok(s1.cobros === 1 && s2.next === s1.next && s2.next > h && P.cobrosCon(L.pref) === 1 && await pagosDe(L.op, 'plan') === 1, `el plan se pone al día (${s2.next}) sin otro cobro ni otro pago`);
    ok(await auditadas('plan.periodo_al_dia', L.id, 'plan_subscription') === 1 && await n1(`select count(*)::int as n from operation_events where operation_id = $1::bigint and kind = 'period_caught_up'`, [L.op]) === 1,
      'con su evento y su auditoría, una vez (otra vuelta no repite)');
  }
  {
    // Renta, «un día más»: el día cobrado y la renta otra vez con los días de antes. No contesta «listo» ni cobra otra vez: avisa al equipo.
    const R = await datos();
    const it = (await q1(`insert into items (business_id, module, name, price_cents, deposit_cents, stock_mode, stock_left, sell, status) values ($1, 'renta', '{"es":"Sierra 9t5","en":"Saw 9t5"}'::jsonb, 2500, 0, 'qty', 5, true, 'live') returning id::text`, [R.b])).id;
    const num = `T-6${String(Date.now()).slice(-6)}${crypto.randomInt(100)}`, h = await hoy();
    const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, client_key) values ($1, 'rental', 'hzl', $2, $3, 'confirmed', '{}'::jsonb, 5000, 5000, 'app', gen_random_uuid()) returning id::text`, [num, R.b, R.u])).id;
    const rid = (await q1(`insert into rentals (operation_id, business_id, user_id, city_id, item_id, item_name, price_cents, deposit_cents, days, rent_cents, pick_on, due_on, expires_at, payment_method, status, out_at)
                           values ($1::bigint, $2, $3, 'hzl', $4::bigint, '{"es":"Sierra 9t5","en":"Saw 9t5"}'::jsonb, 2500, 0, 2, 5000, $5::date, $5::date + 2, now() + interval '2 days', $6, 'out', now()) returning id::text`, [op, R.b, R.u, it, h, R.pm])).id;
    P.para = `renta-${rid}-`; P.plan = [];
    const r1 = await RE.rentaCliente(R.u, num, 'dia', undefined, crypto.randomUUID());
    await db.query(`update rentals set days = 2, due_on = due_on - 1 where id = $1::bigint`, [rid]);
    const [a] = await intenciones('renta', rid);
    const r2 = await RE.rentaCliente(R.u, num, 'dia', undefined, crypto.randomUUID());
    ok(r1.ok && !r2.ok && /ya se hizo y no se aplicó/.test(r2.msg.es) && P.cobrosCon(`renta-${rid}-`) === 1 && await alertasDe('offsession_unapplied', a.k) === 1,
      `renta: no contesta «listo» ni cobra otra vez; el equipo recibe UNA alerta («${r2.ok ? '' : r2.msg.es}»)`);
  }
  {
    // Patrocinio: la renovación ya cobrada y el patrocinio todavía vivo y vencido. Termina con su motivo y avisa al equipo; no renueva ni cobra otra vez.
    const PB = await datos('NEG-BELL');
    await db.query(`update businesses set status = 'active' where id = $1`, [PB.b]);
    await db.query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp) values ($1, $2, 'visa', '4242', '12/30')`, [PB.u, PB.pm]);
    const id = (await crudo((k) => k.query(`insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
                                             values ($1, 'NEG-BELL', 'hzl', now() - interval '7 days 1 minute', now() - interval '1 minute', 'week', 'activo', 1500, $2, $3, true) returning id::text`, [PB.b, PB.u, PB.pm]))).rows[0].id;
    const idem = `pat-negocio-renov-${id}`;
    await crudo((k) => k.query(`insert into offsession_charges (kind, ref_id, purpose, business_id, city_id, payer_user_id, amount_cents, pm, idem_key, status, stripe_pi, sent_at)
                                values ('patrocinio_negocio', $1, 'renovacion', $2, 'hzl', $3::uuid, 1500, $4, $5, 'done', $6, now())`, [id, PB.b, PB.u, PB.pm, idem, `pi_fake_9t5_pat_${hex()}`]));
    P.para = idem; P.plan = [];
    await PA.barrerPatrocinios(); await PA.barrerPatrocinios();
    const st = await q1(`select status as st, renew_note as nota from sponsorships where id = $1::bigint`, [id]);
    const nuevos = await n1(`select count(*)::int as n from sponsorships where renewed_from = $1::bigint`, [id]);
    ok(st.st === 'terminado' && /ya estaba cobrada/.test(st.nota ?? '') && nuevos === 0 && P.cobrosCon(idem) === 0 && await alertasDe('offsession_unapplied', idem) === 1,
      `patrocinio: termina con su motivo («${st.nota}»), no renueva ni cobra otra vez, UNA alerta`);
  }

  await db.end();
  console.log(`\n${checks - fallas}/${checks} · ${fallas ? 'FALLA' : 'bien'}`);
  process.exit(fallas ? 1 : 0);
})().catch(async (e) => { console.error('✗', e); try { await D.db().end(); } catch { /* */ } process.exit(1); });
