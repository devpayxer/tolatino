// AK · La tarjeta de negocio «Vitrina» (decisión AK, 22 nov; docs/diseno/entrega/tarjeta-vitrina/README.md) contra el servidor real.
// Datos propios (prefijo «akv<k>» distinto en cada corrida; nada se borra: al final los negocios quedan «hidden»): negocios Pro con 5, 3, 2, 1 y 0 fotos
// públicas (más una quitada, una privada y una purgada que NO cuentan), uno cerrado, uno con nombre larguísimo, uno con video aprobado, uno con algo
// publicado en las últimas 24 h y uno Free; todos salen juntos en /buscar?q=akv<k>&tab=biz.
// Comprueba, medido en el navegador: la galería (187 px; celdas 2fr/1fr; dos columnas; una; el rayado), «+N FOTOS» solo con más de 3 (y cuenta solo las
// públicas), la pastilla abierta/cerrada con sus colores, guardar (con sesión: cambia y persiste al recargar; sin sesión: lleva a entrar), llamar (la
// base cuenta el toque), el botón principal, la caja HOY (abre «Hoy en el barrio» y ya no hay anillo), el video solo en la celda grande, la fila Free
// (foto de 96, «Llamar»), nombre largo con elipsis, el horario libre (uno a la vez, conserva su forma; en /sistema, que trae datos de muestra), cada
// control con su nombre y su caja de 44, Pro antes que Free, y que la página no se ensancha a 320, 390 y 1440. Capturas en ak-*.png.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright');
const { entrarComo, medios, sql, telLibre } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 250)); } return false; };
const uuid = () => require('crypto').randomUUID();
const cerca = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;

(async () => {
  const k = String(Date.now() % 100000).padStart(5, '0'), T = `akv${k}`;
  const DUENO = sql(`select id from users where phone = '+15705550133'`);
  const BASE = 'sabor-dominicano';
  const NEG = {}; // tag → id
  /* Un negocio de Hazleton copiado de Sabor Dominicano (misma ciudad, categoría y punto), con lo que esta prueba necesita. */
  const PEX = sql("select url from media where url like 'https://images.pexels.com/%' and status = 'visible' group by url order by url limit 8").split('\n').filter(Boolean); // fotos de verdad (las de la semilla) para las capturas
  const crear = (tag, nombre, { plan = 'pro', fotos = 0, abierto = true, attrs = {}, verificado = false, resenas = 20, ext = false } = {}) => {
    const id = `${T}-${tag}`; NEG[tag] = id;
    const tel = '+1570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    sql(`insert into businesses (id, city_id, category_id, subcategory_ids, name, status, origin, address, geo, about, filter_values, category_attrs, is_demo, phone, modules_on)
         select '${id}', city_id, category_id, subcategory_ids, '${nombre}', 'active', 'self', address, geo, about, filter_values, '${JSON.stringify(attrs)}'::jsonb, false, '${tel}', modules_on from businesses where id = '${BASE}'`);
    sql(`insert into business_stats_cache (business_id, plan, verified, rating_avg, review_count) values ('${id}', '${plan}', ${verificado}, 4.6, ${resenas}) on conflict (business_id) do update set plan = excluded.plan, verified = excluded.verified, rating_avg = 4.6, review_count = ${resenas}`);
    if (abierto) for (let d = 0; d < 7; d++) sql(`insert into business_hours (business_id, module, weekday, open, ranges) values ('${id}', '', ${d}, true, '[[\"00:00\", \"00:00\"]]'::jsonb)`);
    for (let i = 0; i < fotos; i++) sql(`insert into media (owner_kind, owner_id, url, status, sort) values ('business', '${id}', '${ext && PEX[i] ? PEX[i] : `/medios/n/${uuid()}.jpg`}', 'visible', ${i})`);
    return id;
  };
  const oferta = { tarjeta: { eta: { es: 'Pickup 25 min', en: 'Pickup 25 min' }, fee: { es: 'Delivery $3', en: 'Delivery $3' }, offer: { es: 'Mofongo de chicharrón $12, hasta agotar', en: 'Mofongo for $12 while it lasts' } } };
  const sinOferta = { tarjeta: { eta: { es: 'Pickup 20 min', en: 'Pickup 20 min' } } };
  const POST = [];
  const b = await chromium.launch(); const abiertas = []; const err = [];
  const ctxDe = async (w, h, movil) => { const c = await b.newContext(movil ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h } }); abiertas.push(c); await medios(c); return c; };
  const pagina = async (c) => { const p = await c.newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); return p; };
  try {
    // ── Los datos ──
    crear('cinco', `${T} Cinco`, { fotos: 5, attrs: oferta, verificado: true, ext: true });
    // Fotos que NO cuentan: quitada, en revisión, privada y purgada.
    sql(`insert into media (owner_kind, owner_id, url, status, sort) values ('business', '${NEG.cinco}', '/medios/n/${uuid()}.jpg', 'removed', 9), ('business', '${NEG.cinco}', '/medios/n/${uuid()}.jpg', 'review', 10)`);
    sql(`insert into media (owner_kind, owner_id, url, status, sort, private) values ('business', '${NEG.cinco}', 'privado/rev/${uuid()}.jpg', 'visible', 11, true)`);
    sql(`insert into media (owner_kind, owner_id, url, status, sort, purged_at) values ('business', '${NEG.cinco}', '/medios/n/${uuid()}.jpg', 'visible', 12, now())`);
    crear('tres', `${T} Tres`, { fotos: 3, attrs: sinOferta });
    crear('dos', `${T} Dos`, { fotos: 2, attrs: sinOferta });
    crear('uno', `${T} Uno`, { fotos: 1, attrs: sinOferta, resenas: 2 });
    crear('cero', `${T} Cero`, { fotos: 0, attrs: sinOferta });
    crear('cerrado', `${T} Cerrado`, { fotos: 3, abierto: false, attrs: sinOferta });
    const LARGO = `${T} Taquería y Pupusería Doña Rosario de los Hermanos Hernández`;
    crear('largo', LARGO, { fotos: 3, attrs: sinOferta });
    crear('video', `${T} Video`, { fotos: 3, attrs: sinOferta });
    const V = uuid();
    sql(`insert into business_videos (business_id, city_id, url, poster_url, seconds, status, uploaded_by, reviewed_at) values ('${NEG.video}', 'hzl', '/medios/v/${V}.mp4', '/medios/v/${V}.jpg', 12, 'aprobado', '${DUENO}', now())`);
    crear('hoy', `${T} Hoy`, { fotos: 3, attrs: sinOferta });
    POST.push(sql(`insert into business_posts (business_id, city_id, kind, title, body, ends_at, created_by)
      select '${NEG.hoy}', 'hzl', 'novedad', 'Hoy hay sancocho ${k}', 'Desde las 11.', now() + interval '1 day', '${DUENO}' returning id`).split('\n')[0]);
    crear('free', `${T} Fritura Doña Carmen`, { plan: 'free', fotos: 1, attrs: {}, resenas: 18, ext: true });
    const lista = `/buscar?q=${T}&tab=biz`;
    const NOMBRES = { cinco: `${T} Cinco`, tres: `${T} Tres`, dos: `${T} Dos`, uno: `${T} Uno`, cero: `${T} Cero`, cerrado: `${T} Cerrado`, largo: LARGO, video: `${T} Video`, hoy: `${T} Hoy`, free: `${T} Fritura Doña Carmen` };
    const alasTarjetas = (p) => p.locator('article[data-vitrina]').first().evaluate((e) => { window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 150); }).then(() => p.waitForTimeout(400));
    const card = (p, tag) => p.locator('article[data-vitrina]').filter({ has: p.locator('button[data-toque="nombre"]', { hasText: NOMBRES[tag] }) });
    const abrir = async (p, ruta = lista) => { await p.goto(B + ruta); await p.waitForLoadState('networkidle').catch(() => {}); return espera(async () => (await p.locator('article[data-vitrina]').count()) >= 10); };

    console.log('1 · Teléfono 390: la galería y lo que va encima');
    const cv = await ctxDe(390, 844, true), pv = await pagina(cv);
    const tel = telLibre(); await entrarComo(pv, tel, { nombre: 'Vecina', apellido: 'Akv' });
    ok(await abrir(pv), `las 10 tarjetas de la prueba salen en /buscar?q=${T} (hay ${await pv.locator('article[data-vitrina]').count()})`);
    const caja = async (c) => (await c.locator('.tl-vit-gal').boundingBox());
    const celdas = async (c) => { const L = c.locator('.tl-vit-celda'); const r = []; for (let i = 0; i < await L.count(); i++) r.push(await L.nth(i).boundingBox()); return r; };
    {
      const c = card(pv, 'tres'), g = await caja(c), ce = await celdas(c);
      ok(cerca(g.height, 187, 1), `3 fotos: la galería mide ${g.height} px de alto (187)`);
      ok(ce.length === 3 && cerca(ce[0].width / ce[1].width, 2, 0.06) && cerca(ce[0].height, 187, 1) && cerca(ce[1].height, 92, 1) && cerca(ce[2].height, 92, 1), `3 fotos: la grande ocupa las dos filas y es el doble de ancha (${ce.map((x) => Math.round(x.width) + '×' + Math.round(x.height)).join(' · ')})`);
      ok(cerca(ce[1].y + ce[1].height + 3, ce[2].y, 1) && cerca(ce[0].x + ce[0].width + 3, ce[1].x, 1), 'con 3 px de separación');
      ok(await c.locator('.tl-vit-celda > img').count() === 3 && await c.locator('[data-mas-fotos]').count() === 0, '3 fotos: tres <img> (pieza Foto) y NO hay «+N FOTOS»');
      const im = c.locator('.tl-vit-celda > img').first();
      ok((await im.getAttribute('sizes')).includes('66vw') && (await im.getAttribute('srcset')).split(',').length === 4 && await im.getAttribute('loading') === 'lazy', 'la foto grande pide su variante a la medida (sizes y srcset de la pieza Foto)');
      ok(await c.locator('[style*="background-image"]').count() === 0, 'sin background-image suelto en la tarjeta');
    }
    {
      const c = card(pv, 'dos'), ce = await celdas(c);
      ok(ce.length === 2 && cerca(ce[0].width, ce[1].width, 2) && cerca(ce[0].height, 187, 1), `2 fotos: dos columnas iguales de 187 (${ce.map((x) => Math.round(x.width) + '×' + Math.round(x.height)).join(' · ')})`);
      ok(await c.locator('[data-mas-fotos]').count() === 0, '2 fotos: sin «+N FOTOS»');
    }
    {
      const c = card(pv, 'uno'), ce = await celdas(c), cb = await c.boundingBox();
      ok(ce.length === 1 && cerca(ce[0].height, 187, 1) && ce[0].width > cb.width - 4, `1 foto: una sola a todo el ancho y 187 de alto (${Math.round(ce[0].width)}×${Math.round(ce[0].height)})`);
      ok((await c.locator('.tl-vit-meta').innerText()).includes('2 reseñas') && !(await c.locator('.tl-vit-meta').innerText()).includes('★'), '2 reseñas: sin estrellas, «2 reseñas» (la regla de menos de 5)');
    }
    {
      const c = card(pv, 'cero'), ce = await celdas(c);
      ok(ce.length === 1 && cerca(ce[0].height, 187, 1) && await c.locator('img').count() === 0 && await c.locator('.tl-vit-rayado').count() === 1, '0 fotos: el rayado del sistema a 187 de alto, sin <img>');
      const fondo = await c.locator('.tl-vit-rayado').evaluate((e) => getComputedStyle(e).backgroundImage);
      ok(/repeating-linear-gradient\(135deg/.test(fondo), 'y es el rayado a 135° (repeating-linear-gradient)');
    }
    {
      const c = card(pv, 'cinco'), mas = c.locator('[data-mas-fotos]');
      ok(await mas.count() === 1 && (await mas.innerText()).trim() === '+2 FOTOS', `5 fotos públicas (y 4 que no cuentan: quitada, en revisión, privada, purgada): «${(await mas.innerText()).trim()}»`);
      ok(/Ver las fotos de/.test(await mas.getAttribute('aria-label')), 'el botón tiene su nombre accesible');
      const bx = await mas.boundingBox(), cb = await c.boundingBox(), g = await caja(c);
      ok(bx.width >= 44 && bx.height >= 44 && cerca(bx.x + bx.width, cb.x + cb.width - 1, 2) && cerca(bx.y + bx.height, g.y + g.height, 1), `la caja de «+2 FOTOS» mide ${Math.round(bx.width)}×${Math.round(bx.height)} (≥ 44) y está abajo a la derecha de la galería`);
      const pil = await mas.locator('span').boundingBox();
      ok(cerca(pil.x + pil.width, g.x + g.width - 10, 1.5) && cerca(pil.y + pil.height, g.y + g.height - 10, 1.5), 'la pastilla se ve a 10 px del borde (derecha y abajo)');
      const col = await mas.locator('span').evaluate((e) => getComputedStyle(e).backgroundColor);
      ok(col === 'rgba(11, 14, 18, 0.72)', `con fondo ${col}`);
      await mas.click();
      ok(await espera(async () => new URL(pv.url()).pathname === `/n/${NEG.cinco}/fotos`), '«+2 FOTOS» abre la galería de la ficha (/n/…/fotos)');
      await abrir(pv);
    }

    console.log('2 · La pastilla de estado');
    {
      const a = card(pv, 'tres').locator('.tl-vit-estado'), c = card(pv, 'cerrado').locator('.tl-vit-estado');
      const col = (l) => l.evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e.querySelector('i')).backgroundColor, getComputedStyle(e).backgroundColor, getComputedStyle(e).borderRadius]);
      const A = await col(a), C = await col(c);
      ok(A[0] === 'rgb(0, 105, 91)' && A[1] === 'rgb(0, 168, 143)' && A[2] === 'rgba(255, 255, 255, 0.96)', `abierto: texto ${A[0]}, punto ${A[1]}, fondo ${A[2]}`);
      ok(C[0] === 'rgb(192, 57, 43)' && C[1] === 'rgb(192, 57, 43)', `cerrado: texto y punto ${C[0]}`);
      const pb = await a.boundingBox(), g = await caja(card(pv, 'tres'));
      ok(cerca(pb.x - g.x, 12, 1.5) && cerca(pb.y - g.y, 12, 1.5), `la pastilla está a 12/12 de la esquina (${Math.round(pb.x - g.x)}/${Math.round(pb.y - g.y)})`);
      ok(/Abierto/.test(await a.innerText()) && /Cerrado/.test(await c.innerText()), `con las palabras de la app: «${(await a.innerText()).trim()}» y «${(await c.innerText()).trim()}»`);
      ok((await a.evaluate((e) => getComputedStyle(e).transitionDuration)).includes('0.2s'), 'el cambio de color se funde en .2 s');
    }

    console.log('3 · Guardar (con sesión y sin sesión)');
    {
      const c = card(pv, 'tres'), g = c.locator('[data-guardar]');
      ok(await g.getAttribute('aria-pressed') === 'false' && /Guardar/.test(await g.getAttribute('aria-label')), `sin guardar: «${await g.getAttribute('aria-label')}»`);
      const bx = await g.boundingBox(), cir = await g.locator('span').boundingBox(), gb = await caja(c);
      ok(bx.width >= 44 && bx.height >= 44 && cerca(cir.width, 34, 0.5) && cerca(cir.height, 34, 0.5), `el círculo se ve de ${cir.width}×${cir.height} (34) y su caja de toque mide ${bx.width}×${bx.height} (≥ 44)`);
      ok(cerca(gb.x + gb.width - (cir.x + cir.width), 10, 1.5) && cerca(cir.y - gb.y, 10, 1.5), 'el círculo está a 10 px del borde (arriba y a la derecha)');
      await g.click();
      ok(await espera(async () => await g.getAttribute('aria-pressed') === 'true' && /Quitar de guardados/.test(await g.getAttribute('aria-label'))), 'guardado: se pinta lleno y el nombre cambia a «Quitar de guardados»');
      ok(await espera(() => sql(`select count(*) from favorites where kind = 'business' and target_id = '${NEG.tres}'`) === '1'), 'y queda en la base (favorites)');
      ok(new URL(pv.url()).pathname === '/buscar', 'guardar NO abre la ficha (el clic no sube a la tarjeta)');
      await abrir(pv);
      ok(await card(pv, 'tres').locator('[data-guardar]').getAttribute('aria-pressed') === 'true', 'al recargar sigue guardado');
      await card(pv, 'tres').locator('[data-guardar]').click();
      ok(await espera(() => sql(`select count(*) from favorites where kind = 'business' and target_id = '${NEG.tres}'`) === '0'), 'tocar otra vez lo quita (la base)');
      const ca = await ctxDe(390, 844, true), pa = await pagina(ca);
      await abrir(pa);
      await card(pa, 'tres').locator('[data-guardar]').click();
      ok(await espera(async () => new URL(pa.url()).pathname === '/entrar' && /volver=/.test(pa.url())), 'sin sesión: guardar lleva a «entrar» y vuelve (el camino de siempre)');
      await ca.close();
    }

    console.log('4 · Cuerpo: nombre, calificación, chips, oferta y botones');
    {
      const c = card(pv, 'cinco');
      ok(await c.locator('.tl-vit-verificado[role="img"]').count() === 1 && await card(pv, 'tres').locator('.tl-vit-verificado').count() === 0, 'el sello de verificado solo en el verificado, con nombre accesible');
      const nm = await c.locator('.tl-vit-nombre').evaluate((e) => { const s = getComputedStyle(e); return [s.fontFamily, s.fontWeight, s.fontSize]; });
      ok(/Sora/.test(nm[0]) && nm[1] === '800' && nm[2] === '18px', `nombre en ${nm.join(' ')}`);
      const ve = await c.locator('.tl-vit-verificado').boundingBox();
      ok(cerca(ve.width, 17, 0.5) && cerca(ve.height, 17, 0.5), 'el sello mide 17×17');
      const cal = await c.locator('.tl-vit-cal').innerText();
      ok(/★\s*4\.6\s*\(20\)/.test(cal), `calificación «${cal.trim()}»`);
      const meta = await c.locator('.tl-vit-meta').evaluate((e) => [getComputedStyle(e).whiteSpace, e.scrollWidth <= e.clientWidth + 1]);
      ok(meta[0] === 'nowrap' && meta[1], 'calificación y dato en una línea, sin desbordar');
      const car = await c.locator('.tl-vit-car').allInnerTexts();
      ok(car.length === 2 && car[0] === 'Pickup 25 min' && car[1] === 'Delivery $3', `características: ${car.join(' · ')} (grises, no horarios)`);
      ok(await c.locator('.tl-vit-hora').count() === 0, 'ningún chip se pinta como horario libre (el Pickup es una característica)');
      const cs = await c.locator('.tl-vit-car').first().evaluate((e) => { const s = getComputedStyle(e); return [s.backgroundColor, s.borderRadius, s.paddingTop, s.paddingLeft]; });
      ok(cs[0] === 'rgba(11, 14, 18, 0.05)' && cs[1] === '8px' && cs[2] === '6px' && cs[3] === '11px', `chip: ${cs.join(' ')}`);
      const of = c.locator('[data-oferta]');
      ok(await of.count() === 1 && (await of.evaluate((e) => e.tagName)) === 'DIV' && /Mofongo de chicharrón/.test(await of.innerText()) && /HOY/.test(await of.innerText()), 'la oferta de HOY (sin algo publicado hoy: una caja, no un botón)');
      const ob = await of.evaluate((e) => { const s = getComputedStyle(e); return [s.backgroundColor, s.borderRadius, s.paddingTop, s.paddingLeft]; });
      ok(ob[0] === 'rgba(75, 55, 245, 0.06)' && ob[1] === '13px' && ob[2] === '10px' && ob[3] === '12px', `caja de la oferta: ${ob.join(' ')}`);
      const cta = c.locator('[data-cta]'), ll = c.locator('[data-llamar]');
      const cb = await cta.boundingBox(), lb = await ll.boundingBox();
      ok(cb.height >= 44 && lb.width >= 44 && lb.height >= 44, `botón principal ${Math.round(cb.width)}×${Math.round(cb.height)} y llamar ${lb.width}×${lb.height}: cajas de 44`);
      const vis = await cta.locator('> span').boundingBox(), vl = await ll.locator('> span').boundingBox();
      ok(cerca(vis.height, 40, 0.5) && cerca(vl.height, 40, 0.5) && cerca(vl.width, 40, 0.5), `y se ven de ${vis.height} y ${vl.width}×${vl.height} (40, como el diseño)`);
      ok(/Llamar a/.test(await ll.getAttribute('aria-label')) && /Ordenar/.test(await cta.innerText()), `con su nombre: «${await ll.getAttribute('aria-label')}» · «${(await cta.innerText()).trim()}»`);
      await ll.click();
      ok(await espera(() => sql(`select count(*) from contact_taps where business_id = '${NEG.cinco}' and kind = 'call' and source = 'buscar'`) === '1'), 'llamar: la base cuenta el toque (source buscar) justo antes de abrir tel:');
      // La página se corta en el mismo instante del toque (en Safari, abrir tel: cancela lo que la página tenía en vuelo; aquí, window.stop() mientras
      // el envío del toque sigue en el camino, retenido 600 ms): el toque cuenta igual, porque sale por la vía que sobrevive a la salida
      // (lib/contar-toque.ts: sendBeacon o fetch keepalive a /api/toque). Con la acción del servidor de antes, este caso queda en 0.
      await abrir(pv);
      const retener = async (r) => { if (r.request().method() === 'POST') await new Promise((x) => setTimeout(x, 600)); await r.continue().catch(() => {}); };
      await pv.route('**/*', retener);
      await card(pv, 'dos').locator('[data-llamar]').click();
      await pv.evaluate(() => window.stop());
      ok(await espera(() => sql(`select count(*) from contact_taps where business_id = '${NEG.dos}' and kind = 'call' and source = 'buscar'`) === '1'), 'llamar y la página se corta en el mismo instante: el toque cuenta igual (sobrevive a la salida)');
      await pv.unroute('**/*', retener);
      // Lo que de verdad se promete (la bandeja de lib/contar-toque.ts): ningún envío tiene garantizado sobrevivir a la salida de la página
      // (CI 45060882235: en WebKit el beacon llegó casi siempre, no siempre), así que el toque queda pendiente hasta que el servidor contesta 204,
      // y se reintenta. Cada caso, con su negocio (la persona cuenta una vez cada 10 min por negocio, de cualquier tipo).
      const cuantos = (tag, kind = 'call') => sql(`select count(*) from contact_taps where business_id = '${NEG[tag]}' and kind = '${kind}'`);
      const pendientes = () => pv.evaluate(() => sessionStorage.getItem('tl-toques-pendientes'));
      // (a) El beacon dice que sí y no manda nada (lo que se ve en WebKit cuando se pierde): el reintento lo cuenta, una vez.
      await abrir(pv);
      await pv.evaluate(() => { navigator.sendBeacon = () => true; });
      await card(pv, 'tres').locator('[data-llamar]').click();
      ok(await espera(() => cuantos('tres') === '1'), 'el primer envío se pierde (el beacon no llega): el toque cuenta igual por el reintento');
      await pv.waitForTimeout(2500);
      ok(cuantos('tres') === '1' && await pendientes() === null, '… una sola vez, y la bandeja queda vacía');
      // (b) Sin beacon (sale por fetch keepalive) y la PRIMERA petición a /api/toque se aborta en el camino, y TARDE: 2 s, después del reintento
      // de los 1,5 s, que la salta porque sigue «en camino» (CI 45071274895: así quedó INESTABLE en WebKit, donde el fetch abortado tardó en
      // fallar). Un envío fallido rearma el reintento: el toque se cuenta igual, una vez, sin esperar a la página siguiente.
      await abrir(pv);
      await pv.evaluate(() => { Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true }); });
      const vistas = []; let abortadas = 0;
      const cortarPrimera = async (r) => { vistas.push(r.request().method()); if (abortadas === 0) { abortadas++; await new Promise((x) => setTimeout(x, 2000)); await r.abort('failed').catch(() => {}); } else await r.continue().catch(() => {}); };
      await pv.route('**/api/toque', cortarPrimera);
      await card(pv, 'uno').locator('[data-llamar]').click();
      ok(await espera(() => cuantos('uno') === '1'), 'el primer envío se pierde (abortado en el camino): el toque cuenta igual por el reintento');
      await pv.waitForTimeout(2500);
      ok(cuantos('uno') === '1' && abortadas === 1 && vistas.length === 2 && vistas.every((m) => m === 'POST') && await pendientes() === null, `… una sola vez (${vistas.length} envíos: el primero abortado, el reintento confirmado; la bandeja vacía)`);
      await pv.unroute('**/api/toque', cortarPrimera);
      // (b') El envío con keepalive se queda colgado: su promesa no termina nunca (CI 45071274895: en WebKit, un fetch keepalive abortado no
      // rechazaba). El reintento no puede esperarlo: «en camino» caduca y sale un fetch normal. Aquí, sin beacon y con todo fetch keepalive a
      // /api/toque convertido en una promesa que nunca se resuelve (y que no manda nada).
      await abrir(pv);
      await pv.evaluate(() => {
        Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });
        const f = window.fetch.bind(window);
        window.__colgados = 0;
        window.fetch = (u, o) => (String(u).endsWith('/api/toque') && o && o.keepalive ? (window.__colgados++, new Promise(() => {})) : f(u, o));
      });
      ok(await card(pv, 'cerrado').locator('[data-llamar]').count() === 1, 'el negocio cerrado también tiene «Llamar»');
      await card(pv, 'cerrado').locator('[data-llamar]').click();
      ok(await espera(() => cuantos('cerrado') === '1', 20000), 'el primer envío se queda colgado (su promesa no termina): el toque cuenta igual por el reintento');
      await pv.waitForTimeout(2500);
      ok(cuantos('cerrado') === '1' && await pv.evaluate(() => window.__colgados) === 1 && await pendientes() === null, '… una sola vez (un envío colgado; el reintento, sin keepalive, confirmó; la bandeja vacía)');
      // (c) Llegan los dos (el beacon y el reintento, que confirma con su 204): sigue siendo UNO.
      await abrir(pv);
      const confirmados = [];
      const alResponder = (x) => { if (x.url().endsWith('/api/toque') && x.request().method() === 'POST' && x.request().resourceType() === 'fetch') confirmados.push(x.status()); };
      pv.on('response', alResponder);
      await card(pv, 'cero').locator('[data-llamar]').click();
      ok(await espera(() => cuantos('cero') === '1'), 'llegan los dos (beacon y reintento): el toque cuenta');
      ok(await espera(async () => confirmados.includes(204)) && await espera(async () => (await pendientes()) === null), 'el reintento llegó y confirmó (204): la bandeja queda vacía');
      await pv.waitForTimeout(1000);
      ok(cuantos('cero') === '1', 'llegan los dos: cuenta UNO');
      pv.off('response', alResponder);
      // (c') Seis copias del mismo toque A LA VEZ (el beacon y el reintento pueden cruzarse en el servidor): el candado deja contar UNO.
      const seis = await pv.evaluate((id) => Promise.all(Array.from({ length: 6 }, () => fetch('/api/toque', { method: 'POST', body: JSON.stringify({ id, kind: 'call', origen: 'buscar' }), headers: { 'content-type': 'text/plain;charset=UTF-8' } }).then((r) => r.status))), NEG.largo);
      ok(seis.every((s) => s === 204) && cuantos('largo') === '1', `seis copias a la vez (${seis.join(', ')}): cuenta UNO`);
      // (d) Recargar con un toque pendiente (la página se fue antes de mandarlo, o no llegó): al montar la app sale, y cuenta.
      await pv.evaluate((id) => sessionStorage.setItem('tl-toques-pendientes', JSON.stringify([{ t: 'ak-pendiente', h: Date.now() - 30000, d: { id, kind: 'directions', origen: 'buscar' } }])), NEG.video);
      await pv.reload();
      ok(await espera(() => cuantos('video', 'directions') === '1'), 'recargar con un toque pendiente: lo manda al montar, y cuenta');
      ok(await espera(async () => (await pendientes()) === null), '… y sale de la bandeja');
      // (e) Un pendiente viejo se tira (más de 10 min: fuera de la ventana del servidor, podría contarse dos veces).
      await pv.evaluate((id) => sessionStorage.setItem('tl-toques-pendientes', JSON.stringify([{ t: 'ak-viejo', h: Date.now() - 11 * 60000, d: { id, kind: 'call', origen: 'buscar' } }])), NEG.hoy);
      await pv.reload();
      ok(await espera(async () => (await pendientes()) === null), 'un pendiente viejo se tira (más de 10 min)');
      await pv.waitForTimeout(2000);
      ok(cuantos('hoy') === '0', '… y no se manda');
      // (f) 0211 · El mismo toque desde otra red: una persona SIN sesión cuyo primer envío llegó (y contó), cuyo reintento falló y que vuelve desde
      // OTRA red (otra IP). La ventana de 10 min es por red para quien no tiene sesión, así que antes contaba dos veces. Ahora el id del toque viaja
      // («toque», el mismo en cada envío) y la base no escribe otra fila con el mismo id (contact_taps.tap_key, único). La red se simula con la
      // cabecera x-real-ip, que es lo que lee ipCliente (lib/cuenta.ts) detrás del proxy: cada petición a /api/toque sale con la IP que se le pone.
      const red = (n) => `198.51.${100 + (Number(k) % 50)}.${n}`;
      const cSin = await ctxDe(390, 844, true), ps = await pagina(cSin);
      await abrir(ps);
      await ps.evaluate(() => { navigator.sendBeacon = undefined; }); // el primer envío sale por fetch con keepalive (se puede leer y cortar su respuesta)
      const cuerpos = [], estados = [];
      const otraRed = async (r) => {
        const h = { ...r.request().headers() }, primera = cuerpos.length === 0;
        cuerpos.push(r.request().postData() ?? '');
        if (primera) { // llega al servidor desde la red A (cuenta) y la respuesta se pierde en el camino: la bandeja reintenta
          const resp = await r.fetch({ headers: { ...h, 'x-real-ip': red(1) } }); estados.push(resp.status());
          await r.fulfill({ status: 503, body: '' });
        } else await r.continue({ headers: { ...h, 'x-real-ip': red(2) } }); // los reintentos, desde la red B
      };
      await ps.route('**/api/toque', otraRed);
      await card(ps, 'video').locator('[data-llamar]').click();
      ok(await espera(async () => cuerpos.length >= 2 && (await ps.evaluate(() => sessionStorage.getItem('tl-toques-pendientes'))) === null, 20000), `el mismo toque desde otra red: la red A lo recibió (${estados.join(', ')}), la respuesta se perdió y el reintento llegó desde la red B (la bandeja queda vacía)`);
      const ids = cuerpos.map((x) => { try { return JSON.parse(x).toque; } catch { return null; } });
      ok(ids.every((x) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x ?? '') && x === ids[0]), `… cada envío lleva el mismo id del toque (${cuerpos.length} envíos, toque ${String(ids[0]).slice(0, 8)}…)`);
      await ps.waitForTimeout(1000);
      ok(cuantos('video') === '1' && sql(`select count(*) from contact_taps where tap_key = '${ids[0]}' and user_id is null and ip = '${red(1)}'`) === '1', '… y cuenta UNO (la fila de la red A, con su id)');
      await ps.unroute('**/api/toque', otraRed);
      // La misma copia mandada a mano desde dos redes más: con el mismo id, UNO; sin id (una página vieja abierta) cuenta como antes, y ahí se ve
      // el hueco que cierra el id (dos redes, dos filas): así se sabe que la red simulada de verdad cuenta como otra red.
      const desde = (ip, cuerpo) => ps.evaluate(([ip, cuerpo]) => fetch('/api/toque', { method: 'POST', body: JSON.stringify(cuerpo), headers: { 'content-type': 'text/plain;charset=UTF-8', 'x-real-ip': ip } }).then((r) => r.status), [ip, cuerpo]);
      const kh = uuid();
      const conId = [await desde(red(3), { id: NEG.hoy, kind: 'call', origen: 'buscar', toque: kh }), await desde(red(4), { id: NEG.hoy, kind: 'call', origen: 'buscar', toque: kh })];
      ok(conId.every((x) => x === 204) && cuantos('hoy') === '1', `el mismo toque desde otra red, con el mismo id: UNO (${conId.join(', ')})`);
      const sinId = [await desde(red(5), { id: NEG.cerrado, kind: 'call', origen: 'buscar' }), await desde(red(6), { id: NEG.cerrado, kind: 'call', origen: 'buscar' })];
      ok(sinId.every((x) => x === 204) && sql(`select count(*) from contact_taps where business_id = '${NEG.cerrado}' and user_id is null`) === '2', 'sin id (una página vieja): cuenta como antes, una vez por red (dos redes, dos)');
      const malo = await desde(red(7), { id: NEG.uno, kind: 'call', origen: 'buscar', toque: 'no-es-un-uuid' });
      ok(malo === 204 && sql(`select count(*) from contact_taps where business_id = '${NEG.uno}' and user_id is null`) === '0', 'un id que no es un uuid: no cuenta nada (204)');
      await ps.close();
      await abrir(pv);
      await card(pv, 'cinco').locator('[data-cta]').click();
      ok(await espera(async () => new URL(pv.url()).pathname === `/n/${NEG.cinco}`), 'el botón principal («Ordenar») abre la ficha, como decide el servidor');
      await abrir(pv);
      await card(pv, 'tres').locator('.tl-vit-nombre').click();
      ok(await espera(async () => new URL(pv.url()).pathname === `/n/${NEG.tres}`), 'tocar el nombre abre la ficha');
      await abrir(pv);
      await card(pv, 'tres').locator('.tl-vit-cuerpo').click({ position: { x: 300, y: 4 } });
      ok(await espera(async () => new URL(pv.url()).pathname === `/n/${NEG.tres}`), 'tocar la tarjeta (el cuerpo) abre la ficha');
      await abrir(pv);
    }

    console.log('5 · La caja HOY abre «Hoy en el barrio»; el video va en la celda grande');
    {
      const c = card(pv, 'hoy'), of = c.locator('button[data-oferta]');
      ok(await of.count() === 1 && /Hoy hay sancocho/.test(await of.innerText()) && await c.locator('[data-anillo]').count() === 0, 'con algo publicado en las últimas 24 h, la caja HOY es un botón (y no hay anillo)');
      ok(/Hoy en el barrio/.test(await of.getAttribute('aria-label')) && (await of.boundingBox()).height >= 44, `con su nombre: «${await of.getAttribute('aria-label')}» y 44 de alto`);
      await of.click();
      ok(await espera(async () => (await pv.locator('[data-visor-hoy]').count()) > 0 && /Hoy hay sancocho/.test(await pv.innerText('body'))), 'abre «Hoy en el barrio» de ese negocio');
      await pv.keyboard.press('Escape');
      ok(await espera(async () => (await pv.locator('[data-visor-hoy]').count()) === 0), 'Esc lo cierra');
      ok(await pv.locator('[data-anillo]').count() === 0, 'en toda la lista no queda ningún anillo sobre un logo');
      const v = card(pv, 'video');
      ok(await v.locator('[data-celda="grande"] video[data-video-tarjeta]').count() === 1 && await v.locator('[data-celda="chica"] video').count() === 0 && await v.locator('video').count() === 1, 'el video aprobado está SOLO en la celda grande');
      ok(await pv.locator('article[data-vitrina] video').count() === 1, 'y solo el negocio con video aprobado lo lleva');
      ok(await card(pv, 'tres').locator('video').count() === 0, 'los demás no');
      ok(await v.locator('video').evaluate((e) => e.muted), 'sin sonido (muted)');
    }

    console.log('6 · La fila Free');
    {
      const f = card(pv, 'free');
      ok(await f.count() === 1 && await f.getAttribute('data-vitrina') === 'free', 'el negocio Free sale como fila compacta');
      const fo = await f.locator('.tl-fila-foto').boundingBox(), fb = await f.boundingBox();
      ok(cerca(fo.width, 96, 0.5) && fo.height >= 95.5 && cerca(fo.height, fb.height - 2, 1.5), `foto de ${fo.width} px de ancho y a todo el alto (${Math.round(fo.height)})`);
      ok(await f.locator('.tl-vit-gal, [data-guardar], .tl-vit-estado, .tl-vit-oferta, .tl-vit-chips, .tl-vit-horas').count() === 0, 'sin galería, estado, guardar, oferta, chips ni horarios');
      const ll = f.locator('[data-llamar]'), lb = await ll.boundingBox(), vl = await ll.locator('> span').boundingBox();
      ok(/Llamar/.test(await ll.innerText()) && lb.height >= 44 && cerca(vl.height, 34, 0.5), `«Llamar» se ve de 34 de alto y su caja mide ${lb.height}`);
      const nom = await f.locator('.tl-fila-nombre').evaluate((e) => { const s = getComputedStyle(e); return [s.fontWeight, s.fontSize]; });
      ok(nom[0] === '700' && nom[1] === '14.5px', `nombre ${nom.join(' ')}`);
      await ll.click();
      ok(await espera(() => sql(`select count(*) from contact_taps where business_id = '${NEG.free}' and kind = 'call'`) === '1'), 'Llamar: la base cuenta el toque');
      await abrir(pv);
    }

    console.log('7 · Nombre largo, Pro antes que Free, nombres y cajas de 44, sin desborde');
    {
      const c = card(pv, 'largo'), nm = c.locator('.tl-vit-nombre');
      const m = await nm.evaluate((e) => ({ corta: e.scrollWidth > e.clientWidth, ts: getComputedStyle(e).textOverflow, ws: getComputedStyle(e).whiteSpace }));
      const cb = await c.boundingBox(), nb = await nm.boundingBox();
      ok(m.corta && m.ts === 'ellipsis' && m.ws === 'nowrap' && nb.x + nb.width <= cb.x + cb.width, 'el nombre larguísimo se corta con elipsis, en una línea y dentro de la tarjeta');
      ok(await pv.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'y la página no se ensancha');
      const orden = await pv.locator('article[data-vitrina]').evaluateAll((L) => L.map((e) => e.getAttribute('data-vitrina')));
      ok(orden.lastIndexOf('pro') < orden.indexOf('free'), `Pro siempre antes que Free (${orden.join(' ')})`);
      const malos = await pv.locator('article[data-vitrina] button').evaluateAll((L) => L.filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return { n: e.getAttribute('aria-label') || e.textContent.trim().slice(0, 24), w: r.width, h: r.height }; }).filter((x) => x.w < 44 || x.h < 44));
      ok(malos.length === 0, `todo control de las tarjetas mide 44 × 44 como mínimo${malos.length ? ' · fallan: ' + JSON.stringify(malos.slice(0, 4)) : ''}`);
      const sin = await pv.locator('article[data-vitrina] button').evaluateAll((L) => L.filter((e) => !(e.getAttribute('aria-label') || e.textContent.trim())).length);
      ok(sin === 0, 'y todos tienen nombre accesible');
      const TACTIL = require('../lib/tactil.cjs'), pisan = await TACTIL.pisan(pv);
      ok(pisan.filter((x) => /Guardar|Llamar|fotos|Horario|Hoy en el barrio|Ordenar/.test(x)).length === 0, `ninguna caja de las tarjetas le quita el toque a otro control${pisan.length ? ' (pisan en otras partes: ' + pisan.slice(0, 2).join('; ') + ')' : ''}`);
      await pv.keyboard.press('Tab');
      const foco = await pv.evaluate(() => { const e = document.activeElement; return e ? getComputedStyle(e).outlineStyle : ''; });
      ok(foco !== '', 'el teclado llega a los controles (foco visible)');
    }
    for (const [w, h, movil] of [[320, 568, true], [390, 844, true], [1440, 900, false]]) {
      const c = await ctxDe(w, h, movil), p = await pagina(c);
      await abrir(p);
      const exceso = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const fuera = await p.locator('article[data-vitrina]').evaluateAll((L) => L.filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).length);
      ok(exceso <= 0 && fuera === 0, `${w}: sin desborde a lo ancho (exceso ${exceso}, tarjetas fuera ${fuera})`);
      if (w === 1440) {
        const a = await card(p, 'tres').boundingBox();
        ok(a.width >= 319, `1440: la tarjeta Pro mide ${Math.round(a.width)} (mínimo 320)`);
        const cols = await p.locator('[data-lista="pro"]').evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length);
        const gap = await p.locator('[data-lista="pro"]').evaluate((e) => getComputedStyle(e).columnGap);
        const gapF = await p.locator('[data-lista="free"]').evaluate((e) => [getComputedStyle(e).gridTemplateColumns.split(' ').length, getComputedStyle(e).columnGap]);
        ok(cols >= 2 && gap === '16px' && gapF[0] === 2 && gapF[1] === '12px', `rejilla Pro de ${cols} columnas con 16 de separación; Free en ${gapF[0]} con ${gapF[1]}`);
      } else {
        const gap = await p.locator('[data-lista="pro"]').evaluate((e) => getComputedStyle(e).rowGap);
        ok(gap === '12px', `${w}: 12 px entre tarjetas`);
      }
      if (w === 390) {
        await p.screenshot({ path: OUT + 'ak-buscar-390.png' });
        await card(p, 'cinco').screenshot({ path: OUT + 'ak-tarjeta-pro.png' });
        await card(p, 'free').screenshot({ path: OUT + 'ak-fila-free.png' });
        await p.screenshot({ path: OUT + 'ak-tarjeta-pro-pagina.png', clip: { ...(await card(p, 'cinco').boundingBox()), x: 0, width: 390 } }).catch(() => {});
      }
      if (w === 320) await p.screenshot({ path: OUT + 'ak-buscar-320.png' });
      await c.close();
    }

    console.log('8 · Horarios libres (el componente, con los datos de muestra de /sistema): uno a la vez y sin cambiar de forma');
    {
      // El catálogo muestra TODAS las piezas del sistema y algunas sin datos fallan a propósito (marcadas «Sin datos de ejemplo»): sin vigilar la consola de esta página.
      const c = await ctxDe(390, 844, true), p = await c.newPage();
      await p.goto(B + '/sistema'); await p.waitForLoadState('networkidle').catch(() => {});
      const fig = p.locator('[data-componente="TarjetaVitrina"]');
      ok(await espera(async () => (await fig.locator('.tl-vit-hora').count()) === 3), 'la pieza dibuja los tres horarios libres');
      const H = fig.locator('.tl-vit-hora'), forma = async (i) => H.nth(i).locator('> span').evaluate((e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10, s.borderRadius, s.paddingTop, s.paddingLeft, s.backgroundColor]; });
      const antes = await forma(1);
      ok(antes[5] === 'rgba(0, 229, 196, 0.16)' && antes[2] === '8px', `libre: fondo menta ${antes[5]} y radio ${antes[2]}`);
      await H.nth(1).click();
      ok(await espera(async () => (await forma(1))[5] === 'rgb(11, 14, 18)'), 'elegido: el fondo se funde a tinta');
      const e1 = await forma(1);
      ok(await H.nth(1).getAttribute('aria-pressed') === 'true' && e1[5] === 'rgb(11, 14, 18)' && e1.slice(0, 5).join() === antes.slice(0, 5).join(), `elegido: fondo tinta y MISMA forma (${e1.slice(0, 5).join(' · ')})`);
      await H.nth(2).click();
      ok(await H.nth(1).getAttribute('aria-pressed') === 'false' && await H.nth(2).getAttribute('aria-pressed') === 'true', 'elegir otro suelta el primero (uno a la vez)');
      await H.nth(2).click();
      ok(await H.nth(2).getAttribute('aria-pressed') === 'false', 'tocar el elegido lo suelta');
      const hb = await H.nth(0).boundingBox();
      ok(hb.height >= 44, `la caja de cada horario mide ${hb.height} (≥ 44)`);
      await c.close();
    }

    console.log('9 · Escritorio 1440: la página de categoría y Negocios, con la tarjeta nueva');
    {
      sql(`update businesses set status = 'hidden' where id like '${T}-%'`); // las capturas de las páginas, con los negocios de la semilla (fotos de verdad)
      const c = await ctxDe(1440, 900, false), p = await pagina(c);
      await p.goto(B + '/c/comida'); await p.waitForLoadState('networkidle').catch(() => {});
      ok(await espera(async () => (await p.locator('article[data-vitrina="pro"]').count()) > 0), '/c/comida: tarjetas Vitrina Pro');
      ok(await p.locator('[data-una-linea], [data-anillo]').evaluateAll((L) => L.filter((e) => !e.closest('[data-patrocinados]')).length) === 0, 'sin la tarjeta de una línea ni anillos (los Patrocinados siguen como estaban)');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '1440: sin desborde');
      await alasTarjetas(p); await p.screenshot({ path: OUT + 'ak-categoria-1440.png' });
      await p.goto(B + '/negocios'); await p.waitForLoadState('networkidle').catch(() => {});
      ok(await espera(async () => (await p.locator('article[data-vitrina="pro"]').count()) > 0), '/negocios: tarjetas Vitrina');
      await alasTarjetas(p); await p.screenshot({ path: OUT + 'ak-negocios-1440.png' });
      await c.close();
      const m = await ctxDe(390, 844, true), pm = await pagina(m);
      await pm.goto(B + '/c/comida'); await pm.waitForLoadState('networkidle').catch(() => {});
      ok(await espera(async () => (await pm.locator('article[data-vitrina="pro"]').count()) > 0), '390 · /c/comida: tarjetas Vitrina');
      ok(await pm.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '390: sin desborde');
      await alasTarjetas(pm); await pm.screenshot({ path: OUT + 'ak-categoria-390.png' });
      await pm.goto(B + '/negocios'); await pm.waitForLoadState('networkidle').catch(() => {});
      await alasTarjetas(pm); await pm.screenshot({ path: OUT + 'ak-negocios-390.png' });
      await m.close();
    }
    ok(err.length === 0, `sin errores de página ni de consola${err.length ? ': ' + err.slice(0, 3).join(' | ') : ''}`);
    console.log(`\ntarAK · ${n} comprobaciones en verde`);
  } finally {
    sql(`update businesses set status = 'hidden' where id like '${T}-%'`);
    for (const id of POST) { try { sql(`update business_posts set status = 'removed' where id = ${id}`); } catch (e) { console.error('limpieza', e.message); } }
    sql(`update business_videos set status = 'quitado', ended_at = now() where business_id like '${T}-%'`);
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
