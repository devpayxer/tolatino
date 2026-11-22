// Prueba al revés de 9u-2 · la nota interna no sale del equipo. Cada caso deshace un arreglo a propósito y tiene que cazarlo:
//   - el guardián notaInternaFueraDelArchivo (con SU mensaje): la exportación sin notaSale, sin las banderas por fila o sin la tabla del catálogo; una nota sin
//     clasificar que sale; una regla ES_NOTA más corta; una interna marcada «sale»; una condición que no es de la lista; la nota del sello o el motivo
//     del reclamo otra vez en los datos de la página; la nota de la revisión de fotos otra vez en Moderación; la prueba sin su recorrido de la base.
//   - el guardián guardianNombreUnico: un guardián con el nombre de otro (el segundo reemplaza al primero sin avisar).
//   - la prueba nota9u2 contra la base (NOTA9U2_SOLO_BASE=1: no necesita el servidor): una nota de una tabla exportada sin clasificar, y una
//     clasificada que no existe en la base.
// Se restaura cada archivo; al final, los guardianes y nota9u2 (solo la base) vuelven a pasar.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync, spawnSync } = require('child_process');
const R = ENT.RAIZ, G = 'notaInternaFueraDelArchivo';
const X = 'apps/web/lib/datos/exportar.ts', MP = 'apps/web/lib/datos/mapa.ts', MJ = 'packages/db/mapa-de-datos.json', E = 'pruebas/e2e/nota9u2.cjs';
const casos = [
  [X, 'if (s === false) continue;', 'if (s === false && false) continue;', 'limpiar: cada columna pasa por notaSale'],
  [X, 'if (typeof s === "string" && f[`__sale__${k}`] !== true) { o[k] = null; continue; }', '', 'limpiar: cada columna pasa por notaSale'],
  [X, 'sql: `select *${banderasDeNotas(f.tabla)} from ${ident(f.tabla)}', 'sql: `select * from ${ident(f.tabla)}', 'el archivo de la persona: cada tabla con sus notas clasificadas'],
  [X, 'from items i where i.business_id = $1 order by i.id`, "items", ["hidden_by"]),', 'from items i where i.business_id = $1 order by i.id`),', 'el archivo del negocio: un «select *» sin sus notas clasificadas'],
  // 22 nov · Quién del equipo ocultó un plato (hidden_by) otra vez en el catálogo del archivo del negocio.
  [X, 'order by i.id`, "items", ["hidden_by"]),', 'order by i.id`, "items"),', 'el catálogo del archivo del negocio no lleva quién del equipo'],
  // 22 nov · (2) El motivo de To’Latino sobre la página viaja aunque el Panel no lo pinte.
  ['apps/web/lib/panel.ts', "case when b.status in ('hidden', 'suspended', 'closed') then b.status_reason end as status_reason,", 'b.status_reason,', 'el motivo de To’Latino (status_reason, temp_closed_reason) viaja solo mientras'],
  ['apps/web/lib/panel.ts', 'case when b.temp_closed_until > now() then b.temp_closed_reason end as temp_reason', 'b.temp_closed_reason as temp_reason', 'el motivo de To’Latino (status_reason, temp_closed_reason) viaja solo mientras'],
  ['apps/web/app/panel/[id]/[[...r]]/page.tsx', 'if (!(ruta.sec === "hoy" || (ruta.sec === "pag" && !ruta.sub))) d.adm = { ...d.adm, reason: null, tempReason: null };', '', 'el Panel manda el motivo de To’Latino solo a la pantalla que lo pinta'],
  ['apps/web/app/panel/[id]/[[...r]]/page.tsx', 'if (!(ruta.sec === "pag" && ruta.sub === "fotos")) d.adm = { ...d.adm, fotos: [] };', '', 'el Panel manda el motivo de To’Latino solo a la pantalla que lo pinta'],
  // 22 nov · (3) Cada dato viaja a otra sección además de la que lo pinta (o la prueba deja de mirarlo).
  ['apps/web/app/panel/[id]/[[...r]]/page.tsx', 'if (!(ruta.sec === "mod" && ruta.sub === "servicios")) d.pausas = { ...d.pausas, cot: null };', '', 'la pausa de Cotizaciones, la de Staff'],
  ['apps/web/app/panel/[id]/[[...r]]/page.tsx', 'if (!(ruta.sec === "pag" && ruta.sub === "equipo")) d.pausas = { ...d.pausas, staff: null };', '', 'la pausa de Cotizaciones, la de Staff'],
  ['apps/web/app/panel/[id]/[[...r]]/page.tsx', 'd.equipo = d.equipo.map((m) => ({ ...m, hidden: null }));', 'd.equipo = d.equipo;', 'la pausa de Cotizaciones, la de Staff'],
  ['apps/web/app/panel/[id]/[[...r]]/page.tsx', 'if (!(ruta.sec === "pag" && ruta.sub === "ver")) d.ver = { ...d.ver, selloNote: null };', '', 'la pausa de Cotizaciones, la de Staff'],
  [E, "3c · pausas.cot, pausas.staff, equipo[].hidden y ver.selloNote", "3c · otras cosas", 'nota9u2 mira que pausas.cot'],
  [E, "«internas» · ${k} no sale", "internas · ${k} no sale", 'las «internas» no salgan del archivo'],
  // 22 nov · (4) La prueba vuelve a escribir todas las notas directo en la base, o deja de mirar el catálogo y las pantallas que no pintan.
  [E, "'por la hoja del equipo (interna)", "'directo en la base (interna)", 'nota9u2: una nota por familia'],
  [E, "cat.every((x) => !('hidden_by' in x))", 'cat.every(() => true)', 'nota9u2 mira el catálogo sin hidden_by'],
  // 22 nov · (2) «internas»: tickets.door_name y media.rev_llave salen otra vez (limpiar no las quita, el mapa pierde una, o mapa.ts no lee la lista).
  [X, '    if (tabla && columnaInterna(tabla, k)) continue;', '    if (false) continue;', 'limpiar: una columna de «internas» no sale'],
  [MJ, '"tickets.door_name": {', '"tickets.door_nombre": {', 'no trae tickets.door_name'],
  [MJ, '"media.rev_llave": {', '"media.rev_llave_x": {', 'no trae media.rev_llave'],
  [MP, 'export const columnaInterna = (tabla: string, col: string): boolean => `${tabla}.${col}` in INTERNAS;', 'export const columnaInterna = (tabla: string, col: string): boolean => false;', 'columnaInterna la consulta'],
  [X, 'r.rows.map((x) => limpiar(x, q.fuera, q.tabla))', 'r.rows.map((x) => limpiar(x, q.fuera))', 'el ZIP y la vista previa limpian con la tabla'],
  [MP, '  if (!n) return false;', '  if (!n) return true;', 'notaSale: una nota sin clasificar'],
  [MP, 'export const ES_NOTA = /(^|_)(reason|note|notes|motivo|nota|notas)$/;', 'export const ES_NOTA = /(^|_)(reason|note|notes|nota|notas)$/;', 'ES_NOTA deja fuera «motivo»'],
  [MP, 'export const CONDICION_NOTA = /^[a-z_]+ (= \'[a-z_]+\'|in \\(\'[a-z_]+\'(, \'[a-z_]+\')*\\))$/;', 'export const CONDICION_NOTA = /^[a-z_]+ = .+$/;', 'CONDICION_NOTA: solo'],
  [MJ, '"support_messages.hidden_reason": {"sale": false', '"support_messages.hidden_reason": {"sale": true', 'support_messages.hidden_reason es interna'],
  [MJ, '"recommendations.decision_reason": {"sale": false', '"recommendations.decision_reason": {"sale": true', 'recommendations.decision_reason es interna'],
  [MJ, '"claims.reason": {"sale": "status = \'rejected\'"', '"claims.reason": {"sale": true', 'claims.reason sale solo si el reclamo fue rechazado'],
  [MJ, '"media.removed_note": {"sale": "removed_reason = \'admin\'"', '"media.removed_note": {"sale": "removed_reason = \'admin\' or true"', 'notas: media.removed_note sale ='],
  ['apps/web/lib/panel.ts', '(select case when v.status in (\'info\', \'no\') then v.note end from verification_requests v', '(select v.note from verification_requests v', 'la nota del sello viaja solo cuando el Panel la pinta'],
  ['apps/web/lib/reclamos.ts', 'case when status = \'rejected\' then reason end as reason', 'reason', 'el motivo del reclamo viaja solo si fue rechazado'],
  ['apps/web/lib/apelaciones.ts', "select 'media', m.id::text, null::text, m.rev_at,", "select 'media', m.id::text, m.rev_nota, m.rev_at,", 'Moderación no recibe la nota interna de la revisión de fotos'],
  ['apps/web/lib/apelaciones.ts', 'decision_reason as decision, decided_at as decidida\n         from appeals', 'decision_reason as decision, decided_at as decidida, hidden_reason as motivo\n         from appeals', 'Moderación no recibe la nota interna de la revisión de fotos'],
  [E, "sinClasificar.length === 0, `ninguna nota sin clasificar", "true, `ninguna nota", 'la prueba recorre information_schema.columns'],
  // guardianNombreUnico: un guardián con el nombre de otro lo reemplaza en silencio (lo que pasó aquí con el de Soporte, 7b).
  ['guardianes/run.mjs', '  notaInternaFueraDelArchivo() {', '  notaInternaNoSale() {', 'el guardián «notaInternaNoSale» ya existe', 'guardianNombreUnico'],
];
// Los que caza la prueba contra la base (sin el servidor).
const casosBase = [
  // 22 nov · (2) Una columna de «internas» que ya no existe en la base (renombrada) o una tabla que no sale en el archivo.
  [MJ, '"media.rev_llave": {', '"media.rev_llavero": {', 'cada columna de «internas» existe en la base'],
  [MJ, '    "user_badges.reason": {"sale": false, "ve": "el porqué del equipo al subir un rango; nadie lo pinta"}', '    "user_badges.reasons": {"sale": false, "ve": "el porqué del equipo al subir un rango; nadie lo pinta"}', 'ninguna nota sin clasificar en «notas» del mapa de datos: user_badges.reason'],
  [MJ, '    "user_badges.reason": {"sale": false, "ve": "el porqué del equipo al subir un rango; nadie lo pinta"}', '    "user_badges.reason": {"sale": false, "ve": "el porqué del equipo al subir un rango; nadie lo pinta"},\n    "user_badges.motivo": {"sale": false, "ve": "una columna que la base no tiene"}', 'toda nota clasificada existe en la base: user_badges.motivo'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const guardian = (g = G) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${g}]`)); }
};
const base = () => { const r = spawnSync('node', [E], { cwd: R, encoding: 'utf8', env: { ...process.env, NOTA9U2_SOLO_BASE: '1' } }); return { st: r.status, txt: `${r.stdout || ''}\n${r.stderr || ''}` }; };
const cambiar = (f, a, b, fn) => {
  const ruta = path.join(R, f), orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) return null;
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { return fn(); } finally { fs.writeFileSync(ruta, orig); }
};
for (const [f, a, b, msg, g = G] of casos) {
  total++;
  const L = cambiar(f, a, b, () => guardian(g));
  if (L === null) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  const l = soloTextos ? L[0] : L.find((x) => x.includes(msg));
  console.log(`  ${l ? '✓' : '✗'} ${g} al revés (${path.basename(f)}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : L.length ? ' → otro mensaje: ' + L[0].trim().slice(0, 160) : ' → el guardián no falló'}`);
  if (l) bien++;
}
for (const [f, a, b, msg] of casosBase) {
  total++;
  const r = cambiar(f, a, b, base);
  if (r === null) { console.log(`  ✗ nota9u2: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  const cazo = r.st !== 0 && (soloTextos || r.txt.includes(`ASSERT ${msg}`));
  console.log(`  ${cazo ? '✓' : '✗'} nota9u2 al revés (${path.basename(f)}: «${msg}»)${cazo ? '' : r.st === 0 ? ' → nota9u2 no falló' : ' → falló con otra cosa: ' + (r.txt.match(/✗ .*/) || [r.txt.slice(-200)])[0].slice(0, 200)}`);
  if (cazo) bien++;
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
const fin = base();
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'} · nota9u2 (la base) limpia después: ${fin.st === 0 ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio && fin.st === 0 ? 0 : 1);
