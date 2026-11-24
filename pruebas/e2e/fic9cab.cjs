// CAB (23 nov) · La cabecera de la ficha Pro, según la referencia del fundador. Teléfono: nombre + palomita del sello («Sello To'Latino»), una fila de
// datos, el estado y un solo botón «Contactar» que abre una hoja con Llamar, Escribir y Cómo llegar (ya no hay fila de tres botones). Escritorio:
// Guardar, Compartir y Llamar con texto a la derecha del nombre, y las pestañas con su estado a la derecha cuando la tira queda pegada arriba.
//   1 · La hoja a 390: abre, tres renglones (teléfono con formato, dirección), cada uno hace lo suyo y cuenta su toque UNA vez, Escape, el fondo y la
//       equis la cierran y el foco vuelve a «Contactar».
//   2 · Abierto y cerrado: el estado sale una vez, en su color, junto a «Contactar».
//   3 · Sin teléfono, sin mensajes o sin dirección: solo salen los renglones que el negocio tiene; sin ninguno no hay botón.
//   4 · 320 con letra grande: estado largo, dirección larga, la hoja abierta y la página: nada se sale, nada tapa nada.
//   5 · Nombre larguísimo (320, 390 y 1024): no se sale; la palomita queda en la última línea del nombre.
//   6 · Pestañas con muchos elementos: se deslizan, la activa se ve, flechas del teclado en el teléfono.
//   7 · Escritorio: botones con texto (cada uno hace lo suyo; «Llamar» cuenta UNA vez), la tira pegada con el estado a la derecha.
//   8 · Teléfono (390), la ronda de ajustes del fundador (23 nov): el nombre se pega sobre las pestañas (arriba del todo no se ve), tocar una pestaña
//       DEJA FIJADO el menú arriba (la portada y la cabecera no vuelven ni subiendo ni cambiando de pestaña; solo la flecha de antes del nombre lo
//       suelta), nombre largo con puntos suspensivos y el sello a la vista, la tira de pestañas solo va de lado, la barra de categorías del menú queda
//       DEBAJO de las pestañas, la categoría activa sigue al desplazamiento y queda centrada, y la banda del carrito cabe en la pantalla.
//   9 · prueba en escritorio (decisión pendiente): la franja del nombre pegado (nombre-pegado-desk); si el fundador no la quiere, se borra solo esta parte.
// Precondición propia: lo que se cambia en la base (teléfono, dirección, nombre, cierre de hoy, horario de hoy) vuelve como estaba al terminar.
const ENT = require('../lib/entorno.cjs');
const { hidratado } = require('../lib/hidratado.cjs');
const { botonesQueNoCaben, botonesFueraDeLaVentana, contenidoSeSale } = require('../lib/caben.cjs');
const { entrarComo, telLibre } = require('../lib/negocio-nuevo.cjs');
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const lit = (x) => (x == null ? 'null' : `'${String(x).replace(/'/g, "''")}'`);
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 200)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const TODO = 'barberia-el-primo', DOS = 'barberia-quisqueya'; // TODO: teléfono + mensajes + dirección · DOS: teléfono + dirección (sin dueño en To'Latino)
const MENU = 'sabor-dominicano'; // Pro, con sello y un menú de varias categorías (partes 8 y 9)
const LARGO = 'Barbería y Estética El Primo de la Calle Principal con Servicio a Domicilio'; // 80 letras o menos: el tope de la base (businesses_name_check)
const CALLE_LARGA = '1234 Avenida Doctor Martín Luther King Junior Boulevard Norte, Edificio Comercial Plaza Hazleton Suite 4500, Hazleton, PA';
const ESTADO_LARGO = "Cerrado · abre el lunes a las 11 AM";

(async () => {
  const ids = [TODO, DOS, MENU];
  const orig = {};
  for (const id of ids) {
    const r = sql(`select coalesce(phone,'~'), works_from_home::text, coalesce(address,'~'), name, coalesce(closed_on::text,'~') from businesses where id = '${id}'`).split('|');
    ok(r.length >= 5 && sql(`select s.plan from business_stats_cache s where s.business_id = '${id}'`) === 'pro', `precondición: ${id} es Pro y tiene sus datos`);
    orig[id] = { tel: r[0], casa: r[1], dir: r[2], nombre: r[3], cierre: r[4] };
  }
  const fijar = (id, o) => sql(`update businesses set phone = ${lit(o.tel === '~' ? null : o.tel)}, works_from_home = ${o.casa}, address = ${lit(o.dir === '~' ? null : o.dir)}, name = ${lit(o.nombre)}, closed_on = ${o.cierre === '~' ? 'null' : lit(o.cierre)} where id = '${id}'`);
  const cambiar = (id, set) => sql(`update businesses set ${set} where id = '${id}'`);
  const restaurar = () => { for (const id of ids) fijar(id, orig[id]); sql(`delete from special_hours where label->>'es' = 'fic9cab'`); };
  const hoyLocal = () => sql(`select (now() at time zone 'America/New_York')::date`);
  // Abierto todo el día de hoy (un horario especial propio) o cerrado hoy (closed_on): el estado no depende de la hora en que corre la prueba.
  const abierto = (id) => { cambiar(id, 'closed_on = null, temp_closed_until = null'); sql(`delete from special_hours where business_id = '${id}' and label->>'es' = 'fic9cab'`); const h = hoyLocal();
    sql(`insert into special_hours (business_id, kind, date_from, date_to, closed, ranges, label, status) values ('${id}', 'own', '${h}', '${h}', false, '[["00:00","00:00"]]'::jsonb, '{"es":"fic9cab","en":"fic9cab"}'::jsonb, 'active')`); };
  const cerrado = (id) => { sql(`delete from special_hours where business_id = '${id}' and label->>'es' = 'fic9cab'`); cambiar(id, `closed_on = '${hoyLocal()}', temp_closed_until = null`); };
  const tomas = (id, kind) => Number(sql(`select count(*) from contact_taps where business_id = '${id}' and kind = '${kind}' and source = 'ficha'`));
  // El servidor cuenta un toque por persona (o red) y negocio cada 10 min, sin distinguir el tipo: se «envejecen» los anteriores para medir cada uno.
  const envejecer = () => sql(`update contact_taps set at = at - interval '3 hours' where at > now() - interval '3 hours'`);

  const b = await chromium.launch(); const abiertas = []; const err = [];
  const tel = telLibre();
  const ctx = async (w, h, extra = {}) => { const c = await b.newContext({ ...devices['iPhone 13'], viewport: { width: w, height: h }, deviceScaleFactor: 2, ...extra }); abiertas.push(c); return c; };
  const mirar = (p) => { p.on('pageerror', (e) => err.push(e.message)); p.on('console', (z) => { if (z.type() === 'error' && !/Failed to load|404|pexels|ERR_|favicon/.test(z.text())) err.push('console ' + z.text()); }); };
  const abrirFicha = async (p, id, extra = '') => { await p.goto(B + `/n/${id}${extra}`); await p.locator('[data-ficha="nueva"]').waitFor(); await p.locator('[data-pieza="cabecera-ficha"]').first().waitFor(); };
  const btnContactar = (p) => p.locator('[data-pieza="contactar-ficha"] [role="button"]');
  const hoja = (p) => p.locator('[role="dialog"][data-screen-label="Ficha · contactar"]');
  const enfocado = (p) => p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}|${(a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 20)}|${!!a.closest('[data-pieza="contactar-ficha"]')}` : ''; });
  const abrirHoja = async (p) => { await btnContactar(p).click(); await hoja(p).waitFor(); };
  try {
    abierto(TODO); abierto(DOS);

    console.log('1 · La hoja «Contactar» a 390 (teléfono)');
    const cm = await ctx(390, 844, { hasTouch: true }), m = await cm.newPage(); mirar(m);
    await entrarComo(m, tel);
    await abrirFicha(m, TODO);
    ok(await m.locator('[data-pieza="acciones-ficha"]').count() === 0, 'ya no hay la fila «Llamar · Escribir · Cómo llegar»');
    ok(await btnContactar(m).count() === 1 && (await btnContactar(m).innerText()).trim() === 'Contactar', 'un solo botón «Contactar» junto al estado');
    ok(await btnContactar(m).getAttribute('aria-haspopup') === 'dialog' && await btnContactar(m).getAttribute('aria-expanded') === 'false', '«Contactar» avisa que abre una hoja (aria-haspopup="dialog", aria-expanded="false")');
    ok(await btnContactar(m).locator('svg').count() === 1 && (await btnContactar(m).evaluate((e) => e.firstChild.nodeName.toLowerCase() === '#text' || e.firstChild.nodeName.toLowerCase() !== 'svg')), '«Contactar» lleva su flecha a la DERECHA del texto (sin icono a la izquierda)');
    ok((await btnContactar(m).boundingBox()).height >= 44, '«Contactar» mide 44 o más de alto');
    
    const sello = m.locator('[data-pieza="cabecera-ficha"] h1 [role="img"]');
    ok(await sello.count() === 1 && /Sello To'Latino/.test(await sello.getAttribute('aria-label')), 'la palomita del sello tiene su nombre accesible («Sello To\'Latino»)');
    ok(!/\bPRO\b/.test(await m.locator('[data-pieza="cabecera-ficha"]').innerText()), 'la cabecera ya no lleva la pastilla «PRO»');
    ok(await m.locator('[data-pieza="cabecera-ficha"] [data-estado]').count() === 1, 'el estado sale una vez en la cabecera');
    await m.screenshot({ path: OUT + 'cab9-390-abierto.png' });
    await abrirHoja(m);
    ok(await enfocado(m) !== '' && await btnContactar(m).getAttribute('aria-expanded') === 'true', 'la hoja abre y «Contactar» queda aria-expanded="true"');
    const nombres = await hoja(m).getByRole('button').allInnerTexts();
    const reng = hoja(m).locator('button, [role=button]').filter({ hasText: /Llamar|Escribir|Cómo llegar/ });
    ok(await reng.count() === 3, `tres renglones: ${(await reng.allInnerTexts()).map((x) => x.replace(/\s+/g, ' ')).join(' | ')}`);
    ok(/\(\d{3}\) \d{3}-\d{4}/.test(await reng.nth(0).innerText()), 'Llamar muestra el teléfono con formato (570) 555-0100');
    ok(/\d/.test(await reng.nth(2).innerText()), 'Cómo llegar muestra la dirección');
    ok(nombres.some((x) => /Cerrar|Close/.test(x)) || await hoja(m).getByRole('button', { name: 'Cerrar' }).count() === 1, 'la hoja tiene su botón «Cerrar» con nombre');
    ok(await hoja(m).getAttribute('aria-modal') === 'true' && /Contactar a /.test(await hoja(m).getAttribute('aria-label')), 'la hoja es un diálogo con nombre («Contactar a …»)');
    const altos = []; for (let i = 0; i < 3; i++) altos.push(Math.round((await reng.nth(i).boundingBox()).height));
    ok(altos.every((x) => x >= 44), `cada renglón mide 44 o más (${altos.join(', ')})`);
    ok(!(await botonesQueNoCaben(m)).length && !(await botonesFueraDeLaVentana(m)).length, '390: ningún botón se sale (con la hoja abierta)');
    await m.screenshot({ path: OUT + 'cab9-390-hoja.png' });
    // Cerrar: Escape, el fondo, la equis; el foco vuelve a «Contactar».
    await m.keyboard.press('Escape'); await hoja(m).waitFor({ state: 'detached' });
    ok(await espera(async () => (await enfocado(m)).endsWith('|Contactar|true') || /Contactar\|true$/.test(await enfocado(m))), `Escape cierra y el foco vuelve a «Contactar» (${await enfocado(m)})`);
    await abrirHoja(m); await m.mouse.click(195, 40); await hoja(m).waitFor({ state: 'detached' });
    ok(await espera(async () => /Contactar\|true$/.test(await enfocado(m))), 'tocar el fondo la cierra y el foco vuelve a «Contactar»');
    await abrirHoja(m); await hoja(m).getByRole('button', { name: 'Cerrar' }).click(); await hoja(m).waitFor({ state: 'detached' });
    ok(await espera(async () => /Contactar\|true$/.test(await enfocado(m))), 'la equis la cierra y el foco vuelve a «Contactar»');
    ok(await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, 'teléfono sin scroll de lado');

    // Cada renglón: hace lo suyo y cuenta SU toque una sola vez (también tras esperar los reintentos de la bandeja).
    // · Llamar → tel:  (se atrapa la navegación pedida; en el navegador de pruebas no hay aplicación de teléfono)
    const cdp = await cm.newCDPSession(m); await cdp.send('Page.enable'); const pedidas = []; cdp.on('Page.frameRequestedNavigation', (e) => pedidas.push(e.url));
    envejecer(); const l0 = tomas(TODO, 'call');
    await abrirHoja(m); await hoja(m).getByRole('button', { name: /^Llamar/ }).click();
    ok(await hoja(m).count() === 0, 'tocar «Llamar» cierra la hoja');
    ok(await espera(async () => tomas(TODO, 'call') === l0 + 1), 'Llamar: la base cuenta el toque (call · ficha)');
    ok(await espera(async () => pedidas.some((u) => /^tel:\+?\d{10,}$/.test(u))), `Llamar: abre tel: (${pedidas.filter((u) => /^tel:/.test(u)).join(',')})`);
    await m.waitForTimeout(3500); ok(tomas(TODO, 'call') === l0 + 1 && pedidas.filter((u) => /^tel:/.test(u)).length === 1, 'Llamar: UN toque y UN tel: (sin repetir tras los reintentos)');
    // · Cómo llegar → el enlace del mapa del teléfono (maps:// en el iPhone), sin salir de To'Latino
    await m.evaluate(() => { window.__llegar = []; document.addEventListener('click', (e) => { const a = e.target; if (a && a.dataset && a.dataset.comoLlegar) { window.__llegar.push(a.href); e.preventDefault(); } }, true); });
    envejecer(); const d0 = tomas(TODO, 'directions');
    await abrirHoja(m); await hoja(m).getByRole('button', { name: /^Cómo llegar/ }).click();
    ok(await espera(async () => (await m.evaluate(() => window.__llegar)).length === 1), 'Cómo llegar: abre el enlace del mapa una vez');
    ok(/^maps:\/\/\?daddr=-?\d+\.\d+,-?\d+\.\d+/.test((await m.evaluate(() => window.__llegar))[0]), 'Cómo llegar: maps:// con las coordenadas del negocio');
    ok(await espera(async () => tomas(TODO, 'directions') === d0 + 1), 'Cómo llegar: la base cuenta el toque (directions · ficha)');
    await m.waitForTimeout(3000); ok(tomas(TODO, 'directions') === d0 + 1, 'Cómo llegar: UN toque');
    // · Escribir → Mensajes con el negocio
    envejecer(); const e0 = tomas(TODO, 'message');
    await abrirHoja(m); await hoja(m).getByRole('button', { name: /^Escribir/ }).click();
    await m.waitForURL(new RegExp(`/cuenta/mensajes/${TODO}`));
    ok(true, 'Escribir: abre Mensajes con el negocio');
    ok(await espera(async () => tomas(TODO, 'message') === e0 + 1), 'Escribir: la base cuenta el toque (message · ficha)');
    await m.waitForTimeout(3000); ok(tomas(TODO, 'message') === e0 + 1, 'Escribir: UN toque');

    console.log('2 · Abierto y cerrado');
    await abrirFicha(m, TODO);
    const est = m.locator('[data-pieza="cabecera-ficha"] [data-estado]');
    ok(await est.getAttribute('data-estado') === 'abierto' && /^Abierto/.test((await est.innerText()).trim()), `abierto: «${(await est.innerText()).trim()}»`);
    const colA = await est.evaluate((e) => getComputedStyle(e).color);
    ok(!(await botonesQueNoCaben(m)).length && !(await botonesFueraDeLaVentana(m)).length, 'abierto: nada se sale');
    cerrado(TODO); await abrirFicha(m, TODO);
    ok(await est.getAttribute('data-estado') === 'cerrado' && /^Cerrado/.test((await est.innerText()).trim()), `cerrado: «${(await est.innerText()).trim()}»`);
    // ESTADO_SIN_REPETIR · «Cerrado hoy · hoy · abre mañana 9 AM» (23 nov): la palabra de adelante no vuelve en lo que sigue, ni queda un « · » colgando.
    const sinRepetir = (t) => !/(^|[\s·])(\p{L}+)[\s·]+\2([\s·]|$)/iu.test(t) && !/^[\s·]|[\s·]$|·\s*·/.test(t);
    const tCerrado = (await est.innerText()).replace(/\s+/g, ' ').trim();
    ok(/^Cerrado hoy( · abre (mañana|\w{3}) \d{1,2}(:\d\d)? [AP]M)?$/.test(tCerrado) && sinRepetir(tCerrado), `cerrado hoy: la palabra no se repite («${tCerrado}»)`);
    cambiar(TODO, `closed_on = null, temp_closed_until = now() + interval '2 days'`); await abrirFicha(m, TODO);
    const tTemp = (await est.innerText()).replace(/\s+/g, ' ').trim();
    ok(tTemp === 'Cerrado temporalmente' && sinRepetir(tTemp), `cerrado temporalmente: sin «temporalmente» repetido («${tTemp}»)`);
    cerrado(TODO); await abrirFicha(m, TODO);
    const colC = await est.evaluate((e) => getComputedStyle(e).color);
    ok(colA !== colC, `el estado cambia de color (${colA} → ${colC})`);
    ok(await btnContactar(m).count() === 1 && !(await botonesFueraDeLaVentana(m)).length, 'cerrado: «Contactar» sigue ahí y cabe');
    await m.screenshot({ path: OUT + 'cab9-390-cerrado.png' });

    console.log('3 · Solo los renglones que el negocio tiene');
    const filas = async (id) => { await abrirFicha(m, id); if (!(await btnContactar(m).count())) return []; await abrirHoja(m); const t = (await hoja(m).locator('button, [role=button]').filter({ hasText: /Llamar|Escribir|Cómo llegar/ }).allInnerTexts()).map((x) => x.split('\n')[0].trim()); await m.keyboard.press('Escape'); await hoja(m).waitFor({ state: 'detached' }); return t; };
    ok((await filas(TODO)).join('|') === 'Llamar|Escribir|Cómo llegar', 'con teléfono, mensajes y dirección: los tres');
    ok((await filas(DOS)).join('|') === 'Llamar|Cómo llegar', 'sin dueño en To\'Latino (sin mensajes): Llamar y Cómo llegar');
    cambiar(TODO, 'phone = null'); ok((await filas(TODO)).join('|') === 'Escribir|Cómo llegar', 'sin teléfono: Escribir y Cómo llegar');
    cambiar(TODO, 'works_from_home = true'); ok((await filas(TODO)).join('|') === 'Escribir', 'sin teléfono y sin dirección (a domicilio): solo Escribir');
    cambiar(DOS, 'works_from_home = true'); ok((await filas(DOS)).join('|') === 'Llamar', 'sin dirección: solo Llamar');
    cambiar(DOS, 'phone = null'); ok((await filas(DOS)).length === 0 && await btnContactar(m).count() === 0 && await m.locator('[data-pieza="contactar-ficha"]').count() === 0, 'sin teléfono, mensajes ni dirección: no hay botón «Contactar»');
    ok(!(await botonesFueraDeLaVentana(m)).length, 'sin botón: la cabecera cabe igual');
    fijar(TODO, orig[TODO]); fijar(DOS, orig[DOS]); abierto(TODO); abierto(DOS);

    console.log('4 · 320 con letra grande');
    sql(`update users set big_text = true where phone = '+1${tel}'`);
    const c3 = await ctx(320, 640, { hasTouch: true }), s = await c3.newPage(); mirar(s); await entrarComo(s, tel);
    cambiar(TODO, `address = ${lit(CALLE_LARGA)}`); cerrado(TODO);
    await abrirFicha(s, TODO);
    ok(await s.locator('[data-letra="grande"]').count() > 0, 'la letra grande está puesta');
    // El estado largo de verdad no se puede forzar por la hora: se pone el texto más largo que puede decir («Cerrado · abre el lunes a las 11 AM»).
    await s.locator('[data-pieza="cabecera-ficha"] [data-estado] > span.font-extrabold').evaluate((e, t) => { e.textContent = t; }, ESTADO_LARGO);
    const fe = await s.locator('[data-pieza="cabecera-ficha"] [data-estado]').boundingBox(), fb = await btnContactar(s).boundingBox();
    ok(fe.x + fe.width <= fb.x + 1 && fb.x + fb.width <= 320 + 1, `estado largo: el estado (${Math.round(fe.x)}–${Math.round(fe.x + fe.width)}) no pisa «Contactar» (${Math.round(fb.x)}–${Math.round(fb.x + fb.width)}) y cabe en 320`);
    ok(!(await contenidoSeSale(s, '[data-pieza="cabecera-ficha"]')).length, 'estado largo: nada de la cabecera pasa de su caja');
    ok(!(await botonesQueNoCaben(s)).length && !(await botonesFueraDeLaVentana(s)).length, '320 letra grande: ningún botón se sale');
    ok(await s.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, '320 letra grande: sin scroll de lado');
    await s.screenshot({ path: OUT + 'cab9-320-letra-grande.png' });
    await abrirHoja(s);
    ok(!(await contenidoSeSale(s, '[data-screen-label="Ficha · contactar"] button, [data-screen-label="Ficha · contactar"] [role=button]')).length, 'hoja a 320: dirección larga, nada se sale del renglón (se corta con elipsis)');
    const sub = hoja(s).locator('button, [role=button]').filter({ hasText: /Cómo llegar/ }).locator('span.truncate');
    ok(await sub.evaluate((e) => getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth), 'la dirección larga se corta con elipsis (text-overflow: ellipsis)');
    ok(!(await botonesQueNoCaben(s)).length && !(await botonesFueraDeLaVentana(s)).length, 'hoja a 320 letra grande: ningún botón se sale');
    const anchoHoja = (await hoja(s).boundingBox()); ok(anchoHoja.x >= -1 && anchoHoja.x + anchoHoja.width <= 321, 'la hoja cabe en 320');
    await s.screenshot({ path: OUT + 'cab9-320-hoja.png' });
    await s.keyboard.press('Escape'); await hoja(s).waitFor({ state: 'detached' });
    ok(await espera(async () => /Contactar\|true$/.test(await enfocado(s))), '320: Escape cierra y el foco vuelve');
    fijar(TODO, orig[TODO]); abierto(TODO);

    console.log('5 · Nombre larguísimo');
    cambiar(TODO, `name = ${lit(LARGO)}`);
    for (const [w, h, letra] of [[320, 640, true], [390, 844, false]]) {
      sql(`update users set big_text = ${letra} where phone = '+1${tel}'`);
      const c = await ctx(w, h, { hasTouch: true }), p = await c.newPage(); mirar(p); await entrarComo(p, tel);
      await abrirFicha(p, TODO);
      const h1 = p.locator('[data-pieza="cabecera-ficha"] h1'), se = h1.locator('[role="img"]');
      const r1 = await h1.boundingBox(), r2 = await se.boundingBox();
      ok(r1.x >= 0 && r1.x + r1.width <= w + 1, `${w}: el nombre largo no se sale (${Math.round(r1.x)}–${Math.round(r1.x + r1.width)})`);
      ok(r2.x >= r1.x - 1 && r2.x + r2.width <= r1.x + r1.width + 1, `${w}: la palomita queda dentro del nombre`);
      const ultima = await h1.evaluate((e) => { const t = [...e.childNodes].filter((x) => x.nodeType === 3).pop(); const r = document.createRange(); r.selectNodeContents(t); const q = [...r.getClientRects()]; const u = q[q.length - 1]; return { top: u.top, bottom: u.bottom, n: q.length }; });
      ok(r2.y + r2.height / 2 >= ultima.top - 2 && r2.y + r2.height / 2 <= ultima.bottom + 2, `${w}: la palomita va pegada a la última línea del nombre (no huérfana en otra)`);
      const datos = await p.locator('[data-pieza="cabecera-ficha"] > div').nth(1).boundingBox();
      ok(r1.y + r1.height <= datos.y + 1, `${w}: el nombre no tapa la fila de datos`);
      ok(!(await botonesQueNoCaben(p)).length && !(await botonesFueraDeLaVentana(p)).length && await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, `${w}: ningún botón se sale ni la página se mueve de lado`);
      if (w === 390) await p.screenshot({ path: OUT + 'cab9-390-nombre-largo.png' });
      await c.close();
    }
    sql(`update users set big_text = false where phone = '+1${tel}'`);

    console.log('6 · Pestañas con muchos elementos');
    const pro10 = sql(`select b.id from businesses b join business_stats_cache s on s.business_id = b.id where b.status = 'active' and s.plan = 'pro' and b.id in ('sabor-dominicano','barberia-el-primo','autos-el-cibao','boutique-yaritza','bufete-almonte','funeraria-la-paz') order by b.id`).split('\n');
    let mejor = null, mejorN = 0; const c6 = await ctx(390, 844, { hasTouch: true }), t6 = await c6.newPage(); mirar(t6);
    for (const id of pro10) { await abrirFicha(t6, id); const k = await t6.getByRole('tab').count(); if (k > mejorN) { mejor = id; mejorN = k; } }
    ok(mejorN >= 6, `la ficha con más pestañas (${mejor}) tiene ${mejorN}`);
    await abrirFicha(t6, mejor);
    const lista = t6.getByRole('tablist'), tabs = t6.getByRole('tab');
    ok(await lista.evaluate((e) => e.scrollWidth > e.clientWidth + 4), 'la tira se desliza de lado (hay más pestañas que ancho)');
    ok(await tabs.first().getAttribute('aria-selected') === 'true', 'la activa al abrir es la primera (Resumen)');
    ok(!/[a-zñ]/.test('') && (await tabs.first().evaluate((e) => getComputedStyle(e).textTransform)) === 'none', 'las pestañas ya no van en mayúsculas');
    const alt = await tabs.evaluateAll((xs) => xs.map((x) => Math.round(x.getBoundingClientRect().height))); ok(alt.every((x) => x >= 44), `cada pestaña mide 44 o más (${Math.min(...alt)})`);
    await tabs.first().focus();
    for (let i = 0; i < mejorN - 1; i++) await t6.keyboard.press('ArrowRight');
    const foco = await t6.evaluate(() => { const a = document.activeElement, l = a.closest('[role=tablist]'); const r = a.getBoundingClientRect(), q = l.getBoundingClientRect(); return { rol: a.getAttribute('role'), ok: r.left >= q.left - 1 && r.right <= q.right + 1, ult: a === [...l.querySelectorAll('[role=tab]')].pop() }; });
    ok(foco.rol === 'tab' && foco.ult, 'flechas: ArrowRight lleva el foco hasta la última pestaña');
    ok(foco.ok, 'la pestaña con el foco se ve completa dentro de la tira (la tira se desliza sola)');
    await t6.keyboard.press('Enter');
    ok(await tabs.last().getAttribute('aria-selected') === 'true', 'Enter activa la última pestaña');
    const vis = await tabs.last().boundingBox(); ok(vis.x >= -1 && vis.x + vis.width <= 391, 'la activa se ve en pantalla');
    await t6.keyboard.press('Home'); ok(await t6.evaluate(() => document.activeElement.getAttribute('role')) === 'tab' && (await t6.evaluate(() => document.activeElement.textContent.trim())) === (await tabs.first().innerText()).trim(), 'Home: el foco vuelve a la primera');
    // Entrar por el enlace de la última pestaña: la activa tiene que verse aunque la tira se deslice (no basta con que sea la «activa»).
    await t6.goto(B + `/n/${mejor}?tab=rel`); await t6.getByRole('tab').first().waitFor();
    ok(/Relacionados/.test(await t6.locator('[role=tab][aria-selected=true]').innerText()), 'el enlace ?tab=rel abre «Relacionados» (la última pestaña)');
    ok(await espera(async () => { const r = await t6.locator('[role=tab][aria-selected=true]').boundingBox(); return r && r.x >= -1 && r.x + r.width <= 391; }, 4000), 'entrando por ?tab= de la última pestaña, la activa se ve (la tira se desliza hasta ella)');
    await t6.screenshot({ path: OUT + 'cab9-390-pestanas.png' });

    console.log('7 · Escritorio: botones con texto y la tira pegada');
    cambiar(TODO, `name = ${lit(LARGO)}`); abierto(TODO);
    const cd = await b.newContext({ viewport: { width: 1024, height: 800 } }); abiertas.push(cd); const d = await cd.newPage(); mirar(d); await entrarComo(d, tel);
    await abrirFicha(d, TODO);
    const bt = (nom) => d.locator('[data-pieza="cabecera-ficha"]').last().getByRole('button', { name: nom });
    ok(await bt('Guardar').count() === 1 && await bt('Compartir').count() === 1 && await bt('Llamar').count() === 1, 'escritorio: Guardar, Compartir y Llamar con texto');
    const bx = await Promise.all(['Guardar', 'Compartir', 'Llamar'].map((x) => bt(x).boundingBox())), h1d = await d.locator('[data-pieza="cabecera-ficha"] h1').last().boundingBox();
    ok(bx.every((x) => x.x >= 0 && x.x + x.width <= 1025) && bx.every((x) => x.height >= 36), `1024 con nombre largo: los botones caben (${bx.map((x) => `${Math.round(x.x)}–${Math.round(x.x + x.width)}`).join(', ')}) y miden ≥ 36 de alto`);
    ok(!bx.some((x) => x.x < h1d.x + h1d.width && x.x + x.width > h1d.x && x.y < h1d.y + h1d.height && x.y + x.height > h1d.y), '1024: los botones no tapan el nombre');
    ok(!(await botonesQueNoCaben(d)).length && !(await botonesFueraDeLaVentana(d)).length && !(await contenidoSeSale(d, '[data-pieza="cabecera-ficha"]')).length && await d.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, '1024 con nombre largo: nada se sale ni la página se mueve de lado');
    await d.screenshot({ path: OUT + 'cab9-1024-nombre-largo.png' });
    cambiar(TODO, `name = ${lit(orig[TODO].nombre)}`);
    await d.setViewportSize({ width: 1360, height: 900 }); await abrirFicha(d, TODO);
    envejecer(); const dl0 = tomas(TODO, 'call'); const nav = []; const cdd = await cd.newCDPSession(d); await cdd.send('Page.enable'); cdd.on('Page.frameRequestedNavigation', (e) => nav.push(e.url));
    await bt('Llamar').click();
    ok(await espera(async () => tomas(TODO, 'call') === dl0 + 1), 'escritorio · Llamar: la base cuenta el toque (call · ficha)');
    ok(await espera(async () => nav.some((u) => /^tel:/.test(u))), 'escritorio · Llamar: abre tel:');
    await d.waitForTimeout(3000); ok(tomas(TODO, 'call') === dl0 + 1, 'escritorio · Llamar: UN toque');
    envejecer(); const gs0 = sql(`select count(*) from contact_taps where business_id = '${TODO}' and kind = 'share'`);
    await bt('Compartir').click(); ok(await espera(async () => sql(`select count(*) from contact_taps where business_id = '${TODO}' and kind = 'share'`) === String(Number(gs0) + 1)), 'escritorio · Compartir: cuenta su toque (share)');
    await abrirFicha(d, TODO);
    const pestD = d.locator('[data-pieza="pestanas-ficha"]');
    ok(await pestD.count() === 1 && await pestD.locator('[data-pestana]').count() >= 3, 'escritorio: la tira de pestañas (icono + palabra)');
    ok(await pestD.locator('[data-pestana][aria-current="page"]').count() === 1, 'escritorio: una sola pestaña con aria-current="page"');
    await d.screenshot({ path: OUT + 'cab9-1360-arriba.png' });
    await d.mouse.wheel(0, 900); await d.waitForTimeout(700);
    // 24 nov (fundador) · La tira va de esquina a esquina; el estado pasa a la barra del nombre, a la derecha.
    const aside = d.locator('[data-pieza="nombre-pegado-desk"] [data-pieza="estado-pegado"]').filter({ hasText: /^(Abierto|Cerrado)/ });
    ok(await espera(async () => (await aside.count()) === 1 && await aside.isVisible()), `tira pegada arriba: el estado a la derecha de la barra del nombre («${(await aside.first().innerText().catch(() => '')).trim()}»)`);
    const anchoT = await d.evaluate(() => { const t = document.querySelector('[data-pieza="pestanas-ficha"][data-ancho="completo"]'); if (!t) return null; const a = t.getBoundingClientRect(), c = t.parentElement.parentElement.getBoundingClientRect(), cs = getComputedStyle(t.parentElement.parentElement); return Math.abs(a.width - (c.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))); });
    ok(anchoT !== null && anchoT <= 1, `escritorio: la tira de pestañas va de esquina a esquina del contenido (diferencia ${anchoT} px)`);
    const pb = await pestD.boundingBox(); ok(pb.y >= 0 && pb.y < 200, 'la tira queda pegada arriba al bajar');
    await d.screenshot({ path: OUT + 'cab9-1360-pegada.png' });
    await d.setViewportSize({ width: 1360, height: 900 });
    const act = await pestD.locator('[data-pestana]').nth(1).click().then(() => true).catch(() => false);
    ok(act, 'escritorio: tocar otra pestaña');
    await d.screenshot({ path: OUT + 'cab9-1360-otra-pestana.png' });

    console.log('8 · Teléfono (390): tocar una pestaña deja el menú fijado arriba; nombre encima, categorías debajo de las pestañas, carrito dentro');
    // Ronda de ajustes del fundador (23 nov, en su teléfono). Medidas de FichaNueva: la cabecera de la app (CAB_MOVIL), la franja del nombre
    // (NOMBRE_MOVIL) y el alto de las pestañas (PestanasFicha): lo pegado se apila 57 + 44 + 50 y lo de dentro de una pestaña se pega a los 151.
    const FICHA_FIJA = { cab: 57, nombre: 44, pest: 50 }; const DEBAJO = FICHA_FIJA.cab + FICHA_FIJA.nombre + FICHA_FIJA.pest;
    abierto(MENU);
    // Con la oferta en vivo de la semilla puesta: el «Antes $x» (sr-only) de la tira de Populares ensanchaba la página 18 px (arreglado: la tira es relative).
    ok(/^[1-9]/.test(sql(`select count(*) from business_posts where business_id = '${MENU}' and kind = 'oferta' and status = 'live'`)), 'el negocio de la prueba tiene una oferta en vivo (el caso que ensanchaba la página)');
    const SEL_FRANJA = '[data-pieza="nombre-pegado"]', SEL_FILA = `${SEL_FRANJA} > div`, SEL_FLECHA = `${SEL_FRANJA} [data-pieza="volver-arriba"]`, SEL_NOMBRE = `${SEL_FILA} span.truncate`;
    const SEL_PEST = '[data-screen-label="App · Ficha"] [data-pieza="pestanas-ficha"]', SEL_CAB = '[data-screen-label="App · Ficha"] [data-pieza="cabecera-ficha"]', SEL_PORTADA = '[data-screen-label="App · Ficha"] div.h-\\[330px\\]';
    const SEL_TIRA = '[data-screen-label="App · Ficha"] [data-pieza="pestanas-ficha"] [role=tablist]', SEL_BANDA = '[data-screen-label="Ficha · barra del pedido"]';
    const c8 = await ctx(390, 844, { hasTouch: true }), q = await c8.newPage(); mirar(q); await entrarComo(q, tel);
    const rect = (p, sel) => p.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width }; });
    // Quieto = la página ya no se mueve (dos lecturas seguidas iguales); espera por condición, nunca un tiempo fijo.
    const quieto = async (p) => { let a = -1; await espera(async () => { const y = await p.evaluate(() => window.scrollY); const igual = y === a; a = y; return igual; }, 8000); };
    const irA = async (p, y, suave = false) => { await p.evaluate(([y, s]) => window.scrollTo({ top: y, behavior: s ? 'smooth' : 'instant' }), [y, suave]); await quieto(p); };
    const arriba = (p) => irA(p, 0);
    // Baja hasta que las pestañas quedan pegadas (101) y `mas` píxeles más.
    const bajar = async (p, mas = 200) => { await p.evaluate((m) => window.scrollTo({ top: Math.min(document.documentElement.scrollHeight - window.innerHeight, window.scrollY + document.querySelector('[data-screen-label="App · Ficha"] [data-pieza="pestanas-ficha"]').getBoundingClientRect().top - 101 + m), behavior: 'instant' }), mas); await quieto(p); };
    // Lo pegado se ve de verdad: lo que hay en su centro es ella misma (nada pegado la tapa).
    const sobre = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + Math.min(r.width / 2, 60), r.top + r.height / 2); return !!t && e.contains(t); }, sel);
    const abrirTel = async (p, id) => { await abrirFicha(p, id); await hidratado(p.getByRole('tab').first()); await arriba(p); };
    const fijado = (p) => p.locator(SEL_FRANJA).getAttribute('data-fijado'), vista = (p) => p.locator(SEL_FRANJA).getAttribute('data-visible');
    const opaca = (p) => p.locator(SEL_FILA).evaluate((e) => getComputedStyle(e).opacity);
    const pestana = (p, re) => p.getByRole('tab', { name: re });
    const cabVisible = async (p) => (await p.locator(SEL_CAB).isVisible()) || (await p.locator(SEL_PORTADA).count()) > 0;
    const nombre = sql(`select name from businesses where id = '${MENU}'`);

    // 8.1 · El nombre pegado: arriba del todo no se ve; al bajar sale sobre las pestañas, con su sello, en negrita; la flecha va antes del nombre.
    await abrirTel(q, MENU);
    ok(await fijado(q) === 'no' && await vista(q) === 'no' && await opaca(q) === '0', 'arriba del todo el nombre pegado NO se ve (data-visible="no", opacidad 0) y el menú no está fijado');
    ok(await q.locator(SEL_CAB).isVisible() && await q.locator(SEL_PORTADA).count() === 1, 'arriba del todo se ven la portada y la cabecera');
    await bajar(q);
    ok(await espera(async () => await vista(q) === 'si' && await opaca(q) === '1'), 'al bajar hasta que las pestañas se pegan sale el nombre pegado (data-visible="si", opacidad 1)');
    ok(await fijado(q) === 'no', 'bajar a mano no deja fijado el menú (data-fijado="no")');
    const rf = await rect(q, SEL_FILA), rp = await rect(q, SEL_PEST);
    ok(Math.abs(rf.top - FICHA_FIJA.cab) <= 1 && Math.abs(rf.height - FICHA_FIJA.nombre) <= 1, `el nombre pegado ocupa ${FICHA_FIJA.cab}–${FICHA_FIJA.cab + FICHA_FIJA.nombre} (${Math.round(rf.top)}–${Math.round(rf.bottom)})`);
    ok(Math.abs(rp.top - rf.bottom) <= 1, `las pestañas quedan justo debajo del nombre, sin hueco ni montarse (${Math.round(rf.bottom)} y ${Math.round(rp.top)})`);
    ok(await sobre(q, SEL_FILA) && await sobre(q, SEL_PEST), 'ni el nombre ni las pestañas quedan tapados por otra cosa pegada (elementFromPoint)');
    ok((await q.locator(SEL_FILA).innerText()).replace(/\s+/g, ' ').trim() === nombre, `el nombre pegado dice el nombre del negocio («${nombre}»)`);
    ok(await q.locator(SEL_NOMBRE).evaluate((e) => Number(getComputedStyle(e).fontWeight)) >= 700, 'el nombre pegado va en negrita');
    ok(await q.locator(`${SEL_FILA} [role="img"]`).count() === 1 && /Sello To'Latino/.test(await q.locator(`${SEL_FILA} [role="img"]`).getAttribute('aria-label')), 'el nombre pegado lleva el sello de verificado');
    const rfl = await rect(q, SEL_FLECHA), rnm = await rect(q, SEL_NOMBRE);
    ok(rfl.right <= rnm.left + 1 && rfl.height >= 44, 'la flecha va antes del nombre y mide 44 de alto');
    await q.screenshot({ path: OUT + 'cab9-390-nombre-pegado.png' });
    await q.locator(SEL_FLECHA).click();
    ok(await espera(async () => (await q.evaluate(() => window.scrollY)) === 0), 'sin fijar, la flecha sube suave hasta arriba');
    ok(await fijado(q) === 'no' && await cabVisible(q) && await pestana(q, /^Resumen/).getAttribute('aria-selected') === 'true', 'sin fijar, la flecha no cambia nada más: sigue Resumen con la cabecera visible');

    // 8.2 · Tocar una pestaña FIJA el menú: la portada y la cabecera se guardan y ni subir, ni bajar, ni cambiar de pestaña las trae de vuelta.
    await pestana(q, /^Men/).click();
    ok(await espera(async () => await fijado(q) === 'si'), 'tocar «Menú» deja fijado el menú arriba (data-fijado="si")');
    ok(await espera(async () => (await q.evaluate(() => window.scrollY)) === 0), 'al fijar, la página queda arriba del todo');
    ok(await q.locator(SEL_CAB).isHidden() && await q.locator(SEL_PORTADA).count() === 0, 'fijado: la portada y la cabecera (cabecera-ficha) quedan ocultas');
    ok(await espera(async () => await vista(q) === 'si' && await opaca(q) === '1'), 'fijado: el nombre pegado se ve también arriba del todo');
    await irA(q, 1200);
    ok(await fijado(q) === 'si' && !(await cabVisible(q)), 'fijado: bajar no trae de vuelta la cabecera');
    await arriba(q);
    ok(await fijado(q) === 'si' && !(await cabVisible(q)) && await vista(q) === 'si', 'fijado: subir hasta arriba del todo tampoco');
    await pestana(q, /^Reseñas/).click();
    ok(await espera(async () => (await pestana(q, /^Reseñas/).getAttribute('aria-selected')) === 'true'), 'se cambia a «Reseñas»');
    ok(await fijado(q) === 'si' && !(await cabVisible(q)), 'cambiar a otra pestaña lo mantiene fijado');
    await irA(q, 600); await arriba(q);
    ok(await fijado(q) === 'si' && !(await cabVisible(q)), 'fijado, también después de bajar y subir por Reseñas');
    await q.locator(SEL_FLECHA).click();
    ok(await espera(async () => await fijado(q) === 'no' && await cabVisible(q)), 'solo la flecha lo suelta: vuelve la cabecera (data-fijado="no")');
    ok(await pestana(q, /^Resumen/).getAttribute('aria-selected') === 'true' && (await q.evaluate(() => window.scrollY)) === 0, 'la flecha devuelve a Resumen, arriba del todo');
    ok(await espera(async () => await vista(q) === 'no' && await opaca(q) === '0'), 'soltado, arriba del todo el nombre pegado vuelve a no verse');

    // 8.3 · La tira de pestañas solo se desplaza de lado: un arrastre vertical no la mueve de arriba abajo; uno horizontal sí la desliza.
    await pestana(q, /^Men/).click(); await espera(async () => await fijado(q) === 'si');
    await bajar(q, 300);
    const ov = await q.locator(SEL_TIRA).evaluate((e) => { const s = getComputedStyle(e); return { y: s.overflowY, x: s.overflowX, o: s.overscrollBehaviorX }; });
    ok(ov.y === 'hidden' && ov.x === 'auto' && ov.o === 'contain', `la tira de pestañas: overflow-y ${ov.y}, overflow-x ${ov.x}, overscroll-behavior-x ${ov.o}`);
    const cdp8 = await c8.newCDPSession(q), tr = await rect(q, SEL_TIRA), ty = Math.round(tr.top + tr.height / 2);
    // Un arrastre táctil de verdad: el dedo baja, se mueve en 10 pasos de 16 ms (marcas de tiempo del propio evento, sin esperar) y se levanta.
    const arrastrar = async (de, a) => {
      let t = Date.now() / 1000;
      await cdp8.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: de[0], y: de[1] }], timestamp: t });
      for (let i = 1; i <= 10; i++) { t += 0.016; await cdp8.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(de[0] + (a[0] - de[0]) * i / 10), y: Math.round(de[1] + (a[1] - de[1]) * i / 10) }], timestamp: t }); }
      t += 0.016; await cdp8.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: t });
    };
    // Primero de lado (el navegador de pruebas no sigue un segundo dedo pegado a un arrastre vertical: se mide en este orden).
    const left = () => q.locator(SEL_TIRA).evaluate((e) => e.scrollLeft), top = () => q.locator(SEL_TIRA).evaluate((e) => e.scrollTop);
    const x0 = await left();
    await arrastrar([330, ty], [60, ty]);
    ok(await espera(async () => (await left()) > x0 + 20), `un arrastre horizontal sí desliza la tira de lado (de ${x0} a ${await left()} de ${await q.locator(SEL_TIRA).evaluate((e) => e.scrollWidth - e.clientWidth)})`);
    ok(await top() === 0, 'y la tira no se mueve de arriba abajo (scrollTop 0)');
    let ult = -1; await espera(async () => { const v = await left(), igual = v === ult; ult = v; return igual; }, 6000); // que la tira termine de deslizarse (inercia)
    const x1 = await left(), y1 = await q.evaluate(() => window.scrollY);
    await arrastrar([200, ty], [200, ty - 120]);
    ok(await espera(async () => (await q.evaluate(() => window.scrollY)) > y1 + 20), 'un arrastre vertical sobre la tira mueve la página, no la tira');
    await quieto(q);
    ok(await top() === 0 && await left() === x1, `la tira sigue donde estaba: scrollTop ${await top()} (0) y scrollLeft ${await left()} (${x1})`);

    // 8.4 · La barra de categorías del menú queda pegada justo DEBAJO de las pestañas (nunca detrás), a cualquier altura de la página.
    await arriba(q);
    ok(await q.locator('[data-mchips] [data-chip]').count() >= 5, 'el menú de la prueba tiene cinco categorías o más (Populares incluida)');
    for (const y of [700, 1500]) {
      await irA(q, y);
      const rp2 = await rect(q, SEL_PEST), rb = await rect(q, '[data-mchips]');
      ok(Math.abs(rb.top - rp2.bottom) <= 1, `Menú (a ${y}): la barra de categorías queda pegada justo bajo las pestañas (${rb.top.toFixed(1)} = ${rp2.bottom.toFixed(1)})`);
      ok(await sobre(q, '[data-mchips]') && await sobre(q, SEL_PEST) && await sobre(q, SEL_FILA), `Menú (a ${y}): ni la barra, ni las pestañas, ni el nombre quedan tapados`);
    }
    await q.screenshot({ path: OUT + 'cab9-390-menu-pegado.png' });

    // 8.5 · La categoría activa sigue al desplazamiento y queda centrada en su tira.
    const activa = (p) => p.evaluate(() => [...document.querySelectorAll('[data-mchips] [data-chip] [aria-pressed="true"]')].map((e) => e.parentElement.dataset.chip).join(','));
    const descentrada = (p, k) => p.evaluate((k) => { const c = document.querySelector(`[data-mchips] [data-chip="${k}"]`), t = c.parentElement.getBoundingClientRect(), r = c.getBoundingClientRect(); return (r.left + r.width / 2) - (t.left + t.width / 2); }, k);
    const bajoLaBarra = (p, k) => p.evaluate((k) => { const s = document.querySelector(`[data-msec="m-${k}"]`), b = document.querySelector('[data-mchips]').getBoundingClientRect(); return s.getBoundingClientRect().top - b.bottom; }, k);
    // Desplaza (suave) hasta que la sección k cruza la línea de debajo de la barra, y espera por condición a que se encienda sola.
    const llegar = async (k) => { await q.evaluate((k) => { const s = document.querySelector(`[data-msec="m-${k}"]`), b = document.querySelector('[data-mchips]').getBoundingClientRect(); window.scrollTo({ top: window.scrollY + s.getBoundingClientRect().top - b.bottom - 4, behavior: 'smooth' }); }, k); };
    const claves = await q.evaluate(() => [...document.querySelectorAll('[data-msec^="m-"]')].map((e) => e.dataset.msec.slice(2)));
    const medio = claves[Math.floor(claves.length / 2)];
    await llegar(claves[1]);
    ok(await espera(async () => await activa(q) === claves[1], 10000), `al llegar a su sección la categoría «${claves[1]}» se enciende sola (activa: ${await activa(q)})`);
    await llegar(medio);
    ok(await espera(async () => await activa(q) === medio, 10000), `al desplazar el menú la activa cambia sola a «${medio}» (activa: ${await activa(q)})`);
    ok(await espera(async () => Math.abs(await descentrada(q, medio)) <= 12, 8000), `la categoría activa queda centrada en la tira (a ${Math.round(await descentrada(q, medio))} px del centro)`);
    await llegar(claves[claves.length - 1]);
    ok(await espera(async () => await activa(q) === claves[claves.length - 1], 10000), `y al llegar a la última («${claves[claves.length - 1]}») se enciende ella (activa: ${await activa(q)})`);
    await llegar(claves[0]);
    ok(await espera(async () => await activa(q) === claves[0], 10000), `subiendo, vuelve a encenderse «${claves[0]}» (activa: ${await activa(q)})`);
    // Tocar una categoría: la sección queda justo bajo la barra, no detrás, y esa categoría queda activa.
    await q.locator(`[data-mchips] [data-chip="${claves[2]}"] [role=button]`).click();
    ok(await espera(async () => { const d = await bajoLaBarra(q, claves[2]); return d >= -1 && d <= 14 && await activa(q) === claves[2]; }, 10000), `tocar la categoría «${claves[2]}»: su sección queda bajo la barra de categorías y ella queda activa (${Math.round(await bajoLaBarra(q, claves[2]))} px bajo la barra)`);
    ok(await q.evaluate(() => document.documentElement.scrollWidth) <= 390, 'el menú fijado no ensancha la página: no se mueve de lado (scrollWidth ≤ 390)');

    // 8.6 · Un nombre larguísimo: la franja lo corta con puntos suspensivos y el sello se ve entero dentro de la pantalla.
    cambiar(MENU, `name = ${lit(LARGO)}`);
    await abrirTel(q, MENU); await pestana(q, /^Men/).click(); await espera(async () => await fijado(q) === 'si');
    const larga = await q.locator(SEL_NOMBRE).evaluate((e) => ({ puntos: getComputedStyle(e).textOverflow === 'ellipsis', corta: e.scrollWidth > e.clientWidth, w: Number(getComputedStyle(e).fontWeight) }));
    ok(larga.puntos && larga.corta && larga.w >= 700, 'nombre largo: en negrita y cortado con puntos suspensivos (text-overflow: ellipsis, no cabe entero)');
    const rs = await rect(q, `${SEL_FILA} [role="img"]`), rfl2 = await rect(q, SEL_FILA), rn2 = await rect(q, SEL_NOMBRE);
    ok(rs.left >= 0 && rs.right <= 390 && rs.right <= rfl2.right + 1, `nombre largo: el sello se ve entero dentro de la pantalla (${Math.round(rs.left)}–${Math.round(rs.right)} de 390)`);
    ok(rn2.right <= rs.left + 1 && rn2.left >= 0, 'nombre largo: el nombre no se monta con el sello ni se sale por la izquierda');
    ok(await q.evaluate(() => document.documentElement.scrollWidth) <= 390, 'nombre largo: la página no se mueve de lado (scrollWidth ≤ 390)');
    await q.screenshot({ path: OUT + 'cab9-390-nombre-pegado-largo.png' });
    cambiar(MENU, `name = ${lit(orig[MENU].nombre)}`);

    // 8.7 · La banda del carrito cabe en la pantalla, a 390, a 320 y con el negocio cerrado (su texto más largo).
    await abrirTel(q, MENU); await pestana(q, /^Men/).click(); await espera(async () => await fijado(q) === 'si');
    let con = false;
    for (let i = 0; i < 10 && !con; i++) {
      const bs = q.locator('[data-screen-label="Ficha · menú"]').getByRole('button', { name: 'Agregar' });
      if (i >= await bs.count()) break;
      await bs.nth(i).scrollIntoViewIfNeeded(); await bs.nth(i).click();
      con = await espera(async () => await q.locator(SEL_BANDA).isVisible(), 1500);
      if (!con && await q.locator('[data-screen-label="Menú · plato y opciones"]').count()) { await q.keyboard.press('Escape'); await q.locator('[data-screen-label="Menú · plato y opciones"]').waitFor({ state: 'detached' }).catch(() => {}); }
    }
    ok(con, 'se agregó un plato sin opciones y sale la banda del carrito');
    const cabe = async (p, ancho) => { const r = await rect(p, SEL_BANDA); return { r, dentro: r.left >= 0 && r.right <= ancho, sinLado: (await p.evaluate(() => document.documentElement.scrollWidth)) <= ancho }; };
    let bd = await cabe(q, 390);
    ok(bd.dentro && bd.sinLado, `390: la banda del carrito cabe (${Math.round(bd.r.left)}–${Math.round(bd.r.right)} de 390) y la página no se mueve de lado`);
    await q.screenshot({ path: OUT + 'cab9-390-carrito.png' });
    await q.setViewportSize({ width: 320, height: 640 });
    ok(await espera(async () => (await q.evaluate(() => window.innerWidth)) === 320), 'la ventana pasa a 320');
    bd = await cabe(q, 320);
    ok(bd.dentro && bd.sinLado, `320: la banda del carrito cabe (${Math.round(bd.r.left)}–${Math.round(bd.r.right)} de 320) y la página no se mueve de lado`);
    cerrado(MENU); await q.reload(); await hidratado(q.getByRole('tab').first());
    ok(await espera(async () => await q.locator(SEL_BANDA).isVisible(), 8000), 'con el negocio cerrado la banda del carrito sigue ahí');
    bd = await cabe(q, 320);
    ok(bd.dentro && bd.sinLado, `320, cerrado: la banda del carrito cabe (${Math.round(bd.r.left)}–${Math.round(bd.r.right)} de 320) y la página no se mueve de lado`);
    await q.screenshot({ path: OUT + 'cab9-320-carrito-cerrado.png' });
    abierto(MENU);

    console.log('9 · prueba en escritorio (decisión pendiente): la franja del nombre pegado a 1280');
    // PRUEBA DEL FUNDADOR («verlo y probarlo antes de decidir», 23 nov): si decide quitar la franja del escritorio (nombre-pegado-desk), se borra
    // solo este bloque (y su mención en el guardián fichaFijaSinTapar).
    const cd9 = await b.newContext({ viewport: { width: 1280, height: 800 } }); abiertas.push(cd9); const z = await cd9.newPage(); mirar(z); await entrarComo(z, tel);
    const SEL_DESK = '[data-pieza="nombre-pegado-desk"]', SEL_DFILA = `${SEL_DESK} > div`, SEL_DFLECHA = `${SEL_DESK} [data-pieza="volver-arriba"]`;
    await abrirFicha(z, MENU); await hidratado(z.locator('[data-pieza="pestanas-ficha"] button').first());
    ok(await z.locator(SEL_DESK).getAttribute('data-visible') === 'no', 'escritorio: arriba del todo el nombre pegado no se ve');
    await irA(z, 1000);
    ok(await espera(async () => await z.locator(SEL_DESK).getAttribute('data-visible') === 'si'), 'escritorio: al pegarse las pestañas aparece la barra con el nombre (nombre-pegado-desk)');
    ok((await z.locator(`${SEL_DFILA} span.truncate`).innerText()).replace(/\s+/g, ' ').trim() === nombre, `escritorio: la barra dice el nombre del negocio («${nombre}»)`);
    const dc = await rect(z, SEL_DFILA), df = await rect(z, SEL_DFLECHA);
    ok(df.left >= dc.left - 0.5 && df.right <= dc.right + 0.5 && df.top >= dc.top - 0.5 && df.bottom <= dc.bottom + 0.5, `escritorio: la flecha queda dentro de su caja (${Math.round(df.left)}–${Math.round(df.right)} dentro de ${Math.round(dc.left)}–${Math.round(dc.right)})`);
    // 24 nov · El estado Abierto/Cerrado vive en la barra del nombre, a su derecha y dentro de su caja (la tira ya no lo lleva).
    const es9 = await rect(z, `${SEL_DESK} [data-pieza="estado-pegado"]`);
    ok(/^(Abierto|Cerrado)/.test((await z.locator(`${SEL_DESK} [data-pieza="estado-pegado"]`).innerText()).trim()) && es9.right <= dc.right + 0.5 && es9.left >= dc.left, 'escritorio: el estado (Abierto/Cerrado) está en la barra del nombre, dentro de su caja');
    ok(await z.locator('[data-pieza="pestanas-ficha"] [data-pieza="estado-pegado"]').count() === 0, 'escritorio: la tira de pestañas ya no lleva el estado');
    // Las flechas de la tira: invisibles sin cursor encima; visibles con el cursor sobre la tira cuando las pestañas no caben. El desborde se fuerza con
    // una hoja de estilo (no con style en línea: React lo pisa) y un evento resize.
    const hoja9 = await z.evaluateHandle(() => { const st = document.createElement('style'); st.textContent = '[data-pestana]{margin-right:120px!important}'; document.head.appendChild(st); window.dispatchEvent(new Event('resize')); return st; });
    const flecha9 = z.locator('[data-pieza="flecha-pestanas"]'), opac9 = () => flecha9.first().evaluate((e) => getComputedStyle(e).opacity);
    ok(await espera(async () => (await flecha9.count()) >= 1), 'escritorio: con las pestañas desbordadas aparece la flecha de la tira (flecha-pestanas)');
    await z.mouse.move(640, 700);
    ok(await espera(async () => (await opac9()) === '0'), 'escritorio: sin el cursor encima, la flecha de la tira es invisible (opacidad 0)');
    await z.locator('[data-pieza="pestanas-ficha"]').hover();
    ok(await espera(async () => (await opac9()) === '1'), 'escritorio: con el cursor sobre la tira, la flecha se ve (opacidad 1)');
    const fr9 = await rect(z, '[data-pieza="flecha-pestanas"] > span'), tr9 = await rect(z, '[data-pieza="pestanas-ficha"]');
    ok(fr9.right <= tr9.right + 0.5 && fr9.left >= tr9.left - 0.5, 'escritorio: la flecha derecha queda dentro de la tira (pegada a su borde derecho)');
    await z.mouse.move(640, 700);
    ok(await espera(async () => (await opac9()) === '0'), 'escritorio: al sacar el cursor, la flecha vuelve a ocultarse');
    await hoja9.evaluate((e) => { e.remove(); window.dispatchEvent(new Event('resize')); }); await hoja9.dispose();
    await z.screenshot({ path: OUT + 'cab9-1280-nombre-pegado.png' });
    await z.locator(SEL_DFLECHA).click();
    ok(await espera(async () => (await z.evaluate(() => window.scrollY)) === 0 && await z.locator(SEL_DESK).getAttribute('data-visible') === 'no'), 'escritorio: la flecha sube hasta arriba y la barra deja de verse');

    console.log('10 · Ventana estrecha con ratón (640): las flechas de la tira salen con el cursor cuando las pestañas no caben; con el dedo, nunca');
    // 24 nov (fundador, en una ventana estrecha de su computadora): la versión de teléfono no tenía cómo mover la tira sin dedo.
    const ce = await b.newContext({ viewport: { width: 640, height: 800 } }); abiertas.push(ce); const e10 = await ce.newPage(); mirar(e10);
    await abrirFicha(e10, TODO);
    const tira10 = e10.locator('[data-pieza="pestanas-ficha"]:visible'); await tira10.scrollIntoViewIfNeeded();
    const med10 = () => e10.evaluate(() => { const t = [...document.querySelectorAll('[data-pieza="pestanas-ficha"]')].find((x) => x.offsetParent); const x = t.querySelector('[role=tablist]'); return { fl: [...t.querySelectorAll('[data-pieza="flecha-pestanas-movil"]')].map((f) => f.dataset.lado).join(','), sl: Math.round(x.scrollLeft), cabe: x.scrollWidth <= x.clientWidth + 4, pag: document.documentElement.scrollWidth }; });
    const m10 = await med10();
    ok(!m10.cabe && m10.fl === '', `640 sin cursor: las pestañas no caben y no hay flechas a la vista («${m10.fl}»)`);
    const bx10 = await tira10.boundingBox(); await e10.mouse.move(bx10.x + 200, bx10.y + 25);
    ok(await espera(async () => (await med10()).fl === 'r'), 'con el cursor sobre la tira sale la flecha de la derecha (a la izquierda no hay nada que ver todavía)');
    await e10.locator('[data-pieza="flecha-pestanas-movil"][data-lado="r"] button').click();
    ok(await espera(async () => { const x = await med10(); return x.sl > 0 && x.fl.includes('l'); }), 'la flecha derecha mueve la tira y entonces sale la de la izquierda');
    ok((await med10()).pag <= 640, 'las flechas no ensanchan la página');
    await e10.mouse.move(10, 700);
    ok(await espera(async () => (await med10()).fl === ''), 'al sacar el cursor, las flechas se van');
    const ct = await ctx(390, 800); const t10 = await ct.newPage(); mirar(t10); await abrirFicha(t10, TODO);
    const tt = t10.locator('[data-pieza="pestanas-ficha"]:visible'); await tt.scrollIntoViewIfNeeded(); const bt10 = await tt.boundingBox();
    await t10.touchscreen.tap(bt10.x + 300, bt10.y + 25);
    ok(await espera(async () => await t10.locator('[data-pieza="pestanas-ficha"]:visible [data-pestana][aria-selected="true"]').count() === 1) && await t10.locator('[data-pieza="flecha-pestanas-movil"]').count() === 0, 'teléfono (dedo): tocar la tira no saca flechas');

    ok(err.length === 0, `sin errores en la página${err.length ? ': ' + err.join(' | ') : ''}`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close().catch(() => {});
    restaurar();
  }
  console.log(`\nfic9cab: ${n} comprobaciones`);
})().catch((e) => { console.error('FALLÓ:', e.message); process.exit(1); });
