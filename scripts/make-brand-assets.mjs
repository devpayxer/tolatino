// Genera los iconos de marca y la imagen para redes a partir del logotipo real
// (`apps/web/public/logo-tolatino.svg`). Se ejecuta a mano cuando cambia el logo:
//   node scripts/make-brand-assets.mjs
//
// Por qué un script y no ficheros sueltos: los seis PNG tienen que salir del
// MISMO trazo. Antes eran un "To'" con un rombo dibujado aparte, y cuando llegó
// el logotipo de verdad no había forma de regenerarlos sin volver a dibujarlos.
//
// Receta (elegida comparando cuatro variantes en pantalla, 2026-08-02):
// fondo morado en degradado + logotipo en BLANCO. Es la única que se sigue
// leyendo a 32px, que es el tamaño real de la pestaña del navegador; el
// logotipo morado sobre blanco desaparece en las barras claras.

// Playwright NO es dependencia del proyecto (pesa mucho y esto se ejecuta una vez
// cada varios meses): se toma de donde esté instalado. Si no está en el proyecto,
// se busca la copia global; se puede forzar otra con PLAYWRIGHT_MODULE.
const { chromium } = await (async () => {
  const candidatos = [
    process.env.PLAYWRIGHT_MODULE,
    'playwright',
    '/opt/node22/lib/node_modules/playwright/index.mjs',
  ].filter(Boolean);
  for (const c of candidatos) {
    try { return await import(c); } catch { /* siguiente */ }
  }
  throw new Error('No se encontró Playwright. Instálalo o define PLAYWRIGHT_MODULE.');
})();
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'apps/web/public');
const RAW = readFileSync(join(PUB, 'logo-tolatino.svg'), 'utf8');

const GRAD = 'linear-gradient(150deg,#7B61FF,#5B3FD6)';
const logo = (size, color = '#fff') =>
  RAW.replace('<svg', `<svg width="${size}" height="${size}"`).replace(/fill="#7B61FF"/g, `fill="${color}"`);

/** Icono cuadrado: fondo degradado + logotipo centrado. */
const icon = (size, { pct = 0.66, radius = 0.22 } = {}) => `
<style>html,body{margin:0}</style>
<div style="width:${size}px;height:${size}px;border-radius:${Math.round(size * radius)}px;background:${GRAD};
            display:flex;align-items:center;justify-content:center;overflow:hidden">
  ${logo(Math.round(size * pct))}
</div>`;

const ASSETS = [
  // La pestaña del navegador. 64px es lo que piden Chrome/Firefox para que se
  // vea nítido en pantallas de alta densidad.
  { file: 'favicon.png', w: 64, h: 64, html: icon(64, { pct: 0.7, radius: 0.2 }) },
  { file: 'icon-192.png', w: 192, h: 192, html: icon(192) },
  { file: 'icon-512.png', w: 512, h: 512, html: icon(512) },
  // Maskable: el sistema recorta un círculo del 80%, así que va a sangre y con
  // el logotipo más pequeño para que no le corten los bordes.
  { file: 'icon-maskable-512.png', w: 512, h: 512, html: icon(512, { pct: 0.54, radius: 0 }) },
  // iOS aplica su propia máscara y pinta negro donde haya transparencia → sin
  // esquinas redondeadas y sin transparencia.
  { file: 'apple-touch-icon.png', w: 180, h: 180, html: icon(180, { pct: 0.66, radius: 0 }) },
];

// Imagen que se ve al compartir el enlace (WhatsApp, Facebook, iMessage).
// La tipografía se INCRUSTA en base64 en vez de enlazarla: el HTML se inyecta con
// `setContent`, así que la página vive en `about:blank` y el navegador no carga
// hojas de estilo de otro origen desde ahí. Sin esto la imagen para redes salía
// con una serif de reserva (y el fallo era silencioso).
async function fuenteIncrustada() {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
  const url = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap';
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  const partes = await Promise.all([...css.matchAll(/url\((https:[^)]+)\)/g)].map(async (m) => {
    const buf = Buffer.from(await (await fetch(m[1])).arrayBuffer());
    return [m[1], `data:font/woff2;base64,${buf.toString('base64')}`];
  }));
  return partes.reduce((acc, [de, a]) => acc.replaceAll(de, a), css);
}

const OG = (fontCss) => `
<style>${fontCss}</style>
<style>html,body{margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif}</style>
<div style="width:1200px;height:630px;background:linear-gradient(120deg,#F4F2F9,#EFEBFF);position:relative;overflow:hidden;
            display:flex;flex-direction:column;justify-content:center;padding:0 92px">
  <div style="position:absolute;top:-120px;right:-120px;width:620px;height:620px;border-radius:50%;
              background:radial-gradient(circle,rgba(123,97,255,.22),transparent 68%)"></div>
  <div style="display:flex;align-items:baseline">
    <span style="font:800 76px 'Plus Jakarta Sans';color:#1E1B2E;letter-spacing:-.03em">To&rsquo;</span>
    <span style="font:800 76px 'Plus Jakarta Sans';color:#7B61FF;letter-spacing:-.03em">Latino</span>
    <span style="display:flex;align-self:center;margin-left:20px">${logo(66, '#7B61FF')}</span>
  </div>
  <div style="font:800 46px 'Plus Jakarta Sans';color:#1E1B2E;letter-spacing:-.02em;margin-top:34px">
    Tu gente, tu barrio, tu idioma.
  </div>
  <div style="font:700 27px 'Plus Jakarta Sans';color:#6E6A85;margin-top:16px">
    Negocios, eventos y vecinos de confianza cerca de ti — en español.
  </div>
</div>`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const fontCss = await fuenteIncrustada();
  for (const a of [...ASSETS, { file: 'og.png', w: 1200, h: 630, html: OG(fontCss), opaque: true }]) {
    const ctx = await browser.newContext({ viewport: { width: a.w, height: a.h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(a.html, { waitUntil: 'networkidle' });
    // `networkidle` no garantiza que la tipografía esté LISTA para pintar: sin
    // esta espera la imagen para redes salía con la serif de reserva.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(PUB, a.file), omitBackground: !a.opaque });
    await ctx.close();
    console.log(`✓ ${a.file}  ${a.w}×${a.h}`);
  }
} finally {
  await browser.close();
}
