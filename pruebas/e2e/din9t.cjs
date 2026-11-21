// 9t (21 nov) · El dinero que sale, en dos pasos, contra la base de pruebas y con una pasarela de mentira (sin servidor): los archivos REALES de
// apps/web/lib (cobros, dinero-alertas, disputas, suscripcion) y la acción REAL de Colas (decidirSop), transpilados con pruebas/lib/ts-servidor.cjs.
// Recorre lo que la confirmación del 20 nov dejó anotado (LAUNCH «→ 9t»):
//   1. devolverPago: éxito; reintento con la misma llave; la pasarela dice que no (fallida, saldo y llave libres); sin respuesta (en camino, el
//      barrido la termina); el proceso muere entre el «sí» y el cierre (el barrido la cierra sin devolver dos veces, aunque el webhook ya la contó);
//      dos a la vez con la misma llave (una devolución) y con otra llave (la segunda espera); pasadas 23 h no se pregunta más (alerta).
//   2. decidirSop: dos decisiones a la vez sobre el mismo caso (una devolución, refunded_cents una vez); el proceso muere después de anotar (el
//      barrido termina el dinero y decidir otra vez usa ESA devolución); otro monto se rechaza.
//   3. Anular con cobro fallido: verificación del banco que ya pasó (no se anula, se dice); sin ella, Free + «canceled_admin» + auditoría juntos;
//      el candado del plan tomado por otro (se dice, nada cambia).
//   4. Disputas: un webhook que la cambió entre la lectura y la escritura no queda pisado (y se dice); el webhook de la propia acción sí vale.
// Uso: DATABASE_URL=… node pruebas/e2e/din9t.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const crypto = require('crypto');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Los módulos reales, con lo de afuera de mentira ──
const D = cargar('apps/web/lib/db.ts');
const avisos = { avisar: async () => undefined, avisarMuchos: async () => undefined, avisarNegocio: async () => undefined };
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos });
// La pasarela de mentira: devuelve una vez por llave (como Stripe con Idempotency-Key) y lleva la cuenta de lo que salió de verdad.
const P = {
  modo: () => 'simulador', salio: new Map(), llamadas: 0, plan: [], lento: 0, saldo: new Map(),
  async devolver(pi, n, idem) {
    this.llamadas++;
    if (this.lento) await dormir(this.lento);
    const paso = this.plan.length ? this.plan.shift() : 'ok';
    if (paso === 'no') return { ok: false, codigo: 'charge_disputed' };
    if (paso === 'red') return { ok: false, codigo: 'red' };
    const ya = this.salio.get(idem);
    if (ya) return ya.n === n ? { ok: true, id: ya.id } : { ok: false, codigo: 'idempotency_error' };
    const libre = (this.saldo.get(pi) ?? 0) - [...this.salio.values()].filter((x) => x.pi === pi).reduce((s, x) => s + x.n, 0);
    if (n > libre) return { ok: false, codigo: 'amount_too_large' };
    const r = { id: `re_fake_${crypto.randomBytes(6).toString('hex')}`, n, pi };
    this.salio.set(idem, r);
    // Devolvió, pero la respuesta no llegó: sin respuesta.
    if (paso === 'red-pero-hizo') return { ok: false, codigo: 'red' };
    return { ok: true, id: r.id };
  },
  vecesSalio(idem) { return [...this.salio.keys()].filter((k) => k === idem).length; },
};
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas });

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
// Cada corrida con sus propios renglones (la base de pruebas guarda los de corridas anteriores: nada se borra).
const RUN = crypto.randomBytes(4).toString('hex');
const auditoria = (accion) => async (c, x) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, after) values ('system', null, $1, 'payment', $2, $3::jsonb)`, [`${accion}.${RUN}`, x.pago, JSON.stringify(x)]);
const cuantas = async (accion) => Number((await q1(`select count(*)::int as n from audit_entries where action = $1`, [`${accion}.${RUN}`])).n);

async function datos() {
  const tel = `+1570${String(Date.now()).slice(-7)}`;
  const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Dinero') returning id::text`, [tel])).id;
  const b = (await q1(`insert into businesses (id, city_id, category_id, name) values ($1, 'hzl', 'NEG-FOOD', 'Prueba 9t') returning id`, [`p9t-${crypto.randomBytes(4).toString('hex')}`])).id;
  return { u, b };
}
let NUM = Number(String(Date.now()).slice(-6)) * 10;
async function cobro(x, monto = 5000) {
  const num = String(++NUM);
  const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, total_cents, subtotal_cents) values ($1, 'order', 'hzl', $2, $3, 'app', gen_random_uuid(), 'confirmed', $4, $4) returning id::text`,
    [num, x.b, x.u, monto])).id;
  const pi = `pi_fake_${num}`;
  const p = (await q1(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, captured_at)
                         values ($1::bigint, $2, $3, 'hzl', 'full', 'card', $4, $5, 500, 'captured', now()) returning id::text`, [op, x.u, x.b, pi, monto])).id;
  P.saldo.set(pi, monto);
  return { op, p, pi, num };
}
const pago = (id) => q1(`select refunded_cents::int as dev, status from payments where id = $1::bigint`, [id]);
const dev = (idem) => q1(`select id::text, status, amount_cents::int as amt, attempts::int as n, idem_key from refunds where idem_key = $1`, [idem]);
const atrasar = (id, min) => db.query(`update refunds set created_at = created_at - make_interval(mins => $2::int) where id = $1::bigint`, [id, min]);

(async () => {
  const X = await datos();
  console.log('1 · devolverPago en dos pasos');
  {
    const c = await cobro(X), k = `t9t-${crypto.randomUUID()}`;
    const r = await cobros.devolverPago({ paymentId: c.p, centavos: 1000, por: 'admin', actorId: null, motivo: 'prueba', idem: k }, auditoria('din9t.exito'));
    const f = await dev(k), p = await pago(c.p);
    ok(r.ok && f?.status === 'done' && p.dev === 1000 && p.status === 'partially_refunded' && P.vecesSalio(k) === 1, `éxito: la devolución 'done', el cobro con $10 devueltos y una sola en la pasarela (${f?.status}, ${p.dev}, ${p.status})`);
    ok(await cuantas('din9t.exito') === 1, 'la auditoría de quien decide entró una vez, con la intención');
    const r2 = await cobros.devolverPago({ paymentId: c.p, centavos: 1000, por: 'admin', actorId: null, motivo: 'prueba', idem: k }, auditoria('din9t.exito'));
    ok(r2.ok && (await pago(c.p)).dev === 1000 && P.vecesSalio(k) === 1 && await cuantas('din9t.exito') === 1, 'reintento con la misma llave: nada sale otra vez ni se audita otra vez');
  }
  {
    const c = await cobro(X), k = `t9t-${crypto.randomUUID()}`;
    P.plan = ['no'];
    const r = await cobros.devolverPago({ paymentId: c.p, centavos: 2000, por: 'admin', actorId: null, motivo: 'prueba', idem: k }, auditoria('din9t.no'));
    const fall = await q1(`select status, idem_key from refunds where payment_id = $1::bigint order by id desc limit 1`, [c.p]);
    ok(!r.ok && !r.enCamino && /Stripe no pudo/.test(r.msg.es), `la pasarela dice que no: la acción lo dice («${r.ok ? '' : r.msg.es}»)`);
    ok(fall?.status === 'failed' && fall.idem_key.startsWith(`${k}~fallida-`) && !(await dev(k)), 'queda fallida, con su llave libre (la fila guarda la original con «~fallida-»)');
    ok((await pago(c.p)).dev === 0, 'el saldo vuelve a estar libre: el cobro sigue sin devoluciones');
    const r2 = await cobros.devolverPago({ paymentId: c.p, centavos: 5000, por: 'admin', actorId: null, motivo: 'prueba', idem: k });
    ok(r2.ok && (await dev(k))?.status === 'done' && (await pago(c.p)).dev === 5000 && P.vecesSalio(k) === 1, 'el mismo toque otra vez es otro intento y devuelve todo lo cobrado (la fallida no cuenta)');
  }
  {
    const c = await cobro(X), k = `t9t-${crypto.randomUUID()}`;
    P.plan = ['red'];
    const r = await cobros.devolverPago({ paymentId: c.p, centavos: 1500, por: 'admin', actorId: null, motivo: 'prueba', idem: k });
    const f = await dev(k);
    ok(!r.ok && r.enCamino && f?.status === 'pending' && f.n === 1 && P.vecesSalio(k) === 0, `sin respuesta de Stripe: queda en camino (pendiente, 1 intento) y lo dice («${r.ok ? '' : r.msg.es}»)`);
    ok((await pago(c.p)).dev === 0, 'en camino: el cobro todavía no la cuenta como hecha');
    const otra = await cobros.devolverPago({ paymentId: c.p, centavos: 1000, por: 'admin', actorId: null, motivo: 'prueba', idem: `t9t-${crypto.randomUUID()}` });
    ok(!otra.ok && /en camino/.test(otra.msg.es), 'otra devolución del mismo cobro con OTRA llave espera a que termine (no se devuelve dos veces)');
    const n0 = await cobros.barrerDevolucionesPago();
    ok((await dev(k)).status === 'pending' && n0 >= 0, 'el barrido no toca una devolución de hace menos de 2 minutos (puede ir en camino)');
    await atrasar(f.id, 3);
    await cobros.barrerDevolucionesPago();
    ok((await dev(k)).status === 'done' && (await pago(c.p)).dev === 1500 && P.vecesSalio(k) === 1, 'el barrido la termina con la MISMA llave: hecha y una sola vez');
  }
  {
    const c = await cobro(X), k = `t9t-${crypto.randomUUID()}`;
    P.plan = ['red-pero-hizo'];
    const r = await cobros.devolverPago({ paymentId: c.p, centavos: 700, por: 'admin', actorId: null, motivo: 'prueba', idem: k });
    ok(!r.ok && r.enCamino && P.vecesSalio(k) === 1, 'Stripe devolvió pero la respuesta no llegó: queda en camino');
    await atrasar((await dev(k)).id, 3);
    await cobros.barrerDevolucionesPago();
    ok((await dev(k)).status === 'done' && (await pago(c.p)).dev === 700 && P.vecesSalio(k) === 1, 'el barrido pregunta con la misma llave: la cierra sin devolver dos veces');
  }
  {
    // El proceso muere entre el «sí» de la pasarela y el cierre: la intención está en la base, el dinero salió, nada más.
    const c = await cobro(X), k = `t9t-${crypto.randomUUID()}`;
    await cobros.devolverPago({ paymentId: c.p, centavos: 500, por: 'admin', actorId: null, motivo: 'antes', idem: `t9t-${crypto.randomUUID()}` });
    const a = await D.tx((cx) => cobros.anotarDevolucionPago(cx, { paymentId: c.p, centavos: 1200, por: 'admin', actorId: null, motivo: 'prueba', idem: k }, auditoria('din9t.muere')));
    const s = await P.devolver(c.pi, 1200, k);
    ok(a.ok && a.estado === 'pending' && s.ok && (await dev(k)).status === 'pending', 'la intención quedó en la base ANTES de la pasarela (pendiente, con su auditoría)');
    ok(await cuantas('din9t.muere') === 1, 'la auditoría de quien decide ya está, aunque el proceso muera');
    // El webhook charge.refunded llega antes que el cierre: el libro ya cuenta lo de Stripe (500 + 1200).
    await db.query(`update payments set refunded_cents = greatest(refunded_cents, 1700), status = 'partially_refunded' where id = $1::bigint`, [c.p]);
    await atrasar(a.id, 3);
    await cobros.barrerDevolucionesPago();
    const p = await pago(c.p);
    ok((await dev(k)).status === 'done' && P.vecesSalio(k) === 1 && p.dev === 1700, `el barrido la cierra con la misma llave; lo devuelto del cobro no se cuenta dos veces aunque el webhook llegó antes (${p.dev} de 5000)`);
  }
  {
    const c = await cobro(X), k = `t9t-${crypto.randomUUID()}`;
    P.lento = 300;
    const [a, b] = await Promise.all([1, 2].map(() => cobros.devolverPago({ paymentId: c.p, centavos: 800, por: 'admin', actorId: null, motivo: 'prueba', idem: k }, auditoria('din9t.doble'))));
    P.lento = 0;
    const n = Number((await q1(`select count(*)::int as n from refunds where payment_id = $1::bigint`, [c.p])).n);
    ok(a.ok && P.vecesSalio(k) === 1 && n === 1 && (await pago(c.p)).dev === 800 && await cuantas('din9t.doble') === 1, `dos toques a la vez con la misma llave: una devolución, una fila, una auditoría (el otro: ${b.ok ? 'hecha' : b.msg.es})`);
  }
  {
    const c = await cobro(X);
    P.lento = 300;
    const [a, b] = await Promise.all([1, 2].map(() => cobros.devolverPago({ paymentId: c.p, centavos: 3000, por: 'admin', actorId: null, motivo: 'prueba', idem: `t9t-${crypto.randomUUID()}` })));
    P.lento = 0;
    ok([a, b].filter((x) => x.ok).length === 1 && [a, b].some((x) => !x.ok && /en camino|hasta/.test(x.msg.es)) && (await pago(c.p)).dev === 3000, 'dos decisiones a la vez con otra llave sobre el mismo cobro: sale una; la otra espera (no pasa de lo cobrado)');
  }
  {
    const c = await cobro(X), k = `t9t-${crypto.randomUUID()}`;
    P.plan = ['red'];
    await cobros.devolverPago({ paymentId: c.p, centavos: 900, por: 'admin', actorId: null, motivo: 'prueba', idem: k });
    const f = await dev(k);
    await atrasar(f.id, 24 * 60);
    const antes = P.llamadas;
    await cobros.barrerDevolucionesPago();
    await cobros.barrerDevolucionesPago();
    const al = Number((await q1(`select count(*)::int as n from money_alerts where kind = 'refund_stuck' and subject_id = $1`, [f.id])).n);
    ok(P.llamadas === antes && (await dev(k)).status === 'pending' && al === 1, 'pasadas 23 h Stripe ya no recuerda la llave: no se pregunta más y el equipo de dinero recibe UNA alerta');
  }
  {
    const c = await cobro(X), k = `t9t-${crypto.randomUUID()}`;
    P.plan = ['red', 'no'];
    await cobros.devolverPago({ paymentId: c.p, centavos: 400, por: 'admin', actorId: null, motivo: 'prueba', idem: k });
    const f = await dev(k);
    await atrasar(f.id, 3);
    await cobros.barrerDevolucionesPago();
    const fall = await q1(`select status from refunds where id = $1::bigint`, [f.id]);
    const al = Number((await q1(`select count(*)::int as n from money_alerts where kind = 'refund_stuck' and subject_id = $1`, [f.id])).n);
    ok(fall.status === 'failed' && al === 1 && (await pago(c.p)).dev === 0, 'el barrido recibe un «no»: fallida, saldo libre y el equipo de dinero lo sabe (nadie miraba la pantalla)');
  }

  {
    // Una devolución por política (cancelar a tiempo) que Stripe rechaza: nadie mira la pantalla, el equipo de dinero lo sabe.
    const c = await cobro(X), k = `t9t-${crypto.randomUUID()}`;
    P.plan = ['no'];
    const r = await cobros.devolverPago({ paymentId: c.p, centavos: 5000, por: 'policy', actorId: null, motivo: 'Cancelación a tiempo', idem: k });
    const f = await q1(`select id::text, status from refunds where payment_id = $1::bigint order by id desc limit 1`, [c.p]);
    const al = Number((await q1(`select count(*)::int as n from money_alerts where kind = 'refund_stuck' and subject_id = $1`, [f.id])).n);
    ok(!r.ok && f.status === 'failed' && al === 1, 'una devolución por política que Stripe rechaza queda fallida y avisa al equipo de dinero');
  }

  console.log('2 · Colas › Ayuda con monto (decidirSop)');
  const staffU = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Equipo', 'Dinero') returning id::text`, [`+1484${String(Date.now()).slice(-7)}`])).id;
  const S = { id: staffU, role: 'admin', cities: [], puede: () => true };
  const auditar = async (c, a) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason) values ('staff', $1, $2, $3, $4, $5, $6, $7, $8)`,
    [a.actor, a.action, a.targetKind, a.targetId ?? null, a.city ?? null, a.before === undefined ? null : JSON.stringify(a.before), a.after === undefined ? null : JSON.stringify(a.after), a.reason ?? null]);
  const AC = cargar('apps/web/app/admin/acciones-colas.ts', {
    'next/cache': { revalidatePath: () => undefined }, '@/lib/salud-pro': { recalcularFiltrosSP: async () => undefined }, '@/lib/admin': { auditar, staff: async () => S },
    '@/lib/admin-colas': { colasVisibles: () => ['sop'] }, '@/lib/db': D, '@/lib/avisos': avisos, '@/lib/cobros': cobros,
    '@/lib/ayuda': { avisarAyuda: async () => undefined }, '@/lib/ayuda-cita': { avisarAyudaCita: async () => undefined },
  });
  async function caso() {
    const c = await cobro(X);
    const h = (await q1(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, status) values ($1, $2::bigint, $3, 'hzl', $4, 'falta', 'escalated') returning id::text`, [`B-${c.num}`, c.op, X.b, X.u])).id;
    const qi = (await q1(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('sop', 'help_request', $1, $2, 'hzl') returning id::text`, [h, X.b])).id;
    return { ...c, h, qi };
  }
  {
    const k = await caso();
    P.lento = 300;
    const [a, b] = await Promise.all([1, 2].map(() => AC.decidirSop(k.qi, 'Te devolvemos lo que faltó.', '12.00', crypto.randomUUID())));
    P.lento = 0;
    const h = await q1(`select status, refunded_cents::int as dev from help_requests where id = $1::bigint`, [k.h]);
    const n = Number((await q1(`select count(*)::int as n from refunds where payment_id = $1::bigint`, [k.p])).n);
    ok([a, b].filter((x) => x.ok).length === 1 && P.vecesSalio(`sop-q${k.qi}`) === 1 && n === 1, `dos decisiones a la vez sobre el mismo caso: una devolución (la llave es el caso) (${a.ok ? a.mensaje : a.mensaje} / ${b.ok ? b.mensaje : b.mensaje})`);
    ok(h.status === 'resolved' && h.dev === 1200 && (await pago(k.p)).dev === 1200, `el caso cerrado con lo que de verdad salió, sumado una vez (${h.dev})`);
    ok(Number((await q1(`select count(*)::int as n from audit_entries where action = 'transacciones.devolver' and target_id = $1`, [k.op])).n) === 1, 'el dinero que sale, auditado una vez');
  }
  {
    const k = await caso();
    // El proceso muere justo después de anotar la intención (paso 1): el caso sigue abierto, la devolución pendiente.
    await D.tx((cx) => cobros.anotarDevolucionPago(cx, { paymentId: k.p, centavos: 900, por: 'admin', actorId: staffU, motivo: 'x', idem: `sop-q${k.qi}` }));
    await atrasar((await dev(`sop-q${k.qi}`)).id, 3);
    await cobros.barrerDevolucionesPago();
    ok((await dev(`sop-q${k.qi}`)).status === 'done' && P.vecesSalio(`sop-q${k.qi}`) === 1, 'el barrido termina el dinero del caso con su llave');
    const otro = await AC.decidirSop(k.qi, 'Te devolvemos.', '20.00', crypto.randomUUID());
    ok(!otro.ok && /ya hay una devolución de \$9\.00 hecha/.test(otro.mensaje), `decidir con otro monto se rechaza y dice cuál salió («${otro.ok ? '' : otro.mensaje}»)`);
    const r = await AC.decidirSop(k.qi, 'Te devolvemos lo de la cita.', '', null);
    const h = await q1(`select status, refunded_cents::int as dev from help_requests where id = $1::bigint`, [k.h]);
    ok(r.ok && h.status === 'resolved' && h.dev === 900 && P.vecesSalio(`sop-q${k.qi}`) === 1 && (await pago(k.p)).dev === 900, `decidirlo otra vez usa ESA devolución: el caso suma $9 y nada sale otra vez (${r.ok ? r.mensaje : r.mensaje})`);
  }

  console.log('3 · Planes › Anular con cobro fallido');
  const verif = { estado: 'requires_action' };
  const PS = { ...P, intento: async () => verif, liberar: async () => ({ ok: true }) };
  const SU = cargar('apps/web/lib/suscripcion.ts', { './db': D, './pagos/pasarela': { pasarela: PS, registrarAccion: async () => undefined }, './plan': { PRECIO_PRO: 30 }, './avisos': avisos, './correo/recibos': { reciboPro: async () => undefined } });
  async function plan() {
    const b = (await q1(`insert into businesses (id, city_id, category_id, name) values ($1, 'hzl', 'NEG-FOOD', 'Plan 9t') returning id`, [`p9t-${crypto.randomBytes(4).toString('hex')}`])).id;
    await db.query(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, failed_attempts, next_attempt_at, current_period_end) values ($1, 'past_due', 'month', $2, 'pm_fake_9t', 1, now() + interval '2 days', now() - interval '1 day')`, [b, X.u]);
    await db.query(`insert into business_stats_cache (business_id, plan) values ($1, 'pro')`, [b]);
    return b;
  }
  const audPlan = (b) => async (c) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id) values ('staff', $1, 'plan.anular', 'business', $2)`, [staffU, b]);
  const nAud = async (b) => Number((await q1(`select count(*)::int as n from audit_entries where action = 'plan.anular' and target_id = $1`, [b])).n);
  {
    const b = await plan();
    const r = await SU.anularSuscripcion(b, staffU, 'prueba', audPlan(b));
    const s = await q1(`select s.status, c.plan, (select count(*)::int from subscription_events e where e.business_id = s.business_id and e.kind in ('canceled_admin', 'ended')) as ev from subscriptions s join business_stats_cache c on c.business_id = s.business_id where s.business_id = $1`, [b]);
    ok(r.ok && s.status === 'ended' && s.plan === 'free' && s.ev === 2 && await nAud(b) === 1, `sin verificación pendiente: Free, «canceled_admin» + «ended» y la auditoría juntos (${s.status}, ${s.plan}, ${s.ev})`);
  }
  {
    const b = await plan(), pi = `pi_fake_ver_${crypto.randomBytes(3).toString('hex')}`;
    await db.query(`insert into payment_actions (pi, base_idem, idem, user_id, business_id, city_id, kind, amount_cents, pm, status, expires_at) values ($1, $2, $2, $3, $4, 'hzl', 'renovacion', 3000, 'pm_fake_9t', 'verificada', now() + interval '1 day')`, [pi, `sub-${b}-9t`, X.u, b]);
    verif.estado = 'succeeded';
    const r = await SU.anularSuscripcion(b, staffU, 'prueba', audPlan(b));
    verif.estado = 'requires_action';
    const s = await q1(`select status, (select count(*)::int from subscription_events e where e.business_id = $1 and e.kind = 'canceled_admin') as ev from subscriptions where business_id = $1`, [b]);
    ok(!r.ok && /ya había cobrado/.test(r.msg.es) && s.status === 'active' && s.ev === 0 && await nAud(b) === 0, `la verificación del banco ya pasó: el período quedó pagado, no se anula y la acción lo dice (sin «anuló» en la auditoría) (${s.status})`);
  }
  {
    const b = await plan(), k = await db.connect();
    await k.query(`select pg_advisory_lock(hashtext('sub:' || $1))`, [b]);
    const r = await SU.anularSuscripcion(b, staffU, 'prueba', audPlan(b));
    await k.query(`select pg_advisory_unlock(hashtext('sub:' || $1))`, [b]); k.release();
    ok(!r.ok && /se está procesando/.test(r.msg.es) && (await q1(`select status from subscriptions where business_id = $1`, [b])).status === 'past_due' && await nAud(b) === 0, 'con el candado del plan tomado (el barrido cobrando): se dice y nada cambia');
    const libre = await db.connect();
    const t = (await libre.query(`select pg_try_advisory_lock(hashtext('sub:' || $1)) as ok`, [b])).rows[0].ok;
    if (t) await libre.query(`select pg_advisory_unlock(hashtext('sub:' || $1))`, [b]);
    libre.release();
    ok(t, 'el candado del plan queda suelto después (que se suelte en la MISMA conexión lo vigila el guardián candadoEnSuConexion)');
  }

  console.log('4 · Disputas');
  const PD = { ...P, disputaAceptar: async () => true, disputaResponder: async () => true, subirEvidencia: async () => ({ ok: true, id: `file_fake_${crypto.randomBytes(3).toString('hex')}` }) };
  const DI = cargar('apps/web/lib/disputas.ts', { './db': D, './pagos/pasarela': { pasarela: PD }, './avisos': avisos, './pdf-simple': cargar('apps/web/lib/pdf-simple.ts'), './medios': { mediosListos: () => false } });
  async function disputa() {
    const c = await cobro(X);
    return { ...c, d: (await q1(`insert into disputes (stripe_dispute_id, payment_id, operation_id, business_id, city_id, amount_cents, reason, status) values ($1, $2::bigint, $3::bigint, $4, 'hzl', 5000, 'general', 'needs_response') returning id::text`, [`dp_fake_${c.num}`, c.p, c.op, X.b])).id };
  }
  const audD = async (c, x) => c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, after) values ('staff', $1, 'disputa.prueba9t', 'dispute', $2, $3::jsonb)`, [staffU, x.d, JSON.stringify(x)]);
  {
    const k = await disputa();
    PD.disputaAceptar = async () => { await db.query(`update disputes set status = 'won' where id = $1::bigint`, [k.d]); return true; };
    const r = await DI.aceptarDisputa(k.d, (c, x) => audD(c, { ...x, d: k.d }));
    const st = (await q1(`select status from disputes where id = $1::bigint`, [k.d])).status;
    ok(!r.ok && r.cambio === 'won' && st === 'won' && /cambió mientras tanto \(ahora: ganada\)/.test(r.msg), `aceptar: el webhook la ganó entre la lectura y la escritura; no se pisa y se dice («${r.ok ? '' : r.msg}»)`);
    ok((await q1(`select after->>'cambio' as c from audit_entries where action = 'disputa.prueba9t' and target_id = $1`, [k.d]))?.c === 'won', 'la auditoría dice lo que se mandó a Stripe y el estado que encontró');
  }
  {
    const k = await disputa();
    PD.disputaAceptar = async () => { await db.query(`update disputes set status = 'lost', closed_at = now() where id = $1::bigint`, [k.d]); return true; };
    const r = await DI.aceptarDisputa(k.d, (c, x) => audD(c, { ...x, d: k.d }));
    ok(r.ok && (await q1(`select status from disputes where id = $1::bigint`, [k.d])).status === 'lost', 'aceptar: el webhook de la propia aceptación (perdida) llegó antes: vale, sin pisarlo');
  }
  {
    const k = await disputa();
    PD.disputaResponder = async () => { await db.query(`update disputes set status = 'under_review' where id = $1::bigint`, [k.d]); return true; };
    const r = await DI.responderDisputa(k.d, staffU, 'Entregado a tiempo, con foto.', (c, x) => audD(c, { ...x, d: k.d }));
    const d = await q1(`select status, response_text from disputes where id = $1::bigint`, [k.d]);
    ok(r.ok && d.status === 'under_review' && d.response_text === 'Entregado a tiempo, con foto.', 'responder: Stripe la pasó a «en revisión» por ESTA respuesta antes de anotarla: queda anotada, sin tocar el estado');
  }
  {
    const k = await disputa();
    PD.disputaResponder = async () => { await db.query(`update disputes set status = 'lost', closed_at = now() where id = $1::bigint`, [k.d]); return true; };
    const r = await DI.responderDisputa(k.d, staffU, 'Entregado a tiempo, con foto.', (c, x) => audD(c, { ...x, d: k.d }));
    const d = await q1(`select status, response_text from disputes where id = $1::bigint`, [k.d]);
    ok(!r.ok && d.status === 'lost' && d.response_text === null && /ahora: perdida/.test(r.msg), `responder: el banco la cerró entre la lectura y la escritura; nada se pisa y se dice («${r.ok ? '' : r.msg}»)`);
  }

  await db.end();
  console.log(`\n${checks - fallas}/${checks} · ${fallas ? 'FALLA' : 'bien'}`);
  process.exit(fallas ? 1 : 0);
})().catch(async (e) => { console.error('✗', e); try { await D.db().end(); } catch { /* */ } process.exit(1); });
