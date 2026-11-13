// 4ib · Bienes Raíces: «Propiedades» (crear una renta: «Para mudarte» del servidor, depósito > 2 meses rechazado, frase de vivienda justa
// rechazada con su nombre, cuarto con «solo la zona» forzado, horas de visita → class_groups), «Tu herramienta» (ITIN y mascotas → filtros y
// tarjeta; renta y depósito sobre la propiedad; Rentada), venta («Cuota estimada»), préstamos (enganche mínimo y días), Free = 5, Licencias,
// y el Super Admin (360 en solo lectura, ocultar con motivo, revisar mayores, Catálogo › Vivienda justa).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', NEG = 'rentas-hazleton-latino', VEN = 'realty-bilingue-hzl', HIP = 'hipotecas-itin-pa', FREE = 'locales-centro', MAY = 'vivienda-accesible-hazleton', TEL = '5705550433';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const ve = (l) => l.first().waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const tj = (n = NEG) => JSON.parse(sql(`select coalesce(category_attrs->'tarjeta', '{}') from businesses where id = '${n}'`));
const fv = (n = NEG) => sql(`select filter_values from businesses where id = '${n}'`);
const espera = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const llenar = async (p, label, v) => { const x = await vis(p.getByLabel(label, { exact: true })); if (!x) throw new Error('sin campo ' + label); await x.fill(v); };
const guardar = (p) => clic(p.getByRole('button', { name: /^(Agregar|Guardar)$/ }).last());
const prop = (n) => sql(`select pl.kind || ':' || coalesce(pl.rent_cents, 0) || ':' || pl.deposit_cents || ':' || coalesce(pl.move_in_cents, 0) || ':' || pl.addr_public || ':' || pl.status from property_listings pl join items i on i.id = pl.item_id where i.name->>'es' = '${n}' and i.removed_at is null`);
const pid = (n) => sql(`select i.id from items i where i.name->>'es' = '${n}' and i.removed_at is null`);
// La misma fórmula de lib/inmuebles.ts (cuotaEstimada), para comprobar lo que guardó el servidor.
const cuota = (precio, pct) => { const pr = precio * (1 - pct / 100), r = 0.0675 / 12; return Math.round(((pr * r) / (1 - Math.pow(1 + r, -360)) + (precio * 0.025) / 12) / 100) * 100; };
(async () => {
  // Punto de partida conocido: sin propiedades de pruebas anteriores, Yesenia también administra venta, préstamos, Free y mayores.
  sql(`update items set removed_at = now() where name->>'es' like 'Prueba 4ib%' and removed_at is null`);
  sql(`delete from fair_housing_phrases where phrase = 'solo parejas jóvenes'`);
  for (const n of [VEN, HIP, FREE, MAY]) sql(`insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select '${n}', u.id, 'owner', 'Yesenia Batista', '{"es":"Prueba","en":"Test"}'::jsonb, 'active', false, '{all}', 2020, 9, true from users u where u.phone = '+1${TEL}' and not exists (select 1 from business_members m where m.business_id = '${n}' and m.user_id = u.id)`);
  sql(`update property_listings set ssn_required = false, pets = true, status = case when status = 'rented' then 'rented' else 'available' end, rent_cents = case when kind = 'casa' then 140000 else rent_cents end, deposit_cents = case when kind = 'casa' then 140000 else deposit_cents end where business_id = '${NEG}'`);
  sql(`update items i set svc_attrs = svc_attrs || '{"visit_pattern":[{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}]}'::jsonb from property_listings pl where pl.item_id = i.id and pl.business_id = '${NEG}'`);
  sql(`update items set status = 'live', hidden_reason = null where business_id in ('${NEG}', '${MAY}') and status = 'hidden'`);
  sql(`update property_listings set senior_status = 'review' where business_id = '${MAY}' and senior_62`);
  sql(`update inm_settings set min_down_pct = 10, prequal_days = 2, buyer_no_commission = true, itin = true where business_id in ('${HIP}', '${VEN}')`);
  sql(`update property_listings set price_cents = 15900000, est_down_pct = 10, est_payment_cents = ${cuota(15900000, 10)}, status = 'available' where business_id = '${VEN}'`);
  sql(`insert into business_stats_cache (business_id, plan) values ('${FREE}', 'free') on conflict (business_id) do update set plan = 'free'`);
  sql(`update inm_settings set derived_on = null`);
  barrer();
  ok(sql(`select coalesce(last_error, 'ok') from system_jobs where name = 'barrido.inmuebles' and last_run_at > now() - interval '1 minute'`) === 'ok', 'la tarea «inmuebles» corre en el barrido central');
  ok(sql(`select count(*) from inm_settings where derived_on is distinct from (now() at time zone 'America/New_York')::date`) === '0', 'el barrido derivó los 17 negocios');
  const h0 = Number(sql(`select count(*) from class_groups where business_id = '${NEG}' and purpose = 'visita' and status in ('open', 'started')`));
  ok(h0 >= 4 * 5, `horas de visita abiertas 14 días adelante (4 disponibles × 3 por semana): ${h0}`);
  ok(sql(`select count(*) from class_groups g join property_listings pl on pl.item_id = g.item_id where pl.status = 'rented' and g.purpose = 'visita' and g.status = 'open'`) === '0', 'una propiedad rentada no tiene horas de visita');
  let f = fv(); ok(/rentar/.test(f) && /sinssn/.test(f) && /itin/.test(f) && /mascotas/.test(f) && /\bs8\b/.test(f) && /visita/.test(f) && /\besp\b/.test(f) && /y10/.test(f), `filtros derivados (esp y y10 se conservan): ${f}`);
  ok(tj().eta?.es === '4 propiedades disponibles' && tj().fee?.es === 'Para mudarte: primer mes + depósito, sin cargos extra', `tarjeta: ${tj().eta?.es} | ${tj().fee?.es}`);
  ok(tj(HIP).eta?.es === 'Precalificación en 2 días' && /enganche desde 10 % con ITIN/.test(tj(HIP).fee?.es), `préstamos: ${tj(HIP).eta?.es} | ${tj(HIP).fee?.es}`);
  ok(/cuarto/.test(fv('cuartos-dona-mary')) && /^2 cuartos libres desde el /.test(tj('cuartos-dona-mary').eta?.es), `cuartos: ${tj('cuartos-dona-mary').eta?.es}`);
  ok(sql(`select count(*) from items i join property_listings pl on pl.item_id = i.id where coalesce(i.deposit_cents, 0) <> 0`) === '0', 'ninguna propiedad lleva depósito cobrable en el ítem (nada se cobra en la app)');

  const b = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_TUNNEL_CONNECTION_FAILED|images\.pexels\.com/.test(m.text())) err.push('console: ' + m.text()); }); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(p);
  await entrar(p, TEL);
  await p.goto(`${B}/panel/${NEG}/vendes`);
  ok(!!(await vis(p.getByText('Propiedades', { exact: true }))) && !!(await vis(p.getByText('Propiedades y visitas', { exact: true }))), 'Lo que vendes › «Propiedades» y «Propiedades y visitas» (Yesenia)');
  ok(!(await vis(p.getByText('Citas', { exact: true }))), 'Bienes Raíces no muestra citas con depósito (la visita llega en 4ie)');
  await clic(p.getByText('Propiedades', { exact: true })); await p.getByText('Lo que pagas para mudarte está completo aquí: nadie cobra por ver una propiedad.').first().waitFor();
  ok(await ve(p.getByText('Igualdad de oportunidad en la vivienda', { exact: false })), 'la lista lleva el pie de igualdad de oportunidad');
  await p.screenshot({ path: OUT + 'i4ib-propiedades-m.png', fullPage: true });

  // Nueva renta: depósito > 2 meses no se guarda.
  const N1 = 'Prueba 4ib · 2 recámaras · 7 N Pine St';
  await clic(p.getByRole('button', { name: 'Agregar', exact: true }));
  await p.getByText('Nueva propiedad', { exact: true }).first().waitFor();
  await llenar(p, 'NOMBRE · LO VE LA GENTE', N1);
  await llenar(p, 'RENTA AL MES', '1000'); await llenar(p, 'DEPÓSITO', '2500'); await llenar(p, 'CUOTA DE SOLICITUD', '50');
  await llenar(p, 'LO QUE PIDEN · SOLO QUÉ PAPELES', '2 recibos de pago o carta del trabajo y una ID.');
  await llenar(p, 'CALLE Y NÚMERO', '7 N Pine St'); await llenar(p, 'CÓDIGO POSTAL', '18201');
  await clic(p.getByRole('button', { name: 'Sáb', exact: true })); await clic(p.getByRole('button', { name: 'Agregar hora', exact: true }));
  ok(await ve(p.getByText('Calculated when you save').or(p.getByText('Se calcula al guardar'))), 'antes de guardar: «Para mudarte» se calcula en el servidor');
  await guardar(p);
  ok(await ve(p.getByText('El depósito no puede pasar de 2 meses de renta.')) && !pid(N1), 'depósito de $2,500 con renta de $1,000 → no se guarda');
  // Vivienda justa: la frase se nombra y no se guarda nada.
  const a0 = Number(sql(`select count(*) from audit_entries where action = 'inm.vivienda_justa.frenada'`));
  await llenar(p, 'DEPÓSITO', '1000'); await llenar(p, 'DESCRIPCIÓN · OPCIONAL', 'Ideal para pareja, no niños.');
  await guardar(p);
  ok(await ve(p.getByText(/No puede ir «no niños»/)) && !pid(N1), 'la frase «no niños» → no se guarda y el panel dice cuál');
  ok(Number(sql(`select count(*) from audit_entries where action = 'inm.vivienda_justa.frenada'`)) === a0 + 1, 'la frase frenada queda en la auditoría');
  await p.screenshot({ path: OUT + 'i4ib-vivienda-justa-m.png', fullPage: true });
  await llenar(p, 'DESCRIPCIÓN · OPCIONAL', 'Sin seguro social. Cerca de la escuela.'); await llenar(p, 'DESCRIPCIÓN EN INGLÉS · OPCIONAL', 'No kids allowed.');
  await guardar(p);
  ok(await ve(p.getByText(/No puede ir «no kids»/)) && !pid(N1), 'también en inglés: «no kids»');
  await llenar(p, 'DESCRIPCIÓN EN INGLÉS · OPCIONAL', 'Near the school.');
  await guardar(p);
  ok(await espera(() => prop(N1) === 'apto:100000:100000:205000:true:available'), `guardada: «Para mudarte» del servidor = $1,000 + $1,000 + $50 = $2,050 (${prop(N1)})`);
  const id1 = pid(N1);
  ok(Number(sql(`select count(*) from class_groups where item_id = ${id1} and purpose = 'visita' and status = 'open' and start_min = 600`)) >= 1, 'su hora de visita (sábado 10 AM) → class_groups de un día, 14 días adelante');
  await p.goto(`${B}/panel/${NEG}/vendes/propiedades?det=inm:${id1}`);
  ok(await ve(p.getByText('Para mudarte: $1,000 + depósito $1,000 + solicitud $50 = $2,050')), 'el panel muestra «Para mudarte» que calculó el servidor');
  ok(await ve(p.getByText(/Igualdad de oportunidad en la vivienda\. Los animales de servicio y de apoyo no son mascotas: se aceptan siempre\./)) && await ve(p.getByText('Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.')), 'la propiedad lleva el pie, la nota de animales y la línea contra estafas');
  await p.screenshot({ path: OUT + 'i4ib-propiedad-m.png', fullPage: true });

  // Cuarto: «solo la zona» forzado.
  const N2 = 'Prueba 4ib · Cuarto · North End';
  await p.goto(`${B}/panel/${NEG}/vendes/propiedades?det=inm:new`); await p.getByText('Nueva propiedad', { exact: true }).first().waitFor();
  await clic(p.getByRole('button', { name: 'Cuarto', exact: true }));
  ok(!(await vis(p.getByRole('switch', { name: 'Mostrar solo la zona' }))) && await ve(p.getByText('En cuartos la dirección exacta llega cuando confirmas la visita.')), 'cuarto: «Mostrar solo la zona» no se puede apagar');
  await llenar(p, 'NOMBRE · LO VE LA GENTE', N2); await llenar(p, 'RENTA AL MES', '500'); await llenar(p, 'DEPÓSITO', '250');
  await llenar(p, 'CALLE Y NÚMERO', '9 W Oak St'); await llenar(p, 'CÓDIGO POSTAL', '18201');
  await clic(p.getByRole('button', { name: 'Vie', exact: true })); await clic(p.getByRole('button', { name: 'Agregar hora', exact: true }));
  await guardar(p);
  ok(await espera(() => prop(N2) === 'cuarto:50000:25000:75000:false:available'), `cuarto guardado con la dirección oculta (addr_public = false): ${prop(N2)}`);
  let mal = false; try { sql(`update property_listings set addr_public = true where item_id = ${pid(N2)}`); } catch { mal = true; }
  ok(mal, 'la base rechaza un cuarto con la dirección pública');

  // Tu herramienta: ITIN y mascotas → filtros; renta y depósito sobre la propiedad; Rentada.
  await p.goto(`${B}/panel/${NEG}/vendes/herramienta`); await p.getByText('REGLAS · NO SE APAGAN', { exact: true }).first().waitFor();
  ok(await ve(p.getByText('Ver la propiedad es gratis')) && await ve(p.getByText('Para mudarte: primer mes + depósito')), 'reglas con candado');
  await p.screenshot({ path: OUT + 'i4ib-herramienta-m.png', fullPage: true });
  await clic(p.getByRole('switch', { name: 'Sin seguro social · aceptas ITIN' }));
  ok(await espera(() => !/sinssn/.test(fv()) && sql(`select bool_and(ssn_required) from property_listings where business_id = '${NEG}' and kind not in ('local','oficina','bodega','cocina','salon','almacen','parqueo')`) === 't'), `sin ITIN → todas piden seguro social y sale el filtro sinssn: ${fv()}`);
  await clic(p.getByRole('switch', { name: 'Sin seguro social · aceptas ITIN' }));
  ok(await espera(() => /sinssn/.test(fv()) && /itin/.test(fv())), 'ITIN otra vez → sinssn e itin');
  await clic(p.getByRole('switch', { name: 'Aceptas mascotas' }));
  ok(await espera(() => !/mascotas/.test(fv())), 'sin mascotas → sale el filtro mascotas');
  await clic(p.getByRole('switch', { name: 'Aceptas mascotas' })); ok(await espera(() => /mascotas/.test(fv())), 'mascotas otra vez');
  const casa = '3 cuartos · casa · 90 W Diamond Ave', idc = pid(casa);
  const n0 = (await p.getByRole('button', { name: 'Renta al mes +' }).count());
  const ix = Number(sql(`select count(*) from property_listings pl join items i on i.id = pl.item_id where pl.business_id = '${NEG}' and pl.rent_cents is not null and pl.status in ('available','pending') and i.removed_at is null and i.status = 'live' and (i.sort, i.id) < (select sort, id from items where id = ${idc})`));
  await (await p.getByRole('button', { name: 'Renta al mes +' }).nth(ix)).click();
  ok(await espera(() => prop(casa) === 'casa:142500:140000:282500:true:available'), `renta +$25 sobre la propiedad y «Para mudarte» recalculado: ${prop(casa)} (${n0} pasos)`);
  await (await p.getByRole('button', { name: 'Depósito +' }).nth(ix)).click();
  ok(await espera(() => prop(casa) === 'casa:142500:142500:285000:true:available'), `depósito +$25: ${prop(casa)}`);
  ok(Number(sql(`select count(*) from audit_entries where action = 'inm.herramienta' and target_id = '${NEG}' and at > now() - interval '5 minutes'`)) >= 6, 'cada toque deja su línea en la auditoría');
  // Una hora de visita apagada → sus grupos sin pedir se cancelan.
  const ida = pid('2 cuartos · 312 Alter St'), jue = () => Number(sql(`select count(*) from class_groups where item_id = ${ida} and purpose = 'visita' and status = 'open' and extract(dow from starts_on) = 4`));
  const vis0 = jue();
  await clic(p.getByRole('button', { name: 'Jue 5 PM', exact: true }));
  ok(vis0 > 0 && await espera(() => jue() === 0), `apagar «Jue 5 PM» (312 Alter St) cierra esas horas (nadie las había pedido): ${vis0} → ${jue()}`);
  await clic(p.getByRole('button', { name: 'Jue 5 PM', exact: true }));
  // Rentada.
  await clic(p.getByRole('switch', { name: 'Disponible' }).last());
  ok(await espera(() => /:rented$/.test(prop(N2)) || /:rented$/.test(prop(N1))), 'marcar «Rentada» desde la herramienta');
  const rent = /:rented$/.test(prop(N1)) ? N1 : N2;
  ok(sql(`select count(*) from class_groups where item_id = ${pid(rent)} and purpose = 'visita' and status = 'open'`) === '0', 'rentada: sus horas de visita se cierran');
  ok(await espera(() => tj().eta?.es === '5 propiedades disponibles'), `la tarjeta cuenta las disponibles: ${tj().eta?.es}`);

  // Escritorio.
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(d);
  await entrar(d, TEL);
  await d.goto(`${B}/panel/${NEG}/vendes/herramienta`); await d.getByText('REGLAS · NO SE APAGAN', { exact: true }).first().waitFor();
  await d.screenshot({ path: OUT + 'i4ib-herramienta-d.png', fullPage: true });
  await d.goto(`${B}/panel/${NEG}/vendes/propiedades?det=inm:${id1}`); await d.getByText('ASÍ SE VE EN TU PÁGINA').first().waitFor();
  await d.screenshot({ path: OUT + 'i4ib-propiedad-d.png', fullPage: true });

  // Venta: «Cuota estimada» calculada por el servidor.
  await p.goto(`${B}/panel/${VEN}/vendes/herramienta`); await p.getByText('Casas en venta', { exact: true }).first().waitFor();
  ok(await ve(p.getByText(/Cuota estimada \$1,259 al mes con 10 % de enganche/)), 'venta: «Cuota estimada $1,259 al mes con 10 % de enganche»');
  await clic(p.getByRole('button', { name: 'Precio +' }));
  ok(await espera(() => sql(`select price_cents || ':' || est_payment_cents from property_listings where business_id = '${VEN}'`) === `16000000:${cuota(16000000, 10)}`), `precio +$1,000 → la cuota estimada la recalcula el servidor (${cuota(16000000, 10) / 100})`);
  await clic(p.getByRole('switch', { name: 'Comprador sin comisión' }));
  ok(await espera(() => !/nocom/.test(fv(VEN))), 'sin «comprador sin comisión» → sale el filtro nocom');
  await clic(p.getByRole('switch', { name: 'Comprador sin comisión' })); await espera(() => /nocom/.test(fv(VEN)));
  ok(await ve(p.getByText('La cuota dice «estimada»')), 'regla «La cuota dice «estimada»»');
  await p.screenshot({ path: OUT + 'i4ib-venta-m.png', fullPage: true });

  // Préstamos.
  await p.goto(`${B}/panel/${HIP}/vendes/herramienta`); await p.getByText('Préstamos y requisitos', { exact: true }).first().waitFor();
  await clic(p.getByRole('button', { name: '15 %', exact: true }));
  ok(await espera(() => /enganche desde 15 % con ITIN/.test(tj(HIP).fee?.es ?? '')), `enganche mínimo 15 %: ${tj(HIP).fee?.es}`);
  await clic(p.getByRole('button', { name: '3 días', exact: true }));
  ok(await espera(() => tj(HIP).eta?.es === 'Precalificación en 3 días'), `días para precalificar: ${tj(HIP).eta?.es}`);
  ok(await ve(p.getByText('Y no te compromete.')), 'sin consulta suave: «Precalificar es gratis · Y no te compromete.» (§6 #8)');
  await clic(p.getByRole('switch', { name: 'Precalificas sin afectar el crédito' }));
  ok(await ve(p.getByText('Y no afecta tu crédito.')), 'con consulta suave: «Y no afecta tu crédito.»');
  await p.screenshot({ path: OUT + 'i4ib-prestamos-m.png', fullPage: true });
  await clic(p.getByRole('switch', { name: 'Precalificas sin afectar el crédito' }));

  // Free = 5 a la vista.
  for (let i = 1; i <= 3; i++) sql(`with it as (insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs) values ('${FREE}', 'svc', '{"es":"Prueba 4ib · Local ${i}","en":"Prueba 4ib · Local ${i}"}', '{}', 50000, 30, 'renta', '{"visit_pattern":[{"dow":1,"min":600,"on":true}],"cupo":1}') returning id)
    insert into property_listings (item_id, business_id, city_id, kind, rent_cents, move_in_cents, addr_line, zip, status) select id, '${FREE}', 'hzl', 'local', 50000, 50000, '${i} W Broad St', '18201', 'available' from it`);
  await p.goto(`${B}/panel/${FREE}/vendes/propiedades?det=inm:new`); await p.getByText('Nueva propiedad', { exact: true }).first().waitFor();
  await clic(p.getByRole('button', { name: 'Local comercial', exact: true }));
  await llenar(p, 'NOMBRE · LO VE LA GENTE', 'Prueba 4ib · Local 6'); await llenar(p, 'RENTA AL MES', '900');
  await llenar(p, 'CALLE Y NÚMERO', '6 W Broad St'); await llenar(p, 'CÓDIGO POSTAL', '18201');
  await guardar(p);
  ok(await ve(p.getByText(/Con Free se ven 5 propiedades/)) && !pid('Prueba 4ib · Local 6'), 'Free: la sexta propiedad a la vista no se guarda');
  await p.screenshot({ path: OUT + 'i4ib-free-m.png', fullPage: true });

  // Licencias.
  await p.goto(`${B}/panel/${NEG}/pagina/lic`);
  ok(await ve(p.getByRole('button', { name: 'Corredor o vendedor de bienes raíces de PA', exact: true })) && await ve(p.getByRole('button', { name: 'Prestamista con licencia (NMLS)', exact: true })), 'Tu página › Licencias: corredor de PA y NMLS (sin verificar)');

  // Super Admin.
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(ad);
  await entrar(ad, '5705550199'); await ad.goto(`${B}/admin/negocios/${NEG}?tab=vende`);
  ok(await ve(ad.getByText('PROPIEDADES Y VISITAS · SOLO LECTURA')) && await ve(ad.getByText(/5 disponibles · sin seguro social/)), 'Super Admin 360: «Propiedades y visitas» con su resumen');
  ok(await ve(ad.getByText('Lo que pagas para mudarte está completo aquí: nadie cobra por ver una propiedad.')), 'la línea fija en el 360');
  ok(!(await vis(ad.getByText(/9 W Oak St/))), 'el 360 no muestra la dirección exacta del cuarto');
  const fila = ad.getByText(N1, { exact: true }).first().locator("xpath=ancestor::*[.//*[normalize-space(text())='Ocultar']][1]");
  await fila.getByText('Ocultar', { exact: true }).first().click(); await ad.getByText('Texto contra la vivienda justa', { exact: true }).first().click(); await ad.getByText('Confirmar', { exact: true }).first().click();
  ok(await espera(() => sql(`select status || ':' || coalesce(hidden_reason, '') from items where id = ${id1}`) === 'hidden:Texto contra la vivienda justa'), 'ocultar una propiedad con motivo');
  ok(Number(sql(`select count(*) from audit_entries where action = 'inm.propiedad.ocultar' and target_id = '${NEG}' and reason = 'Texto contra la vivienda justa'`)) >= 1, 'y queda en la auditoría');
  ok(sql(`select count(*) from class_groups where item_id = ${id1} and purpose = 'visita' and status = 'open'`) === '0', 'oculta: sus horas de visita se cierran');
  await ad.screenshot({ path: OUT + 'i4ib-admin-d.png', fullPage: true });
  await ad.goto(`${B}/admin/negocios/${MAY}?tab=vende`);
  await clic(ad.getByText('Confirmar mayores', { exact: true })); await ad.getByText('Declaración revisada', { exact: true }).first().click(); await ad.getByText('Confirmar', { exact: true }).last().click();
  ok(await espera(() => sql(`select senior_status from property_listings where business_id = '${MAY}' and senior_62`) === 'ok'), 'el Super Admin confirma la vivienda para mayores (auditado)');
  await ad.goto(`${B}/admin/catalogo?tab=vj`); await ad.getByText('ESPAÑOL', { exact: true }).first().waitFor();
  ok(await ve(ad.getByText('SIEMPRE').first()), 'Catálogo › Vivienda justa: las de fábrica dicen «SIEMPRE»');
  await clic(ad.getByRole('button', { name: 'Agregar frase' }));
  await (await vis(ad.getByRole('textbox').last())).fill('es: solo parejas jóvenes'); await ad.getByText('Agregar', { exact: true }).last().click();
  ok(await espera(() => sql(`select count(*) from fair_housing_phrases where phrase = 'solo parejas jóvenes' and lang = 'es' and active`) === '1'), 'el Admin agrega una frase');
  ok(Number(sql(`select count(*) from audit_entries where action = 'catalogo.vivienda_justa.agregar'`)) >= 1, 'y queda en la auditoría');
  await ad.screenshot({ path: OUT + 'i4ib-catalogo-vj-d.png', fullPage: true });
  // La frase nueva frena el siguiente guardado del panel.
  await p.goto(`${B}/panel/${NEG}/vendes/propiedades?det=inm:${pid(casa)}`); await p.getByText('ASÍ SE VE EN TU PÁGINA').first().waitFor();
  await llenar(p, 'DESCRIPCIÓN · OPCIONAL', 'Ideal: solo parejas jóvenes.'); await guardar(p);
  ok(await ve(p.getByText(/No puede ir «solo parejas jóvenes»/)), 'la frase que agregó el Admin frena el anuncio al guardar');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK inm4ib');
})().catch((e) => { console.error(e); process.exit(1); });
