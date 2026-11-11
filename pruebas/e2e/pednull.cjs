// Pedido sin hora de listo ni de respuesta (ready_at / respond_by en null): la pantalla del cliente y la del panel no se caen.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let fallos = 0; const ok = (c, m) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fallos++; };
(async () => {
  // 9a · Su propio pedido (antes usaba el #1357 de la base local, que ya no está pendiente): uno de Marisol en Sabor Dominicano, recién enviado,
  // sin hora de listo ni de respuesta. Al final se cancela (no se queda «esperando respuesta» en el Hoy de las otras pruebas).
  const KEY = require('crypto').randomUUID();
  const NUM = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, pay_mode, subtotal_cents, tax_cents, total_cents, sent_at, client_key, is_test)
    values (nextval('operations_order_seq')::text, 'order', 'hzl', '${BIZ}', (select id from users where phone = '+15705550122'), 'pending', 'sent', 'pickup', 'local', 650, 39, 689, now(), '${KEY}', true) returning number`).split('\n')[0];
  sql(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct) select o.id, x.id, x.name, 1, x.price_cents, x.price_cents, 6 from operations o, items x where o.client_key = '${KEY}' and x.business_id = '${BIZ}' and x.removed_at is null order by x.id limit 1`);
  sql(`update operations set ready_at = null, respond_by = null where number='${NUM}' and kind='order'`);
  const br = await chromium.launch();
  try {
    for (const [nombre, tel, url, debe] of [
      ['cliente', '+15705550122', `/pedido/${NUM}`, `#${NUM}`],
      ['panel', '+15705550133', `/panel/${BIZ}/hoy?det=ped:${NUM}`, NUM],
      ['panel lista', '+15705550133', `/panel/${BIZ}/hoy`, NUM],
    ]) {
      const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
      const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
      await entrar(p, tel);
      const r = await p.goto(B + url); await p.waitForLoadState('networkidle');
      const txt = await p.locator('body').innerText();
      ok(r.status() === 200, `${nombre}: responde 200 (fue ${r.status()})`);
      ok(!/Application error|Something went wrong|algo salió mal/i.test(txt), `${nombre}: sin pantalla de error`);
      ok(txt.includes(debe), `${nombre}: muestra el pedido ${NUM}`);
      ok(!/\bnull\b|undefined|NaN/.test(txt), `${nombre}: no aparece «null», «undefined» ni «NaN»`);
      ok(errs.length === 0, `${nombre}: sin errores en el navegador ${errs.join(' | ')}`);
      if (nombre === 'cliente') await p.screenshot({ path: ENT.S + '/cap/pednull-cliente.png', fullPage: true });
      await ctx.close();
    }
  } finally {
    await br.close();
    sql(`update operations set status = 'cancelled', updated_at = now() where client_key = '${KEY}'`);
  }
  console.log(fallos ? `pednull: ${fallos} fallos` : 'pednull OK'); process.exit(fallos ? 1 : 0);
})();
