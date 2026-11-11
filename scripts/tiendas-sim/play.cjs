/* 8h · Simulador de la API de Google Play (Android Publisher v3) para la tubería: OAuth 2 de cuenta de servicio (/token: el JWT RS256 firmado
   con la llave de la cuenta de PRUEBA, iss = client_email, aud = la URL del token, scope androidpublisher, vida ≤ 1 h) y las rutas que usa
   lib/tiendas/play.ts. Cada pedido se REVISA contra el documento de descubrimiento OFICIAL (el mismo commit fijado en scripts/contrato-tiendas/
   correr.sh): la ruta y el método existen (también la ruta de subida /upload/…), los parámetros de consulta son de ese método o globales y el
   cuerpo cumple su esquema (sin campos de más, tipos y enumerados). Un pedido que no cumple → 400 y queda en `registro` con su motivo.
   Como Google: un paquete que no existe en Play Console → 404; el versionCode lo dice el .aab (aquí, `proximo(pkg, n)`); la pista solo acepta
   versionCodes subidos en esa edición. Sin dependencias. */
'use strict';
const http = require('http'), crypto = require('crypto');

function rutas(d) {
  const out = [];
  const recorrer = (r, nombre) => {
    for (const [k, m] of Object.entries(r.methods ?? {})) {
      out.push({ id: `${nombre}.${k}`, metodo: m.httpMethod, plantilla: m.path, m });
      if (m.mediaUpload?.protocols?.simple?.path) out.push({ id: `${nombre}.${k}`, metodo: m.httpMethod, plantilla: m.mediaUpload.protocols.simple.path.replace(/^\//, ''), m, subida: true });
    }
    for (const [k, x] of Object.entries(r.resources ?? {})) recorrer(x, nombre ? `${nombre}.${k}` : k);
  };
  recorrer(d, '');
  return out.map((x) => ({ ...x, id: x.id.replace(/^\./, ''), re: new RegExp('^/' + x.plantilla.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\+?(\w+)\}/g, '(?<$1>[^/:]+)') + '$') }));
}
function validar(d, s, v, ruta = '$', err = []) {
  if (!s) return err;
  if (s.$ref) return validar(d, d.schemas[s.$ref], v, ruta, err);
  const tipo = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
  if (s.type === 'object' || s.properties) {
    if (tipo !== 'object') { err.push(`${ruta}: es ${tipo}, se esperaba objeto`); return err; }
    for (const [k, x] of Object.entries(v)) { if (s.properties?.[k]) validar(d, s.properties[k], x, `${ruta}.${k}`, err); else err.push(`${ruta}.${k}: Google no tiene este campo`); }
  } else if (s.type === 'array') { if (tipo !== 'array') err.push(`${ruta}: se esperaba lista`); else v.forEach((x, i) => validar(d, s.items, x, `${ruta}[${i}]`, err)); }
  else if (s.type === 'string') { if (tipo !== 'string') err.push(`${ruta}: es ${tipo}, se esperaba texto${s.format === 'int64' ? ' (int64 va como texto)' : ''}`); else if (s.enum && !s.enum.includes(v)) err.push(`${ruta}: «${v}» no está en ${s.enum.join(', ')}`); }
  else if (s.type === 'integer') { if (!Number.isInteger(v)) err.push(`${ruta}: se esperaba entero`); }
  else if (s.type === 'boolean' && tipo !== 'boolean') err.push(`${ruta}: se esperaba booleano`);
  return err;
}

async function arrancar(o) {
  const d = o.descubrimiento, R = rutas(d), registro = [], tokens = new Set(), ediciones = new Map(), confirmadas = [], prox = new Map();
  const cuenta = o.cuenta, paquetes = new Set(o.paquetes ?? []);
  const HUELLA = crypto.createHash('sha256').update('firma de Google de prueba').digest('hex');
  let url = '';
  const server = http.createServer((req, res) => {
    const partes = [];
    req.on('data', (c) => partes.push(c));
    req.on('end', () => {
      const cuerpo = Buffer.concat(partes), u = new URL(req.url, 'http://x'), r = { metodo: req.method, ruta: u.pathname, consulta: Object.fromEntries(u.searchParams), at: Date.now() };
      registro.push(r);
      const out = (s, j, motivo) => { r.status = s; if (motivo) r.invalido = motivo; res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(j ?? {})); };
      const err = (s, status, message, motivo) => out(s, { error: { code: s, status, message } }, motivo ?? message);
      if (u.pathname === '/token' && req.method === 'POST') {
        r.control = true;
        const f = new URLSearchParams(cuerpo.toString()), a = String(f.get('assertion') ?? '').split('.');
        if (f.get('grant_type') !== 'urn:ietf:params:oauth:grant-type:jwt-bearer' || a.length !== 3) return out(400, { error: 'invalid_grant' }, 'grant_type o assertion');
        const h = JSON.parse(Buffer.from(a[0], 'base64url')), c = JSON.parse(Buffer.from(a[1], 'base64url')), ahora = Math.floor(Date.now() / 1000);
        if (h.alg !== 'RS256' || !crypto.verify('sha256', Buffer.from(`${a[0]}.${a[1]}`), cuenta.publica, Buffer.from(a[2], 'base64url'))) return out(400, { error: 'invalid_grant' }, 'firma');
        if (c.iss !== cuenta.correo || c.aud !== `${url}/token` || !String(c.scope).split(' ').includes('https://www.googleapis.com/auth/androidpublisher') || c.exp - c.iat > 3600 || c.exp < ahora) return out(400, { error: 'invalid_grant' }, `claims ${JSON.stringify(c)}`);
        const t = `ya29.prueba-${crypto.randomBytes(12).toString('hex')}`; tokens.add(t);
        return out(200, { access_token: t, expires_in: 3599, token_type: 'Bearer' });
      }
      if (u.pathname === '/_estado') { r.control = true; return out(200, { confirmadas, registro }); }
      const auth = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
      if (!auth || !tokens.has(auth)) return err(401, 'UNAUTHENTICATED', 'Request had invalid authentication credentials.');
      const x = R.find((y) => y.metodo === req.method && y.re.test(u.pathname));
      if (!x) return err(404, 'NOT_FOUND', 'Not Found', `${req.method} ${u.pathname} no está en el descubrimiento`);
      const p = x.re.exec(u.pathname).groups;
      const permitidos = new Set([...Object.entries(x.m.parameters ?? {}).filter(([, v]) => v.location === 'query').map(([k]) => k), ...Object.keys(d.parameters ?? {})]);
      const extra = [...u.searchParams.keys()].filter((k) => !permitidos.has(k));
      if (extra.length) return err(400, 'INVALID_ARGUMENT', `Unknown parameter: ${extra.join(', ')}`);
      if (x.subida) {
        if (u.searchParams.get('uploadType') !== 'media') return err(400, 'INVALID_ARGUMENT', 'uploadType=media');
        if (!(x.m.mediaUpload.accept ?? []).includes(req.headers['content-type'])) return err(400, 'INVALID_ARGUMENT', `content-type ${req.headers['content-type']}`);
      } else if (x.m.request) {
        let j; try { j = JSON.parse(cuerpo.toString() || 'null'); } catch { return err(400, 'INVALID_ARGUMENT', 'JSON'); }
        const e = validar(d, x.m.request, j);
        if (e.length) return err(400, 'INVALID_ARGUMENT', 'Invalid JSON payload received.', e.join(' · '));
        r.cuerpo = j;
      } else if (cuerpo.length) return err(400, 'INVALID_ARGUMENT', 'este método no lleva cuerpo');
      r.valido = true; r.id = x.id;
      if (!paquetes.has(p.packageName)) return err(404, 'NOT_FOUND', `Package not found: ${p.packageName}.`);
      const ed = p.editId ? ediciones.get(p.editId) : null;
      if (p.editId && (!ed || ed.pkg !== p.packageName)) return err(404, 'NOT_FOUND', 'This Edit has been deleted.');
      switch (x.id) {
        case 'edits.insert': { const id = `ed-${crypto.randomBytes(6).toString('hex')}`; ediciones.set(id, { pkg: p.packageName, bundles: [], pistas: {} }); return out(200, { id, expiryTimeSeconds: String(Math.floor(Date.now() / 1000) + 3600) }); }
        case 'edits.bundles.upload': {
          if (cuerpo.length < 30 || cuerpo.readUInt32LE(0) !== 0x04034b50) return err(400, 'INVALID_ARGUMENT', 'The bundle is not a valid zip file.');
          const vc = prox.get(p.packageName) ?? 1; ed.bundles.push(vc);
          return out(200, { versionCode: vc, sha1: crypto.createHash('sha1').update(cuerpo).digest('hex'), sha256: crypto.createHash('sha256').update(cuerpo).digest('hex') });
        }
        case 'edits.tracks.update': {
          if (r.cuerpo.track !== p.track) return err(400, 'INVALID_ARGUMENT', 'track del cuerpo distinto al de la ruta');
          for (const rel of r.cuerpo.releases ?? []) for (const v of rel.versionCodes ?? []) if (!ed.bundles.includes(Number(v))) return err(403, 'PERMISSION_DENIED', `Version ${v} of this app can not be downloaded by any devices as they will all receive APKs with higher version codes.`);
          ed.pistas[p.track] = r.cuerpo; return out(200, r.cuerpo);
        }
        case 'edits.commit': { ediciones.delete(p.editId); for (const [pista, t] of Object.entries(ed.pistas)) confirmadas.push({ pkg: p.packageName, pista, versionCodes: t.releases.flatMap((z) => z.versionCodes), status: t.releases.map((z) => z.status) }); return out(200, { id: p.editId }); }
        case 'generatedapks.list': {
          const hay = confirmadas.some((c) => c.pkg === p.packageName && c.versionCodes.includes(String(p.versionCode)));
          return out(200, hay ? { generatedApks: [{ certificateSha256Hash: HUELLA, generatedUniversalApk: { downloadId: 'u1' } }] } : {});
        }
        default: return err(404, 'NOT_FOUND', 'Not Found', `${x.id} no lo usa la tubería`);
      }
    });
  });
  await new Promise((ok) => server.listen(o.puerto ?? 0, '127.0.0.1', ok));
  url = `http://127.0.0.1:${server.address().port}`;
  return { url, registro, confirmadas, HUELLA, proximo: (pkg, n) => prox.set(pkg, n), crear: (pkg) => paquetes.add(pkg), cerrar: () => new Promise((ok) => server.close(ok)) };
}

/* Una cuenta de servicio de PRUEBA (como el JSON que da Google), hecha en el momento: nunca en el repo. */
function cuentaDePrueba(correo = 'tuberia@tolatino-prueba.iam.gserviceaccount.com') {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return { publica: publicKey, correo, json: { type: 'service_account', project_id: 'tolatino-prueba', private_key_id: crypto.randomBytes(20).toString('hex'), private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), client_email: correo, token_uri: 'https://oauth2.googleapis.com/token' } };
}

module.exports = { arrancar, cuentaDePrueba, rutas, validar };
