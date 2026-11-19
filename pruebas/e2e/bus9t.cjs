// 9t · Buscar › «Platos y servicios», el desplegable del encabezado en escritorio con su vista previa, y Mi cuenta › Apartados y «Letra más grande»
// (LAUNCH «Buscar — pendientes con su módulo» y «Boletos, Mensajes, … letra más grande»; REVISION «9t»). A 390 y a 1360, ES y EN.
// 1 · Platos y servicios: «mofongo» trae el plato de Sabor Dominicano (sugerencias, «Todo» y su pestaña con chips y «Precio más bajo»), «corte»
//     trae los servicios de la Barbería El Primo con «Precio en la ficha»; tocar una fila abre la ficha del negocio.
// 2 · Nunca deja ver lo que la ficha no muestra (guardián buscarPlatosComoLaFicha): un plato oculto por To'Latino, en una sección que no se ve, con el
//     Menú pausado, o de un Free fuera de sus primeros platos (y la ficha Free tampoco lo enseña); un servicio que nadie hace. Todo vuelve al final.
// 3 · El desplegable (1360): el buscador del encabezado lo abre (sin escribir: ejemplos y categorías); escribiendo, las secciones y la vista previa de la
//     fila con el cursor (plato con su precio, negocio); ↓ y Enter abren; Esc cierra; Enter en «Buscar …» lleva a los resultados.
// 4 · Mi cuenta › Pedidos › Apartados: el apartado vivo de la vecina con «LISTO», «VENCE …», «AL RECOGER», «Cómo llegar» y «Ver el negocio»; uno
//     cancelado no sale.
// 5 · Letra más grande: Ajustes › «Idioma y pantalla» la enciende en el servidor (otro navegador con la misma cuenta la ve), la app se pinta con
//     [data-letra="grande"] y sin scroll de lado a 390 en Inicio, Buscar, Mi cuenta y una ficha; se apaga igual.
// 6 · 9t-2 (LAUNCH «Buscar · servicios de las demás categorías y lo que falta del desplegable»):
//     a · Fiestas, Transporte, Noche, Educación, Niños, Deporte e Iglesias en «Platos y servicios», cada uno con la regla de su ficha: con Servicios
//         pausados no sale (y la ficha tampoco lo lista); la Lista de Noche solo encendida; la noche especial sin su evento no sale; en Educación,
//         lo que no es curso, programa o membresía no sale.
//     b · Un negocio encaja por lo que vende y dice por qué: «Tiene Mofongo de chicharrón · $…» (la tarjeta del Pro), «Tiene Oración del viernes»
//         (la fila del Free), «TIENE NORTEÑO…» en las sugerencias; EN «HAS …»; el nombre gana (no se repite cuando el nombre ya lo dice).
//     c · Tocar un plato abre SU hoja en la ficha (390 y 1360 desde el desplegable); un ?plato= que no es de su menú no abre nada.
//     d · El desplegable (1360): el micrófono abre el aviso dentro del panel («Ahora no» vuelve), sin micrófono si la persona lo apagó en
//         Privacidad; el chip de la ciudad cierra el panel y abre «Ciudad que estás viendo».
// Precondiciones propias: una persona nueva con teléfono 555 libre; el apartado A-9501 de Marisol vuelve a su estado; el plan, la pausa, la sección y el
// plato de Sabor Dominicano y el equipo de la barbería vuelven como estaban. Cuenta solo sus filas (corre barajada y dos veces seguidas).
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { botonesQueNoCaben } = require('../lib/caben.cjs');
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, telLibre } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `b9t-${nom}.png`, fullPage: full });
const espera = async (f, ms = 15000, cada = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, cada)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const BIZ = 'sabor-dominicano', BARB = 'barberia-el-primo', MARISOL = '5705550122';
const tel390 = (b, extra = {}) => b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, ...extra });
const desk = (b, extra = {}) => b.newContext({ viewport: { width: 1360, height: 900 }, ...extra });
const api = (p, q, extra = '') => p.evaluate(async (u) => (await fetch(u)).json(), `/api/buscar?q=${encodeURIComponent(q)}${extra}`);
const nombres = (r) => (r.filas || []).filter((x) => x.kind === 'item').map((x) => x.parts.join(''));

(async () => {
  // ── Precondiciones propias: el estado de lo que la prueba cambia, para dejarlo igual ──
  const plan0 = sql(`select plan from business_stats_cache where business_id = '${BIZ}'`);
  const off0 = sql(`select modules_off::text from businesses where id = '${BIZ}'`);
  const mof = sql(`select id from items where business_id = '${BIZ}' and module = 'menu' and name->>'es' = 'Mofongo de chicharrón'`);
  const tos = sql(`select section_id from items where business_id = '${BIZ}' and module = 'menu' and name->>'es' = 'Tostones'`);
  // 19 nov · El apartado es SUYO (antes leía el A-9501, que solo existe si otra prueba de apartados corrió antes: en una base nueva no estaba).
  const kA = require('crypto').randomUUID();
  const APT = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, scheduled_at, ready_at, respond_by, details, subtotal_cents, total_cents, pay_mode, client_key, is_test)
    select 'A-' || nextval('hold_seq'), 'hold', b.city_id, b.id, u.id, 'pending', 'sent', 'pickup', now(), now() + interval '1 day', now() + interval '1 hour', '{"como":"tienda","hold_hours":48,"sms":true}'::jsonb, 2500, 2500, 'local', '${kA}', true
      from businesses b, users u where b.id = 'boutique-yaritza' and u.phone = '+1${MARISOL}' returning number`).split('\n')[0];
  if (APT) sql(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct) select o.id, x.id, x.name, 1, x.price_cents, x.price_cents, 6 from operations o, (select id, name, price_cents from items where business_id = 'boutique-yaritza' order by id limit 1) x where o.client_key = '${kA}'`);
  const apt0 = APT ? 'cancelled||' : '';
  const fade = sql(`select id from items where business_id = '${BARB}' and module = 'svc' and name->>'es' = 'Fade'`);
  // Quién hace «Fade» y A QUÉ PRECIO cada silla (19 nov: se devolvía sin el precio y cit3b, después en orden barajado, ya no veía $22–$28).
  const ss0 = sql(`select coalesce(string_agg(member_id::text || ':' || coalesce(price_cents::text, ''), ','), '') from staff_services where item_id = ${fade}`);
  const devolverFade = () => { sql(`delete from staff_services where item_id = ${fade}`); for (const x of ss0.split(',').filter(Boolean)) { const [m, pr] = x.split(':'); sql(`insert into staff_services (item_id, member_id, price_cents) values (${fade}, '${m}', ${pr || 'null'})`); } };
  const M1 = sql(`select id from business_members where business_id = '${BARB}' and status = 'active' and show_on_page and hidden_by_admin is null and takes_bookings order by id limit 1`);
  const tb0 = M1 ? 'true' : 'false';
  // 9t-2 · Lo que la sección 6 toca (vuelve igual al final): el horario de Sabor Dominicano (abierto todo el día: la hoja del plato se abre solo si se
  // puede pedir ahora), la pausa de Aeropuerto Seguro, la Lista de Casa Borinquen y el tipo de «Contabilidad para tu negocio».
  const horas0 = sql(`select coalesce(json_agg(json_build_object('w', weekday, 'o', open, 'r', ranges)), '[]') from business_hours where business_id = '${BIZ}' and module = ''`);
  sql(`update business_hours set ranges = '[["00:00","00:00"]]'::jsonb, open = true where business_id = '${BIZ}' and module = ''`);
  const AERO = 'aeropuerto-seguro', BORI = 'casa-borinquen';
  const aeroOff0 = sql(`select coalesce(modules_off::text, '{}') from businesses where id = '${AERO}'`);
  const lista0 = sql(`select list_on from noche_settings where business_id = '${BORI}'`);
  const conta = sql(`select id from items where business_id = 'academia-negocios-latina' and module = 'svc' and name->>'es' = 'Contabilidad para tu negocio'`);
  const contaK0 = conta ? sql(`select svc_kind from items where id = ${conta}`) : '';
  ok(plan0 === 'pro' && mof && tos && apt0 && fade && M1, `precondiciones: Sabor Dominicano Pro con su menú, la barbería con «Fade» y alguien que recibe citas, y su apartado (${JSON.stringify({ plan0, mof: !!mof, tos: !!tos, apt: APT, fade: !!fade, M1: !!M1 })})`);
  const V1 = telLibre();
  const b = await chromium.launch(), err = [], abiertas = [];
  const mirar = (p, k) => { p.on('pageerror', (e) => err.push(`${k}: ${e.message}`)); };
  try {
    // ── 1 · Platos y servicios (390, ES) ──
    const c1 = await tel390(b); abiertas.push(c1);
    const p = await c1.newPage(); mirar(p, '390');
    await p.goto(B + '/');
    let r = await api(p, 'mofong');
    ok(nombres(r).some((x) => x === 'Mofongo de chicharrón'), 'sugerencias: «mofong» trae «Mofongo de chicharrón» en PLATOS Y SERVICIOS');
    ok(r.filas.find((x) => x.kind === 'item')?.right === '$12' || /^\$\d/.test(r.filas.find((x) => x.kind === 'item')?.right ?? ''), 'el plato trae su precio de la ficha');
    ok(r.conteos && r.conteos.items >= 1, 'el conteo de «Buscar …» suma los platos y servicios');
    await p.goto(B + '/buscar?q=mofongo'); await p.waitForLoadState('networkidle').catch(() => {});
    ok(await p.locator('[data-screen-label="APP-BUSCAR · platos y servicios"]').isVisible(), '«Todo» trae la sección «Platos y servicios» (aunque ningún negocio se llame así)');
    ok((await texto(p)).includes('Mofongo de chicharrón') && (await texto(p)).includes('Sabor Dominicano'), 'la fila dice el plato y el negocio');
    await shot(p, '390-todo-es');
    await p.goto(B + '/buscar?q=corte&tab=itm'); await p.waitForLoadState('networkidle').catch(() => {});
    const tx1 = await texto(p);
    ok(tx1.includes('Corte clásico') && tx1.includes('Precio en la ficha'), 'pestaña Platos y servicios: «corte» trae los servicios de la barbería con «Precio en la ficha»');
    ok(/Todos \d+/.test(tx1) && tx1.includes('Precio más bajo'), 'la pestaña trae «Todos N», un chip por categoría y «Precio más bajo»');
    await shot(p, '390-pestana-es');
    // Un servicio de ESTA barbería (otras pruebas publican barberías con el mismo «Corte clásico» en la misma base: la primera fila puede ser de otra).
    const svcBarb = sql(`select id from items where business_id = '${BARB}' and module = 'svc' and removed_at is null and name->>'es' ilike '%corte%' order by id limit 1`);
    ok(!!svcBarb, `precondición: ${BARB} tiene un servicio con «corte»`);
    await p.locator(`[data-plato="${svcBarb}"]`).click();
    ok(await espera(async () => new URL(p.url()).pathname === `/n/${BARB}`), 'tocar un servicio abre la ficha del negocio');
    // ── 2 · Nunca lo que la ficha no muestra ──
    await p.goto(B + '/');
    sql(`update items set status = 'hidden', hidden_reason = 'prueba bus9t' where id = ${mof}`);
    ok(!nombres(await api(p, 'mofongo')).includes('Mofongo de chicharrón'), 'un plato oculto por To\'Latino no sale');
    sql(`update items set status = 'live', hidden_reason = null where id = ${mof}`);
    sql(`update item_sections set visible = false where id = ${tos}`);
    ok(!nombres(await api(p, 'tostones')).includes('Tostones'), 'un plato de una sección que no se ve no sale (los que dicen «con tostones» en su descripción, sí)');
    sql(`update item_sections set visible = true where id = ${tos}`);
    ok(nombres(await api(p, 'tostones')).includes('Tostones'), 'con la sección visible, vuelve');
    sql(`update businesses set modules_off = coalesce(modules_off, '{}'::jsonb) || '{"menu": {"reason": "prueba bus9t", "by": "prueba"}}'::jsonb where id = '${BIZ}'`);
    ok(!nombres(await api(p, 'mofongo')).length, 'con el Menú pausado por To\'Latino no sale ningún plato');
    sql(`update businesses set modules_off = '${off0}'::jsonb where id = '${BIZ}'`);
    ok(nombres(await api(p, 'sancocho')).includes('Sancocho'), 'en Pro, «Sancocho» (el 8.º plato) sale');
    sql(`update business_stats_cache set plan = 'free' where business_id = '${BIZ}'`);
    ok(!nombres(await api(p, 'sancocho')).includes('Sancocho'), 'en Free, «Sancocho» (fuera de los primeros platos de su página) no sale');
    ok(nombres(await api(p, 'bandera')).includes('La bandera'), 'en Free, «La bandera» (el primero) sí');
    await p.goto(B + `/n/${BIZ}`); await p.waitForLoadState('networkidle').catch(() => {});
    ok(!(await texto(p)).includes('Sancocho'), 'y la ficha Free tampoco enseña «Sancocho» (la misma regla)');
    sql(`update business_stats_cache set plan = '${plan0}' where business_id = '${BIZ}'`);
    // Un servicio de Belleza que nadie que recibe citas hace no sale: «Fade» marcado solo para una persona que deja de recibir citas.
    sql(`delete from staff_services where item_id = ${fade}`); sql(`insert into staff_services (item_id, member_id) values (${fade}, '${M1}')`);
    sql(`update business_members set takes_bookings = false where id = '${M1}'`);
    ok(!nombres(await api(p, 'fade')).includes('Fade'), 'un servicio que nadie que recibe citas hace no sale');
    sql(`update business_members set takes_bookings = ${tb0} where id = '${M1}'`);
    ok(nombres(await api(p, 'fade')).includes('Fade'), '«Fade» sale con quien lo hace');
    devolverFade();
    // ── 1b · EN ──
    await c1.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await p.goto(B + '/buscar?q=mofongo'); await p.waitForLoadState('networkidle').catch(() => {});
    ok((await texto(p)).includes('Dishes & services'), 'EN: «Dishes & services»');
    await shot(p, '390-todo-en');
    await c1.addCookies([{ name: 'tl_lang', value: 'es', url: B }]);

    // ── 3 · El desplegable de escritorio con la vista previa (1360) ──
    const c3 = await desk(b); abiertas.push(c3);
    const d = await c3.newPage(); mirar(d, '1360');
    await d.goto(B + '/negocios'); await d.waitForLoadState('networkidle').catch(() => {});
    await d.getByText('Buscar negocios', { exact: false }).first().click();
    const drop = d.locator('[data-screen-label="APP-BUSCAR · desplegable desktop"]');
    ok(await espera(() => drop.isVisible()), 'el buscador del encabezado abre el desplegable (no lleva a /buscar)');
    ok(new URL(d.url()).pathname === '/negocios', 'la página de atrás sigue ahí');
    ok(await espera(async () => (await drop.innerText()).includes('ESCRIBE COMO HABLAS') && (await drop.innerText()).includes('CATEGORÍAS')), 'sin escribir: «Escribe como hablas» y las categorías');
    await shot(d, '1360-desplegable-explorar', false);
    await d.keyboard.type('mofongo');
    ok(await espera(async () => (await drop.innerText()).includes('PLATOS Y SERVICIOS')), 'escribiendo: la sección PLATOS Y SERVICIOS');
    await d.locator('[data-fila="item"]').first().hover();
    ok(await espera(async () => (await d.locator('[data-vista-previa="item"]').count()) > 0), 'el cursor sobre el plato pinta su vista previa');
    const pv = await d.locator('[data-vista-previa="item"]').innerText();
    ok(pv.includes('Mofongo de chicharrón') && /\$\d/.test(pv) && pv.includes('Sabor Dominicano'), 'la vista previa: el plato, su precio y el negocio');
    await shot(d, '1360-desplegable-plato', false);
    await d.keyboard.press('Escape');
    ok(await espera(async () => !(await drop.isVisible())), 'Esc cierra el desplegable');
    await d.getByText('Buscar negocios', { exact: false }).first().click();
    await d.keyboard.type('sabor');
    ok(await espera(async () => (await d.locator('[data-fila="biz"]').count()) > 0), 'escribiendo «sabor»: el negocio');
    await d.locator('[data-fila="biz"]').first().hover();
    ok(await espera(async () => (await d.locator('[data-vista-previa="biz"]').count()) > 0), 'el cursor sobre el negocio pinta su tarjeta');
    await d.getByText('Buscar «sabor»').hover();
    ok(await espera(async () => (await d.locator('[data-vista-previa="go"]').innerText()).includes('Pulsa Enter para ver todo')), 'en «Buscar …», la vista previa dice cuántos hay de cada cosa');
    await d.keyboard.press('Enter');
    ok(await espera(async () => new URL(d.url()).pathname === '/buscar' && new URL(d.url()).searchParams.get('q') === 'sabor'), 'Enter en «Buscar …» lleva a los resultados');
    await d.goto(B + '/negocios'); await d.waitForLoadState('networkidle').catch(() => {});
    await d.getByText('Buscar negocios', { exact: false }).first().click();
    await d.keyboard.type('mofongo');
    await espera(async () => (await d.locator('[data-fila="item"]').count()) > 0);
    // ↓ la primera vez marca «Buscar …»; cada ↓ más baja una fila; Enter en la del plato abre la ficha
    const filasAntes = await d.locator('[data-fila]').evaluateAll((xs) => xs.map((x) => x.getAttribute('data-fila')));
    for (let i = 0; i <= filasAntes.indexOf('item') + 1; i++) await d.keyboard.press('ArrowDown');
    await d.keyboard.press('Enter');
    ok(await espera(async () => new URL(d.url()).pathname === `/n/${BIZ}`), '↓ hasta el plato y Enter abre la ficha del negocio');
    await c3.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await d.goto(B + '/negocios'); await d.waitForLoadState('networkidle').catch(() => {});
    await d.locator('[role="button"]').filter({ hasText: /Search/ }).first().click();
    ok(await espera(async () => (await drop.innerText()).includes('TYPE LIKE YOU TALK')), 'EN: el desplegable en inglés');
    await shot(d, '1360-desplegable-en', false);
    await c3.addCookies([{ name: 'tl_lang', value: 'es', url: B }]);

    // ── 4 · Mi cuenta › Pedidos › Apartados ──
    sql(`update operations set status = 'confirmed', status_detail = null, ready_at = now() + interval '1 day' where number = '${APT}'`);
    const c4 = await tel390(b); abiertas.push(c4);
    const m = await c4.newPage(); mirar(m, 'marisol');
    await entrarComo(m, MARISOL);
    await m.goto(B + '/cuenta/pedidos'); await m.waitForLoadState('networkidle').catch(() => {});
    let tm = await texto(m);
    ok(tm.includes('Apartados') && tm.includes('LO RECOGES Y PAGAS EN EL LOCAL'), 'Pedidos › Todos: la sección «Apartados»');
    ok(tm.includes('LISTO') && /VENCE/.test(tm) && tm.includes('AL RECOGER'), 'el apartado vivo: LISTO, VENCE … y AL RECOGER');
    ok(tm.includes('Cómo llegar') && tm.includes('Ver el negocio'), '«Cómo llegar» y «Ver el negocio»');
    await shot(m, '390-apartados-es');
    await m.getByText('Ver el negocio').first().click();
    ok(await espera(async () => new URL(m.url()).pathname === '/n/boutique-yaritza'), '«Ver el negocio» abre su página');
    // Marisol puede tener otros apartados vivos de otras pruebas (apt4f/apt4q en la misma base): se cuenta, no se pide que no haya ninguno.
    const vivos = (t) => t.split('LO RECOGES Y PAGAS EN EL LOCAL').length - 1;
    await m.goto(B + '/cuenta/pedidos'); await m.waitForLoadState('networkidle').catch(() => {});
    const n1 = vivos(await texto(m));
    sql(`update operations set status = 'cancelled' where number = '${APT}'`);
    await m.goto(B + '/cuenta/pedidos'); await m.waitForLoadState('networkidle').catch(() => {});
    const n2 = vivos(await texto(m));
    ok(n1 >= 1 && n2 === n1 - 1, `un apartado cancelado no sale (antes ${n1}, después ${n2})`);
    await m.goto(B + '/cuenta/pedidos?f=curso'); await m.waitForLoadState('networkidle').catch(() => {});
    ok(!(await texto(m)).includes('LO RECOGES Y PAGAS EN EL LOCAL'), 'en «En curso» no se repiten los apartados (solo en Todos)');

    // ── 5 · Letra más grande ──
    const c5 = await tel390(b); abiertas.push(c5);
    const v = await c5.newPage(); mirar(v, 'letra');
    await entrarComo(v, V1, { nombre: 'Letra', apellido: 'Grande' });
    await v.goto(B + '/cuenta/ajustes'); await v.waitForLoadState('networkidle').catch(() => {});
    ok((await texto(v)).includes('Idioma y pantalla') && (await texto(v)).includes('MÁS FÁCIL DE LEER'), 'Ajustes: «Idioma y pantalla» con «Letra más grande»');
    ok(!(await v.locator('[data-letra="grande"]').count()), 'empieza con la letra normal');
    await v.locator('[role="switch"][aria-label="Letra más grande"]').click();
    ok(await espera(async () => (await texto(v)).includes('Letra más grande activada.')), 'el aviso «Letra más grande activada.»');
    ok(await espera(async () => (await v.locator('[data-letra="grande"]').count()) > 0), 'la app se pinta más grande');
    ok(sql(`select big_text from users where phone = '+1${V1}'`) === 't', 'se guardó en la cuenta (users.big_text)');
    await shot(v, '390-ajustes-letra');
    // Otro navegador con la misma cuenta: la ve desde la primera pintura (el servidor la decide).
    const c6 = await tel390(b); abiertas.push(c6);
    const w = await c6.newPage(); mirar(w, 'letra2');
    await entrarComo(w, V1);
    const malas = [];
    for (const u of ['/', '/buscar?q=mofongo', '/cuenta', '/cuenta/pedidos', `/n/${BIZ}`, '/negocios']) {
      await w.goto(B + u); await w.waitForLoadState('networkidle').catch(() => {});
      if (!(await w.locator('[data-letra="grande"]').count())) malas.push(`${u}: sin la letra`);
      const ancho = await w.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      // 19 nov · En el iPhone SE (375) la ficha se salía 11 px: el mensaje dice qué piezas pasan del borde (las más hondas primero).
      const quien = ancho > 1 ? await w.evaluate(() => { const W = window.innerWidth, out = [];
        for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.width && r.right > W + 1 && ![...el.children].some((c) => c.getBoundingClientRect().right > W + 1)) out.push(`${el.tagName.toLowerCase()}${el.getAttribute('data-screen-label') ? '[' + el.getAttribute('data-screen-label') + ']' : ''}.${String(el.className).slice(0, 60)} «${(el.textContent || '').trim().slice(0, 30)}» →${Math.round(r.right - W)}`); if (out.length > 4) break; }
        return out.join(' ; '); }) : '';
      if (ancho > 1) malas.push(`${u}: scroll de lado (+${ancho}) ${quien}`);
      const noCaben = await botonesQueNoCaben(w); if (noCaben.length) malas.push(`${u}: botones que no caben: ${noCaben.slice(0, 4).join(' ; ')}`);
    }
    ok(!malas.length, `con letra grande, a 390: la letra desde el servidor y sin scroll de lado ni botones que se salgan de su caja en 6 pantallas${malas.length ? ' → ' + malas.join(' | ') : ''}`);
    await w.goto(B + '/buscar?q=mofongo'); await shot(w, '390-letra-buscar');
    await c5.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await v.goto(B + '/cuenta/ajustes'); await v.waitForLoadState('networkidle').catch(() => {});
    ok((await texto(v)).includes('Language and display') && (await texto(v)).includes('EASIER TO READ'), 'EN: «Language and display» · «Larger text»');
    await v.locator('[role="switch"][aria-label="Larger text"]').click();
    ok(await espera(async () => (await texto(v)).includes('Normal text.')), 'EN: apagarla dice «Normal text.»');
    ok(await espera(async () => !(await v.locator('[data-letra="grande"]').count())), 'apagada, la app vuelve a la letra normal');
    ok(sql(`select big_text from users where phone = '+1${V1}'`) === 'f', 'y queda apagada en la cuenta');
    // Sin sesión, la acción no cambia nada (mismo origen + sesión): una persona sin cuenta ve la letra normal.
    const c7 = await tel390(b); abiertas.push(c7);
    const s = await c7.newPage();
    await s.goto(B + '/'); ok(!(await s.locator('[data-letra]').count()), 'sin cuenta, la letra normal');

    // ── 6a · 9t-2 · Las demás categorías, cada una con la regla de su ficha ──
    ok(lista0 && conta && contaK0 === 'curso', 'precondiciones 9t-2: la Lista de Casa Borinquen y «Contabilidad para tu negocio» (curso)');
    await p.goto(B + '/');
    for (const [qq, nom, cat] of [['norteño', 'Norteño · 2 horas', 'Fiestas'], ['jfk', 'A JFK', 'Transporte'], ['lista', 'Lista + clase de salsa', 'Noche'], ['contabilidad', 'Contabilidad para tu negocio', 'Educación'],
      ['invierno', 'Campamento de invierno', 'Niños'], ['natacion', 'Clase de natación', 'Deporte'], ['recuperacion', 'Celebremos la Recuperación', 'Iglesias']])
      ok(nombres(await api(p, qq)).includes(nom), `${cat}: «${qq}» trae «${nom}» en PLATOS Y SERVICIOS`);
    sql(`update businesses set modules_off = coalesce(modules_off, '{}'::jsonb) || '{"svc": {"reason": "prueba bus9t", "by": "prueba"}}'::jsonb where id = '${AERO}'`);
    ok(!nombres(await api(p, 'jfk')).includes('A JFK'), 'Transporte con Servicios pausados por To\'Latino: no sale');
    await p.goto(B + `/n/${AERO}`); await p.waitForLoadState('networkidle').catch(() => {});
    ok(!(await texto(p)).includes('A JFK'), 'y su ficha tampoco lo lista (la misma regla)');
    sql(`update businesses set modules_off = '${aeroOff0}'::jsonb where id = '${AERO}'`);
    ok(nombres(await api(p, 'jfk')).includes('A JFK'), 'sin la pausa, vuelve');
    sql(`update noche_settings set list_on = false where business_id = '${BORI}'`);
    ok(!nombres(await api(p, 'lista')).includes('Lista + clase de salsa'), 'Noche: con la Lista apagada esa noche, no sale');
    sql(`update noche_settings set list_on = ${lista0 === 't'} where business_id = '${BORI}'`);
    ok(!nombres(await api(p, 'dinastia')).includes('Sábado: Banda La Dinastía'), 'Noche: la noche especial sin su evento en vivo no sale');
    await p.goto(B + '/n/cantina-don-beto'); await p.waitForLoadState('networkidle').catch(() => {});
    // (su oferta del día sí dice «Sábado: Banda La Dinastía en vivo, boleto $10»: eso no es el servicio)
    ok(!/Sábado: Banda La Dinastía(?! en vivo)/.test(await p.content()), 'y su ficha tampoco la enseña');
    sql(`update items set svc_kind = 'fijo' where id = ${conta}`);
    ok(!nombres(await api(p, 'contabilidad')).includes('Contabilidad para tu negocio'), 'Educación: lo que no es curso, programa o membresía no sale');
    sql(`update items set svc_kind = '${contaK0}' where id = ${conta}`);
    await p.goto(B + '/buscar?q=clase&tab=itm'); await p.waitForLoadState('networkidle').catch(() => {});
    const tx6 = await texto(p);
    ok(/Educación \d+/.test(tx6) || /Deporte \d+/.test(tx6), 'la pestaña trae el chip de las categorías nuevas (Educación, Deporte…)');
    ok(tx6.includes('Precio en la ficha'), 'un servicio de esas categorías dice «Precio en la ficha» (nunca un número que la ficha no diga)');
    await shot(p, '390-9t2-pestana-clase');

    // ── 6b · La razón de la fila ──
    r = await api(p, 'norteño');
    ok((r.filas.find((x) => x.kind === 'biz' && x.href === '/n/banda-la-dinastia')?.meta ?? '').startsWith('TIENE NORTEÑO'), 'sugerencias: el negocio que encajó por lo que vende dice «TIENE NORTEÑO …»');
    r = await api(p, 'sabor');
    ok(!(r.filas.find((x) => x.kind === 'biz' && x.href === `/n/${BIZ}`)?.meta ?? '').includes('TIENE'), 'el nombre gana: «sabor» no repite una razón');
    await p.goto(B + '/buscar?q=mofongo'); await p.waitForLoadState('networkidle').catch(() => {});
    ok(/Tiene Mofongo de chicharrón · \$\d/.test(await texto(p)), '«mofongo»: Sabor Dominicano sale entre los negocios con «Tiene Mofongo de chicharrón · $…»');
    await shot(p, '390-9t2-razon-mofongo');
    await p.goto(B + '/buscar?q=' + encodeURIComponent('oración del viernes')); await p.waitForLoadState('networkidle').catch(() => {});
    ok(await espera(async () => (await p.locator('[data-negocio="centro-islamico-hazleton"]').count()) > 0 && (await p.locator('[data-negocio="centro-islamico-hazleton"]').innerText()).includes('Tiene Oración del viernes')), 'la fila del Free dice «Tiene Oración del viernes» bajo el nombre');
    await shot(p, '390-9t2-razon-fila');
    await c1.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    r = await api(p, 'norteño');
    ok((r.filas.find((x) => x.kind === 'biz' && x.href === '/n/banda-la-dinastia')?.meta ?? '').startsWith('HAS '), 'EN: «HAS …»');
    await c1.addCookies([{ name: 'tl_lang', value: 'es', url: B }]);

    // ── 6c · El plato abre su hoja ──
    await p.goto(B + '/buscar?q=mofongo'); await p.waitForLoadState('networkidle').catch(() => {});
    await p.locator(`[data-plato="${mof}"]`).click();
    ok(await espera(async () => new URL(p.url()).pathname === `/n/${BIZ}` && new URL(p.url()).searchParams.get('plato') === mof), 'tocar el plato abre su ficha con ?plato=');
    ok(await espera(async () => p.locator('[role="dialog"][aria-label="Mofongo de chicharrón"]').isVisible()), '…y su hoja abierta («Mofongo de chicharrón»), sin tocar nada más');
    await shot(p, '390-9t2-hoja-plato', false);
    await p.goto(B + `/n/${BIZ}?plato=99999999`); await p.waitForLoadState('networkidle').catch(() => {});
    await new Promise((x) => setTimeout(x, 400));
    ok(!(await p.locator('[role="dialog"]').count()), 'un ?plato= que no es de su menú no abre nada (la ficha como siempre)');
    await d.goto(B + '/negocios'); await d.waitForLoadState('networkidle').catch(() => {});
    await d.getByText('Buscar negocios', { exact: false }).first().click();
    await d.keyboard.type('mofongo');
    await espera(async () => (await d.locator('[data-fila="item"]').count()) > 0);
    const filas6 = await d.locator('[data-fila]').evaluateAll((xs) => xs.map((x) => x.getAttribute('data-fila')));
    for (let i = 0; i <= filas6.indexOf('item') + 1; i++) await d.keyboard.press('ArrowDown');
    await d.keyboard.press('Enter');
    ok(await espera(async () => new URL(d.url()).searchParams.get('plato') === mof), '1360: Enter en el plato del desplegable abre la ficha con ?plato=');
    ok(await espera(async () => d.locator('[data-screen-label="Menú · plato · desktop"] [role="dialog"][aria-label="Mofongo de chicharrón"]').isVisible()), '1360: la hoja del plato abierta en la ficha');
    await shot(d, '1360-9t2-hoja-plato', false);

    // ── 6d · El micrófono y la ciudad dentro del desplegable ──
    await d.goto(B + '/negocios'); await d.waitForLoadState('networkidle').catch(() => {});
    await d.evaluate(() => { try { localStorage.removeItem('tl-voz-v1'); } catch { /* sin almacenamiento */ } });
    await d.getByText('Buscar negocios', { exact: false }).first().click();
    ok(await espera(async () => (await d.locator('[data-mic]').count()) > 0), 'el micrófono dentro del campo del desplegable');
    ok((await d.locator('[data-ciudad]').innerText()).includes('Hazleton, PA'), 'el chip de la ciudad dentro del campo («Hazleton, PA · …»)');
    await shot(d, '1360-9t2-desplegable-mic-ciudad', false);
    await d.locator('[data-mic]').click();
    ok(await espera(async () => drop.locator('[data-aviso-voz]').isVisible()), 'la primera vez, el aviso de la voz dentro del panel');
    await shot(d, '1360-9t2-desplegable-aviso-voz', false);
    await drop.getByText('Ahora no').click();
    ok(await espera(async () => (await drop.innerText()).includes('ESCRIBE COMO HABLAS')), '«Ahora no» vuelve al panel');
    await d.locator('[data-ciudad]').click();
    ok(await espera(async () => !(await drop.isVisible()) && d.locator('[data-screen-label="APP-CIUDAD · desktop"]').isVisible()), 'el chip de la ciudad cierra el panel y abre «Ciudad que estás viendo»');
    await shot(d, '1360-9t2-desplegable-ciudad', false);
    // Con la voz apagada en Privacidad, el desplegable no lleva micrófono.
    const voz0 = sql(`select coalesce(voice_search::text, 'null') from users where phone = '+1${V1}'`);
    sql(`update users set voice_search = false where phone = '+1${V1}'`);
    const c8 = await desk(b); abiertas.push(c8);
    const e8 = await c8.newPage(); mirar(e8, 'voz-apagada');
    await entrarComo(e8, V1);
    await e8.goto(B + '/negocios'); await e8.waitForLoadState('networkidle').catch(() => {});
    await e8.getByText('Buscar negocios', { exact: false }).first().click();
    const drop8 = e8.locator('[data-screen-label="APP-BUSCAR · desplegable desktop"]');
    ok(await espera(async () => (await drop8.innerText()).includes('ESCRIBE COMO HABLAS')), 'con cuenta: el desplegable abre');
    ok(!(await e8.locator('[data-mic]').count()), 'con la voz apagada en Privacidad, sin micrófono');
    sql(`update users set voice_search = ${voz0} where phone = '+1${V1}'`);
    ok(!err.length, `sin errores de la página (${err.join(' | ')})`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
    sql(`update items set status = 'live', hidden_reason = null where id = ${mof} and hidden_reason = 'prueba bus9t'`);
    sql(`update item_sections set visible = true where id = ${tos}`);
    sql(`update businesses set modules_off = '${off0}'::jsonb where id = '${BIZ}'`);
    sql(`update business_stats_cache set plan = '${plan0}' where business_id = '${BIZ}'`);
    for (const h of JSON.parse(horas0 || '[]')) sql(`update business_hours set open = ${h.o}, ranges = '${JSON.stringify(h.r)}'::jsonb where business_id = '${BIZ}' and module = '' and weekday = ${h.w}`);
    sql(`update businesses set modules_off = '${aeroOff0}'::jsonb where id = '${AERO}'`);
    if (lista0) sql(`update noche_settings set list_on = ${lista0 === 't'} where business_id = '${BORI}'`);
    if (conta && contaK0) sql(`update items set svc_kind = '${contaK0}' where id = ${conta}`);
    const [st, ra, sd] = apt0.split('|');
    sql(`update operations set status = '${st}', ready_at = ${ra ? `'${ra}'` : 'null'}, status_detail = ${sd ? `'${sd}'` : 'null'} where number = '${APT}'`);
    if (M1) sql(`update business_members set takes_bookings = ${tb0} where id = '${M1}'`);
    if (sql(`select coalesce(string_agg(member_id::text || ':' || coalesce(price_cents::text, ''), ','), '') from staff_services where item_id = ${fade}`) !== ss0) {
      devolverFade();
    }
  }
  console.log(`\nOK bus9t · ${n} ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
