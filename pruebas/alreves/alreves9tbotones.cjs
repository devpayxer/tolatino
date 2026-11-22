// Prueba al revés del guardián botonTextoConAlto (20 nov): un <button> con forma de enlace (text-action o subrayado) lleva su caja de 44 (o al
// menos un alto). Se quita el alto a varios de distintas pantallas y se agrega uno nuevo sin alto; el guardián debe fallar con SU mensaje.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'botonTextoConAlto';
const casos = [
  ['apps/web/app/(app)/n/[id]/FichaNueva.tsx', 'onClick={onVer} className="inline-flex min-h-11 items-center self-start', 'onClick={onVer} className="self-start'],
  ['apps/web/app/(app)/n/[id]/FichaNueva.tsx', 'onClick={rs.escribir} className="inline-flex min-h-11 items-center text-[13.5px]', 'onClick={rs.escribir} className="text-[13.5px]'],
  ['apps/web/app/(app)/pedido/[num]/Pedido.tsx', 'className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-bold text-action"', 'className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"'],
  ['apps/web/app/(app)/n/[id]/reservar/Detalles.tsx', 'className="inline-flex min-h-11 items-center mt-2 text-[12.5px] font-bold text-action"', 'className="mt-2 text-[12.5px] font-bold text-action underline"'],
  // un <span role="link"> con onClick de flecha antes del className (lo que el primer guardián no veía: «Mis boletos y RSVP» 130 × 19)
  ['apps/web/app/(app)/eventos/Eventos.tsx', 'className="flex min-h-11 cursor-pointer items-center gap-[7px] text-[12px] font-bold text-action"', 'className="flex cursor-pointer items-center gap-[7px] text-[12px] font-bold text-action"'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(`${f.split('/').pop()}: ${a.slice(0, 40).replace(/\n/g, ' ')}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
