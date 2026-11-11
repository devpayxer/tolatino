// 4eg · Super Admin de Educación, Niños y Deporte: Transacciones › Inscripciones y «Devolver matrícula»; Colas «Cuidado de niños» (de la
// ayuda de ayu4f; ver los datos del niño con motivo y auditoría), «No me dejan cancelar» (la ayuda «salir» escalada) y «Grupos que no
// abrieron» (3 cancelados en 90 días; revisado); Analítica › Educación · Niños · Deporte.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const EDU = 'ingles-para-todos', NIN = 'guarderia-mis-angelitos';
(async () => {
  const b = await chromium.launch(); const err = [];
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(ad, '5705550199');
  ad.on('pageerror', (e) => err.push(e.message));

  // ── Transacciones › Inscripciones ──
  await ad.goto(B + '/admin/transacciones?tab=insc');
  ok(await espera(ad.getByText(/^Inscripción I-\d+ · /).first()), 'pestaña Inscripciones con inscripciones');
  ok(await espera(ad.getByText(/Educación · Preparación para ciudadanía/).first()), 'dice el rubro y el curso');
  ok(!(await ad.content()).includes('Valentina'), 'nunca el nombre de un niño en Transacciones');
  await ad.screenshot({ path: OUT + 'g4g-tx-d.png', fullPage: true });
  const I = sql(`select o.number from operations o join payments p on p.operation_id = o.id and p.kind = 'deposit' where o.kind = 'enrollment' and p.status in ('captured', 'partially_refunded') and p.amount_cents - p.refunded_cents >= 1000 order by o.id desc limit 1`);
  ok(/^I-\d+$/.test(I), `una matrícula cobrada para devolver: ${I}`);
  const R0 = Number(sql(`select refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${I}' and p.kind = 'deposit'`));
  await ad.goto(B + `/admin/transacciones?tab=insc&q=${I}`); await ad.getByText(new RegExp(`Inscripción ${I}`)).first().waitFor();
  await clic(ad.getByRole('button', { name: 'Devolver' }));
  ok(await espera(ad.getByText(`Devolver matrícula · inscripción ${I}`)), 'título «Devolver matrícula · inscripción»');
  const monto = await vis(ad.getByLabel(/MONTO EN DÓLARES/)) ?? await vis(ad.locator('input').last()); await monto.fill('10');
  await clic(ad.getByText('No entregaron el certificado prometido.')); await clic(ad.getByRole('button', { name: 'Devolver', exact: true }).last());
  ok(await espera(ad.getByText(/Devueltos \$10\.00/)), 'Devolver desde el Super Admin funciona en una inscripción');
  ok(Number(sql(`select refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${I}' and p.kind = 'deposit'`)) === R0 + 1000, '$10 exactos más devueltos');
  ok(sql(`select count(*) from audit_entries where action = 'transacciones.devolver' and after->>'inscripcion' = '${I}'`) !== '0', 'queda en la auditoría como inscripción');

  // ── Colas › Cuidado de niños ──
  const QC = sql(`select q.id from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id where q.queue = 'cuidado' and q.status = 'open' and h.business_id = '${NIN}' order by q.id desc limit 1`);
  ok(/^\d+$/.test(QC), `la ayuda «No cuidaron bien a mi niño» abrió un caso en «Cuidado de niños» (${QC})`);
  ok(sql(`select count(*) from queue_items q where q.queue = 'sop' and q.subject_id = (select subject_id from queue_items where id = ${QC})`) === '0', 'no se duplica en «Ayuda con pedidos y citas»');
  await ad.goto(B + '/admin/colas'); ok(await espera(ad.getByText(/Cuidado de niños · Guardería Mis Angelitos/).first()), 'sale primero en Colas');
  await ad.goto(B + `/admin/colas?cola=cuidado&caso=${QC}`); await ad.getByText('INSCRIPCIÓN').first().waitFor();
  ok(await espera(ad.getByText(/No cuidaron bien a su niño/).first()), 'el caso dice el motivo con su nombre');
  ok(!(await ad.content()).includes('Valentina'), 'el caso no muestra los datos del niño sin pedirlos');
  await ad.screenshot({ path: OUT + 'g4g-cuidado-d.png', fullPage: true });
  const a0 = Number(sql(`select count(*) from audit_entries where action = 'nino.ver' and target_id = '${QC}'`));
  await clic(ad.getByRole('button', { name: 'Ver los datos del niño' }));
  await clic(ad.getByText('Para hablar con el lugar sobre lo que pasó con este niño.'));
  await clic(ad.getByRole('button', { name: 'Ver los datos', exact: true }));
  ok(await espera(ad.getByText(/Valentina · 4 años/).first()), 'con motivo, se ven los datos del niño');
  ok(Number(sql(`select count(*) from audit_entries where action = 'nino.ver' and target_id = '${QC}' and reason is not null`)) === a0 + 1, 'y queda en la auditoría con el motivo');

  // ── Colas › No me dejan cancelar (la ayuda «salir» que el gimnasio no respondió en 24 h) ──
  // Re-corrida: si ayu4f no dejó una ayuda «salir» abierta, se reabre la última (la prueba arma su propio punto de partida).
  if (sql(`select count(*) from help_requests where reason = 'salir' and status = 'open'`) === '0') sql(`update help_requests set status = 'open', escalated_at = null, escalated_by = null, resolution = null where id = (select max(id) from help_requests where reason = 'salir')`);
  sql(`update help_requests set created_at = now() - interval '25 hours' where reason = 'salir' and status = 'open'`);
  await ad.goto(B + '/admin/colas'); // escalarVencidas corre al abrir las ayudas; se fuerza con el barrido
  execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`);
  const QS = sql(`select id from queue_items where queue = 'salir' and status = 'open' order by id desc limit 1`);
  ok(/^\d+$/.test(QS), `la ayuda «No me dejan cancelar» sin respuesta pasó a su cola (${QS})`);
  await ad.goto(B + `/admin/colas?cola=salir&caso=${QS}`); ok(await espera(ad.getByText(/No lo dejan cancelar/).first()), 'el caso dice el motivo');
  await clic(ad.getByRole('button', { name: 'Resolver con un mensaje' })); await (await vis(ad.locator('textarea').last())).fill('Hablamos con el gimnasio: tu membresía quedó cancelada en la fecha que la pediste.');
  await clic(ad.getByRole('button', { name: 'Resolver', exact: true }).last());
  ok(await espera(ad.getByText(/Resuelta/).first()), 'resuelta desde la cola');
  ok(sql(`select status from queue_items where id = ${QS}`) === 'decided', 'el caso queda decidido');

  // ── Colas › Grupos que no abrieron (3 en 90 días) ──
  sql(`update queue_items set status = 'decided', decision = 'revisado' where queue = 'grupo' and subject_id = '${EDU}' and status = 'open'`);
  const IT = sql(`select id from items where business_id = '${EDU}' and name->>'es' = 'Conversación' and removed_at is null`);
  for (let i = 0; i < 2; i++) sql(`insert into class_groups (business_id, city_id, item_id, label, starts_on, dows, start_min, seats_total, status, cancel_reason) select i.business_id, b.city_id, i.id, '{"es":"Prueba cancelado ${i}","en":"Test cancelled ${i}"}', current_date + 10, '{2}', 1080, 8, 'cancelled', 'Prueba: pocos alumnos' from items i join businesses b on b.id = i.business_id where i.id = ${IT}`);
  const G = sql(`insert into class_groups (business_id, city_id, item_id, label, starts_on, dows, start_min, seats_total) select i.business_id, b.city_id, i.id, '{"es":"Prueba 4eg","en":"Test 4eg"}', current_date + 12, '{4}', 1080, 8 from items i join businesses b on b.id = i.business_id where i.id = ${IT} returning id`).split('\n')[0];
  const ed = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(ed, '5705550377'); ed.on('pageerror', (e) => err.push(e.message));
  await ed.goto(B + `/panel/${EDU}/vendes/inscripciones`); await ed.getByText('GRUPOS').first().waitFor();
  await clic(ed.getByText(/Conversación · Prueba 4eg/)); await clic(ed.getByRole('button', { name: 'El grupo no abre' }));
  await (await vis(ed.getByPlaceholder(/no se completó/))).fill('No se completó el mínimo de alumnos');
  await clic(ed.getByRole('button', { name: 'Sí, cancelar y devolver a todos' }));
  for (let i = 0; i < 40 && sql(`select status from class_groups where id = ${G}`) !== 'cancelled'; i++) await new Promise((r) => setTimeout(r, 250));
  const QG = sql(`select id from queue_items where queue = 'grupo' and subject_id = '${EDU}' and status = 'open'`);
  ok(/^\d+$/.test(QG), `3 grupos cancelados en 90 días abren «Grupos que no abrieron» (${QG})`);
  await ad.goto(B + `/admin/colas?cola=grupo&caso=${QG}`); await ad.getByText('CADA GRUPO').first().waitFor();
  ok(await espera(ad.getByText(/Conversación · Prueba 4eg/).first()), 'el caso lista cada grupo con su motivo');
  await ad.screenshot({ path: OUT + 'g4g-grupo-d.png', fullPage: true });
  await clic(ad.getByRole('button', { name: 'Revisado, sin cambios' })); await clic(ad.getByText('A todos se les devolvió completo.'));
  await clic(ad.getByRole('button', { name: 'Cerrar el caso' }));
  ok(await espera(ad.getByText(/Caso cerrado como revisado/).first()), 'revisado, sin cambios');

  // ── Analítica › Educación · Niños · Deporte ──
  await ad.goto(B + '/admin/analitica?tab=en'); await ad.getByText('INSCRIPCIONES PEDIDAS').first().waitFor();
  ok(await espera(ad.getByText('CONFIRMADAS EN 24 H').first()) && await espera(ad.getByText('GRUPOS QUE NO ABRIERON').first()) && await espera(ad.getByText('GUARDERÍAS CON LICENCIA VIGENTE').first()), 'Analítica con sus cifras');
  ok(await espera(ad.getByText(/Niños · No cuidaron bien a su niño/).first()), 'los motivos de ayuda por rubro');
  ok(!(await ad.content()).includes('Valentina'), 'nunca datos de un niño en Analítica');
  await ad.screenshot({ path: OUT + 'g4g-analitica-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK adm4eg');
})().catch((e) => { console.error(e); process.exit(1); });
