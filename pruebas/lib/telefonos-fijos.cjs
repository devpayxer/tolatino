// 9b-3 · Los teléfonos de prueba que alguna prueba o la semilla usa POR SU NÚMERO (p. ej. Rita 570-555-0961 en sis9j). Los «teléfonos libres al azar»
// no los toman nunca: en el orden barajado, din9n4 sacó al azar el de Rita antes que sis9j y lo dio de alta como «Rita Nueve»; sis9j no la creó
// (on conflict do nothing) y el Equipo ya no decía «Rita Prueba». Se leen una vez de los archivos (pruebas, semilla y scripts de la semilla).
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const DIRS = ['pruebas/e2e', 'pruebas/lib', 'pruebas/alreves', 'infra/pruebas/semilla', 'scripts/semilla'];
let fijos = null;
function cargar() {
  fijos = new Set();
  const leer = (dir) => {
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) leer(p);
      else if (/\.(cjs|mjs|js|ts|sql)$/.test(e.name)) {
        const txt = fs.readFileSync(p, 'utf8');
        for (const m of txt.matchAll(/570[- ]?555[- ]?(\d{4})/g)) fijos.add('570555' + m[1]);
      }
    }
  };
  for (const d of DIRS) leer(path.join(RAIZ, d));
  return fijos;
}
// esFijo('5705550961') → true: ese número es de una prueba o de la semilla; el generador al azar busca otro.
const esFijo = (tel) => (fijos ?? cargar()).has(String(tel).replace(/\D/g, '').slice(-10));
module.exports = { esFijo };
