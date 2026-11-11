// 6c · Boletos de punta a punta (teléfono 390 y escritorio 1360) contra el simulador de pagos:
// ficha con «Boletos» y QUEDAN · elegir tipos, mesa y extra · código «Aplicar» (lo calcula el servidor) · apartar (held_n) · pagar en nuestra hoja
// (autorizar → boletos → capturar) · la orden con QR REAL (se decodifica el SVG con jsQR y se verifica la firma Ed25519 con la llave pública de
// qr_keys) · Mis boletos y el boleto · otra cuenta no abre la orden, el boleto ni el pago de la primera (IDOR) · apartado que vence con el reloj
// movido y lo suelta el barrido · «Se acabaron mientras pagabas» · tarjeta 0002 (no se cobra, siguen guardados) y luego 4242 · el último boleto
// con 3 compradores a la vez (uno gana) y 10 a la vez en la base · agotado · código hasta su tope y una vez por persona · tope por orden (clave
// de Configuración) · doble toque en Pagar = una orden · Cobros apagado y Free bloquean la venta · panel (VENDIDO, compradores, crear código) ·
// Super Admin (Buscar boleto por código y por QR, firma alterada = no entra, Reemitir → el QR viejo no entra, la ficha del evento con lo
// vendido, Transacciones › Boletos). Deja los datos como estaban (evento de prueba cancelado y sus boletos anulados).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync, exec } = require('child_process'); const crypto = require('crypto');
const jsQR = require(ENT.rec('jsqr/package/dist/jsQR.js'));
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlA = (q) => new Promise((res) => exec(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, (e, so, se) => res(e ? 'ERR ' + se : so.trim())));
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
const RUN = Date.now().toString(36), TAG = `[e6c ${RUN}]`;
const C1 = '5705550122', C2 = '5705550299', C3 = '5705550288', TERRAZA = '5705550366', ADM = '5705550199', NEG = 'la-terraza-night';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// El QR del SVG (TicketQR): los módulos son «M x y h1v1h-1z» con 4 de margen → mapa de bits → jsQR.
async function leerQR(p, sel) {
  const d = await p.evaluate((s) => { const el = document.querySelector(s); const svg = el && el.querySelector('svg[role="img"]'); const path = svg && svg.querySelector('path'); return path ? { d: path.getAttribute('d'), vb: svg.getAttribute('viewBox') } : null; }, sel);
  if (!d) return null;
  const sz = Number(d.vb.split(' ')[2]), sc = 6, N = sz * sc, px = new Uint8ClampedArray(N * N * 4).fill(255);
  for (const m of d.d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) { const x = +m[1], y = +m[2]; for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const i = ((y * sc + a) * N + (x * sc + b)) * 4; px[i] = px[i + 1] = px[i + 2] = 0; } }
  const r = jsQR(px, N, N); return r ? r.data : null;
}
const firmaBuena = (t) => { const m = /^TL1\.([a-f0-9]{8})\.(\d+)\.(\d+)\.(\d+)\.(\d+)\.([A-Za-z0-9_-]{86})$/.exec(t); if (!m) return false; const pk = sql(`select public_key from qr_keys where kid = '${m[1]}'`); if (!pk) return false;
  const pub = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(pk, 'base64url')]), format: 'der', type: 'spki' });
  return crypto.verify(null, Buffer.from(t.slice(0, t.lastIndexOf('.'))), pub, Buffer.from(m[6], 'base64url')); };

(async () => {
  const ADMID = uid(ADM);
  const restaurar = () => {
    sql(`update stripe_accounts set charges_enabled = true where business_id = '${NEG}'`);
    sql(`update business_stats_cache set plan = 'pro' where business_id = '${NEG}'`);
    sql(`delete from platform_config where key = 'evt_boletos_por_orden_max'`);
    sql(`update ticket_holds set status = 'released' where status = 'held' and event_id in (select id from events where title->>'es' like '%[e6c %')`);
  };
  const limpiar = () => {
    restaurar();
    sql(`update tickets set status = 'void', void_reason = 'prueba' where status = 'valid' and event_id in (select id from events where title->>'es' like '%[e6c %')`);
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where title->>'es' like '%[e6c %' and status <> 'cancelled'`);
  };
  limpiar();
  // Tarjetas guardadas del simulador (4242 aprobada; 0002 rechazada).
  const tarjeta = (tel, l4) => { const u = uid(tel); sql(`update payment_methods set is_default = false where user_id = '${u}'`); sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, status, simulated) values ('${u}', 'pm_sim_visa_${l4}_${crypto.createHash('md5').update(RUN + tel + l4).digest('hex').slice(0, 8)}', 'visa', '${l4}', '12/30', true, 'active', true) on conflict (stripe_pm_id) do update set is_default = true, status = 'active'`); };
  // Evento de prueba de La Terraza: General (3) · Último (1) · Mesa de pista (1, 4 entradas, depósito $40) · Detalle solo con mesa ($35).
  const tk = JSON.stringify([{ id: 'gen', n: { es: `General ${TAG}`, en: 'General' }, s: { es: '', en: '' }, p: 1500, cap: 3, off: false }, { id: 'ult', n: { es: 'Último boleto', en: 'Last ticket' }, s: { es: '', en: '' }, p: 2000, cap: 1, off: false }]);
  const mt = JSON.stringify([{ id: 'pista', z: { es: 'Mesa · Pista', en: 'Table · Dance floor' }, seats: 4, min: 12000, dep: 4000, cap: 1 }]);
  const ad = JSON.stringify([{ id: 'cum', n: { es: 'Detalle de cumpleaños', en: 'Birthday setup' }, s: { es: '', en: '' }, p: 3500, kind: 'detalle', mesa: true }]);
  const EV = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, tables_cfg, addons_cfg)
    values ('', 'hzl', '${NEG}', 'noche', '{"es":"Noche de boletos ${TAG}","en":"Ticket night ${TAG}"}', (now() at time zone 'America/New_York')::date + 5, 1320, 1560, 'tickets', 'live', now(), now(), '${ADMID}', 60, '${ADMID}', 21,
            '${tk}'::jsonb, '${mt}'::jsonb, '${ad}'::jsonb) returning id`).split('\n')[0];
  sql(`select evt_sincronizar_fechas(${EV})`);
  const F = sql(`select id from event_dates where event_id = ${EV}`), SLUG = sql(`select slug from events where id = ${EV}`);
  const T_GEN = sql(`select id from ticket_types where event_id = ${EV} and cfg_key = 'gen'`), T_ULT = sql(`select id from ticket_types where event_id = ${EV} and cfg_key = 'ult'`);
  ok(T_GEN && T_ULT && sql(`select count(*) from table_stock s join event_tables t on t.id = s.table_id where t.event_id = ${EV}`) === '1', 'la configuración del evento pasó a ticket_types, event_tables, event_addons y su existencia por fecha');
  sql(`insert into discount_codes (event_id, city_id, business_id, code, kind, value, uses_max) values (${EV}, 'hzl', '${NEG}', 'UNAVEZ', 'pct', 10, 1), (${EV}, 'hzl', '${NEG}', 'DOSVECES', 'amount', 300, 5)`);
  const br = await chromium.launch();
  const ctx = async (w, h, mobile) => br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile });
  try {
    // ── 1 · La ficha vende ──
    const c1 = await ctx(390, 844, true), p1 = await c1.newPage();
    await entrar(p1, C1); tarjeta(C1, '4242');
    await p1.goto(B + `/eventos/${SLUG}?fecha=${F}`);
    ok(await contiene(p1, 'QUEDAN 3') && await contiene(p1, 'QUEDAN 1'), 'la ficha muestra lo que queda de cada boleto (del servidor)');
    await p1.screenshot({ path: OUT + 'e6c-ficha-m.png', fullPage: true });
    await clic(p1.locator('button, [role="button"]', { hasText: /^Boletos$/ }));
    await p1.waitForURL(/\/boletos\?fecha=/);
    ok(await contiene(p1, 'MÁX.') && await contiene(p1, 'SOLO QUEDAN 1.') && await contiene(p1, 'SOLO CON MESA'), 'APP-EVT-BOLETOS: tipos con «MÁX. N POR PERSONA», «Solo quedan N», extras «SOLO CON MESA»');
    // ── 2 · Elegir 2 generales + mesa + extra, código «Aplicar» ──
    await clic(p1.locator(`[data-tipo="${T_GEN}"] >> text="+"`)); await clic(p1.locator(`[data-tipo="${T_GEN}"] >> text="+"`));
    await clic(p1.locator('[role="radio"]', { hasText: 'Mesa · Pista' }));
    await clic(p1.locator('[role="checkbox"]', { hasText: 'Detalle de cumpleaños' }));
    ok(await contiene(p1, 'te guardamos boletos y mesa por 8 minutos'), 'el tiempo del apartado sale de Configuración (evt_apartado_min = 8)');
    await p1.fill('input[aria-label="Código de descuento"]', 'noexiste');
    await clic(p1.locator('button, [role="button"]', { hasText: 'Aplicar' }));
    ok(await contiene(p1, 'Ese código no existe para este evento.'), 'código que no existe: el servidor lo dice (y cuenta como intento)');
    await p1.fill('input[aria-label="Código de descuento"]', 'UNAVEZ');
    await clic(p1.locator('button, [role="button"]', { hasText: 'Aplicar' }));
    ok(await contiene(p1, 'CÓDIGO APLICADO · −$3'), '«CÓDIGO APLICADO · −$3» (10 % de $30, calculado en el servidor)');
    await p1.screenshot({ path: OUT + 'e6c-boletos-m.png', fullPage: true });
    await clic(p1.locator('button, [role="button"]', { hasText: 'Continuar' }));
    await p1.waitForURL(/\/eventos\/pagar\//);
    const H1 = p1.url().split('/').pop();
    ok(sql(`select status || '|' || total_cents || '|' || discount_cents || '|' || subtotal_cents from ticket_holds where id = '${H1}'`) === 'held|10200|300|10500', 'apartado en el servidor: subtotal $105, descuento $3, total $102 (cargos incluidos)');
    ok(sql(`select held_n from ticket_stock where ticket_type_id = ${T_GEN}`) === '2' && sql(`select held_n from discount_codes where code = 'UNAVEZ' and event_id = ${EV}`) === '1', 'existencias y el uso del código apartados (held_n) en la misma transacción');
    ok(await contiene(p1, 'TUS BOLETOS ESTÁN GUARDADOS') && await contiene(p1, 'CARGOS INCLUIDOS · NADA MÁS EN LA PUERTA') && await contiene(p1, 'si en la puerta no muestras ID, no entras'), 'APP-EVT-PAGO: guardados, «CARGOS INCLUIDOS · NADA MÁS EN LA PUERTA» y la línea de ID (21+)');
    await p1.fill('input[placeholder="A nombre de…"] >> nth=0', 'Marisol P');
    await p1.screenshot({ path: OUT + 'e6c-pago-m.png', fullPage: true });
    // Doble toque: dos «Pagar» casi a la vez → una sola orden.
    const pagar = await vis(p1.locator('button, [role="button"]', { hasText: /^Pagar \$102$/ }));
    await pagar.evaluate((el) => { el.click(); el.click(); });
    await p1.waitForURL(/\/eventos\/orden\/B-/, { timeout: 20000 });
    const O1 = p1.url().split('/').pop();
    ok(sql(`select count(*) from operations where kind = 'tickets' and client_key = '${H1}'`) === '1', 'doble toque en Pagar: una sola orden (candado del apartado + client_key)');
    ok(sql(`select p.status || '|' || p.amount_cents || '|' || p.fee_cents || '|' || coalesce(p.transfer_group, '') from payments p join operations o on o.id = p.operation_id where o.number = '${O1}'`) === `captured|10200|811|evt-${EV}`,
      'cobrado $102 en la plataforma (transfer_group del evento); comisión 5 % + $1 por boleto y mesa, 5 % del extra = $8.11, del organizador');
    ok(sql(`select status || '|' || captured_cents from sim_intents where id = (select stripe_payment_intent from payments p join operations o on o.id = p.operation_id where o.number = '${O1}')`) === 'succeeded|10200', 'el simulador capturó exactamente el total (sin comisión de destino)');
    ok(sql(`select string_agg(admits || ':' || price_cents || ':' || fee_cents || ':' || discount_cents, ',' order by id) from tickets where operation_id = (select id from operations where number = '${O1}')`) === '1:1350:168:150,1:1350:168:150,4:4000:300:0', 'boletos con lo pagado, su comisión y su parte del descuento; la mesa es un QR de 4 entradas');
    ok(sql(`select sold_n || '|' || held_n from ticket_stock where ticket_type_id = ${T_GEN}`) === '2|0' && sql(`select sold_n from event_dates where id = ${F}`) === '3' && sql(`select used_n || '|' || held_n from discount_codes where code = 'UNAVEZ' and event_id = ${EV}`) === '1|0', 'apartado → vendido; sold_n de la fecha lo lleva la base; el código cuenta un uso');
    ok(await contiene(p1, '¡Listo, vas!') && await contiene(p1, 'MUÉSTRALO EN LA PUERTA · SUBE EL BRILLO') && await contiene(p1, 'MARISOL P'), 'APP-EVT-ORDEN: «¡Listo, vas!», «MUÉSTRALO EN LA PUERTA», el nombre en el boleto');
    const CODS = sql(`select string_agg(code, ',' order by id) from tickets where operation_id = (select id from operations where number = '${O1}')`).split(',');
    const QR1 = await leerQR(p1, `[data-boleto="${CODS[0]}"]`);
    ok(QR1 && /^TL1\.[a-f0-9]{8}\.\d+\.\d+\.1\.1\./.test(QR1), `el QR de la pantalla es real: jsQR lo lee (${QR1 && QR1.slice(0, 30)}…)`);
    ok(firmaBuena(QR1), 'la firma Ed25519 del QR se verifica con la llave PÚBLICA de qr_keys (como la puerta sin conexión)');
    ok(!/Marisol|5705550122|@/.test(QR1), 'el QR no lleva datos personales');
    ok(sql(`select count(*) from qr_keys`) >= '1' && !/priv/i.test(sql(`select string_agg(column_name, ',') from information_schema.columns where table_name = 'qr_keys'`)), 'la base solo guarda la llave pública');
    await clic(p1.locator('button, [role="button"]', { hasText: 'Recibo' }));
    ok(await contiene(p1, 'Cargos de servicio') && await contiene(p1, 'Incluidos') && await contiene(p1, 'TOTAL PAGADO'), 'el recibo: «Cargos de servicio · Incluidos»');
    await p1.screenshot({ path: OUT + 'e6c-orden-m.png', fullPage: true });
    ok(sql(`select count(*) from notifications where tpl = 'bol_comprado' and ref_id = '${O1}' and user_id = '${uid(C1)}'`) === '1' && sql(`select count(*) from notifications where tpl = 'evt_venta' and ref_id = '${O1}'`) >= '1', 'avisos: «Tus boletos…» al comprador y «Vendiste boletos» al negocio (en la app, sin SMS)');
    // ── 3 · Mis boletos y el boleto ──
    await p1.goto(B + '/cuenta/boletos');
    ok(await contiene(p1, 'Noche de boletos') && await contiene(p1, 'CON QR'), 'Mi cuenta › Boletos: Próximos con «CON QR»');
    await p1.screenshot({ path: OUT + 'e6c-mis-m.png', fullPage: true });
    await p1.goto(B + `/cuenta/boletos/${CODS[2]}`);
    ok(await contiene(p1, 'Si no hay señal, el código funciona igual.') && await contiene(p1, '4 entradas'), 'USR-BOLETO: el QR grande de la mesa (4 entradas)');
    const QRM = await leerQR(p1, `[data-pantalla="USR-BOLETO"]`); ok(QRM && /\.1\.4\.[A-Za-z0-9_-]{86}$/.test(QRM) && firmaBuena(QRM), 'el QR de la mesa: versión 1, 4 entradas, firma buena');
    await p1.screenshot({ path: OUT + 'e6c-boleto-m.png', fullPage: true });
    // ── 4 · Otra cuenta no ve lo de la primera (IDOR) ──
    const c2 = await ctx(390, 844, true), p2 = await c2.newPage();
    await entrar(p2, C2); tarjeta(C2, '4242');
    for (const u of [`/eventos/orden/${O1}`, `/cuenta/boletos/${CODS[0]}`, `/eventos/pagar/${H1}`]) { const r = await p2.goto(B + u); ok(r.status() === 404, `otra cuenta no abre ${u.split('/').slice(0, 3).join('/')}/… (404)`); }
    await p2.goto(B + '/cuenta/boletos'); ok(!(await texto(p2)).includes(RUN), 'otra cuenta no ve los boletos de la primera en Mis boletos');
    // ── 5 · Código: tope y una vez por persona ──
    await p2.goto(B + `/eventos/${SLUG}/boletos?fecha=${F}`);
    await clic(p2.locator(`[data-tipo="${T_GEN}"] >> text="+"`));
    await p2.fill('input[aria-label="Código de descuento"]', 'UNAVEZ'); await clic(p2.locator('button, [role="button"]', { hasText: 'Aplicar' }));
    ok(await contiene(p2, 'Ese código ya se usó todas las veces.'), 'código hasta su tope: «Ese código ya se usó todas las veces.»');
    // ── 6 · El apartado vence (reloj movido) y lo suelta el barrido; «Se acabaron mientras pagabas» ──
    await p2.fill('input[aria-label="Código de descuento"]', '');
    await clic(p2.locator('button, [role="button"]', { hasText: 'Continuar' })); await p2.waitForURL(/\/eventos\/pagar\//);
    const H2 = p2.url().split('/').pop();
    ok(sql(`select held_n from ticket_stock where ticket_type_id = ${T_GEN}`) === '1', 'C2 aparta el último general (held_n = 1)');
    sql(`update ticket_holds set expires_at = now() - interval '1 minute' where id = '${H2}'`);
    barrido();
    ok(sql(`select status from ticket_holds where id = '${H2}'`) === 'expired' && sql(`select held_n from ticket_stock where ticket_type_id = ${T_GEN}`) === '0', 'el barrido vence el apartado y la existencia vuelve (reloj movido 8 min)');
    // Otra persona se lleva el último mientras C2 «pagaba».
    const c3 = await ctx(390, 844, true), p3 = await c3.newPage();
    await entrar(p3, C3); tarjeta(C3, '0002');
    await p3.goto(B + `/eventos/${SLUG}/boletos?fecha=${F}`); await clic(p3.locator(`[data-tipo="${T_GEN}"] >> text="+"`));
    await clic(p3.locator('button, [role="button"]', { hasText: 'Continuar' })); await p3.waitForURL(/\/eventos\/pagar\//);
    const H3 = p3.url().split('/').pop();
    await clic(p2.locator('button, [role="button"]', { hasText: /^Pagar/ }));
    ok(await contiene(p2, 'Se acabaron mientras pagabas. No se cobró nada.'), '«Se acabaron mientras pagabas. No se cobró nada.» (se intentó apartar otra vez y no había)');
    ok(sql(`select count(*) from sim_intents where id like 'pi_sim_${H2}%'`) === '0', 'a C2 no se le autorizó nada');
    await p2.screenshot({ path: OUT + 'e6c-pago-agotado-m.png', fullPage: true });
    // ── 7 · Tarjeta 0002: no se cobra y siguen guardados; luego 4242 ──
    await clic(p3.locator('button, [role="button"]', { hasText: /^Pagar \$15$/ }));
    ok(await contiene(p3, 'No se cobró nada y tus boletos siguen guardados.'), 'tarjeta rechazada (0002): «No se cobró nada y tus boletos siguen guardados.»');
    ok(sql(`select status from ticket_holds where id = '${H3}'`) === 'held' && sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.client_key = '${H3}'`) === '0', 'el apartado sigue vivo y no hay cobro ni orden');
    await p3.screenshot({ path: OUT + 'e6c-pago-rechazada-m.png', fullPage: true });
    tarjeta(C3, '4242'); await p3.reload();
    await clic(p3.locator('button, [role="button"]', { hasText: /^Pagar \$15$/ })); await p3.waitForURL(/\/eventos\/orden\/B-/, { timeout: 20000 });
    ok(sql(`select sold_n || '|' || held_n || '|' || quantity from ticket_stock where ticket_type_id = ${T_GEN}`) === '3|0|3', 'con 4242 se cobra: los 3 generales vendidos, ninguno de más');
    // ── 8 · El último boleto: 3 compradores a la vez → uno gana ──
    const ps = [p1, p2, p3];
    for (const p of ps) { await p.goto(B + `/eventos/${SLUG}/boletos?fecha=${F}`); await clic(p.locator(`[data-tipo="${T_ULT}"] >> text="+"`)); }
    await Promise.all(ps.map(async (p) => (await vis(p.locator('button, [role="button"]', { hasText: 'Continuar' }))).click()));
    await sleep(4000);
    const ganan = ps.filter((p) => /\/eventos\/pagar\//.test(p.url()));
    ok(ganan.length === 1, `3 a la vez por el último boleto: uno lo aparta (${ganan.length})`);
    const pierden = ps.filter((p) => !/\/eventos\/pagar\//.test(p.url()));
    ok((await Promise.all(pierden.map((p) => contiene(p, 'agotado', 4000)))).every(Boolean), 'los otros dos ven «agotado» (nada se apartó)');
    ok(sql(`select sold_n + held_n || '|' || quantity from ticket_stock where ticket_type_id = ${T_ULT}`) === '1|1', 'la base: apartados + vendidos = 1 de 1');
    await clic(ganan[0].locator('button, [role="button"]', { hasText: /^Pagar \$20$/ })); await ganan[0].waitForURL(/\/eventos\/orden\/B-/, { timeout: 20000 });
    // ── 9 · Agotado ──
    await p2.goto(B + `/eventos/${SLUG}?fecha=${F}`);
    ok(await contiene(p2, 'AGOTADO'), 'la ficha dice AGOTADO en los boletos vendidos');
    // ── 10 · 10 a la vez en la base por 1 lugar: nunca de más (el check y el update condicional) ──
    sql(`update ticket_stock set quantity = quantity + 1 where ticket_type_id = ${T_ULT}`);
    const r10 = await Promise.all(Array.from({ length: 10 }, () => sqlA(`update ticket_stock set held_n = held_n + 1 where ticket_type_id = ${T_ULT} and event_date_id = ${F} and sold_n + held_n + 1 <= quantity`)));
    ok(r10.filter((x) => x === '' || x === 'UPDATE 1').length >= 1 && sql(`select sold_n + held_n || '|' || quantity from ticket_stock where ticket_type_id = ${T_ULT}`) === '2|2', '10 apartados a la vez en la base por 1 lugar: entra 1 (sold + held = quantity)');
    ok(/violates check constraint/.test(await sqlA(`update ticket_stock set held_n = held_n + 1 where ticket_type_id = ${T_ULT}`)), 'aun sin la condición, el check de la tabla rechaza vender de más');
    sql(`update ticket_stock set held_n = held_n - 1 where ticket_type_id = ${T_ULT}`); sql(`update ticket_stock set quantity = quantity - 1 where ticket_type_id = ${T_ULT}`);
    // ── 11 · Código una vez por persona; tope por orden (Configuración) ──
    sql(`update ticket_stock set quantity = 6 where ticket_type_id = ${T_GEN}`);
    await p1.goto(B + `/eventos/${SLUG}/boletos?fecha=${F}`); await clic(p1.locator(`[data-tipo="${T_GEN}"] >> text="+"`));
    await p1.fill('input[aria-label="Código de descuento"]', 'DOSVECES'); await clic(p1.locator('button, [role="button"]', { hasText: 'Aplicar' })); ok(await contiene(p1, 'CÓDIGO APLICADO · −$3'), 'código de monto fijo: −$3');
    await clic(p1.locator('button, [role="button"]', { hasText: 'Continuar' })); await p1.waitForURL(/\/eventos\/pagar\//); await clic(p1.locator('button, [role="button"]', { hasText: /^Pagar \$12$/ })); await p1.waitForURL(/\/eventos\/orden\/B-/, { timeout: 20000 });
    await p1.goto(B + `/eventos/${SLUG}/boletos?fecha=${F}`); await clic(p1.locator(`[data-tipo="${T_GEN}"] >> text="+"`));
    await p1.fill('input[aria-label="Código de descuento"]', 'DOSVECES'); await clic(p1.locator('button, [role="button"]', { hasText: 'Aplicar' }));
    ok(await contiene(p1, 'Ya usaste ese código en este evento.'), 'el mismo código no se aplica dos veces a la misma persona');
    sql(`insert into platform_config (key, value) values ('evt_boletos_por_orden_max', '1'::jsonb) on conflict (key) do update set value = excluded.value`);
    await sleep(16000);
    await p1.goto(B + `/eventos/${SLUG}/boletos?fecha=${F}`); await clic(p1.locator(`[data-tipo="${T_GEN}"] >> text="+"`)); await clic(p1.locator(`[data-tipo="${T_GEN}"] >> text="+"`));
    ok(await contiene(p1, 'MÁX. 1 POR PERSONA'), 'el tope por orden sale de Configuración (evt_boletos_por_orden_max = 1)');
    sql(`delete from platform_config where key = 'evt_boletos_por_orden_max'`);
    // ── 12 · Cobros apagado y Free bloquean la venta ──
    sql(`update stripe_accounts set charges_enabled = false where business_id = '${NEG}'`);
    await p2.goto(B + `/eventos/${SLUG}?fecha=${F}`);
    ok(await contiene(p2, 'Venta no disponible'), 'Cobros apagado: la ficha dice «Venta no disponible»');
    await p2.goto(B + `/eventos/${SLUG}/boletos?fecha=${F}`); ok(!/\/boletos/.test(new URL(p2.url()).pathname), 'Cobros apagado: la pantalla de boletos manda de vuelta a la ficha');
    sql(`update stripe_accounts set charges_enabled = true where business_id = '${NEG}'`);
    sql(`update business_stats_cache set plan = 'free' where business_id = '${NEG}'`);
    await p2.goto(B + `/eventos/${SLUG}?fecha=${F}`); ok(await contiene(p2, 'Venta no disponible') && await contiene(p2, 'todavía no vende boletos en To'), 'Free: la venta de boletos es Pro (§6 #5)');
    sql(`update business_stats_cache set plan = 'pro' where business_id = '${NEG}'`);
    await p2.goto(B + `/eventos/${SLUG}?fecha=${F}`); ok(await contiene(p2, 'Boletos'), 'de vuelta en Pro con Cobros: vende otra vez');
    // ── 13 · Panel (dueño de La Terraza) ──
    for (const [w, h, s] of [[390, 844, 'm'], [1360, 900, 'd']]) {
      const cp = await ctx(w, h, s === 'm'), pp = await cp.newPage();
      await entrar(pp, TERRAZA); await pp.goto(B + `/panel/${NEG}/eventos?det=evt:${EV}`);
      ok(await contiene(pp, 'VENDIDO') && await contiene(pp, 'COMPRADORES') && await contiene(pp, 'Marisol P') && await contiene(pp, 'A TU BANCO EL MARTES DESPUÉS DEL EVENTO'), `panel (${s}): VENDIDO, compradores con nombre + inicial y «Te llega · el martes después del evento»`);
      ok(!(await texto(pp)).includes('5705550122') && !(await texto(pp)).includes('570-555-0122'), `panel (${s}): sin teléfonos de compradores`);
      if (s === 'm') {
        await pp.fill('input[aria-label="CÓDIGO"]', 'PANEL20'); await clic(pp.locator('button, [role="button"]', { hasText: 'Crear código' }));
        ok(await espera(() => sql(`select count(*) from discount_codes where event_id = ${EV} and code = 'PANEL20'`) === '1'), 'panel: crear un código de descuento');
      }
      await pp.screenshot({ path: OUT + `e6c-panel-${s}.png`, fullPage: true });
      await cp.close();
    }
    // ── 14 · Super Admin: Buscar boleto, QR, Reemitir, ficha del evento, Transacciones ──
    for (const [w, h, s] of [[390, 844, 'm'], [1360, 900, 'd']]) {
      const ca = await ctx(w, h, s === 'm'), pa = await ca.newPage();
      await entrar(pa, ADM);
      await pa.goto(B + `/admin/eventos?tab=bol&q=${encodeURIComponent(QR1)}`);
      if (!(await contiene(pa, 'versión vigente del boleto: entra', 8000))) console.log('DBG', (await texto(pa)).slice(0, 700), sql(`select status, qr_ver from tickets where code = '${CODS[0]}'`));
      ok(await contiene(pa, 'FIRMA VÁLIDA') && await contiene(pa, 'versión vigente del boleto: entra'), `admin (${s}): Buscar boleto con el texto del QR → FIRMA VÁLIDA, entra`);
      const malo = QR1.replace(/\.(\d+)\.(\d+)\.1\.1\./, (m, a, b) => `.${Number(a) + 1}.${b}.1.1.`);
      await pa.goto(B + `/admin/eventos?tab=bol&q=${encodeURIComponent(malo)}`);
      ok(await contiene(pa, 'FIRMA NO VÁLIDA'), `admin (${s}): un QR alterado (otro boleto con la firma vieja) → FIRMA NO VÁLIDA`);
      await pa.goto(B + `/admin/eventos?tab=bol&q=${CODS[0]}`);
      ok(await contiene(pa, CODS[0]) && await contiene(pa, 'VÁLIDO'), `admin (${s}): Buscar boleto por código`);
      await pa.screenshot({ path: OUT + `e6c-admin-buscar-${s}.png`, fullPage: true });
      await pa.goto(B + `/admin/eventos/boleto/${CODS[0]}`);
      ok(await contiene(pa, 'Emitido al pagar') && await contiene(pa, 'SIMULADO'), `admin (${s}): el boleto con su línea de tiempo y el pago simulado`);
      if (s === 'd') {
        await clic(pa.locator('button, [role="button"]', { hasText: 'Reemitir' }));
        await clic(pa.locator('button, [role="button"]', { hasText: 'Perdió el teléfono' }));
        await clic(pa.locator('button, [role="button"]', { hasText: /^(Confirmar|Reemitir)$/ }).last());
        ok(await espera(() => sql(`select qr_ver from tickets where code = '${CODS[0]}'`) === '2'), 'Reemitir sube qr_ver (2) con motivo y auditoría');
        ok(sql(`select count(*) from audit_entries where action = 'boleto.reemitir' and target_id = '${CODS[0]}'`) === '1' && sql(`select count(*) from notifications where tpl = 'bol_reemitido' and user_id = '${uid(C1)}'`) >= '1', 'queda en la auditoría y la persona recibe el aviso');
        await pa.goto(B + `/admin/eventos?tab=bol&q=${encodeURIComponent(QR1)}`);
        ok(await contiene(pa, 'QR viejo'), 'el QR anterior: firma buena pero versión vieja → no entra');
        await pa.screenshot({ path: OUT + `e6c-admin-boleto-${s}.png`, fullPage: true });
        await pa.goto(B + `/admin/eventos/${EV}`); ok(await contiene(pa, 'VENDIDOS') && await contiene(pa, 'ÚLTIMAS ÓRDENES') && await contiene(pa, O1), 'admin: la ficha del evento con VENDIDOS · BRUTO · COMISIÓN · DEVUELTOS y las órdenes');
        await pa.goto(B + `/admin/transacciones?tab=bol`); ok(await contiene(pa, `Boletos ${O1}`), 'Transacciones › Boletos: la orden B-');
      }
      await ca.close();
    }
    // El boleto reemitido: Mi cuenta muestra el QR nuevo (versión 2), que sí se verifica.
    await p1.goto(B + `/cuenta/boletos/${CODS[0]}`); const QR2 = await leerQR(p1, `[data-pantalla="USR-BOLETO"]`);
    ok(QR2 && QR2 !== QR1 && /\.2\.1\.[A-Za-z0-9_-]{86}$/.test(QR2) && firmaBuena(QR2), 'Mi cuenta muestra el QR nuevo (versión 2), firmado');
    // ── 15 · Escritorio: la compra completa en 1360 ──
    sql(`update ticket_stock set quantity = 8 where ticket_type_id = ${T_GEN}`);
    const cd = await ctx(1360, 900), pd = await cd.newPage(); await entrar(pd, C2);
    await pd.goto(B + `/eventos/${SLUG}?fecha=${F}`); await pd.screenshot({ path: OUT + 'e6c-ficha-d.png', fullPage: true });
    await pd.goto(B + `/eventos/${SLUG}/boletos?fecha=${F}`); await clic(pd.locator(`[data-tipo="${T_GEN}"] >> text="+"`)); await pd.screenshot({ path: OUT + 'e6c-boletos-d.png', fullPage: true });
    await clic(pd.locator('button, [role="button"]', { hasText: 'Continuar' })); await pd.waitForURL(/\/eventos\/pagar\//); await pd.screenshot({ path: OUT + 'e6c-pago-d.png', fullPage: true });
    await clic(pd.locator('button, [role="button"]', { hasText: /^Pagar \$15$/ })); await pd.waitForURL(/\/eventos\/orden\/B-/, { timeout: 20000 });
    ok(await contiene(pd, '¡Listo, vas!'), 'escritorio: compra completa');
    await pd.screenshot({ path: OUT + 'e6c-orden-d.png', fullPage: true });
    await pd.goto(B + '/cuenta/boletos'); await pd.screenshot({ path: OUT + 'e6c-mis-d.png', fullPage: true });
    const cdg = sql(`select t.code from tickets t join operations o on o.id = t.operation_id where o.user_id = '${uid(C2)}' and t.event_id = ${EV} order by t.id desc limit 1`);
    await pd.goto(B + `/cuenta/boletos/${cdg}`); await pd.screenshot({ path: OUT + 'e6c-boleto-d.png', fullPage: true });
    // ── 16 · Una compra cortada entre la orden y la captura la repara el barrido ──
    const opCortada = sql(`select o.id from operations o where o.user_id = '${uid(C2)}' and o.kind = 'tickets' order by o.id desc limit 1`);
    sql(`update payments set status = 'held', captured_at = null, held_at = now() - interval '5 minutes' where operation_id = ${opCortada}`); sql(`update sim_intents set status = 'requires_capture', captured_cents = 0 where id = (select stripe_payment_intent from payments where operation_id = ${opCortada})`);
    barrido();
    ok(sql(`select status from payments where operation_id = ${opCortada}`) === 'captured', 'barrido: una orden con boletos y el cobro sin capturar se captura (repararBoletos)');
    console.log(`\n${n} ✓ · evt6c`);
  } finally {
    limpiar();
    await br.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
