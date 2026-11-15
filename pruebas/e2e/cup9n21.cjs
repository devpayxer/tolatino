// 9n-21 · Cupón para seguidores (LAUNCH L311; diseño: Novedades «Cupón para seguidores» y el pago con «Código de cupón»). En Sabor Dominicano: el dueño
// crea el cupón (se arma en la base como lo deja el editor, y el editor lo muestra); un vecino que NO sigue ve «SOLO PARA SEGUIDORES»; sigue y ve el
// código; en el pago, con menos del mínimo el servidor dice el mínimo; con el mínimo, «APLICADO» y la línea «Cupón CODE −$3.00»; el pedido guarda el
// descuento, el impuesto sobre lo que queda, el total y el uso; el panel del negocio lo dice; un segundo uso no entra («Ya usaste este cupón»); otro
// vecino que no sigue no lo puede usar aunque sepa el código; si el pedido se cancela, el uso vuelve. Teléfono 390 (vecino) y escritorio 1360 (panel).
// Precondiciones propias: el cupón y los pedidos son de esta corrida; el negocio abierto todo el día mientras corre (vuelve a su horario al terminar).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, abiertoTodoElDia } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 250)); } return false; };
const BIZ = 'sabor-dominicano', DUENO = '5705550133', MARI = '5705550122', OTRO = '5705550141';
const RUN = Date.now().toString(36).toUpperCase().slice(-5), CODE = `SEG${RUN}`;
const money = (c) => `$${(c / 100).toFixed(2)}`;
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);

(async () => {
  const volver = abiertoTodoElDia(BIZ);
  const item = sql(`select id || '|' || price_cents || '|' || tax_pct from items where business_id = '${BIZ}' and removed_at is null and status = 'live' and price_cents between 500 and 3000 order by id limit 1`).split('|');
  const [IT, PRECIO] = [item[0], Number(item[1])];
  const MIN = Math.ceil((PRECIO * 2) / 100) * 100 - 100; // dos platos llegan al mínimo, uno no
  ok(PRECIO < MIN && PRECIO * 2 >= MIN && MIN >= 400, `precondición: el plato ${IT} cuesta ${money(PRECIO)}; mínimo ${money(MIN)} (uno no llega, dos sí)`);
  const M0 = uid(MARI);
  sql(`delete from follows where follower_user_id = '${M0}' and target_kind = 'business' and target_id = '${BIZ}'`);
  const post = sql(`insert into business_posts (business_id, city_id, kind, title, body, coupon_code, coupon_off_cents, coupon_min_cents, coupon_uses, ends_at, created_by)
    select '${BIZ}', city_id, 'cupon', 'Para quienes nos siguen', '$3 menos en pedidos de ${money(MIN)} o más.', '${CODE}', 300, ${MIN}, 5, now() + interval '1 day', '${uid(DUENO)}' from businesses where id = '${BIZ}' returning id`);
  const b = await chromium.launch(); const abiertas = [];
  const carrito = async (p, q) => { await p.goto(B + '/n/' + BIZ); await p.evaluate(([id, q]) => { localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id, ch: {}, q, nt: '', k: {} }] } })); localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' })); }, [IT, q]); };
  const aplicar = async (p, code) => { await p.getByLabel('Código de cupón').fill(code); await p.locator('[data-cupon]').getByRole('button', { name: 'Aplicar' }).click(); };
  try {
    console.log('1 · Sin seguir: «SOLO PARA SEGUIDORES»; al seguir, el código');
    const cm = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), m = await cm.newPage(); abiertas.push(cm);
    await entrarComo(m, MARI);
    await m.goto(B + `/n/${BIZ}?tab=nov`);
    ok(await espera(async () => (await m.locator(`[data-cupon="oculto"]`).count()) > 0), 'la novedad cupón sale con el código oculto');
    ok(!(await texto(m)).includes(CODE) && (await texto(m)).includes('SOLO PARA SEGUIDORES'), '«SOLO PARA SEGUIDORES» y el código no está en la página');
    await m.screenshot({ path: OUT + 'c9n21-oculto-390.png', fullPage: false });
    await m.locator('[data-cupon="oculto"]').getByRole('button', { name: 'Seguir para verlo' }).click();
    ok(await espera(async () => (await texto(m)).includes(CODE)), 'al seguir, el código se ve');
    ok(sql(`select count(*) from follows where follower_user_id = '${M0}' and target_kind = 'business' and target_id = '${BIZ}'`) === '1', 'y quedó siguiendo (la base)');

    console.log('2 · En el pago: el mínimo lo dice el servidor; con el mínimo, APLICADO y la línea del cupón');
    await carrito(m, 1); await m.goto(B + `/n/${BIZ}/pagar`); await m.locator('[data-cupon]').waitFor();
    await aplicar(m, CODE);
    ok(await espera(async () => (await texto(m)).includes(`Este cupón es para pedidos de ${money(MIN)} o más.`)), `un plato: «para pedidos de ${money(MIN)} o más»`);
    await carrito(m, 2); await m.goto(B + `/n/${BIZ}/pagar`); await m.locator('[data-cupon]').waitFor();
    await aplicar(m, CODE.toLowerCase());
    ok(await espera(async () => (await texto(m)).includes('−$3.00 · APLICADO')), 'dos platos (escrito en minúsculas): «−$3.00 · APLICADO»');
    ok((await texto(m)).includes(`Cupón ${CODE} −$3.00`), `la línea «Cupón ${CODE} −$3.00» en el resumen`);
    await m.screenshot({ path: OUT + 'c9n21-pago-390.png', fullPage: true });
    await m.locator('[data-screen-label="Checkout · barra"]').getByText(/^Enviar pedido/).click(); await m.waitForURL(/\/pedido\/\d+$/);
    const num = m.url().split('/').pop();
    const o = sql(`select subtotal_cents || '|' || discount_cents || '|' || tax_cents || '|' || total_cents from operations where number = '${num}'`).split('|').map(Number);
    const taxBase = Number(sql(`select round(${PRECIO * 2} * tax_pct / 100.0) from items where id = ${IT}`));
    ok(o[0] === PRECIO * 2 && o[1] === 300 && o[2] === Math.round((taxBase * (o[0] - 300)) / o[0]) && o[3] === o[0] - 300 + o[2], `pedido #${num}: subtotal ${money(o[0])}, cupón −$3.00, impuesto sobre lo que queda (${money(o[2])}), total ${money(o[3])}`);
    ok(sql(`select status || '|' || off_cents || '|' || code from follower_coupon_uses where operation_id = (select id from operations where number = '${num}')`) === `usado|300|${CODE}`, 'el uso queda anotado (usado, $3.00, el código)');
    ok((await texto(m)).includes(`Cupón ${CODE} −$3.00`), 'la página del pedido muestra el cupón');

    console.log('3 · El negocio lo ve en su pedido');
    const cd = await b.newContext({ viewport: { width: 1360, height: 900 } }), d = await cd.newPage(); abiertas.push(cd); await entrarComo(d, DUENO);
    await d.goto(B + `/panel/${BIZ}/hoy?det=ped:${num}`);
    ok(await espera(async () => (await texto(d)).includes(`cupón ${CODE} −$3.00`)), 'el detalle del pedido en el panel dice «cupón CODE −$3.00»');
    await d.screenshot({ path: OUT + 'c9n21-panel-1360.png', fullPage: false });

    console.log('4 · Una vez por persona; otro vecino que no sigue no lo puede usar');
    await carrito(m, 2); await m.goto(B + `/n/${BIZ}/pagar`); await m.locator('[data-cupon]').waitFor(); await aplicar(m, CODE);
    ok(await espera(async () => (await texto(m)).includes('Ya usaste este cupón.')), '«Ya usaste este cupón.»');
    const co = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), h = await co.newPage(); abiertas.push(co);
    await entrarComo(h, OTRO);
    sql(`delete from follows where follower_user_id = '${uid(OTRO)}' and target_kind = 'business' and target_id = '${BIZ}'`);
    await carrito(h, 2); await h.goto(B + `/n/${BIZ}/pagar`); await h.locator('[data-cupon]').waitFor(); await aplicar(h, CODE);
    ok(await espera(async () => (await texto(h)).includes('Este cupón es para quienes siguen al negocio.')), 'sin seguir, aunque sepa el código: «es para quienes siguen al negocio»');

    console.log('5 · Si el pedido no sigue, el uso vuelve');
    sql(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now() where number = '${num}'`);
    ok(sql(`select status from follower_coupon_uses where operation_id = (select id from operations where number = '${num}')`) === 'devuelto', 'cancelado: el uso queda «devuelto» (trigger)');
    await carrito(m, 2); await m.goto(B + `/n/${BIZ}/pagar`); await m.locator('[data-cupon]').waitFor(); await aplicar(m, CODE);
    ok(await espera(async () => (await texto(m)).includes('−$3.00 · APLICADO')), 'y se puede usar otra vez');
    console.log(`\n${n} ✓ · cup9n21`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
    sql(`update business_posts set status = 'stopped', stopped_at = now() where id = ${post}`);
    volver();
  }
})().catch((e) => { console.error(e); process.exit(1); });
