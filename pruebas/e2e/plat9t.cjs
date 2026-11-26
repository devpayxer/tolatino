// 9t · Platos guardados (decisión del fundador del 19 nov sobre REVISION «Guardar un plato»; LAUNCH «Platos guardados»). A 390 y a 1360, ES y EN.
// 1 · Sin sesión, el corazón de la hoja del plato (a la izquierda del contador) lleva a /entrar y de vuelta a la hoja de ESE plato.
// 2 · Con una cuenta nueva: el corazón guarda (fila viva en item_saves, aria-pressed true); al recargar la ficha sigue marcado (lo trae el servidor).
// 3 · Mi cuenta › Guardados › «Platos y productos · 1»: foto, plato, negocio en mayúsculas, precio de su ficha y «Pedir», que abre la hoja del plato.
// 4 · Quitar desde la hoja pone removed_at (la fila queda); volver a guardar crea una fila nueva viva.
// 5 · Un plato oculto por To'Latino: la lista dice «No disponible» sin precio ni «Pedir» y no se rompe; «Editar» → «Quitar» lo quita (removed_at).
// 6 · 1360: la ventana del plato con su corazón; la lista en escritorio. EN: «Save dish», «Dishes & products», «NOT AVAILABLE».
// 7 · Mercados y Tiendas (decisión del 19 nov): el mismo corazón en la hoja del producto de Supermercado La Cosecha («Pollo entero», por libra) y en la
//     del artículo de Boutique Yaritza («Cartera»), a la izquierda de la barra de la hoja; sin sesión a /entrar y de vuelta (?producto=); en la lista
//     «$X/lb» y la acción de su módulo («Pedir»/«Ver» el mercado, «Apartar» la tienda) que abre la hoja; un artículo oculto, «No disponible».
// Precondiciones propias: Sabor Dominicano Pro con «Mofongo de chicharrón» vivo y abierto todo el día (su horario vuelve como estaba al final); La
// Cosecha con «Pollo entero» y Boutique Yaritza con «Cartera» (Pro, vivos); una persona nueva con teléfono 555 libre. El plato y los productos
// vuelven a su estado. Las filas de item_saves son de esa persona nueva (nada se borra). Cuenta solo
// sus filas (corre barajada y dos veces seguidas).
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { botonesQueNoCaben } = require('../lib/caben.cjs');
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, telLibre } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `plat9t-${nom}.png`, fullPage: full });
const espera = async (f, ms = 15000, cada = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f().catch(() => false)) return true; await new Promise((r) => setTimeout(r, cada)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const BIZ = 'sabor-dominicano';
const tel390 = (b, extra = {}) => b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, ...extra });
const desk = (b, extra = {}) => b.newContext({ viewport: { width: 1360, height: 900 }, ...extra });
const corazon = (p) => p.locator('[role="dialog"]:visible [data-guardar-plato]');
const pulsado = async (p) => (await corazon(p).getAttribute('aria-pressed')) === 'true';

(async () => {
  // ── Precondiciones propias ──
  const plan0 = sql(`select plan from business_stats_cache where business_id = '${BIZ}'`);
  const MOF = sql(`select id from items where business_id = '${BIZ}' and module = 'menu' and name->>'es' = 'Mofongo de chicharrón'`);
  const st0 = MOF ? sql(`select status || '|' || coalesce(hidden_reason, '') from items where id = ${MOF}`) : '';
  const cents = MOF ? Number(sql(`select coalesce(oferta_precio(id, null), price_cents) from items where id = ${MOF}`)) : 0;
  const PRECIO = require('../lib/usd.cjs')(cents);
  const horas0 = sql(`select coalesce(json_agg(json_build_object('w', weekday, 'o', open, 'r', ranges)), '[]') from business_hours where business_id = '${BIZ}' and module = ''`);
  sql(`update business_hours set ranges = '[["00:00","00:00"]]'::jsonb, open = true where business_id = '${BIZ}' and module = ''`);
  if (MOF && st0 !== 'live|') sql(`update items set status = 'live', hidden_reason = null where id = ${MOF}`);
  ok(plan0 === 'pro' && MOF && cents > 0, `precondiciones: Sabor Dominicano Pro con «Mofongo de chicharrón» (${JSON.stringify({ plan0, MOF, cents })})`);
  const URL_PLATO = `${B}/n/${BIZ}?tab=menu&plato=${MOF}`;
  // 7 · Mercado y tienda.
  const MERC = 'supermercado-la-cosecha', TIEN = 'boutique-yaritza';
  const POLLO = sql(`select id from items where business_id = '${MERC}' and module = 'shop' and name->>'es' = 'Pollo entero' and shop_kind = 'peso'`);
  const CART = sql(`select id from items where business_id = '${TIEN}' and module = 'shop' and name->>'es' = 'Cartera'`);
  const pSt0 = POLLO ? sql(`select status || '|' || coalesce(hidden_reason, '') from items where id = ${POLLO}`) : '', cSt0 = CART ? sql(`select status || '|' || coalesce(hidden_reason, '') from items where id = ${CART}`) : '';
  if (POLLO && pSt0 !== 'live|') sql(`update items set status = 'live', hidden_reason = null where id = ${POLLO}`);
  if (CART && cSt0 !== 'live|') sql(`update items set status = 'live', hidden_reason = null where id = ${CART}`);
  const centsP = POLLO ? Number(sql(`select coalesce(oferta_precio(id, null), price_cents) from items where id = ${POLLO}`)) : 0, centsC = CART ? Number(sql(`select coalesce(oferta_precio(id, null), price_cents) from items where id = ${CART}`)) : 0;
  ok(POLLO && CART && sql(`select string_agg(coalesce(s.plan, 'free'), ',' order by b.id) from businesses b left join business_stats_cache s on s.business_id = b.id where b.id in ('${MERC}', '${TIEN}')`) === 'pro,pro',
    `precondiciones: La Cosecha con «Pollo entero» por libra y Boutique Yaritza con «Cartera», los dos Pro (${JSON.stringify({ POLLO, CART })})`);
  const URL_POLLO = `${B}/n/${MERC}?tab=svc&producto=${POLLO}`, URL_CART = `${B}/n/${TIEN}?tab=shop&producto=${CART}`;
  const V1 = telLibre();
  const b = await chromium.launch(), err = [], abiertas = [];
  const mirar = (p, k) => { p.on('pageerror', (e) => err.push(`${k}: ${e.message}`)); };
  let uid = '';
  const vivas = () => sql(`select count(*) from item_saves where user_id = '${uid}' and item_id = ${MOF} and removed_at is null`);
  const todas = () => sql(`select count(*) from item_saves where user_id = '${uid}' and item_id = ${MOF}`);
  try {
    // ── 1 · Sin sesión: el corazón lleva a entrar y de vuelta al plato ──
    const c0 = await tel390(b); abiertas.push(c0);
    const p0 = await c0.newPage(); mirar(p0, '390-sin-sesion');
    await p0.goto(URL_PLATO); await p0.waitForLoadState('networkidle').catch(() => {});
    ok(await espera(async () => corazon(p0).isVisible()), 'la hoja del plato trae el corazón');
    const caja = await p0.evaluate(() => {
      const h = document.querySelector('[role="dialog"] [data-guardar-plato]'), q = h?.nextElementSibling?.getBoundingClientRect(), a = h?.getBoundingClientRect();
      return a && q ? { w: Math.round(a.width), h: Math.round(a.height), izq: a.right <= q.left } : null;
    });
    ok(caja && caja.w === 44 && caja.h === 44 && caja.izq, `el cuadro del corazón (44 px, el objetivo táctil) va a la izquierda del contador (${JSON.stringify(caja)})`);
    ok((await corazon(p0).getAttribute('aria-label')) === 'Guardar plato' && !(await pulsado(p0)), 'ES: aria-label «Guardar plato», aria-pressed false');
    const malos0 = await botonesQueNoCaben(p0);
    ok(!malos0.length, `a 390 la barra de la hoja cabe (${malos0.join(' | ')})`);
    await shot(p0, '390-hoja-sin-sesion', false);
    await corazon(p0).click();
    ok(await espera(async () => new URL(p0.url()).pathname === '/entrar'), 'sin sesión, el corazón lleva a /entrar');
    const volver = new URL(p0.url()).searchParams.get('volver') || '';
    ok(volver === `/n/${BIZ}?tab=menu&plato=${MOF}`, `y vuelve a la hoja de ese plato (volver=${volver})`);

    // ── 2 · Con cuenta: guardar ──
    const c1 = await tel390(b); abiertas.push(c1);
    const p = await c1.newPage(); mirar(p, '390');
    await entrarComo(p, V1, { nombre: 'Plato', apellido: 'Prueba' });
    uid = sql(`select id from users where phone = '+1${V1}'`);
    ok(/^[0-9a-f-]{36}$/.test(uid), 'cuenta nueva');
    await p.goto(URL_PLATO); await p.waitForLoadState('networkidle').catch(() => {});
    ok(await espera(async () => corazon(p).isVisible()) && !(await pulsado(p)), 'la hoja abre con el corazón sin marcar');
    await corazon(p).click();
    ok(await espera(async () => pulsado(p)), 'al tocarlo queda marcado (aria-pressed true)');
    ok(await espera(async () => vivas() === '1'), 'item_saves: una fila viva de esa persona y ese plato');
    ok(sql(`select city_id from item_saves where user_id = '${uid}' and item_id = ${MOF} and removed_at is null`) === sql(`select city_id from businesses where id = '${BIZ}'`), 'con la ciudad del negocio');
    const fill = await corazon(p).locator('svg').getAttribute('fill');
    ok(/--tl-danger/.test(fill || ''), `el corazón se llena en rojo (${fill})`);
    await shot(p, '390-hoja-guardado', false);
    await p.reload(); await p.waitForLoadState('networkidle').catch(() => {});
    ok(await espera(async () => pulsado(p)), 'al recargar la ficha, el plato sigue marcado (el servidor lo trae)');

    // ── 3 · Mi cuenta › Guardados › Platos y productos ──
    await p.goto(B + '/cuenta/guardados'); await p.waitForLoadState('networkidle').catch(() => {});
    ok((await texto(p)).includes('Platos y productos · 1'), 'el chip «Platos y productos · 1»');
    await p.getByText('Platos y productos · 1').click();
    ok(await espera(async () => new URL(p.url()).searchParams.get('f') === 'items'), 'el chip lleva a ?f=items');
    await p.waitForLoadState('networkidle').catch(() => {});
    let tx = await texto(p);
    ok(tx.includes('Mofongo de chicharrón') && tx.includes('SABOR DOMINICANO') && tx.includes(PRECIO), `la fila: el plato, el negocio en mayúsculas y el precio de su ficha (${PRECIO})`);
    ok(await p.getByRole('button', { name: 'Pedir' }).isVisible(), 'y «Pedir»');
    await shot(p, '390-guardados-platos');
    await p.getByRole('button', { name: 'Pedir' }).click();
    ok(await espera(async () => new URL(p.url()).pathname === `/n/${BIZ}` && new URL(p.url()).searchParams.get('plato') === MOF), '«Pedir» abre el negocio en su menú con el plato');
    ok(await espera(async () => corazon(p).isVisible()), 'con la hoja del plato abierta');

    // ── 4 · Quitar y volver a guardar: nada se borra ──
    await corazon(p).click();
    ok(await espera(async () => !(await pulsado(p))), 'tocarlo otra vez lo quita (aria-pressed false)');
    ok(await espera(async () => vivas() === '0') && todas() === '1', 'quitar pone removed_at: la fila queda');
    await corazon(p).click();
    ok(await espera(async () => pulsado(p)), 'guardar otra vez');
    ok(await espera(async () => vivas() === '1') && todas() === '2', 'volver a guardar crea una fila nueva viva (la quitada se queda como estaba)');

    // ── 5 · Un plato oculto: «No disponible», sin «Pedir»; se puede quitar ──
    sql(`update items set status = 'hidden', hidden_reason = 'prueba plat9t' where id = ${MOF}`);
    await p.goto(B + '/cuenta/guardados?f=items'); await p.waitForLoadState('networkidle').catch(() => {});
    tx = await texto(p);
    ok(tx.includes('Mofongo de chicharrón') && /NO DISPONIBLE/i.test(tx) && tx.includes('No disponible por ahora en la página del negocio.'), 'un plato oculto sale con «No disponible» (la página no se rompe)');
    ok(!(await p.getByRole('button', { name: 'Pedir' }).count()) && !tx.includes(PRECIO), 'sin «Pedir» y sin precio');
    await shot(p, '390-guardados-no-disponible');
    await p.getByText('Editar', { exact: true }).click();
    ok(await espera(async () => p.getByRole('button', { name: 'Quitar' }).isVisible()), '«Editar» muestra «Quitar»');
    await p.getByRole('button', { name: 'Quitar' }).click();
    ok(await espera(async () => vivas() === '0') && todas() === '2', '«Quitar» desde Mi cuenta pone removed_at (aunque el plato no esté disponible)');
    ok(await espera(async () => (await texto(p)).includes('Sin platos guardados')), 'y la lista queda vacía: «Sin platos guardados»');
    ok((await texto(p)).includes('Guarda tus platos favoritos desde el menú de cada negocio.'), 'con su texto');
    await shot(p, '390-guardados-vacio');
    sql(`update items set status = 'live', hidden_reason = null where id = ${MOF}`);

    // ── 6 · 1360 y EN ──
    const c2 = await desk(b); abiertas.push(c2);
    const d = await c2.newPage(); mirar(d, '1360');
    await entrarComo(d, V1);
    await d.goto(URL_PLATO); await d.waitForLoadState('networkidle').catch(() => {});
    ok(await espera(async () => d.locator('[data-screen-label="Menú · plato · desktop"]').isVisible() && corazon(d).isVisible()), '1360: la ventana del plato con su corazón');
    ok(!(await pulsado(d)), '1360: sin marcar (se quitó)');
    await corazon(d).click();
    ok(await espera(async () => pulsado(d)) && await espera(async () => vivas() === '1'), '1360: guardar');
    await shot(d, '1360-ventana-guardado', false);
    await d.goto(B + '/cuenta/guardados?f=items'); await d.waitForLoadState('networkidle').catch(() => {});
    ok((await texto(d)).includes('Mofongo de chicharrón') && await d.getByRole('button', { name: 'Pedir' }).isVisible(), '1360: la lista con el plato y «Pedir»');
    await shot(d, '1360-guardados-platos');
    await c2.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await d.goto(B + '/cuenta/guardados?f=items'); await d.waitForLoadState('networkidle').catch(() => {});
    tx = await texto(d);
    ok(tx.includes('Dishes & products · 1') && await d.getByRole('button', { name: 'Order' }).isVisible(), 'EN: «Dishes & products · 1» y «Order»');
    sql(`update items set status = 'hidden', hidden_reason = 'prueba plat9t' where id = ${MOF}`);
    await d.reload(); await d.waitForLoadState('networkidle').catch(() => {});
    ok(/NOT AVAILABLE/i.test(await texto(d)) && !(await d.getByRole('button', { name: 'Order' }).count()), 'EN: «NOT AVAILABLE», sin «Order»');
    await shot(d, '1360-guardados-no-disponible-en');
    sql(`update items set status = 'live', hidden_reason = null where id = ${MOF}`);
    await d.goto(URL_PLATO); await d.waitForLoadState('networkidle').catch(() => {});
    ok(await espera(async () => corazon(d).isVisible()) && (await corazon(d).getAttribute('aria-label')) === 'Save dish' && await pulsado(d), 'EN: aria-label «Save dish», marcado');

    // ── 7 · Mercados y Tiendas ──
    const vivo = (it) => sql(`select count(*) from item_saves where user_id = '${uid}' and item_id = ${it} and removed_at is null`);
    const izquierda = (q) => q.evaluate(() => {
      const h = document.querySelector('[role="dialog"] [data-guardar-plato]'), n = h?.nextElementSibling, a = h?.getBoundingClientRect(), r = n?.getBoundingClientRect();
      return a && r ? { w: Math.round(a.width), h: Math.round(a.height), izq: a.right <= r.left, primero: h.parentElement.firstElementChild === h } : null;
    });
    await p0.goto(URL_POLLO); await p0.waitForLoadState('networkidle').catch(() => {});
    ok(await espera(async () => p0.locator('[data-screen-label="Producto · Mercados"]').isVisible() && corazon(p0).isVisible()), 'mercado (?producto=): la hoja del producto abre con el corazón');
    const cm = await izquierda(p0);
    ok(cm && cm.w === 44 && cm.h === 44 && cm.izq && cm.primero, `mercado: el cuadro de 44 px a la izquierda de la barra de la hoja (${JSON.stringify(cm)})`);
    ok((await corazon(p0).getAttribute('aria-label')) === 'Guardar producto' && !(await pulsado(p0)), 'mercado: «Guardar producto», aria-pressed false');
    const malosM = await botonesQueNoCaben(p0);
    ok(!malosM.length, `a 390 la barra de la hoja del mercado cabe (${malosM.join(' | ')})`);
    await corazon(p0).click();
    ok(await espera(async () => new URL(p0.url()).pathname === '/entrar') && new URL(p0.url()).searchParams.get('volver') === `/n/${MERC}?tab=svc&producto=${POLLO}`, 'mercado sin sesión: a /entrar y de vuelta a la hoja de ese producto');
    await p.goto(URL_POLLO); await p.waitForLoadState('networkidle').catch(() => {});
    ok(await espera(async () => corazon(p).isVisible()) && !(await pulsado(p)), 'mercado con cuenta: la hoja abre sin marcar');
    await corazon(p).click();
    ok(await espera(async () => pulsado(p)) && await espera(async () => vivo(POLLO) === '1'), 'mercado: guardar (aria-pressed true, una fila viva)');
    ok(sql(`select city_id from item_saves where user_id = '${uid}' and item_id = ${POLLO} and removed_at is null`) === sql(`select city_id from businesses where id = '${MERC}'`), 'mercado: con la ciudad del negocio');
    await shot(p, '390-mercado-guardado', false);
    await p.reload(); await p.waitForLoadState('networkidle').catch(() => {});
    ok(await espera(async () => pulsado(p)), 'mercado: al recargar sigue marcado (el servidor lo trae)');
    await p.goto(URL_CART); await p.waitForLoadState('networkidle').catch(() => {});
    ok(await espera(async () => p.locator('[data-screen-label="Tienda · artículo"]').isVisible() && corazon(p).isVisible()), 'tienda (?producto=): la hoja del artículo abre con el corazón');
    const ct = await izquierda(p);
    ok(ct && ct.w === 44 && ct.izq && ct.primero, `tienda: el cuadro a la izquierda de la barra de la hoja (${JSON.stringify(ct)})`);
    ok((await corazon(p).getAttribute('aria-label')) === 'Guardar producto' && !(await pulsado(p)), 'tienda: «Guardar producto», sin marcar');
    const malosT = await botonesQueNoCaben(p);
    ok(!malosT.length, `a 390 la barra de la hoja de la tienda cabe (${malosT.join(' | ')})`);
    await corazon(p).click();
    ok(await espera(async () => pulsado(p)) && await espera(async () => vivo(CART) === '1'), 'tienda: guardar');
    await shot(p, '390-tienda-guardado', false);
    await p.goto(B + '/cuenta/guardados?f=items'); await p.waitForLoadState('networkidle').catch(() => {});
    tx = await texto(p);
    const lb = `${require('../lib/usd.cjs')(centsP)}/lb`, pc = require('../lib/usd.cjs')(centsC);
    ok(tx.includes('Platos y productos · 3') && tx.includes('Pollo entero') && tx.includes('SUPERMERCADO LA COSECHA') && tx.includes(lb), `la lista: el producto del mercado con «${lb}»`);
    ok(tx.includes('Cartera') && tx.includes('BOUTIQUE YARITZA') && tx.includes(pc), `y el artículo de la tienda con ${pc}`);
    ok(await p.getByRole('button', { name: 'Apartar' }).isVisible() && (await p.getByRole('button', { name: /^(Pedir|Ver)$/ }).count()) >= 2, 'acciones: «Apartar» la tienda y «Pedir»/«Ver» el plato y el mercado');
    await shot(p, '390-guardados-productos');
    await p.getByRole('button', { name: 'Apartar' }).click();
    ok(await espera(async () => new URL(p.url()).pathname === `/n/${TIEN}` && new URL(p.url()).searchParams.get('producto') === CART), '«Apartar» abre la tienda con ?producto=');
    ok(await espera(async () => p.locator('[data-screen-label="Tienda · artículo"]').isVisible()) && await espera(async () => pulsado(p)), 'con la hoja del artículo abierta y marcada');
    sql(`update items set status = 'hidden', hidden_reason = 'prueba plat9t' where id = ${CART}`);
    await p.goto(B + '/cuenta/guardados?f=items'); await p.waitForLoadState('networkidle').catch(() => {});
    tx = await texto(p);
    ok(/Cartera NO DISPONIBLE/i.test(tx) && tx.includes('No disponible por ahora en la página del negocio.') && !(await p.getByRole('button', { name: 'Apartar' }).count()), 'un artículo oculto: «No disponible», sin «Apartar»');
    sql(`update items set status = 'live', hidden_reason = null where id = ${CART}`);
    // 1360: la ventana del producto del mercado, marcada.
    await d.goto(URL_POLLO); await d.waitForLoadState('networkidle').catch(() => {});
    ok(await espera(async () => corazon(d).isVisible()) && (await corazon(d).getAttribute('aria-label')) === 'Save product' && await espera(async () => pulsado(d)), '1360 EN: la ventana del mercado con «Save product», marcada');
    await shot(d, '1360-mercado-en', false);
    ok(!err.length, `sin errores de la página (${err.join(' | ')})`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
    for (const [it, s0] of [[POLLO, pSt0], [CART, cSt0]]) if (it && s0) { const [s, h] = s0.split('|'); sql(`update items set status = '${s || 'live'}', hidden_reason = ${h ? `'${h.replace(/'/g, "''")}'` : 'null'} where id = ${it}`); }
    if (MOF) { const [s, h] = st0.split('|'); sql(`update items set status = '${s || 'live'}', hidden_reason = ${h ? `'${h.replace(/'/g, "''")}'` : 'null'} where id = ${MOF}`); }
    for (const h of JSON.parse(horas0 || '[]')) sql(`update business_hours set open = ${h.o}, ranges = '${JSON.stringify(h.r)}'::jsonb where business_id = '${BIZ}' and module = '' and weekday = ${h.w}`);
  }
  console.log(`\nOK plat9t · ${n} ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
