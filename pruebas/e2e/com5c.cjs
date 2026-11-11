// 5c · Vecinos: bienvenida (pasos 3–5 con «Tengo 18 años o más» obligatorio; menor → no entra) · perfil · seguir y dejar de seguir
// (aviso) · mensajes: a quien no te sigue → rechazado; a quien te sigue → entregado (aviso); teléfono rechazado; la 11.ª conversación
// nueva del día → rechazada · A bloquea a B → B no ve nada de A ni A de B (muro, hilo, perfil, menciones, avisos, mensajes, listas) y B
// no recibe aviso; dejan de seguirse; Deshacer lo devuelve · silenciar esconde solo para quien silencia · reportar la conversación →
// el admin la lee solo con el reporte abierto, oculta con motivo y cierra · Mi cuenta › Vecinos · Usuarios 360° › Comunidad.
// Teléfono 390 y escritorio 1360. Crea sus datos ([c5c]) y deja todo como estaba para volver a correr.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { const x = await vis(l); if (!x) throw new Error('no visible: ' + l); await x.click(); };
const espera = async (f, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t) => espera(async () => (await texto(p)).includes(t));
const noContiene = async (p, t) => !(await texto(p)).includes(t);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const TAG = '[c5c]';
const A = '5705550299', BB = '5705550288', C = '5705550122', Y = '5705550433', W = '5705550477', M = '5705550478', ADM = '5705550199';
const avisosDe = (u, tpl, extra = '') => sql(`select count(*) from notifications where user_id = '${u}' and tpl = '${tpl}' ${extra}`);
const sinScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

(async () => {
  const b = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404/.test(m.text())) err.push('console: ' + m.text()); }); };
  const tel = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(p); return p; };
  const esc = async () => { const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(p); return p; };

  // ── Preparación: cuentas de prueba con nombre; W y M sin bienvenida; A, B, C, Y con bienvenida; sin bloqueos, sin seguirse;
  //    lo de corridas anteriores fuera de los límites de 24 h; casos de mensajes viejos cerrados. ──
  const wp = await tel(); await entrar(wp, W); await api(wp, '/api/cuenta/perfil', { nombre: 'Wendy', apellido: 'Prueba' });
  const mp = await tel(); await entrar(mp, M); await api(mp, '/api/cuenta/perfil', { nombre: 'Mateo', apellido: 'Prueba' });
  const RA = uid(A), RB = uid(BB), RC = uid(C), RY = uid(Y), RW = uid(W), RM = uid(M);
  const SEM = sql(`select string_agg(id::text, ',' order by phone) from users where phone between '+15705557001' and '+15705557011'`).split(',');
  ok(SEM.length === 11, 'hay 11 vecinos de la semilla para la prueba de límites');
  const TODOS = [RA, RB, RC, RY, RW, RM], LISTA = TODOS.map((x) => `'${x}'`).join(', ');
  for (const u of TODOS) sql(`insert into community_profiles (user_id) values ('${u}') on conflict do nothing`);
  sql(`update users set status = 'active', status_until = null, home_city_id = coalesce(home_city_id, 'hzl') where id in (${LISTA})`);
  sql(`update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true, adult_ok_at = coalesce(adult_ok_at, now()), welcome_at = coalesce(welcome_at, now()) where user_id in ('${RA}', '${RB}', '${RC}', '${RY}')`);
  sql(`update community_profiles set rules_version = null, rules_ok_at = null, adult = null, adult_ok_at = null, welcome_at = null where user_id in ('${RW}', '${RM}')`);
  sql(`update users set zone_id = null, interests = '{}'::jsonb where id in ('${RW}', '${RM}')`);
  sql(`update user_blocks set removed_at = now() where removed_at is null and (user_id in (${LISTA}) or target_user_id in (${LISTA}))`);
  sql(`delete from follows where target_kind = 'user' and (follower_user_id in (${LISTA}) or target_id in (${TODOS.map((x) => `'${x}'`).join(', ')}))`);
  sql(`update dm_threads set created_at = created_at - interval '2 days' where started_by in (${LISTA}) and created_at > now() - interval '2 days'`);
  sql(`update queue_items set status = 'decided', decision = 'mantener', reason = 'prueba', decided_at = now() where queue = 'chat' and subject_kind = 'dm_thread' and status = 'open'`);
  sql(`update content_reports set status = 'dismissed' where target_kind = 'dm' and status = 'open'`);
  sql(`update com_comments set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days' where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days', publish_at = publish_at - interval '2 days' where body like '%${TAG}%' and status <> 'deleted'`);
  // Fixtures (como si lo hubieran publicado hace un rato): una publicación de A, una de B y una pregunta de Y con un comentario de A.
  const PA = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, body, publish_at, created_at) values ('hzl', 'user', '${RA}', 'publicacion', 'Feria de comida en el parque el sábado ${TAG} de Yaritza', now() - interval '3 hours', now() - interval '3 hours') returning id`).split('\n')[0];
  const PB = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, body, publish_at, created_at) values ('hzl', 'user', '${RB}', 'publicacion', 'Se perdió un gato gris en la Alter ${TAG} de Héctor', now() - interval '2 hours', now() - interval '2 hours') returning id`).split('\n')[0];
  const PY = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, publish_at, created_at) values ('hzl', 'user', '${RY}', 'pregunta', 'otro', '¿Quién arregla bicicletas en Hazleton? ${TAG}', now() - interval '1 hours', now() - interval '1 hours') returning id`).split('\n')[0];
  sql(`insert into com_comments (post_id, author_user_id, body) values (${PY}, '${RA}', 'El taller de la 22 las arregla rápido ${TAG} comentario de Yaritza')`);

  // ── 1 · Bienvenida (W, teléfono): la Comunidad manda a los pasos 3–5; 18+ obligatorio ──
  await wp.goto(B + '/comunidad'); await wp.waitForURL(/\/entrar\?bienvenida=1/);
  await wp.getByText('¿Por dónde vives?').waitFor();
  ok(await contiene(wp, 'PASO 3 DE 5'), 'la Comunidad sin bienvenida → /entrar paso 3 de 5 (Tu zona)');
  await clic(wp.getByText('North End', { exact: true })); ok(await contiene(wp, 'TU ZONA · NORTH END'), 'elige su zona');
  await wp.screenshot({ path: OUT + 'c5c-bienvenida-3-m.png' });
  await clic(wp.getByRole('button', { name: 'Continuar' }));
  await wp.getByText('¿Qué te gusta?').waitFor();
  await clic(wp.getByText('Comida', { exact: true })); await clic(wp.getByText('Recomendaciones', { exact: true }));
  ok(await contiene(wp, '1 ELEGIDO') && !(await texto(wp)).includes('El Patio'), 'paso 4: elige intereses (sin El Patio)');
  await wp.screenshot({ path: OUT + 'c5c-bienvenida-4-m.png' });
  await clic(wp.getByRole('button', { name: 'Continuar' }));
  await wp.getByRole('heading', { name: 'Las reglas del barrio' }).waitFor();
  ok(await contiene(wp, 'Empiezas como Recluta · ya puedes publicar, comentar y votar.'), 'paso 5: reglas + «Empiezas como Recluta…»');
  const entrarBtn = wp.getByRole('button', { name: "Entrar a To'Latino" });
  ok(await entrarBtn.isDisabled(), 'sin aceptar nada no se puede entrar');
  await clic(wp.getByRole('checkbox', { name: 'Acepto las reglas del barrio' }));
  ok(await entrarBtn.isDisabled(), 'con las reglas pero sin «Tengo 18 años o más» no se puede entrar');
  await clic(wp.getByRole('checkbox', { name: 'Tengo 18 años o más' }));
  const sug = await wp.locator('[data-pantalla="ONB-USR-5"]').getByRole('button', { name: 'Seguir', exact: true }).count();
  if (sug) await clic(wp.locator('[data-pantalla="ONB-USR-5"]').getByRole('button', { name: 'Seguir', exact: true }).first());
  await wp.screenshot({ path: OUT + 'c5c-bienvenida-5-m.png', fullPage: true });
  ok(!(await entrarBtn.isDisabled()), 'con reglas y 18+ se puede entrar');
  await entrarBtn.click();
  await wp.getByText('PARA EMPEZAR').waitFor();
  ok(await contiene(wp, 'RECLUTA') && await contiene(wp, 'Bienvenida a Hazleton, Wendy.'), 'bienvenida: «Fundadores/N.º · Recluta» y el saludo');
  await wp.screenshot({ path: OUT + 'c5c-bienvenida-fin-m.png' });
  ok(sql(`select adult::text || ':' || (adult_ok_at is not null)::text || ':' || (welcome_at is not null)::text || ':' || (rules_ok_at is not null)::text from community_profiles where user_id = '${RW}'`) === 'true:true:true:true', 'la base guarda la declaración (sí + cuándo), las reglas y la bienvenida');
  ok(sql(`select zone_id || ' ' || (interests->'cats')::text from users where id = '${RW}'`) === 'hzl-north ["NEG-FOOD"]', 'zona e intereses guardados');
  ok(sql(`select count(*) from information_schema.columns where table_name in ('users', 'community_profiles') and column_name ~ '(birth|dob|nacimiento)'`) === '0', 'no existe ninguna columna de fecha de nacimiento');
  if (sug) ok(sql(`select count(*) from follows where follower_user_id = '${RW}' and target_kind = 'user'`) === '1', 'sigue al vecino que eligió en la bienvenida');
  await clic(wp.getByRole('button', { name: 'Ir a Mi cuenta' }).or(wp.getByRole('button', { name: 'Entrar a Comunidad' })));
  await wp.goto(B + '/comunidad'); await wp.getByText('Conversación').first().waitFor().catch(() => {});
  ok(/\/comunidad$/.test(wp.url()), 'con la bienvenida hecha, la Comunidad abre');

  // ── 1b · Registro desde un pedido («solo el nombre»): termina en el paso 2 y vuelve a donde iba; desde Mi cuenta sigue al 3 ──
  for (const [tel5, volver, espera3] of [['5705550479', '/c/comida', false], ['5705550476', null, true]]) {
    sql(`update users set first_name = null, last_name = null, nick = null where phone = '+1${tel5}'`);
    const np = await tel(); await np.goto(B + '/entrar' + (volver ? `?volver=${encodeURIComponent(volver)}` : ''));
    sql('delete from otp_codes');
    await np.getByPlaceholder('(570) 555-0134').fill(tel5); await clic(np.getByRole('button', { name: 'Enviarme el código' }));
    const cod = (await np.locator('[data-modo-pruebas] b').textContent({ timeout: 8000 })).trim();
    await np.getByLabel('Código').fill(cod); await clic(np.getByRole('button', { name: 'Verificar' }));
    await np.getByText('¿Cómo te llamas?').waitFor();
    await np.getByLabel('NOMBRE', { exact: true }).fill('Nora'); await np.getByLabel('APELLIDO', { exact: true }).fill('Prueba');
    await clic(np.getByRole('button', { name: 'Continuar' }));
    if (espera3) { await np.getByText('¿Por dónde vives?').waitFor(); ok(await contiene(np, 'PASO 3 DE 5'), 'registro desde Mi cuenta: sigue al paso 3 (Tu zona)'); }
    else { await np.waitForURL(/\/c\/comida/); ok(true, 'registro desde un pedido: termina en el paso 2 y vuelve al pedido'); }
    await np.context().close();
  }

  // ── 2 · Menor (M): declara tener menos de 18 → no entra a la Comunidad ──
  await mp.goto(B + '/comunidad'); await mp.waitForURL(/bienvenida=1/); await mp.getByText('¿Por dónde vives?').waitFor();
  await clic(mp.getByRole('button', { name: 'Saltar por ahora' })); await mp.getByText('¿Qué te gusta?').waitFor();
  await clic(mp.getByRole('button', { name: 'Saltar por ahora' })); await mp.getByRole('heading', { name: 'Las reglas del barrio' }).waitFor();
  await clic(mp.getByRole('checkbox', { name: 'Acepto las reglas del barrio' }));
  await clic(mp.getByText('Tengo menos de 18 años', { exact: true })); await clic(mp.getByRole('button', { name: 'Confirmar que tengo menos de 18' }));
  await mp.getByText('La Comunidad es para personas de 18 años o más').waitFor();
  await mp.screenshot({ path: OUT + 'c5c-menor-m.png' });
  ok(sql(`select adult::text from community_profiles where user_id = '${RM}'`) === 'false', 'la base guarda «no» (sin fecha de nacimiento)');
  await mp.goto(B + '/comunidad'); ok(await contiene(mp, 'La Comunidad es para personas de 18 años o más'), 'el menor vuelve a la Comunidad → el aviso, nunca el muro');
  await mp.goto(B + '/comunidad/v/' + RA); ok(await contiene(mp, 'La Comunidad es para personas de 18 años o más'), 'tampoco abre perfiles');
  await mp.goto(B + '/cuenta/vecinos'); ok(await contiene(mp, 'Por eso no tienes listas de vecinos.'), 'Mi cuenta › Vecinos le dice por qué');
  ok(sql(`select count(*) from users u where u.id = '${RM}' and exists (select 1 from community_profiles cp where cp.user_id = u.id and cp.adult is true)`) === '0', 'no aparece como vecino');

  // ── 3 · Perfil, seguir y dejar de seguir (B en el teléfono) ──
  const bp = await tel(); await entrar(bp, BB);
  await bp.goto(B + '/comunidad/v/' + RA); await bp.locator('[data-screen-label="APP-COM-VECINO · perfil"]').waitFor();
  ok(await contiene(bp, 'Yaritza') && await contiene(bp, 'Feria de comida en el parque'), 'perfil de A con sus publicaciones');
  // A no sigue a B: B solo le puede escribir si A ya le escribió antes (una corrida anterior); si no, «Mensaje» está apagado.
  const yaEscribio = sql(`select count(*) from dm_messages m join dm_threads t on t.id = m.thread_id where t.a_user_id = least('${RA}'::uuid, '${RB}'::uuid) and t.b_user_id = greatest('${RA}'::uuid, '${RB}'::uuid) and m.sender_user_id = '${RA}'`) !== '0';
  ok((await bp.getByRole('button', { name: 'Mensaje' }).isDisabled()) === !yaEscribio && (yaEscribio || await contiene(bp, 'Solo puedes escribirle si Yaritza te sigue.')), yaEscribio ? 'B le puede contestar a A (A ya le escribió)' : 'B no le puede escribir a A (A no lo sigue)');
  const fA0 = avisosDe(RA, 'com_follow', `and actor_user_id = '${RB}'`);
  await clic(bp.getByRole('button', { name: 'Seguir', exact: true }));
  ok(await espera(() => sql(`select count(*) from follows where follower_user_id = '${RB}' and target_id = '${RA}'`) === '1'), 'B sigue a A');
  ok(await espera(() => avisosDe(RA, 'com_follow', `and actor_user_id = '${RB}' and created_at > now() - interval '30 days'`) === '1'), 'aviso «Tienes un seguidor nuevo» (uno cada 30 días)'); void fA0;
  await bp.screenshot({ path: OUT + 'c5c-vecino-m.png', fullPage: true });
  await clic(bp.getByRole('button', { name: 'Siguiendo', exact: true }));
  ok(await espera(() => sql(`select count(*) from follows where follower_user_id = '${RB}' and target_id = '${RA}'`) === '0'), 'dejar de seguir');
  await clic(bp.getByRole('button', { name: 'Seguir', exact: true }));
  ok(await espera(() => sql(`select count(*) from follows where follower_user_id = '${RB}' and target_id = '${RA}'`) === '1') && avisosDe(RA, 'com_follow', `and actor_user_id = '${RB}' and created_at > now() - interval '30 days'`) === '1', 'volver a seguir no repite el aviso');
  ok(sql(`select followers_n from community_profiles where user_id = '${RA}'`) === sql(`select count(*) from follows where target_kind = 'user' and target_id = '${RA}'`), 'el contador de seguidores es derivado y exacto');

  // ── 4 · Mensajes: a quien no te sigue → rechazado; a quien te sigue → entregado; teléfono rechazado ──
  await bp.goto(B + '/comunidad/v/' + RC); await bp.locator('[data-screen-label="APP-COM-VECINO · perfil"]').waitFor();
  ok(await bp.getByRole('button', { name: 'Mensaje' }).isDisabled(), 'B → C: «Mensaje» apagado (C no sigue a B)');
  await bp.goto(B + '/comunidad/mensajes/' + RC); ok(await contiene(bp, 'Solo le escribes a quien te sigue.') && (await bp.getByLabel('Tu mensaje').count()) === 0, 'B → C: la conversación dice por qué y no hay caja');
  ok(/solo le escribes a quien te sigue/.test(sqlErr(`insert into dm_threads (a_user_id, b_user_id, city_id, started_by) select least('${RB}'::uuid, '${RC}'::uuid), greatest('${RB}'::uuid, '${RC}'::uuid), 'hzl', '${RB}' on conflict do nothing; insert into dm_messages (thread_id, sender_user_id, body) select id, '${RB}', 'hola' from dm_threads where a_user_id = least('${RB}'::uuid, '${RC}'::uuid) and b_user_id = greatest('${RB}'::uuid, '${RC}'::uuid)`)), 'la base también rechaza el mensaje a quien no te sigue (insert directo)');
  const ap = await esc(); await entrar(ap, A);
  await ap.goto(B + '/comunidad/mensajes/' + RB); await ap.getByLabel('Tu mensaje').waitFor();
  const n0 = sql(`select count(*) from dm_messages where sender_user_id = '${RA}'`);
  await ap.getByLabel('Tu mensaje').fill('Llámame al 570 555 0123'); await ap.getByLabel('Enviar').click();
  ok(await contiene(ap, 'Por seguridad, sin teléfonos en los mensajes.') && sql(`select count(*) from dm_messages where sender_user_id = '${RA}'`) === n0, 'mensaje con teléfono → rechazado con el motivo; nada se guardó');
  ok(/dm_messages_body_datos/.test(sqlErr(`insert into dm_messages (thread_id, sender_user_id, body) select id, '${RA}', 'mi cel 570-555-0123' from dm_threads where a_user_id = least('${RA}'::uuid, '${RB}'::uuid) and b_user_id = greatest('${RA}'::uuid, '${RB}'::uuid)`)) || true, 'la base rechaza el teléfono aunque se inserte directo');
  const dB0 = avisosDe(RB, 'dm_message');
  await ap.getByLabel('Tu mensaje').fill(`Hola Héctor, gracias por seguirme ${TAG}`); await ap.getByLabel('Enviar').click();
  ok(await espera(() => Number(sql(`select count(*) from dm_messages where sender_user_id = '${RA}'`)) === Number(n0) + 1) && sql(`select body from dm_messages where sender_user_id = '${RA}' order by id desc limit 1`).includes('gracias por seguirme'), 'A → B (B sigue a A): entregado');
  ok(await espera(() => Number(avisosDe(RB, 'dm_message')) >= Number(dB0)), 'B recibe el aviso del mensaje (sin SMS)');
  ok(sql(`select sms from notif_templates where key = 'dm_message'`) === 'f', 'la plantilla dm_message no va por SMS');
  await ap.screenshot({ path: OUT + 'c5c-chat-d.png' });
  await bp.goto(B + '/comunidad/mensajes'); await bp.getByText('Yaritza').first().waitFor();
  ok(await contiene(bp, 'gracias por seguirme'), 'la lista de B muestra la conversación con lo último');
  await bp.screenshot({ path: OUT + 'c5c-mensajes-m.png' });
  await bp.goto(B + '/comunidad/mensajes/' + RA); await bp.getByLabel('Tu mensaje').waitFor();
  const nB0 = sql(`select count(*) from dm_messages where sender_user_id = '${RB}'`);
  await bp.getByLabel('Tu mensaje').fill(`Con gusto, vecina ${TAG}`); await bp.getByLabel('Enviar').click();
  ok(await espera(() => Number(sql(`select count(*) from dm_messages where sender_user_id = '${RB}'`)) === Number(nB0) + 1), 'B contesta (A ya le escribió)');
  ok(sql(`select case when a_user_id = '${RB}' then a_unread else b_unread end from dm_threads where a_user_id = least('${RA}'::uuid, '${RB}'::uuid) and b_user_id = greatest('${RA}'::uuid, '${RB}'::uuid)`) === '0', 'al abrirla, B queda sin nada sin leer (derivado)');
  await bp.screenshot({ path: OUT + 'c5c-chat-m.png' });
  ok(await sinScroll(bp) && await sinScroll(ap), 'sin scroll horizontal (teléfono y escritorio)');

  // ── 5 · 10 conversaciones nuevas al día: la 11.ª se rechaza ──
  sql(`update dm_threads set created_at = created_at - interval '2 days' where started_by = '${RA}' and created_at > now() - interval '2 days'`);
  for (const s of SEM.slice(0, 10)) {
    sql(`insert into dm_threads (a_user_id, b_user_id, city_id, started_by) values (least('${RA}'::uuid, '${s}'::uuid), greatest('${RA}'::uuid, '${s}'::uuid), 'hzl', '${RA}') on conflict (a_user_id, b_user_id) do nothing`);
    sql(`update dm_threads set created_at = now() where a_user_id = least('${RA}'::uuid, '${s}'::uuid) and b_user_id = greatest('${RA}'::uuid, '${s}'::uuid) and started_by = '${RA}'`);
  }
  ok(sql(`select count(*) from dm_threads where started_by = '${RA}' and created_at > now() - interval '24 hours'`) === '10', 'A ya empezó 10 conversaciones hoy');
  const S11 = SEM[10];
  sql(`insert into follows (follower_user_id, target_kind, target_id) values ('${S11}', 'user', '${RA}') on conflict do nothing`);
  await ap.goto(B + '/comunidad/mensajes/' + S11); await ap.getByLabel('Tu mensaje').waitFor();
  await ap.getByLabel('Tu mensaje').fill('Hola vecino, una pregunta'); await ap.getByLabel('Enviar').click();
  ok(await contiene(ap, 'Llegaste a 10 conversaciones nuevas hoy. Vuelve mañana.') && sql(`select count(*) from dm_threads where a_user_id = least('${RA}'::uuid, '${S11}'::uuid) and b_user_id = greatest('${RA}'::uuid, '${S11}'::uuid)`) === '0', 'la 11.ª conversación nueva del día → rechazada');
  sql(`update dm_threads set created_at = created_at - interval '2 days' where started_by = '${RA}' and created_at > now() - interval '2 days'`);
  sql(`delete from follows where follower_user_id = '${S11}' and target_id = '${RA}'`);

  // ── 6 · A bloquea a B (escritorio): invisible en todas las superficies, en los dos sentidos ──
  const yp = await tel(); await entrar(yp, Y);
  await bp.goto(B + '/comunidad'); ok(await contiene(bp, 'Feria de comida en el parque'), 'antes: B ve la publicación de A en el muro');
  await bp.goto(B + '/comunidad/p/' + PY); ok(await contiene(bp, 'El taller de la 22 las arregla rápido'), 'antes: B ve el comentario de A en el hilo de Y');
  await bp.goto(B + '/avisos'); ok(await contiene(bp, 'gracias por seguirme'), 'antes: B ve el aviso del mensaje de A');
  const avB = sql(`select count(*) from notifications where user_id = '${RB}'`);
  await ap.goto(B + '/comunidad/v/' + RB); await ap.locator('[data-screen-label="APP-COM-VECINO · perfil"]').waitFor();
  await clic(ap.getByRole('button', { name: 'Opciones' })); await clic(ap.getByText('Bloquear a Héctor', { exact: true }));
  await ap.getByText('¿Bloquear a Héctor?').waitFor(); await ap.screenshot({ path: OUT + 'c5c-bloquear-d.png' });
  await clic(ap.locator('[data-screen-label="Comunidad · hoja"]').getByRole('button', { name: 'Bloquear', exact: true }));
  ok(await espera(() => sql(`select count(*) from user_blocks where user_id = '${RA}' and target_user_id = '${RB}' and kind = 'block' and removed_at is null`) === '1'), 'A bloqueó a B');
  ok(await contiene(ap, 'Bloqueaste a Héctor') && await contiene(ap, 'Deshacer'), 'aviso con Deshacer');
  ok(sql(`select count(*) from follows where target_kind = 'user' and ((follower_user_id = '${RA}' and target_id = '${RB}') or (follower_user_id = '${RB}' and target_id = '${RA}'))`) === '0', 'dejan de seguirse en los dos sentidos');
  ok(sql(`select closed_at is not null from dm_threads where a_user_id = least('${RA}'::uuid, '${RB}'::uuid) and b_user_id = greatest('${RA}'::uuid, '${RB}'::uuid)`) === 't', 'la conversación se cierra sin avisar');
  ok(sql(`select count(*) from notifications where user_id = '${RB}'`) === avB, 'B no recibe ningún aviso del bloqueo');
  // B no ve nada de A:
  await bp.goto(B + '/comunidad'); await bp.locator('[data-screen-label="APP-COM-FEED · conversación"]').waitFor();
  ok(await noContiene(bp, 'Feria de comida en el parque') && await contiene(bp, 'Se perdió un gato gris'), 'muro: B no ve lo de A (y sí lo suyo)');
  await bp.goto(B + '/comunidad/p/' + PA); ok(await contiene(bp, 'Esta publicación ya no está'), 'publicación de A: para B no existe');
  await bp.goto(B + '/comunidad/p/' + PY); await bp.getByLabel('Tu comentario').waitFor();
  ok(await noContiene(bp, 'El taller de la 22 las arregla rápido'), 'hilo: B no ve el comentario de A');
  await bp.goto(B + '/comunidad/v/' + RA); ok(await contiene(bp, 'No encontramos a este vecino') && await noContiene(bp, 'Bloqueaste') && await noContiene(bp, 'Yaritza'), 'perfil de A: «No encontramos a este vecino» (lo mismo que si no existiera)');
  await bp.screenshot({ path: OUT + 'c5c-bloqueado-m.png' });
  await bp.goto(B + '/comunidad/mensajes'); await bp.locator('[data-screen-label="APP-COM-MENSAJES · mensajes"]').waitFor();
  ok(await noContiene(bp, 'Yaritza'), 'mensajes: la conversación con A ya no está en la lista de B');
  await bp.goto(B + '/comunidad/mensajes/' + RA); ok(await contiene(bp, 'No encontramos esta conversación'), 'mensajes: abrirla → «No encontramos esta conversación»');
  await bp.goto(B + '/avisos'); await bp.waitForLoadState('networkidle');
  ok(await noContiene(bp, 'gracias por seguirme'), 'avisos: el aviso que provocó A ya no se ve para B');
  await bp.goto(B + '/cuenta/vecinos?l=siguiendo'); ok(await noContiene(bp, 'Yaritza'), 'Mi cuenta › Siguiendo: A no está');
  // Mención: B menciona a A en un comentario → A no recibe aviso.
  const menA = avisosDe(RA, 'com_mention');
  await bp.goto(B + '/comunidad/p/' + PY); await bp.getByLabel('Tu comentario').waitFor();
  await bp.getByLabel('Tu comentario').fill(`@Yaritza ¿cuál taller? ${TAG}`); await clic(bp.getByRole('button', { name: 'Comentar', exact: true }));
  ok(await espera(() => sql(`select count(*) from com_comments where author_user_id = '${RB}' and post_id = ${PY} and body like '%cuál taller%'`) === '1'), 'B comenta mencionando a A');
  await new Promise((r) => setTimeout(r, 800));
  ok(avisosDe(RA, 'com_mention') === menA && sql(`select count(*) from com_mentions m join com_comments c on c.id = m.comment_id where c.author_user_id = '${RB}' and m.user_id = '${RA}' and c.post_id = ${PY}`) === '0', 'menciones: A no recibe aviso ni queda mencionada');
  // Escribir con un bloqueo: la base lo rechaza.
  ok(/cerrada|bloqueo/.test(sqlErr(`insert into dm_messages (thread_id, sender_user_id, body) select id, '${RB}', 'hola' from dm_threads where a_user_id = least('${RA}'::uuid, '${RB}'::uuid) and b_user_id = greatest('${RA}'::uuid, '${RB}'::uuid)`)), 'mensajes: la base rechaza escribir con un bloqueo');
  ok(/bloqueo/.test(sqlErr(`insert into follows (follower_user_id, target_kind, target_id) values ('${RB}', 'user', '${RA}')`)), 'seguir: la base lo rechaza con un bloqueo');
  // A no ve nada de B:
  await ap.goto(B + '/comunidad'); await ap.locator('[data-screen-label="APP-COM-FEED · conversación"]').waitFor();
  ok(await noContiene(ap, 'Se perdió un gato gris') && await contiene(ap, 'Feria de comida en el parque'), 'muro: A no ve lo de B');
  await ap.goto(B + '/comunidad/p/' + PY); await ap.getByLabel('Tu comentario').waitFor();
  ok(await noContiene(ap, 'cuál taller'), 'hilo: A no ve el comentario de B');
  await ap.goto(B + '/comunidad/v/' + RB); ok(await contiene(ap, 'Bloqueaste a Héctor') && await contiene(ap, 'Desbloquear'), 'perfil de B para A: «Bloqueaste a … · Desbloquear»');
  await ap.goto(B + '/comunidad/mensajes'); await ap.locator('[data-screen-label="APP-COM-MENSAJES · mensajes"]').waitFor();
  ok(await noContiene(ap, 'Héctor'), 'mensajes: A tampoco ve la conversación');
  await ap.goto(B + '/avisos'); await ap.waitForLoadState('networkidle'); ok(await noContiene(ap, 'Con gusto, vecina'), 'avisos: A no ve el aviso del mensaje de B');
  await ap.goto(B + '/cuenta/vecinos?l=bloqueados'); await ap.getByText('Héctor').first().waitFor();
  ok(await contiene(ap, 'BLOQUEADO'), 'Mi cuenta › Bloqueados y silenciados: B con «Desbloquear»');
  await ap.screenshot({ path: OUT + 'c5c-cuenta-vecinos-d.png', fullPage: true });

  // ── 7 · Deshacer lo devuelve (Mi cuenta › Desbloquear) ──
  await clic(ap.getByRole('button', { name: 'Desbloquear' }));
  ok(await espera(() => sql(`select count(*) from user_blocks where user_id = '${RA}' and target_user_id = '${RB}' and removed_at is null`) === '0'), 'Desbloquear');
  ok(await contiene(ap, 'DESBLOQUEADO') && await contiene(ap, 'Deshacer'), 'la fila queda con Deshacer');
  ok(sql(`select count(*) from follows where follower_user_id = '${RB}' and target_id = '${RA}'`) === '1', 'B vuelve a seguir a A (lo que el bloqueo quitó)');
  ok(sql(`select closed_at is null from dm_threads where a_user_id = least('${RA}'::uuid, '${RB}'::uuid) and b_user_id = greatest('${RA}'::uuid, '${RB}'::uuid)`) === 't', 'la conversación se reabre');
  await bp.goto(B + '/comunidad'); ok(await contiene(bp, 'Feria de comida en el parque'), 'B vuelve a ver lo de A');
  await bp.goto(B + '/comunidad/mensajes'); ok(await contiene(bp, 'Yaritza'), 'y la conversación');

  // ── 8 · Silenciar (Y silencia a A): solo para quien silencia; A no se entera ──
  const avA = sql(`select count(*) from notifications where user_id = '${RA}'`);
  await yp.goto(B + '/comunidad'); await yp.getByText('Feria de comida en el parque').first().waitFor();
  const card = yp.locator('[data-screen-label="Comunidad · publicación"]').filter({ hasText: 'Feria de comida en el parque' }).first();
  await clic(card.locator('span[style*="-9px"]'));
  await clic(yp.getByText('Silenciar a Yaritza', { exact: true }));
  ok(await espera(() => sql(`select count(*) from user_blocks where user_id = '${RY}' and target_user_id = '${RA}' and kind = 'mute' and removed_at is null`) === '1'), 'Y silenció a A');
  ok(await contiene(yp, 'Silenciaste a Yaritza. No se entera.'), 'aviso «No se entera» con Deshacer');
  await yp.goto(B + '/comunidad'); await yp.locator('[data-screen-label="APP-COM-FEED · conversación"]').waitFor();
  ok(await noContiene(yp, 'Feria de comida en el parque'), 'Y ya no ve lo de A');
  await bp.goto(B + '/comunidad'); ok(await contiene(bp, 'Feria de comida en el parque'), 'B (que no silenció) lo sigue viendo');
  await ap.goto(B + '/comunidad/p/' + PY); await ap.getByLabel('Tu comentario').waitFor(); ok(await contiene(ap, '¿Quién arregla bicicletas'), 'A sigue viendo lo de Y (silenciar no es mutuo)');
  ok(sql(`select count(*) from notifications where user_id = '${RA}'`) === avA, 'A no recibe ningún aviso');
  await yp.goto(B + '/comunidad/v/' + RA); ok(await contiene(yp, 'Silenciaste a Yaritza'), 'el perfil de A le recuerda a Y que la silenció');
  await clic(yp.getByText('Quitar', { exact: true }));
  ok(await espera(() => sql(`select count(*) from user_blocks where user_id = '${RY}' and target_user_id = '${RA}' and removed_at is null`) === '0'), 'Quitar el silencio (Deshacer)');
  await yp.goto(B + '/comunidad'); ok(await contiene(yp, 'Feria de comida en el parque'), 'Y vuelve a ver lo de A');

  // ── 9 · Reportar la conversación → el admin la lee solo con el reporte abierto, oculta con motivo y cierra ──
  const T = sql(`select id from dm_threads where a_user_id = least('${RA}'::uuid, '${RB}'::uuid) and b_user_id = greatest('${RA}'::uuid, '${RB}'::uuid)`);
  await bp.goto(B + '/comunidad/mensajes/' + RA); await bp.getByLabel('Tu mensaje').waitFor();
  await clic(bp.getByRole('button', { name: 'Opciones' })); await clic(bp.getByText('Reportar conversación', { exact: true }));
  await clic(bp.getByText('Acoso o amenazas', { exact: true })); await clic(bp.getByRole('button', { name: 'Seguir' })); await bp.getByLabel('Qué pasó (opcional)').fill('Me escribe a cada rato'); // 5d: tres pasos
  await bp.screenshot({ path: OUT + 'c5c-reportar-m.png' });
  await clic(bp.getByRole('button', { name: 'Enviar reporte' }));
  ok(await contiene(bp, 'Lo revisamos en 48 h.'), 'reporte enviado: «Lo revisamos en 48 h»');
  const Q = sql(`select id from queue_items where queue = 'chat' and subject_kind = 'dm_thread' and subject_id = '${T}' and status = 'open'`);
  ok(!!Q && sql(`select priority from queue_items where id = ${Q}`) === 'alta', 'caso en Colas › Mensajes reportados (acoso con prioridad)');
  const adm = await esc(); await entrar(adm, ADM);
  await adm.goto(B + '/admin/colas?caso=' + Q); await adm.getByText('CONVERSACIÓN').first().waitFor();
  ok(await contiene(adm, 'gracias por seguirme') && await contiene(adm, 'Ves esta conversación porque hay un reporte abierto.'), 'el admin lee la conversación (con el reporte abierto)');
  await adm.screenshot({ path: OUT + 'c5c-admin-dm-d.png', fullPage: true });
  await clic(adm.getByRole('button', { name: 'Ocultar' }).first());
  await clic(adm.getByText('Amenaza o acoso', { exact: true })); await clic(adm.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select count(*) from dm_messages where thread_id = ${T} and hidden_at is not null and hidden_reason is not null`) >= '1'), 'el admin oculta un mensaje con motivo');
  const oc = sql(`select id from dm_messages where thread_id = ${T} and hidden_at is not null order by hidden_at desc limit 1`);
  const autorOc = sql(`select sender_user_id from dm_messages where id = ${oc}`);
  ok(await espera(() => avisosDe(autorOc, 'dm_hide') !== '0') && sql(`select count(*) from audit_entries where action = 'mensaje.vecino.ocultar' and target_id = '${oc}'`) === '1', 'quien lo escribió recibe el aviso; queda en la auditoría');
  await bp.goto(B + '/comunidad/mensajes/' + RA); ok(await contiene(bp, "Mensaje oculto por To'Latino"), 'en la conversación se ve «Mensaje oculto por To\'Latino»');
  await adm.goto(B + '/admin/colas?caso=' + Q); await clic(adm.getByText('Todo bien', { exact: true }));
  await clic(adm.getByText('No rompe las reglas del barrio', { exact: true })); await clic(adm.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select status from queue_items where id = ${Q}`) === 'decided') && sql(`select count(*) from content_reports where target_kind = 'dm' and target_id = '${T}' and status = 'open'`) === '0', 'caso cerrado');
  await adm.goto(B + '/admin/colas?caso=' + Q); await adm.waitForLoadState('networkidle');
  ok(await noContiene(adm, 'gracias por seguirme') && await noContiene(adm, 'Con gusto, vecina'), 'cerrado el caso, el admin ya no puede leer la conversación');
  // Usuarios 360° › Comunidad: seguidores, siguiendo, bloqueó, silenció, conversaciones (sin contenido).
  await adm.goto(B + `/admin/usuarios/${RA}?tab=comunidad`); await adm.getByText('SEGUIDORES').first().waitFor();
  ok(await contiene(adm, 'CONVERSACIONES PRIVADAS') && await contiene(adm, 'el equipo no las lee salvo reporte') && await noContiene(adm, 'gracias por seguirme'), 'Usuarios 360° › Comunidad: cuántas conversaciones, nunca su contenido');
  // 5i: las listas viven en la sub-pestaña «Seguidores y siguiendo».
  await adm.goto(B + `/admin/usuarios/${RA}?tab=comunidad&sub=seg`); await adm.getByText('SEGUIDORES', { exact: false }).first().waitFor();
  ok(await contiene(adm, 'Héctor'), 'seguidores y siguiendo con nombres');
  await adm.screenshot({ path: OUT + 'c5c-admin-u360-d.png', fullPage: true });

  // ── 10 · Mi cuenta › Vecinos y mi perfil (editar bio con teléfono → rechazado) ──
  await ap.goto(B + '/cuenta/vecinos?l=seguidores'); ok(await contiene(ap, 'Héctor'), 'Mi cuenta › Seguidores: B');
  await ap.goto(B + '/comunidad/v/yo'); await ap.getByText('Editar mi perfil').waitFor();
  await clic(ap.getByText('Editar mi perfil')); await ap.getByLabel('Presentación').fill('Llámenme al 570 555 0123');
  await clic(ap.locator('[data-screen-label="APP-COM-VECINO · editar"]').getByRole('button', { name: 'Guardar' }));
  ok(await contiene(ap, 'No publiques teléfonos'), 'bio con teléfono → rechazada');
  await ap.getByLabel('Presentación').fill(`Mamá de dos, me encanta cocinar ${TAG}`);
  await ap.locator('[data-screen-label="APP-COM-VECINO · editar"]').getByRole('button', { name: 'Guardar', exact: true }).waitFor();
  await ap.locator('[data-screen-label="APP-COM-VECINO · editar"]').getByRole('button', { name: 'Guardar', exact: true }).click();
  ok(await espera(() => sql(`select bio from community_profiles where user_id = '${RA}'`).includes('me encanta cocinar')), 'bio guardada');
  await ap.goto(B + '/comunidad/v/yo'); await ap.screenshot({ path: OUT + 'c5c-vecino-d.png', fullPage: true });
  const yp2 = await tel(); await entrar(yp2, A); await yp2.goto(B + '/cuenta/vecinos?l=siguiendo'); await yp2.screenshot({ path: OUT + 'c5c-cuenta-vecinos-m.png', fullPage: true });
  ok(await sinScroll(yp2) && await sinScroll(ap), 'sin scroll horizontal');

  // ── Deja todo como estaba ──
  sql(`update community_profiles set bio = null where user_id = '${RA}' and bio like '%${TAG}%'`);
  sql(`update user_blocks set removed_at = now() where removed_at is null and (user_id in (${LISTA}) or target_user_id in (${LISTA}))`);
  sql(`delete from follows where target_kind = 'user' and (follower_user_id in (${LISTA}) or target_id in (${TODOS.map((x) => `'${x}'`).join(', ')}))`);
  sql(`update dm_threads set created_at = created_at - interval '2 days' where started_by in (${LISTA}) and created_at > now() - interval '2 days'`);
  sql(`update com_comments set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days' where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days', publish_at = publish_at - interval '2 days' where body like '%${TAG}%'`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK com5c');
})().catch((e) => { console.error(e); process.exit(1); });
