// Fotos a la medida (decisión AI, 20 nov) · De punta a punta con el almacén de verdad (Garage) y el servidor:
//   1. una foto como de cámara de 2400×1800 sube por /api/medios → su fila de media tiene los 4 anchos (320, 640, 1080, 1600) con el peso de cada
//      uno; cada variante EXISTE en el almacén (sin respaldo de por medio), es WebP del ancho justo, sin EXIF, y pesa menos que la maestra
//   2. una foto de 500 px → solo 320 y 500 (nunca se agranda)
//   3. una variante que no se generó (w640 de la de 500) → la maestra JPEG en esa misma dirección, con caché corta; un navegador sin WebP → la
//      maestra; y en un navegador de verdad, la <img> de la variante que falta se ve (no se rompe)
//   4. el barrido: a una foto se le quitan las variantes del almacén y lo anotado → el barrido las vuelve a hacer; una fila cuya maestra no existe
//      queda con '{}' (no se reintenta); una foto de afuera (Pexels) no se toca
// La regla del respaldo es la de nginx (pruebas/lib/negocio-nuevo.cjs servirMedio; la de nginx la prueba pruebas/infra/medios-nginx.test.sh).
// Precondición propia: una cuenta nueva (teléfono 555 libre). Necesita el almacén de fotos (el CI lo tiene): sin él /api/medios contesta 503 y la
// prueba FALLA, salvo con FOT9U_SIN_ALMACEN=1 (una corrida local sin almacén, que lo dice en la salida). Guardián fotosConVariantes.
const ENT = require('../lib/entorno.cjs');
const http = require('http');
const { randomUUID } = require('crypto');
const { chromium } = require('playwright');
const { entrarComo, telLibre, sql, servirMedio, delAlmacen, medios } = require('../lib/negocio-nuevo.cjs');
const { multipart, LIMITE } = require('../lib/subida-cruda.cjs');
const { cargar } = require('../lib/ts-servidor.cjs');
const sharp = require(ENT.RAIZ + '/apps/web/node_modules/sharp');
const B = ENT.B;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const WEBP = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8', SIN_WEBP = 'image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5';
const ANCHOS = [320, 640, 1080, 1600];

// Una imagen «como foto» (degradados, formas, grano suave), con EXIF de cámara.
function comoFoto(W, H) {
  const b = Buffer.alloc(W * H * 3); let x = 11;
  const azar = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = (j * W + i) * 3, u = i / W, v = j / H, g = (azar() - 0.5) * 18, c = (z) => Math.max(0, Math.min(255, z));
    b[k] = c(120 + 90 * Math.sin(u * 6.1 + v * 2.3) + 30 * Math.sin(u * 37 + v * 11) + g);
    b[k + 1] = c(110 + 80 * Math.cos(v * 5.3 - u * 1.7) + 25 * Math.sin(u * 23 - v * 29) + g);
    b[k + 2] = c(100 + 70 * Math.sin((u + v) * 4.2) + 20 * Math.cos(v * 41) + g);
  }
  return sharp(b, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 92 }).withExif({ IFD0: { Make: 'Camara', Copyright: 'fot9u' } }).toBuffer();
}
// Sube con la sesión de la página (mismo origen) y devuelve { status, json }.
const subir = (cookie, bytes) => new Promise((res, rej) => {
  const cuerpo = multipart(bytes, 'foto.jpg', 'image/jpeg');
  const q = http.request(B + '/api/medios', { method: 'POST', headers: { cookie, origin: B, 'content-type': `multipart/form-data; boundary=${LIMITE}`, 'content-length': String(cuerpo.length) } }, (r) => {
    const c = []; r.on('data', (x) => c.push(x)); r.on('end', () => { let json = null; try { json = JSON.parse(Buffer.concat(c).toString()); } catch { /* sin json */ } res({ status: r.statusCode, json }); });
  });
  q.on('error', rej); q.end(cuerpo);
});
const fila = (id) => { const [w, b, by, at] = sql(`select coalesce(array_to_string(var_widths, ','), 'null'), coalesce(array_to_string(var_bytes, ','), 'null'), coalesce(bytes::text, 'null'), (var_at is not null)::text from media where id = '${id}'`).split('|'); return { w, b, bytes: by, at: at === 'true' }; };
const barrer = () => fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': ENT.TOK } }).then((r) => r.json());

(async () => {
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext(); await medios(ctx); const p = await ctx.newPage();
    await entrarComo(p, telLibre(), { nombre: 'Foto', apellido: 'Medida' });
    const cookie = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');

    // ── 1. Una foto grande ──
    const r1 = await subir(cookie, await comoFoto(2400, 1800));
    if (r1.status === 503 && process.env.FOT9U_SIN_ALMACEN === '1') { console.log('  · sin almacén de fotos (local): /api/medios contesta 503 — esta prueba corre en el CI'); console.log(`OK (${n} comprobaciones, parcial)`); return; }
    ok(r1.status === 200 && r1.json?.ok, `hay almacén de fotos y la foto sube (${r1.status}${r1.status === 503 ? ': sin almacén; esta prueba necesita Garage' : ''})`);
    const id = r1.json.id, f1 = fila(id);
    const maestra = await delAlmacen(`/n/${id}.jpg`);
    ok(maestra.s === 200 && (await sharp(maestra.b).metadata()).width === 1600, `la maestra sigue igual: JPEG de 1600 (${maestra.b.length} B)`);
    ok(f1.w === '320,640,1080,1600' && f1.at && f1.bytes === String(maestra.b.length), `la fila tiene los 4 anchos, el peso de la maestra y cuándo (var_widths ${f1.w}, bytes ${f1.bytes})`);
    const pesos = f1.b.split(',').map(Number);
    for (const [i, w] of ANCHOS.entries()) {
      const d = await delAlmacen(`/n/${id}.w${w}.webp`);
      const m = d.s === 200 ? await sharp(d.b).metadata() : {};
      ok(d.s === 200 && m.format === 'webp' && m.width === w && !m.exif && d.b.length === pesos[i] && d.b.length < maestra.b.length,
        `w${w}: existe en el almacén, WebP de ${m.width} px, sin EXIF, ${d.b.length} B < ${maestra.b.length} B de la maestra (y es lo anotado)`);
      const s = await servirMedio(`/medios/n/${id}.w${w}.webp`, WEBP);
      ok(s.s === 200 && s.tipo === 'image/webp' && /max-age=31536000/.test(s.cc) && s.b.equals(d.b), `w${w} por /medios con WebP: la variante, un año`);
    }

    // ── 2. Una foto de 500 px ──
    const r2 = await subir(cookie, await comoFoto(500, 375));
    ok(r2.status === 200, `la foto de 500 px sube (${r2.status})`);
    const id2 = r2.json.id, f2 = fila(id2);
    ok(f2.w === '320,500', `la de 500 px: solo 320 y 500 (${f2.w})`);
    const m2 = await delAlmacen(`/n/${id2}.jpg`);
    for (const w of [320, 500]) { const d = await delAlmacen(`/n/${id2}.w${w}.webp`); ok(d.s === 200 && (await sharp(d.b).metadata()).width === w, `w${w} de la de 500: existe y mide ${w}`); }
    ok((await delAlmacen(`/n/${id2}.w640.webp`)).s === 404 && (await delAlmacen(`/n/${id2}.w1080.webp`)).s === 404, 'la de 500 no tiene 640 ni 1080 (nunca se agranda)');

    // ── 3. El respaldo ──
    const s640 = await servirMedio(`/medios/n/${id2}.w640.webp`, WEBP);
    ok(s640.s === 200 && s640.tipo === 'image/jpeg' && s640.cc === 'public, max-age=60' && s640.b.equals(m2.b), 'una variante que no se generó (w640 de la de 500) → la maestra JPEG en esa misma dirección, 60 s');
    const sNo = await servirMedio(`/medios/n/${id}.w640.webp`, SIN_WEBP);
    ok(sNo.s === 200 && sNo.tipo === 'image/jpeg' && sNo.cc === 'private, max-age=60' && sNo.b.equals(maestra.b), 'un navegador sin image/webp en Accept → la maestra JPEG, private 60 s');
    // En un navegador de verdad: la <img> de la variante que falta se ve (la maestra de 500), la que existe trae su ancho.
    await p.goto(B + '/entrar');
    const anchoImg = (src) => p.evaluate((u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i.naturalWidth); i.onerror = () => r(-1); i.src = u; }), src);
    ok(await anchoImg(`/medios/n/${id}.w640.webp`) === 640, 'en el navegador: la <img> de la variante de 640 mide 640');
    ok(await anchoImg(`/medios/n/${id2}.w1080.webp`) === 500, 'en el navegador: la <img> de una variante que no existe se ve (la maestra, 500), no se rompe');

    // ── 4. El barrido ──
    // Se le quitan las variantes del almacén (con la llave de la app; lib/medios.ts real) y lo anotado: queda como una foto de antes.
    process.env.MEDIOS_S3_URL = process.env.MEDIOS_S3_URL || `http://127.0.0.1:${process.env.PRUEBAS_S3_PUERTO || 3900}`;
    const A = cargar('apps/web/lib/medios.ts');
    for (const w of [320, 500]) await A.borrarObjeto(`n/${id2}.w${w}.webp`);
    ok((await delAlmacen(`/n/${id2}.w320.webp`)).s === 404, 'a la foto de 500 se le quitaron las variantes del almacén');
    // La más vieja (el barrido va de la más vieja a la más nueva, de a 20): esta prueba no depende de lo que dejaron otras.
    sql(`update media set var_widths = null, var_bytes = null, var_at = null, bytes = null, created_at = '2001-01-01' where id = '${id2}'`);
    // Una fila pública cuya maestra no existe en el almacén, y una foto de afuera: las dos de esta persona, las dos «de antes».
    const gone = randomUUID(), fuera = randomUUID();
    sql(`insert into media (id, owner_kind, owner_id, url, status, uploaded_by, created_at)
         select x.id::uuid, 'user', m.uploaded_by::text, x.url, 'visible', m.uploaded_by, '2001-01-01' from media m,
                (values ('${gone}', '/medios/n/${gone}.jpg'), ('${fuera}', 'https://images.pexels.com/photos/1/fot9u.jpeg')) x(id, url) where m.id = '${id2}'`);
    let r = null;
    for (let i = 0; i < 6 && !fila(id2).at; i++) { r = await barrer(); if (!fila(id2).at) await new Promise((x) => setTimeout(x, 2000)); }
    const f3 = fila(id2);
    ok(f3.at && f3.w === '320,500' && f3.bytes === String(m2.b.length), `el barrido la convirtió: 320 y 500 anotados otra vez (${f3.w}; ${JSON.stringify(r?.fallas ?? [])})`);
    for (const w of [320, 500]) { const d = await delAlmacen(`/n/${id2}.w${w}.webp`); ok(d.s === 200 && (await sharp(d.b).metadata()).format === 'webp', `el barrido volvió a guardar w${w} en el almacén`); }
    const fg = fila(gone);
    ok(fg.at && fg.w === '', `una fila cuya maestra no existe queda con '{}' y no se reintenta (var_widths «${fg.w}»)`);
    ok(!fila(fuera).at, 'una foto de afuera (Pexels) no se toca');
    ok(sql(`select last_error is null from system_jobs where name = 'barrido.fotosVariantes'`) === 't', 'la tarea fotosVariantes corrió en el barrido sin error');
    sql(`update media set status = 'removed', removed_reason = 'fot9u', removed_at = now() where id in ('${gone}', '${fuera}')`);
    console.log(`OK (${n} comprobaciones)`);
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await b.close(); }
})();
