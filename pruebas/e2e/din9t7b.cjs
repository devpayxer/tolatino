// 9t7b (21 nov) · Dinero 9t7, por la PANTALLA (din9t7.cjs lo prueba por debajo, con los módulos reales y una pasarela de mentira, sin servidor ni navegador).
// Aquí: Super Admin › Planes › Ingresos (alertas del dinero) contra el servidor local en modo simulador de pagos, con la devolución atascada (refund_stuck):
//   1) Stripe (el simulador: sim_refunds con su dato tl_intencion) SÍ la hizo: «Resolver a mano» + nota → el mensaje dice que Stripe dice que sí salió y que NO se
//      marca a mano; en la base: la devolución hecha (sin manual_at), una consulta del equipo en gateway_checks, la auditoría «dinero.alerta.preguntar» y la
//      alerta resuelta (sin ninguna nota «resuelta a mano»);
//   2) Stripe NO la tiene (nada en el simulador): «Resolver a mano» + nota → queda marcada a mano (manual_at, quién y la nota), con su auditoría; sigue «en
//      camino» pero ya nadie la reintenta; la alerta, resuelta y sin acciones;
//   3) «Preguntar a Stripe ahora» en una devolución que el simulador sí tiene: se cierra como hecha sin tocar «Resolver a mano»;
//   4) alguien del equipo SIN permiso de dinero (Soporte): no abre Planes, y el servidor, si se le manda cada acción tal cual la manda la pantalla, contesta
//      «Tu rol no decide sobre dinero.» y en la base no cambia nada;
//   5) en inglés (tl_lang=en): la acción, la hoja de «Resolver a mano» y la de «Preguntar a Stripe ahora»;
//   6) en el teléfono (390): el recorrido del caso 2 con clics de verdad (sin force ni dispatchEvent), sin que la página pase de 390 en la lista ni con la hoja abierta.
// Precondiciones propias (orden indiferente, corre dos veces seguidas): su negocio, su cobro (con su intención del simulador), su devolución en camino, mandada con
// su dato y pasada la llave (23 h 10 min: antes del margen, así que ni el barrido del servidor ni nadie la vuelve a mandar), la última consulta anotada «hace un
// momento» (el barrido del servidor, que corre cada minuto, no vuelve a preguntar en 15 min: no cierra por su cuenta lo que la prueba arma) y su alerta.
const ENT = require('../lib/entorno.cjs');
const { execSync } = require('child_process');
const { chromium } = require('playwright'); const crypto = require('crypto');
const { entrarComo, sql } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT, ADM = '5705550199', SOPORTE = '5705550677';
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400)); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = async (p, t) => (await texto(p)).includes(t);
const desk = (b) => b.newContext({ viewport: { width: 1360, height: 900 } });
const tel390 = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const arriba = (p) => p.evaluate(() => window.scrollTo(0, 0));
const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l)); // el id de un «returning» (psql también imprime la etiqueta de cada sentencia)
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
const usd = (c) => `$${(c / 100).toFixed(2)}`;
const MIN_VIEJA = 23 * 60 + 10; // pasada la llave (23 h) y antes del margen (24 h): la consulta que no la halla NO la vuelve a mandar
const usados = new Set();
const montoLibre = () => { for (;;) { const c = 1100 + crypto.randomInt(3000); if (!usados.has(c)) { usados.add(c); return c; } } };
let NUM = Number(String(Date.now()).slice(-8)) * 10 + 3;

// Una devolución de un cobro, en camino y pasada la llave, mandada con su dato (como la deja la app: sent_at y gateway_ref en una sentencia), con su última
// consulta «sin respuesta» hace un momento y su alerta refund_stuck. o.stripe: el simulador SÍ la tiene (sim_refunds con su dato tl_intencion).
// Todo en una sola sentencia hacia la base donde importa (la devolución nace ya vieja y ya mandada): ningún barrido la ve «a medias».
function armar(X, tag, o = {}) {
  const amt = montoLibre(), num = String(++NUM), pi = `pi_sim_9t7b_${RUN}${tag}`, idem = `t9b-${RUN}${tag}`;
  const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, total_cents, subtotal_cents, details)
    values ('${num}', 'order', 'hzl', '${X.b}', '${X.u}', 'app', gen_random_uuid(), 'confirmed', 5000, 5000, '{}'::jsonb) returning id`));
  const pago = primero(sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, captured_at)
    values (${op}, '${X.u}', '${X.b}', 'hzl', 'full', 'card', '${pi}', 5000, 500, 'captured', now()) returning id`));
  sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card, metadata, capture_method)
    values ('${pi}', 5000, 500, 'acct_sim_${X.b}', 'succeeded', 5000, 'pm_sim_visa_4242_${RUN}', '{}'::jsonb, 'automatic')`);
  sql(`insert into refunds (payment_id, amount_cents, reason, initiated_by, status, idem_key, created_at) values (${pago}, ${amt}, 'prueba 9t7b', 'admin', 'pending', '${idem}', now() - interval '${MIN_VIEJA} minutes');
    set session_replication_role = replica;
    update refunds set sent_at = now() - interval '${MIN_VIEJA} minutes', gateway_ref = 'refunds:' || id, attempts = 1, last_error = 'red' where idem_key = '${idem}';
    set session_replication_role = default`);
  const rf = sql(`select id from refunds where idem_key = '${idem}'`);
  sql(`insert into gateway_checks (subject_kind, subject_id, lookup, origin, result, city_id) values ('refunds', ${rf}, 'refunds:${rf}', 'barrido', 'sin_respuesta', 'hzl')`);
  const re = `re_sim_9t7b_${RUN}${tag}`;
  if (o.stripe) sql(`insert into sim_refunds (id, payment_intent, amount_cents, metadata) values ('${re}', '${pi}', ${amt}, '{"tl_intencion":"refunds:${rf}"}'::jsonb)`);
  sql(`insert into money_alerts (kind, subject_id, business_id, city_id, amount_cents, detail) values ('refund_stuck', '${rf}', '${X.b}', 'hzl', ${amt},
    '{"es":"Devolución de ${usd(amt)} sin respuesta de Stripe en 23 h (1 intentos, red): ya no se manda con esa llave. El servidor le pregunta a Stripe y la cierra con lo que diga.","en":"Refund of ${usd(amt)} with no answer from Stripe in 23 h (1 attempts, red): it is not sent with that key again. The server asks Stripe and closes it with the answer."}'::jsonb)`);
  return { amt, rf, pi, re, pago, al: sql(`select id from money_alerts where kind = 'refund_stuck' and subject_id = '${rf}'`) };
}
// Lo que dice la base de una devolución: estado | a mano (sí/no) | quién | nota | su cobro en Stripe
const devDe = (L) => sql(`select status || '|' || (manual_at is not null) || '|' || coalesce(manual_by::text, '') || '|' || coalesce(manual_note, '') || '|' || coalesce(stripe_refund_id, '') from refunds where id = ${L.rf}`);
const notas = (L, accion) => sql(`select count(*) from money_alert_notes where alert_id = ${L.al} and action = '${accion}'`);
const consultasEquipo = (L) => sql(`select count(*) || '|' || coalesce(max(result), '') from gateway_checks where subject_kind = 'refunds' and subject_id = ${L.rf} and origin = 'equipo'`);
const audit = (L, accion) => sql(`select count(*) from audit_entries where action = '${accion}' and target_kind = 'money_alert' and target_id = '${L.al}'`);
const pagado = (L) => sql(`select refunded_cents from payments where id = ${L.pago}`);
const cambios = (L) => [devDe(L), notas(L, 'resuelta_a_mano'), notas(L, 'resuelta_sola'), consultasEquipo(L), audit(L, 'dinero.alerta.preguntar'), audit(L, 'dinero.alerta.resuelta_a_mano')].join(' ; ');

(async () => {
  // ── Precondiciones propias ──
  const tel = telPropio();
  sql(`insert into users (phone, first_name, last_name) values ('+1${tel}', 'Prueba', 'NueveSiete')`);
  const X = { u: uid(tel), b: `p97-${RUN}` };
  const NEG = `Hogar 9t7b ${RUN}`;
  sql(`insert into businesses (id, city_id, category_id, name) values ('${X.b}', 'hzl', 'NEG-HOGAR', '${NEG}')`);
  sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${X.b}', 'acct_sim_${X.b}', 'enabled', true, true, true)`);
  const L1 = armar(X, 'a', { stripe: true }), L2 = armar(X, 'b'), L3 = armar(X, 'c', { stripe: true });
  ok(!!L1.al && !!L2.al && !!L3.al && devDe(L1) === 'pending|false|||' && devDe(L2) === 'pending|false|||', `tres devoluciones en camino pasada la llave, con su alerta refund_stuck (refunds ${L1.rf}, ${L2.rf}, ${L3.rf}); el simulador tiene la 1 y la 3`);
  const b = await chromium.launch();
  const abiertas = [], err = [];
  const mirar = (p, tag) => { p.on('pageerror', (e) => err.push(`${tag} ${e.message}`)); };
  // La fila de la alerta de ESA devolución: su negocio, su monto (distinto en cada una) y un botón de las acciones del dinero.
  const filaAl = (p, L, en = false) => p.locator('div').filter({ has: p.getByText(NEG, { exact: false }) }).filter({ has: p.getByText(`${en ? 'Refund of' : 'Devolución de'} ${usd(L.amt)}`, { exact: false }) })
    .filter({ has: p.getByRole('button', { name: /Resolver a mano|Preguntar a Stripe ahora|Resolve manually|Ask Stripe now/ }) }).last();
  const ingresos = async (p, L, en = false) => { await p.goto(B + '/admin/planes?tab=ing'); await p.getByText(`${en ? 'Refund of' : 'Devolución de'} ${usd(L.amt)}`, { exact: false }).first().waitFor({ timeout: 20000 }); };
  // El mensaje que da la acción (sale como aviso unos segundos): se lee en cuanto aparece.
  const aviso = async (p, re) => { const l = p.getByRole('status').filter({ hasText: re }).first(); await l.waitFor({ timeout: 30000 }); return (await l.innerText()).replace(/\s+/g, ' '); };
  const ancho = (p) => p.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  const nota = async (p, plantilla) => { await clic(p.getByText(plantilla, { exact: true })); };
  const verTodas = async (p, L) => { await p.goto(B + '/admin/planes?tab=ing&alertas=todas'); await p.getByText(usd(L.amt), { exact: false }).first().waitFor({ timeout: 20000 }); };
  const resuelta = (p, L) => p.locator('div').filter({ has: p.getByText(NEG, { exact: false }) }).filter({ has: p.getByText(usd(L.amt), { exact: false }) }).filter({ has: p.getByText('RESUELTA', { exact: true }) }).last();
  const shot = (p, nom) => p.screenshot({ path: OUT + `d9t7b-${nom}-d.png` });
  const shotM = (p, nom) => p.screenshot({ path: OUT + `d9t7b-${nom}-m.png` });
  try {
    const ca = await desk(b), a = await ca.newPage(); abiertas.push(ca); mirar(a, 'admin');
    await entrarComo(a, ADM);
    const stf = uid(ADM);

    // ── 1 · Stripe SÍ la hizo: «Resolver a mano» no la marca a mano ──
    console.log('1 · «Resolver a mano» con Stripe diciendo que sí salió: se cierra como hecha y NO se marca a mano');
    await ingresos(a, L1);
    const f1 = filaAl(a, L1);
    ok((await vis(f1.getByRole('button', { name: 'Resolver a mano', exact: true }))) !== null && (await vis(f1.getByRole('button', { name: 'Preguntar a Stripe ahora', exact: true }))) !== null, 'la alerta de la devolución atascada ofrece «Resolver a mano» y «Preguntar a Stripe ahora»');
    ok(await contiene(a, `Devolución atascada · ${usd(L1.amt)}`) && await contiene(a, 'Última consulta a Stripe') && await contiene(a, 'sin respuesta'), 'la alerta dice «Devolución atascada» y lo último que contestó Stripe en la consulta anotada (sin respuesta)');
    await f1.scrollIntoViewIfNeeded(); await shot(a, 'alerta');
    ok(devDe(L1) === 'pending|false|||', 'antes: en camino y sin marcar a mano');
    await clic(f1.getByRole('button', { name: 'Resolver a mano', exact: true }));
    await a.getByText('La devolución se hizo fuera de Stripe').first().waitFor();
    ok(await contiene(a, 'Antes de guardar, se le pregunta a Stripe') && await contiene(a, 'si dice que salió, se cierra como hecha y no se marca a mano'), 'la hoja de «Resolver a mano» dice, antes de guardar, que se le pregunta a Stripe y que si salió no se marca a mano');
    await arriba(a); await shot(a, 'hoja');
    const cta = a.getByRole('button', { name: 'Resolver a mano', exact: true });
    ok(await cta.last().isDisabled(), 'sin nota, el botón de la hoja no deja guardar');
    await nota(a, 'Se le mandó un cheque al cliente.');
    ok(devDe(L1) === 'pending|false|||' && consultasEquipo(L1) === '0|', 'hasta aquí no cambió nada en la base (ninguna consulta del equipo todavía)');
    // Se captura la acción real que manda la pantalla para reenviarla después con la sesión de Soporte (caso 4).
    const pedidoNota = a.waitForRequest((q) => q.method() === 'POST' && !!q.headers()['next-action'] && /resuelta_a_mano/.test(q.postData() ?? ''));
    await clic(cta);
    const accionNota = (await pedidoNota).headers()['next-action'];
    const m1 = await aviso(a, /Stripe dice que sí salió/);
    ok(m1.includes(`Stripe dice que sí salió (${L1.re})`) && m1.includes('se cerró como hecha') && m1.includes('No se marca a mano'), `el mensaje: «${m1}»`);
    await shot(a, 'res1');
    ok(devDe(L1) === `done|false|||${L1.re}`, `en la base: la devolución quedó hecha con la de Stripe (${L1.re}) y SIN manual_at (${devDe(L1)})`);
    ok(consultasEquipo(L1) === '1|hecho', 'una consulta del equipo en gateway_checks, con lo que dijo Stripe («hecho»)');
    ok(audit(L1, 'dinero.alerta.preguntar') === '1' && sql(`select count(*) from audit_entries where action = 'dinero.alerta.preguntar' and target_id = '${L1.al}' and actor_id = '${stf}' and reason = 'Se le mandó un cheque al cliente.'`) === '1', 'la auditoría «dinero.alerta.preguntar» lleva a quien la pidió y su nota (una vez)');
    ok(notas(L1, 'resuelta_a_mano') === '0' && audit(L1, 'dinero.alerta.resuelta_a_mano') === '0', 'y NO quedó ninguna nota ni auditoría de «resuelta a mano»');
    ok(pagado(L1) === String(L1.amt), `el libro cuenta la devolución una vez (el cobro lleva ${usd(L1.amt)} devueltos)`);
    // «la alerta se cierra sola»: en el acto, sin esperar al barrido (como «Preguntar a Stripe ahora»). Antes seguía abierta hasta el siguiente barrido.
    ok(notas(L1, 'resuelta_sola') === '1', 'la alerta se cierra sola en el acto (nota «resuelta_sola», una vez), sin esperar al barrido');
    await verTodas(a, L1);
    const r1 = resuelta(a, L1);
    ok((await r1.count()) === 1 && (await r1.getByRole('button', { name: /Resolver a mano|Preguntar a Stripe ahora|Resuelta/ }).count()) === 0, 'Ver todas: la alerta sale RESUELTA y sin acciones');
    await shot(a, 'res1-todas');

    // ── 2 · Stripe NO la tiene: se marca a mano ──
    console.log('2 · «Resolver a mano» con Stripe diciendo que no la tiene: queda marcada a mano');
    await ingresos(a, L2);
    const f2 = filaAl(a, L2);
    await clic(f2.getByRole('button', { name: 'Resolver a mano', exact: true }));
    await a.getByText('La devolución se hizo fuera de Stripe').first().waitFor();
    await nota(a, 'Se le devolvió por transferencia bancaria; comprobante en el caso.');
    await clic(a.getByRole('button', { name: 'Resolver a mano', exact: true }));
    const m2 = await aviso(a, /Resuelta fuera de Stripe/);
    ok(m2.includes('Resuelta fuera de Stripe: ya no se reintenta') && m2.includes('Quedó en la auditoría'), `el mensaje: «${m2}»`);
    await shot(a, 'res2');
    ok(devDe(L2) === `pending|true|${stf}|Se le devolvió por transferencia bancaria; comprobante en el caso.|`, `en la base: marcada a mano, por quien la resolvió y con su nota (${devDe(L2)})`);
    ok(consultasEquipo(L2) === '1|no_hallado' && audit(L2, 'dinero.alerta.preguntar') === '1', 'antes de marcarla le preguntó a Stripe (una consulta del equipo, «no_hallado») y quedó en la auditoría');
    ok(notas(L2, 'resuelta_a_mano') === '1' && sql(`select count(*) from audit_entries where action = 'dinero.alerta.resuelta_a_mano' and target_id = '${L2.al}' and actor_id = '${stf}' and reason = 'Se le devolvió por transferencia bancaria; comprobante en el caso.'`) === '1', 'su nota «resuelta a mano» y su auditoría con quien la resolvió, una vez');
    ok(sql(`select count(*) from refunds where id = ${L2.rf} and status = 'pending' and manual_at is not null`) === '1' && sql(`select count(*) from sim_refunds where payment_intent = '${L2.pi}'`) === '0', 'no se mandó otra devolución a Stripe (nada en el simulador): ya no se reintenta');
    await verTodas(a, L2);
    const r2 = resuelta(a, L2);
    ok((await r2.count()) === 1 && (await r2.getByRole('button', { name: /Resolver a mano|Preguntar a Stripe ahora|Resuelta/ }).count()) === 0, 'Ver todas: la alerta sale RESUELTA y sin «Resolver a mano» ni «Preguntar a Stripe ahora»');
    await shot(a, 'res2-todas');

    // ── 3 · «Preguntar a Stripe ahora» ──
    console.log('3 · «Preguntar a Stripe ahora»: el simulador sí la tiene y se cierra como hecha sin tocar «Resolver a mano»');
    await ingresos(a, L3);
    const f3 = filaAl(a, L3);
    await clic(f3.getByRole('button', { name: 'Preguntar a Stripe ahora', exact: true }));
    await a.getByText('Preguntar a Stripe qué pasó').first().waitFor();
    await nota(a, 'Reviso la alerta de hoy.');
    const pedidoPregunta = a.waitForRequest((q) => q.method() === 'POST' && !!q.headers()['next-action'] && !/resuelta_a_mano/.test(q.postData() ?? '') && (q.postData() ?? '').includes('Reviso la alerta de hoy.'));
    await clic(a.getByRole('button', { name: 'Preguntar a Stripe', exact: true }));
    const accionPregunta = (await pedidoPregunta).headers()['next-action'];
    const m3 = await aviso(a, /quedó hecha/);
    ok(m3.startsWith('Stripe dijo que sí salió: la devolución quedó hecha y la alerta se cerró.') && m3.includes('Quedó en la auditoría.'), `el mensaje: «${m3}»`);
    ok(devDe(L3) === `done|false|||${L3.re}` && consultasEquipo(L3) === '1|hecho' && audit(L3, 'dinero.alerta.preguntar') === '1', 'en la base: hecha con la de Stripe, sin manual_at, una consulta del equipo y su auditoría «dinero.alerta.preguntar»');
    ok(notas(L3, 'resuelta_a_mano') === '0' && audit(L3, 'dinero.alerta.resuelta_a_mano') === '0' && notas(L3, 'resuelta_sola') === '1' && pagado(L3) === String(L3.amt), 'sin «Resolver a mano» de por medio: la alerta se cerró sola, y el libro cuenta la devolución una vez');
    await verTodas(a, L3);
    ok((await resuelta(a, L3).count()) === 1, 'Ver todas: la alerta sale RESUELTA');

    // ── 4 · Sin permiso de dinero ──
    console.log('4 · Alguien del equipo sin permiso de dinero (Soporte): no resuelve ni pregunta');
    const cs = await desk(b), s = await cs.newPage(); abiertas.push(cs); mirar(s, 'soporte');
    await entrarComo(s, SOPORTE);
    await s.goto(B + '/admin/planes?tab=ing');
    ok(!(await contiene(s, 'Resolver a mano')) && !(await contiene(s, 'Preguntar a Stripe ahora')) && !/\/admin\/planes/.test(s.url()), `Soporte no abre Planes (queda en ${new URL(s.url()).pathname + new URL(s.url()).search}): no ve las acciones`);
    const L4 = armar(X, 'd');
    const antes4 = cambios(L4);
    ok(antes4.startsWith('pending|false|||') && consultasEquipo(L4) === '0|', 'la devolución de la prueba 4 está en camino, sin consultas del equipo');
    for (const [que, accion, cuerpo] of [['resolver a mano', accionNota, JSON.stringify([L4.al, 'resuelta_a_mano', 'Intento de Soporte sin permiso.'])], ['preguntar a Stripe', accionPregunta, JSON.stringify([L4.al, 'Intento de Soporte sin permiso.'])]]) {
      const rs = await cs.request.post(B + '/admin/planes?tab=ing', { headers: { 'next-action': accion, accept: 'text/x-component', 'content-type': 'text/plain;charset=UTF-8' }, data: cuerpo });
      const tr = await rs.text();
      ok(/Tu rol no decide sobre dinero\./.test(tr), `Soporte manda «${que}» tal cual la manda la pantalla: el servidor contesta «Tu rol no decide sobre dinero.» (HTTP ${rs.status()})`);
    }
    ok(cambios(L4) === antes4 && sql(`select count(*) from sim_refunds where payment_intent = '${L4.pi}'`) === '0', 'en la base no cambió nada con los dos intentos (ni a mano, ni consulta, ni nota, ni auditoría)');
    // La del equipo con permiso sí: el Admin la resuelve (y no queda una devolución en camino de más).
    await ingresos(a, L4);
    await clic(filaAl(a, L4).getByRole('button', { name: 'Resolver a mano', exact: true }));
    await a.getByText('La devolución se hizo fuera de Stripe').first().waitFor();
    await nota(a, 'Se le mandó un cheque al cliente.');
    await clic(a.getByRole('button', { name: 'Resolver a mano', exact: true }));
    await aviso(a, /Resuelta fuera de Stripe/);
    ok(devDe(L4) === `pending|true|${stf}|Se le mandó un cheque al cliente.|`, 'el Admin sí: la misma alerta queda resuelta a mano');

    // ── 5 · En inglés ──
    console.log('5 · En inglés: la acción, la hoja de «Resolve manually» y la de «Ask Stripe now»');
    const L5 = armar(X, 'e');
    const ce = await desk(b); await ce.addCookies([{ name: 'tl_lang', value: 'en', url: B }]); abiertas.push(ce); const e = await ce.newPage(); mirar(e, 'admin-en');
    await entrarComo(e, ADM);
    await ingresos(e, L5, true);
    const f5 = filaAl(e, L5, true);
    ok((await vis(f5.getByRole('button', { name: 'Resolve manually', exact: true }))) !== null && (await vis(f5.getByRole('button', { name: 'Ask Stripe now', exact: true }))) !== null, 'la alerta ofrece «Resolve manually» y «Ask Stripe now»');
    ok((await f5.getByRole('button', { name: 'Resolver a mano' }).count()) === 0 && (await f5.getByRole('button', { name: 'Preguntar a Stripe ahora' }).count()) === 0, 'y ninguna acción en español');
    ok(await contiene(e, `Stuck refund · ${usd(L5.amt)}`) && await contiene(e, `Refund of ${usd(L5.amt)} with no answer from Stripe in 23 h`) && await contiene(e, 'Last Stripe query'), 'el título y el detalle de la alerta, en inglés');
    await f5.scrollIntoViewIfNeeded(); await shot(e, 'alerta-en');
    await clic(f5.getByRole('button', { name: 'Ask Stripe now', exact: true }));
    await e.getByText('Ask Stripe what happened').first().waitFor();
    ok(await contiene(e, 'The business is asking about this charge.') && (await vis(e.getByRole('button', { name: 'Ask Stripe', exact: true }))) !== null, 'la hoja de «Ask Stripe now»: su título, sus notas y su botón, en inglés');
    await ingresos(e, L5, true);
    await clic(filaAl(e, L5, true).getByRole('button', { name: 'Resolve manually', exact: true }));
    await e.getByText('The refund was made outside Stripe').first().waitFor();
    ok(await contiene(e, 'Before saving, Stripe is asked: if it says it went out, it closes as done and isn’t marked manually; if it doesn’t answer, nothing changes.') && await contiene(e, 'The note stays in the audit log with your name.')
      && await contiene(e, 'A check was sent to the customer.') && await contiene(e, 'Refunded by bank transfer; receipt in the case.'), 'la hoja de «Resolve manually»: su título, lo que dice del paso con Stripe y sus notas, en inglés');
    ok(!(await contiene(e, 'La devolución se hizo fuera de Stripe')) && !(await contiene(e, 'Antes de guardar, se le pregunta a Stripe')), 'sin ningún texto de la hoja en español');
    await arriba(e); await shot(e, 'hoja-en');
    await nota(e, 'A check was sent to the customer.');
    await clic(e.getByRole('button', { name: 'Resolve manually', exact: true }));
    await aviso(e, /Resuelta fuera de Stripe/);
    ok(devDe(L5) === `pending|true|${stf}|A check was sent to the customer.|` && consultasEquipo(L5) === '1|no_hallado', 'en inglés se resuelve igual (el mensaje del servidor sigue en español): marcada a mano, con su nota, tras preguntar a Stripe');

    // ── 6 · Teléfono 390 ──
    console.log('6 · Teléfono 390: el recorrido de «Resolver a mano» con clics de verdad, sin pasarse del ancho');
    const L6 = armar(X, 'f');
    const cm = await tel390(b), m = await cm.newPage(); abiertas.push(cm); mirar(m, 'admin-390');
    await entrarComo(m, ADM);
    await ingresos(m, L6);
    const f6 = filaAl(m, L6);
    ok((await vis(f6.getByRole('button', { name: 'Resolver a mano', exact: true }))) !== null && (await vis(f6.getByRole('button', { name: 'Preguntar a Stripe ahora', exact: true }))) !== null, 'en el teléfono (390) también se ofrece «Resolver a mano» y «Preguntar a Stripe ahora»');
    let w = await ancho(m);
    ok(w.inner === m.viewportSize().width && w.scroll <= w.inner && w.body <= w.inner, `la lista de alertas a ${w.inner} (el ancho del teléfono): innerWidth ${w.inner}, scrollWidth ${w.scroll}, body ${w.body}`);
    await f6.scrollIntoViewIfNeeded(); await shotM(m, 'alerta');
    await clic(f6.getByRole('button', { name: 'Resolver a mano', exact: true }));
    await m.getByText('La devolución se hizo fuera de Stripe').first().waitFor();
    w = await ancho(m);
    ok(w.inner === m.viewportSize().width && w.scroll <= w.inner && w.body <= w.inner, `la hoja abierta a ${w.inner} (el ancho del teléfono): innerWidth ${w.inner}, scrollWidth ${w.scroll}, body ${w.body}`);
    await arriba(m); await shotM(m, 'hoja');
    await nota(m, 'Se le mandó un cheque al cliente.');
    await clic(m.getByRole('button', { name: 'Resolver a mano', exact: true }));
    const m6 = await aviso(m, /Resuelta fuera de Stripe/);
    await shotM(m, 'res2');
    w = await ancho(m);
    ok(w.inner === m.viewportSize().width && w.scroll <= w.inner, `y con el resultado a ${w.inner} (el ancho del teléfono): innerWidth ${w.inner}, scrollWidth ${w.scroll}`);
    ok(m6.includes('Resuelta fuera de Stripe: ya no se reintenta') && devDe(L6) === `pending|true|${stf}|Se le mandó un cheque al cliente.|` && consultasEquipo(L6) === '1|no_hallado' && audit(L6, 'dinero.alerta.preguntar') === '1', 'en el teléfono: marcada a mano igual, tras preguntar a Stripe, con su auditoría');

    // ── 7 · Transferencia atascada / lo que sobró ──
    // No se arma aquí: una transferencia_reversal_stuck pide una liquidación de evento pagada con su transferencia del simulador (sim_transfers) y una extra_refund_stuck
    // pide su decisión de revisión (gateway_reviews) con los disparadores de 0204; las dos se prueban por debajo en din9t7.cjs (secciones 5 y 6). Ver el reporte.
    ok(!err.length, 'sin errores en las páginas' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
    console.log(`\nOK · ${n} comprobaciones`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => undefined);
    await b.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
