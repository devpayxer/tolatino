// 8f · Programa beta, «Reportar un problema», errores y cierres propios, Super Admin › Sistema › Apps completo — de punta a punta (Playwright,
// teléfono 390 y escritorio 1360) contra el servidor de :3100 (servir8f.sh / reiniciar8f.sh: ASC_API_URL → el simulador de App Store Connect).
// Errores: tapado (teléfono, correo, tarjeta, URL con id y «?», valor entre comillas), un error real del navegador, simbolización con los mapas
// del servidor (y los .map NO se sirven), 1 000 iguales → un grupo, límites (por teléfono, tamaño, origen, tipo nativo sin app), un cierre nativo
// de la vez anterior (puente simulado) → aparece al abrir otra vez, «Errores en vivo» (nuevo, pico, regresión; una vez), la purga por retención.
// Reportar: web con captura de un archivo (nada sale antes de «Enviar»), la app agitando (captura de la pantalla), caso TK- tema técnico origen
// reporte_app con foto privada y registro, otra cuenta → no existe / 404, el equipo ve el registro en Soporte. Beta: TestFlight interno por la API
// (simulador que valida contra la especificación), APK propio con enlace de un uso (ver no gasta; otra cuenta 404; bajar una vez; sha256), Play
// interno pendiente en la consola, quitar con motivo; Salud (ficha, resolver, silenciar), Versiones, Reportes; Soporte (rol) no ve testers.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'); const crypto = require('crypto'); const path = require('path');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100', REPO = ENT.RAIZ, TOKEN_BARRIDO = ENT.TOK;
const SIM = require(REPO + '/scripts/tiendas-sim/sim.cjs');
const APPS = JSON.parse(fs.readFileSync(REPO + '/apps/mobile/apps.json', 'utf8')).apps;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); const r = await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); if (!r.ok) throw new Error('no entró ' + tel); };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });
const ADM = '5705550199', DAYANA = '5705550677', MARI = '5705550122', YARI = '5705550299', DUENO = '5705550133', JUAN = '5705550144', KARLA = '5705550512', BIZ = 'sabor-dominicano';
const U = (tel) => `(select id from users where phone = '+1${tel}')`;
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const rot = (app, plat, build) => ` TLApp/${app}/${plat}/1.0.0 (${build})`;
const barrido = async (p) => (await (await p.request.post(B + '/api/interno/barrido', { headers: { 'x-barrido-token': TOKEN_BARRIDO } })).json());
// Una imagen JPEG real (Chromium la dibuja) en base64: lo que devolvería TLReporte.ultimaCaptura() de la cáscara.
let CAPTURA = '';
// El puente nativo simulado (como app8a / push8c) con TLReporte completo: anotar, leer, ultimaCaptura, agitar, cierres y el evento «agitado».
const PUENTE = (o) => `if (window === window.top) {
  window.__puente = []; window.__cbs = {};
  const M = (n, ms) => ({ name: n, methods: ms.map((x) => ({ name: x, rtype: x === 'addListener' ? 'callback' : 'promise' })) });
  if (/Android/.test(navigator.userAgent)) window.androidBridge = { postMessage: (m) => window.__puente.push(m) };
  else window.webkit = { messageHandlers: { bridge: { postMessage: (m) => window.__puente.push(m) } } };
  const reg = JSON.parse(sessionStorage.getItem('__reg') || '[]');
  window.Capacitor = { PluginHeaders: [M('TLReporte', ['anotar', 'leer', 'ultimaCaptura', 'agitar', 'cierres', 'addListener', 'removeListener']), M('TLPantalla', ['mantener', 'brillo', 'ajustes']), M('SplashScreen', ['hide']), M('App', ['addListener', 'exitApp']), M('AppLauncher', ['openUrl']), M('PushNotifications', ['checkPermissions', 'requestPermissions', 'register', 'addListener', 'removeAllListeners'])],
    nativePromise: (p, m, o2) => { window.__puente.push({ p, m, o: o2 });
      if (p === 'TLReporte') {
        if (m === 'anotar') { reg.push(o2.linea); sessionStorage.setItem('__reg', JSON.stringify(reg.slice(-200))); return Promise.resolve(); }
        if (m === 'leer') return Promise.resolve({ lineas: reg });
        if (m === 'ultimaCaptura') { const c = sessionStorage.getItem('__cap'); sessionStorage.removeItem('__cap'); return Promise.resolve(c ? { imagen: c } : {}); }
        if (m === 'cierres') { const c = localStorage.getItem('__cierres'); localStorage.removeItem('__cierres'); return Promise.resolve({ cierres: c ? JSON.parse(c) : [] }); }
        if (m === 'agitar') { window.__agitar = o2.on; return Promise.resolve(); }
      }
      if (p === 'PushNotifications' && m === 'checkPermissions') return Promise.resolve({ receive: 'denied' });
      return Promise.resolve({}); },
    nativeCallback: (p, m, o2, cb) => { window.__puente.push({ p, m, o: o2 }); if (m === 'addListener') (window.__cbs[p + ':' + o2.eventName] = window.__cbs[p + ':' + o2.eventName] || []).push(cb); return 'cb' + Math.random(); },
  };
  // Agitar (lo que haría la cáscara): toma la captura de la pantalla y dispara «agitado».
  window.__agitarAhora = (cap) => { sessionStorage.setItem('__cap', cap); (window.__cbs['TLReporte:agitado'] || []).forEach((f) => f({})); };
}`;

(async () => {
  const T0 = sql(`select now()::text`);
  // ── Preparar (solo esta base) ──
  sql(`update feature_flags set enabled = true where key in ('app.reportar', 'app.errores')`);
  sql(`delete from platform_config where key in ('errores_por_minuto', 'errores_por_dispositivo', 'errores_pico_n', 'beta_agitar', 'errores_retener_dias', 'reporte_logs_kb', 'apk_enlace_horas')`);
  sql(`set session_replication_role = replica; delete from store_secret_reads where secret_id in (select id from store_secrets where kind = 'asc_api_key'); delete from store_secrets where kind = 'asc_api_key'`);
  sql(`set session_replication_role = replica; delete from apk_links where tester_id in (select id from beta_testers where user_id in (${U(MARI)}, ${U(YARI)})); delete from beta_testers where user_id in (${U(MARI)}, ${U(YARI)})`);
  // Lo que dejó una corrida anterior de esta prueba (solo esta base; la base no deja borrar: replica).
  const PREV = `select id from app_error_groups where title like '%Prueba #f%' or title like '%Prueba 8f%' or title like 'Cierre de la app · java.lang.NullPointerException%'`;
  sql(`set session_replication_role = replica; delete from app_error_events where group_id in (${PREV}); delete from app_error_alerts where group_id in (${PREV}); delete from app_error_groups where id in (${PREV})`);
  sql(`update users set notif_prefs = notif_prefs || '{"quiet": false}'::jsonb where id in (${U(ADM)}, ${U(YARI)}, ${U(MARI)})`);
  // Los casos que esta prueba abre hoy no cuentan para el tope diario de casos de Marisol y Yaritza.
  sql(`set session_replication_role = replica; update support_cases set created_at = created_at - interval '2 days' where user_id in (${U(MARI)}, ${U(YARI)}, ${U(DUENO)}) and created_at > now() - interval '1 day'`);
  const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }), KID = 'ZX9Y8W7V6U', EMISOR = '57246542-96fe-1a63-e053-0824d011072a';
  const asc = await SIM.arrancar({ puerto: 4404, publica: kp.publicKey, emisor: EMISOR, kid: KID, apps: APPS.map((a, i) => ({ bundle: a.ios, id: 6400000001 + i })) });
  const br = await chromium.launch(), errs = [];
  const pagina = async (k, w, ua, o = {}) => {
    const cx = await br.newContext({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: w > 500 ? 1 : 2, userAgent: ua, locale: 'es-US', acceptDownloads: true });
    if (o.puente) await cx.addInitScript(PUENTE(o));
    const p = await cx.newPage(); p.on('pageerror', (e) => { if (!/Prueba 8f/.test(e.message)) errs.push(`${k}: ${e.message}`); }); return p;
  };
  const errorDirecto = (p, cuerpo, o = {}) => p.evaluate(async ([c, o]) => { const r = await fetch('/api/errores', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8', ...(o.h || {}) }, body: typeof c === 'string' ? c : JSON.stringify(c) }); return r.status; }, [cuerpo, o]);
  try {
    const pa = await pagina('admin', 1360); await entrar(pa, ADM);
    CAPTURA = await pa.evaluate(() => { const c = document.createElement('canvas'); c.width = 390; c.height = 700; const x = c.getContext('2d'); x.fillStyle = '#f4efe6'; x.fillRect(0, 0, 390, 700); x.fillStyle = '#0b0e12'; x.font = 'bold 28px sans-serif'; x.fillText('Mis boletos', 24, 80); x.fillStyle = '#d9d2c5'; x.fillRect(24, 120, 342, 200); return c.toDataURL('image/jpeg', 0.8).split(',')[1]; });

    console.log('1 · Errores: lo que llega se TAPA antes de guardarse (teléfono, correo, tarjeta, URL con id y «?», valor de un campo)');
    const w = await pagina('web', 390, IOS); await w.goto(B + '/ayuda');
    const st = await errorDirecto(w, { tipo: 'js', nombre: 'TypeError', mensaje: "Prueba 8f: no cargó el pedido 104233 de Marisol: llama al (570) 555-0122 o a marisol@example.com; tarjeta 4242 4242 4242 4242; valor 'Marisol Gómez'",
      stack: 'TypeError: x\n    at cargar (https://pruebas.tolatino.com/pedido/104233?token=abc123def&tel=5705550122:3:14)\n    at http://localhost:3100/_next/static/chunks/app/x-1234abcd5678ef90.js:1:2048', ruta: '/pedido/104233?tel=5705550122' }); // GUARDIAN-OK: datos de prueba que el reporte tiene que limpiar
    ok(st === 204, 'POST /api/errores → 204 (no dice qué guardó)');
    const ev = sql(`select message || '¦' || coalesce(stack, '') || '¦' || coalesce(route_family, '') from app_error_events where message like 'Prueba 8f: no cargó%' order by id desc limit 1`);
    ok(!!ev, 'quedó guardado');
    ok(!/5705550122|555-0122|marisol@example|4242 4242|104233|Marisol Gómez|token=|\?/.test(ev), `sin teléfono, correo, tarjeta, número de pedido, valor de campo ni «?» (${ev.slice(0, 160)}…)`); // GUARDIAN-OK: lo que NO puede quedar en el reporte
    ok(/\[tel\]/.test(ev) && /\[correo\]/.test(ev) && /\[tapado\]/.test(ev) && /\[url\]/.test(ev) && /'…'/.test(ev), 'quedan las marcas [tel], [correo], [tapado], [url] y \'…\'');
    ok(/\/_next\/static\/chunks\/app\/x-1234abcd5678ef90\.js:1:2048/.test(ev), 'de lo nuestro de /_next/static queda solo la ruta (sin dominio) para simbolizar');
    ok(ev.endsWith('¦/pedido/:n'), 'la ruta es su familia (/pedido/:n)');
    ok(sql(`select count(*) from information_schema.columns where table_name in ('app_error_events', 'app_error_groups') and column_name ~ '^(user_id|phone|email|operation_id|business_id|ip|user_agent|device_id|name|first_name)$'`) === '0', 'las tablas de errores no tienen columnas de personas');

    console.log('2 · Un error REAL del navegador llega solo (web), con la familia de la pantalla');
    await w.goto(B + '/soporte?caso=TK-99999999');
    await w.evaluate(() => setTimeout(() => { throw new Error('Prueba 8f: falló el render del 570-555-0199'); }, 10));
    ok(await espera(() => sql(`select count(*) from app_error_events e join app_error_groups g on g.id = e.group_id where g.title = 'Error: Prueba 8f: falló el render del [tel]' and e.route_family = '/soporte' and e.at > '${T0}'`) === '1'), 'el colector lo mandó: título tapado y normalizado, ruta /soporte (sin ?caso=)');
    ok(sql(`select app || '/' || platform || '/' || kind from app_error_groups where title = 'Error: Prueba 8f: falló el render del [tel]'`) === 'web/web/js', 'grupo web · web · js');

    console.log('3 · Simbolizado EN EL SERVIDOR con los mapas privados; los .map NO se sirven');
    const MAPAS = REPO + '/apps/web/.next/standalone/apps/web/.next/mapas/static/chunks';
    const chunk = fs.readdirSync(MAPAS).filter((f) => /^\d+-[0-9a-f]+\.js\.map$/.test(f)).map((f) => ({ f, s: fs.statSync(MAPAS + '/' + f).size })).sort((a, b) => b.s - a.s)[0].f.replace(/\.map$/, '');
    const mapa = JSON.parse(fs.readFileSync(`${MAPAS}/${chunk}.map`, 'utf8'));
    ok((await w.request.get(`${B}/_next/static/chunks/${chunk}`)).status() === 200, `el archivo ${chunk} se sirve`);
    ok((await w.request.get(`${B}/_next/static/chunks/${chunk}.map`)).status() === 404, 'su .map NO se sirve (404)');
    ok(fs.readdirSync(REPO + '/apps/web/.next/static/chunks').every((f) => !f.endsWith('.map')), 'ningún .map en .next/static');
    // Un decodificador aparte (no el del servidor) elige dos columnas con fuente en la línea 1 y dice qué archivo y línea deberían salir.
    const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; // GUARDIAN-OK: el alfabeto base64, no una llave
    const segs = (() => { let col = 0, src = 0, sl = 0, sc = 0; const out = []; for (const x of mapa.mappings.split(';')[0].split(',')) { const v = []; let val = 0, sh = 0; for (const ch of x) { const d = B64.indexOf(ch); val += (d & 31) << sh; if (d & 32) sh += 5; else { v.push(val & 1 ? -(val >>> 1) : val >>> 1); val = 0; sh = 0; } } col += v[0]; if (v.length >= 4) { src += v[1]; sl += v[2]; sc += v[3]; out.push({ col, src, sl, sc }); } } return out; })();
    const fuente = (x) => { let y = x.replace(/^webpack:\/\/[^/]*\//, '').replace(/^(\.\.?\/)+/, ''); const i = y.lastIndexOf('node_modules/'); return i >= 0 ? y.slice(i) : y; };
    const [s1, s2] = [segs[Math.floor(segs.length / 3)], segs[Math.floor(segs.length / 2)]];
    const st3 = await errorDirecto(w, { tipo: 'js', nombre: 'TypeError', mensaje: 'Prueba 8f simbolizar', stack: `TypeError: Prueba 8f simbolizar\n    at a (${B}/_next/static/chunks/${chunk}:1:${s1.col + 1})\n    at b (${B}/_next/static/chunks/${chunk}:1:${s2.col + 1})`, ruta: '/' });
    const sim = sql(`select symbolicated || '¦' || stack from app_error_events where message = 'Prueba 8f simbolizar' order by id desc limit 1`);
    ok(st3 === 204 && sim.startsWith('true¦'), 'simbolizado: sí');
    ok(sim.includes(`${fuente(mapa.sources[s1.src])}:${s1.sl + 1}:${s1.sc + 1}`) && sim.includes(`${fuente(mapa.sources[s2.src])}:${s2.sl + 1}:${s2.sc + 1}`) && !sim.includes('/_next/static/chunks/'),
      `el stack dice el archivo, la línea y la columna originales (${fuente(mapa.sources[s1.src])}:${s1.sl + 1})`);
    const tr = await errorDirecto(w, { tipo: 'js', mensaje: 'Prueba 8f ruta', stack: `    at x (${B}/_next/static/../../../../etc/passwd:1:1)\n    at y (/_next/static/chunks/../../server/app/page.js:1:1)`, ruta: '/' });
    ok(tr === 204 && sql(`select symbolicated from app_error_events where message = 'Prueba 8f ruta' order by id desc limit 1`) === 'f', 'una ruta con «..» no abre nada fuera de los mapas (sin simbolizar)');

    console.log('4 · 1 000 errores iguales (con otros números) → UN grupo; los topes por minuto se respetan');
    sql(`insert into platform_config (key, value, note) values ('errores_por_minuto', '5000', 'prueba 8f') on conflict (key) do update set value = excluded.value`);
    await dormir(16000); // la caché de Configuración (15 s)
    const mil = await w.evaluate(async () => { let ok = 0; const L = [];
      for (let i = 0; i < 1000; i++) L.push(fetch('/api/errores', { method: 'POST', headers: { 'content-type': 'text/plain', 'x-real-ip': `10.8.${Math.floor(i / 20)}.${i % 20}` }, credentials: 'omit',
        body: JSON.stringify({ tipo: 'js', nombre: 'RangeError', mensaje: `Prueba 8f mil: el pedido ${1000 + i} no cargó en ${i} ms`, stack: `RangeError: x\n    at cargarPedido (/_next/static/chunks/app/pedido-abcdef0123456789.js:1:${100 + i})`, ruta: `/pedido/${i}` }) }).then((r) => { if (r.status === 204) ok++; }));
      await Promise.all(L); return ok; });
    const g1000 = sql(`select count(*) || '|' || coalesce(max(count), 0) || '|' || coalesce(max(id), 0) from app_error_groups where title like 'RangeError: Prueba 8f mil%'`);
    ok(mil === 1000 && g1000.startsWith('1|1000|'), `1 000 aceptados → un grupo con 1 000 (${g1000})`);
    const G1000 = g1000.split('|')[2];
    sql(`delete from platform_config where key = 'errores_por_minuto'`);
    // Un minuto nuevo (la ventana del tope) y la caché de Configuración vencida; un teléfono nuevo (cookie tl_dev propia).
    await dormir(16000); await dormir(61000 - (Date.now() % 60000)); 
    const wt = await pagina('tope', 390, IOS); await wt.goto(B + '/ayuda');
    const tope = await wt.evaluate(async () => { const r = []; for (let i = 0; i < 40; i++) r.push((await fetch('/api/errores', { method: 'POST', headers: { 'x-real-ip': '10.99.0.1' }, body: JSON.stringify({ tipo: 'js', mensaje: 'Prueba 8f tope ' + i, stack: '', ruta: '/' }) })).status); return r; });
    ok(tope.filter((x) => x === 204).length === 30 && tope.filter((x) => x === 429).length === 10, 'un mismo teléfono: 30 por minuto (errores_por_dispositivo), el resto 429 y no toca la base');
    ok(sql(`select count(*) from app_error_events where message like 'Prueba 8f tope %'`) === '30', 'en la base: solo los 30');
    ok(await errorDirecto(w, 'x'.repeat(40 * 1024)) === 413, 'un cuerpo de 40 KB → 413 (antes de leerlo entero)');
    const lento = await w.evaluate(async () => { const t = performance.now(); const r = await fetch('/api/errores', { method: 'POST', headers: { 'x-real-ip': '10.98.0.1' }, body: JSON.stringify({ tipo: 'js', mensaje: 'a'.repeat(1900), stack: ('    at ' + 'b'.repeat(490) + ' (x:1:1)\n').repeat(30) + 'c'.repeat(800), ruta: '/' }) }); return r.status === 204 ? performance.now() - t : 1e9; });
    ok(lento < 400, `16 KB hechos para ser lentos (texto sin espacios, cuadros largos) se tapan en ${Math.round(lento)} ms (sin expresiones cuadráticas)`);
    ok((await w.request.post(B + '/api/errores', { headers: { origin: 'https://otro-sitio.example', 'content-type': 'text/plain' }, data: JSON.stringify({ tipo: 'js', mensaje: 'Prueba 8f ajeno' }) })).status() === 403, 'desde otro origen → 403');
    ok(await errorDirecto(w, { tipo: 'cierre', mensaje: 'Prueba 8f cierre web', stack: '' }) === 400, 'un «cierre» sin ser una app → 400');
    ok(await errorDirecto(w, { tipo: 'otro', mensaje: 'x' }) === 400 && await errorDirecto(w, '{no es json') === 400, 'tipo desconocido o JSON roto → 400');

    console.log('5 · Cierre nativo de la vez anterior (puente simulado) → aparece al abrir otra vez');
    const ap = await pagina('app', 390, AND + rot('cliente', 'android', 7), { puente: true }); await entrar(ap, MARI);
    await ap.evaluate(() => localStorage.setItem('__cierres', JSON.stringify([{ tipo: 'cierre', titulo: 'Cierre de la app · java.lang.NullPointerException', pila: 'java.lang.NullPointerException: Prueba 8f tel 570-555-0122\n\tat com.tolatino.plugins.TLLocalPlugin.leer(TLLocalPlugin.java:88)\n\tat com.getcapacitor.Bridge.callPluginMethod(Bridge.java:812)' }])));
    await ap.goto(B + '/');
    ok(await espera(() => sql(`select count(*) from app_error_groups where kind = 'cierre' and app = 'cliente' and platform = 'android' and title like 'Cierre de la app · java.lang.NullPointerException%' and last_seen > '${T0}'`) === '1'), 'el cierre llegó: grupo cliente · android · cierre');
    ok(sql(`select release || '|' || coalesce(app_version, '') || '|' || os_version || '|' || device_model || '|' || (stack like '%[tel]%' and stack not like '%0122%') from app_error_events e join app_error_groups g on g.id = e.group_id where g.title like 'Cierre de la app · java.lang.NullPointerException%' order by e.id desc limit 1`) === '7|1.0.0|Android 14|Pixel 6a|true', 'build 7, Android 14, Pixel 6a (del user-agent) y la pila tapada');
    ok(await ap.evaluate(() => localStorage.getItem('__cierres') === null), 'el nativo los entrega una vez');

    console.log('6 · Errores en vivo: grupo nuevo y pico → aviso a los Admins, UNA vez; silenciado no avisa');
    const nAlertas0 = Number(sql(`select count(*) from notifications where user_id = ${U(ADM)} and tpl = 'err_vivo'`));
    const rb = await barrido(pa);
    ok(rb.ok && sql(`select last_error is null from system_jobs where name = 'barrido.errores'`) === 't', 'el barrido corre «errores» sin error');
    ok(sql(`select string_agg(kind, ',' order by kind) from app_error_alerts where group_id = ${G1000}`) === 'nuevo,pico', 'el grupo de los 1 000: alerta «nuevo» y «pico» (≥ errores_pico_n en 10 min y 5× la hora anterior)');
    const nAlertas1 = Number(sql(`select count(*) from notifications where user_id = ${U(ADM)} and tpl = 'err_vivo'`));
    ok(nAlertas1 > nAlertas0, `Ana (Admin) recibió «Errores en vivo» (${nAlertas1 - nAlertas0})`);
    ok(sql(`select sms_status from notifications where user_id = ${U(ADM)} and tpl = 'err_vivo' order by id desc limit 1`) === 'no' && /\/admin\/sistema\/apps\?v=salud&g=\d+/.test(sql(`select href from notifications where user_id = ${U(ADM)} and tpl = 'err_vivo' order by id desc limit 1`)), 'sin SMS; abre la ficha del grupo');
    for (let i = 0; i < 6; i++) await barrido(pa);   // hasta 10 alertas por pasada: las que quedaban salen en las siguientes
    ok(sql(`select count(*) from notifications where user_id = ${U(ADM)} and tpl = 'err_vivo' and ref_kind = 'error' and ref_id like '${G1000}:%'`) === '2', 'seis barridos más: el grupo de los 1 000 avisó dos veces en total (nuevo y pico), no más');
    const nA = sql(`select count(*) from notifications where user_id = ${U(ADM)} and tpl = 'err_vivo'`); await barrido(pa);
    ok(sql(`select count(*) from notifications where user_id = ${U(ADM)} and tpl = 'err_vivo'`) === nA, 'sin grupos nuevos, otro barrido no avisa nada');

    console.log('7 · Super Admin › Sistema › Apps › Salud: lista, ficha simbolizada, resolver en un build, regresión y silenciar');
    await pa.goto(B + '/admin/sistema/apps?v=salud'); await pa.getByText('SESIONES SIN CIERRE · 7 DÍAS (APROXIMADO)').waitFor();
    let t7 = await texto(pa);
    ok(/GRUPOS ABIERTOS/.test(t7) && /RangeError: Prueba 8f mil/.test(t7) && /1000 veces/.test(t7), 'lista: KPIs y el grupo de los 1 000 («1000 veces»)');
    ok(!/5705550|marisol@|4242 4242/.test(t7), 'la lista no muestra teléfonos, correos ni tarjetas');
    await pa.screenshot({ path: OUT + 'b8f-salud-1360.png', fullPage: true });
    await pa.getByText(/RangeError: Prueba 8f mil/).first().click(); await pa.getByText('POR BUILD').waitFor();
    t7 = await texto(pa);
    ok(/STACK/.test(t7) && /cargarPedido/.test(t7) && /\/pedido\/:n/.test(t7) && /ERRORES EN VIVO · AVISOS AL EQUIPO/.test(t7), 'ficha: stack, por pantalla (/pedido/:n) y los avisos');
    await pa.screenshot({ path: OUT + 'b8f-ficha-1360.png', fullPage: true });
    // Resolver el cierre de la app en el build 7 → vuelve en el build 8 → se reabre solo y avisa «regresion».
    const GC = sql(`select id from app_error_groups where title like 'Cierre de la app · java.lang.NullPointerException%'`);
    await pa.goto(B + `/admin/sistema/apps?v=salud&g=${GC}`); await boton(pa, 'Resuelto en…').click();
    await pa.getByLabel('BUILD O COMMIT').fill('7'); await pa.getByText('Arreglado en este build').click(); await boton(pa, 'Guardar').click();
    ok(await espera(() => sql(`select status || '|' || resolved_in_build from app_error_groups where id = ${GC}`) === 'resuelto|7'), 'Resuelto en el build 7 (con motivo)');
    ok(sql(`select count(*) from audit_entries where action = 'errores.resuelto' and target_id = '${GC}' and reason = 'Arreglado en este build'`) === '1', 'queda en la auditoría con su motivo');
    const ap8 = await pagina('app8', 390, AND + rot('cliente', 'android', 8), { puente: true }); await ap8.goto(B + '/ayuda');
    await ap8.evaluate(() => localStorage.setItem('__cierres', JSON.stringify([{ tipo: 'cierre', titulo: 'Cierre de la app · java.lang.NullPointerException', pila: 'java.lang.NullPointerException: Prueba 8f tel 570-555-0122\n\tat com.tolatino.plugins.TLLocalPlugin.leer(TLLocalPlugin.java:88)\n\tat com.getcapacitor.Bridge.callPluginMethod(Bridge.java:812)' }])));
    await ap8.goto(B + '/ayuda');
    ok(await espera(() => sql(`select status || '|' || (regressed_at is not null) from app_error_groups where id = ${GC}`) === 'nuevo|true'), 'vuelve en el build 8 → «nuevo» otra vez (regresión)');
    await barrido(pa);
    ok(sql(`select count(*) from app_error_alerts where group_id = ${GC} and kind = 'regresion' and release = '8'`) === '1', '«Errores en vivo»: alerta de regresión en el build 8');
    // Silenciar el de la web.
    const GW = sql(`select id from app_error_groups where title = 'Error: Prueba 8f: falló el render del [tel]'`);
    await pa.goto(B + `/admin/sistema/apps?v=salud&g=${GW}`); await boton(pa, 'Silenciar').click(); await pa.getByText('Ya se sabe y no afecta').click(); await boton(pa, 'Silenciar').last().click();
    ok(await espera(() => sql(`select status from app_error_groups where id = ${GW}`) === 'silenciado'), 'Silenciar con motivo');
    try { sql(`update app_error_groups set count = count + 5 where id = ${GW}`); ok(false, 'cifras editables'); } catch (e) { ok(/derivadas/.test(String(e.stderr)), 'las cifras de un grupo no se editan a mano (la base lo impide)'); }
    await pa.setViewportSize({ width: 390, height: 844 }); await pa.goto(B + '/admin/sistema/apps?v=salud'); await pa.getByText('SESIONES SIN CIERRE · 7 DÍAS (APROXIMADO)').waitFor();
    await pa.screenshot({ path: OUT + 'b8f-salud-390.png', fullPage: true }); await pa.setViewportSize({ width: 1360, height: 900 });

    console.log('8 · Reportar un problema (web, Marisol, 390): nada sale del teléfono hasta «Enviar»');
    const wm = await pagina('reportar', 390, IOS); await entrar(wm, MARI);
    await wm.goto(B + '/soporte'); await boton(wm, 'Reportar un problema de la app').click(); await wm.waitForURL(/\/soporte\/reportar$/);
    await wm.getByText('Se envía también: el modelo del teléfono, la versión de la app y las últimas pantallas, sin lo que escribiste.').waitFor();
    const posts = []; wm.on('request', (r) => { if (r.method() === 'POST' && !r.url().includes('/api/errores')) posts.push({ u: r.url(), b: r.postData() ?? '' }); });
    const [fc] = await Promise.all([wm.waitForEvent('filechooser'), wm.getByText('Agregar una captura').click()]);
    const png = Buffer.from(CAPTURA, 'base64'); fs.writeFileSync(S + '/captura8f.jpg', png);
    await fc.setFiles(S + '/captura8f.jpg');
    await wm.getByText('Ver grande').waitFor();
    await wm.getByText('Ver lo que se envía').click(); await wm.getByText('LO QUE SE ENVÍA · ÚLTIMAS PANTALLAS').waitFor();
    ok(/pantalla \/soporte\/reportar/.test(await texto(wm)), '«Ver lo que se envía» muestra el registro aquí (pantallas por familia)');
    await wm.getByLabel('CUÉNTANOS QUÉ PASÓ').fill('corto');
    await boton(wm, 'Enviar').click(); await wm.getByText('Cuéntanos un poco más (10 letras o más).').waitFor();
    ok(posts.length === 0, 'antes de «Enviar»: ningún POST (ni la captura ni el registro salieron)');
    await wm.getByLabel('CUÉNTANOS QUÉ PASÓ').fill('Al abrir Mis boletos sin señal la pantalla se queda en blanco. Mi teléfono es 570-555-0122.');
    await wm.evaluate(() => scrollTo(0, 0)); await wm.screenshot({ path: OUT + 'b8f-reportar-web-390.png', fullPage: true });
    await boton(wm, 'Enviar').click(); await wm.getByText(/Recibimos tu reporte · TK-\d+/).first().waitFor();
    const TK = /TK-\d+/.exec(await texto(wm))[0];
    ok(posts.some((x) => x.u.includes('/api/ayuda/foto')) && posts.some((x) => /pantalla \/soporte/.test(x.b)), `al tocar «Enviar»: la captura (foto privada) y el registro (${TK})`);
    await wm.screenshot({ path: OUT + 'b8f-reportar-recibido-390.png', fullPage: true });
    const caso = sql(`select topic || '|' || origin || '|' || status || '|' || (business_id is null) from support_cases where number = '${TK}'`);
    ok(caso === 'tecnico|reporte_app|new|true', 'caso TK- normal: tema técnico, origen reporte_app, nuevo');
    ok(sql(`select count(*) from queue_items where queue = 'ticket' and subject_id = (select id::text from support_cases where number = '${TK}') and status = 'open'`) === '1', 'en la cola ticket de Soporte, como cualquier otro');
    const foto = sql(`select m.id || '|' || m.owner_kind || '|' || m.private || '|' || m.url from support_messages s join media m on m.id = s.photo_media_id where s.case_id = (select id from support_cases where number = '${TK}')`);
    ok(/\|support\|true\|privado\/a\//.test(foto), 'la captura es una foto PRIVADA del caso');
    const reg = sql(`select body::text from support_case_logs where case_id = (select id from support_cases where number = '${TK}') and kind = 'registro_app'`);
    ok(/pantalla \/soporte/.test(reg) && !/\d{4,}/.test(reg.replace(/\d{2}:\d{2}:\d{2}/g, '')), 'el registro técnico: familias de pantalla, sin números');
    ok(sql(`select body->>'origen' from support_case_logs where case_id = (select id from support_cases where number = '${TK}') and kind = 'captura'`) === 'archivo', 'la captura: «un archivo que eligió»');
    // Otra cuenta (Yaritza) pide el caso y la captura.
    const wy = await pagina('otra', 390, IOS); await entrar(wy, YARI);
    await wy.goto(B + `/soporte?caso=${TK}`); await wy.getByText('Ese caso no existe').waitFor();
    ok(!(await texto(wy)).includes('Mis boletos sin señal'), 'otra cuenta pide el caso → «Ese caso no existe» (nada del caso)');
    ok((await wy.request.get(`${B}/api/ayuda/foto/${foto.split('|')[0]}`)).status() === 404, 'y la captura → 404');
    // Escritorio.
    const wm2 = await pagina('reportar-desk', 1360); await entrar(wm2, MARI); await wm2.goto(B + '/soporte/reportar'); await wm2.getByText('Agregar una captura').waitFor();
    await wm2.screenshot({ path: OUT + 'b8f-reportar-web-1360.png', fullPage: true });

    console.log('9 · Reportar en la app agitando (build de prueba): la captura de ESA pantalla');
    await ap.goto(B + '/cuenta/boletos'); await espera(() => ap.evaluate(() => window.__agitar === true));
    ok(await ap.evaluate(() => window.__agitar === true), 'en el sandbox la app enciende «agitar» (beta_agitar = 1)');
    await ap.evaluate((c) => window.__agitarAhora(c), CAPTURA);
    await ap.waitForURL(/\/soporte\/reportar\?captura=agitar/); await ap.getByText('ESTA PANTALLA').waitFor();
    await ap.getByLabel('CUÉNTANOS QUÉ PASÓ').fill('Agité el teléfono porque Mis boletos no carga el QR.');
    await ap.screenshot({ path: OUT + 'b8f-reportar-agitar-390.png', fullPage: true });
    await boton(ap, 'Enviar').click(); await ap.getByText(/Recibimos tu reporte · TK-\d+/).first().waitFor();
    const TK2 = /TK-\d+/.exec(await texto(ap))[0];
    ok(sql(`select device || '|' || app_version from support_cases where number = '${TK2}'`) === "Android · app|To'Latino 1.0.0 (7)", 'el caso dice la app y su versión (rótulo TLApp)');
    ok(sql(`select body->>'origen' from support_case_logs where case_id = (select id from support_cases where number = '${TK2}') and kind = 'captura'`) === 'agitar', 'captura «de la pantalla (agitar)»');
    ok(/pantalla \/cuenta\/boletos/.test(sql(`select body::text from support_case_logs where case_id = (select id from support_cases where number = '${TK2}') and kind = 'registro_app'`)), 'el registro del nativo (TLReporte.leer) trae la pantalla donde agitó');
    sql(`insert into platform_config (key, value, note) values ('beta_agitar', '0', 'prueba 8f') on conflict (key) do update set value = excluded.value`); await dormir(16000);
    const ap2 = await pagina('app-sin-agitar', 390, AND + rot('cliente', 'android', 7), { puente: true }); await entrar(ap2, MARI); await ap2.goto(B + '/ayuda'); await dormir(1500);
    ok(await ap2.evaluate(() => window.__agitar !== true), 'beta_agitar = 0 → la app no escucha el acelerómetro');
    sql(`delete from platform_config where key = 'beta_agitar'`);

    console.log('10 · Las entradas: Mi cuenta › Ayuda y soporte, Panel › Más, Perfil del Repartidor, la Puerta');
    const pd = await pagina('panel', 390, IOS); await entrar(pd, DUENO); await pd.goto(B + `/panel/${BIZ}/mas`);
    await pd.getByText('Reportar un problema', { exact: true }).click(); await pd.waitForURL(/\/soporte\/reportar\?negocio=sabor-dominicano/);
    ok(/SABOR DOMINICANO · AYUDA Y SOPORTE/i.test(await texto(pd)), 'Panel › Más › Reportar un problema: con el negocio como contexto');
    await pd.getByLabel('CUÉNTANOS QUÉ PASÓ').fill('El panel no me deja guardar la foto del menú desde el teléfono.'); await boton(pd, 'Enviar').click();
    await pd.getByText(/Recibimos tu reporte · TK-\d+/).first().waitFor();
    const TK3 = /TK-\d+/.exec(await texto(pd))[0];
    ok(sql(`select business_id || '|' || origin from support_cases where number = '${TK3}'`) === `${BIZ}|reporte_app`, 'el caso es del negocio (lo ve en Panel › Más › Ayuda y Soporte)');
    const rj = await pagina('repartidor', 390, IOS); await entrar(rj, JUAN); await rj.goto(B + '/repartidor?t=perfil');
    ok(await espera(async () => (await texto(rj)).includes('Reportar un problema de la app')), 'Repartidor › Perfil › Reportar un problema de la app');
    await rj.getByText('Reportar un problema de la app').click(); await rj.waitForURL(/\/soporte\/reportar$/);
    const pk = await pagina('puerta', 390, IOS); await entrar(pk, KARLA); await pk.goto(B + '/puerta');
    ok(await espera(async () => (await texto(pk)).includes('Reportar un problema de la app')), 'Puerta › Ayuda › Reportar un problema de la app');
    sql(`update feature_flags set enabled = false where key = 'app.reportar'`);
    const rOff = await wm.request.get(B + '/soporte/reportar', { maxRedirects: 0 });
    ok([307, 308, 303].includes(rOff.status()) && /\/soporte\?nuevo=1&tema=tecnico/.test(rOff.headers()['location']), 'app.reportar apagado → el formulario de Soporte de siempre (tema técnico)');
    sql(`update feature_flags set enabled = true where key = 'app.reportar'`);

    console.log('11 · El equipo: Soporte ve el registro; Sistema › Apps › Reportes');
    await pa.goto(B + `/admin/soporte?caso=${TK}`); await pa.getByText('REGISTRO DE LA APP · LO QUE MANDÓ EL TELÉFONO').waitFor();
    const ts = await texto(pa);
    ok(/App · Reportar un problema/.test(ts) && /Un archivo que eligió/.test(ts) && /pantalla \/soporte\/reportar|\/soporte\/reportar/.test(ts), 'Soporte › el caso: canal «App · Reportar un problema», la captura y el registro');
    await pa.getByText('REGISTRO DE LA APP · LO QUE MANDÓ EL TELÉFONO').scrollIntoViewIfNeeded(); await pa.screenshot({ path: OUT + 'b8f-soporte-registro-1360.png' });
    await pa.goto(B + '/admin/sistema/apps?v=reportes'); await pa.getByText(TK, { exact: false }).first().waitFor();
    ok((await texto(pa)).includes(TK2) && (await texto(pa)).includes('captura de la pantalla'), 'Reportes: los casos con su captura y las líneas del registro');
    await pa.screenshot({ path: OUT + 'b8f-reportes-1360.png', fullPage: true });

    console.log('12 · Testers · TestFlight interno por la API de App Store Connect (simulador que valida contra la especificación)');
    sql(`delete from otp_codes where phone = '+1${ADM}'`);
    const c = await pa.evaluate(async () => (await fetch('/api/admin/llavero/codigo', { method: 'POST' })).json());
    const sub = await pa.evaluate(async ([pem, cod, em]) => { const f = new FormData(); f.set('tipo', 'asc_api_key'); f.set('codigo', cod); f.set('motivo', 'Prueba 8f de la beta'); f.set('emisor', em); f.set('archivo', new File([pem], 'AuthKey_ZX9Y8W7V6U.p8')); return (await fetch('/api/admin/llavero', { method: 'POST', body: f })).json(); }, [kp.privateKey.export({ type: 'pkcs8', format: 'pem' }), c.codigoPrueba, EMISOR]);
    ok(sub.ok, 'la llave de App Store Connect al llavero (con código; solo la huella)');
    await pa.goto(B + '/admin/sistema/apps?v=testers'); await boton(pa, 'Invitar a una cuenta').click();
    await pa.getByLabel('TELÉFONO DE SU CUENTA').fill('(570) 555-0122'); await pa.getByText('TestFlight interno · iPhone').click();
    await pa.getByLabel('CORREO DE SU CUENTA DE APPLE').fill('marisol.prueba@example.com'); await pa.getByText('Prueba interna del fundador').click();
    await pa.screenshot({ path: OUT + 'b8f-invitar-1360.png', fullPage: true });
    await boton(pa, 'Invitar').click(); await pa.getByText('Invitado: Apple le manda el correo para unirse al equipo.').waitFor();
    const inv = [...asc.invitaciones.values()].find((x) => x.email === 'marisol.prueba@example.com');
    ok(inv && inv.roles.join() === 'DEVELOPER' && inv.provisioningAllowed === false && inv.allAppsVisible === false && inv.apps.join() === '6400000001', 'Apple recibió la invitación: rol DEVELOPER, sin aprovisionamiento, solo To\'Latino');
    ok(asc.registro.filter((x) => !x.control).every((x) => x.valido || x.status === 404 || x.status === 409 || x.status === 422), 'cada pedido a Apple cumple la especificación (el simulador la valida)');
    ok(sql(`select status || '|' || sync || '|' || (asc_invitation_id is not null) from beta_testers where user_id = ${U(MARI)} and removed_at is null`) === 'invitado|ok|true', 'tester «invitado», Apple al día');
    ok(sql(`select position('marisol.prueba' in encode(email_enc, 'escape')) from beta_testers where user_id = ${U(MARI)} and removed_at is null`) === '0', 'el correo va CIFRADO en la base');
    t7 = await texto(pa); ok(/m•••@e•••\.com/.test(t7) && !t7.includes('marisol.prueba@example.com'), 'en la pantalla, el correo tapado');
    ok(sql(`select count(*) from notifications where user_id = ${U(MARI)} and tpl = 'beta_testflight' and created_at > '${T0}'`) === '1', 'Marisol recibió «Te invitamos a probar To\'Latino»');
    asc.aceptar('marisol.prueba@example.com');
    sql(`update beta_testers set sync_at = now() - interval '11 minutes' where user_id = ${U(MARI)} and removed_at is null`);
    await barrido(pa);
    ok(await espera(() => sql(`select status || '|' || (asc_tester_id is not null) || '|' || (accepted_at is not null) from beta_testers where user_id = ${U(MARI)} and removed_at is null`) === 'activo|true|true'), 'aceptó → el barrido la suma al grupo INTERNO (activo)');
    ok([...asc.testers.values()].some((x) => x.email === 'marisol.prueba@example.com' && x.grupo === 'grp-int-6400000001'), 'en Apple: tester del grupo interno');
    await pa.goto(B + '/admin/sistema/apps?v=testers');
    await pa.locator('div', { has: pa.getByText(/^Marisol/) }).filter({ has: boton(pa, 'Quitar') }).last().getByRole('button', { name: 'Quitar' }).click();
    await pa.getByText('Terminó la prueba').click(); await boton(pa, 'Quitar').last().click();
    ok(await espera(() => sql(`select count(*) from beta_testers where user_id = ${U(MARI)} and status = 'quitado' and removed_reason = 'Terminó la prueba' and sync = 'ok'`) === '1'), 'Quitar con motivo → Apple al día');
    ok(![...asc.testers.values()].some((x) => x.email === 'marisol.prueba@example.com') && ![...asc.usuarios.values()].some((x) => x.username === 'marisol.prueba@example.com'), 'en Apple: fuera del grupo y sin el usuario de la prueba');
    ok(sql(`select count(*) from audit_entries where action in ('beta.invitar', 'beta.quitar') and target_kind = 'beta_tester' and at > '${T0}'`) === '2', 'invitar y quitar en la auditoría');

    console.log('13 · APK propio: enlace de un uso (ver no gasta; otra cuenta 404; bajar una vez; sha256)');
    await pa.goto(B + '/admin/sistema/apps?v=testers'); await boton(pa, 'Invitar a una cuenta').click();
    await pa.getByLabel('TELÉFONO DE SU CUENTA').fill('5705550299'); await pa.getByText('APK propio · Android').click(); await pa.getByText('Persona de confianza').click();
    await boton(pa, 'Invitar').click(); await pa.getByText('Invitado: le llegó el enlace de un uso para bajar el APK de prueba.').waitFor();
    const href = sql(`select href from notifications where user_id = ${U(YARI)} and tpl = 'beta_apk' order by id desc limit 1`);
    ok(/^\/beta\/apk\/[A-Za-z0-9_-]{43}$/.test(href), 'Yaritza recibió el enlace en su aviso');
    const ficha = href.split('/').pop(), hf = crypto.createHash('sha256').update(ficha).digest('hex');
    ok(sql(`select count(*) from apk_links where token_hash = '${hf}' and used_at is null`) === '1' && sql(`select count(*) from apk_links where token_hash = '${ficha}'`) === '0', 'de la ficha solo se guarda la huella');
    await wy.goto(B + href); await wy.getByText('Sirve una vez: al tocar «Descargar» se gasta.', { exact: false }).waitFor();
    await wy.screenshot({ path: OUT + 'b8f-apk-390.png', fullPage: true });
    await wy.reload(); await boton(wy, 'Descargar').waitFor();
    ok(sql(`select used_at is null from apk_links where token_hash = '${hf}'`) === 't', 'abrirla (dos veces) NO gasta el enlace');
    ok((await wm.request.get(B + href)).status() === 404, 'otra cuenta (Marisol) abre el enlace → 404');
    ok((await wm.request.post(B + href + '/bajar', { headers: { origin: B } })).status() === 404, 'otra cuenta intenta bajarlo → 404');
    const [dl] = await Promise.all([wy.waitForEvent('download'), boton(wy, 'Descargar').click()]);
    const apk = fs.readFileSync(await dl.path());
    ok(crypto.createHash('sha256').update(apk).digest('hex') === '87d79ddd2e33ce3096063a5f902b5959e527782a30190f38ccdb51162947d5ce' && apk.length === 563 && /\.apk$/.test(dl.suggestedFilename()), `bajó el APK de prueba (${dl.suggestedFilename()}, 563 B, sha256 = el del build)`); // GUARDIAN-OK: huella del APK de prueba del repo (apps/web/lib/tiendas/apk-prueba.ts)
    ok(sql(`select used_at is not null from apk_links where token_hash = '${hf}'`) === 't', 'bajarlo SÍ lo gasta');
    const otra = await wy.request.post(B + href + '/bajar', { headers: { origin: B }, maxRedirects: 0 });
    ok(otra.status() === 303 && /\?e=410$/.test(otra.headers()['location']), 'una segunda vez → «ya se usó» (410)');
    ok((await wy.request.get(B + href + '/bajar')).status() === 405, 'bajar por GET no existe (405)');
    await wy.goto(B + href); ok((await texto(wy)).includes('Ya bajaste esta app con este enlace'), 'la página lo dice');
    // Otro enlace (anula el vivo) y quitar (anula lo que quede).
    await pa.goto(B + '/admin/sistema/apps?v=testers');
    await pa.locator('div', { has: pa.getByText(/^Yaritza/) }).filter({ has: boton(pa, 'Otro enlace') }).last().getByRole('button', { name: 'Otro enlace' }).click();
    await pa.getByText('No le llegó').click(); await boton(pa, 'Mandar').click(); await pa.getByText('Enlace nuevo enviado: sirve una vez.').waitFor();
    ok(sql(`select count(*) from apk_links l join beta_testers t on t.id = l.tester_id where t.user_id = ${U(YARI)} and l.used_at is null and l.revoked_at is null`) === '1', 'otro enlace: uno vivo');

    console.log('14 · Play interno: la API no deja agregar correos → pendiente en Play Console → «Ya está en la lista»');
    await boton(pa, 'Invitar a una cuenta').click(); await pa.getByLabel('TELÉFONO DE SU CUENTA').fill('5705550122'); await pa.getByText('Play interno · Android').click();
    ok((await texto(pa)).includes('Play no deja agregar un correo por la API'), 'el formulario lo dice antes de invitar');
    await pa.getByText('Persona de confianza').click(); await boton(pa, 'Invitar').click(); await pa.getByText(/Anotado\. Play no deja agregar correos/).waitFor();
    ok(sql(`select status from beta_testers where user_id = ${U(MARI)} and removed_at is null`) === 'pendiente_consola', 'queda «falta en Play»');
    await pa.locator('div', { has: pa.getByText(/^Marisol/) }).filter({ has: boton(pa, 'Ya está en la lista') }).last().getByRole('button', { name: 'Ya está en la lista' }).click();
    await pa.getByText('Agregado en Play Console').click(); await boton(pa, 'Marcar').click();
    // 9b-3 · Falló una vez en la barajada del CI (43519377249) y pasó en otras dos con el mismo orden: si vuelve a fallar, la línea dice qué quedó en la
    // base, qué dijo la pantalla y cuántas filas de Marisol hay en la lista.
    const enPlay = await espera(() => sql(`select status from beta_testers where user_id = ${U(MARI)} and removed_at is null`) === 'activo');
    ok(enPlay, enPlay ? '«Ya está en la lista» → activo' : `«Ya está en la lista» → activo (base: ${sql(`select string_agg(id || ' ' || channel || ' ' || status || ' ' || coalesce(removed_at::text, 'vivo'), ' · ' order by id) from beta_testers where user_id = ${U(MARI)}`)}; auditoría: ${sql(`select count(*) from audit_entries where action = 'beta.en_play' and created_at > '${T0}'`)}; filas «Marisol» en la lista: ${await pa.getByText(/^Marisol/).count()}; la pantalla: «${(await texto(pa)).match(/(Listo: ya está[^.]*\.|Ese tester[^.]*\.|Solo un Admin[^.]*\.|Escribe el motivo\.)/)?.[0] ?? 'sin mensaje'}»)`);
    await pa.screenshot({ path: OUT + 'b8f-testers-1360.png', fullPage: true });
    await pa.setViewportSize({ width: 390, height: 844 }); await pa.reload(); await pa.getByText('ACTIVOS').waitFor(); await pa.screenshot({ path: OUT + 'b8f-testers-390.png', fullPage: true });
    await pa.goto(B + '/admin/sistema/apps?v=versiones'); await pa.getByText(/TO'LATINO · \d+ BUILDS?/).waitFor(); await pa.screenshot({ path: OUT + 'b8f-versiones-390.png', fullPage: true });
    await pa.setViewportSize({ width: 1360, height: 900 }); await pa.reload(); await pa.getByText(/TO'LATINO · \d+ BUILDS?/).waitFor();
    const tv = await texto(pa);
    ok(/DISPONIBLE/.test(tv) && /FALLÓ/.test(tv) && /RETIRADO/.test(tv) && /PROCESANDO/.test(tv) && /sha256 87d79ddd2e33/.test(tv), 'Versiones: builds en cada estado, con su huella');
    await pa.screenshot({ path: OUT + 'b8f-versiones-1360.png', fullPage: true });
    await pa.goto(B + '/admin/sistema/apps'); await pa.getByText('Salud · errores').first().waitFor(); await pa.screenshot({ path: OUT + 'b8f-resumen-1360.png', fullPage: true });

    console.log('15 · Otro rol (Soporte): ve Salud y Reportes; no ve ni cambia testers ni estados');
    const pdy = await pagina('dayana', 1360); await entrar(pdy, DAYANA);
    await pdy.goto(B + '/admin/sistema/apps?v=testers'); await pdy.getByText('Solo un Admin ve y cambia los testers (tienen nombre y teléfono).').waitFor();
    ok(!(await texto(pdy)).includes('Yaritza') && (await boton(pdy, 'Invitar a una cuenta').count()) === 0, 'Testers: ni nombres ni «Invitar»');
    await pdy.goto(B + `/admin/sistema/apps?v=salud&g=${G1000}`); await pdy.getByText('POR BUILD').waitFor();
    ok((await boton(pdy, 'Silenciar').count()) === 0 && (await boton(pdy, 'Resuelto en…').count()) === 0, 'Salud: ve la ficha sin botones de estado');

    console.log('16 · La purga por retención (reloj movido): solo lo vencido');
    sql(`alter table app_error_events disable trigger app_error_events_antes; insert into app_error_events (group_id, at, release, session_hash, message, is_test) values (${G1000}, now() - interval '100 days', 'viejo', repeat('d', 32), 'Prueba 8f viejo', true); alter table app_error_events enable trigger app_error_events_antes`);
    try { sql(`delete from app_error_events where group_id = ${G1000} and message <> 'Prueba 8f viejo'`); ok(false, 'borró lo vigente'); } catch (e) { ok(/solo se purga lo vencido/.test(String(e.stderr)), 'borrar lo que no venció: la base lo impide'); }
    await barrido(pa);
    ok(sql(`select count(*) from app_error_events where message = 'Prueba 8f viejo'`) === '0' && sql(`select count from app_error_groups where id = ${G1000}`) === '1001', 'el barrido borró el de hace 100 días (> errores_retener_dias); el grupo guarda sus cifras');

    ok(errs.length === 0, `sin errores de JavaScript en las páginas (${errs.join(' | ').slice(0, 300)})`);
  } finally {
    // Los casos que abrió esta prueba quedan resueltos (no llenan la cola de Soporte de la regresión).
    sql(`update support_cases set status = 'resolved', resolved_at = now(), resolved_by = 'staff' where origin = 'reporte_app' and created_at > '${T0}' and status in ('new', 'in_progress', 'reopened')`);
    sql(`delete from platform_config where key in ('errores_por_minuto', 'beta_agitar')`);
    sql(`update feature_flags set enabled = true where key in ('app.reportar', 'app.errores')`);
    await asc.cerrar(); await br.close();
  }
  console.log(`\n${n} comprobaciones · beta8f`);
})().catch((e) => { console.error(e); process.exit(1); });
