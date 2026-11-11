/* 8c · Simuladores de push (fase8-apps.md §3.3 «Simuladores y contrato»): un APNs (HTTP/2), un FCM HTTP v1 (con su OAuth) y un servicio Web Push que
   contestan como los reales — 200/201, 400 BadDeviceToken, 410 Unregistered/Gone, 404 UNREGISTERED, 429 con Retry-After, 5xx — y que REVISAN cada
   pedido con las reglas publicadas (las de APNs salen de scripts/contrato-push/apns.json): firma del JWT de APNs (ES256, kid, iss, iat), del JWT
   de OAuth de FCM (RS256, scope, aud) y del de VAPID (ES256, aud = origen, exp ≤ 24 h, sub https/mailto), cabeceras obligatorias, topes de tamaño.
   El de Web Push DESCIFRA lo que recibe (RFC 8291, implementación aparte de la de lib/push/webpush.ts) con las llaves de la suscripción que le dio
   la prueba, para comparar lo que llegó. Lo usan la prueba de punta a punta (push8c) y el contrato (scripts/contrato-push). Sin dependencias.
   Uso como programa: node scripts/push-sim/sim.cjs [puerto APNs] [puerto FCM] [puerto Web Push]  (control en el de Web Push: /_config, /_suscribir,
   /_registro, /_reset). Cada token decide la respuesta por su comienzo: dead…/muerto…/gone… → ya no sirve; bad0… → 400; beef…/lento…/lleno… →
   primero 429 o 503 y después bien; cafe… → 500 siempre. */
'use strict';
const http = require('http'), http2 = require('http2'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const ESPEC = JSON.parse(fs.readFileSync(path.join(__dirname, '../contrato-push/apns.json'), 'utf8'));
const b64u = (b) => Buffer.from(b).toString('base64url');
const json = (s) => { try { return JSON.parse(s); } catch { return null; } };

function verificarJwt(t, publica, alg) {
  const p = String(t ?? '').split('.');
  if (p.length !== 3) return { ok: false, por: 'jwt mal formado' };
  const h = json(Buffer.from(p[0], 'base64url').toString()), c = json(Buffer.from(p[1], 'base64url').toString());
  if (!h || !c || h.alg !== alg) return { ok: false, por: `alg ${h?.alg} ≠ ${alg}` };
  const ok = crypto.verify('sha256', Buffer.from(`${p[0]}.${p[1]}`), alg === 'ES256' ? { key: publica, dsaEncoding: 'ieee-p1363' } : publica, Buffer.from(p[2], 'base64url'));
  return ok ? { ok: true, h, c } : { ok: false, por: 'firma inválida' };
}

/* RFC 8291 / 8188, del lado del navegador: con la llave privada de la suscripción y su secreto de autenticación. */
function descifrar(cuerpo, uaPriv, auth) {
  const salt = cuerpo.subarray(0, 16), rs = cuerpo.readUInt32BE(16), idlen = cuerpo[20], asPub = cuerpo.subarray(21, 21 + idlen), ct = cuerpo.subarray(21 + idlen);
  if (idlen !== 65 || rs < 18 || ct.length > rs) throw new Error('cabecera aes128gcm inválida');
  const ua = crypto.createECDH('prime256v1'); ua.setPrivateKey(uaPriv);
  const uaPub = ua.getPublicKey(), ecdh = ua.computeSecret(asPub);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', ecdh, auth, Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub]), 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  let i = pt.length - 1; while (i >= 0 && pt[i] === 0) i--;
  if (pt[i] !== 2) throw new Error('delimitador de último registro ausente');
  return pt.subarray(0, i).toString('utf8');
}

async function arrancar(o = {}) {
  const cfg = { apnsPublica: o.apnsPublica ?? null, apnsKid: o.apnsKid ?? null, apnsEquipo: o.apnsEquipo ?? null, saPublica: o.saPublica ?? null, saCorreo: o.saCorreo ?? null, temas: o.temas ?? null };
  const subs = new Map(), registro = [], vistos = new Map();
  const anotar = (x) => { registro.push({ at: Date.now(), ...x }); if (registro.length > 5000) registro.shift(); };
  const una = (k) => { const n = (vistos.get(k) ?? 0) + 1; vistos.set(k, n); return n; };

  /* ── APNs (HTTP/2 sin TLS: h2c local; los reales son TLS en 443) ── */
  const apns = http2.createServer();
  apns.on('stream', (st, h) => {
    let b = ''; st.setEncoding('utf8'); st.on('data', (d) => (b += d));
    st.on('end', () => {
      const fallo = [], tok = /^\/3\/device\/([0-9a-f]+)$/.exec(String(h[':path']))?.[1];
      for (const k of ESPEC.obligatorias) if (!h[k]) fallo.push(`falta ${k}`);
      if (h[':method'] !== ESPEC.metodo) fallo.push(':method no es POST');
      if (!tok) fallo.push(':path no es /3/device/{token hex}');
      if (h['apns-push-type'] && !ESPEC.pushTypes.includes(h['apns-push-type'])) fallo.push(`apns-push-type ${h['apns-push-type']}`);
      if (h['apns-priority'] && !ESPEC.prioridades.includes(Number(h['apns-priority']))) fallo.push(`apns-priority ${h['apns-priority']}`);
      if (h['apns-collapse-id'] && Buffer.byteLength(String(h['apns-collapse-id'])) > ESPEC.collapseIdMaxBytes) fallo.push('apns-collapse-id > 64 bytes');
      if (h['apns-expiration'] && !/^\d+$/.test(String(h['apns-expiration']))) fallo.push('apns-expiration no es un entero');
      if (h['apns-id'] && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(h['apns-id']))) fallo.push('apns-id no es un UUID canónico en minúsculas');
      if (cfg.temas && !cfg.temas.includes(String(h['apns-topic']))) fallo.push(`apns-topic ${h['apns-topic']} no es de una de las apps`);
      if (Buffer.byteLength(b) > ESPEC.cuerpoMaxBytes) fallo.push('cuerpo > 4096 bytes');
      const cuerpo = json(b);
      if (!cuerpo?.aps?.alert?.title || typeof cuerpo.aps.alert.body !== 'string') fallo.push('falta aps.alert.title / body');
      const lvl = cuerpo?.aps?.['interruption-level'];
      if (lvl && (!ESPEC.interruptionLevels.includes(lvl) || lvl === 'critical')) fallo.push(`interruption-level ${lvl}`);
      let reason = null, status = 200;
      if (cfg.apnsPublica) {
        const v = verificarJwt(String(h.authorization ?? '').replace(/^bearer /, ''), cfg.apnsPublica, 'ES256');
        if (!v.ok) { status = 403; reason = 'InvalidProviderToken'; fallo.push(`JWT de APNs: ${v.por}`); }
        else if (v.h.kid !== cfg.apnsKid || v.c.iss !== cfg.apnsEquipo || !Number.isInteger(v.c.iat) || Math.abs(Date.now() / 1000 - v.c.iat) > 3600) { status = 403; reason = 'InvalidProviderToken'; fallo.push('JWT de APNs: kid, iss o iat'); }
      }
      if (fallo.length && status === 200) { status = 400; reason = 'BadRequest'; }
      if (status === 200 && tok) {
        if (tok.startsWith('dead')) { status = 410; reason = 'Unregistered'; }
        else if (tok.startsWith('bad0')) { status = 400; reason = 'BadDeviceToken'; }
        else if (tok.startsWith('beef') && una(tok) === 1) { status = 429; reason = 'TooManyRequests'; }
        else if (tok.startsWith('cafe')) { status = 500; reason = 'InternalServerError'; }
      }
      anotar({ prov: 'apns', token: tok, status, reason, fallo, cabeceras: Object.fromEntries(Object.entries(h).filter(([k]) => k !== 'authorization')), cuerpo });
      const id = h['apns-id'] || crypto.randomUUID();
      st.respond({ ':status': status, 'apns-id': id, ...(reason ? { 'content-type': 'application/json' } : {}) });
      st.end(reason ? JSON.stringify(status === 410 ? { reason, timestamp: Date.now() } : { reason, ...(fallo.length ? { sim: fallo } : {}) }) : undefined);
    });
  });

  /* ── FCM HTTP v1 + OAuth ── */
  const accesos = new Set();
  const fcm = http.createServer((req, res) => {
    let b = ''; req.on('data', (d) => (b += d));
    req.on('end', () => {
      const fin = (s, j) => { res.writeHead(s, { 'content-type': 'application/json', ...(s === 429 || s === 503 ? { 'retry-after': '1' } : {}) }); res.end(JSON.stringify(j)); };
      if (req.method === 'POST' && req.url === '/token') {
        const q = new URLSearchParams(b), fallo = [];
        if (q.get('grant_type') !== 'urn:ietf:params:oauth:grant-type:jwt-bearer') fallo.push('grant_type');
        const v = cfg.saPublica ? verificarJwt(q.get('assertion'), cfg.saPublica, 'RS256') : { ok: true, c: json(Buffer.from(String(q.get('assertion')).split('.')[1] ?? '', 'base64url').toString()) ?? {} };
        if (!v.ok) fallo.push(`assertion: ${v.por}`);
        else if (v.c.scope !== 'https://www.googleapis.com/auth/firebase.messaging' || v.c.aud !== 'https://oauth2.googleapis.com/token' || (cfg.saCorreo && v.c.iss !== cfg.saCorreo) || !(v.c.exp > v.c.iat && v.c.exp - v.c.iat <= 3600)) fallo.push('assertion: scope, aud, iss o exp');
        anotar({ prov: 'fcm-oauth', status: fallo.length ? 400 : 200, fallo });
        if (fallo.length) return fin(400, { error: 'invalid_grant', error_description: fallo.join('; ') });
        const t = 'ya29.sim-' + crypto.randomBytes(12).toString('hex'); accesos.add(t);
        return fin(200, { access_token: t, expires_in: 3599, token_type: 'Bearer' });
      }
      const m = /^\/v1\/projects\/([a-z0-9-]+)\/messages:send$/.exec(req.url ?? '');
      if (req.method !== 'POST' || !m) return fin(404, { error: { code: 404, status: 'NOT_FOUND' } });
      if (!accesos.has(String(req.headers.authorization ?? '').replace(/^Bearer /, ''))) { anotar({ prov: 'fcm', status: 401, fallo: ['Bearer'] }); return fin(401, { error: { code: 401, status: 'UNAUTHENTICATED' } }); }
      const c = json(b), msg = c?.message, fallo = [];
      if (!msg || typeof msg.token !== 'string') fallo.push('message.token');
      if (msg && Buffer.byteLength(b) > 4096 + 1024) fallo.push('mensaje demasiado grande');
      if (msg?.data && Object.values(msg.data).some((x) => typeof x !== 'string')) fallo.push('data: solo textos');
      const tok = msg?.token ?? '';
      const err = (s, st, code) => fin(s, { error: { code: s, status: st, details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: code }] } });
      anotar({ prov: 'fcm', token: tok, status: fallo.length ? 400 : tok.startsWith('muerto') ? 404 : 200, fallo, cuerpo: c, proyecto: m[1] });
      if (fallo.length) return err(400, 'INVALID_ARGUMENT', 'INVALID_ARGUMENT');
      if (tok.startsWith('muerto')) return err(404, 'NOT_FOUND', 'UNREGISTERED');
      if (tok.startsWith('lento') && una(tok) === 1) return err(503, 'UNAVAILABLE', 'UNAVAILABLE');
      return fin(200, { name: `projects/${m[1]}/messages/0:${Date.now()}%sim` });
    });
  });

  /* ── Web Push + control ── */
  const web = http.createServer((req, res) => {
    const ch = []; req.on('data', (d) => ch.push(d));
    req.on('end', () => {
      const b = Buffer.concat(ch), fin = (s, j, h = {}) => { res.writeHead(s, { 'content-type': 'application/json', ...h }); res.end(j === undefined ? '' : JSON.stringify(j)); };
      if (req.url === '/_config' && req.method === 'POST') { Object.assign(cfg, json(b.toString()) ?? {}); return fin(200, { ok: true }); }
      if (req.url === '/_suscribir' && req.method === 'POST') { const x = json(b.toString()); subs.set(x.id, { priv: Buffer.from(x.priv, 'base64url'), auth: Buffer.from(x.auth, 'base64url') }); return fin(200, { ok: true }); }
      if (req.url?.startsWith('/_registro')) return fin(200, registro);
      if (req.url === '/_reset') { registro.length = 0; vistos.clear(); return fin(200, { ok: true }); }
      const m = /^\/wp\/([A-Za-z0-9_-]{4,80})$/.exec(req.url ?? '');
      if (req.method !== 'POST' || !m) return fin(404, { error: 'no existe' });
      const id = m[1], h = req.headers, fallo = [];
      const vap = /^vapid t=([A-Za-z0-9_.-]+), k=([A-Za-z0-9_-]+)$/.exec(String(h.authorization ?? ''));
      if (!vap) fallo.push('Authorization no es «vapid t=…, k=…» (RFC 8292)');
      else {
        const k = Buffer.from(vap[2], 'base64url');
        if (k.length !== 65 || k[0] !== 4) fallo.push('k no es un punto P-256 sin comprimir');
        else {
          const pub = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(k.subarray(1, 33)), y: b64u(k.subarray(33)) }, format: 'jwk' });
          const v = verificarJwt(vap[1], pub, 'ES256'), origen = `http://${h.host}`;
          if (!v.ok) fallo.push(`JWT de VAPID: ${v.por}`);
          else if (v.c.aud !== origen || !(v.c.exp > Date.now() / 1000 && v.c.exp <= Date.now() / 1000 + 86400) || !/^(https:\/\/|mailto:)/.test(String(v.c.sub))) fallo.push('JWT de VAPID: aud, exp o sub');
        }
      }
      if (h['content-encoding'] !== 'aes128gcm') fallo.push('Content-Encoding no es aes128gcm');
      if (!/^\d+$/.test(String(h.ttl ?? ''))) fallo.push('falta TTL');
      if (h.urgency && !['very-low', 'low', 'normal', 'high'].includes(String(h.urgency))) fallo.push('Urgency');
      if (h.topic && !/^[A-Za-z0-9_-]{1,32}$/.test(String(h.topic))) fallo.push('Topic');
      let texto = null;
      const s = subs.get(id);
      if (s && !fallo.length) { try { texto = descifrar(b, s.priv, s.auth); } catch (e) { fallo.push(`no se descifra: ${e.message}`); } }
      let status = fallo.length ? 400 : 201;
      if (status === 201 && id.startsWith('gone')) status = 410;
      else if (status === 201 && id.startsWith('lleno') && una(id) === 1) status = 429;
      anotar({ prov: 'webpush', id, status, fallo, texto, ttl: h.ttl, urgency: h.urgency, topic: h.topic ?? null, bytes: b.length });
      fin(status, status >= 400 ? { error: fallo.join('; ') || 'sim' } : undefined, status === 201 ? { location: `/m/${crypto.randomUUID()}` } : status === 429 ? { 'retry-after': '1' } : {});
    });
  });

  await Promise.all([[apns, o.apnsPuerto ?? 0], [fcm, o.fcmPuerto ?? 0], [web, o.webPuerto ?? 0]].map(([s, p]) => new Promise((r) => s.listen(p, '127.0.0.1', r))));
  return {
    apns: `http://127.0.0.1:${apns.address().port}`, fcm: `http://127.0.0.1:${fcm.address().port}`, web: `http://127.0.0.1:${web.address().port}`,
    cfg, registro, suscribir: (id, priv, auth) => subs.set(id, { priv: Buffer.from(priv, 'base64url'), auth: Buffer.from(auth, 'base64url') }),
    cerrar: () => Promise.all([apns, fcm, web].map((s) => new Promise((r) => s.close(() => r())))),
  };
}
module.exports = { arrancar, descifrar, verificarJwt };

if (require.main === module) {
  const [a, f, w] = process.argv.slice(2).map(Number);
  arrancar({ apnsPuerto: a || 4401, fcmPuerto: f || 4402, webPuerto: w || 4403 }).then((s) => console.log(`simuladores de push: APNs ${s.apns} · FCM ${s.fcm} · Web Push ${s.web}`));
}
