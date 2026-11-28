// 9t (28 nov, LAUNCH «Cuando el cliente no contesta a “otra salida / otra hora”, nadie se entera») · Lo común de las pruebas altfin-*: la base de pruebas, una
// pasarela de mentira, los avisos anotados (en vez de mandarse) y los módulos REALES de dinero (cobros, devolucion-cancelar) para que el barrido de cada
// vertical suelte la retención de verdad. Cada prueba arma SU negocio, SU cliente y SUS reservas, y barre filtrado por su negocio y su número.
require('./entorno.cjs');
const { cargar, cargarApp } = require('./ts-servidor.cjs');
const crypto = require('crypto');
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }
const { esFijo } = require('./telefonos-fijos.cjs');

const hex = () => crypto.randomBytes(6).toString('hex');
const D = cargar('apps/web/lib/db.ts');
const db = D.db();
const q1 = async (s, v = []) => (await db.query(s, v)).rows[0];
const n1 = async (s, v = []) => Number((await q1(s, v)).n);
const avisados = []; // ['u' | 'b', a quién, plantilla, valores]
const avisos = { avisar: async (u, t, v) => { avisados.push(['u', u, t, v]); return true; }, avisarMuchos: async () => undefined, avisarNegocio: async (b, t, v) => { avisados.push(['b', b, t, v]); return true; } };
const P = {
  modo: () => 'simulador', liberadas: [],
  async liberar(pi) { this.liberadas.push(pi); return { ok: true }; },
  async cobrarFuera() { return { ok: false }; }, async cobrarDirecto() { return { ok: false }; },
  cobrar: async (pi, n) => ({ ok: true, cobrado: n }), cliente: async () => null, buscarCobro: async () => ({ ok: false }),
};
const alertas = cargar('apps/web/lib/dinero-alertas.ts', { './db': D, './avisos': avisos, './admin': { auditar: async () => undefined } });
const cobros = cargar('apps/web/lib/cobros.ts', { './db': D, './pagos/pasarela': { pasarela: P }, './vista-equipo': { soloLectura: () => false }, './avisos': avisos, './dinero-alertas': alertas,
  './soporte-equipo': {}, './soporte': { avisarCaso: async () => undefined }, './consulta-pasarela': {}, './devolucion-cancelar-consulta': {}, './devolucion-consulta': {} });
const DC = cargar('apps/web/lib/devolucion-cancelar.ts');
// Lo que todo módulo de reservas importa y la prueba no necesita de verdad.
const base = { './db': D, './cobros': cobros, './devolucion-cancelar': DC, './pagos/pasarela': { pasarela: P }, './pagos/verificacion': {}, './avisos': avisos,
  './config': { valor: async () => '60', cfgSql: () => '48' }, './citas': {}, './modulo-pausa': {}, './vista-equipo': { soloLectura: () => false }, './cifrado': {}, './ninos-privado': {} };
const modulo = (rel, extra = {}) => cargarApp(rel, { ...base, ...extra });

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };
const RUN = hex().slice(0, 8);
let NUM = Number(String(Date.now()).slice(-7));
const num = (pre) => `${pre}-9${String(++NUM).padStart(8, '0')}`;
const telNuevo = async () => { for (let i = 0; i < 400; i++) { const t = '570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); if (!esFijo(t) && !(await q1(`select 1 as x from users where phone = $1`, ['+1' + t]))) return '+1' + t; } throw new Error('no queda un teléfono 570-555 libre'); };
const usuario = async (apellido) => (await q1(`insert into users (phone, first_name, last_name) values ($1, 'Prueba', $2) returning id::text`, [await telNuevo(), apellido])).id;
const negocio = async (pre, cat, nombre) => (await q1(`insert into businesses (id, city_id, category_id, name, status) values ($1, 'hzl', $2, $3, 'active') returning id`, [`${pre}-${RUN}`, cat, `${nombre} ${RUN}`])).id;
/* Una retención (la del depósito o la matrícula) de la reserva, como la deja el cliente al pedir. */
const retencion = async (op, u, B, cents, kind = 'deposit') => {
  const pi = `pi_fake_altfin_${RUN}_${op}`;
  await db.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at)
                  values ($1::bigint, $2, $3, 'hzl', $4, 'card', $5, $6, $6, 0, 'held', 'visa', '4242', now())`, [op, u, B, kind, pi, cents]);
  return pi;
};
/* La propuesta «otra …» del negocio, vencida (o todavía a tiempo). */
const propuesta = async (op, u, vence, proposed = {}) => (await q1(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by) values ($1::bigint, 'time', $2::jsonb, $3, 'business', $4::timestamptz) returning id::text`,
  [op, JSON.stringify(proposed), u, vence])).id;
const hoy = async () => (await q1(`select (now() at time zone 'America/New_York')::date::text as h`)).h;

/* Lo común de cada comprobación: la reserva vencida y otra a tiempo; el aviso a cada parte, una vez, aunque el barrido corra dos veces. */
async function comprobarAvisos({ X, Y, B, u, tpl, tplNeg, barrer, money = null, soloVencida = true }) {
  const n0 = avisados.length;
  await barrer(X.num);
  const o = await q1(`select status as st, cancelled_by as por, cancel_reason as cxr from operations where id = $1::bigint`, [X.op]);
  ok(o.st === 'cancelled' && o.por === 'system' && o.cxr === 'alt_vencida', `la reserva se cancela por el sistema (alt_vencida) (${o.st}, ${o.por}, ${o.cxr})`);
  const aviso = (t) => avisados.slice(n0).filter((a) => a[2] === t);
  const c = aviso(tpl), n = aviso(tplNeg);
  ok(c.length === 1 && c[0][0] === 'u' && c[0][1] === u, `un aviso «${tpl}» al cliente (${c.length})`);
  ok(n.length === 1 && n[0][0] === 'b' && n[0][1] === B, `un aviso «${tplNeg}» al negocio (${n.length})`);
  ok(c[0] && c[0][3].negocio, 'el aviso al cliente lleva el nombre del negocio');
  if (money) money(c[0] && c[0][3], n[0] && n[0][3]);
  await barrer(X.num);
  await barrer(X.num);
  ok(aviso(tpl).length === 1 && aviso(tplNeg).length === 1, 'otras dos pasadas: ni un aviso más a ninguna de las dos partes');
  ok(avisados.slice(n0).every((a) => a[1] === u || a[1] === B), 'ningún aviso a nadie más');
  if (Y) {
    await barrer(Y.num);
    const y = await q1(`select status as st from operations where id = $1::bigint`, [Y.op]);
    ok(y.st === 'change_proposed' && avisados.slice(n0).filter((a) => a[3] && a[3].num === Y.num).length === 0 && aviso(tpl).length === 1, 'la que todavía está a tiempo no se toca ni avisa');
  }
}
async function cerrar(nombre) {
  await db.end().catch(() => undefined);
  console.log(`\n${fallas ? '✗' : '✓'} ${nombre}: ${checks - fallas}/${checks}`);
  process.exit(fallas ? 1 : 0);
}
const fallo = (e) => { fallas++; console.log('  ✗ excepción:', (e && e.stack) || e); };
module.exports = { D, db, q1, n1, avisados, avisos, P, cobros, DC, modulo, ok, hex, RUN, num, usuario, negocio, retencion, propuesta, hoy, comprobarAvisos, cerrar, fallo, get fallas() { return fallas; } };
