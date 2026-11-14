// 9l · Avisos, correo y canales listos (fase9-apertura.md §4 9l). Teléfono 390 y escritorio 1360. Contra los simuladores y con webhooks FIRMADOS con llaves de
// PRUEBA locales ($PRUEBAS_SALIDA: secretos.env y telnyx-prueba.pem de pruebas/servir/servir.sh; el certificado de «SNS» lo hace esta prueba con openssl).
// 1 · Cada plantilla nueva a un teléfono simulado, en español y en inglés (el aviso en su idioma y su SMS por el único camino: sms_outbox «entregado» por el
//     simulador); el código para entrar sale por el mismo camino.
// 2 · Un SMS que falla → reintento (con su espera) → entregado (570-555-0911); el inválido falla sin reintento (0912); el proveedor caído reintenta (0913); el
//     aviso de entrega de Telnyx firmado (message.finalized) lo marca entregado una vez, y el de un intento viejo no lo mueve. Retención: retener_sms_dias.
// 3 · 61 remitentes en un minuto → el tope global (los que pasan no se contestan) y la alerta al equipo (Notificaciones › SMS y WhatsApp).
// 4 · Correo a Soporte por SES: firma mala o de otro tema → 401; spam → rechazado; sin cuenta → «sin cuenta»; el correo confirmado → caso TK- con origen correo y el
//     texto TAPADO; contestar con el número en el asunto → al mismo caso; el equipo responde → el correo con la respuesta; Soporte › Por correo. Retención:
//     retener_correo_entrante_dias.
// 5 · Verificar el correo con el enlace: un solo uso y solo el último que se pidió.
// 6 · El recibo de boletos con los botones de Wallet (a la página del boleto) cuando Wallet está disponible.
// 7 · Super Admin › Notificaciones › SMS y WhatsApp y Plantillas de WhatsApp (mandar a Meta → simulador → webhook firmado de Meta «aprobada») a 390 y 1360.
// Precondiciones propias: la base dice «pruebas», teléfonos 555 libres, los números de SMS y WhatsApp de To'Latino conectados, el equipo de prueba, el correo de
// cada persona puesto por la prueba. Lo que la prueba cambia vuelve a como estaba.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const c = require('crypto'), fs = require('fs'), http = require('http'), path = require('path');
const { entrarComo, telLibre } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT, S = ENT.S;
// El servidor cierra las conexiones quietas a los 5 s (keep-alive) y fetch puede reusar justo esa: «other side closed» antes de mandar. Se repite una vez.
const fetch0 = globalThis.fetch;
const fetch = async (u, o) => { try { return await fetch0(u, o); } catch (e) { if (/other side closed|ECONNRESET|socket/i.test(String(e?.cause?.message ?? e?.cause ?? e))) return fetch0(u, o); throw e; } };
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const RUN = Date.now().toString(36);
const ADM = '5705550199', TL_SMS = '+15705559001', TL_WA = '100200300400';
const TOK = ENT.TOK, env = ENT.env;
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${TOK}' ${B}/api/interno/barrido`).toString();
const interno = (body) => fetch(B + '/api/interno/avisos', { method: 'POST', headers: { 'content-type': 'application/json', 'x-barrido-token': TOK }, body: JSON.stringify(body) }).then((r) => r.json());
const ctxTel = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const ctxDesk = (b) => b.newContext({ viewport: { width: 1360, height: 900 } });
const shot = (p, nom) => p.screenshot({ path: OUT + `a9l-${nom}.png`, fullPage: true });
const llenar = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? String(v[k]) : `{${k}}`));
// Telnyx firma con Ed25519 (llave de prueba de la corrida); Meta con HMAC del secreto de la app (de la corrida).
const llaveTx = c.createPrivateKey(fs.readFileSync(S + '/telnyx-prueba.pem'));
const telnyx = async (cuerpo) => {
  const raw = JSON.stringify(cuerpo), ts = String(Math.floor(Date.now() / 1000)), sig = c.sign(null, Buffer.from(`${ts}|${raw}`), llaveTx).toString('base64');
  return (await fetch(B + '/api/compa/entrada/telnyx', { method: 'POST', headers: { 'content-type': 'application/json', 'telnyx-timestamp': ts, 'telnyx-signature-ed25519': sig }, body: raw })).status;
};
const meta = async (cuerpo) => {
  const raw = JSON.stringify(cuerpo), sig = 'sha256=' + c.createHmac('sha256', env.WHATSAPP_APP_SECRET).update(raw).digest('hex');
  return (await fetch(B + '/api/compa/entrada/whatsapp', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig }, body: raw })).status;
};
const smsEntra = (de, texto) => ({ data: { event_type: 'message.received', id: c.randomUUID(), occurred_at: new Date().toISOString(), record_type: 'event',
  payload: { id: c.randomUUID(), direction: 'inbound', from: { phone_number: `+1${de}` }, to: [{ phone_number: TL_SMS }], text: texto, type: 'SMS', received_at: new Date().toISOString(), media: [] } } });
// Una persona con cuenta (sin push, sin horas de silencio: el SMS sale a cualquier hora) en su idioma.
const persona = (lang) => {
  const t = telLibre();
  sql(`insert into users (phone, first_name, last_name, home_city_id, lang, is_test, phone_verified_at, notif_prefs) values ('+1${t}', 'Prueba', '9l', 'hzl', '${lang}', true, now(), '{\"quiet\": false}')`);
  return { t, id: sql(`select id from users where phone = '+1${t}'`) };
};
// Las plantillas nuevas de 9l (0142) y valores para cada variable.
const NUEVAS = ['cuenta_tel_cambio', 'rsv_hoy', 'ord_tarde', 'ord_entregado', 'sello_ok', 'sello_info', 'sello_no', 'ciudad_abierta', 'biz_resumen_semana', 'pro_d20', 'pro_ultimo', 'rec_negocio',
  'rec_publico', 'busqueda_hay', 'equipo_invitado', 'biz_quedan_pocos', 'biz_resena', 'foto_rep_quitada', 'foto_rep_queda', 'canal_tope', 'cuenta_codigo'];
const VARS = { ultimos: '0123', enlace: 'https://pruebas.tolatino.com/soporte', hora: '7:30 PM', negocio: 'Sabor Dominicano', num: '1042', motivo: 'falta la licencia', ciudad: 'Hazleton', vistas: 120, ops: 14,
  resenas: 3, quien: 'Marisol', que: 'barbería', rol: 'barbero', codigo: 'X7k2Lm9Q', n: 2, item: 'Flan de leche', estrellas: 5, tope: 60, min: 10 };

(async () => {
  // ── Precondiciones propias ──
  sql(`insert into platform_config (key, value, note, updated_by) values ('entorno', '\"pruebas\"'::jsonb, 'Sandbox (avi9l)', 'semilla') on conflict (key) do update set value = excluded.value`);
  const AU = sql(`select id from users where phone = '+1${ADM}'`);
  for (const [canal, prov, dir] of [['sms', 'telnyx', TL_SMS], ['whatsapp', 'whatsapp', TL_WA]])
    sql(`insert into compa_channel_numbers (channel, provider, address, business_id, city_id, reason, added_by) select '${canal}', '${prov}', '${dir}', null, 'hzl', 'avi9l', '${AU}'
         where not exists (select 1 from compa_channel_numbers where address = '${dir}' and status = 'active')`);
  const b = await chromium.launch();
  const abiertas = [];
  try {
    // ── 1 · Cada plantilla nueva, en español y en inglés ──
    console.log('1 · Cada plantilla nueva a un teléfono simulado, en español y en inglés (por el único camino de los SMS)');
    const es = persona('es'), en = persona('en');
    for (const [p, l] of [[es, 'es'], [en, 'en']]) {
      for (const k of NUEVAS) ok((await interno({ op: 'probar', tpl: k, tel: `+1${p.t}`, en: l === 'en', vars: VARS })).ok, `«${k}» → ···${p.t.slice(-4)} (${l})`);
      ok(await espera(() => sql(`select count(distinct tpl) from notifications where user_id = '${p.id}' and tpl = any('{${NUEVAS.join(',')}}')`) === String(NUEVAS.length)), `las ${NUEVAS.length} plantillas llegaron a su campana (${l})`);
      const malas = [];
      for (const k of NUEVAS) {
        const [tituloT, cuerpoT] = sql(`select (title->>'${l}') || '¦' || (body->>'${l}') from notif_templates where key = '${k}'`).split('¦');
        const [t, cuerpo, st] = sql(`select title || '¦' || body || '¦' || sms_status from notifications where user_id = '${p.id}' and tpl = '${k}' order by id desc limit 1`).split('¦');
        if (t !== llenar(tituloT, VARS).slice(0, 120) || cuerpo !== llenar(cuerpoT, VARS).slice(0, 480)) malas.push(`${k}: «${cuerpo}»`);
        const conSms = sql(`select sms_mode <> 'nunca' from notif_templates where key = '${k}'`) === 't';
        if (conSms !== (st === 'pruebas')) malas.push(`${k}: SMS ${st}`);
      }
      ok(!malas.length, `cada aviso dice su título y su texto en ${l === 'es' ? 'español' : 'inglés'} con sus datos, y lleva SMS solo si la plantilla lo lleva${malas.length ? ' — ' + malas.slice(0, 3).join(' · ') : ''}`);
      const conSms = Number(sql(`select count(*) from notif_templates where key = any('{${NUEVAS.join(',')}}') and sms_mode <> 'nunca'`));
      ok(await espera(() => sql(`select count(*) from notifications n join sms_outbox s on s.id = n.sms_id where n.user_id = '${p.id}' and s.status = 'entregado' and s.provider = 'sim' and s.origin_kind = 'aviso'`) === String(conSms)),
        `los ${conSms} SMS salieron por el único camino y el simulador los entregó (sms_outbox · entregado)`);
    }
    ok(sql(`select count(*) from sms_outbox where body_enc is not null and position('Sabor' in encode(body_enc, 'escape')) > 0`) === '0', 'el texto del SMS se guarda cifrado (nunca en claro)');
    // El código para entrar: su plantilla editable, por el mismo camino.
    const nuevo = telLibre();
    const dk = await ctxDesk(b); abiertas.push(dk); const pd = await dk.newPage();
    await entrarComo(pd, nuevo, { nombre: 'Código', apellido: '9l' });
    ok(await espera(() => sql(`select count(*) from sms_outbox where origin_kind = 'codigo' and to_last4 = '${nuevo.slice(-4)}' and status = 'entregado' and tpl = 'cuenta_codigo' and expires_at > now() and created_at > now() - interval '2 minutes'`) !== '0'),
      'el código para entrar sale por el único camino (plantilla cuenta_codigo, vence con el código) y el simulador lo entrega');

    // ── 2 · Un SMS que falla → reintento → entregado ──
    console.log('2 · Un SMS que falla se reintenta con su espera y llega; lo inválido no se reintenta; el aviso firmado de Telnyx');
    for (const m of ['0911', '0912', '0913']) ok(sql(`select count(*) from users where phone = '+1570555${m}'`) === '0', `570-555-${m} es un número mágico del simulador sin cuenta`);
    const ultimoSms = (m) => sql(`select s.id || '|' || s.status || '|' || s.attempts from sms_outbox s where s.to_last4 = '${m}' and s.origin_kind = 'telefono' order by s.id desc limit 1`).split('|');
    await interno({ op: 'probar', tpl: 'cuenta_tel_cambio', tel: '+15705550911', vars: VARS }); // crítica: sale a cualquier hora
    let [id1, st1, at1] = ultimoSms('0911');
    ok(st1 === 'reintento' && at1 === '1', `0911: el operador no lo entregó → «reintento» con 1 intento (${st1}, ${at1})`);
    ok(sql(`select final || '|' || final_code from sms_attempts where sms_id = ${id1} and n = 1`) === 'fallo|sim_temporal', 'el intento 1 quedó anotado: falló (temporal)');
    ok(sql(`select (next_at > now() + interval '1 minute')::text from sms_outbox where id = ${id1}`) === 'true', 'el reintento espera (sms_reintento_min), no sale enseguida');
    barrer(); ok(ultimoSms('0911')[1] === 'reintento', 'el barrido no lo manda antes de su hora');
    sql(`set session_replication_role = replica; update sms_outbox set next_at = now() - interval '1 second' where id = ${id1}`);
    barrer();
    ok(await espera(() => ultimoSms('0911')[1] === 'entregado'), 'llegó su hora: el barrido lo reintenta y el simulador lo ENTREGA');
    ok(ultimoSms('0911')[2] === '2' && sql(`select count(*) from sms_attempts where sms_id = ${id1}`) === '2', 'con 2 intentos, cada uno anotado');
    ok(sql(`select sms_status from phone_messages where sms_id = ${id1}`) === 'pruebas', 'el SMS a un número sin cuenta sigue diciendo «en modo pruebas» (en el sandbox nada sale a un teléfono de verdad)');
    await interno({ op: 'probar', tpl: 'cuenta_tel_cambio', tel: '+15705550912', vars: VARS });
    const [, st2, at2] = ultimoSms('0912');
    ok(st2 === 'fallo' && at2 === '1', `0912 (inválido): falla SIN reintento (${st2}, ${at2} intento)`);
    await interno({ op: 'probar', tpl: 'cuenta_tel_cambio', tel: '+15705550913', vars: VARS });
    const [id3, st3] = ultimoSms('0913');
    ok(st3 === 'reintento' && sql(`select accepted::text || '|' || coalesce(error_code, '') from sms_attempts where sms_id = ${id3} and n = 1`) === 'false|sim_503', '0913: el proveedor no contestó → reintento (el intento quedó como no aceptado)');
    sql(`set session_replication_role = replica; update sms_outbox set next_at = now() - interval '1 second' where id = ${id3}`); barrer();
    ok(await espera(() => ultimoSms('0913')[1] === 'entregado'), '0913: al reintento llega');
    // El aviso de entrega de Telnyx, firmado: un SMS que salió por «Telnyx» (en el sandbox se arma aquí) queda entregado una vez; el de un intento viejo no lo mueve.
    const pid1 = `tx-${RUN}-1`, pid2 = `tx-${RUN}-2`;
    const sid = sql(`set session_replication_role = replica; insert into sms_outbox (to_hash, to_last4, origin_kind, chars, provider, status, attempts, max_attempts, is_test, sent_at)
                     values (encode(sha256('avi9l-${RUN}'::bytea), 'hex'), '4321', 'prueba', 10, 'telnyx', 'enviado', 2, 3, true, now()) returning id`).split('\n').find((x) => /^\d+$/.test(x));
    sql(`set session_replication_role = replica; insert into sms_attempts (sms_id, n, provider, provider_msg_id, accepted) values (${sid}, 1, 'telnyx', '${pid1}', true), (${sid}, 2, 'telnyx', '${pid2}', true)`);
    const fin = (id, st) => ({ data: { event_type: 'message.finalized', id: c.randomUUID(), occurred_at: new Date().toISOString(), record_type: 'event', payload: { id, to: [{ phone_number: '+15705554321', status: st }], errors: st === 'delivered' ? [] : [{ code: '40002', title: 'x' }] } } });
    ok(await telnyx(fin(pid1, 'delivery_failed')) === 200 && sql(`select status from sms_outbox where id = ${sid}`) === 'enviado', 'el aviso firmado de un intento VIEJO que falló no mueve el SMS');
    ok(await telnyx(fin(pid2, 'delivered')) === 200 && sql(`select status || '|' || (delivered_at is not null) from sms_outbox where id = ${sid}`) === 'entregado|true', 'message.finalized firmado (delivered) del último intento → entregado');
    ok(await telnyx(fin(pid2, 'delivery_failed')) === 200 && sql(`select status from sms_outbox where id = ${sid}`) === 'entregado', 'el mismo aviso otra vez (falló) no cambia nada: el resultado llega una vez');
    const sinFirma = await fetch(B + '/api/compa/entrada/telnyx', { method: 'POST', headers: { 'content-type': 'application/json', 'telnyx-timestamp': String(Math.floor(Date.now() / 1000)) }, body: JSON.stringify(fin(pid2, 'delivered')) });
    ok(sinFirma.status === 401, 'un aviso de entrega sin firma → 401');
    // Retención: retener_sms_dias (90). El reloj se mueve: un SMS de hace 91 días queda sin teléfono ni texto; el de hoy no se toca.
    sql(`set session_replication_role = replica; update sms_outbox set created_at = now() - interval '91 days' where id = ${id1}`);
    barrer();
    ok(await espera(() => sql(`select (to_enc is null and body_enc is null and purged_at is not null)::text || '|' || status from sms_outbox where id = ${id1}`) === 'true|entregado'), 'retener_sms_dias (90): el SMS de hace 91 días queda sin teléfono ni texto (con su estado)');
    ok(sql(`select (to_enc is not null)::text from sms_outbox where id = ${id3}`) === 'true', 'el de hoy no se toca');
    sql(`set session_replication_role = replica; update phone_messages set created_at = now() - interval '91 days' where sms_id = ${id3}`); barrer();
    ok(await espera(() => sql(`select (phone_enc is null and body is null)::text from phone_messages where sms_id = ${id3}`) === 'true'), 'retener_sms_dias: el SMS a un número sin cuenta de hace 91 días también se vacía');

    // ── 3 · 61 remitentes en un minuto → tope y alerta ──
    console.log('3 · 61 números distintos en un minuto → el tope global (no se contestan) y la alerta al equipo');
    const tope = Number(sql(`select cfg_int('canal_remitentes_min')`));
    ok(tope === 60, `el tope de fábrica: ${tope} números por minuto`);
    const usados = new Set(), ids = [];
    for (let i = 0; i < 61; i++) {
      let t; do { t = '570555' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); } while (usados.has(t) || ['0911', '0912', '0913'].includes(t.slice(-4)));
      usados.add(t);
      const cu = smsEntra(t, `hola ${RUN} ${i}`); ids.push(cu.data.payload.id);
      if ((await telnyx(cu)) !== 200) throw new Error('ASSERT el SMS firmado no entró');
    }
    ok(true, '61 SMS firmados de 61 números distintos → 200 cada uno');
    const lista = `'${ids.join("','")}'`;
    ok(await espera(() => sql(`select count(*) from compa_inbound where provider_msg_id in (${lista}) and estado = 'hecho'`) === '61', 30000), 'los 61 se procesaron');
    const capados = Number(sql(`select count(*) from compa_inbound where provider_msg_id in (${lista}) and result = 'tope_global'`));
    ok(capados >= 1, `a los que pasaron el tope no se les contestó (${capados} con «tope_global»)`);
    ok(sql(`select count(*) from compa_outbound o join compa_inbound i on i.id = o.inbound_id where i.provider_msg_id in (${lista}) and i.result = 'tope_global'`) === '0', 'ni una salida para los del tope');
    ok(sql(`select count(*) from canal_alertas where kind = 'remitentes' and bucket >= to_timestamp(floor(extract(epoch from now()) / 600) * 600) - interval '10 minutes'`) !== '0', 'la alerta quedó anotada (una por ventana de 10 minutos)');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${AU}' and tpl = 'canal_tope' and created_at > now() - interval '20 minutes'`) !== '0'), 'el equipo (Admin) recibió «Muchos números escriben a la vez»');

    // ── 4 · Correo a Soporte por SES ──
    console.log('4 · Correo a Soporte: solo lo firmado y aprobado; caso TK- tapado; la respuesta por correo');
    const tema = env.CORREO_SNS_TEMA || 'arn:aws:sns:us-east-1:000000000000:tolatino-soporte-pruebas';
    const pki = path.join(S, 'ses9l'); fs.mkdirSync(pki, { recursive: true });
    if (!fs.existsSync(pki + '/cert.pem')) execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${pki}/key.pem -out ${pki}/cert.pem -days 30 -subj /CN=sns.us-east-1.amazonaws.com`, { stdio: 'ignore' });
    const llaveSns = c.createPrivateKey(fs.readFileSync(pki + '/key.pem')), certPem = fs.readFileSync(pki + '/cert.pem');
    const srv = http.createServer((q, r) => { r.setHeader('content-type', 'application/x-pem-file'); r.end(certPem); });
    await new Promise((r) => srv.listen(4409, '127.0.0.1', r));
    abiertas.push({ close: () => new Promise((r) => srv.close(r)) });
    const CERT = 'http://127.0.0.1:4409/SimpleNotificationService-prueba.pem';
    const cadena = (m) => ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'].filter((k) => m[k] != null).map((k) => `${k}\n${m[k]}\n`).join('');
    const sns = (aviso, o = {}) => {
      const m = { Type: 'Notification', MessageId: c.randomUUID(), TopicArn: o.tema ?? tema, Subject: 'Amazon SES Email Receipt Notification', Message: JSON.stringify(aviso), Timestamp: new Date().toISOString(), SignatureVersion: '2', SigningCertURL: CERT };
      m.Signature = c.sign('sha256', Buffer.from(cadena(m)), llaveSns).toString('base64');
      if (o.tocar) m.Message = m.Message.replace('Hola', 'Hola!');
      return m;
    };
    const correo = (de, asunto, cuerpo, v = {}) => ({ notificationType: 'Received', mail: { messageId: `ses-${RUN}-${c.randomBytes(5).toString('hex')}`, source: de, commonHeaders: { from: [`Persona <${de}>`], subject: asunto } },
      receipt: { spfVerdict: { status: v.spf ?? 'PASS' }, dkimVerdict: { status: v.dkim ?? 'PASS' }, spamVerdict: { status: v.spam ?? 'PASS' }, virusVerdict: { status: 'PASS' } },
      content: `From: Persona <${de}>\r\nSubject: ${asunto}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary="b9l"\r\n\r\n--b9l\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n${cuerpo}\r\n\r\nEl lun., 10 nov. Soporte escribi=C3=B3:\r\n> texto viejo citado\r\n--b9l\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<p>${cuerpo}</p>\r\n--b9l--\r\n` });
    const entrar = async (m) => { const r = await fetch(B + '/api/correo/entrada', { method: 'POST', headers: { 'content-type': 'text/plain; charset=UTF-8' }, body: JSON.stringify(m) }); return { s: r.status, j: r.status === 200 ? await r.json() : null }; };
    const vecina = persona('es'), mail = `vecina-${RUN}@prueba9l.tolatino.invalid`;
    sql(`update users set email = '${mail}', email_verified = true where id = '${vecina.id}'`);
    let r = await entrar(sns(correo(mail, 'No puedo entrar', 'Hola, no puedo entrar a mi cuenta.'), { tocar: true }));
    ok(r.s === 401, 'el mensaje cambiado después de firmar → 401 (nada se guarda)');
    r = await entrar(sns(correo(mail, 'No puedo entrar', 'Hola, no puedo entrar a mi cuenta.'), { tema: 'arn:aws:sns:us-east-1:111111111111:otro-tema' }));
    ok(r.s === 401, 'firmado por Amazon pero de OTRO tema → 401 (solo el nuestro)');
    const antes = Number(sql(`select count(*) from support_email_in`));
    r = await entrar(sns(correo(mail, 'Oferta', 'Hola, gana dinero ya mismo con esto.', { spam: 'FAIL' })));
    ok(r.s === 200 && r.j.estado === 'rechazado' && sql(`select status || '|' || reason from support_email_in order by id desc limit 1`) === 'rechazado|spam', 'SES dijo spam → «rechazado», sin caso');
    r = await entrar(sns(correo(`nadie-${RUN}@prueba9l.tolatino.invalid`, 'Ayuda', 'Hola, quiero saber de mi pedido de ayer.')));
    ok(r.j.estado === 'sin_cuenta' && sql(`select count(*) from email_outbox where tpl = 'support_ack' and to_email = 'nadie-${RUN}@prueba9l.tolatino.invalid'`) === '1', 'un correo sin cuenta confirmada → «sin cuenta» y la respuesta que dice cómo escribirnos');
    const aviso = correo(mail, 'No puedo entrar', 'Hola, no puedo entrar a mi cuenta. Mi tarjeta es 4111 1111 1111 1111.');
    r = await entrar(sns(aviso));
    ok(r.j.estado === 'caso' && /^TK-\d+$/.test(r.j.numero ?? ''), `el correo confirmado de la vecina → caso ${r.j.numero}`);
    const TK = r.j.numero;
    ok(sql(`select origin || '|' || user_id from support_cases where number = '${TK}'`) === `correo|${vecina.id}`, 'el caso es suyo, con origen «correo»');
    const cuerpoCaso = sql(`select body from support_messages where case_id = (select id from support_cases where number = '${TK}') and sender = 'user' order by id limit 1`);
    ok(!/4111/.test(cuerpoCaso) && /no puedo entrar/i.test(cuerpoCaso) && !/texto viejo citado/.test(cuerpoCaso), 'el texto entró TAPADO (sin la tarjeta) y sin lo citado de correos anteriores');
    ok(sql(`select count(*) from support_email_in where body like '%4111%' or subject like '%4111%'`) === '0', 'ni en el registro del correo queda la tarjeta');
    ok(sql(`select count(*) from email_outbox where tpl = 'support_ack' and ref_id = '${TK}'`) === '1' && sql(`select count(*) from notifications where tpl = 'sop_recibido' and ref_id = '${TK}'`) === '1', 'el acuse por correo y el aviso «lo recibimos»');
    r = await entrar(sns({ ...aviso }));
    ok(r.j.estado === 'repetido' && Number(sql(`select count(*) from support_email_in`)) === antes + 3, 'el mismo correo otra vez → no abre otro caso (una vez)');
    r = await entrar(sns(correo(mail, `Re: tu caso ${TK}`, 'Gracias, ahora me sale otro error.')));
    ok(r.j.estado === 'mensaje' && r.j.numero === TK && sql(`select count(*) from support_messages where case_id = (select id from support_cases where number = '${TK}') and sender = 'user'`) === '2', 'contestar con el número en el asunto → al MISMO caso');
    // El equipo responde: la respuesta le llega por correo (el caso entró por correo: con el texto).
    const ad = await ctxDesk(b); abiertas.push(ad); const pa = await ad.newPage();
    await entrarComo(pa, ADM, { nombre: 'Ana', apellido: 'Admin' });
    await pa.goto(B + `/admin/soporte?caso=${TK}`); await pa.waitForSelector(`[data-tk-abierto="${TK}"]`);
    ok((await texto(pa)).includes('Correo a Soporte'), 'la ficha dice el canal: «Correo a Soporte»');
    await pa.locator('textarea').first().fill(`Hola, ya revisamos tu cuenta ${RUN}: entra con tu teléfono de nuevo.`);
    await pa.getByRole('button', { name: 'Enviar' }).click();
    ok(await espera(() => sql(`select count(*) from email_outbox where tpl = 'support_reply' and ref_id = '${TK}' and html like '%ya revisamos tu cuenta ${RUN}%'`) === '1'), 'la respuesta del equipo le llega por correo, con el texto (el caso entró por correo)');
    ok(sql(`select channel || '|' || status from support_replies_out where case_id = (select id from support_cases where number = '${TK}')`) === 'correo|pruebas', 'la salida quedó anotada (correo · en modo pruebas)');
    await shot(pa, 'soporte-caso-correo-1360');
    await pa.goto(B + '/admin/soporte?tab=correo');
    const ts = await texto(pa);
    ok(ts.includes('Por correo') && ts.includes('CASO NUEVO') && ts.includes('RECHAZADO') && ts.includes('SIN CUENTA CONFIRMADA') && ts.includes('@prueba9l.tolatino.invalid') && !ts.includes(mail), 'Soporte › Por correo: los que entraron con su estado, el dominio y nunca la dirección');
    await shot(pa, 'soporte-por-correo-1360');
    const pt = await (await ctxTel(b)).newPage(); abiertas.push(pt.context());
    await entrarComo(pt, ADM, { nombre: 'Ana', apellido: 'Admin' }); await pt.goto(B + '/admin/soporte?tab=correo'); await pt.getByText('Por correo').first().waitFor();
    await shot(pt, 'soporte-por-correo-390');
    // Retención: retener_correo_entrante_dias (365).
    const eid = sql(`select id from support_email_in where case_id = (select id from support_cases where number = '${TK}') order by id limit 1`);
    sql(`set session_replication_role = replica; update support_email_in set received_at = now() - interval '366 days' where id = ${eid}`); barrer();
    ok(await espera(() => sql(`select (body is null and from_enc is null and subject is null and purged_at is not null)::text || '|' || status from support_email_in where id = ${eid}`) === 'true|caso'), 'retener_correo_entrante_dias (365): el correo de hace 366 días queda sin texto, asunto ni remitente (el caso sigue)');

    // ── 5 · Verificar el correo con el enlace: un uso, el último ──
    console.log('5 · Verificar el correo: el enlace es de un uso y el nuevo anula el anterior');
    const v9 = telLibre();
    const pv = await (await ctxTel(b)).newPage(); abiertas.push(pv.context());
    await entrarComo(pv, v9, { nombre: 'Verónica', apellido: 'Correo' });
    const vid = sql(`select id from users where phone = '+1${v9}'`);
    sql(`update users set email = 'vero-${RUN}@prueba9l.tolatino.invalid', email_verified = false where id = '${vid}'`);
    const enlace = () => (sql(`select html from email_outbox where user_id = '${vid}' and tpl = 'verify' order by id desc limit 1`).match(/\/cuenta\/correo\?t=([A-Za-z0-9_-]+)/) ?? [])[1];
    await pv.goto(B + '/cuenta/perfil'); await pv.getByText('Mandar el enlace', { exact: true }).click();
    ok(await espera(() => !!enlace()), 'el correo «Confirma tu correo» quedó en la bandeja con su enlace');
    const t1 = enlace();
    await pv.goto(B + '/cuenta/perfil'); await pv.getByText('Mandar el enlace', { exact: true }).click();
    ok(await espera(() => enlace() && enlace() !== t1), 'pidió otro: un enlace nuevo');
    const t2 = enlace();
    await pv.goto(B + `/cuenta/correo?t=${t1}`);
    ok(/pediste otro después/.test(await texto(pv)) && sql(`select email_verified::text from users where id = '${vid}'`) === 'false', 'el enlace VIEJO ya no sirve (el nuevo lo anuló)');
    await pv.goto(B + `/cuenta/correo?t=${t2}`);
    ok(await espera(() => sql(`select email_verified::text from users where id = '${vid}'`) === 'true'), 'el último enlace confirma el correo');
    await shot(pv, 'correo-confirmado-390');
    await pv.goto(B + `/cuenta/correo?t=${t2}`);
    ok(/ya se usó/.test(await texto(pv)), 'el mismo enlace otra vez → «ya se usó» (un solo uso)');
    // La baja de un toque de las campañas (List-Unsubscribe, RFC 8058): el enlace firmado apaga «Novedades»; uno con otra firma no hace nada; abrirlo (GET) no da de baja.
    sql(`update users set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || '{\"mkt\": true, \"mkt_push\": true}'::jsonb where id = '${vid}'`);
    sql(`insert into email_outbox (user_id, city_id, to_email, tpl, subject, html, text_body, status) values ('${vid}', 'hzl', 'vero-${RUN}@prueba9l.tolatino.invalid', 'campaign', 'Novedades', '<p>x</p>', 'x', 'pruebas')`);
    const firma = c.createHmac('sha256', env.AUTH_SECRET).update(`baja:mkt:${vid}`).digest('base64url').slice(0, 32);
    const g = await fetch(`${B}/api/correo/baja?u=${vid}&f=${firma}`, { redirect: 'manual' });
    ok(g.status === 303 && /\/cuenta\/avisos$/.test(g.headers.get('location') ?? '') && sql(`select notif_prefs->>'mkt' from users where id = '${vid}'`) === 'true', 'abrir el enlace (GET, como un antivirus) no da de baja: lleva a Mi cuenta › Avisos');
    ok((await fetch(`${B}/api/correo/baja?u=${vid}&f=${'A'.repeat(32)}`, { method: 'POST', body: 'List-Unsubscribe=One-Click' })).status === 404 && sql(`select notif_prefs->>'mkt' from users where id = '${vid}'`) === 'true', 'con otra firma → 404, nada cambia');
    ok((await fetch(`${B}/api/correo/baja?u=${vid}&f=${firma}`, { method: 'POST', body: 'List-Unsubscribe=One-Click' })).status === 200, 'la baja de un toque (POST firmado) → 200');
    ok(sql(`select (notif_prefs->>'mkt') || '|' || (notif_prefs->>'mkt_push') from users where id = '${vid}'`) === 'false|false' && sql(`select via from email_unsubscribes where user_id = '${vid}' order by id desc limit 1`) === 'un_toque', '«Novedades» y su push quedan apagados y la baja anotada');
    // pushsubscriptionchange: el service worker avisa a /api/push/renovar con la sesión; la suscripción nueva queda y la vieja se suelta.
    const b64 = (x) => Buffer.from(x).toString('base64url');
    const sub = (k) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/avi9l-${RUN}-${k}`, p256dh: b64(Buffer.concat([Buffer.from([4]), c.randomBytes(64)])), auth: b64(c.randomBytes(16)) });
    const s1 = sub('vieja'), s2 = sub('nueva');
    const renovar = (x) => pv.evaluate(async (x) => (await fetch('/api/push/renovar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(x) })).status, x);
    ok(await renovar({ viejo: null, ...s1 }) === 200 && sql(`select count(*) from push_tokens where user_id = '${vid}' and provider = 'webpush' and revoked_at is null`) === '1', 'la suscripción del navegador queda registrada (con la sesión)');
    ok(await renovar({ viejo: s1.endpoint, ...s2 }) === 200 && sql(`select count(*) from push_tokens where user_id = '${vid}' and provider = 'webpush' and revoked_at is null`) === '1'
      && sql(`select count(*) from push_tokens where user_id = '${vid}' and provider = 'webpush' and revoked_reason = 'reemplazado'`) === '1', 'pushsubscriptionchange: la nueva queda y la vieja se suelta («reemplazado»)');
    ok((await fetch(B + '/api/push/renovar', { method: 'POST', headers: { 'content-type': 'application/json', origin: B }, body: JSON.stringify({ viejo: null, ...sub('sin') }) })).status === 401, 'sin sesión → 401');
    ok(await renovar({ viejo: null, endpoint: 'https://ejemplo.invalid/push/x', p256dh: s2.p256dh, auth: s2.auth }) === 400, 'a una dirección que no es de un servicio de push conocido → no');
    // «Tu cuenta se borró» al número de antes, cuando la purga de los 30 días termina.
    const bo = telLibre();
    sql(`insert into users (phone, first_name, last_name, home_city_id, lang, is_test, phone_verified_at) values ('+1${bo}', 'Borra', '9l', 'hzl', 'es', true, now())`);
    const boId = sql(`select id from users where phone = '+1${bo}'`);
    sql(`update users set delete_at = now() - interval '1 minute', delete_reason = 'priv' where id = '${boId}'`);
    barrer();
    ok(await espera(() => sql(`select coalesce((select ok::text from purge_runs where user_id = '${boId}' order by id desc limit 1), '')`) === 'true', 30000), 'la purga de la cuenta terminó');
    ok(await espera(() => sql(`select count(*) from phone_messages where tpl = 'cuenta_borrada' and ref_id = '${boId}' and sms_status = 'pruebas' and sms_id is not null`) === '1'), '«Tu cuenta se borró» salió UNA vez al número de antes (cifrado, por el único camino)');

    // ── 6 · El recibo de boletos con los botones de Wallet ──
    console.log('6 · El recibo de la compra con los botones de Wallet, a la página del boleto');
    const orden = sql(`select o.id || '|' || o.user_id || '|' || t.code from operations o join payments p on p.operation_id = o.id and p.kind = 'full' and p.status = 'captured'
                        join tickets t on t.operation_id = o.id and t.holder_user_id = o.user_id join event_dates d on d.id = t.event_date_id join events e on e.id = t.event_id
                       where o.kind = 'tickets' and d.status = 'scheduled' and d.ends_at > now() + interval '1 day' and e.status not in ('cancelled', 'rejected') and bol_vigente(t.id) order by o.id limit 1`);
    ok(!!orden, 'hay una orden de boletos pagada con un boleto vivo');
    const [opId, holder, code] = orden.split('|');
    const antesU = sql(`select coalesce(email::text, '') || '|' || coalesce(email_verified, false) || '|' || coalesce(notif_prefs->>'mailR', '') from users where id = '${holder}'`);
    const puestas = [];
    const flags0 = sql(`select string_agg(key || '=' || enabled, ',') from feature_flags where key in ('app.wallet.apple', 'app.wallet.google')`);
    try {
      sql(`update users set email = 'boletos-${RUN}@prueba9l.tolatino.invalid', email_verified = true where id = '${holder}'`);
      // Wallet disponible: el interruptor y las credenciales (si la corrida no tiene las de wal8g, unas de la prueba que se retiran al final).
      for (const [kind, meta2] of [['pass_type_cert', '{\"pass_type_id\":\"pass.com.tolatino.boletos\",\"equipo\":\"TL12345678\"}'], ['google_wallet_sa', '{\"emisor\":\"3388000000000000000\"}']]) {
        if (sql(`select count(*) from store_secrets where kind = '${kind}' and retired_at is null`) !== '0') continue;
        puestas.push(sql(`insert into store_secrets (kind, version, blob_enc, meta, fingerprint, size_bytes, uploaded_by, uploaded_at) values ('${kind}', (select coalesce(max(version), 0) + 1 from store_secrets where kind = '${kind}'),
                           decode(repeat('00', 64), 'hex'), '${meta2}'::jsonb, encode(sha256('prueba-avi9l-${kind}'::bytea), 'hex'), 64, '${AU}', now()) returning id`).split('\n').find((x) => /^\d+$/.test(x)));
      }
      sql(`update feature_flags set enabled = true where key in ('app.wallet.apple', 'app.wallet.google')`);
      await new Promise((r) => setTimeout(r, 16000)); // los interruptores de Wallet se leen con 15 s de caché
      const rb = await interno({ op: 'recibo_boletos', op_id: opId });
      ok(rb.ok && /data-wallet-correo/.test(rb.html) && (rb.html.match(/data-wallet-correo/g) ?? []).length === 2, 'el recibo trae los dos botones de Wallet');
      ok(rb.html.includes(`/cuenta/boletos/${code}`) && /Agregar a Apple Wallet|Add to Apple Wallet/.test(rb.html) && /Agregar a Google Wallet|Add to Google Wallet/.test(rb.html), `enlazados a la página del boleto (${code}), donde se agrega el pase con la sesión`);
      ok(/Apple Wallet: .*\/cuenta\/boletos\//.test(rb.text), 'y en la versión de texto del correo');
      fs.writeFileSync(OUT + 'a9l-recibo-wallet.html', rb.html);
      const pr = await (await ctxTel(b)).newPage(); abiertas.push(pr.context()); await pr.setContent(rb.html); await shot(pr, 'recibo-wallet-390');
      for (const f of flags0.split(',')) { const [k, v] = f.split('='); sql(`update feature_flags set enabled = ${v === 'true'} where key = '${k}'`); }
      sql(`update feature_flags set enabled = false where key in ('app.wallet.apple', 'app.wallet.google')`);
      await new Promise((r) => setTimeout(r, 16000));
      const rs = await interno({ op: 'recibo_boletos', op_id: opId });
      ok(rs.ok && !/data-wallet-correo/.test(rs.html), 'con Wallet apagado, el recibo no promete los botones');
    } finally {
      for (const f of flags0.split(',')) { const [k, v] = f.split('='); sql(`update feature_flags set enabled = ${v === 'true'} where key = '${k}'`); }
      for (const id of puestas) sql(`update store_secrets set retired_at = now(), retired_by = '${AU}', retired_reason = 'prueba avi9l' where id = ${id}`);
      const [e0, v0, m0] = antesU.split('|');
      sql(`update users set email = ${e0 ? `'${e0}'` : 'null'}, email_verified = ${v0 === 'true'} where id = '${holder}'`); void m0;
    }

    // ── 7 · Super Admin › Notificaciones › SMS y WhatsApp · Plantillas de WhatsApp ──
    console.log('7 · Notificaciones: la entrega del SMS y de WhatsApp, y las plantillas de WhatsApp con su estado en Meta');
    await pa.goto(B + '/admin/notificaciones?tab=canales');
    let t = await texto(pa);
    ok(t.includes('SMS y WhatsApp') && t.includes('ENTREGADOS') && t.includes('EN REINTENTO') && t.includes('TOPE GLOBAL DE REMITENTES') && t.includes('números en un minuto'), 'SMS y WhatsApp: la entrega de cada SMS, el tope y su alerta');
    ok(t.includes('···0911') && !t.includes('+15705550911') && !t.includes('(570) 555-0911'), 'cada SMS sin el teléfono: solo los últimos 4');
    await shot(pa, 'notif-canales-1360');
    await pt.goto(B + '/admin/notificaciones?tab=canales'); await pt.getByText('TOPE GLOBAL DE REMITENTES').waitFor(); await shot(pt, 'notif-canales-390');
    // Una plantilla: borrador → «Mandar a Meta» (simulador del sandbox) → Meta la aprueba por su webhook firmado.
    const tid = sql(`select id from wa_templates where name = 'tl_cita' and language = 'en_US'`);
    sql(`set session_replication_role = replica; update wa_templates set status = 'borrador', meta_id = null, reason = null, submitted_at = null, decided_at = null where id = ${tid}`);
    await pa.goto(B + '/admin/notificaciones?tab=wa');
    t = await texto(pa);
    ok(t.includes('Plantillas de WhatsApp') && t.includes('tl_codigo') && t.includes('tl_soporte') && t.includes('BORRADOR'), 'Plantillas de WhatsApp: las ocho (código, boletos, cita, soporte · ES y EN) con su estado');
    await shot(pa, 'notif-wa-1360');
    // La lista va por uso (código, boletos, cita, soporte) y luego idioma (en_US antes que es): el botón de tl_cita · EN es el que tiene ese lugar entre las que se
    // pueden mandar (borrador o rechazada).
    const lugar = Number(sql(`select count(*) from wa_templates where status in ('borrador', 'rechazada') and (array_position(array['codigo', 'boletos', 'cita', 'soporte'], purpose), language) < (3, 'en_US')`));
    await pa.getByRole('button', { name: 'Mandar a Meta' }).nth(lugar).click();
    ok((await texto(pa)).includes('Mandar tl_cita (en_US) a Meta'), 'la confirmación nombra la plantilla y pide el motivo');
    await pa.locator('textarea').last().fill(`Lista para Meta (avi9l ${RUN})`);
    await pa.getByRole('button', { name: 'Mandar' }).click();
    ok(await espera(() => sql(`select status from wa_templates where id = ${tid}`) === 'enviada'), 'Mandar a Meta → «en revisión en Meta» (simulador del sandbox), con motivo y auditoría');
    ok(sql(`select count(*) from audit_entries where action = 'notificaciones.whatsapp_plantilla' and target_id = '${tid}' and reason like '%avi9l ${RUN}%'`) === '1', 'quedó en la auditoría');
    const metaOk = { object: 'whatsapp_business_account', entry: [{ id: 'WABA', changes: [{ field: 'message_template_status_update', value: { event: 'APPROVED', message_template_id: 777, message_template_name: 'tl_cita', message_template_language: 'en_US', reason: 'NONE' } }] }] };
    ok(await meta(metaOk) === 200 && await espera(() => sql(`select status || '|' || meta_id from wa_templates where id = ${tid}`) === 'aprobada|777'), 'el webhook firmado de Meta (APPROVED) la deja «aprobada» con su id');
    ok(sql(`select via from wa_template_events where template_id = ${tid} order by id desc limit 1`) === 'meta', 'su historial dice que la respuesta vino de Meta');
    const metaMalo = JSON.stringify({ ...metaOk, entry: [{ changes: [{ field: 'message_template_status_update', value: { event: 'REJECTED', message_template_name: 'tl_cita', message_template_language: 'en_US' } }] }] });
    ok((await fetch(B + '/api/compa/entrada/whatsapp', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) }, body: metaMalo })).status === 401 && sql(`select status from wa_templates where id = ${tid}`) === 'aprobada', 'un aviso de Meta sin la firma buena → 401, la plantilla no cambia');
    await pt.goto(B + '/admin/notificaciones?tab=wa'); await pt.getByText('tl_cita').first().waitFor(); await shot(pt, 'notif-wa-390');
    await pa.goto(B + '/admin/notificaciones?tab=wa'); await pa.getByText('Español', { exact: true }).click();
    await pa.getByText('English', { exact: true }).click(); await pa.getByText('WhatsApp templates').first().waitFor();
    ok((await texto(pa)).includes('APPROVED'), 'en inglés: «WhatsApp templates» y «APPROVED»');
    await shot(pa, 'notif-wa-en-1360');
    await pa.getByText('Español', { exact: true }).click();
  } finally {
    for (const x of abiertas) await x.close().catch(() => undefined);
    await b.close();
  }
  console.log(`\n${n} ✓ · avi9l`);
})().catch((e) => { console.error(e); process.exit(1); });
