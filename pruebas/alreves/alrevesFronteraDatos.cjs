// Prueba al revés de fronteraConTildeEnDatos (23 nov): la clase de compaFronteraConTilde en todo apps/web/lib y apps/web/app, con lo que viene de
// datos. En JavaScript \b no es frontera junto a una letra con tilde o ñ: «Comprobar» de una ciudad (lib/ciudades/launch.ts) no vería «Bogotá.» y
// el filtro de Comunidad dejaba pasar «123 Añasco St». Cada caso mete el defecto (volver al \b, quitar la bandera u, escapar el guion, aceptar una
// lista vacía, un \b nuevo pegado a un dato o a una tilde en otro archivo) y el guardián tiene que fallar con SU mensaje; después se restaura y los
// guardianes quedan limpios.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'fronteraConTildeEnDatos';
const LA = 'apps/web/lib/ciudades/launch.ts', CF = 'apps/web/lib/comunidad-filtro.ts', AC = 'apps/web/lib/autos-comun.ts', ED = 'apps/web/app/panel/Edu.tsx';
let bien = 0, total = 0;
const caso = (ok, que, extra = '') => { total++; if (ok) bien++; console.log(`  ${ok ? '✓' : '✗'} ${que}${extra ? ' → ' + extra : ''}`); };
const BORDES = 'new RegExp(`(?<![\\\\p{L}\\\\p{N}])(?:${alt.join("|")})(?![\\\\p{L}\\\\p{N}])`, "iu")';
const casos = [
  // launch.ts: volver a la expresión de antes (\b pegado al dato) y sin nombraA.
  [LA, '  const re = nombraA(nombres);', '  const re = new RegExp(`\\\\b(${nombres.map((n) => n.replace(/[.*+?^${}()|[\\]\\\\-]/g, "\\\\$&")).join("|")})\\\\b`, "i");', '\\b pegado a una letra con tilde o ñ, o a un dato que puede traerla'],
  [LA, '  const re = nombraA(nombres);', '  const re = new RegExp(`\\\\b(${nombres.join("|")})\\\\b`, "i");', 'pendientesLaunch no usa nombraA'],
  // nombraA con \b: la tabla lo nota (y la pasada estática también).
  [LA, BORDES, 'new RegExp(`\\\\b(?:${alt.join("|")})\\\\b`, "i")', 'nombraA(["Bogotá"]) con «Abrir Bogotá.»'],
  [LA, BORDES, 'new RegExp(`\\\\b(?:${alt.join("|")})\\\\b`, "i")', 'nombraA(["Cata"]) con «Abrir Cataño primero»'],
  // Sin la bandera u: \p{L} es el texto «p{L}».
  [LA, '(?![\\\\p{L}\\\\p{N}])`, "iu")', '(?![\\\\p{L}\\\\p{N}])`, "i")', 'usa \\p{…} sin la bandera u'],
  [LA, '(?![\\\\p{L}\\\\p{N}])`, "iu")', '(?![\\\\p{L}\\\\p{N}])`, "i")', 'nombraA(["Ángeles"]) con «Losángeles»'],
  // El guion escapado: con u es un error y Wilkes-Barre deja de nombrarse.
  [LA, 'n.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")', 'n.replace(/[.*+?^${}()|[\\]\\\\-]/g, "\\\\$&")', 'nombraA(["Wilkes-Barre","Wilkes Barre"]) con «Wilkes-Barre: los mapas»'],
  // Una lista vacía (o con un nombre vacío) casaría con todo.
  [LA, '.map((n) => n.trim()).filter(Boolean)', '.map((n) => n.trim())', 'nombraA([""]) con «Cualquier línea, la que sea»'],
  [LA, 'return alt.length ? new RegExp', 'return alt.length >= 0 ? new RegExp', 'nombraA([]) con «Cualquier línea, la que sea»'],
  // comunidad-filtro.ts: la palabra suelta vuelve a \b dentro de la mirada adelante, o DIRECCION pierde la bandera u.
  [CF, '|of|to)(?![\\\\p{L}\\\\p{N}]))";', '|of|to)\\\\b)";', 'tras una mirada adelante'],
  [CF, '|of|to)(?![\\\\p{L}\\\\p{N}]))";', '|of|to)\\\\b)";', 'revisarTexto(«Vivo en 123 Añasco St»): la deja pasar'],
  [CF, '{1,3}${CALLE}\\\\b`, "iu");', '{1,3}${CALLE}\\\\b`, "i");', 'usa \\p{…} sin la bandera u'],
  [CF, '{1,3}${CALLE}\\\\b`, "iu");', '{1,3}${CALLE}\\\\b`, "i");', 'revisarTexto(«Está en 45 Elías Dr»): la deja pasar'],
  // La clase en otro archivo de lib (un dato) y de app (una tilde en un literal; una clase con tilde tras una mirada adelante).
  [AC, 'export const esExtraFinanciero = ', 'export const porNombre = (n: string) => new RegExp(`\\\\b${n}\\\\b`, "i");\nexport const esExtraFinanciero = ', '\\b pegado a una letra con tilde o ñ, o a un dato que puede traerla'],
  [ED, 'const grupoL = (c: Ctx', 'export const MAL = /\\bcafé\\b/i;\nconst grupoL = (c: Ctx', '\\b pegado a una letra con tilde o ñ, o a un dato que puede traerla (antes)'],
  [ED, 'const grupoL = (c: Ctx', 'export const MAL = /(?!(?:de|la)\\b)[a-zñ]+/i;\nconst grupoL = (c: Ctx', 'tras una mirada adelante'],
];
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${G}]`)); }
};
for (const [f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let lineas; try { lineas = correr(); } finally { fs.writeFileSync(ruta, orig); }
  const l = lineas.find((x) => x.includes(msg));
  caso(!!l, `${G} al revés (${path.basename(f)}: «${msg}»)`, l ? l.trim().slice(0, 200) : lineas.length ? 'otro mensaje: ' + lineas[0].trim().slice(0, 160) : 'el guardián no falló');
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R, { mostrar: true })) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
