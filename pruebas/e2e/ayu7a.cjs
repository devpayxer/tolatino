// 7a · Centro de ayuda y la ayuda como base: buscar ES/EN, audiencias (vecino, panel, portero, equipo) por lista, búsqueda y enlace directo,
// secciones solo-equipo, pausar/volver a usar desde el Super Admin (sale del centro y vuelve), reindexar sin cambios (y lo pausado sigue
// pausado), y los «Ayuda» de Mi cuenta, Panel › Más y To'Latino Puerta que llevan a artículos reales. Teléfono 390 y escritorio 1360.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const slugs = async (p) => p.$$eval('[data-ayuda]', (xs) => [...new Set(xs.map((x) => x.getAttribute('data-ayuda')))]);
const estado = async (p, url) => (await p.goto(B + url)).status();
const indexar = () => execSync(`cd ${ENT.RAIZ} && node scripts/ayuda/indexar.mjs | docker exec -i ${ENT.DB} psql -U tolatino -d tolatino -qAt -v ON_ERROR_STOP=1`).toString().trim().split('\n').pop();
const VECINO = '5705550122', DUENA = '5705550433', PORTERO = '5705550511', ADM = '5705550199';
const P = 'pagar-con-tarjeta';

(async () => {
  sql(`update help_articles set status = 'live', paused_reason = null, paused_by = null, paused_at = null where slug = '${P}'`);
  const br = await chromium.launch();
  const tel = async () => br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const esc = async () => br.newContext({ viewport: { width: 1360, height: 900 } });

  console.log('1 · Sin cuenta (vecino): lista, buscar ES y EN, enlaces directos');
  let c = await tel(), p = await c.newPage();
  ok(await estado(p, '/ayuda') === 200, '/ayuda abre sin cuenta');
  let s = await slugs(p);
  ok(s.length >= 90, `la lista tiene los artículos de vecinos (${s.length})`);
  ok(!s.some((x) => /^(admin|panel|puerta)-/.test(x)) && !s.includes('panel'), 'ningún artículo de equipo, panel ni puerta en la lista');
  ok((await texto(p)).includes('Centro de ayuda') && !(await texto(p)).includes('Tu panel'), 'sin el tema «Tu panel»');
  await p.screenshot({ path: OUT + 'e7a-centro-390.png', fullPage: false });
  await p.fill('input[name=q]', 'devolución'); await p.press('input[name=q]', 'Enter');
  await espera(async () => p.url().includes('q='));
  await p.waitForSelector('[data-screen-label="Ayuda · resultados"]');
  s = await slugs(p);
  ok(s[0] === 'cancelar-y-devoluciones-de-boletos' || s.slice(0, 3).some((x) => /devoluciones|ayuda-con/.test(x)), `«devolución» encuentra el artículo de devoluciones (${s.slice(0, 3).join(', ')})`);
  ok(!s.some((x) => /^(admin|panel|puerta)-/.test(x)), 'la búsqueda de un vecino no trae equipo ni panel');
  await p.screenshot({ path: OUT + 'e7a-buscar-390.png' });
  // Una palabra que solo está en ayudas del equipo y del panel.
  await p.goto(B + '/ayuda?q=' + encodeURIComponent('código de arranque'));
  s = await slugs(p);
  ok(!s.some((x) => /^(admin|panel|puerta)-/.test(x)), `«código de arranque» (solo en admin-equipo) no sale para un vecino (${s.length} resultados)`);
  await p.goto(B + '/ayuda?q=' + encodeURIComponent('Tomar siguiente liquidaciones'));
  s = await slugs(p); ok(!s.some((x) => /^(admin|panel)-/.test(x)), 'palabras del Super Admin y del panel: nada del equipo ni del panel');
  for (const u of ['/ayuda/admin-equipo', '/ayuda/admin-ayuda', '/ayuda/panel-pedidos', '/ayuda/puerta-escanear', '/ayuda/no-existe', '/ayuda/..%2Fadmin-equipo'])
    ok(await estado(p, u) === 404, `enlace directo ${u} → 404`);
  // Inglés
  await c.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
  await p.goto(B + '/ayuda?q=refund');
  s = await slugs(p);
  ok(s.includes('cancelar-y-devoluciones-de-boletos') || s.some((x) => x.startsWith('ayuda-con')), `«refund» en inglés encuentra devoluciones (${s.slice(0, 3).join(', ')})`);
  ok((await texto(p)).includes('Help center') && (await texto(p)).includes('RESULT'), 'el centro en inglés');
  await c.addCookies([{ name: 'tl_lang', value: 'es', url: B }]);
  // Sección solo-equipo (cuenta-entrar › Para El Compa) no sale.
  ok(await estado(p, '/ayuda/cuenta-entrar') === 200, 'artículo de vecino abre');
  let t = await texto(p);
  ok(!t.includes('Para El Compa') && !t.includes('Nunca pidas el código'), 'la sección solo-equipo no sale para un vecino');
  ok(t.includes('Entrar o crear tu cuenta') && t.includes('ACTUALIZADO EL'), 'título y versión');
  // Ver en inglés
  await p.goto(B + '/ayuda/' + P);
  await p.click('button[data-idioma=en]'); await espera(async () => p.url().includes('l=en'));
  ok(await espera(async () => (await texto(p)).includes('What it does')), '«See in English» muestra el inglés');
  await p.screenshot({ path: OUT + 'e7a-articulo-en-390.png' });
  await p.goto(B + '/ayuda/ayuda-con-el-pedido');
  ok((await texto(p)).includes('Si pagaste con tarjeta'), 'ayuda-con-el-pedido ya no dice que no hay tarjeta');
  ok(!(await texto(p)).includes('Todavía no hay pagos con tarjeta'), 'sin la frase vieja');
  const link = p.locator('a[href="/ayuda/pagar-con-tarjeta"]').first();
  ok(await link.count() > 0, 'la mención `pagar-con-tarjeta.md` es un enlace a un artículo real');
  await link.click(); await espera(async () => p.url().endsWith('/ayuda/pagar-con-tarjeta'));
  ok((await texto(p)).includes('Pagar con tarjeta'), 'el enlace abre el artículo');
  await p.screenshot({ path: OUT + 'e7a-articulo-390.png', fullPage: true });
  await c.close();

  console.log('2 · Vecino con cuenta');
  c = await tel(); p = await c.newPage(); await entrar(p, VECINO);
  await p.goto(B + '/ayuda'); s = await slugs(p);
  ok(!s.some((x) => /^(admin|panel|puerta)-/.test(x)), 'vecino con cuenta: solo vecino');
  ok(await estado(p, '/ayuda/panel-pedidos') === 404 && await estado(p, '/ayuda/admin-equipo') === 404, 'vecino: panel y equipo → 404');
  // Mi cuenta › Ayuda
  await p.goto(B + '/cuenta');
  await p.getByText('CENTRO DE AYUDA · ES / EN').first().click();
  ok(await espera(async () => p.url().endsWith('/ayuda')), 'Mi cuenta › Ayuda → /ayuda');
  await c.close();
  c = await esc(); p = await c.newPage(); await entrar(p, VECINO);
  await p.goto(B + '/cuenta');
  const navAyuda = p.locator('[data-screen-label="Mi cuenta · navegación"]').getByText('Ayuda', { exact: true });
  await navAyuda.first().waitFor({ timeout: 15000 }).catch(() => {}); // 9b-1 · contaba antes de que la página terminara de pintar (en rojo 1 de 6 corridas)
  ok(await navAyuda.count() > 0, `Mi cuenta (escritorio): «Ayuda» en la navegación${await navAyuda.count() ? '' : ` (url ${p.url()})`}`);
  await navAyuda.first().click(); ok(await espera(async () => p.url().endsWith('/ayuda')), 'la navegación lleva al centro');
  await p.screenshot({ path: OUT + 'e7a-centro-1360.png' });
  await p.goto(B + '/ayuda/comprar-boletos');
  await p.screenshot({ path: OUT + 'e7a-articulo-1360.png' });
  await c.close();

  console.log('3 · Dueña (panel): ve «Tu panel»; Panel › Más › Ayuda');
  c = await tel(); p = await c.newPage(); await entrar(p, DUENA);
  await p.goto(B + '/ayuda?t=panel'); s = await slugs(p);
  ok(s.length >= 25 && s.every((x) => /^panel|servicios-|tu-herramienta|productos-|inventario|esta-noche|grupos|cupos|licencia|horarios|membresias|salidas|calendario/.test(x)), `el tema «Tu panel» con sus artículos (${s.length})`);
  ok(await estado(p, '/ayuda/panel-pedidos') === 200, 'un miembro del panel abre panel-pedidos');
  ok((await texto(p)).includes('PARA TU NEGOCIO'), 'con su etiqueta');
  ok(await estado(p, '/ayuda/admin-equipo') === 404, 'el panel no abre la ayuda del equipo');
  await p.goto(B + '/ayuda?q=' + encodeURIComponent('Cobros')); s = await slugs(p);
  ok(s.some((x) => x.startsWith('panel')) && !s.some((x) => x.startsWith('admin-')), `«Cobros»: trae panel y nada del equipo (${s.slice(0, 4).join(', ')})`);
  await p.goto(B + '/panel/rentas-hazleton-latino/hoy');
  await p.goto(B + '/panel/rentas-hazleton-latino/mas').catch(() => null);
  const masAyuda = p.getByText('Cómo funciona cada parte de tu panel', { exact: false });
  if (!(await masAyuda.count())) { await p.goto(B + '/panel/rentas-hazleton-latino/hoy'); await p.getByText('Más', { exact: true }).last().click().catch(() => null); }
  ok(await espera(async () => (await masAyuda.count()) > 0), 'Panel › Más tiene «Ayuda»');
  await p.screenshot({ path: OUT + 'e7a-panel-mas-390.png' });
  await masAyuda.first().click();
  ok(await espera(async () => p.url().includes('/ayuda?t=panel')), 'Panel › Más › Ayuda → /ayuda?t=panel');
  await p.waitForSelector('[data-tema=panel]');
  await p.screenshot({ path: OUT + 'e7a-panel-ayuda-390.png' });
  await c.close();

  console.log('4 · Portero: ve «La puerta» desde To\'Latino Puerta');
  c = await tel(); p = await c.newPage(); await entrar(p, PORTERO);
  await p.goto(B + '/puerta');
  await p.getByText('Cómo funciona la puerta').first().click();
  ok(await espera(async () => p.url().includes('/ayuda?t=puerta')), 'Puerta › Cómo funciona la puerta → /ayuda?t=puerta');
  await p.waitForSelector('[data-tema=puerta]'); s = await slugs(p);
  ok(s.includes('puerta-escanear') && s.includes('puerta-sin-conexion'), 'los dos artículos de la puerta');
  ok(await estado(p, '/ayuda/puerta-escanear') === 200, 'el portero abre puerta-escanear');
  ok(await estado(p, '/ayuda/panel-pedidos') === 404 && await estado(p, '/ayuda/admin-equipo') === 404, 'el portero no abre panel ni equipo');
  await c.close();

  console.log('5 · Super Admin: ve el equipo; pausa y vuelve a usar');
  c = await esc(); p = await c.newPage(); await entrar(p, ADM);
  await p.goto(B + '/ayuda'); s = await slugs(p);
  ok(s.some((x) => x.startsWith('admin-')) && s.some((x) => x.startsWith('panel')), 'el equipo ve también equipo y panel');
  ok(await estado(p, '/ayuda/admin-equipo') === 200 && (await texto(p)).includes('SOLO EQUIPO'), 'admin-equipo abre con «SOLO EQUIPO»');
  await p.goto(B + '/ayuda/cuenta-entrar');
  ok((await texto(p)).includes('Para El Compa'), 'el equipo ve la sección solo-equipo de un artículo de vecinos');
  await p.goto(B + '/admin/textos');
  ok(await espera(async () => (await texto(p)).includes('Textos y páginas') && (await texto(p)).includes('EN USO')), 'Textos y páginas › Ayuda abre');
  await p.screenshot({ path: OUT + 'e7a-admin-1360.png' });
  await p.goto(B + '/admin/textos?q=' + P);
  const L0 = +sql(`select count(*) from help_article_log where slug = '${P}' and action = 'paused'`), A0 = +sql(`select count(*) from audit_entries where action = 'ayuda.pausar' and target_id = '${P}'`);
  const fila = p.getByText('Pausar', { exact: true }).first();
  await fila.click();
  await espera(async () => (await texto(p)).includes('Pausar ·'));
  await p.getByText('Dice algo que ya no es cierto.').first().click();
  await p.screenshot({ path: OUT + 'e7a-admin-pausar-1360.png' });
  await p.locator('button, [role=button]').filter({ hasText: /^Pausar$/ }).last().click();
  ok(await espera(async () => sql(`select status from help_articles where slug = '${P}'`) === 'paused'), 'pausado en la base');
  ok(+sql(`select count(*) from help_article_log where slug = '${P}' and action = 'paused' and by is not null and reason is not null`) === L0 + 1, 'en el libro con quién y motivo');
  ok(+sql(`select count(*) from audit_entries where action = 'ayuda.pausar' and target_id = '${P}'`) === A0 + 1, 'en la auditoría');
  await p.goto(B + '/ayuda/' + P);
  ok((await texto(p)).includes('PAUSADO POR EL EQUIPO'), 'el equipo ve el artículo pausado con el motivo');
  // Reindexar sin cambios: nada cambia y sigue pausado.
  const log0 = sql(`select count(*) from help_article_log`);
  ok(/0 nuevos · 0 cambiados · \d+ iguales · 0 retirados/.test(indexar()), 'reindexar sin cambios: 0 nuevos, 0 cambiados');
  ok(sql(`select count(*) from help_article_log`) === log0 && sql(`select status from help_articles where slug = '${P}'`) === 'paused', 'nada en el libro y sigue pausado');
  // Como vecino: desaparece.
  const cv = await tel(), pv = await cv.newPage();
  await pv.goto(B + '/ayuda?t=pedidos'); s = await slugs(pv);
  ok(!s.includes(P), 'pausado: no sale en la lista del vecino');
  await pv.goto(B + '/ayuda?q=tarjeta'); s = await slugs(pv);
  ok(!s.includes(P), 'pausado: no sale en la búsqueda');
  await pv.goto(B + '/ayuda/' + P); t = await texto(pv);
  ok(t.includes('Este artículo se está revisando') && !t.includes('To\'Latino nunca ve el número completo') && !t.includes('ya no es cierto'), 'pausado: el enlace dice que se revisa, sin texto ni motivo');
  await pv.screenshot({ path: OUT + 'e7a-pausado-390.png' });
  // Volver a usar
  await p.goto(B + '/admin/textos?est=paused');
  await p.getByText('Volver a usar', { exact: true }).first().click();
  await p.getByText('Revisado: está bien.').first().click();
  await p.locator('button, [role=button]').filter({ hasText: /^Volver a usar$/ }).last().click();
  ok(await espera(async () => sql(`select status from help_articles where slug = '${P}'`) === 'live'), 'vuelve a estar en uso');
  await pv.goto(B + '/ayuda?q=tarjeta'); s = await slugs(pv);
  ok(s.includes(P), 'vuelve a salir en la búsqueda del vecino');
  await cv.close(); await c.close();
  c = await tel(); p = await c.newPage(); await entrar(p, ADM);
  await p.goto(B + '/admin/textos'); await espera(async () => (await texto(p)).includes('EN USO'));
  await p.screenshot({ path: OUT + 'e7a-admin-390.png' });
  // 6 · Un vecino no abre Textos y páginas.
  await c.close(); c = await tel(); p = await c.newPage(); await entrar(p, VECINO);
  await p.goto(B + '/admin/textos'); t = await texto(p); ok(t.includes('Esta zona es del equipo') && !t.includes('EN USO'), 'un vecino no entra a Textos y páginas');
  await c.close();
  await br.close();
  console.log(`\n${n} ✓`);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
