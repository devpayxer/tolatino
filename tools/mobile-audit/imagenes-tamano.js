// Ninguna imagen puede pesar mucho más grande de lo que se pinta.
//
// DE DÓNDE SALE: el fundador preguntó por qué las fotos tardaban, teniendo ya un
// conversor a WebP (2026-08-05). Lo teníamos, pero convertía al SUBIR y guardaba
// un archivo de 1600 px que luego se servía al avatar de 44, a la tarjeta de 374
// y a la galería por igual. Medido: 710 KB por ficha; con el tamaño correcto,
// 234 KB.
//
// El arreglo (todo `<img>` pasa por `imgUrl()`, en `lib/img.ts`) se puede
// deshacer sin querer con UN `<img src={foo}>` nuevo escrito a mano. Por eso
// esto no comprueba «se ve bien»: comprueba la CLASE — que ningún archivo sea
// desproporcionado respecto a su hueco, y de paso que ninguno se haya roto por
// el camino, que es el riesgo de reescribir direcciones.
//
// Uso: node imagenes-tamano.js   (con el export servido en 4173)

const { chromium } = require('playwright');
const { execFile } = require('child_process');

const BASE = 'http://127.0.0.1:4173';
// LA REGLA. No es «no más de N veces el hueco» —ese número se acaba subiendo
// hasta que la prueba pasa, que es hacerse trampas—: es que el archivo sea la
// variante MÁS PEQUEÑA de las que guardamos que aún sirva para pintarlo nítido
// en una pantalla retina. Para un hueco de 120 px hacen falta 240, y la menor
// que llega a 240 es 400: 400 está bien y 800 no.
const VARIANTES = [200, 400, 800, 1600];
const permitido = (anchoPintado) =>
  VARIANTES.find((v) => v >= anchoPintado * 2) ?? VARIANTES[VARIANTES.length - 1];

function curlTexto(req) {
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
// Se pide COMO PIDE UN NAVEGADOR (`Accept: image/webp`), porque el
// transformador de Supabase negocia el formato: sin esa cabecera devuelve JPEG.
// La primera versión de esta prueba no la mandaba y luego etiquetaba la
// respuesta como webp — el navegador no podía descodificarla y salían 5
// «imágenes rotas» que no lo estaban. El fallo era de la prueba.
function curlBinario(url) {
  return new Promise((resolve) => {
    execFile('curl', ['-sS', '--max-time', '25', '-H', 'Accept: image/webp,image/*,*/*', '--output', '-', url],
      { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }, (e, o) => resolve(e && !o?.length ? null : o));
  });
}

/** Qué tipo anunciar: lo que de verdad va a devolver esa URL. */
function tipoDe(url) {
  if (/\/render\/image\//.test(url)) return 'image/webp';        // negociado arriba
  if (/[?&]fm=webp/.test(url)) return 'image/webp';
  if (/\.png(\?|$)/i.test(url)) return 'image/png';
  if (/\.webp(\?|$)/i.test(url)) return 'image/webp';
  return 'image/jpeg';
}

const fallos = [];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });

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
    const { status, body } = await curlTexto(route.request());
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://images.unsplash.com/**', async (route) => {
    const buf = await curlBinario(route.request().url());
    if (!buf) return route.abort();
    await route.fulfill({ status: 200, headers: { 'content-type': tipoDe(route.request().url()), 'access-control-allow-origin': '*' }, body: buf });
  });
  await page.route('**tiles.openfreemap.org/**', (r) => r.abort());
  await page.route('**://fonts.g*/**', (r) => r.abort());
  await page.addInitScript(() => localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null })));

  for (const [ruta, nombre] of [
    [`/negocios/?b=${process.env.SLUG || 'hz-food-p4'}`, 'Ficha de negocio'],
    ['/comunidad/', 'Comunidad'],
    ['/eventos/', 'Eventos'],
  ]) {
    await page.goto(`${BASE}${ruta}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 800); await page.waitForTimeout(600); }
    await page.waitForTimeout(2500);

    const r = await page.evaluate(({ VARIANTES }) => {
      const permitido = (w) => VARIANTES.find((v) => v >= w * 2) ?? VARIANTES[VARIANTES.length - 1];
      const rotas = [], gordas = [];
      for (const im of Array.from(document.images)) {
        const caja = im.getBoundingClientRect();
        if (caja.width < 4) continue;                 // no se está pintando
        if (!im.complete) continue;                   // aún cargando: no acusar
        if (im.naturalWidth === 0) { rotas.push(im.currentSrc.slice(0, 90)); continue; }
        const tope = permitido(caja.width);
        if (im.naturalWidth > tope) {
          gordas.push(`${im.naturalWidth}px de archivo en un hueco de ${Math.round(caja.width)}px (bastaba ${tope}) · ${im.currentSrc.slice(0, 70)}`);
        }
      }
      return { total: document.images.length, rotas, gordas };
    }, { VARIANTES });

    console.log(`\n${nombre} · ${r.total} imágenes en el DOM`);
    if (r.rotas.length) { console.log(`  ❌ ${r.rotas.length} rota(s)`); r.rotas.slice(0, 3).forEach((x) => console.log(`     ${x}`)); fallos.push(`${nombre}: ${r.rotas.length} rotas`); }
    else console.log('  ✅ ninguna rota');
    if (r.gordas.length) { console.log(`  ❌ ${r.gordas.length} desproporcionada(s)`); r.gordas.slice(0, 4).forEach((x) => console.log(`     ${x}`)); fallos.push(`${nombre}: ${r.gordas.length} desproporcionadas`); }
    else console.log('  ✅ ninguna trae más píxeles de los que su hueco necesita');
  }

  await browser.close();
  console.log(fallos.length ? `\n❌ ${fallos.length} problema(s)` : '\n✅ cada imagen viene al tamaño que se pinta');
  process.exit(fallos.length ? 1 : 0);
})();
