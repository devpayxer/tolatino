// 8h · La tubería de las tiendas de punta a punta contra el servidor de :3100 (servir8h.sh): simuladores de GitHub (JWKS con una llave RSA de
// PRUEBA que imita la de GitHub + workflow_dispatch, :4407), App Store Connect (:4404) y Google Play (:4408). Lo que hace nginx (X-Forwarded-Proto)
// lo pone la prueba: sin él, es HTTP.
// 1 · Cada rechazo por la API (HTTP sin HTTPS, sin token, otro repo, otra rama, produccion, otro entorno, otra audiencia, jti repetido, vencido,
//     alg none, HS256 con la llave pública, kid desconocido, otro evento, otro flujo, runner propio), el libro de intentos, el tope por minuto y
//     el interruptor. 2 · El job feliz: las llaves de cada job (y solo esas; la contraseña del almacén derivada abre el .p12), cada lectura anotada
//     con su run. 3 · Builds: compilando → subido / APK propio disponible / .aab → Play interno (simulador del descubrimiento oficial), TestFlight
//     procesado por Apple → grupo interno, Play sin la cuenta espera y el barrido lo sube, build ajeno, no creciente, el servidor decide, símbolos,
//     tamaño, producción rechazada. 4 · Las paredes de la base. 5 · Super Admin a 390 y 1360: Versiones en vivo, «Pedir un build» (sin token y con
//     él: el workflow_dispatch con los inputs del flujo), Integraciones con las lecturas del CI y los intentos; Soporte no pide builds.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'); const crypto = require('crypto');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100', REPO = ENT.RAIZ, TOKEN_BARRIDO = ENT.TOK;
const GH = require(REPO + '/scripts/tiendas-sim/github.cjs'), ASC = require(REPO + '/scripts/tiendas-sim/sim.cjs'), PLAY = require(REPO + '/scripts/tiendas-sim/play.cjs');
const APPS = JSON.parse(fs.readFileSync(REPO + '/apps/mobile/apps.json', 'utf8')), VERSION = APPS.version;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlFalla = (q) => { try { sql(q); return null; } catch (e) { return String(e.stderr); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); const r = await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); if (!r.ok) throw new Error('no entró ' + tel); };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });
const ADM = '5705550199', DAYANA = '5705550677';
const env = ENT.env; // los secretos de la corrida (pruebas/servir/servir.sh)
// La contraseña del almacén que el servidor deriva (lib/tiendas/llavero.ts claveAlmacen): el job que CREA la llave la recibiría igual.
const claveAlmacen = (tipo, v) => { const s = (env.LLAVERO_SECRET && env.LLAVERO_SECRET.length >= 32) ? env.LLAVERO_SECRET : env.DATOS_SECRET; return Buffer.from(crypto.hkdfSync('sha256', Buffer.from(s), Buffer.from('tl:llavero:v1'), Buffer.from(`${tipo}:clave:v${v}`), 32)).toString('base64url').slice(0, 32); };
const zip = (n2 = 600) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), crypto.randomBytes(n2)]);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

(async () => {
  const T0 = sql(`select now()::text`);
  const GHTOKEN = 'github_pat_' + crypto.randomBytes(41).toString('hex').slice(0, 82);
  // ── Preparar (solo esta base local; la base no deja borrar: replica) ──
  sql(`set session_replication_role = replica; delete from store_submissions; delete from app_builds where is_test = false; update app_builds set request_id = null where request_id is not null; delete from build_requests; delete from ci_oidc_log; delete from ci_oidc_jti`);
  sql(`set session_replication_role = replica; delete from store_secret_reads where secret_id in (select id from store_secrets where kind in ('asc_api_key', 'android_upload_keystore', 'play_service_account', 'github_token', 'ios_dist_cert')); delete from store_secrets where kind in ('asc_api_key', 'android_upload_keystore', 'play_service_account', 'github_token', 'ios_dist_cert')`);
  sql(`delete from platform_config where key in ('tiendas_pedidos_hora', 'tiendas_oidc_fallos_min', 'tiendas_archivo_mb')`);
  sql(`update feature_flags set enabled = true where key = 'app.tiendas.tuberia'`); sql(`update feature_flags set enabled = false where key = 'app.tiendas.publico'`);
  const gh = await GH.arrancar({ puerto: 4407, token: GHTOKEN });
  const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }), KID = 'ZX9Y8W7V6U', EMISOR = '57246542-96fe-1a63-e053-0824d011072a';
  const asc = await ASC.arrancar({ puerto: 4404, publica: kp.publicKey, emisor: EMISOR, kid: KID, apps: APPS.apps.map((a, i) => ({ bundle: a.ios, id: 6400000001 + i })) });
  const cuenta = PLAY.cuentaDePrueba(), desc = JSON.parse(fs.readFileSync(ENT.rec('androidpublisher-v3.json'), 'utf8'));
  const play = await PLAY.arrancar({ puerto: 4408, descubrimiento: desc, cuenta, paquetes: APPS.apps.map((a) => a.android) });
  const br = await chromium.launch(), errs = [];
  const pagina = async (k, w) => { const cx = await br.newContext({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: 1, locale: 'es-US' }); const p = await cx.newPage(); p.on('pageerror', (e) => errs.push(`${k}: ${e.message}`)); return p; };
  const rq = await (await br.newContext()).request;
  // El CI: un pedido con un token (por defecto, por HTTPS como lo deja nginx).
  const tok = (c = {}, x = {}) => gh.firmar(GH.claims(c), x);
  const ci = async (ruta, t, cuerpo, o = {}) => {
    const h = { ...(o.http ? {} : { 'x-forwarded-proto': o.proto ?? 'https' }), ...(t ? { authorization: `Bearer ${t}` } : {}), ...(o.h ?? {}) };
    const r = o.put ? await rq.put(B + ruta, { headers: { ...h, 'content-type': 'application/octet-stream' }, data: cuerpo }) : await rq.post(B + ruta, { headers: h, data: cuerpo ?? {} });
    let j = {}; try { j = await r.json(); } catch { /* sin cuerpo */ }
    return { s: r.status(), j };
  };
  const barrido = async () => (await rq.post(B + '/api/interno/barrido', { headers: { 'x-barrido-token': TOKEN_BARRIDO } })).json();
  const subirLlave = async (p, tipo, nombre, contenido, extra = {}) => {
    // Los límites de códigos por teléfono y por dirección (la de esta máquina junta todas las pruebas): solo en esta base local.
    sql(`delete from otp_codes where created_at > now() - interval '2 hours' and (phone = '+1${ADM}' or ip in ('127.0.0.1', '::1', '::ffff:127.0.0.1'))`);
    const c = await p.evaluate(async () => (await fetch('/api/admin/llavero/codigo', { method: 'POST' })).json());
    if (!c.ok) console.log('código:', c);
    return p.evaluate(async ([tipo, nombre, b64, cod, extra]) => { const f = new FormData(); f.set('tipo', tipo); f.set('codigo', cod); f.set('motivo', 'Prueba 8h de la tubería'); for (const [k, v] of Object.entries(extra)) f.set(k, v); f.set('archivo', new File([Uint8Array.from(atob(b64), (x) => x.charCodeAt(0))], nombre)); return (await fetch('/api/admin/llavero', { method: 'POST', body: f })).json(); }, [tipo, nombre, Buffer.from(contenido).toString('base64'), c.codigoPrueba, extra]);
  };
  const log = () => sql(`select motivo || '|' || coalesce(repo, '-') || '|' || coalesce(ref, '-') from ci_oidc_log order by id desc limit 1`);
  try {
    const pa = await pagina('admin', 1360); await entrar(pa, ADM);

    console.log('1 · Cada rechazo de la tubería, con su motivo en el libro (y sin gastar nada)');
    const t0 = tok();
    let r = await ci('/api/tiendas/oidc', t0, { job: 'android', app: 'cliente' }, { http: true });
    ok(r.s === 403 && r.j.motivo === 'sin_https' && log() === 'sin_https|-|-', 'por HTTP (sin X-Forwarded-Proto) → 403 sin_https, antes de mirar el token (no se anota lo que dice)');
    r = await ci('/api/tiendas/oidc', t0, { job: 'android', app: 'cliente' }, { proto: 'http' });
    ok(r.s === 403 && r.j.motivo === 'sin_https', 'X-Forwarded-Proto: http → 403');
    ok(sql(`select count(*) from ci_oidc_jti`) === '0', 'el jti de ese token no se gastó (nunca se miró)');
    r = await ci('/api/tiendas/oidc', null, {}); ok(r.s === 401 && r.j.motivo === 'sin_token', 'sin token → 401 sin_token');
    r = await ci('/api/tiendas/oidc', 'Basic abc', {}); ok(r.s === 401 && r.j.motivo === 'sin_token', 'otro esquema → 401');
    const casos = [
      ['otro repositorio', { repository: 'ajeno/tolatino' }, 'repo'], ['otro id del repo', { repository_id: '1' }, 'repo'], ['otra rama (main)', { ref: 'refs/heads/main', job_workflow_ref: 'devpayxer/tolatino/.github/workflows/tiendas.yml@refs/heads/main', workflow_ref: 'devpayxer/tolatino/.github/workflows/tiendas.yml@refs/heads/main' }, 'rama'],
      ['produccion en el sandbox', { ref: 'refs/heads/produccion', job_workflow_ref: 'devpayxer/tolatino/.github/workflows/tiendas.yml@refs/heads/produccion', workflow_ref: 'devpayxer/tolatino/.github/workflows/tiendas.yml@refs/heads/produccion' }, 'rama'],
      ['otro entorno', { environment: 'pruebas', sub: 'repo:devpayxer/tolatino:environment:pruebas' }, 'entorno'], ['otra audiencia', { aud: 'sts.amazonaws.com' }, 'aud'],
      ['vencido', { iat: Math.floor(Date.now() / 1000) - 1500, nbf: Math.floor(Date.now() / 1000) - 2000, exp: Math.floor(Date.now() / 1000) - 900 }, 'vencido'],
      ['un pull request', { event_name: 'pull_request' }, 'evento'], ['otro flujo (cascaras.yml)', { job_workflow_ref: 'devpayxer/tolatino/.github/workflows/cascaras.yml@refs/heads/pruebas', workflow_ref: 'devpayxer/tolatino/.github/workflows/cascaras.yml@refs/heads/pruebas' }, 'flujo'],
      ['runner propio', { runner_environment: 'self-hosted' }, 'runner'],
    ];
    for (const [que, c, m] of casos) { r = await ci('/api/tiendas/oidc', tok(c), { job: 'android', app: 'cliente' }); ok(r.s === 401 && r.j.motivo === m && log().startsWith(`${m}|`), `${que} → 401 ${r.j.motivo}`); }
    ok(log() === 'runner|devpayxer/tolatino|refs/heads/pruebas', 'con la firma buena, el libro anota qué dijo el token (repo y rama)');
    const c0 = GH.claims(), [, p0] = gh.firmar(c0).split('.'), b64 = (x) => Buffer.from(JSON.stringify(x)).toString('base64url');
    const pub = gh.llaves[0].publicKey.export({ type: 'spki', format: 'pem' }), hh = b64({ alg: 'HS256', kid: gh.llaves[0].kid, typ: 'JWT' });
    const formas = [['alg none', `${b64({ alg: 'none', typ: 'JWT' })}.${p0}.AAAA`, 'alg'], ['HS256 firmado con la llave pública', `${hh}.${p0}.${crypto.createHmac('sha256', pub).update(`${hh}.${p0}`).digest('base64url')}`, 'alg'],
      ['kid desconocido', gh.firmar(c0, { kidFalso: 'no-existe' }), 'kid'], ['firma de otra llave', gh.firmar(c0, { kid: gh.llaves[1].kid, kidFalso: gh.llaves[0].kid }), 'firma']];
    for (const [que, t, m] of formas) { r = await ci('/api/tiendas/oidc', t, { job: 'android', app: 'cliente' }); ok(r.s === 401 && r.j.motivo === m && log() === `${m}|-|-`, `${que} → 401 ${r.j.motivo} (sin firma buena, no se anota lo que dice)`); }
    sql(`update feature_flags set enabled = false where key = 'app.tiendas.tuberia'`);
    r = await ci('/api/tiendas/oidc', tok(), { job: 'android', app: 'cliente' }); ok(r.s === 503 && r.j.motivo === 'apagado', 'app.tiendas.tuberia apagado → 503');
    sql(`update feature_flags set enabled = true where key = 'app.tiendas.tuberia'`);

    console.log('2 · El job feliz: las llaves (solo las de su job), la contraseña del almacén y cada lectura anotada');
    const vAnd = Number(sql(`select coalesce(max(version), 0) + 1 from store_secrets where kind = 'android_upload_keystore'`));
    const CLAVE = claveAlmacen('android_upload_keystore', vAnd), D = fs.mkdtempSync(S + '/t8h-'), P12 = D + '/subida.p12';
    execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${D}/k.pem -out ${D}/c.pem -days 2 -subj "/CN=Prueba 8h llave de subida" 2>/dev/null && openssl pkcs12 -export -inkey ${D}/k.pem -in ${D}/c.pem -name subida -out ${P12} -passout pass:${CLAVE} 2>/dev/null`);
    const sk = await subirLlave(pa, 'android_upload_keystore', 'subida.p12', fs.readFileSync(P12), { alias: 'subida' }); if (!sk.ok) console.log(sk);
    ok(sk.ok, `Integraciones: la llave de subida (PKCS12, versión ${vAnd}) entra al llavero`);
    ok((await subirLlave(pa, 'asc_api_key', `AuthKey_${KID}.p8`, kp.privateKey.export({ type: 'pkcs8', format: 'pem' }), { emisor: EMISOR })).ok, 'la llave de App Store Connect');
    const tg = tok(), cg = JSON.parse(Buffer.from(tg.split('.')[1], 'base64url'));
    r = await ci('/api/tiendas/oidc', tg, { job: 'android', app: 'cliente' });
    ok(r.s === 200 && r.j.ok && r.j.llaves.length === 1 && r.j.llaves[0].tipo === 'android_upload_keystore' && r.j.llaves[0].meta.alias === 'subida', 'Android: SOLO la llave de subida (con su alias)');
    fs.writeFileSync(D + '/recibida.p12', Buffer.from(r.j.llaves[0].archivo, 'base64'));
    ok(sha(fs.readFileSync(D + '/recibida.p12')) === sha(fs.readFileSync(P12)) && r.j.llaves[0].huella === sha(fs.readFileSync(P12)), 'el archivo llega entero (la misma huella sha256)');
    ok(/subida/.test(execSync(`openssl pkcs12 -in ${D}/recibida.p12 -passin pass:${r.j.llaves[0].clave} -nokeys 2>/dev/null`).toString()) && r.j.llaves[0].clave === CLAVE, 'la contraseña DERIVADA que entrega el servidor abre el almacén (nunca se guardó)');
    ok(!JSON.stringify(r.j).includes('BEGIN') && !/apns|fcm|play_service|github/.test(JSON.stringify(r.j)), 'ni APNs, ni Firebase, ni Play, ni el token de GitHub van al CI');
    ok(sql(`select count(*) || '|' || min(r.ci_run) || '|' || min(r.ci_sha) from store_secret_reads r join store_secrets s on s.id = r.secret_id where r.by = 'ci' and s.kind = 'android_upload_keystore'`) === `1|${cg.run_id}|${cg.sha}`, 'la lectura queda anotada como del CI, con el run y el commit del token');
    r = await ci('/api/tiendas/oidc', tg, { job: 'android', app: 'cliente' });
    ok(r.s === 401 && r.j.motivo === 'jti_repetido' && log().startsWith('jti_repetido|devpayxer/tolatino'), 'el MISMO token otra vez → 401 jti_repetido (la inserción del jti es la prueba)');
    ok(sql(`select count(*) from store_secret_reads r join store_secrets s on s.id = r.secret_id where r.by = 'ci'`) === '1', 'y no leyó nada');
    r = await ci('/api/tiendas/oidc', t0, { job: 'android', app: 'cliente' });
    ok(r.s === 200, 'el token que llegó por HTTP no se gastó: por HTTPS entra (en la vida real ya no se manda por HTTP: el CI lo exige)');
    const tPar = tok(); const [x1, x2] = await Promise.all([ci('/api/tiendas/oidc', tPar, { job: 'ios', app: 'cliente' }), ci('/api/tiendas/oidc', tPar, { job: 'ios', app: 'cliente' })]);
    ok([x1.s, x2.s].sort().join() === '200,401', `el mismo token dos veces A LA VEZ → uno solo entra (${x1.s}, ${x2.s})`);
    const ios = x1.s === 200 ? x1.j : x2.j;
    ok(ios.llaves.length === 1 && ios.llaves[0].tipo === 'asc_api_key' && ios.llaves[0].meta.id_llave === KID && ios.llaves[0].meta.emisor === EMISOR && ios.faltan.join() === 'ios_dist_cert', 'iOS: la llave de App Store Connect (id y emisor); el certificado no está (la firma la administra Apple)');
    const EQ = sql(`select coalesce(meta->>'equipo', '') from store_secrets where kind = 'apns_key' and retired_at is null`);
    ok(EQ ? ios.equipo === EQ : ios.equipo === undefined, `iOS: el Team ID sale de los datos PÚBLICOS de la llave de APNs (la llave no) (${EQ || 'sin llave de APNs: no va'})`);
    r = await ci('/api/tiendas/oidc', tok(), { job: 'servidor', app: 'cliente' }); ok(r.s === 400 && log().startsWith('pedido_invalido'), 'un job que no existe → 400');

    console.log('3 · Builds: el CI dice compilando / subido / falló; lo demás lo decide el servidor');
    const RUN = GH.claims(), conRun = (o = {}) => tok({ run_id: RUN.run_id, sha: RUN.sha, ...o });
    const reg = (b, t = conRun()) => ci('/api/tiendas/build', t, b);
    const BL = 700 + Math.floor(Math.random() * 200);
    r = await reg({ app: 'cliente', plataforma: 'android', canal: 'apk_propio', version: VERSION, build: BL, estado: 'compilando' });
    ok(r.s === 201 && r.j.estado === 'compilando', `APK propio · cliente ${VERSION} (${BL}) → compilando`);
    ok(sql(`select commit_sha || '|' || ci_run_url || '|' || flavor || '|' || is_test from app_builds where id = ${r.j.id}`) === `${RUN.sha}|https://github.com/devpayxer/tolatino/actions/runs/${RUN.run_id}|pruebas|false`, 'el commit y el run salen del TOKEN (no del cuerpo); sabor pruebas');
    const apk = zip(4000);
    r = await ci(`/api/tiendas/archivo?tipo=apk&app=cliente&canal=apk_propio&build=${BL}`, conRun(), apk, { put: true, h: { 'x-tl-sha256': sha(Buffer.from('otro')) } });
    ok(r.s === 422, 'el APK con un sha256 que no es el suyo → 422');
    r = await ci(`/api/tiendas/archivo?tipo=apk&app=cliente&canal=apk_propio&build=${BL}`, tok(), apk, { put: true, h: { 'x-tl-sha256': sha(apk) } });
    ok(r.s === 403 && log().startsWith('build_ajeno'), 'otro run sube el APK de este build → 403 build_ajeno');
    r = await ci(`/api/tiendas/archivo?tipo=apk&app=cliente&canal=apk_propio&build=${BL}`, conRun(), apk, { put: true, h: { 'x-tl-sha256': sha(apk) } });
    ok(r.s === 200 && r.j.sha256 === sha(apk), 'el APK sube al almacén privado');
    ok(sql(`select status || '|' || artifact_key || '|' || sha256 || '|' || size_bytes from app_builds where app = 'cliente' and channel = 'apk_propio' and build = ${BL}`) === `disponible|privado/apk/app-${VERSION.replace(/\./g, '-')}-${BL}.apk|${sha(apk)}|${apk.length}`, 'APK propio → DISPONIBLE con su archivo, huella y tamaño (lo decide el servidor)');
    r = await ci(`/api/tiendas/archivo?tipo=apk&app=cliente&canal=apk_propio&build=${BL}`, conRun(), zip(), { put: true, h: { 'x-tl-sha256': sha(zip()) } });
    ok(r.s === 422 || r.s === 409, 'otro APK para el mismo build → no (el archivo de un build no cambia)');
    r = await reg({ app: 'cliente', plataforma: 'android', canal: 'apk_propio', version: VERSION, build: BL - 1, estado: 'compilando' });
    ok(r.s === 409 && /no es creciente/.test(r.j.msg), `un build menor → 409 (${r.j.msg})`);
    r = await reg({ app: 'cliente', plataforma: 'android', canal: 'play_interno', version: VERSION, build: BL, estado: 'disponible' });
    ok(r.s === 400 && log().startsWith('pedido_invalido'), 'el CI no puede decir «disponible»: lo decide el servidor');
    r = await reg({ app: 'cliente', plataforma: 'ios', canal: 'apk_propio', version: VERSION, build: BL, estado: 'compilando' });
    ok(r.s === 400, 'un APK de iPhone → 400');
    r = await reg({ app: 'cliente', plataforma: 'android', canal: 'play_interno', version: VERSION, build: BL + 1, estado: 'compilando', sabor: 'produccion' });
    ok(r.s === 403 && /Fase 9/.test(r.j.msg), 'el sabor de producción → 403 (la base: Fase 9)');

    // Play interno: sin la cuenta de servicio el .aab espera; con ella, el barrido lo sube.
    r = await reg({ app: 'cliente', plataforma: 'android', canal: 'play_interno', version: VERSION, build: BL, estado: 'compilando' }); ok(r.s === 201, 'Play interno · compilando');
    const aab = zip(5000); play.proximo('com.tolatino.app', BL);
    r = await ci(`/api/tiendas/archivo?tipo=aab&app=cliente&canal=play_interno&build=${BL}`, conRun(), aab, { put: true, h: { 'x-tl-sha256': sha(aab) } });
    ok(r.s === 200 && r.j.play === 'sin_llave', 'el .aab sube; sin la cuenta de Play el servidor no puede mandarlo («sin_llave»)');
    ok(sql(`select status || '|' || bundle_key from app_builds where app = 'cliente' and channel = 'play_interno' and build = ${BL}`) === `subido|privado/aab/app-${VERSION.replace(/\./g, '-')}-${BL}.aab`, 'el build queda SUBIDO con su .aab privado');
    ok((await subirLlave(pa, 'play_service_account', 'play.json', JSON.stringify(cuenta.json))).ok, 'Integraciones: la cuenta de servicio de Play');
    sql(`set session_replication_role = replica; update app_builds set updated_at = now() - interval '5 minutes' where app = 'cliente' and channel = 'play_interno' and build = ${BL}`);
    const bz = await barrido(); ok(bz.ok !== false, 'el barrido corre');
    ok(await espera(() => sql(`select status from app_builds where app = 'cliente' and channel = 'play_interno' and build = ${BL}`) === 'disponible'), 'el barrido lo subió a Play interno → DISPONIBLE');
    ok(play.confirmadas.some((c) => c.pkg === 'com.tolatino.app' && c.pista === 'internal' && c.versionCodes.includes(String(BL))), 'Google (simulador del descubrimiento oficial): en la pista interna, confirmado');
    ok(play.registro.filter((x) => !x.control).every((x) => x.valido), 'cada pedido a Google cumple el descubrimiento oficial');
    ok(sql(`select kind || '|' || by_kind || '|' || result from store_submissions s join app_builds b on b.id = s.build_id where b.app = 'cliente' and b.channel = 'play_interno' and b.build = ${BL}`) === 'play_interno|servidor|aceptado', 'store_submissions: play_interno · servidor · aceptado');
    ok(sql(`select count(*) from store_secret_reads r join store_secrets s on s.id = r.secret_id where s.kind = 'play_service_account' and r.by = 'servidor'`) >= '1', 'la cuenta de Play la leyó el SERVIDOR (nunca el CI), anotado');
    // Un .aab que Google rechaza (otro versionCode) → error anotado; sigue subido.
    r = await reg({ app: 'negocio', plataforma: 'android', canal: 'play_interno', version: VERSION, build: BL, estado: 'compilando' });
    play.proximo('com.tolatino.negocios', BL + 50);
    const aab2 = zip(800); r = await ci(`/api/tiendas/archivo?tipo=aab&app=negocio&canal=play_interno&build=${BL}`, conRun(), aab2, { put: true, h: { 'x-tl-sha256': sha(aab2) } });
    ok(r.s === 200 && r.j.play === 'error' && sql(`select status from app_builds where app = 'negocio' and channel = 'play_interno' and build = ${BL}`) === 'subido', 'Google dice otro versionCode → error anotado, el build sigue SUBIDO (se reintenta; a los 3, falló)');
    ok(/versionCode/.test(sql(`select detail from store_submissions s join app_builds b on b.id = s.build_id where b.app = 'negocio' and b.build = ${BL} order by s.id desc limit 1`)), 'el motivo de Google queda en el envío');

    // TestFlight: compilando → subido (el CI) → Apple procesa → grupo interno (el barrido).
    r = await reg({ app: 'cliente', plataforma: 'ios', canal: 'testflight_interno', version: VERSION, build: BL, estado: 'compilando' }); ok(r.s === 201, 'TestFlight interno · compilando');
    r = await reg({ app: 'cliente', plataforma: 'ios', canal: 'testflight_interno', version: VERSION, build: BL, estado: 'subido' }); ok(r.s === 200 && r.j.estado === 'subido', 'el CI: subido (xcodebuild lo mandó a Apple)');
    ok(sql(`select kind || '|' || by_kind || '|' || result from store_submissions s join app_builds b on b.id = s.build_id where b.app = 'cliente' and b.channel = 'testflight_interno' and b.build = ${BL}`) === 'testflight|ci|enviado', 'store_submissions: testflight · ci · enviado');
    r = await reg({ app: 'cliente', plataforma: 'ios', canal: 'testflight_interno', version: VERSION, build: BL, estado: 'compilando' }); ok(r.s === 409, 'volver a «compilando» → 409 (el estado solo avanza)');
    r = await reg({ app: 'cliente', plataforma: 'ios', canal: 'testflight_interno', version: VERSION, build: BL, estado: 'subido' }, tok());
    ok(r.s === 403 && log().startsWith('build_ajeno'), 'otro run avanza este build → 403 build_ajeno');
    const dsym = zip(3000); r = await ci(`/api/tiendas/archivo?tipo=simbolos&app=cliente&canal=testflight_interno&build=${BL}`, conRun(), dsym, { put: true, h: { 'x-tl-sha256': sha(dsym) } });
    ok(r.s === 200 && sql(`select symbols_key from app_builds where app = 'cliente' and channel = 'testflight_interno' and build = ${BL}`) === `privado/simbolos/cliente-ios-testflight-interno-${BL}.zip`, 'los símbolos (dSYM) al almacén privado');
    asc.subirBuild({ appId: '6400000001', version: VERSION, build: String(BL), id: `bld-${BL}` });
    sql(`set session_replication_role = replica; update app_builds set updated_at = now() - interval '5 minutes' where channel = 'testflight_interno' and build = ${BL}`);
    await barrido();
    ok(await espera(() => sql(`select status || '|' || coalesce(store_build_id, '') from app_builds where app = 'cliente' and channel = 'testflight_interno' and build = ${BL}`) === `procesando|bld-${BL}`), 'Apple lo procesa (PROCESSING) → PROCESANDO, con su id de App Store Connect');
    asc.subirBuild({ appId: '6400000001', version: VERSION, build: String(BL), id: `bld-${BL}`, estado: 'VALID' });
    sql(`set session_replication_role = replica; update app_builds set updated_at = now() - interval '5 minutes' where channel = 'testflight_interno' and build = ${BL}`);
    await barrido();
    ok(await espera(() => sql(`select status from app_builds where app = 'cliente' and channel = 'testflight_interno' and build = ${BL}`) === 'disponible'), 'VALID → el barrido lo suma al grupo interno → DISPONIBLE');
    ok(asc.enGrupo.some((x) => x.grupo === 'grp-int-6400000001' && x.build === `bld-${BL}`) && asc.registro.filter((x) => !x.control && x.ruta.startsWith('/v1/builds')).every((x) => x.valido), 'en el grupo INTERNO (la especificación de Apple valida cada pedido)');
    // FAILED: otra app.
    r = await reg({ app: 'negocio', plataforma: 'ios', canal: 'testflight_interno', version: VERSION, build: BL, estado: 'compilando' }); r = await reg({ app: 'negocio', plataforma: 'ios', canal: 'testflight_interno', version: VERSION, build: BL, estado: 'subido' });
    asc.subirBuild({ appId: '6400000002', version: VERSION, build: String(BL), id: `bld-n${BL}`, estado: 'INVALID' });
    sql(`set session_replication_role = replica; update app_builds set updated_at = now() - interval '5 minutes' where app = 'negocio' and channel = 'testflight_interno' and build = ${BL}`);
    await barrido();
    ok(await espera(() => sql(`select status || '|' || fail_reason from app_builds where app = 'negocio' and channel = 'testflight_interno' and build = ${BL}`) === 'fallo|Apple: INVALID'), 'Apple dice INVALID → FALLÓ con el motivo (y el envío «rechazado»)');
    // El CI dice que falló.
    r = await reg({ app: 'delivery', plataforma: 'android', canal: 'apk_propio', version: VERSION, build: BL, estado: 'compilando' });
    r = await reg({ app: 'delivery', plataforma: 'android', canal: 'apk_propio', version: VERSION, build: BL, estado: 'fallo' }); ok(r.s === 400, '«fallo» sin motivo → 400');
    r = await reg({ app: 'delivery', plataforma: 'android', canal: 'apk_propio', version: VERSION, build: BL, estado: 'fallo', motivo: 'Falló el CI (run 1)' }); ok(r.s === 200 && sql(`select status from app_builds where app = 'delivery' and channel = 'apk_propio' and build = ${BL}`) === 'fallo', 'el CI: falló, con motivo');
    // Tamaño.
    sql(`insert into platform_config (key, value, note) values ('tiendas_archivo_mb', '10', 'prueba 8h') on conflict (key) do update set value = excluded.value`);
    await new Promise((x) => setTimeout(x, 16000));
    r = await reg({ app: 'checkin', plataforma: 'android', canal: 'apk_propio', version: VERSION, build: BL, estado: 'compilando' });
    const grande = zip(11 * 1048576); r = await ci(`/api/tiendas/archivo?tipo=apk&app=checkin&canal=apk_propio&build=${BL}`, conRun(), grande, { put: true, h: { 'x-tl-sha256': sha(grande) } });
    ok(r.s === 413, 'un archivo de 11 MB con el tope en 10 MB → 413');
    sql(`delete from platform_config where key = 'tiendas_archivo_mb'`);

    console.log('4 · Las paredes de la base');
    const bid = sql(`select id from app_builds where app = 'cliente' and channel = 'testflight_interno' and build = ${BL}`);
    ok(/tienda_solo_produccion/.test(sqlFalla(`insert into store_submissions (build_id, kind, by_kind, result, founder_ok_ref) values (${bid}, 'revision_publica', 'servidor', 'enviado', 'OK del fundador')`)), 'revisión pública con app.tiendas.publico apagado → la base la rechaza');
    ok(/tienda_solo_produccion/.test(sqlFalla(`insert into store_submissions (build_id, kind, by_kind, result) values (${bid}, 'lanzamiento', 'servidor', 'enviado')`)), 'lanzamiento → rechazado');
    ok(/Play interno solo/.test(sqlFalla(`insert into store_submissions (build_id, kind, by_kind, result) values (${bid}, 'play_interno', 'servidor', 'enviado')`)), 'Play interno con un build de TestFlight → rechazado');
    ok(/solo de inserción/.test(sqlFalla(`update store_submissions set result = 'aceptado' where build_id = ${bid}`)) && /solo de inserción/.test(sqlFalla(`delete from store_submissions where build_id = ${bid}`)), 'store_submissions: ni se cambia ni se borra');
    ok(/solo de inserción/.test(sqlFalla(`delete from ci_oidc_log`)) && /solo de inserción/.test(sqlFalla(`update ci_oidc_log set ok = true`)), 'ci_oidc_log: solo inserción');
    ok(/no cambia/.test(sqlFalla(`update ci_oidc_jti set exp = now()`)) && /vivo no se borra/.test(sqlFalla(`delete from ci_oidc_jti`)), 'ci_oidc_jti: no cambia y un jti vivo no se borra');
    ok(/tienda_solo_produccion/.test(sqlFalla(`insert into app_builds (app, platform, version, build, channel, flavor) values ('cliente', 'android', '${VERSION}', 999999, 'apk_propio', 'produccion')`)), 'app_builds: el sabor de producción → rechazado');
    ok(/tienda_solo_produccion/.test(sqlFalla(`insert into build_requests (app, platform, ref, reason, requested_by) values ('todas', 'ambas', 'produccion', 'prueba', (select id from users where phone = '+1${ADM}'))`)), 'build_requests: produccion → rechazado');
    ok(/no se borra/.test(sqlFalla(`delete from app_builds where id = ${bid}`)), 'un build no se borra');

    console.log('5 · Super Admin › Sistema › Apps › Versiones (390 y 1360) y «Pedir un build»');
    for (const w of [1360, 390]) {
      const p = w === 1360 ? pa : await pagina('admin390', 390); if (w === 390) await entrar(p, ADM);
      await p.goto(B + '/admin/sistema/apps?v=versiones'); await p.getByText('LO QUE NECESITA LA TUBERÍA').waitFor();
      const t = await texto(p);
      ok(/LLAVES DE LA TUBERÍA\s*3 de 4/.test(t) && /GitHub · token para pedir builds.*FALTA/.test(t), `${w}: kpis y «lo que necesita la tubería» (3 de 4: falta el token de GitHub)`);
      ok(new RegExp(`iPhone · ${VERSION.replace(/\./g, '\\.')} \\(${BL}\\)`).test(t) && /con símbolos/.test(t) && /tienda: aceptado/.test(t) && /Apple: INVALID/.test(t), `${w}: los builds del CI con su estado, símbolos y el envío a la tienda`);
      await p.screenshot({ path: OUT + `t8h-versiones-${w}.png`, fullPage: true });
    }
    // Pedir sin token de GitHub → queda anotado, no se lanza.
    await pa.goto(B + '/admin/sistema/apps?v=versiones'); await boton(pa, 'Pedir un build').click(); await pa.getByText('Lanza el CI de las tiendas', { exact: false }).waitFor();
    await pa.screenshot({ path: OUT + 't8h-pedir-1360.png', fullPage: true });
    await boton(pa, 'Volver a probar la firma').click(); await boton(pa, 'Pedir el build').click();
    await pa.getByText('falta el token de GitHub', { exact: false }).first().waitFor();
    ok(sql(`select status || '|' || app || '|' || platform from build_requests order by id desc limit 1`) === 'sin_llave|todas|ambas' && gh.lanzados.length === 0, 'sin el token de GitHub: el pedido queda «sin llave» y no se lanza nada');
    ok(sql(`select count(*) from audit_entries where action = 'tiendas.pedir_build' and at > '${T0}'`) === '1', 'el pedido queda en la auditoría con su motivo');
    ok((await subirLlave(pa, 'github_token', 'token.txt', `${GHTOKEN}\n`)).ok, 'Integraciones: el token de GitHub (.txt)');
    const p390 = await pagina('admin390b', 390); await entrar(p390, ADM);
    await p390.goto(B + '/admin/sistema/apps?v=versiones'); await boton(p390, 'Pedir un build').click(); await p390.getByText('Lanza el CI de las tiendas', { exact: false }).waitFor();
    await boton(p390, 'To\'Latino').click(); await boton(p390, 'Android').click(); await boton(p390, 'Versión nueva para los testers').click();
    await p390.screenshot({ path: OUT + 't8h-pedir-390.png', fullPage: true });
    await boton(p390, 'Pedir el build').click();
    await p390.getByText('Pedido. GitHub empieza el build', { exact: false }).waitFor();
    const PID = sql(`select id from build_requests order by id desc limit 1`);
    ok(sql(`select status from build_requests where id = ${PID}`) === 'enviado', '«Pedir un build» → ENVIADO');
    ok(gh.lanzados.length === 1 && gh.lanzados[0].flujo === 'tiendas.yml' && gh.lanzados[0].ref === 'pruebas' && JSON.stringify(gh.lanzados[0].inputs) === JSON.stringify({ apps: 'cliente', plataforma: 'android', pedido: PID }), `GitHub recibió el workflow_dispatch de tiendas.yml en pruebas con los inputs que el flujo declara (${JSON.stringify(gh.lanzados[0]?.inputs)})`);
    ok(sql(`select count(*) from store_secret_reads r join store_secrets s on s.id = r.secret_id where s.kind = 'github_token' and r.by = 'servidor'`) === '1', 'el token de GitHub lo leyó el servidor (anotado)');
    // El CI del pedido: su build lleva el pedido; la pantalla se pone al día sola.
    const RUN2 = GH.claims(), run2 = () => tok({ run_id: RUN2.run_id, sha: RUN2.sha });
    r = await ci('/api/tiendas/build', run2(), { app: 'negocio', plataforma: 'android', canal: 'apk_propio', version: VERSION, build: BL + 3, estado: 'compilando', pedido: PID });
    ok(r.s === 409 && /no es de este build/.test(r.j.msg), 'un build de otra app con ese pedido → 409');
    r = await ci('/api/tiendas/build', run2(), { app: 'cliente', plataforma: 'android', canal: 'apk_propio', version: VERSION, build: BL + 3, estado: 'compilando', pedido: PID });
    ok(r.s === 201 && sql(`select status from build_requests where id = ${PID}`) === 'corriendo', 'el build del pedido → el pedido pasa a COMPILANDO');
    await p390.goto(B + '/admin/sistema/apps?v=versiones'); await p390.getByText('En vivo', { exact: false }).first().waitFor();
    ok(/pedido \d+/.test(await texto(p390)), '390: el build dice de qué pedido es; «En vivo»');
    const apk3 = zip(2000);
    r = await ci(`/api/tiendas/archivo?tipo=apk&app=cliente&canal=apk_propio&build=${BL + 3}`, run2(), apk3, { put: true, h: { 'x-tl-sha256': sha(apk3) } });
    ok(await espera(async () => new RegExp(`Android · ${VERSION.replace(/\./g, '\\.')} \\(${BL + 3}\\)[^·]*·[^]*?DISPONIBLE`).test(await texto(p390)), 20000), '390: la pantalla se puso al día SOLA (sin recargar): el build pasó a DISPONIBLE');
    await p390.screenshot({ path: OUT + 't8h-vivo-390.png', fullPage: true });
    // Tope de pedidos por hora.
    sql(`insert into platform_config (key, value, note) values ('tiendas_pedidos_hora', '2', 'prueba 8h') on conflict (key) do update set value = excluded.value`);
    await new Promise((x) => setTimeout(x, 16000));
    await pa.goto(B + '/admin/sistema/apps?v=versiones'); await boton(pa, 'Pedir un build').click(); await boton(pa, 'Arreglo en lo nativo').click(); await boton(pa, 'Pedir el build').click();
    await pa.getByText('Ya se pidieron 2 builds en la última hora', { exact: false }).waitFor();
    ok(gh.lanzados.length === 1, 'el tope de pedidos por hora (Configuración) → no se lanza');
    sql(`delete from platform_config where key = 'tiendas_pedidos_hora'`);

    console.log('6 · Integraciones: cada lectura del CI y cada intento');
    for (const w of [1360, 390]) {
      const p = w === 1360 ? pa : p390;
      await p.goto(B + '/admin/sistema/integraciones'); await p.getByText('LECTURAS DEL CI', { exact: false }).waitFor();
      const t = await texto(p);
      ok(new RegExp(`Android · llave de subida · run ${cg.run_id}`).test(t) && /App Store Connect · llave de la API · run \d+/.test(t), `${w}: cada lectura del CI con su run`);
      ok(/Token repetido/.test(t) && /Llegó sin HTTPS/.test(t) && /Rama no permitida/.test(t) && /Build de otro run/.test(t) && /RECHAZADO/.test(t) && /ENTRÓ/.test(t), `${w}: los intentos rechazados y los que entraron, en palabras`);
      ok(/GitHub · token para pedir builds/.test(t) && /VIVA/.test(t) && !t.includes(GHTOKEN), `${w}: el token de GitHub es una llave más (solo su huella)`);
      await p.screenshot({ path: OUT + `t8h-integraciones-${w}.png`, fullPage: true });
    }

    console.log('7 · Otro rol (Soporte): ve Versiones, no pide builds ni ve las llaves');
    const pd = await pagina('dayana', 1360); await entrar(pd, DAYANA);
    await pd.goto(B + '/admin/sistema/apps?v=versiones'); await pd.getByText('LO QUE NECESITA LA TUBERÍA').waitFor();
    ok((await boton(pd, 'Pedir un build').count()) === 0, 'Soporte: sin «Pedir un build»');
    const rr = await pd.request.get(B + '/admin/sistema/integraciones', { maxRedirects: 0 });
    ok(rr.status() !== 200 || !/LECTURAS DEL CI/.test(await rr.text()), 'Soporte: Integraciones (las llaves y las lecturas) no se abre');

    console.log('8 · El tope de intentos por minuto');
    let tope = 0;
    for (let i = 0; i < 80; i++) { const x = await ci('/api/tiendas/build', null, {}); if (x.s === 429) { tope = i; break; } }
    ok(tope > 0 && (await ci('/api/tiendas/oidc', tok(), { job: 'android', app: 'cliente' })).s === 429, `pasado el tope de rechazos por minuto (${tope + 1}), todo contesta 429 sin revisar, ni un token bueno`);
    const nlog = sql(`select count(*) from ci_oidc_log`); await ci('/api/tiendas/build', null, {});
    ok(sql(`select count(*) from ci_oidc_log`) === nlog, 'y no se anota más (protege la base)');
    sql(`set session_replication_role = replica; delete from ci_oidc_log where motivo = 'sin_token' and at > now() - interval '2 minutes'`);
    ok(errs.length === 0, `sin errores de JavaScript en las páginas (${errs.join(' | ').slice(0, 300)})`);
  } finally {
    // Lo que creó esta prueba (builds del «CI», envíos y pedidos) no se queda: las otras pruebas cuentan con la semilla (solo esta base local).
    sql(`set session_replication_role = replica; delete from store_submissions; delete from app_builds where is_test = false; delete from build_requests`);
    sql(`delete from platform_config where key in ('tiendas_pedidos_hora', 'tiendas_oidc_fallos_min', 'tiendas_archivo_mb')`);
    sql(`update feature_flags set enabled = true where key = 'app.tiendas.tuberia'`);
    await gh.cerrar(); await asc.cerrar(); await play.cerrar(); await br.close();
  }
  console.log(`\n${n} comprobaciones · tien8h`);
})().catch((e) => { console.error(e); process.exit(1); });
