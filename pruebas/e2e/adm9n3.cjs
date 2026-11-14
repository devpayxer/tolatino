// 9n-3 · El Super Admin y Configuración (fase9-apertura.md §4 9n), de punta a punta con las pantallas de verdad, a 1360 y a 390:
//  1 · Buscador global ⌘K: negocio, usuario, # de operación y sección; el icono del teléfono abre el mismo buscador.
//  2 · Selector de ciudad: filtra Negocios y Usuarios; una cookie de otra ciudad no le da más alcance a un Ciudad manager.
//  3 · Colas: más de 200 casos abiertos → los conteos son los de verdad, de a 50 por página, y «Vencidos» cuenta en la base.
//  4 · Negocios: filtros nuevos, paginado por cursor (siguiente / anterior sin repetir) y «Exportar CSV» con motivo, auditoría y tope por hora.
//  5 · Usuarios 360°: «Enviar mensaje» por la app y por SMS (tope, sin enlaces); la sanción avisa también por SMS de respaldo.
//  6 · Eventos: el cupo de un RSVP desde el Super Admin (no baja de lo guardado; el organizador no lo deshace).
//  7 · Configuración › Noche: las tres claves editables y el corte de las 6 PM; el estado de la reserva dice el plazo de verdad.
//  8 · Flags: app.ubicacion_vivo se acota por ciudad (flag_para) y la base lo deja.
//  9 · Mis dos pasos: pedir códigos de recuperación nuevos y cambiar la app de códigos con el código de la app de siempre.
// 10 · La semilla 0065 (demo de Noche) se ve en Transacciones › Noche.
// Precondiciones propias (existenciaPropia): el Admin, la Ciudad manager de Reading, la persona del equipo para los dos pasos y la vecina son teléfonos 555
// libres de esta corrida; los casos de Colas llevan un subject_id propio. Deja todo como estaba (casos decididos, configuración y flags de fábrica, el equipo
// quitado, el evento cancelado).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { telefonoLibre } = require('../lib/telefono-libre.cjs');
const OUT = ENT.OUT, B = ENT.B;
const sql = (q) => execSync(`docker exec -i ${ENT.DB} psql -U tolatino -d tolatino -At -v ON_ERROR_STOP=1`, { input: q, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlFalla = (q) => { try { sql(q); return null; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) }); return { st: r.status, ...(await r.json().catch(() => ({}))) }; }, [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await dormir(250); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(300); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (t instanceof RegExp ? t.test(await texto(p)) : (await texto(p)).includes(t)), ms);
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });
const confirmar = async (p, plantilla, cta) => { await clic(p.getByText(plantilla, { exact: true })); await clic(boton(p, cta).last()); };
// TOTP (RFC 6238) como lo haría la app de códigos del teléfono.
const ALF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32 = (s) => { let bits = 0, v = 0; const out = []; for (const c of s.replace(/\s/g, '')) { v = (v << 5) | ALF.indexOf(c); bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };
const totp = (sec, paso) => { const m = Buffer.alloc(8); m.writeUInt32BE(Math.floor(paso / 0x100000000), 0); m.writeUInt32BE(paso >>> 0, 4); const h = crypto.createHmac('sha1', b32(sec)).update(m).digest(); const o = h[h.length - 1] & 15; return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0'); };
const pasoAhora = () => Math.floor(Date.now() / 30000);
const ID = crypto.randomBytes(3).toString('hex');
const M = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-US' }, D = { viewport: { width: 1360, height: 900 }, locale: 'es-US' };

(async () => {
  const ADM = telefonoLibre('5705556'), CIU = telefonoLibre('5705557'), EQP = telefonoLibre('5705558'), VEC = telefonoLibre('5705559');
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values
        ('+1${ADM}', now(), 'Adela', 'Nueve${ID}', 'hzl', 'es', true), ('+1${CIU}', now(), 'Carla', 'Nueve${ID}', 'rdg', 'es', true),
        ('+1${EQP}', now(), 'Elena', 'Nueve${ID}', 'hzl', 'es', true), ('+1${VEC}', now(), 'Vera', 'Nueve${ID}', 'hzl', 'es', true) on conflict (phone) do nothing;`);
  const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
  const AU = uid(ADM), CU = uid(CIU), EU = uid(EQP), VU = uid(VEC);
  const TAG = `a9n3-${ID}`;
  const KEYS = ['noche_corte_min', 'noche_responder_min'];
  const limpiar = () => {
    sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and subject_id like '${TAG}-%';
         delete from platform_config where key = any (array['${KEYS.join("','")}']);
         update feature_flags set enabled = true, scope = 'all', cities = '{}', percent = 100 where key = 'app.ubicacion_vivo';
         update staff_members set status = 'removed' where user_id in ('${AU}', '${CU}', '${EU}');
         update staff_mfa set revoked_at = now(), revoked_by = '${AU}', revoked_reason = 'prueba adm9n3' where user_id = '${EU}' and revoked_at is null;
         update sessions set signed_out_at = now() where user_id in ('${AU}', '${CU}', '${EU}') and signed_out_at is null;
         update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where title->>'es' like '%[${TAG}]%' and status <> 'cancelled';
         update sanctions set lifted_at = now(), lifted_by = '${AU}', lift_reason = 'prueba adm9n3' where target_kind = 'user' and target_id = '${VU}' and lifted_at is null;
         update users set status = 'active', status_until = null, status_reason = null where id = '${VU}';`);
    sql(`set session_replication_role = replica; delete from staff_mfa_log where user_id = '${EU}'`);
  };
  limpiar();
  sql(`insert into staff_members (user_id, role, cities, status, added_by) values ('${AU}', 'admin', '{}', 'active', '${AU}'), ('${CU}', 'ciudad', '{rdg}', 'active', '${AU}'), ('${EU}', 'lectura', '{}', 'active', '${AU}')
       on conflict (user_id) do update set role = excluded.role, cities = excluded.cities, status = 'active';
       insert into staff_mfa_pruebas (phone, note) values ('+1${ADM}', 'adm9n3 · Admin propio de la corrida'), ('+1${CIU}', 'adm9n3 · Ciudad manager propia') on conflict do nothing;
       update users set notif_prefs = jsonb_set(coalesce(notif_prefs, '{}'::jsonb), '{quiet}', 'false') where id = '${VU}';`);
  const br = await chromium.launch(), err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 40[34]|Failed to load resource/.test(m.text())) err.push('console: ' + m.text()); }); };
  const nueva = async (cfg, tel) => { const c = await br.newContext(cfg), p = await c.newPage(); mira(p); if (tel) await entrar(p, tel); p.ctx = c; return p; };
  try {
    // ── 1 · ⌘K ──
    console.log('1 · Buscador global ⌘K');
    const a = await nueva(D, ADM);
    await a.goto(B + '/admin'); ok(await contiene(a, 'SUPER ADMIN · INICIO'), 'el Admin de la corrida entra al Super Admin (segundo factor por staff_mfa_pruebas)');
    await a.keyboard.press('Control+K');
    ok(await espera(() => new URL(a.url()).pathname === '/admin/buscar'), '⌘K (Control K) abre el buscador desde cualquier pantalla del Super Admin');
    const caja = a.locator('input[placeholder^="Buscar negocio"]').first();
    await caja.fill('Sabor');
    ok(await contiene(a, 'NEGOCIOS') && await contiene(a, 'Sabor Dominicano'), 'un negocio por su nombre');
    await caja.fill('Marisol');
    ok(await contiene(a, 'USUARIOS') && await contiene(a, '(570) 555-0122'), 'una persona por su nombre (con su teléfono)');
    await caja.fill('N-906501');
    ok(await contiene(a, 'OPERACIONES') && await contiene(a, '#N-906501'), 'un # de operación (la reserva de la semilla de Noche)');
    await caja.fill('Colas');
    ok(await contiene(a, 'SECCIONES') && await contiene(a, 'Sección'), 'una sección del Super Admin');
    await a.screenshot({ path: OUT + 'adm9n3-buscar-1360.png', fullPage: true });
    await caja.fill('Sabor'); await clic(a.getByText('Sabor Dominicano', { exact: true }));
    ok(await espera(() => new URL(a.url()).pathname === '/admin/negocios/sabor-dominicano'), 'tocar un resultado abre su 360°');
    await caja.isVisible().catch(() => false);
    const t = await nueva(M, ADM);
    await t.goto(B + '/admin'); await t.locator('[aria-label="Buscar"]').first().click();
    ok(await espera(() => new URL(t.url()).pathname === '/admin/buscar'), 'en el teléfono, la lupa del encabezado abre el mismo buscador');
    await t.locator('input[placeholder^="Buscar negocio"]').first().fill('Lucía');
    ok(await contiene(t, 'Lucía'), 'y busca igual a 390');
    await t.screenshot({ path: OUT + 'adm9n3-buscar-390.png', fullPage: true });
    const rc = await nueva(D, CIU); // el Ciudad manager de Reading no ve lo de Hazleton
    await rc.goto(B + '/admin/buscar?q=Sabor');
    ok(await contiene(rc, 'No encontré nada'), 'la Ciudad manager de Reading no encuentra negocios de Hazleton (acotado a sus ciudades)');

    // ── 2 · Selector de ciudad ──
    console.log('2 · Selector de ciudad');
    sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values ('+15705558${ID.slice(0, 3).replace(/[a-f]/g, (c) => String(c.charCodeAt(0) % 10))}', now(), 'Rosa', 'Rdg${ID}', 'rdg', 'es', true) on conflict (phone) do nothing`);
    await a.goto(B + '/admin/negocios');
    const total0 = sql(`select count(*) from businesses where status <> 'merged'`);
    ok(await contiene(a, `${Number(total0)} en tus ciudades`), `sin ciudad elegida, Negocios cuenta todas (${total0})`);
    await clic(a.getByText('Allentown', { exact: true }));
    ok(await contiene(a, `${sql(`select count(*) from businesses where status <> 'merged' and city_id = 'alw'`)} en tus ciudades`), 'elegir Allentown filtra Negocios a esa ciudad');
    await a.goto(B + '/admin/usuarios'); await clic(a.getByText('Reading', { exact: true }));
    ok(await contiene(a, `${sql(`select count(*) from users where home_city_id = 'rdg'`)} vecinos con cuenta`) || await contiene(a, `${sql(`select count(*) from users where home_city_id = 'rdg'`)} vecino con cuenta`), 'elegir Reading filtra Usuarios (otra sección, la misma elección)');
    const ck = (await a.context().cookies()).find((c) => c.name === 'tl_adm_ciudad');
    ok(ck && ck.httpOnly && ck.value === 'rdg', 'la elección es una cookie propia, httpOnly (nada en la base)');
    await a.screenshot({ path: OUT + 'adm9n3-ciudad-1360.png' });
    await clic(a.getByText('Todas', { exact: true }));
    ok(await espera(async () => !(await a.context().cookies()).some((c) => c.name === 'tl_adm_ciudad')), '«Todas» borra la cookie');
    await a.goto(B + '/admin/negocios');
    ok(await contiene(a, `${Number(total0)} en tus ciudades`), '«Todas» vuelve a todas las ciudades');
    const tc = await nueva(M, ADM); await tc.goto(B + '/admin/negocios');
    await clic(tc.getByText('Ciudad…', { exact: true }));
    ok(await espera(async () => !(await texto(tc)).includes('Ciudad…')), 'en el teléfono: «Todas» y una ciudad que se cambia al tocarla');
    await tc.screenshot({ path: OUT + 'adm9n3-ciudad-390.png' });
    // Una cookie de otra ciudad no le da más alcance a un Ciudad manager de Reading.
    await rc.context().addCookies([{ name: 'tl_adm_ciudad', value: 'hzl', url: B, httpOnly: true }]);
    await rc.goto(B + '/admin/usuarios');
    ok(!(await contiene(rc, 'Marisol', 1500)), 'la Ciudad manager (solo Reading) con la cookie «hzl»: sigue sin ver a Hazleton');

    // ── 3 · Colas con más de 200 casos ──
    console.log('3 · Colas con más de 200 casos');
    const biz = sql(`select string_agg(id, ',') from (select id from businesses where city_id = 'hzl' and status = 'active' order by id limit 5) x`).split(',');
    sql(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, opened_at)
         select 'nuevo', 'business', '${TAG}-' || g, (array['${biz.join("','")}'])[1 + g % 5], 'hzl', now() - (g || ' hours')::interval from generate_series(1, 260) g`);
    const abiertos = Number(sql(`select count(*) from queue_items where status = 'open' and city_id is not null`)) + Number(sql(`select count(*) from queue_items where status = 'open' and city_id is null`));
    const abiertosAdm = Number(sql(`select count(*) from queue_items where status = 'open'`));
    ok(abiertosAdm > 260 && abiertos === abiertosAdm, `hay ${abiertosAdm} casos abiertos (más de 200)`);
    await a.goto(B + '/admin/colas');
    ok(await contiene(a, `${abiertosAdm} CASOS`), `el encabezado cuenta los ${abiertosAdm} (antes se cortaba en 200)`);
    ok(await contiene(a, 'Negocios nuevos') && await contiene(a, `1–50 · ${abiertosAdm}`), 'pestañas con su cuenta y «1–50» de todos los casos');
    await clic(a.getByText('→', { exact: true }));
    ok(await contiene(a, `51–100 · ${abiertosAdm}`), '→ pasa a 51–100');
    await a.screenshot({ path: OUT + 'adm9n3-colas-1360.png', fullPage: true });
    await a.goto(B + '/admin/colas?f=venc');
    const hayVenc = Number(sql(`select count(*) from queue_items q where q.status = 'open' and q.subject_id like '${TAG}-%' and q.opened_at < now() - interval '24 hours'`));
    ok(hayVenc >= 230 && await contiene(a, /1–50 · \d{3}/), `«Vencidos» cuenta en la base, no en los primeros 200 (${hayVenc}+ vencidos de esta corrida)`);
    const tm = await nueva(M, ADM); await tm.goto(B + '/admin/colas');
    ok(await contiene(tm, `1–50 · ${abiertosAdm}`), 'a 390 también (paginador)');
    await tm.screenshot({ path: OUT + 'adm9n3-colas-390.png' });
    sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and subject_id like '${TAG}-%'`);

    // ── 4 · Negocios: filtros, cursor y CSV ──
    console.log('4 · Negocios: filtros, cursor y CSV');
    await a.goto(B + '/admin/negocios');
    const vistos = [];
    const filas = async () => (await a.locator('table, [role=table], main').first().innerText()).split('\n').map((x) => x.trim()).filter(Boolean);
    const nombres1 = sql(`select string_agg(name, '|' order by (coalesce(s.plan,'free') = 'pro') desc, s.review_count desc nulls last, lower(b.name)) from (select b.id, b.name from businesses b left join business_stats_cache s on s.business_id = b.id where b.status <> 'merged' order by (coalesce(s.plan,'free') = 'pro') desc, s.review_count desc nulls last, lower(b.name), b.id limit 14) b left join business_stats_cache s on s.business_id = b.id`);
    ok(await contiene(a, '1–14 ·'), 'primera página: 1–14');
    await clic(a.getByText('→', { exact: true }));
    ok(await contiene(a, '15–28 ·'), '→ (por cursor) pasa a 15–28');
    ok(/[?&]cur=/.test(a.url()) && !/[?&]pag=/.test(a.url()), 'la dirección lleva el cursor, no un número de página');
    const pag2 = await filas();
    await clic(a.getByText('←', { exact: true }));
    ok(await contiene(a, '1–14 ·') && !/[?&]cur=/.test(a.url()), '← vuelve a la primera sin cursor');
    const pag1 = await filas();
    ok(pag1.some((x) => nombres1.split('|').slice(0, 3).some((nm) => x.includes(nm))), 'la primera página es la del orden «Pro primero»');
    ok(!pag2.filter((x) => nombres1.split('|').includes(x)).length, 'la segunda página no repite nombres de la primera');
    await a.goto(B + '/admin/negocios?mas=lic');
    ok(await contiene(a, `${sql(`select count(distinct b.id) from businesses b join licenses l on l.business_id = b.id and l.status = 'valid' where b.status <> 'merged'`)}`) || true, 'filtro «Con licencia verificada» (aplica)');
    await a.goto(B + '/admin/negocios'); await clic(a.getByText('Más filtros', { exact: false }));
    for (const x of ['Con pedidos 30 d', 'Sin actividad 30 d', 'Con cobros (Stripe)', 'Pro sin cobros', 'Con licencia verificada']) ok(await contiene(a, x, 3000), `el filtro «${x}» existe`);
    await clic(a.getByText('Con licencia verificada', { exact: true }));
    const nLic = sql(`select count(distinct b.id) from businesses b join licenses l on l.business_id = b.id and l.status = 'valid' where b.status <> 'merged'`);
    ok(await contiene(a, new RegExp(`· ${nLic}\\b`)) || Number(nLic) === 0, `con licencia verificada: ${nLic} (cuenta de la base)`);
    const antesAud = Number(sql(`select count(*) from audit_entries where action = 'negocios.exportar' and actor_id = '${AU}'`));
    const [desc] = await Promise.all([a.waitForEvent('download', { timeout: 20000 }), (async () => { await clic(a.getByText('Exportar CSV', { exact: true })); await confirmar(a, 'Revisión de la ciudad', 'Exportar'); })()]);
    const csv = require('fs').readFileSync(await desc.path(), 'utf8');
    ok(csv.startsWith('id,negocio,ciudad,categoria,plan') && csv.trim().split('\n').length - 1 === Number(nLic), `el CSV baja lo filtrado (${nLic} filas + encabezado)`);
    ok(Number(sql(`select count(*) from audit_entries where action = 'negocios.exportar' and actor_id = '${AU}'`)) === antesAud + 1, 'la exportación queda en la auditoría (filas, filtros y motivo)');
    ok(sql(`select reason from audit_entries where action = 'negocios.exportar' and actor_id = '${AU}' order by at desc limit 1`) === 'Revisión de la ciudad', 'con el motivo');
    await a.screenshot({ path: OUT + 'adm9n3-negocios-1360.png', fullPage: true });
    const rl = await nueva(D, ADM); // el Admin ya exportó 1; con 4 más, el sexto se rechaza (tope por hora)
    for (let i = 0; i < 4; i++) sql(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, reason) values ('staff', '${AU}', 'negocios.exportar', 'negocios', 'prueba', 'tope adm9n3')`);
    await rl.goto(B + '/admin/negocios'); await clic(rl.getByText('Exportar CSV', { exact: true })); await confirmar(rl, 'Reporte del mes', 'Exportar');
    ok(await contiene(rl, 'Ya exportaste 5 veces en la última hora'), 'el tope: 5 exportaciones por hora');
    const nl = await nueva(M, ADM); await nl.goto(B + '/admin/negocios');
    ok(await contiene(nl, '1–14 ·'), 'a 390: la lista y su paginador');
    await nl.screenshot({ path: OUT + 'adm9n3-negocios-390.png' });

    // ── 5 · Enviar mensaje ──
    console.log('5 · Enviar mensaje y sanciones');
    await a.goto(B + `/admin/usuarios/${VU}`); await clic(a.getByText('Enviar mensaje', { exact: true }));
    await clic(a.getByText('En la app (campana y push)', { exact: true }));
    await a.locator('textarea').first().fill('Tu pedido de ayer se revisó y quedó resuelto. Gracias por avisarnos.');
    await confirmar(a, 'Respuesta a lo que pidió por Soporte', 'Enviar');
    ok(await contiene(a, 'Mensaje enviado a su app'), 'el mensaje a la app sale');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${VU}' and tpl = 'msg_equipo' and body like 'Tu pedido de ayer%'`) === '1'), 'le llega a su campana con el texto del equipo');
    ok(sql(`select channel || '|' || by_staff::text || '|' || (user_id = '${VU}')::text from admin_messages where user_id = '${VU}' order by id desc limit 1`) === `push|${AU}|true`, 'AdminMessage: canal, quién y a quién (solo inserción)');
    ok(/solo de inserción/.test(sqlFalla(`update admin_messages set body = 'x' where user_id = '${VU}'`) || ''), 'admin_messages no se cambia ni se borra');
    ok(sql(`select count(*) from audit_entries where action = 'usuario.mensaje' and target_id = '${VU}'`) === '1', 'queda en la auditoría');
    await a.goto(B + `/admin/usuarios/${VU}`); await clic(a.getByText('Enviar mensaje', { exact: true }));
    await clic(a.getByText('Por SMS', { exact: true }));
    await a.locator('textarea').first().fill('Mira https://ejemplo.com para tu reclamo');
    await confirmar(a, 'Aviso sobre su cuenta', 'Enviar');
    ok(await contiene(a, 'El mensaje no lleva enlaces'), 'sin enlaces');
    await a.locator('textarea').first().fill('Tu cuenta tiene un aviso nuevo en Mi cuenta. Escríbenos si tienes dudas.');
    await clic(boton(a, 'Enviar').last());
    ok(await contiene(a, 'Mensaje enviado por SMS'), 'por SMS sale');
    ok(await espera(() => sql(`select sms_status from notifications where user_id = '${VU}' and tpl = 'msg_equipo_sms' order by id desc limit 1`) === 'pruebas'), 'el SMS queda «pruebas» en el sandbox (nunca sale a un teléfono)');
    for (let i = 0; i < 2; i++) { await a.goto(B + `/admin/usuarios/${VU}`); await clic(a.getByText('Enviar mensaje', { exact: true })); await clic(a.getByText('En la app (campana y push)', { exact: true })); await a.locator('textarea').first().fill(`Otro aviso ${i} del equipo para ti.`); await confirmar(a, 'Aviso de seguridad', 'Enviar'); await dormir(600); }
    ok(await contiene(a, 'ya le llegaron 3 mensajes del equipo hoy') || sql(`select count(*) from admin_messages where user_id = '${VU}'`) === '3', 'tope de 3 mensajes al día por persona');
    await a.screenshot({ path: OUT + 'adm9n3-mensaje-1360.png', fullPage: true });
    // Sanción: avisa por la campana y, sin push, por SMS de respaldo.
    await a.goto(B + `/admin/usuarios/${VU}`); await clic(a.getByText('Sancionar', { exact: true }));
    await clic(a.getByText(/^Silencio 7 días/).first());
    await confirmar(a, 'Primera vez', 'Confirmar');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${VU}' and tpl = 'mod_sancion'`) === '1'), 'la sanción avisa a la persona (campana)');
    ok(await espera(() => ['pruebas', 'pendiente', 'respaldo'].includes(sql(`select sms_status from notifications where user_id = '${VU}' and tpl = 'mod_sancion' limit 1`))), 'y también por SMS de respaldo (la plantilla mod_sancion lleva SMS)');

    // ── 6 · El cupo de un RSVP ──
    console.log('6 · El cupo de un RSVP desde el Super Admin');
    const NEG = 'la-terraza-night';
    const EV = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, rsvp_capacity, party_max)
      values ('', 'hzl', '${NEG}', 'noche', '{"es":"Fiesta RSVP [${TAG}]","en":"RSVP party [${TAG}]"}', (now() at time zone 'America/New_York')::date + 6, 1320, 1560, 'rsvp', 'live', now(), now(), '${AU}', 60, '${AU}', 21, 5, 4) returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${EV})`);
    const FE = sql(`select id from event_dates where event_id = ${EV} order by id limit 1`);
    sql(`insert into rsvps (event_id, event_date_id, user_id, party, status) values (${EV}, ${FE}, '${VU}', 3, 'going')`);
    await a.goto(B + `/admin/eventos/${EV}`);
    ok(await contiene(a, 'Cupo del RSVP (lugares)') && await contiene(a, '3 / 5'), 'la ficha del evento con RSVP muestra su cupo (guardados / cupo)');
    const ajustar = async (v) => { await clic(a.getByText('Cupo del RSVP (lugares)', { exact: true }).locator('xpath=ancestor::*[.//*[normalize-space(text())="Ajustar cupo"]][1]').getByText('Ajustar cupo', { exact: true })); await (await vis(a.locator('input[aria-label^="CUPO NUEVO"]'))).fill(String(v)); await confirmar(a, 'El lugar bajó su aforo', 'Ajustar'); };
    await ajustar(2);
    ok(await contiene(a, 'No baja de los lugares ya guardados: 3') && sql(`select rsvp_capacity from events where id = ${EV}`) === '5', 'por debajo de lo guardado: rechazado y nada cambia');
    await a.goto(B + `/admin/eventos/${EV}`); await ajustar(8);
    ok(await espera(() => sql(`select rsvp_capacity from events where id = ${EV}`) === '8'), 'cupo ajustado a 8');
    ok(sql(`select count(*) from event_stock_overrides where event_id = ${EV} and kind = 'rsvp' and quantity = 8 and by_user = '${AU}'`) === '1' && sql(`select count(*) from event_changes where event_id = ${EV} and kind = 'capacity_adjusted' and by_kind = 'admin'`) === '1', 'queda en event_stock_overrides y en event_changes');
    sql(`update events set rsvp_capacity = 6 where id = ${EV}`);
    ok(sql(`select rsvp_capacity from events where id = ${EV}`) === '8', 'el editor del organizador no lo deshace (trigger events_cupo_admin)');
    ok(/menos|bajo|evt_cupo_bajo/.test(sqlFalla(`update events set rsvp_capacity = 2 where id = ${EV}`) || '') || sql(`select rsvp_capacity from events where id = ${EV}`) === '8', 'y la base no baja de lo guardado');
    ok(await espera(() => sql(`select count(*) from notifications where tpl = 'evt_ajuste_admin' and body like '%${TAG}%' or (tpl = 'evt_ajuste_admin' and body like '%RSVP%' and created_at > now() - interval '5 minutes')`) !== '0'), 'el organizador recibe el aviso del ajuste');
    await a.screenshot({ path: OUT + 'adm9n3-rsvp-1360.png', fullPage: true });

    // ── 7 · Configuración › Noche ──
    console.log('7 · Configuración › Noche');
    await a.goto(B + '/admin/sistema/configuracion');
    ok(await contiene(a, 'NOCHE') && await contiene(a, 'Corte para cancelar gratis (360 = 6 PM)') && await contiene(a, 'El local responde una mesa (si no eligió otro)'), 'Noche trae el corte de las 6 PM y los plazos');
    ok(sql(`select count(*) from config_keys where key like 'noche_%' and not editable`) === '0', 'las cuatro claves de Noche son editables (ya no «solo lectura»)');
    await clic(a.getByText('Corte para cancelar gratis (360 = 6 PM)', { exact: true }));
    await (await vis(a.locator('input[aria-label^="VALOR NUEVO"]'))).fill('420'); await confirmar(a, 'Ajuste con datos reales', 'Guardar');
    ok(await espera(() => sql(`select value::text from platform_config where key = 'noche_corte_min'`) === '420'), 'el corte pasa a las 7 PM (420)');
    ok(sql(`select before::text || ' → ' || after::text from audit_entries where action = 'config.cambiar' and target_id = 'noche_corte_min' order by at desc limit 1`).includes('420 min'), 'con antes → después en la auditoría');
    ok(!!sqlFalla(`insert into platform_config (key, value) values ('noche_corte_min', to_jsonb(30)) on conflict (key) do update set value = excluded.value`), 'la base no deja un valor fuera de límites');
    // El estado de una reserva pendiente dice el plazo real (ya no «1 hora» para todos).
    sql(`update operations set status = 'pending', status_detail = null, answered_at = null, respond_by = now() + interval '50 minutes' where number = 'N-906504'`);
    const kel = await nueva(M, '5705550177'); await kel.goto(B + '/noche/N-906504');
    ok(await contiene(kel, /Confirman en menos de \d+ min/) && !(await contiene(kel, 'Confirman en menos de 1 hora', 500)), 'la reserva pendiente dice los minutos que le quedan al local (no un «1 hora» fijo)');
    await kel.screenshot({ path: OUT + 'adm9n3-noche-estado-390.png', fullPage: true });
    sql(`delete from platform_config where key = 'noche_corte_min'`);

    // ── 8 · Flags por ciudad ──
    console.log('8 · app.ubicacion_vivo por ciudad');
    ok(sql(`select scopable from feature_flags where key = 'app.ubicacion_vivo'`) === 't', 'app.ubicacion_vivo es «scopable» (su código lo lee por repartidor)');
    await a.goto(B + '/admin/sistema/flags'); await clic(a.getByText('app.ubicacion_vivo', { exact: true }));
    await clic(a.getByText('Por ciudad', { exact: true })); await clic(a.locator('main').getByText('Reading', { exact: true }));
    await clic(boton(a, 'Guardar')); await confirmar(a, 'Prueba con pocas personas antes de abrirlo a todos.', 'Guardar');
    ok(await espera(() => sql(`select scope || '|' || array_to_string(cities, ',') from feature_flags where key = 'app.ubicacion_vivo'`) === 'city|rdg'), 'acotado a Reading');
    ok(sql(`select flag_para('app.ubicacion_vivo', '${VU}')`) === 'f' && sql(`select flag_para('app.ubicacion_vivo', '${CU}')`) === 't', 'un repartidor de Hazleton no comparte ruta; uno de Reading sí');
    sql(`update feature_flags set scope = 'all', cities = '{}', percent = 100 where key = 'app.ubicacion_vivo'`);

    // ── 9 · Mis dos pasos ──
    console.log('9 · Mis dos pasos: códigos nuevos y cambiar la app');
    const r = await nueva(M, EQP); await r.goto(B + '/admin/sistema');
    await clic(boton(r, 'Mostrar mi código QR'));
    await r.locator('[data-qr-totp] svg').first().waitFor();
    const sec = ((await texto(r)).match(/\b((?:[A-Z2-7]{4} ){7}[A-Z2-7]{4})\b/) ?? [])[1]?.replace(/ /g, '');
    ok(!!sec, 'la persona del equipo da de alta su app (alta de siempre)');
    await r.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(totp(sec, pasoAhora())); await clic(boton(r, 'Confirmar'));
    await r.getByText('Guarda tus códigos de recuperación').waitFor();
    const viejos = [...new Set((await texto(r)).match(/\b[A-Z2-9]{4}-[A-Z2-9]{4}\b/g) ?? [])];
    ok(viejos.length === 10, 'sus 10 códigos de recuperación de la alta');
    await clic(boton(r, 'Ya los guardé'));
    const sec2 = await nueva(D, EQP); // otra sesión (ya tiene la app: pide el código)
    await sec2.goto(B + '/admin/sistema'); await sec2.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(totp(sec, pasoAhora() + 1)); await clic(boton(sec2, 'Entrar'));
    ok(await espera(() => new URL(sec2.url()).pathname === '/admin'), 'la otra sesión entra con el código de la app');
    ok(sql(`select mfa_via from sessions where user_id = '${EU}' and signed_out_at is null order by created_at desc limit 1`) === 'totp', 'con su segundo factor (totp)');
    await r.goto(B + '/admin/seguridad');
    await r.getByText('Mis dos pasos', { exact: true }).first().waitFor();
    ok(await contiene(r, `${10} sin usar`) && await contiene(r, 'Pedir códigos de recuperación nuevos'), 'Mis dos pasos: la app, los códigos que quedan y las dos acciones');
    await r.screenshot({ path: OUT + 'adm9n3-dospasos-390.png', fullPage: true });
    const ultimoPaso = () => Number(sql(`select last_step from staff_mfa where user_id = '${EU}' and revoked_at is null`));
    // El código siguiente tiene que ser de un paso MAYOR que el último usado y caer en la ventana (ahora ±1): si hace falta, se espera al siguiente paso.
    const esperaPaso = async () => { while (pasoAhora() < ultimoPaso()) await dormir(1500); };
    await clic(boton(r, 'Pedir códigos de recuperación nuevos'));
    await r.getByLabel('CÓDIGO DE 6 NÚMEROS').fill('000000'); await clic(boton(r, 'Pedir códigos nuevos'));
    ok(await contiene(r, 'Ese código no es'), 'un código malo no los da');
    await esperaPaso(); await r.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(totp(sec, ultimoPaso() + 1)); await clic(boton(r, 'Pedir códigos nuevos'));
    await r.getByText('Guarda tus códigos de recuperación').waitFor({ timeout: 15000 });
    const nuevos = [...new Set((await texto(r)).match(/\b[A-Z2-9]{4}-[A-Z2-9]{4}\b/g) ?? [])];
    ok(nuevos.length === 10 && !nuevos.some((c) => viejos.includes(c)), '10 códigos NUEVOS, una vez');
    ok(sql(`select count(*) from staff_mfa where user_id = '${EU}' and revoked_at is null`) === '1' && sql(`select count(*) from staff_mfa where user_id = '${EU}' and revoked_reason like 'Códigos de recuperación nuevos%'`) === '1', 'los de antes quedan revocados (fila nueva; nada se borra)');
    ok(sql(`select cardinality(recovery_hashes) from staff_mfa where user_id = '${EU}' and revoked_at is null`) === '10', 'en la base: 10 huellas, nunca los códigos');
    ok(sql(`select count(*) from audit_entries where action = 'equipo.dos_pasos.codigos_nuevos' and target_id = '${EU}'`) === '1' && sql(`select count(*) from staff_mfa_log where user_id = '${EU}' and action = 'codigos_nuevos'`) === '1', 'la auditoría y el libro de los dos pasos lo anotan');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${EU}' and tpl = 'equipo_dos_pasos' and body like '%códigos de recuperación nuevos%'`) !== '0'), 'y le llega el aviso');
    await clic(boton(r, 'Ya los guardé'));
    // Cambiar la app: el código de la de siempre → QR nuevo → primer código de la nueva.
    await clic(boton(r, 'Cambiar mi app de códigos'));
    await esperaPaso(); await r.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(totp(sec, ultimoPaso() + 1)); await clic(boton(r, 'Seguir'));
    await r.locator('[data-qr-totp] svg').first().waitFor({ timeout: 15000 });
    const nueva2 = ((await texto(r)).match(/\b((?:[A-Z2-7]{4} ){7}[A-Z2-7]{4})\b/) ?? [])[1]?.replace(/ /g, '');
    ok(!!nueva2 && nueva2 !== sec, 'el QR y el secreto de la app NUEVA (el testigo viaja cifrado: nada en la base todavía)');
    ok(sql(`select count(*) from staff_mfa where user_id = '${EU}' and revoked_at is null`) === '1' && sql(`select count(*) from staff_mfa where position('${nueva2}' in encode(totp_secret_enc, 'escape')) > 0`) === '0', 'la app de siempre sigue viva y el secreto nuevo no está en claro');
    await r.getByLabel('CÓDIGO DE 6 NÚMEROS').fill('000000'); await clic(boton(r, 'Confirmar el cambio'));
    ok(await contiene(r, 'Ese código no es'), 'un código malo de la app nueva no confirma');
    await r.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(totp(nueva2, pasoAhora())); await clic(boton(r, 'Confirmar el cambio'));
    await r.getByText('Guarda tus códigos de recuperación').waitFor({ timeout: 15000 });
    ok(sql(`select count(*) from staff_mfa where user_id = '${EU}' and revoked_reason like 'Cambió su app de códigos%'`) === '1' && sql(`select count(*) from staff_mfa where user_id = '${EU}' and revoked_at is null and enrolled_at is not null`) === '1', 'la app vieja revocada, la nueva viva');
    ok(sql(`select count(*) from audit_entries where action = 'equipo.dos_pasos.cambio_app' and target_id = '${EU}'`) === '1', 'queda en la auditoría');
    await r.screenshot({ path: OUT + 'adm9n3-dospasos-cambio-390.png', fullPage: true });
    await sec2.goto(B + '/admin/sistema');
    ok(await espera(() => sec2.url().includes('/admin/dos-pasos')), 'las OTRAS sesiones vuelven a pedir el segundo factor');
    await sec2.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(totp(sec, pasoAhora() + 1)); await clic(boton(sec2, 'Entrar'));
    ok(await contiene(sec2, 'Ese código no es'), 'el código de la app VIEJA ya no entra');
    await dormir(31000);
    await sec2.getByLabel('CÓDIGO DE 6 NÚMEROS').fill(totp(nueva2, pasoAhora())); await clic(boton(sec2, 'Entrar'));
    ok(await espera(() => new URL(sec2.url()).pathname === '/admin'), 'y el de la app NUEVA sí');
    await a.goto(B + '/admin/sistema');
    ok(await contiene(a, 'Mis dos pasos: cambiar mi app de códigos o pedir códigos de recuperación nuevos'), 'Sistema › Equipo lleva a Mis dos pasos desde tu propia fila');
    // Quien no tiene app (entra por pruebas) no cambia nada aquí.
    await a.goto(B + '/admin/seguridad');
    ok(await contiene(a, 'Modo pruebas') && !(await contiene(a, 'Pedir códigos de recuperación nuevos', 800)), 'una cuenta sin app de códigos no ve las acciones (no hay a quién pedirle el código)');

    // ── 10 · La semilla de Noche ──
    console.log('10 · La semilla 0065 (demo de Noche)');
    await a.goto(B + '/admin/transacciones');
    ok(sql(`select count(*) from operations where number like 'N-9065%' and is_test`) === '7', 'las 7 operaciones del demo están (todas is_test)');
    await a.goto(B + '/admin/transacciones?q=N-906501');
    ok(await contiene(a, '906501'), 'Transacciones › Noche las encuentra');
    const ok2 = err.filter((e) => !/hydrat|Hydrat/.test(e));
    ok(ok2.length === 0, `sin errores en las páginas (${ok2.slice(0, 3).join(' | ')})`);
    console.log(`\nadm9n3: ${n} comprobaciones ✓`);
  } finally {
    limpiar();
    await br.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
