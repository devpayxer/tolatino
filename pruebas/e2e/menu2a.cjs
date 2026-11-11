const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', P = '/panel/sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const t = (p, x) => p.getByText(x, { exact: true }).last();
const shot = async (p, n, full = true) => { await p.waitForTimeout(500); await p.screenshot({ path: OUT + n, fullPage: full }); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(a, 'dueño-d'); await entrar(a, '5705550133');
  await a.goto(B + P + '/vendes'); await a.getByText('Lo que vendes', { exact: true }).first().waitFor(); await shot(a, 'p1-vendes-d.png');
  await a.goto(B + P + '/vendes/menu'); await a.getByText('LA BANDERA').first().waitFor().catch(() => {}); await a.getByText('La bandera', { exact: true }).first().waitFor(); await shot(a, 'p2-platos-d.png');
  for (const [k, n] of [['Categorías', 'p3-categorias-d.png'], ['Opciones', 'p4-opciones-d.png'], ['Inventario', 'p5-inventario-d.png'], ['Horarios', 'p6-horarios-d.png']]) { await a.getByRole('tab', { name: new RegExp(k, 'i') }).click(); await a.waitForTimeout(400); await shot(a, n); }
  await a.getByRole('tab', { name: /Platos/i }).click(); await a.getByText('La bandera', { exact: true }).first().click(); await a.getByText('ASÍ SE VE EN TU MENÚ', { exact: true }).waitFor(); await shot(a, 'p7-plato-d.png');
  console.log('errores:', err.length ? err : 'ninguno'); await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
