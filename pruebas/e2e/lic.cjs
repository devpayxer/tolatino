const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'multiservicios-la-patria';
// 9b-1 · Sin la espera entre códigos de ESE teléfono (otra prueba acaba de entrar con él), como las demás.
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); require('../lib/negocio-nuevo.cjs').sql(`delete from otp_codes where phone = '+1${tel}'`); const j = (u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]); const a = await j('/api/cuenta/codigo', { telefono: tel }); if (!a.codigoPrueba) throw new Error('sin código ' + JSON.stringify(a)); await j('/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const t = (p, x) => p.getByText(x, { exact: true }).last();
const shot = async (p, n, full = true) => { await p.waitForTimeout(450); await p.screenshot({ path: OUT + n, fullPage: full }); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const mc = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const v = await mc.newPage(); watch(v, 'vecino');
  await v.goto(B + '/n/' + BIZ); await v.locator('text=¿PUEDE HACERLO POR LEY?').first().waitFor(); await shot(v, 'k1-ficha-ley-m.png', false);
  await v.locator('text=¿PUEDE HACERLO POR LEY?').first().click(); await v.waitForURL('**/licencia'); await v.locator('text=Nadie te garantiza un resultado.').waitFor(); await shot(v, 'k2-licencia-m.png');
  const dc = await b.newContext({ viewport: { width: 1440, height: 900 } }); const vd = await dc.newPage(); watch(vd, 'vecino-d');
  await vd.goto(B + '/n/' + BIZ + '/licencia'); await vd.locator('text=Volver a la ficha').waitFor(); await shot(vd, 'k3-licencia-d.png');
  // Dueño: agrega CPA y pone el número
  const o = await mc.newPage(); watch(o, 'dueño'); await entrar(o, '5705550177');
  await o.goto(B + '/panel/' + BIZ + '/pagina/lic'); await o.getByText('TUS LICENCIAS', { exact: true }).first().waitFor();
  // 9b-1 · Solo si todavía no tiene la de CPA (la segunda corrida ya la tiene: su título dice lo mismo que el botón de agregarla).
  if (require('../lib/negocio-nuevo.cjs').sql(`select count(*) from licenses where business_id = '${BIZ}' and kind = 'cpa' and status <> 'withdrawn'`) === '0') { await t(o, 'Contador público (CPA)').click(); await o.locator('text=Enviada. To’Latino la verifica en 72 h.').waitFor(); await o.waitForTimeout(800); }
  const campo = o.locator('input[placeholder="Como sale en tu licencia"]').last(); await campo.fill('PA-' + String(Date.now()).slice(-6)); /* 9b-1 · un número nuevo en cada corrida: con el mismo de la vez anterior no hay cambio y no sale «Guardar» */
  await shot(o, 'k4-panel-lic-m.png');
  await t(o, 'Guardar').click(); await o.locator('text=Enviado. To’Latino lo revisa en 72 h.').waitFor();
  // Admin verifica desde la cola
  const ac = await b.newContext({ viewport: { width: 1440, height: 900 } }); const a = await ac.newPage(); watch(a, 'admin'); await entrar(a, '5705550199');
  await a.goto(B + '/admin/colas?cola=lic'); await a.getByText('Licencia · ' + (await (async () => require('../lib/negocio-nuevo.cjs').sql(`select name from businesses where id = '${BIZ}'`))()), { exact: true }).first().click(); /* 9b-1 · el caso de ESTE negocio, no «el primero» */ await a.locator('text=ESTADO HOY').waitFor(); await shot(a, 'k5-cola-lic-d.png');
  await t(a, 'Verificada').click(); await a.locator('text=Listo. Quedó en la auditoría.').waitFor();
  await a.goto(B + '/admin/negocios/' + BIZ + '?tab=vende'); await a.locator('text=/SU HERRAMIENTA/').waitFor(); await shot(a, 'k6-360-vende-d.png');
  await vd.goto(B + '/n/' + BIZ + '/licencia'); const n = await vd.locator('text=/VERIFICADA POR TO’LATINO/').count(); console.log('verificadas en la ficha:', n); await shot(vd, 'k7-licencia-despues-d.png');
  console.log('errores:', err.length ? err : 'ninguno'); await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n')[0]); process.exit(1); });
