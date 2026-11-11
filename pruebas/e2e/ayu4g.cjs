// 4g-2 · Ayuda con la visita (Hogar) y con la cita (Auto): motivos del rubro, foto obligatoria, devolución de lo cobrado
// del estimado (no solo el depósito), propuesta aceptada, y «que lo revisen otra vez» aceptado por el taller.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', H = 'plomeria-rodriguez', A = 'taller-hermanos-pena', FOTO = ENT.rec('fotos') + '/portada.jpg';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const MARISOL = "(select id from users where phone = '+15705550122')";
const AY = (n, col) => sql(`select ${col} from help_requests h join operations o on o.id = h.operation_id where o.number = '${n}'`);
(async () => {
  const CH = sql(`select o.number from operations o where o.user_id = ${MARISOL} and o.business_id = '${H}' and o.kind = 'appointment' and o.status = 'done' and o.done_at > now() - interval '6 days' and exists (select 1 from payments p where p.operation_id = o.id and p.kind = 'estimate' and p.status = 'captured' and p.refunded_cents = 0) and not exists (select 1 from help_requests h where h.operation_id = o.id) order by o.id desc limit 1`);
  const CA = sql(`select o.number from operations o where o.user_id = ${MARISOL} and o.business_id = '${A}' and o.kind = 'appointment' and o.status = 'done' and o.done_at > now() - interval '6 days' and not exists (select 1 from help_requests h where h.operation_id = o.id) order by o.id desc limit 1`);
  ok(!!CH && !!CA, `visita ${CH} (hogar, con estimado cobrado) y cita ${CA} (auto)`);
  const est = Number(sql(`select max(p.amount_cents) from payments p join operations o on o.id = p.operation_id where o.number = '${CH}' and p.status = 'captured'`));
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  const t = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(t, '5705550222');
  const r = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(r, '5705550211');
  for (const p of [m, t, r]) { p.on('pageerror', e => err.push(e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); }
  // ── Hogar ──
  await m.goto(B + `/cita/${CH}`); await clic(m.getByRole('button', { name: 'Ayuda con la visita' })); await m.waitForURL(/\/ayuda$/);
  const f = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f.getByText('¿Qué pasó?').first().waitFor();
  ok(!!(await vis(m.getByText('Ayuda con la visita').first())) && !!(await vis(f.getByText(/Solo se devuelve lo que se cobró de más/))), 'hogar: Ayuda con la visita · solo se devuelve lo cobrado de más');
  ok((await f.locator('[data-screen-label="Ayuda con la cita · qué pasó"]').getByRole('button').count()) === 7, 'hogar: 7 motivos (franja, cobró más, quedó mal, dañó, otra persona, depósito, otra cosa)');
  await clic(f.getByText('Quedó mal o volvió a fallar')); ok(!!(await vis(f.getByText('Fotos · obligatorias'))), 'quedó mal: la foto es obligatoria');
  await (await vis(f.getByLabel('Qué pasó'))).fill('El grifo volvió a gotear a los dos días de la visita.');
  await f.locator('input[type="file"]').first().setInputFiles(FOTO); await f.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  ok(!!(await vis(f.getByRole('radio', { name: /Que vuelva sin cargo/ }))), 'qué quieres: que vuelva sin cargo (garantía)');
  await clic(f.getByRole('radio', { name: /Devolución a mi tarjeta/ }));
  await m.screenshot({ path: OUT + 'y1-ayuda-hogar-m.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.getByText('PENDIENTE').first().waitFor();
  ok(AY(CH, "h.reason || '|' || h.wants || '|' || h.status") === 'bad|devolver|open', 'guardada: quedó mal · devolución · abierta');
  // El plomero propone devolver $40 (de lo cobrado del estimado, no del depósito).
  const det = t.locator('[data-screen-label="Panel v2 · detalle"]');
  await t.goto(B + `/panel/${H}/hoy?det=cita:${CH}`); await det.getByText(/AYUDA CON LA CITA · H-/).first().waitFor();
  ok(!!(await vis(det.getByText('Quedó mal o volvió a fallar').first())), 'panel: el motivo con su nombre');
  await clic(det.getByText('Proponer otra cosa', { exact: true }));
  ok(!!(await vis(det.getByText(new RegExp(`A su tarjeta puedes devolver hasta \\$${(est / 100).toFixed(2).replace(/\.00$/, '')}`)))), `panel: hasta $${est / 100} (lo cobrado del estimado)`);
  await (await vis(det.getByPlaceholder((est / 100).toFixed(2)))).fill('40');
  await (await vis(det.locator('textarea'))).fill('Vuelvo a revisarlo sin cargo y te devolvemos $40 por la molestia.');
  await t.screenshot({ path: OUT + 'y2-panel-ayuda-d.png', fullPage: true });
  await clic(det.getByRole('button', { name: 'Enviar respuesta' }));
  ok(await espera(() => AY(CH, "h.status || '|' || h.decision || '|' || h.offer_cents"), 'answered|alt|4000') === 'answered|alt|4000', 'el negocio propone $40');
  await m.goto(B + `/cita/${CH}/ayuda`); await m.getByText('TE PROPONEN UN CAMBIO').first().waitFor();
  await clic(m.getByRole('button', { name: 'Aceptar $40' }));
  ok(await espera(() => sql(`select p.status || '|' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${CH}' and p.amount_cents = ${est}`), 'partially_refunded|4000') === 'partially_refunded|4000', 'aceptó: $40 devueltos de lo cobrado del estimado');
  await m.getByText('TERMINADA').first().waitFor(); ok(true, 'hogar: terminada');
  // ── Auto ──
  await m.goto(B + `/cita/${CA}/ayuda`); const f2 = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f2.getByText('¿Qué pasó?').first().waitFor();
  ok(!!(await vis(f2.getByText('Nada se hace ni se cobra sin tu OK.'))) && !!(await vis(f2.getByText('No me dieron las piezas viejas'))), 'auto: motivos del taller');
  await clic(f2.getByText('Dañaron algo del carro')); ok(!!(await vis(f2.getByText('Fotos · obligatorias'))), 'dañaron algo: foto obligatoria');
  await (await vis(f2.getByLabel('Qué pasó'))).fill('Al recoger el carro tenía un rayón nuevo en la puerta del chofer.');
  await f2.locator('input[type="file"]').first().setInputFiles(FOTO); await f2.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await clic(f2.getByRole('radio', { name: /Que lo revisen otra vez sin cargo/ }));
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click(); await m.getByText('PENDIENTE').first().waitFor();
  ok(AY(CA, "h.reason || '|' || h.wants") === 'dano|reponer', 'auto: dañaron algo · que lo revisen sin cargo');
  const d2 = r.locator('[data-screen-label="Panel v2 · detalle"]');
  await r.goto(B + `/panel/${A}/hoy?det=cita:${CA}`); await d2.getByText(/AYUDA CON LA CITA · H-/).first().waitFor();
  await clic(d2.getByText('Tiene razón', { exact: true })); await (await vis(d2.locator('textarea'))).fill('Tráelo el lunes y lo pulimos sin cargo.');
  await clic(d2.getByRole('button', { name: 'Enviar respuesta' }));
  ok(await espera(() => AY(CA, "h.status || '|' || h.decision"), 'answered|ok') === 'answered|ok', 'el taller acepta');
  await m.goto(B + `/cita/${CA}/ayuda`); await m.getByText('ACEPTÓ').first().waitFor(); await clic(m.getByRole('button', { name: 'Entendido' }));
  ok(await espera(() => AY(CA, 'h.status'), 'resolved') === 'resolved', 'auto: terminada con «Entendido»');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK ayu4g');
})().catch((e) => { console.error(e); process.exit(1); });
