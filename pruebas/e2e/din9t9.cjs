// 9t9 (21 nov) · Dinero por clase: un elemento malo no detiene a los demás y nada queda fuera por un tope (lib/barrido-uno.ts; guardián barridoUnoPorUno).
// Contra el servidor real: el barrido central por su ruta interna con su token (como barr.cjs), en modo simulador de pagos.
//   1. Planes del Hogar: un plan «envenenado» (su período ya tiene una intención fallida con la llave que tomaría la siguiente: anotarCobro choca con
//      offsession_charges_idem_key_key, el caso de CI 44940985674) y, DETRÁS de él en el orden, un plan sano al que le toca cobro: tras el barrido el sano
//      quedó cobrado, la tarea «planes» sale fallida nombrando al envenenado («1 de N fallaron») y las demás tareas corrieron sin error.
//   2. Más de 50 planes vivos a los que no les toca nada y uno al que sí, creado el último: se cobra en la primera corrida.
//   3. Patrocinios: uno vencido que se renueva y cuya renovación choca con su llave (envenenado) y, detrás, uno vencido que solo termina: el segundo
//      termina, la tarea «patrocinios» sale fallida nombrando al primero.
//   4. Cobros fuera de sesión: una intención de un plan con su detalle roto (sin el día del cobro: el cierre lanza) y, detrás, una intención de un
//      patrocinio que ya terminó (se suelta sin mandarse): la segunda queda cerrada, la tarea «cobrosFuera» sale fallida nombrando a la primera.
//   Al final cada envenenado deja de envenenar SIN borrar nada (el plan se cancela, la renovación se apaga) y otro barrido sale
//   entero en verde: las pruebas que vienen después en el carril (barr, rsvp9a) exigen todas las tareas bien.
// Precondiciones propias (orden indiferente, corre dos veces seguidas): su usuario (teléfono +1570555xxxx al azar), su negocio activo con su cuenta de cobro
// simulada, su tarjeta, sus planes, sus patrocinios y sus intenciones.
const ENT = require('../lib/entorno.cjs');
const crypto = require('crypto');
const { sql } = require('../lib/negocio-nuevo.cjs');
const { esFijo } = require('../lib/telefonos-fijos.cjs');
const B = ENT.B;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const primero = (s) => s.split('\n').find((l) => /^\d+$/.test(l));
const RUN = crypto.randomBytes(4).toString('hex');
const barrer = () => fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': ENT.TOK } }).then((r) => r.json());
// El barrido de otro proceso (el servicio de cada minuto, si lo hay) puede tener el candado: se espera a que corra el nuestro.
const barrerYa = async () => { for (let i = 0; i < 40; i++) { const r = await barrer(); if (r.corrio) return r; await new Promise((x) => setTimeout(x, 500)); } throw new Error('el barrido nunca corrió (candado tomado)'); };
const fallas = (r) => (r.fallas ?? []).map((x) => `${x.tarea} → ${x.error}`).join(' | ').slice(0, 900);
const telPropio = () => { for (let i = 0; i < 300; i++) { const t = '570555' + String(crypto.randomInt(10000)).padStart(4, '0'); if (!esFijo(t) && sql(`select count(*) from users where phone = '+1${t}'`) === '0') return t; } throw new Error('no hay un teléfono 555 libre'); };

(async () => {
  // ── Precondiciones propias ──
  const tel = telPropio();
  sql(`insert into users (phone, first_name, last_name) values ('+1${tel}', 'Prueba', 'NueveNueve')`);
  const U = sql(`select id from users where phone = '+1${tel}'`);
  const BIZ = `p9t9-${RUN}`, PM = `pm_sim_visa_4242_${RUN}`, ACCT = `acct_sim_${BIZ}`;
  // Una categoría de la ciudad sin patrocinios vivos (que haya puesto para la renovación del envenenado).
  const CAT = sql(`select c.id from categories c where c.id like 'NEG-%' and not exists (select 1 from sponsorships s where s.city_id = 'hzl' and s.category_id = c.id and s.status in ('activo', 'reservado') and s.ends_at > now())
                   order by c.id limit 1`);
  sql(`insert into businesses (id, city_id, category_id, name, status) values ('${BIZ}', 'hzl', '${CAT}', 'Barrido 9t9 ${RUN}', 'active')`);
  sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, simulated) values ('${BIZ}', '${ACCT}', 'enabled', true, true, true)`);
  sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, status, simulated) values ('${U}', '${PM}', 'visa', '4242', '12/30', true, 'active', true)`);
  const ITEM = primero(sql(`insert into items (business_id, name, price_cents, svc_kind, sell, status) values ('${BIZ}', '{"es":"Plan 9t9","en":"Plan 9t9"}'::jsonb, 9900, 'plan', true, 'live') returning id`));
  const dia = (k) => sql(`select ((now() at time zone 'America/New_York')::date + ${k})::text`);
  // Un plan del Hogar (activo, sin visitas: solo el cobro) con su próximo cobro el día `cobro` (relativo a hoy en Hazleton).
  let k = 0;
  const plan = (cobro) => {
    const num = `PL-9N${RUN}${(k++).toString(36)}`.toUpperCase().slice(0, 18);
    const op = primero(sql(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, client_key)
      values ('${num}', 'plan', 'hzl', '${BIZ}', '${U}', 'confirmed', '{"svc":{"es":"Plan 9t9","en":"Plan 9t9"}}'::jsonb, 9900, 9900, 'app', gen_random_uuid()) returning id`));
    const id = primero(sql(`insert into plan_subscriptions (operation_id, business_id, user_id, city_id, item_id, price_cents, dow, nth, window_m, charge_day, first_visit_on, next_visit_on, next_charge_on, payment_method)
      values (${op}, '${BIZ}', '${U}', 'hzl', ${ITEM}, 9900, 2, 2, 540, 5, '${dia(-30)}'::date, null, '${dia(cobro)}'::date, '${PM}') returning id`));
    return { id, num, op, next: dia(cobro) };
  };
  const cobrado = (p) => sql(`select s.charges_ok || '|' || (select count(*) from offsession_charges q where q.kind = 'plan' and q.ref_id = '${p.id}' and q.purpose = 'periodo-${p.next}' and q.status = 'done')
                               from plan_subscriptions s where s.id = ${p.id}`);
  const cancelar = (p) => sql(`update plan_subscriptions set status = 'cancelled', cancelled_at = now(), next_charge_on = null, retry_on = null, updated_at = now() where id = ${p.id}`);

  // ── 1 · Un plan envenenado no deja sin cobrar al que viene detrás ──
  const P1 = plan(-2), P2 = plan(-1);
  // La intención fallida del período de P1 con la llave -i1 y una sola fila del período: anotarCobro cuenta 1 y arma -i1 → choca con la llave única.
  // (La base anota toda intención nueva en camino: se fabrica fallida con el trigger apagado en esta sesión, como din9t6b › armar.)
  sql(`set session_replication_role = replica; insert into offsession_charges (kind, ref_id, purpose, operation_id, business_id, city_id, payer_user_id, amount_cents, fee_cents, destination, pm, idem_key, detail, status, attempts, last_error)
       values ('plan', '${P1.id}', 'periodo-${P1.next}', ${P1.op}, '${BIZ}', 'hzl', '${U}', 9900, 0, '${ACCT}', '${PM}', 'plan-${P1.id}-${P1.next}-i1', '{}'::jsonb, 'failed', 1, 'card_declined')`);
  const r1 = await barrerYa();
  const f1 = (r1.fallas ?? []).find((x) => x.tarea === 'planes');
  ok(cobrado(P2) === '1|1', `el plan sano (${P2.num}, detrás del envenenado) quedó cobrado: un cobro y su intención hecha`);
  ok(cobrado(P1) === '0|0', `el envenenado (${P1.num}) no se cobró (su intención choca con su llave)`);
  ok(!!f1 && f1.error.includes(P1.num) && / de \d+ fallaron/.test(f1.error) && f1.error.startsWith('planes: 1 de '), `la tarea «planes» sale fallida diciendo cuántos de cuántos y cuál: «${f1?.error ?? 'no falló'}»`);
  ok((r1.fallas ?? []).every((x) => x.tarea === 'planes'), `las demás tareas del barrido corrieron sin error${(r1.fallas ?? []).length > 1 ? ' · falló: ' + fallas(r1) : ''}`);
  ok(sql(`select last_error like 'planes: 1 de %${P1.num}%' from system_jobs where name = 'barrido.planes'`) === 't', 'y queda en Sistema › Tareas (system_jobs) con el mismo resumen');
  cancelar(P1);

  // ── 2 · Más de 50 planes vivos a los que no les toca nada; el que sí, creado el último, se cobra en la primera corrida ──
  const quietos = [];
  for (let i = 0; i < 55; i++) quietos.push(plan(10));
  const P3 = plan(0);
  const r2 = await barrerYa();
  ok(cobrado(P3) === '1|1', `con ${quietos.length} planes vivos sin nada que hacer delante, el que toca hoy (${P3.num}, el último creado) se cobró en la primera corrida`);
  ok(quietos.every((p) => cobrado(p) === '0|0'), 'los que no tocan siguen sin cobro');
  ok(!(r2.fallas ?? []).length, `y el barrido sale entero en verde${(r2.fallas ?? []).length ? ' · falló: ' + fallas(r2) : ''}`);
  for (const p of quietos) cancelar(p);

  // ── 3 · Patrocinios: la renovación envenenada no deja sin terminar al que viene detrás ──
  // Cada patrocinio con su propio negocio (la base no deja dos del mismo negocio en las mismas fechas), activo y de la misma categoría.
  let kb = 0;
  const pat = (horas, renueva, st = 'activo') => {
    const nb = `${BIZ}-s${kb++}`;
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${nb}', 'hzl', '${CAT}', 'Barrido 9t9 ${RUN} ${kb}', 'active')`);
    return primero(sql(`insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew${st === 'terminado' ? ', end_kind, ended_at' : ''})
    values ('${nb}', '${CAT}', 'hzl', now() - interval '7 days' - interval '${horas} hours', now() - interval '${horas} hours', 'week', '${st}', 2500, '${U}', '${PM}', ${renueva}${st === 'terminado' ? ", 'vencio', now()" : ''}) returning id`));
  };
  const S1 = pat(3, true), S2 = pat(2, false);
  sql(`set session_replication_role = replica; insert into offsession_charges (kind, ref_id, purpose, business_id, city_id, payer_user_id, amount_cents, fee_cents, pm, idem_key, detail, status, attempts, last_error)
       values ('patrocinio_negocio', '${S1}', 'renovacion', '${BIZ}', 'hzl', '${U}', 2500, 0, '${PM}', 'pat-negocio-renov-${S1}-i1', '{}'::jsonb, 'failed', 1, 'card_declined')`);
  const r3 = await barrerYa();
  const f3 = (r3.fallas ?? []).find((x) => x.tarea === 'patrocinios');
  ok(sql(`select status || '|' || end_kind from sponsorships where id = ${S2}`) === 'terminado|vencio', `el patrocinio sano (${S2}, detrás del envenenado) terminó`);
  ok(sql(`select status from sponsorships where id = ${S1}`) === 'activo', `el envenenado (${S1}) sigue vivo: su renovación choca con su llave`);
  ok(!!f3 && f3.error.includes(`patrocinio ${S1}`) && / de \d+ fallaron/.test(f3.error), `la tarea «patrocinios» sale fallida nombrándolo: «${f3?.error ?? 'no falló'}»`);
  ok((r3.fallas ?? []).every((x) => x.tarea === 'patrocinios'), `las demás tareas corrieron sin error${(r3.fallas ?? []).length > 1 ? ' · falló: ' + fallas(r3) : ''}`);
  sql(`update sponsorships set auto_renew = false where id = ${S1}`);

  // ── 4 · Cobros fuera de sesión: una intención con su detalle roto no deja sin cerrar a la que viene detrás ──
  const P4 = plan(5);
  // Con el trigger apagado en esta sesión para fijar su fecha (más de 2 minutos: el barrido no toca las recién anotadas).
  const I1 = primero(sql(`set session_replication_role = replica; insert into offsession_charges (kind, ref_id, purpose, operation_id, business_id, city_id, payer_user_id, amount_cents, fee_cents, destination, pm, idem_key, detail, created_at)
       values ('plan', '${P4.id}', 'periodo-${P4.next}', ${P4.op}, '${BIZ}', 'hzl', '${U}', 9900, 0, '${ACCT}', '${PM}', 'plan-${P4.id}-${P4.next}-i0', '{"meta":{"plan":"${P4.num}"},"next":"${P4.next}"}'::jsonb, now() - interval '6 minutes') returning id`));
  const S3 = pat(30, false, 'terminado');
  const I2 = primero(sql(`set session_replication_role = replica; insert into offsession_charges (kind, ref_id, purpose, business_id, city_id, payer_user_id, amount_cents, fee_cents, pm, idem_key, detail, created_at)
       values ('patrocinio_negocio', '${S3}', 'renovacion', '${BIZ}', 'hzl', '${U}', 2500, 0, '${PM}', 'pat-negocio-renov-${S3}', '{}'::jsonb, now() - interval '5 minutes') returning id`));
  const r4 = await barrerYa();
  const f4 = (r4.fallas ?? []).find((x) => x.tarea === 'cobrosFuera');
  ok(sql(`select status || '|' || coalesce(last_error, '') from offsession_charges where id = ${I2}`) === 'failed|patrocinio_termino', `la intención sana (${I2}, detrás de la rota) se cerró: el patrocinio ya había terminado y nunca se mandó`);
  ok(sql(`select status from offsession_charges where id = ${I1}`) === 'pending', `la rota (${I1}) sigue en camino`);
  ok(!!f4 && f4.error.includes(`plan ${I1}`) && / de \d+ fallaron/.test(f4.error), `la tarea «cobrosFuera» sale fallida nombrándola: «${f4?.error ?? 'no falló'}»`);
  ok((r4.fallas ?? []).every((x) => ['cobrosFuera', 'planes'].includes(x.tarea)), `las demás tareas corrieron sin error (planes también la recorre: es de un plan)${(r4.fallas ?? []).some((x) => !['cobrosFuera', 'planes'].includes(x.tarea)) ? ' · falló: ' + fallas(r4) : ''}`);
  // Deja de envenenar sin borrar nada (el detalle de una intención no cambia: la base no lo deja): el plan se cancela; la intención, ya mandada, se cierra
  // con SU llave como «sin aplicar» (el cobro queda en el libro y el equipo de dinero decide: offsession_unapplied).
  cancelar(P4);

  // ── Al final: nada envenena; otro barrido sale entero en verde (barr y rsvp9a, que vienen después, lo exigen) ──
  const r5 = await barrerYa();
  ok(r5.ok && !(r5.fallas ?? []).length, `sin envenenados, el barrido sale entero en verde${(r5.fallas ?? []).length ? ' · falló: ' + fallas(r5) : ''}`);
  ok(sql(`select status from sponsorships where id = ${S1}`) === 'terminado', 'el patrocinio que ya no renueva terminó');
  ok(sql(`select status from offsession_charges where id = ${I1}`) === 'done' && sql(`select charges_ok from plan_subscriptions where id = ${P4.id}`) === '0'
    && sql(`select count(*) from money_alerts where kind = 'offsession_unapplied' and subject_id = 'plan-${P4.id}-${P4.next}-i0'`) === '1', 'la intención de la rota se cerró con su llave como «sin aplicar» (el plan cancelado no se cobra; alerta al equipo, una vez)');
  const [corrieron, conError] = sql(`select count(*) || '|' || count(*) filter (where last_error is not null) from system_jobs where name like 'barrido.%' and last_run_at > now() - interval '2 minutes'`).split('|');
  ok(conError === '0', `las ${corrieron} tareas del último barrido, sin error en system_jobs`);
  console.log(`OK din9t9 (${n} comprobaciones)`);
})().catch((e) => { console.error(e); process.exit(1); });
