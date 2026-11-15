// 9n-20 · «Ver como cliente» de un negocio no activo (LAUNCH L147): un negocio propio de la corrida, oculto. El Admin lo abre desde su 360° → la ficha
// sale con «VISTA DEL EQUIPO · OCULTO», queda en la auditoría y no cuenta como vista; sin sesión del equipo (vecino o sin cuenta) la misma dirección es
// 404, con ?equipo=1 o sin él; un negocio activo sale como siempre (sin aviso). Escritorio 1360 y teléfono 390.
// Precondiciones propias: el negocio lo crea la prueba (negocioSinDueno) y al terminar queda «closed» (nada se borra).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, negocioSinDueno } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const ADM = '5705550199', VEC = '5705550122';
(async () => {
  const neg = negocioSinDueno('bufete-almonte', 'Oculto');
  const A = sql(`select id from users where phone = '+1${ADM}'`);
  sql(`update businesses set status = 'hidden', status_reason = 'Prueba neg9n20', status_by = '${A}', status_at = now() where id = '${neg.id}'`);
  const b = await chromium.launch(); const abiertas = [];
  try {
    console.log('1 · El equipo lo ve «como cliente» con su aviso; queda en la auditoría y no cuenta como vista');
    const ca = await b.newContext({ viewport: { width: 1360, height: 900 } }), pa = await ca.newPage(); abiertas.push(ca); await entrarComo(pa, ADM);
    await pa.goto(B + `/admin/negocios/${neg.id}`); await pa.waitForLoadState('networkidle');
    ok((await texto(pa)).includes('Ver como cliente'), 'el 360° de un negocio oculto ofrece «Ver como cliente»');
    const A0 = +sql(`select count(*) from audit_entries where action = 'negocio.ver_como_cliente' and target_id = '${neg.id}'`);
    const V0 = +sql(`select coalesce(sum(n), 0) from business_views_daily where business_id = '${neg.id}'`);
    const r = await pa.goto(B + `/n/${neg.id}?equipo=1`);
    ok(r.status() === 200 && (await texto(pa)).includes('VISTA DEL EQUIPO · OCULTO') && (await texto(pa)).includes(neg.nombre), 'la ficha sale con «VISTA DEL EQUIPO · OCULTO»');
    await pa.screenshot({ path: OUT + 'n9n20-equipo-1360.png', fullPage: false });
    ok(+sql(`select count(*) from audit_entries where action = 'negocio.ver_como_cliente' and target_id = '${neg.id}' and actor_id = '${A}'`) === A0 + 1, 'en la auditoría, con quién');
    await new Promise((x) => setTimeout(x, 1500));
    ok(+sql(`select coalesce(sum(n), 0) from business_views_daily where business_id = '${neg.id}'`) === V0, 'no cuenta como vista del negocio');
    const rs = await pa.goto(B + `/n/${neg.id}`);
    ok(rs.status() === 404, 'sin ?equipo=1, ni el equipo la ve como si estuviera activa (404)');

    console.log('2 · Sin sesión del equipo es 404 (con o sin ?equipo=1)');
    const cv = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), pv = await cv.newPage(); abiertas.push(cv);
    ok((await pv.goto(B + `/n/${neg.id}?equipo=1`)).status() === 404, 'sin cuenta: 404');
    await entrarComo(pv, VEC);
    ok((await pv.goto(B + `/n/${neg.id}?equipo=1`)).status() === 404 && !(await texto(pv)).includes('VISTA DEL EQUIPO'), 'un vecino con sesión: 404, sin aviso');

    console.log('3 · Un negocio activo sale como siempre');
    sql(`update businesses set status = 'active', status_reason = 'Prueba neg9n20', status_at = now() where id = '${neg.id}'`);
    const ra = await pv.goto(B + `/n/${neg.id}?equipo=1`);
    ok(ra.status() === 200 && !(await texto(pv)).includes('VISTA DEL EQUIPO'), 'activo: la ficha de siempre, sin aviso (aunque traiga ?equipo=1)');
    await pv.screenshot({ path: OUT + 'n9n20-activo-390.png', fullPage: false });
    console.log(`\n${n} ✓ · neg9n20`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
    sql(`update businesses set status = 'closed', status_reason = 'Fin de la prueba neg9n20', status_at = now() where id = '${neg.id}'`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
