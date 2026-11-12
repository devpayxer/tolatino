// 4ef · Ayuda con la inscripción («Cobraron más del total» con foto → la escuela propone $20 → aceptar = devolución parcial exacta de la
// matrícula; «No cuidaron bien a mi niño» → directo a To'Latino con prioridad y el aviso de ChildLine; «No me dejan cancelar» con foto)
// y reseña verificada (preguntas por rubro, dato de la inscripción, «Lo que importa»; Niños sin fotos ni el nombre del niño).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9a · 7d: con El Compa encendido, «Ayuda con …» abre primero su hoja; la razón «Algo no salió bien / no está bien» lleva al formulario de
// siempre (?de=compa). Ir directo a /ayuda?de=compa es «ya pasé por la hoja».
// Con la operación todavía viva la hoja no trae esa razón (Cancelar, Otra hora, Otra cosa): ahí se sigue como «ya pasé por la hoja».
const pasarHoja = async (p) => { await p.waitForLoadState('networkidle'); const r = p.getByText(/^(Algo no está bien|Algo no salió bien)$/); if (await r.count()) { await r.first().click(); await p.waitForURL(/de=compa/); } else if (!/de=compa/.test(p.url())) await p.goto(p.url() + (p.url().includes('?') ? '&' : '?') + 'de=compa'); };
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', FOTO = ENT.rec('fotos') + '/portada.jpg';
const EDU = 'ingles-para-todos', NIN = 'guarderia-mis-angelitos', GYM = 'power-gym-hzl';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, v) => { let x; for (let i = 0; i < 48; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const ve = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const MARISOL = "(select id from users where phone = '+15705550122')";
const AY = (n, col) => sql(`select ${col} from help_requests h join operations o on o.id = h.operation_id where o.number = '${n}'`);
const CIU = sql(`select id from items where business_id = '${EDU}' and name->>'es' = 'Preparación para ciudadanía' and removed_at is null`);
const GUARD = sql(`select id from items where business_id = '${NIN}' and svc_kind = 'semana' and removed_at is null limit 1`);
const MEMB = sql(`select id from items where business_id = '${GYM}' and name->>'es' = 'Membresía sin contrato' and removed_at is null`);

async function inscribir(p, neg, svc, o = {}) {
  await p.goto(`${B}/n/${neg}/inscribirme?svc=${svc}`); await p.getByText(/^(¿PARA QUIÉN ES\?|TU NIÑO O NIÑA|NOTA · OPCIONAL)$/).first().waitFor();
  if (o.hijo) { if (await vis(p.getByText('Para mi hijo o hija'))) await clic(p.getByText('Para mi hijo o hija')); await (await vis(p.getByLabel('Nombre de pila'))).fill(o.hijo.nombre); await (await vis(p.getByLabel('Edad'))).selectOption(String(o.hijo.edad)); await clic(p.getByRole('checkbox', { name: /Soy su mamá/ })); }
  await clic(p.getByRole('button', { name: 'Continuar' }));
  if (!(await vis(p.locator('button[role="radio"][aria-checked="true"]')))) { const r = await vis(p.locator('button[role="radio"]:not([disabled])')); if (r) await r.click(); }
  await clic(p.getByRole('button', { name: 'Continuar' })); await p.getByText('BUENO SABER').first().waitFor();
  await clic(p.getByRole('button', { name: 'Enviar solicitud' })); await p.waitForURL(/\/insc\/I-\d+/, { timeout: 15000 });
  return p.url().match(/I-\d+/)[0];
}
async function confirmar(p, neg, num) { await p.goto(`${B}/panel/${neg}/hoy?det=insc:${num}`); await clic(p.getByRole('button', { name: 'Confirmar', exact: true })); await espera(() => sql(`select status from operations where number = '${num}'`), 'confirmed'); }
(async () => {
  require('../lib/negocio-nuevo.cjs').sinTopeDeAyuda('5705550122'); // 9b-1 · el tope de 5 ayudas al día de Marisol (ver lib)
  sql(`update operations set status = 'cancelled', cancelled_by = 'system' where kind = 'enrollment' and status in ('pending', 'change_proposed', 'confirmed') and business_id in ('${EDU}', '${NIN}', '${GYM}')`);
  sql(`update class_groups set seats_booked = 0 where business_id in ('${EDU}', '${NIN}', '${GYM}')`);
  sql(`update class_groups set status = 'open', seats_total = 12 where item_id = ${CIU} and label->>'es' not like 'Prueba%'`);
  sql(`update care_openings set openings = 3 where business_id = '${NIN}' and removed_at is null`);
  sql(`update reviews set status = 'removed' where user_id = ${MARISOL} and business_id in ('${EDU}', '${NIN}', '${GYM}') and status <> 'removed'`);
  sql(`update help_requests set created_at = created_at - interval '1 day' where user_id = ${MARISOL} and created_at > now() - interval '1 day'`);
  const b = await chromium.launch(); const err = [];
  const ctx = async (tel, d) => { const p = await (await b.newContext(d ?? { ...devices['iPhone 13'] })).newPage(); p.on('pageerror', (e) => err.push(e.message)); await entrar(p, tel); return p; };
  const m = await ctx('5705550122'), edu = await ctx('5705550377', { viewport: { width: 1360, height: 900 } }), nin = await ctx('5705550388', { viewport: { width: 1360, height: 900 } }), gym = await ctx('5705550411', { viewport: { width: 1360, height: 900 } });

  // ── Educación: cobraron más → la escuela propone $20 → aceptar = $20 devueltos de la matrícula ──
  const I1 = await inscribir(m, EDU, CIU); await confirmar(edu, EDU, I1);
  sql(`update operations set status_detail = 'started', details = details || jsonb_build_object('starts_on', (current_date - 3)::text) where number = '${I1}'`);
  ok(sql(`select status || ':' || status_detail from operations where number = '${I1}'`) === 'confirmed:started', `${I1}: en curso, matrícula cobrada`);
  await m.goto(`${B}/insc/${I1}`); await clic(m.getByRole('button', { name: 'Ayuda con la inscripción' })); await m.waitForURL(/\/insc\/I-\d+\/ayuda(\?|$)/); await pasarHoja(m);
  const f = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f.getByText('¿Qué pasó?').first().waitFor();
  ok((await f.locator('[data-screen-label="Ayuda con la cita · qué pasó"]').getByRole('button').count()) === 5, 'Educación: 5 motivos');
  ok(!!(await vis(f.getByText('No me dieron el certificado prometido'))), 'motivo «No me dieron el certificado prometido»');
  await clic(f.getByText('Cobraron más del total')); ok(!!(await vis(f.getByText('Fotos · obligatorias'))), 'cobraron más: foto obligatoria');
  await (await vis(f.getByLabel('Qué pasó'))).fill('Me cobraron $20 de libros que decían que estaban incluidos en el total.');
  await f.locator('input[type="file"]').first().setInputFiles(FOTO); await f.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  ok(!!(await vis(f.getByRole('radio', { name: /Terminar en otro grupo/ }))), 'qué quieres: terminar en otro grupo (Educación)');
  await clic(f.getByRole('radio', { name: /Que me devuelvan/ }));
  await m.screenshot({ path: OUT + 'f4f-ayuda-edu-m.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.getByText('PENDIENTE').first().waitFor();
  ok(AY(I1, "h.reason || '|' || h.wants || '|' || h.status") === 'cobro|devolver|open', 'guardada: cobro · devolver · abierta');
  await edu.goto(`${B}/panel/${EDU}/hoy`); ok(await ve(edu.getByText(new RegExp(I1)).first()), 'panel Hoy: la ayuda por responder');
  const det = edu.locator('[data-screen-label="Panel v2 · detalle"]');
  await edu.goto(`${B}/panel/${EDU}/hoy?det=insc:${I1}`); await det.getByText(/AYUDA CON LA CITA · H-|AYUDA · H-/).first().waitFor().catch(() => {});
  ok(!!(await vis(det.getByText('Cobraron más del total').first())), 'panel: el motivo con su nombre');
  await clic(det.getByText('Proponer otra cosa', { exact: true }));
  await (await vis(det.getByPlaceholder(/\d+(\.\d{2})?/))).fill('20');
  await (await vis(det.locator('textarea'))).fill('Tienes razón: te devolvemos los $20 de los libros.');
  await clic(det.getByRole('button', { name: 'Enviar respuesta' }));
  ok(await espera(() => AY(I1, "h.status || '|' || h.decision || '|' || h.offer_cents"), 'answered|alt|2000') === 'answered|alt|2000', 'la escuela propone $20');
  await m.goto(`${B}/insc/${I1}/ayuda?de=compa`); await m.getByText('TE PROPONEN UN CAMBIO').first().waitFor();
  await clic(m.getByRole('button', { name: 'Aceptar $20' }));
  // 9b-1 · La matrícula cobrada sale del cobro (antes «5500» fijo: el precio en una base vieja; en la semilla es $50).
  const MAT = sql(`select p.amount_cents from payments p join operations o on o.id = p.operation_id where o.number = '${I1}'`);
  ok(await espera(() => sql(`select p.status || ':' || p.amount_cents || ':' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${I1}'`), `partially_refunded:${MAT}:2000`) === `partially_refunded:${MAT}:2000`, `aceptó: $20 exactos devueltos de la matrícula (cobrada: ${MAT} centavos)`);

  // ── Niños: «No cuidaron bien a mi niño» → directo a To'Latino, con ChildLine ──
  const N1 = await inscribir(m, NIN, GUARD, { hijo: { nombre: 'Valentina', edad: 4 } }); await confirmar(nin, NIN, N1);
  sql(`update operations set status_detail = 'started' where number = '${N1}'`);
  await m.goto(`${B}/insc/${N1}/ayuda?de=compa`); const g = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await g.getByText('¿Qué pasó?').first().waitFor();
  await clic(g.getByRole('button', { name: 'No cuidaron bien a mi niño', exact: true }));
  ok(!!(await vis(m.getByText(/ChildLine de Pennsylvania: 1-800-932-0313/))), 'el aviso fijo: 911 y ChildLine');
  await (await vis(g.getByLabel('Qué pasó'))).fill('La recogí y nadie sabía dónde estaba; la encontraron sola en el patio.');
  await clic(g.getByRole('radio', { name: /Solo quiero avisar/ }));
  await m.screenshot({ path: OUT + 'f4f-ayuda-ninos-m.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  ok(await espera(() => AY(N1, "h.reason || '|' || h.status || '|' || h.escalated_by"), 'cuidado|escalated|system') === 'cuidado|escalated|system', '«cuidado»: escalada sola, sin esperar 24 h');
  ok(sql(`select priority from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id where q.subject_kind = 'help_request' and h.operation_id = (select id from operations where number = '${N1}')`) === 'alta', 'en la cola de To\'Latino con prioridad alta');
  ok(sql(`select count(*) from notifications where ref_id = '${N1}' and (body::text ilike '%Valentina%' or title::text ilike '%Valentina%')`) === '0', 'ningún aviso lleva el nombre del niño');

  // ── Deporte: «No me dejan cancelar» con foto y «Cancelar mi membresía» ──
  const M1 = await inscribir(m, GYM, MEMB); await confirmar(gym, GYM, M1);
  await m.goto(`${B}/insc/${M1}`); await clic(m.getByRole('button', { name: 'Cancelar mi membresía' })); await clic(m.getByRole('button', { name: 'Sí, cancelar' }));
  await espera(() => sql(`select status_detail from operations where number = '${M1}'`), 'cancel_req');
  await m.goto(`${B}/insc/${M1}/ayuda?de=compa`); const h = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await h.getByText('¿Qué pasó?').first().waitFor();
  await clic(h.getByRole('button', { name: 'No me dejan cancelar', exact: true })); ok(!!(await vis(h.getByText('Fotos · obligatorias'))), '«No me dejan cancelar»: foto obligatoria');
  await (await vis(h.getByLabel('Qué pasó'))).fill('Pedí la baja en la app y en la recepción me dicen que tengo que pagar tres meses más.');
  await h.locator('input[type="file"]').first().setInputFiles(FOTO); await h.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await clic(h.getByRole('radio', { name: /Cancelar mi membresía/ }));
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  ok(await espera(() => AY(M1, "h.reason || '|' || h.wants || '|' || h.status"), 'salir|cancelar_membresia|open') === 'salir|cancelar_membresia|open', 'guardada: salir · cancelar la membresía · abierta');

  // ── Reseña verificada de Educación (terminó con certificado) ──
  sql(`update operations set status = 'done', done_at = now(), details = details || '{"cert_given": true}'::jsonb where number = '${I1}'`);
  await m.goto(`${B}/n/${EDU}/resena?pedido=${I1}`); ok(await ve(m.getByText("TU INSCRIPCIÓN · DATO DE TO'LATINO")) && await ve(m.getByText('¿TE DIERON EL CERTIFICADO PROMETIDO?')), 'reseña: dato de la inscripción y preguntas de Educación');
  await clic(m.getByRole('button', { name: '4 ★', exact: true }));
  await clic(m.locator('div').filter({ hasText: /^¿COBRARON EL TOTAL QUE DIJERON\?/ }).getByText('Cobraron más', { exact: true }));
  await clic(m.locator('div').filter({ hasText: /^¿TE DIERON EL CERTIFICADO PROMETIDO\?/ }).getByText('Sí', { exact: true }));
  await (await vis(m.getByLabel('Tu reseña'))).fill('Aprendí mucho para la entrevista; me cobraron libros aparte pero lo arreglaron.');
  await m.screenshot({ path: OUT + 'f4f-resena-edu-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: /^Publicar/ })); await m.waitForURL((u) => !/\/resena\?/.test(u.toString())).catch(() => {});
  ok(await espera(() => sql(`select r.src || '|' || (answers->>'totalOk') || '|' || (answers->>'certOk') || '|' || (facts->>'certDado') from reviews r join operations o on o.id = r.operation_id where o.number = '${I1}' and r.status = 'visible'`), 'cita|0|1|true') === 'cita|0|1|true', 'reseña verificada con sus respuestas y el certificado del dato');
  await m.goto(`${B}/n/${EDU}?tab=rev`); ok(await ve(m.getByText('LO QUE IMPORTA EN UN CURSO')), 'ficha: «Lo que importa en un curso»');
  ok(await ve(m.getByText(/inscripciones por To'Latino en los últimos 12 meses/)), 'ficha: de N inscripciones por To\'Latino en 12 meses');

  // ── Reseña de Niños: sin fotos y sin el nombre del niño ──
  sql(`update operations set status = 'done', done_at = now() where number = '${N1}'`);
  await m.goto(`${B}/n/${NIN}/resena?pedido=${N1}`); ok(await ve(m.getByText('¿CUIDARON BIEN A TU NIÑO?')), 'reseña de Niños: sus preguntas');
  ok(!(await vis(m.getByText('FOTOS · OPCIONAL'))) && await ve(m.getByText(/No escribas el nombre de tu niño/)), 'sin fotos y con el aviso del nombre');
  await clic(m.getByRole('button', { name: '2 ★', exact: true }));
  await (await vis(m.getByLabel('Tu reseña'))).fill('Valentina estaba sola en el patio cuando llegué a recogerla, nadie sabía.');
  await clic(m.getByRole('button', { name: /^Publicar/ }));
  ok(await ve(m.getByText(/No escribas el nombre de tu niño: la reseña es pública/)), 'el servidor rechaza el nombre del niño');
  await (await vis(m.getByLabel('Tu reseña'))).fill('Mi niña estaba sola en el patio cuando llegué a recogerla, nadie sabía.');
  await clic(m.getByRole('button', { name: /^Publicar/ })); await m.waitForURL((u) => !/\/resena\?/.test(u.toString())).catch(() => {});
  ok(await espera(() => sql(`select count(*) from reviews r join operations o on o.id = r.operation_id where o.number = '${N1}' and r.status = 'visible' and r.body not ilike '%Valentina%'`), '1') === '1', 'sin el nombre, se publica (verificada)');

  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK ayu4f');
})().catch((e) => { console.error(e); process.exit(1); });
