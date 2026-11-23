// Prueba al revés del guardián sinFotosAjenasEnProduccion (23 nov): «una página del producto le pide una foto a otra empresa» (las 647 fotos de las
// páginas de categoría venían de images.pexels.com en la semilla que migrar.sh aplica en producción). Se inyecta el defecto, el guardián debe fallar con
// SU mensaje ([sinFotosAjenasEnProduccion]); se restaura. «crear»: se crea el archivo, se corre y se borra. Una regla, un caso (o más).
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'sinFotosAjenasEnProduccion', SQL = 'packages/db/seeds/paginas.sql', TAX = 'packages/taxonomy/paginas.json', CSP = 'apps/web/lib/csp.ts', MW = 'apps/web/middleware.ts',
  NC = 'apps/web/next.config.ts', DIR = 'apps/web/public/paginas';
const unaFoto = fs.readdirSync(path.join(R, DIR)).sort()[0], otraFoto = fs.readdirSync(path.join(R, DIR)).sort()[1];
const hash8 = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 8);
const webp = (n) => Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(n)]);
const casos = [
  // 1 · La semilla de las páginas vuelve a traer una foto de Pexels (la que había)
  [SQL, '"hero":"/paginas/food-portada.', '"hero":"https://images.pexels.com/photos/38330332/pexels-photo-38330332.jpeg","zz":"/paginas/food-portada.', 'semilla de páginas: una portada de images.pexels.com'],
  // 2 · La taxonomía de la que sale la semilla
  [TAX, '"hero": "/paginas/food-portada.', '"hero": "https://images.pexels.com/photos/38330332/pexels-photo-38330332.jpeg", "zz": "/paginas/food-portada.', 'taxonomía: una portada de images.pexels.com'],
  // 3 · Otra semilla, otro host, por la extensión
  ['packages/db/seeds/zonas.sql', 'begin;', "begin;\nselect 'https://images.unsplash.com/photo-1/x.jpg';", 'otra semilla: una foto de images.unsplash.com'],
  // 4 · Código de producción con una foto de un host cualquiera (por la extensión)
  [CSP, 'export const IMG_SANDBOX', 'const zz = "https://cdn.ejemplo.net/a/b.webp";\nexport const IMG_SANDBOX', 'código de producción: una foto de un host cualquiera'],
  // 5 · El host del sandbox suelto en otro código (no en la receta de la CSP)
  [MW, 'export function middleware', 'const zz = "https://images.pexels.com/x";\nexport function middleware', 'middleware: el host de Pexels suelto'],
  // 6-7 · La CSP deja pasar otra empresa
  [CSP, "img-src 'self' data: blob:", "img-src 'self' data: blob: https://cdn.ejemplo.net", 'CSP: img-src con un host ajeno'],
  [NC, 'const CSP =', "const IMG = \"img-src 'self' https://images.pexels.com\";\nconst CSP =", 'next.config.ts: otro img-src con Pexels'],
  // 8-10 · El sandbox: solo si el proceso es el sandbox
  [CSP, '${sandbox ? ` ${IMG_SANDBOX}` : ""}', ' ${IMG_SANDBOX}', 'CSP: el host del sandbox siempre, sin ${sandbox ? … : ""}'],
  [CSP, 'entorno === "pruebas"', 'entorno !== "produccion"', 'esSandbox abierto por defecto (todo lo que no sea producción)'],
  [MW, 'if (esSandbox(process.env.TOLATINO_ENTORNO) && !res.headers.has("location"))', 'if (!res.headers.has("location"))', 'middleware: la CSP del sandbox sin esSandbox()'],
  // 11 · next.config.ts toma la CSP del sandbox
  [NC, 'cspProduccion(process.env.NODE_ENV !== "production")', 'cspProduccion(process.env.NODE_ENV !== "production", true)', 'next.config.ts con la CSP del sandbox'],
  // 12 · Sin caché larga
  [NC, 'value: "public, max-age=31536000, immutable"', 'value: "public, max-age=0"', 'next.config.ts: /paginas sin Cache-Control immutable'],
  // 13 · La semilla ya no sale de la taxonomía (otra foto que sí existe)
  [SQL, `/paginas/${unaFoto}`, `/paginas/${otraFoto}`, 'semilla distinta de la taxonomía'],
];
const crear = [
  // 14 · Una semilla nueva con una foto de otra empresa
  ['packages/db/seeds/zzFoto.sql', "begin;\ninsert into media (url) values ('https://cdn.ejemplo.net/fotos/1.png');\ncommit;\n", 'semilla nueva: una foto de otro host'],
  // 15 · Una migración nueva
  ['packages/db/migrations/9999_zz_foto.sql', "begin;\nupdate media set url = 'https://i.imgur.com/abc.jpeg';\ncommit;\n", 'migración nueva: una foto de imgur'],
  // 16 · Un host de fotos sin extensión
  ['apps/web/lib/zzFoto.ts', 'export const f = "https://source.unsplash.com/random/800x600";\n', 'código: un host de fotos sin extensión'],
  // 17 · Un css que pinta una foto de afuera
  ['apps/web/public/zz.css', '.a { background: url("https://upload.wikimedia.org/x/y.jpg"); }\n', 'public: un css con una foto de afuera'],
  // 18-20 · Los archivos de public/paginas
  [`${DIR}/zz-mal.jpg`, webp(100), 'archivo que no es <página>.<huella>.webp'],
  [`${DIR}/zz-grande.${hash8(webp(170 * 1024))}.webp`, webp(170 * 1024), 'archivo de más de 160 KB'],
  [`${DIR}/zz-huella.00000000.webp`, webp(100), 'archivo cuya huella del nombre no es la del contenido'],
  [`${DIR}/zz-nowebp.${hash8(Buffer.from('JFIF'.repeat(10)))}.webp`, Buffer.from('JFIF'.repeat(10)), 'archivo que no es un WebP'],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
// Antes de inyectar nada, el árbol tiene que estar limpio para este guardián (si no, todo «caería» por otra cosa).
total++; { const [f] = correr(); if (!f) { bien++; console.log(`  ✓ ${G} en verde sobre el árbol de hoy`); } else console.log(`  ✗ ${G} ya falla sin defecto inyectado: los casos de abajo no dicen nada`); }
for (const [f, a, b, que] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  informe(que, r);
}
for (const [f, c, que] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(); } finally { fs.unlinkSync(ruta); }
  informe(que, r);
}
// Un archivo de verdad cuyo contenido cambia bajo el mismo nombre (se sirve «immutable»: nadie lo vería).
{ const ruta = path.join(R, DIR, unaFoto), orig = fs.readFileSync(ruta), mal = Buffer.from(orig); mal[mal.length - 1] ^= 0xff;
  fs.writeFileSync(ruta, mal);
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  informe('un archivo cuyo contenido cambió bajo el mismo nombre', r); }
// Un archivo que la taxonomía y la semilla nombran y ya no está.
{ const ruta = path.join(R, DIR, unaFoto), tmp = ruta + '.zzbak';
  fs.renameSync(ruta, tmp);
  let r; try { r = correr(); } finally { fs.renameSync(tmp, ruta); }
  informe('una foto que la semilla nombra y ya no existe', r); }
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
