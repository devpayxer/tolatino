// Fotos a la medida (decisión AI, 20 nov) · Prueba pura de lib/fotos-variantes.ts (el archivo REAL, transpilado: pruebas/lib/ts-servidor.cjs), sin
// servidor, sin base y sin almacén (corre en cualquier lado, también en el CI con las al revés):
//   - variantesDe sobre imágenes generadas: ancha (2400×1800 → la maestra de 1600 como la deja /api/medios), angosta de 500, alta, con
//     transparencia y diminuta → los anchos justos (nunca agranda; la más grande mide lo que la maestra), WebP de verdad, cada variante pesa
//     menos que la maestra en una imagen como foto, y sin EXIF aunque la entrada lo traiga
//   - guardarVariantes: guarda n/<uuid>.w<ancho>.webp como image/webp y anota la fila; si el almacén falla NO lanza y no anota nada (el barrido
//     repara); si la maestra desapareció mientras tanto (la purga), saca lo que acaba de guardar; una imagen rota no guarda nada
//   - barrerVariantes: convierte, copia lo anotado del original a una copia, marca '{}' una maestra que ya no está y deja para después un error
//     del almacén; la consulta es la del índice parcial (0195)
// Guardián fotosConVariantes. La prueba de punta a punta (con almacén de verdad) es pruebas/e2e/fot9u.cjs.
const path = require('path');
const { cargar, RAIZ } = require('../lib/ts-servidor.cjs');
const sharp = require(path.join(RAIZ, 'apps/web/node_modules/sharp'));
let n = 0, malas = 0;
const ok = (x, m) => { if (x) { n++; console.log('  ✓', m); } else { malas++; console.log('  ✗', m); } };

// Una imagen «como foto»: degradados, formas y grano suave (el ruido puro no se parece a una foto y no comprime como una).
function comoFoto(W, H, canales = 3, semilla = 7) {
  const b = Buffer.alloc(W * H * canales); let x = semilla;
  const azar = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = (j * W + i) * canales, u = i / W, v = j / H, g = (azar() - 0.5) * 18;
    const c = (z) => Math.max(0, Math.min(255, z));
    b[k] = c(120 + 90 * Math.sin(u * 6.1 + v * 2.3) + 30 * Math.sin(u * 37 + v * 11) + g);
    b[k + 1] = c(110 + 80 * Math.cos(v * 5.3 - u * 1.7) + 25 * Math.sin(u * 23 - v * 29) + g);
    b[k + 2] = c(100 + 70 * Math.sin((u + v) * 4.2) + 20 * Math.cos(v * 41) + g);
    if (canales === 4) b[k + 3] = c(255 * (0.5 + 0.5 * Math.sin(u * 9)));
  }
  return sharp(b, { raw: { width: W, height: H, channels: canales } });
}
// La maestra como la deja app/api/medios/route.ts (enderezar, 1600 como mucho, JPEG q82 mozjpeg, sin metadatos).
const comoMaestra = (buf) => sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });

(async () => {
  // Las dependencias del archivo: base y almacén de mentira (cada caso los cambia).
  const Q = [], G = new Map(), B = [];
  const almacen = {
    guardar: async (k, b, t) => { G.set(k, { b, t }); }, existe: async () => true, leer: async (k) => { const x = G.get(k); if (!x) throw new Error('almacenamiento 404: NoSuchKey'); return x.b; },
  };
  const medios = {
    guardarObjeto: (...a) => almacen.guardar(...a), existeObjeto: (k) => almacen.existe(k), leerObjeto: (k) => almacen.leer(k),
    borrarObjeto: async (k) => { B.push(k); G.delete(k); }, mediosListos: () => true,
  };
  let respuestas = () => ({ rows: [], rowCount: 0 });
  const base = { db: () => ({ query: async (sql, params) => { Q.push({ sql, params }); return respuestas(sql, params); } }) };
  const F = cargar('apps/web/lib/fotos-variantes.ts', { './db': base, './medios': medios });

  // ── anchosDe ──
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok(eq(F.anchosDe(1600), [320, 640, 1080, 1600]), 'anchosDe(1600) → 320, 640, 1080, 1600');
  ok(eq(F.anchosDe(2400), [320, 640, 1080, 1600]), 'anchosDe(2400) → hasta 1600 (nunca más)');
  ok(eq(F.anchosDe(1200), [320, 640, 1080, 1200]) && eq(F.anchosDe(640), [320, 640]) && eq(F.anchosDe(500), [320, 500]) && eq(F.anchosDe(200), [200]),
    'la más grande mide lo que la maestra (1200 → …1080, 1200; 640 → 320, 640; 500 → 320, 500; 200 → 200)');
  ok(eq(F.anchosDe(0), []) && eq(F.anchosDe(NaN), []), 'sin ancho → ninguna');

  // ── variantesDe ──
  const conExif = { IFD0: { Copyright: 'Prueba To\'Latino', Artist: 'Camara' } };
  const ancha = await comoMaestra(await comoFoto(2400, 1800).jpeg({ quality: 92 }).withExif(conExif).toBuffer());
  ok(ancha.info.width === 1600 && ancha.info.height === 1200, `la maestra de una foto de 2400×1800 mide 1600×1200 (${ancha.info.width}×${ancha.info.height}, ${ancha.data.length} B)`);
  let t = process.hrtime.bigint();
  const va = await F.variantesDe(ancha.data, ancha.info.width);
  const ms = Number(process.hrtime.bigint() - t) / 1e6;
  ok(eq(va.map((v) => v.width), [320, 640, 1080, 1600]), `ancha: 4 variantes (${va.map((v) => `${v.width}:${v.buffer.length} B`).join(' · ')}; ${ms.toFixed(0)} ms)`);
  for (const v of va) {
    const m = await sharp(v.buffer).metadata();
    ok(m.format === 'webp' && m.width === v.width && m.height === Math.round(v.width * 0.75) && v.buffer.length < ancha.data.length,
      `w${v.width}: WebP de ${m.width}×${m.height}, pesa menos que la maestra (${v.buffer.length} < ${ancha.data.length})`);
  }
  // EXIF: una entrada CON EXIF (no la maestra, que ya viene sin) → las variantes salen sin EXIF, sin ICC y sin XMP.
  const crudaConExif = await comoFoto(800, 600).jpeg({ quality: 90 }).withExif(conExif).toBuffer();
  ok(!!(await sharp(crudaConExif).metadata()).exif, 'la entrada de prueba trae EXIF (si no, la comprobación de abajo no prueba nada)');
  const sinMeta = await Promise.all((await F.variantesDe(crudaConExif, 800)).map(async (v) => sharp(v.buffer).metadata()));
  ok(sinMeta.every((m) => !m.exif && !m.icc && !m.xmp), 'las variantes salen sin EXIF, ICC ni XMP');

  const angosta = await comoMaestra(await comoFoto(500, 375).jpeg({ quality: 92 }).toBuffer());
  const vn = await F.variantesDe(angosta.data, angosta.info.width);
  const mn = await Promise.all(vn.map((v) => sharp(v.buffer).metadata()));
  ok(eq(vn.map((v) => v.width), [320, 500]) && mn.every((m, i) => m.width === vn[i].width && m.format === 'webp'), `angosta de 500: solo 320 y 500, sin agrandar (${mn.map((m) => `${m.width}×${m.height}`).join(', ')})`);
  ok(vn.every((v) => v.buffer.length < angosta.data.length), `angosta: cada variante pesa menos que la maestra (${vn.map((v) => v.buffer.length).join(', ')} < ${angosta.data.length})`);

  const alta = await comoMaestra(await comoFoto(1200, 2400).jpeg({ quality: 92 }).toBuffer());
  const vt = await F.variantesDe(alta.data, alta.info.width);
  const mt = await Promise.all(vt.map((v) => sharp(v.buffer).metadata()));
  ok(alta.info.width === 800 && eq(vt.map((v) => v.width), [320, 640, 800]) && mt.every((m, i) => m.width === vt[i].width && m.height === vt[i].width * 2),
    `alta (1200×2400 → maestra 800×1600): 320, 640 y 800, la proporción intacta (${mt.map((m) => `${m.width}×${m.height}`).join(', ')})`);

  const png = await comoFoto(700, 500, 4).png().toBuffer();
  const vp = await F.variantesDe(png, 700);
  const mp = await Promise.all(vp.map((v) => sharp(v.buffer).metadata()));
  ok(eq(vp.map((v) => v.width), [320, 640, 700]) && mp.every((m, i) => m.width === vp[i].width && m.hasAlpha), `con transparencia (700 px): 320, 640, 700 y la transparencia se queda (WebP la guarda)`);

  const chica = await comoFoto(200, 150).jpeg().toBuffer();
  const vc = await F.variantesDe(chica, 200);
  ok(eq(vc.map((v) => v.width), [200]) && (await sharp(vc[0].buffer).metadata()).width === 200, 'diminuta (200 px): una sola, de 200 (nunca 320 agrandada)');

  // ── guardarVariantes ──
  const UU = '0f0e0d0c-0b0a-4908-8706-050403020100';
  Q.length = 0; G.clear();
  ok(await F.guardarVariantes(UU, ancha.data, 1600) === 'ok', 'guardarVariantes → ok');
  ok(eq([...G.keys()].sort(), [320, 640, 1080, 1600].map((w) => `n/${UU}.w${w}.webp`).sort()) && [...G.values()].every((x) => x.t === 'image/webp'),
    'guarda n/<uuid>.w<ancho>.webp, una por ancho, como image/webp');
  const up = Q.find((q) => /^update media set bytes = \$2, var_widths/.test(q.sql));
  ok(up && eq(up.params[0], [UU]) && up.params[1] === ancha.data.length && eq(up.params[2], [320, 640, 1080, 1600]) && eq(up.params[3], [320, 640, 1080, 1600].map((w) => G.get(`n/${UU}.w${w}.webp`).b.length)),
    'anota en la fila: el peso de la maestra, los anchos y el peso de cada uno (en el mismo orden)');

  Q.length = 0; G.clear();
  almacen.guardar = async () => { throw new Error('almacenamiento 503: caído'); };
  let x; try { x = await F.guardarVariantes(UU, ancha.data, 1600); } catch { x = 'lanzó'; }
  ok(x === 'fallo' && !Q.some((q) => /update media/.test(q.sql)), `el almacén falla → no lanza (la subida vale) y no anota nada (${x})`);
  almacen.guardar = async (k, b, ty) => { G.set(k, { b, t: ty }); };

  Q.length = 0; G.clear(); B.length = 0;
  almacen.existe = async () => false;
  x = await F.guardarVariantes(UU, ancha.data, 1600);
  ok(x === 'sin_maestra' && G.size === 0 && B.length === 4 && !Q.some((q) => /update media set bytes/.test(q.sql)), 'la maestra desapareció mientras tanto (la purga) → saca lo que acaba de guardar y no anota');
  almacen.existe = async () => true;

  Q.length = 0; G.clear();
  x = await F.guardarVariantes(UU, Buffer.from('esto no es una foto'), null);
  ok(x === 'ilegible' && G.size === 0 && !Q.length, 'una imagen rota → «ilegible», nada guardado');

  ok(eq(F.clavesVariantes(`n/${UU}.jpg`, 500, [320, 500]), [320, 500, 640, 1080, 1600].map((w) => `n/${UU}.w${w}.webp`)) && eq(F.clavesVariantes('privado/m/x.jpg', 500), []),
    'clavesVariantes: todas las que pueden existir de una maestra pública (y ninguna de una privada)');

  // ── barrerVariantes ──
  const A = '1a0e0d0c-0b0a-4908-8706-050403020101', SIN = '2a0e0d0c-0b0a-4908-8706-050403020102', ORIG = '3a0e0d0c-0b0a-4908-8706-050403020103', COPIA = '4a0e0d0c-0b0a-4908-8706-050403020104', CAE = '5a0e0d0c-0b0a-4908-8706-050403020105';
  G.clear(); Q.length = 0;
  G.set(`n/${A}.jpg`, { b: angosta.data, t: 'image/jpeg' }); G.set(`n/${CAE}.jpg`, { b: angosta.data, t: 'image/jpeg' });
  const leerAntes = almacen.leer;
  almacen.leer = async (k) => { if (k === `n/${CAE}.jpg`) throw new Error('almacenamiento 500: lento'); return leerAntes(k); };
  respuestas = (sql) => {
    if (/^select id::text, url from media/.test(sql)) return { rows: [A, SIN, CAE].map((id) => ({ id, url: `/medios/n/${id}.jpg` })).concat([{ id: COPIA, url: `/medios/n/${ORIG}.jpg` }]), rowCount: 4 };
    if (/^update media c set/.test(sql)) return { rows: [], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  };
  const r = await F.barrerVariantes();
  ok(r.hechas === 1 && r.sinMaestra === 1 && r.copiadas === 1 && r.fallos === 1, `barrido: 1 convertida, 1 sin maestra, 1 copia, 1 que espera a la próxima vuelta (${JSON.stringify(r)})`);
  ok(G.has(`n/${A}.w320.webp`) && G.has(`n/${A}.w500.webp`) && !G.has(`n/${A}.w640.webp`), 'barrido: la maestra de 500 recibe 320 y 500');
  const sel = Q.find((q) => /^select id::text, url from media/.test(q.sql)).sql.replace(/\s+/g, ' ');
  ok(/where var_at is null and status = 'visible' and purged_at is null and url like '\/medios\/n\/%\.jpg' and created_at < now\(\) - interval '2 minutes' order by created_at limit 20/.test(sel),
    'barrido: pide la tanda por el predicado del índice parcial (0195), las de más de 2 minutos, de a 20');
  const marca = Q.find((q) => /var_widths = '\{\}'/.test(q.sql));
  ok(marca && eq(marca.params[0], [SIN]) && !Q.some((q) => /var_widths = '\{\}'/.test(q.sql) && q.params[0].includes(CAE)), 'barrido: la maestra que no está queda con \'{}\' (no se reintenta); el error del almacén no se marca');

  console.log(`\n${malas ? '✗' : 'OK'} (${n} comprobaciones${malas ? `, ${malas} fallaron` : ''})`);
  process.exit(malas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
