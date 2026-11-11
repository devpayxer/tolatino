/* 8h · Simulador de GitHub para la tubería de las tiendas (fase8-apps.md §4 8h): (1) el JWKS de token.actions.githubusercontent.com con llaves
   RSA DE PRUEBA hechas en el momento (nunca en el repo) y `firmar(claims)` que emite tokens con la forma EXACTA de los de GitHub Actions (las
   mismas claims, RS256, kid); (2) la API REST de workflow_dispatch (POST /repos/{owner}/{repo}/actions/workflows/{flujo}/dispatches → 204), que
   revisa lo que revisa GitHub: el token (Bearer), Accept y X-GitHub-Api-Version, que el flujo exista en .github/workflows con workflow_dispatch,
   que la rama exista y que cada input esté DECLARADO en ese flujo (si no, 422 «Unexpected inputs provided») y, si es de opciones, que el valor
   esté entre ellas. Lo usan el contrato (scripts/contrato-oidc) y la prueba de punta a punta (tien8h). Sin dependencias. */
'use strict';
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '../..');
const b64u = (x) => Buffer.from(x).toString('base64url');

/* Los inputs de workflow_dispatch de un flujo (lectura mínima del YAML del repo: nombre, tipo y opciones). */
function inputsDe(flujo) {
  const p = path.join(RAIZ, '.github/workflows', flujo);
  if (!fs.existsSync(p)) return null;
  const t = fs.readFileSync(p, 'utf8'), m = /\n  workflow_dispatch:\s*\n((?: {4}.*\n|\s*\n)*)/.exec(t);
  if (!m) return null;
  const out = {}, L = m[1].split('\n');
  let actual = null, enOpciones = false;
  for (const l of L) {
    let x;
    if ((x = /^ {6}([a-z_][\w-]*):\s*$/i.exec(l))) { actual = x[1]; out[actual] = { tipo: 'string', opciones: null }; enOpciones = false; }
    else if (actual && (x = /^ {8}type:\s*(\w+)/.exec(l))) out[actual].tipo = x[1];
    else if (actual && (x = /^ {8}options:\s*\[(.*)\]\s*$/.exec(l))) out[actual].opciones = x[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    else if (actual && /^ {8}options:\s*$/.test(l)) { out[actual].opciones = []; enOpciones = true; }
    else if (actual && enOpciones && (x = /^ {10}- (.+)$/.exec(l))) out[actual].opciones.push(x[1].trim().replace(/^["']|["']$/g, ''));
    else if (/^ {8}\w/.test(l)) enOpciones = false;
  }
  return out;
}

function llave(kid) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const j = publicKey.export({ format: 'jwk' });
  return { kid, privateKey, publicKey, jwk: { kty: 'RSA', alg: 'RS256', use: 'sig', kid, n: j.n, e: j.e } };
}

/* Las claims de un token de GitHub Actions para el job de las tiendas (lo que manda GitHub de verdad), con lo que se quiera cambiar. */
function claims(o = {}) {
  const ahora = Math.floor(Date.now() / 1000), ref = o.ref ?? 'refs/heads/pruebas', repo = o.repository ?? 'devpayxer/tolatino', env = 'environment' in o ? o.environment : 'tiendas';
  const c = {
    jti: crypto.randomUUID(), sub: `repo:${repo}:environment:${env}`, aud: 'tolatino-tiendas', ref, sha: crypto.randomBytes(20).toString('hex'), repository: repo,
    repository_owner: repo.split('/')[0], repository_owner_id: '281237548', repository_id: '1283030677', repository_visibility: 'public', run_id: String(43000000000 + Math.floor(Math.random() * 1e6)),
    run_number: '7', run_attempt: '1', actor: 'devpayxer', actor_id: '281237548', workflow: 'Tiendas', event_name: 'workflow_dispatch', ref_type: 'branch', ref_protected: 'false',
    head_ref: '', base_ref: '', environment: env, job_workflow_ref: `${repo}/.github/workflows/tiendas.yml@${ref}`, workflow_ref: `${repo}/.github/workflows/tiendas.yml@${ref}`,
    runner_environment: 'github-hosted', iss: 'https://token.actions.githubusercontent.com', nbf: ahora - 600, exp: ahora + 300, iat: ahora,
  };
  for (const [k, v] of Object.entries(o)) if (v === undefined) delete c[k]; else c[k] = v;
  if (c.environment === null) delete c.environment;
  return c;
}

async function arrancar(o = {}) {
  // Kids nuevos en cada arranque (como cuando GitHub rota llaves): un servidor que guardó el JWKS de otra corrida no los confunde.
  const pre = `tl-prueba-${crypto.randomBytes(4).toString('hex')}`, llaves = [llave(`${pre}-1`), llave(`${pre}-2`)], registro = [], lanzados = [];
  const token = o.token ?? null, ramas = o.ramas ?? ['main', 'pruebas'];
  const firmar = (c, x = {}) => {
    const k = llaves.find((l) => l.kid === x.kid) ?? llaves[0];
    const h = b64u(JSON.stringify(x.cabecera ?? { alg: 'RS256', kid: x.kidFalso ?? k.kid, typ: 'JWT', x5t: 'prueba' })), p = b64u(JSON.stringify(c));
    return `${h}.${p}.${crypto.sign('sha256', Buffer.from(`${h}.${p}`), k.privateKey).toString('base64url')}`;
  };
  const server = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (d) => { cuerpo += d; if (cuerpo.length > 100000) req.destroy(); });
    req.on('end', () => {
      const u = new URL(req.url, 'http://x'), r = { metodo: req.method, ruta: u.pathname, at: Date.now() };
      registro.push(r);
      const out = (s, j) => { r.status = s; res.writeHead(s, j ? { 'content-type': 'application/json' } : {}); res.end(j ? JSON.stringify(j) : undefined); };
      if (u.pathname === '/.well-known/jwks' && req.method === 'GET') return out(200, { keys: llaves.map((l) => l.jwk) });
      const m = /^\/repos\/([\w.-]+)\/([\w.-]+)\/actions\/workflows\/([\w.-]+)\/dispatches$/.exec(u.pathname);
      if (m && req.method === 'POST') {
        const auth = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
        if (!token || auth !== token) return out(401, { message: 'Bad credentials', status: '401' });
        if (req.headers.accept !== 'application/vnd.github+json' || req.headers['x-github-api-version'] !== '2022-11-28') return out(400, { message: 'Accept application/vnd.github+json y X-GitHub-Api-Version 2022-11-28' });
        if (`${m[1]}/${m[2]}` !== 'devpayxer/tolatino') return out(404, { message: 'Not Found' });
        const ins = inputsDe(m[3]);
        if (!ins) return out(404, { message: 'Not Found' });
        let b; try { b = JSON.parse(cuerpo); } catch { return out(400, { message: 'Problems parsing JSON' }); }
        if (!ramas.includes(String(b.ref ?? ''))) return out(422, { message: `No ref found for: ${b.ref}` });
        const extra = Object.keys(b.inputs ?? {}).filter((k) => !ins[k]);
        if (extra.length) return out(422, { message: `Unexpected inputs provided: ${JSON.stringify(extra)}` });
        for (const [k, v] of Object.entries(b.inputs ?? {})) if (typeof v !== 'string' || (ins[k].tipo === 'choice' && !ins[k].opciones.includes(v))) return out(422, { message: `Provided value '${v}' for input '${k}' not in the list of allowed values` });
        lanzados.push({ flujo: m[3], ref: b.ref, inputs: b.inputs ?? {} });
        return out(204);
      }
      return out(404, { message: 'Not Found' });
    });
  });
  await new Promise((ok) => server.listen(o.puerto ?? 0, '127.0.0.1', ok));
  return { url: `http://127.0.0.1:${server.address().port}`, llaves, firmar, claims, registro, lanzados, inputsDe, cerrar: () => new Promise((ok) => server.close(ok)) };
}

module.exports = { arrancar, claims, inputsDe, llave };
if (require.main === module) arrancar({ puerto: Number(process.argv[2] ?? 4407), token: process.argv[3] ?? null }).then((s) => console.log(`simulador de GitHub en ${s.url}`));
