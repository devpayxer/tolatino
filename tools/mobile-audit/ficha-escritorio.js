// La ficha del negocio en ESCRITORIO: dos columnas, riel fijo, y el móvil intacto.
//
// DE DÓNDE SALE (fundador, 2026-08-06): «en el desktop se ve muy desolado».
// Tenía razón y la causa era de una línea: toda la ficha vivía dentro de
// `max-w-[680px]`, así que en un monitor de 1320 la mitad de la pantalla era
// fondo vacío — la ficha de móvil estirada. Mandó un handoff nuevo (Business
// Detail v2) y de ahí salió el reflujo: hero a lo ancho con rejilla de fotos,
// contenido a la izquierda, riel fijo a la derecha (§11 del handoff).
//
// QUÉ VIGILA, y por qué cada cosa:
//  · A 1320px hay DOS columnas y el riel existe → si alguien vuelve a meter
//    todo en una columna estrecha, salta aquí.
//  · El riel trae datos REALES (horario del negocio, su dirección) → un riel
//    con texto inventado sería peor que no tenerlo (regla #8).
//  · A 402px el marcado es el de siempre: el riel NO se pinta y el Horario
//    sigue en el Resumen. Escritorio se deriva del móvil, nunca al revés.
//  · A 1099px (un píxel por debajo del corte) todo vuelve a una columna, sin
//    romperse a medio camino.
//  · Ninguna anchura desborda en horizontal.
//
// Uso: SHOTS_DIR=<dir> node ficha-escritorio.js   (con el export en 4173)

const { chromium } = require('playwright');
const { execFile } = require('child_process');

const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const SLUG = process.env.SLUG || 'hz-food-p4';

function relay(req) {
  return new Promise((r) => {
    const a = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) a.push('-H', `${k}: ${h[k]}`);
    const b = req.postData(); if (b != null) a.push('--data-binary', b);
    a.push(req.url());
    execFile('curl', a, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (e, o) => {
      o = o || ''; if (e && !o) return r({ status: 502, body: '' });
      const n = o.lastIndexOf('\n'); r({ status: parseInt(o.slice(n + 1), 10) || 500, body: o.slice(0, n) });
    });
  });
}
function bin(url) {
  return new Promise((r) => execFile('curl', ['-sS', '--max-time', '25', '-H', 'Accept: image/webp,image/*,*/*', '--output', '-', url],
    { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }, (e, o) => r(e && !o?.length ? null : o)));
}

const fallos = [];
const ok = (m) => console.log(`  ✅ ${m}`);
const mal = (m) => { console.log(`  ❌ ${m}`); fallos.push(m); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  const abrir = async (w, h) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.route('**://*.supabase.co/**', async (route) => {
      const u = route.request().url();
      if (u.includes('/storage/v1/')) {
        const b = await bin(u);
        if (!b) return route.abort();
        return route.fulfill({ status: 200, headers: { 'content-type': 'image/webp', 'access-control-allow-origin': '*' }, body: b });
      }
      const { status, body } = await relay(route.request());
      await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
    });
    await page.route('**://images.unsplash.com/**', async (route) => {
      const b = await bin(route.request().url());
      if (!b) return route.abort();
      await route.fulfill({ status: 200, headers: { 'content-type': 'image/webp', 'access-control-allow-origin': '*' }, body: b });
    });
    await page.route('**tiles.openfreemap.org/**', (r) => r.abort());
    await page.route('**://fonts.g*/**', (r) => r.abort());
    await page.addInitScript(() => localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null })));
    await page.goto(`${BASE}/negocios/?b=${SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(9000);
    return page;
  };

  // ── 1320px: el caso que motivó todo ───────────────────────────────────────
  console.log('1320px · escritorio');
  {
    const page = await abrir(1320, 1000);
    const r = await page.evaluate(() => {
      const rail = document.querySelector('aside');
      const railVisible = !!rail && rail.getBoundingClientRect().width > 100;
      // Ancho aprovechado: la caja del contenido frente a la ventana. Si la
      // ficha vuelve a vivir en 680px, esta proporción se desploma.
      const cajas = Array.from(document.querySelectorAll('main, main > div, body > div'))
        .map((e) => e.getBoundingClientRect().width);
      return {
        railVisible,
        railW: rail ? Math.round(rail.getBoundingClientRect().width) : 0,
        railTexto: rail ? (rail.innerText || '').replace(/\s+/g, ' ') : '',
        maxCaja: Math.round(Math.max(0, ...cajas)),
        desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
        sticky: rail ? getComputedStyle(rail.firstElementChild || rail).position : '',
      };
    });
    if (!r.railVisible) mal('a 1320px NO hay riel: la ficha sigue en una sola columna');
    else ok(`riel de ${r.railW}px a la derecha`);
    if (r.sticky !== 'sticky') mal(`el riel debería quedarse fijo al desplazar (position=${r.sticky})`);
    else ok('el riel se queda fijo al desplazar');
    if (r.maxCaja < 1000) mal(`el contenido sigue estrangulado (caja máxima ${r.maxCaja}px de 1320)`);
    else ok(`el contenido usa el ancho (${r.maxCaja}px de 1320)`);
    if (r.desborde) mal('desborde horizontal a 1320px');

    // El riel tiene que traer DATOS del negocio, no relleno.
    if (!/Horario/.test(r.railTexto)) mal('el riel no muestra el horario del negocio');
    else ok('el riel trae el horario real');
    if (!/Ubicación/.test(r.railTexto)) mal('el riel no muestra la ubicación');
    else ok('el riel trae la ubicación real');
    if (!/am|pm/i.test(r.railTexto)) mal('el horario del riel no trae horas de verdad');

    await page.screenshot({ path: `${SHOTS}/ficha-1320.png` });
    await page.close();
  }

  // ── 402px: nada de esto puede haber tocado el móvil ───────────────────────
  console.log('402px · móvil');
  {
    const page = await abrir(402, 880);
    const r = await page.evaluate(() => {
      const rail = document.querySelector('aside');
      return {
        railPintado: !!rail && rail.getBoundingClientRect().width > 0,
        cuerpo: (document.body.innerText || '').replace(/\s+/g, ' '),
        desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    if (r.railPintado) mal('el riel de escritorio se está pintando en móvil');
    else ok('el riel no existe en móvil');
    if (!/Horario/.test(r.cuerpo)) mal('el Horario desapareció del Resumen en móvil');
    else ok('el Horario sigue en el Resumen del móvil');
    if (!/Fotos/.test(r.cuerpo)) mal('la sección Fotos desapareció');
    else ok('la sección Fotos sigue ahí');
    if (r.desborde) mal('desborde horizontal a 402px');
    await page.screenshot({ path: `${SHOTS}/ficha-402.png` });
    await page.close();
  }

  // ── 1099px: un píxel por debajo del corte ────────────────────────────────
  console.log('1099px · justo bajo el corte');
  {
    const page = await abrir(1099, 900);
    const r = await page.evaluate(() => ({
      railPintado: !!document.querySelector('aside') && document.querySelector('aside').getBoundingClientRect().width > 0,
      tieneHorario: /Horario/.test(document.body.innerText || ''),
      desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
    }));
    if (r.railPintado) mal('a 1099px ya se pinta el riel (el corte debería ser 1100)');
    else if (!r.tieneHorario) mal('a 1099px no hay riel NI Horario en el resumen: el contenido se perdió');
    else ok('a 1099px vuelve a una columna, con su Horario');
    if (r.desborde) mal('desborde horizontal a 1099px');
    await page.close();
  }

  await browser.close();
  console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s)` : '\n✅ escritorio a dos columnas con riel real, y el móvil sin tocar');
  process.exit(fallos.length ? 1 : 0);
})();
