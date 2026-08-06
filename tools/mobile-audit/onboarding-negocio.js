// El alta de negocio, de la primera pantalla al pago — la PRUEBA del flujo.
//
// REESCRITO el 2026-08-05 tras la auditoría que pidió el fundador con cinco
// fallos vistos por él. Cada uno dejó aquí su regresión:
//   1. «El botón Siguiente tarda en activarse» → se MIDE: elegir subcategoría
//      debe habilitar la CTA en <400 ms.
//   2. «El popup de dirección vuelve y se abre» → tras elegir sugerencia se
//      escribe en OTRO campo y se exige que la lista NO reaparezca.
//   3. «Free: 1 logo y 1 portada; Verified desbloquea más» → contador 0/1,
//      5 espacios bloqueados, y tras elegir Verified el contador pasa a /6.
//   4. «Avisar que el panel trae más horarios» → el aviso tiene que estar.
//   5. «Fue aprobado antes de pagar» → con Verified, tras "Pagar y publicar"
//      NO puede aparecer la celebración: aparece la sala de espera del cobro,
//      sobrevive a una recarga SIN crear otro negocio, y solo `?sub=success`
//      (la vuelta de Stripe) enseña el confeti.
//
// TODA la red va simulada (sesión incluida): así se recorre hasta el pago sin
// escribir ni una fila en la base real, y los contadores de llamadas permiten
// afirmar «create_business se llamó UNA vez» — que es la prueba de que una
// recarga no duplica negocios.
//
// Uso: SHOTS_DIR=<dir> node onboarding-negocio.js   (con el export en 4173)

const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const REF = 'zpkaxojonufdwgahiqjh';

// Un PNG de 1×1 válido, para poder "elegir" fotos sin archivos reales.
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

// Sesión fabricada: como TODOS los endpoints van simulados, nunca se valida
// contra el servidor real. El id es el "dueño" de las escrituras simuladas.
const SESION = {
  access_token: 'fake-jwt-token', token_type: 'bearer',
  expires_at: Math.floor(1754500000000 / 1000) + 86400 * 365, expires_in: 86400 * 365,
  refresh_token: 'fake-refresh',
  user: { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'prueba@tolatino.test' },
};

const SUGERENCIA_PHOTON = JSON.stringify({
  features: [{ geometry: { coordinates: [-75.9891, 40.9712] }, properties: {
    housenumber: '762', street: 'Mcnair St', city: 'Hazleton', state: 'Pennsylvania', postcode: '18201', countrycode: 'US',
  } }],
});

const fallos = [];
const ok = (m) => console.log(`  ✅ ${m}`);
const mal = (m) => { console.log(`  ❌ ${m}`); fallos.push(m); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 }, deviceScaleFactor: 2 });
  const errores = [];
  // Stripe.js está bloqueado en este sandbox: sus errores de carga no son
  // fallos del flujo y se filtran. Todo lo demás sí cuenta.
  page.on('pageerror', (e) => { if (!/stripe/i.test(String(e))) errores.push(String(e).slice(0, 140)); });

  const llamadas = { create: 0, subscribe: 0 };

  // UNA ruta por host, que decide dentro (en Playwright gana la registrada más
  // tarde: dos rutas del mismo host se pisan — lección de imagenes-tamano.js).
  await page.route('**://*.supabase.co/**', async (route) => {
    const url = route.request().url();
    const responder = (body, status = 200) =>
      route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
    if (url.includes('/rpc/create_business')) { llamadas.create++; return responder('"tamales-dona-lupe-x1"'); }
    if (url.includes('/functions/v1/stripe-subscribe')) { llamadas.subscribe++; return responder(JSON.stringify({ clientSecret: 'pi_fake_secret', amount: 1499 })); }
    if (url.includes('/auth/v1/')) return responder(JSON.stringify({ ...SESION, ...SESION.user }));
    if (url.includes('/rest/v1/businesses') && url.includes('select=id')) return responder(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111' }));
    if (url.includes('/storage/v1/')) return responder(JSON.stringify({ Key: 'post-photos/x' }));
    if (route.request().method() === 'PATCH' || route.request().method() === 'POST') return responder('[]', 201);
    return responder('[]');
  });
  await page.route('**photon.komoot.io/**', (r) => r.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: SUGERENCIA_PHOTON }));
  await page.route('**geocoding.geo.census.gov/**', (r) => r.abort());
  await page.route('**js.stripe.com/**', (r) => r.abort());
  await page.route('**m.stripe.network/**', (r) => r.abort());
  await page.route('**://images.unsplash.com/**', (r) => r.abort());
  await page.route('**://fonts.g*/**', (r) => r.abort());

  await page.addInitScript(([sesion, ref]) => {
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sesion));
  }, [SESION, REF]);

  const medir = async (etiqueta) => {
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (desborde) mal(`desborde horizontal en ${etiqueta}`);
    await page.screenshot({ path: `${SHOTS}/onb-${etiqueta}.png` });
  };
  const clicar = async (txt, espera = 800) => {
    const b = page.locator(`text=${txt} >> visible=true`).first();
    const donde = async () => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 90);
    if (!(await b.count())) { mal(`no se encontró "${txt}" · pantalla: ${await donde()}`); return false; }
    if (await b.isDisabled().catch(() => false)) { mal(`"${txt}" está DESHABILITADO · pantalla: ${await donde()}`); return false; }
    await b.click({ timeout: 6000 }); await page.waitForTimeout(espera); return true;
  };
  const cuerpo = async () => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');

  await page.goto(`${BASE}/negocio/publicar/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.removeItem('tl_biz_onboarding_v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // ── 1 · categoría ─────────────────────────────────────────────────────────
  await medir('1-categoria');
  await clicar('Comida y Bebida');
  await clicar('Continuar');

  // ── 2 · subcategoría: el botón tiene que activarse AL INSTANTE ────────────
  await medir('2-subcategorias');
  // La CTA en estado inválido no está `disabled`: está gris y HABLA — tocarla
  // dice qué falta (auditoría: con `disabled`, el mensaje era código muerto).
  const cta = page.locator('button:has-text("Continuar") >> visible=true').last();
  await cta.click(); await page.waitForTimeout(600);
  const trasToque = await cuerpo();
  if (!/Elige al menos una subcategoría/.test(trasToque)) mal('tocar Continuar sin elegir no explica qué falta');
  else ok('la CTA inválida explica qué falta al tocarla');
  if (!/¿Qué tipo exactamente\?/.test(trasToque)) mal('la CTA inválida AVANZÓ de paso');
  const t0 = Date.now();
  await page.locator('text=Taquería >> visible=true').first().click();
  await page.waitForFunction(() => {
    const bs = Array.from(document.querySelectorAll('button')).filter((b) => /Continuar|Continue/.test(b.textContent || ''));
    return bs.some((b) => !b.className.includes('bg-lilac-line'));
  }, { timeout: 5000 }).catch(() => {});
  const dt = Date.now() - t0;
  if (dt > 400) mal(`la CTA tardó ${dt} ms en activarse tras elegir subcategoría (tope 400)`);
  else ok(`CTA activa en ${dt} ms tras elegir subcategoría`);
  await medir('2b-subcategorias-elegida');
  await clicar('Continuar');

  // ── 3 · datos + dirección ─────────────────────────────────────────────────
  await medir('3-datos-vacio');
  await page.locator('input >> visible=true').first().fill('Tamales Doña Lupe');
  await page.locator('textarea >> visible=true').first().fill('Tamales oaxaqueños hechos a mano todos los días.');
  const tel = page.locator('input[inputmode="tel"] >> visible=true').first();
  await tel.fill('7135550142');

  // la geo-dirección: escribir → sugerencia → piezas repartidas
  await page.locator('#dir-line1').fill('762 Mcnair');
  await page.waitForTimeout(2200);
  const sug = page.locator('ul li button >> visible=true').first();
  if (!(await sug.count())) mal('el autocompletado de dirección no ofreció sugerencias');
  else {
    await sug.click();
    await page.waitForTimeout(600);
    const zip = await page.locator('#dir-zip').inputValue();
    if (zip !== '18201') mal(`la sugerencia no repartió las piezas (zip="${zip}")`);
    else ok('la dirección repartió calle, ciudad, estado y ZIP');
  }

  // REGRESIÓN «el popup vuelve y se abre»: se escribe en OTRO campo, se espera
  // más que el freno del autocompletado, y la lista NO puede reaparecer.
  await tel.click();
  await tel.fill('7135550143');
  await page.waitForTimeout(3000);
  if (await page.locator('ul li button >> visible=true').count()) mal('el popup de dirección REAPARECIÓ tras elegir (el bug del fundador)');
  else ok('el popup de dirección no reaparece tras elegir');
  await medir('3b-datos-lleno');

  // borrador: recarga a mitad y todo sigue
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const valor = await page.locator('input >> visible=true').first().inputValue().catch(() => '');
  const zipTrasRecarga = await page.locator('#dir-zip').inputValue().catch(() => '');
  if (!valor.includes('Tamales') || zipTrasRecarga !== '18201') {
    mal(`el borrador NO se restauró (nombre="${valor}", zip="${zipTrasRecarga}")`);
  } else ok('el borrador restaura nombre y dirección tras recargar');
  await medir('4-borrador-restaurado');
  await clicar('Continuar');

  // ── 4 · fotos: Free = 1 portada + espacios Verified bloqueados ────────────
  await medir('5-fotos');
  const contador = await page.locator('[data-fotos-contador]').innerText().catch(() => '');
  if (contador.trim() !== '0/1') mal(`el contador de fotos no dice 0/1 en Free (dice "${contador}")`);
  else ok('Free arranca con tope de 1 foto (0/1)');
  const bloqueadas = await page.locator('[data-foto-bloqueada]').count();
  if (bloqueadas !== 5) mal(`deberían verse 5 espacios bloqueados de Verified y hay ${bloqueadas}`);
  else ok('los 5 espacios extra se ven bloqueados con la marca Verified');

  // elegir 2 fotos → solo entra 1 (el tope manda)
  await page.locator('input[type="file"][multiple]').setInputFiles([
    { name: 'a.png', mimeType: 'image/png', buffer: PNG1 },
    { name: 'b.png', mimeType: 'image/png', buffer: PNG1 },
  ]);
  await page.waitForTimeout(600);
  const contador2 = await page.locator('[data-fotos-contador]').innerText().catch(() => '');
  if (contador2.trim() !== '1/1') mal(`tras elegir 2 fotos el contador debería decir 1/1 y dice "${contador2}"`);
  else ok('elegir 2 fotos en Free deja solo la portada (1/1)');
  await medir('5b-fotos-portada');
  await clicar('Continuar');

  // ── 5 · horarios: el aviso del panel ──────────────────────────────────────
  await medir('6-horarios');
  if (!/feriados|más opciones/i.test(await cuerpo())) mal('falta el aviso de que el panel trae más opciones de horario');
  else ok('el paso de horarios avisa que el panel trae más opciones');
  await clicar('Agregar mi horario', 1100);
  await medir('6b-horarios-editor');
  await clicar('Continuar');

  // ── 6 · plan: elegir Verified desbloquea las fotos ────────────────────────
  await medir('7-plan');
  await page.locator('button:has-text("Recomendado")').first().click();
  await page.waitForTimeout(500);
  // volver a fotos (dos atrás) y comprobar el desbloqueo
  await page.locator('[aria-label="Volver"]').click(); await page.waitForTimeout(500);
  await page.locator('[aria-label="Volver"]').click(); await page.waitForTimeout(500);
  const contador3 = await page.locator('[data-fotos-contador]').innerText().catch(() => '');
  if (!contador3.includes('/6')) mal(`con Verified elegido el tope debería ser 6 (contador "${contador3}")`);
  else ok('elegir Verified desbloquea hasta 6 fotos');
  if (await page.locator('[data-foto-bloqueada]').count()) mal('con Verified elegido siguen viéndose espacios bloqueados');
  await medir('7b-fotos-desbloqueadas');
  await clicar('Continuar'); await clicar('Continuar'); await clicar('Continuar');

  // ── 7 · pagar y publicar: EL PAGO VA ANTES DEL CONFETI ────────────────────
  await medir('8-revisar');
  const textoCta = await page.locator('button:has-text("publicar") >> visible=true').last().innerText().catch(() => '');
  if (!/Pagar \$14\.99/.test(textoCta)) mal(`con Verified la CTA debería decir "Pagar $14.99 y publicar" (dice "${textoCta}")`);
  else ok('la CTA de Verified dice lo que va a pasar: pagar y publicar');
  await page.locator('text=Confirmo que la información >> visible=true').first().click();
  await page.waitForTimeout(400);
  await clicar('Pagar $14.99', 2500);
  await page.waitForTimeout(2000);

  let t = await cuerpo();
  if (/ya está publicado!/.test(t)) mal('LA CELEBRACIÓN SALIÓ ANTES DE PAGAR (el bug del fundador)');
  else if (!/Un paso más/.test(t)) mal(`tras pagar-y-publicar no apareció la sala de espera del cobro · pantalla: ${t.slice(0, 90)}`);
  else ok('tras "Pagar y publicar" aparece el cobro, no la celebración');
  if (llamadas.create !== 1) mal(`create_business se llamó ${llamadas.create} veces (debería 1)`);
  if (llamadas.subscribe < 1) mal('nunca se pidió el cobro a stripe-subscribe');
  await medir('9-esperando-pago');

  // recargar a mitad del pago: se retoma el cobro, NO se duplica el negocio
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  t = await cuerpo();
  if (!/Un paso más/.test(t)) mal(`tras recargar en pleno pago no se retoma la sala de espera · pantalla: ${t.slice(0, 90)}`);
  else ok('recargar a mitad del pago retoma el cobro donde estaba');
  if (llamadas.create !== 1) mal(`la recarga DUPLICÓ el negocio (create_business: ${llamadas.create})`);
  else ok('la recarga no crea un segundo negocio');
  await medir('9b-recarga-pago');

  // un pago FALLIDO que vuelve por redirect (Cash App, etc.): Stripe añade
  // redirect_status=failed a la MISMA url con ?sub=success. Celebrar aquí era
  // mentir «Pago recibido» a quien sigue en Free (hallazgo de la auditoría).
  await page.goto(`${BASE}/negocio/publicar/?sub=success&redirect_status=failed`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  t = await cuerpo();
  if (/Pago recibido|ya está publicado!/.test(t)) mal('un redirect con redirect_status=failed SE CELEBRÓ como pago recibido');
  else if (!/Un paso más/.test(t)) mal(`el pago fallido no volvió a la sala de espera · ${t.slice(0, 80)}`);
  else if (!/no se completó/.test(t)) mal('el pago fallido no explica que no se completó');
  else ok('un pago fallido vuelve a la sala de espera y lo dice — sin confeti falso');
  await medir('9c-pago-fallido');

  // la vuelta BUENA de Stripe: succeeded ⇒ ahora sí, confeti con "pago recibido"
  await page.goto(`${BASE}/negocio/publicar/?sub=success&redirect_status=succeeded`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  t = await cuerpo();
  if (!/ya está publicado!/.test(t)) mal('la vuelta de Stripe (?sub=success) no muestra la celebración');
  else if (!/Pago recibido/.test(t)) mal('la celebración tras pagar no confirma el pago recibido');
  else ok('la vuelta de Stripe celebra con el pago confirmado');
  if (/Sube a Verified/.test(t)) mal('a quien acaba de pagar Verified se le intenta vender Verified');
  else ok('a quien ya pagó no se le vende Verified');
  await medir('10-pagado');

  // y recargar después: el borrador quedó limpio → flujo desde cero
  await page.goto(`${BASE}/negocio/publicar/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  if (!/¿A qué se dedica tu negocio\?/.test(await cuerpo())) mal('tras terminar, el flujo no arranca limpio desde el paso 1');
  else ok('tras terminar, el flujo arranca limpio');

  if (errores.length) mal(`errores de página: ${errores.slice(0, 2).join(' | ')}`);
  else ok('sin errores de página');

  await browser.close();
  console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s)` : '\nOK · el alta se recorre entera: pasos, borrador, tope de fotos, y el pago ANTES del confeti.');
  process.exit(fallos.length ? 1 : 0);
})().catch((e) => { console.error('FALLO ·', e.message); process.exit(1); });
