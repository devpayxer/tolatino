// 9n · Cotizaciones y Staff por ciudad (LAUNCH «Cotizaciones y Staff por ciudad», 18 nov). De punta a punta, en el Super Admin (escritorio 1360 y
// teléfono 390) y del lado público (teléfono 390 y escritorio 1360):
// 1. Cotizaciones apagado en Hazleton (Catálogo › Módulos › Cotizaciones): la hoja de un servicio de Hogar no ofrece «Pedir a hasta 3» ni «Pedir
//    pre-estimado»; sus páginas /presupuestos y /preestimado devuelven a la ficha; la hoja de una mudanza (Transporte) y la de un servicio de
//    Fiestas que se cotiza dicen «Llama…» en vez de pedir el precio; el SERVIDOR rechaza un pedido que sale de una pantalla vieja (se abre el
//    pre-estimado con Cotizaciones encendido, se apaga, se envía) con «Este negocio no recibe solicitudes de precio…». Un negocio nuevo de Hazleton
//    llega con la pausa. Al encender, todo vuelve y el mismo pedido entra.
// 2. Staff apagado en Hazleton: la ficha de una barbería no muestra la pestaña «Equipo» ni el riel de personas (teléfono y escritorio), pero
//    RESERVAR no se rompe (el selector de persona y la hora siguen). Al encender, vuelven.
// 3. Negocios 360°: la pausa de UN negocio funciona para los dos (Equipo › Módulo › Staff; Lo que vende › Cotizaciones) y la de toda la ciudad no se
//    levanta para uno solo. El dueño ve el motivo en su panel.
// Todo vuelve como estaba (aunque la prueba se corte). La foto del pedido es un archivo de prueba: se simula la subida (no hay almacén de fotos en la
// base local) con una fila de media del propio usuario.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel, nombre) => {
  await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`);
  const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); const v = await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba });
  if (!v.ok) throw new Error('no entró ' + tel);
  if (nombre && !v.nombre) await api(p, '/api/cuenta/perfil', { nombre, apellido: 'Prueba' });
};
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const hasta = async (f, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 250)); } return false; };
const t = (p, x) => p.getByText(x, { exact: true }).last();
const shot = async (p, nombre, full = false) => { await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'cat9n2-' + nombre, fullPage: full }); };
const switchDe = (p, texto) => p.getByText(texto, { exact: true }).first().locator("xpath=ancestor::*[.//*[@role='switch']][1]").getByRole('switch').first();
const confirmar = async (p, { motivo, cta, afecta }) => {
  if (afecta) { await p.locator(`text=${afecta}`).first().waitFor({ timeout: 8000 }); ok(true, `la confirmación dice «${afecta.source ?? afecta}»`); }
  await p.locator('textarea').last().fill(motivo);
  await t(p, cta).click();
};
let K = ''; const audit = (accion, objetivo) => sql(`select count(*) from audit_entries where action = '${accion}' and target_id = '${objetivo}' and reason like 'cat9n2 ${K} %'`);

(async () => {
  const k = String(Date.now() % 100000).padStart(5, '0'); K = k;
  const HOGAR = 'calefaccion-aire-cibao', SVC_PRE = 'Diagnóstico de calefacción', SVC_PQ = 'Caldera o sistema nuevo', ID_PRE = sql(`select id from items where business_id = '${HOGAR}' and name->>'es' = '${SVC_PRE}' and removed_at is null`), ID_PQ = sql(`select id from items where business_id = '${HOGAR}' and name->>'es' = '${SVC_PQ}' and removed_at is null`);
  const MUDANZA = 'mudanzas-el-primo', ID_MUD = '739', FIESTA = 'andrea-events', ID_FIESTA = '688';
  const PLOM = 'plomeria-rodriguez', BARB = 'barberia-el-primo', N3 = `cat9n2-nuevo-${k}`, TELU = '5705550792';
  // Precondición propia: lo que una vuelta anterior pudo dejar a medias vuelve como estaba.
  for (const mo of ['cot', 'staff']) sql(`select catalogo_modulo_ciudad('${mo}', 'hzl', false, 'cat9n2', 'cat9n2') where exists (select 1 from module_types where key = '${mo}' and 'hzl' = any(off_cities))`);
  sql(`update businesses set modules_off = modules_off - 'cot' - 'staff' where modules_off->'cot'->>'reason' like 'cat9n2%' or modules_off->'staff'->>'reason' like 'cat9n2%'`);
  ok(sql(`select count(*) from businesses where modules_off ? 'cot' or modules_off ? 'staff'`) === '0', 'precondición: ningún negocio trae Cotizaciones ni Staff en pausa');
  ok(ID_PRE && ID_PQ, `precondición: ${HOGAR} tiene «${SVC_PRE}» (${ID_PRE}) y «${SVC_PQ}» (${ID_PQ})`);
  const b = await chromium.launch(); const err = [], abiertas = [];
  const mk = async (o, tel, nombre) => { const cx = await b.newContext(o); abiertas.push(cx); const p = await cx.newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_|Access-Control|favicon/.test(x.text())) err.push('console ' + x.text()); }); if (tel) await entrar(p, tel, nombre); return p; };
  const TEL = { width: 390, height: 844 }, TELO = { viewport: TEL, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, DESK = { viewport: { width: 1360, height: 900 } };
  let volver = { cot: false, staff: false };
  const apagarCiudad = async (p, mo, nombre, desk, esperado) => {
    await p.goto(B + '/admin/catalogo?m=' + mo); await p.locator('text=ACTIVO POR CIUDAD').first().waitFor();
    const nn = sql(`select count(*) from businesses b where b.city_id = 'hzl' and b.status = 'active' and exists (select 1 from categories k where k.id = b.category_id and k.allowed_modules ? '${mo}')`);
    await switchDe(p, 'Hazleton').click(); volver[mo] = true;
    await confirmar(p, { afecta: new RegExp(`Afecta a ${nn} negocios? en Hazleton`), motivo: `cat9n2 ${k} ${mo} apaga`, cta: 'Apagar' });
    await p.locator('text=/Apagado en esa ciudad/').first().waitFor(); await shot(p, `${mo}-ciudad-${desk ? 'd' : 'm'}.png`);
    ok(sql(`select count(*) from businesses where city_id = 'hzl' and not (modules_off ? '${mo}')`) === '0' && audit('catalogo.modulo.ciudad_apagar', mo) === esperado, `${mo}: todos los negocios de Hazleton en pausa y en la auditoría (${esperado})`);
  };
  const encenderCiudad = async (p, mo, esperado) => {
    await p.goto(B + '/admin/catalogo?m=' + mo); await p.locator('text=ACTIVO POR CIUDAD').first().waitFor();
    await switchDe(p, 'Hazleton').click(); await confirmar(p, { motivo: `cat9n2 ${k} ${mo} vuelve`, cta: 'Encender' });
    await p.locator('text=/Encendido otra vez/').first().waitFor(); volver[mo] = false;
    ok(sql(`select count(*) from businesses where modules_off->'${mo}'->>'ciudad' = 'true'`) === '0' && audit('catalogo.modulo.ciudad_encender', mo) === esperado, `${mo}: encendido, sin pausas de la ciudad y en la auditoría (${esperado})`);
  };
  try {
    const a = await mk(DESK, '5705550199'), am = await mk(TELO, '5705550199'), v = await mk(TELO, null), vd = await mk(DESK, null), u = await mk(TELO, TELU, 'Catalina');
    ok(sql(`select count(*) from module_types where key in ('cot', 'staff')`) === '2', 'los dos módulos existen en module_types');
    // La hoja de un servicio de Hogar (teléfono): ¿ofrece pedir el precio?
    const hoja = async (p, neg, svc, texto) => { await p.goto(B + `/n/${neg}?tab=svc`); await p.waitForLoadState('networkidle'); await p.getByText(svc, { exact: true }).first().click(); await p.locator(`text=${texto}`).first().waitFor({ timeout: 8000 }).catch(() => {}); await p.waitForTimeout(500); return p.locator('body').innerText(); };

    console.log('1 · Cotizaciones apagado en Hazleton');
    const antes = await hoja(v, HOGAR, SVC_PRE, 'Pedir pre-estimado'); ok(antes.includes('Pedir pre-estimado'), 'antes: la hoja de un diagnóstico ofrece «Pedir pre-estimado»');
    const antesPq = await hoja(v, HOGAR, SVC_PQ, 'Pedir a hasta 3'); ok(antesPq.includes('Pedir a hasta 3'), 'antes: la hoja de un servicio «presupuesto» ofrece «Pedir a hasta 3»');
    ok((await v.goto(B + `/n/${HOGAR}/preestimado?s=${ID_PRE}`)).url().includes('/preestimado'), 'antes: /preestimado abre');
    // Un pedido desde una pantalla que se queda abierta: se arma con Cotizaciones encendido y se envía con Cotizaciones apagado.
    // Nada se borra: lo que una vuelta anterior dejó esperando se cancela (así «uno abierto por servicio» no abre ese en vez de crear el nuevo).
    sql(`update service_requests set status = 'cancelled' where user_id = (select id from users where phone = '+1${TELU}') and status = 'sent'`);
    const U = sql(`select id from users where phone = '+1${TELU}'`);
    if (sql(`select count(*) from user_homes where user_id = '${U}' and removed_at is null`) === '0') {
      const AD = sql(`insert into user_addresses (user_id, label, street, zip, city_id, is_default) values ('${U}', 'casa', '1 Calle Cat9n2', '18201', 'hzl', true) returning id`).split('\n')[0];
      sql(`insert into user_homes (user_id, address_id, kind, tenure, is_default) values ('${U}', '${AD}', 'casa', 'dueno', true)`);
    }
    const FOTO = sql(`insert into media (owner_kind, owner_id, url, uploaded_by, status) values ('user', '${U}', '/cat9n2-foto.jpg', '${U}', 'visible') returning id`);
    const subirFalso = (id) => u.route('**/api/medios', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, id, url: '/cat9n2-foto.jpg' }) }));
    const enviarPre = async (nota, foto) => {
      await subirFalso(foto); await u.goto(B + `/n/${HOGAR}/preestimado?s=${ID_PRE}`); await u.waitForLoadState('networkidle');
      await u.getByText('Cocina', { exact: true }).first().click();
      await u.getByLabel(/Cuéntanos|Qué pasa|qué pasa/i).first().fill(nota).catch(async () => { await u.locator('textarea').first().fill(nota); });
      await u.locator('input[type=file]').setInputFiles({ name: 'f.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('cat9n2 foto de prueba (la subida se simula)') });
      await hasta(async () => (await u.locator('[style*="cat9n2-foto"]').count()) > 0);
      return u;
    };
    await enviarPre(`cat9n2 ${k} se me fue el calor de la calefacción`, FOTO);
    const msgs = []; u.on('response', async (r) => { if (r.request().method() === 'POST' && r.url().includes('/preestimado')) msgs.push(await r.text().catch(() => '')); });
    ok(await hasta(async () => (await u.getByRole('button', { name: /Enviar para pre-estimado/ }).isEnabled())), 'el pedido está completo (pantalla abierta, Cotizaciones encendido)');
    await apagarCiudad(a, 'cot', 'Cotizaciones', true, '1');
    await u.getByRole('button', { name: /Enviar para pre-estimado/ }).click();
    ok(await hasta(async () => (await u.locator('body').innerText()).includes('no recibe solicitudes de precio')), 'el servidor rechaza el pedido de la pantalla vieja: «Este negocio no recibe solicitudes de precio en línea por ahora»');
    await shot(u, 'cot-rechazo-m.png');
    ok(sql(`select count(*) from service_requests where user_id = '${U}' and form->>'nota' like 'cat9n2 ${k}%'`) === '0', 'no se guardó ningún pedido');
    // Las entradas ya no salen
    const dHoja = await hoja(v, HOGAR, SVC_PRE, 'Pedir pre-estimado'); ok(!dHoja.includes('Pedir pre-estimado') && !dHoja.includes('No sabes cuánto'), 'la hoja de un diagnóstico (390) ya no ofrece el pre-estimado');
    await shot(v, 'cot-hoja-m.png');
    const dPq = await hoja(v, HOGAR, SVC_PQ, 'Pedir a hasta 3'); ok(!dPq.includes('Pedir a hasta 3') && !dPq.includes('Quieres comparar'), 'la hoja de un servicio «presupuesto» (390) ya no ofrece «Pedir a hasta 3»');
    const dHojaD = await hoja(vd, HOGAR, SVC_PRE, 'Pedir pre-estimado'); ok(!dHojaD.includes('Pedir pre-estimado'), 'en escritorio (1360) tampoco se ofrece el pre-estimado');
    await shot(vd, 'cot-hoja-d.png');
    ok(!(await v.goto(B + `/n/${HOGAR}/preestimado?s=${ID_PRE}`)).url().includes('/preestimado') && !(await v.goto(B + `/n/${HOGAR}/presupuestos?s=${ID_PQ}`)).url().includes('/presupuestos'), '/preestimado y /presupuestos devuelven a la ficha');
    const mud = await hoja(v, MUDANZA, 'Apartamento de 1 cuarto', 'Llama para reservar'); ok(mud.includes('Llama para reservar') && !mud.includes('Pedir precio cerrado'), 'la hoja de una mudanza (Transporte) dice «Llama para reservar» y no «Pedir precio cerrado»');
    ok(!(await v.goto(B + `/n/${MUDANZA}/viaje?s=${ID_MUD}`)).url().includes('/viaje?'), '/viaje de la mudanza devuelve a la ficha');
    const fie = await hoja(v, FIESTA, 'Boda completa', 'Llama para tu fecha'); ok(fie.includes('Llama para tu fecha') && !fie.includes('Pedir la fecha'), 'la hoja de un servicio de Fiestas que se cotiza dice «Llama para tu fecha»');
    sql(`insert into businesses (id, city_id, category_id, name, status, origin) values ('${N3}', 'hzl', 'NEG-HOGAR', 'Cat9n2 Nuevo ${k}', 'active', 'self')`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${N3}', 'free') on conflict do nothing`);
    ok(sql(`select modules_off->'cot'->>'ciudad' from businesses where id = '${N3}'`) === 'true', 'un negocio nuevo de Hazleton llega con Cotizaciones en pausa');
    await am.goto(B + '/admin/catalogo?tab=mod'); await am.locator('text=Cotizaciones').first().waitFor(); await shot(am, 'cot-modulos-m.png');
    // Encender: todo vuelve y el MISMO pedido entra
    await encenderCiudad(am, 'cot', '1');
    const d2 = await hoja(v, HOGAR, SVC_PRE, 'Pedir pre-estimado'); ok(d2.includes('Pedir pre-estimado'), 'encendido: la hoja vuelve a ofrecer el pre-estimado');
    await u.getByRole('button', { name: /Enviar para pre-estimado/ }).click();
    ok(await hasta(async () => /\/pre\/P-\d+/.test(u.url()) || (await u.locator('body').innerText()).match(/P-\d+/)), 'el mismo pedido ya entra (P-…)');
    ok(sql(`select count(*) from service_requests where user_id = '${U}' and form->>'nota' like 'cat9n2 ${k}%'`) === '1', 'queda UN pedido guardado');
    await shot(u, 'cot-pedido-m.png');

    console.log('2 · Staff apagado en Hazleton: la página no presenta al equipo; reservar sigue');
    const fichaTxt = async (p) => { await p.goto(B + `/n/${BARB}`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(500); return p.locator('body').innerText(); };
    const tabEquipo = async (p) => (await p.getByRole('tab', { name: /^Barberos|^Equipo|^Staff/i }).count()) + (await p.getByText(/^(Barberos|Equipo)$/, { exact: true }).count());
    const NOM = sql(`select display_name from business_members where business_id = '${BARB}' and status = 'active' and show_on_page and kind <> 'owner' order by sort limit 1`).split(' ')[0];
    const f1 = await fichaTxt(v); ok(f1.includes(NOM) && /Ver todos/.test(f1), `antes: la ficha (390) presenta al equipo (el riel con «${NOM}» y «Ver todos»)`);
    ok((await v.getByRole('tab').allInnerTexts().catch(() => [])).concat(await v.locator('[role=tablist] *').allInnerTexts().catch(() => [])).join(' ').match(/Barberos|Equipo|Staff/i) !== null, 'antes: la ficha (390) tiene la pestaña del equipo'); await shot(v, 'staff-ficha-antes-m.png');
    const f1d = await fichaTxt(vd); const eqD = (p) => p.getByText('Equipo', { exact: true }).count(); ok(await eqD(vd) > 0 && f1d.includes(NOM), 'antes: la ficha (1360) tiene la pestaña «Equipo» y presenta al equipo'); await shot(vd, 'staff-ficha-antes-d.png');
    await apagarCiudad(a, 'staff', 'Staff', true, '1');
    // El nombre puede salir en otra parte de la ficha (una reseña de otra prueba lo menciona): lo que se mira es el riel del equipo y sus tarjetas.
    const f2 = await fichaTxt(v); const riel2 = await v.locator('[data-pieza="riel-equipo"]').count();
    if (riel2) console.log(`  · el riel sigue: ${(await v.locator('[data-pieza="riel-equipo"]').first().innerText()).slice(0, 200).replace(/\s+/g, ' ')}`);
    if (!riel2 && f2.includes(NOM)) console.log(`  · «${NOM}» sale en otra parte: …${f2.slice(Math.max(0, f2.indexOf(NOM) - 80), f2.indexOf(NOM) + 60).replace(/\s+/g, ' ')}…`);
    ok(riel2 === 0 && (await v.locator('[data-screen-label="Ficha · equipo"]').count()) === 0, `la ficha (390) ya no presenta al equipo (sin el riel, sin «${NOM}»)`);
    ok((await v.getByRole('tab').allInnerTexts().catch(() => [])).concat(await v.locator('[role=tablist] *').allInnerTexts().catch(() => [])).join(' ').match(/Barberos|Equipo|Staff/i) === null, 'la ficha (390) ya no tiene la pestaña del equipo');
    await shot(v, 'staff-ficha-m.png');
    const f2d = await fichaTxt(vd); ok(await eqD(vd) === 0, 'la ficha (1360) ya no tiene la pestaña «Equipo» ni la sección (la tarjeta de la cita conserva el selector de persona)'); await shot(vd, 'staff-ficha-d.png');
    // Reservar sigue: se abre la reserva y se ve la elección de persona y el día
    await v.goto(B + `/n/${BARB}`); await v.waitForLoadState('networkidle');
    const bk = v.getByRole('button', { name: 'Booking', exact: true });
    ok((await bk.count()) > 0, 'reservar sigue en la ficha (390): el botón «Booking» está');
    await bk.first().click();
    ok(await hasta(async () => { const x = await v.locator('body').innerText(); return /Cualquiera|Luis|Kelvin/.test(x) && /Corte/i.test(x); }), 'la reserva abre con Staff apagado y deja elegir persona y servicio');
    await shot(v, 'staff-reserva-m.png');
    const bd = vd.getByRole('button', { name: /Booking|Elegir/i });
    await vd.goto(B + `/n/${BARB}`); await vd.waitForLoadState('networkidle');
    ok((await vd.locator('body').innerText()).match(/Próxima hora|PRÓXIMA HORA|Reservar|Booking/i) !== null, 'en escritorio (1360) la tarjeta de la cita sigue en la ficha'); void bd; await shot(vd, 'staff-reserva-d.png');
    const OWB = sql(`select u.phone from business_members m join users u on u.id = m.user_id where m.business_id = '${BARB}' and m.kind = 'owner' and m.status = 'active'`).replace('+1', '');
    if (OWB) {
      const dueno = await mk(TELO, OWB, 'Dueño'); await dueno.goto(B + `/panel/${BARB}/pagina/equipo`); await dueno.waitForLoadState('networkidle');
      ok(await hasta(async () => (await dueno.locator('body').innerText()).includes('pausó Staff')), 'el dueño ve «To’Latino pausó Staff» con el motivo en su panel (Equipo)'); await shot(dueno, 'staff-panel-m.png');
    }
    await encenderCiudad(am, 'staff', '1');
    const f3 = await fichaTxt(v); ok(f3.includes(NOM), 'encendido: la ficha (390) vuelve a presentar al equipo');

    console.log('3 · Negocios 360°: la pausa de UN negocio para Cotizaciones y Staff');
    const reunion = async (p, tab) => { await p.goto(B + `/admin/negocios/${PLOM}?tab=${tab}`); await p.waitForLoadState('networkidle'); };
    await reunion(a, 'vende'); await a.locator('text=Cotizaciones').first().waitFor();
    ok((await a.locator('text=/Pre-estimado con fotos, presupuesto a hasta 3/').count()) > 0, '360° › Lo que vende: Hogar tiene la fila «Cotizaciones»');
    ok((await hoja(v, PLOM, 'Visita y diagnóstico', 'Pedir pre-estimado')).includes('Pedir pre-estimado'), 'antes: la hoja de su visita ofrece el pre-estimado');
    await enFilaPausar(a, 'Cotizaciones'); await confirmar(a, { motivo: `cat9n2 ${k} 360 cot`, cta: 'Confirmar' });
    await a.locator('text=/Cotizaciones pausado/').first().waitFor();
    ok(sql(`select modules_off->'cot'->>'reason' from businesses where id = '${PLOM}'`) === `cat9n2 ${k} 360 cot`, '360°: Cotizaciones pausado para ese negocio, con su motivo');
    ok(!(await hoja(v, PLOM, 'Visita y diagnóstico', 'Pedir pre-estimado')).includes('Pedir pre-estimado'), 'su hoja ya no ofrece el pre-estimado');
    ok(sql(`select count(*) from businesses where id <> '${PLOM}' and modules_off ? 'cot'`) === '0', 'los demás negocios no se tocan');
    // El dueño ve el motivo en su panel
    const OWN = sql(`select u.phone from business_members m join users u on u.id = m.user_id where m.business_id = '${PLOM}' and m.kind = 'owner' and m.status = 'active'`).replace('+1', '');
    if (OWN) {
      const dueno = await mk(TELO, OWN, 'Dueño'); await dueno.goto(B + `/panel/${PLOM}/vendes/servicios`); await dueno.waitForLoadState('networkidle');
      ok(await hasta(async () => (await dueno.locator('body').innerText()).includes('pausó tus Cotizaciones')), 'el dueño ve «To’Latino pausó tus Cotizaciones» con el motivo en su panel'); await shot(dueno, 'cot-panel-m.png');
    }
    await enFilaReanudar(a, 'Cotizaciones'); await confirmar(a, { motivo: `cat9n2 ${k} 360 cot vuelve`, cta: 'Confirmar' });
    await a.locator('text=/Cotizaciones reanudado/').first().waitFor();
    ok(sql(`select count(*) from businesses where id = '${PLOM}' and modules_off ? 'cot'`) === '0', '360°: reanudado');
    await reunion(a, 'equipo'); await a.locator('text=MÓDULO').first().waitFor();
    await enFilaPausar(a, 'Staff'); await confirmar(a, { motivo: `cat9n2 ${k} 360 staff`, cta: 'Confirmar' });
    await a.locator('text=/Staff pausado/').first().waitFor();
    ok(sql(`select modules_off->'staff'->>'reason' from businesses where id = '${PLOM}'`) === `cat9n2 ${k} 360 staff`, '360°: Staff pausado para ese negocio');
    // y con la pausa de toda la ciudad, uno solo no la levanta
    sql(`select catalogo_modulo_ciudad('staff', 'hzl', true, 'cat9n2 ${k} ciudad', 'cat9n2')`); volver.staff = true;
    await reunion(a, 'equipo');
    ok(sql(`select modules_off->'staff'->>'reason' from businesses where id = '${PLOM}'`) === `cat9n2 ${k} 360 staff`, 'la pausa propia del negocio no se pisa con la de la ciudad');
    await shot(am, 'staff-360-m.png'); await am.goto(B + `/admin/negocios/${BARB}?tab=equipo`); await am.locator('text=MÓDULO').first().waitFor(); await shot(am, 'staff-360-m.png');
    await enFilaReanudar(am, 'Staff'); await confirmar(am, { motivo: `cat9n2 ${k} 360 staff intenta`, cta: 'Confirmar' });
    await am.locator('text=/Está apagado en toda su ciudad/').first().waitFor();
    ok(sql(`select modules_off->'staff'->>'ciudad' from businesses where id = '${BARB}'`) === 'true', '360°: Staff apagado en toda la ciudad no se reanuda para un solo negocio («se enciende en Catálogo › Módulos»)');
    sql(`select catalogo_modulo_ciudad('staff', 'hzl', false, 'cat9n2', 'cat9n2')`); volver.staff = false;
    sql(`update businesses set modules_off = modules_off - 'staff' where id = '${PLOM}'`);
    ok(!err.length, 'sin errores en la página: ' + (err.join(' · ') || 'ninguno'));
  } finally {
    // Todo vuelve como estaba (aunque la prueba se corte).
    for (const mo of ['cot', 'staff']) try { if (volver[mo]) sql(`select catalogo_modulo_ciudad('${mo}', 'hzl', false, 'cat9n2', 'cat9n2')`); } catch (e) { console.error(mo, e.message); }
    try { sql(`update businesses set modules_off = modules_off - 'cot' - 'staff' where id in ('${HOGAR}', '${PLOM}')`); } catch (e) { console.error('hogar', e.message); }
    try { sql(`update service_requests set status = 'cancelled' where user_id = (select id from users where phone = '+1${TELU}') and status = 'sent' and form->>'nota' like 'cat9n2%'`); } catch (e) { console.error('pedidos', e.message); }
    try { sql(`update businesses set status = 'closed', modules_off = modules_off - 'cot' - 'staff' where id like 'cat9n2-%-${k}'`); } catch (e) { console.error('negocios', e.message); }
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
  console.log(`\ncat9n2: ${n} ✓`);
})().catch((e) => { console.error(e); process.exit(1); });

/* La acción «Pausar» / «Reanudar» de la fila de un módulo del 360° (la fila más cercana al título que tiene esa acción). */
async function enFilaPausar(p, titulo) { await p.getByText(titulo, { exact: true }).first().locator("xpath=ancestor::*[.//*[normalize-space(text())='Pausar']][1]").getByText('Pausar', { exact: true }).first().click(); }
async function enFilaReanudar(p, titulo) { await p.getByText(titulo, { exact: true }).first().locator("xpath=ancestor::*[.//*[normalize-space(text())='Reanudar']][1]").getByText('Reanudar', { exact: true }).first().click(); }
