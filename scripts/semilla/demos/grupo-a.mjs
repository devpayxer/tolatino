#!/usr/bin/env node
/* Grupo A · negocios demo del sandbox: FOOD, MERC, TIENDA y NOCHE (4 categorías × 5 subcategorías principales × 10 negocios = 200).
   Subcategorías principales = las 5 primeras por `subcategories.sort` de cada categoría (la columna `top` está en falso en todo el catálogo).
   Uso: node scripts/semilla/demos/grupo-a.mjs [food|merc|tienda|noche]   →  infra/pruebas/demos/demo-a-<categoria>.sql
   Determinista (PRNG con semilla), una transacción por archivo, llaves fijas y «on conflict do nothing». SOLO SANDBOX. */
import { writeFileSync, mkdirSync } from "node:fs";
import { q } from "./a/comun.mjs";
import { HEAD, CLIENTES_SQL, FUNCIONES, bloqueNegocio } from "./a/sql.mjs";
import { reiniciar } from "./a/negocio.mjs";

const RAIZ = new URL("../../..", import.meta.url).pathname;
const SALIDA = RAIZ + "infra/pruebas/demos/";
mkdirSync(SALIDA, { recursive: true });

const CATS = {
  food: { archivo: "demo-a-food.sql", titulo: "Demo A · Comida y Bebidas (NEG-FOOD): 50 negocios", off: 0, mod: "menu", fn: "da_food", mod2: "./a/food.mjs", gen: "generarFood" },
  merc: { archivo: "demo-a-merc.sql", titulo: "Demo A · Mercados (NEG-MERC): 50 negocios", off: 50, mod: "shop", fn: "da_merc", mod2: "./a/merc.mjs", gen: "generarMerc" },
  tienda: { archivo: "demo-a-tienda.sql", titulo: "Demo A · Tiendas (NEG-TIENDA): 50 negocios", off: 100, mod: "shop", fn: "da_hold", mod2: "./a/tienda.mjs", gen: "generarTienda" },
  noche: { archivo: "demo-a-noche.sql", titulo: "Demo A · Vida Nocturna (NEG-NOCHE): 50 negocios", off: 150, mod: "svc", fn: "da_night", mod2: "./a/noche.mjs", gen: "generarNoche" },
};

const jsonSql = (o) => `$j$${JSON.stringify(o)}$j$::jsonb`;
const quita = (s) => s.replace(/\$j\$/g, "");

const quiero = process.argv[2] ? [process.argv[2]] : Object.keys(CATS);
for (const clave of quiero) {
  const C = CATS[clave];
  reiniciar(C.off);
  const mod = await import(C.mod2);
  const negocios = mod[C.gen]();
  const ids = negocios.map((b) => b.id);
  let sql = HEAD(C.titulo) + CLIENTES_SQL() + FUNCIONES;
  for (const b of negocios) sql += bloqueNegocio(b, b.sqlExtra ?? "");
  // Tabla temporal ítem → orden (el orden de inserción en cada negocio) y tallas.
  sql += `create temp table da_it on commit drop as
  select business_id as biz, (row_number() over (partition by business_id order by id))::int as ord, id, name, price_cents, tax_pct
    from items where business_id = any(array[${ids.map(q).join(",")}]::text[]) and module = ${q(C.mod)} and removed_at is null and not is_extra;
create temp table da_var on commit drop as
  select i.biz, i.ord, v.id, v.label from da_it i join item_variants v on v.item_id = i.id and v.removed_at is null;
`;
  for (const b of negocios) {
    const h = b.hist;
    sql += `do $$ begin perform pg_temp.${C.fn}(${q(b.id)}, ${jsonSql(h.ops)}); perform pg_temp.da_reviews(${q(b.id)}, ${jsonSql(h.reviews)});
  perform pg_temp.da_posts(${q(b.id)}, ${jsonSql(h.posts)}); perform pg_temp.da_follows(${q(b.id)}, ${b.fol.st}, ${b.fol.n}, ${b.fol.stp}, 3000); end $$;\n`;
  }
  if (mod.cierre) sql += mod.cierre(negocios);
  sql += `-- Derivados con las funciones de la propia app (nunca a mano).
do $$ begin perform reviews_stats(id) from businesses where id = any(array[${ids.map(q).join(",")}]::text[]); end $$;
update business_stats_cache s set profile_strength = perfil_fuerza(s.business_id) where s.business_id = any(array[${ids.map(q).join(",")}]::text[]);
commit;
`;
  writeFileSync(SALIDA + C.archivo, sql);
  const nops = negocios.reduce((s, b) => s + b.hist.ops.length, 0), nrev = negocios.reduce((s, b) => s + b.hist.reviews.length, 0), npost = negocios.reduce((s, b) => s + b.hist.posts.length, 0);
  console.log(`${C.archivo}: ${negocios.length} negocios · ${nops} operaciones · ${nrev} reseñas · ${npost} novedades · ${(sql.length / 1048576).toFixed(2)} MB`);
}
