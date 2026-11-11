const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 20; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const limpiar = () => { sql(`update post_comments set status = 'visible' where status = 'hidden'`); sql(`update job_postings set hidden_at = null, hidden_reason = null, hidden_by = null where business_id = '${BIZ}' and title->>'es' = 'Chofer de delivery'`); };
(async () => { limpiar(); const b = await chromium.launch(); const err = [];
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage(); a.on('pageerror', e => err.push(e.message)); globalThis.__p = [a];
  await entrar(a, '5705550199');
  // Contenido
  await a.goto(B + '/admin'); await clic(a.getByText('Contenido', { exact: true })); await a.waitForURL(/\/admin\/contenido/);
  await a.getByText('REPORTES ABIERTOS').first().waitFor(); ok(true, 'Contenido en el menú y abre');
  await a.screenshot({ path: OUT + 'a1-cont.png', fullPage: true });
  for (const t of ['rev', 'nov', 'cm', 'vac']) { await a.goto(B + '/admin/contenido?tab=' + t); await a.getByText('REPORTES ABIERTOS').first().waitFor(); } ok(true, 'cada pestaña abre (reseñas, novedades, comentarios, vacantes)');
  await clic(a.getByText('Vacantes', { exact: true })); await a.waitForURL(/tab=vac/);
  const fila = a.locator('div', { has: a.getByText(/^Chofer de delivery/) }).filter({ has: a.getByText('Ocultar', { exact: true }) }).last();
  await fila.getByText('Ocultar', { exact: true }).click(); await clic(a.getByText('Vacante falsa o engañosa')); await clic(a.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select hidden_reason from job_postings where business_id='${BIZ}' and title->>'es'='Chofer de delivery'`), 'Vacante falsa o engañosa') === 'Vacante falsa o engañosa', 'Contenido: ocultar una vacante con motivo');
  await a.getByText('OCULTO', { exact: true }).first().waitFor(); ok(true, 'la fila sale OCULTO');
  // Comentarios
  const cm = sql(`select id from post_comments where status = 'visible' order by id limit 1`);
  if (cm) { await a.goto(B + '/admin/contenido?tab=cm'); const fc = a.locator('div', { has: a.getByText('Comentario ·', { exact: false }) }).filter({ has: a.getByText('Ocultar', { exact: true }) }).first();
    await fc.getByText('Ocultar', { exact: true }).first().click(); await clic(a.getByText('Spam o publicidad')); await clic(a.getByText('Confirmar', { exact: true }));
    ok(await espera(() => sql(`select count(*) from post_comments where status = 'hidden'`), '1') === '1', 'Contenido: ocultar un comentario');
    ok(sql(`select count(*) from audit_entries where action = 'comentario.ocultar' and at > now() - interval '1 minute'`) !== '0', 'queda en la auditoría'); }
  await a.goto(B + '/admin/contenido?q=Mofongo'); await a.getByText(/Mofongo/).first().waitFor(); ok(true, 'Contenido: búsqueda');
  // Transacciones
  await clic(a.getByText('Transacciones', { exact: true })); await a.waitForURL(/\/admin\/transacciones/); await a.getByText('HOY', { exact: true }).first().waitFor();
  const tot = Number(sql(`select count(*) from operations where kind in ('order', 'table', 'appointment', 'plan', 'rental', 'hold', 'market_order', 'party', 'trip', 'night', 'enrollment', 'visit') and sent_at > now() - interval '90 days'`));
  ok(!!(await vis(a.getByText(`${tot} EN 90 DÍAS`))), `Transacciones: ${tot} en 90 días`);
  await a.screenshot({ path: OUT + 'a2-tx.png', fullPage: true });
  await clic(a.getByText('Terminado', { exact: true })); await a.waitForURL(/st=done/); ok(!(await vis(a.getByText('CANCELADO', { exact: true }))), 'filtro Terminado');
  const [dl] = await Promise.all([a.waitForEvent('download'), clic(a.getByText('Exportar', { exact: true }))]);
  const txt = require('fs').readFileSync(await dl.path(), 'utf8'); ok(/^﻿?#,Fecha,Tipo,Negocio/.test(txt) && txt.includes('Terminado') && !txt.includes('Cancelado'), 'Exportar CSV de lo filtrado');
  ok(sql(`select count(*) from audit_entries where action = 'transacciones.exportar' and at > now() - interval '1 minute'`) !== '0', 'la exportación queda en la auditoría');
  const num = sql(`select number from operations where kind='order' order by id desc limit 1`);
  await a.goto(B + '/admin/transacciones?q=' + num); await a.getByText(`Pedido #${num}`, { exact: false }).first().waitFor(); ok(true, 'buscar por número');
  // Teléfono
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); m.on('pageerror', e => err.push(e.message)); globalThis.__p.push(m);
  await entrar(m, '5705550199'); await m.goto(B + '/admin/transacciones'); await m.getByText('HOY', { exact: true }).first().waitFor(); await m.screenshot({ path: OUT + 'a3-tx-tel.png' });
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
