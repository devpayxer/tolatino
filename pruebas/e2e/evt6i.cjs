// 6i · Evento privado de punta a punta contra el simulador (teléfono 390 para el cliente; panel y Super Admin 1360):
// ajustes del panel → Reservar «9+» → Pedir evento privado (3 pasos, nada se cobra; nota con teléfono rechazada) → el restaurante manda su
// propuesta (la base calcula total, impuesto y depósito) → el cliente pide un cambio (va a Mensajes con el número) → propuesta nueva (la vieja ya
// no se acepta: pantalla vieja y la base) → 0002 (no se cobra, la propuesta sigue) → 4242 con doble toque en dos pestañas (un solo cobro) →
// cambio de un evento confirmado (sin cobro) → cancelar a 73 h (devuelto completo) · a 71 h (se queda con el restaurante) · el restaurante cancela
// (devolución completa) · propuesta vencida rechazada (pantalla y base) · «No puedo» y sin respuesta (barrido) · IDOR con otra cuenta y con el dueño
// de otro negocio (cada llamada nueva repetida) · otro restaurante (El Fogón) que Sabor no ve · Super Admin › Transacciones › Evento privado ·
// Mi cuenta · Configuración. Deja los datos como estaban (solicitudes de prueba cerradas, avisos y ajustes restaurados).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9b-1 · El SMS que se espera sale de la regla del servidor (de noche, lo que no es crítico espera: «silencio»).
const { smsEsperado } = require('../lib/negocio-nuevo.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const crypto = require('crypto');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const llenar = async (l, v) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.fill(v); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => { const x = await texto(p); return t instanceof RegExp ? t.test(x) : x.includes(t); }, ms);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrido = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const esperaV = async (f, v, ms = 12000) => { let x; const t = Date.now(); while (Date.now() - t < ms) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 300)); } return x; };
const RUN = Date.now().toString(36);
const C1 = '5705550122', C2 = '5705550299', PEDRO = '5705550133', JUAN = '5705550444', ADM = '5705550199', SAB = 'sabor-dominicano', FOG = 'el-fogon';
const btn = (p, t) => p.getByRole('button', { name: t });
const acciones = [];
const espiar = (p) => p.on('request', (r) => { const a = r.headers()['next-action']; if (a && r.method() === 'POST') acciones.push({ url: r.url(), a, body: r.postData() || '' }); });
const accion = (re) => [...acciones].reverse().find((x) => re.test(x.body));
const repetir = async (ctx, cap, body) => (await (await ctx.request.post(cap.url, { headers: { 'next-action': cap.a, 'content-type': 'text/plain;charset=UTF-8', origin: B, accept: 'text/x-component' }, data: body ?? cap.body })).text());
const pago = (num) => sql(`select p.status || '|' || p.amount_cents || '|' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${num}' and p.kind = 'deposit'`);
const op = (num) => sql(`select status || '|' || coalesce(status_detail, '') from operations where number = '${num}'`);

(async () => {
  const U1 = uid(C1), U2 = uid(C2), UP = uid(PEDRO);
  const PREFS = Object.fromEntries([U1, U2].map((u) => [u, sql(`select notif_prefs::text from users where id = '${u}'`)]));
  const AJ0 = sql(`select row_to_json(s)::text from private_event_settings s where business_id = '${SAB}'`);
  const limpiar = () => {
    sql(`update operations set status = 'cancelled', status_detail = null, cancelled_by = 'system', cancelled_at = now(), cancel_reason = 'prueba', respond_by = null where kind = 'private_event' and user_id in ('${U1}', '${U2}') and status in ('pending', 'change_proposed', 'confirmed')`);
  };
  limpiar();
  for (const u of Object.keys(PREFS)) sql(`update users set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || '{"quiet": false}'::jsonb where id = '${u}'`);
  sql(`update private_event_settings set is_on = true, min_party = 9, capacity = 40, lead_days = 3, deposit_pct = 25, areas = array['salon','terraza'], whole_cents = 25000 where business_id = '${SAB}'`);
  sql(`update private_event_settings set is_on = true where business_id = '${FOG}'`);
  const tarjeta = (u, l4) => { sql(`update payment_methods set is_default = false where user_id = '${u}'`); sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, status, simulated) values ('${u}', 'pm_sim_visa_${l4}_${crypto.createHash('md5').update(RUN + u + l4).digest('hex').slice(0, 8)}', 'visa', '${l4}', '12/30', true, 'active', true) on conflict (stripe_pm_id) do update set is_default = true, status = 'active'`); };
  const tz = 'America/New_York', hoy = sql(`select (now() at time zone '${tz}')::date::text`), dia = (k) => sql(`select ('${hoy}'::date + ${k})::text`);
  const b = await chromium.launch(); const err = [];
  const nuevo = async (tel, movil) => { const ctx = await b.newContext(movil ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => err.push(e.message)); espiar(p); if (tel) await entrar(p, tel); return { ctx, p }; };
  try {
    // ── 0 · El panel: Reservaciones › Evento privado ──
    const { ctx: cp, p: hp } = await nuevo(PEDRO, false);
    await hp.goto(B + `/panel/${SAB}/vendes/reservaciones`);
    ok(await contiene(hp, 'EVENTO PRIVADO') && await contiene(hp, /Encendido · de 9 a 40 personas/), 'Reservaciones › EVENTO PRIVADO: encendido, de 9 a 40, depósito 25 %');
    await hp.goto(B + `/panel/${SAB}/vendes/reservaciones?det=evp:aj`);
    ok(await contiene(hp, 'Recibir eventos privados') && await contiene(hp, 'MENÚS · PRECIO POR PERSONA') && await contiene(hp, 'ASÍ LO VE EL CLIENTE'), 'ajustes: interruptor, quién puede pedir, áreas, menús, extras y «Así lo ve el cliente»');
    await clic(hp.getByRole('button', { name: '50 %' })); await hp.getByRole('button', { name: 'Guardar' }).last().click(); await contiene(hp, 'Guardado');
    ok(await esperaV(() => sql(`select deposit_pct from private_event_settings where business_id = '${SAB}'`), '50') === '50' && sql(`select count(*) from audit_entries where action = 'evp.ajustes' and target_id = '${SAB}' and at > now() - interval '1 minute'`) !== '0', 'guardar el % de depósito: queda en la base con su auditoría');
    await hp.screenshot({ path: OUT + 'e6i-panel-ajustes-d.png', fullPage: true });
    sql(`update private_event_settings set deposit_pct = 25 where business_id = '${SAB}'`);

    // ── 1 · El cliente: Reservar «9+» → Pedir evento privado (3 pasos) ──
    const { ctx: c1, p: m } = await nuevo(C1, true);
    await m.goto(B + `/n/${SAB}?tab=rsv`);
    await clic(m.getByRole('button', { name: '9+' }));
    ok(await contiene(m, 'Pedir evento privado') && await contiene(m, 'Nada se cobra hasta que aceptes su propuesta.'), 'Reservar con 9+: «Pedir evento privado» (nada se cobra hasta que aceptes)');
    await m.screenshot({ path: OUT + 'e6i-reservar-grupo-m.png', fullPage: true });
    await clic(btn(m, 'Pedir evento privado'));
    await m.waitForURL(/\/evento-privado\?p=9/);
    const pedir = async (pg, { p = 25, dias = 10, hora = '7 PM', nota = '', ext = ['Decoración'], shots = false, slug = SAB }) => {
      await pg.goto(B + `/n/${slug}/evento-privado?p=${p}`); await contiene(pg, '¿QUÉ CELEBRAN?');
      if (shots) await pg.screenshot({ path: OUT + 'e6i-pedir-1-m.png', fullPage: true });
      await clic(btn(pg, 'Cumpleaños')); await clic(btn(pg, 'Continuar'));
      await contiene(pg, '¿QUÉ DÍA?'); await llenar(pg.getByLabel('Otra fecha'), dia(dias));
      await clic(pg.getByRole('radio', { name: hora, exact: true }));
      if (shots) await pg.screenshot({ path: OUT + 'e6i-pedir-2-m.png', fullPage: true });
      await clic(btn(pg, 'Continuar')); await contiene(pg, '¿QUÉ VAN A COMER?');
      for (const e of ext) await clic(pg.getByRole('checkbox', { name: new RegExp(e) }));
      if (nota) await llenar(pg.getByLabel('Algo más'), nota);
      if (shots) await pg.screenshot({ path: OUT + 'e6i-pedir-3-m.png', fullPage: true });
      await clic(btn(pg, 'Enviar solicitud'));
    };
    // Una nota con teléfono no se envía.
    await pedir(m, { nota: 'Llámame al 570-555-0101', shots: true });
    ok(await contiene(m, 'sin teléfonos en la nota'), 'nota con un teléfono: «sin teléfonos en la nota», no se envía');
    await llenar(m.getByLabel('Algo más'), 'Cumpleaños de mi mamá.'); await clic(btn(m, 'Enviar solicitud'));
    await m.waitForURL(/\/privado\/EP-\d+/, { timeout: 20000 }); const E1 = m.url().match(/EP-\d+/)[0];
    ok(await contiene(m, 'PENDIENTE') && await contiene(m, 'No se cobra nada todavía.'), `${E1}: PENDIENTE · «No se cobra nada todavía.»`);
    ok(op(E1) === 'pending|' && sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${E1}'`) === '0' && sql(`select party_size || '|' || duration_min || '|' || (details->>'occ') from operations where number = '${E1}'`) === '25|180|cumple', 'la base: pendiente, 25 personas, 3 h, sin ningún cobro');
    ok(sql(`select count(*) from notifications n join business_members bm on bm.user_id = n.user_id where bm.business_id = '${SAB}' and n.tpl = 'evp_nueva' and n.ref_id = '${E1}'`) !== '0', 'aviso evp_nueva al restaurante');
    await m.screenshot({ path: OUT + 'e6i-pendiente-m.png', fullPage: true });
    ok(sql(`select number from operations where number = '${E1}'`).startsWith('EP-') && !/^E-/.test(E1), 'número EP- (no choca con E- ni con otro prefijo)');

    // ── 2 · El restaurante manda su propuesta (la base calcula) ──
    await hp.goto(B + `/panel/${SAB}/hoy`);
    ok(await contiene(hp, /EVENTOS PRIVADOS QUE ESPERAN TU RESPUESTA · \d+/) && await contiene(hp, E1), 'panel Hoy: EVENTOS PRIVADOS QUE ESPERAN TU RESPUESTA con la solicitud');
    ok(!/570.?555.?0122|5705550122/.test(await texto(hp)), 'panel Hoy: sin el teléfono del cliente');
    await hp.goto(B + `/panel/${SAB}/hoy?det=evp:${E1}`); await contiene(hp, 'Mandar propuesta');
    ok(!/0122/.test(await texto(hp)), 'detalle del panel: nombre + inicial, sin teléfono del cliente');
    await clic(btn(hp, 'Mandar propuesta'));
    await llenar(hp.getByLabel('QUÉ INCLUYE · EL CLIENTE LO VE'), 'Comida, refrescos, el salón por 3 horas y meseros.');
    await hp.screenshot({ path: OUT + 'e6i-panel-propuesta-d.png', fullPage: true });
    await clic(btn(hp, 'Mandar al cliente')); await contiene(hp, 'ya tiene tu propuesta');
    // 25 × $26 + decoración $80 = $730; impuesto 6 % = $43.80; total $773.80; depósito 25 % = $193.45
    ok(await esperaV(() => sql(`select q.version || '|' || q.subtotal_cents || '|' || q.tax_cents || '|' || q.total_cents || '|' || q.deposit_cents || '|' || q.cancel_h from private_event_quotes q join operations o on o.id = q.operation_id where o.number = '${E1}' order by q.version desc limit 1`), '1|73000|4380|77380|19345|72') === '1|73000|4380|77380|19345|72', 'propuesta v1 calculada por la base: subtotal $730, impuesto $43.80, total $773.80, depósito 25 % $193.45, cancelar gratis 72 h');
    ok(op(E1) === 'change_proposed|quote', 'la solicitud: TE MANDARON SU PROPUESTA');
    ok(sql(`select sms_status from notifications where user_id = '${U1}' and tpl = 'evp_propuesta' and ref_id = '${E1}' order by id desc limit 1`) === smsEsperado('evp_propuesta'), 'aviso evp_propuesta con SMS (modo pruebas)');
    ok(sqlErr(`update private_event_quotes set deposit_cents = 1 where operation_id = (select id from operations where number = '${E1}')`).includes('solo de inserción'), 'la base: una propuesta no se cambia (solo inserción)');
    ok(sqlErr(`insert into private_event_quotes (operation_id, business_id, city_id, version, kind, starts_at, duration_min, party_size, lines, subtotal_cents, tax_bp, tax_cents, total_cents, deposit_pct, deposit_cents, cancel_h, valid_until) select id, business_id, city_id, 1, 'quote', scheduled_at, 180, 25, '[{"l":{"es":"x"},"q":1,"unit":100}]', 0, 0, 0, 0, 0, 0, 0, now() from operations where number = '${E1}'`).includes('nombre'), 'la base: una línea sin nombre no entra');
    await hp.goto(B + `/panel/${SAB}/hoy?det=evp:${E1}`); await contiene(hp, 'TUS PROPUESTAS');

    // ── 3 · El cliente ve la propuesta y pide un cambio (va a Mensajes) ──
    await m.goto(B + `/privado/${E1}`);
    ok(await contiene(m, 'TE MANDARON SU PROPUESTA') && await contiene(m, '$773.80') && await contiene(m, '$193.45') && await contiene(m, 'Lo pagas en el local el día del evento') && await contiene(m, /VÁLIDA \d+ H/), 'cliente: la propuesta con total, depósito, lo que paga en el local y VÁLIDA N H');
    await m.screenshot({ path: OUT + 'e6i-propuesta-m.png', fullPage: true });
    await clic(btn(m, 'Pedir un cambio'));
    await clic(m.getByRole('button', { name: 'Más' })); for (let i = 0; i < 4; i++) await clic(m.getByRole('button', { name: 'Más' }));
    await llenar(m.getByPlaceholder(/somos 30/), 'Somos 30, ¿pueden hacer pollo en vez de cerdo?');
    await m.screenshot({ path: OUT + 'e6i-pedir-cambio-m.png', fullPage: true });
    await clic(btn(m, 'Enviar')); await contiene(m, 'le pediste el cambio');
    ok(op(E1) === 'change_proposed|counter' && sql(`select a.kind || '|' || a.party_size from private_event_asks a join operations o on o.id = a.operation_id where o.number = '${E1}'`) === 'counter|30', 'pedir un cambio: queda en la base (30 personas) y la solicitud dice «PIDE UN CAMBIO»');
    ok(sql(`select t.context->>'es' || '|' || m.body from chat_messages m join chat_threads t on t.id = m.thread_id where t.user_id = '${U1}' and t.business_id = '${SAB}' order by m.id desc limit 1`).startsWith(`Evento privado #${E1}|30 personas. Somos 30`), 'la nota va a Mensajes con el contexto «Evento privado #EP-…»');
    // La pantalla vieja (con la v1) queda abierta en otra pestaña.
    const vieja = await c1.newPage(); espiar(vieja); await vieja.goto(B + `/privado/${E1}`); await contiene(vieja, '$773.80');
    tarjeta(U1, '4242'); await vieja.reload(); await contiene(vieja, 'TARJETA DEL DEPÓSITO');

    // ── 4 · Propuesta nueva (v2): la v1 ya no se acepta ──
    await hp.goto(B + `/panel/${SAB}/hoy?det=evp:${E1}`); await contiene(hp, 'Pide un cambio a tu propuesta');
    await clic(btn(hp, 'Mandar otra propuesta')); await llenar(hp.getByLabel('QUÉ INCLUYE · EL CLIENTE LO VE'), 'Pollo guisado, arroz, habichuelas, refrescos, el salón 3 horas.');
    await clic(btn(hp, 'Mandar al cliente')); await contiene(hp, 'ya tiene tu propuesta');
    // 30 × $26 + $80 = $860; 6 % = $51.60; total $911.60; depósito $227.90
    ok(await esperaV(() => sql(`select q.version || '|' || q.party_size || '|' || q.total_cents || '|' || q.deposit_cents from private_event_quotes q join operations o on o.id = q.operation_id where o.number = '${E1}' order by q.version desc limit 1`), '2|30|91160|22790') === '2|30|91160|22790', 'propuesta v2: 30 personas, total $911.60, depósito $227.90');
    ok(sql(`select string_agg(q.status, ',' order by q.version) from private_event_quotes_ef q join operations o on o.id = q.operation_id where o.number = '${E1}'`) === 'superseded,sent', 'la v1 queda REEMPLAZADA (estado derivado) y la v2 ENVIADA');
    await clic(btn(vieja, /Aceptar y pagar \$193\.45/));
    ok(await contiene(vieja, 'mandó una propuesta nueva') && sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${E1}'`) === '0', 'pantalla vieja: aceptar la v1 → «mandó una propuesta nueva», no se cobra nada');
    ok(sqlErr(`insert into private_event_acceptances (quote_id, operation_id, kind, user_id) select q.id, q.operation_id, 'quote', '${U1}' from private_event_quotes q join operations o on o.id = q.operation_id where o.number = '${E1}' and q.version = 1`).includes('reemplazada'), 'la base: aceptar una versión reemplazada → error');
    await vieja.close();

    // ── 5 · Aceptar con 0002 (no se cobra; la propuesta sigue) y con 4242 en dos pestañas a la vez (un solo cobro) ──
    tarjeta(U1, '0002'); await m.goto(B + `/privado/${E1}`); await contiene(m, '$911.60');
    await clic(btn(m, /Aceptar y pagar \$227\.90/));
    ok(await contiene(m, 'No se cobró nada; la propuesta sigue') && await contiene(m, 'Tu tarjeta fue rechazada. No se cobró nada.'), '0002: «Tu tarjeta fue rechazada. No se cobró nada.» y la propuesta sigue');
    ok(op(E1) === 'change_proposed|quote' && sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${E1}'`) === '0', 'tras 0002: sin pago y la solicitud igual');
    await m.screenshot({ path: OUT + 'e6i-rechazada-m.png', fullPage: true });
    tarjeta(U1, '4242');
    const t2 = await c1.newPage(); espiar(t2);
    await m.goto(B + `/privado/${E1}`); await t2.goto(B + `/privado/${E1}`); await contiene(m, '$911.60'); await contiene(t2, '$911.60');
    const [b1, b2] = [await vis(btn(m, /Aceptar y pagar \$227\.90/)), await vis(btn(t2, /Aceptar y pagar \$227\.90/))];
    await Promise.all([b1.click(), b2.click()]);
    await contiene(m, 'CONFIRMADO', 20000);
    ok(await esperaV(() => pago(E1), 'captured|22790|0', 15000) === 'captured|22790|0', 'aceptar con 4242: depósito $227.90 COBRADO (el de la propuesta guardada)');
    ok(sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${E1}'`) === '1' && sql(`select count(*) from private_event_acceptances a join operations o on o.id = a.operation_id where o.number = '${E1}'`) === '1', 'doble toque en dos pestañas: UN pago y UNA aceptación');
    ok(sql(`select s.status || '|' || s.captured_cents || '|' || s.destination || '|' || s.fee_cents from sim_intents s join payments p on p.stripe_payment_intent = s.id join operations o on o.id = p.operation_id where o.number = '${E1}'`) === `succeeded|22790|acct_sim_${SAB}|1823`, 'el simulador: capturado al restaurante (cuenta conectada) con la comisión evp 8 % ($18.23)');
    ok(op(E1) === 'confirmed|' && sql(`select total_cents || '|' || deposit_cents || '|' || party_size from operations where number = '${E1}'`) === '91160|22790|30', 'la solicitud: CONFIRMADO con el total, el depósito y las personas de la v2');
    ok(sqlErr(`insert into private_event_acceptances (quote_id, operation_id, kind, user_id) select q.id, q.operation_id, 'quote', '${U1}' from private_event_quotes q join operations o on o.id = q.operation_id where o.number = '${E1}' and q.version = 2`).length > 0, 'la base: la misma propuesta no se acepta dos veces');
    ok(sql(`select sms_status from notifications where user_id = '${U1}' and tpl = 'evp_ok' and ref_id = '${E1}' order by id desc limit 1`) === smsEsperado('evp_ok'), 'aviso evp_ok con SMS');
    await t2.close();
    ok(await contiene(m, 'Depósito cobrado: $227.90') && await contiene(m, 'Lo que acordaron'), 'cliente: CONFIRMADO · «Depósito cobrado: $227.90» y lo acordado');
    await m.screenshot({ path: OUT + 'e6i-confirmado-m.png', fullPage: true });

    // ── 6 · Cambio de un evento confirmado (sin cobro) ──
    await clic(btn(m, 'Pedir un cambio')); await clic(m.getByRole('button', { name: 'Más' })); await clic(m.getByRole('button', { name: 'Más' }));
    await llenar(m.getByPlaceholder(/somos 30/), 'Al final somos 32.'); await clic(btn(m, 'Enviar')); await contiene(m, 'le pediste el cambio');
    ok(op(E1) === 'confirmed|change_req', 'cambio pedido a un evento confirmado: sigue confirmado, «PIDE UN CAMBIO»');
    await hp.goto(B + `/panel/${SAB}/hoy?det=evp:${E1}`); await clic(btn(hp, 'Mandar el cambio'));
    await clic(btn(hp, 'Mandar el cambio')); await contiene(hp, 'ya tiene tu propuesta');
    ok(await esperaV(() => sql(`select q.kind || '|' || q.party_size || '|' || q.deposit_cents || '|' || q.total_cents from private_event_quotes q join operations o on o.id = q.operation_id where o.number = '${E1}' order by q.version desc limit 1`), 'change|32|22790|96672') === 'change|32|22790|96672', 'el cambio v3: 32 personas, total $966.72, depósito = lo ya pagado ($227.90)');
    await m.goto(B + `/privado/${E1}`); ok(await contiene(m, 'El cambio que te manda') && await contiene(m, 'Depósito ya pagado'), 'cliente: «El cambio que te manda…» con el depósito ya pagado');
    await m.screenshot({ path: OUT + 'e6i-cambio-m.png', fullPage: true });
    await clic(btn(m, 'Aceptar el cambio')); await contiene(m, 'quedó con el cambio');
    ok(op(E1) === 'confirmed|' && sql(`select total_cents || '|' || party_size from operations where number = '${E1}'`) === '96672|32' && pago(E1) === 'captured|22790|0' && sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${E1}'`) === '1', 'aceptar el cambio: total y personas nuevos, el mismo pago (no se cobra otra vez)');

    // ── 7 · Cancelar a 73 h: devolución completa ──
    sql(`update operations set scheduled_at = now() + interval '73 hours' where number = '${E1}'`);
    await m.goto(B + `/privado/${E1}`); await clic(btn(m, 'Cancelar el evento'));
    ok(await contiene(m, 'Faltan más de 72 h: te devolvemos $227.90'), 'cancelar a 73 h: «Faltan más de 72 h: te devolvemos $227.90»');
    await m.screenshot({ path: OUT + 'e6i-cancelar-m.png', fullPage: true });
    await clic(btn(m, 'Sí, cancelar')); await contiene(m, 'CANCELADO');
    ok(await esperaV(() => pago(E1), 'refunded|22790|22790') === 'refunded|22790|22790' && sql(`select count(*) || '|' || sum(r.amount_cents) from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${E1}'`) === '1|22790', 'a 73 h: UNA devolución de $227.90 (todo lo cobrado)');
    ok(sql(`select s.refunded_cents from sim_intents s join payments p on p.stripe_payment_intent = s.id join operations o on o.id = p.operation_id where o.number = '${E1}'`) === '22790', 'el simulador registra la devolución de $227.90');
    barrido(); barrido();
    ok(sql(`select count(*) from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${E1}'`) === '1', 'dos barridos después: sigue UNA devolución (llave fija)');

    // ── 8 · Una solicitud confirmada para cancelar a 71 h (se queda) ──
    const confirmada = async (pg, tel, u, nota) => {
      await pedir(pg, { p: 20, dias: 12, hora: '1 PM', ext: [], nota });
      await pg.waitForURL(/\/privado\/EP-\d+/, { timeout: 20000 }); const E = pg.url().match(/EP-\d+/)[0];
      await hp.goto(B + `/panel/${SAB}/hoy?det=evp:${E}`); await clic(btn(hp, 'Mandar propuesta'));
      await llenar(hp.getByLabel('QUÉ INCLUYE · EL CLIENTE LO VE'), 'Buffet, refrescos y el salón.'); await clic(btn(hp, 'Mandar al cliente')); await contiene(hp, 'ya tiene tu propuesta');
      tarjeta(u, '4242'); await pg.goto(B + `/privado/${E}`); await clic(btn(pg, /Aceptar y pagar/)); await contiene(pg, 'CONFIRMADO', 20000);
      await esperaV(() => pago(E).split('|')[0], 'captured'); return E;
    };
    const E2 = await confirmada(m, C1, U1, '');
    const dep2 = Number(pago(E2).split('|')[1]);
    sql(`update operations set scheduled_at = now() + interval '71 hours' where number = '${E2}'`);
    await m.goto(B + `/privado/${E2}`); await clic(btn(m, 'Cancelar el evento'));
    ok(await contiene(m, 'Faltan menos de 72 h: el depósito de'), 'cancelar a 71 h: «Faltan menos de 72 h: el depósito … se queda con …»');
    await clic(btn(m, 'Sí, cancelar')); await contiene(m, 'CANCELADO');
    ok(await esperaV(() => pago(E2), `captured|${dep2}|0`) === `captured|${dep2}|0` && sql(`select (details->>'perdio') || '|' || cancel_reason from operations where number = '${E2}'`) === 'true|tarde', 'a 71 h: sin devolución, el depósito se queda con el restaurante');
    ok(await contiene(m, 'El depósito se quedó con Sabor Dominicano'), 'cliente: «El depósito se quedó con …»');

    // ── 9 · El restaurante cancela: devolución completa (y la regla del cliente no aplica) ──
    const { ctx: c2, p: m2 } = await nuevo(C2, true);
    const E3 = await confirmada(m2, C2, U2, '');
    const dep3 = Number(pago(E3).split('|')[1]);
    sql(`update operations set scheduled_at = now() + interval '20 hours' where number = '${E3}'`);
    await hp.goto(B + `/panel/${SAB}/hoy?det=evp:${E3}`); await clic(btn(hp, 'Cancelar el evento'));
    await llenar(hp.getByLabel('MOTIVO'), 'Se nos dañó la cocina.');
    await hp.screenshot({ path: OUT + 'e6i-panel-cancelar-d.png', fullPage: true });
    await clic(btn(hp, 'Sí, cancelar y devolver')); await contiene(hp, 'recibe su depósito completo');
    ok(await esperaV(() => pago(E3), `refunded|${dep3}|${dep3}`) === `refunded|${dep3}|${dep3}` && sql(`select r.initiated_by from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${E3}'`) === 'business', 'el restaurante cancela a 20 h: devolución COMPLETA (initiated_by business)');
    ok(sql(`select sms_status from notifications where user_id = '${U2}' and tpl = 'evp_cancelado_negocio' and ref_id = '${E3}'`) === smsEsperado('evp_cancelado_negocio'), 'aviso evp_cancelado_negocio con SMS');
    await m2.goto(B + `/privado/${E3}`); ok(await contiene(m2, 'canceló el evento') && await contiene(m2, 'Se nos dañó la cocina.'), 'cliente: «… canceló el evento» con el motivo');

    // ── 10 · Propuesta vencida: la pantalla y la base la rechazan ──
    await pedir(m2, { p: 15, dias: 9, hora: '7 PM', ext: [] }); await m2.waitForURL(/\/privado\/EP-\d+/, { timeout: 20000 }); const E4 = m2.url().match(/EP-\d+/)[0];
    sql(`update operations set scheduled_at = now() + interval '50 seconds' where number = '${E4}'`); // la propuesta vale hasta el evento (nunca después)
    await hp.goto(B + `/panel/${SAB}/hoy?det=evp:${E4}`); await clic(btn(hp, 'Mandar propuesta'));
    await llenar(hp.getByLabel('QUÉ INCLUYE · EL CLIENTE LO VE'), 'Buffet y refrescos.'); await clic(btn(hp, 'Mandar al cliente')); await contiene(hp, 'ya tiene tu propuesta');
    tarjeta(U2, '4242'); await m2.goto(B + `/privado/${E4}`); await contiene(m2, 'TE MANDARON SU PROPUESTA');
    await new Promise((r) => setTimeout(r, 52000));
    await clic(btn(m2, /Aceptar y pagar/));
    ok(await contiene(m2, 'ya venció') && sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${E4}'`) === '0', 'propuesta vencida: «ya venció», no se cobra nada');
    ok(sqlErr(`insert into private_event_acceptances (quote_id, operation_id, kind, user_id) select q.id, q.operation_id, 'quote', '${U2}' from private_event_quotes q join operations o on o.id = q.operation_id where o.number = '${E4}'`).includes('venció'), 'la base: aceptar una propuesta vencida → error');
    barrido();
    ok(op(E4) === 'expired|propuesta_vencida', 'el barrido: LA PROPUESTA VENCIÓ (sin cobro)');

    // ── 11 · «No puedo» y sin respuesta ──
    await pedir(m2, { p: 12, dias: 11, hora: '1 PM', ext: [] }); await m2.waitForURL(/\/privado\/EP-\d+/, { timeout: 20000 }); const E5 = m2.url().match(/EP-\d+/)[0];
    // Proponer otra fecha (la misma propuesta para otro día y hora, con el porqué).
    await hp.goto(B + `/panel/${SAB}/hoy?det=evp:${E5}`); await clic(btn(hp, 'Proponer otra fecha'));
    await llenar(hp.getByLabel('FECHA · AAAA-MM-DD'), dia(18)); await clic(hp.getByRole('button', { name: '6 PM', exact: true }));
    await llenar(hp.getByLabel('QUÉ INCLUYE · EL CLIENTE LO VE'), 'Buffet y refrescos.'); await llenar(hp.getByLabel('POR QUÉ OTRA FECHA · EL CLIENTE LO VE'), 'Ese día ya tenemos otro evento.');
    await hp.screenshot({ path: OUT + 'e6i-panel-otra-fecha-d.png', fullPage: true });
    await clic(btn(hp, 'Mandar al cliente')); await contiene(hp, 'ya tiene tu propuesta');
    ok(await esperaV(() => op(E5), 'change_proposed|alt') === 'change_proposed|alt' && sql(`select q.kind || '|' || (q.starts_at at time zone 'America/New_York')::text from private_event_quotes q join operations o on o.id = q.operation_id where o.number = '${E5}'`) === `alt|${dia(18)} 18:00:00`, 'otra fecha: propuesta «alt» para el día y la hora nuevos');
    ok(sql(`select count(*) from notifications where user_id = '${U2}' and tpl = 'evp_otra_fecha' and ref_id = '${E5}'`) === '1', 'aviso evp_otra_fecha');
    await m2.goto(B + `/privado/${E5}`); ok(await contiene(m2, 'TE PROPONEN UN CAMBIO') && await contiene(m2, 'Ese día ya tenemos otro evento.') && await contiene(m2, /Aceptar el \S+ \d+ \S+ y pagar/), 'cliente: TE PROPONEN UN CAMBIO con el porqué y «Aceptar el … y pagar …»');
    await m2.screenshot({ path: OUT + 'e6i-otra-fecha-m.png', fullPage: true });
    await hp.goto(B + `/panel/${SAB}/hoy?det=evp:${E5}`); await clic(hp.getByRole('button', { name: 'No puedo', exact: true }));
    await llenar(hp.getByLabel('MOTIVO · EL CLIENTE LO VE'), 'Ese día ya tenemos otro evento.'); await clic(hp.getByRole('button', { name: 'Mandar', exact: true })); await contiene(hp, 'No se cobró nada');
    await m2.goto(B + `/privado/${E5}`); ok(await contiene(m2, 'NO PUDO') && await contiene(m2, 'Ese día ya tenemos otro evento.') && await contiene(m2, 'OTROS QUE HACEN EVENTOS PRIVADOS'), '«No puedo»: NO PUDO con el motivo y OTROS QUE HACEN EVENTOS PRIVADOS (El Fogón)');
    await m2.screenshot({ path: OUT + 'e6i-no-pudo-m.png', fullPage: true });
    await pedir(m2, { p: 11, dias: 13, hora: '7 PM', ext: [] }); await m2.waitForURL(/\/privado\/EP-\d+/, { timeout: 20000 }); const E6 = m2.url().match(/EP-\d+/)[0];
    sql(`update operations set respond_by = now() - interval '1 minute' where number = '${E6}'`); barrido();
    ok(op(E6) === 'expired|sin_respuesta' && sql(`select count(*) from notifications where user_id = '${U2}' and tpl = 'evp_vence' and ref_id = '${E6}'`) === '1', 'sin respuesta a tiempo: SIN RESPUESTA (barrido) y su aviso');

    // ── 12 · IDOR: otra cuenta y el dueño de otro negocio repiten cada llamada nueva; otro restaurante no se ve ──
    const E7 = await (async () => { await pedir(m, { p: 14, dias: 15, hora: '1 PM', ext: [] }); await m.waitForURL(/\/privado\/EP-\d+/, { timeout: 20000 }); return m.url().match(/EP-\d+/)[0]; })();
    await hp.goto(B + `/panel/${SAB}/hoy?det=evp:${E7}`); await clic(btn(hp, 'Mandar propuesta')); await llenar(hp.getByLabel('QUÉ INCLUYE · EL CLIENTE LO VE'), 'Buffet.'); await clic(btn(hp, 'Mandar al cliente')); await contiene(hp, 'ya tiene tu propuesta');
    for (const u of [`/privado/${E7}`, `/privado/${E7}/ayuda`]) { const r = await m2.goto(B + u); ok(r.status() === 404, `IDOR: otra cuenta no abre ${u} (404)`); }
    const capAcepta = accion(/"EP-\d+",\d+,"pm_sim_/), capCambio = accion(/"nota":"Al final somos 32/), capCx = accion(new RegExp(`"${E2}","cancelar"`));
    ok(!!capAcepta && !!capCambio && !!capCx, 'llamadas del cliente capturadas (aceptar, pedir un cambio, cancelar)');
    const v7 = sql(`select max(q.version) from private_event_quotes q join operations o on o.id = q.operation_id where o.number = '${E7}'`);
    ok(/no existe/.test(await repetir(c2, capAcepta, capAcepta.body.replace(/"EP-\d+",\d+/, `"${E7}",${v7}`))) && sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${E7}'`) === '0', 'IDOR: C2 repite «Aceptar y pagar» con la solicitud de C1 → «no existe», nada se cobra');
    ok(/no existe/.test(await repetir(c2, capCambio, capCambio.body.replace(/"EP-\d+"/, `"${E7}"`))) && op(E7) === 'change_proposed|quote', 'IDOR: C2 repite «Pedir un cambio» → nada cambia');
    ok(!/"ok":true/.test(await repetir(c2, capCx, capCx.body.replace(E2, E7))) && op(E7) === 'change_proposed|quote', 'IDOR: C2 repite «Cancelar» con la solicitud de C1 → nada cambia');
    const capProp = accion(/"Buffet\."/), capNo = accion(/Ese día ya tenemos otro evento/), capCxN = accion(/Se nos dañó la cocina/), capAj = acciones.find((x) => /"depositPct":50/.test(x.body));
    ok(!!capProp && !!capNo && !!capCxN && !!capAj, 'llamadas del panel capturadas (propuesta, no puedo, cancelar, ajustes)');
    const { ctx: cj } = await nuevo(JUAN, false);
    ok(/sin acceso|No tienes acceso/i.test(await repetir(cj, capProp)) && sql(`select count(*) from private_event_quotes q join operations o on o.id = q.operation_id where o.number = '${E7}'`) === v7, 'IDOR: el dueño de otro negocio repite «Mandar propuesta» → sin acceso');
    ok(/acceso/i.test(await repetir(cj, capNo, capNo.body.replace(E5, E7))) && op(E7) === 'change_proposed|quote', 'IDOR: el dueño de otro negocio repite «No puedo» → sin acceso');
    ok(/acceso/i.test(await repetir(cj, capCxN, capCxN.body.replace(E3, E1))) && /acceso/i.test(await repetir(cj, capAj)) && sql(`select deposit_pct from private_event_settings where business_id = '${SAB}'`) === '25', 'IDOR: el dueño de otro negocio repite «Cancelar» y «Guardar ajustes» → sin acceso');
    ok(/acceso/i.test(await repetir(c2, capProp)), 'IDOR: un vecino repite «Mandar propuesta» del panel → sin acceso');
    // Otro restaurante: El Fogón (sin dueño en la semilla). C2 le pide; Sabor no la ve ni la toca.
    await pedir(m2, { p: 20, dias: 14, hora: '7 PM', ext: [], slug: FOG }); await m2.waitForURL(/\/privado\/EP-\d+/, { timeout: 20000 }); const EF = m2.url().match(/EP-\d+/)[0];
    ok(sql(`select business_id from operations where number = '${EF}'`) === FOG, `${EF}: pedida a El Fogón (otro restaurante)`);
    await hp.goto(B + `/panel/${SAB}/hoy?det=evp:${EF}`);
    ok(await contiene(hp, 'Esa solicitud no existe') && !(await texto(hp)).includes(EF + ' ·'), 'IDOR: Sabor abre la solicitud de El Fogón → «Esa solicitud no existe»');
    ok(/no existe/.test(await repetir(cp, capProp, capProp.body.replace(E7, EF))) && sql(`select count(*) from private_event_quotes q join operations o on o.id = q.operation_id where o.number = '${EF}'`) === '0', 'IDOR: Sabor repite «Mandar propuesta» con el número de El Fogón → «no existe»');
    ok(/acceso/i.test(await repetir(cp, capProp, capProp.body.replace(`"${SAB}"`, `"${FOG}"`).replace(E7, EF))), 'IDOR: Sabor repite con el negocio El Fogón → sin acceso');

    // ── 13 · Mi cuenta, ayuda, Super Admin, Configuración ──
    await m.goto(B + '/cuenta/citas?f=past'); ok(await contiene(m, 'EVENTO PRIVADO'), 'Mi cuenta › Citas y reservas: el evento privado (lleva a /privado)');
    const { p: ap } = await nuevo(ADM, false);
    await ap.goto(B + '/admin/transacciones?tab=evp');
    ok(await contiene(ap, `Evento privado ${E1}`) && await contiene(ap, 'aceptó la v'), 'Super Admin › Transacciones › Evento privado: la solicitud con su versión aceptada');
    await ap.screenshot({ path: OUT + 'e6i-admin-tx-d.png', fullPage: true });
    await ap.goto(B + '/admin/sistema/configuracion');
    ok(await contiene(ap, 'Cancelar gratis un evento privado') && await contiene(ap, 'Una propuesta vale'), 'Configuración › Eventos: las claves evp_*');
    await m.goto(B + `/privado/${E2}`); await m.screenshot({ path: OUT + 'e6i-cancelado-m.png', fullPage: true });
    // Escritorio del cliente
    const { p: d1 } = await nuevo(C1, false);
    await d1.goto(B + `/n/${SAB}/evento-privado?p=25`); await contiene(d1, 'Pide tu evento privado'); await d1.screenshot({ path: OUT + 'e6i-pedir-d.png', fullPage: true });
    await d1.goto(B + `/privado/${E7}`); await contiene(d1, 'TE MANDARON SU PROPUESTA'); await d1.screenshot({ path: OUT + 'e6i-propuesta-d.png', fullPage: true });
    await hp.goto(B + `/panel/${SAB}/hoy`); await hp.screenshot({ path: OUT + 'e6i-panel-hoy-d.png', fullPage: true });
    const { p: hm } = await nuevo(PEDRO, true);
    await hm.goto(B + `/panel/${SAB}/hoy?det=evp:${E7}`); await contiene(hm, 'TUS PROPUESTAS'); await hm.screenshot({ path: OUT + 'e6i-panel-detalle-m.png', fullPage: true });
    ok(err.filter((e) => !/Failed to load|404|pexels|ERR_|NEXT_NOT_FOUND|NEXT_HTTP_ERROR/.test(e)).length === 0, `sin errores en la página${err.length ? ': ' + err.slice(0, 3).join(' | ') : ''}`);
  } finally {
    limpiar();
    for (const [u, v] of Object.entries(PREFS)) sql(`update users set notif_prefs = ${v ? `'${v.replace(/'/g, "''")}'::jsonb` : 'null'} where id = '${u}'`);
    if (AJ0) sql(`update private_event_settings set is_on = true, deposit_pct = 25 where business_id = '${SAB}'`);
    await b.close();
  }
  console.log(`\nevt6i: ${n} ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
