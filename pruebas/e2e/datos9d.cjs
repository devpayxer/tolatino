// 9d · Tus datos (fase9-apertura.md §3.7, §4 9d; D5): Descargar mis datos (pedir con el código, el barrido lo arma, el enlace NO se gasta con una
// vista previa, otra cuenta → 404, se baja UNA vez, vence), lo de otra persona no viene en el archivo, el del negocio (Panel › Más) solo con lo que
// el panel muestra, Términos que aceptaste, la purga a los 30 días por el mapa (reloj movido: datos_purga_pendiente en cero tabla por tabla, el
// pedido como «Cuenta borrada» en el panel del negocio, el mismo teléfono = cuenta nueva), las retenciones de Configuración › Retención con el reloj
// movido (retener_busquedas_dias, retener_codigos_dias, retener_sesiones_dias, retener_doc_reclamo_dias, retener_escaneos_meses) y Fusionar cuentas
// (una sola persona del equipo → no; la otra → sí). Teléfono 390 y escritorio 1360. Precondiciones propias: sus cuentas son nuevas (teléfonos 555
// libres), Beto es del equipo (equipo()), el archivo de Pedro de este negocio de hace menos de 7 días se corre 8 días atrás. Nada depende de otra prueba.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs');
const { leerZip } = require('../lib/zip.cjs');
const { entrarComo, telLibre, equipo, negocioSinDueno } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const barrido = () => JSON.parse(execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString());
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const t = (p, x) => p.getByText(x, { exact: true }).last();
const confirmar = async (a, { motivo, cta }) => { await a.locator('textarea').last().fill(motivo); await t(a, cta).click(); };
const RUN = Date.now().toString(36), TAG = `[d9d ${RUN}]`;
const ADM = '5705550199', BETO = '5705550188', DUENO = '5705550133', BIZ = 'sabor-dominicano';
const ctxTel = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
const ctxDesk = (b) => b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
const shot = (p, nom) => p.screenshot({ path: OUT + `d9d-${nom}.png`, fullPage: true });
// El código del modo pruebas que la pantalla muestra («Sandbox: el código es 123456»).
const codigo = async (p) => { await p.getByText(/Sandbox: el código es \d{6}/).first().waitFor(); return /el código es (\d{6})/.exec(await texto(p))[1]; };
// POST del mismo sitio al archivo (como «Bajar»), desde la página de quien lo pide: el estado HTTP y los bytes.
const postArchivo = (p, id) => p.evaluate(async (id) => { const r = await fetch(`/api/datos/archivo/${id}`, { method: 'POST' }); return { s: r.status, b: r.ok ? Array.from(new Uint8Array(await r.arrayBuffer())) : [] }; }, id);
// Un bloque de SQL que se deshace al final (rollback) y devuelve lo que dijo (para lo que no se puede borrar después: un escaneo de la puerta).
const enRollback = (cuerpo) => { try { sql(`do $$ declare r text; begin ${cuerpo} raise exception 'RESULTADO:%', r; end $$`); return null; } catch (e) { return /RESULTADO:([^\n]*)/.exec(String(e.stderr ?? e.message))?.[1] ?? String(e.stderr ?? e.message).slice(0, 300); } };

(async () => {
  equipo(BETO);
  const A = telLibre(), X = telLibre(), F1 = telLibre(), F2 = telLibre();
  const b = await chromium.launch();
  try {
    // ── 0 · La vecina A con lo suyo (y X, otra persona, cerca de lo suyo) ──
    console.log(`0 · Cuentas nuevas: A ${A.slice(-4)}, X ${X.slice(-4)}`);
    const ca = await ctxTel(b), pa = await ca.newPage(); await entrarComo(pa, A, { nombre: 'Vecina', apellido: 'Datos' });
    const cx = await ctxTel(b), px = await cx.newPage(); await entrarComo(px, X, { nombre: 'Otra', apellido: 'Persona' });
    const UA = uid(A), UX = uid(X);
    sql(`update users set home_city_id = 'hzl', is_test = true where id in ('${UA}', '${UX}')`);
    sql(`insert into favorites (user_id, kind, target_id) values ('${UA}', 'business', '${BIZ}') on conflict do nothing`);
    sql(`insert into follows (follower_user_id, target_kind, target_id) values ('${UA}', 'business', '${BIZ}') on conflict do nothing`);
    sql(`insert into follows (follower_user_id, target_kind, target_id) values ('${UX}', 'user', '${UA}') on conflict do nothing`);
    sql(`insert into search_logs (city_id, user_id, query, results) values ('hzl', '${UA}', 'mangu ${TAG}', 3)`);
    sql(`insert into user_addresses (user_id, label, street, zip, city_id, is_default) values ('${UA}', 'casa', '${A.slice(-4)} E Diamond Ave', '18201', 'hzl', true)`);
    sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, lang) values ('hzl', 'user', '${UA}', 'pregunta', 'comida', 'Donde venden mangu bueno cerca de la Wyoming ${TAG}', 'es')`);
    const NUM = String(900000000 + Math.floor(Math.random() * 99999999));
    const OP = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, mode, pay_mode, client_key, customer_note, subtotal_cents, total_cents, is_test)
                    values ('${NUM}', 'order', 'hzl', '${BIZ}', '${UA}', 'done', 'pickup', 'none', gen_random_uuid(), 'Sin cebolla ${TAG}', 1200, 1200, true) returning id`).split('\n')[0];
    sql(`insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang) values ('${BIZ}', 'hzl', '${UA}', ${OP}, 'pk', 5, 'El mangu estuvo buenisimo y llego caliente ${TAG}', 'es')`);
    sql(`insert into notifications (user_id, actor_user_id, city_id, tpl, title, body) values ('${UA}', '${UX}', 'hzl', 'datos_export_listo', 'Aviso ${TAG}', 'Prueba ${TAG}')`);
    sql(`insert into community_profiles (user_id, rules_version, rules_ok_at) values ('${UA}', 1, now()) on conflict (user_id) do update set rules_version = 1, rules_ok_at = now()`);
    ok(sql(`select count(*) from favorites where user_id = '${UA}'`) === '1' && sql(`select count(*) from reviews where user_id = '${UA}'`) === '1', 'A tiene guardado, seguido, búsqueda, dirección, publicación, pedido, reseña y aviso');

    // ── 1 · Descargar mis datos: pedir con el código ──
    console.log('1 · Mi cuenta › Privacidad › Descargar mis datos');
    await pa.goto(B + '/cuenta/ajustes/privacidad'); await t(pa, 'Descargar mis datos').click(); await pa.waitForURL(/privacidad\/datos$/);
    ok((await texto(pa)).includes('Te armamos un archivo con lo tuyo: perfil, pedidos, citas, reseñas, publicaciones y mensajes. Tarda unos minutos y lo bajas aquí durante 24 horas.'), 'la línea fija de §1c, palabra por palabra');
    await shot(pa, 'datos-vacio-390');
    sql(`delete from otp_codes where phone = '+1${A}'`);
    await t(pa, 'Pedir mi archivo').click(); const cod = await codigo(pa);
    await pa.getByPlaceholder('482913').fill(cod); await t(pa, 'Pedir mi archivo').click();
    await pa.getByText('Estamos armando tu archivo').first().waitFor();
    const E1 = sql(`select id from data_exports where user_id = '${UA}' and business_id is null order by requested_at desc limit 1`);
    ok(sql(`select status from data_exports where id = '${E1}'`) === 'pendiente', 'pedido con el código: queda «pendiente» (lo arma el barrido)');
    ok(sql(`select count(*) from account_changes where user_id = '${UA}' and kind = 'export'`) === '1', 'el pedido queda anotado (account_changes «export»)');
    ok(sql(`select count(*) from otp_codes where phone = '+1${A}' and purpose = 'data_export' and used_at is not null`) === '1', 'el código se usó una vez (propósito data_export)');

    // ── 2 · El barrido lo arma ──
    barrido();
    ok(sql(`select status || '|' || (media_key like 'privado/exportes/%') || '|' || (expires_at between now() + interval '23 hours' and now() + interval '25 hours') from data_exports where id = '${E1}'`) === 'listo|true|true',
      'el barrido lo arma: «listo», en el almacén privado, vence en 24 h');
    ok(sql(`select count(*) from notifications where user_id = '${UA}' and tpl = 'datos_export_listo' and ref_id = '${E1}'`) === '1', 'aviso «Tu archivo está listo»');

    // ── 3 · Una vista previa (GET) no lo gasta; otra cuenta → 404 ──
    const g = execSync(`curl -s -o /dev/null -w '%{http_code} %{redirect_url}' ${B}/api/datos/archivo/${E1}`).toString();
    ok(/^303 .*\/cuenta\/ajustes\/privacidad\/datos$/.test(g), `un GET (vista previa de un enlace) lleva a la pantalla: ${g}`);
    ok(sql(`select status || '|' || coalesce(downloaded_at::text, 'no') from data_exports where id = '${E1}'`) === 'listo|no', 'el GET no lo gastó');
    const otro = await postArchivo(px, E1);
    ok(otro.s === 404, `otra cuenta pide el archivo de A → ${otro.s}`);
    ok(sql(`select status from data_exports where id = '${E1}'`) === 'listo', 'y sigue listo para A');

    // ── 4 · A lo baja (una vez) ──
    await pa.reload(); await pa.getByText('Tu archivo está listo').first().waitFor(); await shot(pa, 'datos-listo-390');
    const dl = pa.waitForEvent('download'); await t(pa, 'Bajar').click(); const d = await dl;
    const z = leerZip(fs.readFileSync(await d.path())), J = (k) => JSON.parse(z[`${k}.json`].toString('utf8'));
    ok(d.suggestedFilename() === 'tolatino-mis-datos.zip' && !!z['LEEME.txt'] && /ES · /.test(z['LEEME.txt']) && /EN · /.test(z['LEEME.txt']), 'el ZIP con LEEME en español e inglés');
    ok(J('perfil')[0]?.phone === `+1${A}` && J('guardados').length === 1 && J('sigues').length === 1 && J('direcciones').length === 1 && J('publicaciones').length === 1 && J('resenas').length === 1, 'su perfil, guardados, seguidos, direcciones, publicaciones y reseñas');
    ok(J('pedidos_citas_y_reservas').some((o) => o.number === NUM) && !!z['pedidos_citas_y_reservas.csv'] && z['pedidos_citas_y_reservas.csv'].toString().includes(NUM), 'su pedido en JSON y en CSV');
    const todo = Object.values(z).map((x) => x.toString('utf8')).join('\n');
    ok(!todo.includes(UX) && !todo.includes(X), 'exportaSoloLoSuyo: ni el id ni el teléfono de la otra persona (la que la sigue, el actor de su aviso)');
    ok(!/token_hash|code_hash|phone_enc|"geom"/.test(todo), 'sin huellas, cifrados ni la ubicación exacta');
    ok(sql(`select status || '|' || (downloaded_at is not null) from data_exports where id = '${E1}'`) === 'bajado|true', 'bajado: queda anotado');
    const otra = await postArchivo(pa, E1);
    ok(otra.s === 410, `un uso: bajarlo otra vez → ${otra.s}`);
    barrido(); ok(sql(`select file_gone_at is not null from data_exports where id = '${E1}'`) === 't', 'bajado, el archivo sale del almacén');
    await pa.reload(); await pa.getByText('Ya lo bajaste').first().waitFor();
    ok(/Puedes pedir otro archivo el /.test(await texto(pa)), 'uno cada 7 días: «Puedes pedir otro archivo el …»');

    // ── 5 · El enlace vence ──
    sql(`set session_replication_role = replica; update data_exports set requested_at = requested_at - interval '8 days' where id = '${E1}'`);
    sql(`insert into data_exports (user_id) values ('${UA}')`);
    barrido();
    const E2 = sql(`select id from data_exports where user_id = '${UA}' and status = 'listo' limit 1`);
    ok(!!E2, 'otro archivo, 8 días después: listo');
    sql(`set session_replication_role = replica; update data_exports set expires_at = now() - interval '1 minute' where id = '${E2}'`);
    const venc = await postArchivo(pa, E2);
    ok(venc.s === 410, `pasadas las 24 h no se baja → ${venc.s}`);
    barrido(); ok(sql(`select status || '|' || (file_gone_at is not null) from data_exports where id = '${E2}'`) === 'vencido|true', 'vencido: sale del almacén');

    // ── 6 · Términos que aceptaste ──
    await pa.goto(B + '/cuenta/ajustes/privacidad/terminos'); await pa.getByText('Reglas de la Comunidad').first().waitFor();
    ok(/VERSIÓN 1 · ACEPTADO /.test(await texto(pa)), 'Términos que aceptaste: las reglas de la Comunidad con su versión y su fecha'); await shot(pa, 'terminos-390');
    const cad = await ctxDesk(b), pad = await cad.newPage(); await entrarComo(pad, A);
    await pad.goto(B + '/cuenta/ajustes/privacidad/datos'); await pad.getByText('Descargar mis datos').first().waitFor(); await shot(pad, 'datos-1360'); await cad.close();

    // ── 7 · El archivo del negocio (Panel › Más): solo lo que el panel muestra ──
    console.log('7 · Panel › Más › Exportar los datos del negocio');
    const UD = uid(DUENO);
    sql(`set session_replication_role = replica; update data_exports set requested_at = requested_at - interval '8 days', status = case when status in ('pendiente', 'armando', 'listo') then 'vencido' else status end where user_id = '${UD}' and business_id = '${BIZ}' and requested_at > now() - interval '8 days'`);
    const cd = await ctxTel(b), pd = await cd.newPage(); await entrarComo(pd, DUENO);
    await pd.goto(B + `/panel/${BIZ}/mas`); await t(pd, 'Exportar los datos del negocio').click(); await pd.waitForURL(/\/exportar$/);
    sql(`delete from otp_codes where phone = '+1${DUENO}'`);
    await t(pd, 'Pedir el archivo').click(); const cod2 = await codigo(pd);
    await pd.locator('input[aria-label="CÓDIGO QUE TE MANDAMOS POR SMS"]').fill(cod2); await t(pd, 'Pedir el archivo').click();
    await pd.getByText('Estamos armando tu archivo').first().waitFor(); barrido(); await pd.reload(); await pd.getByText('Tu archivo está listo').first().waitFor(); await shot(pd, 'negocio-listo-390');
    const dl2 = pd.waitForEvent('download'); await t(pd, 'Bajar').click(); const z2 = leerZip(fs.readFileSync(await (await dl2).path())), J2 = (k) => JSON.parse(z2[`${k}.json`].toString('utf8'));
    ok(J2('negocio')[0]?.id === BIZ && J2('operaciones').some((o) => o.numero === NUM && o.cliente === 'Vecina D.'), 'el negocio: su página y sus operaciones, el cliente con su nombre e inicial');
    const todo2 = Object.values(z2).map((x) => x.toString('utf8')).join('\n');
    ok(!todo2.includes(A) && !todo2.includes(UA) && !todo2.includes(`${A.slice(-4)} E Diamond`), 'del cliente, ni el teléfono, ni su id, ni su dirección');
    const otroNeg = await postArchivo(pa, sql(`select id from data_exports where user_id = '${UD}' and business_id = '${BIZ}' order by requested_at desc limit 1`));
    ok(otroNeg.s === 404, `una vecina pide el archivo del negocio → ${otroNeg.s}`);

    // ── 8 · Borrar a los 30 días (reloj movido) ──
    console.log('8 · Borrado definitivo: el reloj a +30 días');
    sql(`insert into media (owner_kind, owner_id, url, private, uploaded_by, status) values ('user', '${UA}', 'privado/prueba-d9d-${RUN}.jpg', true, '${UA}', 'visible')`);
    sql(`update users set delete_at = now() + interval '30 days', delete_reason = 'priv' where id = '${UA}'`);
    barrido(); ok(sql(`select count(*) from purge_runs where user_id = '${UA}'`) === '0' && sql(`select count(*) from favorites where user_id = '${UA}'`) === '1', 'faltan 30 días: nada se purga');
    sql(`update users set delete_at = now() - interval '1 minute' where id = '${UA}'`);   // pasaron los 30 días
    barrido();
    ok(sql(`select ok || '|' || pending_n from purge_runs where user_id = '${UA}'`) === 'true|0', 'purge_runs: completa, 0 pendientes');
    ok(sql(`select count(*) from datos_purga_pendiente('${UA}', '+1${A}')`) === '0', 'datos_purga_pendiente: ninguna tabla del mapa («borrar» o «vaciar») tiene su id ni su teléfono');
    const items = Number(sql(`select count(*) from purge_items i join purge_runs r on r.id = i.run_id where r.user_id = '${UA}'`)), mapaN = Number(sql(`select count(*) from data_map where rol in ('persona', 'telefono') and accion <> 'guardar'`));
    ok(items >= mapaN, `purge_items: cada tabla del mapa anotada (${items} filas para ${mapaN} reglas)`);
    ok(sql(`select coalesce(phone, 'null') || '|' || status || '|' || first_name || '|' || coalesce(last_name, 'null') from users where id = '${UA}'`) === 'null|deleted|Cuenta borrada|null', 'la cuenta: sin teléfono, «deleted», «Cuenta borrada»');
    for (const [tb, q, esperado] of [
      ['favorites', `select count(*) from favorites where user_id = '${UA}'`, '0'], ['follows', `select count(*) from follows where follower_user_id = '${UA}'`, '0'],
      ['search_logs', `select count(*) from search_logs where user_id = '${UA}'`, '0'], ['otp_codes', `select count(*) from otp_codes where phone = '+1${A}'`, '0'],
      ['user_addresses', `select street || '|' || (removed_at is not null) from user_addresses where user_id = '${UA}'`, '—|true'],
      ['com_posts', `select body || '|' || status from com_posts where author_user_id = '${UA}'`, '|deleted'],
      ['reviews', `select body || '|' || status from reviews where user_id = '${UA}'`, '|removed'],
      ['notifications', `select title || body from notifications where user_id = '${UA}'`, ''],
      ['operations', `select number || '|' || coalesce(customer_note, 'null') from operations where id = ${OP}`, `${NUM}|null`],
      ['sessions', `select count(*) from sessions where user_id = '${UA}' and (signed_out_at is null or ip is not null or user_agent is not null)`, '0'],
      ['media', `select status || '|' || url from media where uploaded_by = '${UA}'`, 'removed|privado/borrada'],
    ]) ok(sql(q) === esperado, `${tb}: ${esperado || '(vacío)'}`);
    ok(sql(`select count(*) from follows where follower_user_id = '${UX}' and target_id = '${UA}'`) === '1', 'lo de la otra persona (X la seguía) es de X: queda');
    await pd.goto(B + `/panel/${BIZ}/hoy?det=ped:${NUM}`); await pd.getByText(`Pedido #${NUM}`).first().waitFor();
    { const T = await texto(pd); ok(/CLIENTE Cuenta borrada/.test(T) && !T.includes('Vecina D'), 'el panel del negocio: su pedido con el cliente «Cuenta borrada», sin su nombre'); }
    await shot(pd, 'panel-cuenta-borrada-390');

    // ── 9 · El mismo teléfono = una cuenta nueva ──
    const v = await entrarComo(pa, A, { nombre: 'Vecina', apellido: 'Nueva' });
    ok(v.nuevo === true && uid(A) !== UA, 'vuelve con el mismo teléfono: es una cuenta nueva (otro id)');
    ok(sql(`select status from users where id = '${UA}'`) === 'deleted', 'la vieja sigue borrada');

    // ── 10 · Retenciones con el reloj movido (Configuración › Retención) ──
    console.log('10 · Retenciones');
    sql(`insert into search_logs (city_id, user_id, query, results, at) values ('hzl', '${UX}', 'vieja ${TAG}', 1, now() - interval '91 days'), ('hzl', '${UX}', 'nueva ${TAG}', 1, now())`);
    sql(`insert into otp_codes (phone, purpose, code_hash, channel, expires_at, created_at) values ('+15555550199', 'login', repeat('a', 64), 'pruebas', now() - interval '8 days', now() - interval '8 days')`);
    sql(`insert into sessions (user_id, token_hash, platform, app, expires_at, signed_out_at, created_at, last_seen_at, via) values ('${UX}', 'd9d-${RUN}', 'web', 'cliente', now() - interval '402 days', now() - interval '402 days', now() - interval '500 days', now() - interval '402 days', 'codigo')`);
    const neg = negocioSinDueno('bufete-almonte', 'Datos');
    const doc = sql(`insert into media (owner_kind, owner_id, url, private, uploaded_by, status) values ('claim', '${neg.id}', 'privado/prueba-d9d-doc-${RUN}.jpg', true, '${UX}', 'visible') returning id`).split('\n')[0];
    sql(`insert into claims (id, business_id, user_id, role, method, doc_kind, doc_media, status, city_id, source, decided_at) values ('CL-d9d-${RUN}', '${neg.id}', '${UX}', 'dueno', 'document', 'licencia', '${doc}', 'rejected', 'hzl', 'directo', now() - interval '91 days')`);
    barrido();
    ok(sql(`select string_agg(query, ',' order by at) from search_logs where query like '%${TAG}'`) === `nueva ${TAG}`, 'retener_busquedas_dias (90): la búsqueda de hace 91 días se borró; la de hoy queda');
    ok(sql(`select count(*) from otp_codes where phone = '+15555550199' and created_at < now() - interval '7 days'`) === '0', 'retener_codigos_dias (7): el código de hace 8 días se borró');
    ok(sql(`select count(*) from sessions where token_hash = 'd9d-${RUN}'`) === '0', 'retener_sesiones_dias (400): la sesión vencida hace 402 días se borró');
    ok(sql(`select status || '|' || url || '|' || (purged_at is not null) from media where id = '${doc}'`) === 'removed|privado/borrada|true', 'retener_doc_reclamo_dias (90): la foto del documento salió del almacén; queda que hubo un documento');
    // Un escaneo de hace 14 meses (con su sesión de puerta), dentro de una transacción que se deshace: un escaneo no se borra después.
    const esc = enRollback(`set local session_replication_role = replica;
      insert into door_sessions (id, event_date_id, event_id, business_id, city_id, user_id, member_user_id, door_name, started_at) overriding system value
        select -1, d.id, d.event_id, e.business_id, d.city_id, '${uid(ADM)}', '${uid(ADM)}', 'Principal', now() - interval '14 months' from event_dates d join events e on e.id = d.event_id order by d.id limit 1;
      insert into ticket_scans (id, event_date_id, event_id, city_id, session_id, user_id, door_name, kind, direction, result, resolution, code_hash, device, at_server, created_at)
        select gen_random_uuid(), s.event_date_id, s.event_id, s.city_id, s.id, s.user_id, 'Principal', 'unknown', 'in', 'not_found', 'rejected', repeat('b', 64), gen_random_uuid(), now() - interval '14 months', now() - interval '14 months' from door_sessions s where s.id = -1;
      set local session_replication_role = origin;
      perform escaneos_retener(1000);
      select string_agg((purged_at is not null) || '/' || (code_hash is null) || '/' || (device is null), ',') into r from ticket_scans where at_server < now() - interval '13 months';`);
    ok(esc && esc.split(',').every((x) => x === 'true/true/true'), `retener_escaneos_meses (13): un escaneo de hace 14 meses queda solo en cifras (${esc})`);

    // ── 11 · Fusionar cuentas: una persona no basta ──
    console.log('11 · Fusionar cuentas con dos personas');
    sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, is_test) values ('+1${F1}', now(), 'Fusion', 'Uno', 'hzl', true), ('+1${F2}', now(), 'Fusion', 'Dos', 'hzl', true)`);
    const U1 = uid(F1), U2 = uid(F2);
    sql(`insert into favorites (user_id, kind, target_id) values ('${U1}', 'business', '${BIZ}')`);
    const cad2 = await ctxDesk(b), adm = await cad2.newPage(); await entrarComo(adm, ADM);
    await adm.goto(B + `/admin/usuarios/${U1}?tab=privacidad`); await adm.getByText('FUSIONAR CUENTAS').first().waitFor(); await shot(adm, 'u360-privacidad-1360');
    await t(adm, 'Fusionar con otra cuenta').click();
    await adm.locator('input[aria-label^="TELÉFONO DE LA OTRA CUENTA"]').fill(F2); await confirmar(adm, { motivo: `Cambió de número ${TAG}`, cta: 'Enviar a la cola' });
    await adm.getByText(/Pedido de fusión en Cambios sensibles/).first().waitFor();
    const CS = sql(`select id from sensitive_changes where type = 'mergeUser' and target_id = '${U1}' and status = 'pending'`);
    ok(!!CS && sql(`select payload->>'into' from sensitive_changes where id = '${CS}'`) === U2, 'Ana pide la fusión: queda en Cambios sensibles');
    await adm.goto(B + '/admin/colas?cola=cambio'); await adm.locator('text=/Fusionar cuentas · Fusion Uno/').first().click(); await adm.locator('text=/Lo pediste tú/').first().waitFor();
    ok(!(await adm.getByText('Aplicar cambio', { exact: true }).count()), 'quien la pidió no la aplica («Lo pediste tú», sin «Aplicar cambio»)');
    let dbR = ''; try { sql(`insert into account_merges (from_user_id, to_user_id, requested_by, approved_by, reason) values ('${U1}', '${U2}', '${uid(ADM)}', '${uid(ADM)}', 'una sola persona')`); } catch (e) { dbR = String(e.stderr ?? e.message); }
    ok(/account_merges_check/.test(dbR), 'la base tampoco deja fusionar con una sola persona (approved_by <> requested_by)');
    ok(sql(`select status from users where id = '${U1}'`) === 'active', 'nada cambió todavía');
    const cbt = await ctxDesk(b), bt = await cbt.newPage(); await entrarComo(bt, BETO);
    await bt.goto(B + '/admin/colas?cola=cambio'); await bt.locator('text=/Fusionar cuentas · Fusion Uno/').first().click(); await t(bt, 'Aplicar cambio').click();
    await confirmar(bt, { motivo: `Confirmado con la persona ${TAG}`, cta: 'Aplicar' }); await bt.getByText(/Las cuentas quedaron fusionadas/).first().waitFor();
    ok(sql(`select status || '|' || merged_into || '|' || coalesce(phone, 'null') from users where id = '${U1}'`) === `merged|${U2}|null`, 'Beto (otra persona) la aplica: la cuenta queda fusionada en la otra, sin teléfono');
    ok(sql(`select count(*) from favorites where user_id = '${U2}' and target_id = '${BIZ}'`) === '1' && sql(`select count(*) from favorites where user_id = '${U1}'`) === '0', 'lo suyo (el guardado) pasó a la otra cuenta');
    ok(sql(`select (requested_by <> approved_by)::text from account_merges where from_user_id = '${U1}'`) === 'true', 'account_merges: la pidió una persona y la aprobó otra');
    await adm.goto(B + `/admin/usuarios/${U2}?tab=privacidad`); await adm.getByText('Otra cuenta se fusionó en esta').first().waitFor(); ok(true, 'Usuarios 360° › Privacidad muestra la fusión');
    // Retención en Configuración (con sus límites).
    await adm.goto(B + '/admin/sistema/configuracion'); await adm.getByText('RETENCIÓN · CUÁNTO SE GUARDA').first().waitFor();
    { const T = await texto(adm); ok(['Escaneos de la puerta · meses con el detalle', 'Foto del documento de un reclamo', 'Búsquedas', 'Descargar mis datos · uno cada', 'Se guardan las conversaciones'].every((x) => T.includes(x)), 'Sistema › Configuración › Retención: las claves nuevas y las que ya corrían, con sus límites'); }
    await shot(adm, 'configuracion-retencion-1360');
    await cad2.close(); await cbt.close();
    console.log(`\n✓ datos9d: ${n} comprobaciones`);
  } finally {
    // Lo de la prueba: nada se borra (estados); lo que lleva la marca de la corrida queda apagado o sin efecto.
    sql(`update search_alerts set removed_at = now() where removed_at is null and query like '%[d9d %'`);
    await b.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
