// 5d · Reportar, auto-moderación, antiabuso, sanciones y apelaciones. Teléfono 390 y escritorio 1360.
// 1 reportar una publicación → «Ya no lo ves» solo para quien reporta · 2 cinco cuentas del mismo dispositivo → NO oculta · una cuenta nueva
// no cuenta · cinco personas con dispositivos distintos → auto-oculta con aviso y Apelar · 3 el admin A confirma «Ocultar» (aviso a quienes
// reportaron) · 4 la autora apela (20–500) → «Recibimos tu apelación…» · 5 el admin A no la puede decidir (pantalla y base) · 6 el admin B
// la levanta → vuelve y llega el aviso · 7 spam (3 parecidas en 24 h) marca · 8 odio marca sin ocultar; autolesión → línea del 988 · 9
// límites del día (Configuración en Auto-moderación) · 10 5 reseñas sin transacción en 10 min → caso en repUsr · 11 votos desde un mismo
// dispositivo → Fraude · 12 reportar a una persona → el admin la silencia → Publicar dice hasta cuándo y por qué · 13 fotos: el modelo
// propio responde → se ve; caído → revisión manual; regla apagada dice por qué · 14 reportar un comentario (escritorio) · capturas c5d-*.
// Crea sus datos ([c5d]) y deja todo como estaba.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync, spawn } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', S = ENT.S;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let k = 0; k < 40; k++) { const x = await vis(l); if (x) { await x.click(); return; } await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t) => espera(async () => (await texto(p)).includes(t));
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrido = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const TAG = '[c5d]';
const A = '5705550299', HB = '5705550288', ADM = '5705550199', ADM2 = '5705550188';
const R = ['5705550601', '5705550602', '5705550603', '5705550604', '5705550605', '5705550606'], SP = ['5705550611', '5705550612', '5705550613', '5705550614', '5705550615'];
const M = '5705550622', V = '5705550633', W = ['5705550641', '5705550642', '5705550643'];
const sinScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const dlg = (p) => p.getByRole('dialog');
const IMG = ENT.rec('fotos') + '/portada.jpg';
let svc = null;
const servicioImg = (on) => {
  if (!on) { try { execSync("pkill -f 'services/moderacion-img/app.py'"); } catch { /* ya estaba */ } return; }
  svc = spawn(ENT.rec('imgvenv/bin/python'), ['-I', ENT.RAIZ + '/services/moderacion-img/app.py'], { env: { ...process.env, PUERTO: '8790' }, detached: true, stdio: 'ignore' }); svc.unref();
};
const saludImg = () => { try { return JSON.parse(execSync('curl -s -m 3 localhost:8790/salud').toString()).ok === true; } catch { return false; } };

(async () => {
  require('../lib/negocio-nuevo.cjs').equipo('5705550188'); // 9b-1 · el equipo de prueba que esta prueba usa (antes lo creaba otra prueba)
  const b = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404|status of 503/.test(m.text())) err.push('console: ' + m.text()); }); };
  const tel = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(p); return p; };
  const esc = async () => { const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(p); return p; };
  const vecino = (tel, nombre, vieja = true) => {
    const id = uid(tel);
    sql(`insert into community_profiles (user_id) values ('${id}') on conflict do nothing`);
    sql(`update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true, adult_ok_at = coalesce(adult_ok_at, now()), welcome_at = coalesce(welcome_at, now()) where user_id = '${id}'`);
    sql(`update users set status = 'active', status_until = null, status_reason = null, home_city_id = 'hzl', zone_id = null, first_name = coalesce(first_name, '${nombre}'), last_name = coalesce(last_name, 'Prueba'),
           created_at = ${vieja ? "least(created_at, now() - interval '5 days')" : 'now()'} where id = '${id}'`);
    return id;
  };
  const preparar = async (p, t, nombre, vieja = true) => { await entrar(p, t); await api(p, '/api/cuenta/perfil', { nombre, apellido: 'Prueba' }); return vecino(t, nombre, vieja); };

  // ── Preparación ──
  const T0 = sql('select now()');
  if (!saludImg()) { servicioImg(true); await espera(async () => saludImg(), 20000); }
  ok(saludImg(), 'el servicio propio de fotos responde (NudeNet ONNX)');
  sql(`update mod_rules set enabled = true`);
  sql(`update mod_rules set params = '{"n": 3, "horas": 24, "parecido": 0.8}' where key = 'spam'`);
  sql(`update mod_rules set params = '{"reportes": 5, "horas": 24, "edad_h": 72}' where key = 'autohide'`);
  sql(`update platform_config set value = '10' where key in ('com_lim_publicaciones', 'com_lim_conversaciones')`);
  sql(`update platform_config set value = '100' where key = 'com_lim_comentarios'`);
  sql(`update com_comments set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days' where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days', publish_at = publish_at - interval '2 days' where body like '%${TAG}%'`);
  const ap = await tel(); await entrar(ap, A); const RA = vecino(A, 'Yaritza');
  const RB = uid(HB); vecino(HB, 'Héctor');
  const rp = []; for (let i = 0; i < R.length; i++) { const p = await tel(); rp.push({ p, id: await preparar(p, R[i], `Rep${i + 1}`, i < 5) }); }
  const sp = await tel(); const SPID = []; for (let i = 0; i < SP.length; i++) SPID.push(await preparar(sp, SP[i], `Mismo${i + 1}`));
  const mp = await tel(); const RM = await preparar(mp, M, 'Moisés');
  const vp = await tel(); const RV = await preparar(vp, V, 'Valeria');
  const wp = await tel(); const WID = []; for (let i = 0; i < W.length; i++) WID.push(await preparar(wp, W[i], `Red${i + 1}`));
  const TODOS = [RA, RB, RM, RV, ...rp.map((x) => x.id), ...SPID, ...WID], LISTA = TODOS.map((x) => `'${x}'`).join(', ');
  sql(`update content_reports set status = 'dismissed', created_at = created_at - interval '2 days' where reporter_user_id in (${LISTA}) and created_at > now() - interval '2 days'`);
  sql(`update content_reports set status = 'dismissed' where target_kind = 'user' and target_id in (${TODOS.map((x) => `'${x}'`).join(', ')}) and status = 'open'`);
  sql(`update queue_items set status = 'decided', decision = 'prueba', reason = 'prueba', decided_at = now() where status = 'open' and ((queue = 'repUsr' and subject_id in (${TODOS.map((x) => `'${x}'`).join(', ')})) or (queue = 'apel' and subject_id in (select id::text from appeals where user_id in (${LISTA}))) or (queue = 'medios' and business_id is null))`);
  sql(`update sanctions set lifted_at = now(), lift_reason = 'prueba' where target_kind = 'user' and target_id in (${TODOS.map((x) => `'${x}'`).join(', ')}) and lifted_at is null`);
  sql(`update users set status = 'active', status_until = null, status_reason = null where id in (${LISTA})`);
  sql(`update user_blocks set removed_at = now() where removed_at is null and (user_id in (${LISTA}) or target_user_id in (${LISTA}))`);
  sql(`update com_posts set created_at = created_at - interval '2 days' where author_user_id in (${LISTA}) and created_at > now() - interval '2 days'`);
  sql(`update com_votes set created_at = created_at - interval '8 days' where user_id in (${WID.map((x) => `'${x}'`).join(', ')})`);
  sql(`update reviews set status = 'removed', hidden_reason = 'prueba', created_at = created_at - interval '1 day' where user_id = '${RV}' and status <> 'removed'`);
  const pub = (autor, cuerpo, hace = '2 hours') => sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, body, publish_at, created_at) values ('hzl', 'user', '${autor}', 'publicacion', '${cuerpo} ${TAG}', now() - interval '${hace}', now() - interval '${hace}') returning id`).split('\n')[0];
  const P1 = pub(RA, 'Vendo tamales los domingos, pasen por la casa'), P2 = pub(RA, 'Alguien sabe a qué hora abre la biblioteca'), P3 = pub(RA, 'Busco quien me ayude con la mudanza del sábado');
  const PB = pub(RB, 'Recomiendo la panadería de la 22, el pan sale a las 6');
  const C3 = sql(`insert into com_comments (post_id, author_user_id, body) values (${P3}, '${RB}', 'Yo te ayudo, tengo camioneta ${TAG} comentario de Héctor') returning id`).split('\n')[0];

  // ── 1 · Reportar una publicación (teléfono): motivo → detalle → «Ya no lo ves. Lo revisamos en 48 h.» ──
  const r1 = rp[0].p;
  await r1.goto(B + '/comunidad/p/' + P1); await r1.getByText('Vendo tamales').first().waitFor();
  await clic(r1.getByRole('button', { name: 'Opciones', exact: true })); await clic(dlg(r1).getByText('Reportar', { exact: true }));
  await dlg(r1).getByText('¿Por qué lo reportas?').waitFor(); ok(await contiene(r1, 'Nadie sabe que fuiste tú.') && await contiene(r1, 'Se recomienda a sí mismo'), 'hoja de reporte con los motivos de REP');
  ok(await dlg(r1).getByRole('button', { name: 'Seguir' }).isDisabled(), 'sin motivo no sigue');
  await clic(dlg(r1).getByText('Venta, spam o cadena', { exact: true })); await r1.screenshot({ path: OUT + 'c5d-reportar-motivo-m.png' });
  await clic(dlg(r1).getByRole('button', { name: 'Seguir' })); await dlg(r1).getByText('¿Algo más que debamos saber?').waitFor();
  ok(await contiene(r1, 'Si alguien está en peligro ahora mismo, llama al 911.'), 'paso 2: detalle opcional y la línea del 911');
  await dlg(r1).getByLabel('Qué pasó (opcional)').fill('Vende en todos los hilos');
  await r1.screenshot({ path: OUT + 'c5d-reportar-detalle-m.png' });
  await clic(dlg(r1).getByRole('button', { name: 'Enviar reporte' }));
  ok(await contiene(r1, 'Ya no lo ves. Lo revisamos en 48 h.') && await contiene(r1, 'Recibido. Gracias por cuidar el barrio.'), '«Ya no lo ves. Lo revisamos en 48 h.»');
  await r1.screenshot({ path: OUT + 'c5d-reportar-recibido-m.png' });
  await clic(dlg(r1).getByRole('button', { name: 'Listo' })); await r1.waitForURL(/\/comunidad$/);
  await r1.goto(B + '/comunidad/p/' + P1); ok(await contiene(r1, 'Esta publicación ya no está'), 'quien reportó ya no la ve');
  await rp[1].p.goto(B + '/comunidad/p/' + P1); ok(await contiene(rp[1].p, 'Vendo tamales'), 'los demás la siguen viendo mientras se decide');
  ok(sql(`select device is not null from content_reports where target_kind = 'com_post' and target_id = '${P1}' and reporter_user_id = '${rp[0].id}'`) === 't', 'el reporte guarda el dispositivo (de la cookie del servidor)');
  ok(sql(`select count(*) from queue_items where queue = 'rep' and subject_kind = 'com_post' and subject_id = '${P1}' and status = 'open'`) === '1', 'caso en la cola «Reportes de contenido»');

  // ── 2 · Manada: cinco cuentas del mismo teléfono no ocultan; una cuenta nueva no cuenta; cinco personas distintas sí ──
  const reportar = async (p, post, motivo = 'Venta, spam o cadena') => {
    await p.goto(B + '/comunidad/p/' + post); await clic(p.getByRole('button', { name: 'Opciones', exact: true })); await clic(dlg(p).getByText('Reportar', { exact: true }));
    await clic(dlg(p).getByText(motivo, { exact: true })); await clic(dlg(p).getByRole('button', { name: 'Seguir' })); await clic(dlg(p).getByRole('button', { name: 'Enviar reporte' }));
    await dlg(p).getByText('Ya no lo ves. Lo revisamos en 48 h.').waitFor();
  };
  for (let i = 0; i < SP.length; i++) { await entrar(sp, SP[i]); await reportar(sp, P2); }
  ok(sql(`select count(distinct device) || '/' || count(*) from content_reports where target_kind = 'com_post' and target_id = '${P2}'`) === '1/5', 'cinco cuentas reportaron desde un mismo dispositivo');
  ok(sql(`select status from com_posts where id = ${P2}`) === 'visible' && sql(`select count(*) from notifications where user_id = '${RA}' and ref_kind = 'com_post' and ref_id = '${P2}'`) === '0', 'mismo dispositivo con varias cuentas → NO se oculta (cuenta como una persona)');
  for (const i of [1, 2, 3]) await reportar(rp[i].p, P1);
  await reportar(rp[5].p, P1);
  ok(sql(`select status from com_posts where id = ${P1}`) === 'visible', 'cuatro personas + una cuenta nueva (menos de 72 h) → todavía no se oculta');
  await reportar(rp[4].p, P1);
  ok(await espera(() => sql(`select status || ':' || hidden_by from com_posts where id = ${P1}`) === 'hidden:auto'), 'cinco personas con dispositivos distintos → oculta por revisión (auto)');
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RA}' and tpl = 'com_autohide' and ref_id = '${P1}'`) === '1') && sql(`select href from notifications where user_id = '${RA}' and tpl = 'com_autohide' and ref_id = '${P1}'`) === `/cuenta/moderacion?k=com_post&id=${P1}`, 'la autora recibe el aviso con el motivo y la ruta de «Apelar»');
  ok(sql(`select count(*) from mod_flags where target_kind = 'com_post' and target_id = '${P1}' and rule_key = 'autohide'`) === '1' && sql(`select priority from queue_items where queue = 'rep' and subject_id = '${P1}' and status = 'open'`) === 'alta', 'queda marcado (autohide) y el caso sube a prioridad alta');
  ok(sqlErr(`update mod_flags set detail = 'x' where target_id = '${P1}'`).includes('solo de inserción') && sqlErr(`delete from mod_flags where target_id = '${P1}'`).includes('solo de inserción'), 'mod_flags es solo de inserción (la base lo impide)');
  await ap.goto(B + '/comunidad/p/' + P1); ok(await contiene(ap, 'Ocultamos tu publicación; solo tú la ves.') && await contiene(ap, 'Apelar'), 'la autora la ve oculta con el motivo y «Apelar»');
  await ap.screenshot({ path: OUT + 'c5d-oculta-autora-m.png', fullPage: true });

  // ── 3 · El admin A confirma «Ocultar» en Colas (los que reportaron reciben el resultado) ──
  const adA = await esc(); await entrar(adA, ADM); const SA = uid(ADM);
  const QP1 = sql(`select id from queue_items where queue = 'rep' and subject_kind = 'com_post' and subject_id = '${P1}' and status = 'open'`);
  await adA.goto(B + '/admin/colas?caso=' + QP1); await adA.getByText('LO QUE ESCRIBIÓ').first().waitFor();
  ok(await contiene(adA, 'Oculta por reportes (auto)') && await contiene(adA, 'REPORTES') && await contiene(adA, 'Auto-ocultada'), 'el caso: estado, reportes y lo que marcó la regla');
  await adA.screenshot({ path: OUT + 'c5d-colas-rep-d.png', fullPage: true });
  await clic(adA.getByRole('button', { name: 'Ocultar' })); await clic(adA.getByText('Venta, spam o cadena', { exact: true })); await clic(adA.getByText('Sin sanción', { exact: true }));
  await clic(adA.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select hidden_by || ':' || (hidden_staff_id = '${SA}') from com_posts where id = ${P1}`) === 'admin:true'), 'el admin A la oculta con su motivo');
  ok(await espera(() => sql(`select count(*) from notifications where tpl = 'com_rep_ok' and ref_id = '${P1}'`) === '6'), 'las seis personas que la reportaron reciben «Revisamos tu reporte»');

  // ── 4 · La autora apela: aviso → Apelar (20–500) → «Recibimos tu apelación. Te respondemos en 72 h.» ──
  await ap.goto(B + `/cuenta/moderacion?k=com_post&id=${P1}`); await ap.getByText('Ocultamos tu publicación: Venta, spam o cadena').first().waitFor();
  ok(await contiene(ap, 'PUEDES APELAR HASTA') && await contiene(ap, 'Otra persona del equipo, no quien lo decidió'), 'el aviso: motivo, hasta cuándo apelar y quién lo revisa');
  await ap.getByLabel('POR QUÉ ES UN ERROR').fill('Era corto');
  ok(await ap.getByRole('button', { name: 'Enviar apelación' }).isDisabled(), 'menos de 20 letras: no se envía');
  await ap.getByLabel('POR QUÉ ES UN ERROR').fill('Son tamales que hace mi mamá para el barrio, no es un negocio ni spam.');
  await ap.screenshot({ path: OUT + 'c5d-apelar-m.png', fullPage: true });
  await clic(ap.getByRole('button', { name: 'Enviar apelación' }));
  ok(await contiene(ap, 'Recibimos tu apelación. Te respondemos en 72 h.'), '«Recibimos tu apelación. Te respondemos en 72 h.»');
  const AP1 = sql(`select id from appeals where user_id = '${RA}' and target_kind = 'com_post' and target_id = '${P1}'`);
  ok(!!AP1 && /^AP-\d{3,}$/.test(sql(`select number from appeals where id = ${AP1}`)) && sql(`select sanctioned_by from appeals where id = ${AP1}`) === SA, 'apelación AP-1xx; la base anotó quién la ocultó');
  await ap.screenshot({ path: OUT + 'c5d-apelacion-m.png', fullPage: true });
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RA}' and tpl = 'apel_recibida'`) !== '0'), 'aviso «Recibimos tu apelación» en la campana');
  ok(sqlErr(`insert into appeals (user_id, target_kind, target_id, text) values ('${RA}', 'com_post', '${P1}', 'otra vez la misma apelación por favor')`).length > 0, 'se apela una sola vez (la base lo impide)');

  // ── 5 · El admin A (quien ocultó) no la puede decidir: la pantalla no lo deja y la base tampoco ──
  const QA = sql(`select id from queue_items where queue = 'apel' and subject_id = '${AP1}' and status = 'open'`);
  await adA.goto(B + '/admin/colas?caso=' + QA); await adA.getByText('LO QUE ESCRIBIÓ').first().waitFor();
  ok(await contiene(adA, 'Tú ocultaste o sancionaste esto: la apelación la decide otra persona del equipo.') && !(await vis(adA.getByRole('button', { name: 'Levantar' }))), 'el admin A ve el candado y no tiene botones');
  await adA.screenshot({ path: OUT + 'c5d-apel-mismo-d.png', fullPage: true });
  ok(sqlErr(`update appeals set status = 'lifted', decided_by = '${SA}', decision_reason = 'yo mismo' where id = ${AP1}`).includes('otra persona'), 'la base rechaza que la decida quien sancionó');

  // ── 6 · El admin B la levanta → la publicación vuelve y la autora recibe el aviso ──
  const adB = await esc(); await entrar(adB, ADM2);
  await adB.goto(B + '/admin/colas?caso=' + QA); await adB.getByText('LO QUE ESCRIBIÓ').first().waitFor();
  ok(await contiene(adB, 'Son tamales que hace mi mamá') && await contiene(adB, 'LO APELADO'), 'el admin B ve la apelación y lo apelado');
  await adB.screenshot({ path: OUT + 'c5d-apel-d.png', fullPage: true });
  await clic(adB.getByRole('button', { name: 'Levantar' })); await clic(adB.getByText('Tenía razón: no rompe las reglas', { exact: true })); await clic(adB.getByRole('button', { name: 'Levantar' }));
  ok(await espera(() => sql(`select status from appeals where id = ${AP1}`) === 'lifted') && sql(`select status from com_posts where id = ${P1}`) === 'visible', 'el admin B la levanta: la publicación vuelve');
  ok(sql(`select count(*) from queue_items where queue = 'rep' and subject_id = '${P1}' and status = 'open'`) === '0' && sql(`select count(*) from audit_entries where action = 'apelacion.levantar'`) !== '0', 'casos cerrados y auditoría');
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RA}' and tpl = 'apel_lifted'`) !== '0'), 'la autora recibe «Revisamos tu apelación» (tenía razón)');
  ok(sqlErr(`update appeals set status = 'upheld' where id = ${AP1}`).includes('decidida no cambia'), 'una apelación decidida no cambia');
  await ap.goto(B + '/comunidad/p/' + P1); ok(await contiene(ap, 'Vendo tamales') && !(await texto(ap)).includes('Ocultamos tu publicación'), 'la autora la ve como antes');
  await rp[1].p.goto(B + '/comunidad/p/' + P1); ok(await contiene(rp[1].p, 'Esta publicación ya no está'), 'quien la reportó sigue sin verla (su «ya no lo ves»)');
  await ap.goto(B + `/cuenta/moderacion?k=com_post&id=${P1}`); await ap.waitForLoadState('networkidle');
  await ap.goto(B + '/cuenta/moderacion'); ok(await contiene(ap, 'Apelaciones decididas') && await contiene(ap, 'LEVANTADA'), 'Mi cuenta › Avisos de moderación: la apelación decidida');
  await ap.screenshot({ path: OUT + 'c5d-moderacion-lista-m.png', fullPage: true });

  // ── 7 · Spam: 3 publicaciones parecidas en 24 h → marca (cola Reportes); sigue visible ──
  const r3 = rp[2].p, R3 = rp[2].id;
  pub(R3, 'Vendo celulares baratos, escríbeme por mensaje', '3 hours'); pub(R3, 'Vendo celulares baratos, escríbeme por mensaje!!', '2 hours');
  await r3.goto(B + '/comunidad/nuevo?k=publicacion'); await r3.locator('textarea').first().waitFor();
  await r3.locator('textarea').first().fill(`Vendo celulares baratos, escríbeme por mensaje ${TAG}`);
  await clic(r3.getByRole('button', { name: 'Publicar', exact: true })); await r3.waitForURL(/\/comunidad\/p\/\d+/);
  const PS = r3.url().match(/\/p\/(\d+)/)[1];
  ok(sql(`select count(*) from mod_flags where target_kind = 'com_post' and target_id = '${PS}' and rule_key = 'spam'`) === '1' && sql(`select status from com_posts where id = ${PS}`) === 'visible', 'la tercera parecida en 24 h queda marcada (spam) y sigue visible');
  ok(sql(`select count(*) from queue_items where queue = 'rep' and subject_kind = 'com_post' and subject_id = '${PS}' and status = 'open'`) === '1', 'caso en la cola Reportes');

  // ── 8 · Odio marca sin ocultar; autolesión → línea del 988 (publicación y comentario) ──
  const r4 = rp[3].p;
  await r4.goto(B + '/comunidad/nuevo?k=publicacion'); await r4.locator('textarea').first().waitFor();
  await r4.locator('textarea').first().fill(`Esa gente que se queja tanto, go back to your country ${TAG}`);
  await clic(r4.getByRole('button', { name: 'Publicar', exact: true })); await r4.waitForURL(/\/comunidad\/p\/\d+/);
  const PH = r4.url().match(/\/p\/(\d+)/)[1];
  ok(sql(`select count(*) from mod_flags where target_id = '${PH}' and rule_key = 'hate'`) === '1' && sql(`select status from com_posts where id = ${PH}`) === 'visible', 'lenguaje discriminatorio: marca, nunca oculta solo');
  await r4.goto(B + '/comunidad/nuevo?k=publicacion'); await r4.locator('textarea').first().fill(`Últimamente no quiero vivir, todo me pesa ${TAG}`);
  await clic(r4.getByRole('button', { name: 'Publicar', exact: true })); await r4.waitForURL(/ayuda=988/);
  ok(await contiene(r4, 'llama o escribe al 988'), 'autolesión: quien escribe ve la línea del 988');
  await r4.screenshot({ path: OUT + 'c5d-988-m.png' });
  const PL = r4.url().match(/\/p\/(\d+)/)[1];
  ok(sql(`select priority from queue_items where queue = 'rep' and subject_id = '${PL}' and status = 'open'`) === 'alta' && sql(`select count(*) from mod_flags where target_id = '${PL}' and rule_key = 'autolesion'`) === '1', 'autolesión: caso con prioridad alta');
  await r4.goto(B + '/comunidad/p/' + P3); await r4.getByLabel('Tu comentario').fill(`A veces quiero morirme con tanto trabajo ${TAG}`);
  await clic(r4.getByRole('button', { name: 'Comentar', exact: true }));
  ok(await contiene(r4, 'llama o escribe al 988'), 'autolesión en un comentario: también la línea del 988');

  // ── 9 · Límites del día: el admin pone 2 publicaciones (Auto-moderación › Límites) → la tercera se rechaza con el motivo ──
  await adA.goto(B + '/admin/contenido?tab=auto'); await adA.getByText('LÍMITES DEL DÍA (POR PERSONA)').waitFor();
  await adA.screenshot({ path: OUT + 'c5d-auto-d.png', fullPage: true });
  const fila = adA.locator('div', { has: adA.getByText('10 publicaciones al día', { exact: true }) }).filter({ has: adA.getByRole('button', { name: 'Cambiar' }) }).last();
  await clic(fila.getByRole('button', { name: 'Cambiar' }));
  await adA.getByLabel('PUBLICACIONES AL DÍA').fill('2'); await clic(adA.getByText('Mucho spam', { exact: true })); await clic(adA.getByRole('button', { name: 'Guardar' }));
  ok(await espera(() => sql(`select value::text from platform_config where key = 'com_lim_publicaciones'`) === '2') && sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id = 'com_lim_publicaciones' and at > now() - interval '5 minutes'`) !== '0', 'el admin cambia el límite (con motivo y auditoría: desde 5i es «config.cambiar»; «moderacion.limite» solo seguía en una base vieja)');
  const r5 = rp[4].p, R5 = rp[4].id;
  pub(R5, 'Primera del día sobre el parque', '1 hours'); sql(`update com_posts set created_at = now() where author_user_id = '${R5}' and body like 'Primera del día%'`);
  pub(R5, 'Segunda del día sobre la escuela', '1 hours'); sql(`update com_posts set created_at = now() where author_user_id = '${R5}' and body like 'Segunda del día%'`);
  await r5.goto(B + '/comunidad/nuevo?k=publicacion'); await r5.locator('textarea').first().fill(`Tercera del día sobre la feria ${TAG}`);
  await clic(r5.getByRole('button', { name: 'Publicar', exact: true }));
  ok(await contiene(r5, 'Llegaste a 2 publicaciones hoy. Vuelve mañana.'), 'la tercera del día se rechaza con el motivo (lo decide el servidor)');
  await r5.screenshot({ path: OUT + 'c5d-limite-m.png' });
  sql(`update platform_config set value = '10' where key = 'com_lim_publicaciones'`);

  // ── 10 · Reseñas en ráfaga (rev5): 5 sin transacción en 10 min → caso en «Reportes de usuario» ──
  for (const biz of ['autopartes-yonke-el-cibaeno', 'auto-taller-la-familia', 'baterias-luis', 'brillo-movil-detailing'])
    sql(`insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec) values ('${biz}', 'hzl', '${RV}', 'vis', 1, 'Muy mal servicio, no lo recomiendo para nada ${TAG}', 'es', '{}', '{}', '{}')`);
  await vp.goto(B + '/n/car-wash-la-bomba/resena'); await clic(vp.getByRole('button', { name: '1 ★' }));
  await (await vis(vp.getByLabel('Tu reseña'))).fill(`Muy mal servicio, no lo recomiendo para nada ${TAG}`); await clic(vp.getByRole('button', { name: 'Publicar reseña' }));
  ok(await espera(() => sql(`select count(*) from reviews where user_id = '${RV}' and status <> 'removed' and created_at > now() - interval '10 minutes'`) === '5'), 'cinco reseñas sin transacción en minutos');
  ok(await espera(() => sql(`select count(*) from mod_flags where target_kind = 'user' and target_id = '${RV}' and rule_key = 'rev5' and created_at > '${T0}'`) !== '0'), 'rev5 la marca al guardar la quinta (sin esperar el barrido)');
  ok(sql(`select count(*) from queue_items where queue = 'repUsr' and subject_kind = 'user' and subject_id = '${RV}' and status = 'open'`) === '1', 'caso en «Reportes de usuario»');

  // ── 11 · Votos desde un mismo dispositivo (tres cuentas) → no cuentan y el barrido lo marca en Fraude ──
  for (let i = 0; i < W.length; i++) { await entrar(wp, W[i]); await wp.goto(B + '/comunidad/p/' + PB); await clic(wp.getByRole('button', { name: 'Votar a favor' }).first()); await espera(async () => sql(`select count(*) from com_votes where target_kind = 'post' and target_id = ${PB} and user_id = '${WID[i]}'`) === '1'); }
  ok(sql(`select up_n from com_posts where id = ${PB}`) === '1', 'tres votos de un mismo dispositivo cuentan como uno');
  barrido();
  ok(await espera(() => sql(`select count(*) from mod_flags where target_kind = 'user' and target_id = '${RB}' and rule_key = 'red' and created_at > '${T0}'`) !== '0'), 'el barrido marca la posible red de votos (repUsr)');
  await adA.goto(B + '/admin/confianza?tab=fraud'); await adA.getByText('REDES Y RÁFAGAS · 30 DÍAS').waitFor();
  ok(await contiene(adA, 'Posible red de cuentas · Héctor') && await contiene(adA, 'Reseñas en ráfaga · Valeria'), 'Confianza › Fraude muestra la red de votos y la ráfaga de reseñas');
  await adA.screenshot({ path: OUT + 'c5d-fraude-d.png', fullPage: true });

  // ── 12 · Reportar a una persona → el admin B la silencia → Publicar dice hasta cuándo y por qué ──
  const r6 = rp[5].p;
  await r6.goto(B + '/comunidad/v/' + RM); await r6.locator('[data-screen-label="APP-COM-VECINO · perfil"]').waitFor();
  await clic(r6.getByRole('button', { name: 'Opciones' })); await clic(dlg(r6).getByText('Reportar a Moisés', { exact: true }));
  await clic(dlg(r6).getByText('Insulto o acoso', { exact: true })); await r6.screenshot({ path: OUT + 'c5d-reportar-persona-m.png' });
  await clic(dlg(r6).getByRole('button', { name: 'Seguir' })); await clic(dlg(r6).getByRole('button', { name: 'Enviar reporte' }));
  ok(await contiene(r6, 'Ya no ves lo que publica. Lo revisamos en 48 h.'), 'reportar a una persona: deja de verla');
  ok(sql(`select count(*) from user_blocks where user_id = '${rp[5].id}' and target_user_id = '${RM}' and kind = 'mute' and removed_at is null`) === '1', 'queda silenciada para quien reporta');
  const QU = sql(`select id from queue_items where queue = 'repUsr' and subject_kind = 'user' and subject_id = '${RM}' and status = 'open'`);
  ok(!!QU && sql(`select priority from queue_items where id = ${QU}`) === 'alta', 'caso en «Reportes de usuario» (acoso con prioridad)');
  await adB.goto(B + '/admin/colas?caso=' + QU); await adB.getByText('REPORTES DE VECINOS').waitFor();
  await adB.screenshot({ path: OUT + 'c5d-colas-repusr-d.png', fullPage: true });
  await clic(adB.getByRole('button', { name: 'Sancionar' })); await clic(adB.getByText(/^Silencio 7 días · /)); await clic(adB.getByText('Primera vez', { exact: true }));
  await clic(adB.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select kind from sanctions where target_id = '${RM}' and lifted_at is null`) === 'mute7') && sql(`select status from users where id = '${RM}'`) === 'muted', 'el admin B lo silencia 7 días');
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RM}' and tpl = 'mod_sancion'`) !== '0'), 'la persona recibe la sanción con el motivo y «Apelar»');
  // 9b-3 · Punto de partida propio: arriba sale UNA fijada (la más nueva). Si otra prueba de la Comunidad falló antes de quitar la suya, tapaba la
  // pregunta de la semana; se quitan las fijadas de prueba que quedaron y la pregunta queda fijada.
  sql(`update com_posts set pinned_until = null where city_id = 'hzl' and pinned_until > now() and position('[c5' in body) > 0`);
  sql(`update com_posts set pinned_until = now() + interval '5 days' where author_kind = 'official' and city_id = 'hzl' and body like 'Pregunta de la semana:%'`);
  await mp.goto(B + '/comunidad'); ok(await contiene(mp, 'Pregunta de la semana'), 'silenciado: el muro se lee');
  await mp.goto(B + '/comunidad/nuevo'); ok(await contiene(mp, 'No puedes publicar hasta el') && await contiene(mp, 'Primera vez') && await contiene(mp, 'Ver y apelar'), 'Publicar dice hasta cuándo y por qué (y «Ver y apelar»)');
  await mp.screenshot({ path: OUT + 'c5d-silenciado-m.png' });
  await mp.goto(B + '/comunidad/p/' + P3); await mp.getByLabel('Tu comentario').fill(`Yo también ayudo ${TAG}`); await clic(mp.getByRole('button', { name: 'Comentar', exact: true }));
  ok(await contiene(mp, 'No puedes comentar hasta el'), 'silencio 7 días: tampoco comenta (lo decide el servidor)');
  await mp.goto(B + '/cuenta/moderacion'); ok(await contiene(mp, 'Silencio 7 días') && await contiene(mp, 'APELA HASTA EL'), 'Mi cuenta › Avisos de moderación: la sanción con su apelación');

  // ── 13 · Fotos: el modelo propio responde → se ve; caído → revisión manual (nunca publicada sin revisar); regla apagada dice por qué ──
  const r2 = rp[1].p;
  const conFoto = async (p, t) => {
    await p.goto(B + '/comunidad/nuevo?k=publicacion'); await p.locator('textarea').first().fill(`${t} ${TAG}`);
    await p.locator('input[type=file]').first().setInputFiles(IMG); await espera(async () => (await p.locator('[aria-label^="Quitar foto 1"]').count()) > 0, 20000);
    await clic(p.getByRole('button', { name: 'Publicar', exact: true })); await p.waitForURL(/\/comunidad\/p\/\d+/); return p.url().match(/\/p\/(\d+)/)[1];
  };
  const F1 = await conFoto(r2, 'Así quedó el parque después de la limpieza');
  ok(sql(`select string_agg(status, ',') from media where owner_kind = 'com_post' and owner_id = '${F1}'`) === 'visible', 'el modelo propio la revisó: la foto se ve');
  servicioImg(false); await espera(async () => !saludImg(), 8000);
  const F2 = await conFoto(r2, 'Otra del parque, la fuente nueva');
  ok(sql(`select string_agg(status, ',') from media where owner_kind = 'com_post' and owner_id = '${F2}'`) === 'review', 'servicio caído: la foto queda en revisión (no se publica sin revisar)');
  ok(await contiene(r2, '1 foto espera revisión antes de verse.'), 'quien publicó ve que su foto espera revisión; la publicación sí salió');
  await r2.screenshot({ path: OUT + 'c5d-foto-revision-m.png', fullPage: true });
  const MF = sql(`select id from media where owner_kind = 'com_post' and owner_id = '${F2}'`);
  const QM = sql(`select id from queue_items where queue = 'medios' and subject_kind = 'media' and subject_id = '${MF}' and status = 'open'`);
  ok(!!QM && sql(`select detail from mod_flags where target_id = '${MF}' and rule_key = 'img'`).includes('no respondió'), 'caso en «Medios marcados»: «El modelo no respondió: revisión manual»');
  await adA.goto(B + '/admin/contenido?tab=auto'); ok(await contiene(adA, 'NO RESPONDE') && await contiene(adA, 'espera revisión manual'), 'Auto-moderación dice que el modelo no responde y qué pasa con las fotos');
  servicioImg(true); ok(await espera(async () => saludImg(), 20000), 'el servicio vuelve');
  await adA.goto(B + '/admin/colas?caso=' + QM); await adA.getByText('NO SE VE HASTA QUE DECIDAS').waitFor();
  await adA.screenshot({ path: OUT + 'c5d-medios-d.png', fullPage: true });
  await clic(adA.getByRole('button', { name: 'Está bien' }));
  ok(await espera(() => sql(`select status from media where id = '${MF}'`) === 'visible'), 'una persona la aprueba: ahora se ve');
  await adA.goto(B + '/admin/contenido?tab=auto'); await adA.getByRole('switch', { name: 'Fotos: desnudez' }).waitFor();
  ok(await contiene(adA, 'RESPONDE') && await contiene(adA, 'NudeNet'), 'con el servicio arriba: «RESPONDE» y el modelo');
  await clic(adA.getByRole('switch', { name: 'Fotos: desnudez' })); await clic(adA.getByText('Prueba controlada', { exact: true })); await clic(adA.getByRole('button', { name: 'Apagar' }));
  ok(await espera(() => sql(`select enabled::text from mod_rules where key = 'img'`) === 'false'), 'el admin apaga la regla de fotos (con motivo)');
  await adA.goto(B + '/admin/contenido?tab=auto'); ok(await contiene(adA, 'Apagada: las fotos de la Comunidad se publican sin pasar por el modelo.'), 'regla de fotos apagada: dice por qué y qué pasa');
  await adA.screenshot({ path: OUT + 'c5d-auto-img-off-d.png', fullPage: true });
  await clic(adA.getByRole('switch', { name: 'Fotos: desnudez' })); await clic(adA.getByText('Volver a la regla de siempre', { exact: true })); await clic(adA.getByRole('button', { name: 'Encender' }));
  ok(await espera(() => sql(`select enabled::text from mod_rules where key = 'img'`) === 'true'), 'y la vuelve a encender');
  await clic(adA.getByRole('switch', { name: 'Teléfonos en publicaciones y comentarios' }));
  ok(await contiene(adA, 'Siempre activa: la base nunca guarda un teléfono'), '«Teléfonos» no se apaga: lo impone la base');
  ok(sqlErr(`update mod_rules set enabled = false where key = 'phone'`).includes('mod_rules_telefono_siempre'), 'la base tampoco deja apagar «Teléfonos»');

  // ── 14 · Reportar un comentario (escritorio) y Confianza y seguridad ──
  const r2d = await esc(); await entrar(r2d, R[1]);
  await r2d.goto(B + '/comunidad/p/' + P3); await r2d.getByText('Yo te ayudo, tengo camioneta').first().waitFor();
  await clic(r2d.getByRole('button', { name: 'Opciones del comentario' }).first()); await clic(dlg(r2d).getByText('Reportar comentario', { exact: true }));
  await clic(dlg(r2d).getByText('Información falsa', { exact: true })); await r2d.screenshot({ path: OUT + 'c5d-reportar-d.png' });
  await clic(dlg(r2d).getByRole('button', { name: 'Seguir' })); await clic(dlg(r2d).getByRole('button', { name: 'Enviar reporte' }));
  await dlg(r2d).getByText('Ya no lo ves. Lo revisamos en 48 h.').waitFor(); await clic(dlg(r2d).getByRole('button', { name: 'Listo' }));
  ok(await espera(async () => !(await texto(r2d)).includes('Yo te ayudo, tengo camioneta')), 'el comentario reportado deja de verse para quien reporta');
  ok(sql(`select count(*) from queue_items where queue = 'rep' and subject_kind = 'com_comment' and subject_id = '${C3}' and status = 'open'`) === '1', 'caso del comentario en Reportes');
  await adA.goto(B + '/admin/confianza'); await adA.getByText('LO QUE ESPERA UNA DECISIÓN').waitFor();
  ok(await contiene(adA, 'Reportes de usuario') && await contiene(adA, 'Apelaciones') && await contiene(adA, 'Aviso a la persona + apelación 14 días'), 'Confianza y seguridad: colas y cómo funciona');
  await adA.screenshot({ path: OUT + 'c5d-confianza-d.png', fullPage: true });
  await adA.goto(B + '/admin/confianza?tab=sanc'); ok(await contiene(adA, 'En la Comunidad: 7 días sin publicar, comentar ni escribir mensajes.'), 'catálogo de sanciones con su efecto en la Comunidad');
  await adA.goto(B + '/admin/confianza?tab=apel'); ok(await contiene(adA, 'LEVANTADA'), 'pestaña Apelaciones');
  const adm = await tel(); await entrar(adm, ADM); await adm.goto(B + '/admin/confianza?tab=act'); ok(await contiene(adm, 'Moisés'), 'Sancionados (teléfono)');
  await adm.screenshot({ path: OUT + 'c5d-confianza-m.png', fullPage: true });
  ok(await sinScroll(adm) && await sinScroll(ap) && await sinScroll(r1), 'sin scroll horizontal');

  // ── Deja todo como estaba ──
  sql(`update sanctions set lifted_at = now(), lift_reason = 'prueba' where target_kind = 'user' and target_id in (${TODOS.map((x) => `'${x}'`).join(', ')}) and lifted_at is null`);
  sql(`update users set status = 'active', status_until = null, status_reason = null where id in (${LISTA})`);
  sql(`update user_blocks set removed_at = now() where removed_at is null and (user_id in (${LISTA}) or target_user_id in (${LISTA}))`);
  sql(`update queue_items set status = 'decided', decision = 'prueba', reason = 'prueba', decided_at = now() where status = 'open' and ((queue in ('rep') and subject_kind in ('com_post', 'com_comment') and subject_id in (select id::text from com_posts where body like '%${TAG}%' union all select id::text from com_comments where body like '%${TAG}%')) or (queue = 'repUsr' and subject_id in (${TODOS.map((x) => `'${x}'`).join(', ')})) or (queue = 'apel' and subject_id in (select id::text from appeals where user_id in (${LISTA}))) or (queue = 'medios' and business_id is null))`);
  sql(`update content_reports set status = 'dismissed', created_at = created_at - interval '2 days' where reporter_user_id in (${LISTA}) and created_at > now() - interval '2 days'`);
  sql(`update reviews set status = 'removed', hidden_reason = 'prueba' where user_id = '${RV}' and status <> 'removed'`);
  sql(`update com_comments set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days' where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days', publish_at = publish_at - interval '2 days' where body like '%${TAG}%' or (author_user_id in (${LISTA}) and created_at > now() - interval '1 day')`);
  sql(`update mod_rules set enabled = true`); sql(`update platform_config set value = '10' where key = 'com_lim_publicaciones'`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK com5d');
})().catch((e) => { console.error(e); process.exit(1); });
