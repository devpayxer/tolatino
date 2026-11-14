const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(500); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 20; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const MARISOL = "(select id from users where phone='+15705550122')";
const post = (t) => `(select id from business_posts where business_id='${BIZ}' and title='${t}' and status <> 'removed' order by id desc limit 1)`;
const limpiar = () => {
  sql(`delete from post_votes where user_id = ${MARISOL}`); sql(`delete from post_poll_votes where user_id = ${MARISOL}`); sql(`delete from post_saves where user_id = ${MARISOL}`);
  sql(`delete from post_comment_votes where user_id = ${MARISOL}`); sql(`update post_comments set status = 'removed' where user_id = ${MARISOL}`);
  sql(`delete from follows where follower_user_id = ${MARISOL} and target_id = '${BIZ}'`);
  sql(`update business_posts set status = 'removed', pinned = false where business_id = '${BIZ}' and title like 'Prueba %'`);
  sql(`update business_posts set hidden_at = null, hidden_reason = null where business_id = '${BIZ}'`);
  // 9b-3 · La oferta de la semilla vuelve a estar en vivo: barajada, a11y9c paraba las ofertas de Sabor Dominicano antes y la pestaña no la mostraba.
  sql(`update business_posts set status = 'live', ends_at = null where business_id = '${BIZ}' and title = 'Mofongo de chicharrón a $10 hoy' and status <> 'removed'`);
  sql(`update business_posts set pinned = (title = 'Mofongo de chicharrón a $10 hoy') where business_id = '${BIZ}' and status <> 'removed'`);
  sql(`update businesses set modules_off = modules_off - 'nov' where id = '${BIZ}'`);
  sql(`update business_posts set created_at = created_at - interval '1 day' where business_id = '${BIZ}' and created_at > now() - interval '1 day'`); // el tope de 20 por día no lo llenan las pruebas
  sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='${BIZ}' and module=''`);
};
(async () => {
  limpiar();
  const H = Number(sql(`select extract(hour from now() at time zone 'America/New_York')::int`)), hh = (x) => String((x + 24) % 24).padStart(2, '0') + ':00';
  sql(`update business_posts set created_at = created_at - interval '1 day' where business_id = '${BIZ}' and created_at > now() - interval '1 day'`); // el tope de 20 por día no lo llenan las pruebas
  sql(`update business_hours set ranges='[["${hh(H - 2)}","${hh(H - 4)}"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update menu_settings set pause_until = null where business_id='${BIZ}'`);
  sql(`update operations set status='cancelled' where user_id=${MARISOL} and status='pending'`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente'); globalThis.__p = [m];
  await entrar(m, '5705550122');
  await m.goto(B + `/n/${BIZ}?tab=nov`); const TN = m.locator('[data-screen-label="Ficha · novedades"]');
  await TN.getByText('Mofongo de chicharrón a $10 hoy').first().waitFor();
  ok(!!(await vis(TN.getByText('FIJADO'))), 'la oferta fijada va primero');
  // 9b-1 · Con FIJADO · OFERTA · «EN HOY EN EL BARRIO · QUEDAN N H» la página no se corre de lado (medía 429 px en un teléfono de 390).
  const anchos = await m.evaluate(() => [document.documentElement.scrollWidth, Math.round(visualViewport.width)]);
  ok(anchos[0] <= anchos[1] + 1, `Novedades cabe en el teléfono (sin moverse de lado): ${anchos[0]} ≤ ${anchos[1]} px`);
  ok(Number(await espera(() => sql(`select count(*) from post_views where post_id = ${post('Mofongo de chicharrón a $10 hoy')} and viewer like 'u:%'`), '1')) >= 1, 'la vista se cuenta (una por persona y día)');
  // Votar + y quitar
  const oferta = TN.locator('[data-screen-label="Novedades · publicación"]').filter({ hasText: 'Mofongo de chicharrón a $10 hoy' });
  const s0 = Number(sql(`select coalesce(sum(v),0) from post_votes where post_id = ${post('Mofongo de chicharrón a $10 hoy')}`));
  await oferta.getByRole('button', { name: 'Votar a favor' }).click();
  ok(Number(await espera(() => sql(`select coalesce(sum(v),0) from post_votes where post_id = ${post('Mofongo de chicharrón a $10 hoy')}`), String(s0 + 1))) === s0 + 1, 'voto + guardado en el servidor');
  // Encuesta
  await clic(TN.getByText('Pescado frito', { exact: true }));
  ok(await espera(() => sql(`select opt from post_poll_votes where user_id = ${MARISOL} and post_id = ${post('¿Qué cocinamos el sábado en la noche?')}`), '1') === '1', 'encuesta: voto por «Pescado frito»');
  await m.waitForTimeout(800); ok(!!(await vis(TN.getByText(/ya votaste/i))), 'encuesta: porcentajes y «ya votaste»');
  // Comentar
  await oferta.getByRole('button', { name: 'Comentarios' }).click();
  ok(!!(await vis(oferta.getByText('Sí. El precio es el mismo en delivery y pickup.'))), 'comentarios con la respuesta del negocio (NEGOCIO)');
  await (await vis(oferta.getByRole('textbox', { name: 'Comentario' }))).fill('¿Hasta qué hora está la oferta?');
  await clic(oferta.getByText('Enviar', { exact: true }));
  ok(await espera(() => sql(`select count(*) from post_comments where user_id = ${MARISOL} and status = 'visible'`), '1') === '1', 'comentario publicado');
  // Seguir
  await clic(TN.getByText('Seguir', { exact: true }));
  ok(await espera(() => sql(`select count(*) from follows where follower_user_id = ${MARISOL} and target_id = '${BIZ}'`), '1') === '1', 'seguir al negocio');
  await shot(m, 'v1-tab.png', true);
  // La oferta se cobra: el menú muestra $10 y el pedido guarda $10
  await clic(oferta.getByText('Pedir · $10'));
  await m.getByText('Agregar', { exact: false }).first().waitFor({ timeout: 10000 }).catch(() => undefined);
  const precioMenu = sql(`select coalesce(oferta_precio(id, ${MARISOL}), price_cents) from items where business_id = '${BIZ}' and name->>'es' = 'Mofongo de chicharrón'`);
  ok(precioMenu === '1000', 'oferta_precio: $10 para el cliente');
  await m.evaluate(() => { localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' })); });
  const mof = sql(`select id from items where business_id = '${BIZ}' and name->>'es' = 'Mofongo de chicharrón'`);
  const grp = sql(`select string_agg(g.id::text, ',') from option_groups g join items i on g.id = any(i.group_ids) where i.id = ${mof} and g.required`).split(',');
  await m.evaluate(([id, g]) => localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id, ch: Object.fromEntries(g.map((x) => [x, [0]])), q: 1, nt: '', k: {} }] } })), [mof, grp]);
  await m.goto(B + `/n/${BIZ}/pagar`); await clic(m.getByText(/^Enviar pedido/));
  await m.waitForURL(/\/pedido\//, { timeout: 15000 });
  const num = m.url().split('/pedido/')[1];
  ok(Number(sql(`select unit_price_cents - coalesce((select sum((o->>'cents')::int) from jsonb_array_elements(options) o), 0) from operation_lines where operation_id = (select id from operations where number = '${num}') limit 1`)) === 1000, `el pedido #${num} cobra el precio de la oferta ($10)`);
  sql(`update operations set status='cancelled' where number='${num}'`);

  // Panel: publicar una encuesta, programar una novedad, fijar, detener, responder
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'panel'); globalThis.__p.push(d);
  await entrar(d, '5705550133'); await d.goto(B + `/panel/${BIZ}/pagina/nov?det=nov:new`);
  await d.getByText('Publicar novedad').first().waitFor();
  await clic(d.getByText('Encuesta', { exact: true }));
  await (await vis(d.getByPlaceholder('Ej. ¿Qué sopa quieren el domingo?'))).fill('Prueba encuesta del domingo');
  await (await vis(d.getByPlaceholder('Ej. Sancocho'))).fill('Sancocho');
  await (await vis(d.getByPlaceholder('Ej. Mondongo'))).fill('Mondongo');
  await shot(d, 'v2-editor.png', true);
  await d.getByText('Publicar', { exact: true }).last().scrollIntoViewIfNeeded(); await d.getByText('Publicar', { exact: true }).last().click();
  ok(await espera(() => sql(`select kind || '|' || cardinality(poll) from business_posts where title = 'Prueba encuesta del domingo' and status = 'live' order by id desc limit 1`), 'encuesta|2') === 'encuesta|2', 'panel: encuesta publicada con 2 opciones');
  await d.goto(B + `/panel/${BIZ}/pagina/nov?det=nov:new`); await d.getByText('Publicar novedad').first().waitFor();
  await clic(d.getByText('Novedad', { exact: true }));
  await (await vis(d.getByPlaceholder('Ej. Estrenamos terraza'))).fill('Prueba novedad programada');
  await clic(d.getByText('Programar para otro día'));
  await clic(d.getByText('Mañana', { exact: true }));
  await d.getByText('Programar', { exact: true }).last().scrollIntoViewIfNeeded(); await d.getByText('Programar', { exact: true }).last().click();
  ok(await espera(() => sql(`select (publish_at > now())::text from business_posts where title = 'Prueba novedad programada' and status = 'live' order by id desc limit 1`), 'true') === 'true', 'panel: programada para mañana (no sale todavía)');
  await m.goto(B + `/n/${BIZ}?tab=nov`); await m.getByText('Mofongo de chicharrón a $10 hoy').first().waitFor();
  ok(!(await vis(m.getByText('Prueba novedad programada'))) && !!(await vis(m.getByText('Prueba encuesta del domingo'))), 'cliente: ve la encuesta, no la programada');
  // Fijar la encuesta (desfija la otra) y detenerla
  await d.goto(B + `/panel/${BIZ}/pagina/nov`);
  const fe = d.locator('div', { has: d.getByText('Prueba encuesta del domingo', { exact: true }) }).filter({ has: d.getByText('Fijar arriba', { exact: true }) }).last();
  await fe.getByText('Fijar arriba', { exact: true }).click();
  ok(await espera(() => sql(`select string_agg(title, ',') from business_posts where business_id = '${BIZ}' and pinned and status <> 'removed'`), 'Prueba encuesta del domingo') === 'Prueba encuesta del domingo', 'fijar: una a la vez');
  await shot(d, 'v3-panel.png', true);
  await d.waitForTimeout(1500);
  const fd = d.locator('div', { has: d.getByText('Prueba encuesta del domingo', { exact: true }) }).filter({ has: d.getByText('Detener', { exact: true }) }).last();
  await fd.getByText('Detener', { exact: true }).click();
  ok(await espera(() => sql(`select status from business_posts where title = 'Prueba encuesta del domingo' order by id desc limit 1`), 'stopped') === 'stopped', 'detener: termina y sale de la página');
  // Responder el comentario de Marisol
  await d.goto(B + `/panel/${BIZ}/pagina/nov?det=nov:${sql(`select ${post('Mofongo de chicharrón a $10 hoy')}`)}`);
  await d.getByText(/COMENTARIOS DE VECINOS/).first().waitFor();
  const fc = d.locator('div', { has: d.getByText(/Hasta qué hora está la oferta/) }).filter({ has: d.getByText('Responder', { exact: true }) }).last();
  await fc.getByText('Responder', { exact: true }).click();
  await (await vis(d.getByPlaceholder('Ej. Sí, el precio es el mismo en delivery.'))).fill('Hasta que se acabe, hoy.');
  await clic(d.getByText('Publicar respuesta', { exact: true }));
  ok(await espera(() => sql(`select reply from post_comments where user_id = ${MARISOL} and status = 'visible'`), 'Hasta que se acabe, hoy.') === 'Hasta que se acabe, hoy.', 'panel: respuesta al comentario');
  await shot(d, 'v4-det.png', true);

  // Super Admin: ocultar una novedad y pausar Novedades
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(a, 'admin'); globalThis.__p.push(a);
  await entrar(a, '5705550199'); await a.goto(B + `/admin/negocios/${BIZ}?tab=cont`); await a.getByText(/^NOVEDADES · /).first().waitFor();
  const fa = a.locator('div', { has: a.getByText('Estrenamos terraza', { exact: true }) }).filter({ has: a.getByText('Ocultar la novedad', { exact: true }) }).last();
  await fa.getByText('Ocultar la novedad', { exact: true }).click(); await clic(a.getByText('Spam o publicidad')); await clic(a.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select hidden_at is not null from business_posts where title = 'Estrenamos terraza'`), 't') === 't', 'admin: novedad oculta');
  await m.goto(B + `/n/${BIZ}?tab=nov`); await m.getByText('Mofongo de chicharrón a $10 hoy').first().waitFor();
  ok(!(await vis(m.getByText('Estrenamos terraza'))), 'la oculta ya no sale en la página');
  await clic(a.getByText('Pausar Novedades')); await clic(a.getByText('Reportes de clientes')); await clic(a.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select (modules_off ? 'nov')::text from businesses where id = '${BIZ}'`), 'true') === 'true', 'admin: Novedades en pausa');
  await m.goto(B + `/n/${BIZ}`); await m.waitForTimeout(800);
  ok(!(await vis(m.getByText('Novedades', { exact: true }))), 'en pausa: la pestaña desaparece');
  ok(sql(`select coalesce(oferta_precio(id, ${MARISOL}), price_cents) from items where business_id = '${BIZ}' and name->>'es' = 'Mofongo de chicharrón'`) === '1200', 'en pausa: la oferta ya no se cobra (vuelve el precio del menú)');
  await d.goto(B + `/panel/${BIZ}/pagina/nov`); await d.getByText(/To’Latino pausó tus Novedades/).first().waitFor(); ok(true, 'el dueño ve la pausa con su motivo');

  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
