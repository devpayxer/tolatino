// 4q · Tiendas: pestaña Productos, hoja con Talla (agotada no se elige, «quedan N»), horas de Tu herramienta (72), la talla
// se reserva y vuelve; «Falta esa talla · ofrecer otra» en el panel → el cliente «Sí, la talla X» o «Quitarlo»; carrito viejo
// con una talla agotada → el servidor lo frena. Regresión: apt4f (Auto/Hogar siguen en 48 h).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', T = 'boutique-yaritza';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const MARISOL = "(select id from users where phone = '+15705550122')";
const VS = (it, t) => sql(`select v.stock_left from item_variants v join items i on i.id = v.item_id where i.business_id = '${T}' and i.name->>'es' = '${it}' and i.removed_at is null and v.label = '${t}' and v.removed_at is null`);
const O = (n, col) => sql(`select ${col} from operations o where o.number = '${n}'`);
const STOCK = { 'Blusa de encaje': { S: 3, M: 2, L: 4, XL: 1, '2X': 0 }, 'Vestido de fiesta': { S: 1, M: 2, L: 1, XL: 1, '2X': 0 } };
(async () => {
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and kind = 'hold' and status in ('pending', 'change_proposed', 'confirmed')`);
  for (const [it, m] of Object.entries(STOCK)) for (const [t, n] of Object.entries(m)) sql(`update item_variants v set stock_left = ${n} from items i where i.id = v.item_id and i.business_id = '${T}' and i.name->>'es' = '${it}' and v.label = '${t}'`);
  sql(`update retail_settings set hold_hours = 72 where business_id = '${T}'`);
  const b = await chromium.launch(); const err = [];
  const mc = await b.newContext({ ...devices['iPhone 13'] }), m = await mc.newPage(); await entrar(m, '5705550122');
  const h = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(h, '5705550299');
  for (const p of [m, h]) { p.on('pageerror', e => err.push(e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); }
  const tienda = async () => { await m.goto(B + `/n/${T}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor(); };
  const abrir = async (nm) => { const card = m.locator('[data-screen-label="Ficha · tienda"] > div.grid > div').filter({ hasText: nm }); await clic(card.getByRole('button', { name: 'Apartar' })); const hoja = m.locator('[data-screen-label="Tienda · artículo"]'); await hoja.waitFor(); return hoja; };
  const tomar = async (nm, talla, q) => {
    const hoja = await abrir(nm); await clic(hoja.getByRole('radio', { name: new RegExp(`^${talla}( |$)`) }));
    if (q > 1) await clic(hoja.getByText(String(q), { exact: true }));
    await clic(hoja.getByRole('button', { name: 'Apartar', exact: true })); await hoja.waitFor({ state: 'detached' });
  };
  const pg = m.locator('[data-screen-label="APP-NEG-TIENDA-APARTADO · móvil"]');
  const mandar = async (cap, dentro) => {
    if (!dentro) { await clic(m.getByRole('button', { name: 'Ver apartado' })); await m.waitForURL(/\/apartar$/); }
    await m.getByText('TU APARTADO').first().waitFor(); if (cap) await m.screenshot({ path: OUT + 'q3-apartado-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Continuar' }));
    await pg.getByText('HORA EN QUE PASAS').waitFor();
    await pg.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) /, disabled: false }).first().click();
    await clic(pg.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /^\d{1,2}(:\d\d)? [AP]M$/ }).first());
    await clic(m.getByRole('button', { name: 'Continuar' })); await m.getByText('BUENO SABER').first().waitFor();
    if (cap) await m.screenshot({ path: OUT + 'q4-revisa-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Apartar', exact: true }));
  };
  const det = async (n) => { await h.goto(B + `/panel/${T}/hoy?det=apt:${n}`); await h.getByText(`#${n}`).first().waitFor(); };

  // ── 1. Ficha: pestaña Productos, la nota con las horas de la tienda, la hoja con Talla ──
  await tienda();
  ok(!!(await vis(m.getByRole('tab', { name: 'Productos' }).or(m.getByRole('button', { name: 'Productos' })))), 'Tiendas: la pestaña se llama Productos');
  ok(!!(await vis(m.getByText(/te lo guardan 72 horas y pagas en la caja lo mismo que ves aquí/))), 'nota: las 72 horas de Tu herramienta');
  await m.screenshot({ path: OUT + 'q1-productos-m.png', fullPage: true });
  let hoja = await abrir('Blusa de encaje');
  ok(!!(await vis(hoja.getByText('ELIGE LA TALLA'))) && await (await vis(hoja.getByRole('button', { name: 'Apartar', exact: true }))).isDisabled(), 'hoja: sin talla no se aparta («ELIGE LA TALLA»)');
  ok(await hoja.getByRole('radio', { name: /^2X( |$)/ }).first().getAttribute('aria-disabled') === 'true' && !!(await vis(hoja.getByText('Agotada'))), 'talla 2X agotada: no se elige');
  ok(!!(await vis(hoja.getByText('quedan 1'))), 'XL: «quedan 1»');
  ok(!!(await vis(hoja.getByText(/Te lo guardan 72 horas y pagas \$\d+ en la caja/))), 'hoja: «Te lo guardan 72 horas»');
  await clic(hoja.getByRole('radio', { name: /^M( |$)/ })); await m.screenshot({ path: OUT + 'q2-hoja-talla-m.png' });
  ok((await hoja.getByRole('radio', { name: /^3( |$)/ }).count()) === 0, 'M tiene 2: ¿cuántos? llega a 2');
  await clic(hoja.getByText('2', { exact: true })); await clic(hoja.getByRole('button', { name: 'Apartar', exact: true })); await hoja.waitFor({ state: 'detached' });
  await tomar('Blusa de encaje', 'L', 1);
  ok(!!(await vis(m.getByText('APARTADO: 3'))), 'tarjeta: «APARTADO: 3» (dos tallas de la misma blusa)');

  // ── 2. Mandar: la talla en cada línea, 72 horas, la talla se reserva ──
  await mandar(true);
  await m.waitForURL(/\/apartado\/A-\d+/); const A1 = m.url().split('/apartado/')[1];
  ok(O(A1, "(o.ready_at - o.scheduled_at)::text || '|' || (o.details->>'hold_hours')") === '3 days|72', `${A1}: se guarda 72 h (copia de Tu herramienta)`);
  ok(sql(`select string_agg(variant_label || 'x' || qty, ',' order by id) from operation_lines where operation_id = (select id from operations where number = '${A1}')`) === 'Mx2,Lx1', 'líneas con su talla: M×2, L×1');
  ok(VS('Blusa de encaje', 'M') === '0' && VS('Blusa de encaje', 'L') === '3', 'la talla se reserva (M 2→0, L 4→3)');
  ok(!!(await vis(m.getByText('BLUSA DE ENCAJE · M × 2'))), 'estado: la línea dice la talla');

  // ── 3. Panel: falta esa talla → ofrecer la de al lado ──
  await det(A1); ok(!!(await vis(h.getByText(/Talla M · × 2/))), 'panel: la línea dice «Talla M»');
  await clic(h.getByRole('button', { name: 'Falta esa talla · ofrecer otra' })); await h.getByText('¿QUÉ TALLA FALTA?').first().waitFor();
  await clic(h.getByText('Blusa de encaje · M')); await h.getByText(/OFRECER OTRA TALLA/).first().waitFor();
  ok(!(await vis(h.getByText('Talla XL', { exact: true }))) && !!(await vis(h.getByText('Talla S', { exact: true }))), 'solo ofrece tallas con existencia suficiente (S sí; XL con 1 no alcanza para 2)');
  await h.screenshot({ path: OUT + 'q5-panel-otra-talla-d.png', fullPage: true });
  await clic(h.getByText('Talla S', { exact: true })); await h.getByText(/decide si quiere la S/).first().waitFor();
  ok(O(A1, 'o.status') === 'change_proposed' && VS('Blusa de encaje', 'S') === '3', 'propuesta: espera al cliente; la S no se aparta todavía');
  ok(sql(`select count(*) from notifications where tpl = 'apt_talla' and ref_id = '${A1}'`) === '1', 'aviso: falta tu talla');
  await m.goto(B + `/apartado/${A1}`); await m.getByText('FALTA UNA TALLA').first().waitFor();
  ok(!!(await vis(m.getByText(/Te ofrecen la S al mismo precio/))), 'cliente: «Te ofrecen la S al mismo precio»');
  await m.screenshot({ path: OUT + 'q6-falta-talla-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Sí, la talla S' })); await m.getByText('TE LO GUARDAN').first().waitFor();
  ok(O(A1, "o.status") === 'confirmed' && VS('Blusa de encaje', 'S') === '1', 'aceptó: guardado y la S se reserva (3→1)');
  ok(sql(`select string_agg(variant_label || ':' || status, ',' order by id) from operation_lines where operation_id = (select id from operations where number = '${A1}')`) === 'S:ok,L:ok', 'la línea pasó a la S');
  ok(sql(`select status from change_proposals where operation_id = (select id from operations where number = '${A1}')`) === 'accepted', 'propuesta aceptada');
  await clic(m.getByRole('button', { name: 'Cancelar' })); await clic(m.getByRole('button', { name: 'Sí, cancelar' })); await m.getByText('CANCELADO').first().waitFor();
  ok(VS('Blusa de encaje', 'S') === '3' && VS('Blusa de encaje', 'L') === '4' && VS('Blusa de encaje', 'M') === '0', 'cancelado: S y L vuelven al estante; la M sigue en 0 (no estaba)');

  // ── 4. Quitarlo en vez de la otra talla ──
  await tienda(); await tomar('Vestido de fiesta', 'M', 1); await mandar(false); await m.waitForURL(/\/apartado\/A-\d+/); const A2 = m.url().split('/apartado/')[1];
  await det(A2); await clic(h.getByRole('button', { name: 'Falta esa talla · ofrecer otra' })); await h.getByText(/OFRECER OTRA TALLA/).first().waitFor();
  await clic(h.getByText('Talla L', { exact: true })); await h.getByText(/decide si quiere la L/).first().waitFor();
  await m.goto(B + `/apartado/${A2}`); await clic(m.getByRole('button', { name: 'Quitarlo', exact: true }));
  await m.waitForTimeout(800);
  ok(sql(`select status from change_proposals where operation_id = (select id from operations where number = '${A2}')`) === 'declined' && VS('Vestido de fiesta', 'L') === '1', 'quitarlo: la propuesta se declina y la L no se toca');

  // ── 5. Carrito viejo con una talla agotada: el servidor lo frena ──
  const v2x = sql(`select v.id from item_variants v join items i on i.id = v.item_id where i.business_id = '${T}' and i.name->>'es' = 'Vestido de fiesta' and v.label = '2X'`), it = sql(`select id from items where business_id = '${T}' and name->>'es' = 'Vestido de fiesta' and removed_at is null`);
  await tienda(); await m.evaluate(([k, l]) => localStorage.setItem(k, JSON.stringify(l)), [`tl-apartado-${T}`, [{ item: it, qty: 1, v: v2x }]]);
  await m.goto(B + `/n/${T}/apartar`); await mandar(false, true);
  ok(!!(await (async () => { for (let i = 0; i < 20; i++) { if (await vis(m.getByText(/está agotado en talla 2X/))) return true; await m.waitForTimeout(250); } return false; })()), 'talla agotada: «está agotado en talla 2X» y no se aparta');

  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(d, '5705550122');
  await d.goto(B + `/n/${T}?tab=shop`); await d.locator('[data-screen-label="Ficha · tienda"]').waitFor(); await d.screenshot({ path: OUT + 'q7-productos-d.png', fullPage: true });
  sql(`update retail_settings set hold_hours = 48 where business_id = '${T}'`);
  await b.close(); console.log('OK apt4q');
})().catch((e) => { console.error(e); process.exit(1); });
