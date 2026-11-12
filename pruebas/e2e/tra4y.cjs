// 4y-1 · Reservar un viaje: asiento (retener el total → confirmar = cobrar; los asientos se cuentan solos; la última plaza no se
// vende dos veces) · cancelar ≥24 h (devolución completa) y <24 h (se cobra la mitad) · otra salida (aceptar / «No me sirve») ·
// vence sin respuesta · la salida (va tarde, salió, llegó; Abordó) · el negocio cancela la salida (devolución a todos) · vehículo completo.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', V = 'van-express-nyc';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
// 9b-1 · Los servicios de Van Express por su nombre (antes los ids 870 y 872 de una base vieja: en una base nueva son otros).
const svcVan = (n) => sql(`select id from items where business_id = 'van-express-nyc' and name->>'es' = '${n}' and removed_at is null order by id limit 1`);
const SVC = svcVan('Hazleton → Washington Heights'), PRIV = svcVan('Van completa a Nueva York');
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const esperaV = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const pay = (n) => sql(`select o.status || '|' || p.status || '|' || p.amount_cents || '|' || p.refunded_cents from operations o join payments p on p.operation_id = o.id where o.number = '${n}'`);
const run = (id) => sql(`select seats_booked || '|' || status from trip_runs where id = ${id}`);
(async () => {
  // Limpieza: nada vivo de la van de pruebas anteriores; salidas limpias.
  const vivos = `select id from operations where business_id = '${V}' and kind = 'trip' and status in ('pending', 'change_proposed', 'confirmed')`;
  sql(`update run_seats set status = 'cancelled' where operation_id in (${vivos})`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where id in (${vivos})`);
  sql(`update trip_runs set seats_outside = 0, seats_booked = 0, status = 'scheduled', late_until = null where business_id = '${V}' and run_at > now() - interval '3 hours'`);
  // Salidas que una corrida anterior movió a la 1:30 PM: se mandan lejos al pasado (no chocan con la de esta corrida).
  sql(`update trip_runs set status = 'cancelled', run_at = run_at - interval '400 days' - make_interval(mins => id::int) where business_id = '${V}' and extract(minute from run_at at time zone 'America/New_York') = 30 and run_at > now() - interval '3 days'`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  // Abre la reserva una vez para que existan las salidas de la semana; elige días 2 y 3 desde hoy.
  await m.goto(B + `/n/${V}/viaje?s=${SVC}`); await m.getByText('PASAJEROS').first().waitFor().catch(() => {});
  const d2 = sql(`select ((now() at time zone 'America/New_York')::date + 2)::text`), d3 = sql(`select ((now() at time zone 'America/New_York')::date + 3)::text`);
  const runDe = (ymd, h) => sql(`select id from trip_runs where item_id = ${SVC} and (run_at at time zone 'America/New_York')::date = '${ymd}' and extract(hour from run_at at time zone 'America/New_York') = ${h}`);
  const R1 = runDe(d2, 13), R2 = runDe(d2, 19), R3 = runDe(d3, 13);
  ok(R1 && R2 && R3, `salidas de la ruta: ${d2} 1 PM (${R1}), 7 PM (${R2}) y ${d3} 1 PM (${R3})`);
  const lbl = (ymd) => `${DOW[new Date(ymd + 'T12:00:00Z').getUTCDay()]} ${Number(ymd.slice(8))}`;
  const reservar = async (p, ymd, hora, adultos, shot) => {
    await p.goto(B + `/n/${V}/viaje?s=${SVC}`); await p.getByText('Tu viaje').first().waitFor();
    for (let i = 1; i < adultos; i++) await clic(p.getByText('+', { exact: true }));
    if (shot) await p.screenshot({ path: OUT + 'y1-reserva-paso1-m.png', fullPage: true });
    await clic(p.getByRole('button', { name: 'Continuar' }));
    await clic(p.getByRole('radio', { name: lbl(ymd) })); await clic(p.getByRole('radio', { name: hora, exact: true }));
    if (shot) await p.screenshot({ path: OUT + 'y2-reserva-paso2-m.png', fullPage: true });
    await clic(p.getByRole('button', { name: 'Continuar' })); await p.getByText(/Cancelas a menos de 24 h/).first().waitFor();
    if (shot) await p.screenshot({ path: OUT + 'y3-reserva-paso3-m.png', fullPage: true });
  };
  const enviar = async (p) => { await clic(p.getByRole('button', { name: 'Reservar', exact: true })); await p.waitForURL(/\/viaje\/V-\d+/, { timeout: 20000 }); return p.url().match(/V-\d+/)[0]; };

  // ── 1. Dos adultos en la salida de la 1 PM: se RETIENE el total, se apartan 2 asientos ──
  await reservar(m, d2, '1:00 PM', 2, true); const V1 = await enviar(m);
  ok(await espera(m.getByText('PENDIENTE')) && await espera(m.getByText(/El precio del viaje es cerrado/)), `${V1}: PENDIENTE con la línea fija`);
  ok(pay(V1) === 'pending|held|9000|0', 'retenido $90 (2 × $45), sin cobrar');
  ok(run(R1) === '2|scheduled', 'la salida cuenta 2 asientos (seats_booked derivado)');
  await m.screenshot({ path: OUT + 'y4-pendiente-m.png', fullPage: true });

  // ── 2. Wilson confirma: se cobra ──
  const w = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(w, '5705550322');
  w.on('pageerror', e => err.push(e.message));
  await w.goto(B + `/panel/${V}/hoy`);
  ok(await espera(w.getByText(/VIAJES QUE ESPERAN TU RESPUESTA · 1/)), 'panel Hoy: VIAJES QUE ESPERAN TU RESPUESTA · 1');
  ok(!(await vis(w.getByText('Nada pendiente'))) && (await w.locator('text=ESPERAN TU RESPUESTA').first().locator('xpath=..').innerText()).includes('1'), 'la cifra «ESPERAN TU RESPUESTA» cuenta el viaje (sin «Nada pendiente»)');
  await w.goto(B + `/panel/${V}/hoy?det=viaje:${V1}`); await w.getByText(/PRECIO CERRADO/).first().waitFor();
  await w.screenshot({ path: OUT + 'y5-panel-detalle-d.png', fullPage: true });
  await clic(w.getByRole('button', { name: 'Confirmar', exact: true })); await w.getByText(/Confirmado: se cobró el viaje/).first().waitFor();
  ok(await esperaV(() => pay(V1), 'confirmed|captured|9000|0') === 'confirmed|captured|9000|0', 'confirmado: COBRADO $90');
  await m.goto(B + `/viaje/${V1}`); ok(await espera(m.getByText('CONFIRMADO')), `${V1}: CONFIRMADO`);
  await m.screenshot({ path: OUT + 'y6-confirmado-m.png', fullPage: true });

  // ── 3. La última plaza no se vende dos veces: queda 1 asiento y dos reservas llegan a la vez (dos teléfonos) ──
  sql(`update trip_runs set seats_outside = 11 where id = ${R1}`); // 14 − 11 fuera − 2 en la app = 1 libre
  const y = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(y, '5705550122');
  const h2 = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(h2, '5705550122');
  await reservar(y, d2, '1:00 PM', 1, false); await reservar(h2, d2, '1:00 PM', 1, false);
  const [a1, a2] = await Promise.all([clic(y.getByRole('button', { name: 'Reservar', exact: true })), clic(h2.getByRole('button', { name: 'Reservar', exact: true }))]).then(async () => {
    await new Promise((r) => setTimeout(r, 4000)); return [y.url(), h2.url()]; });
  const ganan = [a1, a2].filter((u) => /\/viaje\/V-/.test(u));
  ok(ganan.length === 1, `una sola gana la última plaza (${ganan.length})`);
  ok(run(R1) === '3|scheduled' && sql(`select seats_outside + seats_booked from trip_runs where id = ${R1}`) === '14', 'la salida queda llena: 11 fuera + 3 en la app = 14');
  const perdio = /\/viaje\/V-/.test(a1) ? h2 : y;
  ok(await espera(perdio.getByText(/Quedan 0 asientos|ya no quedan|No hay salidas|asientos/i)), 'a la otra le dice que ya no hay asientos');
  const VG = (/\/viaje\/V-/.test(a1) ? a1 : a2).match(/V-\d+/)[0];

  // ── 4. Cancelar con 24 h o más: devolución completa; los asientos vuelven ──
  await m.goto(B + `/viaje/${V1}`); await clic(m.getByRole('button', { name: 'Cancelar el viaje' }));
  await m.getByText(/Faltan más de 24 horas: te devolvemos \$90/).first().waitFor(); await m.screenshot({ path: OUT + 'y7-cancelar-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Sí, cancelar' })); await m.getByText('CANCELADO').first().waitFor();
  ok(await esperaV(() => pay(V1), 'cancelled|refunded|9000|9000') === 'cancelled|refunded|9000|9000', 'cancelar ≥24 h: devolución completa');
  ok(run(R1) === '1|scheduled', 'los 2 asientos vuelven a la salida');

  // ── 5. Cancelar con menos de 24 h: se cobra la mitad ──
  await reservar(m, d2, '7:00 PM', 1, false); const V2 = await enviar(m);
  await w.goto(B + `/panel/${V}/hoy?det=viaje:${V2}`); await clic(w.getByRole('button', { name: 'Confirmar', exact: true })); await w.getByText(/Confirmado/).first().waitFor();
  await esperaV(() => pay(V2), 'confirmed|captured|4500|0');
  sql(`update operations set scheduled_at = now() + interval '5 hours' where number = '${V2}'`);
  await m.goto(B + `/viaje/${V2}`); await clic(m.getByRole('button', { name: 'Cancelar el viaje' }));
  await m.getByText(/se cobra la mitad \(\$22\.50\)/).first().waitFor();
  await clic(m.getByRole('button', { name: 'Sí, cancelar' })); await m.getByText('CANCELADO').first().waitFor();
  ok(await esperaV(() => pay(V2), 'cancelled|partially_refunded|4500|2250') === 'cancelled|partially_refunded|4500|2250', 'cancelar <24 h: se queda la mitad ($22.50), se devuelve el resto');
  ok(await espera(m.getByText(/Se cobró la mitad/)), 'el cliente ve «Se cobró la mitad»');

  // ── 6. Otra salida → «No me sirve» (se libera) ──
  await reservar(m, d2, '7:00 PM', 2, false); const V3 = await enviar(m);
  await w.goto(B + `/panel/${V}/hoy?det=viaje:${V3}`); await clic(w.getByRole('button', { name: 'Otra salida' }));
  await clic(w.getByRole('button', { name: new RegExp(`${Number(d3.slice(8))}/.* · 1:00 PM`) })); await w.getByText(/Propusiste/).first().waitFor();
  await m.goto(B + `/viaje/${V3}`); ok(await espera(m.getByText('OTRA SALIDA PROPUESTA')), `${V3}: OTRA SALIDA PROPUESTA`);
  await m.screenshot({ path: OUT + 'y8-otra-salida-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'No me sirve' })); await m.getByText(/liberamos lo retenido/).first().waitFor();
  ok(await esperaV(() => pay(V3).split('|')[1], 'released') === 'released', '«No me sirve»: liberado');
  ok(run(R2) === '0|scheduled', 'los asientos de la 7 PM vuelven');

  // ── 7. Otra salida → aceptar: se mueve de salida y se cobra ──
  await reservar(m, d2, '7:00 PM', 2, false); const V4 = await enviar(m);
  await w.goto(B + `/panel/${V}/hoy?det=viaje:${V4}`); await clic(w.getByRole('button', { name: 'Otra salida' }));
  await clic(w.getByRole('button', { name: new RegExp(`${Number(d3.slice(8))}/.* · 1:00 PM`) })); await w.getByText(/Propusiste/).first().waitFor();
  await m.goto(B + `/viaje/${V4}`); await clic(m.getByRole('button', { name: 'Aceptar esta salida' })); await m.getByText('CONFIRMADO').first().waitFor();
  ok(await esperaV(() => pay(V4), 'confirmed|captured|9000|0') === 'confirmed|captured|9000|0', 'acepta la otra salida: confirmado y cobrado');
  ok(run(R2) === '0|scheduled' && run(R3) === '2|scheduled', 'los 2 asientos pasan de la 7 PM a la salida nueva');

  // ── 8. Vence sin respuesta → se libera ──
  await reservar(m, d2, '7:00 PM', 1, false); const V5 = await enviar(m);
  sql(`update operations set respond_by = now() - interval '1 minute' where number = '${V5}'`);
  await m.goto(B + `/viaje/${V5}`); ok(await espera(m.getByText('SIN RESPUESTA')), `${V5}: SIN RESPUESTA`);
  ok(await esperaV(() => pay(V5).split('|')[1], 'released') === 'released', 'vencido: liberado');

  // ── 9. La salida: va tarde → salió → Abordó → llegó (Hoy muestra las salidas de hoy y mañana: se acerca a mañana 1:30 PM) ──
  const d1 = sql(`select ((now() at time zone 'America/New_York')::date + 1)::text`);
  sql(`update trip_runs set run_at = ('${d1} 13:30'::timestamp at time zone 'America/New_York') where id = ${R3}`);
  sql(`update operations set scheduled_at = ('${d1} 13:30'::timestamp at time zone 'America/New_York') where number = '${V4}'`);
  await w.goto(B + `/panel/${V}/hoy`); ok(await espera(w.getByText(/SALIDAS CON PASAJEROS/)), 'panel Hoy: SALIDAS CON PASAJEROS');
  await w.goto(B + `/panel/${V}/hoy?det=salida:${R3}`); await w.getByText('PASAJEROS').first().waitFor();
  await clic(w.getByRole('button', { name: 'Va tarde' })); await clic(w.getByRole('button', { name: '15 min', exact: true })); await w.getByText(/avisamos la nueva hora/).first().waitFor();
  await m.goto(B + `/viaje/${V4}`); ok(await espera(m.getByText(/La salida va tarde/)) && await espera(m.getByText(/sale a las 1:45 PM/)), 'el cliente ve que sale a la 1:45 PM');
  await w.goto(B + `/panel/${V}/hoy?det=viaje:${V4}`); await clic(w.getByRole('button', { name: 'Abordó' })); await w.getByText(/Marcado: abordó/).first().waitFor();
  ok(sql(`select status from run_seats where run_id = ${R3} and operation_id = (select id from operations where number = '${V4}')`) === 'boarded', 'Abordó');
  await w.goto(B + `/panel/${V}/hoy?det=salida:${R3}`); await w.screenshot({ path: OUT + 'y9-panel-salida-d.png', fullPage: true });
  await clic(w.getByRole('button', { name: 'Salió' })); await w.getByText(/va en camino/).first().waitFor();
  await m.goto(B + `/viaje/${V4}`); ok(await espera(m.getByText('EN CAMINO')), 'el cliente: EN CAMINO');
  await w.goto(B + `/panel/${V}/hoy?det=salida:${R3}`); await clic(w.getByRole('button', { name: 'Llegó' })); await w.getByText(/reseña a cada pasajero/).first().waitFor();
  ok(sql(`select status from operations where number = '${V4}'`) === 'done' && run(R3).endsWith('|arrived'), 'Llegó: el viaje terminó');
  await m.goto(B + `/viaje/${V4}`); ok(await espera(m.getByText('LLEGASTE')), 'el cliente: LLEGASTE');
  await m.screenshot({ path: OUT + 'y10-llegaste-m.png', fullPage: true });

  // ── 10. El negocio cancela una salida: devolución completa a todos (cobrado → devuelto, retenido → liberado) ──
  await reservar(m, d2, '7:00 PM', 1, false); const V6 = await enviar(m);
  await w.goto(B + `/panel/${V}/hoy?det=viaje:${V6}`); await clic(w.getByRole('button', { name: 'Confirmar', exact: true })); await w.getByText(/Confirmado/).first().waitFor();
  await esperaV(() => pay(V6).split('|')[1], 'captured');
  await reservar(y, d2, '7:00 PM', 1, false); const V7 = await enviar(y);
  await w.goto(B + `/panel/${V}/hoy?det=salida:${R2}`); await clic(w.getByRole('button', { name: 'Cancelar la salida' }));
  await (await vis(w.getByPlaceholder(/la van se dañó/))).fill('Se dañó la van');
  await clic(w.getByRole('button', { name: 'Sí, cancelar y devolver' })); await w.getByText(/todos reciben su dinero/).first().waitFor();
  ok(await esperaV(() => pay(V6), 'cancelled|refunded|4500|4500') === 'cancelled|refunded|4500|4500', `${V6} (confirmado): devolución completa`);
  ok(await esperaV(() => pay(V7).split('|').slice(0, 2).join('|'), 'cancelled|released') === 'cancelled|released', `${V7} (pendiente): liberado`);
  ok(run(R2) === '0|cancelled', 'la salida queda cancelada sin asientos');
  await m.goto(B + `/viaje/${V6}`); ok(await espera(m.getByText(/Se dañó la van/)), 'el cliente ve el motivo');

  // ── 11. Vehículo completo: recogida en su dirección, precio cerrado $420 ──
  await m.goto(B + `/n/${V}/viaje?s=${PRIV}`); await m.getByText('¿DÓNDE TE RECOGEN?').first().waitFor();
  await clic(m.getByRole('button', { name: 'Continuar' })); await clic(m.getByRole('radio', { name: lbl(d3) })); await clic(m.getByRole('radio', { name: '9:00 AM', exact: true }));
  await clic(m.getByRole('button', { name: 'Continuar' })); const V8 = await enviar(m);
  ok(pay(V8) === 'pending|held|42000|0', `${V8}: van completa, retenido $420`);
  await w.goto(B + `/panel/${V}/hoy?det=viaje:${V8}`); await clic(w.getByRole('button', { name: 'Confirmar', exact: true })); await w.getByText(/Confirmado/).first().waitFor();
  await w.goto(B + `/panel/${V}/hoy?det=viaje:${V8}`); await clic(w.getByRole('button', { name: 'Salió' })); await w.getByText(/va en camino/).first().waitFor();
  await w.goto(B + `/panel/${V}/hoy?det=viaje:${V8}`); await clic(w.getByRole('button', { name: 'Llegó' })); await w.getByText(/reseña/).first().waitFor();
  ok(await esperaV(() => pay(V8), 'done|captured|42000|0') === 'done|captured|42000|0', 'van completa: confirmada, salió, llegó (cobrado $420)');

  // ── Mi cuenta ──
  await m.goto(B + `/cuenta/citas?f=past`); ok(await espera(m.getByText(/Hazleton → Washington Heights/i).first()), 'Mi cuenta › Citas y reservas: los viajes');
  // ── Escritorio ──
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(d, '5705550122');
  await d.goto(B + `/n/${V}/viaje?s=${SVC}`); await espera(d.getByText('Antes de reservar')); await d.screenshot({ path: OUT + 'y11-reserva-d.png', fullPage: true });
  await d.goto(B + `/viaje/${V4}`); await espera(d.getByText('LLEGASTE')); await d.screenshot({ path: OUT + 'y12-estado-d.png', fullPage: true });
  // Limpieza de la carrera
  sql(`update trip_runs set seats_outside = 0 where id = ${R1}`);
  ok(VG && err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK tra4y');
})().catch((e) => { console.error(e); process.exit(1); });
