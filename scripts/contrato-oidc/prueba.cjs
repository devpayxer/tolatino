/* Contrato del OIDC de GitHub (8h, fase8-apps.md §3.5; guardián oidcEstricto): el código REAL de lib/tiendas/oidc.ts (compilado aparte).
   · Con la llave de PRUEBA que imita a GitHub (scripts/tiendas-sim/github.cjs): un token bueno entra; cada uno de estos sale con SU motivo:
     otro repo (nombre o id), otro dueño, otro entorno, otra rama o una etiqueta, otro evento, otro flujo, un runner propio, un pull request, otra
     audiencia, otro emisor, vencido, del futuro, vida de más; alg none, HS256 con la llave pública como secreto, RS512, crit/jku/jwk incrustados,
     typ raro, kid desconocido, llave de 1024 bits, firma de otra llave, cuerpo cambiado, sha o run raros, JWKS caído; el JWKS no se vuelve a pedir
     por cada kid inventado.
   · CONTRATO_OIDC_REAL=1 (en el CI de las tiendas): el token REAL de GitHub para este job, contra el JWKS REAL de GitHub: firma, emisor, audiencia,
     repo e ids, entorno «tiendas», flujo tiendas.yml, runner de GitHub y tiempos. Con la rama de este run entra; con solo «pruebas» (si este run
     no es de pruebas) sale por «rama». El token se enmascara y nunca se imprime. */
const crypto = require('crypto'), path = require('path');
const OUT = process.env.CONTRATO_OUT, gh = require(path.join(__dirname, '../tiendas-sim/github.cjs'));
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };

(async () => {
  const O = require(OUT + '/oidc.js');
  const S = await gh.arrancar({});
  const RAMAS = { ramas: ['refs/heads/pruebas'] };
  try {
    console.log('Tokens de prueba (llave RSA hecha ahora, como la de GitHub)');
    let pedidos = 0;
    const L = O.llavesDe(S.url + '/.well-known/jwks', async (u) => { pedidos++; return (await fetch(u)).json(); });
    const v = (t, ramas = RAMAS) => O.verificar(t, L, ramas);
    const bueno = await v(S.firmar(gh.claims()));
    ok(bueno.ok === true, 'un token del job de las tiendas (pruebas, workflow_dispatch, entorno tiendas) entra');
    ok((await v(S.firmar(gh.claims({ event_name: 'push' })))).ok, 'push también entra');
    const casos = [
      ['otro repositorio', { repository: 'ajeno/tolatino' }, 'repo'], ['otro id del repositorio (repo borrado y recreado)', { repository_id: '999' }, 'repo'],
      ['otro dueño', { repository_owner: 'otro' }, 'dueno'], ['otro id del dueño', { repository_owner_id: '1' }, 'dueno'],
      ['sin entorno', { environment: null, sub: 'repo:devpayxer/tolatino:ref:refs/heads/pruebas' }, 'entorno'], ['otro entorno', { environment: 'pruebas', sub: 'repo:devpayxer/tolatino:environment:pruebas' }, 'entorno'],
      ['sub de otro entorno', { sub: 'repo:devpayxer/tolatino:ref:refs/heads/pruebas' }, 'sub'],
      ['rama main', { ref: 'refs/heads/main', job_workflow_ref: 'devpayxer/tolatino/.github/workflows/tiendas.yml@refs/heads/main', workflow_ref: 'devpayxer/tolatino/.github/workflows/tiendas.yml@refs/heads/main' }, 'rama'],
      ['rama produccion (Fase 9)', { ref: 'refs/heads/produccion', job_workflow_ref: 'devpayxer/tolatino/.github/workflows/tiendas.yml@refs/heads/produccion', workflow_ref: 'devpayxer/tolatino/.github/workflows/tiendas.yml@refs/heads/produccion' }, 'rama'],
      ['una etiqueta llamada pruebas', { ref_type: 'tag' }, 'rama'], ['evento pull_request', { event_name: 'pull_request' }, 'evento'], ['evento pull_request_target', { event_name: 'pull_request_target' }, 'evento'],
      ['otro flujo del repo (cascaras.yml)', { job_workflow_ref: 'devpayxer/tolatino/.github/workflows/cascaras.yml@refs/heads/pruebas', workflow_ref: 'devpayxer/tolatino/.github/workflows/cascaras.yml@refs/heads/pruebas' }, 'flujo'],
      ['un flujo reutilizable ajeno', { job_workflow_ref: 'ajeno/x/.github/workflows/tiendas.yml@refs/heads/pruebas' }, 'flujo'],
      ['runner propio', { runner_environment: 'self-hosted' }, 'runner'], ['desde un pull request (head_ref)', { head_ref: 'parche' }, 'pr'],
      ['otra audiencia', { aud: 'sts.amazonaws.com' }, 'aud'], ['dos audiencias', { aud: ['tolatino-tiendas', 'otra'] }, 'aud'], ['otro emisor', { iss: 'https://token.actions.githubusercontent.com.evil.example' }, 'iss'],
      ['vencido', { iat: Math.floor(Date.now() / 1000) - 1200, nbf: Math.floor(Date.now() / 1000) - 1800, exp: Math.floor(Date.now() / 1000) - 600 }, 'vencido'],
      ['del futuro (nbf)', { nbf: Math.floor(Date.now() / 1000) + 600 }, 'antes_de_tiempo'], ['del futuro (iat)', { iat: Math.floor(Date.now() / 1000) + 600, exp: Math.floor(Date.now() / 1000) + 900 }, 'antes_de_tiempo'],
      ['vida de dos horas', { exp: Math.floor(Date.now() / 1000) + 7200 }, 'vida'], ['sin exp', { exp: undefined }, 'vida'],
      ['sha raro', { sha: 'zzz' }, 'jti'], ['jti corto', { jti: 'x' }, 'jti'],
    ];
    for (const [que, c, m] of casos) { const r = await v(S.firmar(gh.claims(c))); ok(!r.ok && r.motivo === m, `${que} → ${r.motivo}`); }
    const c0 = gh.claims(), [h0, p0] = S.firmar(c0).split('.');
    const b64 = (x) => Buffer.from(JSON.stringify(x)).toString('base64url');
    const pub = S.llaves[0].publicKey.export({ type: 'spki', format: 'pem' });
    const hs = (() => { const h = b64({ alg: 'HS256', kid: S.llaves[0].kid, typ: 'JWT' }); return `${h}.${p0}.${crypto.createHmac('sha256', pub).update(`${h}.${p0}`).digest('base64url')}`; })();
    const formas = [
      ['alg none sin firma', `${b64({ alg: 'none', typ: 'JWT' })}.${p0}.`, 'mal_formado'], ['alg none con firma de relleno', `${b64({ alg: 'none', kid: S.llaves[0].kid })}.${p0}.AAAA`, 'alg'],
      ['HS256 con la llave pública como secreto', hs, 'alg'], ['RS512', S.firmar(c0, { cabecera: { alg: 'RS512', kid: S.llaves[0].kid } }), 'alg'],
      ['alg en minúsculas', S.firmar(c0, { cabecera: { alg: 'rs256', kid: S.llaves[0].kid } }), 'alg'], ['crit', S.firmar(c0, { cabecera: { alg: 'RS256', kid: S.llaves[0].kid, crit: ['b64'] } }), 'alg'],
      ['jku a un JWKS ajeno', S.firmar(c0, { cabecera: { alg: 'RS256', kid: S.llaves[0].kid, jku: 'https://evil.example/jwks' } }), 'alg'],
      ['jwk incrustado', S.firmar(c0, { cabecera: { alg: 'RS256', kid: S.llaves[0].kid, jwk: S.llaves[0].jwk } }), 'alg'], ['typ raro', S.firmar(c0, { cabecera: { alg: 'RS256', kid: S.llaves[0].kid, typ: 'at+jwt' } }), 'alg'],
      ['sin kid', S.firmar(c0, { cabecera: { alg: 'RS256', typ: 'JWT' } }), 'kid'], ['kid desconocido', S.firmar(c0, { kidFalso: 'no-existe' }), 'kid'],
      ['firma de la otra llave con el kid de la primera', S.firmar(c0, { kid: S.llaves[1].kid, kidFalso: S.llaves[0].kid }), 'firma'],
      ['cuerpo cambiado después de firmar', `${h0}.${b64({ ...c0, repository: 'devpayxer/tolatino', ref: 'refs/heads/main' })}.${S.firmar(c0).split('.')[2]}`, 'firma'],
      ['cuatro partes', `${S.firmar(c0)}.x`, 'mal_formado'], ['basura', 'no-es-un-jwt', 'mal_formado'], ['enorme', 'a'.repeat(9000), 'mal_formado'],
    ];
    for (const [que, t, m] of formas) { const r = await v(t); ok(!r.ok && r.motivo === m, `${que} → ${r.motivo}`); }
    ok((await v(S.firmar(c0))).ok, 'el mismo token, entero, sigue verificando (el jti lo gasta la base, no este módulo)');
    const antes = pedidos;
    for (let i = 0; i < 5; i++) await v(S.firmar(c0, { kidFalso: `inventado-${i}` }));
    ok(pedidos - antes <= 1, `cinco kids inventados → ${pedidos - antes} pedido(s) al JWKS (como mucho uno por minuto)`);
    const chica = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 }), jw = chica.publicKey.export({ format: 'jwk' });
    const Lchica = O.llavesDe('http://chica', async () => ({ keys: [{ kty: 'RSA', kid: 'k1024', n: jw.n, e: jw.e }] }));
    const h1 = b64({ alg: 'RS256', kid: 'k1024', typ: 'JWT' }), t1024 = `${h1}.${p0}.${crypto.sign('sha256', Buffer.from(`${h1}.${p0}`), chica.privateKey).toString('base64url')}`;
    ok((await O.verificar(t1024, Lchica, RAMAS)).motivo === 'kid', 'una llave RSA de 1024 bits en el JWKS → kid (mínimo 2048)');
    const Lcaido = O.llavesDe('http://caido', async () => { throw new Error('sin red'); });
    ok((await O.verificar(S.firmar(c0), Lcaido, RAMAS)).motivo === 'jwks', 'JWKS caído → jwks (el servidor contesta 503, no deja pasar)');
    ok(O.EMISOR === 'https://token.actions.githubusercontent.com' && O.AUDIENCIA === 'tolatino-tiendas' && O.JWKS_GITHUB === 'https://token.actions.githubusercontent.com/.well-known/jwks', 'emisor, audiencia y JWKS de GitHub fijos');

    if (process.env.CONTRATO_OIDC_REAL === '1') {
      console.log('El token REAL de GitHub para este job, contra el JWKS REAL de GitHub');
      const U = process.env.ACTIONS_ID_TOKEN_REQUEST_URL, T = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
      ok(!!U && !!T, 'el job tiene permiso id-token: write');
      const j = await (await fetch(`${U}&audience=tolatino-tiendas`, { headers: { authorization: `bearer ${T}` } })).json();
      ok(typeof j.value === 'string' && j.value.length > 100, 'GitHub dio un token');
      console.log(`::add-mask::${j.value}`);
      O.olvidarJwks();
      const R = O.llavesDe(O.JWKS_GITHUB), ref = process.env.GITHUB_REF;
      const r = await O.verificar(j.value, R, { ramas: [ref] });
      const c = JSON.parse(Buffer.from(j.value.split('.')[1], 'base64url'));
      console.log(`    (repo ${c.repository} · id ${c.repository_id} · dueño ${c.repository_owner}/${c.repository_owner_id} · entorno ${c.environment} · ${c.ref} · ${c.event_name} · ${c.runner_environment} · ${c.job_workflow_ref} · vida ${c.exp - c.iat} s)`);
      ok(r.ok, `el token real entra con la rama de este run (${r.ok ? 'ok' : r.motivo})`);
      if (ref !== 'refs/heads/pruebas') { const r2 = await O.verificar(j.value, R, RAMAS); ok(!r2.ok && r2.motivo === 'rama', `con solo «pruebas» permitida, este run (${ref}) sale por rama`); }
      const [hh, pp, ff] = j.value.split('.'), cambiado = `${hh}.${Buffer.from(JSON.stringify({ ...c, repository: 'otro/repo' })).toString('base64url')}.${ff}`;
      ok((await O.verificar(cambiado, R, { ramas: [ref] })).motivo === 'firma', 'el token real con el cuerpo cambiado → firma');
      void pp;
    }
  } finally { await S.cerrar(); }
  console.log(`\n${n} comprobaciones del contrato del OIDC de GitHub`);
})().catch((e) => { console.error(e); process.exit(1); });
