// 4ea · Educación: «Grupos y cupos» (cómo das las clases, precio, matrícula, plan, primera clase gratis, cupos por grupo con «Deja al
// menos un grupo con cupo»), abrir y quitar un grupo, el editor de cursos (matrícula < precio, semanas y horas), la tarjeta y los
// filtros derivados (barrido y al guardar), la auditoría y el Super Admin 360 en solo lectura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', NEG = 'ingles-para-todos';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const tj = () => JSON.parse(sql(`select coalesce(category_attrs->'tarjeta', '{}') from businesses where id = '${NEG}'`));
const fv = () => sql(`select filter_values from businesses where id = '${NEG}'`);
const espera = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const ve = (l) => l.first().waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
const IT = (n) => sql(`select id from items where business_id = '${NEG}' and name->>'es' = '${n}' and removed_at is null`);
const AUD = () => Number(sql(`select count(*) from audit_entries where target_id = '${NEG}' and action like 'edu.%'`));
(async () => {
  // Punto de partida conocido (pruebas repetibles): lo de la semilla.
  sql(`update insc_settings set how_presencial = true, how_linea = true, how_hibrido = false, esp = true, derived_on = null where business_id = '${NEG}'`);
  sql(`update items set price_cents = 8000, svc_attrs = svc_attrs || '{\"g1\":true}' where business_id = '${NEG}' and name->>'es' = 'Inglés nivel 1 · noche'`);
  sql(`update items set price_cents = 24000, deposit_cents = 5000, svc_attrs = (svc_attrs - 'plan_n') || '{\"dep\":5000}' where business_id = '${NEG}' and name->>'es' = 'Preparación para ciudadanía'`);
  sql(`update items set removed_at = now() where business_id = '${NEG}' and module = 'svc' and name->>'es' like 'Prueba %' and removed_at is null`);
  sql(`update class_groups set status = 'cancelled', cancel_reason = 'prueba' where business_id = '${NEG}' and label->>'es' like 'Prueba%' and status = 'open'`);
  sql(`update class_groups set status = 'open', cancel_reason = null where business_id = '${NEG}' and label->>'es' not like 'Prueba%' and status = 'cancelled'`);
  sql(`update class_groups set seats_total = seats_outside + seats_booked + 4 where business_id = '${NEG}' and label->>'es' = 'Lun y Mié 7 PM'`);
  sql(`update class_groups set seats_total = 9 where item_id = ${IT('Preparación para ciudadanía')}`);
  JSON.parse(barrer());
  ok(sql(`select coalesce(last_error, 'ok') from system_jobs where name = 'barrido.edu' and last_run_at > now() - interval '1 minute'`) === 'ok', 'la tarea «edu» corre en el barrido central');
  let f = fv(); ok(/presencial/.test(f) && /linea/.test(f) && /esp/.test(f) && /gratis1/.test(f) && /noche/.test(f) && /finde/.test(f) && /cert/.test(f) === false, `filtros derivados (sin «cert»: el curso no da certificado): ${f}`);
  let t = tj(); ok(t.fee?.es === '$80 al mes · primera clase gratis' && t.fee?.en === '$80 a month · first class free', `tarjeta fee: ${t.fee?.es}`);
  ok(/^Próximo grupo: \d+ \w+$/.test(t.eta?.es ?? ''), `tarjeta eta: ${t.eta?.es}`);

  const b = await chromium.launch(); const err = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => err.push(e.message));
  await entrar(p, '5705550377');
  await p.goto(`${B}/panel/${NEG}/vendes`);
  const fila = await vis(p.getByText('Grupos y cupos', { exact: true }));
  ok(!!fila, 'Lo que vendes › «Grupos y cupos» (Tu herramienta)');
  await fila.click(); await p.getByText('GRUPOS ABIERTOS', { exact: true }).first().waitFor();
  ok(!!(await vis(p.getByText('CÓMO DAS LAS CLASES'))) && !!(await vis(p.getByText('REGLAS · NO SE APAGAN'))), 'la herramienta: cómo das las clases y las reglas con candado');
  await p.screenshot({ path: OUT + 'e4a-herramienta-m.png', fullPage: true });
  const a0 = AUD();

  // Cómo das las clases: apagar «En línea» quita el filtro; no se puede quedar sin ninguna.
  await clic(p.getByRole('switch', { name: 'En línea' }));
  ok(await espera(() => !/linea/.test(fv())), 'apagar «En línea» → sin filtro «linea»');
  await clic(p.getByRole('switch', { name: 'Presencial' }));
  ok(await ve(p.getByText('Deja al menos una forma de dar clases.')), '«Deja al menos una forma de dar clases.»');
  ok(sql(`select how_presencial from insc_settings where business_id = '${NEG}'`) === 't', 'presencial sigue prendido');
  await clic(p.getByRole('switch', { name: 'En línea' }));
  ok(await espera(() => /linea/.test(fv())), 'prender «En línea» otra vez');

  // Precio del curso por mes +$5 → la tarjeta lo dice al momento.
  await clic(p.getByRole('button', { name: 'Precio +' }).first());
  ok(await espera(() => sql(`select price_cents from items where id = ${IT('Inglés nivel 1 · noche')}`) === '8500'), 'precio −/+ $5 → $85 en el servidor');
  ok(await espera(() => tj().fee?.es === '$85 al mes · primera clase gratis'), `la tarjeta lo dice: ${tj().fee?.es}`);

  // Matrícula +$5 y plan de 3 pagos en el curso de ciudadanía.
  await clic(p.getByRole('button', { name: 'Matrícula · aparta el cupo +' }));
  ok(await espera(() => sql(`select deposit_cents from items where id = ${IT('Preparación para ciudadanía')}`) === '5500'), 'matrícula +$5 → $55 (items.deposit_cents)');
  await clic(p.getByRole('button', { name: '3', exact: true }));
  ok(await espera(() => sql(`select svc_attrs->>'plan_n' from items where id = ${IT('Preparación para ciudadanía')}`) === '3'), 'plan de 3 pagos guardado');
  ok(await espera(() => /plan/.test(fv())), 'filtro «plan»');
  await p.reload(); await p.getByText('PLAN DE PAGOS').first().waitFor();
  ok(!!(await vis(p.getByText('3 pagos de $62 sin intereses'))), 'el plan dice las cuotas: 3 pagos de $62 sin intereses ($240 − $55)');

  // Cupos: «Deja al menos un grupo con cupo».
  const gC = sql(`select id from class_groups where item_id = ${IT('Preparación para ciudadanía')} and status = 'open' order by id limit 1`);
  sql(`update class_groups set seats_total = seats_outside + seats_booked + 1 where id = ${gC}`);
  await p.reload(); await p.getByText('GRUPOS ABIERTOS', { exact: true }).first().waitFor();
  await clic(p.getByRole('button', { name: /^Cupos · Empieza el [^·]+ −$/ }));
  ok(await ve(p.getByText('Deja al menos un grupo con cupo. Si se llenó, abre otro grupo.')), '«Deja al menos un grupo con cupo» (último grupo con cupo)');
  ok(sql(`select seats_total from class_groups where id = ${gC}`) === String(1 + Number(sql(`select seats_booked + seats_outside from class_groups where id = ${gC}`))), 'el cupo no cambió');
  const gL = sql(`select id from class_groups where business_id = '${NEG}' and label->>'es' = 'Lun y Mié 7 PM' and status = 'open'`), tot0 = Number(sql(`select seats_total from class_groups where id = ${gL}`));
  await clic(p.getByRole('button', { name: /^Cupos · Lun y Mié 7 PM .+ \+$/ }));
  ok(await espera(() => Number(sql(`select seats_total from class_groups where id = ${gL}`)) === tot0 + 1), 'cupos + 1 en «Lun y Mié 7 PM»');
  // El total nunca baja de lo ocupado: con 3 inscritos fuera y 0 libres, el total queda en 3.
  sql(`update class_groups set seats_outside = 3, seats_total = 7 where id = ${gL}`);
  await p.reload(); await p.getByText('GRUPOS ABIERTOS', { exact: true }).first().waitFor();
  for (let i = 0; i < 4; i++) { await clic(p.getByRole('button', { name: /^Cupos · Lun y Mié 7 PM .+ −$/ })); await espera(() => Number(sql(`select seats_total from class_groups where id = ${gL}`)) === 7 - i - 1, 3000); }
  ok(await espera(() => sql(`select seats_total || ':' || seats_outside from class_groups where id = ${gL}`) === '3:3'), 'con 3 inscritos fuera y 0 libres el total queda en 3 (nunca baja de lo ocupado)');
  ok(await ve(p.getByText('Lleno · no sale en tu página')), '«Lleno · no sale en tu página»');
  sql(`update class_groups set seats_outside = 0, seats_total = 4 where id = ${gL}`);

  // Abrir un grupo.
  await p.reload(); await p.getByText('GRUPOS ABIERTOS', { exact: true }).first().waitFor();
  await clic(p.getByRole('button', { name: 'Abrir un grupo' }).first());
  await p.getByText('ABRIR UN GRUPO').first().waitFor();
  await clic(p.getByRole('button', { name: 'Sáb', exact: true }));
  await (await vis(p.getByPlaceholder(/^(Lun|Mié|Sáb)/))).fill('Prueba sábado intensivo');
  await p.screenshot({ path: OUT + 'e4a-abrir-m.png', fullPage: true });
  await clic(p.getByRole('button', { name: 'Abrir el grupo' }));
  ok(await espera(() => sql(`select count(*) from class_groups where business_id = '${NEG}' and label->>'es' = 'Prueba sábado intensivo' and status = 'open'`) === '1'), 'grupo abierto en el servidor');
  ok(sql(`select dows::text || ':' || start_min || ':' || seats_total from class_groups where label->>'es' = 'Prueba sábado intensivo' and status = 'open'`) === '{1,3,6}:1140:10', 'con sus días, su hora y sus cupos');
  ok(AUD() >= a0 + 6, 'cada toque deja su línea en la auditoría');

  // Ver grupos › quitar el de prueba (nadie inscrito en la app).
  await p.goto(`${B}/panel/${NEG}/vendes/herramienta`); await p.getByText('GRUPOS ABIERTOS', { exact: true }).first().waitFor();
  await clic(p.getByRole('button', { name: 'Ver grupos' }).first());
  await p.getByText('INSCRITOS FUERA').first().waitFor();
  await p.screenshot({ path: OUT + 'e4a-grupos-m.png', fullPage: true });
  const nQ = await p.getByRole('button', { name: 'Quitar este grupo' }).count();
  await (await vis(p.getByText(/^Prueba sábado intensivo · empieza/i))).locator('xpath=following::*[@role="button"][contains(., "Quitar este grupo")][1]').click();
  ok(await espera(() => sql(`select status from class_groups where label->>'es' = 'Prueba sábado intensivo' order by id desc limit 1`) === 'cancelled'), `quitar el grupo (${nQ} se pueden quitar)`);

  // Editor de cursos: la matrícula tiene que ser menos que el precio.
  await p.goto(`${B}/panel/${NEG}/vendes/servicios`); await p.waitForLoadState('networkidle');
  await clic(p.getByRole('button', { name: /Agregar servicio|Nuevo servicio|Agregar/ }).first());
  await p.getByText('CÓMO LO COBRAS').first().waitFor();
  ok(!(await vis(p.getByText('TIEMPO ENTRE CITAS'))), 'un curso no pide «tiempo entre citas»');
  await (await vis(p.getByPlaceholder(/^Ej\./).first())).fill('Prueba inglés intensivo');
  await (await vis(p.getByLabel('HORAS EN TOTAL').or(p.getByPlaceholder('72')))).fill('32');
  await (await vis(p.getByLabel('MATRÍCULA · APARTA EL CUPO · OPCIONAL').or(p.getByPlaceholder('0').first()))).fill('500');
  await (await vis(p.getByLabel('PRECIO DEL CURSO COMPLETO').or(p.getByPlaceholder('0').last()))).fill('300');
  await clic(p.getByRole('button', { name: /^(Agregar|Guardar)$/ }).last());
  ok(await espera(async () => true) && sql(`select count(*) from items where business_id = '${NEG}' and name->>'es' = 'Prueba inglés intensivo' and removed_at is null`) === '0', 'matrícula $500 > precio $300: no se guarda');
  await p.screenshot({ path: OUT + 'e4a-curso-err-m.png', fullPage: true });
  ok(await ve(p.getByText(/tiene que ser menos que el precio/)), 'dice por qué');
  await (await vis(p.getByLabel('MATRÍCULA · APARTA EL CUPO · OPCIONAL').or(p.getByPlaceholder('0').first()))).fill('50');
  await clic(p.getByRole('button', { name: /^(Agregar|Guardar)$/ }).last());
  ok(await espera(() => sql(`select svc_kind || ':' || price_cents || ':' || deposit_cents || ':' || (svc_attrs->>'sem') || ':' || (svc_attrs->>'horas') from items where business_id = '${NEG}' and name->>'es' = 'Prueba inglés intensivo' and removed_at is null`) === 'curso:30000:5000:8:32'), 'curso guardado: $300, matrícula $50, 8 semanas, 32 h');

  // Escritorio y Super Admin 360 (solo lectura).
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); d.on('pageerror', (e) => err.push(e.message));
  await entrar(d, '5705550377'); await d.goto(`${B}/panel/${NEG}/vendes/herramienta`); await d.getByText('GRUPOS ABIERTOS', { exact: true }).first().waitFor();
  await d.screenshot({ path: OUT + 'e4a-herramienta-d.png', fullPage: true });
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); ad.on('pageerror', (e) => err.push(e.message));
  await entrar(ad, '5705550199'); await ad.goto(`${B}/admin/negocios/${NEG}?tab=vende`);
  ok(await espera(async () => true) && !!(await ad.getByText('GRUPOS Y CUPOS · SOLO LECTURA').first().waitFor().then(() => 1).catch(() => 0)), 'Super Admin 360: «Grupos y cupos» en solo lectura');
  ok(!!(await vis(ad.getByText(/Preparación para ciudadanía/).first())) && !!(await vis(ad.getByText(/matrícula \$55 · 3 pagos/).first())), 'el Super Admin ve cada curso con matrícula y plan');
  await ad.screenshot({ path: OUT + 'e4a-admin-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK edu4a');
})().catch((e) => { console.error(e); process.exit(1); });
