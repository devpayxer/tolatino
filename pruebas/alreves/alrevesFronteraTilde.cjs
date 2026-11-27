// Prueba al revés de compaFronteraConTilde (23 nov): en JavaScript \b no es frontera junto a una letra con tilde o ñ, y el verificador de salida
// de El Compa dejaba pasar «Ya cancelé tu solicitud». Cada caso mete el defecto (quitar la bandera u, volver al \b, borrar una forma, quitar
// lo que protege a una frase legítima, dejar sin tabla, un \b nuevo en otro archivo de lib/compa, idiomaDe con «qué\b») y el guardián tiene
// que fallar con SU mensaje; después se restaura y los guardianes quedan limpios.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'compaFronteraConTilde';
const V = 'apps/web/lib/compa/verificar.ts', C = 'apps/web/lib/compa/conversacion.ts', RG = 'apps/web/lib/compa/reglas.ts';
let bien = 0, total = 0;
const caso = (ok, que, extra = '') => { total++; if (ok) bien++; console.log(`  ${ok ? '✓' : '✗'} ${que}${extra ? ' → ' + extra : ''}`); };
const casos = [
  // La bandera u: sin ella \p{L} es el texto «p{L}».
  [V, '].join("|")})`, "iu");', '].join("|")})`, "i");', 'sin la bandera u'],
  // Volver al \b: la frontera deja de ver la tilde (la lee resolviendo las constantes) y la tabla lo nota.
  [V, 'const LI = "(?<![\\\\p{L}\\\\p{N}])", LD = "(?![\\\\p{L}\\\\p{N}])";', 'const LI = "\\\\b", LD = "\\\\b";', '\\b pegado a una letra con tilde'],
  [V, 'const LI = "(?<![\\\\p{L}\\\\p{N}])", LD = "(?![\\\\p{L}\\\\p{N}])";', 'const LI = "\\\\b", LD = "\\\\b";', 'deja pasar «Ya cancelé tu solicitud.»'],
  // Borrar una forma.
  [V, 'const YO_CON_TILDE = "cancelé|anulé|', 'const YO_CON_TILDE = "anulé|', 'deja pasar «Ya cancelé tu solicitud.»'],
  [V, '  `${LI}acabo\\\\s+de\\\\s+${INFINITIVO}${LD}`,', '', 'deja pasar «Acabo de cancelar tu solicitud.»'],
  [V, '  `\\\\b(?:is|are|has been|have been)\\\\s+now\\\\s+(?:${cancelado}refunded|changed|updated|deleted|processed)\\\\b`,', '', 'deja pasar «Your request is now cancelled.»'],
  // Quitar lo que protege a una frase legítima: la negación y la condición.
  [V, '  `${NEGADO}${LI}(?:${YO_CON_TILDE})${LD}', '  `${LI}(?:${YO_CON_TILDE})${LD}', 'rechaza de más «No cancelé nada: solo preparé la cancelación.»'],
  [V, 'const hechoRe = (quedo: string, cancelado: string) => new RegExp(`${FUERA}(?:${[', 'const hechoRe = (quedo: string, cancelado: string) => new RegExp(`(?:${[', 'rechaza de más «¿Me devuelven todo lo que pagué?'],
  [V, '(?!\\\\s+(?:de|mi|mis)${LD})`,', '`,', 'rechaza de más «Cambié de teléfono.'],
  [V, '  `${CONDICION}${LI}ya\\\\s+(?:qued[oó]|queda)\\\\s+(?:${quedo})${LD}`,', '  `${LI}ya\\\\s+(?:qued[oó]|queda)\\\\s+(?:${quedo})${LD}`,', 'rechaza de más «Cuando confirmes, ya queda cancelada.»'],
  // El verificador deja de mirar la respuesta; o la tabla desaparece.
  [V, '  if (HECHO.test(r.respuesta) && diceQueHizo(r.respuesta, c.canceladasNum, c.activasNum)) return { ok: false, motivo: "dice_que_hizo" };\n', '', 'deja pasar «Ya cancelé tu solicitud.»'],
  [V, 'export const CASOS_HECHO = {', 'export const CASOS_HECHO_X = {', 'falta la tabla CASOS_HECHO'],
  // Un \b nuevo junto a una tilde en otro archivo de lib/compa (literal y clase).
  [RG, 'type Bi7 = { es: string; en: string };', 'type Bi7 = { es: string; en: string };\nexport const MAL = /\\bcancelé\\b/i;', '\\b pegado a una letra con tilde'],
  [RG, 'type Bi7 = { es: string; en: string };', 'type Bi7 = { es: string; en: string };\nexport const MAL = /\\b(?:ya\\s+)?cambi[eé]\\b/i;', '\\b pegado a una letra con tilde'],
  // idiomaDe vuelve a «qué\b».
  [C, 'cuánto|cuanto)(?![\\p{L}\\p{N}])/giu;', 'cuánto|cuanto)\\b/giu;', '\\b pegado a una letra con tilde'],
  [C, 'cuánto|cuanto)(?![\\p{L}\\p{N}])/giu;', 'cuánto|cuanto)\\b/giu;', 'idiomaDe no cuenta «qué»'],
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
