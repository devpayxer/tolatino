const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const t = (p, x) => p.getByText(x, { exact: true }).last();
(async () => {
  sql("update items set status='live', hidden_reason=null where business_id='sabor-dominicano'"); sql("update businesses set modules_off='{}' where id='sabor-dominicano'");
  const b = await chromium.launch(); const err = [];
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); a.on('pageerror', e => err.push(e.message)); await entrar(a, '5705550199');
  await a.goto(B + '/admin/negocios/sabor-dominicano?tab=vende'); await a.getByText('MÓDULOS', { exact: true }).waitFor();
  const row = a.getByText('Chicharrón de cerdo', { exact: true }).first().locator("xpath=ancestor::*[.//*[normalize-space(text())='Ocultar']][1]");
  await row.getByText('Ocultar', { exact: true }).first().click(); await t(a, 'Precios o fotos engañosos').click(); await t(a, 'Confirmar').click(); await a.locator('text=/Plato oculto/').first().waitFor();
  await a.goto(B + '/admin/negocios/sabor-dominicano?tab=vende'); await a.getByText('Pausar', { exact: true }).nth(1).click(); await t(a, 'Lo pidió el dueño').click(); await t(a, 'Confirmar').click(); await a.locator('text=/pausado/').first().waitFor();
  await a.goto(B + '/admin/negocios/sabor-dominicano?tab=vende'); await a.waitForTimeout(500); await a.screenshot({ path: OUT + 'p13-admin-vende-d.png', fullPage: true });
  const m = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true })).newPage(); m.on('pageerror', e => err.push(e.message)); await entrar(m, '5705550133');
  await m.goto(B + '/panel/sabor-dominicano/vendes/menu'); await m.locator('text=/pausó tus pedidos en línea/').waitFor(); await m.locator('text=/plato lo ocultó To’Latino/').waitFor();
  await m.waitForTimeout(400); await m.screenshot({ path: OUT + 'p14-panel-avisos-m.png' }); console.log('el dueño ve pausa y plato oculto: ok');
  await m.getByText('Chicharrón de cerdo', { exact: true }).first().scrollIntoViewIfNeeded(); console.log('etiqueta:', await m.getByText('OCULTO POR TO’LATINO', { exact: true }).count());
  console.log('historial:', sql("select string_agg(action, ', ' order by at) from audit_entries where target_id='sabor-dominicano' and action like 'menu.plato.ocultar' or (target_id='sabor-dominicano' and action like 'negocio.modulo%')"));
  sql("update items set status='live', hidden_reason=null where business_id='sabor-dominicano'"); sql("update businesses set modules_off='{}' where id='sabor-dominicano'");
  console.log('errores:', err.length ? err : 'ninguno'); await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
