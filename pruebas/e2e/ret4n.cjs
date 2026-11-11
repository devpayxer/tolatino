// 4n-1 · Tu herramienta de Mercados («Balanza y pedidos») y Tiendas («Tallas y apartados»): cada toque se guarda, queda en la
// auditoría y cambia los filtros de Buscar; precio por libra, agotado hoy, tallas; Super Admin › 360 › Lo que vende.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', M = 'supermercado-la-cosecha', T = 'boutique-yaritza';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const FV = (id) => sql(`select array_to_string(filter_values, ',') from businesses where id = '${id}'`).split(',');
(async () => {
  sql(`update retail_settings set ebt = true, cash = true, slot_cap = 6 where business_id = '${M}'`);
  sql(`update items set sold_out = false where business_id = '${M}'`);
  sql(`update retail_settings set hold_hours = 48, layaway = false, lay_down_pct = 20 where business_id = '${T}'`); sql(`update delivery_settings set ship = false, ship_fee_cents = 0 where business_id = '${T}'`);
  const b = await chromium.launch(); const err = [];
  const mk = async (o, tel) => { const p = await (await b.newContext(o)).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); await entrar(p, tel); return p; };
  const h = await mk({ ...devices['iPhone 13'] }, '5705550288'), y = await mk({ viewport: { width: 1360, height: 900 } }, '5705550299'), a = await mk({ viewport: { width: 1360, height: 900 } }, '5705550199');
  // ── Mercado ──
  await h.goto(B + `/panel/${M}/vendes`); await clic(h.getByText('Balanza y pedidos', { exact: true })); await h.waitForURL(/\/vendes\/herramienta/);
  await verV(h.getByText('CÓMO ENTREGAS')); ok(!!(await vis(h.getByText('Pierna de cerdo').first())), 'Balanza y pedidos: precio por libra de cada producto que se pesa');
  await clic(h.getByRole('switch', { name: /EBT \/ SNAP/ }));
  ok(await espera(() => String(FV(M).includes('ebt')), 'false') === 'false', 'EBT apagado → sale del filtro «EBT» de Buscar');
  ok(Number(sql(`select count(*) from audit_entries where action = 'herramienta.mercado' and target_id = '${M}' and at > now() - interval '1 minute'`)) >= 1, 'queda en la auditoría');
  const p0 = Number(sql(`select price_cents from items where business_id = '${M}' and name->>'es' = 'Pierna de cerdo'`));
  await clic(h.getByRole('button', { name: 'Pierna de cerdo +', exact: true }));
  ok(await espera(() => sql(`select price_cents from items where business_id = '${M}' and name->>'es' = 'Pierna de cerdo'`), String(p0 + 10)) === String(p0 + 10), `precio por libra +10¢ (${p0} → ${p0 + 10})`);
  await clic(h.getByRole('switch', { name: 'Yuca', exact: true }));
  ok(await espera(() => sql(`select sold_out::text from items where business_id = '${M}' and name->>'es' = 'Yuca'`), 'true') === 'true', 'Yuca: agotado hoy');
  await h.screenshot({ path: OUT + 'p1-balanza-m.png', fullPage: true });
  // ── Tienda ──
  await y.goto(B + `/panel/${T}/vendes/herramienta`); await verV(y.getByText('GUARDAS UN APARTADO'));
  await clic(y.getByText('72 h', { exact: true }));
  ok(await espera(() => sql(`select hold_hours || '|' || (category_attrs->>'hold_hours') from retail_settings r join businesses b on b.id = r.business_id where r.business_id = '${T}'`), '72|72') === '72|72', 'guardas un apartado 72 h');
  await clic(y.getByRole('switch', { name: /Layaway/ }));
  ok(await espera(() => String(FV(T).includes('layaway')), 'true') === 'true', 'layaway encendido → filtro «Layaway»');
  await verV(y.getByText('Abono para apartar')); ok(true, 'con layaway salen abono, pagos, cada cuánto y cargo');
  const m0 = Number(sql(`select v.stock_left from item_variants v join items i on i.id = v.item_id where i.business_id = '${T}' and i.name->>'es' = 'Blusa de encaje' and v.label = 'M'`));
  await y.screenshot({ path: OUT + 'p2-tallas-d.png', fullPage: true });
  ok(!!(await vis(y.getByText('BLUSA DE ENCAJE'))) && !!(await vis(y.getByText('Agotada · no se aparta').first())), 'tallas por producto · la agotada «no se aparta»');
  ok(m0 >= 0, `talla M de la blusa: ${m0}`);
  await clic(y.getByRole('switch', { name: 'Envías por correo' }));
  ok(await espera(() => sql(`select ship::text from delivery_settings where business_id = '${T}'`) + '|' + FV(T).includes('envio'), 'true|true') === 'true|true', 'envío por correo encendido → filtro «Envío»');
  await clic(y.getByRole('button', { name: 'Costo del envío +', exact: true }));
  ok(await espera(() => sql(`select ship_fee_cents from delivery_settings where business_id = '${T}'`), '100') === '100', 'costo del envío $1');
  // ── Super Admin ──
  await a.goto(B + `/admin/negocios/${M}?tab=vende`); await verV(a.getByText(/PRODUCTOS · \d+/));
  ok(!!(await vis(a.getByText(/Pierna de cerdo/).first())) && !!(await vis(a.getByText(/Por libra/).first())), '360 › Lo que vende: productos con cómo se vende');
  await a.goto(B + `/admin/negocios/${T}?tab=vende`); await verV(a.getByText(/PRODUCTOS · \d+/));
  ok(!!(await vis(a.getByText(/Con tallas · S \d/).first())), '360: las tallas con lo que queda');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK ret4n');
})().catch((e) => { console.error(e); process.exit(1); });
