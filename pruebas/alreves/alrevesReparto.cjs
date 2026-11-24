// Prueba al revés del guardián repartoAsignado (22 nov, revisión del CI B3): la punta a punta va en partes por la asignación guardada en
// pruebas/reparto.json. Cada caso siembra un defecto (en el reparto, en el corredor o en su biblioteca, o pruebas nuevas sin asignar); el guardián
// debe fallar con SU renglón ([repartoAsignado]); se restaura.
// 24 nov · Y una dirigida (una selección que no es la punta a punta entera) va por tiempo: los casos nuevos exigen además SU mensaje.
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
  ['un reparto para otra n que la de ci.yml', (rep) => { const u = rep.partes.pop(); rep.partes[0].push(...u); }],
  ['sin anotar a quien llama a requiere con un nombre no escrito', (rep) => { rep.dinamicos = []; }],
  ['una prueba sin su duración', (rep) => { delete rep.seg.din9n4; }],
];
// Defectos en el corredor y en la biblioteca (texto).
const casos = [
  ['pruebas/correr.mjs', '  if (!flag("--barajar") && carril === "e2e" && RP.esEntera(RAIZ, nombres)) {', '  if (false) {', 'de la punta a punta no corre la parte 1 de pruebas/reparto.json'],
  ['pruebas/correr.mjs', '  if (!flag("--barajar") && carril === "e2e" && RP.esEntera(RAIZ, nombres)) {', '  if (carril === "e2e" && RP.esEntera(RAIZ, nombres)) {', '--barajar no puede usar la asignación'],
  // 24 nov · Una dirigida: por posición, barajada por tiempo, la biblioteca por posición, sin los requiere o sin su orden.
  ['pruebas/correr.mjs', '  else if (!flag("--barajar") && carril === "e2e") { parte = RP.parteSubconjunto(', '  else if (false) { parte = RP.parteSubconjunto(', 'una dirigida (una selección que no es la punta a punta entera) no va por tiempo'],
  ['pruebas/correr.mjs', '  else if (!flag("--barajar") && carril === "e2e") { parte = RP.parteSubconjunto(', '  else if (carril === "e2e") { parte = RP.parteSubconjunto(', 'una dirigida barajada no puede ir por tiempo'],
  ['pruebas/lib/reparto.cjs', '  return repartirPorTiempo({ sel, n, seg: reparto?.seg ?? {}, aristas: aristas(R).aristas, orden: catalogo(R) }).partes[i - 1];', '  return sel.filter((_, k) => k % n === i - 1);', 'una dirigida no va por tiempo: su parte más larga'],
  ['pruebas/lib/reparto.cjs', '  return repartirPorTiempo({ sel, n, seg: reparto?.seg ?? {}, aristas: aristas(R).aristas, orden: catalogo(R) }).partes[i - 1];', '  return repartirPorTiempo({ sel, n, seg: reparto?.seg ?? {}, aristas: [], orden: catalogo(R) }).partes[i - 1];', 'van en partes distintas'],
  ['pruebas/lib/reparto.cjs', '  const partes = Array.from({ length: n }, (_, i) => ordenTopologico(nodos.filter((x) => donde.get(x) === i), E, pos).filter((x) => enSel.has(x)));', '  const partes = Array.from({ length: n }, (_, i) => nodos.filter((x) => donde.get(x) === i).filter((x) => enSel.has(x)));', 'corre DESPUÉS en la parte'],
  ['pruebas/lib/reparto.cjs', '  return ordenTopologico(orden.filter((x) => parte.get(x) === i - 1), E, pos);\n}', '  return orden.filter((x) => parte.get(x) === i - 1);\n}'],
  ['pruebas/lib/reparto.cjs', '  for (const [a, b] of E) if (par.has(a) && par.has(b)) par.set(raiz(a), raiz(b));', '  for (const [a, b] of E) if (par.has(a) && par.has(b) && false) par.set(raiz(a), raiz(b));'],
  ['pruebas/lib/reparto.cjs', "  const conservar = previo && !rebalancear && Array.isArray(previo.partes) && previo.partes.length === n;", "  const conservar = false;"],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${G}]`)); return [l.length > 0, l.join(' | ')]; }
};
const informe = (que, [falla, out], msg) => { const ok = falla && (!msg || out.includes(msg)); total++; console.log(`  ${ok ? '✓' : '✗'} ${G} al revés (${que})${msg && !ok ? ` [esperaba «${msg}»]` : ''}${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (ok) bien++; };
const ra = path.join(R, A), origA = fs.readFileSync(ra, 'utf8');
for (const [que, cambia] of enReparto) {
  const rep = JSON.parse(origA); cambia(rep);
  fs.writeFileSync(ra, JSON.stringify(rep, null, 1) + '\n');
  let r; try { r = correr(G); } finally { fs.writeFileSync(ra, origA); }
  informe(`reparto.json: ${que}`, r);
}
for (const [f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(`${f.split('/').pop()}: ${a.slice(0, 50).replace(/\n/g, ' ')}`, r, msg);
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
