// 4f-2 · Renta de herramienta: ficha Tienda, apartar (hoy $0, baja la unidad), panel «La recogió» (renta cobrada con
// comisión, depósito retenido), «Un día más», tarde (del depósito), daño con foto (aceptar / no estar de acuerdo → cola del
// Super Admin), tarjeta rechazada al recoger y cambio de tarjeta, vence a las 48 h, cancelar, renovar el depósito, Tu herramienta.
// 27 nov (LAUNCH 9q) · 3-D Secure al recoger (8b): el aviso con el enlace a la hoja, confirmar → la renta sigue; vence → cambia la tarjeta; el webhook.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = ENT.B, D = 'hermanos-diaz-multiservicios';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, m) => { for (let i = 0; i < 40; i++) { if (f()) return ok(true, m); await new Promise((r) => setTimeout(r, 250)); } ok(false, m); };
const MARISOL = "(select id from users where phone = '+15705550122')";
// 9b-1 · Las dos tarjetas de Marisol (la buena y la que el banco rechaza): se guardan si no las tiene (una base nueva no las tenía).
// 9b-1 · Las de ESTA prueba (ids fijos del ayudante) y la predeterminada es UNA sola entre todas las de Marisol: antes «la primera 4242» era la
// que otra prueba guardó y el cambio de predeterminada solo tocaba estas dos, así que la del ayudante seguía predeterminada (apartaba con ella).
const { tarjeta } = require('../lib/negocio-nuevo.cjs'); const PM_NO = tarjeta('5705550122', '0002', { predeterminada: false }), PM_OK = tarjeta('5705550122', '4242');
// 27 nov (LAUNCH 9q) · La de ···· 3184: el banco del simulador siempre pide 3-D Secure (como la tarjeta de prueba de Stripe).
const PM_3DS = tarjeta('5705550122', '3184', { predeterminada: false });
const R = (n, col) => sql(`select ${col} from rentals r join operations o on o.id = r.operation_id where o.number = '${n}'`);
const P = (n) => sql(`select string_agg(p.kind || ':' || p.status || ':' || p.amount_cents || ':' || p.fee_cents, ',' order by p.id) from payments p join operations o on o.id = p.operation_id where o.number = '${n}'`);
const STOCK = (nm) => sql(`select stock_left from items where business_id = '${D}' and module = 'renta' and name->>'es' = '${nm}'`);
const limpiar = () => {
  sql(`update rentals set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and status in ('held', 'out')`);
  sql(`update rentals set damage_status = 'waived' where user_id = ${MARISOL} and damage_status in ('asked', 'disputed')`);
  sql(`update queue_items set status = 'decided', decision = 'prueba' where queue = 'renta' and status = 'open'`);
  sql(`update items set stock_left = stock_par, sell = true where business_id = '${D}' and module = 'renta'`);
  sql(`update payment_methods set status = 'active' where user_id = ${MARISOL} and stripe_pm_id in ('${PM_OK}', '${PM_NO}')`); sql(`update payment_methods set is_default = (stripe_pm_id = '${PM_OK}') where user_id = ${MARISOL}`);
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
  sql(`update payment_methods set is_default = (stripe_pm_id = '${PM_NO}') where user_id = ${MARISOL}`);
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

  // ── 8b. 27 nov (LAUNCH 9q) · 3-D Secure al recoger: el banco pide verificar el depósito (···· 3184) → aviso con el enlace → la hoja → depósito retenido
  //        (ESE intento) y la renta sigue; no lo confirma a tiempo → vence y falloRecoger; el banco lo confirma fuera de la hoja → el webhook la sigue.
  //        Otra pestaña, el barrido y el webhook repetido no retienen dos veces ni repiten el aviso. ──
  sql(`update payment_methods set is_default = (stripe_pm_id = '${PM_3DS}') where user_id = ${MARISOL}`);
  const VA = (n) => sql(`select string_agg(pa.kind || ':' || pa.status || ':' || pa.amount_cents, ',' order by pa.created_at) from payment_actions pa join operations o on o.id = pa.operation_id where o.number = '${n}'`);
  const PIV = (n) => sql(`select pa.pi from payment_actions pa join operations o on o.id = pa.operation_id where o.number = '${n}' order by pa.created_at desc limit 1`);
  const RID = (n) => sql(`select r.id from rentals r join operations o on o.id = r.operation_id where o.number = '${n}'`);
  const AV = (n, tpl, txt) => sql(`select count(*) from notifications where tpl = '${tpl}' and ref_id = '${n}'${txt ? ` and body like '%${txt}%'` : ''}`);
  const recogioEspera = async (n) => { await panelDet(n); await clic(h.getByRole('button', { name: 'La recogió' })); await h.getByText(/pide que confirme el depósito de \$100/).first().waitFor(); };
  await apartar('Lavadora a presión'); const T7 = await confirmarApartar();
  ok(R(T7, 'r.payment_method') === PM_3DS, 'apartada con la tarjeta cuyo banco pide verificar (···· 3184)');
  // La otra pestaña del panel, abierta antes del toque (todavía ve «La recogió» encendido).
  const h2 = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); h2.on('pageerror', e => err.push(e.message)); await entrar(h2, '5705550233');
  await h2.goto(B + `/panel/${D}/hoy?det=renta:${T7}`); await h2.getByText(`#${T7}`).first().waitFor();
  await recogioEspera(T7);
  const PI7 = PIV(T7);
  ok(R(T7, "r.status || '|' || r.card_failed") === 'held|false' && !P(T7), 'sigue apartada, sin pedir otra tarjeta y sin nada en el libro');
  ok(VA(T7) === 'renta:pendiente:10000' && sql(`select status from sim_intents where id = '${PI7}'`) === 'requires_action', 'la verificación del depósito ($100) queda a nombre del cliente, con su renta; el intento espera (requires_action)');
  ok(AV(T7, 'renta_verify') === '1' && sql(`select count(*) from notifications where tpl = 'renta_verify' and ref_id = '${T7}' and href = '/pago/verificar?pi=${encodeURIComponent(PI7)}'`) === '1', 'aviso al cliente con el enlace a la hoja');
  ok(sql(`select count(*) from offsession_charges where kind = 'renta' and ref_id = '${RID(T7)}' and status = 'pending' and sent_at is null`) === '1', 'la intención sigue en camino sin mandarse (la renta no salió a Stripe)');
  await clic(h2.getByRole('button', { name: 'La recogió' })); await h2.getByText(/pide que confirme el depósito/).first().waitFor();
  await h2.getByText(/le quedan \d+ min/).first().waitFor(); ok(await h2.getByRole('button', { name: 'La recogió' }).isDisabled(), 'la otra pestaña, después de su toque, también espera (botón apagado)');
  ok(VA(T7) === 'renta:pendiente:10000' && sql(`select count(*) from sim_intents where id like 'pi_sim_renta-${RID(T7)}-%'`) === '1', 'otra pestaña: una sola retención y una sola verificación');
  ok(AV(T7, 'renta_verify') === '1' && sql(`select count(*) from operation_events e join operations o on o.id = e.operation_id where o.number = '${T7}' and e.kind = 'verify_requested'`) === '1', 'un solo aviso y un solo evento en la línea de tiempo');
  await panelDet(T7);
  ok(!!(await vis(h.getByText(/pide que confirme el depósito de \$100. Le mandamos el aviso con el enlace; le quedan \d+ min/))) && await h.getByRole('button', { name: 'La recogió' }).isDisabled(), 'panel: espera su banco (con lo que le queda) y «La recogió» apagado');
  await h.screenshot({ path: OUT + 'r13-panel-espera-banco-d.png', fullPage: true });
  await h.goto(B + `/panel/${D}/hoy`); await h.getByText(/^RENTAS · /).first().waitFor(); ok(!!(await vis(h.getByText('ESPERA SU BANCO'))), 'panel Hoy: ESPERA SU BANCO');
  // El cliente: su renta → «Confirmar con mi banco» → la hoja (se abre sola) → confirma.
  await m.goto(B + `/renta/${T7}`); await m.getByText('CONFIRMA CON TU BANCO').first().waitFor();
  ok(!!(await vis(m.getByText(/retiene un depósito de \$100. Confírmalo con tu banco en los próximos \d+ min/))), 'cliente: CONFIRMA CON TU BANCO con el depósito y el plazo');
  await m.screenshot({ path: OUT + 'r14-renta-confirma-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Confirmar con mi banco' })); await m.waitForURL(/\/pago\/verificar\?pi=/);
  ok(m.url().endsWith(`/pago/verificar?pi=${encodeURIComponent(PI7)}`), 'lleva a la hoja del enlace del aviso');
  const hoja = m.locator('[data-pantalla="PAGO-3DS"]');
  await m.getByText(/Para retener el depósito de \$100 de tu renta/).first().waitFor();
  await m.screenshot({ path: OUT + 'r15-hoja-3ds-m.png' });
  await clic(hoja.getByRole('button', { name: 'Confirmar con mi banco' })); await m.getByText('Listo: tu banco lo confirmó').first().waitFor();
  await m.screenshot({ path: OUT + 'r16-verificada-m.png', fullPage: true });
  await espera(() => R(T7, 'r.status') === 'out', 'al confirmar, la renta sigue sola: la tiene');
  ok(P(T7) === 'rental:captured:5500:330,security:held:10000:0', 'renta $55 cobrada y depósito $100 retenido');
  ok(sql(`select stripe_payment_intent from payments p join operations o on o.id = p.operation_id where o.number = '${T7}' and p.kind = 'security'`) === PI7, 'el depósito es ESE intento verificado (nunca otro)');
  ok(VA(T7) === 'renta:verificada:10000', 'verificación: verificada');
  ok(AV(T7, 'biz_renta', 'confirmó el depósito con su banco') === '1' && AV(T7, 'renta_recogida') === '1', 'avisos: al negocio «ya puedes entregarla» y al cliente «la tienes»');
  // El webhook del mismo intento, repetido (el mismo evento y otro): no retiene ni cobra otra vez ni repite avisos.
  const SEC = ENT.sec('STRIPE_WEBHOOK_SECRET'), RUN = require('crypto').randomBytes(4).toString('hex');
  const webhook = async (ev) => { const cuerpo = JSON.stringify(ev), t = Math.floor(Date.now() / 1000);
    const r = await fetch(B + '/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${require('crypto').createHmac('sha256', SEC).update(`${t}.${cuerpo}`).digest('hex')}` }, body: cuerpo }); return r.status; };
  const capturable = (id, pi) => ({ id, type: 'payment_intent.amount_capturable_updated', data: { object: { id: pi } } });
  ok([await webhook(capturable(`evt_r9q_${RUN}_a`, PI7)), await webhook(capturable(`evt_r9q_${RUN}_a`, PI7)), await webhook(capturable(`evt_r9q_${RUN}_b`, PI7))].every((s) => s === 200), 'webhook firmado: 200 (y el repetido, 200)');
  ok(P(T7) === 'rental:captured:5500:330,security:held:10000:0' && AV(T7, 'biz_renta', 'confirmó el depósito con su banco') === '1' && AV(T7, 'renta_recogida') === '1', 'el webhook repetido no retiene, no cobra ni avisa otra vez');
  await panelDet(T7); await h.screenshot({ path: OUT + 'r17-panel-tras-banco-d.png', fullPage: true });
  await clic(h.getByRole('button', { name: 'La devolvió', exact: true })); await h.getByText('Listo: devuelta.').first().waitFor();
  ok(P(T7).endsWith('security:released:10000:0'), 'devuelta: el depósito verificado se libera');

  // No lo confirma a tiempo (verificacion_min): vence en el barrido → se suelta y lo de siempre (cambia la tarjeta), una vez.
  const barrido = async () => { for (let i = 0; i < 60; i++) { const r = await (await fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': ENT.TOK } })).json(); if (r.corrio) return r; await new Promise((z) => setTimeout(z, 1000)); } throw new Error('el barrido no corrió'); };
  await apartar('Lavadora a presión'); const T8 = await confirmarApartar();
  await recogioEspera(T8); const PI8 = PIV(T8);
  ok(VA(T8) === 'renta:pendiente:10000' && AV(T8, 'renta_verify') === '1', 'otra renta: espera la verificación con su aviso');
  sql(`update payment_actions set expires_at = now() - interval '1 minute' where pi = '${PI8}'`);
  await barrido();
  ok(VA(T8) === 'renta:vencida:10000' && sql(`select status from sim_intents where id = '${PI8}'`) === 'canceled', 'vence: la verificación vencida y el intento soltado en Stripe');
  ok(R(T8, "r.status || '|' || r.card_failed") === 'held|true' && !P(T8), 'falloRecoger: sigue apartada, tarjeta no pasó, nada cobrado ni retenido');
  ok(sql(`select status || '|' || last_error from offsession_charges where kind = 'renta' and ref_id = '${RID(T8)}' order by id desc limit 1`) === 'failed|deposito_sin_verificar', 'la intención (nunca mandada) queda rechazada');
  ok(AV(T8, 'renta_tarjeta') === '1' && AV(T8, 'biz_renta', 'no confirmó el depósito con su banco') === '1', 'avisos: al cliente «cambia la tarjeta» y al negocio «no lo confirmó»');
  await barrido();
  ok(AV(T8, 'renta_tarjeta') === '1' && AV(T8, 'biz_renta', 'no confirmó el depósito con su banco') === '1' && VA(T8) === 'renta:vencida:10000', 'otro barrido no repite nada');
  await panelDet(T8); ok(!!(await vis(h.getByText(/no pasó al recoger/))), 'panel: la tarjeta no pasó');
  await m.goto(B + `/pago/verificar?pi=${encodeURIComponent(PI8)}`); await m.getByText('Esta confirmación ya no sirve').first().waitFor();
  ok(!!(await vis(m.getByRole('button', { name: 'Ir a mi renta' }))), 'la hoja vencida lo dice y lleva a la renta');
  await m.screenshot({ path: OUT + 'r18-verificar-vencida-m.png', fullPage: true });
  await panelDet(T8); await clic(h.getByRole('button', { name: 'Cancelar el apartado' })); await h.getByText(/Apartado cancelado/).first().waitFor();

  // El banco lo confirma fuera de la hoja (la persona cerró la app): el webhook la sigue, una vez.
  await apartar('Lavadora a presión'); const T9 = await confirmarApartar();
  await recogioEspera(T9); const PI9 = PIV(T9);
  sql(`update sim_intents set status = 'requires_capture' where id = '${PI9}' and status = 'requires_action'`);
  ok([await webhook(capturable(`evt_r9q_${RUN}_c`, PI9)), await webhook(capturable(`evt_r9q_${RUN}_c`, PI9)), await webhook(capturable(`evt_r9q_${RUN}_d`, PI9))].every((s) => s === 200), 'webhook de la verificación (y repetido): 200');
  ok(R(T9, 'r.status') === 'out' && P(T9) === 'rental:captured:5500:330,security:held:10000:0' && VA(T9) === 'renta:verificada:10000', 'el webhook sigue la renta: cobrada y depósito retenido, una vez');
  ok(AV(T9, 'biz_renta', 'confirmó el depósito con su banco') === '1' && AV(T9, 'renta_recogida') === '1', 'un aviso a cada uno');
  await panelDet(T9); await clic(h.getByRole('button', { name: 'La devolvió', exact: true })); await h.getByText('Listo: devuelta.').first().waitFor();
  // La semilla como estaba: la tarjeta 3184 de Marisol fuera (la pone tarjeta() cada vez), la de siempre predeterminada.
  sql(`update payment_methods set status = 'removed', is_default = false where user_id = ${MARISOL} and stripe_pm_id = '${PM_3DS}'`);
  sql(`update payment_methods set is_default = (stripe_pm_id = '${PM_OK}') where user_id = ${MARISOL}`);

  // ── 9. Vence a las 48 h y ya no la necesito ──
  sql(`update payment_methods set is_default = (stripe_pm_id = '${PM_OK}') where user_id = ${MARISOL}`);
  await apartar('Máquina de lavar alfombras'); const T5 = await confirmarApartar(); ok(STOCK('Máquina de lavar alfombras') === '1', 'alfombras: quedan 1');
  sql(`update rentals set expires_at = now() - interval '1 minute' where operation_id = (select id from operations where number = '${T5}')`);
  await m.goto(B + `/renta/${T5}`); await m.getByText('VENCIDA').first().waitFor();
  ok(R(T5, 'r.status') === 'expired' && STOCK('Máquina de lavar alfombras') === '2', 'vencida: volvió la unidad');
  ok(sql(`select count(*) from notifications where tpl = 'renta_vence' and ref_id = '${T5}'`) === '1', 'aviso: tu apartado venció');
  await apartar('Máquina de lavar alfombras'); const T6 = await confirmarApartar();
  await clic(m.getByRole('button', { name: 'Ya no la necesito' })); await clic(m.getByRole('button', { name: 'Sí, ya no la necesito' })); await m.getByText('CANCELADA').first().waitFor();
  ok(R(T6, "r.status || '|' || r.cancelled_by") === 'cancelled|user' && STOCK('Máquina de lavar alfombras') === '2' && !P(T6), 'ya no la necesito: cancelada, volvió la unidad, nada cobrado');

  // ── 10. Tu herramienta: cada artículo abre su editor (9n-16); apagarlo desde ahí ──
  await h.goto(B + `/panel/${D}/vendes/herramienta`); await h.getByText(/LO QUE RENTAS · \d+/).first().waitFor();
  await h.screenshot({ path: OUT + 'r11-herramienta-d.png', fullPage: true });
  ok(!!(await vis(h.getByText('PLANES · COBRO CADA MES'))), 'Tu herramienta: también los planes con su interruptor');
  await clic(h.getByText('Lavadora a presión', { exact: true }));
  await h.getByText('Sale en tu Tienda', { exact: true }).first().waitFor();
  await clic(h.getByRole('switch', { name: /Sale en tu Tienda/ }));
  await espera(() => sql(`select sell from items where business_id = '${D}' and module = 'renta' and name->>'es' = 'Lavadora a presión'`) === 'f', 'apagada desde su editor');
  await m.goto(B + `/n/${D}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor(); ok(!(await vis(m.getByText('Lavadora a presión'))), 'no sale en la Tienda');
  sql(`update items set sell = true where business_id = '${D}' and module = 'renta' and removed_at is null`);

  // ── 11. 9n-16 · Agregar, editar y quitar algo para rentar (nombre, precio por día, depósito, unidades) ──
  const NUEVO = `Taladro de prueba ${Date.now() % 100000}`;
  sql(`update items set removed_at = now(), sell = false where business_id = '${D}' and module = 'renta' and name->>'es' like 'Taladro de prueba %' and removed_at is null`);
  await h.goto(B + `/panel/${D}/vendes/herramienta`); await h.getByText(/LO QUE RENTAS · \d+/).first().waitFor();
  await clic(h.getByText('Agregar algo para rentar', { exact: true }));
  await h.getByText('LO QUE RENTAS · NUEVO').first().waitFor();
  await (await vis(h.getByPlaceholder('Lavadora a presión'))).fill(NUEVO);
  await (await vis(h.getByPlaceholder('45'))).fill('20');
  await (await vis(h.getByPlaceholder('100'))).fill('50');
  await clic(h.locator('[aria-label="Cuántas tienes +"]'));
  await h.screenshot({ path: OUT + 'r12-agregar-renta-d.png', fullPage: true });
  await clic(h.getByRole('button', { name: 'Agregar', exact: true }));
  { let v = ''; for (let k = 0; k < 40 && v !== '2000|5000|2|true'; k++) { v = sql(`select price_cents || '|' || deposit_cents || '|' || stock_left || '|' || sell from items where business_id = '${D}' and module = 'renta' and name->>'es' = '${NUEVO}' and removed_at is null`); if (v !== '2000|5000|2|true') await new Promise((r) => setTimeout(r, 250)); }
    if (v !== '2000|5000|2|true') { await h.screenshot({ path: OUT + 'r12-agregar-renta-fallo-d.png', fullPage: true }); console.log('  en la base:', v || '(nada)', '· la página dice:', (await h.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 600)); }
    ok(v === '2000|5000|2|true', 'agregado: $20 por día, $50 de depósito, 2 unidades, en la Tienda'); }
  ok(sql(`select count(*) from audit_entries where action = 'renta.articulo.crear' and target_id = '${D}' and after->>'articulo' = '${NUEVO}'`) === '1', 'queda en la auditoría');
  await m.goto(B + `/n/${D}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor(); ok(!!(await vis(m.getByText(NUEVO))), 'sale en la Tienda de la ficha');
  const NID = sql(`select id from items where business_id = '${D}' and module = 'renta' and name->>'es' = '${NUEVO}' and removed_at is null`);
  await h.goto(B + `/panel/${D}/vendes/herramienta?det=art:${NID}`); await h.getByText('Sale en tu Tienda', { exact: true }).first().waitFor();
  const precio = await vis(h.getByPlaceholder('45')); await precio.fill('25');
  await clic(h.getByRole('button', { name: 'Guardar', exact: true }));
  await espera(() => sql(`select price_cents from items where id = ${NID}`) === '2500', 'editado: ahora $25 por día');
  await clic(h.getByText('Quitar de la lista', { exact: true }));
  await espera(() => sql(`select (removed_at is not null)::text || '|' || sell from items where id = ${NID}`) === 'true|false', 'quitado: fuera de la lista y de la Tienda (nada se borra)');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK renta4f');
})().catch((e) => { console.error(e); process.exit(1); });
