// 6a · Eventos: el triángulo panel → Super Admin → panel. La Terraza (sin verificar) crea un evento en el editor del panel y lo envía →
// cola «evt» → el admin pide cambios (el panel lo dice con el motivo) → el negocio lo corrige y lo reenvía → el admin aprueba (listable) →
// el negocio cambia la hora (cambio que importa): vuelve a la cola y la versión anterior sigue en vivo → el admin aprueba el cambio (versión
// 2, la fecha se mueve) → el admin lo oculta: el panel dice «OCULTO POR TO'LATINO», le llega el aviso con la apelación → el dueño apela y
// OTRA persona del equipo levanta la apelación → se ve otra vez. Publica tu evento (Sabor) → «Tu evento está en revisión» → No aprobar
// (aviso con SMS en modo pruebas). Organizador bloqueado (Sabor) no puede enviar (pantalla, acción y base); se desbloquea. Organizador
// verificado (la Parroquia) publica al instante. Extra «Botella» frenado en el editor, en el servidor y en la base. Teléfono 390 y escritorio
// 1360. Deja los datos como estaban (eventos de prueba cancelados, casos cerrados, organizadores como al empezar).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9b-1 · El SMS que se espera sale de la regla del servidor (de noche, lo que no es crítico espera: «silencio»).
const { smsEsperado } = require('../lib/negocio-nuevo.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', FOTO = ENT.rec('fotos') + '/portada.jpg';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlFalla = (q) => { try { sql(q); return null; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const diaCorto = (iso) => { const [y, m, d] = iso.split('-').map(Number), w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return `${['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][w]} ${d} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][m - 1]}`; };
const RUN = Date.now().toString(36), TAG = `[e6a ${RUN}]`;
const TERRAZA = '5705550366', SABOR = '5705550133', PADRE = '5705550422', ADM = '5705550199', ADM2 = '5705550188';

(async () => {
  const limpiar = () => {
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba', hidden_at = null, hidden_by = null, hidden_reason = null, pending = null, pending_status = null where title->>'es' like '%[e6a %' and status <> 'cancelled'`);
    sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and ((queue = 'evt' and subject_id in (select id::text from events where title->>'es' like '%[e6a %')) or (queue = 'apel' and subject_id in (select id::text from appeals where target_kind in ('event', 'evt_org') and target_id in (select id::text from events where title->>'es' like '%[e6a %' union select 'sabor-dominicano'))))`);
    sql(`update event_organizers set blocked_at = null, blocked_by = null, blocked_reason = null where business_id = 'sabor-dominicano'`);
  };
  limpiar();
  const VER0 = sql(`select count(*) from event_organizers where business_id = 'la-terraza-night' and verified_at is not null`);
  sql(`update event_organizers set verified_at = null, verified_by = null where business_id in ('la-terraza-night', 'sabor-dominicano')`);
  const OWNER = uid(TERRAZA), DIA = sql(`select to_char((now() at time zone 'America/New_York')::date + 6, 'YYYY-MM-DD')`);
  const b = await chromium.launch(); const err = [];
  const nueva = async (w, h) => { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1 }); const p = await c.newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|status of 404/.test(m.text())) err.push('console: ' + m.text()); }); return p; };
  const decidir = async (p, boton, eleccion, nota, cta) => {
    await clic(p.getByRole('button', { name: boton }));
    if (eleccion) await clic(p.getByText(eleccion, { exact: true }).first());
    { let t = null; for (let i = 0; i < 20 && !t; i++) { t = await vis(p.locator('textarea')); if (!t) await p.waitForTimeout(250); } await t.fill(nota ?? 'Cumple las reglas'); }
    await clic(p.getByRole('button', { name: cta, exact: true }));
  };
  try {
    // ── 1 · El negocio crea en el panel (teléfono 390) y lo envía a revisión ──
    const tm = await nueva(390, 844); await entrar(tm, TERRAZA);
    await tm.goto(B + '/panel/la-terraza-night/eventos?det=evt:new:noche');
    ok(await contiene(tm, 'Solo ves lo que sirve para este tipo de evento.') && await contiene(tm, 'MESAS · CADA UNA SE VENDE UNA VEZ') && await contiene(tm, 'EN LA PUERTA NO SE VENDE'), 'editor de «Fiesta o show»: mesas, extras y la línea fija de la puerta');
    ok(await contiene(tm, 'se venden en la app cuando el evento sale publicado'), 'el editor dice que boletos, mesas y extras se venden en la app (7a: ya no «abre pronto»)');
    const [fc] = await Promise.all([tm.waitForEvent('filechooser'), clic(tm.getByRole('button', { name: 'Subir cartel' }))]);
    await fc.setFiles(FOTO);
    ok(await espera(async () => (await tm.locator('text=CARTEL').count()) > 1, 15000), 'el cartel se sube');
    await (await vis(tm.getByLabel('NOMBRE', { exact: true }))).fill(`Noche de prueba ${TAG}`);
    await clic(tm.getByRole('button', { name: diaCorto(DIA), exact: true }));
    // Extra «Botella»: el editor lo frena.
    await clic(tm.getByText('+ Extra'));
    const nombres = tm.getByLabel('NOMBRE', { exact: true }); await (await nombres.last()).fill('Botella premium');
    ok(await contiene(tm, 'Este extra no se puede guardar'), 'un extra de botella no se puede guardar (editor)');
    ok(await tm.getByRole('button', { name: 'Enviar a revisión', exact: true }).last().isDisabled(), 'con la botella, «Enviar a revisión» queda apagado');
    await (await nombres.last()).fill('Detalle de cumpleaños');
    await tm.screenshot({ path: OUT + 'e6a-editor-m.png' });
    await clic(tm.getByRole('button', { name: 'Enviar a revisión', exact: true }));
    ok(await espera(() => sql(`select count(*) from events where title->>'es' like '%${TAG}%'`) === '1'), 'el evento se guarda');
    const EV = sql(`select id from events where title->>'es' like '%${TAG}%'`);
    ok(sql(`select status || '|' || start_date || '|' || jsonb_array_length(addons_cfg) from events where id = ${EV}`) === `review|${DIA}|1`, 'en revisión, con el día elegido y el extra');
    ok(sql(`select count(*) from queue_items where queue = 'evt' and subject_id = '${EV}' and status = 'open'`) === '1', 'abre su caso en la cola «Eventos a revisar»');
    ok(sql(`select listable from event_dates where event_id = ${EV}`) === 'f', 'no sale al público (listable falso)');
    ok(sql(`select count(*) from media where owner_kind = 'event' and owner_id = '${EV}' and status = 'visible'`) === '1', 'el cartel queda con el evento');
    ok(sql(`select count(*) from notifications where user_id = '${OWNER}' and tpl = 'evt_revision' and body like '%${TAG}%'`) === '1', 'aviso «Tu evento está en revisión» al dueño');
    await tm.goto(B + `/panel/la-terraza-night/eventos?det=evt:${EV}`);
    ok(await contiene(tm, 'EN REVISIÓN') && await contiene(tm, 'lo revisa en 24 h'), 'la ficha del panel: EN REVISIÓN · 24 h (Configuración)');

    // ── 2 · El admin pide cambios desde la cola (escritorio) ──
    const ad = await nueva(1360, 900); await entrar(ad, ADM);
    const CASO = sql(`select id from queue_items where queue = 'evt' and subject_id = '${EV}' and status = 'open'`);
    await ad.goto(B + `/admin/colas?cola=evt&caso=${CASO}`);
    ok(await contiene(ad, `Noche de prueba ${TAG}`) && await contiene(ad, 'Es un evento nuevo.'), 'Colas › Eventos a revisar: el caso con el evento');
    await ad.screenshot({ path: OUT + 'e6a-cola-d.png' });
    await decidir(ad, 'Pedir cambios', 'Falta la edad mínima', 'Confirma que es 21+ con ID', 'Pedir cambios');
    ok(await espera(() => sql(`select status from events where id = ${EV}`) === 'changes'), 'cambios pedidos');
    ok(sql(`select review_note from events where id = ${EV}`) === 'Falta la edad mínima: Confirma que es 21+ con ID', 'el motivo (evtNo + nota) queda en el evento');
    ok(sql(`select status from queue_items where id = ${CASO}`) === 'decided', 'el caso se cierra');
    ok(sql(`select count(*) from audit_entries where action = 'evt.cambios' and target_id = '${EV}'`) === '1', 'queda en la auditoría');
    await tm.goto(B + `/panel/la-terraza-night/eventos?det=evt:${EV}`);
    ok(await contiene(tm, 'To’Latino pide un cambio: Falta la edad mínima'), 'el panel muestra el cambio pedido con el motivo');

    // ── 3 · El negocio lo corrige y lo reenvía ──
    await tm.goto(B + `/panel/la-terraza-night/eventos?det=evt:edit:${EV}`);
    await (await vis(tm.getByLabel('DESCRIPCIÓN · OPCIONAL', { exact: true }))).fill('21+ con ID. Bachata y merengue toda la noche.');
    await clic(tm.getByRole('button', { name: 'Enviar a revisión', exact: true }));
    ok(await espera(() => sql(`select status from events where id = ${EV}`) === 'review'), 'reenviado: en revisión otra vez');
    ok(sql(`select string_agg(decision, ',' order by id) from event_review_log where event_id = ${EV}`) === 'submitted,changes,resubmitted', 'el libro: enviado, cambios, reenviado');

    // ── 4 · El admin aprueba desde la ficha del evento ──
    await ad.goto(B + `/admin/eventos/${EV}`);
    await decidir(ad, 'Aprobar', null, null, 'Aprobar');
    ok(await espera(() => sql(`select status from events where id = ${EV}`) === 'live'), 'aprobado: en vivo');
    ok(sql(`select (approved_by = '${uid(ADM)}')::text || '|' || (select listable::text from event_dates where event_id = ${EV}) from events where id = ${EV}`) === 'true|true', 'aprobado por esa persona y listable');
    ok(sql(`select sms_status from notifications where user_id = '${OWNER}' and tpl = 'evt_aprobado' order by id desc limit 1`) === smsEsperado('evt_aprobado'), 'aviso «Tu evento ya está publicado» con SMS (modo pruebas)');

    // ── 5 · Cambio que importa (la hora) de un organizador sin verificar: vuelve a la cola, la versión anterior sigue en vivo ──
    const T0 = sql(`select starts_at from event_dates where event_id = ${EV}`), H0 = sql(`select start_min from events where id = ${EV}`);
    await tm.goto(B + `/panel/la-terraza-night/eventos?det=evt:edit:${EV}`);
    ok(await contiene(tm, 'Está publicado. Si cambias el día, la hora'), 'el editor avisa qué vuelve a revisión');
    await clic(tm.getByRole('button', { name: 'Empieza +' }));
    await clic(tm.getByRole('button', { name: 'Guardar', exact: true }));
    ok(await espera(() => sql(`select coalesce(pending_status, '-') from events where id = ${EV}`) === 'review'), 'el cambio queda pendiente de revisión');
    ok(sql(`select status || '|' || start_min || '|' || version from events where id = ${EV}`) === `live|${H0}|1`, 'la versión anterior sigue en vivo (misma hora, versión 1)');
    ok(sql(`select starts_at::text || '|' || listable from event_dates where event_id = ${EV}`) === `${T0}|true`, 'la fecha pública no cambia mientras se revisa');
    ok(sql(`select count(*) from queue_items where queue = 'evt' and subject_id = '${EV}' and status = 'open'`) === '1', 'vuelve a la cola');
    await tm.goto(B + `/panel/la-terraza-night/eventos?det=evt:${EV}`);
    ok(await contiene(tm, 'CAMBIO EN REVISIÓN') && await contiene(tm, 'sigue en vivo la versión anterior'), 'el panel: CAMBIO EN REVISIÓN · sigue en vivo la versión anterior');
    await tm.screenshot({ path: OUT + 'e6a-cambio-m.png', fullPage: true });
    await ad.goto(B + `/admin/eventos/${EV}`);
    ok(await contiene(ad, 'LO QUE CAMBIA') && await contiene(ad, 'Empieza'), 'el admin ve lo que cambia');
    await ad.screenshot({ path: OUT + 'e6a-cambio-adm-d.png', fullPage: true });
    await decidir(ad, 'Aprobar', null, null, 'Aprobar');
    ok(await espera(() => sql(`select version from events where id = ${EV}`) === '2'), 'cambio aprobado: versión 2');
    ok(sql(`select start_min from events where id = ${EV}`) === String(Number(H0) + 30) && sql(`select (starts_at - '${T0}'::timestamptz)::text from event_dates where event_id = ${EV}`) === '00:30:00', 'la hora y la fecha pública se mueven 30 min');

    // ── 6 · Ocultar: el panel dice «OCULTO POR TO'LATINO», aviso con la apelación; el dueño apela y OTRA persona la levanta ──
    await ad.goto(B + `/admin/eventos/${EV}`);
    await decidir(ad, 'Ocultar del módulo', null, 'Evento falso o engañoso', 'Ocultar');
    ok(await espera(() => sql(`select hidden_at is not null from events where id = ${EV}`) === 't'), 'oculto del módulo');
    ok(sql(`select listable from event_dates where event_id = ${EV}`) === 'f' && sql(`select status from events where id = ${EV}`) === 'live', 'deja de ser listable y conserva su estado');
    ok(sql(`select href from notifications where user_id = '${OWNER}' and tpl = 'evt_oculto' order by id desc limit 1`) === `/cuenta/moderacion?k=event&id=${EV}`, 'aviso al organizador con la ruta para apelar');
    await tm.goto(B + '/panel/la-terraza-night/eventos');
    ok(await contiene(tm, 'OCULTO POR TO’LATINO'), 'la lista del panel dice OCULTO POR TO’LATINO');
    await tm.goto(B + `/panel/la-terraza-night/eventos?det=evt:${EV}`);
    ok(await contiene(tm, 'OCULTO POR TO’LATINO · No sale en Eventos ni en tu página. Motivo: Evento falso o engañoso'), 'la ficha del panel dice el motivo');
    await tm.screenshot({ path: OUT + 'e6a-oculto-m.png', fullPage: true });
    await tm.goto(B + `/cuenta/moderacion?k=event&id=${EV}`);
    await (await vis(tm.locator('textarea'))).fill('Es un evento real: tenemos el contrato del grupo y el local.');
    await clic(tm.getByRole('button', { name: 'Enviar apelación' }));
    ok(await espera(() => sql(`select count(*) from appeals where target_kind = 'event' and target_id = '${EV}'`) === '1'), 'el dueño apela');
    const AP = sql(`select id from appeals where target_kind = 'event' and target_id = '${EV}'`);
    ok(sql(`select sanctioned_by = '${uid(ADM)}' from appeals where id = ${AP}`) === 't', 'la base pone quién lo ocultó');
    const CA = sql(`select id from queue_items where queue = 'apel' and subject_id = '${AP}' and status = 'open'`);
    await ad.goto(B + `/admin/colas?cola=apel&caso=${CA}`);
    ok(await contiene(ad, 'la apelación la decide otra persona'), 'quien ocultó no decide la apelación');
    const a2 = await nueva(1360, 900); await entrar(a2, ADM2);
    await a2.goto(B + `/admin/colas?cola=apel&caso=${CA}`);
    await decidir(a2, 'Levantar', null, 'Tenía razón: no rompe las reglas', 'Levantar');
    ok(await espera(() => sql(`select hidden_at is null from events where id = ${EV}`) === 't'), 'apelación levantada: el evento se ve otra vez');
    ok(sql(`select listable from event_dates where event_id = ${EV}`) === 't', 'listable otra vez');

    // ── 7 · Publica tu evento (Sabor, teléfono) → en revisión → No aprobar ──
    const sm = await nueva(390, 844); await entrar(sm, SABOR);
    await sm.goto(B + '/eventos/publicar');
    ok(await contiene(sm, 'Publica tu evento') && await contiene(sm, '¿QUÉ NEGOCIO LO ORGANIZA?'), 'Publica tu evento abre');
    await clic(sm.getByRole('button', { name: /Sabor Dominicano/ }));
    await (await vis(sm.locator('input[placeholder]').first())).fill(`Sancocho de prueba ${TAG}`);
    await clic(sm.getByText('Comida y música', { exact: true }));
    await sm.setInputFiles('input[aria-label="Subir cartel"]', FOTO);
    ok(await espera(async () => (await sm.locator('text=Subir cartel').count()) === 0, 15000), 'el cartel se sube');
    await clic(sm.getByRole('button', { name: /Gratis con RSVP/ }));
    await (await vis(sm.locator('input[inputmode="numeric"]'))).fill('40');
    await sm.screenshot({ path: OUT + 'e6a-publica-lleno-m.png', fullPage: true });
    await clic(sm.getByRole('button', { name: 'Enviar a revisión', exact: true }));
    ok(await contiene(sm, 'Tu evento está en revisión'), '«Tu evento está en revisión» con sus pasos');
    await sm.screenshot({ path: OUT + 'e6a-publica-enviado-m.png', fullPage: true });
    const EP = sql(`select id from events where title->>'es' like 'Sancocho de prueba ${TAG}%'`);
    ok(sql(`select status || '|' || origin || '|' || entry || '|' || rsvp_capacity from events where id = ${EP}`) === 'review|publica|rsvp|40', 'guardado desde Publica: en revisión, RSVP con cupo 40');
    await ad.goto(B + `/admin/eventos/${EP}`);
    await decidir(ad, 'No aprobar', 'La foto no corresponde al evento', 'Sube una foto del sancocho o del local', 'No aprobar');
    ok(await espera(() => sql(`select status from events where id = ${EP}`) === 'rejected'), 'no aprobado');
    ok(sql(`select sms_status || '|' || href from notifications where tpl = 'evt_rechazado' and user_id = '${uid(SABOR)}' order by id desc limit 1`) === `${smsEsperado('evt_rechazado')}|/cuenta/moderacion?k=event&id=${EP}`, 'aviso «no se publicó» con SMS (pruebas) y la apelación');
    await sm.goto(B + `/panel/sabor-dominicano/eventos?det=evt:${EP}`);
    ok(await contiene(sm, 'No se publicó: La foto no corresponde al evento') && await contiene(sm, 'Apelar'), 'el panel: no se publicó, con el motivo y «Apelar»');

    // ── 8 · Organizador bloqueado: no envía (pantalla, acción, base); se desbloquea ──
    await ad.goto(B + '/admin/eventos?tab=org');
    await ad.goto(B + '/admin/negocios/sabor-dominicano?tab=cont');
    ok(await contiene(ad, 'EVENTOS ·'), 'Negocios 360° › Contenido › Eventos');
    await decidir(ad, 'Bloquear publicación', null, 'Eventos falsos o engañosos', 'Confirmar');
    ok(await espera(() => sql(`select blocked_at is not null from event_organizers where business_id = 'sabor-dominicano'`) === 't'), 'organizador bloqueado');
    ok(sql(`select href from notifications where tpl = 'evt_bloqueado' and user_id = '${uid(SABOR)}' order by id desc limit 1`) === '/cuenta/moderacion?k=evt_org&id=sabor-dominicano', 'aviso de bloqueo con la apelación');
    await sm.goto(B + '/panel/sabor-dominicano/eventos');
    ok(await contiene(sm, 'To’Latino bloqueó tus eventos') && !(await sm.getByRole('button', { name: 'Crear', exact: true }).count()), 'el panel lo dice y no deja crear');
    await sm.goto(B + '/eventos/publicar');
    await clic(sm.getByRole('button', { name: /Sabor Dominicano/ }));
    await clic(sm.getByRole('button', { name: 'Enviar a revisión', exact: true }));
    ok(await contiene(sm, 'No puedes publicar eventos'), 'Publica tu evento: no puede enviar');
    const BOR = sql(`select id from events where business_id = 'sabor-dominicano' and status = 'draft' limit 1`);
    const DRAFT = BOR || sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry) values ('', 'hzl', 'sabor-dominicano', 'comida', '{"es":"Borrador ${TAG}","en":""}', (now() at time zone 'America/New_York')::date + 9, 780, 960, 'rsvp') returning id`).split('\n')[0];
    ok(/bloqueado/.test(sqlFalla(`update events set status = 'review' where id = ${DRAFT}`) ?? ''), 'la base no deja enviar a revisión a un organizador bloqueado');
    await ad.goto(B + '/admin/negocios/sabor-dominicano?tab=cont');
    await decidir(ad, 'Permitir publicar', null, 'Se resolvió con el dueño', 'Confirmar');
    ok(await espera(() => sql(`select blocked_at is null from event_organizers where business_id = 'sabor-dominicano'`) === 't'), 'puede publicar otra vez');

    // ── 9 · Revisión antes de publicar (la base) y organizador verificado (la Parroquia publica al instante) ──
    ok(/solo aprobado|approved_at/.test(sqlFalla(`update events set status = 'live' where id = ${DRAFT}`) ?? ''), 'la base no deja poner en vivo sin aprobar');
    ok(/organizador verificado/.test(sqlFalla(`update events set status = 'live', approved_at = now(), approved_by = null where id = ${DRAFT}`) ?? ''), 'sin persona que apruebe, solo un organizador verificado');
    ok(/evt_extras_ok|check/.test(sqlFalla(`update events set entry = 'tickets', addons_cfg = '[{"kind":"detalle","name":{"es":"Botella premium","en":""}}]' where id = ${DRAFT}`) ?? ''), 'la base no guarda un extra de botella');
    if (!BOR) sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin' where id = ${DRAFT}`);
    const pd = await nueva(1360, 900); await entrar(pd, PADRE);
    await pd.goto(B + '/panel/parroquia-santa-maria/eventos');
    ok(await contiene(pd, 'Eres organizador verificado'), 'la Parroquia es organizador verificado');
    await pd.goto(B + '/panel/parroquia-santa-maria/eventos?det=evt:new:fe');
    const [fc2] = await Promise.all([pd.waitForEvent('filechooser'), clic(pd.getByRole('button', { name: 'Subir cartel' }))]);
    await fc2.setFiles(FOTO);
    await espera(async () => (await pd.locator('text=CARTEL').count()) > 1, 15000);
    await (await vis(pd.getByLabel('NOMBRE', { exact: true }))).fill(`Hora santa ${TAG}`);
    ok(await contiene(pd, 'Hay cuidado de niños'), 'el formato «fe» trae cuidado de niños');
    await pd.screenshot({ path: OUT + 'e6a-editor-fe-d.png' });
    await clic(pd.getByRole('button', { name: 'Publicar evento', exact: true }));
    ok(await espera(() => sql(`select status || '|' || (approved_by is null)::text from events where title->>'es' like 'Hora santa ${TAG}%'`) === 'live|true'), 'verificado: publicado al instante, sin revisión (aprobado por el sistema)');
    const EF = sql(`select id from events where title->>'es' like 'Hora santa ${TAG}%'`);
    ok(sql(`select count(*) from queue_items where queue = 'evt' and subject_id = '${EF}'`) === '0' && sql(`select listable from event_dates where event_id = ${EF}`) === 't', 'sin caso en la cola y listable');

    // ── 10 · Repetir otro día y capturas finales ──
    await tm.goto(B + `/panel/la-terraza-night/eventos?det=evt:${EV}`);
    await clic(tm.getByRole('button', { name: 'Repetir otro día', exact: true }));
    ok(await espera(() => sql(`select count(*) from events where title->>'es' = 'Noche de prueba ${TAG}' and status = 'draft'`) === '1'), '«Repetir otro día»: copia como borrador');
    ok(sql(`select (e.start_date - o.start_date)::text from events e, events o where o.id = ${EV} and e.title->>'es' = 'Noche de prueba ${TAG}' and e.status = 'draft'`) === '7', '… 7 días después');
    const tl = await nueva(1360, 900); await entrar(tl, TERRAZA);
    await tl.goto(B + '/panel/la-terraza-night/eventos'); await tl.waitForTimeout(800); await tl.screenshot({ path: OUT + 'e6a-panel-d.png', fullPage: true });
    await tm.goto(B + '/panel/la-terraza-night/eventos'); await tm.waitForTimeout(800); await tm.screenshot({ path: OUT + 'e6a-panel-m.png', fullPage: true });
    ok(!err.length, `sin errores en la consola (${err.length})`);
  } finally {
    if (err.length) console.log(err.slice(0, 8).join('\n'));
    limpiar();
    if (VER0 === '1') sql(`update event_organizers set verified_at = now() where business_id = 'la-terraza-night'`);
    await b.close();
  }
  console.log('evt6a OK');
})().catch((e) => { console.error(e); process.exit(1); });
