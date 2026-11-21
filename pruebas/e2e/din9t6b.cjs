// 9t6b (21 nov) · Dinero 9t6, por la PANTALLA (din9t6.cjs lo prueba por debajo, con los módulos reales y una pasarela de mentira, sin servidor ni navegador).
// Aquí: Super Admin › Planes › Ingresos (alertas del dinero) contra el servidor local en modo simulador de pagos:
//   1) un cobro del plan que quedó en camino y que Stripe (el simulador) tiene DOS veces → la alerta gateway_review ofrece «Elegir cuál vale» y NO «Resuelta»;
//      la hoja «Qué vale de lo que tiene Stripe» lista los dos ids y «Ninguno: devolver todo lo que salió»; sin nota no deja decidir; elegir uno + nota →
//      «Decidir» → «Decidido: vale …»; en la base: la decisión (una vez), la intención hecha con ese cobro, la devolución del otro (gateway_refunds y
//      sim_refunds), la auditoría «dinero.alerta.decidir» y la alerta ya sin la acción;
//   2) lo mismo con otra intención eligiendo «Ninguno»: la intención queda fallida (no hecha) y los dos cobros, devueltos;
//   3) alguien del equipo SIN permiso de dinero (Soporte): no abre Planes, y el servidor, si se le manda la acción tal cual, contesta «Tu rol no decide
//      sobre dinero.» y en la base no cambia nada;
//   4) en inglés (tl_lang=en): «Choose which counts», la hoja «What counts of what Stripe has» y «None: refund everything that went through»;
//   5) una alerta hold_stuck (retención renovada sin respuesta) ofrece «Preguntar a Stripe ahora» (y no «Elegir cuál vale»);
//   6) (0205) cada opción de la hoja dice su monto, cuándo salió (zona de la ciudad) y su id, el primero arriba; uno de otro monto NO se ofrece y la hoja
//      dice por qué; una consulta vieja sin detalle (la segunda intención) ofrece los ids como antes.
// Precondiciones propias (orden indiferente, corre dos veces seguidas): su negocio, su cuenta de cobro simulada, su plan, su intención en camino (más vieja que
// la llave), los cobros del simulador (sim_intents con tl_intencion), la última consulta anotada y la alerta. Lo que la pantalla decide lo hace el servidor.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const crypto = require('crypto');
const { entrarComo, sql } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT, ADM = '5705550199', SOPORTE = '5705550677';
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400)); };
const espera = async (f, v, veces = 60) => { for (let i = 0; i < veces; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const desk = (b) => b.newContext({ viewport: { width: 1360, height: 900 } });
const tel390 = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const arriba = (p) => p.evaluate(() => window.scrollTo(0, 0));
const shot = (p, nom, full = false) => p.screenshot({ path: OUT + `d9t6b-${nom}-d.png`, fullPage: full });
const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l)); // el id de un «returning» (psql también imprime la etiqueta de cada sentencia)
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };

// Una intención de cobro de un plan del Hogar ($149), en camino y pasada la ventana de la llave (30 h), con DOS cobros hechos en el simulador para esa
// misma intención y la última consulta anotada («varios»), como lo deja el barrido; su alerta gateway_review abierta.
// o.viejo: la consulta anotada como antes de 0205 (solo los ids, sin detalle). o.otroMonto: el segundo cobro es de $99 (no puede valer).
// El primero (A) salió hace 31 h y el segundo (C) 5 min después; el detalle se guarda al revés (el más nuevo primero) para ver que la hoja los ordena.
function armar(X, tag, o = {}) {
  const num = `PL-9B${RUN}${tag}`.toUpperCase().slice(0, 18);
  const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, client_key)
    values ('${num}', 'plan', 'hzl', '${X.b}', '${X.u}', 'confirmed', '{"svc":{"es":"Plan 9t6b","en":"Plan 9t6b"}}'::jsonb, 14900, 14900, 'app', gen_random_uuid()) returning id`));
  const item = primero(sql(`insert into items (business_id, name, price_cents, svc_kind, sell, status) values ('${X.b}', '{"es":"Plan 9t6b","en":"Plan 9t6b"}'::jsonb, 14900, 'plan', true, 'live') returning id`));
  const hoy = sql(`select (now() at time zone 'America/New_York')::date::text`);
  const plan = primero(sql(`insert into plan_subscriptions (operation_id, business_id, user_id, city_id, item_id, price_cents, dow, nth, window_m, charge_day, first_visit_on, next_visit_on, next_charge_on, payment_method)
    values (${op}, '${X.b}', '${X.u}', 'hzl', ${item}, 14900, 2, 2, 540, 5, '${hoy}'::date, null, '${hoy}'::date, '${X.pm}') returning id`));
  const idem = `plan-${plan}-${hoy}-i1`;
  // El servidor tiene su propio barrido: una intención vieja y en camino que apareciera ANTES que sus cobros en Stripe la cerraría como «nunca llegó».
  // Por eso primero se reserva su id, luego van lo de Stripe (sim_intents) y la consulta anotada, y al final la intención (con ese id).
  const oc = sql(`select nextval(pg_get_serial_sequence('offsession_charges', 'id'))`);
  const ref = `offsession_charges:${oc}`, A = `pi_sim_9t6b_${RUN}${tag}a`, C = `pi_sim_9t6b_${RUN}${tag}b`;
  for (const [id, n, min] of [[A, 14900, 31 * 60], [C, o.otroMonto ? 9900 : 14900, 31 * 60 - 5]]) sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card, metadata, capture_method, created_at)
    values ('${id}', ${n}, 0, 'acct_sim_${X.b}', 'succeeded', ${n}, '${X.pm}', '{"tl_intencion":"${ref}"}'::jsonb, 'automatic', now() - interval '${min} minutes')`);
  const found = o.viejo ? 'null' : `(select jsonb_agg(jsonb_build_object('id', id, 'estado', 'hecho', 'centavos', amount_cents, 'creado', to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) order by created_at desc) from sim_intents where id in ('${A}', '${C}'))`;
  sql(`insert into gateway_checks (subject_kind, subject_id, lookup, origin, result, stripe_id, found_n, city_id, found) values ('offsession_charges', ${oc}, '${ref}', 'barrido', 'varios', '${A},${C}', 2, 'hzl', ${found})`);
  sql(`set session_replication_role = replica; insert into offsession_charges (id, kind, ref_id, purpose, operation_id, business_id, city_id, payer_user_id, amount_cents, fee_cents, destination, pm, idem_key, detail, gateway_ref, sent_at, attempts, last_error, created_at)
    overriding system value values (${oc}, 'plan', '${plan}', 'periodo-${hoy}', ${op}, '${X.b}', 'hzl', '${X.u}', 14900, 0, 'acct_sim_${X.b}', '${X.pm}', '${idem}', '{"meta":{"plan":"${num}"},"next":"${hoy}","day":5}'::jsonb,
            '${ref}', now() - interval '30 hours', 1, 'error', now() - interval '30 hours')`);
  sql(`insert into money_alerts (kind, subject_id, business_id, city_id, amount_cents, detail) values ('gateway_review', '${ref}', '${X.b}', 'hzl', 14900,
    '{"es":"Stripe tiene 2 objetos para una sola intención (${ref}, $149.00): no se cierra sola. Elige en la alerta cuál vale.","en":"Stripe has 2 objects for a single intent (${ref}, $149.00): it does not close by itself. Choose in the alert which one counts."}'::jsonb) on conflict (kind, subject_id) do nothing`);
  const al = sql(`select id from money_alerts where kind = 'gateway_review' and subject_id = '${ref}'`);
  const creado = (id) => sql(`select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from sim_intents where id = '${id}'`);
  return { oc, ref, A, C, al, plan, num, idem, cA: creado(A), cC: creado(C) };
}
// La etiqueta de una opción como la arma la hoja (monto · cuándo salió en la zona de la ciudad · id). Se compara sin espacios ni puntos: el formato de la
// hora (p. m. / PM, con espacio fino o no) depende de la versión de ICU del navegador.
const zonaHzl = () => sql(`select timezone from cities where id = 'hzl'`);
const cuando = (iso, en = false) => new Intl.DateTimeFormat(en ? 'en-US' : 'es-US', { timeZone: zonaHzl(), day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)).replace(/\./g, '');
const sinEsp = (x) => x.replace(/[\s.]/g, '');
const etiq = (monto, iso, id, en = false) => `${monto} · ${cuando(iso, en)} · ${id}`;
// La opción en la hoja: el texto que termina con su id (con su monto y su fecha delante).
const opcion = (p, id) => p.getByText(new RegExp(`^\\$[0-9.]+ · .+ · ${id}$`));
const estadoDe = (oc) => sql(`select status || '|' || coalesce(last_error, '') || '|' || coalesce(stripe_pi, '') from offsession_charges where id = ${oc}`);
const revDe = (oc) => sql(`select decision || '|' || coalesce(stripe_id, '') || '|' || staff_id from gateway_reviews where subject_kind = 'offsession_charges' and subject_id = ${oc}`);
const cuentas = (oc) => sql(`select (select count(*) from gateway_reviews where subject_kind = 'offsession_charges' and subject_id = ${oc}) || '|' || (select count(*) from gateway_refunds where subject_kind = 'offsession_charges' and subject_id = ${oc})
  || '|' || (select count(*) from audit_entries where action = 'dinero.alerta.decidir' and target_id = (select id::text from money_alerts where kind = 'gateway_review' and subject_id = 'offsession_charges:${oc}'))`);

(async () => {
  // ── Precondiciones propias ──
  const tel = telPropio();
  sql(`insert into users (phone, first_name, last_name) values ('+1${tel}', 'Prueba', 'NueveB')`);
  const X = { u: uid(tel), b: `p9b-${RUN}`, pm: `pm_sim_visa_4242_${RUN}` };
  sql(`insert into businesses (id, city_id, category_id, name) values ('${X.b}', 'hzl', 'NEG-HOGAR', 'Hogar 9t6b ${RUN}')`);
  sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${X.b}', 'acct_sim_${X.b}', 'enabled', true, true, true)`);
  const NEG = `Hogar 9t6b ${RUN}`;
  const L1 = armar(X, 'u'), L2 = armar(X, 'd', { viejo: true }), L3 = armar(X, 't');
  ok(!!L1.al && !!L2.al && !!L3.al, `tres intenciones en camino con dos cobros cada una en el simulador y su alerta (${L1.ref}, ${L2.ref}, ${L3.ref})`);
  const b = await chromium.launch();
  const abiertas = [], err = [];
  const mirar = (p, tag) => { p.on('pageerror', (e) => err.push(`${tag} ${e.message}`)); };
  const filaAl = (p, ref) => p.locator('div').filter({ has: p.getByText(NEG, { exact: false }) }).filter({ has: p.getByText(ref, { exact: false }) }).filter({ has: p.getByRole('button', { name: /Me hago cargo|Elegir cuál vale|Choose which counts|I’ll take it/ }) }).last();
  try {
    const ca = await desk(b), a = await ca.newPage(); abiertas.push(ca); mirar(a, 'admin');
    await entrarComo(a, ADM);
    const ingresos = async (p, ref) => { await p.goto(B + '/admin/planes?tab=ing'); await p.getByText(ref, { exact: false }).first().waitFor({ timeout: 20000 }); };

    // ── 1 · «Elegir cuál vale»: uno de los dos ──
    console.log('1 · Dos cobros para una intención: la alerta ofrece «Elegir cuál vale»; se elige uno y el otro se devuelve');
    await ingresos(a, L1.ref);
    const f1 = filaAl(a, L1.ref);
    ok((await vis(f1.getByRole('button', { name: 'Elegir cuál vale' }))) !== null, 'la alerta gateway_review ofrece «Elegir cuál vale»');
    ok((await f1.getByRole('button', { name: 'Resuelta', exact: true }).count()) === 0, 'y NO ofrece «Resuelta» (solo decidiendo se cierra la intención)');
    ok((await texto(a)).includes('Stripe tiene 2 objetos para una sola intención'), 'la alerta dice que Stripe tiene 2 objetos para una sola intención');
    await f1.scrollIntoViewIfNeeded(); await shot(a, 'alerta');
    await clic(f1.getByRole('button', { name: 'Elegir cuál vale' }));
    await a.getByText('Qué vale de lo que tiene Stripe').first().waitFor();
    let t = await texto(a);
    ok(t.includes('Qué vale de lo que tiene Stripe') && t.includes(L1.A) && t.includes(L1.C) && t.includes('Ninguno: devolver todo lo que salió'), 'la hoja «Qué vale de lo que tiene Stripe»: los dos ids y «Ninguno: devolver todo lo que salió»');
    // 0205 · Cada opción con su monto y cuándo salió, el primero arriba (aunque la consulta lo guardó al revés).
    const eA = etiq('$149.00', L1.cA, L1.A), eC = etiq('$149.00', L1.cC, L1.C);
    ok(sinEsp(t).includes(sinEsp(eA)) && sinEsp(t).includes(sinEsp(eC)) && sinEsp(t).indexOf(sinEsp(eA)) < sinEsp(t).indexOf(sinEsp(eC)), `cada opción dice su monto y cuándo salió, el primero arriba («${eA}», luego «${eC}»)`);
    ok((await vis(opcion(a, L1.A))) !== null && (await vis(opcion(a, L1.C))) !== null && (await a.getByText(L1.A, { exact: true }).count()) === 0, 'ninguna opción es un id pelado');
    await arriba(a); await shot(a, 'hoja');
    const decidir = a.getByRole('button', { name: 'Decidir', exact: true });
    ok(await decidir.last().isDisabled(), 'sin elegir ni nota, «Decidir» no deja');
    await clic(opcion(a, L1.A));
    ok(await decidir.last().isDisabled(), 'con uno elegido pero sin nota, tampoco');
    await clic(a.getByText('Cobro duplicado: se queda el primero.', { exact: true }));
    const antes = cuentas(L1.oc);
    ok(antes === '0|0|0' && estadoDe(L1.oc).startsWith('pending|'), 'hasta aquí no cambió nada en la base (la intención sigue en camino)');
    await clic(decidir);
    await a.getByText(/Decidido: vale /).first().waitFor({ timeout: 30000 });
    const msg1 = (await texto(a)).match(/Decidido: vale [^.]*\./)?.[0] ?? '';
    ok(msg1.startsWith(`Decidido: vale ${L1.A}`), `el mensaje: «${msg1}»`);
    await shot(a, 'decidido');
    const stf = uid(ADM);
    ok(revDe(L1.oc) === `vale|${L1.A}|${stf}`, 'gateway_reviews: decisión «vale», ese id y el equipo que decidió');
    ok(estadoDe(L1.oc) === `done||${L1.A}`, 'la intención quedó hecha con ese cobro');
    const dv1 = sql(`select stripe_id || '|' || status || '|' || amount_cents || '|' || coalesce(stripe_refund_id, '') from gateway_refunds where subject_kind = 'offsession_charges' and subject_id = ${L1.oc}`).split('|');
    ok(dv1[0] === L1.C && dv1[1] === 'done' && dv1[2] === '14900' && dv1[3].startsWith('re_sim_'), `una fila en gateway_refunds por el otro (${L1.C}), hecha`);
    ok(sql(`select count(*) from sim_refunds where payment_intent = '${L1.C}' and amount_cents = 14900 and metadata->>'tl_intencion' like 'gateway_refunds:%'`) === '1'
      && sql(`select refunded_cents from sim_intents where id = '${L1.C}'`) === '14900' && sql(`select refunded_cents from sim_intents where id = '${L1.A}'`) === '0', 'su devolución en el simulador (sim_refunds) y el elegido, intacto');
    ok(cuentas(L1.oc) === '1|1|1', 'una decisión, una devolución y una entrada de auditoría «dinero.alerta.decidir»');
    ok(sql(`select count(*) from audit_entries where action = 'dinero.alerta.decidir' and target_id = '${L1.al}' and actor_id = '${stf}' and reason = 'Cobro duplicado: se queda el primero.'`) === '1', 'la auditoría lleva a quien decidió y su nota');
    await ingresos(a, L2.ref);
    ok((await vis(filaAl(a, L2.ref).getByRole('button', { name: 'Elegir cuál vale' }))) !== null, 'la otra alerta sigue ofreciéndola (lo decidido no toca lo demás)');
    await a.goto(B + '/admin/planes?tab=ing&alertas=todas'); await a.getByText(L1.ref, { exact: false }).first().waitFor();
    const fd = a.locator('div').filter({ has: a.getByText(L1.ref, { exact: false }) }).filter({ has: a.getByText('RESUELTA', { exact: true }) }).last();
    ok((await fd.count()) === 1 && (await fd.getByRole('button', { name: 'Elegir cuál vale' }).count()) === 0, 'Ver todas: la alerta decidida sale RESUELTA y sin «Elegir cuál vale»');
    await shot(a, 'resultado');

    // ── 2 · «Ninguno» ──
    console.log('2 · «Ninguno»: la intención queda fallida y los dos cobros, devueltos');
    await ingresos(a, L2.ref);
    await clic(filaAl(a, L2.ref).getByRole('button', { name: 'Elegir cuál vale' }));
    await a.getByText('Qué vale de lo que tiene Stripe').first().waitFor();
    // Esta intención tiene su consulta anotada como antes de 0205 (sin detalle): los ids como antes, sin monto ni fecha inventados.
    ok((await vis(a.getByText(L2.A, { exact: true }))) !== null && (await vis(a.getByText(L2.C, { exact: true }))) !== null, 'una consulta vieja sin detalle: la hoja ofrece los ids como antes');
    await clic(a.getByText('Ninguno: devolver todo lo que salió', { exact: true }));
    await clic(a.getByText('Se cobró dos veces el mismo período: devolver.', { exact: true }));
    await clic(a.getByRole('button', { name: 'Decidir', exact: true }));
    await a.getByText(/Decidido: ninguno vale/).first().waitFor({ timeout: 30000 });
    const msg2 = (await texto(a)).match(/Decidido: ninguno vale[^]*?auditoría\./)?.[0] ?? '';
    ok(/la intención quedó fallida/.test(msg2) && /Se devuelven 2 \(\$298\.00\): 2 hechas/.test(msg2), `el mensaje: «${msg2}»`);
    await shot(a, 'ninguno');
    ok(revDe(L2.oc) === `ninguno||${stf}`, 'gateway_reviews: decisión «ninguno», sin id');
    ok(estadoDe(L2.oc) === 'failed|devuelto|', 'la intención quedó fallida (no hecha), «devuelto», sin cobro propio');
    ok(sql(`select count(*) from gateway_refunds where subject_kind = 'offsession_charges' and subject_id = ${L2.oc} and status = 'done' and stripe_id in ('${L2.A}', '${L2.C}')`) === '2'
      && sql(`select count(*) from sim_refunds where payment_intent in ('${L2.A}', '${L2.C}')`) === '2' && sql(`select sum(refunded_cents) from sim_intents where id in ('${L2.A}', '${L2.C}')`) === '29800', 'los dos cobros con su devolución (gateway_refunds y sim_refunds)');
    ok(cuentas(L2.oc) === '1|2|1', 'una decisión, dos devoluciones y su auditoría');
    ok(sql(`select count(*) from offsession_charges where kind = 'plan' and ref_id = '${L2.plan}' and status = 'done'`) === '0' && sql(`select charges_ok from plan_subscriptions where id = ${L2.plan}`) === '0', 'el plan no se cobró (sigue esperando su período)');

    // ── 3 · Sin permiso de dinero ──
    console.log('3 · Alguien del equipo sin permiso de dinero (Soporte): no decide');
    // La acción tal cual la manda la pantalla de Admin: se captura una vez (al decidir la tercera, abajo, en inglés) y se reenvía con la sesión de Soporte.
    const cs = await desk(b), s = await cs.newPage(); abiertas.push(cs); mirar(s, 'soporte');
    await entrarComo(s, SOPORTE);
    await s.goto(B + '/admin/planes?tab=ing');
    ok(!/Elegir cuál vale|Choose which counts/.test(await texto(s)) && !/\/admin\/planes/.test(s.url()), `Soporte no abre Planes (queda en ${new URL(s.url()).pathname + new URL(s.url()).search}): no ve la acción`);
    const antesSop = cuentas(L3.oc), estSop = estadoDe(L3.oc);

    // ── 4 · En inglés (y el rechazo de Soporte con la acción real) ──
    console.log('4 · En inglés: «Choose which counts» y «None: refund everything that went through»');
    const ce = await desk(b); await ce.addCookies([{ name: 'tl_lang', value: 'en', url: B }]); abiertas.push(ce); const e = await ce.newPage(); mirar(e, 'admin-en');
    await entrarComo(e, ADM);
    await ingresos(e, L3.ref);
    const f3 = filaAl(e, L3.ref);
    ok((await vis(f3.getByRole('button', { name: 'Choose which counts' }))) !== null && (await f3.getByRole('button', { name: 'Resolved', exact: true }).count()) === 0, 'la alerta ofrece «Choose which counts» (y no «Resolved»)');
    await f3.scrollIntoViewIfNeeded(); await shot(e, 'alerta-en');
    await clic(f3.getByRole('button', { name: 'Choose which counts' }));
    await e.getByText('What counts of what Stripe has').first().waitFor();
    t = await texto(e);
    ok(t.includes('None: refund everything that went through') && t.includes(L3.A) && t.includes(L3.C), 'la hoja «What counts of what Stripe has»: «None: refund everything that went through» y los dos ids');
    ok(sinEsp(t).indexOf(sinEsp(etiq('$149.00', L3.cA, L3.A, true))) >= 0 && sinEsp(t).indexOf(sinEsp(etiq('$149.00', L3.cA, L3.A, true))) < sinEsp(t).indexOf(sinEsp(etiq('$149.00', L3.cC, L3.C, true))),
      `en inglés, la fecha en inglés y el primero arriba («${etiq('$149.00', L3.cA, L3.A, true)}»)`);
    await arriba(e); await shot(e, 'hoja-en');
    await clic(e.getByText('None: refund everything that went through', { exact: true }));
    await clic(e.getByText('The same period was charged twice: refund.', { exact: true }));
    // Se captura la acción del servidor que manda la pantalla y se reenvía con la sesión de Soporte ANTES de que el Admin la use.
    const pedido = e.waitForRequest((q) => q.method() === 'POST' && !!q.headers()['next-action'] && /ninguno/.test(q.postData() ?? ''));
    await clic(e.getByRole('button', { name: 'Decide', exact: true }));
    const q = await pedido; const accion = q.headers()['next-action'], cuerpo = q.postData();
    await e.getByText(/Decidido: ninguno vale/).first().waitFor({ timeout: 30000 });
    ok(estadoDe(L3.oc) === 'failed|devuelto|', 'en inglés la hoja decide igual (el mensaje del servidor sigue en español)');
    await shot(e, 'resultado-en');

    // Soporte manda la misma acción sobre OTRA alerta (la de la prueba 1, ya decidida, no sirve: se arma una nueva y se mira que no cambia nada).
    const L4 = armar(X, 'q');
    const cuerpoSop = JSON.stringify([L4.al, 'ninguno', 'Intento de Soporte sin permiso.']);
    const rs = await cs.request.post(B + '/admin/planes?tab=ing', { headers: { 'next-action': accion, accept: 'text/x-component', 'content-type': 'text/plain;charset=UTF-8' }, data: cuerpoSop });
    const tr = await rs.text();
    ok(/Tu rol no decide sobre dinero\./.test(tr), `el servidor contesta «Tu rol no decide sobre dinero.» a quien no tiene el permiso (HTTP ${rs.status()}; mismo cuerpo que manda la pantalla: ${String(cuerpo).slice(0, 40)}…)`);
    ok(cuentas(L4.oc) === '0|0|0' && estadoDe(L4.oc).startsWith('pending|') && sql(`select count(*) from sim_refunds where payment_intent in ('${L4.A}', '${L4.C}')`) === '0'
      && cuentas(L3.oc) !== antesSop && antesSop === '0|0|0' && estSop.startsWith('pending|'), 'en la base no cambió nada con el intento de Soporte (sin decisión, sin devolución, sin auditoría)');
    // La alerta de la prueba 4 se decide con el Admin para no dejar una intención en camino de más (y mira el «Decidir» con la misma acción).
    await ingresos(a, L4.ref);
    await clic(filaAl(a, L4.ref).getByRole('button', { name: 'Elegir cuál vale' }));
    await a.getByText('Qué vale de lo que tiene Stripe').first().waitFor();
    await clic(opcion(a, L4.C)); await clic(a.getByText('Cobro duplicado: se queda el primero.', { exact: true })); await clic(a.getByRole('button', { name: 'Decidir', exact: true }));
    await a.getByText(`Decidido: vale ${L4.C}`).first().waitFor({ timeout: 30000 });
    ok(revDe(L4.oc) === `vale|${L4.C}|${stf}` && estadoDe(L4.oc) === `done||${L4.C}`, 'el Admin sí: decide la misma alerta y queda hecha con el cobro elegido (el segundo)');

    // ── 5 · hold_stuck: «Preguntar a Stripe ahora» ──
    console.log('5 · Retención renovada sin respuesta (hold_stuck): «Preguntar a Stripe ahora»');
    const nH = `R-9B${RUN}`.toUpperCase();
    const opH = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, deposit_cents, pay_mode, client_key)
      values ('${nH}', 'rental', 'hzl', '${X.b}', '${X.u}', 'confirmed', '{}'::jsonb, 5000, 5000, 5000, 'app', gen_random_uuid()) returning id`));
    const pgH = primero(sql(`set session_replication_role = replica; insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, held_at, simulated, payment_method)
      values (${opH}, '${X.u}', '${X.b}', 'hzl', 'security', 1, 'card', 'pi_sim_9t6b_${RUN}_hold', 5000, 5000, 0, 'held', now() - interval '3 hours', true, '${X.pm}') returning id`));
    const hr = primero(sql(`set session_replication_role = replica; insert into hold_renewals (payment_id, kind, operation_id, business_id, city_id, amount_cents, idem_key, old_held_at, gateway_ref, sent_at, attempts, last_error, created_at)
      values (${pgH}, 'renta', ${opH}, '${X.b}', 'hzl', 5000, 'renta-renov-9t6b-${RUN}', now() - interval '3 hours', null, now() - interval '30 minutes', 1, 'error', now() - interval '30 minutes') returning id`));
    sql(`update hold_renewals set gateway_ref = 'hold_renewals:${hr}' where id = ${hr}`);
    const alH = primero(sql(`insert into money_alerts (kind, subject_id, business_id, city_id, amount_cents, detail) values ('hold_stuck', '${hr}', '${X.b}', 'hzl', 5000,
      '{"es":"La renovación de la retención de ${nH} no tuvo respuesta de Stripe: sigue en camino.","en":"The hold renewal for ${nH} got no answer from Stripe: it is still on its way."}'::jsonb) returning id`));
    ok(!!alH, `una renovación de retención en camino (${nH}) y su alerta hold_stuck`);
    await ingresos(a, nH);
    const fH = a.locator('div').filter({ has: a.getByText(nH, { exact: false }) }).filter({ has: a.getByRole('button', { name: 'Preguntar a Stripe ahora' }) }).last();
    ok((await vis(fH.getByRole('button', { name: 'Preguntar a Stripe ahora' }))) !== null && (await fH.getByRole('button', { name: 'Elegir cuál vale' }).count()) === 0, 'la alerta hold_stuck muestra «Preguntar a Stripe ahora» (y no «Elegir cuál vale»)');
    await fH.scrollIntoViewIfNeeded(); await shot(a, 'hold');
    // Se deja cerrada para que el sandbox no acumule alertas abiertas de esta prueba (una nota «resuelta sola», como la deja el sistema).
    sql(`insert into money_alert_notes (alert_id, action, staff_id, note) values (${alH}, 'resuelta_sola', null, 'Cerrada por la prueba 9t6b.')`);

    // ── Teléfono 390 ──
    const cm = await tel390(b), m = await cm.newPage(); abiertas.push(cm); mirar(m, 'admin-390');
    await entrarComo(m, ADM);
    const L5 = armar(X, 'm');
    await ingresos(m, L5.ref);
    const f5 = filaAl(m, L5.ref);
    ok((await vis(f5.getByRole('button', { name: 'Elegir cuál vale' }))) !== null, 'en el teléfono (390) también se ofrece «Elegir cuál vale»');
    await f5.scrollIntoViewIfNeeded(); await m.screenshot({ path: OUT + 'd9t6b-alerta-m.png' });
    await clic(f5.getByRole('button', { name: 'Elegir cuál vale' }));
    await m.getByText('Qué vale de lo que tiene Stripe').first().waitFor();
    await arriba(m); await m.screenshot({ path: OUT + 'd9t6b-hoja-m.png' });
    await clic(opcion(m, L5.A)); await clic(m.getByText('Cobro duplicado: se queda el primero.', { exact: true })); await clic(m.getByRole('button', { name: 'Decidir', exact: true }));
    await m.getByText(`Decidido: vale ${L5.A}`).first().waitFor({ timeout: 30000 });
    await m.screenshot({ path: OUT + 'd9t6b-resultado-m.png' });
    ok(estadoDe(L5.oc) === `done||${L5.A}` && cuentas(L5.oc) === '1|1|1', 'en el teléfono: decidido igual (hecha con ese cobro, una devolución, una auditoría)');

    // ── 6 · Uno de otro monto: no se ofrece; la hoja dice por qué ──
    console.log('6 · Dos cobros, uno de otro monto: solo se ofrece el que cuadra; el otro sale como información con su porqué');
    const L6 = armar(X, 'o', { otroMonto: true });
    await ingresos(a, L6.ref);
    await clic(filaAl(a, L6.ref).getByRole('button', { name: 'Elegir cuál vale' }));
    await a.getByText('Qué vale de lo que tiene Stripe').first().waitFor();
    t = await texto(a);
    const e6 = etiq('$99.00', L6.cC, L6.C);
    ok((await vis(opcion(a, L6.A))) !== null && (await opcion(a, L6.C).count()) === 0, 'el de $149.00 se ofrece; el de otro monto NO es una opción');
    ok(t.includes('No se puede elegir:') && sinEsp(t).includes(sinEsp(`${e6} (otro monto: no es el de la intención)`)), `la hoja dice cuál no se puede elegir y por qué («${e6} (otro monto: no es el de la intención)»)`);
    await arriba(a); await shot(a, 'hoja-otro-monto');
    await clic(opcion(a, L6.A)); await clic(a.getByText('Cobro duplicado: se queda el primero.', { exact: true })); await clic(a.getByRole('button', { name: 'Decidir', exact: true }));
    await a.getByText(`Decidido: vale ${L6.A}`).first().waitFor({ timeout: 30000 });
    ok(estadoDe(L6.oc) === `done||${L6.A}` && cuentas(L6.oc) === '1|1|1' && sql(`select amount_cents from gateway_refunds where subject_kind = 'offsession_charges' and subject_id = ${L6.oc} and stripe_id = '${L6.C}'`) === '9900',
      'decidido: vale el de $149.00 y el de otro monto se devuelve por SU monto ($99.00)');

    ok(!err.length, 'sin errores en las páginas' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
    console.log(`\nOK · ${n} comprobaciones`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => undefined);
    await b.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
