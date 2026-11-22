// Prueba al revés del guardián sinEsperaFijaLarga (22 nov, tanda 3a de la revisión del CI): una espera fija de 5 s o más en pruebas/e2e lleva su motivo
// escrito («// ESPERA-FIJA: …»); la de 16 s «por la caché de Configuración» ya no vale (pruebas/lib/config-lista.cjs). Se inyecta el defecto, el guardián debe
// fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra. Además, los dos casos que NO deben fallar (una espera corta sin
// motivo; una larga con motivo) se comprueban al final y cuentan igual.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'sinEsperaFijaLarga';
const casos = [
  // el motivo se borra de una espera de reloj de verdad (la app de códigos cambia de paso cada 30 s)
  [G, 'pruebas/e2e/adm9n3.cjs', '// ESPERA-FIJA: la app de códigos cambia de paso cada 30 s', '//'],
  // una prueba vuelve a dormir 16 s después de escribir Configuración (en vez de configLista())
  [G, 'pruebas/e2e/compa7f.cjs', 'await configLista();', 'await dormir(16000);'],
  // … con el motivo de siempre: no vale, es de config-lista
  [G, 'pruebas/e2e/compa7f.cjs', 'await configLista();', 'await dormir(16000);   // ESPERA-FIJA: la caché de Configuración es de 15 s'],
  // … con setTimeout y el número con guion bajo
  [G, 'pruebas/e2e/sop7b.cjs', 'await configLista();', 'await new Promise((r) => setTimeout(r, 16_000));'],
];
const crear = [
  [G, 'pruebas/e2e/zz9tespera1.cjs', "(async () => { await new Promise((r) => setTimeout(r, 61_000)); })();\n"],
  [G, 'pruebas/e2e/zz9tespera2.cjs', "(async () => { await page.waitForTimeout(31 * 1000); })();\n"],
  [G, 'pruebas/e2e/zz9tespera3.cjs', "(async () => { await sleep(5000); })();\n"],
];
// Lo que NO debe fallar: una espera corta sin motivo y una larga con motivo escrito (en la misma línea y en la de arriba).
const limpios = [
  ['espera corta (4 999 ms) sin motivo', 'pruebas/e2e/zz9tespera4.cjs', "(async () => { await dormir(4999); await page.waitForTimeout(300); })();\n"],
  ['larga con motivo en la misma línea', 'pruebas/e2e/zz9tespera5.cjs', "(async () => { await dormir(31000); // ESPERA-FIJA: el paso de 30 s de la app de códigos\n})();\n"],
  ['larga con motivo en la línea de arriba', 'pruebas/e2e/zz9tespera6.cjs', "(async () => {\n  // ESPERA-FIJA: la oferta vence a los 20 s y el barrido la cierra\n  await dormir(21000);\n})();\n"],
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
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
// Los que no deben fallar: el guardián tiene que salir limpio con ellos puestos.
for (const [que, f, c] of limpios) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(G); } finally { fs.unlinkSync(ruta); }
  total++; console.log(`  ${r[0] ? '✗' : '✓'} ${G}: ${que} no es un defecto${r[1] ? ' → ' + r[1].trim().slice(0, 170) : ''}`); if (!r[0]) bien++;
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
