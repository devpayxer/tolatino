// 4f-2 · Renta de herramienta: ficha Tienda, apartar (hoy $0, baja la unidad), panel «La recogió» (renta cobrada con
// comisión, depósito retenido), «Un día más», tarde (del depósito), daño con foto (aceptar / no estar de acuerdo → cola del
// Super Admin), tarjeta rechazada al recoger y cambio de tarjeta, vence a las 48 h, cancelar, renovar el depósito, Tu herramienta.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', D = 'hermanos-diaz-multiservicios';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, m) => { for (let i = 0; i < 40; i++) { if (f()) return ok(true, m); await new Promise((r) => setTimeout(r, 250)); } ok(false, m); };
const MARISOL = "(select id from users where phone = '+15705550122')";
// 9b-1 · Las dos tarjetas de Marisol (la buena y la que el banco rechaza): se guardan si no las tiene (una base nueva no las tenía).
{ const T = require('../lib/negocio-nuevo.cjs').tarjeta; T('5705550122', '0002', { predeterminada: false }); T('5705550122', '4242'); }
const PM_OK = sql(`select stripe_pm_id from payment_methods where user_id = ${MARISOL} and stripe_pm_id like 'pm_sim_visa_4242_%' order by created_at limit 1`), PM_NO = sql(`select stripe_pm_id from payment_methods where user_id = ${MARISOL} and stripe_pm_id like 'pm_sim_visa_0002_%' order by created_at desc limit 1`);
const R = (n, col) => sql(`select ${col} from rentals r join operations o on o.id = r.operation_id where o.number = '${n}'`);
const P = (n) => sql(`select string_agg(p.kind || ':' || p.status || ':' || p.amount_cents || ':' || p.fee_cents, ',' order by p.id) from payments p join operations o on o.id = p.operation_id where o.number = '${n}'`);
const STOCK = (nm) => sql(`select stock_left from items where business_id = '${D}' and module = 'renta' and name->>'es' = '${nm}'`);
const limpiar = () => {
  sql(`update rentals set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and status in ('held', 'out')`);
  sql(`update rentals set damage_status = 'waived' where user_id = ${MARISOL} and damage_status in ('asked', 'disputed')`);
  sql(`update queue_items set status = 'decided', decision = 'prueba' where queue = 'renta' and status = 'open'`);
  sql(`update items set stock_left = stock_par, sell = true where business_id = '${D}' and module = 'renta'`);
  sql(`update payment_methods set status = 'active', is_default = (stripe_pm_id = '${PM_OK}') where user_id = ${MARISOL} and stripe_pm_id in ('${PM_OK}', '${PM_NO}')`);
};
(async () => {
  limpiar();
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  const h = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(h, '5705550233');
  for (const p of [m, h]) { p.on('pageerror', e => err.push(e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); }
  const panelDet = async (n) => { await h.goto(B + `/panel/${D}/hoy?det=renta:${n}`); await h.getByText(`#${n}`).first().waitFor(); };
  const apartar = async (nm, dias) => {
    await m.goto(B + `/n/${D}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor();
    const card = m.locator('[data-screen-label="Ficha · tienda"] > div.grid > div').filter({ hasText: nm });
    await clic(card.getByRole('button', { name: 'Apartar' })); await m.waitForURL(/\/rentar\?a=/); await m.getByText('¿Cuántos días?').waitFor();
    if (dias) await clic(m.getByRole('button', { name: dias }));
  };
  const confirmarApartar = async () => { await clic(m.getByRole('button', { name: /^Apartar · \$/ })); await m.waitForURL(/\/renta\/T-\d+/); await m.getByText('APARTADA').first().waitFor(); return m.url().split('/renta/')[1]; };

  // ── 1. La Tienda en la ficha ──
  await m.goto(B + `/n/${D}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor();
  ok(!!(await vis(m.getByText('Culebra de drenaje 25 pies'))) && !!(await vis(m.getByText('$25/día'))) && !!(await vis(m.getByText('QUEDAN 2 PARA RENTAR'))), 'Tienda: herramienta, $25/día, quedan 2');
  ok((await m.getByText('RENTA', { exact: true }).count()) === 4, 'Tienda: 4 herramientas con la etiqueta RENTA');
  await m.screenshot({ path: OUT + 'r1-tienda-m.png', fullPage: true });
  const dk = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await dk.goto(B + `/n/${D}?tab=shop`); await dk.locator('[data-screen-label="Ficha · tienda"]').waitFor(); await dk.screenshot({ path: OUT + 'r1-tienda-d.png', fullPage: true });

  // ── 2. Apartar (2 días): hoy $0, baja la unidad ──
  await apartar('Culebra de drenaje 25 pies', '2 días');
  ok(!!(await vis(m.getByText('HOY NO SE COBRA NADA'))) && !!(await vis(m.getByText(/Al recogerla se cobran \$50 de renta y se retiene el depósito de \$50/))), 'formulario: hoy nada · $50 de renta al recoger · depósito $50');
  ok(!!(await vis(m.getByRole('button', { name: 'Apartar · $50 al recoger' }))), 'botón: Apartar · $50 al recoger');
  await m.screenshot({ path: OUT + 'r2-rentar-m.png', fullPage: true });
  const T1 = await confirmarApartar();
  ok(!!(await vis(m.getByText(/Te la guardan 48 horas. Hoy no se cobró nada/))), `${T1}: APARTADA · hoy no se cobró nada`);
  ok(R(T1, "r.status || '|' || r.rent_cents || '|' || r.deposit_cents || '|' || r.days || '|' || (r.due_on - r.pick_on) || '|' || (r.expires_at > now() + interval '20 hours')") === 'held|5000|5000|2|2|true', 'renta: apartada, $50, depósito $50, 2 días, se guarda 48 h');
  ok(STOCK('Culebra de drenaje 25 pies') === '1', 'bajó una unidad (quedan 1)');
  ok(!P(T1), 'sin cobros');
  ok(sql(`select count(*) from notifications where tpl in ('renta_apartada', 'biz_renta') and ref_id = '${T1}'`) === '2', 'avisos: al cliente y al negocio');
  await m.screenshot({ path: OUT + 'r3-apartada-m.png', fullPage: true });
  // Misma herramienta otra vez → no.
  await apartar('Culebra de drenaje 25 pies'); await clic(m.getByRole('button', { name: /^Apartar · \$/ })); await m.getByText('Ya tienes esta herramienta apartada o rentada.').waitFor(); ok(true, 'no deja apartar la misma dos veces');

  // ── 3. Panel: Hoy › Rentas y «La recogió» ──
  await h.goto(B + `/panel/${D}/hoy`); await h.getByText(/^RENTAS · /).first().waitFor(); ok(!!(await vis(h.getByText(new RegExp(`#${T1} · Recoge el`)))), 'panel Hoy: RENTAS con la apartada');
  await panelDet(T1); await h.screenshot({ path: OUT + 'r4-panel-apartada-d.png', fullPage: true });
  await clic(h.getByRole('button', { name: 'La recogió' })); await h.getByText(/la tiene. Renta cobrada/).first().waitFor();
  ok(R(T1, 'r.status') === 'out', 'la recogió → la tiene');
  ok(P(T1) === 'rental:captured:5000:300,security:held:5000:0', 'renta $50 cobrada con 6 % de comisión; depósito $50 retenido sin comisión');
  ok(sql(`select count(*) from notifications where tpl = 'renta_recogida' and ref_id = '${T1}'`) === '1', 'aviso: la tienes');
  await m.goto(B + `/renta/${T1}`); await m.getByText('LA TIENES').first().waitFor(); ok(!!(await vis(m.getByText(/Depósito de \$50 retenido en VISA ·· 4242/))), 'cliente: LA TIENES · depósito retenido en VISA ·· 4242');
  await m.screenshot({ path: OUT + 'r5-la-tienes-m.png', fullPage: true });

  // ── 4. Un día más ──
  const due0 = R(T1, 'r.due_on');
  await clic(m.getByRole('button', { name: 'Un día más · $25' })); await m.getByText(/Listo: la devuelves/).waitFor();
  ok(R(T1, `r.days || '|' || (r.due_on - '${due0}'::date) || '|' || r.rent_cents`) === '3|1|7500', 'un día más: 3 días, devolver +1, renta $75');
  ok(P(T1) === 'rental:captured:5000:300,security:held:5000:0,rental:captured:2500:150', 'se cobró el día ($25 con comisión)');

  // ── 5. Tarde: 1 día → $25 del depósito, se libera el resto ──
  sql(`update rentals set due_on = (now() at time zone 'America/New_York')::date - 1 where operation_id = (select id from operations where number = '${T1}')`);
  await m.goto(B + `/renta/${T1}`); await m.getByText('SE PASÓ EL DÍA').first().waitFor(); ok(true, 'cliente: SE PASÓ EL DÍA');
  ok(sql(`select count(*) from notifications where tpl = 'renta_tarde' and ref_id = '${T1}'`) === '1', 'aviso de tarde, una sola vez');
  await m.goto(B + `/renta/${T1}`); ok(sql(`select count(*) from notifications where tpl = 'renta_tarde' and ref_id = '${T1}'`) === '1', 'abrir otra vez no repite el aviso');
  await panelDet(T1); ok(!!(await vis(h.getByText(/Llegó 1 día tarde: al tocar «La devolvió» se descuentan \$25 del depósito y se libera el resto \(\$25\)/))), 'panel: 1 día tarde → $25 del depósito, $25 se libera');
  await h.screenshot({ path: OUT + 'r6-panel-tarde-d.png', fullPage: true });
  await clic(h.getByRole('button', { name: 'La devolvió', exact: true })); await h.getByText('Listo: devuelta.').first().waitFor();
  ok(R(T1, "r.status || '|' || r.late_days || '|' || r.late_cents") === 'back|1|2500', 'devuelta: 1 día tarde, $25');
  ok(P(T1) === 'rental:captured:5000:300,security:captured:2500:150,rental:captured:2500:150', 'del depósito se capturaron $25 (con la comisión de renta) y el resto se liberó');
  ok(sql(`select captured_cents || '|' || status from sim_intents where id = (select stripe_payment_intent from payments p join operations o on o.id = p.operation_id where o.number = '${T1}' and p.kind = 'security')`) === '2500|succeeded', 'simulador: captura parcial de $25 sobre $50');
  ok(STOCK('Culebra de drenaje 25 pies') === '2', 'la unidad volvió (quedan 2)');
  await m.goto(B + `/renta/${T1}`); await m.getByText('DEVUELTA').first().waitFor(); ok(!!(await vis(m.getByText(/Se liberó \$25 a VISA ·· 4242. Llegó 1 día tarde/))), 'cliente: se liberó $25 · 1 día tarde');
  await m.screenshot({ path: OUT + 'r7-devuelta-m.png', fullPage: true });

  // ── 6. Daño con foto: no está de acuerdo → cola del Super Admin → descontar ──
  await apartar('Escalera de extensión 24 pies'); const T2 = await confirmarApartar();
  ok(STOCK('Escalera de extensión 24 pies') === '0', 'escalera: quedan 0');
  await m.goto(B + `/n/${D}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor(); ok(!!(await vis(m.getByText('RENTADAS HOY'))), 'Tienda: RENTADAS HOY (sin unidades)');
  await panelDet(T2); await clic(h.getByRole('button', { name: 'La recogió' })); await h.getByText(/la tiene. Renta cobrada/).first().waitFor();
  await panelDet(T2); await clic(h.getByRole('button', { name: 'La devolvió con un daño' }));
  await h.getByText('Cuánto descontar').waitFor();
  ok(await h.getByRole('button', { name: 'Mandar el daño' }).isDisabled(), 'sin foto no se manda');
  const [fc] = await Promise.all([h.waitForEvent('filechooser'), clic(h.getByText('Tomar o subir foto'))]); await fc.setFiles(ENT.rec('fotos') + '/portada.jpg');
  await h.getByLabel('QUÉ SE DAÑÓ').fill('Un peldaño llegó doblado');
  for (let i = 0; i < 60 && await h.getByRole('button', { name: 'Mandar el daño' }).isDisabled(); i++) await h.waitForTimeout(250);
  await h.screenshot({ path: OUT + 'r8-panel-dano-d.png', fullPage: true });
  await clic(h.getByRole('button', { name: 'Mandar el daño' })); await h.getByText(/ya ve el daño/).first().waitFor();
  ok(R(T2, "r.status || '|' || r.damage_status || '|' || r.damage_cents || '|' || (r.damage_photo is not null)") === 'back|asked|2500|true', 'daño: $25 con foto, espera al cliente');
  ok(P(T2).includes('security:held:8000'), 'el depósito sigue retenido');
  await m.goto(B + `/renta/${T2}`); await m.getByText('TE ENSEÑAN UN DAÑO').first().waitFor(); ok(!!(await vis(m.getByText('«Un peldaño llegó doblado»'))), 'cliente: ve la foto, el monto y la nota');
  await m.screenshot({ path: OUT + 'r9-dano-cliente-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'No estoy de acuerdo' })); await m.getByText('EN REVISIÓN').first().waitFor();
  ok(sql(`select count(*) from queue_items q join rentals r on r.id::text = q.subject_id join operations o on o.id = r.operation_id where q.queue = 'renta' and q.status = 'open' and o.number = '${T2}'`) === '1', 'entra a la cola «Daños de rentas»');
  const a = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); a.on('pageerror', e => err.push(e.message));
  await entrar(a, '5705550199');
  const qid = sql(`select q.id from queue_items q join rentals r on r.id::text = q.subject_id join operations o on o.id = r.operation_id where q.queue = 'renta' and q.status = 'open' and o.number = '${T2}'`);
  await a.goto(B + `/admin/colas?cola=renta&caso=${qid}`); await a.getByText('FOTO DEL DAÑO (LA MANDÓ EL NEGOCIO)').waitFor();
  await a.screenshot({ path: OUT + 'r10-admin-dano-d.png', fullPage: true });
  await clic(a.getByRole('button', { name: 'Descontar $25' })); await clic(a.getByText('La foto muestra el daño y coincide con la herramienta.'));
  await clic(a.getByRole('button', { name: 'Descontar', exact: true })); await a.getByText(/Descontado del depósito/).first().waitFor();
  ok(R(T2, 'r.damage_status') === 'charged' && P(T2).includes('security:captured:2500'), 'Super Admin descontó $25 del depósito de $80; el resto se liberó');
  ok(sql(`select count(*) from audit_entries where action = 'renta.dano_descontar' and target_id = '${T2}'`) === '1', 'auditoría con motivo');

  // ── 7. Daño aceptado ──
  await apartar('Escalera de extensión 24 pies'); const T3 = await confirmarApartar();
  await panelDet(T3); await clic(h.getByRole('button', { name: 'La recogió' })); await h.getByText(/la tiene. Renta cobrada/).first().waitFor();
  await panelDet(T3); await clic(h.getByRole('button', { name: 'La devolvió con un daño' }));
  const [fc2] = await Promise.all([h.waitForEvent('filechooser'), clic(h.getByText('Tomar o subir foto'))]); await fc2.setFiles(ENT.rec('fotos') + '/portada.jpg');
  await h.getByLabel('QUÉ SE DAÑÓ').fill('La cuerda llegó rota');
  for (let i = 0; i < 60 && await h.getByRole('button', { name: 'Mandar el daño' }).isDisabled(); i++) await h.waitForTimeout(250);
  await clic(h.getByRole('button', { name: 'Mandar el daño' })); await h.getByText(/ya ve el daño/).first().waitFor();
  await m.goto(B + `/renta/${T3}`); await clic(m.getByRole('button', { name: 'Está bien' })); await m.getByText(/se descontó del depósito/).waitFor();
  ok(R(T3, 'r.damage_status') === 'charged' && P(T3).includes('security:captured:2500'), 'aceptó: $25 del depósito, el resto liberado');

  // ── 8. La tarjeta no pasa al recoger → cambia la tarjeta → pasa ──
  sql(`update payment_methods set is_default = (stripe_pm_id = '${PM_NO}') where user_id = ${MARISOL} and stripe_pm_id in ('${PM_OK}', '${PM_NO}')`);
  await apartar('Lavadora a presión'); const T4 = await confirmarApartar();
  ok(R(T4, 'r.payment_method') === PM_NO, 'apartada con la tarjeta que el banco rechaza');
  await panelDet(T4); await clic(h.getByRole('button', { name: 'La recogió' })); await h.getByText(/no pasó: no se cobró nada/).first().waitFor();
  ok(R(T4, "r.status || '|' || r.card_failed") === 'held|true' && !P(T4), 'no pasó: sigue apartada, nada cobrado ni retenido');
  ok(sql(`select count(*) from notifications where tpl = 'renta_tarjeta' and ref_id = '${T4}'`) === '1', 'aviso al cliente: cambia la tarjeta');
  await m.goto(B + `/renta/${T4}`); await clic(m.getByRole('button', { name: 'Cambiar la tarjeta' }));
  await clic(m.getByText(/4242/).first()); const usar = await vis(m.getByRole('button', { name: /^Usar/ })); if (usar) await usar.click();
  await m.getByText(/Listo: se cobra con/).waitFor();
  ok(/^pm_sim_visa_4242_\w+\|false$/.test(R(T4, "r.payment_method || '|' || r.card_failed")), 'tarjeta cambiada (a una 4242)');
  ok(sql(`select count(*) from notifications where tpl = 'biz_renta' and ref_id = '${T4}' and body like '%cambió la tarjeta%'`) === '1', 'aviso al negocio: ya puede entregarla');
  await panelDet(T4); await clic(h.getByRole('button', { name: 'La recogió' })); await h.getByText(/la tiene. Renta cobrada/).first().waitFor();
  ok(P(T4) === 'rental:captured:5500:330,security:held:10000:0', 'con la tarjeta nueva: renta $55 cobrada, depósito $100 retenido');
  // Renovar el depósito de más de 6 días y 20 horas.
  sql(`update payments set held_at = now() - interval '165 hours' where kind = 'security' and status = 'held' and operation_id = (select id from operations where number = '${T4}')`);
  await m.goto(B + `/renta/${T4}`); await m.getByText('LA TIENES').first().waitFor();
  ok(P(T4) === 'rental:captured:5500:330,security:released:10000:0,security:held:10000:0', 'depósito renovado: el viejo se soltó y hay uno nuevo retenido');
  ok(sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${T4}' and p.renewed_from is not null`) === '1', 'renewed_from apunta al anterior');
  await panelDet(T4); await clic(h.getByRole('button', { name: 'La devolvió', exact: true })); await h.getByText('Listo: devuelta.').first().waitFor();
  ok(P(T4).endsWith('security:released:10000:0'), 'devuelta a tiempo: depósito liberado completo');

  // ── 9. Vence a las 48 h y ya no la necesito ──
  sql(`update payment_methods set is_default = (stripe_pm_id = '${PM_OK}') where user_id = ${MARISOL} and stripe_pm_id in ('${PM_OK}', '${PM_NO}')`);
  await apartar('Máquina de lavar alfombras'); const T5 = await confirmarApartar(); ok(STOCK('Máquina de lavar alfombras') === '1', 'alfombras: quedan 1');
  sql(`update rentals set expires_at = now() - interval '1 minute' where operation_id = (select id from operations where number = '${T5}')`);
  await m.goto(B + `/renta/${T5}`); await m.getByText('VENCIDA').first().waitFor();
  ok(R(T5, 'r.status') === 'expired' && STOCK('Máquina de lavar alfombras') === '2', 'vencida: volvió la unidad');
  ok(sql(`select count(*) from notifications where tpl = 'renta_vence' and ref_id = '${T5}'`) === '1', 'aviso: tu apartado venció');
  await apartar('Máquina de lavar alfombras'); const T6 = await confirmarApartar();
  await clic(m.getByRole('button', { name: 'Ya no la necesito' })); await clic(m.getByRole('button', { name: 'Sí, ya no la necesito' })); await m.getByText('CANCELADA').first().waitFor();
  ok(R(T6, "r.status || '|' || r.cancelled_by") === 'cancelled|user' && STOCK('Máquina de lavar alfombras') === '2' && !P(T6), 'ya no la necesito: cancelada, volvió la unidad, nada cobrado');

  // ── 10. Tu herramienta: apagar un artículo ──
  await h.goto(B + `/panel/${D}/vendes/herramienta`); await h.getByText('RENTA DE HERRAMIENTA · APARTADA 48 H').waitFor();
  await h.screenshot({ path: OUT + 'r11-herramienta-d.png', fullPage: true });
  ok(!!(await vis(h.getByText('PLANES · COBRO CADA MES'))), 'Tu herramienta: también los planes con su interruptor');
  const fila = h.locator('div').filter({ hasText: /^Lavadora a presión/ }).last();
  await clic(h.getByRole('switch', { name: /Lavadora a presión/ }));
  await espera(() => sql(`select sell from items where business_id = '${D}' and module = 'renta' and name->>'es' = 'Lavadora a presión'`) === 'f', 'apagada en Tu herramienta');
  await m.goto(B + `/n/${D}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor(); ok(!(await vis(m.getByText('Lavadora a presión'))), 'no sale en la Tienda');
  sql(`update items set sell = true where business_id = '${D}' and module = 'renta'`);
  void fila;
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK renta4f');
})().catch((e) => { console.error(e); process.exit(1); });
