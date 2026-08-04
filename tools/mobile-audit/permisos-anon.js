// Un visitante SIN cuenta recorre el sitio y ninguna llamada le sale «permission
// denied».
//
// DE DÓNDE SALE: la migración 0148 quita el permiso de EJECUCIÓN a `anon` sobre
// 41 RPC y sobre las 56 `admin_*`. La comprobación de mesa —«estas funciones ya
// devolvían "auth required", así que cerrarlas no cambia nada»— es cierta pero
// insuficiente: solo prueba lo que YO creo que llama la app. Esto prueba lo que
// la app llama DE VERDAD, pinchando por las pantallas.
//
// Cualquier respuesta 401/403 de PostgREST, o un cuerpo con «permission denied»,
// es un fallo: significa que una pantalla pública depende de una función que
// acabamos de cerrar.
//
// Uso:  SHOTS_DIR=<dir> node permisos-anon.js     (con el export servido en 4173)
const { chromium } = require('playwright');
const { execFile } = require('child_process');

const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';

function curlRelay(req) {
  return new Promise((resolve) => {
    const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) args.push('-H', `${k}: ${h[k]}`);
    const body = req.postData(); if (body != null) args.push('--data-binary', body);
    args.push(req.url());
    execFile('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => {
      const out = stdout || ''; if (err && !out) return resolve({ status: 502, body: String(err).slice(0, 200) });
      const nl = out.lastIndexOf('\n'); resolve({ status: parseInt(out.slice(nl + 1), 10) || 500, body: out.slice(0, nl) });
    });
  });
}

const denegadas = [];
const llamadas = new Set();

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });

  await page.route('**://*.supabase.co/**', async (route) => {
    const req = route.request();
    const { status, body } = await curlRelay(req);
    const m = /\/rpc\/([a-z0-9_]+)/i.exec(req.url());
    if (m) llamadas.add(m[1]);
    if (status === 401 || status === 403 || /permission denied/i.test(body)) {
      denegadas.push({ url: req.url().replace(/^https:\/\/[^/]+/, ''), status, body: body.slice(0, 160) });
    }
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());

  await page.addInitScript(() => {
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  });

  const ir = async (ruta, espera = 2500) => {
    await page.goto(`${BASE}${ruta}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(espera);
  };

  // 1 · Las cuatro superficies públicas del cliente.
  for (const ruta of ['/', '/comunidad', '/negocios', '/eventos', '/bienes-raices', '/autos']) {
    await ir(ruta);
  }

  // 2 · La ficha de un negocio, entrando por una tarjeta (no por enlace directo:
  //     un enlace directo puede «funcionar» aunque la lista esté rota).
  await ir('/negocios', 3500);
  const verPerfil = page.locator('text=Ver perfil >> visible=true').first();
  await verPerfil.click({ timeout: 8000 });
  await page.waitForTimeout(3500);
  // Que la ficha ABRIÓ de verdad: si no, el recorrido de pestañas de abajo no
  // prueba nada y el test pasaría en vacío. Ya pasó una vez.
  const abrio = await page.evaluate(() =>
    document.body.innerText.includes('Resumen') && document.body.innerText.includes('Reseñas'));
  if (!abrio) {
    await page.screenshot({ path: `${SHOTS}/permisos-anon-FALLO-ficha.png` });
    console.error('FALLO: la ficha de negocio no llego a abrirse; el recorrido no probaria nada.');
    await browser.close();
    process.exit(1);
  }
  // Recorrer las pestañas de contenido que la ficha esté enseñando. Solo salen
  // las de módulos activos CON contenido, así que la lista cambia por negocio;
  // se prueba la que haya.
  const ETIQUETAS = ['Novedades', 'Menú', 'Tienda', 'Servicios', 'Renta', 'Eventos', 'Propiedades', 'Autos', 'Relacionados', 'Reseñas'];
  let tocadas = 0;
  for (const t of ETIQUETAS) {
    const tab = page.locator(`button:text-is("${t}") >> visible=true`).first();
    if (!(await tab.count())) continue;
    await tab.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1100);
    tocadas++;
  }
  if (tocadas < 2) {
    console.error(`FALLO: solo se pudieron abrir ${tocadas} pestañas de la ficha; el recorrido no prueba nada.`);
    await page.screenshot({ path: `${SHOTS}/permisos-anon-FALLO-tabs.png` });
    await browser.close();
    process.exit(1);
  }
  console.log(`pestañas de la ficha recorridas: ${tocadas}`);

  // 3 · Buscar — la superficie que más RPC dispara.
  await ir('/negocios', 2500);
  // `>> visible=true`: la cabecera monta la caja de móvil y la de escritorio a
  // la vez, y `.first()` cae en la oculta. Ya pasó una vez; no se repite.
  const caja = page.locator('input[name="busqueda"] >> visible=true').first();
  if (await caja.count()) {
    await caja.click().catch(() => {});
    await caja.fill('mecanico');
    await page.waitForTimeout(1800);
    await caja.press('Enter').catch(() => {});
    await page.waitForTimeout(2500);
  }

  await page.screenshot({ path: `${SHOTS}/permisos-anon.png`, fullPage: false });
  await browser.close();

  console.log(`RPC distintas llamadas sin sesión: ${llamadas.size}`);
  console.log(`  ${[...llamadas].sort().join(', ')}`);
  if (denegadas.length) {
    console.error(`\nFALLO · ${denegadas.length} llamada(s) denegadas a un visitante sin cuenta:`);
    for (const d of denegadas) console.error(`  ${d.status}  ${d.url}\n        ${d.body}`);
    process.exit(1);
  }
  console.log('\nOK · ningun 401/403 ni «permission denied» para un visitante sin cuenta.');
})();
