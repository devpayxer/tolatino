// 9t8 (21 nov) · Dinero, octava tanda (LAUNCH «lo que quedó de 9t3…9t7»): la devolución de lo no usado de un patrocinio (negocios y eventos) es una intención
// que le pregunta a la pasarela, como las demás devoluciones (9t7); «Un día más» de una renta lleva la clave del toque; y la renovación de un patrocinio de
// evento con la pasarela sin contestar (lo que din9t4 no recorría). Contra la base de pruebas y con una pasarela de mentira (sin servidor), con los archivos
// REALES de apps/web (patrocinio, patrocinio-evento, rentas, cobros, cobro-fuera, consulta-pasarela, devolucion-consulta, revision-pasarela, dinero-alertas),
// transpilados con pruebas/lib/ts-servidor.cjs. La misma armazón que din9t7.
//   1. La intención la anota la base al terminar (sin cobro, ninguna); sin respuesta queda en camino con su dato y el barrido la termina con la MISMA llave
//      (un renglón en el libro, la auditoría y el aviso, una vez).
//   2. Un «no» de Stripe: fallida, sin reintentos, la alerta de la intención y el mensaje de quien la terminó; «Resolver a mano» pregunta antes y marca.
//   3. Pasada la llave: salió y la respuesta se perdió (la consulta la cierra, sin otra llamada); no hallada antes del margen (sigue, alerta una vez, sin
//      preguntar más de una vez cada 15 min) y después (la MISMA intención con OTRA llave, sale una vez); varias (gateway_review: «Elegir cuál vale», solo
//      vale); fallida según la consulta; la consulta caída (no cambia nada).
//   4. «Preguntar a Stripe ahora» y «Resolver a mano» con Stripe diciendo que salió (se cierra como hecha, no a mano).
//   5. Una anotada antes de 0207 (sin el dato): nunca se pregunta ni se da por «no llegó»; solo alerta, una vez.
//   6. La base: empieza en camino; el dato una vez; la llave vuelve a valer solo pasada la ventana; a mano nunca sobre una hecha; no se borra.
//   7. Patrocinio de evento: la devolución (su intención, su aviso) y la renovación sola sin respuesta (la termina el siguiente barrido con la misma llave).
//   8. Renta: «Un día más» con la clave del toque (el mismo toque repetido nunca es otro día; otro toque sí; sin clave, nada).
// Uso: DATABASE_URL=… node pruebas/e2e/din9t8.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
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
// La pasarela de mentira: una vez por llave (como Stripe con Idempotency-Key), guarda la metadata y contesta la consulta como Stripe (las devoluciones de ESE
// cobro, por su metadata tl_intencion). `stripe`: lo que la consulta encuentra para una intención, en lugar de lo hecho. Los cobros fuera de sesión, como din9t4.
const P = {
  modo: () => 'simulador', hechas: new Map(), plan: [], para: null, stripe: new Map(), caida: false, idems: [], cargos: new Map(),
  paso(idem) { return this.plan.length && (!this.para || idem.startsWith(this.para)) ? this.plan.shift() : 'ok'; },
  async devolver(pi, n, idem, o = {}) {
    this.idems.push(idem);
    const paso = this.paso(idem);
    if (paso === 'red') return { ok: false, codigo: 'red' };
    if (paso === 'no') return { ok: false, codigo: 'charge_already_refunded' };
    if (!this.hechas.has(idem)) this.hechas.set(idem, { id: `re_fake_9t8_${hex()}`, objeto: pi, n, meta: { ...(o.meta ?? {}) }, plataforma: o.plataforma });
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'red' };
    return { ok: true, id: this.hechas.get(idem).id };
  },
  async buscarDevolucion(ref, medio, objeto) {
    if (this.caida) return { ok: false };
    const H = this.stripe.get(ref) ?? [...this.hechas.values()].filter((d) => d.objeto === objeto && d.meta.tl_intencion === ref).map((d) => ({ id: d.id, estado: 'hecho', centavos: d.n }));
    return H.length > 1 ? { ok: true, varios: H } : { ok: true, hallado: H[0] ?? null };
  },
  cobro(x) {
    this.idems.push(x.idem);
    const paso = this.paso(x.idem);
    if (paso === 'red') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    if (paso === 'no') return { ok: false, codigo: 'card_declined', mensaje: { es: 'Tu banco la rechazó.', en: 'Declined.' } };
    if (!this.cargos.has(x.idem)) this.cargos.set(x.idem, { id: `pi_fake_9t8_${hex()}`, n: x.centavos });
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    return { ok: true, id: this.cargos.get(x.idem).id, marca: 'visa', ultimos4: '4242' };
  },
  async cobrarFuera(x) { return this.cobro(x); },
  async cobrarDirecto(x) { return this.cobro(x); },
  async retener(x) { return { ok: true, pi: `pi_fake_9t8h_${hex()}`, estado: 'retenido', marca: 'visa', ultimos4: '4242' }; },
  liberar: async () => ({ ok: true }), cliente: async () => null, buscarCobro: async () => ({ ok: false }), buscarTransferencia: async () => ({ ok: false }),
  llamadasCon(k) { return this.idems.filter((x) => x === k).length; },
  cobrosCon(pref) { return [...this.cargos.keys()].filter((k) => k.startsWith(pref)).length; },
};
const K = {}, DC = {}, RV = {}, PA = {}, PE = {}, CF = {}, RE = {};
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: auditarStaff }, './consulta-pasarela': K, './devolucion-consulta': DC,
  './revision-pasarela': RV, './patrocinio': PA, './evt-liquidacion': {}, './cobro-fuera': CF, './suscripcion': {}, './renovar-retencion': {} });
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC });
Object.assign(K, cargar('apps/web/lib/consulta-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas }));
Object.assign(DC, cargar('apps/web/lib/devolucion-consulta.ts', { './db': D, './cobros': cobros, './consulta-pasarela': K, './boletos-despues': {}, './evt-liquidacion': {}, './revision-pasarela': RV,
  './admin': { auditar: auditarStaff }, './patrocinio': PA }));
Object.assign(CF, cargar('apps/web/lib/cobro-fuera.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas, './planes': {}, './rentas': RE, './patrocinio': PA,
  './patrocinio-evento': PE, './consulta-pasarela': K }));
Object.assign(RV, cargar('apps/web/lib/revision-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './cobro-fuera': CF, './dinero-alertas': alertas, './admin': { auditar: auditarStaff },
  './consulta-pasarela': K, './suscripcion': {}, './evt-liquidacion': {}, './renovar-retencion': {}, './devolucion-consulta': DC, './patrocinio': PA }));
const valoresPat = async () => ({ patrocinio_semana_cents: 1500, patrocinio_mes_cents: 4500, patrocinio_puestos: 6, patrocinio_dias_adelante: 30, patrocinio_evt_semana_cents: 2000, patrocinio_evt_mes_cents: 6000, patrocinio_evt_puestos: 6 });
Object.assign(PA, cargar('apps/web/lib/patrocinio.ts', { './config': { valores: valoresPat }, './db': D, './cobros': cobros, './cobro-fuera': CF, './pagos/pasarela': { pasarela: P }, './categoria': {},
  './dinero-alertas': alertas, './avisos': avisos, './consulta-pasarela': K, './patrocinio-evento': PE }));
Object.assign(PE, cargar('apps/web/lib/patrocinio-evento.ts', { './config': { valores: valoresPat }, './db': D, './pagos/pasarela': { pasarela: P }, './patrocinio': PA, './avisos': avisos, './cobro-fuera': CF,
  './cobros': cobros, './evt-publico': {} }));
Object.assign(RE, cargar('apps/web/lib/rentas.ts', { './dias-especiales': { diasEspeciales: async () => [], rangosDia: () => [] }, './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P },
  './cobro-fuera': CF, './avisos': avisos, './renovar-retencion': {}, './consulta-pasarela': K }));

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
const n1 = async (s, v = []) => Number((await q1(s, v)).n);
async function crudo(fn) {
  const k = await db.connect();
  try { await k.query('set session_replication_role = replica'); return await fn(k); } finally { await k.query('set session_replication_role = default').catch(() => undefined); k.release(); }
}
// «Hace N minutos»: la intención (anotada, mandada y su llave si volvió a valer) y sus consultas.
const envejecer = (id, min) => crudo(async (k) => {
  await k.query(`update sponsorship_refunds set created_at = created_at - make_interval(mins => $2::int), sent_at = sent_at - make_interval(mins => $2::int), key_from = key_from - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]);
  await k.query(`update gateway_checks set at = at - make_interval(mins => $2::int) where subject_kind = 'sponsorship_refunds' and subject_id = $1::bigint`, [id, min]);
});
const intPat = (kind, ref) => q1(`select id::text, status as st, gateway_ref as gref, sent_at is not null as mandada, key_n::int as kn, stripe_refund_id as re, last_error as err, idem_key as k, manual_at is not null as mano,
                                         attempts::int as n, amount_cents::int as amt from sponsorship_refunds where kind = $1 and ref_id = $2::bigint`, [kind, ref]);
const libro = (kind, ref) => db.query(`select refund_id as re, amount_cents::int as amt, idem_key as k from sponsorship_payments where kind = $1 and ref_id = $2::bigint and reason = 'devolucion'`, [kind, ref]).then((r) => r.rows);
const alertasDe = (kind, sujeto) => n1(`select count(*)::int as n from money_alerts where kind = $1 and subject_id = $2`, [kind, String(sujeto)]);
const idAlerta = async (kind, sujeto) => (await q1(`select id::text from money_alerts where kind = $1 and subject_id = $2`, [kind, String(sujeto)]))?.id;
const detalleDe = async (kind, sujeto) => (await q1(`select detail->>'es' as d from money_alerts where kind = $1 and subject_id = $2`, [kind, String(sujeto)]))?.d ?? '';
const cerradaSola = (kind, sujeto) => n1(`select count(*)::int as n from money_alert_notes n join money_alerts a on a.id = n.alert_id where a.kind = $1 and a.subject_id = $2 and n.action = 'resuelta_sola'`, [kind, String(sujeto)]);
const consultasDe = (id) => n1(`select count(*)::int as n from gateway_checks where subject_kind = 'sponsorship_refunds' and subject_id = $1::bigint`, [id]);
const auditadas = (accion, id, tipo) => n1(`select count(*)::int as n from audit_entries where action = $1 and target_id = $2 and target_kind = $3`, [accion, String(id), tipo]);
const falla = async (fn) => { try { await fn(); return ''; } catch (e) { return String(e.message ?? e); } };
async function tel() {
  for (let i = 0; i < 500; i++) {
    const t = `+1570555${String(crypto.randomInt(10000)).padStart(4, '0')}`;
    if (!esFijo(t) && !(await db.query(`select 1 from users where phone = $1`, [t])).rowCount) return t;
  }
  throw new Error('no quedó un +1570555xxxx libre');
}

(async () => {
  const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Octava') returning id::text`, [await tel()])).id;
  const b = (await q1(`insert into businesses (id, city_id, category_id, name, status) values ($1, 'hzl', 'NEG-BELL', 'Prueba 9t8', 'active') returning id`, [`p9w-${hex().slice(0, 8)}`])).id;
  await db.query(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ($1, $2, 'enabled', true, true, true)`, [b, `acct_sim_9t8_${b}`]);
  const pm = `pm_sim_visa_4242_${hex()}`;
  await db.query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp) values ($1, $2, 'visa', '4242', '12/30')`, [u, pm]);
  const staffU = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Dinero') returning id::text`, [await tel()])).id;
  await db.query(`insert into staff_members (user_id, role, status) values ($1, 'admin', 'active') on conflict (user_id) do update set role = 'admin', status = 'active'`, [staffU]);
  const S = { id: staffU, role: 'admin', cities: [] };
  const filaAlerta = async (kind, sujeto) => (await alertas.alertasDinero(S, false, null, 300)).filas.find((a) => a.kind === kind && a.sujeto === String(sujeto));
  // Un patrocinio reservado (empieza mañana) pagado con su cobro en el libro; `sinPago`: sin cobro.
  async function patrocinio(sinPago = false) {
    const id = (await crudo((k) => k.query(`insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
                                             values ($1, 'NEG-BELL', 'hzl', now() + interval '1 day', now() + interval '8 days', 'week', 'reservado', 1500, $2, $3, false) returning id::text`, [b, u, pm]))).rows[0].id;
    const pi = `pi_fake_9t8_${hex()}`;
    if (!sinPago) await db.query(`insert into sponsorship_payments (kind, ref_id, business_id, city_id, payer_user_id, amount_cents, pi, idem_key, card_brand, card_last4, reason) values ('negocio', $1::bigint, $2, 'hzl', $3, 1500, $4, $5, 'visa', '4242', 'compra')`,
      [id, b, u, pi, `pat-negocio-${b}-${crypto.randomUUID()}`]);
    return { id, pi, idem: `pat-dev-negocio-${id}` };
  }
  const terminar = (id) => PA.terminarPorAdmin(staffU, [], id, 'Prueba 9t8', true);
  // Terminado con devolución y Stripe sin contestar (`paso`), `min` minutos después.
  async function vieja(paso, min) {
    const T = await patrocinio();
    P.para = T.idem; P.plan = [paso];
    await terminar(T.id);
    const f = await intPat('negocio', T.id);
    await envejecer(f.id, min);
    return { ...T, f, ref: `sponsorship_refunds:${f.id}` };
  }

  console.log('1 · La intención la anota la base al terminar; «sin respuesta» no es «rechazado»');
  {
    const T = await patrocinio();
    ok(!(await intPat('negocio', T.id)), 'antes de terminar no hay intención');
    P.para = T.idem; P.plan = ['red'];
    const r = await terminar(T.id);
    const f = await intPat('negocio', T.id);
    ok(r.ok && /sigue pendiente/.test(r.msg.es) && f && f.st === 'pending' && f.amt === 1500 && f.k === T.idem && f.mandada && f.gref === `sponsorship_refunds:${f.id}` && f.n === 1 && !(await libro('negocio', T.id)).length,
      `terminar con devolución deja la intención (la base, al decidir cuánto): en camino, mandada con su dato, nada en el libro (${f?.st}, ${f?.gref})`);
    const n0 = avisados.length;
    await PA.devolverPendientes('negocio');
    const g = await intPat('negocio', T.id), L = await libro('negocio', T.id);
    ok(g.st === 'done' && L.length === 1 && L[0].re === g.re && L[0].amt === 1500 && P.llamadasCon(T.idem) === 2 && P.hechas.get(T.idem)?.meta.tl_intencion === g.gref && P.hechas.get(T.idem)?.plataforma === true,
      `el barrido la termina con la MISMA llave y su dato: hecha, un renglón en el libro (${L.length}), dos llamadas con ${T.idem}`);
    ok(await auditadas('patrocinio.devolver', b, 'business') >= 1 && avisados.slice(n0).some((a) => a[1] === b && a[2] === 'biz_patrocinio_devuelto'), 'con su auditoría y el aviso al negocio');
    await PA.devolverPendientes('negocio');
    ok(P.llamadasCon(T.idem) === 2 && (await libro('negocio', T.id)).length === 1, 'otro barrido no vuelve a la pasarela ni al libro');
    const T2 = await patrocinio(true);
    await terminar(T2.id);
    ok(!(await intPat('negocio', T2.id)) && P.llamadasCon(T2.idem) === 0, 'sin cobro en el libro no hay nada que devolver: ninguna intención, ninguna llamada');
  }

  console.log('2 · Un «no» de Stripe: fallida, sin reintentos; «Resolver a mano» pregunta antes');
  {
    const T = await patrocinio();
    P.para = T.idem; P.plan = ['no'];
    const r = await terminar(T.id);
    const f = await intPat('negocio', T.id), suj = `sponsorship_refunds:${f.id}`;
    ok(r.ok && /Stripe no aceptó la devolución/.test(r.msg.es) && f.st === 'failed' && f.err === 'charge_already_refunded' && await alertasDe('refund_stuck', suj) === 1 && /Stripe dijo que no/.test(await detalleDe('refund_stuck', suj)),
      `fallida (${f.st}), la alerta de la intención y quien la terminó lo lee («${r.msg.es.slice(0, 60)}…»)`);
    await PA.devolverPendientes('negocio'); await PA.devolverPendientes('negocio');
    ok(P.llamadasCon(T.idem) === 1 && (await intPat('negocio', T.id)).st === 'failed', 'el barrido no la reintenta (Stripe contesta lo mismo con la misma llave)');
    const a = await filaAlerta('refund_stuck', suj);
    ok(a && a.aMano === true && a.preguntar === false, `la alerta ofrece «Resolver a mano» (aMano ${a?.aMano}) y no «Preguntar» (ya no está en camino)`);
    const m = await alertas.notaAlerta(S, a.id, 'resuelta_a_mano', 'Se le mandó un cheque al negocio.');
    const g = await intPat('negocio', T.id);
    ok(m.ok && g.mano && g.st === 'failed' && await consultasDe(f.id) === 1, `«Resolver a mano» pregunta antes (Stripe no la tiene) y la marca, una vez (${g.mano})`);
    const m2 = await alertas.notaAlerta(S, a.id, 'resuelta_a_mano', 'Otra vez la misma nota.');
    ok(!m2.ok, 'una segunda vez no la marca otra vez');
  }

  console.log('3 · Pasada la llave: se le pregunta a la pasarela');
  {
    const V = await vieja('red-pero-hizo', 25 * 60);
    await PA.devolverPendientes('negocio');
    const g = await intPat('negocio', V.id), L = await libro('negocio', V.id);
    ok(g.st === 'done' && g.re === P.hechas.get(V.idem).id && L.length === 1 && L[0].re === g.re && P.llamadasCon(V.idem) === 1 && await consultasDe(V.f.id) === 1,
      `salió y la respuesta se perdió: la consulta la cierra con la de Stripe (${g.re}), sin otra llamada; un renglón`);
    ok(await auditadas('dinero.consulta.cerrar', V.f.id, 'sponsorship_refunds') === 1, 'con la auditoría del cierre por la consulta');
  }
  {
    const V = await vieja('red', 23 * 60 + 30);
    await PA.devolverPendientes('negocio');
    let g = await intPat('negocio', V.id);
    ok(g.st === 'pending' && g.kn === 0 && await consultasDe(V.f.id) === 1 && await alertasDe('refund_stuck', V.ref) === 1 && /El servidor le pregunta a Stripe/.test(await detalleDe('refund_stuck', V.ref)) && P.llamadasCon(V.idem) === 1,
      'no hallada antes del margen: sigue en camino, una alerta (el servidor sigue preguntando), ninguna llamada con la llave vieja');
    const a = await filaAlerta('refund_stuck', V.ref);
    ok(a && a.preguntar === true && a.aMano === true && a.consulta?.resultado === 'no_hallado', 'la alerta muestra la consulta y ofrece «Preguntar a Stripe ahora» y «Resolver a mano»');
    await PA.devolverPendientes('negocio');
    ok(await consultasDe(V.f.id) === 1, 'el barrido no vuelve a preguntar antes de 15 min');
    await envejecer(V.f.id, 60);
    await PA.devolverPendientes('negocio');
    g = await intPat('negocio', V.id);
    const L = await libro('negocio', V.id);
    ok(g.st === 'done' && g.kn === 1 && P.llamadasCon(`${V.idem}-r1`) === 1 && L.length === 1 && L[0].k === V.idem && await cerradaSola('refund_stuck', V.ref) === 1,
      `pasado el margen, nunca llegó: la MISMA intención vale con OTRA llave (${V.idem}-r1) y sale una vez; su alerta se cierra sola`);
    ok(await auditadas('dinero.consulta.cerrar', V.f.id, 'sponsorship_refunds') === 1 && (await q1(`select count(*)::int as n from audit_entries where action = 'patrocinio.devolver' and after->>'intencion' = $1`, [V.ref])).n === 1,
      'con la auditoría de «nunca llegó» (una) y la del cierre (una)');
  }
  {
    const V = await vieja('red', 25 * 60);
    P.stripe.set(V.ref, [{ id: `re_fake_9t8_a${hex()}`, estado: 'hecho', centavos: 1500, creado: '2026-11-20T10:00:00Z' }, { id: `re_fake_9t8_b${hex()}`, estado: 'hecho', centavos: 1500, creado: '2026-11-20T11:00:00Z' }]);
    await PA.devolverPendientes('negocio');
    const al = await idAlerta('gateway_review', V.ref);
    ok(al && (await intPat('negocio', V.id)).st === 'pending', 'varias en Stripe: gateway_review y la intención sigue en camino');
    const fr = await filaAlerta('gateway_review', V.ref);
    ok(fr?.revisar && fr.revisar.devuelve && fr.revisar.vale.length === 2 && fr.revisar.ninguno === false, 'la hoja ofrece elegir cuál vale (solo «vale», nunca «ninguno»)');
    const nin = await RV.decidirRevision(S, al, 'ninguno', 'Prueba 9t8 ninguno.');
    ok(!nin.ok, `«ninguno» no se deja («${nin.msg}»)`);
    const el = P.stripe.get(V.ref)[1].id;
    const d = await RV.decidirRevision(S, al, el, 'Prueba 9t8: vale la segunda.');
    const g = await intPat('negocio', V.id), L = await libro('negocio', V.id);
    ok(d.ok && g.st === 'done' && g.re === el && L.length === 1 && L[0].re === el, `«Elegir cuál vale»: hecha con la elegida (${g.re}), un renglón`);
    P.stripe.delete(V.ref);
  }
  {
    const V = await vieja('red', 25 * 60);
    P.stripe.set(V.ref, []);
    P.caida = true;
    await PA.devolverPendientes('negocio');
    ok((await intPat('negocio', V.id)).st === 'pending', 'la consulta caída: no cambia nada');
    P.caida = false;
    P.stripe.set(V.ref, [{ id: `re_fake_9t8_f${hex()}`, estado: 'fallido', centavos: 1500 }]);
    await envejecer(V.f.id, 20);
    await PA.devolverPendientes('negocio');
    const g = await intPat('negocio', V.id);
    // La alerta ya existía (la consulta caída la dejó «sin respuesta»): sigue abierta, muestra lo último que dijo Stripe y ofrece «Resolver a mano».
    const fa = await filaAlerta('refund_stuck', V.ref);
    ok(g.st === 'failed' && g.err === 'consulta_fallido' && fa?.aMano === true && fa?.consulta?.resultado === 'fallido' && fa?.estado === 'abierta' && P.llamadasCon(V.idem) === 1,
      'Stripe la tiene fallida: fallida como un «no» (sin otra llamada); su alerta sigue abierta con lo que dijo Stripe y «Resolver a mano»');
    P.stripe.delete(V.ref);
  }

  console.log('4 · «Preguntar a Stripe ahora» y «Resolver a mano» con Stripe diciendo que salió');
  {
    const V = await vieja('red', 23 * 60 + 30);
    await PA.devolverPendientes('negocio');
    const re = `re_fake_9t8_p${hex()}`;
    P.stripe.set(V.ref, [{ id: re, estado: 'hecho', centavos: 1500 }]);
    await envejecer(V.f.id, 60);
    const r = await alertas.preguntarPorAlerta(S, await idAlerta('refund_stuck', V.ref), 'Reviso la alerta de hoy.');
    const g = await intPat('negocio', V.id);
    ok(r.ok && /la devolución quedó hecha/.test(r.msg) && g.st === 'done' && g.re === re && (await libro('negocio', V.id)).length === 1 && await cerradaSola('refund_stuck', V.ref) === 1,
      `«Preguntar a Stripe ahora»: la misma función del barrido, hecha con la de Stripe («${r.msg.slice(0, 70)}…»)`);
    P.stripe.delete(V.ref);
  }
  {
    const V = await vieja('red', 23 * 60 + 30);
    await PA.devolverPendientes('negocio');
    const re = `re_fake_9t8_m${hex()}`;
    P.stripe.set(V.ref, [{ id: re, estado: 'hecho', centavos: 1500 }]);
    const r = await alertas.notaAlerta(S, await idAlerta('refund_stuck', V.ref), 'resuelta_a_mano', 'Se le mandó un cheque.');
    const g = await intPat('negocio', V.id);
    ok(r.ok && /sí salió/.test(r.msg ?? '') && g.st === 'done' && !g.mano && g.re === re && (await libro('negocio', V.id)).length === 1, '«Resolver a mano» con Stripe diciendo que salió: se cierra como hecha, no a mano');
    P.stripe.delete(V.ref);
    const W = await vieja('red', 23 * 60 + 30);
    await PA.devolverPendientes('negocio');
    P.caida = true;
    const r2 = await alertas.notaAlerta(S, await idAlerta('refund_stuck', W.ref), 'resuelta_a_mano', 'Se le mandó un cheque.');
    P.caida = false;
    ok(!r2.ok && !(await intPat('negocio', W.id)).mano, 'sin respuesta de la consulta, «Resolver a mano» no cambia nada');
  }

  console.log('5 · Una anotada antes de 0207 (sin el dato)');
  {
    const T = await patrocinio();
    await db.query(`update sponsorships set status = 'cancelado', end_kind = 'admin', end_reason = 'Prueba 9t8 vieja', ended_at = now() - interval '25 hours', auto_renew = false,
                      refund_cents = 1500, refund_days = 7, refund_motive = 'admin' where id = $1::bigint`, [T.id]);
    const f = await intPat('negocio', T.id);
    await crudo((k) => k.query(`update sponsorship_refunds set created_at = now() - interval '25 hours', sent_at = now() - interval '25 hours' where id = $1::bigint`, [f.id]));
    const suj = `sponsorship_refunds:${f.id}`;
    await PA.devolverPendientes('negocio'); await PA.devolverPendientes('negocio');
    ok(await consultasDe(f.id) === 0 && P.llamadasCon(T.idem) === 0 && await alertasDe('refund_stuck', suj) === 1 && /sin el dato/.test(await detalleDe('refund_stuck', suj)) && (await intPat('negocio', T.id)).st === 'pending',
      'sin el dato: no se pregunta ni se manda con la llave vieja; una alerta que dice mirar en Stripe');
  }

  console.log('6 · La base');
  {
    const T = await patrocinio();
    P.para = T.idem; P.plan = ['red'];
    await terminar(T.id);
    const f = await intPat('negocio', T.id);
    ok(/sent_at se anota una vez/.test(await falla(() => db.query(`update sponsorship_refunds set sent_at = now() + interval '1 minute' where id = $1::bigint`, [f.id]))), 'que se mandó, una vez');
    ok(/gateway_ref se anota una vez/.test(await falla(() => db.query(`update sponsorship_refunds set gateway_ref = 'sponsorship_refunds:1' where id = $1::bigint`, [f.id]))), 'el dato, una vez');
    ok(/pat_dev_llave/.test(await falla(() => db.query(`update sponsorship_refunds set key_from = now(), key_n = 1 where id = $1::bigint`, [f.id]))), 'la llave no vuelve a valer antes de 23 h');
    ok(/lo decidido no cambia/.test(await falla(() => db.query(`update sponsorship_refunds set amount_cents = 1 where id = $1::bigint`, [f.id]))), 'el monto no cambia');
    ok(/no se borra/.test(await falla(() => db.query(`delete from sponsorship_refunds where id = $1::bigint`, [f.id]))), 'no se borra');
    await PA.devolverPendientes('negocio');
    ok(/ya está hecha en Stripe/.test(await falla(() => db.query(`update sponsorship_refunds set manual_at = now(), manual_by = $2::uuid, manual_note = 'Prueba 9t8' where id = $1::bigint`, [f.id, staffU]))), 'a mano nunca sobre una hecha');
    const n = await q1(`insert into sponsorship_refunds (kind, ref_id, payment_id, business_id, city_id, pi, amount_cents, idem_key, status, sent_at, created_at) select 'negocio', $3::bigint, payment_id, business_id, city_id, pi, 1, 'pat-dev-prueba-' || $2, 'done', now(), now() - interval '9 days' from sponsorship_refunds where id = $1::bigint returning status, sent_at, created_at > now() - interval '1 minute' as hoy`, [f.id, hex(), 900000000000 + crypto.randomInt(1e9)]);
    ok(n.status === 'pending' && n.sent_at === null && n.hoy, 'una nueva siempre empieza en camino, sin mandar y con la fecha de hoy');
    // No deja una intención viva para los barridos de otras pruebas (su patrocinio no existe): queda fallida.
    await db.query(`update sponsorship_refunds set status = 'failed', last_error = 'prueba_9t8' where idem_key like 'pat-dev-prueba-%' and status = 'pending'`);
  }

  console.log('7 · Patrocinio de evento: la devolución y la renovación sola');
  const evs = [];
  async function patEvento(o = {}) {
    return crudo(async (k) => {
      const e = (await k.query(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, approved_at)
                                 values ($1, 'hzl', $2, 'noche', '{"es":"Prueba 9t8","en":"Test 9t8"}'::jsonb, current_date + 30, 1200, 1320, 'free', 'live', now()) returning id::text`, [`p9w-${hex()}`, b])).rows[0].id;
      await k.query(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, listable, status) values ($1::bigint, 'hzl', now() + interval '30 days', now() + interval '30 days 2 hours', now() + interval '30 days', current_date + 30, true, 'scheduled')`, [e]);
      const id = (await k.query(`insert into event_sponsorships (event_id, business_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
                                  values ($1::bigint, $2, 'hzl', $3::timestamptz, $4::timestamptz, 'week', 'activo', 2000, $5, $6, $7) returning id::text`,
        [e, b, o.vencido ? new Date(Date.now() - 7 * 864e5 - 60e3) : new Date(Date.now() - 864e5), o.vencido ? new Date(Date.now() - 60e3) : new Date(Date.now() + 6 * 864e5), u, pm, !!o.vencido])).rows[0].id;
      const pi = `pi_fake_9t8e_${hex()}`;
      await k.query(`insert into sponsorship_payments (kind, ref_id, business_id, city_id, payer_user_id, amount_cents, pi, idem_key, card_brand, card_last4, reason) values ('evento', $1::bigint, $2, 'hzl', $3, 2000, $4, $5, 'visa', '4242', 'compra')`,
        [id, b, u, pi, `pat-evento-${e}-${crypto.randomUUID()}`]);
      evs.push(id);
      return { id, e, pi };
    });
  }
  {
    const T = await patEvento();
    await db.query(`update event_sponsorships set status = 'terminado', end_kind = 'admin', end_reason = 'Prueba 9t8', ended_at = now(), auto_renew = false, refund_cents = 1000, refund_days = 3, refund_motive = 'admin' where id = $1::bigint`, [T.id]);
    const f = await intPat('evento', T.id);
    ok(f && f.st === 'pending' && f.k === `pat-dev-evento-${T.id}` && f.amt === 1000, 'la base anota la intención también para un patrocinio de evento');
    const n0 = avisados.length;
    const dev = await PA.devolverPatrocinio('evento', T.id);
    const g = await intPat('evento', T.id), L = await libro('evento', T.id);
    ok(dev === 1000 && g.st === 'done' && L.length === 1 && P.hechas.get(f.k)?.meta.tl_intencion === `sponsorship_refunds:${f.id}` && avisados.slice(n0).some((a) => a[2] === 'biz_patevt_devuelto'),
      `devuelta con su dato: hecha, un renglón, el aviso del evento (${dev})`);
  }
  {
    const T = await patEvento({ vencido: true });
    const idem = `pat-evento-renov-${T.id}`;
    P.para = idem; P.plan = ['red-pero-hizo'];
    await PE.barrerPatrociniosEventos();
    let s = await q1(`select status as st from event_sponsorships where id = $1::bigint`, [T.id]);
    const I = await db.query(`select status as st from offsession_charges where kind = 'patrocinio_evento' and ref_id = $1`, [T.id]).then((r) => r.rows);
    ok(s.st === 'activo' && I.length === 1 && I[0].st === 'pending' && !(await q1(`select 1 as x from event_sponsorships where renewed_from = $1::bigint`, [T.id])), 'renovación sin respuesta: el patrocinio de evento no termina ni se renueva todavía; la intención en camino');
    await PE.barrerPatrociniosEventos();
    s = await q1(`select status as st from event_sponsorships where id = $1::bigint`, [T.id]);
    const N = await db.query(`select id::text, status as st from event_sponsorships where renewed_from = $1::bigint`, [T.id]).then((r) => r.rows);
    evs.push(...N.map((x) => x.id));
    ok(s.st === 'terminado' && N.length === 1 && N[0].st === 'activo' && P.cobrosCon(idem) === 1 && await n1(`select count(*)::int as n from sponsorship_payments where idem_key like $1 || '%'`, [idem]) === 1,
      'el siguiente barrido renueva con la MISMA llave: un cobro, un renglón, un patrocinio nuevo');
  }

  console.log('8 · Renta: «Un día más» con la clave del toque');
  {
    const it = (await q1(`insert into items (business_id, module, name, price_cents, deposit_cents, stock_mode, stock_left, sell, status) values ($1, 'renta', '{"es":"Taladro 9t8","en":"Drill 9t8"}'::jsonb, 2500, 0, 'qty', 5, true, 'live') returning id::text`, [b])).id;
    const num = `T-8${String(Date.now()).slice(-6)}${crypto.randomInt(100)}`;
    const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, client_key) values ($1, 'rental', 'hzl', $2, $3, 'confirmed', '{}'::jsonb, 5000, 5000, 'app', gen_random_uuid()) returning id::text`, [num, b, u])).id;
    const rid = (await q1(`insert into rentals (operation_id, business_id, user_id, city_id, item_id, item_name, price_cents, deposit_cents, days, rent_cents, pick_on, due_on, expires_at, payment_method, status, out_at)
                           values ($1::bigint, $2, $3, 'hzl', $4::bigint, '{"es":"Taladro 9t8","en":"Drill 9t8"}'::jsonb, 2500, 0, 2, 5000, current_date, current_date + 2, now() + interval '2 days', $5, 'out', now()) returning id::text`, [op, b, u, it, pm])).id;
    const dias = async () => (await q1(`select days::int as d from rentals where id = $1::bigint`, [rid])).d;
    const pref = `renta-${rid}-`;
    const sin = await RE.rentaCliente(u, num, 'dia');
    ok(!sin.ok && await dias() === 2 && P.cobrosCon(pref) === 0, 'sin la clave del toque: no cobra');
    const c1 = crypto.randomUUID();
    P.para = pref; P.plan = ['red'];
    const r1 = await RE.rentaCliente(u, num, 'dia', undefined, c1);
    ok(!r1.ok && /quedó en camino/.test(r1.msg.es) && await dias() === 2, 'sin respuesta: en camino, la fecha no se mueve');
    const r2 = await RE.rentaCliente(u, num, 'dia', undefined, c1);
    ok(r2.ok && await dias() === 3 && P.cobrosCon(pref) === 1, `el mismo toque otra vez termina ESE cobro: un día (${await dias()} días)`);
    const r3 = await RE.rentaCliente(u, num, 'dia', undefined, c1);
    ok(r3.ok && await dias() === 3 && P.cobrosCon(pref) === 1, `el mismo toque con el día ya cobrado (la red se cortó): «listo» y ningún día más (${await dias()} días)`);
    const r4 = await RE.rentaCliente(u, num, 'dia', undefined, crypto.randomUUID());
    ok(r4.ok && await dias() === 4 && P.cobrosCon(pref) === 2, `otro toque (otra clave) sí es otro día (${await dias()} días)`);
    const [a, z] = await Promise.all([RE.rentaCliente(u, num, 'dia', undefined, c1), RE.rentaCliente(u, num, 'dia', undefined, c1)]);
    ok(a.ok && z.ok && await dias() === 4 && P.cobrosCon(pref) === 2, 'dos a la vez con la misma clave ya usada: ningún día más');
    ok(/offsession_charges_toque|duplicate/.test(await falla(() => db.query(`insert into offsession_charges (kind, ref_id, purpose, business_id, city_id, payer_user_id, amount_cents, pm, idem_key, detail)
                                                                             values ('renta', $1, 'dia-99', $2, 'hzl', $3::uuid, 2500, $4, $5, $6::jsonb)`, [rid, b, u, pm, `renta-${rid}-dia99-i0`, JSON.stringify({ toque: c1 })]))),
      'la base no deja dos cobros con la misma clave del toque');
  }

  // Lo de esta corrida deja libre su puesto (la siguiente corrida cabe).
  await db.query(`update event_sponsorships set status = 'terminado', end_kind = 'admin', end_reason = 'Prueba 9t8', ended_at = coalesce(ended_at, now()), auto_renew = false where id = any($1::bigint[]) and status in ('activo', 'reservado')`, [evs]);
  await db.query(`update sponsorships set status = 'terminado', end_kind = 'admin', end_reason = 'Prueba 9t8', ended_at = coalesce(ended_at, now()), auto_renew = false where business_id = $1 and status in ('activo', 'reservado')`, [b]);
  await db.end();
  console.log(`\n${checks - fallas}/${checks} · ${fallas ? 'FALLA' : 'bien'}`);
  process.exit(fallas ? 1 : 0);
})().catch(async (e) => { console.error('✗', e); try { await D.db().end(); } catch { /* */ } process.exit(1); });
