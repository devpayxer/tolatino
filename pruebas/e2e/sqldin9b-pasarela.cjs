// 9b (28 nov, LAUNCH «Consultas que ninguna prueba ejecuta», 2ª parte) · lib/pagos/pasarela.ts (el simulador del sandbox) y lib/disputas.ts › aceptarDisputa: las
// consultas que ninguna prueba ejecutaba (la medida de pruebas/lib/consultas-medir.cjs), contra la base de pruebas, con la pasarela REAL en modo simulador (sin
// STRIPE_SECRET_KEY; sin servidor) transpilada por pruebas/lib/ts-servidor.cjs. El simulador hace de Stripe en el sandbox: si no se porta como Stripe, lo
// probado en el sandbox no es lo que pasa en producción.
//   1. Devolver (devolver) con la MISMA llave otra vez: contesta lo mismo (el mismo id) y no devuelve dos veces; dos a la vez con la misma llave, una sola
//      devolución. La misma llave con OTRO monto: idempotency_error, como Stripe con Idempotency-Key (antes decía amount_too_large, «sin saldo», que los
//      flujos toman como un «no» definitivo; Stripe contesta idempotency_error, que toman como «sin respuesta»), y no devuelve nada. Más de lo que queda:
//      amount_too_large y nada devuelto.
//   2. Revertir una transferencia (revertirTransferencia): lo mismo (otra vez con la misma llave, otro monto, más del saldo).
//   3. Aceptar una disputa (Super Admin › Colas › Disputas, aceptarDisputa): el «banco» del sandbox la da por perdida, la disputa queda aceptada y el cobro
//      con dispute_lost; otra vez: «Esta disputa ya se cerró» y el banco no cambia; una ya respondida (en revisión) también se acepta; una que el banco ya
//      decidió (ganada) no se mueve en el banco.
//   Lo que NO se prueba aquí: pasarela.cliente() (el cliente de Stripe de la persona) solo corre con Stripe de verdad (modo «stripe»); en el sandbox
//   devuelve null antes de su consulta. Queda en la lista de consultas sin ejecutar, a propósito.
// Precondiciones propias (corre dos veces seguidas): sus intentos y transferencias del simulador (ids con su corrida), su negocio, su cobro y sus disputas.
// Uso: DATABASE_URL=… node pruebas/e2e/sqldin9b-pasarela.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const crypto = require('crypto');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };
const hex = () => crypto.randomBytes(6).toString('hex');

// ── La pasarela real (simulador) y disputas real ──
const D = cargar('apps/web/lib/db.ts');
const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
class ErrorStripe extends Error { constructor(tipo, codigo) { super(codigo ?? tipo); this.tipo = tipo; this.codigo = codigo; } }
const stripes = [];
const PS = cargar('apps/web/lib/pagos/pasarela.ts', { '../db': D, '../entorno': { ENTORNO: 'pruebas' },
  './stripe': { ErrorStripe, stripe: async (...a) => { stripes.push(a); throw new Error('sin Stripe'); }, stripeArchivo: async () => { throw new Error('sin Stripe'); } },
  '../tiendas/revision': { pagoBloqueado: async () => null } });
const avisados = [];
const avisos = { avisar: async (u, t, v) => { avisados.push(['u', u, t, v]); }, avisarMuchos: async () => undefined, avisarNegocio: async (b, t, v) => { avisados.push(['b', b, t, v]); } };
const DI = cargar('apps/web/lib/disputas.ts', { './db': D, './pagos/pasarela': PS, './avisos': avisos, './pdf-simple': {}, './medios': { mediosListos: () => false } });
const P = PS.pasarela;
const RUN = hex().slice(0, 8);
const { esFijo } = require('../lib/telefonos-fijos.cjs');
const telNuevo = async () => { for (let i = 0; i < 400; i++) { const t = '570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); if (!esFijo(t) && !(await q1(`select 1 as x from users where phone = $1`, ['+1' + t]))) return '+1' + t; } throw new Error('no queda un teléfono 570-555 libre'); };
// Un cobro ya capturado en el «Stripe» del sandbox.
const intento = async (cents) => { const pi = `pi_sim_s9b_${RUN}_${hex()}`; await db.query(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card) values ($1, $2, 0, $3, 'succeeded', $2, 0, 'pm_sim_visa_4242')`, [pi, cents, `acct_sim_s9b_${RUN}`]); return pi; };
const devuelto = async (pi) => (await q1(`select refunded_cents::int as n from sim_intents where id = $1`, [pi])).n;
const reembolsos = async (pi) => Number((await q1(`select count(*)::int as n from sim_refunds where payment_intent = $1`, [pi])).n);

(async () => {
  try {
    ok(P.modo() === 'simulador', `la pasarela del sandbox está en modo simulador (${P.modo()})`);

    // ── 1 · Devolver ──
    console.log('1 · Devolver con la misma llave otra vez, con otro monto y por más de lo que queda');
    {
      const pi = await intento(5000), k = `s9b-dev-${RUN}`;
      const a = await P.devolver(pi, 1000, k);
      ok(a.ok && a.id === `re_sim_${k}` && await devuelto(pi) === 1000, `la primera devuelve $10 (${a.id})`);
      const b = await P.devolver(pi, 1000, k);
      ok(b.ok && b.id === a.id && await devuelto(pi) === 1000 && await reembolsos(pi) === 1, 'otra vez con la misma llave: lo mismo (el mismo id) y no devuelve dos veces');
      const c = await P.devolver(pi, 1500, k);
      ok(!c.ok && c.codigo === 'idempotency_error' && await devuelto(pi) === 1000 && await reembolsos(pi) === 1, `la misma llave con OTRO monto: idempotency_error, como Stripe (${c.codigo}), y nada se devuelve`);
      const k2 = `s9b-dev2-${RUN}`;
      const [x, y] = await Promise.all([P.devolver(pi, 500, k2), P.devolver(pi, 500, k2)]);
      ok(x.ok && y.ok && x.id === y.id && await devuelto(pi) === 1500 && await reembolsos(pi) === 2, 'dos a la vez con la misma llave: una sola devolución');
      const d = await P.devolver(pi, 9000, `s9b-dev3-${RUN}`);
      ok(!d.ok && d.codigo === 'amount_too_large' && await devuelto(pi) === 1500 && await reembolsos(pi) === 2, `más de lo que queda ($35): amount_too_large y nada devuelto (${d.codigo})`);
      const e = await P.devolver(pi, 9000, `s9b-dev3-${RUN}`);
      ok(!e.ok && e.codigo === 'amount_too_large' && await reembolsos(pi) === 2, 'la llave del «no» no quedó gastada: otra vez, el mismo «no»');
    }

    // ── 2 · Revertir una transferencia ──
    console.log('2 · Revertir una transferencia con la misma llave otra vez, con otro monto y por más del saldo');
    {
      const t = await P.transferir({ centavos: 4000, destino: `acct_sim_s9b_${RUN}`, grupo: `s9b-${RUN}`, idem: `s9b-tr-${RUN}`, meta: { prueba: 'sql9b' } });
      ok(t.ok && t.id === `tr_sim_s9b-tr-${RUN}`, `la transferencia del simulador (${t.id})`);
      const rev = async () => (await q1(`select reversed_cents::int as n from sim_transfers where id = $1`, [t.id])).n;
      const nrev = async () => Number((await q1(`select count(*)::int as n from sim_transfer_reversals where transfer_id = $1`, [t.id])).n);
      const k = `s9b-rev-${RUN}`;
      const a = await P.revertirTransferencia(t.id, 1000, k, { tl_intencion: `prueba:${RUN}` });
      ok(a.ok && a.id === `trr_sim_${k}` && await rev() === 1000, `la primera revierte $10 (${a.id})`);
      const b = await P.revertirTransferencia(t.id, 1000, k, { tl_intencion: `prueba:${RUN}` });
      ok(b.ok && b.id === a.id && await rev() === 1000 && await nrev() === 1, 'otra vez con la misma llave: lo mismo y no revierte dos veces');
      const c = await P.revertirTransferencia(t.id, 2500, k);
      ok(!c.ok && c.codigo === 'idempotency_error' && await rev() === 1000 && await nrev() === 1, `la misma llave con OTRO monto: idempotency_error, como Stripe (${c.codigo})`);
      const d = await P.revertirTransferencia(t.id, 3500, `s9b-rev2-${RUN}`);
      ok(!d.ok && d.codigo === 'amount_too_large' && await rev() === 1000 && await nrev() === 1, `más del saldo ($30 quedan): amount_too_large y nada revertido (${d.codigo})`);
    }

    // ── 3 · Aceptar una disputa ──
    console.log('3 · Aceptar una disputa (Super Admin › Colas › Disputas)');
    {
      const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Sql9b') returning id::text`, [await telNuevo()])).id;
      const b = (await q1(`insert into businesses (id, city_id, category_id, name, status) values ($1, 'hzl', 'NEG-FOOD', $2, 'active') returning id`, [`d9b-${RUN}`, `Prueba sql9b disputas ${RUN}`])).id;
      const cobro = async () => {
        const pi = await intento(3000), num = `S9B${RUN}${hex().slice(0, 4)}`;
        const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, total_cents, subtotal_cents, pay_mode, pay_status, client_key) values ($1, 'order', 'hzl', $2, $3, 'done', 3000, 3000, 'app', 'captured', gen_random_uuid()) returning id::text`, [num, b, u])).id;
        const p = (await q1(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, held_at, captured_at, simulated)
                             values ($1::bigint, $2, $3, 'hzl', 'full', 'card', $4, 3000, 3000, 300, 'captured', now(), now(), true) returning id::text`, [op, u, b, pi])).id;
        const s = await DI.simularDisputa(p, 'fraudulent');
        const d = await q1(`select id::text, stripe_dispute_id as sid, status as st from disputes where payment_id = $1::bigint`, [p]);
        return { pi, p, s, d };
      };
      const banco = async (sid) => (await q1(`select status from sim_disputes where id = $1`, [sid])).status;
      const A = await cobro();
      ok(A.s.ok && A.d?.st === 'needs_response' && await banco(A.d.sid) === 'needs_response', `la disputa abierta, en el libro y en el «banco» del sandbox (${A.d?.sid})`);
      const r = await DI.aceptarDisputa(A.d.id);
      const d = await q1(`select status as st, closed_at is not null as cerrada from disputes where id = $1::bigint`, [A.d.id]);
      ok(r.ok && d.st === 'accepted' && d.cerrada && await banco(A.d.sid) === 'lost', `aceptada: el banco la da por perdida y la disputa queda aceptada (${d.st}, banco ${await banco(A.d.sid)})`);
      ok((await q1(`select failure_code as fc from payments where id = $1::bigint`, [A.p])).fc === 'dispute_lost', 'el cobro queda con dispute_lost (el dinero vuelve al cliente)');
      const r2 = await DI.aceptarDisputa(A.d.id);
      ok(!r2.ok && r2.msg === 'Esta disputa ya se cerró.' && await banco(A.d.sid) === 'lost', 'otra vez: «Esta disputa ya se cerró» y el banco no cambia');
      // Una ya respondida (en revisión del banco) también se acepta.
      const B = await cobro();
      await db.query(`update disputes set status = 'under_review', responded_at = now() where id = $1::bigint`, [B.d.id]);
      await db.query(`update sim_disputes set status = 'under_review' where id = $1`, [B.d.sid]);
      const rb = await DI.aceptarDisputa(B.d.id);
      ok(rb.ok && (await q1(`select status from disputes where id = $1::bigint`, [B.d.id])).status === 'accepted' && await banco(B.d.sid) === 'lost', 'una en revisión del banco: aceptada y perdida en el banco');
      // El banco ya la decidió (ganada) y aquí todavía no llegó el aviso: aceptar no la mueve en el banco.
      const C = await cobro();
      await db.query(`update sim_disputes set status = 'won' where id = $1`, [C.d.sid]);
      const rc = await DI.aceptarDisputa(C.d.id);
      ok(rc.ok && await banco(C.d.sid) === 'won', `una que el banco ya ganó: el banco no cambia (${await banco(C.d.sid)})`);
      ok(stripes.length === 0, 'nada fue a Stripe (todo en el simulador)');
      // Los casos de la cola que abrió esta prueba se cierran como lo haría el equipo al aceptar.
      await db.query(`update queue_items set status = 'decided', decision = 'aceptar', reason = 'Prueba sql9b', decided_at = now() where queue = 'disputa' and subject_kind = 'dispute' and subject_id = any($1::text[]) and status = 'open'`,
        [[A.d.id, B.d.id, C.d.id]]);
    }
  } catch (e) { fallas++; console.log('  ✗ excepción:', e && e.stack || e); }
  finally { await db.end().catch(() => undefined); }
  console.log(`\n${fallas ? '✗' : '✓'} sqldin9b-pasarela: ${checks - fallas}/${checks}`);
  process.exit(fallas ? 1 : 0);
})();
