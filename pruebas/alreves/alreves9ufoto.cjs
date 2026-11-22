// Prueba pura de packages/ui/src/foto.ts (Fotos a la medida, F2a): qué variante le toca a cada caja, qué pasa SIN CAMBIO y cómo se cita el fondo.
// No toca el servidor ni el repo. El .ts se pasa a JS con el compilador de TypeScript del repo (o, si no está, con el que trae Node).
const fs = require('fs'), path = require('path'), Module = require('module');
const R = path.resolve(__dirname, '..', '..');
const fuente = fs.readFileSync(path.join(R, 'packages/ui/src/foto.ts'), 'utf8');
let js;
try { js = require(require.resolve('typescript', { paths: [R] })).transpileModule(fuente, { compilerOptions: { module: 1, target: 9 } }).outputText; }
catch { js = require('module').stripTypeScriptTypes(fuente, { mode: 'transform' }).replace(/\bexport (const|function)/g, '$1').concat('\nmodule.exports = { ANCHOS_FOTO, fotoSrc, fotoFondo, fotoCss, fotoSrcSet };'); }
const m = new Module('foto.js'); m._compile(js, 'foto.js');
const { ANCHOS_FOTO, fotoSrc, fotoFondo, fotoCss, fotoSrcSet } = m.exports;

let mal = 0;
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) mal++; };
const id = '0b1c2d3e-4f50-4162-8394-a5b6c7d8e9f0';
const jpg = `/medios/n/${id}.jpg`, w = (n) => `/medios/n/${id}.w${n}.webp`;

ok(JSON.stringify(ANCHOS_FOTO) === '[320,640,1080,1600]', 'los anchos son 320, 640, 1080 y 1600');
for (const [caja, ancho] of [[27, 320], [160, 320], [161, 640], [320, 640], [400, 1080], [540, 1080], [541, 1600], [2000, 1600]])
  ok(fotoSrc(jpg, caja) === w(ancho), `caja ${caja} → ${ancho}`);

const igual = [
  ['una foto de afuera', 'https://images.pexels.com/photos/1/x.jpeg?w=800'], ['una llave privada', 'privado/abc/doc.jpg'], ['un cartel de video', `/medios/v/${id}.jpg`],
  ['un data:', 'data:image/png;base64,AAAA'], ['un blob:', 'blob:https://x.test/1234'], ['una variante ya pedida', w(640)], ['un png nuestro', `/medios/n/${id}.png`],
  ['un uuid corto', '/medios/n/abc.jpg'], ['con algo detrás', `${jpg}?v=2`], ['con algo delante', `https://tolatino.com${jpg}`], ['vacío', ''],
];
for (const [q, u] of igual) ok(fotoSrc(u, 400) === u, `${q} pasa sin cambio`);
ok(fotoSrc(undefined, 400) === '' && fotoSrc(null, 400) === '', 'undefined y null dan vacío');
for (const caja of [undefined, null, 0, -5, NaN, Infinity]) ok(fotoSrc(jpg, caja) === jpg, `sin caja válida (${caja}) la foto queda como está`);
ok(fotoSrc(jpg.toUpperCase(), 400) === jpg.toUpperCase(), 'otra ruta en mayúsculas no es nuestra');

ok(fotoFondo(jpg, 400) === `url("${w(1080)}")`, 'fotoFondo cita la variante');
ok(fotoFondo(jpg) === `url("${jpg}")`, 'fotoFondo sin caja deja el JPEG, citado');
ok(fotoFondo(`url(${jpg})`, 160) === `url("${w(320)}")`, 'fotoFondo desenvuelve un url(…) que ya llega puesto');
ok(fotoFondo(`url("${jpg}")`, 160) === `url("${w(320)}")`, 'y también uno con comillas');
ok(fotoFondo('https://x.test/a"b).jpg', 400) === 'url("https://x.test/a\\"b).jpg")', 'una comilla en la dirección no rompe el url()');
ok(fotoFondo('https://x.test/a\\b.jpg', 400) === 'url("https://x.test/a\\\\b.jpg")', 'una barra invertida se escapa');
ok(fotoFondo('https://x.test/a\nb.jpg', 400) === 'url("https://x.test/a\\a b.jpg")', 'un salto de línea se escapa');
ok(fotoFondo('', 400) === 'none' && fotoFondo(undefined, 400) === 'none' && fotoFondo(null) === 'none', 'vacío da none');
ok(fotoFondo('data:image/png;base64,AAAA', 100) === 'url("data:image/png;base64,AAAA")', 'un data: queda igual, citado');

ok(fotoCss(`url(${jpg}) center/cover`, 160) === `url("${w(320)}") center/cover`, 'fotoCss cambia el url() de una foto nuestra y deja el resto');
ok(fotoCss('url(https://x.test/a.jpg) center/cover', 160) === 'url(https://x.test/a.jpg) center/cover' && fotoCss('linear-gradient(red, blue)', 160) === 'linear-gradient(red, blue)' && fotoCss('#ccc', 160) === '#ccc' && fotoCss(undefined) === '', 'fotoCss no toca lo de afuera, los degradados ni los colores');
ok(fotoCss(`url("${jpg}"), url('${jpg}')`, 400) === `url("${w(1080)}"), url("${w(1080)}")`, 'fotoCss con varias url() y comillas');
ok(fotoSrcSet(jpg) === `${w(320)} 320w, ${w(640)} 640w, ${w(1080)} 1080w, ${w(1600)} 1600w`, 'fotoSrcSet lista los cuatro anchos');
ok(fotoSrcSet('https://x.test/a.jpg') === undefined && fotoSrcSet('') === undefined && fotoSrcSet(undefined) === undefined && fotoSrcSet(w(320)) === undefined, 'fotoSrcSet es undefined si no es nuestra');

// F3 (21 nov) · Una foto de destino privado pide su variante a la ruta con permiso (?w=), no a /medios/.
const priv = `/api/medios/privada/${id}`;
for (const [caja, ancho] of [[27, 320], [161, 640], [400, 1080], [2000, 1600]]) ok(fotoSrc(priv, caja) === `${priv}?w=${ancho}`, `privada: caja ${caja} → ?w=${ancho}`);
ok(fotoSrc(priv) === priv && fotoSrc(priv, 0) === priv, 'privada sin caja válida queda como está');
ok(fotoSrc(`${priv}?w=320`, 400) === `${priv}?w=320`, 'privada con su ancho ya pedido no se toca dos veces');
ok(fotoSrc(`/api/medios/revision/${id}`, 400) === `/api/medios/revision/${id}` && fotoSrc(`${priv}/x`, 400) === `${priv}/x` && fotoSrc('/api/medios/privada/abc', 400) === '/api/medios/privada/abc', 'otras rutas de /api/medios pasan sin cambio');
ok(fotoFondo(priv, 400) === `url("${priv}?w=1080")` && fotoCss(`url(${priv}) center/cover`, 160) === `url("${priv}?w=320") center/cover`, 'privada: fotoFondo y fotoCss piden el ancho');
ok(fotoSrcSet(priv) === [320, 640, 1080, 1600].map((n) => `${priv}?w=${n} ${n}w`).join(', '), 'privada: fotoSrcSet lista los cuatro anchos');

// F3b (22 nov) · Las privadas de las otras rutas piden su variante a SU MISMA ruta (?w=), cada una con su permiso.
for (const [nom, u] of [['mensajes', `/api/mensajes/foto/${id}`], ['ayuda', `/api/ayuda/foto/${id}`], ['entrega', `/api/entrega/foto/${id}`], ['reclamo', '/api/admin/reclamo/CL-1234']]) {
  ok(fotoSrc(u, 180) === `${u}?w=640` && fotoFondo(u, 60) === `url("${u}?w=320")` && fotoCss(`url(${u}) center/cover`, 540) === `url("${u}?w=1080") center/cover`, `F3b: ${nom}: la caja pide su ancho en la misma ruta`);
  ok(fotoSrc(u) === u && fotoSrc(`${u}?w=320`, 400) === `${u}?w=320` && fotoSrc(`${u}/x`, 400) === `${u}/x`, `F3b: ${nom}: sin caja, ya pedida o con algo detrás, sin cambio`);
}
ok(fotoSrc('/api/mensajes/foto/abc', 180) === '/api/mensajes/foto/abc' && fotoSrc('/api/admin/reclamo/42', 180) === '/api/admin/reclamo/42' && fotoSrc('/api/ayuda/fotos/' + id, 180) === '/api/ayuda/fotos/' + id, 'F3b: lo que no es una de esas rutas pasa sin cambio');

console.log(`\n${mal === 0 ? 'foto.ts: todo en orden' : mal + ' comprobaciones fallaron'}`);
process.exit(mal ? 1 : 0);
