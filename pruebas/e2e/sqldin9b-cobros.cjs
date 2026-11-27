// 9b (27 nov, LAUNCH «Consultas que ninguna prueba ejecuta») · lib/cobros.ts: lo que ninguna prueba ejecutaba (la medida de pruebas/lib/consultas-medir.cjs
// sobre el servidor y las pruebas de Node), contra la base de pruebas y con una pasarela de mentira (sin servidor), con el archivo REAL transpilado por
// pruebas/lib/ts-servidor.cjs (la armazón de din9t):
//   1. actualizarCuenta (al volver de Stripe al panel › Cobros y desde el webhook account.updated): el estado real de la cuenta de cobro se guarda. En el
//      sandbox nunca corría (la cuenta simulada no se le pregunta a Stripe: pasarela.cuentaLeer da null) y quien la llama se traga el error
//      (.catch(() => undefined)): un SQL roto aquí dejaba la cuenta «pendiente» para siempre sin que nadie lo viera. Habilitada (cobros + pagos, nada
//      pendiente), restringida (cobros sin pagos o con algo pendiente: la lista, a 20), pendiente (nada); la cuenta del banco se guarda y no se borra si
//      Stripe no la manda; sin respuesta de Stripe no se toca nada; otro negocio no cambia.
//   2. liberarOperacion cuando Stripe dice que ya la había cobrado y OTRO proceso cambió el cobro en ese momento (el barrido, el webhook): no se pisa;
//      se dice lo que dice la base ahora (soltado por el otro → «liberada»; cobrado por el otro → «cobrada» con lo suyo; fallido → «fallo»), sin
//      evento ni aviso propio.
//   3. devolverAlCancelar (cancela el negocio) cuando la devolución ni siquiera se puede anotar (otra devolución de ese cobro sigue en camino): «fallida»
//      por lo que faltaba, UNA alerta refund_stuck cancelacion:<llave> al equipo de dinero (otra vez: la misma alerta), nada a la pasarela y ninguna
//      devolución con esa llave. Al final la otra devolución se cierra por su camino real (no queda nada en camino en la base).
// Precondiciones propias (corre dos veces seguidas): sus negocios y sus cuentas de cobro; no toca nada de la semilla.
// Uso: DATABASE_URL=… node pruebas/e2e/sqldin9b-cobros.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const crypto = require('crypto');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };

// ── Los módulos reales, con lo de afuera de mentira ──
const D = cargar('apps/web/lib/db.ts');
const avisados = [];
const avisos = { avisar: async (u, t) => { avisados.push(t); }, avisarMuchos: async () => undefined, avisarNegocio: async (b, t) => { avisados.push(t); } };
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos });
// La pasarela de mentira: lo que «Stripe» dice de cada cuenta (null = no contesta / cuenta simulada, como pasarela.cuentaLeer).
// liberar: lo que el «otro proceso» hace con el cobro mientras Stripe contesta (otro), y la respuesta (ya cobrada). devolver: «red» (sin respuesta) o el sí.
const P = { modo: () => 'simulador', cuentas: new Map(), leidas: [], async cuentaLeer(a) { this.leidas.push(a); return this.cuentas.has(a) ? this.cuentas.get(a) : null; },
  otro: new Map(), async liberar(pi) { const f = this.otro.get(pi); if (f) await f(); return { ok: false, codigo: 'payment_intent_unexpected_state', cobrado: 5000 }; },
  devueltas: [], devolverPaso: 'ok', async devolver(pi, n, idem) { this.devueltas.push(idem); return this.devolverPaso === 'red' ? { ok: false, codigo: 'red' } : { ok: true, id: `re_fake_${crypto.randomBytes(6).toString('hex')}` }; },
  buscarDevolucion: async () => ({ ok: false }) };
const K = {}, DC = {};
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './consulta-pasarela': K, './devolucion-consulta': DC });

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
const RUN = crypto.randomBytes(4).toString('hex');

async function cuenta(sufijo, x = {}) {
  const b = (await q1(`insert into businesses (id, city_id, category_id, name) values ($1, 'hzl', 'NEG-FOOD', $2) returning id`, [`c9b-${RUN}-${sufijo}`, `Prueba sql9b ${RUN}`])).id;
  const a = `acct_fake_c9b_${RUN}_${sufijo}`;
  await db.query(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4) values ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [b, a, x.status ?? 'pending', !!x.cargos, !!x.pagos, JSON.stringify(x.pide ?? []), x.banco ?? null]);
  return { b, a };
}
const { esFijo } = require('../lib/telefonos-fijos.cjs');
const telNuevo = async () => { for (let i = 0; i < 400; i++) { const t = '570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); if (!esFijo(t) && !(await q1(`select 1 as x from users where phone = $1`, ['+1' + t]))) return '+1' + t; } throw new Error('no queda un teléfono 570-555 libre'); };
let NUM = Number(String(Date.now()).slice(-6)) * 10 + 7;
// Una operación con su cobro (retenido o cobrado), de un negocio propio.
async function cobro(x, st) {
  const num = `c9b${RUN}${++NUM}`;
  const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, total_cents, subtotal_cents, pay_status) values ($1, 'order', 'hzl', $2, $3, 'app', gen_random_uuid(), 'confirmed', 5000, 5000, $4) returning id::text`,
    [num, x.b, x.u, st])).id;
  const pi = `pi_fake_c9b_${num}`;
  const p = (await q1(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, held_at, captured_at)
                         values ($1::bigint, $2, $3, 'hzl', 'full', 'card', $4, 5000, 5000, 500, $5, now(), case when $5 = 'captured' then now() end) returning id::text`, [op, x.u, x.b, pi, st])).id;
  return { op, p, pi, num };
}
const pagoDe = (id) => q1(`select status, amount_cents::int as amt, refunded_cents::int as ref, released_at is not null as soltado from payments where id = $1::bigint`, [id]);
const fila = async (b) => q1(`select status, charges_enabled as c, payouts_enabled as p, requirements as req, bank_last4 as banco, updated_at::text as at from stripe_accounts where business_id = $1`, [b]);

(async () => {
  try {
    // ── 1 · actualizarCuenta ──
    console.log('1 · actualizarCuenta: el estado real de la cuenta de cobro se guarda');
    {
      const A = await cuenta('a'), R = await cuenta('r', { banco: '1111' }), N = await cuenta('n', { status: 'restricted', cargos: true, pide: ['individual.ssn_last_4'] }), S = await cuenta('s', { status: 'enabled', cargos: true, pagos: true, banco: '2222' });
      const otro = await cuenta('o', { status: 'restricted', cargos: true, pide: ['external_account'], banco: '3333' });
      const largo = Array.from({ length: 25 }, (_, i) => `requisito_${i}`);
      P.cuentas.set(A.a, { cargos: true, pagos: true, pide: [], banco: '6789' });
      P.cuentas.set(R.a, { cargos: true, pagos: false, pide: largo, banco: null });
      P.cuentas.set(N.a, { cargos: false, pagos: false, pide: [], banco: null });
      const otroAntes = await fila(otro.b), simAntes = await fila(S.b);
      for (const x of [A, R, N, S]) await cobros.actualizarCuenta(x.b);
      const a = await fila(A.b), r = await fila(R.b), n = await fila(N.b), s = await fila(S.b);
      ok(a.status === 'enabled' && a.c && a.p && Array.isArray(a.req) && a.req.length === 0 && a.banco === '6789', 'cobros y pagos sin nada pendiente: habilitada, con la cuenta del banco que dio Stripe');
      ok(r.status === 'restricted' && r.c && !r.p && r.req.length === 20 && r.req[0] === 'requisito_0' && r.req[19] === 'requisito_19', 'cobros sin pagos y con pendientes: restringida, con lo pendiente (hasta 20)');
      ok(r.banco === '1111', 'sin cuenta del banco en la respuesta, la guardada no se borra');
      ok(n.status === 'pending' && !n.c && !n.p && n.req.length === 0, 'nada habilitado y nada pendiente: pendiente (ya no «restringida»)');
      ok(JSON.stringify(s) === JSON.stringify(simAntes), 'sin respuesta de Stripe (cuenta simulada), nada cambia');
      ok(JSON.stringify(await fila(otro.b)) === JSON.stringify(otroAntes), 'otro negocio no cambia');
      ok(P.leidas.includes(A.a) && P.leidas.includes(S.a) && !P.leidas.includes(otro.a), 'se le pregunta a Stripe por la cuenta de cada negocio, solo la suya');
      await cobros.actualizarCuenta(`c9b-${RUN}-no-existe`);
      ok(P.leidas.length === 4, 'un negocio sin cuenta de cobro: no se pregunta nada');
    }

    const X = { u: (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Sql9b') returning id::text`, [await telNuevo()])).id, b: (await cuenta('x')).b };

    // ── 2 · liberarOperacion: Stripe ya la había cobrado y otro cambió el cobro mientras tanto ──
    console.log('2 · liberarOperacion: Stripe la dice cobrada y otro proceso cambió el cobro en ese momento');
    {
      const casos = [
        ['released', `update payments set status = 'released', released_at = now(), updated_at = now() where id = $1::bigint and status = 'held'`, 'liberada', 'otro la soltó: «liberada», como quedó'],
        ['captured', `update payments set status = 'captured', amount_cents = 4000, captured_at = now(), updated_at = now() where id = $1::bigint and status = 'held'`, 'cobrada', 'otro la cobró: «cobrada», con lo que cobró el otro (no se pisa con lo que dijo Stripe)'],
        ['failed', `update payments set status = 'failed', failure_code = 'otro_proceso', updated_at = now() where id = $1::bigint and status = 'held'`, 'fallo', 'otro la dio por fallida: «fallo» (sigue para el barrido y su alerta)'],
      ];
      for (const [st, sql, esperado, texto] of casos) {
        const c = await cobro(X, 'held');
        P.otro.set(c.pi, () => db.query(sql, [c.p]));
        const antes = avisados.length;
        const r = await cobros.liberarOperacion(c.op);
        const p = await pagoDe(c.p);
        ok(r === esperado && p.status === st && (st !== 'captured' || p.amt === 4000), `${texto} (${r}, ${p.status}, ${p.amt})`);
        const ev = Number((await q1(`select count(*)::int as n from operation_events where operation_id = $1::bigint and kind in ('payment_captured', 'payment_released')`, [c.op])).n);
        ok(ev === 0 && avisados.length === antes && (await q1(`select pay_status from operations where id = $1::bigint`, [c.op])).pay_status === 'held', '… sin evento, sin aviso y sin tocar la operación (lo escribe quien la cambió)');
      }
    }

    // ── 3 · devolverAlCancelar: la devolución no se pudo ni anotar ──
    console.log('3 · devolverAlCancelar: la devolución no se puede anotar (otra de ese cobro sigue en camino)');
    {
      const c = await cobro(X, 'captured');
      P.devolverPaso = 'red';
      const otra = `c9b-otra-${RUN}`;
      const r0 = await cobros.devolverPago({ paymentId: c.p, centavos: 1000, por: 'admin', actorId: null, motivo: 'Prueba sql9b (otra)', idem: otra });
      const pend = await q1(`select id::text, status from refunds where idem_key = $1`, [otra]);
      ok(r0.ok === false && r0.enCamino && pend?.status === 'pending', 'otra devolución de ese cobro queda en camino (Stripe no contestó)');
      P.devolverPaso = 'ok';
      const llave = `c9b-cx-${RUN}`, antes = P.devueltas.length;
      const o = { id: c.op, pay: 'captured', pid: c.p, amount: 5000, refunded: 0 };
      const r = await cobros.devolverAlCancelar(o, { actorId: null, motivo: 'Prueba sql9b', idem: llave, por: 'business' });
      ok(r.e === 'fallida' && r.monto === 5000, `«fallida» por lo que faltaba devolver (${r.e}, ${r.monto})`);
      ok(!(await q1(`select 1 as x from refunds where split_part(idem_key, '~fallida-', 1) = $1`, [llave])) && P.devueltas.length === antes, 'ninguna devolución con esa llave y nada a la pasarela');
      const al = await q1(`select count(*)::int as n, min(amount_cents)::int as amt, min(business_id) as biz, min(detail->>'es') as es, min(detail->>'en') as en from money_alerts where kind = 'refund_stuck' and subject_id = $1`, [`cancelacion:${llave}`]);
      ok(al.n === 1 && al.amt === 5000 && al.biz === X.b && /no se pudo anotar/.test(al.es) && /could not be recorded/.test(al.en), 'UNA alerta refund_stuck cancelacion:<llave> al equipo de dinero, con el monto y el negocio (ES/EN)');
      const r2 = await cobros.devolverAlCancelar(o, { actorId: null, motivo: 'Prueba sql9b', idem: llave, por: 'business' });
      ok(r2.e === 'fallida' && Number((await q1(`select count(*)::int as n from money_alerts where kind = 'refund_stuck' and subject_id = $1`, [`cancelacion:${llave}`])).n) === 1, 'otra vez: la misma alerta (no dos)');
      // La otra devolución se cierra por su camino real: no queda nada en camino.
      const rc = await cobros.ejecutarDevolucionPago(pend.id);
      ok(rc.ok && (await q1(`select status from refunds where id = $1::bigint`, [pend.id])).status === 'done' && (await pagoDe(c.p)).ref === 1000, 'la otra devolución se cierra hecha ($10 devueltos): nada queda en camino');
    }
  } catch (e) { fallas++; console.log('  ✗ excepción:', e && e.stack || e); }
  finally { await db.end().catch(() => undefined); }
  console.log(`\n${fallas ? '✗' : '✓'} sqldin9b-cobros: ${checks - fallas}/${checks}`);
  process.exit(fallas ? 1 : 0);
})();
