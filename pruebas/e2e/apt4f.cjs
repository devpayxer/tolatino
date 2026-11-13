// 4f-3 · Apartar productos: Tienda (hoja ¿cuántos?, Tu apartado), 3 pasos, la tienda confirma / falta uno / no lo tiene,
// guardado 48 h, lo recogió, vencer (sin respuesta y no pasó), cancelar, unidades reservadas y devueltas, gomas por medida.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', T = 'taller-hermanos-pena', LL = 'llantera-el-cibao';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const MARISOL = "(select id from users where phone = '+15705550122')";
const ST = (nm, b = T) => sql(`select stock_left from items where business_id = '${b}' and module = 'shop' and name->>'es' = '${nm}'`);
const O = (n, col) => sql(`select ${col} from operations o where o.number = '${n}'`);
(async () => {
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and kind = 'hold' and status in ('pending', 'change_proposed', 'confirmed')`);
  sql(`update items set stock_left = stock_par, sell = true where module = 'shop' and business_id in ('${T}', '${LL}')`);
  const b = await chromium.launch(); const err = [];
  const mc = await b.newContext({ ...devices['iPhone 13'] }), m = await mc.newPage(); await entrar(m, '5705550122');
  const h = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(h, '5705550211');
  for (const p of [m, h]) { p.on('pageerror', e => err.push(e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); }
  const tienda = async (b2 = T) => { await m.goto(B + `/n/${b2}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor(); };
  const tomar = async (nm, q) => {
    const card = m.locator('[data-screen-label="Ficha · tienda"] > div.grid > div').filter({ hasText: nm });
    await clic(card.getByRole('button', { name: 'Apartar' })); const hoja = m.locator('[data-screen-label="Tienda · artículo"]'); await hoja.waitFor();
    if (q > 1) await clic(hoja.getByText(String(q), { exact: true }));
    await clic(hoja.getByRole('button', { name: 'Apartar', exact: true })); await hoja.waitFor({ state: 'detached' });
  };
  const mandar = async () => {
    await clic(m.getByRole('button', { name: 'Ver apartado' })); await m.waitForURL(/\/apartar$/);
    await m.getByText('TU APARTADO').first().waitFor(); await clic(m.getByRole('button', { name: 'Continuar' }));
    await m.locator('[data-screen-label="APP-NEG-TIENDA-APARTADO · móvil"]').getByText('HORA EN QUE PASAS').waitFor();
    const pg = m.locator('[data-screen-label="APP-NEG-TIENDA-APARTADO · móvil"]');
    await pg.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) /, disabled: false }).first().click();
    await clic(pg.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /^\d{1,2}(:\d\d)? [AP]M$/ }).first());
    await clic(m.getByRole('button', { name: 'Continuar' })); await m.getByText('BUENO SABER').first().waitFor();
    await m.screenshot({ path: OUT + 'p3-revisa-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Apartar', exact: true })); await m.waitForURL(/\/apartado\/A-\d+/); return m.url().split('/apartado/')[1];
  };
  const det = async (n) => { await h.goto(B + `/panel/${T}/hoy?det=apt:${n}`); await h.getByText(`#${n}`).first().waitFor(); };

  // ── 1. Tienda del taller: hoja ¿cuántos? y Tu apartado ──
  await tienda(); ok(!!(await vis(m.getByText('Batería Interstate'))) && !!(await vis(m.getByText('$159'))), 'Tienda: Batería Interstate $159');
  await m.screenshot({ path: OUT + 'p1-tienda-taller-m.png', fullPage: true });
  await tomar('Batería Interstate', 1);
  const card = m.locator('[data-screen-label="Ficha · tienda"] > div.grid > div').filter({ hasText: 'Limpiaparabrisas' }); await clic(card.getByRole('button', { name: 'Apartar' }));
  const hoja = m.locator('[data-screen-label="Tienda · artículo"]'); await hoja.waitFor(); ok(!!(await vis(hoja.getByText(/Apartar no cobra nada. Te lo guardan 48 horas y pagas \$24 en la caja/))), 'hoja: apartar no cobra nada · $24 en la caja');
  await m.screenshot({ path: OUT + 'p2-hoja-m.png' });
  await clic(hoja.getByText('2', { exact: true })); ok(!!(await vis(hoja.getByText(/pagas \$48 en la caja/))), 'hoja: 2 → $48');
  await clic(hoja.getByRole('button', { name: 'Apartar', exact: true })); await hoja.waitFor({ state: 'detached' });
  ok(!!(await vis(m.getByText('$207 en la caja'))) && !!(await vis(m.getByText(/TU APARTADO · 3 ARTÍCULOS/))), 'barra: Tu apartado · 3 artículos · $207 en la caja');
  await tienda(); ok(!!(await vis(m.getByText('$207 en la caja'))), 'el carrito sigue al volver a la ficha');

  // ── 2. Mandar (3 pasos): hoy $0, unidades reservadas ──
  const A1 = await mandar();
  ok(!!(await vis(m.getByText('APARTADO ENVIADO'))) && !!(await vis(m.getByText(/No se ha cobrado nada/))), `${A1}: enviado · no se ha cobrado nada`);
  ok(O(A1, "o.kind || '|' || o.status || '|' || o.total_cents || '|' || o.pay_mode || '|' || (o.ready_at - o.scheduled_at)") === 'hold|pending|20700|local|2 days', 'operación: hold, pendiente, $207, pago en la caja, se guarda 48 h');
  ok(ST('Batería Interstate') === '5' && ST('Limpiaparabrisas (par)') === '7', 'unidades reservadas (6→5, 9→7)');
  ok(sql(`select count(*) from notifications where tpl = 'biz_apartado' and ref_id = '${A1}'`) === '1', 'aviso al taller: confirma que lo tienes');
  await m.screenshot({ path: OUT + 'p4-enviado-m.png', fullPage: true });
  await tienda(); ok(!!(await vis(m.getByText('TU APARTADO'))) && !(await vis(m.getByText(/en la caja$/))), 'ficha: tarjeta «Tu apartado» y el carrito vacío');

  // ── 3. Panel: falta uno → el cliente lo quita → guardado → lo recogió ──
  await h.goto(B + `/panel/${T}/hoy`); await h.getByText(/^APARTADOS · 1 POR CONFIRMAR/).waitFor(); ok(true, 'panel Hoy: APARTADOS · 1 por confirmar');
  await det(A1); await h.screenshot({ path: OUT + 'p5-panel-apartado-d.png', fullPage: true });
  await clic(h.getByRole('button', { name: 'Falta uno' })); await clic(h.getByText('Limpiaparabrisas (par)').last()); await h.getByText(/decide si sigue con lo demás/).first().waitFor();
  ok(O(A1, 'o.status') === 'change_proposed' && ST('Limpiaparabrisas (par)') === '0', 'falta uno: espera al cliente; esa existencia queda en 0');
  await m.goto(B + `/apartado/${A1}`); await m.getByText('FALTA ALGO').first().waitFor(); await m.screenshot({ path: OUT + 'p6-falta-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Quitarlo y seguir' })); await m.getByText('TE LO GUARDAN').first().waitFor();
  ok(O(A1, "o.status || '|' || o.total_cents") === 'confirmed|15900', 'quitó lo que faltaba: guardado, $159');
  ok(!!(await vis(m.getByText(/En la caja pagas \$159/))), 'cliente: te lo guardan · en la caja pagas $159');
  await m.screenshot({ path: OUT + 'p7-guardado-m.png', fullPage: true });
  await det(A1); await clic(h.getByRole('button', { name: 'Lo recogió' })); await h.getByText('Listo: recogido.').first().waitFor();
  ok(O(A1, "o.status || '|' || o.stage") === 'done|picked_up' && ST('Batería Interstate') === '5', 'recogido; la batería se vendió (sigue en 5)');
  await m.goto(B + `/apartado/${A1}`); await m.getByText('RECOGIDO').first().waitFor(); ok(!!(await vis(m.getByText('¿Cómo te fue?'))), 'cliente: recogido · ¿cómo te fue? (reseña verificada)');
  await clic(m.getByRole('button', { name: '5 estrellas' })); await m.waitForURL(/\/resena\?pedido=A-/); ok(true, 'las estrellas llevan a la reseña con el apartado');

  // ── 4. Lo tengo / no lo tengo / cancelar / vencer ──
  await tienda(); await tomar('Anticongelante', 2); const A2 = await mandar();
  await det(A2); await clic(h.getByRole('button', { name: 'No lo tengo' })); await h.getByText(/sabe que no lo tienes/).first().waitFor();
  ok(O(A2, 'o.status') === 'declined' && ST('Anticongelante') === '0', 'no lo tengo: declinado y existencia en 0');
  ok(sql(`select count(*) from notifications where tpl = 'apt_no' and ref_id = '${A2}'`) === '1', 'aviso: no lo tienen');
  sql(`update items set stock_left = stock_par where module = 'shop' and business_id = '${T}'`);
  await tienda(); await tomar('Anticongelante', 1); const A3 = await mandar();
  await det(A3); await clic(h.getByRole('button', { name: 'Lo tengo · guárdalo' })); await h.getByText(/se lo guardas 48 horas/).first().waitFor();
  ok(O(A3, 'o.status') === 'confirmed' && sql(`select count(*) from notifications where tpl = 'apt_ok' and ref_id = '${A3}'`) === '1', 'lo tengo: guardado y aviso');
  await m.goto(B + `/apartado/${A3}`); await clic(m.getByRole('button', { name: 'Cancelar' })); await clic(m.getByRole('button', { name: 'Sí, cancelar' })); await m.getByText('CANCELADO').first().waitFor();
  ok(O(A3, "o.status || '|' || o.cancelled_by") === 'cancelled|user' && ST('Anticongelante') === '3', 'cancelado por el cliente: vuelve al estante');
  await tienda(); await tomar('Anticongelante', 1); const A4 = await mandar();
  sql(`update operations set respond_by = now() - interval '1 minute' where number = '${A4}'`);
  await m.goto(B + `/apartado/${A4}`); await m.getByText('VENCIÓ').first().waitFor(); ok(!!(await vis(m.getByText('No respondieron a tiempo'))), 'sin respuesta: vence');
  ok(O(A4, 'o.status_detail') === 'sin_respuesta' && ST('Anticongelante') === '3', 'vence sin respuesta: vuelve al estante');
  await tienda(); await tomar('Anticongelante', 1); const A5 = await mandar();
  await det(A5); await clic(h.getByRole('button', { name: 'Lo tengo · guárdalo' })); await h.getByText(/se lo guardas/).first().waitFor();
  sql(`update operations set ready_at = now() - interval '1 minute' where number = '${A5}'`);
  await h.goto(B + `/panel/${T}/hoy`); await h.getByText('Esperan tu respuesta', { exact: false }).first().waitFor().catch(() => {});
  ok(O(A5, "o.status || '|' || o.status_detail") === 'expired|no_paso' && ST('Anticongelante') === '3', 'no pasó en 48 h: vence al mirar el panel y vuelve al estante');
  ok(sql(`select count(*) from notifications where tpl = 'apt_vence' and ref_id = '${A5}'`) === '1', 'aviso: tu apartado venció');

  // ── 5. Gomas: filtros y la última unidad ──
  await tienda(LL); ok(!!(await vis(m.getByText('NUEVA').first())) && !!(await vis(m.getByText('USADA').first())), 'llantera: etiquetas NUEVA / USADA');
  await clic(m.getByRole('button', { name: 'Usadas' })); ok(!(await vis(m.getByText('Kumho Crugen HP71'))) && !!(await vis(m.getByText('Michelin Defender'))), 'filtro Usadas');
  await m.screenshot({ path: OUT + 'p8-gomas-m.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(d, '5705550122');
  await d.goto(B + `/n/${T}?tab=shop`); await d.locator('[data-screen-label="Ficha · tienda"]').waitFor(); await d.screenshot({ path: OUT + 'p9-tienda-d.png', fullPage: true });
  await b.close(); console.log('OK apt4f');
})().catch((e) => { console.error(e); process.exit(1); });
