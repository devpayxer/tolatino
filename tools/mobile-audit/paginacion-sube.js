// Al cambiar de página, la vista tiene que subir al principio de la lista.
//
// DE DÓNDE SALE: lo reportó el fundador el 2026-08-05 en Negocios — tocaba la
// página 2 y se quedaba ABAJO, en los propios botones, con los resultados
// nuevos fuera de pantalla. El mismo bloque estaba duplicado en Eventos, así
// que el fallo estaba en las dos.
//
// Esto NO se puede comprobar a ojo en una captura: hay que medir el scroll
// antes y después. Se exige además que la primera tarjeta quede VISIBLE y no
// escondida detrás del encabezado pegajoso.
//
// Uso: SHOTS_DIR=<dir> node paginacion-sube.js   (con el export servido en 4173)
const { chromium } = require('playwright');
const { execFile } = require('child_process');

const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';

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

const fallos = [];
const saltados = [];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  await page.route('**://*.supabase.co/**', async (route) => {
    const { status, body } = await curlRelay(route.request());
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://images.unsplash.com/**', (r) => r.abort());
  await page.route('**://fonts.g*/**', (r) => r.abort());
  await page.addInitScript(() => localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null })));

  for (const [ruta, nombre] of [['/negocios/', 'Negocios'], ['/eventos/', 'Eventos']]) {
    await page.goto(`${BASE}${ruta}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(9000);

    // Bajar hasta la paginación, como hace una persona.
    const btn = page.locator('button[aria-current="page"] >> visible=true').first();
    if (!(await btn.count())) {
      // Sin datos para 2 páginas no hay nada que medir. Se dice en voz alta en
      // vez de dar un OK mudo que aparente cobertura que no existe.
      console.log(`  ${nombre.padEnd(9)} SALTADO · no hay suficientes resultados para una 2ª página`);
      saltados.push(nombre);
      continue;
    }
    await btn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);

    const antes = await page.evaluate(() => window.scrollY);
    const dos = page.locator('button:text-is("2") >> visible=true').first();
    if (!(await dos.count())) { fallos.push(`${nombre}: no se encontró la página 2`); continue; }
    await dos.click();
    await page.waitForTimeout(1200);
    const despues = await page.evaluate(() => window.scrollY);

    // ¿La primera tarjeta quedó de verdad a la vista, y no tapada?
    const visible = await page.evaluate(() => {
      const h = document.querySelector('header');
      const alto = h instanceof HTMLElement ? h.offsetHeight : 0;
      // Se mide el CONTENEDOR marcado, no su primer hijo. Dos trampas ya dieron
      // falsos fallos aquí: (1) "el primer .grid de la página" cogía otro grid;
      // (2) en Negocios cada tarjeta va envuelta en un div `display:contents`,
      // que NO genera caja — su rect es 0,0,0,0 y parecía estar siempre tapada.
      const card = document.querySelector('[data-lista]');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return { top: Math.round(r.top), tapada: r.top < alto - 4, fuera: r.top > window.innerHeight };
    });

    const subio = despues < antes - 50;
    console.log(`  ${nombre.padEnd(9)} scrollY ${antes} → ${despues} ${subio ? '✓ subió' : '✗ NO subió'}` +
      (visible ? ` · primera tarjeta top=${visible.top}${visible.tapada ? ' ✗ TAPADA por el encabezado' : ''}${visible.fuera ? ' ✗ FUERA de pantalla' : ''}` : ''));
    if (!subio) fallos.push(`${nombre}: no subió al cambiar de página (${antes} → ${despues})`);
    if (visible?.tapada) fallos.push(`${nombre}: la primera tarjeta queda tapada por el encabezado`);
    if (visible?.fuera) fallos.push(`${nombre}: la primera tarjeta queda fuera de pantalla`);
    await page.screenshot({ path: `${SHOTS}/pag-${nombre.toLowerCase()}.png` });
  }

  await browser.close();
  if (fallos.length) {
    console.error(`\nFALLO · ${fallos.length}:`);
    for (const f of fallos) console.error('  · ' + f);
    process.exit(1);
  }
  if (saltados.length) console.log(`\nOK PARCIAL · sube donde se pudo medir; NO probado: ${saltados.join(', ')}.`);
  else console.log('\nOK · al paginar, las dos pantallas suben al principio de la lista.');
})().catch((e) => { console.error('FALLO ·', e.message); process.exit(1); });
