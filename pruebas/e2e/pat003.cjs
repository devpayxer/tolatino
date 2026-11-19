// C-003 · Página de Eventos (APP-EVT-BUSQ) por días + Patrocinados de eventos. En Hazleton, con eventos de prueba de La Terraza:
// 1 · El calendario (390): hoy es «Esta noche» con sus historias (abren «Esta noche»); los días pasados no se tocan; tocar otro día cambia la
//     dirección, el título, el número, las historias (abren la página del evento) y la lista; un evento de 3 días sale en cada uno de sus días.
// 2 · El dueño compra 1 semana desde Panel › Eventos › el evento › Patrocinar (1360; tarjeta del simulador) con el precio de Configuración.
// 3 · La vitrina: 390 (Patrocinado grande con PATROCINADO) y 1360 (fila «Patrocinados»); vistas (una por persona y día), entraron.
// 4 · «Hasta el evento» (390): la semana × semanas hasta el día del evento, termina con el evento y no se renueva.
// 5 · Sin puestos (Configuración en 2): «2 de 2 ocupados», «Avísame», reservar desde el día que se libera uno.
// 6 · Super Admin › Crecimiento › Patrocinios › EVENTOS: «Terminar» con motivo (auditoría, aviso).
// 7 · El barrido: un evento cancelado o que ya pasó termina su patrocinio (aviso); renovar solo cobra el precio de hoy; lo reservado empieza.
// 0175 (17 nov): el organizador no suma vistas a su propio patrocinio; «Terminar» del Super Admin devuelve lo que no se usó; un evento cancelado
//   devuelve los días que no se usaron (una fila en el libro, por la pasarela, avisado); 8 · un evento oculto o con Eventos apagado PAUSA su
//   patrocinio (no sale, no cuenta, EN PAUSA en el panel y el Super Admin) y al volver sigue alargado lo que duró la pausa; cancelado en pausa,
//   la pausa no cuenta como usada; 9 · 3-D Secure al comprar: la hoja del banco y un solo cobro.
// Precondiciones propias: lo vivo de Eventos en Hazleton queda terminado (estados, nada se borra); precios y puestos de fábrica se restauran.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, lejosDeMedianoche, medios, sql, tarjeta, telLibre } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 300)); } return false; };
const barrer = async () => { for (let i = 0; i < 20; i++) { const r = JSON.parse(execSync(`curl -s -m 300 -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString()); if (r.corrio) return r; await new Promise((x) => setTimeout(x, 1500)); } throw new Error('el barrido no corrió'); };
const UA_TEL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UA_PC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const NEG = 'la-terraza-night', DUENO = '5705550366', ADMIN = '5705550199';
const TAG = `[p3 ${Date.now().toString(36)}]`;
const terminarVivos = () => sql(`update event_sponsorships set status = case when status = 'reservado' then 'cancelado' else 'terminado' end, end_kind = 'vencio', ended_at = now(), auto_renew = false
  where city_id = 'hzl' and status in ('activo', 'reservado')`);
const CFG = ['patrocinio_evt_semana_cents', 'patrocinio_evt_puestos'];
const cfgAntes = Object.fromEntries(CFG.map((k) => [k, sql(`select value::text from platform_config where key = '${k}'`)]));
const ponerCfg = (k, v) => sql(`insert into platform_config (key, value, note) values ('${k}', to_jsonb(${v}), 'pat003') on conflict (key) do update set value = excluded.value, note = excluded.note, updated_at = now()`);
const HOY = sql(`select (now() at time zone 'America/New_York')::date::text`), D = (k) => sql(`select ((now() at time zone 'America/New_York')::date + ${k})::text`);
const WL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const tituloDe = (d) => { if (d === HOY) return 'Esta noche'; if (d === D(1)) return 'Mañana'; const [y, m, x] = d.split('-').map(Number), w = new Date(Date.UTC(y, m - 1, x)).getUTCDay(); return `${WL[w]} ${x}${d.slice(0, 7) !== HOY.slice(0, 7) ? ` ${MS[m - 1]}` : ''}`; };
const totalDe = (d) => Number(sql(`select count(distinct d.event_id) from event_dates d where d.listable and d.city_id = 'hzl' and d.starts_at > now() - interval '18 hours' and d.ends_at > now() and d.local_date = '${d}'
  and (d.geom is null or st_dwithin(d.geom, (select center from cities where id = 'hzl'), 5 * 1609.34))`));

(async () => {
  await lejosDeMedianoche();
  terminarVivos();
  sql(`update sponsorship_waits set status = 'avisado', notified_at = now() where kind = 'evento' and city_id = 'hzl' and status = 'espera'`);
  sql(`update businesses set modules_on = array(select distinct x from unnest(modules_on || array['eventos']) x), modules_off = modules_off - 'eventos' where id = '${NEG}'`);
  const ADMID = sql(`select id from users where phone = '+1${ADMIN}'`), D0 = sql(`select id from users where phone = '+1${DUENO}'`);
  const PM = tarjeta(DUENO);
  // Un evento publicado (aprobado por una persona del equipo); las fechas las arma la base.
  const evento = (titulo, dias, o = {}) => {
    const tk = JSON.stringify([{ id: 'gen', n: { es: 'General', en: 'General' }, s: { es: '', en: '' }, p: 1500, cap: 50, off: false }]);
    const id = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, kind, span_days)
      values ('', 'hzl', '${NEG}', 'noche', '{"es":"${titulo} ${TAG}","en":"${titulo} ${TAG}"}', (now() at time zone 'America/New_York')::date + ${dias}, ${o.h0 ?? 1200}, ${o.h1 ?? 1380}, 'tickets', 'live', now(), now(), '${ADMID}', 0, '${ADMID}', 21,
              '${tk}'::jsonb, '${o.span ? 'span' : 'single'}', ${o.span ?? 1}) returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${id})`);
    sql(`insert into media (owner_kind, owner_id, url, w, h, status, sort, uploaded_by) select 'event', '${id}', url, w, h, 'visible', 0, uploaded_by from media where owner_kind = 'business' and owner_id = '${NEG}' and status = 'visible' order by sort limit 1`);
    return id;
  };
  const HOYE = evento('Noche de hoy', 0);
  sql(`update event_dates set starts_at = now() + interval '2 hours', doors_at = now() + interval '2 hours', ends_at = now() + interval '5 hours', local_date = (now() at time zone 'America/New_York')::date where event_id = ${HOYE}`);
  const SPAN = evento('Festival de tres días', 2, { span: 3 });
  const A = evento('Gran Noche Patrocinada', 10), BE = evento('Concierto hasta el evento', 10), E = evento('Noche sin puestos', 12);
  const C = evento('Fiesta que se cancela', 5), PAS = evento('Noche que ya pasó', 3), F = evento('Serie que renueva', 20);
  const slug = (id) => sql(`select slug from events where id = ${id}`);
  sql('analyze event_dates');
  ponerCfg('patrocinio_evt_semana_cents', 1700); ponerCfg('patrocinio_evt_puestos', 6);
  await new Promise((r) => setTimeout(r, 16000));   // la caché de Configuración (15 s)
  const b = await chromium.launch(); const abiertas = [], err = [];
  const nueva = async (w, h, tel) => {
    const c = await b.newContext(w < 600 ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA_TEL } : { viewport: { width: w, height: h }, userAgent: UA_PC });
    abiertas.push(c); await medios(c); const p = await c.newPage();
    p.on('pageerror', (e) => err.push(`${p.url().replace(B, '')}: ${e.message}`));
    if (tel) await entrarComo(p, tel); return p;
  };
  const M = '[data-screen-label="APP-EVT-BUSQ · móvil"]';
  try {
    console.log('1 · El calendario (390): hoy, otro día, las historias y un evento de varios días');
    const pv = await nueva(390, 844);
    await pv.goto(B + '/eventos');
    ok(await espera(async () => (await pv.locator(`${M} [data-titulo-dia]`).innerText()) === 'Esta noche'), 'hoy: «Esta noche»');
    ok(await pv.locator(`${M} [data-dia="${HOY}"][data-dia-on]`).count() === 1 && (await pv.locator(`${M} [data-dia="${HOY}"]`).innerText()).includes('HOY'), 'el calendario marca HOY');
    ok(await pv.locator(`${M} [data-dia="${D(-1)}"]`).isDisabled() && await pv.locator(`${M} [data-dia="${D(-3)}"]`).isDisabled(), 'los días pasados están atenuados y no se tocan');
    ok(Number(await pv.locator(`${M} [data-conteo-dia]`).getAttribute('data-conteo-dia')) === totalDe(HOY), `el número de hoy (${totalDe(HOY)}) es el de la base`);
    ok(await pv.locator(`${M} [data-evento="${HOYE}"]`).count() === 1 && await pv.locator(`${M} [data-evento="${SPAN}"]`).count() === 0, 'la lista de hoy trae lo de hoy (y no lo de otros días)');
    const t0 = await texto(pv);
    ok(!t0.includes('VER COMO HISTORIAS') && !t0.includes('EL PRECIO QUE VES') && !t0.includes('ESTE FINDE'), 'sin «Ver como historias», sin la franja del precio y sin la fila de fechas');
    const anillo = await pv.locator(`${M} [data-historias] [data-historia]`).evaluateAll((xs) => xs.map((x) => getComputedStyle(x.firstElementChild).backgroundImage + '|' + getComputedStyle(x.firstElementChild).backgroundColor));
    ok(anillo.length >= 1 && anillo.every((x) => x.startsWith('none|') && !x.endsWith('rgba(0, 0, 0, 0)')), 'el anillo es morado sólido (sin degradado)');
    await pv.screenshot({ path: OUT + 'pat003-hoy-390.png', fullPage: true });
    const iHoy = await pv.locator(`${M} [data-historia]`).evaluateAll((xs, id) => xs.findIndex((x) => x.getAttribute('data-historia') === id), HOYE);
    await pv.locator(`${M} [data-historia="${HOYE}"]`).click();
    ok(await espera(async () => pv.url().includes(`/eventos/esta-noche?i=${iHoy}`)), 'una historia de hoy abre «Esta noche» en esa historia');
    await pv.goto(B + '/eventos');
    await pv.locator(`${M} [data-dia="${D(2)}"]`).click();
    ok(await espera(async () => pv.url().includes(`dia=${D(2)}`) && (await pv.locator(`${M} [data-titulo-dia]`).innerText()) === tituloDe(D(2))), `tocar otro día: «${tituloDe(D(2))}» y la dirección lleva el día`);
    ok(await espera(async () => Number(await pv.locator(`${M} [data-conteo-dia]`).getAttribute('data-conteo-dia')) === totalDe(D(2))), 'su número');
    ok(await pv.locator(`${M} [data-evento="${SPAN}"]`).count() === 1 && await pv.locator(`${M} [data-evento="${HOYE}"]`).count() === 0, 'su lista');
    await pv.screenshot({ path: OUT + 'pat003-otro-dia-390.png', fullPage: true });
    await pv.locator(`${M} [data-historia="${SPAN}"]`).click();
    ok(await espera(async () => pv.url().includes(`/eventos/${slug(SPAN)}`)), 'una historia de otro día abre la página del evento');
    for (const d of [D(2), D(3), D(4)]) {
      await pv.goto(B + `/eventos?dia=${d}`);
      ok(await espera(async () => (await pv.locator(`${M} [data-evento="${SPAN}"]`).count()) === 1), `el evento de 3 días sale el ${d}`);
    }
    await pv.goto(B + `/eventos?dia=${D(5)}`);
    ok((await pv.locator(`${M} [data-evento="${SPAN}"]`).count()) === 0, '… y no el día después');
    ok(await pv.locator(`${M} [data-dia="${D(3)}"]`).evaluate((x) => getComputedStyle(x.lastElementChild).backgroundColor !== 'rgba(0, 0, 0, 0)'), 'el día con eventos lleva su punto');
    await pv.goto(B + `/eventos?dia=${D(-2)}`);
    ok((await pv.locator(`${M} [data-titulo-dia]`).innerText()) === 'Esta noche', 'un día pasado en la dirección es hoy');

    console.log('2 · El dueño compra 1 semana (Panel › Eventos › el evento › Patrocinar, 1360)');
    const pd = await nueva(1360, 900, DUENO);
    await pd.goto(B + `/panel/${NEG}/eventos?det=evt:${A}`);
    ok(await espera(async () => (await texto(pd)).includes('Ver página') && (await texto(pd)).includes('Copiar enlace') && (await texto(pd)).includes('Repetir otro día')), 'la ficha del evento: Ver página, Copiar enlace, Editar, Repetir');
    await pd.getByRole('button', { name: 'Patrocinar', exact: true }).click();
    ok(await espera(async () => (await texto(pd)).includes('6 de 6 puestos libres')), 'Elegir: «6 de 6 puestos libres»');
    const el = await texto(pd);
    ok(el.includes('1 semana') && el.includes('$17') && el.includes('1 mes') && el.includes('Hasta el evento') && el.includes('$34'), 'duración: 1 semana ($17, de Configuración), 1 mes y «hasta el evento» ($17 × 2 semanas)');
    await pd.screenshot({ path: OUT + 'pat003-elegir-1360.png', fullPage: true });
    await pd.getByRole('button', { name: /^Continuar · \$17$/ }).click();
    ok(await espera(async () => (await texto(pd)).includes('Revisar y pagar')), 'Revisar y pagar');
    const rv = await texto(pd);
    ok(rv.includes('Eventos · Hazleton') && rv.includes('$17.00') && /Visa ·· 4242/i.test(rv) && rv.includes('Apagada'), 'evento, dónde, total, tarjeta guardada y «Renovar» apagado de entrada');
    await pd.screenshot({ path: OUT + 'pat003-pagar-1360.png', fullPage: true });
    await pd.getByRole('button', { name: 'Pagar $17.00' }).click();
    ok(await espera(async () => sql(`select count(*) from event_sponsorships where event_id = ${A} and status = 'activo'`) === '1'), 'queda ACTIVO en la base');
    const SA = sql(`select id from event_sponsorships where event_id = ${A} and status = 'activo'`);
    ok(sql(`select price_cents || '|' || duration || '|' || auto_renew || '|' || business_id from event_sponsorships where id = ${SA}`) === `1700|week|false|${NEG}`, 'precio de Configuración ($17), 1 semana, sin renovar solo, del organizador');
    ok(sql(`select amount_cents || '|' || reason || '|' || (pi like 'pi_sim_%') from sponsorship_payments where kind = 'evento' and ref_id = ${SA}`) === '1700|compra|true', 'el libro: un cobro de $17.00 por el simulador (kind evento)');
    ok(sql(`select count(*) from audit_entries where action = 'patrocinio_evento.comprar' and target_kind = 'event' and target_id = '${A}' and after->>'patrocinio' = '${SA}'`) === '1', 'queda en la auditoría');
    ok(await espera(async () => (await texto(pd)).includes('Tu evento sale en Patrocinados') && (await texto(pd)).includes('BOLETOS')), 'Activo: hasta cuándo, vistas / entraron / boletos');
    await pd.screenshot({ path: OUT + 'pat003-activo-1360.png', fullPage: true });
    ok(sql(`select count(*) from notifications where tpl = 'biz_patevt_activo' and user_id = '${D0}' and created_at > now() - interval '2 minutes'`) !== '0', 'aviso al dueño: «Tu evento ya sale en Patrocinados»');

    console.log('3 · La vitrina (390 y 1360), vistas y entraron');
    // Las vistas se cuentan desde lo que ya había (otra página abierta de la prueba puede haber mostrado la vitrina): +1 por persona nueva.
    const vistas = () => Number(sql(`select coalesce((select views from sponsorship_stats where kind = 'evento' and ref_id = ${SA}), 0)`));
    const VEC = telLibre(), pw = await nueva(390, 844, VEC);
    await new Promise((r) => setTimeout(r, 1500)); const V0 = vistas();
    await pw.goto(B + '/eventos');
    const card = pw.locator(`${M} [data-patrocinado-evt="${SA}"]`);
    ok(await espera(async () => (await card.count()) > 0), '390: el Patrocinado grande');
    ok((await pw.locator(`${M} [data-screen-label="Eventos · Patrocinado (C-003)"]`).innerText()).includes('PATROCINADO'), '390: dice PATROCINADO (no hay título de sección)');
    ok(await espera(async () => vistas() === V0 + 1), 'cuenta una vista');
    await pw.screenshot({ path: OUT + 'pat003-vitrina-390.png' });
    await pw.reload(); await pw.waitForTimeout(1500);
    ok(vistas() === V0 + 1, 'la misma persona el mismo día no suma otra vista');
    const pc = await nueva(1360, 900);
    await pc.goto(B + '/eventos');
    ok(await espera(async () => (await pc.locator(`[data-screen-label="APP-EVT-BUSQ · desktop"] [data-patrocinado-evt="${SA}"]`).count()) > 0), '1360: la fila «Patrocinados»');
    ok((await pc.locator('[data-screen-label="Eventos · Patrocinados · desktop (C-003)"] h2').innerText()) === 'Patrocinados', '1360: con el título «Patrocinados»');
    ok(await espera(async () => vistas() === V0 + 2), 'otro visitante (sin cuenta): una vista más');
    await pc.screenshot({ path: OUT + 'pat003-vitrina-1360.png', fullPage: true });
    // 0175 · El organizador (y su equipo) mira Eventos: su patrocinio sale, pero no suma una vista.
    await pd.goto(B + '/eventos');
    ok(await espera(async () => (await pd.locator(`[data-screen-label="APP-EVT-BUSQ · desktop"] [data-patrocinado-evt="${SA}"]`).count()) > 0), 'el organizador ve su patrocinio en la vitrina');
    await pd.waitForTimeout(2500);
    ok(vistas() === V0 + 2, 'el organizador no suma una vista a su propio patrocinio (ni su equipo)');
    await pc.goto(B + `/eventos?dia=${D(4)}`);
    ok(await pc.locator(`[data-screen-label="APP-EVT-BUSQ · desktop"] [data-patrocinado-evt="${SA}"]`).count() === 1, 'la vitrina sale igual en cualquier día');
    await pc.screenshot({ path: OUT + 'pat003-otro-dia-1360.png', fullPage: true });
    await card.first().click();
    await pw.waitForURL(new RegExp(`/eventos/${slug(A)}`));
    ok(await espera(async () => sql(`select coalesce((select entries from sponsorship_stats where kind = 'evento' and ref_id = ${SA}), 0)`) === '1'), 'tocar el Patrocinado: abre el evento y «entraron» 1');

    console.log('4 · «Hasta el evento» (390)');
    const pm = await nueva(390, 844, DUENO);
    await pm.goto(B + `/panel/${NEG}/eventos?det=evt:pat:${BE}`);
    ok(await espera(async () => (await texto(pm)).includes('5 de 6 puestos libres')), 'Elegir: «5 de 6 puestos libres»');
    await pm.getByText('Hasta el evento', { exact: true }).click();
    ok(await espera(async () => (await texto(pm)).includes('día del evento')), 'TERMINA: el día del evento');
    await pm.screenshot({ path: OUT + 'pat003-hasta-evento-390.png', fullPage: true });
    await pm.getByRole('button', { name: /^Continuar · \$34$/ }).click();
    ok(await espera(async () => (await texto(pm)).includes('no se renueva')), 'Revisar y pagar: «Hasta el evento» no se renueva');
    await pm.getByRole('button', { name: 'Pagar $34.00' }).click();
    ok(await espera(async () => sql(`select count(*) from event_sponsorships where event_id = ${BE} and status = 'activo'`) === '1'), 'queda ACTIVO');
    ok(sql(`select price_cents || '|' || duration || '|' || auto_renew || '|' || (ends_at = (select max(ends_at) from event_dates where event_id = ${BE})) from event_sponsorships where event_id = ${BE} and status = 'activo'`) === '3400|until_event|false|true', '$34 (2 semanas), hasta que termina el evento, sin renovar');
    ok(await espera(async () => (await texto(pm)).includes('termina con el evento')), 'Activo: «No se renueva: termina con el evento»');
    await pm.screenshot({ path: OUT + 'pat003-activo-390.png', fullPage: true });

    console.log('5 · Sin puestos (Configuración en 2): «Avísame» y reservar');
    ponerCfg('patrocinio_evt_puestos', 2); await new Promise((r) => setTimeout(r, 16000));
    await pm.goto(B + `/panel/${NEG}/eventos?det=evt:pat:${E}`);
    ok(await espera(async () => (await texto(pm)).includes('2 de 2 ocupados')), '«2 de 2 ocupados»');
    const libre = sql(`select to_char((ends_at at time zone 'America/New_York')::date, 'FMDD') from event_sponsorships where id = ${SA}`);
    ok((await texto(pm)).includes(`Se libera uno el ${libre} `), `«Se libera uno el ${libre} …»`);
    await pm.screenshot({ path: OUT + 'pat003-sinpuestos-390.png', fullPage: true });
    let septimo = '';
    try { sql(`insert into event_sponsorships (event_id, business_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id) values (${E}, '${NEG}', 'hzl', now(), now() + interval '7 days', 'week', 'activo', 1500, '${D0}')`); } catch (e) { septimo = String(e.stderr ?? e.message); }
    ok(/patrocinio_sin_puestos/.test(septimo), 'la base no deja uno más que los puestos a la vez');
    await pm.getByRole('button', { name: 'Avísame si se libera un puesto' }).click();
    ok(await espera(async () => sql(`select count(*) from sponsorship_waits where kind = 'evento' and business_id = '${NEG}' and status = 'espera'`) === '1'), '«Avísame» queda anotado');
    await pm.getByRole('button', { name: new RegExp(`^Reservar desde el ${libre} · \\$17$`) }).click();
    ok(await espera(async () => (await texto(pm)).includes('Revisar y pagar')), 'Revisar y pagar la reserva');
    await pm.getByRole('button', { name: 'Pagar $17.00' }).click();
    ok(await espera(async () => sql(`select count(*) from event_sponsorships where event_id = ${E} and status = 'reservado'`) === '1'), 'queda RESERVADO desde el día que se libera');
    ok(sql(`select status from sponsorship_waits where kind = 'evento' and business_id = '${NEG}' order by id desc limit 1`) === 'compro', 'su «Avísame» queda cumplido');
    ponerCfg('patrocinio_evt_puestos', 6); await new Promise((r) => setTimeout(r, 16000));   // la caché de Configuración

    console.log('6 · Super Admin › Crecimiento › Patrocinios › EVENTOS: «Terminar» con motivo');
    const ad = await nueva(1360, 900, ADMIN);
    await ad.goto(B + '/admin/crecimiento?t=pat');
    ok(await espera(async () => (await texto(ad)).includes('NEGOCIOS') && (await texto(ad)).includes('EVENTOS ·') && (await texto(ad)).includes(`Gran Noche Patrocinada ${TAG}`)), 'dos grupos (Negocios y Eventos) con su estado');
    await ad.screenshot({ path: OUT + 'pat003-admin-1360.png', fullPage: true });
    const fila = ad.locator('div').filter({ hasText: new RegExp(`^Gran Noche Patrocinada`) }).filter({ has: ad.getByRole('button', { name: 'Terminar' }) }).last();
    await fila.getByRole('button', { name: 'Terminar' }).click();
    await ad.getByText('El organizador pidió terminarlo.', { exact: true }).first().click();
    ok(await espera(async () => /Devolver lo que no se usó · \$\d+\.\d\d/.test(await texto(ad))), '«Devolver lo que no se usó · $…» marcado de entrada');
    await ad.getByRole('button', { name: 'Terminar' }).last().click();
    ok(await espera(async () => sql(`select status || '|' || end_kind || '|' || end_reason from event_sponsorships where id = ${SA}`) === 'terminado|admin|El organizador pidió terminarlo.'), 'queda TERMINADO por To’Latino, con su motivo');
    const DA = sql(`select coalesce(refund_cents, 0) || '|' || coalesce(refund_days, 0) from event_sponsorships where id = ${SA}`).split('|').map(Number);
    // De madrugada no se usó ningún día: los 7 de 7 (el total) es lo justo (18 nov).
    // 19 nov · Los días comprados son los de ESTE patrocinio (hasta el evento: de madrugada faltan 6, no 7; la base devolvió 6 de 6 = el total y
    // la prueba esperaba «de 7»). La misma cuenta que patrocinio_devolucion: días redondeados, y todos los días = el precio entero.
    const [PR, TOT] = sql(`select price_cents || '|' || greatest(1, ceil((extract(epoch from ends_at - starts_at) - extended_secs) / 86400.0 - 1 / 24.0))::int from event_sponsorships where id = ${SA}`).split('|').map(Number);
    ok(DA[0] > 0 && DA[0] <= PR && DA[1] >= 1 && DA[1] <= TOT && DA[0] === (DA[1] >= TOT ? PR : Math.floor(PR * DA[1] / TOT)), `la base decide devolver ${DA[1]} de ${TOT} días ($${(DA[0] / 100).toFixed(2)} de $${(PR / 100).toFixed(2)})`);
    ok(await espera(async () => sql(`select amount_cents || '|' || refund_motive from sponsorship_payments where kind = 'evento' and ref_id = ${SA} and reason = 'devolucion'`) === `${DA[0]}|admin`), 'el libro: su devolución (kind evento)');
    ok(await espera(async () => sql(`select count(*) from notifications where tpl = 'biz_patevt_devuelto' and user_id = '${D0}' and created_at > now() - interval '2 minutes'`) !== '0'), 'aviso: «Te devolvimos lo que no se usó»');
    ok(sql(`select count(*) from audit_entries where action = 'mkt.patrocinio_evento.terminar' and reason = 'El organizador pidió terminarlo.' and after->>'patrocinio' = '${SA}'`) === '1', 'en la auditoría con el motivo');
    ok(sql(`select count(*) from notifications where tpl = 'biz_patevt_admin' and user_id = '${D0}' and created_at > now() - interval '2 minutes'`) !== '0', 'el organizador recibe el aviso con el motivo');
    await pc.goto(B + '/eventos'); await pc.waitForTimeout(800);
    ok(await pc.locator(`[data-patrocinado-evt="${SA}"]`).count() === 0, 'ya no sale en la vitrina');

    console.log('7 · El barrido: evento cancelado, evento que ya pasó, renovar solo y lo reservado');
    const ins = (ev, a, z, ren) => sql(`with x as (insert into event_sponsorships (event_id, business_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
      values (${ev}, '${NEG}', 'hzl', ${a}, ${z}, 'week', 'activo', 1500, '${D0}', '${PM}', ${ren}) returning id) select id from x`);
    // El cobro de un patrocinio puesto a mano (en el libro y en el simulador), para que haya qué devolver.
    const cobro = (sid, cents) => { const pi = `pi_sim_p3-${sid}-${Date.now().toString(36)}`;
      sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card, capture_method) values ('${pi}', ${cents}, 0, 'tolatino', 'succeeded', ${cents}, '${PM}', 'automatic')`);
      sql(`insert into sponsorship_payments (kind, ref_id, business_id, city_id, payer_user_id, amount_cents, pi, idem_key, card_brand, card_last4, reason) values ('evento', ${sid}, '${NEG}', 'hzl', '${D0}', ${cents}, '${pi}', 'p3-${pi}', 'visa', '4242', 'compra')`);
      return pi; };
    const SC = ins(C, 'now()', "now() + interval '7 days'", false), SP = ins(PAS, 'now()', "now() + interval '7 days'", false);
    const PIC = cobro(SC, 1500);
    const SF = ins(F, "now() - interval '7 days'", "now() - interval '1 minute'", true);
    await pc.goto(B + '/eventos');
    ok(await espera(async () => (await pc.locator(`[data-screen-label="APP-EVT-BUSQ · desktop"] [data-patrocinado-evt="${SC}"]`).count()) === 1), 'el patrocinio del evento que se va a cancelar sale');
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'business', cancel_reason = 'prueba ${TAG}' where id = ${C}`);
    await pc.reload(); await pc.waitForTimeout(800);
    ok(await pc.locator(`[data-patrocinado-evt="${SC}"]`).count() === 0, 'cancelado el evento, la vitrina ya no lo muestra (antes del barrido)');
    sql(`update event_dates set starts_at = now() - interval '3 hours', doors_at = now() - interval '3 hours', ends_at = now() - interval '1 minute', local_date = (now() at time zone 'America/New_York')::date where event_id = ${PAS}`);
    await barrer();
    ok(sql(`select status || '|' || end_kind from event_sponsorships where id = ${SC}`) === 'terminado|evento_cancelado', 'evento cancelado: su patrocinio termina solo');
    ok(sql(`select count(*) from notifications where tpl = 'biz_patevt_cancelado' and user_id = '${D0}' and created_at > now() - interval '3 minutes' and body like '%devolvemos%'`) !== '0', '… y avisa al organizador (que se le devuelve lo que no se usó)');
    ok(sql(`select refund_cents || '|' || refund_days || '|' || refund_motive from event_sponsorships where id = ${SC}`) === '1500|7|evento_cancelado', 'evento cancelado: la base decide devolver los días que no se usaron (7 de 7: $15.00)');
    ok(sql(`select amount_cents || '|' || (refund_id like 're_sim_%') from sponsorship_payments where kind = 'evento' and ref_id = ${SC} and reason = 'devolucion'`) === '1500|true' && sql(`select refunded_cents from sim_intents where id = '${PIC}'`) === '1500', '… y la pasarela lo devuelve (una fila en el libro)');
    ok(sql(`select count(*) from audit_entries where action = 'patrocinio_evento.devolver' and target_id = '${C}' and after->>'patrocinio' = '${SC}'`) === '1', '… auditado');
    ok(sql(`select count(*) from notifications where tpl = 'biz_patevt_devuelto' and user_id = '${D0}' and created_at > now() - interval '3 minutes'`) !== '0', '… y avisado («Te devolvimos lo que no se usó»)');
    ok(sql(`select status || '|' || end_kind from event_sponsorships where id = ${SP}`) === 'terminado|evento_paso', 'evento que ya pasó: su patrocinio termina solo');
    ok(sql(`select status || '|' || end_kind from event_sponsorships where id = ${SF}`) === 'terminado|vencio' && sql(`select count(*) from event_sponsorships where renewed_from = ${SF} and status = 'activo' and auto_renew`) === '1', 'renovar solo encendido: termina y empieza el siguiente');
    ok(sql(`select amount_cents || '|' || reason from sponsorship_payments where kind = 'evento' and ref_id = (select id from event_sponsorships where renewed_from = ${SF})`) === '1700|renovacion', 'la renovación cobra el precio de hoy (Configuración)');
    ok(sql(`select count(*) from notifications where tpl = 'biz_patevt_renovado' and user_id = '${D0}' and created_at > now() - interval '3 minutes'`) !== '0', 'aviso «se renovó»');
    ok(sql(`select status from event_sponsorships where event_id = ${E} and status in ('activo', 'reservado')`) === 'reservado', 'lo reservado sigue reservado hasta su día');
    ok(sql(`select refund_cents is null from event_sponsorships where id = ${SP}`) === 't', 'evento que ya pasó sin pausa: nada que devolver (lo dice la pantalla)');

    console.log('8 · Evento oculto / Eventos apagado: el patrocinio se pausa y, al volver, sigue alargado');
    const G = evento('Noche que se oculta', 8);
    const SG = ins(G, "now() - interval '5 days'", "now() + interval '2 days'", false); cobro(SG, 1500);
    const finG = () => sql(`select extract(epoch from ends_at)::bigint from event_sponsorships where id = ${SG}`);
    const fin0 = Number(finG());
    await pc.goto(B + '/eventos');
    ok(await espera(async () => (await pc.locator(`[data-screen-label="APP-EVT-BUSQ · desktop"] [data-patrocinado-evt="${SG}"]`).count()) === 1), 'su patrocinio sale en la vitrina');
    sql(`update events set hidden_at = now(), hidden_reason = 'prueba ${TAG}' where id = ${G}`);
    await barrer();
    ok(sql(`select (paused_at is not null) || '|' || status from event_sponsorships where id = ${SG}`) === 'true|activo', 'evento oculto: el patrocinio queda EN PAUSA (sigue activo, guarda su puesto)');
    ok(sql(`select count(*) from notifications where tpl = 'biz_patevt_pausa' and user_id = '${D0}' and created_at > now() - interval '3 minutes'`) !== '0', 'aviso: «El patrocinio de tu evento está en pausa»');
    await pc.reload(); await pc.waitForTimeout(800);
    ok(await pc.locator(`[data-patrocinado-evt="${SG}"]`).count() === 0, 'en pausa no sale en la vitrina');
    ok(sql(`select patrocinio_vistas('evento', array[${SG}]::bigint[], null, gen_random_uuid())`) === '0' && sql(`select patrocinio_entro('evento', ${SG}, null, gen_random_uuid())`) === 'f', 'en pausa no cuenta vistas ni «entraron» (la base)');
    await pd.goto(B + `/panel/${NEG}/eventos?det=evt:pat:${G}`);
    ok(await espera(async () => (await texto(pd)).includes('EN PAUSA') && (await texto(pd)).includes('se alarga lo que duró la pausa')), 'el panel: EN PAUSA y que se alarga al volver');
    await pd.screenshot({ path: OUT + 'pat003-pausa-1360.png', fullPage: true });
    await ad.goto(B + '/admin/crecimiento?t=pat');
    ok(await espera(async () => (await texto(ad)).includes('EN PAUSA')), 'el Super Admin: EN PAUSA');
    await ad.screenshot({ path: OUT + 'pat003-admin-pausa-1360.png', fullPage: true });
    sql(`update event_sponsorships set paused_at = now() - interval '2 days' where id = ${SG}`);   // como si llevara 2 días oculto
    sql(`update events set hidden_at = null, hidden_reason = null where id = ${G}`);
    await barrer();
    const P = sql(`select (paused_at is null) || '|' || paused_secs || '|' || extended_secs from event_sponsorships where id = ${SG}`).split('|');
    ok(P[0] === 'true' && Number(P[1]) >= 2 * 86400 && Number(P[1]) < 2 * 86400 + 900 && P[2] === P[1], 'vuelve a verse: sigue, y se alarga lo que duró la pausa (2 días)');
    ok(Number(finG()) === fin0 + Number(P[2]), 'su fin se movió exactamente lo alargado');
    ok(sql(`select count(*) from notifications where tpl = 'biz_patevt_sigue' and user_id = '${D0}' and created_at > now() - interval '3 minutes'`) !== '0', 'aviso: «El patrocinio de tu evento siguió»');
    await pc.reload();
    ok(await espera(async () => (await pc.locator(`[data-screen-label="APP-EVT-BUSQ · desktop"] [data-patrocinado-evt="${SG}"]`).count()) === 1), 'vuelve a salir en la vitrina');
    let mueve = ''; try { sql(`update event_sponsorships set ends_at = ends_at + interval '3 days' where id = ${SG}`); } catch (e) { mueve = String(e.stderr ?? e.message); }
    ok(/el fin solo se alarga lo que estuvo en pausa/.test(mueve), 'la base no deja mover el fin pagado por fuera de la pausa');
    sql(`update businesses set modules_on = array_remove(modules_on, 'eventos') where id = '${NEG}'`);
    await barrer();
    ok(sql(`select (paused_at is not null) from event_sponsorships where id = ${SG}`) === 't', 'Eventos apagado en el negocio: su patrocinio también se pausa');
    sql(`update event_sponsorships set paused_at = now() - interval '1 day' where id = ${SG}`);   // como si llevara 1 día apagado
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'business', cancel_reason = 'prueba ${TAG}' where id = ${G}`);
    sql(`update businesses set modules_on = array(select distinct x from unnest(modules_on || array['eventos']) x) where id = '${NEG}'`);
    await barrer();
    // Comprado 7 días; corrió 2 (5 desde que empezó, menos 3 en pausa): se devuelven 5 de 7.
    ok(sql(`select status || '|' || end_kind || '|' || refund_days || '|' || refund_cents from event_sponsorships where id = ${SG}`) === `terminado|evento_cancelado|5|${Math.floor(1500 * 5 / 7)}`, 'cancelado después de una pausa: la pausa no cuenta como usada (5 de 7 días: $10.71)');
    ok(sql(`select count(*) from event_sponsorships where status = 'activo' and paused_at is not null and business_id = '${NEG}'`) === '0', 'con Eventos encendido otra vez, nada queda en pausa');
    ok(sql(`select cents || '|' || dias from patrocinio_devolucion('pausa', 1500, now() - interval '7 days', now(), 0, 2 * 86400 + 60, null, now())`) === '428|2', 'una pausa que no se pudo alargar (2 días de 7): se devuelven $4.28 (la base)');

    console.log('9 · 3-D Secure al comprar el patrocinio de un evento: la hoja del banco y un solo cobro');
    const H = evento('Noche con 3-D Secure', 15);
    tarjeta(DUENO, '3184');
    await pd.goto(B + `/panel/${NEG}/eventos?det=evt:pat:${H}`);
    ok(await espera(async () => (await texto(pd)).includes('puestos libres')), 'Elegir');
    await pd.getByRole('button', { name: /^Continuar · \$17$/ }).click();
    ok(await espera(async () => /Visa ·· 3184/i.test(await texto(pd))), 'Revisar y pagar con una tarjeta que pide 3-D Secure');
    await pd.getByRole('button', { name: 'Pagar $17.00' }).click();
    const hoja = pd.locator('[data-screen-label="Verificación del banco · desktop"] [data-pantalla="PAGO-3DS"]');
    ok(await espera(async () => await hoja.isVisible() && (await hoja.innerText()).includes('3-D SECURE · $17.00')), 'se abre «Tu banco pide confirmar» (3-D SECURE · $17.00)');
    ok(sql(`select count(*) from event_sponsorships where event_id = ${H}`) === '0', 'todavía no se guardó nada');
    await pd.screenshot({ path: OUT + 'pat003-3ds-1360.png', fullPage: true });
    await hoja.getByRole('button', { name: 'Confirmar con mi banco' }).click();
    ok(await espera(async () => sql(`select count(*) from event_sponsorships where event_id = ${H} and status = 'activo'`) === '1', 30000), 'confirmado: queda ACTIVO');
    const SH = sql(`select id from event_sponsorships where event_id = ${H} and status = 'activo'`);
    ok(sql(`select count(*) || '|' || min(amount_cents) from sponsorship_payments where kind = 'evento' and ref_id = ${SH}`) === '1|1700', 'un solo cobro en el libro ($17.00)');
    ok(sql(`select status || '|' || captured_cents from sim_intents where id = (select pi from sponsorship_payments where kind = 'evento' and ref_id = ${SH})`) === 'succeeded|1700', 'capturado una vez, verificado');
    ok(await espera(async () => (await texto(pd)).includes('Tu evento sale en Patrocinados')), 'el panel: «Tu evento sale en Patrocinados»');
    ok(!err.length, 'sin errores en las páginas: ' + (err.join(' · ') || 'ninguno'));
    console.log(`\npat003 · ${n} comprobaciones en verde`);
  } finally {
    terminarVivos();
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where title->>'es' like '%${TAG}%' and status <> 'cancelled'`);
    sql(`update sponsorship_waits set status = 'avisado', notified_at = now() where kind = 'evento' and city_id = 'hzl' and status = 'espera'`);
    sql(`update businesses set modules_on = array(select distinct x from unnest(modules_on || array['eventos']) x) where id = '${NEG}'`);
    tarjeta(DUENO);   // la 4242 vuelve a ser la tarjeta de siempre del organizador
    for (const k of CFG) { const v = cfgAntes[k]; if (v) sql(`update platform_config set value = '${v}'::jsonb where key = '${k}'`); else sql(`delete from platform_config where key = '${k}'`); }
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
