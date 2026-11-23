// Prueba al revés del guardián portadaCategoriaDelEquipo (23 nov): la portada de /c/<categoría> la cambia el Super Admin (Catálogo › la categoría) y NADIE más escribe
// categories.page_admin; cada acción pide el mismo origen, el motivo, la categoría bloqueada y deja su auditoría (antes, después, motivo) en la misma transacción; la portada
// es siempre una foto del almacén propio (la acción recibe un id, nunca una dirección, y la base lo impone); la pantalla solo manda el id de la foto subida. Un caso por regla:
// se inyecta el defecto, el guardián debe fallar con SU mensaje ([portadaCategoriaDelEquipo]); se restaura. Punta a punta: cat9n3.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'portadaCategoriaDelEquipo';
const CT = 'apps/web/app/admin/acciones-catalogo.ts', UI = 'apps/web/app/admin/Catalogo.tsx', MG = 'packages/db/migrations/0214_portada_de_categoria.sql';
const CA = 'apps/web/lib/categoria.ts', SE = 'packages/db/seeds/paginas.sql';
const casos = [
  // 1 · Un segundo camino que escribe page_admin: otra función de la misma acción, otro archivo de la app, la semilla.
  [CT, 'export async function catPortadaFabrica(', 'export async function portadaAtajo(cat: string, u: string) {\n  await tx(async (c) => { await c.query(`update categories set page_admin = $2::jsonb where id = $1`, [cat, u]); });\n}\nexport async function catPortadaFabrica('],
  [CA, 'export async function categoriaPorSlug(', 'export async function ponerPortada(cat: string, u: string) {\n  await db().query(`update categories set page_admin = $2::jsonb where id = $1`, [cat, u]);\n}\nexport async function categoriaPorSlug('],
  [SE, 'update categories set page = ', "update categories set page_admin = '{}'::jsonb, page = "],
  // 2 · Cada acción: mismo origen, motivo, categoría bloqueada, auditoría completa, dentro de hacer.
  [CT, '  if (!(await mismoOrigen())) return no("No permitido.");\n  try {', '  try {'],
  [CT, '  if (!(await mismoOrigen())) return no("No permitido.");\n  return hacer(async (c, s) => {\n    const k = (await c.query<{ es: string; ya: string | null }>', '  return hacer(async (c, s) => {\n    const k = (await c.query<{ es: string; ya: string | null }>'],
  [CT, '  const m = limpio(motivo);\n  if (!m) return no("Escribe el motivo.");\n  if (!(await mismoOrigen())) return no("No permitido.");\n  try {', '  const m = limpio(motivo);\n  if (!(await mismoOrigen())) return no("No permitido.");\n  try {'],
  [CT, 'page_admin->>\'hero\' as ya from categories where id = $1 for update`', 'page_admin->>\'hero\' as ya from categories where id = $1`'],
  [CT, 'action: "catalogo.cat.portada", targetKind: "category", targetId: cat,\n        before: { categoria: k.es, portada: k.ya ? `foto del equipo · ${k.ya}` : "de fábrica" }, after: { portada: `foto del equipo · ${f.url}` }, reason: m });', 'action: "catalogo.cat.portada", targetKind: "category", targetId: cat,\n        before: { categoria: k.es, portada: k.ya ? `foto del equipo · ${k.ya}` : "de fábrica" }, after: { portada: `foto del equipo · ${f.url}` } });'],
  [CT, 'before: { categoria: k.es, portada: `foto del equipo · ${k.ya}` }, after: { portada: "de fábrica" }, reason: m });', 'before: { categoria: k.es, portada: `foto del equipo · ${k.ya}` }, reason: m });'],
  [CT, 'action: "catalogo.cat.portada_fabrica"', 'action: "catalogo.cat.portada_quitar"'],
  [CT, "      await c.query(`update categories set page_admin = jsonb_set(coalesce(page_admin, '{}'::jsonb), '{hero}', to_jsonb($2::text)), updated_at = now() where id = $1`, [cat, f.url]);\n      await auditar(", "      await auditar("],
  [CT, "  if (!s || !s.puede(\"cat\", \"editar\")) return no(\"Tu rol no edita el catálogo.\");", "  if (!s) return no(\"Tu rol no edita el catálogo.\");"],
  [CT, '  const r = await tx((c) => fn(c, s));', '  const r = await fn(null as unknown as PoolClient, s);'],
  // 3 · La portada es una foto de nuestro almacén: una dirección en vez de un id, escribir lo que mandó la pantalla, sin el check de la base.
  [CT, 'export async function catPortada(cat: string, mediaId: string, motivo: string): Promise<ResAdm> {', 'export async function catPortada(cat: string, mediaId: string, motivo: string, url?: string): Promise<ResAdm> {'],
  [CT, 'export async function catPortada(cat: string, mediaId: string, motivo: string): Promise<ResAdm> {', 'export async function catPortada(cat: string, url: string, motivo: string): Promise<ResAdm> {'],
  [CT, "to_jsonb($2::text)), updated_at = now() where id = $1`, [cat, f.url]);", "to_jsonb($2::text)), updated_at = now() where id = $1`, [cat, mediaId]);"],
  [CT, "page_admin = coalesce(page_admin, '{}'::jsonb) - 'hero'", "page_admin = '{}'::jsonb"],
  [MG, "(page_admin - 'hero') = '{}'::jsonb", "true"],
  [MG, "'^/medios/n/[0-9a-f]{8}", "'^[a-z:/]+/[0-9a-f]{8}"],
  [CT, "removed_reason = 'replaced', removed_by = $2, removed_at = now() where owner_kind = 'category' and owner_id = $1 and status = 'visible'`, [cat, s.id]);", "removed_reason = 'replaced', removed_by = $2, removed_at = now() where owner_kind = 'category' and owner_id = $1 and status = 'visible'`, [cat, s.id]);\n    await c.query(`delete from media where owner_kind = 'category' and owner_id = $1`, [cat]);"],
  [CT, "owner_kind = 'category', owner_id = $1, sort = 0", "owner_kind = 'user', owner_id = $1, sort = 0"],
  // 4 · La pantalla: sube por la ruta de las fotos públicas y manda solo el id.
  [UI, 'hacer: (m) => catPortada(c.id, nueva.id, m)', 'hacer: (m) => catPortada(c.id, nueva.url, m)'],
  [UI, 'const r = await subirFoto(f);', 'const r = await subirFotoPrivada(f);'],
  [UI, 'hacer: (m) => catPortadaFabrica(c.id, m)', 'hacer: (m) => Promise.resolve({ ok: false, mensaje: m })'],
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
