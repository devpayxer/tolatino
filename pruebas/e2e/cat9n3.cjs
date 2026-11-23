// 9n · Portada de la página de una categoría desde el Super Admin (Catálogo › la categoría › «Portada de la página»; regla 8: nada existe sin su gestión).
// De punta a punta, en el Super Admin (escritorio 1360 y teléfono 390) y en la página pública /c/<categoría> (390 y 1360):
// 1. De fábrica: la página pinta la portada de categories.page (archivo propio en /paginas/) y la ficha de la categoría dice «ACTUAL · DE FÁBRICA», sin «Volver a la de fábrica».
// 2. Un Admin elige una foto (la sube por la ruta de las fotos públicas, con su revisión) → sale «NUEVA» → «Poner de portada» con motivo: la base guarda la dirección propia
//    (/medios/n/<id>.jpg), la foto pasa a ser de la categoría, la auditoría lleva antes → después y el motivo, y la página pública pinta ESA foto al momento (misma pieza,
//    a la medida: la variante .w<ancho>.webp de esa foto) y la imagen servida responde 200. Sin reiniciar nada.
// 3. Otro Admin sin permiso (Solo lectura) no puede: la pantalla le dice «Tu rol no edita el catálogo.» sin abrir el selector, y la MISMA llamada al servidor con su sesión
//    es rechazada; nada cambia.
// 4. Una foto que pasa a privada entre subirla y guardar se rechaza («Esa foto no existe.») y no cambia nada (ni la portada, ni la auditoría, ni la foto).
// 5. «Volver a la de fábrica» con motivo: la página vuelve a la de antes, la foto del equipo queda «removed/replaced» (nada se borra) y la auditoría lo dice.
// 6. La base impone que page_admin solo lleve «hero» y una foto de nuestro almacén (nunca una dirección de afuera).
// Precondición propia: la categoría de prueba con portada de fábrica; lo que una vuelta anterior dejó en page_admin vuelve como estaba. Al final, todo vuelve a de fábrica.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, equipo, medios } = require('../lib/negocio-nuevo.cjs');
const { elegirFoto } = require('../lib/elegir-foto.cjs');
const B = ENT.B, OUT = ENT.OUT, FOTO1 = ENT.rec('fotos') + '/portada.jpg', FOTO2 = ENT.rec('fotos') + '/galeria.png';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const hasta = async (f, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 250)); } return false; };
const t = (p, x) => p.getByText(x, { exact: true }).last();
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const shot = async (p, nombre) => { await p.waitForTimeout(500); await p.screenshot({ path: OUT + 'cat9n3-' + nombre, fullPage: true }); };
const CAT = 'NEG-EDU', ADM = '5705550199', LUCIA = '5705550693';
const TEL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-US' }, ESC = { viewport: { width: 1360, height: 900 }, locale: 'es-US' };
// La portada que pinta la página pública: el fondo de la caja de arriba (h-[150px] en teléfono, 210 en escritorio).
const portadaPintada = (p) => p.evaluate(() => { const e = document.querySelector('div[class*="h-[150px]"]'); return e ? getComputedStyle(e).backgroundImage : null; });
// Lo que ESTA corrida dejó en la auditoría (los motivos llevan su número).
let K = ''; const audit = (accion) => Number(sql(`select count(*) from audit_entries where action = '${accion}' and target_id = '${CAT}' and reason like 'cat9n3 ${K} %'`));
const confirmar = async (p, motivo, cta) => { await p.locator('textarea').last().fill(motivo); await t(p, cta).click(); };

(async () => {
  K = String(Date.now() % 100000).padStart(5, '0');
  equipo(LUCIA);
  const SLUG = slug(sql(`select short->>'es' from categories where id = '${CAT}'`)), FAB = sql(`select page->>'hero' from categories where id = '${CAT}'`);
  // Precondición propia: lo que una vuelta anterior dejó puesto vuelve a de fábrica (las fotos quedan «removed/replaced»: nada se borra).
  sql(`update media set status = 'removed', removed_reason = 'replaced', removed_at = now() where owner_kind = 'category' and owner_id = '${CAT}' and status = 'visible'`);
  sql(`update categories set page_admin = '{}'::jsonb where id = '${CAT}'`);
  ok(/^\/paginas\/.+\.(jpg|webp)$/.test(FAB), `precondición: la portada de fábrica de ${CAT} es un archivo propio (${FAB})`);
  const UANA = sql(`select id from users where phone = '+1${ADM}'`);
  const b = await chromium.launch(); const err = [], abiertas = [];
  const mk = async (o, tel) => { const cx = await b.newContext(o); abiertas.push(cx); await medios(cx); const p = await cx.newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_|status of 40/.test(x.text())) err.push('console: ' + x.text()); }); if (tel) await entrarComo(p, tel); return p; };
  try {
    const a = await mk(ESC, ADM), am = await mk(TEL, ADM), v = await mk(TEL, null), ve = await mk(ESC, null), lu = await mk(ESC, LUCIA);
    // Lo que manda la pantalla al servidor (para repetirlo con otra sesión).
    const llamadas = []; a.on('request', (r) => { if (r.method() === 'POST' && r.headers()['next-action']) llamadas.push({ url: r.url(), h: r.headers(), body: r.postData() }); });

    console.log('1 · De fábrica');
    await v.goto(B + '/c/' + SLUG); await v.locator('div[class*="h-[150px]"]').first().waitFor();
    ok((await portadaPintada(v))?.includes(FAB), `la página pública pinta la portada de fábrica (${FAB})`);
    await shot(v, 'publica-fabrica-390.png');
    await a.goto(B + '/admin/catalogo?c=' + CAT); await a.locator('text=PORTADA DE LA PÁGINA').first().waitFor();
    ok(await t(a, 'ACTUAL · DE FÁBRICA').isVisible(), 'la ficha de la categoría dice «ACTUAL · DE FÁBRICA»');
    ok(await a.getByText('Volver a la de fábrica', { exact: true }).count() === 0, 'sin portada del equipo no hay «Volver a la de fábrica»');
    ok(await a.getByText('Los mosaicos de la página no se cambian desde aquí', { exact: false }).count() > 0, 'el aviso dice que los mosaicos no se cambian desde aquí');
    await shot(a, 'admin-fabrica-1360.png');

    console.log('2 · Un Admin cambia la portada');
    await elegirFoto(a, FOTO1, { ruta: /\/api\/medios$/, toque: (p) => p.getByText('Cambiar foto', { exact: true }).first(), listo: (p) => p.getByText('NUEVA', { exact: true }).first().waitFor({ timeout: 30000 }) });
    const ID1 = sql(`select id from media where uploaded_by = '${UANA}' and owner_kind = 'user' and url like '/medios/n/%' and status = 'visible' order by created_at desc limit 1`);
    ok(/^[0-9a-f-]{36}$/.test(ID1), `la foto subió por la ruta de las fotos públicas y quedó visible (${ID1})`);
    ok(await t(a, 'Poner de portada').isVisible() && await t(a, 'Descartar').isVisible(), 'sale «NUEVA» con «Poner de portada» y «Descartar»');
    await shot(a, 'admin-nueva-1360.png');
    await t(a, 'Poner de portada').click();
    await a.locator('text=/Se ve al momento en la página pública/').first().waitFor();
    await confirmar(a, `cat9n3 ${K} cambio`, 'Poner de portada');
    await a.locator('text=/Portada cambiada/').first().waitFor();
    ok(sql(`select page_admin->>'hero' from categories where id = '${CAT}'`) === `/medios/n/${ID1}.jpg`, 'la base guarda la dirección propia /medios/n/<id>.jpg en page_admin');
    ok(sql(`select page_admin::text from categories where id = '${CAT}'`).replace(/\s/g, '') === `{"hero":"/medios/n/${ID1}.jpg"}`, 'page_admin solo lleva la clave «hero»');
    ok(sql(`select owner_kind || '|' || owner_id || '|' || status from media where id = '${ID1}'`) === `category|${CAT}|visible`, 'la foto pasó a ser de la categoría (ya no es de quien la subió)');
    ok(audit('catalogo.cat.portada') === 1, 'la auditoría tiene su renglón con el motivo');
    ok(sql(`select (before::text like '%de fábrica%' and after::text like '%${ID1}%')::text from audit_entries where action = 'catalogo.cat.portada' and target_id = '${CAT}' and reason like 'cat9n3 ${K} %'`) === 'true', 'la auditoría lleva antes (de fábrica) → después (la foto nueva)');
    ok(await t(a, 'ACTUAL · DEL EQUIPO').isVisible() && await t(a, 'DE FÁBRICA').isVisible(), 'la ficha muestra la del equipo como actual y la de fábrica aparte');
    ok(await t(a, 'Volver a la de fábrica').isVisible(), 'ahora sí sale «Volver a la de fábrica»');
    await a.locator('text=cambió la portada de la página').first().waitFor();
    ok(true, 'el historial de la categoría dice «cambió la portada de la página»');
    await shot(a, 'admin-puesta-1360.png');

    console.log('3 · La página pública pinta la nueva (sin reiniciar nada)');
    await v.goto(B + '/c/' + SLUG); await v.locator('div[class*="h-[150px]"]').first().waitFor();
    const bg = (await portadaPintada(v)) ?? '';
    ok(bg.includes(ID1) && !bg.includes(FAB), 'la página pública (390) pinta la foto nueva y ya no la de fábrica');
    ok(/\.w(320|640|1080|1600)\.webp/.test(bg), `a la medida: pide una variante WebP de esa foto (${bg.slice(0, 90)})`);
    const urlImg = (/url\("([^"]+)"\)/.exec(bg) ?? [])[1];
    ok(urlImg && await v.evaluate(async (u) => (await fetch(u)).status, urlImg) === 200, 'la imagen servida responde 200');
    await shot(v, 'publica-nueva-390.png');
    await ve.goto(B + '/c/' + SLUG); await ve.locator('div[class*="h-[210px]"], div[class*="lg:h-[210px]"]').first().waitFor();
    ok(((await portadaPintada(ve)) ?? '').includes(ID1), 'y en escritorio (1360) también');
    await shot(ve, 'publica-nueva-1360.png');
    await am.goto(B + '/admin/catalogo?c=' + CAT); await am.locator('text=PORTADA DE LA PÁGINA').first().waitFor();
    await shot(am, 'admin-puesta-390.png');
    ok(await t(am, 'ACTUAL · DEL EQUIPO').isVisible(), 'en el teléfono (390) la ficha también muestra la del equipo');

    console.log('4 · Otro Admin sin permiso no puede');
    await lu.goto(B + '/admin/catalogo?c=' + CAT); await lu.locator('text=PORTADA DE LA PÁGINA').first().waitFor();
    ok(await lu.getByText('Volver a la de fábrica', { exact: true }).count() === 0, 'el rol de solo lectura no ve «Volver a la de fábrica»');
    const abre = await Promise.all([lu.waitForEvent('filechooser', { timeout: 2500 }).then(() => true).catch(() => false), t(lu, 'Cambiar foto').click()]);
    ok(abre[0] === false, 'tocar «Cambiar foto» no abre el selector de archivos');
    await lu.locator('text=Tu rol no edita el catálogo.').first().waitFor();
    ok(true, 'dice «Tu rol no edita el catálogo.»');
    await shot(lu, 'sinpermiso-1360.png');
    // La misma llamada al servidor, repetida con la sesión de Solo lectura: el servidor la rechaza.
    const mia = llamadas.filter((x) => /Poner de portada|cat9n3/.test(x.body ?? '') || (x.body ?? '').includes(ID1)).pop();
    ok(!!mia, 'se capturó la llamada «Poner de portada» de la pantalla');
    const antes = { hero: sql(`select page_admin->>'hero' from categories where id = '${CAT}'`), aud: audit('catalogo.cat.portada') };
    const H = { 'next-action': mia.h['next-action'], 'content-type': mia.h['content-type'] ?? 'text/plain;charset=UTF-8', accept: 'text/x-component', origin: new URL(B).origin, referer: B + '/admin/catalogo?c=' + CAT };
    if (mia.h['next-router-state-tree']) H['next-router-state-tree'] = mia.h['next-router-state-tree'];
    const rr = await lu.request.post(mia.url, { headers: H, data: mia.body });
    const cuerpo = await rr.text();
    ok(/Tu rol no edita el catálogo\./.test(cuerpo), 'la llamada con la sesión de Solo lectura la rechaza el servidor («Tu rol no edita el catálogo.»)');
    ok(sql(`select page_admin->>'hero' from categories where id = '${CAT}'`) === antes.hero && audit('catalogo.cat.portada') === antes.aud, 'y no cambia nada (ni la portada ni la auditoría)');

    console.log('5 · Una foto que pasa a privada entre subir y guardar se rechaza');
    await a.goto(B + '/admin/catalogo?c=' + CAT); await a.locator('text=PORTADA DE LA PÁGINA').first().waitFor();
    await elegirFoto(a, FOTO2, { ruta: /\/api\/medios$/, toque: (p) => p.getByText('Cambiar foto', { exact: true }).first(), listo: (p) => p.getByText('NUEVA', { exact: true }).first().waitFor({ timeout: 30000 }) });
    const ID2 = sql(`select id from media where uploaded_by = '${UANA}' and owner_kind = 'user' and url like '/medios/n/%' and status = 'visible' order by created_at desc limit 1`);
    ok(/^[0-9a-f-]{36}$/.test(ID2) && ID2 !== ID1, `la segunda foto subió (${ID2})`);
    const audAntes = audit('catalogo.cat.portada');
    sql(`update media set private = true where id = '${ID2}'`); // pasa a privada entre subirla y guardar
    await t(a, 'Poner de portada').click(); await a.locator('text=/Se ve al momento en la página pública/').first().waitFor();
    await confirmar(a, `cat9n3 ${K} privada`, 'Poner de portada');
    await a.locator('text=Esa foto no existe.').first().waitFor();
    ok(true, 'el servidor la rechaza con «Esa foto no existe.» (nunca «ok» sin ella)');
    ok(sql(`select page_admin->>'hero' from categories where id = '${CAT}'`) === `/medios/n/${ID1}.jpg`, 'la portada sigue siendo la de antes');
    ok(audit('catalogo.cat.portada') === audAntes, 'no queda renglón de auditoría');
    ok(sql(`select owner_kind || '|' || status from media where id = '${ID2}'`) === 'user|visible', 'la foto rechazada no cambió de dueño ni de estado');
    ok(sql(`select owner_kind || '|' || status from media where id = '${ID1}'`) === `category|visible`, 'y la portada puesta sigue visible');
    await shot(a, 'rechazada-1360.png');
    sql(`update media set status = 'removed', removed_reason = 'replaced', removed_at = now() where id = '${ID2}'`); // la de prueba, fuera

    console.log('6 · Volver a la de fábrica');
    await a.goto(B + '/admin/catalogo?c=' + CAT); await a.locator('text=PORTADA DE LA PÁGINA').first().waitFor();
    await t(a, 'Volver a la de fábrica').click();
    await a.locator('text=/La página pública vuelve a la foto de fábrica/').first().waitFor();
    await confirmar(a, `cat9n3 ${K} vuelta`, 'Volver a la de fábrica');
    await a.locator('text=/Vuelve la portada de fábrica/').first().waitFor();
    ok(sql(`select page_admin::text from categories where id = '${CAT}'`).replace(/\s/g, '') === '{}', 'page_admin queda vacío');
    ok(sql(`select status || '|' || coalesce(removed_reason, '') from media where id = '${ID1}'`) === 'removed|replaced', 'la foto del equipo queda «removed/replaced»: nada se borra');
    ok(audit('catalogo.cat.portada_fabrica') === 1, 'la auditoría tiene su renglón con el motivo');
    ok(await a.getByText('Volver a la de fábrica', { exact: true }).count() === 0, 'ya no sale «Volver a la de fábrica»');
    await v.goto(B + '/c/' + SLUG); await v.locator('div[class*="h-[150px]"]').first().waitFor();
    const bg2 = (await portadaPintada(v)) ?? '';
    ok(bg2.includes(FAB) && !bg2.includes(ID1), 'la página pública vuelve a la portada de antes');
    await shot(v, 'publica-vuelta-390.png');
    await shot(a, 'admin-vuelta-1360.png');

    console.log('7 · La base solo deja una foto de nuestro almacén');
    let fallo = '';
    try { sql(`update categories set page_admin = '{"hero":"https://ejemplo.com/a.jpg"}'::jsonb where id = '${CAT}'`); } catch (e) { fallo = String(e.stderr ?? e); }
    ok(/categories_page_admin_portada_propia/.test(fallo), 'una dirección de afuera la rechaza la base (categories_page_admin_portada_propia)');
    fallo = '';
    try { sql(`update categories set page_admin = '{"title":{"es":"x"}}'::jsonb where id = '${CAT}'`); } catch (e) { fallo = String(e.stderr ?? e); }
    ok(/categories_page_admin_portada_propia/.test(fallo), 'y page_admin no admite otra clave que «hero»');
    ok(sql(`select page_admin::text from categories where id = '${CAT}'`).replace(/\s/g, '') === '{}', 'page_admin sigue vacío');

    ok(err.length === 0, 'sin errores de página ni de consola' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
    console.log(`\n${n} comprobaciones en verde`);
  } finally {
    sql(`update media set status = 'removed', removed_reason = 'replaced', removed_at = now() where owner_kind = 'category' and owner_id = '${CAT}' and status = 'visible'`);
    sql(`update categories set page_admin = '{}'::jsonb where id = '${CAT}'`);
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close().catch(() => {});
  }
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
