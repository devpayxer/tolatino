// 9n-9 · Super Admin › Usuarios: las cifras de cada persona, de punta a punta con las pantallas de verdad (1360 y 390):
//  1 · La lista: QUIÉN › «Promotores», ORDENAR › «Más compras» / «Más reportes» / «Rango» y las columnas RANGO y ACTIVIDAD (pedidos · citas;
//      reseñas · posts · reportes), con las cifras derivadas (user_stats_cache) que la base recalcula sola con cada reporte.
//  2 · El 360°: PEDIDOS · CITAS · RANGO arriba y la pestaña Dinero (cobrado, retenido, devuelto, tarjetas con sus últimos 4, últimos cobros).
//  3 · Quien no ve transacciones (Moderador) no ve la pestaña Dinero ni con ?tab=din.
// Precondiciones propias: el Admin, la Moderadora, la vecina y quien reporta son teléfonos 555 libres de esta corrida. Al final quita al equipo,
// la marca de promotora y la tarjeta de prueba.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { telefonoLibre } = require('../lib/telefono-libre.cjs');
const OUT = ENT.OUT, B = ENT.B;
const sql = (q) => execSync(`docker exec -i ${ENT.DB} psql -U tolatino -d tolatino -At -v ON_ERROR_STOP=1`, { input: q, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) }); return { st: r.status, ...(await r.json().catch(() => ({}))) }; }, [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(300); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (t instanceof RegExp ? t.test(await texto(p)) : (await texto(p)).includes(t)), ms);
const ID = crypto.randomBytes(3).toString('hex');
const M = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-US' }, D = { viewport: { width: 1360, height: 900 }, locale: 'es-US' };
const cuenta = (x, uno, varios) => `${x} ${x === 1 ? uno : varios}`;

(async () => {
  const ADM = telefonoLibre('5705556'), MOD = telefonoLibre('5705557'), VEC = telefonoLibre('5705559'), REP = telefonoLibre('5705558');
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values
        ('+1${ADM}', now(), 'Ana', 'Nueve${ID}', 'hzl', 'es', true), ('+1${MOD}', now(), 'Mara', 'Nueve${ID}', 'hzl', 'es', true),
        ('+1${VEC}', now(), 'Pilar', 'Promo${ID}', 'hzl', 'es', true), ('+1${REP}', now(), 'Rita', 'Nueve${ID}', 'hzl', 'es', true) on conflict (phone) do nothing;`);
  const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
  const AU = uid(ADM), MU = uid(MOD), VU = uid(VEC), RU = uid(REP);
  const PM = `pm_sim_visa_4242_${crypto.randomBytes(4).toString('hex')}`;
  const limpiar = () => sql(`update staff_members set status = 'removed' where user_id in ('${AU}', '${MU}');
       update sessions set signed_out_at = now() where user_id in ('${AU}', '${MU}') and signed_out_at is null;
       update users set is_promoter = false where id = '${VU}';
       update payment_methods set status = 'removed' where user_id = '${VU}';`);
  sql(`insert into staff_members (user_id, role, cities, status, added_by) values ('${AU}', 'admin', '{}', 'active', '${AU}'), ('${MU}', 'moderador', '{}', 'active', '${AU}')
       on conflict (user_id) do update set role = excluded.role, cities = excluded.cities, status = 'active';
       insert into staff_mfa_pruebas (phone, note) values ('+1${ADM}', 'usr9n9 · Admin'), ('+1${MOD}', 'usr9n9 · Moderadora') on conflict do nothing;
       update users set is_promoter = true where id = '${VU}';
       insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated) values ('${VU}', '${PM}', 'visa', '4242', '12/30', true, true);`);
  const br = await chromium.launch(), err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 40[34]|Failed to load resource/.test(m.text())) err.push('console: ' + m.text()); }); };
  const nueva = async (cfg, tel) => { const c = await br.newContext(cfg), p = await c.newPage(); mira(p); if (tel) await entrar(p, tel); return p; };
  try {
    // ── 1 · La lista ──
    console.log('1 · Lista: Promotores, cifras derivadas y ordenar');
    ok(sql(`select coalesce((select reportes from user_stats_cache where user_id = '${VU}'), 0)`) === '0', 'sin reportes todavía');
    sql(`insert into content_reports (target_kind, target_id, reporter_user_id, reason, note) values ('user', '${VU}', '${RU}', 'acoso', 'prueba usr9n9 ${ID}')`);
    ok(sql(`select reportes from user_stats_cache where user_id = '${VU}'`) === '1', 'la base recalcula la cifra sola con el reporte (trigger, derivado)');
    const a = await nueva(D, ADM);
    await a.goto(B + '/admin/usuarios?quien=promo');
    ok(await contiene(a, `Pilar Promo${ID}`), '«Promotores» la lista');
    ok(await contiene(a, 'RANGO') && await contiene(a, 'ACTIVIDAD'), 'las columnas RANGO y ACTIVIDAD');
    await a.goto(B + '/admin/usuarios?quien=promo&mas=rep&orden=rep');
    ok(await contiene(a, `Pilar Promo${ID}`) && await contiene(a, '1 reporte'), '«Con reportes» + «Más reportes»: sale con «1 reporte» en ACTIVIDAD');
    const [mp, mc] = sql(`select k.pedidos || '|' || k.citas from user_stats_cache k join users u on u.id = k.user_id order by k.pedidos + k.citas desc limit 1`).split('|').map(Number);
    await a.goto(B + '/admin/usuarios?orden=ped');
    ok(await contiene(a, `${cuenta(mp, 'pedido', 'pedidos')} · ${cuenta(mc, 'cita', 'citas')}`), `«Más compras»: arriba quien más compró (${mp} pedidos · ${mc} citas)`);
    await a.screenshot({ path: `${OUT}/u9-lista-d.png` });
    await a.goto(B + '/admin/usuarios?orden=rk');
    ok(await contiene(a, 'Rango'), '«Rango» ordena (la pantalla carga)');

    // ── 2 · El 360° ──
    console.log('2 · 360°: cifras arriba y Dinero');
    await a.goto(B + `/admin/usuarios/${VU}`);
    ok(await contiene(a, 'PEDIDOS') && await contiene(a, 'CITAS') && await contiene(a, 'RANGO ·'), 'arriba: PEDIDOS · CITAS · RANGO');
    await a.goto(B + `/admin/usuarios/${VU}?tab=din`);
    ok(await contiene(a, 'COBRADO · 90 D') && await contiene(a, 'RETENIDO AHORA') && await contiene(a, 'DEVUELTO · 90 D'), 'Dinero: cobrado, retenido y devuelto');
    ok(await contiene(a, 'visa •••• 4242') && await contiene(a, 'predeterminada'), 'su tarjeta con los últimos 4');
    ok(await contiene(a, 'Sin cobros con tarjeta.'), 'sin cobros: lo dice');
    const t = await nueva(M, ADM);
    await t.goto(B + `/admin/usuarios/${VU}?tab=din`);
    ok(await contiene(t, 'MÉTODOS DE PAGO'), 'en el teléfono también');
    await t.screenshot({ path: `${OUT}/u9-dinero-m.png` });

    // ── 3 · Sin permiso de transacciones ──
    console.log('3 · Moderadora: sin Dinero');
    const m = await nueva(D, MOD);
    await m.goto(B + `/admin/usuarios/${VU}?tab=din`);
    ok(await contiene(m, `Pilar Promo${ID}`) && !(await contiene(m, 'COBRADO · 90 D', 1500)) && !(await contiene(m, 'MÉTODOS DE PAGO', 500)), 'la Moderadora no ve Dinero ni con ?tab=din');

    ok(!err.length, 'sin errores en la consola: ' + err.slice(0, 3).join(' | '));
    console.log(`\nusr9n9: ${n} comprobaciones`);
  } finally {
    limpiar();
    await br.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
