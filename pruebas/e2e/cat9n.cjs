// 9n · Catálogo completo (LAUNCH L214 «Del diseño, pendiente», 18 nov). De punta a punta, en el Super Admin (escritorio 1360 y teléfono 390) y
// del lado público (teléfono 390):
// 1. Subcategorías: cambiar el nombre (ES/EN), fusionar A en B (los negocios con A pasan a B, el nombre viejo queda como sinónimo; «Separar» lo
//    devuelve todo) y mover a otra categoría (el código no cambia; «Agregar» en la categoría de antes no lo repite). Cada confirmación dice a
//    cuántos negocios afecta, pide motivo y queda en la auditoría.
// 2. Categoría activa por ciudad: Venta de autos apagada en Hazleton no sale en Negocios, su página responde 404, Buscar no trae sus negocios y
//    Publica tu negocio no la ofrece (un borrador de esa categoría vuelve a elegir). Al encenderla, todo vuelve.
// 3. Módulo activo por ciudad: Novedades apagado en Hazleton pausa el de todos sus negocios (la ficha deja de mostrar sus novedades), un negocio
//    nuevo de Hazleton lo recibe pausado, la pausa propia de un negocio se respeta al encenderlo otra vez.
// 4. Publica tu negocio: la plantilla de horario de Belleza (domingo abierto) y el ejemplo del nombre salen del Catálogo.
// 5. Límites Free/Pro: un Admin cambia las fotos que ve un Free (Configuración) y la galería de un negocio Free lo respeta al momento.
// Precondición propia: dos negocios de prueba de Educación (copias) con las subcategorías de prueba; nada de esta prueba de una vuelta anterior. Al
// final, todo lo encendido/apagado vuelve como estaba (las subcategorías de prueba quedan quitadas: nada se borra).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel, nombre) => {
  await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`);
  const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); const v = await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba });
  if (!v.ok) throw new Error('no entró ' + tel);
  if (nombre && !v.nombre) await api(p, '/api/cuenta/perfil', { nombre, apellido: 'Prueba' });
};
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const hasta = async (f, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 250)); } return false; };
const t = (p, x) => p.getByText(x, { exact: true }).last();
const shot = async (p, nombre, full = true) => { await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'cat9n-' + nombre, fullPage: full }); };
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// La fila de una lista del admin (la más cercana que tiene esa acción) y su botón.
const enFila = (p, texto, accion) => p.getByText(texto, { exact: true }).first().locator(`xpath=ancestor::*[.//*[normalize-space(text())='${accion}']][1]`).getByText(accion, { exact: true }).first();
const switchDe = (p, texto) => p.getByText(texto, { exact: true }).first().locator("xpath=ancestor::*[.//*[@role='switch']][1]").getByRole('switch').first();
// La confirmación con motivo: (valor) · motivo · el botón.
const confirmar = async (p, { valor, elegir, motivo, cta, afecta }) => {
  if (afecta) { await p.locator(`text=${afecta}`).first().waitFor({ timeout: 8000 }); ok(true, `la confirmación dice «${afecta.source ?? afecta}»`); }
  if (valor != null) await p.locator('input').last().fill(valor);
  if (elegir) await t(p, elegir).click();
  await p.locator('textarea').last().fill(motivo);
  await t(p, cta).click();
};
// Lo que ESTA corrida dejó en la auditoría (los motivos llevan su número).
let K = ''; const audit = (accion, objetivo) => sql(`select count(*) from audit_entries where action = '${accion}' and target_id = '${objetivo}' and reason like 'cat9n ${K} %'`);

(async () => {
  const k = String(Date.now() % 100000).padStart(5, '0'); K = k;
  const NA = `Zzcat A${k}`, NB = `Zzcat B${k}`, NA2 = `Zzcat Alfa${k}`, NA2en = `Zzcat Alpha${k}`;
  const DEALER = sql(`select name->>'es' from categories where id = 'NEG-DEALER'`), DSLUG = slug(sql(`select short->>'es' from categories where id = 'NEG-DEALER'`));
  // Precondición propia: lo que una vuelta anterior pudo dejar a medias vuelve como estaba.
  sql(`update categories set off_cities = array_remove(off_cities, 'hzl') where id = 'NEG-DEALER'`);
  sql(`select catalogo_modulo_ciudad('nov', 'hzl', false, 'cat9n', 'cat9n') where exists (select 1 from module_types where key = 'nov' and 'hzl' = any(off_cities))`);
  sql(`update businesses set modules_off = modules_off - 'nov' where modules_off->'nov'->>'reason' = 'cat9n propia'`);
  sql(`delete from platform_config where key = 'free_fotos'`);
  const ONB0 = sql(`select onb::text from categories where id = 'NEG-BELL'`);
  ok(sql(`select onb->'horario'->6->>'on' from categories where id = 'NEG-BELL'`) === 'false', 'precondición: la plantilla de Belleza cierra el domingo (la del diseño)');
  // Dos negocios de prueba de Educación en Hazleton (copias de una academia, sin dueño ni pedidos). Las subcategorías de prueba viven en
  // Educación (cat1m cuenta las QUITADAS de Comida): al final quedan quitadas ahí, nada se borra.
  const N1 = `cat9n-uno-${k}`, N2 = `cat9n-dos-${k}`, N3 = `cat9n-nuevo-${k}`;
  for (const [id, nom] of [[N1, `Cat9n Uno ${k}`], [N2, `Cat9n Dos ${k}`]]) {
    sql(`insert into businesses (id, city_id, category_id, subcategory_ids, name, status, origin, address, geo, about, filter_values, category_attrs, is_demo)
         select '${id}', city_id, category_id, '{}', '${nom}', 'active', 'self', address, geo, about, filter_values, category_attrs, false from businesses where id = 'academia-baile-sabor'`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${id}', 'free') on conflict do nothing`);
  }
  const b = await chromium.launch(); const err = [], abiertas = [];
  const mk = async (o, tel, nombre) => { const cx = await b.newContext(o); abiertas.push(cx); const p = await cx.newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); if (tel) await entrar(p, tel, nombre); return p; };
  const TEL = { width: 390, height: 844 }, TELO = { viewport: TEL, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  let volverNov = false, volverDealer = false, volverFotos = false;
  try {
    const a = await mk({ viewport: { width: 1360, height: 900 } }, '5705550199');
    const am = await mk(TELO, '5705550199');
    const v = await mk(TELO, null);
    const pu = await mk(TELO, '5705550791', 'Catalina');

    console.log('1 · Subcategorías: agregar, cambiar el nombre, fusionar, separar y mover');
    await a.goto(B + '/admin/catalogo?c=NEG-EDU'); await a.locator('text=SUBCATEGORÍAS').first().waitFor();
    for (const nom of [NA, NB]) {
      await t(a, 'Agregar subcategoría').click(); await confirmar(a, { valor: `${nom} / ${nom}`, motivo: `cat9n ${k} prueba`, cta: 'Agregar' });
      await a.locator('text=/Agregada/').first().waitFor();
    }
    const A = sql(`select id from subcategories where name->>'es' = '${NA}'`), Bk = sql(`select id from subcategories where name->>'es' = '${NB}'`);
    ok(/^NEG-EDU-\d+$/.test(A) && /^NEG-EDU-\d+$/.test(Bk), `agregadas con su código: ${A} y ${Bk}`);
    sql(`update businesses set subcategory_ids = array['${A}'] where id = '${N1}'`); sql(`update businesses set subcategory_ids = array['${A}', '${Bk}'] where id = '${N2}'`);
    await a.reload(); await a.locator('text=SUBCATEGORÍAS').first().waitFor();
    // Cambiar el nombre (ES/EN)
    await enFila(a, NA, 'Editar').click();
    await confirmar(a, { afecta: /Afecta a 2 negocios/, valor: `${NA2} / ${NA2en}`, motivo: `cat9n ${k} nombre`, cta: 'Guardar' });
    await a.locator('text=/Nombre cambiado/').first().waitFor();
    ok(sql(`select name->>'es' || '|' || (name->>'en') from subcategories where id = '${A}'`) === `${NA2}|${NA2en}`, `el nombre cambió en la base (mismo código ${A})`);
    ok(audit('catalogo.sub.nombre', A) === '1', 'el cambio de nombre quedó en la auditoría con su motivo');
    await v.goto(B + '/n/' + N1); ok(await hasta(async () => (await v.locator('body').innerText()).includes(NA2)), 'la ficha del negocio ya dice el nombre nuevo');
    await shot(a, '1-sub-d.png');
    // Fusionar A en B
    await a.reload(); await a.locator('text=SUBCATEGORÍAS').first().waitFor();
    await enFila(a, NA2, 'Fusionar').click();
    await confirmar(a, { afecta: /Afecta a 2 negocios/, elegir: NB, motivo: `cat9n ${k} fusionar`, cta: 'Fusionar' });
    await a.locator('text=/Fusionada\\. Sus negocios/').first().waitFor();
    ok(sql(`select status || '|' || merged_into from subcategories where id = '${A}'`) === `merged|${Bk}`, 'A queda «fusionada» con su puntero a B (nada se borra)');
    ok(sql(`select string_agg(array_to_string(subcategory_ids, ','), ';' order by id) from businesses where id in ('${N1}', '${N2}')`) === `${Bk};${Bk}`, 'los dos negocios quedan con B (el que tenía las dos pierde solo A)');
    ok(sql(`select count(*) from synonyms where term = lower('${NA2}') and target = lower('${NB}') and active`) === '1', 'el nombre viejo queda como sinónimo de B (Buscar lo entiende)');
    ok(audit('catalogo.sub.fusionar', A) === '1', 'la fusión quedó en la auditoría');
    await a.reload(); await a.locator('text=/FUSIONADAS · /').first().waitFor(); await shot(a, '2-fusionada-d.png');
    await v.goto(B + '/n/' + N1); ok(await hasta(async () => { const x = await v.locator('body').innerText(); return x.includes(NB) && !x.includes(NA2); }), 'la ficha ya dice B');
    // Separar (en el teléfono)
    await am.goto(B + '/admin/catalogo?c=NEG-EDU'); await am.locator('text=/FUSIONADAS · /').first().waitFor(); await shot(am, '3-fusionada-m.png');
    await enFila(am, NA2, 'Separar').click();
    await confirmar(am, { motivo: `cat9n ${k} separar`, cta: 'Separar' });
    await am.locator('text=/Separada/').first().waitFor();
    ok(sql(`select status from subcategories where id = '${A}'`) === 'on', 'Separar: A vuelve a la página');
    ok(sql(`select string_agg(array_to_string(subcategory_ids, ','), ';' order by id) from businesses where id in ('${N1}', '${N2}')`) === `${Bk},${A};${A}`, 'Separar: A vuelve a los dos negocios (el que tenía las dos conserva B)');
    ok(sql(`select count(*) from synonyms where term = lower('${NA2}') and target = lower('${NB}') and active`) === '0', 'Separar: el sinónimo que creó la fusión se apaga');
    // Mover A a Niños (en el teléfono): el código no cambia
    await am.goto(B + '/admin/catalogo?c=NEG-EDU'); await am.locator('text=SUBCATEGORÍAS').first().waitFor();
    await enFila(am, NA2, 'Mover').click();
    await confirmar(am, { afecta: /Afecta a 2 negocios/, elegir: 'Niños', motivo: `cat9n ${k} mover`, cta: 'Mover' });
    await am.locator('text=/Movida/').first().waitFor();
    ok(sql(`select category_id from subcategories where id = '${A}'`) === 'NEG-NINOS', `movida a Niños con el mismo código (${A})`);
    ok(sql(`select count(*) from businesses where id in ('${N1}', '${N2}') and subcategory_ids @> array['${A}']`) === '2', 'los negocios conservan la etiqueta');
    await am.goto(B + '/admin/catalogo?c=NEG-NINOS'); await am.getByText(NA2, { exact: true }).first().waitFor(); await shot(am, '4-movida-m.png', false);
    ok(true, 'sale en el detalle de Niños');
    await a.goto(B + '/admin/catalogo?c=NEG-EDU'); await a.locator('text=SUBCATEGORÍAS').first().waitFor();
    await t(a, 'Agregar subcategoría').click(); await confirmar(a, { valor: `Zzcat C${k}`, motivo: `cat9n ${k} prueba`, cta: 'Agregar' });
    await a.locator('text=/Agregada/').first().waitFor();
    const C = sql(`select id from subcategories where name->>'es' = 'Zzcat C${k}'`), num = (x) => +x.split('-').pop();
    ok(num(C) > num(A) && num(C) > num(Bk), `la siguiente de Educación (${C}) no repite el código de la movida (${A})`);
    // Publica tu negocio: la movida sale en Niños
    sql(`delete from onboarding_drafts where user_id = (select id from users where phone = '+15705550791')`);
    await pu.goto(B + '/publica?paso=B1'); await pu.getByLabel('¿Qué haces?').fill(NA2);
    ok(await hasta(async () => (await pu.locator('body').innerText()).toUpperCase().includes('NIÑOS')), 'Publica tu negocio encuentra la movida en Niños');

    console.log('2 · Categoría activa por ciudad: Venta de autos apagada en Hazleton');
    const KEY = sql(`select name from businesses where id = 'keystone-trucks'`);
    const negociosTiene = async () => { await v.goto(B + '/negocios'); await v.waitForLoadState('networkidle'); return (await v.getByText(DEALER, { exact: true }).count()) > 0; };
    ok(await negociosTiene(), `antes: Negocios ofrece «${DEALER}»`);
    ok((await v.goto(B + '/c/' + DSLUG)).status() === 200, `antes: /c/${DSLUG} responde 200`);
    await v.goto(B + '/buscar?q=' + encodeURIComponent(KEY)); await v.waitForLoadState('networkidle');
    ok((await v.locator('body').innerText()).includes(KEY), `antes: Buscar trae «${KEY}»`);
    await a.goto(B + '/admin/catalogo?c=NEG-DEALER'); await a.locator('text=ACTIVA POR CIUDAD').first().waitFor();
    const nd = sql(`select count(*) from businesses where category_id = 'NEG-DEALER' and city_id = 'hzl' and status = 'active'`);
    await switchDe(a, 'Hazleton').click(); volverDealer = true;
    await confirmar(a, { afecta: new RegExp(`Afecta a ${nd} negocios? en Hazleton`), motivo: `cat9n ${k} ciudad`, cta: 'Apagar' });
    await a.locator('text=/Apagada en esa ciudad/').first().waitFor(); await shot(a, '5-ciudad-d.png');
    ok(sql(`select 'hzl' = any(off_cities) from categories where id = 'NEG-DEALER'`) === 't' && audit('catalogo.cat.ciudad_apagar', 'NEG-DEALER') === '1', 'apagada en Hazleton y en la auditoría');
    ok(!(await negociosTiene()), 'Negocios ya no la ofrece');
    ok((await v.goto(B + '/c/' + DSLUG)).status() === 404, `su página responde 404 en Hazleton`);
    await v.goto(B + '/buscar?q=' + encodeURIComponent(KEY)); await v.waitForLoadState('networkidle');
    ok(!(await v.locator('body').innerText()).includes(KEY), `Buscar no trae «${KEY}»`);
    await pu.goto(B + '/publica?paso=B1'); await pu.getByText('Todas', { exact: true }).first().click();
    ok(await hasta(async () => (await pu.getByText('Comida y Bebidas', { exact: true }).count()) > 0) && (await pu.getByText('Venta de Autos', { exact: true }).count()) === 0, 'Publica tu negocio no la ofrece en «Todas»');
    await shot(pu, '6-publica-todas-m.png', false);
    const U = sql(`select id from users where phone = '+15705550791'`);
    sql(`insert into onboarding_drafts (user_id, step, answers) values ('${U}', 'C1', '{"v":2,"cat":"NEG-DEALER","subs":["Dealer"],"name":"Cat9n Autos","last":"C1","reach":1,"started":true}'::jsonb)
         on conflict (user_id) do update set step = excluded.step, answers = excluded.answers, completed_at = null, business_id = null`);
    await pu.goto(B + '/publica?paso=C1'); await pu.locator('text=/¿QUÉ HACES|¿Qué tipo de negocio/i').first().waitFor();
    ok((await pu.locator('text=/VENTA DE AUTOS · ¿QUÉ HACES/').count()) === 0, 'un borrador de esa categoría vuelve a elegir categoría');
    await a.goto(B + '/admin/catalogo?c=NEG-DEALER'); await a.locator('text=ACTIVA POR CIUDAD').first().waitFor();
    await switchDe(a, 'Hazleton').click(); await confirmar(a, { motivo: `cat9n ${k} ciudad vuelve`, cta: 'Encender' });
    await a.locator('text=/Activa otra vez/').first().waitFor(); volverDealer = false;
    ok(await negociosTiene() && (await v.goto(B + '/c/' + DSLUG)).status() === 200, 'encendida otra vez: Negocios la ofrece y su página responde');

    console.log('3 · Módulo activo por ciudad: Novedades apagado en Hazleton');
    const NOV = 'Mofongo de chicharrón a $10 hoy';
    // La novedad viaja en la página (en su pestaña de la ficha nueva): se mira el HTML servido, no solo lo que está a la vista.
    const fichaNov = async () => { await v.goto(B + '/n/sabor-dominicano'); await v.waitForLoadState('networkidle'); return (await v.content()).includes(NOV); };
    ok(await fichaNov(), 'antes: la ficha muestra su novedad');
    sql(`update businesses set modules_off = modules_off || jsonb_build_object('nov', jsonb_build_object('reason', 'cat9n propia', 'at', now(), 'by', 'cat9n')) where id = '${N2}'`);
    await a.goto(B + '/admin/catalogo?tab=mod'); await t(a, 'Novedades').click(); await a.locator('text=ACTIVO POR CIUDAD').first().waitFor();
    const nn = sql(`select count(*) from businesses where city_id = 'hzl' and status = 'active' and 'nov' = any(modules_on)`);
    await switchDe(a, 'Hazleton').click(); volverNov = true;
    await confirmar(a, { afecta: new RegExp(`Afecta a ${nn} negocios? en Hazleton`), motivo: `cat9n ${k} modulo`, cta: 'Apagar' });
    await a.locator('text=/Apagado en esa ciudad/').first().waitFor(); await shot(a, '7-modulo-d.png');
    ok(sql(`select count(*) from businesses where city_id = 'hzl' and not (modules_off ? 'nov')`) === '0', 'todos los negocios de Hazleton tienen Novedades en pausa');
    ok(sql(`select modules_off->'nov'->>'reason' from businesses where id = '${N2}'`) === 'cat9n propia', 'la pausa propia de un negocio no se pisa');
    ok(!(await fichaNov()), 'la ficha ya no muestra sus novedades');
    sql(`insert into businesses (id, city_id, category_id, name, status, origin) values ('${N3}', 'hzl', 'NEG-FOOD', 'Cat9n Nuevo ${k}', 'active', 'self')`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${N3}', 'free') on conflict do nothing`);
    ok(sql(`select modules_off->'nov'->>'ciudad' from businesses where id = '${N3}'`) === 'true', 'un negocio nuevo de Hazleton llega con Novedades en pausa');
    await am.goto(B + '/admin/catalogo?m=nov'); await am.locator('text=ACTIVO POR CIUDAD').first().waitFor(); await shot(am, '8-modulo-m.png');
    await switchDe(am, 'Hazleton').click(); await confirmar(am, { motivo: `cat9n ${k} modulo vuelve`, cta: 'Encender' });
    await am.locator('text=/Encendido otra vez/').first().waitFor(); volverNov = false;
    ok(sql(`select count(*) from businesses where modules_off->'nov'->>'ciudad' = 'true'`) === '0' && sql(`select modules_off->'nov'->>'reason' from businesses where id = '${N2}'`) === 'cat9n propia', 'encendido: se quita solo la pausa de la ciudad (la propia sigue)');
    ok(await fichaNov(), 'la ficha vuelve a mostrar su novedad');
    ok(audit('catalogo.modulo.ciudad_apagar', 'nov') === '1' && audit('catalogo.modulo.ciudad_encender', 'nov') === '1', 'apagar y encender quedaron en la auditoría');

    console.log('4 · Publica tu negocio: plantilla de horario y ejemplo del nombre de Belleza');
    sql(`insert into onboarding_drafts (user_id, step, answers) values ('${U}', 'E1', '{"v":2,"cat":"NEG-BELL","subs":["Barbería"],"name":"Cat9n Salón","last":"E1","reach":3,"started":true}'::jsonb)
         on conflict (user_id) do update set step = excluded.step, answers = excluded.answers, completed_at = null, business_id = null`);
    await pu.goto(B + '/publica?paso=E1'); await pu.locator('text=/¿CUÁNDO ABRES\\?/').first().waitFor();
    ok((await pu.getByRole('switch', { name: 'Domingo' }).getAttribute('aria-checked')) === 'false', 'antes: la plantilla de Belleza cierra el domingo');
    await a.goto(B + '/admin/catalogo?c=NEG-BELL'); await a.locator('text=PUBLICA TU NEGOCIO').first().waitFor();
    await a.getByRole('switch', { name: 'Domingo' }).click(); await t(a, 'Guardar la plantilla').click();
    await confirmar(a, { motivo: `cat9n ${k} horario`, cta: 'Guardar' }); await a.locator('text=/Plantilla guardada/').first().waitFor();
    ok(sql(`select onb->'horario'->6->>'on' from categories where id = 'NEG-BELL'`) === 'true' && audit('catalogo.cat.horario', 'NEG-BELL') === '1', 'plantilla guardada (domingo abierto) y en la auditoría');
    await a.reload(); await a.locator('text=PUBLICA TU NEGOCIO').first().waitFor();
    await enFila(a, 'Ejemplo del nombre del negocio', 'Cambiar').click();
    await confirmar(a, { valor: `Ej.: Salón Bella ${k} / E.g. Bella Salon ${k}`, motivo: `cat9n ${k} ejemplo`, cta: 'Guardar' }); await a.locator('text=/Ejemplo guardado/').first().waitFor();
    await a.reload(); await a.locator('text=PUBLICA TU NEGOCIO').first().waitFor(); await shot(a, '9-publica-d.png');
    await pu.goto(B + '/publica?paso=E1'); await pu.locator('text=/¿CUÁNDO ABRES\\?/').first().waitFor();
    ok((await pu.getByRole('switch', { name: 'Domingo' }).getAttribute('aria-checked')) === 'true', 'Publica empieza con la plantilla nueva (domingo abierto)');
    await shot(pu, '10-horario-m.png', false);
    await pu.goto(B + '/publica?paso=B1'); const nombre = pu.getByLabel('Nombre del negocio'); await nombre.waitFor();
    ok((await nombre.getAttribute('placeholder')) === `Ej.: Salón Bella ${k}`, 'el ejemplo del nombre sale del Catálogo');

    console.log('5 · Límites Free/Pro: las fotos que ve un Free');
    const GAL = 'bici-hazleton', fotos = async () => { await v.goto(B + `/n/${GAL}/fotos`); await v.waitForLoadState('networkidle'); // cuántas fotos distintas pinta («1 / N» … «N / N»; teléfono y escritorio pintan cada una)
      return v.evaluate(() => new Set([...document.querySelectorAll('button[aria-label]')].map((x) => x.getAttribute('aria-label')).filter((l) => /^\d+ \/ \d+$/.test(l))).size); };
    ok(sql(`select coalesce(s.plan, 'free') from businesses b left join business_stats_cache s on s.business_id = b.id where b.id = '${GAL}'`) === 'free', `precondición: ${GAL} es Free`);
    ok(await fotos() === 3, 'antes: su galería muestra 3 fotos (Free)');
    await a.goto(B + '/admin/catalogo?tab=mod'); await a.locator('text=LÍMITES FREE Y PRO').first().waitFor();
    await enFila(a, 'Free · fotos de la galería que se ven', 'Cambiar').click(); volverFotos = true;
    await confirmar(a, { valor: '2', motivo: `cat9n ${k} limite`, cta: 'Guardar' }); await a.locator('text=/Guardado: 2/').first().waitFor(); await shot(a, '11-limites-d.png');
    ok(sql(`select cfg_int('free_fotos')`) === '2' && sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id = 'free_fotos' and reason = 'cat9n ${k} limite'`) === '1', 'el límite se guardó (Configuración) con su auditoría');
    ok(await fotos() === 2, 'la galería del Free muestra 2 al momento');
    await enFila(a, 'Free · fotos de la galería que se ven', 'Cambiar').click();
    await confirmar(a, { valor: '3', motivo: `cat9n ${k} limite vuelve`, cta: 'Guardar' }); await a.locator('text=/Guardado: 3/').first().waitFor(); volverFotos = false;
    ok(await fotos() === 3, 'vuelve a 3');
    await am.goto(B + '/admin/catalogo?tab=mod'); await am.locator('text=LÍMITES FREE Y PRO').first().waitFor(); await shot(am, '12-limites-m.png');
    ok(!err.length, 'sin errores en la página: ' + (err.join(' · ') || 'ninguno'));
  } finally {
    // Todo vuelve como estaba (aunque la prueba se corte).
    try { if (volverDealer) sql(`update categories set off_cities = array_remove(off_cities, 'hzl') where id = 'NEG-DEALER'`); } catch (e) { console.error('dealer', e.message); }
    try { if (volverNov) sql(`select catalogo_modulo_ciudad('nov', 'hzl', false, 'cat9n', 'cat9n')`); } catch (e) { console.error('nov', e.message); }
    try { if (volverFotos) sql(`delete from platform_config where key = 'free_fotos'`); } catch (e) { console.error('fotos', e.message); }
    try { sql(`update categories set onb = '${ONB0.replace(/'/g, "''")}'::jsonb where id = 'NEG-BELL'`); } catch (e) { console.error('onb', e.message); }
    try { sql(`update businesses set status = 'closed', modules_off = modules_off - 'nov' where id like 'cat9n-%-${k}'`); } catch (e) { console.error('negocios', e.message); }
    try { sql(`update subcategories set status = 'off', status_reason = 'cat9n fin de la prueba', category_id = 'NEG-EDU' where name->>'es' like 'Zzcat %${k}' and status <> 'merged'`); } catch (e) { console.error('subs', e.message); }
    try { sql(`delete from onboarding_drafts where user_id = (select id from users where phone = '+15705550791')`); } catch (e) { console.error('borrador', e.message); }
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
  console.log(`\ncat9n: ${n} ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
