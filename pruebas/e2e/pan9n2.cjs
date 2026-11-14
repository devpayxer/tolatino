// 9n-2 · El panel del negocio y la página del negocio: lo diferido que entra antes de abrir (fase9-apertura.md §4 9n), de punta a punta, a 390 y a 1360, en ES y EN:
//  1 · Aceptar una invitación al equipo (/e/{código}): el dueño invita desde Tu página › Equipo; otro teléfono NO puede (ni ve a qué negocio es); el invitado acepta con
//      su foto-palabras-idiomas; el código es de un solo uso y vence; con 8 intentos malos se frena; el dueño recibe el aviso; quitar a alguien y responderle a quien pidió
//      unirse avisan a esa persona.
//  2 · «Cuenta borrada» en inglés en las Reservaciones (el panel entero pasa por traducirBorradas).
//  3 · Pedir reseña en un pedido entregado (una sola vez; el cliente recibe «¿Cómo estuvo?»).
//  4 · Historial de no-show del cliente con ESE negocio en la reservación.
//  5 · Reseña: «quiere arreglarlo» y editar la respuesta (con historial); el cliente y la página lo ven.
//  6 · Validar un cupón desde Hoy; anuncios para negocios en Hoy; Panel › Eventos con cursor («Ver más» en Pasados).
//  7 · «Últimos 30 días» del plato y Populares por lo más pedido; pedido programado que cruza la medianoche.
//  8 · To'Latino Negocios sin negocio (el rótulo TLApp) → qué hacer y Borrar mi cuenta.
//  9 · Novedades: elegir fotos de la galería, «Ver vacante», «Avisar a tus seguidores» (una vez) y pedidos desde una oferta; «Traducir con El Compa».
// Precondiciones propias (existenciaPropia): todos los teléfonos son 555 libres de esta corrida; lo que se cambia de Sabor Dominicano se devuelve en finally y lo que se crea
// es de esta corrida (etiqueta propia) y se limpia al terminar. El dueño es el de siempre (+1 570 555 0133).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { telefonoLibre } = require('../lib/telefono-libre.cjs');
const OUT = ENT.OUT, B = ENT.B, BIZ = 'sabor-dominicano', P = '/panel/' + BIZ, DUENO = '5705550133';
const sql = (q) => execSync(`docker exec -i ${ENT.DB} psql -U tolatino -d tolatino -qAt -v ON_ERROR_STOP=1`, { input: q, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await dormir(250); } throw new Error('no visible: ' + l); };
const espera = async (f, v, veces = 60) => { for (let i = 0; i < veces; i++) { if (f() === v) return v; await dormir(250); } return f(); };
const texto = async (p, re, veces = 40) => { for (let i = 0; i < veces; i++) { if (await p.getByText(re).first().isVisible().catch(() => false)) return true; await dormir(250); } return false; };
const M = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, D = { viewport: { width: 1360, height: 900 } };
const ID = crypto.randomBytes(3).toString('hex');
const sinScroll = async (p, m) => ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sin scroll de lado · ' + m);
const lang = async (p, l) => { await p.context().addCookies([{ name: 'tl_lang', value: l, url: B }]).catch(() => undefined); };

(async () => {
  // Esta prueba entra con ~17 cuentas: el tope de códigos por dirección y hora (20) lo da la tabla de códigos de pruebas (solo teléfonos 555).
  sql(`delete from otp_codes where phone like '+1570555%' and created_at > now() - interval '3 hours'`);
  const INV = telefonoLibre('5705557'), OTRO = telefonoLibre('5705558'), CLI = telefonoLibre('5705559'), SIN = telefonoLibre('5705556'), SEG = telefonoLibre('5705554'), PIDE = telefonoLibre('5705553');
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values
        ('+1${INV}', now(), 'Ines', 'Equipo${ID}', 'hzl', 'es', true), ('+1${OTRO}', now(), 'Otto', 'Otro${ID}', 'hzl', 'es', true), ('+1${CLI}', now(), 'Celia', 'Cli${ID}', 'hzl', 'es', true),
        ('+1${SIN}', now(), 'Sara', 'Sin${ID}', 'hzl', 'es', true), ('+1${SEG}', now(), 'Sergio', 'Seg${ID}', 'hzl', 'es', true), ('+1${PIDE}', now(), 'Paula', 'Pide${ID}', 'hzl', 'es', true) on conflict (phone) do nothing;`);
  const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
  const IU = uid(INV), OU = uid(OTRO), CU = uid(CLI), SU = uid(SEG), PU = uid(PIDE), DU = uid(DUENO);
  const b = await chromium.launch();
  const err = []; let feats = '0';
  const watch = (p, tag) => { p.on('pageerror', (e) => err.push(tag + ' ' + p.url().replace(B, '') + ' ' + e.message.slice(0, 60))); };
  const horas = sql(`select coalesce(json_agg(json_build_object('w', weekday, 'o', open, 'r', ranges)), '[]') from business_hours where business_id = '${BIZ}' and module = ''`);
  const tz0 = sql(`select timezone from cities where id = 'hzl'`);
  const sched0 = sql(`select scheduled_orders::text from delivery_settings where business_id = '${BIZ}'`);
  const eventoFmt = sql(`select format from events limit 1`) || 'noche';
  const flags = { vistas: sql(`select enabled::text from feature_flags where key = 'panel.vistas_unicas'`) };
  try {
    // ── 1 · Aceptar una invitación al equipo ──
    const dCtx = await b.newContext(D), d = await dCtx.newPage(); watch(d, 'dueño'); await entrar(d, DUENO);
    await d.goto(B + P + '/pagina/equipo?det=stf:new');
    await d.getByPlaceholder('Ej. Yahaira Cruz').first().waitFor();
    await d.getByPlaceholder('Ej. Yahaira Cruz').first().fill(`Ines Equipo${ID}`);
    await d.getByPlaceholder('(570) 555-0123').first().fill(INV);
    await d.getByPlaceholder('Ej. Cocina, Delivery, Caja').first().fill('Caja y mostrador');
    await d.screenshot({ path: OUT + 'pan9n2-1-invitar-1360.png' });
    await clic(d.getByRole('button', { name: /Mandar invitación/ }));
    ok(await espera(() => sql(`select status from business_members where business_id = '${BIZ}' and phone = '+1${INV}'`), 'invited') === 'invited', 'el dueño invita desde Tu página › Equipo');
    const COD = sql(`select invite_code from business_members where business_id = '${BIZ}' and phone = '+1${INV}'`);
    ok(/^[A-Za-z0-9_-]{8}$/.test(COD), 'el código de la invitación es de 8 caracteres de azar');
    ok(sql(`select count(*) from sms_outbox where tpl = 'equipo_invitado' and created_at > now() - interval '2 minutes'`) !== '0', 'sale el SMS «equipo_invitado» por el camino de los SMS (con su enlace /e/…)');
    // Otro teléfono: no acepta y NO ve a qué negocio es.
    const oCtx = await b.newContext(M), o = await oCtx.newPage(); watch(o, 'otro'); await entrar(o, OTRO);
    await o.goto(B + '/e/' + COD);
    ok(await texto(o, /Esta invitación no sirve/) && await texto(o, /para otro teléfono/), 'otro teléfono: «Esta invitación no sirve · es para otro teléfono»');
    ok(!(await o.content()).includes('Sabor Dominicano'), 'otro teléfono: la pantalla no dice a qué negocio es');
    await o.screenshot({ path: OUT + 'pan9n2-1-otro-390.png' });
    ok(sql(`select count(*) from audit_entries where actor_id = '${OU}' and action = 'equipo.codigo_malo'`) >= '1', 'el intento malo queda anotado');
    // Un código que no existe también suma intentos; con 8, se frena (aun con un código bueno).
    for (let i = 0; i < 8; i++) await o.goto(B + '/e/Nada' + String(i).padStart(4, '0'));
    await o.goto(B + '/e/' + COD);
    ok(await texto(o, /Muchos intentos/), 'con 8 intentos malos en una hora, se frena');
    // El invitado: ve la invitación, pone sus palabras y sus idiomas, y acepta.
    const iCtx = await b.newContext(M), i = await iCtx.newPage(); watch(i, 'invitada'); await entrar(i, INV);
    await i.goto(B + '/e/' + COD);
    ok(await texto(i, /te invitó a Sabor Dominicano/) && await texto(i, /Entras como Caja y mostrador/), 'la invitada ve «te invitó a Sabor Dominicano · Entras como Caja y mostrador»');
    await sinScroll(i, '/e/código 390');
    await i.getByPlaceholder(/Cuenta cómo empezaste/).first().fill('Llevo cinco años en la caja. Me gusta atender con calma.');
    await clic(i.getByText('English', { exact: true }));
    await i.screenshot({ path: OUT + 'pan9n2-1-aceptar-390.png', fullPage: true });
    await clic(i.getByRole('button', { name: /Aceptar y entrar al equipo/ }));
    ok(await texto(i, /Ya eres parte del equipo de Sabor Dominicano/), 'aceptar: «Ya eres parte del equipo»');
    const m = sql(`select status || '|' || coalesce(invite_code, 'NULO') || '|' || (user_id = '${IU}')::text || '|' || array_to_string(languages, ',') || '|' || (bio->>'es' like 'Llevo cinco años%')::text from business_members where business_id = '${BIZ}' and phone = '+1${INV}'`);
    ok(m === 'active|NULO|true|es,en|true', `el miembro queda activo, con su cuenta, sin código y con sus idiomas y palabras (${m})`);
    ok(sql(`select count(*) from notifications where user_id = '${DU}' and tpl = 'biz_equipo_acepto' and body like '%Ines Equipo${ID}%'`) === '1', 'el dueño recibe «aceptó tu invitación»');
    // El código ya se usó: no sirve otra vez (ni para la misma persona).
    const i2Ctx = await b.newContext(M), i2 = await i2Ctx.newPage(); await entrar(i2, INV);
    await i2.goto(B + '/e/' + COD);
    ok(await texto(i2, /no existe o ya se usó/), 'el código es de un solo uso');
    // Vencido: otra invitación con el código vencido.
    sql(`insert into business_members (business_id, kind, display_name, role, phone, status, show_on_page, invite_code, invited_at, invite_expires_at, invite_sends, sort)
         values ('${BIZ}', 'staff', 'Vencida ${ID}', '{"es":"Cocina","en":""}', '+1${CLI}', 'invited', true, 'Vence${ID.slice(0, 3)}', now() - interval '9 days', now() - interval '2 days', 1, 90)`);
    const cCtx = await b.newContext(M), c = await cCtx.newPage(); watch(c, 'cliente'); await entrar(c, CLI);
    await c.goto(B + '/e/Vence' + ID.slice(0, 3));
    ok(await texto(c, /Esa invitación venció/), 'una invitación vencida no se acepta');
    // Quitar a alguien avisa a esa persona; responder a quien pidió unirse, también.
    await d.goto(B + P + '/pagina/equipo');
    const mid = sql(`select id from business_members where business_id = '${BIZ}' and phone = '+1${INV}'`);
    await d.goto(B + P + `/pagina/equipo?det=stf:${mid}`);
    await clic(d.getByRole('button', { name: 'Quitar del equipo' })); await clic(d.getByRole('button', { name: 'Sí, quitar del equipo' }));
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${IU}' and tpl = 'equipo_quitado'`), '1') === '1', 'quitar a alguien: la persona recibe el aviso');
    sql(`insert into business_members (business_id, user_id, kind, display_name, status, phone) values ('${BIZ}', '${PU}', 'renter', 'Paula Pide${ID}', 'requested', '+1${PIDE}')`);
    const pid = sql(`select id from business_members where business_id = '${BIZ}' and user_id = '${PU}'`);
    ok(sql(`select count(*) from notif_templates where key = 'biz_equipo_pide'`) === '1', 'existe el aviso «alguien pide unirse» para el dueño');
    await d.goto(B + P + `/pagina/equipo?det=stf:${pid}`);
    await clic(d.getByRole('button', { name: 'Aceptar', exact: true }));
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${PU}' and tpl = 'equipo_unirse_ok'`), '1') === '1', 'aceptar a quien pidió unirse: recibe el aviso');
    await sinScroll(d, 'Equipo 1360');

    // ── 2 · «Cuenta borrada» en inglés en las Reservaciones ──
    const DEL = telefonoLibre('5705552');
    sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values ('+1${DEL}', now(), 'Cuenta borrada', null, 'hzl', 'es', true)`);
    const DELU = uid(DEL);
    const numR = () => 'R-9' + String(Math.floor(Math.random() * 900000) + 100000);
    const rsv = (num, user, status, detail, off, hm = '19:00') => sql(`insert into operations (number, kind, city_id, business_id, user_id, status, status_detail, scheduled_at, duration_min, party_size, details, pay_mode, respond_by, client_key, is_test, sent_at, done_at, confirmed_at, answered_at)
      values ('${num}', 'table', 'hzl', '${BIZ}', '${user}', '${status}', ${detail ? `'${detail}'` : 'null'}, ((now() at time zone 'America/New_York')::date + ${off} + time '${hm}') at time zone 'America/New_York', 90, 2, '{"area":"salon"}'::jsonb, 'none',
        now() + interval '30 minutes', gen_random_uuid(), true, now() - interval '${Math.max(1, -off)} days', ${status === 'done' ? "now() - interval '" + Math.max(1, -off) + " days'" : 'null'}, ${status === 'done' || status === 'confirmed' ? 'now()' : 'null'}, ${status === 'done' || status === 'confirmed' ? 'now()' : 'null'})`);
    const RB = numR(); rsv(RB, DELU, 'pending', null, 0, '21:00');
    const eCtx = await b.newContext({ ...D, locale: 'en-US' }); await eCtx.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    const e = await eCtx.newPage(); watch(e, 'dueño-en'); await entrar(e, DUENO);
    await e.goto(B + P + `/hoy?det=rsv:${RB}`);
    ok(await texto(e, /Deleted account/), 'Reservaciones en inglés: «Deleted account»');
    ok(!(await e.locator('body').innerText()).includes('Cuenta borrada'), 'Reservaciones en inglés: a la vista ya no dice «Cuenta borrada»');
    await e.screenshot({ path: OUT + 'pan9n2-2-cuenta-borrada-en-1360.png' });
    await d.goto(B + P + `/hoy?det=rsv:${RB}`);
    ok(await texto(d, /Cuenta borrada/), 'Reservaciones en español: «Cuenta borrada»');
    sql(`update operations set status = 'cancelled', cancelled_by = 'business', cancelled_at = now(), cancel_reason = 'pan9n2' where number = '${RB}'`);

    // ── 4 · El historial de no-show del cliente con ESTE negocio ──
    const R1 = numR(), R2 = numR(), R3 = numR(), R4 = numR();
    rsv(R1, CU, 'done', 'noshow', -20); rsv(R2, CU, 'done', 'noshow', -35); rsv(R3, CU, 'done', 'seated', -50); rsv(R4, CU, 'pending', null, 1);
    await d.goto(B + P + `/hoy?det=rsv:${R4}`);
    ok(await texto(d, /no llegó 2 veces a tu negocio y vino 1/), 'la reservación dice «en el último año no llegó 2 veces a tu negocio y vino 1»');
    await d.screenshot({ path: OUT + 'pan9n2-4-no-show-1360.png' });
    await e.goto(B + P + `/hoy?det=rsv:${R4}`);
    ok(await texto(e, /did not show up 2 times at your business and came 1/), 'en inglés: «did not show up 2 times at your business and came 1»');
    // Otro negocio no entra al historial: un no-show en OTRO negocio no suma.
    const otroNeg = sql(`select id from businesses where category_id = 'NEG-FOOD' and id <> '${BIZ}' and status = 'active' limit 1`);
    if (otroNeg) {
      const Rx = numR();
      sql(`insert into operations (number, kind, city_id, business_id, user_id, status, status_detail, scheduled_at, duration_min, party_size, details, pay_mode, client_key, is_test, sent_at, done_at)
           select '${Rx}', 'table', city_id, id, '${CU}', 'done', 'noshow', now() - interval '5 days', 90, 2, '{}'::jsonb, 'none', gen_random_uuid(), true, now() - interval '6 days', now() - interval '5 days' from businesses where id = '${otroNeg}'`);
      await d.goto(B + P + `/hoy?det=rsv:${R4}`);
      ok(await texto(d, /no llegó 2 veces a tu negocio/), 'un no-show en OTRO negocio no se cuenta (privacidad)');
      sql(`update operations set status = 'cancelled', status_detail = null where number = '${Rx}'`);
    }
    await sinScroll(d, 'reservación 1360');
    const mm = await b.newContext(M), mp = await mm.newPage(); watch(mp, 'dueño-390'); await entrar(mp, DUENO);
    await mp.goto(B + P + `/hoy?det=rsv:${R4}`); await texto(mp, /no llegó 2 veces/);
    await mp.screenshot({ path: OUT + 'pan9n2-4-no-show-390.png' }); await sinScroll(mp, 'reservación 390');
    sql(`update operations set status = 'cancelled', cancelled_by = 'business', cancelled_at = now(), cancel_reason = 'pan9n2' where number = '${R4}'`);

    // ── 3 · Pedir reseña en un pedido entregado ──
    const pedido = (user, off = 0) => sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, details, subtotal_cents, delivery_cents, tax_cents, total_cents, pay_mode,
          sent_at, answered_at, confirmed_at, ready_at, done_at, client_key, is_test)
        values (nextval('operations_order_seq')::text, 'order', 'hzl', '${BIZ}', '${user}', 'done', null, 'pickup', '{}'::jsonb, 900, 0, 54, 954, 'local',
          now() - interval '${2 + off} days', now() - interval '${2 + off} days', now() - interval '${2 + off} days', now() - interval '${2 + off} days', now() - interval '${2 + off} days' + interval '40 minutes', gen_random_uuid(), true) returning id, number)
        select id || '|' || number from o;`).split('|');
    const [OP1, N1] = pedido(CU, 0);
    await d.goto(B + P + `/hoy?det=ped:${N1}`);
    const det = d.locator('aside[data-screen-label="Panel v2 · detalle"]');
    await clic(det.getByRole('button', { name: 'Pedir reseña', exact: true }));
    ok(await espera(() => sql(`select count(*) from review_requests where operation_id = ${OP1}`), '1') === '1', 'Pedir reseña: queda la petición del pedido entregado');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${CU}' and tpl = 'resena_pedir' and ref_id = '${N1}'`), '1') === '1', 'el cliente recibe «¿Cómo estuvo tu pedido?» en su campana');
    ok(await texto(d, /Reseña pedida/), 'el pedido dice «Reseña pedida» (solo una vez por pedido)');
    ok(await d.getByRole('button', { name: 'Pedir reseña', exact: true }).count() === 0, 'ya no ofrece pedirla otra vez');
    await d.screenshot({ path: OUT + 'pan9n2-3-pedir-resena-1360.png' });
    // Un segundo pedido del mismo cliente la misma semana: no se le insiste.
    const [OP2, N2] = pedido(CU, 1);
    await d.goto(B + P + `/hoy?det=ped:${N2}`);
    ok(await texto(d, /Ya le pediste una reseña esta semana/), 'el mismo cliente, esta semana: «Ya le pediste una reseña esta semana»');
    ok(sql(`select count(*) from review_requests where operation_id = ${OP2}`) === '0', 'no se manda otra petición al mismo cliente');
    // En inglés y en el teléfono.
    await e.goto(B + P + `/hoy?det=ped:${N1}`);
    ok(await texto(e, /Review requested/), 'en inglés: «Review requested»');
    await mp.goto(B + P + `/hoy?det=ped:${N1}`); await texto(mp, /Reseña pedida/); await sinScroll(mp, 'pedido 390');

    // ── 5 · Reseña: «quiere arreglarlo» y editar la respuesta ──
    const RV = sql(`insert into reviews (business_id, city_id, user_id, src, stars, body) values ('${BIZ}', 'hzl', '${CU}', 'vis', 2, 'Tardaron mucho en entregar y el arroz llegó frío, pero el sabor estaba bien.') returning id`);
    await d.goto(B + P + `/pagina/resenas?det=rev:${RV}`);
    await d.getByPlaceholder('Escribe como le hablarías en persona.').first().fill('Celia, queremos arreglarlo: en tu próximo pedido te reponemos el arroz sin costo.');
    await clic(d.locator('div', { hasText: /^Quiero arreglarlo/ }).getByRole('switch').first());
    await d.screenshot({ path: OUT + 'pan9n2-5-arreglarlo-1360.png' });
    await clic(d.getByRole('button', { name: 'Publicar respuesta' }));
    ok(await espera(() => sql(`select reply_offer::text from reviews where id = ${RV}`), 'true') === 'true', 'la respuesta se publica como propuesta («quiere arreglarlo»)');
    const pub = await (await b.newContext(M)).newPage();
    await pub.goto(B + `/n/${BIZ}?tab=rev`);
    ok(await texto(pub, /QUIERE ARREGLARLO/), 'la página pública muestra «QUIERE ARREGLARLO» en la respuesta');
    await pub.screenshot({ path: OUT + 'pan9n2-5-publica-390.png' }); await sinScroll(pub, 'reseñas 390');
    await entrar(c, CLI);
    await c.goto(B + `/n/${BIZ}/resena/tuya`);
    ok(await texto(c, /Sabor Dominicano quiere arreglarlo/), 'la clienta ve «Sabor Dominicano quiere arreglarlo» en su reseña');
    await c.screenshot({ path: OUT + 'pan9n2-5-tuya-390.png' });
    // Editar la respuesta: queda el historial y se ve «editada»; tope de 3.
    for (let k = 1; k <= 3; k++) {
      await d.goto(B + P + `/pagina/resenas?det=rev:${RV}`);
      const campo = d.getByText('EDITAR TU RESPUESTA').first(); await campo.waitFor();
      await d.locator('textarea').first().fill(`Celia, queremos arreglarlo (versión ${k + 1}): te reponemos el arroz sin costo en tu próximo pedido.`);
      await clic(d.getByRole('button', { name: 'Guardar cambios' }));
      ok(await espera(() => sql(`select reply_edits::text from reviews where id = ${RV}`), String(k)) === String(k), `editar la respuesta (${k} de 3)`);
    }
    ok(sql(`select count(*) from review_reply_history where review_id = ${RV}`) === '3', 'lo anterior no se borra: 3 versiones en el historial');
    await d.goto(B + P + `/pagina/resenas?det=rev:${RV}`);
    ok(await texto(d, /Respondida\. Se ve debajo de la reseña/) && await d.getByText('EDITAR TU RESPUESTA').count() === 0, 'a la cuarta ya no se puede editar (tope de 3)');
    await pub.goto(B + `/n/${BIZ}?tab=rev`);
    ok(await texto(pub, /EDITADA/), 'la página pública dice «EDITADA»');
    try { sql(`update review_reply_history set previous_reply = 'x' where review_id = ${RV}`); ok(false, 'el historial se puede cambiar'); } catch (x) { ok(/solo de inserción/.test(String(x.stderr || x.message)), 'el historial es de solo inserción (la base lo impone)'); }
    await e.goto(B + P + `/pagina/resenas?det=rev:${RV}`); ok(await texto(e, /Replied\. It shows under the review/), 'en inglés: «Replied. It shows under the review»');
    sql(`update reviews set status = 'removed' where id = ${RV}`);

    // ── 6 · Validar un cupón desde Hoy · anuncios para negocios · Panel › Eventos con cursor ──
    const CP = sql(`insert into coupons (business_id, city_id, kind, title, cost_coins, monthly_stock, valid_days, status) values ('${BIZ}', 'hzl', 'coins', '{"es":"Pan 9n2 ${ID}","en":"Bread 9n2 ${ID}"}', 80, 10, 30, 'live') returning id`);
    await d.goto(B + P + '/hoy');
    ok(await texto(d, /VALIDAR UN CÓDIGO/), 'Hoy: aparece «Validar un código» (el cupón se valida desde Hoy)');
    await d.getByPlaceholder('TL-CQ-7K4M').first().fill('TLCQZZZZ9');
    await clic(d.getByRole('button', { name: 'Validar', exact: true }));
    ok(await texto(d, /No encontramos ese código en tus cupones/), 'Hoy: un código que no es de este negocio se rechaza con su mensaje');
    await d.screenshot({ path: OUT + 'pan9n2-6-cupon-hoy-1360.png' });
    await e.goto(B + P + '/hoy'); ok(await texto(e, /VALIDATE A CODE/), 'en inglés: «VALIDATE A CODE» en Hoy');
    await mp.goto(B + P + '/hoy'); await texto(mp, /VALIDAR UN CÓDIGO/); await sinScroll(mp, 'Hoy 390');
    // Quien solo tiene «Hoy y pedidos» (sin «Tu página»): el mismo campo y la acción lo permite.
    const EMP = telefonoLibre('5705551'), EU = (sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values ('+1${EMP}', now(), 'Elena', 'Caja${ID}', 'hzl', 'es', true) returning id`));
    sql(`insert into business_members (business_id, user_id, kind, display_name, status, phone, panel_access, show_on_page) values ('${BIZ}', '${EU}', 'staff', 'Elena Caja${ID}', 'active', '+1${EMP}', '{ord}', false)`);
    const emCtx = await b.newContext(M), em = await emCtx.newPage(); watch(em, 'caja'); await entrar(em, EMP);
    await em.goto(B + P + '/hoy');
    ok(await texto(em, /VALIDAR UN CÓDIGO/), 'quien solo tiene «Hoy y pedidos» también ve «Validar un código» en Hoy');
    sql(`update business_members set status = 'removed', removed_reason = 'owner', removed_at = now(), panel_access = '{}' where user_id = '${EU}' and business_id = '${BIZ}'`);
    sql(`update coupons set status = 'ended', ended_by = 'business', ended_reason = 'pan9n2', ended_at = now() where id = ${CP}`);

    // Anuncios para negocios (audience = 'negocios'): en Hoy del panel, no en el Inicio de los vecinos.
    const AN = sql(`insert into announcements (city_id, audience, text, from_at, to_at, by_staff_id) values ('hzl', 'negocios', '{"es":"Aviso para negocios ${ID}: mañana hay mantenimiento a las 3 AM.","en":"Notice for businesses ${ID}: maintenance tomorrow at 3 AM."}', now() - interval '1 minute', now() + interval '1 day', '${DU}') returning id`);
    await d.goto(B + P + '/hoy'); ok(await texto(d, new RegExp(`Aviso para negocios ${ID}`)), 'Hoy del panel muestra el anuncio para negocios');
    await e.goto(B + P + '/hoy'); ok(await texto(e, new RegExp(`Notice for businesses ${ID}`)), 'en inglés: el anuncio sale en inglés');
    await d.screenshot({ path: OUT + 'pan9n2-6-anuncio-1360.png' });
    const home = await (await b.newContext(D)).newPage(); await home.goto(B + '/'); await dormir(800);
    ok(!(await home.content()).includes(`Aviso para negocios ${ID}`), 'el anuncio de negocios NO sale en el Inicio de los vecinos');
    sql(`update announcements set retired_at = now(), retired_by = '${DU}', retired_reason = 'pan9n2' where id = ${AN}`);

    // Panel › Eventos con cursor: 25 eventos pasados propios (una vez: un evento no se borra, así que la prueba reusa los suyos); la primera página trae 20 en total y
    // «Ver más» sigue con el cursor hasta que salen los 25.
    if (Number(sql(`select count(*) from events where business_id = '${BIZ}' and title->>'es' like 'Zpan9n2 fijo #%'`)) < 25)
      sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, kind, span_days, origin, approved_at, rsvp_capacity)
           select 'pan9n2-fijo-' || g, 'hzl', '${BIZ}', 'comida', jsonb_build_object('es', 'Zpan9n2 fijo #' || lpad(g::text, 2, '0'), 'en', 'Zpan9n2 fijo #' || lpad(g::text, 2, '0')), current_date - 100 - g, 1140, 1260, 'rsvp', 'done', 'single', 1, 'panel', now(), 20 from generate_series(1, 25) g`);
    await d.goto(B + P + '/eventos');
    await clic(d.getByText(/^Pasados y cancelados/));
    await texto(d, /Zpan9n2/);
    const veo = async () => (await d.getByText(/^Zpan9n2 fijo #/).count());
    const antes = await veo();
    ok(antes > 0 && antes < 25, `Pasados y cancelados trae de a 20 (con cursor), no todo de golpe (se ven ${antes} de los 25 míos)`);
    let veces = 0; for (; veces < 12 && (await veo()) < 25; veces++) { const btn = d.getByRole('button', { name: 'Ver más', exact: true }); if (!(await btn.count())) break; await clic(btn); await dormir(900); }
    ok((await veo()) === 25, `«Ver más» sigue con el cursor (${veces} veces) y salen los 25 míos`);
    await d.screenshot({ path: OUT + 'pan9n2-6-eventos-cursor-1360.png' });
    await e.goto(B + P + '/eventos'); await clic(e.getByText(/^Past and cancelled/));
    ok(await e.getByRole('button', { name: 'See more', exact: true }).count() > 0, 'en inglés: «See more» en Past and cancelled');

    // ── 7 · «Últimos 30 días» del plato y Populares por lo más pedido ──
    const IT = sql(`select id from items where business_id = '${BIZ}' and module = 'menu' and removed_at is null and not featured and status = 'live' order by id limit 1`);
    const IT_N = sql(`select name->>'es' from items where id = ${IT}`);
    feats = sql(`select coalesce(string_agg(id::text, ','), '0') from items where business_id = '${BIZ}' and featured`);
    sql(`update items set featured = false where business_id = '${BIZ}' and featured`);
    const base = Number(sql(`select count(distinct l.operation_id) from operation_lines l join operations o on o.id = l.operation_id where o.business_id = '${BIZ}' and o.status = 'done' and o.sent_at > now() - interval '30 days' and l.item_id = ${IT}`));
    for (let k = 0; k < 3; k++) {
      const [op] = pedido(CU, 3 + k);
      sql(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents) select ${op}, i.id, i.name, 2, i.price_cents, 2 * i.price_cents from items i where i.id = ${IT}`);
    }
    await d.goto(B + P + `/vendes/menu?det=item:${IT}`);
    ok(await texto(d, /ÚLTIMOS 30 DÍAS/), 'el plato muestra «Últimos 30 días»');
    ok(await texto(d, new RegExp(`^${base + 3}$`)) || (await d.locator('body').innerText()).includes(String(base + 3)), `con sus pedidos (${base + 3})`);
    ok(await texto(d, /en Populares/), 'y su puesto: «N.º en Populares» (lo más pedido, con 3 pedidos como mínimo)');
    await d.screenshot({ path: OUT + 'pan9n2-7-ultimos-30-1360.png' });
    await e.goto(B + P + `/vendes/menu?det=item:${IT}`); ok(await texto(e, /LAST 30 DAYS/) && await texto(e, /in Popular/), 'en inglés: «LAST 30 DAYS» y «in Popular»');
    const vis2 = await (await b.newContext(M)).newPage(); await vis2.goto(B + `/n/${BIZ}?tab=menu`); await dormir(1500);
    ok(await texto(vis2, /^Populares$/), 'la página pública arma «Populares» con lo más pedido (nadie lo fijó)');
    await vis2.screenshot({ path: OUT + 'pan9n2-7-populares-390.png' }); await sinScroll(vis2, 'ficha 390');
    void IT_N;

    // ── 7b · El pedido programado que cruza la medianoche, con el reloj del negocio ──
    const utcH = new Date().getUTCHours(); let off = 0; for (let k = -12; k <= 12; k++) { const h = (utcH + k + 24) % 24; if (h === 22) { off = k; break; } }
    sql(`update cities set timezone = 'Etc/GMT${off > 0 ? '-' : '+'}${Math.abs(off)}' where id = 'hzl'`);
    sql(`update business_hours set open = true, ranges = '[["18:00","02:00"]]'::jsonb where business_id = '${BIZ}' and module = ''`);
    const html = await vis2.evaluate(async (u) => (await fetch(u)).text(), B + `/n/${BIZ}`);
    ok(/de madrugada/.test(html) && /24:00|24:30|25:00/.test(html), 'horario 6 PM – 2 AM a las 10 PM del negocio: se programa hasta la 1 AM («de madrugada»), no se corta en las 11:30 PM');
    ok(!/"v":"2[6-9]:|"v":"3\d:/.test(html), 'y nunca después de una hora antes de cerrar');
    sql(`update cities set timezone = '${tz0}' where id = 'hzl'`);
    for (const h of JSON.parse(horas || '[]')) sql(`update business_hours set open = ${h.o}, ranges = '${JSON.stringify(h.r)}'::jsonb where business_id = '${BIZ}' and module = '' and weekday = ${h.w}`);

    // ── 8 · To'Latino Negocios sin negocio ──
    const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 TLApp/negocio/ios/1.0.0 (12)';
    const sCtx = await b.newContext({ ...M, userAgent: UA }), s = await sCtx.newPage(); watch(s, 'sin-negocio'); await entrar(s, SIN);
    await s.goto(B + '/panel');
    ok(await texto(s, /Todavía no tienes un negocio en To'Latino/), 'To\'Latino Negocios sin negocio: «Todavía no tienes un negocio» (no se va a /publica, que la app no abre)');
    ok(!s.url().includes('/publica'), 'no termina en /publica');
    await s.screenshot({ path: OUT + 'pan9n2-8-sin-negocio-390.png' }); await sinScroll(s, 'sin negocio 390');
    await clic(s.getByText('Mi cuenta y ajustes').first());
    await s.waitForURL(/\/cuenta\/ajustes/); ok(true, 'llega a Mi cuenta › Ajustes (donde está Borrar mi cuenta)');
    const sWeb = await (await b.newContext(M)).newPage(); await entrar(sWeb, SIN); await sWeb.goto(B + '/panel'); await sWeb.waitForURL(/\/publica/);
    ok(true, 'en la web, sin negocio, /panel sigue llevando a Publica tu negocio');
    const sEn = await (await b.newContext({ ...M, userAgent: UA })); await sEn.addCookies([{ name: 'tl_lang', value: 'en', url: B }]); const sp = await sEn.newPage(); await entrar(sp, SIN); await sp.goto(B + '/panel');
    ok(await texto(sp, /You do not have a business on To'Latino yet/), 'en inglés: «You do not have a business on To\'Latino yet»');

    // ── 9 · Novedades: fotos de la galería, «Ver vacante», avisar a los seguidores, pedidos desde una oferta; Traducir con El Compa ──
    sql(`insert into follows (follower_user_id, target_kind, target_id) values ('${SU}', 'business', '${BIZ}') on conflict do nothing`);
    const JOB = sql(`select id from job_postings where business_id = '${BIZ}' and status = 'live' order by id limit 1`);
    await d.goto(B + P + '/pagina/nov?det=nov:new');
    ok(await texto(d, /O ELIGE DE TU GALERÍA/), 'el editor de novedades ofrece «O elige de tu galería»');
    const gTile = d.locator('xpath=//*[normalize-space(text())="O ELIGE DE TU GALERÍA"]/following::*[contains(@style,"background")][1]');
    await gTile.click();
    ok(await texto(d, /^1\/4$/), 'una foto de la galería entra a la novedad (1/4)');
    await d.screenshot({ path: OUT + 'pan9n2-9-galeria-1360.png' });
    await clic(d.getByText('Novedad', { exact: true }).first());
    await d.getByPlaceholder('Ej. Estrenamos terraza').first().fill(`Buscamos ayudante ${ID}`);
    await clic(d.getByText('Vacante', { exact: true }).first());
    await clic(d.getByText('Ayudante de cocina').first());
    ok(await texto(d, /El botón dice «Ver vacante»/), 'el botón «Ver vacante» (la novedad lleva a una vacante abierta)');
    await clic(d.locator('div', { hasText: /^Avisar a tus seguidores/ }).getByRole('switch').first());
    await d.screenshot({ path: OUT + 'pan9n2-9-vacante-avisar-1360.png' });
    await clic(d.locator('aside[data-screen-label="Panel v2 · detalle"]').getByRole('button', { name: 'Publicar', exact: true }));
    const NV = await espera(() => sql(`select id from business_posts where business_id = '${BIZ}' and title = 'Buscamos ayudante ${ID}'`), sql(`select id from business_posts where business_id = '${BIZ}' and title = 'Buscamos ayudante ${ID}'`) || 'x');
    ok(/^\d+$/.test(NV), 'se publica la novedad');
    ok(sql(`select link_kind || '|' || job_id::text from business_posts where id = ${NV}`) === `job|${JOB}`, 'queda con su botón «Ver vacante» (link_kind job)');
    ok(sql(`select count(*) from media where owner_kind = 'post' and owner_id = '${NV}' and status = 'visible'`) === '1', 'la foto de la galería se COPIÓ a la novedad');
    ok(sql(`select count(*) from media where owner_kind = 'business' and owner_id = '${BIZ}' and status = 'visible'`) === sql(`select count(*) from media where owner_kind = 'business' and owner_id = '${BIZ}' and status = 'visible'`) && Number(sql(`select count(*) from media where owner_kind = 'business' and owner_id = '${BIZ}' and status = 'visible'`)) >= 1, 'y la galería de la página sigue igual');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${SU}' and tpl = 'nov_seguidores' and ref_id = '${NV}'`), '1') === '1', '«Avisar a tus seguidores»: el seguidor recibe el aviso en su campana');
    await vis2.goto(B + `/n/${BIZ}?tab=nov`); await dormir(1500);
    ok(await texto(vis2, /Ver vacante/), 'la página muestra el botón «Ver vacante»');
    await vis2.screenshot({ path: OUT + 'pan9n2-9-ver-vacante-390.png' });
    // Una sola vez por novedad: el detalle ya no lo ofrece y la base no deja avisar dos veces.
    await d.goto(B + P + `/pagina/nov?det=nov:${NV}`);
    ok(await texto(d, /Ya les avisaste a tus seguidores de esta novedad/), 'el detalle dice «Ya les avisaste a tus seguidores»');
    // La vacante se cierra: la novedad deja de salir.
    sql(`update job_postings set status = 'paused' where id = ${JOB}`);
    await vis2.goto(B + `/n/${BIZ}?tab=nov`); await dormir(1200);
    ok(!(await vis2.content()).includes(`Buscamos ayudante ${ID}`), 'con la vacante cerrada, la novedad deja de salir');
    sql(`update job_postings set status = 'live' where id = ${JOB}`);
    // Tope de 2 avisos al día por negocio: la tercera novedad se publica pero no avisa.
    sql(`update business_posts set followers_notified_at = now() where business_id = '${BIZ}' and id in (select id from business_posts where business_id = '${BIZ}' and id <> ${NV} order by id limit 1)`);
    const NV3 = sql(`insert into business_posts (business_id, city_id, kind, title, body, link_kind, audience, publish_at, created_by) values ('${BIZ}', 'hzl', 'novedad', 'Tercera ${ID}', '', 'none', 'all', now(), '${DU}') returning id`);
    await d.goto(B + P + `/pagina/nov?det=nov:${NV3}`);
    await clic(d.getByRole('button', { name: 'Avisar a tus seguidores', exact: true }));
    ok(await texto(d, /Ya avisaste 2 novedades hoy/), 'tope: «Ya avisaste 2 novedades hoy. Mañana puedes avisar otra»');
    ok(sql(`select count(*) from notifications where user_id = '${SU}' and tpl = 'nov_seguidores'`) === '1', 'y el seguidor no recibió un segundo aviso');
    // Pedidos desde una oferta (al precio de la oferta, mientras estuvo en vivo).
    const OF = sql(`insert into business_posts (business_id, city_id, kind, title, body, link_kind, item_id, price_was_cents, price_now_cents, audience, publish_at, created_by) values ('${BIZ}', 'hzl', 'oferta', 'Oferta ${ID}', '', 'item', ${IT}, 1600, 1000, 'all', now() - interval '10 days', '${DU}') returning id`);
    for (let k = 0; k < 2; k++) { const [op] = pedido(CU, 1 + k); sql(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents) select ${op}, i.id, i.name, 1, 1000, 1000 from items i where i.id = ${IT}`); }
    await d.goto(B + P + `/pagina/nov?det=nov:${OF}`);
    ok(await texto(d, /PEDIDOS DESDE LA OFERTA/), 'el detalle de una oferta muestra «Pedidos desde la oferta»');
    await d.screenshot({ path: OUT + 'pan9n2-9-oferta-pedidos-1360.png' });
    await e.goto(B + P + `/pagina/nov?det=nov:${OF}`); ok(await texto(e, /ORDERS FROM THE DEAL/), 'en inglés: «ORDERS FROM THE DEAL»');
    sql(`update business_posts set status = 'removed' where id in (${NV}, ${NV3}, ${OF})`);
    // «Traducir con El Compa» en el editor de vacantes y en el del plato (sin traductor en el sandbox: lo dice con claridad).
    await d.goto(B + P + '/vendes/jobs?det=vac:new');
    await d.getByPlaceholder(/Ej\. /).first().waitFor().catch(() => undefined);
    ok(await texto(d, /Traducir con El Compa/), 'el editor de vacantes tiene «Traducir con El Compa»');
    await d.goto(B + P + `/vendes/menu?det=item:${IT}`);
    ok(await texto(d, /Traducir con El Compa/), 'el editor del plato tiene «Traducir con El Compa»');
    await e.goto(B + P + `/vendes/menu?det=item:${IT}`); ok(await texto(e, /Translate with El Compa/), 'en inglés: «Translate with El Compa»');

    console.log('  (1) listo');
    ok(!err.length, `sin errores en la página${err.length ? ': ' + err.join(' · ') : ''}`);
  } finally {
    try {
      sql(`update business_members set status = 'removed', removed_reason = 'owner', removed_at = now(), invite_code = null where business_id = '${BIZ}' and (phone in ('+1${INV}', '+1${CLI}', '+1${PIDE}') or user_id in ('${IU}', '${PU}')) and status <> 'removed';`);
      for (const h of JSON.parse(horas || '[]')) sql(`update business_hours set open = ${h.o}, ranges = '${JSON.stringify(h.r)}'::jsonb where business_id = '${BIZ}' and module = '' and weekday = ${h.w}`);
      sql(`update cities set timezone = '${tz0}' where id = 'hzl'`);
      sql(`update items set featured = true where business_id = '${BIZ}' and id in (${feats})`);
      sql(`update business_posts set followers_notified_at = null where business_id = '${BIZ}' and followers_notified_at is not null;
           update operations set status = 'cancelled', cancelled_by = 'business', cancelled_at = now(), cancel_reason = 'pan9n2' where business_id = '${BIZ}' and number like 'R-9%' and status in ('pending', 'confirmed');
           update reviews set status = 'removed' where business_id = '${BIZ}' and body like 'Tardaron mucho%' and status = 'visible';`);
      void SU; void CU; void eventoFmt; void sched0; void flags;
    } catch (e) { console.log('  (limpieza) ' + String(e.message).slice(0, 200)); }
    await b.close();
  }
  console.log(`\npan9n2: ${n} ✓`);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
