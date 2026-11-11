const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright');
const OUT = ENT.S + '/cap/';
(async () => {
  const b = await chromium.launch(); const err = [];
  const m = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await m.newPage(); p.on('pageerror', e => err.push('m ' + e.message));
  // sin cuenta: borrador, faltantes, mandar a entrar
  await p.goto('http://localhost:3100/recomendar?q=pupuseria');
  await p.getByText('¿Conoces un negocio que no está aquí?').waitFor();
  await p.screenshot({ path: OUT + 'r1-movil.png' });
  await p.getByText('Entra para enviar').click(); await p.waitForTimeout(300);
  console.log('faltan:', await p.locator('text=TE FALTA').count());
  await p.getByPlaceholder('Ej.: Pica Pollo La Vieja Fefa').fill('Pupusería La Salvadoreña');
  await p.getByText('Comida y Bebidas', { exact: true }).click();
  await p.getByPlaceholder('Calle o dirección').fill('210 N Wyoming St');
  await p.getByPlaceholder('(570) 555-0100 o @negocio').fill('570 555 0133');
  await p.getByText('Soy cliente', { exact: true }).click();
  await p.getByPlaceholder(/sancocho/).fill('Las mejores pupusas de Hazleton');
  await p.screenshot({ path: OUT + 'r2-movil-lleno.png', fullPage: true });
  await p.getByText('Entra para enviar').click(); await p.waitForURL(/entrar/);
  console.log('a entrar:', p.url());
  // entrar con código de pruebas y volver
  await p.evaluate(async () => {
    const j = (u, b) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
    const a = await j('/api/cuenta/codigo', { telefono: '5705550166' });
    const v = await j('/api/cuenta/verificar', { telefono: '5705550166', codigo: a.codigoPrueba });
    if (!v.nombre) await j('/api/cuenta/perfil', { nombre: 'Rosa', apellido: 'Méndez', apodo: '' });
  });
  await p.goto('http://localhost:3100/recomendar?q=pupuseria');
  await p.getByText('Enviar recomendación').waitFor();
  console.log('borrador conservado:', await p.getByPlaceholder('Ej.: Pica Pollo La Vieja Fefa').inputValue());
  await p.getByText('Enviar recomendación').click();
  await p.getByText('Recomendación enviada').waitFor();
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + 'r3-movil-enviada.png', fullPage: true });
  // repetida
  await p.getByText('Recomendar otro').click();
  await p.getByPlaceholder('Ej.: Pica Pollo La Vieja Fefa').fill('pupusería la salvadoreña');
  await p.getByText('Comida y Bebidas', { exact: true }).click();
  await p.getByPlaceholder('Calle o dirección').fill('210 N Wyoming St');
  await p.getByText('Soy cliente', { exact: true }).click();
  await p.getByText('Enviar recomendación').click(); await p.waitForTimeout(800);
  console.log('repetida:', await p.locator('text=Ya recomendaste este negocio').count());
  // escritorio
  const d = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const q = await d.newPage(); q.on('pageerror', e => err.push('d ' + e.message));
  await q.goto('http://localhost:3100/recomendar?ciudad=alw');
  await q.getByText('¿Conoces un negocio que no está aquí?').waitFor();
  await q.getByPlaceholder('Ej.: Pica Pollo La Vieja Fefa').fill('Colmado El Cibao');
  await q.getByText('Es mío', { exact: true }).click();
  await q.screenshot({ path: OUT + 'r4-desk.png' });
  console.log('errores', JSON.stringify(err));
  await b.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
