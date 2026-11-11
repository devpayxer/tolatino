// 4m-2 · Ayuda con la cita de Doctores y con el trámite de Profesionales: motivos por rubro, foto de la factura PRIVADA (solo
// el paciente, el consultorio y To'Latino; nadie más, ni por /medios), avisos neutros de Salud, «Que corrijan el cobro a mi
// seguro», Pro «Ofreció algo que no podía por ley» → licencias a revisión + aviso de la Fiscalía, borrado de fotos a 90 días.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', S = 'centro-medico-quisqueya', P = 'bufete-almonte', FOTO = ENT.rec('fotos') + '/portada.jpg';
const MARISOL = "(select id from users where phone = '+15705550122')";
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const AY = (num, col) => sql(`select ${col} from help_requests h join operations o on o.id = h.operation_id where o.number = '${num}'`);
const st = (p, u) => p.evaluate(async (u) => (await fetch(u)).status, u);
(async () => {
  const CS = sql(`select number from operations where user_id = ${MARISOL} and business_id = '${S}' and status = 'done' order by id desc limit 1`);
  const CP = sql(`select number from operations where user_id = ${MARISOL} and business_id = '${P}' and status = 'done' and status_detail = 'done' order by id desc limit 1`);
  for (const n of [CS, CP]) {
    sql(`update media set owner_kind = 'user', owner_id = 'x' where owner_kind = 'help' and owner_id in (select h.id::text from help_requests h join operations o on o.id = h.operation_id where o.number = '${n}')`);
    sql(`delete from queue_items where subject_kind = 'help_request' and subject_id in (select h.id::text from help_requests h join operations o on o.id = h.operation_id where o.number = '${n}')`);
    sql(`delete from help_requests where operation_id = (select id from operations where number = '${n}')`);
    sql(`update operations set done_at = now() where number = '${n}'`);
  }
  sql(`delete from queue_items where queue = 'lic' and business_id = '${P}' and status = 'open' and priority = 'alta'`);
  sql(`delete from notifications where tpl in ('biz_sal_help', 'sal_help_reply', 'biz_help_cita') and created_at > now() - interval '1 day'`);
  ok(!!CS && !!CP, `cita de Salud ${CS} y trámite ${CP}`);
  const b = await chromium.launch(); const err = [];
  const mk = async (o, tel) => { const p = await (await b.newContext(o)).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); if (tel) await entrar(p, tel); else await p.goto(B + '/'); return p; };
  const m = await mk({ ...devices['iPhone 13'] }, '5705550122'), doc = await mk({ viewport: { width: 1360, height: 900 } }, '5705550244');
  const ofi = await mk({ viewport: { width: 1360, height: 900 } }, '5705550166'), otro = await mk({ viewport: { width: 1360, height: 900 } }, '5705550277');
  const anon = await mk({ viewport: { width: 390, height: 844 } }, null), adm = await mk({ viewport: { width: 1360, height: 900 } }, '5705550199');
  // ── Salud ──
  await m.goto(B + `/cita/${CS}`); await clic(m.getByRole('button', { name: 'Ayuda con la cita' })); await m.waitForURL(/\/ayuda$/);
  const f = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f.getByText('¿Qué pasó?').first().waitFor();
  ok(!!(await vis(f.getByText(/Nada se cobra en To’Latino: lo que se devuelve, lo devuelve el consultorio/))), 'salud: nada se cobra en la app; devuelve el consultorio');
  ok((await f.locator('[data-screen-label="Ayuda con la cita · qué pasó"]').getByRole('button').count()) === 7 && !!(await vis(f.getByText('No había intérprete'))), 'salud: 7 motivos (cobro, seguro, no aceptaron, intérprete, espera, trato, otra)');
  await clic(f.getByText('Me cobraron algo que no dijeron')); await verV(f.getByText('Foto de la factura · obligatoria'));
  ok(!!(await vis(f.getByText(/Tapa los datos médicos si aparecen/))), 'foto de la factura obligatoria · «Tapa los datos médicos»');
  await (await vis(f.getByLabel('Qué pasó'))).fill('Me dijeron $0 con Medicaid y me llegó una factura de $60 por la consulta.');
  await clic(f.getByRole('radio', { name: /Que corrijan el cobro a mi seguro/ }));
  await (await vis(f.getByLabel('Cuánto'))).fill('60');
  await f.locator('input[type="file"]').first().setInputFiles(FOTO); await f.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await m.screenshot({ path: OUT + 'n1-ayuda-salud-m.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.getByText('PENDIENTE').first().waitFor();
  ok(AY(CS, "h.reason || '|' || h.wants || '|' || h.amount_cents || '|' || h.status") === 'cobro|seguro|6000|open', 'guardada: cobro · corregir el seguro · $60 · abierta');
  const fm = sql(`select m.id || '|' || m.private || '|' || m.url from media m join help_requests h on h.id::text = m.owner_id and m.owner_kind = 'help' join operations o on o.id = h.operation_id where o.number = '${CS}'`).split('|');
  ok(fm[1] === 'true' && /^privado\/a\/[0-9a-f-]+\.jpg$/.test(fm[2]), 'la foto es privada (privado/a/…), nunca una URL pública');
  const U = `/api/ayuda/foto/${fm[0]}`;
  ok(await st(m, U) === 200, 'el paciente ve su foto');
  ok(await st(doc, U) === 200, 'el consultorio ve la foto de su paciente');
  ok(await st(anon, U) === 404 && await st(otro, U) === 404, 'sin cuenta u otro negocio: 404 (no se dice que existe)');
  ok(await st(anon, `/medios/${fm[2]}`) !== 200, 'por /medios no se sirve');
  const audAntes = Number(sql(`select count(*) from audit_entries where action = 'ayuda.foto.ver'`));
  ok(await st(adm, U) === 200 && Number(sql(`select count(*) from audit_entries where action = 'ayuda.foto.ver'`)) === audAntes + 1, 'To’Latino la ve y queda en la auditoría');
  // Aviso al consultorio: neutro (sin nombre del paciente).
  const nb = sql(`select tpl || '|' || coalesce(body::text, '') from notifications where tpl = 'biz_sal_help' order by id desc limit 1`);
  ok(/^biz_sal_help\|/.test(nb) && !/Marisol/.test(nb), `aviso al consultorio neutro (${nb.slice(0, 80)})`);
  // El consultorio responde.
  const det = doc.locator('[data-screen-label="Panel v2 · detalle"]');
  await doc.goto(B + `/panel/${S}/hoy?det=cita:${CS}`); await det.getByText(/AYUDA CON LA CITA · H-/).first().waitFor();
  ok(!!(await vis(det.getByText('Le cobraron algo que no dijeron').first())) && !!(await vis(det.getByText('Que corrijan el cobro a su seguro').first())), 'panel: el motivo y lo que pide, con su nombre');
  await clic(det.getByText('Tiene razón', { exact: true }));
  ok(!!(await vis(det.getByText(/Nada se cobró en la app/))), 'panel: nada se cobró en la app; lo hace el consultorio');
  await (await vis(det.locator('textarea'))).fill('Tiene razón. Mandamos la factura corregida a su seguro esta semana.');
  await doc.screenshot({ path: OUT + 'n2-panel-ayuda-salud-d.png', fullPage: true });
  await clic(det.getByRole('button', { name: 'Enviar respuesta' }));
  ok(await espera(() => AY(CS, "h.status || '|' || h.decision"), 'answered|ok') === 'answered|ok', 'el consultorio acepta');
  ok(await espera(() => sql(`select count(*) from notifications where tpl = 'sal_help_reply' and created_at > now() - interval '5 minutes'`), '1') === '1', 'aviso neutro al paciente («Respondieron tu solicitud»)');
  await m.goto(B + `/cita/${CS}/ayuda`); await verV(m.getByText('Corrigen el cobro a tu seguro'));
  ok(!!(await vis(m.getByText('Te mandan la factura corregida en 10 días.'))), 'paciente: corrigen el cobro · factura corregida en 10 días');
  await m.screenshot({ path: OUT + 'n3-ayuda-salud-estado-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Entendido' }));
  ok(await espera(() => AY(CS, 'h.status'), 'resolved') === 'resolved', 'terminada');
  // ── Pro ──
  await m.goto(B + `/cita/${CP}`); await clic(m.getByRole('button', { name: 'Ayuda con el trámite' })); await m.waitForURL(/\/ayuda$/);
  const g = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await g.getByText('¿Qué pasó?').first().waitFor();
  ok(!!(await vis(m.getByText('Ayuda con el trámite').first())) && !!(await vis(g.getByText(/Total por escrito: \$/))), 'pro: Ayuda con el trámite · el total por escrito');
  await clic(g.getByText('Ofreció algo que no podía hacer por ley'));
  await verV(g.getByText(/también puedes reportarlo a la Fiscalía de Pennsylvania/)); ok(true, '«ley»: aviso de la Fiscalía de Pennsylvania');
  ok(!!(await vis(g.getByText('Foto del recibo · opcional'))), '«ley»: la foto es opcional');
  await (await vis(g.getByLabel('Qué pasó'))).fill('Me dijeron que podían darme la residencia en un mes con una carta especial.');
  await clic(g.getByRole('radio', { name: /Que terminen lo acordado/ }));
  await m.screenshot({ path: OUT + 'n4-ayuda-pro-m.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.getByText('PENDIENTE').first().waitFor();
  ok(AY(CP, "h.reason || '|' || h.wants") === 'ley|terminar', 'guardada: ley · que terminen lo acordado');
  const nl = Number(sql(`select count(*) from licenses where business_id = '${P}' and status in ('valid', 'review')`));
  ok(Number(sql(`select count(*) from queue_items where queue = 'lic' and business_id = '${P}' and status = 'open' and priority = 'alta'`)) === nl && nl > 0, `sus ${nl} licencias vuelven a la cola Licencias con prioridad alta`);
  ok(sql(`select count(*) from notifications where tpl = 'biz_help_cita' and created_at > now() - interval '5 minutes'`) === '1', 'la oficina recibe el aviso');
  // ── Borrado a los 90 días ──
  sql(`update help_requests set resolved_at = now() - interval '91 days' where operation_id = (select id from operations where number = '${CS}')`);
  await new Promise((r) => setTimeout(r, 61_000));
  await m.goto(B + `/cita/${CS}`); await m.goto(B + `/cita/${CS}/ayuda`);
  ok(await espera(() => sql(`select status || '|' || url || '|' || (purged_at is not null)::text from media where id = '${fm[0]}'`), 'removed|privado/borrada|true') === 'removed|privado/borrada|true', 'a los 90 días de cerrada la foto se borra del almacenamiento');
  ok(await st(m, U) === 404, 'y ya no se ve ni para el paciente');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK ayu4m');
})().catch((e) => { console.error(e); process.exit(1); });
