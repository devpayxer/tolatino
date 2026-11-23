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
// Precondición propia: lo que se cambia en la base (teléfono, dirección, nombre, cierre de hoy, horario de hoy) vuelve como estaba al terminar.
const ENT = require('../lib/entorno.cjs');
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
const LARGO = 'Barbería y Estética El Primo de la Calle Principal con Servicio a Domicilio'; // 80 letras o menos: el tope de la base (businesses_name_check)
const CALLE_LARGA = '1234 Avenida Doctor Martín Luther King Junior Boulevard Norte, Edificio Comercial Plaza Hazleton Suite 4500, Hazleton, PA';
const ESTADO_LARGO = "Cerrado · abre el lunes a las 11 AM";

(async () => {
  const ids = [TODO, DOS];
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
  const cerrado = (id) => { sql(`delete from special_hours where business_id = '${id}' and label->>'es' = 'fic9cab'`); cambiar(id, `closed_on = '${hoyLocal()}'`); };
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
    const aside = pestD.locator('span').filter({ hasText: /^(Abierto|Cerrado)/ });
    ok(await espera(async () => (await aside.count()) === 1), `tira pegada arriba: el estado a la derecha («${(await aside.first().innerText().catch(() => '')).trim()}»)`);
    const pb = await pestD.boundingBox(); ok(pb.y >= 0 && pb.y < 200, 'la tira queda pegada arriba al bajar');
    await d.screenshot({ path: OUT + 'cab9-1360-pegada.png' });
    await d.setViewportSize({ width: 1360, height: 900 });
    const act = await pestD.locator('[data-pestana]').nth(1).click().then(() => true).catch(() => false);
    ok(act, 'escritorio: tocar otra pestaña');
    await d.screenshot({ path: OUT + 'cab9-1360-otra-pestana.png' });
    ok(err.length === 0, `sin errores en la página${err.length ? ': ' + err.join(' | ') : ''}`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close().catch(() => {});
    restaurar();
  }
  console.log(`\nfic9cab: ${n} comprobaciones`);
})().catch((e) => { console.error('FALLÓ:', e.message); process.exit(1); });
