// El flujo «olvidé mi contraseña», de punta a punta y contra Supabase de verdad.
//
// POR QUÉ EXISTE: la contraseña es la puerta de servicio de To'Latino — el
// camino normal es el código al correo. Una puerta de servicio sin llave de
// repuesto no sirve de nada, así que este flujo TIENE que funcionar el día que
// haga falta, que será justo el día que el correo con el código falle. Y no se
// puede comprobar a ojo: hace falta un enlace real de Supabase.
//
// USA UN USUARIO DESECHABLE, nunca una cuenta real, y lo borra al terminar.
//
// Uso (con el export servido en localhost:3000 — ese puerto y no otro, porque es
// el que está en la lista de redirecciones permitidas de la base de PRUEBAS):
//   cd apps/web/out && python3 -m http.server 3000 --bind 127.0.0.1 &
//   cd tools/mobile-audit && KEYS_JSON=<archivo> node reset-contrasena.js
//
// KEYS_JSON = la respuesta de /v1/projects/<ref>/api-keys?reveal=true. Se pasa
// por archivo a propósito: la clave de servicio NO se escribe en el repo ni en
// la línea de comandos.
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const fs = require('fs');

const SHOTS = process.env.SHOTS_DIR || '/tmp';
const BASE = process.env.BASE || 'http://localhost:3000';
const URL_SB = process.env.SUPABASE_URL || 'https://zpkaxojonufdwgahiqjh.supabase.co';
const keys = JSON.parse(fs.readFileSync(process.env.KEYS_JSON, 'utf8'));
const SERVICE = keys.find((k) => k.name === 'service_role').api_key;
const ANON = keys.find((k) => k.name === 'anon').api_key;

const CORREO = 'prueba-reset-0151@tolatino.com';
const VIEJA = 'ViejaQueNadieUsa!1';
const NUEVA = 'NuevaDePrueba!2026';

function curl(args) {
  const out = spawnSync('curl', ['-s', '--max-time', '30', '-w', '\n%{http_code}', ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const t = (out.stdout || '').trim();
  const i = t.lastIndexOf('\n');
  return { code: Number(t.slice(i + 1)), body: t.slice(0, i) };
}
const H = ['-H', `apikey: ${SERVICE}`, '-H', `Authorization: Bearer ${SERVICE}`, '-H', 'Content-Type: application/json'];
const paso = (n, t) => console.log(`  ${n}. ${t}`);

(async () => {
  let uid = null;
  let browser = null;
  try {
    const cre = curl([...H, '-X', 'POST', `${URL_SB}/auth/v1/admin/users`,
      '--data-binary', JSON.stringify({ email: CORREO, password: VIEJA, email_confirm: true })]);
    if (cre.code !== 200) throw new Error(`crear usuario: ${cre.code} ${cre.body.slice(0, 200)}`);
    uid = JSON.parse(cre.body).id;
    paso(1, `usuario desechable creado (${CORREO})`);

    const gen = curl([...H, '-X', 'POST', `${URL_SB}/auth/v1/admin/generate_link`,
      // `redirect_to` va en la RAÍZ, no dentro de `options`. Metido en `options`
      // la API lo ignora en silencio y redirige al `site_url` — que es una
      // pantalla sin formulario de contraseña. Costó una vuelta descubrirlo.
      '--data-binary', JSON.stringify({ type: 'recovery', email: CORREO, redirect_to: `${BASE}/entrar/` })]);
    if (gen.code !== 200) throw new Error(`generate_link: ${gen.code} ${gen.body.slice(0, 200)}`);
    const enlace = JSON.parse(gen.body).action_link;
    paso(2, 'enlace de recuperacion pedido a Supabase');

    // Seguir el 302 con curl en vez de con el navegador: así el hash llega
    // intacto y no dependemos de que Chromium sepa salir por el proxy.
    const ver = spawnSync('curl', ['-s', '--max-time', '30', '-o', '/dev/null', '-w', '%{redirect_url}', enlace], { encoding: 'utf8' });
    const destino = (ver.stdout || '').trim();
    if (!/#.*type=recovery/.test(destino)) throw new Error(`el verify no devolvio un hash de recovery: ${destino.slice(0, 200)}`);
    paso(3, `Supabase redirige a ${destino.split('#')[0]}#…type=recovery`);

    browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
    await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
    // El sandbox no deja salir a Chromium directamente: todo lo de Supabase pasa
    // por `curl`. Sin esto la sesión del enlace nunca se abre y el botón de
    // guardar se queda desactivado para siempre — pasó, y parecía un fallo de la
    // pantalla cuando era del arnés.
    await page.route('**://*.supabase.co/**', async (route) => {
      const req = route.request();
      const args = ['-s', '--max-time', '30', '-o', '-', '-w', '\n%{http_code}', '-X', req.method()];
      const h = req.headers();
      for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'x-client-info']) if (h[k]) args.push('-H', `${k}: ${h[k]}`);
      const body = req.postData(); if (body != null) args.push('--data-binary', body);
      args.push(req.url());
      const out = spawnSync('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
      const t = (out.stdout || '').trim();
      const i = t.lastIndexOf('\n');
      await route.fulfill({ status: Number(t.slice(i + 1)) || 500, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: t.slice(0, i) });
    });
    await page.goto(destino, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const visto = await page.evaluate(() => document.body.innerText);
    if (!/Elige tu contrase/i.test(visto)) {
      await page.screenshot({ path: `${SHOTS}/reset-FALLO-1.png` });
      throw new Error(`no salio la pantalla de contrasena nueva. Se vio: ${visto.replace(/\s+/g, ' ').slice(0, 160)}`);
    }
    paso(4, 'aterriza en «Elige tu contrasena nueva»');
    await page.screenshot({ path: `${SHOTS}/reset-1-pantalla.png` });

    // La trampa de la errata: dos distintas tienen que fallar. Sin esto, el
    // segundo campo seria decoracion.
    const campos = page.locator('input[type="password"] >> visible=true');
    await campos.nth(0).fill(NUEVA);
    await campos.nth(1).fill(`${NUEVA}x`);
    await page.locator('text=Guardar contraseña >> visible=true').first().click();
    await page.waitForTimeout(900);
    if (!/no son iguales/i.test(await page.evaluate(() => document.body.innerText))) {
      await page.screenshot({ path: `${SHOTS}/reset-FALLO-2.png` });
      throw new Error('dos contrasenas distintas NO dieron error: el guard no sirve');
    }
    paso('4b', 'dos contrasenas distintas → «no son iguales»');
    await page.screenshot({ path: `${SHOTS}/reset-2-errata.png` });

    await campos.nth(1).fill(NUEVA);
    await page.locator('text=Guardar contraseña >> visible=true').first().click();
    await page.waitForTimeout(2500);
    const fin = await page.evaluate(() => document.body.innerText);
    if (!/Contrase.a guardada/i.test(fin)) {
      await page.screenshot({ path: `${SHOTS}/reset-FALLO-3.png` });
      throw new Error(`no confirmo el guardado. Se vio: ${fin.replace(/\s+/g, ' ').slice(0, 160)}`);
    }
    paso(5, '«Contrasena guardada»');
    await page.screenshot({ path: `${SHOTS}/reset-3-guardada.png` });

    // Lo que de verdad importa: que el SERVIDOR cambiara. Una pantalla verde no
    // demuestra nada por si sola.
    const entrar = (pw) => curl(['-H', `apikey: ${ANON}`, '-H', 'Content-Type: application/json',
      '-X', 'POST', `${URL_SB}/auth/v1/token?grant_type=password`,
      '--data-binary', JSON.stringify({ email: CORREO, password: pw })]);
    const conNueva = entrar(NUEVA);
    const conVieja = entrar(VIEJA);
    paso(6, `entrar con la NUEVA → HTTP ${conNueva.code} · con la VIEJA → HTTP ${conVieja.code}`);
    if (conNueva.code !== 200) throw new Error('la contrasena nueva NO sirve para entrar');
    if (conVieja.code === 200) throw new Error('la contrasena VIEJA sigue sirviendo: no se cambio nada');

    console.log('\nOK · el flujo de contrasena olvidada funciona de punta a punta.');
  } catch (e) {
    console.error('\nFALLO ·', e.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (uid) {
      const del = curl([...H, '-X', 'DELETE', `${URL_SB}/auth/v1/admin/users/${uid}`]);
      console.log(`  limpieza · usuario desechable borrado (HTTP ${del.code})`);
    }
  }
})();
