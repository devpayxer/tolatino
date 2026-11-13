// 4n-2 · Productos de Mercados y Tiendas en el panel (el constructor del Menú con module 'shop'): por libra con EBT, 21+ solo
// en la tienda, tallas que entran en 0 y se quitan sin borrarse; la sección es del módulo shop.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', M = 'supermercado-la-cosecha', T = 'boutique-yaritza';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
(async () => {
  sql(`update items set removed_at = now() where business_id in ('${M}', '${T}') and name->>'es' in ('Chuleta de cerdo', 'Ron añejo', 'Falda midi') and removed_at is null`);
  const b = await chromium.launch(); const err = [];
  const mk = async (tel) => { const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); await entrar(p, tel); return p; };
  const h = await mk('5705550288'), y = await mk('5705550299');
  const det = (p) => p.locator('aside[data-screen-label="Panel v2 · detalle"]');
  // ── Mercado: por libra con EBT ──
  await h.goto(B + `/panel/${M}/vendes`); await clic(h.getByText('Productos', { exact: true }));
  await h.waitForURL(/\/vendes\/productos/); await verV(h.getByText('Pierna de cerdo').first()); ok(true, 'Lo que vendes › Productos con los del mercado');
  ok(!!(await vis(h.getByText(/POR LIBRA · SE PESA DELANTE/).first())) && !!(await vis(h.getByText(/\$2\.\d9\/lb/).first())), 'la fila dice «por libra» y el precio /lb');
  await clic(h.getByRole('button', { name: 'Agregar producto' }));
  const D = det(h); await verV(D.getByText('Nuevo producto'));
  await D.locator('input:not([type=file])').nth(0).fill('Chuleta de cerdo'); await D.locator('input[inputmode="decimal"]').first().fill('3.49');
  await clic(D.getByText('Carnicería', { exact: true })); await clic(D.getByText('Por libra · se pesa delante', { exact: true }));
  await verV(D.getByText(/El precio es por libra/)); await h.screenshot({ path: OUT + 'q1-producto-lb-d.png', fullPage: true });
  await clic(D.getByRole('button', { name: 'Agregar producto' }));
  ok(await espera(() => sql(`select module || '|' || shop_kind || '|' || unit || '|' || ebt || '|' || price_cents || '|' || (select module from item_sections s where s.id = i.section_id) from items i where business_id = '${M}' and name->>'es' = 'Chuleta de cerdo' and removed_at is null`), 'shop|peso|lb|true|349|shop') === 'shop|peso|lb|true|349|shop', 'guardado: producto por libra, EBT, sección del mercado');
  // 21+: siempre solo en la tienda (no se pide).
  await clic(h.getByRole('button', { name: 'Agregar producto' })); await verV(D.getByText('Nuevo producto'));
  await D.locator('input:not([type=file])').nth(0).fill('Ron añejo'); await D.locator('input[inputmode="decimal"]').first().fill('24.99');
  await clic(D.getByText('Despensa', { exact: true })); await clic(D.getByRole('switch', { name: 'Es de 21+ (licor, tabaco, vape)' }));
  await clic(D.getByRole('button', { name: 'Agregar producto' }));
  ok(await espera(() => sql(`select age_min || '|' || in_store_only || '|' || sell || '|' || ebt from items where business_id = '${M}' and name->>'es' = 'Ron añejo' and removed_at is null`), '21|true|false|false') === '21|true|false|false', '21+: solo en la tienda, no se pide, sin EBT');
  // ── Tienda: tallas ──
  await y.goto(B + `/panel/${T}/vendes/productos`); await clic(y.getByRole('button', { name: 'Agregar producto' }));
  const E = det(y); await verV(E.getByText('Nuevo producto'));
  await E.locator('input:not([type=file])').nth(0).fill('Falda midi'); await E.locator('input[inputmode="decimal"]').first().fill('34');
  await clic(E.getByText('Ropa', { exact: true })); await clic(E.getByText('Con tallas', { exact: true }));
  await (await vis(E.getByLabel('TALLAS · SEPARADAS POR COMA'))).fill('s, m, l');
  await y.screenshot({ path: OUT + 'q2-producto-tallas-d.png', fullPage: true });
  await clic(E.getByRole('button', { name: 'Agregar producto' }));
  ok(await espera(() => sql(`select string_agg(v.label || ':' || v.stock_left, ',' order by v.sort) from item_variants v join items i on i.id = v.item_id where i.business_id = '${T}' and i.name->>'es' = 'Falda midi' and i.removed_at is null and v.removed_at is null`), 'S:0,M:0,L:0') === 'S:0,M:0,L:0', 'tallas S, M, L en 0 (en mayúscula)');
  const FID = sql(`select id from items where business_id = '${T}' and name->>'es' = 'Falda midi' and removed_at is null`);
  await y.goto(B + `/panel/${T}/vendes/productos?det=item:${FID}`); await verV(E.getByLabel('TALLAS · SEPARADAS POR COMA'));
  await (await vis(E.getByLabel('TALLAS · SEPARADAS POR COMA'))).fill('S, M'); await clic(E.getByRole('button', { name: 'Guardar' }));
  ok(await espera(() => sql(`select count(*) filter (where removed_at is null) || '|' || count(*) filter (where removed_at is not null) from item_variants where item_id = ${FID}`), '2|1') === '2|1', 'quitar la L: queda con removed_at (no se borra)');
  await y.goto(B + `/panel/${T}/vendes/herramienta`); await verV(y.getByText('FALDA MIDI')); ok(true, 'la falda sale en Tu herramienta para decir cuántas quedan');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK prod4n');
})().catch((e) => { console.error(e); process.exit(1); });
