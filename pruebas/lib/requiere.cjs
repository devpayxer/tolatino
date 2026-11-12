// 9b-1 · Lo que una prueba necesita y hace OTRA prueba, dicho en voz alta (antes se tomaba «lo último que quedó en la base»: en una base nueva,
// en otro orden o la segunda vez, no estaba). Ejemplos: la reseña y la ayuda de una visita del Hogar necesitan una visita TERMINADA con su
// estimado aprobado y cobrado (la hace est4d de punta a punta); la ayuda con la fiesta, una fiesta terminada con su depósito (fie4v).
//   const CH = requiere('est4d', () => sql(`select … limit 1`));
// Si la consulta ya encuentra algo, se usa. Si no, se corre la prueba que lo hace (el flujo real, con sus propias comprobaciones; su salida
// va con el prefijo [nombre] y no cuenta en las ✓ de esta) y se vuelve a mirar; si sigue sin estar, la prueba falla diciendo qué faltó.
// Con `siempre: true` se corre aunque haya algo (para quien consume lo que encuentra y no puede reusar lo de otra corrida).
const { execFileSync } = require('child_process');
const path = require('path');
const ENT = require('./entorno.cjs');
const corridas = new Set();
function requiere(nombre, consulta, { siempre = false, que = '' } = {}) {
  let v = siempre ? '' : consulta();
  if (v) return v;
  if (!corridas.has(nombre)) {
    corridas.add(nombre);
    console.log(`… ${que || 'lo que necesita'} no está: se corre ${nombre} (lo hace de punta a punta)`);
    let out = '';
    try {
      out = execFileSync('node', [path.join(ENT.RAIZ, 'pruebas', 'e2e', `${nombre}.cjs`)], { cwd: ENT.RAIZ, env: process.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60_000 });
    } catch (e) {
      out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
      console.log(out.split('\n').filter(Boolean).slice(-15).map((l) => `  [${nombre}] ${l}`).join('\n'));
      throw new Error(`requiere: ${nombre} falló, así que no hay ${que || 'lo que esta prueba necesita'}`);
    }
    console.log(out.split('\n').filter(Boolean).slice(-4).map((l) => `  [${nombre}] ${l}`).join('\n'));
  }
  v = consulta();
  if (!v) throw new Error(`requiere: después de ${nombre} sigue sin haber ${que || 'lo que esta prueba necesita'}`);
  return v;
}
module.exports = { requiere };
