// Prueba al revés del guardián respondeAlToque (19 nov): la pantalla responde en el mismo toque (barra de navegación + esqueletos). Se
// inyecta el defecto, el guardián debe fallar con SU mensaje ([respondeAlToque]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const BN = 'apps/web/app/BarraNavegacion.tsx', IC = 'apps/web/instrumentation-client.ts', G = 'respondeAlToque';
const casos = [
  [G, IC, 'window.dispatchEvent(new CustomEvent("tl:navega"', 'void (new CustomEvent("tl:navega"'],
  [G, BN, 'window.addEventListener("tl:navega", alNavegar);', ''],
  [G, BN, 'import { useEffect, useRef } from "react";', 'import { useEffect, useRef, useState } from "react";\nconst _x = useState;'],
  // 20 nov · sin la línea azul: responde el elemento tocado
  [G, BN, 'el.setAttribute("data-tl-tocado", "");', 'el.setAttribute("data-x", "");'],
  [G, BN, 'document.addEventListener("pointerdown", alApretar, true);', ''],
  [G, BN, 'tics.current.push(window.setTimeout(soltar, 12000));', ''],
  [G, 'packages/ui/src/esqueleto.css', '[data-tl-tocado] { opacity: .55; transition: opacity .1s ease-out; }', '.tl-barra-nav { position: fixed; top: 0; height: 3px; background: var(--tl-action); }'],
  [G, 'packages/ui/src/esqueleto.css', ':not(:has(:active)) { opacity: .7; }', ' { opacity: .7; }'],
  [G, 'apps/web/app/layout.tsx', '<BarraNavegacion />', ''],
  [G, 'apps/web/app/Pendiente.tsx', 'window.addEventListener("tl:pendiente", alEmpezar);', ''],
  [G, 'apps/web/app/Pendiente.tsx', 'tics.current.push(window.setTimeout(() => setTipo(tipoDe(destino)), 120));', 'setTipo(tipoDe(destino));'],
  [G, BN, 'window.dispatchEvent(new CustomEvent("tl:pendiente", { detail: { url } }));', ''],
  [G, 'apps/web/app/(app)/AppShell.tsx', '<Pendiente>{children}</Pendiente>', '{children}'],
  [G, 'apps/web/app/admin/layout.tsx', '<Pendiente>{children}</Pendiente>', '{children}'],
  [G, 'packages/ui/src/esqueleto.css', 'background: var(--tl-photo-bg);', 'background: #e4e1da;'],
  [G, 'apps/web/app/globals.css', '@import "@tolatino/ui/esqueleto.css";', ''],
];
let bien = 0, total = 0;
// Un loading.tsx nuevo en la app (crear el archivo, correr, quitarlo).
const extra = () => {
  const f = path.join(R, 'apps/web/app/(app)/buscar/loading.tsx');
  fs.writeFileSync(f, 'export default function Cargando() { return null; }\n');
  let r; try { r = correr(G); } finally { fs.unlinkSync(f); }
  informe(G, 'un loading.tsx en (app)/buscar', r);
};
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
extra();
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
