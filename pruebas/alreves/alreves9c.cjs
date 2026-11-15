// Prueba al revés del guardián de 9c contrasteTexto (texto gris por debajo de AA): el gris de una pestaña del sistema portado vuelve al 42 %,
// una etiqueta del Super Admin vuelve al 50 %, una clase text-ink/45 en Mi cuenta, un text-[rgba(…,.5)] nuevo y el token --tl-text-muted al 50 %.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([contrasteTexto]); se restaura. «crear»: se crea el archivo, se corre y se borra.
// También al derecho: una sombra o un borde con ink al 50 % no es texto (el guardián no debe saltar).
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'contrasteTexto';
const casos = [
  ['packages/ui/src/ds/navigation/Tabs.js', "on ? 'var(--tl-ink)' : 'rgba(11,14,18,.6)';", "on ? 'var(--tl-ink)' : 'rgba(11,14,18,.42)';"],
  ['apps/web/app/admin/Colas.tsx', 'letterSpacing: ".14em", color: "rgba(11,14,18,.6)" }}>{E("CASO", "CASE")}', 'letterSpacing: ".14em", color: "rgba(11,14,18,.5)" }}>{E("CASO", "CASE")}'],
  ['apps/web/app/(app)/cuenta/boletos/[codigo]/Boleto.tsx', 'tracking-[0.16em] text-ink/60">{cuando}', 'tracking-[0.16em] text-ink/45">{cuando}'],
  ['packages/ui/src/tokens.css', '--tl-text-muted: rgba(11,14,18,.6);', '--tl-text-muted: rgba(11,14,18,.5);'],
];
const crear = [
  ['apps/web/app/admin/ContrasteAlReves.tsx', 'export const X = () => <span className="text-[rgba(11,14,18,.5)]">gris</span>;\n'],
];
const derecho = [
  ['apps/web/app/admin/ContrasteAlDerecho.tsx', 'export const Y = () => <div className="shadow-[0_8px_20px_rgba(11,14,18,.5)]" style={{ boxShadow: "0 2px 6px rgba(11,14,18,.45)", border: "1px solid rgba(11,14,18,.4)" }} />;\n'],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out], esperaFalla = true) => { total++; const ok = falla === esperaFalla; console.log(`  ${ok ? '✓' : '✗'} ${G} ${esperaFalla ? 'al revés' : 'al derecho'} (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (ok) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  informe(f.split('/').pop(), r);
}
for (const [lista, espera] of [[crear, true], [derecho, false]]) for (const [f, c] of lista) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(); } finally { fs.unlinkSync(ruta); }
  informe(`crear ${f.split('/').slice(-2).join('/')}`, r, espera);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
