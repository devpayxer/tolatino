// Prueba al revés del guardián estadoSinRepetir (23 nov): el estado de la cabecera de la ficha (palabra + resto) no repite una palabra («Cerrado hoy · hoy ·
// abre mañana») ni deja un « · » colgando. Se inyecta el defecto, el guardián debe fallar con SU renglón ([estadoSinRepetir]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const T = 'apps/web/lib/tarjeta.ts', F = 'apps/web/lib/ficha.ts', G = 'estadoSinRepetir';
const CUERPO = 'const resto = n > 0 && t.slice(0, n).toLowerCase() === corto.toLowerCase() && /^(\\s|·|$)/.test(t.slice(n)) ? t.slice(n) : t;';
const casos = [
  ['la ficha vuelve a quitar «Abierto|Cerrado» con replace', F, 'const nota = restoDelEstado(st.text, estadoCorto);', 'const nota = st.text.replace(/^(Abierto|Cerrado|Open|Closed)( · )?/, "");'],
  ['la partición vuelve a quitar solo «Abierto|Cerrado» (queda «hoy · abre…»)', T, CUERPO, 'const resto = t.replace(/^(Abierto|Cerrado|Open|Closed)( · )?/, ""); void n;'],
  ['la palabra se quita aunque sea parte de otra («Abiertos los…»)', T, ' && /^(\\s|·|$)/.test(t.slice(n)) ? t.slice(n) : t;', ' ? t.slice(n) : t;'],
  ['no se recortan los « · » ni los espacios de los bordes', T, 'return resto.replace(/^[\\s·]+|[\\s·]+$/g, "");', 'return resto;'],
  ['la palabra se compara con mayúsculas exactas', T, 't.slice(0, n).toLowerCase() === corto.toLowerCase()', 't.slice(0, n) === corto.toLowerCase()'],
  ['fic9cab deja de mirar la cabecera servida', 'pruebas/e2e/fic9cab.cjs', 'const sinRepetir = ', 'const sinRepetir_ = '],
  ['estado() repite «hoy» en cerrado hoy (ES)', T, '"Cerrado hoy · abre"', '"Cerrado hoy · hoy abre"'],
  ['estado() repite «today» en cerrado hoy (EN)', T, '"Closed today · opens"', '"Closed today · today opens"'],
  ['estado() repite «temporalmente»', T, 'return { open: false, text: es ? "Cerrado temporalmente" : "Temporarily closed" };', 'return { open: false, text: es ? "Cerrado temporalmente · temporalmente" : "Temporarily closed" };'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [que, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(que, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
