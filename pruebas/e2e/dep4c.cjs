// 4ec · Deporte: «Membresías y contrato» (contrato, lo que cuesta salirse, mensualidad, inscripción, pase, primera visita gratis, guardería)
// y «Liga e inscripciones» (cuota por equipo, depósito, inscripción hasta, lugares, sueltos), la tarjeta y los filtros, el check «sin
// contrato = $0» en la base y el Super Admin 360.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', NEG = 'power-gym-hzl', LIGA = 'liga-latina-futbol';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const ve = (l) => l.first().waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const tj = (n = NEG) => JSON.parse(sql(`select coalesce(category_attrs->'tarjeta', '{}') from businesses where id = '${n}'`));
const fv = (n = NEG) => sql(`select filter_values from businesses where id = '${n}'`);
const espera = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
(async () => {
  // Punto de partida conocido.
  sql(`update insc_settings set contract_m = 0, cancel_fee_cents = 0, signup_cents = 0, childcare = true, esp = true, derived_on = null where business_id = '${NEG}'`);
  sql(`update items set price_cents = 2500 where business_id = '${NEG}' and svc_kind = 'mes'`); sql(`update items set price_cents = 1000 where business_id = '${NEG}' and name->>'es' = 'Pase de un día'`);
  sql(`update items set price_cents = 45000, deposit_cents = 10000 where business_id = '${LIGA}' and svc_kind = 'curso'`);
  sql(`update class_groups set seats_total = seats_outside + seats_booked + 4 where item_id in (select id from items where business_id = '${LIGA}' and svc_kind = 'curso')`);
  sql(`update insc_settings set free_agents = false, derived_on = null where rubro = 'dep'`);
  barrer();
  ok(sql(`select coalesce(last_error, 'ok') from system_jobs where name = 'barrido.deporte' and last_run_at > now() - interval '1 minute'`) === 'ok', 'la tarea «deporte» corre en el barrido central');
  let f = fv(); ok(/sincontrato/.test(f) && /guarderia/.test(f) && /gratis1/.test(f) && /membresia/.test(f) && /visita/.test(f) && /24h/.test(f), `filtros derivados (24h se conserva): ${f}`);
  ok(tj().eta?.es === 'Sin contrato · cancela cuando quieras' && tj().fee?.es === '$25 al mes · sin cuota de inscripción', `tarjeta: ${tj().eta?.es} | ${tj().fee?.es}`);
  ok(tj('cuerpo-en-balance').eta?.es === 'Contrato de 6 meses · cancelar antes cuesta $50' && !/sincontrato/.test(fv('cuerpo-en-balance')), `con contrato: ${tj('cuerpo-en-balance').eta?.es}`);
  ok(/^Inscripción de equipos hasta el \d+ \w+$/.test(tj(LIGA).eta?.es ?? '') && tj(LIGA).fee?.es === '$450 por equipo · depósito $100', `liga: ${tj(LIGA).eta?.es} | ${tj(LIGA).fee?.es}`);
  ok(/visita/.test(fv('hazleton-bowl')), 'un lugar de visita (sin herramienta) conserva sus filtros');
  // La base no deja «sin contrato» con penalidad.
  let mal = false; try { sql(`update insc_settings set contract_m = 0, cancel_fee_cents = 5000 where business_id = '${NEG}'`); } catch { mal = true; } ok(mal, 'la base no deja «sin contrato» con penalidad (check)');

  const b = await chromium.launch(); const err = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => err.push(e.message));
  await entrar(p, '5705550411');
  await p.goto(`${B}/panel/${NEG}/vendes`);
  const fila = await vis(p.getByText('Membresías y contrato', { exact: true })); ok(!!fila, 'Lo que vendes › «Membresías y contrato»');
  await fila.click(); await p.getByText('CONTRATO', { exact: true }).first().waitFor();
  ok(await ve(p.getByText('Solo se cobra la membresía')), 'reglas con candado');
  await p.screenshot({ path: OUT + 'd4c-membresia-m.png', fullPage: true });
  // Contrato de 12 meses → ya no es «sin contrato»; lo que cuesta salirse se dice.
  await clic(p.getByRole('button', { name: '12 meses', exact: true }));
  ok(await espera(() => sql(`select contract_m from insc_settings where business_id = '${NEG}'`) === '12' && !/sincontrato/.test(fv())), 'contrato de 12 meses → sin el filtro «sin contrato»');
  await clic(p.getByRole('button', { name: 'Cancelar antes de tiempo cuesta +' }));
  ok(await espera(() => tj().eta?.es === 'Contrato de 12 meses · cancelar antes cuesta $10'), `la tarjeta dice el contrato y lo que cuesta: ${tj().eta?.es}`);
  await clic(p.getByRole('button', { name: 'Sin contrato', exact: true }));
  ok(await espera(() => sql(`select contract_m || ':' || cancel_fee_cents from insc_settings where business_id = '${NEG}'`) === '0:0' && /sincontrato/.test(fv())), 'sin contrato → salirse vuelve a $0 y vuelve el filtro');
  // Mensualidad, inscripción y pase: los precios son los del ítem.
  await clic(p.getByRole('button', { name: 'Mensualidad +' }));
  await clic(p.getByRole('button', { name: 'Cuota de inscripción +' }));
  ok(await espera(() => tj().fee?.es === '$26 al mes · inscripción $5'), `mensualidad e inscripción: ${tj().fee?.es}`);
  ok(sql(`select price_cents from items where business_id = '${NEG}' and svc_kind = 'mes'`) === '2600', 'la mensualidad vive en el ítem (una sola fuente)');
  await clic(p.getByRole('button', { name: 'Pase de un día +' }));
  ok(await espera(() => sql(`select price_cents from items where business_id = '${NEG}' and name->>'es' = 'Pase de un día'`) === '1100'), 'pase de un día $11');
  await clic(p.getByRole('switch', { name: 'Primera visita gratis' }));
  ok(await espera(() => !/gratis1/.test(fv())), 'sin primera visita gratis → sin el filtro');
  await clic(p.getByRole('switch', { name: 'Primera visita gratis' }));
  ok(await espera(() => /gratis1/.test(fv())), 'primera visita gratis otra vez');

  // Liga e inscripciones (Anthony también administra la liga en esta prueba).
  sql(`insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select '${LIGA}', u.id, 'owner', 'Anthony Guzmán', '{"es":"Prueba","en":"Test"}'::jsonb, 'active', false, '{all}', 2020, 9, true from users u where u.phone = '+15705550411' and not exists (select 1 from business_members m where m.business_id = '${LIGA}' and m.user_id = u.id)`);
  await p.goto(`${B}/panel/${LIGA}/vendes/herramienta`); await p.getByText('Liga e inscripciones', { exact: true }).first().waitFor();
  await clic(p.getByRole('button', { name: 'Cuota del equipo · temporada +' }));
  ok(await espera(() => tj(LIGA).fee?.es === '$460 por equipo · depósito $100'), `cuota por equipo: ${tj(LIGA).fee?.es}`);
  await clic(p.getByRole('button', { name: 'Depósito que aparta el lugar −' }));
  ok(await espera(() => sql(`select deposit_cents from items where business_id = '${LIGA}' and svc_kind = 'curso'`) === '9000'), 'depósito $90 (en el ítem)');
  for (let i = 0; i < 4; i++) { await clic(p.getByRole('button', { name: 'Equipos que faltan −' })); await espera(() => false, 600); }
  ok(await espera(() => tj(LIGA).eta?.es === 'Liga llena · lista de espera'), `sin lugares: ${tj(LIGA).eta?.es}`);
  await clic(p.getByRole('switch', { name: 'Aceptas jugadores sueltos' }));
  ok(await espera(() => sql(`select free_agents from insc_settings where business_id = '${LIGA}'`) === 't'), 'acepta jugadores sueltos');
  await p.screenshot({ path: OUT + 'd4c-liga-m.png', fullPage: true });

  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); ad.on('pageerror', (e) => err.push(e.message));
  await entrar(ad, '5705550199'); await ad.goto(`${B}/admin/negocios/${NEG}?tab=vende`);
  ok(await ve(ad.getByText('MEMBRESÍAS Y CONTRATO · SOLO LECTURA')) && await ve(ad.getByText('Sin contrato: cancelas cuando quieras')), 'Super Admin 360: membresía y contrato en solo lectura');
  await ad.screenshot({ path: OUT + 'd4c-admin-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK dep4c');
})().catch((e) => { console.error(e); process.exit(1); });
