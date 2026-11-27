// 9b (27 nov, LAUNCH «Consultas que ninguna prueba ejecuta») · lib/suscripcion.ts: la consulta que ninguna prueba ejecutaba (la medida de
// pruebas/lib/consultas-medir.cjs sobre el servidor y las pruebas de Node), contra la base de pruebas y con una pasarela de mentira (sin servidor), con el
// archivo REAL transpilado por pruebas/lib/ts-servidor.cjs (la armazón de din9t3):
//   «select 1 from subscription_charges where id = $1::bigint and status = 'done'» — la intención de cobro de Pro que OTRO proceso cerró entre anotarla y
//   mandarla a la pasarela (el barrido, la verificación del banco que se completó): el `update … where status = 'pending'` no la encuentra y se mira cómo
//   quedó. El mismo texto vive en terminarCobro y en las dos ramas de terminarViejo (misma consulta, mismo sitio en la base).
//   1. «Volver a Pro» (desde Free) y la intención la cierra otro como FALLIDA en ese momento: «Tu banco ya rechazó este cobro», nada va a la pasarela,
//      la intención queda como la dejó el otro y la suscripción no pasa a Pro.
//   2. Lo mismo, pero el otro la cierra HECHA (con su cobro): ok, y tampoco va a la pasarela (no se cobra dos veces).
// Precondiciones propias (corre dos veces seguidas): su negocio, su dueño y su tarjeta; no toca nada de la semilla.
// Uso: DATABASE_URL=… node pruebas/e2e/sqldin9b-suscripcion.cjs   (por defecto lee la de $PRUEBAS_SECRETOS, como las demás pruebas)
require('../lib/entorno.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const crypto = require('crypto');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };

// ── Los módulos reales, con lo de afuera de mentira ──
const D = cargar('apps/web/lib/db.ts');
const avisos = { avisar: async () => undefined, avisarMuchos: async () => undefined, avisarNegocio: async () => undefined };
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos });
// La pasarela de mentira: aquí NADA debe llegar a cobrarDirecto; si llega, se cuenta (y cobra, como Stripe, para que el fallo se vea en la base).
const P = {
  modo: () => 'simulador', cobros: [],
  async cobrarDirecto(x) { this.cobros.push(x.idem); return { ok: true, id: `pi_fake_pro_${crypto.randomBytes(6).toString('hex')}` }; },
  cliente: async () => null, intento: async () => null, liberar: async () => ({ ok: true }), buscarCobro: async () => ({ ok: false }),
};
const K = cargar('apps/web/lib/consulta-pasarela.ts', { './db': D, './cobros': {}, './pagos/pasarela': { pasarela: P }, './dinero-alertas': alertas });
const SU = cargar('apps/web/lib/suscripcion.ts', { './db': D, './pagos/pasarela': { pasarela: P, registrarAccion: async () => undefined }, './plan': { PRECIO_PRO: 30 }, './avisos': avisos,
  './correo/recibos': { reciboPro: async () => undefined }, './dinero-alertas': alertas, './consulta-pasarela': K });

const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
const { esFijo } = require('../lib/telefonos-fijos.cjs');
const telNuevo = async () => { for (let i = 0; i < 400; i++) { const t = '570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); if (!esFijo(t) && !(await q1(`select 1 as x from users where phone = $1`, ['+1' + t]))) return '+1' + t; } throw new Error('no queda un teléfono 570-555 libre'); };
const RUN = crypto.randomBytes(4).toString('hex');

// Un negocio en Free (sin suscripción) con su dueño y una tarjeta guardada del modo simulador.
async function negocioFree(sufijo) {
  const u = (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', 'Sql9b') returning id::text`, [await telNuevo()])).id;
  const b = (await q1(`insert into businesses (id, city_id, category_id, name) values ($1, 'hzl', 'NEG-FOOD', $2) returning id`, [`s9b-${RUN}-${sufijo}`, `Prueba sql9b ${RUN}`])).id;
  const pm = `pm_fake_s9b_${RUN}_${sufijo}`;
  await db.query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated) values ($1, $2, 'visa', '4242', '12/30', true, true)`, [u, pm]);
  return { u, b, pm };
}

(async () => {
  try {
    // ── 1 · Otro la cierra fallida entre anotarla y mandarla ──
    console.log('1 · La intención de cobro que otro cierra FALLIDA antes de mandarla: no va a la pasarela');
    {
      const x = await negocioFree('f');
      let intencion = null;
      const r = await SU.seguirConPro(x.b, x.u, x.pm, 'month', async (c) => {
        // Dentro de la transacción que anota la intención (la auditoría del dueño): otro proceso la cierra.
        intencion = (await c.query(`update subscription_charges set status = 'failed', last_error = 'otro_proceso' where business_id = $1 and status = 'pending' returning id::text`, [x.b])).rows[0]?.id ?? null;
      });
      ok(!!intencion, 'la intención se anotó (y otro la cerró en ese momento)');
      ok(r.ok === false && r.msg?.es === 'Tu banco ya rechazó este cobro. Prueba con otra tarjeta.' && r.msg?.en === 'Your bank already declined this charge. Try another card.', '«Tu banco ya rechazó este cobro» (ES/EN), como quedó');
      ok(P.cobros.filter((k) => k.startsWith(`sub-${x.b}-`)).length === 0, 'nada fue a la pasarela');
      const f = await q1(`select status, last_error, sent_at is null as sin_mandar, stripe_pi from subscription_charges where id = $1::bigint`, [intencion]);
      ok(f.status === 'failed' && f.last_error === 'otro_proceso' && f.sin_mandar && f.stripe_pi === null, 'la intención queda como la dejó el otro (fallida, sin mandar, sin cobro)');
      ok((await q1(`select status from subscriptions where business_id = $1`, [x.b])).status === 'ended', 'la suscripción no pasa a Pro');
    }

    // ── 2 · Otro la cierra hecha ──
    console.log('2 · La intención de cobro que otro cierra HECHA antes de mandarla: ok y sin otro cobro');
    {
      const x = await negocioFree('h');
      let intencion = null;
      const r = await SU.seguirConPro(x.b, x.u, x.pm, 'month', async (c) => {
        intencion = (await c.query(`update subscription_charges set status = 'done', stripe_pi = $2 where business_id = $1 and status = 'pending' returning id::text`, [x.b, `pi_fake_otro_${RUN}`])).rows[0]?.id ?? null;
      });
      ok(!!intencion, 'la intención se anotó (y otro la cerró hecha en ese momento)');
      ok(r.ok === true, 'ok: el período ya está cobrado');
      ok(P.cobros.filter((k) => k.startsWith(`sub-${x.b}-`)).length === 0, 'nada fue a la pasarela (no se cobra dos veces)');
      const f = await q1(`select status, stripe_pi, sent_at is null as sin_mandar from subscription_charges where id = $1::bigint`, [intencion]);
      ok(f.status === 'done' && f.stripe_pi === `pi_fake_otro_${RUN}` && f.sin_mandar, 'la intención queda con el cobro del otro, sin mandarse de nuevo');
      ok(Number((await q1(`select count(*)::int as n from subscription_charges where business_id = $1`, [x.b])).n) === 1, 'una sola intención para ese negocio');
    }
  } catch (e) { fallas++; console.log('  ✗ excepción:', e && e.stack || e); }
  finally { await db.end().catch(() => undefined); }
  console.log(`\n${fallas ? '✗' : '✓'} sqldin9b-suscripcion: ${checks - fallas}/${checks}`);
  process.exit(fallas ? 1 : 0);
})();
