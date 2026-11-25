// 9y (25 nov, LAUNCH «Lo que queda de "promete antes de actuar"» d) · Las hojas de cancelar de la noche (mesa y lista), la fiesta, la inscripción, el viaje y el
// evento privado dicen lo que se va a PEDIR según el cobro en la base (lib/devolucion-cancelar.ts › pideAlCancelar), nunca «te devolvemos» antes de actuar; y
// los avisos de «otra hora» (noche_alt, fiesta_alt y viaje_alt, 0224) prometen soltar la retención solo si hay algo retenido (pideSoltarSi). Hasta hoy ninguna
// prueba de punta a punta miraba las dos cosas juntas (din9v4/din9v5 miran lo que PASÓ después de cancelar; esta mira lo que se DICE ANTES):
//   1. Las hojas, cada una con el cobro retenido (held), cobrado (captured) y con una devolución parcial (partially_refunded), en ES y en EN, con el texto exacto
//      («Pedimos que se suelte la retención de $X de tu tarjeta; aquí ves cuando se suelte.» / «Pedimos la devolución de $Y a tu tarjeta; aquí ves cuando salga.»),
//      el monto como lo formatea cada pantalla (dinero() quita el «.00»; la parcial pide solo lo que queda) y sin la frase de la otra clase. La lista de la noche
//      (sin depósito) dice «No se cobra nada».
//   2. «Otra hora» desde el panel (las acciones de verdad): el aviso al cliente de la noche, la fiesta y el viaje, con la retención (la frase de «No me sirve» con su
//      monto) y sin depósito (ninguna frase de retención), en ES y en EN (el idioma de quien lo recibe).
// Precondiciones propias (corre dos veces seguidas): sus negocios, su dueña, sus clientes (teléfonos 555 libres) y sus operaciones; la noche usa La Terraza (la semilla:
// necesita sus horas para que «otra hora» valga). Siembra y actúa seguido (el barrido de cada minuto no toca lo que sigue vivo con tiempo), y al final deja lo suyo
// cerrado: operaciones canceladas, cobros soltados o devueltos, sin simuladores ni avisos (la base no deja borrar operaciones ni eventos).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const crypto = require('crypto'); const fs = require('fs');
const { entrarComo, sql } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l));
const RUN = crypto.randomBytes(4).toString('hex');
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!require('../lib/telefonos-fijos.cjs').esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };
const num = (p) => `${p}-9${String(crypto.randomInt(1e8)).padStart(8, '0')}`;
// Las acciones del servidor por su id del build (como din9v3/din9v4/din9v5): la misma llamada que hace la pantalla, desde una página donde vive la acción.
const MAN = JSON.parse(fs.readFileSync(ENT.RAIZ + '/apps/web/.next/server/server-reference-manifest.json', 'utf8')).node;
const ACT = Object.fromEntries(Object.entries(MAN).map(([id, v]) => [v.exportedName, id]));
const accion = async (p, nombre, args) => {
  if (!ACT[nombre]) throw new Error('acción sin id en el build: ' + nombre);
  const r = await p.evaluate(async ([id, args]) => { const x = await fetch(location.pathname + location.search, { method: 'POST', headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, body: JSON.stringify(args) }); return { st: x.status, t: await x.text() }; }, [ACT[nombre], args]);
  const l = r.t.split('\n').find((x) => /^1:/.test(x));
  let j = null; try { j = l ? JSON.parse(l.slice(2)) : null; } catch { j = null; }
  return { st: r.st, j, t: r.t };
};
const cuerpoAviso = (num, tpl) => sql(`select body from notifications where tpl = '${tpl}' and ref_id = '${num}' order by id desc limit 1`).replace(/\s+/g, ' ');
const dim = (s) => s.replace(/\s+/g, ' ').trim();

// ── El monto como lo formatea cada pantalla (se copian aquí a propósito: la prueba no importa el código que mide) ──
const loc = (c, min, max) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max })}`;
const F = {
  noche: (c) => loc(c, c % 100 ? 2 : 0, c % 100 ? 2 : 0),            // noche-comun › usdN
  insc: (c) => loc(c, c % 100 ? 2 : 0, c % 100 ? 2 : 0),             // inscripciones-comun › usdI
  fiesta: (c) => loc(c, c % 100 ? 2 : 0, 2),                          // dinero-comun › usd (FiestaEstado › dinero y fiestas-reservas › money, el del aviso)
  viaje: (c) => { const d = c / 100; return `$${d % 1 ? d.toFixed(2) : Math.round(d).toLocaleString('en-US')}`; }, // ViajeEstado › dinero
  viajeAviso: (c) => loc(c, c % 100 ? 2 : 0, 2),                      // viajes › money = usdTxt = dinero-comun › usd (sin centavos si son .00)
  privado: (c) => loc(c, c % 100 ? 2 : 0, 2),                         // evento-privado-comun › dinero
};
// Lo que dicen las hojas (texto exacto de devolucion-cancelar › pideAlCancelar).
const SUELTA = { es: (m) => `Pedimos que se suelte la retención de ${m} de tu tarjeta; aquí ves cuando se suelte.`, en: (m) => `We ask for the ${m} hold to come off your card; you see here when it does.` };
const DEVUELVE = { es: (m) => `Pedimos la devolución de ${m} a tu tarjeta; aquí ves cuando salga.`, en: (m) => `We request a refund of ${m} to your card; you see here when it goes through.` };
// Lo que dicen los avisos de «otra hora» (pideSoltarSi «sirve», con su espacio delante).
const SIRVE = { es: (m) => ` Si no te sirve, pedimos que se suelte la retención de ${m} de tu tarjeta.`, en: (m) => ` If it does not work for you, we ask for the ${m} hold to come off your card.` };
const PROMETE = /Te devolvemos|We will refund|We'll refund|se libera tu dep|se libera lo retenido|your deposit is released|the hold is released/;

const creados = { ops: [], pis: [], negocios: [] };
(async () => {
  const persona = (nombre, lang = 'es') => { const t = telPropio(); sql(`insert into users (phone, first_name, last_name, lang) values ('+1${t}', '${nombre}', 'Nueve Y', '${lang}')`); return { tel: t, id: sql(`select id from users where phone = '+1${t}'`) }; };
  const DUENA = persona('Dueña');
  const CLI = persona('Cliente');                       // quien cancela: las hojas se leen en ES y en EN con la cookie tl_lang
  const negocio = (id, cat, nombre) => {
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${id}', 'hzl', '${cat}', '${nombre}', 'active')`);
    sql(`insert into business_members (business_id, user_id, kind, display_name) values ('${id}', '${DUENA.id}', 'owner', 'Dueña')`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${id}', 'pro') on conflict (business_id) do update set plan = 'pro'`);
    sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${id}', 'acct_sim_${id}', 'enabled', true, true, true)`);
    creados.negocios.push(id);
    return primero(sql(`insert into items (business_id, name, price_cents) values ('${id}', '{"es":"Servicio 9y ${RUN}","en":"Service 9y ${RUN}"}'::jsonb, 4500) returning id`));
  };
  const NY = (dias, hora) => `((now() at time zone 'America/New_York')::date + ${dias} + time '${hora}') at time zone 'America/New_York'`;
  // Una operación. night: la columna night_date (días desde hoy); resp: respond_by dentro de 25 min (lo que espera respuesta).
  const operacion = ({ nm, kind, biz, uid, st, sched = 'null', dur = 'null', det, party = 2, total = 0, dep = 0, night = null, resp = false }) => {
    const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, details, party_size, ${night == null ? '' : 'night_date, '}subtotal_cents, total_cents, deposit_cents, pay_mode, client_key, is_test, confirmed_at, respond_by)
      values ('${nm}', '${kind}', 'hzl', '${biz}', '${uid}', '${st}', ${sched}, ${dur}, '${JSON.stringify(det)}'::jsonb, ${party}, ${night == null ? '' : `(now() at time zone 'America/New_York')::date + ${night}, `}0, ${total}, ${dep}, 'app', gen_random_uuid(), true,
      ${st === 'confirmed' ? 'now()' : 'null'}, ${resp ? "now() + interval '25 minutes'" : 'null'}) returning id`));
    creados.ops.push(nm);
    return op;
  };
  // El cobro de la operación: held (solo la autorización), captured o partially_refunded (cobrado y con `dev` devuelto). Lo que dice el libro y el simulador.
  const cobro = (op, nm, uid, biz, kind, cents, pst, dev = 0) => {
    const pi = `pi_sim_9y_${RUN}_${op}`; creados.pis.push(pi);
    const held = pst === 'held';
    sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, capture_method) values ('${pi}', ${cents}, 0, 'acct_sim_${biz}', '${held ? 'requires_capture' : 'succeeded'}', ${held ? 0 : cents}, ${dev}, 'pm_sim_visa_4242_9y', 'manual')`);
    sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, refunded_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated)
         values (${op}, '${uid}', '${biz}', 'hzl', '${kind}', 'card', '${pi}', ${cents}, ${cents}, ${dev}, 0, '${pst}', 'visa', '4242', now(), ${held ? 'null' : 'now()'}, true)`);
    sql(`update operations set pay_status = '${pst}' where id = ${op}`);
  };

  const b = await chromium.launch(); const err = [];
  const contexto = async (lang, tel) => {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await c.addCookies([{ name: 'tl_lang', value: lang, url: B }]);
    const p = await c.newPage(); p.on('pageerror', (e) => err.push(e.message));
    await entrarComo(p, tel); return p;
  };
  try {
    // ── Los negocios y los clientes ──
    const BN = `d9y-n-${RUN}`, SN = negocio(BN, 'NEG-NOCHE', `Noche 9y ${RUN}`);
    const BF = `d9y-f-${RUN}`, SF = negocio(BF, 'NEG-FIESTA', `Salón 9y ${RUN}`);
    const BI = `d9y-i-${RUN}`, SI = negocio(BI, 'NEG-EDU', `Academia 9y ${RUN}`);
    const BV = `d9y-v-${RUN}`, SV = negocio(BV, 'NEG-TRANS', `Van 9y ${RUN}`);
    const BE = `d9y-e-${RUN}`; negocio(BE, 'NEG-FOOD', `Fogón 9y ${RUN}`);
    const SAL = primero(sql(`insert into trip_runs (business_id, city_id, item_id, run_at, seats_total) values ('${BV}', 'hzl', ${SV}, ${NY(3, '19:00')}, 14) returning id`));
    const SAL2 = primero(sql(`insert into trip_runs (business_id, city_id, item_id, run_at, seats_total) values ('${BV}', 'hzl', ${SV}, ${NY(4, '19:00')}, 14) returning id`));
    const FECHA_INSC = sql(`select (current_date + 20)::text`);

    // ── Las operaciones, cada una con su cobro: se siembran justo antes de mirarlas ──
    const nocheMesa = (st, pst, cents, dev) => () => {
      const nm = num('N'), det = { k: 'mesa', item: SN, svc: { es: `Mesa 9y ${RUN}`, en: `Table 9y ${RUN}` }, arrive: 1320, occ: null, door_cents: null, list_until: null, cover_cents: 0, after: null, min_cents: 12000, hr: false, edad: 21, hold: 30, sms: true, cut: 1290, inc: [] };
      const op = operacion({ nm, kind: 'night', biz: BN, uid: CLI.id, st, sched: NY(3, '22:00'), dur: 60, det, party: 4, dep: cents, night: 3, resp: st === 'pending' });
      cobro(op, nm, CLI.id, BN, 'deposit', cents, pst, dev); return nm;
    };
    const nocheLista = () => {
      const nm = num('N'), det = { k: 'lista', item: SN, svc: { es: `Lista 9y ${RUN}`, en: `List 9y ${RUN}` }, arrive: 1320, occ: null, door_cents: 2000, list_until: 660, cover_cents: 2000, after: null, min_cents: 0, hr: false, edad: 21, hold: 30, sms: true, cut: 1290, inc: [] };
      operacion({ nm, kind: 'night', biz: BN, uid: CLI.id, st: 'confirmed', sched: NY(3, '22:00'), dur: 60, det, party: 3, night: 3 }); return nm;
    };
    const fiesta = (st, pst, cents, dev, dia) => () => {
      const nm = num('F'), det = { svc: { es: `Paquete 9y ${RUN}`, en: `Package 9y ${RUN}` }, svcId: SF, k: 'pack', e: 'quince', g: 100, terms: { cancel: 30 }, donde: { k: 'local' }, inc: [] };
      const op = operacion({ nm, kind: 'party', biz: BF, uid: CLI.id, st, sched: NY(dia, '18:00'), dur: 240, det, party: 100, total: 300000, dep: cents, resp: st === 'pending' });
      cobro(op, nm, CLI.id, BF, 'deposit', cents, pst, dev); return nm;
    };
    const insc = (st, pst, cents, dev) => () => {
      const nm = num('I'), det = { rubro: 'edu', k: 'curso', svc: { es: `Curso 9y ${RUN}`, en: `Course 9y ${RUN}` }, group: { es: `Grupo 9y ${RUN}`, en: `Group 9y ${RUN}` }, starts_on: FECHA_INSC, for: 'yo', price_cents: 20000, mat_cents: cents };
      const op = operacion({ nm, kind: 'enrollment', biz: BI, uid: CLI.id, st, det, party: 1, total: 20000, dep: cents, resp: st === 'pending' });
      cobro(op, nm, CLI.id, BI, 'deposit', cents, pst, dev); return nm;
    };
    const viaje = (st, pst, cents, dev) => () => {
      const nm = num('V'), det = { k: 'asiento', run: SAL, svc: { es: `Hazleton → Allentown ${RUN}`, en: `Hazleton → Allentown ${RUN}` }, svcId: SV, adults: 1, kids: 0, inc: [], from: { es: 'Hazleton', en: 'Hazleton' }, to: { es: 'Allentown', en: 'Allentown' }, terms: { feePct: 50, cancelH: 24 } };
      const op = operacion({ nm, kind: 'trip', biz: BV, uid: CLI.id, st, sched: `(select run_at from trip_runs where id = ${SAL})`, dur: 120, det, party: 1, total: cents, resp: st === 'pending' });
      sql(`insert into run_seats (operation_id, run_id, seats) values (${op}, ${SAL}, 1)`);
      cobro(op, nm, CLI.id, BV, 'full', cents, pst, dev); return nm;
    };
    const privado = (pst, cents, dev) => () => {
      const nm = num('EP'), det = { occ: 'familia', area: 'salon', horas: 3, bud: '30', menu: { k: 'buffet', es: 'Buffet criollo', en: 'Creole buffet', cents: 2600 }, ext: [] };
      const op = operacion({ nm, kind: 'private_event', biz: BE, uid: CLI.id, st: 'confirmed', sched: `now() + interval '5 days'`, dur: 180, det, party: 20, total: 50000, dep: cents });
      cobro(op, nm, CLI.id, BE, 'deposit', cents, pst, dev); return nm;
    };

    // pant · hoja · cómo se abre la hoja (ES, EN) · cobro. «retenido» pide soltar; «cobrado» y «parcial» piden la devolución de lo que queda.
    const R = 'held', C = 'captured', P = 'partially_refunded';
    const CASOS = [
      { pant: 'Noche · mesa', f: F.noche, cobro: R, monto: 5250, boton: ['Cancelar la reserva', 'Cancel the booking'], siembra: nocheMesa('pending', R, 5250, 0) },
      { pant: 'Noche · mesa', f: F.noche, cobro: C, monto: 5250, boton: ['Cancelar la reserva', 'Cancel the booking'], siembra: nocheMesa('confirmed', C, 5250, 0) },
      { pant: 'Noche · mesa', f: F.noche, cobro: P, monto: 4000, dev: 1500, boton: ['Cancelar la reserva', 'Cancel the booking'], siembra: nocheMesa('confirmed', P, 4000, 1500) },
      { pant: 'Noche · lista', lista: true, boton: ['Salir de la lista', 'Leave the list'], siembra: nocheLista },
      { pant: 'Fiesta', f: F.fiesta, cobro: R, monto: 50000, boton: ['Cancelar la fecha', 'Cancel the date'], siembra: fiesta('pending', R, 50000, 0, 40) },
      { pant: 'Fiesta', f: F.fiesta, cobro: C, monto: 150000, boton: ['Cancelar la fecha', 'Cancel the date'], siembra: fiesta('confirmed', C, 150000, 0, 41) },
      { pant: 'Fiesta', f: F.fiesta, cobro: P, monto: 50000, dev: 20000, boton: ['Cancelar la fecha', 'Cancel the date'], siembra: fiesta('confirmed', P, 50000, 20000, 42) },
      { pant: 'Inscripción', f: F.insc, cobro: R, monto: 5500, boton: ['Cancelar la inscripción', 'Cancel the enrollment'], siembra: insc('pending', R, 5500, 0) },
      { pant: 'Inscripción', f: F.insc, cobro: C, monto: 6250, boton: ['Cancelar la inscripción', 'Cancel the enrollment'], siembra: insc('confirmed', C, 6250, 0) },
      { pant: 'Inscripción', f: F.insc, cobro: P, monto: 5500, dev: 1500, boton: ['Cancelar la inscripción', 'Cancel the enrollment'], siembra: insc('confirmed', P, 5500, 1500) },
      { pant: 'Viaje', f: F.viaje, cobro: R, monto: 4500, boton: ['Cancelar el viaje', 'Cancel the trip'], siembra: viaje('pending', R, 4500, 0) },
      { pant: 'Viaje', f: F.viaje, cobro: C, monto: 5250, boton: ['Cancelar el viaje', 'Cancel the trip'], siembra: viaje('confirmed', C, 5250, 0) },
      { pant: 'Viaje', f: F.viaje, cobro: P, monto: 4500, dev: 1500, boton: ['Cancelar el viaje', 'Cancel the trip'], siembra: viaje('confirmed', P, 4500, 1500) },
      { pant: 'Evento privado', f: F.privado, cobro: R, monto: 10000, boton: ['Cancelar el evento', 'Cancel the event'], siembra: privado(R, 10000, 0) },
      { pant: 'Evento privado', f: F.privado, cobro: C, monto: 12550, boton: ['Cancelar el evento', 'Cancel the event'], siembra: privado(C, 12550, 0) },
      { pant: 'Evento privado', f: F.privado, cobro: P, monto: 10000, dev: 3000, boton: ['Cancelar el evento', 'Cancel the event'], siembra: privado(P, 10000, 3000) },
    ];
    const RUTA = { 'Noche · mesa': '/noche/', 'Noche · lista': '/noche/', Fiesta: '/fiesta/', Inscripción: '/insc/', Viaje: '/viaje/', 'Evento privado': '/privado/' };
    const abrirHoja = async (p, ruta, boton) => {
      await p.goto(B + ruta);
      const dlg = p.getByRole('dialog');
      for (let i = 0; i < 8; i++) { // antes de hidratar el toque no hace nada: se repite hasta que la hoja abre
        await p.getByRole('button', { name: boton, exact: true }).first().click({ timeout: 15000 });
        if (await dlg.first().waitFor({ timeout: 2500 }).then(() => true).catch(() => false)) return dim(await dlg.first().innerText());
      }
      throw new Error(`la hoja no abrió en ${ruta}: ${dim(await p.locator('body').innerText()).slice(0, 400)}`);
    };

    console.log('1 · Las hojas de cancelar: retenido pide soltar · cobrado pide la devolución de lo que queda (ES y EN)');
    const es = await contexto('es', CLI.tel), en = await contexto('en', CLI.tel);
    for (const c of CASOS) {
      const nm = c.siembra(), ruta = RUTA[c.pant] + nm;
      const etq = `${c.pant} · ${c.lista ? 'sin depósito' : c.cobro === R ? 'retenido' : c.cobro === C ? 'cobrado' : 'devolución parcial'}`;
      for (const [L, p, i] of [['es', es, 0], ['en', en, 1]]) {
        const t = await abrirHoja(p, ruta, c.boton[i]);
        if (c.lista) {
          const frase = L === 'es' ? 'Puedes salir de la lista cuando quieras. No se cobra nada.' : 'You can leave the list any time. Nothing is charged.';
          ok(t.includes(frase) && !/retenci|hold|devoluci|refund/i.test(t) && !PROMETE.test(t), `${etq} (${L.toUpperCase()}): «${frase}» y nada de retención ni devolución (${t.slice(0, 160)})`);
          continue;
        }
        const queda = c.cobro === R ? c.monto : c.monto - (c.dev ?? 0), m = c.f(queda);
        const frase = (c.cobro === R ? SUELTA : DEVUELVE)[L](m), gratis = L === 'es' ? 'es gratis. ' : 'it is free. ';
        const otra = c.cobro === R ? /devoluci|refund/i : /retenci|hold/i;
        ok(t.includes(gratis + frase), `${etq} (${L.toUpperCase()}): «${frase}» (${t.slice(0, 220)})`);
        ok(!otra.test(t) && !PROMETE.test(t), `${etq} (${L.toUpperCase()}): sin la frase de la otra clase ni «te devolvemos»`);
        if (c.cobro === P) ok(!t.includes(c.f(c.monto) + (L === 'es' ? ' a tu tarjeta' : ' to your card')), `${etq} (${L.toUpperCase()}): pide ${m}, lo que queda, no los ${c.f(c.monto)} enteros`);
      }
    }
    await es.context().close(); await en.context().close();

    // ── 2 · «Otra hora»: el aviso con retención y sin depósito ──
    console.log('2 · «Otra hora» desde el panel: el aviso (noche_alt, fiesta_alt, viaje_alt) con la retención y sin depósito, en ES y en EN');
    const CES = persona('Cliente alt', 'es'), CEN = persona('Client alt', 'en');
    const pd = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); pd.on('pageerror', (e) => err.push(e.message));
    await entrarComo(pd, DUENA.tel);
    const L = { es: CES, en: CEN };

    // Fiesta: el salón propio; cada solicitud en su día (un evento por día).
    await pd.goto(B + `/panel/${BF}`);
    let dia = 50;
    const altFiesta = async (lang, cents) => {
      const nm = num('F'), det = { svc: { es: `Paquete 9y ${RUN}`, en: `Package 9y ${RUN}` }, svcId: SF, k: 'pack', e: 'quince', g: 100, terms: { cancel: 30 }, donde: { k: 'local' }, inc: [] };
      const op = operacion({ nm, kind: 'party', biz: BF, uid: L[lang].id, st: 'pending', sched: NY(dia++, '18:00'), dur: 240, det, party: 100, total: 300000, dep: cents, resp: true });
      if (cents) cobro(op, nm, L[lang].id, BF, 'deposit', cents, R, 0);
      const r = await accion(pd, 'fiestaResponder', [BF, nm, 'otra', 840]);
      ok(r.j?.ok === true && sql(`select status from operations where number = '${nm}'`) === 'change_proposed', `fiesta ${nm} (${lang.toUpperCase()}${cents ? ', con depósito' : ', sin depósito'}): otra hora propuesta (${JSON.stringify(r.j)})`);
      return cuerpoAviso(nm, 'fiesta_alt');
    };
    for (const lang of ['es', 'en']) {
      const base = lang === 'es' ? ': el' : ' is free, but at', ok1 = lang === 'es' ? 'Acéptala o no en la app.' : 'Accept it or not in the app.';
      void base;
      const con = await altFiesta(lang, 50000), sin = await altFiesta(lang, 0);
      ok(con.endsWith(ok1 + SIRVE[lang](F.fiesta(50000))), `fiesta_alt con depósito (${lang.toUpperCase()}): termina en «${ok1}${SIRVE[lang](F.fiesta(50000))}» (${con})`);
      ok(sin.endsWith(ok1) && !/retenci|hold|se libera|released/i.test(sin) && !PROMETE.test(sin), `fiesta_alt sin depósito (${lang.toUpperCase()}): termina en «${ok1}», sin frase de retención (${sin})`);
    }

    // Viaje: otra salida con cupo; el cobro del viaje es el pago entero (kind full).
    await pd.goto(B + `/panel/${BV}`);
    const altViaje = async (lang, cents) => {
      const nm = num('V'), det = { k: 'asiento', run: SAL, svc: { es: `Hazleton → Allentown ${RUN}`, en: `Hazleton → Allentown ${RUN}` }, svcId: SV, adults: 1, kids: 0, inc: [], from: { es: 'Hazleton', en: 'Hazleton' }, to: { es: 'Allentown', en: 'Allentown' }, terms: { feePct: 50, cancelH: 24 } };
      const op = operacion({ nm, kind: 'trip', biz: BV, uid: L[lang].id, st: 'pending', sched: `(select run_at from trip_runs where id = ${SAL})`, dur: 120, det, party: 1, total: cents, resp: true });
      sql(`insert into run_seats (operation_id, run_id, seats) values (${op}, ${SAL}, 1)`);
      if (cents) cobro(op, nm, L[lang].id, BV, 'full', cents, R, 0);
      const r = await accion(pd, 'viajeResponder', [BV, nm, 'otra', SAL2]);
      ok(r.j?.ok === true && sql(`select status from operations where number = '${nm}'`) === 'change_proposed', `viaje ${nm} (${lang.toUpperCase()}${cents ? ', con retención' : ', sin cobro'}): otra salida propuesta (${JSON.stringify(r.j)})`);
      return cuerpoAviso(nm, 'viaje_alt');
    };
    for (const lang of ['es', 'en']) {
      const ok1 = lang === 'es' ? 'Acéptala o no en la app.' : 'Accept it or not in the app.';
      const con = await altViaje(lang, 4500), sin = await altViaje(lang, 0);
      ok(con.endsWith(ok1 + SIRVE[lang](F.viajeAviso(4500))), `viaje_alt con retención (${lang.toUpperCase()}): termina en «${ok1}${SIRVE[lang](F.viajeAviso(4500))}» (${con})`);
      ok(sin.endsWith(ok1) && !/retenci|hold|se libera|released/i.test(sin) && !PROMETE.test(sin), `viaje_alt sin cobro (${lang.toUpperCase()}): termina en «${ok1}», sin frase de retención (${sin})`);
    }

    // Noche: La Terraza (la semilla; tiene horas). Se busca una noche abierta y una hora que valga con la primera solicitud y las demás la repiten.
    const NEG = 'la-terraza-night', TEL_TERRAZA = '5705550366';
    const MESA = sql(`select id from items where business_id = '${NEG}' and svc_kind = 'mesa' and name->>'es' = 'Mesa en la terraza' and removed_at is null limit 1`);
    ok(!!MESA, 'La Terraza tiene su «Mesa en la terraza» (la semilla)');
    const tz = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); tz.on('pageerror', (e) => err.push(e.message));
    await entrarComo(tz, TEL_TERRAZA); await tz.goto(B + `/panel/${NEG}`);
    let buena = null; // { noche: días desde hoy, m }
    const altNoche = async (lang, cents) => {
      const nm = num('N'), det = { k: 'mesa', item: MESA, svc: { es: 'Mesa en la terraza', en: 'Terrace table' }, arrive: 1320, occ: null, door_cents: null, list_until: null, cover_cents: 0, after: null, min_cents: 0, hr: false, edad: 21, hold: 30, sms: true, cut: 1290, inc: [] };
      const intentos = buena ? [buena] : [1, 2, 3, 4, 5, 6].flatMap((noche) => Array.from({ length: 31 }, (_, i) => ({ noche, m: 600 + i * 30 })).filter((x) => x.m !== 1320));
      let r = null, op = null, usada = null;
      for (const it of intentos) {
        if (!op || !usada || usada.noche !== it.noche) {
          if (op) sql(`update operations set night_date = (now() at time zone 'America/New_York')::date + ${it.noche} where id = ${op}`);
          else { op = operacion({ nm, kind: 'night', biz: NEG, uid: L[lang].id, st: 'pending', sched: NY(it.noche, '22:00'), dur: 60, det, party: 4, dep: cents, night: it.noche, resp: true }); if (cents) cobro(op, nm, L[lang].id, NEG, 'deposit', cents, R, 0); }
          usada = { noche: it.noche };
        }
        r = await accion(tz, 'nocheResponder', [NEG, nm, 'otra', it.m]);
        if (r.j?.ok === true) { buena = it; break; }
      }
      ok(r?.j?.ok === true && sql(`select status from operations where number = '${nm}'`) === 'change_proposed', `noche ${nm} (${lang.toUpperCase()}${cents ? ', con depósito' : ', sin depósito'}): otra hora propuesta (${JSON.stringify(buena)} · ${JSON.stringify(r?.j)})`);
      return cuerpoAviso(nm, 'noche_alt');
    };
    for (const lang of ['es', 'en']) {
      const ok1 = lang === 'es' ? 'Acéptala o elige «No me sirve».' : 'Accept it or choose “Doesn’t work”.';
      const con = await altNoche(lang, 5250), sin = await altNoche(lang, 0);
      ok(con.endsWith(ok1 + SIRVE[lang](F.noche(5250))), `noche_alt con depósito (${lang.toUpperCase()}): termina en «${ok1}${SIRVE[lang](F.noche(5250))}» (${con})`);
      ok(sin.endsWith(ok1) && !/retenci|hold|se libera|released/i.test(sin) && !PROMETE.test(sin), `noche_alt sin depósito (${lang.toUpperCase()}): termina en «${ok1}», sin frase de retención (${sin})`);
    }

    ok(err.length === 0, 'sin errores de página' + (err.length ? ': ' + err.join(' | ') : ''));
  } finally {
    await b.close().catch(() => {});
    // Lo que se sembró queda cerrado: la base no deja borrar operaciones ni sus eventos (insert-only), así que se cancelan, sus cobros se sueltan o se dan por devueltos
    // (el barrido no los toca), se quitan sus simuladores y avisos y las propuestas; los negocios propios se cierran.
    try {
      const L1 = creados.ops.map((x) => `'${x}'`).join(',') || "''", L2 = creados.pis.map((x) => `'${x}'`).join(',') || "''";
      sql(`update payments set status = case when status = 'held' then 'released' else 'refunded' end, refunded_cents = case when status = 'held' then 0 else amount_cents end where operation_id in (select id from operations where number in (${L1}))`);
      sql(`update operations set status = 'cancelled', cancelled_by = 'system', respond_by = null, door_code = null, pay_status = case when pay_status = 'held' then 'released' when pay_status is null then null else 'refunded' end where number in (${L1})`);
      sql(`delete from change_proposals where operation_id in (select id from operations where number in (${L1}))`);
      sql(`delete from run_seats where operation_id in (select id from operations where number in (${L1}))`);
      sql(`delete from notifications where ref_id in (${L1})`);
      sql(`delete from sim_intents where id in (${L2})`);
      sql(`update trip_runs set status = 'cancelled' where business_id in (${creados.negocios.map((x) => `'${x}'`).join(',') || "''"})`);
      sql(`update businesses set status = 'closed' where id in (${creados.negocios.map((x) => `'${x}'`).join(',') || "''"})`);
      console.log(`  (limpio: ${creados.ops.length} operaciones, ${creados.pis.length} cobros, ${creados.negocios.length} negocios)`);
    } catch (e) { console.log('  ✗ la limpieza falló: ' + String(e.stderr ?? e.message).slice(0, 400)); process.exitCode = 1; }
  }
  console.log(`\n${n} comprobaciones ✓`);
})().catch((e) => { console.error('\n✗', e.message); process.exit(1); });
