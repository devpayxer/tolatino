const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); }; // 9b-1 · antes solo imprimía: la corrida la contaba «en verde con 0 ✓»
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', P = '/panel/sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const t = (p, x) => p.getByText(x, { exact: true }).last();
const shot = async (p, n, full = true) => { await p.waitForTimeout(500); await p.screenshot({ path: OUT + n, fullPage: full }); };
const toast = (p, re) => p.locator(`text=${re}`).first().waitFor({ timeout: 10000 });
(async () => {
  sql("update items set sold_out = false, stock_left = 2, stock_day = (now() at time zone 'America/New_York' - interval '6 hours')::date where business_id='sabor-dominicano' and name->>'es'='Tres leches'");
  sql("update items set sold_out = false where business_id='sabor-dominicano' and name->>'es'='Pica pollo'");
  // 9b-1 · «Res guisada» disponible antes de agotarla (la corrida anterior en la misma base la dejaba agotada y no salía «Agotar»).
  sql("update option_groups set options = jsonb_set(options, '{1,on}', 'true') where business_id='sabor-dominicano' and name->>'es'='Elige la carne' and options->1->>'es' = 'Res guisada'");
  const postres0 = sql("select string_agg(price_cents::text, ',' order by id) from items where business_id='sabor-dominicano' and name->>'es' in ('Flan de leche','Tres leches')").split(',').map(Number);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage(); watch(m, 'dueño-m'); await entrar(m, '5705550133');
  await m.goto(B + P + '/vendes'); await m.getByText('Lo que vendes', { exact: true }).first().waitFor(); await shot(m, 'p8-vendes-m.png', false);
  await m.goto(B + P + '/vendes/menu'); await m.getByText('La bandera', { exact: true }).first().waitFor(); await shot(m, 'p9-menu-m.png', false);
  // 1) precio de La bandera: 12 → 12.50
  const ID = sql("select id from items where business_id='sabor-dominicano' and name->>'es'='La bandera'");
  await m.goto(B + P + `/vendes/menu?det=item:${ID}`); await m.getByText('ASÍ SE VE EN TU MENÚ', { exact: true }).waitFor();
  await m.locator('input[inputmode="decimal"]').first().fill('12.50'); await t(m, 'Guardar').click(); await toast(m, '/Guardado/');
  ok(sql(`select price_cents from items where id=${ID}`) === '1250', 'precio de La bandera guardado: $12.50');
  // 2) agotar desde la fila (hasta que lo active) y volver a activar
  await m.goto(B + P + '/vendes/menu'); await m.getByText('Pica pollo', { exact: true }).first().waitFor();
  const fila = m.getByText('Pica pollo', { exact: true }).first().locator("xpath=ancestor::*[.//*[@role='switch']][1]");
  await fila.getByRole('switch').click(); await t(m, 'Hasta que lo active').click(); await toast(m, '/agotado · hasta que lo actives/');
  ok(sql("select sold_out::text from items where business_id='sabor-dominicano' and name->>'es'='Pica pollo'") === 'true', 'Pica pollo agotado hasta que lo active');
  await m.getByText('Pica pollo', { exact: true }).first().locator("xpath=ancestor::*[.//*[@role='switch']][1]").getByRole('switch').click(); await toast(m, '/se puede pedir otra vez/');
  // 3) inventario: − en Tres leches (2 → 1)
  await m.getByRole('tab', { name: /Inventario/i }).click(); await m.getByText('LO QUE CUENTAS', { exact: true }).waitFor();
  const tl = m.getByText('Tres leches', { exact: true }).first().locator("xpath=ancestor::*[contains(@style,'border-radius')][1]");
  await tl.getByText('−').first().click().catch(async () => { await tl.locator('[aria-label*="enos"], [aria-label*="Menos"], button').first().click(); });
  await m.waitForTimeout(1200); ok(sql("select stock_left from items where business_id='sabor-dominicano' and name->>'es'='Tres leches'") === '1', 'inventario: Tres leches de 2 a 1');
  await shot(m, 'p10-inventario-m.png', false);
  // 4) categoría nueva y plato nuevo en ella
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'dueño-d'); await entrar(d, '5705550133');
  await d.goto(B + P + '/vendes/menu?det=mcat:new'); await d.getByText('Nueva categoría', { exact: true }).first().waitFor();
  const nombreCat = 'Desayunos ' + (Date.now() % 1000); await d.locator('aside[data-screen-label="Panel v2 · detalle"] input:not([type=file])').first().fill(nombreCat); await t(d, 'Crear categoría').click(); await toast(d, '/Guardado/');
  const SEC = sql(`select id from item_sections where business_id='sabor-dominicano' and name->>'es'='${nombreCat}'`); ok(/^\d+$/.test(SEC), `categoría nueva «${nombreCat}»`);
  await d.goto(B + P + '/vendes/menu?det=item:new'); await d.getByText('Nuevo plato', { exact: true }).first().waitFor();
  await d.locator('aside[data-screen-label="Panel v2 · detalle"] input:not([type=file])').nth(0).fill('Mangú con salami prueba'); await d.locator('aside[data-screen-label="Panel v2 · detalle"] input[inputmode="decimal"]').first().fill('9'); await d.getByText(nombreCat, { exact: true }).first().click();
  await t(d, 'Agregar al menú').click(); await toast(d, '/Guardado/');
  ok(sql(`select name->>'es' || ' ' || price_cents from items where section_id=${SEC}`) === 'Mangú con salami prueba 900', 'plato nuevo en esa categoría a $9');
  // 5) opción agotada (Elige la carne · Res guisada)
  await d.goto(B + P + '/vendes/menu'); await d.getByRole('tab', { name: /Inventario/i }).click(); await d.locator('input[aria-label^="¿Qué se acabó"]').fill('res guisada');
  await d.getByText('Agotar', { exact: true }).first().click(); await toast(d, '/agotada en/');
  ok(sql("select options->1->>'on' from option_groups where business_id='sabor-dominicano' and name->>'es'='Elige la carne'") === 'false', 'opción «Res guisada» agotada');
  // 6) lote: +$1 a dos postres
  await d.getByRole('tab', { name: /Platos/i }).click(); await t(d, 'Seleccionar').click();
  await d.getByText('Flan de leche', { exact: true }).first().click(); await d.getByText('Tres leches', { exact: true }).first().click();
  await d.getByText('Precio', { exact: true }).first().click(); await d.getByText('+$1', { exact: true }).first().click(); await toast(d, '/Precio nuevo en 2 platos/');
  await shot(d, 'p11-lote-d.png', false);
  const postres1 = sql("select string_agg(price_cents::text, ',' order by id) from items where business_id='sabor-dominicano' and name->>'es' in ('Flan de leche','Tres leches')").split(',').map(Number);
  ok(postres1.length === 2 && postres1.every((c, i) => c === postres0[i] + 100), `lote: +$1 a los dos postres (${postres0} → ${postres1})`);
  sql(`update items set price_cents = price_cents - 100 where business_id='sabor-dominicano' and name->>'es' in ('Flan de leche','Tres leches')`); // cada corrida los dejaba $1 más caros
  // 7) pausar pedidos 30 min
  await d.goto(B + P + '/vendes/menu'); await d.getByRole('tab', { name: /Horarios/i }).click(); await t(d, '30 min').click(); await toast(d, '/En pausa/');
  ok(!!sql("select pause_kind from menu_settings where business_id='sabor-dominicano'"), 'pedidos en pausa 30 min'); await shot(d, 'p12-horarios-d.png', false);
  await t(d, 'Reanudar').click(); await toast(d, '/Recibes pedidos otra vez/');
  // 8) alguien sin acceso no entra
  const x = await (await b.newContext()).newPage(); await entrar(x, '5705550122'); await x.goto(B + P + '/vendes/menu'); ok((await x.locator('body').innerText()).includes('Sin acceso'), 'una vecina sin acceso al panel ve «Sin acceso»');
  ok(!err.length, `sin errores en las páginas (${err.join(' | ').slice(0, 300) || 'ninguno'})`); await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
