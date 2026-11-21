// 9t · Medios en flujo · Prueba con dobles (sin servidor, sin base, sin docker, sin red: el almacén y el servicio de video son dobles en
// 127.0.0.1, pruebas/lib/dobles-medios.cjs) del código REAL (pruebas/lib/ts-servidor.cjs cargarApp): la ruta del video, lib/subida.ts
// recibirArchivo, lib/video-negocio.ts, lib/medios.ts, lib/entrega-privada.ts y las rutas que entregan fotos privadas.
//   1. recibirArchivo: un formulario con un campo de texto antes y bordes partidos entre trozos de 7 bytes → el archivo exacto.
//   2. El video: sube sin content-length → 200, en revisión (business_videos + cola «medios»), el MP4 del servicio llega al almacén por partes y
//      firmado con su sha256, el servicio recibe el video con su content-length, la carpeta temporal se borra y el turno se suelta.
//   3. El tope a mitad de la subida: un content-length mentiroso (dice 1 MB, manda 125 MB) → 413 sin pasar nada al servicio ni al almacén;
//      un content-length grande → 413 sin leer el cuerpo.
//   4. El cupo: compartido lleno → 503 + Retry-After y «Prueba en un momento.» sin leer el cuerpo; por proceso (2) → el tercero 503 mientras dos
//      se procesan, y entra otra vez cuando terminan.
//   5. Lo que falla también limpia: no es video (415), servicio caído (503), el almacén falla (la ruta lanza): carpeta borrada y turno suelto.
//   6. Lo que el servidor ya decidía: Free → 403; 10 por día → 429 (sin tomar turno).
//   7. Entregar una foto privada: 200 en flujo con ETag y «private, no-store»; If-None-Match → 304 sin cuerpo; SIN permiso → 404 con o sin
//      If-None-Match y el almacén ni se toca; la variante que falta → la maestra.
//   8. tomarCupo (lib/topes.ts): el candado del cupo antes de contar, lleno → null, la base caída → null (cerrado).
// Guardián mediosEnFlujo. Medida de memoria: scripts/carga/memoria-medios.mjs.
const fs = require('fs'), os = require('os'), path = require('path');
const { cargarApp, RAIZ } = require('../lib/ts-servidor.cjs');
const D = require('../lib/dobles-medios.cjs');
const WEB = path.join(RAIZ, 'apps/web');
const sharp = require(require.resolve('sharp', { paths: [WEB] }));
const { NextRequest } = require(require.resolve('next/server', { paths: [WEB] }));
let n = 0, malas = 0;
const ok = (x, m) => { if (x) { n++; console.log('  ✓', m); } else { malas++; console.log('  ✗', m); } };
const MiB = 1024 * 1024;

(async () => {
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'medios9tflujo-'));
  process.env.TMPDIR = TMP;
  const temporales = () => fs.readdirSync(TMP).filter((d) => d.startsWith('tl-video-'));
  const portada = await sharp({ create: { width: 640, height: 360, channels: 3, background: '#2a7' } }).jpeg().toBuffer();
  const S3 = await D.almacen(), V = await D.video({ portada, mp4Bytes: 3 * MiB });
  Object.assign(process.env, { MEDIOS_S3_URL: S3.url, MEDIOS_KEY_ID: 'doble', MEDIOS_SECRET: 'doble', MEDIOS_BUCKET: 'medios', VIDEO_URL: V.url }); // GUARDIAN-OK: llaves de mentira del doble del almacén en 127.0.0.1 (no hay almacén de verdad detrás)
  try {
    // ── 1 · recibirArchivo ──
    console.log('1 · recibirArchivo por partes');
    const SUB = cargarApp('apps/web/lib/subida.ts', {});
    {
      const contenido = Buffer.concat([D.bytesDe(10000, 4), Buffer.from('\r\n--casi-un-borde\r\n'), D.bytesDe(3000, 8)]);
      const borde = 'xYz123';
      const cuerpo = Buffer.concat([Buffer.from(`--${borde}\r\nContent-Disposition: form-data; name="nota"\r\n\r\nhola\r\n--${borde}\r\nContent-Disposition: form-data; name="video"; filename="a.mov"\r\nContent-Type: video/quicktime\r\n\r\n`), contenido, Buffer.from(`\r\n--${borde}--\r\n`)]);
      let i = 0;
      const body = new ReadableStream({ pull(c) { if (i >= cuerpo.length) return c.close(); c.enqueue(new Uint8Array(cuerpo.subarray(i, i + 7))); i += 7; } });
      const ruta = path.join(TMP, 'r1.bin');
      const r = await SUB.recibirArchivo(new Request('http://x/', { method: 'POST', body, duplex: 'half', headers: { 'content-type': `multipart/form-data; boundary=${borde}` } }), { campo: 'video', tope: 1 * MiB, ruta });
      ok(r.ok && r.bytes === contenido.length && fs.readFileSync(ruta).equals(contenido), `el archivo llega exacto (${r.bytes} B) con un campo de texto antes y bordes partidos en trozos de 7 B`);
      const r2 = await SUB.recibirArchivo(new Request('http://x/', { method: 'POST', body: cuerpo, headers: { 'content-type': `multipart/form-data; boundary=${borde}` } }), { campo: 'foto', tope: 1 * MiB, ruta });
      ok(!r2.ok && r2.motivo === 'sin_archivo', 'sin la parte pedida → sin_archivo');
      const r3 = await SUB.recibirArchivo(new Request('http://x/', { method: 'POST', body: cuerpo, headers: { 'content-type': `multipart/form-data; boundary=${borde}` } }), { campo: 'video', tope: 5000, ruta, margen: 1 * MiB });
      ok(!r3.ok && r3.motivo === 'grande' && fs.statSync(ruta).size <= 5000, `pasa del tope del archivo → grande, y en el disco no quedó más que el tope (${fs.statSync(ruta).size} B ≤ 5000)`);
      fs.rmSync(ruta, { force: true });
    }

    // ── La ruta del video con sus dobles ──
    const yo = { id: '00000000-0000-4000-8000-0000000000aa' };
    const est = { plan: 'pro', hoy: 0, sql: [], cupo: true, tomados: 0, soltados: 0 };
    const db = {
      db: () => ({ query: async (sql, p) => {
        est.sql.push(sql);
        if (/select plan from business_stats_cache/.test(sql)) return { rows: [{ plan: est.plan }], rowCount: 1 };
        if (/count\(\*\)::int as n from business_videos/.test(sql)) return { rows: [{ n: est.hoy }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      } }),
      tx: async (fn) => fn({ query: async (sql, p) => { est.sql.push(sql); return { rows: [{ id: String(est.sql.length) }], rowCount: 1 }; } }),
    };
    const topes = {
      tomarCupo: async () => { if (!est.cupo) return null; est.tomados++; return `ficha${est.tomados}`; },
      renovarCupo: async () => true, soltarCupo: async () => { est.soltados++; },
    };
    const stubs = {
      '@/lib/db': db, '@/lib/cuenta': { mismoOrigen: async () => true, yo: async () => yo }, '@/lib/config': { valor: async () => 30 },
      '@/lib/panel': { accesoPanel: async () => ({ negocio: { id: 'sabor-dominicano', city_id: 'hazleton' }, yo }) }, '@/lib/topes': topes,
    };
    const R = cargarApp('apps/web/app/api/negocio/video/route.ts', stubs);
    const subir = async (f) => {
      const req = new NextRequest('http://127.0.0.1/api/negocio/video?negocio=sabor-dominicano', { method: 'POST', body: f.body, duplex: 'half', headers: f.headers });
      const r = await R.POST(req);
      return { st: r.status, j: await r.json().catch(() => ({})), h: r.headers };
    };
    const limpio = (que) => { ok(temporales().length === 0 && est.tomados === est.soltados, `${que}: carpeta temporal borrada (${temporales().length}) y turno suelto (${est.tomados} tomados, ${est.soltados} sueltos)`); };

    console.log('2 · Subir un video (sin content-length, como Safari)');
    {
      const antes = S3.pedidos.length;
      const f = D.formularioEnFlujo({ largo: 5 * MiB, conLargo: false });
      const r = await subir(f);
      ok(r.st === 200 && r.j.ok && r.j.segundos === 30 && /^\/medios\/v\/[0-9a-f-]{36}\.mp4$/.test(r.j.src), `200 «ok», ${r.j.segundos} s, ${r.j.src}`);
      const put = S3.pedidos.slice(antes).filter((p) => p.metodo === 'PUT');
      const mp4 = put.find((p) => /\.mp4$/.test(p.clave)), jpg = put.find((p) => /\.jpg$/.test(p.clave));
      ok(mp4 && mp4.bytes === 3 * MiB && mp4.largo === 3 * MiB && mp4.shaOk && mp4.firmado && mp4.tipo === 'video/mp4', `el MP4 del servicio llega al almacén entero (${mp4?.bytes} B), con content-length y firmado con su sha256`);
      ok(jpg && jpg.tipo === 'image/jpeg' && jpg.shaOk, 'y su portada (JPEG por sharp)');
      ok(put.length === 2, `solo se guardan el MP4 procesado y la portada (${put.length} PUT): el original nunca`);
      const v = V.recibidos.at(-1);
      ok(v.bytes === 5 * MiB && v.largo === 5 * MiB && /application\/x-tolatino-video/.test(v.accept) && v.max === '30', `el servicio recibe el video por partes con su content-length (${v.bytes} B), pide el binario y el recorte a video_max_s (${v.max})`);
      ok(est.sql.some((s) => /insert into business_videos/.test(s)) && est.sql.some((s) => /insert into queue_items \(queue, subject_kind[\s\S]*'medios', 'business_video'/.test(s)), 'queda EN REVISIÓN: la fila y su caso en la cola «medios»');
      limpio('después de subir');
    }

    console.log('3 · El tope a mitad de la subida');
    {
      const antes = V.recibidos.length, antesS3 = S3.pedidos.length;
      const f = D.formularioEnFlujo({ largo: 125 * MiB, conLargo: false });
      f.headers['content-length'] = String(1 * MiB); // miente: el tope no confía en él
      const r = await subir(f);
      ok(r.st === 413 && /máximo 120 MB/.test(r.j.mensaje?.es ?? ''), `content-length mentiroso (1 MB) y 125 MB de cuerpo → 413 «${r.j.mensaje?.es}»`);
      ok(V.recibidos.length === antes && S3.pedidos.length === antesS3, 'nada llegó al servicio ni al almacén');
      limpio('cortado a mitad');
      const g = D.formularioEnFlujo({ largo: 1 * MiB });
      g.headers['content-length'] = String(121 * MiB);
      const r2 = await subir(g);
      ok(r2.st === 413 && g.enviados() <= 256 * 1024, `content-length de 121 MB → 413 sin leer el cuerpo (${g.enviados()} B leídos)`);
    }

    console.log('4 · El cupo de videos a la vez');
    {
      est.cupo = false;
      const f = D.formularioEnFlujo({ largo: 2 * MiB });
      const r = await subir(f);
      ok(r.st === 503 && r.h.get('retry-after') === '30' && r.j.mensaje?.es === 'Estamos preparando otros videos en este momento. Prueba en un momento.' && r.j.mensaje?.en === 'We are processing other videos right now. Try again in a moment.',
        `cupo compartido lleno → 503, Retry-After ${r.h.get('retry-after')}, «${r.j.mensaje?.es}» / «${r.j.mensaje?.en}»`);
      ok(f.enviados() <= 256 * 1024, `sin leer el cuerpo (${f.enviados()} B)`);
      est.cupo = true;
      V.modo({ esperaMs: 700 });
      const dos = [subir(D.formularioEnFlujo({ largo: 1 * MiB })), subir(D.formularioEnFlujo({ largo: 1 * MiB }))];
      await new Promise((ok2) => setTimeout(ok2, 250));
      const tercero = await subir(D.formularioEnFlujo({ largo: 1 * MiB }));
      ok(tercero.st === 503 && tercero.h.get('retry-after') === '30', `por proceso: con 2 procesándose, el tercero → ${tercero.st}`);
      const [a, b] = await Promise.all(dos);
      ok(a.st === 200 && b.st === 200, `los dos de antes terminan bien (${a.st}, ${b.st})`);
      V.modo('ok');
      const cuarto = await subir(D.formularioEnFlujo({ largo: 1 * MiB }));
      ok(cuarto.st === 200, `terminados, entra otro (${cuarto.st})`);
      limpio('después del cupo');
    }

    console.log('5 · Lo que falla también limpia');
    {
      V.modo('no_es_video');
      const r = await subir(D.formularioEnFlujo({ largo: 1 * MiB }));
      ok(r.st === 415 && /no parece un video/.test(r.j.mensaje?.es ?? ''), `no es video → 415 «${r.j.mensaje?.es}»`);
      limpio('no es video');
      V.modo('caido');
      const r2 = await subir(D.formularioEnFlujo({ largo: 1 * MiB }));
      ok(r2.st === 503 && /No pudimos procesar/.test(r2.j.mensaje?.es ?? ''), `el servicio se cae → 503 «${r2.j.mensaje?.es}»`);
      limpio('servicio caído');
      V.modo('ok');
      S3.fallar('PUT', 500);
      let lanzo = null;
      try { await subir(D.formularioEnFlujo({ largo: 1 * MiB })); } catch (e) { lanzo = e; }
      ok(lanzo && /almacenamiento 500/.test(lanzo.message), `el almacén falla → la ruta lanza (${lanzo?.message?.slice(0, 40)})`);
      limpio('almacén caído');
    }

    console.log('6 · Lo que el servidor ya decidía');
    {
      const t0 = est.tomados;
      est.plan = 'free';
      const r = await subir(D.formularioEnFlujo({ largo: 1 * MiB }));
      ok(r.st === 403 && /es de Pro/.test(r.j.mensaje?.es ?? ''), `Free → 403 «${r.j.mensaje?.es}»`);
      est.plan = 'pro'; est.hoy = 10;
      const r2 = await subir(D.formularioEnFlujo({ largo: 1 * MiB }));
      ok(r2.st === 429 && /Prueba mañana/.test(r2.j.mensaje?.es ?? ''), `10 por día → 429 «${r2.j.mensaje?.es}»`);
      ok(est.tomados === t0, 'ninguno de los dos tomó turno');
      est.hoy = 0;
    }

    console.log('7 · Entregar una foto privada');
    {
      const quien = { id: 'cliente' };
      const id = '11111111-2222-4333-8444-555555555555';
      const datos = D.bytesDe(300 * 1024, 11);
      const md5 = require('crypto').createHash('md5').update(datos).digest('hex');
      S3.objetos.set('privado/e/foto.jpg', { bytes: datos.length, etag: `"${md5}"`, tipo: 'image/jpeg', datos });
      const st = { panel: false };
      const E = cargarApp('apps/web/app/api/entrega/foto/[id]/route.ts', {
        '@/lib/db': { db: () => ({ query: async () => ({ rows: [{ url: 'privado/e/foto.jpg', uploaded_by: 'repartidor', hoy: true, cliente: 'cliente', biz: 'b1', city: 'hazleton', numero: '7' }] }) }), tx: async () => undefined },
        '@/lib/cuenta': { yo: async () => quien }, '@/lib/panel': { accesoPanel: async () => (st.panel ? {} : null) }, '@/lib/admin': { staff: async () => null, auditar: async () => undefined },
      });
      const pedir = async (h = {}) => { const r = await E.GET(new Request(`http://x/api/entrega/foto/${id}`, { headers: h }), { params: Promise.resolve({ id }) }); const b = r.body ? Buffer.from(await r.arrayBuffer()) : Buffer.alloc(0); return { st: r.status, b, h: r.headers }; };
      let a0 = S3.pedidos.length;
      const r = await pedir();
      ok(r.st === 200 && r.b.equals(datos) && r.h.get('etag') === `"${md5}"` && r.h.get('content-length') === String(datos.length), `con permiso: 200 en flujo, el contenido exacto, ETag ${r.h.get('etag')} y content-length`);
      ok(r.h.get('cache-control') === 'private, no-store' && r.h.get('x-content-type-options') === 'nosniff', `caché «${r.h.get('cache-control')}» y nosniff (como antes, nunca public)`);
      a0 = S3.pedidos.length;
      const r304 = await pedir({ 'if-none-match': `"${md5}"` });
      const p304 = S3.pedidos.slice(a0);
      ok(r304.st === 304 && r304.b.length === 0 && r304.h.get('etag') === `"${md5}"` && r304.h.get('cache-control') === 'private, no-store', `If-None-Match igual → 304 sin cuerpo, con su ETag y «private, no-store»`);
      ok(p304.length === 1 && p304[0].inm === `"${md5}"` && p304[0].status === 304 && p304[0].bytes === 0, 'el almacén contestó 304: el cuerpo ni se leyó');
      const rOtra = await pedir({ 'if-none-match': '"otra-version"' });
      ok(rOtra.st === 200 && rOtra.b.equals(datos), 'If-None-Match de otra versión → 200 con el contenido');
      quien.id = 'un-extrano';
      a0 = S3.pedidos.length;
      const n1 = await pedir({ 'if-none-match': `"${md5}"` }), n2 = await pedir();
      ok(n1.st === 404 && n2.st === 404 && n1.b.length === 0, `SIN permiso: 404 con If-None-Match (${n1.st}) y sin él (${n2.st}): un 304 nunca dice que existe`);
      ok(S3.pedidos.length === a0, 'y el almacén ni se tocó');
      quien.id = 'cliente';

      // Como lo deja Next en el servidor (CI 44892361124: dm9t y rev9u2 colgadas): todo fetch GET SIN señal sale con el cuerpo partido en dos
      // ramas y Next se queda con una. Soltar la nuestra y esperar no termina nunca, y la rama guardada junta el objeto entero en memoria.
      // abrirObjeto pide con señal (Next no lo toca) y suelta sin esperar: una foto que no está en el almacén RESPONDE.
      {
        const fetch0 = globalThis.fetch, guardadas = [];
        globalThis.fetch = async (u, o) => { const r = await fetch0(u, o); if (o?.signal || (o?.method ?? 'GET') !== 'GET' || !r.body) return r; const [x, y] = r.body.tee(); guardadas.push(y); return new Response(x, { status: r.status, headers: r.headers }); };
        try {
          const conTope = (p) => Promise.race([p.then((x) => `respondió ${x.st}`, (e) => `falló: ${String(e.message).slice(0, 40)}`), new Promise((ya) => setTimeout(() => ya('colgada'), 3000))]);
          const bien = await conTope(pedir());
          S3.objetos.delete('privado/e/foto.jpg');
          const falta = await conTope(pedir());
          ok(bien === 'respondió 200' && falta !== 'colgada' && !/200/.test(falta), `con el fetch como lo envuelve Next: la foto sale (${bien}) y una que NO está en el almacén responde, no se cuelga (${falta})`);
          ok(guardadas.length === 0, `el pedido al almacén lleva señal: Next no parte el cuerpo ni guarda una copia (${guardadas.length} partidos)`);
        } finally { globalThis.fetch = fetch0; S3.objetos.set('privado/e/foto.jpg', { bytes: datos.length, etag: `"${md5}"`, tipo: 'image/jpeg', datos }); }
      }

      // La variante que falta → la maestra (Fotos a la medida, F3).
      S3.objetos.set('privado/o/maestra.jpg', { bytes: datos.length, etag: `"${md5}"`, tipo: 'image/jpeg', datos });
      const P = cargarApp('apps/web/app/api/medios/privada/[id]/route.ts', {
        '@/lib/db': { db: () => ({}), tx: async () => undefined }, '@/lib/cuenta': { yo: async () => quien }, '@/lib/admin': { staff: async () => null, auditar: async () => undefined },
        '@/lib/admin-colas': { colasVisibles: () => [] }, '@/lib/sistema/vidrio': { vidrioVigente: async () => false },
        '@/lib/fotos-privadas': { anchoServido: () => 640, llaveVariantePrivada: () => 'privado/o/maestra.w640.webp', permisoFotoPrivada: async () => (quien.id === 'cliente' ? { ok: true, por: 'cliente', llave: 'privado/o/maestra.jpg', anchos: [640] } : { ok: false }) },
      });
      const rp = await P.GET(new NextRequest(`http://x/api/medios/privada/${id}?w=640`, { headers: { accept: 'image/webp' } }), { params: Promise.resolve({ id }) });
      const bp = Buffer.from(await rp.arrayBuffer());
      ok(rp.status === 200 && rp.headers.get('content-type') === 'image/jpeg' && bp.equals(datos) && rp.headers.get('vary') === 'Accept, Cookie', 'privada: sin la variante WebP sale la maestra JPEG (vary: Accept, Cookie)');
      quien.id = 'un-extrano';
      const rn = await P.GET(new NextRequest(`http://x/api/medios/privada/${id}`, { headers: { 'if-none-match': `"${md5}"` } }), { params: Promise.resolve({ id }) });
      ok(rn.status === 404, 'privada sin permiso, con If-None-Match → 404');
    }

    console.log('8 · tomarCupo (lib/topes.ts)');
    {
      const log = []; let n0 = 0, cae = false;
      const T = cargarApp('apps/web/lib/topes.ts', {
        'apps/web/lib/cifrado.ts': { huella: (x) => x }, 'apps/web/lib/db.ts': { db: () => ({ query: async (s) => { log.push(s); return { rowCount: 1, rows: [] }; } }),
          tx: async (fn) => { if (cae) throw new Error('base caída'); return fn({ query: async (s) => { log.push(s); return /count\(\*\)/.test(s) ? { rows: [{ n: n0 }] } : { rows: [], rowCount: 1 }; } }); } },
      });
      const f = await T.tomarCupo('video_cupo', 3, 90);
      const iL = log.findIndex((s) => /pg_advisory_xact_lock/.test(s)), iC = log.findIndex((s) => /count\(\*\)/.test(s)), iI = log.findIndex((s) => /insert into rate_counters/.test(s));
      ok(typeof f === 'string' && f.length === 32 && iL >= 0 && iL < iC && iC < iI, 'con lugar: candado del cupo → contar → tomar (una ficha)');
      n0 = 3; log.length = 0;
      ok(await T.tomarCupo('video_cupo', 3, 90) === null && !log.some((s) => /insert/.test(s)), 'lleno (3 de 3) → null, sin tomar');
      cae = true;
      ok(await T.tomarCupo('video_cupo', 3, 90) === null, 'la base no responde → null (cerrado)');
    }
  } finally {
    await S3.cerrar(); await V.cerrar();
    fs.rmSync(TMP, { recursive: true, force: true });
  }
  console.log(`\nmedios9tflujo · ${n} ✓ · ${malas} ✗`);
  process.exit(malas ? 1 : 0);
})().catch((e) => { console.error('FALLO', e.stack || e.message); process.exit(1); });
