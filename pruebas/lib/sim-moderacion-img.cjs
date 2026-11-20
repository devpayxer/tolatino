// Revisión automática de las fotos públicas (decisión AJ) · Un modelo propio de imágenes DE MENTIRA (solo pruebas), con la misma forma que
// services/moderacion-img (POST /clasificar → { ok, desnudez, ms }; GET /salud). El puntaje sale del ANCHO de la foto que llega (la subida la
// vuelve a codificar en JPEG sin cambiar su medida si es ≤ 1600), para que la prueba de punta a punta (rev9u) elija cada caso:
//   401 → 0.10 (limpia) · 402 → 0.70 (dudosa) · 403 → 0.95 (clara) · 404 → error 500 (no responde) · 405 → 0.60 (borde: dudosa) ·
//   406 → 0.85 (borde: clara) · cualquier otro ancho → 0.05
// Uso: node pruebas/lib/sim-moderacion-img.cjs [puerto]   (8790 por defecto, el de MODERACION_IMG_URL en pruebas/servir/servir.sh)
const http = require('http');
const PUERTO = Number(process.argv[2] || process.env.PUERTO || 8790);
const PUNTAJE = { 401: 0.1, 402: 0.7, 403: 0.95, 405: 0.6, 406: 0.85 };
function medida(b) {
  let i = 2;
  while (i + 9 < b.length && b[i] === 0xff) {
    const m = b[i + 1], largo = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
    i += 2 + largo;
  }
  return null;
}
const vistos = [];
http.createServer((req, res) => {
  const fin = (st, j) => { res.writeHead(st, { 'content-type': 'application/json' }); res.end(JSON.stringify(j)); };
  if (req.method === 'GET' && req.url === '/salud') return fin(200, { ok: true, modelo: 'simulador rev9u', licencia: 'pruebas' });
  if (req.method === 'GET' && req.url === '/__vistos') return fin(200, { vistos });
  if (req.method !== 'POST' || req.url !== '/clasificar') return fin(404, { ok: false });
  const c = []; req.on('data', (x) => c.push(x)); req.on('end', () => {
    const m = medida(Buffer.concat(c)); vistos.push(m); if (vistos.length > 200) vistos.shift();
    if (m?.ancho === 404) return fin(500, { ok: false });
    fin(200, { ok: true, desnudez: PUNTAJE[m?.ancho] ?? 0.05, ms: 3 });
  });
}).listen(PUERTO, '127.0.0.1');
