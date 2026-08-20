// Paso 1 de la migración al «Sistema To'Latino» (handoff 2026-08-20):
// TOKENS + TIPOGRAFÍAS. Este script es la PRUEBA de que el paso llegó al
// navegador — no al código, al navegador.
//
// QUÉ COMPRUEBA, y por qué cada cosa:
//  · Las tres familias (Onest · Bricolage Grotesque · Space Mono) están
//    CARGADAS de verdad (`document.fonts.check`), no solo pedidas. Una fuente
//    que no llega no rompe nada: cae a system-ui y la app sigue andando, solo
//    se ve genérica. Es la regresión que se cuela sin que nadie la note.
//  · El `body` hereda Onest y la tinta nueva (#16112E).
//  · El acento de marca llegó: hay algo pintado con el rosa #FF2D6F.
//  · No queda `Plus Jakarta Sans` aplicada en ningún elemento visible.
//  · Nada desborda en horizontal a 402px (el móvil manda).
//
// CÓMO SE EJECUTA (importa — con `-s` todas las rutas devuelven la portada):
//   VERCEL_ENV=preview pnpm -C apps/web build
//   npx serve apps/web/out -l 4173 --no-clipboard
//   SHOTS_DIR=<dir> node tools/mobile-audit/sistema-paso1.js

const { chromium } = require('playwright');
const { execFile } = require('child_process');

const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';

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

// Las pantallas que mejor delatan un cambio de tokens: la que ve todo el mundo
// al entrar, el directorio, una ficha con foto, y el panel del dueño.
const RUTAS = [
  ['comunidad', '/comunidad/'],
  ['negocios', '/negocios/'],
  ['ficha', '/negocios/?b=hz-food-p4'],
  ['portada', '/'],
];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  const abrir = async (w, h) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await page.route('**://*.supabase.co/**', async (route) => {
      const u = route.request().url();
      if (u.includes('/storage/v1/')) {
        const b = await bin(u);
        if (!b) return route.abort();
        return route.fulfill({ status: 200, headers: { 'content-type': 'image/webp', 'access-control-allow-origin': '*' }, body: b });
      }
      const r = await relay(route.request());
      return route.fulfill({ status: r.status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: r.body });
    });
    return page;
  };

  for (const [ancho, alto, etiqueta] of [[402, 880, 'movil'], [1320, 1000, 'escritorio']]) {
    console.log(`\n── ${etiqueta} · ${ancho}px ──`);
    for (const [nombre, ruta] of RUTAS) {
      const page = await abrir(ancho, alto);
      await page.goto(BASE + ruta, { waitUntil: 'domcontentloaded' });
      // Esperar a que las fuentes web terminen de descargarse ANTES de medir o
      // capturar: si no, se fotografía la caída a system-ui y parece un fallo.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1400);

      const m = await page.evaluate(() => {
        const cs = getComputedStyle(document.body);
        // `document.fonts.check` responde por la fuente REAL cargada, no por lo
        // que diga la hoja de estilos.
        const cargada = (f, peso) => document.fonts.check(`${peso} 16px "${f}"`);
        // ¿Hay algo pintado con el acento nuevo? Se recorre lo visible.
        let rosa = 0, jakarta = 0, display = 0, mono = 0;
        for (const el of document.querySelectorAll('body *')) {
          const s = getComputedStyle(el);
          const t = s.backgroundColor + ' ' + s.color + ' ' + s.borderColor + ' ' + s.backgroundImage;
          if (t.includes('255, 45, 111')) rosa++;
          const ff = s.fontFamily;
          if (ff.includes('Plus Jakarta')) jakarta++;
          if (ff.includes('Bricolage')) display++;
          if (ff.includes('Space Mono')) mono++;
        }
        return {
          fuenteBody: cs.fontFamily,
          tintaBody: cs.color,
          fondoBody: cs.backgroundColor,
          onest: cargada('Onest', 400),
          bricolage: cargada('Bricolage Grotesque', 700),
          spaceMono: cargada('Space Mono', 400),
          rosa, jakarta, display, mono,
          desborda: document.documentElement.scrollWidth > window.innerWidth + 1,
          ancho: document.documentElement.scrollWidth,
        };
      });

      const p = `${etiqueta}/${nombre}`;
      if (!m.onest) mal(`${p}: Onest NO llegó a cargar — la interfaz está en la fuente del sistema`);
      if (!m.bricolage) mal(`${p}: Bricolage Grotesque NO llegó a cargar`);
      if (!m.spaceMono) mal(`${p}: Space Mono NO llegó a cargar`);
      if (!m.fuenteBody.includes('Onest')) mal(`${p}: el body no aplica Onest (${m.fuenteBody})`);
      if (m.jakarta) mal(`${p}: ${m.jakarta} elemento(s) siguen con Plus Jakarta Sans aplicada`);
      if (m.tintaBody !== 'rgb(22, 17, 46)') mal(`${p}: la tinta del body es ${m.tintaBody}, se esperaba rgb(22, 17, 46)`);
      if (!m.rosa) mal(`${p}: no hay NADA pintado con el acento nuevo #FF2D6F — el token no llegó`);
      if (m.desborda) mal(`${p}: desborda en horizontal (${m.ancho}px en ${ancho}px)`);
      if (!fallos.length || true) {
        ok(`${p}: Onest+Bricolage+Mono cargadas · ${m.rosa} elemento(s) con el acento nuevo · display:${m.display} mono:${m.mono} · sin desborde`);
      }

      await page.screenshot({ path: `${SHOTS}/paso1-${etiqueta}-${nombre}.png`, fullPage: false });
      await page.close();
    }
  }

  await browser.close();
  if (fallos.length) {
    console.error(`\n✖ ${fallos.length} comprobación(es) fallaron.\n`);
    process.exit(1);
  }
  console.log('\n✅ Paso 1 servido: tres familias cargadas, tinta y acento nuevos en pantalla.\n');
})();
