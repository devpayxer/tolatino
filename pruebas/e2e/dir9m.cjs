// 9m · Direcciones como DoorDash/Uber para todo EE. UU. (decisión AC; fase9-apertura.md §4 9m, dir9m). Teléfono 390 y escritorio 1360.
// 1 · Mis direcciones (390): escribir «123 N Wyo» en Hazleton → sugerencias reales de nuestra base («123 N Wyoming St · Hazleton, PA 18201»), y una dirección de
//     California, Texas y Nueva York (lo que contesta /api/direcciones, en ≤ 100 ms medidos por el servidor); elegirla llena el código postal y sale el pin.
// 2 · Mover el pin → se guarda el punto (calidad «puerta», a menos de 250 m de la dirección, con su lugar y estado); muy lejos → «El pin quedó muy lejos».
// 3 · «Usar mi ubicación» con el GPS simulado → la dirección más cercana (sin guardar el punto del teléfono).
// 4 · Panel › Tu página › Dirección y mapa (el dueño de Sabor Dominicano): la dirección del negocio con su punto, en la auditoría; el Super Admin (Ana, 1360)
//     corrige el punto con motivo y el dueño lo ve en su panel. Todo vuelve a como estaba.
// 5 · «Cómo llegar» abre la app de mapas del teléfono (maps:// en el iPhone, geo: en Android) y, en una computadora, las indicaciones en la web; ninguna
//     llamada a terceros de mapas o direcciones desde la página (geocodificadores, teselas, rutas: todo a nuestro servidor).
// 6 · Escritorio (1360): Mis direcciones nueva con el mapa; capturas a 390 y 1360, ES y EN.
// Precondiciones propias: las calles, los puntos y los nombres de esta prueba (source / county «prueba»: dir9m) y sus códigos postales si no estaban (y solo esos se
// quitan al final); una persona nueva con teléfono 555 libre. Corre barajada y dos veces seguidas: cuenta solo sus filas.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, telLibre } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `d9m-${nom}.png`, fullPage: full });
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const ADM = '5705550199', DUENO = '5705550133', BIZ = 'sabor-dominicano';
// Las calles de la prueba: [nombre, condado, zip, estado, lugar, inicio (lat,lng), paso por cuadra, primera cuadra, cuadras].
const CALLES = [
  ['N Wyoming St', '42079', '18201', 'PA', 'Hazleton', [40.9585, -75.9747], [0.0012, 0], 0, 10],
  ['Dr Carlton B Goodlett Pl', '06075', '94102', 'CA', 'San Francisco', [37.7786, -122.4196], [0.0011, 0], 0, 3],
  ['Congress Ave', '48453', '78701', 'TX', 'Austin', [30.2690, -97.7425], [0.0011, 0.0002], 6, 8],
  ['5th Ave', '36061', '10118', 'NY', 'New York', [40.7466, -73.9843], [0.0007, -0.0005], 3, 4],
];
const limpiar = () => {
  sql(`delete from geo_streets where county = 'prueba' and source = 'dir9m'`);
  sql(`delete from geo_points where source = 'prueba' and hash like 'dir9m-%'`);
  sql(`delete from geo_names where source = 'prueba' and name in (${CALLES.map((c) => `'${c[0]}'`).join(', ')})`);
};

(async () => {
  // ── Precondiciones propias ──
  limpiar();
  const zipsNuevos = [];
  for (const [name, , zip, st, place, [la, ln], [dla, dln], primera, k] of CALLES) {
    for (let i = 0; i < k; i++) {
      const b = (primera + i) * 100, a = [la + dla * i, ln + dln * i], e = [la + dla * (i + 1), ln + dln * (i + 1)];
      sql(`insert into geo_streets (name, norm, l_from, l_to, r_from, r_to, zip_l, zip_r, county, geom, state, place, source) values ('${name}', dir_abrev('${name}'), ${b + 1}, ${b + 99}, ${b || 2}, ${b + 98}, '${zip}', '${zip}', 'prueba',
        st_geomfromtext('LINESTRING(${a[1]} ${a[0]}, ${e[1]} ${e[0]})', 4326), '${st}', '${place}', 'dir9m')`);
    }
    sql(`insert into geo_names (norm, name, zip, place, state, n, source, geom) values (dir_abrev('${name}'), '${name}', '${zip}', '${place}', '${st}', ${k}, 'prueba', st_setsrid(st_point(${ln}, ${la}), 4326))
         on conflict (norm, zip) do nothing`);
    if (sql(`insert into geo_zips (zip, state, place, geom) values ('${zip}', '${st}', '${place}', st_setsrid(st_point(${ln}, ${la}), 4326)) on conflict (zip) do nothing returning zip`)) zipsNuevos.push(zip);
  }
  // La casa 113 de N Wyoming St como punto de dirección (la de OpenAddresses gana al rango).
  sql(`insert into geo_points (num, num_i, street, norm, state, zip, place, source, hash, geom) values ('113', 113, 'N Wyoming St', dir_abrev('N Wyoming St'), 'PA', '18201', 'Hazleton', 'prueba', 'dir9m-113', st_setsrid(st_point(-75.97485, 40.959844), 4326))`);
  const TEL = telLibre(), b = await chromium.launch(), err = [], terceros = [];
  // Precondición propia: el tope de códigos por IP (20 por hora) cuenta TODAS las pruebas, que salen de la misma máquina; las entradas de los
  // teléfonos de prueba (570555xxxx) de esta hora pasan a la anterior. El tope por teléfono y la espera de 30 s siguen intactos para los demás.
  sql(`update otp_codes set created_at = created_at - interval '61 minutes' where phone like '+1570555%' and created_at > now() - interval '1 hour' and created_at < now() - interval '45 seconds'`);
  const GEO = /google|gstatic|mapbox|here\.com|hereapi|openstreetmap|osm\.org|nominatim|photon|komoot|geoapify|opencage|arcgis|esri|apple\.com|bing|virtualearth|tomtom|maptiler|carto|stadiamaps|thunderforest|locationiq|positionstack|smarty|census\.gov/i;
  const mirar = (p, tag) => {
    p.on('pageerror', (e) => err.push(`${tag}: ${e.message}`));
    // Lo de mapas y direcciones (geocodificadores, teselas, rutas) nunca sale de nuestro servidor. Las fotos de la semilla del sandbox (pexels) no son de esto.
    p.on('request', (r) => { const u = new URL(r.url()); if (!/^(localhost|127\.0\.0\.1)$/.test(u.hostname) && u.protocol.startsWith('http') && GEO.test(u.hostname)) terceros.push(u.hostname); });
  };
  const abiertas = [];
  try {
    // ── 1 · Autocompletar ──
    console.log('1 · Mis direcciones (390): «123 N Wyo» y direcciones de California, Texas y Nueva York');
    const c1 = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, geolocation: { latitude: 40.96004, longitude: -75.97452 }, permissions: ['geolocation'] }); abiertas.push(c1);
    const p = await c1.newPage(); mirar(p, 'tel');
    await entrarComo(p, TEL, { nombre: 'Dora', apellido: 'Dir' });
    const UID = sql(`select id from users where phone = '+1${TEL}'`);
    await p.goto(B + '/cuenta/direcciones/nueva'); await p.locator('[data-pieza="direccion"]').waitFor();
    const calle = p.getByRole('combobox');
    await calle.pressSequentially('123 N Wyo', { delay: 40 });
    const opc = p.locator('[data-pieza="sugerencias"] [role="option"]');
    ok(await espera(async () => (await opc.count()) > 0), 'salen sugerencias mientras se escribe');
    const t1 = await opc.first().innerText();
    ok(/123 N Wyoming St/.test(t1) && /HAZLETON, PA 18201/.test(t1), `«123 N Wyo» → 123 N Wyoming St · Hazleton, PA 18201 (${t1.replace(/\s+/g, ' ')})`);
    await shot(p, 'sugerencias-390', false);
    const api = (q) => p.evaluate(async (q) => (await fetch(`/api/direcciones?q=${encodeURIComponent(q)}`)).json(), q);
    for (const [q, re, nom] of [['1 Dr Carlton B Goodlett', /^1 Dr Carlton B Goodlett Pl \| San Francisco, CA 94102$/, 'California'], ['1100 Congress Ave Austin TX', /^1100 Congress Ave \| Austin, TX 78701$/, 'Texas (sin coma)'], ['350 5th Ave, New York, NY', /^350 5th Ave \| New York, NY 10118$/, 'Nueva York']]) {
      const r = await api(q), x = r.items?.[0];
      ok(x && re.test(`${x.linea} | ${x.sub}`) && x.calidad === 'numero', `${nom}: «${q}» → ${x ? `${x.linea} · ${x.sub}` : 'nada'}`);
    }
    const ms = [];
    for (const q of ['12 N Wyo', '450 N Wyoming', '113 n wyo', '1 Dr Carlton', '1100 Congress']) ms.push((await api(q)).ms);
    ok(Math.max(...ms) <= 100, `el servidor contesta en ≤ 100 ms (${ms.join(', ')} ms)`);
    const r113 = (await api('113 n wyoming')).items?.[0];
    ok(r113?.calidad === 'punto' && r113.linea === '113 N Wyoming St', 'la casa del punto de dirección gana al rango (113: «punto»)');

    // ── 2 · Elegir, mover el pin y guardar ──
    console.log('2 · Elegir la sugerencia, mover el pin y guardar el punto');
    await opc.first().click();
    ok(await espera(async () => (await p.locator('[data-pieza="mapa-pin"]').count()) > 0), 'al elegirla sale el mapa con el pin («la puerta está aquí»)');
    ok((await p.locator('[data-pieza="direccion"] input[inputmode="numeric"]').inputValue()) === '18201', 'el código postal se llena solo (18201)');
    const mapa = p.locator('[data-pieza="mapa-pin"] [role="application"]'), bb = await mapa.boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2 + 25, bb.y + bb.height / 2 + 20, { steps: 6 }); await p.mouse.up();
    const pin = await p.locator('[data-pieza="mapa-pin"]').getAttribute('data-pin');
    ok(/^-?\d+\.\d{6},-?\d+\.\d{6}$/.test(pin ?? '') && (await p.locator('[data-pieza="mapa-pin"]').getAttribute('data-lejos')) === '0', `el pin se movió (${pin}) y queda cerca de la dirección`);
    await shot(p, 'pin-390');
    await p.locator('[data-screen-label="Mi cuenta · barra"]').getByText('Guardar dirección').click();
    await p.waitForURL(/\/cuenta\/direcciones\?dir=/);
    const g = sql(`select geo_quality || '|' || (pin_at is not null) || '|' || place || '|' || state || '|' || round(st_y(geo::geometry)::numeric, 5) || ',' || round(st_x(geo::geometry)::numeric, 5) from user_addresses where user_id = '${UID}' and removed_at is null`);
    const [la, ln] = pin.split(',').map((x) => Number(x).toFixed(5));
    ok(g === `puerta|true|Hazleton|PA|${Number(la)},${Number(ln)}`, `se guardó el punto del pin (${g})`);
    ok(await p.getByText('Pin puesto por ti en la puerta.').isVisible(), 'la lista dice «Pin puesto por ti en la puerta»');
    // Muy lejos: el servidor no lo acepta.
    const id1 = sql(`select id from user_addresses where user_id = '${UID}' and removed_at is null`);
    await p.goto(B + `/cuenta/direcciones/${id1}`); await p.locator('[data-pieza="direccion"]').waitFor();
    await p.getByRole('combobox').fill(''); await p.getByRole('combobox').pressSequentially('450 N Wyo', { delay: 30 });
    await espera(async () => (await opc.count()) > 0); await opc.first().click();
    await p.locator('[data-pieza="mapa-pin"] [role="application"]').waitFor();
    const m2 = await p.locator('[data-pieza="mapa-pin"] [role="application"]').boundingBox();
    for (let i = 0; i < 4; i++) { await p.mouse.move(m2.x + m2.width / 2, m2.y + m2.height / 2); await p.mouse.down(); await p.mouse.move(m2.x + 10, m2.y + 10, { steps: 4 }); await p.mouse.up(); }
    ok((await p.locator('[data-pieza="mapa-pin"]').getAttribute('data-lejos')) === '1', 'muy lejos: el mapa avisa antes de guardar');
    await p.locator('[data-screen-label="Mi cuenta · barra"]').getByText('Guardar dirección').click();
    ok(await espera(async () => /El pin quedó muy lejos de esa dirección/.test(await p.locator('body').innerText())), 'muy lejos: el servidor no lo acepta («El pin quedó muy lejos de esa dirección»)');
    ok(sql(`select street from user_addresses where id = '${id1}'`) !== '450 N Wyoming St', 'y la dirección no cambió');

    // ── 3 · Usar mi ubicación ──
    console.log('3 · «Usar mi ubicación» con el GPS simulado');
    await p.goto(B + '/cuenta/direcciones/nueva'); await p.locator('[data-pieza="direccion"]').waitFor();
    await p.locator('[data-accion="mi-ubicacion"]').click();
    ok(await espera(async () => /^\d+ N Wyoming St$/.test(await p.getByRole('combobox').inputValue())), `el GPS → la dirección más cercana (${await p.getByRole('combobox').inputValue()})`);
    ok((await p.locator('[data-pieza="direccion"] input[inputmode="numeric"]').inputValue()) === '18201' && (await p.locator('[data-pieza="mapa-pin"]').count()) === 1, 'con su código postal y el pin donde está el teléfono');
    await shot(p, 'gps-390');

    // ── 4 · El panel y el Super Admin ──
    console.log('4 · Panel › Tu página › Dirección y mapa y el punto que corrige el Super Admin');
    const antes = sql(`select coalesce(address, '') || '|' || coalesce(st_astext(geo::geometry), '') || '|' || coalesce(geo_fixed_at::text, '') from businesses where id = '${BIZ}'`);
    const cd = await b.newContext({ viewport: { width: 1360, height: 900 } }); abiertas.push(cd);
    const pd = await cd.newPage(); mirar(pd, 'dueno');
    await entrarComo(pd, DUENO);
    await pd.goto(B + `/panel/${BIZ}/pagina/dir`); await pd.locator('[data-pantalla="PANEL-DIRECCION"]').waitFor();
    const cal2 = pd.getByRole('combobox');
    await cal2.fill(''); await cal2.pressSequentially('412 N Wyo', { delay: 30 });
    await espera(async () => (await pd.locator('[data-pieza="sugerencias"] [role="option"]').count()) > 0);
    await pd.locator('[data-pieza="sugerencias"] [role="option"]').first().click();
    await pd.getByRole('button', { name: 'Guardar dirección' }).click();
    ok(await espera(() => sql(`select address from businesses where id = '${BIZ}'`) === '412 N Wyoming St, 18201'), 'el panel guarda la dirección del negocio («412 N Wyoming St, 18201») con su punto');
    ok(sql(`select count(*) from audit_entries where action = 'negocio.direccion' and target_id = '${BIZ}' and at > now() - interval '2 minutes'`) !== '0', 'y queda en la auditoría');
    await shot(pd, 'panel-1360');
    const ca = await b.newContext({ viewport: { width: 1360, height: 900 } }); abiertas.push(ca);
    const pa = await ca.newPage(); mirar(pa, 'ana');
    await entrarComo(pa, ADM);
    await pa.goto(B + `/admin/negocios/${BIZ}?tab=ficha`); await pa.locator('[data-pieza="punto-admin"]').waitFor();
    await pa.getByRole('button', { name: 'Corregir el punto' }).click();
    const ma = await pa.locator('[data-pieza="punto-admin"] [role="application"]').boundingBox();
    await pa.mouse.move(ma.x + ma.width / 2, ma.y + ma.height / 2); await pa.mouse.down(); await pa.mouse.move(ma.x + ma.width / 2 - 30, ma.y + ma.height / 2 + 15, { steps: 5 }); await pa.mouse.up();
    await pa.locator('[data-pieza="punto-admin"] textarea').fill('La entrada da a N Wyoming St · dir9m');
    await pa.getByRole('button', { name: 'Guardar punto' }).click();
    ok(await espera(() => sql(`select count(*) from businesses where id = '${BIZ}' and geo_fixed_at > now() - interval '2 minutes' and geo_fixed_reason like '%dir9m'`) === '1'), 'el Super Admin corrige el punto con motivo');
    ok(sql(`select count(*) from audit_entries where action = 'negocio.punto' and target_id = '${BIZ}' and reason like '%dir9m'`) !== '0', 'y queda en la auditoría con el antes y el después');
    await shot(pa, 'admin-1360');
    await pd.goto(B + `/panel/${BIZ}/pagina/dir`); await pd.locator('[data-pantalla="PANEL-DIRECCION"]').waitFor();
    ok(await espera(async () => (await pd.locator('[data-fijado="1"]').count()) === 1), 'el dueño ve en su panel que To\'Latino corrigió el punto');
    // Vuelve a como estaba.
    const [ad, geo, fx] = antes.split('|');
    sql(`update businesses set address = ${ad ? `'${ad.replace(/'/g, "''")}'` : 'null'}, geo = ${geo ? `st_geomfromtext('${geo}', 4326)::geography` : 'null'}, geo_fixed_at = ${fx ? `'${fx}'` : 'null'}, geo_fixed_by = ${fx ? 'geo_fixed_by' : 'null'}, geo_fixed_reason = ${fx ? 'geo_fixed_reason' : 'null'} where id = '${BIZ}'`);

    // ── 5 · Cómo llegar ──
    console.log('5 · «Cómo llegar» abre la app de mapas del teléfono (o la web en una computadora)');
    const atrapar = (pg) => pg.evaluate(() => { window.__llegar = []; document.addEventListener('click', (e) => { const a = e.target; if (a && a.dataset && a.dataset.comoLlegar) { window.__llegar.push(a.href); e.preventDefault(); } }, true); });
    await p.goto(B + `/n/${BIZ}`); await p.locator('[data-pieza="mini-mapa"]').first().waitFor();
    await atrapar(p); await p.locator('[data-pieza="mini-mapa"]').first().click();
    const l1 = await p.evaluate(() => window.__llegar);
    ok(l1.length === 1 && /^maps:\/\/\?daddr=-?\d/.test(l1[0]), `en el iPhone abre Mapas (${l1[0]})`);
    await shot(p, 'ficha-minimapa-390');
    const cand = await b.newContext({ ...devices['Pixel 7'] }); abiertas.push(cand);
    const pan = await cand.newPage(); mirar(pan, 'android');
    await pan.goto(B + `/n/${BIZ}`); await pan.locator('[data-pieza="mini-mapa"]').first().waitFor();
    await atrapar(pan); await pan.locator('[data-pieza="mini-mapa"]').first().click();
    const l2 = await pan.evaluate(() => window.__llegar);
    ok(l2.length === 1 && /^geo:-?\d/.test(l2[0]), `en Android abre la app de mapas que elija (${l2[0]})`);
    await pd.goto(B + `/n/${BIZ}`); await pd.locator('[data-pieza="mini-mapa"]').first().waitFor();
    await atrapar(pd); await pd.locator('[data-pieza="mini-mapa"]').first().click();
    const l3 = await pd.evaluate(() => window.__llegar);
    ok(l3.length === 1 && /^https:\/\/www\.google\.com\/maps\/dir\//.test(l3[0]), 'en una computadora, las indicaciones en la web (un enlace, no una llamada)');
    await shot(pd, 'ficha-minimapa-1360');

    // ── 6 · Escritorio y EN ──
    console.log('6 · Escritorio (1360) y en inglés');
    await entrarComo(pd, TEL);
    await cd.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await pd.goto(B + '/cuenta/direcciones/nueva'); await pd.locator('[data-pieza="direccion"]').waitFor();
    await pd.getByRole('combobox').pressSequentially('123 N Wyo', { delay: 30 });
    ok(await espera(async () => (await pd.locator('[data-pieza="sugerencias"] [role="option"]').count()) > 0), 'escritorio: las sugerencias');
    ok(/STREET AND NUMBER/.test(await pd.locator('[data-pieza="direccion"]').innerText()) && /Use my location/.test(await pd.locator('[data-pieza="direccion"]').innerText()), 'en inglés: «STREET AND NUMBER» y «Use my location»');
    await shot(pd, 'nueva-en-1360');
    await cd.clearCookies({ name: 'tl_lang' });

    ok(!terceros.length, `ninguna petición a terceros de mapas o direcciones (${[...new Set(terceros)].join(', ') || 'ninguna'})`);
    ok(!err.length, `sin errores de la página (${err.join(' | ')})`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
    limpiar();
    for (const z of zipsNuevos) sql(`delete from geo_zips where zip = '${z}' and place in ('Hazleton', 'San Francisco', 'Austin', 'New York')`);
  }
  console.log(`\nOK dir9m · ${n} ✓`);
})().catch((e) => { console.error(e); try { execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -c "delete from geo_streets where source = 'dir9m'; delete from geo_points where hash like 'dir9m-%'"`); } catch { /* nada */ } process.exit(1); });
