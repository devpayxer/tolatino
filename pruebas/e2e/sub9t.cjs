// 9t (19 nov) · Toda subida tiene tope AUNQUE el navegador no avise el tamaño (subidaConTope). Safari en iPad/iPhone manda el cuerpo sin
// content-length: un archivo de 13 MB llegaba entero a req.formData() y salía «No llegó la foto» (400; msg9t en el iPad y el SE de la
// confirmación 44573806469) en vez de 413, después de leerlo completo en memoria. Aquí se reproduce desde Node: el cuerpo va por partes
// (sin content-length) a las rutas de subida de un vecino (Mensajes, Ayuda, Reclamo) → 413; con content-length, 413 sin leerlo; una foto
// chica por partes sí se lee y entra (200). Precondición propia: una cuenta nueva (teléfono 555 libre). Necesita el almacén de fotos (CI): sin
// él las rutas responden 503 antes de leer y la prueba FALLA, salvo con SUB9T_SIN_ALMACEN=1 (la corrida local, que lo dice en la salida).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright');
const { entrarComo, telLibre } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const LIMITE = 'X'.repeat(24);
const multipart = (bytes, nombre, tipo) => Buffer.concat([
  Buffer.from(`--${LIMITE}\r\nContent-Disposition: form-data; name="foto"; filename="${nombre}"\r\nContent-Type: ${tipo}\r\n\r\n`), bytes, Buffer.from(`\r\n--${LIMITE}--\r\n`)]);
// Cada subida por una conexión nueva (agent: false): un 413 que no leyó el cuerpo deja la conexión sucia y Node la reusaría para la siguiente.
// Por partes: «Transfer-Encoding: chunked», sin content-length (como Safari).
const http = require('http');
const enviar = (url, cab, buf, conLargo) => new Promise((res, rej) => {
  // Si el servidor contesta antes de recibirlo todo (el 413 de content-length), deja de enviar y vale su respuesta: escribir sobre la conexión
  // que cerró da EPIPE / ECONNRESET, y un navegador lee la respuesta igual.
  let st = null;
  const q = http.request(url, { method: 'POST', agent: false, headers: { ...cab, ...(conLargo ? { 'content-length': String(buf.length) } : { 'transfer-encoding': 'chunked' }) } }, (r) => { st = r.statusCode; r.resume(); r.on('end', () => res(st)); r.on('error', () => res(st)); });
  q.on('error', (e) => (st != null ? res(st) : rej(e)));
  (async () => { for (let i = 0; i < buf.length && st == null && !q.destroyed; i += 262144) { if (!q.write(buf.subarray(i, i + 262144))) await new Promise((x) => { q.once('drain', x); q.once('close', x); }); } if (!q.destroyed) q.end(); })().catch(() => undefined);
});
(async () => {
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    await entrarComo(p, telLibre(), { nombre: 'Sube', apellido: 'Grande' });
    const cookie = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
    const post = (ruta, buf, conLargo) => enviar(B + ruta, { cookie, origin: B, 'content-type': `multipart/form-data; boundary=${LIMITE}` }, buf, conLargo);
    const grande = multipart(Buffer.alloc(13 * 1024 * 1024, 7), 'grande.jpg', 'image/jpeg');
    const sharp = require(ENT.RAIZ + '/apps/web/node_modules/sharp');
    const chica = multipart(await sharp({ create: { width: 320, height: 240, channels: 3, background: { r: 200, g: 120, b: 40 } } }).jpeg().toBuffer(), 'chica.jpg', 'image/jpeg');
    const sinAlmacen = await post('/api/ayuda/foto', chica, true) === 503;
    if (sinAlmacen && process.env.SUB9T_SIN_ALMACEN === '1') { console.log('  · sin almacén de fotos (local): las rutas responden 503 antes de leer — esta prueba corre en el CI'); console.log(`OK (${n} comprobaciones, parcial)`); return; }
    ok(!sinAlmacen, 'hay almacén de fotos (si no, las rutas no llegan a leer el cuerpo)');
    for (const ruta of ['/api/mensajes/foto', '/api/ayuda/foto', '/api/reclamo/documento']) {
      const s1 = await post(ruta, grande, false);
      ok(s1 === 413, `${ruta}: 13 MB por partes, sin avisar el tamaño → 413 (${s1})`);
      const s2 = await post(ruta, grande, true);
      ok(s2 === 413, `${ruta}: 13 MB avisando el tamaño → 413 (${s2})`);
    }
    const s3 = await post('/api/ayuda/foto', chica, false);
    ok(s3 === 200, `una foto chica por partes se lee entera y entra (${s3})`);
    console.log(`OK (${n} comprobaciones)`);
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await b.close(); }
})();
