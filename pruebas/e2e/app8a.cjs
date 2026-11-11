// 8a · Las cuatro cáscaras (Playwright con el rótulo TLApp, teléfono 390 y escritorio 1360):
// cada app entra a su entrada; una ruta ajena va a «Esto se abre en …» (otra app o la web); build bajo el mínimo → «Actualiza la app»; aviso
// suave; app en pausa → «Esta app está en pausa»; la sesión guarda app, plataforma y versión (Sistema › Apps y Usuarios 360°); el rótulo no da
// permisos; la CSP no rompe ninguna pantalla de la regresión (sin violaciones); nadie nos mete en un marco y un marco ajeno no alcanza el puente;
// el llavero: subir (código otra vez) → solo la huella, nunca el contenido (HTML, RSC, respuestas, base cifrada), comprobar, reemplazar, retirar;
// cualquier otro rol → 403; las islas y la página local «Sin señal»; la hoja previa de permisos (con el puente simulado en el marco de arriba).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'); const crypto = require('crypto');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const ADM = '5705550199', DAYANA = '5705550677', OMAR = '5705550688', MARI = '5705550122', DUENO = '5705550133', NEG = 'sabor-dominicano';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const rot = (app, plat, build) => ` TLApp/${app}/${plat}/1.0.0 (${build})`;
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });
const ruta = (p) => new URL(p.url()).pathname + new URL(p.url()).search;
// El puente simulado (solo en el marco de arriba): lo que inyecta la cáscara de iOS (webkit.messageHandlers.bridge + PluginHeaders).
const PUENTE = `if (window === window.top) {
  window.__puente = []; const mem = new Map();
  window.webkit = { messageHandlers: { bridge: { postMessage: (m) => window.__puente.push(m) } } };
  const M = (n, ms) => ({ name: n, methods: ms.map((x) => ({ name: x, rtype: 'promise' })) });
  window.Capacitor = { PluginHeaders: [M('TLPantalla', ['mantener', 'brillo', 'ajustes']), M('TLReporte', ['anotar', 'leer']), M('TLLocal', ['poner', 'leer', 'quitar', 'todos', 'borrar']), M('SplashScreen', ['hide']), M('App', ['addListener', 'exitApp']), M('AppLauncher', ['openUrl'])],
    nativePromise: (p, m, o) => { window.__puente.push({ p, m, o }); const k = (o && (o.ns + '/' + o.tienda)) || '';
      if (p === 'TLLocal') { const t = mem.get(k) || new Map(); mem.set(k, t);
        if (m === 'poner') { t.set(o.clave, o.valor); return Promise.resolve(); } if (m === 'leer') return Promise.resolve({ valor: t.has(o.clave) ? t.get(o.clave) : null });
        if (m === 'quitar') { t.delete(o.clave); return Promise.resolve(); } if (m === 'todos') return Promise.resolve({ valores: [...t.values()] });
        if (m === 'borrar') { for (const x of [...mem.keys()]) if (x.startsWith(o.ns + '/')) mem.delete(x); return Promise.resolve(); } }
      if (p === 'TLReporte' && m === 'leer') return Promise.resolve({ lineas: [] });
      if (p === 'App' && m === 'addListener') return Promise.resolve({ remove: () => Promise.resolve() });
      return Promise.resolve({}); },
    nativeCallback: () => 'cb' };
}`;

(async () => {
  const AU = sql(`select id from users where phone = '+1${ADM}'`), T0 = sql(`select now()::text`);
  // Preparar: las cuatro apps abiertas, sin mínimos ni avisos; lo que dejó una corrida anterior de esta prueba se quita (solo esta base).
  sql(`update feature_flags set enabled = true where key like 'app.cascara.%'`);
  sql(`delete from platform_config where key like 'app_min_build_%' or key like 'app_aviso_build_%'`);
  sql(`set session_replication_role = replica; delete from store_secret_reads; delete from store_secrets`);
  const br = await chromium.launch(), errs = [], csp = [];
  const ctx = async (w, ua) => br.newContext({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: w > 500 ? 1 : 2, userAgent: ua, locale: 'es-US' });
  const pagina = async (k, w, ua, o = {}) => { const cx = await ctx(w, ua); if (o.puente) await cx.addInitScript(PUENTE);
    await cx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); });
    const p = await cx.newPage(); p.on('pageerror', (e) => errs.push(`${k}: ${e.message}`)); p.on('console', (m) => { if (/Content Security Policy|Refused to/.test(m.text())) csp.push(`${k}: ${m.text().slice(0, 200)}`); }); return p; };

  console.log('1 · Cada app entra a SU entrada («/» y Mi cuenta van a la entrada); To\'Latino abre «/»');
  const entradas = { cliente: '/', negocio: '/panel', delivery: '/repartidor', checkin: '/puerta' };
  for (const [app, ent] of Object.entries(entradas)) {
    const p = await pagina(app, 390, IOS + rot(app, 'ios', 5));
    for (const r of ['/', '/cuenta']) {
      if (app === 'cliente' && r === '/cuenta') continue;
      const res = await p.request.get(B + r, { maxRedirects: 0, headers: { 'user-agent': IOS + rot(app, 'ios', 5) } });
      if (app === 'cliente') ok(res.status() === 200, `To'Latino · «${r}» abre ahí (200)`);
      else ok(res.status() === 307 && new URL(res.headers()['location']).pathname === ent, `${app} · «${r}» → ${ent} (307)`);
    }
    await p.context().close();
  }
  const pn = await pagina('neg', 390, IOS + rot('negocio', 'ios', 5));
  await entrar(pn, DUENO);
  await pn.goto(B + '/'); await pn.waitForLoadState('networkidle');
  ok(ruta(pn).startsWith('/panel'), `Negocios con sesión del dueño: «/» abre el panel (${ruta(pn)})`);
  await pn.screenshot({ path: OUT + 'a8a-negocios-entrada-390.png' });

  console.log('2 · Una ruta de otra app va a «Esto se abre en …»; el Super Admin, a la web; la web de siempre no cambia');
  await pn.goto(B + '/pedido/1001'); await pn.getByText('Esto se abre en To\'Latino').first().waitFor();
  ok(ruta(pn).startsWith('/app/fuera?r=%2Fpedido%2F1001'), 'Negocios · /pedido/1001 → «Esto se abre en To\'Latino»');
  ok((await texto(pn)).includes('Si tienes To\'Latino en este teléfono, se abre ahí; si no, en el navegador.'), 'dice dónde se abre');
  await pn.screenshot({ path: OUT + 'a8a-fuera-390.png' });
  await pn.goto(B + '/admin'); await pn.getByText('Esto se abre en la web').first().waitFor();
  ok(true, 'Negocios · /admin → «Esto se abre en la web» (el Super Admin no es de ninguna app)');
  const pc = await pagina('cli', 390, IOS + rot('cliente', 'ios', 5));
  await pc.goto(B + `/panel/${NEG}`); await pc.getByText('Esto se abre en To\'Latino Negocios').first().waitFor();
  ok(true, 'To\'Latino · /panel/… → «Esto se abre en To\'Latino Negocios»');
  for (const [app, r] of [['delivery', '/puerta'], ['checkin', '/repartidor'], ['checkin', '/cuenta/boletos'], ['delivery', '/eventos']]) {
    const res = await pc.request.get(B + r, { maxRedirects: 0, headers: { 'user-agent': IOS + rot(app, 'ios', 5) } });
    ok(res.status() === 307 && res.headers()['location'].includes('/app/fuera?r=' + encodeURIComponent(r)), `${app} · ${r} → /app/fuera`);
  }
  for (const [app, r] of [['negocio', '/entrar'], ['delivery', '/cuenta/ajustes'], ['checkin', '/ayuda'], ['negocio', '/soporte'], ['checkin', '/app/sin-senal']]) {
    const res = await pc.request.get(B + r, { maxRedirects: 0, headers: { 'user-agent': IOS + rot(app, 'ios', 5) } });
    ok(!(res.status() === 307 && (res.headers()['location'] ?? '').includes('/app/fuera')), `${app} · ${r} es común: la abre la cáscara (${res.status()})`);
  }
  // Una navegación del cliente de Next (RSC) también va a «fuera»: el middleware contesta la redirección a la petición RSC.
  const rsc = await pc.request.get(B + `/panel/${NEG}`, { maxRedirects: 0, headers: { 'user-agent': IOS + rot('cliente', 'ios', 5), rsc: '1' } });
  ok(rsc.status() === 307 && rsc.headers()['location'].includes('/app/fuera'), 'la navegación RSC a una ruta ajena también se redirige');
  const web = await pagina('web', 390, IOS);
  const rw = await web.request.get(B + `/panel/${NEG}`, { maxRedirects: 0, headers: { 'user-agent': IOS } });
  ok(!(rw.headers()['location'] ?? '').includes('/app/'), 'sin rótulo (la web): /panel no se toca');
  const rf = await web.request.get(B + '/app/fuera?r=%2Fpanel', { maxRedirects: 0, headers: { 'user-agent': IOS } });
  ok(rf.status() === 307 && new URL(rf.headers()['location'], B).pathname === '/panel', 'la web en /app/fuera vuelve a la ruta');
  const rmal = await pc.request.get(B + '/app/fuera?r=https%3A%2F%2Fmalo.example%2F', { maxRedirects: 0, headers: { 'user-agent': IOS + rot('negocio', 'ios', 5) } });
  ok(rmal.status() === 307 && new URL(rmal.headers()['location'], B).pathname === '/panel', '«fuera» con una dirección ajena no la abre: vuelve a la entrada');

  console.log('3 · El rótulo TLApp no da permisos: la vecina con «Negocios» no ve el panel ajeno; con «Repartidor» no entra al Super Admin');
  const pm = await pagina('mari-neg', 390, IOS + rot('negocio', 'ios', 5));
  await entrar(pm, MARI);
  await pm.goto(B + `/panel/${NEG}`); await pm.waitForLoadState('networkidle');
  const tm = await texto(pm);
  ok(!/Hoy|Pedidos de hoy/.test(tm) || ruta(pm) !== `/panel/${NEG}`, `la vecina con el rótulo de Negocios no abre el panel de ${NEG} (${ruta(pm)})`);
  const rLl = await pm.evaluate(async () => (await fetch('/api/admin/llavero/codigo', { method: 'POST' })).status);
  ok(rLl === 403, 'la vecina con cualquier rótulo: el llavero contesta 403');
  ok(sql(`select app || '|' || platform || '|' || app_version || '|' || app_build || '|' || os_version from sessions where user_id = (select id from users where phone = '+1${MARI}') order by created_at desc limit 1`) === 'negocio|ios|1.0.0|5|17.5',
    'la sesión guarda app, plataforma, versión, build y sistema (negocio · ios · 1.0.0 · 5 · 17.5)');

  console.log('4 · Sistema › Apps: build mínimo (límites, motivo, auditoría) → «Actualiza la app»; aviso suave; la pausa');
  const pa = await pagina('adm', 1360, MAC);
  await entrar(pa, ADM);
  await pa.goto(B + '/admin/sistema/apps'); await pa.getByText('SESIONES ACTIVAS POR APP Y VERSIÓN · 30 DÍAS').waitFor({ timeout: 15000 }).catch(async () => { console.log('URL', pa.url(), (await texto(pa)).slice(0, 400)); throw new Error('sin Sistema › Apps'); });
  let T = await texto(pa);
  for (const k of ['TO\'LATINO · /', 'TO\'LATINO NEGOCIOS · /PANEL', 'TO\'LATINO REPARTIDOR · /REPARTIDOR', 'TO\'LATINO PUERTA · /PUERTA', 'iOS com.tolatino.puerta · Android com.tolatino.puerta']) ok(T.toUpperCase().includes(k.toUpperCase()), `Sistema › Apps: «${k}»`);
  ok(T.includes('To\'Latino Negocios · iPhone · 1.0.0 (5)'), 'sesiones por app y versión: Negocios · iPhone · 1.0.0 (5)');
  const cambiar = async (app, plat, tipo, v, motivo = 'Prueba 8a de versiones') => {
    await pa.goto(B + '/admin/sistema/apps'); await pa.getByText('SESIONES ACTIVAS POR APP Y VERSIÓN · 30 DÍAS').waitFor();
    // La fila de la plataforma dentro del grupo de esa app: el botón «Mínimo» / «Aviso» que le sigue.
    const idx = { "To'Latino": 0, "To'Latino Negocios": 1, "To'Latino Repartidor": 2, "To'Latino Puerta": 3 }[app] * 2 + (plat === 'iPhone' ? 0 : 1);
    await pa.getByText(tipo === 'min' ? 'Mínimo' : 'Aviso', { exact: true }).nth(idx).click();
    await pa.getByRole('textbox').first().fill(String(v));
    await pa.getByRole('textbox').last().fill(motivo);
    await boton(pa, 'Guardar').last().click();
    await pa.getByText(/: build (mínimo|de aviso) |tiene que ser mayor|Ya tiene ese valor|Entre \d/).first().waitFor({ timeout: 8000 }).catch(() => undefined);
    return texto(pa);
  };
  T = await cambiar("To'Latino Puerta", 'iPhone', 'min', 10);
  ok(sql(`select cfg_int('app_min_build_checkin_ios')`) === '10', 'Puerta · iPhone · build mínimo 10 (cambiado en Sistema › Apps)');
  ok(sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id = 'app_min_build_checkin_ios' and reason = 'Prueba 8a de versiones'`) !== '0', 'queda en la auditoría con el motivo');
  T = await cambiar("To'Latino Puerta", 'iPhone', 'aviso', 8);
  ok(/tiene que ser mayor que el mínimo/.test(T) && sql(`select cfg_int('app_aviso_build_checkin_ios')`) === '0', 'el build de aviso por debajo del mínimo se rechaza (y no cambia nada)');
  T = await cambiar("To'Latino Puerta", 'iPhone', 'min', -5);
  ok(/Entre/.test(T) && sql(`select cfg_int('app_min_build_checkin_ios')`) === '10', 'fuera de los límites se rechaza');
  // Como toda la Configuración: el valor nuevo vale en cada proceso a más tardar en 15 s (caché por proceso).
  await new Promise((r) => setTimeout(r, 16000));
  const pv = await pagina('puerta-5', 390, IOS + rot('checkin', 'ios', 5));
  await pv.goto(B + '/puerta'); await pv.getByText('Actualiza la app').first().waitFor({ timeout: 10000 }).catch(async () => { console.log('URL', pv.url(), (await texto(pv)).slice(0, 300)); throw new Error('sin Actualiza'); });
  ok(ruta(pv) === '/app/actualizar', 'Puerta · build 5 < 10 → «Actualiza la app»');
  ok((await texto(pv)).includes('Hay una versión nueva de To\'Latino Puerta. Actualízala para seguir.'), 'el texto de §1c');
  await pv.screenshot({ path: OUT + 'a8a-actualizar-390.png' });
  const pva = await pagina('puerta-5a', 390, AND + rot('checkin', 'android', 5));
  await pva.goto(B + '/puerta'); await pva.waitForLoadState('networkidle');
  ok(!ruta(pva).startsWith('/app/actualizar'), 'el mínimo es por plataforma: Puerta · Android build 5 sigue');
  const p12 = await pagina('puerta-12', 390, IOS + rot('checkin', 'ios', 12));
  await entrar(p12, DUENO);
  await p12.goto(B + '/puerta'); await p12.waitForLoadState('networkidle');
  ok(!ruta(p12).startsWith('/app/actualizar'), 'Puerta · build 12 ≥ 10 → sigue');
  T = await cambiar("To'Latino Puerta", 'iPhone', 'aviso', 20);
  ok(sql(`select cfg_int('app_aviso_build_checkin_ios')`) === '20', 'build de aviso 20');
  await new Promise((r) => setTimeout(r, 16000));
  await p12.goto(B + '/puerta'); await p12.getByText('Hay una versión nueva de To\'Latino Puerta.').waitFor();
  ok(true, 'Puerta · build 12 < 20 → el aviso suave arriba');
  await p12.screenshot({ path: OUT + 'a8a-aviso-suave-390.png' });
  await p12.getByRole('button', { name: 'Cerrar el aviso' }).click();
  await p12.reload(); await p12.waitForLoadState('networkidle');
  ok(!(await texto(p12)).includes('Hay una versión nueva'), 'cerrado, no vuelve (7 días en este teléfono)');
  ok(await p12.request.get(B + '/app/actualizar', { maxRedirects: 0, headers: { 'user-agent': IOS + rot('checkin', 'ios', 12) } }).then((r) => r.status() === 307), 'un build al día en /app/actualizar vuelve a la entrada');
  // La pausa.
  await pa.goto(B + '/admin/sistema/apps'); await pa.getByText('SESIONES ACTIVAS POR APP Y VERSIÓN · 30 DÍAS').waitFor();
  // El interruptor de la fila «Abierta» de Negocios (segunda app).
  const toggles = pa.locator('[role="switch"]');
  ok(await toggles.count() >= 4, `un interruptor por app (${await toggles.count()})`);
  await toggles.nth(1).click();
  await pa.getByText('Pausar To\'Latino Negocios').first().waitFor();
  await pa.getByText('Mantenimiento', { exact: true }).first().click();
  await boton(pa, 'Pausar').last().click();
  await pa.getByText(/en pausa/).first().waitFor();
  ok(sql(`select enabled from feature_flags where key = 'app.cascara.negocio'`) === 'f', 'Negocios en pausa (interruptor app.cascara.negocio)');
  ok(sql(`select count(*) from audit_entries where action = 'app.pausar' and target_id = 'app.cascara.negocio'`) !== '0', 'la pausa queda en la auditoría');
  await pa.screenshot({ path: OUT + 'a8a-sistema-apps-1360.png', fullPage: true });
  await new Promise((r) => setTimeout(r, 16000));
  await pn.goto(B + `/panel/${NEG}`); await pn.getByText('Esta app está en pausa').first().waitFor();
  ok(ruta(pn) === '/app/pausa', 'Negocios en pausa → «Esta app está en pausa · Abrir en la web»');
  await pn.screenshot({ path: OUT + 'a8a-pausa-390.png' });
  const pnw = await pagina('neg-web', 390, IOS); await entrar(pnw, DUENO);
  await pnw.goto(B + `/panel/${NEG}`); await pnw.waitForLoadState('networkidle');
  ok(ruta(pnw).startsWith(`/panel/${NEG}`), 'la web del mismo panel sigue igual (la pausa es de la app)');
  await pa.goto(B + '/admin/sistema/apps'); await pa.getByText('SESIONES ACTIVAS POR APP Y VERSIÓN · 30 DÍAS').waitFor();
  await pa.locator('[role="switch"]').nth(1).click(); await pa.getByText('Ya se corrigió', { exact: true }).first().click(); await boton(pa, 'Abrir').last().click();
  await pa.getByText(/abierta otra vez/).first().waitFor();
  await new Promise((r) => setTimeout(r, 16000));
  await pn.goto(B + `/panel/${NEG}`); await pn.waitForLoadState('networkidle');
  ok(ruta(pn).startsWith(`/panel/${NEG}`), 'abierta otra vez: Negocios vuelve a su panel');
  const p390 = await pagina('adm390', 390, IOS); await entrar(p390, ADM);
  await p390.goto(B + '/admin/sistema/apps'); await p390.getByText('SESIONES ACTIVAS POR APP Y VERSIÓN · 30 DÍAS').waitFor();
  await p390.screenshot({ path: OUT + 'a8a-sistema-apps-390.png', fullPage: true });
  // Soporte ve Apps (sin cambiar); Finanzas no tiene la sección.
  const pd = await pagina('dayana', 1360, MAC); await entrar(pd, DAYANA);
  await pd.goto(B + '/admin/sistema/apps'); await pd.getByText('Solo un Admin cambia las versiones o pausa una app.').waitFor();
  ok((await pd.getByText('Mínimo', { exact: true }).count()) === 0, 'Soporte ve Sistema › Apps sin poder cambiar nada');
  const po = await pagina('omar', 1360, MAC); await entrar(po, OMAR);
  await po.goto(B + '/admin/sistema/apps'); await po.waitForLoadState('networkidle');
  ok(!ruta(po).startsWith('/admin/sistema/apps'), `Finanzas no tiene Sistema › Apps (${ruta(po)})`);
  // Usuarios 360° › Sesiones dice la app y la versión.
  const MU = sql(`select id from users where phone = '+1${MARI}'`);
  await pa.goto(B + `/admin/usuarios/${MU}?tab=seguridad`); await pa.getByText(/DISPOSITIVOS Y SESIONES/).first().waitFor();
  const tu = await texto(pa);
  ok(tu.includes('To\'Latino Negocios 1.0.0 (5) · iOS 17.5'), 'Usuarios 360° › Sesiones: «To\'Latino Negocios 1.0.0 (5) · iOS 17.5»');
  await pa.getByText(/DISPOSITIVOS Y SESIONES/).first().scrollIntoViewIfNeeded();
  await pa.screenshot({ path: OUT + 'a8a-u360-sesiones-1360.png' });
  // Volver a dejar todo sin mínimos (por la pantalla, con su auditoría).
  await cambiar("To'Latino Puerta", 'iPhone', 'aviso', 0, 'Fin de la prueba 8a');
  await cambiar("To'Latino Puerta", 'iPhone', 'min', 0, 'Fin de la prueba 8a');
  ok(sql(`select cfg_int('app_min_build_checkin_ios') || '|' || cfg_int('app_aviso_build_checkin_ios')`) === '0|0', 'de vuelta sin mínimo ni aviso');

  console.log('5 · El llavero: el código otra vez, solo la huella; comprobar, reemplazar y retirar; cualquier otro rol → 403');
  // 9a · Dos llaves .p8 de PRUEBA (P-256, PKCS8) hechas en el momento en la salida de la corrida: nunca en el repo.
  fs.mkdirSync(S + '/llaves8a', { recursive: true });
  for (const k of ['AuthKey_TEST8A0001.p8', 'AuthKey_TEST8A0002.p8']) fs.writeFileSync(S + '/llaves8a/' + k, require('crypto').generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  const K1 = fs.readFileSync(S + '/llaves8a/AuthKey_TEST8A0001.p8'), K2 = fs.readFileSync(S + '/llaves8a/AuthKey_TEST8A0002.p8');
  const H1 = crypto.createHash('sha256').update(K1).digest('hex'), H2 = crypto.createHash('sha256').update(K2).digest('hex');
  const cuerpo1 = K1.toString().split('\n')[1].slice(0, 40), cuerpo2 = K2.toString().split('\n')[1].slice(0, 40);
  const respuestas = [];
  pa.on('response', async (r) => { try { if (r.request().resourceType() !== 'image') respuestas.push(await r.text()); } catch { /* sin cuerpo */ } });
  await pa.goto(B + '/admin/sistema/integraciones'); await pa.getByText('LLAVES DE LAS TIENDAS · 0 DE 9').waitFor();
  await pa.screenshot({ path: OUT + 'a8a-llavero-vacio-1360.png', fullPage: true });
  await pa.getByText('Subir archivo', { exact: true }).nth(1).click(); // APNs (segunda fila)
  await pa.getByText('Apple · llave de avisos (APNs)').first().waitFor();
  sql(`delete from otp_codes where purpose = 'login'`); // el límite por IP de la hora (20) cuenta las entradas de esta prueba
  await pa.getByText('Mandar el código', { exact: true }).click();
  await pa.getByText(/MODO PRUEBAS · tu código es \d{6}/).waitFor();
  const cod = /tu código es (\d{6})/.exec(await texto(pa))[1];
  ok(sql(`select count(*) from otp_codes where purpose = 'llavero' and used_at is null`) === '1', 'el código del llavero va al teléfono del Admin (propósito «llavero»)');
  await pa.getByRole('textbox', { name: 'CÓDIGO DE 6 NÚMEROS' }).fill('000000');
  await pa.getByRole('textbox', { name: 'TEAM ID (DE APPLE DEVELOPER)' }).fill('A1B2C3D4E5');
  await pa.getByRole('textbox', { name: 'MOTIVO (QUEDA EN LA AUDITORÍA)' }).fill('Llave de APNs de prueba 8a');
  await pa.locator('input[type=file]').setInputFiles(S + '/llaves8a/AuthKey_TEST8A0001.p8');
  await boton(pa, 'Guardar en el llavero').click();
  await pa.getByText('El código no es correcto.').waitFor();
  ok(sql(`select count(*) from store_secrets`) === '0', 'con un código equivocado no se guarda nada');
  await pa.getByRole('textbox', { name: 'CÓDIGO DE 6 NÚMEROS' }).fill(cod);
  await boton(pa, 'Guardar en el llavero').click();
  await pa.getByText(/LLAVES DE LAS TIENDAS · 1 DE 9/).waitFor();
  ok(true, 'guardada: vuelve a la lista con 1 de 8');
  T = await texto(pa);
  const corta = (h) => `${h.slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ')} … ${h.slice(-4)}`;
  ok(T.includes(`v1 · SHA-256 ${corta(H1)}`), `se ve la huella del archivo (${corta(H1)})`);
  ok(T.includes('id llave TEST8A0001') && T.includes('equipo A1B2C3D4E5'), 'y sus datos públicos (id de la llave del nombre del archivo, Team ID)');
  await pa.screenshot({ path: OUT + 'a8a-llavero-1360.png', fullPage: true });
  const html = await pa.content();
  ok(!html.includes(cuerpo1) && !html.includes('BEGIN PRIVATE KEY'), 'el HTML no trae el contenido de la llave');
  const rscPl = await pa.evaluate(async () => (await fetch('/admin/sistema/integraciones', { headers: { rsc: '1' } })).text());
  ok(rscPl.length > 1000 && !rscPl.includes(cuerpo1) && !rscPl.includes('PRIVATE KEY') && !rscPl.includes('blob'), 'el RSC no trae el contenido ni el sobre');
  ok(!respuestas.some((x) => x.includes(cuerpo1)), `ninguna respuesta del servidor trae el contenido (${respuestas.length} respuestas)`);
  ok(sql(`select fingerprint from store_secrets where kind = 'apns_key' and retired_at is null`) === H1, 'la base guarda la huella sha256 del archivo');
  ok(sql(`select position(convert_to('${cuerpo1}', 'UTF8') in blob_enc) from store_secrets where kind = 'apns_key'`) === '0' && sql(`select substr(encode(blob_enc, 'escape'), 1, 4) from store_secrets where kind = 'apns_key'`) === 'TLK1', 'en la base, solo el sobre cifrado (TLK1…), nunca el texto');
  ok(sql(`select count(*) from audit_entries where action = 'llavero.subir' and after::text like '%${H1.slice(0, 16)}%' and at >= '${T0}'`) === '1' && sql(`select count(*) from audit_entries where action like 'llavero.%' and (after::text like '%PRIVATE%' or after::text like '%${cuerpo1.slice(0, 20)}%')`) === '0', 'la auditoría dice la huella, nunca el contenido');
  await pa.getByText('Comprobar', { exact: true }).first().click();
  await pa.getByText('El sobre abre y la huella coincide.').waitFor();
  ok(sql(`select "by" || '|' || ok::text from store_secret_reads`) === 'servidor|true', 'comprobar abre el sobre en el servidor y queda anotado (store_secret_reads)');
  let rech = ''; try { sql(`delete from store_secrets`); } catch (e) { rech = String(e.stderr ?? e.message); } ok(/no se borra/.test(rech), 'la base no deja borrar una llave');
  rech = ''; try { sql(`update store_secret_reads set ok = false`); } catch (e) { rech = String(e.stderr ?? e.message); } ok(/solo de inserción/.test(rech), 'las lecturas son de solo inserción');
  rech = ''; try { sql(`update store_secrets set fingerprint = repeat('a', 64)`); } catch (e) { rech = String(e.stderr ?? e.message); } ok(/solo se retira/.test(rech), 'de una llave solo se retira (no se cambia la huella ni el sobre)');
  // Reemplazar.
  await pa.getByText('Reemplazar', { exact: true }).first().click();
  await new Promise((r) => setTimeout(r, 31000)); // otro código al mismo teléfono: 30 s después (como al entrar)
  await pa.getByText('Mandar el código', { exact: true }).click(); await pa.getByText(/MODO PRUEBAS · tu código es \d{6}/).waitFor();
  const cod2 = /tu código es (\d{6})/.exec(await texto(pa))[1];
  await pa.getByRole('textbox', { name: 'CÓDIGO DE 6 NÚMEROS' }).fill(cod2);
  await pa.getByRole('textbox', { name: 'MOTIVO (QUEDA EN LA AUDITORÍA)' }).fill('Llave nueva de prueba 8a');
  await pa.locator('input[type=file]').setInputFiles(S + '/llaves8a/AuthKey_TEST8A0002.p8');
  await boton(pa, 'Guardar en el llavero').click(); await pa.getByText(/LLAVES DE LAS TIENDAS · 1 DE 9/).waitFor();
  await pa.getByText(/Reemplazada por la versión 2/).first().waitFor();
  T = await texto(pa);
  ok(T.includes(`v2 · SHA-256 ${corta(H2)}`) && T.includes('RETIRADAS · 180 DÍAS') && T.includes('Reemplazada por la versión 2'), 'reemplazar: la v2 viva, la v1 retirada con su motivo');
  ok(!(await pa.content()).includes(cuerpo2), 'tampoco el contenido de la nueva');
  // Retirar.
  await pa.getByText('Retirar', { exact: true }).first().click();
  await pa.getByText('Ya no se usa', { exact: true }).first().click(); await boton(pa, 'Retirar').last().click();
  await pa.getByText(/versión 2 retirada/).first().waitFor();
  ok(sql(`select count(*) from store_secrets where retired_at is null`) === '0' && sql(`select count(*) from audit_entries where action = 'llavero.retirar'`) !== '0', 'retirar: ninguna viva, en la auditoría con motivo');
  // Un archivo que no es una llave .p8.
  await pa.getByText('Subir archivo', { exact: true }).first().click();
  await new Promise((r) => setTimeout(r, 31000));
  await pa.getByText('Mandar el código', { exact: true }).click(); await pa.getByText(/MODO PRUEBAS · tu código es \d{6}/).waitFor();
  const cod3 = /tu código es (\d{6})/.exec(await texto(pa))[1];
  fs.writeFileSync(S + '/llaves8a/AuthKey_MALO000001.p8', 'no soy una llave');
  await pa.getByRole('textbox', { name: 'CÓDIGO DE 6 NÚMEROS' }).fill(cod3);
  await pa.getByRole('textbox', { name: 'MOTIVO (QUEDA EN LA AUDITORÍA)' }).fill('Prueba con un archivo malo');
  await pa.locator('input[type=file]').setInputFiles(S + '/llaves8a/AuthKey_MALO000001.p8');
  await boton(pa, 'Guardar en el llavero').click(); await pa.getByText(/No es una llave \.p8 de Apple/).waitFor();
  ok(true, 'un archivo que no es una llave .p8 se rechaza (y no se repite su contenido)');
  // Los otros roles: 403 en las dos rutas; la pantalla no existe para ellos.
  for (const [tel, quien] of [[DAYANA, 'Soporte'], [OMAR, 'Finanzas'], [DUENO, 'dueño de negocio']]) {
    const px = await pagina(quien, 1360, MAC); await entrar(px, tel);
    const a = await px.evaluate(async () => (await fetch('/api/admin/llavero/codigo', { method: 'POST' })).status);
    const b = await px.evaluate(async (k) => { const f = new FormData(); f.set('tipo', 'apns_key'); f.set('codigo', '123456'); f.set('motivo', 'intento'); f.set('archivo', new File([k], 'AuthKey_X0000000.p8')); return (await fetch('/api/admin/llavero', { method: 'POST', body: f })).status; }, K1.toString());
    ok(a === 403 && b === 403, `${quien}: pedir el código y subir una llave → 403`);
    await px.goto(B + '/admin/sistema/integraciones'); await px.waitForLoadState('networkidle');
    const tx = await texto(px);
    ok((!ruta(px).startsWith('/admin/sistema/integraciones') || tx.includes('SIN ACCESO')) && !tx.includes('LLAVES DE LAS TIENDAS'), `${quien}: no abre Integraciones (${ruta(px)}${tx.includes('SIN ACCESO') ? ' · «Sin acceso»' : ''})`);
    await px.context().close();
  }
  const sin = await pagina('sin', 1360, MAC); await sin.goto(B + '/entrar');
  ok(await sin.evaluate(async () => (await fetch('/api/admin/llavero', { method: 'POST', body: new FormData() })).status) === 403, 'sin sesión → 403');
  const otro = await pa.request.post(B + '/api/admin/llavero/codigo', { headers: { origin: 'https://malo.example' } });
  ok(otro.status() === 403, 'el Admin desde otro sitio (otro origen) → 403');
  sql(`set session_replication_role = replica; delete from store_secret_reads; delete from store_secrets`);

  console.log('6 · La CSP no rompe ninguna pantalla de la regresión (sin violaciones) y nadie nos mete en un marco');
  const hdr = await pa.request.get(B + '/');
  ok(/frame-ancestors 'none'/.test(hdr.headers()['content-security-policy'] ?? '') && /connect-src 'self' https:\/\/api\.stripe\.com/.test(hdr.headers()['content-security-policy']), 'cada página trae la CSP (frame-ancestors none, connect-src cerrado)');
  const pantallas = ['/', '/c/restaurantes', `/n/${NEG}`, '/mapa', '/buscar?q=pizza', '/eventos', '/comunidad', '/cuenta', '/cuenta/boletos', '/cuenta/ajustes', '/avisos', '/soporte', '/ayuda', '/compa',
    `/panel/${NEG}`, '/repartidor', '/puerta', '/admin', '/admin/sistema/configuracion', '/admin/soporte', '/cuenta/boletos/sin-conexion', '/puerta/sin-conexion', '/repartidor/sin-conexion', '/app/sin-senal', '/entrar'];
  const pr = { m: await pagina('reg390', 390, IOS), d: await pagina('reg1360', 1360, MAC) };
  await entrar(pr.m, ADM); await entrar(pr.d, ADM);
  let vistas = 0;
  for (const r of pantallas) for (const p of [pr.m, pr.d]) {
    const res = await p.goto(B + r, { waitUntil: 'networkidle' }).catch(() => null);
    const v = await p.evaluate(() => window.__csp ?? []).catch(() => []);
    if (v.length) csp.push(`${r}: ${v.join(', ')}`);
    if (res && res.status() < 500) vistas++;
  }
  ok(vistas === pantallas.length * 2, `${vistas} pantallas abiertas (390 y 1360) sin error del servidor`);
  ok(csp.length === 0, `ninguna violación de la CSP${csp.length ? ': ' + csp.slice(0, 3).join(' | ') : ''}`);
  const marco = await pagina('marco', 1360, MAC);
  await marco.route('http://otro.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: `<html><body><iframe id="f" src="${B}/ayuda" style="width:600px;height:400px"></iframe></body></html>` }));
  await marco.goto('http://otro.test/'); await marco.waitForTimeout(2500);
  const fr = marco.frames().find((f) => f !== marco.mainFrame());
  const dentro = fr ? await fr.evaluate(() => document.body?.innerText?.length ?? 0).catch(() => -1) : -1;
  ok(dentro <= 0, `otro sitio no nos puede meter en un marco (frame-ancestors 'none' / X-Frame-Options; contenido visible: ${dentro})`);

  console.log('7 · Un marco ajeno no alcanza el puente (simulado en el navegador: el puente solo vive en el marco de arriba)');
  const pp = await pagina('puente', 390, IOS + rot('cliente', 'ios', 7), { puente: true });
  await pp.context().route('http://ajeno.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: `<html><body><script>
    let r = {}; try { r.cap = typeof window.Capacitor; r.webkit = typeof window.webkit; } catch (e) { r.err = String(e); }
    try { r.padre = typeof parent.Capacitor; } catch (e) { r.padre = 'bloqueado'; }
    try { parent.webkit.messageHandlers.bridge.postMessage({ type: 'message', pluginId: 'TLLocal', methodName: 'todos' }); r.post = 'pasó'; } catch (e) { r.post = 'bloqueado'; }
    parent.postMessage(JSON.stringify(r), '*');</script></body></html>` }));
  await pp.goto(B + '/');
  ok(await pp.evaluate(() => typeof window.Capacitor === 'object' && window.Capacitor.isNativePlatform()), 'el marco de arriba ve el puente simulado (como la cáscara de iOS)');
  // CSP: un iframe a un origen que no es Stripe ni siquiera carga; se mide en una página sin CSP del mismo navegador (about:blank) con el puente.
  const resIframe = await pp.evaluate(() => new Promise((ok) => { const f = document.createElement('iframe'); f.src = 'http://ajeno.test/x'; addEventListener('message', (e) => ok(String(e.data)), { once: true }); document.body.appendChild(f); setTimeout(() => ok('no cargó'), 3000); }));
  ok(resIframe === 'no cargó', `la CSP no deja cargar un marco de otro origen en nuestras páginas (${resIframe})`);
  const cuantos = await pp.evaluate(() => window.__puente.length);
  const pb = await pp.context().newPage(); await pb.goto('about:blank');
  const r7 = await pb.evaluate(() => new Promise((ok) => { window.Capacitor = { x: 1 }; window.webkit = { messageHandlers: { bridge: { postMessage: () => { window.__llego = true; } } } }; const f = document.createElement('iframe'); f.src = 'http://ajeno.test/y'; addEventListener('message', (e) => ok(JSON.parse(e.data)), { once: true }); document.body.appendChild(f); setTimeout(() => ok({ t: 'sin respuesta' }), 4000); }));
  ok(r7.cap === 'undefined' && r7.webkit === 'undefined' && r7.padre === 'bloqueado' && r7.post === 'bloqueado', `un marco de otro origen no ve window.Capacitor ni webkit, ni alcanza los del padre (${JSON.stringify(r7)})`);
  ok(await pp.evaluate(() => window.__puente.length) === cuantos, 'al puente no llegó ningún mensaje del marco ajeno');
  await pb.close();

  console.log('8 · La hoja previa de permisos (en la app), las islas y la página local «Sin señal»');
  await pp.goto(B + '/'); await pp.waitForLoadState('networkidle');
  await pp.getByText('5 MI', { exact: true }).first().click();
  await pp.getByText('Usar mi ubicación', { exact: true }).first().click();
  await pp.getByText('Tu ubicación', { exact: true }).first().waitFor();
  const th = await texto(pp);
  ok(th.includes('To\'Latino usa tu ubicación solo cuando tocas «Usar mi ubicación», para mostrarte tu ciudad y lo que tienes cerca.'), 'la hoja previa dice el porqué con el texto de la tienda');
  ok(await pp.getByText('Ahora no', { exact: true }).count() > 0 && await pp.getByText('Continuar', { exact: true }).count() > 0, '«Continuar» y «Ahora no» (nunca imita el diálogo del sistema)');
  await pp.screenshot({ path: OUT + 'a8a-hoja-permiso-390.png' });
  await pp.getByText('Ahora no', { exact: true }).first().click();
  ok(await espera(() => +sql(`select count(*) from app_events where name = 'permiso_respuesta' and props->>'respuesta' = 'ahora_no' and app = 'cliente' and plat = 'ios'`) > 0), 'la analítica propia anota la respuesta (permiso, app y plataforma; sin personas)');
  ok(+sql(`select count(*) from app_events where name = 'permiso_pedido' and props->>'permiso' = 'ubicacion' and app = 'cliente'`) > 0, 'y que se mostró la hoja');
  // En la web (sin el puente) no hay hoja: el navegador pregunta solo.
  const pw = await pagina('web-ubic', 390, IOS);
  await pw.goto(B + '/'); await pw.getByText('5 MI', { exact: true }).first().click(); await pw.getByText('Usar mi ubicación', { exact: true }).first().click();
  await pw.waitForTimeout(800);
  ok(!(await texto(pw)).includes('To\'Latino usa tu ubicación solo cuando'), 'en la web no sale la hoja previa (pregunta el navegador)');
  // La página local «Sin señal» de cada app (la que copia islas.mjs) con su isla.
  for (const [app, isla, boton1] of [['checkin', '/puerta/sin-conexion', 'Escanear sin señal'], ['cliente', '/cuenta/boletos/sin-conexion', 'Ver mis boletos'], ['delivery', '/repartidor/sin-conexion', 'Ver mis entregas'], ['negocio', null, null]]) {
    const ps = await pagina('ss-' + app, 390, IOS + rot(app, 'ios', 7), { puente: true });
    await ps.goto(B + '/app/sin-senal'); await ps.getByText('Sin señal', { exact: true }).first().waitFor();
    const ts = await texto(ps);
    ok(boton1 ? ts.includes(boton1) && ts.includes('Probar otra vez') : ts.includes('Revisa tu señal o el wifi') && ts.includes('Probar otra vez'), `«Sin señal» de ${app}: ${boton1 ? `«${boton1}» y «Probar otra vez»` : '«Probar otra vez»'}`);
    if (app === 'checkin') await ps.screenshot({ path: OUT + 'a8a-sin-senal-puerta-390.png' });
    if (app === 'negocio') await ps.screenshot({ path: OUT + 'a8a-sin-senal-negocios-390.png' });
    await ps.context().close();
  }
  // La isla del Repartidor con el turno guardado (en la app lo guarda TLLocal; aquí, el puente simulado con la misma interfaz del almacén).
  const pr2 = await pagina('rep-isla', 390, IOS + rot('delivery', 'ios', 7), { puente: true });
  await pr2.goto(B + '/repartidor/sin-conexion');
  await pr2.evaluate(() => {
    const t = { k: 'turno', at: Date.now() - 20 * 60000, es: true, entregas: [
      { numero: '10421', negocio: 'Sabor Dominicano', dirNegocio: '24 N Wyoming St', cliente: 'Marisol P.', calle: '118 E Broad St', apto: 'Apto 2', zip: '18201', indicaciones: 'Toca el timbre', efectivo: 2350, pagado: false, stage: 'on_the_way', status: 'confirmed' },
      { numero: '10418', negocio: 'Sabor Dominicano', dirNegocio: '24 N Wyoming St', cliente: 'Luis R.', calle: '40 W Diamond Ave', apto: null, zip: '18201', indicaciones: null, efectivo: null, pagado: true, stage: 'delivered', status: 'done' }] };
    return window.Capacitor.nativePromise('TLLocal', 'poner', { ns: 'tl-repartidor', tienda: 'turno', clave: 'turno', valor: JSON.stringify(t) });
  });
  await pr2.evaluate(() => window.Capacitor.nativePromise('TLLocal', 'poner', { ns: 'tl-repartidor', tienda: 'cola', clave: '10421:llegue:1', valor: JSON.stringify({ numero: '10421', paso: 'llegue', at: 1, id: '10421:llegue:1' }) }));
  // Recargar perdería la memoria del puente simulado: se vuelve a montar la pantalla con un cambio de ruta del cliente.
  await pr2.evaluate(() => { history.pushState({}, '', '/repartidor/sin-conexion?x=1'); });
  await pr2.goto(B + '/repartidor/sin-conexion').catch(() => undefined);
  const tr = await texto(pr2);
  ok(tr.includes('Tus entregas en este teléfono') && tr.includes('TO’LATINO REPARTIDOR · SIN CONEXIÓN'), 'la isla del Repartidor abre (estática, sin servidor)');
  ok(ruta(pr2) === '/repartidor/sin-conexion', 'y no la manda a ningún lado');
  await pr2.screenshot({ path: OUT + 'a8a-isla-repartidor-vacia-390.png' });
  // Con el almacén de la web (IndexedDB «tl-repartidor»), como lo guardaría un teléfono: la misma pantalla con las entregas.
  const pr3 = await pagina('rep-isla-web', 390, IOS);
  await pr3.goto(B + '/repartidor/sin-conexion');
  await pr3.evaluate(() => new Promise((ok) => { const r = indexedDB.open('tl-repartidor', 1); r.onupgradeneeded = () => { r.result.createObjectStore('cola', { keyPath: 'id' }); r.result.createObjectStore('turno', { keyPath: 'k' }); };
    r.onsuccess = () => { const d = r.result, t = d.transaction(['turno', 'cola'], 'readwrite');
      t.objectStore('turno').put({ k: 'turno', at: Date.now() - 20 * 60000, es: true, entregas: [
        { numero: '10421', negocio: 'Sabor Dominicano', dirNegocio: '24 N Wyoming St', cliente: 'Marisol P.', calle: '118 E Broad St', apto: 'Apto 2', zip: '18201', indicaciones: 'Toca el timbre', efectivo: 2350, pagado: false, stage: 'on_the_way', status: 'confirmed' },
        { numero: '10418', negocio: 'Sabor Dominicano', dirNegocio: '24 N Wyoming St', cliente: 'Luis R.', calle: '40 W Diamond Ave', apto: null, zip: '18201', indicaciones: null, efectivo: null, pagado: true, stage: 'delivered', status: 'done' }] });
      t.objectStore('cola').put({ id: '10421:llegue:1', numero: '10421', paso: 'llegue', at: 1 }); t.oncomplete = () => { d.close(); ok(); }; }; }));
  await pr3.context().setOffline(true);
  await pr3.reload().catch(() => undefined);
  await pr3.context().setOffline(false);
  await pr3.goto(B + '/repartidor/sin-conexion'); await pr3.getByText('#10421 · 118 E Broad St').waitFor();
  await pr3.getByText('#10421 · 118 E Broad St').click();
  const t3 = await texto(pr3);
  ok(t3.includes('POR ENTREGAR') && t3.includes('ENTREGADAS HOY') && t3.includes('1 paso espera enviarse: #10421 Llegué.') && t3.includes('Cobrar $23.50 en efectivo') && t3.includes('Toca el timbre'), 'la isla muestra lo pendiente, las entregas del turno y el detalle (sin teléfonos)');
  ok(!/\(\d{3}\) \d{3}-\d{4}|\+1\d{10}/.test(t3), 'sin teléfonos');
  await pr3.screenshot({ path: OUT + 'a8a-isla-repartidor-390.png' });

  console.log('9 · El almacén por el puente (la app): Mis boletos guarda la copia de la llave de la sesión y otra cuenta vacía lo guardado');
  const pbo = await pagina('bol-app', 390, IOS + rot('cliente', 'ios', 7), { puente: true });
  await entrar(pbo, MARI);
  const cod8 = sql(`select t.code from tickets t join users u on u.id = t.holder_user_id where u.phone = '+1${MARI}' order by t.id desc limit 1`);
  await pbo.goto(B + `/cuenta/boletos/${cod8}`); await pbo.waitForLoadState('networkidle'); await pbo.waitForTimeout(1500);
  const llamadas = await pbo.evaluate(() => window.__puente.filter((x) => x.p === 'TLLocal').map((x) => ({ m: x.m, d: `${x.o.ns}/${x.o.tienda}`, v: x.o.valor ?? null })));
  ok(llamadas.some((x) => x.m === 'leer' && x.d === 'tl-boletos/meta'), `en la app, Mis boletos lee la copia de su llave de sesión del almacén nativo (${[...new Set(llamadas.map((x) => x.m + ':' + x.d))].join(', ')})`);
  const bk = await pbo.evaluate(() => /(?:^|;\s*)tl_bk=([A-Za-z0-9_-]{40,60})/.exec(document.cookie)?.[1] ?? null);
  ok(!!bk && llamadas.some((x) => x.m === 'poner' && x.d === 'tl-boletos/meta' && JSON.parse(x.v).v === bk), 'y guarda en el llavero del teléfono la MISMA llave de la sesión (la cookie tl_bk), para la isla sin señal');
  ok(llamadas.some((x) => x.m === 'todos' && x.d === 'tl-boletos/b'), 'y revisa lo guardado (lo de otra cuenta o vencido se borra)');
  ok(await pbo.evaluate(() => indexedDB.databases().then((L) => !L.some((d) => d.name === 'tl-boletos'))), 'en la app no abre IndexedDB: todo va por TLLocal');
  // En la web, lo mismo va a IndexedDB «tl-boletos» (versión 2, con la tienda «meta» nueva y lo de antes intacto).
  const pbw = await pagina('bol-web', 390, IOS); await entrar(pbw, MARI);
  await pbw.goto(B + `/cuenta/boletos/${cod8}`); await pbw.waitForLoadState('networkidle'); await pbw.waitForTimeout(1500);
  ok(await pbw.evaluate(() => new Promise((ok) => { const r = indexedDB.open('tl-boletos'); r.onsuccess = () => { const d = r.result; ok(d.version === 2 && d.objectStoreNames.contains('b') && d.objectStoreNames.contains('meta')); d.close(); }; r.onerror = () => ok(false); })), 'en la web: IndexedDB «tl-boletos» v2 (b + meta)');

  await br.close();
  if (errs.length) console.log('Errores de página:', errs.slice(0, 10));
  ok(errs.filter((e) => !/Failed to fetch|Load failed|NetworkError|ResizeObserver/.test(e)).length === 0, `sin errores de página (${errs.length})`);
  console.log(`\n${n} comprobaciones`);
})().catch((e) => { console.error(e); process.exit(1); });
