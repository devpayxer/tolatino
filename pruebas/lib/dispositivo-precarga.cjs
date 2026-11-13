// 9b-2 · Precarga (NODE_OPTIONS=--require …) que pone el dispositivo de PRUEBAS_DISPOSITIVO en TODA prueba de punta a punta sin tocar sus 650
// «newContext»: envuelve chromium.launch (y webkit.launch) de require('playwright'), abre el motor del dispositivo y adapta cada contexto
// (viewport, agente, escala, táctil) según el tipo (ver dispositivos.cjs). Sin la variable no hace nada.
const Module = require('module');
const id = process.env.PRUEBAS_DISPOSITIVO;
if (id) {
  const disp = require('./dispositivos.cjs').de(id);
  if (!disp) { console.error(`PRUEBAS_DISPOSITIVO=${id} no existe`); process.exit(2); }
  const orig = Module._load;
  const hechos = new WeakSet();
  const adaptar = (o = {}) => {
    const w = o.viewport?.width ?? (o.userAgent ? 390 : 1280), esTel = w < 600, d = disp.desc;
    if (disp.tipo === 'telefono' && !esTel) return o;
    if (disp.tipo === 'escritorio' && esTel) return o;
    if (disp.tipo === 'escritorio') return { ...o, viewport: { width: d.viewport.width, height: o.viewport?.height ?? d.viewport.height } };
    return { ...o, viewport: d.viewport, userAgent: d.userAgent, deviceScaleFactor: d.deviceScaleFactor, isMobile: d.isMobile, hasTouch: d.hasTouch };
  };
  Module._load = function (request, ...r) {
    const pw = orig.call(this, request, ...r);
    if (request !== 'playwright' && request !== 'playwright-core') return pw;
    if (hechos.has(pw)) return pw;
    hechos.add(pw);
    const motor = pw[disp.motor];
    for (const nombre of ['chromium', 'webkit']) {
      const original = pw[nombre].launch.bind(pw[nombre]);
      pw[nombre].launch = async (opts = {}) => {
        // Los argumentos de Chromium (cámara falsa, resolución de nombres) no existen en WebKit.
        const o = disp.motor === 'webkit' ? { ...opts, args: undefined, channel: undefined } : opts;
        const b = await (nombre === disp.motor ? original(o) : motor.launch(o));
        const nc = b.newContext.bind(b);
        b.newContext = (c) => nc(adaptar(c));
        b.newPage = async (c) => (await b.newContext(c)).newPage();
        return b;
      };
    }
    return pw;
  };
}
