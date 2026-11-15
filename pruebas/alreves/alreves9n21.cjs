// Prueba al revés del guardián de 9n-21. cuponDelServidor (cupón para seguidores, dinero): cuponDe sin revisar que la persona sigue al negocio, sin el
// vencimiento o sin el mínimo; crearPedido sin restar el descuento, con la comisión sobre el subtotal entero o sin anotar el uso; la pantalla que manda
// el descuento; la migración sin «una vez por persona» o sin el trigger que devuelve el uso.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje; se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const L = 'apps/web/lib/cupon-seguidores.ts', P = 'apps/web/lib/pedir.ts', M = 'packages/db/migrations/0169_cupon_seguidores.sql', C = 'apps/web/app/(app)/n/[id]/pagar/Pagar.tsx';
const casos = [
  ['cuponDelServidor', L, "exists (select 1 from follows f where f.follower_user_id = $3 and f.target_kind = 'business' and f.target_id = p.business_id) as sigue", "true as sigue"],
  ['cuponDelServidor', L, 'and p.publish_at <= now() and p.ends_at > now()', 'and p.publish_at <= now()'],
  ['cuponDelServidor', L, '  if (sub < p.min) return', '  if (false) return'],
  ['cuponDelServidor', P, '    const total = sub - desc + tax + envio + propina;', '    const total = sub + tax + envio + propina;'],
  ['cuponDelServidor', P, 'subtotal: sub - desc, pm, userId', 'subtotal: sub, pm, userId'],
  ['cuponDelServidor', P, '    if (cup) await c.query(`insert into follower_coupon_uses', '    if (false) await c.query(`insert into follower_coupon_uses'],
  ['cuponDelServidor', C, '...(cup ? { cupon: cup.code } : {}),', '...(cup ? { cupon: cup.code, descuento: cupOff } : {}),'],
  ['cuponDelServidor', M, "create unique index if not exists follower_coupon_uses_una_vez on follower_coupon_uses (post_id, user_id) where status = 'usado';", ''],
  ['cuponDelServidor', M, 'create trigger operations_cupon_vuelve after update of status on operations', 'create trigger operations_cupon_vuelve after update of total_cents on operations'],
];
const crear = [];
let bien = 0, total = 0;
const correr = (G) => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (G, que, [falla, out], esperaFalla = true) => { total++; const ok = falla === esperaFalla; console.log(`  ${ok ? '✓' : '✗'} ${G} ${esperaFalla ? 'al revés' : 'al derecho'} (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (ok) bien++; };
for (const [G, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(G, f.split('/').pop(), r);
}
for (const [G, f, c] of crear) { const ruta = path.join(R, f); fs.writeFileSync(ruta, c); let r; try { r = correr(G); } finally { fs.unlinkSync(ruta); } informe(G, `crear ${f.split('/').pop()}`, r); }
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
