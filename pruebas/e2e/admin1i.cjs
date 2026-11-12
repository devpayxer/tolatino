const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright');
// 9b-1 · Su propio negocio recién publicado por /publica (antes `barberia-7747`, que solo existía en una base vieja).
const { publicarBarberia, medios } = require('../lib/negocio-nuevo.cjs');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); const j = (u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]); const a = await j('/api/cuenta/codigo', { telefono: tel }); if (!a.codigoPrueba) throw new Error('sin código ' + JSON.stringify(a)); await j('/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓ ' + m); };
const t = (p, x) => p.getByText(x, { exact: true }).last();
const shot = async (p, n, full = true) => { await p.waitForTimeout(450); await p.screenshot({ path: OUT + n, fullPage: full }); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const NEG = await publicarBarberia(b), BIZ = NEG.id; console.log('negocio nuevo:', BIZ, NEG.nombre);
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  // Dueño pide el sello
  const om = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await medios(om);
  const o = await om.newPage(); watch(o, 'dueño'); await entrar(o, NEG.tel);
  await o.goto(B + '/panel/' + BIZ + '/pagina/ver'); await o.locator('text=SELLO VERIFICADO POR').waitFor();
  const pedir = o.locator('text=/^(Solicitar sello|Volver a pedir el sello)$/'); if (await pedir.count()) { await pedir.last().click(); await o.locator('text=EN REVISIÓN').first().waitFor(); }
  await shot(o, 'i1-panel-sello-m.png');
  // Admin escritorio: colas
  const ad = await b.newContext({ viewport: { width: 1440, height: 900 } }); await medios(ad);
  const a = await ad.newPage(); watch(a, 'admin'); await entrar(a, '5705550199');
  await a.goto(B + '/admin/colas'); await a.locator('text=Todo lo que espera una decisión').waitFor();
  await shot(a, 'i2-colas-d.png');
  await a.goto(B + '/admin/colas?cola=sello'); await a.getByText('Sello · ' + NEG.nombre, { exact: true }).first().click(); await a.locator('text=LISTA DE VERIFICACIÓN').waitFor();
  await t(a, 'Aprobar sello').click(); await a.locator('text=Marca las tres comprobaciones primero.').waitFor();
  if (await a.getByText('Tomar', { exact: true }).count()) { await t(a, 'Tomar').click(); await a.locator('text=Lo tomaste.').waitFor(); await a.waitForTimeout(600); }
  for (const x of ['Existe en', 'Quien pide representa', 'La página dice lo que']) await a.locator(`text=/${x}/`).first().click();
  await shot(a, 'i3-caso-sello-d.png');
  await t(a, 'Aprobar sello').click(); await a.locator('text=Sello otorgado.').waitFor(); console.log('  ✓ sello otorgado');
  // Negocio nuevo: todo bien
  await a.goto(B + '/admin/colas?cola=nuevo'); await a.getByText(NEG.nombre, { exact: true }).first().click(); await a.locator('text=Revisión ligera:').waitFor();
  await shot(a, 'i4-caso-nuevo-d.png');
  await t(a, 'Todo bien').click(); await a.locator('text=Listo. Quedó en la auditoría.').waitFor(); console.log('  ✓ negocio nuevo revisado («Todo bien»)');
  // Negocios: lista y 360
  await a.goto(B + '/admin/negocios'); await a.locator('text=TODOS LOS NEGOCIOS').waitFor(); await shot(a, 'i5-negocios-d.png', false);
  await a.goto(B + '/admin/negocios/' + BIZ); await a.locator('text=NEGOCIO 360°').first().waitFor(); await shot(a, 'i6-360-d.png');
  await t(a, 'Cierre temporal').click(); await t(a, '1 día').click(); await t(a, 'Varios reportes coinciden').click(); await t(a, 'Confirmar').click();
  await a.locator('text=/Cerrado temporalmente hasta/').waitFor();
  const f = await ad.newPage(); await f.goto(B + '/n/' + BIZ); ok((await f.locator('text=/Cerrado temporalmente/').count()) > 0, 'la ficha dice «Cerrado temporalmente»'); await f.close();
  await o.goto(B + '/panel/' + BIZ); await o.locator('text=/To’Latino cerró tu página por unos días/').waitFor(); await shot(o, 'i7-panel-avisos-m.png');
  await t(a, 'Reabrir').click(); await a.locator('textarea').fill('Se resolvió con el dueño'); await t(a, 'Confirmar').click(); await a.locator('text=Reabierto.').waitFor();
  await a.goto(B + '/admin/negocios/' + BIZ + '?tab=ficha'); await a.locator('text=LO QUE VE EL CLIENTE').waitFor();
  await a.locator('text=Nombre').first().locator('xpath=ancestor::div[contains(@style,"flex-direction: column")][1]').getByText('Editar', { exact: true }).click().catch(async () => { await a.getByText('Editar', { exact: true }).first().click(); });
  await a.locator('text=NUEVO VALOR').waitFor(); const inp = a.locator('input').last(); await inp.fill(NEG.nombre + ' Hazleton');
  await a.locator('textarea').fill('El letrero dice ' + NEG.nombre + ' Hazleton'); await shot(a, 'i8-editar-d.png', false); await t(a, 'Guardar').click(); await a.locator('text=Guardado. El dueño lo ve en su panel.').waitFor();
  await shot(a, 'i9-360-ficha-d.png');
  await o.goto(B + '/panel/' + BIZ); await o.locator('text=/To’Latino corrigió tu nombre/').waitFor(); console.log('  ✓ el dueño ve «To’Latino corrigió tu nombre»'); await shot(o, 'i10-panel-nombre-m.png');
  // Admin en el teléfono
  const am = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await medios(am); await am.addCookies(await ad.cookies());
  const m = await am.newPage(); watch(m, 'admin-m'); await m.goto(B + '/admin/colas'); await m.locator('text=Todo lo que espera una decisión').waitFor(); await shot(m, 'i11-colas-m.png');
  await m.goto(B + '/admin/negocios/' + BIZ); await m.locator('text=NEGOCIO 360°').first().waitFor(); await shot(m, 'i12-360-m.png');
  // Sin permiso: el dueño no entra al admin
  await o.goto(B + '/admin/colas'); ok(await o.locator('text=/SIN ACCESO|Esta zona es del equipo/').count() > 0, 'el dueño no entra al Super Admin');
  ok(!err.length, 'sin errores en la consola: ' + (err.join(' · ') || 'ninguno')); await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n')[0]); process.exit(1); });
