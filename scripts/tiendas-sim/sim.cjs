/* 8f · Simulador de la API de App Store Connect (lo que usa el programa beta: apps, grupos de TestFlight, usuarios, invitaciones y testers). Contesta
   como la real (201 / 204 / 404 / 409 / 422 con { errors: [...] }) y REVISA cada pedido contra scripts/contrato-tiendas/asc.json (sacado de la
   especificación OpenAPI de Apple, versión y sha256 adentro): la ruta y el método existen, los parámetros de consulta están permitidos, el cuerpo
   cumple su esquema (tipos, obligatorios, enumerados, sin campos de más) y el JWT es el que pide Apple (ES256 firmado con la llave .p8 de la
   prueba, kid, typ JWT, iss, aud appstoreconnect-v1, exp − iat ≤ 20 min). Un pedido que no cumple → 400/401 y queda anotado en `registro` con su
   motivo. Lo usan el contrato (scripts/contrato-tiendas) y la prueba de punta a punta (beta8f). Sin dependencias.
   Como un usuario de App Store Connect acepta la invitación por correo, aquí lo hace `aceptar(correo)` (o POST /_aceptar {correo}). */
'use strict';
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const ASC = JSON.parse(fs.readFileSync(path.join(__dirname, '../contrato-tiendas/asc.json'), 'utf8'));
const json = (s) => { try { return JSON.parse(s); } catch { return null; } };

/* Validador del subconjunto de OpenAPI 3 que usa la especificación de Apple en estos cuerpos. */
function validar(s, v, ruta = '$', err = []) {
  if (!s) return err;
  if (v === null) { if (!s.nullable) err.push(`${ruta}: no puede ser null`); return err; }
  const tipo = Array.isArray(v) ? 'array' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v;
  if (s.type === 'object' || s.properties) {
    if (tipo !== 'object') { err.push(`${ruta}: es ${tipo}, se esperaba objeto`); return err; }
    for (const r of s.required ?? []) if (!(r in v)) err.push(`${ruta}.${r}: obligatorio`);
    for (const [k, x] of Object.entries(v)) {
      if (s.properties?.[k]) validar(s.properties[k], x, `${ruta}.${k}`, err);
      else err.push(`${ruta}.${k}: Apple no tiene este campo`);
    }
    return err;
  }
  if (s.type === 'string') {
    if (tipo !== 'string') err.push(`${ruta}: es ${tipo}, se esperaba texto`);
    else { if (s.enum && !s.enum.includes(v)) err.push(`${ruta}: «${v}» no está en ${s.enum.join(', ')}`); if (s.format === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) err.push(`${ruta}: no es un correo`); }
  } else if (s.type === 'boolean' && tipo !== 'boolean') err.push(`${ruta}: es ${tipo}, se esperaba booleano`);
  else if (s.type === 'integer' && tipo !== 'integer') err.push(`${ruta}: es ${tipo}, se esperaba entero`);
  else if (s.type === 'array') { if (tipo !== 'array') err.push(`${ruta}: se esperaba lista`); else v.forEach((x, i) => validar(s.items, x, `${ruta}[${i}]`, err)); }
  return err;
}

function verificarJwt(t, publica, o) {
  const p = String(t ?? '').split('.');
  if (p.length !== 3) return 'jwt mal formado';
  const h = json(Buffer.from(p[0], 'base64url').toString()), c = json(Buffer.from(p[1], 'base64url').toString());
  if (!h || !c) return 'jwt ilegible';
  if (h.alg !== ASC.jwt.alg || h.typ !== 'JWT' || (o.kid && h.kid !== o.kid)) return `cabecera ${JSON.stringify(h)}`;
  if (c.aud !== ASC.jwt.aud) return `aud ${c.aud}`;
  if (o.emisor && c.iss !== o.emisor) return `iss ${c.iss}`;
  const ahora = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(c.iat) || !Number.isInteger(c.exp) || c.exp - c.iat > ASC.jwt.maxVidaS || c.exp <= ahora || c.iat > ahora + 60) return `tiempos iat ${c.iat} exp ${c.exp}`;
  if (!crypto.verify('sha256', Buffer.from(`${p[0]}.${p[1]}`), { key: publica, dsaEncoding: 'ieee-p1363' }, Buffer.from(p[2], 'base64url'))) return 'firma inválida';
  return null;
}

/* La plantilla de ASC que corresponde a una ruta concreta ("/v1/apps/123/betaGroups" → "/v1/apps/{id}/betaGroups"). */
function plantilla(metodo, ruta) {
  for (const k of Object.keys(ASC.rutas)) {
    const [m, p] = k.split(' ');
    if (m !== metodo) continue;
    const re = new RegExp('^' + p.replace(/\{id\}/g, '([^/]+)') + '$'), x = re.exec(ruta);
    if (x) return { k, id: x[1] ? decodeURIComponent(x[1]) : null };
  }
  return null;
}

async function arrancar(o = {}) {
  const publica = typeof o.publica === 'string' ? crypto.createPublicKey(o.publica) : o.publica;
  const apps = new Map((o.apps ?? []).map((a, i) => [a.bundle ?? a, { id: String(a.id ?? 6400000000 + i) }]));
  const registro = [], usuarios = new Map(), invitaciones = new Map(), testers = new Map();
  let n = 1000;
  const err = (res, status, code, title, motivo, r) => { r.invalido = motivo ?? null; r.status = status; res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify({ errors: [{ status: String(status), code, title }] })); };
  const ok = (res, status, data, r) => { r.status = status; if (status === 204) { res.writeHead(204); res.end(); return; } res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
  const aceptar = (correo) => {
    const inv = [...invitaciones.values()].find((x) => x.email === correo.toLowerCase());
    if (!inv) return false;
    const id = `usr-${++n}`;
    usuarios.set(id, { id, username: inv.email, roles: inv.roles });
    invitaciones.delete(inv.id);
    return true;
  };
  const server = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; if (cuerpo.length > 100000) req.destroy(); });
    req.on('end', () => {
      const u = new URL(req.url, 'http://x'), r = { metodo: req.method, ruta: u.pathname, consulta: Object.fromEntries(u.searchParams), cuerpo: json(cuerpo), at: Date.now() };
      registro.push(r);
      if (u.pathname === '/_aceptar' && req.method === 'POST') { const ok2 = aceptar(String(r.cuerpo?.correo ?? '')); res.writeHead(ok2 ? 200 : 404); res.end(); r.control = true; return; }
      if (u.pathname === '/_estado') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ usuarios: [...usuarios.values()], invitaciones: [...invitaciones.values()], testers: [...testers.values()], registro })); r.control = true; return; }
      const auth = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
      const malJwt = publica ? verificarJwt(auth, publica, o) : 'sin llave pública en el simulador';
      if (malJwt) return err(res, 401, 'NOT_AUTHORIZED', 'Authentication credentials are missing or invalid.', malJwt, r);
      const p = plantilla(req.method, u.pathname);
      if (!p) return err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', `${req.method} ${u.pathname} no está en la especificación`, r);
      const espec = ASC.rutas[p.k];
      const extra = [...u.searchParams.keys()].filter((k) => !espec.consulta.includes(k));
      if (extra.length) return err(res, 400, 'PARAMETER_ERROR.INVALID', 'A parameter has an invalid value', `consulta no permitida: ${extra.join(', ')}`, r);
      if (espec.cuerpo) {
        if (!/^application\/json/.test(req.headers['content-type'] ?? '')) return err(res, 415, 'UNSUPPORTED', 'content-type', 'content-type no es JSON', r);
        const e = validar(espec.cuerpo, r.cuerpo);
        if (e.length) return err(res, 422, 'ENTITY_UNPROCESSABLE', 'The request entity is not valid', e.join(' · '), r);
      }
      r.valido = true;
      const q = (k) => u.searchParams.get(k);
      switch (p.k) {
        case 'GET /v1/apps': { const b = q('filter[bundleId]'), a = b ? apps.get(b) : null; return ok(res, 200, { data: a ? [{ type: 'apps', id: a.id, attributes: { bundleId: b } }] : [] }, r); }
        case 'GET /v1/apps/{id}/betaGroups': {
          if (![...apps.values()].some((a) => a.id === p.id)) return err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
          return ok(res, 200, { data: [{ type: 'betaGroups', id: `grp-ext-${p.id}`, attributes: { name: 'Vecinos (externo)', isInternalGroup: false } }, { type: 'betaGroups', id: `grp-int-${p.id}`, attributes: { name: "Equipo To'Latino", isInternalGroup: true } }] }, r);
        }
        case 'GET /v1/users': { const c = (q('filter[username]') ?? '').toLowerCase(); return ok(res, 200, { data: [...usuarios.values()].filter((x) => x.username === c).map((x) => ({ type: 'users', id: x.id, attributes: { username: x.username, roles: x.roles } })) }, r); }
        case 'POST /v1/userInvitations': {
          const a = r.cuerpo.data.attributes, c = a.email.toLowerCase();
          if ([...usuarios.values()].some((x) => x.username === c) || [...invitaciones.values()].some((x) => x.email === c)) return err(res, 409, 'ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE', 'The provided entity includes a value that is already in use', null, r);
          const id = `inv-${++n}`;
          invitaciones.set(id, { id, email: c, roles: a.roles, apps: (r.cuerpo.data.relationships?.visibleApps?.data ?? []).map((x) => x.id), allAppsVisible: a.allAppsVisible, provisioningAllowed: a.provisioningAllowed });
          return ok(res, 201, { data: { type: 'userInvitations', id, attributes: { email: c, roles: a.roles } } }, r);
        }
        case 'POST /v1/betaTesters': {
          const a = r.cuerpo.data.attributes, c = a.email.toLowerCase(), g = r.cuerpo.data.relationships?.betaGroups?.data?.[0]?.id ?? '';
          // Un grupo INTERNO solo acepta usuarios del equipo de App Store Connect.
          if (g.startsWith('grp-int-') && ![...usuarios.values()].some((x) => x.username === c)) return err(res, 422, 'ENTITY_ERROR.RELATIONSHIP.INVALID', 'The tester is not a member of the team', 'grupo interno sin usuario del equipo', r);
          const id = `bt-${++n}`;
          testers.set(id, { id, email: c, grupo: g });
          return ok(res, 201, { data: { type: 'betaTesters', id, attributes: { email: c } } }, r);
        }
        case 'DELETE /v1/betaTesters/{id}': return testers.delete(p.id) ? ok(res, 204, null, r) : err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
        case 'DELETE /v1/userInvitations/{id}': return invitaciones.delete(p.id) ? ok(res, 204, null, r) : err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
        case 'DELETE /v1/users/{id}': return usuarios.delete(p.id) ? ok(res, 204, null, r) : err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
        default: return err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
      }
    });
  });
  await new Promise((ok2) => server.listen(o.puerto ?? 0, '127.0.0.1', ok2));
  return { url: `http://127.0.0.1:${server.address().port}`, registro, usuarios, invitaciones, testers, aceptar, cerrar: () => new Promise((ok2) => server.close(ok2)) };
}

module.exports = { arrancar, validar, verificarJwt, ASC };
if (require.main === module) {
  // node scripts/tiendas-sim/sim.cjs <puerto> <llave pública PEM> <emisor> <kid>  (las apps salen de apps/mobile/apps.json)
  const apps = JSON.parse(fs.readFileSync(path.join(__dirname, '../../apps/mobile/apps.json'), 'utf8')).apps.map((a, i) => ({ bundle: a.ios, id: 6400000001 + i }));
  arrancar({ puerto: Number(process.argv[2] ?? 4404), publica: process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : null, emisor: process.argv[4], kid: process.argv[5], apps })
    .then((s) => console.log(`simulador de App Store Connect en ${s.url}`));
}
