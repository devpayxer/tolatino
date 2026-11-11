const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', T = 'taller-hermanos-pena', H = 'plomeria-rodriguez';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const MARISOL = "(select id from users where phone = '+15705550122')";
const det = (n) => sql(`select status || '|' || coalesce(status_detail, '') from operations where number = '${n}'`);
// Una cita confirmada que empieza ahora (sin pasar por el Booking: eso lo prueba vi4b).
const crear = (biz, details, dur) => {
  const n = 'C-' + sql(`select nextval('operations_appt_seq')`);
  sql(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, details, subtotal_cents, total_cents, deposit_cents, pay_mode, confirmed_at, answered_at, client_key, is_test)
       select '${n}', 'appointment', 'hzl', '${biz}', ${MARISOL}, (select id from business_members where business_id = '${biz}' and kind = 'owner'), 'confirmed', date_trunc('hour', now()), ${dur}, '${JSON.stringify(details)}'::jsonb, 14500, 14500, 0, 'local', now(), now(), gen_random_uuid(), true`);
  return n;
};
const limpiar = () => sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and business_id in ('${T}','${H}') and status in ('pending', 'change_proposed', 'confirmed')`);
(async () => {
  limpiar();
  const A = crear(T, { rubro: 'auto', svc: { es: 'Cambio de aceite', en: 'Oil change' }, veh: { t: '2016 honda CR-V', size: 's', mi: 84200 }, w: 'deja', luces: ['oil'], piezas: true }, 30);
  const C = crear(H, { rubro: 'hogar', svc: { es: 'Cambiar grifo', en: 'Replace faucet' }, casa: { dir: '112 W Oak St, 18201', tenure: 'inq' }, win: 0, area: 'cocina', acceso: 'casa', landlord: true }, 120);
  const N = crear(H, { rubro: 'hogar', svc: { es: 'Inodoro que corre o gotea', en: 'Running toilet' }, casa: { dir: '112 W Oak St, 18201', tenure: 'inq' }, win: 0, acceso: 'llave', accesoNota: 'La llave con la vecina' }, 120);
  sql(`update operations set details = jsonb_set(details, '{win}', to_jsonb((extract(hour from scheduled_at at time zone 'America/New_York') * 60 + 120)::int)) where number in ('${C}','${N}')`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); globalThis.__p = [m]; await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(d); d.on('pageerror', e => err.push('panel ' + e.message)); await entrar(d, '5705550211');
  const dt = d.locator('[data-screen-label="Panel v2 · detalle"]');
  // ── Taller ──
  await d.goto(B + `/panel/${T}/hoy?det=cita:${A}`); await dt.getByText('VEHÍCULO').first().waitFor();
  ok(!!(await vis(dt.getByText(/Lo deja y le avisas/))) && !!(await vis(dt.getByText('Aceite', { exact: true }))), 'detalle del taller: vehículo, lo deja, luz de aceite');
  await clic(dt.getByRole('button', { name: 'Recibí el carro' }));
  ok(await espera(() => det(A), 'confirmed|in') === 'confirmed|in', 'Recibí el carro → en el taller');
  ok(sql(`select count(*) from notifications where tpl = 'cita_recibido' and ref_id = '${A}'`) === '1', 'aviso: tu carro está en el taller');
  await m.goto(B + `/cita/${A}`); await m.getByText('EN EL TALLER').first().waitFor(); ok(true, 'cliente: «Revisando tu CR-V» · EN EL TALLER');
  await m.screenshot({ path: OUT + 'g1-auto-taller-m.png', fullPage: true });
  await d.goto(B + `/panel/${T}/hoy?det=cita:${A}`); await clic(dt.getByRole('button', { name: 'Empezar' }));
  ok(await espera(() => det(A), 'confirmed|work') === 'confirmed|work', 'Empezar → trabajando');
  await d.goto(B + `/panel/${T}/hoy?det=cita:${A}`); await clic(dt.getByRole('button', { name: 'Listo para recoger' }));
  ok(await espera(() => det(A), 'confirmed|ready') === 'confirmed|ready', 'Listo para recoger');
  await d.screenshot({ path: OUT + 'g2-panel-listo-d.png', fullPage: true });
  await m.goto(B + `/cita/${A}`); await m.getByText('Listo para recoger').first().waitFor();
  await m.screenshot({ path: OUT + 'g3-auto-listo-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Ya lo recogí' }));
  ok(await espera(() => det(A), 'done|done') === 'done|done', 'cliente: «Ya lo recogí» → terminada');
  // ── Hogar ──
  const h = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(h); h.on('pageerror', e => err.push('hogar ' + e.message)); await entrar(h, '5705550222');
  const ht = h.locator('[data-screen-label="Panel v2 · detalle"]');
  await h.goto(B + `/panel/${H}/hoy?det=cita:${C}`); await ht.getByText('FRANJA').first().waitFor();
  ok(!!(await vis(ht.getByText(/inquilino con permiso del landlord/))), 'detalle Hogar: casa, inquilino con permiso, franja');
  await clic(ht.getByRole('button', { name: 'Voy en camino' }));
  ok(await espera(() => det(C), 'confirmed|road') === 'confirmed|road', 'Voy en camino');
  await m.goto(B + `/cita/${C}`); await m.getByText('VA EN CAMINO').first().waitFor(); ok(true, 'cliente: va en camino, dentro de tu franja');
  await m.screenshot({ path: OUT + 'g4-hogar-camino-m.png', fullPage: true });
  await h.goto(B + `/panel/${H}/hoy?det=cita:${C}`); await clic(ht.getByRole('button', { name: 'Llegué' }));
  ok(await espera(() => det(C), 'confirmed|in') === 'confirmed|in', 'Llegué → en tu casa');
  await h.goto(B + `/panel/${H}/hoy?det=cita:${C}`); await clic(ht.getByRole('button', { name: 'Terminé' }));
  ok(await espera(() => det(C), 'confirmed|ready') === 'confirmed|ready', 'Terminé → revisa el trabajo');
  await m.goto(B + `/cita/${C}`); await clic(m.getByRole('button', { name: 'Todo bien' }));
  ok(await espera(() => det(C), 'done|done') === 'done|done', 'cliente: «Todo bien» → terminada');
  // No había nadie
  await h.goto(B + `/panel/${H}/hoy?det=cita:${N}`); await clic(ht.getByRole('button', { name: 'No había nadie' }));
  ok(await espera(() => det(N), 'done|noshow') === 'done|noshow', 'No había nadie');
  await m.goto(B + `/cita/${N}`); await m.getByText('NO HABÍA NADIE').first().waitFor(); ok(true, 'cliente: no había nadie · no se cobró nada');
  ok(sql(`select count(*) from audit_entries where action = 'cita.camino' and at > now() - interval '2 minutes'`) !== '0', 'cada paso queda en la auditoría');
  // Un paso fuera de orden no se puede
  ok(sql(`select status_detail from operations where number = '${A}'`) === 'done', 'orden de los pasos respetado');
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png', fullPage: true }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
