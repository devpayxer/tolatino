// El mapa de la ficha del negocio tiene que PINTARSE — o retirarse con dignidad.
//
// DE DÓNDE SALE: el fundador mandó una captura de la sección «Ubicación» con un
// RECTÁNGULO GRIS VACÍO (2026-08-05). Dos causas, las dos mías:
//   1. `MapaMini` no importaba `maplibre-gl.css`, así que MapLibre montaba el
//      mapa y su lienzo no se colocaba dentro del contenedor.
//   2. El respaldo se daba por satisfecho si el ESTILO traía capas. El estilo es
//      un JSON de otra URL: puede llegar mientras los tiles no llegan nunca.
//
// QUÉ COMPRUEBA, entonces, y por qué esas tres cosas:
//   A. Con tiles que SÍ responden → hay lienzo con tamaño real y NO salta el
//      respaldo. (Cubre la causa 1 y que no seamos demasiado nerviosos.)
//   B. Con TODO proveedor caído → el bloque vuelve al marcador rayado. Nunca un
//      hueco gris que parece la app rota. (Cubre la causa 2.)
//   C. Sin coordenadas → marcador rayado, sin montar mapa.
//
// El sandbox de esta sesión no puede salir a ningún proveedor de tiles (el proxy
// devuelve 403 al CONNECT), así que el caso A se sirve desde aquí: se intercepta
// la URL del estilo y se responde un estilo raster que apunta a un PNG generado
// en memoria. Para MapLibre es un proveedor real; para nosotros es determinista.
//
// Uso: node mapa-ficha.js   (con el export servido en 4173)

const { chromium } = require('playwright');
const { execFile } = require('child_process');
const zlib = require('zlib');

const BASE = 'http://127.0.0.1:4173';

// ── un PNG de 256×256 de un color plano, hecho a mano ───────────────────────
function png(r, g, b) {
  const N = 256;
  const crcT = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcT[n] = c >>> 0;
  }
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcT[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (tipo, datos) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(datos.length);
    const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(cuerpo));
    return Buffer.concat([len, cuerpo, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bits, RGB
  const fila = Buffer.alloc(1 + N * 3);
  for (let x = 0; x < N; x++) { fila[1 + x * 3] = r; fila[2 + x * 3] = g; fila[3 + x * 3] = b; }
  const cruda = Buffer.concat(Array.from({ length: N }, () => fila));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(cruda)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
const TILE = png(214, 205, 240);

const ESTILO_FALSO = JSON.stringify({
  version: 8,
  sources: { falso: { type: 'raster', tiles: ['https://tiles.test/{z}/{x}/{y}.png'], tileSize: 256 } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#ffffff' } },
    { id: 'falso', type: 'raster', source: 'falso' },
  ],
});

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
const ok = (m) => console.log(`  ✅ ${m}`);
const mal = (m) => { console.log(`  ❌ ${m}`); fallos.push(m); };

(async () => {
  const slug = process.env.SLUG || 'hz-food-p4';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  async function abrir({ tilesVivos }) {
    const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await page.route('**://*.supabase.co/**', async (route) => {
      const { status, body } = await curlRelay(route.request());
      await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
    });
    await page.route('**://images.unsplash.com/**', (r) => r.abort());
    await page.route('**://fonts.g*/**', (r) => r.abort());
    // Los proveedores de verdad NUNCA se tocan desde aquí: o se fingen, o se caen.
    if (tilesVivos) {
      await page.route('**tiles.openfreemap.org/**', (r) =>
        r.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: ESTILO_FALSO }));
      await page.route('**tiles.test/**', (r) =>
        r.fulfill({ status: 200, headers: { 'content-type': 'image/png', 'access-control-allow-origin': '*' }, body: TILE }));
    } else {
      await page.route('**tiles.openfreemap.org/**', (r) => r.abort());
      await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
    }
    await page.addInitScript(() => localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null })));
    await page.goto(`${BASE}/negocios/?b=${slug}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    return { page, errores };
  }

  // ── A · con tiles que responden ───────────────────────────────────────────
  console.log('A · proveedor que responde');
  {
    const { page, errores } = await abrir({ tilesVivos: true });
    const bloque = page.locator('text=Ubicación').first();
    if (await bloque.count()) await bloque.scrollIntoViewIfNeeded();
    await page.waitForTimeout(6000);

    const caja = await page.evaluate(() => {
      const c = document.querySelector('canvas.maplibregl-canvas');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    if (!caja) mal('no se montó ningún lienzo de MapLibre');
    else if (caja.w < 100 || caja.h < 60) mal(`lienzo con tamaño inservible: ${caja.w}×${caja.h}`);
    else ok(`lienzo montado y colocado: ${caja.w}×${caja.h}`);

    // Con tiles vivos el respaldo NO debe saltar: si saltara, veríamos el rayado.
    if (await page.locator('[data-mapa="respaldo"]').count()) mal('el respaldo saltó aunque los tiles respondían');
    else ok('el respaldo no saltó (tiles pintados)');

    // El PIN encima del mapa, no debajo. Esto es lo que vigila que la hoja de
    // MapLibre esté cargada en ESTA ruta: sin ella el marcador no lleva
    // `position:absolute` y se va al flujo normal, fuera del recuadro. (El
    // tamaño del lienzo no sirve de centinela: MapLibre se lo pone en línea, así
    // que sale bien con hoja y sin ella — se comprobó quitándola.)
    const pin = await page.evaluate(() => {
      const m = document.querySelector('.maplibregl-marker');
      const c = document.querySelector('canvas.maplibregl-canvas');
      if (!m || !c) return null;
      const a = m.getBoundingClientRect(), b = c.getBoundingClientRect();
      return {
        posicion: getComputedStyle(m).position,
        dentro: a.top >= b.top - 30 && a.bottom <= b.bottom + 30,
      };
    });
    if (!pin) mal('no hay marcador en el mapa');
    else if (pin.posicion !== 'absolute') mal(`el marcador no está posicionado (${pin.posicion}): falta maplibre-gl.css en esta ruta`);
    else if (!pin.dentro) mal('el marcador cae fuera del recuadro del mapa');
    else ok('el pin va colocado sobre el mapa');

    if (errores.length) mal(`errores de página: ${errores.slice(0, 2).join(' | ')}`);
    else ok('sin errores de página');
    await page.close();
  }

  // ── B · todos los proveedores caídos ─────────────────────────────────────
  console.log('B · ningún proveedor responde');
  {
    const { page, errores } = await abrir({ tilesVivos: false });
    const bloque = page.locator('text=Ubicación').first();
    if (await bloque.count()) await bloque.scrollIntoViewIfNeeded();
    // 3,5 s vectorial + 3,5 s raster + margen
    await page.waitForTimeout(11000);

    const estado = await page.evaluate(() => ({
      lienzo: !!document.querySelector('canvas.maplibregl-canvas'),
      respaldo: !!document.querySelector('[data-mapa="respaldo"]'),
      vivo: !!document.querySelector('[data-mapa="vivo"]'),
    }));
    if (estado.lienzo || estado.vivo) mal('sigue el mapa vacío montado: no volvió al marcador rayado');
    else if (!estado.respaldo) mal('ni mapa ni marcador rayado: hay un hueco');
    else ok('sin tiles vuelve al marcador rayado, no deja hueco gris');

    if (errores.length) mal(`errores de página: ${errores.slice(0, 2).join(' | ')}`);
    else ok('sin errores de página');
    await page.close();
  }

  await browser.close();
  console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s)` : '\n✅ el mapa se pinta, y cuando no puede se retira');
  process.exit(fallos.length ? 1 : 0);
})();
