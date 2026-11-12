const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright');
const OUT = ENT.S + '/cap/', FP = ENT.rec('fotos') + '/';
// 9b-1 · Su propio negocio recién publicado por /publica (antes `barberia-7747`, que solo existía en una base vieja). TEL/BIZ del
// entorno todavía mandan (para mirar un negocio dado).
const { publicarBarberia, medios } = require('../lib/negocio-nuevo.cjs');
const B = 'http://localhost:3100';
let TEL = process.env.TEL, BIZ = process.env.BIZ;
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓ ' + m); };
const entrar = async (p) => {
  await p.goto(B + '/entrar');
  const j = (u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
  const a = await j('/api/cuenta/codigo', { telefono: TEL });
  if (!a.codigoPrueba) throw new Error('sin código ' + JSON.stringify(a));
  await j('/api/cuenta/verificar', { telefono: TEL, codigo: a.codigoPrueba });
};
(async () => {
  const b = await chromium.launch(); const err = [];
  if (!TEL || !BIZ) { const N = await publicarBarberia(b); TEL = N.tel; BIZ = N.id; console.log('negocio nuevo:', BIZ); }
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await medios(m);
  const p = await m.newPage(); watch(p, 'm');
  await entrar(p);
  await p.goto(B + '/panel'); await p.waitForURL('**/panel/' + BIZ);
  await p.locator('text=FUERZA DEL PERFIL').waitFor();
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h1-pagina-m.png', fullPage: true });
  // Hoy
  await p.locator('div[role=link]:has-text("Hoy")').click(); await p.waitForURL('**/hoy');
  await p.locator('text=Nada pendiente').waitFor();
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h2-hoy-m.png', fullPage: true });
  await p.getByText('Cerrar por hoy', { exact: true }).last().click();
  await p.locator('text=Cerraste por hoy').waitFor(); await p.waitForTimeout(400);
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h3-hoy-cerrado-m.png', fullPage: true });
  const ficha = await (await m.newPage()); await ficha.goto(B + '/n/' + BIZ); const st = await ficha.locator('text=/Cerrado hoy/').first().textContent({ timeout: 8000 }); console.log('ficha dice:', st); await ficha.close();
  await p.getByText('Abrir de nuevo', { exact: true }).last().click(); await p.locator('text=Abierto otra vez.').waitFor();
  // Horario
  await p.goto(B + '/panel/' + BIZ + '/pagina/hor'); await p.locator('text=EMPIEZA CON UNA PLANTILLA').waitFor();
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h4-horario-m.png', fullPage: true });
  await p.locator('text=Lunes').first().click(); await p.waitForTimeout(200);
  await p.locator('[aria-label="+"]').nth(1).click(); await p.locator('[aria-label="+"]').nth(1).click();
  await p.locator('text=CAMBIOS SIN GUARDAR').waitFor();
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h5-horario-editando-m.png' });
  await p.getByText('Guardar', { exact: true }).last().click(); await p.locator('text=Guardado · ya se ve en tu página').waitFor();
  // Fotos
  await p.goto(B + '/panel/' + BIZ + '/pagina/fotos'); await p.locator('text=PORTADA Y LOGO').waitFor();
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h6-fotos-m.png', fullPage: true });
  const fc = p.waitForEvent('filechooser'); await p.locator('text=/^(Subir logo|Cambiar)$/').last().click(); await (await fc).setFiles(FP + 'galeria.png');
  await p.locator('text=Se ve junto al nombre.').waitFor({ timeout: 15000 });
  const fotos = p.locator('[role=button][style*="aspect-ratio"]');
  console.log('fotos en galería:', await fotos.count());
  await fotos.nth(1).click(); await p.getByText('Usar de portada', { exact: true }).last().click(); await p.locator('text=Listo. Ya se ve en tu página.').waitFor();
  await p.waitForTimeout(600);
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h7-fotos-logo-m.png', fullPage: true });
  // Quiénes somos
  await p.goto(B + '/panel/' + BIZ + '/pagina/about'); await p.locator('text=MARCA LO QUE HAY').waitFor();
  await p.locator('textarea').first().fill('Cortamos pelo en Hazleton desde 2015. Fades, barba y diseños. ' + (Date.now() % 97));
  await p.locator('text=Estacionamiento').first().click();
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h8-about-m.png', fullPage: true });
  await p.getByText('Guardar', { exact: true }).last().click(); await p.locator('text=Guardado · ya se ve en tu página').waitFor();
  // Equipo
  await p.goto(B + '/panel/' + BIZ + '/pagina/equipo'); await p.locator('text=TU EQUIPO').first().waitFor();
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h9-equipo-m.png', fullPage: true });
  await p.getByText('Invitar', { exact: true }).last().click(); await p.locator('text=Invitar a alguien').waitFor();
  await p.getByPlaceholder('Ej. Yahaira Cruz').fill('Kelvin Rosario');
  await p.getByPlaceholder('(570) 555-0123').fill('(570) 555-' + String(Date.now()).slice(-4));
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h10-invitar-m.png', fullPage: true });
  await p.getByText('Mandar invitación', { exact: true }).last().click(); await p.locator('text=/Invitación guardada|Invitación enviada/').waitFor();
  await p.waitForTimeout(800);
  await p.locator('text=INVITACIONES SIN ACEPTAR').waitFor();
  await p.locator('text=Kelvin Rosario').first().click(); await p.locator('text=INVITACIÓN SIN ACEPTAR').waitFor();
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h11-invitacion-m.png', fullPage: true });
  await p.getByText('Cancelar invitación', { exact: true }).last().click(); await p.getByText('Sí, cancelar invitación', { exact: true }).last().click(); await p.locator('text=Invitación cancelada.').waitFor();
  await p.waitForTimeout(500);
  await p.locator('text=Mario').first().click(); await p.locator('text=TU PERFIL · LO VE EL CLIENTE').waitFor();
  await p.getByPlaceholder('Cuenta cómo empezaste y qué haces mejor.').fill('Empecé cortando a mis primos en el patio. Hoy hago fades y diseños.');
  await p.getByPlaceholder('Ej. Cocina y parrilla').first().fill('Dueño y barbero ' + (Date.now() % 97));
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h12-persona-m.png', fullPage: true });
  await p.getByText('Guardar', { exact: true }).last().click(); await p.locator('text=Guardado · ya se ve en tu página').waitFor();
  await p.goto(B + '/panel/' + BIZ); await p.locator('text=FUERZA DEL PERFIL').waitFor();
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + 'h13-pagina-despues-m.png', fullPage: true });
  // Escritorio
  const d = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await medios(d); await d.addCookies(await m.cookies());
  const q = await d.newPage(); watch(q, 'd');
  await q.goto(B + '/panel/' + BIZ); await q.locator('text=FUERZA DEL PERFIL').waitFor(); await q.waitForTimeout(400);
  await q.screenshot({ path: OUT + 'h14-pagina-d.png', fullPage: true });
  await q.goto(B + '/panel/' + BIZ + '/pagina/equipo'); await q.locator('text=TU EQUIPO').first().waitFor();
  await q.locator('text=Mario').first().click(); await q.locator('text=TU PERFIL · LO VE EL CLIENTE').waitFor(); await q.waitForTimeout(400);
  await q.screenshot({ path: OUT + 'h15-equipo-d.png', fullPage: true });
  await q.goto(B + '/panel/' + BIZ + '/pagina/hor'); await q.locator('text=EMPIEZA CON UNA PLANTILLA').waitFor(); await q.waitForTimeout(300);
  await q.screenshot({ path: OUT + 'h16-horario-d.png', fullPage: true });
  await q.goto(B + '/panel/' + BIZ + '/hoy'); await q.locator('text=Nada pendiente').waitFor(); await q.waitForTimeout(300);
  await q.screenshot({ path: OUT + 'h17-hoy-d.png', fullPage: true });
  // Otro usuario no entra
  const o = await b.newContext(); const op = await o.newPage(); await op.goto(B + '/panel/' + BIZ); ok(/\/entrar/.test(op.url()), 'sin cuenta, el panel manda a entrar: ' + op.url());
  ok(!err.length, 'sin errores en la página: ' + (err.join(' · ') || 'ninguno'));
  await b.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
