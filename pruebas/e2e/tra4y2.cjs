// 4y-2 · Envío de caja (retener → confirmar = cobrar; DESTINATARIO cifrado que no sale en ninguna vista pública ni aviso; recogida →
// salió con rastreo → entregada; ya no se cancela desde la recogida) y mudanza con fotos (hoy $0 → el negocio manda el precio
// cerrado → aceptar con tarjeta = se cobra; precio nuevo invalida el viejo; «No, gracias»; el precio vence; «No lo hacemos»;
// salió · llegó).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', E = 'envios-quisqueya-cargo', MU = 'mudanzas-el-primo';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
// 9b-1 · Los servicios por su nombre (antes los ids 876 y 879 de una base vieja: en una base nueva son otros).
const svcDe = (neg, n) => sql(`select id from items where business_id = '${neg}' and name->>'es' = '${n}' and removed_at is null order by id limit 1`);
const CAJA = svcDe(E, 'Caja grande (24 × 24 × 24)'), MUD = svcDe(MU, 'Apartamento de 1 cuarto');
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const llenar = async (l, v) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.fill(v); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const esperaV = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const pay = (n) => sql(`select o.status || '|' || coalesce(p.status, '-') || '|' || coalesce(p.amount_cents, 0) || '|' || coalesce(p.refunded_cents, 0) from operations o left join payments p on p.operation_id = o.id and p.kind = 'full' where o.number = '${n}'`);
(async () => {
  require('../lib/negocio-nuevo.cjs').direccion('5705550122'); // 9b-1 · su dirección de casa (la que «¿Dónde te recogen?» propone)
  const MAR = sql(`select id from users where phone = '+15705550122'`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where kind = 'trip' and status in ('pending', 'change_proposed') and (user_id = '${MAR}' or business_id in ('${E}', '${MU}'))`);
  sql(`update operations set status = 'done' where kind = 'trip' and status = 'confirmed' and business_id in ('${E}', '${MU}')`);
  const d1 = sql(`select ((now() at time zone 'America/New_York')::date + 1)::text`), d2 = sql(`select ((now() at time zone 'America/New_York')::date + 2)::text`);
  const lbl = (ymd) => `${DOW[new Date(ymd + 'T12:00:00Z').getUTCDay()]} ${Number(ymd.slice(8))}`;
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  const diaHora = async (p, ymd, hora) => { await clic(p.getByRole('radio', { name: lbl(ymd) })); await clic(p.getByRole('radio', { name: hora, exact: true })); };

  // ── 1. Caja: 2 cajas, recogida en casa, destinatario en RD → se retienen $170 ──
  await m.goto(B + `/n/${E}/viaje?s=${CAJA}`); await m.getByText('¿CUÁNTAS CAJAS?').first().waitFor();
  await clic(m.getByText('+', { exact: true }));
  await llenar(m.getByLabel('NOMBRE', { exact: true }), 'Ana Rodríguez Testigo'); await llenar(m.getByLabel('TELÉFONO', { exact: true }), '+1 809 555 0101');
  await llenar(m.getByLabel('PROVINCIA O CIUDAD', { exact: true }), 'Santiago'); await llenar(m.getByLabel('DIRECCIÓN', { exact: true }), 'Calle Duarte 45, Los Jardines');
  ok(await espera(m.getByText(/CONFIRMA LO QUE NO SE PUEDE MANDAR/)), 'sin aceptar «Lo que no se puede mandar» no sigue');
  await clic(m.getByRole('switch', { name: 'Lo que no se puede mandar' }));
  await m.screenshot({ path: OUT + 'z1-caja-paso1-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Continuar' })); await diaHora(m, d1, '10:00 AM');
  await clic(m.getByRole('button', { name: 'Continuar' })); await m.getByText(/Ana Rodríguez Testigo · Santiago/).first().waitFor();
  await m.screenshot({ path: OUT + 'z2-caja-paso3-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Enviar', exact: true })); await m.waitForURL(/\/viaje\/V-\d+/, { timeout: 20000 }).catch(async (e) => { await m.screenshot({ path: OUT + 'dbg-caja.png', fullPage: true }); throw e; });
  const C1 = m.url().match(/V-\d+/)[0];
  ok(pay(C1) === 'pending|held|17000|0', `${C1}: retenido $170 (2 × $85)`);
  ok(sql(`select count(*) from op_private where operation_id = (select id from operations where number = '${C1}') and reason = 'destinatario' and note_enc is not null`) === '1', 'el destinatario se guarda en op_private');
  ok(sql(`select count(*) from op_private p join operations o on o.id = p.operation_id where o.number = '${C1}' and encode(p.note_enc, 'escape') like '%Testigo%'`) === '0', 'el destinatario está CIFRADO (no se lee en la base)');
  ok(sql(`select count(*) from operations where number = '${C1}' and (details::text like '%Testigo%' or coalesce(customer_note, '') like '%Testigo%')`) === '0', 'el nombre del destinatario no está en la operación');
  ok(await espera(m.getByText(/Ana Rodríguez Testigo · \+1 809 555 0101/)), 'el cliente ve su destinatario');

  // ── 2. Yolanda: confirma (se cobra), recogida, salió con rastreo, entregada ──
  const y = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(y, '5705550333');
  y.on('pageerror', e => err.push(e.message));
  await y.goto(B + `/panel/${E}/hoy?det=viaje:${C1}`); await y.getByText(/ENVÍO DE CAJA/).first().waitFor();
  ok(await espera(y.getByText(/Ana Rodríguez Testigo · \+1 809 555 0101/)) && await espera(y.getByText(/El destinatario es privado/)), 'el panel ve el destinatario (privado)');
  await y.screenshot({ path: OUT + 'z3-panel-caja-d.png', fullPage: true });
  await clic(y.getByRole('button', { name: 'Confirmar', exact: true })); await y.getByText(/Confirmado: se cobró/).first().waitFor();
  ok(await esperaV(() => pay(C1), 'confirmed|captured|17000|0') === 'confirmed|captured|17000|0', 'confirmado: cobrado $170');
  await y.goto(B + `/panel/${E}/hoy?det=viaje:${C1}`); await clic(y.getByRole('button', { name: 'Recogida hecha' })); await y.getByText(/sabe que la recogiste/).first().waitFor();
  await m.goto(B + `/viaje/${C1}`); ok(await espera(m.getByText('CAJA RECOGIDA')) && !(await vis(m.getByRole('button', { name: 'Cancelar el viaje' }))), 'CAJA RECOGIDA y ya no se cancela');
  await y.goto(B + `/panel/${E}/hoy?det=viaje:${C1}`); await llenar(y.getByPlaceholder('QC-12345'), 'QC-77881');
  await clic(y.getByRole('button', { name: 'Salió del almacén' })); await y.getByText(/le mandamos el rastreo/).first().waitFor();
  await m.goto(B + `/viaje/${C1}`); ok(await espera(m.getByText('CAJA EN CAMINO')) && await espera(m.getByText(/QC-77881/)), 'CAJA EN CAMINO con el rastreo');
  await m.screenshot({ path: OUT + 'z4-caja-camino-m.png', fullPage: true });
  await y.goto(B + `/panel/${E}/hoy?det=viaje:${C1}`); await clic(y.getByRole('button', { name: 'Entregada' })); await y.getByText(/reseña/).first().waitFor();
  await m.goto(B + `/viaje/${C1}`); ok(await espera(m.getByText('ENTREGADA')), 'ENTREGADA');
  ok(sql(`select count(*) from notifications where body::text like '%Testigo%' or title::text like '%Testigo%'`) === '0', 'el destinatario no sale en ningún aviso');
  const pub = await (await b.newContext()).newPage(); await pub.goto(B + `/n/${E}`); ok(!(await pub.content()).includes('Testigo'), 'ni en la página pública');

  // ── 3. Mudanza: fotos, recogida y destino → hoy $0 ──
  const pedirMud = async (shot) => {
    await m.goto(B + `/n/${MU}/viaje?s=${MUD}`); await m.getByText('FOTOS').first().waitFor();
    await m.locator('input[type=file]').first().setInputFiles(OUT + 'z1-caja-paso1-m.png'); await m.locator('[aria-label="Quitar foto"]').first().waitFor({ timeout: 20000 });
    await llenar(m.getByLabel('A dónde va'), '120 Alter St, Hazleton · 2.º piso');
    if (shot) await m.screenshot({ path: OUT + 'z5-mudanza-paso1-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Continuar' })); await diaHora(m, d2, '9:00 AM');
    await clic(m.getByRole('button', { name: 'Continuar' })); await m.getByText(/Nada se agrega el día de la mudanza/).first().waitFor();
    if (shot) await m.screenshot({ path: OUT + 'z6-mudanza-paso3-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Pedir precio cerrado' })); await m.waitForURL(/\/viaje\/V-\d+/, { timeout: 20000 });
    return m.url().match(/V-\d+/)[0];
  };
  const M1 = await pedirMud(true);
  ok(pay(M1) === 'pending|-|0|0', `${M1}: pedido sin cobrar nada`);
  ok(sql(`select count(*) from media where owner_kind = 'trip' and owner_id = (select id::text from operations where number = '${M1}')`) === '1', 'la foto queda con la mudanza');
  ok(await espera(m.getByText(/Te mandan el precio cerrado con tus fotos/)), 'PENDIENTE: te mandan el precio');

  // ── 4. Ramón manda $650; Marisol lo acepta con su tarjeta → se cobra ──
  const r = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(r, '5705550344');
  r.on('pageerror', e => err.push(e.message));
  const mandar = async (num, dol, nuevo) => {
    await r.goto(B + `/panel/${MU}/hoy?det=viaje:${num}`); await r.getByText('SUS FOTOS').first().waitFor();
    await llenar(r.getByPlaceholder('650'), String(dol)); await llenar(r.getByPlaceholder(/Camión, 3 personas/), 'Camión de 20 pies, 3 personas, mantas y peajes');
    await clic(r.getByRole('button', { name: nuevo ? 'Mandar precio nuevo' : 'Mandar el precio cerrado' })); await r.getByText(/Precio mandado/).first().waitFor().catch(async (e) => { await r.screenshot({ path: OUT + 'dbg-precio.png', fullPage: true }); throw e; });
  };
  await r.goto(B + `/panel/${MU}/hoy?det=viaje:${M1}`); await r.getByText('SUS FOTOS').first().waitFor(); await r.screenshot({ path: OUT + 'z7-panel-mudanza-d.png', fullPage: true });
  await mandar(M1, 650, false);
  ok(sql(`select version || '|' || status || '|' || total_cents from written_totals where operation_id = (select id from operations where number = '${M1}')`) === '1|sent|65000', 'precio cerrado v1 $650 (vale 48 h)');
  await m.goto(B + `/viaje/${M1}`); ok(await espera(m.getByText('PRECIO CERRADO')) && await espera(m.getByRole('button', { name: 'Aceptar $650' })), 'el cliente ve PRECIO CERRADO y «Aceptar $650»');
  await m.screenshot({ path: OUT + 'z8-precio-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Aceptar $650' })); await m.getByText('CONFIRMADO').first().waitFor();
  ok(await esperaV(() => pay(M1), 'confirmed|captured|65000|0') === 'confirmed|captured|65000|0', 'aceptado: cobrado $650');
  ok(sql(`select status || '|' || (accepted_ip is not null)::text from written_totals where operation_id = (select id from operations where number = '${M1}')`).startsWith('accepted|'), 'el precio queda aceptado con hora e IP');

  // ── 5. Precio nuevo mientras el cliente mira el viejo → no acepta el viejo; «No, gracias» ──
  const M2 = await pedirMud(false); await mandar(M2, 650, false);
  await m.goto(B + `/viaje/${M2}`); await m.getByRole('button', { name: 'Aceptar $650' }).first().waitFor();
  await mandar(M2, 700, true);
  await clic(m.getByRole('button', { name: 'Aceptar $650' })); ok(await espera(m.getByText(/mandó un precio nuevo/)), 'el precio viejo ya no se acepta (versión)');
  ok(pay(M2) === 'pending|-|0|0', 'y no se cobró nada');
  await m.goto(B + `/viaje/${M2}`); await m.getByRole('button', { name: 'Aceptar $700' }).first().waitFor();
  await clic(m.getByRole('button', { name: 'No, gracias' })); await m.getByText(/No aceptaste el precio/).first().waitFor();
  ok(pay(M2) === 'cancelled|-|0|0', '«No, gracias»: cancelado sin cobrar');

  // ── 6. El precio vence ──
  const M3 = await pedirMud(false); await mandar(M3, 500, false);
  sql(`update operations set respond_by = now() - interval '1 minute' where number = '${M3}'`);
  await m.goto(B + `/viaje/${M3}`); ok(await espera(m.getByText('EL PRECIO VENCIÓ')), 'el precio vence: EL PRECIO VENCIÓ');
  ok(sql(`select status from written_totals where operation_id = (select id from operations where number = '${M3}')`) === 'expired', 'y queda vencido en el acuerdo');

  // ── 7. «No lo hacemos» ──
  const M4 = await pedirMud(false);
  await r.goto(B + `/panel/${MU}/hoy?det=viaje:${M4}`); await clic(r.getByRole('button', { name: 'No lo hacemos' })); await r.getByText(/No se cobró nada/).first().waitFor();
  await m.goto(B + `/viaje/${M4}`); ok(await espera(m.getByText('NO LO HACEN')), '«No lo hacemos»: NO LO HACEN');

  // ── 8. La mudanza confirmada: salió · llegó ──
  // 9b-1 · «Salió» y «Llegó» exactos: la reseña de un viaje («Salió casi a la hora…», de res4z) también es un botón y se tomaba primero.
  await r.goto(B + `/panel/${MU}/hoy?det=viaje:${M1}`); await clic(r.getByRole('button', { name: 'Salió', exact: true })); await r.getByText(/va en camino/).first().waitFor();
  await r.goto(B + `/panel/${MU}/hoy?det=viaje:${M1}`); await clic(r.getByRole('button', { name: 'Llegó', exact: true })); await r.getByText(/reseña/).first().waitFor();
  ok(sql(`select status from operations where number = '${M1}'`) === 'done', 'mudanza: salió y llegó');
  await m.goto(B + `/viaje/${M1}`); ok(await espera(m.getByText('LLEGASTE')), 'el cliente: LLEGASTE');

  // ── Escritorio ──
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(d, '5705550122');
  await d.goto(B + `/n/${E}/viaje?s=${CAJA}`); await espera(d.getByText('DESTINATARIO')); await d.screenshot({ path: OUT + 'z9-caja-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK tra4y2');
})().catch((e) => { console.error(e); process.exit(1); });
