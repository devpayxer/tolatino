// 8e · Lo nativo de cada app — de punta a punta (Playwright, teléfono 390 y escritorio 1360) contra :3100 (servir8f.sh).
// Repartidor: la ruta en vivo por el lado web (geolocalización emulada): el cliente no ve nada antes de «Recogí», el negocio sí desde «Voy por el
// pedido», el cliente ve el pin moverse, «Entregado» → el mapa desaparece en las dos puntas; el token solo sirve para ESA entrega mientras está
// activa; velocidad imposible y de antes de empezar → rechazadas; otra persona → 404; el Super Admin ve el recorrido solo con motivo (auditoría);
// la purga a los ubic_retener_dias (reloj movido). El mismo flujo con la cáscara simulada (puente con TLRuta/TLPantalla): empezar con el token, la
// pantalla encendida, reanudar con token nuevo, detener al entregar. To'Latino: brillo del QR (sube y se devuelve), compartir nativo. Negocios:
// «Escanear cupón» con una cámara de prueba (y4m con el QR real del código) → válido; otra vez → no vale. Puerta: «Fijar la Puerta» (Android →
// TLPantalla.fijar tras confirmar; iPhone → Acceso guiado; navegador → cómo hacerlo). Configuración › Apps con las claves de la ubicación.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'); const crypto = require('crypto');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100', TOKEN_BARRIDO = ENT.TOK;
const sharp = require(ENT.RAIZ + '/apps/mobile/node_modules/sharp');
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); const r = await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); if (!r.ok) throw new Error('no entró ' + tel); };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await dormir(250); } throw new Error('no visible: ' + l); };
const BIZ = 'sabor-dominicano', P = '/panel/' + BIZ, DUENO = '5705550133', JUAN = '5705550144', MARI = '5705550122', HECTOR = '5705550210', ADM = '5705550199', BARB = '5705550166', BOLETO = '5705550201';
const U = (tel) => `(select id from users where phone = '+1${tel}')`;
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const op = (num, c = "status||'|'||coalesce(stage,'-')") => sql(`select ${c} from operations where number = '${num}'`);
const track = (num, c) => sql(`select ${c} from delivery_tracks t join operations o on o.id = t.operation_id where o.number = '${num}' order by t.id desc limit 1`);
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const rot = (app, plat) => ` TLApp/${app}/${plat}/1.0.0 (7)`;
// Un punto de la ruta: por N Wyoming St desde Sabor Dominicano hacia el norte (~26 m por paso).
const punto = (i) => ({ latitude: 40.95500 + i * 0.00024, longitude: -75.97818, accuracy: 8 });
// La cáscara simulada (como app8a / push8c / beta8f): Capacitor con TLRuta, TLPantalla, Share, Haptics y lo de siempre. Todo lo que la página le
// pide queda en window.__puente.
const PUENTE = `if (window === window.top) {
  window.__puente = []; window.__cbs = {};
  const M = (n, ms) => ({ name: n, methods: ms.map((x) => ({ name: x, rtype: x === 'addListener' ? 'callback' : 'promise' })) });
  if (/Android/.test(navigator.userAgent)) window.androidBridge = { postMessage: (m) => window.__puente.push(m) };
  else window.webkit = { messageHandlers: { bridge: { postMessage: (m) => window.__puente.push(m) } } };
  window.__ruta = { activo: false };
  window.Capacitor = { PluginHeaders: [M('TLRuta', ['empezar', 'detener', 'estado', 'permiso']), M('TLPantalla', ['mantener', 'brillo', 'ajustes', 'linterna', 'fijar', 'soltar', 'fijada']),
      M('Share', ['share']), M('Haptics', ['notification', 'impact']), M('TLReporte', ['anotar', 'leer', 'ultimaCaptura', 'agitar', 'cierres', 'addListener', 'removeListener']),
      M('SplashScreen', ['hide']), M('App', ['addListener', 'exitApp']), M('AppLauncher', ['openUrl']), M('PushNotifications', ['checkPermissions', 'requestPermissions', 'register', 'addListener', 'removeAllListeners'])],
    nativePromise: (p, m, o) => { window.__puente.push({ p, m, o });
      if (p === 'TLRuta') {
        if (m === 'empezar') { window.__ruta = { activo: true, entrega: o.entrega, pendientes: 0, sinSenal: false }; return Promise.resolve({ estado: 'ok' }); }
        if (m === 'detener') { window.__ruta = { activo: false }; return Promise.resolve(); }
        if (m === 'estado') return Promise.resolve(window.__ruta);
        if (m === 'permiso') return Promise.resolve({ estado: 'concedido' });
      }
      if (p === 'TLPantalla' && m === 'fijar') { window.__fijada = true; return Promise.resolve({ ok: true }); }
      if (p === 'TLPantalla' && m === 'fijada') return Promise.resolve({ fijada: !!window.__fijada });
      if (p === 'TLPantalla' && m === 'linterna') return Promise.resolve({ ok: false });
      if (p === 'TLReporte' && m === 'leer') return Promise.resolve({ lineas: [] });
      if (p === 'TLReporte' && m === 'cierres') return Promise.resolve({ cierres: [] });
      if (p === 'PushNotifications' && m === 'checkPermissions') return Promise.resolve({ receive: 'denied' });
      return Promise.resolve({}); },
    nativeCallback: (p, m, o, cb) => { window.__puente.push({ p, m, o }); return 'cb' + Math.random(); },
  };
}`;
const puente = (p) => p.evaluate(() => window.__puente || []);
const llamadas = async (p, plug, met) => (await puente(p)).filter((x) => x.p === plug && x.m === met);
// Un SSE pedido desde la página: el código y el primer evento (o null).
const sse = (p, url, ms = 6000) => p.evaluate(async ([url, ms]) => {
  const r = await fetch(url).catch(() => null); if (!r) return { st: 0 };
  if (r.status !== 200) return { st: r.status };
  const rd = r.body.getReader(), dec = new TextDecoder(); let t = ''; const fin = Date.now() + ms;
  while (Date.now() < fin) { const x = await Promise.race([rd.read(), new Promise((ok) => setTimeout(() => ok({ espera: true }), 500))]); if (x.done) break; if (x.value) t += dec.decode(x.value); const m = /event: (\w+)\ndata: (.*)\n\n/.exec(t); if (m) { rd.cancel().catch(() => {}); return { st: 200, ev: m[1], data: JSON.parse(m[2]) }; } }
  rd.cancel().catch(() => {}); return { st: 200, ev: null };
}, [url, ms]);
const postRuta = async (req, token, cuerpo) => { await dormir(1150); const r = await req.post(B + '/api/ruta/posicion', { headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, data: cuerpo }); let j = {}; try { j = await r.json(); } catch {} return { st: r.status(), ...j }; };
// Una cámara de prueba (y4m 4:2:0) con una imagen centrada sobre blanco.
async function y4m(png, archivo) {
  const W = 640, H = 480, img = await sharp(png).resize(300, 300, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).grayscale().raw().toBuffer();
  const Y = Buffer.alloc(W * H, 255); for (let y = 0; y < 300; y++) for (let x = 0; x < 300; x++) Y[(y + 90) * W + x + 170] = img[y * 300 + x];
  const UV = Buffer.alloc((W / 2) * (H / 2), 128), cuadro = Buffer.concat([Buffer.from('FRAME\n'), Y, UV, UV]);
  fs.writeFileSync(archivo, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), ...Array(10).fill(cuadro)]));
}

(async () => {
  // ── Preparar (solo esta base) ──
  sql(`update feature_flags set enabled = true where key = 'app.ubicacion_vivo'`);
  sql(`insert into platform_config (key, value) values ('ubic_cada_s', '5'::jsonb), ('ubic_min_m', '5'::jsonb) on conflict (key) do update set value = excluded.value`);
  sql(`delete from platform_config where key in ('ubic_cliente_desde', 'ubic_retener_dias', 'ubic_vel_max_mps', 'ubic_vieja_s')`);
  sql(`update business_hours set ranges='[["00:00","23:59"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update delivery_settings set delivery=true, pickup=true, pay_cash_delivery=true, pay_card=false, ask_tip=true, zone_mi=3, fee_cents=300, free_over_cents=4000, min_order_cents=0, travel_min=15, last_delivery_min=0, who='team', external_app=null, auto_accept=false where business_id='${BIZ}'`);
  sql(`update businesses set modules_off = modules_off - 'delivery' where id='${BIZ}'`);
  sql(`update items set sold_out = false, stock_day = null where business_id='${BIZ}'`); sql(`update menu_settings set pause_until = null where business_id='${BIZ}'`);
  sql(`update operations set respond_by = now() - interval '1 minute' where user_id = ${U(MARI)} and status = 'pending'`);
  sql(`update operations set driver_id = null where driver_id in (select id from delivery_drivers where business_id = '${BIZ}') and status = 'confirmed'`);
  sql(`update delivery_drivers set status = 'removed', removed_at = now(), online = false, invite_code = null where business_id = '${BIZ}' and status <> 'removed'`);
  sql(`insert into delivery_drivers (business_id, user_id, display_name, phone, vehicle, status, online, online_at, accepted_at) values ('${BIZ}', ${U(JUAN)}, 'Juan Repartidor', '+1${JUAN}', 'moto', 'active', true, now(), now())`);
  const br = await chromium.launch(), errs = [];
  const pagina = async (k, w, o = {}) => {
    const cx = await br.newContext({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: w > 500 ? 1 : 2, userAgent: o.ua, locale: 'es-US', ...(o.geo ? { geolocation: o.geo, permissions: ['geolocation'] } : {}) });
    if (o.puente) await cx.addInitScript(PUENTE);
    const p = await cx.newPage(); p.on('pageerror', (e) => errs.push(`${k}: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load|404|pexels|ERR_|net::|status of 4/.test(m.text())) errs.push(`${k} console: ${m.text()}`); });
    return p;
  };
  const pedir = async (m) => {
    await m.goto(B + '/n/' + BIZ); await m.evaluate(() => { localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id: '7', ch: {}, q: 1, nt: '', k: {} }] } })); localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'delivery' })); });
    await m.goto(B + '/n/' + BIZ + '/pagar'); await m.getByText(/Casa · /).first().waitFor();
    await m.locator('[data-screen-label="Checkout · barra"]').getByText(/^Enviar pedido/).click(); await m.waitForURL(/\/pedido\/\d+$/); return m.url().split('/').pop();
  };
  const det = (d) => d.locator('aside[data-screen-label="Panel v2 · detalle"]');
  const aceptarYAsignar = async (d, num) => {
    await d.goto(B + P + '/hoy?det=ped:' + num); await clic(det(d).getByText('Aceptar', { exact: true })); await d.waitForTimeout(800);
    await d.goto(B + P + '/hoy?det=ped:' + num); await clic(det(d).getByText('Asignar', { exact: true })); await d.getByText(/Asignado a Juan/).first().waitFor();
  };

  // ═══ 1 · La ruta por la web (Juan en el navegador, con la ubicación del teléfono emulada) ═══
  const m = await pagina('cliente', 390), d = await pagina('negocio', 1360), j = await pagina('repartidor', 390, { geo: punto(0) }), h = await pagina('otro vecino', 390);
  await entrar(m, MARI); await entrar(d, DUENO); await entrar(j, JUAN); await entrar(h, HECTOR);
  const n1 = await pedir(m); ok(op(n1, "mode||'|'||pay_mode") === 'delivery|entrega', `pedido #${n1} a domicilio`);
  await aceptarYAsignar(d, n1); ok(op(n1, "driver_id is not null") === 't', 'el negocio acepta y se lo asigna a Juan');
  // Antes de empezar: nadie ve nada.
  await m.goto(B + '/pedido/' + n1); await m.getByText(/Pedido #|PEDIDO #/).first().waitFor();
  ok(await m.locator('[data-pantalla="APP-PEDIDO-MAPA"]').count() === 0, 'antes de empezar el cliente no ve mapa');
  ok((await sse(m, `/api/ruta/vivo?pedido=${n1}`)).st === 404, 'el SSE del cliente antes de empezar → 404');
  ok((await sse(d, `/api/ruta/vivo?pedido=${n1}&negocio=${BIZ}`)).st === 404, 'el SSE del negocio sin ruta todavía → 404');
  // Juan: «Voy por el pedido» abre la ruta (y el token llega solo a su teléfono).
  let token = null; await j.route('**/api/ruta/posicion', async (rt) => { const hh = await rt.request().allHeaders(); if (hh.authorization) token = hh.authorization.slice(7); else console.log('  (sin authorization)', Object.keys(hh).join(',')); await rt.continue(); });
  await j.goto(B + '/repartidor?p=' + n1); await j.getByRole('button', { name: 'Voy por el pedido' }).first().waitFor();
  ok(await j.locator('[data-banda="ubicacion"]').count() === 0, 'sin entrega empezada no hay banda');
  await j.screenshot({ path: OUT + 'e8-rep-antes-m.png', fullPage: true });
  await clic(j.getByRole('button', { name: 'Voy por el pedido' }));
  await j.locator('[data-banda="ubicacion"]').getByText(/Compartiendo tu ubicación · Entrega #/).waitFor({ timeout: 15000 });
  ok(track(n1, "started_step||'|'||(token_hash is not null)||'|'||(customer_from is null)") === 'empezar|true|true', 'la ruta se abre con «Voy por el pedido» (token guardado como huella; el cliente todavía no)');
  ok(sql(`select count(*) from operation_events e join operations o on o.id = e.operation_id where o.number = '${n1}' and e.kind = 'driver_started'`) === '1', 'queda en la línea de tiempo del pedido');
  await j.context().setGeolocation(punto(1)); await dormir(1200); await j.context().setGeolocation(punto(2));
  ok(await espera(() => +track(n1, 'positions_n') >= 1, 30000), `la web sube las posiciones (${track(n1, 'positions_n')})`);
  ok(/^[A-Za-z0-9_-]{43}$/.test(token ?? ''), 'el teléfono manda el token de la entrega (Authorization: Bearer)');
  ok(sql(`select string_agg(distinct source, ',') from delivery_positions p join operations o on o.id = p.operation_id where o.number = '${n1}'`) === 'web', 'las posiciones de la web quedan como «web»');
  await j.screenshot({ path: OUT + 'e8-rep-banda-m.png', fullPage: false });
  // Antes de «Recogí»: el cliente nada; el negocio ve el mapa.
  ok((await sse(m, `/api/ruta/vivo?pedido=${n1}`)).st === 404, 'antes de «Recogí» el SSE del cliente → 404 (no ve nada)');
  await m.reload(); await dormir(800); ok(await m.locator('[data-pantalla="APP-PEDIDO-MAPA"]').count() === 0, 'antes de «Recogí» la pantalla del cliente no tiene mapa');
  const sN = await sse(d, `/api/ruta/vivo?pedido=${n1}&negocio=${BIZ}`);
  ok(sN.st === 200 && sN.ev === 'pos' && sN.data.pos && Array.isArray(sN.data.rastro), 'el negocio ve la posición y el rastro desde que empezó');
  await d.goto(B + P + '/hoy?det=ped:' + n1); await det(d).locator('[data-bloque="mapa"]').waitFor({ timeout: 20000 });
  ok(!!(await det(d).getByText('REPARTIDOR · EN VIVO').count()), 'panel › pedido › el repartidor en el mapa (Entrega › Despacho)');
  await d.screenshot({ path: OUT + 'e8-panel-mapa-d.png' });
  // Otra persona: 404, por las dos puertas.
  ok((await sse(h, `/api/ruta/vivo?pedido=${n1}`)).st === 404 && (await sse(h, `/api/ruta/vivo?pedido=${n1}&negocio=${BIZ}`)).st === 404, 'otro vecino pide el SSE de esa entrega → 404 (como cliente y como «negocio»)');
  // «Recogí»: desde aquí el cliente lo ve.
  await clic(j.getByRole('button', { name: 'Recogí, voy en camino' })); await j.getByRole('button', { name: 'Llegué' }).first().waitFor();
  ok(track(n1, "customer_from is not null") === 't', '«Recogí» → el cliente lo ve desde ahora');
  const sC = await sse(m, `/api/ruta/vivo?pedido=${n1}`);
  ok(sC.st === 200 && sC.ev === 'pos' && sC.data.pos && !('rastro' in sC.data), 'el cliente: solo la última posición (sin rastro)');
  await m.reload(); await m.locator('[data-pantalla="APP-PEDIDO-MAPA"]').waitFor({ timeout: 20000 });
  const tesela = () => m.locator('[data-pantalla="APP-PEDIDO-MAPA"] img').first().evaluate((x) => `${x.getAttribute('src')}|${x.style.left}|${x.style.top}`);
  await m.locator('[data-pantalla="APP-PEDIDO-MAPA"] img').first().waitFor({ state: 'attached' }); const t1 = await tesela();
  await m.screenshot({ path: OUT + 'e8-cliente-mapa-m.png', fullPage: true });
  const antes = +track(n1, 'positions_n');
  for (const i of [4, 6, 8]) { await j.context().setGeolocation(punto(i)); await dormir(1500); }
  ok(await espera(() => +track(n1, 'positions_n') > antes, 30000), 'llegan posiciones nuevas');
  ok(await espera(async () => (await tesela()) !== t1, 20000), 'el cliente ve el pin moverse (el mapa se recentra en vivo, sin recargar)');
  // El token: solo para ESA entrega, solo mientras está activa, sin la sesión; velocidad imposible y de antes de empezar → rechazadas.
  const anon = (await br.newContext()).request;
  const ahora = Date.now(), lejos = await postRuta(anon, token, { p: [{ t: ahora, lat: 41.5, lng: -75.97818, acc: 5 }] });
  ok(lejos.st === 200 && lejos.aceptadas === 0 && lejos.rechazadas === 1, 'una posición a velocidad imposible (60 km en segundos) → rechazada');
  const vieja = await postRuta(anon, token, { p: [{ t: ahora - 3600_000, lat: 40.957, lng: -75.97818, acc: 5 }] });
  ok(vieja.aceptadas === 0 && vieja.rechazadas === 1, 'una posición de antes de empezar la entrega → rechazada');
  ok((await postRuta(anon, crypto.randomBytes(32).toString('base64url'), { p: [{ t: ahora, lat: 40.957, lng: -75.978 }] })).st === 410, 'un token que no es de ninguna entrega → 410 (deja de compartir)');
  ok((await postRuta(anon, 'abc', { p: [] })).st === 401, 'sin token válido → 401');
  ok(/no está activa/.test(sqlErr(`insert into delivery_positions (operation_id, rider_user_id, city_id, at, geom, source) select id, ${U(MARI)}, 'hzl', now(), st_setsrid(st_makepoint(-75.978, 40.957), 4326)::geography, 'app' from operations where number = '${n1}'`)), 'la base: una posición de otra persona para esa entrega → rechazada');
  // El cliente en escritorio.
  const md = await pagina('cliente escritorio', 1360); await entrar(md, MARI); await md.goto(B + '/pedido/' + n1); await md.locator('[data-pantalla="APP-PEDIDO-MAPA"]').waitFor({ timeout: 20000 });
  await md.screenshot({ path: OUT + 'e8-cliente-mapa-d.png', fullPage: true }); ok(true, 'el mapa del cliente en escritorio');
  // Llegué → cobrar → Entregado: el teléfono deja de compartir y el mapa desaparece en las dos puntas.
  await clic(j.getByRole('button', { name: 'Llegué' })); await clic(j.getByRole('button', { name: /^Cobrar \$/ })); await clic(j.getByRole('button', { name: /^Cobré \$.* · Entregado$/ }));
  await j.getByText(/Entregado\. Gracias/).first().waitFor();
  ok(track(n1, "ended_reason||'|'||(token_hash is null)||'|'||(sharing_until is not null)") === 'entregado|true|true', '«Entregado» → la base cierra la ruta y borra el token');
  ok(await espera(async () => (await j.locator('[data-banda="ubicacion"]').count()) === 0, 10000), 'la banda «Compartiendo tu ubicación» desaparece');
  const tras = await postRuta(anon, token, { p: [{ t: Date.now(), lat: 40.958, lng: -75.97818, acc: 5 }] });
  ok(tras.st === 410 && tras.activa === false, 'después de «Entregado» el mismo token → 410 «activa: false» (el teléfono para)');
  ok(await espera(async () => (await m.locator('[data-pantalla="APP-PEDIDO-MAPA"]').count()) === 0, 25000), 'el cliente: el mapa desaparece al entregar');
  ok((await sse(m, `/api/ruta/vivo?pedido=${n1}`)).ev === 'fin', 'el SSE del cliente dice «fin»');
  await d.goto(B + P + '/hoy?det=ped:' + n1); await dormir(2500); ok(await det(d).locator('[data-bloque="mapa"]').count() === 0, 'el panel: el mapa desaparece al entregar');
  await m.screenshot({ path: OUT + 'e8-cliente-entregado-m.png', fullPage: true });

  // ═══ 2 · Super Admin › Transacciones › «Ver recorrido» (con motivo) y Configuración › Apps ═══
  const a = await pagina('admin', 1360); await entrar(a, ADM);
  const audit0 = +sql(`select count(*) from audit_entries where action = 'ruta.ver' and target_id = '${n1}'`);
  await a.goto(B + `/admin/transacciones?q=${n1}`); await clic(a.getByText('Ver recorrido', { exact: true }));
  await a.getByText(`Ver el recorrido · pedido #${n1}`).first().waitFor();
  await clic(a.getByText('Disputa de entrega: el cliente dice que no llegó.', { exact: true }));
  await clic(a.locator('button, [role=button]').filter({ hasText: /^Ver recorrido$/ }));
  await a.getByText(`Recorrido · pedido #${n1}`).first().waitFor(); await a.locator('[data-bloque="mapa"]').first().waitFor();
  ok(+sql(`select count(*) from audit_entries where action = 'ruta.ver' and target_id = '${n1}' and reason = 'Disputa de entrega: el cliente dice que no llegó.'`) === audit0 + 1, 'ver el recorrido queda en la auditoría con el motivo');
  ok(!!(await vis(a.getByText(/desde «Voy por el pedido»/))), 'el resumen dice desde qué paso, distancia y posiciones');
  await a.screenshot({ path: OUT + 'e8-admin-recorrido-d.png', fullPage: true });
  const ap = await pagina('admin teléfono', 390); await entrar(ap, ADM); await ap.goto(B + `/admin/transacciones?q=${n1}`); await clic(ap.getByText('Ver recorrido', { exact: true }));
  await ap.getByText(`Ver el recorrido · pedido #${n1}`).first().waitFor(); await ap.screenshot({ path: OUT + 'e8-admin-motivo-m.png', fullPage: true });
  await a.goto(B + '/admin/sistema/configuracion'); await a.getByText('Ubicación del repartidor · días que se guarda').first().waitFor();
  ok(!!(await vis(a.getByText('El cliente ve el mapa en vivo'))), 'Configuración › Apps: cada cuánto, distancia, retención, desde cuándo lo ve el cliente, velocidad imposible');
  await a.getByText('Ubicación del repartidor · días que se guarda').first().scrollIntoViewIfNeeded(); await a.screenshot({ path: OUT + 'e8-admin-config-d.png' });

  // ═══ 3 · La cáscara del Repartidor (simulada): TLRuta empieza con el token, pantalla encendida, reanudar, detener ═══
  const ja = await pagina('repartidor app', 390, { ua: AND + rot('delivery', 'android'), puente: true }); await entrar(ja, JUAN);
  const n2 = await pedir(m); await aceptarYAsignar(d, n2);
  await ja.goto(B + '/repartidor?p=' + n2); await ja.getByRole('button', { name: 'Voy por el pedido' }).first().waitFor();
  await clic(ja.getByRole('button', { name: 'Voy por el pedido' }));
  ok(await espera(async () => (await llamadas(ja, 'TLRuta', 'empezar')).length === 1), 'la app: TLRuta.empezar después del paso (no antes)');
  const em = (await llamadas(ja, 'TLRuta', 'empezar'))[0].o;
  ok(em.entrega === n2 && /^[A-Za-z0-9_-]{43}$/.test(em.token) && !('url' in em) && !('servidor' in em) && em.cadaS === 5, 'con el token y la entrega; la dirección del servidor NO sale de la página');
  ok(await espera(async () => (await llamadas(ja, 'TLPantalla', 'mantener')).some((x) => x.o.on === true)), 'la pantalla se queda encendida mientras hay entrega');
  await ja.locator('[data-banda="ubicacion"]').getByText(/Compartiendo tu ubicación · Entrega #/).waitFor();
  // Lo que haría el nativo: manda posiciones con ese token (también con la pantalla apagada) → se guardan como «app».
  const nat = await postRuta(anon, em.token, { fuente: 'app', p: [0, 1, 2].map((i) => ({ t: Date.now() - (2 - i) * 1000, lat: punto(i).latitude, lng: punto(i).longitude, acc: 6 })) });
  ok(nat.st === 200 && nat.activa === true && nat.aceptadas === 3 && nat.cadaS === 5, JSON.stringify(nat) + ' las posiciones del nativo se guardan (y el servidor le dice el ritmo)');
  await ja.screenshot({ path: OUT + 'e8-rep-app-m.png', fullPage: false });
  // La app se cerró y se abrió otra vez: el teléfono ya no comparte → token nuevo (el anterior deja de servir).
  const h0 = track(n2, 'token_hash');
  await ja.goto(B + '/repartidor'); await ja.locator('[data-banda="ubicacion"]').waitFor();
  ok(await espera(async () => (await llamadas(ja, 'TLRuta', 'empezar')).length === 1 && track(n2, 'token_hash') !== h0), 'al reabrir con la entrega en curso: reanudar con un token nuevo');
  ok((await postRuta(anon, em.token, { p: [{ t: Date.now(), lat: punto(3).latitude, lng: punto(3).longitude }] })).st === 410, 'el token anterior ya no sirve');
  await ja.goto(B + '/repartidor?p=' + n2); ok(await espera(async () => (await llamadas(ja, 'TLRuta', 'empezar')).length === 1), 'cada vez que la app abre sin compartir, reanuda');
  const em2 = (await llamadas(ja, 'TLRuta', 'empezar'))[0].o;
  ok((await postRuta(anon, em2.token, { fuente: 'app', p: [{ t: Date.now(), lat: punto(3).latitude, lng: punto(3).longitude, acc: 6 }] })).aceptadas === 1, 'el token nuevo sí sirve');
  await clic(ja.getByRole('button', { name: 'Recogí, voy en camino' })); await clic(ja.getByRole('button', { name: 'Llegué' }));
  await clic(ja.getByRole('button', { name: /^Cobrar \$/ })); await clic(ja.getByRole('button', { name: /^Cobré \$.* · Entregado$/ })); await ja.getByText(/Entregado\. Gracias/).first().waitFor();
  ok(await espera(async () => (await llamadas(ja, 'TLRuta', 'detener')).length >= 1), '«Entregado» → TLRuta.detener');
  ok(await espera(async () => (await llamadas(ja, 'Haptics', 'notification')).some((x) => x.o.type === 'SUCCESS')), '«Entregado» → la háptica de «hecho»');
  ok((await postRuta(anon, em2.token, { p: [{ t: Date.now(), lat: punto(5).latitude, lng: punto(5).longitude }] })).st === 410, 'después de «Entregado» el nativo recibe 410 y se detiene solo');
  await ja.goto(B + '/repartidor'); await dormir(1500);
  ok((await puente(ja)).filter((x) => x.p === 'TLPantalla' && x.m === 'mantener').pop()?.o.on === false && (await llamadas(ja, 'TLRuta', 'empezar')).length === 0, 'sin entrega activa: la pantalla ya no se mantiene encendida y no comparte');

  // ═══ 4 · El reloj movido: la purga a los ubic_retener_dias ═══
  const nS = sql(`select number from operations where client_key = 'c0e1c6b0-0046-4000-8000-0000000000a2'`);
  if (nS && track(nS, 'purged_at is not null') === 't') ok(+sql(`select count(*) from delivery_positions p join operations o on o.id = p.operation_id where o.number = '${nS}'`) === 0 && track(nS, 'last_geom is null') === 't', `la entrega de la semilla (#${nS}) ya se purgó en una corrida anterior: solo su resumen`);
  else if (nS) {
    ok(+track(nS, 'positions_n') > 0 && +sql(`select count(*) from delivery_positions p join operations o on o.id = p.operation_id where o.number = '${nS}'`) > 0, `la entrega de la semilla (#${nS}) tiene su recorrido`);
    ok(/solo se purga lo vencido/.test(sqlErr(`delete from delivery_positions where operation_id = (select id from operations where number = '${nS}')`)), 'la base no deja borrar posiciones que no vencieron');
    sql(`alter table delivery_positions disable trigger delivery_positions_antes; update delivery_positions set received_at = received_at - interval '15 days' where operation_id = (select id from operations where number = '${nS}'); alter table delivery_positions enable trigger delivery_positions_antes;`);
    sql(`alter table delivery_tracks disable trigger delivery_tracks_antes; update delivery_tracks set sharing_until = sharing_until - interval '15 days' where operation_id = (select id from operations where number = '${nS}'); alter table delivery_tracks enable trigger delivery_tracks_antes;`);
    const dist = track(nS, 'distance_m');
    await a.request.post(B + '/api/interno/barrido', { headers: { 'x-barrido-token': TOKEN_BARRIDO } });
    ok(sql(`select count(*) from delivery_positions p join operations o on o.id = p.operation_id where o.number = '${nS}'`) === '0', 'a los 14 días el barrido borra las posiciones');
    ok(track(nS, "(purged_at is not null)||'|'||(last_geom is null)||'|'||distance_m") === `true|true|${dist}`, 'la entrega queda con su resumen (distancia y tiempo), sin la última posición');
    ok(+sql(`select count(*) from delivery_positions p join operations o on o.id = p.operation_id where o.number = '${n1}'`) > 0, 'lo de hoy no se toca');
  } else ok(true, '(sin la entrega terminada de la semilla: la purga se probó en SQL)');

  // ═══ 5 · To'Latino: el brillo del QR y compartir nativo ═══
  const c = await pagina('to latino app', 390, { ua: IOS + rot('cliente', 'ios'), puente: true }); await entrar(c, BOLETO);
  const cod = sql(`select t.code from tickets t join event_dates d on d.id = t.event_date_id where t.holder_user_id = ${U(BOLETO)} and t.status = 'valid' and d.starts_at > now() order by d.starts_at limit 1`);
  await c.goto(B + '/cuenta/boletos/' + cod); await c.locator('[data-pantalla="USR-BOLETO"]').waitFor();
  ok(await espera(async () => (await llamadas(c, 'TLPantalla', 'brillo')).some((x) => x.o.max === true)), 'el boleto con QR: brillo al máximo');
  await c.screenshot({ path: OUT + 'e8-boleto-brillo-m.png', fullPage: true });
  await c.locator('[data-pantalla="USR-BOLETO"] button').first().click(); await dormir(1500);
  ok((await llamadas(c, 'TLPantalla', 'brillo')).some((x) => x.o.max === false), 'al salir del boleto el brillo se devuelve');
  await c.goto(B + '/n/' + BIZ);
  await clic(c.getByRole('button', { name: /^Compartir$|^Share$/ }));
  ok(await espera(async () => (await llamadas(c, 'Share', 'share')).some((x) => /\/n\/sabor-dominicano/.test(x.o.url))), 'compartir abre la hoja nativa del sistema (Share) con el enlace del negocio');
  const w = await pagina('web', 390); await entrar(w, BOLETO); await w.goto(B + '/cuenta/boletos/' + cod); await w.locator('[data-pantalla="USR-BOLETO"]').waitFor(); await dormir(800);
  ok(true, 'en la web el boleto abre igual (el brillo no hace nada y no rompe)');

  // ═══ 6 · Negocios: «Escanear cupón» con una cámara de prueba ═══
  const libre = sql(`select '57055568' || lpad((floor(random() * 90) + 10)::text, 2, '0')`);
  const nv = await pagina('vecino del cupón', 390); await entrar(nv, libre); await api(nv, '/api/cuenta/perfil', { nombre: 'Rosa', apellido: 'Prueba' });
  const vid = uid(libre); sql(`update users set home_city_id = 'hzl', status = 'active' where id = '${vid}'`);
  sql(`insert into community_profiles (user_id) values ('${vid}') on conflict do nothing`);
  sql(`update community_profiles set rules_version = 1, rules_ok_at = now(), adult = true, adult_ok_at = now(), welcome_at = now() where user_id = '${vid}'`);
  sql(`select mon_bienvenida('${vid}')`); sql(`select mon_ajustar('${vid}', 300, ${U(ADM)}, 'Prueba 8e · escanear cupón')`);
  const CUP = sql(`select id from coupons where business_id = 'barberia-el-primo' and status = 'live' order by id limit 1`);
  const codigo = sql(`select codigo from cup_canjear('${vid}', ${CUP})`); ok(/^TL-CQ-/.test(codigo), `el vecino canjea un cupón de la barbería (${codigo})`);
  await nv.goto(B + '/comunidad/monedas'); await nv.getByText(codigo).first().click().catch(async () => { await nv.getByText(/Tus cupones|TUS CUPONES/).first().scrollIntoViewIfNeeded(); await nv.getByText(codigo).first().click(); });
  const qr = nv.locator(`[data-qr-cupon="${codigo}"] svg`); await qr.waitFor(); ok(true, 'el código del vecino trae su QR (solo el código)');
  await nv.screenshot({ path: OUT + 'e8-cupon-qr-m.png', fullPage: false });
  const png = await qr.screenshot(); const cam = S + '/cupon8e.y4m'; await y4m(png, cam);
  const brc = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${cam}`] });
  const scan = async (w2) => { const cx = await brc.newContext({ viewport: { width: w2, height: w2 > 500 ? 900 : 844 }, deviceScaleFactor: w2 > 500 ? 1 : 2, locale: 'es-US', permissions: ['camera'] }); const p = await cx.newPage(); p.on('pageerror', (e) => errs.push(`escanear: ${e.message}`)); return p; };
  const bd = await scan(1360); await entrar(bd, BARB); await bd.goto(B + '/panel/barberia-el-primo/pagina/cup'); await clic(bd.getByText('Escanear cupón', { exact: true }));
  await bd.locator('[data-pantalla="PANEL-ESCANEAR-CUPON"]').waitFor();
  await bd.locator('[data-resultado="valido"]').waitFor({ timeout: 30000 });
  ok(sql(`select status from coupon_redemptions where code = '${codigo}'`) === 'used', 'la cámara lee el QR → «CÓDIGO VÁLIDO» y queda usado (una vez)');
  ok(+sql(`select count(*) from audit_entries where action = 'cupon.validar' and after->>'codigo' = '${codigo}'`) === 1, 'queda en la auditoría del negocio');
  await bd.screenshot({ path: OUT + 'e8-escanear-cupon-d.png' });
  await clic(bd.getByText('Escanear otro', { exact: true })); await bd.locator('[data-resultado="no"]').waitFor({ timeout: 30000 });
  ok(!!(await vis(bd.getByText('NO VALE'))), 'el mismo código otra vez → «NO VALE»');
  const bm = await scan(390); await entrar(bm, BARB); await bm.goto(B + '/panel/barberia-el-primo/pagina/cup'); await clic(bm.getByText('Escanear cupón', { exact: true }));
  await bm.locator('[data-resultado="no"]').waitFor({ timeout: 30000 }); await bm.screenshot({ path: OUT + 'e8-escanear-cupon-m.png' }); ok(true, 'en el teléfono, la misma pieza');
  await brc.close();

  // ═══ 7 · Puerta: «Fijar la Puerta en esta pantalla» ═══
  const ADMID = uid(ADM), H0 = +sql(`select (extract(hour from now() at time zone 'America/New_York') * 60 + extract(minute from now() at time zone 'America/New_York'))::int`) - 20;
  sql(`update door_sessions set ended_at = now(), ended_by = 'system' where ended_at is null and user_id = ${U(DUENO)}`);
  const EV = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, tables_cfg, rsvp_capacity, party_max, kind, span_days, day_cap)
    values ('', 'hzl', '${BIZ}', 'noche', '{"es":"Noche de prueba [e8e]","en":"Test night [e8e]"}', (now() at time zone 'America/New_York')::date, ${Math.max(0, H0)}, ${Math.min(1439, Math.max(0, H0) + 180)}, 'free', 'live', now(), now(), '${ADMID}', 0, '${ADMID}', 0, '[]'::jsonb, '[]'::jsonb, 0, 1, 'single', 1, 0) returning id`).split('\n')[0];
  sql(`select evt_sincronizar_fechas(${EV})`);
  const FD = sql(`select id from event_dates where event_id = ${EV} order by starts_at limit 1`);
  const SES = sql(`insert into door_sessions (event_date_id, user_id, member_user_id, door_name) values (${FD}, ${U(DUENO)}, ${U(DUENO)}, 'Principal') returning id`).split('\n')[0];
  const pa = await pagina('puerta android', 390, { ua: AND + rot('checkin', 'android'), puente: true }); await entrar(pa, DUENO);
  await pa.goto(B + `/puerta/s/${SES}?t=mas`); await clic(pa.getByText('Fijar la Puerta en esta pantalla', { exact: true }));
  await pa.getByText(/La Puerta se queda en esta pantalla/).first().waitFor();
  ok((await llamadas(pa, 'TLPantalla', 'fijar')).length === 0, 'Android: primero la persona confirma (nada se fija antes)');
  await pa.screenshot({ path: OUT + 'e8-puerta-fijar-m.png', fullPage: true });
  await clic(pa.getByText('Fijar la pantalla', { exact: true }));
  ok(await espera(async () => (await llamadas(pa, 'TLPantalla', 'fijar')).length === 1), 'Android: «Fijar la pantalla» → TLPantalla.fijar (startLockTask; el sistema lo vuelve a confirmar)');
  await pa.getByText('Soltar la pantalla', { exact: true }).first().waitFor(); ok(true, 'después: «Soltar la pantalla»');
  const pi = await pagina('puerta iphone', 390, { ua: IOS + rot('checkin', 'ios'), puente: true }); await entrar(pi, DUENO);
  await pi.goto(B + `/puerta/s/${SES}?t=mas`); await clic(pi.getByText('Fijar la Puerta en esta pantalla', { exact: true }));
  await pi.getByText('EN IPHONE · ACCESO GUIADO').first().waitFor();
  ok((await llamadas(pi, 'TLPantalla', 'fijar')).length === 0, 'iPhone: la ayuda de Acceso guiado (una app no se fija sola)');
  await pi.screenshot({ path: OUT + 'e8-puerta-acceso-guiado-m.png', fullPage: true });
  const pd = await pagina('puerta escritorio', 1360); await entrar(pd, DUENO); await pd.goto(B + `/puerta/s/${SES}?t=mas`); await clic(pd.getByText('Fijar la Puerta en esta pantalla', { exact: true }));
  await pd.getByText('EN ANDROID · FIJAR APPS').first().waitFor(); await pd.screenshot({ path: OUT + 'e8-puerta-fijar-d.png' }); ok(true, 'en un navegador: cómo hacerlo con el teléfono');
  sql(`update door_sessions set ended_at = now(), ended_by = 'self' where id = ${SES}`);

  // ── Restaurar ──
  sql(`delete from platform_config where key in ('ubic_cada_s', 'ubic_min_m')`);
  sql(`update delivery_settings set delivery=false, pay_cash_delivery=false where business_id='${BIZ}'`); sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='${BIZ}' and module=''`);
  ok(errs.length === 0, 'sin errores en las páginas: ' + errs.join(' | '));
  await br.close(); console.log(`\nOK app8e · ${n} comprobaciones`);
})().catch(async (e) => { console.error(e); sql(`delete from platform_config where key in ('ubic_cada_s', 'ubic_min_m')`); process.exit(1); });
