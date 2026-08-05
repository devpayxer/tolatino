// ¿Por qué tarda? Medir, no opinar.
//
// El fundador preguntó (2026-08-05) si la lentitud del mapa y el «primero el
// hueco y luego la imagen» vienen del código, del proveedor o del hosting. Esto
// lo mide en un navegador de verdad con red de móvil simulada, y reparte la
// culpa por bytes y por milisegundos.
//
// Los proveedores de tiles están bloqueados en este sandbox, así que el mapa se
// mide con un proveedor FINGIDO servido desde aquí: eso deja fuera la latencia
// del proveedor real —que no podemos medir— y aísla lo ÚNICO que es culpa
// nuestra: cuánto pesa MapLibre, cuándo lo pedimos y cuántas vueltas da antes de
// pintar. Lo que salga aquí es el suelo: en la vida real, más.
//
// Uso: node medir-carga.js   (con el export servido en 4173)

const { chromium } = require('playwright');
const { execFile } = require('child_process');

const BASE = 'http://127.0.0.1:4173';
const SLUG = process.env.SLUG || 'hz-food-p4';

function curlRelay(req) {
  return new Promise((resolve) => {
    const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) args.push('-H', `${k}: ${h[k]}`);
    const b = req.postData(); if (b != null) args.push('--data-binary', b);
    args.push(req.url());
    execFile('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (e, o) => {
      o = o || ''; if (e && !o) return resolve({ status: 502, body: '' });
      const nl = o.lastIndexOf('\n'); resolve({ status: parseInt(o.slice(nl + 1), 10) || 500, body: o.slice(0, nl) });
    });
  });
}

// Chromium en este sandbox no habla con el proxy, así que las imágenes de
// Unsplash no le llegan (curl sí puede). Se relevan en binario, vía base64, para
// poder medir su peso REAL en vez de contar ceros.
function curlBinario(url) {
  return new Promise((resolve) => {
    execFile('curl', ['-sS', '--max-time', '25', '-H', 'Accept: image/webp,image/*,*/*', '--output', '-', url],
      { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }, (e, o) => resolve(e && !o?.length ? null : o));
  });
}

/** Qué tipo anunciar: lo que de verdad va a devolver esa URL. */
function tipoDe(url) {
  if (/\/render\/image\//.test(url)) return 'image/webp';
  if (/[?&]fm=webp/.test(url)) return 'image/webp';
  if (/\.png(\?|$)/i.test(url)) return 'image/png';
  if (/\.webp(\?|$)/i.test(url)) return 'image/webp';
  return 'image/jpeg';
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });

  // 4G de la calle: 8 Mbit bajada, 100 ms de ida y vuelta. Ni fibra ni desastre.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, downloadThroughput: (8 * 1024 * 1024) / 8,
    uploadThroughput: (2 * 1024 * 1024) / 8, latency: 100,
  });

  const t0 = Date.now();
  // `request.sizes()` viene del propio navegador: no depende de que el servidor
  // mande `content-length` (el estático local no lo manda, y salían ceros).
  const pedidos = [];
  page.on('requestfinished', async (req) => {
    let bytes = 0;
    try { bytes = (await req.sizes()).responseBodySize || 0; } catch { /* da igual */ }
    pedidos.push({ url: req.url(), ms: Date.now() - t0, bytes });
  });

  // UNA sola ruta para Supabase, que decide dentro. Antes eran dos y las
  // imágenes salían rotas: en Playwright gana la ruta registrada MÁS TARDE, así
  // que la genérica se comía las de `/storage/` y las devolvía como texto —
  // binario corrompido. El fallo era de la prueba, no de la app.
  await page.route('**://*.supabase.co/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/storage/v1/')) {
      const buf = await curlBinario(url);
      if (!buf) return route.abort();
      return route.fulfill({ status: 200, headers: { 'content-type': tipoDe(url), 'access-control-allow-origin': '*' }, body: buf });
    }
    const { status, body } = await curlRelay(route.request());
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://images.unsplash.com/**', async (route) => {
    const buf = await curlBinario(route.request().url());
    if (!buf) return route.abort();
    await route.fulfill({ status: 200, headers: { 'content-type': tipoDe(route.request().url()), 'access-control-allow-origin': '*' }, body: buf });
  });
  await page.route('**://fonts.g*/**', (r) => r.abort());
  await page.addInitScript(() => localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null })));

  await page.goto(process.env.RUTA ? `${BASE}${process.env.RUTA}` : `${BASE}/negocios/?b=${SLUG}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);
  // Bajar como baja una persona: con `loading="lazy"` lo que no se mira no se
  // pide, y medir sin desplazarse daría un cero que no significa «no hay peso».
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(700); }
  await page.waitForTimeout(2500);

  // ── imágenes ──────────────────────────────────────────────────────────────
  const imgs = pedidos.filter((p) => /images\.unsplash\.com|storage\/v1\//.test(p.url));
  const totalImg = imgs.reduce((a, b) => a + b.bytes, 0);
  console.log('\n── IMÁGENES (ficha del negocio, 402 px de ancho) ───────────────');
  console.log(`  ${imgs.length} imágenes · ${kb(totalImg)} en total · ${imgs.length ? kb(totalImg / imgs.length) : '—'} de media`);
  for (const i of imgs.slice(0, 6)) {
    const w = (i.url.match(/[?&]w=(\d+)/) || [])[1];
    console.log(`    ${String(i.ms).padStart(5)} ms  ${kb(i.bytes).padStart(7)}  ${w ? `pide ${w}px` : 'sin w='}  ${i.url.slice(0, 68)}…`);
  }

  // ── el mapa ───────────────────────────────────────────────────────────────
  console.log('\n── EL MAPA ─────────────────────────────────────────────────────');
  const antes = pedidos.length;
  const bloque = page.locator('text=Ubicación').first();
  const tScroll = Date.now();
  if (await bloque.count()) await bloque.scrollIntoViewIfNeeded();
  await page.waitForTimeout(8000);

  const nuevos = pedidos.slice(antes);
  // El chunk de MapLibre es, con diferencia, el JS más pesado que se pide al
  // llegar aquí. Se busca por «el mayor», no por un umbral en bytes: el servidor
  // lo manda comprimido y el umbral se quedaba corto.
  const chunkML = nuevos.filter((p) => /_next\/static\/chunks\//.test(p.url))
    .sort((a, b) => b.bytes - a.bytes)[0];
  const estilo = nuevos.find((p) => /tiles\.openfreemap\.org|tile\.openstreetmap/.test(p.url));
  console.log(`  desde que «Ubicación» entra en pantalla:`);
  if (chunkML) console.log(`    +${chunkML.ms - (tScroll - t0)} ms  MapLibre (${kb(chunkML.bytes)}) — no se descarga hasta aquí`);
  else console.log('    MapLibre no se pidió en esta pasada (¿ya estaba en caché?)');
  if (estilo) console.log(`    +${estilo.ms - (tScroll - t0)} ms  primera petición al proveedor de tiles`);
  else console.log('    ningún proveedor de tiles respondió (bloqueado en este sandbox)');

  console.log('\n── PESO TOTAL DE LA PÁGINA ─────────────────────────────────────');
  const js = pedidos.filter((p) => p.url.endsWith('.js')).reduce((a, b) => a + b.bytes, 0);
  const css = pedidos.filter((p) => p.url.endsWith('.css')).reduce((a, b) => a + b.bytes, 0);
  console.log(`  JS ${kb(js)} · CSS ${kb(css)} · imágenes ${kb(totalImg)}`);

  await browser.close();
})();
