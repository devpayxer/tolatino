// 9f · Super Admin › Textos y páginas completo (fase9-apertura.md §4 9f): editar una cadena en Cadenas → el vecino la ve al instante (sin sesión, en español y en
// inglés) y la base guarda su versión con quién y por qué; una línea fija (911, las de §1c) no se puede editar (pantalla y base); las marcas {…} y el largo
// máximo se respetan; volver al código y dejar en borrador; el inglés revisado; Rótulos por categoría; Home por ciudad (el aviso, un bloque apagado y su orden,
// en Hazleton y en Allentown) y Anuncios con fechas (vivo, próximo, vencido, retirado, solo vecinos); si la base no responde, la pantalla sale con el texto del
// código (sin cortar); el Super Admin en inglés (Ayuda, Páginas, Cadenas, Rótulos, Home) con el idioma de quien lo usa; Solo lectura no edita; el pie de la web
// en todas las páginas detrás de su interruptor; «Cuenta borrada» / «Deleted account» en el panel de Pedidos. Teléfono 390 y escritorio 1360.
// Precondiciones propias: las cadenas indexadas (corre el indexador si faltan), la base dice «pruebas», una limpieza de lo que dejó una corrida anterior,
// cuentas nuevas con teléfonos 555 libres. Lo que la prueba cambia vuelve a como estaba al terminar (nada se borra: los anuncios se retiran, las cadenas
// vuelven al código). Nada depende de otra prueba ni de la hora del día (los anuncios se arman con «ahora» y no con un reloj fijo).
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, telLibre, equipo } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr ?? e.message); } };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const RUN = Date.now().toString(36), TAG = `c9f${RUN}`;
const ADM = '5705550199', LUCIA = '5705550693', DUENO = '5705550133', BIZ = 'sabor-dominicano';
const ctxTel = (b, extra = {}) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });
const ctxDesk = (b, extra = {}) => b.newContext({ viewport: { width: 1360, height: 900 }, ...extra });
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `c9f-${nom}.png`, fullPage: full });
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const enLang = (b, tipo = ctxDesk) => tipo(b, {}).then(async (c) => { await c.addCookies([{ name: 'tl_lang', value: 'en', url: B }]); return c; });
// «Ahora» en la hora de Hazleton, como la escribe el formulario de anuncios (AAAA-MM-DD HH:MM), movido por horas.
const ny = (horas) => sql(`select to_char((now() + interval '${horas} hours') at time zone 'America/New_York', 'YYYY-MM-DD HH24:MI')`);
// Limpieza de lo que dejó una corrida anterior (y la de esta al terminar): cadenas al código, el Inicio sin cambios, anuncios de prueba retirados, el pie apagado.
const limpiar = () => {
  const A = uid(ADM);
  sql(`select set_config('tl.cms_por', '${A}', false), set_config('tl.cms_motivo', 'limpieza cms9f', false); update cms_strings set text = code_text, status = 'vivo' where edited and not locked`);
  sql(`update cms_strings set en_state = case when text->>'es' <> text->>'en' then 'traducido' else 'pendiente' end where id = 'APP-HOME.comunidadSub' and en_state = 'revisado'`);
  sql(`update city_home_config set notice = null, blocks = '[]'::jsonb where city_id in ('hzl', 'alw')`);
  sql(`update announcements set retired_at = now(), retired_by = '${A}', retired_reason = 'limpieza cms9f' where retired_at is null and text->>'es' like '%[c9f%'`);
  sql(`update feature_flags set enabled = false where key = 'web.pie_todas'`);
  sql(`update cities set status = 'soon' where id = 'alw'`);
};
const motivo = async (p, texto = 'Prueba cms9f') => { await p.locator('textarea').last().fill(`${texto} ${RUN}`); };
const toast = (p, re) => p.getByRole('status').filter({ hasText: re }).first().waitFor({ timeout: 8000 });

(async () => {
  // ── Precondiciones propias ──
  sql(`insert into platform_config (key, value, note, updated_by) values ('entorno', '"pruebas"'::jsonb, 'Sandbox (cms9f)', 'semilla') on conflict (key) do update set value = excluded.value`);
  const catalogo = JSON.parse(require('fs').readFileSync(ENT.RAIZ + '/apps/web/lib/cms-cadenas.json', 'utf8')).cadenas;
  if (Number(sql(`select count(*) from cms_strings`)) < catalogo.length)
    execSync(`node ${ENT.RAIZ}/scripts/cms/indexar.mjs | docker exec -i ${ENT.DB} psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U tolatino -d tolatino -qAt`, { stdio: ['pipe', 'pipe', 'pipe'] });
  equipo(LUCIA);
  limpiar();
  const b = await chromium.launch();
  const abiertas = [];
  try {
    // ── 1 · Cadenas: editar una y verla al instante ──
    console.log('1 · Cadenas: editar → el vecino la ve al instante (ES y EN, sin sesión), con su versión y su auditoría');
    const ca = await ctxDesk(b), pa = await ca.newPage(); abiertas.push(ca); await entrarComo(pa, ADM);
    const UA = uid(ADM);
    await pa.goto(B + '/admin/textos/cadenas');
    ok(/Textos y páginas/.test(await texto(pa)) && /CADENAS \d+/.test(await texto(pa)) && /22 fijas|\d+ fijas/.test(await texto(pa)), 'Cadenas: las cifras y las pestañas (Ayuda, Páginas, Cadenas, Rótulos, Home por ciudad)');
    for (const pest of ['Ayuda', 'Páginas', 'Cadenas', 'Rótulos', 'Home por ciudad']) ok(await pa.getByText(pest, { exact: true }).count() > 0, `la pestaña «${pest}»`);
    await shot(pa, 'cadenas-1360', false);
    await pa.goto(B + '/admin/textos/cadenas?q=APP-HOME.comunidad');
    await pa.getByText('APP-HOME.comunidad', { exact: true }).first().waitFor();
    const v0 = Number(sql(`select version from cms_strings where id = 'APP-HOME.comunidad'`));
    ok(sql(`select edited::text from cms_strings where id = 'APP-HOME.comunidad'`) === 'false', 'antes: sin editar (versión ' + v0 + ')');
    await pa.getByText('Editar', { exact: true }).first().click();
    await pa.locator('textarea').first().waitFor();
    await pa.locator('textarea').nth(0).fill(`Comunidad ${TAG}`); await pa.locator('textarea').nth(1).fill(`Community ${TAG}`);
    await motivo(pa, 'Tono de la marca cms9f');
    await pa.getByText('Guardar el texto', { exact: true }).last().click();
    await toast(pa, /Los vecinos ya lo ven/);
    ok(sql(`select edited::text || '|' || version || '|' || en_state || '|' || (updated_by = '${UA}') from cms_strings where id = 'APP-HOME.comunidad'`) === `true|${v0 + 1}|traducido|true`, 'la base: editada, una versión más, el inglés «traducido», con quién');
    ok(sql(`select reason || '|' || (by = '${UA}') || '|' || (text->>'es') from cms_string_versions where string_id = 'APP-HOME.comunidad' and version = ${v0 + 1}`) === `Tono de la marca cms9f ${RUN}|true|Comunidad ${TAG}`, 'la versión nueva queda con su motivo y quién la hizo (la escribe la base)');
    ok(sql(`select count(*) from audit_entries where action = 'cms.editar' and target_id = 'APP-HOME.comunidad' and actor_id = '${UA}' and reason = 'Tono de la marca cms9f ${RUN}'`) === '1', 'la auditoría: quién, antes → después y el motivo');
    const pub = await ctxDesk(b), pp = await pub.newPage(); abiertas.push(pub);
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok((await texto(pp)).includes(`Comunidad ${TAG}`), 'el vecino sin sesión lo ve al instante en el Inicio (ES)');
    const pubEn = await enLang(b), pe = await pubEn.newPage(); abiertas.push(pubEn);
    await pe.goto(B + '/'); await pe.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok((await texto(pe)).includes(`Community ${TAG}`) && !(await texto(pe)).includes(`Comunidad ${TAG}`), 'y en inglés ve el inglés');
    const tel = await ctxTel(b), pt = await tel.newPage(); abiertas.push(tel);
    await pt.goto(B + '/'); await pt.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok((await texto(pt)).includes(`Comunidad ${TAG}`), 'en el teléfono (390) también'); await shot(pt, 'inicio-editada-390');

    // La base no responde: la pantalla sale con el texto del código (sin cortar).
    console.log('1b · Si la base de cadenas no responde, el Inicio sale igual con el texto del código');
    try {
      sql(`alter table cms_strings rename to cms_strings_fuera`); sql(`select pg_notify('tl_config', 'prueba')`);
      await new Promise((r) => setTimeout(r, 600));
      const r = await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
      const t = await texto(pp);
      ok(r.status() === 200 && /Comunidad/.test(t) && !t.includes(TAG), 'sin la tabla de cadenas: 200 y el texto del código («Comunidad»)');
    } finally { sql(`alter table cms_strings_fuera rename to cms_strings`); sql(`select pg_notify('tl_config', 'prueba')`); }
    await new Promise((r) => setTimeout(r, 600));
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok((await texto(pp)).includes(`Comunidad ${TAG}`), 'y al volver la tabla, otra vez la editada');

    // Dejar en borrador / publicar / volver al código; el historial.
    console.log('1c · Borrador, publicar, volver al código y el historial');
    await pa.goto(B + '/admin/textos/cadenas?q=APP-HOME.comunidad&estado=editadas');
    await pa.getByText('Dejar en borrador', { exact: true }).first().click(); await motivo(pa, 'Revisión cms9f'); await pa.getByText('Dejar en borrador', { exact: true }).last().click();
    await toast(pa, /Listo/);
    ok(sql(`select status from cms_strings where id = 'APP-HOME.comunidad'`) === 'borrador', 'en borrador: la edición se guarda');
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok(!(await texto(pp)).includes(TAG), 'en borrador el vecino ve el texto del código');
    await pa.goto(B + '/admin/textos/cadenas?q=APP-HOME.comunidad&estado=editadas');
    await pa.getByText('Publicar', { exact: true }).first().click(); await motivo(pa, 'Revisión cms9f'); await pa.getByText('Publicar', { exact: true }).last().click();
    await toast(pa, /Listo/);
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok((await texto(pp)).includes(`Comunidad ${TAG}`), 'publicada otra vez: el vecino la ve');
    await pa.goto(B + '/admin/textos/cadenas?q=APP-HOME.comunidad&estado=editadas');
    await pa.getByText('Volver al código', { exact: true }).first().click(); await motivo(pa, 'La edición no gustó cms9f'); await pa.getByText('Volver al código', { exact: true }).last().click();
    await toast(pa, /Listo/);
    ok(sql(`select edited::text || '|' || (text = code_text) from cms_strings where id = 'APP-HOME.comunidad'`) === 'false|true', 'volver al código: el texto es el del código y ya no cuenta como editada');
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok(!(await texto(pp)).includes(TAG), 'el vecino ve el del código');
    ok(Number(sql(`select count(*) from cms_string_versions where string_id = 'APP-HOME.comunidad'`)) >= 5, 'cada paso quedó como versión (nada se borra)');
    await pa.goto(B + '/admin/textos/cadenas?h=APP-HOME.comunidad');
    await pa.getByText('Historial', { exact: true }).first().waitFor();
    ok(/Revisión cms9f/.test(await texto(pa)) && /La edición no gustó cms9f/.test(await texto(pa)) && /Tono de la marca cms9f/.test(await texto(pa)), 'el historial muestra cada versión con su motivo');

    // ── 2 · Las líneas fijas no se editan ──
    console.log('2 · Líneas fijas: sin botón de editar y la base las rechaza');
    await pa.goto(B + '/admin/textos/cadenas?estado=fijas');
    await pa.getByText('LÍNEA FIJA', { exact: true }).first().waitFor();
    ok(await pa.getByText('Editar', { exact: true }).count() === 0, 'en «Líneas fijas» no hay ningún botón Editar');
    ok(Number(sql(`select count(*) from cms_strings where locked`)) >= 22 && sql(`select count(*) from cms_strings where id like 'FIJAS-1C.%' and locked`) === '6', 'las seis de §1c y las de las categorías tienen candado');
    ok(/911/.test(sql(`select text->>'es' from cms_strings where id = 'NEG-CATEGORIA.NEG-SALUD.linea' and locked`)) && /Nadie te garantiza un resultado/.test(sql(`select text->>'es' from cms_strings where id = 'NEG-CATEGORIA.NEG-PRO.linea' and locked`)), '911 y «Nadie te garantiza un resultado» con candado');
    const intento = (q) => sqlErr(`select set_config('tl.cms_por', '${UA}', false), set_config('tl.cms_motivo', 'intento cms9f', false); ${q}`);
    ok(/cms_linea_fija/.test(intento(`update cms_strings set text = jsonb_build_object('es', 'x', 'en', 'y') where id = 'NEG-CATEGORIA.NEG-SALUD.linea'`)), 'la base rechaza editar la línea del 911');
    ok(/cms_linea_fija/.test(intento(`update cms_strings set status = 'borrador' where id = 'FIJAS-1C.exportar'`)), 'ni dejarla en borrador');
    ok(/cms_codigo|cms_linea_fija/.test(intento(`update cms_strings set locked = false where id = 'FIJAS-1C.exportar'`)), 'ni quitarle el candado');
    ok(/cms_sin_autor/.test(sqlErr(`update cms_strings set text = jsonb_build_object('es', 'x', 'en', 'y') where id = 'APP-HOME.hoy'`)), 'un cambio de texto sin autor y motivo se rechaza');
    ok(/solo de inserción/.test(sqlErr(`delete from cms_string_versions`)) && /solo de inserción/.test(sqlErr(`update cms_string_versions set reason = 'x'`)), 'las versiones son de solo inserción');
    { const r = await ctxDesk(b), p = await r.newPage(); abiertas.push(r); const rs = await p.goto(B + '/c/doctores'); ok(rs.status() === 200 && sql(`select text->>'es' from cms_strings where id = 'NEG-CATEGORIA.NEG-SALUD.linea'`) === sql(`select fixed_line->>'es' from categories where id = 'NEG-SALUD'`), 'Doctores sigue sirviendo y su línea fija de la base es la de la categoría'); }

    // ── 3 · Marcas {…}, largo máximo y el inglés revisado ──
    console.log('3 · Marcas, largo máximo e inglés revisado');
    await pa.goto(B + '/admin/textos/cadenas?q=WEB-FICHA.photosN');
    await pa.getByText('WEB-FICHA.photosN', { exact: true }).first().waitFor();
    const antes = sql(`select text::text from cms_strings where id = 'WEB-FICHA.photosN'`);
    await pa.getByText('Editar', { exact: true }).first().click(); await pa.locator('textarea').first().waitFor();
    await pa.locator('textarea').nth(0).fill('Ver las fotos'); await motivo(pa, 'Prueba de marcas cms9f'); await pa.getByText('Guardar el texto', { exact: true }).last().click();
    await pa.getByText(/Conserva las marcas/).first().waitFor({ timeout: 8000 });
    ok(sql(`select text::text from cms_strings where id = 'WEB-FICHA.photosN'`) === antes, 'quitar la marca {n}: lo rechaza la pantalla y no cambia nada');
    ok(/cms_marcas/.test(intento(`update cms_strings set text = jsonb_build_object('es', 'Ver las fotos', 'en', 'See {n} photos') where id = 'WEB-FICHA.photosN'`)), 'la base también lo rechaza (cms_marcas)');
    await pa.goto(B + '/admin/textos/cadenas?q=APP-HOME.entrar');
    await pa.getByText('Editar', { exact: true }).first().click(); await pa.locator('textarea').first().waitFor();
    const max = Number(sql(`select max_len from cms_strings where id = 'APP-HOME.entrar'`));
    await pa.locator('textarea').nth(0).fill('x'.repeat(max + 5));
    ok((await texto(pa)).includes(`${max}/${max}`) && (await pa.locator('textarea').nth(0).inputValue()).length === max, `la pantalla no deja escribir más de ${max} caracteres (su largo máximo) y lo cuenta`);
    await pa.getByText('Volver', { exact: true }).last().click();
    ok(sql(`select edited::text from cms_strings where id = 'APP-HOME.entrar'`) === 'false', 'sin guardar nada');
    ok(/cms_largo/.test(intento(`update cms_strings set text = jsonb_build_object('es', repeat('x', ${max + 1}), 'en', 'y') where id = 'APP-HOME.entrar'`)), 'la base también lo rechaza (cms_largo)');
    ok(/cms_vacia/.test(intento(`update cms_strings set text = jsonb_build_object('es', '', 'en', 'y') where id = 'APP-HOME.entrar'`)), 'y un idioma vacío (cms_vacia)');
    await pa.goto(B + '/admin/textos/cadenas?q=APP-HOME.comunidadSub');
    await pa.getByText('Inglés revisado', { exact: true }).first().click(); await motivo(pa, 'Lo leí cms9f'); await pa.getByText('Marcar revisado', { exact: true }).last().click();
    await toast(pa, /Listo/);
    ok(sql(`select en_state from cms_strings where id = 'APP-HOME.comunidadSub'`) === 'revisado' && sql(`select count(*) from audit_entries where action = 'cms.ingles' and target_id = 'APP-HOME.comunidadSub' and actor_id = '${UA}' and reason like '%${RUN}'`) === '1', 'el inglés revisado: queda marcado y en la auditoría');

    // ── 4 · Rótulos por categoría ──
    console.log('4 · Rótulos por categoría');
    await pa.goto(B + '/admin/textos/rotulos');
    await pa.getByText(/^\d+ CATEGORÍAS$/).first().waitFor();
    ok(/Si es una emergencia, llama al 911/.test(await texto(pa)) && /LÍNEA FIJA/.test(await texto(pa)), 'Rótulos: la línea fija de cada categoría con su candado');
    const nombreAntes = sql(`select name->>'en' from categories where id = 'NEG-BELL'`);
    const iBell = Number(sql(`select count(*) from categories where status = 'on' and sort < (select sort from categories where id = 'NEG-BELL')`));
    await pa.getByText('Editar nombre', { exact: true }).nth(iBell).click();
    await pa.locator('textarea, input').first().waitFor();
    const campos = pa.locator('input[type=text], input:not([type]), textarea');
    await campos.nth(1).fill(`Beauty ${TAG}`); await motivo(pa, 'Más claro cms9f'); await pa.getByText('Guardar el rótulo', { exact: true }).last().click();
    await toast(pa, /Los vecinos ya lo ven/);
    ok(sql(`select name->>'en' from categories where id = 'NEG-BELL'`) === `Beauty ${TAG}` && sql(`select count(*) from audit_entries where action = 'cms.rotulo' and target_id = 'NEG-BELL.name' and actor_id = '${UA}' and reason like '%${RUN}'`) === '1', 'el rótulo cambió y quedó en la auditoría');
    await pe.goto(B + '/negocios'); ok((await texto(pe)).includes(`Beauty ${TAG}`), 'el vecino lo ve en inglés en Negocios');
    sql(`update categories set name = jsonb_set(name, '{en}', to_jsonb('${nombreAntes.replace(/'/g, "''")}'::text)) where id = 'NEG-BELL'`);

    // ── 5 · Home por ciudad: aviso, bloques y orden ──
    console.log('5 · Home por ciudad: el aviso, un bloque apagado y su orden');
    await pa.goto(B + '/admin/textos/home?c=hzl');
    await pa.locator('[data-home-ciudad="hzl"]').waitFor();
    ok(await pa.getByRole('switch').count() === 6, 'seis bloques: categorías, Hoy en el barrio, Abierto ahora, Esta semana, Comunidad y Publica tu negocio');
    await pa.locator('textarea, input').nth(0).fill(`Aviso ${TAG}`); await pa.locator('textarea, input').nth(1).fill(`Notice ${TAG}`);
    await pa.getByRole('switch', { name: 'Comunidad' }).click();
    await pa.getByText('Guardar el Inicio de la ciudad', { exact: true }).first().click(); await motivo(pa, 'Menos ruido cms9f'); await pa.getByText('Guardar', { exact: true }).last().click();
    await toast(pa, /Listo/);
    ok(sql(`select (notice->>'es') || '|' || (select (e->>'on') from jsonb_array_elements(blocks) e where e->>'key' = 'comunidad') from city_home_config where city_id = 'hzl'`) === `Aviso ${TAG}|false`, 'la base: el aviso y Comunidad apagada');
    ok(sql(`select count(*) from audit_entries where action = 'cms.home' and target_id = 'hzl' and actor_id = '${UA}' and reason = 'Menos ruido cms9f ${RUN}'`) === '1', 'la auditoría del Inicio');
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok(await pp.locator('[data-aviso-ciudad]').count() === 1 && (await pp.locator('[data-aviso-ciudad]').innerText()).includes(`Aviso ${TAG}`), 'el Inicio de Hazleton muestra el aviso');
    ok(await pp.locator('[data-bloque="comunidad"]').count() === 0 && await pp.locator('[data-bloque="publica"]').count() === 1, 'Comunidad apagada ya no sale; Publica tu negocio sigue');
    await pe.goto(B + '/'); await pe.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok((await pe.locator('[data-aviso-ciudad]').innerText()).includes(`Notice ${TAG}`), 'y en inglés, el aviso en inglés');
    await shot(pp, 'inicio-config-1360', false);
    // Orden: Comunidad otra vez encendida y dos lugares más arriba.
    await pa.goto(B + '/admin/textos/home?c=hzl'); await pa.locator('[data-home-ciudad="hzl"]').waitFor();
    await pa.getByRole('switch', { name: 'Comunidad' }).click();
    for (const k of [3, 2, 1]) await pa.getByText('Subir', { exact: true }).nth(k).click();
    await pa.getByText('Guardar el Inicio de la ciudad', { exact: true }).first().click(); await motivo(pa, 'Orden cms9f'); await pa.getByText('Guardar', { exact: true }).last().click();
    await toast(pa, /Listo/);
    ok(sql(`select string_agg(e->>'key', ',' order by o) from city_home_config, jsonb_array_elements(blocks) with ordinality as t(e, o) where city_id = 'hzl'`) === 'categorias,comunidad,hoy,abierto,semana,publica', 'el orden queda guardado');
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    const orden = await pp.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-bloque]')].map((e) => [e.getAttribute('data-bloque'), getComputedStyle(e).order])));
    ok(orden.comunidad === '2' && orden.publica === '99', `en el Inicio Comunidad ocupa el lugar 2 (order ${orden.comunidad}) y Publica queda al final`);
    // Teléfono: categorías apagadas.
    await pa.goto(B + '/admin/textos/home?c=hzl'); await pa.locator('[data-home-ciudad="hzl"]').waitFor();
    await pa.getByRole('switch', { name: 'Categorías' }).click();
    await pa.getByText('Guardar el Inicio de la ciudad', { exact: true }).first().click(); await motivo(pa, 'Sin categorías cms9f'); await pa.getByText('Guardar', { exact: true }).last().click();
    await toast(pa, /Listo/);
    await pt.goto(B + '/'); await pt.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok(await pt.locator('[data-bloque="categorias-movil"]').count() === 0, 'en el teléfono (390), sin el mosaico de categorías'); await shot(pt, 'inicio-sin-categorias-390');
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok(await pp.locator('[data-bloque="categorias"]').count() === 0, 'y en escritorio, sin la columna de categorías');

    // Allentown: otra ciudad, con un bloque apagado, y Hazleton sin tocar.
    console.log('5b · Allentown: su Inicio con un bloque apagado; el de Hazleton no cambia');
    sql(`update cities set status = 'on' where id = 'alw'`);
    await pa.goto(B + '/admin/textos/home?c=alw'); await pa.locator('[data-home-ciudad="alw"]').waitFor();
    ok(/Allentown abre pronto/.test(await texto(pa)), 'la lista de Anuncios de Allentown trae el de la semilla');
    await pa.getByRole('switch', { name: 'Publica tu negocio' }).click();
    await pa.getByText('Guardar el Inicio de la ciudad', { exact: true }).first().click(); await motivo(pa, 'Allentown cms9f'); await pa.getByText('Guardar', { exact: true }).last().click();
    await toast(pa, /Listo/);
    const calw = await ctxDesk(b); await calw.addCookies([{ name: 'tl_loc', value: 'alw|alw-centro|5', url: B }]); abiertas.push(calw);
    const palw = await calw.newPage(); await palw.goto(B + '/'); await palw.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok(await palw.locator('[data-bloque="publica"]').count() === 0 && await palw.locator('[data-bloque="categorias"]').count() === 1, 'Allentown: sin Publica tu negocio y con sus categorías');
    ok(await palw.locator('[data-anuncio]').count() === 1 && (await palw.locator('[data-anuncio]').innerText()).includes('Allentown abre pronto'), 'Allentown: el anuncio vivo de la semilla');
    ok(await pp.locator('[data-bloque="publica"]').count() === 1, 'Hazleton conserva Publica tu negocio');
    sql(`update cities set status = 'soon' where id = 'alw'`);

    // ── 6 · Anuncios con fechas ──
    console.log('6 · Anuncios: vivo, próximo, vencido, retirado y solo vecinos');
    await pa.goto(B + '/admin/textos/home?c=hzl'); await pa.locator('[data-home-ciudad="hzl"]').waitFor();
    ok(/Feria del barrio, ya pasó/.test(await texto(pa)) && /VENCIDO/.test(await texto(pa)), 'el anuncio vencido de la semilla sale como VENCIDO');
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok(!(await texto(pp)).includes('Feria del barrio') && await pp.locator('[data-anuncio]').count() === 0, 'el vencido no sale en el Inicio');
    await pa.getByText('TEXTO EN ESPAÑOL', { exact: true }).waitFor();
    const campos2 = pa.locator('textarea, input');
    const tot = await campos2.count();
    await campos2.nth(tot - 4).fill(`Anuncio vivo [c9f ${RUN}]`); await campos2.nth(tot - 3).fill(`Live announcement [c9f ${RUN}]`);
    await campos2.nth(tot - 2).fill(ny(-24)); await campos2.nth(tot - 1).fill(ny(24));
    await pa.getByText('Crear el anuncio', { exact: true }).first().click(); await motivo(pa, 'Evento del barrio cms9f'); await pa.getByText('Crear', { exact: true }).last().click();
    await toast(pa, /Saldrá en el Inicio/);
    const AID = sql(`select id from announcements where text->>'es' = 'Anuncio vivo [c9f ${RUN}]'`);
    ok(AID && sql(`select (by_staff_id = '${UA}') || '|' || audience from announcements where id = ${AID}`) === 'true|todos' && sql(`select count(*) from audit_entries where action = 'cms.anuncio' and target_id = '${AID}'`) === '1', 'creado por la pantalla, con quién, para todos y en la auditoría');
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok(await pp.locator(`[data-anuncio="${AID}"]`).count() === 1 && (await pp.locator(`[data-anuncio="${AID}"]`).innerText()).includes(`Anuncio vivo [c9f ${RUN}]`), 'el Inicio de Hazleton muestra el anuncio (ES)');
    await pe.goto(B + '/'); await pe.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok((await pe.locator(`[data-anuncio="${AID}"]`).innerText()).includes(`Live announcement [c9f ${RUN}]`), 'y en inglés, en inglés'); await shot(pt, 'anuncio-390', false);
    await pt.goto(B + '/'); await pt.locator('[data-pantalla="APP-HOME"]').waitFor(); ok(await pt.locator(`[data-anuncio="${AID}"]`).count() === 1, 'y en el teléfono (390)'); await shot(pt, 'anuncio-390');
    const nuevo = (txt, desde, hasta, aud = 'todos') => sql(`insert into announcements (city_id, audience, text, from_at, to_at, by_staff_id) values ('hzl', '${aud}', jsonb_build_object('es', '${txt} [c9f ${RUN}]', 'en', '${txt} en [c9f ${RUN}]'), now() + interval '${desde} hours', now() + interval '${hasta} hours', '${UA}') returning id`).split('\n')[0];
    const Pro = nuevo('Anuncio próximo', 2, 30), Ven = nuevo('Anuncio vencido', -30, -2), Vec = nuevo('Anuncio vecinos', -2, 30, 'vecinos');
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok(await pp.locator(`[data-anuncio="${Pro}"], [data-anuncio="${Ven}"], [data-anuncio="${Vec}"]`).count() === 0, 'sin sesión: ni el próximo, ni el vencido, ni el de «solo vecinos»');
    const vecina = await ctxDesk(b), pv = await vecina.newPage(); abiertas.push(vecina); const V = telLibre(); await entrarComo(pv, V, { nombre: 'Vecina', apellido: 'Anuncio' });
    sql(`update users set home_city_id = 'hzl', is_test = true where id = '${uid(V)}'`);
    await pv.goto(B + '/'); await pv.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok(await pv.locator(`[data-anuncio="${Vec}"]`).count() === 1 && await pv.locator(`[data-anuncio="${AID}"]`).count() === 1 && await pv.locator(`[data-anuncio="${Pro}"]`).count() === 0, 'con sesión: el de «solo vecinos» y el vivo; el próximo todavía no');
    ok(/solo de inserción|no se edita|no se borra/.test(sqlErr(`update announcements set text = jsonb_build_object('es', 'x', 'en', 'y') where id = ${AID}`)) && /no se borra/.test(sqlErr(`delete from announcements where id = ${AID}`)), 'un anuncio no se edita ni se borra (la base)');
    ok(/announcements_check|violates check/.test(sqlErr(`insert into announcements (city_id, text, from_at, to_at, by_staff_id) values ('hzl', '{"es":"a","en":"b"}', now(), now() + interval '40 days', '${UA}')`)), 'más de 31 días se rechaza');
    await pa.goto(B + '/admin/textos/home?c=hzl'); await pa.locator('[data-home-ciudad="hzl"]').waitFor();
    ok(/PRÓXIMO/.test(await texto(pa)) && /VIVO/.test(await texto(pa)), 'la lista marca VIVO y PRÓXIMO');
    const iAn = Number(sql(`select count(*) from announcements where city_id = 'hzl' and retired_at is null and to_at > now() and (to_at, id) > (select to_at, id from announcements where id = ${AID})`));
    await pa.getByText('Retirar', { exact: true }).nth(iAn).click();
    await motivo(pa, 'Ya no aplica cms9f'); await pa.getByText('Retirar', { exact: true }).last().click(); await toast(pa, /Retirado/);
    ok(sql(`select (retired_by = '${UA}') || '|' || retired_reason from announcements where id = ${AID}`) === `true|Ya no aplica cms9f ${RUN}` && sql(`select count(*) from audit_entries where action = 'cms.anuncio.retirar' and target_id = '${AID}'`) === '1', 'retirado: quién, por qué y la auditoría (nada se borra)');
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok(await pp.locator(`[data-anuncio="${AID}"]`).count() === 0, 'el retirado ya no sale');

    // ── 7 · El Super Admin en inglés ──
    console.log('7 · Super Admin › Textos y páginas en inglés (con el idioma de quien lo usa)');
    await pa.goto(B + '/admin/textos/paginas');
    await pa.getByText('English', { exact: true }).first().click(); await pa.getByText('Copy and pages', { exact: true }).first().waitFor();
    for (const [ruta, esperado] of [['/admin/textos', ['IN USE', 'PAUSED', 'Help', 'Pages']], ['/admin/textos/paginas', ['PUBLISHED', 'DRAFTS', 'REVIEWED', 'ACCEPTANCES', 'WEB FOOTER', 'PAGES']], ['/admin/textos/cadenas', ['STRINGS', 'ENGLISH PENDING', 'TRANSLATED', 'SCREEN']], ['/admin/textos/rotulos', ['CATEGORIES', 'FIXED LINE', 'Edit name']], ['/admin/textos/home?c=hzl', ['HOME BLOCKS', 'ANNOUNCEMENTS', 'Save the city Home']]]) {
      await pa.goto(B + ruta); await pa.getByText('Copy and pages', { exact: true }).first().waitFor(); const t = await texto(pa);
      ok(esperado.every((x) => t.includes(x)), `${ruta}: en inglés (${esperado.join(', ')})`);
    }
    await pa.goto(B + '/admin/textos/paginas?k=terminos&j=us'); await pa.getByText(/^Version \d+ · /).first().waitFor();
    ok(/Differences with|text dated|without the lawyer’s review|HISTORY/.test(await texto(pa)), 'Páginas › una página en inglés: versiones e historial');
    await shot(pa, 'paginas-en-1360', false);
    await pa.goto(B + '/admin/textos/paginas'); await pa.getByText('Español', { exact: true }).first().click(); await pa.getByText('Copy and pages', { exact: true }).waitFor({ state: 'detached', timeout: 8000 });
    await pa.goto(B + '/admin/textos/paginas?k=terminos&j=us');
    ok(/Versión \d+/.test(await texto(pa)), 'y otra vez en español al volver');

    // ── 8 · Solo lectura no edita ──
    console.log('8 · Quien no tiene Textos y páginas (Solo lectura) no entra a ninguna pestaña nueva');
    const cl = await ctxDesk(b), pl = await cl.newPage(); abiertas.push(cl); await entrarComo(pl, LUCIA);
    for (const r of ['/admin/textos/cadenas', '/admin/textos/rotulos', '/admin/textos/home', '/admin/textos/paginas', '/admin/textos']) {
      await pl.goto(B + r); await pl.waitForLoadState('networkidle'); const t = await texto(pl);
      ok(/\/admin\?sin=cms%3Aver/.test(pl.url()) && !/IDIOMA DEL ADMIN|ADMIN LANGUAGE/.test(t), `${r}: sin acceso (lo manda a /admin?sin=cms:ver y no ve el editor)`);
    }
    ok(sql(`select count(*) from role_permissions where role <> 'admin' and section = 'cms' and allowed`) === '0', 'solo el rol Admin tiene Textos y páginas (la base)');

    // ── 9 · El pie de la web en todas las páginas ──
    console.log('9 · El pie de la web bajo el Inicio, la ficha y Buscar (detrás de su interruptor)');
    const rutasPie = ['/', `/n/${BIZ}`, '/buscar?q=pizza'];
    for (const r of rutasPie) { await pp.goto(B + r); await pp.locator('main, [data-pantalla]').first().waitFor(); ok(await pp.locator('[data-pie-web]').count() === 0, `apagado: ${r} sin el pie (las capturas aprobadas no cambian)`); }
    await pa.goto(B + '/admin/textos/paginas'); await pa.getByText('Encender el pie', { exact: true }).first().click();
    await motivo(pa, 'Capturas aprobadas cms9f'); await pa.getByText('Encender', { exact: true }).last().click(); await toast(pa, /Listo/);
    ok(sql(`select enabled::text from feature_flags where key = 'web.pie_todas'`) === 'true' && sql(`select count(*) from audit_entries where action = 'cms.pie' and actor_id = '${UA}' and reason like '%${RUN}'`) === '1', 'encendido: la base y la auditoría');
    for (const r of rutasPie) { await pp.goto(B + r); await pp.locator('[data-pie-web]').waitFor({ timeout: 8000 }); const t = await pp.locator('[data-pie-web]').innerText(); ok(/Términos|Terms/i.test(t) && /Privacidad|Privacy/i.test(t), `encendido: ${r} lleva el pie con Términos y Privacidad`); }
    await shot(pp, 'pie-todas-1360');
    await pa.goto(B + '/admin/textos/paginas'); await pa.getByText('Apagar el pie', { exact: true }).first().click();
    await motivo(pa, 'Volver a lo de antes cms9f'); await pa.getByText('Apagar', { exact: true }).last().click(); await toast(pa, /Listo/);
    await pp.goto(B + '/'); await pp.locator('[data-pantalla="APP-HOME"]').waitFor(); ok(await pp.locator('[data-pie-web]').count() === 0, 'apagado otra vez');

    // ── 10 · «Cuenta borrada» en inglés ──
    console.log('10 · El panel de Pedidos: «Cuenta borrada» / «Deleted account»');
    const C = telLibre(), cc = await ctxTel(b), pc = await cc.newPage(); abiertas.push(cc); await entrarComo(pc, C, { nombre: 'Vecina', apellido: 'Borrada' });
    const UC = uid(C); sql(`update users set home_city_id = 'hzl', is_test = true where id = '${UC}'`);
    const NUM = String(900000000 + Math.floor(Math.random() * 99999999));
    sql(`insert into operations (number, kind, city_id, business_id, user_id, status, mode, pay_mode, client_key, subtotal_cents, total_cents, is_test) values ('${NUM}', 'order', 'hzl', '${BIZ}', '${UC}', 'done', 'pickup', 'none', gen_random_uuid(), 1200, 1200, true)`);
    sql(`update users set first_name = 'Cuenta borrada', last_name = null where id = '${UC}'`);
    const cd = await ctxTel(b), pd = await cd.newPage(); abiertas.push(cd); await entrarComo(pd, DUENO);
    await pd.goto(B + `/panel/${BIZ}/hoy?det=ped:${NUM}`); await pd.getByText(`Pedido #${NUM}`).first().waitFor();
    ok(/CLIENTE Cuenta borrada/.test(await texto(pd)), 'en español: «Cuenta borrada»');
    const cdE = await ctxTel(b); await cdE.addCookies([{ name: 'tl_lang', value: 'en', url: B }]); abiertas.push(cdE); const pdE = await cdE.newPage(); await entrarComo(pdE, DUENO);
    await pdE.goto(B + `/panel/${BIZ}/hoy?det=ped:${NUM}`); await pdE.getByText(`Order #${NUM}`).first().waitFor();
    { const t = await texto(pdE); ok(/CLIENT Deleted account/.test(t) && !t.includes('Cuenta borrada'), 'en inglés: «Deleted account»'); } await shot(pdE, 'cuenta-borrada-en-390');
    sql(`update users set first_name = 'Vecina', last_name = 'Borrada' where id = '${UC}'`);

    console.log(`\ncms9f: ${n} comprobaciones ✓`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close().catch(() => {});
    try { limpiar(); } catch (e) { console.error('limpieza:', e.message); }
  }
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
