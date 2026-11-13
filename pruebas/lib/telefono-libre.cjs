// 9b-2 · Un teléfono de prueba (siempre 555, el repo es público) que NO tenga cuenta todavía. Las pruebas que necesitan «un número nuevo» lo sacaban de la hora
// (los últimos 3 o 4 dígitos) y a veces caía en una cuenta que otra prueba ya había creado: «entra con un número nuevo» fallaba una de cada tantas corridas.
const { execSync } = require('child_process');
const ENT = require('./entorno.cjs');
const hay = (tel) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "select count(*) from users where phone = '+1${tel}'"`).toString().trim() !== '0';
// prefijo: los dígitos fijos (p. ej. '5705556' + 3 libres → largo 10); sale el primero libre a partir de uno al azar.
function telefonoLibre(prefijo, desde = null) {
  const libres = 10 - prefijo.length, n = 10 ** libres;
  let k = desde ?? Math.floor(Math.random() * n);
  for (let i = 0; i < n; i++, k = (k + 1) % n) { const t = prefijo + String(k).padStart(libres, '0'); if (!hay(t)) return t; }
  throw new Error('no queda un teléfono libre con el prefijo ' + prefijo);
}
module.exports = { telefonoLibre };
