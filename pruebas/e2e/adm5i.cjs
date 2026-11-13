// 5i · Super Admin completo de la Fase 5: Configuración (dentro de los límites → auditoría antes → después y el comportamiento cambia: editar
// 30 → 20 min rechaza una edición a los 25 min; fuera de los límites → rechazado por la acción y por la base), Contenido (7 pestañas,
// filtros, cursor, el hilo con el comentario marcado, «Ocultar los N reportados» con progreso y fallo parcial sin tocar la cuenta oficial,
// mover de ciudad), Usuarios 360° › Comunidad contra SQL (y «Abrir caso de red de cuentas»), filtros de la lista, Analítica › Comunidad
// contra SQL, Notificaciones › Solo Comunidad, y el resumen diario (una vez por día con el reloj movido, sin lo de alguien bloqueado, y
// «Respuestas y votos» apagado = no llega). Escritorio 1360 y un pase en teléfono 390. Deja la configuración y sus datos como estaban.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlFalla = (q) => { try { sql(q); return null; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 32; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const TAG = '[a5i]', RUN = Date.now().toString(36);
const A = '5705550299', BB = '5705550288', C = '5705550122', ADM = '5705550199';
const KEYS = ['com_editar_min', 'com_resumen_hora'];

(async () => {
  const RA = uid(A), RB = uid(BB), RC = uid(C), SA = uid(ADM), IDS = [RA, RB, RC], T0 = sql('select now()');
  const q = (x) => IDS.map((y) => `'${y}'`).join(', ');
  // ── Punto de partida y lo que hay que dejar igual ──
  const CFG0 = Object.fromEntries(KEYS.map((k) => [k, sql(`select coalesce((select value::text from platform_config where key = '${k}'), '-')`)]));
  const PREF0 = sql(`select notif_prefs::text from users where id = '${RB}'`);
  const OTROS = sql(`select coalesce(string_agg(id::text, ','), '') from content_reports where status = 'open' and target_kind in ('com_post', 'com_comment')`);
  const limpiar = () => {
    sql(`update com_comments set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days' where body like '%${TAG}%' and status <> 'deleted'`);
    sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days', publish_at = publish_at - interval '2 days' where body like '%${TAG}%' and status <> 'deleted'`);
    sql(`update content_reports set status = 'dismissed', decided_at = now() where status = 'open' and note like '%${TAG}%'`);
    sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and ((subject_kind in ('com_post', 'com_comment') and subject_id in (select id::text from com_posts where body like '%${TAG}%' union select id::text from com_comments where body like '%${TAG}%')) or (queue = 'repUsr' and subject_id = '${RA}'))`);
    sql(`update user_blocks set removed_at = now() where removed_at is null and user_id in (${q()}) and target_user_id in (${q()})`);
    sql(`update sessions set signed_out_at = now() where token_hash like 'prueba-a5i-%' and signed_out_at is null`);
    // El resumen de la prueba: lo guardado que quedó (lo de C, bloqueado) sale como leído y los resúmenes de prueba de BB se olvidan.
    sql(`update notifications set held_digest = false, read_at = coalesce(read_at, now()) where user_id = '${RB}' and held_digest and digest_id is null`);
    sql(`delete from notif_digests where user_id = '${RB}'`);
  };
  limpiar();
  if (OTROS) sql(`update content_reports set status = 'dismissed' where id in (${OTROS})`); // lo reportado de otras pruebas no entra al lote; vuelve al final
  for (const u of IDS) sql(`insert into community_profiles (user_id) values ('${u}') on conflict do nothing`);
  sql(`update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true, adult_ok_at = coalesce(adult_ok_at, now()), welcome_at = coalesce(welcome_at, now()) where user_id in (${q()})`);
  sql(`update users set status = 'active', status_until = null where id in (${q()})`);
  sql(`update users set notif_prefs = notif_prefs - 'dig' - 'com' - 'msg' where id = '${RB}'`);
  for (const k of KEYS) sql(`delete from platform_config where key = '${k}'`); // de fábrica: 30 min y 7 PM (el catálogo)

  const b = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404/.test(m.text())) err.push('console: ' + m.text()); }); };
  const nueva = async (w, h) => { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1 }); const p = await c.newPage(); mira(p); return p; };
  try {
    const ad = await nueva(1360, 900); await entrar(ad, ADM);

    // ── 1 · Configuración: dentro de los límites → auditado; fuera → rechazado (acción y base) ──
    await ad.goto(B + '/admin/sistema/configuracion');
    ok(await contiene(ad, 'Editar una publicación') && await contiene(ad, 'COMUNIDAD') && await contiene(ad, 'DOCTORES Y PROFESIONALES') && await contiene(ad, 'SOLO LECTURA'), 'Configuración: secciones, valores y los de solo lectura con su motivo');
    ok(await contiene(ad, 'Auto-ocultar por reportes'), 'el umbral de auto-ocultar se ve (se cambia con su regla)');
    await ad.screenshot({ path: OUT + 'g5i-config-d.png', fullPage: true });
    const cambiar = async (label, v, plantilla = 'Ajuste con datos reales') => {
      await ad.goto(B + '/admin/sistema/configuracion'); await clic(ad.getByText(label, { exact: true }));
      const f = await vis(ad.locator('input[aria-label^="VALOR NUEVO"]')); await f.fill(String(v));
      await clic(ad.getByText(plantilla, { exact: true })); await clic(ad.getByRole('button', { name: 'Guardar', exact: true }).last());
    };
    const n0 = Number(sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id = 'com_editar_min'`));
    await cambiar('Editar una publicación', 20);
    ok(await espera(() => sql(`select value::text from platform_config where key = 'com_editar_min'`) === '20'), 'com_editar_min = 20 guardado');
    const au = sql(`select before::text || ' → ' || after::text || ' · ' || reason || ' · ' || (actor_id = '${SA}') from audit_entries where action = 'config.cambiar' and target_id = 'com_editar_min' order by id desc limit 1`);
    ok(Number(sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id = 'com_editar_min'`)) === n0 + 1 && au.includes('30 min') && au.includes('20 min') && au.endsWith('true'), `auditoría antes → después: ${au}`);
    await cambiar('Editar una publicación', 2);
    ok(await contiene(ad, 'Entre 5 min y 1,440 min.') && sql(`select value::text from platform_config where key = 'com_editar_min'`) === '20', 'fuera de los límites (2 min): la acción lo rechaza y nada cambia');
    await ad.screenshot({ path: OUT + 'g5i-config-fuera-d.png' });
    ok(/fuera de los límites/.test(sqlFalla(`update platform_config set value = '3000' where key = 'com_editar_min'`) || ''), 'la base también rechaza un valor fuera de los límites (trigger)');
    ok(/entero/.test(sqlFalla(`update platform_config set value = '20.5' where key = 'com_editar_min'`) || ''), 'la base rechaza un valor que no es entero');
    await ad.goto(B + '/admin/sistema/configuracion'); await clic(ad.getByText('El negocio responde una ayuda en', { exact: true }));
    ok(await contiene(ad, 'Todavía no se cambia aquí'), 'un valor bloqueado (un texto dice el número) no se edita y dice por qué');

    // ── 2 · El comportamiento cambia: con 20 min, una publicación de hace 25 min ya no se edita; con 30, sí ──
    const P25 = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, lang) values ('hzl', 'user', '${RA}', 'pregunta', 'otro', 'Alguien sabe de una buena panadería por la Wyoming? ${TAG}', 'es') returning id`).split('\n')[0];
    sql(`update com_posts set created_at = now() - interval '25 minutes' where id = ${P25}`);
    const ap = await nueva(390, 844); await entrar(ap, A);
    await ap.goto(B + `/comunidad/nuevo?editar=${P25}`);
    ok(await contiene(ap, 'Ya no se puede editar') && await contiene(ap, 'Ya pasó el tiempo para editarla'), 'con 20 min: la edición a los 25 min se rechaza');
    await ap.screenshot({ path: OUT + 'g5i-editar-20-m.png' });
    await cambiar('Editar una publicación', 30, 'Volver al de fábrica');
    ok(await espera(() => sql(`select value::text from platform_config where key = 'com_editar_min'`) === '30'), 'vuelta a 30 min (auditada)');
    await ap.goto(B + `/comunidad/nuevo?editar=${P25}`);
    ok(await espera(async () => !(await texto(ap)).includes('Ya no se puede editar') && (await texto(ap)).includes('Editar publicación')), 'con 30 min: la misma publicación se edita');

    // ── 3 · Contenido: 7 pestañas, filtros, cursor ──
    await ad.goto(B + '/admin/contenido');
    const t0 = await texto(ad);
    ok(['Todo', 'Publicaciones', 'Comentarios', 'Hoy en el barrio', 'Reseñas', 'Auto-moderación', 'Cuenta oficial'].every((x) => t0.includes(x)) && t0.includes('Vacantes') && t0.includes('TIPO'), 'las 7 pestañas del prototipo (novedades y vacantes por «Tipo»)');
    await ad.screenshot({ path: OUT + 'g5i-contenido-d.png', fullPage: true });
    { // Cursor: Todo trae más de 20; «→» va por ?c= (nunca offset) y trae otras filas; «←» vuelve.
      ok(Number(sql(`select (select count(*) from com_posts where status <> 'deleted') + (select count(*) from reviews where status <> 'removed') + (select count(*) from com_comments where status <> 'deleted')`)) > 20, 'hay más de 20 cosas para paginar');
      await ad.goto(B + '/admin/contenido'); const f1 = await texto(ad);
      await clic(ad.getByText('→', { exact: true }));
      ok(await espera(() => /[?&]c=/.test(ad.url())), 'cursor: la página siguiente va por ?c= (sin offset)');
      ok(await espera(async () => (await texto(ad)) !== f1), 'la página siguiente trae otras filas');
    }
    await ad.goto(B + '/admin/contenido?tab=pub&inv=1');
    const nInv = Number(sql(`select count(*) from com_posts where status <> 'deleted' and guest_from_city_id is not null`));
    ok(nInv ? await contiene(ad, 'invitado') : await contiene(ad, 'Nada aquí'), `filtro «De invitados» (${nInv} en la base)`);

    // ── 4 · «Ocultar los N reportados»: 2 publicaciones + 1 comentario de vecinos + 1 de la cuenta oficial ──
    const P1 = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, lang) values ('hzl', 'user', '${RA}', 'publicacion', null, 'Vendo tenis nuevos baratos, pregunten ${TAG}', 'es') returning id`).split('\n')[0];
    const P2 = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, lang) values ('hzl', 'user', '${RB}', 'publicacion', null, 'Rifa de una bocina, compren su número ${TAG}', 'es') returning id`).split('\n')[0];
    const PO = sql(`insert into com_posts (city_id, author_kind, author_user_id, staff_id, kind, topic, body, lang) values ('hzl', 'official', null, '${SA}', 'publicacion', null, 'Aviso de la ciudad: limpieza de la Wyoming el sábado ${TAG}', 'es') returning id`).split('\n')[0];
    const CM = sql(`insert into com_comments (post_id, author_user_id, body, lang) values (${P25}, '${RB}', 'Pásate por la de la 9, abren temprano ${TAG}', 'es') returning id`).split('\n')[0];
    const CM2 = sql(`insert into com_comments (post_id, author_user_id, body, lang) values (${P25}, '${RC}', 'Esa está buena, yo voy los domingos ${TAG}', 'es') returning id`).split('\n')[0];
    for (const [k, id] of [['com_post', P1], ['com_post', P2], ['com_post', PO], ['com_comment', CM]]) sql(`insert into content_reports (target_kind, target_id, city_id, reporter_user_id, reason, note) values ('${k}', '${id}', 'hzl', '${RC}', 'spam', 'prueba ${TAG}')`);
    await ad.goto(B + '/admin/contenido?rep=1');
    ok(await contiene(ad, 'Ocultar los 4 reportados'), 'el botón dice cuántos reportados se ven (4)');
    await clic(ad.getByText('Ocultar los 4 reportados', { exact: true }));
    await clic(ad.getByText('Spam o publicidad', { exact: true }));
    await clic(ad.getByRole('button', { name: 'Ocultar en lote', exact: true }).last());
    ok(await contiene(ad, 'OCULTAR REPORTADOS', 8000) && await contiene(ad, 'Terminado', 15000), 'progreso del lote (BatchProgress) hasta «Terminado»');
    ok(await contiene(ad, '3 ocultos. No se pudieron 1') && await contiene(ad, 'cuenta oficial'), 'fallo parcial mostrado: la cuenta oficial no se oculta en lote');
    await ad.screenshot({ path: OUT + 'g5i-lote-d.png', fullPage: true });
    ok(sql(`select status from com_posts where id = ${PO}`) === 'visible' && sql(`select count(*) from content_reports where target_kind = 'com_post' and target_id = '${PO}' and status = 'open'`) === '1', 'la publicación oficial sigue visible y su reporte sigue abierto');
    ok(sql(`select string_agg(status || ':' || hidden_by, ',' order by id) from com_posts where id in (${P1}, ${P2})`) === 'hidden:admin,hidden:admin' && sql(`select status from com_comments where id = ${CM}`) === 'hidden', 'las 2 publicaciones y el comentario quedan ocultos por una persona');
    ok(sql(`select count(*) from content_reports where target_id in ('${P1}', '${P2}', '${CM}') and status = 'actioned'`) === '3' && sql(`select count(*) from audit_entries where action like 'com.%.ocultar_lote' and target_id in ('${P1}', '${P2}', '${CM}')`) === '3', 'reportes resueltos y 3 entradas en la auditoría');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RA}' and tpl = 'com_hide' and ref_id = '${P1}'`) === '1'), 'la autora recibe el aviso con el motivo (y Apelar)');

    // ── 5 · El hilo con el comentario marcado ──
    await ad.goto(B + `/admin/contenido/hilo/${P25}?c=${CM2}`);
    ok(await espera(async () => (await ad.locator('[data-adm-focus]').count()) === 1) && (await ad.locator('[data-adm-focus]').innerText()).includes('yo voy los domingos'), 'el hilo marca el comentario de origen (data-adm-focus)');
    ok(await contiene(ad, 'COMENTARIO DE ORIGEN') && await contiene(ad, 'OCULTO'), 'se ve marcado y el comentario oculto con su estado');
    await ad.screenshot({ path: OUT + 'g5i-hilo-d.png', fullPage: true });

    // ── 6 · Mover de ciudad ──
    await ad.goto(B + `/admin/contenido?tab=pub&q=${encodeURIComponent('buena panadería')}`);
    await clic(ad.getByText('Mover de ciudad', { exact: true }));
    await clic(ad.getByText('Allentown', { exact: true })); await clic(ad.getByText('Habla de otra ciudad', { exact: true })); await clic(ad.getByRole('button', { name: 'Mover', exact: true }).last());
    ok(await espera(() => sql(`select city_id from com_posts where id = ${P25}`) === 'alw') && sql(`select count(*) from com_comments where post_id = ${P25} and city_id <> 'alw'`) === '0', 'movida a Allentown con sus comentarios');
    ok(sql(`select count(*) from audit_entries where action = 'com.publicacion.mover' and target_id = '${P25}'`) === '1', 'mover queda en la auditoría');

    // ── 7 · Usuarios 360° › Comunidad contra SQL; «posible red» → caso ──
    sql(`insert into follows (follower_user_id, target_kind, target_id) values ('${RB}', 'user', '${RA}') on conflict do nothing`);
    sql(`insert into sessions (user_id, token_hash, platform, app, created_at, last_seen_at, expires_at, blocked, device) select '${RB}', 'prueba-a5i-' || gen_random_uuid(), platform, app, now(), now(), now(), false, device from sessions where user_id = '${RA}' and device is not null order by created_at desc limit 1`);
    await ad.goto(B + `/admin/usuarios/${RA}?tab=comunidad`);
    const rk = sql(`select coalesce((select rank_level from community_profiles where user_id = '${RA}'), 1)`), pts = Number(sql(`select coalesce(points_total, 0) from community_profiles where user_id = '${RA}'`)), mon = Number(sql(`select coalesce(coins, 0) from community_profiles where user_id = '${RA}'`));
    const up = sql(`select (select coalesce(sum(up_n), 0) from com_posts where author_user_id = '${RA}' and status = 'visible') + (select coalesce(sum(up_n), 0) from com_comments where author_user_id = '${RA}' and status = 'visible')`);
    const t7 = await texto(ad);
    ok(t7.includes(`RANGO ${rk}`) && t7.includes(pts.toLocaleString('en-US')) && t7.includes(mon.toLocaleString('en-US')) && t7.includes(`+${up}`), `360° › Comunidad = SQL (rango ${rk}, ${pts} puntos, ${mon} monedas, +${up} votos)`);
    ok(['Publicaciones', 'Comentarios', 'Seguidores y siguiendo', 'Puntos y monedas', 'Cupones y referidos'].every((x) => t7.includes(x)) && !t7.includes('El Patio'), 'sub-pestañas sin El Patio');
    ok(t7.includes('buena panadería'), 'Publicaciones lista lo suyo');
    await ad.screenshot({ path: OUT + 'g5i-u360-d.png', fullPage: true });
    ok(t7.includes('posible red de cuentas'), '«posible red»: un seguidor entró desde su mismo dispositivo');
    await clic(ad.getByText('Abrir caso de red de cuentas', { exact: true })); await clic(ad.getByText('Seguidores desde el mismo dispositivo', { exact: true })); await clic(ad.getByRole('button', { name: 'Abrir caso', exact: true }).last());
    ok(await espera(() => sql(`select count(*) from queue_items where queue = 'repUsr' and subject_kind = 'user' and subject_id = '${RA}' and status = 'open'`) === '1')
      && sql(`select count(*) from audit_entries where action = 'usuario.red.caso' and target_id = '${RA}'`) !== '0', 'caso de red abierto en Reportes de usuario y auditado');
    await ad.goto(B + `/admin/usuarios/${RA}?tab=comunidad&sub=cup`); ok(await contiene(ad, 'CUPONES CANJEADOS') && await contiene(ad, 'REFERIDOS'), 'Cupones y referidos');
    await ad.goto(B + `/admin/usuarios/${RA}?tab=comunidad&sub=pym`); ok(await contiene(ad, 'PUNTOS Y RANGO') && await contiene(ad, 'MONEDAS · SIN VALOR EN DINERO'), 'Puntos y monedas');
    // Filtros de la lista: rango 9 o más.
    const r9 = sql(`select count(*) from users u where u.status not in ('deleted','merged') and coalesce((select rank_level from community_profiles cp where cp.user_id = u.id), 1) >= 9`);
    await ad.goto(B + '/admin/usuarios?rk=9');
    const n9 = sql(`select coalesce(string_agg(coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), '?'), '|'), '') from users u where coalesce((select rank_level from community_profiles cp where cp.user_id = u.id), 1) >= 9 and u.status not in ('deleted', 'merged')`).split('|').filter(Boolean);
    const t9 = await texto(ad);
    ok(n9.length === Number(r9) && n9.slice(0, 5).every((x) => t9.includes(x)), `lista › rango 9 o más = SQL (${r9})`);

    // ── 8 · Analítica › Comunidad contra SQL (sin personas) ──
    // 9b-3 · Analítica › Comunidad lee el derivado por ciudad y día (0133) que el barrido rehace cada 10 min: aquí se rehace como lo hace él.
    sql(`select com_analitica_resumir((now() at time zone 'America/New_York')::date - 40)`);
    await ad.goto(B + '/admin/analitica?tab=com&p=30');
    const D = `(now() at time zone 'America/New_York')::date - 29`;
    const pubs = Number(sql(`select count(*) from com_posts p join cities ci on ci.id = p.city_id where p.status <> 'deleted' and p.author_kind = 'user' and (p.created_at at time zone ci.timezone)::date >= ${D}`));
    const cms = Number(sql(`select count(*) from com_comments c join cities ci on ci.id = c.city_id where c.status <> 'deleted' and (c.created_at at time zone ci.timezone)::date >= ${D}`));
    const emit = Number(sql(`select coalesce(sum(delta), 0) from coin_entries e join cities ci on ci.id = e.city_id where reason_key in ('welcome', 'premio_mes') and (e.created_at at time zone ci.timezone)::date >= ${D}`));
    const canj = Number(sql(`select count(*) from coupon_redemptions r join cities ci on ci.id = r.city_id where (r.created_at at time zone ci.timezone)::date >= ${D}`));
    const tA = await texto(ad);
    ok(tA.includes(`PUBLICACIONES ${pubs.toLocaleString('en-US')}`) && tA.includes(`COMENTARIOS ${cms.toLocaleString('en-US')}`), `publicaciones (${pubs}) y comentarios (${cms}) = SQL`);
    ok(tA.includes(`MONEDAS EMITIDAS ${emit.toLocaleString('en-US')}`) && tA.includes(`CANJES ${canj}`), `monedas emitidas (${emit}) y canjes (${canj}) = SQL`);
    ok(tA.includes('VECINOS ACTIVOS POR RANGO') && tA.includes('CANJES POR NEGOCIO') && tA.includes('POR CIUDAD') && !/5705550|\(570\)/.test(tA), 'por rango, por negocio y por ciudad; ningún teléfono ni persona');
    await ad.screenshot({ path: OUT + 'g5i-analitica-d.png', fullPage: true });

    // ── 9 · Notificaciones › Solo Comunidad ──
    await ad.goto(B + '/admin/notificaciones?com=1');
    ok(await contiene(ad, 'Solo Comunidad') && await contiene(ad, 'COMUNIDAD · SE APAGA O VA EN EL RESUMEN DIARIO') && await contiene(ad, 'Tu día en la Comunidad'), 'Notificaciones › Solo Comunidad con el grupo y el resumen');
    ok(sql(`select count(*) from notif_templates where key ~ '^(com|gam|dm)_' and sms`) === '0', 'ninguna plantilla de la Comunidad va con SMS');
    await ad.screenshot({ path: OUT + 'g5i-notif-d.png', fullPage: true });

    // ── 10 · Resumen diario: BB pide «Un resumen al día» (Mi cuenta › Avisos) ──
    const bp = await nueva(390, 844); await entrar(bp, BB);
    await bp.goto(B + '/cuenta/avisos');
    ok(await contiene(bp, 'COMUNIDAD') && await contiene(bp, 'Un resumen al día en vez de cada aviso') && await contiene(bp, 'A LAS 7 PM'), 'Mi cuenta › Avisos › Comunidad (la hora sale de Configuración)');
    await clic(bp.getByText('Un resumen al día en vez de cada aviso', { exact: true }).locator('xpath=ancestor::*[.//*[@role="switch"]][1]').locator('[role="switch"]').first());
    ok(await espera(() => sql(`select notif_prefs->>'dig' from users where id = '${RB}'`) === 'true'), 'BB eligió el resumen diario');
    await bp.screenshot({ path: OUT + 'g5i-avisos-m.png', fullPage: true });
    const PB = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, lang) values ('hzl', 'user', '${RB}', 'pregunta', 'comida', 'Dónde venden yuca fresca por aquí? ${TAG}', 'es') returning id`).split('\n')[0];
    const comentar = async (p, t) => { await p.goto(B + '/comunidad/p/' + PB); await p.getByLabel('Tu comentario').waitFor(); await p.getByLabel('Tu comentario').fill(t); await clic(p.getByRole('button', { name: 'Comentar', exact: true })); };
    const held = () => sql(`select count(*) from notifications where user_id = '${RB}' and tpl = 'com_comment' and held_digest and digest_id is null`);
    await comentar(ap, `En el colmado de la Alter la tienen los martes ${RUN} ${TAG}`);
    ok(await espera(() => held() === '1'), 'el comentario de A queda guardado para el resumen (no sale en la campana)');
    const cp = await nueva(390, 844); await entrar(cp, C);
    await comentar(cp, `Yo la compro en el supermercado de la 9 ${TAG}`);
    ok(await espera(() => held() === '2'), 'el de C también queda guardado');
    sql(`insert into user_blocks (user_id, target_user_id, kind) values ('${RB}', '${RC}', 'block')`);
    await cambiar('Hora del resumen diario de la Comunidad', 0, 'Lo pidió el fundador');
    ok(await espera(() => sql(`select value::text from platform_config where key = 'com_resumen_hora'`) === '0'), 'Configuración: la hora del resumen a las 0 (para la prueba)');
    barrer();
    const dig = () => sql(`select count(*) from notifications where user_id = '${RB}' and tpl = 'com_resumen' and created_at >= '${T0}'`);
    ok(await espera(() => dig() === '1'), 'el barrido manda UN resumen');
    const cuerpo = sql(`select body from notifications where user_id = '${RB}' and tpl = 'com_resumen' order by id desc limit 1`);
    ok(cuerpo === 'Hoy en la Comunidad: 1 respuesta.', `sin lo de alguien bloqueado: «${cuerpo}»`);
    barrer(); barrer();
    ok(dig() === '1', 'correr el barrido otra vez no manda otro el mismo día');
    await bp.goto(B + '/avisos'); ok(await contiene(bp, 'Tu día en la Comunidad') && !(await texto(bp)).includes(`la tienen los martes ${RUN}`), 'la campana trae el resumen, no cada aviso');
    await bp.screenshot({ path: OUT + 'g5i-resumen-m.png', fullPage: true });
    // Reloj movido: el resumen de «ayer» ya salió; hoy llega otro con lo nuevo.
    sql(`update notif_digests set local_day = local_day - 1 where user_id = '${RB}' and local_day >= (now() at time zone 'America/New_York')::date - 1`);
    await comentar(ap, `También en la marqueta del sábado ${TAG}`);
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RB}' and tpl = 'com_comment' and held_digest and digest_id is null and actor_user_id = '${RA}'`) === '1'), 'un aviso nuevo guardado al día siguiente (lo de C sigue sin contarse)');
    barrer();
    ok(await espera(() => dig() === '2'), 'con el reloj movido un día, llega el resumen del día nuevo (uno)');
    // «Respuestas y votos» apagado: ni a la campana ni al resumen.
    sql(`update users set notif_prefs = notif_prefs || '{"com": false}'::jsonb where id = '${RB}'`);
    const antes = sql(`select count(*) from notifications where user_id = '${RB}' and tpl = 'com_comment'`);
    await comentar(ap, `Y en la frutería de la Broad ${TAG}`);
    await new Promise((r) => setTimeout(r, 1500));
    ok(sql(`select count(*) from notifications where user_id = '${RB}' and tpl = 'com_comment'`) === antes, '«Respuestas y votos» apagado: no llega');

    // ── 11 · Teléfono: Configuración, Contenido y 360° ──
    const am = await nueva(390, 844); await entrar(am, ADM);
    await am.goto(B + '/admin/sistema/configuracion'); await am.getByText('Editar una publicación', { exact: false }).first().waitFor(); await am.screenshot({ path: OUT + 'g5i-config-m.png', fullPage: true });
    await am.goto(B + '/admin/contenido?rep=1'); await am.getByText('Publicaciones', { exact: true }).first().waitFor(); await am.screenshot({ path: OUT + 'g5i-contenido-m.png', fullPage: true });
    ok(!(await texto(am)).includes('Ocultar los'), 'en el teléfono el lote no sale (como el prototipo: solo escritorio)');
    await am.goto(B + `/admin/contenido/hilo/${P25}?c=${CM2}`); await am.locator('[data-adm-focus]').waitFor(); await am.screenshot({ path: OUT + 'g5i-hilo-m.png', fullPage: true });
    await am.goto(B + `/admin/usuarios/${RA}?tab=comunidad`); await am.getByText('Seguidores y siguiendo', { exact: true }).first().waitFor(); await am.screenshot({ path: OUT + 'g5i-u360-m.png', fullPage: true });
    await am.goto(B + '/admin/analitica?tab=com'); await am.getByText('VECINOS ACTIVOS POR RANGO', { exact: false }).first().waitFor(); await am.screenshot({ path: OUT + 'g5i-analitica-m.png', fullPage: true });
    ok(true, 'pase en teléfono 390 (capturas g5i-*-m)');

    ok(!err.length, 'sin errores en la consola' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
  } finally {
    await b.close();
    // ── Dejar todo como estaba ──
    for (const k of KEYS) { if (CFG0[k] === '-') sql(`delete from platform_config where key = '${k}'`); else sql(`insert into platform_config (key, value) values ('${k}', '${CFG0[k]}'::jsonb) on conflict (key) do update set value = excluded.value`); }
    sql(`update users set notif_prefs = '${PREF0}'::jsonb where id = '${RB}'`);
    limpiar();
    sql(`delete from follows where follower_user_id = '${RB}' and target_kind = 'user' and target_id = '${RA}' and created_at > now() - interval '1 hour'`);
    if (OTROS) sql(`update content_reports set status = 'open' where id in (${OTROS})`);
  }
  console.log('adm5i ✓ todo');
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
