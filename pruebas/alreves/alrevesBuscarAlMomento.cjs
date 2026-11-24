// 24 nov · Prueba al revés del guardián buscarEscribeAlMomento (ajuste del fundador: al tocar «Buscar» se escribe al momento y sin el
// rectángulo del anillo de foco dentro de la caja): se inyecta el defecto, el guardián debe fallar con SU mensaje ([buscarEscribeAlMomento]);
// se restaura. Cada caso lleva, al final, lo que se rompe.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'buscarEscribeAlMomento';
const T = 'apps/web/app/(app)/buscar/teclado.tsx', BU = 'apps/web/app/(app)/buscar/Buscar.tsx', AS = 'apps/web/app/(app)/AppShell.tsx';
const CA = 'apps/web/app/(app)/c/[slug]/Categoria.tsx', DE = 'apps/web/app/(app)/buscar/Desplegable.tsx', GL = 'apps/web/app/globals.css';
const NUEVO = 'apps/web/app/(app)/comunidad/CajaPrueba.tsx';
const casos = [
  // El puente.
  [T, '  document.body.appendChild(el);\n  el.focus({ preventScroll: true });', '  document.body.appendChild(el);\n  setTimeout(() => el.focus({ preventScroll: true }), 0);', 'el puente se enfoca fuera del toque (iOS no abre el teclado)'],
  [T, 'font-size:16px;', 'font-size:14px;', 'el puente mide 14 px (iOS acerca la página)'],
  [T, 'opacity:0;', 'opacity:1;', 'el puente se ve'],
  [T, 'el.addEventListener("blur", () => el.remove(), { once: true });', '', 'el puente se queda en la página al perder el foco'],
  [T, 'if (escrito) requestAnimationFrame(() => poner((actual) => (escrito + actual).slice(0, 120)));', 'if (escrito) poner(() => escrito.slice(0, 120));', 'lo escrito pasa en el mismo instante y la búsqueda de la dirección lo borra'],
  // Los toques que llevan a Buscar.
  [AS, 'abrirTeclado(bp?.ph ?? t.searchIn); router.push(bp?.href ?? "/buscar");', 'router.push(bp?.href ?? "/buscar");', 'la barra de arriba navega sin abrir el teclado'],
  [CA, 'const buscar = () => { abrirTeclado(v.buscarEn); router.push(buscarHref); };', 'const buscar = () => { router.push(buscarHref); };', 'el buscador de la categoría navega sin abrir el teclado'],
  [CA, 'const buscar = () => { abrirTeclado(v.buscarEn); router.push(buscarHref); };', 'const buscar = () => { router.push(buscarHref); abrirTeclado(v.buscarEn); };', 'el teclado se abre después de navegar'],
  // La caja que lo recibe.
  [BU, '    const { tomar, evento } = usarTeclado(inRef, setQ);', '    const { tomar, evento } = { tomar: () => {}, evento: "x" };', 'la caja de Buscar no toma el foco del puente'],
  [BU, '    window.addEventListener(evento, tomar);', '', 'con Buscar ya abierta (escritorio), tocar «Buscar» no le da el foco'],
  // El anillo de foco.
  [GL, ':focus-visible:not([data-foco="caja"]) {', ':focus-visible:not([data-foco]) {', 'la excepción del anillo se agranda a cualquier data-foco'],
  [GL, ':focus-visible:not([data-foco="caja"]) {', ':focus-visible {', 'el anillo vuelve a dibujarse dentro de la caja'],
  [GL, 'outline-offset: 2px !important;\n}', 'outline-offset: 2px !important;\n}\n:is(button):focus-visible:not(.sin-anillo) { outline: none; }', 'aparece una segunda excepción del anillo'],
  [BU, '${foco ? "border-ink bg-white" : "border-transparent bg-paper"}', '${foco ? "border-transparent bg-white" : "border-transparent bg-paper"}', 'la caja de Buscar ya no muestra el foco'],
  [DE, 'shadow-[0_0_0_4px_rgba(75,55,245,.12)]', 'shadow-none', 'la caja del desplegable pierde su halo de foco'],
  [NUEVO, null, 'export const CajaPrueba = () => <input data-foco="caja" aria-label="x" />;\n', 'otra pantalla le quita el anillo a un campo con data-foco="caja"'],
];
let bien = 0;
for (const [f, a, b, que] of casos) {
  const ruta = `${R}/${f}`;
  const nuevo = a === null;
  if (!nuevo && !fs.existsSync(ruta)) { console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = nuevo ? null : fs.readFileSync(ruta, 'utf8');
  if (!nuevo && !orig.includes(a)) { console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 60)}`); continue; }
  fs.writeFileSync(ruta, nuevo ? b : orig.replace(a, () => b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); } catch (e) { out = String(e.stderr).split('\n').find((l) => l.includes(`[${G}]`)) || ''; falla = !!out; }
  finally { if (nuevo) fs.rmSync(ruta, { force: true }); else fs.writeFileSync(ruta, orig); }
  console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${f.split('/').pop()}: ${que})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
const limpio = require('../lib/alreves-fin.cjs')(R);
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
