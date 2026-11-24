// 24 nov · Prueba al revés del guardián buscarCumpleLaSugerencia (fallo visto por el fundador: «Arro» prometía resultados en la sugerencia y al
// buscar salía «No encontramos»): se inyecta el defecto, el guardián debe fallar con SU mensaje ([buscarCumpleLaSugerencia]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G0 = 'buscarCumpleLaSugerencia', G1 = 'buscarEntiendeFaltas';
const P = 'apps/web/app/(app)/buscar/page.tsx', A = 'apps/web/app/api/buscar/route.ts', L = 'apps/web/lib/buscar.ts';
const casos = [
  [P, 'const intentos: [Entendido, boolean][] = [[E0, true], ', 'const intentos: [Entendido, boolean][] = [[E0, false], ', 'el segundo intento no completa la palabra'],
  [P, '    if (!E0.grupos.length || !vacio()) break;', '    break;', 'nunca se intenta completar la palabra'],
  [P, 'const E0: Entendido = await entender(q, false, { corregir: false });', 'const E0: Entendido = await entender(q);', 'las faltas se corrigen antes de completar («arro» → arco)'],
  [P, '? [[Ec, false], [Ec, true]]', '? [[Ec, true], [Ec, false]]', 'la corrección va antes de su búsqueda exacta'],
  [P, 'orden, pagina: tab === "biz" ? pagina : 0, limite, vivo }),', 'orden, pagina: tab === "biz" ? pagina : 0, limite }),', 'los negocios no completan la palabra'],
  [P, 'userId: u?.id ?? null, vivo }),', 'userId: u?.id ?? null }),', 'los platos no completan la palabra'],
  [P, 'buscarEventos(tsq(E.grupos, true, vivo),', 'buscarEventos(tsq(E.grupos, true),', 'los eventos no completan la palabra'],
  [P, 'buscarVecinos(u.id, CIUDAD, tsq(E.grupos, true, vivo),', 'buscarVecinos(u.id, CIUDAD, tsq(E.grupos, true),', 'los vecinos no completan la palabra'],
  [P, 'textoRazon(b.name, RZ.get(b.id), E, es, { vivo: completada })', 'textoRazon(b.name, RZ.get(b.id), E, es)', 'la razón se calcula con la palabra entera'],
  [A, 'negocios(E, { punto: loc, cat, limite: 4, vivo: true })', 'negocios(E, { punto: loc, cat, limite: 4 })', 'la sugerencia deja de completar la palabra'],
  // Faltas de escritura (guardián buscarEntiendeFaltas).
  [L, 'const dudosas = grupos.filter((g) => g.w.length >= 4);', 'const dudosas = grupos.filter((g) => g.w.length >= 5);', 'las palabras de 4 letras ya no se corrigen', G1],
  [L, ' or levenshtein_less_equal(v.word, w, 2) <= case when char_length(w) <= 5 then 1 else 2 end)', ')', 'solo trigramas: «aroz» no encuentra arroz', G1],
  [L, 'order by levenshtein_less_equal(v.word, w, 3), similarity(v.word, w) desc', 'order by similarity(v.word, w) desc', 'gana la más parecida aunque tenga más cambios', G1],
  [L, 'where char_length(v.word) between char_length(w) - 2 and char_length(w) + 2\n                  and (', 'where (', 'la corrección recorre todo el vocabulario', G1],
];
let bien = 0;
for (const [f, a, b, que, G = G0] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 60)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); } catch (e) { out = String(e.stderr).split('\n').find((l) => l.includes(`[${G}]`)) || ''; falla = !!out; }
  finally { fs.writeFileSync(ruta, orig); }
  console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${f.split('/').pop()}: ${que})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
const limpio = require('../lib/alreves-fin.cjs')(R);
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
