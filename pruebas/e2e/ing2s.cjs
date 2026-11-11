const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
(async () => {
  const esperado = Number(sql(`select coalesce(sum(fee_cents::bigint * (amount_cents - refunded_cents) / nullif(amount_cents, 0)), 0)::int from payments where status in ('captured', 'partially_refunded') and captured_at >= (date_trunc('week', now() at time zone 'America/New_York') - interval '7 weeks') at time zone 'America/New_York'`));
  const b = await chromium.launch(); const err = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const a = await ctx.newPage(); globalThis.__p = [a];
  a.on('pageerror', e => err.push(e.message)); a.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  await entrar(a, '5705550199'); await a.goto(B + '/admin/planes?tab=ing'); await a.getByText('COMISIONES · 8 SEMANAS').first().waitFor();
  const v = await a.getByText('COMISIONES · 8 SEMANAS').first().locator('xpath=../..').innerText();
  ok(v.includes(`$${(esperado / 100).toFixed(2)}`), `total de comisiones = libro ($${(esperado / 100).toFixed(2)})`);
  ok(await a.getByText('COBROS DE PRO · 8 SEMANAS').first().isVisible(), 'Pro de 8 semanas');
  ok(await a.getByText(/COMISIÓN POR CATEGORÍA|Sin comisiones en 90 días/).first().isVisible(), 'por categoría');
  await a.screenshot({ path: OUT + 's1-ingresos-d.png', fullPage: true });
  const [dl] = await Promise.all([a.waitForEvent('download'), a.getByRole('button', { name: 'Exportar CSV' }).click()]);
  const txt = require('fs').readFileSync(await dl.path(), 'utf8'); ok(dl.suggestedFilename().startsWith('tolatino-ingresos-') && txt.includes('Total 8 semanas'), 'CSV descargado');
  ok(sql(`select count(*) from audit_entries where action = 'plan.ingresos_exportar' and at > now() - interval '1 minute'`) !== '0', 'exportar queda en la auditoría');
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })).newPage(); globalThis.__p.push(m);
  await entrar(m, '5705550199'); await m.goto(B + '/admin/planes?tab=ing'); await m.getByText('COMISIONES · 8 SEMANAS').first().waitFor();
  const w = await m.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'móvil sin scroll horizontal (' + w + ')'); await m.screenshot({ path: OUT + 's2-ingresos-m.png', fullPage: true });
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) await p.screenshot({ path: OUT + 'fail-ing.png' }); } catch {} process.exit(1); });
