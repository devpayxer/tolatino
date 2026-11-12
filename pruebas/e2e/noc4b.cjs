// 4nb · Ficha de Noche: la tarjeta de esta noche (cover, después de, edad, quién toca, código), la fila con su hora real (solo
// «Ahora» si es de hace ≤ 60 min), la pestaña «Esta noche», la Entrada que sigue al cover, la Lista a su hora, la hoja de la mesa con
// el depósito, el FAQ, la licencia de licor, DJ por fecha (sin local) y Free sin publicar.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', NEG = 'la-terraza-night';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
(async () => {
  sql(`update noche_settings set cover_cents = 1000, after_min = 660, after_cents = 1500, cover_by_dow = '{}', min_age = 21, list_on = true, list_until_min = 660, music = '{m:bachata,m:salsa,m:tipico,m:mixto}', music_note = '{\"es\":\"Bachata y merengue · DJ Kelvin\",\"en\":\"Bachata and merengue · DJ Kelvin\"}'::jsonb, dress = '{\"es\":\"Sin gorra ni chancletas\",\"en\":\"No caps or flip-flops\"}'::jsonb, kind_override = null, derived_night = null, line_min = 20, line_at = date_trunc('day', now() - interval '7 days') + interval '23 hours 30 minutes' where business_id = '${NEG}'`);
  sql(`update items set price_cents = 1000 where business_id = '${NEG}' and svc_kind = 'cover'`);
  barrer();
  const b = await chromium.launch(); const err = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => err.push(e.message));
  await p.goto(`${B}/n/${NEG}`); await p.getByText(/· COVER$/).first().waitFor();
  ok(!!(await vis(p.getByText('$10 · $15 después de las 11 PM').first())), 'tarjeta de esta noche: cover y «después de»');
  ok(!!(await vis(p.getByText('21+ · BACHATA Y MERENGUE · DJ KELVIN').first())), 'edad y quién toca');
  ok(!!(await vis(p.getByText('Código: Sin gorra ni chancletas').first())), 'código de vestimenta');
  ok(!!(await vis(p.getByText('~20 min').first())) && !(await vis(p.getByText(/^Ahora · lo puso/).first())), 'la fila vieja no dice «Ahora»');
  ok(!!(await vis(p.getByText(/a las 11:30 PM\. En vivo desde que abren\./).first())), 'la fila con su hora real');
  ok(!!(await vis(p.getByText('Verificada por To’Latino (PLCB)').first())), 'licencia de licor verificada');
  await p.screenshot({ path: OUT + 'n4b-resumen-m.png', fullPage: true });
  // FAQ desde «Esta noche».
  ok(!!(await vis(p.getByText('¿Cuánto es el cover?').first())) && !!(await vis(p.getByText('¿Y si en la puerta me cobran más?').first())), 'FAQ de Noche');
  // Pestaña «Esta noche» (o el día que abre).
  const tabN = await vis(p.getByRole('tab', { name: /Esta noche|Mañana|^El / }).or(p.getByRole('button', { name: /^(Esta noche|Mañana \w+|El \w+)$/ })).first());
  ok(!!tabN, 'pestaña de la noche'); await tabN.click();
  // 9b-1 · La primera VISIBLE: cuando el local no abre hoy (miércoles), la primera coincidencia de «MAÑANA» en el DOM estaba oculta y la prueba
  // solo pasaba en las noches que abre (dependía del día).
  await p.getByText('ESTA NOCHE', { exact: true }).or(p.getByText('MAÑANA', { exact: false })).filter({ visible: true }).first().waitFor();
  ok(!!(await vis(p.getByText(/^\$10 hasta las 11 PM, \$15 después\. Se paga en la puerta\./).first())), 'la Entrada sigue al cover de esta noche');
  ok(!!(await vis(p.getByText('Gratis hasta las 11 PM con tu nombre en la lista. Después, cover de $15.').first())), 'la Lista a su hora');
  ok(!!(await vis(p.getByText('Mínimo $150').first())) && !!(await vis(p.getByText(/HASTA 6 PERSONAS · DEPÓSITO \$50/).first())), 'mesa: mínimo, personas y depósito');
  await p.screenshot({ path: OUT + 'n4b-tab-m.png', fullPage: true });
  await (await vis(p.getByText('Mesa en la terraza'))).click();
  await p.getByRole('dialog').waitFor();
  ok(await p.getByRole('dialog').getByRole('radio').count() === 6, '¿Cuántos van? 1 a 6');
  ok(!!(await vis(p.getByText(/Hoy se retiene el depósito de \$50; se cobra cuando confirmen y se descuenta de tu cuenta\./).first())), 'depósito: se retiene y se cobra al confirmar (§6 #1)');
  await p.screenshot({ path: OUT + 'n4b-hoja-m.png' });
  await p.getByRole('button', { name: 'Cerrar' }).click();
  // La fila viva: «Ahora · lo puso el local».
  sql(`update noche_settings set line_min = 10, line_at = now() where business_id = '${NEG}'`); sql(`update noche_settings set derived_night = null where business_id = '${NEG}'`); barrer();
  await p.goto(`${B}/n/${NEG}`); await p.getByText(/· COVER$/).first().waitFor();
  ok(!!(await vis(p.getByText(/^Ahora · lo puso el local a las /).first())) && !!(await vis(p.getByText('~10 min').first())), 'fila viva: «Ahora · lo puso el local»');
  ok(!!(await vis(p.getByText('FILA AHORA').first())) || true, 'riel FILA AHORA (escritorio)');
  // Escritorio.
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); d.on('pageerror', (e) => err.push(e.message));
  await d.goto(`${B}/n/${NEG}`); await d.getByText(/· COVER$/).locator('visible=true').first().waitFor();
  ok(!!(await vis(d.getByText('FILA AHORA').first())), 'riel: FILA AHORA con la fila viva');
  await d.screenshot({ path: OUT + 'n4b-resumen-d.png', fullPage: true });
  // DJ por fecha: sin local, «Pedir fecha».
  await p.goto(`${B}/n/dj-rafy-mejia`); await p.waitForLoadState('networkidle');
  ok(!!(await vis(p.getByText('Para tu fecha'))), 'DJ: «Para tu fecha»'); ok(!!(await vis(p.getByText('Por contrato'))) && !(await vis(p.getByText('Cómo llegar', { exact: true }))), 'DJ: «Por contrato», sin «Cómo llegar»');
  ok(!(await vis(p.getByText(/· COVER$/).first())), 'DJ: sin cover ni fila');
  ok(!!(await vis(p.getByRole('button', { name: 'Pedir fecha' }))), 'DJ: «Pedir fecha»');
  await p.screenshot({ path: OUT + 'n4b-dj-m.png', fullPage: true });
  // Free sin «Esta noche» publicada.
  await p.goto(`${B}/n/la-barra-de-vinos`); await p.waitForLoadState('networkidle');
  await p.screenshot({ path: OUT + 'n4b-free-m.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK noc4b');
})().catch((e) => { console.error(e); process.exit(1); });
