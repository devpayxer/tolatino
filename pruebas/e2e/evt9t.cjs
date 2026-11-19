// 9t (19 nov) · Destacar eventos (LAUNCH «Destacar eventos»; 0183, featured 'eventos'). En Hazleton, con eventos de prueba de La Terraza:
// 1 · Super Admin › Crecimiento › Destacados › EVENTOS (1360): fijar A desde hoy hasta dentro de 5 días, con motivo → auditoría (mkt.destacado_evt.fijar).
// 2 · La página de Eventos (390 y 1360): «Destacados en Hazleton» (SectionHeader + la tarjeta del evento) con A; en la lista de su día, A sale PRIMERO aunque
//     otro empiece antes; con «Ver más» no se repite.
// 3 · El espejo: Panel › Eventos (el organizador) dice DESTACADO POR TO’LATINO en la lista y en la ficha; la ficha del evento en el Super Admin, DESTACADO EN EVENTOS.
// 4 · Programado: B desde mañana → PROGRAMADO en el Super Admin, no sale hoy.
// 5 · El tope (Configuración en 2): un tercero que se cruza con A y B no entra; ocultar A lo saca solo de Eventos (NO SALE) y libera el puesto: D entra.
// 6 · Retirar (con motivo, auditoría mkt.destacado_evt.retirar): sale al momento. 7 · La ficha del evento en el Super Admin: «Destacar en Eventos» (hasta).
// 8 · La base: ni un evento de otra ciudad, ni uno cancelado, ni dos vivos del mismo evento, ni borrar, ni editar.
// Precondiciones propias: los destacados de eventos vivos o programados de Hazleton se retiran (estados, nada se borra); el tope de Configuración
// se restaura; los eventos de prueba se cancelan al final.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright');
const { entrarComo, lejosDeMedianoche, medios, sql } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 300)); } return false; };
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const UA_TEL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UA_PC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const NEG = 'la-terraza-night', DUENO = '5705550366', ADMIN = '5705550199';
const RUN = Date.now().toString(36), TAG = `[e9t ${RUN}]`;
const motivo = async (p, t) => { await p.locator('textarea').last().fill(`${t} ${RUN}`); };
const toast = (p, re) => p.getByRole('status').filter({ hasText: re }).first().waitFor({ timeout: 10000 });
const CFG = 'destacados_evt_por_ciudad', cfgAntes = sql(`select value::text from platform_config where key = '${CFG}'`);
const ponerCfg = (v) => sql(`insert into platform_config (key, value, note) values ('${CFG}', to_jsonb(${v}), 'evt9t') on conflict (key) do update set value = excluded.value, note = excluded.note, updated_at = now()`);
const HOY = sql(`select (now() at time zone 'America/New_York')::date::text`), D = (k) => sql(`select ((now() at time zone 'America/New_York')::date + ${k})::text`);
const retirarVivos = (ADMID) => sql(`update featured set retired_at = now(), retired_by = '${ADMID}', retired_reason = 'evt9t: precondición' where city_id = 'hzl' and placement = 'eventos' and retired_at is null and to_at > now()`);

(async () => {
  await lejosDeMedianoche();
  const ADMID = sql(`select id from users where phone = '+1${ADMIN}'`);
  retirarVivos(ADMID);
  sql(`update businesses set modules_on = array(select distinct x from unnest(modules_on || array['eventos']) x), modules_off = modules_off - 'eventos' where id = '${NEG}'`);
  // Un evento publicado (aprobado por una persona del equipo); las fechas las arma la base. h0 en minutos desde medianoche.
  const evento = (titulo, dias, h0 = 1200) => {
    const id = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, kind, span_days)
      values ('', 'hzl', '${NEG}', 'noche', '{"es":"${titulo} ${TAG}","en":"${titulo} ${TAG}"}', (now() at time zone 'America/New_York')::date + ${dias}, ${h0}, ${h0 + 120}, 'rsvp', 'live', now(), now(), '${ADMID}', 0, '${ADMID}', 0,
              '[]'::jsonb, 'single', 1) returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${id})`);
    sql(`insert into media (owner_kind, owner_id, url, w, h, status, sort, uploaded_by) select 'event', '${id}', url, w, h, 'visible', 0, uploaded_by from media where owner_kind = 'business' and owner_id = '${NEG}' and status = 'visible' order by sort limit 1`);
    return id;
  };
  const A = evento('Gran Noche Destacada', 1, 1260), C = evento('Temprano sin destacar', 1, 600), BE = evento('Noche Programada', 3), DE = evento('Noche Cuarta', 4), E7 = evento('Noche de la ficha', 2);
  const titulo = (id) => sql(`select title->>'es' from events where id = ${id}`);
  sql('analyze event_dates');
  ponerCfg(4);
  await new Promise((r) => setTimeout(r, 16000));   // la caché de Configuración (15 s)
  const b = await chromium.launch(); const abiertas = [], err = [];
  const nueva = async (w, h, tel) => {
    const c = await b.newContext(w < 600 ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA_TEL } : { viewport: { width: w, height: h }, userAgent: UA_PC });
    abiertas.push(c); await medios(c); await c.addCookies([{ name: 'tl_loc', value: 'hzl|centro|30', url: B }]); const p = await c.newPage();
    p.on('pageerror', (e) => err.push(`${p.url().replace(B, '')}: ${e.message}`));
    if (tel) await entrarComo(p, tel); return p;
  };
  const M = '[data-screen-label="APP-EVT-BUSQ · móvil"]', DK = '[data-screen-label="APP-EVT-BUSQ · desktop"]';
  const fijarDesdeCrecimiento = async (pa, id, desde, hasta, m) => {
    await pa.goto(B + '/admin/crecimiento?t=feat&c=hzl'); await pa.getByText('FIJAR UN EVENTO').waitFor();
    await pa.getByLabel('DESDE (AAAA-MM-DD, HORA DE LA CIUDAD; HOY = AHORA)', { exact: true }).fill(desde);
    await pa.getByLabel('HASTA (EL ÚLTIMO DÍA QUE SALE; MÁXIMO 30 DÍAS)', { exact: true }).fill(hasta);
    await pa.getByPlaceholder('Nombre del evento').fill(titulo(id).split(' [')[0]);
    const fila = pa.getByText(titulo(id), { exact: true }).last();
    await fila.waitFor();
    await fila.locator('xpath=ancestor::div[.//div[@role="button"]][1]').getByText('Fijar', { exact: true }).click();
    await motivo(pa, m); await pa.getByText('Fijar', { exact: true }).last().click();
  };
  try {
    console.log('1 · Super Admin › Crecimiento › Destacados › EVENTOS: fijar A (hoy → +5)');
    const pa = await nueva(1360, 900, ADMIN);
    await pa.goto(B + '/admin/crecimiento?t=feat&c=hzl'); await pa.locator('[data-crecimiento="feat"]').waitFor();
    const t0 = await texto(pa);
    ok(t0.includes('NEGOCIOS') && t0.includes('EVENTOS') && t0.includes('HOY ARRIBA DE EVENTOS') && t0.includes('Fijados a la vez: 0 de 4'), 'Destacados: los dos grupos (NEGOCIOS y EVENTOS) y el tope de Configuración (0 de 4)');
    ok(t0.includes('Patrocinado es lo que paga el organizador'), 'dice que Destacado no es Patrocinado (lo pagado)');
    await fijarDesdeCrecimiento(pa, A, HOY, D(5), 'Evento de la comunidad');
    await toast(pa, /sale en Destacados de Eventos hasta el/);
    const FA = sql(`select id from featured where event_id = ${A} and retired_at is null and to_at > now()`);
    // 19 nov · El destacado no pasa de la última fecha del evento (A es de un solo día, mañana): «hasta» = el día siguiente a min(+5, su último día).
    const finA = sql(`select (least(((now() at time zone 'America/New_York')::date + 5), (select max(local_date) from event_dates where event_id = ${A} and listable and ends_at > now())) + 1)::text`);
    ok(!!FA && sql(`select placement || '|' || mode || '|' || city_id || '|' || (from_at <= now())::text || '|' || (to_at at time zone 'America/New_York')::date::text from featured where id = ${FA}`) === `eventos|fijar|hzl|true|${finA}`,
      'en la base: eventos · fijar · hzl · desde ahora · hasta el final de su último día (pedí +5; el servidor lo corta en la última fecha del evento)');
    ok(sql(`select count(*) from audit_entries where action = 'mkt.destacado_evt.fijar' and target_kind = 'event' and target_id = '${A}' and reason = 'Evento de la comunidad ${RUN}'`) === '1', 'en la auditoría con su motivo');
    await pa.goto(B + '/admin/crecimiento?t=feat&c=hzl'); await pa.getByText('EVENTOS FIJADOS').waitFor();
    ok((await texto(pa)).includes('Fijados a la vez: 1 de 4'), 'Fijados a la vez: 1 de 4');
    await pa.screenshot({ path: OUT + 'evt9t-admin-1360.png', fullPage: true });

    console.log('2 · La página de Eventos: «Destacados en Hazleton» y primero en la lista de su día');
    const pv = await nueva(390, 844);
    await pv.goto(B + '/eventos');
    ok(await espera(async () => (await pv.locator(`${M} [data-destacados-evt] [data-destacado-evt="${A}"]`).count()) === 1), '390: A en «Destacados en Hazleton»');
    ok((await pv.locator(`${M} [data-destacados-evt]`).innerText()).includes('Destacados en Hazleton'), 'con su título (SectionHeader, como Negocios › Destacados)');
    ok(await pv.locator(`${M} [data-destacados-evt] [data-destacado-evt="${C}"]`).count() === 0, 'lo no fijado no sale ahí');
    await pv.screenshot({ path: OUT + 'evt9t-eventos-390.png', fullPage: true });
    await pv.goto(B + `/eventos?dia=${D(1)}`);
    ok(await espera(async () => (await pv.locator(`${M} [data-evento="${C}"]`).count()) === 1), 'el día de A: también sale C');
    const orden = await pv.locator(`${M} > div.grid [data-evento]`).evaluateAll((xs) => xs.map((x) => x.getAttribute('data-evento')));
    ok(orden[0] === A && orden.indexOf(C) > 0, `A sale primero en la lista del día aunque C empiece antes (${orden.slice(0, 4).join(', ')})`);
    ok(orden.filter((x) => x === A).length === 1, 'A no se repite en la lista');
    const pd1 = await nueva(1360, 900);
    await pd1.goto(B + '/eventos');
    ok(await espera(async () => (await pd1.locator(`${DK} [data-destacados-evt] [data-destacado-evt="${A}"]`).count()) === 1), '1360: A en «Destacados en Hazleton»');
    await pd1.screenshot({ path: OUT + 'evt9t-eventos-1360.png', fullPage: true });

    console.log('3 · El espejo: el panel del organizador y la ficha del Super Admin');
    const pd = await nueva(1360, 900, DUENO);
    await pd.goto(B + `/panel/${NEG}/eventos`);
    ok(await espera(async () => (await texto(pd)).includes('DESTACADO POR TO’LATINO')), 'Panel › Eventos: la fila de A dice DESTACADO POR TO’LATINO');
    await pd.goto(B + `/panel/${NEG}/eventos?det=evt:${A}`);
    ok(await espera(async () => /DESTACADO POR TO’LATINO · Sale arriba de Eventos de tu ciudad y primero en la lista de su día hasta el/.test(await texto(pd))), 'la ficha de A: sale arriba de Eventos hasta el día que eligió el equipo');
    ok(!(await texto(pd)).includes(`Evento de la comunidad ${RUN}`), 'el motivo interno del equipo no sale en el panel');
    await pd.screenshot({ path: OUT + 'evt9t-panel-1360.png', fullPage: true });
    await pa.goto(B + `/admin/eventos/${A}`);
    ok(await espera(async () => (await texto(pa)).includes('DESTACADO EN EVENTOS · arriba de Eventos de la ciudad hasta el')), 'la ficha de A en el Super Admin: DESTACADO EN EVENTOS');

    console.log('4 · Programado: B desde mañana');
    await fijarDesdeCrecimiento(pa, BE, D(1), D(3), 'Fiesta patria de la ciudad');
    await toast(pa, /sale en Destacados de Eventos del/);
    const FB = sql(`select id from featured where event_id = ${BE} and retired_at is null and to_at > now()`);
    ok(!!FB && sql(`select (from_at > now())::text from featured where id = ${FB}`) === 'true', 'B: desde mañana (programado)');
    await pa.goto(B + '/admin/crecimiento?t=feat&c=hzl'); await pa.getByText('EVENTOS FIJADOS').waitFor();
    ok((await texto(pa)).includes('PROGRAMADO'), 'el Super Admin: PROGRAMADO');
    await pv.goto(B + '/eventos');
    ok(await espera(async () => (await pv.locator(`${M} [data-destacado-evt="${A}"]`).count()) === 1) && await pv.locator(`${M} [data-destacado-evt="${BE}"]`).count() === 0, 'hoy no sale B (empieza mañana)');

    console.log('5 · El tope (2) y lo que se cae solo');
    ponerCfg(2); await new Promise((r) => setTimeout(r, 16000));
    await fijarDesdeCrecimiento(pa, DE, HOY, D(4), 'Campaña de la ciudad');
    await toast(pa, /Ya hay 2 eventos fijados en esas fechas/);
    ok(sql(`select count(*) from featured where event_id = ${DE}`) === '0', 'el tercero no entra (lo impone la base)');
    sql(`update events set hidden_at = now(), hidden_by = '${ADMID}', hidden_reason = 'evt9t ${RUN}' where id = ${A}`);
    await pv.goto(B + '/eventos');
    ok(await espera(async () => (await pv.locator(`${M} [data-destacado-evt="${A}"]`).count()) === 0), 'A oculto: deja de salir solo (el servidor decide)');
    await pa.goto(B + '/admin/crecimiento?t=feat&c=hzl'); await pa.getByText('EVENTOS FIJADOS').waitFor();
    ok((await texto(pa)).includes('NO SALE'), 'el Super Admin: A · NO SALE');
    await fijarDesdeCrecimiento(pa, DE, HOY, D(4), 'Campaña de la ciudad');
    await toast(pa, /sale en Destacados de Eventos hasta el/);
    const FD = sql(`select id from featured where event_id = ${DE} and retired_at is null and to_at > now()`);
    ok(!!FD, 'lo oculto no ocupa puesto: D entra');
    sql(`update events set hidden_at = null, hidden_by = null, hidden_reason = null where id = ${A}`);

    console.log('6 · Retirar D (motivo, auditoría)');
    await pa.goto(B + '/admin/crecimiento?t=feat&c=hzl'); await pa.getByText('EVENTOS FIJADOS').waitFor();
    await pa.getByText(titulo(DE), { exact: true }).first().locator('xpath=ancestor::div[.//div[@role="button"]][1]').getByText('Retirar', { exact: true }).first().click();
    await motivo(pa, 'Ya no hace falta'); await pa.getByText('Retirar', { exact: true }).last().click(); await toast(pa, /ya no sale en Destacados de Eventos/);
    ok(sql(`select (retired_at is not null)::text from featured where id = ${FD}`) === 'true' && sql(`select count(*) from audit_entries where action = 'mkt.destacado_evt.retirar' and target_id = '${DE}' and reason = 'Ya no hace falta ${RUN}'`) === '1', 'retirado (nada se borra), con su auditoría');
    await pv.goto(B + '/eventos');
    ok(await espera(async () => (await pv.locator(`${M} [data-destacado-evt="${DE}"]`).count()) === 0), 'D ya no sale');

    console.log('7 · La ficha del evento en el Super Admin: «Destacar en Eventos»');
    sql(`update featured set retired_at = now(), retired_by = '${ADMID}', retired_reason = 'evt9t ${RUN}' where id in (${FA}, ${FB}) and retired_at is null`);
    await pa.goto(B + `/admin/eventos/${E7}`);
    await pa.getByText('Destacar en Eventos', { exact: true }).click();
    await pa.getByLabel('HASTA (AAAA-MM-DD, EL ÚLTIMO DÍA QUE SALE)', { exact: true }).fill(D(2));
    await motivo(pa, 'Evento de la comunidad'); await pa.getByText('Destacar', { exact: true }).last().click();
    await toast(pa, /sale en Destacados de Eventos hasta el/);
    ok(await espera(async () => (await texto(pa)).includes('DESTACADO EN EVENTOS')), 'la ficha: DESTACADO EN EVENTOS');
    ok(sql(`select count(*) from featured where event_id = ${E7} and retired_at is null and to_at > now()`) === '1', 'en la base');

    console.log('8 · La base');
    ok(/destacado_evento/.test(sqlErr(`insert into featured (city_id, event_id, placement, mode, to_at, by_staff_id, reason) values ('alt', ${C}, 'eventos', 'fijar', now() + interval '1 day', '${ADMID}', 'otra ciudad')`)), 'ni un evento de otra ciudad');
    ok(/ya tiene uno vivo/.test(sqlErr(`insert into featured (city_id, event_id, placement, mode, to_at, by_staff_id, reason) values ('hzl', ${E7}, 'eventos', 'fijar', now() + interval '1 day', '${ADMID}', 'otra vez')`)), 'ni dos vivos del mismo evento');
    ok(/no se borra/.test(sqlErr(`delete from featured where event_id = ${E7}`)) && /no se edita/.test(sqlErr(`update featured set to_at = to_at + interval '1 day' where event_id = ${E7} and retired_at is null`)), 'ni borrar ni editar');
    ok(/featured_que_check|destacado/.test(sqlErr(`insert into featured (city_id, event_id, placement, mode, to_at, by_staff_id, reason) values ('hzl', ${C}, 'eventos', 'quitar', now() + interval '1 day', '${ADMID}', 'quitar')`)), 'en eventos no hay «quitar»');
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'evt9t' where id = ${C}`);
    ok(/destacado_evento/.test(sqlErr(`insert into featured (city_id, event_id, placement, mode, to_at, by_staff_id, reason) values ('hzl', ${C}, 'eventos', 'fijar', now() + interval '1 day', '${ADMID}', 'cancelado')`)), 'ni uno cancelado');
    ok(!err.length, 'sin errores en las páginas: ' + (err.join(' · ') || 'ninguno'));
    console.log(`\nevt9t · ${n} comprobaciones en verde`);
  } finally {
    try { retirarVivos(sql(`select id from users where phone = '+1${ADMIN}'`)); } catch { /* */ }
    try { sql(`update events set hidden_at = null, hidden_by = null, hidden_reason = null where title->>'es' like '%${TAG}%' and hidden_at is not null`); } catch { /* */ }
    try { sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where title->>'es' like '%${TAG}%' and status <> 'cancelled'`); } catch { /* */ }
    try { if (cfgAntes) sql(`update platform_config set value = '${cfgAntes}'::jsonb where key = '${CFG}'`); else sql(`delete from platform_config where key = '${CFG}'`); } catch { /* */ }
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
