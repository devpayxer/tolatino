// 9b-2 · Precarga (NODE_OPTIONS=--require …) que pone el dispositivo de PRUEBAS_DISPOSITIVO en TODA prueba de punta a punta sin tocar sus 650
// «newContext»: envuelve chromium.launch (y webkit.launch) de require('playwright'), abre el motor del dispositivo y adapta cada contexto
// (viewport, agente, escala, táctil) según el tipo (ver dispositivos.cjs). Sin la variable no hace nada.
// Anchos (después de la primera corrida en rojo, CI 43785123795):
// - La tableta se usa como se usa de verdad: los contextos de teléfono en vertical (834) y los de escritorio en horizontal (1194), no todo a 834.
// - El agente que una prueba pone A PROPÓSITO (Android, la cáscara de la app, un robot) se respeta: solo se cambia el de los descriptores de
//   Playwright (iPhone/iPad/Pixel…), que es el «teléfono cualquiera» de la prueba.
// - Lo que solo existe en Chromium (cámara falsa, resolución de nombres propia) abre Chromium con el viewport del dispositivo: WebKit no tiene
//   esas banderas y la prueba no probaría nada.
// - WebKit cancela las cargas de la página que se va al navegar y lo dice («Load failed», «… due to access control checks»); Chromium las
//   cancela callado. Solo ESE ruido, y solo en los 3 s después de que la página empieza a navegar, no llega a los oyentes de la prueba.
//   Cualquier otro error (o el mismo lejos de una navegación) llega igual.
const Module = require('module');
const id = process.env.PRUEBAS_DISPOSITIVO;
if (id) {
  const disp = require('./dispositivos.cjs').de(id);
  if (!disp) { console.error(`PRUEBAS_DISPOSITIVO=${id} no existe`); process.exit(2); }
  const orig = Module._load;
  const hechos = new WeakSet();
  let deStock = new Set();
  const agenteDeStock = (ua) => deStock.has(ua);
  // forzado: el motor es Chromium porque la prueba lo necesita (no el del dispositivo): se pone el ancho, la escala y el toque, pero no el
  // agente de Safari (un Chromium que dice ser un iPad mentiría en la etiqueta del aviso, en Wallet…).
  const adaptar = (o = {}, forzado = false) => {
    const w = o.viewport?.width ?? (o.userAgent ? 390 : 1280), esTel = w < 600, d = disp.desc;
    if (disp.tipo === 'telefono' && !esTel) return o;
    if (disp.tipo === 'escritorio' && esTel) return o;
    if (disp.tipo === 'escritorio') return { ...o, viewport: { width: d.viewport.width, height: o.viewport?.height ?? d.viewport.height } };
    const vp = disp.tipo === 'tableta' && !esTel ? { width: Math.max(d.viewport.width, d.viewport.height), height: Math.min(d.viewport.width, d.viewport.height) } : d.viewport;
    // Un descriptor de Android (Pixel) en una prueba es a propósito (dir9m: «en Android abre geo:»): el «teléfono cualquiera» es el iPhone.
    const propio = (o.userAgent && (!agenteDeStock(o.userAgent) || /Android/.test(o.userAgent))) || (forzado && !o.userAgent);
    return { ...o, viewport: vp, userAgent: propio ? o.userAgent : d.userAgent, deviceScaleFactor: d.deviceScaleFactor, isMobile: propio ? (o.isMobile ?? d.isMobile) : d.isMobile, hasTouch: d.hasTouch };
  };
  // Lo mismo cuando la página que se va tenía en vuelo el RSC de un enlace (Next lo dice así y cae a navegación normal).
  const RUIDO = /^(?:TypeError: )?Load failed$|due to access control checks\.?$|^Failed to fetch RSC payload for \S+ Falling back to browser navigation\. (?:TypeError: )?Load failed$/;
  const filtrar = (page) => {
    if (disp.motor !== 'webkit' || page.__tlFiltro) return page;
    page.__tlFiltro = true;
    let nav = 0;
    page.on('request', (r) => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) nav = Date.now(); });
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) nav = Date.now(); });
    const ruido = (txt) => RUIDO.test(String(txt).trim()) && Date.now() - nav < 3000;
    // WebKit no saca capturas de más de 32767 px de alto (una página larga a 375 de ancho): la captura es para mirar, no es la prueba; va la de la pantalla.
    // Tras una acción, la app a veces navega sola (vuelve a la cola); si la prueba hace goto en ese instante, WebKit lo corta («interrupted by another
    // navigation») donde Chromium deja ganar al goto. La prueba quiere ir a SU dirección: se espera a que la otra termine y se va otra vez (una vez).
    // A veces el goto de WebKit se queda sin empezar (ni respuesta ni cambio de dirección: silla3d, tras tocar una insignia que no hace nada) y
    // vence a los 30 s; Chromium nunca. Si la página sigue donde estaba, se vuelve a ir una vez y se dice en la salida. Si sí llegó y lo que
    // falta es la carga, es un error de verdad y se queda.
    const ir = page.goto.bind(page);
    page.goto = async (u, o) => {
      const antes = page.url();
      try { return await ir(u, o); } catch (e) {
        if (/interrupted by another navigation/.test(e.message)) { await page.waitForLoadState('load').catch(() => {}); return ir(u, o); }
        if (e.name === 'TimeoutError' && page.url() === antes && antes !== u) { console.log(`  · webkit: la navegación a ${u} no empezó en 30 s; otra vez`); return ir(u, o); }
        // La página sí llegó pero «load» no salió en 30 s (silla3d, app8a, evt6b-6c en el SE y el iPad; Chromium nunca): se dice en qué estaba
        // (estado del documento, imágenes sin terminar, qué recursos siguen abiertos) y se va otra vez UNA vez. Si vuelve a pasar, es un error.
        if (e.name === 'TimeoutError') {
          const est = await page.evaluate(() => ({ rs: document.readyState, img: [...document.images].filter((i) => !i.complete).map((i) => i.currentSrc || i.src).slice(0, 4),
            // Lo que la página pidió y todavía no terminó (las entradas de performance solo aparecen al terminar): fondos CSS, scripts y hojas.
            sinFin: (() => { const hechos = new Set(performance.getEntriesByType('resource').map((r) => r.name));
              const pedidos = [...document.querySelectorAll('*')].flatMap((el) => [...getComputedStyle(el).backgroundImage.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => new URL(m[1], location.href).href))
                .concat([...document.scripts].map((x) => x.src), [...document.querySelectorAll('link[rel=stylesheet],link[rel=preload]')].map((x) => x.href)).filter((u) => u && !u.startsWith('data:'));
              return [...new Set(pedidos)].filter((u) => !hechos.has(u)).slice(0, 6); })(), iframes: document.querySelectorAll('iframe').length })).catch((x) => ({ error: String(x.message).slice(0, 120) }));
          console.log(`  · webkit: «load» de ${u} no salió en 30 s (en ${page.url()}): ${JSON.stringify(est)}; otra vez`);
          return ir(u, o);
        }
        throw e;
      }
    };
    // WebKit móvil (el iPad) no tiene rueda del ratón: se desplaza la página, que es lo que hace el dedo.
    const rueda = page.mouse.wheel.bind(page.mouse);
    page.mouse.wheel = async (dx, dy) => { try { return await rueda(dx, dy); } catch (e) { if (!/not supported in mobile WebKit/.test(e.message)) throw e; await page.evaluate(([x, y]) => window.scrollBy(x, y), [dx, dy]); } };
    const shot = page.screenshot.bind(page);
    page.screenshot = async (o = {}) => { try { return await shot(o); } catch (e) { if (o.fullPage && /larger than 32767/.test(e.message)) return shot({ ...o, fullPage: false }); throw e; } };
    const on = page.on.bind(page);
    page.on = page.addListener = (ev, fn) => {
      if (ev === 'pageerror') return on(ev, (e) => { if (!ruido(e?.message ?? e)) fn(e); });
      if (ev === 'console') return on(ev, (m) => { if (!(m.type() === 'error' && ruido(m.text()))) fn(m); });
      return on(ev, fn);
    };
    return page;
  };
  const SOLO_CHROMIUM = /^--(?:host-resolver-rules|use-fake-device-for-media-stream|use-fake-ui-for-media-stream|use-file-for-fake-video-capture)/;
  // Una prueba que abre una sesión CDP (el autenticador virtual de las llaves, llave8d) solo corre en Chromium: WebKit no tiene CDP.
  const usaCDP = (() => { try { return /\bnewCDPSession\(/.test(require('fs').readFileSync(process.argv[1], 'utf8')); } catch { return false; } })();
  Module._load = function (request, ...r) {
    const pw = orig.call(this, request, ...r);
    if (request !== 'playwright' && request !== 'playwright-core') return pw;
    if (hechos.has(pw)) return pw;
    hechos.add(pw);
    deStock = new Set(Object.values(pw.devices).map((x) => x.userAgent));
    for (const nombre of ['chromium', 'webkit']) {
      const original = pw[nombre].launch.bind(pw[nombre]);
      pw[nombre].launch = async (opts = {}) => {
        const necesitaChromium = usaCDP || (opts.args ?? []).some((a) => SOLO_CHROMIUM.test(a));
        const motor = necesitaChromium ? 'chromium' : disp.motor;
        // Los argumentos de Chromium (cámara falsa, resolución de nombres) no existen en WebKit.
        const o = motor === 'webkit' ? { ...opts, args: undefined, channel: undefined } : opts;
        if (nombre !== motor) return pw[motor].launch(o); // ya envuelto: adapta sus contextos una sola vez
        const b = await original(o);
        const nc = b.newContext.bind(b);
        b.newContext = async (c) => {
          const ctx = await nc(adaptar(c, motor !== disp.motor));
          const np = ctx.newPage.bind(ctx);
          ctx.newPage = async () => filtrar(await np());
          ctx.on('page', filtrar);
          return ctx;
        };
        b.newPage = async (c) => (await b.newContext(c)).newPage();
        return b;
      };
    }
    return pw;
  };
}
