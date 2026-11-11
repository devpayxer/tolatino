/* Contrato del push propio (8c, fase8-apps.md §3.3): el código REAL de lib/push/webpush.ts, apns.ts y fcm.ts (compilado aparte) contra:
   · Web Push: el vector de prueba del RFC 8291 (Apéndice A) byte por byte; una implementación independiente (http_ece, MIT, de web-push-libs)
     descifra lo que ciframos; VAPID (RFC 8292): «vapid t=…, k=…», JWT ES256 con aud = origen, exp ≤ 24 h y sub https/mailto, firma verificada;
     las cabeceras TTL / Urgency / Topic / Content-Encoding; qué hacemos con 201, 404, 410, 413, 429 y 5xx; y que solo se le escribe a un servicio
     de push conocido (SSRF).
   · APNs: scripts/contrato-push/apns.json (tablas sacadas de la documentación de Apple, con su sha256): cabeceras obligatorias, :path, tipos y
     prioridades válidos, tope del collapse-id y del cuerpo, interruption-level (nunca «critical»), JWT ES256 con kid / iss / iat verificado, y
     cada motivo de error de la tabla → invalido (no se reintenta) / limite / error / rechazado.
   · FCM v1: el documento de descubrimiento OFICIAL (googleapis, fijado a un commit): el cuerpo cumple SendMessageRequest → Message (tipos,
     enumerados, sin campos de más), el JWT de OAuth (RS256, scope firebase.messaging, aud), y los errores (UNREGISTERED → invalido, …).
   Todo contra los simuladores de scripts/push-sim (que también validan). Sin red salvo bajar las dos referencias (correr.sh). */
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const OUT = process.env.CONTRATO_OUT, ESPEC = JSON.parse(fs.readFileSync(path.join(__dirname, 'apns.json'), 'utf8')), FCM = JSON.parse(fs.readFileSync(process.env.FCM_SPEC, 'utf8'));
const ece = require(process.env.ECE_DIR);
// Los ids de las apps salen de la fuente única (apps/mobile/apps.json; guardián appsUnaFuente).
const APPS = JSON.parse(fs.readFileSync(path.join(__dirname, '../../apps/mobile/apps.json'), 'utf8')).apps, ID = Object.fromEntries(APPS.map((a) => [a.key, a.ios]));
const sim = require(path.join(__dirname, '../push-sim/sim.cjs'));
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const d = (s) => Buffer.from(s, 'base64url');

/* Validador del formato de descubrimiento de Google (type, $ref, properties, enum, additionalProperties, items, format google-duration). */
function validar(s, v, ruta = '$', err = []) {
  if (!s) return err;
  if (s.$ref) return validar(FCM.schemas[s.$ref], v, ruta, err);
  const tipo = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v;
  if (s.type === 'object' || s.properties || s.additionalProperties) {
    if (tipo !== 'object') { err.push(`${ruta}: es ${tipo}, se esperaba objeto`); return err; }
    for (const [k, x] of Object.entries(v)) {
      if (s.properties?.[k]) validar(s.properties[k], x, `${ruta}.${k}`, err);
      else if (s.additionalProperties) validar(s.additionalProperties, x, `${ruta}.${k}`, err);
      else err.push(`${ruta}.${k}: FCM no tiene este campo`);
    }
    return err;
  }
  if (s.type === 'string') { if (tipo !== 'string') err.push(`${ruta}: es ${tipo}, se esperaba texto`); else { if (s.enum && !s.enum.includes(v)) err.push(`${ruta}: «${v}» no está en ${s.enum.join(', ')}`); if (s.format === 'google-duration' && !/^\d+(\.\d{1,9})?s$/.test(v)) err.push(`${ruta}: duración «${v}»`); } }
  else if (s.type === 'boolean' && tipo !== 'boolean') err.push(`${ruta}: es ${tipo}, se esperaba booleano`);
  else if (s.type === 'integer' && tipo !== 'integer') err.push(`${ruta}: es ${tipo}, se esperaba entero`);
  else if (s.type === 'array') { if (tipo !== 'array') err.push(`${ruta}: se esperaba lista`); else v.forEach((x, i) => validar(s.items, x, `${ruta}[${i}]`, err)); }
  return err;
}

(async () => {
  const W = require(OUT + '/webpush.js'), A = require(OUT + '/apns.js'), F = require(OUT + '/fcm.js');
  const S = await sim.arrancar({ temas: APPS.map((a) => a.ios) });
  const host = new URL(S.web).host;

  console.log('Web Push (RFC 8291 · RFC 8188 · RFC 8292)');
  const vec = W.cifrarAes128gcm(d('BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'), d('BTBZMqHH6r4Tts7J_aSIgg'), Buffer.from('When I grow up, I want to be a watermelon'),
    { salt: d('DGv6ra1nlYgDCS1FRnbzlw'), asPrivada: d('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw') });
  ok(vec.toString('base64url') === 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
    'cifrarAes128gcm reproduce byte por byte el mensaje del RFC 8291 Apéndice A');
  const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
  const auth = crypto.randomBytes(16), texto = JSON.stringify({ t: 'Pedido aceptado', b: 'Sabor Dominicano aceptó tu pedido #1042. Listo a las 7:30 PM.', u: '/app/aviso/12?v=push' });
  const c1 = W.cifrarAes128gcm(ua.getPublicKey(), auth, Buffer.from(texto));
  const claro = ece.decrypt(c1, { version: 'aes128gcm', privateKey: ua, dh: undefined, authSecret: auth });
  ok(claro.toString('utf8') === texto, 'http_ece (implementación independiente, MIT) descifra lo que ciframos');
  ok(sim.descifrar(c1, ua.getPrivateKey(), auth) === texto, 'el simulador (otra implementación) también');
  ok(c1.readUInt32BE(16) === 4096 && c1[20] === 65, 'cabecera aes128gcm: rs 4096 y keyid = la llave pública efímera (65 bytes)');
  const c2 = W.cifrarAes128gcm(ua.getPublicKey(), auth, Buffer.from(texto));
  ok(!c1.subarray(0, 16).equals(c2.subarray(0, 16)) && !c1.subarray(21, 86).equals(c2.subarray(21, 86)), 'cada envío lleva sal y llave efímera nuevas');
  let tiro = false; try { W.cifrarAes128gcm(ua.getPublicKey(), auth, Buffer.alloc(W.MAX_TEXTO + 1)); } catch { tiro = true; }
  ok(tiro, 'un contenido que no cabe en un registro no se manda');
  const vk = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey;
  const vapid = { privada: vk, publica: W.publicaVapid(vk), sujeto: 'https://tolatino.com' };
  ok(d(vapid.publica).length === 65 && d(vapid.publica)[0] === 4, 'la llave pública VAPID es un punto P-256 sin comprimir (applicationServerKey)');
  const jwt = W.jwtVapid('https://fcm.googleapis.com', vapid.sujeto, vk), [jh, jc] = jwt.split('.').slice(0, 2).map((x) => JSON.parse(d(x).toString()));
  ok(jh.alg === 'ES256' && jh.typ === 'JWT' && jc.aud === 'https://fcm.googleapis.com' && jc.sub === 'https://tolatino.com' && jc.exp - Date.now() / 1000 <= 86400 && jc.exp > Date.now() / 1000, 'JWT de VAPID: ES256, aud = origen, sub https, exp ≤ 24 h (RFC 8292 §2)');
  ok(sim.verificarJwt(jwt, crypto.createPublicKey(vk), 'ES256').ok, 'la firma ES256 (JOSE r‖s) se verifica con la llave pública');
  const priv = ua.getPrivateKey().toString('base64url'), a64 = auth.toString('base64url');
  for (const id of ['abc123', 'gone-1', 'lleno-1']) S.suscribir(id, priv, a64);
  const sus = (id) => ({ endpoint: `${S.web}/wp/${id}`, p256dh: ua.getPublicKey().toString('base64url'), auth: a64 });
  const r1 = await W.enviarWebPush(sus('abc123'), texto, { ttl: 3600, urgente: true, tema: W.temaDe('order:1042'), extra: [host] }, vapid);
  const e1 = S.registro.filter((x) => x.prov === 'webpush').pop();
  ok(r1.result === 'enviado' && r1.status === 201, `201 → enviado (${r1.result})`);
  ok(e1.fallo.length === 0 && e1.texto === texto, `el servicio de push validó VAPID, cabeceras y descifró lo mismo${e1.fallo.length ? ' — ' + e1.fallo.join('; ') : ''}`);
  ok(e1.ttl === '3600' && e1.urgency === 'high' && /^[A-Za-z0-9_-]{1,32}$/.test(e1.topic), 'TTL, Urgency high y Topic (≤ 32, base64url)');
  ok((await W.enviarWebPush(sus('gone-1'), texto, { ttl: 60, urgente: false, extra: [host] }, vapid)).result === 'invalido', '410 → invalido (se revoca, no se reintenta)');
  const r3 = await W.enviarWebPush(sus('lleno-1'), texto, { ttl: 60, urgente: false, extra: [host] }, vapid);
  ok(r3.result === 'limite' && r3.retryAfter === 1, '429 → limite con Retry-After');
  ok((await W.enviarWebPush(sus('lleno-1'), texto, { ttl: 60, urgente: false, extra: [host] }, vapid)).result === 'enviado', 'el reintento sale');
  for (const u of ['http://169.254.169.254/latest', 'https://evil.example.com/wp/1', 'https://fcm.googleapis.com.evil.com/x', 'https://user:pw@fcm.googleapis.com/x', 'file:///etc/passwd', 'https://fcm.googleapis.com:8443/x', `http://${host}/wp/1`])
    ok(!W.endpointPermitido(u), `SSRF: no se le escribe a ${u}`);
  for (const u of ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://web.push.apple.com/QAbc', 'https://wns2-by3p.notify.windows.com/w/?token=x'])
    ok(W.endpointPermitido(u), `servicio conocido: ${new URL(u).host}`);
  ok((await W.enviarWebPush({ ...sus('abc123'), endpoint: 'https://evil.example.com/x' }, texto, { ttl: 60, urgente: false }, vapid)).code === 'endpoint_no_permitido', 'enviar a una dirección ajena no sale de aquí');

  console.log('APNs (documentación de Apple → apns.json)');
  ok(ESPEC.obligatorias.includes('apns-topic') && ESPEC.noReintentar.includes('Unregistered'), `apns.json de ${ESPEC.extraido} (sha256 ${Object.values(ESPEC.sha256)[0].slice(0, 12)}…)`);
  const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const cred = { llavePem: kp.privateKey.export({ type: 'pkcs8', format: 'pem' }), idLlave: 'ABC123DEFG', equipo: 'TEAM123456' };
  Object.assign(S.cfg, { apnsPublica: kp.publicKey, apnsKid: cred.idLlave, apnsEquipo: cred.equipo });
  const tok = (p) => (p + crypto.randomBytes(32).toString('hex')).slice(0, 64);
  const cuerpo = A.cuerpoApns({ titulo: 'Nueva solicitud', texto: 'Nuevo pedido de Marisol. Responde en 10 minutos.', url: '/app/aviso/9?v=push', urgente: true, hilo: 'order:1042' });
  const envio = (t, o = {}) => ({ token: t, topic: ID.negocio, cuerpo, prioridad: 10, vence: Math.floor(Date.now() / 1000) + 3600, colapso: 'order:1042', ...o });
  const ra = await A.enviarApns(S.apns, cred, envio(tok('aa')));
  const ea = S.registro.filter((x) => x.prov === 'apns').pop();
  ok(ra.result === 'enviado' && /^[0-9a-f-]{36}$/.test(ra.id), '200 → enviado con su apns-id');
  ok(ea.fallo.length === 0, `cabeceras obligatorias, :path, tipo, prioridad, collapse-id, expiración, apns-id y JWT (kid, iss, iat, firma ES256) según Apple${ea.fallo.length ? ' — ' + ea.fallo.join('; ') : ''}`);
  ok(ea.cabeceras['apns-push-type'] === 'alert' && ESPEC.pushTypes.includes('alert') && ea.cabeceras['apns-topic'] === ID.negocio, 'apns-push-type alert con el id de la app como tema');
  ok(ea.cuerpo.aps['interruption-level'] === 'time-sensitive' && ESPEC.interruptionLevels.includes('time-sensitive'), 'la solicitud nueva va «time-sensitive» (nunca «critical»)');
  const cuerpoN = JSON.parse(A.cuerpoApns({ titulo: 'x', texto: 'y', url: '/app/aviso/1', urgente: false }));
  ok(cuerpoN.aps['interruption-level'] === 'active' && cuerpoN.u === '/app/aviso/1' && !JSON.stringify(cuerpoN).includes('critical'), 'lo demás «active»; la ruta va fuera de aps');
  ok(Buffer.byteLength(cuerpo) <= ESPEC.cuerpoMaxBytes, `cuerpo ≤ ${ESPEC.cuerpoMaxBytes} bytes`);
  await A.enviarApns(S.apns, cred, envio(tok('ab'), { colapso: 'x'.repeat(100) }));
  ok(S.registro.filter((x) => x.prov === 'apns').pop().fallo.length === 0, `un collapse-id largo se recorta a ${ESPEC.collapseIdMaxBytes} bytes`);
  const rd = await A.enviarApns(S.apns, cred, envio(tok('dead')));
  ok(rd.result === 'invalido' && rd.code === 'Unregistered' && ESPEC.errores['410'].includes('Unregistered'), '410 Unregistered → invalido (Apple: no reintentar)');
  const rb = await A.enviarApns(S.apns, cred, envio(tok('bad0')));
  ok(rb.result === 'invalido' && ESPEC.noReintentar.includes('BadDeviceToken'), '400 BadDeviceToken → invalido');
  const rl = await A.enviarApns(S.apns, cred, envio(tok('beef')));
  ok(rl.result === 'limite' && ESPEC.errores['429'].includes('TooManyRequests'), '429 TooManyRequests → limite (se reintenta con espera)');
  ok((await A.enviarApns(S.apns, cred, envio(tok('cafe')))).result === 'error', '500 → error (se reintenta)');
  ok((await A.enviarApns(S.apns, cred, envio('no-es-hex'))).result === 'invalido', 'un token que no es hex no sale');
  A.olvidarJwtApns();
  const ajena = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const rf = await A.enviarApns(S.apns, { ...cred, llavePem: ajena.privateKey.export({ type: 'pkcs8', format: 'pem' }) }, envio(tok('ac')));
  ok(rf.result === 'error' && rf.status === 403, '403 (llave equivocada) → error, NO invalido: el token no tiene la culpa');
  A.olvidarJwtApns(); A.cerrarApns();

  console.log('FCM HTTP v1 (documento de descubrimiento oficial, googleapis @ commit fijo)');
  const rev = FCM.revision, req = FCM.resources?.projects?.resources?.messages?.methods?.send;
  ok(req?.httpMethod === 'POST' && req.path === 'v1/{+parent}/messages:send' && req.request.$ref === 'SendMessageRequest' && FCM.rootUrl === 'https://fcm.googleapis.com/', `la especificación (revisión ${rev}) publica POST v1/{parent}/messages:send con SendMessageRequest`);
  ok(req.scopes.includes('https://www.googleapis.com/auth/firebase.messaging') && F.ALCANCE === 'https://www.googleapis.com/auth/firebase.messaging', 'pedimos solo el scope firebase.messaging');
  const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sa = { client_email: 'push@tolatino-pruebas.iam.gserviceaccount.com', private_key: rsa.privateKey.export({ type: 'pkcs8', format: 'pem' }), project_id: 'tolatino-pruebas', token_uri: F.TOKEN_URI };
  Object.assign(S.cfg, { saPublica: rsa.publicKey, saCorreo: sa.client_email });
  const acceso = await F.tokenAcceso(sa, `${S.fcm}/token`);
  ok(!!acceso && S.registro.filter((x) => x.prov === 'fcm-oauth').pop().fallo.length === 0, 'OAuth 2 (JWT bearer): RS256 firmado con la cuenta de servicio, scope, aud y exp verificados');
  ok((await F.tokenAcceso(sa, `${S.fcm}/token`)) === acceso, 'el token de acceso se reusa (no se pide uno por aviso)');
  const msg = F.mensajeFcm({ token: 'abc:' + 'x'.repeat(140), titulo: 'Te asignaron una entrega', texto: 'Pedido #1042 de Sabor Dominicano.', url: '/app/aviso/3?v=push', urgente: true, ttlS: 86400, colapso: 'order:1042', n: '3' });
  const ef = validar({ $ref: 'SendMessageRequest' }, { message: msg });
  ok(!ef.length, `el cuerpo cumple SendMessageRequest → Message (tipos, enumerados, sin campos de más)${ef.length ? ' — ' + ef.join('; ') : ''}`);
  ok(validar({ $ref: 'SendMessageRequest' }, { message: { ...msg, android: { ...msg.android, priority: 'URGENTE' } } }).length > 0 && validar({ $ref: 'SendMessageRequest' }, { message: { ...msg, analytics: true } }).length > 0, 'el validador sí caza un enumerado o un campo que FCM no tiene');
  ok(msg.android.ttl === '86400s' && msg.android.priority === 'HIGH' && FCM.schemas.AndroidConfig.properties.priority.enum.includes('HIGH') && Object.values(msg.data).every((x) => typeof x === 'string'), 'TTL «86400s», prioridad HIGH, data solo textos');
  ok(!('fcm_options' in msg) && !('fcmOptions' in msg) && !JSON.stringify(msg).includes('analytics_label'), 'sin analítica de FCM');
  const rf1 = await F.enviarFcm(S.fcm, sa.project_id, acceso, msg);
  ok(rf1.result === 'enviado' && S.registro.filter((x) => x.prov === 'fcm').pop().proyecto === 'tolatino-pruebas', '200 → enviado (projects/{proyecto}/messages:send)');
  ok((await F.enviarFcm(S.fcm, sa.project_id, acceso, { ...msg, token: 'muerto:' + 'y'.repeat(140) })).result === 'invalido', '404 UNREGISTERED → invalido');
  ok((await F.enviarFcm(S.fcm, sa.project_id, acceso, { ...msg, token: 'lento:' + 'z'.repeat(140) })).result === 'error', '503 UNAVAILABLE → error (se reintenta)');
  ok((await F.enviarFcm(S.fcm, sa.project_id, 'ya29.ajeno', msg)).result === 'error', '401 → error (y se olvida el token de acceso)');
  ok((await F.enviarFcm(S.fcm, '../x', acceso, msg)).result === 'rechazado', 'un proyecto que no es un id no se llama');
  await S.cerrar();
  console.log(`\n${n} comprobaciones del contrato de push`);
})().catch((e) => { console.error(e); process.exit(1); });
