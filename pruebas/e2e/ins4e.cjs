// 4ee · Inscribirse: matrícula retenida → confirmar y cobrar · no hay cupo → liberar · vence → liberar · otro grupo aceptado → cobrar ·
// cancelar antes de empezar → devolver · después → se queda · el grupo no abre → devolución a todos · plan por escrito · niños (datos
// cifrados, solo en el panel con auditoría, nunca en avisos) · membresía con baja pedida → confirmada · lista de espera → oferta → inscrito ·
// primera clase gratis una vez · tres familias por el último cupo → una.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { const x = await vis(l); if (!x) throw new Error('no visible: ' + l); await x.click(); };
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const pay = (num) => sql(`select coalesce(string_agg(p.status || ':' || p.amount_cents || ':' || p.refunded_cents, ','), 'none') from payments p join operations o on o.id = p.operation_id where o.number = '${num}'`);
const st = (num) => sql(`select status || coalesce(':' || status_detail, '') from operations where number = '${num}'`);
const booked = (g) => Number(sql(`select seats_booked from class_groups where id = ${g}`));
const EDU = 'ingles-para-todos', NIN = 'guarderia-mis-angelitos', GYM = 'power-gym-hzl';
const CIU = sql(`select id from items where business_id = '${EDU}' and name->>'es' = 'Preparación para ciudadanía' and removed_at is null`);
// 9b-1 · El curso como lo prueba esta prueba: matrícula de $55 y plan de 3 pagos (antes lo daba por hecho: era lo que dejaba edu4a, que
// en una base nueva corre después y además empieza poniéndolo en $50 sin plan).
sql(`update items set deposit_cents = 5500, svc_attrs = svc_attrs || '{"dep":5500,"plan_n":3}'::jsonb where id = ${CIU}`);
const CONV = sql(`select id from items where business_id = '${EDU}' and name->>'es' = 'Conversación' and removed_at is null`);
const GUARD = sql(`select id from items where business_id = '${NIN}' and svc_kind = 'semana' and removed_at is null limit 1`);
const MEMB = sql(`select id from items where business_id = '${GYM}' and name->>'es' = 'Membresía sin contrato' and removed_at is null`);

async function inscribir(p, neg, svc, o = {}) {
  await p.goto(`${B}/n/${neg}/inscribirme?svc=${svc}${o.q ?? ''}`); await p.getByText(/^(¿PARA QUIÉN ES\?|TU NIÑO O NIÑA|NOTA · OPCIONAL)$/).first().waitFor();
  if (o.hijo) {
    if (await vis(p.getByText('Para mi hijo o hija'))) await clic(p.getByText('Para mi hijo o hija'));
    await (await vis(p.getByLabel('Nombre de pila'))).fill(o.hijo.nombre);
    await (await vis(p.getByLabel('Edad'))).selectOption(String(o.hijo.edad));
    await clic(p.getByRole('checkbox', { name: /Soy su mamá/ }));
  }
  if (o.nota) await (await vis(p.getByLabel('Nota'))).fill(o.nota);
  await clic(p.getByRole('button', { name: 'Continuar' }));
  if (o.grupo) await clic(p.locator(`button[role="radio"]`).filter({ hasText: o.grupo }));
  else if (!(await vis(p.locator('button[role="radio"][aria-checked="true"]')))) { const r = await vis(p.locator('button[role="radio"]:not([disabled])')); if (r) await r.click(); }
  await clic(p.getByRole('button', { name: 'Continuar' }));
  await p.getByText('BUENO SABER').first().waitFor();
  if (o.plan) { await clic(p.getByRole('switch', { name: 'Plan de pagos' })); await clic(p.getByRole('checkbox', { name: /Acepto este plan/ })); }
  if (o.shot) await p.screenshot({ path: OUT + o.shot, fullPage: true });
  await clic(p.getByRole('button', { name: 'Enviar solicitud' }));
  await p.waitForURL(/\/insc\/I-\d+/, { timeout: 15000 });
  return p.url().match(/I-\d+/)[0];
}
(async () => {
  // Punto de partida: sin inscripciones vivas de prueba; cupos limpios; un segundo grupo de Ciudadanía para «otro grupo».
  sql(`update operations set status = 'cancelled', cancelled_by = 'system' where kind = 'enrollment' and status in ('pending', 'change_proposed', 'confirmed')`);
  sql(`update waitlist_entries set status = 'left' where status in ('waiting', 'offered')`);
  sql(`update class_groups set seats_booked = 0 where business_id in ('${EDU}', '${NIN}', '${GYM}')`);
  const G1 = sql(`select id from class_groups where item_id = ${CIU} and status in ('open','started') order by starts_on limit 1`);
  sql(`update class_groups set status = 'open', starts_on = current_date + 20, ends_on = current_date + 80, seats_total = 12 + seats_booked, seats_outside = 0 where id = ${G1}`);
  let G2 = sql(`select id from class_groups where item_id = ${CIU} and id <> ${G1} and label->>'es' = 'Prueba Sáb 9 AM' limit 1`);
  if (!G2) G2 = sql(`insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, dur_min, seats_total) select business_id, city_id, item_id, '{\"es\":\"Prueba Sáb 9 AM\",\"en\":\"Prueba Sat 9 AM\"}', current_date + 27, current_date + 87, '{6}', 540, 120, 10 from class_groups where id = ${G1} returning id`).split('\n')[0];
  sql(`update class_groups set status = 'open', starts_on = current_date + 27, ends_on = case when ends_on is null then null else greatest(ends_on, current_date + 90) end, seats_total = 10, seats_outside = 0, seats_booked = 0 where id = ${G2}`);
  const GC = sql(`select id from class_groups where item_id = ${CONV} and status in ('open','started') order by starts_on limit 1`);
  sql(`update class_groups set status = 'open', starts_on = current_date + 5, ends_on = case when ends_on is null then null else greatest(ends_on, current_date + 60) end, seats_total = 10 + seats_booked, seats_outside = 0 where id = ${GC}`);
  sql(`update items set svc_attrs = svc_attrs || '{\"g1\":true}'::jsonb where id = ${CONV}`);
  sql(`update care_openings set openings = 3 where business_id = '${NIN}' and removed_at is null`);
  sql(`update users set first_name = coalesce(nullif(first_name, ''), 'Prueba') where phone in ('+15705550299', '+15705550288', '+15705550122')`);
  const b = await chromium.launch(); const err = [];
  const ctx = async (tel, w = 390) => { const p = await (await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: w < 500 ? 2 : 1 })).newPage(); p.on('pageerror', (e) => err.push(e.message)); await entrar(p, tel); return p; };
  const cli = await ctx('5705550122'), edu = await ctx('5705550377'), nin = await ctx('5705550388'), gym = await ctx('5705550411');

  // 0 · La hoja de la ficha lleva a inscribirse (Pro).
  await cli.goto(`${B}/n/${EDU}?tab=svc`); await clic(cli.getByText('Preparación para ciudadanía', { exact: true }));
  await clic(cli.getByRole('dialog').getByRole('button', { name: 'Inscribirme' }));
  await cli.waitForURL(/\/inscribirme\?svc=/); ok(true, 'la hoja del curso lleva a «Inscribirme»');

  // 1 · Curso con matrícula y plan por escrito: se retiene; el lugar confirma → se cobra.
  const I1 = await inscribir(cli, EDU, CIU, { grupo: undefined, plan: true, shot: 'e4e-revisa-m.png' });
  ok(st(I1) === 'pending' && pay(I1) === 'held:5500:0', `${I1}: pendiente con la matrícula de $55 retenida`);
  ok(booked(G1) === 1, 'el cupo del grupo queda apartado (seats_booked = 1)');
  ok(sql(`select count(*) from plan_terms t join operations o on o.id = t.operation_id where o.number = '${I1}' and jsonb_array_length(t.schedule) = 3 and t.total_cents = 18500`) === '1', 'plan por escrito: 3 pagos que suman el resto ($185)');
  await cli.getByText('PENDIENTE').first().waitFor(); await cli.screenshot({ path: OUT + 'e4e-pend-m.png', fullPage: true });
  await edu.goto(`${B}/panel/${EDU}/hoy`); await edu.getByText(/INSCRIPCIONES QUE ESPERAN TU RESPUESTA/).first().waitFor(); ok(true, 'Hoy: la inscripción espera respuesta');
  await edu.goto(`${B}/panel/${EDU}/hoy?det=insc:${I1}`); await edu.getByText('PLAN DE PAGOS · POR ESCRITO · SE PAGA EN TU LUGAR').first().waitFor();
  await edu.screenshot({ path: OUT + 'e4e-panel-det-m.png', fullPage: true });
  await clic(edu.getByRole('button', { name: 'Confirmar', exact: true }));
  ok(await espera(() => st(I1) === 'confirmed' && pay(I1) === 'captured:5500:0'), 'confirmar → se cobra la matrícula');
  ok(sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+15705550122' and n.ref_id = '${I1}' and n.tpl = 'insc_ok'`) === '1', 'le llega «Inscripción confirmada»');
  // Marcar una cuota del plan pagada en la escuela.
  await edu.goto(`${B}/panel/${EDU}/hoy?det=insc:${I1}`); await edu.getByText('PLAN DE PAGOS · POR ESCRITO · SE PAGA EN TU LUGAR').first().waitFor();
  await clic(edu.getByRole('button', { name: 'Marcar pagado' }));
  ok(await espera(() => sql(`select count(*) from plan_marks m join operations o on o.id = m.operation_id where o.number = '${I1}'`) === '1'), 'la escuela marca la cuota 1 pagada (solo inserción)');
  // Cancelar antes de empezar → devolución completa y el cupo vuelve.
  await cli.goto(`${B}/insc/${I1}`); await cli.getByText('CONFIRMADA').first().waitFor();
  await clic(cli.getByRole('button', { name: 'Cancelar la inscripción' }));
  ok(!!(await vis(cli.getByText(/Todavía no empieza: te devolvemos \$55/))), 'la hoja dice la regla real (antes de empezar)');
  await clic(cli.getByRole('button', { name: 'Sí, cancelar' }));
  ok(await espera(() => st(I1) === 'cancelled' && pay(I1) === 'refunded:5500:5500' && booked(G1) === 0), 'cancelar antes de empezar → devolución completa y el cupo vuelve');

  // 2 · No hay cupo → se libera todo.
  const I2 = await inscribir(cli, EDU, CIU);
  await edu.goto(`${B}/panel/${EDU}/hoy?det=insc:${I2}`); await clic(edu.getByRole('button', { name: 'No hay cupo' }));
  ok(await espera(() => st(I2) === 'declined' && pay(I2) === 'released:5500:0' && booked(G1) === 0), '«No hay cupo» → se libera la matrícula y el cupo');

  // 3 · Vence a las 24 h sin respuesta (reloj movido) → se libera.
  const I3 = await inscribir(cli, EDU, CIU);
  sql(`update operations set respond_by = now() - interval '1 minute' where number = '${I3}'`); barrer();
  ok(await espera(() => st(I3) === 'expired:sin_respuesta' && pay(I3) === 'released:5500:0' && booked(G1) === 0), 'vence sin respuesta → SIN RESPUESTA, se libera todo');

  // 4 · Otro grupo: se propone, el cupo se mueve; aceptar → se cobra. Y otro grupo rechazado → se libera.
  const I4 = await inscribir(cli, EDU, CIU);
  await edu.goto(`${B}/panel/${EDU}/hoy?det=insc:${I4}`); await clic(edu.getByRole('button', { name: 'Otro grupo' }));
  await clic(edu.getByText(/^Prueba Sáb 9 AM ·/));
  ok(await espera(() => st(I4) === 'change_proposed' && booked(G1) === 0 && booked(G2) === 1), 'otro grupo: el cupo pasa al grupo propuesto');
  await cli.goto(`${B}/insc/${I4}`); await cli.getByText('TE PROPONEN UN CAMBIO').first().waitFor();
  await clic(cli.getByRole('button', { name: 'Aceptar', exact: true }));
  ok(await espera(() => st(I4) === 'confirmed' && pay(I4) === 'captured:5500:0' && sql(`select details->>'group_id' from operations where number = '${I4}'`) === G2), 'aceptar el otro grupo → confirmada en el nuevo grupo y cobrada');
  // 5 · Cancelar después de empezar → la matrícula se queda con la escuela.
  sql(`update operations set details = details || jsonb_build_object('starts_on', (current_date - 1)::text), status_detail = 'started' where number = '${I4}'`);
  await cli.goto(`${B}/insc/${I4}`); await cli.getByText('EN CURSO').first().waitFor();
  await clic(cli.getByRole('button', { name: 'Cancelar la inscripción' }));
  ok(!!(await vis(cli.getByText(/Ya empezó: la matrícula de \$55 no se devuelve/))), 'la hoja dice que ya empezó');
  await clic(cli.getByRole('button', { name: 'Sí, cancelar' }));
  ok(await espera(() => st(I4).startsWith('cancelled') && pay(I4) === 'captured:5500:0'), 'cancelar después de empezar → la matrícula se queda (sin devolución)');

  const I5 = await inscribir(cli, EDU, CIU);
  await edu.goto(`${B}/panel/${EDU}/hoy?det=insc:${I5}`); await clic(edu.getByRole('button', { name: 'Otro grupo' }));
  await clic(edu.getByText(/^Prueba Sáb 9 AM ·/));
  ok(await espera(() => st(I5) === 'change_proposed'), 'otro grupo propuesto');
  await cli.goto(`${B}/insc/${I5}`); await clic(cli.getByRole('button', { name: 'No me sirve' }));
  ok(await espera(() => st(I5) === 'cancelled' && pay(I5) === 'released:5500:0' && booked(G1) === 0 && booked(G2) === 0), '«No me sirve» → se libera la matrícula y el cupo propuesto');

  // 6 · El grupo no abre con 2 inscritos confirmados → devolución exacta a cada uno.
  const p2 = await ctx('5705550299'), p3 = await ctx('5705550288');
  const A = await inscribir(cli, EDU, CIU, { grupo: 'Prueba Sáb 9 AM' });
  sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, status, simulated) select u.id, 'pm_sim_visa_4242_e4e00002', 'visa', '4242', '12/30', true, 'active', true from users u where u.phone = '+15705550299' and not exists (select 1 from payment_methods pm where pm.user_id = u.id and pm.status = 'active')`);
  const tieneTarjeta = sql(`select count(*) from payment_methods pm join users u on u.id = pm.user_id where u.phone = '+15705550299' and pm.status = 'active'`) !== '0';
  const Bn = tieneTarjeta ? await inscribir(p2, EDU, CIU, { grupo: 'Prueba Sáb 9 AM' }) : null;
  for (const n of [A, Bn].filter(Boolean)) { await edu.goto(`${B}/panel/${EDU}/hoy?det=insc:${n}`); await clic(edu.getByRole('button', { name: 'Confirmar', exact: true })); await espera(() => pay(n).startsWith('captured')); }
  await edu.goto(`${B}/panel/${EDU}/vendes/inscripciones`); await edu.getByText('GRUPOS').first().waitFor();
  await edu.screenshot({ path: OUT + 'e4e-panel-insc-m.png', fullPage: true });
  await clic(edu.getByText(/Preparación para ciudadanía · Prueba Sáb 9 AM/));
  await clic(edu.getByRole('button', { name: 'El grupo no abre' }));
  await (await vis(edu.getByPlaceholder(/no se completó/))).fill('No se completó el mínimo de alumnos');
  await clic(edu.getByRole('button', { name: 'Sí, cancelar y devolver a todos' }));
  ok(await espera(() => [A, Bn].filter(Boolean).every((n) => st(n) === 'cancelled' && pay(n) === 'refunded:5500:5500') && sql(`select status from class_groups where id = ${G2}`) === 'cancelled'), `el grupo no abre → ${[A, Bn].filter(Boolean).length} devoluciones exactas`);
  ok(sql(`select count(*) from notifications n where n.ref_id = '${A}' and n.tpl = 'insc_grupo_cx'`) === '1', 'cada inscrito recibe «El grupo no abre» con el motivo');

  // 7 · Niños: «para mi hijo» con datos cifrados; el panel los ve (auditado); ningún aviso lleva el nombre.
  const N1 = await inscribir(cli, NIN, GUARD, { hijo: { nombre: 'Valentina', edad: 4 }, nota: 'Sale a las 5', shot: 'e4e-nino-m.png' });
  ok(st(N1) === 'pending' && pay(N1) === 'none', `${N1}: guardería por semana, $0 en la app`);
  ok(sql(`select count(*) from op_private p join operations o on o.id = p.operation_id where o.number = '${N1}' and p.reason = 'nino' and p.note_enc is not null and position('Valentina' in encode(p.note_enc, 'escape')) = 0`) === '1', 'los datos del niño se guardan cifrados');
  ok(sql(`select coalesce(customer_note, '') from operations where number = '${N1}'`) === '' && !sql(`select details::text from operations where number = '${N1}'`).includes('Valentina'), 'ni la nota ni el nombre quedan en claro en la operación');
  const bandaAntes = sql(`select sum(openings) from care_openings where business_id = '${NIN}' and removed_at is null`);
  await nin.goto(`${B}/panel/${NIN}/hoy?det=insc:${N1}`); await nin.getByText('SU NIÑO O NIÑA · PRIVADO').first().waitFor();
  ok(!!(await vis(nin.getByText('Valentina'))), 'el panel del lugar ve el nombre del niño');
  ok(Number(sql(`select count(*) from audit_entries where action = 'insc.ver_nino' and target_id = '${N1}'`)) >= 1, 'cada vista de los datos del niño queda en la auditoría');
  await nin.screenshot({ path: OUT + 'e4e-nino-panel-m.png', fullPage: true });
  await clic(nin.getByRole('button', { name: 'Confirmar', exact: true }));
  ok(await espera(() => st(N1) === 'confirmed'), 'la guardería confirma');
  ok(sql(`select count(*) from notifications n where n.ref_id = '${N1}' and (n.body::text ilike '%Valentina%' or n.title::text ilike '%Valentina%')`) === '0', 'ningún aviso lleva el nombre del niño');
  // 9b-1 · Las bandas de edad salen de la base (antes «4» fijo: una base vieja tenía la de nin4b; la semilla trae 3).
  const bandas = Number(sql(`select count(*) from care_openings where business_id = '${NIN}' and removed_at is null`));
  ok(Number(bandaAntes) === bandas * 3 - 1, `la banda de edad bajó un cupo (${bandas} bandas × 3 → ${bandas * 3 - 1})`);

  // 8 · Membresía: inscribirse $0 → confirmar → «Cancelar mi membresía» = baja pedida → el gimnasio confirma → constancia.
  const M1 = await inscribir(cli, GYM, MEMB);
  await gym.goto(`${B}/panel/${GYM}/hoy?det=insc:${M1}`); await clic(gym.getByRole('button', { name: 'Confirmar', exact: true }));
  ok(await espera(() => st(M1).startsWith('confirmed') && pay(M1) === 'none'), 'membresía confirmada sin nada en la tarjeta');
  await cli.goto(`${B}/insc/${M1}`); await clic(cli.getByRole('button', { name: 'Cancelar mi membresía' }));
  await clic(cli.getByRole('button', { name: 'Sí, cancelar' }));
  ok(await espera(() => st(M1) === 'confirmed:cancel_req'), 'la baja queda pedida con fecha y hora');
  await cli.getByText('CANCELACIÓN PEDIDA').first().waitFor(); await cli.screenshot({ path: OUT + 'e4e-baja-m.png', fullPage: true });
  await gym.goto(`${B}/panel/${GYM}/hoy`); await gym.getByText(/CANCELACIONES DE MEMBRESÍA PEDIDAS/).first().waitFor();
  await gym.goto(`${B}/panel/${GYM}/hoy?det=insc:${M1}`); await clic(gym.getByRole('button', { name: 'Confirmar la cancelación' }));
  ok(await espera(() => st(M1) === 'cancelled' && sql(`select count(*) from notifications where ref_id = '${M1}' and tpl = 'insc_cancelada'`) === '1'), 'el gimnasio confirma → CANCELADA y le llega la constancia');
  // A las 72 h sin confirmar, queda sola.
  const M2 = await inscribir(cli, GYM, MEMB);
  await gym.goto(`${B}/panel/${GYM}/hoy?det=insc:${M2}`); await clic(gym.getByRole('button', { name: 'Confirmar', exact: true })); await espera(() => st(M2).startsWith('confirmed'));
  await cli.goto(`${B}/insc/${M2}`); await clic(cli.getByRole('button', { name: 'Cancelar mi membresía' })); await clic(cli.getByRole('button', { name: 'Sí, cancelar' }));
  await espera(() => st(M2) === 'confirmed:cancel_req');
  sql(`update operations set details = details || jsonb_build_object('cancel_req_at', (now() - interval '73 hours')::text) where number = '${M2}'`); barrer();
  ok(await espera(() => st(M2) === 'cancelled'), 'a las 72 h sin confirmar, la baja queda sola');

  // 9 · Primera clase gratis: una vez por persona y lugar cada 90 días.
  // (la base es solo inserción: si una corrida anterior ya la usó en los últimos 90 días, la primera también dice que no)
  const yaUsada = sql(`select count(*) from operation_events e join operations o on o.id = e.operation_id join users u on u.id = o.user_id where u.phone = '+15705550122' and o.business_id = '${EDU}' and e.kind = 'insc_g1' and e.at > now() - interval '90 days'`) !== '0';
  const C1 = await inscribir(cli, EDU, CONV);
  ok(sql(`select details->>'g1' from operations where number = '${C1}'`) === (yaUsada ? 'false' : 'true'), yaUsada ? 'primera clase gratis: ya usada en otra corrida → no' : 'primera clase gratis: la primera vez sí');
  await cli.goto(`${B}/insc/${C1}`); await clic(cli.getByRole('button', { name: 'Cancelar la inscripción' })); await clic(cli.getByRole('button', { name: 'Sí, cancelar' })); await espera(() => st(C1) === 'cancelled');
  const C2 = await inscribir(cli, EDU, CONV);
  ok(sql(`select details->>'g1' from operations where number = '${C2}'`) === 'false', 'primera clase gratis dos veces → la segunda no');
  await cli.goto(`${B}/insc/${C2}`); await clic(cli.getByRole('button', { name: 'Cancelar la inscripción' })); await clic(cli.getByRole('button', { name: 'Sí, cancelar' })); await espera(() => st(C2) === 'cancelled');

  // 10 · Tres familias por el último cupo (clase sin matrícula): pasa una.
  sql(`update class_groups set seats_total = seats_outside + seats_booked + 1 where id = ${GC}`);
  const P = [cli, p2, p3], GCL = sql(`select label->>'es' from class_groups where id = ${GC}`);
  for (const p of P) {
    await p.goto(`${B}/n/${EDU}/inscribirme?svc=${CONV}`); await p.getByText('NOTA · OPCIONAL').first().waitFor();
    // 9b-1 · El grupo del último cupo (GC) por su nombre, no «el primer horario que se pueda»: en una base nueva el primero era «Sáb 11 AM»
    // (con 3 lugares libres) y las tres familias entraban ahí: ninguna quedaba en GC.
    await clic(p.getByRole('button', { name: 'Continuar' })); const r = await vis(p.locator('button[role="radio"]:not([disabled])').filter({ hasText: GCL })); if (!r) throw new Error(`ASSERT el horario ${GCL} (el del último cupo) se puede elegir`); await r.click();
    await clic(p.getByRole('button', { name: 'Continuar' })); await p.getByText('BUENO SABER').first().waitFor();
  }
  await Promise.all(P.map(async (p) => { const x = await vis(p.getByRole('button', { name: 'Enviar solicitud' })); await x.click(); }));
  await new Promise((r) => setTimeout(r, 4000));
  const vivas = Number(sql(`select count(*) from operations where kind = 'enrollment' and details->>'group_id' = '${GC}' and status = 'pending'`));
  ok(vivas === 1 && booked(GC) === Number(sql(`select seats_total - seats_outside from class_groups where id = ${GC}`)), `tres por el último cupo → ${vivas} inscrita, el grupo no se pasa`);
  const perdedor = (await Promise.all(P.map(async (p) => /\/insc\//.test(p.url()) ? null : p))).find(Boolean);
  ok(!!perdedor && !!(await vis(perdedor.getByText(/Ese grupo se llenó/))), 'a quien no alcanzó le dice «Ese grupo se llenó»');

  // 11 · Lista de espera: lleno → anotarse → el lugar ofrece el cupo → inscribirse con la oferta.
  sql(`update class_groups set seats_total = seats_outside + seats_booked, starts_on = greatest(starts_on, current_date + 40), ends_on = case when ends_on is null then null else greatest(ends_on, current_date + 40) end where item_id = ${CONV} and id <> ${GC}`);
  await perdedor.goto(`${B}/n/${EDU}/inscribirme?svc=${CONV}`); await perdedor.getByText('NOTA · OPCIONAL').first().waitFor();
  await clic(perdedor.getByRole('button', { name: 'Continuar' }));
  await clic(perdedor.getByRole('button', { name: 'Anotarme en la lista de espera' }));
  ok(await espera(() => sql(`select count(*) from waitlist_entries where group_id = ${GC} and status = 'waiting'`) === '1'), 'anotado en la lista de espera');
  sql(`update class_groups set seats_total = seats_total + 1 where id = ${GC}`);
  await edu.goto(`${B}/panel/${EDU}/vendes/inscripciones`); await edu.getByText(/LISTA DE ESPERA/).first().waitFor();
  await clic(edu.getByRole('button', { name: 'Ofrecer el cupo' }));
  ok(await espera(() => sql(`select status from waitlist_entries where group_id = ${GC} order by id desc limit 1`) === 'offered'), 'el lugar ofrece el cupo (48 h)');
  const W = await inscribir(perdedor, EDU, CONV, { q: `&grupo=${GC}` });
  ok(st(W) === 'pending' && sql(`select status from waitlist_entries where group_id = ${GC} order by id desc limit 1`) === 'accepted', `con la oferta se inscribe (${W}) y la oferta queda usada`);

  // 12 · Mi cuenta muestra las inscripciones.
  await cli.goto(`${B}/cuenta/citas`); await cli.getByText(/INSCRIPCIONES, PLANES, RENTAS Y APARTADOS|Inscripciones, planes, rentas y apartados/).first().waitFor();
  ok(!!(await vis(cli.getByText(/INSCRIPCIÓN I-\d+/).first())), 'Mi cuenta › Citas y reservas lista las inscripciones');
  // Desktop de la inscripción.
  const d = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); d.on('pageerror', (e) => err.push(e.message)); await entrar(d, '5705550122');
  await d.goto(`${B}/n/${EDU}/inscribirme?svc=${CIU}`); await d.getByText('Antes de enviar').first().waitFor(); await d.screenshot({ path: OUT + 'e4e-insc-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  sql(`update class_groups set status = 'cancelled', cancel_reason = 'prueba 4ee' where id = ${G2}`); // el grupo de prueba no queda abierto (edu4a cuenta los de la semilla)
  await b.close(); console.log('OK ins4e');
})().catch((e) => { console.error(e); process.exit(1); });
