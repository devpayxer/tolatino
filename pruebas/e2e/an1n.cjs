const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); }; // 9b-1 · antes solo imprimía: la corrida la contaba «en verde con 0 ✓»
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); return api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const t = (p, x) => p.getByText(x, { exact: true }).last();
const shot = async (p, n, full = true) => { await p.waitForTimeout(500); await p.screenshot({ path: OUT + n, fullPage: full }); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const n0 = Number(sql('select count(*) from app_events'));
  // Vecino nuevo (sin cuenta): categoría → ficha → buscar → entrar (se registra)
  const cv = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
  const v = await cv.newPage(); watch(v, 'vecino');
  await v.goto(B + '/c/comida'); await v.waitForLoadState('networkidle'); await v.goto(B + '/n/sabor-dominicano'); await v.waitForLoadState('networkidle');
  await v.goto(B + '/buscar?q=pupusas'); await v.waitForLoadState('networkidle');
  const dev = (await cv.cookies()).find((c) => c.name === 'tl_dev')?.value; ok(!!dev, 'cookie del dispositivo (tl_dev)');
  const r = await entrar(v, require('../lib/telefono-libre.cjs').telefonoLibre('5705556')); ok(r.nuevo === true, 'entra con un número nuevo (cuenta nueva) · respuesta ' + JSON.stringify({ nuevo: r.nuevo, error: r.error, ok: r.ok, claves: Object.keys(r || {}) }));
  await v.waitForTimeout(800);
  const evs = sql(`select string_agg(name, ', ' order by id) from app_events where device = '${dev}'`); ok(/buscar/.test(evs), `eventos del dispositivo (${evs})`);
  ok(+sql(`select count(*) from device_days where device = '${dev}'`) >= 1, 'día activo del dispositivo');
  const props = sql(`select props::text from app_events where device = '${dev}' and name = 'buscar' limit 1`); ok(!/\d{7,}|telefono|phone|nombre/i.test(props), `evento sin datos personales (${props})`);
  // Un robot no cuenta
  const cr = await b.newContext({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }); const rb = await cr.newPage();
  const antes = Number(sql('select count(*) from app_events')); await rb.goto(B + '/c/comida'); await rb.waitForTimeout(800);
  ok(Number(sql('select count(*) from app_events')) - antes === 0, 'un robot no cuenta (0 eventos)');
  // Admin: las pestañas
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage(); watch(a, 'admin'); await entrar(a, '5705550199');
  await a.goto(B + '/admin/analitica'); await a.getByText('EMBUDO · DE BUSCAR A CONTACTAR', { exact: true }).waitFor(); await shot(a, 'n1-resumen-d.png');
  await t(a, 'Gente y negocios').click(); await a.getByText('VECINOS', { exact: true }).waitFor(); await shot(a, 'n2-gente-d.png');
  await t(a, 'Soporte y confianza').click(); await a.getByText('SLA CUMPLIDO', { exact: true }).waitFor(); await shot(a, 'n3-confianza-d.png');
  await t(a, 'Búsquedas sin oferta').click(); await a.waitForTimeout(800); await shot(a, 'n4-sinoferta-d.png');
  await t(a, 'Exportar').click(); await a.getByText('Negocios', { exact: true }).first().waitFor();
  const dl = a.waitForEvent('download'); await a.getByText('Descargar CSV', { exact: true }).first().click(); const d = await dl;
  const txt = require('fs').readFileSync(await d.path(), 'utf8'); ok(/\.csv$/.test(d.suggestedFilename()) && txt.split('\r\n').length > 1, `CSV ${d.suggestedFilename()} · ${txt.split('\r\n').length - 1} filas`);
  ok(+sql("select count(*) from audit_entries where action = 'analitica.exportar' and at > now() - interval '10 minutes'") >= 1, 'la exportación queda en la auditoría');
  await shot(a, 'n5-exportar-d.png');
  const m = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true })).newPage(); watch(m, 'admin-m'); await entrar(m, '5705550199');
  await m.goto(B + '/admin/analitica?tab=ppl'); await m.getByText('VECINOS', { exact: true }).waitFor(); await shot(m, 'n6-gente-m.png', false);
  ok(Number(sql('select count(*) from app_events')) - n0 > 0, 'hubo eventos nuevos');
  ok(!err.length, `sin errores en las páginas (${err.join(' | ').slice(0, 300) || 'ninguno'})`); await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
