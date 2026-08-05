// La búsqueda tiene que entender español, erratas incluidas — y no inventarse
// resultados cuando no hay.
//
// DE DÓNDE SALE: el fundador escribió «mecanico» y no salió ninguno de los 18
// talleres del radio (2026-08-04). La 0144 arregló el idioma; la 0152 arregló
// que además se buscara con índice y que la capa de erratas viera el mismo texto
// que las demás. Esto vigila que ninguna de las dos se deshaga.
//
// POR QUÉ CUENTA LA RESPUESTA DEL RPC Y NO LAS TARJETAS: la primera versión
// contaba `[data-lista] > *` y daba 6 pasara lo que pasara — incluso con una
// consulta inventada. En esa pantalla hay más de una lista y el selector estaba
// mirando otra. Un número que no cambia nunca no es una prueba que pase: es una
// prueba que no mide. Se cuenta lo que la base devuelve, que es lo que cambió.
//
// La consulta inventada (`xkqjwz`) no es un adorno: si diera resultados, los
// otros tres números no valdrían nada, porque significaría que no se filtra.
//
// Uso: node busqueda-espanol.js   (con el export servido en 4173)

const { chromium } = require('playwright');
const { execFile } = require('child_process');

const BASE = 'http://127.0.0.1:4173';

/** Consulta → qué se espera. Todas menos la última tienen que encontrar algo. */
const CASOS = [
  ['mecanico', '>0'],   // sin tilde: nadie las escribe en el teléfono
  ['mecánico', '>0'],
  ['mecaniko', '>0'],   // errata: la capa 4
  ['barberia', '>0'],
  ['xkqjwz', '=0'],     // no existe: TIENE que salir vacío
];

function relay(req) {
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

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));

  let ultimo = null;
  await page.route('**://*.supabase.co/**', async (route) => {
    const { status, body } = await relay(route.request());
    if (route.request().url().includes('/rpc/search_businesses')) {
      try { const d = JSON.parse(body); ultimo = { n: d.length, primero: d[0]?.name }; }
      catch { ultimo = { n: -1 }; }
    }
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://images.unsplash.com/**', (r) => r.abort());
  await page.route('**tiles.openfreemap.org/**', (r) => r.abort());
  await page.route('**://fonts.g*/**', (r) => r.abort());
  await page.addInitScript(() => localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null })));

  await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);

  // Hay dos cajas de búsqueda en el DOM (la de móvil y la de escritorio); solo
  // una está visible según el ancho. Escribir en la oculta no dispara nada.
  const caja = page.locator('input[type="search"] >> visible=true').first();
  if (!(await caja.count())) { console.log('❌ no hay caja de búsqueda visible'); process.exit(1); }

  let malo = 0;
  for (const [q, esperado] of CASOS) {
    ultimo = null;
    await caja.fill(q);
    await page.waitForTimeout(5000);
    if (!ultimo) { console.log(`  ${q.padEnd(10)} ❌ la app ni llamó a search_businesses`); malo++; continue; }
    const ok = esperado === '>0' ? ultimo.n > 0 : ultimo.n === 0;
    console.log(`  ${q.padEnd(10)} ${ok ? '✅' : '❌'} ${ultimo.n} resultado(s)${ultimo.primero ? ` · 1º: ${ultimo.primero}` : ''}`);
    if (!ok) malo++;
  }

  if (errores.length) { console.log('  ❌ errores de página:', errores.slice(0, 2).join(' | ')); malo++; }
  await browser.close();
  console.log(malo ? `\n❌ ${malo} problema(s)` : '\n✅ la búsqueda entiende español y no se inventa nada');
  process.exit(malo ? 1 : 0);
})();
