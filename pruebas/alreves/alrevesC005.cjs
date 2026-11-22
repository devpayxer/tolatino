// Prueba al revés de C-005 (ficha nueva del negocio). valorDeCliente: el servidor importa un valor de un módulo de cliente (la tabla de
// categorías desde FichaNueva). fichaNuevaSoloPro: la ficha nueva sin «f.pro &&», horas inventadas en el cliente, Booking sin validar el
// día y la hora que llegan de la ficha, o quedándose con una hora que ya no está libre.
// precioAntesReal (C-008): el precio tachado del menú que no es el precio de siempre del plato.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje; se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const P = 'apps/web/app/(app)/n/[id]/page.tsx', F = 'apps/web/app/(app)/n/[id]/FichaNueva.tsx', B = 'apps/web/app/(app)/n/[id]/cita/page.tsx', K = 'apps/web/app/(app)/n/[id]/cita/Booking.tsx';
const casos = [
  ['valorDeCliente', P, 'import { CFG_FICHA } from "@/lib/ficha-nueva";', 'import { CFG_FICHA } from "./FichaNueva";'],
  ['fichaNuevaSoloPro', P, '{f.pro && CFG_FICHA[f.cat] && fichaNueva ? (', '{CFG_FICHA[f.cat] && fichaNueva ? ('],
  // C-007: el interruptor de Configuración se salta (la ficha nueva siempre encendida).
  ['fichaNuevaSoloPro', P, '(await valor("ficha_nueva_pro")) === 1 : false;', 'true : false;'],
  ['fichaNuevaSoloPro', F, 'void horasDeCita(v.cp.negocio.id,', 'void Promise.resolve(v.cp.negocio.id,'],
  ['fichaNuevaSoloPro', B, 'd >= 0 && d <= 13 && Number.isInteger(m) && m >= 0 && m < 1440', 'd >= 0 && Number.isInteger(m)'],
  ['fichaNuevaSoloPro', K, 'find((y) => y.m === inicial.h && y.free)', 'find((y) => y.m === inicial.h)'],
  // C-006: una categoría en la tabla sin sus piezas de siempre (la hoja de Salud).
  ['fichaNuevaSoloPro', F, '<SaHoja v={sa} />', '<span />'],
  // C-006: el Resumen del mercado sin lo suyo (la balanza, cómo se cobra por peso) y la página pintada dos veces (teléfono y computadora a la vez).
  ['fichaNuevaSoloPro', F, 'resumen: (d) => <MeResumen v={me} desk={d} onAll={irCat} />, ', ''],
  ['fichaNuevaSoloPro', F, '{modo === "d" ? (', '{true ? ('],
  ['fichaNuevaSoloPro', F, '[{ id: "cat", label: tc(vende?.tabL ?? L(cfg.tab)), icon: cfg.icon }]', '[{ id: "cat", label: tc(L(cfg.tab)), icon: cfg.icon }]'],
  ['anchoSinSalto', F, 'const modo: "m" | "d" = useAncho() >= 1024 ? "d" : "m";', 'const [modo, setModo] = useState<"m" | "d">("m"); useEffect(() => { const mq = window.matchMedia("(min-width: 1024px)"); setModo(mq.matches ? "d" : "m"); }, []);'],
  ['anchoSinSalto', 'apps/web/next.config.ts', '{ key: "Accept-CH", value: "Sec-CH-Viewport-Width, Viewport-Width" },', ''],
  // C-008: el mercado vuelve a la lista de siempre, y «Lo más pedido» sale de los primeros de la lista en vez de lo pedido de verdad.
  ['fichaNuevaSoloPro', F, 'tab: (d) => <MeMenu v={me} desk={d} />', 'tab: (d) => <MeResumen v={me} desk={d} />'],
  ['fichaNuevaSoloPro', 'apps/web/app/(app)/n/[id]/Mercado.tsx', '{v.pop.map((p) => <MenuTile', '{v.top.map((p) => <MenuTile'],
  // C-008 · precio de antes tachado: siempre (no solo con oferta), un número escrito en la tarjeta, y el «antes» de la oferta que escribe el negocio.
  ['precioAntesReal', 'apps/web/lib/pedir.ts', 'was: i.base > i.cents ? i.base : null,', 'was: i.base,'],
  ['precioAntesReal', 'apps/web/app/(app)/n/[id]/MenuCliente.tsx', 'price={it.price} was={it.was} image={it.image}', 'price={it.price} was={"$15.00"} image={it.image}'],
  ['precioAntesReal', 'apps/web/lib/novedades.ts', 'was = item!.cents;', 'was = Math.round(Number(p.was) * 100);'],
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
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
