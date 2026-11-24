// Prueba al revés del guardián mosaicosCategoriaDelEquipo (24 nov): cada mosaico de subcategoría de /c/<categoría> lo cambia el Super Admin (Catálogo › la
// categoría › «Mosaicos de la página») con las mismas garantías que la portada: mismo origen, motivo, clave válida, categoría bloqueada, auditoría en la
// misma transacción; la foto es un id que se adjunta todo o nada y pasa a ser DE ESE MOSAICO; page_admin solo cambia la clave de ese mosaico y la base lo
// impone (0217); la página mezcla en la misma consulta (sin una consulta por mosaico) y solo con la foto todavía visible. Un caso por regla: se inyecta el
// defecto, el guardián debe fallar con SU renglón ([mosaicosCategoriaDelEquipo]); se restaura. Punta a punta: cat9n3 §8-§10.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'mosaicosCategoriaDelEquipo';
const CT = 'apps/web/app/admin/acciones-catalogo.ts', UI = 'apps/web/app/admin/Catalogo.tsx', MG = 'packages/db/migrations/0217_mosaicos_de_categoria.sql';
const CA = 'apps/web/lib/categoria.ts', AC = 'apps/web/lib/admin-catalogo.ts', AY = 'docs/ayuda/admin-catalogo.md';
const casos = [
  // 1 · Cada acción: mismo origen, motivo, clave, categoría bloqueada, auditoría completa, dentro de hacer.
  [CT, '  if (!(await mismoOrigen())) return no("No permitido.");\n  try {\n    return await hacer(async (c, s) => {\n      const k = (await c.query<{ es: string; page: Pagina; ya: string | null }>', '  try {\n    return await hacer(async (c, s) => {\n      const k = (await c.query<{ es: string; page: Pagina; ya: string | null }>'],
  [CT, '  if (!(await mismoOrigen())) return no("No permitido.");\n  return hacer(async (c, s) => {\n    const k = (await c.query<{ es: string; page: Pagina | null; ya: string | null }>', '  return hacer(async (c, s) => {\n    const k = (await c.query<{ es: string; page: Pagina | null; ya: string | null }>'],
  [CT, '  if (!m) return no("Escribe el motivo.");\n  if (!(await mismoOrigen())) return no("No permitido.");\n  return hacer(async (c, s) => {\n    const k = (await c.query<{ es: string; page: Pagina | null;', '  if (!(await mismoOrigen())) return no("No permitido.");\n  return hacer(async (c, s) => {\n    const k = (await c.query<{ es: string; page: Pagina | null;'],
  [CT, 'export async function catMosaico(cat: string, clave: string, mediaId: string, motivo: string): Promise<ResAdm> {\n  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");\n  if (!claveMosaico(clave)) return no("Ese mosaico no existe.");', 'export async function catMosaico(cat: string, clave: string, mediaId: string, motivo: string): Promise<ResAdm> {\n  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");'],
  [CT, "page_admin->'tiles'->>$2 as ya from categories where id = $1 and page ? 'title' for update`, [cat, clave]", "page_admin->'tiles'->>$2 as ya from categories where id = $1 and page ? 'title'`, [cat, clave]"],
  [CT, "page_admin->'tiles'->>$2 as ya from categories where id = $1 for update`, [cat, clave]", "page_admin->'tiles'->>$2 as ya from categories where id = $1`, [cat, clave]"],
  [CT, 'after: { foto: `foto del equipo · ${f.url}` }, reason: m });', 'after: { foto: `foto del equipo · ${f.url}` } });'],
  [CT, 'action: "catalogo.cat.mosaico_original"', 'action: "catalogo.cat.mosaico_quitar"'],
  [CT, "      await c.query(`update categories set page_admin = jsonb_set(coalesce(page_admin, '{}'::jsonb), '{tiles}', coalesce(page_admin->'tiles', '{}'::jsonb) || jsonb_build_object($2::text, $3::text)), updated_at = now() where id = $1`, [cat, clave, f.url]);\n      await auditar(c, {", "      await auditar(c, {"],
  // 2 · La foto de ESE mosaico: id (nunca dirección), adjunta todo o nada, la clave es un mosaico de la página, solo su clave en page_admin.
  [CT, 'export async function catMosaico(cat: string, clave: string, mediaId: string, motivo: string): Promise<ResAdm> {', 'export async function catMosaico(cat: string, clave: string, url: string, motivo: string, mediaId = ""): Promise<ResAdm> {'],
  [CT, '      const t = mosaicosConFoto(k.page).find((x) => x.key === clave);\n      if (!t) return "Ese mosaico no existe.";', '      const t = mosaicosConFoto(k.page).find((x) => x.key === clave) ?? { label: { es: clave, en: clave }, photo: null };'],
  [CT, "owner_id = $1, sort = 0 where id = $2::uuid and owner_kind = 'user' and uploaded_by = $3 and owner_id = $3::text\n            and status = 'visible' and not rev_sin_c2 and not private and purged_at is null and url like '/medios/n/%' returning url`, [`${cat}/${clave}`", "owner_id = $1, sort = 0 where id = $2::uuid and owner_kind = 'user' and uploaded_by = $3 and owner_id = $3::text\n            and status = 'visible' and not rev_sin_c2 and not private and purged_at is null and url like '/medios/n/%' returning url`, [cat"],
  [CT, "and not rev_sin_c2 and not private and purged_at is null and url like '/medios/n/%' returning url`, [`${cat}/${clave}`, mediaId, s.id])).rows[0];", "and purged_at is null returning url`, [`${cat}/${clave}`, mediaId, s.id])).rows[0];"],
  [CT, '      if (!f) throw new FotoNoAdjunta();\n      await c.query(`update media set status = \'removed\', removed_reason = \'replaced\', removed_by = $3, removed_at = now() where owner_kind = \'category\' and owner_id = $1 and status in (\'visible\', \'review\') and id <> $2::uuid`, [`${cat}/${clave}`', '      if (!f) return "Esa foto no existe.";\n      await c.query(`update media set status = \'removed\', removed_reason = \'replaced\', removed_by = $3, removed_at = now() where owner_kind = \'category\' and owner_id = $1 and status in (\'visible\', \'review\') and id <> $2::uuid`, [`${cat}/${clave}`'],
  [CT, "jsonb_build_object($2::text, $3::text)), updated_at = now() where id = $1`, [cat, clave, f.url]);", "jsonb_build_object($2::text, $3::text)), updated_at = now() where id = $1`, [cat, clave, mediaId]);"],
  [CT, "status in ('visible', 'review') and id <> $2::uuid`, [`${cat}/${clave}`, mediaId, s.id]);", "status in ('visible', 'review') and id <> $2::uuid`, [cat, mediaId, s.id]);"],
  // La foto que deja el mosaico en revisión por reportes («review») también queda «removed/replaced».
  [CT, "status in ('visible', 'review') and id <> $2::uuid`, [`${cat}/${clave}`, mediaId, s.id]);", "status = 'visible' and id <> $2::uuid`, [`${cat}/${clave}`, mediaId, s.id]);"],
  [CT, "owner_kind = 'category' and owner_id = $1 and status in ('visible', 'review')`, [`${cat}/${clave}`, s.id]);", "owner_kind = 'category' and owner_id = $1 and status = 'visible'`, [`${cat}/${clave}`, s.id]);"],
  [CT, "removed_reason = 'replaced', removed_by = $2, removed_at = now() where owner_kind = 'category' and owner_id = $1 and status in ('visible', 'review')`, [`${cat}/${clave}`, s.id]);", "removed_reason = 'replaced', removed_by = $2, removed_at = now() where owner_kind = 'category' and owner_id like $1 || '%' and status in ('visible', 'review')`, [cat, s.id]);"],
  [CT, "then page_admin - 'tiles'\n                     else jsonb_set(page_admin, '{tiles}', (page_admin->'tiles') - $2::text) end", "then page_admin - 'tiles'\n                     else page_admin - 'tiles' end"],
  [CT, '    if (!k.ya) return "Ese mosaico ya tiene su foto original.";\n', ''],
  // 3 · La base: sin el check de «tiles», o con una dirección de afuera, o sin transacción.
  [MG, "and not jsonb_path_exists(page_admin->'tiles', '$.keyvalue() ? (@.value.type() != \"string\" || ", "and not jsonb_path_exists(page_admin->'tiles', '$.keyvalue() ? ("],
  [MG, '!(@.value like_regex "^/medios/n/[0-9a-f]{8}', '!(@.value like_regex "^[a-z:/]+/[0-9a-f]{8}'],
  [MG, '!(@.key like_regex "^[^[:cntrl:]]{1,80}$")', '!(@.key like_regex "^.*$")'],
  [MG, "(page_admin - 'hero' - 'tiles') = '{}'::jsonb", "true"],
  [MG, "\ncommit;\n", "\n"],
  // 4 · La página: sin la mezcla, con la foto que la revisión bajó, o con una consulta por mosaico.
  [CA, 'conMosaicos({ ...c.page, ...c.page_admin } as Pagina, mt.rows[0]?.tiles)', '({ ...c.page, ...c.page_admin } as Pagina)'],
  // Escala: los mosaicos de las 17 categorías en la consulta de todas (y se descartan 16).
  [CA, "`select k.id, k.short->>'es' as es, k.page, k.page_admin - 'tiles' as page_admin from categories k where k.status = 'on' order by k.sort`", "`select k.id, k.short->>'es' as es, k.page, k.page_admin - 'tiles' as page_admin, ${MOSAICOS_EQUIPO(\"k\")} as tiles from categories k where k.status = 'on' order by k.sort`"],
  [CA, "`select ${MOSAICOS_EQUIPO(\"k\")} as tiles from categories k where k.id = $1`, [c.id]", "`select ${MOSAICOS_EQUIPO(\"k\")} as tiles from categories k where k.status = 'on'`, []"],
  [CA, "and m.status = 'visible' and m.purged_at is null and not m.private))`;", "and m.purged_at is null))`;"],
  [CA, "and m.status = 'visible' and m.purged_at is null and not m.private))`;", "and m.status = 'visible' and m.purged_at is null))`;"],
  [CA, "m.owner_id = ${k}.id || '/' || t.key and m.url = t.value", "m.owner_id like ${k}.id || '%'"],
  [CA, '  const t = (x: Mosaico): Mosaico => (Object.hasOwn(tiles, x.key) ? { ...x, photo: tiles[x.key]! } : x);', '  const t = (x: Mosaico): Mosaico => x;\n  void db().query("select 1");'],
  [CA, "k.page_admin - 'tiles' as page_admin", "k.page_admin"],
  [AC, '${MOSAICOS_EQUIPO(\"k\")} as tiles_equipo', "coalesce(k.page_admin->'tiles', '{}'::jsonb) as tiles_equipo"],
  // 5 · La pantalla: sube por la ruta de las fotos públicas y manda el id; «Volver a la original».
  [UI, 'hacer: (m) => catMosaico(c.id, x.key, nv.id, m)', 'hacer: (m) => catMosaico(c.id, x.key, nv.url, m)'],
  [UI, '    const r = await subirFoto(f);\n    setSubeMos(null);', '    const r = await subirFotoPrivada(f);\n    setSubeMos(null);'],
  [UI, 'hacer: (m) => catMosaicoOriginal(c.id, x.key, m)', 'hacer: (m) => Promise.resolve({ ok: false, mensaje: m })'],
  // 6 · La ayuda (ES/EN).
  [AY, '  - **Page tiles:**', '  - **Tiles:**'],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  total++; console.log(`  ${r[0] ? '✓' : '✗'} ${G} al revés (${f.split('/').pop()})${r[1] ? ' → ' + r[1].trim().slice(0, 170) : ''}`); if (r[0]) bien++;
}
const limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
