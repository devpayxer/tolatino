// 4s · Reseñas y ayuda de Mercados y Tiendas: dato del pedido (foto de cada peso, cobrado), preguntas del mercado, ≤2★ → Ayuda
// con el pedido, «Lo que importa en un mercado»; ayuda con el pedido (peso, foto obligatoria) → el mercado devuelve a la tarjeta;
// apartado recogido → Ayuda con la compra (no guardaron el apartado) → sin respuesta en 24 h pasa a To'Latino; reseña de tienda.
// Antes: merc4p (deja un pedido del mercado terminado y cobrado con tarjeta).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9a · 7d: con El Compa encendido, «Ayuda con …» abre primero su hoja; la razón «Algo no salió bien / no está bien» lleva al formulario de
// siempre (?de=compa). Ir directo a /ayuda?de=compa es «ya pasé por la hoja».
// Con la operación todavía viva la hoja no trae esa razón (Cancelar, Otra hora, Otra cosa): ahí se sigue como «ya pasé por la hoja».
const pasarHoja = async (p) => { await p.waitForLoadState('networkidle'); const r = p.getByText(/^(Algo no está bien|Algo no salió bien)$/); if (await r.count()) { await r.first().click(); await p.waitForURL(/de=compa/); } else if (!/de=compa/.test(p.url())) await p.goto(p.url() + (p.url().includes('?') ? '&' : '?') + 'de=compa'); };
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', M = 'supermercado-la-cosecha', T = 'boutique-yaritza', FOTO = ENT.rec('fotos') + '/portada.jpg';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const esperaV = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const MARISOL = "(select id from users where phone = '+15705550122')";
const AY = (n, col) => sql(`select ${col} from help_requests h join operations o on o.id = h.operation_id where o.number = '${n}'`);
(async () => {
  const MO = sql(`select o.number from operations o where o.user_id = ${MARISOL} and o.business_id = '${M}' and o.kind = 'market_order' and o.status = 'done' and exists (select 1 from payments p where p.operation_id = o.id and p.status = 'captured') and not exists (select 1 from help_requests h where h.operation_id = o.id) order by o.id desc limit 1`);
  ok(!!MO, `pedido del mercado terminado y cobrado: ${MO}`);
  sql(`update operations set done_at = now() where number = '${MO}'`);
  // Tope de 5 solicitudes por día: las de pruebas anteriores ya cerradas pasan a «ayer».
  sql(`update help_requests set created_at = created_at - interval '2 days' where user_id = ${MARISOL} and created_at > now() - interval '1 day' and status <> 'open'`);
  sql(`update reviews set status = 'removed' where user_id = ${MARISOL} and business_id in ('${M}', '${T}') and status <> 'removed'`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  const hm = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(hm, '5705550288');
  const ht = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(ht, '5705550299');
  for (const p of [m, hm, ht]) { p.on('pageerror', e => err.push(e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); }

  // ── 1. Reseña del mercado: dato del pedido y preguntas ──
  await m.goto(B + `/mercado/${MO}`); await clic(m.getByRole('button', { name: /¿Cómo te fue\?/ })); await m.waitForURL(/\/resena\?pedido=/);
  ok(await espera(m.getByText('TU PEDIDO · DATO DEL PEDIDO')) && await espera(m.getByText('FOTO DE CADA PESO')), 'reseña: dato del pedido con la foto de cada peso');
  ok(await espera(m.getByText('LO QUE IMPORTA EN UN MERCADO')) && await espera(m.getByText('¿ESTABA FRESCO?')) && !(await vis(m.getByText('¿PESARON DELANTE DE TI?'))), 'preguntas del mercado (pesaron delante solo para visitantes)');
  await clic(m.getByRole('button', { name: '2 ★', exact: true }));
  ok(await espera(m.getByText(/Si el peso no cuadra, faltó algo o no estaba fresco, pídelo en Ayuda con el pedido/)), '≤2★: la reseña no devuelve dinero → Ayuda con el pedido');
  await clic(m.getByText('No estaba fresco', { exact: true })); await clic(m.getByText('Me preguntaron', { exact: true }));
  await (await vis(m.getByLabel('Tu reseña'))).fill('La pierna llegó con mal olor, lo demás bien y me llamaron antes de cambiar el aguacate.');
  await m.screenshot({ path: OUT + 's1-resena-merc-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: /^Publicar/ }));
  await m.waitForURL((u) => !/\/resena\?/.test(u.toString())).catch(() => {});
  ok((await esperaV(() => sql(`select (answers->>'fresco') || '|' || (answers->>'sust') || '|' || (facts->>'fotoPeso') || '|' || src from reviews r join operations o on o.id = r.operation_id where o.number = '${MO}' and r.status = 'visible'`), '-1|ok|true|' + (sql(`select mode from operations where number = '${MO}'`) === 'delivery' ? 'dl' : 'pk'))).startsWith('-1|ok|true'), 'reseña guardada: no estaba fresco · me preguntaron · foto de cada peso (dato)');
  await m.goto(B + `/n/${M}?tab=rev`); ok(await espera(m.getByText('LO QUE IMPORTA EN UN MERCADO')) && await espera(m.getByText('SUSTITUCIONES CON TU OK')), 'ficha: «Lo que importa en un mercado»');
  await m.screenshot({ path: OUT + 's2-importa-merc-m.png', fullPage: true });

  // ── 2. Ayuda con el pedido: el peso no cuadra (foto obligatoria) → el mercado devuelve $2 a la tarjeta ──
  await m.goto(B + `/mercado/${MO}/ayuda?de=compa`); const f = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f.getByText('¿Qué pasó?').first().waitFor();
  ok(await espera(m.getByText('Ayuda con el pedido').first()) && await espera(f.getByText(/Compararemos tus fotos con la foto de la balanza/)), 'ayuda con el pedido: se compara con la foto de la balanza');
  ok((await f.locator('[data-screen-label="Ayuda con la cita · qué pasó"]').getByRole('button').count()) === 7, '7 motivos del mercado');
  await clic(f.getByText('El peso no me cuadra')); ok(await espera(f.getByText(/obligatoria/)), 'peso: la foto es obligatoria');
  await (await vis(f.getByLabel('Qué pasó'))).fill('Pedí 3 lb de pierna y la foto dice 2.6, pero me cobraron 3.');
  await f.locator('input[type="file"]').first().setInputFiles(FOTO); await f.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await clic(f.getByRole('radio', { name: /Que me devuelvan/ }));
  await m.screenshot({ path: OUT + 's3-ayuda-merc-m.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click(); await m.getByText('PENDIENTE').first().waitFor();
  ok(AY(MO, "h.reason || '|' || h.wants || '|' || h.status") === 'peso|devolver|open', 'guardada: peso · devolver · abierta');
  await hm.goto(B + `/panel/${M}/hoy`); ok(await espera(hm.getByText('AYUDA QUE ESPERA TU RESPUESTA · 24 H')) && await espera(hm.getByText(new RegExp(`Pedido #${MO}`))), 'panel Hoy: la ayuda del pedido espera respuesta');
  const det = hm.locator('[data-screen-label="Panel v2 · detalle"]');
  await hm.goto(B + `/panel/${M}/hoy?det=merc:${MO}`); await det.getByText(/AYUDA CON EL PEDIDO · H-/).first().waitFor();
  ok(await espera(det.getByText('El peso no cuadra').first()), 'panel: el motivo del mercado con su nombre');
  await clic(det.getByText('Tiene razón', { exact: true })); const monto = await vis(det.getByPlaceholder(/^\d+\.\d\d$/)); if (monto) await monto.fill('2');
  await (await vis(det.locator('textarea'))).fill('Tienes razón: te devolvemos $2 de la diferencia del peso.');
  await hm.screenshot({ path: OUT + 's4-panel-ayuda-merc-d.png', fullPage: true });
  await clic(det.getByRole('button', { name: 'Enviar respuesta' }));
  ok(await esperaV(() => AY(MO, "h.status || '|' || h.decision || '|' || h.refunded_cents"), 'answered|ok|200') === 'answered|ok|200', 'el mercado acepta y devuelve $2 a la tarjeta');
  ok(sql(`select count(*) from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${MO}' and r.amount_cents = 200`) === '1', 'la devolución está en refunds');

  // ── 3. Apartado recogido → Ayuda con la compra → sin respuesta pasa a To'Latino; reseña de la tienda ──
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and kind = 'hold' and status in ('pending', 'change_proposed', 'confirmed')`);
  sql(`update item_variants v set stock_left = 3 from items i where i.id = v.item_id and i.business_id = '${T}' and i.name->>'es' = 'Blusa de encaje' and v.label = 'S'`);
  await m.goto(B + `/n/${T}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor();
  const card = m.locator('[data-screen-label="Ficha · tienda"] > div.grid > div').filter({ hasText: 'Blusa de encaje' }); await clic(card.getByRole('button', { name: 'Apartar' }));
  const hoja = m.locator('[data-screen-label="Tienda · artículo"]'); await hoja.waitFor(); await clic(hoja.getByRole('radio', { name: /^S( |$)/ })); await clic(hoja.getByRole('button', { name: 'Apartar', exact: true })); await hoja.waitFor({ state: 'detached' });
  await clic(m.getByRole('button', { name: 'Ver apartado' })); await m.waitForURL(/\/apartar$/); await clic(m.getByRole('button', { name: 'Continuar' }));
  const pg = m.locator('[data-screen-label="APP-NEG-TIENDA-APARTADO · móvil"]'); await pg.getByText('HORA EN QUE PASAS').waitFor();
  await pg.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) /, disabled: false }).first().click();
  await clic(pg.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /^\d{1,2}(:\d\d)? [AP]M$/ }).first());
  await clic(m.getByRole('button', { name: 'Continuar' })); await clic(m.getByRole('button', { name: 'Apartar', exact: true })); await m.waitForURL(/\/apartado\/A-\d+/); const AP = m.url().split('/apartado/')[1];
  await ht.goto(B + `/panel/${T}/hoy?det=apt:${AP}`); await clic(ht.getByRole('button', { name: 'Lo tengo · guárdalo' })); await ht.waitForTimeout(600);
  await ht.goto(B + `/panel/${T}/hoy?det=apt:${AP}`); await clic(ht.getByRole('button', { name: 'Lo recogió' })); await ht.getByText('Listo: recogido.').first().waitFor();
  await m.goto(B + `/apartado/${AP}`); await clic(m.getByRole('button', { name: 'Ayuda con la compra' })); await m.waitForURL(/\/ayuda(\?|$)/); await pasarHoja(m);
  const g = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await g.getByText('¿Qué pasó?').first().waitFor();
  ok((await g.locator('[data-screen-label="Ayuda con la cita · qué pasó"]').getByRole('button').count()) === 6, 'ayuda con la compra: 6 motivos de la tienda');
  await clic(g.getByText('Talla o artículo equivocado')); await (await vis(g.getByLabel('Qué pasó'))).fill('Aparté la S y en la bolsa venía una M; quiero cambiarla.');
  await clic(g.getByRole('radio', { name: /Cambiarlo/ }));
  await m.screenshot({ path: OUT + 's5-ayuda-tienda-m.png', fullPage: true }); await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click(); await m.getByText('PENDIENTE').first().waitFor();
  ok(AY(AP, "h.reason || '|' || h.wants") === 'talla|reponer', 'guardada: talla · cambiarlo');
  sql(`update help_requests set created_at = now() - interval '25 hours' where operation_id = (select id from operations where number = '${AP}')`);
  await m.goto(B + `/apartado/${AP}/ayuda?de=compa`); await m.waitForTimeout(500);
  ok(AY(AP, 'h.status') === 'escalated' && sql(`select count(*) from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id join operations o on o.id = h.operation_id where q.queue = 'sop' and o.number = '${AP}' and q.status = 'open'`) === '1', 'sin respuesta en 24 h: pasa a To’Latino (cola de ayuda)');
  await m.goto(B + `/n/${T}/resena?pedido=${AP}`); ok(await espera(m.getByText('TU APARTADO · DATO DEL APARTADO')) && await espera(m.getByText('¿LA TALLA O MEDIDA CORRECTA?')), 'reseña de la tienda: dato del apartado y preguntas');
  await clic(m.getByRole('button', { name: '4 ★', exact: true }));
  await clic(m.locator('div').filter({ hasText: /^¿EL PRECIO DE LA CAJA FUE EL PUBLICADO\?/ }).getByText('Sí', { exact: true }));
  await (await vis(m.getByLabel('Tu reseña'))).fill('Me guardaron la blusa y el precio fue el de la app; el cambio de talla tardó un poco.');
  await clic(m.getByRole('button', { name: /^Publicar/ })); await m.waitForURL((u) => !/\/resena\?/.test(u.toString())).catch(() => {});
  ok(await esperaV(() => sql(`select (answers->>'caja') || '|' || (facts->>'apartado') from reviews r join operations o on o.id = r.operation_id where o.number = '${AP}' and r.status = 'visible'`), `1|${AP}`) === `1|${AP}`, 'reseña de la tienda: precio de la caja = publicado · dato del apartado');
  await m.goto(B + `/n/${T}?tab=rev`); ok(await espera(m.getByText('LO QUE IMPORTA EN UNA TIENDA')), 'ficha: «Lo que importa en una tienda»');

  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK res4s');
})().catch((e) => { console.error(e); process.exit(1); });
