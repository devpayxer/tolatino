// Prueba al revés de los guardianes de 9f (el CMS de Textos y páginas: cada texto de la interfaz con su llave, las líneas fijas con candado, el largo y las marcas,
// versiones de solo inserción, anuncios que se retiran y no se borran, «Cuenta borrada» en los dos idiomas y el pie de la web detrás de su interruptor). Se inyecta
// el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0136_cms.sql', AD = 'apps/web/lib/cms-admin.ts', EX = 'scripts/cms/extraer.mjs', FIJ = 'apps/web/lib/textos-fijas.ts', HOME = 'apps/web/lib/textos-home.ts',
  PG = 'apps/web/app/(app)/page.tsx', INI = 'apps/web/app/(app)/Inicio.tsx', PED = 'apps/web/app/panel/Pedidos.tsx', CUE = 'apps/web/lib/textos-cuenta.ts', PIE = 'apps/web/app/(app)/_legal/PieWeb.tsx',
  MAPA = 'packages/db/mapa-de-datos.json', LAY = 'apps/web/app/(app)/layout.tsx';
const casos = [
  // cadenaConLlave: el catálogo desactualizado, un texto a mano en el Inicio, el Inicio que no lee el CMS, el servidor que lee T directo, una llave que no existe
  ['cadenaConLlave', HOME, 'hoy: "Hoy en el barrio"', 'hoy: "Hoy en tu barrio"'],
  ['cadenaConLlave', INI, 'h.comunidad', 'E2("Comunidad", "Community")'],
  ['cadenaConLlave', PG, 'anunciosVivos(loc.c.id, !!u?.first_name, lang)', 'Promise.resolve([])'],
  ['cadenaConLlave', LAY, 'import { textosT } from "@/lib/cms";', 'import { T } from "@/lib/textos";\nimport { textosT } from "@/lib/cms";'],
  ['cadenaConLlave', INI, 'h.irComunidad', 'cadena("APP-HOME.noExiste", "es")'],
  // lineaFijaBloqueada: la base deja editar una línea fija, la app la edita, una línea de §1c cambia, la del 911 pierde su candado
  ['lineaFijaBloqueada', M, 'if old.locked and not indexando and (new.text is distinct from old.text', 'if false and old.locked and not indexando and (new.text is distinct from old.text'],
  ['lineaFijaBloqueada', AD, 'if (v.locked) return mal(', 'if (false) return mal('],
  ['lineaFijaBloqueada', FIJ, 'Estamos haciendo un cambio. Volvemos en unos minutos.', 'Estamos haciendo un cambio. Volvemos pronto.'],
  ['lineaFijaBloqueada', EX, 'todas.push(...pares(F, "apps/web/lib/textos-fijas.ts", (r) => ["FIJAS-1C", r], errores, true));', 'todas.push(...pares(F, "apps/web/lib/textos-fijas.ts", (r) => ["FIJAS-1C", r], errores, false));'],
  ['lineaFijaBloqueada', M, "if (new.locked then new.status := 'vivo'; end if;".replace('(', ''), "if new.locked then null; end if;"],
  // cmsConLimite: sin largo máximo en la base, sin revisar las marcas, sin autor, la app no revisa el largo
  ['cmsConLimite', M, "if char_length(new.text->>'es') > new.max_len or char_length(new.text->>'en') > new.max_len then raise exception 'cms_largo", "if false then raise exception 'cms_largo"],
  ['cmsConLimite', M, "raise exception 'cms_sin_autor", "raise exception 'cms_otro"],
  ['cmsConLimite', AD, 'if (E.length > v.max_len || N.length > v.max_len)', 'if (false)'],
  ['cmsConLimite', AD, 'if (marcas(E) !== marcas(v.code_text.es)', 'if (false && marcas(E) !== marcas(v.code_text.es)'],
  // cmsSoloInsercion: las versiones se pueden cambiar, un anuncio se puede borrar, la auditoría de la acción falta
  ['cmsSoloInsercion', M, 'create trigger cms_string_versions_no_cambia before update or delete on cms_string_versions', 'create trigger cms_string_versions_no_cambia before update on cms_string_versions'],
  ['cmsSoloInsercion', M, "raise exception 'announcements no se borra: se retira';", "null;"],
  ['cmsSoloInsercion', AD, '"cms.anuncio.retirar"', '"cms.otra"'],
  // cuentaBorradaBilingue: en inglés sigue en español, el panel muestra el nombre guardado, la purga escribe otra cosa
  ['cuentaBorradaBilingue', CUE, 'borrada: "Deleted account"', 'borrada: "Cuenta borrada"'],
  ['cuentaBorradaBilingue', PED, 'v: nombreVisible(x.who, es) }', 'v: x.who }'],
  ['cuentaBorradaBilingue', MAPA, `"first_name": "'Cuenta borrada'"`, `"first_name": "'Usuario borrado'"`],
  // pieSinCapturas: el pie nace encendido, PieWeb no mira el interruptor, el Inicio no lleva el pie
  ['pieSinCapturas', M, "values ('web.pie_todas', false,", "values ('web.pie_todas', true,"],
  ['pieSinCapturas', PIE, 'if (!(await pieEnTodas())) return null;', ''],
  ['pieSinCapturas', PG, '    <PieWeb />\n', ''],
  // idioma: una cadena con un solo idioma
  ['idioma', HOME, 'anuncioK: "ANNOUNCEMENT"', 'anuncioK: ""'],
];
const crear = [
  // cadenaConLlave: otro archivo que lee T directo; una pantalla del servidor
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f.tsx', 'import { T } from "@/lib/textos";\nexport const x = T.es.search;\n'],
  // lineaFijaBloqueada: código que pone tl.cms_indexar fuera del despliegue
  ['lineaFijaBloqueada', 'apps/web/lib/zz9f.ts', 'import "server-only";\nexport const q = `select set_config(\'tl.cms_indexar\', \'on\', true)`;\n'],
  // cmsSoloInsercion: otro archivo que escribe versiones o borra anuncios
  ['cmsSoloInsercion', 'apps/web/lib/zz9f.ts', 'import "server-only";\nexport const q = `delete from announcements where id = 1`;\n'],
  ['cmsSoloInsercion', 'apps/web/lib/zz9f.ts', 'import "server-only";\nexport const q = `insert into cms_string_versions (string_id) values (\'x\')`;\n'],
  // pieSinCapturas: otro archivo que enciende el pie
  ['pieSinCapturas', 'apps/web/lib/zz9f.ts', 'import "server-only";\nexport const q = `update feature_flags set enabled = true where key = \'web.pie_todas\'`;\n'],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
// El catálogo que no es el del código: se cambia el archivo generado y el guardián debe notarlo (y volver a generarlo lo deja limpio).
{
  const ruta = path.join(R, 'apps/web/lib/cms-cadenas.json'), orig = fs.readFileSync(ruta, 'utf8');
  fs.writeFileSync(ruta, orig.replace('"Hoy en el barrio"', '"Hoy por el barrio"'));
  let r; try { r = correr('cadenaConLlave'); } finally { fs.writeFileSync(ruta, orig); }
  informe('cadenaConLlave', 'cms-cadenas.json a mano', r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
if (bien !== total || !limpio) process.exit(1);
