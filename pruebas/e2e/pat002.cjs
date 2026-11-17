// C-002 · Página de categoría (D) + Patrocinados. En Sabor Dominicano (Pro, Comida): el dueño compra 1 semana desde Panel › Cobros y plan ›
// Patrocinio (escritorio 1360; tarjeta del simulador) con el precio que manda Configuración → sale en la vitrina «Patrocinados» de /c/comida
// (teléfono 390 y escritorio 1360), respeta el país y los filtros, cuenta vistas (una por persona y día), entraron y pedidos. Una barbería nueva
// (Free, con dueña nueva) en Belleza con los 6 puestos ocupados: «Sin puestos», «Avísame», reserva desde el día que se libera uno. La base no deja un séptimo y
// la vitrina nunca pasa de patrocinio_puestos. El Super Admin termina el de Sabor con motivo (auditoría, aviso). El barrido: empieza lo
// reservado, vence, renueva (cobra) o termina si la tarjeta no pasa, y avisa a quien esperaba un puesto.
// Precondiciones propias: lo vivo de Comida y Belleza en Hazleton queda terminado (estados, nada se borra); la tarjeta 4242 del dueño; los
// precios y puestos de fábrica (se restauran al final); un vecino nuevo (teléfono libre) para las cifras.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, medios, negocioSinDueno, sql, tarjeta, telLibre } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 300)); } return false; };
const barrer = async () => { for (let i = 0; i < 20; i++) { const r = JSON.parse(execSync(`curl -s -m 300 -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString()); if (r.corrio) return r; await new Promise((x) => setTimeout(x, 1500)); } throw new Error('el barrido no corrió'); };
const UA_TEL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UA_PC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BIZ = 'sabor-dominicano', DUENO = '5705550133', ADMIN = '5705550199';
const TZ = "'America/New_York'", HOY = `(now() at time zone ${TZ})::date`, DIA = (d) => `((${HOY} + ${d})::timestamp at time zone ${TZ})`;
const terminarVivos = (cat) => sql(`update sponsorships set status = case when status = 'reservado' then 'cancelado' else 'terminado' end, end_kind = 'vencio', ended_at = now(), auto_renew = false
  where city_id = 'hzl' and category_id = '${cat}' and status in ('activo', 'reservado')`);
const CFG = ['patrocinio_semana_cents', 'patrocinio_puestos'];
const cfgAntes = Object.fromEntries(CFG.map((k) => [k, sql(`select value::text from platform_config where key = '${k}'`)]));
const ponerCfg = (k, v) => sql(`insert into platform_config (key, value, note) values ('${k}', to_jsonb(${v}), 'pat002') on conflict (key) do update set value = excluded.value, note = excluded.note, updated_at = now()`);

let OP = null;
(async () => {
  terminarVivos('NEG-FOOD'); terminarVivos('NEG-BELL');
  sql(`update sponsorship_waits set status = 'avisado', notified_at = now() where city_id = 'hzl' and status = 'espera'`);
  sql(`update business_stats_cache set plan = 'pro' where business_id = '${BIZ}'`);
  const D0 = sql(`select id from users where phone = '+1${DUENO}'`), A0 = sql(`select id from users where phone = '+1${ADMIN}'`);
  const PM = tarjeta(DUENO), PM_NO = tarjeta(DUENO, '0002', { predeterminada: false });
  // El precio lo pone Configuración (no la pantalla): esta corrida, $17 la semana.
  ponerCfg('patrocinio_semana_cents', 1700); ponerCfg('patrocinio_puestos', 6);
  const b = await chromium.launch(); const abiertas = [], err = [];
  const nueva = async (w, h, tel) => {
    // Un navegador de verdad (el Chromium sin cabeza dice «HeadlessChrome» y la app no le cuenta vistas ni entradas: es un robot).
    const c = await b.newContext(w < 600 ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA_TEL } : { viewport: { width: w, height: h }, userAgent: UA_PC });
    abiertas.push(c); await medios(c); const p = await c.newPage();
    p.on('pageerror', (e) => err.push(`${p.url().replace(B, '')}: ${e.message}`));
    if (tel) await entrarComo(p, tel); return p;
  };
  try {
    console.log('1 · El dueño compra 1 semana (Panel › Cobros y plan › Patrocinio, 1360)');
    const pd = await nueva(1360, 900, DUENO);
    await pd.goto(B + `/panel/${BIZ}/cobros/patrocinio`);
    ok(await espera(async () => (await texto(pd)).includes('6 de 6 puestos libres')), 'Elegir: «6 de 6 puestos libres»');
    ok((await texto(pd)).includes('1 semana') && (await texto(pd)).includes('$17') && (await texto(pd)).includes('1 mes'), 'duración 1 semana ($17, de Configuración) o 1 mes');
    await pd.screenshot({ path: OUT + 'pat002-elegir-1360.png', fullPage: true });
    await pd.getByRole('button', { name: /^Continuar · \$17$/ }).click();
    ok(await espera(async () => (await texto(pd)).includes('Revisar y pagar')), 'Revisar y pagar');
    const rv = await texto(pd);
    ok(rv.includes('Comida y Bebidas · Hazleton') && rv.includes('$17.00') && /Visa ·· 4242/i.test(rv) && rv.includes('Apagada'), 'dónde, total, tarjeta guardada y «Renovar» apagado de entrada');
    await pd.screenshot({ path: OUT + 'pat002-pagar-1360.png', fullPage: true });
    await pd.getByRole('button', { name: 'Pagar $17.00' }).click();
    ok(await espera(async () => sql(`select count(*) from sponsorships where business_id = '${BIZ}' and status = 'activo'`) === '1'), 'queda ACTIVO en la base');
    const SID = sql(`select id from sponsorships where business_id = '${BIZ}' and status = 'activo'`);
    ok(sql(`select price_cents || '|' || duration || '|' || auto_renew || '|' || category_id from sponsorships where id = ${SID}`) === '1700|week|false|NEG-FOOD', 'precio de Configuración ($17), 1 semana, sin renovar solo, en Comida');
    ok(sql(`select amount_cents || '|' || reason || '|' || (pi like 'pi_sim_%') from sponsorship_payments where kind = 'negocio' and ref_id = ${SID}`) === '1700|compra|true', 'el libro: un cobro de $17.00 por el simulador');
    ok(sql(`select count(*) from audit_entries where action = 'patrocinio.comprar' and target_id = '${BIZ}' and after->>'patrocinio' = '${SID}'`) === '1', 'queda en la auditoría');
    ok(await espera(async () => (await texto(pd)).includes('Ya sales en Patrocinados') && (await texto(pd)).includes('VISTAS')), 'Activo: hasta cuándo, vistas / entraron / pedidos');
    await pd.screenshot({ path: OUT + 'pat002-activo-1360.png', fullPage: true });
    ok(sql(`select count(*) from notifications where tpl = 'biz_patrocinio_activo' and user_id = '${D0}' and created_at > now() - interval '2 minutes'`) !== '0', 'aviso al dueño: «Ya sales en Patrocinados»');
    ponerCfg('patrocinio_semana_cents', 1500);

    console.log('2 · En la página de categoría (390 y 1360): la vitrina, los filtros y las cifras');
    const VEC = telLibre(), pv = await nueva(390, 844, VEC);
    await pv.goto(B + '/c/comida');
    const card = pv.locator(`[data-patrocinada="${SID}"]`);
    ok(await espera(async () => (await card.count()) > 0), '390: «Patrocinados» con Sabor Dominicano');
    const t390 = await texto(pv);
    ok(t390.includes('Patrocinados') && !/PATROCINADO|Anuncio/.test(t390), 'el título es el único aviso (sin etiqueta por tarjeta)');
    ok(await pv.locator('[data-buscador-categoria]').isVisible() && await pv.locator('[data-radio-portada]').isVisible(), 'un solo buscador sobre la portada y el radio');
    ok(await pv.locator('[role="tablist"] [role="tab"]').count() >= 2, 'una fila de pestañas (País · Antojos…)');
    ok(await espera(async () => sql(`select coalesce((select views from sponsorship_stats where kind = 'negocio' and ref_id = ${SID}), 0)`) === '1'), 'cuenta una vista');
    await pv.screenshot({ path: OUT + 'pat002-categoria-390.png' });
    await pv.reload();
    await pv.waitForTimeout(1500);
    ok(sql(`select views from sponsorship_stats where kind = 'negocio' and ref_id = ${SID}`) === '1', 'la misma persona el mismo día no suma otra vista');
    const rb = await b.newContext({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }); abiertas.push(rb);
    await (await rb.newPage()).goto(B + '/c/comida'); await new Promise((r) => setTimeout(r, 1200));
    ok(sql(`select views from sponsorship_stats where kind = 'negocio' and ref_id = ${SID}`) === '1', 'un robot no cuenta');
    const pw = await nueva(1360, 900);
    await pw.goto(B + '/c/comida');
    ok(await espera(async () => (await pw.locator(`[data-patrocinada="${SID}"]`).count()) > 0), '1360: la vitrina también');
    ok(await espera(async () => pw.getByText('Buscar en Comida y Bebidas').first().isVisible()), '1360: el buscador del header busca dentro de la categoría');
    await pw.reload();
    ok(await espera(async () => sql(`select views from sponsorship_stats where kind = 'negocio' and ref_id = ${SID}`) === '2'), 'otro visitante (sin cuenta, su dispositivo): 2 vistas');
    await pw.screenshot({ path: OUT + 'pat002-categoria-1360.png' });
    await pv.goto(B + '/c/comida?sub=Dominicana');
    ok(await espera(async () => (await pv.locator(`[data-patrocinada="${SID}"]`).count()) > 0), 'país «Dominicana»: sale');
    await pv.goto(B + '/c/comida?sub=Mexicana');
    await pv.waitForTimeout(800);
    ok(await pv.locator(`[data-patrocinada="${SID}"]`).count() === 0, 'país «Mexicana»: no sale (respeta el país)');
    const FX = sql(`select key from filter_options where category_id = 'NEG-FOOD' and active and key not in ('open', 'verified', 'r45') and not exists (select 1 from businesses x where x.id = '${BIZ}' and key = any(x.filter_values)) order by key limit 1`);
    await pv.goto(B + `/c/comida?f=${FX}`);
    await pv.waitForTimeout(800);
    ok(await pv.locator(`[data-patrocinada="${SID}"]`).count() === 0, `filtro «${FX}» que no tiene: no sale (respeta los filtros)`);
    await pv.goto(B + '/c/comida');
    await pv.locator(`[data-patrocinada="${SID}"]`).click();
    await pv.waitForURL(new RegExp(`/n/${BIZ}`));
    ok(await espera(async () => sql(`select coalesce((select entries from sponsorship_stats where kind = 'negocio' and ref_id = ${SID}), 0)`) === '1'), 'tocar la tarjeta: «entraron» 1');
    await pv.goto(B + '/c/comida'); await pv.locator(`[data-patrocinada="${SID}"]`).click(); await pv.waitForURL(new RegExp(`/n/${BIZ}`)); await pv.waitForTimeout(800);
    ok(sql(`select entries from sponsorship_stats where kind = 'negocio' and ref_id = ${SID}`) === '1', 'la misma persona el mismo día: sigue en 1');
    const U = sql(`select id from users where phone = '+1${VEC}'`);
    OP = `PAT${Date.now() % 1e9}`;
    sql(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key) values ('${OP}', 'order', 'hzl', '${BIZ}', '${U}', 'local', gen_random_uuid())`);
    await barrer();
    ok(sql(`select orders from sponsorship_stats where kind = 'negocio' and ref_id = ${SID}`) === '1', 'su pedido después de entrar: «pedidos» 1 (lo cuenta el barrido)');
    await pd.reload();
    ok(await espera(async () => /1\s*ENTRARON/.test(await texto(pd)) || (await texto(pd)).includes('ENTRARON')), 'el panel muestra las cifras');

    console.log('3 · Belleza con los 6 puestos ocupados: una barbería Free ve «Sin puestos», pide «Avísame» y reserva');
    const OTROS = sql(`select string_agg(id, ',' order by id) from (select b.id from businesses b join business_stats_cache c on c.business_id = b.id where b.category_id = 'NEG-BELL' and b.city_id = 'hzl' and b.status = 'active' and b.id not like '%-reclamo-%' order by (c.plan = 'free') desc, b.created_at, b.id limit 6) x`).split(',');
    OTROS.forEach((id, i) => sql(`insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id)
      values ('${id}', 'NEG-BELL', 'hzl', now() - interval '1 hour', ${DIA(i === 0 ? 3 : 7)}, 'week', 'activo', 1500, '${A0}')`));
    let septimo = '';
    try { sql(`insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id) values ('${BIZ}', 'NEG-BELL', 'hzl', now(), now() + interval '7 days', 'week', 'activo', 1500, '${A0}')`); } catch (e) { septimo = String(e.stderr ?? e.message); }
    ok(/patrocinio_sin_puestos/.test(septimo), 'la base no deja un séptimo a la vez');
    // Una barbería Free con dueña nueva: copia de una de la semilla con su propio id y teléfono (negocioSinDueno), que la dueña toma.
    const bar = negocioSinDueno(OTROS[0], 'Barbería Patrocinio');
    const pf = await nueva(390, 844, bar.tel);
    const UB = sql(`select id from users where phone = '+1${bar.tel}'`);
    sql(`update businesses set owner_user_id = '${UB}' where id = '${bar.id}'`);
    sql(`insert into business_members (business_id, user_id, kind, display_name, panel_access) values ('${bar.id}', '${UB}', 'owner', 'Dueña', '{all}')`);
    sql(`insert into business_stats_cache (business_id, plan) values ('${bar.id}', 'free') on conflict (business_id) do update set plan = 'free'`);
    tarjeta(bar.tel);
    await pf.goto(B + `/panel/${bar.id}/cobros/patrocinio`);
    ok(await espera(async () => (await texto(pf)).includes('6 de 6 ocupados')), 'Free: «6 de 6 ocupados»');
    const libre = sql(`select to_char(${HOY} + 3, 'FMDD')`);
    ok((await texto(pf)).includes(`Se libera uno el ${libre} `), `«Se libera uno el ${libre} …»`);
    await pf.screenshot({ path: OUT + 'pat002-sinpuestos-390.png', fullPage: true });
    await pf.getByRole('button', { name: 'Avísame si se libera antes' }).click();
    ok(await espera(async () => sql(`select count(*) from sponsorship_waits where business_id = '${bar.id}' and status = 'espera'`) === '1'), '«Avísame» queda anotado');
    await pf.getByRole('button', { name: new RegExp(`^Reservar desde el ${libre} · \\$15$`) }).click();
    ok(await espera(async () => (await texto(pf)).includes('Revisar y pagar')), 'Revisar y pagar la reserva');
    await pf.getByRole('button', { name: 'Pagar $15.00' }).click();
    ok(await espera(async () => sql(`select count(*) from sponsorships where business_id = '${bar.id}' and status = 'reservado'`) === '1'), 'Free: queda RESERVADO');
    ok(sql(`select (starts_at = ${DIA(3)}) || '|' || (ends_at = ${DIA(10)}) from sponsorships where business_id = '${bar.id}' and status = 'reservado'`) === 'true|true', 'desde el día que se libera, 7 días');
    ok(sql(`select status from sponsorship_waits where business_id = '${bar.id}' order by id desc limit 1`) === 'compro', 'su «Avísame» queda cumplido');
    ok(await espera(async () => (await texto(pf)).includes('Reservado desde el')), 'el panel dice «Reservado desde el …»');
    await pf.screenshot({ path: OUT + 'pat002-reservado-390.png', fullPage: true });
    const pb = await nueva(390, 844);
    await pb.goto(B + '/c/belleza');
    ok(await espera(async () => Number(await pb.locator('[data-patrocinados]').getAttribute('data-patrocinados').catch(() => '0')) >= 1), 'Belleza: la vitrina sale');
    ok(Number(await pb.locator('[data-patrocinados]').getAttribute('data-patrocinados')) <= 6, 'nunca más de 6');
    ponerCfg('patrocinio_puestos', 2);
    ok(await espera(async () => { await pb.goto(B + '/c/belleza'); return Number(await pb.locator('[data-patrocinados]').getAttribute('data-patrocinados')) <= 2; }, 25000), 'con 2 puestos en Configuración, la vitrina muestra 2 (rotan; no se quita a nadie)');
    ponerCfg('patrocinio_puestos', 6);
    const free = sql(`select string_agg(s.id::text, ',') from sponsorships s join business_stats_cache c on c.business_id = s.business_id where s.category_id = 'NEG-BELL' and s.status = 'activo' and c.plan = 'free'`);
    ok(!!free, 'un negocio Free también patrocina (la base)');

    console.log('4 · Super Admin › Crecimiento › Patrocinios: «Terminar» con motivo');
    const ad = await nueva(1360, 900, ADMIN);
    await ad.goto(B + '/admin/crecimiento?t=pat');
    ok(await espera(async () => (await texto(ad)).includes('Sabor Dominicano') && (await texto(ad)).includes('ACTIVO')), 'la lista con su estado');
    await ad.screenshot({ path: OUT + 'pat002-admin-1360.png', fullPage: true });
    const fila = ad.locator('div').filter({ hasText: /^Sabor Dominicano/ }).filter({ has: ad.getByRole('button', { name: 'Terminar' }) }).last();
    await fila.getByRole('button', { name: 'Terminar' }).click();
    await ad.getByText('El negocio pidió terminarlo.', { exact: true }).first().click();
    await ad.getByRole('button', { name: 'Terminar' }).last().click();
    ok(await espera(async () => sql(`select status || '|' || end_kind || '|' || end_reason from sponsorships where id = ${SID}`) === 'terminado|admin|El negocio pidió terminarlo.'), 'queda TERMINADO por To’Latino, con su motivo');
    ok(sql(`select count(*) from audit_entries where action = 'mkt.patrocinio.terminar' and reason = 'El negocio pidió terminarlo.' and after->>'patrocinio' = '${SID}'`) === '1', 'en la auditoría con el motivo');
    ok(sql(`select count(*) from notifications where tpl = 'biz_patrocinio_admin' and user_id = '${D0}' and created_at > now() - interval '2 minutes'`) !== '0', 'el dueño recibe el aviso con el motivo');
    await pv.goto(B + '/c/comida'); await pv.waitForTimeout(800);
    ok(await pv.locator(`[data-patrocinada="${SID}"]`).count() === 0, 'ya no sale en la vitrina (y nadie más patrocina en Comida: la sección no sale)');
    ok(await pv.locator('[data-patrocinados]').count() === 0, 'sin patrocinios vivos, «Patrocinados» no sale');

    console.log('5 · El barrido: empieza, vence, renueva o termina, y avisa a quien espera');
    const F = sql(`select string_agg(id, ',' order by id) from (select id from businesses where category_id = 'NEG-FOOD' and city_id = 'hzl' and status = 'active' and id <> '${BIZ}' order by created_at, id limit 4) x`).split(',');
    const ins = (biz, st, a, z, ren, pm) => sql(`with x as (insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
      values ('${biz}', 'NEG-FOOD', 'hzl', ${a}, ${z}, 'week', '${st}', 1500, '${D0}', ${pm ? `'${pm}'` : 'null'}, ${ren}) returning id) select id from x`);
    const R1 = ins(BIZ, 'activo', "now() - interval '7 days'", "now() - interval '1 minute'", true, PM);
    const R2 = ins(F[1], 'activo', "now() - interval '7 days'", "now() - interval '1 minute'", false, PM);
    const R3 = ins(F[2], 'activo', "now() - interval '7 days'", "now() - interval '1 minute'", true, PM_NO);
    const R4 = ins(F[3], 'reservado', "now() - interval '1 minute'", "now() + interval '7 days'", false, PM);
    sql(`insert into sponsorship_waits (kind, business_id, category_id, city_id, user_id) values ('negocio', '${BIZ}', 'NEG-FOOD', 'hzl', '${D0}')`);
    await barrer();
    ok(sql(`select status || '|' || end_kind from sponsorships where id = ${R1}`) === 'terminado|vencio' && sql(`select count(*) from sponsorships where renewed_from = ${R1} and status = 'activo' and auto_renew`) === '1', 'renovar solo encendido: termina y empieza el siguiente');
    ok(sql(`select amount_cents || '|' || reason from sponsorship_payments where ref_id = (select id from sponsorships where renewed_from = ${R1})`) === '1500|renovacion', 'la renovación cobra el precio de hoy (Configuración)');
    ok(sql(`select status from sponsorships where id = ${R2}`) === 'terminado' && sql(`select count(*) from sponsorships where renewed_from = ${R2}`) === '0', 'sin renovar: termina');
    ok(sql(`select status || '|' || (renew_note is not null) from sponsorships where id = ${R3}`) === 'terminado|true' && sql(`select count(*) from sponsorships where renewed_from = ${R3}`) === '0', 'la tarjeta no pasa: termina con el motivo, sin cobrar');
    ok(sql(`select status from sponsorships where id = ${R4}`) === 'activo', 'lo reservado empieza a su hora');
    ok(sql(`select status from sponsorship_waits where business_id = '${BIZ}' order by id desc limit 1`) === 'avisado', '«Avísame»: se avisa cuando hay puesto');
    // Los avisos van a los dueños: Sabor Dominicano tiene dueño (los de la semilla de los otros casos no).
    for (const tpl of ['biz_patrocinio_renovado', 'biz_patrocinio_libre'])
      ok(sql(`select count(*) from notifications where tpl = '${tpl}' and user_id = '${D0}' and created_at > now() - interval '3 minutes'`) !== '0', `aviso al dueño «${tpl}»`);
    ok(!err.length, 'sin errores en las páginas: ' + (err.join(' · ') || 'ninguno'));
    console.log(`\npat002 · ${n} comprobaciones en verde`);
  } finally {
    if (OP) sql(`update operations set status = 'cancelled' where number = '${OP}' and status = 'pending'`);   // el pedido de la prueba no queda pendiente en el panel
    terminarVivos('NEG-FOOD'); terminarVivos('NEG-BELL');
    for (const k of CFG) { const v = cfgAntes[k]; if (v) sql(`update platform_config set value = '${v}'::jsonb where key = '${k}'`); else sql(`delete from platform_config where key = '${k}'`); }
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
