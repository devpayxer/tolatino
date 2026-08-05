// Recorre el onboarding de negocio (/negocio/publicar) a ancho de teléfono y
// captura cada paso. Es la PRUEBA del flujo: no vale "compila".
//
// Comprueba además dos cosas que se pueden fingir a ojo:
//   · que el borrador se guarda (recarga a mitad y el paso/los datos siguen ahí)
//   · que no hay desborde horizontal en ningún paso
//
// Uso: SHOTS_DIR=<dir> node onboarding-negocio.js   (con el export en 4173)
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
    execFile('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (e, out) => {
      const o = out || ''; if (e && !o) return resolve({ status: 502, body: '' });
      const nl = o.lastIndexOf('\n'); resolve({ status: parseInt(o.slice(nl + 1), 10) || 500, body: o.slice(0, nl) });
    });
  });
}

const fallos = [];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 }, deviceScaleFactor: 2 });
  await page.route('**://*.supabase.co/**', async (route) => {
    const { status, body } = await curlRelay(route.request());
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  // OJO: `addInitScript` corre en CADA navegación, también en la recarga. Si el
  // borrado del borrador viviera aquí, el test se sabotearía solo — borraría lo
  // que va a comprobar. Solo la ciudad va aquí; el borrador se limpia una vez,
  // después del primer `goto`.
  await page.addInitScript(() => {
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  });

  const medir = async (etiqueta) => {
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (desborde) fallos.push(`desborde horizontal en ${etiqueta}`);
    await page.screenshot({ path: `${SHOTS}/onb-${etiqueta}.png` });
  };
  // Un click que falla tiene que decir DÓNDE y con qué en pantalla: si no, la
  // corrida solo escupe reintentos de Playwright y no se sabe qué paso rompió.
  const clicar = async (txt, espera = 900) => {
    const b = page.locator(`text=${txt} >> visible=true`).first();
    const donde = async () => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 90);
    if (!(await b.count())) { fallos.push(`no se encontró "${txt}" · pantalla: ${await donde()}`); return false; }
    if (await b.isDisabled().catch(() => false)) {
      await page.screenshot({ path: `${SHOTS}/onb-FALLO-${txt.slice(0, 12)}.png` });
      fallos.push(`"${txt}" está DESHABILITADO · pantalla: ${await donde()}`);
      return false;
    }
    await b.click({ timeout: 6000 }); await page.waitForTimeout(espera); return true;
  };

  await page.goto(`${BASE}/negocio/publicar/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.removeItem('tl_biz_onboarding_v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });   // arrancar de cero, de verdad
  await page.waitForTimeout(2500);

  // 1 · categoría
  await medir('1-categoria');
  await clicar('Comida y Bebida');
  await clicar('Continuar');

  // 2 · subcategorías
  await medir('2-subcategorias');
  await clicar('Taquería');
  await page.waitForTimeout(400);
  await medir('2b-subcategorias-elegida');
  await clicar('Continuar');

  // 3 · datos
  await medir('3-datos-vacio');
  await page.locator('input >> visible=true').first().fill('Tamales Doña Lupe');
  const tel = page.locator('input[inputmode="tel"] >> visible=true').first();
  if (await tel.count()) await tel.fill('7135550142');
  await page.locator('textarea >> visible=true').first().fill('Tamales oaxaqueños hechos a mano todos los días.');
  await page.waitForTimeout(400);
  await medir('3b-datos-lleno');

  // — el borrador: recargar y comprobar que sigue todo —
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const texto = await page.evaluate(() => document.body.innerText);
  const valor = await page.locator('input >> visible=true').first().inputValue().catch(() => '');
  if (!/Datos del negocio|Business details/i.test(texto) || !valor.includes('Tamales')) {
    fallos.push(`el borrador NO se restauró (paso o datos perdidos; input="${valor}")`);
  }
  await medir('4-borrador-restaurado');

  await clicar('Continuar');
  // 4 · fotos
  await medir('5-fotos');
  await clicar('Continuar');
  // 5 · horarios
  await medir('6-horarios');
  await clicar('Agregar mi horario', 1200);
  await medir('6b-horarios-editor');
  await clicar('Continuar');
  // 6 · plan
  await medir('7-plan-verified');
  await clicar('Free', 700);
  await medir('7b-plan-free');
  await clicar('Continuar');
  // 7 · revisar
  await medir('8-revisar');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await medir('8b-revisar-abajo');

  await browser.close();

  if (fallos.length) {
    console.error(`\nFALLO · ${fallos.length}:`);
    for (const f of fallos) console.error('  · ' + f);
    process.exit(1);
  }
  console.log('\nOK · los 7 pasos se recorren, el borrador se restaura y nada desborda.');
})().catch((e) => { console.error('FALLO ·', e.message); process.exit(1); });
