// 5h · «Ver traducción» propia (D3). Con un traductor DE MENTIRA solo para esta prueba (stub-traductor.cjs, imita la API de
// LibreTranslate; sus textos dicen «[stub→es]»): el servidor se reinicia con TRADUCTOR_URL apuntando al stub y al final vuelve a su
// configuración normal (sin traductor). Prueba: A publica en inglés (el idioma lo detecta el servicio) → B (español) ve «Ver traducción»
// → «Traduciendo…» → la traducción con «Ver original · Traducción automática del inglés» → «Ver original»; lo de su idioma no trae
// botón; la segunda vez sale de la caché (el stub no recibe otra llamada); A edita → se traduce otra vez (hash nuevo); una persona con la
// app en inglés ve «See translation» en lo que está en español; reseña + respuesta del negocio y comentario de Novedades; el servicio
// caído → «La traducción no está disponible ahora.» y la pantalla sigue (votar funciona; publicar usa el idioma de la app); el
// corta-circuito se abre a las 5 fallas; el límite por persona lo rechaza con el motivo; el Super Admin ve el original; sin
// TRADUCTOR_URL (como servir.sh) el botón dice el error con gracia. Crea sus datos ([c5h]) y los deja como estaban.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync, spawn } = require('child_process');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100', PORT = 5099, STUB = `http://127.0.0.1:${PORT}`;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { const x = await vis(l); if (!x) throw new Error('no visible: ' + l); await x.click(); };
const espera = async (f, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const sh = (c) => execSync(c, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const stubN = async () => (await fetch(`${STUB}/__n`)).json();
let stub = null;
const stubArriba = async () => { stub = spawn('node', [ENT.RAIZ + '/pruebas/lib/stub-traductor.cjs', String(PORT)], { stdio: 'ignore' }); await espera(async () => { try { await stubN(); return true; } catch { return false; } }, 5000); };
const stubAbajo = async () => { if (stub) { stub.kill(); stub = null; } await espera(async () => { try { await stubN(); return false; } catch { return true; } }, 5000); };
const servidor = (url) => console.log('  ·', sh(`SOLO=servir TRADUCTOR_URL=${url ?? ''} bash ${ENT.RAIZ}/pruebas/servir/servir.sh`));
const TAG = '[c5h]';
const A = '5705550299', BB = '5705550288', C = '5705550122', Y = '5705550433', ADM = '5705550199', BIZ = 'sabor-dominicano';
const tarjetaPost = (p) => p.locator('[data-screen-label="APP-COM-POST · publicación"]').first();
const comentario = (p, t) => p.locator('[data-screen-label="Publicación · comentario"]').filter({ hasText: t }).first();
const verTr = (l) => l.locator('[data-tr="ver"]');

(async () => {
  const RA = uid(A), RB = uid(BB), RC = uid(C), RY = uid(Y), IDS = [RA, RB, RC, RY];
  const TOPE0 = sql(`select value #>> '{}' from platform_config where key = 'com_traduccion_hora'`) || '60';
  const limpiar = () => {
    sql(`update com_comments set status = 'deleted', deleted_at = coalesce(deleted_at, now()), created_at = created_at - interval '2 days' where body like '%${TAG}%' and status <> 'deleted'`);
    sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()) where body like '%${TAG}%' and status <> 'deleted'`);
    sql(`update com_posts set created_at = created_at - interval '2 days', publish_at = publish_at - interval '2 days' where body like '%${TAG}%' and created_at > now() - interval '2 days'`);
    sql(`update reviews set status = 'removed' where body like '%${TAG}%' and status <> 'removed'`);
    sql(`update post_comments set status = 'removed' where body like '%${TAG}%' and status <> 'removed'`);
    // ugc_translations es derivado (una caché): lo de la prueba se puede tirar.
    sql(`delete from ugc_translations where (target_kind = 'com_post' and target_id in (select id from com_posts where body like '%${TAG}%')) or (target_kind = 'com_comment' and target_id in (select id from com_comments where body like '%${TAG}%'))
           or (target_kind in ('review', 'review_reply') and target_id in (select id from reviews where body like '%${TAG}%')) or (target_kind = 'post_comment' and target_id in (select id from post_comments where body like '%${TAG}%'))`);
    sql(`delete from ugc_translation_uses where who in (${IDS.map((x) => `'u:${x}'`).join(', ')})`);
    sql(`update platform_config set value = '${TOPE0}'::jsonb where key = 'com_traduccion_hora'`);
  };
  limpiar();
  for (const u of IDS) sql(`insert into community_profiles (user_id) values ('${u}') on conflict do nothing`);
  sql(`update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true, adult_ok_at = coalesce(adult_ok_at, now()), welcome_at = coalesce(welcome_at, now()) where user_id in (${IDS.map((x) => `'${x}'`).join(', ')})`);
  sql(`update user_blocks set removed_at = now() where removed_at is null and user_id in (${IDS.map((x) => `'${x}'`).join(', ')}) and target_user_id in (${IDS.map((x) => `'${x}'`).join(', ')})`);
  sql(`update users set status = 'active', status_until = null where id in (${IDS.map((x) => `'${x}'`).join(', ')})`);
  const langA = sql(`select coalesce(lang, 'es') from users where id = '${RA}'`);
  ok(langA === 'es', 'A tiene la app en español (lo que escribe en inglés lo detecta el traductor, no su idioma)');

  await stubArriba(); servidor(STUB);
  const b = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404/.test(m.text())) err.push('console: ' + m.text()); }); };
  const tel = async (lang) => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); if (lang) await c.addCookies([{ name: 'tl_lang', value: lang, url: B }]); const p = await c.newPage(); mira(p); return p; };
  const esc = async (lang) => { const c = await b.newContext({ viewport: { width: 1360, height: 900 } }); if (lang) await c.addCookies([{ name: 'tl_lang', value: lang, url: B }]); const p = await c.newPage(); mira(p); return p; };
  try {
    // ── 1 · A publica una pregunta en inglés (teléfono): el idioma lo detecta el traductor al publicar ──
    const ap = await tel(); await entrar(ap, A);
    const d0 = (await stubN()).detect;
    await ap.goto(B + '/comunidad/nuevo?k=pregunta'); await ap.getByLabel('TU PREGUNTA').waitFor();
    const P1 = `Does anyone know a reliable mechanic for an old Honda? Thanks neighbors ${TAG}`;
    await ap.getByLabel('TU PREGUNTA').fill(P1);
    await clic(ap.getByRole('button', { name: 'Publicar', exact: true }));
    await ap.waitForURL(/\/comunidad\/p\/\d+\?nueva=1/, { timeout: 15000 });
    const Q = ap.url().match(/\/p\/(\d+)/)[1];
    ok(sql(`select lang from com_posts where id = ${Q}`) === 'en' && (await stubN()).detect > d0, 'publicar: el traductor detecta inglés (com_posts.lang = en) aunque la app de A está en español');
    ok((await verTr(tarjetaPost(ap)).count()) === 0, 'lo propio nunca trae «Ver traducción»');
    // A comenta en inglés (barra de abajo) → también detectado.
    await ap.getByLabel('Tu comentario').fill(`I can recommend the shop on Broad, they were great with my car ${TAG}`);
    await clic(ap.getByRole('button', { name: 'Comentar', exact: true }));
    ok(await espera(() => sql(`select count(*) from com_comments where post_id = ${Q} and author_user_id = '${RA}' and lang = 'en'`) === '1'), 'comentario en inglés: lang = en (detectado)');
    const CA = sql(`select id from com_comments where post_id = ${Q} and author_user_id = '${RA}'`);
    // C comenta en español (fixture en la base, como si lo hubiera escrito antes).
    const CC = sql(`insert into com_comments (post_id, author_user_id, body, lang) values (${Q}, '${RC}', 'Pregúntale a Don Julio en la calle 22, es muy bueno y cobra justo ${TAG}', 'es') returning id`).split('\n')[0];

    // ── 2 · B (app en español, teléfono): «Ver traducción» solo en lo que está en inglés ──
    const bp = await tel(); await entrar(bp, BB);
    await bp.goto(B + '/comunidad/p/' + Q); await bp.getByLabel('Tu comentario').waitFor();
    await comentario(bp, 'Don Julio').waitFor();
    ok(await verTr(tarjetaPost(bp)).count() === 1 && await verTr(comentario(bp, 'shop on Broad')).count() === 1, 'la publicación y el comentario en inglés traen «Ver traducción»');
    ok(await verTr(comentario(bp, 'Don Julio')).count() === 0, 'el comentario en español (el idioma de la app) no trae botón');
    await bp.screenshot({ path: OUT + 'c5h-ver-m.png' });
    const t0 = (await stubN()).translate;
    await (await vis(verTr(tarjetaPost(bp)))).click();
    ok(await contiene(bp, `[stub→es] ${P1}`) && await contiene(bp, 'Ver original') && await contiene(bp, 'Traducción automática del inglés'), 'la traducción reemplaza el texto, con «Ver original · Traducción automática del inglés»');
    ok((await stubN()).translate === t0 + 1, 'una llamada al traductor');
    ok(sql(`select count(*) || ':' || min(src_lang) || ':' || min(dst_lang) || ':' || min(engine) || ':' || (min(ms) >= 0) from ugc_translations where target_kind = 'com_post' and target_id = ${Q}`) === '1:en:es:libretranslate:true', 'guardada en ugc_translations (en → es, motor, ms)');
    await bp.screenshot({ path: OUT + 'c5h-traducida-m.png' });
    await clic(tarjetaPost(bp).getByRole('button', { name: 'Ver original' }));
    ok(await espera(async () => !(await texto(bp)).includes('[stub→es] Does anyone')) && await contiene(bp, P1), '«Ver original» vuelve al texto de A');
    await (await vis(verTr(tarjetaPost(bp)))).click();
    ok(await contiene(bp, `[stub→es] ${P1}`) && (await stubN()).translate === t0 + 1, 'ida y vuelta en la pantalla: no se pide otra vez');
    // ── 3 · Otra vez desde cero (recargar): sale de la caché, el traductor no recibe nada ──
    await bp.reload(); await comentario(bp, 'Don Julio').waitFor();
    await (await vis(verTr(tarjetaPost(bp)))).click();
    ok(await contiene(bp, `[stub→es] ${P1}`) && (await stubN()).translate === t0 + 1, 'segunda vez: de la caché (ugc_translations), sin llamar al traductor');
    await (await vis(verTr(comentario(bp, 'shop on Broad')))).click();
    ok(await contiene(bp, '[stub→es] I can recommend the shop on Broad') && (await stubN()).translate === t0 + 2, 'el comentario en inglés se traduce (com_comment)');

    // ── 4 · A edita (30 min): hash nuevo → se traduce otra vez ──
    const P2 = `Does anyone know a reliable mechanic for an old Honda Civic? It makes a noise when I brake ${TAG}`;
    await ap.goto(B + `/comunidad/nuevo?editar=${Q}`); await ap.getByLabel('TU PREGUNTA').waitFor();
    await ap.getByLabel('TU PREGUNTA').fill(P2);
    await clic(ap.getByRole('button', { name: 'Guardar cambios', exact: true }));
    await ap.waitForURL(/editada=1/);
    await bp.reload(); await comentario(bp, 'Don Julio').waitFor();
    await (await vis(verTr(tarjetaPost(bp)))).click();
    ok(await contiene(bp, `[stub→es] ${P2}`) && (await stubN()).translate === t0 + 3, 'editada: se traduce otra vez el texto nuevo');
    ok(sql(`select count(distinct src_hash) from ugc_translations where target_kind = 'com_post' and target_id = ${Q}`) === '2', 'dos hashes: la traducción vieja ya no se lee (pk con sha-256 del texto)');

    // ── 5 · Y con la app en inglés (escritorio): «See translation» en lo que está en español ──
    const yd = await esc('en'); await entrar(yd, Y);
    await yd.goto(B + '/comunidad/p/' + Q); await comentario(yd, 'Don Julio').waitFor();
    ok(await verTr(tarjetaPost(yd)).count() === 0 && await verTr(comentario(yd, 'shop on Broad')).count() === 0, 'app en inglés: lo que está en inglés no trae botón');
    await (await vis(verTr(comentario(yd, 'Don Julio')))).click();
    ok(await contiene(yd, '[stub→en] Pregúntale a Don Julio') && await contiene(yd, 'See original') && await contiene(yd, 'Machine translation from Spanish'), 'app en inglés: «See translation» → «See original · Machine translation from Spanish»');
    await yd.screenshot({ path: OUT + 'c5h-ingles-d.png' });

    // ── 6 · Reseña en inglés con respuesta del negocio en inglés (escritorio, B) ──
    const RV = sql(`insert into reviews (business_id, city_id, user_id, src, stars, body, lang, reply, reply_at, reply_lang) values ('${BIZ}', 'hzl', '${RA}', 'vis', 5, 'Great mofongo and friendly staff, we will come back next week ${TAG}', 'en', 'Thank you so much, see you next week!', now(), 'en') returning id`).split('\n')[0];
    const bd = await esc(); await entrar(bd, BB);
    await bd.goto(B + `/n/${BIZ}?tab=rev`); const RD = bd.locator('[data-screen-label="Ficha · reseñas · desktop"]'); await RD.getByText('Great mofongo and friendly staff').first().waitFor();
    const rev = RD.locator('div').filter({ hasText: 'Great mofongo and friendly staff' }).filter({ hasText: 'Thank you so much' }).last();
    await rev.scrollIntoViewIfNeeded();
    ok(await verTr(rev).count() === 2, 'la reseña y la respuesta del negocio (en inglés) traen «Ver traducción»');
    await (await vis(verTr(rev))).click();
    ok(await contiene(bd, '[stub→es] Great mofongo and friendly staff'), 'reseña traducida (review)');
    await (await vis(verTr(rev))).click();
    ok(await contiene(bd, '[stub→es] Thank you so much, see you next week!'), 'respuesta del negocio traducida (review_reply)');
    ok(sql(`select string_agg(target_kind, ',' order by target_kind) from ugc_translations where target_id = ${RV} and target_kind in ('review', 'review_reply')`) === 'review,review_reply', 'las dos quedan en la caché');
    await bd.screenshot({ path: OUT + 'c5h-resenas-d.png' });

    // ── 7 · Comentario de Novedades en inglés (teléfono, B) ──
    const NP = sql(`select p.id from business_posts p where p.business_id = '${BIZ}' and post_en_vivo(p) and p.audience = 'all' order by p.pinned desc, p.publish_at desc limit 1`);
    sql(`insert into post_comments (post_id, user_id, body, lang) values (${NP}, '${RA}', 'This deal is great, the mofongo was perfect ${TAG}', 'en')`);
    await bp.goto(B + `/n/${BIZ}?tab=nov`);
    const nov = bp.locator('[data-screen-label="Novedades · publicación"]').first(); await nov.waitFor();
    await clic(nov.getByRole('button', { name: 'Comentarios' }));
    await bp.getByText('This deal is great').first().waitFor();
    await (await vis(bp.locator('div.border-t').filter({ hasText: 'This deal is great' }).locator('[data-tr="ver"]'))).click();
    ok(await contiene(bp, '[stub→es] This deal is great, the mofongo was perfect'), 'comentario de Novedades traducido (post_comment)');
    await bp.screenshot({ path: OUT + 'c5h-novedades-m.png' });

    // ── 8 · El servicio se cae: la pantalla sigue y dice el error; publicar usa el idioma de la app; el corta-circuito se abre ──
    await stubAbajo();
    const CX = sql(`insert into com_comments (post_id, author_user_id, body, lang) values (${Q}, '${RA}', 'Also check the tire place near the bridge, very honest people ${TAG}', 'en') returning id`).split('\n')[0];
    await bp.goto(B + '/comunidad/p/' + Q); await comentario(bp, 'tire place').waitFor();
    await (await vis(verTr(tarjetaPost(bp)))).click();
    ok(await contiene(bp, `[stub→es] ${P2}`), 'caído: lo ya traducido sale de la caché igual');
    await (await vis(verTr(comentario(bp, 'tire place')))).click();
    ok(await contiene(bp, 'La traducción no está disponible ahora.', 6000), 'caído: «La traducción no está disponible ahora.»');
    ok(await comentario(bp, 'tire place').getByRole('button', { name: 'Reintentar' }).count() === 1, 'con «Reintentar»');
    const sc0 = sql(`select up_n from com_posts where id = ${Q}`);
    await clic(bp.getByRole('button', { name: 'Votar a favor' }));
    ok(await espera(() => sql(`select up_n from com_posts where id = ${Q}`) === String(Number(sc0) + 1)), 'la pantalla sigue: votar funciona con el traductor caído');
    await clic(bp.getByRole('button', { name: 'Votar a favor' })); await espera(() => sql(`select up_n from com_posts where id = ${Q}`) === sc0);
    await comentario(bp, 'tire place').scrollIntoViewIfNeeded();
    await bp.evaluate(() => window.scrollBy(0, 160));
    await bp.screenshot({ path: OUT + 'c5h-caido-m.png' });
    // A comenta en inglés con el traductor caído → el idioma de su app (español), sin esperar.
    await ap.goto(B + '/comunidad/p/' + Q); await ap.getByLabel('Tu comentario').waitFor();
    const tc = Date.now();
    await ap.getByLabel('Tu comentario').fill(`Thanks everyone for the help, I will call them tomorrow ${TAG}`);
    await clic(ap.getByRole('button', { name: 'Comentar', exact: true }));
    ok(await espera(() => sql(`select lang from com_comments where post_id = ${Q} and body like 'Thanks everyone%'`) === 'es') && Date.now() - tc < 8000, 'publicar con el traductor caído: guarda con el idioma de la app, sin trabarse');
    // Fallas seguidas: 1 (detectar) + 1 (traducir) + 3 «Reintentar» = 5 → corta-circuito abierto. Con el stub de vuelta, sigue sin llamarlo.
    for (let i = 0; i < 3; i++) { await clic(comentario(bp, 'tire place').getByRole('button', { name: 'Reintentar' })); await espera(async () => (await comentario(bp, 'tire place').locator('[data-tr="error"]').count()) === 1); await bp.waitForTimeout(300); }
    await stubArriba();
    await clic(comentario(bp, 'tire place').getByRole('button', { name: 'Reintentar' }));
    await bp.waitForTimeout(800);
    ok(await comentario(bp, 'tire place').locator('[data-tr="error"]').count() === 1 && (await stubN()).translate === 0, 'corta-circuito: 5 fallas seguidas → no lo vuelve a llamar por un minuto (el stub no recibe nada)');
    servidor(STUB); // reinicia el proceso (el corta-circuito vive en su memoria)
    await bp.goto(B + '/comunidad/p/' + Q); await comentario(bp, 'tire place').waitFor();
    await (await vis(verTr(comentario(bp, 'tire place')))).click();
    ok(await contiene(bp, '[stub→es] Also check the tire place'), 'de vuelta: traduce');

    // ── 9 · Límite por persona: con el tope en lo que ya usó, la siguiente se rechaza con el motivo ──
    const usadas = sql(`select n from ugc_translation_uses where who = 'u:${RB}'`);
    sql(`update platform_config set value = '${usadas}'::jsonb where key = 'com_traduccion_hora'`);
    await bp.reload(); await comentario(bp, 'Don Julio').waitFor();
    const t9 = (await stubN()).translate;
    await (await vis(verTr(comentario(bp, 'shop on Broad')))).click();
    ok(await contiene(bp, `Llegaste a ${usadas} traducciones en esta hora. Vuelve en un rato.`) && (await stubN()).translate === t9, `límite: «Llegaste a ${usadas} traducciones en esta hora…», sin llamar al traductor`);
    ok(await comentario(bp, 'shop on Broad').getByRole('button', { name: 'Reintentar' }).count() === 0, 'el límite no ofrece «Reintentar»');
    await comentario(bp, 'shop on Broad').scrollIntoViewIfNeeded();
    await bp.screenshot({ path: OUT + 'c5h-limite-m.png' });
    sql(`update platform_config set value = '${TOPE0}'::jsonb where key = 'com_traduccion_hora'`);

    // ── 10 · El Super Admin ve el original (y si el traductor responde) ──
    const adm = await esc(); await entrar(adm, ADM);
    await adm.goto(B + `/admin/contenido?tab=pub&q=${encodeURIComponent('old Honda Civic')}`); await adm.getByText('old Honda Civic').first().waitFor();
    ok(!(await texto(adm)).includes('[stub→') && await adm.locator('[data-tr]').count() === 0, 'Super Admin › Contenido: el texto original, sin traducción ni botón');
    await adm.goto(B + `/admin/contenido?tab=ccm&q=${encodeURIComponent('shop on Broad')}`); await adm.getByText('I can recommend the shop on Broad').first().waitFor();
    ok(!(await texto(adm)).includes('[stub→'), 'comentarios: el original');
    await adm.goto(B + '/admin/contenido?tab=auto'); await adm.getByText('VER TRADUCCIÓN (TRADUCTOR PROPIO)').first().waitFor();
    ok(await contiene(adm, 'Traductor propio · español ↔ inglés') && await contiene(adm, 'RESPONDE') && await contiene(adm, `${TOPE0} traducciones por hora`), 'Auto-moderación: el traductor responde y el tope por hora');
    await adm.getByText('VER TRADUCCIÓN (TRADUCTOR PROPIO)').first().scrollIntoViewIfNeeded();
    await adm.screenshot({ path: OUT + 'c5h-admin-d.png' });

    // ── 11 · Sin TRADUCTOR_URL (como servir.sh): el botón dice el error con gracia y todo lo demás sigue ──
    await stubAbajo(); servidor();
    const CY = sql(`insert into com_comments (post_id, author_user_id, body, lang) values (${Q}, '${RA}', 'One more tip: ask for the written estimate first ${TAG}', 'en') returning id`).split('\n')[0];
    await bp.goto(B + '/comunidad/p/' + Q); await comentario(bp, 'written estimate').waitFor();
    await (await vis(verTr(comentario(bp, 'written estimate')))).click();
    ok(await contiene(bp, 'La traducción no está disponible ahora.', 5000), 'sin traductor configurado: «La traducción no está disponible ahora.»');
    await adm.goto(B + '/admin/contenido?tab=auto'); await adm.getByText('VER TRADUCCIÓN (TRADUCTOR PROPIO)').first().waitFor();
    ok(await contiene(adm, 'No está configurado aquí'), 'Auto-moderación: «No está configurado aquí» (nunca un «responde» sin preguntar)');
    void CC; void CA; void CX; void CY;
    ok(err.length === 0, 'sin errores en la consola' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
  } finally {
    await b.close(); await stubAbajo();
    limpiar();
    servidor(); // la configuración normal (sin traductor), como servir.sh
  }
  console.log('com5h: todo bien');
})().catch((e) => { console.error(e); if (stub) stub.kill(); process.exit(1); });
