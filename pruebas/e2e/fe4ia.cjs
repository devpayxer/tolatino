// 4ia · Iglesias: «Horarios y ayuda» (misa: atajos, al menos una, otro horario, bilingüe, ayuda gratis, catecismo), «La ayuda de hoy»
// (Se acabó por hoy → se apaga solo al cambiar el día), «Precios y repatriación» (precio total en el ítem, días), editor de servicios
// («Donativo sugerido»), sin depósito en la base, la tarjeta y los filtros, y el Super Admin 360 en solo lectura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', NEG = 'parroquia-santa-maria', DES = 'despensa-manos-unidas', FUN = 'funeraria-la-paz', CUL = 'iglesia-fuente-de-vida';
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
const espera = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const wt = () => sql(`select string_agg(dow || ':' || start_min, ',' order by dow, start_min) from worship_times where business_id = '${NEG}' and removed_at is null and kind = 'misa'`);
(async () => {
  // Punto de partida conocido (lo de la semilla).
  sql(`update worship_times set removed_at = now() where business_id = '${NEG}' and removed_at is null`);
  sql(`insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) values ('${NEG}', 'hzl', 6, 1080, '{"es":"Misa en español","en":"Spanish mass"}', 'es', 'misa', 0), ('${NEG}', 'hzl', 0, 720, '{"es":"Misa en español","en":"Spanish mass"}', 'es', 'misa', 1)`);
  sql(`update fe_settings set bil = false, help = '{despensa,jovenes,bodas}', catequesis_open = true, derived_on = null where business_id = '${NEG}'`);
  sql(`update fe_settings set out_today_on = null, freq = 'semana', sinid = true, help = '{despensa,ropa}', derived_on = null where business_id = '${DES}'`);
  sql(`update fe_settings set h24 = true, plan_n = 12, rep_days = '5–7', derived_on = null where business_id = '${FUN}'`);
  sql(`update items set price_cents = 680000 where business_id = '${FUN}' and name->>'es' = 'Servicio funerario completo'`);
  sql(`update items set removed_at = now() where business_id = '${NEG}' and name->>'es' = 'Bendición de la casa' and removed_at is null`);
  sql(`update fe_settings set derived_on = null`);
  barrer();
  ok(sql(`select coalesce(last_error, 'ok') from system_jobs where name = 'barrido.fe' and last_run_at > now() - interval '1 minute'`) === 'ok', 'la tarea «fe» corre en el barrido central');
  ok(sql(`select count(*) from fe_settings where derived_on is distinct from (now() at time zone 'America/New_York')::date`) === '0', 'el barrido derivó los 19 lugares');
  let f = fv(); ok(/misaesp/.test(f) && /\besp\b/.test(f) && /despensa/.test(f) && /jovenes/.test(f) && /bodas/.test(f) && /catolica/.test(f) && /y10/.test(f) && !/bil/.test(f), `filtros derivados (catolica y y10 se conservan): ${f}`);
  ok(tj().eta?.es === 'Misa en español: domingo 12 PM y sábado 6 PM' && tj().fee?.es === 'Catecismo: inscripciones abiertas', `tarjeta: ${tj().eta?.es} | ${tj().fee?.es}`);
  ok(tj(CUL).eta?.es === 'Culto: domingo 11 AM · Jóvenes: viernes 7 PM' && tj(CUL).fee?.es === 'Transporte gratis los domingos', `culto: ${tj(CUL).eta?.es} | ${tj(CUL).fee?.es}`);
  ok(tj(DES).eta?.es === 'Sin papeles ni cita' && tj(DES).fee?.es === 'Una caja por familia a la semana' && /sinid/.test(fv(DES)) && /ropa/.test(fv(DES)), `despensa: ${tj(DES).eta?.es} | ${tj(DES).fee?.es}`);
  ok(tj(FUN).eta?.es === 'Repatriación a RD en 5–7 días' && /repatria/.test(fv(FUN)) && /24h/.test(fv(FUN)), `funeraria: ${tj(FUN).eta?.es} · ${fv(FUN)}`);
  ok(/24h/.test(fv('linea-oracion-luz-del-valle')) && !/esp/.test(fv('sinagoga-beth-shalom')), 'la línea de oración conserva 24h; la sinagoga (otro idioma) no sale «en español»');
  ok(sql(`select count(*) from items i join businesses b on b.id = i.business_id where b.category_id = 'NEG-FE' and coalesce(i.deposit_cents, 0) <> 0`) === '0', 'ningún ítem de Iglesias tiene depósito');

  const b = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_TUNNEL_CONNECTION_FAILED/.test(m.text())) err.push('console: ' + m.text()); }); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(p);
  await entrar(p, '5705550422');
  await p.goto(`${B}/panel/${NEG}/vendes`);
  const fila = await vis(p.getByText('Horarios y ayuda', { exact: true })); ok(!!fila, 'Lo que vendes › «Horarios y ayuda» (Padre Luis)');
  ok(!(await vis(p.getByText('Citas', { exact: true }))), 'Iglesias no muestra el módulo de citas');
  await fila.click(); await p.getByText('MISA EN ESPAÑOL', { exact: true }).first().waitFor();
  ok(await ve(p.getByText('Nadie pregunta tu estatus')) && await ve(p.getByText('La ayuda es gratis')), 'reglas con candado');
  await p.screenshot({ path: OUT + 'f4ia-horarios-m.png', fullPage: true });
  // Atajo: prender Dom 8 AM.
  await clic(p.getByRole('button', { name: 'Dom 8 AM', exact: true }));
  ok(await espera(() => wt() === '0:480,0:720,6:1080'), 'Dom 8 AM → fila en worship_times');
  ok(await ve(p.getByText('Guardado · tu página ya lo dice.')), 'dice «Guardado»');
  ok(await espera(() => tj().eta?.es === 'Misa en español: domingo 8 AM, domingo 12 PM y sábado 6 PM'), `la tarjeta lo dice: ${tj().eta?.es}`);
  // Al menos una misa.
  await clic(p.getByRole('button', { name: 'Dom 8 AM', exact: true })); await espera(() => wt() === '0:720,6:1080');
  await clic(p.getByRole('button', { name: 'Sáb 6 PM', exact: true })); ok(await espera(() => wt() === '0:720'), 'apagar Dom 8 AM y Sáb 6 PM');
  await clic(p.getByRole('button', { name: 'Dom 12 PM', exact: true }));
  ok(await ve(p.getByText('Deja al menos una misa.')) && wt() === '0:720', 'la última misa no se apaga');
  await clic(p.getByRole('button', { name: 'Sáb 6 PM', exact: true })); ok(await espera(() => wt() === '0:720,6:1080'), 'Sáb 6 PM otra vez');
  // Bilingüe, ayuda gratis y catecismo.
  await clic(p.getByRole('switch', { name: 'También en inglés' }));
  ok(await espera(() => /\bbil\b/.test(fv())), 'también en inglés → filtro bil');
  await clic(p.getByRole('switch', { name: 'Ropa' }));
  ok(await espera(() => /ropa/.test(fv()) && sql(`select help from fe_settings where business_id = '${NEG}'`) === '{despensa,ropa,jovenes,bodas}'), 'ayuda gratis: ropa → filtro ropa');
  await clic(p.getByRole('switch', { name: 'Catecismo · inscripciones abiertas' }));
  ok(await espera(() => tj().fee?.es === 'Catecismo: inscripciones cerradas'), `catecismo cerrado: ${tj().fee?.es}`);
  await clic(p.getByRole('switch', { name: 'Catecismo · inscripciones abiertas' }));
  ok(await espera(() => tj().fee?.es === 'Catecismo: inscripciones abiertas'), 'catecismo abierto otra vez');
  ok(Number(sql(`select count(*) from audit_entries where action = 'fe.herramienta' and target_id = '${NEG}' and at > now() - interval '5 minutes'`)) >= 8, 'cada toque deja su línea en la auditoría');
  // Otro horario: jóvenes el viernes.
  await clic(p.getByRole('button', { name: 'Agregar', exact: true }));
  await p.getByText('Otro horario', { exact: true }).first().waitFor();
  await clic(p.getByRole('button', { name: 'Vie', exact: true }));
  for (let i = 0; i < 36; i++) await clic(p.getByRole('button', { name: 'Hora +' }));
  await (await vis(p.getByPlaceholder('Ej. Jóvenes, Estudio bíblico'))).fill('Jóvenes');
  await clic(p.getByRole('button', { name: 'Grupo', exact: true }));
  await p.screenshot({ path: OUT + 'f4ia-otro-m.png', fullPage: true });
  await clic(p.getByRole('button', { name: /^Agregar$/ }).last());
  ok(await espera(() => sql(`select count(*) from worship_times where business_id = '${NEG}' and removed_at is null and dow = 5 and start_min = 1140 and kind = 'grupo' and label->>'es' = 'Jóvenes'`) === '1'), 'otro horario: Jóvenes viernes 7 PM');
  ok(await espera(() => tj().eta?.es === 'Misa en español: domingo 12 PM y sábado 6 PM · Jóvenes: viernes 7 PM'), `tarjeta con el grupo: ${tj().eta?.es}`);

  // Servicios: «Donativo sugerido».
  await p.goto(`${B}/panel/${NEG}/vendes/servicios`); await p.waitForLoadState('networkidle');
  ok(await ve(p.getByText('Gratis', { exact: true })) && await ve(p.getByText('Donativo $50', { exact: true })), 'la lista dice «Gratis» y «Donativo $50»');
  await clic(p.getByRole('button', { name: /^Agregar$/ }).first());
  await p.getByText('CÓMO SE DA').first().waitFor();
  ok(!(await vis(p.getByText('TIEMPO ENTRE CITAS'))) && !(await vis(p.getByText('Precio total por escrito', { exact: true }))), 'sin «tiempo entre citas» y sin «precio total» (no es funeraria)');
  await (await vis(p.getByPlaceholder(/^Ej\./).first())).fill('Bendición de la casa');
  await clic(p.getByRole('button', { name: 'Donativo sugerido', exact: true }));
  await (await vis(p.getByPlaceholder('Ej. Con cita · 1 hora'))).fill('Con cita · 30 minutos');
  await (await vis(p.getByPlaceholder('0').last())).fill('25');
  await p.screenshot({ path: OUT + 'f4ia-servicio-m.png', fullPage: true });
  ok(await ve(p.getByText('Donativo sugerido · si no puedes, no se cobra.')), 'el editor dice «si no puedes, no se cobra»');
  await clic(p.getByRole('button', { name: /^(Agregar|Guardar)$/ }).last());
  const it = () => sql(`select svc_kind || ':' || price_cents || ':' || deposit_cents || ':' || (svc_attrs->>'fe') || ':' || (svc_attrs->'dur'->>'es') from items where business_id = '${NEG}' and name->>'es' = 'Bendición de la casa' and removed_at is null`);
  ok(await espera(() => it() === 'clase:2500:0:don:Con cita · 30 minutos'), `servicio guardado con donativo $25 y sin depósito: ${it()}`);
  let mal = false; try { sql(`update items set deposit_cents = 500 where business_id = '${NEG}' and name->>'es' = 'Bendición de la casa' and removed_at is null`); } catch { mal = true; }
  ok(mal && it() === 'clase:2500:0:don:Con cita · 30 minutos', 'la base rechaza un depósito en Iglesias (trigger)');

  // Escritorio: la herramienta.
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(d);
  await entrar(d, '5705550422'); await d.goto(`${B}/panel/${NEG}/vendes/herramienta`); await d.getByText('MISA EN ESPAÑOL', { exact: true }).first().waitFor();
  await d.screenshot({ path: OUT + 'f4ia-horarios-d.png', fullPage: true });

  // Despensa y funeraria (Padre Luis las administra en esta prueba).
  for (const n of [DES, FUN]) sql(`insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select '${n}', u.id, 'owner', 'Padre Luis Herrera', '{"es":"Prueba","en":"Test"}'::jsonb, 'active', false, '{all}', 2020, 9, true from users u where u.phone = '+15705550422' and not exists (select 1 from business_members m where m.business_id = '${n}' and m.user_id = u.id)`);
  await p.goto(`${B}/panel/${DES}/vendes/herramienta`); await p.getByText('La ayuda de hoy', { exact: true }).first().waitFor();
  await clic(p.getByRole('switch', { name: 'Se acabó por hoy' }));
  ok(await espera(() => sql(`select out_today_on = (now() at time zone 'America/New_York')::date from fe_settings where business_id = '${DES}'`) === 't' && tj(DES).eta?.es === 'Se acabó por hoy'), `«Se acabó por hoy»: ${tj(DES).eta?.es}`);
  await clic(p.getByRole('button', { name: 'Cada 15 días', exact: true }));
  ok(await espera(() => tj(DES).fee?.es === 'Una caja por familia cada 15 días'), `cada 15 días: ${tj(DES).fee?.es}`);
  await p.screenshot({ path: OUT + 'f4ia-despensa-m.png', fullPage: true });
  // Pasa la medianoche de la ciudad: el barrido lo apaga solo.
  sql(`update fe_settings set out_today_on = out_today_on - 1, derived_on = derived_on - 1 where business_id = '${DES}'`);
  barrer();
  ok(await espera(() => tj(DES).eta?.es === 'Sin papeles ni cita'), `al día siguiente vuelve «Sin papeles ni cita»: ${tj(DES).eta?.es}`);
  await p.goto(`${B}/panel/${FUN}/vendes/herramienta`); await p.getByText('Precios y repatriación', { exact: true }).first().waitFor();
  await clic(p.getByRole('button', { name: 'Servicio funerario completo +' }));
  ok(await espera(() => sql(`select price_cents from items where business_id = '${FUN}' and name->>'es' = 'Servicio funerario completo'`) === '690000'), 'precio total +$100 → el ítem dice $6,900');
  await clic(p.getByRole('button', { name: '3–5 días', exact: true }));
  ok(await espera(() => tj(FUN).eta?.es === 'Repatriación a RD en 3–5 días'), `repatriación: ${tj(FUN).eta?.es}`);
  await clic(p.getByRole('switch', { name: 'Las 24 horas' }));
  ok(await espera(() => !/24h/.test(fv(FUN))), 'sin 24 horas → sin el filtro');
  await p.screenshot({ path: OUT + 'f4ia-funeraria-m.png', fullPage: true });
  await clic(p.getByRole('switch', { name: 'Las 24 horas' })); await espera(() => /24h/.test(fv(FUN)));

  // Super Admin 360 (solo lectura).
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(ad);
  await entrar(ad, '5705550199'); await ad.goto(`${B}/admin/negocios/${NEG}?tab=vende`);
  ok(await ve(ad.getByText('HORARIOS Y AYUDA · SOLO LECTURA')) && await ve(ad.getByText(/Misa en español: Dom 12 PM · Vie 7 PM · Sáb 6 PM · también en inglés · 4 ayudas gratis/)), 'Super Admin 360: «Horarios y ayuda» con su resumen');
  ok(await ve(ad.getByText('La ayuda de la iglesia es gratis; nunca se cobra por despensa, ropa ni oración.')), 'la línea fija en el 360');
  ok(await ve(ad.getByText(/Donativo sugerido \$25/)) && await ve(ad.getByText(/Curso · 60 semanas · Donativo sugerido \$60/)), 'el 360 dice la forma de cada servicio (donativo, curso), nunca un cobro');
  await ad.screenshot({ path: OUT + 'f4ia-admin-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK fe4ia');
})().catch((e) => { console.error(e); process.exit(1); });
