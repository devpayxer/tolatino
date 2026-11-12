// 4ic · Venta de Autos: «Inventario» (agregar un carro: VIN inválido rechazado por el servidor, VIN válido; «En la puerta» en vivo del servidor =
// la fórmula; pago de ejemplo con tasa, meses y enganche; salvage con su línea), «Tu herramienta · Inventario del lote» (cargo del dealer sobre
// el tope rechazado; ITIN, trade-in, prueba en casa, garantía, enganche con ITIN → filtros, tarjeta, totales de TODOS los carros y auditoría;
// vendido), Free = 5, Licencias, y el Super Admin (360 en solo lectura, ocultar con motivo, Catálogo › Cargo del dealer recalcula todo).
// Se deja a sí mismo el punto de partida: corre igual la segunda vez.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', NEG = 'autos-el-cibao', TEL = '5705550444';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const ve = (l) => l.first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const tj = (n = NEG) => JSON.parse(sql(`select coalesce(category_attrs->'tarjeta', '{}') from businesses where id = '${n}'`));
const fv = (n = NEG) => sql(`select filter_values from businesses where id = '${n}'`);
const espera = async (f, ms = 9000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const llenar = async (p, label, v) => { const x = await vis(p.getByLabel(label, { exact: true })); if (!x) throw new Error('sin campo ' + label); await x.fill(v); };
const guardar = (p) => clic(p.getByRole('button', { name: /^(Agregar|Guardar)$/ }).last());
const car = (trim) => sql(`select v.vin || ':' || v.price_cents || ':' || v.otd_cents || ':' || v.doc_fee_cents || ':' || coalesce(v.est_payment_cents, 0) || ':' || v.title || ':' || v.street_legal || ':' || v.status from vehicle_listings v join items i on i.id = v.item_id where v.trim_level = '${trim}' and i.removed_at is null and v.business_id = '${NEG}' order by i.id desc limit 1`);
const cid = (trim) => sql(`select i.id from items i join vehicle_listings v on v.item_id = i.id where v.trim_level = '${trim}' and i.removed_at is null and v.business_id = '${NEG}' order by i.id desc limit 1`);
// La misma cuenta del servidor, escrita aparte (tabla hecha a mano): impuesto redondeado al centavo, pago amortizado sobre el total en la puerta.
const puerta = (p, fee, bp = 600, tags = 15000) => { const tax = Math.floor((p * bp + 5000) / 10000); return p + tax + tags + fee; };
const pago = (otd, down, aprBp, n) => { const P = otd - down, r = aprBp / 10000 / 12; return Math.round((P * r) / (1 - Math.pow(1 + r, -n))); };
// VIN de prueba válido: el dígito verificador calculado aquí (49 CFR 565).
const vinCon = (s16) => { const W = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2], L = 'ABCDEFGHJKLMNPRSTUVWXYZ', V = '12345678123457923456789', s = s16.slice(0, 8) + '0' + s16.slice(8);
  const r = [...s].reduce((t, ch, i) => t + (/[0-9]/.test(ch) ? +ch : +V[L.indexOf(ch)]) * W[i], 0) % 11; return s.slice(0, 8) + (r === 10 ? 'X' : String(r)) + s.slice(9); };
const totalesBien = () => sql(`select count(*) from vehicle_listings v join dealer_settings s on s.business_id = v.business_id where v.business_id = '${NEG}' and v.status <> 'sold'
  and (v.doc_fee_cents <> s.doc_fee_cents or v.otd_cents <> v.price_cents + (v.price_cents::bigint * 600 + 5000) / 10000 + 15000 + s.doc_fee_cents or (v.est_payment_cents is not null and v.est_down_cents <> s.itin_down_cents))`) === '0';

const CARGOS = `update dealer_settings s set doc_fee_cents = x.f, derived_on = null from (values ('autos-el-cibao', 39900), ('keystone-trucks', 29900), ('compre-aqui-hzl', 19900), ('valle-motors', 47700), ('power-sports-hazleton', 19900), ('lake-harmony-botes-campers', 39900), ('comercial-keystone', 39900), ('clasicos-lujo-valle', 47700)) as x(b, f) where s.business_id = x.b`;
(async () => {
  // Punto de partida conocido (los cargos de la semilla, por si una corrida anterior bajó el tope).
  sql(`update vehicle_listings set status = 'sold', status_at = now() - interval '40 days' where trim_level like 'P4IC%' and business_id = '${NEG}'`);
  sql(`update items set removed_at = now() where id in (select item_id from vehicle_listings where trim_level like 'P4IC%') and removed_at is null`);
  sql(`update platform_config set value = '47700' where key = 'dealer_doc_fee_cap_cents'`);
  sql(CARGOS);
  sql(`update dealer_settings set doc_fee_cents = 39900, fin = true, itin = true, no_credit = true, itin_down_cents = 150000, apr_bp = 1490, term_m = 48, trade = true, home_test = false, warranty_default = 3, lot_total = 38, derived_on = null where business_id = '${NEG}'`);
  sql(`update items set status = 'live', hidden_reason = null, hidden_by = null where business_id = '${NEG}' and status = 'hidden'`);
  sql(`update vehicle_listings set status = 'lot' where business_id = '${NEG}' and trim_level is distinct from 'P4IC' and trim_level is distinct from 'P4IC SALV' and status <> 'lot'`);
  sql(`update vehicle_listings v set warranty = 'dealer', warranty_months = 3, warranty_miles = 3000 where business_id = '${NEG}' and warranty in ('como_esta', 'dealer') and status <> 'sold'`);
  sql(`insert into business_stats_cache (business_id, plan) values ('${NEG}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
  barrer();
  ok(sql(`select coalesce(last_error, 'ok') from system_jobs where name = 'barrido.autos' and last_run_at > now() - interval '1 minute'`) === 'ok', 'la tarea «autos» corre en el barrido central');
  ok(sql(`select count(*) from dealer_settings where derived_on is distinct from (now() at time zone 'America/New_York')::date`) === '0', 'el barrido derivó los 17 dealers');
  ok(sql(`select count(*) from vehicle_listings where status <> 'sold' and otd_cents <> price_cents + tax_cents + tags_cents + doc_fee_cents`) === '0', 'todo carro: otd = precio + impuesto + placas + cargo');
  ok(sql(`select count(*) from vehicle_listings v where v.doc_fee_cents > (select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents')`) === '0', 'ningún cargo del dealer pasa del tope de PA');
  ok(sql(`select count(*) from vehicle_listings where (est_payment_cents is null) <> (est_apr_bp is null) or (est_payment_cents is null) <> (est_months is null) or (est_payment_cents is null) <> (est_down_cents is null)`) === '0', 'ningún pago de ejemplo sin tasa, meses y enganche');
  const civic = sql(`select otd_cents || ':' || est_payment_cents from vehicle_listings where vin = '2HGFC2F56GATL0001'`);
  ok(civic === `${puerta(1190000, 39900)}:${pago(1316300, 150000, 1490, 48)}` && civic === '1316300:32400', `Civic $11,900 → en la puerta $13,163, ejemplo $324 al mes (${civic})`);
  ok(sql(`select bhph_total_cents || ':' || bhph_weeks from vehicle_listings where vin = '1HGCP2F89CATL0009'`) === '840900:78', 'compre aquí pague aquí: $999 + $95 × 78 = $8,409');
  let f = fv(); ok(/itin/.test(f) && /sincredito/.test(f) && /enganche/.test(f) && /garantia/.test(f) && /tradein/.test(f) && /limpio/.test(f) && /\besp\b/.test(f) && /y10/.test(f), `filtros derivados (esp y y10 se conservan): ${f}`);
  ok(tj().eta?.es === '38 carros en el lote' && tj().fee?.es === 'Financian con ITIN · tasa, meses y enganche por escrito', `tarjeta sin términos de crédito sueltos: ${tj().eta?.es} | ${tj().fee?.es}`);
  ok(!/enganche|\$/i.test(tj('compre-aqui-hzl').fee?.es ?? 'x') || /por escrito/.test(tj('compre-aqui-hzl').fee?.es), `compre aquí: ${tj('compre-aqui-hzl').fee?.es}`);

  const b = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_TUNNEL_CONNECTION_FAILED|images\.pexels\.com/.test(m.text())) err.push('console: ' + m.text()); }); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(p);
  await entrar(p, TEL);
  await p.goto(`${B}/panel/${NEG}/vendes`);
  ok(!!(await vis(p.getByText('Inventario', { exact: true }))) && !!(await vis(p.getByText('Inventario del lote', { exact: true }))), 'Lo que vendes › «Inventario» y «Inventario del lote» (Juan Polanco)');
  ok(!(await vis(p.getByText('Citas', { exact: true }))), 'Venta de Autos no muestra citas con depósito (la prueba de manejo llega en 4ie)');
  await clic(p.getByText('Inventario', { exact: true })); await p.getByText('El precio en la puerta: con impuestos, placas y cargos del dealer, antes de firmar.').first().waitFor();
  ok(await ve(p.getByText('EN LA PUERTA $13,163')), 'la lista dice «EN LA PUERTA $13,163» (Civic, del servidor)');
  await p.screenshot({ path: OUT + 'a4ic-inventario-m.png', fullPage: true });

  // Nuevo carro: VIN inválido → el servidor no lo guarda.
  await clic(p.getByRole('button', { name: 'Agregar', exact: true }));
  await p.getByText('Nuevo vehículo', { exact: true }).first().waitFor();
  const malo = '1HGCM82633A004353', bueno = vinCon('2T1BURHEKCTL4C01'), salv = vinCon('2HGFC2F5HHTL4C02');
  await llenar(p, 'VIN', malo);
  ok(await ve(p.getByText('Ese VIN no cuadra con su dígito verificador: revisa letra por letra.')), 'mientras se escribe: «Ese VIN no cuadra con su dígito verificador»');
  await llenar(p, 'AÑO DEL MODELO', '2019'); await llenar(p, 'MARCA', 'Toyota'); await llenar(p, 'MODELO', 'Corolla'); await llenar(p, 'VERSIÓN · OPCIONAL', 'P4IC');
  await llenar(p, 'MILLAJE', '45000');
  await llenar(p, 'PRECIO · ANTES DE IMPUESTO, PLACAS Y CARGOS', '15900');
  const otd1 = puerta(1590000, 39900);
  ok(await ve(p.getByText(`En la puerta: $15,900 + impuesto 6 % $954 + placas y título $150 + cargo del dealer $399 = $${(otd1 / 100).toLocaleString('en-US')}`)), `en vivo, del servidor: «En la puerta … = $${otd1 / 100}» (la fórmula)`);
  ok(await ve(p.getByText(new RegExp(`Pago de ejemplo: \\$${Math.round(pago(otd1, 150000, 1490, 48) / 100)} al mes con \\$1,500 de enganche, 48 meses al 14\\.9 % APR \\(estimado, sujeto a aprobación\\)`))), 'el pago de ejemplo con enganche, meses y APR, «estimado, sujeto a aprobación»');
  await guardar(p);
  ok(await ve(p.getByText('Ese VIN no es válido: revisa las 17 letras y números (sin I, O ni Q).')) && !cid('P4IC'), 'VIN con el dígito equivocado → el servidor no lo guarda');
  await llenar(p, 'VIN', bueno);
  await llenar(p, 'DESCRIPCIÓN · OPCIONAL', 'Un dueño. Solo $250 al mes.');
  await guardar(p);
  ok(await ve(p.getByText(/El pago al mes, a la semana y el enganche los calcula To’Latino/)) && !cid('P4IC'), 'un pago suelto en la descripción no se guarda (Regulation Z)');
  await llenar(p, 'DESCRIPCIÓN · OPCIONAL', 'Un dueño. Gomas nuevas.');
  await guardar(p);
  ok(await espera(() => car('P4IC') === `${bueno}:1590000:${otd1}:39900:${pago(otd1, 150000, 1490, 48)}:limpio:true:lot`), `guardado con el VIN válido y el total del servidor = la fórmula (${car('P4IC')})`);
  const id1 = cid('P4IC');
  ok(Number(sql(`select count(*) from audit_entries where action = 'autos.carro.crear' and target_id = '${NEG}' and after->>'item' = '${id1}'`)) === 1, 'crear el carro deja su línea en la auditoría');
  await p.goto(`${B}/panel/${NEG}/vendes/inventario?det=auto:${id1}`);
  ok(await ve(p.getByText(`En la puerta: $15,900 + impuesto 6 % $954 + placas y título $150 + cargo del dealer $399 = $${(otd1 / 100).toLocaleString('en-US')}`)), 'el editor muestra el desglose que guardó el servidor');
  ok(await ve(p.getByText('Lo que digas de la garantía tiene que ser lo mismo que la Buyers Guide de la ventana del carro.')), 'la garantía va con la nota de la Buyers Guide');
  await p.screenshot({ path: OUT + 'a4ic-carro-m.png', fullPage: true });

  // Salvage: su línea siempre; no va por la calle.
  await p.goto(`${B}/panel/${NEG}/vendes/inventario?det=auto:new`); await p.getByText('Nuevo vehículo', { exact: true }).first().waitFor();
  await llenar(p, 'VIN', salv); await llenar(p, 'AÑO DEL MODELO', '2017'); await llenar(p, 'MARCA', 'Honda'); await llenar(p, 'MODELO', 'Civic'); await llenar(p, 'VERSIÓN · OPCIONAL', 'P4IC SALV');
  await llenar(p, 'MILLAJE', '70000'); await llenar(p, 'PRECIO · ANTES DE IMPUESTO, PLACAS Y CARGOS', '6500');
  await clic(p.getByRole('button', { name: 'Título salvage', exact: true }));
  ok(await ve(p.getByText('Título salvage: no se maneja en la calle hasta pasar la inspección de PA.')), 'salvage: la línea sale en el editor');
  ok(!(await vis(p.getByRole('switch', { name: 'Va por la calle' }))), 'salvage: «Va por la calle» no se puede prender');
  await guardar(p);
  ok(await espera(() => /:salvage:false:lot$/.test(car('P4IC SALV'))), `salvage guardado sin ir por la calle: ${car('P4IC SALV')}`);
  let mal = false; try { sql(`update vehicle_listings set street_legal = true where trim_level = 'P4IC SALV' and status = 'lot'`); } catch { mal = true; }
  ok(mal, 'la base rechaza un salvage que vaya por la calle');
  await p.goto(`${B}/panel/${NEG}/vendes/inventario`);
  ok(await ve(p.getByText(/Título salvage: no se maneja en la calle hasta pasar la inspección de PA\./)), 'salvage: la línea sale en la lista del inventario');
  await p.screenshot({ path: OUT + 'a4ic-salvage-m.png', fullPage: true });

  // Tu herramienta.
  await p.goto(`${B}/panel/${NEG}/vendes/herramienta`); await p.getByText('REGLAS · NO SE APAGAN', { exact: true }).first().waitFor();
  ok(await ve(p.getByText('Total en la puerta antes de firmar')) && await ve(p.getByText('Precio + 6 % + placas + cargo del dealer.')) && await ve(p.getByText('Con ITIN: tasa y meses por escrito')), 'las dos reglas con candado (L443)');
  await p.screenshot({ path: OUT + 'a4ic-herramienta-m.png', fullPage: true });
  const a0 = Number(sql(`select count(*) from audit_entries where action = 'autos.herramienta' and target_id = '${NEG}'`));
  // Cargo del dealer: +$50 → todos los carros; +$50 más pasaría del tope ($477) → no.
  await clic(p.getByRole('button', { name: 'Cargo del dealer +' }));
  ok(await espera(() => sql(`select doc_fee_cents from dealer_settings where business_id = '${NEG}'`) === '44900' && totalesBien()), 'cargo del dealer $449 → el total en la puerta de TODOS los carros recalculado en la misma transacción');
  await clic(p.getByRole('button', { name: 'Cargo del dealer +' }));
  ok(await ve(p.getByText('El cargo del dealer no puede pasar del tope de PA ($477).')) && sql(`select doc_fee_cents from dealer_settings where business_id = '${NEG}'`) === '44900', 'cargo sobre el tope de PA → no se guarda');
  let mal2 = false; try { sql(`update dealer_settings set doc_fee_cents = 50000 where business_id = '${NEG}'`); } catch { mal2 = true; }
  ok(mal2, 'la base rechaza un cargo sobre el tope');
  await clic(p.getByRole('button', { name: 'Cargo del dealer −' }));
  ok(await espera(() => sql(`select doc_fee_cents from dealer_settings where business_id = '${NEG}'`) === '39900' && totalesBien()), 'cargo otra vez $399');
  // ITIN, trade-in, prueba en casa.
  await clic(p.getByRole('switch', { name: 'Financias con ITIN' }));
  ok(await espera(() => !/\bitin\b/.test(fv()) && !/enganche/.test(fv()) && tj().fee?.es === 'Garantía de 3 meses en motor y transmisión'), `sin ITIN → salen itin y enganche, la tarjeta dice la garantía: ${fv()} | ${tj().fee?.es}`);
  await clic(p.getByRole('switch', { name: 'Financias con ITIN' }));
  ok(await espera(() => /\bitin\b/.test(fv()) && /enganche/.test(fv())), 'ITIN otra vez');
  await clic(p.getByRole('switch', { name: 'Aceptas carros a cambio' }));
  ok(await espera(() => !/tradein/.test(fv())), 'sin trade-in → sale el filtro');
  await clic(p.getByRole('switch', { name: 'Aceptas carros a cambio' })); ok(await espera(() => /tradein/.test(fv())), 'trade-in otra vez');
  await clic(p.getByRole('switch', { name: 'Prueba de manejo en casa' }));
  ok(await espera(() => /\bcasa\b/.test(fv())), 'prueba de manejo en casa → filtro casa');
  await clic(p.getByRole('switch', { name: 'Prueba de manejo en casa' })); ok(await espera(() => !/\bcasa\b/.test(fv())), 'y se apaga');
  // Garantía 6 meses → cada carro con la del dealer (lo de la Buyers Guide).
  await clic(p.getByRole('button', { name: '6 meses', exact: true }));
  ok(await espera(() => sql(`select count(*) from vehicle_listings where business_id = '${NEG}' and status <> 'sold' and warranty = 'dealer' and warranty_months <> 6`) === '0' && /garantia/.test(fv())), 'garantía 6 meses → todos los carros con garantía del dealer de 6 meses');
  await clic(p.getByRole('button', { name: 'Se vende como está', exact: true }));
  ok(await espera(() => sql(`select count(*) from vehicle_listings where business_id = '${NEG}' and status <> 'sold' and warranty <> 'como_esta'`) === '0'), 'se vende como está → todos «como está»');
  await clic(p.getByRole('button', { name: '3 meses', exact: true }));
  ok(await espera(() => sql(`select warranty_default from dealer_settings where business_id = '${NEG}'`) === '3'), 'garantía 3 meses otra vez');
  // Enganche con ITIN: +$100 → el pago de ejemplo de todos los carros.
  await clic(p.getByRole('button', { name: 'Enganche con ITIN desde +' }));
  ok(await espera(() => sql(`select itin_down_cents from dealer_settings where business_id = '${NEG}'`) === '160000' && totalesBien() && sql(`select est_payment_cents from vehicle_listings where vin = '2HGFC2F56GATL0001'`) === String(pago(1316300, 160000, 1490, 48))), 'enganche $1,600 → el pago de ejemplo de todos los carros recalculado');
  await clic(p.getByRole('button', { name: 'Enganche con ITIN desde −' }));
  ok(await espera(() => sql(`select itin_down_cents from dealer_settings where business_id = '${NEG}'`) === '150000'), 'enganche $1,500 otra vez');
  ok(Number(sql(`select count(*) from audit_entries where action = 'autos.herramienta' and target_id = '${NEG}'`)) >= a0 + 13, 'cada toque deja su línea en la auditoría (13 toques guardados)');
  // Vendido desde la herramienta: «Carros en el lote» baja.
  const lot0 = Number(sql(`select lot_total from dealer_settings where business_id = '${NEG}'`));
  const ix = Number(sql(`select count(*) from vehicle_listings v join items i on i.id = v.item_id where v.business_id = '${NEG}' and i.removed_at is null and i.status = 'live' and v.status <> 'hidden' and v.status <> 'sold' and (i.sort, i.id) < (select sort, id from items where id = ${id1})`));
  await (await p.getByRole('switch', { name: 'En el lote', exact: true }).nth(ix)).click();
  ok(await espera(() => /:sold$/.test(car('P4IC')) && Number(sql(`select lot_total from dealer_settings where business_id = '${NEG}'`)) === lot0 - 1), `marcar vendido: sale de la app y «Carros en el lote» ${lot0} → ${lot0 - 1}`);
  ok(await espera(() => tj().eta?.es === `${lot0 - 1} carros en el lote`), `la tarjeta: ${tj().eta?.es}`);

  // Escritorio.
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(d);
  await entrar(d, TEL);
  await d.goto(`${B}/panel/${NEG}/vendes/herramienta`); await d.getByText('REGLAS · NO SE APAGAN', { exact: true }).first().waitFor();
  await d.screenshot({ path: OUT + 'a4ic-herramienta-d.png', fullPage: true });
  await d.goto(`${B}/panel/${NEG}/vendes/inventario?det=auto:${cid('P4IC SALV')}`); await d.getByText('ASÍ SE VE EN TU PÁGINA').first().waitFor();
  await d.screenshot({ path: OUT + 'a4ic-carro-d.png', fullPage: true });

  // Free = 5 a la vista.
  sql(`update business_stats_cache set plan = 'free' where business_id = '${NEG}'`);
  await p.goto(`${B}/panel/${NEG}/vendes/inventario?det=auto:new`); await p.getByText('Nuevo vehículo', { exact: true }).first().waitFor();
  await llenar(p, 'VIN', vinCon('1N4AL3APFCTL4C03')); await llenar(p, 'AÑO DEL MODELO', '2015'); await llenar(p, 'MARCA', 'Nissan'); await llenar(p, 'MODELO', 'Altima'); await llenar(p, 'VERSIÓN · OPCIONAL', 'P4IC FREE');
  await llenar(p, 'MILLAJE', '99000'); await llenar(p, 'PRECIO · ANTES DE IMPUESTO, PLACAS Y CARGOS', '5900');
  await guardar(p);
  ok(await ve(p.getByText(/Con Free se ven 5 vehículos/)) && !cid('P4IC FREE'), 'Free: el sexto vehículo a la vista no se guarda');
  await p.screenshot({ path: OUT + 'a4ic-free-m.png', fullPage: true });
  sql(`update business_stats_cache set plan = 'pro' where business_id = '${NEG}'`);

  // Licencias.
  await p.goto(`${B}/panel/${NEG}/pagina/lic`);
  ok(await ve(p.getByRole('button', { name: 'Dealer con licencia de PA', exact: true })) && await ve(p.getByRole('button', { name: 'Venta a plazos de vehículos (PA)', exact: true })), 'Tu página › Licencias: dealer de PA y venta a plazos (sin verificar)');

  // Super Admin: 360 en solo lectura y ocultar con motivo.
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(ad);
  await entrar(ad, '5705550199'); await ad.goto(`${B}/admin/negocios/${NEG}?tab=vende`);
  ok(await ve(ad.getByText('INVENTARIO DEL LOTE · SOLO LECTURA')) && await ve(ad.getByText(new RegExp(`^${lot0 - 1} en el lote · 1 vendido · ITIN desde \\$1,500 · garantía 3 meses · cargo del dealer \\$399`))), 'Super Admin 360: «Inventario del lote» con su resumen (L321)');
  ok(await ve(ad.getByText('El precio en la puerta: con impuestos, placas y cargos del dealer, antes de firmar.')) && await ve(ad.getByText(/Cargo del dealer \$399 · tope de PA \$477/)), 'la línea fija y el cargo con el tope en el 360');
  const N2 = '2017 Honda Civic P4IC SALV', id2 = cid('P4IC SALV');
  const fila = ad.getByText(N2, { exact: true }).first().locator("xpath=ancestor::*[.//*[normalize-space(text())='Ocultar']][1]");
  await fila.getByText('Ocultar', { exact: true }).first().click(); await ad.getByText('Título salvage sin decirlo', { exact: true }).first().click(); await ad.getByText('Confirmar', { exact: true }).first().click();
  ok(await espera(() => sql(`select status || ':' || coalesce(hidden_reason, '') from items where id = ${id2}`) === 'hidden:Título salvage sin decirlo'), 'ocultar un carro con motivo');
  ok(Number(sql(`select count(*) from audit_entries where action = 'autos.carro.ocultar' and target_id = '${NEG}' and reason = 'Título salvage sin decirlo'`)) >= 1, 'y queda en la auditoría');
  await ad.screenshot({ path: OUT + 'a4ic-admin-d.png', fullPage: true });
  // Catálogo › Cargo del dealer: bajar el tope a $350 recalcula los totales de todos (por lotes).
  await ad.goto(`${B}/admin/catalogo?tab=dealer`); await ad.getByText('CARROS A LA VISTA', { exact: true }).first().waitFor();
  await ad.screenshot({ path: OUT + 'a4ic-catalogo-cargo-d.png', fullPage: true });
  await clic(ad.getByRole('button', { name: 'Cambiar el tope' }));
  await llenar(ad, 'TOPE EN DÓLARES', '350'); await ad.getByText('Ajuste anual de PA verificado', { exact: true }).first().click(); await ad.getByText('Guardar', { exact: true }).last().click();
  ok(await espera(() => sql(`select value::text from platform_config where key = 'dealer_doc_fee_cap_cents'`) === '35000'), 'el Admin cambia el tope a $350');
  ok(await espera(() => sql(`select count(*) from vehicle_listings where status <> 'sold' and doc_fee_cents > 35000`) === '0' && sql(`select doc_fee_cents from dealer_settings where business_id = '${NEG}'`) === '35000' && totalesBien()),
    'los cargos que pasaban bajan a $350 y el total en la puerta de todos los carros se recalcula');
  ok(sql(`select otd_cents from vehicle_listings where vin = '2HGFC2F56GATL0001'`) === String(puerta(1190000, 35000)), `Civic: en la puerta ${puerta(1190000, 35000) / 100}`);
  // 9b-1 · Desde 5i el tope es un valor de Configuración: su cambio queda como «config.cambiar» (antes «autos.cargo.tope», que solo seguía en una base vieja).
  ok(Number(sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id = 'dealer_doc_fee_cap_cents' and reason = 'Ajuste anual de PA verificado' and at > now() - interval '5 minutes'`)) >= 1 && Number(sql(`select count(*) from audit_entries where action = 'autos.cargo.bajado_al_tope' and target_id = '${NEG}' and at > now() - interval '5 minutes'`)) >= 1, 'el cambio y cada dealer bajado quedan en la auditoría');
  // Lo dejamos como estaba (tope $477, cargo $399) y el barrido lo pone al día.
  sql(`update platform_config set value = '47700' where key = 'dealer_doc_fee_cap_cents'`);
  sql(CARGOS);
  barrer();
  ok(sql(`select otd_cents from vehicle_listings where vin = '2HGFC2F56GATL0001'`) === '1316300', 'el barrido recalcula con el tope de vuelta ($13,163)');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK autos4ic');
})().catch((e) => { console.error(e); process.exit(1); });
