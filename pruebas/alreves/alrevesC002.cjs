// Prueba al revés de C-002 (Patrocinados). patrocinioDelServidor: la vitrina muestra lo que no está activo, lo de otra categoría, más que los
// puestos o ignora los filtros; el precio sale de la pantalla; comprar sin «Cobros», desde la app o sin mismo origen; otra pieza escribe el libro
// o las cifras; una etiqueta por tarjeta; la base deja pasar de los puestos. Se inyecta el defecto, el guardián debe fallar con SU mensaje; se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const L = 'apps/web/lib/patrocinio.ts', A = 'apps/web/app/panel/acciones-patrocinio.ts', PG = 'apps/web/app/(app)/c/[slug]/page.tsx',
  T = 'apps/web/app/(app)/c/[slug]/Patrocinados.tsx', M = 'packages/db/migrations/0173_patrocinios.sql';
const G = 'patrocinioDelServidor';
const casos = [
  // La vitrina: lo reservado (o lo vencido) sale; otra categoría; sin tope de puestos; sin los filtros.
  [L, "from sponsorships where city_id = $1 and category_id = $2 and status = 'activo' and starts_at <= now() and ends_at > now()", "from sponsorships where city_id = $1 and category_id = $2 and status in ('activo', 'reservado')"],
  [L, "from sponsorships where city_id = $1 and category_id = $2 and status = 'activo'", "from sponsorships where city_id = $1 and status = 'activo'"],
  [L, 'limit ${cfgPuestos}', 'limit 50'],
  [L, 'const extra = condiciones({ sub, filtros }, params);', 'const extra = "";'],
  // El precio: de la pantalla (un monto en lo que manda la compra) o escrito a mano.
  [L, 'export type CompraIn = { dur: "week" | "month";', 'export type CompraIn = { centavos: number; dur: "week" | "month";'],
  [L, 'const centavos = x.dur === "week" ? P.week : P.month,', 'const centavos = x.dur === "week" ? 1500 : 4500,'],
  [L, 'const centavos = s.duration === "week" ? P.week : P.month,', 'const centavos = s.duration === "week" ? 1000 : P.month,'],
  [L, 'return { week: v.patrocinio_semana_cents, month: v.patrocinio_mes_cents,', 'return { week: 1500, month: v.patrocinio_mes_cents,'],
  // Comprar: sin la parte «Cobros», sin mismo origen, desde la app.
  [A, 'return typeof id === "string" ? accesoPanel(id, "pay") : null;', 'return typeof id === "string" ? accesoPanel(id) : null;'],
  [A, '  if (!(await mismoOrigen())) return null;\n', ''],
  [A, '  if (!(await enLaWeb())) return EN_APP;\n  const dur', '  const dur'],
  [A, '  if (on === true && !(await enLaWeb())) return EN_APP;\n', ''],
  // La página saca Patrocinados sin los filtros; una etiqueta por tarjeta.
  [PG, 'vitrinaCategoria(loc, c.id, sub ? reglas.get(sub)! : null, elegidos)', 'vitrinaCategoria(loc, c.id, null, [])'],
  [T, '<span className={`truncate font-display', '<span className="rounded bg-ink/60 px-2">PATROCINADO</span><span className={`truncate font-display'],
  // La base: sin candado o sin tope; se puede cambiar el precio pagado; el libro se edita; las cifras a mano.
  [M, "perform pg_advisory_xact_lock(hashtextextended('pat:' || new.city_id || ':' || new.category_id, 0));", '-- sin candado'],
  [M, 'or new.ends_at <> old.ends_at or new.duration <> old.duration or new.price_cents <> old.price_cents', 'or new.ends_at <> old.ends_at or new.duration <> old.duration'],
  [M, 'create trigger sponsorship_payments_no_cambia before update or delete on sponsorship_payments', 'create trigger sponsorship_payments_no_cambia before delete on sponsorship_payments'],
  [M, 'create trigger sponsorship_stats_no_editable before insert or update or delete on sponsorship_stats', 'create trigger sponsorship_stats_no_editable before delete on sponsorship_stats'],
];
const crear = [
  // Otra pieza que escribe el libro o las cifras por su cuenta.
  ['apps/web/lib/zz-alreves-patrocinio.ts', 'export const q = "update sponsorship_stats set views = views + 100 where ref_id = $1";\n'],
  ['apps/web/app/zz-alreves-patrocinio.ts', 'export const q = "insert into sponsorships (business_id, price_cents) values ($1, $2)";\n'],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 200) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(path.basename(f), correr()); } finally { fs.writeFileSync(ruta, orig); }
}
for (const [f, contenido] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, contenido);
  try { informe(path.basename(f), correr()); } finally { fs.unlinkSync(ruta); }
}
let limpio = true;
try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
