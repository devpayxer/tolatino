// 4v · Pedir la fecha de una fiesta: Booking (3 pasos) con depósito RETENIDO → panel Confirmar (se cobra, ocupa el día, acuerdo v1,
// la otra solicitud del mismo día se declina sola y se libera) → cancelar a <30 días (se queda) y a ≥30 (devolución completa) →
// otra hora + «No me sirve» (se libera) → vence a las 24 h (se libera) → el negocio cancela (devolución completa) → «Terminó».
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', F = 'salon-imperial';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const esperaV = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
(async () => {
  // Limpieza: nada vivo del salón de pruebas anteriores; depósito $500, hasta 250, 1 por día, 30 días para cancelar.
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where business_id = '${F}' and kind = 'party' and status in ('pending', 'change_proposed', 'confirmed')`);
  sql(`update party_days set removed_at = now() where business_id = '${F}' and removed_at is null and source = 'booking'`);
  sql(`update fiesta_settings set deposit_cents = 50000, guests_max = 250, events_per_day = 1, cancel_full_days = 30 where business_id = '${F}'`);
  const sab3 = sql(`select (h + ((6 - extract(dow from h)::int + 7) % 7) + 21)::text from (select (now() at time zone 'America/New_York')::date as h) z`);
  const sab6 = sql(`select ('${sab3}'::date + 21)::text`), sab7 = sql(`select ('${sab3}'::date + 28)::text`), sab8 = sql(`select ('${sab3}'::date + 35)::text`);
  sql(`update party_days set removed_at = now() where business_id = '${F}' and day in ('${sab3}', '${sab6}', '${sab7}', '${sab8}') and removed_at is null`);
  const PACK = sql(`select id from items where business_id = '${F}' and svc_kind = 'pack' and removed_at is null and sell and status = 'live' order by sort, id limit 1`);
  const MAR = sql(`select id from users where phone = '+15705550122'`);
  sql(`update operations set status = 'cancelled' where user_id = '${MAR}' and kind = 'party' and status in ('pending', 'change_proposed')`);
  sql(`delete from user_event_plans where user_id = '${MAR}'`); // la Tu fecha de otra prueba preseleccionaría el evento
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  const pedir = async (dia, hora, shot) => {
    await m.goto(B + `/n/${F}/fiesta?s=${PACK}&d=${dia}`); await m.getByText('EVENTO').first().waitFor();
    await clic(m.getByRole('button', { name: 'Quinceañera' })); await clic(m.getByRole('radio', { name: /150 invitados/ }));
    if (shot) await m.screenshot({ path: OUT + 'v1-booking-paso1-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Continuar' }));
    await m.getByText('HORA DE INICIO').first().waitFor(); await clic(m.getByRole('radio', { name: hora, exact: true })); await m.screenshot({ path: OUT + 'dbg2.png', fullPage: true });
    if (shot) await m.screenshot({ path: OUT + 'v2-booking-paso2-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Continuar' }));
    await m.getByText('CÓMO SE PAGA').first().waitFor();
    if (shot) await m.screenshot({ path: OUT + 'v3-booking-paso3-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Enviar solicitud' }));
    await m.waitForURL(/\/fiesta\/F-\d+/, { timeout: 20000 });
    return m.url().match(/F-\d+/)[0];
  };
  // ── 1. Dos solicitudes para el mismo sábado (6 PM y 10 AM) ──
  const F1 = await pedir(sab3, '6:00 PM', true);
  ok(await espera(m.getByText('PENDIENTE')) && await espera(m.getByText(/La fecha no es tuya hasta que te la confirmen/)), `${F1}: PENDIENTE con la línea fija`);
  ok(sql(`select o.status || '|' || o.deposit_cents || '|' || p.status || '|' || p.kind from operations o join payments p on p.operation_id = o.id where o.number = '${F1}'`) === 'pending|50000|held|deposit', 'depósito $500 RETENIDO (no cobrado)');
  await m.screenshot({ path: OUT + 'v4-pendiente-m.png', fullPage: true });
  const F2 = await pedir(sab3, '10:00 AM', false);
  ok(sql(`select status from operations where number = '${F2}'`) === 'pending', `${F2}: otra solicitud el mismo día`);

  // ── 2. Rosa confirma la primera: se cobra, ocupa el día, acuerdo v1, la otra se declina y se libera ──
  const h = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(h, '5705550311');
  h.on('pageerror', e => err.push(e.message));
  await h.goto(B + `/panel/${F}/hoy`);
  ok(await espera(h.getByText(/FIESTAS QUE ESPERAN TU RESPUESTA · 2/)), 'panel Hoy: FIESTAS QUE ESPERAN TU RESPUESTA · 2');
  await h.goto(B + `/panel/${F}/hoy?det=fiesta:${F1}`); await h.getByText(/Otra solicitud para ese día/).first().waitFor();
  await h.screenshot({ path: OUT + 'v5-panel-detalle-d.png', fullPage: true });
  await clic(h.getByRole('button', { name: 'Confirmar', exact: true })); await h.getByText(/Confirmada: la fecha es suya/).first().waitFor();
  ok(await esperaV(() => sql(`select o.status || '|' || p.status from operations o join payments p on p.operation_id = o.id where o.number = '${F1}'`), 'confirmed|captured') === 'confirmed|captured', 'confirmada: depósito COBRADO');
  ok(sql(`select count(*) from party_days where operation_id = (select id from operations where number = '${F1}') and source = 'booking' and removed_at is null`) === '1', 'el día queda ocupado (party_days booking)');
  ok(sql(`select version || '|' || status || '|' || fee_cents || '|' || credit_cents || '|' || total_cents from written_totals where operation_id = (select id from operations where number = '${F1}')`).startsWith('1|accepted|'), 'acuerdo por escrito v1 (el paquete copiado, aceptado al enviar)');
  ok(await esperaV(() => sql(`select o.status || '|' || o.status_detail || '|' || p.status from operations o join payments p on p.operation_id = o.id where o.number = '${F2}'`), 'declined|lleno|released') === 'declined|lleno|released', `${F2}: declinada sola (día lleno) y depósito LIBERADO`);
  ok(sql(`select count(*) from operations where business_id = '${F}' and kind = 'party' and status = 'confirmed' and (scheduled_at at time zone 'America/New_York')::date = '${sab3}'`) === '1', 'nunca dos fiestas confirmadas el mismo día (events_per_day = 1)');
  await m.goto(B + `/fiesta/${F2}`);
  ok(await espera(m.getByText('NO PUDIERON')) && await espera(m.getByText(/FECHAS LIBRES EN/)), `${F2}: NO PUDIERON con fechas libres`);
  await m.screenshot({ path: OUT + 'v6-no-pudieron-m.png', fullPage: true });
  await m.goto(B + `/fiesta/${F1}`);
  ok(await espera(m.getByText('FECHA CONFIRMADA')) && await espera(m.getByText(/El acuerdo por escrito · versión 1/)), `${F1}: FECHA CONFIRMADA con el acuerdo`);
  await m.screenshot({ path: OUT + 'v7-confirmada-m.png', fullPage: true });

  // ── 3. Cancelar a menos de 30 días: el depósito se queda con el negocio ──
  await clic(m.getByRole('button', { name: 'Cancelar la fecha' })); await m.getByText(/Faltan menos de 30 días/).first().waitFor();
  await clic(m.getByRole('button', { name: 'Sí, cancelar' })); await m.getByText('CANCELADA').first().waitFor();
  ok(sql(`select o.status || '|' || (o.details->>'perdio') || '|' || p.status || '|' || p.refunded_cents from operations o join payments p on p.operation_id = o.id where o.number = '${F1}'`) === 'cancelled|true|captured|0', 'cancelar a <30 días: el depósito se queda (sin devolución)');
  ok(sql(`select count(*) from party_days where operation_id = (select id from operations where number = '${F1}') and removed_at is null`) === '0', 'el día se libera en el calendario');

  // ── 4. Cancelar a 30 días o más: devolución completa ──
  const F3 = await pedir(sab8, '6:00 PM', false);
  await h.goto(B + `/panel/${F}/hoy?det=fiesta:${F3}`); await clic(h.getByRole('button', { name: 'Confirmar', exact: true })); await h.getByText(/Confirmada/).first().waitFor();
  await esperaV(() => sql(`select p.status from payments p join operations o on o.id = p.operation_id where o.number = '${F3}'`), 'captured');
  await m.goto(B + `/fiesta/${F3}`); await clic(m.getByRole('button', { name: 'Cancelar la fecha' })); await m.getByText(/te devolvemos \$500/).first().waitFor();
  await clic(m.getByRole('button', { name: 'Sí, cancelar' })); await m.getByText('CANCELADA').first().waitFor();
  ok(await esperaV(() => sql(`select p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${F3}'`), '50000') === '50000', 'cancelar a ≥30 días: devolución completa de $500');

  // ── 5. Otra hora → «No me sirve» → se libera ──
  const F4 = await pedir(sab6, '6:00 PM', false);
  await h.goto(B + `/panel/${F}/hoy?det=fiesta:${F4}`); await clic(h.getByRole('button', { name: 'Otra hora' }));
  await clic(h.getByRole('button', { name: '2:00 PM', exact: true })); await h.getByText(/Propusiste las 2:00 PM/).first().waitFor();
  await m.goto(B + `/fiesta/${F4}`); ok(await espera(m.getByText('TE PROPONEN UN CAMBIO')), `${F4}: TE PROPONEN UN CAMBIO`);
  await m.screenshot({ path: OUT + 'v8-otra-hora-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'No me sirve' })); await m.getByText('CANCELADA').first().waitFor();
  ok(await esperaV(() => sql(`select p.status from payments p join operations o on o.id = p.operation_id where o.number = '${F4}'`), 'released') === 'released', '«No me sirve»: depósito liberado');

  // ── 6. Aceptar la otra hora → confirmada y cobrada ──
  const F5 = await pedir(sab6, '6:00 PM', false);
  await h.goto(B + `/panel/${F}/hoy?det=fiesta:${F5}`); await clic(h.getByRole('button', { name: 'Otra hora' })); await clic(h.getByRole('button', { name: '1:00 PM', exact: true })); await h.getByText(/Propusiste las 1:00 PM/).first().waitFor();
  await m.goto(B + `/fiesta/${F5}`); await clic(m.getByRole('button', { name: 'Aceptar esta hora' })); await m.getByText('FECHA CONFIRMADA').first().waitFor();
  ok(await esperaV(() => sql(`select o.status || '|' || to_char(o.scheduled_at at time zone 'America/New_York', 'HH24:MI') || '|' || p.status from operations o join payments p on p.operation_id = o.id where o.number = '${F5}'`), 'confirmed|13:00|captured') === 'confirmed|13:00|captured', 'acepta la otra hora: confirmada a la 1 PM y cobrada');

  // ── 7. El negocio cancela con motivo → devolución completa ──
  await h.goto(B + `/panel/${F}/hoy?det=fiesta:${F5}`); await clic(h.getByRole('button', { name: 'Cancelar la fecha' }));
  await (await vis(h.getByPlaceholder(/se nos dañó/))).fill('Se nos inundó el salón');
  await clic(h.getByRole('button', { name: 'Sí, cancelar y devolver' })); await h.getByText(/Cancelada: el cliente recibe/).first().waitFor();
  ok(await esperaV(() => sql(`select o.cancelled_by || '|' || p.refunded_cents from operations o join payments p on p.operation_id = o.id where o.number = '${F5}'`), 'business|50000') === 'business|50000', 'el negocio cancela: devolución completa');
  await m.goto(B + `/fiesta/${F5}`); ok(await espera(m.getByText(/Se nos inundó el salón/)), 'el cliente ve el motivo');

  // ── 8. Vence a las 24 h sin respuesta → se libera ──
  const F6 = await pedir(sab7, '6:00 PM', false);
  sql(`update operations set respond_by = now() - interval '1 minute' where number = '${F6}'`);
  await m.goto(B + `/fiesta/${F6}`); ok(await espera(m.getByText('SIN RESPUESTA')), `${F6}: SIN RESPUESTA`);
  ok(await esperaV(() => sql(`select p.status from payments p join operations o on o.id = p.operation_id where o.number = '${F6}'`), 'released') === 'released', 'vencida: depósito liberado');

  // ── 9. Pasó la fiesta: «Terminó» ──
  const F7 = await pedir(sab7, '6:00 PM', false);
  await h.goto(B + `/panel/${F}/hoy?det=fiesta:${F7}`); await clic(h.getByRole('button', { name: 'Confirmar', exact: true })); await h.getByText(/Confirmada/).first().waitFor();
  sql(`update operations set scheduled_at = now() - interval '7 hours' where number = '${F7}'`);
  await h.goto(B + `/panel/${F}/hoy?det=fiesta:${F7}`); await clic(h.getByRole('button', { name: 'Terminó', exact: true })); await h.getByText(/le pedimos su reseña/).first().waitFor();
  ok(sql(`select status from operations where number = '${F7}'`) === 'done', 'Terminó: FIESTA TERMINADA');
  await m.goto(B + `/fiesta/${F7}`); ok(await espera(m.getByText('FIESTA TERMINADA')), 'el cliente ve FIESTA TERMINADA');

  // ── Mi cuenta y Super Admin ──
  await m.goto(B + `/cuenta/citas?f=past`); ok(await espera(m.getByText(/SÁBADO · 6 HORAS/).first()), 'Mi cuenta › Citas y reservas: las fiestas');
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(ad, '5705550199');
  await ad.goto(B + `/admin/transacciones?tab=fiesta`);
  ok(await espera(ad.getByText(new RegExp(`Fiesta ${F1}`))) && await espera(ad.getByText(/se quedó con el negocio/).first()) && await espera(ad.getByText(/canceló el negocio/).first()), 'Super Admin › Transacciones › Fiestas: depósito, acuerdo y quién canceló');
  await ad.screenshot({ path: OUT + 'v10-admin-tx-d.png', fullPage: true });
  // ── 10. Escritorio del Booking ──
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(d, '5705550122');
  await d.goto(B + `/n/${F}/fiesta?s=${PACK}&d=${sab8}`); await espera(d.getByText('Pedir la fecha'));
  await d.screenshot({ path: OUT + 'v9-booking-d.png', fullPage: true });
  sql(`update party_days set removed_at = now() where business_id = '${F}' and source = 'booking' and removed_at is null and day in ('${sab3}', '${sab6}', '${sab7}', '${sab8}')`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK fie4v');
})().catch((e) => { console.error(e); process.exit(1); });
