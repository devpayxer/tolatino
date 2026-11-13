// 6d · Después de comprar, de punta a punta (teléfono 390 y escritorio 1360) contra el simulador de pagos:
// transferir (QR viejo anulado, deshacer, vence con el reloj movido, recibir solo con ESE teléfono, una vez, nunca quien lo manda), cambiar el
// nombre, cancelar con devolución (precio − cargo; ventana de 24 h y 2 h con la fecha movida; idempotente: doble toque, la misma llave otra
// vez, Stripe que falla y el barrido que reintenta, dos barridos a la vez), devolver desde el panel (100 %; un boleto usado no), cortesías
// (con y sin teléfono, tope de Configuración, no se devuelven ni se venden), lista de espera (FIFO, oferta de 30 min con el apartado a su nombre,
// vence → la siguiente; el público no se la salta), ayuda con la orden B- (directo a To'Latino → Colas › Soporte → resolver y devolver),
// IDOR con otra cuenta en cada acción nueva (se repite la llamada del servidor con la sesión de otra persona) y el Super Admin. Deja los datos
// como estaban (eventos de prueba cancelados, boletos anulados, Configuración y avisos restaurados).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9b-1 · El SMS que se espera sale de la regla del servidor (de noche, lo que no es crítico espera: «silencio»).
const { smsEsperado } = require('../lib/negocio-nuevo.cjs');
// 9a · 7d: con El Compa encendido, «Ayuda con …» abre primero su hoja; la razón «Algo no salió bien / no está bien» lleva al formulario de
// siempre (?de=compa). Ir directo a /ayuda?de=compa es «ya pasé por la hoja».
// Con la operación todavía viva la hoja no trae esa razón (Cancelar, Otra hora, Otra cosa): ahí se sigue como «ya pasé por la hoja».
const pasarHoja = async (p) => { await p.waitForLoadState('networkidle'); const r = p.getByText(/^(Algo no está bien|Algo no salió bien)$/); if (await r.count()) { await r.first().click(); await p.waitForURL(/de=compa/); } else if (!/de=compa/.test(p.url())) await p.goto(p.url() + (p.url().includes('?') ? '&' : '?') + 'de=compa'); };
const { chromium } = require('playwright'); const { execSync, exec } = require('child_process'); const crypto = require('crypto');
const jsQR = require(ENT.rec('jsqr/package/dist/jsQR.js'));
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrido = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const barridoA = () => new Promise((res) => exec(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`, (e, so) => res(so)));
const RUN = Date.now().toString(36), TAG = `[e6d ${RUN}]`;
const C1 = '5705550122', C2 = '5705550299', C3 = '5705550288', TERRAZA = '5705550366', ADM = '5705550199', JUAN = '5705550444', YESENIA = '5705550433', NEG = 'la-terraza-night';
const SIN_CUENTA = '5705559917';
const btn = (p, t) => p.locator('button, [role="button"]', { hasText: t });
const dl = (c) => c.toFixed(2);

// El QR del SVG (TicketQR / QrCode): módulos «M x y h1v1h-1z» → mapa de bits → jsQR.
async function leerQR(p, sel) {
  const d = await p.evaluate((s) => { const el = document.querySelector(s); const svg = el && el.querySelector('svg[role="img"]'); const path = svg && svg.querySelector('path'); return path ? { d: path.getAttribute('d'), vb: svg.getAttribute('viewBox') } : null; }, sel);
  if (!d) return null;
  const sz = Number(d.vb.split(' ')[2]), sc = 6, N = sz * sc, px = new Uint8ClampedArray(N * N * 4).fill(255);
  for (const m of d.d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) { const x = +m[1], y = +m[2]; for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const i = ((y * sc + a) * N + (x * sc + b)) * 4; px[i] = px[i + 1] = px[i + 2] = 0; } }
  const r = jsQR(px, N, N); return r ? r.data : null;
}
const firmaBuena = (t) => { const m = /^TL1\.([a-f0-9]{8})\.(\d+)\.(\d+)\.(\d+)\.(\d+)\.([A-Za-z0-9_-]{86})$/.exec(t || ''); if (!m) return false; const pk = sql(`select public_key from qr_keys where kid = '${m[1]}'`); if (!pk) return false;
  const pub = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(pk, 'base64url')]), format: 'der', type: 'spki' });
  return crypto.verify(null, Buffer.from(t.slice(0, t.lastIndexOf('.'))), pub, Buffer.from(m[6], 'base64url')); };

// Las llamadas al servidor (server actions) que hace la pantalla: se guardan para repetirlas con la sesión de OTRA persona (IDOR).
const acciones = [];
const espiar = (p) => p.on('request', (r) => { const a = r.headers()['next-action']; if (a && r.method() === 'POST') acciones.push({ url: r.url(), a, body: r.postData() || '' }); });
const accion = (re) => [...acciones].reverse().find((x) => re.test(x.body));
const repetir = async (ctx, cap, body) => (await (await ctx.request.post(cap.url, { headers: { 'next-action': cap.a, 'content-type': 'text/plain;charset=UTF-8', origin: B, accept: 'text/x-component' }, data: body ?? cap.body })).text());

(async () => {
  require('../lib/negocio-nuevo.cjs').sinTopeDeAyuda('5705550122'); // 9b-1 · el tope de 5 ayudas al día de Marisol (ver lib)
  const ADMID = uid(ADM), U1 = uid(C1), U2 = uid(C2), U3 = uid(C3), UY = uid(YESENIA);
  const PREFS = Object.fromEntries([U1, U2, U3, UY].map((u) => [u, sql(`select notif_prefs::text from users where id = '${u}'`)]));
  const limpiar = () => {
    sql(`delete from platform_config where key in ('evt_cortesias_max', 'bol_transferencias_dia_max')`);
    sql(`update ticket_holds set status = 'released' where status = 'held' and event_id in (select id from events where title->>'es' like '%[e6d %')`);
    sql(`update waitlist set status = 'left' where status in ('waiting', 'offered') and event_id in (select id from events where title->>'es' like '%[e6d %')`);
    sql(`update ticket_transfers set status = 'cancelled', ended_at = now() where status = 'pending' and event_date_id in (select d.id from event_dates d join events e on e.id = d.event_id where e.title->>'es' like '%[e6d %')`);
    // Las transferencias de corridas anteriores de esta prueba no cuentan para el tope de hoy (se corre varias veces al día).
    sql(`begin; set local session_replication_role = replica; update ticket_transfers set created_at = created_at - interval '2 days' where created_at > now() - interval '1 day' and event_date_id in (select d.id from event_dates d join events e on e.id = d.event_id where e.title->>'es' like '%[e6d %'); commit;`);
    sql(`update tickets set status = 'void', void_reason = 'prueba' where status in ('valid', 'used') and event_id in (select id from events where title->>'es' like '%[e6d %')`);
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where title->>'es' like '%[e6d %' and status <> 'cancelled'`);
  };
  limpiar();
  // Las pruebas corren varias veces al día: el tope de transferencias al día se sube durante la prueba (y se prueba aparte).
  sql(`insert into platform_config (key, value, updated_by) values ('bol_transferencias_dia_max', '50', '${ADMID}') on conflict (key) do update set value = excluded.value`);
  // Avisos con SMS a cualquier hora para las cuentas de prueba (las horas de silencio de Nueva York los guardarían de noche); se restauran al final.
  for (const u of Object.keys(PREFS)) sql(`update users set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || '{"quiet": false}'::jsonb where id = '${u}'`);
  if (sql(`select count(*) from users where phone = '+1${SIN_CUENTA}'`) !== '0') throw new Error('el teléfono de prueba sin cuenta tiene cuenta');
  // 9b-1 · Una tarjeta por persona y últimos 4 (antes una nueva en cada corrida: Marisol llegó a 11 y la lista de la app muestra 10).
  const tarjeta = (tel, l4) => { const u = uid(tel); sql(`update payment_methods set is_default = false where user_id = '${u}'`); sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, status, simulated) values ('${u}', 'pm_sim_visa_${l4}_${crypto.createHash('md5').update(tel + l4).digest('hex').slice(0, 8)}', 'visa', '${l4}', '12/30', true, 'active', true) on conflict (stripe_pm_id) do update set is_default = true, status = 'active'`); };
  // Evento principal (La Terraza): General ($15 × 6) · Mesa de pista (1, 4 entradas, depósito $40) · Detalle solo con mesa ($35). En 5 días a las 10 PM.
  const tk = JSON.stringify([{ id: 'gen', n: { es: 'General', en: 'General' }, s: { es: '', en: '' }, p: 1500, cap: 6, off: false }]);
  const mt = JSON.stringify([{ id: 'pista', z: { es: 'Mesa · Pista', en: 'Table · Dance floor' }, seats: 4, min: 12000, dep: 4000, cap: 1 }]);
  const ad = JSON.stringify([{ id: 'cum', n: { es: 'Detalle de cumpleaños', en: 'Birthday setup' }, s: { es: '', en: '' }, p: 3500, kind: 'detalle', mesa: true }]);
  const evento = (titulo, dias, tks, mts, ads) => {
    const id = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, tables_cfg, addons_cfg)
      values ('', 'hzl', '${NEG}', 'noche', '{"es":"${titulo} ${TAG}","en":"${titulo} ${TAG}"}', (now() at time zone 'America/New_York')::date + ${dias}, 1320, 1560, 'tickets', 'live', now(), now(), '${ADMID}', 60, '${ADMID}', 21,
              '${tks}'::jsonb, '${mts}'::jsonb, '${ads}'::jsonb) returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${id})`);
    return { id, F: sql(`select id from event_dates where event_id = ${id}`), SLUG: sql(`select slug from events where id = ${id}`) };
  };
  const E1 = evento('Noche después de comprar', 5, tk, mt, ad), EV = E1.id, F = E1.F, SLUG = E1.SLUG;
  const T_GEN = sql(`select id from ticket_types where event_id = ${EV} and cfg_key = 'gen'`);
  const mover = (fid, intervalo) => sql(`update event_dates set starts_at = now() + interval '${intervalo}', doors_at = now() + interval '${intervalo}' - interval '1 hour', ends_at = now() + interval '${intervalo}' + interval '4 hours' where id = ${fid}`);
  const stockGen = () => sql(`select sold_n || '|' || held_n || '|' || quantity from ticket_stock where ticket_type_id = ${T_GEN}`);
  const pago = (num) => sql(`select p.status || '|' || p.amount_cents || '|' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${num}'`);
  const br = await chromium.launch();
  const ctx = async (w, h, mobile) => br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile });
  // Comprar por la pantalla (boletos → pagar con la tarjeta del simulador → la orden).
  const comprar = async (p, slug, fecha, clics, mesa) => {
    await p.goto(B + `/eventos/${slug}/boletos?fecha=${fecha}`);
    for (const [tipo, k] of clics) for (let i = 0; i < k; i++) await clic(p.locator(`[data-tipo="${tipo}"] >> text="+"`));
    if (mesa) { await clic(p.locator('[role="radio"]', { hasText: 'Mesa · Pista' })); await clic(p.locator('[role="checkbox"]', { hasText: 'Detalle de cumpleaños' })); }
    await clic(btn(p, 'Continuar')); await p.waitForURL(/\/eventos\/pagar\//);
    await clic(btn(p, /^Pagar \$/)); await p.waitForURL(/\/eventos\/orden\/B-/, { timeout: 20000 });
    return p.url().split('/').pop();
  };
  try {
    const c1 = await ctx(390, 844, true), p1 = await c1.newPage(); espiar(p1);
    const c2 = await ctx(390, 844, true), p2 = await c2.newPage(); espiar(p2);
    const c3 = await ctx(390, 844, true), p3 = await c3.newPage(); espiar(p3);
    await entrar(p1, C1); tarjeta(C1, '4242'); await entrar(p2, C2); tarjeta(C2, '4242'); await entrar(p3, C3); tarjeta(C3, '4242');

    // ── 1 · Comprar: C1 lleva 3 generales + la mesa + el extra ──
    const O1 = await comprar(p1, SLUG, F, [[T_GEN, 3]], true);
    const T1 = sql(`select string_agg(code, ',' order by id) from tickets where operation_id = (select id from operations where number = '${O1}') and ticket_type_id is not null`).split(',');
    const MESA = sql(`select code from tickets where operation_id = (select id from operations where number = '${O1}') and table_id is not null`);
    const diag = pago(O1) === 'captured|12000|0' ? '' : ` · diag: config ${sql(`select string_agg(key || '=' || value::text, ', ') from platform_config where key like 'evt%' or key like 'bol%'`)} · operaciones ${sql(`select string_agg(number || ':' || status, ',') from operations where number = '${O1}'`)} · hora ${sql(`select now()::text`)}`;
    ok(T1.length === 3 && MESA && pago(O1) === 'captured|12000|0', `C1 compró ${O1}: 3 generales + mesa + extra = $120 cobrados (pago ${pago(O1)}, boletos ${T1.length}, mesa ${MESA ? 'sí' : 'no'})${diag}`);
    ok(await contiene(p1, 'Transferir boletos') && await contiene(p1, 'Ayuda con esta orden') && await contiene(p1, 'POLÍTICA DE ESTE EVENTO'), 'la orden: «Transferir boletos», «Ayuda con esta orden» y la política con sus plazos (Configuración)');
    await p1.screenshot({ path: OUT + 'e6d-orden-m.png', fullPage: true });
    // El QR de antes de transferir (para probar que queda anulado).
    await p1.goto(B + `/cuenta/boletos/${T1[0]}`); const QR_VIEJO = await leerQR(p1, '[data-pantalla="USR-BOLETO"]');
    ok(firmaBuena(QR_VIEJO) && /\.1\.1\.[A-Za-z0-9_-]{86}$/.test(QR_VIEJO), 'el QR del primer boleto antes de transferir: versión 1, firma buena');

    // ── 2 · Transferir a C2 por teléfono (desde la orden) ──
    await p1.goto(B + `/eventos/orden/${O1}`);
    await clic(btn(p1, 'Transferir boletos'));
    ok(await contiene(p1, 'EL QR ANTERIOR QUEDA ANULADO') && await contiene(p1, 'Puedes transferir hasta 2 h antes'), 'hoja «Transferir boletos»: «EL QR ANTERIOR QUEDA ANULADO» y «hasta 2 h antes» (Configuración)');
    await p1.screenshot({ path: OUT + 'e6d-transferir-m.png', fullPage: true });
    await clic(p1.locator('[role="dialog"] [role="button"]', { hasText: T1[0] }));
    await p1.fill('input[aria-label="Teléfono de la persona"]', C1);
    await clic(btn(p1, 'Enviar boleto'));
    ok(await contiene(p1, 'Ese es tu teléfono'), 'no se transfiere a tu propio teléfono');
    await p1.fill('input[aria-label="Teléfono de la persona"]', `(570) 555-${C2.slice(6)}`);
    await clic(btn(p1, 'Enviar boleto'));
    ok(await contiene(p1, 'Boleto enviado a ••99'), '«Boleto enviado a ••99» (el que manda solo ve los últimos 2)');
    const X1 = sql(`select id || '|' || status || '|' || to_last2 from ticket_transfers where ticket_id = (select id from tickets where code = '${T1[0]}')`).split('|');
    ok(X1[1] === 'pending' && X1[2] === '99' && sql(`select qr_ver from tickets where code = '${T1[0]}'`) === '2', 'transferencia pendiente; el QR del boleto subió a la versión 2 (el anterior queda anulado)');
    ok(!/5550299|\+1570/.test(sql(`select coalesce(encode(to_phone_enc, 'escape'), '') || to_phone_hash || claim_hash from ticket_transfers where id = ${X1[0]}`)), 'la base guarda el teléfono cifrado y la huella; el token, solo su huella');
    ok(sql(`select bol_vigente(id) from tickets where code = '${T1[0]}'`) === 'f', 'mientras está pendiente el boleto no entra (bol_vigente = false)');
    await p1.goto(B + `/eventos/orden/${O1}`);
    ok(await contiene(p1, 'ENVIADOS · ESPERANDO QUE LOS RECIBAN') && await contiene(p1, 'A ••99 · lo puede recibir hasta') && await contiene(p1, 'Deshacer'), 'la orden: «ENVIADOS · ESPERANDO QUE LOS RECIBAN» (a ••99, hasta cuándo) con «Deshacer»');
    ok(!(await p1.evaluate((c) => !!document.querySelector(`[data-boleto="${c}"] svg[role="img"] path`), T1[0])), 'el boleto enviado no muestra ningún QR');
    await p1.screenshot({ path: OUT + 'e6d-orden-enviado-m.png', fullPage: true });
    const capTransfer = accion(new RegExp(`${T1[0]}.*${C2.slice(6)}`));
    ok(!!capTransfer, 'se tiene la llamada del servidor de «Enviar boleto» (para repetirla con otra cuenta)');
    // Aviso a C2 (tiene cuenta): en la app y por SMS (modo pruebas) con el enlace.
    const N2 = sql(`select href || '|' || sms_status from notifications where user_id = '${U2}' and tpl = 'bol_transfer_in' order by id desc limit 1`).split('|');
    ok(/^\/eventos\/recibir\/[A-Za-z0-9_-]{32}$/.test(N2[0]) && N2[1] === smsEsperado('bol_transfer_in', `'${U2}'`), 'C2 recibe el aviso «Te mandaron un boleto» con el enlace (SMS en modo pruebas)');
    const TOKEN1 = N2[0].split('/').pop();
    // Admin: el QR viejo ya no entra.
    {
      const ca = await ctx(1360, 900), pa = await ca.newPage(); await entrar(pa, ADM);
      await pa.goto(B + `/admin/eventos?tab=bol&q=${encodeURIComponent(QR_VIEJO)}`);
      ok(await contiene(pa, 'QR viejo'), 'Super Admin › Buscar boleto con el QR anterior: «QR viejo: no entra»');
      await ca.close();
    }

    // ── 3 · Recibir: otra cuenta (C3) y quien lo manda (C1) no pueden; C2 sí, una sola vez ──
    await p3.goto(B + `/eventos/recibir/${TOKEN1}`);
    ok(await contiene(p3, 'Este boleto se mandó a otro teléfono') && !(await vis(btn(p3, 'Recibir boleto'))), 'C3 (otro teléfono) abre el enlace: «se mandó a otro teléfono», sin botón');
    ok(!(await texto(p3)).includes('0299') && !(await texto(p3)).includes('0122'), 'la pantalla no muestra ningún teléfono');
    await p3.screenshot({ path: OUT + 'e6d-recibir-otro-m.png', fullPage: true });
    await p1.goto(B + `/eventos/recibir/${TOKEN1}`); ok(await contiene(p1, 'Tú lo mandaste'), 'quien lo manda abre su enlace: «Tú lo mandaste»');
    const cs = await ctx(390, 844, true), ps = await cs.newPage();
    await ps.goto(B + `/eventos/recibir/${TOKEN1}`);
    ok(await contiene(ps, 'Entra con tu teléfono para recibirlo') && await contiene(ps, 'TE LO MANDA'), 'sin sesión: qué es, quién lo manda (nombre + inicial) y «Entrar con mi teléfono»');
    await ps.screenshot({ path: OUT + 'e6d-recibir-entrar-m.png', fullPage: true }); await cs.close();
    await p2.goto(B + `/eventos/recibir/${TOKEN1}`);
    ok(await contiene(p2, 'Este boleto es para ti'), 'C2 (el teléfono correcto): «Este boleto es para ti»');
    await p2.screenshot({ path: OUT + 'e6d-recibir-m.png', fullPage: true });
    await clic(btn(p2, 'Recibir boleto')); await p2.waitForURL(/\/cuenta\/boletos\/TL-/, { timeout: 15000 });
    const NUEVO = p2.url().split('/').pop();
    const capRecibir = accion(new RegExp(TOKEN1));
    ok(sql(`select status || '|' || replaced_by from tickets where code = '${T1[0]}'`) === `replaced|${sql(`select id from tickets where code = '${NUEVO}'`)}` && sql(`select holder_user_id || '|' || status || '|' || qr_ver || '|' || price_cents from tickets where code = '${NUEVO}'`) === `${U2}|valid|1|1500`,
      `recibido: el original queda «replaced» y nace ${NUEVO} a nombre de C2 (QR versión 1)`);
    const QR_NUEVO = await leerQR(p2, '[data-pantalla="USR-BOLETO"]');
    ok(firmaBuena(QR_NUEVO) && QR_NUEVO.split('.')[2] === sql(`select id from tickets where code = '${NUEVO}'`), 'el QR de C2 es de su boleto nuevo y la firma es buena');
    ok(await contiene(p2, 'Mis boletos'), 'el boleto recibido vuelve a «Mis boletos» (la orden es de quien pagó)');
    ok(sql(`select status || '|' || claimed_by from ticket_transfers where id = ${X1[0]}`) === `claimed|${U2}` && sql(`select count(*) from notifications where user_id = '${U1}' and tpl = 'bol_transfer_ok'`) >= '1', 'transferencia recibida; a C1 le llega «Ya recibieron tu boleto»');
    await p2.screenshot({ path: OUT + 'e6d-boleto-recibido-m.png', fullPage: true });
    // Una segunda vez, otra cuenta o quien lo manda: nada cambia.
    ok(/ya se recibió/.test(await repetir(c2, capRecibir)), 'recibir dos veces: «Este boleto ya se recibió.»');
    await p2.goto(B + `/eventos/recibir/${TOKEN1}`); ok(await contiene(p2, 'Ya es tuyo'), 'el enlace ya usado, para quien lo recibió: «Ya es tuyo»');
    await p3.goto(B + `/eventos/recibir/${TOKEN1}`); ok(await contiene(p3, 'Este enlace ya se usó'), 'para otra persona: «Este enlace ya se usó»');
    await p2.goto(B + '/cuenta/boletos'); ok(await contiene(p2, 'RECIBIDO · CON QR') && await contiene(p2, 'te lo mandaron'), 'Mis boletos de C2: «RECIBIDO · CON QR»');
    await p1.goto(B + `/eventos/orden/${O1}`); ok(await contiene(p1, 'TRANSFERIDO'), 'la orden de C1: ese boleto dice «TRANSFERIDO»');
    // Escaneando el QR viejo y el del original (admin): no entran.
    ok(sql(`select bol_vigente(id) from tickets where code = '${T1[0]}'`) === 'f' && sql(`select bol_vigente(id) from tickets where code = '${NUEVO}'`) === 't', 'el original no entra; el nuevo sí');

    // ── 4 · IDOR: repetir cada llamada nueva con la sesión de otra persona ──
    // Una transferencia nueva a C2 (para probar recibir con otra cuenta y con quien la manda).
    await p1.goto(B + `/cuenta/boletos/${T1[1]}`);
    await clic(btn(p1, 'Transferir este boleto')); await p1.fill('input[aria-label="Teléfono de la persona"]', C2); await clic(btn(p1, 'Enviar boleto'));
    ok(await contiene(p1, 'Boleto enviado a ••99'), 'desde el boleto: «Transferir este boleto» (a C2 otra vez)');
    ok(await contiene(p1, 'ENVIADO A ••99 · EL QR ANTERIOR QUEDA ANULADO') && await contiene(p1, 'Deshacer'), 'el boleto: «ENVIADO A ••99», hasta cuándo y «Deshacer»');
    await p1.screenshot({ path: OUT + 'e6d-boleto-enviado-m.png', fullPage: true });
    const TOKEN2 = sql(`select href from notifications where user_id = '${U2}' and tpl = 'bol_transfer_in' order by id desc limit 1`).split('/').pop();
    const capRecibir2 = capRecibir.body.replace(TOKEN1, TOKEN2);
    ok(/otro teléfono/.test(await repetir(c3, capRecibir, capRecibir2)) && sql(`select status from ticket_transfers where claim_hash = encode(sha256('${TOKEN2}'::bytea), 'hex')`) === 'pending', 'IDOR: C3 repite «Recibir» con el enlace de C2 → «se mandó a otro teléfono», nada cambia');
    ok(/Tú mandaste/.test(await repetir(c1, capRecibir, capRecibir2)), 'quien lo manda no lo puede recibir');
    ok(/no existe/.test(await repetir(c3, capTransfer, capTransfer.body.replace(T1[0], T1[2]))) && sql(`select count(*) from ticket_transfers where ticket_id = (select id from tickets where code = '${T1[2]}')`) === '0', 'IDOR: C3 repite «Enviar boleto» con un boleto de C1 → «Ese boleto no existe»');
    for (const u of [`/eventos/orden/${O1}`, `/eventos/orden/${O1}/ayuda`, `/cuenta/boletos/${T1[2]}`]) { const r = await p3.goto(B + u); ok(r.status() === 404, `IDOR: otra cuenta no abre ${u.replace(/\/[^/]+$/, '/…')} (404)`); }
    // Deshacer (UI) → QR nuevo (versión 4: 1 → 2 al primer envío... del segundo boleto: 1 → 2 → 3).
    await clic(btn(p1, 'Deshacer'));
    ok(await contiene(p1, 'el boleto vuelve a ti con un QR nuevo') && sql(`select status from ticket_transfers where claim_hash = encode(sha256('${TOKEN2}'::bytea), 'hex')`) === 'cancelled' && sql(`select qr_ver from tickets where code = '${T1[1]}'`) === '3', '«Deshacer»: la transferencia se cae y el boleto vuelve con QR versión 3');
    await p1.reload(); const QR3 = await leerQR(p1, '[data-pantalla="USR-BOLETO"]'); ok(firmaBuena(QR3) && /\.3\.1\.[A-Za-z0-9_-]{86}$/.test(QR3), 'el QR que se ve ahora es la versión 3, firmado');
    await p2.goto(B + `/eventos/recibir/${TOKEN2}`); ok(await contiene(p2, 'Quien lo mandó lo deshizo'), 'el enlace deshecho: «Quien lo mandó lo deshizo»');
    const capDeshacer = accion(new RegExp(`^\\["${T1[1]}"\\]$`));
    ok(!!capDeshacer && /no existe/.test(await repetir(c3, capDeshacer)), 'IDOR: C3 repite «Deshacer» con un boleto de C1 → «Ese boleto no existe»');
    // Cambiar el nombre (gratis hasta 2 h antes; el nombre no va en el QR).
    await clic(btn(p1, 'Cambiar el nombre')); await p1.fill('input[aria-label="Nombre en el boleto"]', 'Rosa M 5551234'); await clic(btn(p1, 'Guardar'));
    ok(await espera(() => sql(`select holder_name from tickets where code = '${T1[1]}'`) === 'Rosa M'), '«Cambiar el nombre»: guardado (sin números largos) y el QR no cambia');
    const capNombre = accion(/Rosa M/);
    ok(/no existe/.test(await repetir(c3, capNombre, capNombre.body.replace('Rosa M 5551234', 'Otro'))) && sql(`select holder_name from tickets where code = '${T1[1]}'`) === 'Rosa M', 'IDOR: C3 no le cambia el nombre a un boleto de C1');

    // ── 5 · Transferencia que vence (reloj movido) y la ventana de 2 h ──
    await clic(btn(p1, 'Transferir este boleto')); await p1.fill('input[aria-label="Teléfono de la persona"]', C3); await clic(btn(p1, 'Enviar boleto'));
    await contiene(p1, 'Boleto enviado a ••88');
    const X3 = sql(`select id from ticket_transfers where ticket_id = (select id from tickets where code = '${T1[1]}') and status = 'pending'`);
    sql(`begin; set local session_replication_role = replica; update ticket_transfers set expires_at = now() - interval '1 minute' where id = ${X3}; commit;`);
    barrido();
    ok(sql(`select status from ticket_transfers where id = ${X3}`) === 'expired' && sql(`select qr_ver from tickets where code = '${T1[1]}'`) === '5' && sql(`select count(*) from notifications where user_id = '${U1}' and tpl = 'bol_transfer_vuelve'`) >= '1',
      'nadie la recibió a tiempo: el barrido la vence, el boleto vuelve con QR nuevo y C1 recibe «Tu boleto volvió a ti»');
    // Tope de transferencias al día (Configuración): con el tope en lo que ya mandó hoy, la siguiente no sale.
    const hoyN = sql(`select count(*) from ticket_transfers where from_user_id = '${U1}' and kind = 'transfer' and created_at > now() - interval '1 day'`);
    sql(`update platform_config set value = '${hoyN}' where key = 'bol_transferencias_dia_max'`);
    ok(new RegExp(`Hasta ${hoyN} transferencias al día`).test(await repetir(c1, capTransfer, capTransfer.body.replace(T1[0], T1[1]).replace(C2.slice(6), C3.slice(6)))), `el tope de Configuración (${hoyN} al día): «Hasta ${hoyN} transferencias al día. Prueba mañana.»`);
    sql(`update platform_config set value = '50' where key = 'bol_transferencias_dia_max'`);
    mover(F, '2 hours 3 minutes');
    ok(!/hasta 2 h antes/.test(await repetir(c1, capTransfer, capTransfer.body.replace(T1[0], T1[1]).replace(C2.slice(6), C3.slice(6)))), 'a 2 h 3 min del inicio todavía se transfiere');
    sql(`update ticket_transfers set status = 'cancelled', ended_at = now() where ticket_id = (select id from tickets where code = '${T1[1]}') and status = 'pending'`);
    mover(F, '1 hour 59 minutes');
    ok(/Se transfiere hasta 2 h antes del evento/.test(await repetir(c1, capTransfer, capTransfer.body.replace(T1[0], T1[1]).replace(C2.slice(6), C3.slice(6)))), 'a 1 h 59 min: «Se transfiere hasta 2 h antes del evento. Ya pasó.»');
    await p1.goto(B + `/cuenta/boletos/${T1[1]}`); ok(await contiene(p1, 'Ya no se transfiere ni cambia de nombre') && !(await vis(btn(p1, 'Transferir este boleto'))), 'la pantalla ya no ofrece transferir');

    // ── 6 · Cancelar con devolución: ventana de 24 h (fecha movida) ──
    mover(F, '23 hours');
    await p1.goto(B + `/eventos/orden/${O1}`); await clic(btn(p1, 'Ayuda con esta orden'));
    ok(await contiene(p1, 'No veo mis boletos') && await contiene(p1, 'Un problema con el pago') && await contiene(p1, 'Ya solo se puede transferir'), 'hoja «¿Qué pasó?» (HelpReasonList): a 23 h dice «Ya solo se puede transferir»');
    await p1.screenshot({ path: OUT + 'e6d-ayuda-hoja-m.png', fullPage: true });
    await clic(p1.getByText('Cancelar mis boletos', { exact: true }));
    ok(await contiene(p1, 'Ya no se puede cancelar con devolución: era hasta 24 h antes del evento'), 'a 23 h: «Ya no se puede cancelar con devolución» (solo transferir)');
    await p1.screenshot({ path: OUT + 'e6d-cancelar-cerrado-m.png', fullPage: true });
    await clic(btn(p1, 'Entendido'));
    mover(F, '24 hours 5 minutes');
    await p1.reload(); await clic(btn(p1, 'Ayuda con esta orden')); await clic(p1.getByText('Cancelar mis boletos', { exact: true }));
    // C1 tiene T1[1], T1[2] y la mesa. Cada general: $15 − cargo $1.75 (5 % + $1) = $13.25; la mesa: $40 − $3 = $37; extras (si cancela todo): $35 − $1.75.
    const fee = (c) => Number(sql(`select fee_cents from tickets where code = '${c}'`));
    ok(await contiene(p1, 'Cancelar mis boletos') && await contiene(p1, `$${dl((1500 - fee(T1[1])) / 100)}`) && await contiene(p1, 'TE DEVOLVEMOS'), `a 24 h 5 min: la hoja muestra lo que vuelve por boleto (precio − cargo de servicio: $${dl((1500 - fee(T1[1])) / 100)})`);
    await p1.screenshot({ path: OUT + 'e6d-cancelar-m.png', fullPage: true });
    // Solo un general: desmarca el otro y la mesa.
    await clic(p1.locator('[role="checkbox"]', { hasText: T1[2] })); await clic(p1.locator('[role="checkbox"]', { hasText: MESA }));
    const esperado = 1500 - fee(T1[1]);
    const cx = await vis(btn(p1, `Cancelar y devolver $${dl(esperado / 100)}`));
    ok(!!cx, `el botón dice exactamente lo que vuelve: «Cancelar y devolver $${dl(esperado / 100)}»`);
    const stock0 = stockGen();
    await cx.evaluate((el) => { el.click(); el.click(); }); // doble toque
    ok(await contiene(p1, `Te devolvemos $${dl(esperado / 100)}`), 'listo: «Te devolvemos … a tu tarjeta en 3–5 días hábiles»');
    ok(sql(`select count(*) from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${O1}'`) === '1', 'doble toque: una sola devolución');
    ok(sql(`select r.status || '|' || r.amount_cents || '|' || r.initiated_by from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${O1}'`) === `done|${esperado}|buyer`, `devolución hecha: $${dl(esperado / 100)}, la pidió el comprador`);
    ok(pago(O1) === `partially_refunded|12000|${esperado}` && sql(`select refunded_cents from sim_intents where id = (select stripe_payment_intent from payments p join operations o on o.id = p.operation_id where o.number = '${O1}')`) === String(esperado), 'el pago y el simulador devolvieron exactamente eso');
    ok(sql(`select status from tickets where code = '${T1[1]}'`) === 'refunded' && sql(`select amount_cents || '|' || fee_kept_cents from ticket_refund_lines where ticket_id = (select id from tickets where code = '${T1[1]}')`) === `${esperado}|${fee(T1[1])}`, 'el boleto queda «refunded»; la línea dice lo devuelto y el cargo que se queda To’Latino');
    ok(Number(stockGen().split('|')[0]) === Number(stock0.split('|')[0]) - 1, `la base soltó su lugar (vendidos ${stock0.split('|')[0]} → ${stockGen().split('|')[0]})`);
    ok(sql(`select count(*) from notifications where user_id = '${U1}' and tpl = 'bol_cancelado'`) >= '1' && sql(`select count(*) from notifications where tpl = 'evt_devolucion' and ref_id = '${O1}'`) >= '1', 'avisos: «Cancelaste tus boletos» al comprador y «Volvieron boletos a la venta» al negocio');
    const capCancelar = accion(new RegExp(`${O1}.*${T1[1]}`));
    ok(!!capCancelar && /"ya":true|ya/.test(await repetir(c1, capCancelar)) && sql(`select count(*) from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${O1}'`) === '1', 'la misma llamada otra vez (misma llave): no devuelve dos veces');
    ok(/no existe/.test(await repetir(c3, capCancelar, capCancelar.body.replace(/"[0-9a-f-]{36}"/, `"${crypto.randomUUID()}"`).replace(T1[1], T1[2]))), 'IDOR: C3 repite «Cancelar» con la orden de C1 → «Esa orden no existe»');
    ok(/no existe/.test(await repetir(c2, capCancelar, capCancelar.body.replace(/"[0-9a-f-]{36}"/, `"${crypto.randomUUID()}"`).replace(T1[1], NUEVO))), 'quien recibió un boleto no lo cancela (el dinero es de quien pagó)');
    await p1.goto(B + `/eventos/orden/${O1}`);
    ok(await contiene(p1, `Cancelaste boletos: te devolvemos $${dl(esperado / 100)}`), 'la orden muestra la devolución');
    await p1.screenshot({ path: OUT + 'e6d-orden-devuelto-m.png', fullPage: true });

    // ── 7 · Idempotencia con Stripe fallando: queda pendiente y el barrido la reintenta con la MISMA llave (dos barridos a la vez) ──
    const PI1 = sql(`select stripe_payment_intent from payments p join operations o on o.id = p.operation_id where o.number = '${O1}'`);
    sql(`update sim_intents set status = 'requires_capture' where id = '${PI1}'`); // el simulador no devuelve
    const capC2 = capCancelar.body.replace(/"[0-9a-f-]{36}"/, `"${crypto.randomUUID()}"`).replace(T1[1], T1[2]);
    await repetir(c1, capCancelar, capC2);
    const R2 = sql(`select r.id || '|' || r.status || '|' || r.attempts from refunds r where r.idem_key = 'bolcx-' || '${JSON.parse(capC2)[2]}'`).split('|');
    ok(R2[1] === 'pending' && R2[2] === '1' && sql(`select status from tickets where code = '${T1[2]}'`) === 'refunded', 'Stripe no respondió: el boleto ya no entra y la devolución queda «pendiente» (1 intento)');
    ok(/pasa de lo cobrado|devolucion_de_mas/.test(sqlErr(`insert into refunds (payment_id, amount_cents, initiated_by, status, idem_key) select p.id, p.amount_cents, 'admin', 'pending', 'prueba-${RUN}' from payments p join operations o on o.id = p.operation_id where o.number = '${O1}'`)), 'la base: lo pendiente + lo hecho no pasa de lo cobrado');
    ok(/duplicate key|ticket_refund_lines_boleto_idx/.test(sqlErr(`insert into ticket_refund_lines (refund_id, operation_id, ticket_id, city_id, amount_cents) select ${R2[0]}, operation_id, id, city_id, 1 from tickets where code = '${T1[2]}'`)), 'la base: un boleto no se devuelve dos veces (índice único)');
    sql(`update refunds set created_at = now() - interval '2 minutes' where id = ${R2[0]}`);
    barrido();
    ok(sql(`select status || '|' || attempts from refunds where id = ${R2[0]}`) === 'pending|2', 'el barrido lo intenta otra vez (Stripe sigue sin responder): 2 intentos, nada devuelto');
    sql(`update sim_intents set status = 'succeeded' where id = '${PI1}'`);
    await Promise.all([barridoA(), barridoA()]);
    const total2 = esperado + 1500 - fee(T1[2]);
    ok(sql(`select status from refunds where id = ${R2[0]}`) === 'done' && pago(O1) === `partially_refunded|12000|${total2}` && sql(`select refunded_cents from sim_intents where id = '${PI1}'`) === String(total2), 'Stripe vuelve: dos barridos a la vez la hacen UNA vez (pago y simulador cuadran)');
    ok(sql(`select count(*) from sim_refunds where payment_intent = '${PI1}'`) === '2', 'el simulador anotó una devolución por llave');
    barrido(); ok(pago(O1) === `partially_refunded|12000|${total2}`, 'otro barrido: nada cambia');

    // ── 8 · Devolver desde el panel (100 %; un boleto usado no) ──
    const O3 = await comprar(p3, SLUG, F, [[T_GEN, 2]]);
    const T3 = sql(`select string_agg(code, ',' order by id) from tickets where operation_id = (select id from operations where number = '${O3}')`).split(',');
    sql(`update tickets set status = 'used' where code = '${T3[1]}'`);
    const cn = await ctx(1360, 900), pn = await cn.newPage(); espiar(pn); await entrar(pn, TERRAZA);
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${EV}`);
    ok(await contiene(pn, 'COMPRADORES') && await contiene(pn, 'CORTESÍAS') && await contiene(pn, 'DEVOLUCIONES'), 'panel › la ficha: COMPRADORES, CORTESÍAS y DEVOLUCIONES');
    await clic(pn.locator('[role="button"], button', { hasText: O3 }).first());
    await clic(btn(pn, /^Devolver$/));
    ok(await contiene(pn, `DEVOLVER · ORDEN ${O3}`) && await contiene(pn, 'USADO · NO SE DEVUELVE') && await contiene(pn, 'Devolver $15'), 'Devolver: muestra los boletos; el usado no se puede elegir; vuelve el 100 % ($15)');
    await pn.screenshot({ path: OUT + 'e6d-panel-devolver-d.png', fullPage: true });
    await clic(btn(pn, 'Devolver $15'));
    ok(await espera(() => pago(O3) === 'partially_refunded|3000|1500'), 'el organizador devolvió $15 (100 % del boleto) a la tarjeta');
    ok(sql(`select status from tickets where code = '${T3[0]}'`) === 'refunded' && sql(`select fee_kept_cents || '|' || fee_waived_cents from ticket_refund_lines where ticket_id = (select id from tickets where code = '${T3[0]}')`) === `0|${fee(T3[0])}`, 'la comisión de ese boleto no se cobra (fee_waived) y To’Latino no se queda nada');
    ok(sql(`select count(*) from notifications where user_id = '${U3}' and tpl = 'bol_devuelto'`) >= '1', 'el comprador recibe «Te devolvieron tus boletos»');
    const capDev = accion(new RegExp(`${O3}.*${T3[0]}`));
    ok(/usado no se devuelve/.test(await repetir(cn, capDev, capDev.body.replace(T3[0], T3[1]).replace(/"[0-9a-f-]{36}"/, `"${crypto.randomUUID()}"`))), 'devolver un boleto usado → «Un boleto usado no se devuelve.»');
    ok(!/"ok":true/.test(await repetir(c3, capDev, capDev.body.replace(/"[0-9a-f-]{36}"/, `"${crypto.randomUUID()}"`))) && pago(O3) === 'partially_refunded|3000|1500', 'IDOR: un vecino repite «Devolver» del panel → sin acceso, nada cambia');
    { const cj = await ctx(1360, 900), pj = await cj.newPage(); await entrar(pj, JUAN);
      ok(!/"ok":true/.test(await repetir(cj, capDev, capDev.body.replace(/"[0-9a-f-]{36}"/, `"${crypto.randomUUID()}"`))) && pago(O3) === 'partially_refunded|3000|1500', 'IDOR: el dueño de otro negocio repite «Devolver» → sin acceso');
      await cj.close(); }

    // ── 9 · Cortesías: con teléfono (cuenta y sin cuenta), sin teléfono, tope, quitar; no se venden ni se devuelven ──
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${EV}`);
    const s0 = Number(stockGen().split('|')[0]);
    await pn.fill('input[placeholder="Ej. DJ Cri Cri + 1"]', 'DJ Prueba'); await pn.fill('input[placeholder="10 dígitos"]', C3);
    await clic(pn.getByRole('button', { name: 'Cuántas entradas +' })); // 2 entradas
    await clic(btn(pn, 'Dar cortesía'));
    ok(await contiene(pn, 'Cortesía lista'), 'panel: «Dar cortesía» (nombre, teléfono, 2 entradas)');
    const OC = sql(`select number from operations where kind = 'tickets' and pay_mode = 'none' and details->>'comp_name' = 'DJ Prueba' and (details->>'event_id')::bigint = ${EV} order by id desc limit 1`);
    ok(sql(`select count(*) || '|' || sum(price_cents) || '|' || sum(fee_cents) || '|' || bool_and(holder_user_id is null) from tickets where operation_id = (select id from operations where number = '${OC}')`) === '2|0|0|true' && Number(stockGen().split('|')[0]) === s0 + 2,
      `cortesía ${OC}: 2 boletos en $0, sin comisión, sin dueño todavía; toman 2 lugares de la existencia`);
    const NC = sql(`select href from notifications where user_id = '${U3}' and tpl = 'bol_cortesia' order by id desc limit 1`);
    ok(/^\/eventos\/recibir\//.test(NC), 'C3 (con cuenta) recibe «Tienes una cortesía» con el enlace');
    await p3.goto(B + NC); ok(await contiene(p3, 'Tu cortesía te espera') && await contiene(p3, 'CORTESÍA DE LA TERRAZA'), 'recibir la cortesía: «Tu cortesía te espera» del negocio');
    await p3.screenshot({ path: OUT + 'e6d-recibir-cortesia-m.png', fullPage: true });
    await clic(btn(p3, 'Recibir cortesía')); await p3.waitForURL(/\/cuenta\/boletos\/TL-/);
    ok(sql(`select count(*) from tickets where operation_id = (select id from operations where number = '${OC}') and holder_user_id = '${U3}'`) === '2', 'las 2 entradas pasan a la cuenta de C3');
    ok(await contiene(p3, 'Cortesía') && await contiene(p3, 'DJ PRUEBA'), 'su boleto dice «Cortesía» a nombre de «DJ PRUEBA»');
    // Sin cuenta: el SMS va a phone_messages cifrado (nunca el número en claro).
    await pn.fill('input[placeholder="Ej. DJ Cri Cri + 1"]', 'Invitada sin cuenta'); await pn.fill('input[placeholder="10 dígitos"]', SIN_CUENTA); await clic(btn(pn, 'Dar cortesía'));
    ok(await contiene(pn, 'Cortesía lista'), 'cortesía a un teléfono sin cuenta');
    ok(sql(`select sms_status || '|' || (body like '%/eventos/recibir/%') || '|' || (body like '%${SIN_CUENTA}%') from phone_messages where tpl = 'bol_cortesia' order by id desc limit 1`) === `${smsEsperado('bol_cortesia')}|true|false`, 'el SMS a un teléfono sin cuenta queda en phone_messages (modo pruebas) con el enlace; el número solo cifrado');
    // Sin teléfono + el tope de Configuración.
    sql(`insert into platform_config (key, value, updated_by) values ('evt_cortesias_max', '3', '${ADMID}') on conflict (key) do update set value = excluded.value`);
    await pn.fill('input[placeholder="Ej. DJ Cri Cri + 1"]', 'Tercera'); await pn.fill('input[placeholder="10 dígitos"]', ''); await clic(btn(pn, 'Dar cortesía'));
    ok(await contiene(pn, 'Hasta 3 cortesías por fecha (ya diste 3)'), 'el tope de Configuración (3): «Hasta 3 cortesías por fecha (ya diste 3)»');
    await pn.screenshot({ path: OUT + 'e6d-panel-cortesias-d.png', fullPage: true });
    sql(`delete from platform_config where key = 'evt_cortesias_max'`);
    // No se devuelven ni se venden (la base).
    const CT = sql(`select code from tickets where operation_id = (select id from operations where number = '${OC}') order by id limit 1`);
    ok(/cortesia_sin_dinero/.test(sqlErr(`update tickets set status = 'refunded' where code = '${CT}'`)), 'la base: una cortesía no se devuelve');
    ok(/cortesia_sin_dinero/.test(sqlErr(`insert into ticket_refund_lines (refund_id, operation_id, ticket_id, city_id, amount_cents) select ${R2[0]}, operation_id, id, city_id, 0 from tickets where code = '${CT}'`)), 'la base: una cortesía no entra a una devolución');
    ok(/cortesia_sin_dinero|tickets_cortesia/.test(sqlErr(`insert into tickets (event_date_id, ticket_type_id, operation_id, kind, price_cents, comp_name) values (${F}, ${T_GEN}, (select id from operations where number = '${O1}'), 'comp', 0, 'Vendida')`)), 'la base: una cortesía en una orden cobrada (vendida) no entra');
    ok(/tickets_cortesia_sin_dinero/.test(sqlErr(`insert into tickets (event_date_id, ticket_type_id, operation_id, kind, price_cents, comp_name) values (${F}, ${T_GEN}, (select id from operations where number = '${OC}'), 'comp', 500, 'Con precio')`)), 'la base: una cortesía con precio no entra');
    // Quitar la de sin cuenta: la existencia vuelve.
    const OC2 = sql(`select number from operations where details->>'comp_name' = 'Invitada sin cuenta' and (details->>'event_id')::bigint = ${EV} order by id desc limit 1`);
    const s1 = Number(stockGen().split('|')[0]);
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${EV}`);
    const filaInv = pn.getByText('Invitada sin cuenta · 1 entrada', { exact: true }).locator('xpath=ancestor::div[.//*[normalize-space()="Quitar"]][1]');
    await clic(filaInv.locator('button, [role="button"]', { hasText: 'Quitar' }));
    ok(await espera(() => sql(`select status from tickets where operation_id = (select id from operations where number = '${OC2}')`) === 'void') && Number(stockGen().split('|')[0]) === s1 - 1, '«Quitar» una cortesía: se anula y la base suelta su lugar');
    ok(sql(`select status from ticket_transfers where operation_id = (select id from operations where number = '${OC2}')`) === 'cancelled', 'su enlace deja de valer');
    const capComp = accion(/DJ Prueba|Tercera/);
    ok(!!capComp && !/"ok":true/.test(await repetir(c3, capComp)), 'IDOR: un vecino repite «Dar cortesía» → sin acceso');

    // ── 10 · Lista de espera: FIFO, oferta de 30 min a su nombre, vence → la siguiente; el público no se la salta ──
    const E2v = evento('Lista de espera', 6, JSON.stringify([{ id: 'uno', n: { es: 'Entrada', en: 'Entry' }, s: { es: '', en: '' }, p: 1200, cap: 2, off: false }]), '[]', '[]');
    const T_UNO = sql(`select id from ticket_types where event_id = ${E2v.id}`);
    const OW = await comprar(p1, E2v.SLUG, E2v.F, [[T_UNO, 2]]);
    const TW = sql(`select string_agg(code, ',' order by id) from tickets where operation_id = (select id from operations where number = '${OW}')`).split(',');
    await p2.goto(B + `/eventos/${E2v.SLUG}?fecha=${E2v.F}`);
    ok(await contiene(p2, 'LISTA DE ESPERA ABIERTA') && await contiene(p2, 'Se agotó. Anótate'), 'agotado: la ficha abre la lista de espera («Se agotó. Anótate…»)');
    await clic(btn(p2, /^Lista de espera/));
    ok(await contiene(p2, 'En lista · #1'), 'C2 se anota: «En lista · #1»');
    await p2.screenshot({ path: OUT + 'e6d-ficha-espera-m.png', fullPage: true });
    await p3.goto(B + `/eventos/${E2v.SLUG}?fecha=${E2v.F}`); await clic(btn(p3, /^Lista de espera/));
    ok(await contiene(p3, 'En lista · #2'), 'C3 se anota después: «En lista · #2»');
    ok(/el lugar en la lista de espera no cambia/.test(sqlErr(`update waitlist set created_at = now() - interval '1 day' where user_id = '${U3}' and event_date_id = ${E2v.F}`)), 'la base no deja cambiar el lugar en la fila');
    // C1 cancela 1 → el lugar es para C2 (la primera), no para C3 ni para el público.
    await p1.goto(B + `/eventos/orden/${OW}`); await clic(btn(p1, 'Ayuda con esta orden')); await clic(p1.getByText('Cancelar mis boletos', { exact: true }));
    await clic(p1.locator('[role="checkbox"]', { hasText: TW[1] }));
    await clic(btn(p1, /^Cancelar y devolver/)); await contiene(p1, 'Te devolvemos');
    ok(sql(`select status from waitlist where user_id = '${U2}' and event_date_id = ${E2v.F}`) === 'offered' && sql(`select status from waitlist where user_id = '${U3}' and event_date_id = ${E2v.F}`) === 'waiting', 'se liberó un lugar: una sola oferta, a C2 (la primera); C3 sigue esperando');
    const HW = sql(`select hold_id || '|' || round(extract(epoch from offer_expires_at - now()) / 60) from waitlist where user_id = '${U2}' and event_date_id = ${E2v.F}`).split('|');
    ok(Number(HW[1]) >= 29 && Number(HW[1]) <= 30 && sql(`select user_id || '|' || status || '|' || held_n from ticket_holds h join ticket_stock s on s.ticket_type_id = ${T_UNO} where h.id = '${HW[0]}'`) === `${U2}|held|1`, 'la oferta es un apartado a nombre de C2 por 30 min (Configuración)');
    ok(sql(`select sms_status from notifications where user_id = '${U2}' and tpl = 'espera_lugar' order by id desc limit 1`) === smsEsperado('espera_lugar', `'${U2}'`), 'a C2 le llega «Se liberó un lugar» (SMS, modo pruebas)');
    { const cy = await ctx(390, 844, true), py = await cy.newPage(); await entrar(py, YESENIA); tarjeta(YESENIA, '4242');
      await py.goto(B + `/eventos/${E2v.SLUG}?fecha=${E2v.F}`);
      ok(await contiene(py, 'LISTA DE ESPERA') && !(await contiene(py, 'QUEDAN 1', 1500)), 'el público no ve el lugar liberado: es de la lista');
      await cy.close(); }
    const r404 = await p3.goto(B + `/eventos/pagar/${HW[0]}`); ok(r404.status() === 404, 'IDOR: C3 no abre la oferta de C2 (404)');
    await p2.goto(B + `/eventos/${E2v.SLUG}?fecha=${E2v.F}`);
    ok(await contiene(p2, 'Es tu turno') && await contiene(p2, 'SE LIBERÓ UN LUGAR · TIENES'), 'la ficha de C2: «Es tu turno · SE LIBERÓ UN LUGAR · TIENES N MIN» con «Pagar mi lugar»');
    await p2.screenshot({ path: OUT + 'e6d-ficha-oferta-m.png', fullPage: true });
    await clic(btn(p2, 'Pagar mi lugar')); await p2.waitForURL(/\/eventos\/pagar\//);
    ok(await contiene(p2, 'SE LIBERÓ UN LUGAR · ES TU TURNO'), 'la pantalla de pago: «SE LIBERÓ UN LUGAR · ES TU TURNO» con el tiempo del servidor');
    await p2.screenshot({ path: OUT + 'e6d-pago-oferta-m.png', fullPage: true });
    // La oferta de C2 vence (reloj movido) → el barrido la pasa a C3.
    sql(`update ticket_holds set expires_at = now() - interval '1 minute' where id = '${HW[0]}'`);
    barrido();
    ok(sql(`select status from waitlist where user_id = '${U2}' and event_date_id = ${E2v.F}`) === 'expired' && sql(`select status from waitlist where user_id = '${U3}' and event_date_id = ${E2v.F}`) === 'offered', 'venció la de C2: el barrido se la ofrece a C3 (la siguiente)');
    ok(sql(`select count(*) from notifications where user_id = '${U2}' and tpl = 'espera_vence'`) >= '1', 'C2 recibe «Tu turno venció»');
    await p2.reload();
    ok(await contiene(p2, 'Tu turno venció y el lugar pasó a la siguiente persona') && await (await vis(btn(p2, /^Pagar \$/))).isDisabled(), 'la pantalla de pago de la oferta vencida: «Tu turno venció…», «Pagar» apagado');
    const capPagar = accion(/^\["[0-9a-f-]{36}","pm_sim_/);
    const pm2 = sql(`select stripe_pm_id from payment_methods where user_id = '${U2}' and is_default and status = 'active' limit 1`);
    ok(!!capPagar && /Tu turno venció/.test(await repetir(c2, capPagar, JSON.stringify([HW[0], pm2, []]))), 'C2 repite «Pagar» de su oferta vencida: «Tu turno venció…» y no se cobra');
    ok(sql(`select count(*) from sim_intents where id like 'pi_sim_${HW[0]}%'`) === '0', 'a C2 no se le autorizó nada');
    const HW3 = sql(`select hold_id from waitlist where user_id = '${U3}' and event_date_id = ${E2v.F}`);
    await p3.goto(B + `/eventos/pagar/${HW3}`); await clic(btn(p3, /^Pagar \$12$/)); await p3.waitForURL(/\/eventos\/orden\/B-/, { timeout: 20000 });
    ok(sql(`select status from waitlist where user_id = '${U3}' and event_date_id = ${E2v.F}`) === 'converted' && sql(`select sold_n || '|' || held_n from ticket_stock where ticket_type_id = ${T_UNO}`) === '2|0', 'C3 paga su lugar: sale de la fila («converted») y la existencia cuadra');
    // Panel: LISTA DE ESPERA.
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${E2v.id}`);
    ok(await contiene(pn, 'LISTA DE ESPERA') && await contiene(pn, 'NO PAGÓ A TIEMPO') && await contiene(pn, 'COMPRÓ'), 'panel: LISTA DE ESPERA con cada persona (nombre + inicial) y su estado');
    ok(!(await texto(pn)).includes('0299') && !(await texto(pn)).includes('0288'), 'el panel no muestra teléfonos');
    await pn.screenshot({ path: OUT + 'e6d-panel-espera-d.png', fullPage: true });

    // ── 11 · Ayuda con la orden B- (directo a To'Latino) → Colas › Soporte → resolver y devolver ──
    await p1.goto(B + `/eventos/orden/${O1}`); await clic(btn(p1, 'Ayuda con esta orden')); await clic(p1.getByText('Un problema con el pago', { exact: true }));
    await p1.waitForURL(/\/ayuda(\?|$)/); await pasarHoja(p1);
    ok(await contiene(p1, 'Ayuda con el pago') && await contiene(p1, 'Me cobraron dos veces') && await contiene(p1, 'LO REVISA TO’LATINO'), 'APP-EVT-AYUDA-PAGO: motivos de boletos y «LO REVISA TO’LATINO»');
    await clic(p1.getByRole('button', { name: 'Me cobraron dos veces', exact: true }));
    await (await vis(p1.getByLabel('Qué pasó'))).fill('Me salen dos cargos de esta orden en el estado de cuenta.');
    await p1.screenshot({ path: OUT + 'e6d-ayuda-pago-m.png', fullPage: true });
    await p1.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
    ok(await espera(() => sql(`select h.reason || '|' || h.status || '|' || h.escalated_by from help_requests h join operations o on o.id = h.operation_id where o.number = '${O1}'`) === 'doble|escalated|system'), 'la solicitud va directo a To’Latino (escalada por el sistema)');
    const caso = sql(`select q.id || '|' || q.queue from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id and q.subject_kind = 'help_request' join operations o on o.id = h.operation_id where o.number = '${O1}'`).split('|');
    ok(caso[1] === 'sop', 'entra a la cola «Ayuda con pedidos» (sop) por su motivo (COLA_AYUDA_SQL)');
    { const ca = await ctx(1440, 900), pa = await ca.newPage(); await entrar(pa, ADM);
      await pa.goto(B + `/admin/colas?cola=sop&caso=${caso[0]}`); await pa.getByText('DEVOLVIBLE A LA TARJETA').first().waitFor();
      ok(await contiene(pa, 'Ayuda con una orden de boletos') && await contiene(pa, 'ORDEN DE BOLETOS') && await contiene(pa, 'Le cobraron dos veces'), 'admin: «Ayuda con una orden de boletos» con la orden y el motivo');
      await pa.screenshot({ path: OUT + 'e6d-admin-sop-d.png', fullPage: true });
      const antes = Number(pago(O1).split('|')[2]);
      await clic(pa.getByText('Resolver y devolver', { exact: true }));
      await (await vis(pa.locator('input').last())).fill('1.00');
      await (await vis(pa.locator('textarea').last())).fill('Revisamos tu cobro y te devolvemos $1 por la molestia.');
      await clic(pa.getByRole('button', { name: 'Resolver y devolver' }));
      ok(await espera(() => Number(pago(O1).split('|')[2]) === antes + 100), 'To’Latino resolvió y devolvió $1 (cobro de la plataforma, sin revertir transferencia)');
      ok(sql(`select r.initiated_by || '|' || r.status from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${O1}' order by r.id desc limit 1`) === 'admin|done', 'la devolución queda del admin, hecha');
      // Super Admin › el boleto: historial de transferencias y devolución.
      await pa.goto(B + `/admin/eventos/boleto/${T1[0]}`);
      ok(await contiene(pa, 'TRANSFERIDO') && await contiene(pa, 'TRANSFERENCIAS') && await contiene(pa, 'Lo recibió otra persona') && await contiene(pa, '••99'), 'admin › el boleto: TRANSFERIDO, sus transferencias (••99) y el historial');
      await pa.screenshot({ path: OUT + 'e6d-admin-boleto-d.png', fullPage: true });
      await pa.goto(B + `/admin/eventos/boleto/${T1[1]}`);
      ok(await contiene(pa, 'DEVOLUCIÓN') && await contiene(pa, 'El comprador canceló') && await contiene(pa, "CARGO QUE SE QUEDA TO'LATINO"), 'admin › el boleto cancelado: DEVOLUCIÓN, quién y el cargo que se queda');
      await pa.goto(B + `/admin/eventos/${EV}`);
      ok(await contiene(pa, 'CORTESÍAS VIVAS') && await contiene(pa, 'TRANSFERIDOS') && await contiene(pa, 'EN LISTA DE ESPERA'), 'admin › la ficha del evento: cortesías, transferidos y lista de espera');
      await pa.screenshot({ path: OUT + 'e6d-admin-evento-d.png', fullPage: true });
      await pa.goto(B + '/admin/transacciones?tab=bol');
      ok(await contiene(pa, `Boletos ${O1}`) && !(await texto(pa)).includes(`Boletos ${OC}`), 'Transacciones › Boletos: la orden con sus devoluciones; la cortesía (sin dinero) no sale');
      await ca.close(); }
    await p1.goto(B + `/eventos/orden/${O1}/ayuda?de=compa`); ok(await contiene(p1, 'RESPUESTA DE TO’LATINO'), 'el cliente ve la respuesta de To’Latino en su ayuda');

    // ── 12 · Escritorio (1360): la orden, las hojas, el boleto, recibir, la ficha con lista de espera y el panel ──
    const cd = await ctx(1360, 900), pd = await cd.newPage(); await entrar(pd, C1);
    await pd.goto(B + `/eventos/orden/${O1}`); await pd.screenshot({ path: OUT + 'e6d-orden-d.png', fullPage: true });
    await clic(btn(pd, 'Ayuda con esta orden')); await pd.screenshot({ path: OUT + 'e6d-ayuda-hoja-d.png' }); await pd.keyboard.press('Escape');
    const O1b = await comprar(pd, SLUG, F, [[T_GEN, 1]]);
    await clic(btn(pd, 'Transferir boletos')); await pd.screenshot({ path: OUT + 'e6d-transferir-d.png' }); await pd.keyboard.press('Escape');
    await clic(btn(pd, 'Ayuda con esta orden')); await clic(pd.getByText('Cancelar mis boletos', { exact: true })); await contiene(pd, 'TE DEVOLVEMOS'); await pd.screenshot({ path: OUT + 'e6d-cancelar-d.png' }); await pd.keyboard.press('Escape');
    const TB = sql(`select code from tickets where operation_id = (select id from operations where number = '${O1b}')`);
    await pd.goto(B + `/cuenta/boletos/${TB}`); await clic(btn(pd, 'Transferir este boleto')); await pd.fill('input[aria-label="Teléfono de la persona"]', C2); await clic(btn(pd, 'Enviar boleto'));
    await contiene(pd, 'Deshacer'); await pd.screenshot({ path: OUT + 'e6d-boleto-enviado-d.png', fullPage: true });
    const TOKD = sql(`select href from notifications where user_id = '${U2}' and tpl = 'bol_transfer_in' order by id desc limit 1`);
    const c2d = await ctx(1360, 900), p2d = await c2d.newPage(); await entrar(p2d, C2);
    await p2d.goto(B + TOKD); await p2d.screenshot({ path: OUT + 'e6d-recibir-d.png', fullPage: true });
    await p2d.goto(B + `/eventos/${E2v.SLUG}?fecha=${E2v.F}`); await p2d.screenshot({ path: OUT + 'e6d-ficha-espera-d.png', fullPage: true });
    await p2d.goto(B + `/eventos/orden/${O1}/ayuda?de=compa`); ok((await p2d.goto(B + `/eventos/orden/${O1}/ayuda?de=compa`)).status() === 404, 'escritorio: otra cuenta no abre la ayuda de C1 (404)');
    await p2d.goto(B + '/cuenta/boletos'); await p2d.screenshot({ path: OUT + 'e6d-mis-d.png', fullPage: true });
    await p2.goto(B + '/cuenta/boletos'); await p2.screenshot({ path: OUT + 'e6d-mis-m.png', fullPage: true });
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${EV}`); await pn.screenshot({ path: OUT + 'e6d-panel-ficha-d.png', fullPage: true });
    const cnm = await ctx(390, 844, true), pnm = await cnm.newPage(); await entrar(pnm, TERRAZA);
    await pnm.goto(B + `/panel/${NEG}/eventos?det=evt:${EV}`); await pnm.screenshot({ path: OUT + 'e6d-panel-ficha-m.png', fullPage: true });
    await pnm.goto(B + `/panel/${NEG}/eventos?det=evt:${E2v.id}`); await pnm.screenshot({ path: OUT + 'e6d-panel-espera-m.png', fullPage: true });
    await p1.goto(B + `/eventos/orden/${O1}/ayuda?de=compa`); await p1.screenshot({ path: OUT + 'e6d-ayuda-estado-m.png', fullPage: true });
    await p1.goto(B + `/eventos/orden/${O1}/ayuda?de=compa`); await pd.goto(B + `/eventos/orden/${O1}/ayuda?de=compa`); await pd.screenshot({ path: OUT + 'e6d-ayuda-estado-d.png', fullPage: true });
    ok(true, 'capturas de teléfono (390) y escritorio (1360) en cap/e6d-*');
    console.log(`\n${n} ✓ · evt6d`);
  } finally {
    limpiar();
    for (const [u, p] of Object.entries(PREFS)) sql(p ? `update users set notif_prefs = '${p}'::jsonb where id = '${u}'` : `update users set notif_prefs = null where id = '${u}'`);
    await br.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
