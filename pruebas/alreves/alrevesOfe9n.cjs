// Prueba al revés del guardián ofertaProductoDelServidor (LAUNCH «Tachado en Mercado y Tienda», 18 nov): el precio de un producto que muestra la ficha
// del mercado o de la tienda, el que cobra el pedido del mercado (y su sustituto) y el que guarda el apartado salen de oferta_precio() (la oferta en vivo
// de Novedades para esa persona); el tachado es el de siempre solo cuando la oferta lo baja; la oferta nunca es de un producto de 21+ ni de otro
// negocio (el servidor y la base, 0178). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura.
// Además, precioAntesReal: la tarjeta del mercado con un «antes» que no viene del servidor.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const L = 'apps/web/lib/', ME = L + 'mercado.ts', MP = L + 'merc-publico.ts', AP = L + 'apartados.ts', NV = L + 'novedades.ts', LY = L + 'layaway.ts';
const MIG = 'packages/db/migrations/0178_ofertas_productos.sql', MT = 'apps/web/app/(app)/n/[id]/Mercado.tsx';
const G = 'ofertaProductoDelServidor';
const casos = [
  // el pedido del mercado cobra el precio del catálogo aunque haya oferta
  [G, ME, "coalesce(oferta_precio(i.id, $4::uuid), i.price_cents) as cents", "i.price_cents as cents"],
  // la pantalla del pedido del mercado muestra el del catálogo
  [G, ME, "coalesce(oferta_precio(i.id, $3::uuid), i.price_cents) as cents", "i.price_cents as cents"],
  // el sustituto se propone al precio del catálogo
  [G, ME, "coalesce(oferta_precio(id, $3::uuid), price_cents) as cents", "price_cents as cents"],
  // la ficha del mercado muestra el del catálogo
  [G, MP, "coalesce(oferta_precio(i.id, $3::uuid), i.price_cents) as cents", "i.price_cents as cents"],
  // … y el tachado sale siempre (no solo con oferta)
  [G, MP, "was: base > x.cents ? base : null", "was: base"],
  // el apartado guarda el precio del catálogo
  [G, AP, "coalesce(oferta_precio(id, $3::uuid), price_cents) as p", "price_cents as p"],
  // la ficha de la tienda muestra el del catálogo
  [G, AP, "coalesce(oferta_precio(i.id, $2::uuid), i.price_cents) as precio", "i.price_cents as precio"],
  // … y el tachado de la tienda sale siempre
  [G, AP, "was: base > x.precio ? base : null", "was: base"],
  // una lectura nueva del precio en la tienda sin la oferta
  [G, AP, "`select id::text from items where business_id = $1 and module = 'shop' and featured", "`select id::text, price_cents from items where business_id = $1 and module = 'shop' and featured"],
  // el plan (layaway) lee el precio del catálogo
  [G, LY, 'import "server-only";', 'import "server-only";\nexport const precioPlan = "select price_cents from items";'],
  // la oferta se guarda en un producto de 21+ (o en cualquier artículo)
  [G, NV, "and removed_at is null and (module = 'menu' or (module = 'shop' and age_min = 0))`", "and removed_at is null`"],
  // el editor ofrece lo de 21+
  [G, NV, "and (i.module = 'menu' or (i.module = 'shop' and i.age_min = 0)) and i.removed_at is null", "and i.module in ('menu', 'shop') and i.removed_at is null"],
  // la base cobra la oferta de un artículo de otro negocio
  [G, MIG, "and i.business_id = p.business_id and i.removed_at is null and not (i.module = 'shop' and i.age_min > 0)\n     and (p.audience", "and i.removed_at is null and not (i.module = 'shop' and i.age_min > 0)\n     and (p.audience"],
  // … o la de un producto de 21+
  [G, MIG, "and i.business_id = p.business_id and i.removed_at is null and not (i.module = 'shop' and i.age_min > 0)\n     and (p.audience", "and i.business_id = p.business_id and i.removed_at is null\n     and (p.audience"],
  // la tarjeta del mercado con un precio de antes escrito a mano
  ['precioAntesReal', MT, "price={v.precio(p).l} was={p.was != null ? <PrecioAntes t={v.antes(p)} es={v.es} /> : null} tags", "price={v.precio(p).l} was={\"$5.99\"} tags"],
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
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
