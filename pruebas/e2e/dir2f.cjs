const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(600); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const MARISOL = "(select id from users where phone='+15705550122')";
(async () => {
  // Tramo de prueba (en este contenedor no hay datos del Censo): N Wyoming St, 18201, junto a Sabor Dominicano.
  sql(`delete from geo_streets where county = 'prueba'`);
  sql(`insert into geo_streets (name, norm, l_from, l_to, r_from, r_to, zip_l, zip_r, county, geom) values ('N Wyoming St', dir_abrev('N Wyoming St'), 401, 499, 400, 498, '18201', '18201', 'prueba', st_geomfromtext('LINESTRING(-75.9782 40.9540, -75.9782 40.9570)', 4326))`);
  sql(`update user_addresses set removed_at = now() where user_id = ${MARISOL} and removed_at is null`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'movil');
  await entrar(m, '5705550122');
  await m.goto(B + '/cuenta'); await m.getByText('Direcciones').first().click(); await m.waitForURL(/\/cuenta\/direcciones$/);
  ok(await m.getByText('Sin direcciones').isVisible(), 'sin direcciones: vacío con «Guarda tu casa…»'); await shot(m, 'u1-dirs-vacio.png');
  await m.getByText('Agregar dirección').first().click(); await m.waitForURL(/nueva$/);
  // Validación del lado del cliente
  await m.locator('[data-screen-label="Mi cuenta · barra"]').getByText('Guardar dirección').click();
  ok(await m.getByText('Escribe la calle y el número.').isVisible() && await m.getByText('El código postal tiene 5 números.').isVisible(), 'valida calle y código postal');
  const campo = (i) => m.locator('[data-screen-label="Mi cuenta · formulario"] input, [data-screen-label="Mi cuenta · formulario"] textarea').nth(i);
  await campo(0).fill('420 North Wyoming Street'); await campo(1).fill('Apt 2'); await campo(2).fill('18201'); await campo(3).fill('Portón azul, segundo piso');
  await shot(m, 'u2-dir-nueva.png');
  await m.locator('[data-screen-label="Mi cuenta · barra"]').getByText('Guardar dirección').click(); await m.waitForURL(/\/cuenta\/direcciones\?dir=/);
  const r1 = sql(`select geo_quality||'|'||city_id||'|'||is_default||'|'||round(st_y(geo::geometry)::numeric,4) from user_addresses where user_id=${MARISOL} and removed_at is null`);
  ok(r1 === 'numero|hzl|true|40.9546', `ubicada por el servidor con su número (${r1}) y predeterminada por ser la primera`);
  ok(await m.getByText('PREDETERMINADA').isVisible(), 'lista: PREDETERMINADA'); await shot(m, 'u3-dirs.png');
  // Fuera de la zona y no encontrada
  await m.goto(B + '/cuenta/direcciones/nueva'); await campo(0).fill('10 Main St'); await campo(2).fill('19103');
  ok(await m.getByText('Fuera de la zona de entrega').isVisible(), 'aviso fuera de la zona antes de guardar');
  await m.getByText('Trabajo', { exact: true }).click();
  await m.locator('[data-screen-label="Mi cuenta · barra"]').getByText('Guardar dirección').click(); await m.waitForURL(/\/cuenta\/direcciones\?dir=/);
  ok(sql(`select coalesce(geo_quality,'-')||'|'||coalesce(city_id,'-')||'|'||is_default from user_addresses where user_id=${MARISOL} and removed_at is null and zip='19103'`) === '-|-|false', 'fuera de zona: sin ubicar, sin ciudad, no predeterminada');
  ok(await m.getByText(/No la encontramos en el mapa/).isVisible(), 'lista avisa que no se encontró en el mapa');
  // Usar por defecto
  await m.getByText('Usar por defecto').first().click(); await m.getByText('Ahora es tu dirección predeterminada.').waitFor();
  ok(sql(`select zip from user_addresses where user_id=${MARISOL} and removed_at is null and is_default`) === '19103', 'Usar por defecto cambia la predeterminada');
  // Editar y borrar
  await m.getByText('Trabajo', { exact: true }).first().click(); await m.waitForURL(/\/cuenta\/direcciones\/[0-9a-f-]{36}$/);
  await m.getByText('Borrar dirección').click(); await m.getByRole('dialog').getByText('Borrar', { exact: true }).click(); await m.waitForURL(/\/cuenta\/direcciones$/);
  ok(sql(`select count(*) from user_addresses where user_id=${MARISOL} and removed_at is null`) === '1' && sql(`select is_default from user_addresses where user_id=${MARISOL} and removed_at is null`) === 't', 'borrar: queda la otra y vuelve a ser predeterminada');
  ok(+sql(`select count(*) from user_addresses where user_id=${MARISOL} and removed_at is not null and zip='19103'`) >= 1, 'borrar = estado (removed_at), no se borra la fila');
  // Escritorio
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'desk');
  await entrar(d, '5705550122'); await d.goto(B + '/cuenta/direcciones');
  ok(!!(await vis(d.getByText('ZONA DE ENTREGA'))) && !!(await vis(d.locator('[data-screen-label="Mi cuenta · navegación"]'))), 'escritorio: navegación y tarjeta de zona');
  await shot(d, 'u4-dirs-d.png');
  await d.getByText('Agregar', { exact: true }).first().click(); await d.waitForURL(/nueva$/); await shot(d, 'u5-dir-nueva-d.png');
  // Otra persona no ve ni edita las de Marisol
  const ajena = sql(`select id from user_addresses where user_id=${MARISOL} and removed_at is null limit 1`);
  const p2 = await (await b.newContext()).newPage(); await entrar(p2, '5705550133');
  const resp = await p2.goto(B + '/cuenta/direcciones/' + ajena); ok(resp.status() === 404, 'la dirección de otra persona da 404');
  sql(`delete from geo_streets where county = 'prueba'`);
  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  await b.close(); console.log('OK');
})().catch(e => { console.error(e); try { execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -c "delete from geo_streets where county = 'prueba'"`); } catch {} process.exit(1); });
