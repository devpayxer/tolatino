const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9a · 7d: con El Compa encendido, «Ayuda con …» abre primero su hoja; la razón «Algo no salió bien / no está bien» lleva al formulario de
// siempre (?de=compa). Ir directo a /ayuda?de=compa es «ya pasé por la hoja».
// Con la operación todavía viva la hoja no trae esa razón (Cancelar, Otra hora, Otra cosa): ahí se sigue como «ya pasé por la hoja».
const pasarHoja = async (p) => { await p.waitForLoadState('networkidle'); const r = p.getByText(/^(Algo no está bien|Algo no salió bien)$/); if (await r.count()) { await r.first().click(); await p.waitForURL(/de=compa/); } else if (!/de=compa/.test(p.url())) await p.goto(p.url() + (p.url().includes('?') ? '&' : '?') + 'de=compa'); };
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'barberia-el-primo';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const MARISOL = `(select id from users where phone = '+15705550122')`;
const LUIS = `(select id from business_members where business_id = '${BIZ}' and kind = 'owner')`, ANDY = `(select id from business_members where business_id = '${BIZ}' and display_name = 'Andy Mejía')`;
const SV = (n) => `(select id from items where business_id = '${BIZ}' and module = 'svc' and name->>'es' = '${n}' and removed_at is null)`;
const op = (n, cols) => sql(`select ${cols} from operations where number = '${n}'`);
const pago = (n) => sql(`select status || '|' || amount_cents || '|' || refunded_cents from payments where operation_id = (select id from operations where number = '${n}') and kind = 'deposit'`);
const nt = (tpl, n) => sql(`select count(*) from notifications where tpl = '${tpl}' and ref_id = '${n}'`);
const limpiar = () => {
  // Tarjeta de prueba 4242 y cuenta de cobro simulada (otras pruebas las reinician).
  sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated) select ${MARISOL}, 'pm_sim_visa_4242_c13c3c00', 'visa', '4242', '12/30', true, true where not exists (select 1 from payment_methods where stripe_pm_id = 'pm_sim_visa_4242_c13c3c00')`);
  sql(`update payment_methods set status = 'active' where stripe_pm_id = 'pm_sim_visa_4242_c13c3c00'`);
  sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated) values ('${BIZ}', 'acct_sim_${BIZ}', 'enabled', true, true, '[]'::jsonb, '4321', true) on conflict (business_id) do nothing`);
  sql(`update payments set status = 'released', released_at = now() where status = 'held' and operation_id in (select id from operations where user_id = ${MARISOL} and business_id = '${BIZ}')`);
  sql(`update change_proposals set status = 'expired' where status = 'open' and operation_id in (select id from operations where user_id = ${MARISOL} and business_id = '${BIZ}')`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and business_id = '${BIZ}' and status in ('pending', 'change_proposed', 'confirmed')`);
  // 9a · ya no borra los avisos de citas de todos: las citas de esta prueba son nuevas en cada corrida (nt() cuenta por su número).
  sql(`update items set duration_min = 40, svc_opts = '[]'::jsonb, sell = true, status = 'live', hidden_reason = null where id = ${SV('Fade')}`);
  sql(`update business_members set chair_auto = false, chair_deposit_cents = 1000, chair_response_min = 15 where id = ${LUIS}`);
  sql(`update business_members set chair_auto = false, chair_deposit_cents = 0, chair_response_min = 30 where id = ${ANDY}`);
  sql(`update businesses set svc_model = 'chair', modules_on = array['svc','citas','staff'], modules_off = modules_off - 'citas' - 'svc' where id = '${BIZ}'`);
  sql(`update booking_policies set cancel_free_h = 4 where business_id = '${BIZ}'`);
};
const ESPERA = async (p) => { await p.waitForTimeout(300); await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]')); };
// Pide una cita: servicio, persona, el n-ésimo día (sin contar hoy) y la primera hora libre.
async function reservar(m, svc, persona, nDia, conTarjeta) {
  await m.goto(B + `/n/${BIZ}/cita?s=${sql(`select ${SV(svc)}`)}&con=${sql(`select ${persona}`)}`);
  const bk = m.locator('[data-screen-label="APP-NEG-BOOKING · móvil"]'); await bk.getByText('DÍA', { exact: true }).waitFor();
  await bk.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) / }).nth(nDia).click(); await ESPERA(m);
  const slot = bk.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /\d:\d\d [AP]M/ }).first(); const hora = (await slot.textContent()).trim(); await slot.click();
  const barra = m.locator('[data-screen-label="Booking · barra"]');
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bk.getByText('¿PARA QUIÉN ES?').waitFor();
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bk.getByText('ANTES DE ENVIAR').waitFor();
  if (conTarjeta) { await clic(m.locator('[data-screen-label="Booking · método de pago"]')); const mp = m.locator('[data-screen-label="Método de pago"]'); await clic(mp.getByText(/4242/)); await clic(mp.getByText(/^Usar /)); await mp.waitFor({ state: 'detached' }); }
  await barra.getByRole('button', { name: /Enviar solicitud|Confirmar cita/ }).click(); await m.waitForURL(/\/cita\/C-\d+/);
  return { numero: m.url().split('/').pop().split('?')[0], hora };
}
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const FOTO = ENT.rec('fotos') + '/portada.jpg'; // 9a: antes, una captura que dejaba otra prueba (rsvadmin)
const ayuda = (n, cols) => sql(`select ${cols} from help_requests h where h.operation_id = (select id from operations where number = '${n}')`);
// 9a · ya no borra todas las solicitudes ni la cola: cierra en la cola «sop» solo las de citas de Marisol en este negocio (las de esta prueba).
const limpiarAyuda = () => sql(`update queue_items set status = 'decided', decision = 'prueba' where queue = 'sop' and status = 'open' and subject_kind = 'help_request' and subject_id in (select h.id::text from help_requests h join operations o on o.id = h.operation_id where o.user_id = ${MARISOL} and o.business_id = '${BIZ}')`);
const terminar = (n) => sql(`update operations set status = 'done', status_detail = 'done', done_at = now(), updated_at = now() where number = '${n}'`);
(async () => {
  require('../lib/negocio-nuevo.cjs').sinTopeDeAyuda('5705550122'); // 9b-1 · el tope de 5 ayudas al día de Marisol (ver lib)
  limpiar(); limpiarAyuda();
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await entrar(d, '5705550166');
  d.on('pageerror', e => err.push('panel ' + e.message));
  globalThis.__p = [m, d];
  // ── 1. Cita con depósito: Luis la confirma (se cobra), pasa la cita y Marisol pide ayuda con foto ──
  const A = await reservar(m, 'Fade', LUIS, 1, true);
  await d.goto(B + `/panel/${BIZ}/hoy?det=cita:${A.numero}`); const det = d.locator('[data-screen-label="Panel v2 · detalle"]');
  await clic(det.getByRole('button', { name: 'Confirmar' }));
  ok(await espera(() => pago(A.numero), 'captured|1000|0') === 'captured|1000|0', `${A.numero}: confirmada, depósito de $10 cobrado`);
  await m.goto(B + `/cita/${A.numero}/ayuda?de=compa`); await m.getByText(/La ayuda se pide cuando la cita ya pasó/).first().waitFor();
  ok(true, 'antes de la cita: no se puede pedir ayuda');
  terminar(A.numero);
  await m.goto(B + `/cita/${A.numero}`); await clic(m.getByRole('button', { name: 'Ayuda con la cita' })); await m.waitForURL(/\/ayuda(\?|$)/); await pasarHoja(m);
  const f = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f.getByText('¿Qué pasó?').first().waitFor();
  ok(!!(await vis(f.getByText('Lo que pagas es el precio publicado.'))), 'formulario: tu cita, precio publicado');
  ok(!!(await vis(m.getByText('Elige qué pasó'))), 'te falta: elige qué pasó');
  ok(await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).isDisabled(), 'sin motivo no se envía');
  ok((await f.locator('[data-screen-label="Ayuda con la cita · qué pasó"]').getByRole('button').count()) === 6, 'cita terminada: 6 motivos');
  await m.screenshot({ path: OUT + 'e1-form.png', fullPage: true });
  await clic(f.getByText('No quedó como lo pedí'));
  ok(!!(await vis(f.getByText('Fotos · obligatorias'))), 'No quedó como lo pedí: la foto es obligatoria');
  await (await vis(f.getByLabel('Qué pasó'))).fill('Pedí un fade bajo y me lo dejaron alto de los lados.');
  ok(!!(await vis(m.getByText('Agrega una foto'))), 'te falta: agrega una foto');
  await f.locator('input[type="file"]').first().setInputFiles(FOTO);
  await f.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await clic(f.getByRole('radio', { name: /Que me devuelvan/ }));
  await m.screenshot({ path: OUT + 'e2-form-lleno.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.locator('[data-pantalla="APP-NEG-CITA-AYUDA-ESTADO"]').getByText('PENDIENTE').first().waitFor();
  ok(ayuda(A.numero, "h.reason || '|' || h.wants || '|' || h.status") === 'quedo|devolver|open', 'solicitud guardada: no quedó · que me devuelvan · abierta');
  ok(sql(`select count(*) from media where owner_kind = 'help' and owner_id = (select id::text from help_requests where operation_id = (select id from operations where number = '${A.numero}'))`) === '1', 'la foto queda con la solicitud');
  ok(sql(`select count(*) from notifications where tpl = 'biz_help_cita'`) !== '0', 'aviso al negocio: pide ayuda con una cita');
  await m.screenshot({ path: OUT + 'e3-estado-pend.png', fullPage: true });
  // ── 2. Panel: Hoy › Ayuda con citas; el detalle propone devolver $6 ──
  await d.goto(B + `/panel/${BIZ}/hoy`); await d.getByText('AYUDA QUE ESPERA TU RESPUESTA · 24 H').first().waitFor();
  ok(true, 'Hoy: «Ayuda con citas · responde en 24 h»');
  await clic(d.getByText(`Cita #${A.numero}`).filter({ hasText: 'Marisol' }));
  await det.getByText(/AYUDA CON LA CITA · H-/).first().waitFor();
  ok(!!(await vis(det.getByText('SUS FOTOS'))), 'detalle: su motivo, su nota y sus fotos');
  await clic(det.getByText('Proponer otra cosa', { exact: true }));
  ok(!!(await vis(det.getByText(/A su tarjeta puedes devolver hasta \$10/))), 'detalle: hasta $10 a su tarjeta (el depósito)');
  await (await vis(det.getByPlaceholder('10.00'))).fill('6');
  await (await vis(det.locator('textarea'))).fill('Tienes razón en parte. Te devolvemos $6 y te lo arreglamos.');
  await d.screenshot({ path: OUT + 'e4-panel-ayuda-d.png', fullPage: true });
  await clic(det.getByRole('button', { name: 'Enviar respuesta' }));
  ok(await espera(() => ayuda(A.numero, "h.status || '|' || h.decision || '|' || h.offer_cents"), 'answered|alt|600') === 'answered|alt|600', 'respondida: propone devolver $6');
  ok(sql(`select count(*) from audit_entries where action = 'cita.ayuda.responder' and at > now() - interval '1 minute'`) !== '0', 'queda en la auditoría del negocio');
  // ── 3. Marisol acepta la propuesta: vuelven $6 a su tarjeta ──
  await m.goto(B + `/cita/${A.numero}/ayuda?de=compa`); await m.getByText('TE PROPONEN UN CAMBIO').first().waitFor();
  ok(!!(await vis(m.getByText(/Tienes razón en parte/))), 've la respuesta del negocio');
  await m.screenshot({ path: OUT + 'e5-estado-alt.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Aceptar $6' }));
  ok(await espera(() => pago(A.numero), 'partially_refunded|1000|600') === 'partially_refunded|1000|600', 'aceptó: $6 devueltos a su tarjeta');
  ok(ayuda(A.numero, "h.status || '|' || h.closed_by || '|' || h.refunded_cents") === 'resolved|user|600', 'solicitud terminada por la persona');
  ok(sql(`select count(*) from notifications where tpl = 'pay_refund' and ref_id = '${A.numero}'`) === '1', 'aviso: te devolvimos $6');
  await m.getByText('TERMINADA').first().waitFor(); ok(true, 'estado: terminada');
  // ── 4. Sin depósito: el negocio no puede, ella pide revisión y To'Latino resuelve ──
  const C = await reservar(m, 'Fade', ANDY, 2, false); terminar(C.numero);
  await m.goto(B + `/cita/${C.numero}/ayuda?de=compa`); const f2 = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f2.getByText('¿Qué pasó?').first().waitFor();
  await clic(f2.getByText('Esperé mucho a pesar de la cita')); await (await vis(f2.getByLabel('Qué pasó'))).fill('Llegué a mi hora y esperé 45 minutos sin que me avisaran.');
  await clic(f2.getByRole('radio', { name: /Solo quiero avisar/ }));
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.getByText('PENDIENTE').first().waitFor();
  await d.goto(B + `/panel/${BIZ}/hoy?det=cita:${C.numero}`); await det.getByText(/AYUDA CON LA CITA · H-/).first().waitFor();
  await clic(det.getByText('No puedo', { exact: true }));
  ok(!!(await vis(det.getByText(/No pagó nada en la app/))), 'detalle: no pagó nada en la app, se arregla en el local');
  await (await vis(det.locator('textarea'))).fill('Ese día se nos juntaron dos citas, disculpa la espera.');
  await clic(det.getByRole('button', { name: 'Enviar respuesta' }));
  ok(await espera(() => ayuda(C.numero, "h.status || '|' || h.decision"), 'answered|no') === 'answered|no', 'respondida: no puede');
  await m.goto(B + `/cita/${C.numero}/ayuda?de=compa`); await m.getByText('NO PUDO').first().waitFor();
  await clic(m.getByRole('button', { name: 'Pedir revisión a To’Latino' }));
  ok(await espera(() => ayuda(C.numero, "h.status || '|' || h.escalated_by"), 'escalated|user') === 'escalated|user', 'pidió revisión: pasa a To’Latino');
  ok(sql(`select count(*) from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id join operations o on o.id = h.operation_id where q.queue = 'sop' and q.status = 'open' and o.user_id = ${MARISOL} and o.business_id = '${BIZ}'`) === '1', 'cola de soporte: 1 caso');
  await m.getByText('EN REVISIÓN DE TO’LATINO').first().waitFor(); ok(true, 'estado: en revisión de To’Latino');
  // ── 5. Con depósito y sin respuesta en 24 h: To'Latino resuelve y devuelve ──
  const E = await reservar(m, 'Fade', LUIS, 3, true);
  await d.goto(B + `/panel/${BIZ}/hoy?det=cita:${E.numero}`); await clic(det.getByRole('button', { name: 'Confirmar' }));
  ok(await espera(() => pago(E.numero), 'captured|1000|0') === 'captured|1000|0', `${E.numero}: depósito cobrado`);
  terminar(E.numero);
  await m.goto(B + `/cita/${E.numero}/ayuda?de=compa`); const f3 = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f3.getByText('¿Qué pasó?').first().waitFor();
  await clic(f3.getByText('Cobraron más del precio publicado')); await (await vis(f3.getByLabel('Qué pasó'))).fill('El precio publicado era $28 y me cobraron $35 en el local.');
  await f3.locator('input[type="file"]').first().setInputFiles(FOTO); await f3.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await clic(f3.getByRole('radio', { name: /Que me devuelvan/ })); await (await vis(f3.getByLabel('Cuánto'))).fill('7');
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click(); await m.getByText('PENDIENTE').first().waitFor();
  ok(ayuda(E.numero, "h.reason || '|' || h.amount_cents") === 'cobro|700', 'cobraron más: pide $7');
  sql(`update help_requests set created_at = now() - interval '25 hours' where operation_id = (select id from operations where number = '${E.numero}')`);
  await m.goto(B + `/cita/${E.numero}/ayuda?de=compa`); await m.getByText('EN REVISIÓN DE TO’LATINO').first().waitFor();
  ok(ayuda(E.numero, "h.status || '|' || h.escalated_by") === 'escalated|system', 'sin respuesta en 24 h → To’Latino');
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(a); a.on('pageerror', e => err.push('admin ' + e.message));
  await entrar(a, '5705550199');
  const caso = sql(`select q.id from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id join operations o on o.id = h.operation_id where q.queue = 'sop' and q.status = 'open' and o.number = '${E.numero}' order by q.id desc limit 1`); // 9a: subject_id se repite en otras colas
  await a.goto(B + `/admin/colas?cola=sop&caso=${caso}`); await a.getByText('DEVOLVIBLE A LA TARJETA').first().waitFor();
  ok(!!(await vis(a.getByText(/Ayuda con una cita/).first())), 'admin: «Ayuda con una cita» con lo devolvible ($10 de depósito)');
  await a.screenshot({ path: OUT + 'e6-admin-sop.png', fullPage: true });
  await clic(a.getByText('Resolver y devolver', { exact: true })); await clic(a.getByText(/tienes razón. Te devolvemos lo cobrado de más/));
  await clic(a.getByRole('button', { name: 'Resolver y devolver' }));
  ok(await espera(() => pago(E.numero), 'partially_refunded|1000|700') === 'partially_refunded|1000|700', 'To’Latino resolvió y devolvió $7 a su tarjeta');
  ok(ayuda(E.numero, "h.status || '|' || h.closed_by || '|' || h.refunded_cents") === 'resolved|admin|700', 'solicitud resuelta por To’Latino');
  ok(sql(`select count(*) from notifications where tpl = 'help_done'`) !== '0', 'aviso al cliente: resuelta');
  await m.goto(B + `/cita/${E.numero}/ayuda?de=compa`); await m.getByText('RESPUESTA DE TO’LATINO').first().waitFor(); ok(true, 'cliente: ve la respuesta de To’Latino');
  // ── 6. Admin › Transacciones › Citas ──
  await a.goto(B + '/admin/transacciones?tab=cita'); await a.getByText(`Cita ${E.numero} · Barbería El Primo`).first().waitFor();
  ok(!!(await vis(a.getByText(/depósito \$10\.00 · VISA ·· 4242 DEVUELTO EN PARTE \$7\.00 · comisión \$0\.80/).first())), 'Transacciones › Citas: depósito, devuelto y comisión 8 %');
  ok(!!(await vis(a.getByText('CITAS 90 D'))), 'KPI: citas 90 días');
  await a.screenshot({ path: OUT + 'e7-admin-tx.png', fullPage: true });
  // ── 7. Desktop del formulario y del estado ──
  const md = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(md); md.on('pageerror', e => err.push('desk ' + e.message)); await entrar(md, '5705550122');
  await md.goto(B + `/cita/${A.numero}/ayuda?de=compa`); await md.getByText('TERMINADA').first().waitFor(); await md.screenshot({ path: OUT + 'e8-estado-d.png', fullPage: true });
  const G = await reservar(m, 'Fade', ANDY, 4, false); terminar(G.numero);
  await md.goto(B + `/cita/${G.numero}/ayuda?de=compa`); await md.getByText('¿Qué pasó?').first().waitFor(); await md.screenshot({ path: OUT + 'e9-form-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); limpiar(); limpiarAyuda(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
