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
  // 8h · Los builds que «subió» el CI (los pone la prueba con subirBuild / POST /_build) y los que se sumaron a un grupo.
  const builds = new Map(), enGrupo = [];
  // 8i · La ficha: una versión en preparación por app (o ninguna con sinVersion), su información, las localizaciones, la clasificación por edad,
  // el detalle para la revisión y las capturas (juegos, reservas, lo subido y lo confirmado).
  const sinVersion = new Set(o.sinVersion ?? []), locV = new Map(), locI = new Map(), edad = new Map(), detalle = new Map(), juegos = new Map(), capturas = new Map(), subidas = new Map();
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
  // 8h · Un build «subido» por xcodebuild: queda PROCESSING hasta que la prueba lo pase a VALID / FAILED / INVALID (mismo id).
  const subirBuild = (x) => {
    const appId = String(x.appId ?? ''), id = x.id ?? `bld-${++n}`;
    if (!ASC.estadosBuild.includes(x.estado ?? 'PROCESSING')) return { error: 'estado' };
    const b = { id, app: appId, version: String(x.version ?? ''), build: String(x.build ?? ''), estado: x.estado ?? 'PROCESSING' };
    builds.set(id, b);
    return b;
  };
  const server = http.createServer((req, res) => {
    const partes = []; let largo = 0;
    const subida = req.url.startsWith('/_subir/');
    req.on('data', (c) => { partes.push(c); largo += c.length; if (largo > (subida ? 10 * 1024 * 1024 : 100000)) req.destroy(); });
    req.on('end', () => {
      const bruto = Buffer.concat(partes), cuerpo = subida ? '' : bruto.toString('utf8');
      const u = new URL(req.url, 'http://x'), r = { metodo: req.method, ruta: u.pathname, consulta: Object.fromEntries(u.searchParams), cuerpo: json(cuerpo), at: Date.now() };
      registro.push(r);
      // 8i · La dirección de subida que da Apple al reservar una captura (otro host en la real; aquí, /_subir/{id}).
      if (subida && req.method === 'PUT') { r.control = true; const id = u.pathname.slice(8), c = capturas.get(id); if (!c) { res.writeHead(404); res.end(); return; } subidas.set(id, bruto); res.writeHead(200); res.end(); return; }
      if (u.pathname === '/_aceptar' && req.method === 'POST') { const ok2 = aceptar(String(r.cuerpo?.correo ?? '')); res.writeHead(ok2 ? 200 : 404); res.end(); r.control = true; return; }
      if (u.pathname === '/_estado') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ usuarios: [...usuarios.values()], invitaciones: [...invitaciones.values()], testers: [...testers.values()], builds: [...builds.values()], enGrupo,
        fichas: { version: [...locV.values()], app: [...locI.values()], edad: [...edad.entries()], detalle: [...detalle.values()], juegos: [...juegos.values()], capturas: [...capturas.values()] }, registro })); r.control = true; return; }
      if (u.pathname === '/_build' && req.method === 'POST') { const b = subirBuild(r.cuerpo ?? {}); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(b)); r.control = true; return; }
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
        case 'GET /v1/builds': {
          // filter[app], filter[version] (el número), filter[preReleaseVersion.version] (la versión); fields[builds] sin campos que no existen.
          const L = [...builds.values()].filter((b) => (!q('filter[app]') || b.app === q('filter[app]')) && (!q('filter[version]') || b.build === q('filter[version]')) && (!q('filter[preReleaseVersion.version]') || b.version === q('filter[preReleaseVersion.version]')));
          const malos = (q('fields[builds]') ?? '').split(',').filter((f) => f && !ASC.build.includes(f));
          if (malos.length) return err(res, 400, 'PARAMETER_ERROR.INVALID', 'A parameter has an invalid value', `fields[builds] no tiene ${malos.join(', ')}`, r);
          return ok(res, 200, { data: L.slice(0, Number(q('limit') ?? 50)).map((b) => ({ type: 'builds', id: b.id, attributes: { version: b.build, processingState: b.estado } })) }, r);
        }
        case 'POST /v1/betaGroups/{id}/relationships/builds': {
          if (!/^grp-int-/.test(p.id ?? '')) return err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
          for (const d of r.cuerpo.data) { const b = builds.get(d.id); if (!b) return err(res, 422, 'ENTITY_ERROR.RELATIONSHIP.INVALID', 'build', 'build que no existe', r); if (b.estado !== 'VALID') return err(res, 422, 'ENTITY_ERROR.RELATIONSHIP.INVALID', 'build', 'build sin procesar', r); enGrupo.push({ grupo: p.id, build: d.id }); }
          return ok(res, 204, null, r);
        }
        // ── 8i · La ficha como borrador ──
        case 'GET /v1/apps/{id}/appStoreVersions': {
          if (![...apps.values()].some((a) => a.id === p.id)) return err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
          const est = q('filter[appStoreState]');
          if (est && !est.split(',').every((x) => ASC.estadosVersion.includes(x))) return err(res, 400, 'PARAMETER_ERROR.INVALID', 'A parameter has an invalid value', `filter[appStoreState] ${est}`, r);
          const hay = !sinVersion.has(p.id) && (!est || est.split(',').includes('PREPARE_FOR_SUBMISSION'));
          return ok(res, 200, { data: hay ? [{ type: 'appStoreVersions', id: `ver-${p.id}`, attributes: { versionString: '1.0.0', appStoreState: 'PREPARE_FOR_SUBMISSION', platform: 'IOS' } }] : [] }, r);
        }
        case 'GET /v1/appStoreVersions/{id}/appStoreVersionLocalizations': return ok(res, 200, { data: [...locV.values()].filter((x) => x.version === p.id).map((x) => ({ type: 'appStoreVersionLocalizations', id: x.id, attributes: x.attrs })) }, r);
        case 'POST /v1/appStoreVersionLocalizations': {
          const v = r.cuerpo.data.relationships.appStoreVersion.data.id, a = r.cuerpo.data.attributes;
          if (!/^ver-/.test(v)) return err(res, 404, 'NOT_FOUND', 'version', null, r);
          if ([...locV.values()].some((x) => x.version === v && x.attrs.locale === a.locale)) return err(res, 409, 'ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE', 'locale', null, r);
          const id = `avl-${++n}`; locV.set(id, { id, version: v, attrs: a });
          return ok(res, 201, { data: { type: 'appStoreVersionLocalizations', id, attributes: a } }, r);
        }
        case 'PATCH /v1/appStoreVersionLocalizations/{id}': case 'PATCH /v1/appInfoLocalizations/{id}': {
          const M = p.k.includes('appInfo') ? locI : locV, x = M.get(p.id);
          if (!x || r.cuerpo.data.id !== p.id) return err(res, x ? 409 : 404, x ? 'ENTITY_ERROR.ID.INVALID' : 'NOT_FOUND', 'id', null, r);
          x.attrs = { ...x.attrs, ...r.cuerpo.data.attributes };
          return ok(res, 200, { data: { type: r.cuerpo.data.type, id: p.id, attributes: x.attrs } }, r);
        }
        case 'GET /v1/apps/{id}/appInfos': {
          if (![...apps.values()].some((a) => a.id === p.id)) return err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
          return ok(res, 200, { data: [{ type: 'appInfos', id: `info-${p.id}`, attributes: { state: 'PREPARE_FOR_SUBMISSION' } }] }, r);
        }
        case 'GET /v1/appInfos/{id}/appInfoLocalizations': return ok(res, 200, { data: [...locI.values()].filter((x) => x.info === p.id).map((x) => ({ type: 'appInfoLocalizations', id: x.id, attributes: x.attrs })) }, r);
        case 'POST /v1/appInfoLocalizations': {
          const i = r.cuerpo.data.relationships.appInfo.data.id, a = r.cuerpo.data.attributes;
          if ([...locI.values()].some((x) => x.info === i && x.attrs.locale === a.locale)) return err(res, 409, 'ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE', 'locale', null, r);
          if ([...(a.name ?? '')].length > 30 || [...(a.subtitle ?? '')].length > 30) return err(res, 409, 'ENTITY_ERROR.ATTRIBUTE.INVALID.TOO_LONG', 'name/subtitle', 'más de 30', r);
          const id = `ail-${++n}`; locI.set(id, { id, info: i, attrs: a });
          return ok(res, 201, { data: { type: 'appInfoLocalizations', id, attributes: a } }, r);
        }
        case 'GET /v1/appInfos/{id}/ageRatingDeclaration': return ok(res, 200, { data: { type: 'ageRatingDeclarations', id: `edad-${p.id}`, attributes: edad.get(`edad-${p.id}`) ?? {} } }, r);
        case 'PATCH /v1/ageRatingDeclarations/{id}': { edad.set(p.id, { ...(edad.get(p.id) ?? {}), ...r.cuerpo.data.attributes }); return ok(res, 200, { data: { type: 'ageRatingDeclarations', id: p.id, attributes: edad.get(p.id) } }, r); }
        case 'GET /v1/appStoreVersions/{id}/appStoreReviewDetail': { const d = [...detalle.values()].find((x) => x.version === p.id); return d ? ok(res, 200, { data: { type: 'appStoreReviewDetails', id: d.id, attributes: d.attrs } }, r) : err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r); }
        case 'POST /v1/appStoreReviewDetails': { const id = `rev-${++n}`; detalle.set(id, { id, version: r.cuerpo.data.relationships.appStoreVersion.data.id, attrs: r.cuerpo.data.attributes }); return ok(res, 201, { data: { type: 'appStoreReviewDetails', id, attributes: r.cuerpo.data.attributes } }, r); }
        case 'PATCH /v1/appStoreReviewDetails/{id}': { const d = detalle.get(p.id); if (!d) return err(res, 404, 'NOT_FOUND', 'x', null, r); d.attrs = { ...d.attrs, ...r.cuerpo.data.attributes }; return ok(res, 200, { data: { type: 'appStoreReviewDetails', id: p.id, attributes: d.attrs } }, r); }
        case 'GET /v1/appStoreVersionLocalizations/{id}/appScreenshotSets': {
          const t = q('filter[screenshotDisplayType]');
          if (t && !ASC.pantallas.includes(t)) return err(res, 400, 'PARAMETER_ERROR.INVALID', 'A parameter has an invalid value', `screenshotDisplayType ${t}`, r);
          return ok(res, 200, { data: [...juegos.values()].filter((x) => x.loc === p.id && (!t || x.tipo === t)).map((x) => ({ type: 'appScreenshotSets', id: x.id, attributes: { screenshotDisplayType: x.tipo } })) }, r);
        }
        case 'POST /v1/appScreenshotSets': {
          const t = r.cuerpo.data.attributes.screenshotDisplayType, loc = r.cuerpo.data.relationships?.appStoreVersionLocalization?.data?.id;
          if (!ASC.pantallas.includes(t)) return err(res, 422, 'ENTITY_ERROR.ATTRIBUTE.INVALID', 'screenshotDisplayType', `tipo ${t}`, r);
          if (!locV.has(loc)) return err(res, 404, 'NOT_FOUND', 'localization', null, r);
          const id = `set-${++n}`; juegos.set(id, { id, loc, tipo: t });
          return ok(res, 201, { data: { type: 'appScreenshotSets', id, attributes: { screenshotDisplayType: t } } }, r);
        }
        case 'GET /v1/appScreenshotSets/{id}/appScreenshots': return ok(res, 200, { data: [...capturas.values()].filter((x) => x.set === p.id && x.estado === 'COMPLETE').map((x) => ({ type: 'appScreenshots', id: x.id, attributes: { fileName: x.nombre, fileSize: x.tam, sourceFileChecksum: x.md5 } })) }, r);
        case 'POST /v1/appScreenshots': {
          const a = r.cuerpo.data.attributes, set = r.cuerpo.data.relationships.appScreenshotSet.data.id;
          if (!juegos.has(set)) return err(res, 404, 'NOT_FOUND', 'set', null, r);
          if ([...capturas.values()].filter((x) => x.set === set).length >= 10) return err(res, 409, 'ENTITY_ERROR', 'max 10', 'más de 10 capturas', r);
          const id = `cap-${++n}`; capturas.set(id, { id, set, nombre: a.fileName, tam: a.fileSize, estado: 'AWAITING_UPLOAD', md5: null });
          return ok(res, 201, { data: { type: 'appScreenshots', id, attributes: { fileName: a.fileName, fileSize: a.fileSize, uploadOperations: [{ method: 'PUT', url: `${base}/_subir/${id}`, length: a.fileSize, offset: 0, requestHeaders: [{ name: 'Content-Type', value: 'image/png' }] }] } } }, r);
        }
        case 'PATCH /v1/appScreenshots/{id}': {
          const c = capturas.get(p.id), b = subidas.get(p.id), a = r.cuerpo.data.attributes;
          if (!c) return err(res, 404, 'NOT_FOUND', 'x', null, r);
          if (!b || b.length !== c.tam) return err(res, 409, 'STATE_ERROR', 'upload incomplete', 'no se subió todo', r);
          if (a.uploaded !== true || a.sourceFileChecksum !== crypto.createHash('md5').update(b).digest('hex')) return err(res, 409, 'STATE_ERROR', 'checksum', 'el MD5 no coincide', r);
          c.estado = 'COMPLETE'; c.md5 = a.sourceFileChecksum;
          return ok(res, 200, { data: { type: 'appScreenshots', id: p.id, attributes: { sourceFileChecksum: c.md5, assetDeliveryState: { state: 'COMPLETE' } } } }, r);
        }
        case 'DELETE /v1/appScreenshots/{id}': return capturas.delete(p.id) ? ok(res, 204, null, r) : err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
        case 'DELETE /v1/betaTesters/{id}': return testers.delete(p.id) ? ok(res, 204, null, r) : err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
        case 'DELETE /v1/userInvitations/{id}': return invitaciones.delete(p.id) ? ok(res, 204, null, r) : err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
        case 'DELETE /v1/users/{id}': return usuarios.delete(p.id) ? ok(res, 204, null, r) : err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
        default: return err(res, 404, 'NOT_FOUND', 'The specified resource does not exist', null, r);
      }
    });
  });
  let base = '';
  await new Promise((ok2) => server.listen(o.puerto ?? 0, '127.0.0.1', ok2));
  base = `http://127.0.0.1:${server.address().port}`;
  return { url: base, locV, locI, edad, detalle, juegos, capturas, registro, usuarios, invitaciones, testers, builds, enGrupo, subirBuild, aceptar, cerrar: () => new Promise((ok2) => server.close(ok2)) };
}

module.exports = { arrancar, validar, verificarJwt, ASC };
if (require.main === module) {
  // node scripts/tiendas-sim/sim.cjs <puerto> <llave pública PEM> <emisor> <kid>  (las apps salen de apps/mobile/apps.json)
  const apps = JSON.parse(fs.readFileSync(path.join(__dirname, '../../apps/mobile/apps.json'), 'utf8')).apps.map((a, i) => ({ bundle: a.ios, id: 6400000001 + i }));
  arrancar({ puerto: Number(process.argv[2] ?? 4404), publica: process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : null, emisor: process.argv[4], kid: process.argv[5], apps })
    .then((s) => console.log(`simulador de App Store Connect en ${s.url}`));
}
