// Prueba al revés del guardián de 9t «Platos guardados» (platos, productos de Mercados y artículos de Tiendas): platosGuardadosSinBorrar. Se inyecta el defecto, el guardián debe fallar con su mensaje; se
// restaura. «crear»: se crea el archivo, se corre y se borra. «quitar»: el archivo sale un momento del repo y vuelve.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), os = require('os'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0193_platos_guardados.sql', L = 'apps/web/lib/platos-guardados.ts', A = 'apps/web/app/(app)/n/[id]/acciones-platos.ts',
  CO = 'apps/web/app/(app)/n/[id]/Corazon.tsx', MC = 'apps/web/app/(app)/n/[id]/MenuCliente.tsx', ME = 'apps/web/app/(app)/n/[id]/Mercado.tsx', TI = 'apps/web/app/(app)/n/[id]/Tienda.tsx',
  GU = 'apps/web/app/(app)/cuenta/guardados/Guardados.tsx', PE = 'apps/web/lib/pedir.ts', MP = 'apps/web/lib/merc-publico.ts', AP = 'apps/web/lib/apartados.ts', PG = 'apps/web/app/(app)/n/[id]/page.tsx',
  MJ = 'packages/db/mapa-de-datos.json', E = 'pruebas/e2e/plat9t.cjs';
const G = 'platosGuardadosSinBorrar';
// El texto de borrar se arma aquí para que este archivo no sea, él mismo, un «delete» que el guardián caza.
const BORRA = 'delete ' + 'from item_saves';
const casos = [
  // La base: una fila viva por persona y plato; no se borra; una fila quitada no vuelve.
  [G, M, 'create unique index if not exists item_saves_viva on item_saves (user_id, item_id) where removed_at is null;', 'create index if not exists item_saves_viva on item_saves (user_id, item_id) where removed_at is null;'],
  [G, M, "    raise exception 'item_saves no se borra: quitar de guardados pone removed_at';\n", '    return old;\n'],
  [G, M, "  if old.removed_at is not null and new.removed_at is distinct from old.removed_at then\n", '  if false then\n'],
  // Guardar y quitar.
  [G, L, "    await c.query(`select pg_advisory_xact_lock(hashtext('item_save:' || $1::text || ':' || $2::text))`, [userId, itemId]);\n", ''],
  [G, L, 'update item_saves set removed_at = now() where user_id = $1::uuid and item_id = $2::bigint and removed_at is null', `${BORRA} where user_id = $1::uuid and item_id = $2::bigint and removed_at is null`],
  [G, L, 'update item_saves set removed_at = now() where user_id = $1::uuid and item_id = $2::bigint and removed_at is null', 'update item_saves set removed_at = now() where item_id = $2::bigint and removed_at is null'],
  [G, L, 'where i.id = $1::bigint and ${EN_SU_PAGINA}`, [itemId]);', 'where i.id = $1::bigint`, [itemId]);'],
  [G, L, "insert into item_saves (user_id, item_id, city_id) values ($1::uuid, $2::bigint, $3::text)", "insert into item_saves (user_id, item_id, city_id) values ($1::uuid, $2::bigint, 'hazleton')"],
  // Cada módulo con la regla de su ficha.
  [G, L, "const EN_SU_PAGINA = `((${PLATO_EN_SU_PAGINA}) or (${PRODUCTO_EN_SU_PAGINA}) or (${ARTICULO_EN_SU_PAGINA}))`;", "const EN_SU_PAGINA = `((${PLATO_EN_SU_PAGINA}) or i.module = 'shop')`;"],
  [G, L, " and not (coalesce(b.modules_off, '{}'::jsonb) ? 'menu')\n  and ${PLATO_VIVO", "\n  and ${PLATO_VIVO"],
  [G, L, '  and ${PLATO_VIVO("i")} and s.id is not null and ${SECCION_MENU_VISIBLE("s")}\n', '  and ${PLATO_VIVO("i")}\n'],
  [G, L, ') < ${cfgSql("free_items")})`;', ') < 9999)`;'],
  [G, L, "b.category_id = 'NEG-MERC' and not (coalesce(b.modules_off, '{}'::jsonb) ? 'menu') and ${PRODUCTO_MERCADO_VIVO(\"i\")}", "b.category_id = 'NEG-MERC' and i.module = 'shop'"],
  [G, L, "and not (coalesce(b.modules_off, '{}'::jsonb) ? 'shop')\n  and ${ARTICULO_TIENDA_VIVO(\"i\")}", "\n  and i.module = 'shop' and i.removed_at is null"],
  [G, MP, 'where i.business_id = $1 and ${PRODUCTO_MERCADO_VIVO("i")} order by', "where i.business_id = $1 and i.module = 'shop' and i.removed_at is null order by"],
  [G, AP, 'where i.business_id = $1 and ${ARTICULO_TIENDA_VIVO("i")} and b.status', "where i.business_id = $1 and i.module = 'shop' and i.removed_at is null and b.status"],
  // La lista.
  [G, L, 'coalesce(${EN_SU_PAGINA}, false) as disponible', 'true as disponible'],
  [G, L, '      where g.user_id = $1::uuid and g.removed_at is null\n', '      where g.user_id = $1::uuid\n'],
  [G, L, '      order by g.created_at desc, g.id desc limit 100`', '      order by g.created_at desc, g.id desc`'],
  [G, GU, '...(x.disponible ? { v: precio(x) } : { tag: [E2("NO DISPONIBLE", "NOT AVAILABLE"), "neutral"]', '...(true ? { v: precio(x) } : { tag: [E2("NO DISPONIBLE", "NOT AVAILABLE"), "neutral"]'],
  [G, GU, ': x.disponible ? [[accion(x), "primary"', ': true ? [[accion(x), "primary"'],
  [G, GU, 'const precio = (x: PG) => `${money(x.cents)}${x.peso ? "/lb" : ""}`;', 'const precio = (x: PG) => money(x.cents);'],
  [G, GU, '["items", E2("Platos y productos", "Dishes & products"), d.platos.length], ', ''],
  // La acción.
  [G, A, '{ const q = await quien(); return q.e ?? guardarPlato(q.u.id, String(item ?? "")); }', '{ const u = await yo(); return guardarPlato(u!.id, String(item ?? "")); }'],
  [G, A, '  if (!(await mismoOrigen())) return { e: { ok: false as const, msg: NO_ORIGEN } };\n', ''],
  // El corazón: una pieza, con su estado y la vuelta.
  [G, CO, 'aria-label={etiqueta} aria-pressed={guardado} onClick={onClick}', 'aria-label={etiqueta} onClick={onClick}'],
  [G, CO, '    if (!sesion) { router.push(`/entrar?volver=${encodeURIComponent(volver(id))}`); return null; }\n', ''],
  [G, MC, '<CorazonGuardar etiqueta={E2("Guardar plato", "Save dish")} guardado={sh.saved}', '<CorazonGuardar etiqueta="Guardar plato" guardado={sh.saved}'],
  [G, MC, 'useGuardados(m?.guardados, opts.sesion, (id) => `/n/${biz}?${m?.negocio.pro ? "tab=menu&" : ""}plato=${id}`, es)', 'useGuardados(m?.guardados, opts.sesion, () => `/n/${biz}`, es)'],
  [G, ME, '          <CorazonGuardar etiqueta={E2("Guardar producto", "Save product")} guardado={v.guardado(p.id)} onClick={() => v.guardar(p.id)} />\n', ''],
  [G, ME, 'useGuardados(mp?.guardados, sesion, (id) => `/n/${mp?.negocio.id ?? ""}?tab=svc&producto=${id}`, es)', 'useGuardados(mp?.guardados, sesion, () => `/n/${mp?.negocio.id ?? ""}`, es)'],
  [G, ME, '          <CorazonGuardar etiqueta={E2("Guardar producto", "Save product")} guardado={v.guardado(p.id)} onClick={() => v.guardar(p.id)} />\n', '          <button type="button" aria-label="Guardar" aria-pressed={v.guardado(p.id)} onClick={() => v.guardar(p.id)}>G</button>\n'],
  [G, TI, '                <CorazonGuardar etiqueta={E2("Guardar producto", "Save product")} guardado={gd.guardado(hoja.id)} onClick={() => guardar(hoja.id)} />\n', ''],
  [G, TI, 'useGuardados(guardados, sesion, (id) => `/n/${negocio}?tab=shop&producto=${id}`, es)', 'useGuardados(guardados, sesion, () => `/n/${negocio}`, es)'],
  [G, TI, '                <CorazonGuardar etiqueta={E2("Guardar producto", "Save product")} guardado={gd.guardado(hoja.id)} onClick={() => guardar(hoja.id)} />\n', '                <CorazonGuardar etiqueta={E2("Guardar producto", "Save product")} guardado={gd.guardado(hoja.id)} onClick={() => { void platoGuardar(hoja.id); }} />\n'],
  // Una consulta por ficha.
  [G, PE, ', platosGuardadosDe(userId ?? null, negocio)]);', ']);'],
  [G, MP, '    platosGuardadosDe(userId, negocio), // 9t', '    Promise.resolve([] as string[]), // 9t'],
  [G, PG, ', platosGuardadosDe(u?.id ?? null, f.id)]).then(async ([L, V, mia, horas, plan, g])', ', Promise.resolve([] as string[])]).then(async ([L, V, mia, horas, plan, g])'],
  // El archivo y la purga.
  [G, MJ, '"item_saves": { "reglas": [ { "col": "user_id", "accion": "borrar", "exporta": "platos_guardados", "fusion": "mover" } ] }', '"item_saves": { "reglas": [ { "col": "user_id", "accion": "borrar", "fusion": "mover" } ] }'],
  // La prueba de punta a punta cubre un mercado y una tienda.
  [G, E, "const MERC = 'supermercado-la-cosecha', TIEN = 'boutique-yaritza';", "const MERC = 'otro', TIEN = 'otra';"],
];
const crear = [
  [G, 'apps/web/lib/quitar-platos9t.ts', `import "server-only";\nexport const QUITAR = \`${BORRA} where user_id = $1::uuid\`;\n`],
  [G, 'pruebas/e2e/limpiar9tplatos.cjs', `// limpia\nconst q = "${BORRA} where user_id = 'x'";\nmodule.exports = { q };\n`],
];
const quitar = [[G, E]];
let bien = 0, total = 0;
// Cuenta solo si el guardián FALLÓ con su propio mensaje («[guardián] archivo — …»); un guardián que se cae (excepción) no cuenta como cazado.
const correr = (g) => { try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; } catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)); return [!!l, l || ('SE CAYÓ: ' + String(e.stderr).split('\n').find((x) => /Error/.test(x)))]; } };
for (const [g, f, a, b] of casos) {
  total++;
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  const [falla, out] = correr(g); fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
for (const [g, f, c] of crear) {
  total++;
  const ruta = `${R}/${f}`;
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, c);
  const [falla, out] = correr(g);
  fs.unlinkSync(ruta);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (crear ${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
for (const [g, f] of quitar) {
  total++;
  const ruta = `${R}/${f}`, fuera = path.join(os.tmpdir(), `alreves9tplatos-${process.pid}-${path.basename(f)}`);
  fs.renameSync(ruta, fuera);
  let falla = false, out = '';
  try { [falla, out] = correr(g); } finally { fs.renameSync(fuera, ruta); }
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (quitar ${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
console.log(`\n${bien}/${total} al revés`);
require('../lib/alreves-fin.cjs')(R, { heredar: true });
// 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo.
if (bien !== total) process.exit(1);
