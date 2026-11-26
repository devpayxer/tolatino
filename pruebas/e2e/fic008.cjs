// C-008 · Menú con fotos y botón + (menú «C» del canvas) en Comida, Mercado y Tienda de la ficha nueva (Pro), teléfono y computadora.
// Comida: cada plato en su tarjeta con foto y +. Mercado: tarjetas con foto y +; el + agrega directo lo que va por unidad y la barra de abajo pasa a la
// barra negra «Ver pedido · 1 producto», que lleva a «Tu pedido» del mercado (la lógica de siempre). Tienda: el + aparta directo lo que no tiene talla
// y la barra negra «Ver lo que apartas · 1 artículo» lleva al apartado de siempre. «Lo más pedido» sale de lo pedido de verdad (no de la lista).
// Precondición propia: un mercado Pro que toma pedidos con un producto por unidad sin opciones, la tienda Boutique Yaritza con la Cartera a la venta,
// y los carritos del navegador vacíos (cada contexto empieza limpio).
const ENT = require('../lib/entorno.cjs');
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const { abiertoTodoElDia } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 250)); } return false; };
const COMIDA = 'sabor-dominicano', TIENDA = 'boutique-yaritza';

(async () => {
  const MERC = sql(`select b.id from businesses b join business_stats_cache s on s.business_id = b.id where s.plan = 'pro' and b.category_id = 'NEG-MERC' and b.status = 'active'
    and 'pedidos' = any(b.modules_on) and exists (select 1 from items i where i.business_id = b.id and i.module = 'shop' and i.status = 'live' and i.removed_at is null and i.sell
    and not i.in_store_only and i.age_min = 0 and coalesce(i.shop_kind, 'unid') = 'unid' and not exists (select 1 from option_groups g where g.id = any(i.group_ids) and g.required and g.removed_at is null))
    order by b.id limit 1`);
  ok(!!MERC && sql(`select s.plan from business_stats_cache s where s.business_id = '${TIENDA}'`) === 'pro', `precondición: mercado Pro con pedidos (${MERC}) y ${TIENDA} Pro`);
  ok(sql(`select count(*) from items where business_id = '${TIENDA}' and module = 'shop' and name->>'es' = 'Cartera' and status = 'live' and removed_at is null and (stock_mode = 'none' or stock_left > 0)`) === '1', 'precondición: la Cartera a la venta');
  // Precondición propia: Sabor Dominicano abierto mientras corre (la semilla cierra a las 9 PM y, cerrado, el menú no lleva «+»). Vuelve a su horario al terminar.
  const volver = abiertoTodoElDia(COMIDA);
  // 26 nov · La oferta de la semilla se termina un momento (y la propia se quita): ambas cosas vuelven en el finally, también si la prueba cae a medias.
  let propia = null, finOrig = '';
  const devolverOferta = () => { if (propia) sql(`update business_posts set status = 'removed' where id = ${propia}`); for (const x of finOrig.split(';').filter(Boolean)) { const [oid, fin] = x.split('='); sql(`update business_posts set ends_at = ${fin ? `'${fin}'` : 'null'} where id = ${oid}`); } };
  const b = await chromium.launch(); const abiertas = [];
  try {
    const cm = await b.newContext({ ...devices['iPhone 13'] }), cd = await b.newContext({ viewport: { width: 1360, height: 900 } }); abiertas.push(cm, cd);
    const m = await cm.newPage(), d = await cd.newPage(); const err = [];
    for (const p of [m, d]) p.on('pageerror', (e) => err.push(e.message));

    console.log('1 · Comida: cada plato en su tarjeta con foto y +');
    await m.goto(B + `/n/${COMIDA}?tab=menu`); await m.locator('[data-screen-label="Ficha · menú"]').waitFor();
    ok(await espera(async () => (await m.locator('[data-screen-label="Ficha · menú"]').getByRole('button', { name: /^Agregar|^Cantidad/ }).count()) > 2), 'teléfono: los platos con su botón +');
    await m.screenshot({ path: OUT + 'fic008-comida-390.png' });

    console.log('1b · Precio de antes tachado: solo cuando una oferta en vivo (Novedades) baja el plato, y es el precio de siempre del menú');
    const MOF = sql(`select id from items where business_id = '${COMIDA}' and name->>'es' = 'Mofongo de chicharrón' and removed_at is null and status = 'live' limit 1`);
    const BASE = +sql(`select price_cents from items where id = ${MOF}`);
    // Precondición propia: una oferta en vivo para todos a $10 (la semilla trae una; si venció o se quitó, la prueba pone la suya y la quita al final).
    if (sql(`select coalesce(oferta_precio(${MOF}, null)::text, '')`) !== '1000') {
      propia = sql(`insert into business_posts (business_id, city_id, kind, title, body, link_kind, item_id, price_was_cents, price_now_cents, audience, publish_at, created_at)
        values ('${COMIDA}', 'hzl', 'oferta', 'Mofongo a $10 (prueba fic008)', 'Prueba.', 'item', ${MOF}, ${BASE}, 1000, 'all', now(), now()) returning id`).split('\n')[0];
    }
    ok(sql(`select oferta_precio(${MOF}, null)`) === '1000' && BASE > 1000, `precondición: el mofongo en oferta a $10.00 (en el menú, ${require('../lib/usd.cjs')(BASE)})`);
    await m.reload(); await m.locator('[data-screen-label="Ficha · menú"]').waitFor();
    const antes = m.locator('[data-precio-antes]');
    ok(await espera(async () => (await antes.count()) > 0), 'el plato en oferta muestra el precio de antes');
    const txts = await antes.allInnerTexts();
    ok(txts.every((x) => x === require("../lib/usd.cjs")(BASE)), `el de antes es el precio de siempre del menú, nunca otro número (${[...new Set(txts)].join(', ')})`);
    ok(await antes.first().evaluate((el) => getComputedStyle(el.parentElement).textDecorationLine.includes('line-through')), 'va tachado');
    ok(await antes.first().evaluate((el) => (el.previousElementSibling?.textContent ?? '') === 'Antes '), 'el lector de pantalla oye «Antes»');
    ok((await m.locator('[data-screen-label="Ficha · menú"]').getByText('$10', { exact: true }).count()) > 0, 'y el precio que se cobra es el de la oferta ($10)');
    await m.screenshot({ path: OUT + 'fic008-comida-oferta-390.png' });
    if (propia) { sql(`update business_posts set status = 'removed' where id = ${propia}`); propia = null; }
    else {
      // Sin oferta en vivo, ni rastro del tachado: la de la semilla se termina un momento y se vuelve a abrir.
      const sem = sql(`select string_agg(id::text, ',') from business_posts where item_id = ${MOF} and kind = 'oferta' and status = 'live' and (ends_at is null or ends_at > now())`);
      finOrig = sql(`select string_agg(id || '=' || coalesce(ends_at::text, ''), ';') from business_posts where id in (${sem})`);
      sql(`update business_posts set ends_at = now() - interval '1 second' where id in (${sem})`);
      await m.reload(); await m.locator('[data-screen-label="Ficha · menú"]').getByText('Mofongo de chicharrón').first().waitFor();
      ok((await antes.count()) === 0, 'sin oferta en vivo no hay precio tachado');
      devolverOferta(); finOrig = '';
    }

    console.log('2 · Mercado: + directo y la barra negra «Ver pedido»');
    await m.goto(B + `/n/${MERC}?tab=svc`); const menu = m.locator('[data-menu="c"]'); await menu.waitFor();
    const uno = sql(`select name->>'es' from items i where i.business_id = '${MERC}' and i.module = 'shop' and i.status = 'live' and i.removed_at is null and i.sell and not i.in_store_only
      and i.age_min = 0 and coalesce(i.shop_kind, 'unid') = 'unid' and not exists (select 1 from option_groups g where g.id = any(i.group_ids) and g.required and g.removed_at is null) order by i.sort, i.id limit 1`);
    const fila = menu.locator(':scope > div > div > div').filter({ hasText: uno }).first();
    await fila.getByRole('button', { name: 'Agregar' }).click();
    const barra = m.locator('[data-screen-label="Ficha · ver pedido del mercado"]');
    ok(await espera(async () => /Ver pedido · 1 producto/.test(await barra.innerText())), `+ en «${uno}»: la barra negra «Ver pedido · 1 producto»`);
    await m.screenshot({ path: OUT + 'fic008-mercado-390.png' });
    await barra.getByRole('button').first().click(); await m.waitForURL(new RegExp(`/n/${MERC}/mercado`));
    ok(true, '«Ver pedido» lleva a Tu pedido del mercado');

    console.log('3 · Tienda: + aparta directo y «Ver lo que apartas»');
    await m.goto(B + `/n/${TIENDA}?tab=shop`); await m.locator('[data-menu="c"]').waitFor();
    await m.locator('[data-menu="c"] > div').filter({ hasText: 'Cartera' }).getByRole('button', { name: 'Agregar' }).click();
    const bt = m.locator('[data-screen-label="Tienda · ver lo que apartas"]');
    ok(await espera(async () => /Ver lo que apartas · 1 artículo/.test(await bt.innerText())), '+ en la Cartera: «Ver lo que apartas · 1 artículo»');
    await m.screenshot({ path: OUT + 'fic008-tienda-390.png' });
    await bt.getByRole('button').first().click(); await m.waitForURL(new RegExp(`/n/${TIENDA}/apartar`));
    ok(true, '«Ver lo que apartas» lleva al apartado de siempre');

    console.log('4 · Computadora: el mismo menú en tarjetas');
    await d.goto(B + `/n/${TIENDA}`); await d.locator('#sec-cat [data-menu="c"]').waitFor();
    ok(await d.locator('#sec-cat [data-menu="c"] > div').count() >= 3, 'tienda: los artículos en tarjetas en la sección');
    await d.goto(B + `/n/${MERC}`); await d.locator('#sec-cat [data-menu="c"]').waitFor();
    ok(await d.locator('[data-screen-label="Ficha · ver pedido del mercado"]').count() === 0, 'mercado: sin barra negra en la computadora (la tarjeta de la derecha)');
    await d.screenshot({ path: OUT + 'fic008-mercado-1360.png' });
    ok(err.length === 0, `sin errores en la página${err.length ? ': ' + err.join(' | ') : ''}`);
    console.log(`\n${n} ✓ · fic008`);
  } finally {
    try { volver(); } catch (e) { console.error('horario', e.message); }
    try { devolverOferta(); } catch (e) { console.error('oferta', e.message); }
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
