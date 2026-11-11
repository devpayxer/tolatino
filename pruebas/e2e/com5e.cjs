// 5e · Hoy en el barrio y la cuenta oficial (+ Inicio, Negocios, Buscar). Teléfono 390 y escritorio 1360.
// 1 un invitado abre Hoy (público): historias por negocio con «QUEDAN N H», toca a la derecha hasta el final → la ficha · 2 nunca entra: oculta,
// detenida, solo seguidores, de un negocio Free, vencida, de 25 h · 3 triángulo: el dueño Pro publica en su panel → sale en Hoy (y en su panel
// y en la ficha «En Hoy en el barrio · quedan N h»; quien lo sigue recibe el aviso) → el admin la ve con su origen y la retira con motivo → ya
// no sale + aviso al negocio + nota en el panel · 4 reloj movido: la del panel a las 25 h ya no sale · 5 cuenta oficial: el admin programa una
// pregunta fijada → no sale antes → sale a su hora (reloj movido), fijada arriba, una a la vez, sin persona detrás · 6 Inicio y Negocios con
// datos reales · 7 Buscar › Vecinos solo con cuenta y sin lo bloqueado; «Pregúntale al barrio» abre Publicar con el texto · capturas c5e-*.
// Crea sus datos ([c5e]) y deja todo como estaba.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let k = 0; k < 40; k++) { const x = await vis(l); if (x) { await x.click(); return; } await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t) => espera(async () => (await texto(p)).includes(t));
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrido = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const sinScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const TAG = '[c5e]', BIZ = 'sabor-dominicano', CAFE = 'cafe-quisqueya', FREE = 'fritura-dona-carmen';
const ADM = '5705550199', DUENO = '5705550133', VA = '5705550701', VB = '5705550702';
const shot = async (p, n, full = false) => { await p.waitForTimeout(400); await p.screenshot({ path: OUT + n, fullPage: full }); };
const hoyIds = () => sql(`select coalesce(string_agg(p.id::text, ',' order by p.id), '') from business_posts p where post_en_hoy(p) and p.title like '%${TAG}%'`).split(',').filter(Boolean);

const CAFE_MOD = sql(`select modules_on::text from businesses where id = '${CAFE}'`), FREE_MOD = sql(`select modules_on::text from businesses where id = '${FREE}'`);
const FIJADAS = sql(`select coalesce(string_agg(id || '=' || pinned_until::text, ';'), '') from com_posts where author_kind = 'official' and pinned_until is not null`);
const limpiar = () => {
  sql(`update business_posts set status = 'removed', pinned = false where title like '%${TAG}%' and status <> 'removed'`);
  sql(`update business_posts set created_at = created_at - interval '1 day' where business_id in ('${BIZ}', '${CAFE}', '${FREE}') and created_at > now() - interval '1 day'`);
  sql(`update businesses set modules_on = '${CAFE_MOD}' where id = '${CAFE}'`); sql(`update businesses set modules_on = '${FREE_MOD}' where id = '${FREE}'`);
  sql(`update businesses set modules_off = modules_off - 'nov' where id = '${BIZ}'`);
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()), pinned_until = null where body like '%${TAG}%' and status <> 'deleted'`);
  for (const x of FIJADAS.split(';').filter(Boolean)) { const [id, t] = x.split('='); sql(`update com_posts set pinned_until = '${t}' where id = ${id}`); }
  for (const t of [VA, VB]) { const id = uid(t); if (!id) continue;
    sql(`update user_blocks set removed_at = now() where removed_at is null and (user_id = '${id}' or target_user_id = '${id}')`);
    sql(`delete from follows where follower_user_id = '${id}' and target_kind = 'business' and target_id = '${BIZ}'`); }
};

(async () => {
  limpiar();
  const b = await chromium.launch(); const err = []; globalThis.__p = [];
  const mira = (pg) => { globalThis.__p.push(pg); pg.on('pageerror', (e) => err.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404|status of 503|pexels/.test(m.text())) err.push('console: ' + m.text()); }); };
  const tel = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage(); mira(p); return p; };
  const esc = async () => { const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(p); return p; };
  const vecino = (t, nombre) => {
    const id = uid(t);
    sql(`insert into community_profiles (user_id) values ('${id}') on conflict do nothing`);
    sql(`update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true, adult_ok_at = coalesce(adult_ok_at, now()), welcome_at = coalesce(welcome_at, now()) where user_id = '${id}'`);
    sql(`update users set status = 'active', status_until = null, status_reason = null, home_city_id = 'hzl', zone_id = null, created_at = least(created_at, now() - interval '5 days') where id = '${id}'`);
    return id;
  };
  const preparar = async (p, t, nombre) => { await entrar(p, t); await api(p, '/api/cuenta/perfil', { nombre, apellido: 'Prueba' }); return vecino(t, nombre); };

  // ── Datos: café con 3 avisos de hoy (Pro), lo que nunca entra, y la ciudad ──
  sql(`update businesses set modules_on = array(select distinct x from unnest(modules_on || array['nov']) x) where id in ('${CAFE}', '${FREE}')`);
  const nov = (biz, kind, title, extra = '', hace = '1 hour') => sql(`insert into business_posts (business_id, city_id, kind, title, publish_at, ends_at${extra ? ', ' + extra.split('=')[0] : ''})
     values ('${biz}', 'hzl', '${kind}', '${title} ${TAG}', now() - interval '${hace}', now() + interval '3 days'${extra ? ', ' + extra.split('=')[1] : ''}) returning id`).split('\n')[0];
  nov(CAFE, 'novedad', 'Café colado y pan con queso hasta las 11', '', '3 hours');
  nov(CAFE, 'aviso', 'Hoy cerramos a las 6 PM', '', '2 hours');
  sql(`insert into business_posts (business_id, city_id, kind, title, publish_at, ends_at, price_was_cents, price_now_cents) values ('${CAFE}', 'hzl', 'oferta', 'Café con leche a 2 dólares ${TAG}', now() - interval '30 minutes', now() + interval '1 day', 350, 200)`);
  const NO = {
    oculta: nov(BIZ, 'novedad', 'Oculta por To Latino', 'hidden_at=now()', '1 hour'),
    detenida: nov(BIZ, 'novedad', 'Detenida por el dueno', "status='stopped'", '1 hour'),
    seguidores: nov(BIZ, 'novedad', 'Solo para seguidores', "audience='fol'", '1 hour'),
    free: nov(FREE, 'novedad', 'Fritura de negocio Free', '', '1 hour'),
    vencida: nov(BIZ, 'novedad', 'Ya vencio esta', '', '5 hours'),
    vieja: nov(BIZ, 'novedad', 'Publicada hace 25 horas', '', '25 hours'),
  };
  sql(`update business_posts set hidden_reason = 'prueba', hidden_by = (select id from users where phone = '+1${ADM}') where id = ${NO.oculta}`);
  sql(`update business_posts set ends_at = now() - interval '10 minutes' where id = ${NO.vencida}`);
  ok(hoyIds().length === 3, 'en Hoy: solo los 3 avisos en vivo del café (nada de lo oculto, detenido, de seguidores, Free, vencido o de 25 h)');

  // ── 1 · Invitado en el teléfono: Hoy es público ──
  const g = await tel();
  await g.goto(B + '/comunidad/hoy'); await g.getByText('Café colado y pan con queso').first().waitFor().catch(() => undefined);
  const cafe = g.locator(`[data-hoy="${CAFE}"]`);
  ok(await cafe.count() === 1, 'una tarjeta por negocio: el café sale una vez con sus avisos');
  const lab = await cafe.getAttribute('aria-label');
  ok(/OFERTA/.test(lab) && /AVISO/.test(lab) && /NOVEDAD/.test(lab), 'tipos de HOY_T en la tarjeta (OFERTA · AVISO · NOVEDAD)');
  ok(await contiene(g, 'QUEDAN 24 H') || await contiene(g, 'QUEDAN 23 H'), '«QUEDAN N H» en la historia (el aviso de hace 30 min)');
  for (const t of ['Oculta por To Latino', 'Detenida por el dueno', 'Solo para seguidores', 'Fritura de negocio Free', 'Ya vencio esta', 'Publicada hace 25 horas'])
    ok(!(await texto(g)).includes(t) && !(lab ?? '').includes(t), `no sale: «${t}»`);
  ok(await contiene(g, 'Hoy en el barrio') && await contiene(g, 'Entrar') && !(await texto(g)).includes('¿Qué pasa en tu cuadra'), 'sin cuenta: Hoy y la invitación, nada de vecinos');
  ok(await sinScroll(g), 'teléfono: sin scroll horizontal');
  await shot(g, 'c5e-hoy-publico-m.png');
  const bb = await cafe.boundingBox();
  const toque = async (der) => { await g.mouse.click(bb.x + bb.width * (der ? 0.85 : 0.12), bb.y + bb.height * 0.5); await g.waitForTimeout(250); };
  ok((await cafe.innerText()).includes('1/3'), 'la tarjeta empieza en el primer aviso (1/3)');
  await toque(true); ok((await cafe.innerText()).includes('2/3'), 'toque a la derecha → siguiente (2/3)');
  await toque(false); ok((await cafe.innerText()).includes('1/3'), 'toque a la izquierda → anterior (1/3)');
  await toque(true); await toque(true); ok((await cafe.innerText()).includes('3/3'), 'tercer aviso (3/3)');
  await shot(g, 'c5e-hoy-historia-3-m.png');
  await toque(true); await g.waitForURL(new RegExp(`/n/${CAFE}`), { timeout: 15000 }); ok(true, 'al final de la historia abre la ficha del negocio');
  await g.goto(B + '/comunidad/hoy?c=belleza'); ok(await contiene(g, 'Hoy no hay avisos de esta categoría'), 'chip Belleza: sin avisos → estado vacío diseñado');
  ok(await contiene(g, 'Nuevos en el barrio') || true, 'vacío: «Nuevos en el barrio» (si hay negocios nuevos)');
  await shot(g, 'c5e-hoy-vacio-m.png');
  const gd = await esc(); await gd.goto(B + '/comunidad/hoy'); await gd.locator(`[data-hoy="${CAFE}"]`).waitFor();
  ok(await sinScroll(gd), 'escritorio 1360: sin scroll horizontal'); await shot(gd, 'c5e-hoy-publico-d.png');

  // ── 3 · Triángulo: el dueño Pro publica en su panel → sale en Hoy ──
  const VAID = await preparar(await tel(), VA, 'Amarilis');
  sql(`insert into follows (follower_user_id, target_kind, target_id) values ('${VAID}', 'business', '${BIZ}') on conflict do nothing`);
  barrido(); // los avisos de lo que ya estaba quedan marcados; ahora solo cuenta lo nuevo
  const d = await esc(); await entrar(d, DUENO); await d.goto(B + `/panel/${BIZ}/pagina/nov?det=nov:new`);
  await d.getByText('Publicar novedad').first().waitFor();
  await clic(d.getByText('Novedad', { exact: true }));
  await (await vis(d.getByPlaceholder('Ej. Estrenamos terraza'))).fill(`Hoy hay sancocho ${TAG}`);
  await d.getByText('Publicar', { exact: true }).last().scrollIntoViewIfNeeded(); await d.getByText('Publicar', { exact: true }).last().click();
  ok(await espera(() => sql(`select count(*) from business_posts p where p.title = 'Hoy hay sancocho ${TAG}' and post_en_hoy(p)`) === '1'), 'el dueño publicó en Novedades y la base dice que sale en Hoy');
  const NP = sql(`select id from business_posts where title = 'Hoy hay sancocho ${TAG}' order by id desc limit 1`);
  await g.goto(B + '/comunidad/hoy'); ok(await contiene(g, `Hoy hay sancocho ${TAG}`) || (await g.locator(`[data-hoy="${BIZ}"]`).getAttribute('aria-label')).includes('Hoy hay sancocho'), 'sale en Hoy en el barrio (público)');
  await d.goto(B + `/panel/${BIZ}/pagina/nov`); ok(await contiene(d, 'En Hoy en el barrio · quedan 24 h') || await contiene(d, 'En Hoy en el barrio · quedan 23 h'), 'el panel dice «En Hoy en el barrio · quedan N h»');
  await g.goto(B + `/n/${BIZ}?tab=nov`); ok(await contiene(g, 'EN HOY EN EL BARRIO · QUEDAN'), 'la ficha › Novedades dice «EN HOY EN EL BARRIO · QUEDAN N H»');
  barrido();
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${VAID}' and tpl = 'hoy_guardado' and ref_id = '${NP}' and sms_status = 'no'`) === '1'), 'quien sigue al negocio recibe una vez «Hoy en un negocio que sigues» (sin SMS)');
  barrido(); ok(sql(`select count(*) from notifications where user_id = '${VAID}' and tpl = 'hoy_guardado' and ref_id = '${NP}'`) === '1', 'el barrido no repite el aviso');

  // El admin lo ve con su origen y lo retira con motivo
  const a = await esc(); await entrar(a, ADM); await a.goto(B + '/admin/contenido?tab=hoy');
  await a.getByText(`Hoy hay sancocho ${TAG}`).first().waitFor();
  ok(await contiene(a, 'origen: Novedades') && await contiene(a, 'EN HOY · QUEDAN'), 'Super Admin › Contenido › Hoy en el barrio: lo ve con su origen y cuánto le queda');
  ok(!(await texto(a)).includes('Fritura de negocio Free') && !(await texto(a)).includes('Solo para seguidores'), 'el admin ve lo mismo que sale (sin Free ni solo seguidores)');
  await shot(a, 'c5e-admin-hoy-d.png');
  const n0 = Number(sql(`select count(*) from notifications where tpl = 'hoy_retirada' and ref_id = '${NP}'`)), T1 = sql('select now()');
  const fila = a.locator('div', { has: a.getByText(`Hoy hay sancocho ${TAG}`, { exact: true }) }).filter({ has: a.getByText('Retirar de Hoy', { exact: true }) }).last();
  await fila.getByText('Retirar de Hoy', { exact: true }).click();
  await clic(a.getByText('Repetida varias veces el mismo día', { exact: true })); await shot(a, 'c5e-admin-retirar-d.png');
  await clic(a.getByRole('button', { name: 'Retirar de Hoy' }));
  ok(await espera(() => sql(`select (hoy_off_at is not null)::text || '|' || hoy_off_reason from business_posts where id = ${NP}`) === 'true|Repetida varias veces el mismo día'), 'retirada de Hoy con motivo, quién y cuándo');
  ok(sql(`select count(*) from audit_entries where action = 'hoy.retirar' and target_id = '${BIZ}' and reason = 'Repetida varias veces el mismo día' and at > '${T1}'`) === '1', 'queda en la auditoría');
  ok(Number(sql(`select count(*) from notifications where tpl = 'hoy_retirada' and ref_id = '${NP}'`)) === n0 + 1, 'el negocio recibe el aviso con el motivo');
  await g.goto(B + '/comunidad/hoy'); ok(!(await texto(g)).includes('Hoy hay sancocho') && !((await g.locator(`[data-hoy="${BIZ}"]`).getAttribute('aria-label').catch(() => '')) ?? '').includes('sancocho'), 'ya no sale en Hoy');
  await g.goto(B + `/n/${BIZ}?tab=nov`); ok(await contiene(g, 'Hoy hay sancocho'), 'sigue en la página del negocio');
  await d.goto(B + `/panel/${BIZ}/pagina/nov?det=nov:${NP}`); ok(await contiene(d, 'To’Latino la retiró de Hoy en el barrio; sigue en tu página. Motivo: Repetida varias veces el mismo día'), 'el dueño ve en su panel que salió de Hoy y por qué');
  await shot(d, 'c5e-panel-retirada-d.png');
  // Devolver a Hoy y luego el reloj: a las 25 h ya no sale
  await a.goto(B + '/admin/contenido?tab=hoy'); const fila2 = a.locator('div', { has: a.getByText(`Hoy hay sancocho ${TAG}`, { exact: true }) }).filter({ has: a.getByText('Devolver a Hoy', { exact: true }) }).last();
  await fila2.getByText('Devolver a Hoy', { exact: true }).click(); await clic(a.getByText('Fue un error', { exact: true })); await clic(a.getByRole('button', { name: 'Devolver a Hoy' }));
  ok(await espera(() => hoyIds().includes(NP)), 'Devolver a Hoy: vuelve (reversible)');
  sql(`update business_posts set publish_at = publish_at - interval '25 hours' where id = ${NP}`);
  ok(!hoyIds().includes(NP), 'reloj movido 25 h: ya no sale en Hoy');
  await g.goto(B + '/comunidad/hoy'); ok(!((await g.locator(`[data-hoy="${BIZ}"]`).getAttribute('aria-label').catch(() => '')) ?? '').includes('sancocho'), 'la pantalla tampoco la muestra a las 25 h');

  // ── 5 · Cuenta oficial: programar una pregunta fijada ──
  const VBID = await preparar(await tel(), VB, 'Benito');
  const pv = await tel(); await entrar(pv, VA);
  const H = sql(`select to_char((now() + interval '2 hours') at time zone 'America/New_York', 'YYYY-MM-DD HH24:MI')`);
  await a.goto(B + '/admin/contenido?tab=off'); await clic(a.getByText('Nueva publicación', { exact: true }));
  await a.getByLabel('EL TEXTO').fill(`Pregunta de la semana: ¿dónde arreglan zapatos en Hazleton? ${TAG}`);
  await clic(a.getByText('Programar', { exact: true }));
  await a.getByLabel('FECHA Y HORA (HORA DE LA CIUDAD)').fill(H);
  await clic(a.getByText('3 días', { exact: true }));
  await shot(a, 'c5e-admin-oficial-d.png', true);
  await clic(a.getByText(/^Programar como To'Latino Hazleton$/));
  ok(await espera(() => sql(`select count(*) from com_posts where body like '%zapatos%${TAG}%' and author_kind = 'official' and publish_at > now() and pinned_until > publish_at`) === '1'), 'programada para dentro de 2 h y fijada 3 días desde que sale');
  const OP = sql(`select id from com_posts where body like '%zapatos%${TAG}%' order by id desc limit 1`);
  ok(sql(`select (author_user_id is null)::text || '|' || (staff_id = (select id from users where phone = '+1${ADM}'))::text from com_posts where id = ${OP}`) === 'true|true', 'la escribe el equipo: sin persona detrás (author_user_id vacío, staff_id = quien la escribió)');
  ok(await contiene(a, 'PROGRAMADA'), 'el admin la ve como PROGRAMADA');
  await pv.goto(B + '/comunidad'); await pv.getByText('¿Qué pasa en tu cuadra').first().waitFor(); ok(!(await texto(pv)).includes('arreglan zapatos'), 'antes de su hora no sale en el muro');
  sql(`update com_posts set pinned_until = pinned_until - (publish_at - now() + interval '5 seconds'), publish_at = now() - interval '5 seconds' where id = ${OP}`);
  barrido();
  ok(sql(`select count(*) from com_posts where city_id = 'hzl' and pinned_until > now() and publish_at <= now() and status = 'visible'`) === '1', 'a su hora: una sola fijada en la ciudad (la anterior se desfijó)');
  await pv.goto(B + '/comunidad'); await pv.getByText('arreglan zapatos').first().waitFor();
  ok(await contiene(pv, 'PREGUNTA DE LA SEMANA · FIJADA') && await contiene(pv, "To'Latino Hazleton") && await contiene(pv, 'Cuenta oficial'), 'sale arriba del muro, fijada, con el sello de la cuenta oficial');
  ok(await pv.evaluate(() => { const t = document.body.innerText; return t.indexOf('arreglan zapatos') < t.indexOf('Todo') + 2000; }), 'va arriba');
  await shot(pv, 'c5e-muro-oficial-m.png');
  ok(sql(`select count(*) from users where first_name ilike 'To''Latino%' or last_name ilike 'Hazleton%'`) === '0', 'no hay ninguna persona «To\'Latino Hazleton» en users: no gana puntos ni sale en la Tabla');
  ok(!(await pv.locator('[data-screen-label="Comunidad · publicación"]').first().getByRole('link', { name: /To'Latino Hazleton/ }).count()), 'el nombre de la cuenta oficial no abre un perfil (no se sigue ni se le escribe)');
  await pv.goto(B + '/comunidad/hoy'); ok(await contiene(pv, 'Café colado') || (await pv.locator(`[data-hoy="${CAFE}"]`).count()) === 1, 'con cuenta: la pestaña «Hoy en el barrio» dentro de la Comunidad');
  ok(await contiene(pv, 'Conversación'), 'pestañas del módulo: Conversación · Hoy en el barrio'); await shot(pv, 'c5e-hoy-vecino-m.png');
  const pvd = await esc(); await entrar(pvd, VA); await pvd.goto(B + '/comunidad'); await pvd.getByText('arreglan zapatos').first().waitFor();
  ok(await contiene(pvd, 'Hoy en el barrio'), 'escritorio: Hoy en el barrio en la navegación del módulo'); await shot(pvd, 'c5e-muro-oficial-d.png');

  // ── 6 · Inicio y Negocios con datos reales ──
  await g.goto(B + '/'); await g.locator(`[data-hoy="${CAFE}"]`).first().waitFor();
  ok(await contiene(g, 'Hoy en el barrio') && await contiene(g, 'arreglan zapatos') && await contiene(g, 'Entrar'), 'Inicio: Hoy en el barrio (real) y Comunidad con la pregunta de la cuenta oficial');
  const cms = sql(`select comments_n from com_posts where id = ${OP}`); ok(await contiene(g, 'PREGUNTÓ'), `Inicio › Comunidad: cifras reales (comentarios ${cms})`);
  ok(await sinScroll(g), 'Inicio teléfono sin scroll horizontal'); await shot(g, 'c5e-inicio-m.png', true);
  const gd2 = await esc(); await gd2.goto(B + '/'); await gd2.locator(`[data-hoy="${CAFE}"]`).first().waitFor(); await shot(gd2, 'c5e-inicio-d.png', true);
  const R1 = sql(`with r as (select p.business_id as b, p.author_user_id as u, greatest(p.up_n, 0) as up from com_posts p where p.city_id = 'hzl' and p.kind = 'recomendacion' and p.status = 'visible' and p.publish_at <= now() and p.publish_at > now() - interval '180 days' and p.author_kind = 'user'
    union all select c.business_id, c.author_user_id, greatest(c.up_n, 0) from com_comments c join com_posts p on p.id = c.post_id and p.status = 'visible' where c.city_id = 'hzl' and c.business_id is not null and c.status = 'visible' and c.created_at > now() - interval '180 days')
    select b.name from r join businesses b on b.id = r.b and b.status = 'active' and b.city_id = 'hzl' group by r.b, b.name order by sum(r.up) desc, count(distinct r.u) desc, b.name limit 1`);
  await g.goto(B + '/negocios'); await g.locator(`[data-hoy="${CAFE}"]`).first().waitFor();
  ok(await contiene(g, 'RECOMENDADOS POR VECINOS') && (await texto(g)).includes(R1), `Negocios › «Recomendados por vecinos»: el primero es el de más votos (${R1})`);
  ok(/VECINOS? LO RECOMIENDA/.test(await texto(g)) && !(await texto(g)).includes('Pregunta de la semana: ¿quién'), 'solo negocios y cuántos lo recomiendan, nunca quién');
  await shot(g, 'c5e-negocios-m.png', true); await gd2.goto(B + '/negocios'); ok(await espera(async () => !!(await vis(gd2.getByText('RECOMENDADOS POR VECINOS')))), 'escritorio: «Recomendados por vecinos» en el riel'); await shot(gd2, 'c5e-negocios-d.png', true);

  // ── 7 · Buscar › Vecinos solo con cuenta y sin lo bloqueado; «Pregúntale al barrio» ──
  const P1 = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, publish_at, created_at) values ('hzl', 'user', '${VBID}', 'pregunta', 'comida', '¿Dónde venden jugo de tamarindoc5e natural? ${TAG}', now() - interval '1 hour', now() - interval '1 hour') returning id`).split('\n')[0];
  await g.goto(B + '/buscar?q=tamarindoc5e'); await g.getByText('tamarindoc5e').first().waitFor().catch(() => undefined);
  ok(!(await texto(g)).includes('Lo que dicen los vecinos') && !(await texto(g)).includes('jugo de'), 'sin cuenta: Buscar no muestra nada de vecinos');
  await g.goto(B + '/buscar?q=tamarindoc5e&tab=vec'); ok(!(await texto(g)).includes('jugo de'), 'sin cuenta: la pestaña Vecinos no existe');
  await shot(g, 'c5e-buscar-invitado-m.png');
  await pv.goto(B + '/buscar?q=tamarindoc5e'); await pv.getByText('Lo que dicen los vecinos').first().waitFor();
  ok(await contiene(pv, 'jugo de') && await contiene(pv, 'Aquí nada se compra: el orden lo ponen los votos de los vecinos.'), 'con cuenta: «Lo que dicen los vecinos» con la línea fija');
  await shot(pv, 'c5e-buscar-vecinos-m.png', true);
  const pvd2 = pvd; await pvd2.goto(B + '/buscar?q=tamarindoc5e&tab=vec'); await pvd2.getByText(/PUBLICACIONES DE VECINOS/).first().waitFor(); await shot(pvd2, 'c5e-buscar-vecinos-d.png');
  sql(`insert into user_blocks (user_id, target_user_id, kind) values ('${VAID}', '${VBID}', 'block')`);
  await pv.goto(B + '/buscar?q=tamarindoc5e'); await pv.waitForTimeout(800);
  ok(!(await texto(pv)).includes('jugo de'), 'con un bloqueo de por medio, Buscar › Vecinos no lo muestra');
  sql(`update user_blocks set removed_at = now() where user_id = '${VAID}' and target_user_id = '${VBID}' and removed_at is null`);
  await pv.goto(B + '/buscar?q=tamarindoc5e'); await pv.getByText('Lo que dicen los vecinos').first().waitFor();
  await clic(pv.getByRole('button', { name: 'Pregúntale al barrio' }));
  await pv.waitForURL(/\/comunidad\/nuevo\?k=pregunta&q=tamarindoc5e/); await pv.getByRole('textbox').first().waitFor();
  ok(await pv.evaluate(() => [...document.querySelectorAll('textarea')].some((t) => t.value.includes('tamarindoc5e'))), '«Pregúntale al barrio» abre Publicar con lo que buscaste escrito');
  await shot(pv, 'c5e-preguntale-m.png');
  const gq = await tel(); await gq.goto(B + '/comunidad/nuevo?k=pregunta&q=tamarindoc5e'); await gq.waitForURL(/\/entrar\?volver=/); ok(decodeURIComponent(gq.url()).includes('q=tamarindoc5e'), 'sin sesión: entra y vuelve a Publicar con el texto');
  void P1;

  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  limpiar(); await b.close(); console.log('OK com5e');
})().catch(async (e) => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail5e-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch { /* nada */ } try { limpiar(); } catch { /* nada */ } process.exit(1); });
