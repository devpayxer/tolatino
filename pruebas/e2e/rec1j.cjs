const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright');
const OUT = ENT.S + '/cap/', FP = ENT.rec('fotos') + '/', B = 'http://localhost:3100';
const medios = (ctx) => ctx.route('**/medios/**', async (r) => { const u = new URL(r.request().url()); const body = await new Promise((ok) => require('http').get({ host: '127.0.0.1', port: 3902, path: u.pathname.replace(/^\/medios/, ''), headers: { host: 'medios.web.garage' } }, (res) => { const c = []; res.on('data', (x) => c.push(x)); res.on('end', () => ok({ s: res.statusCode, b: Buffer.concat(c) })); })); return r.fulfill({ status: body.s, body: body.b, contentType: 'image/jpeg' }); });
const entrar = async (p, tel, nombre) => { await p.goto(B + '/entrar'); const j = (u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]); const a = await j('/api/cuenta/codigo', { telefono: tel }); if (!a.codigoPrueba) throw new Error('sin código ' + JSON.stringify(a)); const v = await j('/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); if (!v.nombre && nombre) await j('/api/cuenta/perfil', { nombre, apellido: 'Prueba', apodo: '' }); };
const t = (p, x) => p.getByText(x, { exact: true }).last();
const shot = async (p, n, full = true) => { await p.waitForTimeout(450); await p.screenshot({ path: OUT + n, fullPage: full }); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const mob = () => b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  // A. Reclamo con código (negocio sin dueño)
  const c1 = await mob(); await medios(c1); const p = await c1.newPage(); watch(p, 'reclama1'); await entrar(p, '5705550166', 'Ramón');
  await p.goto(B + '/recuperar/bufete-almonte'); await p.locator('text=¿QUÉ ERES DEL NEGOCIO?').waitFor(); await shot(p, 'j1-form-m.png');
  await t(p, 'Mandarme el código').click(); await p.locator('[data-modo-pruebas] b').waitFor(); const cod = (await p.locator('[data-modo-pruebas] b').textContent()).trim();
  await p.locator('input[placeholder="000000"]').fill(cod); await shot(p, 'j2-codigo-m.png');
  await t(p, 'Verificar').click(); await p.locator('text=Lo estamos revisando').first().waitFor(); await shot(p, 'j3-estado-m.png');
  // B. Reclamo con documento (negocio con dueño)
  const c2 = await mob(); await medios(c2); const q = await c2.newPage(); watch(q, 'reclama2'); await entrar(q, '5705550155', 'Lucía');
  await q.goto(B + '/recuperar/barberia-7747'); await q.locator('text=ya tiene una cuenta a cargo').first().waitFor();
  const fc = q.waitForEvent('filechooser'); await t(q, 'Subir foto del documento').click(); await (await fc).setFiles(FP + 'galeria.png'); await q.locator('text=Cambiar foto').waitFor();
  await shot(q, 'j4-doc-m.png'); await t(q, 'Enviar').click(); await q.locator('text=Lo estamos revisando').first().waitFor();
  // Dueño actual ve el aviso
  const c3 = await mob(); const o = await c3.newPage(); watch(o, 'dueño'); await entrar(o, '5705557747');
  await o.goto(B + '/panel/barberia-7747'); await o.locator('text=/Alguien pidió recuperar/').waitFor(); await shot(o, 'j5-panel-aviso-m.png', false);
  // C. Admin aplica el reclamo sin dueño; el de con dueño no se puede antes de 7 días
  const ad = await b.newContext({ viewport: { width: 1440, height: 900 } }); await medios(ad); const a = await ad.newPage(); watch(a, 'admin'); await entrar(a, '5705550199');
  await a.goto(B + '/admin/colas?cola=cambio'); await a.locator('text=Reclamo · Barbería').first().click(); await a.locator('text=EVIDENCIAS').waitFor(); await a.waitForTimeout(800); await shot(a, 'j6-caso-doc-d.png');
  await t(a, 'Aplicar cambio').click(); await a.locator('textarea').fill('Documento coincide'); await t(a, 'Aplicar').click(); await a.locator('text=/tiene 7 días desde el aviso/').waitFor(); console.log('con dueño bloqueado: ok');
  await a.goto(B + '/admin/colas?cola=cambio'); await a.locator('text=Reclamo · Bufete').first().click(); await a.locator('text=EVIDENCIAS').waitFor();
  await t(a, 'Aplicar cambio').click(); await a.locator('textarea').fill('Código correcto y llamamos al local'); await t(a, 'Aplicar').click(); await a.locator('text=Cambio aplicado. Ya es el dueño.').waitFor();
  await p.goto(B + '/recuperar/bufete-almonte'); await p.locator('text=Ya es tuyo').first().waitFor(); await shot(p, 'j7-aprobado-m.png');
  await t(p, 'Abrir tu panel').click(); await p.waitForURL('**/panel/bufete-almonte'); console.log('panel del nuevo dueño: ok');
  // D. Crear semilla desde Recomendaciones → fila en la categoría
  await a.goto(B + '/admin/colas?cola=rec'); await a.locator('text=Recomendado por un vecino').first().click(); await t(a, 'Crear semilla').click(); await a.locator('text=/Semilla creada/').waitFor();
  const v = await (await mob()).newPage(); watch(v, 'vecino'); await v.goto(B + '/c/comida'); await v.locator('text=SIN RECLAMAR').first().scrollIntoViewIfNeeded(); await v.waitForTimeout(500); await v.locator('text=SIN RECLAMAR').first().screenshot({ path: OUT + 'j8-semilla-m.png' }).catch(() => {});
  await shot(v, 'j8b-categoria-m.png', false);
  // Documento privado: sin permiso no se ve
  const r404 = await (await b.newContext()).request.get(B + '/api/admin/reclamo/CL-7102'); console.log('documento sin permiso →', r404.status());
  console.log('errores:', err.length ? err : 'ninguno'); await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n')[0]); process.exit(1); });
