// 9e · Legales (fase9-apertura.md §3.6, §4 9e): las once páginas públicas sin sesión en ES y EN (el texto de docs/legal/, BORRADOR mientras no se
// publica, la adenda de Pennsylvania, el pie con todas), el primer pedido y Publica tu negocio anotan la aceptación en legal_acceptances, una
// versión nueva con force_accept publicada desde Super Admin › Textos y páginas › Páginas → la hoja «Aceptar los términos nuevos» en la pantalla de
// inicio (nunca encima del pedido abierto, que sigue igual), «Acepto» queda anotado UNA vez, las aceptaciones por versión son solo cifras, y en
// modo producción simulado (platform_config «entorno» = produccion) publicar sin la revisión del abogado → rechazado (y con la revisión, sí).
// Teléfono 390 y escritorio 1360. Precondiciones propias: las páginas indexadas (corre el indexador si faltan), la base dice «pruebas», cuentas
// nuevas (teléfonos 555 libres), Sabor Dominicano abierto mientras pide (su horario vuelve al final). Lo que la prueba publica se retira al final
// (nada se borra): la página vuelve a ser la de antes. Nada depende de otra prueba.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs');
const { entrarComo, telLibre, publicarBarberia } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr ?? e.message); } };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const t = (p, x) => p.getByText(x, { exact: true }).last();
const RUN = Date.now().toString(36), TAG = `[l9e ${RUN}]`;
const ADM = '5705550199', BIZ = 'sabor-dominicano';
const CLAVES = ['terminos', 'privacidad', 'cookies', 'reglas', 'verificamos', 'votos', 'seguridad', 'ia', 'dmca', 'vivienda-justa', 'accesibilidad'];
const ctxTel = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const ctxDesk = (b) => b.newContext({ viewport: { width: 1360, height: 900 } });
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `l9e-${nom}.png`, fullPage: full });
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
// Una versión nueva de una página, como la deja un despliegue cuando el archivo cambió en el repo (legal_indexar con otro texto).
const versionNueva = (k, linea) => sql(`select legal_indexar(jsonb_build_object('key', key, 'jurisdiction', jurisdiction, 'title', title, 'lead', lead,
    'body', jsonb_build_object('es', body_md->>'es' || E'\\n\\n## Prueba\\n${linea}\\n', 'en', body_md->>'en' || E'\\n\\n## Test\\n${linea}\\n'),
    'summary', jsonb_build_object('es', 'Prueba de la hoja ${TAG}', 'en', 'Sheet test ${TAG}'), 'text_date', text_date,
    'sha256', encode(sha256(convert_to('${RUN}${linea}', 'UTF8')), 'hex'), 'source_path', source_path))
  from legal_pages where key = '${k}' and jurisdiction = 'us' order by version desc limit 1`) && sql(`select id || '|' || version from legal_pages where key = '${k}' and jurisdiction = 'us' order by version desc limit 1`).split('|');
// El botón de una fila de versión en el detalle de una página del Super Admin.
const enVersion = (p, v, boton) => p.locator('div', { has: p.getByText(new RegExp(`^Versión ${v} · `)) }).filter({ hasNot: p.getByText(new RegExp(`^Versión (?!${v} ·)\\d+ · `)) })
  .filter({ has: p.getByText(boton, { exact: true }) }).last().getByText(boton, { exact: true });

(async () => {
  // ── Precondiciones propias ──
  sql(`insert into platform_config (key, value, note, updated_by) values ('entorno', '"pruebas"'::jsonb, 'Sandbox (leg9e)', 'semilla') on conflict (key) do update set value = excluded.value`);
  if (Number(sql(`select count(distinct key) from legal_pages where jurisdiction = 'us' and status <> 'retirado'`)) < CLAVES.length)
    execSync(`node ${ENT.RAIZ}/scripts/legal/indexar.mjs | docker exec -i ${ENT.DB} psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U tolatino -d tolatino -qAt`, { stdio: ['pipe', 'pipe', 'pipe'] });
  const horas = sql(`select coalesce(json_agg(json_build_object('w', weekday, 'o', open, 'r', ranges)), '[]') from business_hours where business_id = '${BIZ}' and module = ''`);
  const nuestras = [], abiertas = [];
  const b = await chromium.launch();
  try {
    // ── 1 · Cada página sin sesión, en ES y EN ──
    console.log('1 · Las once páginas, sin sesión, en español y en inglés');
    const pub = await ctxDesk(b), pp = await pub.newPage();
    for (const k of CLAVES) {
      const [tes, ten, st] = sql(`select v.title->>'es', v.title->>'en', v.status from legal_vigente('${k}', 'us') v`).split('|');
      for (const l of ['es', 'en']) {
        const r = await pp.goto(`${B}/${k}${l === 'en' ? '?l=en' : ''}`);
        const h1 = (await pp.locator('h1').first().innerText()).trim();
        ok(r.status() === 200 && h1 === (l === 'es' ? tes : ten) && await pp.locator(`[data-pantalla="WEB-LEGAL"][data-legal="${k}"]`).count() === 1
          && await pp.locator(`article[lang="${l}"]`).count() === 1, `/${k} (${l}) sin sesión: «${h1}»`);
        if (st !== 'publicado') ok(await pp.locator('[data-borrador]').count() === 1 && new RegExp(l === 'es' ? '^BORRADOR · VERSIÓN \\d+' : '^DRAFT · VERSION \\d+').test(await pp.locator('[data-version-linea]').first().innerText()), `/${k} (${l}): dice BORRADOR y su versión`);
      }
    }
    await pp.goto(B + '/terminos');
    ok(await pp.locator('[data-adenda="us-pa"]').count() === 1 && /Lo que aplica en Pennsylvania/.test(await texto(pp)), '/terminos trae la adenda de Pennsylvania (las cinco ciudades están en PA)');
    const pie = await pp.locator('[data-pie-legal]').innerText();
    const titulos = sql(`select string_agg(v.title->>'es', '|') from unnest(array['${CLAVES.join("','")}']) k, lateral legal_vigente(k, 'us') v`).split('|');
    ok(titulos.length === CLAVES.length && titulos.every((x) => pie.includes(x)), `el pie de la web trae las ${CLAVES.length} páginas`);
    await shot(pp, 'terminos-1360');
    await pp.goto(B + '/privacidad');
    const inv = JSON.parse(fs.readFileSync(ENT.RAIZ + '/apps/mobile/inventario-datos.json', 'utf8'));
    ok(await pp.locator('[data-dato]').count() === inv.categorias.length && await pp.locator('[data-mapa] [data-accion]').count() === 4 && await pp.locator('[data-porque]').count() > 3,
      '/privacidad: los datos del inventario y lo que pasa con cada uno al borrar la cuenta (del mapa)');
    await pub.close();
    const tel = await ctxTel(b), pt = await tel.newPage();
    await pt.goto(B + '/privacidad?l=en'); ok(/What happens to each piece of data when you delete your account/.test(await texto(pt)), '/privacidad en inglés, en el teléfono'); await shot(pt, 'privacidad-en-390');
    await pt.goto(B + '/reglas'); await shot(pt, 'reglas-390'); await tel.close();

    // ── 2 · El primer pedido anota la aceptación ──
    console.log('2 · El primer pedido: «Al enviar el pedido aceptas…» y queda anotado');
    sql(`update business_hours set ranges = '[["00:00","00:00"]]'::jsonb, open = true where business_id = '${BIZ}' and module = ''`);
    sql(`insert into menu_settings (business_id) values ('${BIZ}') on conflict (business_id) do update set pause_until = null`);
    sql(`update items set sold_out = false where business_id = '${BIZ}' and id = 16`);
    const P = telLibre(); const cp = await ctxTel(b), pv = await cp.newPage(); abiertas.push(pv); await entrarComo(pv, P, { nombre: 'Vecina', apellido: 'Legal' });
    const UP = uid(P); sql(`update users set home_city_id = 'hzl', is_test = true where id = '${UP}'`);
    ok(sql(`select count(*) from legal_acceptances where user_id = '${UP}'`) === '0', 'una cuenta nueva no tiene nada aceptado');
    await pv.goto(B + '/n/' + BIZ);
    await pv.evaluate(() => { localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id: '16', ch: {}, q: 1, nt: '', k: {} }] } })); localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' })); });
    await pv.goto(B + '/n/' + BIZ + '/pagar');
    await pv.locator('[data-acepta-pedido]').first().waitFor();
    ok(/Al enviar el pedido aceptas los Términos y la Privacidad de To'Latino/.test(await texto(pv)), 'el pago dice «Al enviar el pedido aceptas los Términos y la Privacidad»'); await shot(pv, 'pagar-acepta-390');
    await pv.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click();
    await pv.waitForURL(/\/pedido\/\d+$/, { timeout: 30000 }).catch(async (e) => { throw new Error('el pedido no salió · la página dice: ' + (await texto(pv)).replace(/\s+/g, ' ').slice(0, 1500) + ' · estado: ' + sql(`select coalesce(st.plan, '-') || ' · tope ' || coalesce((select value::text from platform_config where key = 'free_ops_cap'), '-') || ' · pausa ' || coalesce((select pause_until::text from menu_settings where business_id = '${BIZ}'), '-') from businesses b left join business_stats_cache st on st.business_id = b.id where b.id = '${BIZ}'`)); });
    const NUM = pv.url().split('/').pop();
    const vig = Number(sql(`select count(*) from unnest(array['terminos','privacidad']) k cross join unnest(array['us','us-pa']) j, lateral legal_vigente(k, j) v where v.id is not null`));
    ok(sql(`select count(*) from legal_acceptances where user_id = '${UP}' and via = 'primer_pedido' and business_id is null`) === String(vig), `el pedido #${NUM} anota Términos y Privacidad (la general y la de PA: ${vig})`);
    await pv.goto(B + '/n/' + BIZ);
    await pv.evaluate(() => localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id: '16', ch: {}, q: 1, nt: '', k: {} }] } })));
    await pv.goto(B + '/n/' + BIZ + '/pagar'); await pv.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).waitFor();
    ok(await pv.locator('[data-acepta-pedido]').count() === 0, 'el segundo pedido ya no lo pide (ya aceptó esa versión)');
    await pv.evaluate(() => localStorage.removeItem('tl-carrito-v1'));

    // ── 3 · Publica tu negocio anota la aceptación del negocio ──
    console.log('3 · Publica tu negocio');
    const neg = await publicarBarberia(b);
    ok(sql(`select count(*) from legal_acceptances where user_id = '${neg.uid}' and business_id = '${neg.id}' and via = 'publica'`) === String(vig), `publicar ${neg.id} anota los Términos y la Privacidad para negocios (${vig})`);

    // ── 4 · Super Admin: una versión nueva con force_accept ──
    console.log('4 · Super Admin › Textos y páginas › Páginas: publicar una versión que pide aceptar otra vez');
    const [ID1, V1] = versionNueva('terminos', `Cambio de prueba ${TAG}`); nuestras.push(ID1);
    const ca = await ctxDesk(b), pa = await ca.newPage(); abiertas.push(pa); await entrarComo(pa, ADM);
    await pa.goto(B + '/admin/textos'); await t(pa, 'Páginas').click(); await pa.waitForURL(/\/admin\/textos\/paginas$/);
    await pa.getByText(/^\d+ PÁGINAS$/).first().waitFor(); await shot(pa, 'admin-paginas-1360', false);
    await pa.goto(`${B}/admin/textos/paginas?k=terminos&j=us`); await pa.getByText(new RegExp(`^Versión ${V1} · `)).first().waitFor();
    const hayPublicada = sql(`select count(*) from legal_pages where key = 'terminos' and jurisdiction = 'us' and status = 'publicado'`) !== '0';
    await enVersion(pa, V1, hayPublicada ? 'Diferencias con la publicada' : 'Diferencias con la anterior').click();
    await pa.getByText(/^DIFERENCIAS · VERSIÓN/).first().waitFor();
    ok((await texto(pa)).includes(`Cambio de prueba ${TAG}`), 'Diferencias: sale el renglón nuevo'); await shot(pa, 'admin-diferencias-1360');
    await enVersion(pa, V1, 'Publicar').click();
    await t(pa, 'Sí: quien entre la acepta (la hoja)').click(); await pa.locator('textarea').last().fill(`Prueba de la hoja ${TAG}`); await t(pa, 'Publicar').click();
    await pa.getByText(/Publicada\. Quien entre después verá la hoja/).first().waitFor();
    ok(sql(`select status || '|' || force_accept || '|' || (published_by = '${uid(ADM)}') from legal_pages where id = ${ID1}`) === 'publicado|true|true', `la versión ${V1} queda publicada, pide aceptar otra vez, con quién la publicó`);
    ok(sql(`select count(*) from legal_page_log where page_id = ${ID1} and action = 'publicada' and reason like '%pide aceptar otra vez%'`) === '1' && sql(`select count(*) from audit_entries where action = 'legal.publicar' and target_id = 'terminos/us/v${V1}'`) === '1', 'en el libro y en la auditoría, con su motivo');

    // ── 5 · La hoja al entrar; el pedido abierto sigue ──
    console.log('5 · La hoja «Aceptar los términos nuevos»');
    await pv.goto(B + '/pedido/' + NUM); await pv.waitForLoadState('networkidle');
    ok(await pv.locator('[data-pantalla="APP-TERMINOS-NUEVOS"]').count() === 0 && (await texto(pv)).includes(NUM), `el pedido abierto #${NUM}: sin la hoja encima`);
    const estado = sql(`select status from operations where number = '${NUM}'`);
    await pv.goto(B + '/'); const hoja = pv.locator('[data-pantalla="APP-TERMINOS-NUEVOS"]'); await hoja.waitFor();
    const th = await hoja.innerText();
    ok(/Aceptar los términos nuevos/.test(th) && th.includes(`Prueba de la hoja ${TAG}`) && /LO QUE CAMBIÓ/.test(th) && await hoja.locator('[data-leer="terminos"]').getAttribute('href') === '/terminos',
      'al entrar al inicio: la hoja con lo que cambió y «Leer completo»'); await shot(pv, 'hoja-390', false);
    await t(hoja, 'Acepto').click(); await hoja.waitFor({ state: 'detached' });
    ok(sql(`select count(*) from legal_acceptances where user_id = '${UP}' and page_key = 'terminos' and jurisdiction = 'us' and version = ${V1} and via = 'hoja'`) === '1', `«Acepto»: la versión ${V1} queda anotada`);
    await pv.goto(B + '/'); await pv.waitForLoadState('networkidle'); ok(await pv.locator('[data-pantalla="APP-TERMINOS-NUEVOS"]').count() === 0, 'ya no sale');
    ok(sql(`select status from operations where number = '${NUM}'`) === estado, `el pedido #${NUM} sigue igual (${estado})`);
    // Una vez: otra vez lo mismo no anota otra fila; y el libro no se cambia.
    sql(`insert into legal_acceptances (user_id, page_key, jurisdiction, version, via) values ('${UP}', 'terminos', 'us', ${V1}, 'hoja') on conflict do nothing`);
    ok(sql(`select count(*) from legal_acceptances where user_id = '${UP}' and page_key = 'terminos' and jurisdiction = 'us' and version = ${V1}`) === '1', 'aceptar otra vez no anota otra fila (una vez por persona y versión)');
    ok(/legal_acceptances_una_vez/.test(sqlErr(`insert into legal_acceptances (user_id, page_key, jurisdiction, version, via) values ('${UP}', 'terminos', 'us', ${V1}, 'hoja')`)), 'la base rechaza la fila repetida');
    ok(/solo de inserción/.test(sqlErr(`update legal_acceptances set via = 'publica' where user_id = '${UP}'`)), 'una aceptación no se cambia (solo inserción)');
    await pv.goto(B + '/cuenta/ajustes/privacidad/terminos'); await pv.getByText('Términos de uso').first().waitFor();
    ok(new RegExp(`VERSIÓN ${V1} · ACEPTADO `).test(await texto(pv)), 'Términos que aceptaste: los Términos de uso con la versión nueva y su fecha'); await shot(pv, 'terminos-que-aceptaste-390');
    // Las aceptaciones por versión: solo cifras.
    await pa.goto(`${B}/admin/textos/paginas?k=terminos&j=us`); await pa.getByText(new RegExp(`^Versión ${V1} · `)).first().waitFor();
    const ta = await texto(pa);
    ok(/\d+ aceptaci(ón|ones)/.test(ta) && !ta.includes(P) && !ta.includes('Vecina Legal'), 'Super Admin: aceptaciones por versión, sin personas');

    // ── 6 · Producción simulada: sin la revisión del abogado, no se publica ──
    console.log('6 · Modo producción simulado');
    const [ID2, V2] = versionNueva('terminos', `Otra prueba ${TAG}`); nuestras.push(ID2);
    sql(`update platform_config set value = '"produccion"' where key = 'entorno'`);
    await pa.goto(`${B}/admin/textos/paginas?k=terminos&j=us`); await pa.getByText(new RegExp(`^Versión ${V2} · `)).first().waitFor();
    ok(/Producción: una página legal se publica solo revisada por el abogado/.test(await texto(pa)), 'el Super Admin avisa que es producción');
    await enVersion(pa, V2, 'Publicar').click(); await t(pa, 'No').click(); await pa.locator('textarea').last().fill(`Sin revisión ${TAG}`); await t(pa, 'Publicar').click();
    await pa.getByText('En producción, una página legal se publica solo revisada por el abogado.').first().waitFor();
    ok(sql(`select status from legal_pages where id = ${ID2}`) === 'borrador', `publicar la versión ${V2} sin revisión → rechazado; sigue en borrador`);
    ok(/legal_revisado/.test(sqlErr(`update legal_pages set status = 'publicado', published_by = '${uid(ADM)}', published_at = now(), publish_reason = 'prueba' where id = ${ID2}`)), 'la base también lo rechaza');
    await pa.goto(B + '/cookies'); ok(sql(`select count(*) from legal_pages where key = 'cookies' and status = 'publicado'`) !== '0' || /Esta página se está revisando/.test(await texto(pa)), 'en producción un borrador no se muestra');
    // Con la revisión del abogado, sí.
    await pa.goto(`${B}/admin/textos/paginas?k=terminos&j=us`); await enVersion(pa, V2, 'Marcar revisada').click();
    await pa.locator('input[aria-label^="DESPACHO QUE LA REVISÓ"]').fill('Despacho de Prueba'); await pa.locator('textarea').last().fill(`Revisión de prueba ${TAG}`); await t(pa, 'Marcar revisada').click();
    await pa.getByText(/Marcada como revisada por el abogado/).first().waitFor();
    await pa.getByText(/revisada por Despacho de Prueba el /).first().waitFor(); // la lista ya se volvió a pintar (sin «Marcar revisada»): los botones no se mueven bajo el clic
    await enVersion(pa, V2, 'Publicar').click(); await t(pa, 'No').click(); await pa.locator('textarea').last().fill(`Revisada ${TAG}`); await t(pa, 'Publicar').click();
    await pa.getByText(/^Publicada\. Quedó en el historial\./).first().waitFor();
    await pa.getByText(new RegExp(`^Versión ${V2} · `)).first().waitFor(); await pa.locator('text=/publicada .* por /').first().waitFor();
    ok(sql(`select status || '|' || reviewed_by_counsel from legal_pages where id = ${ID2}`) === 'publicado|Despacho de Prueba', 'revisada por el abogado → se publica en producción');
    sql(`update platform_config set value = '"pruebas"' where key = 'entorno'`);

    // ── 7 · Retirar (con motivo, desde el Super Admin) ──
    await enVersion(pa, V2, 'Retirar').click(); await pa.locator('textarea').last().fill(`Fin de la prueba ${TAG}`); await t(pa, 'Retirar').click();
    await pa.getByText(/^Retirada\./).first().waitFor();
    ok(sql(`select status from legal_pages where id = ${ID2}`) === 'retirado' && sql(`select count(*) from legal_pages where id = ${ID2}`) === '1', 'retirar: queda «retirado», nada se borra');
  } catch (e) {
    // Lo que mostraba cada pantalla cuando falló (a la salida de la corrida, nunca al repo).
    for (const [i, p] of abiertas.entries()) await p.screenshot({ path: OUT + `l9e-fallo-${i}.png`, fullPage: true }).catch(() => {});
    throw e;
  } finally {
    try { sql(`update platform_config set value = '"pruebas"' where key = 'entorno'`); } catch {}
    for (const id of nuestras) try { sql(`update legal_pages set status = 'retirado' where id = ${id} and status <> 'retirado'`); } catch {}
    try { for (const h of JSON.parse(horas)) sql(`update business_hours set open = ${h.o}, ranges = '${JSON.stringify(h.r)}'::jsonb where business_id = '${BIZ}' and module = '' and weekday = ${h.w}`); } catch {}
    try { sql(`update operations set status = 'cancelled' where user_id in (select id from users where first_name = 'Vecina' and last_name = 'Legal') and status in ('pending', 'accepted')`); } catch {}
    await b.close();
  }
  console.log(`\nleg9e: ${n} ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
