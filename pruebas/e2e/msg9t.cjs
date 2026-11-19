// 9t · Mensajes (2p): fotos en el chat y «Ver traducción» ES↔EN (sigue a msg2p y a vec9m §1). Marisol (vecina) ↔ Sabor Dominicano (Pedro, dueño).
// 1) La vecina elige una foto (con metadatos de la cámara) → miniatura con «Quitar foto» → la quita y la vuelve a elegir → la manda con texto.
//    Sin el servicio de imágenes (servir.sh no lo enciende) la foto queda EN REVISIÓN: ella la ve con «EN REVISIÓN»; el negocio ve «Foto en
//    revisión» y la dirección privada le da 404; la foto se guardó sin metadatos, privada (no-store) y nadie más la ve; hay caso en «medios».
// 2) El Super Admin la ve por el caso (queda en la auditoría) y «Está bien» → el panel abierto la muestra en vivo y al negocio ya se la deja ver.
// 3) Topes del servidor: un archivo que no es foto (415) y uno de más de 12 MB (413).
// 4) El negocio manda SOLO una foto desde el panel → en revisión → el equipo la quita con motivo → la vecina ve «Foto quitada por To’Latino» y
//    Pedro recibe el motivo (mod_hide). La foto quitada ya no se sirve a nadie.
// 5) Con la regla de fotos apagada (Auto-moderación) la foto se ve al instante (y se vuelve a encender como estaba).
// 6) «Ver traducción» con un traductor DE MENTIRA solo para esta prueba (stub-traductor.cjs; dice «[stub→es]»): el negocio escribe en inglés → la
//    vecina (app en español) ve «Ver traducción» → la traducción con «Ver original»; el original no cambia en la base; la segunda vez sale de la
//    caché; lo suyo no trae botón. Al revés: la vecina escribe en inglés → el panel (español) lo ofrece. El Super Admin ve el original.
// Preparación propia: El Compa apagado en el negocio mientras dura, conversación sin bloqueo, horario abierto. Todo se devuelve como estaba.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync, spawn } = require('child_process');
const fs = require('fs');
const NN = require('../lib/negocio-nuevo.cjs');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', PORT = 5099, STUB = `http://127.0.0.1:${PORT}`, TAG = '[m9t]';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const sh = (c) => execSync(c, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
// Pedir una dirección con la sesión de esa página: estado, tipo, caché y los bytes (para ver que no lleva metadatos).
const traerFoto = (p, u) => p.evaluate(async (u) => { const r = await fetch(u, { cache: 'no-store' }); const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (const x of b.slice(0, 4096)) s += String.fromCharCode(x); return { st: r.status, ct: r.headers.get('content-type'), cc: r.headers.get('cache-control'), cab: s }; }, u);
const subirCrudo = (p, tipo, n) => p.evaluate(async ([tipo, n]) => { const fd = new FormData(); fd.append('foto', new Blob([new Uint8Array(n)], { type: tipo }), 'x.bin'); return (await fetch('/api/mensajes/foto', { method: 'POST', body: fd })).status; }, [tipo, n]);
const MARI = "(select id from users where phone='+15705550122')", PEDRO = "(select id from users where phone='+15705550133')";
const TH = `(select id from chat_threads where user_id = ${MARI} and business_id = '${BIZ}')`;
const stubN = async () => (await fetch(`${STUB}/__n`)).json();
let stub = null, COMPA0 = null, IMG0 = null, horario = null, trad = false;
const stubArriba = async () => { stub = spawn('node', [ENT.RAIZ + '/pruebas/lib/stub-traductor.cjs', String(PORT)], { stdio: 'ignore' }); await espera(async () => { try { await stubN(); return true; } catch { return false; } }, 5000); };
const stubAbajo = async () => { if (stub) { stub.kill(); stub = null; } };
const servidor = (url) => console.log('  ·', sh(`SOLO=servir TRADUCTOR_URL=${url ?? ''} bash ${ENT.RAIZ}/pruebas/servir/servir.sh`));
const limpiar = () => {
  try {
    sql(`update chat_threads set blocked_at = null, blocked_by = null where business_id = '${BIZ}'`);
    if (COMPA0 === 'true') sql(`update compa_business_settings set enabled = true where business_id = '${BIZ}'`);
    if (IMG0 !== null) sql(`update mod_rules set enabled = ${IMG0 === 'true'} where key = 'img'`);
    // Los casos de esta prueba que queden abiertos (si falló a medias) se cierran; ugc_translations es derivado (una caché): lo de la prueba se tira.
    sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and queue = 'medios' and subject_kind = 'media' and subject_id in (select media_id::text from chat_messages where thread_id = ${TH} and media_id is not null)`);
    sql(`delete from ugc_translations where target_kind = 'chat_message' and target_id in (select id from chat_messages where thread_id = ${TH})`);
    sql(`delete from ugc_translation_uses where who in ('u:' || ${MARI}::text, 'u:' || ${PEDRO}::text)`);
    if (horario) { horario(); horario = null; }
  } catch { /* lo que se pudo */ }
};
(async () => {
  COMPA0 = sql(`select coalesce((select enabled::text from compa_business_settings where business_id = '${BIZ}'), '')`);
  IMG0 = sql(`select coalesce((select enabled::text from mod_rules where key = 'img'), 'true')`);
  if (COMPA0 === 'true') sql(`update compa_business_settings set enabled = false where business_id = '${BIZ}'`);
  sql(`update mod_rules set enabled = true where key = 'img'`);
  sql(`update chat_threads set blocked_at = null, blocked_by = null where business_id = '${BIZ}'`);
  sql(`update businesses set chat_auto_reply = false where id = '${BIZ}'`);
  horario = NN.abiertoTodoElDia(BIZ);
  // Base local de pruebas: la conversación de prueba empieza vacía, como en msg2p (la app nunca borra; esto es solo el arreglo de la prueba).
  sql(`delete from ugc_translations where target_kind = 'chat_message' and target_id in (select id from chat_messages where thread_id = ${TH})`);
  sql(`delete from chat_messages where thread_id = ${TH}`); sql(`delete from chat_threads where user_id = ${MARI} and business_id = '${BIZ}'`);
  // Una foto JPEG con metadatos de cámara (un texto que se busca después en lo que sirve el servidor: no tiene que estar).
  const sharp = require(ENT.RAIZ + '/apps/web/node_modules/sharp'), FOTO = S + '/m9t-foto.jpg', FOTO2 = S + '/m9t-foto2.jpg';
  fs.writeFileSync(FOTO, await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 200, g: 120, b: 60 } } }).withMetadata({ exif: { IFD0: { Copyright: 'm9tGPSsecreto' } } }).jpeg().toBuffer());
  fs.writeFileSync(FOTO2, await sharp({ create: { width: 480, height: 640, channels: 3, background: { r: 40, g: 90, b: 160 } } }).jpeg().toBuffer());
  ok(fs.readFileSync(FOTO).includes('m9tGPSsecreto'), 'la foto de prueba lleva metadatos (para ver que el servidor los quita)');
  const b = await chromium.launch(); const err = [];
  const nueva = async (w, h, movil) => { const c = await b.newContext(movil ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true } : { viewport: { width: w, height: h } }); NN.medios(c); const p = await c.newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (z) => { if (z.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(z.text())) err.push('console ' + z.text()); }); (globalThis.__p ??= []).push(p); return p; };
  try {
    const m = await nueva(390, 844, true), p = await nueva(1440, 900, false), ad = await nueva(1440, 900, false), otro = await nueva(1440, 900, false), anon = await nueva(390, 844, true);
    await entrar(m, '5705550122'); await entrar(p, '5705550133'); await entrar(ad, '5705550199'); await entrar(otro, '5705550433');
    await anon.goto(B + '/');

    // ── 1 · La vecina manda una foto (sin servicio de imágenes: queda en revisión) ──
    await m.goto(B + `/cuenta/mensajes/${BIZ}`); await m.getByPlaceholder(/Escribe a Sabor Dominicano/).waitFor();
    ok(!!(await vis(m.getByRole('button', { name: 'Agregar una foto' }))), 'el composer ofrece «Agregar una foto»');
    await m.locator('input[type=file]').setInputFiles(FOTO);
    await m.locator('[data-chat-adjunto]').waitFor({ timeout: 20000 }); ok(true, 'la miniatura de la foto elegida');
    await clic(m.getByRole('button', { name: 'Quitar foto' })); ok(await espera(async () => (await m.locator('[data-chat-adjunto]').count()) === 0), '«Quitar foto» la quita antes de enviar');
    await m.locator('input[type=file]').setInputFiles(FOTO); await m.locator('[data-chat-adjunto]').waitFor({ timeout: 20000 });
    await m.screenshot({ path: OUT + 'm9t-1-adjunto-m.png', fullPage: true });
    await m.getByPlaceholder(/Escribe a/).fill(`Así quedó la mesa ${TAG}`); await m.getByRole('button', { name: 'Enviar' }).click();
    ok(await espera(() => sql(`select count(*) from chat_messages where thread_id = ${TH} and media_id is not null and body like '%${TAG}%'`) === '1'), 'el mensaje se guarda con su foto');
    const M1 = sql(`select id from chat_messages where thread_id = ${TH} and media_id is not null order by id desc limit 1`), F1 = sql(`select media_id from chat_messages where id = ${M1}`);
    ok(sql(`select owner_kind || '|' || owner_id || '|' || private::text || '|' || (url like 'privado/m/%')::text from media where id = '${F1}'`) === `chat|${M1}|true|true`, 'la foto quedó privada, bajo privado/m/ y atada al mensaje');
    ok(sql(`select status from media where id = '${F1}'`) === 'review', 'sin el servicio de imágenes, en revisión (nunca abierto)');
    const Q1 = sql(`select id from queue_items where queue = 'medios' and subject_kind = 'media' and subject_id = '${F1}' and status = 'open'`);
    ok(!!Q1 && sql(`select detail from mod_flags where target_kind = 'media' and target_id = '${F1}' order by id desc limit 1`).includes('Foto de Mensajes'), 'caso abierto en «medios» con la nota «Foto de Mensajes»');
    ok(await contiene(m, 'EN REVISIÓN'), 'la vecina la ve con «EN REVISIÓN»');
    ok(await m.locator('[data-msg-foto="si"]').count() >= 1, 'y ve su propia foto');
    const U1 = `/api/mensajes/foto/${F1}`, r1 = await traerFoto(m, U1);
    ok(r1.st === 200 && r1.ct === 'image/jpeg' && /no-store/.test(r1.cc || ''), 'la dirección privada se la sirve a quien la mandó, sin caché');
    ok(!r1.cab.includes('m9tGPSsecreto'), 'sin los metadatos de la cámara');
    await p.goto(B + `/panel/${BIZ}/mensajes?det=msg:` + sql(`select id from chat_threads where user_id = ${MARI} and business_id = '${BIZ}'`));
    ok(await contiene(p, 'Foto en revisión'), 'el negocio ve «Foto en revisión» (sin la foto)');
    ok((await traerFoto(p, U1)).st === 404, 'y la dirección privada le da 404 mientras está en revisión');
    ok((await traerFoto(otro, U1)).st === 404 && (await traerFoto(anon, U1)).st === 404, 'otra persona o sin sesión: 404');
    await p.screenshot({ path: OUT + 'm9t-2-panel-revision-d.png', fullPage: true });

    // ── 2 · El Super Admin la revisa (auditado) y «Está bien» → el panel abierto la muestra en vivo ──
    const a0 = Number(sql(`select count(*) from audit_entries where action = 'mensajes.foto.ver'`));
    await ad.goto(B + '/admin/colas?caso=' + Q1); ok(await contiene(ad, 'Foto de Mensajes'), 'Super Admin › Colas: «Foto de Mensajes»');
    ok(await espera(async () => Number(sql(`select count(*) from audit_entries where action = 'mensajes.foto.ver'`)) > a0), 'el equipo la ve y queda en la auditoría');
    await ad.screenshot({ path: OUT + 'm9t-3-admin-foto-d.png', fullPage: true });
    await clic(ad.getByRole('button', { name: 'Está bien' }));
    ok(await espera(() => sql(`select status from media where id = '${F1}'`) === 'visible'), 'aprobada: la foto queda visible');
    ok(sql(`select status from queue_items where id = ${Q1}`) === 'decided' && sql(`select count(*) from audit_entries where action = 'mensajes.foto.aprobar' and target_id = '${F1}'`) === '1', 'el caso se cierra y la decisión queda en la auditoría');
    ok(await espera(async () => (await p.locator('[data-msg-foto="si"]').count()) >= 1, 15000), 'el panel abierto la muestra en vivo, sin recargar');
    ok((await traerFoto(p, U1)).st === 200, 'ahora el negocio la puede ver');
    ok((await traerFoto(otro, U1)).st === 404, 'y nadie más');

    // ── 3 · Topes del servidor ──
    ok(await subirCrudo(m, 'text/plain', 64) === 415, 'un archivo que no es foto: 415');
    ok(await subirCrudo(m, 'image/jpeg', 13 * 1024 * 1024) === 413, 'más de 12 MB: 413');
    ok(await subirCrudo(m, 'image/jpeg', 256) === 415, 'una «foto» que no se abre: 415');

    // ── 4 · El negocio manda solo una foto; el equipo la quita con motivo ──
    const n0 = Number(sql(`select count(*) from notifications where tpl = 'mod_hide' and user_id = ${PEDRO}`));
    const [ch] = await Promise.all([p.waitForEvent('filechooser'), clic(p.getByText('Agregar una foto', { exact: true }))]);
    await ch.setFiles(FOTO2);
    ok(await contiene(p, 'To’Latino la revisa antes de que el cliente la vea.', 20000), 'panel: la foto elegida, con la nota de que la revisa To’Latino');
    await clic(p.getByRole('button', { name: 'Enviar' }));
    ok(await espera(() => sql(`select count(*) from chat_messages where thread_id = ${TH} and sender = 'business' and body = '' and media_id is not null`) === '1'), 'el negocio manda solo la foto (sin texto)');
    const F2 = sql(`select media_id from chat_messages where thread_id = ${TH} and sender = 'business' and media_id is not null order by id desc limit 1`);
    ok(sql(`select last_text from chat_threads where id = ${TH}`) === 'Foto · Photo', 'la lista dice «Foto» (en el idioma de cada quien)');
    ok(await contiene(m, 'Foto en revisión', 15000), 'la vecina ve «Foto en revisión» en vivo');
    const Q2 = sql(`select id from queue_items where queue = 'medios' and subject_kind = 'media' and subject_id = '${F2}' and status = 'open'`); ok(!!Q2, 'caso en «medios»');
    await ad.goto(B + '/admin/colas?caso=' + Q2); await clic(ad.getByRole('button', { name: 'Quitar foto' }));
    await (await vis(ad.getByRole('textbox').last())).fill('Es publicidad'); await clic(ad.getByRole('button', { name: /Confirmar|Quitar/ }).last());
    ok(await espera(() => sql(`select status from media where id = '${F2}'`) === 'removed'), 'quitada con motivo');
    ok(sql(`select count(*) from audit_entries where action = 'mensajes.foto.quitar' and target_id = '${F2}'`) === '1', 'en la auditoría');
    ok(await espera(() => Number(sql(`select count(*) from notifications where tpl = 'mod_hide' and user_id = ${PEDRO}`)) > n0), 'quien la mandó recibe el motivo');
    ok(await contiene(m, 'Foto quitada por To’Latino.', 15000), 'la vecina ve «Foto quitada por To’Latino.»');
    ok((await traerFoto(p, `/api/mensajes/foto/${F2}`)).st === 404, 'la foto quitada ya no se sirve (ni a quien la mandó)');
    await m.screenshot({ path: OUT + 'm9t-4-chat-m.png', fullPage: true });

    // ── 5 · Con la regla de fotos apagada, se ve al instante ──
    sql(`update mod_rules set enabled = false where key = 'img'`); await new Promise((r) => setTimeout(r, 16000)); // la caché de las reglas dura 15 s
    await m.goto(B + `/cuenta/mensajes/${BIZ}`); await m.locator('input[type=file]').setInputFiles(FOTO2); await m.locator('[data-chat-adjunto]').waitFor({ timeout: 20000 });
    await m.getByRole('button', { name: 'Enviar' }).click();
    ok(await espera(() => sql(`select x.status from chat_messages c join media x on x.id = c.media_id where c.thread_id = ${TH} and c.sender = 'user' order by c.id desc limit 1`) === 'visible'), 'regla apagada: visible al instante');
    const F3 = sql(`select media_id from chat_messages where thread_id = ${TH} and sender = 'user' and media_id is not null order by id desc limit 1`);
    ok((await traerFoto(p, `/api/mensajes/foto/${F3}`)).st === 200, 'y el negocio la ve');
    sql(`update mod_rules set enabled = ${IMG0 === 'true'} where key = 'img'`);

    // ── 6 · «Ver traducción» (traductor de mentira) ──
    await stubArriba(); trad = true; servidor(STUB);
    await p.goto(B + `/panel/${BIZ}/mensajes?det=msg:` + sql(`select id from chat_threads where user_id = ${MARI} and business_id = '${BIZ}'`));
    const EN = `Thanks for the photo, we will fix the table for you tonight ${TAG}`;
    await (await vis(p.getByRole('textbox').last())).fill(EN); await clic(p.getByRole('button', { name: 'Enviar' }));
    ok(await espera(() => sql(`select lang from chat_messages where thread_id = ${TH} and body = '${EN}'`) === 'en'), 'el idioma lo detecta el traductor propio al enviar (en)');
    const MEN = sql(`select id from chat_messages where thread_id = ${TH} and body = '${EN}'`);
    await m.goto(B + `/cuenta/mensajes/${BIZ}`); await m.getByText(EN).first().waitFor();
    const t0 = (await stubN()).translate;
    await clic(m.locator('[data-tr="ver"]').last());
    ok(await contiene(m, `[stub→es] ${EN}`), 'la vecina ve la traducción');
    ok(await contiene(m, 'Ver original'), 'con «Ver original»');
    ok(sql(`select body from chat_messages where id = ${MEN}`) === EN, 'el original no cambia en la base');
    ok(sql(`select count(*) from ugc_translations where target_kind = 'chat_message' and target_id = ${MEN} and dst_lang = 'es'`) === '1', 'la traducción queda en la caché (derivada)');
    await m.screenshot({ path: OUT + 'm9t-5-traduccion-m.png', fullPage: true });
    await m.reload(); await m.getByText(EN).first().waitFor(); await clic(m.locator('[data-tr="ver"]').last());
    ok(await contiene(m, `[stub→es] ${EN}`) && (await stubN()).translate === t0 + 1, 'la segunda vez sale de la caché (el traductor no recibe otra llamada)');
    const ES = `Gracias, paso a las seis por mi pedido ${TAG}`;
    await m.getByPlaceholder(/Escribe a/).fill(ES); await m.getByRole('button', { name: 'Enviar' }).click(); await m.getByText(ES).first().waitFor();
    ok(await m.locator('[data-tr="ver"]').count() === 1, 'lo suyo y lo de su idioma no traen el botón');
    const EN2 = `Hello, is the kitchen open for pickup tonight? ${TAG}`;
    await m.getByPlaceholder(/Escribe a/).fill(EN2); await m.getByRole('button', { name: 'Enviar' }).click();
    ok(await espera(() => sql(`select lang from chat_messages where thread_id = ${TH} and body = '${EN2}'`) === 'en'), 'lo de la vecina en inglés también se detecta');
    await p.reload(); await p.getByText(EN2).first().waitFor();
    await clic(p.locator('[data-tr="ver"]').last()); ok(await contiene(p, `[stub→es] ${EN2}`), 'el panel (en español) le ofrece «Ver traducción» al negocio');
    await p.screenshot({ path: OUT + 'm9t-6-panel-traduccion-d.png', fullPage: true });
    // El Super Admin ve el original: la vecina reporta y el equipo abre la conversación (con la foto, auditada).
    await m.getByText('Reportar', { exact: true }).first().click(); await clic(m.getByRole('button', { name: 'Otra cosa' }));
    const QC = await (async () => { let q = ''; await espera(() => (q = sql(`select id from queue_items where queue = 'chat' and status = 'open' and subject_id = (${TH})::text`)) !== ''); return q; })();
    await ad.goto(B + '/admin/colas?caso=' + QC); await ad.getByText(EN).first().waitFor();
    ok(!(await texto(ad)).includes('[stub→') && await ad.locator('[data-tr]').count() === 0, 'Super Admin: el original, sin traducción ni botón');
    await clic(ad.getByRole('button', { name: 'Todo bien' })); await (await vis(ad.getByRole('textbox').last())).fill('Revisado en la prueba'); await clic(ad.getByRole('button', { name: 'Confirmar' }).last());
    ok(await espera(() => sql(`select status from queue_items where id = ${QC}`) === 'decided'), 'el caso de la conversación se cierra');
    for (const x of [m]) { const w = await x.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(w <= 0, 'teléfono sin scroll horizontal (' + w + ')'); }
    ok(err.length === 0, 'sin errores: ' + err.join(' | '));
    console.log('OK');
  } catch (e) {
    console.error(e);
    try { for (const x of globalThis.__p || []) { await x.screenshot({ path: OUT + 'fail-m9t-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', x.url()); } } catch { /* nada */ }
    process.exitCode = 1;
  } finally {
    await b.close(); await stubAbajo(); limpiar();
    if (trad) servidor(); // la configuración normal (sin traductor), como servir.sh
  }
})();
