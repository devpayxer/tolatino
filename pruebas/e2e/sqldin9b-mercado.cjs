// 9b (28 nov, LAUNCH «Consultas que ninguna prueba ejecuta», 2ª parte) · lib/mercado.ts, lib/apartados.ts y lib/dinero-alertas.ts › alertarOtroMontoPago:
// las consultas que ninguna prueba ejecutaba (la medida de pruebas/lib/consultas-medir.cjs), contra la base de pruebas y con una pasarela de mentira (sin
// servidor), con los archivos REALES (mercado, pedir, menu, cobros, dinero-alertas, apartados) transpilados por pruebas/lib/ts-servidor.cjs:
//   1. Pedir del mercado un producto con existencias contadas (stock_mode 'qty', pago en el mercado): cada pedido descuenta lo pedido; pedir más de lo
//      que queda se rechaza («solo quedan N», ES/EN) sin pedido y sin tocar las existencias; lo que no se cuenta (stock_mode 'none') no descuenta.
//   2. Liquidar (cobrar lo real y soltar el resto) cuando la pasarela dice que no: el cobro sigue retenido con su código, nada se anota (ni evento ni aviso)
//      y el siguiente intento lo cobra (el código se limpia; sin alerta de otro monto: Stripe cobró lo pedido).
//   3. Liquidar cuando OTRO proceso ya anotó la captura de la primera retención (con lo que Stripe capturó, menos de lo pedido): no se pisa, se relee y
//      lo que falta se cobra de la segunda con lo que de verdad quedó (nunca de más, nunca de menos).
//   4. Liquidar cuando Stripe capturó OTRO monto que el pedido (el intento ya estaba capturado): el libro anota lo capturado y el equipo de dinero tiene UNA
//      alerta gateway_review capturado:payments:<cobro> (ES/EN, con el número del pedido); otra pasada no la repite. Al final el equipo la marca resuelta.
//   5. Apartado con envío (cobrarApartado al marcar «Enviado»): la pasarela dice que no → sigue retenido con su código, nada cobrado; el reintento lo cobra.
// Precondiciones propias (corre dos veces seguidas): su mercado, su tienda, sus clientes y sus pedidos; no toca nada de la semilla.
// Uso: DATABASE_URL=… node pruebas/e2e/sqldin9b-mercado.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
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
const avisos = { avisar: async (u, t, v) => { avisados.push(['u', u, t, v]); return true; }, avisarMuchos: async () => undefined, avisarNegocio: async (b, t, v) => { avisados.push(['b', b, t, v]); return true; } };
const valores = async (...ks) => { const o = {}; for (const k of ks) o[k] = Number((await q1(`select cfg_int($1) as v`, [k])).v); return o; };
const config = { valores, valor: async (k) => (await valores(k))[k], cfgSql: (k) => `cfg_int('${k}')` };
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: async () => undefined } });
// La pasarela de mentira: cada intento contesta lo que diga `plan` (por intento: una función que puede hacer de «otro proceso» antes de contestar).
const P = {
  modo: () => 'simulador', plan: new Map(), cobros: [], liberadas: [],
  async cobrar(pi, n, fee) { this.cobros.push([pi, n, fee]); const f = this.plan.get(pi); return f ? f(n) : { ok: true, cobrado: n }; },
  async liberar(pi) { this.liberadas.push(pi); return { ok: true }; },
  cliente: async () => null, retener: async () => ({ ok: false, codigo: 'no_en_esta_prueba', mensaje: { es: '', en: '' } }), buscarCobro: async () => ({ ok: false }),
};
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': {}, './devolucion-consulta': {} });
const DE = cargar('apps/web/lib/dias-especiales.ts'), MV = cargar('apps/web/lib/menu-ventas.ts'), VP = cargar('apps/web/lib/visible-publico.ts');
const MENU = cargar('apps/web/lib/menu.ts', { './db': D, './menu-ventas': MV });
const PEDIR = cargar('apps/web/lib/pedir.ts', { './dias-especiales': DE, './menu-ventas': MV, './visible-publico': VP, './platos-guardados': {}, './config': config, './db': D, './menu': MENU,
  './pedidos': {}, './cobros': cobros, './cupon-seguidores': {}, '@/lib/dos-idiomas': cargar('apps/web/lib/dos-idiomas.ts') });
const MER = cargar('apps/web/lib/mercado.ts', { './dias-especiales': DE, './cobros': cobros, './devolucion-cancelar': cargar('apps/web/lib/devolucion-cancelar.ts'), './db': D, './menu': MENU,
  './pagos/pasarela': { pasarela: P }, './pagos/verificacion': { bancoPide: () => null, pideVerificar: () => null }, './pedir': PEDIR, './avisos': avisos, './dinero-alertas': alertas });
const APT = cargar('apps/web/lib/apartados.ts', { './dias-especiales': DE, './config': config, './db': D, './menu-ventas': MV, './punto': {}, './visible-publico': VP, './cobros': cobros,
  './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas, './avisos': avisos });

const { esFijo } = require('../lib/telefonos-fijos.cjs');
const telNuevo = async () => { for (let i = 0; i < 400; i++) { const t = '570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); if (!esFijo(t) && !(await q1(`select 1 as x from users where phone = $1`, ['+1' + t]))) return '+1' + t; } throw new Error('no queda un teléfono 570-555 libre'); };
const RUN = hex().slice(0, 8);
const persona = async (nombre) => (await q1(`insert into users (phone, first_name, last_name) values ($1, $2, 'Sql9b') returning id::text`, [await telNuevo(), nombre])).id;
async function negocio(sufijo, cat) {
  const b = (await q1(`insert into businesses (id, city_id, category_id, name, status, modules_on) values ($1, 'hzl', $2, $3, 'active', '{pedidos}') returning id`, [`m9b-${RUN}-${sufijo}`, cat, `Prueba sql9b ${sufijo} ${RUN}`])).id;
  await db.query(`insert into business_stats_cache (business_id, plan) values ($1, 'pro') on conflict (business_id) do update set plan = 'pro'`, [b]);
  await db.query(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ($1, $2, 'enabled', true, true, true)`, [b, `acct_sim_${b}`]);
  // Abre todos los días de 8 AM a 8 PM (las franjas de pickup de mañana existen siempre).
  for (let d = 0; d < 7; d++) await db.query(`insert into business_hours (business_id, module, weekday, open, ranges) values ($1, '', $2, true, '[["08:00","20:00"]]'::jsonb)`, [b, d]);
  return b;
}
const item = async (b, nombre, o) => (await q1(`insert into items (business_id, module, name, price_cents, shop_kind, unit, stock_mode, stock_left, sell, status) values ($1, 'shop', $2::jsonb, $3, $4, $5, $6, $7, true, 'live') returning id::text`,
  [b, JSON.stringify({ es: nombre, en: nombre }), o.cents, o.kind ?? 'unid', o.kind === 'peso' ? 'lb' : 'u', o.stock ?? 'none', o.left ?? 0])).id;
const quedan = async (id) => (await q1(`select stock_left::int as n from items where id = $1::bigint`, [id])).n;
// Un pedido del mercado ya pesado y terminado, con sus líneas (lo real) y sus retenciones (full y, si va, extra), en UNA sentencia (el barrido del servidor, si
// corre, no lo alcanza a medias). Los intentos son de mentira (pi_fake_…): nadie más que esta prueba los cobra.
let NUM = Number(String(Date.now()).slice(-7));
async function pedidoPesado(B, U, lineas, full, extra) {
  const num = `M-9${String(++NUM).padStart(8, '0')}`, piF = `pi_fake_s9bm_${RUN}_${num}_f`, piX = `pi_fake_s9bm_${RUN}_${num}_x`, real = lineas.reduce((a, x) => a + x, 0);
  const op = (await q1(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, mode, scheduled_at, details, subtotal_cents, total_cents, pay_mode, client_key, is_test, pay_status)
      values ($1, 'market_order', 'hzl', $2, $3, 'done', 'pickup', now(), jsonb_build_object('est_cents', $4::int), $4, $4, 'app', gen_random_uuid(), true, 'held') returning id),
    l as (insert into operation_lines (operation_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) select o.id, '{"es":"Artículo sql9b","en":"Item sql9b"}'::jsonb, 1, x, x, 0, '[]'::jsonb from o, unnest($5::int[]) x),
    p as (insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at)
          select o.id, $3::uuid, $2, 'hzl', 'full', 'card', $6, $7::int, $7::int, 0, 'held', 'visa', '4242', now() from o
          union all select o.id, $3::uuid, $2, 'hzl', 'extra', 'card', $8, $9::int, $9::int, 0, 'held', 'visa', '4242', now() from o where $9::int > 0)
    select id::text from o`, [num, B, U, real, lineas, piF, full, piX, extra ?? 0])).id;
  return { num, op, piF, piX };
}
const pago = (op, kind) => q1(`select id::text, status as st, amount_cents::int as amt, fee_cents::int as fee, failure_code as fc from payments where operation_id = $1::bigint and kind = $2`, [op, kind]);
const evs = async (op, kind) => Number((await q1(`select count(*)::int as n from operation_events where operation_id = $1::bigint and kind = $2`, [op, kind])).n);
const avisosDe = (tpl, num, desde = 0) => avisados.slice(desde).filter((a) => a[2] === tpl && (!num || a[3]?.num === num || JSON.stringify(a[3]).includes(num)));

(async () => {
  try {
    const BM = await negocio('merc', 'NEG-MERC');
    // ── 1 · Existencias contadas ──
    console.log('1 · Pedir del mercado un producto con existencias contadas');
    {
      const U1 = await persona('Mercado uno'), U2 = await persona('Mercado dos');
      const contado = await item(BM, `Aguacate sql9b ${RUN}`, { cents: 150, stock: 'qty', left: 5 }), libre = await item(BM, `Pan sql9b ${RUN}`, { cents: 300 });
      const op = await MER.opcionesMercado(BM, U1);
      const hora = op?.dias.find((d) => d.k === 'man')?.pk.find((f) => !f.lleno)?.v;
      ok(!!hora && op.prods.some((x) => x.id === contado && x.puede), `el mercado toma pedidos de pickup para mañana (${hora})`);
      const pedir = (U, lineas) => MER.crearPedidoMercado(U, { negocio: BM, clave: crypto.randomUUID(), lineas, modo: 'pickup', sub: 'call', dia: 'man', hora, pago: { tipo: 'local' } }, 'pruebas');
      const r1 = await pedir(U1, [{ item: contado, q: 3, o: null }, { item: libre, q: 2, o: null }]);
      ok(r1.ok && /^M-\d+$/.test(r1.numero) && await quedan(contado) === 2, `pedir 3 de 5: el pedido sale y quedan 2 (${r1.numero}, ${await quedan(contado)})`);
      const l1 = (await db.query(`select item_id::text as it, qty::int as q from operation_lines l join operations o on o.id = l.operation_id where o.number = $1 order by l.id`, [r1.numero])).rows;
      ok(l1.length === 2 && l1[0].it === contado && l1[0].q === 3 && l1[1].q === 2 && await quedan(libre) === 0, 'las líneas con lo pedido; lo que no se cuenta no descuenta');
      const n0 = Number((await q1(`select count(*)::int as n from operations where business_id = $1`, [BM])).n);
      const r2 = await pedir(U2, [{ item: contado, q: 3, o: null }]);
      ok(!r2.ok && r2.msg.es === `«Aguacate sql9b ${RUN}»: solo quedan 2.` && r2.msg.en === `“Aguacate sql9b ${RUN}”: only 2 left.`, `pedir 3 cuando quedan 2: «solo quedan 2» (ES/EN)`);
      ok(await quedan(contado) === 2 && Number((await q1(`select count(*)::int as n from operations where business_id = $1`, [BM])).n) === n0, '… sin pedido y sin tocar las existencias');
      const r3 = await pedir(U2, [{ item: contado, q: 2, o: null }]);
      ok(r3.ok && await quedan(contado) === 0, `pedir los 2 que quedan: sale y quedan 0 (${await quedan(contado)})`);
      const r4 = await pedir(U2, [{ item: contado, q: 1, o: null }]);
      ok(!r4.ok && await quedan(contado) === 0, 'con 0: ya no se puede pedir y no baja de 0');
    }

    // ── 2 · La pasarela dice que no al liquidar ──
    console.log('2 · Liquidar: la pasarela dice que no');
    const UM = await persona('Mercado cobro');
    {
      const M = await pedidoPesado(BM, UM, [3000], 3000, 0);
      P.plan.set(M.piF, () => ({ ok: false, codigo: 'card_declined' }));
      const n0 = avisados.length;
      const t = await MER.liquidarMercado(M.op);
      const p = await pago(M.op, 'full');
      ok(t.cobrado === 0 && t.liberado === 0 && p.st === 'held' && p.fc === 'card_declined', `nada cobrado ni soltado; el cobro sigue retenido con su código (${JSON.stringify(t)}, ${p.st}, ${p.fc})`);
      ok((await q1(`select pay_status from operations where id = $1::bigint`, [M.op])).pay_status === 'held' && await evs(M.op, 'payment_captured') === 0 && await evs(M.op, 'payment_released') === 0 && avisosDe('merc_cobrado', null, n0).length === 0,
        '… sin evento, sin aviso y la operación sigue «retenida»');
      P.plan.delete(M.piF);
      const t2 = await MER.liquidarMercado(M.op);
      const p2 = await pago(M.op, 'full');
      ok(t2.cobrado === 3000 && p2.st === 'captured' && p2.amt === 3000 && p2.fc === null && (await q1(`select pay_status from operations where id = $1::bigint`, [M.op])).pay_status === 'captured',
        `el siguiente intento lo cobra y el código se limpia (${JSON.stringify(t2)}, ${p2.st}, ${p2.fc})`);
      ok(await evs(M.op, 'payment_captured') === 1 && avisosDe('merc_cobrado', M.num, n0).length === 1 && avisosDe('merc_cobrado', M.num, n0)[0][3].monto === '$30', 'un evento y el aviso «Se cobraron $30»');
      ok(Number((await q1(`select count(*)::int as n from money_alerts where kind = 'gateway_review' and subject_id = $1`, [`capturado:payments:${p2.id}`])).n) === 0, 'Stripe cobró lo pedido: ninguna alerta de otro monto');
    }

    // ── 3 · Otro proceso ya anotó la primera captura ──
    console.log('3 · Liquidar: otro proceso ya anotó la captura de la primera retención');
    {
      // Lo real: $45 (dos líneas). Retenido: $30 (full) + $20 (extra). El otro capturó la primera por $25 (y Stripe lo dice) mientras esta pedía $30.
      const M = await pedidoPesado(BM, UM, [3000, 1500], 3000, 2000);
      const pf = await pago(M.op, 'full');
      P.plan.set(M.piF, async () => {
        await db.query(`update payments set status = 'captured', amount_cents = 2500, fee_cents = 0, captured_at = now(), updated_at = now() where id = $1::bigint and status = 'held'`, [pf.id]);
        return { ok: true, cobrado: 2500 };
      });
      const t = await MER.liquidarMercado(M.op);
      const f = await pago(M.op, 'full'), x = await pago(M.op, 'extra');
      ok(f.st === 'captured' && f.amt === 2500, `la primera queda como la anotó el otro ($25), no se pisa (${f.st}, ${f.amt})`);
      const pedidoX = P.cobros.filter((c) => c[0] === M.piX).map((c) => c[1]);
      ok(pedidoX.length === 1 && pedidoX[0] === 2000 && x.st === 'captured' && x.amt === 2000, `de la segunda se cobra lo que de verdad falta: $45 − $25 = $20 (pedido ${pedidoX}, anotado ${x.amt})`);
      ok(t.cobrado === 2000 && t.liberado === 0 && (await q1(`select pay_status from operations where id = $1::bigint`, [M.op])).pay_status === 'captured', `esta pasada cuenta solo lo suyo (${JSON.stringify(t)}) y la operación queda cobrada`);
      ok(Number((await q1(`select coalesce(sum(amount_cents), 0)::int as n from payments where operation_id = $1::bigint and status = 'captured'`, [M.op])).n) === 4500, 'en total, lo real: $45 (ni de más ni de menos)');
    }

    // ── 4 · Stripe capturó otro monto ──
    console.log('4 · Liquidar: Stripe capturó otro monto que el pedido (alertarOtroMontoPago)');
    {
      const M = await pedidoPesado(BM, UM, [3000], 3000, 0);
      P.plan.set(M.piF, () => ({ ok: true, cobrado: 2800 }));
      const t = await MER.liquidarMercado(M.op);
      const p = await pago(M.op, 'full');
      ok(p.st === 'captured' && p.amt === 2800 && t.cobrado === 2800 && t.liberado === 200, `el libro anota lo capturado ($28) y lo demás se libera (${p.amt}, ${JSON.stringify(t)})`);
      const al = await q1(`select count(*)::int as n, min(amount_cents)::int as amt, min(business_id) as biz, min(city_id) as city, min(detail->>'es') as es, min(detail->>'en') as en from money_alerts where kind = 'gateway_review' and subject_id = $1`, [`capturado:payments:${p.id}`]);
      ok(al.n === 1 && al.amt === 2800 && al.biz === BM && al.city === 'hzl', `UNA alerta gateway_review capturado:payments:${p.id} con lo capturado, el negocio y la ciudad`);
      ok(al.es.startsWith(`${M.num} (cobro ${p.id}): se pidió cobrar $30 y Stripe capturó $28`) && al.en.startsWith(`${M.num} (charge ${p.id}): $30 was requested and Stripe captured $28`), `… con el número del pedido (ES/EN): «${al.es.slice(0, 80)}…»`);
      await MER.liquidarMercado(M.op);
      await alertas.alertarOtroMontoPago(p.id, 3000, 2800);
      ok(Number((await q1(`select count(*)::int as n from money_alerts where kind = 'gateway_review' and subject_id = $1`, [`capturado:payments:${p.id}`])).n) === 1, 'otra pasada (y otra llamada): la misma alerta, no dos');
      await alertas.alertarOtroMontoPago(p.id, 3000, 3000); await alertas.alertarOtroMontoPago(p.id, 3000, null);
      ok(Number((await q1(`select count(*)::int as n from money_alerts where kind = 'gateway_review' and subject_id like 'capturado:payments:' || $1`, [p.id])).n) === 1, 'el mismo monto o sin dato de Stripe: nada');
      // El equipo la mira y la marca resuelta (no queda abierta en la lista del Super Admin después de la prueba).
      const equipo = await persona('Equipo');
      const id = (await q1(`select id::text from money_alerts where kind = 'gateway_review' and subject_id = $1`, [`capturado:payments:${p.id}`])).id;
      const nota = await alertas.notaAlerta({ id: equipo, cities: [] }, id, 'resuelta', 'Prueba sql9b: revisado en Stripe, cuadra.');
      ok(nota.ok && (await q1(`select action from money_alert_notes where alert_id = $1::bigint order by id desc limit 1`, [id])).action === 'resuelta', 'el equipo la marca resuelta (no tiene «Elegir cuál vale»)');
    }

    // ── 5 · Apartado con envío ──
    console.log('5 · Apartado con envío (cobrarApartado): la pasarela dice que no');
    {
      const BT = await negocio('tienda', 'NEG-TIENDA'), UA = await persona('Apartado');
      const num = `A-9${String(++NUM).padStart(8, '0')}`, pi = `pi_fake_s9ba_${RUN}_${num}`;
      const op = (await q1(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, scheduled_at, subtotal_cents, total_cents, pay_mode, client_key, is_test, pay_status, details)
          values ($1, 'hold', 'hzl', $2, $3, 'confirmed', 'on_the_way', 'delivery', now(), 4000, 4500, 'app', gen_random_uuid(), true, 'held', '{}'::jsonb) returning id),
        l as (insert into operation_lines (operation_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) select o.id, '{"es":"Camisa sql9b","en":"Shirt sql9b"}'::jsonb, 1, 4000, 4000, 0, '[]'::jsonb from o),
        p as (insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at)
              select o.id, $3::uuid, $2, 'hzl', 'full', 'card', $4, 5000, 5000, 0, 'held', 'visa', '4242', now() from o)
        select id::text from o`, [num, BT, UA, pi])).id;
      P.plan.set(pi, () => ({ ok: false, codigo: 'card_declined' }));
      const r = await APT.cobrarApartado(op);
      const p = await pago(op, 'full');
      ok(r.cobrado === 0 && r.liberado === 0 && p.st === 'held' && p.fc === 'card_declined' && await evs(op, 'payment_captured') === 0, `nada cobrado; sigue retenido con su código y sin evento (${JSON.stringify(r)}, ${p.st}, ${p.fc})`);
      P.plan.delete(pi);
      const r2 = await APT.cobrarApartado(op);
      const p2 = await pago(op, 'full');
      ok(r2.cobrado === 4500 && r2.liberado === 500 && p2.st === 'captured' && p2.amt === 4500 && p2.fc === null && await evs(op, 'payment_captured') === 1, `el reintento cobra lo apartado + el envío ($45) y suelta el resto ($5) (${JSON.stringify(r2)})`);
      const r3 = await APT.cobrarApartado(op);
      ok(r3.cobrado === 0 && P.cobros.filter((c) => c[0] === pi).length === 2, 'otra vez: ya cobrado, no se vuelve a pedir');
    }
  } catch (e) { fallas++; console.log('  ✗ excepción:', e && e.stack || e); }
  finally { await db.end().catch(() => undefined); }
  console.log(`\n${fallas ? '✗' : '✓'} sqldin9b-mercado: ${checks - fallas}/${checks}`);
  process.exit(fallas ? 1 : 0);
})();
