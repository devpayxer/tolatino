const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'barberia-el-primo';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const DET = '[data-screen-label="Panel v2 · detalle"]';
const SV = (n) => `(select id from items where business_id = '${BIZ}' and module = 'svc' and name->>'es' = '${n}' and removed_at is null)`;
const KEL = `(select id from business_members where business_id = '${BIZ}' and display_name = 'Kelvin Rosario')`, AND = `(select id from business_members where business_id = '${BIZ}' and display_name = 'Andy Mejía')`;
const restaurar = () => { try {
  sql(`update items set duration_min = 40, svc_opts = '[]'::jsonb, sell = true, status = 'live', hidden_reason = null where business_id = '${BIZ}' and module = 'svc'`);
  sql(`update items set removed_at = now() where business_id = '${BIZ}' and module = 'svc' and name->>'es' = 'Corte con tijera' and removed_at is null`);
  sql(`update items set duration_min = 30 where id = ${SV('Corte clásico')}`); sql(`update items set duration_min = 55 where id = ${SV('Corte + barba')}`); sql(`update items set duration_min = 25 where id = ${SV('Corte de niño')}`);
  sql(`update items set duration_min = 20 where id = ${SV('Arreglo de barba')}`); sql(`update items set duration_min = 30 where id = ${SV('Afeitado clásico')}`); sql(`update items set duration_min = 10 where id = ${SV('Diseño')}`); sql(`update items set duration_min = 5 where id = ${SV('Cejas con navaja')}`);
  sql(`update staff_services set price_cents = 2500 where member_id = ${KEL} and item_id = ${SV('Fade')}`);
  sql(`update businesses set svc_model = 'chair', modules_on = array['svc','citas','staff'], modules_off = modules_off - 'citas' where id = '${BIZ}'`);
  sql(`update booking_policies set cancel_free_h = 4 where business_id = '${BIZ}'`); sql(`update business_members set chair_auto = false, chair_deposit_cents = 0 where id = ${AND}`);
} catch (e) { console.log('restaurar', e.message); } };
(async () => {
  restaurar();
  const b = await chromium.launch(); const err = [];
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p = [p];
  p.on('pageerror', e => err.push(e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  await entrar(p, '5705550166');
  await p.goto(B + `/panel/${BIZ}/vendes`); await p.getByText('Sillas y agenda').first().waitFor(); ok(!!(await vis(p.getByText('Servicios', { exact: true }).first())), 'Lo que vendes: Servicios, Citas y Sillas');
  await p.goto(B + `/panel/${BIZ}/vendes/servicios`); await p.getByText('CORTES').first().waitFor(); ok(!!(await vis(p.getByText('Fade', { exact: true }).first())), 'lista por categoría');
  ok(!!(await vis(p.getByText(/PRECIO SEGÚN EL BARBERO/).first())), 'sillas rentadas: precio según el barbero');
  await p.screenshot({ path: OUT + 'a1-servicios-d.png', fullPage: true });
  // Editar Fade: dura 45, Kelvin $26, opción Largo del pelo
  await clic(p.getByText('Fade', { exact: true })); const d = p.locator(DET); await d.getByText('TIEMPO ENTRE CITAS').waitFor();
  await d.getByText('45 min', { exact: true }).click();
  const kel = d.locator('label, div').filter({ hasText: /^SILLA 2 · KELVIN/ }).last(); await (await vis(d.getByRole('textbox').nth(4))).isVisible();
  const inputs = d.locator('input'); const n = await inputs.count(); let hecho = false;
  for (let i = 0; i < n; i++) { const v = await inputs.nth(i).inputValue(); if (v === '25') { await inputs.nth(i).fill('26'); hecho = true; break; } }
  ok(hecho, 'precio de la silla de Kelvin editable');
  await d.getByText('Agregar grupo').click(); await d.getByPlaceholder('Ej. Largo del pelo').fill('Largo del pelo');
  await d.getByRole('textbox', { name: 'OPCIÓN 1' }).fill('Corto'); await d.getByRole('textbox', { name: 'OPCIÓN 2' }).fill('Largo');
  const steps = d.getByRole('button', { name: /^\+$|Más|Sumar/ }); void steps;
  await p.getByRole('button', { name: 'Guardar' }).last().click(); await p.waitForTimeout(1500);
  ok(sql(`select duration_min from items where id = ${SV('Fade')}`) === '45', 'dura 45 min guardado');
  ok(sql(`select price_cents from staff_services where member_id = ${KEL} and item_id = ${SV('Fade')}`) === '2600', 'precio de Kelvin $26');
  ok(sql(`select jsonb_array_length(svc_opts) || '|' || (svc_opts->0->'t'->>'es') from items where id = ${SV('Fade')}`) === '1|Largo del pelo', 'opción guardada');
  // Nuevo servicio
  await p.goto(B + `/panel/${BIZ}/vendes/servicios`); await clic(p.getByRole('button', { name: 'Agregar' }).first()); const d2 = p.locator(DET); await d2.getByText('Nuevo servicio').first().waitFor();
  await d2.getByPlaceholder('Ej. Fade').fill('Corte con tijera'); await d2.getByText('Cortes', { exact: true }).click(); await d2.getByText('45 min', { exact: true }).click();
  const ins2 = d2.locator('input[inputmode="decimal"]'); await ins2.first().fill('30');
  await p.getByRole('button', { name: 'Agregar' }).last().click(); await p.waitForTimeout(1500);
  ok(sql(`select count(*) from items where business_id = '${BIZ}' and name->>'es' = 'Corte con tijera' and removed_at is null`) === '1', 'servicio nuevo');
  ok(sql(`select count(*) || '|' || max(price_cents) from staff_services where item_id = ${SV('Corte con tijera')}`) === '1|3000', 'solo la silla 1, $30');
  await p.screenshot({ path: OUT + 'a2-editor-d.png', fullPage: true });
  // Cómo trabaja: a empleados y de vuelta
  await p.goto(B + `/panel/${BIZ}/vendes/servicios?det=svm`); await p.getByText('Cómo trabaja tu negocio').first().waitFor(); await clic(p.locator(DET).getByText('Empleados', { exact: true }));
  await p.getByRole('button', { name: 'Guardar' }).last().click(); await p.waitForTimeout(1200); ok(sql(`select svc_model from businesses where id = '${BIZ}'`) === 'emp', 'modelo: empleados');
  await p.goto(B + `/panel/${BIZ}/vendes/citas`); await p.getByText('Aprobar citas al instante').first().waitFor(); ok(true, 'con empleados: aprobar al instante y depósito del negocio');
  sql(`update businesses set svc_model = 'chair' where id = '${BIZ}'`);
  // Citas (sillas): cancelar gratis 24 h
  await p.goto(B + `/panel/${BIZ}/vendes/citas`); await p.getByText('TU SILLA · CANCELAR GRATIS HASTA').first().waitFor(); await clic(p.getByText('24 h antes', { exact: true }));
  await p.getByRole('button', { name: 'Guardar' }).last().click(); await p.waitForTimeout(1200); ok(sql(`select cancel_free_h from booking_policies where business_id = '${BIZ}'`) === '24', 'cancelar gratis 24 h');
  await p.screenshot({ path: OUT + 'a3-citas-d.png', fullPage: true });
  // Sillas y agenda: Andy al instante y $5
  await p.goto(B + `/panel/${BIZ}/vendes/sillas`); await p.getByText('SILLA 3 · ANDY MEJÍA').first().waitFor();
  const sw = p.getByRole('switch', { name: 'Aprobar citas al instante' }); await sw.nth(2).click(); await p.waitForTimeout(1200);
  ok(sql(`select chair_auto from business_members where id = ${AND}`) === 't', 'Andy confirma al instante');
  await p.screenshot({ path: OUT + 'a4-sillas-d.png', fullPage: true });
  // Super Admin: pausar Citas y ocultar un servicio
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(a); a.on('pageerror', e => err.push(e.message));
  await entrar(a, '5705550199'); await a.goto(B + `/admin/negocios/${BIZ}?tab=vende`); await a.getByText(/SERVICIOS · \d+ · COMO LOS DEJÓ EL DUEÑO/).first().waitFor();
  const fc = a.locator('div', { has: a.getByText('Citas', { exact: true }) }).filter({ has: a.getByText('Pausar', { exact: true }) }).last();
  await fc.getByText('Pausar', { exact: true }).click(); await clic(a.getByText('Lo pidió el dueño', { exact: true })); await clic(a.getByRole('button', { name: /Confirmar|Pausar/ }).last()); await a.waitForTimeout(1200);
  ok(sql(`select modules_off ? 'citas' from businesses where id = '${BIZ}'`) === 't', 'admin pausó Citas');
  const fs = a.locator('div', { has: a.getByText('Afeitado clásico', { exact: true }) }).filter({ has: a.getByText('Ocultar', { exact: true }) }).last();
  await fs.getByText('Ocultar', { exact: true }).click(); await clic(a.getByText('Precios o fotos engañosos', { exact: true })); await clic(a.getByRole('button', { name: /Confirmar|Ocultar/ }).last()); await a.waitForTimeout(1200);
  ok(sql(`select status from items where id = ${SV('Afeitado clásico')}`) === 'hidden', 'admin ocultó un servicio');
  await p.goto(B + `/panel/${BIZ}/vendes/citas`); await p.getByText(/To’Latino pausó tus Citas/).first().waitFor(); ok(true, 'el dueño ve la pausa con el motivo');
  await p.goto(B + `/panel/${BIZ}/vendes/servicios`); await p.getByText('OCULTO POR TO’LATINO').first().waitFor(); ok(true, 'el dueño ve el servicio oculto por To’Latino');
  // Teléfono
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })).newPage(); globalThis.__p.push(m); m.on('pageerror', e => err.push(e.message));
  await entrar(m, '5705550166'); await m.goto(B + `/panel/${BIZ}/vendes/servicios`); await m.getByText('CORTES').first().waitFor(); await m.screenshot({ path: OUT + 'a5-servicios-m.png', fullPage: true });
  await m.goto(B + `/panel/${BIZ}/vendes/servicios?det=svc:` + sql(`select ${SV('Fade')}`)); await m.getByText('TIEMPO ENTRE CITAS').first().waitFor(); await m.screenshot({ path: OUT + 'a6-editor-m.png', fullPage: true });
  const w = await m.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'teléfono sin scroll horizontal (' + w + ')');
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); restaurar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} restaurar(); process.exit(1); });
