// Prueba al revés de los guardianes del Catálogo completo (LAUNCH L214, 18 nov; moduloPorCiudad con Cotizaciones y Staff: LAUNCH «Cotizaciones y Staff por ciudad», 18 nov): catalogoCompleto (el código de una subcategoría no cambia, nada se
// borra, la fusión deja su puntero, cada edición dice a cuántos negocios afecta), categoriaPorCiudad (una categoría apagada en la ciudad no se ofrece
// en la categoría, Negocios, el mapa, Buscar ni Publica), moduloPorCiudad (la pausa de la ciudad usa modules_off con su marca, la reciben los
// negocios nuevos, encender no quita la pausa propia), plantillasDePublica (Publica lee la plantilla de horario y los ejemplos del Catálogo, también
// al publicar) y limitesDelPlan (ningún límite Free/Pro escrito en el código). Se inyecta el defecto, el guardián debe fallar con SU mensaje
// ([nombre]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const W = 'apps/web/', AC = W + 'app/admin/acciones-catalogo.ts', UI = W + 'app/admin/Catalogo.tsx', MIG = 'packages/db/migrations/0179_catalogo_completo.sql';
const CA = W + 'lib/categoria.ts', DI = W + 'lib/directorio.ts', BU = W + 'lib/buscar.ts', MA = W + 'lib/mapa.ts', LC = W + 'lib/admin-catalogo.ts', NE = W + 'app/admin/acciones-negocios.ts';
const PU = W + 'app/(app)/publica/', CS = W + 'app/(app)/c/[slug]/page.tsx', NP = W + 'app/(app)/negocios/page.tsx';
const casos = [
  // ── catalogoCompleto ──
  // mover cambia el código de la subcategoría
  ['catalogoCompleto', AC, "`update subcategories set category_id = $2, sort", "`update subcategories set id = $1 || '-m', category_id = $2, sort"],
  // «Agregar» numera solo con las que siguen en la categoría (repetiría el código de una movida)
  ['catalogoCompleto', AC, "from subcategories where id like $1 || '-%'", "from subcategories where category_id = $1"],
  // una acción borra filas
  ['catalogoCompleto', AC, 'const listo = () => {', 'const limpiar = () => tx((c) => c.query(`delete from synonyms where not active`));\nconst listo = () => {'],
  // la fusión deja la subcategoría apagada sin puntero
  ['catalogoCompleto', MIG, "set status = 'merged', merged_into = b,", "set status = 'off',"],
  // la confirmación de fusionar no dice a cuántos negocios afecta
  ['catalogoCompleto', UI, 'Afecta a ${s.n} ${s.n === 1 ? "negocio" : "negocios"}: pasan a la que elijas', 'Pasan a la que elijas'],
  // apagar en una ciudad no dice a cuántos negocios afecta
  ['catalogoCompleto', UI, 'sub: E(`Afecta a ${cuenta} en ${x.name}: ${efecto.es}`', 'sub: E(`${efecto.es}`'],
  // ── categoriaPorCiudad ──
  ['categoriaPorCiudad', CA, "where b.city_id = $1 and b.status = 'active' and ${CAT_EN_CIUDAD(\"b\")}\n               and ${DENTRO", "where b.city_id = $1 and b.status = 'active'\n               and ${DENTRO"],
  ['categoriaPorCiudad', CA, "where b.city_id = $1 and b.status = 'active' and ${CAT_EN_CIUDAD(\"b\")} and ${DENTRO(\"c.default_radius\")} group by", "where b.city_id = $1 and b.status = 'active' and ${DENTRO(\"c.default_radius\")} group by"],
  ['categoriaPorCiudad', MA, "where b.city_id = $1 and b.status = 'active' and ${CAT_EN_CIUDAD(\"b\")} and b.geo is not null", "where b.city_id = $1 and b.status = 'active' and b.geo is not null"],
  ['categoriaPorCiudad', DI, "where status = 'on' and ($2::text is null or not ($2 = any(off_cities))) order by sort", "where status = 'on' order by sort"],
  ['categoriaPorCiudad', NP, 'categorias(lang, loc.ciudad), conteos(loc)', 'categorias(lang), conteos(loc)'],
  ['categoriaPorCiudad', BU, 'join categories c on c.id = s.category_id and not ($1 = any(c.off_cities))', 'join categories c on c.id = s.category_id'],
  ['categoriaPorCiudad', CS, '  if (!(await categoriaActivaEn(c.id, loc.ciudad))) notFound();\n', ''],
  ['categoriaPorCiudad', PU + 'acciones.ts', '  if (d.cat && !kc?.ok) return no(', '  if (false) return no('],
  ['categoriaPorCiudad', PU + 'PasosBC.tsx', 'TILES.filter((t) => !off.includes(t[0])).map(', 'TILES.map('],
  // ── moduloPorCiudad ──
  ['moduloPorCiudad', MIG, 'create trigger businesses_modulos_ciudad before insert or update of city_id on businesses', 'create trigger businesses_modulos_ciudad before update of city_id on businesses'],
  ['moduloPorCiudad', MIG, "modules_off - modulo where city_id = ciudad and modules_off->modulo->>'ciudad' = 'true'", 'modules_off - modulo where city_id = ciudad'],
  // una clave sin lector entra a MODULOS_POR_CIUDAD (apagarla no apagaría nada)
  ['moduloPorCiudad', LC, 'export const MODULOS_POR_CIUDAD = ["menu", ', 'export const MODULOS_POR_CIUDAD = ["cupones", "menu", '],
  // 18 nov · Cotizaciones y Staff: salen de la lista, o pierden su lector en el servidor y en la página
  ['moduloPorCiudad', LC, '"citas", "cot", "shop"', '"citas", "shop"'],
  ['moduloPorCiudad', LC, '"renta", "staff", "eventos"', '"renta", "eventos"'],
  ['moduloPorCiudad', W + 'lib/solicitudes.ts', '    if (s.pausa) return no(PAUSA_COT.es, PAUSA_COT.en);\n', ''],
  ['moduloPorCiudad', W + 'lib/solicitudes.ts', "and not (coalesce(b.modules_off, '{}'::jsonb) ? 'cot') and (b.id = $1", 'and (b.id = $1'],
  ['moduloPorCiudad', W + 'lib/viajes.ts', 'if (s.k === "cotiza" && x.off.cot) { await c.query("rollback"); return no(PAUSA_COT.es, PAUSA_COT.en); }', ''],
  ['moduloPorCiudad', W + 'lib/fiestas-reservas.ts', 'if (s.k === "cotiza" && x.off.cot) { await c.query("rollback"); return no(PAUSA_COT.es, PAUSA_COT.en); }', ''],
  ['moduloPorCiudad', W + 'lib/oficios-publico.ts', 'cotOff: enPausa(off, "cot"),', 'cotOff: false,'],
  ['moduloPorCiudad', W + 'app/(app)/n/[id]/preestimado/page.tsx', '!op.can || op.cotOff ||', '!op.can ||'],
  ['moduloPorCiudad', W + 'app/(app)/n/[id]/Oficios.tsx', 's.k === "pres" && op.can && !op.cotOff', 's.k === "pres" && op.can'],
  ['moduloPorCiudad', W + 'app/(app)/n/[id]/Viaje.tsx', 'const enApp = tp.booking && !(cot && tp.cotOff);', 'const enApp = tp.booking;'],
  ['moduloPorCiudad', W + 'lib/ficha.ts', "and (x.staff_hidden or coalesce(x.modules_off, '{}'::jsonb) ? 'staff'))", 'and x.staff_hidden)'],
  ['moduloPorCiudad', W + 'app/(app)/n/[id]/FichaNueva.tsx', 'const verEquipo = f.equipoOff ? [] : gente;', 'const verEquipo = gente;'],
  ['moduloPorCiudad', NE, '"eventos", "cot", "staff"].includes(modulo)', '"eventos"].includes(modulo)'],
  ['moduloPorCiudad', NE, '    if (!pausar && cur[modulo]?.ciudad === true) return', '    if (false) return'],
  // ── plantillasDePublica ──
  ['plantillasDePublica', PU + 'logica.ts', 'export const daysOf = (d: Borrador): Dia[] => d.days || (d.cat ? horasDe(d.cat, d.own)', 'export const daysOf = (d: Borrador): Dia[] => d.days || (d.cat ? Fl.hours(d.cat, d.own)'],
  ['plantillasDePublica', PU + 'PasosDE.tsx', 'horasDe(d.cat ?? "", d.own)', 'Fl.hours(d.cat, d.own)'],
  ['plantillasDePublica', PU + 'PasosBC.tsx', 'placeholder={phDe(d.cat, "ph_nombre", es, ["Ej.: Barbería Don Fello", "E.g. Barbería Don Fello"])}', 'placeholder={E2("Ej.: Barbería Don Fello", "E.g. Barbería Don Fello")}'],
  ['plantillasDePublica', PU + 'acciones.ts', '  if (!Array.isArray(d.days) && d.cat && d.cat !== "NEG-FE") d.days = plantillaHoras(kc?.h) ?? null;\n', ''],
  // ── limitesDelPlan ──
  ['limitesDelPlan', W + 'lib/plan.ts', 'export const PRUEBA_DIAS = 30;', 'export const PRUEBA_DIAS = 30;\nexport const ITEMS_FREE = 5;'],
  ['limitesDelPlan', W + 'lib/pedir.ts', '.slice(0, F.itemsFree)', '.slice(0, 5)'],
  ['limitesDelPlan', W + 'lib/ficha.ts', 'order by sort limit ${b.plan === "pro" ? cfgSql("pro_fotos") : cfgSql("free_fotos")}`, [id]),', 'order by sort limit $2`, [id, b.plan === "pro" ? 60 : 3]),'],
  ['limitesDelPlan', PU + 'PasosFH.tsx', 'FI = LIM.items,', 'FI = X.FREE_ITEMS || 5,'],
  ['limitesDelPlan', W + 'app/panel/Servicios.tsx', 'Con Free se ven ${c.d.itemsFree} en la página', 'Con Free se ven 5 en la página'],
  ['limitesDelPlan', AC, 'if (!s || s.role !== "admin" || !s.puede("cat", "editar")) return no("Solo un Admin cambia los límites del plan.");', 'if (!s || !s.puede("cat", "editar")) return no("Solo un Admin cambia los límites del plan.");'],
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
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
