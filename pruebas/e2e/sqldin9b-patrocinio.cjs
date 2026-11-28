// 9b (28 nov, LAUNCH «Consultas que ninguna prueba ejecuta», 2ª parte) · lib/patrocinio-evento.ts: las consultas que ninguna prueba ejecutaba (la medida de
// pruebas/lib/consultas-medir.cjs), contra la base de pruebas y con una pasarela de mentira (sin servidor), con los archivos REALES (patrocinio-evento,
// patrocinio, cobro-fuera, cobros, consulta-pasarela, devolucion-consulta, revision-pasarela, dinero-alertas) transpilados por pruebas/lib/ts-servidor.cjs
// (la armazón de din9t8):
//   1. «Renovar solo» (renovarSoloEvento) de un patrocinio de evento: encender y apagar, cada vez con su auditoría (en la misma transacción); otro negocio,
//      otro evento, uno «hasta el evento», uno sin tarjeta o uno terminado: «Ese patrocinio ya terminó» y nada cambia; un id que no es: «no existe».
//   2. La renovación sola que ya salió a Stripe sin respuesta (en camino) y, cuando se termina con la misma llave, el patrocinio nuevo no cabe (mientras
//      Stripe no contestaba, el evento tomó otro patrocinio en esas fechas): el viejo termina con su nota («no quedaba puesto»), no se crea el nuevo, la
//      intención queda hecha (un solo cobro en Stripe) y el equipo de dinero tiene UNA alerta offsession_unapplied («No se aplicó. Decide si se
//      devuelve», ES/EN); el negocio recibe biz_patevt_no_renovo con el motivo (ES/EN). Al final el equipo la marca resuelta.
// Cada patrocinio se termina por su función de un solo patrocinio (renovacionConsultadaEvt), no por el barrido de todos: nada de otras corridas se toca.
// Precondiciones propias (corre dos veces seguidas): su negocio, sus eventos y sus patrocinios (en Scranton, para no ocupar los puestos de Hazleton de las
// demás pruebas); al final lo vivo se termina y deja libre su puesto.
// Uso: DATABASE_URL=… node pruebas/e2e/sqldin9b-patrocinio.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
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
// La pasarela de mentira (la de din9t8): una vez por llave, como Stripe con Idempotency-Key; `plan` solo para las llaves de ESTA prueba (para).
const P = {
  modo: () => 'simulador', plan: [], para: null, idems: [], cargos: new Map(),
  paso(idem) { return this.plan.length && (!this.para || idem.startsWith(this.para)) ? this.plan.shift() : 'ok'; },
  cobro(x) {
    this.idems.push(x.idem);
    const paso = this.paso(x.idem);
    if (paso === 'red') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    if (!this.cargos.has(x.idem)) this.cargos.set(x.idem, { id: `pi_fake_s9bp_${hex()}`, n: x.centavos });
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'error', mensaje: { es: 'Tu banco no respondió.', en: 'No answer.' } };
    return { ok: true, id: this.cargos.get(x.idem).id, marca: 'visa', ultimos4: '4242' };
  },
  async cobrarFuera(x) { return this.cobro(x); },
  async cobrarDirecto(x) { return this.cobro(x); },
  async retener() { return { ok: true, pi: `pi_fake_s9bph_${hex()}`, estado: 'retenido', marca: 'visa', ultimos4: '4242' }; },
  liberar: async () => ({ ok: true }), cliente: async () => null, buscarCobro: async () => ({ ok: false }), buscarTransferencia: async () => ({ ok: false }),
  devolver: async () => ({ ok: true, id: `re_fake_s9bp_${hex()}` }), buscarDevolucion: async () => ({ ok: true, hallado: null }),
  cobrosCon(pref) { return [...this.cargos.keys()].filter((k) => k.startsWith(pref)).length; },
};
const K = {}, DC = {}, RV = {}, PA = {}, PE = {}, CF = {};
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: auditarStaff }, './consulta-pasarela': K, './devolucion-consulta': DC,
  './revision-pasarela': RV, './patrocinio': PA, './evt-liquidacion': {}, './cobro-fuera': CF, './suscripcion': {}, './renovar-retencion': {} });
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': K, './devolucion-consulta': DC });
Object.assign(K, cargar('apps/web/lib/consulta-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas }));
Object.assign(DC, cargar('apps/web/lib/devolucion-consulta.ts', { './db': D, './cobros': cobros, './consulta-pasarela': K, './boletos-despues': {}, './evt-liquidacion': {}, './revision-pasarela': RV,
  './admin': { auditar: auditarStaff }, './patrocinio': PA }));
Object.assign(CF, cargar('apps/web/lib/cobro-fuera.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas, './planes': {}, './rentas': {}, './patrocinio': PA,
  './patrocinio-evento': PE, './consulta-pasarela': K }));
Object.assign(RV, cargar('apps/web/lib/revision-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './cobro-fuera': CF, './dinero-alertas': alertas, './admin': { auditar: auditarStaff },
  './consulta-pasarela': K, './suscripcion': {}, './evt-liquidacion': {}, './renovar-retencion': {}, './devolucion-consulta': DC, './patrocinio': PA }));
const valoresPat = async () => ({ patrocinio_semana_cents: 1500, patrocinio_mes_cents: 4500, patrocinio_puestos: 6, patrocinio_dias_adelante: 30, patrocinio_evt_semana_cents: 2000, patrocinio_evt_mes_cents: 6000, patrocinio_evt_puestos: 6 });
Object.assign(PA, cargar('apps/web/lib/patrocinio.ts', { './config': { valores: valoresPat }, './db': D, './cobros': cobros, './cobro-fuera': CF, './pagos/pasarela': { pasarela: P }, './categoria': {},
  './dinero-alertas': alertas, './avisos': avisos, './consulta-pasarela': K, './patrocinio-evento': PE }));
Object.assign(PE, cargar('apps/web/lib/patrocinio-evento.ts', { './config': { valores: valoresPat }, './db': D, './pagos/pasarela': { pasarela: P }, './patrocinio': PA, './avisos': avisos, './cobro-fuera': CF,
  './cobros': cobros, './evt-publico': {} }));

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
const n1 = async (s, v = []) => Number((await q1(s, v)).n);
async function crudo(fn) {
  const k = await db.connect();
  try { await k.query('set session_replication_role = replica'); return await fn(k); } finally { await k.query('set session_replication_role = default').catch(() => undefined); k.release(); }
}
async function tel() {
  for (let i = 0; i < 500; i++) {
    const t = `+1570555${String(crypto.randomInt(10000)).padStart(4, '0')}`;
    if (!esFijo(t) && !(await db.query(`select 1 from users where phone = $1`, [t])).rowCount) return t;
  }
  throw new Error('no quedó un +1570555xxxx libre');
}
const CI = 'scr';
const vivos = [];
// Un evento publicado del negocio (dentro de 30 días) y su patrocinio de 1 semana pagado (como lo deja la compra); `vencido`: ya llegó a su fin, con «renovar».
async function patEvento(b, u, pm, o = {}) {
  return crudo(async (k) => {
    const e = (await k.query(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, approved_at)
                               values ($1, $2, $3, 'noche', '{"es":"Prueba sql9b","en":"Test sql9b"}'::jsonb, current_date + 30, 1200, 1320, 'free', 'live', now()) returning id::text`, [`s9bp-${hex()}`, CI, b])).rows[0].id;
    await k.query(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, listable, status) values ($1::bigint, $2, now() + interval '30 days', now() + interval '30 days 2 hours', now() + interval '30 days', current_date + 30, true, 'scheduled')`, [e, CI]);
    const id = (await k.query(`insert into event_sponsorships (event_id, business_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
                                values ($1::bigint, $2, $3, $4::timestamptz, $5::timestamptz, $6, 'activo', 2000, $7, $8, $9) returning id::text`,
      [e, b, CI, o.vencido ? new Date(Date.now() - 7 * 864e5 - 60e3) : new Date(Date.now() - 864e5), o.vencido ? new Date(Date.now() - 60e3) : new Date(Date.now() + 6 * 864e5), o.dur ?? 'week', u,
        o.sinTarjeta ? null : pm, !!o.vencido])).rows[0].id;
    await k.query(`insert into sponsorship_payments (kind, ref_id, business_id, city_id, payer_user_id, amount_cents, pi, idem_key, card_brand, card_last4, reason) values ('evento', $1::bigint, $2, $3, $4, 2000, $5, $6, 'visa', '4242', 'compra')`,
      [id, b, CI, u, `pi_fake_s9bpc_${hex()}`, `pat-evento-${e}-${crypto.randomUUID()}`]);
    vivos.push(id);
    return { id, e };
  });
}
const pat = (id) => q1(`select status as st, auto_renew as ar, end_kind as ek, renew_note as nota from event_sponsorships where id = $1::bigint`, [id]);
const auditadas = (accion, e) => n1(`select count(*)::int as n from audit_entries where action = $1 and target_kind = 'event' and target_id = $2`, [accion, e]);

(async () => {
  try {
    const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Sql9b') returning id::text`, [await tel()])).id;
    const neg = async (s) => (await q1(`insert into businesses (id, city_id, category_id, name, status) values ($1, $2, 'NEG-FOOD', $3, 'active') returning id`, [`p9b-${hex()}-${s}`, CI, `Prueba sql9b pat ${s}`])).id;
    const b = await neg('a'), otro = await neg('b');
    const pm = `pm_fake_s9bp_${hex()}`;
    await db.query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated) values ($1, $2, 'visa', '4242', '12/30', true, true)`, [u, pm]);

    // ── 1 · «Renovar solo» ──
    console.log('1 · «Renovar solo» de un patrocinio de evento');
    {
      const T = await patEvento(b, u, pm);
      const on = await PE.renovarSoloEvento(b, T.e, u, T.id, true);
      ok(on.ok && (await pat(T.id)).ar === true && await auditadas('patrocinio_evento.renovar_solo_on', T.e) === 1, 'encender: renueva solo, con su auditoría');
      const au = await q1(`select actor_id::text as a, city_id as c, after from audit_entries where action = 'patrocinio_evento.renovar_solo_on' and target_id = $1`, [T.e]);
      ok(au.a === u && au.c === CI && au.after.patrocinio === T.id, '… quién, la ciudad y el patrocinio en la auditoría');
      const off = await PE.renovarSoloEvento(b, T.e, u, T.id, false);
      ok(off.ok && (await pat(T.id)).ar === false && await auditadas('patrocinio_evento.renovar_solo_off', T.e) === 1, 'apagar: ya no renueva, con su auditoría');
      const ya = { es: 'Ese patrocinio ya terminó.', en: 'That sponsorship already ended.' };
      const igual = (r) => !r.ok && r.msg.es === ya.es && r.msg.en === ya.en;
      ok(igual(await PE.renovarSoloEvento(otro, T.e, u, T.id, true)) && (await pat(T.id)).ar === false, 'otro negocio: «Ese patrocinio ya terminó» (ES/EN) y nada cambia');
      const T2 = await patEvento(b, u, pm);
      ok(igual(await PE.renovarSoloEvento(b, T2.e, u, T.id, true)) && (await pat(T.id)).ar === false, 'el patrocinio con otro evento: nada cambia');
      const H = await patEvento(b, u, pm, { dur: 'until_event' }), S = await patEvento(b, u, pm, { sinTarjeta: true });
      ok(igual(await PE.renovarSoloEvento(b, H.e, u, H.id, true)) && (await pat(H.id)).ar === false, '«hasta el evento» no se renueva');
      ok(igual(await PE.renovarSoloEvento(b, S.e, u, S.id, true)) && (await pat(S.id)).ar === false, 'sin la tarjeta del pago no se renueva');
      await db.query(`update event_sponsorships set status = 'terminado', end_kind = 'admin', end_reason = 'Prueba sql9b', ended_at = now(), auto_renew = false where id = $1::bigint`, [T2.id]);
      ok(igual(await PE.renovarSoloEvento(b, T2.e, u, T2.id, true)) && (await pat(T2.id)).ar === false, 'uno terminado: nada cambia');
      ok(await auditadas('patrocinio_evento.renovar_solo_on', T2.e) === 0 && await auditadas('patrocinio_evento.renovar_solo_on', H.e) === 0, '… y sin auditoría de lo que no cambió');
      const r = await PE.renovarSoloEvento(b, T.e, u, 'abc', true);
      ok(!r.ok && r.msg.es === 'Ese patrocinio no existe.' && r.msg.en === 'That sponsorship does not exist.', 'un id que no es: «no existe» (ES/EN)');
    }

    // ── 2 · La renovación que salió y ya no cabe ──
    console.log('2 · La renovación sola mandada sin respuesta y, al terminarla, el patrocinio nuevo ya no cabe');
    {
      const T = await patEvento(b, u, pm, { vencido: true });
      const idem = `pat-evento-renov-${T.id}`;
      P.para = idem; P.plan = ['red-pero-hizo'];
      await PE.renovacionConsultadaEvt(T.id);
      const I0 = (await db.query(`select status as st, sent_at is not null as mandada, idem_key as k, amount_cents::int as amt from offsession_charges where kind = 'patrocinio_evento' and ref_id = $1`, [T.id])).rows;
      ok((await pat(T.id)).st === 'activo' && I0.length === 1 && I0[0].st === 'pending' && I0[0].mandada, 'sin respuesta: el patrocinio sigue, la intención en camino (mandada)');
      // Mientras Stripe no contestaba, el evento tomó otro patrocinio en las fechas del período nuevo.
      const R = await crudo(async (k) => (await k.query(`insert into event_sponsorships (event_id, business_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
          values ($1::bigint, $2, $3, now() + interval '1 hour', now() + interval '3 days', 'week', 'reservado', 2000, $4, $5, false) returning id::text`, [T.e, b, CI, u, pm])).rows[0].id);
      vivos.push(R);
      const n0 = avisados.length;
      await PE.renovacionConsultadaEvt(T.id);
      const t = await pat(T.id);
      ok(t.st === 'terminado' && t.ek === 'vencio' && t.nota === 'no quedaba puesto', `el viejo termina con su nota (${t.st}, ${t.ek}, «${t.nota}»)`);
      ok(!(await q1(`select 1 as x from event_sponsorships where renewed_from = $1::bigint`, [T.id])) && (await pat(R)).st === 'reservado', 'no se crea el nuevo y el otro patrocinio del evento no se toca');
      const I = (await db.query(`select id::text, status as st, idem_key as k, amount_cents::int as amt from offsession_charges where kind = 'patrocinio_evento' and ref_id = $1`, [T.id])).rows;
      ok(I.length === 1 && I[0].st === 'done' && P.cobrosCon(idem) === 1, 'la intención queda hecha con la MISMA llave: un solo cobro en Stripe');
      ok(await n1(`select count(*)::int as n from sponsorship_payments where idem_key like $1 || '%'`, [idem]) === 0, 'nada se anota como renovación pagada en el libro del patrocinio (no se aplicó)');
      const al = await q1(`select count(*)::int as n, min(id)::text as id, min(amount_cents)::int as amt, min(business_id) as biz, min(detail->>'es') as es, min(detail->>'en') as en from money_alerts where kind = 'offsession_unapplied' and subject_id = $1`, [I[0].k]);
      ok(al.n === 1 && al.amt === I[0].amt && al.biz === b && al.es.includes(`al renovar el patrocinio de evento ${T.id} ya no quedaba puesto.`) && al.es.includes('No se aplicó. Decide si se devuelve.')
        && al.en.includes(`when renewing event sponsorship ${T.id} there was no slot left.`) && al.en.includes('It was not applied. Decide whether to refund it.'), `UNA alerta offsession_unapplied al equipo de dinero (ES/EN): «${al.es}»`);
      const av = avisados.slice(n0).filter((a) => a[2] === 'biz_patevt_no_renovo');
      ok(av.length === 1 && av[0][1] === b && av[0][3].motivo.es === 'no quedaba puesto' && av[0][3].motivo.en === 'there was no slot left', 'el negocio: biz_patevt_no_renovo con el motivo (ES/EN)');
      await PE.renovacionConsultadaEvt(T.id);
      ok(P.cobrosCon(idem) === 1 && await n1(`select count(*)::int as n from money_alerts where kind = 'offsession_unapplied' and subject_id = $1`, [I[0].k]) === 1 && avisados.slice(n0).filter((a) => a[2] === 'biz_patevt_no_renovo').length === 1,
        'otra pasada: nada más (ni cobro, ni alerta, ni aviso)');
      const equipo = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Sql9b') returning id::text`, [await tel()])).id;
      const nota = await alertas.notaAlerta({ id: equipo, cities: [] }, al.id, 'resuelta', 'Prueba sql9b: se devuelve por su camino.');
      ok(nota.ok, 'el equipo la marca resuelta');
    }
  } catch (e) { fallas++; console.log('  ✗ excepción:', e && e.stack || e); }
  finally {
    // Lo de esta corrida deja libre su puesto (la siguiente corrida cabe).
    await db.query(`update event_sponsorships set status = 'terminado', end_kind = 'admin', end_reason = 'Prueba sql9b', ended_at = coalesce(ended_at, now()), auto_renew = false where id = any($1::bigint[]) and status in ('activo', 'reservado')`, [vivos]).catch(() => undefined);
    await db.end().catch(() => undefined);
  }
  console.log(`\n${fallas ? '✗' : '✓'} sqldin9b-patrocinio: ${checks - fallas}/${checks}`);
  process.exit(fallas ? 1 : 0);
})();
