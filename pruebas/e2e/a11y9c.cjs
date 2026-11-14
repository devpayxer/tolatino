// 9c · Accesibilidad del sistema de diseño — solo con el teclado, de punta a punta (Chromium, teléfono 390 y escritorio 1440) contra :3100.
// Nada de ratón: cada paso es «llevar el foco al control y apretar Enter o Espacio» (act) y, aparte, recorrer la página con Tab y ver el
// contorno del foco. Los cinco recorridos del plan:
//   pedir (Sabor Dominicano: agregar un plato, el pedido, «Ir a pagar», «Enviar pedido») · reservar una mesa (cuántos, día, hora, ocasión,
//   enviar) · comprar un boleto (+ del QtyStepper con Espacio, Continuar, Pagar) · publicar un negocio (el asistente de /publica entero) ·
//   entrar al Super Admin y moverse por su menú.
// «VoiceOver simulado»: el árbol de accesibilidad de Playwright (ariaSnapshot) trae el nombre y el rol de lo que importa (Agregar, Uno más,
// Uno menos, un día, una hora, Notificaciones…) y ningún control con rol queda fuera del orden de tabulación.
// Mide aparte, sin fallar, cuántos controles miden menos de 44 px (lo que va a LAUNCH-CHECKLIST: cambiarlos cambia las capturas aprobadas).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process'); const crypto = require('crypto');
const { telefonoLibre } = require('../lib/telefono-libre.cjs'); // un teléfono sin cuenta para publicar
const { medios } = require('../lib/negocio-nuevo.cjs'); // el puerto de Garage de ESTA corrida (fotos del asistente)
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', N = '/n/' + BIZ, FP = ENT.rec('fotos') + '/';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); const r = await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); if (!r.ok) throw new Error('no entró ' + tel); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const MARISOL = '5705550122', ADM = '5705550199', NEG = 'la-terraza-night';
const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const RUN = Date.now().toString(36), TAG = `[a11y ${RUN}]`;

// ── El teclado ──
// Todo lo que el teclado puede activar: nativo, con rol o con tabindex.
const FOC = 'button,a[href],input,select,textarea,[role=button],[role=link],[role=tab],[role=radio],[role=checkbox],[role=switch],[role=option],[role=menuitem],[tabindex]';
const nombres = []; // el nombre accesible de cada control que se operó (para el informe)
// Lleva el foco al control (o al primero enfocable dentro/encima de lo que apunta `loc`), comprueba que está en el orden de tabulación y que tiene
// nombre, y aprieta la tecla. Si el control no se puede enfocar, la prueba falla: ese es el defecto que 9c cierra.
async function act(p, loc, tecla = 'Enter') {
  let el = null;
  for (let i = 0; i < 60 && !el; i++) { const k = await loc.count(); for (let j = 0; j < k; j++) if (await loc.nth(j).isVisible()) { el = loc.nth(j); break; } if (!el) await dormir(250); }
  if (!el) throw new Error('act: no visible: ' + loc + ' · la página dice: ' + (await p.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300));
  const r = await el.evaluate((e, sel) => {
    const t = e.closest(sel) || e.querySelector(sel);
    if (!t) return { sin: true, etiqueta: e.tagName, texto: (e.innerText || '').slice(0, 50) };
    t.scrollIntoView({ block: 'center' }); t.focus({ preventScroll: true });
    const lab = t.getAttribute('aria-labelledby'), porId = lab ? lab.split(' ').map((i) => (document.getElementById(i) || {}).innerText || '').join(' ') : '';
    const nombre = (t.getAttribute('aria-label') || porId || t.innerText || t.value || t.getAttribute('title') || t.getAttribute('placeholder') || (t.querySelector('img') || {}).alt || '').trim().replace(/\s+/g, ' ');
    return { enfocado: document.activeElement === t, tabIndex: t.tabIndex, etiqueta: t.tagName, rol: t.getAttribute('role'), nombre: nombre.slice(0, 60) };
  }, FOC);
  if (r.sin) throw new Error(`act: «${r.texto}» (<${r.etiqueta}>) no tiene nada enfocable: ni botón, ni rol, ni tabindex — no se puede usar con teclado`);
  if (!r.enfocado) throw new Error(`act: «${r.nombre}» (<${r.etiqueta} role=${r.rol}>) no recibe el foco`);
  if (r.tabIndex < 0) throw new Error(`act: «${r.nombre}» (<${r.etiqueta} role=${r.rol}>) tiene tabindex ${r.tabIndex}: el teclado no llega con Tab`);
  if (!r.nombre) throw new Error(`act: <${r.etiqueta} role=${r.rol}> no tiene nombre accesible (texto, aria-label…)`);
  nombres.push((r.rol || r.etiqueta.toLowerCase()) + ' «' + r.nombre + '»');
  await p.keyboard.press(tecla);
  return r;
}
// Controles con rol de botón (u otro) que el teclado no alcanza: es la clase de defecto que cazaba todo este bloque.
async function sinFoco(p) {
  return p.evaluate(() => [...document.querySelectorAll('[role=button],[role=link],[role=tab],[role=radio],[role=checkbox],[role=switch],[role=menuitem]')]
    .filter((e) => !['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(e.tagName) && e.tabIndex < 0 && e.getAttribute('aria-disabled') !== 'true' && !e.closest('[aria-hidden=true],[inert]') && e.getClientRects().length > 0)
    .map((e) => `<${e.tagName.toLowerCase()} role=${e.getAttribute('role')}> «${(e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40)}»`));
}
// Un <div>/<span> con cursor de mano, sin rol ni foco y sin un control de verdad dentro o encima: un clic que el teclado no puede dar.
// Es una heurística de la página servida (el cursor se hereda, hay fondos de hoja): solo AVISA. Lo que falla es lo estático (guardianes
// sistemaClicMudo y clicConTeclado) y sinFoco, que es exacto.
async function clicMudo(p) {
  return p.evaluate(() => [...document.querySelectorAll('div,span,li,p')].filter((e) => {
    if (e.getClientRects().length === 0 || getComputedStyle(e).cursor !== 'pointer') return false;
    if (e.closest('button,a[href],input,select,textarea,label,summary,[role],[tabindex],[aria-hidden=true],[inert]')) return false;
    if (e.querySelector('button,a[href],input,select,textarea,[role],[tabindex]')) return false; // envoltura de un control
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.width < window.innerWidth * 0.95; // un fondo de hoja ocupa todo
  }).slice(0, 12).map((e) => `<${e.tagName.toLowerCase()}> «${(e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40)}» ${String(e.getAttribute('style') || e.className).slice(0, 60)}`));
}
const arbol = (p) => p.locator('body').ariaSnapshot();
// Tab a Tab: cada elemento que recibe el foco se ve (contorno o sombra), el foco avanza y no se queda atrapado.
async function recorrerConTab(p, pasos) {
  await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
  const vistos = new Set(), sinContorno = []; let atrapado = 0, previo = '';
  for (let i = 0; i < pasos; i++) {
    await p.keyboard.press('Tab');
    const f = await p.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body || e === document.documentElement) return null;
      const s = getComputedStyle(e), vis = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
      const r = e.getBoundingClientRect();
      return { id: e.tagName + '|' + (e.getAttribute('aria-label') || (e.innerText || '').slice(0, 30)) + '|' + Math.round(r.top + scrollY) + '|' + Math.round(r.left), vis, nombre: (e.getAttribute('aria-label') || e.innerText || e.getAttribute('placeholder') || '').trim().slice(0, 30), tag: e.tagName };
    });
    if (!f) continue;
    if (f.id === previo) atrapado++; else atrapado = 0; previo = f.id;
    if (atrapado >= 3) throw new Error('el foco se atrapó en ' + f.id);
    vistos.add(f.id); if (!f.vis) sinContorno.push(f.tag + ' «' + f.nombre + '»');
  }
  return { distintos: vistos.size, sinContorno };
}
// Los controles que miden menos de 44 px de alto o de ancho (solo se informa).
const chicos = (p) => p.evaluate(() => [...document.querySelectorAll('[role=button],[role=link],[role=tab],[role=radio],[role=checkbox],[role=switch],button,a[href]')]
  .filter((e) => e.getClientRects().length > 0 && !e.closest('[aria-hidden=true]')).filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length);

(async () => {
  const br = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', (e) => err.push(tag + ' ' + e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const nuevo = async (ctxOpts) => { const c = await br.newContext(ctxOpts); await medios(c); const p = await c.newPage(); return p; };
  const restaurar = () => {
    try { sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='${BIZ}' and module=''`); sql(`update delivery_settings set auto_accept=false, prep_min=20 where business_id='${BIZ}'`); } catch {}
    try { sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where title->>'es' like '%${TAG}%' and status <> 'cancelled'`);
      sql(`update tickets set status = 'void', void_reason = 'prueba' where status = 'valid' and event_id in (select id from events where title->>'es' like '%${TAG}%')`);
      sql(`update ticket_holds set status = 'released' where status = 'held' and event_id in (select id from events where title->>'es' like '%${TAG}%')`); } catch {}
  };
  try {
    // ═══ 1 · Pedir, con el teclado ═══
    sql(`update business_hours set ranges='[["00:00","23:59"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
    sql(`update items set sold_out = (id = 3), stock_day = null where business_id='${BIZ}'`);
    sql(`insert into menu_settings (business_id) values ('${BIZ}') on conflict (business_id) do update set pause_until = null`);
    sql(`update operations set respond_by = now() - interval '1 minute' where user_id = (select id from users where phone='+1${MARISOL}') and status = 'pending'`);
    sql(`update business_stats_cache set plan='pro' where business_id='${BIZ}'`); sql(`update platform_config set value='10' where key='free_ops_cap'`);
    sql(`update business_posts set status = 'stopped' where business_id = '${BIZ}' and kind = 'oferta' and status = 'live'`);
    const m = await nuevo({ ...devices['iPhone 13'] }); watch(m, 'movil');
    await entrar(m, MARISOL);
    await m.goto(B + N); await m.evaluate(() => { localStorage.removeItem('tl-carrito-v1'); localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' })); });
    await m.goto(B + N + '?tab=menu'); await m.locator('[data-screen-label="Ficha · menú"]').waitFor();
    // Orden de tabulación y foco visible de la ficha
    const rec = await recorrerConTab(m, 30);
    ok(rec.distintos >= 12, `Tab recorre la ficha: ${rec.distintos} elementos distintos en 30 pasos, sin quedarse atrapado`);
    ok(rec.sinContorno.length === 0, 'cada elemento con foco se ve (contorno): ' + (rec.sinContorno.slice(0, 6).join(' · ') || 'todos'));
    const mudos0 = await sinFoco(m); ok(mudos0.length === 0, 'la ficha: ningún control con rol queda fuera del orden de tabulación ' + mudos0.slice(0, 6).join(' · '));
    const cm0 = await clicMudo(m); if (cm0.length) console.log('  (aviso: la ficha: clics con mano sin teclado: ' + cm0.slice(0, 5).join(' · ') + ')'); else ok(true, 'la ficha: ningún clic de ratón sin teclado');
    let snap = await arbol(m);
    ok(/button "Agregar"/.test(snap), 'árbol de accesibilidad: «Agregar» es un botón con nombre (el + de cada plato)');
    ok(/tab "Menú/.test(snap) || /tab "Menu/.test(snap), 'árbol de accesibilidad: las pestañas de la ficha son tabs');
    const fila = (p, nombre) => p.locator('[data-msec^="m-"]:not([data-msec="m-pop"]) div.grid').filter({ has: p.getByText(nombre, { exact: true }) }).last();
    await act(m, fila(m, 'Tostones').getByRole('button', { name: 'Agregar' }));
    const bar = m.locator('[data-screen-label="Ficha · barra del pedido"]'); await bar.waitFor();
    ok(/1 artículo/.test(await bar.innerText()), 'Enter en «Agregar»: el plato entra al pedido (barra «1 artículo»)');
    await act(m, bar);
    const car = m.locator('[data-screen-label="Menú · tu pedido"]'); await car.waitFor();
    ok(/ARTÍCULO/.test(await car.innerText()), 'Enter en la barra: se abre «Tu pedido»');
    snap = await arbol(m); ok(/button "Uno (más|menos)"/.test(snap) || /button "Quitar"/.test(snap), 'árbol: el pedido tiene «Uno más» / «Uno menos» / «Quitar» con nombre');
    await act(m, car.getByText(/^Ir a pagar/));
    await m.waitForURL(/\/pagar$/); await m.locator('[data-pantalla="APP-NEG-CHECKOUT"]').waitFor();
    ok(true, 'Enter en «Ir a pagar»: llega al pago');
    await act(m, m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/));
    await m.waitForURL(/\/pedido\/\d+$/, { timeout: 20000 }); const PED = m.url().split('/').pop();
    ok(sql(`select status from operations where number = '${PED}'`) === 'pending', `Enter en «Enviar pedido»: el pedido ${PED} quedó enviado (pendiente), sin tocar el ratón`);
    sql(`update operations set status = 'cancelled' where number = '${PED}'`);

    // ═══ 2 · Reservar una mesa, con el teclado ═══
    sql(`update business_hours set ranges='[["11:00","22:00"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
    sql(`update operations set status='cancelled' where kind='table' and user_id=(select id from users where phone='+1${MARISOL}') and status in ('pending','confirmed','change_proposed')`);
    sql(`delete from reservation_holds`); sql(`update reservation_settings set auto_confirm=false where business_id='${BIZ}'`);
    const manana = +sql(`select extract(dow from (now() at time zone 'America/New_York')::date + 1)`);
    await m.goto(B + N + '?tab=rsv');
    const tab = m.locator('[data-screen-label="Ficha · reservaciones"]').first(); await tab.getByText('¿Cuántos son?').waitFor();
    snap = await arbol(m);
    ok(/radio "[A-ZÁÉÍÓÚ]{3} \d+"/.test(snap) || (await tab.getByText(DOW[manana], { exact: true }).count()) > 0, 'árbol: los días de la reserva son radios con su nombre («MAR 17»)');
    await act(m, tab.getByText('2', { exact: true }), 'Space');
    await act(m, tab.locator('[role=radio]').filter({ hasText: DOW[manana] }).first());
    await tab.getByText(/^ALMUERZO ·/).waitFor();
    await act(m, tab.locator('[role=radio][aria-label="1:00 PM"]').first());
    const barR = m.locator('[data-screen-label="Ficha · barra de pedido"]');
    ok(/1:00 PM/.test(await barR.innerText()), 'Enter / Espacio eligen cuántos, el día y la hora (la barra los muestra)');
    ok((await tab.locator('[role=radio][aria-checked=true]').count()) >= 2, 'los radios elegidos dicen aria-checked (día y hora)');
    await act(m, barR.getByText('Continuar'));
    await m.waitForURL(/\/reservar\?hold=/, { timeout: 20000 });
    const det = m.locator('[data-screen-label="APP-NEG-RESERVA · móvil"]'); await det.getByText('Te guardamos esta mesa').waitFor();
    await act(m, det.getByText('Cumpleaños', { exact: true }), 'Space');
    await det.locator('textarea').fill('Mesa cerca de la ventana.');
    await act(m, m.locator('[data-screen-label="Reserva · barra"]').getByText('Enviar solicitud'));
    await m.waitForURL(/\/reserva\/R-\d+$/, { timeout: 20000 }); const RES = m.url().split('/').pop();
    ok(sql(`select status || '|' || party_size from operations where number = '${RES}'`) === 'pending|2', `la reserva ${RES} salió con el teclado: 2 personas, pendiente`);
    sql(`update operations set status = 'cancelled' where number = '${RES}'`);
    const mudos1 = await sinFoco(m); ok(mudos1.length === 0, 'la reserva: ningún control con rol queda fuera del orden de tabulación ' + mudos1.slice(0, 6).join(' · '));

    // ═══ 3 · Comprar un boleto, con el teclado ═══
    sql(`update stripe_accounts set charges_enabled = true where business_id = '${NEG}'`); sql(`update business_stats_cache set plan = 'pro' where business_id = '${NEG}'`);
    sql(`delete from platform_config where key = 'evt_boletos_por_orden_max'`);
    const u = uid(MARISOL); sql(`update payment_methods set is_default = false where user_id = '${u}'`);
    sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, status, simulated) values ('${u}', 'pm_sim_visa_4242_${crypto.createHash('md5').update(MARISOL + '4242').digest('hex').slice(0, 8)}', 'visa', '4242', '12/30', true, 'active', true) on conflict (stripe_pm_id) do update set is_default = true, status = 'active'`);
    const ADMID = uid(ADM);
    const tk = JSON.stringify([{ id: 'gen', n: { es: `General ${TAG}`, en: 'General' }, s: { es: '', en: '' }, p: 1500, cap: 5, off: false }]);
    const EV = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, tables_cfg, addons_cfg)
      values ('', 'hzl', '${NEG}', 'noche', '{"es":"Noche accesible ${TAG}","en":"Accessible night ${TAG}"}', (now() at time zone 'America/New_York')::date + 5, 1320, 1560, 'tickets', 'live', now(), now(), '${ADMID}', 60, '${ADMID}', 0,
              '${tk}'::jsonb, '[]'::jsonb, '[]'::jsonb) returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${EV})`);
    const F = sql(`select id from event_dates where event_id = ${EV}`), SLUG = sql(`select slug from events where id = ${EV}`), T_GEN = sql(`select id from ticket_types where event_id = ${EV} and cfg_key = 'gen'`);
    await m.goto(B + `/eventos/${SLUG}?fecha=${F}`);
    await act(m, m.locator('button, [role="button"]', { hasText: /^Boletos$/ }));
    await m.waitForURL(/\/boletos\?fecha=/);
    await m.locator(`[data-tipo="${T_GEN}"]`).waitFor();
    snap = await arbol(m);
    ok(/button "Uno más"/.test(snap) && /button "Uno menos"/.test(snap), 'árbol: el QtyStepper de los boletos dice «Uno más» y «Uno menos» (antes eran div mudos)');
    await act(m, m.locator(`[data-tipo="${T_GEN}"] >> text="+"`), 'Space');
    ok(await m.locator(`[data-tipo="${T_GEN}"]`).innerText().then((t) => /\b1\b/.test(t)), 'Espacio en «Uno más»: el boleto suma 1');
    await act(m, m.locator('button, [role="button"]', { hasText: 'Continuar' }));
    await m.waitForURL(/\/eventos\/pagar\//, { timeout: 20000 });
    await m.locator('input[placeholder="A nombre de…"]').first().fill('Marisol P');
    await act(m, m.locator('button, [role="button"]', { hasText: /^Pagar \$/ }));
    await m.waitForURL(/\/eventos\/orden\/B-/, { timeout: 25000 }); const ORD = m.url().split('/').pop();
    ok(sql(`select count(*) from tickets where operation_id = (select id from operations where number = '${ORD}') and status = 'valid'`) === '1', `la orden ${ORD}: un boleto válido comprado solo con el teclado`);
    const cm1 = await clicMudo(m); if (cm1.length) console.log('  (aviso: la orden: clics con mano sin teclado: ' + cm1.slice(0, 5).join(' · ') + ')'); else ok(true, 'la orden: ningún clic de ratón sin teclado');

    // ═══ 4 · Publicar un negocio, con el teclado ═══
    const TEL = telefonoLibre('5705556');
    const p = await nuevo({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); watch(p, 'publica');
    await p.goto(B + '/publica'); await p.getByText('Publica tu negocio en 5 minutos').waitFor();
    await p.getByPlaceholder('(570) 555-0134').fill(TEL);
    await act(p, p.getByText('Enviarme el código'));
    const cod = await p.locator('[data-modo-pruebas] b').textContent({ timeout: 8000 });
    await p.getByPlaceholder('······').fill(cod.trim());
    snap = await arbol(p); ok(/textbox/.test(snap), 'árbol: el campo del código es un textbox');
    await act(p, p.getByText('Verificar'));
    await p.getByText('¿Cómo te llamas?').waitFor();
    await p.getByPlaceholder('Rafael').fill('Mario'); await p.getByPlaceholder('Núñez').fill('Peña');
    const seg = () => act(p, p.getByText('Seguir', { exact: true }).last());
    await seg(); await p.getByText('¿Qué tipo de negocio tienes?').waitFor({ timeout: 10000 });
    await act(p, p.getByText('Belleza', { exact: true }).first()); await p.locator('text=/¿QUÉ HACES/').waitFor({ timeout: 8000 });
    await act(p, p.locator('[data-screen-label="ONB-NEG-B1 · tu negocio"] span:has-text("Barbería")').first());
    await p.getByPlaceholder('Ej.: Barbería Don Fello').fill('Barbería ' + TEL.slice(-4)); await dormir(800);
    await seg(); await dormir(900);
    for (let i = 0; i < 6; i++) { // C1: lo primero de cada pregunta, con el teclado, hasta que se pueda seguir
      if (!(await p.locator('text=RESPONDE LO QUE FALTA').count())) break;
      const grupos = p.locator('[data-screen-label^="ONB-NEG-C1"] > div'), k = await grupos.count();
      for (let g = 0; g < k; g++) { const opc = grupos.nth(g).locator('div[role=button], [role=radio], [role=checkbox], span[role=button]').first(); if (await opc.count()) await act(p, opc, 'Space').catch(() => {}); await dormir(120); }
    }
    await seg(); await dormir(900);
    await act(p, p.locator('button, span, div').filter({ hasText: /^Seguir · / }).last()); await dormir(900);
    const dir = p.getByPlaceholder('312 N Wyoming St'); if (await dir.count()) await dir.fill('412 N Wyoming St');
    await dormir(400); await seg(); await dormir(900);
    await p.locator('input[type=file]').nth(1).setInputFiles([FP + 'portada.jpg', FP + 'galeria.png']);
    await p.locator('text=TUS FOTOS · LA PRIMERA ES LA PORTADA').waitFor({ timeout: 15000 });
    await p.waitForFunction(() => document.querySelectorAll('[aria-label="Quitar foto"]').length === 2, null, { timeout: 20000 });
    const mudos2 = await sinFoco(p); ok(mudos2.length === 0, 'el asistente: ningún control con rol queda fuera del orden de tabulación ' + mudos2.slice(0, 6).join(' · '));
    await dormir(1200);
    await act(p, p.locator('text=/^Publicar · /').last());
    await p.getByText('PUBLICADA').first().waitFor({ timeout: 15000 });
    ok(true, 'publicar un negocio con el teclado: «PUBLICADA» (' + new URL(p.url()).pathname + ')');

    // ═══ 5 · Entrar al Super Admin, con el teclado ═══
    const a = await nuevo({ viewport: { width: 1440, height: 900 } }); watch(a, 'admin');
    await entrar(a, ADM);
    await a.goto(B + '/admin'); await a.waitForLoadState('networkidle').catch(() => {});
    snap = await arbol(a);
    ok(/button "Notificaciones"/.test(snap) && /button "Mi cuenta"/.test(snap), 'árbol del Super Admin: la campana y la cuenta del equipo son botones con nombre');
    const rec2 = await recorrerConTab(a, 25);
    ok(rec2.distintos >= 8 && rec2.sinContorno.length === 0, `Super Admin: Tab recorre ${rec2.distintos} elementos y todos se ven con el foco (${rec2.sinContorno.slice(0, 4).join(' · ') || 'todos'})`);
    const mudos3 = await sinFoco(a); ok(mudos3.length === 0, 'el Super Admin: ningún control con rol queda fuera del orden de tabulación ' + mudos3.slice(0, 6).join(' · '));
    await act(a, a.getByText('Colas', { exact: true }).first());
    await a.waitForURL(/\/admin\/colas/, { timeout: 15000 }); await a.locator('text=Todo lo que espera una decisión').waitFor();
    ok(true, 'Enter en «Colas» del menú: el Super Admin abre las colas');
    await act(a, a.getByText('Negocios', { exact: true }).first());
    await a.waitForURL(/\/admin\/negocios/, { timeout: 15000 }); await a.locator('text=TODOS LOS NEGOCIOS').waitFor();
    ok(true, 'Enter en «Negocios» del menú: la lista de negocios');
    const cm2 = await clicMudo(a); if (cm2.length) console.log('  (aviso: el Super Admin: clics con mano sin teclado: ' + cm2.slice(0, 5).join(' · ') + ')'); else ok(true, 'el Super Admin: ningún clic de ratón sin teclado');

    // ═══ Informe (no falla) ═══
    const ch = await chicos(a); console.log(`  (informe: ${ch} controles del Super Admin miden menos de 44 px; va a LAUNCH-CHECKLIST: cambiarlos cambia las capturas aprobadas)`);
    console.log('  controles operados con el teclado (' + nombres.length + '): ' + [...new Set(nombres)].slice(0, 40).join(' · '));
    ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ').slice(0, 400) : ''));
    console.log(`\n${n} ✓ · a11y9c`);
  } finally {
    restaurar();
    await br.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
