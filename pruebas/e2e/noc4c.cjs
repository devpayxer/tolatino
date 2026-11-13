// 4nc · Noche: lista ($0, al instante, con código) y mesa con depósito (retener → confirmar y cobrar · no hay mesa → liberar · vence →
// liberar · otra hora aceptada → cobrar · cancelar antes del corte → devolver · después → se queda), la puerta (entraron, no llegaron,
// sin identificación), «pasó la noche» a las 6 AM, el SMS de cover y tres clientes por la última mesa VIP (pasa uno).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', NEG = 'la-terraza-night';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { const x = await vis(l); if (!x) throw new Error('no visible: ' + l); await x.click(); };
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const espera = async (f, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const pay = (num) => sql(`select coalesce(string_agg(p.status || ':' || p.amount_cents || ':' || p.refunded_cents, ','), 'none') from payments p join operations o on o.id = p.operation_id where o.number = '${num}'`);
const st = (num) => sql(`select status || coalesce(':' || status_detail, '') from operations where number = '${num}'`);
const LISTA = sql(`select id from items where business_id = '${NEG}' and svc_kind = 'lista' and removed_at is null limit 1`);
const MESA = sql(`select id from items where business_id = '${NEG}' and svc_kind = 'mesa' and name->>'es' = 'Mesa en la terraza' and removed_at is null limit 1`);
const VIP = sql(`select id from items where business_id = '${NEG}' and svc_kind = 'vip' and removed_at is null limit 1`);
// 9b-2 · horasMin: «Otra hora» pide una hora más que la elegida; a las 11 PM esta noche solo queda una y el botón se apaga (la app está bien): se pasa a la noche que sigue.
// La primera noche con horas libres (hoy o la que sigue) y su etiqueta en la tira de días.
async function reservar(p, svc, { pax = 2, card = true, horasMin = 1 } = {}) {
  await p.goto(`${B}/n/${NEG}/noche?s=${svc}&p=${pax}`); await p.getByText('¿CUÁNTOS VAN?').first().waitFor();
  await clic(p.getByRole('button', { name: 'Continuar' }));
  const dias = p.getByRole('radio').filter({ hasNot: p.locator('[aria-disabled="true"]') });
  let elegido = false;
  for (const lab of await p.locator('[role="radio"][aria-label]:not([aria-disabled="true"])').evaluateAll((L) => L.map((e) => e.getAttribute('aria-label')))) {
    if (!/^[A-ZÁÉÍÓÚ]{3} \d+$/.test(lab)) continue;
    await clic(p.getByRole('radio', { name: lab, exact: true }));
    const horas = await p.locator('[role="radio"][aria-label$=" PM"]:not([aria-disabled="true"]), [role="radio"][aria-label$=" AM"]:not([aria-disabled="true"])').evaluateAll((L) => L.map((e) => e.getAttribute('aria-label')));
    if (horas.length >= horasMin) { await clic(p.getByRole('radio', { name: horas[0], exact: true })); elegido = true; break; }
  }
  void dias; if (!elegido) throw new Error('sin noche con horas');
  await clic(p.getByRole('button', { name: 'Continuar' }));
  await p.getByText('BUENO SABER').first().waitFor();
  const btn = await vis(p.getByRole('button', { name: /^(Anotarme|Enviar solicitud)$/ }));
  await btn.click();
  await p.waitForURL(/\/noche\/N-\d+/, { timeout: 15000 });
  return p.url().match(/N-\d+/)[0];
}
(async () => {
  // Punto de partida: sin reservas vivas de prueba en La Terraza; VIP con 2 mesas.
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', door_code = null where business_id = '${NEG}' and kind = 'night' and status in ('pending', 'change_proposed', 'confirmed')`);
  sql(`update noche_settings set list_on = true, list_until_min = 720, list_cap = null, cover_cents = 1000, after_min = null, after_cents = null where business_id = '${NEG}'`);
  sql(`update items set svc_attrs = svc_attrs || '{\"tables\":2}'::jsonb, deposit_cents = 10000 where id = ${VIP}`);
  sql(`update users set first_name = coalesce(nullif(first_name, ''), 'Prueba') where phone in ('+15705550299', '+15705550288')`);
  const b = await chromium.launch(); const err = [];
  const ctx = async (tel, w = 390) => { const p = await (await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: w < 500 ? 2 : 1 })).newPage(); p.on('pageerror', (e) => err.push(e.message)); await entrar(p, tel); return p; };
  const cli = await ctx('5705550122'), neg = await ctx('5705550366');

  // 1 · LISTA: $0, al instante, con código.
  const L1 = await reservar(cli, LISTA, { pax: 3 });
  ok(st(L1) === 'confirmed' && pay(L1) === 'none', `lista ${L1}: confirmada al instante y sin pago`);
  ok(/^\d{4}$/.test(sql(`select door_code from operations where number = '${L1}'`)), 'código de puerta de 4 cifras');
  await cli.getByText('ESTÁS EN LA LISTA').first().waitFor();
  ok(!!(await vis(cli.getByText('CÓDIGO PARA LA PUERTA'))), 'el cliente ve su código');
  await cli.screenshot({ path: OUT + 'n4c-lista-m.png', fullPage: true });
  // Una sola lista por noche.
  await cli.goto(`${B}/n/${NEG}/noche?s=${LISTA}&p=2`); await cli.getByText('¿CUÁNTOS VAN?').first().waitFor();

  // 2 · MESA con depósito: se retiene; el local confirma → se cobra.
  const M1 = await reservar(cli, MESA, { pax: 4 });
  ok(st(M1) === 'pending' && pay(M1) === 'held:5000:0', `mesa ${M1}: pendiente con $50 retenidos`);
  ok(sql(`select door_code is not null from operations where number = '${M1}'`) === 't' && !(await vis(cli.getByText('CÓDIGO PARA LA PUERTA'))), 'el código no se muestra antes de confirmar');
  await cli.screenshot({ path: OUT + 'n4c-mesa-pend-m.png', fullPage: true });
  await neg.goto(`${B}/panel/${NEG}/hoy`); await neg.getByText(/MESAS QUE ESPERAN TU RESPUESTA/).first().waitFor();
  ok(!!(await vis(neg.getByText(/ESPERAN TU RESPUESTA/).first())), 'Hoy: la mesa espera respuesta');
  await neg.goto(`${B}/panel/${NEG}/hoy?det=noche:${M1}`); await neg.getByText('SI CONFIRMAS, QUEDAN').first().waitFor();
  await neg.screenshot({ path: OUT + 'n4c-panel-det-m.png', fullPage: true });
  await clic(neg.getByRole('button', { name: 'Confirmar', exact: true }));
  ok(await espera(() => st(M1) === 'confirmed' && pay(M1) === 'captured:5000:0'), 'confirmar → se cobra el depósito');
  await cli.goto(`${B}/noche/${M1}`); await cli.getByText('MESA CONFIRMADA').first().waitFor();
  ok(!!(await vis(cli.getByText('CÓDIGO PARA LA PUERTA'))), 'mesa confirmada: el cliente ve su código');
  // Cancelar antes del corte → devolución completa.
  // 9b-1 · El corte 1 h DESPUÉS de ahora (como el de «después del corte», al revés): la primera noche abierta es esta noche y a las 6 PM su corte
  // (6 h antes de llegar) ya había pasado; la hoja decía que el depósito se quedaba (corrida F del 12 nov). La app estaba bien.
  sql(`update operations set details = details || jsonb_build_object('cut', (extract(epoch from (now() at time zone 'America/New_York') - (night_date + time '12:00')) / 60)::int + 60) where number = '${M1}'`);
  await cli.reload(); await cli.getByText('MESA CONFIRMADA').first().waitFor();
  await clic(cli.getByRole('button', { name: 'Cancelar la reserva' }));
  ok(!!(await vis(cli.getByText(/te devolvemos \$50/))), 'la hoja dice la regla que aplica (antes del corte)');
  await clic(cli.getByRole('button', { name: 'Sí, cancelar' }));
  ok(await espera(() => st(M1) === 'cancelled' && pay(M1) === 'refunded:5000:5000'), 'cancelar antes del corte → devolución completa');

  // 3 · No hay mesa → se libera.
  const M2 = await reservar(cli, MESA, { pax: 2 });
  await neg.goto(`${B}/panel/${NEG}/hoy?det=noche:${M2}`); await neg.getByText('SI CONFIRMAS, QUEDAN').first().waitFor();
  await clic(neg.getByRole('button', { name: 'No hay mesa' }));
  ok(await espera(() => st(M2) === 'declined' && pay(M2) === 'released:5000:0'), 'no hay mesa → depósito liberado');

  // 4 · Vence sin respuesta → se libera (barrido).
  const M3 = await reservar(cli, MESA, { pax: 2 });
  sql(`update operations set respond_by = now() - interval '1 minute' where number = '${M3}'`); barrer();
  ok(await espera(() => st(M3) === 'expired:sin_respuesta' && pay(M3) === 'released:5000:0'), 'vence sin respuesta → depósito liberado');

  // 5 · Otra hora → el cliente la acepta → se cobra.
  const M4 = await reservar(cli, MESA, { pax: 2, horasMin: 2 });
  await neg.goto(`${B}/panel/${NEG}/hoy?det=noche:${M4}`); await neg.getByText('SI CONFIRMAS, QUEDAN').first().waitFor();
  await clic(neg.getByRole('button', { name: 'Otra hora' }));
  await neg.getByText('¿A QUÉ HORA SÍ TIENES MESA?').first().waitFor();
  await clic(neg.getByText(/^\d{1,2}(:\d{2})? (PM|AM)$/).last());
  ok(await espera(() => st(M4) === 'change_proposed'), 'otra hora propuesta');
  await cli.goto(`${B}/noche/${M4}`); await cli.getByText('TE PROPONEN UN CAMBIO').first().waitFor();
  await clic(cli.getByRole('button', { name: 'Aceptar esta hora' }));
  ok(await espera(() => st(M4) === 'confirmed' && pay(M4) === 'captured:5000:0'), 'acepta la otra hora → se cobra');
  // Cancelar DESPUÉS del corte (reloj movido: el corte ya pasó) → el depósito se queda.
  // 9a · El corte se mide en minutos desde el mediodía de la noche de la reserva (nowN): se pone 1 h ANTES de ahora, sea cual sea esa noche
  // (con −2000 fijo fallaba cuando la próxima noche abierta estaba a 2 días: martes → jueves).
  sql(`update operations set details = details || jsonb_build_object('cut', (extract(epoch from (now() at time zone 'America/New_York') - (night_date + time '12:00')) / 60)::int - 60) where number = '${M4}'`);
  await cli.reload(); await cli.getByText('MESA CONFIRMADA').first().waitFor();
  await clic(cli.getByRole('button', { name: 'Cancelar la reserva' }));
  await cli.getByText(/se queda con el local/).first().waitFor({ timeout: 8000 }).catch(() => undefined); ok(!!(await vis(cli.getByText(/se queda con el local/))), 'la hoja dice que el depósito se queda');
  await clic(cli.getByRole('button', { name: 'Sí, cancelar' }));
  ok(await espera(() => st(M4) === 'cancelled' && pay(M4) === 'captured:5000:0'), 'cancelar después del corte → el depósito se queda con el local');

  // 6 · La puerta esta noche: la lista entra; la mesa «no entró sin identificación»; «pasó la noche» a las 6 AM.
  await require('../lib/negocio-nuevo.cjs').lejosDelCambioDeNoche(); // 9b-1 · todo lo de esta parte en la misma noche (cambia a las 6 AM)
  const hoy = sql(`select ((now() at time zone 'America/New_York') - interval '6 hours')::date`);
  sql(`update operations set night_date = '${hoy}'::date where number = '${L1}'`);
  const M5 = await reservar(cli, MESA, { pax: 2 });
  await neg.goto(`${B}/panel/${NEG}/hoy?det=noche:${M5}`); await neg.getByText('SI CONFIRMAS, QUEDAN').first().waitFor();
  await clic(neg.getByRole('button', { name: 'Confirmar', exact: true }));
  ok(await espera(() => st(M5) === 'confirmed'), 'mesa 5 confirmada');
  sql(`update operations set night_date = '${hoy}'::date where number = '${M5}'`);
  await neg.goto(`${B}/panel/${NEG}/hoy`); await neg.getByText(/LA LISTA DE ESTA NOCHE/).first().waitFor();
  const codigo = sql(`select door_code from operations where number = '${L1}'`);
  await (await vis(neg.getByPlaceholder('Ej.: Ana o 4821'))).fill(codigo);
  await neg.screenshot({ path: OUT + 'n4c-puerta-m.png', fullPage: true });
  await clic(neg.getByRole('button', { name: /Más|Aumentar|\+/ }).last()).catch(async () => { await neg.locator('[aria-label*="Más"], [aria-label*="+"]').last().click(); });
  ok(await espera(() => sql(`select details->>'in_n' from operations where number = '${L1}'`) === '1'), 'la puerta marca «entró 1 de 3» (buscando por código)');
  await neg.goto(`${B}/panel/${NEG}/hoy?det=noche:${M5}`); await neg.getByText('CÓDIGO', { exact: true }).first().waitFor();
  await clic(neg.getByRole('button', { name: 'No entró: sin identificación' }));
  ok(await espera(() => st(M5) === 'done:noid' && pay(M5) === 'captured:5000:0'), 'no entró sin identificación → cerrada, el depósito se queda');
  sql(`update operations set night_date = night_date - 1 where number = '${L1}'`); barrer();
  ok(await espera(() => st(L1) === 'done:entro'), '«pasó la noche» a las 6 AM: la lista con entrada queda terminada');

  // 7 · El local cancela una mesa → devolución completa.
  const M6 = await reservar(cli, MESA, { pax: 2 });
  await neg.goto(`${B}/panel/${NEG}/hoy?det=noche:${M6}`); await neg.getByText('SI CONFIRMAS, QUEDAN').first().waitFor();
  await clic(neg.getByRole('button', { name: 'Confirmar', exact: true }));
  ok(await espera(() => pay(M6) === 'captured:5000:0'), 'mesa 6 cobrada');
  await neg.reload(); await clic(neg.getByRole('button', { name: 'Cancelar la mesa' }));
  await (await vis(neg.getByPlaceholder('Ej.: evento privado esa noche'))).fill('Evento privado esa noche');
  await clic(neg.getByRole('button', { name: 'Sí, cancelar y devolver' }));
  ok(await espera(() => st(M6) === 'cancelled' && pay(M6) === 'refunded:5000:5000'), 'el local cancela → devolución completa');

  // 8 · Tres clientes por la última mesa VIP (sin depósito para no pedir tarjeta): pasa uno.
  sql(`update items set svc_attrs = svc_attrs || '{\"tables\":1}'::jsonb, deposit_cents = 0 where id = ${VIP}`);
  const c2 = await ctx('5705550299'), c3 = await ctx('5705550288');
  const preparar = async (p) => {
    await p.goto(`${B}/n/${NEG}/noche?s=${VIP}&p=2`); await p.getByText('¿CUÁNTOS VAN?').first().waitFor(); await clic(p.getByRole('button', { name: 'Continuar' }));
    for (const lab of await p.locator('[role="radio"][aria-label]:not([aria-disabled="true"])').evaluateAll((L) => L.map((e) => e.getAttribute('aria-label')))) {
      if (!/^[A-ZÁÉÍÓÚ]{3} \d+$/.test(lab)) continue; await clic(p.getByRole('radio', { name: lab, exact: true }));
      const h = await p.locator('[role="radio"][aria-label$=" PM"]:not([aria-disabled="true"])').evaluateAll((L) => L.map((e) => e.getAttribute('aria-label')));
      if (h.length) { await clic(p.getByRole('radio', { name: h[0], exact: true })); break; }
    }
    await clic(p.getByRole('button', { name: 'Continuar' })); await p.getByText('BUENO SABER').first().waitFor();
  };
  await Promise.all([preparar(cli), preparar(c2), preparar(c3)]);
  await Promise.all([cli, c2, c3].map(async (p) => { const x = await vis(p.getByRole('button', { name: 'Enviar solicitud' })); await x.click(); }));
  await new Promise((r) => setTimeout(r, 4000));
  const vivos = Number(sql(`select count(*) from operations where business_id = '${NEG}' and kind = 'night' and details->>'item' = '${VIP}' and status in ('pending', 'change_proposed', 'confirmed')`));
  ok(vivos === 1, `tres por la última mesa VIP → una sola reserva viva (${vivos})`);
  const rechazos = (await Promise.all([cli, c2, c3].map(async (p) => !!(await vis(p.getByText(/Ya no quedan mesas de ese tipo esa noche/)))))).filter(Boolean).length;
  ok(rechazos === 2, `los otros dos ven «Ya no quedan mesas» (${rechazos})`);
  // Lo cobrado por cover y lista en payments: siempre nada.
  ok(sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.kind = 'night' and o.details->>'k' = 'lista'`) === '0', 'ninguna lista tiene pago');
  sql(`update items set svc_attrs = svc_attrs || '{\"tables\":2}'::jsonb, deposit_cents = 10000 where id = ${VIP}`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK noc4c');
})().catch((e) => { console.error(e); process.exit(1); });
