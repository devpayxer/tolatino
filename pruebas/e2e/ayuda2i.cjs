const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 20; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const MARISOL = "(select id from users where phone='+15705550122')";
// 9a · Ya no borra todas las solicitudes de ayuda ni la cola entera (El Compa las referencia y otras pruebas las usan): elige dos pedidos de
// Marisol SIN solicitud y al final cierra en la cola solo los casos que abrió.
const RUN = Date.now().toString(36);
const HOJA = /^(Algo no está bien|Algo no salió bien)$/;
// 7d · Con El Compa encendido, «Ayuda con …» abre primero su hoja; «Algo no está bien» lleva al formulario de siempre (?de=compa).
const pasarHoja = async (p) => { await p.waitForLoadState('networkidle'); const r = p.getByText(HOJA); if (await r.count()) { await clic(r); await p.waitForURL(/de=compa/); } };
(async () => {
  require('../lib/negocio-nuevo.cjs').sinTopeDeAyuda('5705550122'); // 9b-1 · el tope de 5 ayudas al día de Marisol (ver lib)
  // Dos pedidos terminados recientes de Marisol (uno para el flujo, otro para vencer a las 24 h).
  // 9a · Sus propios dos pedidos terminados (antes tomaba los dos últimos de la base, que cambian con las otras pruebas): pagados en el local,
  // con un plato cada uno, de hace 2 horas.
  const nuevo = () => { const k = require('crypto').randomUUID();
    const n = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, pay_mode, subtotal_cents, tax_cents, total_cents, sent_at, done_at, client_key, is_test)
      values (nextval('operations_order_seq')::text, 'order', 'hzl', '${BIZ}', ${MARISOL}, 'done', 'picked_up', 'pickup', 'local', 650, 39, 689, now() - interval '3 hours', now() - interval '2 hours', '${k}', true) returning number`).split('\n')[0];
    sql(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct) select o.id, x.id, x.name, 1, x.price_cents, x.price_cents, 6 from operations o, items x where o.client_key = '${k}' and x.business_id = '${BIZ}' and x.removed_at is null and x.status = 'live' order by x.id limit 1`);
    sql(`insert into operation_events (operation_id, kind, actor, actor_id) select id, 'sent', 'user', user_id from operations where client_key = '${k}'`);
    return n; };
  const n1 = nuevo(), n2 = nuevo();
  const limpiar = () => sql(`update queue_items set status = 'decided', decision = 'prueba' where queue = 'sop' and status = 'open' and subject_kind = 'help_request' and subject_id in (select h.id::text from help_requests h join operations o on o.id = h.operation_id where o.number in ('${n1}', '${n2}'))`);
  sql(`update operations set done_at = now() - interval '2 hours' where number in ('${n1}', '${n2}')`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente'); globalThis.__p = [m];
  await entrar(m, '5705550122');
  await m.goto(B + `/pedido/${n1}`); await clic(m.getByText('Ayuda con el pedido', { exact: true }));
  await m.waitForURL(/\/ayuda(\?|$)/); await pasarHoja(m); await m.getByText('Falta algo').first().waitFor();
  ok(!!(await vis(m.getByText(/responde en 24 horas/))), 'ayuda: es una solicitud al negocio (24 h)');
  await m.screenshot({ path: OUT + 'h1-ayuda.png', fullPage: true });
  await clic(m.getByText('Falta algo', { exact: true }));
  await clic(m.getByRole('button', { name: 'Más' }));
  await clic(m.getByText('Seguir', { exact: true }));
  await clic(m.getByText('Que me devuelvan lo de esos platos', { exact: true }));
  await (await vis(m.getByRole('textbox', { name: 'Detalle' }))).fill('Faltó un plato en la bolsa.');
  await m.screenshot({ path: OUT + 'h2-detalle.png', fullPage: true });
  await clic(m.getByText('Enviar solicitud', { exact: true }));
  await m.waitForURL(new RegExp(`/pedido/${n1}$`)); await m.getByText('Solicitud enviada').first().waitFor();
  ok(sql(`select h.reason || '|' || h.wants || '|' || jsonb_array_length(h.items) || '|' || h.status from help_requests h join operations o on o.id = h.operation_id where o.number = '${n1}'`) === 'falta|devolver|1|open', 'solicitud guardada (falta, devolver, 1 plato, abierta)');
  await m.goto(B + `/pedido/${n1}/ayuda`); await m.waitForURL(new RegExp(`/pedido/${n1}$`)); ok(true, 'una sola solicitud por pedido');
  // Panel: Hoy y responder
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'panel'); globalThis.__p.push(d);
  await entrar(d, '5705550133'); await d.goto(B + `/panel/${BIZ}/hoy`); await d.getByText(/AYUDA CON PEDIDOS/).first().waitFor(); ok(true, 'Hoy: ayuda con pedidos');
  await d.goto(B + `/panel/${BIZ}/hoy?det=ped:${n1}`); await d.getByText(/AYUDA CON EL PEDIDO · H-/).first().waitFor();
  await (await vis(d.getByPlaceholder(/Disculpa, te mandamos/))).fill('Disculpa. Pasa por el local y te devolvemos lo del plato.');
  await d.screenshot({ path: OUT + 'h3-panel.png', fullPage: true });
  await clic(d.getByText('Enviar respuesta', { exact: true }));
  ok(await espera(() => sql(`select h.status from help_requests h join operations o on o.id = h.operation_id where o.number = '${n1}'`), 'answered') === 'answered', 'panel: respondió');
  // Cliente: ve la respuesta y pide revisión
  await m.goto(B + `/pedido/${n1}`); await m.getByText('Sabor Dominicano respondió').first().waitFor(); ok(!!(await vis(m.getByText(/te devolvemos lo del plato/))), 'cliente: ve la respuesta');
  await clic(m.getByText(/Pedir que To’Latino lo revise/));
  ok(await espera(() => sql(`select h.status || '|' || (select count(*) from queue_items q where q.queue = 'sop' and q.subject_id = h.id::text and q.status = 'open') from help_requests h join operations o on o.id = h.operation_id where o.number = '${n1}'`), 'escalated|1') === 'escalated|1', 'pide revisión → cola de To’Latino');
  // Vence a las 24 h sin respuesta
  sql(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, body, created_at) select 'H-' || nextval('help_request_number_seq'), id, business_id, city_id, user_id, 'frio', 'Prueba vencida ${RUN}', now() - interval '25 hours' from operations where number = '${n2}'`);
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(a, 'admin'); globalThis.__p.push(a);
  await entrar(a, '5705550199'); await a.goto(B + '/admin/colas?cola=sop'); await a.getByText(/Ayuda con un pedido/).first().waitFor();
  ok(sql(`select status || '|' || escalated_by from help_requests where body = 'Prueba vencida ${RUN}'`) === 'escalated|system', 'sin respuesta en 24 h → pasa a To’Latino');
  ok(sql(`select count(*) from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id join operations o on o.id = h.operation_id where q.queue = 'sop' and q.status = 'open' and o.number in ('${n1}', '${n2}')`) === '2', 'cola Ayuda con pedidos: los 2 casos');
  // Resolver el primero
  const caso = sql(`select q.id from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id join operations o on o.id = h.operation_id where q.queue = 'sop' and q.status = 'open' and o.number = '${n1}' order by q.id desc limit 1`); // 9a: subject_id se repite en otras colas
  console.log('caso', JSON.stringify(caso)); await a.goto(B + `/admin/colas?cola=sop&caso=${caso}`); await a.getByText(/QUÉ QUIERE/).first().waitFor();
  await a.screenshot({ path: OUT + 'h4-admin.png', fullPage: true });
  await clic(a.getByText('Resolver con un mensaje', { exact: true })); await clic(a.getByText(/te devuelven lo de esos platos en el local/)); await clic(a.getByText('Resolver', { exact: true }));
  ok(await espera(() => sql(`select h.status from help_requests h join operations o on o.id = h.operation_id where o.number = '${n1}'`), 'resolved') === 'resolved', 'admin: resuelta con mensaje');
  ok(sql(`select count(*) from audit_entries where action = 'soporte.resolver' and at > now() - interval '1 minute'`) !== '0', 'queda en la auditoría');
  await m.goto(B + `/pedido/${n1}`); await m.getByText('Solicitud resuelta por To’Latino').first().waitFor(); ok(true, 'cliente: ve la resolución');
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
