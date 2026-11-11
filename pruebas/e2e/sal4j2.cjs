// 4j-2 · La cita de Doctores entre el consultorio y el paciente: el panel ve seguro, motivo y la nota (descifrada solo ahí);
// «No aceptamos su seguro» → el paciente elige (seguir sin seguro); a las 2 h sin elegir se libera; confirmar con aviso neutro;
// la nota se borra a los 30 días.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', S = 'centro-medico-quisqueya';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
async function pedir(m, nota) {
  await m.goto(B + `/n/${S}?tab=svc`); await clic(m.getByText('Consulta de medicina general', { exact: true }));
  await clic(m.getByRole('button', { name: 'Elegir hora' })); await m.waitForURL(/\/consulta\?/); await verV(m.getByText('TU SEGURO', { exact: true }));
  await clic(m.getByText('Para mí', { exact: true })); await clic(m.getByText('Seguimiento', { exact: true }));
  await (await vis(m.getByLabel('Nota para el consultorio'))).fill(nota);
  await clic(m.getByRole('button', { name: 'Continuar' })); await verV(m.getByText('HORA', { exact: true }));
  await clic(m.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /^\s*\d{1,2}:\d{2} (AM|PM)\s*$/ }));
  await clic(m.getByRole('button', { name: 'Continuar' })); await clic(m.getByRole('button', { name: 'Enviar solicitud' }));
  await m.waitForURL(/\/cita\/C-\d+/); return m.url().match(/C-\d+/)[0];
}
(async () => {
  const b = await chromium.launch(); const err = [];
  const mk = async (vp) => { const p = await (await b.newContext({ viewport: vp })).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_|maplibre|tiles/i.test(x.text())) err.push('console ' + x.text()); }); return p; };
  const m = await mk({ width: 390, height: 844 }), d = await mk({ width: 1360, height: 900 });
  const MU = sql(`select id from users where phone = '+15705550122'`);
  // Una nota vieja (cita cancelada hace 31 días): el primer barrido la borra.
  const vieja = sql(`select o.id from operations o join op_private p on p.operation_id = o.id where o.user_id = '${MU}' order by o.id limit 1`);
  if (vieja) sql(`update operations set status = 'cancelled', cancelled_by = 'admin', cancelled_at = now() - interval '31 days', updated_at = now() - interval '31 days' where id = ${vieja}`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'admin' where user_id = '${MU}' and kind = 'appointment' and status in ('pending','confirmed','change_proposed')`);
  await entrar(m, '5705550122'); await entrar(d, '5705550244');
  const N1 = await pedir(m, 'Me duele la garganta');
  if (vieja) ok(await espera(() => sql(`select (note_enc is null)::text from op_private where operation_id = ${vieja}`), 'true') === 'true', 'nota de una cita terminada hace 31 días: borrada por el barrido');
  // ── Panel: lo que ve el consultorio ──
  await d.goto(B + `/panel/${S}/hoy?det=cita:${N1}`); await verV(d.getByText('No aceptamos su seguro'));
  ok(!!(await vis(d.getByText(/Medicaid · UPMC for You · ••• 4471/))), 'panel: SEGURO «Medicaid · UPMC for You · ••• 4471»');
  ok(!!(await vis(d.getByText('Seguimiento', { exact: true }))), 'panel: MOTIVO «Seguimiento»');
  ok(!!(await vis(d.getByText(/Nota del paciente \(privada\): Me duele la garganta/))), 'panel: la nota descifrada solo aquí');
  await d.screenshot({ path: OUT + 'j5-panel-cita-salud-d.png', fullPage: true });
  await clic(d.getByRole('button', { name: 'No aceptamos su seguro' }));
  ok(await espera(() => sql(`select status || '|' || status_detail || '|' || (respond_by between now() + interval '115 minutes' and now() + interval '121 minutes')::text from operations where number = '${N1}'`), 'pending|seg|true') === 'pending|seg|true', '«No aceptamos su seguro» → la hora guardada 2 h');
  const avSeg = sql(`select body from notifications where ref_id = '${N1}' and tpl = 'sal_cita_seg' order by id desc limit 1`);
  ok(avSeg && !/Quisqueya|Consulta|garganta/i.test(avSeg), `aviso al paciente neutro: «${avSeg}»`);
  // ── El paciente elige: seguir sin seguro ──
  await m.goto(B + `/cita/${N1}`); await verV(m.getByText('¿QUÉ QUIERES HACER?'));
  ok(!!(await vis(m.getByText('No aceptan tu seguro').first())), 'cita: «No aceptan tu seguro»');
  await m.screenshot({ path: OUT + 'j6-cita-seg-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: /Seguir sin seguro · \$85/ }));
  ok(await espera(() => sql(`select status || '|' || total_cents || '|' || (details->'precio'->>'es') from operations where number = '${N1}'`), 'confirmed|8500|$85 · SIN SEGURO') === 'confirmed|8500|$85 · SIN SEGURO', 'seguir sin seguro → confirmada, en la consulta $85 · SIN SEGURO');
  ok(sql(`select count(*) from notifications where ref_id = '${N1}' and tpl = 'biz_sal_seg_ok'`) === '1', 'el consultorio recibe «sigue sin seguro» (neutro)');
  ok(sql(`select count(*) from payments where operation_id = (select id from operations where number = '${N1}')`) === '0', 'nada se cobró en la app');
  // ── Sin elegir a las 2 h: se libera ──
  const N2 = await pedir(m, 'Control de presión');
  await d.goto(B + `/panel/${S}/hoy?det=cita:${N2}`); await clic(d.getByRole('button', { name: 'No aceptamos su seguro' }));
  await espera(() => sql(`select status_detail from operations where number = '${N2}'`), 'seg');
  sql(`update operations set respond_by = now() - interval '1 minute' where number = '${N2}'`);
  await m.goto(B + `/cita/${N2}`); await verV(m.getByText(/CANCELADA/));
  ok(sql(`select status || '|' || cancel_reason from operations where number = '${N2}'`) === 'cancelled|seg_vencida', '2 h sin elegir → cancelada por el sistema (la hora se libera)');
  ok(sql(`select count(*) from notifications where ref_id = '${N2}' and tpl = 'sal_cita_seg_fin'`) === '1', 'aviso «se liberó tu hora» (neutro)');
  // ── Confirmar: aviso neutro ──
  const N3 = await pedir(m, 'Vacuna');
  await d.goto(B + `/panel/${S}/hoy?det=cita:${N3}`); await clic(d.getByRole('button', { name: 'Confirmar' }));
  ok(await espera(() => sql(`select status from operations where number = '${N3}'`), 'confirmed') === 'confirmed', 'confirmada');
  const avOk = sql(`select body from notifications where ref_id = '${N3}' and tpl = 'sal_cita_ok' order by id desc limit 1`);
  ok(avOk && /Detalles en la app/.test(avOk) && !/Quisqueya|Consulta|Vacuna/i.test(avOk), `aviso de confirmada neutro: «${avOk}»`);
  ok(sql(`select count(*) from notifications where ref_id in ('${N1}','${N2}','${N3}') and (body ilike '%Quisqueya%' or body ilike '%medicina%')`) === '0', 'ningún aviso de estas citas nombra el consultorio ni el servicio');
  await m.goto(B + `/cita/${N3}`); await verV(m.getByText(/Llega 15 minutos antes con tu tarjeta del seguro/));
  await m.screenshot({ path: OUT + 'j7-cita-ok-m.png', fullPage: true });
  sql(`update operations set status = 'cancelled', cancelled_by = 'admin' where number = '${N3}'`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK sal4j2');
})().catch((e) => { console.error(e); process.exit(1); });
