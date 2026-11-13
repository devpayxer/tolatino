// 4h-2 · Tu herramienta de Doctores («Seguros e idiomas») y Profesionales (legal: licencias + total por escrito; no legal:
// listo en, garantía, presupuesto antes). Cada toque se guarda; filtros derivados; Super Admin en solo lectura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', S = 'centro-medico-quisqueya', L = 'bufete-almonte', T = 'tecnofix-hazleton';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
// El interruptor de una fila: el botón con role switch dentro de la fila que tiene ese título.
const tg = (p, t) => clic(p.getByRole('switch', { name: t, exact: true }));
(async () => {
  const b = await chromium.launch(); const err = [];
  const mk = async (vp) => { const p = await (await b.newContext({ viewport: vp })).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); return p; };
  const d = await mk({ width: 1360, height: 900 }), m = await mk({ width: 390, height: 844 });
  sql(`update health_settings set updated_by = null, insurers = '{medicaid,medicare,chip,highmark,geisinger,upmc,aetna}', uninsured = true, cash_cents = 8500, langs = '{es,en}', interp = false where business_id = '${S}'`);
  // ── Doctores ──
  await entrar(d, '5705550244');
  await d.goto(B + `/panel/${S}/vendes`); await clic(d.getByText('Seguros e idiomas', { exact: true }));
  await d.getByText('IDIOMAS EN LA CONSULTA').first().waitFor();
  ok(/\/vendes\/herramienta$/.test(d.url()), 'Lo que vendes › Seguros e idiomas → /vendes/herramienta');
  ok(!!(await vis(d.getByText('PÚBLICOS', { exact: true }))) && !!(await vis(d.getByText('PRIVADOS', { exact: true }))), 'públicos y privados del catálogo');
  ok(!!(await vis(d.getByText('En Buscar y en tu página: «Acepta Medicaid, Medicare, CHIP (niños) y 4 más».'))), 'nota: «Acepta Medicaid, Medicare, CHIP (niños) y 4 más»');
  await tg(d, 'Cigna');
  ok(await espera(() => sql(`select 'cigna' = any(insurers) from health_settings where business_id = '${S}'`), 't') === 't', 'Cigna encendido → guardado');
  await d.getByText('y 5 más').first().waitFor(); ok(true, 'la nota ya dice «y 5 más»');
  await tg(d, 'Medicaid');
  ok(await espera(() => sql(`select 'medicaid' = any(filter_values) from businesses where id = '${S}'`), 'f') === 'f', 'Medicaid apagado → sale del filtro «medicaid»');
  ok(sql(`select category_attrs->'tarjeta'->'fee'->>'es' from businesses where id = '${S}'`) === 'Medicare y CHIP · sin seguro $85', 'la tarjeta de Buscar dice «Medicare y CHIP · sin seguro $85»');
  await tg(d, 'Medicaid');
  ok(await espera(() => sql(`select 'medicaid' = any(filter_values) from businesses where id = '${S}'`), 't') === 't', 'Medicaid otra vez → vuelve el filtro');
  // Consulta sin seguro: + $5.
  const st = d.getByRole('button', { name: 'Consulta sin seguro +', exact: true });
  await (await vis(st)).click();
  ok(await espera(() => sql(`select cash_cents from health_settings where business_id = '${S}'`), '9000') === '9000', 'consulta sin seguro $85 → $90');
  await clic(d.getByText('Português', { exact: true }));
  ok(await espera(() => sql(`select array_to_string(langs, ',') from health_settings where business_id = '${S}'`), 'es,en,pt') === 'es,en,pt', 'idiomas: ES · EN · PT');
  await tg(d, 'Intérprete en la consulta');
  ok(await espera(() => sql(`select 'interp' = any(filter_values) from businesses where id = '${S}'`), 't') === 't', 'intérprete → filtro «interp»');
  await d.screenshot({ path: OUT + 'h5-salud-herr-d.png', fullPage: true });
  // Dejar sin seguro y sin ningún seguro: no se puede.
  sql(`update health_settings set insurers = '{medicaid}' where business_id = '${S}'`); await d.reload(); await d.getByText('IDIOMAS EN LA CONSULTA').first().waitFor();
  await tg(d, 'Atiendes sin seguro'); await espera(() => sql(`select uninsured from health_settings where business_id = '${S}'`), 'f');
  await tg(d, 'Medicaid'); await d.getByText('Deja al menos un seguro o marca «Sin seguro».').first().waitFor();
  ok(sql(`select array_to_string(insurers, ',') from health_settings where business_id = '${S}'`) === 'medicaid', 'sin seguro apagado + quitar el último seguro → «Deja al menos un seguro…» y no se guarda');
  sql(`update health_settings set insurers = '{medicaid,medicare,chip,highmark,geisinger,upmc,aetna}', uninsured = true, cash_cents = 8500, langs = '{es,en}', interp = false where business_id = '${S}'`);
  await entrar(m, '5705550244'); await m.goto(B + `/panel/${S}/vendes/herramienta`); await m.getByText('IDIOMAS EN LA CONSULTA').first().waitFor();
  await m.screenshot({ path: OUT + 'h5-salud-herr-m.png', fullPage: true });
  // ── Profesional legal (Bufete Almonte) ──
  sql(`update pro_settings set payment_plan = false, urgent = false where business_id = '${L}'`); sql(`update items set svc_attrs = svc_attrs || '{"gov": 46500}'::jsonb where business_id = '${L}' and name->>'es' = 'Renovar la green card (I-90)'`);
  await entrar(d, '5705550166');
  await d.goto(B + `/panel/${L}/vendes`); await clic(d.getByText('Licencias y el total por escrito', { exact: true }));
  await d.getByText('EL TOTAL, POR ESCRITO').first().waitFor();
  ok(!!(await vis(d.getByText('TUS LICENCIAS', { exact: true }))), 'legal: TUS LICENCIAS (las mismas de Tu página)');
  ok(!!(await vis(d.getByText('Honorario $350 + gobierno $465 = total $815'))), 'I-90: honorario $350 + gobierno $465 = total $815');
  const gs = d.getByRole('button', { name: 'Renovar la green card (I-90) +', exact: true });
  await (await vis(gs)).click();
  ok(await espera(() => sql(`select svc_attrs->>'gov' from items where business_id = '${L}' and name->>'es' = 'Renovar la green card (I-90)'`), '47000') === '47000', 'gob. +$5 → $470 (el total de la página cambia: $820)');
  await d.getByText('Honorario $350 + gobierno $470 = total $820').first().waitFor(); ok(true, 'se ve «… = total $820»');
  await (await vis(d.getByRole('button', { name: 'Renovar la green card (I-90) −', exact: true }))).click();
  await espera(() => sql(`select svc_attrs->>'gov' from items where business_id = '${L}' and name->>'es' = 'Renovar la green card (I-90)'`), '46500');
  await tg(d, 'Plan de pagos');
  ok(await espera(() => sql(`select payment_plan::text || '|' || ('plan' = any(filter_values))::text from pro_settings p join businesses b on b.id = p.business_id where b.id = '${L}'`), 'true|true') === 'true|true', 'Plan de pagos → guardado y filtro «plan»');
  await tg(d, 'Plan de pagos'); await espera(() => sql(`select payment_plan from pro_settings where business_id = '${L}'`), 'f');
  ok(!!(await vis(d.getByText('Nadie te garantiza un resultado. En EE. UU. un notario no es abogado: tu página lo dice.'))), 'nota: nadie garantiza · notario no es abogado');
  await d.screenshot({ path: OUT + 'h6-pro-legal-d.png', fullPage: true });
  // ── Profesional no legal (TecnoFix) ──
  sql(`update pro_settings set days = 1, warranty_days = 90, estimate_first = true, updated_by = null where business_id = '${T}'`);
  await entrar(d, '5705550277');
  await d.goto(B + `/panel/${T}/vendes`); await d.getByText('Listo el mismo día · garantía 90 días · presupuesto antes').first().waitFor(); ok(true, 'fila: «Listo el mismo día · garantía 90 días · presupuesto antes»');
  await d.goto(B + `/panel/${T}/vendes/herramienta`); await d.getByText('Listo en', { exact: true }).first().waitFor();
  ok(!(await vis(d.getByText('EL TOTAL, POR ESCRITO'))) && !(await vis(d.getByText('TUS LICENCIAS', { exact: true }))), 'no legal: sin total por escrito ni licencias');
  await (await vis(d.getByRole('button', { name: 'Listo en +', exact: true }))).click();
  ok(await espera(() => sql(`select days from pro_settings where business_id = '${T}'`), '2') === '2', 'Listo en: el mismo día → 2 días');
  await (await vis(d.getByRole('button', { name: 'Garantía +', exact: true }))).click();
  ok(await espera(() => sql(`select warranty_days from pro_settings where business_id = '${T}'`), '105') === '105', 'Garantía 90 → 105 días (de 15 en 15)');
  await d.screenshot({ path: OUT + 'h7-pro-nolegal-d.png', fullPage: true });
  ok(sql(`select count(*) from audit_entries where action in ('herramienta.salud','herramienta.pro','herramienta.gobierno') and at > now() - interval '10 minutes'`) * 1 >= 8, 'cada cambio deja su línea en la auditoría');
  // ── Super Admin: solo lectura ──
  const a = await mk({ width: 1360, height: 900 }); await entrar(a, '5705550199');
  await a.goto(B + `/admin/negocios/${S}?tab=vende`); await a.getByText('SU HERRAMIENTA · SOLO LECTURA').first().waitFor();
  ok(!!(await vis(a.getByText(/7 seguros · sin seguro \$85/).first())), 'admin › Doctores: «7 seguros · sin seguro $85 …»');
  await a.goto(B + `/admin/negocios/${L}?tab=vende`); await a.getByText('SU HERRAMIENTA · SOLO LECTURA').first().waitFor();
  ok(!!(await vis(a.getByText('Honorario $350 + gobierno $465 = total $815').first())), 'admin › Profesional: el total por escrito de cada trámite');
  await a.screenshot({ path: OUT + 'h8-admin-pro-d.png', fullPage: true });
  sql(`update pro_settings set days = 1, warranty_days = 90 where business_id = '${T}'`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK svc4h2');
})().catch((e) => { console.error(e); process.exit(1); });
