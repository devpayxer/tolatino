const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(600); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const MARISOL = "(select id from users where phone='+15705550122')";
const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const op = (n, c = "status") => sql(`select ${c} from operations where number='${n}'`);

(async () => {
  sql(`update business_hours set ranges='[["11:00","22:00"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update operations set status='cancelled' where kind='table' and user_id=${MARISOL} and status in ('pending','confirmed','change_proposed')`);
  sql(`delete from reservation_holds`); sql(`update reservation_settings set auto_confirm=false where business_id='${BIZ}'`);
  const manana = +sql(`select extract(dow from (now() at time zone 'America/New_York')::date + 1)`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'movil');

  // 0 · Sin sesión: la pestaña se ve y «Continuar» lleva a Entra con lo elegido
  await m.goto(B + '/n/' + BIZ);
  const tabR = await vis(m.getByText('Reservaciones', { exact: true })); ok(!!tabR, 'pestaña Reservaciones en la ficha Pro');
  const quick = await vis(m.locator('[data-screen-label="Ficha · reservar mesa"]'));
  await quick.scrollIntoViewIfNeeded(); ok(await quick.isVisible(), 'Resumen: tarjeta «Reservar mesa»');
  await quick.getByText('2', { exact: true }).click(); await quick.getByText(/^\d{1,2}:\d{2} (AM|PM)$/).first().waitFor();
  const qSlots = await quick.locator('span').filter({ hasText: /^\d{1,2}:\d{2} (AM|PM)$/ }).count();
  ok(qSlots > 0 && qSlots <= 4, `tarjeta rápida: ${qSlots} horas con mesa para 2`);
  await shot(m, 'r1-resumen-rapida.png');
  await (await vis(m.getByText('Reservaciones', { exact: true }))).click();
  const tab = m.locator('[data-screen-label="Ficha · reservaciones"]').first();
  await tab.getByText('¿Cuántos son?').waitFor(); ok(true, 'pestaña pide primero cuántos son');
  await shot(m, 'r2-tab-cuantos.png');
  await tab.getByText('2', { exact: true }).click();
  await tab.getByText(DOW[manana], { exact: true }).first().click();
  await tab.getByText(/^ALMUERZO ·/).waitFor();
  await tab.getByText('1:00 PM', { exact: true }).first().click();
  const bar = m.locator('[data-screen-label="Ficha · barra de pedido"]');
  ok(/1:00 PM/.test(await bar.innerText()), 'barra: día y hora elegidos');
  await shot(m, 'r3-tab-elegida.png');
  await bar.getByText('Continuar').click(); await m.waitForURL(/\/entrar/);
  ok(/p%3D2.*h%3D780/.test(m.url()), 'sin sesión → Entra conserva personas, día y hora');

  // 1 · Con sesión: retener 5 min, detalles y enviar
  await entrar(m, '5705550122');
  await m.goto(B + `/n/${BIZ}?tab=rsv&p=2&d=1&h=780`);
  await bar.getByText('Continuar').click(); await m.waitForURL(/\/reservar\?hold=/);
  ok(+sql(`select count(*) from reservation_holds where user_id=${MARISOL}`) === 1, 'se retiene la mesa (1 retención)');
  const det = m.locator('[data-screen-label="APP-NEG-RESERVA · móvil"]');
  await det.getByText('Te guardamos esta mesa').waitFor();
  const t0 = await det.locator('span.font-mono').filter({ hasText: /^\d:\d\d$/ }).first().innerText();
  ok(/^[45]:\d\d$/.test(t0), `cuenta regresiva ${t0}`);
  await det.getByText('Cumpleaños', { exact: true }).click(); await det.getByText('Alergias', { exact: true }).click();
  ok(await det.locator('textarea').getAttribute('placeholder') === 'Cuéntales las alergias: ej. mariscos, maní…', 'con Alergias la nota pide cuáles');
  await det.locator('textarea').fill('Mariscos. Vamos con mi mamá.');
  await shot(m, 'r4-detalles.png', true);
  await m.locator('[data-screen-label="Reserva · barra"]').getByText('Enviar solicitud').click();
  await m.waitForURL(/\/reserva\/R-\d+$/); const n1 = m.url().split('/').pop();
  ok(op(n1) === 'pending', `enviada ${n1} · pendiente`);
  ok(op(n1, "details->>'occ'") === 'cumple' && op(n1, "details->'needs'->>0") === 'alergia' && op(n1, 'party_size') === '2', 'guarda ocasión, necesidades y personas');
  ok(op(n1, "to_char(scheduled_at at time zone 'America/New_York','HH24:MI')") === '13:00', 'hora 1:00 PM del día siguiente');
  ok(+sql(`select count(*) from reservation_holds where user_id=${MARISOL}`) === 0, 'la retención se borra al enviar');
  const st = m.locator('[data-screen-label="APP-NEG-RESERVA-ESTADO · móvil"]');
  await st.getByText('Solicitud enviada').first().waitFor(); await st.getByText('ESPERANDO RESPUESTA').waitFor();
  ok(await st.getByText('“Mariscos. Vamos con mi mamá.”').isVisible(), 'detalles muestran la nota');
  await shot(m, 'r5-estado-pend.png', true);

  // 2 · La ficha muestra «Tu reservación»
  await m.goto(B + '/n/' + BIZ);
  ok(!!(await vis(m.getByText('TU RESERVACIÓN'))), 'Resumen: tarjeta «Tu reservación» PENDIENTE');

  // 3 · Cambiar la solicitud (pendiente): misma solicitud, nueva hora
  await m.goto(B + '/reserva/' + n1); await st.getByText('Cambiar solicitud').click();
  await tab.getByText('Cambiando tu solicitud').waitFor(); ok(true, 'pestaña en modo cambio');
  await tab.getByText('1:30 PM', { exact: true }).first().click();
  await bar.getByText('Continuar').click(); await m.waitForURL(/\/reservar\?hold=/);
  await det.getByText('Actualizas tu solicitud').waitFor();
  await m.locator('[data-screen-label="Reserva · barra"]').getByText('Actualizar solicitud').click();
  await m.waitForURL(new RegExp(`/reserva/${n1}$`));
  ok(op(n1, "to_char(scheduled_at at time zone 'America/New_York','HH24:MI')") === '13:30' && op(n1) === 'pending', 'mismo número, ahora 1:30 PM');

  // 4 · Te proponen otra hora → aceptar
  sql(`update operations set status='change_proposed', answered_at=now() where number='${n1}'`);
  sql(`insert into change_proposals (operation_id, kind, proposed) select id, 'time', '{"at":"14:00","area":"terraza"}'::jsonb from operations where number='${n1}'`);
  await m.reload(); await st.getByText('TE PROPONEN UN CAMBIO').first().waitFor();
  ok(await st.getByText('2:00 PM · Terraza').isVisible(), 'propuesta: 2:00 PM · Terraza');
  await shot(m, 'r6-propuesta.png', true);
  await st.getByText('Aceptar a las 2:00 PM').click(); await st.getByText('Listo: tu mesa es a las 2:00 PM.').waitFor();
  ok(op(n1) === 'confirmed' && op(n1, "details->>'area'") === 'terraza', 'aceptada → confirmada en Terraza');
  await st.getByText('Tu mesa está confirmada').waitFor();
  ok(await st.getByText('Calendario', { exact: true }).isVisible() && await st.getByText('Cómo llegar').isVisible(), 'confirmada: Calendario · Compartir · Cómo llegar · Llamar');

  // 5 · Voy tarde (hoy, faltando ≤ 2 h)
  sql(`update operations set scheduled_at = greatest(now() + interval '4 minutes', least(date_trunc('hour', now()) + interval '1 hour', (date_trunc('day', now() at time zone 'America/New_York') + interval '23 hours 58 minutes') at time zone 'America/New_York')) where number='${n1}'`);
  await m.reload(); await st.getByText('¿VAS TARDE?').waitFor();
  await st.getByText('15 min', { exact: true }).click(); await st.getByText('Avisar a Sabor Dominicano').click();
  await st.getByText('Avisaste que llegas 15 min tarde').waitFor(); ok(op(n1, "details->>'late'") === '15', 'aviso de 15 min tarde guardado');
  await shot(m, 'r7-confirmada-tarde.png', true);

  // 6 · Cancelar (tardía: faltan < 2 h)
  await st.getByText('Cancelar reservación').click();
  const sh = m.locator('[data-screen-label="Reserva · cancelar"]');
  await sh.getByText(/cancelación tardía/).waitFor(); ok(true, 'aviso de cancelación tardía (sin cargo)');
  await sh.getByText('Cambié de planes').click(); await shot(m, 'r8-cancelar.png');
  await sh.getByText('Sí, cancelar').click(); await st.getByText('Cancelaste tu reservación').first().waitFor();
  ok(op(n1) === 'cancelled' && op(n1, 'cancel_reason') === 'planes', 'cancelada con motivo');
  ok(sql(`select note->>'es' from operation_events e join operations o on o.id=e.operation_id where o.number='${n1}' and e.kind='cancelled'`) === 'Cancelación tardía · sin cargo', 'historial: cancelación tardía');

  // 7 · Se libera la mesa a los 5 min
  await m.goto(B + `/n/${BIZ}?tab=rsv&p=4&d=1&h=1110`); await bar.getByText('Continuar').click(); await m.waitForURL(/\/reservar\?hold=/);
  sql(`update reservation_holds set expires_at = now() - interval '1 second' where user_id=${MARISOL}`);
  await m.reload(); await det.getByText('Se liberó la mesa', { exact: true }).first().waitFor();
  ok(await det.getByText('Elegir la hora otra vez').isVisible(), 'pasados 5 min: «Se liberó la mesa»');
  await shot(m, 'r9-liberada.png');

  // 8 · No pudo → horas con mesa ese día
  await m.goto(B + `/n/${BIZ}?tab=rsv&p=4&d=1&h=1110`); await bar.getByText('Continuar').click(); await m.waitForURL(/\/reservar\?hold=/);
  await m.locator('[data-screen-label="Reserva · barra"]').getByText('Enviar solicitud').click(); await m.waitForURL(/\/reserva\/R-\d+$/);
  const n2 = m.url().split('/').pop(); sql(`update operations set status='declined', answered_at=now() where number='${n2}'`);
  await m.reload(); await st.getByText('HORAS CON MESA ESE DÍA').waitFor();
  ok(await st.getByText('Reservar otra vez').isVisible(), 'no pudo: otras horas + Reservar otra vez');
  await shot(m, 'r10-no-pudo.png', true);

  // 9 · Grupo grande (más que la mesa más grande)
  await m.goto(B + `/n/${BIZ}?tab=rsv`); await tab.getByText(/^\d+\+$/).click();
  ok(await tab.getByText(/como evento privado/).isVisible(), 'grupo grande: evento privado + Llamar');

  // 10 · Escritorio
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'desk');
  await entrar(d, '5705550122'); await d.goto(B + `/n/${BIZ}?tab=rsv&p=2&d=1&h=1140`);
  const riel = d.locator('[data-screen-label="Ficha · reservaciones · tu mesa"]').last();
  await riel.getByText('7:00 PM').waitFor(); ok(true, 'escritorio: riel «Tu mesa» con la hora');
  await shot(d, 'r11-tab-d.png');
  await riel.getByText('Continuar').click(); await d.waitForURL(/\/reservar\?hold=/);
  await d.locator('[data-screen-label="APP-NEG-RESERVA · desktop"]').getByText('Te guardamos esta mesa').waitFor(); await shot(d, 'r12-detalles-d.png');
  await d.locator('[data-screen-label="APP-NEG-RESERVA · desktop"]').getByText('Enviar solicitud').click(); await d.waitForURL(/\/reserva\/R-\d+$/);
  await d.locator('[data-screen-label="APP-NEG-RESERVA-ESTADO · desktop"]').getByText('ESPERANDO RESPUESTA').waitFor(); await shot(d, 'r13-estado-d.png');

  // 11 · Free: sin pestaña ni tarjeta
  sql(`update business_stats_cache set plan='free' where business_id='${BIZ}'`);
  try { await m.goto(B + '/n/' + BIZ); ok(!(await m.getByText('Reservaciones', { exact: true }).count()) && !(await m.locator('[data-screen-label="Ficha · reservar mesa"]').count()), 'Free: sin Reservaciones'); }
  finally { sql(`update business_stats_cache set plan='pro' where business_id='${BIZ}'`); }

  sql(`update operations set status='cancelled' where kind='table' and user_id=${MARISOL} and status in ('pending','confirmed','change_proposed')`);
  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  await b.close(); console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
