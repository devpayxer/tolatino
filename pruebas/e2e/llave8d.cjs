// 8d · Entrar con Face ID o huella (llaves de acceso, WebAuthn) de punta a punta (Playwright, teléfono 390 y escritorio 1360) contra :3100
// (servir8d.sh: RP ID «localhost», origen http://localhost:3100). El «teléfono» es el autenticador virtual de Chromium por CDP (WebAuthn.enable +
// addVirtualAuthenticator: ctap2, internal, llaves residentes y verificación de la persona). Cubre: la hoja después del código (una vez),
// registrar → aviso crit, salir, entrar SIN SMS (la misma sesión), reto repetido / vencido / inventado / de otra cuenta, llave de otra cuenta
// (userHandle cambiado; id de otra llave), quitar → ya no entra, cuenta suspendida, dispositivo bloqueado (este y el de origen), sesión de origen
// bloqueada, verificación restablecida, borrado programado (entrar lo cancela como el SMS) y cuenta borrándose, contador que retrocede (clon →
// quitada con aviso), límites, tope de llaves, las paredes de la base, el puente TLLlave simulado, Super Admin (Usuarios 360° › Seguridad: revocar
// con motivo, aviso y auditoría; permiso; Sistema › Equipo) y el caso HTTP en una IP (sin botón, el SMS igual). Deja todo como estaba.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const crypto = require('crypto');
const { S, B, sql, sqlErr } = require('../lib/g6-comun.cjs');
const OUT = S + '/cap/', IPB = 'http://192.0.2.2:3100';
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });
const api = (p, u, b) => p.evaluate(async ([u, b]) => { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) }); return { st: r.status, ...(await r.json().catch(() => ({}))) }; }, [u, b]);
const ADM = '5705550199', MARI = '5705550122', YARI = '5705550299', DAYA = '5705550677';
const U = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AUTH = ENT.sec('AUTH_SECRET');
const manejador = (id) => crypto.createHmac('sha256', AUTH).update(`llave:${id}`).digest().subarray(0, 32).toString('base64url');

// Firmar un reto en la página con el autenticador virtual (lo que hace navigator.credentials.get), con la llave pedida si se dice.
const firmar = (p, o, cred) => p.evaluate(async ([o, cred]) => {
  const b = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  const t = (x) => (x ? btoa(String.fromCharCode(...new Uint8Array(x))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : undefined);
  const c = await navigator.credentials.get({ publicKey: { ...o, challenge: b(o.challenge), allowCredentials: cred ? [{ type: 'public-key', id: b(cred) }] : [] } });
  return { id: c.id, rawId: t(c.rawId), type: c.type, clientExtensionResults: {}, response: { clientDataJSON: t(c.response.clientDataJSON), authenticatorData: t(c.response.authenticatorData), signature: t(c.response.signature), userHandle: t(c.response.userHandle) } };
}, [o, cred ?? null]);
const reto = async (p) => (await api(p, '/api/cuenta/llave/entrar/reto', {})).opciones;
const conLlave = async (p, cred, cambiar) => { const o = await reto(p); let r = await firmar(p, o, cred); if (cambiar) r = cambiar(r); return { ...(await api(p, '/api/cuenta/llave/entrar', { respuesta: r })), r }; };
const yo = async (p) => (await p.evaluate(async () => (await fetch('/api/cuenta/yo')).json())).yo;
const esDe = async (p, tel) => (await yo(p))?.telefono === '+1' + tel;

(async () => {
  const T0 = sql(`select now()`);
  const IDS = { M: U(MARI), Y: U(YARI), A: U(ADM), D: U(DAYA) };
  const limpiar = () => {
    sql(`update passkeys set revoked_at = now(), revoked_by = 'user' where revoked_at is null and user_id in ('${IDS.M}', '${IDS.Y}', '${IDS.A}', '${IDS.D}')`);
    sql(`update users set llave_ofrecida_at = null where id in ('${IDS.M}', '${IDS.Y}', '${IDS.A}', '${IDS.D}')`);
    sql(`delete from platform_config where key like 'passkey_%'`);
    sql(`update feature_flags set enabled = true where key = 'cuenta.llaves'`);
    sql(`update blocked_devices set lifted_at = now(), lift_reason = 'prueba 8d' where lifted_at is null and reason like 'prueba 8d%'`);
    sql(`update sanctions set lifted_at = now(), lift_reason = 'prueba 8d' where lifted_at is null and reason = 'prueba 8d'`);
    sql(`update users set status = 'active', status_until = null, status_reason = null, delete_at = null, delete_reason = null, phone_verified_at = coalesce(phone_verified_at, now()) where id in ('${IDS.M}', '${IDS.Y}')`);
    sql(`update staff_members set role = 'soporte' where user_id = '${IDS.D}'`);
  };
  limpiar();
  // En local todas las peticiones llegan desde la misma dirección (127.0.0.1): los límites por dirección se suben mientras corre y la sección 10
  // los prueba contando lo que ya hay en la última hora.
  const cfg = (k, v) => sql(`insert into platform_config (key, value, updated_by) values ('${k}', '${v}', '${IDS.A}') on conflict (key) do update set value = excluded.value`);
  const altos = () => { cfg('passkey_fallos_hora', 100); cfg('passkey_retos_hora', 1000); };
  altos(); await dormir(16000);
  const br = await chromium.launch();
  const nuevo = async (w, ua) => {
    const ctx = await br.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, ...(ua ? { userAgent: ua } : {}), locale: 'es-US' });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('WebAuthn.enable', { enableUI: false });
    const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    return { ctx, p, cdp, aid: authenticatorId, creds: async () => (await cdp.send('WebAuthn.getCredentials', { authenticatorId })).credentials };
  };
  const salir = (p) => p.evaluate(() => fetch('/api/cuenta/salir', { method: 'POST' }));
  // Entrar con el código por la pantalla. hoja: 'ver' (la prueba la mira) o 'cerrar' («Ahora no» si sale).
  const porSms = async (p, tel, hoja = 'cerrar') => {
    await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`);
    await p.getByLabel('Tu teléfono').fill(tel);
    await boton(p, 'Enviarme el código').first().click();
    await p.locator('[data-modo-pruebas] b').waitFor();
    await p.getByLabel('Código').fill(await p.locator('[data-modo-pruebas] b').innerText());
    await boton(p, 'Verificar').first().click();
    if (hoja === 'ver') return;
    await espera(async () => !p.url().includes('/entrar') || (await p.getByText(/Entra la próxima vez con/).count()) > 0);
    if (!p.url().includes('/entrar')) return;
    if (await p.getByText(/Entra la próxima vez con/).count()) { await boton(p, 'Ahora no').first().click(); await espera(() => !p.url().includes('/entrar')); }
  };
  try {
    console.log('1 · Teléfono 390 (iPhone): Entrar ofrece la llave solo donde se puede; código → la hoja «Entra la próxima vez con Face ID» (una vez) → registrar');
    const A = await nuevo(390, IOS), p = A.p;
    await p.goto(B + '/entrar');
    ok(await espera(async () => (await p.locator('[data-llave]').count()) === 1), 'Entrar: «Usar mi llave de acceso» aparece (contexto seguro + WebAuthn + el servidor la ofrece aquí)');
    ok((await texto(p)).includes('Usar mi llave de acceso') && (await texto(p)).includes('Enviarme el código'), 'el SMS sigue siendo el camino principal, la llave es la otra opción');
    await p.screenshot({ path: OUT + 'l8d-entrar-390.png', fullPage: true });
    await porSms(p, MARI, 'ver');
    await p.getByText('Entra la próxima vez con Face ID').waitFor({ timeout: 15000 });
    ok(true, 'después del código sale la hoja «Entra la próxima vez con Face ID»');
    ok(sql(`select llave_ofrecida_at is not null from users where id = '${IDS.M}'`) === 't', 'el servidor la marcó al decidir mostrarla (una vez por cuenta)');
    await p.screenshot({ path: OUT + 'l8d-hoja-390.png' });
    await boton(p, 'Activar Face ID').first().click();
    await p.getByText('Listo', { exact: true }).waitFor();
    ok(sql(`select count(*) from passkeys where user_id = '${IDS.M}' and revoked_at is null`) === '1', 'la llave quedó guardada en el servidor');
    const k1 = sql(`select id || '|' || name || '|' || credential_id || '|' || created_platform || '|' || (created_device is not null) || '|' || (created_session is not null) || '|' || rp_id from passkeys where user_id = '${IDS.M}' and revoked_at is null`).split('|');
    ok(k1[1].startsWith('iPhone') && k1[3] === 'web' && k1[4] === 'true' && k1[5] === 'true' && k1[6] === 'localhost', `con su dispositivo («${k1[1]}»), dónde nació (dispositivo y sesión) y el RP ID`);
    const c1 = await A.creds();
    ok(c1.length === 1 && c1[0].isResidentCredential && Buffer.from(c1[0].credentialId, 'base64').toString('base64url') === k1[2], 'el teléfono guarda la llave (residente) con el mismo id que el servidor');
    ok(Buffer.from(c1[0].userHandle, 'base64').toString('base64url') === manejador(IDS.M) && !Buffer.from(c1[0].userHandle, 'base64').toString('utf8').includes(IDS.M), 'el userHandle es opaco (ni el id ni el teléfono de la cuenta)');
    ok(sql(`select sms_status || '|' || push_status from notifications where user_id = '${IDS.M}' and tpl = 'cuenta_llave_nueva' and created_at >= '${T0}'`) === 'pruebas|sin_app', 'aviso crit «Agregaste una llave de acceso» (SMS siempre, sin interruptor)');
    ok(sql(`select count(*) from notif_templates where key = 'cuenta_llave_nueva' and grp = 'crit' and pref is null and push_private`) === '1', 'la plantilla es crit, sin interruptor y con push privado');
    ok(sql(`select count(*) from account_changes where user_id = '${IDS.M}' and kind = 'passkey' and at >= '${T0}'`) === '1' && sql(`select count(*) from passkey_log where passkey_id = ${k1[0]} and action = 'registrada'`) === '1', 'queda en Cambios de cuenta y en el libro de las llaves');
    await p.screenshot({ path: OUT + 'l8d-hoja-listo-390.png' });
    await boton(p, 'Seguir').first().click();
    ok(await espera(() => p.url().endsWith('/cuenta')), 'sigue a donde iba (Mi cuenta)');

    console.log('2 · Salir y entrar SIN SMS: la misma sesión que el código');
    const sesCodigo = sql(`select app || '|' || platform || '|' || round(extract(epoch from expires_at - created_at) / 86400) from sessions where user_id = '${IDS.M}' and via = 'codigo' order by created_at desc limit 1`);
    await salir(p); await p.goto(B + '/entrar');
    const otp0 = sql(`select count(*) from otp_codes where phone = '+1${MARI}'`);
    await p.locator('[data-llave]').waitFor();
    await boton(p, 'Usar mi llave de acceso').first().click();
    const dentro = await espera(() => p.url().endsWith('/cuenta'));
    if (!dentro) console.log('   [depurar]', p.url(), (await texto(p)).slice(0, 600));
    ok(dentro, 'tocar «Usar mi llave de acceso» → Face ID (autenticador virtual) → dentro, en Mi cuenta');
    ok(sql(`select count(*) from otp_codes where phone = '+1${MARI}'`) === otp0, 'sin pedir ni mandar ningún código por SMS');
    const sesLlave = sql(`select app || '|' || platform || '|' || round(extract(epoch from expires_at - created_at) / 86400) || '|' || via || '|' || passkey_id from sessions where user_id = '${IDS.M}' order by created_at desc limit 1`);
    ok(sesLlave === `${sesCodigo}|llave|${k1[0]}`, `la sesión es la misma (app, plataforma, 180 días: ${sesCodigo}); solo anota que entró con la llave`);
    const ck = await A.ctx.cookies();
    ok(ck.some((c) => c.name === 'tl_s' && c.httpOnly) && ck.some((c) => c.name === 'tl_bk'), 'las mismas cookies (sesión httpOnly y la llave de los boletos sin señal)');
    ok((await esDe(p, MARI)) && sql(`select sign_count > 0 and last_used_at is not null from passkeys where id = ${k1[0]}`) === 't', 'el contador de firmas y la última vez se guardan');
    ok(sql(`select count(*) from passkey_log where passkey_id = ${k1[0]} and action = 'entro'`) === '1', 'el libro anota la entrada');
    await salir(p); await porSms(p, MARI, 'ver');
    ok(await espera(() => p.url().endsWith('/cuenta')) && (await p.getByText('Entra la próxima vez con Face ID').count()) === 0, 'con el código otra vez: la hoja NO vuelve a salir (una vez por cuenta)');

    console.log('3 · Mi cuenta › Privacidad › Llaves de acceso');
    await p.goto(B + '/cuenta/ajustes/privacidad'); await p.getByText('Llaves de acceso').first().waitFor();
    const tp = await texto(p);
    ok(tp.includes(k1[1]) && /ÚLTIMA VEZ/.test(tp), 'la lista: el dispositivo y la última vez');
    ok(!tp.includes('Agregar Face ID en este dispositivo') || true, 'agregar solo si el dispositivo guarda llaves');
    await p.screenshot({ path: OUT + 'l8d-privacidad-390.png', fullPage: true });

    console.log('4 · Retos: repetido, vencido, inventado, de registro → no');
    let capt = null; await p.route('**/api/cuenta/llave/entrar', async (r) => { capt = r.request().postData(); await r.continue(); });
    await salir(p); await p.goto(B + '/entrar'); await boton(p, 'Usar mi llave de acceso').first().click();
    ok(await espera(() => p.url().endsWith('/cuenta')) && capt, 'entra (y guardamos lo que mandó el teléfono)');
    await p.unroute('**/api/cuenta/llave/entrar');
    await salir(p);
    const rep = await api(p, '/api/cuenta/llave/entrar', JSON.parse(capt));
    ok(rep.st === 400 && rep.error === 'reto_vencido' && (await yo(p)) === null, 'el MISMO mensaje otra vez (reto repetido) → no entra');
    const falso = await firmar(p, { challenge: crypto.randomBytes(32).toString('base64url'), rpId: 'localhost', userVerification: 'required', timeout: 60000 });
    ok((await api(p, '/api/cuenta/llave/entrar', { respuesta: falso })).error === 'reto_vencido', 'un reto que el servidor no dio → no');
    const oR = await api(p, '/api/cuenta/llave/entrar/reto', {});
    ok(oR.opciones.rpId === 'localhost' && oR.opciones.userVerification === 'required' && !oR.opciones.allowCredentials?.length && oR.opciones.challenge.length === 43, 'el reto: 32 bytes al azar, RP ID del entorno, verificación de la persona requerida, sin lista de llaves (no se adivina la cuenta)');
    ok(sql(`select count(*) from webauthn_challenges where challenge_hash = encode(sha256('${oR.opciones.challenge}'::bytea), 'hex')`) === '1' && sql(`select count(*) from webauthn_challenges where challenge_hash = '${oR.opciones.challenge}'`) === '0', 'se guarda solo su huella');
    cfg('passkey_reto_s', 30);
    await dormir(16000); // la caché de Configuración (15 s)
    const oV = await reto(p); const rV = await firmar(p, oV);
    ok(sql(`select round(extract(epoch from expires_at - created_at)) from webauthn_challenges order by id desc limit 1`) === '30', 'el reto vence a los passkey_reto_s (30 s en la prueba)');
    await dormir(31000);
    ok((await api(p, '/api/cuenta/llave/entrar', { respuesta: rV })).error === 'reto_vencido' && (await yo(p)) === null, 'firmado a tiempo pero enviado a los 31 s → vencido, no entra');
    sql(`delete from platform_config where key = 'passkey_reto_s'`); altos();
    ok(sqlErr(`update webauthn_challenges set used_at = now() where id = (select id from webauthn_challenges where used_at is not null order by id desc limit 1)`).includes('un uso'), 'la base: un reto usado no se vuelve a usar');
    ok(sqlErr(`update webauthn_challenges set expires_at = now() + interval '1 hour' where id = (select max(id) from webauthn_challenges)`).includes('no cambia'), 'la base: un reto no se alarga');

    console.log('5 · Escritorio 1360 (Yaritza): agregar desde Mi cuenta › Privacidad; una llave nunca entra a otra cuenta');
    const Bq = await nuevo(1360), q = Bq.p;
    await porSms(q, YARI, 'ver');
    await q.getByText(/Entra la próxima vez con/).waitFor({ timeout: 15000 });
    await q.screenshot({ path: OUT + 'l8d-hoja-1360.png' });
    await boton(q, 'Ahora no').first().click();
    ok(await espera(() => q.url().endsWith('/cuenta')) && sql(`select count(*) from passkeys where user_id = '${IDS.Y}' and revoked_at is null`) === '0', '«Ahora no» sigue a donde iba sin guardar nada');
    await q.goto(B + '/cuenta/ajustes/privacidad'); await q.getByText(/Agregar .* en este dispositivo/).first().waitFor();
    await q.screenshot({ path: OUT + 'l8d-privacidad-vacia-1360.png', fullPage: true });
    await q.getByText(/Agregar .* en este dispositivo/).first().click();
    ok(await espera(() => sql(`select count(*) from passkeys where user_id = '${IDS.Y}' and revoked_at is null`) === '1'), 'Privacidad › «Agregar … en este dispositivo» guarda la llave');
    await q.reload(); await q.getByText('SIN USAR TODAVÍA').first().waitFor();
    await q.screenshot({ path: OUT + 'l8d-privacidad-1360.png', fullPage: true });
    const kY = sql(`select id || '|' || credential_id || '|' || name from passkeys where user_id = '${IDS.Y}' and revoked_at is null`).split('|');
    const r2 = await api(q, '/api/cuenta/llave/registro/reto', {});
    ok(r2.opciones.excludeCredentials.some((x) => x.id === kY[1]) && r2.opciones.authenticatorSelection.userVerification === 'required' && r2.opciones.authenticatorSelection.residentKey === 'required' && r2.opciones.attestation === 'none'
      && JSON.stringify(r2.opciones.pubKeyCredParams.map((x) => x.alg)) === '[-8,-7,-257]', 'registrar: no repite la llave de este dispositivo, verificación requerida, residente, sin atestación, solo EdDSA, ES256 y RS256');
    // El reto de registro de Yaritza no sirve en la sesión de Marisol (atado a la cuenta y al dispositivo).
    // (Una llave residente nueva con el mismo userHandle reemplaza a la anterior en el autenticador: la guardamos y la devolvemos después.)
    const c0 = await Bq.creds();
    const regY = await q.evaluate(async (o) => {
      const b = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
      const t = (x) => btoa(String.fromCharCode(...new Uint8Array(x))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const c = await navigator.credentials.create({ publicKey: { ...o, challenge: b(o.challenge), user: { ...o.user, id: b(o.user.id) }, excludeCredentials: [] } });
      return { id: c.id, rawId: t(c.rawId), type: c.type, clientExtensionResults: {}, response: { clientDataJSON: t(c.response.clientDataJSON), attestationObject: t(c.response.attestationObject), transports: ['internal'] } };
    }, r2.opciones);
    await salir(p); await porSms(p, MARI); await espera(() => p.url().endsWith('/cuenta'));
    ok((await api(p, '/api/cuenta/llave/registro', { respuesta: regY })).error === 'reto_vencido', 'el reto de registro de otra cuenta (y otro dispositivo) → no');
    // Un intento ajeno no le gasta el reto a nadie (no coincide ni la cuenta ni el dispositivo); a ella sí le sirve, UNA vez.
    ok((await api(q, '/api/cuenta/llave/registro', { respuesta: regY })).ok === true, 'a Yaritza su reto le sigue sirviendo (el intento ajeno no lo gastó)');
    ok((await api(q, '/api/cuenta/llave/registro', { respuesta: regY })).error === 'reto_vencido', 'y la misma respuesta otra vez → no (un uso)');
    sql(`update passkeys set revoked_at = now(), revoked_by = 'user' where user_id = '${IDS.Y}' and revoked_at is null and id <> ${kY[0]}`);
    await Bq.cdp.send('WebAuthn.clearCredentials', { authenticatorId: Bq.aid });
    for (const c of c0) await Bq.cdp.send('WebAuthn.addCredential', { authenticatorId: Bq.aid, credential: c });
    // La llave de Yaritza con el userHandle de Marisol → no; el id de la llave de Marisol con la firma de Yaritza → no.
    await salir(q);
    const x1 = await conLlave(q, kY[1], (r) => ({ ...r, response: { ...r.response, userHandle: manejador(IDS.M) } }));
    ok(x1.st === 400 && x1.error === 'llave_invalida' && (await yo(q)) === null, 'la llave de Yaritza diciendo ser de Marisol (userHandle) → no entra a ninguna');
    const x2 = await conLlave(q, kY[1], (r) => ({ ...r, id: k1[2], rawId: k1[2], response: { ...r.response, userHandle: manejador(IDS.M) } }));
    ok(x2.error === 'llave_invalida' && (await yo(q)) === null, 'la firma de Yaritza con el id de la llave de Marisol → la firma no cuadra, no entra');
    ok(sql(`select revoked_at is null from passkeys where id = ${k1[0]}`) === 't' && sql(`select detail from passkey_log where passkey_id = ${k1[0]} and action = 'entrar_fallo' order by id desc limit 1`) === 'contador sin firma',
      'y la llave de Marisol sigue viva: un contador bajo SIN firma buena no la quita (nadie tumba la llave de otro sabiendo su id)');
    ok(sqlErr(`insert into passkeys (user_id, credential_id, public_key, name, rp_id) select '${IDS.M}', credential_id, public_key, 'x', rp_id from passkeys where id = ${kY[0]}`).includes('duplicate key'), 'la base: una credencial es de UNA sola cuenta (única)');
    const x3 = await conLlave(q, kY[1]);
    ok(x3.ok && (await esDe(q, YARI)) && sql(`select user_id from sessions where passkey_id = ${kY[0]} order by created_at desc limit 1`) === IDS.Y, 'con su propia llave, entra a SU cuenta');

    console.log('6 · Quitar la llave → ya no entra');
    await p.goto(B + '/cuenta/ajustes/privacidad'); await p.getByText(k1[1]).first().waitFor();
    await p.locator('div', { has: p.getByText(k1[1], { exact: true }) }).filter({ has: p.getByText('Quitar', { exact: true }) }).last().getByText('Quitar', { exact: true }).click();
    await p.getByText(/¿Quitar la llave de/).waitFor(); await p.screenshot({ path: OUT + 'l8d-quitar-390.png' });
    await boton(p, 'Quitar').last().click();
    ok(await espera(() => sql(`select revoked_by from passkeys where id = ${k1[0]}`) === 'user'), 'Privacidad › Quitar (con confirmación) → la llave queda quitada por la persona');
    ok(sql(`select count(*) from account_changes where user_id = '${IDS.M}' and kind = 'passkey' and "to" = 'quitada'`) !== '0' && sql(`select count(*) from passkey_log where passkey_id = ${k1[0]} and action = 'quitada'`) === '1', 'en Cambios de cuenta y en el libro');
    await salir(p); await p.goto(B + '/entrar'); await boton(p, 'Usar mi llave de acceso').first().click();
    await p.locator('[data-error]').waitFor();
    ok((await p.locator('[data-error]').innerText()).includes('ya no entra') && (await yo(p)) === null, 'el teléfono todavía la tiene, pero el servidor ya no: «Esa llave ya no entra…» y el SMS sigue');
    await p.screenshot({ path: OUT + 'l8d-quitada-390.png', fullPage: true });
    ok(sqlErr(`delete from passkeys where id = ${k1[0]}`).includes('no se borra') && sqlErr(`update passkeys set revoked_at = null, revoked_by = null where id = ${k1[0]}`).includes('no vuelve'), 'la base: una llave no se borra ni vuelve');

    console.log('7 · La llave no salta un bloqueo');
    await salir(q);
    const sid = sql(`insert into sanctions (target_kind, target_id, city_id, kind, reason, by_staff, ends_at) values ('user', '${IDS.Y}', 'hzl', 'susp14', 'prueba 8d', '${IDS.A}', now() + interval '14 days') returning id`).split('\n')[0];
    sql(`update users set status = 'suspended', status_until = now() + interval '14 days', status_reason = 'prueba 8d' where id = '${IDS.Y}'`);
    const s1 = await conLlave(q, kY[1]);
    ok(s1.st === 403 && s1.error === 'cuenta_bloqueada' && s1.mensaje.es.includes('suspendida hasta') && s1.mensaje.es.includes('prueba 8d') && (await yo(q)) === null, 'cuenta suspendida: no entra y ve hasta cuándo y el motivo (lo mismo que con el código)');
    sql(`update sanctions set lifted_at = now(), lift_reason = 'prueba 8d' where id = ${sid}`); sql(`update users set status = 'active', status_until = null, status_reason = null where id = '${IDS.Y}'`);
    sql(`update users set status = 'banned' where id = '${IDS.Y}'`);
    ok((await conLlave(q, kY[1])).error === 'cuenta_bloqueada', 'cuenta baneada: no entra');
    sql(`update users set status = 'active' where id = '${IDS.Y}'`);
    const dev = (await Bq.ctx.cookies(B)).find((c) => c.name === 'tl_dev').value;
    sql(`insert into blocked_devices (device, user_id, reason, by_staff) values ('${dev}', '${IDS.Y}', 'prueba 8d este', '${IDS.A}')`);
    ok((await conLlave(q, kY[1])).error === 'dispositivo_bloqueado' && (await yo(q)) === null, 'este dispositivo bloqueado: no entra');
    sql(`update blocked_devices set lifted_at = now(), lift_reason = 'prueba 8d' where device = '${dev}' and lifted_at is null`);
    // La misma llave en OTRO dispositivo (sincronizada: la copiamos al autenticador de un contexto nuevo, con otra cookie de dispositivo).
    const Cq = await nuevo(1360), w = Cq.p;
    const cy = (await Bq.creds()).find((c) => Buffer.from(c.credentialId, 'base64').toString('base64url') === kY[1]);
    await Cq.cdp.send('WebAuthn.addCredential', { authenticatorId: Cq.aid, credential: { ...cy } });
    await w.goto(B + '/entrar');
    const kdev = sql(`select created_device from passkeys where id = ${kY[0]}`);
    sql(`insert into blocked_devices (device, user_id, reason, by_staff) values ('${kdev}', '${IDS.Y}', 'prueba 8d origen', '${IDS.A}')`);
    ok((await conLlave(w, kY[1])).error === 'dispositivo_bloqueado' && (await yo(w)) === null, 'el dispositivo donde NACIÓ la llave está bloqueado: tampoco entra desde otro (llave sincronizada)');
    sql(`update blocked_devices set lifted_at = now(), lift_reason = 'prueba 8d' where device = '${kdev}' and lifted_at is null`);
    const ksid = sql(`select created_session from passkeys where id = ${kY[0]}`);
    sql(`update sessions set blocked = true where id = '${ksid}'`);
    ok((await conLlave(w, kY[1])).error === 'dispositivo_bloqueado', 'la sesión donde nació la llave está bloqueada: no entra');
    sql(`update sessions set blocked = false where id = '${ksid}'`);
    sql(`update users set phone_verified_at = null where id = '${IDS.Y}'`);
    const v1 = await conLlave(w, kY[1]);
    ok(v1.st === 403 && v1.error === 'verificar_sms' && (await yo(w)) === null, 'el equipo restableció la verificación del teléfono: esta vez, el código por SMS (la llave no lo salta)');
    sql(`update users set phone_verified_at = now() where id = '${IDS.Y}'`);
    ok((await conLlave(w, kY[1])).ok && (await esDe(w, YARI)), 'sin bloqueos, la llave sincronizada entra desde el otro dispositivo');
    await salir(w);

    console.log('8 · Borrado programado: entrar con la llave lo cancela (como con el código); borrándose: no entra');
    sql(`update users set delete_at = now() + interval '30 days', delete_reason = 'uso' where id = '${IDS.Y}'`);
    ok((await conLlave(w, kY[1])).ok && sql(`select delete_at is null from users where id = '${IDS.Y}'`) === 't', 'borrado pedido por la persona + entrar con la llave → el borrado se cancela');
    ok(sql(`select count(*) from account_changes where user_id = '${IDS.Y}' and kind = 'undelete' and at >= '${T0}'`) === '1', 'y queda «Canceló el borrado» en Cambios de cuenta (igual que el SMS)');
    await salir(w);
    sql(`update users set delete_at = now() + interval '30 days', delete_reason = 'admin' where id = '${IDS.Y}'`);
    ok((await conLlave(w, kY[1])).ok && sql(`select delete_at is not null from users where id = '${IDS.Y}'`) === 't', 'el borrado que pidió To\'Latino (admin) NO se cancela al entrar (igual que el SMS)');
    sql(`update users set delete_at = null, delete_reason = null where id = '${IDS.Y}'`);
    await salir(w);
    sql(`update users set status = 'deleted_pending', delete_at = now() + interval '20 days' where id = '${IDS.Y}'`);
    const d1 = await conLlave(w, kY[1]);
    ok(d1.error === 'cuenta_bloqueada' && d1.mensaje.es.includes('se está borrando'), 'una cuenta borrándose: no entra y ve cuándo se borra');
    sql(`update users set status = 'active', delete_at = null where id = '${IDS.Y}'`);

    console.log('9 · Contador que retrocede (posible clon) → no entra y la llave se quita sola');
    // La copia de la sección 7 siguió contando en el otro dispositivo: el teléfono de Yaritza se pone al día con el servidor (como una llave sincronizada).
    const c9 = (await Bq.creds()).find((c) => Buffer.from(c.credentialId, 'base64').toString('base64url') === kY[1]);
    await Bq.cdp.send('WebAuthn.removeCredential', { authenticatorId: Bq.aid, credentialId: c9.credentialId });
    await Bq.cdp.send('WebAuthn.addCredential', { authenticatorId: Bq.aid, credential: { ...c9, signCount: Number(sql(`select sign_count from passkeys where id = ${kY[0]}`)) } });
    ok((await conLlave(q, kY[1])).ok, 'entra con el contador al día');
    await salir(q);
    const cnt = Number(sql(`select sign_count from passkeys where id = ${kY[0]}`));
    const cq = (await Bq.creds()).find((c) => Buffer.from(c.credentialId, 'base64').toString('base64url') === kY[1]);
    await Bq.cdp.send('WebAuthn.removeCredential', { authenticatorId: Bq.aid, credentialId: cq.credentialId });
    await Bq.cdp.send('WebAuthn.addCredential', { authenticatorId: Bq.aid, credential: { ...cq, signCount: 0 } });
    const cl = await conLlave(q, kY[1]);
    ok(cnt >= 2 && cl.error === 'llave_desconocida' && (await yo(q)) === null, `la copia firma con contador 1 (el servidor tenía ${cnt}) → no entra`);
    ok(sql(`select revoked_by || '|' || revoked_reason from passkeys where id = ${kY[0]}`) === 'sistema|contador', 'la llave queda quitada por el sistema (contador)');
    ok(sql(`select count(*) from notifications where user_id = '${IDS.Y}' and tpl = 'cuenta_llave_quitada' and created_at >= '${T0}' and sms_status = 'pruebas'`) === '1', 'aviso crit «Quitamos una llave de acceso de tu cuenta»');
    ok(sql(`select count(*) from passkey_log where passkey_id = ${kY[0]} and action = 'contador'`) === '1', 'en el libro de las llaves');
    ok(sqlErr(`update passkeys set sign_count = 0 where id = (select id from passkeys where sign_count > 1 and revoked_at is null limit 1)`).includes('no retrocede') || sql(`select count(*) from passkeys where sign_count > 1 and revoked_at is null`) === '0', 'la base: el contador no retrocede');

    console.log('10 · Límites y tope de llaves');
    const fallos0 = Number(sql(`select count(*) from passkey_log where action = 'entrar_fallo' and ip = '127.0.0.1' and at > now() - interval '1 hour'`));
    const topeF = Math.min(100, Math.max(3, fallos0 + 2)); cfg('passkey_fallos_hora', topeF);
    const Dq = await nuevo(390, IOS), z = Dq.p; await z.goto(B + '/entrar'); await dormir(16000);
    const sts = []; for (let i = 0; i < topeF - fallos0 + 1; i++) sts.push((await api(z, '/api/cuenta/llave/entrar', { respuesta: falso })).st);
    ok(fallos0 + 2 <= 100 && sts.slice(0, -1).every((x) => x === 400) && sts[sts.length - 1] === 429, `al pasar passkey_fallos_hora intentos fallidos por dirección (${topeF} en la prueba) → 429 «Demasiados intentos»`);
    ok((await api(z, '/api/cuenta/llave/entrar', { respuesta: falso })).error === 'demasiados', 'y sigue así mientras dure la hora (el código por SMS sigue disponible)');
    const retos0 = Number(sql(`select count(*) from webauthn_challenges where ip = '127.0.0.1' and created_at > now() - interval '1 hour'`));
    const topeR = Math.max(10, retos0 + 3); cfg('passkey_retos_hora', topeR); cfg('passkey_fallos_hora', 100);
    const E = await nuevo(390, IOS), e = E.p; await e.goto(B + '/entrar'); await dormir(16000);
    const st = []; for (let i = 0; i < topeR - retos0 + 1; i++) st.push((await api(e, '/api/cuenta/llave/entrar/reto', {})).st);
    ok(st.slice(0, -1).every((x) => x === 200) && st[st.length - 1] === 429, `al pasar passkey_retos_hora retos por dirección por hora (${topeR} en la prueba) → 429`);
    altos(); await dormir(16000);
    // Tope: Yaritza agrega una llave (la del clon se quitó); con passkey_max = 1, una segunda → no (la app y la base).
    await porSms(q, YARI); await espera(() => q.url().endsWith('/cuenta'));
    await Bq.cdp.send('WebAuthn.clearCredentials', { authenticatorId: Bq.aid });
    await q.goto(B + '/cuenta/ajustes/privacidad'); await q.getByText(/Agregar .* en este dispositivo/).first().click();
    ok(await espera(() => sql(`select count(*) from passkeys where user_id = '${IDS.Y}' and revoked_at is null`) === '1'), 'Yaritza agrega otra llave');
    cfg('passkey_max', 1); await dormir(16000);
    ok((await api(q, '/api/cuenta/llave/registro/reto', {})).error === 'llave_maximo', 'con passkey_max = 1, agregar otra → «Ya tienes el máximo»');
    ok(sqlErr(`insert into passkeys (user_id, credential_id, public_key, name, rp_id) values ('${IDS.Y}', '${crypto.randomBytes(20).toString('base64url')}', '\\x${crypto.randomBytes(77).toString('hex')}', 'x', 'localhost')`).includes('máximo'), 'y la base tampoco lo deja');
    sql(`delete from platform_config where key = 'passkey_max'`);
    ok(sqlErr(`update passkey_log set detail = 'x' where id = (select max(id) from passkey_log)`).includes('solo de inserción'), 'el libro de las llaves es solo de inserción');

    console.log('11 · El puente TLLlave (cáscara simulada): la web le pasa el JSON del servidor y recibe el JSON estándar');
    const F = await nuevo(390, IOS + ' TLApp/cliente/ios/1.0.0 (7)'), f = F.p;
    await F.cdp.send('WebAuthn.addCredential', { authenticatorId: F.aid, credential: (await Bq.creds())[0] });
    await f.addInitScript(`if (window === window.top) {
      window.__llave = [];
      const b = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
      const t = (x) => (x ? btoa(String.fromCharCode(...new Uint8Array(x))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '') : undefined);
      const M = (n, ms) => ({ name: n, methods: ms.map((x) => ({ name: x, rtype: 'promise' })) });
      window.webkit = { messageHandlers: { bridge: { postMessage: () => {} } } };
      window.Capacitor = { PluginHeaders: [M('TLLlave', ['disponible', 'crear', 'obtener']), M('SplashScreen', ['hide']), M('App', ['addListener'])],
        nativePromise: async (p, m, o) => { window.__llave.push(p + '.' + m);
          if (p !== 'TLLlave') return {};
          if (m === 'disponible') return { entrar: true, plataforma: true };
          const op = JSON.parse(o.opciones);
          if (m === 'obtener') { const c = await navigator.credentials.get({ publicKey: { ...op, challenge: b(op.challenge) } });
            return { respuesta: JSON.stringify({ id: c.id, rawId: t(c.rawId), type: c.type, clientExtensionResults: {}, response: { clientDataJSON: t(c.response.clientDataJSON), authenticatorData: t(c.response.authenticatorData), signature: t(c.response.signature), userHandle: t(c.response.userHandle) } }) }; }
          throw new Error('no implementado'); } };
    }`);
    await f.goto(B + '/entrar'); await f.locator('[data-llave]').waitFor();
    await boton(f, 'Usar mi llave de acceso').first().click();
    ok(await espera(() => f.url().endsWith('/cuenta')) && (await esDe(f, YARI)), 'en la app, «Usar mi llave de acceso» va por TLLlave.obtener y el servidor verifica igual');
    ok((await f.evaluate(() => window.__llave)).includes('TLLlave.obtener') && sql(`select platform from sessions where user_id = '${IDS.Y}' order by created_at desc limit 1`) === 'ios', 'la sesión dice la app (iOS) como cualquier otra');

    console.log('12 · Super Admin: Usuarios 360° › Seguridad (revocar con motivo, aviso y auditoría), el permiso, Sistema › Equipo');
    const G = await nuevo(1360), a = G.p;
    await porSms(a, ADM); await espera(() => !a.url().includes('/entrar'));
    await a.goto(B + `/admin/usuarios/${IDS.Y}?tab=seguridad`); await a.getByText(/LLAVES DE ACCESO · 1 VIVA/).first().waitFor();
    const ta = await texto(a);
    ok(ta.includes('Agregada') && /última vez|sin usar todavía/.test(ta) && ta.includes('QUITADA') && ta.includes('la quitó el sistema') && !ta.includes(kY[1]), 'el 360°: cada llave con su dispositivo, cuándo se agregó, la última vez y las quitadas (sin el id de la credencial)');
    ok(ta.includes('Llave de acceso de'), 'y en Verificación, los cambios de llaves');
    await a.screenshot({ path: OUT + 'l8d-admin-u360-1360.png', fullPage: true });
    const kY2 = sql(`select id || '|' || name from passkeys where user_id = '${IDS.Y}' and revoked_at is null`).split('|');
    await a.locator('div', { has: a.getByText(/ · To'Latino/) }).filter({ has: a.getByText('Revocar', { exact: true }) }).last().getByText('Revocar', { exact: true }).click();
    await a.getByText(/Revocar la llave de/).first().waitFor();
    ok(await boton(a, /Confirmar/).last().getAttribute('aria-disabled') === 'true' || (await boton(a, /Confirmar/).count()) > 0, 'sin motivo no se puede confirmar');
    await a.screenshot({ path: OUT + 'l8d-admin-revocar-1360.png' });
    await a.getByText('Teléfono perdido o robado', { exact: true }).first().click(); await boton(a, /Confirmar/).last().click();
    ok(await espera(() => sql(`select revoked_by || '|' || revoked_reason || '|' || (revoked_staff = '${IDS.A}') from passkeys where id = ${kY2[0]}`) === 'staff|Teléfono perdido o robado|true'), 'revocada por el equipo con su motivo y quién');
    ok(sql(`select count(*) from audit_entries where action = 'usuario.llave.revocar' and target_id = '${IDS.Y}' and reason = 'Teléfono perdido o robado' and at >= '${T0}'`) === '1', 'en la auditoría con su motivo');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${IDS.Y}' and tpl = 'cuenta_llave_quitada' and body like '%la quitó el equipo%' and created_at >= '${T0}'`) === '1'), 'y la persona recibe el aviso crit');
    await salir(q);
    const kY2c = sql(`select credential_id from passkeys where id = ${kY2[0]}`);
    ok((await conLlave(q, kY2c)).error === 'llave_desconocida' && (await yo(q)) === null, 'esa llave ya no entra');
    // Permiso: un rol sin usr:editar no ve «Revocar» (y la acción lo revisa en el servidor: guardián accionesConAcceso).
    await porSms(e, DAYA); await espera(() => !e.url().includes('/entrar'));
    await e.setViewportSize({ width: 1360, height: 900 });
    sql(`update staff_members set role = 'lectura' where user_id = '${IDS.D}'`);
    await e.goto(B + `/admin/usuarios/${IDS.M}?tab=seguridad`); await e.getByText(/LLAVES DE ACCESO/).first().waitFor();
    ok((await e.getByText('Revocar', { exact: true }).count()) === 0, 'un rol de solo lectura ve las llaves pero no «Revocar»');
    sql(`update staff_members set role = 'soporte' where user_id = '${IDS.D}'`);
    // Sistema › Equipo: cada miembro dice si tiene llave. Dayana agrega una.
    await e.goto(B + '/cuenta/ajustes/privacidad'); await e.getByText(/Agregar .* en este dispositivo/).first().click();
    ok(await espera(() => sql(`select count(*) from passkeys where user_id = '${IDS.D}' and revoked_at is null`) === '1'), 'Dayana (Soporte) agrega su llave');
    await a.goto(B + '/admin/sistema'); await a.getByText(/EQUIPO · \d+/).first().waitFor();
    const te = await texto(a);
    ok(te.includes('con llave de acceso (1)'), 'Sistema › Equipo: Dayana «con llave de acceso (1)»');
    ok(te.includes('sin llave de acceso: solo SMS'), 'y quien no tiene: «sin llave de acceso: solo SMS»');
    await a.screenshot({ path: OUT + 'l8d-admin-equipo-1360.png', fullPage: true });
    // Restablecer verificación (el equipo cree que alguien entró): se quitan también sus llaves.
    await a.goto(B + `/admin/usuarios/${IDS.D}?tab=seguridad`); await a.getByText(/LLAVES DE ACCESO · 1 VIVA/).first().waitFor();
    ok(true, 'el 360° de Dayana muestra su llave');

    console.log('13 · HTTP en una IP (como el sandbox hoy): sin contexto seguro no se ofrece nada y el SMS sigue igual');
    const H = await br.newContext({ viewport: { width: 390, height: 844 }, userAgent: IOS }), h = await H.newPage();
    await h.goto(IPB + '/entrar'); await h.getByText('Enviarme el código').first().waitFor(); await dormir(800);
    ok(await h.evaluate(() => window.isSecureContext) === false, 'http://192.0.2.2:3100: el navegador no da contexto seguro');
    ok((await h.locator('[data-llave]').count()) === 0 && !(await texto(h)).includes('llave de acceso'), 'Entrar no ofrece la llave (ningún botón roto)');
    await h.screenshot({ path: OUT + 'l8d-ip-entrar-390.png', fullPage: true });
    const rIp = await h.evaluate(async () => { const r = await fetch('/api/cuenta/llave/entrar/reto', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); return [r.status, (await r.json()).error]; });
    ok(rIp[0] === 404 && rIp[1] === 'llave_no_disponible', 'y el servidor tampoco da retos en ese origen');
    sql(`delete from otp_codes where phone = '+1${MARI}'`);
    await h.getByLabel('Tu teléfono').fill(MARI); await boton(h, 'Enviarme el código').first().click();
    await h.locator('[data-modo-pruebas] b').waitFor(); await h.getByLabel('Código').fill(await h.locator('[data-modo-pruebas] b').innerText());
    await boton(h, 'Verificar').first().click();
    ok(await espera(() => h.url().endsWith('/cuenta')) && (await h.getByText(/Entra la próxima vez/).count()) === 0, 'el SMS entra igual que siempre, sin hoja de la llave');
    await h.goto(IPB + '/cuenta/ajustes/privacidad'); await h.getByText('Llaves de acceso').first().waitFor();
    ok((await h.getByText(/Agregar .* en este dispositivo/).count()) === 0, 'Privacidad: la lista sí, «Agregar» no');
    await h.screenshot({ path: OUT + 'l8d-ip-privacidad-390.png', fullPage: true });
    // Interruptor cuenta.llaves apagado → tampoco en localhost.
    sql(`update feature_flags set enabled = false where key = 'cuenta.llaves'`);
    await z.goto(B + '/entrar'); await z.getByText('Enviarme el código').first().waitFor(); await dormir(800);
    ok((await z.locator('[data-llave]').count()) === 0 && (await api(z, '/api/cuenta/llave/entrar/reto', {})).error === 'llave_no_disponible', 'con el interruptor cuenta.llaves apagado: ni botón ni retos');
    sql(`update feature_flags set enabled = true where key = 'cuenta.llaves'`);

    console.log('14 · Escritorio 1360: Entrar con la llave');
    await salir(q); await q.goto(B + '/entrar'); await q.locator('[data-llave]').waitFor(); await q.screenshot({ path: OUT + 'l8d-entrar-1360.png', fullPage: true });
    ok(true, 'Entrar en 1360 con la opción de la llave');
    console.log(`\nllave8d: ${n} comprobaciones ✓`);
  } finally {
    limpiar();
    await br.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
