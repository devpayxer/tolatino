// 4p · Pedido del mercado de punta a punta: carrito → pedido (pickup, tarjeta) → se retiene estimado + 10 % de lo que va por peso →
// el mercado acepta → pesa con FOTO (un peso de más se rechaza) → «no hay» con sustituto → el cliente dice que no → mandar →
// «Está bien, cobrar» → se cobra lo real y se libera el resto (exacto) → listo → lo recogió. Otro: cancelar antes de aceptar y
// otro que vence a los 10 min (se libera todo). Nada se cobra de más.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', M = 'supermercado-la-cosecha', FOTO = ENT.rec('fotos') + '/portada.jpg';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const MAR = "(select id from users where phone = '+15705550122')";
const id = (n) => sql(`select id from items where business_id = '${M}' and name->>'es' = '${n}' and removed_at is null`);
const pedir = async (m, lines) => {
  await m.goto(B + `/n/${M}`); await m.evaluate(([b, l]) => localStorage.setItem('tl-mercado', JSON.stringify({ biz: b, lines: l })), [M, lines]);
  await m.goto(B + `/n/${M}/mercado`); await verV(m.getByText('1 · Tu pedido'));
  const h = m.locator('[role="radiogroup"][aria-label="Hora"] [role="radio"]:not([disabled])');
  if (!(await h.count())) await clic(m.getByRole('button', { name: 'Mañana', exact: true }));
  await clic(m.locator('[role="radiogroup"][aria-label="Hora"] [role="radio"]:not([disabled])').first());
  await clic(m.getByRole('button', { name: 'Enviar pedido' })); await m.waitForURL(/\/mercado\/M-\d+/); return m.url().match(/M-\d+/)[0];
};
(async () => {
  sql(`update operations set status = 'cancelled' where kind = 'market_order' and user_id = ${MAR} and status in ('pending', 'confirmed')`);
  sql(`update items set sold_out = false, stock_left = greatest(stock_left, stock_par), stock_day = null where business_id = '${M}'`); // 9b-3 · y con su cuenta llena (existenciaPropia)
  sql(`update retail_settings set slot_cap = 6, sub_default = 'call' where business_id = '${M}'`);
  // 9b-1 · La tarjeta de Marisol (la guarda si no la tiene) en vez del id de una tarjeta de una base vieja.
  require('../lib/negocio-nuevo.cjs').tarjeta('5705550122');
  const volverHorario = require('../lib/negocio-nuevo.cjs').abiertoTodoElDia(M); process.on('exit', volverHorario); // 9b-3 · de noche el mercado estaba cerrado
  const b = await chromium.launch(); const err = [];
  const mk = async (o, tel) => { const p = await (await b.newContext(o)).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); await entrar(p, tel); return p; };
  const m = await mk({ ...devices['iPhone 13'] }, '5705550122'), h = await mk({ viewport: { width: 1360, height: 900 } }, '5705550288');
  const L = [{ item: id('Pierna de cerdo'), q: 3, o: 1 }, { item: id('Bistec de res'), q: 2, o: null }, { item: id('Arroz 10 lb'), q: 1, o: null }, { item: id('Aguacate'), q: 2, o: 0 }];
  // ── Pedido ──
  await m.goto(B + `/n/${M}`); await m.evaluate(([b2, l]) => localStorage.setItem('tl-mercado', JSON.stringify({ biz: b2, lines: l })), [M, L]);
  await m.goto(B + `/n/${M}/mercado`); await verV(m.getByText('1 · Tu pedido'));
  ok(!!(await vis(m.getByText('Extra retenido por peso (10 %)'))) && !!(await vis(m.getByText('$36.57').first())), 'revisa: estimado $34.42 + 10 % de lo que va por peso ($2.15) → hoy se retienen $36.57' + ((await vis(m.getByText('$36.57').first())) ? '' : ' · la página dice: ' + (await m.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400)));
  await m.screenshot({ path: OUT + 's1-pedido-mercado-m.png', fullPage: true });
  const N1 = await pedir(m, L), O1 = sql(`select id from operations where number = '${N1}'`);
  ok(sql(`select status || '|' || held_cents || '|' || kind from payments where operation_id = ${O1}`) === 'held|3657|full', `${N1}: retenidos $36.57 en la tarjeta (no se cobra todavía)`);
  ok(sql(`select count(*) from notifications where tpl = 'biz_merc' and ref_id = '${N1}'`) === '1', 'aviso al mercado: pedido nuevo');
  await verV(m.getByText('PEDIDO ENVIADO')); ok(!!(await vis(m.getByText(/Se retuvieron \$36\.57/))), 'cliente: «Se retuvieron $36.57. Si no aceptan en 10 min, se libera.»');
  // ── Panel: aceptar, pesar con foto, no hay ──
  await h.goto(B + `/panel/${M}/hoy`); await verV(h.getByText(/PEDIDOS DEL MERCADO/));
  await clic(h.getByText(new RegExp(`^${N1} · pickup`)));
  const D = h.locator('aside[data-screen-label="Panel v2 · detalle"]');
  await clic(D.getByRole('button', { name: 'Aceptar' }));
  ok(await espera(() => sql(`select status || '|' || status_detail from operations where id = ${O1}`), 'confirmed|preparando') === 'confirmed|preparando', 'aceptado · preparando');
  const pesar = async (nombre, lb) => {
    const f = await vis(D.getByLabel(`PESO REAL · LB · ${nombre.toUpperCase()}`)); await f.fill(String(lb));
    const [fc] = await Promise.all([h.waitForEvent('filechooser'), clic(D.getByText(`Foto de ${nombre}`, { exact: true }))]); await fc.setFiles(FOTO);
    await h.waitForTimeout(1500); await clic(D.getByRole('button', { name: `Guardar peso de ${nombre}` }));
  };
  await pesar('Pierna de cerdo', 9.5); await verV(h.getByText(/el peso no puede pasar de 9 lb/)); ok(true, 'un peso de más (9.5 lb de 3 lb) se rechaza');
  await pesar('Pierna de cerdo', 2.82);
  ok(await espera(() => sql(`select weight_final || '|' || (weigh_photo_id is not null)::text || '|' || final_cents from operation_lines where operation_id = ${O1} and name->>'es' = 'Pierna de cerdo'`), '2.82|true|702') === '2.82|true|702', 'pierna: pesó 2.82 lb con foto → $7.02 (lo calcula la base)');
  await pesar('Bistec de res', 2.18);
  ok(await espera(() => sql(`select final_cents from operation_lines where operation_id = ${O1} and name->>'es' = 'Bistec de res'`), '1524') === '1524', 'bistec: 2.18 lb → $15.24');
  const LA = sql(`select id from operation_lines where operation_id = ${O1} and name->>'es' = 'Aguacate'`);
  await clic(D.getByRole('button', { name: 'No hay Aguacate' })); await clic(D.getByText('Habichuelas rojas', { exact: true }));
  ok(await espera(() => sql(`select status from change_proposals where operation_id = ${O1} and line_id = ${LA}`), 'open') === 'open', 'no hay aguacate → proponen habichuelas (10 min)');
  await clic(D.getByRole('button', { name: 'Mandar al cliente' })); await verV(h.getByText(/Espera la respuesta del cliente al cambio/)); ok(true, 'no se manda mientras el cliente no contesta el cambio');
  await h.screenshot({ path: OUT + 's2-pesar-d.png', fullPage: true });
  // ── Cliente: no quiere el cambio ──
  await m.goto(B + `/mercado/${N1}`); await verV(m.getByText(/ALGO NO HAY · SIN TU OK NO SE COBRA/));
  await clic(m.getByRole('button', { name: 'No, quítalo' }));
  ok(await espera(() => sql(`select status from change_proposals where operation_id = ${O1} and line_id = ${LA}`), 'declined') === 'declined', 'cliente: «No, quítalo» → no se cobra');
  // ── Mandar y aprobar ──
  await h.goto(B + `/panel/${M}/hoy?det=merc:${N1}`); await clic(D.getByRole('button', { name: 'Mandar al cliente' }));
  ok(await espera(() => sql(`select status_detail from operations where id = ${O1}`), 'pesado') === 'pesado', 'mandado al cliente · pesado');
  await m.goto(B + `/mercado/${N1}`); await verV(m.getByText('ASÍ LO PESARON'));
  ok(!!(await vis(m.getByText('Total real: $31.25'))) && !!(await vis(m.getByText('Pediste 3 lb · pesó 2.82 lb'))), 'cliente: total real $31.25 · «Pediste 3 lb · pesó 2.82 lb»');
  await clic(m.getByText('Foto de la balanza').first()); await m.screenshot({ path: OUT + 's3-asi-lo-pesaron-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Está bien, cobrar $31.25' }));
  ok(await espera(() => sql(`select status || '|' || amount_cents || '|' || held_cents || '|' || fee_cents from payments where operation_id = ${O1}`), 'captured|3125|3657|313') === 'captured|3125|3657|313', 'cobrado $31.25 de $36.57 retenidos · se liberan $5.32 · comisión 10 % de lo vendido');
  ok(sql(`select count(*) from notifications where tpl = 'merc_cobrado' and ref_id = '${N1}'`) === '1', 'aviso: «Se cobraron $31.25 · se liberan $5.32»');
  await h.goto(B + `/panel/${M}/hoy?det=merc:${N1}`); await clic(D.getByRole('button', { name: 'Está listo' }));
  await espera(() => sql(`select status_detail from operations where id = ${O1}`), 'listo');
  await clic(D.getByRole('button', { name: 'Lo recogió' }));
  ok(await espera(() => sql(`select status || '|' || (select count(*) from payments where operation_id = ${O1} and status = 'captured') from operations where id = ${O1}`), 'done|1') === 'done|1', 'lo recogió · terminado (no se cobra dos veces)');
  // ── Cancelar antes de aceptar; vencer a los 10 min ──
  const N2 = await pedir(m, [{ item: id('Arroz 10 lb'), q: 1, o: null }]), O2 = sql(`select id from operations where number = '${N2}'`);
  await clic(m.getByRole('button', { name: 'Cancelar pedido' }));
  ok(await espera(() => sql(`select o.status || '|' || p.status from operations o join payments p on p.operation_id = o.id where o.id = ${O2}`), 'cancelled|released') === 'cancelled|released', 'cancelado antes de aceptar → se libera todo');
  const N3 = await pedir(m, [{ item: id('Arroz 10 lb'), q: 1, o: null }]), O3 = sql(`select id from operations where number = '${N3}'`);
  sql(`update operations set respond_by = now() - interval '1 minute' where id = ${O3}`);
  await m.goto(B + `/mercado/${N3}`); await verV(m.getByText('SIN RESPUESTA'));
  ok(sql(`select o.status || '|' || p.status from operations o join payments p on p.operation_id = o.id where o.id = ${O3}`) === 'expired|released', 'sin respuesta en 10 min → vencido y liberado');
  ok(sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.kind = 'market_order' and p.status = 'captured' and p.amount_cents > p.held_cents`) === '0', 'ningún pedido del mercado cobró más de lo retenido');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK merc4p');
})().catch((e) => { console.error(e); process.exit(1); });
