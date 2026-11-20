// Subidas «crudas» desde Node con la sesión de una página (20 nov, confirmación 44685003383): el tope de 12 MB del servidor se prueba con un
// cuerpo armado aquí, no con un fetch de 13 MB dentro de WebKit. El WebKit del CI (iPad) a veces manda ese archivo armado en la página de forma
// que el servidor no lo recibe entero y contesta 400 en vez de 413 (msg9t). Un usuario real nunca manda 13 MB: la app achica la foto antes de
// subirla y avisa «pesa demasiado» si aun así pasa del tope. Lo que se prueba es el servidor: el tope, con el tamaño avisado y sin avisarlo
// (por partes, como Safari). Mismo método que sub9t.
const http = require('http');
const LIMITE = 'X'.repeat(24);
const multipart = (bytes, nombre, tipo, extra = {}) => Buffer.concat([
  Buffer.from(`--${LIMITE}\r\nContent-Disposition: form-data; name="foto"; filename="${nombre}"\r\nContent-Type: ${tipo}\r\n\r\n`), bytes,
  ...Object.entries(extra).map(([k, v]) => Buffer.from(`\r\n--${LIMITE}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}`)),
  Buffer.from(`\r\n--${LIMITE}--\r\n`)]);
// Cada subida por una conexión nueva (agent: false). Si el servidor contesta antes de recibirlo todo, deja de enviar y vale su respuesta.
const enviar = (url, cab, buf, conLargo) => new Promise((res, rej) => {
  let st = null;
  const q = http.request(url, { method: 'POST', agent: false, headers: { ...cab, ...(conLargo ? { 'content-length': String(buf.length) } : { 'transfer-encoding': 'chunked' }) } }, (r) => { st = r.statusCode; r.resume(); r.on('end', () => res(st)); r.on('error', () => res(st)); });
  q.on('error', (e) => (st != null ? res(st) : rej(e)));
  (async () => { for (let i = 0; i < buf.length && st == null && !q.destroyed; i += 262144) { if (!q.write(buf.subarray(i, i + 262144))) await new Promise((x) => { q.once('drain', x); q.once('close', x); }); } if (!q.destroyed) q.end(); })().catch(() => undefined);
});
// Sube `bytes` (de `tipo`) a `ruta` con la sesión de la página `p`: por partes (sin content-length) y avisando el tamaño. Devuelve los dos status.
async function subirCrudoNode(p, base, ruta, bytes, tipo = 'image/jpeg', extra = {}) {
  const cookie = (await p.context().cookies(base)).map((c) => `${c.name}=${c.value}`).join('; ');
  const buf = multipart(bytes, 'x.bin', tipo, extra), cab = { cookie, origin: base, 'content-type': `multipart/form-data; boundary=${LIMITE}` };
  return [await enviar(base + ruta, cab, buf, false), await enviar(base + ruta, cab, buf, true)];
}
module.exports = { subirCrudoNode };
