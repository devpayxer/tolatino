// 4l-2 · «El total, por escrito»: consulta $75 con crédito → pasó la consulta → total (honorario $350 + gobierno $465 − $75,
// extra opcional $60) → el cliente acepta con el extra (acuerdo con hora, versión e IP; inmutable) → terminó el trámite.
// Otra: versión 2 reemplaza a la 1 (aceptar la vieja falla) → «No, gracias» → terminada sin contratar. Nada se cobra en la app.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', L = 'bufete-almonte';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
async function pedir(m) {
  await m.goto(B + `/n/${L}?tab=svc`); await clic(m.getByText('Consulta de inmigración', { exact: true }));
  await clic(m.getByRole('button', { name: 'Elegir hora' })); await m.waitForURL(/\/tramite\?/); await verV(m.getByText('¿PUEDE HACERLO POR LEY?'));
  await clic(m.getByText('En la oficina', { exact: true }));
  await clic(m.getByRole('button', { name: 'Continuar' })); await verV(m.getByText('HORA', { exact: true }));
  await clic(m.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /^\s*\d{1,2}:\d{2} (AM|PM)\s*$/ }));
  await clic(m.getByRole('button', { name: 'Continuar' })); await clic(m.getByRole('button', { name: 'Enviar solicitud' }));
  await m.waitForURL(/\/cita\/C-\d+/); const num = m.url().match(/C-\d+/)[0];
  sql(`update operations set status = 'confirmed', confirmed_at = now(), answered_at = now() where number = '${num}'`); return num;
}
async function mandar(d, num, fee, gov, extra) {
  await d.goto(B + `/panel/${L}/hoy?det=cita:${num}`);
  if (await vis(d.getByRole('button', { name: 'Pasó la consulta' }))) { await clic(d.getByRole('button', { name: 'Pasó la consulta' })); }
  await verV(d.getByLabel('TU HONORARIO', { exact: true }));
  await (await vis(d.getByLabel('TU HONORARIO', { exact: true }))).fill(String(fee));
  await (await vis(d.getByLabel('TARIFA DEL GOBIERNO · APARTE · OPCIONAL', { exact: true }))).fill(String(gov));
  if (extra) { await (await vis(d.getByLabel('EXTRA OPCIONAL · OPCIONAL', { exact: true }))).fill(extra[0]); await (await vis(d.getByLabel('PRECIO DEL EXTRA', { exact: true }))).fill(String(extra[1])); }
  await clic(d.getByRole('button', { name: 'Mandar el total por escrito' }));
}
(async () => {
  const b = await chromium.launch(); const err = [];
  const mk = async (vp) => { const p = await (await b.newContext({ viewport: vp })).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_|maplibre|tiles/i.test(x.text())) err.push('console ' + x.text()); }); return p; };
  const m = await mk({ width: 390, height: 844 }), d = await mk({ width: 1360, height: 900 });
  const MU = sql(`select id from users where phone = '+15705550122'`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'admin' where user_id = '${MU}' and kind = 'appointment' and status in ('pending','confirmed','change_proposed')`);
  await entrar(m, '5705550122'); await entrar(d, '5705550166');
  // ── Contrata ──
  const N1 = await pedir(m), O1 = sql(`select id from operations where number = '${N1}'`);
  await mandar(d, N1, 350, 465, ['Traducción certificada', 60]);
  ok(await espera(() => sql(`select version || '|' || fee_cents || '|' || gov_cents || '|' || credit_cents || '|' || total_cents || '|' || status from written_totals where operation_id = ${O1}`), '1|35000|46500|7500|74000|sent') === '1|35000|46500|7500|74000|sent', 'total v1: $350 + gobierno $465 − crédito $75 = $740 (lo calcula el servidor)');
  ok(sql(`select count(*) from notifications where ref_id = '${N1}' and tpl = 'pro_total'`) === '1', 'aviso «te mandaron el total por escrito»');
  await m.goto(B + `/cita/${N1}`); await verV(m.getByText('Te mandaron el total: $740'));
  ok(!!(await vis(m.getByText(/Nadie te garantiza un resultado. Este total/))), 'cuadro «Nadie te garantiza un resultado…»');
  await m.screenshot({ path: OUT + 'l4-total-escrito-m.png', fullPage: true });
  await clic(m.getByRole('checkbox', { name: 'Traducción certificada' }));
  await verV(m.getByText('$800').first());
  await clic(m.getByRole('button', { name: 'Aceptar y contratar' }));
  ok(await espera(() => sql(`select t.status || '|' || (t.accepted_ip is not null)::text || '|' || array_to_string(t.accepted_extras, ',') || '|' || o.status_detail || '|' || o.total_cents from written_totals t join operations o on o.id = t.operation_id where t.operation_id = ${O1}`), 'accepted|true|0|hired|33500') === 'accepted|true|0|hired|33500', 'aceptado con el extra: acuerdo con IP; lo que se paga a la oficina $335 (honorario − crédito + extra; el gobierno aparte)');
  let inmutable = false; try { sql(`update written_totals set total_cents = 1 where operation_id = ${O1}`); } catch { inmutable = true; }
  ok(inmutable, 'el total aceptado no se puede cambiar (la base lo impide)');
  ok(sql(`select count(*) from notifications where ref_id = '${N1}' and tpl = 'biz_pro_ok'`) === '1', 'la oficina sabe que contrataron');
  await m.reload(); await verV(m.getByText(/Tu trámite está en manos de/)); ok(true, 'cliente: «Tu trámite está en manos de…» · CONTRATADO');
  await m.screenshot({ path: OUT + 'l5-contratado-m.png', fullPage: true });
  await d.goto(B + `/panel/${L}/hoy?det=cita:${N1}`); await clic(d.getByRole('button', { name: 'Terminó el trámite' }));
  ok(await espera(() => sql(`select status || '|' || status_detail from operations where id = ${O1}`), 'done|done') === 'done|done', 'terminó el trámite');
  // ── Versión nueva y no contratar ──
  const N2 = await pedir(m), O2 = sql(`select id from operations where number = '${N2}'`);
  await mandar(d, N2, 900, 0, null);
  await espera(() => sql(`select count(*) from written_totals where operation_id = ${O2}`), '1');
  await m.goto(B + `/cita/${N2}`); await verV(m.getByText(/Te mandaron el total: \$825/));
  await mandar(d, N2, 800, 0, null);
  ok(await espera(() => sql(`select string_agg(version || ':' || status, ',' order by version) from written_totals where operation_id = ${O2}`), '1:superseded,2:sent') === '1:superseded,2:sent', 'versión 2 reemplaza a la 1');
  await clic(m.getByRole('button', { name: 'Aceptar y contratar' }));
  await verV(m.getByText('La oficina mandó una versión nueva del total. Revísala.')); ok(true, 'aceptar la versión vieja → «mandó una versión nueva. Revísala.»');
  await m.reload(); await verV(m.getByText(/Te mandaron el total: \$725/));
  await clic(m.getByRole('button', { name: 'No, gracias · solo la consulta' }));
  ok(await espera(() => sql(`select status || '|' || status_detail from operations where id = ${O2}`), 'done|nohire') === 'done|nohire', 'no contrató → terminada, solo la consulta');
  await m.reload(); await verV(m.getByText('No contrataste'));
  ok(sql(`select count(*) from payments where operation_id in (${O1}, ${O2})`) === '0', 'nada se cobró en la app');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK pro4l2');
})().catch((e) => { console.error(e); process.exit(1); });
