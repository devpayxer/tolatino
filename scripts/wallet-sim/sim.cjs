// 8g · Simulador de Wallet para pruebas (nunca en producción: lib/pases/credenciales.ts no lee PASES_* en producción). Tres servidores:
// · Google Wallet API (HTTP): POST /token (OAuth 2 JWT bearer de la cuenta de servicio: firma RS256 verificada con la llave PÚBLICA que se le
//   registra, alcance wallet_object.issuer, aud oauth2) y /walletobjects/v1/eventTicketClass|eventTicketObject (insert, get, update) que VALIDAN
//   cada cuerpo contra el documento de descubrimiento OFICIAL (fijado a un commit en scripts/contrato-wallet/correr.sh; insert, get y update = PUT,
//   que reemplaza todo): una llave que el esquema
//   no tiene, un tipo o un valor fuera de su lista → 400 INVALID_ARGUMENT; id repetido → 409; objeto de una clase que no existe → 404.
//   También sirve el intermedio de la cadena de prueba en /aia/wwdr.der (el «CA Issuers» del certificado de prueba).
// · APNs de los pases (HTTPS/2 con TLS de CLIENTE obligatorio: solo entra un certificado firmado por la cadena de prueba): POST /3/device/{token}
//   con apns-topic = el UID del certificado de cliente y cuerpo «{}»; los tokens marcados «muertos» → 410 Unregistered.
// Uso: const sim = await require('scripts/wallet-sim/sim.cjs').arrancar({ googlePuerto, apnsPuerto, descubrimiento, tls: { key, cert, ca }, interDer })
const http = require('http'), http2 = require('http2'), crypto = require('crypto'), fs = require('fs'), { X509Certificate } = crypto;

function validador(doc) {
  const S = doc.schemas;
  const tipoDe = (p) => (p.$ref ? 'object' : p.type);
  return function validar(nombre, obj, ruta = nombre) {
    const s = S[nombre];
    if (!s) return [`${ruta}: esquema ${nombre} no existe`];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [`${ruta}: no es un objeto`];
    const err = [];
    for (const [k, v] of Object.entries(obj)) {
      const p = s.properties?.[k];
      if (!p) { err.push(`${ruta}.${k}: el esquema ${nombre} no tiene esa llave`); continue; }
      const t = tipoDe(p);
      if (p.$ref) err.push(...validar(p.$ref, v, `${ruta}.${k}`));
      else if (t === 'array') {
        if (!Array.isArray(v)) { err.push(`${ruta}.${k}: no es una lista`); continue; }
        v.forEach((x, i) => { if (p.items?.$ref) err.push(...validar(p.items.$ref, x, `${ruta}.${k}[${i}]`)); else if (p.items?.type === 'string' && typeof x !== 'string') err.push(`${ruta}.${k}[${i}]: no es texto`); });
      } else if (t === 'string') {
        if (typeof v !== 'string') err.push(`${ruta}.${k}: no es texto`);
        else if (p.enum && !p.enum.includes(v)) err.push(`${ruta}.${k}: «${v}» no está en la lista del esquema`);
      } else if (t === 'boolean' && typeof v !== 'boolean') err.push(`${ruta}.${k}: no es sí/no`);
      else if (t === 'integer' && !Number.isInteger(v)) err.push(`${ruta}.${k}: no es entero`);
    }
    return err;
  };
}

async function arrancar(o) {
  const doc = JSON.parse(fs.readFileSync(o.descubrimiento, 'utf8')), validar = validador(doc);
  const sim = { registro: [], clases: new Map(), objetos: new Map(), cuentas: new Map(), tokens: new Set(), muertos: new Set(), avisos: [], fallarGoogle: 0, cerrar: null };
  const metodos = {}; // la ruta de descubrimiento de cada método que usamos
  for (const r of ['eventticketclass', 'eventticketobject']) for (const m of ['insert', 'get', 'update']) { const x = doc.resources[r].methods[m]; metodos[`${x.httpMethod} ${x.path}`] = { r, m, req: x.request?.$ref ?? null }; }
  const b64j = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
  const g = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (d) => { cuerpo += d; if (cuerpo.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const u = new URL(req.url, 'http://x'), j = (st, b) => { res.writeHead(st, { 'content-type': 'application/json' }); res.end(JSON.stringify(b)); };
      const reg = { srv: 'google', metodo: req.method, ruta: u.pathname, auth: req.headers.authorization ?? null, cuerpo: cuerpo ? (() => { try { return JSON.parse(cuerpo); } catch { return cuerpo; } })() : null };
      sim.registro.push(reg);
      if (u.pathname === '/aia/wwdr.der') { res.writeHead(200, { 'content-type': 'application/pkix-cert' }); return res.end(o.interDer); }
      if (u.pathname === '/token' && req.method === 'POST') {
        const f = new URLSearchParams(cuerpo), a = f.get('assertion') ?? '';
        if (f.get('grant_type') !== 'urn:ietf:params:oauth:grant-type:jwt-bearer') return j(400, { error: 'unsupported_grant_type' });
        const [h, p, s] = a.split('.');
        try {
          const H = b64j(h), P = b64j(p), pub = sim.cuentas.get(P.iss);
          if (H.alg !== 'RS256' || !pub || !crypto.verify('sha256', Buffer.from(`${h}.${p}`), pub, Buffer.from(s, 'base64url'))) return j(400, { error: 'invalid_grant', motivo: 'firma' });
          if (P.aud !== 'https://oauth2.googleapis.com/token' || !String(P.scope).split(' ').includes('https://www.googleapis.com/auth/wallet_object.issuer') || P.exp - P.iat > 3600) return j(400, { error: 'invalid_scope' });
          const t = 'ya29.sim-' + crypto.randomBytes(12).toString('hex'); sim.tokens.add(t); reg.oauth = P;
          return j(200, { access_token: t, expires_in: 3599, token_type: 'Bearer' });
        } catch { return j(400, { error: 'invalid_grant' }); }
      }
      const m = /^\/(walletobjects\/v1\/(eventTicketClass|eventTicketObject))(?:\/([^/]+))?$/.exec(u.pathname);
      if (!m) return j(404, { error: { status: 'NOT_FOUND' } });
      if (!sim.tokens.has(String(req.headers.authorization ?? '').replace(/^Bearer /, ''))) return j(401, { error: { status: 'UNAUTHENTICATED' } });
      if (sim.fallarGoogle > 0) { sim.fallarGoogle--; return j(503, { error: { status: 'UNAVAILABLE' } }); }
      const clave = `${req.method} ${m[1]}${m[3] ? '/{resourceId}' : ''}`, met = metodos[clave];
      if (!met) return j(405, { error: { status: 'METHOD_NOT_ALLOWED', clave } });
      const tabla = m[2] === 'eventTicketClass' ? sim.clases : sim.objetos, id = m[3] ? decodeURIComponent(m[3]) : null;
      if (req.method === 'GET') return tabla.has(id) ? j(200, tabla.get(id)) : j(404, { error: { status: 'NOT_FOUND' } });
      let b;
      try { b = JSON.parse(cuerpo); } catch { return j(400, { error: { status: 'INVALID_ARGUMENT', motivo: 'json' } }); }
      const e = validar(met.req, b);
      if (!/^\d{6,25}\.[A-Za-z0-9._-]+$/.test(String(b.id ?? id ?? ''))) e.push('id: «emisor.sufijo»');
      if (m[2] === 'eventTicketObject' && req.method === 'POST' && !b.state) e.push('state es obligatorio');
      if (m[2] === 'eventTicketClass' && req.method === 'POST' && (!b.issuerName || !b.reviewStatus || !b.eventName)) e.push('issuerName, reviewStatus y eventName son obligatorios');
      if (e.length) { reg.errores = e; return j(400, { error: { status: 'INVALID_ARGUMENT', message: e.join('; ') } }); }
      if (req.method === 'POST') {
        if (tabla.has(b.id)) return j(409, { error: { status: 'ALREADY_EXISTS' } });
        if (m[2] === 'eventTicketObject' && !sim.clases.has(b.classId)) return j(404, { error: { status: 'NOT_FOUND', message: 'class' } });
        tabla.set(b.id, { ...b, version: '1' });
        return j(200, tabla.get(b.id));
      }
      if (!tabla.has(id)) return j(404, { error: { status: 'NOT_FOUND' } });
      if (b.id && b.id !== id) return j(400, { error: { status: 'INVALID_ARGUMENT', message: 'id distinto' } });
      // update (PUT) reemplaza el recurso entero: lo que no viene, deja de estar (así un objeto sin QR vigente queda sin código).
      const prev = tabla.get(id), nuevo = { ...b, id, version: String(Number(prev.version) + 1) };
      tabla.set(id, nuevo);
      return j(200, nuevo);
    });
  });
  await new Promise((r) => g.listen(o.googlePuerto, '127.0.0.1', r));
  // APNs de pases: TLS de cliente obligatorio con la cadena de prueba.
  const a = http2.createSecureServer({ key: o.tls.key, cert: o.tls.cert, ca: o.tls.ca, requestCert: true, rejectUnauthorized: true, allowHTTP1: false });
  a.on('stream', (st, h) => {
    let cuerpo = '';
    st.on('data', (d) => { cuerpo += d; });
    st.on('end', () => {
      const pc = st.session.socket.getPeerCertificate(true), uid = /(?:^|\n)UID=([^\n]+)/.exec(new X509Certificate(pc.raw).subject)?.[1] ?? null;
      const token = /^\/3\/device\/([0-9a-f]+)$/.exec(h[':path'] ?? '')?.[1] ?? null;
      const r = { srv: 'apns', metodo: h[':method'], token, topic: h['apns-topic'] ?? null, uid, cuerpo, at: Date.now() };
      sim.avisos.push(r);
      const fin = (s, b) => { st.respond({ ':status': s, 'content-type': 'application/json' }); st.end(b ? JSON.stringify(b) : ''); };
      if (h[':method'] !== 'POST' || !token) return fin(404, { reason: 'BadPath' });
      if (r.topic !== uid) return fin(400, { reason: 'TopicDisallowed' });
      if (cuerpo !== '{}') return fin(400, { reason: 'PayloadEmpty' });
      if (sim.muertos.has(token)) return fin(410, { reason: 'Unregistered' });
      fin(200);
    });
  });
  await new Promise((r) => a.listen(o.apnsPuerto, '127.0.0.1', r));
  // Cerrar sin esperar a los clientes: el servidor de la app deja su conexión HTTP/2 abierta (la reusa) y close() esperaría para siempre.
  const sesiones = new Set();
  a.on('session', (x) => { sesiones.add(x); x.on('close', () => sesiones.delete(x)); });
  sim.cerrar = () => { for (const x of sesiones) x.destroy(); g.closeAllConnections?.(); return Promise.all([new Promise((r) => g.close(r)), new Promise((r) => a.close(r))]); };
  sim.verificarGuardar = (url) => {
    const t = url.replace(/^https:\/\/pay\.google\.com\/gp\/v\/save\//, ''), [h, p, s] = t.split('.'), P = b64j(p), pub = sim.cuentas.get(P.iss);
    const ok = !!pub && b64j(h).alg === 'RS256' && crypto.verify('sha256', Buffer.from(`${h}.${p}`), pub, Buffer.from(s, 'base64url'));
    return { ok, P };
  };
  return sim;
}
module.exports = { arrancar, validador };
