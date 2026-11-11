const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const err = [];
  const c = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const p = await c.newPage(); p.on('pageerror', e => err.push(e.message));
  await p.goto('http://localhost:3100/entrar');
  const r = await p.evaluate(async () => {
    const j = (u, b) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
    const a = await j('/api/cuenta/codigo', { telefono: '5705550177' });
    const v = await j('/api/cuenta/verificar', { telefono: '5705550177', codigo: a.codigoPrueba });
    if (!v.nombre) await j('/api/cuenta/perfil', { nombre: 'Prueba', apellido: 'Ciudad', apodo: '' });
    return { a: !!a.codigoPrueba, v };
  });
  console.log('login', JSON.stringify(r));
  await c.addCookies([{ name: 'tl_loc', value: 'alw|centro|5', url: 'http://localhost:3100' }]);
  await p.goto('http://localhost:3100/');
  // Re-corrida: si la cuenta quedó en la lista de una corrida anterior, se quita primero (la prueba arma su punto de partida).
  const ya = p.getByText('Te avisamos cuando llegue · quitar');
  if (await ya.first().isVisible().catch(() => false)) { await ya.first().click(); await p.getByText('Te quitamos de la lista.').waitFor(); }
  await p.getByText('Avísame cuando llegue a Allentown').click();
  await p.getByText(/Te escribimos solo cuando Allentown abra/).waitFor();
  console.log('toast ok; espera:', await p.locator('text=EN LA LISTA DE ESPERA').locator('xpath=..').textContent());
  await p.getByText('Te avisamos cuando llegue · quitar').click();
  await p.getByText('Te quitamos de la lista.').waitFor();
  console.log('quitado ok; espera:', await p.locator('text=EN LA LISTA DE ESPERA').locator('xpath=..').textContent());
  await p.getByText('Avísame cuando llegue a Allentown').click();
  await p.waitForTimeout(800);
  // la elección quedó en la cuenta: otro dispositivo sin cookie tl_loc abre en Allentown
  await p.getByText('Ver Hazleton').click();
  await p.waitForTimeout(1500);
  console.log('tras Ver Hazleton, encabezado:', await p.locator('text=/\\d+ MI/').first().textContent());
  const cookies = (await c.cookies()).filter(x => x.name === 'tl_s');
  const c2 = await b.newContext({ viewport: { width: 393, height: 852 } });
  await c2.addCookies(cookies.map(x => ({ name: x.name, value: x.value, url: 'http://localhost:3100' })));
  const p2 = await c2.newPage();
  await p2.goto('http://localhost:3100/buscar?q=pan');
  console.log('otro dispositivo buscar title:', (await p2.locator('body').innerText()).slice(0, 80).replace(/\n/g, ' | '));
  console.log('errores', err);
  await b.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
