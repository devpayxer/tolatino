// webview-fase0.js — el export, DENTRO del envoltorio de la app (2026-11-05).
//
// POR QUÉ EXISTE: la Fase 0 del plan de tiendas (docs/LAUNCH-CHECKLIST.md §4)
// arregla una clase de fallo que NO se ve en el navegador y que rompería la app
// empaquetada el primer día: dentro del envoltorio el origen no es
// `tolatino.com`, es local del teléfono —`capacitor://localhost` en iOS,
// `http://localhost` en Android—, así que toda URL que SALGA de la app
// construida con `window.location.origin` nace rota (el enlace del correo lleva
// a «localhost»; el `return_url` de Stripe deja al comprador en el vacío).
//
// Mirar el código no basta: el arreglo vive en una detección de entorno, y una
// detección solo se prueba METIÉNDOSE en los dos entornos. Esta prueba corre el
// MISMO build servido en tres contextos:
//
//   A · Envoltorio Android → servido en `http://localhost` SIN puerto, que es
//       exactamente el origen del WebView de Android (y de un TWA).
//   B · Envoltorio iOS     → `window.Capacitor.isNativePlatform() === true`,
//       la señal oficial que inyecta Capacitor (el esquema `capacitor://` no se
//       puede servir desde aquí, así que se prueba la señal, que es lo que lee
//       el código).
//   C · Web normal (control) → `http://127.0.0.1:4173`, como cualquier vista
//       previa. Es el caso que DEBE seguir usando el origen local: si saliera
//       `tolatino.com`, habríamos roto el sitio de pruebas del fundador para
//       arreglar la app. Sin este tercer caso la prueba no demuestra nada.
//
// Qué comprueba en cada contexto:
//   1. El export ARRANCA y se ve (portada, Comunidad, Negocios, Entrar) sin
//      errores de consola ni peticiones muertas — el «probar el export dentro
//      de un WebView» del checklist.
//   2. El enlace mágico del correo: se interviene la llamada real de Supabase y
//      se lee el `email_redirect_to` que la app manda. (No se envía ningún
//      correo ni se crea ningún usuario: la respuesta se falsea aquí.)
//   3. El enlace de «Compartir» de una publicación, leído del portapapeles.
//
// Los 12 usos del barrido comparten UN helper (`siteUrl`/`currentPageUrl` de
// `apps/web/src/lib/site.ts`), y el guardián del build prohíbe volver a
// `location.origin`; así que estos dos flujos prueban el helper de punta a
// punta, y el guardián cubre que nadie se salga de él.
//
// USO (el puerto 80 necesita root, que es lo normal en el contenedor):
//   cd apps/web && VERCEL_ENV=preview pnpm build
//   cd ../../tools/mobile-audit && SHOTS_DIR=/tmp/shots node webview-fase0.js

const { chromium } = require('playwright');
const { execFile } = require('child_process');
const { createServer } = require('node:http');
const { readFile, stat } = require('node:fs/promises');
const { readFileSync } = require('node:fs');
const { join, extname, normalize } = require('node:path');
const { mkdirSync } = require('node:fs');

const OUT = join(__dirname, '../../apps/web/out');
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const DOMINIO = 'https://tolatino.com'; // NEXT_PUBLIC_SITE_URL de producción
const CORREO = 'fase0-webview@example.com'; // nunca se envía: la llamada se falsea

mkdirSync(SHOTS, { recursive: true });

// ── Servidor estático mínimo ────────────────────────────────────────────────
// A propósito SIN reescritura tipo SPA (el `-s` de `serve` que el README
// prohíbe): el servidor interno de Capacitor tampoco reescribe nada, sirve los
// archivos exportados tal cual. Si una ruta solo funciona con reescritura, en la
// app no funcionaría — y aquí se vería.
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.webp': 'image/webp',
};
function servidor(puerto) {
  const srv = createServer(async (req, res) => {
    const ruta = decodeURIComponent(req.url.split('?')[0]);
    let archivo = join(OUT, normalize(ruta).replace(/^(\.\.[/\\])+/, ''));
    try {
      if ((await stat(archivo)).isDirectory()) archivo = join(archivo, 'index.html');
    } catch {
      if (!extname(archivo)) archivo += '.html';
    }
    try {
      const cuerpo = await readFile(archivo);
      res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream' });
      res.end(cuerpo);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404');
    }
  });
  return new Promise((ok, no) => {
    srv.on('error', no);
    srv.listen(puerto, '0.0.0.0', () => ok(srv));
  });
}

// ── Relé por curl: el navegador del contenedor no alcanza Supabase ──────────
function curlRelay(req) {
  return new Promise((resolve) => {
    const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) args.push('-H', `${k}: ${h[k]}`);
    const body = req.postData(); if (body != null) args.push('--data-binary', body);
    args.push(req.url());
    execFile('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => {
      const out = stdout || '';
      if (err && !out) return resolve({ status: 502, body: String(err).slice(0, 200) });
      const nl = out.lastIndexOf('\n');
      resolve({ status: parseInt(out.slice(nl + 1), 10) || 500, body: out.slice(0, nl) });
    });
  });
}

// Una sola publicación de prueba, SOLO para el modo sin red (ver arriba). No
// viaja al build: vive en esta prueba y se anuncia en el informe.
const POST_PRUEBA = {
  id: 'fase0-prueba-0001', type: 'ayuda', author_initials: 'PF', author_color: '#7B61FF',
  author_name: 'Prueba Fase Cero', author_id: null, hood: 'Hazleton', city: 'Hazleton, PA',
  created_at: new Date().toISOString(), pinned: false, recommends: 0, edited_at: null,
  body_es: 'Publicación de prueba de la Fase 0 (no es contenido real).',
  body_en: 'Phase 0 test post (not real content).',
};

/** ¿Alcanza este contenedor a Supabase? Si no, la prueba lo dice y sigue. */
function alcanzaSupabase(url) {
  return new Promise((ok) => {
    execFile('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '12', `${url}/rest/v1/`], { encoding: 'utf8' }, (err, out) => {
      ok(!err && out.trim() !== '000');
    });
  });
}
let SIN_RED = false;

const CIUDAD = JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null });

const CONTEXTOS = [
  {
    id: 'android', nombre: 'Envoltorio Android (WebView: http://localhost, sin puerto)',
    base: 'http://localhost', nativo: true, capacitor: false,
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36',
  },
  {
    id: 'ios', nombre: 'Envoltorio iOS (Capacitor.isNativePlatform() = true)',
    base: 'http://127.0.0.1:4173', nativo: true, capacitor: true,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  },
  {
    id: 'web', nombre: 'Web normal / vista previa (control — NO debe usar el dominio)',
    base: 'http://127.0.0.1:4173', nativo: false, capacitor: false,
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  },
];

const fallos = [];
const lineas = [];
function marca(ctx, prueba, ok, detalle) {
  lineas.push(`  ${ok ? '✓' : '✖'} [${ctx}] ${prueba}${detalle ? ` → ${detalle}` : ''}`);
  if (!ok) fallos.push(`[${ctx}] ${prueba}: ${detalle}`);
}

(async () => {
  const envStaging = readFileSync(join(__dirname, '../../apps/web/.env.staging'), 'utf8');
  const SUPA = (envStaging.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/) || [])[1] || '';
  SIN_RED = !(await alcanzaSupabase(SUPA));

  let s80, s4173;
  try {
    s80 = await servidor(80);
    s4173 = await servidor(4173);
  } catch (e) {
    console.error(`No se pudo abrir el servidor estático (${e.message}). El puerto 80 necesita root.`);
    process.exit(1);
  }
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

  for (const ctx of CONTEXTOS) {
    const esperado = ctx.nativo ? DOMINIO : ctx.base;
    const context = await browser.newContext({
      viewport: { width: 402, height: 852 }, userAgent: ctx.ua, deviceScaleFactor: 1,
      permissions: ['clipboard-read', 'clipboard-write'], locale: 'es-US',
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ctx.base });
    const page = await context.newPage();

    // El envoltorio de iOS inyecta `Capacitor` antes de que corra nuestro JS.
    if (ctx.capacitor) {
      await page.addInitScript(() => {
        window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' };
      });
    }
    await page.addInitScript((c) => { try { localStorage.setItem('tl.city', c); } catch { /* sin almacenamiento */ } }, CIUDAD);

    const errores = [];
    page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 160)); });
    page.on('pageerror', (e) => errores.push(`pageerror: ${String(e).slice(0, 160)}`));
    const muertas = [];
    page.on('response', (r) => {
      const u = r.url();
      if (u.startsWith(ctx.base) && r.status() >= 400) muertas.push(`${r.status()} ${u.slice(ctx.base.length)}`);
    });

    await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('**://fonts.gstatic.com/**', (r) => r.abort());

    // El enlace mágico: se intercepta la llamada REAL y se falsea la respuesta,
    // así se lee lo que la app pide sin mandar un correo ni crear un usuario.
    let redirectPedido = null;
    await page.route('**://*.supabase.co/**', async (route) => {
      const req = route.request();
      if (/\/auth\/v1\/otp/.test(req.url())) {
        // supabase-js manda `emailRedirectTo` como parámetro `redirect_to` de la
        // URL, no en el cuerpo (comprobado contra la llamada real: la primera
        // versión de esta prueba leía el cuerpo y no medía NADA, y lo dijo).
        try { redirectPedido = new URL(req.url()).searchParams.get('redirect_to'); } catch { redirectPedido = null; }
        if (!redirectPedido) {
          try { const b = JSON.parse(req.postData() || '{}'); redirectPedido = b.options?.email_redirect_to ?? b.email_redirect_to ?? null; } catch { /* sin cuerpo */ }
        }
        return route.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: '{}' });
      }
      if (SIN_RED) {
        // Este contenedor no alcanza Supabase (política de red). El sujeto de la
        // prueba es cómo se CONSTRUYE la URL, no los datos, así que se sirve una
        // publicación de prueba local para poder pulsar «Compartir». Con red, en
        // cambio, pasa por el relé y usa los datos reales de staging.
        const cuerpo = /rpc\/posts_near/.test(req.url()) ? JSON.stringify([POST_PRUEBA]) : '[]';
        return route.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: cuerpo });
      }
      const { status, body } = await curlRelay(req);
      return route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
    });

    // ── 1 · El export arranca y se ve ───────────────────────────────────────
    const RUTAS = [['/', 'portada'], ['/comunidad/', 'Comunidad'], ['/negocios/', 'Negocios'], ['/entrar/', 'Entrar']];
    for (const [ruta, nombre] of RUTAS) {
      await page.goto(`${ctx.base}${ruta}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(ruta === '/' ? 900 : 2200);
      const texto = (await page.evaluate(() => document.body.innerText || '')).trim();
      await page.screenshot({ path: `${SHOTS}/wv-${ctx.id}-${nombre.toLowerCase()}.png` });
      marca(ctx.id, `${nombre} se renderiza`, texto.length > 120, `${texto.length} caracteres de texto`);
    }

    // ── 2 · Enlace mágico del correo (`emailRedirectTo`) ────────────────────
    await page.goto(`${ctx.base}/entrar/`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Continuar con mi teléfono').click();
    await page.getByRole('tab', { name: 'Correo' }).click();
    await page.locator('input[type="email"]').first().fill(CORREO);
    await page.getByText('Enviarme el código', { exact: false }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/wv-${ctx.id}-otp.png` });
    if (!redirectPedido) {
      marca(ctx.id, 'enlace del correo', false, 'la app no llegó a pedir el código — la prueba no midió nada');
    } else {
      marca(ctx.id, 'enlace del correo (emailRedirectTo)', redirectPedido === `${esperado}/entrar/`, redirectPedido);
    }

    // ── 3 · Enlace de «Compartir» de una publicación ────────────────────────
    await page.goto(`${ctx.base}/comunidad/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3200);
    const compartir = page.getByRole('button', { name: 'Compartir' }).first();
    if (await compartir.count() === 0) {
      marca(ctx.id, 'enlace de compartir', false, 'no hay ninguna publicación en el feed — la prueba no midió nada');
    } else {
      await compartir.click();
      await page.waitForTimeout(600);
      const pegado = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      const url = (pegado.match(/https?:\/\/\S+/) || [''])[0];
      marca(ctx.id, 'enlace de compartir', url.startsWith(`${esperado}/comunidad/?post=`), url || '(portapapeles vacío)');
    }

    // ── Consola y peticiones muertas ────────────────────────────────────────
    // Los errores se PARTEN, no se filtran a ciegas: lo que viene de no poder
    // salir de este contenedor (Supabase bloqueado) se cuenta aparte y se dice;
    // cualquier otro error rompe la prueba.
    const esRed = (e) => /supabase\.co|ERR_TUNNEL|ERR_FAILED|WebSocket|fonts\.|favicon/.test(e);
    const deRed = errores.filter(esRed);
    const propios = errores.filter((e) => !esRed(e));
    marca(ctx.id, 'sin errores de consola propios', propios.length === 0, propios.slice(0, 3).join(' | ') || `limpio${deRed.length ? ` (${deRed.length} de red externa, bloqueada aquí)` : ''}`);
    marca(ctx.id, 'sin peticiones muertas del propio sitio', muertas.length === 0, muertas.slice(0, 3).join(' | ') || 'limpio');

    await context.close();
  }

  await browser.close();
  s80.close(); s4173.close();

  console.log('\nwebview-fase0 · el MISMO build en los tres contextos');
  console.log(SIN_RED
    ? '  (modo SIN RED: este contenedor no alcanza Supabase → el feed usa una\n   publicación de prueba local; el enlace del correo no necesita red)\n'
    : '  (con red: datos reales de staging a través del relé de curl)\n');
  for (const c of CONTEXTOS) {
    console.log(`${c.nombre}`);
    console.log(lineas.filter((l) => l.includes(`[${c.id}]`)).join('\n'));
    console.log('');
  }
  console.log(`Capturas en ${SHOTS}\n`);
  if (fallos.length) {
    console.error(`✖ ${fallos.length} fallo(s):`);
    for (const f of fallos) console.error(`    ${f}`);
    process.exit(1);
  }
  console.log('✅ El export funciona dentro del envoltorio y las URLs que salen de la app');
  console.log('   llevan el dominio público — sin romper el origen local de la web.\n');
})();
