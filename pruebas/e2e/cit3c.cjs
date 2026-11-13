const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
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
  sql(`delete from notifications where ref_kind = 'appointment'`);
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
(async () => {
  limpiar();
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); globalThis.__m = m; await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await entrar(d, '5705550166');
  d.on('pageerror', e => err.push('panel ' + e.message));
  // 1. Solicitud con depósito → el panel la ve en Hoy con Confirmar / Otra hora / No puedo
  const A = await reservar(m, 'Fade', LUIS, 1, true);
  ok(op(A.numero, 'status') === 'pending' && pago(A.numero) === 'held|1000|0', `${A.numero}: pendiente, depósito retenido`);
  await d.goto(B + `/panel/${BIZ}/hoy`); await d.getByText(`Cita #${A.numero}`).first().waitFor();
  ok(!!(await vis(d.getByRole('button', { name: 'Otra hora' }).first())), 'Hoy: la cita espera respuesta con Confirmar / Otra hora / No puedo');
  await d.screenshot({ path: OUT + 'c1-hoy-d.png', fullPage: true });
  await clic(d.getByText(`Cita #${A.numero}`)); const det = d.locator('[data-screen-label="Panel v2 · detalle"]'); await det.getByText('Nunca se confirma sola', { exact: false }).waitFor();
  ok(!!(await vis(det.getByText(/retenido hasta que confirmes/))), 'detalle: depósito retenido hasta que confirmes');
  await d.screenshot({ path: OUT + 'c2-detalle-d.png', fullPage: true });
  await det.getByRole('button', { name: 'Otra hora' }).click(); await d.getByText(/ya ve la hora que le propones/).first().waitFor();
  ok(op(A.numero, 'status') === 'change_proposed' && sql(`select count(*) from change_proposals where operation_id = (select id from operations where number = '${A.numero}') and status = 'open' and side = 'business'`) === '1', 'Otra hora: propuesta la siguiente hora libre');
  ok(nt('cita_alt', A.numero) === '1', 'aviso al cliente: te propone otra hora');
  // 2. El cliente acepta la otra hora → confirmada y depósito cobrado
  await m.goto(B + `/cita/${A.numero}`); await m.locator('[data-screen-label="Cita · otra hora propuesta"]').waitFor();
  await m.screenshot({ path: OUT + 'c3-otra-hora-m.png', fullPage: true });
  await m.getByRole('button', { name: 'Aceptar esta hora' }).click(); await m.getByText('Cita confirmada').first().waitFor();
  ok(op(A.numero, 'status') === 'confirmed' && pago(A.numero) === 'captured|1000|0', 'aceptó: confirmada, depósito cobrado');
  ok(nt('biz_cita_alt_ok', A.numero) === '1', 'aviso al negocio: aceptó la otra hora');
  const h1 = op(A.numero, "to_char(scheduled_at at time zone 'America/New_York', 'HH24:MI')");
  // 3. Cambiar hora (cita confirmada, Luis no confirma solo) → el negocio acepta el cambio
  await m.getByRole('button', { name: 'Cambiar hora' }).click(); await m.waitForURL(/cambiar=/);
  const bk = m.locator('[data-screen-label="APP-NEG-BOOKING · móvil"]'); await bk.getByText(/Cambiando tu cita/).waitFor();
  await bk.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) / }).nth(2).click(); await ESPERA(m);
  await bk.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /^3:00 PM$/ }).first().click();
  const barra = m.locator('[data-screen-label="Booking · barra"]'); await barra.getByRole('button', { name: 'Continuar' }).click(); await bk.getByText('¿PARA QUIÉN ES?').waitFor(); await barra.getByRole('button', { name: 'Continuar' }).click(); await bk.getByText('ANTES DE ENVIAR').waitFor();
  ok(!!(await vis(bk.getByText('Ya pagado'))) && !(await vis(m.locator('[data-screen-label="Booking · método de pago"]'))), 'cambiar: el depósito ya pagado pasa, no pide tarjeta');
  await m.screenshot({ path: OUT + 'c4-cambiar-m.png', fullPage: true });
  await barra.getByRole('button', { name: 'Pedir el cambio' }).click(); await m.waitForURL(/\/cita\/C-\d+\?cambio=1/);
  await m.getByText(/Pediste cambiarla a/).waitFor(); ok(op(A.numero, "to_char(scheduled_at at time zone 'America/New_York', 'HH24:MI')") === h1, 'la hora actual sigue hasta que confirmen');
  ok(nt('biz_cita_chg', A.numero) === '1', 'aviso al negocio: pide cambiar su cita');
  await d.goto(B + `/panel/${BIZ}/hoy?det=cita:${A.numero}`); await det.getByText(/pide cambiarla a/).waitFor();
  await det.getByRole('button', { name: 'Aceptar el cambio' }).click(); await d.getByText(/ya ve su nueva hora/).first().waitFor();
  ok(op(A.numero, "to_char(scheduled_at at time zone 'America/New_York', 'HH24:MI')") === '15:00' && pago(A.numero) === 'captured|1000|0', 'cambio aceptado: 3:00 PM, mismo depósito');
  ok(nt('cita_chg_ok', A.numero) === '1', 'aviso al cliente: cambio confirmado');
  // 4. Cancelar a tiempo (faltan más de 4 h) → se devuelve el depósito
  await m.goto(B + `/cita/${A.numero}`); await m.getByText('Cancelar cita').click(); const sh = m.locator('[data-screen-label="Cita · cancelar"]'); await sh.getByText(/es gratis/).waitFor();
  await m.screenshot({ path: OUT + 'c5-cancelar-m.png', fullPage: false });
  await sh.getByRole('button', { name: 'Sí, cancelar' }).click(); await m.getByText(/Cancelaste a tiempo/).waitFor();
  ok(op(A.numero, 'status') === 'cancelled' && pago(A.numero) === 'refunded|1000|1000', 'cancelada a tiempo: depósito devuelto completo');
  ok(nt('biz_cita_cx', A.numero) === '1' && nt('pay_refund', A.numero) === '1', 'avisos: al negocio (canceló) y al cliente (te devolvimos)');
  // 5. Vence sin respuesta → el depósito se libera
  const V = await reservar(m, 'Fade', LUIS, 1, true);
  sql(`update operations set respond_by = now() - interval '1 minute' where number = '${V.numero}'`);
  await m.goto(B + `/cita/${V.numero}`); await m.getByText('Sin respuesta').first().waitFor();
  ok(op(V.numero, 'status') === 'expired' && pago(V.numero) === 'released|1000|0' && nt('cita_exp', V.numero) === '1', `${V.numero}: venció, depósito liberado, aviso al cliente`);
  // 6. Andy (sin depósito): confirmar → llegó → terminada → calificar
  const T = await reservar(m, 'Corte clásico', ANDY, 0, false);
  await d.goto(B + `/panel/${BIZ}/hoy?det=cita:${T.numero}`); await det.getByRole('button', { name: 'Confirmar' }).click(); await d.getByText(/ya ve su cita confirmada/).first().waitFor();
  ok(op(T.numero, 'status') === 'confirmed' && nt('cita_ok', T.numero) === '1', `${T.numero}: confirmada, aviso cita_ok`);
  sql(`update operations set scheduled_at = now() - interval '5 minutes' where number = '${T.numero}'`);
  await d.goto(B + `/panel/${BIZ}/hoy?det=cita:${T.numero}`); await det.getByRole('button', { name: 'Llegó · en atención' }).click(); await d.getByText(/en atención/).first().waitFor();
  await d.goto(B + `/panel/${BIZ}/hoy?det=cita:${T.numero}`); await det.getByRole('button', { name: 'Terminada · cobrar' }).click(); await d.getByText(/Anotado · terminada/).first().waitFor();
  ok(op(T.numero, "status || '|' || status_detail") === 'done|done', 'llegó → terminada');
  await m.goto(B + `/cita/${T.numero}`); await m.getByText('¿Cómo te quedó?').waitFor(); await m.screenshot({ path: OUT + 'c6-terminada-m.png', fullPage: true });
  await m.getByRole('button', { name: '5 estrellas' }).click(); await m.waitForURL(/\/resena\?pedido=C-/); await m.getByText(`Cita ${T.numero}`).first().waitFor(); ok(true, 'calificar: la reseña sale verificada con la cita');
  // 7. No llegó (con depósito, ya pasó la hora) → el depósito se queda
  const N = await reservar(m, 'Fade', LUIS, 1, true);
  await d.goto(B + `/panel/${BIZ}/hoy?det=cita:${N.numero}`); await det.getByRole('button', { name: 'Confirmar' }).click(); await d.getByText(/ya ve su cita confirmada/).first().waitFor();
  sql(`update operations set scheduled_at = now() - interval '20 minutes' where number = '${N.numero}'`);
  await d.goto(B + `/panel/${BIZ}/hoy?det=cita:${N.numero}`); await det.getByText(/se queda contigo/).waitFor(); await det.getByRole('button', { name: 'No llegó' }).click(); await d.getByText(/no llegó/i).first().waitFor();
  ok(op(N.numero, "status || '|' || status_detail") === 'done|noshow' && pago(N.numero) === 'captured|1000|0', 'no llegó: el depósito se queda');
  // 8. Voy tarde (confirmada, dentro de 2 h)
  const L = await reservar(m, 'Corte clásico', ANDY, 0, false);
  await d.goto(B + `/panel/${BIZ}/hoy?det=cita:${L.numero}`); await det.getByRole('button', { name: 'Confirmar' }).click(); await d.getByText(/ya ve su cita confirmada/).first().waitFor();
  sql(`update operations set scheduled_at = now() + interval '60 minutes' where number = '${L.numero}'`);
  await m.goto(B + `/cita/${L.numero}`); await m.getByRole('button', { name: 'Voy tarde' }).click(); await m.locator('[data-screen-label="Cita · voy tarde"]').getByRole('button', { name: '10 min' }).click();
  await m.getByText(/llegas 10 min tarde/).first().waitFor(); ok(nt('biz_cita_tarde', L.numero) === '1' && op(L.numero, "details->>'late'") === '10', 'voy tarde: 10 min, aviso al negocio');
  // 9b-2 · «Hoy» es el día del negocio: pasadas las 11 PM de Nueva York la cita de dentro de una hora cae mañana y Hoy no la trae (la app está bien).
  if (sql(`select (now() at time zone 'America/New_York')::date = ((now() + interval '60 minutes') at time zone 'America/New_York')::date`) === 't') { await d.goto(B + `/panel/${BIZ}/hoy`); await d.getByText(/LLEGA 10 MIN TARDE/).first().waitFor(); ok(true, 'Hoy muestra LLEGA 10 MIN TARDE'); }
  else console.log('  · Hoy no se comprueba: a esta hora la cita de dentro de una hora cae mañana (se corre de día en el CI programado)');
  // 9. Clientes › Citas y Mi cuenta
  await d.goto(B + `/panel/${BIZ}/clientes`); await d.getByText('Todas las citas que te piden', { exact: false }).waitFor();
  ok(!!(await vis(d.getByText(`Cita #${T.numero}`))), 'Clientes: lista de citas');
  await d.goto(B + `/panel/${BIZ}/clientes?f=no`); ok(!!(await vis(d.getByText(`Cita #${V.numero}`).first())), 'Clientes: filtro «No se dieron»');
  await d.screenshot({ path: OUT + 'c7-clientes-d.png', fullPage: true });
  await m.goto(B + '/cuenta/citas?f=past'); await m.getByText(/FADE CON LUIS/).first().waitFor(); ok(true, 'Mi cuenta: las citas con su servicio y con quién');
  await m.screenshot({ path: OUT + 'c8-micuenta-m.png', fullPage: true });
  ok(Number(sql(`select count(*) from audit_entries where action like 'cita.%' and target_id = '${BIZ}' and at > now() - interval '10 minutes'`)) >= 6, 'auditoría de cada respuesta del panel');
  const ancho = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(ancho <= 0, 'teléfono sin scroll de lado');
  ok(err.length === 0, 'sin errores en la consola: ' + err.join(' | '));
  await b.close(); limpiar(); console.log('LISTO');
})().catch(async (e) => { console.error('FALLO', e.message); try { await globalThis.__m.screenshot({ path: OUT + 'c-fallo.png', fullPage: true }); console.error('URL', globalThis.__m.url()); console.error((await globalThis.__m.locator('[role=alert]').allInnerTexts()).join(' | ')); } catch {} process.exit(1); });
