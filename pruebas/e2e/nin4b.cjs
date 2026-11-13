// 4eb · Niños: «Cupos y licencia» (cupos por edad, precio por semana, CCIS, turno de noche, edades), la licencia del DHS como única fuente
// de «con licencia» (vencer y retirar desde el Super Admin → la tarjeta y el filtro caen; verificar → vuelven), un programa de Niños sobre
// el motor de Educación (sin plan de pagos, $0 = gratis), los datos de los niños (validación) y el Super Admin 360.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', NEG = 'guarderia-mis-angelitos';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const ve = (l) => l.first().waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const tj = (n = NEG) => JSON.parse(sql(`select coalesce(category_attrs->'tarjeta', '{}') from businesses where id = '${n}'`));
const fv = (n = NEG) => sql(`select filter_values from businesses where id = '${n}'`);
const espera = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
(async () => {
  // Punto de partida conocido: lo de la semilla.
  sql(`update insc_settings set week_cents = 23500, ccis = true, night = false, age_min = 2, age_max = 5, derived_on = null where business_id = '${NEG}'`);
  sql(`update care_openings set openings = case sort when 0 then 1 when 1 then 2 else 0 end where business_id = '${NEG}' and removed_at is null`);
  sql(`update care_openings set removed_at = now() where business_id = '${NEG}' and sort >= 3 and removed_at is null`);
  sql(`update licenses set status = 'valid' where business_id = '${NEG}' and kind = 'pa_dhs_childcare'`); sql(`select licencias_refrescar('${NEG}')`);
  sql(`update insc_settings set derived_on = null where rubro = 'ninos'`);
  barrer();
  ok(sql(`select coalesce(last_error, 'ok') from system_jobs where name = 'barrido.ninos' and last_run_at > now() - interval '1 minute'`) === 'ok', 'la tarea «ninos» corre en el barrido central');
  let f = fv(); ok(/lic/.test(f) && /subsidio/.test(f) && /comidas/.test(f) && /extendido/.test(f) && /cupos/.test(f) && /esp/.test(f), `filtros derivados: ${f}`);
  let t = tj(); ok(t.eta?.es === 'Quedan 3 cupos · 2 a 5 años' && t.fee?.es === 'Acepta CCIS (subsidio) · $235 la semana sin subsidio', `tarjeta: ${t.eta?.es} | ${t.fee?.es}`);
  ok(!/lic/.test(fv('terapias-pasitos')), 'terapias (sin licencia del DHS) ya no dice «con licencia»');
  ok(/^Evaluación en \d+ semanas?$/.test(tj('terapias-pasitos').eta?.es ?? ''), `terapias: ${tj('terapias-pasitos').eta?.es}`);
  ok(sql(`select count(*) from businesses where category_id = 'NEG-NINOS' and 'lic' = any(filter_values) and not exists (select 1 from licenses l where l.business_id = businesses.id and l.kind = 'pa_dhs_childcare' and l.status = 'valid')`) === '0', 'ningún lugar de Niños dice «con licencia» sin licencia del DHS verificada');

  const b = await chromium.launch(); const err = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => err.push(e.message));
  await entrar(p, '5705550388');
  await p.goto(`${B}/panel/${NEG}/vendes`);
  const fila = await vis(p.getByText('Cupos y licencia', { exact: true }));
  ok(!!fila, 'Lo que vendes › «Cupos y licencia»');
  await fila.click(); await p.getByText('CUPOS POR EDAD', { exact: true }).first().waitFor();
  ok(await ve(p.getByText(/Licencia del DHS verificada · certificado PRUEBA-/)), 'la licencia verificada a la vista');
  ok(await ve(p.getByText('Solo recogen las personas autorizadas')), 'reglas con candado');
  await p.screenshot({ path: OUT + 'n4b-cuidado-m.png', fullPage: true });
  // Cupos: «3 años» + 1 → quedan 4.
  await clic(p.getByRole('button', { name: '3 años +' }));
  ok(await espera(() => sql(`select openings from care_openings where business_id = '${NEG}' and label->>'es' = '3 años' and removed_at is null`) === '3'), '3 años: 2 → 3 cupos');
  ok(await espera(() => tj().eta?.es === 'Quedan 4 cupos · 2 a 5 años'), `la tarjeta lo dice: ${tj().eta?.es}`);
  // Precio por semana +$5 → $240.
  await clic(p.getByRole('button', { name: 'Precio por semana sin subsidio +' }));
  ok(await espera(() => tj().fee?.es === 'Acepta CCIS (subsidio) · $240 la semana sin subsidio'), `precio por semana: ${tj().fee?.es}`);
  // Turno de noche → filtro «noche».
  await clic(p.getByRole('switch', { name: 'Turno de noche' }));
  ok(await espera(() => /noche/.test(fv())), 'turno de noche → filtro «noche»');
  // Agregar «6 a 12 años» y dejar todo en 0 → «Lista de espera».
  await clic(p.getByRole('button', { name: '6 a 12 años', exact: true }));
  ok(await espera(() => sql(`select count(*) from care_openings where business_id = '${NEG}' and removed_at is null`) === '4'), 'agregar el grupo de edad «6 a 12 años»');
  sql(`update care_openings set openings = 0 where business_id = '${NEG}'`);
  await p.reload(); await p.getByText('CUPOS POR EDAD', { exact: true }).first().waitFor();
  await clic(p.getByRole('switch', { name: 'Turno de noche' }));
  ok(await espera(() => tj().eta?.es === 'Lista de espera · 2 a 5 años' && !/cupos/.test(fv())), `sin cupos: ${tj().eta?.es} y sin filtro «Hay cupo»`);
  ok(await ve(p.getByText('Lleno · lista de espera')), '«Lleno · lista de espera»');
  sql(`update care_openings set openings = case sort when 0 then 1 when 1 then 2 else 0 end where business_id = '${NEG}' and removed_at is null`);

  // Super Admin: marcar vencida → sin «con licencia», «Llama para pedir cupo»; verificar → vuelve.
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); ad.on('pageerror', (e) => err.push(e.message));
  await entrar(ad, '5705550199'); await ad.goto(`${B}/admin/negocios/${NEG}?tab=vende`);
  ok(await ve(ad.getByText('CUPOS Y LICENCIA · SOLO LECTURA')), 'Super Admin 360: «Cupos y licencia» en solo lectura');
  ok(await ve(ad.getByText('Recibe solicitudes por la app')), 'dice que recibe por la app (licencia verificada)');
  await ad.screenshot({ path: OUT + 'n4b-admin-d.png', fullPage: true });
  await ad.goto(`${B}/admin/negocios/${NEG}?tab=vende`); await ad.getByText(/^LICENCIAS · /).first().waitFor();
  await clic(ad.getByRole('button', { name: 'Vencida', exact: true }));
  await clic(ad.getByText('El registro oficial dice que venció', { exact: true }));
  await clic(ad.getByRole('button', { name: /^(Confirmar|Marcar)/ }).last());
  ok(await espera(() => sql(`select status from licenses where business_id = '${NEG}' and kind = 'pa_dhs_childcare'`) === 'expired'), 'licencia marcada vencida');
  ok(await espera(() => !/(^|[{,])lic([,}]|$)/.test(fv())), `«con licencia» cae en la misma transacción: ${fv()}`);
  ok(tj().eta?.es === 'Llama para pedir cupo · 2 a 5 años' && !/cupos/.test(fv()), `sin licencia vigente no recibe por la app: ${tj().eta?.es}`);
  ok(sql(`select count(*) from audit_entries where action = 'licencia.vencer' and target_id = '${NEG}'`) !== '0', 'auditoría con motivo');
  await p.reload(); await p.getByText('CUPOS POR EDAD', { exact: true }).first().waitFor();
  ok(await ve(p.getByText(/Tu licencia del DHS venció/)), 'el panel dice que venció y que no se piden cupos por la app');
  await p.screenshot({ path: OUT + 'n4b-vencida-m.png', fullPage: true });
  await ad.reload(); await ad.waitForLoadState('networkidle');
  await clic(ad.getByRole('button', { name: 'Verificar', exact: true }));
  await clic(ad.getByText('Coincide con el registro oficial', { exact: true }));
  await clic(ad.getByRole('button', { name: /^(Confirmar|Verificar)/ }).last());
  ok(await espera(() => /(^|[{,])lic([,}]|$)/.test(fv()) && tj().eta?.es === 'Quedan 3 cupos · 2 a 5 años'), 'verificada otra vez → vuelve «con licencia» y los cupos');

  // Un programa de Niños (sin plan de pagos; $0 = gratis): Head Start.
  sql(`insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select 'head-start-hzl', u.id, 'owner', 'Altagracia Reyes', '{"es":"Prueba","en":"Test"}'::jsonb, 'active', false, '{all}', 2020, 9, true from users u where u.phone = '+15705550388' and not exists (select 1 from business_members m where m.business_id = 'head-start-hzl' and m.user_id = u.id)`);
  await p.goto(`${B}/panel/head-start-hzl/vendes/herramienta`); await p.waitForLoadState('networkidle');
  ok(await ve(p.getByText('Cupos y licencia', { exact: true })) || await ve(p.getByText('Grupos y cupos', { exact: true })), 'Head Start: su herramienta');
  ok(!(await vis(p.getByText('PLAN DE PAGOS'))), 'Niños no ofrece plan de pagos');
  await p.screenshot({ path: OUT + 'n4b-headstart-m.png', fullPage: true });

  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK nin4b');
})().catch((e) => { console.error(e); process.exit(1); });
