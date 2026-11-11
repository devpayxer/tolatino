// Prueba al revés de los guardianes de 5g: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0103_monedas_cupones.sql', MO = 'apps/web/lib/monedas.ts', MC = 'apps/web/lib/monedas-comun.ts', CU = 'apps/web/lib/cupones.ts',
  PA = 'apps/web/app/panel/acciones-cupones.ts', CP = 'apps/web/app/panel/CuponesPanel.tsx', V = 'apps/web/app/(app)/comunidad/monedas/Monedas.tsx', AG = 'apps/web/app/admin/Gamificacion.tsx',
  AC = 'apps/web/app/admin/acciones-gam.ts', T = 'apps/web/lib/tabla.ts', VE = 'apps/web/lib/vecinos.ts';
const casos = [
  // monedasSinDinero
  ['monedasSinDinero', MO, 'import "server-only";', 'import "server-only";\nexport const comprar = (cents: number) => cents;'],
  ['monedasSinDinero', CU, 'import "server-only";', 'import "server-only";\nimport { pasarela } from "./pagos";'],
  ['monedasSinDinero', MC, 'export const COSTO_MIN = 80, COSTO_MAX = 1000;', 'export const COSTO_MIN = 80, COSTO_MAX = 1000;\nexport const transferirMonedas = (a: string, b: string) => [a, b];'],
  ['monedasSinDinero', V, '{t(SIN_VALOR).toUpperCase()}', '{"MONEDAS"}'],
  ['monedasSinDinero', AG, 'v: SIN_VALOR.es, s: "no se compran ni se cambian"', 'v: "100 = $1", s: "no se compran ni se cambian"'],
  ['monedasSinDinero', MC, 'export const SIN_VALOR: Bi = { es: "Sin valor en dinero", en: "No cash value" };', 'export const SIN_VALOR: Bi = { es: "Cada moneda vale un centavo", en: "No cash value" };'],
  ['monedasSinDinero', M, "  reason_key  text not null check (reason_key in ('welcome', 'premio_mes', 'canje', 'devolucion', 'ajuste')),", "  reason_key  text not null check (reason_key in ('welcome', 'premio_mes', 'canje', 'devolucion', 'ajuste', 'compra')),"],
  ['monedasSinDinero', M, '  ref_id      text not null,\n  reverses_id', '  ref_id      text not null,\n  to_user_id  uuid references users (id),\n  reverses_id'],
  ['monedasSinDinero', M, '-- ── Cupones de negocios ──', "create or replace function mon_transferir(a uuid, b uuid, n int) returns void language sql as $$ select 1 $$;\n-- ── Cupones de negocios ──"],
  ['monedasSinDinero', PA, 'import type { Res } from "./acciones";', 'import type { Res } from "./acciones";\nimport { stripe } from "@/lib/pagos";'],
  ['monedasSinDinero', MO, 'import "server-only";', 'import "server-only";\nexport const mezcla = `select sum(delta) from points_entries`;'],
  // libroSoloInsercion
  ['libroSoloInsercion', M, 'create trigger coin_entries_no_cambia before update or delete on coin_entries for each row execute function coin_entries_inmutable();', ''],
  ['libroSoloInsercion', M, "  if coalesce(current_setting('tl.monedas', true), '') <> 'si' then raise exception 'el libro de monedas solo lo escriben sus funciones (mon_*)'; end if;\n", ''],
  ['libroSoloInsercion', M, 'on coin_entries (user_id, reason_key, ref_kind, ref_id) where reverses_id is null;', 'on coin_entries (user_id, reason_key, ref_kind, ref_id, id) where reverses_id is null;'],
  ['libroSoloInsercion', M, "  if tg_op = 'DELETE' then raise exception 'un canje no se borra'; end if;\n", ''],
  ['libroSoloInsercion', CU, 'import "server-only";', 'import "server-only";\nexport const borra = `delete from coin_entries where user_id = $1`;'],
  ['libroSoloInsercion', CU, 'import "server-only";', 'import "server-only";\nexport const usa = `update coupon_redemptions set status = \'used\' where code = $1`;'],
  ['libroSoloInsercion', MO, 'import "server-only";', 'import "server-only";\nexport const marca = `select set_config(\'tl.monedas\', \'si\', true)`;'],
  ['libroSoloInsercion', CU, 'import "server-only";', 'import "server-only";\nexport const quita = `delete from coupons where id = $1`;'],
  // saldoDerivado
  ['saldoDerivado', MO, 'import "server-only";', 'import "server-only";\nexport const regala = `update community_profiles set coins = coins + 50 where user_id = $1`;'],
  ['saldoDerivado', M, "  elsif not com_derivados_ok() and new.coins is distinct from old.coins then\n    raise exception 'las monedas son derivadas: solo las escribe su libro (mon_*)';\n", ''],
  ['saldoDerivado', M, '  update community_profiles set coins = coins + new.delta where user_id = new.user_id;', '  update community_profiles set coins = greatest(0, coins + new.delta) where user_id = new.user_id;'],
  ['saldoDerivado', M, 'alter table community_profiles add constraint community_profiles_monedas check (coins >= 0);', ''],
  ['saldoDerivado', M, '  select coins into saldo from community_profiles where user_id = uid for update;\n  if coalesce(saldo, 0) < n then', '  select coins into saldo from community_profiles where user_id = uid;\n  if coalesce(saldo, 0) < n then'],
  ['saldoDerivado', T, 'import "server-only";', 'import "server-only";\nexport const premio = `select mon_premios_mes($1, $2::date)`;'],
  ['saldoDerivado', CU, 'import "server-only";', 'import "server-only";\nexport const gasta = `select mon_gastar($1::uuid, 80, \'cupon\', $2)`;'],
  ['saldoDerivado', VE, 'import "server-only";', 'import "server-only";\nexport const bien = `select mon_bienvenida($1::uuid)`;'],
  ['saldoDerivado', CU, 'import "server-only";', 'import "server-only";\nexport const ajusta = `select mon_ajustar($1::uuid, 10, $2::uuid, $3)`;'],
  // cuponUnaVez (la carrera de la última unidad y el código usado dos veces)
  ['cuponUnaVez', M, '   where c.id = cid for update of c;', '   where c.id = cid;'],
  ['cuponUnaVez', M, "  if usados >= cp.monthly_stock then raise exception 'cupon agotado este mes'; end if;\n", ''],
  ['cuponUnaVez', M, "  if exists (select 1 from coupon_redemptions r where r.coupon_id = cid and r.user_id = uid and r.status in ('issued', 'used')) then raise exception 'cupon ya canjeado'; end if;\n", ''],
  ['cuponUnaVez', M, "create unique index if not exists coupon_redemptions_uno on coupon_redemptions (coupon_id, user_id) where status in ('issued', 'used');", ''],
  ['cuponUnaVez', M, "  select * into r from coupon_redemptions where code = upper(btrim(cod)) for update;", "  select * into r from coupon_redemptions where code = upper(btrim(cod));"],
  ['cuponUnaVez', M, "  if r.status = 'used' then return query select 'usado'::text, r.id, r.user_id, r.coupon_id, r.used_at; return; end if;\n", ''],
  ['cuponUnaVez', M, "update coupon_redemptions set status = 'used', used_at = now(), used_by = staff where id = r.id and status = 'issued';", "update coupon_redemptions set status = 'used', used_at = now(), used_by = staff where id = r.id;"],
  ['cuponUnaVez', M, "    if old.status <> 'issued' then raise exception 'un código usado o vencido no cambia'; end if;\n", ''],
  ['cuponUnaVez', M, "  if r.id is null or r.business_id <> negocio then", "  if r.id is null then"],
  ['cuponUnaVez', M, "  code            text not null unique check (code ~ '^TL-CQ-[2-9A-HJ-NP-Z]{4,6}$'),", "  code            text not null check (code ~ '^TL-CQ-[0-9A-Z]{4,6}$'),"],
  ['cuponUnaVez', PA, 'import type { Res } from "./acciones";', 'import type { Res } from "./acciones";\nexport async function cupCosto(id: string, costo: number) { return { id, costo }; }'],
  ['cuponUnaVez', CU, '  const r = await tx(async (c) => (await c.query<{ res: "ok" | "usado" | "vencido" | "no"', '  void `update coupons set cost_coins = 80 where id = $1`;\n  const r = await tx(async (c) => (await c.query<{ res: "ok" | "usado" | "vencido" | "no"'],
  ['cuponUnaVez', CP, 'import type { Ctx, Editor } from "./Panel";', 'import type { Ctx, Editor } from "./Panel";\nexport const otro = `select * from cup_validar($1, $2, $3)`;'],
  ['cuponUnaVez', M, "  e := mon_gastar(uid, cp.cost_coins, 'cupon', cod);\n  v := now() + make_interval(days => cp.valid_days);\n  prev := cup_entrar();\n  insert into coupon_redemptions (coupon_id, business_id, city_id, user_id, code, cost_coins, coin_entry_id, expires_at)\n    values (cid, cp.business_id, cp.city_id, uid, cod, cp.cost_coins, e, v) returning id into rid;",
    "  v := now() + make_interval(days => cp.valid_days);\n  prev := cup_entrar();\n  insert into coupon_redemptions (coupon_id, business_id, city_id, user_id, code, cost_coins, coin_entry_id, expires_at)\n    values (cid, cp.business_id, cp.city_id, uid, cod, cp.cost_coins, 0, v) returning id into rid;\n  e := mon_gastar(uid, cp.cost_coins, 'cupon', cod);"],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 140) : ''}`); if (falla) bien++;
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
