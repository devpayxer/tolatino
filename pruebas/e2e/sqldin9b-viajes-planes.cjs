// 9b (28 nov, LAUNCH «Consultas que ninguna prueba ejecuta», 2ª parte) · lib/viajes.ts y lib/planes.ts: las consultas que ninguna prueba ejecutaba (la medida de
// pruebas/lib/consultas-medir.cjs), contra la base de pruebas y con una pasarela de mentira (sin servidor), con los archivos REALES (viajes, planes, cobros,
// cobro-fuera, dinero-alertas) transpilados por pruebas/lib/ts-servidor.cjs:
//   1. Viaje: la ruta propuso otra salida y el cliente no contestó a tiempo (barrerViajes): la reserva se cancela (alt_vencida, por el sistema), la propuesta
//      vence, sus asientos vuelven a la salida, la retención se suelta (en la pasarela y en el libro) y queda el evento «No respondió a la otra salida»
//      (ES/EN), una vez; otra pasada no hace nada; la que todavía está a tiempo no se toca.
//   2. Plan del Hogar: la visita que ya pasó (barrerPlanes): la próxima pasa a la siguiente fecha de la regla (el N-ésimo día de la semana del mes, la primera
//      desde hoy) y su cita queda creada (confirmada, a la hora de la franja, con el plan); otra pasada no crea otra ni la mueve; no se cobra nada antes del
//      día del cobro.
// Precondiciones propias (corre dos veces seguidas): sus negocios, su cliente, su salida, su viaje y su plan; el barrido de viajes va filtrado por SU negocio
// (las salidas de otras corridas no se tocan) y el de planes por SU número.
// Uso: DATABASE_URL=… node pruebas/e2e/sqldin9b-viajes-planes.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const { hoyCiudad } = require('../lib/hoy-ciudad.cjs');
const crypto = require('crypto');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };
const hex = () => crypto.randomBytes(6).toString('hex');

// ── Los módulos reales, con lo de afuera de mentira ──
const D = cargar('apps/web/lib/db.ts');
const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
const n1 = async (s, v = []) => Number((await q1(s, v)).n);
const avisados = [];
const avisos = { avisar: async (u, t, v) => { avisados.push(['u', u, t, v]); return true; }, avisarMuchos: async () => undefined, avisarNegocio: async (b, t, v) => { avisados.push(['b', b, t, v]); return true; } };
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: async () => undefined } });
const P = {
  modo: () => 'simulador', liberadas: [], cobros: [],
  async liberar(pi) { this.liberadas.push(pi); return { ok: true }; },
  async cobrarFuera(x) { this.cobros.push(x.idem); return { ok: true, id: `pi_fake_s9bv_${hex()}`, marca: 'visa', ultimos4: '4242' }; },
  async cobrarDirecto(x) { return this.cobrarFuera(x); },
  cobrar: async (pi, n) => ({ ok: true, cobrado: n }), cliente: async () => null, buscarCobro: async () => ({ ok: false }),
};
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': {}, './devolucion-consulta': {} });
const DC = cargar('apps/web/lib/devolucion-cancelar.ts');
const V = cargar('apps/web/lib/viajes.ts', { './citas': {}, './cobros': cobros, './devolucion-cancelar': DC, './cifrado': {}, './db': D, './config': {}, './envios': {}, './pagos/pasarela': { pasarela: P },
  './modulo-pausa': {}, './pagos/verificacion': {}, './transporte': {}, './transporte-comun': {}, './avisos': avisos });
const PL = {};
const K = cargar('apps/web/lib/consulta-pasarela.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas });
const CF = cargar('apps/web/lib/cobro-fuera.ts', { './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas, './planes': PL, './rentas': {}, './patrocinio': {},
  './patrocinio-evento': {}, './consulta-pasarela': K });
Object.assign(PL, cargar('apps/web/lib/planes.ts', { './dias-especiales': { cerradoElDia: () => false, diasEspeciales: async () => [] }, './fecha-local': { hoyEn: (z, d) => hoyCiudad(z, d) },
  './db': D, './cobros': cobros, './pagos/pasarela': { pasarela: P }, './cobro-fuera': CF, './avisos': avisos }));

const { esFijo } = require('../lib/telefonos-fijos.cjs');
const telNuevo = async () => { for (let i = 0; i < 400; i++) { const t = '570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); if (!esFijo(t) && !(await q1(`select 1 as x from users where phone = $1`, ['+1' + t]))) return '+1' + t; } throw new Error('no queda un teléfono 570-555 libre'); };
const RUN = hex().slice(0, 8);
let NUM = Number(String(Date.now()).slice(-7));
const hoy = async () => (await q1(`select (now() at time zone 'America/New_York')::date::text as h`)).h;

(async () => {
  try {
    const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Sql9b') returning id::text`, [await telNuevo()])).id;

    // ── 1 · Viaje: la otra salida sin respuesta ──
    console.log('1 · Viaje: la otra salida que el cliente no contestó a tiempo');
    {
      const B = (await q1(`insert into businesses (id, city_id, category_id, name, status) values ($1, 'hzl', 'NEG-TRANS', $2, 'active') returning id`, [`v9b-${RUN}`, `Prueba sql9b viajes ${RUN}`])).id;
      const it = (await q1(`insert into items (business_id, name, price_cents, sell, status) values ($1, '{"es":"Ruta sql9b","en":"Route sql9b"}'::jsonb, 2500, true, 'live') returning id::text`, [B])).id;
      const run = (await q1(`insert into trip_runs (business_id, city_id, item_id, run_at, seats_total, seats_booked) values ($1, 'hzl', $2::bigint, now() + interval '2 days', 14, 4) returning id::text`, [B, it])).id;
      // Dos reservas de 2 asientos con su retención y la otra salida propuesta: una ya vencida, otra todavía a tiempo.
      const viaje = async (vence) => {
        const num = `V-9${String(++NUM).padStart(8, '0')}`, pi = `pi_fake_s9bv_${RUN}_${num}`;
        const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, details, subtotal_cents, total_cents, pay_mode, pay_status, client_key, is_test, respond_by)
            values ($1, 'trip', 'hzl', $2, $3, 'change_proposed', now() + interval '2 days', $4::jsonb, 5000, 5000, 'app', 'held', gen_random_uuid(), true, $5::timestamptz) returning id::text`,
          [num, B, u, JSON.stringify({ k: 'asiento', run, adults: 2, kids: 0, svcId: it, svc: { es: 'Ruta sql9b', en: 'Route sql9b' } }), vence])).id;
        await db.query(`insert into run_seats (operation_id, run_id, seats, status) values ($1::bigint, $2::bigint, 2, 'held')`, [op, run]);
        await db.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at)
                        values ($1::bigint, $2, $3, 'hzl', 'full', 'card', $4, 5000, 5000, 0, 'held', 'visa', '4242', now())`, [op, u, B, pi]);
        const cp = (await q1(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by) values ($1::bigint, 'time', $2::jsonb, $3, 'business', $4::timestamptz) returning id::text`,
          [op, JSON.stringify({ run, ymd: await hoy(), m: 600 }), u, vence])).id;
        return { num, op, pi, cp };
      };
      const X = await viaje(new Date(Date.now() - 60e3)), Y = await viaje(new Date(Date.now() + 3600e3));
      const n0 = avisados.length;
      await V.barrerViajes({ negocio: B, numero: X.num });
      const o = await q1(`select status as st, cancelled_by as por, cancel_reason as cxr, cancelled_at is not null as cx from operations where id = $1::bigint`, [X.op]);
      ok(o.st === 'cancelled' && o.por === 'system' && o.cxr === 'alt_vencida' && o.cx, `la reserva se cancela por el sistema (alt_vencida) (${o.st}, ${o.por}, ${o.cxr})`);
      const cp = await q1(`select status as st, answered_at is not null as resp from change_proposals where id = $1::bigint`, [X.cp]);
      ok(cp.st === 'expired' && cp.resp, `la otra salida propuesta vence (${cp.st})`);
      const asientos = await q1(`select (select status from run_seats where operation_id = $1::bigint) as st, (select seats_booked::int from trip_runs where id = $2::bigint) as n`, [X.op, run]);
      ok(asientos.st === 'cancelled' && asientos.n === 2, `sus 2 asientos vuelven a la salida (${asientos.st}; reservados ${asientos.n} de 4)`);
      const p = await q1(`select status as st from payments where operation_id = $1::bigint`, [X.op]);
      ok(p.st === 'released' && P.liberadas.filter((x) => x === X.pi).length === 1, `la retención se suelta en la pasarela y en el libro (${p.st})`);
      const ev = (await db.query(`select note from operation_events where operation_id = $1::bigint and kind = 'cancelled'`, [X.op])).rows;
      ok(ev.length === 1 && ev[0].note.es === 'No respondió a la otra salida' && ev[0].note.en === 'No answer to the other departure', 'el evento «No respondió a la otra salida» (ES/EN)');
      await V.barrerViajes({ negocio: B, numero: X.num });
      ok(await n1(`select count(*)::int as n from operation_events where operation_id = $1::bigint and kind = 'cancelled'`, [X.op]) === 1 && P.liberadas.filter((x) => x === X.pi).length === 1
        && (await q1(`select seats_booked::int as n from trip_runs where id = $1::bigint`, [run])).n === 2, 'otra pasada: nada más (ni evento, ni otra suelta, ni asientos)');
      await V.barrerViajes({ negocio: B });
      const y = await q1(`select o.status as st, (select status from change_proposals where id = $2::bigint) as cp, (select status from payments where operation_id = o.id) as pay from operations o where o.id = $1::bigint`, [Y.op, Y.cp]);
      ok(y.st === 'change_proposed' && y.cp === 'open' && y.pay === 'held', 'la que todavía está a tiempo no se toca (el barrido de todo el negocio)');
      ok(avisados.slice(n0).every((a) => a[1] === u || a[1] === B), 'ningún aviso a nadie más');
      // Lo de esta corrida no queda vivo: la otra reserva la rechaza el cliente por su camino (se suelta su retención).
      await db.query(`update operations set respond_by = now() - interval '1 minute' where id = $1::bigint`, [Y.op]);
      await db.query(`update change_proposals set respond_by = now() - interval '1 minute' where id = $1::bigint`, [Y.cp]);
      await V.barrerViajes({ negocio: B });
      ok((await q1(`select status as st from operations where id = $1::bigint`, [Y.op])).st === 'cancelled', 'al vencer, la otra también (nada queda retenido de esta corrida)');
    }

    // ── 2 · Plan del Hogar: la visita que ya pasó ──
    console.log('2 · Plan del Hogar: la visita que ya pasó pasa a la siguiente y tiene su cita');
    {
      const B = (await q1(`insert into businesses (id, city_id, category_id, name, status) values ($1, 'hzl', 'NEG-HOGAR', $2, 'active') returning id`, [`h9b-${RUN}`, `Prueba sql9b planes ${RUN}`])).id;
      await db.query(`insert into business_members (business_id, user_id, kind, display_name) values ($1, $2, 'owner', 'Dueña')`, [B, u]);
      await db.query(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ($1, $2, 'enabled', true, true, true)`, [B, `acct_sim_${B}`]);
      const it = (await q1(`insert into items (business_id, name, price_cents, svc_kind, sell, status) values ($1, '{"es":"Plan sql9b","en":"Plan sql9b"}'::jsonb, 14900, 'plan', true, 'live') returning id::text`, [B])).id;
      const num = `PL-9${String(++NUM).padStart(8, '0')}`, h = await hoy();
      const dia = (s, n) => { const d = new Date(`${s}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
      const det = { svc: { es: 'Plan sql9b', en: 'Plan sql9b' }, svcId: it, casa: { dir: '123 Calle Prueba', tenure: 'duena' } };
      const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, client_key) values ($1, 'plan', 'hzl', $2, $3, 'confirmed', $4::jsonb, 14900, 14900, 'app', gen_random_uuid()) returning id::text`,
        [num, B, u, JSON.stringify(det)])).id;
      // Visitas el 2.º martes de cada mes a las 9:00 AM; la «próxima» quedó hace 40 días (nadie abrió el plan); el cobro, dentro de 20 días.
      const id = (await q1(`insert into plan_subscriptions (operation_id, business_id, user_id, city_id, item_id, price_cents, dow, nth, window_m, charge_day, first_visit_on, next_visit_on, next_charge_on, payment_method)
                             values ($1::bigint, $2, $3, 'hzl', $4::bigint, 14900, 2, 2, 540, 5, $5::date, $5::date, $6::date, $7) returning id::text`, [op, B, u, it, dia(h, -40), dia(h, 20), `pm_fake_s9bv_${RUN}`])).id;
      // La regla, contada aparte: el primer 2.º martes de un mes que no sea antes de hoy.
      let esperado = null;
      for (let k = 0; k < 45 && !esperado; k++) { const f = dia(h, k), d = new Date(`${f}T12:00:00Z`); if (d.getUTCDay() === 2 && Math.ceil(d.getUTCDate() / 7) === 2) esperado = f; }
      await PL.barrerPlanes({ numero: num });
      const s = await q1(`select next_visit_on::text as next, next_charge_on::text as cobro, charges_ok::int as ok from plan_subscriptions where id = $1::bigint`, [id]);
      ok(s.next === esperado, `la próxima visita pasa al 2.º martes desde hoy (${s.next}; la regla: ${esperado})`);
      const citas = (await db.query(`select number as num, status as st, (scheduled_at at time zone 'America/New_York')::date::text as dia, to_char(scheduled_at at time zone 'America/New_York', 'HH24:MI') as hora, details->>'k' as k
                                      from operations where kind = 'appointment' and business_id = $1 and details->>'plan' = $2`, [B, num])).rows;
      ok(citas.length === 1 && citas[0].st === 'confirmed' && citas[0].dia === esperado && citas[0].hora === '09:00' && citas[0].k === 'plan', `su cita queda creada: confirmada, ese día a las 9:00 AM (${JSON.stringify(citas[0])})`);
      ok(s.cobro === dia(h, 20) && s.ok === 0 && P.cobros.filter((k) => k.startsWith(`plan-${id}-`)).length === 0, 'antes del día del cobro no se cobra nada');
      await PL.barrerPlanes({ numero: num });
      ok((await q1(`select next_visit_on::text as n from plan_subscriptions where id = $1::bigint`, [id])).n === esperado
        && await n1(`select count(*)::int as n from operations where kind = 'appointment' and business_id = $1 and details->>'plan' = $2`, [B, num]) === 1, 'otra pasada: ni otra cita ni otra fecha');
      // Lo de esta corrida no queda vivo para los barridos de otras: el plan se cancela.
      await db.query(`update plan_subscriptions set status = 'cancelled', updated_at = now() where id = $1::bigint`, [id]);
    }
  } catch (e) { fallas++; console.log('  ✗ excepción:', e && e.stack || e); }
  finally { await db.end().catch(() => undefined); }
  console.log(`\n${fallas ? '✗' : '✓'} sqldin9b-viajes-planes: ${checks - fallas}/${checks}`);
  process.exit(fallas ? 1 : 0);
})();
