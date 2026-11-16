// C-007 · La ficha nueva reemplaza la página del negocio de los Pro (cambios.md · paquete C-005 → C-008); Free sigue con la de siempre.
// El interruptor vive en Super Admin › Sistema › Configuración › «Ficha nueva para los negocios Pro» (ficha_nueva_pro, 0170): el Super Admin
// lo pone en 0 con motivo (queda en la auditoría) y los Pro vuelven a la ficha de siempre en teléfono y computadora; en 1, vuelve la nueva.
// Precondición propia: el interruptor empieza en 1 (de fábrica) y la prueba lo deja como estaba.
const ENT = require('../lib/entorno.cjs');
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 32; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const PRO = ['barberia-el-primo', 'centro-medico-quisqueya', 'sabor-dominicano'];
const LABEL = 'Ficha nueva para los negocios Pro';
const V = () => sql(`select cfg_int('ficha_nueva_pro')`);

(async () => {
  const antes = sql(`select coalesce((select value::text from platform_config where key = 'ficha_nueva_pro'), '-')`);
  const FREE = sql(`select b.id from businesses b join business_stats_cache s on s.business_id = b.id where s.plan = 'free' and b.status = 'active' and b.category_id = 'NEG-BELL' order by b.id limit 1`);
  for (const id of PRO) ok(sql(`select s.plan from business_stats_cache s where s.business_id = '${id}'`) === 'pro', `precondición: ${id} es Pro`);
  if (V() !== '1') sql(`delete from platform_config where key = 'ficha_nueva_pro'`);
  ok(V() === '1' && !!FREE, `precondición: el interruptor en 1 (de fábrica) y un Free (${FREE})`);
  const b = await chromium.launch(); const abiertas = [];
  try {
    const cm = await b.newContext({ ...devices['iPhone 13'] }), cd = await b.newContext({ viewport: { width: 1360, height: 900 } }), ca = await b.newContext({ viewport: { width: 1360, height: 900 } });
    abiertas.push(cm, cd, ca); const m = await cm.newPage(), d = await cd.newPage(), ad = await ca.newPage();
    const nueva = async (p, id) => { await p.goto(B + `/n/${id}`); await p.locator('[data-pantalla="APP-NEG-LISTING"]').first().waitFor(); return (await p.locator('[data-ficha="nueva"]').count()) > 0; };

    console.log('1 · Encendido (de fábrica): los Pro con la ficha nueva; Free con la de siempre');
    for (const id of PRO) { ok(await nueva(m, id), `teléfono ${id}: ficha nueva`); ok(await nueva(d, id), `computadora ${id}: ficha nueva`); }
    ok(!(await nueva(m, FREE)) && !(await nueva(d, FREE)), `Free ${FREE}: la de siempre en teléfono y computadora`);

    console.log('2 · Super Admin › Configuración: el interruptor en 0 con motivo');
    await entrar(ad, '5705550199');
    const cambiar = async (v) => {
      await ad.goto(B + '/admin/sistema/configuracion'); await clic(ad.getByText(LABEL, { exact: true }));
      const f = await vis(ad.locator('input[aria-label^="VALOR NUEVO"]')); await f.fill(String(v));
      await clic(ad.getByText('Ajuste con datos reales', { exact: true })); await clic(ad.getByRole('button', { name: 'Guardar', exact: true }).last());
    };
    await ad.goto(B + '/admin/sistema/configuracion');
    ok(await espera(async () => (await ad.innerText('body')).includes('NEGOCIOS · LA PÁGINA DEL NEGOCIO') && (await ad.innerText('body')).includes(LABEL)), 'Configuración: la sección Negocios con el interruptor');
    const a0 = Number(sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id = 'ficha_nueva_pro'`));
    await cambiar(0);
    ok(await espera(() => V() === '0'), 'ficha_nueva_pro = 0 guardado');
    ok(Number(sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id = 'ficha_nueva_pro'`)) === a0 + 1, 'el cambio queda en la auditoría');
    await ad.screenshot({ path: OUT + 'fic007-config-1360.png' });
    for (const id of PRO) ok(await espera(async () => !(await nueva(m, id)), 20000) && !(await nueva(d, id)), `apagado: ${id} vuelve a la ficha de siempre (teléfono y computadora)`);

    console.log('3 · Otra vez en 1: vuelve la ficha nueva');
    await cambiar(1);
    ok(await espera(() => V() === '1'), 'ficha_nueva_pro = 1 guardado');
    for (const id of PRO) ok(await espera(async () => nueva(m, id), 20000) && await nueva(d, id), `encendido: ${id} con la ficha nueva`);
    ok(!(await nueva(m, FREE)), `Free ${FREE}: sigue con la de siempre`);
    console.log(`\n${n} ✓ · fic007`);
  } finally {
    try { if (antes === '-') sql(`delete from platform_config where key = 'ficha_nueva_pro'`); else sql(`update platform_config set value = '${antes}'::jsonb where key = 'ficha_nueva_pro'`); } catch (e) { console.error('interruptor:', e.message); }
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
