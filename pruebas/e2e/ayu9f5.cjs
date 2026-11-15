// 9f-5 · Editar la ayuda desde el Super Admin (Textos y páginas › Ayuda › Editar; 0168). El Admin edita una sección de «correo» con motivo → el vecino la
// ve al instante en el Centro de ayuda; queda en help_edits, en el libro («edited») y en la auditoría; un texto con lenguaje interno, encabezados o HTML no
// entra; desplegar sin cambios en el archivo no pisa lo editado; /api/ayuda/ediciones da el texto de lo público y nunca el de un artículo del equipo;
// «Deshacer» vuelve al texto de antes; cuando el archivo cambia en el repo, manda el repo y la edición se cierra; Solo lectura no entra; el admin en
// inglés. Escritorio 1360 y teléfono 390. Precondiciones propias: la ayuda indexada, cuentas del equipo con teléfonos 555; lo que deja una corrida
// anterior se deshace al empezar (nada se borra: las ediciones se cierran).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, equipo } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const indexar = () => execSync(`cd ${ENT.RAIZ} && node scripts/ayuda/indexar.mjs | docker exec -i ${ENT.DB} psql -U tolatino -d tolatino -qAt -v ON_ERROR_STOP=1`).toString().trim().split('\n').pop();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 250)); } return false; };
const RUN = Date.now().toString(36), MARCA = `ayu9f5 ${RUN}`;
const ADM = '5705550199', LUCIA = '5705550693', S = 'correo', EQ = 'admin-colas';
const ctxTel = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const ctxDesk = (b) => b.newContext({ viewport: { width: 1360, height: 900 } });
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
// Deshace lo que dejó una corrida anterior (cada edición viva de estos dos artículos vuelve al texto de antes; nada se borra).
const limpiar = () => {
  const A = uid(ADM);
  for (const id of sql(`select id from help_edits where slug in ('${S}', '${EQ}') and status = 'viva' order by id desc`).split('\n').filter(Boolean))
    sql(`select ayuda_deshacer(${id}, (select jsonb_build_array(body_old) from help_edits where id = ${id}), '${A}', 'limpieza ayu9f5')`);
};

(async () => {
  if (Number(sql(`select count(*) from help_articles where status <> 'retired'`)) < 100) indexar();
  equipo(LUCIA);
  limpiar();
  const SEC = Number(sql(`select sec from help_chunks where slug = '${S}' and lang = 'es' and heading = 'Preguntas frecuentes' limit 1`));
  const ANTES = sql(`select string_agg(body, E'\\n\\n' order by ord) from help_chunks where slug = '${S}' and lang = 'es' and sec = ${SEC}`);
  ok(Number.isFinite(SEC) && ANTES.length > 20, `precondición: «correo» tiene «Preguntas frecuentes» (sección ${SEC})`);
  const NUEVO = `**¿Para qué sirve mi correo?** Para tus recibos y los avisos que elijas. Texto de prueba ${MARCA}.`;
  const b = await chromium.launch(); const abiertas = [];
  try {
    console.log('1 · El Admin edita una sección con motivo → sale al instante para el vecino');
    const ca = await ctxDesk(b), pa = await ca.newPage(); abiertas.push(ca); await entrarComo(pa, ADM);
    await pa.goto(B + '/admin/textos?q=' + S);
    ok(await espera(async () => (await texto(pa)).includes('Editar')), 'la lista de la ayuda ofrece «Editar»');
    await pa.goto(B + '/admin/textos?ed=' + S);
    ok(await espera(async () => (await texto(pa)).includes('TEXTOS Y PÁGINAS · AYUDA · EDITAR') && (await texto(pa)).includes('Preguntas frecuentes')), 'el editor abre con sus secciones en español');
    ok((await texto(pa)).includes('Sin ediciones: es el texto del repo.'), 'sin ediciones: es el texto del repo');
    await pa.screenshot({ path: OUT + 'e9f5-editor-1360.png', fullPage: true });
    const E0 = +sql(`select count(*) from help_edits where slug = '${S}'`), A0 = +sql(`select count(*) from audit_entries where action = 'ayuda.editar' and target_id = '${S}'`);
    const filas = pa.locator('button, [role=button]').filter({ hasText: /^Editar$/ });
    const secsEs = sql(`select string_agg(distinct sec::text, ',' order by sec::text) from help_chunks where slug = '${S}' and lang = 'es'`).split(',').map(Number).sort((x, y) => x - y);
    await filas.nth(secsEs.indexOf(SEC)).click();
    ok(await espera(async () => (await texto(pa)).includes('TEXTO DE LA SECCIÓN')), 'Editar abre el campo con el texto de la sección');
    ok((await pa.locator('textarea').first().inputValue()).replace(/\s+/g, ' ').trim() === ANTES.replace(/\s+/g, ' ').trim(), 'el campo trae el texto de hoy');
    // Un texto con lenguaje interno no entra.
    await pa.locator('textarea').first().fill('Esto llega con el bloque 4j.');
    await pa.locator('button, [role=button]').filter({ hasText: /^Guardar$/ }).first().click();
    await pa.getByText('Faltaba un caso importante.').first().click();
    await pa.locator('button, [role=button]').filter({ hasText: /^Guardar$/ }).last().click();
    ok(await espera(async () => /Lenguaje interno/.test(await texto(pa))), 'con lenguaje interno («bloque 4j») no se guarda y lo dice');
    ok(+sql(`select count(*) from help_edits where slug = '${S}'`) === E0, 'y nada quedó en la base');
    await pa.goto(B + '/admin/textos?ed=' + S); await espera(async () => (await texto(pa)).includes('Preguntas frecuentes'));
    await pa.locator('button, [role=button]').filter({ hasText: /^Editar$/ }).nth(secsEs.indexOf(SEC)).click();
    await pa.locator('textarea').first().fill(NUEVO);
    await pa.screenshot({ path: OUT + 'e9f5-campo-1360.png', fullPage: true });
    await pa.locator('button, [role=button]').filter({ hasText: /^Guardar$/ }).first().click();
    await pa.getByText('Faltaba un caso importante.').first().click();
    await pa.locator('button, [role=button]').filter({ hasText: /^Guardar$/ }).last().click();
    ok(await espera(async () => sql(`select count(*) from help_edits where slug = '${S}' and status = 'viva'`) === '1'), 'guardado: una edición viva');
    ok(sql(`select body_new = '${NUEVO.replace(/'/g, "''")}' and reason = 'Faltaba un caso importante.' and staff_id = '${uid(ADM)}' from help_edits where slug = '${S}' and status = 'viva'`) === 't', 'con el texto, el motivo y quién');
    ok(+sql(`select count(*) from audit_entries where action = 'ayuda.editar' and target_id = '${S}'`) === A0 + 1, 'en la auditoría');
    ok(sql(`select count(*) from help_article_log where slug = '${S}' and action = 'edited' and by is not null`) !== '0', 'en el libro de la ayuda («edited»)');
    ok(await espera(async () => (await texto(pa)).includes('EDITADA')), 'la sección sale «EDITADA» con quién y por qué');
    const cv = await ctxTel(b), pv = await cv.newPage(); abiertas.push(cv);
    await pv.goto(B + '/ayuda/' + S);
    ok((await texto(pv)).includes(`Texto de prueba ${MARCA}`), 'el vecino ya la ve en el Centro de ayuda (390)');
    await pv.screenshot({ path: OUT + 'e9f5-vecino-390.png', fullPage: true });

    console.log('2 · Desplegar sin cambios en el archivo no pisa lo editado; la ruta pública da el texto de lo público');
    ok(/0 nuevos · 0 cambiados/.test(indexar()), 'reindexar: 0 nuevos, 0 cambiados');
    ok(sql(`select status from help_edits where slug = '${S}' order by id desc limit 1`) === 'viva', 'la edición sigue viva');
    await pv.reload(); ok((await texto(pv)).includes(`Texto de prueba ${MARCA}`), 'y el vecino la sigue viendo');
    // Un artículo del equipo editado: su texto nunca sale por la ruta pública.
    const SEQ = sql(`select sec from help_chunks where slug = '${EQ}' and lang = 'es' order by ord limit 1`);
    sql(`select ayuda_editar('${EQ}', 'es', ${SEQ}, 'Texto del equipo ${MARCA}.', '["Texto del equipo ${MARCA}."]'::jsonb, '${uid(ADM)}', 'Prueba ayu9f5')`);
    const api = await pv.request.get(B + '/api/ayuda/ediciones'); const j = await api.json();
    const pub = j.ediciones.find((e) => e.slug === S), eq = j.ediciones.find((e) => e.slug === EQ);
    ok(api.status() === 200 && pub && pub.texto === NUEVO, '/api/ayuda/ediciones: el texto de lo público');
    ok(eq && eq.texto === null && !JSON.stringify(j).includes(`Texto del equipo ${MARCA}`), 'de un artículo del equipo, solo la sección (sin texto)');
    ok(!/570555|Faltaba un caso/.test(JSON.stringify(j)), 'ni quién ni el motivo');

    console.log('3 · Deshacer vuelve al texto de antes');
    await pa.goto(B + '/admin/textos?ed=' + S); await espera(async () => (await texto(pa)).includes('EDITADA'));
    await pa.locator('button, [role=button]').filter({ hasText: /^Deshacer$/ }).first().click();
    await pa.getByText('Se publicó por error.').first().click();
    await pa.locator('button, [role=button]').filter({ hasText: /^Deshacer$/ }).last().click();
    ok(await espera(async () => sql(`select status from help_edits where slug = '${S}' order by id desc limit 1`) === 'deshecha'), 'deshecha en la base');
    ok(sql(`select string_agg(body, ' ' order by ord) from help_chunks where slug = '${S}' and lang = 'es' and sec = ${SEC}`).replace(/\s+/g, ' ').trim() === ANTES.replace(/\s+/g, ' ').trim(), 'la sección volvió al texto de antes');
    ok(sql(`select sha256 = repo_sha256 from help_articles where slug = '${S}'`) === 't', 'y el artículo es otra vez el del repo');
    await pv.reload(); ok(!(await texto(pv)).includes(MARCA), 'el vecino ya no ve lo editado');

    console.log('4 · Cuando el archivo cambia en el repo, manda el repo y la edición se cierra');
    sql(`update help_articles set repo_sha256 = repeat('0', 64) where slug = '${EQ}'`); // como si el archivo hubiera cambiado
    indexar();
    ok(sql(`select status || '|' || ended_reason from help_edits where slug = '${EQ}' order by id desc limit 1`) === 'reemplazada|el archivo cambió en el repo', 'la edición del equipo: «reemplazada» por el repo');
    ok(sql(`select count(*) from help_chunks where slug = '${EQ}' and body like '%${MARCA}%'`) === '0' && sql(`select sha256 = repo_sha256 from help_articles where slug = '${EQ}'`) === 't', 'y sale el texto del repo');

    console.log('5 · Solo lectura no entra; el admin en inglés');
    const cl = await ctxDesk(b), pl = await cl.newPage(); abiertas.push(cl); await entrarComo(pl, LUCIA);
    await pl.goto(B + '/admin/textos?ed=' + S); await pl.waitForLoadState('networkidle');
    ok(/\/admin\?sin=cms%3Aver/.test(pl.url()) && !(await texto(pl)).includes('TEXTO DE LA SECCIÓN'), 'Solo lectura: sin acceso al editor');
    await ca.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await pa.goto(B + '/admin/textos?ed=' + S);
    ok(await espera(async () => (await texto(pa)).includes('COPY AND PAGES · HELP · EDIT') && (await texto(pa)).includes('EDITS OF THIS ARTICLE')), 'en inglés: «COPY AND PAGES · HELP · EDIT», «EDITS OF THIS ARTICLE»');
    await ca.addCookies([{ name: 'tl_lang', value: 'es', url: B }]);
    const ct = await ctxTel(b), pt = await ct.newPage(); abiertas.push(ct); await entrarComo(pt, ADM);
    await pt.goto(B + '/admin/textos?ed=' + S); await espera(async () => (await texto(pt)).includes('Preguntas frecuentes'));
    ok(await pt.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'el editor en el teléfono, sin desborde (390)');
    await pt.screenshot({ path: OUT + 'e9f5-editor-390.png', fullPage: true });
    console.log(`\n${n} ✓ · ayu9f5`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
    limpiar();
  }
})().catch((e) => { console.error(e); process.exit(1); });
