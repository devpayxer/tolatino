// 6f · Series y eventos de varios días, de punta a punta (teléfono 390 y escritorio 1360) contra el simulador de pagos:
// crear una serie semanal en el editor del panel (DURACIÓN · Se repite · QUÉ DÍAS · CUÁNTAS FECHAS) → la base genera las fechas (cada
// semana, cada 2 semanas y «el último viernes» de cada mes), el barrido extiende la serie cuando el horizonte de Configuración avanza,
// editar «todas las fechas que vienen» con la revisión de 6a (organizador sin verificar → CAMBIO EN REVISIÓN; verificado → al instante)
// y «solo esta fecha» (mover una fecha de la serie con avisos y elección; cambiar el artista solo esa fecha), saltar una fecha sin gente
// (y con ventas: rechazado), cancelar UNA fecha (devuelve solo sus órdenes) y luego toda la serie, varios días con pase y boletos de un
// día y aforo por día (sin sobreventa en carrera; los días que vale cada boleto: el gancho de la puerta), RSVP por fecha, las páginas
// públicas (la lista muestra la serie UNA vez con la próxima fecha y «+N FECHAS»; la ficha con FECHAS y DÍAS Y HORARIO; «Vale solo el…»),
// la liquidación sigue siendo por fecha (una serie: cada fecha la suya; varios días: el último día, el martes después), el Super Admin
// (FECHAS / DÍAS en la ficha) e IDOR repitiendo las llamadas nuevas con otras cuentas. Deja los datos como estaban.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync, exec } = require('child_process'); const crypto = require('crypto');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlA = (q) => new Promise((res) => exec(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, (e, so, se) => res(e ? 'ERR ' + se : so.trim())));
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrido = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const RUN = Date.now().toString(36), TAG = `[e6f ${RUN}]`;
const C1 = '5705550122', C2 = '5705550299', C3 = '5705550288', TERRAZA = '5705550366', ADM = '5705550199', JUAN = '5705550444', LUIS = '5705550422';
const NEG = 'la-terraza-night', PAR = 'parroquia-santa-maria';
const btn = (p, t) => p.locator('button, [role="button"]', { hasText: t });
const chip = (p, k, l) => p.locator(`xpath=//span[normalize-space()="${k}"]/ancestor::div[1]//*[normalize-space()="${l}"]`);
const decidir = async (p, boton, nota, cta) => {
  await clic(p.getByRole('button', { name: boton }));
  { let t = null; for (let i = 0; i < 20 && !t; i++) { t = await vis(p.locator('textarea')); if (!t) await p.waitForTimeout(250); } if (t) await t.fill(nota ?? 'Cumple las reglas'); }
  await clic(p.getByRole('button', { name: cta, exact: true }));
};
const acciones = [];
const espiar = (p) => p.on('request', (r) => { const a = r.headers()['next-action']; if (a && r.method() === 'POST') acciones.push({ url: r.url(), a, body: r.postData() || '' }); });
const accion = (re) => [...acciones].reverse().find((x) => re.test(x.body));
const repetir = async (ctx, cap, body) => (await (await ctx.request.post(cap.url, { headers: { 'next-action': cap.a, 'content-type': 'text/plain;charset=UTF-8', origin: B, accept: 'text/x-component' }, data: body ?? cap.body })).text());
// La misma regla de la serie que la base (para comprobar lo que la base generó, calculado aparte en la prueba).
const DOW = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const sum = (iso, k) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + k)).toISOString().slice(0, 10); };
const dim = (y, m0) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const diaCorto = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${DS[DOW(iso)]} ${d} ${MES[m - 1]}`; };

(async () => {
  const ADMID = uid(ADM), U1 = uid(C1), U2 = uid(C2), U3 = uid(C3);
  const HOY = sql(`select to_char((now() at time zone 'America/New_York')::date, 'YYYY-MM-DD')`);
  const PREFS = Object.fromEntries([U1, U2, U3].map((u) => [u, sql(`select notif_prefs::text from users where id = '${u}'`)]));
  const VER_T = sql(`select count(*) from event_organizers where business_id = '${NEG}' and verified_at is not null`);
  const limpiar = () => {
    sql(`delete from platform_config where key in ('evt_dias_adelante', 'evt_fechas_max')`);
    sql(`update ticket_holds set status = 'released' where status = 'held' and event_id in (select id from events where title->>'es' like '%[e6f %')`);
    sql(`update tickets set status = 'void', void_reason = 'prueba' where status in ('valid', 'used') and event_id in (select id from events where title->>'es' like '%[e6f %')`);
    sql(`update rsvps set status = 'cancelled' where status = 'going' and event_id in (select id from events where title->>'es' like '%[e6f %')`);
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba', pending = null, pending_status = null where title->>'es' like '%[e6f %' and status <> 'cancelled'`);
    sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and queue in ('evt', 'evtcx', 'evtpago') and (subject_id in (select id::text from events where title->>'es' like '%[e6f %') or queue <> 'evt')`);
    sql(`begin; set local session_replication_role = replica; delete from event_settlements where event_id in (select id from events where title->>'es' like '%[e6f %'); commit;`);
  };
  limpiar();
  sql(`update event_organizers set verified_at = null, verified_by = null where business_id = '${NEG}'`);
  for (const u of Object.keys(PREFS)) sql(`update users set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || '{"quiet": false}'::jsonb where id = '${u}'`);
  // 9b-1 · Una tarjeta por persona y últimos 4 (antes una nueva en cada corrida: Marisol llegó a 11 y la lista de la app muestra 10).
  const tarjeta = (tel) => { const u = uid(tel); sql(`update payment_methods set is_default = false where user_id = '${u}'`); sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, status, simulated) values ('${u}', 'pm_sim_visa_4242_${crypto.createHash('md5').update(tel).digest('hex').slice(0, 8)}', 'visa', '4242', '12/30', true, 'active', true) on conflict (stripe_pm_id) do update set is_default = true, status = 'active'`); };
  // Un evento publicado (aprobado por una persona del equipo); las fechas las arma la base.
  const evento = (biz, fmt, titulo, inicio, o = {}) => {
    const tk = JSON.stringify(o.tks ?? [{ id: 'gen', n: { es: 'General', en: 'General' }, s: { es: '', en: '' }, p: 1500, cap: 5, off: false }]);
    const id = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, rsvp_capacity, party_max, kind, rep, span_days, day_hours, day_cap)
      values ('', 'hzl', '${biz}', '${fmt}', '{"es":"${titulo} ${TAG}","en":"${titulo} ${TAG}"}', '${inicio}'::date, ${o.h0 ?? 1200}, ${o.h1 ?? 1380}, '${o.entry ?? 'tickets'}', 'live', now(), now(), '${ADMID}', 0, '${ADMID}', 0,
              '${o.entry && o.entry !== 'tickets' ? '[]' : tk}'::jsonb, ${o.cap ?? 0}, ${o.pmax ?? 1}, '${o.kind ?? 'single'}', ${o.rep ? `'${JSON.stringify(o.rep)}'::jsonb` : 'null'}, ${o.span ?? 1}, ${o.dh ? `'${JSON.stringify(o.dh)}'::jsonb` : 'null'}, ${o.dcap ?? 0}) returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${id})`);
    cartel(id, biz);
    return { id, SLUG: sql(`select slug from events where id = ${id}`) };
  };
  // El cartel (la primera foto del negocio, otra fila de media): el editor exige cartel para guardar un evento publicado.
  const cartel = (id, biz) => sql(`insert into media (owner_kind, owner_id, url, w, h, status, sort, uploaded_by) select 'event', '${id}', url, w, h, 'visible', 0, uploaded_by from media where owner_kind = 'business' and owner_id = '${biz}' and status = 'visible' order by sort limit 1`);
  const fechas = (id) => sql(`select string_agg(local_date::text, ',' order by starts_at) from event_dates where event_id = ${id} and status = 'scheduled'`).split(',').filter(Boolean);
  const fid = (id, dia) => sql(`select id from event_dates where event_id = ${id} and local_date = '${dia}' and status <> 'skipped' order by starts_at limit 1`);
  const tipo = (id, k = 'gen') => sql(`select id from ticket_types where event_id = ${id} and cfg_key = '${k}'`);
  const pago = (num) => sql(`select p.status || '|' || p.amount_cents || '|' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${num}'`);
  const br = await chromium.launch();
  const ctx = async (w, h, mobile) => br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile });
  const comprar = async (p, slug, fecha, lineas) => {
    await p.goto(B + `/eventos/${slug}/boletos?fecha=${fecha}`);
    for (const [t, k] of lineas) for (let i = 0; i < k; i++) await clic(p.locator(`[data-tipo="${t}"] >> text="+"`));
    await clic(btn(p, 'Continuar')); await p.waitForURL(/\/eventos\/pagar\//);
    await clic(btn(p, /^Pagar \$/)); await p.waitForURL(/\/eventos\/orden\/B-/, { timeout: 20000 });
    return p.url().split('/').pop();
  };
  const err = [];
  try {
    const c1 = await ctx(390, 844, true), p1 = await c1.newPage(); espiar(p1); p1.on('pageerror', (e) => err.push(e.message));
    const c2 = await ctx(390, 844, true), p2 = await c2.newPage(); espiar(p2);
    const c3 = await ctx(390, 844, true), p3 = await c3.newPage(); espiar(p3);
    await entrar(p1, C1); tarjeta(C1); await entrar(p2, C2); tarjeta(C2); await entrar(p3, C3); tarjeta(C3);
    const cn = await ctx(1360, 900), pn = await cn.newPage(); espiar(pn); pn.on('pageerror', (e) => err.push(e.message)); await entrar(pn, TERRAZA);
    const cm = await ctx(390, 844, true), pm = await cm.newPage(); espiar(pm); pm.on('pageerror', (e) => err.push(e.message)); await entrar(pm, TERRAZA);
    const cj = await ctx(1360, 900), pj = await cj.newPage(); await entrar(pj, JUAN);
    const cl = await ctx(1360, 900), pl = await cl.newPage(); espiar(pl); await entrar(pl, LUIS);
    const ca = await ctx(1360, 900), pa = await ca.newPage(); await entrar(pa, ADM);

    // ── 1 · El editor del panel (teléfono): DURACIÓN «Se repite» · cada semana · dos días · 6 fechas → la base genera las fechas ──
    await pm.goto(B + `/panel/${NEG}/eventos?det=evt:new:noche`);
    await (await vis(pm.getByLabel('NOMBRE', { exact: true }))).fill(`Serie semanal ${TAG}`);
    await clic(chip(pm, 'DURACIÓN', 'Se repite'));
    ok(await contiene(pm, 'SE REPITE') && await contiene(pm, 'QUÉ DÍAS') && await contiene(pm, 'CUÁNTAS FECHAS') && await contiene(pm, 'Cada fecha tiene sus propios boletos'), 'editor: «Se repite» abre SE REPITE · QUÉ DÍAS · CUÁNTAS FECHAS y «Cada fecha tiene sus propios boletos»');
    const D0 = sum(HOY, 2), dw0 = DOW(D0), dw1 = (dw0 + 2) % 7, DLAB = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    await clic(chip(pm, 'QUÉ DÍAS', DLAB[dw1]));
    await clic(chip(pm, 'CUÁNTAS FECHAS', '6'));
    ok(await contiene(pm, 'Se repite · toca una para saltarla') && await contiene(pm, '6 fechas, hasta el'), 'el calendario marca la serie («Se repite · toca una para saltarla») y dice «6 fechas, hasta el …»');
    await pm.screenshot({ path: OUT + 'e6f-editor-serie-m.png', fullPage: true });
    await clic(pm.locator('[role="switch"][aria-label="Enviar a revisión al guardar"]'));
    await clic(pm.getByRole('button', { name: 'Guardar borrador', exact: true }));
    ok(await espera(() => sql(`select count(*) from events where title->>'es' = 'Serie semanal ${TAG}'`) === '1'), 'se guarda como borrador');
    const SW = sql(`select id from events where title->>'es' = 'Serie semanal ${TAG}'`);
    const esperadas = []; for (let x = D0; esperadas.length < 6; x = sum(x, 1)) if ([dw0, dw1].includes(DOW(x))) esperadas.push(x);
    ok(sql(`select kind || '|' || (rep->>'k') || '|' || (rep->>'n') from events where id = ${SW}`) === 'series|w|6' && fechas(SW).join(',') === esperadas.join(','), `la base generó las 6 fechas de la regla (${esperadas.map(diaCorto).join(' · ')})`);
    ok(sql(`select count(*) from event_dates where event_id = ${SW} and listable`) === '0', 'un borrador no sale al público (ninguna fecha listable)');

    // ── 2 · Cada 2 semanas y «el último viernes» de cada mes (la misma regla calculada aparte) ──
    const D2 = sum(HOY, 3);
    const S2 = evento(NEG, 'noche', 'Cada dos semanas', D2, { kind: 'series', rep: { k: '2w', days: [], n: 4, skip: [] } });
    ok(fechas(S2.id).join(',') === [0, 14, 28, 42].map((k) => sum(D2, k)).join(','), 'cada 2 semanas: 4 fechas, 14 días entre una y otra');
    const [yy, mm] = HOY.split('-').map(Number), ym = (i) => [yy + Math.floor((mm - 1 + i) / 12), (mm - 1 + i) % 12];
    const ultimoVie = (i) => { const [y, m0] = ym(i), d = dim(y, m0), w = new Date(Date.UTC(y, m0, d)).getUTCDay(); return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d - ((w - 5 + 7) % 7)).padStart(2, '0')}`; };
    const LV = ultimoVie(1);
    const SM = evento(NEG, 'noche', 'Ultimo viernes', LV, { kind: 'series', rep: { k: 'm', days: [], n: 4, skip: [] } });
    ok(fechas(SM.id).join(',') === [1, 2, 3, 4].map(ultimoVie).join(','), `cada mes «el último viernes»: ${[1, 2, 3, 4].map(ultimoVie).map(diaCorto).join(' · ')}`);
    ok(fechas(SM.id).every((x) => DOW(x) === 5 && Number(x.slice(8)) + 7 > dim(Number(x.slice(0, 4)), Number(x.slice(5, 7)) - 1)), 'todas son viernes y las últimas de su mes');

    // ── 3 · El horizonte de Configuración y el barrido extienden la serie ──
    sql(`insert into platform_config (key, value, updated_by) values ('evt_dias_adelante', '30', '${ADMID}') on conflict (key) do update set value = excluded.value`);
    const SL = evento(NEG, 'noche', 'Serie larga', sum(HOY, 1), { kind: 'series', rep: { k: 'w', days: [], n: 12, skip: [] } });
    const antes = fechas(SL.id).length;
    ok(antes === 5 && sql(`select dates_until from events where id = ${SL.id}`) === sum(HOY, 30), `con el horizonte en 30 días (Configuración): ${antes} de 12 fechas creadas`);
    sql(`delete from platform_config where key = 'evt_dias_adelante'`);
    barrido();
    ok(fechas(SL.id).length === 12 && sql(`select dates_until from events where id = ${SL.id}`) === sum(HOY, 180), 'el barrido (evtSeries) crea las que faltan cuando el horizonte avanza: 12 de 12');
    ok(sql(`select ok from (select last_error is null as ok from system_jobs where name = 'barrido.evtSeries') x`) === 't', 'la tarea evtSeries corre sin error en el barrido');
    sql(`insert into platform_config (key, value, updated_by) values ('evt_fechas_max', '4', '${ADMID}') on conflict (key) do update set value = excluded.value`);
    ok(/evt_fechas_max/.test(sqlErr(`update events set rep = jsonb_set(rep, '{n}', '6') where id = ${S2.id}`)), 'la base no deja pasar del tope de fechas de Configuración (4): evt_fechas_max');
    sql(`delete from platform_config where key = 'evt_fechas_max'`);

    // ── 4 · Vender una serie: cada fecha tiene sus boletos ──
    sql(`update events set status = 'live', submitted_at = now(), approved_at = now(), approved_by = '${ADMID}', start_min = 1200, end_min = 1380, doors_before_min = 0, tickets_cfg = '[{"id":"gen","n":{"es":"General","en":"General"},"s":{"es":"","en":""},"p":1500,"cap":5,"off":false}]'::jsonb,
           tables_cfg = '[]'::jsonb, addons_cfg = '[]'::jsonb where id = ${SW}`);
    sql(`select evt_sincronizar_fechas(${SW})`); cartel(SW, NEG);
    const SWSLUG = sql(`select slug from events where id = ${SW}`), [F1, F2, F3, F4] = esperadas.map((x) => fid(SW, x)), TG = tipo(SW);
    ok(sql(`select count(*) from ticket_stock where ticket_type_id = ${TG}`) === '6', 'cada fecha tiene su existencia (6 filas de ticket_stock)');
    const O2 = await comprar(p1, SWSLUG, F2, [[TG, 2]]), O3 = await comprar(p2, SWSLUG, F3, [[TG, 1]]), O1 = await comprar(p3, SWSLUG, F1, [[TG, 1]]);
    ok(sql(`select string_agg(event_date_id || ':' || sold_n, ',' order by event_date_id) from ticket_stock where ticket_type_id = ${TG} and sold_n > 0`) === [[F1, 1], [F2, 2], [F3, 1]].sort((a, b) => a[0] - b[0]).map((x) => x.join(':')).join(','), 'lo vendido se cuenta en su fecha (2 en la segunda, 1 en la tercera y 1 en la primera)');

    // ── 5 · La página pública: la lista muestra la serie UNA vez con la próxima fecha y «+N FECHAS»; la ficha, FECHAS ──
    await p1.goto(B + '/eventos');
    ok(await espera(async () => (await p1.locator(`[data-evento="${SW}"]`).count()) >= 1), 'la serie sale en /eventos');
    ok(await p1.locator(`[data-screen-label="APP-EVT-BUSQ · móvil"] [data-evento="${SW}"]`).count() === 1, '… una sola vez (su próxima fecha), no una tarjeta por fecha');
    ok(await contiene(p1, '+5 FECHAS'), 'la tarjeta dice «… · +5 FECHAS»');
    await p1.screenshot({ path: OUT + 'e6f-lista-m.png', fullPage: false });
    await p1.goto(B + `/eventos/${SWSLUG}?fecha=${F2}`);
    ok(await contiene(p1, 'FECHAS · CADA') && await contiene(p1, 'Cada fecha tiene sus boletos.'), 'la ficha: «FECHAS · CADA …» con las fechas y «Cada fecha tiene sus boletos.»');
    ok(await espera(async () => (await p1.locator('[data-screen-label="Ficha del evento · fechas"] button').count()) >= 6), 'la ficha muestra los chips de las 6 fechas');
    await p1.screenshot({ path: OUT + 'e6f-ficha-serie-m.png', fullPage: true });
    const cd = await ctx(1360, 900), pd = await cd.newPage(); await entrar(pd, C1);
    await pd.goto(B + `/eventos/${SWSLUG}?fecha=${F2}`); await contiene(pd, 'FECHAS · CADA'); await pd.screenshot({ path: OUT + 'e6f-ficha-serie-d.png', fullPage: true });
    await pd.goto(B + '/eventos'); await espera(async () => (await pd.locator(`[data-evento="${SW}"]`).count()) >= 1); await pd.screenshot({ path: OUT + 'e6f-lista-d.png', fullPage: false });
    ok(await pd.locator(`[data-evento="${SW}"]`).count() >= 1, 'escritorio: la serie en la lista');

    // ── 6 · Panel: FECHA QUE ESTÁS VIENDO, FECHAS (Saltar sin gente; con ventas no), QUIÉN SE PRESENTA, VENDIDOS POR DÍA ──
    sql(`insert into event_lineup (event_id, at_min, who, role, sort) values (${SW}, 1200, 'DJ Siempre', '{"es":"Set principal","en":"Main set"}', 0)`);
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${SW}@${F2}`);
    ok(await contiene(pn, 'FECHA QUE ESTÁS VIENDO · 6 FECHAS') && await contiene(pn, 'FECHAS · CADA') && await contiene(pn, 'VIENDO'), 'panel › la ficha: FECHA QUE ESTÁS VIENDO · 6 FECHAS y FECHAS · CADA … (la vista marcada VIENDO)');
    ok(await contiene(pn, '2 de ') && await contiene(pn, 'VENDIDOS POR DÍA'), 'todo es de esa fecha: 2 vendidos y VENDIDOS POR DÍA · 7 DÍAS');
    await pn.screenshot({ path: OUT + 'e6f-panel-ficha-d.png', fullPage: true });
    // Saltar la cuarta fecha (sin gente) → no sale; volver a ponerla.
    await clic(pn.getByRole('button', { name: 'Saltar' }).first());
    ok(await espera(() => sql(`select status from event_dates where id = ${F4}`) === 'skipped'), `Saltar ${diaCorto(esperadas[3])} (sin gente) → la fecha queda «skipped»`);
    ok(sql(`select listable from event_dates where id = ${F4}`) === 'f' && sql(`select rep->'skip' ? '${esperadas[3]}' from events where id = ${SW}`) === 't' && sql(`select count(*) from event_changes where event_id = ${SW} and kind = 'date_skipped'`) === '1', 'no sale al público, la regla la recuerda (rep.skip) y queda en event_changes (date_skipped)');
    const capSaltar = accion(new RegExp(`"${NEG}","${SW}","${F4}",true`));
    ok(!!capSaltar, 'se tiene la llamada de «Saltar»');
    ok(/no se puede saltar/.test(await repetir(cn, capSaltar, capSaltar.body.replace(`"${F4}"`, `"${F2}"`))) && sql(`select status from event_dates where id = ${F2}`) === 'scheduled', 'saltar una fecha con boletos vendidos (repitiendo la llamada) → rechazado; la fecha sigue');
    ok(!/"ok":true/.test(await repetir(cj, capSaltar)) && !/"ok":true/.test(await repetir(c3, capSaltar)), 'IDOR: el dueño de otro negocio y un vecino repiten «Saltar» → sin acceso');
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${SW}@${F2}`);
    await clic(pn.getByRole('button', { name: 'Volver a ponerla' }));
    ok(await espera(() => sql(`select status || '|' || listable from event_dates where id = ${F4}`) === 'scheduled|true'), '«Volver a ponerla» → la fecha vuelve y sale al público');
    // El artista solo esta fecha (la segunda): aviso a los que van, sin SMS.
    await clic(btn(pn, 'Cambiar artista solo esta fecha'));
    await (await vis(pn.locator('input[placeholder="Nombre del artista o grupo"]'))).fill('Grupo Invitado');
    await clic(btn(pn, 'Guardar solo esta fecha'));
    ok(await espera(() => sql(`select lineup_override->0->>'who' from event_dates where id = ${F2}`) === 'Grupo Invitado'), '«Guardar solo esta fecha» → el programa de esa fecha (lineup_override)');
    ok(sql(`select count(*) || '|' || string_agg(distinct sms_status, ',') from notifications where tpl = 'evt_artista' and user_id = '${U1}' and ref_kind = 'evt_artista' and ref_id like '${F2}:%'`) === '1|no', 'C1 (va a esa fecha) recibe «Cambio en el programa» en la app, sin SMS');
    await p2.goto(B + `/eventos/${SWSLUG}?fecha=${F2}`); ok(await contiene(p2, 'Grupo Invitado'), 'la ficha de esa fecha muestra al artista nuevo');
    await p2.goto(B + `/eventos/${SWSLUG}?fecha=${F3}`); ok(await contiene(p2, 'DJ Siempre') && !(await texto(p2)).includes('Grupo Invitado'), '… y otra fecha, el de siempre');
    const capArt = accion(new RegExp(`"${NEG}","${F2}","Grupo Invitado"`));
    ok(!/"ok":true/.test(await repetir(cj, capArt, capArt.body.replace('Grupo Invitado', 'Otro'))) && sql(`select lineup_override->0->>'who' from event_dates where id = ${F2}`) === 'Grupo Invitado', 'IDOR: Juan repite el cambio de artista → sin acceso');

    // ── 7 · Mover SOLO una fecha (la tercera, con C2): avisos SMS y la elección; la regla no la devuelve a su hora ──
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${SW}@${F3}`);
    await clic(btn(pn, `Cambiar el ${diaCorto(esperadas[2])}`));
    ok(await contiene(pn, 'CAMBIAR FECHA U HORA') && await contiene(pn, 'Les avisamos a las 1 personas que van'), 'hoja «Cambiar fecha u hora» de ESA fecha (1 persona va)');
    await clic(pn.locator('button[aria-label="Empieza +"]'));
    await clic(btn(pn, 'Cambiar la fecha'));
    ok(await contiene(pn, 'Avisamos a 1 personas'), '«Cambiar la fecha» → avisamos a 1 persona');
    ok(sql(`select to_char(starts_at at time zone 'America/New_York', 'HH24:MI') || '|' || (moved_at is not null) from event_dates where id = ${F3}`) === '20:30|true', 'esa fecha empieza 30 min después y queda «movida» (moved_at)');
    ok(sql(`select string_agg(distinct to_char(starts_at at time zone 'America/New_York', 'HH24:MI'), ',') from event_dates where event_id = ${SW} and status = 'scheduled' and id <> ${F3}`) === '20:00' && sql(`select start_min from events where id = ${SW}`) === '1200', 'las demás fechas y la regla del evento siguen a las 8 PM');
    ok(sql(`select count(*) || '|' || string_agg(distinct sms_status, ',') from notifications where tpl = 'evt_hora_cambio' and user_id = '${U2}' and ref_id = (select max(id)::text from event_changes where event_date_id = ${F3})`) === '1|pruebas', 'C2 recibe «Tu evento cambió de hora» por SMS (crítico; modo pruebas)');
    sql(`select evt_sincronizar_fechas(${SW})`);
    ok(sql(`select to_char(starts_at at time zone 'America/New_York', 'HH24:MI') from event_dates where id = ${F3}`) === '20:30', 'la base vuelve a generar la serie y la fecha movida NO vuelve a su hora');
    await p2.goto(B + `/eventos/orden/${O3}`); ok(await contiene(p2, 'Me quedo con la nueva fecha') && await contiene(p2, 'Devolución total'), 'la orden de C2: «Me quedo con la nueva fecha» / «Devolución total»');

    // ── 8 · Editar «todas las fechas que vienen» (hora de la serie): sin verificar → a revisión; al aprobar se mueven las fechas sin gente ──
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:edit:${SW}`);
    ok(await contiene(pn, 'o cómo se repite, To’Latino revisa el cambio'), 'el editor de una serie publicada avisa qué vuelve a revisión');
    await clic(pn.getByRole('button', { name: 'Empieza +' }).first());
    await clic(pn.getByRole('button', { name: 'Guardar', exact: true }));
    ok(await espera(() => sql(`select coalesce(pending_status, '-') from events where id = ${SW}`) === 'review'), 'sin verificar: el cambio de la serie queda en revisión');
    ok(sql(`select string_agg(distinct to_char(starts_at at time zone 'America/New_York', 'HH24:MI'), ',') from event_dates where event_id = ${SW} and status = 'scheduled' and id <> ${F3}`) === '20:00', 'mientras se revisa, las fechas siguen a su hora');
    await pa.goto(B + `/admin/eventos/${SW}`);
    ok(await contiene(pa, 'FECHAS · CADA') && await contiene(pa, 'movida'), 'Super Admin › la ficha: FECHAS · CADA … con la fecha movida');
    await pa.screenshot({ path: OUT + 'e6f-admin-ficha-d.png', fullPage: true });
    await decidir(pa, 'Aprobar', null, 'Aprobar');
    ok(await espera(() => sql(`select coalesce(pending_status, '-') || '|' || start_min from events where id = ${SW}`) === '-|1230'), 'aprobado: la serie empieza a las 8:30 PM');
    const H = sql(`select string_agg(local_date || '=' || to_char(starts_at at time zone 'America/New_York', 'HH24:MI'), ',' order by starts_at) from event_dates where event_id = ${SW} and status = 'scheduled'`);
    ok(H.includes(`${esperadas[0]}=20:00`) && H.includes(`${esperadas[1]}=20:00`) && H.includes(`${esperadas[3]}=20:30`) && H.includes(`${esperadas[4]}=20:30`), 'las fechas sin gente pasan a las 8:30; las que ya tienen boletos vendidos se quedan a su hora (se cambian una por una, con aviso)');
    // Verificado (la Parroquia): el cambio de la serie se aplica al instante.
    const SP = evento(PAR, 'fe', 'Rosario semanal', sum(HOY, 4), { entry: 'rsvp', cap: 2, pmax: 2, kind: 'series', rep: { k: 'w', days: [], n: 4, skip: [] }, h0: 1140, h1: 1260 });
    await pl.goto(B + `/panel/${PAR}/eventos?det=evt:edit:${SP.id}`);
    await clic(pl.getByRole('button', { name: 'Empieza +' }).first()); await clic(pl.getByRole('button', { name: 'Guardar', exact: true }));
    ok(await espera(() => sql(`select start_min || '|' || coalesce(pending_status, '-') from events where id = ${SP.id}`) === '1170|-'), 'verificado (Parroquia): el cambio de la serie se aplica al guardar');
    ok(sql(`select string_agg(distinct to_char(starts_at at time zone 'America/New_York', 'HH24:MI'), ',') from event_dates where event_id = ${SP.id} and status = 'scheduled'`) === '19:30', '… y todas sus fechas (sin gente) pasan a las 7:30 PM');

    // ── 9 · RSVP por fecha (cupo de 2 en cada fecha) ──
    const [R1, R2] = fechas(SP.id).map((x) => fid(SP.id, x));
    await p1.goto(B + `/eventos/${SP.SLUG}?fecha=${R1}`); await clic(btn(p1, /^Voy/));
    await p2.goto(B + `/eventos/${SP.SLUG}?fecha=${R1}`); await clic(p2.getByRole('button', { name: '2', exact: true }).first()); await clic(btn(p2, /^Voy/));
    ok(await espera(() => sql(`select rsvp_n from event_dates where id = ${R1}`) === '1'), 'C1 va a la primera fecha');
    ok(sql(`select rsvp_n from event_dates where id = ${R1}`) === '1' && sql(`select count(*) from rsvps where event_date_id = ${R1} and user_id = '${U2}' and status = 'going'`) === '0', 'C2 con 2 personas no cabe en la primera fecha (cupo 2, queda 1)');
    await p2.goto(B + `/eventos/${SP.SLUG}?fecha=${R2}`); await clic(p2.getByRole('button', { name: '2', exact: true }).first()); await clic(btn(p2, /^Voy/));
    ok(await espera(() => sql(`select rsvp_n from event_dates where id = ${R2}`) === '2'), '… pero en la segunda fecha sí: cada fecha tiene su cupo (RSVP por fecha)');
    const carrera = await Promise.all([U1, U2, U3].map((u) => sqlA(`insert into rsvps (event_date_id, event_id, city_id, user_id, party, hold_until, door_code) values (${R1}, ${SP.id}, 'hzl', '${u}', 1, now(), '')`)));
    ok(sql(`select rsvp_n from event_dates where id = ${R1}`) === '2' && carrera.filter((x) => !x.startsWith('ERR')).length <= 1, '3 a la vez por el último lugar de la primera fecha → la base deja entrar a uno (rsvp_n 2 de 2)');

    // ── 10 · Varios días (editor): CUÁNTOS DÍAS · Horario distinto · «Crear un boleto por cada día + pase» · Aforo por día ──
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:new:noche`);
    await (await vis(pn.getByLabel('NOMBRE', { exact: true }))).fill(`Festival de tres dias ${TAG}`);
    await clic(chip(pn, 'DURACIÓN', 'Varios días seguidos'));
    ok(await contiene(pn, 'CUÁNTOS DÍAS') && await contiene(pn, 'Días del evento') && await contiene(pn, '3 días seguidos'), 'editor: «Varios días seguidos» → CUÁNTOS DÍAS (3) y el calendario marca los días');
    await clic(pn.locator('[role="switch"][aria-label="Horario distinto cada día"]'));
    ok(await contiene(pn, 'El día 1 usa el horario de arriba'), '«Horario distinto cada día» abre el horario por día');
    await clic(btn(pn, 'Crear un boleto por cada día + pase'));
    ok(await contiene(pn, 'VALE PARA') && await contiene(pn, 'Todos los días · pase') && await contiene(pn, 'Aforo por día'), '«Crear un boleto por cada día + pase» → VALE PARA en cada boleto y «Aforo por día»');
    ok(!(await texto(pn)).includes('MESAS · CADA UNA SE VENDE UNA VEZ'), 'varios días no vende mesas (el editor no las ofrece)');
    for (let i = 0; i < 1; i++) await clic(pn.getByRole('button', { name: 'Aforo por día +' }));
    await pn.screenshot({ path: OUT + 'e6f-editor-dias-d.png', fullPage: true });
    await clic(pn.locator('[role="switch"][aria-label="Enviar a revisión al guardar"]'));
    await clic(pn.getByRole('button', { name: 'Guardar borrador', exact: true }));
    ok(await espera(() => sql(`select count(*) from events where title->>'es' = 'Festival de tres dias ${TAG}'`) === '1'), 'el festival se guarda');
    const FX = sql(`select id from events where title->>'es' = 'Festival de tres dias ${TAG}'`);
    ok(sql(`select kind || '|' || span_days || '|' || day_cap || '|' || jsonb_array_length(day_hours) || '|' || jsonb_array_length(tickets_cfg) from events where id = ${FX}`) === 'span|3|50|3|4', 'la base: span de 3 días, aforo 50 por día, horario de cada día y 4 boletos (pase + uno por día)');
    ok(sql(`select string_agg(day_index::text, ',' order by day_index) from event_dates where event_id = ${FX} and status = 'scheduled'`) === '0,1,2', 'una fecha por día (day_index 0, 1, 2)');
    // Publicado con aforo de 3 por día: pase ($40), boleto del primer día y del segundo día.
    sql(`update events set status = 'live', submitted_at = now(), approved_at = now(), approved_by = '${ADMID}', day_cap = 3,
           tickets_cfg = '[{"id":"pase","n":{"es":"Pase de los 3 días","en":"3-day pass"},"s":{"es":"","en":""},"p":4000,"cap":10,"off":false,"dy":null},{"id":"sab","n":{"es":"Segundo día","en":"Second day"},"s":{"es":"","en":""},"p":1500,"cap":10,"off":false,"dy":1},{"id":"vie","n":{"es":"Primer día","en":"First day"},"s":{"es":"","en":""},"p":1500,"cap":10,"off":false,"dy":0}]'::jsonb where id = ${FX}`);
    sql(`select evt_sincronizar_fechas(${FX})`);
    const FXS = sql(`select slug from events where id = ${FX}`), ANC = sql(`select evt_ancla(${FX})`), DIA0 = sql(`select id from event_dates where event_id = ${FX} and day_index = 0 and status = 'scheduled'`);
    const TP = tipo(FX, 'pase'), TS = tipo(FX, 'sab'), TV = tipo(FX, 'vie');
    ok(sql(`select count(*) from ticket_stock s join ticket_types t on t.id = s.ticket_type_id where t.event_id = ${FX} and not t.off`) === '3' && sql(`select count(distinct s.event_date_id) || '|' || min(s.event_date_id) from ticket_stock s join ticket_types t on t.id = s.ticket_type_id where t.event_id = ${FX}`) === `1|${ANC}`, 'la existencia vive en UNA fecha (el ancla: el último día)');
    await p1.goto(B + `/eventos/${FXS}?fecha=${DIA0}`);
    ok(await contiene(p1, 'DÍAS Y HORARIO') && await contiene(p1, '3 DÍAS') && await contiene(p1, 'Vale los 3 días'), 'la ficha: «… – … · 3 DÍAS», DÍAS Y HORARIO y «Vale los 3 días» en el pase');
    await p1.screenshot({ path: OUT + 'e6f-ficha-dias-m.png', fullPage: true });
    await pd.goto(B + `/eventos/${FXS}?fecha=${DIA0}`); await contiene(pd, 'DÍAS Y HORARIO'); await pd.screenshot({ path: OUT + 'e6f-ficha-dias-d.png', fullPage: true });
    await p1.goto(B + `/eventos/${FXS}/boletos?fecha=${ANC}`);
    ok(await contiene(p1, 'VALE SOLO EL') && await contiene(p1, 'VALE LOS 3 DÍAS'), 'la pantalla de boletos dice para qué día vale cada uno');
    await p1.screenshot({ path: OUT + 'e6f-boletos-dias-m.png', fullPage: true });
    const OP = await comprar(p1, FXS, ANC, [[TP, 2]]);
    ok(sql(`select string_agg(array_to_string(valid_days, ''), ',') from tickets where operation_id = (select id from operations where number = '${OP}')`) === '012,012', 'C1 compra 2 pases: cada pase vale los días 0, 1 y 2 (valid_days lo pone la base)');
    ok(sql(`select array_length(bol_fechas_validas(id), 1) from tickets where operation_id = (select id from operations where number = '${OP}') limit 1`) === '3', 'el gancho de la puerta: bol_fechas_validas(pase) = las 3 fechas');
    const OS = await comprar(p2, FXS, ANC, [[TS, 1]]);
    ok(sql(`select array_to_string(valid_days, ',') || '|' || array_length(bol_fechas_validas(id), 1) from tickets where operation_id = (select id from operations where number = '${OS}')`) === '1|1', 'C2 compra el segundo día: vale solo el día 1 (una fecha)');
    ok(sql(`select string_agg(sold_n::text, ',' order by event_date_id) from event_day_stock where event_id = ${FX}`) === '2,3,2', 'aforo por día: día 1 · 2, día 2 · 3 (lleno), día 3 · 2');
    await p3.goto(B + `/eventos/${FXS}/boletos?fecha=${ANC}`);
    ok(await espera(async () => (await p3.locator(`[data-tipo="${TS}"]`).first().innerText()).includes('AGOTADO')) && (await p3.locator(`[data-tipo="${TP}"]`).first().innerText()).includes('AGOTADO'), 'el día 2 lleno: su boleto y el pase salen AGOTADO; el del día 1 sigue a la venta');
    const OV = await comprar(p3, FXS, ANC, [[TV, 1]]);
    ok(sql(`select string_agg(sold_n::text, ',' order by event_date_id) from event_day_stock where event_id = ${FX}`) === '3,3,2', 'C3 compra el día 1 (lo que queda): día 1 · 3 de 3');
    const R = await Promise.all([U1, U2, U3].map((u, i) => sqlA(`update ticket_stock set held_n = held_n + 1 where ticket_type_id = ${[TS, TP, TV][i]} and event_date_id = ${ANC} and sold_n + held_n + 1 <= quantity`)));
    ok(R.every((x) => x.startsWith('ERR') && /event_day_stock_cupo/.test(x)) && sql(`select string_agg((sold_n + held_n)::text, ',' order by event_date_id) from event_day_stock where event_id = ${FX}`) === '3,3,2', 'en la base, tres a la vez por días llenos (día 2, pase y día 1) → ninguno pasa: la base no vende de más (check event_day_stock_cupo)');
    const r4 = await sqlA(`update ticket_stock set held_n = held_n + 1 where ticket_type_id = ${tipo(FX, 'pase')} and event_date_id = ${ANC}`);
    ok(/event_day_stock_cupo/.test(r4), 'aun sin la condición del código, el aforo del día lo rechaza la base');
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${FX}`); await clic(btn(pn, 'Cancelar evento'));
    ok(await contiene(pn, '¿POR QUÉ? LO VEN LOS QUE IBAN') && !(await texto(pn)).includes('QUÉ CANCELAS'), 'panel: un evento de varios días se cancela entero (sin «QUÉ CANCELAS»)');
    ok(await contiene(pn, 'POR DÍA · CUÁNTOS VAN · AFORO 3') && await contiene(pn, 'LLENO'), 'panel: POR DÍA · CUÁNTOS VAN · AFORO 3 con los días llenos');
    await pn.screenshot({ path: OUT + 'e6f-panel-dias-d.png', fullPage: true });
    await clic(btn(pn, 'No cancelar'));
    ok(/Ya vendiste|ya hay boletos|duración/.test(sqlErr(`update events set span_days = 4 where id = ${FX}`)), 'con boletos vendidos, los días del evento no cambian (la base: evt_forma_vendida)');

    // ── 11 · Cancelar UNA fecha de la serie (devuelve solo sus órdenes) y luego toda la serie ──
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${SW}@${F2}`);
    await clic(btn(pn, 'Cancelar una fecha o la serie'));
    ok(await contiene(pn, 'QUÉ CANCELAS') && await contiene(pn, `Solo el ${diaCorto(esperadas[1])}`) && await contiene(pn, 'Toda la serie'), 'QUÉ CANCELAS: «Solo el …» (la fecha que ves) / «Toda la serie»');
    await clic(btn(pn, 'Mal tiempo'));
    await clic(btn(pn, `Sí, cancelar el ${diaCorto(esperadas[1])}`));
    ok(await espera(() => pago(O2) === 'refunded|3000|3000'), `cancelar la segunda fecha → la orden de C1 (${O2}) vuelve al 100 %`);
    ok(pago(O3) === 'captured|1500|0' && pago(O1) === 'captured|1500|0' && sql(`select status from event_dates where id = ${F2}`) === 'cancelled' && sql(`select status from events where id = ${SW}`) === 'live', '… y solo esa: las órdenes de otras fechas siguen cobradas; la serie sigue en vivo');
    ok(sql(`select count(*) from notifications where tpl = 'evt_fecha_cancelada' and user_id = '${U1}' and ref_id = (select id::text from event_cancellations where event_date_id = ${F2})`) === '1', 'C1 recibe «Se canceló una fecha» (SMS crítico)');
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${SW}@${F3}`);
    ok(await contiene(pn, 'CANCELADA'), 'FECHAS: la segunda dice CANCELADA');
    await clic(btn(pn, 'Cancelar una fecha o la serie')); await clic(chip(pn, 'QUÉ CANCELAS', 'Toda la serie')); await clic(btn(pn, 'Cambio de planes'));
    await clic(btn(pn, 'Sí, cancelar el evento'));
    ok(await espera(() => pago(O3) === 'refunded|1500|1500' && pago(O1) === 'refunded|1500|1500'), 'toda la serie → C2 y C3 reciben el 100 %');
    ok(sql(`select status from events where id = ${SW}`) === 'cancelled' && sql(`select count(*) from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id where o.number = '${O2}'`) === '1', 'el evento queda cancelado y la orden de la fecha ya cancelada no se devuelve dos veces');

    // ── 12 · La liquidación sigue siendo por fecha: una serie (cada fecha la suya) y varios días (el último día) ──
    const S3 = evento(NEG, 'noche', 'Serie para pagar', sum(HOY, 2), { kind: 'series', rep: { k: 'w', days: [], n: 3, skip: [] } });
    const [G1, G2] = fechas(S3.id).map((x) => fid(S3.id, x)), T3 = tipo(S3.id);
    const P1 = await comprar(p1, S3.SLUG, G1, [[T3, 1]]), P2 = await comprar(p2, S3.SLUG, G2, [[T3, 2]]);
    sql(`update event_dates set starts_at = now() - interval '8 days', doors_at = now() - interval '8 days', ends_at = now() - interval '8 days' + interval '3 hours', local_date = ((now() - interval '8 days') at time zone 'America/New_York')::date where id = ${G1}`);
    barrido();
    ok(sql(`select count(*) from event_settlements where event_id = ${S3.id}`) === '1' && sql(`select status || '|' || net_cents from event_settlements where event_date_id = ${G1}`) === `paid|${Number(sql(`select sum(price_cents - fee_cents) from tickets where event_date_id = ${G1} and kind = 'paid'`))}`, 'la primera fecha terminó: su liquidación (una por fecha) se paga sola con su neto; la segunda no');
    ok(sql(`select status from event_dates where id = ${G1}`) === 'done' && sql(`select status from event_dates where id = ${G2}`) === 'scheduled', 'la fecha de la serie que pasó queda «done» en el barrido');
    ok(sql(`select (o.details->>'event_date_id') = '${ANC}' from operations o where o.number = '${OP}'`) === 't', 'varios días: la orden vive en el último día (su liquidación, el martes después del último día)');
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where id = ${S3.id}`);

    // ── 13 · Admin › lista: la serie y los días; escritorio y teléfono ──
    await pa.goto(B + `/admin/eventos?q=${encodeURIComponent('Festival de tres dias')}`);
    ok(await contiene(pa, '3 días'), 'Super Admin › Eventos: la lista dice «3 días»');
    await pa.goto(B + `/admin/eventos/${FX}`); ok(await contiene(pa, 'DÍAS ·') && await contiene(pa, 'con boleto o pase') && await contiene(pa, 'aforo 3'), 'la ficha del admin: DÍAS con lo de cada día y el aforo');
    await pa.screenshot({ path: OUT + 'e6f-admin-dias-d.png', fullPage: true });
    await pm.goto(B + `/panel/${NEG}/eventos?det=evt:${SP.id}`); // la Parroquia no es de La Terraza: no existe
    ok(await contiene(pm, 'Ya no está'), 'IDOR: el panel de La Terraza no abre la serie de la Parroquia');
    await pm.goto(B + `/panel/${NEG}/eventos`); await pm.screenshot({ path: OUT + 'e6f-panel-lista-m.png', fullPage: true });
    ok(err.length === 0, `sin errores de página (${err.join(' | ').slice(0, 200)})`);
    console.log(`\n${n} ✓`);
  } finally {
    limpiar();
    if (VER_T !== '0') sql(`update event_organizers set verified_at = now() where business_id = '${NEG}'`);
    for (const [u, v] of Object.entries(PREFS)) sql(`update users set notif_prefs = ${v ? `'${v}'::jsonb` : 'null'} where id = '${u}'`);
    await br.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
