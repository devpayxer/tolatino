// Prueba al revés de los guardianes de 9b-1 (las clases de bug que cazó la regresión en una base nueva). Se inyecta el defecto, el guardián
// debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const SH = 'apps/web/app/(app)/AppShell.tsx';
const casos = [
  // parametroCiudadDelSelector: el marco se come el ?ciudad=<id> de /recomendar
  ['parametroCiudadDelSelector', SH, 'const v = sp.get("ciudad"); if (v === "" || v === "pedir") {', 'const v = sp.get("ciudad"); if (sp.has("ciudad")) {'],
  ['parametroCiudadDelSelector', SH, 'const v = sp.get("ciudad"); if (v === "" || v === "pedir") {', 'const v = sp.get("ciudad"); if (v !== null) {'],
  // etiquetasSeEnvuelven: la fila de etiquetas de PostCard sin envolver
  ['etiquetasSeEnvuelven', 'packages/ui/src/ds/community/PostCard.js', "      flexWrap: 'wrap',\n      alignItems: 'center',\n      gap: 5,\n      rowGap: 6,", "      alignItems: 'center',\n      gap: 5,"],
  // hoyEnLaCiudad: «hoy» o un vencimiento en UTC
  ['hoyEnLaCiudad', 'apps/web/lib/categoria.ts', '  const hoy = hoyEn();\n  if (TRANS_HOY', '  const hoy = new Date().toISOString().slice(0, 10);\n  if (TRANS_HOY'],
  ['hoyEnLaCiudad', 'apps/web/lib/pases/certificado.ts', '  const vence = hoyEn(undefined, d.vence);', '  const vence = d.vence.toISOString().slice(0, 10);'],
  // borrarCuentaEnCadaApp: el Repartidor sin equipo (sin barra ni Perfil) vuelve a quedarse sin camino a Borrar mi cuenta; o Perfil lo pierde
  ['borrarCuentaEnCadaApp', 'apps/web/app/repartidor/Repartidor.tsx', 'the business invited.`) });\n    B.push({ type: "rows", items: filasCuenta });\n  } else if (det) {', 'the business invited.`) });\n  } else if (det) {'],
  ['borrarCuentaEnCadaApp', 'apps/web/app/repartidor/Repartidor.tsx', '    B.push({ type: "rows", items: filasCuenta });\n  }\n', '  }\n'],
  // ahoraDeLaHidratacion: «hace N min» con el reloj de cada lado (error 418 al cambiar el minuto), o la raíz sin el proveedor del «ahora»
  ['ahoraDeLaHidratacion', 'apps/web/app/(app)/soporte/Soporte.tsx', 'Math.max(0, ahora - new Date(iso).getTime())', 'Math.max(0, Date.now() - new Date(iso).getTime())'],
  ['ahoraDeLaHidratacion', 'apps/web/app/layout.tsx', '<body><AhoraProvider t={Date.now()}>{children}<Arranque /></AhoraProvider></body>', '<body>{children}<Arranque /></body>'],
  // listaPuertaCoherente: la lista de la noche vuelve a contar solo in_n en una reserva terminada («Entró 1» que el servidor rechaza)
  ['listaPuertaCoherente', 'apps/web/lib/noche-reservas.ts', "case when o.status = 'done' then o.party_size else coalesce((o.details->>'in_n')::int, 0) end as entraron", "coalesce((o.details->>'in_n')::int, 0) as entraron"],
  // pruebaQueComprueba: la corrida vuelve a contar en verde una prueba sin ninguna ✓, o una prueba que solo imprime
  ['pruebaQueComprueba', 'pruebas/correr.mjs', 'ok: codigo === 0 && !sinNada,', 'ok: codigo === 0,'],
];
const crear = [
  ['pruebaQueComprueba', 'pruebas/e2e/zz9b1solomira.cjs', "console.log('precio guardado:', 1250);\n"],
];
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
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f), dir = path.dirname(ruta), nuevo = !fs.existsSync(dir);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); if (nuevo) try { fs.rmdirSync(dir); } catch { /* no vacía */ } }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
