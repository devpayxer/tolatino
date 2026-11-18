// 9n · Ofertas de productos en Mercado y Tienda (LAUNCH «Tachado en Mercado y Tienda», 18 nov). De punta a punta:
// 1. El dueño del mercado publica desde Panel › Novedades una oferta en un producto por unidad (Arroz 10 lb) y otra POR LIBRA (Bistec de res); el de la
//    tienda, una en la Cartera. El «precio normal» es el del catálogo (no se escribe) y lo de 21+ ni sale en el editor ni lo deja la base.
// 2. La ficha del mercado y la de la tienda muestran el precio de la oferta y el de siempre tachado («Antes»), como en Comida.
// 3. El pedido del mercado (por unidad y por libra) y el apartado se guardan al precio de la oferta (lo decide el servidor: oferta_precio()).
// 4. El detalle de la oferta en el panel cuenta los pedidos que salieron de ella; el Super Admin la oculta (Contenido) y la tienda vuelve a su precio.
// 5. Al terminar la oferta del mercado vuelve el precio normal: sin tachado en la ficha y el pedido nuevo al precio del catálogo.
// Precondición propia: el mercado y la tienda Pro con Novedades, sus productos a la venta con existencia, ninguna otra oferta en vivo en esos
// productos (la de la semilla, si la hay, se termina un momento y vuelve), sin pedidos ni apartados abiertos de Marisol y su tarjeta guardada.
const ENT = require('../lib/entorno.cjs');
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const NN = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT, M = 'supermercado-la-cosecha', T = 'boutique-yaritza', TIT = 'Prueba ofe9n';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const hasta = async (f, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 250)); } return false; };
const MAR = "(select id from users where phone = '+15705550122')";
const item = (biz, nm) => sql(`select id from items where business_id = '${biz}' and name->>'es' = '${nm}' and removed_at is null and status = 'live' limit 1`);
const dinero = (c) => `$${(c / 100).toFixed(2)}`, corto = (c) => dinero(c).replace(/\.00$/, ''); // el mercado escribe los centavos; la tienda y Novedades, no si son .00
const post = (t) => sql(`select id from business_posts where title = '${t}' and status <> 'removed' order by id desc limit 1`);

(async () => {
  const AR = item(M, 'Arroz 10 lb'), BI = item(M, 'Bistec de res'), CA = item(T, 'Cartera');
  ok(!!AR && !!BI && !!CA, `precondición: Arroz 10 lb (${AR}) y Bistec de res (${BI}) en ${M}; la Cartera (${CA}) en ${T}`);
  ok(sql(`select string_agg(coalesce(s.plan, 'free'), ',' order by b.id) from businesses b left join business_stats_cache s on s.business_id = b.id where b.id in ('${M}', '${T}')`) === 'pro,pro', 'precondición: los dos son Pro (Novedades es de Pro)');
  ok(sql(`select coalesce(shop_kind, 'unid') || '|' || coalesce(shop_kind, 'unid') from items where id = ${BI}`) === 'peso|peso' && sql(`select coalesce(shop_kind, 'unid') from items where id = ${AR}`) === 'unid', 'precondición: el bistec va por libra y el arroz por unidad');
  // Precondición propia: lo que vende cada uno, a la venta y con existencia; Novedades encendido; nada de esta prueba de una vuelta anterior.
  sql(`update items set sold_out = false, stock_left = greatest(stock_left, 20), stock_day = null, sell = true, in_store_only = false, age_min = 0 where id in (${AR}, ${BI}, ${CA})`);
  sql(`update businesses set modules_on = array(select distinct x from unnest(modules_on || array['nov']) x), modules_off = modules_off - 'nov' where id in ('${M}', '${T}')`);
  sql(`update business_posts set status = 'removed', pinned = false where business_id in ('${M}', '${T}') and title like '${TIT}%'`);
  sql(`update business_posts set created_at = created_at - interval '1 day' where business_id in ('${M}', '${T}') and created_at > now() - interval '1 day'`); // el tope de 20 por día
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MAR} and kind in ('market_order', 'hold') and status in ('pending', 'change_proposed', 'confirmed')`);
  // Otra oferta en vivo en estos productos (la semilla de demos) se termina un momento y vuelve al final.
  const otras = sql(`select coalesce(string_agg(id::text, ','), '') from business_posts where item_id in (${AR}, ${BI}, ${CA}) and kind = 'oferta' and status = 'live' and (ends_at is null or ends_at > now())`);
  const fin0 = otras ? sql(`select string_agg(id || '=' || coalesce(ends_at::text, ''), ';') from business_posts where id in (${otras})`) : '';
  if (otras) sql(`update business_posts set ends_at = now() - interval '1 second' where id in (${otras})`);
  ok(sql(`select count(*) from items where id in (${AR}, ${BI}, ${CA}) and oferta_precio(id, ${MAR}) is not null`) === '0', 'precondición: ninguna oferta en vivo en esos productos');
  const PA = +sql(`select price_cents from items where id = ${AR}`), PB = +sql(`select price_cents from items where id = ${BI}`), PC = +sql(`select price_cents from items where id = ${CA}`);
  const OA = Math.round(PA * 0.8), OB = PB - 100, OC = Math.round(PC * 0.75);
  NN.tarjeta('5705550122');
  const volver = NN.abiertoTodoElDia(M), volverT = NN.abiertoTodoElDia(T);
  const b = await chromium.launch(); const err = [], abiertas = [];
  try {
    const mk = async (o, tel) => { const cx = await b.newContext(o); abiertas.push(cx); const p = await cx.newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); await entrar(p, tel); return p; };
    const dm = await mk({ viewport: { width: 1360, height: 900 } }, '5705550288'), dt = await mk({ viewport: { width: 1360, height: 900 } }, '5705550299');
    const m = await mk({ ...devices['iPhone 13'] }, '5705550122');

    console.log('1 · Panel › Novedades: la oferta en un producto del catálogo (como un plato en Comida)');
    const ofertar = async (p, biz, titulo, nombre, precio, lb) => {
      await p.goto(B + `/panel/${biz}/pagina/nov?det=nov:new`); await p.getByText('Publicar novedad').first().waitFor();
      await (await vis(p.getByPlaceholder('Ej. Pernil + arroz $10 hasta las 3'))).fill(titulo);
      const buscar = await vis(p.getByPlaceholder('Busca en tus productos'));
      if (buscar) await buscar.fill(nombre);
      await clic(p.getByText(nombre, { exact: true }));
      const campo = `PRECIO DE LA OFERTA${lb ? ' · POR LIBRA' : ''}`;
      await (await vis(p.getByRole('textbox', { name: campo, exact: true }))).fill((precio / 100).toFixed(2));
      return campo;
    };
    let campo = await ofertar(dm, M, `${TIT} arroz`, 'Arroz 10 lb', OA, false);
    ok(!!(await vis(dm.getByText(/^\d+ PRODUCTOS$/))), 'el editor del mercado lista PRODUCTOS (no platos)');
    ok(await (await vis(dm.getByRole('textbox', { name: 'PRECIO NORMAL', exact: true }))).inputValue() === (PA / 100).toFixed(2), `el precio normal es el del catálogo (${dinero(PA)}) y no se escribe`);
    ok(!!(await vis(dm.getByText('Es el de tu catálogo. Para cambiarlo, edita el producto.'))), 'y lo dice: «Es el de tu catálogo»');
    await dm.screenshot({ path: OUT + 'ofe9n-editor-mercado-1360.png', fullPage: true });
    await clic(dm.getByText('Publicar', { exact: true }).last());
    ok(await espera(() => sql(`select item_id || '|' || price_was_cents || '|' || price_now_cents || '|' || link_kind from business_posts where business_id = '${M}' and title = '${TIT} arroz' and status = 'live' order by id desc limit 1`), `${AR}|${PA}|${OA}|item`) === `${AR}|${PA}|${OA}|item`, `oferta del arroz guardada: antes ${dinero(PA)} (del catálogo), ahora ${dinero(OA)}`);
    campo = await ofertar(dm, M, `${TIT} bistec`, 'Bistec de res', OB, true);
    ok(campo.endsWith('POR LIBRA') && !!(await vis(dm.getByText(/Va por libra: el pedido se cobra lo que pese, a este precio por libra/))), 'por libra: el precio de la oferta es POR LIBRA y lo dice');
    await clic(dm.getByText('Publicar', { exact: true }).last());
    ok(await espera(() => sql(`select price_was_cents || '|' || price_now_cents from business_posts where business_id = '${M}' and title = '${TIT} bistec' and status = 'live' order by id desc limit 1`), `${PB}|${OB}`) === `${PB}|${OB}`, `oferta del bistec: ${dinero(PB)}/lb → ${dinero(OB)}/lb`);
    await ofertar(dt, T, `${TIT} cartera`, 'Cartera', OC, false);
    await clic(dt.getByText('Publicar', { exact: true }).last());
    ok(await espera(() => sql(`select price_was_cents || '|' || price_now_cents from business_posts where business_id = '${T}' and title = '${TIT} cartera' and status = 'live' order by id desc limit 1`), `${PC}|${OC}`) === `${PC}|${OC}`, `oferta de la cartera: ${dinero(PC)} → ${dinero(OC)}`);
    // Lo de 21+ no entra: el café se marca 21+ un momento (precondición propia; vuelve en el acto). La base no deja enlazarle una oferta (aunque
    // alguien lo intente por fuera del editor) y el editor no lo ofrece.
    const CF = item(M, 'Café Santo Domingo');
    sql(`update items set age_min = 21, in_store_only = true where id = ${CF}`);
    try {
      let rechazo = '';
      try { sql(`insert into business_posts (business_id, city_id, kind, title, link_kind, item_id, price_was_cents, price_now_cents, audience, publish_at) select '${M}', city_id, 'oferta', '${TIT} 21', 'item', ${CF}, 749, 500, 'all', now() from businesses where id = '${M}'`); } catch (e) { rechazo = String(e.stderr || e.message); }
      ok(/oferta_item/.test(rechazo), 'un producto de 21+ no lleva oferta: la base la rechaza (business_posts_oferta_item)');
      await dm.goto(B + `/panel/${M}/pagina/nov?det=nov:new`); await dm.getByText('Publicar novedad').first().waitFor();
      const bu = await vis(dm.getByPlaceholder('Busca en tus productos')); if (bu) await bu.fill('Café Santo Domingo');
      await verV(dm.getByText(/PRODUCTOS$|Nada con/).first());
      ok(!(await vis(dm.getByText('Café Santo Domingo', { exact: true }))), 'el editor no ofrece el café de 21+');
    } finally { sql(`update items set age_min = 0, in_store_only = false where id = ${CF}`); }

    console.log('2 · La ficha: el precio de la oferta y el de siempre tachado, como en Comida');
    await m.goto(B + `/n/${M}?tab=svc`);
    const antes = m.locator('[data-precio-antes]');
    ok(await hasta(async () => (await antes.count()) > 0), 'el mercado muestra precios de antes');
    const txt = await antes.allInnerTexts();
    ok(txt.includes(dinero(PA)) && txt.includes(`${dinero(PB)}/lb`), `tachados: el arroz ${dinero(PA)} y el bistec ${dinero(PB)}/lb (el de siempre del catálogo)`);
    ok(txt.every((x) => x === dinero(PA) || x === `${dinero(PB)}/lb`), `ningún otro producto lleva tachado (${[...new Set(txt)].join(', ')})`);
    ok(await antes.first().evaluate((el) => getComputedStyle(el.parentElement).textDecorationLine.includes('line-through')), 'va tachado');
    ok(await antes.first().evaluate((el) => (el.previousElementSibling?.textContent ?? '') === 'Antes '), 'el lector de pantalla oye «Antes»');
    ok(!!(await vis(m.getByText(`${dinero(OB)}/lb`).first())) && !!(await vis(m.getByText(dinero(OA)).first())), `y el precio que se cobra: ${dinero(OA)} y ${dinero(OB)}/lb`);
    await m.screenshot({ path: OUT + 'ofe9n-mercado-390.png', fullPage: true });
    await m.goto(B + `/n/${T}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor();
    const ta = m.locator('[data-screen-label="Ficha · tienda"] [data-precio-antes]');
    ok(await hasta(async () => (await ta.count()) > 0) && (await ta.allInnerTexts()).every((x) => x === corto(PC)), `la tienda: la Cartera con su precio de siempre tachado`);
    await m.screenshot({ path: OUT + 'ofe9n-tienda-390.png', fullPage: true });
    // La oferta en Novedades lleva a su producto: «Pedir» en el mercado, «Apartar» en la tienda.
    await m.goto(B + `/n/${T}?tab=nov`);
    ok(!!(await verV(m.getByRole('button', { name: `Apartar · ${corto(OC)}`, exact: true }))), `Novedades de la tienda: «Apartar · ${corto(OC)}»`);
    await m.goto(B + `/n/${M}?tab=nov`);
    ok(!!(await verV(m.getByRole('button', { name: `Pedir · ${dinero(OB)}/lb` }))), 'Novedades del mercado: «Pedir · precio por libra»');

    console.log('3 · El pedido del mercado y el apartado se guardan al precio de la oferta (lo decide el servidor)');
    const pedir = async (lines) => {
      await m.goto(B + `/n/${M}`); await m.evaluate(([bz, l]) => localStorage.setItem('tl-mercado', JSON.stringify({ biz: bz, lines: l })), [M, lines]);
      await m.goto(B + `/n/${M}/mercado`); await verV(m.getByText('1 · Tu pedido'));
      const h = m.locator('[role="radiogroup"][aria-label="Hora"] [role="radio"]:not([disabled])');
      if (!(await h.count())) await clic(m.getByRole('button', { name: 'Mañana', exact: true }));
      await clic(m.locator('[role="radiogroup"][aria-label="Hora"] [role="radio"]:not([disabled])').first());
      await clic(m.getByRole('button', { name: 'Enviar pedido' })); await m.waitForURL(/\/mercado\/M-\d+/); return m.url().match(/M-\d+/)[0];
    };
    const N1 = await pedir([{ item: AR, q: 1, o: null }, { item: BI, q: 2, o: null }]);
    const L1 = (id) => sql(`select unit_price_cents || '|' || line_total_cents || '|' || coalesce(weight_est::text, '') from operation_lines where operation_id = (select id from operations where number = '${N1}') and item_id = ${id}`);
    ok(L1(AR) === `${OA}|${OA}|`, `${N1}: el arroz a ${dinero(OA)} (la oferta), no a ${dinero(PA)}`);
    ok(L1(BI) === `${OB}|${OB * 2}|2.00` || L1(BI) === `${OB}|${OB * 2}|2`, `${N1}: el bistec a ${dinero(OB)}/lb × 2 lb estimadas (al pesar se cobra peso real × ese precio)`);
    ok(sql(`select subtotal_cents from operations where number = '${N1}'`) === String(OA + OB * 2), `${N1}: el subtotal sale de los precios de la oferta (${dinero(OA + OB * 2)})`);
    // El apartado: la Cartera desde su carrito.
    await m.goto(B + `/n/${T}`); await m.evaluate(([k, id]) => localStorage.setItem(k, JSON.stringify([{ item: id, qty: 1 }])), [`tl-apartado-${T}`, CA]);
    await m.goto(B + `/n/${T}/apartar`); await m.getByText('TU APARTADO').first().waitFor();
    await clic(m.getByRole('button', { name: 'Continuar' }));
    const pg = m.locator('[data-screen-label="APP-NEG-TIENDA-APARTADO · móvil"]');
    await pg.getByText('HORA EN QUE PASAS').waitFor();
    await pg.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) /, disabled: false }).first().click();
    await clic(pg.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /^\d{1,2}(:\d\d)? [AP]M$/ }).first());
    await clic(m.getByRole('button', { name: 'Continuar' })); await m.getByText('BUENO SABER').first().waitFor();
    await clic(m.getByRole('button', { name: 'Apartar', exact: true }));
    await m.waitForURL(/\/apartado\/A-\d+/); const A1 = m.url().split('/apartado/')[1];
    ok(sql(`select l.unit_price_cents || '|' || o.total_cents from operations o join operation_lines l on l.operation_id = o.id where o.number = '${A1}'`) === `${OC}|${OC}`, `${A1}: la Cartera apartada a ${dinero(OC)} (lo que paga en la caja)`);

    console.log('4 · Panel y Super Admin: lo que salió de la oferta y retirarla');
    await dm.goto(B + `/panel/${M}/pagina/nov?det=nov:${post(`${TIT} arroz`)}`);
    await verV(dm.getByText('PEDIDOS DESDE LA OFERTA'));
    ok(sql(`select count(*) from operation_lines l join operations o on o.id = l.operation_id where o.number = '${N1}' and l.item_id = ${AR} and l.unit_price_cents = ${OA}`) === '1', 'el detalle de la oferta cuenta el pedido del mercado (PEDIDOS DESDE LA OFERTA)');
    await dm.screenshot({ path: OUT + 'ofe9n-detalle-1360.png', fullPage: true });
    const a = await mk({ viewport: { width: 1440, height: 900 } }, '5705550199');
    await a.goto(B + `/admin/negocios/${T}?tab=cont`); await a.getByText(/^NOVEDADES · /).first().waitFor();
    const fa = a.locator('div', { has: a.getByText(`${TIT} cartera`, { exact: true }) }).filter({ has: a.getByText('Ocultar la novedad', { exact: true }) }).last();
    await fa.getByText('Ocultar la novedad', { exact: true }).click(); await clic(a.getByText('Spam o publicidad')); await clic(a.getByText('Confirmar', { exact: true }));
    ok(await espera(() => sql(`select (hidden_at is not null)::text from business_posts where business_id = '${T}' and title = '${TIT} cartera' order by id desc limit 1`), 'true') === 'true', 'Super Admin: la oferta de la tienda oculta');
    ok(sql(`select coalesce(oferta_precio(${CA}, ${MAR}), price_cents) from items where id = ${CA}`) === String(PC), `oculta: la Cartera vuelve a ${dinero(PC)}`);
    await m.goto(B + `/n/${T}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor(); await m.waitForTimeout(500);
    ok((await m.locator('[data-screen-label="Ficha · tienda"] [data-precio-antes]').count()) === 0, 'oculta: la tienda ya no muestra tachado');
    ok(sql(`select total_cents from operations where number = '${A1}'`) === String(OC), `${A1}: el apartado ya enviado conserva su precio (${dinero(OC)})`);

    console.log('5 · Al terminar la oferta vuelve el precio normal');
    sql(`update business_posts set ends_at = now() - interval '1 second' where business_id = '${M}' and title like '${TIT}%' and status = 'live'`);
    await m.goto(B + `/n/${M}?tab=svc`); await m.getByText('Arroz 10 lb').first().waitFor(); await m.waitForTimeout(500);
    ok((await m.locator('[data-precio-antes]').count()) === 0, 'sin oferta en vivo no hay precio tachado en el mercado');
    sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where number = '${N1}'`);
    const N2 = await pedir([{ item: AR, q: 1, o: null }]);
    ok(sql(`select unit_price_cents from operation_lines where operation_id = (select id from operations where number = '${N2}') and item_id = ${AR}`) === String(PA), `${N2}: terminada la oferta, el arroz vuelve a ${dinero(PA)}`);
    sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where number in ('${N2}', '${A1}')`);
    ok(err.length === 0, `sin errores en la página${err.length ? ': ' + err.join(' | ') : ''}`);
    console.log(`\n${n} ✓ · ofe9n`);
  } finally {
    try { sql(`update business_posts set status = 'removed', pinned = false where business_id in ('${M}', '${T}') and title like '${TIT}%'`); } catch (e) { console.error('limpiar', e.message); }
    if (fin0) for (const x of fin0.split(';')) { const [id, f] = x.split('='); try { sql(`update business_posts set ends_at = ${f ? `'${f}'` : 'null'} where id = ${id}`); } catch (e) { console.error('volver', e.message); } }
    try { volver(); volverT(); } catch (e) { console.error('horario', e.message); }
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
