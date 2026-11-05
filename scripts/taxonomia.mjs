#!/usr/bin/env node
/* Lee docs/diseno/plan/taxonomia-negocios.md (fuente única de categorías) y genera:
   - packages/taxonomy/categorias.json  → lo que usa el código
   - packages/db/migrations/0004_catalogo_datos.sql → lo que va a la base (idempotente)
   Nombres cortos e íconos: tablas del prototipo (To'Latino Prototipo.dc.html). Los cortos marcados
   «provisional» no estaban en el prototipo; se editan en el Super Admin › Catálogo. Determinista. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname;
const md = readFileSync(join(RAIZ, "docs/diseno/plan/taxonomia-negocios.md"), "utf8");

// Del prototipo: [ícono, corto ES, corto EN, provisional]
const EXTRA = {
  "NEG-AUTO": ["car", "Auto", "Auto", false], "NEG-BELL": ["scissors", "Belleza", "Beauty", false],
  "NEG-FOOD": ["restaurant", "Comida", "Food", false], "NEG-HOGAR": ["wrench", "Hogar", "Home", false],
  "NEG-NOCHE": ["drink", "Noche", "Nightlife", false], "NEG-MERC": ["cart", "Mercados", "Markets", false],
  "NEG-FIESTA": ["party", "Fiestas", "Parties", false], "NEG-SALUD": ["medical", "Salud", "Health", false],
  "NEG-PRO": ["brief", "Profesionales", "Pros", false], "NEG-TIENDA": ["bag", "Tiendas", "Shops", true],
  "NEG-TRANS": ["truck", "Transporte", "Rides", true], "NEG-EDU": ["grid", "Cursos", "Courses", true],
  "NEG-NINOS": ["smile", "Niños", "Kids", true], "NEG-DEPORTE": ["bolt", "Deporte", "Sports", true],
  "NEG-FE": ["building", "Iglesias", "Churches", true], "NEG-INMUEBLE": ["key", "Casas", "Homes", true],
  "NEG-DEALER": ["car", "Autos", "Cars", true],
};
// Módulos permitidos por categoría (decisión del 3 nov, TLOnbNeg.ALLOW) + staff, eventos, nov, jobs en todas.
const ALLOW = {
  "NEG-AUTO": "svc citas cot shop renta", "NEG-BELL": "svc citas shop", "NEG-FOOD": "menu pedidos rsv cot shop",
  "NEG-HOGAR": "svc citas cot shop renta", "NEG-NOCHE": "svc rsv", "NEG-MERC": "shop pedidos",
  "NEG-FIESTA": "svc citas cot renta", "NEG-SALUD": "svc citas shop", "NEG-PRO": "svc citas cot",
  "NEG-TIENDA": "shop pedidos svc citas renta", "NEG-TRANS": "svc citas cot renta", "NEG-EDU": "svc citas shop",
  "NEG-NINOS": "svc citas shop", "NEG-DEPORTE": "svc citas shop", "NEG-FE": "svc citas", "NEG-INMUEBLE": "svc citas",
  "NEG-DEALER": "svc citas cot",
};
const MAIN = { "NEG-FOOD": "menu", "NEG-TIENDA": "shop", "NEG-MERC": "shop" };

const cats = [];
const bloques = md.split(/^## (?=\d+ — )/m).slice(1);
for (const bloque of bloques) {
  const b = bloque.split(/^## /m)[0]; // el último bloque arrastra «Reglas de la taxonomía»: se corta ahí
  const cab = b.match(/^(\d+) — (.+?) \/ (.+?)\s+`(NEG-[A-Z]+)`/);
  if (!cab) continue;
  const [, orden, en, es, id] = cab;
  const filtros = (b.match(/^Filtros: (.+)$/m)?.[1] ?? "").split("+").map((s) => s.trim()).filter(Boolean);
  const subs = [];
  for (const l of b.split("\n")) {
    const m = l.match(/^(\d+)\. (.+)$/);
    if (!m) continue;
    const txt = m[2].replace(/\s*\([^)]*\)\s*$/, "").trim();
    // «EN / ES»; si hay más de una barra (p. ej. «Bodega / corner store / Bodega de la esquina»),
    // lo último es el español y lo anterior el inglés.
    const partes = txt.split(" / ").map((s) => s.trim());
    const sEs = partes.length > 1 ? partes[partes.length - 1] : txt;
    const sEn = partes.length > 1 ? partes.slice(0, -1).join(" / ") : txt;
    subs.push({ id: `${id}-${String(m[1]).padStart(2, "0")}`, orden: Number(m[1]), es: sEs, en: sEn });
  }
  const [icono, cortoEs, cortoEn, prov] = EXTRA[id] ?? [null, es, en, true];
  const modulos = [...(ALLOW[id] ?? "").split(" ").filter(Boolean), "staff", "eventos", "nov", "jobs"];
  cats.push({ id, orden: Number(orden), es, en, corto: { es: cortoEs, en: cortoEn, provisional: prov }, icono,
    filtros, modulos, principal: MAIN[id] ?? "svc", subcategorias: subs });
}
if (cats.length !== 17) throw new Error(`se esperaban 17 categorías, salieron ${cats.length}`);

mkdirSync(join(RAIZ, "packages/taxonomy"), { recursive: true });
writeFileSync(join(RAIZ, "packages/taxonomy/categorias.json"), JSON.stringify(cats, null, 2) + "\n");

const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const j = (o) => `${q(JSON.stringify(o))}::jsonb`;
let sql = `-- 0004 · Datos del catálogo: 17 categorías y sus subcategorías.
-- GENERADO por scripts/taxonomia.mjs desde docs/diseno/plan/taxonomia-negocios.md. No editar a mano.
-- Idempotente: inserta lo nuevo y actualiza nombres; nunca borra (lo que el Super Admin apagó sigue apagado).
begin;
`;
for (const c of cats) {
  sql += `insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values (${q(c.id)}, ${c.orden}, ${j({ es: c.es, en: c.en })}, ${j({ es: c.corto.es, en: c.corto.en })}, ${q(c.icono)}, ${j(c.filtros)}, ${j(c.modulos)}, ${q(c.principal)}, ${c.corto.provisional})
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
`;
  for (const s of c.subcategorias)
    sql += `insert into subcategories (id, category_id, sort, name) values (${q(s.id)}, ${q(c.id)}, ${s.orden}, ${j({ es: s.es, en: s.en })})
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
`;
}
sql += "commit;\n";
mkdirSync(join(RAIZ, "packages/db/migrations"), { recursive: true });
writeFileSync(join(RAIZ, "packages/db/migrations/0004_catalogo_datos.sql"), sql);
console.log(`17 categorías · ${cats.reduce((a, c) => a + c.subcategorias.length, 0)} subcategorías`);
