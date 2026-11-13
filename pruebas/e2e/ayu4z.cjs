// 4z-2 · Ayuda con la fiesta (faltó algo del paquete, foto, «Que me devuelvan» → el salón propone $100 → aceptar = se devuelve
// del depósito cobrado en la app) y con el viaje («Manejo inseguro» va directo a To'Latino con prioridad, sin esperar al negocio).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9b-1 · Lo que hace otra prueba se pide con requiere (si no está en la base, se corre esa prueba): ya no depende del orden.
const { requiere } = require('../lib/requiere.cjs'); // (y sin ayuda pedida: la de una corrida anterior ya la tiene)
// 9a · 7d: con El Compa encendido, «Ayuda con …» abre primero su hoja; la razón «Algo no salió bien / no está bien» lleva al formulario de
// siempre (?de=compa). Ir directo a /ayuda?de=compa es «ya pasé por la hoja».
// Con la operación todavía viva la hoja no trae esa razón (Cancelar, Otra hora, Otra cosa): ahí se sigue como «ya pasé por la hoja».
const pasarHoja = async (p) => { await p.waitForLoadState('networkidle'); const r = p.getByText(/^(Algo no está bien|Algo no salió bien)$/); if (await r.count()) { await r.first().click(); await p.waitForURL(/de=compa/); } else if (!/de=compa/.test(p.url())) await p.goto(p.url() + (p.url().includes('?') ? '&' : '?') + 'de=compa'); };
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', F = 'salon-imperial', V = 'van-express-nyc', FOTO = ENT.rec('fotos') + '/portada.jpg';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const MARISOL = "(select id from users where phone = '+15705550122')";
const AY = (n, col) => sql(`select ${col} from help_requests h join operations o on o.id = h.operation_id where o.number = '${n}'`);
(async () => {
  require('../lib/negocio-nuevo.cjs').sinTopeDeAyuda('5705550122'); // 9b-1 · el tope de 5 ayudas al día de Marisol (ver lib)
  // Una fiesta terminada con el depósito cobrado y un viaje terminado, sin ayuda abierta.
  const FN = requiere('fie4v', () => sql(`select o.number from operations o join payments p on p.operation_id = o.id and p.kind = 'deposit' and p.status in ('captured', 'partially_refunded') and p.amount_cents - p.refunded_cents >= 10000 where o.user_id = ${MARISOL} and o.business_id = '${F}' and o.kind = 'party' and o.status = 'done' and not exists (select 1 from help_requests h where h.operation_id = o.id) order by o.id desc limit 1`), { que: 'una fiesta terminada con su depósito cobrado' });
  const VN = requiere('tra4y', () => sql(`select o.number from operations o where o.user_id = ${MARISOL} and o.business_id = '${V}' and o.kind = 'trip' and o.status = 'done' and not exists (select 1 from help_requests h where h.operation_id = o.id) order by o.id desc limit 1`), { que: 'un viaje terminado' });
  sql(`delete from queue_items where subject_kind = 'help_request' and subject_id in (select h.id::text from help_requests h join operations o on o.id = h.operation_id where o.number in ('${FN}', '${VN}'))`);
  sql(`delete from help_requests where operation_id in (select id from operations where number in ('${FN}', '${VN}'))`);
  sql(`update operations set done_at = now() - interval '1 day' where number in ('${FN}', '${VN}')`);
  sql(`update help_requests set created_at = created_at - interval '1 day' where user_id = ${MARISOL} and created_at > now() - interval '1 day'`);
  ok(!!FN && !!VN, `fiesta ${FN} (depósito cobrado) y viaje ${VN}`);
  const DEV0 = sql(`select p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${FN}' and p.kind = 'deposit'`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message));
  // ── Fiesta ──
  await m.goto(B + `/fiesta/${FN}`); await clic(m.getByRole('button', { name: 'Ayuda con la fiesta' })); await m.waitForURL(/\/ayuda(\?|$)/); await pasarHoja(m);
  const f = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f.getByText('¿Qué pasó?').first().waitFor();
  ok((await f.locator('[data-screen-label="Ayuda con la cita · qué pasó"]').getByRole('button').count()) === 7, 'fiesta: 7 motivos');
  await clic(f.getByText('Faltó algo del paquete')); ok(!!(await vis(f.getByText('Fotos · obligatorias'))), 'faltó algo: foto obligatoria');
  await (await vis(f.getByLabel('Qué pasó'))).fill('El paquete incluía el arco de globos y no lo trajeron.');
  await f.locator('input[type="file"]').first().setInputFiles(FOTO); await f.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  ok(!!(await vis(f.getByRole('radio', { name: /Un descuento/ }))), 'qué quieres: un descuento (fiestas)');
  await clic(f.getByRole('radio', { name: /Que me devuelvan/ }));
  await m.screenshot({ path: OUT + 'x1-ayuda-fiesta-m.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.getByText('PENDIENTE').first().waitFor();
  ok(AY(FN, "h.reason || '|' || h.wants || '|' || h.status") === 'falto|devolver|open', 'guardada: faltó algo · devolver · abierta');
  const t = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(t, '5705550311');
  t.on('pageerror', e => err.push(e.message));
  await t.goto(B + `/panel/${F}/hoy`); ok(!!(await (async () => { for (let i = 0; i < 40; i++) { if (await vis(t.getByText(new RegExp(`Fiesta #${FN}`)))) return true; await new Promise((r) => setTimeout(r, 250)); } return false; })()), 'panel Hoy: la ayuda de la fiesta por responder');
  const det = t.locator('[data-screen-label="Panel v2 · detalle"]');
  await t.goto(B + `/panel/${F}/hoy?det=fiesta:${FN}`); await det.getByText(/AYUDA CON LA CITA · H-|AYUDA · H-/).first().waitFor().catch(() => {});
  ok(!!(await vis(det.getByText('Faltó algo del paquete').first())), 'panel: el motivo con su nombre');
  await clic(det.getByText('Proponer otra cosa', { exact: true }));
  await (await vis(det.getByPlaceholder(/\d+(\.\d{2})?/))).fill('100');
  await (await vis(det.locator('textarea'))).fill('Te devolvemos $100 del depósito por el arco que faltó.');
  await t.screenshot({ path: OUT + 'x2-panel-ayuda-fiesta-d.png', fullPage: true });
  await clic(det.getByRole('button', { name: 'Enviar respuesta' }));
  ok(await espera(() => AY(FN, "h.status || '|' || h.decision || '|' || h.offer_cents"), 'answered|alt|10000') === 'answered|alt|10000', 'el salón propone $100');
  await m.goto(B + `/fiesta/${FN}/ayuda?de=compa`); await m.getByText('TE PROPONEN UN CAMBIO').first().waitFor();
  await clic(m.getByRole('button', { name: 'Aceptar $100' }));
  ok(await espera(() => sql(`select (p.refunded_cents - ${DEV0})::text from payments p join operations o on o.id = p.operation_id where o.number = '${FN}' and p.kind = 'deposit'`), '10000') === '10000', 'aceptó: $100 devueltos del depósito');
  // ── Viaje: manejo inseguro → directo a To'Latino ──
  await m.goto(B + `/viaje/${VN}`); await clic(m.getByRole('button', { name: 'Ayuda con el viaje' })); await m.waitForURL(/\/ayuda(\?|$)/); await pasarHoja(m);
  const g = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await g.getByText('¿Qué pasó?').first().waitFor();
  ok(!!(await vis(g.getByText('Manejo inseguro'))) && !!(await vis(g.getByText('Perdió o dañó mi equipaje o caja'))), 'viaje: sus motivos');
  await clic(g.getByRole('button', { name: 'Manejo inseguro', exact: true })); await (await vis(g.getByLabel('Qué pasó'))).fill('Iba muy rápido en la 81 y usando el teléfono.');
  await clic(g.getByRole('radio', { name: /Solo quiero avisar/ }));
  await m.screenshot({ path: OUT + 'dbg-viaje-ayuda.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.waitForTimeout(1500);
  ok(AY(VN, "h.reason || '|' || h.status || '|' || h.escalated_by") === 'inseguro|escalated|system', 'manejo inseguro: escalada sola, sin esperar al negocio');
  ok(sql(`select priority from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id where q.subject_kind = 'help_request' and h.operation_id = (select id from operations where number = '${VN}')`) === 'alta', 'en la cola de To\'Latino con prioridad alta');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK ayu4z');
})().catch((e) => { console.error(e); process.exit(1); });
