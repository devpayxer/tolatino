const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', P = '/panel/' + BIZ;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const MARISOL = "(select id from users where phone='+15705550122')", JUAN_TEL = '5705550144';
const op = (n, c = "status||'|'||coalesce(stage,'-')") => sql(`select ${c} from operations where number='${n}'`);
const restaurar = () => { try { sql(`update delivery_settings set delivery=false, pay_cash_delivery=false where business_id='${BIZ}'`); sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='${BIZ}' and module=''`); } catch {} };
(async () => {
  sql(`update business_hours set ranges='[["00:00","00:00"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update delivery_settings set delivery=true, pickup=true, pay_cash_delivery=true, pay_card=false, ask_tip=true, zone_mi=3, fee_cents=300, free_over_cents=4000, min_order_cents=0, travel_min=15, last_delivery_min=0, who='team', external_app=null, auto_accept=false where business_id='${BIZ}'`);
  sql(`update businesses set modules_off = modules_off - 'delivery' where id='${BIZ}'`);
  sql(`update items set sold_out = false, stock_left = greatest(stock_left, stock_par), stock_day = null where business_id='${BIZ}'`); sql(`update menu_settings set pause_until = null where business_id='${BIZ}'`);
  sql(`update operations set respond_by = now() - interval '1 minute' where user_id = ${MARISOL} and status = 'pending'`);
  sql(`update operations set driver_id = null where driver_id is not null`); sql(`update trip_runs set driver_id = null where driver_id is not null`); sql(`delete from delivery_drivers where user_id not in (select user_id from review_accounts)`);
  // 9b-1 · Sin tocar al repartidor de la cuenta de revisión (semilla 0048): antes se borraban TODOS y, en una corrida entera, fich8i encontraba
  // a la cuenta de revisión del Repartidor sin equipo.
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_|net::/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  // 1 · El dueño invita a Juan desde Entrega
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'panel'); globalThis.__p = [d];
  await entrar(d, '5705550133'); await d.goto(B + P + '/entrega'); await d.getByText(/TUS REPARTIDORES/).first().waitFor();
  await clic(d.getByText('Invitar repartidor', { exact: true }));
  const campos = d.locator('main input'), nc = await campos.count(); await campos.nth(nc - 2).fill('Juan Repartidor'); await campos.nth(nc - 1).fill('(570) 555-0144');
  await clic(d.getByText('Crear código', { exact: true })); await d.getByText(/Dale este código: [A-Z0-9]{6}/).first().waitFor();
  const codigo = sql(`select invite_code from delivery_drivers where phone = '+1${JUAN_TEL}'`);
  ok(/^[A-HJ-NP-Z2-9]{6}$/.test(codigo), `código creado (${codigo}), sin letras que se confunden`);
  await d.screenshot({ path: OUT + 'r1-entrega-invitar-d.png', fullPage: true });
  // 2 · Otra cuenta no puede usar el código
  const a = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(a, 'otro'); globalThis.__p.push(a);
  await entrar(a, '5705550199'); await a.goto(B + '/repartidor'); await a.getByText(/CÓDIGO DEL NEGOCIO/).first().waitFor();
  await a.locator('input').first().fill(codigo); await clic(a.getByText('Entrar al equipo', { exact: true }));
  await a.getByText(/Ese código es para otro teléfono/).first().waitFor(); ok(true, 'el código no sirve con otro teléfono');
  // 3 · Juan entra con su teléfono y el código
  const j = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(j, 'repartidor'); globalThis.__p.push(j);
  await entrar(j, JUAN_TEL); sql(`update users set first_name = 'Juan', last_name = 'Repartidor' where phone = '+1${JUAN_TEL}'`);
  await j.goto(B + '/repartidor'); await j.getByText(/CÓDIGO DEL NEGOCIO/).first().waitFor();
  await j.screenshot({ path: OUT + 'r2-onb-m.png', fullPage: true });
  await j.locator('input').first().fill(codigo.toLowerCase()); await clic(j.getByText('Moto', { exact: true })); await clic(j.getByText('Entrar al equipo', { exact: true }));
  await j.getByText(/Estás fuera de línea/).first().waitFor();
  ok(sql(`select status || '|' || vehicle || '|' || (invite_code is null) from delivery_drivers where phone = '+1${JUAN_TEL}'`) === 'active|moto|true', 'Juan entra al equipo (moto); el código ya no sirve');
  await clic(j.getByRole('switch').first()); await j.getByText(/Estás en línea/).first().waitFor(); ok(sql(`select online from delivery_drivers where phone = '+1${JUAN_TEL}'`) === 't', 'en línea');
  await j.screenshot({ path: OUT + 'r3-inicio-m.png', fullPage: true });
  // 4 · Marisol pide a domicilio, efectivo al recibir
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente'); globalThis.__p.push(m);
  await entrar(m, '5705550122');
  // 9b-3 · Su punto de partida, dicho aquí: la dirección «Casa» de Marisol (antes la dejaban em4e, fi4b o plan4f si corrían antes).
  sql(`insert into user_addresses (user_id, label, street, zip, geo, geo_quality, city_id, is_default) select u.id, 'casa', '112 W Oak St', '18201', ST_SetSRID(ST_MakePoint(-75.9775, 40.9584), 4326)::geography, 'numero', 'hzl', false from users u where u.phone = '+15705550122' and not exists (select 1 from user_addresses a where a.user_id = u.id and a.label = 'casa' and a.removed_at is null)`);
  const pedir = async () => {
    await m.goto(B + '/n/' + BIZ); await m.evaluate(() => { localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id: '7', ch: {}, q: 1, nt: '', k: {} }] } })); localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'delivery' })); });
    await m.goto(B + '/n/' + BIZ + '/pagar'); await m.getByText(/Casa · /).first().waitFor();
    await m.locator('[data-screen-label="Checkout · barra"]').getByText(/^Enviar pedido/).click(); await m.waitForURL(/\/pedido\/\d+$/); return m.url().split('/').pop();
  };
  const n1 = await pedir(); ok(op(n1, "mode||'|'||pay_mode") === 'delivery|entrega', `pedido #${n1} a domicilio, efectivo`);
  const total = +sql(`select total_cents from operations where number = '${n1}'`);
  // 5 · El negocio acepta y se lo asigna a Juan
  await d.goto(B + P + '/hoy?det=ped:' + n1); const det = d.locator('aside[data-screen-label="Panel v2 · detalle"]');
  await clic(det.getByText('Aceptar', { exact: true })); await d.waitForTimeout(800);
  await d.goto(B + P + '/hoy?det=ped:' + n1); await det.getByText(/¿QUIÉN LO LLEVA\?/).waitFor();
  await d.screenshot({ path: OUT + 'r4-asignar-d.png' });
  await clic(det.getByText('Asignar', { exact: true })); await d.getByText(/Asignado a Juan/).first().waitFor();
  ok(sql(`select d.display_name from operations o join delivery_drivers d on d.id = o.driver_id where o.number = '${n1}'`) === 'Juan Repartidor', 'asignado a Juan');
  ok(sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+1${JUAN_TEL}' and n.tpl = 'drv_assigned' and n.ref_id = '${n1}'`) === '1', 'a Juan le llega «Tienes una entrega»');
  // 6 · Juan entrega: recogí → llegué → cobré → entregado
  await j.goto(B + '/repartidor'); await j.getByText(`#${n1}`, { exact: false }).first().waitFor(); await clic(j.getByText(new RegExp(`#${n1} ·`)));
  await j.getByText('Recogí, voy en camino').first().waitFor(); await j.screenshot({ path: OUT + 'r5-detalle-m.png', fullPage: true });
  await clic(j.getByRole('button', { name: 'Recogí, voy en camino' })); await j.getByRole('button', { name: 'Llegué' }).first().waitFor();
  ok(op(n1) === 'confirmed|on_the_way', 'recogí → en camino');
  ok(sql(`select count(*) from notifications where user_id = ${MARISOL} and tpl = 'ord_way' and ref_id = '${n1}'`) === '1', 'Marisol: «Tu pedido va en camino»');
  await clic(j.getByRole('button', { name: 'Llegué' })); await j.getByRole('button', { name: /^Cobrar \$/ }).first().waitFor();
  ok(sql(`select count(*) from notifications where user_id = ${MARISOL} and tpl = 'ord_here' and ref_id = '${n1}'`) === '1', 'Marisol: «Tu repartidor llegó»');
  await m.goto(B + '/pedido/' + n1); await m.getByText(/Juan llegó con tu pedido/).first().waitFor(); ok(true, 'el cliente ve «Juan llegó con tu pedido»');
  await clic(j.getByRole('button', { name: /^Cobrar \$/ })); await j.screenshot({ path: OUT + 'r6-cobro-m.png', fullPage: true });
  await clic(j.getByRole('button', { name: /^Cobré \$.* · Entregado$/ })); await j.getByText(/Entregado\. Gracias/).first().waitFor();
  ok(op(n1, "status||'|'||stage||'|'||cash_collected_cents") === `done|delivered|${total}`, 'entregado y el efectivo cobrado queda registrado');
  // 7 · El negocio ve el cuadre de efectivo
  await d.goto(B + P + '/entrega'); await d.getByText(/EFECTIVO DE HOY/).first().waitFor();
  ok(!!(await vis(d.getByText(`$${(total / 100).toFixed(2)}`).first())) || !!(await vis(d.getByText(`$${total / 100}`).first())), 'cuadre: el efectivo de Juan hoy');
  await d.screenshot({ path: OUT + 'r7-cuadre-d.png', fullPage: true });
  // 8 · Sin señal: el paso se guarda y se envía al volver
  const n2 = await pedir();
  await d.goto(B + P + '/hoy?det=ped:' + n2); await clic(det.getByText('Aceptar', { exact: true })); await d.waitForTimeout(800);
  await d.goto(B + P + '/hoy?det=ped:' + n2); await clic(det.getByText('Asignar', { exact: true })); await d.getByText(/Asignado a Juan/).first().waitFor();
  await j.goto(B + '/repartidor?p=' + n2); await j.getByText('Recogí, voy en camino').first().waitFor();
  await j.context().setOffline(true);
  await clic(j.getByRole('button', { name: 'Recogí, voy en camino' })); await j.getByText(/Sin señal: se guardó/).first().waitFor();
  ok(op(n2) === 'confirmed|preparing', 'sin señal: todavía no llega al servidor');
  await j.context().setOffline(false); await j.evaluate(() => window.dispatchEvent(new Event('online')));
  ok(await espera(() => op(n2), 'confirmed|on_the_way') === 'confirmed|on_the_way', 'al volver la señal se envía solo');
  // 9 · Problema
  await j.goto(B + '/repartidor?p=' + n2); await clic(j.getByText('Reportar un problema', { exact: true }));
  await clic(j.getByText('El cliente no responde', { exact: true })); await clic(j.getByText('Enviar al negocio', { exact: true })); await j.getByText(/El negocio ya lo sabe/).first().waitFor();
  ok(sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+15705550133' and n.tpl = 'biz_dlv_issue'`) !== '0', 'al negocio le llega «Problema con una entrega»');
  await j.goto(B + '/repartidor?t=ganancias'); await j.getByText('Ganancias', { exact: true }).first().waitFor(); await j.screenshot({ path: OUT + 'r8-ganancias-m.png', fullPage: true });
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); restaurar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} restaurar(); process.exit(1); });
