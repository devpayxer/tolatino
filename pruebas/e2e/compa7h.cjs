// 7h · El Compa por WhatsApp y SMS con enlace, con los simuladores (sin llaves de Telnyx ni de Meta: nada sale; lo que «sale» queda en compa_outbound
// como «simulado»). Webhooks firmados con llaves de PRUEBA locales ($PRUEBAS_SALIDA/secretos.env y telnyx-prueba.pem, que genera pruebas/servir/servir.sh; nunca en el repo): firma buena → respuesta corta con la ayuda;
// sin firma, firma mala, hora vieja o del futuro, JSON roto, cuerpo enorme → rechazado y sin guardar nada; el mismo id dos veces → una respuesta;
// número sin cuenta y cuenta sin encender → la MISMA respuesta fija (sin datos); acción → enlace de un uso: sin sesión va a Entrar, con otra
// cuenta «es de otra cuenta», con la cuenta → «Así queda» y confirmar (una vez; usado; vencido); STOP → nada más (ni los avisos por SMS) y
// START vuelve; HELP; WhatsApp igual + la ventana de 24 h y la hora del mensaje; canal apagado → nada sale y la app igual; horas de silencio;
// límite por teléfono; respuestas automáticas de un negocio por WhatsApp; Super Admin › El Compa › Canales (números, registro sin texto ni
// teléfono, simulador) y Mi cuenta › Avisos. 390 y 1360.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const c = require('crypto'); const fs = require('fs');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100', TOK = ENT.TOK;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const cfg = (k, v) => sql(v == null ? `delete from platform_config where key = '${k}'` : `insert into platform_config (key, value, note) values ('${k}', to_jsonb(${v}), 'prueba compa7h') on conflict (key) do update set value = excluded.value`);
const flag = (k, on) => sql(`update feature_flags set enabled = ${on} where key = '${k}'`);
const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
const ADM = '5705550199', DAYANA = '5705550677', MARI = '5705550122', YARI = '5705550299', HECTOR = '5705550288', DUENO = '5705550133', NADIE = '5705550987', NEG = 'sabor-dominicano';
const TL_SMS = '+15705559001', TL_WA = '100200300400', NEG_WA = '100200300401';
const env = ENT.env; // los secretos de la corrida (pruebas/servir/servir.sh)
const llave = c.createPrivateKey(fs.readFileSync(S + '/telnyx-prueba.pem'));

// ── Los «proveedores» de la prueba: el cuerpo exacto que mandan Telnyx y Meta, firmado como ellos ──
const smsCuerpo = (de, texto, o = {}) => ({ data: { event_type: 'message.received', id: c.randomUUID(), occurred_at: new Date().toISOString(), record_type: 'event',
  payload: { id: o.id ?? c.randomUUID(), direction: 'inbound', from: { phone_number: `+1${de}` }, to: [{ phone_number: o.para ?? TL_SMS }], text: texto, type: 'SMS', received_at: new Date().toISOString(), media: [] } }, meta: { attempt: 1 } });
const telnyx = async (cuerpo, o = {}) => {
  const raw = o.raw ?? JSON.stringify(cuerpo), ts = String(o.ts ?? Math.floor(Date.now() / 1000));
  const sig = o.sig !== undefined ? o.sig : c.sign(null, Buffer.from(`${ts}|${o.firmar ?? raw}`), llave).toString('base64');
  const h = { 'content-type': 'application/json', 'telnyx-timestamp': ts }; if (sig !== null) h['telnyx-signature-ed25519'] = sig;
  return (await fetch(B + '/api/compa/entrada/telnyx', { method: 'POST', headers: h, body: raw })).status;
};
const waCuerpo = (de, texto, o = {}) => ({ object: 'whatsapp_business_account', entry: [{ id: 'WABA-PRUEBA', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp',
  metadata: { display_phone_number: '15705559002', phone_number_id: o.para ?? TL_WA }, contacts: [{ profile: { name: 'Prueba' }, wa_id: `1${de}` }],
  messages: [{ from: `1${de}`, id: o.id ?? `wamid.${c.randomBytes(12).toString('hex')}`, timestamp: String(o.ts ?? Math.floor(Date.now() / 1000)), type: 'text', text: { body: texto } }] } }] }] });
const whatsapp = async (cuerpo, o = {}) => {
  const raw = JSON.stringify(cuerpo), sig = o.sig !== undefined ? o.sig : 'sha256=' + c.createHmac('sha256', env.WHATSAPP_APP_SECRET).update(raw).digest('hex');
  const h = { 'content-type': 'application/json' }; if (sig !== null) h['x-hub-signature-256'] = sig;
  return (await fetch(B + '/api/compa/entrada/whatsapp', { method: 'POST', headers: h, body: raw })).status;
};
const idDe = (cuerpo) => cuerpo.data?.payload?.id ?? cuerpo.entry[0].changes[0].value.messages[0].id;
const entrada = (cuerpo) => sql(`select coalesce((select id::text || '|' || estado || '|' || coalesce(result, '') from compa_inbound where provider_msg_id = '${idDe(cuerpo)}'), '')`);
const hecha = async (cuerpo) => { ok(await espera(() => /\|hecho\|/.test(entrada(cuerpo)), 20000), `  … procesada (${entrada(cuerpo).split('|').slice(1).join(' · ')})`); return entrada(cuerpo).split('|'); };
const salidas = (id) => sql(`select coalesce(string_agg(kind || '|' || status || '|' || coalesce(body, ''), '¦' order by id), '') from compa_outbound where inbound_id = ${id}`).split('¦').filter(Boolean).map((x) => { const [k, s, ...b] = x.split('|'); return { k, s, b: b.join('|') }; });
const nEntradas = () => Number(sql('select count(*) from compa_inbound'));
const rechazos = (p, m) => Number(sql(`select coalesce(sum(n), 0) from compa_canal_rechazos where provider = '${p}' and reason = '${m}'`));
const reservaPendiente = (u) => sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, party_size, details, pay_mode, respond_by, client_key, is_test)
  values ('R-' || nextval('operations_table_seq'), 'table', 'hzl', '${NEG}', '${u}', 'pending', now() + interval '1 day', 90, 2, '{\"area\":\"salon\"}', 'none', now() + interval '1 hour', gen_random_uuid(), true) returning id, number)
  select id || '|' || number from o`).split('|');
const sms = async (de, t, o) => { const b = smsCuerpo(de, t, o); ok(await telnyx(b) === 200, `SMS firmado de ···${de.slice(-4)}: «${t.slice(0, 40)}» → 200`); const [id, , res] = await hecha(b); return { id, res, out: salidas(id), b }; };
const wa = async (de, t, o) => { const b = waCuerpo(de, t, o); ok(await whatsapp(b) === 200, `WhatsApp firmado de ···${de.slice(-4)}: «${t.slice(0, 40)}» → 200`); const [id, , res] = await hecha(b); return { id, res, out: salidas(id), b }; };
const interno = (body) => fetch(B + '/api/interno/compa', { method: 'POST', headers: { 'content-type': 'application/json', 'x-barrido-token': TOK }, body: JSON.stringify(body) }).then((r) => r.json());
const HOY = `extract(dow from now() at time zone 'America/New_York')::int`;

(async () => {
  // 9b-3 · Barajada, otras pruebas le dejaban a Marisol lleno el tope de mensajes de El Compa (20 por hora) y su SMS de noche salía como «límite».
  for (const x of [MARI, YARI, HECTOR]) require('../lib/negocio-nuevo.cjs').sinTopeDeAyuda(x);
  // ── Preparar: todo encendido, sin pausas, límites holgados; las entradas y mensajes de corridas anteriores a hace 2 días (solo esta base) ──
  const AU = uid(ADM), MU = uid(MARI), YU = uid(YARI), HU = uid(HECTOR);
  sql(`update feature_flags set enabled = true where key like 'compa.%'`);
  sql(`update compa_pauses set lifted_at = now(), lifted_by = '${AU}', lift_reason = 'prueba compa7h' where lifted_at is null`);
  cfg('compa_msgs_hora', 200); cfg('compa_msgs_dia', 1000); cfg('compa_espera_ms', 4000); cfg('compa_tope_mes_cents', null); cfg('compa_turnos_max', 100); cfg('soporte_casos_dia_max', 50);
  cfg('compa_canal_msgs_dia', 200); cfg('compa_canal_respuesta_min', null); cfg('compa_link_min', null); cfg('compa_auto_hilo_max', null); cfg('compa_auto_dia_negocio', null);
  sql(`set session_replication_role = replica; update compa_messages set at = at - interval '2 days' where at > now() - interval '1 day'`);
  sql(`set session_replication_role = replica; update compa_inbound set received_at = received_at - interval '2 days' where received_at > now() - interval '1 day'`);
  sql(`set session_replication_role = replica; update compa_outbound set created_at = created_at - interval '2 days' where created_at > now() - interval '1 day'`);
  sql(`set session_replication_role = replica; update support_cases set created_at = created_at - interval '2 days' where user_id in ('${MU}', '${YU}') and created_at > now() - interval '1 day'`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id in ('${MU}', '${YU}') and kind in ('table', 'appointment') and status in ('pending', 'change_proposed')`);
  // Las conversaciones por canal de corridas anteriores se cierran (como lo haría el barrido a las 24 h).
  sql(`update compa_conversations set closed_at = now(), outcome = case when outcome = 'open' then 'self_resolved' else outcome end where closed_at is null and (surface = 'channel' or channel in ('whatsapp', 'sms'))`);
  // Las bajas de corridas anteriores: un START «de la base» (la app nunca borra una baja; esto es el arreglo de la prueba).
  sql(`set session_replication_role = replica; delete from compa_canal_consent where phone_hash is not null`);
  sql(`update users set notif_prefs = notif_prefs - 'cpa' where phone in ('+1${MARI}', '+1${YARI}', '+1${HECTOR}')`);
  sql(`update compa_channel_numbers set status = 'retired', retired_at = now(), retired_by = '${AU}', retire_reason = 'prueba compa7h' where status = 'active'`);
  // Sabor Dominicano: Pro, respuestas automáticas encendidas, cerrado HOY.
  sql(`update business_stats_cache set plan = 'pro' where business_id = '${NEG}'`);
  sql(`insert into compa_business_settings (business_id, city_id, enabled, channels) values ('${NEG}', 'hzl', true, '{app}') on conflict (business_id) do update set enabled = true, channels = '{app}', topics = '{hours,menu,how_to_order,faq}'`);
  sql(`update businesses set closed_on = null, temp_closed_until = null where id = '${NEG}'`);
  sql(`update business_hours set open = true, ranges = '[["11:00","21:00"]]' where business_id = '${NEG}' and module = ''`);
  sql(`update business_hours set open = false where business_id = '${NEG}' and module = '' and weekday = ${HOY}`);
  await dormir(16000);   // la caché de Configuración es de 15 s

  const br = await chromium.launch(), errs = [], cap = [], sesiones = {};
  const ctx = async (w = 390) => br.newContext({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: w > 500 ? 1 : 2,
    userAgent: w > 500 ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15' : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  const pagina = async (k, w) => { const cx = await ctx(w); const p = await cx.newPage(); p.on('pageerror', (e) => errs.push(`${k}: ${e.message}`));
    p.on('request', (r) => { const a = r.headers()['next-action']; if (a && r.method() === 'POST') cap.push({ k, url: r.url(), a, body: r.postData(), tree: r.headers()['next-router-state-tree'] }); }); return p; };
  const como = async (tel, w = 390) => { const k = `${tel}-${w}`; if (!sesiones[k]) { const p = await pagina(k, w); await entrar(p, tel); sesiones[k] = p; } return sesiones[k]; };
  const repetir = (p, r, body) => p.evaluate(async ([u, a, b, t]) => { const x = await fetch(u, { method: 'POST', headers: { 'next-action': a, 'content-type': 'text/plain;charset=UTF-8', accept: 'text/x-component', ...(t ? { 'next-router-state-tree': t } : {}) }, body: b }); return x.status + ' ' + (await x.text()); }, [r.url, r.a, body ?? r.body, r.tree]);

  console.log('1 · Super Admin › El Compa › Canales: conectar los números (To\'Latino SMS y WhatsApp; Sabor Dominicano WhatsApp)');
  const pa = await como(ADM, 1360), aud0 = Number(sql(`select count(*) from audit_entries where action = 'compa.numero'`));
  await pa.goto(B + '/admin/compa?tab=can'); await pa.waitForSelector('text=NÚMEROS QUE RECIBEN');
  ok(/Ningún número conectado/.test(await texto(pa)), 'sin números: «Ningún número conectado»');
  const conectar = async (canal, valor, motivo = 'Número del sandbox para probar.') => {
    await pa.getByText('Conectar un número', { exact: true }).first().click(); await pa.waitForSelector('text=Conectar un número');
    await pa.getByText(canal, { exact: true }).first().click(); await pa.locator('input').first().fill(valor); await pa.getByText(motivo).click();
    await pa.locator('button, [role=button]').filter({ hasText: /^Conectar$/ }).last().click();
  };
  await conectar('SMS · Telnyx', '570 555 9001'); ok(await espera(() => sql(`select count(*) from compa_channel_numbers where address = '${TL_SMS}' and status = 'active' and provider = 'telnyx' and business_id is null`) === '1'), 'SMS de To\'Latino conectado (Telnyx)');
  await conectar('WhatsApp · Meta', TL_WA); ok(await espera(() => sql(`select count(*) from compa_channel_numbers where address = '${TL_WA}' and status = 'active' and business_id is null`) === '1'), 'WhatsApp de To\'Latino conectado (Meta)');
  await conectar('WhatsApp · Meta', `${NEG_WA}, ${NEG}`); ok(await espera(() => sql(`select business_id from compa_channel_numbers where address = '${NEG_WA}' and status = 'active'`) === NEG), 'WhatsApp de Sabor Dominicano conectado');
  await conectar('SMS · Telnyx', '570 555 9001'); ok(await espera(async () => (await texto(pa)).includes('Ese número ya está conectado.')), 'el mismo número dos veces → «Ese número ya está conectado.»');
  ok(Number(sql(`select count(*) from audit_entries where action = 'compa.numero'`)) === aud0 + 3, 'cada número conectado queda en la auditoría con su motivo');
  const nTL = sql(`select id from compa_channel_numbers where address = '${TL_SMS}' and status = 'active'`), nWA = sql(`select id from compa_channel_numbers where address = '${TL_WA}' and status = 'active'`);

  console.log('2 · Firma, hora, idempotencia, tamaño: lo que no viene de Telnyx o de Meta no entra (y no se guarda nada)');
  const e0 = nEntradas(), r0 = rechazos('telnyx', 'firma');
  ok(await telnyx(smsCuerpo(NADIE, 'hola sin firma'), { sig: null }) === 401, 'SMS SIN firma → 401');
  ok(await telnyx(smsCuerpo(NADIE, 'hola firma de otro cuerpo'), { firmar: '{"otro":1}' }) === 401, 'SMS con la firma de OTRO cuerpo → 401');
  ok(await telnyx(smsCuerpo(NADIE, 'hola firma basura'), { sig: Buffer.alloc(64, 7).toString('base64') }) === 401, 'SMS con una firma inventada → 401');
  ok(await telnyx(smsCuerpo(NADIE, 'hola con hora vieja'), { ts: Math.floor(Date.now() / 1000) - 600 }) === 401, 'SMS firmado con la hora de hace 10 min (repetición) → 401');
  ok(await telnyx(smsCuerpo(NADIE, 'hola del futuro'), { ts: Math.floor(Date.now() / 1000) + 600 }) === 401, 'SMS firmado con la hora de dentro de 10 min → 401');
  ok(await telnyx(null, { raw: '{"data": roto' }) === 400, 'JSON roto firmado → 400');
  ok(await telnyx(null, { raw: JSON.stringify({ x: 'a'.repeat(70000) }) }) === 413, 'cuerpo de 70 KB → 413');
  ok(nEntradas() === e0, 'nada de eso se guardó en la entrada');
  ok(rechazos('telnyx', 'firma') >= r0 + 3 && rechazos('telnyx', 'hora') >= 2 && rechazos('telnyx', 'tamano') >= 1, 'solo quedaron contados los rechazos (firma, hora, tamaño), sin nada de lo que traían');
  ok(await whatsapp(waCuerpo(NADIE, 'hola sin firma'), { sig: null }) === 401, 'WhatsApp SIN firma → 401');
  ok(await whatsapp(waCuerpo(NADIE, 'hola firma mala'), { sig: 'sha256=' + 'ab'.repeat(32) }) === 401, 'WhatsApp con HMAC equivocado → 401');
  ok(await whatsapp(waCuerpo(NADIE, 'hola'), { sig: 'sha256=' + c.createHmac('sha256', 'otro-secreto').update('x').digest('hex') }) === 401, 'WhatsApp firmado con otro secreto → 401');
  ok(nEntradas() === e0, 'tampoco se guardó nada de WhatsApp');
  const vieja = waCuerpo(NADIE, 'hola de ayer', { ts: Math.floor(Date.now() / 1000) - 25 * 3600 }), rH = rechazos('whatsapp', 'hora');
  ok(await whatsapp(vieja) === 200 && entrada(vieja) === '' && rechazos('whatsapp', 'hora') === rH + 1, 'WhatsApp firmado pero de hace 25 h (fuera de su ventana) → no entra ni se contesta (contado «hora»)');
  const ret = await fetch(`${B}/api/compa/entrada/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(env.WHATSAPP_VERIFY_TOKEN)}&hub.challenge=reto123`);
  ok(ret.status === 200 && (await ret.text()) === 'reto123', 'Meta verifica el webhook con el token del entorno → devuelve el reto');
  ok((await fetch(`${B}/api/compa/entrada/whatsapp?hub.mode=subscribe&hub.verify_token=otro-token-cualquiera&hub.challenge=reto123`)).status === 403, 'con otro token → 403'); // GUARDIAN-OK: un token equivocado a propósito (debe dar 403)
  ok((await fetch(`${B}/api/compa/entrada/sim`, { method: 'POST', body: '{}' })).status === 404, 'el proveedor «sim» no tiene ruta pública (404)');

  console.log('3 · Sin cuenta o sin encender: la MISMA respuesta fija, sin datos de ninguna cuenta');
  const s1 = await sms(NADIE, '¿cuándo es mi cita?');
  ok(s1.res === 'fija' && s1.out.length === 1 && s1.out[0].k === 'fija' && s1.out[0].s === 'simulado', 'número sin cuenta → la respuesta fija (en el sandbox, «simulado»: no sale nada)');
  ok(/^Para ayudarte con tus pedidos y citas, entra en To'Latino: http\S+\/entrar\?volver=%2Fcuenta%2Favisos /.test(s1.out[0].b), `la fija: «${s1.out[0].b.slice(0, 90)}…»`);
  const nc0 = sql(`select count(*) from compa_conversations where user_id = '${MU}' and surface = 'channel'`);
  const s2 = await sms(MARI, '¿cuándo es mi cita?');
  ok(s2.res === 'fija' && s2.out[0].b === s1.out[0].b, 'Marisol (cuenta, sin encender el canal) recibe EXACTAMENTE la misma fija: no se sabe si el número tiene cuenta');
  ok(!/Marisol|Sabor|R-\d|C-\d/.test(s2.out[0].b) && sql(`select user_id is null from compa_inbound where id = ${s2.id}`) === 't', 'sin nombre, sin negocios, sin operaciones; la entrada no queda ligada a su cuenta');
  ok(sql(`select count(*) from compa_conversations where user_id = '${MU}' and surface = 'channel'`) === nc0, 'y no se abrió ninguna conversación de El Compa');
  const sEn = await sms(NADIE, 'When is my appointment?'); ok(/^To help you with your orders and bookings, sign in to To'Latino/.test(sEn.out[0].b), 'en inglés, la fija en inglés');

  console.log('4 · Mi cuenta › Avisos: Marisol enciende «Hablar con El Compa por WhatsApp y SMS» (queda anotado)');
  const pm = await como(MARI);
  await pm.goto(B + '/cuenta/avisos'); await pm.waitForSelector('text=Hablar con El Compa por WhatsApp y SMS');
  ok(/SOLO DESDE TU TELÉFONO VERIFICADO/.test(await texto(pm)), 'la fila dice que solo contesta a su teléfono verificado y que lo demás se confirma en la app');
  await pm.screenshot({ path: OUT + 'e7h-avisos-390.png', fullPage: true });
  ok(sql(`select coalesce(notif_prefs->>'cpa', 'no') from users where id = '${MU}'`) === 'no', 'apagado de fábrica');
  await pm.getByRole('switch', { name: 'Hablar con El Compa por WhatsApp y SMS' }).click();
  ok(await espera(() => sql(`select notif_prefs->>'cpa' from users where id = '${MU}'`) === 'true'), 'encendido desde Mi cuenta (con su sesión)');
  ok(sql(`select action || '|' || via from compa_canal_consent where user_id = '${MU}' order by id desc limit 1`) === 'optin|cuenta', 'queda anotado en compa_canal_consent (optin · cuenta)');

  console.log('5 · SMS de una cuenta que lo encendió: respuesta corta con la ayuda (simulador), plano, por el canal');
  const s3 = await sms(MARI, '¿cómo reservo una mesa?');
  ok(s3.res === 'respuesta' && s3.out.length === 1 && s3.out[0].k === 'respuesta' && s3.out[0].s === 'simulado', 'contestó El Compa (simulado en el sandbox)');
  ok(/Más: http\S+\/ayuda\/reservar-mesa/.test(s3.out[0].b), `con la fuente de la ayuda: «${s3.out[0].b.slice(0, 120)}…»`);
  ok(s3.out[0].b.length <= 480 && !/[*#`_]|\p{Extended_Pictographic}/u.test(s3.out[0].b), 'corto (≤ 480) y plano: sin marcas ni emoji');
  ok(sql(`select user_id::text = '${MU}' from compa_inbound where id = ${s3.id}`) === 't', 'la entrada queda ligada a su cuenta');
  const conv3 = sql(`select c.number || '|' || c.channel || '|' || c.surface || '|' || c.use from compa_inbound i join compa_conversations c on c.id = i.conversation_id where i.id = ${s3.id}`);
  ok(/^CP-\d+\|sms\|channel\|neighbor$/.test(conv3), `la conversación de El Compa (${conv3})`);
  ok(sql(`select m.text from compa_messages m join compa_inbound i on i.conversation_id = m.conversation_id where i.id = ${s3.id} and m.sender = 'user' order by m.id desc limit 1`) === '¿cómo reservo una mesa?', 'su mensaje quedó en la conversación (tapado, como en la app)');
  const s3b = await sms(MARI, 'mi tarjeta es 4242 4242 4242 4242');
  ok(sql(`select body from compa_inbound where id = ${s3b.id}`).includes('[tapado]') && !sql(`select body from compa_inbound where id = ${s3b.id}`).includes('4242'), 'una tarjeta escrita por SMS queda «[tapado]» en la entrada');
  ok(/^No compartas eso aquí\. Nunca te lo pedimos\./.test(s3b.out[0]?.b ?? ''), 'y la respuesta empieza con «No compartas eso aquí. Nunca te lo pedimos.»');

  console.log('6 · El mismo mensaje dos veces (el proveedor reintenta) → una entrada, una respuesta');
  const dup = smsCuerpo(MARI, '¿cómo reservo una mesa para dos?');
  ok(await telnyx(dup) === 200, 'primera vez → 200'); await hecha(dup);
  ok(await telnyx(dup) === 200 && await telnyx(dup) === 200, 'la misma entrada otra vez (firmada de nuevo) → 200');
  await dormir(2500);
  ok(sql(`select count(*) from compa_inbound where provider_msg_id = '${idDe(dup)}'`) === '1' && salidas(entrada(dup).split('|')[0]).length === 1, 'una sola entrada y una sola respuesta');
  const wdup = waCuerpo(MARI, 'hola de nuevo por whatsapp'); ok(await whatsapp(wdup) === 200 && await whatsapp(wdup) === 200, 'WhatsApp: el mismo wamid dos veces → 200 y 200'); await hecha(wdup); await dormir(1500);
  ok(sql(`select count(*) from compa_inbound where provider_msg_id = '${idDe(wdup)}'`) === '1' && salidas(entrada(wdup).split('|')[0]).length === 1, 'WhatsApp: una entrada, una respuesta');

  console.log('7 · Una acción por SMS → un ENLACE de un uso (nunca se hace por mensaje)');
  const [opA, numA] = reservaPendiente(MU);
  const s4 = await sms(MARI, 'cancela mi reservación por favor');
  ok(s4.res === 'enlace' && s4.out[0].k === 'enlace', 'El Compa preparó la cancelación y mandó un enlace');
  ok(sql(`select status from operations where id = ${opA}`) === 'pending', 'la reservación sigue PENDIENTE: por mensaje no se cancela nada');
  ok(/Para confirmarlo, abre este enlace y entra con tu cuenta \(un solo uso, vence en 30 min\): http\S+\/compa\/e\/\[enlace\]/.test(s4.out[0].b), 'lo guardado en la salida NO tiene el token (solo «[enlace]»)');
  const L1 = sql(`select l.token_hash || '|' || a.status || '|' || round(extract(epoch from a.expires_at - a.proposed_at) / 60) || '|' || round(extract(epoch from l.expires_at - l.created_at) / 60) || '|' || (l.user_id = '${MU}')
    from compa_links l join compa_actions a on a.id = l.action_id where l.inbound_id = ${s4.id}`).split('|');
  ok(/^[a-f0-9]{64}$/.test(L1[0]) && L1[1] === 'proposed' && L1[2] === '30' && L1[3] === '30' && L1[4] === 'true', 'la base guarda la HUELLA del token; acción propuesta y enlace de 30 min, de Marisol');
  ok(!/\/compa\/e\/[A-Za-z0-9_-]{32}/.test(sql(`select string_agg(coalesce(body, ''), ' ') from compa_outbound where inbound_id = ${s4.id}`)), 'ni la salida guardada ni el registro tienen el token');
  // El texto que «salió» al teléfono (en el sandbox, el buzón del simulador en la memoria del servidor; nunca en la base).
  const buzon = async (id) => ((await interno({ op: 'canal_buzon', entrada: id })).textos ?? [])[0] ?? '';
  const enlaceDe = async (id) => { const m = /https?:\/\/\S+\/compa\/e\/([A-Za-z0-9_-]{32})/.exec(await buzon(id)); return m ? { url: `${B}/compa/e/${m[1]}`, t: m[1] } : null; };
  const lk = await enlaceDe(s4.id);
  ok(!!lk && c.createHash('sha256').update(lk.t).digest('hex') === L1[0], 'el enlace que sale al teléfono: /compa/e/{32 caracteres} y su huella es la guardada');
  const link = lk.url, accC = sql(`select action_id from compa_links where inbound_id = ${s4.id}`), opC = opA;
  const pedir = async (t) => { const r = await sms(MARI, t); ok(r.res === 'enlace', '  … con su enlace'); const l = await enlaceDe(r.id); return { enlace: l.url, t: l.t, acc: sql(`select action_id from compa_links where inbound_id = ${r.id}`) }; };

  console.log('8 · Abrir el enlace: sin sesión → Entrar (no entra solo); con otra cuenta → «es de otra cuenta»; con su cuenta → «Así queda»');
  const pn = await pagina('sin-sesion', 390);
  await pn.goto(link); await pn.waitForURL(/\/entrar\?volver=/);
  ok(decodeURIComponent(pn.url()).includes(link.replace(B, '')), 'sin sesión: va a Entrar y vuelve al enlace después (nunca entra solo)');
  ok(!(await pn.context().cookies()).some((k) => k.name === 'tl_s'), 'abrir el enlace no abrió ninguna sesión (sin cookie de sesión)');
  ok(sql(`select used_at is null from compa_links where action_id = '${accC}'`) === 't' && sql(`select status from compa_actions where id = '${accC}'`) === 'proposed', 'abrirlo no lo gasta (los robots de vista previa tampoco)');
  const py = await como(YARI);
  await py.goto(link); await py.waitForSelector('[data-enlace]');
  const ty = await texto(py);
  ok(/Este enlace es de otra cuenta/.test(ty) && !/Sabor Dominicano|R-\d|Cancelar la solicitud|ASÍ QUEDA/.test(ty), 'Yaritza con el enlace de Marisol: «es de otra cuenta», sin datos ni botones');
  ok(sql(`select used_at is null from compa_links where action_id = '${accC}'`) === 't', 'y no lo gastó');
  await py.screenshot({ path: OUT + 'e7h-enlace-otra-390.png', fullPage: true });
  // Marisol entra (el código de siempre) y vuelve al enlace.
  await entrar(pn, MARI); await pn.goto(link); await pn.waitForSelector('[data-enlace="ok"]');
  let tm = await texto(pn);
  ok(/UN SOLO USO · VENCE A LAS/.test(tm) && /ASÍ QUEDA/.test(tm) && /EL COMPA LO PREPARÓ · CONFÍRMALO TÚ/.test(tm) && /Sí, cancelar la solicitud/.test(tm), 'con su cuenta: la hoja con «Así queda» y la barra de confirmar');
  ok(/EL COMPA ES UNA IA Y PUEDE EQUIVOCARSE/.test(tm) && /Con una persona/.test(tm), 'con el aviso de IA y «Con una persona»');
  ok(sql(`select status from operations where id = ${opC}`) === 'pending', 'hasta el toque, la reservación sigue pendiente');
  await dormir(1200); await pn.screenshot({ path: OUT + 'e7h-enlace-390.png', fullPage: true });
  const pd = await pagina('enlace-1360', 1360); await entrar(pd, MARI); await pd.goto(link); await pd.waitForSelector('[data-enlace="ok"]'); await dormir(1200);
  await pd.screenshot({ path: OUT + 'e7h-enlace-1360.png', fullPage: true });
  const nCap = cap.length;
  await pn.getByText('Sí, cancelar la solicitud', { exact: true }).click();
  ok(await espera(async () => /CANCELASTE LA SOLICITUD EN SABOR DOMINICANO · NO SE COBRÓ NADA/.test(await texto(pn))), '«CANCELASTE LA SOLICITUD EN SABOR DOMINICANO · NO SE COBRÓ NADA»');
  ok(sql(`select status from operations where id = ${opC}`) === 'cancelled' && sql(`select status || '|' || confirmed_via from compa_actions where id = '${accC}'`) === 'confirmed|link', 'cancelada por la función de siempre; la acción confirmada «via link»');
  ok(sql(`select used_result from compa_links where action_id = '${accC}'`) === 'confirmed', 'el enlace queda usado (confirmed)');
  ok(sql(`select count(*) from operation_events where operation_id = ${opC} and actor = 'compa'`) === '1', 'el evento de la operación con actor «compa»');
  await pn.screenshot({ path: OUT + 'e7h-enlace-hecho-390.png', fullPage: true });
  const usarReq = cap.slice(nCap).find((x) => x.k === 'sin-sesion' && /"si"/.test(x.body ?? ''));
  ok(!!usarReq, 'la petición real de «usar el enlace» (acción del servidor) quedó capturada');

  console.log('9 · Segundo uso, vencido, otra cuenta repitiendo la petición real, y «No, dejarla»');
  await pn.goto(link); await pn.waitForSelector('[data-enlace]');
  ok(/Ya usaste este enlace/.test(await texto(pn)) && !/Sí, cancelar la solicitud/.test(await texto(pn)), 'abrirlo otra vez: «Ya usaste este enlace», sin botones');
  await pn.screenshot({ path: OUT + 'e7h-enlace-usado-390.png', fullPage: true });
  const otra = await repetir(pn, usarReq);
  ok(/Ya usaste este enlace/.test(otra), 'la misma petición otra vez → «Ya usaste este enlace»');
  const [opD] = reservaPendiente(MU);
  const r7 = await pedir('cancela mi reservación'), tok7 = r7.t, acc7 = r7.acc;
  ok(sql(`select operation_id from compa_actions where id = '${acc7}'`) === opD, 'un enlace nuevo para otra reservación pendiente');
  const pyR = await repetir(py, usarReq, usarReq.body.replace(/"[A-Za-z0-9_-]{32}"/, `"${tok7}"`));
  ok(/Este enlace es de otra cuenta/.test(pyR) && sql(`select used_at is null from compa_links where action_id = '${acc7}'`) === 't' && sql(`select status from operations where id = ${opD}`) === 'pending', 'Yaritza repitiendo la petición REAL con el token de Marisol → «es de otra cuenta»; nada cambia');
  sql(`set session_replication_role = replica; update compa_links set created_at = now() - interval '31 minutes', expires_at = now() - interval '1 minute' where action_id = '${acc7}'`);
  await pn.goto(r7.enlace); await pn.waitForSelector('[data-enlace]');
  ok(/Este enlace ya venció/.test(await texto(pn)) && !/Sí, cancelar la solicitud/.test(await texto(pn)), 'vencido: «Este enlace ya venció», sin botones');
  await pn.screenshot({ path: OUT + 'e7h-enlace-vencido-390.png', fullPage: true });
  const venc = await repetir(pn, usarReq, usarReq.body.replace(/"[A-Za-z0-9_-]{32}"/, `"${tok7}"`));
  ok(/ya venció/.test(venc) && sql(`select status from operations where id = ${opD}`) === 'pending', 'la petición real con el enlace vencido → «ya venció»; la reservación sigue igual');
  const r8 = await pedir('cancela mi reservación'), acc8 = r8.acc;
  await pn.goto(r8.enlace); await pn.waitForSelector('[data-enlace="ok"]');
  await pn.getByText('No, dejarla', { exact: true }).click();
  ok(await espera(async () => /la dejamos como está/.test(await texto(pn))), '«No, dejarla» → «Perfecto, la dejamos como está.»');
  ok(sql(`select status from compa_actions where id = '${acc8}'`) === 'dismissed' && sql(`select used_result from compa_links where action_id = '${acc8}'`) === 'dismissed' && sql(`select status from operations where id = ${opD}`) === 'pending', 'la acción la dejó, el enlace usado y la reservación igual');
  const pk = await pagina('token-malo', 390); await entrar(pk, MARI); await pk.goto(B + '/compa/e/' + 'x'.repeat(32)); await pk.waitForSelector('[data-enlace]');
  ok(/Ese enlace no existe/.test(await texto(pk)), 'un token inventado → «Ese enlace no existe»');

  console.log('10 · STOP se respeta al instante (y queda anotado); nada más sale; START vuelve; HELP');
  const st = await sms(MARI, 'STOP');
  ok(st.res === 'baja' && st.out[0]?.k === 'baja' && /no te mandamos más mensajes a este número\. Para volver, responde START\./.test(st.out[0].b), 'STOP → baja con su única confirmación');
  ok(sql(`select action || '|' || via || '|' || channel from compa_canal_consent where inbound_id = ${st.id}`) === 'stop|mensaje|sms', 'anotado en compa_canal_consent (stop · mensaje · sms)');
  const st2 = await sms(MARI, '¿cómo reservo una mesa?');
  ok(st2.res === 'en_baja' && st2.out.length === 0, 'después de STOP: no se contesta nada');
  const e7 = await interno({ op: 'canal_enviar', numero: nTL, telefono: MARI, texto: 'Prueba' });
  ok(e7.estado === 'baja', 'cualquier envío a ese teléfono por ese número queda «baja»');
  const st3 = await sms(MARI, 'START');
  ok(st3.res === 'alta' && /El Compa vuelve a contestarte por aquí\. Para salir, responde STOP\./.test(st3.out[0]?.b ?? ''), 'START → vuelve, con su confirmación');
  const st4 = await sms(MARI, '¿cómo reservo una mesa?'); ok(st4.res === 'respuesta' && st4.out[0].s === 'simulado', 'y El Compa contesta otra vez');
  const yes = await sms(MARI, 'Yes'); ok(yes.res !== 'alta', '«Yes» sin estar de baja es un mensaje normal (no un START)');
  const hp = await sms(MARI, 'HELP'); ok(hp.res === 'ayuda' && /\/ayuda\/el-compa-por-whatsapp-y-sms Para salir, responde STOP\./.test(hp.out[0].b), 'HELP → quiénes somos, la ayuda y cómo salir');
  const sp = await sms(NADIE, 'Alto'); ok(sp.res === 'baja', '«Alto» (español) también es STOP');
  await sms(NADIE, 'Start');

  console.log('11 · WhatsApp: lo mismo, más la ventana de 24 h');
  const w1 = await wa(MARI, '¿cómo reservo una mesa?');
  ok(w1.res === 'respuesta' && w1.out[0].s === 'simulado' && /Más: http\S+\/ayuda\/reservar-mesa/.test(w1.out[0].b), 'WhatsApp de su cuenta → respuesta con la ayuda (simulada)');
  ok(sql(`select c.channel from compa_inbound i join compa_conversations c on c.id = i.conversation_id where i.id = ${w1.id}`) === 'whatsapp', 'en una conversación de WhatsApp');
  const [opW] = reservaPendiente(MU);
  const w2 = await wa(MARI, 'cancela mi reservación');
  ok(w2.res === 'enlace' && w2.out[0].k === 'enlace' && sql(`select status from operations where id = ${opW}`) === 'pending', 'una acción por WhatsApp → enlace de un uso; nada cambia por mensaje');
  const wn = await wa(NADIE, 'hola'); ok(wn.res === 'fija', 'WhatsApp sin cuenta → la fija');
  const v1 = await interno({ op: 'canal_enviar', numero: nWA, telefono: YARI, texto: 'Hola' });
  ok(v1.estado === 'ventana', 'a un teléfono que no escribió por WhatsApp en 24 h: no sale («ventana»)');
  const v2 = await interno({ op: 'canal_enviar', numero: nWA, telefono: MARI, texto: 'Hola' });
  ok(v2.estado === 'simulado', 'a Marisol, que escribió hace un momento: sí (simulado)');
  sql(`set session_replication_role = replica; update compa_inbound set received_at = received_at - interval '25 hours' where channel = 'whatsapp' and received_at > now() - interval '1 hour'`);
  const v3 = await interno({ op: 'canal_enviar', numero: nWA, telefono: MARI, texto: 'Hola' });
  ok(v3.estado === 'ventana', 'con su último mensaje de hace 25 h: ya no («ventana»)');

  console.log('12 · Canal apagado → nada sale (y la app igual)');
  flag('compa.channel.sms', false);
  const off1 = await sms(MARI, '¿cómo reservo una mesa?');
  ok(off1.res === 'apagado' && off1.out.length === 0, 'SMS con el canal SMS apagado: no se contesta');
  const off2 = await sms(NADIE, 'hola'); ok(off2.res === 'apagado' && off2.out.length === 0, 'tampoco la fija');
  const off3 = await sms(HECTOR, 'STOP');
  ok(off3.res === 'baja' && (off3.out[0]?.s ?? 'apagado') === 'apagado' && sql(`select action from compa_canal_consent where inbound_id = ${off3.id}`) === 'stop', 'STOP con el canal apagado: la baja se anota igual y la confirmación no sale');
  await sms(HECTOR, 'START');
  const pmA = await como(MARI); await pmA.goto(B + '/soporte/compa');
  ok(/TE GUÍA EL COMPA/.test(await texto(pmA)), 'la app sigue igual: Soporte › Pregúntale al Compa abre');
  flag('compa.channel.sms', true);
  flag('compa.use.neighbor', false);
  const off4 = await sms(MARI, '¿cómo reservo una mesa?'); ok(off4.res === 'apagado' && off4.out.length === 0, 'con el nivel «Vecinos» en pausa tampoco');
  flag('compa.use.neighbor', true);

  console.log('13 · Horas de silencio: una respuesta tardía no sale de noche; una a tiempo sí');
  const zonas = ['Pacific/Kiritimati', 'Asia/Tokyo', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'Pacific/Honolulu', 'America/Los_Angeles', 'Australia/Sydney', 'Europe/Moscow', 'America/Sao_Paulo'];
  const hora = (z) => Number(new Intl.DateTimeFormat('en-US', { timeZone: z, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  // 9b-1 · Con margen: la noche de 11 PM a 5:59 AM y el día de 9 AM a 7:59 PM. Antes valía cualquier hora de 10 PM a 6:59 AM y la parte 17
  // (minutos después) encontró a Tokio ya a las 7 AM: la respuesta tardía salió. Con estas 10 zonas siempre hay una en cada ventana.
  const noche = zonas.find((z) => hora(z) >= 23 || hora(z) < 6), dia = zonas.find((z) => hora(z) >= 9 && hora(z) < 20);
  ok(!!noche && !!dia, `una zona de noche (${noche}) y una de día (${dia})`);
  const ciu0 = sql(`select home_city_id from users where id = '${MU}'`), tz0 = sql(`select timezone from cities where id = 'rdg'`);
  sql(`update users set home_city_id = 'rdg' where id = '${MU}'`); sql(`update cities set timezone = '${noche}' where id = 'rdg'`);
  cfg('compa_canal_respuesta_min', 0); await dormir(16000);
  const q1 = await sms(MARI, '¿cómo reservo una mesa?');
  ok(q1.out[0]?.s === 'silencio', 'de noche en su ciudad, con «respuesta a tiempo» = 0: no sale («silencio»)' + (q1.out[0]?.s === 'silencio' ? '' : ' · salió: ' + JSON.stringify(q1).slice(0, 300)));
  sql(`update cities set timezone = '${dia}' where id = 'rdg'`);
  const q2 = await sms(MARI, '¿cómo reservo una mesa?'); ok(q2.out[0]?.s === 'simulado', 'de día: sale');
  sql(`update cities set timezone = '${noche}' where id = 'rdg'`);
  cfg('compa_canal_respuesta_min', null); await dormir(16000);
  const q3 = await sms(MARI, '¿cómo reservo una mesa?'); ok(q3.out[0]?.s === 'simulado', 'de noche pero A TIEMPO (contesta lo que acaba de preguntar): sale');
  const q4 = await sms(MARI, 'STOP'); ok(q4.out[0]?.s === 'simulado', 'la confirmación de STOP sale a cualquier hora'); await sms(MARI, 'START');
  sql(`update cities set timezone = '${tz0}' where id = 'rdg'`); sql(`update users set home_city_id = ${ciu0 ? `'${ciu0}'` : 'null'} where id = '${MU}'`);

  console.log('14 · Límite por teléfono al día: avisa una vez y calla');
  cfg('compa_canal_msgs_dia', 5); await dormir(16000);
  const TELL = '5705550986';
  for (let i = 0; i < 5; i++) await sms(TELL, `hola ${i}`);
  const l6 = await sms(TELL, 'hola 6'); ok(l6.res === 'limite' && /Llegaste al límite de mensajes de hoy por aquí/.test(l6.out[0]?.b ?? ''), 'el 6.º → «Llegaste al límite…» una vez');
  const l7 = await sms(TELL, 'hola 7'); ok(l7.res === 'limite' && l7.out.length === 0, 'el 7.º → nada');
  const l8 = await sms(TELL, 'STOP'); ok(l8.res === 'baja', 'STOP pasa aunque esté en el límite');
  cfg('compa_canal_msgs_dia', 200); await dormir(16000);

  console.log('15 · Respuestas automáticas de un negocio por WhatsApp (sin datos de ninguna cuenta)');
  const pdu = await como(DUENO, 1360);
  await pdu.goto(B + `/panel/${NEG}/compa`); await pdu.waitForSelector('text=POR DÓNDE');
  let tdu = await texto(pdu);
  ok(/A tu número de WhatsApp/.test(tdu) && /Sin tu número de SMS conectado a To’Latino/.test(tdu), 'POR DÓNDE: WhatsApp conectado (interruptor) y SMS «sin número»');
  const w0 = await wa(NADIE, '¿A qué hora abren mañana?', { para: NEG_WA });
  ok(w0.res === 'auto_nada' && w0.out.length === 0, 'con WhatsApp sin encender en POR DÓNDE: El Compa no contesta (el negocio lo ve en su WhatsApp)');
  await pdu.getByRole('switch', { name: 'WhatsApp' }).click();
  ok(await espera(() => sql(`select channels::text from compa_business_settings where business_id = '${NEG}'`) === '{app,whatsapp}'), 'el dueño enciende WhatsApp en POR DÓNDE');
  ok(sql(`select after::text from audit_entries where action = 'compa.auto_ajustes' and target_id = '${NEG}' order by id desc limit 1`).includes('WhatsApp'), 'queda en la auditoría del negocio');
  await pdu.screenshot({ path: OUT + 'e7h-panel-canales-1360.png', fullPage: true });
  const nAv = Number(sql(`select count(*) from notifications where tpl = 'compa_te_paso' and created_at > now() - interval '1 hour'`));
  const w5 = await wa(NADIE, '¿A qué hora abren mañana?', { para: NEG_WA });
  ok(w5.res === 'auto' && w5.out[0]?.k === 'auto' && /^Soy El Compa, el asistente de IA de Sabor Dominicano\. /.test(w5.out[0].b), `contestó por el negocio con la presentación: «${(w5.out[0]?.b ?? '').slice(0, 110)}…»`);
  const cv = sql(`select coalesce(c.user_id::text, 'null') || '|' || (c.contact_phone_hash is not null) || '|' || c.use || '|' || c.business_id from compa_inbound i join compa_conversations c on c.id = i.conversation_id where i.id = ${w5.id}`);
  ok(cv === `null|true|auto_reply|${NEG}`, 'la conversación es del CONTACTO (huella), sin cuenta, del negocio');
  const w6 = await wa(MARI, '¿me hacen un descuento?', { para: NEG_WA });
  ok(w6.res === 'auto_paso' && /Eso lo decide Sabor Dominicano/.test(w6.out[0]?.b ?? ''), 'descuento → «Eso lo decide Sabor Dominicano…» (sin el modelo)');
  ok(!/Marisol|R-\d/.test(w6.out[0].b) && sql(`select coalesce(c.user_id::text, 'null') from compa_inbound i join compa_conversations c on c.id = i.conversation_id where i.id = ${w6.id}`) === 'null', 'aunque Marisol tiene cuenta, el negocio no usa nada de su cuenta');
  ok(await espera(() => Number(sql(`select count(*) from notifications where tpl = 'compa_te_paso' and created_at > now() - interval '1 hour'`)) > nAv), 'al dueño le llega «El Compa te pasó un mensaje…»');
  await pdu.goto(B + `/panel/${NEG}/compa`); await pdu.waitForSelector('text=POR DÓNDE');
  tdu = await texto(pdu);
  ok(/Cliente en WhatsApp/.test(tdu) && !/570|0122/.test(tdu.slice(tdu.indexOf('LO QUE CONTESTÓ'))), 'LO QUE CONTESTÓ EL COMPA: «Cliente en WhatsApp», sin teléfono');
  sql(`update business_hours set open = true, ranges = '[["00:00","00:00"]]' where business_id = '${NEG}' and module = '' and weekday = ${HOY}`);
  const w7 = await wa(NADIE, '¿A qué hora cierran?', { para: NEG_WA }); ok(w7.res === 'auto_nada' && w7.out.length === 0, 'el negocio ABIERTO: El Compa no contesta');
  sql(`update business_hours set open = false where business_id = '${NEG}' and module = '' and weekday = ${HOY}`);

  console.log('16 · Super Admin › El Compa › Canales: registro sin texto ni teléfono y el simulador del sandbox');
  await pa.goto(B + '/admin/compa?tab=can'); await pa.waitForSelector('text=REGISTRO DE ENTRADA');
  const ta = await texto(pa);
  ok(/ENTRADAS · 24 H/.test(ta) && /RECHAZADAS · 24 H/.test(ta) && /Simulador del sandbox/.test(ta), 'cifras y el modo (simulador del sandbox)');
  ok(!/¿cómo reservo una mesa\?|4242|5705550122|570 555 0122|\(570\) 555-0122/.test(ta), 'el registro no muestra el texto ni el teléfono');
  ok(/teléfono #[a-f0-9]{6} · con cuenta/.test(ta) && /MANDÓ UN ENLACE/.test(ta) && /STOP/.test(ta), 'muestra una huella corta, si era una cuenta y qué pasó');
  await pa.screenshot({ path: OUT + 'e7h-admin-canales-1360.png', fullPage: true });
  await pa.getByText(`SMS · To'Latino`, { exact: true }).first().click();
  await pa.locator('input').nth(0).fill('570 555 0122'); await pa.locator('textarea').first().fill('¿cómo reservo una mesa?');
  await pa.getByText('Mandar como ese teléfono', { exact: true }).click();
  ok(await espera(async () => /EL COMPA · RESPUESTA · simulado \(sandbox\)/.test(await texto(pa))), 'el simulador muestra la respuesta de El Compa (simulada)');
  ok(Number(sql(`select count(*) from audit_entries where action = 'compa.simular' and at > now() - interval '2 minutes'`)) >= 1, 'el uso del simulador queda en la auditoría');
  ok(!sql(`select after::text from audit_entries where action = 'compa.simular' order by id desc limit 1`).includes('5705550122'), 'sin el teléfono completo (solo los 4 últimos)');
  await pa.screenshot({ path: OUT + 'e7h-admin-simulador-1360.png', fullPage: true });
  const pa3 = await como(ADM, 390); await pa3.goto(B + '/admin/compa?tab=can'); await pa3.waitForSelector('text=NÚMEROS QUE RECIBEN');
  await pa3.screenshot({ path: OUT + 'e7h-admin-canales-390.png', fullPage: true });
  const pdy = await como(DAYANA, 1360); await pdy.goto(B + '/admin/compa?tab=can'); await pdy.waitForSelector('text=NÚMEROS QUE RECIBEN');
  const tdy = await texto(pdy);
  ok(!/Conectar un número|SIMULADOR DEL SANDBOX|Retirar/.test(tdy) && /REGISTRO DE ENTRADA/.test(tdy), 'Soporte (Dayana) ve el registro, sin conectar, retirar ni el simulador');
  // Retirar un número: deja de recibir.
  const nTmp = '5705559003'; await conectar('SMS · de prueba', nTmp);
  const idTmp = await (async () => { await espera(() => sql(`select count(*) from compa_channel_numbers where address = '+1${nTmp}' and status = 'active'`) === '1'); return sql(`select id from compa_channel_numbers where address = '+1${nTmp}' and status = 'active'`); })();
  await pa.goto(B + '/admin/compa?tab=can'); await pa.waitForSelector('text=NÚMEROS QUE RECIBEN');
  // Las filas: primero los de To'Latino por orden (SMS, WhatsApp, el de prueba), después los de negocios: el tercero es el de prueba.
  ok((await texto(pa)).indexOf(`+1${nTmp}`) < (await texto(pa)).indexOf('Sabor Dominicano (respuestas automáticas)'), 'el número de prueba sale antes que el del negocio');
  await pa.locator('button, [role=button]').filter({ hasText: /^Retirar$/ }).nth(2).click(); await pa.getByText('Ya no se usa.').click();
  await pa.locator('button, [role=button]').filter({ hasText: /^Retirar$/ }).last().click();
  ok(await espera(() => sql(`select status from compa_channel_numbers where id = ${idTmp}`) === 'retired'), 'retirar un número (con motivo y auditoría): queda «retirado», no se borra');
  const sr = await sms(NADIE, 'hola', { para: `+1${nTmp}` }); ok(sr.res === 'sin_ruta' && sr.out.length === 0, 'lo que llega a un número retirado no se contesta');

  console.log('17 · El barrido: una entrada que se quedó sin procesar se retoma; la purga vacía texto y teléfono (con el reloj movido)');
  const bz = smsCuerpo(MARI, '¿cómo reservo una mesa?'); ok(await telnyx(bz) === 200, 'una entrada nueva'); await hecha(bz);
  const idBz = entrada(bz).split('|')[0];
  // Una entrada que se quedó «recibida» (el proceso se cayó antes de contestar) hace 10 min (más que la respuesta a tiempo), de noche en su ciudad: el barrido la retoma y
  // la respuesta tardía NO sale («silencio»).
  const bz2 = smsCuerpo(MARI, '¿cómo reservo una mesa?'); ok(await telnyx(bz2) === 200, 'otra entrada'); await hecha(bz2);
  const idBz2 = entrada(bz2).split('|')[0];
  sql(`set session_replication_role = replica; update compa_inbound set estado = 'recibido', result = null, processed_at = null, conversation_id = null, attempts = 0, received_at = now() - interval '10 minutes' where id = ${idBz2}; delete from compa_outbound where inbound_id = ${idBz2}`);
  sql(`update users set home_city_id = 'rdg' where id = '${MU}'`); sql(`update cities set timezone = '${noche}' where id = 'rdg'`);
  await fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': TOK } });
  ok(sql(`select estado || '|' || result from compa_inbound where id = ${idBz2}`) === 'hecho|respuesta', 'el barrido retomó la entrada colgada');
  ok(salidas(idBz2)[0]?.s === 'silencio', 'y su respuesta tardía, de noche, no salió («silencio»)');
  sql(`update cities set timezone = '${tz0}' where id = 'rdg'`); sql(`update users set home_city_id = ${ciu0 ? `'${ciu0}'` : 'null'} where id = '${MU}'`);
  sql(`set session_replication_role = replica; update compa_inbound set received_at = now() - interval '40 days' where id = ${idBz}; update compa_outbound set created_at = now() - interval '40 days' where inbound_id = ${idBz}`);
  await fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': TOK } });
  ok(sql(`select (body is null) || '|' || (from_enc is null) || '|' || (purged_at is not null) from compa_inbound where id = ${idBz}`) === 'true|true|true', 'a los 40 días (retención 30): sin texto ni teléfono cifrado, con la fecha de la purga');
  ok(sql(`select bool_and(body is null) from compa_outbound where inbound_id = ${idBz}`) === 't', 'y la salida sin texto');
  let rechazoDb = '';
  try { sql(`update compa_inbound set body = 'otra cosa' where id = ${idBz}`); } catch (e) { rechazoDb = String(e.stderr ?? e.message); }
  ok(/solo se vacían con la purga|solo de inserción/.test(rechazoDb), 'la base no deja reescribir una entrada');
  try { sql(`delete from compa_canal_consent where id = (select max(id) from compa_canal_consent)`); rechazoDb = ''; } catch (e) { rechazoDb = String(e.stderr ?? e.message); }
  ok(/solo de inserción/.test(rechazoDb), 'ni borrar una baja');

  ok(!errs.length, `sin errores de página${errs.length ? ': ' + errs.join(' | ') : ''}`);
  const log = fs.readFileSync(S + '/server.log', 'utf8');
  ok(!/5705550122|4242 4242|¿cómo reservo una mesa\?/.test(log), 'el registro del servidor no tiene teléfonos ni textos de los mensajes');
  await br.close();
  console.log(`\n${n} comprobaciones ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
