// 20 nov · Los textos de las pruebas al revés siguen vivos. Cada caso al revés dice «en este archivo, cambia ESTE texto por este otro y el guardián
// tiene que fallar». Si alguien cambia ese renglón del código (aunque sea para bien), el caso ya no encuentra su texto y la prueba al revés cae
// con «no encontré el texto a cambiar»… pero eso solo se veía en el CI, 40 min después: correr las ~100 pruebas al revés aquí son horas. Hoy pasó
// dos veces (alreves9k tras mover la auditoría de las devoluciones; alreves9b2 tras tocar el entorno del CI).
// Esto corre TODAS las pruebas al revés sin los guardianes (pruebas/lib/alreves-sin-guardian.cjs) y lista los casos cuyo archivo o texto ya no está. Segundos, no horas.
// Uso: node pruebas/alreves/textos.cjs   (sale 1 si hay alguno). Lo corre el CI junto a los guardianes y quien entrega un cambio, antes de subir.
// 24 nov · Las suites corren de 4 en 4 (antes una detrás de otra: 36 s; está en el camino de cada subida). Ninguna escribe (la precarga anula las
// escrituras y no corre guardianes), así que no se pisan; la comprobación del árbol de abajo sigue valiendo para todas juntas.
const fs = require('fs'), path = require('path'), { spawn, spawnSync } = require('child_process');
const A_LA_VEZ = Math.max(1, Math.min(4, Number(process.env.TEXTOS_A_LA_VEZ) || 4));
const DIR = __dirname, RAIZ = path.join(DIR, '..', '..');
const archivos = fs.readdirSync(DIR).filter((f) => /^alreves.*\.cjs$/.test(f)).sort();
const PRE = path.join(DIR, '..', 'lib', 'alreves-sin-guardian.cjs');
let malos = 0, sinCasos = 0;
const antes = spawnSync('git', ['status', '--porcelain', '-z'], { cwd: RAIZ, encoding: 'utf8' }).stdout;
// Una suite, sin bloquear: { stdout, stderr, error, signal } como spawnSync.
const correr = (f) => new Promise((listo) => {
  const ch = spawn(process.execPath, ['-r', PRE, path.join(DIR, f)], { cwd: RAIZ, env: { ...process.env, ALREVES_SOLO_TEXTOS: '1' } });
  let stdout = '', stderr = '', error = null, signal = null;
  const reloj = setTimeout(() => { signal = 'SIGTERM'; ch.kill('SIGTERM'); }, 120000);
  ch.stdout.on('data', (d) => { stdout += d; });
  ch.stderr.on('data', (d) => { stderr += d; });
  ch.on('error', (e) => { error = e; });
  ch.on('close', (code, sig) => { clearTimeout(reloj); listo({ stdout, stderr, error, signal: signal || sig }); });
});
(async () => {
const res = new Array(archivos.length);
let sig = 0;
await Promise.all(Array.from({ length: A_LA_VEZ }, async () => { while (sig < archivos.length) { const i = sig++; res[i] = await correr(archivos[i]); } }));
archivos.forEach((f, i) => {
  const r = res[i];
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const rotos = out.split('\n').filter((l) => /no encontré el texto a cambiar|: no existe /.test(l));
  for (const l of rotos) { malos++; console.log(`✗ ${f} · ${l.trim().replace(/^✗\s*/, '').slice(0, 260)}`); }
  if (r.error || r.signal) { malos++; console.log(`✗ ${f} · no terminó (${r.error?.message || r.signal})`); }
  if (!/defectos cazados|✓/.test(out) && !rotos.length) sinCasos++;
});
// Ninguna prueba deja un archivo cambiado (cada una restaura lo que toca).
const despues = spawnSync('git', ['status', '--porcelain', '-z'], { cwd: RAIZ, encoding: 'utf8' }).stdout;
if (antes !== despues) { malos++; console.log('✗ una prueba al revés dejó el árbol distinto de como estaba:\n' + despues.split('\0').join('\n')); }
console.log(`${malos ? '✗' : '✓'} textos de las pruebas al revés: ${archivos.length} archivos · ${malos} caso(s) sin su texto${sinCasos ? ` · ${sinCasos} con otro formato (no se miran aquí)` : ''}`);
process.exit(malos ? 1 : 0);
})();
