// 4d · Retenciones de más de 7 días: a las 164 h se libera y se vuelve a retener con la misma tarjeta; si el banco no deja,
// ese monto se paga en el local y se avisa. También: una retención de una cita cancelada se libera sola.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const B = 'http://localhost:3100', H = 'plomeria-rodriguez';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const MARISOL = "(select id from users where phone = '+15705550122')";
const crear = (pm, st = 'confirmed') => {
  const n = 'C-' + sql(`select nextval('operations_appt_seq')`);
  const op = sql(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, status_detail, scheduled_at, duration_min, details, subtotal_cents, total_cents, deposit_cents, pay_mode, confirmed_at, answered_at, client_key, is_test)
       select '${n}', 'appointment', 'hzl', '${H}', ${MARISOL}, (select id from business_members where business_id = '${H}' and kind = 'owner'), '${st}', 'work', now() - interval '8 days', 120, '{"rubro":"hogar","svcId":"229"}'::jsonb, 8900, 8900, 0, 'local', now(), now(), gen_random_uuid(), true returning id`).split('\n')[0];
  const pi = 'pi_sim_renov_' + n;
  sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, card) values ('${pi}', 20000, 0, 'acct_sim_${H}', 'requires_capture', '${pm}')`);
  sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method)
       values (${op}, ${MARISOL}, '${H}', 'hzl', 'estimate', 1, 'card', '${pi}', 20000, 20000, 0, 'held', 'visa', '${pm.split('_')[3]}', now() - interval '7 days', true, '${pm}')`);
  return { n, op, pi };
};
(async () => {
  const bueno = crear('pm_sim_visa_4242'), malo = crear('pm_sim_visa_0002'), cx = crear('pm_sim_visa_4242', 'cancelled');
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); await entrar(p, '5705550222');
  await p.goto(B + `/panel/${H}/hoy`); await p.waitForTimeout(500);
  ok(sql(`select status from payments where stripe_payment_intent = '${bueno.pi}'`) === 'released', 'la retención vieja se liberó');
  ok(sql(`select status || '|' || held_cents || '|' || (renewed_from is not null) from payments where operation_id = ${bueno.op} and seq = 2`) === 'held|20000|true', 'y se volvió a retener con la misma tarjeta (renewed_from)');
  ok(sql(`select count(*) from operation_events where operation_id = ${bueno.op} and kind = 'hold_renewed'`) === '1', 'evento: retención renovada');
  ok(sql(`select count(*) from payments where operation_id = ${malo.op} and status = 'held'`) === '0', 'tarjeta rechazada: no queda retención');
  ok(sql(`select count(*) from operation_events where operation_id = ${malo.op} and kind = 'hold_failed'`) === '1', 'evento: no se pudo renovar');
  ok(sql(`select count(*) from notifications where tpl = 'hold_fallo' and ref_id = '${malo.n}'`) === '1', 'aviso al cliente: pagas eso en el negocio');
  ok(sql(`select count(*) from notifications where tpl = 'biz_hold_fallo' and ref_id = '${malo.n}'`) === '1', 'aviso al negocio: cóbralo en el local');
  ok(sql(`select status from payments where stripe_payment_intent = '${cx.pi}'`) === 'released', 'cita cancelada: su retención se liberó');
  await p.goto(B + `/panel/${H}/hoy`); await p.waitForTimeout(300);
  ok(sql(`select count(*) from payments where operation_id = ${bueno.op}`) === '2', 'mirar otra vez no renueva dos veces');
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where id in (${bueno.op}, ${malo.op})`);
  await p.goto(B + `/panel/${H}/hoy`); await p.waitForTimeout(300);
  ok(sql(`select count(*) from payments where operation_id = ${bueno.op} and status = 'held'`) === '0', 'limpieza: liberada al cancelar');
  await b.close(); console.log('OK');
})().catch((e) => { console.error(e); process.exit(1); });
