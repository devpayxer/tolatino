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
//  · A 402px el riel NO se pinta y el Horario sigue en el Resumen. Escritorio
//    se deriva del móvil, nunca al revés.
//  · En móvil está la FILA DE ACCIONES del handoff §3 (cómo llegar / llamar /
//    la acción del negocio / guardar), con objetivos táctiles de 44px. Antes
//    esas dos primeras estaban enterradas tras el «…» de contacto.
//  · «Lo más pedido» (§5.5) aparece cuando el dueño marcó platillos populares,
//    y NO aparece cuando no los marcó — nunca se inventa un «más pedido».
//  · A 1099px (un píxel por debajo del corte) todo vuelve a una columna, sin
//    romperse a medio camino.
//  · Ninguna anchura desborda en horizontal.
//
// CÓMO SE EJECUTA — importa, y ya costó una vuelta perdida:
//   1) el export TIENE que estar construido contra la base de PRUEBAS, que es la
//      que tiene los 548 negocios sembrados:
//        VERCEL_ENV=preview pnpm -C apps/web build
//      Con `.env.production` la ficha sale "Sin resultados" y el guardián marca
//      ocho fallos que NO son del código: es la base vacía.
//   2) servir `apps/web/out` en 4173 (`npx serve -s out -l 4173`).
//   3) los dos casos, uno con populares y otro sin ellos:
//        SHOTS_DIR=<dir> node ficha-escritorio.js                         # hz-food-p4
//        SLUG=hz-beauty-p6 SIN_POPULARES=1 SHOTS_DIR=<dir> node ficha-escritorio.js
//      El caso negativo NO puede pasar en vacío: si la ficha no cargara, la
//      aserción de la fila de acciones falla y tumba la corrida entera.

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

    // La fila de acciones del handoff §3: existe y se puede tocar de verdad.
    const acc = await page.evaluate(() => {
      const fila = document.querySelector('[data-acciones]');
      if (!fila) return null;
      const hijos = Array.from(fila.children);
      return {
        n: hijos.length,
        altoMin: Math.round(Math.min(...hijos.map((c) => c.getBoundingClientRect().height))),
        textos: hijos.map((c) => (c.innerText || '').replace(/\s+/g, ' ').trim()),
      };
    });
    if (!acc) mal('falta la fila de acciones en móvil (handoff §3)');
    else if (acc.n < 3) mal(`la fila de acciones solo tiene ${acc.n} tarjetas`);
    else if (acc.altoMin < 44) mal(`las tarjetas de acción miden ${acc.altoMin}px de alto (mínimo táctil 44)`);
    else ok(`fila de acciones con ${acc.n} tarjetas de ${acc.altoMin}px: ${acc.textos.join(' · ')}`);

    // «Lo más pedido»: tiene que salir SOLO si hay platillos marcados.
    const masPedido = await page.evaluate(() => !!document.querySelector('[data-mas-pedido]'));
    if (process.env.SIN_POPULARES) {
      if (masPedido) mal('«Lo más pedido» aparece en un negocio sin platillos populares');
      else ok('sin populares marcados, «Lo más pedido» no se inventa');
    } else if (!masPedido) {
      mal('falta «Lo más pedido» en un negocio que sí tiene platillos populares');
    } else ok('«Lo más pedido» sale de los platillos que marcó el dueño');
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
