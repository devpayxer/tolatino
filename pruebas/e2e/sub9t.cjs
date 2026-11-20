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
// La subida cruda (cuerpo armado aquí, por partes o con su tamaño, cada una por una conexión nueva; si el servidor contesta y cierra antes de
// recibirlo todo y la escritura falla sin respuesta, lo intenta otra vez): pruebas/lib/subida-cruda.cjs.
const { enviar, multipart: partes, LIMITE } = require('../lib/subida-cruda.cjs');
const multipart = (bytes, nombre, tipo) => partes(bytes, nombre, tipo);
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
