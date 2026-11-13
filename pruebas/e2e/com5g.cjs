// 5g · Monedas y cupones de negocios. Teléfono 390 y escritorio 1360. Vecinos nuevos por corrida (el libro es de solo inserción y «uno por
// persona» queda para siempre); negocio Rosa (barberia-el-primo, Pro), otro negocio Pedro (sabor-dominicano), Yesenia (locales-centro, Free).
// 1 bienvenida → +100 una vez · 2 premio del mes cerrado → una vez · 3 el negocio crea un cupón → por aprobar (el vecino no lo ve) · 4 el admin
// lo aprueba con costo (fuera de 80–1,000 → no) → aviso al negocio → los vecinos lo ven · 5 canjear → saldo baja, código TL-CQ-xxxx; la misma
// persona otra vez → no · 6 dos vecinos canjean la última unidad a la vez → pasa uno; el otro conserva sus monedas · saldo para uno y dos
// canjes a la vez (dos cupones) → pasa uno · 7 el negocio valida → usado; otra vez → no; otro negocio → no lo encuentra · 8 el reloj se mueve:
// el código vence → vencido y las monedas vuelven (aviso) · 9 el admin pausa con motivo → aviso al negocio y el cupón no sale · 10 el admin
// ajusta ± (auditado; nunca negativo) · 11 ningún pago · invariantes del libro en SQL · Mi cuenta › MONEDAS. Sin errores de consola. Deja
// todo como estaba (cupón de prueba terminado; códigos de prueba vencidos y sus monedas devueltas).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync, exec } = require('child_process');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const sqlAsync = (q) => new Promise((res) => exec(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, (e, out, errOut) => res({ ok: !e, out: String(out).trim(), err: String(errOut) })));
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t) => espera(async () => (await texto(p)).includes(t));
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const coins = (u) => +sql(`select coalesce((select coins from community_profiles where user_id = '${u}'), 0)`);
const sinScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const barrido = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const TAG = 'prueba c5g';
const ADM = '5705550199', ROSA = '5705550166', PEDRO = '5705550133', YES = '5705550433';
const libre = (pre) => { for (;;) { const t = pre + String(Math.floor(Math.random() * 1000)).padStart(3, '0'); if (!sql(`select 1 from users where phone = '+1${t}'`)) return t; } };
const N1_ = libre('5705556'), N2_ = libre('5705556'), N3_ = libre('5705556'), N4_ = libre('5705556'), N5_ = libre('5705556');
// Mover el reloj de un código (solo en esta prueba): el trigger no deja cambiar lo emitido, así que se apaga un momento.
const vencerYa = (where) => sql(`alter table coupon_redemptions disable trigger coupon_redemptions_guardia; update coupon_redemptions set expires_at = now() - interval '1 minute' where status = 'issued' and ${where}; alter table coupon_redemptions enable trigger coupon_redemptions_guardia;`);

(async () => {
  const b = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404|status of 503|pexels/.test(m.text())) err.push('console: ' + m.text()); }); };
  const tel = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(p); return p; };
  const esc = async () => { const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(p); return p; };
  const vecino = async (p, t, nombre) => {
    await entrar(p, t); await api(p, '/api/cuenta/perfil', { nombre, apellido: 'Prueba' });
    const id = uid(t);
    sql(`update users set home_city_id = 'hzl', status = 'active' where id = '${id}'`);
    sql(`insert into community_profiles (user_id) values ('${id}') on conflict do nothing`);
    sql(`update community_profiles set rules_version = 1, rules_ok_at = now(), adult = true, adult_ok_at = now(), welcome_at = now() where user_id = '${id}'`);
    sql(`select mon_bienvenida('${id}')`);
    return id;
  };
  const pagos0 = sql('select count(*) from payments');

  // ── Preparación: lo de corridas anteriores terminado (estado) ──
  sql(`update coupons set status = 'ended', ended_by = 'business', ended_at = now() where title->>'es' like '%${TAG}%' and status <> 'ended'`);
  const CAFE = sql(`select id from coupons where business_id = 'cafe-quisqueya' and status = 'live' order by id limit 1`), PAN = sql(`select id from coupons where business_id = 'panaderia-la-espiga' and status = 'live' order by id limit 1`);
  ok(!!CAFE && !!PAN && sql(`select count(*) from coupons where status = 'live' and business_id in ('cafe-quisqueya', 'panaderia-la-espiga', 'empanadas-dona-tere', 'barberia-el-primo', 'llantera-el-cibao')`) === '5', 'la semilla: los 5 cupones de los negocios de prueba en la Comunidad');

  // ── 1 · Bienvenida: +100 monedas una sola vez ──
  const n1 = await tel(); await entrar(n1, N1_); await api(n1, '/api/cuenta/perfil', { nombre: 'Nayeli', apellido: 'Prueba' });
  const R1 = uid(N1_); sql(`update users set home_city_id = 'hzl' where id = '${R1}'`);
  await n1.goto(B + '/comunidad'); await n1.waitForURL(/\/entrar\?bienvenida=1/); await n1.getByText('¿Por dónde vives?').waitFor();
  await clic(n1.getByText('North End', { exact: true })); await clic(n1.getByRole('button', { name: 'Continuar' }));
  await n1.getByText('¿Qué te gusta?').waitFor(); await clic(n1.getByRole('button', { name: 'Continuar' }));
  await n1.getByRole('heading', { name: 'Las reglas del barrio' }).waitFor();
  await clic(n1.getByRole('checkbox', { name: 'Acepto las reglas del barrio' })); await clic(n1.getByRole('checkbox', { name: 'Tengo 18 años o más' }));
  await n1.getByRole('button', { name: "Entrar a To'Latino" }).click(); await n1.getByText('PARA EMPEZAR').waitFor();
  ok(await contiene(n1, 'Empiezas como Recluta y con 100 monedas para los cupones de los negocios del barrio. Se ganan, nunca se compran: sin valor en dinero.'), 'la bienvenida dice las 100 monedas (sin valor en dinero)');
  await n1.screenshot({ path: OUT + 'c5g-bienvenida-m.png' });
  ok(coins(R1) === 100 && sql(`select count(*) || ':' || sum(delta) from coin_entries where user_id = '${R1}' and reason_key = 'welcome'`) === '1:100', 'el libro asienta +100 (welcome) y el saldo derivado es 100');
  ok(sql(`select mon_bienvenida('${R1}')`) === '0' && sql(`select count(*) from coin_entries where user_id = '${R1}'`) === '1' && coins(R1) === 100, 'la bienvenida otra vez → 0 (una sola vez, idempotente)');
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${R1}' and tpl = 'gam_monedas'`) === '1'), 'aviso «Te llegaron monedas» (sin SMS)');
  ok(sql(`select count(*) from notifications where tpl like 'gam_monedas%' and sms_status <> 'no'`) === '0', 'ningún aviso de monedas sale por SMS');

  // ── 2 · Premio del mes: el mes anterior cerrado acreditó el premio a los 3 primeros, una vez ──
  const ANT = sql(`select to_char(date_trunc('month', (now() at time zone 'America/New_York')::date) - interval '1 month', 'YYYY-MM-DD')`);
  const top = sql(`select string_agg(mb.user_id::text || '=' || mb.prize_coins, ',' order by mb.position) from monthly_boards mb join board_closures bc on bc.city_id = mb.city_id and bc.month = mb.month and bc.closed_at is not null where mb.city_id = 'hzl' and mb.month = '${ANT}' and mb.position <= 3 and mb.prize_coins > 0`).split(',').filter(Boolean);
  ok(top.length === 3, `el mes anterior (${ANT}) de Hazleton está cerrado con 3 premiados`);
  ok(top.every((x) => { const [u, p] = x.split('='); return sql(`select count(*) || ':' || coalesce(sum(delta), 0) from coin_entries where user_id = '${u}' and reason_key = 'premio_mes' and ref_id = 'hzl:${ANT}'`) === `1:${p}`; }), 'cada uno de los 3 tiene su premio en el libro una sola vez (premio_mes)');
  ok(sql(`select mon_premios_mes('hzl', '${ANT}')`) === '0' && sql(`select count(*) from coin_entries where reason_key = 'premio_mes' and ref_id = 'hzl:${ANT}'`) === '3', 'acreditar el premio otra vez → nada nuevo (idempotente)');
  ok(sql(`select (report->>'canjes') is not null from board_closures where city_id = 'hzl' and month = '${ANT}'`) === 't', 'el cierre lleva el reporte de canjes del mes');

  // ── 3 · El negocio (Pro) crea un cupón → «Por aprobar»; Free ve el candado ──
  const ro = await tel(); await entrar(ro, ROSA);
  await ro.goto(B + '/panel/barberia-el-primo/pagina/cup'); await ro.getByText('VALIDAR UN CÓDIGO').waitFor();
  ok(await contiene(ro, 'To’Latino aprueba cada cupón y fija su costo en monedas.'), 'panel › Cupones por monedas: validar arriba y «el costo lo fija To’Latino»');
  await clic(ro.getByRole('button', { name: 'Crear' })); await ro.getByLabel('EN ESPAÑOL', { exact: true }).waitFor();
  await ro.getByLabel('EN ESPAÑOL', { exact: true }).fill(`Lavado de cabello gratis · ${TAG}`); await ro.getByLabel('EN INGLÉS · OPCIONAL', { exact: true }).fill('Free hair wash');
  await ro.getByLabel('CONDICIONES · OPCIONAL', { exact: true }).fill('Uno por persona, con tu corte. No se cambia por dinero.');
  for (let i = 0; i < 18; i++) await ro.getByRole('button', { name: 'Cuántos al mes −' }).click();
  ok((await texto(ro)).includes('Cuántos al mes') && !(await texto(ro)).match(/COSTO EN MONEDAS/), 'el negocio elige cuántos al mes y los días; no pone el costo');
  await ro.screenshot({ path: OUT + 'c5g-panel-crear-m.png', fullPage: true });
  await clic(ro.getByRole('button', { name: 'Enviar a aprobar' }));
  const CID = await (async () => { let id = ''; await espera(() => (id = sql(`select id from coupons where business_id = 'barberia-el-primo' and title->>'es' like '%${TAG}%' and status = 'pending' order by id desc limit 1`)) !== ''); return id; })();
  ok(!!CID && sql(`select coalesce(cost_coins::text, 'null') || ':' || monthly_stock || ':' || valid_days from coupons where id = ${CID}`) === 'null:2:30', 'cupón «Por aprobar» sin costo, 2 al mes, 30 días');
  ok(sql(`select count(*) from audit_entries where action = 'cupon.crear' and target_id = 'barberia-el-primo' and after->>'cupon' = '${CID}'`) === '1', 'queda en la auditoría del negocio');
  await ro.goto(B + '/panel/barberia-el-primo/pagina/cup'); ok(await contiene(ro, 'POR APROBAR'), 'el panel lo muestra «POR APROBAR»');
  await ro.screenshot({ path: OUT + 'c5g-panel-cupones-m.png', fullPage: true });
  const ye = await tel(); await entrar(ye, YES);
  // 9b-3 · Su punto de partida, dicho aquí (antes lo dejaba inm4ib, que en otro orden corría DESPUÉS): Yesenia administra Locales del Centro y es Free.
  sql(`insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select 'locales-centro', u.id, 'owner', 'Yesenia Batista', '{"es":"Prueba","en":"Test"}'::jsonb, 'active', false, '{all}', 2020, 9, true from users u where u.phone = '+1${YES}' and not exists (select 1 from business_members m where m.business_id = 'locales-centro' and m.user_id = u.id)`);
  sql(`insert into business_stats_cache (business_id, plan) values ('locales-centro', 'free') on conflict (business_id) do update set plan = 'free'`);
  await ye.goto(B + '/panel/locales-centro/pagina/cup');
  ok(await contiene(ye, 'Ofrece cupones por monedas') && await contiene(ye, 'Ver Pro'), 'un negocio Free ve el candado (Cupones por monedas es de Pro)');
  await ye.screenshot({ path: OUT + 'c5g-panel-free-m.png' });
  await n1.goto(B + '/comunidad/monedas'); await n1.getByText('Cámbialas por cupones').waitFor();
  ok(await n1.locator(`[data-cupon="${CID}"]`).count() === 0 && await n1.locator('[data-cupon]').count() >= 5, 'el vecino no ve el cupón por aprobar (sí los 5 aprobados)');

  // ── 4 · El admin lo aprueba con costo → aviso al negocio → los vecinos lo ven ──
  const ad = await esc(); await entrar(ad, ADM);
  await ad.goto(B + '/admin/gamificacion?tab=cup'); await ad.getByText('CUPONES · HAZLETON').waitFor();
  ok(await contiene(ad, `Lavado de cabello gratis · ${TAG} · Barbería El Primo`), 'Super Admin › Cupones › Por aprobar: el cupón con su negocio');
  await ad.screenshot({ path: OUT + 'c5g-admin-cupones-d.png', fullPage: true });
  const fila = ad.locator('div').filter({ has: ad.getByText(`Lavado de cabello gratis · ${TAG} · Barbería El Primo`, { exact: true }) }).filter({ has: ad.getByRole('button', { name: 'Aprobar' }) }).last();
  await clic(fila.getByRole('button', { name: 'Aprobar' }));
  await ad.getByLabel('COSTO EN MONEDAS · 80–1,000').fill('50'); await clic(ad.getByText('Revisado: oferta clara', { exact: true }));
  await clic(ad.getByRole('button', { name: 'Aprobar' }));
  ok(await contiene(ad, 'El costo va de 80 a 1,000 monedas.') && sql(`select status from coupons where id = ${CID}`) === 'pending', 'un costo de 50 → no (va de 80 a 1,000)');
  await ad.getByLabel('COSTO EN MONEDAS · 80–1,000').fill('80');
  await ad.screenshot({ path: OUT + 'c5g-admin-aprobar-d.png', fullPage: true });
  await clic(ad.getByRole('button', { name: 'Aprobar' }));
  ok(await espera(() => sql(`select status || ':' || cost_coins from coupons where id = ${CID}`) === 'live:80') && sql(`select count(*) from audit_entries where action = 'gam.cupon.aprobar' and target_id = '${CID}'`) === '1', 'aprobado a 80 monedas (auditoría)');
  const RRosa = uid(ROSA);
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RRosa}' and tpl = 'biz_cupon_ok' and ref_id = '${CID}'`) === '1'), 'el negocio recibe «Tu cupón ya está en la Comunidad» con el costo');
  await n1.goto(B + '/comunidad/monedas'); await n1.locator(`[data-cupon="${CID}"]`).waitFor();
  ok(await contiene(n1, '100 MONEDAS · SE GANAN, NUNCA SE COMPRAN') && await contiene(n1, 'SIN VALOR EN DINERO') && (await n1.locator(`[data-cupon="${CID}"]`).innerText()).includes('80 MONEDAS'), 'los vecinos lo ven: «80 MONEDAS», con «Sin valor en dinero» junto al saldo');
  ok(await sinScroll(n1), 'teléfono 390: sin scroll horizontal');
  await n1.screenshot({ path: OUT + 'c5g-monedas-m.png', fullPage: true });

  // ── 5 · Canjear: confirmación → código TL-CQ-xxxx; el saldo baja; la misma persona otra vez → no ──
  await clic(n1.locator(`[data-cupon="${CID}"]`).getByRole('button', { name: 'Canjear' }));
  ok(await contiene(n1, 'CUESTA') && await contiene(n1, 'Tienes 100 monedas.') && await contiene(n1, 'Uno por persona. Vence 30 días después de canjearlo. No se cambia por dinero.'), 'la hoja confirma: cuesta, tienes, uno por persona, vence, sin dinero');
  await n1.screenshot({ path: OUT + 'c5g-canje-m.png' });
  await clic(n1.getByRole('button', { name: 'Canjear por 80 monedas' }));
  await n1.getByText('TU CÓDIGO').waitFor();
  const COD1 = await n1.locator('[data-codigo]').first().getAttribute('data-codigo');
  ok(/^TL-CQ-[2-9A-HJ-NP-Z]{4}$/.test(COD1) && await contiene(n1, 'Muéstralo en el local de Barbería El Primo') && await contiene(n1, 'VENCE EL'), `código ${COD1} con «Muéstralo en el local» y la fecha en que vence`);
  await n1.screenshot({ path: OUT + 'c5g-codigo-m.png' });
  ok(coins(R1) === 20 && sql(`select status || ':' || cost_coins from coupon_redemptions where code = '${COD1}'`) === 'issued:80' && sql(`select delta || ':' || ref_id from coin_entries where user_id = '${R1}' and reason_key = 'canje'`) === `-80:${COD1}`, 'saldo 100 → 20; el canje es un asiento −80 con el código como referencia');
  ok(/ya canjeado/.test(sqlErr(`select * from cup_canjear('${R1}', ${CID})`)) && coins(R1) === 20, 'la misma persona otra vez en el cupón vivo → rechazado y no gasta');
  await n1.goto(B + '/comunidad/monedas'); await n1.locator(`[data-cupon="${CID}"]`).waitFor();
  ok((await n1.locator(`[data-cupon="${CID}"]`).innerText()).includes('Ver mi código') && await contiene(n1, 'TUS CUPONES') && await contiene(n1, COD1), 'el cupón dice «Ver mi código» y sale en TUS CUPONES; los movimientos lo listan');
  ok(await contiene(n1, 'Canjeaste un cupón · Lavado de cabello gratis'), 'MOVIMIENTOS: «Canjeaste un cupón · …»');
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RRosa}' and tpl = 'biz_cupon_canje' and ref_id = '${CID}'`) !== '0'), 'el negocio recibe «Un vecino canjeó tu cupón» (sin el código)');

  // ── 6 · Carrera: dos vecinos canjean la última unidad a la vez → pasa uno ──
  const n2 = await tel(), n3 = await tel();
  const R2 = await vecino(n2, N2_, 'Norma'), R3 = await vecino(n3, N3_, 'Nelson');
  ok(coins(R2) === 100 && coins(R3) === 100, 'dos vecinos más con sus 100 de bienvenida');
  for (const p of [n2, n3]) { await p.goto(B + '/comunidad/monedas'); await p.locator(`[data-cupon="${CID}"]`).waitFor(); await clic(p.locator(`[data-cupon="${CID}"]`).getByRole('button', { name: 'Canjear' })); await p.getByRole('button', { name: 'Canjear por 80 monedas' }).waitFor(); }
  await Promise.all([n2.getByRole('button', { name: 'Canjear por 80 monedas' }).click(), n3.getByRole('button', { name: 'Canjear por 80 monedas' }).click()]);
  await espera(async () => (await texto(n2)).includes('TU CÓDIGO') || (await texto(n2)).includes('Se acabaron'));
  await espera(async () => (await texto(n3)).includes('TU CÓDIGO') || (await texto(n3)).includes('Se acabaron'));
  const gana2 = (await texto(n2)).includes('TU CÓDIGO'), gana3 = (await texto(n3)).includes('TU CÓDIGO');
  ok(gana2 !== gana3, 'la última unidad: pasa uno solo');
  const [W, L, wp, lp] = gana2 ? [R2, R3, n2, n3] : [R3, R2, n3, n2];
  ok(await contiene(lp, 'Se acabaron los de este mes. Vuelve el mes que viene.'), 'el otro recibe una razón clara: «Se acabaron los de este mes»');
  await lp.screenshot({ path: OUT + 'c5g-carrera-perdio-m.png' });
  ok(coins(W) === 20 && coins(L) === 100 && sql(`select count(*) from coupon_redemptions where coupon_id = ${CID} and status <> 'expired'`) === '2' && sql(`select count(*) from coin_entries where user_id = '${L}' and reason_key = 'canje'`) === '0', 'quien ganó: 20; quien perdió: 100 (no se asentó nada); el cupo del mes (2) no se pasa');
  const COD2 = sql(`select code from coupon_redemptions where coupon_id = ${CID} and user_id = '${W}'`);
  // Saldo para uno y dos canjes a la vez (dos cupones distintos de la misma persona) y doble toque del mismo cupón: nunca negativo.
  const n4 = await tel(), n5 = await tel(); const R4 = await vecino(n4, N4_, 'Noel'), R5 = await vecino(n5, N5_, 'Nora');
  const RADM = uid(ADM);
  sql(`select mon_ajustar('${R4}', 30, '${RADM}', 'prueba c5g: saldo para un solo canje')`);
  ok(coins(R4) === 130, 'Noel: 130 monedas (alcanza para el de 80 o el de 120, no para los dos)');
  const [x1, x2] = await Promise.all([sqlAsync(`select codigo from cup_canjear('${R4}', ${CAFE})`), sqlAsync(`select codigo from cup_canjear('${R4}', ${PAN})`)]);
  ok([x1, x2].filter((x) => x.ok).length === 1 && /saldo insuficiente/.test([x1, x2].find((x) => !x.ok).err) && [10, 50].includes(coins(R4)), `dos canjes a la vez con saldo para uno → pasa uno; el otro «saldo insuficiente»; quedan ${coins(R4)} (nunca negativo)`);
  const [y1, y2] = await Promise.all([sqlAsync(`select codigo from cup_canjear('${R5}', ${CAFE})`), sqlAsync(`select codigo from cup_canjear('${R5}', ${CAFE})`)]);
  ok([y1, y2].filter((x) => x.ok).length === 1 && /ya canjeado|coupon_redemptions_uno/.test([y1, y2].find((x) => !x.ok).err) && coins(R5) === 20, 'doble toque del mismo cupón a la vez → un solo código y un solo gasto (20)');
  ok(sql(`select count(*) from community_profiles where coins < 0`) === '0' && sql(`select count(*) from community_profiles cp where cp.coins <> coalesce((select sum(e.delta) from coin_entries e where e.user_id = cp.user_id), 0)`) === '0', 'SQL: ningún saldo negativo y cada saldo es la suma de su libro');

  // ── 7 · El negocio valida → usado; otra vez → no; otro negocio → no lo encuentra ──
  await ro.goto(B + '/panel/barberia-el-primo/pagina/cup'); await ro.getByLabel('CÓDIGO DEL VECINO').waitFor();
  await ro.getByLabel('CÓDIGO DEL VECINO').fill(COD1.toLowerCase()); await clic(ro.getByRole('button', { name: 'Validar' }));
  ok(await contiene(ro, 'Código válido: «Lavado de cabello gratis') && await contiene(ro, 'para Nayeli P.: ya quedó usado.'), 'validar (en minúsculas) → «Código válido … para Nayeli P.: ya quedó usado.»');
  ok(sql(`select status || ':' || (used_by = '${RRosa}')::text from coupon_redemptions where code = '${COD1}'`) === 'used:true' && sql(`select count(*) from audit_entries where action = 'cupon.validar' and after->>'codigo' = '${COD1}'`) === '1', 'el código queda usado por Rosa (auditoría)');
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${R1}' and tpl = 'gam_cupon_usado'`) === '1'), 'el vecino recibe «Usaste tu cupón»');
  await ro.screenshot({ path: OUT + 'c5g-panel-validar-m.png', fullPage: true });
  await ro.getByLabel('CÓDIGO DEL VECINO').fill(COD1); await clic(ro.getByRole('button', { name: 'Validar' }));
  ok(await contiene(ro, 'Ese código ya se usó el') && sql(`select count(*) from coupon_redemptions where code = '${COD1}' and status = 'used'`) === '1', 'validar otra vez → «Ese código ya se usó …» (una sola vez)');
  ok(/no cambia/.test(sqlErr(`select set_config('tl.cupones', 'si', false); update coupon_redemptions set status = 'issued' where code = '${COD1}'`)), 'la base no deja que un código usado vuelva atrás');
  const pe = await tel(); await entrar(pe, PEDRO); await pe.goto(B + '/panel/sabor-dominicano/pagina/cup'); await pe.getByLabel('CÓDIGO DEL VECINO').waitFor();
  await pe.getByLabel('CÓDIGO DEL VECINO').fill(COD2); await clic(pe.getByRole('button', { name: 'Validar' }));
  ok(await contiene(pe, 'No encontramos ese código en tus cupones.') && sql(`select status from coupon_redemptions where code = '${COD2}'`) === 'issued', 'otro negocio no encuentra el código (sigue emitido)');
  const rd = await esc(); await entrar(rd, ROSA); await rd.goto(B + '/panel/barberia-el-primo/pagina/cup'); await rd.getByText('ÚLTIMOS CÓDIGOS USADOS').waitFor();
  ok(await contiene(rd, COD1) && !(await texto(rd)).includes(COD2), 'el panel lista los códigos usados, nunca los emitidos');
  await rd.screenshot({ path: OUT + 'c5g-panel-cupones-d.png', fullPage: true });

  // ── 8 · El reloj se mueve: el código vence → vencido y las monedas vuelven (aviso); validarlo → «venció» ──
  vencerYa(`code = '${COD2}'`); barrido();
  ok(await espera(() => sql(`select status from coupon_redemptions where code = '${COD2}'`) === 'expired') && coins(W) === 100, 'el barrido vence el código y las 80 monedas vuelven (100)');
  ok(sql(`select e.reason_key || ':' || e.delta || ':' || (e.reverses_id = r.coin_entry_id)::text from coupon_redemptions r join coin_entries e on e.id = r.return_entry_id where r.code = '${COD2}'`) === 'devolucion:80:true', 'la devolución es el asiento inverso exacto del canje');
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${W}' and tpl = 'gam_monedas_vuelven' and body like '%${COD2}%'`) === '1'), 'aviso «Te devolvimos tus monedas» con el código');
  ok(/un canje no cambia|un código usado o vencido no cambia/.test(sqlErr(`select set_config('tl.cupones', 'si', false); update coupon_redemptions set status = 'used', used_at = now(), used_by = '${RRosa}' where code = '${COD2}'`)), 'un código vencido no se puede usar (la base)');
  await ro.getByLabel('CÓDIGO DEL VECINO').fill(COD2); await clic(ro.getByRole('button', { name: 'Validar' }));
  ok(await contiene(ro, 'Ese código venció sin usarse: las monedas volvieron al vecino.'), 'el negocio valida el vencido → «Ese código venció…»');
  barrido(); ok(coins(W) === 100 && sql(`select count(*) from coin_entries where user_id = '${W}' and reason_key = 'devolucion'`) === '1', 'otro barrido no devuelve dos veces');

  // ── 9 · El admin pausa con motivo → aviso al negocio y el cupón ya no sale ──
  await ad.goto(B + '/admin/gamificacion?tab=cup&e=live'); await ad.getByText('CUPONES · HAZLETON').waitFor();
  ok(await contiene(ad, '1 DE 2 ESTE MES · 1 USADOS · 0 CÓDIGOS VIVOS'), 'el admin ve los canjes del mes (el vencido ya no cuenta), los usados y los vivos');
  ok(await contiene(ad, `${COD1} · Lavado de cabello gratis`) && await contiene(ad, 'USADO'), 'ÚLTIMOS CANJES: el código usado (triángulo: el admin ve el canje)');
  const fl = ad.locator('div').filter({ has: ad.getByText(`Lavado de cabello gratis · ${TAG} · Barbería El Primo`, { exact: true }) }).filter({ has: ad.getByRole('button', { name: 'Pausar' }) }).last();
  await clic(fl.getByRole('button', { name: 'Pausar' })); await clic(ad.getByText('Quejas de vecinos: no lo respetan en el local', { exact: true })); await clic(ad.getByRole('button', { name: 'Pausar' }));
  ok(await espera(() => sql(`select status || ':' || paused_by from coupons where id = ${CID}`) === 'paused:admin') && sql(`select count(*) from audit_entries where action = 'gam.cupon.pausar' and target_id = '${CID}'`) === '1', 'pausado por To’Latino con motivo (auditoría)');
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RRosa}' and tpl = 'biz_cupon_pausa' and ref_id = '${CID}' and body like '%no lo respetan%'`) === '1'), 'el negocio recibe «To’Latino pausó tu cupón» con el motivo');
  await n1.goto(B + '/comunidad/monedas'); await n1.getByText('Cámbialas por cupones').waitFor();
  ok(await n1.locator(`[data-cupon="${CID}"]`).count() === 0 && await contiene(n1, COD1), 'el cupón ya no sale en la Comunidad (el código usado sigue en TUS CUPONES)');
  await ro.goto(B + '/panel/barberia-el-primo/pagina/cup');
  ok(await contiene(ro, 'Lo pausó To’Latino: Quejas de vecinos') && await ro.getByRole('button', { name: 'Reanudar' }).count() === 0, 'el panel dice que lo pausó To’Latino y el motivo; el negocio no lo reanuda');

  // ── 10 · El admin ajusta ± (auditado; nunca negativo) y Monedas en el Super Admin ──
  await ad.goto(B + `/admin/usuarios/${L}?tab=comunidad&sub=pym`) /* 5i: Puntos y monedas es una sub-pestaña */; await ad.getByText('MONEDAS · SIN VALOR EN DINERO').waitFor();
  await clic(ad.getByRole('button', { name: 'Ajustar monedas' })); await clic(ad.getByText('Restar', { exact: true })); await ad.getByLabel('CANTIDAD').fill('200');
  await clic(ad.getByText('Error del sistema', { exact: true })); await clic(ad.getByRole('button', { name: 'Aplicar' }));
  ok(await contiene(ad, 'El ajuste deja las monedas en negativo.') && coins(L) === 100, 'restar 200 de 100 → no (nunca negativo)');
  await clic(ad.getByText('Sumar', { exact: true })); await ad.getByLabel('CANTIDAD').fill('25'); await clic(ad.getByRole('button', { name: 'Aplicar' }));
  ok(await espera(() => coins(L) === 125) && sql(`select count(*) from audit_entries where action = 'gam.monedas.ajustar' and target_id = '${L}' and reason = 'Error del sistema'`) === '1'
    && await espera(() => sql(`select count(*) from notifications where user_id = '${L}' and tpl = 'gam_monedas_ajuste'`) === '1'), 'sumar 25 con motivo → 125, auditoría y aviso a la persona');
  await ad.goto(B + `/admin/usuarios/${L}?tab=comunidad&sub=pym`) /* 5i: Puntos y monedas es una sub-pestaña */; await ad.getByText('MONEDAS · MOVIMIENTOS').waitFor();
  ok(await contiene(ad, 'Ajuste del equipo: Error del sistema'), 'el 360° lista el ajuste con el motivo');
  await ad.screenshot({ path: OUT + 'c5g-admin-u360-monedas-d.png', fullPage: true });
  await ad.goto(B + '/admin/gamificacion?tab=coin'); await ad.getByText('EN CIRCULACIÓN').waitFor();
  ok(await contiene(ad, 'EMITIDAS ESTE MES') && await contiene(ad, 'CANJEADAS') && await contiene(ad, 'Sin valor en dinero') && await contiene(ad, 'no se compran ni se cambian') && await contiene(ad, 'Bienvenida, una vez'), 'Super Admin › Monedas: EN CIRCULACIÓN · EMITIDAS · CANJEADAS · VALOR «Sin valor en dinero» y las reglas');
  const circ = (+sql(`select coalesce(sum(coins), 0) from community_profiles`)).toLocaleString('en-US');
  ok(await contiene(ad, `EN CIRCULACIÓN ${circ} monedas en saldos`), `EN CIRCULACIÓN = ${circ} = la suma de los saldos (SQL)`);
  await ad.screenshot({ path: OUT + 'c5g-admin-monedas-d.png', fullPage: true });

  // ── 11 · Ningún pago; el libro no se toca a mano; Mi cuenta › MONEDAS; escritorio del vecino ──
  ok(sql('select count(*) from payments') === pagos0, 'ningún pago en ningún momento (monedas y cupones no mueven dinero)');
  ok(/solo lo escriben sus funciones/.test(sqlErr(`insert into coin_entries (user_id, city_id, delta, reason_key, ref_kind, ref_id) values ('${R1}', 'hzl', 500, 'welcome', 'x', 'y${Date.now()}')`)), 'insertar monedas a mano → la base lo rechaza');
  ok(/solo de inserción/.test(sqlErr(`update coin_entries set delta = 500 where user_id = '${R1}'`)) && /solo de inserción/.test(sqlErr(`delete from coin_entries where user_id = '${R1}'`)), 'el libro de monedas no se cambia ni se borra');
  ok(/derivadas/.test(sqlErr(`update community_profiles set coins = 9999 where user_id = '${R1}'`)), 'el saldo a mano → la base lo rechaza');
  ok(/no se borra/.test(sqlErr(`delete from coupons where id = ${CID}`)) && /no se borra/.test(sqlErr(`delete from coupon_redemptions where code = '${COD1}'`)), 'un cupón o un canje no se borran');
  await n1.goto(B + '/cuenta'); ok(await contiene(n1, 'MONEDAS') && await contiene(n1, 'RANGO'), 'Mi cuenta: la tarjeta de vecino con RANGO y MONEDAS');
  await n1.screenshot({ path: OUT + 'c5g-cuenta-m.png' });
  const nd = await esc(); await entrar(nd, N4_); await nd.goto(B + '/comunidad/monedas'); await nd.getByText('Cámbialas por cupones').waitFor();
  ok(await contiene(nd, 'TUS CUPONES') && await contiene(nd, 'CÓMO SE GANAN'), 'escritorio: tus cupones y cómo se ganan en la columna derecha');
  await nd.screenshot({ path: OUT + 'c5g-monedas-d.png', fullPage: true });

  // ── Fin: el negocio termina el cupón de prueba; los códigos de prueba que siguen vivos vencen y sus monedas vuelven ──
  await ro.goto(B + '/panel/barberia-el-primo/pagina/cup');
  const fr = ro.locator('div').filter({ has: ro.getByText(`Lavado de cabello gratis · ${TAG}`, { exact: true }) }).filter({ has: ro.getByRole('button', { name: 'Terminar' }) }).last();
  await clic(fr.getByRole('button', { name: 'Terminar' })); await clic(ro.getByRole('button', { name: 'Sí, terminar' }));
  ok(await espera(() => sql(`select status || ':' || ended_by from coupons where id = ${CID}`) === 'ended:business'), 'el negocio termina el cupón (no se borra)');
  vencerYa(`user_id in ('${R4}', '${R5}')`); barrido();
  ok(await espera(() => sql(`select count(*) from coupon_redemptions where user_id in ('${R4}', '${R5}') and status = 'issued'`) === '0') && coins(R4) === 130 && coins(R5) === 100, 'los códigos de prueba vencen y las monedas vuelven (el cupo de los cupones de la semilla queda libre)');
  ok(sql('select count(*) from payments') === pagos0 && sql(`select count(*) from community_profiles where coins < 0`) === '0', 'al final: ningún pago y ningún saldo negativo');
  ok(err.length === 0, 'sin errores de consola' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log('com5g: todo bien');
})().catch((e) => { console.error(e); process.exit(1); });
