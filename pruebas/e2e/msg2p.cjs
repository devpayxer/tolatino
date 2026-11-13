const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const MARI = "(select id from users where phone='+15705550122')", PEDRO = "(select id from users where phone='+15705550133')";
const TH = `(select id from chat_threads where user_id = ${MARI} and business_id = '${BIZ}')`;
const limpiar = () => { try { sql(`update chat_threads set blocked_at = null, blocked_by = null, phone_shared_at = null, assigned_user_id = null where business_id = '${BIZ}'`); sql(`update businesses set chat_auto_reply = false where id = '${BIZ}'`); } catch {} };
(async () => {
  limpiar();
  // Base local de pruebas: la conversación de prueba empieza vacía (la app nunca borra; esto es solo el arreglo de la prueba).
  sql(`delete from content_reports where target_kind = 'chat'`); sql(`delete from queue_items where queue = 'chat'`); sql(`delete from chat_messages where thread_id in (select id from chat_threads where user_id = ${MARI} and business_id = '${BIZ}')`); sql(`delete from chat_threads where user_id = ${MARI} and business_id = '${BIZ}'`);
  const m0 = Number(sql(`select count(*) from chat_messages`)), nb0 = Number(sql(`select count(*) from notifications where tpl = 'biz_msg' and user_id = ${PEDRO}`)), nu0 = Number(sql(`select count(*) from notifications where tpl = 'msg_user' and user_id = ${MARI}`));
  sql(`update chat_threads set biz_unread = 0, user_unread = 0 where business_id = '${BIZ}'`);
  const b = await chromium.launch(); const err = [];
  const ctxM = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true }); const m = await ctxM.newPage();
  const ctxP = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctxP.newPage(); globalThis.__p = [m, p];
  for (const x of [m, p]) { x.on('pageerror', e => err.push(e.message)); x.on('console', z => { if (z.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(z.text())) err.push('console ' + z.text()); }); }
  await entrar(m, '5705550122');
  // 1) desde la ficha: botón Mensaje
  await m.goto(B + `/n/${BIZ}`); await clic(m.getByRole('button', { name: 'Mensaje' }));
  await m.waitForURL(/\/cuenta\/mensajes\/sabor-dominicano/); await m.getByPlaceholder(/Escribe a Sabor Dominicano/).waitFor();
  ok(true, 'la ficha abre la conversación');
  // 2) teléfono bloqueado
  await m.getByPlaceholder(/Escribe a/).fill('Mi número es 570 555 0199'); await m.getByPlaceholder(/Escribe a/).press('Enter');
  await m.getByText('Por seguridad, sin teléfonos en los mensajes.').first().waitFor(); ok(Number(sql(`select count(*) from chat_messages`)) === m0, 'sin teléfonos: no se envía');
  // 3) enviar
  await m.getByPlaceholder(/Escribe a/).fill('Hola, ¿tienen mofongo hoy?'); await m.getByRole('button', { name: 'Enviar' }).click();
  await m.getByText('Hola, ¿tienen mofongo hoy?').first().waitFor();
  ok(sql(`select body from chat_messages where thread_id = ${TH} order by id desc limit 1`) === 'Hola, ¿tienen mofongo hoy?', 'el mensaje se guarda');
  ok(Number(sql(`select biz_unread from chat_threads where id = ${TH}`)) === 1, 'el negocio lo tiene sin leer');
  ok(Number(sql(`select count(*) from notifications where tpl = 'biz_msg' and user_id = ${PEDRO}`)) === nb0 + 1, 'aviso al dueño');
  await m.getByPlaceholder(/Escribe a/).fill('Para recoger a las 6'); await m.getByRole('button', { name: 'Enviar' }).click(); await m.getByText('Para recoger a las 6').first().waitFor();
  ok(Number(sql(`select count(*) from notifications where tpl = 'biz_msg' and user_id = ${PEDRO}`)) === nb0 + 1, 'el segundo mensaje sin leer no repite el aviso');
  await m.screenshot({ path: OUT + 'p1-chat-m.png', fullPage: true });
  // 4) el negocio contesta
  await entrar(p, '5705550133'); await p.goto(B + `/panel/${BIZ}/hoy`); await p.getByText('MENSAJES SIN RESPONDER').first().waitFor(); ok(true, 'Hoy: mensajes sin responder');
  await p.goto(B + `/panel/${BIZ}/mensajes`); await p.getByText('Respuesta automática fuera de horario').first().waitFor();
  await p.screenshot({ path: OUT + 'p2-panel-lista-d.png', fullPage: true });
  await clic(p.getByText(/Marisol .* · Consulta general/).first());
  await p.getByText('CONVERSACIÓN · CONSULTA GENERAL').first().waitFor();
  ok(Number(sql(`select biz_unread from chat_threads where id = ${TH}`)) === 0, 'abrirla la marca leída');
  await p.getByText('Te confirmo en un rato.', { exact: true }).last().click(); await clic(p.getByRole('button', { name: 'Enviar' }));
  await p.getByText('Enviado.').first().waitFor();
  ok(sql(`select sender || '|' || body from chat_messages where thread_id = ${TH} order by id desc limit 1`) === 'business|Te confirmo en un rato.', 'respuesta del negocio');
  ok(Number(sql(`select count(*) from notifications where tpl = 'msg_user' and user_id = ${MARI}`)) === nu0 + 1, 'aviso a la vecina');
  // el teléfono en el texto del negocio: no
  await (await vis(p.getByRole('textbox').last())).fill('Llámame al 570-555-0133'); await clic(p.getByRole('button', { name: 'Enviar' }));
  await p.getByText(/usa «Compartir mi teléfono»/).first().waitFor(); ok(true, 'el negocio tampoco manda teléfonos en el texto');
  await clic(p.getByRole('button', { name: 'Compartir mi teléfono' })); await p.getByText('Le mandamos el teléfono de tu página.').first().waitFor();
  ok(sql(`select sender from chat_messages where thread_id = ${TH} order by id desc limit 1`) === 'system', 'teléfono compartido como mensaje del sistema');
  await p.screenshot({ path: OUT + 'p3-panel-conv-d.png', fullPage: true });
  // 5) la vecina lo ve sin recargar (cada 4 s)
  await m.getByText('Te confirmo en un rato.').first().waitFor({ timeout: 12000 }); await m.getByText(/compartió su teléfono/).first().waitFor({ timeout: 12000 }); ok(true, 'la respuesta llega sola a la vecina');
  ok(Number(sql(`select user_unread from chat_threads where id = ${TH}`)) === 0, 'leída por la vecina');
  await m.goto(B + '/cuenta/mensajes'); await m.getByText('Sabor Dominicano').first().waitFor(); await m.screenshot({ path: OUT + 'p4-lista-m.png', fullPage: true }); ok(true, 'Mi cuenta › Mensajes');
  // 6) respuesta automática fuera de horario
  await p.goto(B + `/panel/${BIZ}/mensajes`); await clic(p.getByRole('switch', { name: 'Respuesta automática fuera de horario' }));
  await p.getByText(/Encendida: cuando estés cerrado/).first().waitFor(); ok(sql(`select chat_auto_reply from businesses where id = '${BIZ}'`) === 't', 'respuesta automática encendida');
  sql(`update business_hours set open = false where business_id = '${BIZ}' and module = '' and weekday = extract(dow from now() at time zone 'America/New_York')::int`);
  // 9b-1 · Esto prueba la respuesta FIJA (2p). Con El Compa encendido en un negocio Pro (7f), fuera de horario contesta él en vez de la fija
  // (dos «auto» en un minuto, una por mensaje). Se apaga El Compa de este negocio mientras dura este paso y se deja como estaba.
  const compaAntes = sql(`select coalesce((select enabled::text from compa_business_settings where business_id = '${BIZ}'), '')`);
  if (compaAntes === 'true') sql(`update compa_business_settings set enabled = false where business_id = '${BIZ}'`);
  try {
    await m.goto(B + `/cuenta/mensajes/${BIZ}`); await m.getByPlaceholder(/Escribe a/).fill('¿Abren mañana?'); await m.getByRole('button', { name: 'Enviar' }).click();
    await m.getByText(/Ahora estamos cerrados/).first().waitFor(); ok(sql(`select sender from chat_messages where thread_id = ${TH} order by id desc limit 1`) === 'auto', 'cerrado: contesta la automática');
    await m.getByPlaceholder(/Escribe a/).fill('Gracias'); await m.getByRole('button', { name: 'Enviar' }).click(); await m.getByText('Gracias', { exact: true }).first().waitFor();
    ok(Number(sql(`select count(*) from chat_messages where thread_id = ${TH} and sender = 'auto' and not compa and created_at > now() - interval '1 minute'`)) === 1, 'una sola automática (la fija) cada 12 h');
  } finally { sql(`update business_hours set open = true where business_id = '${BIZ}' and module = '' and weekday = extract(dow from now() at time zone 'America/New_York')::int`); if (compaAntes === 'true') sql(`update compa_business_settings set enabled = true where business_id = '${BIZ}'`); }
  // 7) bloquear
  await p.goto(B + `/panel/${BIZ}/mensajes?det=msg:` + sql(`select id from chat_threads where user_id = ${MARI} and business_id = '${BIZ}'`)); await clic(p.getByRole('button', { name: 'Bloquear' }));
  await p.getByText(/Bloqueado: ya no te puede escribir/).first().waitFor();
  const r = await m.evaluate(() => 1); void r;
  await m.goto(B + `/cuenta/mensajes/${BIZ}`); await m.getByText('Este negocio no recibe mensajes tuyos.').first().waitFor(); ok(!(await vis(m.getByPlaceholder(/Escribe a/))), 'bloqueada: no puede escribir');
  ok(sql(`select count(*) from audit_entries where action = 'mensajes.bloquear' and at > now() - interval '1 minute'`) !== '0', 'bloquear queda en la auditoría');
  // 8) desde un pedido: contexto
  limpiar(); const num = sql(`select number from operations where user_id = ${MARI} and business_id = '${BIZ}' and kind = 'order' order by id desc limit 1`);
  await m.goto(B + `/pedido/${num}`); await clic(m.getByRole('button', { name: 'Escribir al negocio' }));
  await m.waitForURL(/op=/); await m.getByPlaceholder(/Escribe a/).fill('Sobre mi pedido'); await m.getByRole('button', { name: 'Enviar' }).click(); await m.getByText('Sobre mi pedido').first().waitFor();
  ok(sql(`select context->>'es' from chat_threads where id = ${TH}`) === `Pedido #${num}`, 'contexto: el pedido');
  // 9) reportar (vecina)
  await m.getByText('Reportar', { exact: true }).first().click(); await clic(m.getByRole('button', { name: 'Spam o publicidad' }));
  await m.getByText(/To’Latino lo revisa en 48 horas/).first().waitFor(); ok(sql(`select count(*) from content_reports where target_kind = 'chat' and target_id = (${TH})::text and status = 'open'`) !== '0', 'reporte de la conversación');
  // 9b) Super Admin › Colas › Mensajes reportados: leer, ocultar un mensaje, cerrar
  const qid = sql(`select id from queue_items where queue = 'chat' and status = 'open' and subject_id = (${TH})::text`); ok(!!qid, 'el reporte abre un caso en la cola');
  const ad = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(ad); ad.on('pageerror', e => err.push(e.message));
  await entrar(ad, '5705550199'); await ad.goto(B + '/admin/colas?caso=' + qid); await ad.getByText('CONVERSACIÓN · ').first().waitFor();
  ok(!!(await vis(ad.getByText('Sobre mi pedido').first())), 'el equipo lee el hilo con el reporte abierto');
  await ad.screenshot({ path: OUT + 'p7-admin-caso-d.png', fullPage: true });
  const fila = ad.locator('div', { has: ad.getByText('Sobre mi pedido', { exact: true }) }).filter({ has: ad.getByText('Ocultar', { exact: true }) }).last();
  await fila.getByText('Ocultar', { exact: true }).click(); await clic(ad.getByRole('textbox').last()); await (await vis(ad.getByRole('textbox').last())).fill('Prueba de moderación');
  await clic(ad.getByRole('button', { name: /Confirmar|Ocultar/ }).last()); await ad.getByText(/Mensaje oculto. Quien lo escribió ve el motivo/).first().waitFor();
  ok(sql(`select hidden_reason from chat_messages where thread_id = ${TH} and body = 'Sobre mi pedido'`) === 'Prueba de moderación', 'mensaje oculto con motivo');
  ok(sql(`select count(*) from notifications where tpl = 'mod_hide' and user_id = ${MARI} and created_at > now() - interval '1 minute'`) !== '0', 'la autora recibe el motivo');
  await m.goto(B + `/cuenta/mensajes/${BIZ}`); await m.getByText('Mensaje oculto por To’Latino.').first().waitFor(); ok(true, 'en la conversación sale «Mensaje oculto por To’Latino»');
  await ad.goto(B + '/admin/colas?caso=' + qid); await clic(ad.getByRole('button', { name: 'Todo bien' })); await (await vis(ad.getByRole('textbox').last())).fill('Revisado, sin más problema');
  await clic(ad.getByRole('button', { name: 'Confirmar' }).last()); await ad.getByText(/Todo bien. Caso cerrado/).first().waitFor();
  ok(sql(`select status from queue_items where id = ${qid}`) === 'decided' && sql(`select count(*) from content_reports where target_kind = 'chat' and status = 'open'`) === '0', 'caso cerrado');
  await ad.goto(B + '/admin/colas?caso=' + qid); await ad.waitForTimeout(800); ok(!(await vis(ad.getByText('Sobre mi pedido').first())), 'con el caso cerrado el hilo ya no se lee');
  // 10) escritorio Mi cuenta y teléfono del panel
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(d); await entrar(d, '5705550122');
  await d.goto(B + `/cuenta/mensajes/${BIZ}`); await d.getByText('Mensaje oculto por To’Latino.').first().waitFor(); await d.screenshot({ path: OUT + 'p5-chat-d.png', fullPage: true });
  const pm = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })).newPage(); globalThis.__p.push(pm); await entrar(pm, '5705550133');
  await pm.goto(B + `/panel/${BIZ}/mensajes`); await pm.getByText('Respuesta automática fuera de horario').first().waitFor(); await pm.screenshot({ path: OUT + 'p6-panel-m.png', fullPage: true });
  for (const x of [m, pm]) { const w = await x.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'teléfono sin scroll horizontal (' + w + ')'); }
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} limpiar(); process.exit(1); });
