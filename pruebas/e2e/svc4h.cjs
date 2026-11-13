// 4h-1 · Servicios de Doctores y Profesionales en el panel: cómo lo cobras y lo propio de cada forma; validación del servidor.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', S = 'centro-medico-quisqueya', P = 'ferreira-injury-law';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
(async () => {
  const b = await chromium.launch(); const err = [];
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); d.on('pageerror', (e) => err.push(e.message));
  d.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  // ── Salud ──
  await entrar(d, '5705550244');
  await d.goto(B + `/panel/${S}/vendes/servicios`); await d.getByText('Consulta de medicina general').first().waitFor();
  ok(!!(await vis(d.getByText('Gratis con seguro').first())), 'lista: «Chequeo anual» gratis con seguro');
  await d.screenshot({ path: OUT + 'h1-svc-salud-d.png', fullPage: true });
  await d.goto(B + `/panel/${S}/vendes/servicios?det=svc:new`); await d.getByText('CÓMO LO COBRAS').first().waitFor();
  ok(!!(await vis(d.getByText('Gratis con tu seguro', { exact: true }))) && !!(await vis(d.getByText('Por video', { exact: true }))), 'salud: consulta · por video · sin cita · gratis con tu seguro · precio fijo');
  await (await vis(d.getByLabel('NOMBRE', { exact: true }))).fill('Vacuna de la gripe');
  await clic(d.getByText('Gratis con tu seguro', { exact: true }));
  ok(!(await vis(d.getByLabel('PRECIO SIN SEGURO', { exact: true }))), 'gratis con tu seguro: sin campo de precio');
  await (await vis(d.getByLabel('IMPORTANTE · OPCIONAL', { exact: true }))).fill('Si tienes fiebre hoy, espera a sentirte bien.');
  await d.screenshot({ path: OUT + 'h2-svc-salud-nuevo-d.png', fullPage: true });
  await d.getByRole('button', { name: 'Agregar', exact: true }).last().click();
  ok(await espera(() => sql(`select svc_kind || '|' || price_cents || '|' || (svc_attrs->'no'->0->>'es') from items where business_id = '${S}' and name->>'es' = 'Vacuna de la gripe' and removed_at is null`), 'free|0|Si tienes fiebre hoy, espera a sentirte bien.') === 'free|0|Si tienes fiebre hoy, espera a sentirte bien.', 'guardado: gratis con seguro, $0, IMPORTANTE');
  // ── Profesionales ──
  await entrar(d, '5705550255');
  await d.goto(B + `/panel/${P}/vendes/servicios?det=svc:new`); await d.getByText('CÓMO LO COBRAS').first().waitFor();
  ok(!!(await vis(d.getByText('% solo si ganas', { exact: true }))) && !!(await vis(d.getByText('Honorario fijo', { exact: true }))), 'pro: consulta · honorario fijo · por hora · % · sin cita · se cotiza');
  await (await vis(d.getByLabel('NOMBRE', { exact: true }))).fill('Renovar green card');
  await clic(d.getByText('Honorario fijo', { exact: true }));
  await (await vis(d.getByLabel('TU HONORARIO', { exact: true }))).fill('350');
  await (await vis(d.getByLabel('TARIFA DEL GOBIERNO · APARTE · OPCIONAL', { exact: true }))).fill('465');
  ok(!!(await vis(d.getByText('Tu página dice el total: $815.'))), 'honorario $350 + gobierno $465 = total $815');
  await clic(d.getByText('También por video o teléfono', { exact: true }));
  await d.screenshot({ path: OUT + 'h3-svc-pro-nuevo-d.png', fullPage: true });
  const sec = await vis(d.getByText('+ Nueva', { exact: true })); if (sec) { await sec.click(); await (await vis(d.getByLabel('NUEVA CATEGORÍA', { exact: true }))).fill('Inmigración'); }
  await d.getByRole('button', { name: 'Agregar', exact: true }).last().click();
  ok(await espera(() => sql(`select svc_kind || '|' || price_cents || '|' || (svc_attrs->>'gov') || '|' || (svc_attrs->>'rem') from items where business_id = '${P}' and name->>'es' = 'Renovar green card' and removed_at is null`), 'fijo|35000|46500|true') === 'fijo|35000|46500|true', 'guardado: fijo $350, gobierno $465, también remoto');
  // Porcentaje: 33 % (se guarda como 3300, nunca dinero); 60 % no.
  await d.goto(B + `/panel/${P}/vendes/servicios?det=svc:new`); await d.getByText('CÓMO LO COBRAS').first().waitFor();
  await (await vis(d.getByLabel('NOMBRE', { exact: true }))).fill('Accidente de trabajo');
  await clic(d.getByText('% solo si ganas', { exact: true })); await (await vis(d.getByLabel('PORCENTAJE', { exact: true }))).fill('60');
  const sec2 = await vis(d.getByText('Inmigración', { exact: true })); if (sec2) await sec2.click();
  await d.getByRole('button', { name: 'Agregar', exact: true }).last().click(); await d.getByText('El porcentaje va de 1 a 50.').first().waitFor(); ok(true, '% de 60 → «El porcentaje va de 1 a 50.»');
  await (await vis(d.getByLabel('PORCENTAJE', { exact: true }))).fill('33');
  await d.getByRole('button', { name: 'Agregar', exact: true }).last().click();
  ok(await espera(() => sql(`select svc_kind || '|' || price_cents from items where business_id = '${P}' and name->>'es' = 'Accidente de trabajo' and removed_at is null`), 'pct|3300') === 'pct|3300', '% guardado como 3300 (33 %)');
  await d.goto(B + `/panel/${P}/vendes/servicios`); await d.getByText('33 %').first().waitFor(); ok(true, 'lista: 33 %');
  await d.screenshot({ path: OUT + 'h4-svc-pro-d.png', fullPage: true });
  sql(`update items set removed_at = now() where name->>'es' in ('Vacuna de la gripe', 'Renovar green card', 'Accidente de trabajo') and business_id in ('${S}', '${P}')`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK svc4h');
})().catch((e) => { console.error(e); process.exit(1); });
