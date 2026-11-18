// 9f-3 · Todas las pantallas por el CMS (LAUNCH «9f-3 · Más cadenas por el CMS»; REVISION «Todas las pantallas por el CMS (18 nov)»): cada E2("…", "…") de
// las pantallas es una cadena de Super Admin › Textos y páginas › Cadenas (llave .e2-<huella>). Se edita una que sale en un componente del SERVIDOR
// (/privacidad: «Los datos que usamos y para qué») y una que sale en un componente de CLIENTE (/eventos: «Publica tu evento», que está en 4 lugares) y el
// vecino sin sesión las ve cambiadas en el teléfono (390) y la computadora (1360), en español y en inglés, desde el primer pintado (sin JavaScript también)
// y sin errores de hidratación; la fila dice en cuántos lugares está y editarla lo avisa; el historial lista los archivos; lo que no se editó no cambia; si
// la base no responde sale el texto del código; «Volver al código» lo devuelve; una de E2 con el 911 tiene candado; una de E2 que ya no está en el código no
// se lista. Precondiciones propias: el catálogo indexado (corre el indexador si faltan), la base dice «pruebas», lo editado de una corrida anterior vuelve al
// código. Lo que la prueba cambia vuelve a como estaba (nada se borra).
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs');
const { entrarComo } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr ?? e.message); } };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const RUN = Date.now().toString(36), TAG = `c9f3${RUN}`;
const ADM = '5705550199';
const ctxTel = (b, extra = {}) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });
const ctxDesk = (b, extra = {}) => b.newContext({ viewport: { width: 1360, height: 900 }, ...extra });
const shot = (p, nom, full = false) => p.screenshot({ path: OUT + `c9f3-${nom}.png`, fullPage: full });
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const conIdioma = async (c, lang) => { if (lang === 'en') await c.addCookies([{ name: 'tl_lang', value: 'en', url: B }]); return c; };
// Las dos cadenas (sus llaves salen del catálogo: si el código cambiara el texto, la prueba lo dice en vez de editar otra cosa).
const CAT = JSON.parse(fs.readFileSync(ENT.RAIZ + '/apps/web/lib/cms-cadenas-e2.json', 'utf8')).cadenas;
const de = (es, en) => CAT.find((c) => c.es === es && c.en === en) ?? (() => { throw new Error(`no está en cms-cadenas-e2.json: ${es} / ${en}`); })();
const CLI = de('Publica tu evento', 'Publish your event');            // componente de cliente (app/(app)/eventos/Eventos.tsx y Publicar.tsx)
const SRV = de('Los datos que usamos y para qué', 'The data we use and why'); // componente del servidor (app/(app)/privacidad/page.tsx)
const OTRA = de('¿Tu negocio tiene un evento?', 'Does your business have an event?'); // en la misma pantalla, sin editar
const FIJA = CAT.find((c) => c.locked && /911/.test(c.es));
const HUERFANA = 'APP-EVENTOS.e2-000000000000';
const limpiar = () => {
  const A = uid(ADM);
  sql(`select set_config('tl.cms_por', '${A}', false), set_config('tl.cms_motivo', 'limpieza cms9f3', false); update cms_strings set text = code_text, status = 'vivo' where edited and not locked and id in ('${CLI.id}', '${SRV.id}', '${OTRA.id}')`);
};
// Los errores de hidratación (React 19: #418/#423/#425 en producción; «Hydration failed» / «did not match» en desarrollo).
const HIDRATA = /Hydration|hydrat|did not match|Minified React error #(418|423|425)/i;
const vigilar = (p) => { const e = []; p.on('console', (m) => { if (m.type() === 'error' && HIDRATA.test(m.text())) e.push(`${p.url()} · ${m.text()}`); }); p.on('pageerror', (x) => { if (HIDRATA.test(String(x))) e.push(`${p.url()} · ${x}`); }); return e; };
const esperarTexto = async (p, t) => { await p.waitForFunction((x) => document.body.innerText.includes(x), t, { timeout: 10000 }).catch(() => {}); };

(async () => {
  // ── Precondiciones propias ──
  sql(`insert into platform_config (key, value, note, updated_by) values ('entorno', '"pruebas"'::jsonb, 'Sandbox (cms9f3)', 'semilla') on conflict (key) do update set value = excluded.value`);
  if (Number(sql(`select count(*) from cms_strings where id ~ '\\.e2-[0-9a-f]{12}$'`)) < CAT.length || sql(`select count(*) from cms_strings where id = '${CLI.id}'`) !== '1')
    execSync(`node ${ENT.RAIZ}/scripts/cms/indexar.mjs | docker exec -i ${ENT.DB} psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U tolatino -d tolatino -qAt`, { stdio: ['pipe', 'pipe', 'pipe'] });
  ok(sql(`select count(*) from cms_strings where id in ('${CLI.id}', '${SRV.id}')`) === '2', `las dos cadenas de E2 están indexadas (${CLI.id}, ${SRV.id})`);
  limpiar();
  const b = await chromium.launch();
  const abiertas = [];
  try {
    // ── 1 · El Super Admin: la fila de E2 dice sus lugares; editarla lo avisa; se guarda con versión y auditoría ──
    console.log('1 · Cadenas: una de E2 con sus lugares, editarla (cliente y servidor)');
    const ca = await ctxDesk(b), pa = await ca.newPage(); abiertas.push(ca); await entrarComo(pa, ADM);
    const UA = uid(ADM);
    await pa.goto(B + '/admin/textos/cadenas');
    ok(/\d+ de las pantallas/.test(await texto(pa)), 'las cifras dicen cuántas cadenas son de las pantallas');
    for (const area of ['APP', 'NEG', 'PUERTA', 'REP']) ok(await pa.getByText(new RegExp(`^${area} · \\d+$`)).count() > 0, `la pantalla «${area}» en el primer nivel`);
    await pa.goto(B + '/admin/textos/cadenas?pantalla=APP');
    ok(await pa.getByText(/^APP-EVENTOS · \d+$/).count() > 0 && await pa.getByText('← APP', { exact: true }).count() === 0, 'APP abre sus pantallas (APP-EVENTOS…)');
    await pa.goto(B + '/admin/textos/cadenas?pantalla=APP-EVENTOS');
    ok(await pa.getByText('← APP', { exact: true }).count() > 0, 'y «← APP» vuelve un nivel arriba');
    await shot(pa, 'cadenas-pantallas-1360', true);
    await pa.goto(B + '/admin/textos/cadenas?q=' + encodeURIComponent('Publica tu evento'));
    await pa.getByText(CLI.id, { exact: true }).first().waitFor();
    const fila = pa.locator(`text=${CLI.id}`).first();
    ok(/en \d+ lugares/.test(await texto(pa)) && (await texto(pa)).includes(`en ${CLI.n} lugares`), `la fila dice «en ${CLI.n} lugares»`);
    const v0 = Number(sql(`select version from cms_strings where id = '${CLI.id}'`));
    await fila.waitFor();
    // El botón Editar de ESA fila (la búsqueda trae solo las que dicen «Publica tu evento»: la de 4 lugares es la primera por llave).
    const editar = async (id) => {
      const filas = await pa.getByText(id, { exact: true }).count();
      ok(filas >= 1, `la búsqueda trae ${id}`);
      await pa.locator(`xpath=//*[normalize-space(text())='${id}']/ancestor::*[.//*[normalize-space(text())='Editar']][1]`).first().getByText('Editar', { exact: true }).first().click();
      await pa.locator('textarea').first().waitFor();
    };
    await editar(CLI.id);
    ok((await texto(pa)).includes(`Cambia en los ${CLI.n} lugares donde aparece`), 'editar una que está en varios lugares lo avisa antes de guardar, con los archivos');
    await shot(pa, 'editar-varios-lugares-1360', true);
    await pa.locator('textarea').nth(0).fill(`Publica tu evento ${TAG}`); await pa.locator('textarea').nth(1).fill(`Publish your event ${TAG}`);
    await pa.locator('textarea').last().fill(`Prueba cms9f3 ${RUN}`);
    await pa.getByText('Guardar el texto', { exact: true }).last().click();
    await pa.getByRole('status').filter({ hasText: /Los vecinos ya lo ven/ }).first().waitFor({ timeout: 8000 });
    ok(sql(`select edited::text || '|' || version || '|' || (updated_by = '${UA}') from cms_strings where id = '${CLI.id}'`) === `true|${v0 + 1}|true`, 'la base: editada, una versión más, con quién');
    ok(sql(`select count(*) from audit_entries where action = 'cms.editar' and target_id = '${CLI.id}' and actor_id = '${UA}' and reason = 'Prueba cms9f3 ${RUN}'`) === '1', 'la auditoría con el motivo');
    await pa.goto(B + '/admin/textos/cadenas?q=' + encodeURIComponent('Los datos que usamos'));
    await editar(SRV.id);
    await pa.locator('textarea').nth(0).fill(`Los datos que usamos y para qué ${TAG}`); await pa.locator('textarea').nth(1).fill(`The data we use and why ${TAG}`);
    await pa.locator('textarea').last().fill(`Prueba cms9f3 ${RUN}`);
    await pa.getByText('Guardar el texto', { exact: true }).last().click();
    await pa.getByRole('status').filter({ hasText: /Los vecinos ya lo ven/ }).first().waitFor({ timeout: 8000 });
    ok(sql(`select edited::text from cms_strings where id = '${SRV.id}'`) === 'true', 'la del servidor también, editada');
    await pa.goto(B + `/admin/textos/cadenas?h=${CLI.id}`);
    await pa.getByText('Historial', { exact: true }).first().waitFor();
    { const t = await texto(pa); ok(new RegExp(`LUGARES · ${CLI.n} EN ${CLI.donde.length} ARCHIVOS`).test(t) && CLI.donde.every((f) => t.includes(f)), 'el historial lista los lugares (archivos) de la cadena'); }

    // ── 2 · El vecino sin sesión: 390 y 1360, español e inglés; servidor y cliente; sin errores de hidratación ──
    console.log('2 · El vecino lo ve al instante: teléfono y computadora, español e inglés, servidor y cliente');
    for (const [nom, tipo] of [['390', ctxTel], ['1360', ctxDesk]]) for (const lang of ['es', 'en']) {
      const c = await conIdioma(await tipo(b), lang), p = await c.newPage(); abiertas.push(c);
      const errores = vigilar(p);
      const [cli, cliOtro, srv, otra] = lang === 'es' ? [`Publica tu evento ${TAG}`, `Publish your event ${TAG}`, `Los datos que usamos y para qué ${TAG}`, OTRA.es] : [`Publish your event ${TAG}`, `Publica tu evento ${TAG}`, `The data we use and why ${TAG}`, OTRA.en];
      const r = await p.goto(B + '/eventos', { waitUntil: 'networkidle' });
      await esperarTexto(p, cli);
      const t = await texto(p);
      ok(r.status() === 200 && t.includes(cli) && !t.includes(cliOtro), `${nom} · ${lang} · /eventos (componente de cliente): «${cli}»`);
      ok(t.includes(otra), `${nom} · ${lang} · lo que no se editó sigue igual («${otra}»)`);
      await shot(p, `eventos-${nom}-${lang}`);
      const r2 = await p.goto(B + '/privacidad', { waitUntil: 'networkidle' });
      await esperarTexto(p, srv);
      ok(r2.status() === 200 && (await texto(p)).includes(srv), `${nom} · ${lang} · /privacidad (componente del servidor): «${srv}»`);
      await shot(p, `privacidad-${nom}-${lang}`);
      ok(!errores.length, `${nom} · ${lang} · sin errores de hidratación${errores.length ? ': ' + errores[0].slice(0, 220) : ''}`);
    }
    // El primer pintado ya lo trae (sin JavaScript: el HTML del servidor, también el del componente de cliente).
    {
      const c = await ctxTel(b, { javaScriptEnabled: false }), p = await c.newPage(); abiertas.push(c);
      await p.goto(B + '/eventos');
      ok((await texto(p)).includes(`Publica tu evento ${TAG}`), 'sin JavaScript (el HTML del primer pintado) el componente de cliente ya sale editado: no hay parpadeo');
      const html = await (await p.request.get(B + '/eventos')).text();
      // Lo editado viaja con la página para los componentes de cliente (los dos idiomas: la página en español trae también el inglés editado).
      ok(html.includes(`Publish your event ${TAG}`) && html.includes(`The data we use and why ${TAG}`), 'el navegador recibe lo editado (también el otro idioma) con la página');
      ok(!html.includes('Lo que faltaba no estaba y el resto volvió al estante'), 'una cadena de otra pantalla que nadie editó no viaja al navegador');
    }

    // ── 3 · Si la base no responde: el texto del código, sin cortar ──
    console.log('3 · Sin la tabla de cadenas, el texto del código');
    {
      const c = await ctxDesk(b), p = await c.newPage(); abiertas.push(c);
      try {
        sql(`alter table cms_strings rename to cms_strings_fuera`); sql(`select pg_notify('tl_config', 'prueba cms9f3')`);
        await new Promise((r) => setTimeout(r, 800));
        const r = await p.goto(B + '/eventos', { waitUntil: 'networkidle' }); const t = await texto(p);
        ok(r.status() === 200 && t.includes('Publica tu evento') && !t.includes(TAG), 'sin la tabla: 200 y «Publica tu evento» del código');
      } finally { sql(`alter table cms_strings_fuera rename to cms_strings`); sql(`select pg_notify('tl_config', 'prueba cms9f3')`); }
      await new Promise((r) => setTimeout(r, 800));
      await p.goto(B + '/eventos', { waitUntil: 'networkidle' }); await esperarTexto(p, TAG);
      ok((await texto(p)).includes(`Publica tu evento ${TAG}`), 'y al volver la tabla, otra vez la editada');
    }

    // ── 4 · Volver al código (Super Admin) → el vecino ve el código, en los dos anchos y los dos idiomas ──
    console.log('4 · «Volver al código»');
    for (const [id, q] of [[CLI.id, 'Publica tu evento'], [SRV.id, 'Los datos que usamos']]) {
      await pa.goto(B + `/admin/textos/cadenas?estado=editadas&q=${encodeURIComponent(q)}`);
      await pa.getByText(id, { exact: true }).first().waitFor();
      await pa.getByText('Volver al código', { exact: true }).first().click();
      await pa.locator('textarea').last().fill(`La edición no gustó cms9f3 ${RUN}`);
      await pa.getByText('Volver al código', { exact: true }).last().click();
      await pa.getByRole('status').filter({ hasText: /Listo/ }).first().waitFor({ timeout: 8000 });
      ok(sql(`select edited::text || '|' || (text = code_text) from cms_strings where id = '${id}'`) === 'false|true', `${id}: vuelve al código (ya no cuenta como editada)`);
    }
    for (const [nom, tipo] of [['390', ctxTel], ['1360', ctxDesk]]) for (const lang of ['es', 'en']) {
      const c = await conIdioma(await tipo(b), lang), p = await c.newPage(); abiertas.push(c);
      await p.goto(B + '/eventos', { waitUntil: 'networkidle' }); const t = await texto(p);
      await p.goto(B + '/privacidad', { waitUntil: 'networkidle' }); const t2 = await texto(p);
      const [cli, srv] = lang === 'es' ? ['Publica tu evento', 'Los datos que usamos y para qué'] : ['Publish your event', 'The data we use and why'];
      ok(t.includes(cli) && !t.includes(TAG) && t2.includes(srv) && !t2.includes(TAG), `${nom} · ${lang}: otra vez el texto del código («${cli}», «${srv}»)`);
    }
    ok(Number(sql(`select count(*) from cms_string_versions where string_id = '${CLI.id}'`)) >= 3, 'cada paso quedó como versión (nada se borra)');

    // ── 5 · Candado y huérfanas ──
    console.log('5 · Una de E2 con el 911 tiene candado; una que ya no está en el código no se lista');
    ok(!!FIJA, `el catálogo trae con candado una de E2 con el 911 (${FIJA?.id})`);
    await pa.goto(B + `/admin/textos/cadenas?q=${FIJA.id}`);
    await pa.getByText(FIJA.id, { exact: true }).first().waitFor();
    ok(await pa.getByText('LÍNEA FIJA', { exact: true }).count() > 0 && await pa.getByText('Editar', { exact: true }).count() === 0, 'sale como LÍNEA FIJA, sin Editar');
    ok(/cms_linea_fija/.test(sqlErr(`select set_config('tl.cms_por', '${UA}', false), set_config('tl.cms_motivo', 'intento cms9f3', false); update cms_strings set text = jsonb_build_object('es', 'x', 'en', 'y') where id = '${FIJA.id}'`)), 'la base rechaza editarla');
    sql(`select cms_indexar('{"id":"${HUERFANA}","screen":"APP-EVENTOS","es":"Texto viejo que ya no está en el código c9f3","en":"Old text no longer in the code c9f3","max_len":60,"locked":false,"sha256":"${'0'.repeat(64)}"}'::jsonb)`);
    await pa.goto(B + `/admin/textos/cadenas?q=${encodeURIComponent('ya no está en el código c9f3')}`);
    await pa.getByText(/Nada con ese filtro|Nothing with that filter/).first().waitFor({ timeout: 8000 }).catch(() => {});
    ok(await pa.getByText(HUERFANA, { exact: true }).count() === 0 && sql(`select count(*) from cms_strings where id = '${HUERFANA}'`) === '1', 'una cadena de E2 que el código ya no tiene no se lista (y sigue en la base, sin borrar)');

    console.log(`\ncms9f3: ${n} comprobaciones ✓`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close().catch(() => {});
    try { limpiar(); } catch (e) { console.error('limpieza:', e.message); }
  }
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
