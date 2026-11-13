// 4q-2 · Envío de la tienda: ¿cómo lo recibes? (recoger / envío), dirección y tarjeta, se retiene al enviar, falta uno → se
// cobra lo que va (nunca más de lo retenido), seguimiento, en camino, entregado; no lo tiene / cancela / no lo envía a tiempo →
// se libera; mirar el panel con un envío por enviar NO lo cobra (repararPagos genérico).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', T = 'boutique-yaritza';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const MARISOL = "(select id from users where phone = '+15705550122')";
const VS = (it, t) => sql(`select v.stock_left from item_variants v join items i on i.id = v.item_id where i.business_id = '${T}' and i.name->>'es' = '${it}' and i.removed_at is null and v.label = '${t}' and v.removed_at is null`);
const O = (n, col) => sql(`select ${col} from operations o where o.number = '${n}'`);
const PAY = (n) => sql(`select p.status || '|' || p.held_cents || '|' || p.amount_cents || '|' || p.fee_cents from payments p join operations o on o.id = p.operation_id where o.number = '${n}' and p.kind = 'full'`);
const STOCK = { 'Blusa de encaje': { S: 3, M: 2, L: 4, XL: 1, '2X': 0 }, 'Vestido de fiesta': { S: 1, M: 2, L: 1, XL: 1, '2X': 0 } };
(async () => {
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and kind = 'hold' and status in ('pending', 'change_proposed', 'confirmed')`);
  for (const [it, m] of Object.entries(STOCK)) for (const [t, n] of Object.entries(m)) sql(`update item_variants v set stock_left = ${n} from items i where i.id = v.item_id and i.business_id = '${T}' and i.name->>'es' = '${it}' and v.label = '${t}'`);
  sql(`insert into delivery_settings (business_id) values ('${T}') on conflict (business_id) do nothing`); /* 9b-1 · la fila de la tienda (en una base nueva no la tenía) */ sql(`update delivery_settings set ship = true, pay_card = true, ship_fee_cents = 699, ship_free_over_cents = 10000, ship_days = '3-5' where business_id = '${T}'`);
  // 9b-1 · La tarjeta de Marisol (la guarda si no la tiene) en vez del id de una tarjeta de una base vieja.
  require('../lib/negocio-nuevo.cjs').tarjeta('5705550122');
  const PV = sql(`select price_cents from items where business_id = '${T}' and name->>'es' = 'Vestido de fiesta' and removed_at is null`), PB = sql(`select price_cents from items where business_id = '${T}' and name->>'es' = 'Blusa de encaje' and removed_at is null`);
  const b = await chromium.launch(); const err = [];
  const mc = await b.newContext({ ...devices['iPhone 13'] }), m = await mc.newPage(); await entrar(m, '5705550122');
  const h = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(h, '5705550299');
  for (const p of [m, h]) { p.on('pageerror', e => err.push(e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); }
  const tienda = async () => { await m.goto(B + `/n/${T}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor(); };
  const tomar = async (nm, talla) => {
    const card = m.locator('[data-screen-label="Ficha · tienda"] > div.grid > div').filter({ hasText: nm }); await clic(card.getByRole('button', { name: 'Apartar' }));
    const hoja = m.locator('[data-screen-label="Tienda · artículo"]'); await hoja.waitFor(); await clic(hoja.getByRole('radio', { name: new RegExp(`^${talla}( |$)`) }));
    await clic(hoja.getByRole('button', { name: 'Apartar', exact: true })); await hoja.waitFor({ state: 'detached' });
  };
  const pg = m.locator('[data-screen-label="APP-NEG-TIENDA-APARTADO · móvil"]');
  const pedirEnvio = async (cap) => {
    await clic(m.getByRole('button', { name: 'Ver apartado' })); await m.waitForURL(/\/apartar$/);
    await pg.getByText('¿CÓMO LO RECIBES?').waitFor(); await clic(pg.getByRole('radio', { name: /Envío a tu casa/ }));
    if (cap) await m.screenshot({ path: OUT + 'e1-como-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Continuar' })); await pg.getByText('A DÓNDE', { exact: true }).waitFor();
    if (cap) await m.screenshot({ path: OUT + 'e2-adonde-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Continuar' })); await m.getByText('BUENO SABER').first().waitFor();
    if (cap) await m.screenshot({ path: OUT + 'e3-revisa-m.png', fullPage: true });
    await clic(m.getByRole('button', { name: 'Apartar', exact: true })); await m.waitForURL(/\/apartado\/A-\d+/, { timeout: 8000 }).catch(async () => { throw new Error('no avanzó: ' + (await m.locator('[role=alert]').allInnerTexts()).join(' | ')); }); return m.url().split('/apartado/')[1];
  };
  const det = async (n) => { await h.goto(B + `/panel/${T}/hoy?det=apt:${n}`); await h.getByText(`#${n}`).first().waitFor(); };

  // ── 1. Pedir con envío: retener lo apartado + el envío ──
  await tienda(); await tomar('Blusa de encaje', 'M'); await tomar('Vestido de fiesta', 'S');
  const A1 = await pedirEnvio(true), sub = Number(PB) + Number(PV);
  ok(O(A1, "o.mode || '|' || o.pay_mode || '|' || o.delivery_cents || '|' || o.total_cents || '|' || o.pay_status") === `delivery|app|699|${sub + 699}|held`, `${A1}: envío, con tarjeta, $6.99 de envío, total ${sub + 699}, retenido`);
  ok(PAY(A1) === `held|${sub + 699}|${sub + 699}|${Math.round(sub * 0.06)}`, 'pago: se retiene el total; comisión 6 % solo de los artículos');
  ok(VS('Blusa de encaje', 'M') === '1' && VS('Vestido de fiesta', 'S') === '0', 'tallas reservadas');
  ok(await espera(m.getByText('PEDIDO ENVIADO')) && await espera(m.getByText(/se retuvieron \$[\d.]+ en tu tarjeta; se cobra al enviarlo/i)), 'cliente: pedido enviado · retenido, se cobra al enviarlo');
  await m.screenshot({ path: OUT + 'e4-enviado-m.png', fullPage: true });

  // ── 2. Falta uno → quitarlo → por enviar; mirar el panel NO cobra ──
  await det(A1); ok(await espera(h.getByText(/Retenido \$[\d.]+ · se cobra al enviarlo/)), 'panel: retenido, se cobra al enviarlo');
  await clic(h.getByRole('button', { name: 'Falta uno' })); await clic(h.getByText('Vestido de fiesta').last()); await h.getByText(/decide si sigue con lo demás/).first().waitFor();
  await m.goto(B + `/apartado/${A1}`); await clic(m.getByRole('button', { name: 'Quitarlo y seguir' })); await m.getByText('LO PREPARAN').first().waitFor();
  ok(O(A1, "o.status || '|' || o.total_cents") === `confirmed|${Number(PB) + 699}`, 'quitó el vestido: lo preparan, total = blusa + envío');
  await h.goto(B + `/panel/${T}/hoy`); await h.getByText(/^APARTADOS/).first().waitFor(); await h.waitForTimeout(500);
  ok(PAY(A1).startsWith('held|'), 'mirar el panel no cobra lo retenido (repararPagos genérico no toca apartados)');
  ok(await espera(h.getByText('POR ENVIAR')), 'panel Hoy: POR ENVIAR');

  // ── 3. Enviado con seguimiento → cobra lo que va; en camino; entregado ──
  await det(A1); await h.screenshot({ path: OUT + 'e5-panel-por-enviar-d.png', fullPage: true });
  const campo = h.getByPlaceholder('https://'); await (await vis(campo)).fill('http://malo'); await clic(h.getByRole('button', { name: 'Enviado', exact: true }));
  ok(await espera(h.getByText(/empieza con https/)), 'enlace sin https: no deja');
  ok(PAY(A1).startsWith('held|'), 'y no se cobró nada');
  await (await vis(campo)).fill('https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111'); await clic(h.getByRole('button', { name: 'Enviado', exact: true }));
  await h.getByText(/Listo: enviado y cobrado/).first().waitFor();
  const cobro = Number(PB) + 699;
  ok(PAY(A1) === `captured|${sub + 699}|${cobro}|${Math.round(Number(PB) * 0.06)}`, `enviado: se cobran ${cobro} (no los ${sub + 699} retenidos); comisión solo de la blusa`);
  ok(O(A1, "o.stage || '|' || (o.details->>'tracking')") === 'on_the_way|https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111', 'en camino con su seguimiento');
  ok(sql(`select count(*) from notifications where tpl = 'apt_enviado' and ref_id = '${A1}'`) === '1', 'aviso: va en camino');
  await m.goto(B + `/apartado/${A1}`); ok(await espera(m.getByText('VA EN CAMINO')) && await espera(m.getByRole('button', { name: 'Ver el seguimiento' })), 'cliente: va en camino · ver el seguimiento');
  ok(!(await vis(m.getByRole('button', { name: 'Cancelar' }))), 'ya enviado: no se puede cancelar');
  await m.screenshot({ path: OUT + 'e6-en-camino-m.png', fullPage: true });
  await det(A1); await clic(h.getByRole('button', { name: 'Entregado', exact: true })); await h.getByText('Listo: entregado.').first().waitFor();
  ok(O(A1, "o.status || '|' || o.stage") === 'done|delivered', 'entregado');
  await m.goto(B + `/apartado/${A1}`); ok(await espera(m.getByText('ENTREGADO')) && await espera(m.getByText(/Pagaste \$/)), 'cliente: entregado · pagaste');

  // ── 4. No lo tiene → se libera ──
  await tienda(); await tomar('Blusa de encaje', 'L'); const A2 = await pedirEnvio(false);
  await det(A2); await clic(h.getByRole('button', { name: 'No lo tengo' })); await h.getByText(/sabe que no lo tienes/).first().waitFor();
  ok(PAY(A2).startsWith('released|') && O(A2, 'o.status') === 'declined', 'no lo tiene: se libera lo retenido');
  // ── 5. El cliente cancela → se libera ──
  sql(`update item_variants v set stock_left = 4 from items i where i.id = v.item_id and i.business_id = '${T}' and i.name->>'es' = 'Blusa de encaje' and v.label = 'L'`);
  await tienda(); await tomar('Blusa de encaje', 'L'); const A3 = await pedirEnvio(false);
  await m.goto(B + `/apartado/${A3}`); await clic(m.getByRole('button', { name: 'Cancelar' })); await clic(m.getByRole('button', { name: 'Sí, cancelar' })); await m.getByText('CANCELADO').first().waitFor();
  ok(PAY(A3).startsWith('released|') && VS('Blusa de encaje', 'L') === '4', 'cancelado: se libera y la talla vuelve');
  // ── 6. Lo tiene pero no lo envía a tiempo → vence y se libera ──
  await tienda(); await tomar('Blusa de encaje', 'L'); const A4 = await pedirEnvio(false);
  await det(A4); await clic(h.getByRole('button', { name: 'Lo tengo · guárdalo' })); await h.getByText(/Listo:/).first().waitFor();
  ok(sql(`select count(*) from notifications where tpl = 'apt_prepara' and ref_id = '${A4}'`) === '1', 'aviso: lo tienen y lo envían en 3-5 días');
  sql(`update operations set ready_at = now() - interval '1 minute' where number = '${A4}'`);
  await m.goto(B + `/apartado/${A4}`); ok(await espera(m.getByText('No lo enviaron a tiempo')), 'cliente: no lo enviaron a tiempo');
  ok(O(A4, "o.status || '|' || o.status_detail") === 'expired|no_envio' && PAY(A4).startsWith('released|') && VS('Blusa de encaje', 'L') === '4', 'vence sin enviar: se libera y la talla vuelve');

  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(d, '5705550122');
  await d.goto(B + `/apartado/${A1}`); await d.getByText('ENTREGADO').first().waitFor(); await d.screenshot({ path: OUT + 'e7-entregado-d.png', fullPage: true });
  await b.close(); console.log('OK env4q');
})().catch((e) => { console.error(e); process.exit(1); });
