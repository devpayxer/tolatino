const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓ ' + m); };
const t = (p, x) => p.getByText(x, { exact: true }).last();
const shot = async (p, n, full = true) => { await p.waitForTimeout(450); await p.screenshot({ path: OUT + n, fullPage: full }); };
const cuenta = async (p, url, re) => { await p.goto(B + url); await p.waitForLoadState('networkidle'); return ((await p.locator('body').innerText()).match(re) || []).length; };
(async () => {
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(a, 'admin'); await entrar(a, '5705550199');
  const v = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true })).newPage(); watch(v, 'vecino');
  await a.goto(B + '/admin/catalogo'); await a.getByText('CONTENIDO Y OFERTA', { exact: true }).waitFor(); await shot(a, 'm1-catalogo-d.png');
  // Quitar «Dominicana» → la página de categoría, la tarjeta y la ficha dejan de mostrarla; restaurar
  // 9b-1 · La ficha de la semilla (la más vieja con «Dominicana» primero), no «cualquiera»: las pruebas crean copias de negocios.
  const BID = sql("select b.id from businesses b where b.subcategory_ids[1]='NEG-FOOD-10' and status='active' order by b.created_at, b.id limit 1");
  // 9b-1 · Si una corrida anterior se cortó con «Dominicana» quitada, se restaura primero por la misma pantalla (la prueba deja todo como lo encontró).
  if (sql("select status from subcategories where category_id = 'NEG-FOOD' and name->>'es' = 'Dominicana'") === 'off') {
    await a.goto(B + '/admin/catalogo?c=NEG-FOOD'); await a.locator('text=SUBCATEGORÍAS').first().waitFor();
    await t(a, 'Restaurar').click(); await a.locator('textarea').last().fill('Una corrida anterior se cortó'); await t(a, 'Restaurar').click(); await a.locator('text=Restaurada.').waitFor();
  }
  const antes = await cuenta(v, '/c/comida', /dominicana/gi), fichaAntes = await cuenta(v, '/n/' + BID, /dominicana/gi);
  await a.goto(B + '/admin/catalogo?c=NEG-FOOD'); await a.locator('text=SUBCATEGORÍAS').first().waitFor(); await shot(a, 'm2-categoria-d.png');
  await a.getByText('Dominicana', { exact: true }).first().locator("xpath=ancestor::*[contains(normalize-space(.),'Quitar')][1]").getByText('Quitar', { exact: true }).first().click();
  // 9b-1 · Cuántos negocios tienen «Dominicana» sale de la base (antes «10» fijo: la cuenta de una base vieja).
  const NDOM = sql("select count(*) from businesses b where b.subcategory_ids @> array[(select id from subcategories where category_id = 'NEG-FOOD' and name->>'es' = 'Dominicana')] and b.status = 'active'");
  await a.locator(`text=/Afecta a ${NDOM} negocios?/`).waitFor(); console.log(`  ✓ «Quitar» avisa: afecta a ${NDOM} negocios`); await a.locator('textarea').last().fill('Prueba: se junta con Caribeña'); await t(a, 'Quitar').click(); await a.locator('text=/Quitada. Los negocios conservan su ficha./').waitFor();
  const despues = await cuenta(v, '/c/comida', /dominicana/gi), fichaDesp = await cuenta(v, '/n/' + BID, /dominicana/gi);
  ok(antes > 0 && despues === 0 && fichaDesp < fichaAntes, `«Dominicana» en /c/comida: ${antes} → ${despues} · en la ficha: ${fichaAntes} → ${fichaDesp}`);
  await a.goto(B + '/admin/catalogo?c=NEG-FOOD'); await a.locator('text=/QUITADAS · 1/').waitFor(); await shot(a, 'm3-quitada-d.png');
  await t(a, 'Restaurar').click(); await a.locator('textarea').last().fill('Fin de la prueba'); await t(a, 'Restaurar').click(); await a.locator('text=Restaurada.').waitFor();
  const rest = await cuenta(v, '/c/comida', /dominicana/gi); ok(rest === antes, `restaurada → /c/comida: ${rest}`);
  // Agregar subcategoría
  await t(a, 'Agregar subcategoría').click(); await a.locator('input').last().fill(`Pupusería ${Date.now() % 10000} / Pupuseria ${Date.now() % 10000}`); await a.locator('textarea').last().fill('La piden los vecinos'); await t(a, 'Agregar').click();
  await a.locator('text=/Agregada/').waitFor(); console.log('nueva:', sql("select id || ' ' || (name->>'es') from subcategories where name->>'es' like 'Pupusería %' order by updated_at desc limit 1"));
  // Sinónimo: agregar, Buscar lo usa (60 s de memoria), apagar
  await a.goto(B + '/admin/catalogo?tab=syn'); await t(a, 'Agregar sinónimo').click(); await a.locator('textarea').last().fill('zzrecorte → barberia'); await t(a, 'Agregar').click(); await a.locator('text=/Buscar lo entiende/').waitFor();
  await a.locator('input[aria-label="Buscar sinónimo"]').fill('zzrecorte'); await a.keyboard.press('Enter'); await a.locator('text=/zzrecorte/').first().waitFor(); await shot(a, 'm4-sinonimos-d.png');
  await v.waitForTimeout(61000); await v.goto(B + '/buscar?q=zzrecorte'); await v.waitForLoadState('networkidle'); const txt = await v.locator('body').innerText();
  ok(/barber/i.test(txt), 'Buscar «zzrecorte» encuentra barberías (el sinónimo, en menos de un minuto)');
  await a.getByText('Apagar', { exact: true }).first().click(); await a.locator('text=/Apagado. Buscar deja de usarlo/').waitFor();
  // Sin oferta (local: un aviso de prueba)
  const U = sql("select id from users where phone='+15705550133'"); sql(`insert into search_alerts (user_id, city_id, query, filters) values ('${U}', 'hzl', 'Tamales oaxaqueños', jsonb_build_object('cat','NEG-FOOD'))`);
  await a.goto(B + '/admin/catalogo?tab=nosup'); await a.locator('text=/MÁS BUSCADO SIN OFERTA/').waitFor(); await shot(a, 'm5-sinoferta-d.png');
  // Filtros: apagar «Delivery» → deja de salir en la página; encender todos
  let dAntes = await cuenta(v, '/c/comida', /\bDelivery\b/g);
  await a.goto(B + '/admin/catalogo?f=NEG-FOOD'); await a.getByText('FILTROS DE LA CATEGORÍA', { exact: true }).waitFor();
  // Si una corrida anterior se cortó con un filtro apagado, se empieza con todos encendidos.
  if (sql("select count(*) from filter_options where category_id = 'NEG-FOOD' and not active") !== '0') { await a.getByText('Encender todos', { exact: true }).first().click(); await a.locator('text=Todos salen en la página.').waitFor(); await a.reload(); await a.getByText('FILTROS DE LA CATEGORÍA', { exact: true }).waitFor(); dAntes = await cuenta(v, '/c/comida', /\bDelivery\b/g); }
  await a.getByText('Delivery', { exact: true }).first().locator("xpath=ancestor::*[.//*[@role='switch']][1]").getByRole('switch').first().click();
  await a.locator('text=/Apagado: ya no sale en la página/').waitFor(); await shot(a, 'm6-filtros-d.png');
  const dDesp = await cuenta(v, '/c/comida', /\bDelivery\b/g); ok(dDesp < dAntes, `«Delivery» apagado deja de salir en /c/comida: ${dAntes} → ${dDesp}`);
  // 9b-1 · «Encender todos» es el botón (el primero): el HISTORIAL RECIENTE de abajo también dice «Encender todos» desde la segunda corrida.
  await a.getByText('Encender todos', { exact: true }).first().click(); await a.locator('text=Todos salen en la página.').waitFor();
  ok(sql("select count(*) from filter_options where category_id = 'NEG-FOOD' and not active") === '0', 'Encender todos: todos los filtros de Comida salen otra vez');
  await a.goto(B + '/admin/catalogo?tab=mod'); await a.locator('text=QUÉ VE FREE Y QUÉ VE PRO').waitFor(); await shot(a, 'm7-modulos-d.png');
  const m = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true })).newPage(); watch(m, 'admin-m'); await entrar(m, '5705550199');
  await m.goto(B + '/admin/catalogo'); await m.getByText('CONTENIDO Y OFERTA', { exact: true }).waitFor(); await shot(m, 'm8-catalogo-m.png', false);
  ok(!err.length, 'sin errores en la página: ' + (err.join(' · ') || 'ninguno')); await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
