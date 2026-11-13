// 4k · Ficha de Profesionales: el TOTAL (honorario + gobierno), notas legales, hoja con EL TOTAL y ¿con quién? con su licencia;
// % solo si ganas; no legal (TecnoFix): sin textos de abogado, «Nada se cobra sin tu OK», listo en / garantía.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', L = 'bufete-almonte', F = 'ferreira-injury-law', T = 'tecnofix-hazleton';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const mk = async (vp) => { const p = await (await b.newContext({ viewport: vp })).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_|maplibre|tiles/i.test(x.text())) err.push('console ' + x.text()); }); return p; };
  const m = await mk({ width: 390, height: 844 }), d = await mk({ width: 1360, height: 900 });
  sql(`update items set svc_attrs = svc_attrs || '{"gov": 46500}'::jsonb where business_id = '${L}' and name->>'es' = 'Renovar la green card (I-90)'`);
  await m.goto(B + `/n/${L}?tab=svc`); await verV(m.getByText(/Nadie te garantiza un resultado/));
  ok(!!(await vis(m.getByText(/El precio dice el total/))), 'nota: «El precio dice el total…»');
  ok(!!(await vis(m.getByText('$815', { exact: true }))) && !!(await vis(m.getByText(/HONORARIO \$350 \+ GOBIERNO \$465/))), 'I-90: «$815 · HONORARIO $350 + GOBIERNO $465»');
  ok(!!(await vis(m.getByText(/SE DESCUENTA SI LO CONTRATAS/))), 'consulta $75: «SE DESCUENTA SI LO CONTRATAS»');
  await m.screenshot({ path: OUT + 'k1-pro-svc-m.png', fullPage: true });
  await clic(m.getByText('Renovar la green card (I-90)', { exact: true }));
  const h = m.getByRole('dialog', { name: 'Renovar la green card (I-90)' });
  await h.getByText('EL TOTAL', { exact: true }).waitFor();
  ok(!!(await vis(h.getByText('Tarifa del gobierno (se paga aparte, a la agencia)'))) && !!(await vis(h.getByText('$815').last())), 'hoja: EL TOTAL · honorario · gobierno aparte · total $815');
  await m.screenshot({ path: OUT + 'k2-pro-hoja-m.png' });
  await clic(h.getByRole('button', { name: 'Cerrar' }));
  // % solo si ganas (Ferreira)
  await m.goto(B + `/n/${F}?tab=svc`); await verV(m.getByText('33 %', { exact: true }));
  ok(!!(await vis(m.getByText(/SOLO SI GANAS · SI NO, \$0/))), 'accidente: «33 % · … · SOLO SI GANAS · SI NO, $0»');
  // No legal (TecnoFix)
  await d.goto(B + `/n/${T}?tab=svc`); await verV(d.getByText(/Lo revisan y te dicen el precio antes de arreglar/));
  ok(!(await vis(d.getByText(/Nadie te garantiza un resultado/))), 'no legal: sin «Nadie te garantiza»');
  ok(!!(await vis(d.getByText('LISTO EN', { exact: true }))), 'columna: LISTO EN · GARANTÍA · PRESUPUESTO');
  await d.screenshot({ path: OUT + 'k3-tecnofix-d.png', fullPage: true });
  await d.goto(B + `/n/${L}`); await verV(d.getByText('Cómo funciona'));
  ok(!!(await vis(d.getByText(/Te dan el total por escrito/))), 'Resumen legal: «Cómo funciona» con el total por escrito');
  await d.screenshot({ path: OUT + 'k4-pro-resumen-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK pro4k');
})().catch((e) => { console.error(e); process.exit(1); });
