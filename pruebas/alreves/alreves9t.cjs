// Prueba al revés de los guardianes de 9t (Buscar › Platos y servicios, el desplegable; Mi cuenta › Apartados y «Letra más grande»):
// - buscarPlatosComoLaFicha: una regla de lib/visible-publico.ts sin una de sus partes; una ficha que copia el filtro en vez de leerlo o cambia su
//   puerta; Buscar sin los negocios de Buscar (otra ciudad, inactivos, fuera del radio), sin el límite del Free, sin la pausa del Menú o de Servicios,
//   sin la sección visible, sin «alguien lo hace», mirando lo quitado, sin el índice, sin oferta_precio; platos() con una ciudad que no es la de la
//   persona; un servicio con un número que la ficha no dice.
// - letraGrandeDelServidor: yo() sin la letra, el marco sin recibirla o sin ponerla, sin la regla de CSS, la acción sin sesión o guardando otra
//   cosa, y la letra en el navegador (localStorage).
// - apartadosEnMiCuenta: la lista sin barrer, con apartados de otra persona o ya cerrados, «Cómo llegar» con la casa de quien trabaja desde casa,
//   la página sin la sesión.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const VP = 'apps/web/lib/visible-publico.ts', BP = 'apps/web/lib/buscar-platos.ts', PG = 'apps/web/app/(app)/buscar/page.tsx', API = 'apps/web/app/api/buscar/route.ts';
const AP = 'apps/web/lib/apartados.ts', PED = 'apps/web/app/(app)/cuenta/pedidos/page.tsx', ACC = 'apps/web/app/(app)/cuenta/acciones-perfil.ts';
const casos = [
  // buscarPlatosComoLaFicha · (1) la regla única
  ['buscarPlatosComoLaFicha', VP, "export const PLATO_VIVO = (i: string) => `${i}.module = 'menu' and ${i}.removed_at is null and ${i}.status = 'live'`;", "export const PLATO_VIVO = (i: string) => `${i}.module = 'menu' and ${i}.removed_at is null`;"],
  ['buscarPlatosComoLaFicha', VP, "${s}.removed_at is null and ${s}.visible`;", "${s}.removed_at is null`;"],
  ['buscarPlatosComoLaFicha', VP, "${i}.sell and ${i}.status = 'live' and not ${i}.is_extra`;", "${i}.sell and not ${i}.is_extra`;"],
  ['buscarPlatosComoLaFicha', VP, "${i}.status <> 'hidden' and coalesce", "${i}.status is not null and coalesce"],
  ['buscarPlatosComoLaFicha', VP, "${m}.hidden_by_admin is null and ${m}.takes_bookings`;", "${m}.takes_bookings`;"],
  // (2) las fichas leen de ahí y su puerta sigue
  ['buscarPlatosComoLaFicha', 'apps/web/lib/pedir.ts', 'where i.business_id = $1 and ${PLATO_VIVO("i")}', "where i.business_id = $1 and i.module = 'menu' and i.removed_at is null"],
  ['buscarPlatosComoLaFicha', 'apps/web/lib/salud-publico.ts', 'from items i where i.business_id = $1 and ${SERVICIO_VIVO("i")} order by', "from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null order by"],
  ['buscarPlatosComoLaFicha', 'apps/web/lib/oficios-publico.ts', 'if (!mods.includes("svc") || off.svc) return null;', 'if (!mods.includes("svc")) return null;'],
  ['buscarPlatosComoLaFicha', 'apps/web/lib/citas.ts', 'servicios: L.filter((s) => !s.extra && s.hacen.length)', 'servicios: L.filter((s) => !s.extra)'],
  // (3) Buscar con todas las reglas
  ['buscarPlatosComoLaFicha', BP, 'negocio_abierto(b.id, t.t) as open ${DESDE}${catNeg}', 'negocio_abierto(b.id, t.t) as open from businesses b join business_stats_cache s on s.business_id = b.id, c, t where true${catNeg}'],
  ['buscarPlatosComoLaFicha', BP, 'const params: unknown[] = [o.punto.ciudad];', "const params: unknown[] = ['hzl'];"],
  ['buscarPlatosComoLaFicha', BP, '(sec.sort, sec.id, i.sort, i.id)) < ${cfgSql("free_items")}))', '(sec.sort, sec.id, i.sort, i.id)) < 1000))'],
  ['buscarPlatosComoLaFicha', BP, "(n.cat = 'NEG-FOOD' and 'menu' = any(n.mods) and ${OFF(\"menu\")} and", "(n.cat = 'NEG-FOOD' and 'menu' = any(n.mods) and"],
  ['buscarPlatosComoLaFicha', BP, 'and sec.id is not null and ${SECCION_MENU_VISIBLE("sec")}', 'and sec.id is not null'],
  ['buscarPlatosComoLaFicha', BP, ' and not i.is_extra and ${ALGUIEN_LO_HACE("i")})', ' and not i.is_extra)'],
  ['buscarPlatosComoLaFicha', BP, "(n.cat in ('NEG-SALUD', 'NEG-PRO') and ${OFF(\"svc\")} and", "(n.cat in ('NEG-SALUD', 'NEG-PRO') and"],
  ['buscarPlatosComoLaFicha', BP, "from n join items i on i.business_id = n.id and i.removed_at is null and i.module in ('menu', 'svc')", "from n join items i on i.business_id = n.id"],
  ['buscarPlatosComoLaFicha', BP, 'export const CATS_PLATOS = ["NEG-FOOD",', 'export const CATS_PLATOS = ["NEG-FIESTA", "NEG-FOOD",'],
  ['buscarPlatosComoLaFicha', BP, "coalesce(oferta_precio(i.id, ${u}::uuid), i.price_cents)", "i.price_cents"],
  ['buscarPlatosComoLaFicha', API, 'platos(E, { punto: loc, cat, limite: 3', 'platos(E, { punto: { ...loc, ciudad: req.nextUrl.searchParams.get("ciudad") ?? loc.ciudad }, cat, limite: 3'],
  ['buscarPlatosComoLaFicha', 'apps/web/app/(app)/buscar/platos.ts', 'x.cents == null ? E2("Precio en la ficha", "Price on listing")', 'x.cents == null ? "$0"'],
  // letraGrandeDelServidor
  ['letraGrandeDelServidor', 'apps/web/lib/cuenta.ts', 'u.status_until as hasta, u.big_text as letra`,', 'u.status_until as hasta`,'],
  ['letraGrandeDelServidor', 'apps/web/app/(app)/layout.tsx', 'letra={!!u?.letra}', 'letra={false}'],
  ['letraGrandeDelServidor', 'apps/web/app/(app)/AppShell.tsx', 'data-letra={letra ? "grande" : undefined}', 'data-letra={undefined}'],
  ['letraGrandeDelServidor', 'apps/web/app/globals.css', '[data-letra="grande"] { zoom: 1.12; }', '[data-letra="grande"] { }'],
  ['letraGrandeDelServidor', ACC, 'export async function letraGrande(on: boolean): Promise<ResP> {\n  const u = await quien();\n  if (!u) return NO;', 'export async function letraGrande(on: boolean): Promise<ResP> {\n  const u = await yo();\n  if (!u) return NO;'],
  ['letraGrandeDelServidor', ACC, 'update users set big_text = $2 where id = $1`, [u.id, on === true]', 'update users set big_text = $2 where id = $1`, [u.id, !!on || true]'],
  // apartadosEnMiCuenta
  ['apartadosEnMiCuenta', AP, '  await barrerApartados({ userId });\n  return (await db().query<ApartadoCuenta>(', '  return (await db().query<ApartadoCuenta>('],
  ['apartadosEnMiCuenta', AP, "where o.user_id = $1 and o.kind = 'hold' and o.status in ('pending', 'change_proposed', 'confirmed')", "where o.kind = 'hold' and o.status in ('pending', 'change_proposed', 'confirmed', 'done')"],
  ['apartadosEnMiCuenta', AP, 'case when b.works_from_home then null else b.address end as dir', 'b.address as dir'],
  ['apartadosEnMiCuenta', PED, 'apartadosActivos(u.id, lang)', 'Promise.resolve([])'],
];
const crear = [
  ['letraGrandeDelServidor', 'apps/web/app/(app)/cuenta/zz9t.tsx', '"use client";\nexport const x = () => { try { localStorage.setItem("tl-letra", "1"); } catch { /* */ } };\n'],
];
let bien = 0, total = 0;
const correr = (G) => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (G, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [G, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(G, f.split('/').pop(), r);
}
for (const [G, f, c] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(G); } finally { fs.unlinkSync(ruta); }
  informe(G, `crear ${f.split('/').pop()}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
