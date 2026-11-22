// Prueba al revés del guardián de 9n-20. fichaOcultaSoloEquipo («Ver como cliente» de un negocio no activo): ficha() sin el filtro de activos,
// la vista del equipo sin pedir neg:ver, sin auditar o contando la vista, y otra pantalla que pide { equipo: true }.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje; se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const F = 'apps/web/lib/ficha.ts', P = 'apps/web/app/(app)/n/[id]/page.tsx';
const casos = [
  ['fichaOcultaSoloEquipo', F, "where b.id = $1 and (b.status = 'active' or ($2::boolean and b.status <> 'merged'))", "where b.id = $1 and (b.status = 'active' or $2::boolean)"],
  ['fichaOcultaSoloEquipo', P, '    if (s?.puede("neg", "ver")) {', '    if (s) {'],
  ['fichaOcultaSoloEquipo', P, 'await tx((c) => auditar(c, { actor: s.id, action: "negocio.ver_como_cliente"', 'await tx(async (c) => ({ actor: s.id, action: "negocio.ver_como_cliente"'],
  ['fichaOcultaSoloEquipo', P, '  if (!vistaEquipo) {\n    after(() => registrarVista', '  {\n    after(() => registrarVista'],
];
const crear = [['fichaOcultaSoloEquipo', 'apps/web/lib/ficha-al-reves.ts', 'import { ficha } from "./ficha";\nexport const x = () => ficha("x", "es", undefined, { equipo: true });\n']];
let bien = 0, total = 0;
const correr = (G) => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (G, que, [falla, out], esperaFalla = true) => { total++; const ok = falla === esperaFalla; console.log(`  ${ok ? '✓' : '✗'} ${G} ${esperaFalla ? 'al revés' : 'al derecho'} (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (ok) bien++; };
for (const [G, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(G, f.split('/').pop(), r);
}
for (const [G, f, c] of crear) { const ruta = path.join(R, f); fs.writeFileSync(ruta, c); let r; try { r = correr(G); } finally { fs.unlinkSync(ruta); } informe(G, `crear ${f.split('/').pop()}`, r); }
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
