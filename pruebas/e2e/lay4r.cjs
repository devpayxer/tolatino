// 4r · Layaway: ficha (ABONO 20 % · 4 PAGOS), hoja, acuerdo por escrito (sin aceptarlo no se envía), abono retenido → cobrado
// al confirmar, acuerdo inmutable, pagar en la app, pagó en la tienda, atrasado, la tienda cancela con 14 días (lo abonado menos
// 10 %: tarjeta + tienda), terminar de pagar → listo → lo recogió; no lo tiene → se libera el abono.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', T = 'boutique-yaritza';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const sqlErr = (q) => { try { sql(q); return null; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const MARISOL = "(select id from users where phone = '+15705550122')";
const PLAN = (n, col) => sql(`select ${col} from layaway_plans lp join operations o on o.id = lp.operation_id where o.number = '${n}'`);
const LP = (n) => sql(`select string_agg(lpp.seq || ':' || lpp.status || coalesce(':' || lpp.paid_where, ''), ',' order by lpp.seq) from layaway_payments lpp join layaway_plans lp on lp.id = lpp.plan_id join operations o on o.id = lp.operation_id where o.number = '${n}'`);
const PAYS = (n) => sql(`select string_agg(p.kind || case when p.kind = 'balance' then p.seq::text else '' end || ':' || p.status || ':' || p.amount_cents || ':' || p.refunded_cents, ',' order by p.id) from payments p join operations o on o.id = p.operation_id where o.number = '${n}'`);
(async () => {
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and kind = 'hold' and status in ('pending', 'change_proposed', 'confirmed')`);
  sql(`update layaway_plans set status = 'cancelled' where status in ('pending', 'active', 'late') and operation_id in (select id from operations where user_id = ${MARISOL})`);
  sql(`update retail_settings set layaway = true, lay_down_pct = 20, lay_payments = 4, lay_every_days = 14, lay_cancel_pct = 10 where business_id = '${T}'`);
  sql(`insert into delivery_settings (business_id) values ('${T}') on conflict (business_id) do nothing`); /* 9b-1 · la fila de la tienda (en una base nueva no la tenía) */ sql(`update delivery_settings set pay_card = true where business_id = '${T}'`);
  // 9b-1 · La tarjeta de Marisol (la guarda si no la tiene) en vez del id de una tarjeta de una base vieja.
  require('../lib/negocio-nuevo.cjs').tarjeta('5705550122');
  const b = await chromium.launch(); const err = [];
  const mc = await b.newContext({ ...devices['iPhone 13'] }), m = await mc.newPage(); await entrar(m, '5705550122');
  const h = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(h, '5705550299');
  for (const p of [m, h]) { p.on('pageerror', e => err.push(e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); }
  const tienda = async () => { await m.goto(B + `/n/${T}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor(); };
  const card = (nm) => m.locator('[data-screen-label="Ficha · tienda"] > div.grid > div').filter({ hasText: nm });
  const hoja = m.locator('[data-screen-label="Tienda · artículo"]');
  const tomarPlan = async (cap) => {
    await tienda(); await clic(card('Vestido de quince').getByRole('button', { name: 'Apartar' })); await hoja.waitFor();
    if (cap) { ok(await espera(hoja.getByText(/Plan: hoy se retiene el abono de \$64 \(20 %\) y el resto en 4 pagos de \$64, uno cada 14 días/)), 'hoja: el abono y los pagos'); await m.screenshot({ path: OUT + 'l2-hoja-m.png' }); }
    await clic(hoja.getByRole('button', { name: 'Apartar', exact: true })); await hoja.waitFor({ state: 'detached' });
  };
  const pg = m.locator('[data-screen-label="APP-NEG-TIENDA-APARTADO · móvil"]');
  const mandarPlan = async (cap) => {
    await clic(m.getByRole('button', { name: 'Ver apartado' })); await m.waitForURL(/\/apartar$/); await pg.getByText('TU PLAN').waitFor();
    if (cap) await m.screenshot({ path: OUT + 'l3-tu-plan-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Continuar' })); await pg.getByText('EL ACUERDO, POR ESCRITO').waitFor();
    if (cap) {
      ok(await (await vis(m.getByRole('button', { name: 'Continuar' }))).isDisabled() && await espera(m.getByText('ACEPTA EL ACUERDO DEL PLAN')), 'sin aceptar el acuerdo no sigue');
      ok(await espera(pg.getByText(/te devuelven lo abonado menos 10 % de lo abonado/)), 'el acuerdo dice qué pasa si no terminas');
      await m.screenshot({ path: OUT + 'l4-acuerdo-m.png', fullPage: true });
    }
    await clic(pg.getByRole('checkbox', { name: 'Leí el acuerdo y lo acepto' }));
    await clic(m.getByRole('button', { name: 'Continuar' })); await m.getByText('BUENO SABER').first().waitFor();
    await clic(m.getByRole('button', { name: 'Aceptar y apartar' })); await m.waitForURL(/\/apartado\/A-\d+/); return m.url().split('/apartado/')[1];
  };
  const det = async (n) => { await h.goto(B + `/panel/${T}/hoy?det=apt:${n}`); await h.getByText(`#${n}`).first().waitFor(); };

  // ── 1. Ficha y apartar en plan ──
  await tienda(); ok(await espera(card('Vestido de quince').getByText('ABONO 20 % · 4 PAGOS')), 'ficha: ABONO 20 % · 4 PAGOS');
  // Lo que va en plan se aparta solo: con la blusa en el carrito, apartar el vestido en plan la quita.
  await clic(card('Blusa de encaje').getByRole('button', { name: 'Apartar' })); await hoja.waitFor(); await clic(hoja.getByRole('radio', { name: /^S( |$)/ })); await clic(hoja.getByRole('button', { name: 'Apartar', exact: true })); await hoja.waitFor({ state: 'detached' });
  await clic(card('Vestido de quince').getByRole('button', { name: 'Apartar' })); await hoja.waitFor(); ok(await espera(hoja.getByText(/Lo que va en plan se aparta solo/)), 'aviso: lo que va en plan se aparta solo'); await clic(hoja.getByRole('button', { name: 'Cerrar' }));
  await tomarPlan(true);
  ok(await espera(m.getByText(/TU APARTADO · 1 ARTÍCULO/)), 'el carrito quedó solo con el vestido en plan');
  const A1 = await mandarPlan(true);
  ok(PLAN(A1, "lp.status || '|' || lp.total_cents || '|' || lp.down_cents || '|' || lp.accepted_version || '|' || (lp.terms->>'es' like '%Total: \$320, sin intereses%')") === 'pending|32000|6400|lay-v1|true', `${A1}: plan por confirmar, $320, abono $64, acuerdo guardado (lay-v1)`);
  ok(LP(A1) === '0:due,1:due,2:due,3:due,4:due' && PAYS(A1) === 'deposit:held:6400:0', 'cinco pagos (abono + 4); el abono se retiene');
  ok(await espera(m.getByText('PLAN ENVIADO')), 'cliente: plan enviado');
  ok(/el acuerdo del plan aceptado no se puede cambiar/.test(sqlErr(`update layaway_plans set total_cents = 100 where operation_id = (select id from operations where number = '${A1}')`) || ''), 'el acuerdo aceptado no se puede cambiar (disparador)');

  // ── 2. La tienda confirma → se cobra el abono y empieza el calendario ──
  await det(A1); ok(await espera(h.getByText(/Es un plan: al confirmar se cobra el abono de \$64/)), 'panel: es un plan');
  ok(!(await vis(h.getByRole('button', { name: 'Falta uno' }))), 'un plan no ofrece «Falta uno»');
  await clic(h.getByRole('button', { name: 'Lo tengo · guárdalo' })); await h.waitForTimeout(800);
  ok(PLAN(A1, 'lp.status') === 'active' && PAYS(A1) === 'deposit:captured:6400:0' && LP(A1).startsWith('0:paid:app,1:due'), 'confirmado: abono cobrado, plan activo');
  ok(sql(`select count(*) from notifications where tpl = 'lay_abono' and ref_id = '${A1}'`) === '1', 'aviso: plan confirmado');

  // ── 3. Pagar en la app y pagó en la tienda ──
  await m.goto(B + `/apartado/${A1}`); await m.getByText('TU PLAN').first().waitFor(); await m.screenshot({ path: OUT + 'l5-plan-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Pagar $64' })); ok(await espera(m.getByText('Listo: pagaste $64')), 'cliente: pagó $64 en la app');
  ok(LP(A1).startsWith('0:paid:app,1:paid:app,2:due') && PAYS(A1) === 'deposit:captured:6400:0,balance1:captured:6400:0', 'pago 1 cobrado en el acto');
  await det(A1); await clic(h.getByRole('button', { name: /Pagó en la tienda · \$64/ })); await h.getByText('Listo: pago anotado.').first().waitFor();
  ok(LP(A1).startsWith('0:paid:app,1:paid:app,2:waived:store,3:due'), 'pago 2: pagó en la tienda (sin cobro en la app)');
  await h.screenshot({ path: OUT + 'l6-panel-plan-d.png', fullPage: true });

  // ── 4. Atrasado 15 días → la tienda cancela: lo abonado ($192) menos 10 % ($19.20); tarjeta $108.80 y la tienda $64 ──
  sql(`update layaway_payments set due_at = now() - interval '15 days' where seq = 3 and plan_id = (select lp.id from layaway_plans lp join operations o on o.id = lp.operation_id where o.number = '${A1}')`);
  await m.goto(B + `/apartado/${A1}`); ok(await espera(m.getByText('PAGO ATRASADO')), 'cliente: pago atrasado');
  ok(PLAN(A1, 'lp.status') === 'late' && sql(`select count(*) from notifications where tpl = 'lay_atrasado' and ref_id = '${A1}'`) === '1', 'plan atrasado y aviso');
  await det(A1); await clic(h.getByRole('button', { name: 'Cancelar el plan' })); await h.getByText(/Listo: plan cancelado/).first().waitFor();
  ok(PLAN(A1, "lp.status || '|' || lp.fee_kept_cents || '|' || o.status") === 'cancelled|1920|cancelled', 'cancelado: cargo $19.20');
  ok(sql(`select sum(r.amount_cents) from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${A1}'`) === '10880', 'vuelven $108.80 a la tarjeta (lo cobrado en la app menos el cargo)');
  ok(sql(`select count(*) from notifications where tpl = 'lay_cancelado' and ref_id = '${A1}' and body like '%la tienda te devuelve \$64%'`) === '1', 'aviso: la tienda te devuelve $64 de lo pagado en la tienda');
  await m.goto(B + `/apartado/${A1}`); ok(await espera(m.getByText('PLAN CANCELADO')), 'cliente: plan cancelado');

  // ── 5. Pagarlo todo → listo para recoger → lo recogió ──
  await tomarPlan(false); const A2 = await mandarPlan(false);
  await det(A2); await clic(h.getByRole('button', { name: 'Lo tengo · guárdalo' })); await h.waitForTimeout(800);
  await m.goto(B + `/apartado/${A2}`);
  for (let i = 1; i <= 4; i++) { await clic(m.getByRole('button', { name: 'Pagar $64' })); await m.waitForTimeout(400); await espera(m.getByText(/Listo: pagaste|Terminaste de pagar/)); await m.goto(B + `/apartado/${A2}`); }
  ok(PLAN(A2, 'lp.status') === 'paid' && await espera(m.getByText('LISTO PARA RECOGER')), 'pagó todo: listo para recoger');
  ok(sql(`select sum(amount_cents) from payments p join operations o on o.id = p.operation_id where o.number = '${A2}' and p.status = 'captured'`) === '32000', 'Σ pagos = total ($320), nunca más');
  ok(sql(`select count(*) from notifications where tpl = 'lay_listo' and ref_id = '${A2}'`) === '1', 'aviso: terminaste de pagar');
  await det(A2); await clic(h.getByRole('button', { name: 'Lo recogió' })); await h.getByText('Listo: recogido.').first().waitFor();
  ok(O2(A2) === 'done', 'lo recogió');

  // ── 6. No lo tiene → se libera el abono ──
  await tomarPlan(false); const A3 = await mandarPlan(false);
  await det(A3); await clic(h.getByRole('button', { name: 'No lo tengo' })); await h.waitForTimeout(800);
  ok(PAYS(A3) === 'deposit:released:6400:0' && PLAN(A3, 'lp.status') === 'declined', 'no lo tiene: abono liberado, plan cerrado');

  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK lay4r');
})().catch((e) => { console.error(e); process.exit(1); });
function O2(n) { return sql(`select status from operations where number = '${n}'`); }
