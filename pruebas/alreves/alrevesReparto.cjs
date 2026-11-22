// Prueba al revés del guardián repartoAsignado (22 nov, revisión del CI B3): la punta a punta va en partes por la asignación guardada en
// pruebas/reparto.json. Cada caso siembra un defecto (en el reparto, en el corredor o en su biblioteca, o pruebas nuevas sin asignar); el guardián
// debe fallar con SU renglón ([repartoAsignado]); se restaura.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const G = 'repartoAsignado', A = 'pruebas/reparto.json';
const parteDe = (rep, x) => rep.partes.findIndex((p) => p.includes(x));
// Defectos en el reparto (transformaciones del JSON).
const enReparto = [
  ['una prueba que requiere a otra, en otra parte', (rep) => { const k = parteDe(rep, 'ayu4z'); rep.partes[k] = rep.partes[k].filter((x) => x !== 'ayu4z'); rep.partes[(k + 1) % rep.partes.length].push('ayu4z'); }],
  ['el requisito DESPUÉS de quien lo pide', (rep) => { const p = rep.partes[parteDe(rep, 'ayu4z')]; p.splice(p.indexOf('fie4v'), 1); p.push('fie4v'); }],
  ['una prueba en dos partes', (rep) => { const k = parteDe(rep, 'push8c'); rep.partes[(k + 1) % rep.partes.length].push('push8c'); }],
  ['una prueba que ya no existe', (rep) => { rep.partes[0].push('zz9noexiste'); rep.seg.zz9noexiste = 10; }],
  ['un reparto para una n que el input «partes» no ofrece', (rep) => { const u = rep.partes.pop(); rep.partes[0].push(...u); }],
  ['sin anotar a quien llama a requiere con un nombre no escrito', (rep) => { rep.dinamicos = []; }],
  ['una prueba sin su duración', (rep) => { delete rep.seg.din9n4; }],
];
// Defectos en el corredor y en la biblioteca (texto).
const casos = [
  ['pruebas/correr.mjs', 'const asignada = flag("--barajar") || e2e.length !== sel.length ? null : RP.parteDe(', 'const asignada = true ? null : RP.parteDe('],
  ['pruebas/correr.mjs', 'const asignada = flag("--barajar") || e2e.length !== sel.length ? null : RP.parteDe(', 'const asignada = e2e.length !== sel.length ? null : RP.parteDe('],
  ['pruebas/lib/reparto.cjs', '  return ordenTopologico(orden.filter((x) => parte.get(x) === i - 1), E, pos);\n}', '  return orden.filter((x) => parte.get(x) === i - 1);\n}'],
  ['pruebas/lib/reparto.cjs', '  for (const [a, b] of E) if (par.has(a) && par.has(b)) par.set(raiz(a), raiz(b));', '  for (const [a, b] of E) if (par.has(a) && par.has(b) && false) par.set(raiz(a), raiz(b));'],
  ['pruebas/lib/reparto.cjs', "  const conservar = previo && !rebalancear && Array.isArray(previo.partes) && previo.partes.length === n;", "  const conservar = false;"],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
const ra = path.join(R, A), origA = fs.readFileSync(ra, 'utf8');
for (const [que, cambia] of enReparto) {
  const rep = JSON.parse(origA); cambia(rep);
  fs.writeFileSync(ra, JSON.stringify(rep, null, 1) + '\n');
  let r; try { r = correr(G); } finally { fs.writeFileSync(ra, origA); }
  informe(`reparto.json: ${que}`, r);
}
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(`${f.split('/').pop()}: ${a.slice(0, 50).replace(/\n/g, ' ')}`, r);
}
// Seis pruebas nuevas sin asignar (más de 5): rojo hasta regenerar. Una sola: aviso, no rojo.
{
  const nuevas = [1, 2, 3, 4, 5, 6].map((i) => path.join(R, 'pruebas', 'e2e', `zz9reparto${i}.cjs`));
  try {
    fs.writeFileSync(nuevas[0], "console.log('✓ nueva');\n");
    const [falla1] = correr(G); total++; console.log(`  ${falla1 ? '✗' : '✓'} ${G}: una prueba nueva sin asignar es un aviso, no rojo`); if (!falla1) bien++;
    for (const f of nuevas.slice(1)) fs.writeFileSync(f, "console.log('✓ nueva');\n");
    informe('seis pruebas nuevas sin asignar', correr(G));
  } finally { for (const f of nuevas) try { fs.unlinkSync(f); } catch { /* no estaba */ } }
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
