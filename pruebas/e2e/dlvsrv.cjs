const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', P = '/panel/' + BIZ;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(600); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const MARISOL = "(select id from users where phone='+15705550122')";
const op = (n, c) => sql(`select ${c} from operations where number='${n}'`);
(async () => {
  // Delivery encendido: 3 mi, envío $3, gratis desde $40, mínimo $15, propina, efectivo al entregar con mi equipo.
  // 9b-1 · Abierto 23 h que empiezan 3 h antes de AHORA (en Hazleton). Antes era fijo 06:00–05:00 y de 4:45 a 6:00 AM el negocio ya no tomaba
  // pedidos («Ya no toma pedidos en línea hoy»: el último pedido es 15 min antes de cerrar) y «Enviar pedido» quedaba apagado.
  const [abre, cierra] = sql(`select to_char(date_trunc('hour', now() at time zone 'America/New_York') - interval '3 hours', 'HH24:MI') || '|' || to_char(date_trunc('hour', now() at time zone 'America/New_York') - interval '4 hours', 'HH24:MI')`).split('|');
  sql(`update business_hours set ranges='[["${abre}","${cierra}"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update menu_settings set pause_until = null where business_id='${BIZ}'`);
  sql(`update items set sold_out = false, stock_left = greatest(stock_left, stock_par), stock_day = null where business_id='${BIZ}' and id in (9,10,7,2)`);
  sql(`update delivery_settings set delivery=true, pickup=true, pay_cash_delivery=true, ask_tip=true, zone_mi=3, fee_cents=300, free_over_cents=4000, min_order_cents=1500, travel_min=15, last_delivery_min=0, who='team', external_app=null, auto_accept=false where business_id='${BIZ}'`);
  sql(`update businesses set modules_off = modules_off - 'delivery' where id='${BIZ}'`);
  sql(`update operations set status='cancelled' where user_id=${MARISOL} and status='pending'`);
  // Calles de prueba (en este contenedor no hay datos del Censo): una junto al negocio y otra a ~12 mi.
  sql(`delete from geo_streets where county = 'prueba'`);
  sql(`insert into geo_streets (name, norm, l_from, l_to, r_from, r_to, zip_l, zip_r, county, geom) values
    ('N Wyoming St', dir_abrev('N Wyoming St'), 401, 499, 400, 498, '18201', '18201', 'prueba', st_geomfromtext('LINESTRING(-75.9782 40.9540, -75.9782 40.9570)', 4326)),
    ('Main St', dir_abrev('Main St'), 1, 99, 2, 100, '18202', '18202', 'prueba', st_geomfromtext('LINESTRING(-76.2000 40.9600, -76.1990 40.9600)', 4326))`);
  sql(`update user_addresses set removed_at = now() where user_id = ${MARISOL} and removed_at is null`);
  sql(`insert into user_addresses (user_id, label, street, apt, zip, geo, geo_quality, city_id, is_default) values
    (${MARISOL}, 'casa', '420 N Wyoming St', 'Apt 2', '18201', st_setsrid(st_point(-75.9782, 40.9546), 4326)::geography, 'numero', 'hzl', true),
    (${MARISOL}, 'trabajo', '50 Main St', null, '18202', st_setsrid(st_point(-76.1995, 40.9600), 4326)::geography, 'numero', 'hzl', false)`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente');
  await entrar(m, '5705550122');
  await entrar(m, '5705550122');
  const casa = sql(`select id from user_addresses where user_id=${MARISOL} and removed_at is null and label='casa'`);
  const trabajo = sql(`select id from user_addresses where user_id=${MARISOL} and removed_at is null and label='trabajo'`);
  await m.goto(B + `/n/${BIZ}?tab=menu`);
  await m.evaluate(() => { localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'delivery' })); localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id: '7', ch: {}, q: 2, nt: '', k: {} }] } })); });
  await m.goto(B + `/n/${BIZ}/pagar`);
  const antes = sql(`select count(*) from operations where user_id=${MARISOL} and kind='order'`);
  let cambiado = 0;
  await m.route('**/n/sabor-dominicano/pagar**', async (r) => {
    const req = r.request(), body = req.postData();
    if (req.method() === 'POST' && body && body.includes(casa)) { cambiado++; return r.continue({ postData: body.split(casa).join(trabajo) }); }
    return r.continue();
  });
  await m.getByText(/^Enviar pedido/).last().click();
  await m.getByText(/lleva hasta 3 mi\. Pide pickup\./).first().waitFor({ timeout: 15000 });
  ok(cambiado > 0, 'la acción recibió la dirección fuera de zona');
  ok(sql(`select count(*) from operations where user_id=${MARISOL} and kind='order'`) === antes, 'servidor: fuera de zona no crea el pedido');
  sql(`update user_addresses set is_default = false where user_id=${MARISOL} and removed_at is null`); sql(`update user_addresses set is_default = true where user_id=${MARISOL} and removed_at is null and label = 'casa'`);
  sql(`delete from geo_streets where county = 'prueba'`);
  sql(`update delivery_settings set delivery=false, pay_cash_delivery=false where business_id='${BIZ}'`);
  sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='${BIZ}' and module=''`);
  await b.close(); console.log('OK');
})().catch(e => { console.error(e); try { execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -c "update delivery_settings set delivery=false, pay_cash_delivery=false where business_id='sabor-dominicano'; update business_hours set ranges='[[\\"11:00\\",\\"21:00\\"]]'::jsonb where business_id='sabor-dominicano' and module=''"`); } catch {} process.exit(1); });
