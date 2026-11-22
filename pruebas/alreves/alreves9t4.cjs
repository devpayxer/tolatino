// Prueba al revés del guardián de 9t (semgrepSqlPorFlujo: la regla de SQL armado con texto va por flujo de datos, con su prueba, las dos formas de
// consulta como sumidero, el .length que solo limpia el arreglo de aquí, los limpiadores con nombre revisados, cada «nosemgrep» con su porqué, el CI
// que corre la prueba y que cuenta lo que Semgrep no lee como rojo). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se
// restaura. «borrar»: se aparta un archivo y se devuelve. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'semgrepSqlPorFlujo', SG = 'semgrep/tolatino.yml', PR = 'semgrep/tolatino.ts', Y = '.github/workflows/ci.yml';
const casos = [
  // La regla vuelve a ir por nombres, o sin modo taint.
  [G, SG, '    mode: taint\n', ''],
  [G, SG, '    pattern-sources:\n', '    pattern-sources:\n      - patterns:\n          - pattern: $S\n          - metavariable-regex:\n              metavariable: $S\n              regex: ^(q|texto)$\n'],
  // El sumidero sin la forma «await x.query<T>(…)» (la que la regla vieja no veía).
  [G, SG, '              - pattern: await $DB.query<$T>($Q, ...)\n', ''],
  // .length limpia cualquier cosa (también un { length: "…" } de afuera).
  [G, SG, "              - pattern-inside: |\n                  $X = [...];\n                  ...\n              - pattern: $X.length\n", '              - pattern: $X.length\n'],
  // Un limpiador con nombre que nadie revisó.
  [G, SG, '          - pattern: ident(...)\n', '          - pattern: ident(...)\n          - pattern: escapar(...)\n'],
  // La prueba sin el caso de await x.query<T>(…), o sin casos.
  [G, PR, 'return (await c.query<{ n: number; m: string }>(', 'return (await c.query('],
  [G, PR, '// ruleid: tolatino-sql-con-texto-interpolado\n  return db().query(`select 1 from items limit ${ids.length}`);', 'return db().query(`select 1 from items limit ${ids.length}`);'],
  // El CI sin la prueba de las reglas, o sin contar lo que Semgrep no lee.
  [G, Y, '"$RUNNER_TEMP/sg/bin/semgrep" --test --metrics=off --disable-version-check semgrep/\n', ''],
  [G, Y, 'if (e.length) { console.error(`Semgrep no pudo leer ${e.length} parte(s): lo que no lee no lo revisa.`); process.exit(1); }', ''],
  // Un «nosemgrep» sin porqué.
  [G, 'apps/web/lib/ruta.ts', '// nosemgrep: tolatino-sql-con-texto-interpolado — filas solo lleva marcadores $n', '// nosemgrep: tolatino-sql-con-texto-interpolado'],
  // Lo que el lector de Semgrep no entiende vuelve (y ese pedazo deja de revisarse).
  [G, 'apps/web/app/admin/acciones-colas.ts', 'let avisosNeg: Array<import("@/lib/negocio-cambios").Aviso> = []', 'let avisosNeg: import("@/lib/negocio-cambios").Aviso[] = []'],
  [G, 'apps/web/lib/compa/ayuda-indice.ts', 'if (/<!-{2}/.test(t))', 'if (/<!--/.test(t))'],
];
// borrar: la prueba de la regla
const borrar = [[G, PR]];
// crear: otra función con el nombre de un limpiador (quedaría «limpia» sin revisar)
const crear = [[G, 'apps/web/lib/alreves9t-ident.ts', 'export const ident = (x: string) => x;\n']];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b, env] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g, env); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f] of borrar) {
  const ruta = path.join(R, f), aparte = ruta + '.aparte';
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  fs.renameSync(ruta, aparte);
  let r; try { r = correr(g); } finally { fs.renameSync(aparte, ruta); }
  informe(g, `borrar ${f.split('/').slice(-2).join('/')}`, r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
