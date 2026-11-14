// 9j · Super Admin › Sistema completo y la seguridad del equipo (fase9-apertura.md §4 9j), de punta a punta contra :3100 (teléfono 390 y escritorio 1360):
//  1 Sin segundo factor el Super Admin no abre: una persona nueva del equipo (Rita, 570-555-0961, Solo lectura; NO está en la lista de las pruebas)
//    entra con el SMS y va a /admin/dos-pasos; ni las pantallas ni la API (/api/admin/vidrio → 404).
//  2 Alta de la app de códigos: el QR una vez, el secreto en texto, un código malo no, el primero bueno confirma, los 10 de recuperación una vez.
//  3 Otra sesión de solo SMS pide el código: el mismo código ya usado → no (repetido); el siguiente → entra.
//  4 Recuperación: un código de recuperación entra UNA vez; el mismo otra vez → no.
//  5 Bloqueo: 5 intentos malos en 15 minutos → «Demasiados intentos» (ni el código bueno entra); un Admin restablece (motivo, auditoría y aviso) y
//    Rita vuelve a dar de alta su app.
//  6 Equipo: el segundo factor de cada miembro; Ana (lista de las pruebas) dice «MODO PRUEBAS».
//  7 Flags: app.reportar al 10 % en Reading (con motivo y auditoría): ~10 % de las cubetas, nadie de Hazleton (Marisol va al Soporte de siempre); un
//    interruptor «todo o nada» no se deja acotar en la base; de vuelta a todas las ciudades.
//  8 Un error del servidor con un teléfono en el mensaje → tapado y agrupado (dos veces, un grupo); sin token o fuera de pruebas no existe.
//  9 Salud (con el barrido: los 5 servicios) y el mantenimiento programado (programar y cancelar con motivo); Respaldos con la semilla;
//    Estados (los 9); Lo que te toca con los paquetes de la Fase 9; el admin en inglés.
// Deja todo como estaba (app.reportar para todas las ciudades, el mantenimiento cancelado; Rita queda en el equipo sin segundo factor).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const crypto = require('crypto');
const OUT = ENT.S + '/cap/', B = ENT.B;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlFalla = (q) => { try { sql(q); return null; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) }); return { st: r.status, ...(await r.json().catch(() => ({}))) }; }, [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (t instanceof RegExp ? t.test(await texto(p)) : (await texto(p)).includes(t)), ms);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });
const confirmar = async (p, plantilla, cta) => { await clic(p.getByText(plantilla, { exact: true })); await clic(boton(p, cta).last()); };
// TOTP (RFC 6238) aquí, con node:crypto, como lo haría la app de códigos del teléfono.
const ALF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32 = (s) => { let bits = 0, v = 0; const out = []; for (const c of s.replace(/\s/g, '')) { v = (v << 5) | ALF.indexOf(c); bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };
const totp = (sec, paso) => { const m = Buffer.alloc(8); m.writeUInt32BE(Math.floor(paso / 0x100000000), 0); m.writeUInt32BE(paso >>> 0, 4); const h = crypto.createHmac('sha1', b32(sec)).update(m).digest(); const o = h[h.length - 1] & 15; return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0'); };
const pasoAhora = () => Math.floor(Date.now() / 30000);
const malo = (sec) => { const p = pasoAhora(); const buenos = new Set([totp(sec, p - 1), totp(sec, p), totp(sec, p + 1)]); for (let i = 0; ; i++) { const c = String(100000 + i * 7919).slice(-6); if (!buenos.has(c)) return c; } };
const barrido = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const ADM = '5705550199', MARI = '5705550122', RITA = '5705550961', TAG = `[s9j ${Date.now().toString(36)}]`;
// La hora de Hazleton para el formulario del mantenimiento («AAAA-MM-DD HH:MM»).
const enNY = (d) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value])); return `${p.year}-${p.month}-${p.day} ${String(Number(p.hour) % 24).padStart(2, '0')}:${p.minute}`; };

(async () => {
  // ── Preparar: Rita del equipo (Solo lectura), sin segundo factor y sin bloqueos de corridas anteriores ──
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values ('+1${RITA}', now(), 'Rita', 'Prueba', 'hzl', 'es', true) on conflict (phone) do nothing`);
  const AU = uid(ADM), RU = uid(RITA), MU = uid(MARI);
  ok(!!AU && !!RU && !!MU, 'Ana (Admin), Rita y Marisol existen');
  ok(sql(`select count(*) from staff_mfa_pruebas where phone = '+1${ADM}'`) === '1' && sql(`select count(*) from staff_mfa_pruebas where phone = '+1${RITA}'`) === '0', 'Ana está en la lista de las pruebas; Rita no');
  sql(`insert into staff_members (user_id, role, cities, status, added_by) values ('${RU}', 'lectura', '{}', 'active', '${AU}') on conflict (user_id) do update set role = 'lectura', status = 'active'`);
  const limpiar = () => {
    sql(`update staff_mfa set revoked_at = now(), revoked_by = '${AU}', revoked_reason = 'prueba sis9j' where user_id = '${RU}' and revoked_at is null`);
    sql(`update sessions set signed_out_at = now() where user_id = '${RU}' and signed_out_at is null`);
    sql(`update passkeys set revoked_at = now(), revoked_by = 'user' where user_id = '${RU}' and revoked_at is null`);
    // El bloqueo cuenta los fallos de 15 minutos (libro de solo inserción): para correr dos veces seguidas, los de la corrida anterior salen aquí.
    sql(`set session_replication_role = replica; delete from staff_mfa_log where user_id = '${RU}'`);
    sql(`update feature_flags set enabled = true, scope = 'all', cities = '{}', percent = 100 where key = 'app.reportar'`);
    sql(`update maintenance_windows set cancelled_at = now(), cancelled_by = '${AU}', cancel_reason = 'prueba sis9j' where cancelled_at is null and reason like '%[s9j %'`);
  };
  limpiar();
  const br = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 40[34]|Failed to load resource/.test(m.text())) err.push('console: ' + m.text()); }); };
  const nueva = async (w, h, mobile) => { const c = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile, locale: 'es-US' }); const p = await c.newPage(); mira(p); return p; };
  try {
    console.log('1 · Sin segundo factor el Super Admin no abre (ni por la API)');
    const r = await nueva(390, 844, true); await entrar(r, RITA);
    await r.goto(B + '/admin/sistema');
    ok(await espera(() => r.url().includes('/admin/dos-pasos')), 'Sistema → /admin/dos-pasos (sin el segundo factor de esta sesión)');
    ok(await contiene(r, 'Da de alta tu app de códigos') && await contiene(r, 'Tu cuenta del equipo necesita tu llave de acceso o tu app de códigos. El SMS solo no alcanza.'), 'la línea fija del plan (§1c)');
    ok(!(await contiene(r, 'EQUIPO ·', 800)) && (await r.locator('[data-dos-pasos="alta"]').count()) === 1, 'sin el marco: ni secciones ni colas');
    await r.goto(B + '/admin'); ok(await espera(() => r.url().includes('/admin/dos-pasos')), 'el Inicio del admin tampoco abre');
    const v0 = await api(r, '/api/admin/vidrio', { foto: '00000000-0000-0000-0000-000000000000', motivo: 'una prueba de la API sin el segundo factor' });
    ok(v0.st === 404, 'la API del Super Admin tampoco (404)');

    console.log('2 · Alta de la app de códigos');
    await r.screenshot({ path: OUT + 's9j-alta-390.png', fullPage: true });
    await clic(boton(r, 'Mostrar mi código QR'));
    await r.locator('[data-qr-totp] svg').first().waitFor();
    const sec = ((await texto(r)).match(/\b((?:[A-Z2-7]{4} ){7}[A-Z2-7]{4})\b/) ?? [])[1]?.replace(/ /g, '');
    ok(!!sec && sec.length === 32, 'el QR y el secreto en texto (160 bits en Base32)');
    ok(sql(`select count(*) from staff_mfa where user_id = '${RU}' and revoked_at is null and enrolled_at is null`) === '1' && sql(`select count(*) from staff_mfa where user_id = '${RU}' and revoked_at is null and position('${sec}' in encode(totp_secret_enc, 'escape')) > 0`) === '0', 'el alta empezada guarda el secreto CIFRADO');
    await r.screenshot({ path: OUT + 's9j-qr-390.png', fullPage: true });
    await r.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(malo(sec)); await clic(boton(r, 'Confirmar'));
    ok(await contiene(r, 'Ese código no es'), 'un código malo no confirma');
    await r.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(totp(sec, pasoAhora())); await clic(boton(r, 'Confirmar'));
    ok(await contiene(r, 'Guarda tus códigos de recuperación'), 'el primer código bueno confirma el alta');
    const codigos = [...new Set((await texto(r)).match(/\b[A-Z2-9]{4}-[A-Z2-9]{4}\b/g) ?? [])];
    ok(codigos.length === 10, `los 10 códigos de recuperación, una vez (${codigos.length})`);
    ok(sql(`select cardinality(recovery_hashes) || '|' || (enrolled_at is not null) from staff_mfa where user_id = '${RU}' and revoked_at is null`) === '10|true', 'en la base: dada de alta, 10 huellas (nunca los códigos)');
    ok(sql(`select count(*) from staff_mfa where user_id = '${RU}' and array_to_string(recovery_hashes, ',') like '%${codigos[0].replace('-', '')}%'`) === '0', 'los códigos no se guardan en claro');
    ok(sql(`select count(*) from audit_entries where action = 'equipo.dos_pasos.alta' and target_id = '${RU}'`) !== '0', 'el alta queda en la auditoría');
    await r.screenshot({ path: OUT + 's9j-codigos-390.png', fullPage: true });
    await clic(boton(r, 'Ya los guardé'));
    ok(await espera(() => /\/admin$/.test(new URL(r.url()).pathname)), 'con el segundo factor, al Inicio del admin');
    await r.goto(B + '/admin/usuarios'); ok(await espera(() => new URL(r.url()).pathname === '/admin/usuarios') && !(await contiene(r, 'Da de alta tu app', 800)), 'y su sección (Usuarios, Solo lectura) abre');
    ok(sql(`select mfa_via from sessions where user_id = '${RU}' and signed_out_at is null order by created_at desc limit 1`) === 'totp', 'la sesión quedó con su segundo factor (totp)');

    console.log('3 · Otra sesión: el código ya usado no vuelve a entrar; el siguiente sí');
    const usado = Number(sql(`select last_step from staff_mfa where user_id = '${RU}' and revoked_at is null`));
    const r2 = await nueva(1360, 900); await entrar(r2, RITA); await r2.goto(B + '/admin/sistema');
    ok(await espera(() => r2.url().includes('/admin/dos-pasos')) && await contiene(r2, 'Escribe el código de tu app'), 'una sesión nueva de solo SMS pide el código');
    const repetido = pasoAhora() - usado <= 1;
    await r2.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(totp(sec, usado)); await clic(boton(r2, 'Entrar'));
    ok(await contiene(r2, repetido ? 'Ese código ya se usó' : 'Ese código no es'), repetido ? 'el código ya usado → «ya se usó»' : 'el código viejo → no');
    if (repetido) ok(sql(`select count(*) from staff_mfa_log where user_id = '${RU}' and action = 'codigo_repetido'`) === '1', 'anotado como repetido (cuenta para el bloqueo)');
    ok(r2.url().includes('/admin/dos-pasos'), 'y no entra');
    while (pasoAhora() <= usado) await dormir(1000);
    await r2.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(totp(sec, pasoAhora())); await clic(boton(r2, 'Entrar'));
    ok(await espera(() => /\/admin$/.test(new URL(r2.url()).pathname)), 'el código del paso siguiente entra');
    ok(Number(sql(`select last_step from staff_mfa where user_id = '${RU}' and revoked_at is null`)) > usado, 'el último paso aceptado subió');
    await r2.screenshot({ path: OUT + 's9j-admin-1360.png', fullPage: true });

    console.log('4 · Un código de recuperación entra una sola vez');
    const r3 = await nueva(390, 844, true); await entrar(r3, RITA); await r3.goto(B + '/admin/dos-pasos'); await contiene(r3, 'Escribe el código de tu app');
    await clic(boton(r3, 'Usar un código de recuperación'));
    await r3.getByLabel('CÓDIGO DE RECUPERACIÓN').fill(codigos[0]); await clic(boton(r3, 'Entrar con el código de recuperación'));
    ok(await espera(() => /\/admin$/.test(new URL(r3.url()).pathname)), 'el código de recuperación entra');
    ok(sql(`select cardinality(recovery_hashes) from staff_mfa where user_id = '${RU}' and revoked_at is null`) === '9', 'y se gastó (quedan 9)');
    ok(sql(`select mfa_via from sessions where user_id = '${RU}' and signed_out_at is null order by created_at desc limit 1`) === 'recuperacion', 'la sesión dice por dónde entró');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RU}' and tpl = 'equipo_dos_pasos' and body like '%código de recuperación%'`) !== '0'), 'aviso a Rita: entró con un código de recuperación');
    const r4 = await nueva(390, 844, true); await entrar(r4, RITA); await r4.goto(B + '/admin/dos-pasos'); await contiene(r4, 'Escribe el código de tu app');
    await clic(boton(r4, 'Usar un código de recuperación'));
    await r4.getByLabel('CÓDIGO DE RECUPERACIÓN').fill(codigos[0]); await clic(boton(r4, 'Entrar con el código de recuperación'));
    ok(await contiene(r4, 'no es o ya se usó') && r4.url().includes('/admin/dos-pasos'), 'el mismo código de recuperación otra vez → no');

    console.log('5 · Bloqueo y el Admin que restablece');
    await clic(boton(r4, 'Volver al código de la app'));
    let bloqueado = false;
    for (let i = 0; i < 6 && !bloqueado; i++) {
      await r4.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(malo(sec)); await clic(boton(r4, 'Entrar'));
      // La respuesta vacía el campo: se espera a que vuelva (si no, el código siguiente se escribe antes y la respuesta lo borra).
      await espera(async () => (await r4.getByLabel('CÓDIGO DE 6 NÚMEROS').inputValue()) === '' && (await boton(r4, 'Revisando…').count()) === 0, 8000);
      bloqueado = (await texto(r4)).includes('Demasiados intentos');
    }
    ok(bloqueado && sql(`select count(*) from staff_mfa_log where user_id = '${RU}' and action = 'bloqueado'`) !== '0', '5 intentos malos en 15 minutos → «Demasiados intentos» (anotado)');
    while (pasoAhora() <= Number(sql(`select last_step from staff_mfa where user_id = '${RU}' and revoked_at is null`))) await dormir(1000);
    await r4.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(totp(sec, pasoAhora())); await clic(boton(r4, 'Entrar'));
    ok(await contiene(r4, 'Demasiados intentos') && r4.url().includes('/admin/dos-pasos'), 'bloqueada, ni el código bueno entra');
    await r4.screenshot({ path: OUT + 's9j-bloqueo-390.png', fullPage: true });
    const a = await nueva(1360, 900); await entrar(a, ADM);
    await a.goto(B + '/admin/sistema'); await a.getByText(/EQUIPO · \d+/).first().waitFor();
    ok(await contiene(a, /Ana Equipo[^·]*·[^·]*·[^·]*·[^·]*MODO PRUEBAS: entra sin segundo factor/) || await contiene(a, 'MODO PRUEBAS: entra sin segundo factor'), 'Ana (lista de las pruebas): «MODO PRUEBAS: entra sin segundo factor»');
    ok(sql(`select mfa_via from sessions where user_id = '${AU}' and signed_out_at is null order by created_at desc limit 1`) === 'pruebas' && sql(`select count(*) from staff_mfa_log where user_id = '${AU}' and action = 'pruebas'`) !== '0', 'su sesión queda marcada «pruebas» (y anotada)');
    ok(await contiene(a, /Rita Prueba[^]*?app de códigos desde [^(]*\(9 de recuperación\)/), 'Equipo: Rita «app de códigos desde… (9 de recuperación)»');
    await clic(boton(a, 'Restablecer sus dos pasos'));
    await confirmar(a, 'Perdió el teléfono y sus códigos de recuperación', 'Restablecer');
    ok(await espera(() => sql(`select count(*) from staff_mfa where user_id = '${RU}' and revoked_at is null`) === '0'), 'restablecido: la app de códigos de Rita quedó revocada');
    ok(sql(`select count(*) from audit_entries where action = 'equipo.dos_pasos.restablecer' and target_id = '${RU}' and reason = 'Perdió el teléfono y sus códigos de recuperación'`) !== '0', 'con motivo en la auditoría');
    ok(sql(`select count(*) from sessions where user_id = '${RU}' and mfa_at is not null`) === '0', 'sus sesiones vuelven a pedir el segundo factor');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RU}' and tpl = 'equipo_dos_pasos' and body like '%restableció%'`) !== '0'), 'y le llega el aviso');
    await r2.goto(B + '/admin/sistema');
    ok(await espera(() => r2.url().includes('/admin/dos-pasos')) && await contiene(r2, 'Da de alta tu app de códigos'), 'Rita (la sesión que ya había entrado) vuelve a dar de alta su app');
    await a.screenshot({ path: OUT + 's9j-equipo-1360.png', fullPage: true });

    console.log('6 · Flags: app.reportar al 10 % en Reading');
    await a.goto(B + '/admin/sistema/flags'); await a.getByText('app.reportar', { exact: true }).first().waitFor();
    ok(await contiene(a, /\d+ INTERRUPTORES/) && await contiene(a, 'Se cambia en El Compa'), 'cada interruptor; los de El Compa llevan a su sección');
    await clic(a.getByText('app.reportar', { exact: true }));
    await clic(a.getByText('Por porcentaje', { exact: true })); await clic(a.getByText('Reading', { exact: true }));
    await a.getByLabel('PORCENTAJE DE PERSONAS (1 A 99)').fill('10');
    await clic(boton(a, 'Guardar'));
    await confirmar(a, 'Prueba con pocas personas antes de abrirlo a todos.', 'Guardar');
    ok(await espera(() => sql(`select scope || '|' || percent || '|' || array_to_string(cities, ',') || '|' || enabled from feature_flags where key = 'app.reportar'`) === 'percent|10|rdg|true'), 'guardado: 10 % en Reading');
    ok(sql(`select count(*) from audit_entries where action = 'sistema.flag' and target_id = 'app.reportar' and after->>'alcance' = '10 % en rdg'`) !== '0', 'con antes → después y el motivo en la auditoría');
    const dentro = Number(sql(`select count(*) filter (where flag_cubeta('app.reportar', gen_random_uuid()::text) < 10) from generate_series(1, 4000)`));
    ok(dentro > 280 && dentro < 520, `la cubeta estable deja a ~10 % (${dentro} de 4000)`);
    ok(sql(`select flag_para('app.reportar', '${MU}')`) === 'f', 'Marisol (Hazleton) no lo tiene');
    const rdg = sql(`select u.id from users u where u.home_city_id = 'rdg' and flag_cubeta('app.reportar', u.id::text) < 10 limit 1`);
    if (rdg) ok(sql(`select flag_para('app.reportar', '${rdg}')`) === 't', 'una persona de Reading en su cubeta sí');
    const m = await nueva(390, 844, true); await entrar(m, MARI);
    await m.goto(B + '/soporte/reportar');
    ok(await espera(() => /\/soporte\?nuevo=1&tema=tecnico/.test(m.url())), 'Marisol abre «Reportar un problema» → el Soporte de siempre (el código lo lee por persona)');
    ok(!!sqlFalla(`update feature_flags set scope = 'city', cities = '{rdg}' where key = 'app.errores'`), 'la base no deja acotar un interruptor que se lee todo o nada');
    await a.screenshot({ path: OUT + 's9j-flags-1360.png', fullPage: true });
    await a.goto(B + '/admin/sistema/flags'); await clic(a.getByText('app.reportar', { exact: true }));
    await clic(a.getByText('Todas las ciudades', { exact: true })); await clic(boton(a, 'Guardar'));
    await confirmar(a, 'Se apaga mientras se arregla un problema.', 'Guardar');
    ok(await espera(() => sql(`select scope || '|' || percent from feature_flags where key = 'app.reportar'`) === 'all|100'), 'de vuelta a todas las ciudades');
    await m.goto(B + '/soporte/reportar'); ok(await espera(() => new URL(m.url()).pathname === '/soporte/reportar'), 'y Marisol lo vuelve a tener');

    console.log('7 · Un error del servidor con un teléfono en el mensaje → tapado y agrupado');
    const g0 = Number(sql(`select coalesce(sum(count), 0) from app_error_groups where kind = 'servidor' and title like '%Prueba 9j%'`));
    const sinToken = execSync(`curl -s -o /dev/null -w '%{http_code}' -X POST ${B}/api/interno/error-prueba`).toString();
    ok(sinToken === '404', 'sin el token la ruta no existe (404)');
    for (let i = 0; i < 2; i++) execSync(`curl -s -o /dev/null -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/error-prueba`);
    ok(await espera(() => Number(sql(`select coalesce(sum(count), 0) from app_error_groups where kind = 'servidor' and title like '%Prueba 9j%'`)) >= g0 + 2), 'los dos errores llegaron');
    ok(sql(`select count(*) from app_error_groups where kind = 'servidor' and title like '%Prueba 9j%'`) === '1', 'un solo grupo (agrupados por su huella)');
    ok(sql(`select title from app_error_groups where kind = 'servidor' and title like '%Prueba 9j%'`).includes('[tel]'), 'el título tapado: «[tel]»');
    ok(sql(`select count(*) from app_error_events e join app_error_groups g on g.id = e.group_id where g.kind = 'servidor' and (e.message like '%0142%' or e.stack like '%570-555%')`) === '0', 'ni el mensaje ni el stack guardan el teléfono');

    console.log('8 · Salud, mantenimiento, Respaldos, Estados, Lo que te toca y el admin en inglés');
    barrido();
    ok(await espera(() => sql(`select count(distinct service) from health_checks where at > now() - interval '10 minutes'`) === '5', 20000), 'el barrido mide los 5 servicios (base, barrido, push, disco, errores)');
    await a.goto(B + '/admin/sistema/salud');
    ok(await contiene(a, 'Base de datos') && await contiene(a, 'Cola de los avisos push') && await contiene(a, 'Disco del servidor') && await contiene(a, 'DISPONIBILIDAD') && await contiene(a, 'ERRORES 24 H'), 'Salud: kpis y una fila por servicio');
    ok(await contiene(a, /\d+ del servidor/), 'los errores del servidor cuentan en Salud');
    // 9b-3 · 9o puso la sección de verdad (deploy_releases): ya no es «Llegan cuando se encienda producción».
    ok(await contiene(a, 'DESPLIEGUES Y VUELTAS ATRÁS') && (await contiene(a, 'Todavía no hay despliegues anotados') || await contiene(a, /SIRVIÓ|VOLVIÓ ATRÁS|NO SALIÓ/)), 'Salud: los despliegues y vueltas atrás, con el detalle en Sistema › Despliegues');
    const d1 = new Date(Date.now() + 2 * 86400000), d2 = new Date(d1.getTime() + 3600000);
    await a.getByLabel('DESDE (AAAA-MM-DD HH:MM, HORA DE HAZLETON)').fill(enNY(d1)); await a.getByLabel('HASTA (6 HORAS COMO MÁXIMO)').fill(enNY(d2));
    await clic(boton(a, 'Programar')); await clic(a.getByText('Cambio de la base.', { exact: true }));
    const mot = a.locator('textarea').last(); await mot.fill(`Cambio de la base. ${TAG}`); await clic(boton(a, 'Programar').last());
    ok(await espera(() => sql(`select count(*) from maintenance_windows where reason like '%${TAG}%' and cancelled_at is null`) === '1'), 'mantenimiento programado (con su aviso ES/EN y el motivo)');
    ok(await contiene(a, 'Mantenimiento programado:'), 'Salud lo muestra');
    await a.screenshot({ path: OUT + 's9j-salud-1360.png', fullPage: true });
    await clic(a.getByRole('button', { name: 'Cancelar', exact: true }).first()); await confirmar(a, 'Ya no hace falta.', 'Cancelar');
    ok(await espera(() => sql(`select count(*) from maintenance_windows where reason like '%${TAG}%' and cancelled_at is not null and cancel_reason = 'Ya no hace falta.'`) === '1'), 'cancelado con motivo (no se borra)');
    ok(!!sqlFalla(`delete from maintenance_windows where reason like '%${TAG}%'`), 'la base no deja borrar un mantenimiento');
    const as = await nueva(390, 844, true); await entrar(as, ADM);
    await as.goto(B + '/admin/sistema/salud'); await contiene(as, 'Base de datos'); await as.screenshot({ path: OUT + 's9j-salud-390.png', fullPage: true });
    await a.goto(B + '/admin/sistema/respaldos');
    ok(await contiene(a, 'RESTAURACIONES DE PRUEBA') && await contiene(a, 'RESTAURÓ') && await contiene(a, 'RTO MEDIDO') && await contiene(a, 'Base completa') && await contiene(a, 'Sobre de llaves de recuperación'), 'Respaldos con la semilla: la restauración de prueba arriba, cada tipo y su RTO');
    ok(await contiene(a, 'Sandbox: lo que ves es la semilla de pruebas'), 'y dice que en el sandbox es la semilla');
    ok(!!sqlFalla(`update backup_runs set result = 'ok' where result = 'fallo'`), 'los respaldos no se cambian (solo inserción)');
    await a.screenshot({ path: OUT + 's9j-respaldos-1360.png', fullPage: true });
    await as.goto(B + '/admin/sistema/respaldos'); await contiene(as, 'RESTAURACIONES DE PRUEBA'); await as.screenshot({ path: OUT + 's9j-respaldos-390.png', fullPage: true });
    await a.goto(B + '/admin/sistema/estados');
    for (const k of ['1 · CARGA', '2 · VACÍO', '3 · SIN RESULTADOS', '4 · ERROR', '5 · SIN PERMISO', '6 · LO ESTÁ VIENDO OTRA PERSONA', '7 · ACCIÓN IRREVERSIBLE', '8 · ACCIÓN EN LOTE', '9 · DATO DESACTUALIZADO']) ok(await contiene(a, k, 3000), `Estados: ${k}`);
    await a.screenshot({ path: OUT + 's9j-estados-1360.png', fullPage: true });
    await a.goto(B + '/admin/sistema/apps?v=toca');
    ok(await contiene(a, 'PAQUETE 9-1 · PAGOS Y MENSAJES') && await contiene(a, 'PAQUETE 9-5 · LA REVISIÓN Y LOS TRES OK') && await contiene(a, 'PAQUETE 8-0 · EL DOMINIO'), 'Lo que te toca: de 8-0 a 9-5');
    ok(await contiene(a, /\d+ de \d+ del equipo todavía sin segundo factor/), '9-4.1 lo marca el sistema: quién del equipo no tiene segundo factor');
    await a.goto(B + '/admin/sistema/flags'); await clic(a.getByText('English', { exact: true }));
    ok(await contiene(a, 'Team and permissions') && await contiene(a, /\d+ FLAGS/) && await contiene(a, 'Health'), 'el admin en inglés (las pestañas y la pantalla)');
    await clic(a.getByText('Español', { exact: true })); ok(await contiene(a, 'Equipo y permisos'), 'y de vuelta en español');
    // Un rol sin sys:editar ve Sistema pero no cambia nada: Rita (Solo lectura) no tiene Sistema.
    const ok2 = err.filter((e) => !/hydrat|Hydrat/.test(e));
    ok(ok2.length === 0, `sin errores en las páginas (${ok2.slice(0, 2).join(' | ')})`);
    console.log(`\nsis9j: ${n} comprobaciones ✓`);
  } finally {
    limpiar();
    await br.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
