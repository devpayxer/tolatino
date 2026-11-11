// Prueba al revés de los guardianes de 5e: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const O = 'apps/web/lib/oficial.ts', C = 'apps/web/lib/comunidad.ts', H = 'apps/web/lib/hoy.ts', M = 'packages/db/migrations/0101_hoy_cuenta_oficial.sql', P = 'apps/web/lib/comunidad-portada.ts';
const BP = 'apps/web/app/(app)/buscar/page.tsx', BA = 'apps/web/app/(app)/buscar/acciones.ts', AC = 'apps/web/lib/admin-contenido.ts';
const casos = [
  // oficialNoEsPersona
  ['oficialNoEsPersona', O, '  if (!puedeOficial(s, ciudad)) return no("Tu rol no escribe como la cuenta oficial de esa ciudad.");\n', ''],
  ['oficialNoEsPersona', O, "values ($1, 'official', null, $2,", "values ($1, 'official', $2, $2,"],
  ['oficialNoEsPersona', O, 'export const ROLES_OFICIAL = ["admin", "ciudad"];', 'export const ROLES_OFICIAL = ["admin", "ciudad", "moderador"];'],
  ['oficialNoEsPersona', O, '  return tx(async (c) => {\n    const ci =', '  return tx(async (c) => {\n    await c.query(`insert into users (phone) values (\'+15705550000\')`);\n    const ci ='],
  ['oficialNoEsPersona', C, 'oficial ? { id: null, nombre:', 'oficial ? { id: "oficial", nombre:'],
  ['oficialNoEsPersona', 'apps/web/app/(app)/comunidad/Muro.tsx', 'onAuthor={p.autor.id && !p.autor.oficial ?', 'onAuthor={p.autor.id ?'],
  ['oficialNoEsPersona', 'apps/web/lib/vecinos.ts', 'import "server-only";', 'import "server-only";\nexport const tabla = `select user_id, sum(delta) from points_entries group by 1`;'],
  ['oficialNoEsPersona', 'apps/web/lib/comunidad-hilo.ts', 'import "server-only";', 'import "server-only";\nexport const sello = `insert into com_posts (city_id, author_kind, kind, body) values ($1, \'official\', \'publicacion\', $2)`;'],
  // hoySoloEnVivo
  ['hoySoloEnVivo', M, "  select post_en_vivo(p) and p.audience = 'all' and p.hoy_off_at is null and p.publish_at > now() - interval '24 hours'", "  select post_en_vivo(p) and p.hoy_off_at is null and p.publish_at > now() - interval '24 hours'"],
  ['hoySoloEnVivo', M, "  select post_en_vivo(p) and p.audience = 'all' and p.hoy_off_at is null and p.publish_at > now() - interval '24 hours'", "  select post_en_vivo(p) and p.audience = 'all' and p.hoy_off_at is null"],
  ['hoySoloEnVivo', M, "  select post_en_vivo(p) and p.audience = 'all' and p.hoy_off_at is null and p.publish_at > now() - interval '24 hours'", "  select p.status = 'live' and p.audience = 'all' and p.hoy_off_at is null and p.publish_at > now() - interval '24 hours'"],
  ['hoySoloEnVivo', M, '$$;\n\n-- Fijada', "$$;\ncreate or replace function post_en_vivo(p business_posts) returns boolean language sql stable as $$\n  select p.status = 'live' and p.hidden_at is null and p.publish_at <= now() and (p.ends_at is null or p.ends_at > now())\n$$;\n\n-- Fijada"],
  ['hoySoloEnVivo', H, '          and post_en_hoy(p) and ($2::text is null', '          and ($2::text is null'],
  ['hoySoloEnVivo', H, "        and p.publish_at > now() - interval '24 hours' and post_en_hoy(p)`, [negocio]);", "        and p.publish_at > now() - interval '24 hours'`, [negocio]);"],
  ['hoySoloEnVivo', AC, '        and (post_en_hoy(p) or p.hoy_off_at is not null)', '        and (true or p.hoy_off_at is not null)'],
  ['hoySoloEnVivo', 'apps/web/lib/novedades.ts', 'import "server-only";', 'import "server-only";\nexport const hoy2 = `select * from business_posts p where p.hoy_off_at is null and p.status = \'live\'`;'],
  // buscarVecinosConSesion
  ['buscarVecinosConSesion', P, '  if (!viewer || !consulta) return { items: [], mas: null, total: 0 };\n', ''],
  ['buscarVecinosConSesion', P, ' sinBloqueos("p.author_user_id", "$1"),\n    "not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = \'post\' and h.target_id = p.id)"];', '\n    "not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = \'post\' and h.target_id = p.id)"];'],
  ['buscarVecinosConSesion', BP, 'u && E.grupos.length && !catSel ? buscarVecinos(u.id,', 'E.grupos.length && !catSel ? buscarVecinos(u?.id ?? "",'],
  ['buscarVecinosConSesion', BP, 'const tab = sp.tab === "biz" ? "biz" : sp.tab === "vec" && u ? "vec" : "all";', 'const tab = sp.tab === "biz" ? "biz" : sp.tab === "vec" ? "vec" : "all";'],
  ['buscarVecinosConSesion', BA, '  if (!u) return { items: [], mas: null };\n', ''],
  ['buscarVecinosConSesion', 'apps/web/app/api/buscar/route.ts', 'import', 'import { buscarVecinos } from "@/lib/comunidad-portada";\nvoid buscarVecinos;\nimport'],
  // comunidadSinTelefonos (ampliado): la cuenta oficial pasa por el filtro antes de escribir.
  ['comunidadSinTelefonos', O, '  const f = revisarPublicacion({ kind, body: String(p.body ?? ""), topic: p.topic ?? null, opts: p.opts, dias, fotos: [] });\n  if (f) return no(f.msg.es);\n', ''],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 60)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 130) : ''}`); if (falla) bien++;
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
