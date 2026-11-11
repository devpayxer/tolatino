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

    console.log('8h · Los builds del CI en App Store Connect: procesamiento y grupo interno');
    ok(['PROCESSING', 'VALID', 'FAILED', 'INVALID'].every((x) => ASC.estadosBuild.includes(x)), `estados de procesamiento en la especificación: ${ASC.estadosBuild.join(', ')}`);
    ok(await A.buildEnAsc(S.url, cred, { appId, version: '1.0.0', build: 41 }) === null && ultimo().valido, 'GET /v1/builds?filter[app]&filter[version]&filter[preReleaseVersion.version] → todavía no está (parámetros y fields[builds] válidos)');
    S.subirBuild({ appId, version: '1.0.0', build: '41', id: 'bld-41' });
    const b41 = await A.buildEnAsc(S.url, cred, { appId, version: '1.0.0', build: 41 });
    ok(b41 && b41.id === 'bld-41' && b41.estado === 'PROCESSING', 'Apple lo está procesando (PROCESSING)');
    ok((await A.buildAlGrupo(S.url, cred, grupo, 'bld-41')).status === 422, 'un build sin procesar no entra al grupo (422)');
    S.subirBuild({ appId, version: '1.0.0', build: '41', id: 'bld-41', estado: 'VALID' });
    ok((await A.buildEnAsc(S.url, cred, { appId, version: '1.0.0', build: 41 })).estado === 'VALID', 'VALID');
    const rg = await A.buildAlGrupo(S.url, cred, grupo, 'bld-41');
    ok(rg.status === 204 && ultimo().valido && S.enGrupo.some((x) => x.grupo === grupo && x.build === 'bld-41'), 'POST /v1/betaGroups/{id}/relationships/builds → 204 (cuerpo válido): en el grupo INTERNO');
    ok(await A.buildEnAsc(S.url, cred, { appId, version: '1.0.1', build: 41 }) === null, 'otra versión con el mismo número → no es ese build');

    console.log('8i · La ficha como BORRADOR en App Store Connect (nada se envía a revisión)');
    {
      const desde = S.registro.length, FJ = JSON.parse(fs.readFileSync(path.join(__dirname, '../../apps/mobile/tiendas/fichas.json'), 'utf8')), DE = JSON.parse(fs.readFileSync(path.join(__dirname, '../../apps/mobile/tiendas/declaraciones.json'), 'utf8'));
      ok(ASC.pantallas.includes('APP_IPHONE_67'), 'el tamaño de captura APP_IPHONE_67 (iPhone 6.7"/6.9") existe en ScreenshotDisplayType');
      ok(ASC.estadosVersion.includes('PREPARE_FOR_SUBMISSION'), 'PREPARE_FOR_SUBMISSION es un estado de versión de la especificación');
      for (const [a, x] of Object.entries(DE.edadApple)) if (a[0] !== '$') ok(Object.keys(x).every((k) => ASC.edad.includes(k)), `clasificación de ${a}: cada respuesta es un campo de AgeRatingDeclarationUpdateRequest`);
      const ver = await A.versionEnPreparacion(S.url, cred, appId);
      ok(ver === `ver-${appId}` && ultimo().valido, 'GET /v1/apps/{id}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION&filter[platform]=IOS → la versión en preparación');
      const f = FJ.fichas.find((x) => x.app === 'cliente' && x.idioma === 'es');
      const ficha = { locale: 'es-MX', name: f.apple.name, subtitle: f.apple.subtitle, privacyPolicyUrl: 'https://pruebas.tolatino.com/privacidad', description: f.apple.description, keywords: f.apple.keywords, promotionalText: f.apple.promotionalText, whatsNew: f.apple.whatsNew, supportUrl: 'https://pruebas.tolatino.com/soporte' };
      const r1 = await A.subirFichaAsc(S.url, cred, { appId, versionId: ver, ficha });
      ok(r1.ok && [...S.locV.values()].some((x) => x.attrs.locale === 'es-MX' && x.attrs.description === f.apple.description) && [...S.locI.values()].some((x) => x.attrs.name === f.apple.name), 'la primera vez: POST appStoreVersionLocalizations y appInfoLocalizations (cuerpos válidos, con «description»)');
      const r2 = await A.subirFichaAsc(S.url, cred, { appId, versionId: ver, ficha: { ...ficha, promotionalText: 'Otro texto' } });
      ok(r2.ok && S.registro.some((x) => x.metodo === 'PATCH' && /appStoreVersionLocalizations/.test(x.ruta) && x.valido), 'la segunda: PATCH de la misma localización (no la duplica)');
      ok((await A.ponerEdadAsc(S.url, cred, appId, DE.edadApple.cliente)).status === 200 && ultimo().valido, 'PATCH /v1/ageRatingDeclarations/{id} con las respuestas de declaraciones.json (cuerpo válido)');
      const rv = await A.ponerRevisionAsc(S.url, cred, ver, { notas: DE.notas.cliente.en, cuenta: '4845550181', codigo: '123456' });
      ok(rv.status === 201 && ultimo().valido && ultimo().cuerpo.data.attributes.demoAccountRequired === true, 'POST /v1/appStoreReviewDetails: notas y la cuenta de revisión');
      ok((await A.ponerRevisionAsc(S.url, cred, ver, { notas: 'x', cuenta: null, codigo: null })).status === 200 && ultimo().cuerpo.data.attributes.demoAccountRequired === false, 'sin cuenta de revisión: PATCH con demoAccountRequired false y sin código');
      const png = (n) => Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), crypto.randomBytes(200 + n)]);
      const caps = [png(1), png(2), png(3)];
      const c1 = await A.subirCapturasAsc(S.url, cred, { versionId: ver, locale: 'es-MX', tipo: 'APP_IPHONE_67', archivos: caps.map((d, i) => ({ nombre: `c${i}.png`, datos: d })) });
      ok(c1.ok && !c1.igual && c1.ids.length === 3 && [...S.capturas.values()].filter((x) => x.estado === 'COMPLETE').length === 3, 'capturas: juego APP_IPHONE_67 → reservar → subir a la dirección de Apple → confirmar con el MD5 (3 COMPLETE)');
      const c2 = await A.subirCapturasAsc(S.url, cred, { versionId: ver, locale: 'es-MX', tipo: 'APP_IPHONE_67', archivos: caps.map((d, i) => ({ nombre: `c${i}.png`, datos: d })) });
      ok(c2.ok && c2.igual, 'las mismas capturas otra vez: no se toca nada (por el checksum)');
      const c3 = await A.subirCapturasAsc(S.url, cred, { versionId: ver, locale: 'es-MX', tipo: 'APP_IPHONE_67', archivos: [{ nombre: 'n.png', datos: png(9) }] });
      ok(c3.ok && !c3.igual && [...S.capturas.values()].length === 1, 'capturas nuevas: se quitan las del borrador (DELETE) y se suben estas');
      ok(!(await A.subirCapturasAsc(S.url, cred, { versionId: ver, locale: 'en-US', tipo: 'APP_IPHONE_67', archivos: [] })).ok, 'sin la localización del idioma: no sube capturas');
      const S2 = await sim.arrancar({ publica: publicKey, emisor: cred.emisor, kid: cred.idLlave, apps: [{ bundle: 'com.x', id: '777' }], sinVersion: ['777'] });
      try { ok(await A.versionEnPreparacion(S2.url, cred, '777') === null, 'sin una versión en preparación → null (la ficha no se toca)'); } finally { await S2.cerrar(); }
      ok(!S.registro.some((x) => /Submission/.test(x.ruta)), 'ninguna llamada de envío a revisión');
      const malos2 = S.registro.slice(desde).filter((x) => !x.control && x.invalido && ![404, 409, 422].includes(x.status));
      ok(malos2.length === 0, `ningún pedido de la ficha fuera de la especificación${malos2.length ? `: ${malos2.map((x) => x.invalido).join(' · ')}` : ''}`);
    }

    console.log(`Google Play · Android Publisher v3 (descubrimiento ${PLAY.revision})`);
    {
      const PS = require(path.join(__dirname, '../tiendas-sim/play.cjs')), P = require(OUT + '/play.js'), cuenta = PS.cuentaDePrueba();
      const pkg = APPS[0].android, G = await PS.arrancar({ descubrimiento: PLAY, cuenta, paquetes: [pkg] });
      try {
        const tok = await P.tokenPlay(`${G.url}/token`, cuenta.json);
        ok(typeof tok === 'string' && tok.startsWith('ya29.'), 'OAuth de cuenta de servicio: JWT RS256 (iss = client_email, aud = la URL del token, scope androidpublisher) → token');
        ok(await P.tokenPlay(`${G.url}/token`, cuenta.json) === tok, 'el token se reusa');
        const otra = PS.cuentaDePrueba('otra@x.iam.gserviceaccount.com');
        P.olvidarTokenPlay();
        ok(await P.tokenPlay(`${G.url}/token`, { ...otra.json, client_email: cuenta.correo }) === null, 'firmado con otra llave → sin token');
        const t2 = await P.tokenPlay(`${G.url}/token`, cuenta.json);
        const aab = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), crypto.randomBytes(400)]);
        G.proximo(pkg, 7);
        const r = await P.aPlayInterno(G.url, t2, { pkg, aab, nombre: '1.0.0 (7)', build: 7 });
        ok(r.ok && r.versionCode === 7, 'edits.insert → bundles.upload (uploadType=media) → tracks.update «internal» → edits.commit');
        const val = G.registro.filter((x) => !x.control);
        ok(val.every((x) => x.valido && x.status === 200), `cada pedido en el descubrimiento oficial, con parámetros y cuerpo válidos (${val.map((x) => x.id).join(' → ')})`);
        const tr = val.find((x) => x.id === 'edits.tracks.update');
        ok(tr.cuerpo.track === 'internal' && tr.cuerpo.releases[0].status === 'completed' && tr.cuerpo.releases[0].versionCodes[0] === '7', 'la pista interna con el versionCode como texto (int64) y status completed');
        ok(G.confirmadas.some((c) => c.pkg === pkg && c.pista === 'internal' && c.versionCodes.includes('7')), 'confirmado en la pista interna');
        G.proximo(pkg, 8);
        const malo = await P.aPlayInterno(G.url, t2, { pkg, aab, nombre: '1.0.0 (9)', build: 9 });
        ok(!malo.ok && /versionCode 8 y el build es 9/.test(malo.error), 'si el .aab dice otro versionCode que el build → no se confirma');
        const sinApp = await P.aPlayInterno(G.url, t2, { pkg: 'com.tolatino.noexiste', aab, nombre: 'x', build: 1 });
        ok(!sinApp.ok && /edits\.insert 404 NOT_FOUND/.test(sinApp.error), `la app no existe en Play Console → ${sinApp.error.slice(0, 60)}`);
        ok(await P.huellaFirmaGoogle(G.url, t2, pkg, 7) === G.HUELLA && val.length > 0, 'generatedapks.list → la huella SHA-256 de la firma de Google (assetlinks y llaves de acceso)');
        ok(await P.huellaFirmaGoogle(G.url, t2, pkg, 99) === null, 'de un build que Google no tiene → null');
        const raro = await fetch(`${G.url}/androidpublisher/v3/applications/${pkg}/edits?inventado=1`, { method: 'POST', headers: { authorization: `Bearer ${t2}`, 'content-type': 'application/json' }, body: '{}' });
        ok(raro.status === 400, 'un parámetro que no existe → 400');
        const campo = await fetch(`${G.url}/androidpublisher/v3/applications/${pkg}/edits`, { method: 'POST', headers: { authorization: `Bearer ${t2}`, 'content-type': 'application/json' }, body: '{"telefono":"5705550122"}' });
        ok(campo.status === 400 && /Google no tiene este campo/.test(G.registro[G.registro.length - 1].invalido), 'un campo de más en el cuerpo → 400');
        ok(PLAY.resources.edits.resources.bundles.methods.upload.mediaUpload.protocols.simple.path === '/upload/androidpublisher/v3/applications/{packageName}/edits/{editId}/bundles', 'la ruta de subida simple es la del descubrimiento');
        ok(!Object.keys(PLAY.resources.applications?.methods ?? {}).some((m) => /^(create|insert)$/.test(m)), `applications solo tiene ${Object.keys(PLAY.resources.applications?.methods ?? {}).join(', ')}: CREAR una app es de Play Console (paso del fundador)`);
        // 8i · La ficha de Google como borrador: idiomas y capturas en una edición, confirmada sin mandarla a revisión.
        const FJ = JSON.parse(fs.readFileSync(path.join(__dirname, '../../apps/mobile/tiendas/fichas.json'), 'utf8'));
        const fichas = FJ.fichas.filter((x) => x.app === 'cliente').map((x) => ({ language: x.google.language, title: x.google.title, shortDescription: x.google.shortDescription, fullDescription: x.google.fullDescription }));
        const png = Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), crypto.randomBytes(300)]);
        const fr = await P.subirFichasPlay(G.url, t2, { pkg, fichas, capturas: [{ language: 'es-US', archivos: [png, png] }, { language: 'en-US', archivos: [] }] });
        const ff = G.fichas.get(pkg);
        ok(fr.ok && ff && ff.listings['es-US']?.title === fichas[0].title && ff.listings['en-US'] && (ff.imagenes['es-US:phoneScreenshots'] ?? []).length === 2, 'edits.listings.update (es-US, en-US) → images.deleteall → images.upload (image/png) → edits.commit');
        ok(ff.sinRevision.every(Boolean), 'edits.commit con changesNotSentForReview=true: Google NO lo manda a revisión');
        const vf = G.registro.filter((x) => !x.control && /listings|images|commit/.test(x.id ?? ''));
        ok(vf.length >= 5 && vf.every((x) => x.valido && x.status === 200), `cada pedido de la ficha en el descubrimiento oficial (${[...new Set(vf.map((x) => x.id))].join(', ')})`);
        const largo = await P.subirFichasPlay(G.url, t2, { pkg, fichas: [{ ...fichas[0], shortDescription: 'x'.repeat(81) }], capturas: [] });
        ok(!largo.ok && /listings\.update/.test(largo.error), 'una descripción corta de más de 80 → Google la rechaza');
        const SAL = JSON.parse(fs.readFileSync(path.join(__dirname, '../../apps/mobile/tiendas/privacidad/salidas.json'), 'utf8'));
        const ds = await P.subirDataSafety(G.url, t2, pkg, SAL.csv.cliente);
        ok(ds.status === 200 && G.fichas.get(pkg).dataSafety === SAL.csv.cliente && G.registro[G.registro.length - 1].valido, 'applications.dataSafety existe: el CSV del inventario se puede subir por la API (cuerpo SafetyLabelsUpdateRequest válido; el servidor no lo manda solo)');
      } finally { await G.cerrar(); }
    }
    const T = PLAY.schemas.Testers;
    ok(T && Object.keys(T.properties).join() === 'googleGroups', 'Testers (pistas) solo tiene googleGroups');
    ok(/email lists are not supported/i.test(T.description), 'Google lo dice: «email lists are not supported by this resource» → Play interno se agrega en Play Console');
    ok(['get', 'patch', 'update'].every((m) => PLAY.resources.edits.resources.testers.methods[m]), 'edits.testers get / patch / update existen (8h)');
  } finally { await S.cerrar(); }
  console.log(`\n${n} comprobaciones del contrato de las tiendas`);
})().catch((e) => { console.error(e); process.exit(1); });
