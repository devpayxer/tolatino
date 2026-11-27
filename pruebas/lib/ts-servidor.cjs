// Fotos a la medida (decisión AI) · Cargar un archivo REAL de apps/web/lib (TypeScript, «server-only») desde una prueba de Node, sin el servidor:
// se transpila con el typescript del repo (como el guardián compaTapaSecretos hace con tapar()), sin la línea «import "server-only"», y sus
// importaciones salen de `stubs` (p. ej. «./db» → una base de mentira) o de apps/web/node_modules (sharp). Así la prueba ejerce el código que
// corre en producción, no una copia.
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const ts = require(path.join(RAIZ, 'node_modules', 'typescript'));
const WEB = path.join(RAIZ, 'apps', 'web');
const delEntorno = (n) => (process.env[n] ?? '').trim() || null;
const DOBLE_LLAVES = { llaveYa: delEntorno, llave: async (n) => delEntorno(n), olvidarLlaves() {}, prepararLlaves: async () => {} };
// 27 nov · La medida de las consultas que ejecuta la suite (pruebas/lib/consultas-medir.cjs) solo anotaba las del SERVIDOR: lib/db.ts anota si
// TOLATINO_ENTORNO=pruebas y PRUEBAS_ANOTAR_SQL (lo lee al cargarse), y las pruebas de Node (din9t…, que cargan la db.ts real) no llevan
// TOLATINO_ENTORNO. Así lo que solo ejercen ellas (cobros, suscripcion, revision-pasarela…) salía «sin ejecutar». Al cargar ESA db.ts con
// PRUEBAS_ANOTAR_SQL puesta, se le da el entorno de pruebas mientras se evalúa, y nada más: el resto del proceso sigue con el suyo.
function evaluar(rel, js, mod, req) {
  const esDb = rel.replace(/\\/g, '/').endsWith('apps/web/lib/db.ts') && !!process.env.PRUEBAS_ANOTAR_SQL;
  const antes = process.env.TOLATINO_ENTORNO;
  if (esDb) process.env.TOLATINO_ENTORNO = 'pruebas';
  try { new Function('module', 'exports', 'require', js)(mod, mod.exports, req); }
  finally { if (esDb) { if (antes === undefined) delete process.env.TOLATINO_ENTORNO; else process.env.TOLATINO_ENTORNO = antes; } }
}
function cargar(rel, stubs = {}) {
  const archivo = path.join(RAIZ, rel);
  const fuente = fs.readFileSync(archivo, 'utf8').replace(/^import "server-only";\n/m, '');
  const js = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const req = (m) => {
    if (m in stubs) return stubs[m];
    // 9t9 · El ayudante de los barridos (un elemento malo no detiene a los demás) no tiene importaciones: se carga el real, sin stub.
    if (m === './barrido-uno') return cargar('apps/web/lib/barrido-uno.ts');
    // 23 nov · La regla del fin del período de Pro (lib/periodo-pro.ts) es pura y sin importaciones: se carga la real, sin stub.
    if (m === './periodo-pro') return cargar('apps/web/lib/periodo-pro.ts');
    // 23 nov · LA regla de las direcciones de simulador (lib/origen-pruebas.ts) no tiene importaciones: se carga la real, sin stub (un doble podría
    // dejar pasar una dirección que en el servidor se ignora).
    if (/(^|\/)origen-pruebas$/.test(m)) return cargar('apps/web/lib/origen-pruebas.ts');
    // 25 nov · LA regla del dinero que ve el cliente (lib/dinero-comun.ts: «$45», «$52.50») no tiene importaciones: se carga la real, sin stub.
    if (/(^|\/)dinero-comun$/.test(m)) return cargar('apps/web/lib/dinero-comun.ts');
    // 23 nov · El lector de las llaves de proveedores (lib/llaves-proveedores.ts: el entorno y, si no, el llavero de la base). Sin base, su doble lee
    // SOLO el entorno, que es lo que manda también en el servidor; quien quiera otra cosa lo pasa en stubs.
    if (/(^|\/)llaves-proveedores$/.test(m)) return DOBLE_LLAVES;
    if (m.startsWith('.')) throw new Error(`${rel} importa ${m}: pásalo en stubs`);
    return require(require.resolve(m, { paths: [WEB] }));
  };
  const mod = { exports: {} };
  evaluar(archivo, js, mod, req);
  return mod.exports;
}
/* 9t · Medios en flujo · Cargar una RUTA (o un archivo de lib) con sus importaciones de la app resueltas de verdad: «@/lib/x» y «./x» se cargan
   del repo (transpilados igual que arriba) salvo los que vengan en `stubs` (la base, la cuenta, el panel…); lo demás (next/server, sharp,
   node:*) sale de apps/web/node_modules. Con `ref` (un commit) se carga el código de ESE commit (git show), para medir «antes» y «después»
   con el mismo script (scripts/carga/memoria-medios.mjs). Cada llamada tiene su propio caché de módulos. */
function cargarApp(rel, stubs = {}, o = {}) {
  const { execFileSync } = require('child_process');
  const cache = new Map();
  const existe = (r) => {
    if (!o.ref) return fs.existsSync(path.join(RAIZ, r));
    try { execFileSync('git', ['cat-file', '-e', `${o.ref}:${r}`], { cwd: RAIZ, stdio: 'ignore' }); return true; } catch { return false; }
  };
  const leer = (r) => (o.ref ? execFileSync('git', ['show', `${o.ref}:${r}`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 << 20 }) : fs.readFileSync(path.join(RAIZ, r), 'utf8'));
  const resolver = (desde, m) => {
    const base = m.startsWith('@/') ? path.posix.join('apps/web', m.slice(2)) : path.posix.normalize(path.posix.join(path.posix.dirname(desde), m));
    for (const x of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) if (/\.tsx?$/.test(x) && existe(x)) return x;
    throw new Error(`${desde} importa ${m}: no está en el repo${o.ref ? ` (${o.ref})` : ''}`);
  };
  const uno = (r) => {
    if (cache.has(r)) return cache.get(r).exports;
    const mod = { exports: {} };
    cache.set(r, mod);
    const fuente = leer(r).replace(/^import "server-only";\n/m, '');
    const js = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const req = (m) => {
      if (m in stubs) return stubs[m];
      if (m === 'server-only') return {};
      if (m.startsWith('@/') || m.startsWith('.')) { const x = resolver(r, m); return x in stubs ? stubs[x] : uno(x); }
      return require(require.resolve(m, { paths: [WEB] }));
    };
    evaluar(r, js, mod, req);
    return mod.exports;
  };
  return uno(rel);
}
module.exports = { cargar, cargarApp, RAIZ };
