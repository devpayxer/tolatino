// 26 nov · LA regla del dinero que ve una persona, la REAL (apps/web/lib/dinero-comun.ts › usd: «$45», «$52.50», «$1,234.56»; recibe CENTAVOS).
// Las pruebas que leen un monto en pantalla o en un aviso lo piden aquí en vez de armarlo con toFixed(2): si la regla cambia, ellas cambian con ella.
const fs = require('fs'), path = require('path');
const ENT = require('./entorno.cjs');
const ts = require(require.resolve('typescript', { paths: [ENT.RAIZ, __dirname] }));
const js = ts.transpileModule(fs.readFileSync(path.join(ENT.RAIZ, 'apps/web/lib/dinero-comun.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, () => { throw new Error('dinero-comun no importa nada'); });
module.exports = mod.exports.usd;
