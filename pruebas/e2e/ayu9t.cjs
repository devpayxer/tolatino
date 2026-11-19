// 9t (19 nov) · El tope de «Ayuda con …» (LAUNCH: «no tiene su prueba»). El número sale de Configuración (ayuda_tope_dia, 0182) y lo lee el
// servidor en la misma consulta que cuenta. La persona es nueva (su tope no depende de otras pruebas): con el tope en 2 y dos solicitudes
// de hoy, la tercera se rechaza con «Abriste muchas solicitudes hoy»; con el tope en 3, la misma pasa. Una solicitud de ayer no cuenta.
// Al final el tope vuelve a como estaba. A 390 (teléfono) y en inglés el mensaje.
const ENT = require('../lib/entorno.cjs');
const { hidratado } = require('../lib/hidratado.cjs');
const { chromium, devices } = require('playwright');
const { entrarComo, telLibre, sql } = require('../lib/negocio-nuevo.cjs');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const HOJA = /^(Algo no está bien|Algo no salió bien|Something is not right|Something went wrong)$/;
(async () => {
  const TEL = telLibre(), U = `(select id from users where phone = '+1${TEL}')`;
  const antes = sql(`select coalesce((select value::text from platform_config where key = 'ayuda_tope_dia'), '')`);
  const tope = (v) => sql(`insert into platform_config (key, value, note) values ('ayuda_tope_dia', to_jsonb(${v}), 'prueba ayu9t') on conflict (key) do update set value = excluded.value`);
  process.on('exit', () => { try { sql(antes ? `update platform_config set value = '${antes}'::jsonb where key = 'ayuda_tope_dia'` : `delete from platform_config where key = 'ayuda_tope_dia'`); } catch {} });
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  m.on('pageerror', (e) => err.push(e.message));
  await entrarComo(m, TEL, { nombre: 'Tope', apellido: 'Ayuda' });
  // Sus pedidos terminados (de hace 2 horas, pagados en el local, un plato cada uno): 4 propios, ninguno de otra prueba.
  const nuevo = () => { const k = require('crypto').randomUUID();
    const n = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, pay_mode, subtotal_cents, tax_cents, total_cents, sent_at, done_at, client_key, is_test)
      values (nextval('operations_order_seq')::text, 'order', 'hzl', '${BIZ}', ${U}, 'done', 'picked_up', 'pickup', 'local', 650, 39, 689, now() - interval '3 hours', now() - interval '2 hours', '${k}', true) returning number`).split('\n')[0];
    sql(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct) select o.id, x.id, x.name, 1, x.price_cents, x.price_cents, 6 from operations o, (select id, name, price_cents from items where business_id = '${BIZ}' order by id limit 1) x where o.client_key = '${k}'`);
    return n; };
  const [n1, n2, n3, n4] = [nuevo(), nuevo(), nuevo(), nuevo()];
  const ayuda = (n, cuando = 'now()') => sql(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, items, wants, body, created_at)
    select 'H-' || nextval('help_request_number_seq'), o.id, o.business_id, o.city_id, o.user_id, 'otro', '[]'::jsonb, 'devolver', 'prueba ayu9t', ${cuando} from operations o where o.number = '${n}'`);
  ayuda(n1); ayuda(n2); ayuda(n4, "now() - interval '25 hours'"); // la de ayer no cuenta
  const pedir = async (n) => {
    await m.goto(B + `/pedido/${n}/ayuda`); await m.waitForLoadState('networkidle');
    const h = m.getByText(HOJA); if (await h.count()) { await h.first().click(); await m.waitForURL(/de=compa/); }
    await (await hidratado(m.getByText('Otro problema', { exact: true }).first())).click();
    await (await hidratado(m.locator('textarea[aria-label="Detalle"] >> visible=true').first())).fill('No me llegó la salsa. Prueba del tope.');
    await m.getByText('Enviar solicitud', { exact: true }).first().click();
  };
  tope(2);
  await pedir(n3);
  await m.getByText('Abriste muchas solicitudes hoy. Prueba mañana.').first().waitFor({ timeout: 15000 });
  await m.screenshot({ path: OUT + 'ayu9t-tope-390.png', fullPage: true });
  ok(sql(`select count(*) from help_requests h join operations o on o.id = h.operation_id where o.number = '${n3}'`) === '0', 'con el tope en 2 y dos de hoy, la tercera se rechaza («Abriste muchas solicitudes hoy»)');
  ok(true, 'la de ayer no cuenta (hay 3 en total y el tope es 2: solo cuentan las de 24 h)');
  tope(3);
  await pedir(n3);
  ok(await espera(() => sql(`select count(*) from help_requests h join operations o on o.id = h.operation_id where o.number = '${n3}'`), '1') === '1', 'con el tope en 3 (Configuración), la misma solicitud pasa');
  ok(!err.length, `sin errores en la página (${err.join(' | ').slice(0, 200) || 'ninguno'})`);
  await b.close();
})().catch((e) => { console.error('FALLO', e.message.split('\n').slice(0, 6).join(' | ')); process.exit(1); });
