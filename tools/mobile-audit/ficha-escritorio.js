// La ficha del negocio v2 (handoff «Business Detail v2», 2026-08-06) — en las
// DOS vistas, con datos reales, y sin que el móvil pague el escritorio.
//
// DE DÓNDE SALE: el fundador mandó el handoff v2 y pidió el diseño IDÉNTICO en
// escritorio y móvil («si algo ya está hecho se ajusta, si algo no está hecho
// se crea»). De ahí: status card → hoja de Horario con horas pico, «Bueno
// saber», fila de acciones, «Lo más pedido», Similares, visor de galería,
// barra de pedido, migas + columna CTA + franja de estado con tabs-píldora +
// riel de 4 tarjetas en escritorio.
//
// QUÉ VIGILA, y por qué cada cosa:
//  · A 1320px: migas, dos columnas con riel (~356px) FIJO al desplazar, franja
//    de estado con los tabs como píldoras, columna CTA con teléfono real,
//    botón «Ver las N fotos», y el riel con horario/dirección REALES.
//  · El riel del restaurante trae el panel «Pide en línea» y la tarjeta del
//    dueño («Doña Carmen») — SOLO porque ese negocio declaró su ficha (0155).
//    La barbería NO la declaró → su riel no puede tenerla (nada inventado).
//  · A 402px: el riel no se pinta; status card (→ hoja de Horario con las
//    barras de horas pico del dueño), «Bueno saber» 2×2, fila de acciones
//    ≥44px, «Lo más pedido» solo con platillos marcados, barra de pedido solo
//    en negocios que venden su menú, «Similares cerca», y el tab «Fotos» abre
//    el visor SIN cambiar de pestaña.
//  · A 1099px (bajo el corte) todo vuelve a una columna.
//  · Ninguna anchura desborda en horizontal.
//
// CÓMO SE EJECUTA — importa, y ya costó DOS vueltas perdidas:
//   1) construir contra la base de PRUEBAS (la que tiene los 548 negocios):
//        VERCEL_ENV=preview pnpm -C apps/web build
//      Con `.env.production` la ficha sale «Sin resultados» y todo falla sin
//      ser culpa del código.
//   2) servir SIN modo SPA (skill §9):
//        npx serve out -l 4173 --no-clipboard      # NUNCA `serve -s`
//      Con `-s` todas las rutas devuelven la portada y este guardián revienta
//      con la app perfectamente sana.
//   3) los dos casos:
//        SHOTS_DIR=<dir> node ficha-escritorio.js                          # hz-food-p4
//        SLUG=hz-beauty-p6 SIN_POPULARES=1 SHOTS_DIR=<dir> node ficha-escritorio.js

const { chromium } = require('playwright');
const { execFile } = require('child_process');

const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const SLUG = process.env.SLUG || 'hz-food-p4';
const SIN_POPULARES = !!process.env.SIN_POPULARES;

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

  // ── 1320px: escritorio v2 ─────────────────────────────────────────────────
  console.log(`1320px · escritorio (${SLUG})`);
  {
    const page = await abrir(1320, 1000);
    const r = await page.evaluate(() => {
      const rail = document.querySelector('aside');
      const cajas = Array.from(document.querySelectorAll('main, main > div, body > div')).map((e) => e.getBoundingClientRect().width);
      const cuerpo = (document.body.innerText || '').replace(/\s+/g, ' ');
      const pills = Array.from(document.querySelectorAll('button')).filter((b) => /^(Resumen|Menú|Reseñas|Fotos|Ubicación)$/.test((b.innerText || '').trim()));
      return {
        railVisible: !!rail && rail.getBoundingClientRect().width > 100,
        railW: rail ? Math.round(rail.getBoundingClientRect().width) : 0,
        railTexto: rail ? (rail.innerText || '').replace(/\s+/g, ' ') : '',
        sticky: rail ? getComputedStyle(rail.firstElementChild || rail).position : '',
        maxCaja: Math.round(Math.max(0, ...cajas)),
        desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
        migas: /Volver a negocios/.test(cuerpo),
        pillsTabs: pills.length,
        ctaCol: !!document.querySelector('[data-cta-col]'),
        verFotos: /Ver las \d+ fotos|Ver la foto/.test(cuerpo),
        panelPedido: !!document.querySelector('[data-panel-pedido]'),
        dueno: !!document.querySelector('[data-tarjeta-dueno]'),
        duenoTexto: (document.querySelector('[data-tarjeta-dueno]')?.innerText || '').replace(/\s+/g, ' '),
      };
    });
    if (!r.railVisible) mal('a 1320px NO hay riel: la ficha sigue en una sola columna');
    else ok(`riel de ${r.railW}px a la derecha`);
    if (r.sticky !== 'sticky') mal(`el riel debería quedarse fijo al desplazar (position=${r.sticky})`);
    else ok('el riel se queda fijo al desplazar');
    if (r.maxCaja < 1000) mal(`el contenido sigue estrangulado (caja máxima ${r.maxCaja}px de 1320)`);
    if (r.desborde) mal('desborde horizontal a 1320px');
    if (!r.migas) mal('faltan las migas «Volver a negocios» (handoff, escritorio)');
    else ok('migas de pan presentes');
    if (r.pillsTabs < 3) mal(`la franja de estado no trae los tabs como píldoras (${r.pillsTabs})`);
    else ok(`franja de estado con ${r.pillsTabs} tabs-píldora`);
    if (!r.ctaCol) mal('falta la columna CTA de la cabecera (handoff §2)');
    else ok('columna CTA presente');
    if (!r.verFotos) mal('falta el botón «Ver las N fotos» del hero');
    else ok('botón «Ver las N fotos» presente');
    if (!/Horario/.test(r.railTexto)) mal('el riel no muestra el horario del negocio');
    else ok('el riel trae el horario real');
    if (!/am|pm/i.test(r.railTexto)) mal('el horario del riel no trae horas de verdad');

    // La tarjeta del dueño SOLO donde el dueño la declaró (0155).
    if (SIN_POPULARES) {
      if (r.dueno) mal('el riel pinta una tarjeta de dueño que este negocio nunca declaró');
      else ok('sin ficha declarada, el riel no inventa dueño');
    } else {
      if (!r.panelPedido) mal('falta el panel de pedido del riel (§11.1)');
      else ok('panel de pedido del riel presente');
      if (!r.dueno) mal('falta la tarjeta del dueño declarada en la ficha (§11.3)');
      else ok(`tarjeta del dueño: ${r.duenoTexto.slice(0, 40)}…`);
    }
    await page.screenshot({ path: `${SHOTS}/ficha-1320.png` });
    await page.close();
  }

  // ── 402px: móvil v2 ───────────────────────────────────────────────────────
  console.log(`402px · móvil (${SLUG})`);
  {
    const page = await abrir(402, 880);
    const r = await page.evaluate(() => {
      const rail = document.querySelector('aside');
      return {
        railPintado: !!rail && rail.getBoundingClientRect().width > 0,
        cuerpo: (document.body.innerText || '').replace(/\s+/g, ' '),
        statusCard: !!document.querySelector('[data-status-card]'),
        buenoSaber: document.querySelectorAll('[data-bueno-saber] > div').length,
        similares: !!document.querySelector('[data-similares]'),
        barraPedido: (document.querySelector('[data-barra-pedido]')?.innerText || '').replace(/\s+/g, ' '),
        desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    if (r.railPintado) mal('el riel de escritorio se está pintando en móvil');
    else ok('el riel no existe en móvil');
    if (!r.statusCard) mal('falta la status card del Resumen (§5.1)');
    else ok('status card presente');
    if (!r.similares) mal('falta «Similares cerca» (§5.9)');
    else ok('«Similares cerca» presente');
    if (r.desborde) mal('desborde horizontal a 402px');

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

    // La status card ABRE la hoja de Horario (§5.1 → §10), con las barras de
    // horas pico SOLO si el dueño las declaró.
    await page.click('[data-status-card]');
    await page.waitForTimeout(900);
    const hoja = await page.evaluate(() => ({
      abierta: /Horario/.test(document.body.innerText || '') && /Listo/.test(document.body.innerText || ''),
      pico: !!document.querySelector('[data-horas-pico]'),
      dias: (document.body.innerText.match(/Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo/g) || []).length,
    }));
    if (!hoja.abierta || hoja.dias < 7) mal(`la status card no abre la hoja de Horario completa (días=${hoja.dias})`);
    else ok('la status card abre la hoja de Horario con la semana entera');
    if (SIN_POPULARES) {
      if (hoja.pico) mal('la hoja pinta horas pico que este negocio nunca declaró');
      else ok('sin horas pico declaradas, la hoja no las inventa');
    } else if (!hoja.pico) {
      mal('faltan las barras de horas pico declaradas por el dueño (§10)');
    } else ok('la hoja trae las barras de horas pico del dueño');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    if (SIN_POPULARES) {
      if (/data-mas-pedido/.test(await page.content())) mal('«Lo más pedido» aparece en un negocio sin platillos populares');
      else ok('sin populares marcados, «Lo más pedido» no se inventa');
      if (r.buenoSaber > 0) mal('«Bueno saber» aparece sin datos declarados por el dueño');
      else ok('sin ficha declarada, «Bueno saber» no aparece');
      if (r.barraPedido) mal('la barra de pedido aparece en un negocio que no vende menú en línea');
      else ok('sin menú en línea, no hay barra de pedido');
    } else {
      if (!/data-mas-pedido/.test(await page.content())) mal('falta «Lo más pedido» en un negocio que sí tiene platillos populares');
      else ok('«Lo más pedido» sale de los platillos que marcó el dueño');
      if (r.buenoSaber < 2) mal(`«Bueno saber» debería traer ≥2 cuadros (tiene ${r.buenoSaber})`);
      else ok(`«Bueno saber» con ${r.buenoSaber} cuadros declarados`);
      if (!/Pedir/.test(r.barraPedido)) mal('falta la barra de pedido (§8) en un negocio que vende su menú');
      else ok(`barra de pedido presente: ${r.barraPedido.slice(0, 50)}`);
    }

    // El tab «Fotos» abre el visor SIN cambiar la pestaña activa (§4) — solo
    // en negocios con fotos reales subidas.
    const hayFotos = await page.evaluate(() => Array.from(document.querySelectorAll('button')).some((b) => (b.innerText || '').trim() === 'Fotos'));
    if (hayFotos) {
      await page.evaluate(() => { Array.from(document.querySelectorAll('button')).find((b) => (b.innerText || '').trim() === 'Fotos')?.click(); });
      await page.waitForTimeout(900);
      const visor = await page.evaluate(() => ({
        abierto: !!document.querySelector('[data-visor]'),
        contador: /\d+ de \d+ fotos/.test(document.body.innerText || ''),
      }));
      if (!visor.abierto || !visor.contador) mal('el tab «Fotos» no abre el visor de galería (§1/§4)');
      else ok('el tab «Fotos» abre el visor a pantalla completa');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const sigue = await page.evaluate(() => !document.querySelector('[data-visor]'));
      if (!sigue) mal('Escape no cierra el visor de galería');
      else ok('Escape cierra el visor');
    }
    await page.screenshot({ path: `${SHOTS}/ficha-402.png` });
    await page.close();
  }

  // ── 1099px: un píxel por debajo del corte ────────────────────────────────
  console.log('1099px · justo bajo el corte');
  {
    const page = await abrir(1099, 900);
    const r = await page.evaluate(() => ({
      railPintado: !!document.querySelector('aside') && document.querySelector('aside').getBoundingClientRect().width > 0,
      statusCard: !!document.querySelector('[data-status-card]'),
      desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
    }));
    if (r.railPintado) mal('a 1099px ya se pinta el riel (el corte debería ser 1100)');
    else if (!r.statusCard) mal('a 1099px no hay riel NI status card: el contenido se perdió');
    else ok('a 1099px vuelve a una columna, con su status card');
    if (r.desborde) mal('desborde horizontal a 1099px');
    await page.close();
  }

  await browser.close();
  console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s)` : '\n✅ la ficha v2 del handoff, con datos reales, en las dos vistas');
  process.exit(fallos.length ? 1 : 0);
})();
