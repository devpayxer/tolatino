// Prueba al revés de la tanda 5 de la revisión del CI (22 nov): el despliegue del sandbox, más rápido y sin que pueda quedarse caído. Cada caso rompe a
// propósito un script o una configuración del despliegue y el guardián tiene que fallar con SU mensaje (el texto de cada caso); después se restaura y
// los guardianes quedan limpios:
//   sandboxSeArreglaSolo · tolatino-sync se reinstala con un install directo, sin bash -n o sin cambio atómico; tolatino-sync deja de comprobar un
//   script que deploy.sh carga, o corre deploy.sh aunque no pase; la prueba de infra que lo demuestra deja de correr.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const D = 'infra/pruebas/deploy.sh', S = 'infra/pruebas/tolatino-sync', L = 'infra/comun/lib.sh', C = 'pruebas/infra/correr.sh';
const casos = [
  ['sandboxSeArreglaSolo', D, 'if instalar_si_valido "$REPO/infra/pruebas/tolatino-sync" /usr/local/bin/tolatino-sync; then',
    'install -m 0755 "$REPO/infra/pruebas/tolatino-sync" /usr/local/bin/tolatino-sync\nif true; then', 'nunca con un install directo'],
  ['sandboxSeArreglaSolo', L, '  if ! err=$(bash -n "$src" 2>&1); then', '  if ! err=$(true 2>&1); then', 'bash -n primero'],
  ['sandboxSeArreglaSolo', L, '  if install -m "$modo" "$src" "$tmp" && mv -f "$tmp" "$dst"; then return 0; fi', '  if install -m "$modo" "$src" "$dst"; then return 0; fi', 'cambio atómico'],
  ['sandboxSeArreglaSolo', S, ' infra/pruebas/medios.sh packages/db/migrar.sh"', ' infra/pruebas/medios.sh"', 'no comprueba con bash -n packages/db/migrar.sh'],
  ['sandboxSeArreglaSolo', S, '  elif [ -f infra/pruebas/deploy.sh ]; then', '  fi\n  if [ -f infra/pruebas/deploy.sh ]; then', 'tolatino-sync NO lo corre'],
  ['sandboxSeArreglaSolo', C, '  seccion "el sandbox se arregla solo (su tolatino-sync)"; bash pruebas/infra/sync-pruebas.test.sh || mal=1\n', '', 'no corren pruebas/infra/sync-pruebas.test.sh'],
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
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(g, path.basename(f), msg, correr(g)); } finally { fs.writeFileSync(ruta, orig); }
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
