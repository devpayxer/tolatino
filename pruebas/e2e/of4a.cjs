const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', T = 'taller-hermanos-pena', H = 'plomeria-rodriguez';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const llenar = async (p, label, v) => { const re = new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '( \\d+/\\d+)?$'); const x = await vis(p.getByLabel(label, { exact: true })); if (!x) throw new Error('sin campo ' + label); await x.fill(v); };
const limpiar = () => {
  sql(`update items set removed_at = now() where business_id in ('${T}','${H}') and module = 'svc' and name->>'es' like 'Prueba %' and removed_at is null`);
  sql(`update trade_settings set labor_rate_cents = 9500, warranty_months = 12, warranty_miles = 12000, same_day_cutoff_h = 14 where business_id = '${T}'`);
  sql(`update trade_settings set labor_rate_cents = 9500, h24 = true where business_id = '${H}'`);
  sql(`update businesses set service_radius_mi = 25 where id = '${H}'`);
  sql(`update items set sell = true where business_id = '${T}' and name->>'es' = 'Cambio de aceite'`);
};
(async () => {
  limpiar();
  const b = await chromium.launch(); const err = [];
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p = [d];
  d.on('pageerror', e => err.push('panel ' + e.message)); d.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  await entrar(d, '5705550211');
  // ── Taller: Lo que vendes muestra Servicios · Taller y estimados · Citas ──
  await d.goto(B + `/panel/${T}/vendes`); await d.getByText('Taller y estimados').first().waitFor();
  ok(!!(await vis(d.getByText(/\$95\/h · garantía 12 meses · mismo día antes de las 2 PM/))), 'Lo que vendes: Taller y estimados con tarifa, garantía y hora del mismo día');
  await d.screenshot({ path: OUT + 'a1-vendes-d.png', fullPage: true });
  await clic(d.getByText('Servicios', { exact: true }));
  await d.getByText(/servicios$/).first().waitFor();
  ok(!!(await vis(d.getByText('Nada se hace ni se cobra sin el OK del cliente', { exact: false }))), 'Servicios de Auto: resumen con la regla del estimado');
  ok(!!(await vis(d.getByText('DIAGNÓSTICO', { exact: true }))), 'resumen: DESDE · DIAGNÓSTICO · CON ESTIMADO');
  await d.screenshot({ path: OUT + 'a2-servicios-d.png', fullPage: true });
  // Ocultar uno con el interruptor
  const n0 = sql(`select count(*) from items where business_id = '${T}' and module = 'svc' and sell and removed_at is null`);
  await clic(d.getByRole('switch', { name: /Cambio de aceite/ }).or(d.locator('[data-fila="Cambio de aceite"] [role="switch"]')));
  ok(await espera(() => sql(`select sell from items where business_id = '${T}' and name->>'es' = 'Cambio de aceite' and removed_at is null`), 'f') === 'f', 'interruptor: «Cambio de aceite» oculto');
  ok(sql(`select count(*) from audit_entries where action = 'servicio.ocultar' and at > now() - interval '1 minute'`) !== '0', 'queda en la auditoría');
  // ── Nuevo servicio «se cotiza» ──
  await d.goto(B + `/panel/${T}/vendes/servicios?det=of:new`); await d.getByText('Nuevo servicio').first().waitFor();
  await llenar(d, 'NOMBRE', 'Prueba transmisión');
  await clic(d.getByText('Se cotiza después de verlo', { exact: true }));
  await llenar(d, 'SUELE SALIR DESDE', '1200'); await llenar(d, 'HASTA', '2800');
  await clic(d.getByText('En días', { exact: true }));
  ok(!!(await vis(d.getByText(/Se cotiza/).last())), 'así lo ve el cliente: «Se cotiza»');
  ok(!!(await vis(d.getByText(/suele ser \$1,200–\$2,800/))), 'así lo ve el cliente: suele ser $1,200–$2,800');
  await d.screenshot({ path: OUT + 'a3-nuevo-d.png', fullPage: true });
  await clic(d.getByRole('button', { name: 'Agregar', exact: true }).last());
  ok(await espera(() => sql(`select svc_kind || '|' || (svc_attrs->'rng'->>0) || '|' || (svc_attrs->'rng'->>1) || '|' || (svc_attrs->'days'->>0) from items where business_id = '${T}' and name->>'es' = 'Prueba transmisión' and removed_at is null`), 'cotiza|120000|280000|1') === 'cotiza|120000|280000|1', 'guardado: se cotiza, rango $1,200–$2,800, en días');
  // ── Tu herramienta: tarifa y garantía ──
  await d.goto(B + `/panel/${T}/vendes/herramienta`); await d.getByText('REGLAS DEL ESTIMADO · NO SE APAGAN').first().waitFor();
  await clic(d.getByRole('button', { name: /Más|\+/ }).first().or(d.getByLabel('Más').first()));
  ok(await espera(() => sql(`select labor_rate_cents from trade_settings where business_id = '${T}'`), '10000') === '10000', 'Tu herramienta: tarifa $95 → $100 al tocar +');
  await clic(d.getByText('24 meses · 24,000 mi', { exact: true }));
  ok(await espera(() => sql(`select warranty_months || '|' || warranty_miles from trade_settings where business_id = '${T}'`), '24|24000') === '24|24000', 'garantía 24 meses · 24,000 mi');
  ok(sql(`select count(*) from audit_entries where action = 'herramienta.guardar' and at > now() - interval '1 minute'`) !== '0', 'Tu herramienta queda en la auditoría');
  await d.screenshot({ path: OUT + 'a4-herramienta-d.png', fullPage: true });
  // ── Hogar: Servicios con sus formas de cobrar y Tu herramienta ──
  const h = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); globalThis.__p.push(h); h.on('pageerror', e => err.push('hogar ' + e.message));
  await entrar(h, '5705550222');
  await h.goto(B + `/panel/${H}/vendes/servicios`); await h.getByText('Precio completo antes de empezar', { exact: false }).first().waitFor();
  ok(!!(await vis(h.getByText(/visita · se descuenta si lo arreglan/))), 'Hogar: «Visita y diagnóstico» · se descuenta si lo arreglan');
  await h.screenshot({ path: OUT + 'a5-hogar-servicios-m.png', fullPage: true });
  await h.goto(B + `/panel/${H}/vendes/servicios?det=of:new`); await h.getByText('Nuevo servicio').first().waitFor();
  await llenar(h, 'NOMBRE', 'Prueba pintar cuarto');
  await clic(h.getByText('Por medida', { exact: true }));
  await clic(h.getByText('cuarto', { exact: true }));
  await llenar(h, 'PRECIO POR CUARTO', '250');
  ok(!!(await vis(h.getByText('$250/cuarto', { exact: true }))), 'así lo ve el cliente: $250/cuarto');
  await h.screenshot({ path: OUT + 'a6-hogar-nuevo-m.png', fullPage: true });
  await clic(h.getByRole('button', { name: 'Agregar', exact: true }).last());
  ok(await espera(() => sql(`select svc_kind || '|' || price_cents || '|' || (svc_attrs->>'u') from items where business_id = '${H}' and name->>'es' = 'Prueba pintar cuarto' and removed_at is null`), 'area|25000|cuarto') === 'area|25000|cuarto', 'guardado: por medida, $250 por cuarto');
  await h.goto(B + `/panel/${H}/vendes/herramienta`); await h.getByText('HASTA DÓNDE VAS').first().waitFor();
  await clic(h.getByText('15 mi', { exact: true }));
  ok(await espera(() => sql(`select service_radius_mi from businesses where id = '${H}'`), '15') === '15', 'Hogar: hasta dónde vas → 15 mi');
  const sw = await vis(h.getByRole('switch', { name: /Emergencias 24 h/ }));
  if (sw) await sw.click(); else await clic(h.getByText('Emergencias 24 h'));
  ok(await espera(() => sql(`select h24 from trade_settings where business_id = '${H}'`), 'f') === 'f', 'Hogar: emergencias 24 h apagadas');
  ok(!sql(`select filter_values from businesses where id = '${H}'`).includes('h24') || sql(`select count(*) from items where business_id = '${H}' and svc_kind = 'emer' and removed_at is null and sell`) !== '0', 'filtros recalculados (h24 solo si hay emergencias)');
  await h.screenshot({ path: OUT + 'a7-hogar-herramienta-m.png', fullPage: true });
  // ── Citas: depósito por forma y trabajo grande ──
  await h.goto(B + `/panel/${H}/vendes/citas`); await h.getByText('DEPÓSITO AL PEDIR LA CITA').first().waitFor();
  ok(!!(await vis(h.getByText('SOLO EN · VACÍO = EN TODOS'))), 'Citas: el depósito se puede limitar por forma de cobrar');
  await h.screenshot({ path: OUT + 'a8-hogar-citas-m.png', fullPage: true });
  // ── Super Admin: Lo que vende del taller (Tu herramienta en solo lectura, cómo cobra cada servicio) ──
  const ad = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(ad); ad.on('pageerror', e => err.push('admin ' + e.message));
  await entrar(ad, '5705550199'); await ad.goto(B + `/admin/negocios/${T}?tab=vende`); await ad.getByText('SU HERRAMIENTA · SOLO LECTURA').first().waitFor();
  ok(!!(await vis(ad.getByText(/Mano de obra \$100\/h/))), 'Super Admin: Tu herramienta del taller (00/h tras el cambio)');
  ok(!!(await vis(ad.getByText(/Se cotiza · \$1200\.00/).first())), 'Super Admin: cómo cobra cada servicio');
  await ad.screenshot({ path: OUT + 'a9-admin-vende-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png', fullPage: true }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
