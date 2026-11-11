/* Contrato de las tiendas (8f, fase8-apps.md §4 8f; 8h lo amplía): el código REAL de lib/tiendas/asc.ts (compilado aparte) contra el simulador de
   App Store Connect, que valida cada pedido con scripts/contrato-tiendas/asc.json (sacado de la especificación OpenAPI publicada por Apple, versión
   y sha256 adentro):
   · el JWT: ES256 firmado con la .p8, kid, typ JWT, iss = emisor, aud appstoreconnect-v1, exp − iat ≤ 20 min; se reusa y se rehace al cambiar la llave;
   · cada ruta y método existen en la especificación; los parámetros de consulta están permitidos; los cuerpos cumplen su esquema sin campos de más;
   · el flujo de TestFlight INTERNO: app por bundle → su grupo interno → invitar al equipo (rol DEVELOPER, sin aprovisionamiento, solo esa app; el
     rol existe en la especificación) → agregar al grupo antes de aceptar = 422 → aceptar → agregar = 201 → quitar del grupo, anular, quitar usuario;
   · lo que dice Apple sobre la retroalimentación de TestFlight (las rutas existen: se trae en 8h).
   Y Google Play (documento de descubrimiento oficial fijado a un commit): el recurso Testers de una pista solo tiene googleGroups — un correo suelto
   no se puede agregar por la API (por eso Play interno queda «en Play Console» y el APK propio cubre a los demás). */
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const OUT = process.env.CONTRATO_OUT, PLAY = JSON.parse(fs.readFileSync(process.env.PLAY_SPEC, 'utf8'));
const sim = require(path.join(__dirname, '../tiendas-sim/sim.cjs')), ASC = sim.ASC;
const APPS = JSON.parse(fs.readFileSync(path.join(__dirname, '../../apps/mobile/apps.json'), 'utf8')).apps;
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };

(async () => {
  const A = require(OUT + '/asc.js');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const cred = { llavePem: privateKey.export({ type: 'pkcs8', format: 'pem' }), idLlave: 'ABCDE12345', emisor: '69a6de7e-1111-47e3-e053-5b8c7c11a4d1' };
  const S = await sim.arrancar({ publica: publicKey, emisor: cred.emisor, kid: cred.idLlave, apps: APPS.map((a, i) => ({ bundle: a.ios, id: 6400000001 + i })) });
  const ultimo = () => S.registro[S.registro.length - 1];
  try {
    console.log(`App Store Connect API ${ASC.version} (especificación fijada: ${ASC.sha256.zip?.slice(0, 12) ?? ASC.sha256.json.slice(0, 12)}…)`);
    ok(ASC.seguridad['itc-bearer-token']?.scheme === 'bearer' && ASC.seguridad['itc-bearer-token']?.bearerFormat === 'JWT', 'la especificación pide «Authorization: Bearer» con un JWT');
    const t = A.jwtAsc(cred), [h, c] = t.split('.').slice(0, 2).map((x) => JSON.parse(Buffer.from(x, 'base64url').toString()));
    ok(h.alg === 'ES256' && h.kid === cred.idLlave && h.typ === 'JWT', 'cabecera del JWT: ES256, kid de la llave, typ JWT');
    ok(c.iss === cred.emisor && c.aud === 'appstoreconnect-v1' && c.exp - c.iat <= ASC.jwt.maxVidaS && c.exp - c.iat >= 600, `cuerpo: iss = emisor, aud appstoreconnect-v1, vida ${c.exp - c.iat} s (≤ ${ASC.jwt.maxVidaS})`);
    ok(sim.verificarJwt(t, publicKey, { emisor: cred.emisor, kid: cred.idLlave }) === null, 'la firma ES256 (ieee-p1363) verifica con la llave pública');
    ok(A.jwtAsc(cred) === t, 'el JWT se reusa mientras vale');
    const otra = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' });
    ok(A.jwtAsc({ ...cred, llavePem: otra }) !== t, 'con otra llave se firma otro JWT');
    A.olvidarJwtAsc();

    console.log('TestFlight interno');
    const bundle = APPS[0].ios, appId = await A.appPorBundle(S.url, cred, bundle);
    ok(appId === '6400000001' && ultimo().valido, `GET /v1/apps?filter[bundleId]=${bundle} → ${appId} (parámetros permitidos)`);
    ok(await A.appPorBundle(S.url, cred, 'com.tolatino.noexiste') === null, 'un bundle que no existe → null');
    const grupo = await A.grupoInterno(S.url, cred, appId);
    ok(grupo === `grp-int-${appId}` && ultimo().valido, 'el grupo INTERNO (isInternalGroup), no el externo');
    ok(ASC.betaGroup.includes('isInternalGroup') && ASC.betaGroup.includes('name'), 'isInternalGroup y name existen en BetaGroup');
    const correo = 'tester.prueba@example.com';
    ok(await A.usuarioPorCorreo(S.url, cred, correo) === null && ultimo().valido, 'GET /v1/users?filter[username]= → todavía no es del equipo');
    const sinUsuario = await A.agregarTester(S.url, cred, { correo, nombre: 'Marisol', apellido: 'Prueba', grupoId: grupo });
    ok(!sinUsuario.id && sinUsuario.r.status === 422 && ultimo().valido, 'agregar al grupo interno a alguien que no es del equipo → 422 (cuerpo válido)');
    const inv = await A.invitarUsuario(S.url, cred, { correo, nombre: 'Marisol', apellido: 'Prueba', appId });
    const ri = S.registro.find((x) => x.ruta === '/v1/userInvitations' && x.metodo === 'POST');
    ok(inv.id && ri.valido && ri.status === 201, 'POST /v1/userInvitations → 201; el cuerpo cumple UserInvitationCreateRequest');
    ok(ASC.roles.includes(ri.cuerpo.data.attributes.roles[0]) && ri.cuerpo.data.attributes.roles.join() === 'DEVELOPER', 'rol mínimo DEVELOPER (existe en UserRole)');
    ok(ri.cuerpo.data.attributes.allAppsVisible === false && ri.cuerpo.data.attributes.provisioningAllowed === false && ri.cuerpo.data.relationships.visibleApps.data[0].id === appId, 'sin aprovisionamiento y solo esa app (visibleApps)');
    const dos = await A.invitarUsuario(S.url, cred, { correo, nombre: 'Marisol', apellido: 'Prueba', appId });
    ok(!dos.id && dos.r.status === 409 && A.errorDe(dos.r).startsWith('409 ENTITY_ERROR'), `invitar dos veces → 409 (errorDe: «${A.errorDe(dos.r)}»)`);
    ok(S.aceptar(correo), 'la persona acepta el correo de Apple (simulado)');
    const usr = await A.usuarioPorCorreo(S.url, cred, correo);
    ok(!!usr && ultimo().valido, 'ya es del equipo');
    const bt = await A.agregarTester(S.url, cred, { correo, nombre: 'Marisol', apellido: 'Prueba', grupoId: grupo });
    const rb = S.registro.filter((x) => x.ruta === '/v1/betaTesters' && x.metodo === 'POST').pop();
    ok(bt.id && rb.valido && rb.status === 201 && rb.cuerpo.data.relationships.betaGroups.data[0].id === grupo, 'POST /v1/betaTesters al grupo interno → 201; cumple BetaTesterCreateRequest');
    ok((await A.quitarTester(S.url, cred, bt.id)).status === 204 && ultimo().valido, 'DELETE /v1/betaTesters/{id} → 204');
    ok((await A.quitarTester(S.url, cred, bt.id)).status === 404, 'otra vez → 404 (lib/beta lo toma como hecho)');
    ok((await A.quitarUsuario(S.url, cred, usr)).status === 204 && ultimo().valido, 'DELETE /v1/users/{id} (el usuario que creamos para la prueba) → 204');
    const inv2 = await A.invitarUsuario(S.url, cred, { correo: 'otra.prueba@example.com', nombre: 'Yaritza', apellido: 'Prueba', appId });
    ok((await A.anularInvitacion(S.url, cred, inv2.id)).status === 204 && ultimo().valido, 'DELETE /v1/userInvitations/{id} (invitación pendiente) → 204');
    const malos = S.registro.filter((x) => !x.control && x.invalido && x.status !== 422 && x.status !== 409 && x.status !== 404);
    ok(malos.length === 0, `ningún pedido fuera de la especificación (${S.registro.length} pedidos)`);
    const vistas = new Map();
    for (const x of S.registro.filter((y) => !y.control)) { const k = `${x.metodo} ${x.ruta.replace(/\d{6,}|[a-z]+-(int-|ext-)?\d+/g, '{id}')}`; vistas.set(k, (vistas.get(k) ?? true) && x.valido === true); }
    for (const [k, v] of vistas) ok(v && !!ASC.rutas[k], `${k}: en la especificación, con consulta y cuerpo válidos`);

    console.log('El simulador rechaza lo que Apple rechaza');
    const mal = await fetch(S.url + '/v1/apps?filter[bundleId]=x&inventado=1', { headers: { authorization: `Bearer ${A.jwtAsc(cred)}` } });
    ok(mal.status === 400 && /consulta no permitida/.test(ultimo().invalido), 'un parámetro que no existe → 400');
    const sinFirma = await fetch(S.url + '/v1/apps', { headers: { authorization: 'Bearer x.y.z' } });
    ok(sinFirma.status === 401, 'un JWT sin firma válida → 401');
    const iat = Math.floor(Date.now() / 1000), larga = [{ alg: 'ES256', kid: cred.idLlave, typ: 'JWT' }, { iss: cred.emisor, iat, exp: iat + 3600, aud: 'appstoreconnect-v1' }].map((x) => Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
    const firma = crypto.sign('sha256', Buffer.from(larga), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    ok((await fetch(S.url + '/v1/apps', { headers: { authorization: `Bearer ${larga}.${firma}` } })).status === 401 && /tiempos/.test(ultimo().invalido), 'un JWT de 60 min → 401 (Apple: ≤ 20 min)');
    const extra = await A.pedir(S.url, cred, 'POST', '/v1/betaTesters', { data: { type: 'betaTesters', attributes: { email: 'a@b.co', telefono: '5705550122' } } });
    ok(extra.status === 422 && /Apple no tiene este campo/.test(ultimo().invalido), 'un campo de más en el cuerpo → 422');
    ok(ASC.feedback.includes('/v1/apps/{id}/betaFeedbackScreenshotSubmissions') && ASC.feedback.includes('/v1/apps/{id}/betaFeedbackCrashSubmissions'), 'la retroalimentación de TestFlight (captura y cierre) existe en la API: se trae a Soporte en 8h');

    console.log(`Google Play · Android Publisher v3 (descubrimiento ${PLAY.revision})`);
    const T = PLAY.schemas.Testers;
    ok(T && Object.keys(T.properties).join() === 'googleGroups', 'Testers (pistas) solo tiene googleGroups');
    ok(/email lists are not supported/i.test(T.description), 'Google lo dice: «email lists are not supported by this resource» → Play interno se agrega en Play Console');
    ok(['get', 'patch', 'update'].every((m) => PLAY.resources.edits.resources.testers.methods[m]), 'edits.testers get / patch / update existen (8h)');
  } finally { await S.cerrar(); }
  console.log(`\n${n} comprobaciones del contrato de las tiendas`);
})().catch((e) => { console.error(e); process.exit(1); });
