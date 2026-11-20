// Fotos a la medida (decisión AI) · Cargar un archivo REAL de apps/web/lib (TypeScript, «server-only») desde una prueba de Node, sin el servidor:
// se transpila con el typescript del repo (como el guardián compaTapaSecretos hace con tapar()), sin la línea «import "server-only"», y sus
// importaciones salen de `stubs` (p. ej. «./db» → una base de mentira) o de apps/web/node_modules (sharp). Así la prueba ejerce el código que
// corre en producción, no una copia.
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const ts = require(path.join(RAIZ, 'node_modules', 'typescript'));
const WEB = path.join(RAIZ, 'apps', 'web');
function cargar(rel, stubs = {}) {
  const archivo = path.join(RAIZ, rel);
  const fuente = fs.readFileSync(archivo, 'utf8').replace(/^import "server-only";\n/m, '');
  const js = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const req = (m) => {
    if (m in stubs) return stubs[m];
    if (m.startsWith('.')) throw new Error(`${rel} importa ${m}: pásalo en stubs`);
    return require(require.resolve(m, { paths: [WEB] }));
  };
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req);
  return mod.exports;
}
module.exports = { cargar, RAIZ };
