// Dominó: DOS navegadores jugando de verdad, uno contra otro.
//
// POR QUÉ ASÍ Y NO CON UNA SOLA PESTAÑA: lo que hay que demostrar es
// exactamente lo que solo se ve con dos — que la jugada de uno le llega al otro
// sin recargar, que el turno alterna, y que **ninguno puede ver la mano del
// contrario**. Una pestaña sola no prueba nada de eso.
//
// QUÉ COMPRUEBA:
//   1. «Jugar» empareja: el primero abre mesa, el segundo se sienta.
//   2. Reparto correcto: 7 fichas cada uno, 14 en el pozo.
//   3. La mano del rival NO está en el HTML del otro — se mira el DOM servido,
//      no lo que se pinta: si estuviera en la página, se leería con las
//      herramientas del navegador aunque no se dibuje.
//   4. Se juega una ficha y le llega al otro SIN recargar (tiempo real).
//   5. El turno alterna.
//
// CÓMO SE EJECUTA:
//   VERCEL_ENV=preview pnpm -C apps/web build
//   npx serve apps/web/out -l 4173 --no-clipboard
//   SESSION_A=<a.json> SESSION_B=<b.json> SHOTS_DIR=<dir> node domino-mesa.js

const { chromium } = require('playwright');
const { execFile, spawnSync } = require('child_process');
const fs = require('fs');

const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const sesA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
const sesB = JSON.parse(fs.readFileSync(process.env.SESSION_B, 'utf8'));

const fallos = [];
const ok = (m) => console.log(`  ✅ ${m}`);
const mal = (m) => { console.log(`  ❌ ${m}`); fallos.push(m); };

// El arnés se limpia solo.
//
// POR QUÉ: «Jugar» devuelve la partida en la que YA estás si tienes una sin
// terminar — que es lo correcto para el jugador, pero significa que una prueba
// que deja una mesa a medias contamina la siguiente: la de después no reparte,
// reanuda. Eso se vio el 2026-09-08 como «B recibió 8 fichas» y «B se sentó en
// otra mesa», y ninguna de las dos era un fallo del juego. Depender de acordarse
// de borrar a mano no es una garantía; hacerlo aquí sí.
function limpiarMesas() {
  const sql = `
    with mias as (
      select p.id from domino_partidas p
      where p.estado <> 'terminada'
        and p.jugadores && (select coalesce(array_agg(u.id), '{}'::uuid[])
                            from auth.users u where u.email in ('a@a.com','b@b.com'))
    ),
    m as (delete from domino_manos where partida_id in (select id from mias)),
    z as (delete from domino_pozo  where partida_id in (select id from mias))
    delete from domino_partidas where id in (select id from mias)
    returning id;`;
  const r = spawnSync('node', [`${__dirname}/../../scripts/sbsql.mjs`, sql], {
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_PROJECT_REF: 'zpkaxojonufdwgahiqjh' },
  });
  if (r.status !== 0) {
    console.error(`  ✖ no se pudo dejar la mesa limpia:\n${(r.stderr || r.stdout || '').trim()}`);
    process.exit(1);
  }
  const borradas = (r.stdout.match(/"id"/g) || []).length;
  console.log(`  · mesa limpia (${borradas} partida(s) a medias retirada(s))`);
}

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

async function abrir(browser, sesion) {
  const ctx = await browser.newContext({ viewport: { width: 402, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(([s]) => {
    localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s));
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null, auto: false }));
  }, [sesion]);
  const page = await ctx.newPage();
  page.on('pageerror', () => {});
  // OJO: el relay va por HTTP, así que el websocket de tiempo real NO pasa por
  // aquí — se deja salir directo. Si se interceptara, este arnés probaría el
  // relay y no el tiempo real.
  await page.route('**://*.supabase.co/rest/**', async (route) => {
    const r = await relay(route.request());
    await route.fulfill({ status: r.status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: r.body });
  });
  return { ctx, page };
}

// Las fichas se leen del DOM por su aria-label. IMPORTA distinguir dónde está
// cada una: contar «todas las del body» mezcla tu mano con las que ya hay en la
// mesa, y entonces «tengo 8» puede significar «tengo 7 y hay 1 puesta» — que es
// justo lo que escondería un reparto mal hecho. Por eso la mano se cuenta por su
// región (`#mi-mano`) y la mesa por la suya.
const fichasEn = (page, sel) =>
  page.$$eval(`${sel} [aria-label^="Ficha"]`, (n) => n.map((e) => e.getAttribute('aria-label')));

/** Solo las de TU mano. */
const miMano = (page) => fichasEn(page, '#mi-mano');
/** Solo las puestas en la mesa. */
const enMesa = (page) => fichasEn(page, '#cadena-mesa');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const A = await abrir(browser, sesA);
  const B = await abrir(browser, sesB);

  limpiarMesas();

  try {
    // ── 1 · emparejar ────────────────────────────────────────────────────────
    await A.page.goto(`${BASE}/comunidad/juegos/`, { waitUntil: 'domcontentloaded' });
    await A.page.waitForTimeout(2500);
    await A.page.getByRole('button', { name: /^Jugar$/ }).first().click();
    await A.page.waitForTimeout(3500);
    const urlA = A.page.url();
    if (!urlA.includes('/juegos/mesa/?p=')) return mal(`A no llegó a una mesa (${urlA})`), fin();
    ok('A tocó «Jugar» y abrió mesa');

    await B.page.goto(`${BASE}/comunidad/juegos/`, { waitUntil: 'domcontentloaded' });
    await B.page.waitForTimeout(2500);
    await B.page.getByRole('button', { name: /^Jugar$/ }).first().click();
    await B.page.waitForTimeout(4000);
    const urlB = B.page.url();
    const pA = new URL(urlA).searchParams.get('p');
    const pB = new URL(urlB).searchParams.get('p');
    if (pA !== pB) return mal(`B se sentó en OTRA mesa (${pB} ≠ ${pA}) — el emparejamiento no junta`), fin();
    ok('B tocó «Jugar» y cayó en la MISMA mesa');

    // A tiene que enterarse sin recargar.
    await A.page.waitForTimeout(4000);

    // ── 2 · reparto ──────────────────────────────────────────────────────────
    const manoA = await miMano(A.page);
    const manoB = await miMano(B.page);
    const mesaA = await enMesa(A.page);
    for (const [q, m] of [['A', manoA], ['B', manoB]]) {
      if (m.length !== 7) mal(`${q} recibió ${m.length} fichas, deberían ser 7 → ${m.join(' | ') || '(ninguna)'}`);
      else ok(`${q} recibió 7 fichas`);
    }
    if (mesaA.length) mal(`la mesa arranca con ${mesaA.length} ficha(s) puesta(s), debería estar vacía`);
    else ok('la mesa arranca vacía');
    // 28 fichas en total: 7 + 7 + 14 en el pozo. Si el reparto se solapara,
    // alguna ficha estaría en las dos manos.
    const repetidas = manoA.filter((f) => manoB.includes(f));
    if (repetidas.length) mal(`la misma ficha está en las dos manos: ${repetidas.join(', ')}`);
    else ok('las dos manos no comparten ninguna ficha');

    // ── 2b · la mesa tiene cara ──────────────────────────────────────────────
    // `profiles` solo deja leer tu propio perfil, así que el nombre del rival
    // tiene que venir del servidor dentro del estado. Si vuelve a faltar, la
    // pantalla dice «Tu rival» con un «?» — y jugar contra un «?» no es jugar
    // con el vecino. Que lo cace la prueba, no el ojo.
    const nombreDelRival = (p) => p.locator('#cabecera-mesa').textContent().catch(() => '');
    for (const [q, p, esperado] of [['A', A.page, 'Bebo'], ['B', B.page, 'Alex']]) {
      const txt = (await nombreDelRival(p)) || '';
      if (txt.includes(esperado)) ok(`${q} ve el nombre del rival («${esperado}»)`);
      else mal(`${q} no ve quién es el rival — la cabecera dice «${txt.trim().replace(/\s+/g, ' ').slice(0, 60)}»`);
    }

    // ── 3 · EL SECRETO: ninguna ficha de A aparece en la página de B ─────────
    const htmlB = await B.page.content();
    // Se busca la ficha en LOS DOS sentidos: la misma ficha se dibuja «3 y 5» o
    // «5 y 3» según cómo encaje, y buscar solo uno dejaría pasar la mitad.
    const alReves = (f) => { const [, a, b] = f.match(/Ficha (\d) y (\d)/) || []; return `Ficha ${b} y ${a}`; };
    const filtradas = manoA
      .filter((f) => !manoB.includes(f))
      .filter((f) => htmlB.includes(f) || htmlB.includes(alReves(f)));
    if (filtradas.length) mal(`la página de B contiene ${filtradas.length} ficha(s) de la mano de A: ${filtradas.join(', ')}`);
    else ok('ninguna ficha de A aparece en el HTML de B (ni escondida)');

    // ── 4 · una jugada, y que llegue al otro sin recargar ────────────────────
    const leToca = async (p) => (await p.getByText(/Te toca/).count()) > 0;
    const quien = (await leToca(A.page)) ? A : (await leToca(B.page)) ? B : null;
    const otro = quien === A ? B : A;
    if (!quien) return mal('a nadie le toca: el turno no se repartió'), fin();
    ok(`le toca a ${quien === A ? 'A' : 'B'}`);

    const antesMesaOtro = (await enMesa(otro.page)).length;
    // La primera ficha de la mano (la mesa está vacía: todas encajan).
    await quien.page.locator('#mi-mano [aria-label^="Ficha"]').first().click();
    await quien.page.waitForTimeout(1200);
    // Si preguntó el lado, se elige uno.
    const preguntó = await quien.page.getByText(/De qué lado/).count();
    if (preguntó) { await quien.page.getByRole('button', { name: /Derecha|Izquierda/ }).first().click(); }
    await quien.page.waitForTimeout(1500);

    // SIN recargar la página del otro.
    let llego = false;
    for (let i = 0; i < 12; i++) {
      await otro.page.waitForTimeout(1000);
      const ahora = (await enMesa(otro.page)).length;
      if (ahora > antesMesaOtro) { llego = true; break; }
    }
    if (llego) ok('la jugada le apareció al otro SIN recargar (tiempo real)');
    else mal('la jugada NO le llegó al otro: el tiempo real no está funcionando');

    // ── 5 · el turno alternó ────────────────────────────────────────────────
    const tocaAhora = (await leToca(otro.page)) ? 'el otro' : (await leToca(quien.page)) ? 'el mismo' : 'nadie';
    if (tocaAhora === 'el otro') ok('el turno pasó al rival');
    else mal(`tras la jugada le toca a «${tocaAhora}» — el turno no alterna`);

    await A.page.screenshot({ path: `${SHOTS}/domino-A.png`, fullPage: true });
    await B.page.screenshot({ path: `${SHOTS}/domino-B.png`, fullPage: true });
  } catch (e) {
    mal(`excepción: ${String(e).slice(0, 200)}`);
    await A.page.screenshot({ path: `${SHOTS}/domino-FALLO.png`, fullPage: true }).catch(() => {});
  }

  async function fin() {
    await browser.close();
    if (fallos.length) { console.error(`\n✖ ${fallos.length} comprobación(es) fallaron.\n`); process.exit(1); }
    console.log('\n✅ Dominó: dos personas jugaron de verdad, en tiempo real, sin verse las fichas.\n');
  }
  await fin();
})();
