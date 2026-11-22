// 9t · Pedir el archivo con tus datos y borrar tu cuenta con la llave de acceso (Face ID / huella), además del código por SMS (LAUNCH «Pedir el
// archivo con la llave de acceso»; fase9-apertura.md §3.7). Playwright contra :3100 (servir.sh: RP ID «localhost», origen http://localhost:<puerto>);
// el «teléfono» es el autenticador virtual de Chromium por CDP, como llave8d. Cubre: sin llave solo el código; con llave «Pedir con Face ID» y
// «Mejor con un código»; pedir con la llave (sin SMS: el pedido, «confirmo» en el libro, account_changes y el contador); la misma firma otra vez
// (un uso); el propósito no se cambia (el reto de entrar no pide el archivo, el del archivo no entra ni borra, el del borrado no pide el
// archivo; un intento con el propósito equivocado no le gasta el reto a nadie); la llave de otra cuenta y el userHandle de otra cuenta; teléfono
// con la verificación restablecida, dispositivo bloqueado, cuenta suspendida; el tope de fallos; el interruptor apagado; la llave quitada; el
// código por SMS sigue igual con llave; borrar la cuenta con la llave (escritorio 1360) y cancelar. Cuentas nuevas (teléfonos 555 libres): nada
// depende de otra prueba. Deja todo como estaba.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { configLista } = require('../lib/config-lista.cjs'); // 22 nov · la Configuración llegó al servidor (mira que la escucha viva), en vez de dormir 16 s
const { chromium } = require('playwright'); const crypto = require('crypto');
const { S, B, sql } = require('../lib/g6-comun.cjs');
const { entrarComo, telLibre } = require('../lib/negocio-nuevo.cjs');
const OUT = S + '/cap/';
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });
const api = (p, u, b) => p.evaluate(async ([u, b]) => { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) }); return { st: r.status, ...(await r.json().catch(() => ({}))) }; }, [u, b]);
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ADM = '5705550199';
const AUTH = ENT.sec('AUTH_SECRET');
const manejador = (id) => crypto.createHmac('sha256', AUTH).update(`llave:${id}`).digest().subarray(0, 32).toString('base64url');
const huella = (reto) => crypto.createHash('sha256').update(reto).digest('hex');

// Firmar un reto en la página con el autenticador virtual (lo que hace navigator.credentials.get), con la llave pedida.
const firmar = (p, o, cred) => p.evaluate(async ([o, cred]) => {
  const b = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  const t = (x) => (x ? btoa(String.fromCharCode(...new Uint8Array(x))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : undefined);
  const c = await navigator.credentials.get({ publicKey: { ...o, challenge: b(o.challenge), allowCredentials: cred ? [{ type: 'public-key', id: b(cred) }] : [] } });
  return { id: c.id, rawId: t(c.rawId), type: c.type, clientExtensionResults: {}, response: { clientDataJSON: t(c.response.clientDataJSON), authenticatorData: t(c.response.authenticatorData), signature: t(c.response.signature), userHandle: t(c.response.userHandle) } };
}, [o, cred ?? null]);
// Guardar una llave para la cuenta de la sesión (lo que hace «Agregar … en este dispositivo»).
const registrar = async (p) => {
  const r = await api(p, '/api/cuenta/llave/registro/reto', {});
  if (!r.ok) throw new Error('sin reto de registro ' + JSON.stringify(r));
  const resp = await p.evaluate(async (o) => {
    const b = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
    const t = (x) => btoa(String.fromCharCode(...new Uint8Array(x))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const c = await navigator.credentials.create({ publicKey: { ...o, challenge: b(o.challenge), user: { ...o.user, id: b(o.user.id) }, excludeCredentials: [] } });
    return { id: c.id, rawId: t(c.rawId), type: c.type, clientExtensionResults: {}, response: { clientDataJSON: t(c.response.clientDataJSON), attestationObject: t(c.response.attestationObject), transports: ['internal'] } };
  }, r.opciones);
  const g = await api(p, '/api/cuenta/llave/registro', { respuesta: resp });
  if (!g.ok) throw new Error('no se guardó la llave ' + JSON.stringify(g));
  return resp.id;
};
// Las acciones del servidor (Next: POST a la página con «next-action»): se anotan (en todo el contexto) al tocarlas en la pantalla y se repiten con otro cuerpo. La
// respuesta (RSC) trae «$undefined» por un campo sin valor y «$$…» por un texto que empieza con «$»: se leen como los lee React.
// (El evento de la petición puede llegar después de que la base ya cambió: se espera a que estén las dos. El orden es el de los clics.)
const anotarAcciones = (ctx) => {
  const T = [], L = [];
  ctx.on('request', (r) => { if (r.method() !== 'POST') return; const i = T.length; T.push(r.allHeaders().then((h) => (h['next-action'] ? { i, url: r.url(), id: h['next-action'], tree: h['next-router-state-tree'] ?? null, body: r.postData() } : null)).catch(() => null)); });
  L.listas = async () => (await Promise.all(T)).filter(Boolean).sort((a, b) => a.i - b.i);
  return L;
};
const accion = async (p, x, args) => {
  const t = await p.evaluate(async ([x, body]) => { const r = await fetch(x.url, { method: 'POST', headers: { 'next-action': x.id, accept: 'text/x-component', 'content-type': 'text/plain;charset=UTF-8', ...(x.tree ? { 'next-router-state-tree': x.tree } : {}) }, body }); return r.text(); }, [x, typeof args === 'string' ? args : JSON.stringify(args)]);
  for (const l of t.split('\n')) { const m = /^[0-9a-f]+:(\{.*\})$/.exec(l); if (m) { try { const j = JSON.parse(m[1], (k, v) => (v === '$undefined' ? undefined : typeof v === 'string' && v.startsWith('$$') ? v.slice(1) : v)); if (j && typeof j === 'object' && 'ok' in j) return j; } catch { /* otra línea */ } } }
  return { ok: null, crudo: t.slice(0, 300) };
};
const msg = (r) => (r && r.msg ? r.msg.es : JSON.stringify(r));

(async () => {
  const MARI = telLibre(), YARI = telLibre();
  const br = await chromium.launch();
  const nuevo = async (w, ua) => {
    const ctx = await br.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, ...(ua ? { userAgent: ua } : {}), locale: 'es-US' });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('WebAuthn.enable', { enableUI: false });
    await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    return { ctx, p };
  };
  const IDS = {};
  const cfg = (k, v) => sql(`insert into platform_config (key, value, updated_by) values ('${k}', '${v}', (select id from users where phone = '+1${ADM}')) on conflict (key) do update set value = excluded.value`);
  const limpiar = () => {
    const ids = Object.values(IDS).map((x) => `'${x}'`).join(', ');
    if (ids) {
      sql(`update passkeys set revoked_at = now(), revoked_by = 'user' where revoked_at is null and user_id in (${ids})`);
      sql(`update users set status = 'active', status_until = null, status_reason = null, delete_at = null, delete_reason = null, phone_verified_at = coalesce(phone_verified_at, now()) where id in (${ids})`);
      sql(`update blocked_devices set lifted_at = now(), lift_reason = 'prueba 9t' where lifted_at is null and reason like 'prueba 9t%'`);
    }
    sql(`delete from platform_config where key like 'passkey_%'`);
    sql(`update feature_flags set enabled = true where key = 'cuenta.llaves'`);
  };
  try {
    // En local todas las peticiones llegan desde la misma dirección: los topes por dirección se suben mientras corre (la sección 7 baja el de fallos).
    cfg('passkey_fallos_hora', 100); cfg('passkey_retos_hora', 1000); await configLista();

    console.log('1 · Teléfono 390 (iPhone), cuenta sin llave: Descargar mis datos ofrece solo el código');
    const A = await nuevo(390, IOS), p = A.p;
    await entrarComo(p, MARI); IDS.M = sql(`select id from users where phone = '+1${MARI}'`);
    await p.goto(B + '/cuenta/ajustes/privacidad/datos'); await p.getByText('Pedir mi archivo').first().waitFor(); await dormir(800);
    ok((await boton(p, /Pedir con /).count()) === 0 && (await texto(p)).includes('te mandamos un código a tu teléfono'), 'sin llave: «Pedir mi archivo» con el código, ninguna opción de llave');

    console.log('2 · Con una llave guardada: «Pedir con Face ID» y «Mejor con un código»');
    const credM = await registrar(p);
    const kM = sql(`select id from passkeys where user_id = '${IDS.M}' and revoked_at is null`);
    await p.reload(); await boton(p, 'Pedir con Face ID').first().waitFor();
    ok((await boton(p, 'Mejor con un código').count()) === 1 && (await texto(p)).includes('confirmas que eres tú: con Face ID o con un código'), 'la llave va primero y el código sigue ahí');
    await p.screenshot({ path: OUT + 'l9t-datos-llave-390.png', fullPage: true });

    console.log('3 · Pedir el archivo con la llave: sin SMS');
    const acc = anotarAcciones(A.ctx);
    const otp0 = sql(`select count(*) from otp_codes where phone = '+1${MARI}'`), cont0 = Number(sql(`select sign_count from passkeys where id = ${kM}`));
    await boton(p, 'Pedir con Face ID').first().click();
    ok(await espera(() => sql(`select count(*) from data_exports where user_id = '${IDS.M}' and business_id is null and status in ('pendiente', 'armando', 'listo')`) === '1'), 'el pedido queda vivo (lo arma el barrido)');
    ok(sql(`select count(*) from otp_codes where phone = '+1${MARI}'`) === otp0, 'sin pedir ni mandar ningún código por SMS');
    ok(sql(`select count(*) from passkey_log where passkey_id = ${kM} and action = 'confirmo' and detail = 'data_export'`) === '1', 'el libro de las llaves anota «confirmo» con el propósito (data_export)');
    ok(sql(`select count(*) from account_changes where user_id = '${IDS.M}' and kind = 'export' and "to" = 'cuenta'`) === '1', 'el pedido queda en Cambios de cuenta, como con el código');
    ok(Number(sql(`select sign_count from passkeys where id = ${kM}`)) > cont0 && sql(`select last_used_at is not null from passkeys where id = ${kM}`) === 't', 'el contador de firmas sube y la última vez se guarda');
    ok(sql(`select count(*) from webauthn_challenges where user_id = '${IDS.M}' and purpose = 'data_export' and used_at is not null`) === '1', 'el reto era de «data_export», de esta cuenta, y quedó usado');
    await p.getByText(/Estamos armando tu archivo|Tu archivo está listo/).first().waitFor();
    await p.screenshot({ path: OUT + 'l9t-datos-pedido-390.png', fullPage: true });
    await espera(async () => (await acc.listas()).length >= 2, 5000); const accL = await acc.listas();
    ok(accL.length === 2, 'las dos acciones (el reto y la firma) pasaron por el servidor');
    const [RETO_ARCH, PEDIR_ARCH] = accL;

    console.log('4 · La misma firma otra vez → no (un uso)');
    const rep = await accion(p, PEDIR_ARCH, PEDIR_ARCH.body);
    ok(rep.ok === false && /Se acabó el tiempo/.test(msg(rep)), `repetir lo mismo → «${msg(rep)}»`);
    ok(sql(`select detail from passkey_log where user_id = '${IDS.M}' and action = 'confirmar_fallo' order by id desc limit 1`) === 'data_export: reto', 'el libro anota el intento fallido con su propósito y su motivo');

    console.log('5 · El propósito no se cambia');
    const oE = (await api(p, '/api/cuenta/llave/entrar/reto', {})).opciones;
    const rE = await firmar(p, oE, credM);
    const x1 = await accion(p, PEDIR_ARCH, [rE, null]);
    ok(x1.ok === false && /Se acabó el tiempo/.test(msg(x1)), 'el reto de ENTRAR firmado con su llave no pide el archivo');
    const oA = await accion(p, RETO_ARCH, []);
    ok(oA.ok === true && oA.opciones.userVerification === 'required' && oA.opciones.rpId === 'localhost' && oA.opciones.allowCredentials.length === 1 && oA.opciones.allowCredentials[0].id === credM,
      'el reto del archivo: verificación de la persona requerida, RP ID del entorno y solo las llaves vivas de esta cuenta');
    ok(sql(`select purpose || '|' || (user_id = '${IDS.M}') || '|' || round(extract(epoch from expires_at - created_at)) from webauthn_challenges where challenge_hash = '${huella(oA.opciones.challenge)}'`) === 'data_export|true|120', 'se guarda solo su huella, con su propósito, su cuenta y su vida (passkey_reto_s)');
    const rA = await firmar(p, oA.opciones, credM);
    const x2 = await api(p, '/api/cuenta/llave/entrar', { respuesta: rA });
    ok(x2.st === 400 && x2.error === 'reto_vencido', 'el reto del ARCHIVO no sirve para entrar');
    ok(sql(`select used_at is null from webauthn_challenges where challenge_hash = '${huella(oA.opciones.challenge)}'`) === 't', 'y ese intento no le gastó el reto (no era de entrar)');
    const x3 = await accion(p, PEDIR_ARCH, [rA, null]);
    ok(x3.ok === false && /Ya pediste un archivo/.test(msg(x3)), 'con su propósito sí confirma (y el pedido dice que ya hay uno vivo)');
    ok((await accion(p, PEDIR_ARCH, [rA, null])).ok === false && sql(`select used_at is not null from webauthn_challenges where challenge_hash = '${huella(oA.opciones.challenge)}'`) === 't', 'y una sola vez');

    console.log('6 · La llave de otra cuenta, el userHandle de otra cuenta');
    const Bq = await nuevo(1360), q = Bq.p;
    await entrarComo(q, YARI); IDS.Y = sql(`select id from users where phone = '+1${YARI}'`);
    const credY = await registrar(q);
    const oB = await accion(p, RETO_ARCH, []);
    const rB = await firmar(q, oB.opciones, credY);
    const x4 = await accion(p, PEDIR_ARCH, [rB, null]);
    ok(x4.ok === false && /Esa llave ya no sirve en tu cuenta/.test(msg(x4)), 'la llave de Yaritza en la sesión de Marisol → no confirma nada');
    ok(sql(`select detail from passkey_log where user_id = '${IDS.M}' and action = 'confirmar_fallo' order by id desc limit 1`) === 'data_export: no es de esta cuenta', 'anotado: no es de esta cuenta');
    const oC = await accion(p, RETO_ARCH, []);
    const rC = await firmar(p, oC.opciones, credM);
    const x5 = await accion(p, PEDIR_ARCH, [{ ...rC, response: { ...rC.response, userHandle: manejador(IDS.Y) } }, null]);
    ok(x5.ok === false && /No pudimos comprobar tu llave/.test(msg(x5)), 'su llave diciendo ser de otra cuenta (userHandle) → no');

    console.log('7 · Bloqueos: verificación restablecida, dispositivo bloqueado, cuenta suspendida, tope de fallos');
    // Se libera el archivo vivo de Marisol para que una confirmación buena llegue hasta el pedido (la prueba pasa por la base: un archivo no se borra).
    sql(`set session_replication_role = replica; update data_exports set status = 'fallo', requested_at = requested_at - interval '8 days' where user_id = '${IDS.M}' and business_id is null`);
    sql(`update users set phone_verified_at = null where id = '${IDS.M}'`);
    const oD = await accion(p, RETO_ARCH, []); const x6 = await accion(p, PEDIR_ARCH, [await firmar(p, oD.opciones, credM), null]);
    ok(x6.ok === false && /esta vez usa el código que te mandamos por texto/.test(msg(x6)) && sql(`select count(*) from data_exports where user_id = '${IDS.M}' and status in ('pendiente', 'armando', 'listo')`) === '0', 'el equipo restableció la verificación del teléfono → esta vez con el código, sin pedido');
    sql(`update users set phone_verified_at = now() where id = '${IDS.M}'`);
    const dev = (await A.ctx.cookies(B)).find((c) => c.name === 'tl_dev').value;
    sql(`insert into blocked_devices (device, user_id, reason, by_staff) values ('${dev}', '${IDS.M}', 'prueba 9t este', (select id from users where phone = '+1${ADM}'))`);
    const oF = await accion(p, RETO_ARCH, []); const x7 = await accion(p, PEDIR_ARCH, [await firmar(p, oF.opciones, credM), null]);
    ok(x7.ok === false && /Desde este dispositivo no se puede/.test(msg(x7)) && sql(`select count(*) from data_exports where user_id = '${IDS.M}' and status in ('pendiente', 'armando', 'listo')`) === '0', 'dispositivo bloqueado → no');
    sql(`update blocked_devices set lifted_at = now(), lift_reason = 'prueba 9t' where lifted_at is null and reason = 'prueba 9t este'`);
    const oG = await accion(p, RETO_ARCH, []);
    sql(`update users set status = 'suspended', status_until = now() + interval '14 days', status_reason = 'prueba 9t' where id = '${IDS.M}'`);
    const x8 = await accion(p, PEDIR_ARCH, [await firmar(p, oG.opciones, credM), null]);
    ok(x8.ok === false && sql(`select count(*) from data_exports where user_id = '${IDS.M}' and status in ('pendiente', 'armando', 'listo')`) === '0', 'cuenta suspendida → no (sin sesión que valga)');
    await p.goto(B + '/cuenta/ajustes/privacidad/datos');
    ok(await espera(() => p.url().includes('/entrar')), 'y la pantalla manda a Entrar');
    sql(`update users set status = 'active', status_until = null, status_reason = null where id = '${IDS.M}'`);
    cfg('passkey_fallos_hora', 3); await configLista();
    await p.goto(B + '/cuenta/ajustes/privacidad/datos'); await p.getByText('Descargar mis datos').first().waitFor();
    const x9 = await accion(p, PEDIR_ARCH, [{ id: 'x'.repeat(20), type: 'public-key', response: {} }, null]);
    ok(x9.ok === false && /Demasiados intentos/.test(msg(x9)), 'con el tope de fallos alcanzado (passkey_fallos_hora) → «Demasiados intentos»');
    cfg('passkey_fallos_hora', 100); await configLista();

    console.log('8 · Pedir con la llave otra vez, ya sin bloqueos; el interruptor apagado; el código sigue igual');
    await p.reload(); await boton(p, 'Pedir con Face ID').first().waitFor(); await boton(p, 'Pedir con Face ID').first().click();
    ok(await espera(() => sql(`select count(*) from data_exports where user_id = '${IDS.M}' and business_id is null and status in ('pendiente', 'armando', 'listo')`) === '1'), 'sin bloqueos, la llave pide el archivo');
    sql(`set session_replication_role = replica; update data_exports set status = 'fallo', requested_at = requested_at - interval '8 days' where user_id = '${IDS.M}' and business_id is null`);
    sql(`update feature_flags set enabled = false where key = 'cuenta.llaves'`);
    await p.reload(); await p.getByText('Pedir mi archivo').first().waitFor(); await dormir(800);
    ok((await boton(p, /Pedir con /).count()) === 0, 'con el interruptor cuenta.llaves apagado: solo el código');
    ok((await accion(p, RETO_ARCH, [])).ok === false, 'y el servidor tampoco da retos');
    sql(`update feature_flags set enabled = true where key = 'cuenta.llaves'`);
    await p.reload(); await boton(p, 'Mejor con un código').first().waitFor();
    // ESPERA-FIJA: otro código al mismo teléfono solo se manda 30 s después del anterior (REENVIO_SEG): los 16 s de antes de cada cambio de Configuración lo cubrían sin decirlo; ahora se espera solo lo que falta
    const faltaCodigo = Number(sql(`select coalesce(greatest(0, ceil(31 - extract(epoch from now() - max(created_at))))::int, 0) from otp_codes where phone = '+1${MARI}'`)); if (faltaCodigo > 0) await dormir(faltaCodigo * 1000);
    await boton(p, 'Mejor con un código').first().click();
    await p.getByText(/Sandbox: el código es \d{6}/).first().waitFor();
    const cod = /el código es (\d{6})/.exec(await texto(p))[1];
    await p.getByPlaceholder('482913').fill(cod);
    await boton(p, 'Pedir mi archivo').first().click();
    ok(await espera(() => sql(`select count(*) from data_exports where user_id = '${IDS.M}' and business_id is null and status in ('pendiente', 'armando', 'listo')`) === '1'), '«Mejor con un código»: el código por SMS pide el archivo como siempre');
    ok(sql(`select count(*) from otp_codes where phone = '+1${MARI}' and purpose = 'data_export' and used_at is not null`) === '1', 'con su código de propósito data_export, usado');

    console.log('9 · Escritorio 1360: borrar la cuenta con la llave');
    sql(`delete from otp_codes where phone = '+1${YARI}'`);
    const accB = anotarAcciones(Bq.ctx);
    await q.goto(B + '/cuenta/ajustes/borrar'); await boton(q, 'Seguir').first().click();
    await q.getByText('Tienes 30 días para arrepentirte').first().waitFor(); await boton(q, 'Seguir').first().click();
    await boton(q, /^Borrar con /).first().waitFor();
    ok((await texto(q)).includes('Confirma que eres tú') && (await boton(q, 'Mejor con un código').count()) === 1, 'paso 3: «Confirma que eres tú» con la llave o con un código');
    await q.screenshot({ path: OUT + 'l9t-borrar-llave-1360.png', fullPage: true });
    await boton(q, /^Borrar con /).first().click();
    ok(await espera(() => sql(`select delete_at between now() + interval '29 days' and now() + interval '31 days' from users where id = '${IDS.Y}'`) === 't'), 'el borrado queda programado a 30 días');
    ok(sql(`select count(*) from otp_codes where phone = '+1${YARI}'`) === '0', 'sin ningún código por SMS');
    ok(sql(`select count(*) from passkey_log where user_id = '${IDS.Y}' and action = 'confirmo' and detail = 'account_delete'`) === '1' && sql(`select count(*) from account_changes where user_id = '${IDS.Y}' and kind = 'delete'`) === '1', '«confirmo» (account_delete) en el libro y el borrado en Cambios de cuenta');
    await espera(async () => (await accB.listas()).length >= 2, 5000); const accBL = await accB.listas();
    ok(accBL.length === 2, `las dos acciones del borrado (el reto y la firma) pasaron por el servidor (${accBL.length})`);
    const [RETO_BOR, BORRAR] = accBL;
    await q.goto(B + '/cuenta/ajustes/borrar'); await boton(q, 'Cancelar el borrado').first().click();
    ok(await espera(() => sql(`select delete_at is null from users where id = '${IDS.Y}'`) === 't'), '«Cancelar el borrado» lo quita, como siempre');

    console.log('10 · El reto del borrado no pide el archivo; el del archivo no borra');
    sql(`set session_replication_role = replica; update data_exports set status = 'fallo', requested_at = requested_at - interval '8 days' where user_id = '${IDS.M}' and business_id is null`);
    const oH = await accion(p, RETO_BOR, []);
    ok(oH.ok === true && sql(`select purpose from webauthn_challenges where challenge_hash = '${huella(oH.opciones.challenge)}'`) === 'account_delete', 'el reto del borrado es de «account_delete»');
    const x10 = await accion(p, PEDIR_ARCH, [await firmar(p, oH.opciones, credM), null]);
    ok(x10.ok === false && /Se acabó el tiempo/.test(msg(x10)) && sql(`select count(*) from data_exports where user_id = '${IDS.M}' and status in ('pendiente', 'armando', 'listo')`) === '0', 'firmado y mandado a pedir el archivo → no');
    const oI = await accion(p, RETO_ARCH, []);
    const x11 = await accion(p, BORRAR, [await firmar(p, oI.opciones, credM), '']);
    ok(x11.ok === false && /Se acabó el tiempo/.test(msg(x11)) && sql(`select delete_at is null from users where id = '${IDS.M}'`) === 't', 'el reto del archivo firmado y mandado a borrar la cuenta → no, la cuenta sigue');

    console.log('11 · La llave quitada ya no confirma; sin llave solo el código');
    const oJ = await accion(p, RETO_ARCH, []); const rJ = await firmar(p, oJ.opciones, credM);
    await p.goto(B + '/cuenta/ajustes/privacidad'); await boton(p, 'Quitar').first().click(); await boton(p, 'Quitar').last().click();
    ok(await espera(() => sql(`select revoked_at is not null from passkeys where id = ${kM}`) === 't'), 'Privacidad › Quitar');
    const x12 = await accion(p, PEDIR_ARCH, [rJ, null]);
    ok(x12.ok === false && /Esa llave ya no sirve en tu cuenta/.test(msg(x12)), 'una firma hecha antes de quitarla → no');
    ok(/no tiene llave de acceso/.test(msg(await accion(p, RETO_ARCH, []))), 'y sin llaves vivas no hay reto');
    await p.goto(B + '/cuenta/ajustes/privacidad/datos'); await p.getByText('Pedir mi archivo').first().waitFor(); await dormir(800);
    ok((await boton(p, /Pedir con /).count()) === 0, 'la pantalla vuelve a ofrecer solo el código');
    console.log(`\nllave9t: ${n} comprobaciones ✓`);
  } finally {
    limpiar();
    await br.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
