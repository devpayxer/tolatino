// 9b (28 nov, LAUNCH «Consultas que ninguna prueba ejecuta», 2ª parte) · lib/evento-privado.ts: las consultas que ninguna prueba ejecutaba (la medida de
// pruebas/lib/consultas-medir.cjs sobre el servidor y las pruebas de Node), contra la base de pruebas y con una pasarela de mentira (sin servidor), con los
// archivos REALES (evento-privado, citas › contexto, cobros, dinero-alertas, devolucion-cancelar) transpilados por pruebas/lib/ts-servidor.cjs. El evento se
// arma por el camino de la app (ajustes del restaurante → solicitud → propuesta → aceptar y retener el depósito), nada a mano salvo acercar la fecha:
//   1. Los ajustes de fábrica (sin fila propia): el grupo mínimo sale de «Juntamos mesas» de Reservaciones (hasta N + 1) o 9 (sin juntar mesas o sin
//      Reservaciones); apagado. Guardar los ajustes la primera vez parte de esos mismos.
//   2. «No, gracias» a la propuesta: cancelada (propuesta_no), sin cobro, el aviso al restaurante (evp_biz_no); otra vez: «ya cambió».
//   3. Cancelar una solicitud sin confirmar: cancelada (solicitud), nada que devolver, el restaurante lo sabe («No se había cobrado nada», ES/EN).
//   4. Un evento confirmado (depósito retenido; la captura no salió):
//      a. el cliente pide un cambio y el restaurante no puede: el evento sigue como se acordó, con su motivo (motivoCambioNo), el evento change_declined
//         y el aviso evp_cambio_no al cliente; el estado y el dinero no cambian.
//      b. el restaurante manda un cambio y el cliente lo rechaza («sigue como estaba»): sin el cambio, el total de antes, el aviso evp_biz_cambio_no.
//      c. cancela tarde (menos del plazo de la propuesta aceptada) y la captura tampoco sale: el depósito NO se queda con el restaurante (perdio vuelve a
//         false en la operación), la retención se suelta y se dice «liberada» (nunca «se queda con el restaurante»), ninguna alerta de captura (el banco
//         dijo que no: no hay duda de si salió).
// Precondiciones propias (corre dos veces seguidas): su restaurante, su dueña, su cliente y su tarjeta; no toca nada de la semilla.
// Uso: DATABASE_URL=… node pruebas/e2e/sqldin9b-evento-privado.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const crypto = require('crypto');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };
const hex = () => crypto.randomBytes(6).toString('hex');

// ── Los módulos reales, con lo de afuera de mentira ──
const D = cargar('apps/web/lib/db.ts');
const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
const avisados = [];
const avisos = { avisar: async (u, t, v) => { avisados.push(['u', u, t, v]); return true; }, avisarMuchos: async () => undefined, avisarNegocio: async (b, t, v) => { avisados.push(['b', b, t, v]); return true; },
  avisoParte: async (_n, _t, f) => !!(await f()) };
// La configuración: los valores de la base de pruebas (cfg_int), como lib/config.ts sin su caché.
const valores = async (...ks) => { const o = {}; for (const k of ks) o[k] = Number((await q1(`select cfg_int($1) as v`, [k])).v); return o; };
const config = { valores, valor: async (k) => (await valores(k))[k], cfgSql: (k) => `cfg_int('${k}')` };
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: async () => undefined } });
// La pasarela de mentira: retiene siempre; la captura contesta lo que diga `captura` («no» = el banco dijo que no); soltar, siempre.
const P = {
  modo: () => 'simulador', captura: 'ok', capturas: [], liberadas: [],
  async retener() { return { ok: true, pi: `pi_fake_s9be_${hex()}`, estado: 'retenido', marca: 'visa', ultimos4: '4242' }; },
  async cobrar(pi, n) { this.capturas.push(pi); return this.captura === 'no' ? { ok: false, codigo: 'card_declined' } : { ok: true, cobrado: n }; },
  async liberar(pi) { this.liberadas.push(pi); return { ok: true }; },
  cliente: async () => null, devolver: async () => ({ ok: true, id: `re_fake_${hex()}` }), buscarCobro: async () => ({ ok: false }),
};
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': {}, './devolucion-consulta': {} });
const citas = cargar('apps/web/lib/citas.ts', { './dias-especiales': cargar('apps/web/lib/dias-especiales.ts'), './visible-publico': {}, './estimados': {}, './db': D, './config': config,
  './pagos/pasarela': { pasarela: P }, './pagos/verificacion': { bancoPide: () => null }, './cobros': cobros });
const comun = cargar('apps/web/lib/evento-privado-comun.ts', { '@/lib/dos-idiomas': cargar('apps/web/lib/dos-idiomas.ts') });
const mensajes = [];
const EP = cargar('apps/web/lib/evento-privado.ts', { './citas': citas, './cobros': cobros, './devolucion-cancelar': cargar('apps/web/lib/devolucion-cancelar.ts'), './config': config, './db': D,
  './evento-privado-comun': comun, './pagos/pasarela': { pasarela: P }, './pagos/verificacion': { bancoPide: () => null }, './avisos': avisos,
  './mensajes': { enviarCliente: async (...a) => { mensajes.push(a); return { ok: true }; } } });

const { esFijo } = require('../lib/telefonos-fijos.cjs');
const telNuevo = async () => { for (let i = 0; i < 400; i++) { const t = '570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); if (!esFijo(t) && !(await q1(`select 1 as x from users where phone = $1`, ['+1' + t]))) return '+1' + t; } throw new Error('no queda un teléfono 570-555 libre'); };
const RUN = hex().slice(0, 8);
// Lo que la app nunca escribe así (acercar la fecha de un evento ya aceptado): con los triggers apagados en ESTA conexión y vueltos a encender antes de soltarla.
async function crudo(fn) {
  const k = await db.connect();
  try { await k.query('set session_replication_role = replica'); return await fn(k); } finally { await k.query('set session_replication_role = default').catch(() => undefined); k.release(); }
}
const persona = async (nombre) => (await q1(`insert into users (phone, first_name, last_name) values ($1, $2, 'Sql9b') returning id::text`, [await telNuevo(), nombre])).id;
async function restaurante(sufijo, o = {}) {
  const b = (await q1(`insert into businesses (id, city_id, category_id, name, status) values ($1, 'hzl', 'NEG-FOOD', $2, 'active') returning id`, [`e9b-${RUN}-${sufijo}`, `Prueba sql9b evp ${RUN}`])).id;
  if (o.dueno) await db.query(`insert into business_members (business_id, user_id, kind, display_name) values ($1, $2, 'owner', 'Dueña')`, [b, o.dueno]);
  await db.query(`insert into business_stats_cache (business_id, plan) values ($1, 'pro') on conflict (business_id) do update set plan = 'pro'`, [b]);
  if (o.cuenta) await db.query(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ($1, $2, 'enabled', true, true, true)`, [b, `acct_sim_e9b_${b}`]);
  if (o.rsv) await db.query(`insert into reservation_settings (business_id, join_tables, join_max) values ($1, $2, $3)`, [b, o.rsv.juntar, o.rsv.max]);
  return b;
}
const opDe = (num) => q1(`select id::text, status as st, status_detail as det, cancel_reason as cxr, cancelled_by as por, total_cents::int as tot, deposit_cents::int as dep, pay_status as pay, details from operations where number = $1`, [num]);
const pagoDe = (num) => q1(`select p.status as st, p.held_cents::int as held, p.amount_cents::int as amt, p.stripe_payment_intent as pi from payments p join operations o on o.id = p.operation_id where o.number = $1 and p.kind = 'deposit'`, [num]);
const eventos = async (num) => (await db.query(`select e.kind, e.note from operation_events e join operations o on o.id = e.operation_id where o.number = $1 order by e.id`, [num])).rows;
const avisosDe = (tpl, desde = 0) => avisados.slice(desde).filter((a) => a[2] === tpl);
const { usd } = cargar('apps/web/lib/dinero-comun.ts');

(async () => {
  try {
    // ── 1 · Los ajustes de fábrica ──
    console.log('1 · Los ajustes de fábrica (sin fila propia): el grupo mínimo sale de Reservaciones');
    {
      const b12 = await restaurante('j12', { rsv: { juntar: true, max: 12 } }), bNo = await restaurante('jno', { rsv: { juntar: false, max: 20 } }), bSin = await restaurante('sin');
      const a12 = await EP.ajustesEvp(b12), aNo = await EP.ajustesEvp(bNo), aSin = await EP.ajustesEvp(bSin);
      const cfg = await valores('evp_deposito_pct', 'evp_anticipacion_dias');
      ok(a12.minParty === 13 && a12.capacity === 40 && a12.on === false, `«Juntamos mesas» hasta 12: desde 13 personas, capacidad 40, apagado (${a12.minParty}, ${a12.capacity}, ${a12.on})`);
      ok(aNo.minParty === 9 && aSin.minParty === 9, `sin juntar mesas (aunque diga hasta 20) o sin Reservaciones: desde 9 (${aNo.minParty}, ${aSin.minParty})`);
      ok(a12.depositPct === cfg.evp_deposito_pct && a12.leadDays === cfg.evp_anticipacion_dias && a12.areas.join() === 'salon' && a12.menus.length > 0, 'el depósito y la anticipación de Configuración, el salón y los menús del diseño');
    }

    // El restaurante del resto: Reservaciones junta hasta 10 (desde 11), Cobros con tarjeta conectado; la dueña enciende Evento privado.
    const duena = await persona('Dueña'), cliente = await persona('Cliente');
    const B = await restaurante('r', { dueno: duena, cuenta: true, rsv: { juntar: true, max: 10 } });
    const g = await EP.guardarAjustesEvp(B, duena, { on: true });
    const aj = await EP.ajustesEvp(B);
    ok(g.ok && aj.on && aj.minParty === 11 && (await q1(`select min_party as m from private_event_settings where business_id = $1`, [B])).m === 11, 'encender por primera vez guarda los de fábrica (desde 11, de Reservaciones) y queda encendido');
    const pm = `pm_fake_s9be_${RUN}`;
    await db.query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated) values ($1, $2, 'visa', '4242', '12/30', true, true)`, [cliente, pm]);
    const hoy = (await q1(`select (now() at time zone 'America/New_York')::date as h`)).h;
    const dia = (n) => { const d = new Date(hoy); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const pedir = async (n) => {
      const r = await EP.pedirEvp(cliente, B, { fecha: dia(n), m: comun.HORAS_EVP[12], horas: 3, personas: 20, occ: comun.OCASIONES(true)[0][0], area: 'salon', menu: aj.menus[0].k, bud: comun.PRESUPUESTOS(true)[1][0], ext: [], clave: crypto.randomUUID() }, 'pruebas');
      if (!r.ok) throw new Error(`pedirEvp: ${JSON.stringify(r.msg)}`);
      return r.numero;
    };
    const proponer = async (num, tipo = 'quote', personas = 20) => {
      const r = await EP.proponerEvp(B, num, duena, { tipo, horas: 3, personas, lineas: [{ k: 'menu', l: 'Menú por persona', lEn: 'Menu per guest', q: personas, unit: 2000 }], incluye: 'Comida, refrescos y el salón' });
      if (!r.ok) throw new Error(`proponerEvp(${tipo}): ${JSON.stringify(r.msg)}`);
      return r.v;
    };

    // ── 2 · «No, gracias» ──
    console.log('2 · «No, gracias» a la propuesta');
    {
      const num = await pedir(12);
      await proponer(num);
      const n0 = avisados.length;
      const r = await EP.noGraciasEvp(cliente, num);
      const o = await opDe(num);
      ok(r.ok && o.st === 'cancelled' && o.cxr === 'propuesta_no' && o.por === 'user' && o.pay === null, `cancelada por el cliente (propuesta_no), sin cobro (${o.st}, ${o.cxr}, ${o.pay})`);
      ok((await eventos(num)).some((e) => e.kind === 'quote_no') && avisosDe('evp_biz_no', n0).length === 1 && avisosDe('evp_biz_no', n0)[0][1] === B, 'el evento quote_no y el aviso al restaurante (evp_biz_no)');
      ok(!(await pagoDe(num)), 'ningún cobro');
      const r2 = await EP.noGraciasEvp(cliente, num);
      ok(!r2.ok && r2.msg.es === 'Esta solicitud ya cambió. Actualiza la pantalla.' && r2.msg.en === 'This request already changed. Refresh the screen.', 'otra vez: «ya cambió» (ES/EN)');
    }

    // ── 3 · Cancelar sin confirmar ──
    console.log('3 · Cancelar una solicitud sin confirmar');
    {
      const num = await pedir(13);
      const n0 = avisados.length;
      const r = await EP.cancelarEvp(cliente, num);
      const o = await opDe(num);
      ok(r.ok && r.devuelto === 0 && r.perdio === false && r.devolucion === 'nada', `nada que devolver ni que perder (${JSON.stringify(r)})`);
      ok(o.st === 'cancelled' && o.cxr === 'solicitud' && o.por === 'user', `cancelada (solicitud) por el cliente (${o.st}, ${o.cxr})`);
      const a = avisosDe('evp_biz_cx', n0);
      ok(a.length === 1 && a[0][3].dep.es === ' No se había cobrado nada.' && a[0][3].dep.en === ' Nothing had been charged.', 'el restaurante: «No se había cobrado nada» (ES/EN)');
      ok((await eventos(num)).filter((e) => e.kind === 'cancelled').length === 1, 'un evento «cancelled»');
    }

    // ── 4 · Un evento confirmado con el depósito retenido ──
    console.log('4 · Un evento confirmado (depósito retenido, la captura no salió)');
    const num = await pedir(14);
    const v1 = await proponer(num);
    P.captura = 'no';
    const ac = await EP.aceptarEvp(cliente, num, v1, pm, null, crypto.randomUUID());
    const o0 = await opDe(num), p0 = await pagoDe(num);
    ok(ac.ok && o0.st === 'confirmed' && p0?.st === 'held' && p0.held === o0.dep && o0.dep > 0, `aceptado: confirmado con el depósito retenido (${o0.st}, ${p0?.st}, ${p0?.held} de ${o0.dep})`);
    {
      // a. El cliente pide un cambio y el restaurante no puede.
      const c = await EP.pedirCambioEvp(cliente, num, { nota: 'Somos dos más, ¿se puede?', personas: 22 });
      ok(c.ok && (await opDe(num)).det === 'change_req', 'el cliente pide un cambio (change_req)');
      const n0 = avisados.length;
      const r = await EP.noPuedoEvp(B, num, duena, 'No tenemos sillas para más');
      const o = await opDe(num), p = await pagoDe(num);
      ok(r.ok && o.st === 'confirmed' && o.det === null && o.details.motivoCambioNo === 'No tenemos sillas para más', `el evento sigue como se acordó, con el motivo (${o.st}, ${o.det}, ${o.details.motivoCambioNo})`);
      ok(o.tot === o0.tot && o.dep === o0.dep && p.st === 'held' && p.held === p0.held, 'el total, el depósito y la retención no cambian');
      const ev = (await eventos(num)).filter((e) => e.kind === 'change_declined');
      ok(ev.length === 1 && ev[0].note.es === 'No puede hacer el cambio: No tenemos sillas para más' && ev[0].note.en === 'Cannot make the change: No tenemos sillas para más', 'el evento change_declined con el motivo (ES/EN)');
      const a = avisosDe('evp_cambio_no', n0);
      ok(a.length === 1 && a[0][1] === cliente && a[0][3].motivo === 'No tenemos sillas para más', 'el aviso evp_cambio_no al cliente, con el motivo');
      const r2 = await EP.noPuedoEvp(B, num, duena, 'Otra vez no');
      ok(!r2.ok && (await opDe(num)).st === 'confirmed', 'otra vez, sin cambio pedido: no cancela un evento confirmado («ya cambió»)');
    }
    {
      // b. El restaurante manda un cambio y el cliente lo rechaza.
      await EP.pedirCambioEvp(cliente, num, { nota: 'Somos cuatro más', personas: 24 });
      await proponer(num, 'change', 24);
      const oc = await opDe(num);
      const qc = await q1(`select q.kind, q.total_cents::int as tot from private_event_quotes q where q.operation_id = $1::bigint order by q.version desc limit 1`, [oc.id]);
      ok(oc.det === 'change_quote' && qc.kind === 'change' && qc.tot > o0.tot, `el restaurante manda el cambio (change_quote) con otro total (${qc.tot} > ${o0.tot})`);
      const n0 = avisados.length;
      const r = await EP.rechazarCambioEvp(cliente, num);
      const o = await opDe(num);
      ok(r.ok && o.st === 'confirmed' && o.det === null && o.tot === o0.tot && o.dep === o0.dep, `sigue como estaba: confirmado, el total de antes (${o.st}, ${o.det}, ${o.tot})`);
      const ev = (await eventos(num)).filter((e) => e.kind === 'change_rejected');
      ok(ev.length === 1 && ev[0].note.es === 'Siguió como estaba' && ev[0].note.en === 'Kept it as it was', 'el evento change_rejected (ES/EN)');
      ok(avisosDe('evp_biz_cambio_no', n0).length === 1 && avisosDe('evp_biz_cambio_no', n0)[0][1] === B, 'el aviso evp_biz_cambio_no al restaurante');
      const r2 = await EP.rechazarCambioEvp(cliente, num);
      ok(!r2.ok && r2.msg.es === 'Este cambio ya no está abierto.' && r2.msg.en === 'This change is no longer open.', 'otra vez: «Este cambio ya no está abierto» (ES/EN)');
      ok((await pagoDe(num)).st === 'held', 'la retención sigue');
    }
    {
      // c. Cancela tarde y la captura tampoco sale.
      await crudo((k) => k.query(`update operations set scheduled_at = now() + interval '24 hours' where number = $1`, [num]));
      const al0 = Number((await q1(`select count(*)::int as n from money_alerts where kind = 'hold_stuck' and detail->>'es' like '%' || $1 || '%'`, [num])).n);
      const n0 = avisados.length, c0 = P.capturas.length;
      const r = await EP.cancelarEvp(cliente, num);
      const o = await opDe(num), p = await pagoDe(num);
      ok(P.capturas.length === c0 + 1, 'tarde: se intenta cobrar lo retenido (la regla: se queda con el restaurante)');
      ok(r.ok && r.perdio === false && r.devuelto === 0 && r.devolucion === 'liberada', `la captura no salió: no se pierde, se suelta (${JSON.stringify(r)})`);
      ok(o.st === 'cancelled' && o.cxr === 'tarde' && o.details.perdio === false, `la operación: cancelada tarde con perdio = false (${o.cxr}, ${o.details.perdio})`);
      ok(p.st === 'released' && P.liberadas.includes(p.pi), `la retención se soltó en la pasarela y en el libro (${p.st})`);
      const a = avisosDe('evp_cancelado', n0);
      const dep = usd(p.held);
      ok(a.length === 1 && a[0][1] === cliente && a[0][3].dinero.es === `No se cobró nada: la retención de ${dep} se suelta de tu tarjeta.` && a[0][3].dinero.en === `Nothing was charged: the ${dep} hold comes off your card.`,
        `el aviso al cliente dice lo que pasó: «No se cobró nada: la retención de ${dep} se suelta» (ES/EN), nunca «se queda con el restaurante»`);
      const an = avisosDe('evp_biz_cx', n0);
      ok(an.length === 1 && an[0][3].dep.es === ' No se había cobrado nada.' && !/se queda contigo/.test(an[0][3].dep.es), 'el restaurante: «No se había cobrado nada», nunca «se queda contigo»');
      const al = Number((await q1(`select count(*)::int as n from money_alerts where kind = 'hold_stuck' and detail->>'es' like '%' || $1 || '%'`, [num])).n);
      ok(al === al0, 'el banco dijo que no: ninguna alerta de captura (no hay duda de si salió)');
    }
  } catch (e) { fallas++; console.log('  ✗ excepción:', e && e.stack || e); }
  finally { await db.end().catch(() => undefined); }
  console.log(`\n${fallas ? '✗' : '✓'} sqldin9b-evento-privado: ${checks - fallas}/${checks}`);
  process.exit(fallas ? 1 : 0);
})();
