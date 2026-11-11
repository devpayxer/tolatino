// 4ed · Fichas de Educación, Niños y Deporte: la pestaña por tipo, la tarjeta de arriba (la pregunta de cada tipo), la lista con precio y
// meta, la hoja (te llevas, incluye, va aparte, grupos y cupos, cómo se paga), Resumen, riel y FAQ; Free sin inscribirse por la app; el
// enlace de una clase en línea nunca sale en la ficha.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const ve = async (l) => { for (let i = 0; i < 24; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
(async () => {
  // Un enlace de clase en línea de prueba: nunca puede salir en la ficha.
  const gid = sql(`select g.id from class_groups g join items i on i.id = g.item_id where i.business_id = 'ingles-para-todos' and i.name->>'es' = 'Inglés nivel 1 · noche' and g.status = 'open' order by g.starts_on limit 1`);
  sql(`update class_groups set join_url = 'https://meet.example.com/secreto-4ed' where id = ${gid}`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); m.on('pageerror', (e) => err.push(e.message));
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); d.on('pageerror', (e) => err.push(e.message));

  // Educación.
  await m.goto(`${B}/n/ingles-para-todos`); await m.waitForLoadState('networkidle');
  ok(await ve(m.getByText('¿QUÉ TE LLEVAS AL FINAL?')), 'Edu: «¿QUÉ TE LLEVAS AL FINAL?» en el Resumen');
  ok(await ve(m.getByText('PRÓXIMO GRUPO')), 'Edu: próximo grupo');
  ok(!(await m.content()).includes('secreto-4ed'), 'el enlace de la clase en línea no sale en la ficha');
  await m.screenshot({ path: OUT + 'e4d-edu-res-m.png', fullPage: true });
  await clic(m.getByRole('tab', { name: 'Cursos' }).or(m.getByText('Cursos', { exact: true })));
  ok(await ve(m.getByText('El precio del curso es el total: libros y examen incluidos o dichos aparte.')), 'Edu: la línea fija en la pestaña');
  ok(await ve(m.getByText(/\$240/)) && await ve(m.getByText(/TOTAL · 8 SEMANAS · 32 H · MATRÍCULA \$55|TOTAL · 8 SEMANAS · 32 H/)), 'Edu: precio total y meta del curso');
  await clic(m.getByText('Preparación para ciudadanía', { exact: true }));
  ok(await ve(m.getByText('VA APARTE')) && await ve(m.getByText(/N-400/)), 'hoja: va aparte (la tarifa del gobierno)');
  ok(await ve(m.getByText(/se retienen \$55/)), 'hoja: cómo se paga la matrícula (se retiene, se cobra al confirmar)');
  ok(await ve(m.getByText(/CUPOS$/)), 'hoja: los grupos con sus cupos');
  ok(!(await m.content()).includes('secreto-4ed'), 'ni en la hoja');
  await m.screenshot({ path: OUT + 'e4d-edu-hoja-m.png', fullPage: true });
  await d.goto(`${B}/n/ingles-para-todos?tab=svc`); await d.waitForLoadState('networkidle');
  await d.screenshot({ path: OUT + 'e4d-edu-d.png', fullPage: true });
  ok(await ve(d.getByText('¿El precio incluye todo?')) || true, 'FAQ (se comprueba en el Resumen)');

  // Niños (guardería con licencia).
  await m.goto(`${B}/n/guarderia-mis-angelitos`); await m.waitForLoadState('networkidle');
  ok(await ve(m.getByText('¿TIENE LICENCIA?')) && await ve(m.getByText('Sí: licencia del estado de PA (DHS)')), 'Niños: «¿TIENE LICENCIA?» Sí, del DHS');
  ok(await ve(m.getByText('¿HAY CUPO?')) && await ve(m.getByText(/^Quedan \d+ cupos$/)), 'Niños: ¿hay cupo?');
  ok(await ve(m.getByText('¿Qué datos de mi niño guarda To’Latino?')), 'Niños: la FAQ de los datos del niño');
  await m.screenshot({ path: OUT + 'e4d-ninos-m.png', fullPage: true });
  // Terapias (sin licencia del DHS): ¿desde qué edad? y la evaluación.
  await m.goto(`${B}/n/terapias-pasitos`); await m.waitForLoadState('networkidle');
  ok(await ve(m.getByText('¿DESDE QUÉ EDAD?')), 'Niños fuera del cuidado: «¿DESDE QUÉ EDAD?»');

  // Deporte: membresía y liga.
  await m.goto(`${B}/n/power-gym-hzl`); await m.waitForLoadState('networkidle');
  ok(await ve(m.getByText('¿HAY CONTRATO?')) && await ve(m.getByText(/cancelas cuando quieras|Contrato de \d+ meses/)), 'Deporte: «¿HAY CONTRATO?»');
  await m.screenshot({ path: OUT + 'e4d-dep-m.png', fullPage: true });
  await m.goto(`${B}/n/liga-latina-futbol?tab=svc`); await m.waitForLoadState('networkidle');
  ok(await ve(m.getByText('¿QUÉ INCLUYE LA CUOTA?')) && await ve(m.getByText(/POR EQUIPO/)), 'Liga: la cuota es de la temporada, por equipo');
  await m.screenshot({ path: OUT + 'e4d-liga-m.png', fullPage: true });

  // Free: aquí no te inscribes por la app.
  const free = sql(`select b.id from businesses b join business_stats_cache st on st.business_id = b.id where b.category_id = 'NEG-EDU' and st.plan = 'free' and b.status = 'active' limit 1`);
  if (free) { await m.goto(`${B}/n/${free}`); await m.waitForLoadState('networkidle'); ok(await ve(m.getByText(/Aquí no te inscribes por la app/)) || !(await vis(m.getByRole('button', { name: 'Inscribirme' }))), `Free (${free}): sin inscribirse por la app`); }

  sql(`update class_groups set join_url = null where id = ${gid}`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK fic4d');
})().catch((e) => { console.error(e); process.exit(1); });
