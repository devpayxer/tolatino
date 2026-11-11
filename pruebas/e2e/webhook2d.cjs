const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const crypto = require('crypto'); const { execSync } = require('child_process');
const B = 'http://127.0.0.1:3100', SEC = ENT.sec('STRIPE_WEBHOOK_SECRET');
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const enviar = async (ev, firma) => {
  const cuerpo = JSON.stringify(ev), t = Math.floor(Date.now() / 1000);
  const sig = firma ?? `t=${t},v1=${crypto.createHmac('sha256', SEC).update(`${t}.${cuerpo}`).digest('hex')}`;
  const r = await fetch(B + '/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': sig }, body: cuerpo });
  return { st: r.status, j: await r.json().catch(() => null) };
};
(async () => {
  const pid = sql(`select id from payments order by id desc limit 1`), pi = sql(`select stripe_payment_intent from payments where id = ${pid}`);
  const antes = sql(`select status from payments where id = ${pid}`);
  sql(`update payments set status = 'held' where id = ${pid}`);
  const ev = { id: 'evt_prueba_' + Date.now(), type: 'payment_intent.canceled', data: { object: { id: pi } } };
  ok((await enviar(ev, 't=1,v1=deadbeef')).st === 400, 'firma falsa → 400');
  const viejo = Math.floor(Date.now() / 1000) - 600, cuerpo = JSON.stringify(ev);
  ok((await enviar(ev, `t=${viejo},v1=${crypto.createHmac('sha256', SEC).update(`${viejo}.${cuerpo}`).digest('hex')}`)).st === 400, 'firma vieja (10 min) → 400');
  const r1 = await enviar(ev); ok(r1.st === 200 && r1.j?.ok, 'firma buena → 200');
  ok(sql(`select status from payments where id = ${pid}`) === 'released', 'payment_intent.canceled → liberado en el libro');
  const r2 = await enviar(ev); ok(r2.st === 200 && r2.j?.repetido === true, 'el mismo evento otra vez → no se aplica dos veces');
  sql(`update payments set status = '${antes}' where id = ${pid}`);
  const acct = sql(`select stripe_account_id from stripe_accounts limit 1`);
  const r3 = await enviar({ id: 'evt_acct_' + Date.now(), type: 'account.updated', data: { object: { id: acct, charges_enabled: true, payouts_enabled: false, requirements: { currently_due: ['external_account'] } } } });
  ok(r3.st === 200 && sql(`select status from stripe_accounts where stripe_account_id = '${acct}'`) === 'restricted', 'account.updated con un dato pendiente → «Stripe necesita un dato más»');
  sql(`update stripe_accounts set status = 'enabled', payouts_enabled = true, requirements = '[]'::jsonb where stripe_account_id = '${acct}'`);
  ok(sql(`select count(*) from stripe_events where processed_at is not null`) !== '0', 'eventos guardados y procesados');
  console.log('OK');
})().catch((e) => { console.error(e); process.exit(1); });
