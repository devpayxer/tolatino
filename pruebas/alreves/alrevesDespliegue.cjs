// Prueba al revés de la tanda 5 de la revisión del CI (22 nov): el despliegue del sandbox, más rápido y sin que pueda quedarse caído. Cada caso rompe a
// propósito un script o una configuración del despliegue y el guardián tiene que fallar con SU mensaje (el texto de cada caso); después se restaura y
// los guardianes quedan limpios:
//   sandboxSeArreglaSolo · tolatino-sync se reinstala con un install directo, sin bash -n o sin cambio atómico; tolatino-sync deja de comprobar un
//   script que deploy.sh carga, o corre deploy.sh aunque no pase; la prueba de infra que lo demuestra deja de correr.
//   migracionConTransaccion · una migración nueva sin begin/commit, o con «index concurrently» dentro; el encabezado de migrar.sh vuelve a decir que
//   todas traen begin/commit.
//   migrarUnaLectura · migrar.sh vuelve a preguntar archivo por archivo; aplica sin anotar en la misma sesión o sin comprobar que quedó anotada; la
//   prueba contra Postgres 16 deja de correr.
// «crear» (el texto a cambiar es null): se crea el archivo, se corre el guardián y se quita.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const D = 'infra/pruebas/deploy.sh', S = 'infra/pruebas/tolatino-sync', L = 'infra/comun/lib.sh', C = 'pruebas/infra/correr.sh', M = 'packages/db/migrar.sh';
const NUEVA = 'packages/db/migrations/0999_alreves_despliegue.sql';
const casos = [
  ['sandboxSeArreglaSolo', D, 'if instalar_si_valido "$REPO/infra/pruebas/tolatino-sync" /usr/local/bin/tolatino-sync; then',
    'install -m 0755 "$REPO/infra/pruebas/tolatino-sync" /usr/local/bin/tolatino-sync\nif true; then', 'nunca con un install directo'],
  ['sandboxSeArreglaSolo', L, '  if ! err=$(bash -n "$src" 2>&1); then', '  if ! err=$(true 2>&1); then', 'bash -n primero'],
  ['sandboxSeArreglaSolo', L, '  if install -m "$modo" "$src" "$tmp" && mv -f "$tmp" "$dst"; then return 0; fi', '  if install -m "$modo" "$src" "$dst"; then return 0; fi', 'cambio atómico'],
  ['sandboxSeArreglaSolo', S, ' infra/pruebas/medios.sh packages/db/migrar.sh"', ' infra/pruebas/medios.sh"', 'no comprueba con bash -n packages/db/migrar.sh'],
  ['sandboxSeArreglaSolo', S, '  elif [ -f infra/pruebas/deploy.sh ]; then', '  fi\n  if [ -f infra/pruebas/deploy.sh ]; then', 'tolatino-sync NO lo corre'],
  ['sandboxSeArreglaSolo', C, '  seccion "el sandbox se arregla solo (su tolatino-sync)"; bash pruebas/infra/sync-pruebas.test.sh || mal=1\n', '', 'no corren pruebas/infra/sync-pruebas.test.sh'],
  ['migracionConTransaccion', NUEVA, null, 'create table alreves_x (y int);\n', 'empieza con «begin;» y termina con «commit;»'],
  ['migracionConTransaccion', NUEVA, null, '-- al revés\nbegin;\ncreate table alreves_x (y int);\n', 'empieza con «begin;» y termina con «commit;»'],
  ['migracionConTransaccion', NUEVA, null, 'begin;\ncreate index concurrently alreves_i on cities (id);\ncommit;\n', '«index concurrently» no puede ir dentro de begin/commit'],
  ['migracionConTransaccion', M, 'SALVO 16 viejas que no lo traen', 'como todas (los .sql traen begin/commit)', 'el encabezado de migrar.sh dice la verdad'],
  ['migrarUnaLectura', M, '  prev=${HECHAS[$n]:-}\n  if [ -z "$prev" ]; then', '  prev=$(psql -c "select sha256 from schema_migrations where name = \'$n\'")\n  if [ -z "$prev" ]; then', 'archivo por archivo'],
  ['migrarUnaLectura', M, '\nleer schema_migrations\nnuevas=0\n', '\nnuevas=0\n', 'lee schema_migrations y schema_seeds una vez'],
  ['migrarUnaLectura', M, '  { cat "$f"; printf \'\\n;\\n%s\\n\' "$sql"; } | psql -v', '  psql < "$f"\n  printf \'%s\\n\' "$sql" | psql -v', 'en la misma sesión de psql'],
  ['migrarUnaLectura', M, "where name = :'tl_m_nombre' and sha256 = :'tl_m_huella';\")\" != 1 ]", "where false;\")\" != 0 ]", 'se comprueba que quedó anotada'],
  ['migrarUnaLectura', C, '  if [ -x /usr/lib/postgresql/16/bin/initdb ]; then seccion "migraciones en una lectura (migrar.sh contra Postgres 16)"; bash pruebas/infra/migrar.test.sh || mal=1\n',
    '  if [ -x /usr/lib/postgresql/16/bin/initdb ]; then :\n', 'no corren pruebas/infra/migrar.test.sh'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${g}]`)); }
};
const informe = (g, que, msg, lineas) => {
  total++;
  const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
  console.log(`  ${l ? '✓' : '✗'} ${g} al revés (${que}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián NO falló'}`);
  if (l) bien++;
};
for (const [g, f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  if (a === null) {
    if (fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: ${f} ya existe (el caso lo crea)`); continue; }
    fs.writeFileSync(ruta, b);
    try { informe(g, path.basename(f), msg, correr(g)); } finally { fs.rmSync(ruta, { force: true }); }
    continue;
  }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(g, path.basename(f), msg, correr(g)); } finally { fs.writeFileSync(ruta, orig); }
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
