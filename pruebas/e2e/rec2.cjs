const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 1j · Reclamo con código: un vecino reclama un negocio sin dueño por un código al teléfono del negocio y el equipo lo aplica.
// 9b-1 · Con sus propios datos: antes reclamaba `sabor-dominicano` (de la semilla) con Pedro (0133) y le cambiaba el dueño a toda la base; la
// segunda vez ya tenía dueño y no salía «Mandarme el código». Ahora reclama un negocio sin dueño hecho para la corrida, con un vecino nuevo.
const { chromium } = require('playwright');
const { negocioSinDueno, entrarComo, telLibre, sql } = require('../lib/negocio-nuevo.cjs');
const B = 'http://localhost:3100';
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); if (!a.codigoPrueba) throw new Error('sin código ' + JSON.stringify(a)); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const t = (p, x) => p.getByText(x, { exact: true }).last();
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓ ' + m); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const NEG = negocioSinDueno('sabor-dominicano', 'Fonda Reclamo'), TEL = telLibre();
  const p = await (await b.newContext({ viewport: { width: 393, height: 852 } })).newPage(); p.on('pageerror', (e) => err.push(e.message)); await entrarComo(p, TEL, { nombre: 'Rafael', apellido: 'Reclamo' });
  await p.goto(B + '/recuperar/' + NEG.id); await t(p, 'Mandarme el código').click(); await p.locator('[data-modo-pruebas] b').waitFor();
  const cod = (await p.locator('[data-modo-pruebas] b').textContent()).trim(); await p.locator('input[placeholder="000000"]').fill(cod); await t(p, 'Verificar').click(); await p.locator('text=Lo estamos revisando').first().waitFor();
  ok(true, 'el vecino reclama con el código del teléfono del negocio: «Lo estamos revisando»');
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); a.on('pageerror', (e) => err.push(e.message)); await entrar(a, '5705550199');
  await a.goto(B + '/admin/colas?cola=cambio'); await a.getByText('Reclamo · ' + NEG.nombre, { exact: true }).first().click(); await a.locator('text=EVIDENCIAS').waitFor();
  await t(a, 'Aplicar cambio').click(); await a.locator('textarea').fill('Código correcto'); await t(a, 'Aplicar').click(); await a.locator('text=Cambio aplicado. Ya es el dueño.').waitFor();
  ok(sql(`select count(*) from businesses b join users u on u.id = b.owner_user_id where b.id = '${NEG.id}' and u.phone = '+1${TEL}'`) === '1', 'el equipo aplica el cambio: ya es el dueño');
  const au = sql(`select before::text || ' -> ' || after::text from audit_entries where action = 'negocio.dueno.cambiar' and target_id = '${NEG.id}' order by at desc limit 1`);
  ok(au.includes('sin dueño'), `auditoría: ${au}`);
  ok(!err.length, 'sin errores en la página: ' + (err.join(' · ') || 'ninguno'));
  await b.close();
})().catch((e) => { console.error('FALLO', e.message.split('\n').slice(0, 3).join(' | ')); process.exit(1); });
