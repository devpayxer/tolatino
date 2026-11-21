// 9t · Medios en flujo · Dobles del almacén (S3 propio, Garage) y del servicio de video (services/video) para medir y probar SIN red ni docker:
// dos servidores HTTP en 127.0.0.1 (puerto libre) con la misma forma que los de verdad. Nada se guarda en disco y lo que llega se cuenta por
// partes (el doble nunca junta un archivo grande en memoria: así la medida de memoria es la de la app, no la del doble).
//   almacen(): PUT /<bucket>/<clave> (cuenta, md5 y sha256 del cuerpo; lo guarda solo si es chico), GET con If-None-Match → 304, HEAD; los
//              objetos «grandes» se fabrican al pedirlos (objetos.set(clave, { bytes })). Lleva la lista de pedidos para las pruebas.
//   video(): POST /procesar como services/video/app.py: con «accept: application/x-tolatino-video» contesta el MP4 y la portada en binario
//            (cabeceras x-segundos, x-ancho, x-alto, x-portada-bytes; cuerpo = portada y después el MP4); sin ella, el JSON con base64 de antes.
//            modo: 'ok' · 'no_es_video' (422) · 'caido' (corta la conexión) · { esperaMs } para tenerlo ocupado.
const http = require('http'), crypto = require('crypto');

const escuchar = (srv) => new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv.address().port)));
const bytesDe = (n, semilla = 1) => { const b = Buffer.alloc(n); let x = semilla; for (let i = 0; i < n; i += 4) { x = (x * 1103515245 + 12345) >>> 0; b.writeUInt32LE(x, Math.min(i, n - 4)); } return b; };

async function almacen() {
  const objetos = new Map(), pedidos = [];
  let falla = null; // { metodo, status } → ese método contesta ese error (una vez)
  const srv = http.createServer((req, res) => {
    const clave = decodeURIComponent(req.url.split('?')[0].replace(/^\/[^/]+\//, ''));
    const p = { metodo: req.method, clave, inm: req.headers['if-none-match'] ?? null, bytes: 0, status: 0, firmado: /^AWS4-HMAC-SHA256 /.test(req.headers.authorization ?? '') };
    pedidos.push(p);
    const fin = (st, h = {}, cuerpo) => { p.status = st; res.writeHead(st, h); res.end(cuerpo); };
    if (falla && falla.metodo === req.method) { const st = falla.status; falla = null; req.resume(); return req.on('end', () => fin(st, {}, `<Error>doble ${st}</Error>`)); }
    if (req.method === 'PUT') {
      const md5 = crypto.createHash('md5'), sha = crypto.createHash('sha256'), chicos = [];
      req.on('data', (c) => { p.bytes += c.length; md5.update(c); sha.update(c); if (p.bytes <= 4 << 20) chicos.push(c); });
      req.on('end', () => {
        const hs = sha.digest('hex');
        p.shaOk = req.headers['x-amz-content-sha256'] === hs; p.largo = Number(req.headers['content-length'] ?? -1); p.tipo = req.headers['content-type']; p.cache = req.headers['cache-control'];
        const etag = `"${md5.digest('hex')}"`;
        objetos.set(clave, { bytes: p.bytes, etag, tipo: p.tipo, datos: p.bytes <= 4 << 20 ? Buffer.concat(chicos) : null });
        fin(200, { etag });
      });
      return;
    }
    const o = objetos.get(clave);
    if (!o) return fin(404, { 'content-type': 'application/xml' }, '<Error><Code>NoSuchKey</Code></Error>');
    if (req.method === 'HEAD') return fin(200, { etag: o.etag, 'content-length': String(o.bytes) });
    if (req.method === 'DELETE') { objetos.delete(clave); return fin(204); }
    if (p.inm && p.inm === o.etag) return fin(304, { etag: o.etag });
    // GET: el cuerpo por partes de 64 KB (un objeto grande nunca se arma entero en el doble).
    p.status = 200;
    res.writeHead(200, { etag: o.etag, 'content-length': String(o.bytes), 'content-type': o.tipo ?? 'application/octet-stream' });
    if (o.datos) { p.bytes = o.datos.length; return res.end(o.datos); }
    const trozo = bytesDe(64 * 1024, 3);
    let quedan = o.bytes;
    const seguir = () => { while (quedan > 0) { const n = Math.min(quedan, trozo.length); quedan -= n; p.bytes += n; if (!res.write(n === trozo.length ? trozo : trozo.subarray(0, n))) return res.once('drain', seguir); } res.end(); };
    res.on('close', () => { quedan = 0; });
    seguir();
  });
  const puerto = await escuchar(srv);
  return { url: `http://127.0.0.1:${puerto}`, objetos, pedidos, fallar: (metodo, status) => { falla = { metodo, status }; }, cerrar: () => new Promise((ok) => { srv.closeAllConnections?.(); srv.close(ok); }), bytesDe };
}

async function video({ portada, mp4Bytes = 8 << 20 } = {}) {
  const recibidos = [];
  let modo = 'ok', ocupados = 0, picoOcupados = 0;
  const srv = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/salud') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true,"ffmpeg":"doble"}'); }
    const r = { bytes: 0, largo: Number(req.headers['content-length'] ?? -1), accept: req.headers.accept ?? '', max: new URL(req.url, 'http://x').searchParams.get('max') };
    recibidos.push(r);
    ocupados++; picoOcupados = Math.max(picoOcupados, ocupados);
    const m = modo;
    if (m === 'caido') { req.socket.destroy(); ocupados--; return; }
    req.on('data', (c) => { r.bytes += c.length; });
    req.on('end', async () => {
      if (m && typeof m === 'object' && m.esperaMs) await new Promise((ok) => setTimeout(ok, m.esperaMs));
      ocupados--;
      const json = (st, j) => { res.writeHead(st, { 'content-type': 'application/json' }); res.end(JSON.stringify(j)); };
      if (m === 'no_es_video') return json(422, { ok: false, error: 'no_es_video' });
      const seg = 30, por = portada;
      if (/application\/x-tolatino-video/.test(r.accept)) {
        res.writeHead(200, { 'content-type': 'application/x-tolatino-video', 'content-length': String(por.length + mp4Bytes), 'x-segundos': String(seg), 'x-ancho': '1280', 'x-alto': '720', 'x-portada-bytes': String(por.length) });
        res.write(por);
        const trozo = bytesDe(64 * 1024, 9);
        let quedan = mp4Bytes;
        const seguir = () => { while (quedan > 0) { const n = Math.min(quedan, trozo.length); quedan -= n; if (!res.write(n === trozo.length ? trozo : trozo.subarray(0, n))) return res.once('drain', seguir); } res.end(); };
        return seguir();
      }
      // El protocolo de antes (JSON con el MP4 en base64), para medir el código de antes con el mismo doble.
      json(200, { ok: true, segundos: seg, ancho: 1280, alto: 720, mp4: bytesDe(mp4Bytes, 9).toString('base64'), portada: por.toString('base64') });
    });
  });
  const puerto = await escuchar(srv);
  return { url: `http://127.0.0.1:${puerto}`, recibidos, modo: (x) => { modo = x; }, pico: () => picoOcupados, cerrar: () => new Promise((ok) => { srv.closeAllConnections?.(); srv.close(ok); }) };
}

/* Un formulario multipart (un campo «video» o «foto») que se genera POR PARTES: quien sube nunca tiene el archivo entero en memoria. `largo`
   bytes de contenido; `conLargo` pone content-length (Safari en iPhone no lo pone). `trozo` = tamaño de cada parte. */
function formularioEnFlujo({ campo = 'video', nombre = 'clip.mp4', tipo = 'video/mp4', largo, contenido, conLargo = true, trozo = 256 * 1024 }) {
  const borde = `----tolatino${crypto.randomBytes(8).toString('hex')}`;
  const cab = Buffer.from(`--${borde}\r\nContent-Disposition: form-data; name="${campo}"; filename="${nombre}"\r\nContent-Type: ${tipo}\r\n\r\n`);
  const pie = Buffer.from(`\r\n--${borde}--\r\n`);
  const total = cab.length + largo + pie.length;
  const base = bytesDe(trozo, 5);
  let enviado = -1;
  const stream = new ReadableStream({
    pull(c) {
      if (enviado < 0) { enviado = 0; return c.enqueue(new Uint8Array(cab)); }
      if (enviado >= largo) { c.enqueue(new Uint8Array(pie)); return c.close(); }
      const n = Math.min(trozo, largo - enviado);
      const parte = contenido ? contenido.subarray(enviado, enviado + n) : base.subarray(0, n);
      enviado += n;
      c.enqueue(new Uint8Array(parte.buffer, parte.byteOffset, parte.length));
    },
  });
  const headers = { 'content-type': `multipart/form-data; boundary=${borde}` };
  if (conLargo) headers['content-length'] = String(total);
  return { body: stream, headers, total, enviados: () => Math.max(0, enviado) };
}

module.exports = { almacen, video, formularioEnFlujo, bytesDe };
