const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright');
const OUT = ENT.S + '/cap/';
// 9b-1 · Con sus propios datos: un vecino nuevo (teléfono 555 libre) y un nombre de negocio de la corrida. Antes era Rosa (0166) con
// «Pupusería La Salvadoreña»: la segunda corrida ya la había recomendado y no salía «Recomendación enviada».
const { telLibre, sql } = require('../lib/negocio-nuevo.cjs');
const TEL = telLibre(), NOMBRE = 'Pupusería La Salvadoreña ' + TEL.slice(-4);
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓ ' + m); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const m = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await m.newPage(); p.on('pageerror', e => err.push('m ' + e.message));
  // sin cuenta: borrador, faltantes, mandar a entrar
  await p.goto('http://localhost:3100/recomendar?q=pupuseria');
  await p.getByText('¿Conoces un negocio que no está aquí?').waitFor();
  await p.screenshot({ path: OUT + 'r1-movil.png' });
  await p.getByText('Entra para enviar').click(); await p.waitForTimeout(300);
  ok(await p.locator('text=TE FALTA').count() > 0, 'sin llenar: dice lo que falta');
  await p.getByPlaceholder('Ej.: Pica Pollo La Vieja Fefa').fill(NOMBRE);
  await p.getByText('Comida y Bebidas', { exact: true }).click();
  await p.getByPlaceholder('Calle o dirección').fill('210 N Wyoming St');
  await p.getByPlaceholder('(570) 555-0100 o @negocio').fill('570 555 0133');
  await p.getByText('Soy cliente', { exact: true }).click();
  await p.getByPlaceholder(/sancocho/).fill('Las mejores pupusas de Hazleton');
  await p.screenshot({ path: OUT + 'r2-movil-lleno.png', fullPage: true });
  await p.getByText('Entra para enviar').click(); await p.waitForURL(/entrar/);
  console.log('a entrar:', p.url());
  // entrar con código de pruebas y volver
  sql(`delete from otp_codes where phone = '+1${TEL}'`);
  await p.evaluate(async (TEL) => {
    const j = (u, b) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
    const a = await j('/api/cuenta/codigo', { telefono: TEL });
    const v = await j('/api/cuenta/verificar', { telefono: TEL, codigo: a.codigoPrueba });
    if (!v.nombre) await j('/api/cuenta/perfil', { nombre: 'Rosa', apellido: 'Méndez', apodo: '' });
  }, TEL);
  await p.goto('http://localhost:3100/recomendar?q=pupuseria');
  await p.getByText('Enviar recomendación').waitFor();
  ok(await p.getByPlaceholder('Ej.: Pica Pollo La Vieja Fefa').inputValue() === NOMBRE, 'al volver de entrar, el borrador se conserva');
  await p.getByText('Enviar recomendación').click();
  await p.getByText('Recomendación enviada').waitFor(); ok(true, 'recomendación enviada');
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + 'r3-movil-enviada.png', fullPage: true });
  // repetida
  await p.getByText('Recomendar otro').click();
  await p.getByPlaceholder('Ej.: Pica Pollo La Vieja Fefa').fill(NOMBRE.toLowerCase());
  await p.getByText('Comida y Bebidas', { exact: true }).click();
  await p.getByPlaceholder('Calle o dirección').fill('210 N Wyoming St');
  await p.getByText('Soy cliente', { exact: true }).click();
  await p.getByText('Enviar recomendación').click(); await p.waitForTimeout(800);
  ok(await p.locator('text=Ya recomendaste este negocio').count() > 0, 'la misma otra vez (en minúsculas): «Ya recomendaste este negocio»');
  // escritorio
  const d = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const q = await d.newPage(); q.on('pageerror', e => err.push('d ' + e.message));
  await q.goto('http://localhost:3100/recomendar?ciudad=alw');
  await q.getByText('¿Conoces un negocio que no está aquí?').waitFor();
  await q.getByPlaceholder('Ej.: Pica Pollo La Vieja Fefa').fill('Colmado El Cibao');
  await q.getByText('Es mío', { exact: true }).click();
  await q.screenshot({ path: OUT + 'r4-desk.png' });
  ok(!err.length, 'sin errores en la página: ' + (err.join(' · ') || 'ninguno'));
  await b.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
