// Prueba al revés de las copias por TEXTO de la dirección de una foto (0200, LAUNCH 9u «Quitar una foto no llega a las copias por TEXTO»):
// fotosTextoComun. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([guardián]); se restaura. La prueba de la base es
// pruebas/e2e/fot9utexto.cjs (capa 3, segunda opinión, persona, apelación, «Quitar» del equipo, purga).
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'fotosTextoComun', M = 'packages/db/migrations/0200_fotos_texto.sql', P = 'pruebas/e2e/fot9utexto.cjs';
const casos = [
  // (1) El trigger y sus funciones: una columna menos al retirar o al volver, un camino menos, volver sin mirar si es pública, tocar lo de afuera.
  [G, M, 'update items i set photos = array_remove(i.photos, p_url)', 'update items i set photos = i.photos'],
  [G, M, 'update users x set photo_url = null where x.photo_url = p_url', 'update users x set nick = nick where x.photo_url = p_url'],
  [G, M, 'update business_members m set photo_url = null, updated_at = now() where m.photo_url = p_url', 'update business_members m set updated_at = now() where m.photo_url = p_url'],
  [G, M, 'update businesses b set logo_url = null, updated_at = now() where b.logo_url = p_url', 'update businesses b set updated_at = now() where b.logo_url = p_url'],
  [G, M, "if p_url is null or p_url !~ '^/medios/n/", "if p_url is null or p_url !~ '^/"],
  [G, M, 'update users x set photo_url = p_url where x.id', 'update users x set nick = nick where x.id'],
  [G, M, 'update businesses b set logo_url = p_url, updated_at = now() where b.id = r.fila', 'update businesses b set updated_at = now() where b.id = r.fila'],
  [G, M, "(new.status = 'review' and new.rev_capa = 'c3') or new.removed_reason in ('admin', 'revision')", "new.removed_reason in ('admin', 'revision')"],
  [G, M, "(new.status = 'review' and new.rev_capa = 'c3') or new.removed_reason in ('admin', 'revision')", "(new.status = 'review' and new.rev_capa = 'c3') or new.removed_reason in ('revision')"],
  [G, M, "perform fotos_texto_retirar(old.url, new.id, 'purga', true);", "null;"],
  [G, M, 'and new.purged_at is null and not new.private and not new.rev_sin_c2 then', 'and new.purged_at is null then'],
  [G, M, 'create trigger media_fotos_texto after update of status, purged_at on media for each row', 'create trigger media_fotos_texto after update of url on media for each row'],
  // (2) Una columna NUEVA con direcciones de fotos como texto, sin cubrir.
  [G, M, 'begin;\n\ncreate table if not exists photo_text_refs', 'begin;\nalter table events add column if not exists cover_url text;\n\ncreate table if not exists photo_text_refs'],
  [G, M, 'begin;\n\ncreate table if not exists photo_text_refs', 'begin;\nalter table reviews add column if not exists photos text[];\n\ncreate table if not exists photo_text_refs'],
  // (3) La exenta, leída por la puerta de atrás.
  [G, 'apps/web/lib/admin-catalogo.ts', "              s.merged_into as into_id, d.name->>'es' as into_es,", "              s.merged_into as into_id, d.name->>'es' as into_es, s.photo_url as foto,"],
  // (4) Una manera nueva de dejar de ver una foto que el trigger no conoce.
  [G, 'apps/web/app/admin/acciones-colas.ts', "update media set status = 'removed', removed_reason = 'admin', removed_note = $2", "update media set status = 'removed', removed_reason = 'equipo', removed_note = $2"],
  [G, 'apps/web/app/admin/acciones-confianza.ts', "else await c.query(`update media set status = 'visible' where id::text = $1 and status = 'review'`", "else await c.query(`update media set status = 'review' where id::text = $1 and status = 'visible'`"],
  [G, 'apps/web/lib/fotos-revision.ts', "rev_capa = 'c3', rev_motivo = 'reportes', rev_nota = $3", "rev_capa = 'c2', rev_motivo = 'reportes', rev_nota = $3"],
  // (5) Quien escribe una dirección como texto fuera de los lugares que la toman de media.
  [G, 'apps/web/lib/vecinos.ts', 'import "server-only";\n', 'import "server-only";\nexport const fotoDe = (u: string, f: string) => [`update users set photo_url = $2 where id = $1`, u, f];\n'],
  // (6) La prueba de la base sin sus casos.
  [G, P, "'vuelve a su lugar en cada arreglo (segunda en el plato, primera en el catálogo)'", "'vuelve'"],
  [G, P, "'una foto que vuelve marcada de destino «privado» nunca vuelve a un lugar público'", "'privada'"],
];
let bien = 0, total = 0;
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
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
