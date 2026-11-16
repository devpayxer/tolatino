// Prueba al revés de C-005 (ficha nueva del negocio). valorDeCliente: el servidor importa un valor de un módulo de cliente (la tabla de
// categorías desde FichaNueva). fichaNuevaSoloPro: la ficha nueva sin «f.pro &&», horas inventadas en el cliente, Booking sin validar el
// día y la hora que llegan de la ficha, o quedándose con una hora que ya no está libre.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje; se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const P = 'apps/web/app/(app)/n/[id]/page.tsx', F = 'apps/web/app/(app)/n/[id]/FichaNueva.tsx', B = 'apps/web/app/(app)/n/[id]/cita/page.tsx', K = 'apps/web/app/(app)/n/[id]/cita/Booking.tsx';
const casos = [
  ['valorDeCliente', P, 'import { CFG_FICHA } from "@/lib/ficha-nueva";', 'import { CFG_FICHA } from "./FichaNueva";'],
  ['fichaNuevaSoloPro', P, '{f.pro && CFG_FICHA[f.cat] ? (', '{CFG_FICHA[f.cat] ? ('],
  ['fichaNuevaSoloPro', F, 'void horasDeCita(v.cp.negocio.id,', 'void Promise.resolve(v.cp.negocio.id,'],
  ['fichaNuevaSoloPro', B, 'd >= 0 && d <= 13 && Number.isInteger(m) && m >= 0 && m < 1440', 'd >= 0 && Number.isInteger(m)'],
  ['fichaNuevaSoloPro', K, 'find((y) => y.m === inicial.h && y.free)', 'find((y) => y.m === inicial.h)'],
  // C-006: una categoría en la tabla sin sus piezas de siempre (la hoja de Salud).
  ['fichaNuevaSoloPro', F, '<SaHoja v={sa} />', '<span />'],
  // C-006: el Resumen del mercado sin lo suyo (la balanza, cómo se cobra por peso) y la página pintada dos veces (teléfono y computadora a la vez).
  ['fichaNuevaSoloPro', F, 'resumen: (d) => <MeResumen v={me} desk={d} onAll={irCat} />, ', ''],
  ['fichaNuevaSoloPro', F, '{modo === "d" ? (', '{true ? ('],
];
const crear = [];
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
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
