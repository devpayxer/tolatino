// 6g · To'Latino Puerta en línea, de punta a punta (teléfono 390 y escritorio 1360): el panel invita a dos porteros (nombre + teléfono →
// código de 7 días, SMS en modo pruebas) → cada uno entra a /puerta con SU cuenta y el código → abre su puerta → escanea con la CÁMARA
// (video falso de Chromium con el QR real del boleto, leído con jsQR en el Worker) → VÁLIDO; el segundo portero escanea el mismo QR →
// YA ENTRÓ por la otra puerta a la hora; dos porteros a la vez (API) y 10 a la vez en la base → una sola entrada; el mismo id repetido
// no cuenta dos veces; QR alterado, de otro entorno, de una versión vieja (reemitido), en transferencia, devuelto, de otro día (varios
// días) y de otro evento → no entran; mesa de 6 → «entran 4», luego 2, luego YA ENTRÓ; número de mesa sin repetir; cortesía encontrada
// por nombre y entrada a mano con motivo; RSVP que llega (entran N de M) sin liberar su lugar; lista de la noche por el código de 4
// cifras; la cifra ADENTRO del otro portero cambia en vivo (SSE) sin recargar; incidencia con 911 → aviso al organizador; REGLAS DE
// PUERTA (pedir ID → «PIDE ID» antes de marcar); el modo puerta del panel del dueño con su Monitor; quitar a un portero → su puerta se
// corta al momento; IDOR con el portero y el dueño de otro negocio y con un vecino; ninguna respuesta de la puerta trae teléfonos ni
// dinero; cierre de la noche; Super Admin › Modo puerta y ESCANEOS del boleto; Mi cuenta «Usado · entraste a las …». Deja los datos como
// estaban (eventos de prueba cancelados, porteros de prueba quitados).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9b-1 · El SMS que se espera sale de la regla del servidor (de noche, lo que no es crítico espera: «silencio»).
const { smsEsperado } = require('../lib/negocio-nuevo.cjs');
const { chromium } = require('playwright'); const { execSync, exec } = require('child_process'); const crypto = require('crypto'); const fs = require('fs');
const { S, B, sql, sqlErr, api, apiRaw, entrar, uid, firmar, otraLlave } = require('../lib/g6-comun.cjs');
const OUT = S + '/cap/';
const jsQR = require(ENT.rec('jsqr/package/dist/jsQR.js'));
const QR = require(ENT.rec('nayuki/package/index.js')).default.QrCode;
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const btn = (p, t) => p.locator('button, [role="button"]', { hasText: t });
const sqlA = (q) => new Promise((res) => exec(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, (e, so, se) => res(e ? 'ERR ' + se : so.trim())));
const RUN = Date.now().toString(36), TAG = `[e6g ${RUN}]`;
const C1 = '5705550122', C2 = '5705550299', C3 = '5705550288', TERRAZA = '5705550366', ADM = '5705550199', LUIS = '5705550422';
const P1 = '5705550531', P2 = '5705550532', PB = '5705550533';
const NEG = 'la-terraza-night', PAR = 'parroquia-santa-maria';
const uuid = () => crypto.randomUUID();
const acciones = [];
const espiar = (p) => p.on('request', (r) => { const a = r.headers()['next-action']; if (a && r.method() === 'POST') acciones.push({ url: r.url(), a, body: r.postData() || '' }); });
const accion = (re) => [...acciones].reverse().find((x) => re.test(x.body));
const repetir = async (ctx, cap, body) => (await (await ctx.request.post(cap.url, { headers: { 'next-action': cap.a, 'content-type': 'text/plain;charset=UTF-8', origin: B, accept: 'text/x-component' }, data: body ?? cap.body })).text());
const respuestas = []; // todo lo que devuelve la puerta (para revisar que no trae teléfonos ni dinero)
const escanear = async (p, b) => { const r = await api(p, '/api/puerta/escanear', b); respuestas.push(JSON.stringify(r)); return r; };
const adentro = async (p) => { const m = /ADENTRO (\d+)/.exec(await texto(p)); return m ? Number(m[1]) : null; };

// El QR del SVG (TicketQR) → jsQR (como evt6c).
async function leerQR(p, sel) {
  const d = await p.evaluate((s) => { const el = document.querySelector(s); const svg = el && el.querySelector('svg[role="img"]'); const path = svg && svg.querySelector('path'); return path ? { d: path.getAttribute('d'), vb: svg.getAttribute('viewBox') } : null; }, sel);
  if (!d) return null;
  const sz = Number(d.vb.split(' ')[2]), sc = 6, N = sz * sc, px = new Uint8ClampedArray(N * N * 4).fill(255);
  for (const m of d.d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) { const x = +m[1], y = +m[2]; for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const i = ((y * sc + a) * N + (x * sc + b)) * 4; px[i] = px[i + 1] = px[i + 2] = 0; } }
  const r = jsQR(px, N, N); return r ? r.data : null;
}
// Un video Y4M (lo que «ve» la cámara falsa de Chromium) con el QR en el centro.
function videoQR(t, file) {
  const q = QR.encodeText(t, QR.Ecc.MEDIUM), W = 640, H = 480, sc = Math.floor(420 / (q.size + 8)), lado = (q.size + 8) * sc, ox = Math.floor((W - lado) / 2), oy = Math.floor((H - lado) / 2);
  const Y = Buffer.alloc(W * H, 235);
  for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.getModule(x, y)) for (let a = 0; a < sc; a++) Y.fill(16, (oy + (y + 4) * sc + a) * W + ox + (x + 4) * sc, (oy + (y + 4) * sc + a) * W + ox + (x + 5) * sc);
  const UV = Buffer.alloc((W * H) / 4, 128), fr = Buffer.concat([Buffer.from('FRAME\n'), Y, UV, UV]);
  fs.writeFileSync(file, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), ...Array(10).fill(fr)]));
}

(async () => {
  const ADMID = uid(ADM);
  for (const [tel, a, b] of [[P1, 'Ana', 'Portera'], [P2, 'Beto', 'Portero'], [PB, 'Cruz', 'Parroquia']]) sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+1${tel}', now(), '${a}', '${b}', 'hzl') on conflict (phone) do nothing`);
  const U1 = uid(P1), U2 = uid(P2), UB = uid(PB);
  const nom = (tel) => { const [a, b] = sql(`select first_name || '|' || coalesce(last_name, '') from users where phone = '+1${tel}'`).split('|'); return b ? `${a.split(' ')[0]} ${b.slice(0, 1).toUpperCase()}.` : a; };
  const NOM1 = nom(C1), NOM2 = nom(C2);
  const PREFS = Object.fromEntries([U1, U2, UB, uid(TERRAZA)].map((u) => [u, sql(`select coalesce(notif_prefs::text, '{}') from users where id = '${u}'`)]));
  const limpiar = () => {
    sql(`delete from platform_config where key in ('puerta_invitar_dia_max', 'puerta_buscar_min')`);
    sql(`update door_staff set status = 'removed', removed_at = now(), removed_reason = 'prueba', invite_code = null where status <> 'removed' and phone_last4 in ('${P1.slice(-4)}', '${P2.slice(-4)}', '${PB.slice(-4)}')`);
    sql(`update door_sessions set ended_at = now(), ended_by = 'system' where ended_at is null and event_id in (select id from events where title->>'es' like '%[e6g %')`);
    sql(`update door_sessions set ended_at = now(), ended_by = 'system' where ended_at is null and user_id in ('${uid(TERRAZA)}', '${uid(LUIS)}')`);
    sql(`update ticket_transfers set status = 'cancelled', ended_at = now() where status = 'pending' and event_date_id in (select d.id from event_dates d join events e on e.id = d.event_id where e.title->>'es' like '%[e6g %')`);
    sql(`update tickets set status = 'void', void_reason = 'prueba' where status in ('valid', 'used') and event_id in (select id from events where title->>'es' like '%[e6g %')`);
    sql(`update rsvps set status = 'cancelled' where status = 'going' and event_id in (select id from events where title->>'es' like '%[e6g %')`);
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where title->>'es' like '%[e6g %' and status <> 'cancelled'`);
    sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now(), cancel_reason = 'prueba', door_code = null where kind = 'night' and customer_note like '%[e6g %' and status = 'confirmed'`);
  };
  limpiar();
  for (const u of Object.keys(PREFS)) sql(`update users set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || '{"quiet": false}'::jsonb where id = '${u}'`);
  const tarjeta = (tel) => { const u = uid(tel); sql(`update payment_methods set is_default = false where user_id = '${u}'`); sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, status, simulated) values ('${u}', 'pm_sim_visa_4242_${crypto.createHash('md5').update(RUN + tel).digest('hex').slice(0, 8)}', 'visa', '4242', '12/30', true, 'active', true) on conflict (stripe_pm_id) do update set is_default = true, status = 'active'`); };
  // Eventos de prueba publicados que empiezan en 1 h (la puerta abre 2 h antes de las puertas: se puede abrir ya).
  const HNY = Number(sql(`select extract(hour from now() at time zone 'America/New_York')::int * 60 + extract(minute from now() at time zone 'America/New_York')::int`));
  const H0 = Math.min(1320, HNY + 60);
  const evento = (biz, fmt, titulo, o = {}) => {
    const tk = JSON.stringify(o.tks ?? [{ id: 'gen', n: { es: 'General', en: 'General' }, s: { es: '', en: '' }, p: 1500, cap: 30, off: false }]);
    const mt = JSON.stringify(o.mesas ?? []);
    const id = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, tables_cfg, rsvp_capacity, party_max, kind, span_days, day_cap)
      values ('', 'hzl', '${biz}', '${fmt}', '{"es":"${titulo} ${TAG}","en":"${titulo} ${TAG}"}', (now() at time zone 'America/New_York')::date + ${o.dias ?? 0}, ${H0}, ${H0 + 180}, '${o.entry ?? 'tickets'}', 'live', now(), now(), '${ADMID}', 0, '${ADMID}', ${o.edad ?? 0},
              '${(o.entry ?? 'tickets') === 'tickets' ? tk : '[]'}'::jsonb, '${(o.entry ?? 'tickets') === 'tickets' ? mt : '[]'}'::jsonb, ${o.cap ?? 0}, ${o.pmax ?? 1}, '${o.kind ?? 'single'}', ${o.span ?? 1}, ${o.dcap ?? 0}) returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${id})`);
    // 9b-1 · Sin depender de la hora: los de HOY empiezan en 1 h según el reloj del servidor (antes min(10 PM, ahora + 1 h): pasadas las 9 PM
    // la puerta ya había abierto y no se podía comprar). Se corren todas sus fechas juntas; su noche (local_date) no cambia.
    if (!(o.dias > 0)) sql(`update event_dates d set starts_at = d.starts_at + x.delta, doors_at = d.doors_at + x.delta, ends_at = d.ends_at + x.delta
      from (select (now() + interval '60 minutes') - min(starts_at) as delta from event_dates where event_id = ${id}) x where d.event_id = ${id}`);
    sql(`insert into media (owner_kind, owner_id, url, w, h, status, sort, uploaded_by) select 'event', '${id}', url, w, h, 'visible', 0, uploaded_by from media where owner_kind = 'business' and owner_id = '${biz}' and status = 'visible' order by sort limit 1`);
    return id;
  };
  const fechas = (id) => sql(`select string_agg(id::text, ',' order by starts_at) from event_dates where event_id = ${id} and status = 'scheduled'`).split(',').filter(Boolean);
  // Un boleto vendido (como la semilla 0036: orden B- confirmada, existencia sumada; el pago es de 6c y ya se probó allá).
  const boleto = (eid, fid, tel, o = {}) => {
    const u = tel ? uid(tel) : null;
    const op = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, confirmed_at, client_key, is_test, pay_status)
      select 'B-' || nextval('ticket_order_seq'), 'tickets', e.city_id, e.business_id, ${u ? `'${u}'` : `'${uid(TERRAZA)}'`}, 'confirmed', jsonb_build_object('event_id', e.id::text, 'event_date_id', '${fid}'), ${o.comp ? 0 : 1500}, ${o.comp ? 0 : 1500}, '${o.comp ? 'none' : 'app'}', now(), gen_random_uuid(), true, ${o.comp ? 'null' : `'captured'`}
        from events e where e.id = ${eid} returning id`).split('\n')[0];
    if (o.mesa) {
      const mt = sql(`select id || '|' || seats from event_tables where event_id = ${eid} and cfg_key = '${o.mesa}'`).split('|');
      sql(`update table_stock set sold_n = sold_n + 1 where table_id = ${mt[0]} and event_date_id = ${fid}`);
      return sql(`insert into tickets (event_date_id, event_id, city_id, table_id, operation_id, holder_user_id, admits, kind, price_cents, fee_cents) values (${fid}, ${eid}, 'hzl', ${mt[0]}, ${op}, '${u}', ${mt[1]}, 'paid', 4000, 300) returning id`).split('\n')[0];
    }
    const tt = sql(`select id from ticket_types where event_id = ${eid} and cfg_key = '${o.tipo ?? 'gen'}'`);
    sql(`update ticket_stock set sold_n = sold_n + 1 where ticket_type_id = ${tt} and event_date_id = ${fid}`);
    return sql(`insert into tickets (event_date_id, event_id, city_id, ticket_type_id, operation_id, holder_user_id, holder_name, admits, kind, price_cents, fee_cents, comp_name, comp_by)
      values (${fid}, ${eid}, 'hzl', ${tt}, ${op}, ${o.comp ? 'null' : `'${u}'`}, ${o.nombre ? `'${o.nombre}'` : 'null'}, 1, '${o.comp ? 'comp' : 'paid'}', ${o.comp ? 0 : 1500}, ${o.comp ? 0 : 175}, ${o.comp ? `'${o.comp}'` : 'null'}, ${o.comp ? `'${uid(TERRAZA)}'` : 'null'}) returning id`).split('\n')[0];
  };
  const qrDe = (tid) => { const [f, v, a] = sql(`select event_date_id || '|' || qr_ver || '|' || admits from tickets where id = ${tid}`).split('|'); return firmar(tid, f, Number(v), Number(a)); };
  const br = await chromium.launch();
  const ctx = async (w, h, mobile, b = br) => b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile });
  const err = [], PAGS = {};
  let bCam = null;
  try {
    // ── Eventos y boletos de prueba ──
    const EV1 = evento(NEG, 'noche', 'Noche de la puerta', { edad: 21, mesas: [{ id: 'pista', z: { es: 'Mesa · Pista', en: 'Table · Floor' }, seats: 6, min: 12000, dep: 4000, cap: 3 }] });
    const [F1] = fechas(EV1);
    const EV2 = evento(NEG, 'noche', 'Festival de tres días', { kind: 'span', span: 3, tks: [{ id: 'pase', n: { es: 'Pase', en: 'Pass' }, s: { es: '', en: '' }, p: 4000, cap: 20, off: false }, { id: 'd2', n: { es: 'Día 2', en: 'Day 2' }, s: { es: '', en: '' }, p: 1500, cap: 20, off: false, dy: 1 }] });
    const F2 = fechas(EV2), ANCLA2 = F2[F2.length - 1];
    const EV3 = evento(NEG, 'noche', 'Karaoke con RSVP', { entry: 'rsvp', cap: 10, pmax: 4 });
    const [F3] = fechas(EV3);
    const EV4 = evento(NEG, 'noche', 'Mañana en la puerta', { dias: 1 });
    const [F4] = fechas(EV4);
    const EVB = evento(PAR, 'fe', 'Retiro de prueba', {});
    const [FB] = fechas(EVB);
    ok(F1 && F2.length === 3 && F3 && F4 && FB, `eventos de prueba publicados: una noche con mesas, un festival de 3 días, un RSVP, uno de mañana y uno de la Parroquia`);
    const T2 = boleto(EV1, F1, C2), T3 = boleto(EV1, F1, C3), T4 = boleto(EV1, F1, C2), T5 = boleto(EV1, F1, C2, { mesa: 'pista' }), T5b = boleto(EV1, F1, C3, { mesa: 'pista' });
    const T6 = boleto(EV1, F1, null, { comp: 'Rosa Prueba' }), T9 = boleto(EV1, F1, C3), T10 = boleto(EV1, F1, C1, { nombre: 'Lucía Prueba Fernández' }), T11 = boleto(EV1, F1, C2), T12 = boleto(EV1, F1, C3);
    const T7 = boleto(EV2, ANCLA2, C1, { tipo: 'd2' }), T8 = boleto(EV2, ANCLA2, C1, { tipo: 'pase' });
    const TB = boleto(EVB, FB, C3);
    ok(sql(`select valid_days::text from tickets where id = ${T7}`) === '{1}' && sql(`select valid_days::text from tickets where id = ${T8}`) === '{0,1,2}', 'la base pone los días de cada boleto: «Día 2» vale solo el día 2; el pase, los 3');

    const c1 = await ctx(390, 844, true), p1 = await c1.newPage(); espiar(p1); p1.on('pageerror', (e) => err.push(e.message));
    await entrar(p1, C1); tarjeta(C1);
    const cn = await ctx(1360, 900), pn = await cn.newPage(); espiar(pn); pn.on('pageerror', (e) => err.push(e.message)); await entrar(pn, TERRAZA);
    const cm = await ctx(390, 844, true), pm = await cm.newPage(); espiar(pm); pm.on('pageerror', (e) => err.push(e.message)); await entrar(pm, TERRAZA);
    pm.on('dialog', (d) => d.accept()); pn.on('dialog', (d) => d.accept());
    const cl = await ctx(390, 844, true), pl = await cl.newPage(); espiar(pl); await entrar(pl, LUIS);
    const cb = await ctx(390, 844, true), pb = await cb.newPage(); espiar(pb); pb.on('pageerror', (e) => err.push(e.message)); await entrar(pb, PB);
    const ca = await ctx(1360, 900), pa = await ca.newPage(); pa.on('pageerror', (e) => err.push(e.message)); await entrar(pa, ADM);

    // ── 1 · Comprar de verdad (6c) y leer el QR de Mi cuenta ──
    await p1.goto(B + `/eventos/${sql(`select slug from events where id = ${EV1}`)}/boletos?fecha=${F1}`);
    await clic(p1.locator(`[data-tipo="${sql(`select id from ticket_types where event_id = ${EV1} and cfg_key = 'gen'`)}"] >> text="+"`));
    await clic(btn(p1, 'Continuar')); await p1.waitForURL(/\/eventos\/pagar\//);
    await clic(btn(p1, /^Pagar \$/)); await p1.waitForURL(/\/eventos\/orden\/B-/, { timeout: 20000 });
    const O1 = p1.url().split('/').pop(), T1 = sql(`select t.id from tickets t join operations o on o.id = t.operation_id where o.number = '${O1}'`), CODE1 = sql(`select code from tickets where id = ${T1}`);
    await p1.goto(B + `/cuenta/boletos/${CODE1}`);
    await espera(async () => !!(await p1.locator('[data-pantalla="USR-BOLETO"] svg[role="img"] path').count()));
    const QR1 = await leerQR(p1, '[data-pantalla="USR-BOLETO"]');
    ok(QR1 && QR1 === qrDe(T1), `C1 compró (orden ${O1}) y el QR de Mi cuenta (leído con jsQR) es el que firma el servidor`);

    // ── 2 · Panel › el evento › PORTEROS · Agregar: nombre + teléfono + «Solo este evento» → código de 7 días por SMS ──
    const invitar = async (p, negocio, eid, nombre, tel, todos) => {
      await p.goto(B + `/panel/${negocio}/eventos?det=evt:${eid}`);
      await clic(p.locator('xpath=//span[normalize-space()="PORTEROS · ESCANEAN EN LA PUERTA"]/following-sibling::span[@role="button"]'));
      await (await vis(p.getByLabel('NOMBRE DEL PORTERO'))).fill(nombre);
      await (await vis(p.getByLabel('SU TELÉFONO · CON ÉL ENTRA A LA PUERTA'))).fill(tel);
      if (todos) await clic(p.locator('xpath=//span[normalize-space()="¿EN QUÉ EVENTOS ESCANEA?"]/ancestor::div[1]//*[normalize-space()="Todos tus eventos"]'));
      await clic(btn(p, /^Invitar$/));
      await contiene(p, 'le llegó por SMS');
      const m = /Código ([A-Z0-9]{6}): le llegó por SMS/.exec(await texto(p));
      return m ? m[1] : null;
    };
    // Las pruebas invitan varias veces al día: el tope sale de Configuración (la base lo lee en el momento).
    sql(`insert into platform_config (key, value, updated_by) values ('puerta_invitar_dia_max', '100', '${ADMID}') on conflict (key) do update set value = excluded.value`);
    const K1 = await invitar(pm, NEG, EV1, 'Ana Portera', P1, false);
    ok(K1 && sql(`select status || '|' || scope || '|' || event_ids::text || '|' || phone_last4 from door_staff where invite_code = '${K1}'`) === `invited|events|{${EV1}}|${P1.slice(-4)}`, `el dueño invita a Ana (solo este evento): código ${K1} de 7 días; la base guarda «··${P1.slice(-4)}», el teléfono cifrado y su huella`);
    ok(sql(`select count(*) from door_staff where invite_code = '${K1}' and phone_enc is not null and phone_hash ~ '^[a-f0-9]{64}$' and position('${P1}' in encode(phone_enc, 'escape')) = 0`) === '1', 'el teléfono del portero no está en claro en la base');
    ok(await espera(async () => sql(`select sms_status from notifications where user_id = '${U1}' and tpl = 'puerta_invitado' and created_at > now() - interval '2 minutes' order by id desc limit 1`) === smsEsperado('puerta_invitado', `'${U1}'`)), 'a Ana le llega el aviso con el código (SMS en modo pruebas)');
    ok(await contiene(pm, `Código ${K1}: le llegó por SMS. Vale 7 días`) && await contiene(pm, 'INVITADO'), 'el panel muestra el código y a Ana como INVITADO');
    await pm.screenshot({ path: OUT + 'e6g-panel-porteros-390.png', fullPage: true });
    const K2 = await invitar(pn, NEG, EV1, 'Beto Portero', P2, true);
    ok(K2 && sql(`select scope from door_staff where invite_code = '${K2}'`) === 'all', `el dueño invita a Beto en escritorio (todos sus eventos): código ${K2}`);
    await pn.screenshot({ path: OUT + 'e6g-panel-porteros-1360.png', fullPage: true });
    const KB = await invitar(pl, PAR, EVB, 'Cruz Parroquia', PB, false);
    ok(!!KB, 'la Parroquia invita a su propio portero (otro negocio)');
    sql(`update platform_config set value = '1' where key = 'puerta_invitar_dia_max'`);
    const capI = accion(/^\["la-terraza-night","Beto Portero"/);
    ok(/Invitaste a muchos porteros hoy/.test(await repetir(cn, capI, JSON.stringify([NEG, 'Otro Portero', '5705550599', null]))), 'con el tope de Configuración en 1, una invitación más → «Invitaste a muchos porteros hoy»');
    sql(`delete from platform_config where key = 'puerta_invitar_dia_max'`);

    // ── 3 · La cámara: un navegador con la cámara falsa mostrando el QR del boleto de C1 ──
    const Y4M = S + `/qr-${RUN}.y4m`; videoQR(QR1, Y4M);
    bCam = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${Y4M}`] });
    const ca1 = await ctx(390, 844, true, bCam), a1 = await ca1.newPage(); espiar(a1); a1.on('pageerror', (e) => err.push(e.message)); await ca1.grantPermissions(['camera'], { origin: B });
    const ca2 = await ctx(390, 844, true, bCam), a2 = await ca2.newPage(); espiar(a2); a2.on('pageerror', (e) => err.push(e.message)); await ca2.grantPermissions(['camera'], { origin: B });
    a1.on('dialog', (d) => d.accept()); a2.on('dialog', (d) => d.accept());
    for (const c of [ca1, ca2]) await c.addInitScript(() => { const g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); navigator.mediaDevices.getUserMedia = async (x) => { try { return await g(x); } catch (e) { console.log('GUM-ERR', e.name, e.message); throw e; } }; });
    a2.on('console', (m) => { if (/GUM/.test(m.text())) console.log('  [a2]', m.text()); });
    Object.assign(PAGS, { a1, a2, pm, pn, pb, p1 }); a1.on('console', (m) => { if (m.type() === 'error' || /GUM/.test(m.text())) console.log('  [a1]', m.text()); });
    await entrar(a1, P1); await entrar(a2, P2);

    // CHK-ONB: sin equipo → el código → «ya eres portero» → HOY · ABRIR → nombre de la puerta → abrir.
    await a1.goto(B + '/puerta');
    ok(await contiene(a1, 'Todavía no tienes puertas') && await contiene(a1, 'Para escanear en una puerta, el negocio te invita con un código'), '/puerta sin equipo: «Todavía no tienes puertas» y entrar con el código');
    // Los intentos malos, con una cuenta de esta corrida (el tope es por persona y hora: Configuración no lo afloja).
    const P0 = `570555${6000 + (parseInt(RUN.slice(-4), 36) % 3999)}`;
    sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+1${P0}', now(), 'Otra', 'Persona', 'hzl') on conflict (phone) do nothing`);
    const c0 = await ctx(390, 844, true), p0 = await c0.newPage(); await entrar(p0, P0); await p0.goto(B + '/puerta');
    await (await vis(p0.getByLabel('CÓDIGO · 6 LETRAS Y NÚMEROS'))).fill('ZZZZZZ');
    await clic(btn(p0, 'Entrar al equipo de la puerta'));
    ok(await contiene(p0, 'Ese código no existe o ya se usó'), 'un código que no existe no entra (y cuenta como intento)');
    await (await vis(p0.getByLabel('CÓDIGO · 6 LETRAS Y NÚMEROS'))).fill(K1);
    await clic(btn(p0, 'Entrar al equipo de la puerta'));
    ok(await contiene(p0, 'Ese código es para otro teléfono') && sql(`select status from door_staff where invite_code = '${K1}'`) === 'invited', 'el código de Ana no sirve con otra cuenta (huella del teléfono): sigue invitado');
    ok(sql(`select count(*) from audit_entries where actor_id = '${uid(P0)}' and action = 'puerta.codigo_malo'`) === '2', 'los dos intentos malos quedan contados (tope por hora)');
    await (await vis(a1.getByLabel('CÓDIGO · 6 LETRAS Y NÚMEROS'))).fill(K1);
    await clic(btn(a1, 'Entrar al equipo de la puerta'));
    ok(await contiene(a1, 'Listo: ya eres portero de La Terraza'), 'Ana entra con SU cuenta y el código: «ya eres portero de La Terraza»');
    ok(sql(`select status || '|' || (user_id = '${U1}') from door_staff where phone_last4 = '${P1.slice(-4)}' and status <> 'removed'`) === 'active|true', 'la base la deja ACTIVA con su cuenta');
    ok(await contiene(a1, 'Noche de la puerta') && !(await texto(a1)).includes('Festival de tres días') && !(await texto(a1)).includes('Retiro de prueba'), 'Ana solo ve el evento que le tocó (ni el festival de La Terraza ni nada de la Parroquia)');
    await a1.screenshot({ path: OUT + 'e6g-puerta-inicio-390.png', fullPage: true });
    await clic(a1.locator('[role="button"]', { hasText: `Noche de la puerta ${TAG}` }));
    await clic(a1.locator('xpath=//span[normalize-space()="¿EN QUÉ PUERTA ESTÁS?"]/ancestor::div[1]//*[normalize-space()="Principal"]'));
    await a1.screenshot({ path: OUT + 'e6g-puerta-abrir-390.png', fullPage: true });
    await clic(btn(a1, 'Abrir la puerta'));
    await a1.waitForURL(/\/puerta\/s\/\d+/);
    const SA = a1.url().split('/').pop().split('?')[0];
    await a2.goto(B + '/puerta');
    await (await vis(a2.getByLabel('CÓDIGO · 6 LETRAS Y NÚMEROS'))).fill(K2);
    await clic(btn(a2, 'Entrar al equipo de la puerta'));
    ok(await contiene(a2, 'Festival de tres días') && await contiene(a2, 'Noche de la puerta') && await contiene(a2, 'Mañana en la puerta'), 'Beto (todos los eventos) ve sus puertas de hoy y las próximas');
    ok(await contiene(a2, 'PRÓXIMO'), 'el evento de mañana sale como PRÓXIMO (el modo puerta se activa el día del evento)');
    await clic(a2.locator('[role="button"]', { hasText: `Noche de la puerta ${TAG}` }));
    await clic(a2.locator('xpath=//span[normalize-space()="¿EN QUÉ PUERTA ESTÁS?"]/ancestor::div[1]//*[normalize-space()="VIP"]'));
    await clic(btn(a2, 'Abrir la puerta'));
    await a2.waitForURL(/\/puerta\/s\/\d+/);
    const SB = a2.url().split('/').pop().split('?')[0];
    ok(sql(`select string_agg(door_name || ':' || coalesce(door_staff_id::text, 'm'), ',' order by id) from door_sessions where id in (${SA}, ${SB})`).split(',').every((x) => !x.endsWith(':m')), 'las dos sesiones quedan abiertas como porteros (Principal y VIP)');

    // ── 4 · Escanear con la cámara: Ana → VÁLIDO; Beto escanea el mismo QR → YA ENTRÓ por Principal a las … ──
    ok(await contiene(a1, 'VÁLIDO', 25000) && await contiene(a1, NOM1) && await contiene(a1, 'General'), 'Ana escanea el QR con la cámara (jsQR en el Worker) → VÁLIDO, nombre + inicial y el tipo, en grande');
    await a1.screenshot({ path: OUT + 'e6g-puerta-valido-390.png' });
    ok(sql(`select status from tickets where id = ${T1}`) === 'used' && sql(`select entered_n || '|' || first_door from ticket_entries where ticket_id = ${T1}`) === '1|Principal', 'la base marca el boleto usado y la entrada por Principal');
    await a1.goto(B + `/puerta/s/${SA}?t=lista`);
    ok(await contiene(a2, 'YA ENTRÓ', 25000) && await contiene(a2, 'Ya entró por Principal a las'), 'Beto escanea el MISMO QR en la VIP → YA ENTRÓ · «Ya entró por Principal a las …»');
    await a2.screenshot({ path: OUT + 'e6g-puerta-yaentro-390.png' });
    await a2.goto(B + `/puerta/s/${SB}?t=aforo`);
    ok(sql(`select count(*) from ticket_scans where ticket_id = ${T1} and resolution = 'accepted'`) === '1', 'una sola entrada aceptada de ese boleto');

    // ── 5 · Dos porteros a la vez (API) → uno entra, el otro «ya entró»; 10 a la vez en la base → uno ──
    const [ra, rb] = await Promise.all([escanear(a1, { sesion: SA, tipo: 'qr', qr: qrDe(T2), id: uuid(), at: Date.now(), previo: true }), escanear(a2, { sesion: SB, tipo: 'qr', qr: qrDe(T2), id: uuid(), at: Date.now(), previo: true })]);
    const rs = [ra.v.res, rb.v.res].sort();
    ok(rs[0] === 'already_used' && rs[1] === 'valid' && [ra, rb].find((x) => x.v.res === 'already_used').v.ya, `dos porteros escanean el mismo boleto a la vez → ${rs.join(' + ')} (el segundo con la puerta y la hora)`);
    const R10 = await Promise.all(Array.from({ length: 10 }, (_, i) => sqlA(`select result from puerta_entrada('${uuid()}'::uuid, ${i % 2 ? SB : SA}, '${i % 2 ? U2 : U1}', ${T11}, 1, null, 'in', null, null)`)));
    ok(R10.filter((x) => x === 'valid').length === 1 && R10.filter((x) => x === 'already_used').length === 9, `10 escaneos a la vez en la base por el mismo boleto → 1 válido y 9 «ya entró» (${R10.filter((x) => x.startsWith('ERR')).length} errores)`);
    const ID1 = uuid(), r1 = await escanear(a1, { sesion: SA, tipo: 'qr', qr: qrDe(T3), id: ID1, at: Date.now() }), ent0 = sql(`select entered_n from event_dates where id = ${F1}`);
    const r1b = await escanear(a1, { sesion: SA, tipo: 'qr', qr: qrDe(T3), id: ID1, at: Date.now() });
    ok(r1.v.res === 'valid' && r1b.v.res === 'valid' && sql(`select entered_n from event_dates where id = ${F1}`) === ent0 && sql(`select count(*) from ticket_scans where id = '${ID1}'`) === '1', 'el mismo escaneo (mismo id del teléfono) mandado dos veces → la misma respuesta y no cuenta dos veces');

    // ── 6 · Lo que no entra ──
    const alterado = QR1.replace(`.${T1}.`, `.${Number(T1) + 1}.`);
    ok((await escanear(a1, { sesion: SA, tipo: 'qr', qr: alterado, id: uuid(), at: Date.now() })).v.res === 'forged', 'QR alterado (otro número de boleto con la misma firma) → QR NO VÁLIDO');
    ok((await escanear(a1, { sesion: SA, tipo: 'qr', qr: firmar(T9, F1, 1, 1, otraLlave), id: uuid(), at: Date.now() })).v.res === 'forged', 'QR firmado con la llave de otro entorno → QR NO VÁLIDO');
    ok((await escanear(a1, { sesion: SA, tipo: 'qr', qr: 'https://ejemplo.com/hola', id: uuid(), at: Date.now() })).v.res === 'not_found', 'un QR que no es un boleto → NO ENCONTRADO');
    const viejo9 = qrDe(T9); sql(`update tickets set qr_ver = qr_ver + 1 where id = ${T9}`);
    const rv = await escanear(a1, { sesion: SA, tipo: 'qr', qr: viejo9, id: uuid(), at: Date.now() });
    ok(rv.v.res === 'replaced' && sql(`select status from tickets where id = ${T9}`) === 'valid', 'QR de una versión vieja (reemitido) → QR ANULADO y el boleto sigue sin usar');
    ok((await escanear(a1, { sesion: SA, tipo: 'qr', qr: qrDe(T9), id: uuid(), at: Date.now() })).v.res === 'valid', 'el QR nuevo (versión 2) entra');
    const viejo12 = qrDe(T12);
    sql(`update tickets set qr_ver = qr_ver + 1 where id = ${T12}`);
    sql(`insert into ticket_transfers (kind, ticket_id, operation_id, event_date_id, city_id, from_user_id, to_phone_enc, to_phone_hash, to_last2, claim_hash, expires_at) select 'transfer', t.id, t.operation_id, t.event_date_id, t.city_id, t.holder_user_id, '\\x00'::bytea, md5('${RUN}a') || md5('${RUN}b'), '99', md5('${RUN}c') || md5('${RUN}d'), now() + interval '1 hour' from tickets t where t.id = ${T12}`);
    ok((await escanear(a1, { sesion: SA, tipo: 'qr', qr: viejo12, id: uuid(), at: Date.now() })).v.res === 'replaced', 'boleto transferido: el QR de antes de transferir → QR ANULADO');
    ok((await escanear(a1, { sesion: SA, tipo: 'boleto', boleto: T12, motivo: 'No trajo el QR', id: uuid(), at: Date.now() })).v.res === 'pending_transfer', 'y a mano por nombre, mientras la transferencia está pendiente → SE ESTÁ TRANSFIRIENDO (no entra)');
    sql(`update tickets set status = 'refunded' where id = ${T4}`);
    ok((await escanear(a1, { sesion: SA, tipo: 'qr', qr: qrDe(T4), id: uuid(), at: Date.now() })).v.res === 'refunded', 'boleto devuelto → DEVUELTO');
    // Varios días: Beto abre la puerta del día 1 del festival.
    await a2.goto(B + '/puerta'); await clic(a2.locator('[role="button"]', { hasText: `Festival de tres días ${TAG}` }));
    await clic(a2.locator('xpath=//span[normalize-space()="¿EN QUÉ PUERTA ESTÁS?"]/ancestor::div[1]//*[normalize-space()="Principal"]'));
    await clic(btn(a2, 'Abrir la puerta')); await a2.waitForURL(/\/puerta\/s\/\d+/);
    const SF = a2.url().split('/').pop().split('?')[0];
    ok(sql(`select event_date_id from door_sessions where id = ${SF}`) === F2[0], 'Beto abre la puerta del DÍA 1 del festival');
    const rd = await escanear(a2, { sesion: SF, tipo: 'qr', qr: qrDe(T7), id: uuid(), at: Date.now() });
    ok(rd.v.res === 'wrong_day' && /^\D+ \d+ \w+$/.test(rd.v.vale), `el boleto «Día 2» en la puerta del día 1 → ES DE OTRO DÍA · «Vale: ${rd.v.vale}»`);
    ok((await escanear(a2, { sesion: SF, tipo: 'qr', qr: qrDe(T8), id: uuid(), at: Date.now() })).v.res === 'valid' && (await escanear(a2, { sesion: SF, tipo: 'qr', qr: qrDe(T8), id: uuid(), at: Date.now() })).v.res === 'already_used', 'el pase entra el día 1 una vez (la segunda: YA ENTRÓ)');
    ok(sql(`select status from tickets where id = ${T8}`) === 'used' && sql(`select count(*) from ticket_entries where ticket_id = ${T8}`) === '1', 'el pase queda usado y con UNA entrada (la del día 1): los otros días entra con su propia fila (ticket_entries)');
    await p1.goto(B + `/cuenta/boletos/${sql(`select code from tickets where id = ${T8}`)}`);
    ok(await contiene(p1, 'VÁLIDO · OTRO DÍA') && await contiene(p1, 'Tu pase entra una vez cada día'), 'Mi cuenta: el pase usado el día 1 sigue «VÁLIDO · OTRO DÍA» con su QR');
    const rw = await escanear(a2, { sesion: SF, tipo: 'qr', qr: QR1, id: uuid(), at: Date.now() });
    ok(rw.v.res === 'wrong_event' && rw.v.nombre === null && rw.v.code === null, 'un QR de otro evento → NO ES DE ESTE EVENTO, sin nombre ni código');

    // ── 7 · Mesa de 6: entran 4, luego 2, luego YA ENTRÓ; número de mesa sin repetir ──
    const QR5 = qrDe(T5), g1 = await escanear(a1, { sesion: SA, tipo: 'qr', qr: QR5, id: uuid(), at: Date.now(), previo: true });
    ok(g1.pregunta && g1.pregunta.quedan === 6 && g1.pregunta.mesa === 'Mesa · Pista', 'mesa de 6: antes de marcar pregunta «entran N de 6» (no escribe nada)');
    ok(sql(`select count(*) from ticket_entries where ticket_id = ${T5}`) === '0', 'la pregunta no marca nada');
    const g2 = await escanear(a1, { sesion: SA, tipo: 'qr', qr: QR5, id: g1.pregunta.id, at: Date.now(), n: 4 });
    const g3 = await escanear(a1, { sesion: SA, tipo: 'qr', qr: QR5, id: uuid(), at: Date.now(), previo: true });
    const g4 = await escanear(a1, { sesion: SA, tipo: 'qr', qr: QR5, id: g3.pregunta.id, at: Date.now(), n: 2 });
    const g5 = await escanear(a1, { sesion: SA, tipo: 'qr', qr: QR5, id: uuid(), at: Date.now(), previo: true });
    ok(g2.v.res === 'valid' && g2.v.k === 4 && g3.pregunta.quedan === 2 && g4.v.k === 2 && g4.v.entraron === 6 && g5.v.res === 'already_used', 'entran 4 → quedan 2 → entran 2 (6 de 6) → YA ENTRÓ');
    await a1.goto(B + `/puerta/s/${SA}?t=mesas`);
    await clic(a1.locator('[role="button"]', { hasText: NOM2 }).filter({ hasText: 'Mesa · Pista' }));
    ok(await contiene(a1, 'TIENE MESA · MESA · PISTA · ¿CUÁL LE DAS?'), 'Mesas: «TIENE MESA · ¿CUÁL LE DAS?» con los números');
    await clic(a1.locator('xpath=//span[contains(normalize-space(), "TIENE MESA")]/ancestor::div[1]//*[normalize-space()="2"]'));
    ok(await contiene(a1, 'Mesa 2: ') && sql(`select table_no from door_table_numbers where ticket_id = ${T5} and released_at is null`) === '2', 'le da la mesa 2 al grupo');
    await a1.screenshot({ path: OUT + 'e6g-puerta-mesas-390.png', fullPage: true });
    const rm = sqlErr(`insert into door_table_numbers (event_date_id, city_id, table_id, ticket_id, table_no, by_user) select ${F1}, 'hzl', table_id, id, 2, '${U1}' from tickets where id = ${T5b}`);
    ok(/door_table_numbers_mesa_idx/.test(rm), 'la base no deja dar la mesa 2 a otro grupo (índice único)');

    // ── 8 · Cortesía por nombre (Buscar) → entrada a mano con motivo ──
    await a1.goto(B + `/puerta/s/${SA}?t=buscar`);
    await (await vis(a1.getByLabel('Nombre, código, orden B- o últimos 4 del teléfono'))).fill('rosa');
    ok(await contiene(a1, 'Rosa Prueba') && await contiene(a1, 'Cortesía'), 'Buscar «rosa» → la cortesía «Rosa Prueba» (sin cuenta) sale por su nombre');
    await clic(btn(a1, 'Dejar entrar'));
    ok(await contiene(a1, 'ENTRADA A MANO') && await contiene(a1, '¿POR QUÉ ENTRA SIN ESCANEAR?'), 'entrada a mano: pide el motivo');
    await a1.screenshot({ path: OUT + 'e6g-puerta-buscar-390.png', fullPage: true });
    await clic(a1.locator('xpath=//span[normalize-space()="¿POR QUÉ ENTRA SIN ESCANEAR?"]/ancestor::div[1]//*[normalize-space()="No trajo el QR"]'));
    await clic(btn(a1, /^Entró$/));
    ok(await contiene(a1, 'Entró: Rosa Prueba'), '«Entró: Rosa Prueba»');
    ok(sql(`select result || '|' || manual_reason || '|' || resolution from ticket_scans where ticket_id = ${T6}`) === 'manual|No trajo el QR|accepted' && sql(`select status from tickets where id = ${T6}`) === 'used', 'queda en la auditoría: entrada a mano, el motivo y quién');
    await (await vis(a1.getByLabel('Nombre, código, orden B- o últimos 4 del teléfono'))).fill(sql(`select right(code, 4) from tickets where id = ${T10}`));
    ok(await contiene(a1, 'Lucía F.'), 'por los últimos 4 del código: «Lucía F.» (el nombre del boleto: nombre + inicial)');
    // Límite de búsquedas por minuto (Configuración, leído en la base): con 5, la sexta seguida se frena.
    sql(`insert into platform_config (key, value, updated_by) values ('puerta_buscar_min', '5', '${ADMID}') on conflict (key) do update set value = excluded.value`);
    const capS = accion(/^\["\d+","rosa"\]$/), RS = [];
    for (let i = 0; i < 6; i++) RS.push(await repetir(ca1, capS));
    ok(/Muchas búsquedas seguidas/.test(RS[5]) && !RS[5].includes('Rosa Prueba'), 'búsquedas con límite por minuto (Configuración): la sexta seguida → «Muchas búsquedas seguidas. Espera un minuto.»');
    sql(`delete from platform_config where key = 'puerta_buscar_min'`);
    ok(sql(`select count(*) from door_searches where user_id = '${U1}'`) !== '0' && !sql(`select string_agg(column_name, ',') from information_schema.columns where table_name = 'door_searches'`).includes('q'), 'cada búsqueda queda contada sin guardar lo que se buscó');

    // ── 9 · RSVP que llega (entran N de M; su lugar sigue contado) ──
    const RV = sql(`insert into rsvps (event_date_id, event_id, city_id, user_id, party, hold_until, door_code) values (${F3}, ${EV3}, 'hzl', '${uid(C3)}', 3, now(), '') returning id`).split('\n')[0];
    const rsvpN0 = sql(`select rsvp_n from event_dates where id = ${F3}`);
    await a2.goto(B + '/puerta'); await clic(a2.locator('[role="button"]', { hasText: `Karaoke con RSVP ${TAG}` }));
    await clic(btn(a2, 'Abrir la puerta')); await a2.waitForURL(/\/puerta\/s\/\d+/);
    const SR = a2.url().split('/').pop().split('?')[0];
    ok(await contiene(a2, 'LISTA') && await contiene(a2, 'RSVP') && !(await texto(a2)).includes('ESCANEAR'), 'un evento con RSVP abre en la LISTA (sin cámara: los RSVP no tienen QR)');
    await clic(btn(a2, 'Llegó 1'));
    await espera(async () => sql(`select arrived_n from rsvps where id = ${RV}`) === '1');
    await a2.reload(); await clic(btn(a2, 'Llegaron 2'));
    ok(await espera(async () => sql(`select arrived_n || '|' || status from rsvps where id = ${RV}`) === '3|attended'), 'el RSVP de 3: «Llegó 1» y luego «Llegaron 2» → llegó (3 de 3)');
    ok(sql(`select rsvp_n from event_dates where id = ${F3}`) === rsvpN0 && sql(`select inside_n from event_dates where id = ${F3}`) === '3', 'llegar NO libera el lugar (rsvp_n igual) y ADENTRO = 3');
    await a2.screenshot({ path: OUT + 'e6g-puerta-lista-390.png', fullPage: true });

    // ── 10 · Lista de la noche (Noche · 4nc) por el código de 4 cifras ──
    const NUM = 'N-' + sql(`select nextval('night_seq')`), COD = String(1000 + (parseInt(RUN.slice(-3), 36) % 8999));
    sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, buffer_min, customer_note, details, party_size, night_date, door_code, subtotal_cents, total_cents, deposit_cents, pay_mode, confirmed_at, client_key, is_test)
         values ('${NUM}', 'night', 'hzl', '${NEG}', '${uid(C1)}', 'confirmed', now(), 60, 0, '${TAG}', '{"k":"lista","svc":{"es":"Lista de la noche","en":"Tonight list"},"arrive":600,"in_n":0}'::jsonb, 4, ((now() at time zone 'America/New_York') - interval '6 hours')::date, '${COD}', 0, 0, 0, 'none', now(), gen_random_uuid(), true)`);
    await a1.goto(B + `/puerta/s/${SA}?t=noche`);
    await (await vis(a1.getByLabel('Nombre o código de 4 números'))).fill(COD);
    ok(await contiene(a1, 'ENTRARON 0 DE 4') && !(await texto(a1)).includes(COD + ' '), 'Lista de la noche: el código de 4 cifras la encuentra (y la pantalla nunca muestra el código)');
    await clic(btn(a1, 'Entró 1'));
    ok(await contiene(a1, 'ENTRARON 1 DE 4'), '«Entró 1» → ENTRARON 1 DE 4');
    await clic(btn(a1, 'Entraron 3'));
    ok(await contiene(a1, 'ENTRARON 4 DE 4') && sql(`select details->>'in_n' from operations where number = '${NUM}'`) === '4' && sql(`select count(*) from ticket_scans where noche_res_id = (select id from operations where number = '${NUM}') and resolution = 'accepted'`) === '2', 'luego «Entraron 3» → 4 de 4 (lo marca lib/noche-reservas y cada llegada queda en ticket_scans)');

    // ── 11 · En vivo: la cifra ADENTRO de Beto cambia sin recargar cuando Ana deja entrar a alguien ──
    await a2.goto(B + `/puerta/s/${SB}?t=aforo`);
    await a2.waitForTimeout(1500);
    const antes = await adentro(a2), nav = a2.url();
    await escanear(a1, { sesion: SA, tipo: 'boleto', boleto: T10, motivo: 'El QR no se lee', id: uuid(), at: Date.now() });
    ok(await espera(async () => (await adentro(a2)) === antes + 1, 8000) && a2.url() === nav, `ADENTRO de Beto pasa de ${antes} a ${antes + 1} en vivo (SSE: LISTEN/NOTIFY), sin recargar`);
    await a2.screenshot({ path: OUT + 'e6g-puerta-aforo-390.png', fullPage: true });

    // ── 12 · Incidencia: Seguridad (911) → aviso al organizador ──
    await a1.goto(B + `/puerta/s/${SA}?t=incid`);
    await clic(a1.locator('xpath=//span[normalize-space()="¿QUÉ PASÓ?"]/ancestor::div[1]//*[normalize-space()="Seguridad"]'));
    ok(await contiene(a1, 'Si alguien está en peligro, llama al 911 primero.') && await contiene(a1, 'Llamar al 911'), 'Seguridad muestra el 911');
    await (await vis(a1.getByLabel('QUÉ PASÓ · EN UNA LÍNEA'))).fill('Discusión en la fila de la VIP');
    await clic(btn(a1, 'Avisar al organizador'));
    ok(await contiene(a1, 'Listo: el organizador ya lo sabe.') && await espera(async () => sql(`select count(*) from notifications where user_id = '${uid(TERRAZA)}' and tpl = 'puerta_incidencia' and created_at > now() - interval '2 minutes' and body like '%Discusión en la fila de la VIP%'`) === '1'), 'la incidencia queda y al dueño le llega el aviso');
    await a1.screenshot({ path: OUT + 'e6g-puerta-incidencia-390.png', fullPage: true });

    // ── 13 · REGLAS DE PUERTA en el panel: «Pedir ID · 21+» → la puerta pregunta antes de marcar ──
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${EV1}`);
    ok(await contiene(pn, 'REGLAS DE PUERTA') && await contiene(pn, 'Pedir ID · 21+'), 'el panel muestra REGLAS DE PUERTA con «Pedir ID · 21+»');
    await clic(pn.getByRole('switch', { name: 'Pedir ID · 21+' }));
    ok(await espera(async () => sql(`select id_required from events where id = ${EV1}`) === 't'), 'el dueño enciende «Pedir ID» (sin pasar por revisión) y queda en la auditoría');
    ok(sql(`select count(*) from audit_entries where action = 'puerta.reglas' and target_id = '${NEG}' and at > now() - interval '2 minutes'`) !== '0', 'auditoría del panel: puerta.reglas');
    const T13 = boleto(EV1, F1, C1), pq = await escanear(a1, { sesion: SA, tipo: 'qr', qr: qrDe(T13), id: uuid(), at: Date.now(), previo: true });
    ok(pq.pregunta && pq.pregunta.pideId && pq.pregunta.edad === 21 && sql(`select count(*) from ticket_entries where ticket_id = ${T13}`) === '0', 'con «Pedir ID», un boleto de 1 persona también pregunta «PIDE ID · 21+» antes de marcar');
    const pc = await escanear(a1, { sesion: SA, tipo: 'qr', qr: qrDe(T13), id: pq.pregunta.id, at: Date.now() });
    ok(pc.v.res === 'valid', 'después de «Entró» queda marcado');

    // ── 14 · El modo puerta del panel del dueño (doorDet) y el Monitor en vivo ──
    const T14 = boleto(EV1, F1, C3, { nombre: 'Pedro Panel Prueba' });
    await pm.goto(B + `/panel/${NEG}/eventos?det=door:${EV1}@${F1}`);
    ok(await contiene(pm, 'MODO PUERTA') && await contiene(pm, 'MONITOR EN VIVO') && await contiene(pm, 'Ana Portera') && await contiene(pm, 'Beto Portero'), 'modo puerta del panel: MODO PUERTA, el Monitor con Ana y Beto en sus puertas');
    ok(await contiene(pm, 'Seguridad') && await contiene(pm, 'Discusión en la fila de la VIP'), 'el Monitor muestra la incidencia');
    await clic(btn(pm, 'Empezar a escanear'));
    ok(await contiene(pm, 'Escanear boleto') && await contiene(pm, 'Abrir en To’Latino Puerta'), 'el dueño abre SU sesión de puerta (como miembro con «evt»)');
    ok(sql(`select count(*) from door_sessions where user_id = '${uid(TERRAZA)}' and member_user_id is not null and ended_at is null and event_date_id = ${F1}`) === '1', 'la sesión del dueño es de miembro del negocio (no de portero)');
    await (await vis(pm.getByLabel('Buscar por nombre o código'))).fill('pedro');
    await clic(pm.locator('[role="button"]', { hasText: 'Pedro P.' }));
    await clic(pm.locator('xpath=//span[contains(normalize-space(), "¿POR QUÉ ENTRA SIN ESCANEAR?")]/ancestor::div[1]//*[normalize-space()="El QR no se lee"]'));
    await clic(btn(pm, /^Dejar entrar$/));
    ok(await contiene(pm, 'VÁLIDO · Pedro P. entró') && sql(`select status from tickets where id = ${T14}`) === 'used', 'desde el panel: buscar «pedro» → «Dejar entrar» con motivo → VÁLIDO (los mismos resultados que la puerta)');
    await pm.screenshot({ path: OUT + 'e6g-panel-modo-puerta-390.png', fullPage: true });
    await clic(btn(pm, 'Escanear boleto'));
    ok(await contiene(pm, 'Modo puerta') && await contiene(pm, 'Listo'), '«Escanear boleto» abre la cámara a pantalla completa (la misma pieza de la puerta)');
    await clic(btn(pm, /^Listo$/));
    await pn.goto(B + `/panel/${NEG}/eventos?det=door:${EV1}@${F1}`);
    ok(await contiene(pn, 'MONITOR EN VIVO'), 'modo puerta en escritorio');
    await pn.screenshot({ path: OUT + 'e6g-panel-modo-puerta-1360.png', fullPage: true });
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${EV1}`);
    ok(await contiene(pn, 'PUERTA') && /ADENTRO \d+/.test(await texto(pn)) && await contiene(pn, 'Abrir modo puerta'), 'la ficha del evento: PUERTA con ADENTRO y «Abrir modo puerta»');

    // ── 15 · IDOR: el portero y el dueño de otro negocio, y un vecino ──
    await pb.goto(B + '/puerta');
    await (await vis(pb.getByLabel('CÓDIGO · 6 LETRAS Y NÚMEROS'))).fill(KB);
    await clic(btn(pb, 'Entrar al equipo de la puerta'));
    ok(await contiene(pb, 'Retiro de prueba') && !(await texto(pb)).includes('Noche de la puerta'), 'el portero de la Parroquia solo ve los eventos de la Parroquia');
    await clic(pb.locator('[role="button"]', { hasText: `Retiro de prueba ${TAG}` })); await clic(btn(pb, 'Abrir la puerta')); await pb.waitForURL(/\/puerta\/s\/\d+/);
    const SP = pb.url().split('/').pop().split('?')[0];
    const ib = await escanear(pb, { sesion: SP, tipo: 'qr', qr: qrDe(T3), id: uuid(), at: Date.now() });
    ok(ib.v.res === 'wrong_event' && ib.v.nombre === null && ib.v.tipo === null, 'un boleto de La Terraza en la puerta de la Parroquia → NO ES DE ESTE EVENTO, sin nombre ni tipo');
    const ia = await apiRaw(pb, '/api/puerta/escanear', { sesion: SA, tipo: 'qr', qr: qrDe(T3), id: uuid(), at: Date.now() });
    ok(ia.st === 403 && /cerrada/.test(ia.t), 'con la sesión de Ana (otro negocio) → 403');
    const im = await apiRaw(pb, '/api/puerta/escanear', { sesion: SA, tipo: 'boleto', boleto: T3, motivo: 'x', id: uuid(), at: Date.now() });
    ok(im.st === 403, 'entrada a mano con la sesión de otro → 403');
    await pb.goto(B + `/puerta/s/${SA}`);
    ok(await contiene(pb, 'Ya no tienes acceso a esta puerta') && !(await texto(pb)).includes('Noche de la puerta'), 'abrir la puerta de Ana → «Ya no tienes acceso a esta puerta» sin nada del evento');
    for (const [u, que] of [[`/api/puerta/vivo?sesion=${SA}`, 'SSE con la sesión de otro'], [`/api/puerta/vivo?negocio=${NEG}&fecha=${F1}`, 'SSE del Monitor de otro negocio']]) {
      const st = await pb.evaluate(async (x) => (await fetch(x)).status, u);
      ok(st === 403, `${que} → 403`);
    }
    await pb.goto(B + `/puerta/s/${SP}?t=buscar`);
    await (await vis(pb.getByLabel('Nombre, código, orden B- o últimos 4 del teléfono'))).fill('rosa');
    await pb.waitForTimeout(1200);
    ok(!(await texto(pb)).includes('Rosa Prueba'), 'Buscar en la puerta de la Parroquia no encuentra a la cortesía de La Terraza');
    const capB = accion(/^\["\d+","rosa"\]$/);
    ok(!!capB, 'se capturó la acción de buscar');
    const rr = await repetir(cb, capB, JSON.stringify([SA, 'rosa']));
    ok(/cerrada/.test(rr) && !rr.includes('Rosa Prueba'), 'buscar con la sesión de Ana → «ya no tienes acceso» (sin resultados)');
    const capAb = accion(/^\["\d+","(Principal|VIP)",/);
    ok(!!capAb && /No tienes acceso|todavía no abre/.test(await repetir(cb, capAb, JSON.stringify([F1, 'Principal', null]))), 'abrir la puerta de La Terraza como portero de la Parroquia → sin acceso');
    const capInv = accion(/^\["la-terraza-night","Ana Portera"/);
    const ri = await repetir(cl, capInv, JSON.stringify([NEG, 'Intruso', '5705550524', null]));
    ok(/No tienes acceso a esta parte del panel/.test(ri) && sql(`select count(*) from door_staff where display_name = 'Intruso'`) === '0', 'el dueño de la Parroquia no puede invitar porteros a La Terraza (acceso «evt» del panel)');
    const vec = await apiRaw(p1, '/api/puerta/escanear', { sesion: SA, tipo: 'qr', qr: qrDe(T3), id: uuid(), at: Date.now() });
    ok(vec.st === 403, 'un vecino con la sesión de Ana → 403');
    ok(sql(`select count(*) from door_sessions where user_id = '${U1}' and event_date_id = ${FB}`) === '0' && sql(`select puerta_puede(${FB}, '${U1}', (select id from door_staff where user_id = '${U1}' and status = 'active' limit 1))`) === 'f', 'la base tampoco deja a Ana abrir la puerta de la Parroquia');
    ok(sql(`select puerta_puede(${F4}, '${U2}', (select id from door_staff where user_id = '${U2}' and status = 'active' limit 1))`) === 'f', 'ni a Beto la del evento de mañana (fuera de la ventana del día)');

    // ── 16 · Quitar a un portero: su puerta se corta al momento ──
    await a2.goto(B + `/puerta/s/${SB}?t=aforo`);
    await pm.goto(B + `/panel/${NEG}/eventos?det=evt:${EV1}`);
    await clic(pm.locator('xpath=//*[normalize-space()="Beto Portero"]/ancestor::div[2]//*[@role="button" and normalize-space()="Quitar"]'));
    await (await vis(pm.getByLabel('¿POR QUÉ LO QUITAS?'))).fill('Ya no trabaja con nosotros');
    await clic(btn(pm, 'Quitar portero'));
    ok(await contiene(pm, 'Quitado: su puerta se cerró al momento.'), 'el dueño quita a Beto con motivo');
    ok(sql(`select string_agg(distinct ended_by, ',') from door_sessions where id in (${SB}, ${SF}, ${SR})`) === 'removed', 'la base cerró en el acto TODAS sus sesiones abiertas');
    const rq = await apiRaw(a2, '/api/puerta/escanear', { sesion: SB, tipo: 'qr', qr: qrDe(T3), id: uuid(), at: Date.now() });
    ok(rq.st === 403 && /cerrada/.test(rq.t), 'el siguiente escaneo de Beto → 403 «ya no tienes acceso»');
    ok(await contiene(a2, 'Ya no tienes acceso a esta puerta', 12000), 'su pantalla abierta lo dice sola (SSE «cerrada» → recarga)');
    await a2.screenshot({ path: OUT + 'e6g-puerta-quitado-390.png' });

    // ── 17 · Nada de teléfonos ni dinero en la puerta ──
    const pag = []; for (const t of ['lista', 'buscar', 'aforo', 'mesas', 'equipo', 'cierre', 'incid']) { await a1.goto(B + `/puerta/s/${SA}?t=${t}`); pag.push(await a1.content()); }
    const todo = respuestas.join('\n') + pag.join('\n');
    const tels = ['5705550122', '5705550299', '5705550288', '555-0122', '555-0299', '555-0288', P1, P2].filter((x) => todo.includes(x));
    ok(!tels.length, `ninguna respuesta ni pantalla de la puerta trae teléfonos (${tels.join(',') || 'ninguno'})`);
    ok(!/price|cents|total|\$\d/.test(todo.replace(/<script[\s\S]*?<\/script>/g, '')) && !/"(price|cents|total|amount)/.test(respuestas.join('\n')), 'ni precios, montos o totales');

    // ── 18 · Cierre de la noche ──
    await a1.goto(B + `/puerta/s/${SA}?t=cierre`);
    ok(await contiene(a1, 'Cierre de la noche') && await contiene(a1, 'NO VINIERON') && await contiene(a1, 'Cortesías') && await contiene(a1, 'Incidencias'), 'Cierre: ENTRARON · BOLETOS · NO VINIERON, cortesías, RSVP, rechazados, incidencias');
    await a1.screenshot({ path: OUT + 'e6g-puerta-cierre-390.png', fullPage: true });
    await clic(btn(a1, 'Cerrar mi puerta'));
    await a1.waitForURL(/\/puerta$/);
    ok(sql(`select ended_by from door_sessions where id = ${SA}`) === 'self', 'Ana cierra su puerta (sesión cerrada por ella)');

    // ── 19 · Super Admin › Modo puerta (solo lectura) y ESCANEOS del boleto ──
    await pa.goto(B + '/admin/eventos/puerta');
    ok(await contiene(pa, 'Modo puerta') && await contiene(pa, `Noche de la puerta ${TAG}`), 'Super Admin › Modo puerta: AHORA con el evento');
    await pa.goto(B + `/admin/eventos/puerta?fecha=${F1}`);
    ok(await contiene(pa, 'ADENTRO') && await contiene(pa, 'REPETIDOS') && await contiene(pa, 'SESIONES DE PORTERO') && await contiene(pa, 'ÚLTIMOS EN LA PUERTA') && await contiene(pa, 'Beto Portero'), 'la fecha: ADENTRO · FALTAN · RECHAZADOS · REPETIDOS, sesiones y últimos');
    await pa.screenshot({ path: OUT + 'e6g-admin-puerta-1360.png', fullPage: true });
    await pa.goto(B + `/admin/eventos/boleto/${CODE1}`);
    ok(await contiene(pa, 'ESCANEOS EN LA PUERTA') && await contiene(pa, 'PRINCIPAL · ANA PORTERA') && await contiene(pa, 'VIP · BETO PORTERO'), 'la ficha del boleto: cada escaneo con su puerta y quién (VÁLIDO por Principal, YA ENTRÓ por VIP)');
    const cam = await ctx(390, 844, true), pam = await cam.newPage(); await entrar(pam, ADM);
    await pam.goto(B + `/admin/eventos/puerta?fecha=${F1}`); await contiene(pam, 'ADENTRO');
    await pam.screenshot({ path: OUT + 'e6g-admin-puerta-390.png', fullPage: true });

    // ── 20 · Mi cuenta: «Usado · entraste a las …» ──
    await p1.goto(B + `/cuenta/boletos/${CODE1}`);
    ok(await contiene(p1, 'Usado · entraste a las') && await contiene(p1, 'USADO ·'), 'Mi cuenta: el boleto dice «Usado · entraste a las …»');
    await p1.screenshot({ path: OUT + 'e6g-boleto-usado-390.png', fullPage: true });

    // ── 21 · La puerta en escritorio y el barrido ──
    const cw = await ctx(1360, 900), pw = await cw.newPage(); await entrar(pw, P1);
    await pw.goto(B + '/puerta'); await contiene(pw, 'Noche de la puerta');
    await pw.screenshot({ path: OUT + 'e6g-puerta-inicio-1360.png', fullPage: true });
    const bar = JSON.parse(execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString());
    ok(!(bar.fallas ?? []).some((x) => ['puertaSesiones', 'puertaAbre'].includes(x.tarea)), `el barrido corre puertaSesiones y puertaAbre sin errores (${JSON.stringify(bar.fallas ?? [])})`);
    ok(!err.length, `sin errores en el navegador${err.length ? ': ' + err.join(' | ') : ''}`);
    console.log(`\nOK evt6g · ${n} comprobaciones`);
  } catch (e) {
    for (const [k, p] of Object.entries(PAGS)) await p.screenshot({ path: OUT + `e6g-FALLA-${k}.png`, fullPage: true }).catch(() => undefined);
    throw e;
  } finally {
    limpiar();
    for (const [u, p] of Object.entries(PREFS)) sql(`update users set notif_prefs = '${p}'::jsonb where id = '${u}'`);
    await br.close(); if (bCam) await bCam.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
