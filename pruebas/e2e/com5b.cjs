// 5b · Comunidad: el hilo. Comentar (teléfono, barra de abajo) y responder (escritorio, en el mismo hilo, Ctrl + Enter) con «@Nombre»
// (aviso a quien publicó, a quien contestas y a quien mencionas) · recomendar un negocio en el comentario; otra vecina «Sumar mi voto»
// → barras de % del servidor · la dueña no recomienda su negocio · votos +/quitar/− en publicación y comentario · dos personas votan a
// la vez → contador exacto (y 40 en paralelo en la base; mismo dispositivo callado; lo propio rechazado) · «Me sirvió» solo quien
// preguntó → RESUELTA y destacada; cambiarla · encuesta: votar → % del servidor; cerrada rechaza; el barrido la cierra y avisa una vez ·
// bloqueado no comenta · teléfono rechazado · Super Admin oculta y restaura un comentario. Crea sus datos ([c5b]) y los deja como estaban.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync, exec } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const sqlAsync = (q) => new Promise((ok, no) => exec(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, (e, so) => (e ? no(e) : ok(so.trim()))));
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { const x = await vis(l); if (!x) throw new Error('no visible: ' + l); await x.click(); };
const espera = async (f, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t) => espera(async () => (await texto(p)).includes(t));
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const TAG = '[c5b]';
const A = '5705550299', BB = '5705550288', C = '5705550122', Y = '5705550433', ADM = '5705550199';
const avisos = (u, tpl, ref) => sql(`select count(*) from notifications where user_id = '${u}' and tpl = '${tpl}'${ref ? ` and ref_id = '${ref}'` : ''}`);
const tarjeta = (p, t) => p.locator('[data-screen-label="Publicación · comentario"], [data-screen-label="Publicación · la más votada"]').filter({ hasText: t }).first();
const pill = (card) => card.locator('div[style*="height: 34px"], div[style*="height:34px"]').first();

(async () => {
  // ── Preparación: lo de corridas anteriores queda borrado (estado); sin bloqueos entre las vecinas de prueba; sanciones fuera. ──
  sql(`update com_comments set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days' where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()) where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update com_posts set created_at = created_at - interval '2 days', publish_at = publish_at - interval '2 days' where body like '%${TAG}%' and created_at > now() - interval '2 days'`); // fuera del límite de 24 h de A (com5a publica después)
  const RA = uid(A), RB = uid(BB), RC = uid(C), RY = uid(Y);
  const IDS = [RA, RB, RC, RY];
  // 5c: la Comunidad pide la bienvenida (reglas + «Tengo 18 años o más»): las cuentas de prueba la tienen hecha.
  for (const u of IDS) sql(`insert into community_profiles (user_id) values ('${u}') on conflict do nothing`);
  sql(`update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true, adult_ok_at = coalesce(adult_ok_at, now()), welcome_at = coalesce(welcome_at, now()) where user_id in (${IDS.map((x) => `'${x}'`).join(', ')})`);
  sql(`update user_blocks set removed_at = now() where removed_at is null and user_id in ('${RA}', '${RB}', '${RC}', '${RY}') and target_user_id in ('${RA}', '${RB}', '${RC}', '${RY}')`);
  sql(`update users set status = 'active', status_until = null where id in ('${RA}', '${RB}', '${RC}', '${RY}')`);
  const bestA = sql(`select answers_best_n from community_profiles where user_id = '${RB}'`) || '0', bestC = sql(`select answers_best_n from community_profiles where user_id = '${RC}'`) || '0';
  // Datos de la prueba (fixtures en la base, como si A los hubiera publicado ayer): una pregunta y una encuesta de 1 día.
  const Q = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, publish_at, created_at) values ('hzl', 'user', '${RA}', 'pregunta', 'comida', '¿Dónde venden bizcocho dominicano por encargo en Hazleton? ${TAG}', now() - interval '20 hours', now() - interval '20 hours') returning id`).split('\n')[0];
  const E = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, body, poll_options, poll_ends_at, publish_at, created_at) values ('hzl', 'user', '${RA}', 'encuesta', '¿Qué día prefieren el mercado de pulgas? ${TAG}', array['Sábado','Domingo'], now() + interval '1 day', now() - interval '2 hours', now() - interval '2 hours') returning id`).split('\n')[0];

  const b = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404/.test(m.text())) err.push('console: ' + m.text()); }); };
  const tel = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(p); return p; };
  const esc = async () => { const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(p); return p; };
  const bp = await tel(); await entrar(bp, BB);
  const cd = await esc(); await entrar(cd, C);
  const yp = await tel(); await entrar(yp, Y);
  const ap = await tel(); await entrar(ap, A);

  // ── 1 · B comenta en el teléfono (barra de abajo); un teléfono se rechaza; A recibe el aviso ──
  await bp.goto(B + '/comunidad/p/' + Q); await bp.getByLabel('Tu comentario').waitFor();
  ok(await contiene(bp, 'Nadie ha respondido todavía'), 'hilo vacío: «Nadie ha respondido todavía»');
  await bp.getByLabel('Tu comentario').fill(`Llámame al 570 555 0123 y te digo ${TAG}`);
  await clic(bp.getByRole('button', { name: 'Comentar', exact: true }));
  ok(await contiene(bp, 'No publiques teléfonos') && sql(`select count(*) from com_comments where post_id = ${Q}`) === '0', 'comentario con teléfono → rechazado con el motivo; nada se guardó');
  await bp.getByLabel('Tu comentario').fill(`Doña Mercedes en la Alter los hace riquísimos ${TAG}`);
  await bp.screenshot({ path: OUT + 'c5b-comentar-m.png' });
  await clic(bp.getByRole('button', { name: 'Comentar', exact: true }));
  ok(await espera(() => sql(`select count(*) from com_comments where post_id = ${Q} and author_user_id = '${RB}' and parent_id is null`) === '1'), 'comentario raíz guardado');
  const CB = sql(`select id from com_comments where post_id = ${Q} and author_user_id = '${RB}' and parent_id is null`);
  ok(await espera(() => avisos(RA, 'com_comment', CB) === '1'), 'A (quien preguntó) recibe «Comentaron tu publicación»');
  ok(await contiene(bp, 'Doña Mercedes en la Alter') && await contiene(bp, '1 comentario'), 'el comentario sale en el hilo y el contador es del servidor');

  // ── 2 · C responde en escritorio, en el mismo hilo (Esc cancela, Ctrl + Enter envía) ──
  await cd.goto(B + '/comunidad/p/' + Q); await cd.getByLabel('Tu comentario').waitFor();
  await clic(tarjeta(cd, 'Doña Mercedes').getByText('Responder', { exact: true }));
  await cd.getByLabel('Tu respuesta').waitFor(); ok(await contiene(cd, 'Respondiendo a Héctor A.'), 'escritorio: «Respondiendo a …» bajo el comentario');
  await cd.getByLabel('Tu respuesta').fill('no quiero'); await cd.getByLabel('Tu respuesta').press('Escape');
  ok(await espera(async () => (await cd.getByLabel('Tu respuesta').count()) === 0), 'Esc cancela la respuesta');
  await clic(tarjeta(cd, 'Doña Mercedes').getByText('Responder', { exact: true }));
  await cd.getByLabel('Tu respuesta').fill(`¿Y abre los domingos? ${TAG}`);
  await cd.screenshot({ path: OUT + 'c5b-responder-d.png' });
  await cd.getByLabel('Tu respuesta').press('Control+Enter');
  ok(await espera(() => sql(`select count(*) from com_comments where parent_id = ${CB} and author_user_id = '${RC}'`) === '1'), 'Ctrl + Enter: la respuesta queda bajo la raíz');
  const RC1 = sql(`select id from com_comments where parent_id = ${CB} and author_user_id = '${RC}'`);
  ok(await espera(() => avisos(RB, 'com_reply', RC1) === '1' && avisos(RA, 'com_comment', RC1) === '1'), 'aviso a B («Te respondieron») y a A (su publicación)');

  // ── 3 · B contesta la respuesta de C con «@Marisol» (un nivel abajo) → aviso de mención a C y a A ──
  await bp.goto(B + '/comunidad/p/' + Q); await bp.getByText('Ver 1 respuesta').first().waitFor();
  await clic(bp.getByText('Ver 1 respuesta')); await bp.getByText('¿Y abre los domingos?').first().waitFor();
  const resp = bp.locator('[data-screen-label="Comentario · respuestas"]').first();
  await clic(resp.getByText('Responder', { exact: true }));
  ok(await espera(async () => (await bp.getByLabel('Tu respuesta').inputValue()) === '@Marisol ') && await contiene(bp, 'Respondiendo a Marisol P.'), 'responder a una respuesta: «@Marisol» y «Respondiendo a Marisol P.»');
  await bp.getByLabel('Tu respuesta').fill(`@Marisol Sí, de 9 a 1 ${TAG}`);
  await clic(bp.getByRole('button', { name: 'Responder', exact: true }));
  ok(await espera(() => sql(`select count(*) from com_comments where parent_id = ${CB} and reply_to_id = ${RC1} and author_user_id = '${RB}'`) === '1'), 'la respuesta a la respuesta: misma raíz y reply_to');
  const RB2 = sql(`select id from com_comments where parent_id = ${CB} and reply_to_id = ${RC1}`);
  ok(await espera(() => avisos(RC, 'com_mention', RB2) === '1' && avisos(RA, 'com_comment', RB2) === '1') && sql(`select count(*) from com_mentions where comment_id = ${RB2} and user_id = '${RC}'`) === '1',
    '«@Marisol»: aviso de mención a C (com_mentions) y a A; B no se avisa a sí mismo');
  ok(avisos(RB, 'com_reply', RB2) === '0' && avisos(RB, 'com_mention', RB2) === '0', 'nadie recibe aviso de lo suyo');
  ok(await espera(async () => (await resp.innerText()).includes('@Marisol') && (await resp.innerText()).includes('Sí, de 9 a 1')), 'la respuesta sale un nivel abajo con «@Marisol»');
  await bp.screenshot({ path: OUT + 'c5b-respuestas-m.png', fullPage: true });

  // ── 4 · Recomendar un negocio en el comentario (C, escritorio); la dueña no recomienda el suyo; «Sumar mi voto» ──
  await cd.goto(B + '/comunidad/p/' + Q); await cd.getByLabel('Tu comentario').waitFor();
  await clic(cd.getByRole('button', { name: 'Recomendar un negocio' }));
  await cd.getByLabel('Buscar negocio').fill('espiga'); await cd.getByRole('option').filter({ hasText: 'Panadería La Espiga' }).first().waitFor();
  await clic(cd.getByRole('option').filter({ hasText: 'Panadería La Espiga' }));
  ok(await contiene(cd, 'RECOMIENDAS ESTE NEGOCIO'), 'el negocio queda adjunto al comentario');
  await cd.getByLabel('Tu comentario').fill(`La Espiga los hace por encargo con dos días ${TAG}`);
  await clic(cd.getByRole('button', { name: 'Comentar', exact: true }));
  ok(await espera(() => sql(`select count(*) from com_comments where post_id = ${Q} and author_user_id = '${RC}' and business_id = 'panaderia-la-espiga'`) === '1'), 'comentario con el negocio recomendado');
  const CE = sql(`select id from com_comments where post_id = ${Q} and business_id = 'panaderia-la-espiga' and status = 'visible'`);
  ok(sql(`select votes_n || ':' || recs_n || ':' || top_comment_id from com_thread_recs where post_id = ${Q} and business_id = 'panaderia-la-espiga'`) === `0:1:${CE}`, 'com_thread_recs (derivado): 1 lo recomienda, 0 votos, su comentario');
  // B recomienda otro negocio (teléfono).
  await bp.goto(B + '/comunidad/p/' + Q); await bp.getByLabel('Tu comentario').waitFor();
  await clic(bp.getByRole('button', { name: 'Recomendar un negocio' }));
  await bp.getByLabel('Buscar negocio').fill('frenos'); await bp.getByRole('option').filter({ hasText: 'Jiménez' }).first().waitFor();
  await clic(bp.getByRole('option').filter({ hasText: 'Jiménez' }));
  await bp.getByLabel('Tu comentario').fill(`No es pan, pero Jiménez me arregló el carro para ir a buscarlo ${TAG}`);
  await clic(bp.getByRole('button', { name: 'Comentar', exact: true }));
  ok(await espera(() => sql(`select count(*) from com_comments where post_id = ${Q} and business_id = 'frenos-jimenez'`) === '1'), 'B recomienda otro negocio');
  const CJ = sql(`select id from com_comments where post_id = ${Q} and business_id = 'frenos-jimenez'`);
  // La dueña (Y) no se recomienda en un comentario.
  await yp.goto(B + '/comunidad/p/' + Q); await yp.getByLabel('Tu comentario').waitFor();
  await clic(yp.getByRole('button', { name: 'Recomendar un negocio' }));
  await yp.getByLabel('Buscar negocio').fill('rentas hazleton'); await yp.getByRole('option').filter({ hasText: 'Rentas Hazleton Latino' }).first().waitFor();
  await clic(yp.getByRole('option').filter({ hasText: 'Rentas Hazleton Latino' }));
  await yp.getByLabel('Tu comentario').fill(`Pregunten por mí ${TAG}`); await clic(yp.getByRole('button', { name: 'Comentar', exact: true }));
  ok(await contiene(yp, 'No puedes recomendar tu propio negocio') && sql(`select count(*) from com_comments where post_id = ${Q} and business_id = 'rentas-hazleton-latino'`) === '0', 'la dueña no recomienda su negocio en un comentario');
  await clic(yp.getByRole('button', { name: 'Quitar el negocio' })); await yp.getByLabel('Tu comentario').fill('');
  // Y elige La Espiga, que ya está en el hilo → «Sumar mi voto».
  await clic(yp.getByRole('button', { name: 'Recomendar un negocio' }));
  await yp.getByLabel('Buscar negocio').fill('espiga'); await yp.getByRole('option').filter({ hasText: 'Panadería La Espiga' }).first().waitFor();
  await clic(yp.getByRole('option').filter({ hasText: 'Panadería La Espiga' }));
  ok(await contiene(yp, 'YA LO RECOMENDARON AQUÍ') && await contiene(yp, 'Marisol P. ya lo recomendó en este hilo'), 'ya está en el hilo → «YA LO RECOMENDARON AQUÍ»');
  await yp.screenshot({ path: OUT + 'c5b-sumar-m.png' });
  await clic(yp.getByRole('button', { name: 'Sumar mi voto' }));
  ok(await espera(() => sql(`select votes_n from com_thread_recs where post_id = ${Q} and business_id = 'panaderia-la-espiga'`) === '1') && sql(`select up_n from com_comments where id = ${CE}`) === '1', '«Sumar mi voto» = voto + al comentario que lo recomendó; el derivado sube');
  // C vota la recomendación de B desde las barras; A (quien preguntó) suma su voto a La Espiga → 2 y 1 = 67 % y 33 %.
  await cd.goto(B + '/comunidad/p/' + Q); await cd.locator('[data-screen-label="Publicación · recomendados"]').waitFor();
  await clic(cd.locator('[data-screen-label="Publicación · recomendados"] > div > div').filter({ hasText: 'Jiménez' }).locator('> span').last());
  ok(await espera(() => sql(`select votes_n from com_thread_recs where post_id = ${Q} and business_id = 'frenos-jimenez'`) === '1'), 'el «+» de la barra suma el voto');
  await ap.goto(B + '/comunidad/p/' + Q); await ap.locator('[data-screen-label="Publicación · recomendados"]').waitFor();
  await clic(ap.locator('[data-screen-label="Publicación · recomendados"] > div > div').filter({ hasText: 'Espiga' }).locator('> span').last());
  ok(await espera(() => sql(`select votes_n from com_thread_recs where post_id = ${Q} and business_id = 'panaderia-la-espiga'`) === '2'), 'A también la suma');
  await cd.reload(); await cd.locator('[data-screen-label="Publicación · recomendados"]').waitFor();
  const anchos = await cd.locator('[data-screen-label="Publicación · recomendados"] > div > div > span:first-child').evaluateAll((L) => L.map((x) => x.style.width));
  ok(JSON.stringify(anchos) === '["67%","33%"]', `barras de % del servidor (sumen 100): ${JSON.stringify(anchos)}`);
  ok(await contiene(cd, 'Recomendados en este hilo'), 'sin destacada con negocio: «Recomendados en este hilo»');
  await cd.screenshot({ path: OUT + 'c5b-recomendados-d.png', fullPage: true });

  // ── 5 · Votos en la publicación y en un comentario: +, quitar, − (Y) ──
  await yp.goto(B + '/comunidad/p/' + Q); await yp.getByRole('button', { name: 'Votar a favor' }).first().waitFor();
  const post = () => sql(`select up_n || ':' || down_n || ':' || score || ':' || (hot = com_hot(score, publish_at)) from com_posts where id = ${Q}`);
  const p0 = post();
  await clic(yp.getByRole('button', { name: 'Votar a favor' })); ok(await espera(() => post().startsWith(`${+p0.split(':')[0] + 1}:`)), 'publicación: voto +');
  const barra = yp.locator('[data-screen-label="APP-COM-POST · publicación"] span[style*="border-radius: 999px"], [data-screen-label="APP-COM-POST · publicación"] span[style*="border-radius:999px"]').first();
  ok(/rgba\(75, 55, 245, 0\.35\)/.test(await barra.evaluate((x) => getComputedStyle(x).borderColor)), 'votaste: borde y tinte morado (VoteBar 4c)');
  await clic(yp.getByRole('button', { name: 'Votar a favor' })); ok(await espera(() => post() === p0), 'el mismo toque quita el voto');
  await clic(yp.getByRole('button', { name: 'Votar en contra' })); ok(await espera(() => post() === `${p0.split(':')[0]}:1:${+p0.split(':')[2] - 1}:true`), 'cambiar a −: down 1, score y hot recalculados en la base');
  const cm = () => sql(`select up_n || ':' || down_n || ':' || score from com_comments where id = ${CB}`);
  const c0 = cm(), cardB = tarjeta(yp, 'Doña Mercedes');
  await clic(pill(cardB).locator('> span').first()); ok(await espera(() => cm() === `${+c0.split(':')[0] + 1}:0:${+c0.split(':')[2] + 1}`), 'comentario: voto +');
  await clic(pill(cardB).locator('> span').first()); ok(await espera(() => cm() === c0), 'comentario: el mismo toque lo quita');
  await clic(pill(cardB).locator('> span').last()); ok(await espera(() => cm() === `${c0.split(':')[0]}:1:${+c0.split(':')[2] - 1}`), 'comentario: cambiar a −');
  await clic(pill(tarjeta(bp, 'Doña Mercedes')).locator('> span').first());
  ok(await contiene(bp, 'Lo tuyo lo votan los demás.'), 'lo propio no se vota');

  // ── 6 · Dos personas votan a la vez (B y C) → contador exacto; 40 votos en paralelo en la base; mismo dispositivo callado ──
  await bp.goto(B + '/comunidad/p/' + Q); await cd.goto(B + '/comunidad/p/' + Q);
  await bp.getByRole('button', { name: 'Votar a favor' }).first().waitFor(); await cd.getByRole('button', { name: 'Votar a favor' }).first().waitFor();
  const u0 = +sql(`select up_n from com_posts where id = ${Q}`);
  await Promise.all([clic(bp.getByRole('button', { name: 'Votar a favor' })), clic(cd.getByRole('button', { name: 'Votar a favor' }))]);
  ok(await espera(() => sql(`select up_n from com_posts where id = ${Q}`) === String(u0 + 2)), 'dos contextos votan a la vez: +2 exacto');
  const V = sql(`select id from users where phone between '+15705559150' and '+15705559189' order by phone`).split('\n');
  await Promise.all(V.map((u) => sqlAsync(`select com_votar('post', ${Q}, '${u}', 1::smallint, null)`)));
  await Promise.all(V.map((u, i) => sqlAsync(`select com_votar('post', ${Q}, '${u}', ${i % 2 ? 1 : -1}::smallint, null)`))); // la mitad quita, la otra cambia a −
  const cuenta = sql(`select p.up_n || ':' || p.down_n || ':' || p.score || ':' || (p.hot = com_hot(p.score, p.publish_at)) || '|' || (select count(*) filter (where v = 1 and counted) || ':' || count(*) filter (where v = -1 and counted) from com_votes where target_kind = 'post' and target_id = ${Q}) from com_posts p where p.id = ${Q}`);
  const [cc, vv] = cuenta.split('|');
  ok(cc.split(':').slice(0, 2).join(':') === vv && cc.endsWith(':true') && vv === `${u0 + 2}:${1 + 20}`, `80 toques en paralelo: contadores = votos que cuentan y hot recalculado (${cuenta})`);
  await Promise.all(V.filter((_, i) => i % 2 === 0).map((u) => sqlAsync(`select com_votar('post', ${Q}, '${u}', -1::smallint, null)`)));
  const dev = 'c5b00000-0000-4000-8000-000000000001', [d1, d2] = V.slice(0, 2), up1 = +sql(`select up_n from com_comments where id = ${CJ}`);
  sql(`select com_votar('comment', ${CJ}, '${d1}', 1::smallint, '${dev}')`); sql(`select com_votar('comment', ${CJ}, '${d2}', 1::smallint, '${dev}')`);
  ok(sql(`select up_n from com_comments where id = ${CJ}`) === String(up1 + 1) && sql(`select counted from com_votes where target_kind = 'comment' and target_id = ${CJ} and user_id = '${d2}'`) === 'f', 'dos cuentas del mismo dispositivo: el segundo voto queda callado');
  sql(`select com_votar('comment', ${CJ}, '${d2}', 1::smallint, '${dev}')`); sql(`select com_votar('comment', ${CJ}, '${d1}', 1::smallint, '${dev}')`);
  ok(sql(`select up_n from com_comments where id = ${CJ}`) === String(up1), 'quitarlos deja el contador como estaba');
  ok(/lo propio no se vota/.test(sqlErr(`select com_votar('post', ${Q}, '${RA}', 1::smallint, null)`)), 'la base rechaza votar lo propio');
  ok(/derivado/.test(sqlErr(`update com_thread_recs set votes_n = 99 where post_id = ${Q}`)) && /derivados/.test(sqlErr(`update com_comments set up_n = 99 where id = ${CB}`)), 'contadores y recomendados a mano → la base lo rechaza');

  // ── 7 · «Me sirvió»: solo quien preguntó → RESUELTA y destacada; luego la cambia ──
  await bp.goto(B + '/comunidad/p/' + Q); await bp.getByLabel('Tu comentario').waitFor();
  ok(!(await texto(bp)).includes('Me sirvió'), 'quien no preguntó no ve «Me sirvió»');
  await ap.goto(B + '/comunidad/p/' + Q); await ap.getByLabel('Tu comentario').waitFor();
  await clic(tarjeta(ap, 'Doña Mercedes').getByText('Me sirvió', { exact: true }));
  ok(await espera(() => sql(`select (best_comment_id = ${CB}) || ':' || (solved_at is not null) from com_posts where id = ${Q}`) === 'true:true'), '«Me sirvió» → mejor respuesta y RESUELTA en la base');
  ok(await contiene(ap, 'LE SIRVIÓ A YARITZA') && await contiene(ap, 'Resuelta'), 'la destacada «LE SIRVIÓ A …» y «Resuelta» en la publicación');
  ok(await espera(() => avisos(RB, 'com_best', CB) === '1') && sql(`select answers_best_n from community_profiles where user_id = '${RB}'`) === String(+bestA + 1), 'B recibe «Tu respuesta le sirvió» y su contador derivado sube');
  await ap.screenshot({ path: OUT + 'c5b-mesirvio-m.png', fullPage: true });
  await clic(tarjeta(ap, 'La Espiga los hace').locator('span[style*="width: 30px"], span[style*="width:30px"]'));
  await clic(ap.getByRole('button').filter({ hasText: 'Esta me sirvió más' }));
  ok(await espera(() => sql(`select best_comment_id from com_posts where id = ${Q}`) === CE), 'quien preguntó la cambia: una sola mejor respuesta');
  ok(await espera(() => avisos(RC, 'com_best', CE) === '1') && sql(`select answers_best_n from community_profiles where user_id = '${RB}'`) === bestA && sql(`select answers_best_n from community_profiles where user_id = '${RC}'`) === String(+bestC + 1), 'los contadores derivados pasan de una a otra');
  await ap.reload(); ok(await contiene(ap, 'También recomiendan'), 'la destacada trae negocio → «También recomiendan» (sin repetirlo)');
  await cd.goto(B + '/comunidad/p/' + Q); await cd.getByText('LE SIRVIÓ A YARITZA').first().waitFor();
  await cd.screenshot({ path: OUT + 'c5b-hilo-d.png', fullPage: true });
  ok(/mejor respuesta/.test(sqlErr(`update com_posts set best_comment_id = ${RC1} where id = ${Q}`)), 'la base solo acepta una raíz de la misma publicación');

  // ── 8 · Encuesta: votar → % del servidor; cerrada rechaza; el barrido la cierra y avisa una vez ──
  await bp.goto(B + '/comunidad/p/' + E); await clic(bp.getByRole('button', { name: 'Sábado' }));
  ok(await espera(() => sql(`select poll_counts::text from com_posts where id = ${E}`) === '{1,0}') && await contiene(bp, '100%') && await contiene(bp, 'TU VOTO NO SE CAMBIA'), 'encuesta: votas y ves el % (del servidor)');
  await cd.goto(B + '/comunidad/p/' + E); ok(await contiene(cd, 'VOTA PARA VER CÓMO VA') && !(await texto(cd)).includes('100%'), 'antes de votar no se ven los %');
  await clic(cd.getByRole('button', { name: 'Domingo' })); ok(await espera(() => sql(`select poll_counts::text from com_posts where id = ${E}`) === '{1,1}') && await contiene(cd, '50%'), 'otro voto → 50 % / 50 %');
  await cd.screenshot({ path: OUT + 'c5b-encuesta-d.png' });
  await yp.goto(B + '/comunidad/p/' + E); await yp.getByRole('button', { name: 'Domingo' }).waitFor();
  sql(`update com_posts set poll_ends_at = now() - interval '1 minute' where id = ${E}`);
  await clic(yp.getByRole('button', { name: 'Domingo' }));
  ok(await contiene(yp, 'Esta encuesta ya cerró.') && sql(`select poll_counts::text from com_posts where id = ${E}`) === '{1,1}', 'encuesta cerrada → el servidor rechaza el voto');
  ok(/ya cerró/.test(sqlErr(`insert into com_poll_votes (post_id, user_id, opt) values (${E}, '${RY}', 0)`)), 'y la base también');
  const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
  barrer();
  ok(await espera(() => sql(`select poll_closed_at is not null from com_posts where id = ${E}`) === 't'), 'el barrido cierra la encuesta');
  ok(avisos(RA, 'com_poll_closed', E) === '1' && avisos(RB, 'com_poll_closed', E) === '1' && avisos(RC, 'com_poll_closed', E) === '1' && avisos(RY, 'com_poll_closed', E) === '0', 'resultado a quien la publicó y a quienes votaron');
  ok(sql(`select body from notifications where user_id = '${RB}' and tpl = 'com_poll_closed' and ref_id = '${E}'`).includes('Empate entre «Sábado» y «Domingo», de 2 votos.'), 'el aviso trae el resultado');
  barrer(); ok(avisos(RA, 'com_poll_closed', E) === '1' && avisos(RB, 'com_poll_closed', E) === '1', 'otro barrido no avisa otra vez');
  await yp.reload(); ok(await contiene(yp, 'CERRADA') && await contiene(yp, '50%'), 'cerrada: todos ven el resultado');
  await yp.screenshot({ path: OUT + 'c5b-encuesta-cerrada-m.png' });

  // ── 9 · Bloqueo: A bloquea a B → B no comenta ni ve la publicación de A ──
  await bp.goto(B + '/comunidad/p/' + Q); await bp.getByLabel('Tu comentario').waitFor();
  sql(`insert into user_blocks (user_id, target_user_id, kind) values ('${RA}', '${RB}', 'block')`);
  const nB = sql(`select count(*) from com_comments where author_user_id = '${RB}' and post_id = ${Q}`);
  await bp.getByLabel('Tu comentario').fill(`Otra cosa más ${TAG}`); await clic(bp.getByRole('button', { name: 'Comentar', exact: true }));
  ok(await contiene(bp, 'Esa publicación ya no está.') && sql(`select count(*) from com_comments where author_user_id = '${RB}' and post_id = ${Q}`) === nB, 'bloqueado: el servidor no deja comentar');
  await bp.goto(B + '/comunidad/p/' + Q); ok(await contiene(bp, 'Esta publicación ya no está'), 'y la publicación no existe para él');
  await ap.goto(B + '/comunidad/p/' + Q); await ap.getByLabel('Tu comentario').waitFor();
  ok(!(await texto(ap)).includes('Doña Mercedes en la Alter') && !(await texto(ap)).includes('Jiménez me arregló'), 'A tampoco ve lo de B en su hilo');
  sql(`update user_blocks set removed_at = now() where user_id = '${RA}' and target_user_id = '${RB}' and removed_at is null`);

  // ── 10 · Super Admin › Contenido › Comentarios de vecinos: ocultar con motivo y restaurar ──
  const adm = await esc(); await entrar(adm, ADM);
  await adm.goto(B + `/admin/contenido?tab=ccm&q=${encodeURIComponent('Jiménez me arregló')}`); await adm.getByText('Comentario de vecino', { exact: false }).first().waitFor(); // 5i: la pestaña se llama «Comentarios» (prototipo)
  await clic(adm.getByText('Ocultar', { exact: true })); await clic(adm.getByText('Spam o publicidad')); await clic(adm.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select status || ':' || hidden_by from com_comments where id = ${CJ}`) === 'hidden:admin'), 'admin oculta el comentario con motivo');
  ok(sql(`select count(*) from audit_entries where action = 'com.comentario.ocultar' and target_id = '${CJ}'`) === '1' && await espera(() => avisos(RB, 'com_cm_hide', CJ) === '1'), 'auditado y el autor recibe el aviso');
  ok(sql(`select recs_n from com_thread_recs where post_id = ${Q} and business_id = 'frenos-jimenez'`) === '0', 'oculto → sale de los recomendados del hilo (derivado)');
  await adm.screenshot({ path: OUT + 'c5b-admin-d.png', fullPage: true });
  await adm.goto(B + `/admin/contenido?tab=ccm&q=${encodeURIComponent('Jiménez me arregló')}`); await clic(adm.getByText('Restaurar', { exact: true }));
  await clic(adm.getByText('No rompe las reglas del barrio')); await clic(adm.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select status from com_comments where id = ${CJ}`) === 'visible') && sql(`select recs_n from com_thread_recs where post_id = ${Q} and business_id = 'frenos-jimenez'`) === '1', 'restaurar → vuelve al hilo y a los recomendados');

  // ── 11 · El hilo usa su índice; teléfono y escritorio sin scroll horizontal ──
  const plan = execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "set enable_seqscan = off; explain select id from com_comments c where c.post_id = ${Q} and c.parent_id is null and (c.status = 'visible' or c.replies_n > 0) order by c.score desc, c.id limit 21"`).toString();
  ok(/Index (Only )?Scan using com_comments_hilo_idx/.test(plan) && !/Sort/.test(plan), 'las raíces del hilo salen de com_comments_hilo_idx sin ordenar aparte');
  ok(await ap.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1) && await cd.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sin scroll horizontal (teléfono y escritorio)');
  await ap.goto(B + '/comunidad/p/' + Q); await ap.getByLabel('Tu comentario').waitFor(); await ap.screenshot({ path: OUT + 'c5b-hilo-m.png' });

  // ── Deja todo como estaba ──
  sql(`update com_comments set status = 'deleted', deleted_at = coalesce(deleted_at, now()) where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()) where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update com_posts set created_at = created_at - interval '2 days', publish_at = publish_at - interval '2 days' where body like '%${TAG}%' and created_at > now() - interval '2 days'`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK com5b');
})().catch((e) => { console.error(e); process.exit(1); });
