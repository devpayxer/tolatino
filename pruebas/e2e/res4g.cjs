// 4g-1 · Reseña de Hogar y Auto: verificada con la visita/cita, dato de la visita (no se edita), preguntas por rubro,
// ≤2 ★ → Ayuda con la visita, y los chips en la tarjeta de la ficha.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', H = 'plomeria-rodriguez', A = 'taller-hermanos-pena';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const MARISOL = "(select id from users where phone = '+15705550122')";
(async () => {
  sql(`update reviews set status = 'removed' where user_id = ${MARISOL} and business_id in ('${H}', '${A}') and status <> 'removed'`);
  sql(`select reviews_stats('${H}'); select reviews_stats('${A}')`);
  const CH = sql(`select o.number from operations o where o.user_id = ${MARISOL} and o.business_id = '${H}' and o.kind = 'appointment' and o.status = 'done' and exists (select 1 from estimate_lines l where l.operation_id = o.id and l.decision = 'ok') and exists (select 1 from operation_events e where e.operation_id = o.id and e.kind = 'arrived') order by o.id desc limit 1`);
  const CA = sql(`select o.number from operations o where o.user_id = ${MARISOL} and o.business_id = '${A}' and o.kind = 'appointment' and o.status = 'done' and exists (select 1 from estimate_lines l where l.operation_id = o.id and l.decision = 'ok') order by o.id desc limit 1`);
  ok(!!CH && !!CA, `visitas terminadas: ${CH} (hogar) y ${CA} (auto)`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  // ── Hogar: 2 ★ ──
  await m.goto(B + `/n/${H}/resena?pedido=${CH}&e=2`); await m.getByText('TU VISITA · DATO DE LA VISITA').first().waitFor();
  ok(!!(await vis(m.getByText(new RegExp(`^Visita ${CH}`)))) && !!(await vis(m.getByText('VERIFICADA').first())), 'sobre qué visita: la visita verificada');
  ok(!!(await vis(m.getByText(/^(En la franja|\d+ min tarde)$/))), 'dato: llegó (de «Llegué» contra la franja)');
  ok(!!(await vis(m.getByText(/ · lo cotizado$/))), 'dato: cobrado = lo cotizado');
  ok(!!(await vis(m.getByText('LO QUE IMPORTA EN EL HOGAR'))) && !!(await vis(m.getByText('¿QUEDÓ BIEN A LA PRIMERA?'))) && !!(await vis(m.getByText('¿CUIDÓ TU CASA?'))), 'preguntas del hogar');
  ok(!(await vis(m.getByText('¿COBRÓ LO QUE DIJO?'))), 'con visita no pregunta el precio (sale del dato)');
  ok(!!(await vis(m.getByText(/La reseña no devuelve dinero ni pide que vuelvan/))) && !!(await vis(m.getByRole('button', { name: 'Ir a Ayuda con la visita' }))), '≤2 ★: la reseña no devuelve dinero · Ir a Ayuda con la visita');
  const grupo = async (k, l) => clic(m.getByText(k, { exact: true }).locator('..').getByRole('button', { name: l, exact: true }));
  await grupo('¿QUEDÓ BIEN A LA PRIMERA?', 'Tuvo que volver'); await grupo('¿CUIDÓ TU CASA?', 'Sí'); await grupo('TRATO Y EXPLICACIÓN', 'Te explicó todo');
  await (await vis(m.getByLabel('Tu reseña'))).fill('Vino a cambiar la válvula; a los dos días goteó otra vez y tuvo que volver, pero lo dejó bien.');
  await m.screenshot({ path: OUT + 'v1-resena-hogar-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: /^Publicar/ })); await m.waitForURL(/\/resena\/tuya/);
  const r1 = sql(`select r.src || '|' || r.answers::text || '|' || r.facts::text from reviews r where r.user_id = ${MARISOL} and r.business_id = '${H}' and r.status <> 'removed'`);
  ok(/^cita\|/.test(r1) && /"first": 0/.test(r1) && /"care": 1/.test(r1) && /"trato": 1/.test(r1) && !/"precio"/.test(r1), `respuestas guardadas (${r1.split('|')[1]})`);
  ok(/"ok": \d+/.test(r1) && /"cob": \d+/.test(r1) && /"win": \d+/.test(r1), `dato guardado del servidor (${r1.split('|')[2]})`);
  await m.goto(B + `/n/${H}?tab=rev`); await m.getByText('Tuvo que volver').first().waitFor();
  ok(!!(await vis(m.getByText('Cobró lo cotizado').first())) && !!(await vis(m.getByText(/^(Llegó en la franja|Llegó \d+ min tarde)$/).first())), 'tarjeta: llegó · cobró lo cotizado · tuvo que volver');
  await m.screenshot({ path: OUT + 'v2-tarjeta-hogar-m.png', fullPage: true });
  // ── Auto: 5 ★ ──
  await m.goto(B + `/n/${A}/resena?pedido=${CA}&e=5`); await m.getByText('TU CITA · DATO DE LA CITA').first().waitFor();
  ok(!!(await vis(m.getByText(/ · lo del estimado$/))) && !!(await vis(m.getByText('¿PIDIERON TU OK ANTES DE ALGO EXTRA?'))) && !!(await vis(m.getByText('¿TE ENSEÑARON LA PIEZA VIEJA?'))), 'auto: dato de la cita y preguntas de autos');
  ok(!(await vis(m.getByText(/La reseña no devuelve dinero/))), '5 ★: sin el aviso de Ayuda');
  await grupo('¿PIDIERON TU OK ANTES DE ALGO EXTRA?', 'Sí'); await grupo('¿TE ENSEÑARON LA PIEZA VIEJA?', 'Sí'); await grupo('¿TE DEVOLVIERON EL CARRO LIMPIO?', 'Sí');
  await (await vis(m.getByLabel('Tu reseña'))).fill('Me explicaron el estimado línea por línea y me enseñaron las pastillas viejas. Muy serios.');
  await m.screenshot({ path: OUT + 'v3-resena-auto-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: /^Publicar/ })); await m.waitForURL(/\/resena\/tuya/);
  const r2 = sql(`select r.answers::text from reviews r where r.user_id = ${MARISOL} and r.business_id = '${A}' and r.status <> 'removed'`);
  ok(/"ask": 1/.test(r2) && /"part": 1/.test(r2) && /"carro": 1/.test(r2) && !/"clean"/.test(r2), `auto: respuestas (${r2})`);
  await m.goto(B + `/n/${A}?tab=rev`); await m.getByText('Le enseñaron la pieza vieja').first().waitFor(); ok(!!(await vis(m.getByText('Cobró lo del estimado').first())), 'tarjeta auto: pidieron su OK · pieza vieja · lo del estimado');
  // Comida no cambia: un visitante de un restaurante sigue con sabor/temperatura.
  await m.goto(B + `/n/sabor-dominicano/resena`); await m.getByText('LO QUE IMPORTA EN LA COMIDA').waitFor().catch(() => {});
  ok(!!(await vis(m.getByText('LO QUE IMPORTA EN LA COMIDA'))) || !!(await vis(m.getByText(/Editar reseña/))), 'comida: sin cambios');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK res4g');
})().catch((e) => { console.error(e); process.exit(1); });
