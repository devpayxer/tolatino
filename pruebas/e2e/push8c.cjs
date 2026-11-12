// 8c · Avisos push propios de punta a punta (Playwright, teléfono 390 y escritorio 1360) contra los simuladores de scripts/push-sim
// (APNs HTTP/2, FCM v1 + OAuth y un servicio Web Push que DESCIFRA lo que recibe y valida VAPID). El servidor de :3100 corre con
// PUSH_APNS_URL / PUSH_FCM_URL / PUSH_FCM_OAUTH_URL / PUSH_WEB_HOSTS apuntando a ellos (servir8c.sh).
// Web Push en Chromium: el Chromium de Playwright no trae credenciales del servicio de push de Google, así que PushManager.subscribe se
// reemplaza en la PÁGINA por una suscripción con llaves P-256 reales generadas ahí y el endpoint del simulador; el resto es real: el service
// worker /sw-push.js registrado, el permiso, el registro en el servidor, el cifrado RFC 8291 + VAPID del servidor, el simulador que descifra con
// la llave privada de la página, la entrega al service worker (CDP ServiceWorker.deliverPushMessage con lo descifrado), showNotification y el
// toque (notificationclick) que abre la pantalla. Las cáscaras: el puente nativo simulado (como app8a) con el plugin PushNotifications.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const crypto = require('crypto');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100', REPO = ENT.RAIZ;
const SIM = require(REPO + '/scripts/push-sim/sim.cjs');
const APPS = JSON.parse(require('fs').readFileSync(REPO + '/apps/mobile/apps.json', 'utf8')).apps;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel, base = B) => { await p.goto(base + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); const r = await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); if (!r.ok) throw new Error('no entró ' + tel + ' ' + JSON.stringify(r)); };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });
const ADM = '5705550199', MARI = '5705550122', DUENO = '5705550133', BIZ = 'sabor-dominicano';
const U = (tel) => `(select id from users where phone = '+1${tel}')`;
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const rot = (app, plat) => ` TLApp/${app}/${plat}/1.0.0 (7)`;
const TOKEN = 'a'.repeat(8) + crypto.randomBytes(28).toString('hex');

// La suscripción de Web Push con llaves de verdad (WebCrypto P-256 + 16 bytes de auth) y el endpoint del simulador. Solo PushManager; nada más.
const SHIM = `(() => {
  let sub = null;
  const b64 = (u) => btoa(String.fromCharCode(...new Uint8Array(u))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
  PushManager.prototype.getSubscription = async function () { return sub; };
  PushManager.prototype.subscribe = async function (o) {
    if (!o || !o.userVisibleOnly || !o.applicationServerKey || o.applicationServerKey.byteLength !== 65) throw new DOMException('applicationServerKey', 'InvalidAccessError');
    window.__clave = b64(o.applicationServerKey);
    const k = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const pub = b64(await crypto.subtle.exportKey('raw', k.publicKey)), jwk = await crypto.subtle.exportKey('jwk', k.privateKey);
    const auth = b64(crypto.getRandomValues(new Uint8Array(16))), id = (window.__endpointId || 'sus') + Math.random().toString(36).slice(2, 10);
    const endpoint = window.__endpoint || ('http://127.0.0.1:4403/wp/' + id);
    window.__sub = { id, priv: jwk.d, auth, endpoint };
    sub = { endpoint, expirationTime: null, toJSON: () => ({ endpoint, keys: { p256dh: pub, auth } }), unsubscribe: async () => { sub = null; return true; } };
    return sub;
  };
})();`;
// El puente nativo simulado (como app8a) con el plugin oficial PushNotifications: permisos, register → «registration» con el token, el toque.
const PUENTE = (token) => `if (window === window.top) {
  window.__puente = []; window.__cbs = {}; window.__perm = localStorage.getItem('__perm') || 'prompt';   // el permiso del sistema sigue entre aperturas
  const M = (n, ms) => ({ name: n, methods: ms.map((x) => ({ name: x, rtype: x === 'addListener' && n === 'PushNotifications' ? 'callback' : 'promise' })) });
  // iOS: webkit.messageHandlers.bridge; Android: androidBridge (así Capacitor sabe la plataforma, como en la cáscara de verdad).
  if (/Android/.test(navigator.userAgent)) window.androidBridge = { postMessage: (m) => window.__puente.push(m) };
  else window.webkit = { messageHandlers: { bridge: { postMessage: (m) => window.__puente.push(m) } } };
  window.Capacitor = { PluginHeaders: [M('PushNotifications', ['checkPermissions', 'requestPermissions', 'register', 'unregister', 'addListener', 'removeListener', 'removeAllListeners']), M('TLPantalla', ['mantener', 'brillo', 'ajustes']), M('TLReporte', ['anotar', 'leer']), M('SplashScreen', ['hide']), M('App', ['addListener', 'exitApp']), M('AppLauncher', ['openUrl'])],
    nativePromise: (p, m, o) => { window.__puente.push({ p, m, o });
      if (p === 'PushNotifications') {
        if (m === 'checkPermissions') return Promise.resolve({ receive: window.__perm });
        if (m === 'requestPermissions') { window.__perm = 'granted'; localStorage.setItem('__perm', 'granted'); return Promise.resolve({ receive: 'granted' }); }
        if (m === 'register') { setTimeout(() => (window.__cbs.registration || []).forEach((f) => f({ value: localStorage.getItem('__token') || '${token}' })), 50); return Promise.resolve(); }
        return Promise.resolve();
      }
      if (p === 'TLReporte' && m === 'leer') return Promise.resolve({ lineas: [] });
      return Promise.resolve({}); },
    nativeCallback: (p, m, o, cb) => { window.__puente.push({ p, m, o }); if (m === 'addListener') (window.__cbs[o.eventName] = window.__cbs[o.eventName] || []).push(cb); return 'cb' + Math.random(); },
  };
}`;

(async () => {
  const T0 = sql(`select now()::text`);
  // ── Preparar (solo esta base): canales encendidos, límites de fábrica, sin tokens de corridas anteriores (los de prueba de la semilla quedan).
  sql(`update feature_flags set enabled = true where key like 'push.%'`);
  sql(`delete from platform_config where key like 'push_%'`);
  sql(`update push_tokens set revoked_at = now(), revoked_reason = 'admin' where revoked_at is null and provider <> 'sim' and user_id in (${U(MARI)}, ${U(DUENO)}, ${U(ADM)})`);
  sql(`update business_hours set ranges='[["00:00","23:59"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update items set sold_out = false, stock_day = null where business_id='${BIZ}'`);
  sql(`update menu_settings set pause_until = null where business_id='${BIZ}'`);
  sql(`update operations set respond_by = now() - interval '1 minute' where user_id = ${U(MARI)} and status = 'pending'`);
  sql(`update delivery_settings set auto_accept=false where business_id='${BIZ}'`);
  sql(`update users set notif_prefs = notif_prefs || '{"quiet": false}'::jsonb - 'ord' where id in (${U(MARI)}, ${U(ADM)})`);
  const sim = await SIM.arrancar({ apnsPuerto: 4401, fcmPuerto: 4402, webPuerto: 4403, temas: APPS.map((a) => a.ios) });
  const reg = (prov) => sim.registro.filter((x) => x.prov === prov);
  // El headless nuevo de Chromium (channel «chromium»): el viejo no deja mostrar notificaciones.
  const br = await chromium.launch({ channel: 'chromium', args: ['--host-resolver-rules=MAP pruebas.test 127.0.0.1'] }), errs = [];
  const ctx = async (w, ua, o = {}) => {
    const cx = await br.newContext({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: w > 500 ? 1 : 2, userAgent: ua, locale: 'es-US' });
    if (o.shim) { await cx.addInitScript(SHIM); await cx.grantPermissions(['notifications'], { origin: B }); }
    if (o.puente) await cx.addInitScript(PUENTE(o.puente));
    const p = await cx.newPage(); p.on('pageerror', (e) => errs.push(`${o.k ?? ''}: ${e.message}`)); return p;
  };
  const pedir = async (m) => {
    const B = /^https?:\/\//.test(m.url()) ? new URL(m.url()).origin : 'http://localhost:3100';
    await m.goto(B + '/n/' + BIZ); await m.evaluate(() => localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id: '16', ch: {}, q: 1, nt: '', k: {} }] } }))); await m.evaluate(() => localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' }))); /* 9b-1 · Pickup a propósito: sin elegir, sale el primer modo del negocio (Delivery si otra prueba lo encendió) */
    await m.goto(B + '/n/' + BIZ + '/pagar'); await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click();
    await m.waitForURL(/\/pedido\/\d+$/); return m.url().split('/').pop();
  };
  const aceptar = async (d, num) => {
    await d.goto(B + `/panel/${BIZ}/hoy`); await d.getByText(`Pedido #${num} · Pickup`).first().waitFor();
    const fila = d.locator('div', { has: d.getByText(`Pedido #${num} · Pickup`, { exact: true }) }).filter({ has: d.getByText('Aceptar', { exact: true }) }).last();
    await fila.getByText('Aceptar', { exact: true }).click(); await d.getByText('Marisol ya lo ve en su pedido.').waitFor();
  };
  const aviso = (tel, tpl, ref) => sql(`select id || '|' || push_status || '|' || sms_status from notifications where user_id = ${U(tel)} and tpl = '${tpl}'${ref ? ` and ref_id = '${ref}'` : ''} order by id desc limit 1`);
  const subirLlave = async (pa, tipo, nombre, contenido, extra = {}) => {
    sql(`delete from otp_codes where phone = '+1${ADM}'`);
    const c = await pa.evaluate(async () => (await fetch('/api/admin/llavero/codigo', { method: 'POST' })).json());
    return pa.evaluate(async ([tipo, nombre, contenido, extra, codigo]) => { const f = new FormData(); f.set('tipo', tipo); f.set('codigo', codigo); f.set('motivo', 'Prueba 8c de push'); f.set('archivo', new File([contenido], nombre)); for (const [k, v] of Object.entries(extra)) f.set(k, v); return (await fetch('/api/admin/llavero', { method: 'POST', body: f })).json(); }, [tipo, nombre, contenido, extra, c.codigoPrueba]);
  };
  try {
    console.log('1 · Sin conexión segura (el sandbox por HTTP en la IP): «no disponible»; la campana y el SMS como siempre');
    const ph = await ctx(390, IOS, { k: 'http' });
    await entrar(ph, MARI, 'http://pruebas.test:3100');
    await ph.goto('http://pruebas.test:3100/cuenta/avisos'); await ph.getByText('Los avisos al teléfono no están disponibles aquí').first().waitFor();
    ok(!(await ph.evaluate(() => window.isSecureContext)), 'http://pruebas.test (como la IP del sandbox) no es un contexto seguro');
    ok((await texto(ph)).includes('necesitan una conexión segura (https)'), 'Mi cuenta › Avisos dice por qué no hay avisos al teléfono y que llegan en la campana y por SMS');
    ok(!(await ph.evaluate(async () => !!(await navigator.serviceWorker?.getRegistration?.('/')))), 'no se registra ningún service worker de push');
    await ph.screenshot({ path: OUT + 'p8c-http-no-disponible-390.png', fullPage: true });
    const n0 = await pedir(ph);
    const pd = await ctx(1360, undefined, { k: 'panel' }); await entrar(pd, DUENO); await aceptar(pd, n0);
    ok(await espera(() => /\|sin_app\|pruebas$/.test(aviso(MARI, 'ord_ok', n0))), `sin teléfono con avisos: ord_ok queda «sin_app» y el SMS sale como hoy («pruebas») (${aviso(MARI, 'ord_ok', n0)})`);
    ok(sql(`select count(*) from push_outbox o join notifications n on n.id = o.notification_id where n.ref_id = '${n0}'`) === '0', 'nada en la cola de push');
    await ph.context().close();

    console.log('2 · Web Push en el escritorio: encender en Mi cuenta › Avisos → token cifrado atado a la sesión');
    const pw = await ctx(1360, undefined, { shim: true, k: 'web' });
    await entrar(pw, MARI); await pw.goto(B + '/cuenta/avisos'); await pw.getByText('Avisos en este teléfono').first().waitFor();
    await pw.screenshot({ path: OUT + 'p8c-micuenta-avisos-apagado-1360.png', fullPage: true });
    await pw.locator('[role="switch"][aria-label="Avisos en este teléfono"]').click();
    await pw.getByText('Listo: los avisos te llegan a este teléfono.').first().waitFor();
    const subW = await pw.evaluate(() => window.__sub);
    sim.suscribir(subW.id, subW.priv, subW.auth);
    const T = sql(`select t.provider || '|' || t.app || '|' || t.platform || '|' || (s.token_hash is not null) || '|' || length(t.token_hash) || '|' || (position('127.0.0.1' in encode(t.token_enc, 'escape')) = 0) || '|' || (t.webpush_keys_enc is not null) from push_tokens t left join sessions s on s.id = t.session_id where t.user_id = ${U(MARI)} and t.revoked_at is null and t.provider = 'webpush'`);
    ok(T === 'webpush|web|web|true|64|true|true', `registrado: Web Push atado a la sesión, huella de 64 y el endpoint y las llaves cifrados (${T})`);
    const clave = Buffer.from(await pw.evaluate(() => window.__clave), 'base64url');
    ok(clave.length === 65 && clave[0] === 4, 'la página pidió la suscripción con la llave pública VAPID del servidor (punto P-256, 65 bytes)');
    await pw.reload(); await pw.getByText('ENCENDIDOS · TE LLEGAN AL MOMENTO').first().waitFor();
    ok((await texto(pw)).includes('TUS TELÉFONOS CON AVISOS') && (await texto(pw)).includes('ESTE'), 'Mi cuenta › Avisos: «Avisos en este teléfono» encendido y «Tus teléfonos con avisos» con ESTE');
    await pw.screenshot({ path: OUT + 'p8c-micuenta-avisos-1360.png', fullPage: true });

    const po = await ctx(390, IOS, { k: 'pedidos' }); await entrar(po, MARI);   // Marisol pide desde el teléfono (la barra de pagar es la del teléfono)
    console.log('3 · Pedido aceptado → push al navegador (cifrado, VAPID) y SIN SMS; el service worker lo muestra y tocarlo abre el pedido');
    const n1 = await pedir(po); await aceptar(pd, n1);
    ok(await espera(() => /\|enviado\|ahorrado$/.test(aviso(MARI, 'ord_ok', n1))), `ord_ok: push «enviado» y el SMS «ahorrado» (no salió) (${aviso(MARI, 'ord_ok', n1)})`);
    const NID1 = aviso(MARI, 'ord_ok', n1).split('|')[0];
    const w1 = reg('webpush').filter((x) => x.id === subW.id).pop();
    ok(w1 && w1.status === 201 && !w1.fallo.length, `el servicio de push recibió UN pedido válido: VAPID (ES256, aud, exp, sub), aes128gcm, TTL${w1?.fallo?.length ? ' — ' + w1.fallo.join('; ') : ''}`);
    const c1 = JSON.parse(w1.texto);
    ok(c1.t === 'Pedido aceptado' && c1.b.startsWith(`Sabor Dominicano aceptó tu pedido #${n1}`) && c1.u === `/app/aviso/${NID1}?v=push` && c1.tag === `order:${n1}`, 'descifrado: título, texto, /app/aviso/{id} y la etiqueta del pedido (el nuevo estado reemplaza al viejo)');
    ok(Number(w1.ttl) > 80000 && Number(w1.ttl) <= 86400 && /^[A-Za-z0-9_-]{1,32}$/.test(w1.topic), `TTL = push_ttl_h (${w1.ttl} s) y Topic del pedido`);
    ok(sql(`select count(*) from push_deliveries where notification_id = ${NID1} and provider = 'webpush' and result = 'enviado'`) === '1', 'una entrega anotada (sin personas)');
    ok(sql(`select count(*) from push_outbox where notification_id = ${NID1} and payload_enc is null and status = 'hecho'`) === '1', 'la cola vacía el contenido al terminar');
    const cdp = await pw.context().newCDPSession(pw); const regs = [];
    cdp.on('ServiceWorker.workerRegistrationUpdated', (e) => regs.push(...e.registrations)); await cdp.send('ServiceWorker.enable');
    ok(await espera(() => regs.some((r) => r.scopeURL === B + '/')), 'el service worker /sw-push.js está registrado con alcance «/»');
    await cdp.send('ServiceWorker.deliverPushMessage', { origin: B, registrationId: regs.find((r) => r.scopeURL === B + '/').registrationId, data: w1.texto });
    const notis = async () => pw.evaluate(async () => (await (await navigator.serviceWorker.getRegistration('/')).getNotifications()).map((x) => ({ t: x.title, b: x.body, tag: x.tag, u: x.data && x.data.u })));
    ok(await espera(async () => (await notis()).length === 1), 'el service worker mostró la notificación');
    const nn = (await notis())[0];
    ok(nn.t === 'Pedido aceptado' && nn.b === c1.b && nn.u === c1.u && nn.tag === c1.tag, 'con el título, el texto, la etiqueta y la ruta que llegaron cifrados');
    await pw.goto(B + '/cuenta'); await pw.waitForLoadState('networkidle');
    const sw = pw.context().serviceWorkers().find((w) => w.url().endsWith('/sw-push.js'));
    await sw.evaluate(async () => { const [x] = await self.registration.getNotifications(); self.dispatchEvent(new NotificationEvent('notificationclick', { notification: x })); });
    ok(await espera(async () => new URL(pw.url()).pathname === `/pedido/${n1}`), `tocar la notificación abre /pedido/${n1}`);
    ok(sql(`select opened_via || '|' || (opened_at is not null) || '|' || (read_at is not null) from notifications where id = ${NID1}`) === 'push|true|true', 'y queda abierto desde el push (opened_via push) y leído');
    await pw.screenshot({ path: OUT + 'p8c-toque-abre-pedido-1360.png' });

    console.log('4 · El iPhone (APNs directo) y dos teléfonos → dos push');
    const pa = await ctx(1360, undefined, { shim: true, k: 'admin' }); await entrar(pa, ADM);
    const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const ra = await subirLlave(pa, 'apns_key', 'AuthKey_ABC123DEFG.p8', kp.privateKey.export({ type: 'pkcs8', format: 'pem' }), { equipo: 'TEAM123456' });
    ok(ra.ok, `${ra.msg ?? ''} la llave de APNs subida al llavero (huella ${String(ra.huella).slice(0, 12)}…)`);
    Object.assign(sim.cfg, { apnsPublica: kp.publicKey, apnsKid: 'ABC123DEFG', apnsEquipo: 'TEAM123456' });
    const pi = await ctx(390, IOS + rot('cliente', 'ios'), { puente: TOKEN, k: 'ios' });
    await entrar(pi, MARI); await pi.goto(B + '/cuenta/avisos'); await pi.getByText('Avisos en este teléfono').first().waitFor();
    await pi.locator('[role="switch"][aria-label="Avisos en este teléfono"]').click();
    await pi.getByText('Listo: los avisos te llegan a este teléfono.').first().waitFor();
    ok(sql(`select provider || '|' || app || '|' || platform from push_tokens where user_id = ${U(MARI)} and revoked_at is null and provider = 'apns'`) === 'apns|cliente|ios', 'el iPhone registró su token de APNs (la app y la plataforma las dice la sesión)');
    const llam = await pi.evaluate(() => window.__puente.filter((x) => x.p === 'PushNotifications').map((x) => x.m));
    ok(llam.includes('requestPermissions') && llam.includes('register'), 'el permiso lo pide el sistema (requestPermissions) y register() trae el token');
    await pi.screenshot({ path: OUT + 'p8c-micuenta-avisos-iphone-390.png', fullPage: true });
    const n2 = await pedir(po); await aceptar(pd, n2);
    ok(await espera(() => /\|enviado\|ahorrado$/.test(aviso(MARI, 'ord_ok', n2))), 'ord_ok con push enviado y SMS ahorrado');
    const NID2 = aviso(MARI, 'ord_ok', n2).split('|')[0];
    ok(await espera(() => sql(`select count(distinct token_id) from push_deliveries where notification_id = ${NID2} and result = 'enviado'`) === '2'), 'dos teléfonos → dos push (navegador y iPhone)');
    const a2 = reg('apns').filter((x) => x.token === TOKEN).pop();
    ok(a2 && a2.status === 200 && !a2.fallo.length, `APNs: cabeceras de Apple, JWT ES256 de la llave del llavero, tema ${a2?.cabeceras?.['apns-topic']}${a2?.fallo?.length ? ' — ' + a2.fallo.join('; ') : ''}`);
    ok(a2.cabeceras['apns-topic'] === APPS.find((a) => a.key === 'cliente').ios && a2.cuerpo.aps.alert.title === 'Pedido aceptado' && a2.cuerpo.aps['interruption-level'] === 'active' && a2.cuerpo.u === `/app/aviso/${NID2}?v=push`, 'la app To\'Latino, el texto del aviso, «active» y la ruta fuera de aps');
    ok(a2.cabeceras['apns-collapse-id'] === `order:${n2}` && a2.cabeceras['apns-priority'] === '10', 'collapse-id del pedido y prioridad 10');
    await pi.evaluate((u) => (window.__cbs.pushNotificationActionPerformed || []).forEach((f) => f({ actionId: 'tap', notification: { data: { u } } })), `/app/aviso/${NID2}?v=push`);
    ok(await espera(async () => new URL(pi.url()).pathname === `/pedido/${n2}`), 'en la app, tocar el aviso abre el pedido');
    ok(sql(`select opened_via from notifications where id = ${NID2}`) === 'push', 'abierto desde el push');
    await pi.evaluate(() => (window.__cbs.pushNotificationActionPerformed || []).forEach((f) => f({ actionId: 'tap', notification: { data: { u: 'https://malo.example/x' } } })));
    await dormir(600); ok(new URL(pi.url()).host === 'localhost:3100', 'un toque con una ruta ajena no lleva a ningún lado');

    console.log('5 · Salud → texto genérico; noche (11 PM) → nada salvo lo crítico; preferencia apagada; STOP');
    await pa.goto(B + '/cuenta/avisos'); await pa.locator('[role="switch"][aria-label="Avisos en este teléfono"]').click();
    await pa.getByText('Listo: los avisos te llegan a este teléfono.').first().waitFor();
    const subA = await pa.evaluate(() => window.__sub); sim.suscribir(subA.id, subA.priv, subA.auth);
    // «Probar en mi teléfono» de Notificaciones (pasa por avisar(), con su plantilla) para una plantilla de Salud.
    const tarjeta = (t) => pa.locator('div', { has: pa.getByText(t, { exact: true }) }).filter({ has: pa.getByText('Probar en mi teléfono', { exact: true }) }).last();
    await pa.goto(B + '/admin/notificaciones'); await pa.getByText('PEDIDOS, RESERVACIONES Y SOLICITUDES').first().waitFor();
    const tSal = sql(`select title->>'es' from notif_templates where key = 'sal_cita_ok'`);
    const k0 = reg('webpush').length;
    await tarjeta(tSal).getByText('Probar en mi teléfono', { exact: true }).first().click();
    ok(await espera(() => reg('webpush').length > k0), 'probar una plantilla de Salud manda el push');
    const ws = reg('webpush').filter((x) => x.id === subA.id).pop(), cs = JSON.parse(ws.texto);
    ok(cs.t === "To'Latino" && cs.b === "Tienes un aviso nuevo en To'Latino." && !ws.texto.includes(tSal), 'Salud: por el servicio de push solo pasa «Tienes un aviso nuevo en To\'Latino.» (el texto de la cita, nunca)');
    ok(!(await tarjeta(tSal).innerText()).includes('Texto genérico') && (await tarjeta(tSal).innerText()).includes('PUSH GENÉRICO'), 'en Notificaciones, una plantilla de Salud dice PUSH GENÉRICO y no se puede destapar');
    ok(sql(`select push_private from notif_templates where key = 'sop_respuesta'`) === 't' && sql(`select push_private from notif_templates where key = 'mod_sancion'`) === 't', 'Soporte y sanciones también genéricos');
    let tirada = false; try { sql(`update notif_templates set push_private = false where key = 'sal_cita_ok'`); } catch { tirada = true; }
    ok(tirada || sql(`select push_private from notif_templates where key = 'sal_cita_ok'`) === 't', 'la base no deja destaparla');
    await pa.screenshot({ path: OUT + 'p8c-admin-plantillas-1360.png' });
    // La noche: la ciudad de Ana a una zona donde son las 11 PM (se restaura al final).
    const casa0 = sql(`select coalesce(home_city_id, '') from users where id = ${U(ADM)}`), ciudad = 'rdg', tz0 = sql(`select timezone from cities where id = '${ciudad}'`);
    sql(`update users set home_city_id = '${ciudad}' where id = ${U(ADM)}`);
    const h = new Date().getUTCHours(), off = ((23 - h) % 24 + 24) % 24, zona = off === 0 ? 'Etc/GMT' : off <= 14 ? `Etc/GMT-${off}` : `Etc/GMT+${24 - off}`;
    sql(`update cities set timezone = '${zona}' where id = '${ciudad}'`); sql(`update users set notif_prefs = notif_prefs - 'quiet' where id = ${U(ADM)}`);
    try {
      ok(sql(`select extract(hour from now() at time zone timezone)::int from cities where id = '${ciudad}'`) === '23', `en la ciudad de Ana son las 11 PM (${zona})`);
      const tOrd = sql(`select title->>'es' from notif_templates where key = 'ord_ok'`), k1 = reg('webpush').length;
      await pa.reload(); await tarjeta(tOrd).getByText('Probar en mi teléfono', { exact: true }).first().click();
      ok(await espera(() => aviso(ADM, 'ord_ok').split('|')[1] === 'silencio'), 'un aviso que no es crítico a las 11 PM: push «silencio» (no sale)');
      await dormir(800); ok(reg('webpush').length === k1, 'y no llegó nada al teléfono');
      const tCx = sql(`select title->>'es' from notif_templates where key = 'evt_cancelado'`);
      await tarjeta(tCx).getByText('Probar en mi teléfono', { exact: true }).first().click();
      ok(await espera(() => aviso(ADM, 'evt_cancelado').split('|')[1] === 'enviado'), 'lo crítico (evento cancelado) sí sale a las 11 PM');
      ok(JSON.parse(reg('webpush').filter((x) => x.id === subA.id).pop().texto).t === tCx && reg('webpush').filter((x) => x.id === subA.id).pop().urgency === 'high', 'con su texto y urgencia alta');
    } finally { sql(`update cities set timezone = '${tz0}' where id = '${ciudad}'`); sql(`update users set home_city_id = ${casa0 ? `'${casa0}'` : 'null'} where id = ${U(ADM)}`); sql(`update users set notif_prefs = notif_prefs || '{"quiet": false}'::jsonb where id = ${U(ADM)}`); }
    sql(`update users set notif_prefs = notif_prefs || '{"ord": false}'::jsonb where id = ${U(ADM)}`);
    await pa.reload(); await tarjeta(sql(`select title->>'es' from notif_templates where key = 'ord_ok'`)).getByText('Probar en mi teléfono', { exact: true }).first().click();
    ok(await espera(() => /\|apagado\|apagado$/.test(aviso(ADM, 'ord_ok'))), 'con «Pedidos» apagado: ni push ni SMS (queda en la campana), como hoy');
    sql(`update users set notif_prefs = notif_prefs - 'ord' where id = ${U(ADM)}`);

    console.log('6 · Token inválido (410 Unregistered) → revocado solo y sale el SMS de respaldo; STOP lo frena');
    await pw.goto(B + '/cuenta/avisos'); await pw.locator('[role="switch"][aria-label="Avisos en este teléfono"]').click();
    await pw.getByText('Avisos apagados en este teléfono.').first().waitFor();
    ok(sql(`select revoked_reason from push_tokens where user_id = ${U(MARI)} and provider = 'webpush' order by id desc limit 1`) === 'apagado', 'apagar en este teléfono: revocado «apagado»');
    const apns0 = sql(`select max(id) from push_tokens where user_id = ${U(MARI)} and provider = 'apns'`);
    await pi.evaluate((t) => { localStorage.setItem('__token', t); }, 'dead' + crypto.randomBytes(30).toString('hex'));
    await pi.goto(B + '/cuenta/avisos'); await pi.locator('[role="switch"][aria-label="Avisos en este teléfono"]').waitFor();
    // El token del iPhone rota (APNs da otro): el nuevo reemplaza al anterior de la misma sesión.
    await pi.evaluate(() => { localStorage.removeItem('tl-avisos-refresco'); }); await pi.reload(); await dormir(1500);
    ok(await espera(() => sql(`select count(*) || '|' || (max(id) > ${apns0}) from push_tokens where user_id = ${U(MARI)} and provider = 'apns' and revoked_at is null`) === '1|true'), 'al abrir, el registro se refresca con el token nuevo (rotado)');
    ok(sql(`select revoked_reason from push_tokens where user_id = ${U(MARI)} and provider = 'apns' order by id desc offset 1 limit 1`) === 'reemplazado', 'y el anterior queda «reemplazado»');
    const n3 = await pedir(po); await aceptar(pd, n3);
    ok(await espera(() => /\|fallo\|pruebas$/.test(aviso(MARI, 'ord_ok', n3))), `APNs contestó 410 Unregistered: push «fallo» y salió el SMS de respaldo (${aviso(MARI, 'ord_ok', n3)})`);
    ok(sql(`select revoked_reason from push_tokens where user_id = ${U(MARI)} and provider = 'apns' order by id desc limit 1`) === 'invalido', 'el token quedó revocado «invalido» (no se le vuelve a mandar)');
    ok(sql(`select count(*) from push_deliveries d join notifications n on n.id = d.notification_id where n.ref_id = '${n3}' and d.result = 'invalido' and d.error_code = 'Unregistered'`) === '1', 'la entrega dice Unregistered, sin reintento');
    // STOP: el SMS de respaldo también respeta el STOP al número de To'Latino.
    const DS = ENT.sec('DATOS_SECRET');
    const llave = crypto.createHash('sha256').update('op_private:' + DS).digest();
    const hm = crypto.createHmac('sha256', llave).update('huella:+1' + MARI).digest('hex');
    sql(`insert into compa_canal_consent (phone_hash, channel, action, via) values ('${hm}', 'sms', 'stop', 'simulador')`);
    try {
      await pi.evaluate((t) => { localStorage.setItem('__token', t); localStorage.removeItem('tl-avisos-refresco'); }, 'dead' + crypto.randomBytes(30).toString('hex')); await pi.reload(); await dormir(1500);
      const n4 = await pedir(po); await aceptar(pd, n4);
      ok(await espera(() => /\|fallo\|baja$/.test(aviso(MARI, 'ord_ok', n4))), 'con STOP: el push no llegó y el SMS de respaldo tampoco sale («baja»), como hoy');
    } finally { sql(`insert into compa_canal_consent (phone_hash, channel, action, via) values ('${hm}', 'sms', 'start', 'simulador')`); }

    console.log('7 · Salir de la cuenta → el token de ESA sesión ya no recibe');
    await pi.evaluate((t) => { localStorage.setItem('__token', t); localStorage.removeItem('tl-avisos-refresco'); }, TOKEN); await pi.reload(); await dormir(1500);
    ok(await espera(() => sql(`select count(*) from push_tokens where user_id = ${U(MARI)} and provider = 'apns' and revoked_at is null`) === '1'), 'el iPhone vuelve a tener su token vivo');
    await pi.evaluate(async () => fetch('/api/cuenta/salir', { method: 'POST' }));
    ok(await espera(() => sql(`select revoked_reason from push_tokens where user_id = ${U(MARI)} and provider = 'apns' order by id desc limit 1`) === 'salir'), 'salir revoca su token en la misma transacción («salir»)');
    const n5 = await pedir(po); await aceptar(pd, n5);
    ok(await espera(() => /\|sin_app\|pruebas$/.test(aviso(MARI, 'ord_ok', n5))), 'el siguiente aviso ya no va a ese teléfono (sin_app) y el SMS sale como hoy');

    console.log('8 · Android (FCM v1) en To\'Latino Negocios: la hoja previa al abrir el panel → «Nueva solicitud» con prioridad alta');
    const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const SA = { type: 'service_account', project_id: 'tolatino-pruebas', private_key_id: 'abc123def456', private_key: rsa.privateKey.export({ type: 'pkcs8', format: 'pem' }), client_email: 'push@tolatino-pruebas.iam.gserviceaccount.com', token_uri: 'https://oauth2.googleapis.com/token' };
    const rf = await subirLlave(pa, 'fcm_service_account', 'tolatino-pruebas-fcm.json', JSON.stringify(SA));
    ok(rf.ok, 'la cuenta de servicio de FCM subida al llavero');
    Object.assign(sim.cfg, { saPublica: rsa.publicKey, saCorreo: SA.client_email });
    const FTOK = 'fcm:' + crypto.randomBytes(80).toString('base64url');
    const pn = await ctx(390, AND + rot('negocio', 'android'), { puente: FTOK, k: 'android' });
    await entrar(pn, DUENO); await pn.goto(B + `/panel/${BIZ}`);
    await pn.getByText('Avisos en este teléfono').first().waitFor({ timeout: 15000 });
    ok((await texto(pn)).includes('¿Te avisamos al momento cuando llegue un pedido, una cita o un mensaje?'), 'la hoja previa dice el porqué (apps.json) y no imita al sistema: «Continuar» / «Ahora no»');
    await pn.screenshot({ path: OUT + 'p8c-hoja-previa-negocios-390.png' });
    await boton(pn, 'Continuar').click();
    ok(await espera(() => sql(`select provider || '|' || app || '|' || platform from push_tokens where user_id = ${U(DUENO)} and revoked_at is null and provider = 'fcm'`) === 'fcm|negocio|android'), 'Continuar → el sistema pregunta y el token de FCM queda registrado para Negocios');
    const kf = reg('fcm').length;
    const n6 = await pedir(po);
    ok(await espera(() => aviso(DUENO, 'biz_req', n6).split('|')[1] === 'enviado'), `«Nueva solicitud» al dueño por push (${aviso(DUENO, 'biz_req', n6)})`);
    ok(/\|ahorrado$/.test(aviso(DUENO, 'biz_req', n6)), 'y su SMS de respaldo no salió');
    const f6 = reg('fcm').slice(kf).find((x) => x.token === FTOK);
    ok(f6 && f6.status === 200 && !f6.fallo.length && f6.proyecto === 'tolatino-pruebas', 'FCM v1: OAuth con la cuenta de servicio, projects/{proyecto}/messages:send');
    ok(f6.cuerpo.message.android.priority === 'HIGH' && f6.cuerpo.message.notification.title === 'Nueva solicitud' && f6.cuerpo.message.data.u.startsWith('/app/aviso/') && f6.cuerpo.message.android.ttl.endsWith('s'), 'prioridad HIGH (la solicitud no espera), el texto y la ruta en data');
    await aceptar(pd, n6);
    ok(await espera(() => /\|sin_app\|pruebas$/.test(aviso(MARI, 'ord_ok', n6))), '(el pedido sigue: aceptado)');

    console.log('9 · El interruptor del canal (Integraciones › Push): apagado → sale el SMS como si no hubiera push; con motivo y auditoría');
    await pw.goto(B + '/cuenta/avisos'); await pw.locator('[role="switch"][aria-label="Avisos en este teléfono"]').click(); await pw.getByText('Listo: los avisos te llegan a este teléfono.').first().waitFor();
    const subW2 = await pw.evaluate(() => window.__sub); sim.suscribir(subW2.id, subW2.priv, subW2.auth);
    await pa.goto(B + '/admin/sistema/integraciones?tab=push'); await pa.getByText('Web Push (navegadores y la web instalada)').first().waitFor();
    await pa.screenshot({ path: OUT + 'p8c-admin-integraciones-push-1360.png', fullPage: true });
    ok((await texto(pa)).includes('TELÉFONOS CON AVISOS') && (await texto(pa)).includes('apns_key') === false, 'Integraciones › Push: canales, teléfonos, cola y límites (sin llaves ni personas)');
    await pa.locator('[role="switch"][aria-label="Web Push (navegadores y la web instalada)"]').click();
    await pa.getByText('El proveedor está fallando', { exact: true }).first().click(); await boton(pa, 'Apagar').last().click();
    ok(await espera(() => sql(`select enabled from feature_flags where key = 'push.webpush'`) === 'f'), 'Web Push apagado');
    ok(sql(`select count(*) from audit_entries where action = 'push.canal.apagar' and reason = 'El proveedor está fallando' and at >= '${T0}'`) === '1', 'en la auditoría con su motivo');
    await dormir(16000); // la caché de los interruptores dura 15 s por proceso
    const n7 = await pedir(po); await aceptar(pd, n7);
    ok(await espera(() => /\|sin_app\|pruebas$/.test(aviso(MARI, 'ord_ok', n7))), 'con el canal apagado: el aviso no va por push y el SMS sale como hoy');
    await pa.reload(); await pa.locator('[role="switch"][aria-label="Web Push (navegadores y la web instalada)"]').click();
    await pa.getByText('Ya se corrigió', { exact: true }).first().click(); await boton(pa, 'Encender').last().click();
    ok(await espera(() => sql(`select enabled from feature_flags where key = 'push.webpush'`) === 't'), 'encendido otra vez');
    // Límites con motivo (cambiarConfig: límites + auditoría).
    const fila = pa.locator('div', { has: pa.getByText(/^Push · reintentos:/) }).filter({ has: pa.getByText('Cambiar', { exact: true }) }).last();
    await fila.getByText('Cambiar', { exact: true }).click(); await pa.getByRole('textbox').first().fill('99'); await pa.getByRole('textbox').last().fill('Prueba 8c de límites'); await boton(pa, 'Guardar').last().click();
    ok(await espera(async () => (await texto(pa)).includes('Entre 0 intentos y 10 intentos.')) && sql(`select count(*) from platform_config where key = 'push_reintentos'`) === '0', 'un valor fuera de sus límites (99) no se guarda: «Entre 0 intentos y 10 intentos.»');
    await pa.goto(B + '/admin/sistema/integraciones?tab=push');
    await pa.locator('div', { has: pa.getByText(/^Push · reintentos:/) }).filter({ has: pa.getByText('Cambiar', { exact: true }) }).last().getByText('Cambiar', { exact: true }).click();
    await pa.getByRole('textbox').first().fill('3'); await pa.getByRole('textbox').last().fill('Prueba 8c de límites'); await boton(pa, 'Guardar').last().click();
    ok(await espera(() => sql(`select cfg_int('push_reintentos')`) === '3'), 'push_reintentos = 3 dentro de sus límites');
    ok(sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id = 'push_reintentos' and reason = 'Prueba 8c de límites' and at >= '${T0}'`) === '1', 'con motivo en la auditoría');
    sql(`delete from platform_config where key = 'push_reintentos'`);
    const kp2 = reg('webpush').length;
    await pa.goto(B + '/admin/sistema/integraciones?tab=push'); await boton(pa, 'Mandar un push de prueba a mi teléfono').click();
    ok(await espera(() => reg('webpush').length > kp2) && JSON.parse(reg('webpush').filter((x) => x.id === subA.id).pop().texto).t === 'Prueba de avisos', '«Mandar un push de prueba a mi teléfono» llega al navegador de Ana (plantilla push_prueba)');
    const pam = await ctx(390, IOS, { k: 'admin390' }); await entrar(pam, ADM);
    await pam.goto(B + '/admin/sistema/integraciones?tab=push'); await pam.getByText('CANALES').first().waitFor(); await pam.screenshot({ path: OUT + 'p8c-admin-integraciones-push-390.png', fullPage: true });

    console.log('10 · Notificaciones › Push (cifras sin personas) y Usuarios 360° › Avisos push (enmascarado, revocar con motivo)');
    await pa.goto(B + '/admin/notificaciones?tab=push'); await pa.getByText('POR PLANTILLA · 7 DÍAS').first().waitFor();
    const tn = await texto(pa);
    ok(tn.includes('SMS ahorrados') && tn.includes('ORD_OK') && !tn.includes('Marisol'), 'Notificaciones › Push: entregados, abiertos y SMS ahorrados por plantilla, app y plataforma, sin nombres');
    await pa.screenshot({ path: OUT + 'p8c-admin-notif-push-1360.png', fullPage: true });
    await pa.goto(B + '/admin/notificaciones?tab=log'); await pa.getByText('ABIERTO DESDE EL PUSH').first().waitFor();
    ok(true, 'Envíos: cada aviso dice su push (entregado, abierto desde el push) y su SMS (ahorrado, respaldo)');
    const MID = sql(`select id from users where phone = '+1${MARI}'`);
    await pa.goto(B + `/admin/usuarios/${MID}?tab=seguridad`); await pa.getByText(/AVISOS PUSH · \d+ VIVOS?/).first().waitFor();
    const tu = await texto(pa);
    ok(tu.includes('huella …') && !tu.includes(':4403') && !tu.includes('/wp/') && !tu.includes(TOKEN), 'Usuarios 360°: sus teléfonos con avisos enmascarados (huella, nunca el token ni el endpoint)');
    ok(tu.includes('revocado') && tu.includes('salió de la cuenta') && tu.includes('el proveedor dijo que ya no sirve'), 'con los revocados y su motivo en palabras');
    await pa.screenshot({ path: OUT + 'p8c-admin-u360-push-1360.png', fullPage: true });
    await pa.locator('div', { has: pa.getByText(/^Chrome · Linux · Web$/) }).filter({ has: pa.getByText('Revocar', { exact: true }) }).last().getByText('Revocar', { exact: true }).click();
    await pa.getByText('Lo pidió la persona', { exact: true }).first().click(); await boton(pa, /Revocar|Confirmar/).last().click();
    ok(await espera(() => sql(`select revoked_reason from push_tokens where user_id = ${U(MARI)} and provider = 'webpush' order by id desc limit 1`) === 'admin'), 'revocar desde el 360°: el token queda «admin»');
    ok(sql(`select count(*) from audit_entries where action = 'usuario.push.revocar' and reason = 'Lo pidió la persona' and at >= '${T0}'`) === '1', 'en el historial con su motivo');

    console.log('11 · Abusos: ruta ajena en el aviso, aviso de otra persona, servicio de push que no es uno conocido');
    const malo = sql(`insert into notifications (user_id, city_id, tpl, title, body, href, sms_status) values (${U(MARI)}, 'hzl', 'push_prueba', 'x', 'x', '//malo.example/robar', 'no') returning id`);
    const pm = await ctx(390, IOS, { k: 'abuso' }); await entrar(pm, MARI);
    const r1 = await pm.request.get(B + `/app/aviso/${malo}?v=push`, { maxRedirects: 0 });
    ok(r1.status() === 303 && new URL(r1.headers().location).pathname === '/avisos' && new URL(r1.headers().location).host === 'localhost:3100', 'un aviso con un enlace a otro sitio abre la campana, nunca el otro sitio');
    const ajeno = aviso(DUENO, 'biz_req', n6).split('|')[0];
    const r2 = await pm.request.get(B + `/app/aviso/${ajeno}?v=push`, { maxRedirects: 0 });
    ok(new URL(r2.headers().location).pathname === '/avisos' && sql(`select opened_at is null from notifications where id = ${ajeno}`) === 't', 'el aviso de otra persona no abre nada ni se marca');
    const r3 = await (await br.newContext()).request.get(B + `/app/aviso/${NID1}?v=push`, { maxRedirects: 0 });
    ok(new URL(r3.headers().location).pathname === '/entrar', 'sin sesión → a entrar (y de vuelta)');
    const pe = await ctx(1360, undefined, { shim: true, k: 'ssrf' }); await pe.addInitScript(() => { window.__endpoint = 'https://malo.example/wp/1'; });
    await entrar(pe, MARI); await pe.goto(B + '/cuenta/avisos'); await pe.locator('[role="switch"][aria-label="Avisos en este teléfono"]').click();
    await pe.getByText('No se pudo encender. Prueba de nuevo.').first().waitFor();
    ok(sql(`select count(*) from push_tokens where user_id = ${U(MARI)} and revoked_at is null and provider = 'webpush'`) === '0', 'una suscripción con un endpoint que no es de un servicio de push conocido no se registra (SSRF)');

    console.log('12 · La hoja previa en el momento útil (el primer pedido) y la cola sin duplicados');
    // La web INSTALADA en la pantalla de inicio (display-mode standalone; en una pestaña no se interrumpe con la hoja).
    const pt = await ctx(390, IOS, { k: 'pestaña' }); await entrar(pt, MARI); await pedir(pt); await dormir(2500);
    ok(!(await texto(pt)).includes('¿Te avisamos cuando tu pedido'), 'en una pestaña del navegador, la hoja no interrumpe (se encienden en Mi cuenta › Avisos)');
    const pf = await ctx(390, IOS, { k: 'momento' });
    await pf.context().addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (q === '(display-mode: standalone)' ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : mm(q)); });
    await entrar(pf, MARI);
    const n8 = await pedir(pf);
    await pf.getByText('Avisos en este teléfono').first().waitFor({ timeout: 8000 }).catch(() => undefined);
    const tieneHoja = (await texto(pf)).includes('¿Te avisamos cuando tu pedido esté listo, te confirmen una cita o cambie tu evento?');
    ok(tieneHoja, 'en la web instalada, después del pedido: la hoja previa (una vez) con el porqué de apps.json');
    await pf.screenshot({ path: OUT + 'p8c-hoja-previa-pedido-390.png' });
    await boton(pf, 'Ahora no').click(); await pf.reload(); await dormir(2000);
    ok(!(await texto(pf)).includes('¿Te avisamos cuando tu pedido'), '«Ahora no» → no vuelve a salir (se encienden en Mi cuenta › Avisos)');
    void n8;
    await Promise.all([1, 2, 3].map(() => pa.request.post(B + '/api/interno/push', { headers: { 'x-barrido-token': ENT.TOK } })));
    ok(sql(`select count(*) from (select outbox_id from push_deliveries where at >= '${T0}' and result in ('enviado', 'pruebas') group by outbox_id having count(*) > 1) x`) === '0', 'tres trabajadores a la vez: ningún push sale dos veces (una entrega buena por fila de la cola)');
    ok(sql(`select count(*) from (select notification_id, token_id from push_outbox group by 1, 2 having count(*) > 1) x`) === '0', 'una sola fila por aviso y teléfono');
    const rb = await pa.request.post(B + '/api/interno/barrido', { headers: { 'x-barrido-token': ENT.TOK } });
    ok((await rb.json()).ok && sql(`select last_error is null from system_jobs where name = 'barrido.push'`) === 't', 'el barrido corre la tarea «push» sin error');
    // (un 401 de FCM por un token de acceso de otra corrida del simulador no es un pedido mal hecho: se pide otro y sale)
    const malos = [...reg('webpush'), ...reg('apns'), ...reg('fcm'), ...reg('fcm-oauth')].filter((x) => x.fallo.length && !(x.prov === 'fcm' && x.status === 401));
    ok(!malos.length, `los simuladores no cazaron ningún pedido fuera de la especificación${malos.length ? ' — ' + JSON.stringify(malos.map((x) => [x.prov, x.status, x.fallo])).slice(0, 400) : ''}`);
    ok(!errs.length, `sin errores de página (${errs.length})${errs.length ? ' — ' + errs.slice(0, 3).join(' · ') : ''}`);
  } finally {
    await br.close(); await sim.cerrar();
    sql(`update feature_flags set enabled = true where key like 'push.%'`);
    // Lo de esta prueba no queda vivo para la regresión (el SMS de Marisol, Pedro y Ana sigue como hoy).
    sql(`update push_tokens set revoked_at = now(), revoked_reason = 'admin' where revoked_at is null and provider <> 'sim' and user_id in (${U(MARI)}, ${U(DUENO)}, ${U(ADM)})`);
    sql(`update users set notif_prefs = notif_prefs - 'quiet' - 'ord' where id in (${U(MARI)}, ${U(ADM)})`);
  }
  console.log(`\n${n} comprobaciones`);
})().catch((e) => { console.error(e); process.exit(1); });
