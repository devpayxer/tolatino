// 5a · Comunidad: muro, publicar y la publicación. Sin cuenta → muro de registro (sin nada de vecinos) · pregunta, recomendación con
// negocio y encuesta · teléfono y dirección exacta rechazados en la misma caja · la dueña no se recomienda a sí misma · editar dentro de
// 30 min sí y después no · borrar con Deshacer · chips, distancia, orden y «Ver más» por cursor · la fijada de la ciudad arriba · votar ·
// el Super Admin oculta con motivo (sale del muro, el autor lo ve y recibe el aviso) y restaura; fija y bloquea comentarios · la base
// rechaza un teléfono aunque se inserte directo, contadores y ubicación no se tocan a mano · el muro usa su índice. Teléfono y escritorio;
// crea sus propios datos (marcados [c5a]) y los deja borrados al terminar, así que se puede volver a correr.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { const x = await vis(l); if (!x) throw new Error('no visible: ' + l); await x.click(); };
const espera = async (f, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t) => espera(async () => (await texto(p)).includes(t));
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const TAG = '[c5a]';
const A = '5705550299', BB = '5705550288', Y = '5705550433', ADM = '5705550199';

(async () => {
  // ── Preparación: lo de corridas anteriores queda borrado (estado) y fuera de los límites de 24 h; rangos y sanciones conocidos. ──
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days', publish_at = publish_at - interval '2 days' where body like '%${TAG}%' and created_at > now() - interval '2 days'`);
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()) where body like '%${TAG}%' and status <> 'deleted'`);
  const RA = uid(A), RB = uid(BB), RY = uid(Y);
  const IDS = [RA, RB, RY];
  // 5c: la Comunidad pide la bienvenida (reglas + «Tengo 18 años o más»): las cuentas de prueba la tienen hecha.
  for (const u of IDS) sql(`insert into community_profiles (user_id) values ('${u}') on conflict do nothing`);
  sql(`update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true, adult_ok_at = coalesce(adult_ok_at, now()), welcome_at = coalesce(welcome_at, now()) where user_id in (${IDS.map((x) => `'${x}'`).join(', ')})`);
  for (const u of [RA, RB, RY]) sql(`insert into community_profiles (user_id) values ('${u}') on conflict do nothing`);
  const rangoA = sql(`select rank_level from community_profiles where user_id = '${RA}'`);
  sql(`select com_derivados_on(); update community_profiles set rank_level = 3 where user_id = '${RA}'`); // fixture: las encuestas se abren en Cabo (5f: el rango es derivado; la prueba enciende la marca de la base)
  sql(`update users set status = 'active', status_until = null where id in ('${RA}', '${RB}', '${RY}')`);
  sql(`update media set created_at = created_at - interval '2 hours' where uploaded_by = '${RA}' and created_at > now() - interval '1 hour'`);
  // 9b-3 · Lo que una corrida anterior dejó a medias (si falló antes de limpiar) no cuenta: se limpia al empezar, igual que al terminar.
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()), pinned_until = null where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update com_posts set pinned_until = now() + interval '5 days' where author_kind = 'official' and city_id = 'hzl' and body like 'Pregunta de la semana:%'`);
  // Para «Ver más»: 8 publicaciones viejas de B (fuera de su límite de 24 h), así el muro de Hazleton pasa de 20.
  for (let i = 1; i <= 8; i++) sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, body, publish_at, created_at) values ('hzl', 'user', '${RB}', 'publicacion', 'Paginación de prueba número ${i} del barrio ${TAG}', now() - interval '${60 + i} hours', now() - interval '${60 + i} hours')`);

  const b = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404/.test(m.text())) err.push('console: ' + m.text()); }); };
  const tel = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(p); return p; };
  const esc = async () => { const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(p); return p; };

  // ── 1 · Sin cuenta: muro de registro, nada de vecinos, noindex; publicar y la publicación piden entrar ──
  const g = await tel();
  await g.goto(B + '/comunidad'); await g.getByText('La conversación del barrio').first().waitFor();
  const html = await g.content();
  ok(!/mecánico honesto|pan de agua|Ramón|Altagracia/.test(html), 'sin cuenta: el HTML no trae textos ni nombres de vecinos');
  ok(await g.locator('meta[name="robots"][content*="noindex"]').count() > 0, 'noindex en la Comunidad');
  ok(await contiene(g, 'ASÍ VA LA CONVERSACIÓN HOY · SOLO VECINOS') && await contiene(g, 'Entrar con mi teléfono'), 'muro de registro: qué hay detrás y «Entrar con mi teléfono»');
  await g.screenshot({ path: OUT + 'c5a-invitado-m.png', fullPage: true });
  const ID0 = sql(`select id from com_posts where city_id = 'hzl' and status = 'visible' order by id limit 1`);
  await g.goto(B + '/comunidad/p/' + ID0); ok(/\/entrar\?volver=/.test(g.url()), 'sin cuenta: la publicación manda a entrar');
  await g.goto(B + '/comunidad/nuevo'); ok(/\/entrar\?volver=/.test(g.url()), 'sin cuenta: publicar manda a entrar');
  const gd = await esc(); await gd.goto(B + '/comunidad'); await gd.getByText('La conversación del barrio').first().waitFor();
  ok(await contiene(gd, 'VECINOS VERIFICADOS'), 'escritorio sin cuenta: portada con cifras reales');
  await gd.screenshot({ path: OUT + 'c5a-invitado-d.png', fullPage: true });

  // ── 2 · Vecina A en el teléfono: el muro con la fijada de la ciudad arriba ──
  const a = await tel(); await entrar(a, A);
  await a.goto(B + '/comunidad'); await a.getByText('¿Qué pasa en tu cuadra').first().waitFor();
  const primera = a.locator('[data-screen-label="Comunidad · publicación"]').first();
  ok((await primera.innerText()).includes('PREGUNTA DE LA SEMANA · FIJADA') && (await primera.innerText()).includes("To'Latino Hazleton"), 'la cuenta oficial de la ciudad, fijada arriba');
  await a.screenshot({ path: OUT + 'c5a-muro-m.png' });

  // ── 3 · Pregunta: teléfono y dirección rechazados en la misma caja; luego una de Salud con la línea del 911 ──
  const antes = () => sql(`select count(*) from com_posts where author_user_id = '${RA}' and body like '%${TAG}%' and status = 'visible'`);
  const n0 = antes();
  await a.goto(B + '/comunidad/nuevo?k=pregunta'); await a.getByLabel('TU PREGUNTA').waitFor();
  await a.getByLabel('TU PREGUNTA').fill(`¿Quién arregla neveras? Llámenme al 570-555-0123 ${TAG}`);
  await clic(a.getByRole('button', { name: 'Publicar', exact: true }));
  await a.getByRole('alert').filter({ hasText: 'No publiques teléfonos' }).first().waitFor();
  ok(await contiene(a, 'Recomienda el negocio: su teléfono sale en su página.'), 'teléfono → rechazado en la misma caja con el motivo');
  await a.screenshot({ path: OUT + 'c5a-telefono-m.png' });
  await a.getByLabel('TU PREGUNTA').fill(`¿Alguien vio a mi gato? Vivo en el 123 N Wyoming St ${TAG}`);
  await clic(a.getByRole('button', { name: 'Publicar', exact: true }));
  await a.getByRole('alert').filter({ hasText: 'Sin direcciones exactas' }).first().waitFor();
  ok(antes() === n0, 'dirección exacta → rechazada con el motivo; nada se guardó');
  await a.getByLabel('TU PREGUNTA').fill(`¿Dónde vacunan gratis a los niños esta semana? Mi hijo tiene tos ${TAG}`);
  await clic(a.getByRole('button', { name: 'Salud', exact: true }));
  await clic(a.getByRole('button', { name: 'Publicar', exact: true }));
  await a.waitForURL(/\/comunidad\/p\/\d+\?nueva=1/, { timeout: 15000 });
  const Q = a.url().match(/\/p\/(\d+)/)[1];
  ok(await contiene(a, 'Publicado. Lo ven tus vecinos de Hazleton'), 'pregunta publicada: «Publicado. Lo ven tus vecinos…»');
  ok(await contiene(a, 'Si es una emergencia, llama al 911.'), 'tema Salud → la línea del 911 en la publicación');
  ok(sql(`select kind || ':' || topic || ':' || health_notice || ':' || st_equals(p.geom::geometry, c.center::geometry) from com_posts p join cities c on c.id = p.city_id where p.id = ${Q}`) === 'pregunta:salud:true:true',
    'en la base: pregunta de Salud y la ubicación es el centro (la vecina no tiene barrio), nunca su GPS');
  await a.screenshot({ path: OUT + 'c5a-pregunta-m.png', fullPage: true });

  // ── 4 · Recomendación con negocio (escritorio, con vista previa) ──
  const ad = await esc(); await entrar(ad, A);
  await ad.goto(B + '/comunidad/nuevo?k=recomendacion'); await ad.getByText('Busca el negocio que recomiendas').first().waitFor();
  await clic(ad.getByText('Busca el negocio que recomiendas'));
  await ad.getByLabel('Buscar negocio').fill('espiga');
  await ad.getByRole('option').filter({ hasText: 'Panadería La Espiga' }).first().waitFor(); await clic(ad.getByRole('option').filter({ hasText: 'Panadería La Espiga' }));
  await ad.getByLabel('¿POR QUÉ LO RECOMIENDAS?').fill(`El pan sobao sale a las 7 y te lo guardan si llamas antes ${TAG}`);
  await clic(ad.getByRole('button', { name: 'Publicar', exact: true }));
  ok(await contiene(ad, 'CONFIRMA QUE NO ES TU NEGOCIO'), 'sin confirmar «No es mi negocio» no se publica');
  await clic(ad.getByRole('checkbox', { name: /No es mi negocio/ }));
  await ad.screenshot({ path: OUT + 'c5a-nuevo-d.png', fullPage: true });
  await clic(ad.getByRole('button', { name: 'Publicar', exact: true }));
  await ad.waitForURL(/\/comunidad\/p\/\d+/, { timeout: 15000 });
  const RR = ad.url().match(/\/p\/(\d+)/)[1];
  ok(sql(`select kind || ':' || business_id from com_posts where id = ${RR}`) === 'recomendacion:panaderia-la-espiga', 'recomendación guardada con su negocio');
  ok(await contiene(ad, 'Panadería La Espiga') && await contiene(ad, 'RECOMIENDA'), 'la publicación muestra el negocio recomendado');
  await ad.screenshot({ path: OUT + 'c5a-recomendacion-d.png', fullPage: true });

  // ── 5 · Encuesta (rango 3 · Cabo): 2 opciones, 1 día ──
  await a.goto(B + '/comunidad/nuevo?k=encuesta'); await a.getByLabel('LA PREGUNTA DE LA ENCUESTA').waitFor();
  await a.getByLabel('LA PREGUNTA DE LA ENCUESTA').fill(`¿A qué hora debería abrir el mercado del sábado? ${TAG}`);
  await a.getByLabel('Opción 1').fill('A las 7 de la mañana'); await a.getByLabel('Opción 2').fill('A las 9 de la mañana');
  await clic(a.getByRole('button', { name: '1 día', exact: true }));
  await clic(a.getByRole('button', { name: 'Publicar', exact: true }));
  await a.waitForURL(/\/comunidad\/p\/\d+/, { timeout: 15000 });
  const E = a.url().match(/\/p\/(\d+)/)[1];
  ok(sql(`select kind || ':' || cardinality(poll_options) || ':' || (poll_ends_at between now() + interval '23 hours' and now() + interval '25 hours') from com_posts where id = ${E}`) === 'encuesta:2:true', 'encuesta: 2 opciones y cierra en 1 día');
  ok(await contiene(a, 'VOTA PARA VER CÓMO VA'), 'la encuesta esconde los % hasta votar');

  // ── 6 · La dueña de un negocio no se lo recomienda a sí misma ──
  const y = await tel(); await entrar(y, Y);
  await y.goto(B + '/comunidad/nuevo?k=recomendacion'); await clic(y.getByText('Busca el negocio que recomiendas'));
  await y.getByLabel('Buscar negocio').fill('rentas hazleton');
  await y.getByRole('option').filter({ hasText: 'Rentas Hazleton Latino' }).first().waitFor(); await clic(y.getByRole('option').filter({ hasText: 'Rentas Hazleton Latino' }));
  await clic(y.getByRole('checkbox', { name: /No es mi negocio/ }));
  await y.getByLabel('¿POR QUÉ LO RECOMIENDAS?').fill(`Las mejores rentas del barrio, pregunten por mí ${TAG}`);
  await clic(y.getByRole('button', { name: 'Publicar', exact: true }));
  await y.getByRole('alert').filter({ hasText: 'No puedes recomendar tu propio negocio' }).first().waitFor();
  ok(sql(`select count(*) from com_posts where author_user_id = '${RY}' and business_id = 'rentas-hazleton-latino'`) === '0', 'la dueña no se recomienda: «Tu negocio publica en sus Novedades» y nada se guardó');
  await y.screenshot({ path: OUT + 'c5a-propio-m.png' });

  // ── 7 · Editar en los 30 minutos sí; después no ──
  await a.goto(B + '/comunidad/p/' + Q); await a.locator('[data-screen-label="APP-COM-POST · publicación"]').first().waitFor();
  await clic(a.locator('[data-screen-label="APP-COM-POST · publicación"] span[style*="-9px"]'));
  await clic(a.getByRole('button').filter({ hasText: /^Editar/ }));
  await a.waitForURL(/editar=/); await a.getByLabel('TU PREGUNTA').waitFor();
  await a.getByLabel('TU PREGUNTA').fill(`¿Dónde vacunan gratis a los niños esta semana en Hazleton? Mi hijo tiene tos ${TAG}`);
  await clic(a.getByRole('button', { name: 'Guardar cambios', exact: true }));
  await a.waitForURL(/editada=1/); ok(await contiene(a, 'Cambios guardados.') && await contiene(a, 'Editada'), 'editar en los primeros 30 minutos: guardado y «Editada»');
  ok(sql(`select count(*) from com_edits where target_kind = 'post' and target_id = ${Q}`) === '1', 'la versión anterior queda en com_edits (solo inserción)');
  ok(sqlErr(`delete from com_edits where target_id = ${Q}`).includes('solo de inserción'), 'com_edits no se borra');
  sql(`update com_posts set created_at = now() - interval '31 minutes' where id = ${Q}`);
  await a.goto(B + `/comunidad/nuevo?editar=${Q}`); ok(await contiene(a, 'Ya no se puede editar'), 'después de 30 minutos: «Ya no se puede editar» (lo decide el servidor)');
  await a.goto(B + '/comunidad/p/' + Q); await clic(a.locator('[data-screen-label="APP-COM-POST · publicación"] span[style*="-9px"]'));
  ok(await (await vis(a.getByRole('button').filter({ hasText: /^Editar/ }))).getAttribute('aria-disabled') === 'true', 'el menú ya no deja editar');
  await a.keyboard.press('Escape'); await clic(a.getByRole('button', { name: 'Cerrar' }));

  // ── 8 · Votar: B vota la pregunta de A; A no vota lo suyo; B vota la encuesta ──
  const bp = await tel(); await entrar(bp, BB);
  await bp.goto(B + '/comunidad/p/' + Q); await clic(bp.getByRole('button', { name: 'Votar a favor' }));
  ok(await espera(() => sql(`select up_n || ':' || score from com_posts where id = ${Q}`) === '1:1'), 'voto + de otra persona: contador y score derivados');
  await clic(bp.getByRole('button', { name: 'Votar a favor' }));
  ok(await espera(() => sql(`select up_n from com_posts where id = ${Q}`) === '0'), 'el mismo toque quita el voto');
  await clic(bp.getByRole('button', { name: 'Votar a favor' })); await espera(() => sql(`select up_n from com_posts where id = ${Q}`) === '1');
  await a.goto(B + '/comunidad/p/' + Q); await clic(a.getByRole('button', { name: 'Votar a favor' }));
  ok(await contiene(a, 'Lo tuyo lo votan los demás.'), 'lo propio no se vota');
  await bp.goto(B + '/comunidad/p/' + E); await clic(bp.getByRole('button', { name: 'A las 7 de la mañana' }));
  ok(await espera(() => sql(`select poll_counts::text from com_posts where id = ${E}`) === '{1,0}') && await contiene(bp, 'TU VOTO NO SE CAMBIA'), 'encuesta: un voto, se ven los % y no se cambia');

  // ── 9 · Borrar con Deshacer (en el muro) ──
  await a.goto(B + '/comunidad'); await a.getByText('¿Qué pasa en tu cuadra').first().waitFor();
  const cardE = a.locator('[data-screen-label="Comunidad · publicación"]').filter({ hasText: '¿A qué hora debería abrir el mercado' }).first();
  await clic(cardE.locator('span[style*="-9px"]')); await clic(a.getByRole('button').filter({ hasText: /^Borrar/ }));
  await clic(a.getByRole('button', { name: 'Borrar', exact: true }));
  await a.getByText('Publicación borrada.').waitFor();
  ok(sql(`select status from com_posts where id = ${E}`) === 'deleted' && !(await texto(a)).includes('¿A qué hora debería abrir el mercado'), 'borrar = estado «deleted» y sale del muro');
  await a.screenshot({ path: OUT + 'c5a-deshacer-m.png' });
  await clic(a.getByRole('button', { name: 'Deshacer' }));
  ok(await espera(() => sql(`select status from com_posts where id = ${E}`) === 'visible') && await contiene(a, '¿A qué hora debería abrir el mercado'), '«Deshacer» la devuelve a su lugar');
  sql(`update com_posts set status = 'deleted', deleted_at = now() - interval '30 seconds' where id = ${E}`);
  await a.goto(B + '/comunidad/p/' + E); ok(await contiene(a, 'Esta publicación ya no está'), 'pasado el plazo, la borrada ya no está para nadie');

  // ── 10 · Filtros: chips, distancia y orden; «Ver más» con cursor ──
  await a.goto(B + '/comunidad'); await clic(a.getByRole('button', { name: 'Preguntas', exact: true }));
  await a.waitForURL(/k=pregunta/);
  ok(await contiene(a, 'mecánico honesto') && !(await texto(a)).includes('El pan de agua sale caliente'), 'chip Preguntas: solo preguntas');
  await clic(a.getByRole('button', { name: 'Filtros' })); await clic(a.getByRole('button', { name: 'A 5 millas de mí' }));
  await a.waitForURL(/d=5/); ok(await contiene(a, ' mi') && await contiene(a, 'A 5 MI DE TI'), 'distancia 5 mi: se mide contra el barrio y se redondea');
  await clic(a.getByRole('button', { name: 'Filtros' })); await clic(a.getByRole('button', { name: 'Lo más reciente primero' }));
  await a.waitForURL(/o=new/);
  await a.goto(B + '/comunidad?o=new'); await a.getByText('¿Qué pasa en tu cuadra').first().waitFor();
  const cards = a.locator('[data-screen-label="Comunidad · publicación"]');
  const n1 = await cards.count();
  ok(n1 === 21, `primera página: la fijada + 20 (${n1})`);
  ok((await cards.nth(1).innerText()).includes('pan sobao'), 'Recientes: lo último que se publicó primero (la recomendación de A, después de la fijada)');
  await a.screenshot({ path: OUT + 'c5a-filtros-m.png' });
  await clic(a.getByRole('button', { name: 'Ver más' }));
  ok(await espera(async () => (await cards.count()) > n1), '«Ver más»: la página 2 llega por cursor');
  const textos = await cards.allInnerTexts();
  ok(new Set(textos).size === textos.length && await contiene(a, 'Paginación de prueba número 8'), 'página 2 sin repetidas y hasta la más vieja');

  // ── 11 · Super Admin: Contenido › Publicaciones — ocultar con motivo, restaurar, fijar y bloquear comentarios ──
  const adm = await esc(); await entrar(adm, ADM);
  await adm.goto(B + `/admin/contenido?tab=pub&q=${encodeURIComponent('vacunan gratis')}`); await adm.getByText('Publicaciones').first().waitFor();
  await adm.screenshot({ path: OUT + 'c5a-admin-d.png', fullPage: true });
  await clic(adm.getByText('Ocultar', { exact: true })); await clic(adm.getByText('Spam o publicidad')); await clic(adm.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select status || ':' || hidden_by || ':' || (hidden_reason is not null) from com_posts where id = ${Q}`) === 'hidden:admin:true'), 'admin oculta con motivo');
  ok(sql(`select count(*) from audit_entries where action = 'com.publicacion.ocultar' and target_id = '${Q}'`) === '1', 'queda en la auditoría');
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RA}' and tpl = 'com_hide' and ref_id = '${Q}'`) === '1'), 'el autor recibe el aviso con el motivo (sin SMS)');
  await bp.goto(B + '/comunidad?o=new'); await bp.getByText('¿Qué pasa en tu cuadra').first().waitFor();
  ok(!(await texto(bp)).includes('Mi hijo tiene tos'), 'oculta → sale del muro de los demás');
  await bp.goto(B + '/comunidad/p/' + Q); ok(await contiene(bp, 'Esta publicación ya no está'), 'y su página no existe para los demás');
  await a.goto(B + '/comunidad/p/' + Q); ok(await contiene(a, 'Ocultamos tu publicación; solo tú la ves.'), 'el autor la ve con el motivo');
  await adm.goto(B + `/admin/contenido?tab=pub&q=${encodeURIComponent('vacunan gratis')}`); await clic(adm.getByText('Restaurar', { exact: true }));
  await clic(adm.getByText('No rompe las reglas del barrio'));
  await clic(adm.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select status from com_posts where id = ${Q}`) === 'visible'), 'restaurar → visible');
  await bp.goto(B + '/comunidad?o=new'); ok(await contiene(bp, 'Mi hijo tiene tos'), 'restaurada → vuelve al muro');
  await adm.goto(B + `/admin/contenido?tab=pub&q=${encodeURIComponent('vacunan gratis')}`); await clic(adm.getByText('Fijar', { exact: true }));
  await clic(adm.getByText('Aviso importante de la ciudad')); await clic(adm.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select coalesce(pinned_until > now() + interval '6 days', false) from com_posts where id = ${Q}`) === 't'), 'fijar: 7 días arriba de su ciudad');
  await bp.goto(B + '/comunidad'); await bp.getByText('¿Qué pasa en tu cuadra').first().waitFor();
  ok((await bp.locator('[data-screen-label="Comunidad · publicación"]').first().innerText()).includes('Mi hijo tiene tos'), 'la fijada sale arriba del muro (una a la vez)');
  await adm.goto(B + `/admin/contenido?tab=pub&q=${encodeURIComponent('vacunan gratis')}`); await clic(adm.getByText('Bloquear comentarios', { exact: true }));
  await clic(adm.getByText('Tema resuelto')); await clic(adm.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select comments_locked_at is not null from com_posts where id = ${Q}`) === 't'), 'bloquear comentarios queda guardado');

  // ── 12 · La base: teléfono por insert directo, contadores y ubicación a mano, y el plan del muro ──
  ok(/com_posts_datos/.test(sqlErr(`insert into com_posts (city_id, author_kind, author_user_id, kind, body) values ('hzl', 'user', '${RA}', 'publicacion', 'Llamen al (570) 555 0123 ya ${TAG}')`)), 'insert directo con teléfono → la base lo rechaza');
  ok(/derivados/.test(sqlErr(`update com_posts set up_n = 999 where id = ${Q}`)), 'contadores a mano → la base lo rechaza');
  ok(/la pone la base/.test(sqlErr(`update com_posts set geom = st_setsrid(st_makepoint(-75.97, 40.95), 4326)::geography where id = ${Q}`)), 'ubicación a mano → la base lo rechaza');
  const plan = execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "set enable_seqscan = off; set enable_bitmapscan = off; set enable_sort = off; explain select id from com_posts p where p.city_id = 'hzl' and p.status = 'visible' and (p.hot, p.id) < (99999::float8, 999999::bigint) order by p.hot desc, p.id desc limit 21"`).toString();
  // 9b-3 · Lo que se comprueba es que el índice da el orden del muro (sin ordenar aparte), no qué plan prefiere el planificador con las estadísticas
  // del momento: con pocas filas visibles (después de una vuelta entera) elegía un recorrido por mapa de bits + ordenar, que con pocas filas es más barato.
  ok(/Index (Only )?Scan using com_posts_hot_idx/.test(plan) && !/Seq Scan/.test(plan) && !/Sort/.test(plan), /Index (Only )?Scan using com_posts_hot_idx/.test(plan) && !/Sort/.test(plan) ? 'el muro usa com_posts_hot_idx sin ordenar aparte' : `el muro usa com_posts_hot_idx sin ordenar aparte (plan: ${plan.replace(/\s+/g, ' ').slice(0, 300)})`);

  // ── 13 · Escritorio: muro y la publicación (240 + 720 + 320) ──
  await ad.goto(B + '/comunidad'); await ad.getByText('¿Qué pasa en tu cuadra').first().waitFor();
  ok(await contiene(ad, 'REGLAS DEL BARRIO') && await contiene(ad, 'Aquí nada se compra: el orden lo ponen los votos de los vecinos.'), 'escritorio: contexto con la línea fija y las reglas');
  ok(await ad.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'escritorio sin scroll horizontal');
  await ad.screenshot({ path: OUT + 'c5a-muro-d.png' });
  await ad.goto(B + '/comunidad/p/' + ID0); await ad.getByText('QUIEN PUBLICA').first().waitFor().catch(() => {});
  await ad.screenshot({ path: OUT + 'c5a-post-d.png', fullPage: true });
  ok(await a.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'teléfono sin scroll horizontal');

  // ── Deja todo como estaba ──
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()), pinned_until = null where body like '%${TAG}%'`);
  sql(`update com_posts set pinned_until = now() + interval '5 days' where author_kind = 'official' and city_id = 'hzl' and body like 'Pregunta de la semana:%'`);
  sql(`select com_derivados_on(); update community_profiles set rank_level = ${rangoA || 1} where user_id = '${RA}'`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK com5a');
})().catch((e) => { console.error(e); process.exit(1); });
