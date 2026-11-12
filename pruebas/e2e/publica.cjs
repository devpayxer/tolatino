const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); }; // 9b-1 · antes solo imprimía: la corrida la contaba «en verde con 0 ✓»
const { chromium } = require('playwright');
// 9a · Teléfonos de prueba siempre en 555 (el repo es público: nunca un número que pueda ser de alguien).
const TEL = '5705556' + String(Date.now()).slice(-3), TEL2 = '5705556' + String((Date.now() + 500) % 1000).padStart(3, '0');
const OUT = ENT.S + '/cap/', FP = ENT.rec('fotos') + '/';
const { medios } = require('../lib/negocio-nuevo.cjs'); // 9b-1 · el puerto de Garage de ESTA corrida (antes 3902 fijo)
const seguir = async (p) => { const b = p.locator('button:has-text("Seguir"), span:has-text("Seguir"), div[role=button]:has-text("Seguir")').last(); await b.click(); await p.waitForTimeout(700); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const m = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await medios(m);
  const p = await m.newPage(); p.on('pageerror', e => err.push('m ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels/.test(x.text())) err.push('m console ' + x.text()); });
  await p.goto('http://localhost:3100/publica');
  await p.getByText('Publica tu negocio en 5 minutos').waitFor();
  await p.screenshot({ path: OUT + 'p0-a1.png' });
  await p.getByPlaceholder('(570) 555-0134').fill(TEL);
  await p.getByText('Enviarme el código').click();
  const cod = await p.locator('[data-modo-pruebas] b').textContent({ timeout: 8000 });
  await p.getByPlaceholder('······').fill(cod.trim());
  await p.getByText('Verificar').click();
  await p.getByText('¿Cómo te llamas?').waitFor();
  await p.getByPlaceholder('Rafael').fill('Mario'); await p.getByPlaceholder('Núñez').fill('Peña');
  await p.getByText('Seguir', { exact: true }).last().click();
  await p.getByText('¿Qué tipo de negocio tienes?').waitFor({ timeout: 10000 });
  await p.getByText('Belleza', { exact: true }).first().click(); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'p1-debug.png' }); await p.locator('text=/¿QUÉ HACES/').waitFor({ timeout: 8000 });
  await p.locator('[data-screen-label="ONB-NEG-B1 · tu negocio"] span:has-text("Barbería")').first().click().catch(async () => { await p.locator('[data-screen-label="ONB-NEG-B1 · tu negocio"] div[style*="flex-wrap"] > *').first().click(); });
  await p.getByPlaceholder('Ej.: Barbería Don Fello').fill('Barbería ' + TEL.slice(-4));
  await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + 'p1-b1.png' });
  await p.getByText('Seguir', { exact: true }).last().click(); await p.waitForTimeout(900);
  console.log('paso:', p.url());
  // C1: responde lo primero de cada pregunta hasta que se pueda seguir
  for (let i = 0; i < 6; i++) {
    const nota = await p.locator('text=RESPONDE LO QUE FALTA').count(); if (!nota) break;
    const grupos = p.locator('[data-screen-label^="ONB-NEG-C1"] > div');
    const n = await grupos.count();
    for (let g = 0; g < n; g++) { const opc = grupos.nth(g).locator('div[role=button], span[style*="border-radius: 999px"], div[style*="cursor: pointer"]').first(); if (await opc.count()) await opc.click().catch(() => {}); await p.waitForTimeout(120); }
  }
  await p.screenshot({ path: OUT + 'p2-c1.png' });
  await p.getByText('Seguir', { exact: true }).last().click(); await p.waitForTimeout(900);
  console.log('paso:', p.url());
  await p.screenshot({ path: OUT + 'p3-d1.png' });
  await p.locator('button, span, div').filter({ hasText: /^Seguir · / }).last().click(); await p.waitForTimeout(900);
  console.log('paso:', p.url());
  const dir = p.getByPlaceholder('312 N Wyoming St'); if (await dir.count()) await dir.fill('412 N Wyoming St');
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + 'p4-e1.png' });
  await p.getByText('Seguir', { exact: true }).last().click(); await p.waitForTimeout(900);
  console.log('paso:', p.url());
  // F1: una foto falsa (debe rechazarse) y dos reales
  const inputs = p.locator('input[type=file]');
  await inputs.nth(1).setInputFiles(FP + 'falsa.jpg'); await p.waitForTimeout(1500);
  ok(await p.locator('text=/no parece una foto/').count() >= 1, 'la foto falsa se rechaza («no parece una foto»)');
  await inputs.nth(1).setInputFiles([FP + 'portada.jpg', FP + 'galeria.png']);
  await p.locator('text=TUS FOTOS · LA PRIMERA ES LA PORTADA').waitFor({ timeout: 15000 });
  await p.waitForFunction(() => document.querySelectorAll('[aria-label="Quitar foto"]').length === 2, null, { timeout: 20000 });
  ok(await p.locator('[aria-label="Quitar foto"]').count() === 2, 'las dos fotos reales subieron');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + 'p5-f1.png' });
  await p.locator('text=/^Publicar · /').last().click();
  await p.getByText('PUBLICADA').first().waitFor({ timeout: 15000 });
  await p.waitForTimeout(800);
  ok(true, `publicada: «PUBLICADA» (${new URL(p.url()).pathname})`);
  await p.screenshot({ path: OUT + 'p6-h1.png', fullPage: true });
  // Escritorio: un negocio nuevo con otra cuenta, para ver el riel y la página en vivo
  const d = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await medios(d);
  const q = await d.newPage(); q.on('pageerror', e => err.push('d ' + e.message));
  await q.goto('http://localhost:3100/publica');
  await q.evaluate(async (TEL2X) => { const j = (u, b) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()); const a = await j('/api/cuenta/codigo', { telefono: TEL2X }); const v = await j('/api/cuenta/verificar', { telefono: TEL2X, codigo: a.codigoPrueba }); if (!v.nombre) await j('/api/cuenta/perfil', { nombre: 'Lucía', apellido: 'Gómez', apodo: '' }); }, TEL2);
  await q.goto('http://localhost:3100/publica?paso=B1');
  await q.getByText('Comida', { exact: true }).first().click(); await q.waitForTimeout(300);
  await q.locator('[data-screen-label="ONB-NEG-B1 · tu negocio"] div[style*="flex-wrap"] > *').first().click();
  await q.getByPlaceholder('Ej.: Barbería Don Fello').fill('Fonda Doña Lucía'); await q.waitForTimeout(600);
  await q.screenshot({ path: OUT + 'p7-desk-b1.png' });
  ok(await q.getByPlaceholder('Ej.: Barbería Don Fello').inputValue() === 'Fonda Doña Lucía', 'escritorio: el paso B1 con el nombre del negocio');
  ok(!err.length, `sin errores en las páginas (${err.join(' | ').slice(0, 300) || 'ninguno'})`);
  await b.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
