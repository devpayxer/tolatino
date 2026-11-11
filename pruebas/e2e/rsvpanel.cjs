const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', P = '/panel/' + BIZ;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(600); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const MARISOL = "(select id from users where phone='+15705550122')";
const op = (n, c = "status") => sql(`select ${c} from operations where number='${n}'`);
(async () => {
  sql(`update business_hours set ranges='[["11:00","22:00"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update operations set status='cancelled' where kind='table' and status in ('pending','confirmed','change_proposed')`);
  sql(`update reservation_settings set areas = jsonb_set(jsonb_set(areas, '{barra,on}', 'false'), '{barra,t,2}', '4'), auto_confirm=false where business_id='${BIZ}'`);
  sql(`delete from reservation_holds`); sql(`update reservation_blocks set removed_at=now() where removed_at is null`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente');
  await entrar(m, '5705550122');
  const reservar = async (p, d, h) => {
    await m.goto(B + `/n/${BIZ}?tab=rsv&p=${p}&d=${d}&h=${h}`); await m.locator('[data-screen-label="Ficha · barra de pedido"]').getByText('Continuar').click();
    await m.waitForURL(/\/reservar\?hold=/); await m.locator('[data-screen-label="Reserva · barra"]').getByText('Enviar solicitud').click();
    await m.waitForURL(/\/reserva\/R-\d+$/); return m.url().split('/').pop();
  };
  const n1 = await reservar(2, 1, 1140), n2 = await reservar(4, 1, 780), n3 = await reservar(3, 2, 1110);
  ok([n1, n2, n3].every((n) => op(n) === 'pending'), `3 solicitudes: ${n1} ${n2} ${n3}`);

  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'panel');
  await entrar(d, '5705550133');
  await d.goto(B + P + '/hoy'); await d.getByText(`Reservación #${n1}`).first().waitFor();
  ok(true, 'Hoy: llegan las reservaciones a «Esperan tu respuesta»'); await shot(d, 'p1-hoy-rsv-d.png');
  const fila = (n) => d.locator('div', { has: d.getByText(`Reservación #${n}`, { exact: true }) }).filter({ has: d.getByText('Confirmar', { exact: true }) }).last();
  await fila(n1).getByText('Confirmar', { exact: true }).click(); await d.getByText('ya ve su mesa confirmada.').waitFor();
  ok(op(n1) === 'confirmed', 'Confirmar → confirmada');
  await fila(n2).getByText('Otra hora', { exact: true }).click(); await d.getByText('ya ve la hora que le propones.').waitFor();
  ok(op(n2) === 'change_proposed' && +sql(`select count(*) from change_proposals p join operations o on o.id=p.operation_id where o.number='${n2}' and p.status='open'`) === 1, 'Otra hora → propuesta abierta');
  await fila(n3).getByText('No hay mesa', { exact: true }).click(); await d.getByText('ya ve que no hay mesa.').waitFor();
  ok(op(n3) === 'declined', 'No hay mesa → no se pudo');

  // El cliente ve la propuesta y la acepta; el panel lo anota.
  await m.goto(B + '/reserva/' + n2); await m.getByText(/^Aceptar a la/).first().click(); await m.getByText(/^Listo: tu mesa es/).first().waitFor();
  ok(op(n2) === 'confirmed', 'el cliente acepta la otra hora');

  // Detalle: hoy, llegaron y se fueron
  sql(`update operations set scheduled_at = date_trunc('hour', now()) + interval '30 minutes' where number='${n1}'`);
  await d.goto(B + P + `/hoy?det=rsv:${n1}`); await d.getByText('HISTORIAL').first().waitFor();
  await shot(d, 'p2-detalle-d.png');
  await d.getByText('Llegaron · en su mesa').first().click(); await d.getByText('Anotado · en su mesa.').waitFor();
  ok(op(n1, "status||'|'||coalesce(status_detail,'-')") === 'confirmed|seated', 'Llegaron → sentados');
  await d.getByText('Se fueron · mesa libre').first().click(); await d.getByText('Anotado · mesa libre.').waitFor();
  ok(op(n1) === 'done', 'Se fueron → terminada');
  ok(+sql(`select count(*) from audit_entries where action like 'reserva.%' and at > now() - interval '5 minutes'`) >= 5, 'auditoría de cada paso');

  // Clientes › Reservaciones
  await d.goto(B + P + '/clientes?t=rsv'); await d.getByText(`Reservación #${n3}`).first().waitFor();
  const nNo = sql(`select count(*) from operations where business_id='${BIZ}' and kind='table' and status in ('declined','expired','cancelled')`);
  ok(await d.getByText(`No se pudo · ${nNo}`, { exact: true }).first().isVisible(), `Clientes › Reservaciones: «No se pudo · ${nNo}» igual que la base`);
  await d.getByText(`Reservación #${n3}`).first().click(); await d.waitForURL(/det=rsv/); ok(/t=rsv/.test(d.url()), 'el detalle conserva la pestaña');
  await shot(d, 'p3-clientes-rsv-d.png');

  // Lo que vendes › Reservaciones
  await d.goto(B + P + '/vendes'); await d.getByText('Reservaciones', { exact: true }).first().click(); await d.waitForURL(/vendes\/reservaciones/);
  await d.getByText('MESAS POR ÁREA').waitFor(); await shot(d, 'p4-ajustes-d.png', true);
  await d.getByRole('switch', { name: 'Barra' }).click();
  await d.locator('div', { has: d.getByText('Mesas de 2', { exact: true }) }).last().getByRole('button', { name: '+' }).click();
  await d.getByText('Confirmar al instante si hay mesa').click().catch(() => {});
  await d.locator('div', { has: d.getByText('Confirmar al instante si hay mesa') }).getByRole('switch').last().click();
  await d.getByText('Guardar', { exact: true }).last().click(); await d.getByText('Guardado · el cliente ya lo ve así.').waitFor();
  ok(sql(`select (areas->'barra'->>'on')||'|'||(areas->'barra'->'t'->>'2')||'|'||auto_confirm from reservation_settings where business_id='${BIZ}'`) === 'true|5|true', 'guardar: Barra con 5 mesas de 2 y confirmar al instante');
  // Cerrar un día y quitarlo
  await d.getByText('DÍAS SIN RESERVACIONES').scrollIntoViewIfNeeded(); await d.locator('[data-rsv-blk], div').getByText('Agregar', { exact: true }).last().click();
  await d.getByText(/^Cerrar mañana/).click(); await d.getByText('Cerrado para reservar. Tu página ya no lo ofrece.').waitFor();
  ok(+sql(`select count(*) from reservation_blocks where business_id='${BIZ}' and removed_at is null`) === 1, 'cerrar mañana → día sin reservaciones');
  const horas = await (await b.newContext()).newPage(); await horas.goto(B + `/n/${BIZ}?tab=rsv&p=2&d=1`);
  await horas.getByText(/cierra ese día|No hay mesas/).last().waitFor(); ok(true, 'la página ya no ofrece mañana'); await horas.close();
  await d.getByText('Quitar', { exact: true }).first().click(); await d.getByText('Se abrió otra vez para reservar.').waitFor();
  ok(+sql(`select count(*) from reservation_blocks where business_id='${BIZ}' and removed_at is null`) === 0, 'quitar → se abre otra vez');
  // Restaurar ajustes de la semilla
  sql(`update reservation_settings set areas = jsonb_set(jsonb_set(areas, '{barra,on}', 'false'), '{barra,t,2}', '4'), auto_confirm=false where business_id='${BIZ}'`);
  const mp = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(mp, 'panel-movil'); await entrar(mp, '5705550133');
  await mp.goto(B + P + '/vendes/reservaciones'); await mp.getByText('MESAS POR ÁREA').waitFor(); await shot(mp, 'p5-ajustes-m.png');
  sql(`update operations set status='cancelled' where kind='table' and status in ('pending','confirmed','change_proposed')`);
  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  await b.close(); console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
