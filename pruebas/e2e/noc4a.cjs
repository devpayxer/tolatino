// 4na · Noche: «Esta noche» (cover, después de, por día, edad, lista, fila, música, vestimenta) con su historia, la tarjeta y los
// filtros derivados (barrido), la fila que deja de ser «ahora» a los 60 min, el editor de servicios de Noche, la fila desde Hoy y
// el Super Admin 360 (solo lectura + historial + tipo del local).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', NEG = 'la-terraza-night';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const tj = () => JSON.parse(sql(`select coalesce(category_attrs->'tarjeta', '{}') from businesses where id = '${NEG}'`));
const fv = () => sql(`select filter_values from businesses where id = '${NEG}'`);
const espera = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
(async () => {
  // Punto de partida conocido (pruebas repetibles): lo de la semilla.
  sql(`update noche_settings set cover_cents = 1000, after_min = 660, after_cents = 1500, cover_by_dow = '{}', min_age = 21, list_on = true, list_until_min = 660, list_cap = null, music = '{m:bachata,m:salsa,m:tipico,m:mixto}', dress = '{\"es\":\"Sin gorra ni chancletas\",\"en\":\"No caps or flip-flops\"}'::jsonb, kind_override = null, derived_night = null, line_min = 20, line_at = date_trunc('day', now() - interval '7 days') + interval '23 hours 30 minutes' where business_id = '${NEG}'`);
  sql(`update items set removed_at = now() where business_id = '${NEG}' and module = 'svc' and name->>'es' like 'Prueba %' and removed_at is null`);
  const r0 = JSON.parse(barrer()); ok(r0.ok !== false, 'barrido corre');
  ok(sql(`select coalesce(last_error, 'ok') from system_jobs where name = 'barrido.noche' and last_run_at > now() - interval '1 minute'`) === 'ok', 'la tarea «noche» corre en el barrido central');
  let f = fv(); ok(/cover/.test(f) && /lista/.test(f) && /mesas/.test(f) && /e21/.test(f) && /vestimenta/.test(f) && /tarde/.test(f) && /m:bachata/.test(f), `filtros derivados: ${f}`);
  let t = tj(); ok(/cover \$10 · \$15 después de las 11 PM · 21\+$/.test(t.eta.es) && /\$10 cover · \$15 after 11 PM · 21\+$/.test(t.eta.en), `tarjeta eta: ${t.eta.es}`);
  ok(t.fee && !/ahora/.test(t.fee.es) && /a las 11:30 PM: ~20 min/.test(t.fee.es), `la fila vieja sale con su hora, nunca «ahora»: ${t.fee.es}`);

  const b = await chromium.launch(); const err = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => err.push(e.message));
  await entrar(p, '5705550366');
  await p.goto(`${B}/panel/${NEG}/vendes`);
  const fila = await vis(p.getByText('Esta noche', { exact: true }));
  ok(!!fila, 'Lo que vendes › «Esta noche» (Tu herramienta)');
  ok(!(await vis(p.getByText('Citas', { exact: true }))), 'Noche no muestra «Citas» en Lo que vendes');
  await fila.click(); await p.getByText('Cover de esta noche').or(p.getByText(/^Cover del /)).first().waitFor();
  await p.screenshot({ path: OUT + 'n4a-herramienta-m.png', fullPage: true });
  // Cover +$5 → $15: «después de» ($15) ya no sube → se quita.
  const antes = Number(sql(`select count(*) from night_posts where business_id = '${NEG}'`));
  await p.getByRole('button', { name: /más|\+/i }).first().click().catch(async () => { await p.locator('[aria-label*="Subir"], [aria-label*="Más"]').first().click(); });
  ok(await espera(() => sql(`select cover_cents from noche_settings where business_id = '${NEG}'`) === '1500'), 'cover −/+ $5 → $15 en el servidor');
  ok(sql(`select coalesce(after_min::text, 'null') from noche_settings where business_id = '${NEG}'`) === 'null', '«después de» $15 ya no sube: se quita');
  ok(Number(sql(`select count(*) from night_posts where business_id = '${NEG}'`)) >= antes + 2, 'night_posts guarda el cover y el «después de» (historia)');
  ok(sql(`select string_agg(distinct price_cents::text, ',') from items where business_id = '${NEG}' and svc_kind = 'cover' and removed_at is null`) === '1500', 'la Entrada (k cover) sigue al cover');
  t = tj(); ok(/cover \$15 · 21\+$/.test(t.eta.es), `la tarjeta lo dice al momento: ${t.eta.es}`);
  // night_posts es solo inserción.
  let inm = false; try { sql(`update night_posts set value = '1' where business_id = '${NEG}'`); } catch { inm = true; } ok(inm, 'night_posts no se edita (trigger)');
  // La fila AHORA.
  await (await vis(p.getByRole('button', { name: '10 min', exact: true }))).click();
  ok(await espera(() => sql(`select line_min from noche_settings where business_id = '${NEG}'`) === '10'), 'la fila «10 min» se guarda con su hora');
  t = tj(); ok(t.fee && t.fee.es === 'Fila ahora: ~10 min' && t.fee.en === 'Line now: ~10 min', `tarjeta: ${t.fee.es}`);
  ok(/fila/.test(fv()), 'filtro «Fila corta»');
  // A los 61 minutos deja de ser «ahora» (barrido).
  sql(`update noche_settings set line_at = now() - interval '61 minutes' where business_id = '${NEG}'`);
  // 9b-3 · Si hace menos de una hora que dieron las 6 AM, la fila de hace 61 min fue ANOCHE (la noche cambia a las 6 AM): la app lo dice así.
  barrer(); t = tj(); ok(t.fee && /^Fila (anoche )?a las .+: ~10 min$/.test(t.fee.es) && !/ahora/.test(t.fee.es), `a los 61 min: ${t.fee.es}`);
  // Edad 18+, sin lista.
  await p.reload(); await p.getByText('EDAD MÍNIMA').waitFor();
  await (await vis(p.getByRole('button', { name: '18+', exact: true }))).click();
  ok(await espera(() => /e18/.test(fv())), 'edad 18+ → filtro e18');
  await (await vis(p.getByRole('button', { name: 'Sin lista', exact: true }))).click();
  ok(await espera(() => !/lista/.test(fv())), 'sin lista → sin filtro «lista»');
  // Música: no se puede quedar sin ninguna.
  await (await vis(p.getByRole('button', { name: 'Reguetón', exact: true }))).click();
  ok(await espera(() => /m:reggaeton/.test(fv())), 'música Reguetón → filtro m:reggaeton');
  // Vestimenta.
  const vest = p.getByPlaceholder('Ej. Sin gorra ni chancletas'); await vest.fill('Casual elegante');
  await (await vis(p.getByRole('button', { name: 'Guardar', exact: true }))).click();
  ok(await espera(() => sql(`select dress->>'es' from noche_settings where business_id = '${NEG}'`) === 'Casual elegante'), 'vestimenta guardada');
  ok(sql(`select count(*) from night_posts where business_id = '${NEG}' and field = 'dress'`) !== '0', 'vestimenta con su historia');
  await p.screenshot({ path: OUT + 'n4a-herramienta-m2.png', fullPage: true });

  // Servicios: una mesa con depósito > mínimo no se guarda; con mínimo $200 sí.
  await p.goto(`${B}/panel/${NEG}/vendes/servicios`); await p.getByText('ESTA NOCHE').first().waitFor();
  ok(!!(await vis(p.getByText(/TIENES 4/).first())), 'la mesa dice cuántas hay');
  ok(!(await vis(p.getByText('CÓMO TRABAJA TU NEGOCIO'))), 'Noche no pregunta empleados / sillas');
  await (await vis(p.getByRole('button', { name: 'Agregar' }))).click();
  await p.getByText('QUÉ ES', { exact: true }).waitFor();
  await p.screenshot({ path: OUT + 'n4a-servicio-m.png', fullPage: true });
  await p.getByPlaceholder(/Fade|Ej\./).first().fill('Prueba mesa de esquina');
  await p.getByLabel(/DEPÓSITO/).fill('60').catch(async () => { await p.locator('input').filter({ hasText: '' }).nth(3).fill('60'); });
  await p.getByLabel(/MÍNIMO DE CONSUMO/).fill('40');
  await (await vis(p.getByRole('button', { name: 'Agregar', exact: true }))).click();
  ok(!!(await p.getByText('El depósito no puede ser más que el mínimo: se descuenta de la cuenta.').first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false)), 'depósito > mínimo: no se guarda (servidor)');
  await p.getByLabel(/MÍNIMO DE CONSUMO/).fill('200');
  await (await vis(p.getByRole('button', { name: 'Agregar', exact: true }))).click();
  ok(await espera(() => sql(`select deposit_cents || '|' || price_cents || '|' || (svc_attrs->>'tables') from items where business_id = '${NEG}' and name->>'es' = 'Prueba mesa de esquina' and removed_at is null`) === '6000|20000|1'), 'mesa guardada: depósito $60, mínimo $200, 1 mesa');

  // Hoy: la fila desde la puerta.
  await p.goto(`${B}/panel/${NEG}/hoy`); await p.getByText('CÓMO ESTÁ LA FILA AHORA').waitFor();
  await (await vis(p.getByRole('button', { name: '30 min o más', exact: true }))).click();
  ok(await espera(() => sql(`select line_min from noche_settings where business_id = '${NEG}'`) === '35'), 'la fila se cambia desde Hoy');
  ok(sql(`select action from audit_entries where target_id = '${NEG}' order by id desc limit 1`) === 'noche.fila', 'auditoría «noche.fila»');
  await p.screenshot({ path: OUT + 'n4a-hoy-m.png' });

  // Super Admin 360: «Esta noche» solo lectura, historial y tipo del local.
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); ad.on('pageerror', (e) => err.push(e.message));
  await entrar(ad, '5705550199');
  await ad.goto(`${B}/admin/negocios/${NEG}?tab=vende`); await ad.getByText('ESTA NOCHE · SOLO LECTURA').waitFor();
  ok(!!(await vis(ad.getByText(/Cover \$15 · 18\+ · sin lista · fila 35 min/).first())), 'el 360 ve «Esta noche» como el dueño');
  ok(!!(await vis(ad.getByText('Fila 30 min o más').or(ad.getByText('Fila 35 min')).first())), 'historial: lo que publicó');
  ok(!!(await vis(ad.getByText(/LICENCIA DE LICOR|Licencia de licor/).first())), 'licencia de licor (PLCB) en el 360');
  await (await vis(ad.getByRole('button', { name: 'Lounge', exact: true }))).click();
  await ad.locator('textarea').last().fill('Prueba: es más lounge que discoteca');
  await (await vis(ad.getByRole('button', { name: /Confirmar|Guardar|Cambiar/ }).last())).click();
  ok(await espera(() => sql(`select kind_override from noche_settings where business_id = '${NEG}'`) === 'lounge'), 'Super Admin ajusta el tipo (con motivo)');
  await ad.screenshot({ path: OUT + 'n4a-admin-d.png', fullPage: true });
  await p.goto(`${B}/panel/${NEG}/vendes/herramienta`); ok(!!(await p.getByText('To’Latino ajustó el tipo de tu negocio. Si no es correcto, escríbenos.').first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false)), 'el dueño ve el ajuste');
  sql(`update noche_settings set kind_override = null where business_id = '${NEG}'`);

  // Buscar › Noche: la tarjeta con el cover de esta noche.
  barrer();
  await p.goto(`${B}/c/noche`); await p.waitForLoadState('networkidle');
  // 9b-1 · La categoría va por páginas (3 en una base nueva): se busca la tarjeta del local página por página (antes: solo la primera).
  for (let i = 0; i < 6 && !(await vis(p.getByText(/cover \$15 · 18\+/).first())); i++) { const sig = await vis(p.getByText('Siguiente', { exact: true })); if (!sig) break; await sig.click(); await p.waitForLoadState('networkidle'); await p.waitForTimeout(400); }
  ok(!!(await vis(p.getByText(/cover \$15 · 18\+/).first())), 'la tarjeta de la categoría dice el cover de esta noche');
  await p.screenshot({ path: OUT + 'n4a-categoria-m.png' });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK noc4a');
})().catch((e) => { console.error(e); process.exit(1); });
