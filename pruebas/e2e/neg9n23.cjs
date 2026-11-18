// 9n-23 · «Panel del dueño» (LAUNCH L151, REVISION 9n-13): desde Super Admin › Negocio 360° alguien del equipo con neg:ver abre el panel de un negocio en
// SOLO LECTURA, de punta a punta con las pantallas de verdad:
//  1 · Escritorio 1360, ES: el 360° ofrece «Panel del dueño»; se abre con el aviso «VISTA DEL EQUIPO · SOLO LECTURA», Tu página se dibuja, cada sección queda
//      en la auditoría (negocio.ver_panel) y el historial del 360° lo dice. Navegar dentro del panel conserva la vista del equipo.
//  2 · Escribir no se puede: en «Quiénes somos» el «Guardar» queda apagado y la base no cambia; «Cerrar por hoy» (Hoy) lo rechaza el servidor con su mensaje
//      («Solo lectura: no se guardó nada · …») y closed_on sigue igual.
//  3 · Leer no deja huella: abrir una conversación sin leer no la marca leída (biz_unread igual).
//  4 · Teléfono 390, EN: «TEAM VIEW · READ ONLY», sin scroll de lado.
//  5 · Sin acceso: un vecino con ?equipo=1 y alguien del equipo SIN neg:ver ven «Sin acceso»; el dueño con ?equipo=1 ve su panel de siempre (sin aviso).
// Precondiciones propias: el Admin, la persona del equipo sin Negocios (con un rol de prueba que solo ve Inicio), el dueño y el vecino son teléfonos 555
// libres de esta corrida; el negocio es una copia propia de Sabor Dominicano (negocioSinDueno) con su dueño y una conversación sin leer. Al final el
// negocio queda «closed», el equipo «removed» y las sesiones cerradas (nada se borra).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { telefonoLibre } = require('../lib/telefono-libre.cjs');
const { negocioSinDueno } = require('../lib/negocio-nuevo.cjs');
const OUT = ENT.OUT, B = ENT.B;
const sql = (q) => execSync(`docker exec -i ${ENT.DB} psql -U tolatino -d tolatino -At -v ON_ERROR_STOP=1`, { input: q, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
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
const ID = crypto.randomBytes(3).toString('hex');
const ROL = 'prueba_sin_negocios';
const M = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US' }, D = { viewport: { width: 1360, height: 900 }, locale: 'es-US' };

(async () => {
  const ADM = telefonoLibre('5705556'), LEC = telefonoLibre('5705557'), DUE = telefonoLibre('5705558'), VEC = telefonoLibre('5705559');
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values
        ('+1${ADM}', now(), 'Ana', 'Panel${ID}', 'hzl', 'es', true), ('+1${LEC}', now(), 'Lalo', 'Panel${ID}', 'hzl', 'es', true),
        ('+1${DUE}', now(), 'Pedro', 'Panel${ID}', 'hzl', 'es', true), ('+1${VEC}', now(), 'Nora', 'Panel${ID}', 'hzl', 'es', true) on conflict (phone) do nothing;`);
  const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
  const AU = uid(ADM), LU = uid(LEC), DU = uid(DUE), VU = uid(VEC);
  // El negocio de la corrida (copia de Sabor Dominicano, Comida) con su dueño y una conversación sin leer de la vecina.
  const neg = negocioSinDueno('sabor-dominicano', `Panel Dueno ${ID}`);
  // Un rol de prueba que solo ve Inicio (ningún rol de la matriz se queda sin Negocios): para «alguien del equipo sin neg:ver».
  sql(`insert into staff_roles (key, name, descr, sort) values ('${ROL}', '{"es":"Prueba · sin Negocios","en":"Test · no Businesses"}', '{"es":"Solo para las pruebas (neg9n23).","en":"Tests only (neg9n23)."}', 99) on conflict (key) do nothing;
       insert into role_permissions (role, section, action, allowed) values ('${ROL}', 'home', 'ver', true) on conflict (role, section, action) do update set allowed = true;
       update role_permissions set allowed = false where role = '${ROL}' and section = 'neg';
       insert into staff_members (user_id, role, cities, status, added_by) values ('${AU}', 'admin', '{}', 'active', '${AU}'), ('${LU}', '${ROL}', '{}', 'active', '${AU}')
       on conflict (user_id) do update set role = excluded.role, cities = excluded.cities, status = 'active';
       insert into staff_mfa_pruebas (phone, note) values ('+1${ADM}', 'neg9n23 · Admin propio'), ('+1${LEC}', 'neg9n23 · equipo sin Negocios') on conflict do nothing;
       insert into business_stats_cache (business_id, plan) values ('${neg.id}', 'free') on conflict (business_id) do nothing;
       update businesses set owner_user_id = '${DU}', closed_on = null, about = '{"es":"Comida criolla de la casa ${ID}.","en":"Home-style food ${ID}."}'::jsonb where id = '${neg.id}';
       insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours)
         values ('${neg.id}', '${DU}', 'owner', 'Pedro Panel${ID}', '{"es":"Dueño","en":"Owner"}'::jsonb, 'active', false, '{all}', 2020, 0, true);`);
  const TH = sql(`insert into chat_threads (user_id, business_id, city_id, last_from, last_text, biz_unread) select '${VU}', id, city_id, 'user', '¿Tienen mangú hoy? ${ID}', 1 from businesses where id = '${neg.id}' returning id`).split('\n')[0];
  sql(`insert into chat_messages (thread_id, sender, sender_user_id, body) values (${TH}, 'user', '${VU}', '¿Tienen mangú hoy? ${ID}')`);
  const SIN_LEER = () => sql(`select biz_unread from chat_threads where id = ${TH}`);
  const AUD = (sec) => +sql(`select count(*) from audit_entries where action = 'negocio.ver_panel' and target_kind = 'business' and target_id = '${neg.id}' and actor_id = '${AU}'${sec ? ` and after->>'seccion' = '${sec}'` : ''}`);
  const limpiar = () => sql(`update businesses set status = 'closed', status_reason = 'prueba neg9n23', status_at = now() where id = '${neg.id}';
       update business_members set status = 'removed', removed_reason = 'left', removed_at = now() where business_id = '${neg.id}' and status = 'active';
       update staff_members set status = 'removed' where user_id in ('${AU}', '${LU}');
       update sessions set signed_out_at = now() where user_id in ('${AU}', '${LU}', '${DU}', '${VU}') and signed_out_at is null;`);
  const br = await chromium.launch(), err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 40[134]|Failed to load resource/.test(m.text())) err.push('console: ' + m.text()); }); };
  const nueva = async (cfg, tel) => { const c = await br.newContext(cfg), p = await c.newPage(); mira(p); if (tel) await entrar(p, tel); return p; };
  try {
    // ── 1 · El 360° abre el panel del dueño en solo lectura ──
    console.log('1 · Escritorio · el 360° abre «Panel del dueño» en solo lectura, auditado');
    const a = await nueva(D, ADM);
    await a.goto(B + `/admin/negocios/${neg.id}`);
    ok(await contiene(a, 'Panel del dueño'), 'el 360° ofrece «Panel del dueño»');
    const A0 = AUD();
    const [pp] = await Promise.all([a.context().waitForEvent('page'), clic(boton(a, 'Panel del dueño'))]);
    mira(pp); await pp.waitForLoadState('domcontentloaded');
    ok(/\/panel\/[^/?]+\?equipo=1$/.test(new URL(pp.url()).pathname + new URL(pp.url()).search) && pp.url().includes(neg.id), 'abre /panel/{negocio}?equipo=1 en otra pestaña');
    ok(await contiene(pp, 'VISTA DEL EQUIPO · SOLO LECTURA'), 'el aviso «VISTA DEL EQUIPO · SOLO LECTURA» arriba');
    ok(await contiene(pp, 'LO QUE VEN LOS CLIENTES') && await contiene(pp, neg.nombre), 'Tu página se dibuja (las secciones del dueño, con su nombre)');
    ok(!(await texto(pp)).includes('Sin acceso a esta área'), 'no es «Sin acceso»');
    await pp.screenshot({ path: OUT + 'n9n23-equipo-1360.png', fullPage: false });
    ok(AUD() === A0 + 1 && AUD('pag') >= 1, 'la apertura quedó en la auditoría (negocio.ver_panel, sección «pag»), con quién');
    ok(sql(`select reason from audit_entries where action = 'negocio.ver_panel' and target_id = '${neg.id}' and actor_id = '${AU}' order by at desc limit 1`) === 'Panel del dueño (solo lectura)', 'con su motivo');
    await a.goto(B + `/admin/negocios/${neg.id}`);
    ok(await contiene(a, 'abrió en solo lectura el panel de'), 'el historial del 360° lo dice');

    // ── 2 · Escribir no se puede ──
    console.log('2 · Escribir: «Guardar» apagado; lo que se intenta, el servidor lo rechaza');
    const ABOUT0 = sql(`select about::text from businesses where id = '${neg.id}'`);
    await clic(pp.getByText('Quiénes somos', { exact: true }));
    ok(await espera(async () => pp.url().includes('/pagina/about') && pp.url().includes('equipo=1')), 'navegar dentro del panel conserva ?equipo=1');
    ok(await contiene(pp, 'VISTA DEL EQUIPO · SOLO LECTURA') && await contiene(pp, 'QUIÉNES SOMOS'), 'la sección se dibuja con el aviso');
    await pp.locator('textarea').first().fill(`Texto del equipo ${ID}`);
    const g = await vis(boton(pp, 'Guardar'));
    ok(!!g && (await g.getAttribute('aria-disabled')) === 'true', '«Guardar» está apagado en la vista del equipo');
    await g.click({ force: true }).catch(() => {}); await dormir(800);
    ok(sql(`select about::text from businesses where id = '${neg.id}'`) === ABOUT0, 'la base no cambió («Quiénes somos» igual)');
    ok(AUD('pag/about') >= 1, 'la sección «Quiénes somos» también quedó en la auditoría');
    await pp.goto(B + `/panel/${neg.id}/hoy?equipo=1`);
    ok(await contiene(pp, 'VISTA DEL EQUIPO · SOLO LECTURA') && await contiene(pp, 'Cerrar por hoy'), 'Hoy se dibuja con «Cerrar por hoy»');
    await clic(boton(pp, 'Cerrar por hoy'));
    ok(await contiene(pp, 'Solo lectura: no se guardó nada') && await contiene(pp, 'No tienes acceso a esta parte del panel.'), 'el servidor lo rechaza y la pantalla lo dice («Solo lectura: no se guardó nada · No tienes acceso…»)');
    await dormir(500);
    ok(sql(`select coalesce(closed_on::text, '') from businesses where id = '${neg.id}'`) === '', 'la base no cambió (closed_on sigue vacío)');
    ok(+sql(`select count(*) from audit_entries where action in ('panel.cerrar_hoy', 'panel.abrir_hoy') and target_id = '${neg.id}'`) === 0, 'ningún «cerrar hoy» en la auditoría');
    await pp.screenshot({ path: OUT + 'n9n23-rechazo-1360.png', fullPage: false });

    // ── 3 · Leer no deja huella ──
    console.log('3 · Leer no marca: la conversación sigue sin leer para el dueño');
    const U0 = SIN_LEER();
    ok(+U0 >= 1, 'la conversación de la vecina está sin leer');
    await pp.goto(B + `/panel/${neg.id}/mensajes?det=msg:${TH}&equipo=1`);
    ok(await contiene(pp, `¿Tienen mangú hoy? ${ID}`), 'la conversación se ve');
    await dormir(800);
    ok(SIN_LEER() === U0, 'y sigue sin leer (biz_unread igual): mirar no la marcó');
    ok(AUD('msg') >= 1, 'Mensajes también quedó en la auditoría');

    // ── 4 · Teléfono, en inglés ──
    console.log('4 · Teléfono 390 · EN');
    const m = await nueva(M, ADM);
    await m.context().addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await m.goto(B + `/panel/${neg.id}?equipo=1`);
    ok(await contiene(m, 'TEAM VIEW · READ ONLY') && await contiene(m, 'WHAT CLIENTS SEE'), '«TEAM VIEW · READ ONLY» y Your page en inglés');
    const lado = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(lado <= 1, `sin scroll de lado (${lado} px de más)`);
    await m.screenshot({ path: OUT + 'n9n23-equipo-390.png', fullPage: false });

    // ── 5 · Sin acceso ──
    console.log('5 · Sin acceso: vecino y equipo sin Negocios; el dueño, su panel de siempre');
    const A1 = +sql(`select count(*) from audit_entries where action = 'negocio.ver_panel' and target_id = '${neg.id}'`);
    const v = await nueva(M, VEC);
    await v.context().addCookies([{ name: 'tl_lang', value: 'es', url: B }]);
    await v.goto(B + `/panel/${neg.id}?equipo=1`);
    ok(await contiene(v, 'Sin acceso a esta área') && !(await texto(v)).includes('VISTA DEL EQUIPO'), 'un vecino con ?equipo=1: «Sin acceso», sin aviso');
    const l = await nueva(D, LEC);
    await l.goto(B + `/admin`);
    ok(await contiene(l, 'SUPER ADMIN'), 'la persona del equipo sin Negocios sí entra al Super Admin (es del equipo, con segundo factor)');
    await l.goto(B + `/panel/${neg.id}?equipo=1`);
    ok(await contiene(l, 'Sin acceso a esta área') && !(await texto(l)).includes('VISTA DEL EQUIPO'), 'alguien del equipo SIN neg:ver con ?equipo=1: «Sin acceso»');
    ok(+sql(`select count(*) from audit_entries where action = 'negocio.ver_panel' and target_id = '${neg.id}'`) === A1, 'ninguno de los dos dejó una apertura en la auditoría');
    const d = await nueva(D, DUE);
    await d.goto(B + `/panel/${neg.id}?equipo=1`);
    ok(await contiene(d, 'LO QUE VEN LOS CLIENTES') && !(await texto(d)).includes('VISTA DEL EQUIPO'), 'el dueño con ?equipo=1: su panel de siempre, sin aviso (el modo del equipo nunca le baja a solo lectura)');
    ok(!err.length, 'sin errores en las páginas' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
    console.log(`\n${n} ✓ · neg9n23`);
  } finally {
    await br.close().catch(() => {});
    limpiar();
  }
})().catch((e) => { console.error(e); process.exit(1); });
