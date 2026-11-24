// 24 nov · Prueba al revés del guardián fichaFijaSinTapar (la ronda de ajustes del fundador a la ficha Pro, 23 nov): se inyecta el defecto, el guardián
// debe fallar con SU mensaje ([fichaFijaSinTapar]); se restaura. Cada caso lleva, al final, lo que se rompe.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'fichaFijaSinTapar';
const F = 'apps/web/app/(app)/n/[id]/FichaNueva.tsx', M = 'apps/web/app/(app)/n/[id]/MenuCliente.tsx', P = 'packages/ui/src/core/PestanasFicha.tsx', N = 'apps/web/app/(app)/n/[id]/Novedades.tsx', E = 'pruebas/e2e/fic9cab.cjs';
const casos = [
  // Fijar y soltar: solo setTab fija y solo la flecha (soltar) suelta.
  [F, '    setFijado(true);\n', '', 'setTab ya no fija el menú'],
  [F, 'const soltar = () => { setFijado(false); setTabS("res");', 'const soltar = () => { setTabS("res");', 'soltar ya no suelta'],
  [F, '    const ver = () => { const el = tabsRef.current;', '    const ver = () => { if (window.scrollY === 0) setFijado(false); const el = tabsRef.current;', 'subir hasta arriba suelta el menú'],
  [F, 'const [fijado, setFijado] = useState(false);', 'const [fijado, setFijado] = useState(true);', 'la ficha abre ya fijada'],
  [F, 'className={fijado ? "hidden" : "flex flex-col gap-2 px-5 pb-3 pt-5"}', 'className="flex flex-col gap-2 px-5 pb-3 pt-5"', 'fijado, la cabecera no se oculta'],
  [F, 'className={fijado ? "hidden" : "relative h-[330px]"}', 'className="relative h-[330px]"', 'fijado, la portada no se oculta'],
  [F, 'const visM = pegadaM || fijado;', 'const visM = pegadaM;', 'fijado arriba del todo, el nombre no se ve'],
  [F, 'onClick={() => (fijado ? soltar() : window.scrollTo({ top: 0, behavior: "smooth" }))}', 'onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}', 'la flecha ya no suelta el menú'],
  // La franja del nombre: su sitio, su corte y su sello.
  [F, 'style={{ top: CAB_MOVIL }} data-pieza="nombre-pegado"', 'style={{ top: 0 }} data-pieza="nombre-pegado"', 'la franja se pega detrás de la cabecera de la app'],
  [F, '<span className="min-w-0 truncate font-display text-[18px] font-extrabold', '<span className="font-display text-[18px] font-extrabold', 'el nombre largo ya no se corta con puntos suspensivos'],
  [F, 'font-display text-[18px] font-extrabold leading-none', 'font-display text-[18px] leading-none', 'el nombre pegado ya no va en negrita'],
  [F, '{sello ? <span className="flex-none">{sello}</span> : null}', '{sello ? <span>{sello}</span> : null}', 'el sello pegado se aprieta y se sale de la pantalla'],
  [F, 'style={{ top: CAB_MOVIL + NOMBRE_MOVIL }}><PestanasFicha modo="movil"', 'style={{ top: CAB_MOVIL }}><PestanasFicha modo="movil"', 'las pestañas se montan sobre el nombre'],
  [F, 'NOMBRE_MOVIL = 44, NOMBRE_DESK = 52;', 'NOMBRE_MOVIL = 40, NOMBRE_DESK = 52;', 'cambia la altura del nombre y las categorías quedan mal pegadas'],
  // Escritorio (a prueba): la franja y su flecha dentro de la caja.
  [F, 'className="inline-flex size-11 flex-none items-center justify-start text-ink"', 'className="-ml-3 inline-flex size-11 flex-none items-center justify-start text-ink"', 'la flecha del escritorio sale 12 px fuera (margen negativo)'],
  [F, 'inline-flex size-11 flex-none items-center justify-start text-ink', 'inline-flex size-11 flex-none items-center justify-center text-ink', 'la flecha del escritorio queda centrada en su botón'],
  [F, 'style={{ top: CAB_DESK }} data-pieza="nombre-pegado-desk"', 'style={{ top: 0 }} data-pieza="nombre-pegado-desk"', 'la franja del escritorio se pega detrás de la cabecera'],
  [F, '<div ref={tiraRef} className="group sticky z-20" style={{ top: CAB_DESK + NOMBRE_DESK }}>', '<div ref={tiraRef} className="group sticky z-20" style={{ top: CAB_DESK }}>', 'las pestañas del escritorio se montan sobre la franja'],
  [F, 'className="group sticky z-20"', 'className="sticky z-20"', 'las flechas de la tira pierden su group (nunca salen con el cursor)'],
  [F, 'opacity-0 transition-opacity duration-150 group-hover:opacity-100', 'transition-opacity duration-150 group-hover:opacity-100', 'una flecha de la tira se ve siempre (sin opacity-0)'],
  [F, 'data-pieza="estado-pegado"', 'data-pieza="estado-x"', 'el estado sale de la barra del nombre del escritorio'],
  [F, '<PestanasFicha modo="escritorio" items={tabs} active={activa} onChange={ir} />', '<PestanasFicha modo="escritorio" items={tabs} active={activa} onChange={ir} aside={null} />', 'la tira del escritorio vuelve a reservar el hueco del estado'],
  // La barra de categorías del menú y el carrito.
  [M, '${card ? "top-[151px]" : "top-[57px]"}', '${card ? "top-[57px]" : "top-[57px]"}', 'las categorías se pegan detrás de las pestañas'],
  [M, '${card ? "top-[151px]" : "top-[57px]"}', '${card ? "top-[147px]" : "top-[57px]"}', 'las categorías quedan 4 px detrás de las pestañas'],
  [N, 'export function NovTab(', 'const BarraSuelta = () => <div className="sticky top-[100px] bg-white" />;\nexport function NovTab(', 'otra pestaña pega una barra detrás de las pestañas'],
  [M, '(parseFloat(getComputedStyle(barra).top) || 57) + barra.offsetHeight + 8 : 120;', '57 + 8 : 120;', 'tocar una categoría deja el título detrás de la barra'],
  [M, 'const linea = desk ? 150 : barra!.getBoundingClientRect().bottom + 16;', 'const linea = desk ? 150 : 120;', 'la categoría activa deja de seguir al desplazamiento'],
  [M, 'de + (b.left + b.width / 2) - (t.left + t.width / 2)', 'de + (b.left - t.left)', 'la categoría activa ya no se centra'],
  [P, 'if (e.pointerType === "mouse") { setEncima(true); medir(); }', 'setEncima(true); medir();', 'solo con el RATÓN encima'],
  [M, 'className="hs relative mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1.5" data-pieza="tira-populares"', 'className="hs mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1.5" data-pieza="tira-populares"', 'la tira de Populares es relative'],
  [M, 'className="fixed inset-x-3.5 bottom-[22px] z-30 grid grid-cols-[minmax(0,1fr)] lg:hidden"', 'className="fixed inset-x-3.5 bottom-[22px] z-30 grid lg:hidden"', 'la banda del carrito se sale por la derecha'],
  // La tira de pestañas solo se mueve de lado.
  [P, 'overflowX: "auto", overflowY: "hidden",', 'overflowX: "auto",', 'la tira se mueve también de arriba abajo'],
  [P, 'overscrollBehaviorX: "contain", ', '', 'al llegar al borde la tira arrastra la página'],
  // Las pruebas dejan de mirarlo.
  [E, 'barra del pedido', 'barra del x', 'fic9cab deja de mirar la banda del carrito'],
];
let bien = 0;
for (const [f, a, b, que] of casos) {
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
