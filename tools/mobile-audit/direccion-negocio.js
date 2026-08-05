// La dirección del negocio: formulario completo, y el PUNTO que se guarda tiene
// que ser el de esa dirección — no el de la ciudad.
//
// DE DÓNDE SALE (fundador, 2026-08-05): «la dirección debe usar nuestra
// geo-dirección para que ayude a la automatización, y debe ser un formulario
// completo profesional: dirección, ciudad, estado, zipcode».
//
// El fallo de fondo no se veía en pantalla: el alta guardaba `p_lat`/`p_lng` de
// la CIUDAD del selector, así que el pin de cada negocio caía en el centro del
// pueblo. Todo lo que mide distancia trabajaba sobre eso.
//
// QUÉ COMPRUEBA EXACTAMENTE, y qué NO. Comprueba hasta donde llega el navegador
// sin iniciar sesión: que están los cinco campos, que elegir una sugerencia
// reparte las piezas en ellos, que entonces la pantalla declara «Ubicación
// confirmada» (solo aparece cuando hay coordenada), y que escribir a mano SIN
// poder geocodificar lo dice en vez de fingir.
//
// **NO comprueba la llamada final a `create_business`**: publicar exige sesión
// iniciada y ese camino es otra prueba. La primera versión de este archivo decía
// en su cabecera que interceptaba esa llamada y comprobaba la coordenada — y la
// variable donde la guardaba no se leía en ninguna línea. Un comentario que
// promete más de lo que el código hace es peor que no tener prueba: la siguiente
// persona confía en algo que nunca se verificó.
//
// El geocodificador es un servicio externo (Photon/Census) y desde este sandbox
// no se alcanza, así que se finge con una respuesta fija.
//
// Uso: node direccion-negocio.js   (con el export servido en 4173)

const { chromium } = require('playwright');
const { execFile } = require('child_process');

const BASE = 'http://127.0.0.1:4173';
// Una dirección real de Hazleton, con su punto. Lejos del centro de la ciudad a
// propósito: si se guardara el de la ciudad, la diferencia se nota.
const SUGERENCIA = {
  formatted: '762 Mcnair St, Hazleton, PA 18201',
  line1: '762 Mcnair St', cityName: 'Hazleton', city: 'Hazleton, PA',
  state: 'PA', postal: '18201', lat: 40.9712, lng: -75.9891, verified: true,
};
const CIUDAD = { lat: 40.9584, lng: -75.9746 };   // centro de Hazleton

function relay(req) {
  return new Promise((resolve) => {
    const a = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) a.push('-H', `${k}: ${h[k]}`);
    const b = req.postData(); if (b != null) a.push('--data-binary', b);
    a.push(req.url());
    execFile('curl', a, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (e, o) => {
      o = o || ''; if (e && !o) return resolve({ status: 502, body: '' });
      const n = o.lastIndexOf('\n'); resolve({ status: parseInt(o.slice(n + 1), 10) || 500, body: o.slice(0, n) });
    });
  });
}

const fallos = [];
const ok = (m) => console.log(`  ✅ ${m}`);
const mal = (m) => { console.log(`  ❌ ${m}`); fallos.push(m); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));

  await page.route('**://*.supabase.co/**', async (route) => {
    const req = route.request();
    const { status, body } = await relay(req);
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  // El geocodificador, fingido: este sandbox no sale a Photon ni al censo.
  await page.route('**photon.komoot.io/**', (r) => r.fulfill({
    status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    body: JSON.stringify({ features: [{ geometry: { coordinates: [SUGERENCIA.lng, SUGERENCIA.lat] }, properties: { housenumber: '762', street: 'Mcnair St', city: 'Hazleton', state: 'Pennsylvania', postcode: '18201', countrycode: 'US' } }] }),
  }));
  await page.route('**geocoding.geo.census.gov/**', (r) => r.abort());
  await page.route('**://images.unsplash.com/**', (r) => r.abort());
  await page.route('**tiles.openfreemap.org/**', (r) => r.abort());
  await page.route('**://fonts.g*/**', (r) => r.abort());
  await page.addInitScript(({ c }) => {
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: c.lat, lng: c.lng, address: null, alat: null, alng: null, addressId: null }));
  }, { c: CIUDAD });

  await page.goto(`${BASE}/negocio/publicar/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await page.evaluate(() => localStorage.removeItem('tl_biz_onboarding_v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  // paso 1: categoría · paso 2: subcategoría
  const seguir = async () => { await page.locator('button:has-text("Continuar"), button:has-text("Siguiente")').last().click(); await page.waitForTimeout(1200); };
  await page.locator('button', { hasText: /Comida|Restaurante/i }).first().click();
  await page.waitForTimeout(900); await seguir();
  await page.locator('[role="button"], button').filter({ hasText: /./ }).nth(3).click().catch(() => {});
  await page.waitForTimeout(700); await seguir();

  // paso 3: los datos. Aquí vive lo que interesa.
  const campos = await page.evaluate(() => ['dir-line1', 'dir-line2', 'dir-city', 'dir-state', 'dir-zip'].filter((id) => !!document.getElementById(id)));
  if (campos.length === 5) ok('el formulario tiene los cinco campos (calle, suite, ciudad, estado, ZIP)');
  else mal(`faltan campos: solo hay ${campos.join(', ') || 'ninguno'}`);

  const line1 = page.locator('#dir-line1');
  if (!(await line1.count())) { console.log('  ⚠️  sin el paso de datos no se puede seguir midiendo'); }
  else {
    await page.locator('input').first().fill('Tacos El Guardián');
    await page.locator('input[inputmode="tel"]').first().fill('7135550142');
    await line1.fill('762 Mcnair');
    await page.waitForTimeout(2200);                       // el freno del autocompletado
    const sug = page.locator('ul li button').first();
    if (!(await sug.count())) mal('el autocompletado no ofreció ninguna sugerencia');
    else {
      await sug.click();
      await page.waitForTimeout(800);
      const v = await page.evaluate(() => ({
        line1: document.getElementById('dir-line1').value,
        city: document.getElementById('dir-city').value,
        state: document.getElementById('dir-state').value,
        zip: document.getElementById('dir-zip').value,
      }));
      const bien = v.line1.includes('762') && v.city.includes('Hazleton') && v.state === 'PA' && v.zip === '18201';
      if (bien) ok(`al elegir la sugerencia se repartieron las piezas (${v.city} · ${v.state} · ${v.zip})`);
      else mal(`las piezas no se repartieron: ${JSON.stringify(v)}`);

      // La coordenada no se puede leer del DOM, pero ese aviso SOLO se pinta
      // cuando la hay. Es la señal de que el punto viene de la dirección.
      const confirmada = await page.locator('text=/Ubicación confirmada/i').count();
      if (confirmada) ok('la pantalla declara ubicación confirmada: hay coordenada de la dirección');
      else mal('sin «ubicación confirmada»: la dirección se quedó sin punto');

      // Y al revés: escrita a mano y sin geocodificador, hay que DECIRLO.
      await page.route('**photon.komoot.io/**', (r) => r.abort());
      await line1.fill('999 Calle Que No Existe');
      await page.locator('#dir-city').fill('Hazleton, PA');
      await page.locator('#dir-city').blur();
      await page.waitForTimeout(2500);
      const avisa = await page.locator('text=/No pudimos ubicar esa dirección/i').count();
      if (avisa) ok('sin geocodificador lo avisa y deja continuar, en vez de fingir');
      else mal('una dirección sin ubicar no avisa de nada');
    }
  }

  if (errores.length) mal(`errores de página: ${errores.slice(0, 2).join(' | ')}`);
  else ok('sin errores de página');

  await browser.close();
  console.log(fallos.length ? `\n❌ ${fallos.length} problema(s)` : '\n✅ la dirección se captura completa y geolocalizada');
  process.exit(fallos.length ? 1 : 0);
})();
