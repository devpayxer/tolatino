// 9t (19 nov) · Mensajes ENTRE VECINOS (Comunidad › Mensajes): fotos y «Ver traducción» ES↔EN (LAUNCH «Mensajes · lo que quedó de 9t» (2); sigue a
// com5c y a msg9t). Marisol (A, app en español) ↔ Héctor (B, app en inglés), que se siguen; Yesenia (X) es otra vecina; Ana, el Super Admin.
// 1) «Ver traducción» con un traductor DE MENTIRA solo para esta prueba (stub-traductor.cjs; dice «[stub→es]»): B escribe en inglés → el idioma lo
//    detecta el servidor al enviar → A ve «Ver traducción» → la traducción con «Ver original»; el original no cambia; la segunda vez sale de la caché;
//    lo suyo no trae botón. Al revés: A escribe en español → B (inglés) lo traduce. La misma acción repetida por X (no es parte) → «ya no está».
// 2) La base: un mensaje no cambia su foto ni su idioma; la foto de otra persona no entra; una foto 'dm' siempre privada; la purga de una cuenta
//    vacía el texto (body '' con hidden_at) sin chocar con dm_messages_body_check (antes fallaba).
// F · Fotos
//   F1 (local y CI) · La foto «simulada»: la fila de media queda como la deja /api/mensajes/foto (privada, «privado/m/», en revisión: el modelo no
//      respondió) y la subida del navegador la contesta Playwright con esa fila; TODO lo demás es real (enviar, quién la ve, Colas, en vivo, quitar,
//      reporte, bloqueo). Elegir → «Quitar foto» → elegir otra vez → mandar con texto → A la ve «EN REVISIÓN», B «Foto en revisión», X y sin sesión 404
//      → el Super Admin la ve por el caso de «medios» (auditado) y «Está bien» → B la ve en vivo → B manda SOLO una foto → la lista dice «Foto» →
//      el equipo la quita con motivo → A ve «Foto quitada por To’Latino.», B recibe el motivo → A reporta la conversación: el equipo la ve con su
//      foto (auditado «conversación reportada») y el original sin traducción → con un bloqueo la otra persona ya no la ve (ni traduce) → la foto de
//      otra persona o de más de 24 h no se manda.
//   F2 (solo con el almacén de fotos: CI) · La subida de verdad (para=dm): sin metadatos, privada, sin caché; 415 / 413; sin la Comunidad 403; la foto
//      subida y nunca mandada sale del almacén a las 24 h (barrido) y una ya enviada no se toca. Sin almacén responde 503 y la prueba FALLA, salvo
//      con DM9T_SIN_ALMACEN=1 (la corrida local, que lo dice en la salida).
// El servidor con el traductor de mentira: en CI se reinicia con servir.sh (como msg9t); PRUEBAS_REINICIAR=«comando» lo cambia (la corrida local en
// otro puerto). Todo se devuelve como estaba (seguirse, idioma, bloqueos, casos); en Mensajes nada se borra (los mensajes de la prueba llevan [d9t]).
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { subirCrudoNode } = require('../lib/subida-cruda.cjs');
const { chromium } = require('playwright'); const { execSync, spawn } = require('child_process');
const fs = require('fs'), crypto = require('crypto');
const S = ENT.S, OUT = S + '/cap/', B = ENT.B, PORT = ENT.P.traductorDm, STUB = `http://127.0.0.1:${PORT}`, TAG = '[d9t]';
const SIN_ALMACEN = process.env.DM9T_SIN_ALMACEN === '1';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const sh = (c) => execSync(c, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
// Pedir una dirección con la sesión de esa página: estado, tipo, caché y los primeros bytes (para ver que no lleva metadatos).
const traerFoto = (p, u) => p.evaluate(async (u) => { const r = await fetch(u, { cache: 'no-store' }); const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (const x of b.slice(0, 4096)) s += String.fromCharCode(x); return { st: r.status, ct: r.headers.get('content-type'), cc: r.headers.get('cache-control'), cab: s }; }, u);
const subirCrudo = (p, tipo, n, para = 'dm') => p.evaluate(async ([tipo, n, para]) => { const fd = new FormData(); fd.append('foto', new Blob([new Uint8Array(n)], { type: tipo }), 'x.bin'); fd.append('para', para); return (await fetch('/api/mensajes/foto', { method: 'POST', body: fd })).status; }, [tipo, n, para]);
// Cuentas NUEVAS de esta prueba (teléfonos 555 libres): con las fijas (Marisol, Héctor) la conversación que deja esta prueba le prendía a com5c
// el «Mensaje» de B → C (quien ya te escribió puede recibir respuesta). Precondición propia: nadie más las usa.
const { entrarComo, telLibre } = require('../lib/negocio-nuevo.cjs');
// 23 nov · La foto simulada también está en el almacén: desde el 22 nov un archivo ausente da 404 (igual que «no tienes permiso»), así que «pasó el
// permiso» se comprueba viendo la foto (200), no con «no es 404» (que antes pasaba con el 500 del archivo ausente).
const { ponerEnAlmacen } = require('../lib/almacen-poner.cjs');
const A = telLibre(); let BB = telLibre(); while (BB === A) BB = telLibre(); let X = telLibre(); while (X === A || X === BB) X = telLibre();
const ADM = '5705550199';
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const stubN = async () => (await fetch(`${STUB}/__n`)).json();
let stub = null, trad = false;
const stubArriba = async () => { stub = spawn('node', [ENT.RAIZ + '/pruebas/lib/stub-traductor.cjs', String(PORT)], { stdio: 'ignore' }); await espera(async () => { try { await stubN(); return true; } catch { return false; } }, 5000); };
const stubAbajo = async () => { if (stub) { stub.kill(); stub = null; } };
const servidor = (url) => console.log('  ·', process.env.PRUEBAS_REINICIAR ? sh(`TRADUCTOR_URL=${url ?? ''} ${process.env.PRUEBAS_REINICIAR}`) : sh(`SOLO=servir TRADUCTOR_URL=${url ?? ''} bash ${ENT.RAIZ}/pruebas/servir/servir.sh`));
let RA, RB, RX, T, LANG_B0 = null, SIGUE0 = null, WELCOME_X0 = null;
// Una foto como la deja /api/mensajes/foto (privada, «privado/m/», sin enviar; en revisión porque el modelo no respondió). Solo la fila: F1.
const fotoSimulada = (quien, estado = 'review', hace = '0 minutes') => {
  const id = crypto.randomUUID();
  sql(`insert into media (id, owner_kind, owner_id, url, w, h, uploaded_by, status, private, check_note, created_at) values ('${id}', 'dm', 'pendiente', 'privado/m/${id}.jpg', 640, 480, '${quien}', '${estado}', true, ${estado === 'review' ? "'El modelo no respondió: revisión manual. No se ve hasta que la revises.'" : 'null'}, now() - interval '${hace}')`);
  return id;
};
const SIMULADAS = new Set();
const limpiar = () => {
  try {
    if (RA && RB) {
      sql(`update user_blocks set removed_at = now() where removed_at is null and kind = 'block' and ((user_id = '${RA}' and target_user_id = '${RB}') or (user_id = '${RB}' and target_user_id = '${RA}'))`);
      if (LANG_B0 !== null) sql(`update users set lang = ${LANG_B0 === '' ? 'null' : `'${LANG_B0}'`} where id = '${RB}'`);
      if (WELCOME_X0 !== null && WELCOME_X0 !== '') sql(`update community_profiles set welcome_at = '${WELCOME_X0}' where user_id = '${RX}'`);
      if (T) {
        // Los casos de esta prueba que queden abiertos (si falló a medias) se cierran; ugc_translations es derivado (una caché): lo de la prueba se tira.
        sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and ((queue = 'medios' and subject_kind = 'media' and subject_id in (select id::text from media where owner_kind = 'dm' and uploaded_by in ('${RA}', '${RB}'))) or (queue = 'chat' and subject_kind = 'dm_thread' and subject_id = '${T}'))`);
        sql(`update content_reports set status = 'dismissed' where target_kind = 'dm' and target_id = '${T}' and status = 'open'`);
        sql(`delete from ugc_translations where target_kind = 'dm_message' and target_id in (select id from dm_messages where thread_id = ${T})`);
      }
      sql(`delete from ugc_translation_uses where who in ('u:${RA}', 'u:${RB}', 'u:${RX}')`);
      if (SIGUE0 !== null) for (const [f, t, antes] of SIGUE0) if (!antes) sql(`delete from follows where follower_user_id = '${f}' and target_kind = 'user' and target_id = '${t}'`);
    }
  } catch (e) { console.log('  (limpiar: ' + String(e.message).slice(0, 120) + ')'); }
};

(async () => {
  { const b0 = await chromium.launch(); for (const [t, n] of [[A, 'Marisol'], [BB, 'Héctor'], [X, 'Yesenia']]) await entrarComo(await (await b0.newContext()).newPage(), t, { nombre: n, apellido: 'Prueba' }); await b0.close(); }
  RA = uid(A); RB = uid(BB); RX = uid(X);
  ok(!!RA && !!RB && !!RX, 'las cuentas nuevas de la prueba existen (Marisol, Héctor, Yesenia)');
  // ── Preparación: los tres en la Comunidad (18+, reglas, bienvenida), sin bloqueos; A y B se siguen; B con la app en inglés ──
  LANG_B0 = sql(`select coalesce(lang, '') from users where id = '${RB}'`);
  for (const u of [RA, RB, RX]) sql(`insert into community_profiles (user_id) values ('${u}') on conflict do nothing`);
  sql(`update users set status = 'active', status_until = null, home_city_id = coalesce(home_city_id, 'hzl'), created_at = least(created_at, now() - interval '5 days') where id in ('${RA}', '${RB}', '${RX}')`);
  sql(`update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true, adult_ok_at = coalesce(adult_ok_at, now()), welcome_at = coalesce(welcome_at, now()) where user_id in ('${RA}', '${RB}', '${RX}')`);
  WELCOME_X0 = sql(`select coalesce(welcome_at::text, '') from community_profiles where user_id = '${RX}'`);
  sql(`update user_blocks set removed_at = now() where removed_at is null and ((user_id = '${RA}' and target_user_id = '${RB}') or (user_id = '${RB}' and target_user_id = '${RA}'))`);
  SIGUE0 = [[RA, RB], [RB, RA]].map(([f, t]) => [f, t, sql(`select count(*) from follows where follower_user_id = '${f}' and target_kind = 'user' and target_id = '${t}'`) !== '0']);
  for (const [f, t, antes] of SIGUE0) if (!antes) sql(`insert into follows (follower_user_id, target_kind, target_id) values ('${f}', 'user', '${t}')`);
  sql(`update users set lang = 'en' where id = '${RB}'`);
  // Las fotos de corridas anteriores fuera del tope de la hora (30 fotos; los mensajes no se tocan: un mensaje no se edita, y la prueba manda pocos).
  sql(`update media set created_at = created_at - interval '2 hours' where owner_kind in ('chat', 'dm') and uploaded_by in ('${RA}', '${RB}') and created_at > now() - interval '1 hour'`);
  sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where queue = 'chat' and subject_kind = 'dm_thread' and status = 'open' and subject_id in (select id::text from dm_threads where a_user_id in ('${RA}', '${RB}') or b_user_id in ('${RA}', '${RB}'))`);
  sql(`update content_reports set status = 'dismissed' where target_kind = 'dm' and status = 'open' and reporter_user_id in ('${RA}', '${RB}')`);

  const sharp = require(ENT.RAIZ + '/apps/web/node_modules/sharp'), FOTO = S + '/d9t-foto.jpg', FOTO2 = S + '/d9t-foto2.jpg';
  fs.writeFileSync(FOTO, await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 212, g: 132, b: 64 } } }).withMetadata({ exif: { IFD0: { Copyright: 'd9tGPSsecreto' } } }).jpeg().toBuffer());
  fs.writeFileSync(FOTO2, await sharp({ create: { width: 480, height: 640, channels: 3, background: { r: 46, g: 96, b: 168 } } }).jpeg().toBuffer());
  ok(fs.readFileSync(FOTO).includes('d9tGPSsecreto'), 'la foto de prueba lleva metadatos (para ver que el servidor los quita)');
  const JPG = fs.readFileSync(FOTO2);

  const b = await chromium.launch(); const err = [];
  const nueva = async (w, h, movil, lang, simularImg = true) => {
    const c = await b.newContext(movil ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true } : { viewport: { width: w, height: h } });
    if (lang) await c.addCookies([{ name: 'tl_lang', value: lang, url: B }]);
    // Las fotos simuladas (F1) no están en el almacén: para verlas en la pantalla de A y B, la IMAGEN (no un fetch) la contesta la prueba. Al Super
    // Admin nunca: lo que pide su pantalla llega al servidor (y a la auditoría).
    if (simularImg) await c.route('**/api/mensajes/foto/*', (r) => (r.request().resourceType() === 'image' && [...SIMULADAS].some((id) => r.request().url().endsWith(id)) ? r.fulfill({ status: 200, contentType: 'image/jpeg', body: JPG }) : r.continue()));
    const p = await c.newPage(); p.on('pageerror', (e) => err.push(e.message));
    p.on('console', (z) => { if (z.type() === 'error' && !/Failed to load|404|500|pexels|ERR_/.test(z.text())) err.push('console ' + z.text()); });
    (globalThis.__p ??= []).push(p); return p;
  };
  // La subida del navegador contestada con una fila ya hecha (F1): el resto (enviar y todo lo que sigue) es el servidor de verdad.
  const subidaSimulada = async (p, id, revision = true) => { await p.unroute('**/api/mensajes/foto').catch(() => {}); await p.route('**/api/mensajes/foto', (r) => (r.request().method() === 'POST' ? r.fulfill({ json: { ok: true, id, url: `/api/mensajes/foto/${id}`, revision } }) : r.continue())); };
  const sinSimular = (p) => p.unroute('**/api/mensajes/foto').catch(() => {});
  try {
    const a = await nueva(390, 844, true), bp = await nueva(390, 844, true, 'en'), x = await nueva(390, 844, true), ad = await nueva(1440, 900, false, null, false), anon = await nueva(390, 844, true);
    await entrar(a, A); await entrar(bp, BB); await entrar(x, X); await entrar(ad, ADM); await anon.goto(B + '/');
    const MSG = (filtro) => sql(`select m.id from dm_messages m join dm_threads t on t.id = m.thread_id where t.a_user_id = least('${RA}'::uuid, '${RB}'::uuid) and t.b_user_id = greatest('${RA}'::uuid, '${RB}'::uuid) and ${filtro} order by m.id desc limit 1`);

    // ── 1 · «Ver traducción» (traductor de mentira) ──
    await stubArriba(); trad = true; servidor(STUB);
    const EN = `Thanks for the tip, the market is open this Saturday and you are welcome to come ${TAG}`;
    await bp.goto(B + '/comunidad/mensajes/' + RA); await bp.getByLabel('Your message').waitFor();
    ok(!!(await vis(bp.getByRole('button', { name: 'Add a photo' }))), 'el composer (en inglés) ofrece «Add a photo»');
    await bp.getByLabel('Your message').fill(EN); await clic(bp.getByRole('button', { name: 'Send' }));
    ok(await espera(() => MSG(`m.body = '${EN}'`) !== ''), 'B escribe en inglés');
    const MEN = MSG(`m.body = '${EN}'`); T = sql(`select thread_id from dm_messages where id = ${MEN}`);
    ok(sql(`select lang from dm_messages where id = ${MEN}`) === 'en', 'el idioma lo detecta el traductor propio al enviar (en)');
    let accion = null; // la acción «Ver traducción» tal como la manda la página (para repetirla con otra sesión)
    a.on('request', (r) => { if (!accion && r.method() === 'POST' && r.headers()['next-action'] && (r.postData() || '').includes('dm_message')) accion = { url: r.url(), h: r.headers(), body: r.postData() }; });
    await a.goto(B + '/comunidad/mensajes/' + RB); await a.getByText(EN).first().waitFor();
    const t0 = (await stubN()).translate;
    await clic(a.locator('[data-tr="ver"]').last());
    ok(await contiene(a, `[stub→es] ${EN}`), 'A (en español) ve la traducción');
    ok(await contiene(a, 'Ver original') && await contiene(a, 'Traducción automática del inglés'), 'con «Ver original · Traducción automática del inglés»');
    ok(sql(`select body from dm_messages where id = ${MEN}`) === EN, 'el original no cambia en la base');
    ok(sql(`select count(*) from ugc_translations where target_kind = 'dm_message' and target_id = ${MEN} and dst_lang = 'es'`) === '1', 'la traducción queda en la caché (derivada)');
    await a.screenshot({ path: OUT + 'd9t-1-traduccion-m.png', fullPage: true });
    await a.reload(); await a.getByText(EN).first().waitFor(); await clic(a.locator('[data-tr="ver"]').last());
    ok(await contiene(a, `[stub→es] ${EN}`) && (await stubN()).translate === t0 + 1, 'la segunda vez sale de la caché (el traductor no recibe otra llamada)');
    const ES = `Gracias vecino, paso por el mercado el sábado con mi familia ${TAG}`;
    await a.getByLabel('Tu mensaje').fill(ES); await clic(a.getByRole('button', { name: 'Enviar' })); await a.getByText(ES).first().waitFor();
    ok(await espera(() => sql(`select lang from dm_messages where body = '${ES}' order by id desc limit 1`) === 'es'), 'lo de A se detecta en español');
    ok(await espera(async () => (await a.locator('[data-tr]').count()) === 1) && await a.locator('[data-tr="ver"]').count() === 0, 'lo suyo no trae el botón (solo queda «Ver original» del mensaje traducido)');
    await bp.reload(); await bp.getByText(ES).first().waitFor(); await clic(bp.locator('[data-tr="ver"]').last());
    ok(await contiene(bp, `[stub→en] ${ES}`) && await contiene(bp, 'Machine translation from Spanish'), 'B (en inglés) lo traduce al inglés');
    await bp.screenshot({ path: OUT + 'd9t-2-traduccion-en-m.png', fullPage: true });
    ok(!!accion, 'la página manda «Ver traducción» por su acción del servidor');
    const repetir = (p) => p.evaluate(async (q) => { const h = { ...q.h }; delete h['content-length']; delete h.cookie; delete h.host; delete h.origin; delete h.referer; return (await fetch(q.url, { method: 'POST', headers: h, body: q.body })).text(); }, accion);
    const rx = await repetir(x);
    ok(/no_esta/.test(rx) && !rx.includes('[stub→'), 'X (vecina, pero no es parte) repite la misma acción: «ya no está», sin la traducción');
    ok(/"ok":true/.test(await repetir(a)), 'y A, que es parte, sí la recibe');

    // ── 2 · La base ──
    ok(/no se edita/.test(sqlErr(`update dm_messages set lang = 'es' where id = ${MEN}`)), 'un mensaje no cambia su idioma');
    const ajena = fotoSimulada(RA, 'visible');
    ok(/foto de Mensajes que subió quien escribe/.test(sqlErr(`insert into dm_messages (thread_id, sender_user_id, city_id, body, media_id) values (${T}, '${RB}', 'hzl', 'x ${TAG}', '${ajena}')`)), 'la base no deja usar la foto de otra persona');
    ok(/no se edita/.test(sqlErr(`update dm_messages set media_id = '${ajena}' where id = ${MEN}`)), 'ni ponerle una foto a un mensaje ya enviado');
    ok(/media_dm_privada/.test(sqlErr(`insert into media (owner_kind, owner_id, url, uploaded_by, status, private) values ('dm', 'pendiente', 'm/x.jpg', '${RA}', 'visible', false)`)), 'una foto de Mensajes entre vecinos siempre es privada y bajo privado/m/ (media_dm_privada)');
    ok(sqlErr(`begin; update users set delete_at = now() - interval '1 day' where id = '${RB}'; select set_config('tl.purga', 'si', true); update dm_messages set body = '', hidden_reason = coalesce(hidden_reason, 'Cuenta borrada'), hidden_at = coalesce(hidden_at, now()) where id = ${MEN}; rollback;`) === '', 'la purga de una cuenta vacía el texto (body \'\' con hidden_at) sin chocar con la base');
    ok(sql(`select body from dm_messages where id = ${MEN}`) === EN, '(y la prueba lo deshizo)');

    // ── F · Fotos ──
    // ── F1 · La foto simulada (local y CI) ──
    console.log('  · F1 · fotos: la fila como la deja la subida; lo demás, el servidor de verdad');
    const F1 = fotoSimulada(RA); SIMULADAS.add(F1); if (!SIN_ALMACEN) await ponerEnAlmacen(sql, F1, JPG);
    await subidaSimulada(a, F1);
    await a.goto(B + '/comunidad/mensajes/' + RB); await a.getByLabel('Tu mensaje').waitFor();
    ok(!!(await vis(a.getByRole('button', { name: 'Agregar una foto' }))), 'el composer ofrece «Agregar una foto»');
    await a.locator('input[type=file]').setInputFiles(FOTO);
    await a.locator('[data-chat-adjunto]').waitFor({ timeout: 20000 }); ok(await contiene(a, 'To’Latino la revisa antes de que se vea.'), 'la miniatura de la foto elegida, con la nota de la revisión');
    await clic(a.getByRole('button', { name: 'Quitar foto' })); ok(await espera(async () => (await a.locator('[data-chat-adjunto]').count()) === 0), '«Quitar foto» la quita antes de enviar');
    await a.locator('input[type=file]').setInputFiles(FOTO); await a.locator('[data-chat-adjunto]').waitFor({ timeout: 20000 });
    await a.screenshot({ path: OUT + 'd9t-3-adjunto-m.png', fullPage: false });
    const CON_FOTO = `Así quedó el puesto del mercado ${TAG}`;
    await a.getByLabel('Tu mensaje').fill(CON_FOTO); await clic(a.getByRole('button', { name: 'Enviar' }));
    ok(await espera(() => MSG(`m.media_id = '${F1}'`) !== ''), 'el mensaje se guarda con su foto');
    const M1 = MSG(`m.media_id = '${F1}'`);
    ok(sql(`select owner_kind || '|' || owner_id || '|' || private::text || '|' || (url like 'privado/m/%')::text from media where id = '${F1}'`) === `dm|${M1}|true|true`, 'la foto quedó privada, bajo privado/m/ y atada al mensaje');
    const Q1 = sql(`select id from queue_items where queue = 'medios' and subject_kind = 'media' and subject_id = '${F1}' and status = 'open'`);
    ok(!!Q1 && sql(`select detail from mod_flags where target_kind = 'media' and target_id = '${F1}' order by id desc limit 1`).includes('Foto de Mensajes entre vecinos'), 'caso abierto en «medios» con la nota «Foto de Mensajes entre vecinos»');
    ok(await contiene(a, 'Tu foto se ve cuando To’Latino la revise.'), 'A: «Tu foto se ve cuando To’Latino la revise.»');
    ok(await contiene(a, 'EN REVISIÓN') && await a.locator('[data-msg-foto="si"]').count() >= 1, 'A ve su propia foto con «EN REVISIÓN»');
    await a.screenshot({ path: OUT + 'd9t-4-revision-m.png', fullPage: false });
    const U1 = `/api/mensajes/foto/${F1}`;
    ok((SIN_ALMACEN || (await traerFoto(a, U1)).st === 200), 'la dirección privada deja pasar a quien la mandó');
    await bp.goto(B + '/comunidad/mensajes/' + RA); await bp.getByText(CON_FOTO).first().waitFor();
    ok(await contiene(bp, 'Photo under review') && await bp.locator('[data-msg-foto="espera"]').count() >= 1, 'B (en inglés) ve «Photo under review», sin la foto');
    await bp.screenshot({ path: OUT + 'd9t-5-revision-otro-m.png', fullPage: false });
    ok((await traerFoto(bp, U1)).st === 404, 'y la dirección privada le da 404 mientras está en revisión');
    ok((await traerFoto(x, U1)).st === 404 && (await traerFoto(anon, U1)).st === 404, 'otra vecina o sin sesión: 404');

    // El Super Admin la ve por el caso (auditado) y «Está bien» → B la ve en vivo, sin recargar.
    const a0 = Number(sql(`select count(*) from audit_entries where action = 'mensajes.foto.ver' and after->>'foto' = '${F1}'`));
    await ad.goto(B + '/admin/colas?caso=' + Q1); ok(await contiene(ad, 'Foto de Mensajes entre vecinos'), 'Super Admin › Colas: «Foto de Mensajes entre vecinos»');
    ok(await contiene(ad, 'La conversación no se lee desde aquí.') && !(await texto(ad)).includes(CON_FOTO), 'el caso de la foto no muestra la conversación');
    ok(await espera(async () => Number(sql(`select count(*) from audit_entries where action = 'mensajes.foto.ver' and after->>'foto' = '${F1}' and after->>'por' = 'foto en revisión'`)) > a0), 'el equipo la ve y queda en la auditoría («foto en revisión»)');
    await ad.screenshot({ path: OUT + 'd9t-6-admin-foto-d.png', fullPage: true });
    const avB = () => Number(sql(`select count(*) from notifications where user_id = '${RB}' and tpl = 'dm_message' and ref_kind = 'dm_thread' and actor_user_id = '${RA}'`));
    const nB0 = avB();
    await clic(ad.getByRole('button', { name: 'Está bien' }));
    ok(await espera(() => sql(`select status from media where id = '${F1}'`) === 'visible'), 'aprobada: la foto queda visible');
    ok(sql(`select status from queue_items where id = ${Q1}`) === 'decided' && sql(`select count(*) from audit_entries where action = 'mensajes.foto.aprobar' and target_id = '${F1}'`) === '1', 'el caso se cierra y la decisión queda en la auditoría');
    ok(await espera(async () => (await bp.locator('[data-msg-foto="si"]').count()) >= 1, 15000), 'la pantalla abierta de B la muestra en vivo');
    ok((SIN_ALMACEN || (await traerFoto(bp, U1)).st === 200), 'ahora B la puede ver');
    ok(await espera(() => avB() === nB0 + 1) && /Foto/.test(sql(`select body from notifications where user_id = '${RB}' and tpl = 'dm_message' order by id desc limit 1`)), 'aprobada: B recibe el aviso de la foto (una vez)');
    ok((await traerFoto(x, U1)).st === 404, 'y nadie más');
    await bp.screenshot({ path: OUT + 'd9t-7-foto-otro-m.png', fullPage: false });

    // B manda SOLO una foto; el equipo la quita con motivo.
    const F2 = fotoSimulada(RB); SIMULADAS.add(F2);
    await subidaSimulada(bp, F2);
    const n0 = Number(sql(`select count(*) from notifications where tpl = 'mod_hide' and user_id = '${RB}'`));
    await bp.locator('input[type=file]').setInputFiles(FOTO2); await bp.locator('[data-chat-adjunto]').waitFor({ timeout: 20000 });
    await clic(bp.getByRole('button', { name: 'Send' }));
    ok(await espera(() => MSG(`m.media_id = '${F2}' and m.body = ''`) !== ''), 'B manda solo la foto (sin texto)');
    ok(sql(`select last_text from dm_threads where id = ${T}`) === 'Foto · Photo', 'el último texto de la conversación es «Foto · Photo»');
    await a.goto(B + '/comunidad/mensajes'); ok(await contiene(a, 'Héctor') && await contiene(a, 'Foto'), 'la lista de A dice «Foto» (en su idioma)');
    ok(!(await texto(a)).includes('Foto · Photo'), 'y no las dos palabras');
    await a.screenshot({ path: OUT + 'd9t-8-lista-m.png', fullPage: false });
    await a.goto(B + '/comunidad/mensajes/' + RB); ok(await contiene(a, 'Foto en revisión'), 'A ve «Foto en revisión»');
    const Q2 = sql(`select id from queue_items where queue = 'medios' and subject_kind = 'media' and subject_id = '${F2}' and status = 'open'`); ok(!!Q2, 'caso en «medios»');
    await ad.goto(B + '/admin/colas?caso=' + Q2); await clic(ad.getByRole('button', { name: 'Quitar foto' }));
    await (await vis(ad.getByRole('textbox').last())).fill('Es publicidad'); await clic(ad.getByRole('button', { name: /Confirmar|Quitar/ }).last());
    ok(await espera(() => sql(`select status from media where id = '${F2}'`) === 'removed'), 'quitada con motivo');
    ok(sql(`select count(*) from audit_entries where action = 'mensajes.foto.quitar' and target_id = '${F2}'`) === '1', 'en la auditoría');
    ok(await espera(() => Number(sql(`select count(*) from notifications where tpl = 'mod_hide' and user_id = '${RB}'`)) > n0), 'quien la mandó recibe el motivo');
    ok(await contiene(a, 'Foto quitada por To’Latino.', 15000), 'A ve «Foto quitada por To’Latino.» en vivo');
    ok((await traerFoto(bp, `/api/mensajes/foto/${F2}`)).st === 404, 'la foto quitada ya no se sirve (ni a quien la mandó)');
    await a.screenshot({ path: OUT + 'd9t-9-quitada-m.png', fullPage: false });

    // A reporta la conversación: el equipo la lee con la foto (auditado) y el original, sin traducción.
    await clic(a.getByRole('button', { name: 'Opciones' })); await clic(a.getByText('Reportar conversación', { exact: true }));
    await clic(a.getByText('Otra cosa', { exact: true })); await clic(a.getByRole('button', { name: 'Seguir' })); await clic(a.getByRole('button', { name: 'Enviar reporte' }));
    const QC = await (async () => { let q = ''; await espera(() => (q = sql(`select id from queue_items where queue = 'chat' and subject_kind = 'dm_thread' and subject_id = '${T}' and status = 'open'`)) !== ''); return q; })();
    ok(!!QC, 'caso en Colas › Mensajes reportados');
    const a1 = Number(sql(`select count(*) from audit_entries where action = 'mensajes.foto.ver' and after->>'foto' = '${F1}' and after->>'por' = 'conversación reportada'`));
    await ad.goto(B + '/admin/colas?caso=' + QC); await ad.getByText('CONVERSACIÓN').first().waitFor(); await ad.getByText(EN).first().waitFor();
    ok(!(await texto(ad)).includes('[stub→') && await ad.locator('[data-tr]').count() === 0, 'Super Admin: el original, sin traducción ni botón');
    ok(await contiene(ad, 'Foto quitada'), 'la foto quitada sale como «Foto quitada»');
    ok(await espera(async () => Number(sql(`select count(*) from audit_entries where action = 'mensajes.foto.ver' and after->>'foto' = '${F1}' and after->>'por' = 'conversación reportada'`)) > a1), 'el equipo ve la foto de la conversación reportada y queda en la auditoría');
    await ad.screenshot({ path: OUT + 'd9t-10-admin-reporte-d.png', fullPage: true });
    await clic(ad.getByText('Todo bien', { exact: true })); await clic(ad.getByText('No rompe las reglas del barrio', { exact: true })); await clic(ad.getByText('Confirmar', { exact: true }));
    ok(await espera(() => sql(`select status from queue_items where id = ${QC}`) === 'decided'), 'el caso de la conversación se cierra');
    const s0 = Number(sql(`select count(*) from audit_entries where action = 'mensajes.foto.ver' and after->>'foto' = '${F1}'`));
    ok((await traerFoto(ad, U1)).st === 404 && Number(sql(`select count(*) from audit_entries where action = 'mensajes.foto.ver' and after->>'foto' = '${F1}'`)) === s0, 'cerrado el caso, el equipo ya no la ve (y nada queda auditado como visto)');

    // Con un bloqueo de por medio la conversación no existe para ninguno de los dos: tampoco su foto ni «Ver traducción».
    sql(`insert into user_blocks (user_id, target_user_id, kind) values ('${RA}', '${RB}', 'block')`);
    ok((await traerFoto(bp, U1)).st === 404, 'con el bloqueo, B ya no ve la foto de A');
    ok((SIN_ALMACEN || (await traerFoto(a, U1)).st === 200), 'quien la subió sí');
    const rb = await bp.evaluate(async (q) => { const h = { ...q.h }; delete h['content-length']; delete h.cookie; delete h.host; delete h.origin; delete h.referer; return (await fetch(q.url, { method: 'POST', headers: h, body: q.body })).text(); }, accion);
    ok(/no_esta/.test(rb), 'ni le traduce nada de esa conversación');
    sql(`update user_blocks set removed_at = now() where user_id = '${RA}' and target_user_id = '${RB}' and kind = 'block' and removed_at is null`);
    ok((SIN_ALMACEN || (await traerFoto(bp, U1)).st === 200), 'Deshacer el bloqueo la devuelve');

    // La foto de otra persona, o una de más de 24 h, no se manda.
    const deA = fotoSimulada(RA); SIMULADAS.add(deA);
    await subidaSimulada(bp, deA); await bp.reload(); await bp.getByLabel('Your message').waitFor();
    await bp.locator('input[type=file]').setInputFiles(FOTO2); await bp.locator('[data-chat-adjunto]').waitFor({ timeout: 20000 });
    await clic(bp.getByRole('button', { name: 'Send' }));
    ok(await contiene(bp, 'That photo can no longer be sent. Pick it again.'), 'B no puede mandar una foto que subió A');
    ok(MSG(`m.media_id = '${deA}'`) === '' && sql(`select owner_id from media where id = '${deA}'`) === 'pendiente', 'y no se guarda nada');
    const vieja = fotoSimulada(RB, 'review', '25 hours'); SIMULADAS.add(vieja);
    await subidaSimulada(bp, vieja); await bp.reload(); await bp.getByLabel('Your message').waitFor();
    await bp.locator('input[type=file]').setInputFiles(FOTO2); await bp.locator('[data-chat-adjunto]').waitFor({ timeout: 20000 });
    await clic(bp.getByRole('button', { name: 'Send' }));
    ok(await contiene(bp, 'That photo can no longer be sent. Pick it again.') && MSG(`m.media_id = '${vieja}'`) === '', 'una foto de hace más de 24 h tampoco');
    await sinSimular(a); await sinSimular(bp);
    for (const p of [a, bp]) { const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(w <= 0, 'teléfono sin scroll horizontal (' + w + ')'); }

    // ── F2 · Con el almacén de fotos (CI) ──
    const r503 = await subirCrudo(a, 'image/jpeg', 256);
    if (r503 === 503 && SIN_ALMACEN) console.log('  · F2 SALTADA: sin almacén de fotos (DM9T_SIN_ALMACEN=1, corrida local). Corre entera en CI.');
    else {
      ok(r503 !== 503, 'el almacén de fotos responde (sin él, F2 no puede probar la subida de verdad)');
      ok(r503 === 415, 'una «foto» que no se abre: 415');
      ok(await subirCrudo(a, 'text/plain', 64) === 415, 'un archivo que no es foto: 415');
      // Más de 12 MB, desde Node con la sesión (por partes y avisando el tamaño): pruebas/lib/subida-cruda.cjs (el fetch de 13 MB dentro del WebKit
    // del CI no llega entero: 400 en el iPad, confirmación 44685003383).
    { const st = await subirCrudoNode(a, B, '/api/mensajes/foto', Buffer.alloc(13 * 1024 * 1024, 7), 'image/jpeg', { para: 'dm' }); ok(st[0] === 413 && st[1] === 413, 'más de 12 MB: 413, por partes y avisando el tamaño (' + st.join(' / ') + ')'); }
      await a.goto(B + '/comunidad/mensajes/' + RB); await a.getByLabel('Tu mensaje').waitFor();
      await a.locator('input[type=file]').setInputFiles(FOTO); await a.locator('[data-chat-adjunto]').waitFor({ timeout: 20000 });
      await clic(a.getByRole('button', { name: 'Enviar' }));
      ok(await espera(() => MSG(`m.sender_user_id = '${RA}' and m.media_id is not null and m.media_id::text not in ('${[...SIMULADAS].join("', '")}')`) !== ''), 'la foto de verdad se manda (solo la foto)');
      const FR = sql(`select media_id from dm_messages where id = ${MSG(`m.sender_user_id = '${RA}' and m.media_id is not null`)}`);
      ok(sql(`select owner_kind || '|' || private::text || '|' || (url like 'privado/m/%')::text from media where id = '${FR}'`) === 'dm|true|true', 'subida con para=dm: foto de Mensajes entre vecinos, privada, bajo privado/m/');
      const rf = await traerFoto(a, `/api/mensajes/foto/${FR}`);
      ok(rf.st === 200 && rf.ct === 'image/jpeg' && /no-store/.test(rf.cc || ''), 'la dirección privada se la sirve a quien la mandó, sin caché');
      ok(!rf.cab.includes('d9tGPSsecreto'), 'sin los metadatos de la cámara');
      if (sql(`select status from media where id = '${FR}'`) === 'review') ok((await traerFoto(bp, `/api/mensajes/foto/${FR}`)).st === 404, 'en revisión: B todavía no la ve');
      else ok((await traerFoto(bp, `/api/mensajes/foto/${FR}`)).st === 200, 'revisada por el modelo: B la ve');
      sql(`update community_profiles set welcome_at = null where user_id = '${RX}'`);
      ok(await subirCrudo(x, 'image/jpeg', 256) === 403, 'sin la Comunidad completa no sube fotos para Mensajes entre vecinos (403)');
      sql(`update community_profiles set welcome_at = coalesce(${WELCOME_X0 ? `'${WELCOME_X0}'::timestamptz` : 'null'}, now()) where user_id = '${RX}'`);
      // F5 · La foto subida y nunca mandada: a las 24 h el barrido la saca del almacén (la fila queda con purged_at); una enviada no se toca.
      const subida = await a.evaluate(async (bytes) => { const fd = new FormData(); fd.append('foto', new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }), 'f.jpg'); fd.append('para', 'dm'); return (await fetch('/api/mensajes/foto', { method: 'POST', body: fd })).json(); }, [...JPG]);
      ok(subida.ok && /^[0-9a-f-]{36}$/.test(subida.id) && sql(`select owner_kind from media where id = '${subida.id}'`) === 'dm', 'una foto subida (para=dm) y no mandada');
      const enviada0 = sql(`select created_at from media where id = '${FR}'`);
      sql(`update media set created_at = now() - interval '25 hours' where id in ('${subida.id}', '${FR}')`);
      execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`);
      ok(sql(`select (purged_at is not null) || '|' || status || '|' || removed_reason || '|' || owner_id from media where id = '${subida.id}'`) === 'true|removed|sin_enviar|pendiente', 'el barrido la purga (purged_at, «sin_enviar»; la fila queda)');
      ok((await traerFoto(a, `/api/mensajes/foto/${subida.id}`)).st === 404, 'purgada: la dirección privada ya no la sirve');
      ok(sql(`select purged_at is null from media where id = '${FR}'`) === 't', 'una foto ya enviada (aunque sea vieja) no se toca');
      sql(`update media set created_at = '${enviada0}' where id = '${FR}'`);
    }
    ok(err.length === 0, 'sin errores: ' + err.join(' | '));
    console.log('OK');
  } catch (e) {
    console.error(e);
    try { for (const x of globalThis.__p || []) { await x.screenshot({ path: OUT + 'fail-d9t-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', x.url()); } } catch { /* nada */ }
    process.exitCode = 1;
  } finally {
    await b.close(); await stubAbajo(); limpiar();
    if (trad) servidor(); // la configuración normal (sin traductor), como servir.sh
  }
})();
