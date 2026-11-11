// Pedido sin hora de listo ni de respuesta (ready_at / respond_by en null): la pantalla del cliente y la del panel no se caen.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const B = 'http://localhost:3100', NUM = '1357', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let fallos = 0; const ok = (c, m) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fallos++; };
(async () => {
  const antes = sql(`select coalesce(ready_at::text,'') || '|' || coalesce(respond_by::text,'') from operations where number='${NUM}' and kind='order'`);
  const [ra, rb] = antes.split('|');
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
    sql(`update operations set ready_at = ${ra ? `'${ra}'` : 'null'}, respond_by = ${rb ? `'${rb}'` : 'null'} where number='${NUM}' and kind='order'`);
  }
  console.log(fallos ? `pednull: ${fallos} fallos` : 'pednull OK'); process.exit(fallos ? 1 : 0);
})();
