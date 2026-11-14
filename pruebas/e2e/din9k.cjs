// 9k · Dinero real listo (fase9-apertura.md §4 9k), contra el simulador de pagos del sandbox:
//   1) tarjeta con 3-D Secure (4000 0027 6000 3184) → el banco pide confirmar y se completa en la hoja; el pedido sale con la MISMA retención (un solo cobro)
//      y la huella de la tarjeta queda en el cobro; «No fui yo» → no hay pedido (teléfono 390);
//   2) renovación de Pro con 3-D Secure → aviso al dueño con el enlace → confirma en la hoja (escritorio 1360) → Pro activo, un solo cobro; otra cuenta no
//      abre ese enlace;
//   3) un día con dos diferencias (una retención suelta y un cobro que Stripe no tiene) → «Conciliar otra vez» → la corrida, sus filas, la alerta al equipo
//      y «el dinero no cuadra» en Inicio; «Me hago cargo» y «Resuelta» las dejan con dueño;
//   4) disputa → Transacciones › Disputas → responder en la cola → los tres archivos (recibo, conversación, constancia) subidos y enviados al simulador;
//   5) la misma tarjeta en tres cuentas → la señal en Confianza; 6) quitar una tarjeta guardada desde Mi cuenta › Pagos.
// Precondiciones propias (orden indiferente): cuentas nuevas con teléfonos 555 libres y SUS tarjetas, Sabor Dominicano con su cuenta de cobro simulada y la
// tarjeta encendida (se deja como estaba), un día de la conciliación elegido al azar, su propio pedido para la disputa. Nada depende de otra prueba.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const crypto = require('crypto');
const { entrarComo, telLibre, abiertoTodoElDia, publicarBarberia, sql } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT, BIZ = 'sabor-dominicano', ADM = '5705550199', PEDRO = '5705550133';
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400)); };
const espera = async (f, v, veces = 60) => { for (let i = 0; i < veces; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const tel390 = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const desk = (b) => b.newContext({ viewport: { width: 1360, height: 900 } });
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `din9k-${nom}.png`, fullPage: full });
const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
// La huella simulada (lib/pagos/pasarela.ts · huellaSim): la misma marca y los mismos 4 dan la misma huella en cualquier cuenta.
const huella = (marca, l4) => 'fpsim' + crypto.createHash('sha256').update(`tl-sim-card:${marca}:${l4}`).digest('hex').slice(0, 20);
const RUN = Date.now().toString(36);

(async () => {
  // ── Precondiciones propias ──
  sql(`insert into platform_config (key, value, note, updated_by) values ('entorno', '"pruebas"'::jsonb, 'Sandbox (din9k)', 'semilla') on conflict (key) do update set value = excluded.value`);
  const antesTarjeta = sql(`select coalesce((select pay_card::text || '|' || auto_accept::text from delivery_settings where business_id = '${BIZ}'), '')`);
  sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${BIZ}', 'acct_sim_${BIZ}', 'enabled', true, true, true)
       on conflict (business_id) do update set status = 'enabled', charges_enabled = true, payouts_enabled = true, simulated = true, payouts_paused = false`);
  sql(`update delivery_settings set pay_card = true, auto_accept = false where business_id = '${BIZ}'`);
  const volverHoras = abiertoTodoElDia(BIZ);
  sql(`update menu_settings set pause_until = null where business_id = '${BIZ}'`);
  const FLAN = sql(`select id from items where business_id = '${BIZ}' and name->>'es' = 'Flan de leche' and removed_at is null limit 1`);
  sql(`update items set sold_out = false, stock_left = greatest(stock_left, stock_par), stock_day = null where id = ${FLAN}`);
  const VEC = telLibre(), OTRO1 = telLibre(), OTRO2 = telLibre();
  // Unos últimos 4 que nadie usa (ni las tarjetas especiales del simulador): la señal de la tarjeta es de esta corrida.
  let L4 = ''; for (let i = 0; i < 50 && !L4; i++) { const c = String(1000 + Math.floor(Math.random() * 8999)); if (!['0002', '9995', '0069', '3184', '4242'].includes(c) && sql(`select count(*) from payment_methods where card_fingerprint = '${huella('visa', c)}'`) === '0') L4 = c; }
  ok(!!L4, `una tarjeta propia de esta corrida (·· ${L4})`);
  const b = await chromium.launch();
  const abiertas = [], err = [];
  const mirar = (p, tag) => { p.on('pageerror', (e) => err.push(`${tag} ${e.message}`)); };
  try {
    // ── 1 · 3-D Secure en la hoja (teléfono 390) ──
    console.log('1 · Tarjeta con 3-D Secure: el banco pide confirmar y se completa en la hoja');
    const cm = await tel390(b), m = await cm.newPage(); abiertas.push(cm); mirar(m, 'vecino');
    await entrarComo(m, VEC, { nombre: 'Vera', apellido: 'Nueve' });
    const U = uid(VEC);
    const alCheckout = async () => {
      await m.goto(B + '/n/' + BIZ);
      await m.evaluate((l) => { localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: l } })); localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' })); }, [{ id: FLAN, ch: {}, q: 1, nt: '', k: {} }]);
      await m.goto(B + '/n/' + BIZ + '/pagar'); await m.getByText(/Retenemos|Se cobran/).first().waitFor();
    };
    const agregar = async (num) => {
      await clic(m.locator('[data-screen-label="Checkout · tarjeta"]'));
      const h = m.locator('[data-screen-label="Método de pago"]');
      if (await h.getByText('Agregar tarjeta de crédito o débito').count()) await h.getByText('Agregar tarjeta de crédito o débito').click();
      await h.getByLabel('Número de la tarjeta').fill(num); await h.getByLabel('Vence').fill('1230'); await h.getByLabel('CVC').fill('123'); await h.getByLabel('Código postal').fill('18201'); await h.getByLabel('Nombre en la tarjeta').fill('Vera Nueve');
      await h.getByText('Usar esta tarjeta', { exact: true }).click(); await h.waitFor({ state: 'detached' });
    };
    const enviar = async () => { const x = m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/); await x.waitFor({ timeout: 15000 }); await x.click(); };
    await alCheckout();
    // Primero guarda la tarjeta ·· L4 (la de la señal): queda con su huella, como cualquier tarjeta guardada.
    await agregar('400000000000' + L4);
    ok(sql(`select card_fingerprint from payment_methods where user_id = '${U}' and last4 = '${L4}' and status = 'active'`) === huella('visa', L4), 'guardar una tarjeta guarda su huella (card.fingerprint)');
    await agregar('4000002760003184');
    ok(sql(`select count(*) from payment_methods where user_id = '${U}' and last4 = '3184' and status = 'active'`) === '1', 'la tarjeta que pide 3-D Secure, guardada');
    const pedidosAntes = sql(`select count(*) from operations where user_id = '${U}'`);
    await enviar();
    const hoja = m.locator('[data-pantalla="PAGO-3DS"]');
    await hoja.first().waitFor({ timeout: 15000 });
    ok(/Tu banco pide confirmar/.test(await texto(m)) && /3-D SECURE · \$/.test(await texto(m)), 'la hoja «Tu banco pide confirmar» con el monto (lo decidió el servidor)');
    await shot(m, '3ds-hoja-390', false);
    ok(sql(`select count(*) from operations where user_id = '${U}'`) === pedidosAntes, 'todavía no hay pedido: nada se guarda sin la verificación');
    const PA = sql(`select pi || '|' || status || '|' || amount_cents from payment_actions where user_id = '${U}' and kind = 'en_sesion' order by created_at desc limit 1`).split('|');
    ok(PA[1] === 'pendiente' && Number(PA[2]) > 0, 'la verificación queda pendiente a su nombre');
    await clic(hoja.getByRole('button', { name: 'Confirmar con mi banco' }));
    await m.waitForURL(/\/pedido\/\d+$/, { timeout: 20000 });
    const N1 = m.url().split('/').pop();
    ok(sql(`select p.stripe_payment_intent || '|' || p.status from payments p join operations o on o.id = p.operation_id where o.number = '${N1}'`) === `${PA[0]}|held`, `pedido #${N1}: retenido con la MISMA retención que se verificó`);
    ok(sql(`select status from payment_actions where pi = '${PA[0]}'`) === 'verificada', 'la verificación queda hecha');
    ok(sql(`select count(*) from payment_actions where base_idem = (select base_idem from payment_actions where pi = '${PA[0]}')`) === '1', 'un solo cobro en el banco (la segunda vez reusó el verificado)');
    ok(sql(`select p.card_fingerprint from payments p join operations o on o.id = p.operation_id where o.number = '${N1}'`) === huella('visa', '3184'), 'el cobro guarda la huella de la tarjeta');
    await shot(m, '3ds-pedido-390');
    // «No fui yo»: el banco no confirma → no hay pedido y lo retenido no se cobra.
    await alCheckout(); await enviar(); await hoja.first().waitFor({ timeout: 15000 });
    await clic(hoja.getByRole('button', { name: 'No fui yo' }));
    await m.getByText(/Tu banco no confirmó el pago/).first().waitFor();
    ok(sql(`select count(*) from operations where user_id = '${U}'`) === String(Number(pedidosAntes) + 1), '«No fui yo» → el banco no confirma y no hay otro pedido');

    // ── 6 · Quitar una tarjeta guardada (Mi cuenta › Pagos) ──
    console.log('6 · Quitar una tarjeta guardada desde Mi cuenta › Pagos');
    await m.goto(B + '/cuenta/pagos'); await m.getByText('Tus tarjetas').first().waitFor();
    ok((await texto(m)).includes(`Visa ·· ${L4}`) && (await texto(m)).includes('Visa ·· 3184'), 'Mi cuenta › Pagos: sus dos tarjetas');
    await shot(m, 'pagos-390');
    const fila = m.locator('div').filter({ has: m.getByText(`Visa ·· ${L4}`, { exact: true }) }).filter({ has: m.getByRole('button', { name: 'Quitar' }) }).last();
    await clic(fila.getByRole('button', { name: 'Quitar' }));
    await clic(m.getByText('Quitar tarjeta', { exact: true }).last());
    await m.getByText('Tarjeta quitada.').first().waitFor();
    ok(sql(`select status from payment_methods where user_id = '${U}' and last4 = '${L4}' order by id desc limit 1`) === 'removed', 'la tarjeta queda «quitada» (nada se borra)');

    // ── 5 · La misma tarjeta en tres cuentas → la señal de Confianza ──
    console.log('5 · La misma tarjeta (por su huella) en tres cuentas → la señal');
    for (const t of [OTRO1, OTRO2]) {
      sql(`insert into users (phone, first_name, last_name, home_city_id, lang, is_test) values ('+1${t}', 'Prueba', 'Huella', 'hzl', 'es', true) on conflict (phone) do nothing`);
      sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated, card_fingerprint) values ((select id from users where phone = '+1${t}'), 'pm_sim_visa_${L4}_${crypto.randomBytes(4).toString('hex')}', 'visa', '${L4}', '12/30', true, true, '${huella('visa', L4)}')`);
    }
    const ca = await desk(b), a = await ca.newPage(); abiertas.push(ca); mirar(a, 'admin');
    await entrarComo(a, ADM);
    ok(sql(`select cuentas from tarjetas_en_varias_cuentas(3, 90) where huella = '${huella('visa', L4)}'`) === '3', 'la base cuenta tres cuentas con esa huella');
    await a.goto(B + '/admin/confianza?tab=fraud'); await a.getByText('LA MISMA TARJETA EN VARIAS CUENTAS · 90 DÍAS').first().waitFor();
    ok((await texto(a)).includes(`VISA ·· ${L4} · 3 cuentas`), `Confianza › Fraude: «VISA ·· ${L4} · 3 cuentas»`);
    await shot(a, 'senal-1360', false);

    // ── 3 · Un día con dos diferencias → «Conciliar otra vez» → filas, alerta e Inicio ──
    console.log('3 · Un día con dos diferencias: la corrida, sus filas, la alerta y «el dinero no cuadra»');
    // Un día de los últimos 14 (para «el dinero no cuadra» en Inicio) sin alerta todavía: la alerta es una por día, y otra corrida en la misma base
    // (dos veces seguidas) toma otro día. Si ya no queda ninguno libre, el aviso al equipo no se repite (una por día) y la prueba lo dice.
    const DIA = sql(`select to_char(d, 'YYYY-MM-DD') from (select (now() at time zone 'UTC')::date - g as d from generate_series(4, 13) g) x
                      order by exists (select 1 from money_alerts a where a.kind = 'recon_diff' and a.subject_id = to_char(x.d, 'YYYY-MM-DD')), random() limit 1`);
    const alertaNueva = sql(`select count(*) from money_alerts where kind = 'recon_diff' and subject_id = '${DIA}'`) === '0';
    const T = `${DIA} 15:00:00+00`, PH = `pi_sim_din9k_${RUN}_suelta`, PL = `pi_sim_din9k_${RUN}_libro`;
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, card, created_at) values ('${PH}', 2500, 0, 'acct_sim_${BIZ}', 'requires_capture', 'pm_sim_visa_4242', '${T}')`);
    // El cobro que el libro tiene y Stripe no: su propia operación terminada (nada lo repara ni lo suelta después).
    const kl = crypto.randomUUID();
    const OPL = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, pay_mode, subtotal_cents, tax_cents, total_cents, sent_at, done_at, client_key, is_test)
      values (nextval('operations_order_seq')::text, 'order', 'hzl', '${BIZ}', '${U}', 'done', 'picked_up', 'pickup', 'app', 700, 0, 700, '${T}', '${T}', '${kl}', true) returning id`).split('\n')[0];
    sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, held_at, captured_at, simulated, created_at)
         values (${OPL}, '${U}', '${BIZ}', 'hzl', 'full', 1, 'card', '${PL}', 700, 700, 0, 'captured', '${T}', '${T}', true, '${T}')`);
    const avisosAntes = Number(sql(`select count(*) from notifications where tpl = 'din_alerta' and user_id = '${uid(ADM)}'`));
    await a.goto(B + `/admin/planes?tab=ing&dia=${DIA}`); await a.getByText('CONCILIACIÓN DIARIA · STRIPE CONTRA NUESTRO LIBRO').first().waitFor();
    await clic(a.getByRole('button', { name: 'Conciliar otra vez' }));
    await clic(a.getByText('La corrida de la mañana falló.', { exact: true })); await clic(a.getByRole('button', { name: 'Conciliar', exact: true }).last());
    await a.getByText(/tiene \d+ diferencias? \(\d+ sin dueño\)/).first().waitFor({ timeout: 30000 });
    const RUNID = sql(`select id from recon_runs where day = '${DIA}' order by finished_at desc, id desc limit 1`);
    ok(sql(`select status || '|' || por from recon_runs where id = ${RUNID}`) === 'diferencias|equipo', 'la corrida: diferencias, la pidió el equipo');
    ok(sql(`select count(*) from recon_diffs where run_id = ${RUNID} and diff_key in ('hold_orphan:falta_en_libro:${PH}', 'payment_intent:falta_en_stripe:${PL}')`) === '2', 'sus dos filas: la retención suelta y el cobro que Stripe no tiene');
    ok(sql(`select count(*) from money_alerts where kind = 'recon_diff' and subject_id = '${DIA}'`) === '1', 'la alerta «el dinero no cuadra» (una por día)');
    if (alertaNueva) ok(await espera(() => Number(sql(`select count(*) from notifications where tpl = 'din_alerta' and user_id = '${uid(ADM)}'`)) > avisosAntes, true) === true, 'le llega al equipo de dinero (Admin)');
    else ok(Number(sql(`select count(*) from notifications where tpl = 'din_alerta' and user_id = '${uid(ADM)}'`)) === avisosAntes, 'ese día ya tenía su alerta: no se avisa dos veces');
    await a.goto(B + `/admin/planes?tab=ing&dia=${DIA}`); await a.getByText(PH).first().waitFor();
    ok((await texto(a)).includes('Retención suelta: está en Stripe y no en nuestro libro') && (await texto(a)).includes('Cobro: está en nuestro libro y no en Stripe'), 'Planes › Ingresos: las dos diferencias con su explicación');
    await shot(a, 'conciliacion-1360');
    await a.goto(B + '/admin'); ok((await texto(a)).includes('EL DINERO NO CUADRA'), 'Inicio: «EL DINERO NO CUADRA»');
    await shot(a, 'inicio-1360', false);
    await a.goto(B + `/admin/planes?tab=ing&dia=${DIA}`); await a.getByText(PH).first().waitFor();
    const filaDif = (pi, boton) => a.locator('div').filter({ has: a.getByText(new RegExp(pi)) }).filter({ has: a.getByRole('button', { name: boton }) }).last();
    await clic(filaDif(PH, 'Me hago cargo').getByRole('button', { name: 'Me hago cargo' }));
    await clic(a.getByText('La reviso hoy con Stripe.', { exact: true })); await clic(a.getByRole('button', { name: 'Me hago cargo', exact: true }).last());
    await a.getByText('Es tuya. Quedó en la auditoría.').first().waitFor();
    await a.goto(B + `/admin/planes?tab=ing&dia=${DIA}`); await a.getByText(PL).first().waitFor();
    await clic(filaDif(PL, 'Resuelta').getByRole('button', { name: 'Resuelta' }));
    await clic(a.getByText('Se ajustó el libro con su caso.', { exact: true })); await clic(a.getByRole('button', { name: 'Marcar resuelta', exact: true }).last());
    await a.getByText('Resuelta. Quedó en la auditoría.').first().waitFor();
    ok(sql(`select action from recon_diff_notes where diff_key = 'hold_orphan:falta_en_libro:${PH}' order by at desc, id desc limit 1`) === 'me_hago_cargo'
      && sql(`select action from recon_diff_notes where diff_key = 'payment_intent:falta_en_stripe:${PL}' order by at desc, id desc limit 1`) === 'resuelta', 'una con dueño y otra resuelta (solo inserción, con su nota)');
    ok(Number(sql(`select count(*) from audit_entries where action in ('conciliacion.me_hago_cargo', 'conciliacion.resuelta', 'conciliacion.correr') and at > now() - interval '10 minutes' and actor_id = '${uid(ADM)}'`)) >= 3, 'todo en la auditoría');
    ok(sql(`select sin_dueno from conciliacion_del_dia('${DIA}')`) === '0' || sql(`select count(*) from recon_diffs d where run_id = ${RUNID} and diff_key not like '%din9k_${RUN}%'`) !== '0', 'sin dueño en 0 (o solo lo que no es de esta prueba)');

    // ── 4 · Disputa → Transacciones › Disputas → responder con los tres archivos ──
    console.log('4 · Disputa con evidencia: los tres archivos subidos y enviados al simulador');
    const k = crypto.randomUUID(), PD = `pi_sim_din9k_${RUN}_disputa`;
    const ND = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, pay_mode, subtotal_cents, tax_cents, total_cents, sent_at, done_at, client_key, is_test)
      values (nextval('operations_order_seq')::text, 'order', 'hzl', '${BIZ}', '${U}', 'done', 'picked_up', 'pickup', 'app', 1650, 99, 1749, now() - interval '3 hours', now() - interval '2 hours', '${k}', true) returning number`).split('\n')[0];
    sql(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct) select o.id, x.id, x.name, 1, 1650, 1650, 6 from operations o, items x where o.client_key = '${k}' and x.id = ${FLAN}`);
    for (const [ev, h] of [['sent', 3], ['accepted', 2.9], ['ready', 2.5], ['picked_up', 2]]) sql(`insert into operation_events (operation_id, kind, actor, at) select id, '${ev}', '${ev === 'sent' || ev === 'picked_up' ? 'user' : 'business'}', now() - interval '${h} hours' from operations where client_key = '${k}'`);
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card) values ('${PD}', 1749, 165, 'acct_sim_${BIZ}', 'succeeded', 1749, 'pm_sim_visa_4242')`);
    const PID = sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, captured_at, simulated, seq)
      select id, user_id, business_id, city_id, 'full', 'card', '${PD}', 1749, 1749, 165, 'captured', 'visa', '4242', now() - interval '2 hours', true, 1 from operations where client_key = '${k}' returning id`).split('\n')[0];
    await a.goto(B + `/admin/transacciones?q=${ND}`); await clic(a.getByText('Simular disputa', { exact: true }));
    await clic(a.getByText('No recibió el pedido', { exact: true })); await clic(a.getByText('Prueba de disputa en el sandbox.', { exact: true })); await clic(a.getByRole('button', { name: 'Simular' }).last());
    await a.getByText(/Disputa simulada/).first().waitFor();
    const DID = sql(`select id from disputes where payment_id = ${PID}`), SID = sql(`select stripe_dispute_id from disputes where id = ${DID}`);
    ok(!!DID && sql(`select status from disputes where id = ${DID}`) === 'needs_response', 'la disputa llega (falta responder)');
    await a.goto(B + '/admin/transacciones/disputas'); await a.getByText('Disputas con el banco').first().waitFor();
    ok((await texto(a)).includes(`Disputa · pedido #${ND}`) && (await texto(a)).includes('evidencia sin armar'), 'Transacciones › Disputas: la cola de 120 h con su plazo y la evidencia sin armar');
    await shot(a, 'disputas-1360');
    const Q = sql(`select id from queue_items where queue = 'disputa' and subject_id = '${DID}' and status = 'open'`);
    await a.goto(B + '/admin/colas?caso=' + Q); await a.getByText('ARCHIVOS PARA EL BANCO').first().waitFor();
    ok((await texto(a)).includes('Recibo en PDF') && (await texto(a)).includes('Conversación con el cliente (PDF, sin teléfonos)') && (await texto(a)).includes('Constancia de entrega y línea de tiempo (PDF)'), 'la cola: los tres archivos que van al banco');
    await clic(a.getByRole('button', { name: 'Responder con evidencia' })); await clic(a.getByText(/The customer placed this order/).first()); await clic(a.getByRole('button', { name: 'Enviar al banco' }));
    await a.getByText(/Respondida. El banco decide/).first().waitFor({ timeout: 30000 });
    ok(sql(`select count(*) from dispute_evidence where dispute_id = ${DID} and stripe_file_id like 'file_sim_%' and sent_at is not null`) === '3', 'tres archivos subidos (API de archivos del simulador) y enviados');
    const EV = JSON.parse(sql(`select evidence::text from sim_dispute_submissions where dispute_id = '${SID}' order by id desc limit 1`) || '{}');
    ok(/^file_sim_/.test(EV.receipt) && /^file_sim_/.test(EV.customer_communication) && /^file_sim_/.test(EV.shipping_documentation), 'el «banco» del simulador recibió recibo, conversación y constancia en el mismo envío');
    ok(sql(`select status || '|' || (evidence_submitted_at is not null) from disputes where id = ${DID}`) === 'under_review|true' && sql(`select status from sim_disputes where id = '${SID}'`) === 'under_review', 'la disputa: el banco revisa (en los dos lados)');
    await a.goto(B + '/admin/transacciones/disputas?f=revisa'); ok((await texto(a)).includes(`Disputa · pedido #${ND}`) && (await texto(a)).includes('evidencia enviada (3 archivos)'), 'Transacciones › Disputas: «evidencia enviada (3 archivos)»');

    // ── 2 · Renovación de Pro con 3-D Secure → enlace al dueño → confirma en la hoja (escritorio 1360) ──
    console.log('2 · Renovación de Pro con 3-D Secure: el aviso con el enlace y la hoja del banco');
    const bar = await publicarBarberia(b);
    const PM = `pm_sim_visa_3184_${crypto.randomBytes(4).toString('hex')}`;
    sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated, card_fingerprint) values ('${bar.uid}', '${PM}', 'visa', '3184', '12/30', true, true, '${huella('visa', '3184')}')`);
    sql(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, current_period_end, trial_choice) values ('${bar.id}', 'active', 'month', '${bar.uid}', '${PM}', now() - interval '1 minute', 'card')
         on conflict (business_id) do update set status = 'active', cycle = 'month', payer_user_id = excluded.payer_user_id, card_pm = excluded.card_pm, current_period_end = excluded.current_period_end, failed_attempts = 0, next_attempt_at = null`);
    const cd = await desk(b), d = await cd.newPage(); abiertas.push(cd); mirar(d, 'dueño');
    await entrarComo(d, bar.tel);
    await d.goto(B + `/panel/${bar.id}/hoy`); // el panel procesa el plan de ESE negocio (sin esperar al barrido)
    const RA = sql(`select pi || '|' || status from payment_actions where business_id = '${bar.id}' and kind = 'renovacion' order by created_at desc limit 1`).split('|');
    ok(RA[1] === 'pendiente' && sql(`select status from subscriptions where business_id = '${bar.id}'`) === 'past_due', 'el banco pide confirmar: la verificación queda a nombre del dueño y el plan espera');
    ok(sql(`select count(*) from notifications where tpl = 'pro_verify' and user_id = '${bar.uid}' and href = '/pago/verificar?pi=${encodeURIComponent(RA[0])}'`) === '1', 'el aviso «Tu banco pide confirmar el cobro de Pro» con su enlace');
    ok(sql(`select count(*) from notifications where tpl = 'pro_failed' and user_id = '${bar.uid}' and created_at > now() - interval '5 minutes'`) === '0', 'no le llega además «cobro fallido»');
    // Otra cuenta no abre ese enlace.
    const co = await desk(b), o = await co.newPage(); abiertas.push(co);
    await entrarComo(o, VEC); const r404 = await o.goto(B + `/pago/verificar?pi=${encodeURIComponent(RA[0])}`); ok(r404.status() === 404, 'otra cuenta: ese enlace no existe (404)');
    await d.goto(B + `/pago/verificar?pi=${encodeURIComponent(RA[0])}`); await d.locator('[data-pantalla="PAGO-VERIFICAR"]').waitFor();
    // La hoja se abre sola con la verificación pendiente (si se cerró, «Confirmar con mi banco» de la página la abre otra vez).
    if (!(await vis(d.locator('[data-pantalla="PAGO-3DS"]')))) await clic(d.locator('[data-pantalla="PAGO-VERIFICAR"]').getByRole('button', { name: 'Confirmar con mi banco' }));
    await vis(d.locator('[data-pantalla="PAGO-3DS"]')) ?? await d.locator('[data-pantalla="PAGO-3DS"]').last().waitFor(); await shot(d, 'renovacion-hoja-1360', false);
    await clic(d.locator('[data-pantalla="PAGO-3DS"]').getByRole('button', { name: 'Confirmar con mi banco' }));
    await d.getByText('Listo: tu banco lo confirmó').first().waitFor({ timeout: 20000 });
    ok(sql(`select status || '|' || failed_attempts from subscriptions where business_id = '${bar.id}'`) === 'active|0', 'Pro activo otra vez, sin intentos fallidos');
    ok(sql(`select count(*) from subscription_events where business_id = '${bar.id}' and kind = 'charged'`) === '1', 'un solo cobro de Pro anotado');
    await d.goto(B + `/panel/${bar.id}/hoy`);
    ok(sql(`select count(*) from subscription_events where business_id = '${bar.id}' and kind = 'charged'`) === '1' && sql(`select count(*) from payment_actions where business_id = '${bar.id}'`) === '1', 'abrir el panel otra vez no cobra de nuevo');
    await shot(d, 'renovacion-listo-1360', false);

    ok(!err.length, 'sin errores en las páginas' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
    console.log(`\nOK · ${n} comprobaciones`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => undefined);
    await b.close();
    volverHoras();
    if (antesTarjeta) { const [pc, aa] = antesTarjeta.split('|'); sql(`update delivery_settings set pay_card = ${pc}, auto_accept = ${aa} where business_id = '${BIZ}'`); }
  }
})().catch((e) => { console.error(e); process.exit(1); });
