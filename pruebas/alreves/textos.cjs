// 20 nov · Los textos de las pruebas al revés siguen vivos. Cada caso al revés dice «en este archivo, cambia ESTE texto por este otro y el guardián
// tiene que fallar». Si alguien cambia ese renglón del código (aunque sea para bien), el caso ya no encuentra su texto y la prueba al revés cae
// con «no encontré el texto a cambiar»… pero eso solo se veía en el CI, 40 min después: correr las ~100 pruebas al revés aquí son horas. Hoy pasó
// dos veces (alreves9k tras mover la auditoría de las devoluciones; alreves9b2 tras tocar el entorno del CI).
// Esto corre TODAS las pruebas al revés sin los guardianes (pruebas/lib/alreves-sin-guardian.cjs) y lista los casos cuyo archivo o texto ya no está. Segundos, no horas.
// Uso: node pruebas/alreves/textos.cjs   (sale 1 si hay alguno). Lo corre el CI junto a los guardianes y quien entrega un cambio, antes de subir.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const DIR = __dirname, RAIZ = path.join(DIR, '..', '..');
const archivos = fs.readdirSync(DIR).filter((f) => /^alreves.*\.cjs$/.test(f)).sort();
const PRE = path.join(DIR, '..', 'lib', 'alreves-sin-guardian.cjs');
let malos = 0, sinCasos = 0;
const antes = spawnSync('git', ['status', '--porcelain'], { cwd: RAIZ, encoding: 'utf8' }).stdout;
for (const f of archivos) {
  const r = spawnSync(process.execPath, ['-r', PRE, path.join(DIR, f)], { cwd: RAIZ, encoding: 'utf8', timeout: 120000, env: { ...process.env, ALREVES_SOLO_TEXTOS: '1' } });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const rotos = out.split('\n').filter((l) => /no encontré el texto a cambiar|: no existe /.test(l));
  for (const l of rotos) { malos++; console.log(`✗ ${f} · ${l.trim().replace(/^✗\s*/, '').slice(0, 260)}`); }
  if (r.error || r.signal) { malos++; console.log(`✗ ${f} · no terminó (${r.error?.message || r.signal})`); }
  if (!/defectos cazados|✓/.test(out) && !rotos.length) sinCasos++;
}
// Ninguna prueba deja un archivo cambiado (cada una restaura lo que toca).
const despues = spawnSync('git', ['status', '--porcelain'], { cwd: RAIZ, encoding: 'utf8' }).stdout;
if (antes !== despues) { malos++; console.log('✗ una prueba al revés dejó el árbol distinto de como estaba:\n' + despues); }
console.log(`${malos ? '✗' : '✓'} textos de las pruebas al revés: ${archivos.length} archivos · ${malos} caso(s) sin su texto${sinCasos ? ` · ${sinCasos} con otro formato (no se miran aquí)` : ''}`);
process.exit(malos ? 1 : 0);
