// 6j · Cierre de la Fase 6: Super Admin completo de Eventos, Configuración › Eventos, avisos `events` y analítica.
// Escritorio 1360 (Super Admin, panel) y teléfono 390 (cliente y un pase del Super Admin). Contra la base local y el barrido real:
//  1 Configuración › Eventos: subgrupos, unidades y límites; evt_pago_dia SOLO LECTURA; cambiar la hora del recordatorio (auditoría
//    antes → después) y fuera de límites rechazado por la acción y por la base.
//  2 «Mañana: …» (bol_recordatorio) a quien tiene boletos, UNA vez (dos barridos), con el título lleno (bug de títulos con {variables}).
//  3 Mi cuenta › Avisos › Eventos: apagar Recordatorios = no llega; apagar «Boletos y cambios» no apaga lo crítico (Reemitir → llega).
//  4 Tu semana con el boleto.
//  5 Ajustar cupo: por debajo de lo vendido → rechazado (acción y base); a lo vendido → el organizador recibe el aviso, el panel lo dice,
//    el editor del organizador no lo deshace (trigger); «Tu evento casi se agota» (evt_aforo90) una vez.
//  6 Extender ventas: day_before → al empezar; la base no deja pasar del inicio.
//  7 Alerta «evento con sobreventa»: un boleto de más (fuera de la regla) → sale en Inicio y Eventos del Super Admin.
//  8 Catálogo: renombrar un género (sale en el editor), apagar un formato para una categoría (sale de «Lo que puedes publicar»); restaurar.
//  9 Confianza › Fraude › Eventos: la señal con el umbral de Configuración leído en la base; «Abrir caso» → Reportes de usuario.
// 10 Usuarios 360° › Actividad, Negocios 360° › Eventos, Analítica › Eventos (contra SQL, sin personas), Notificaciones › Solo Eventos.
// 11 Sin permiso: un vecino no abre el catálogo. Deja todo como estaba (eventos de prueba cancelados, configuración y avisos de fábrica).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlFalla = (q) => { try { sql(q); return null; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrido = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const RUN = Date.now().toString(36), TAG = `[a6j ${RUN}]`;
const C1 = '5705550122', C2 = '5705550299', TERRAZA = '5705550366', ADM = '5705550199', NEG = 'la-terraza-night';
const KEYS = ['evt_recordatorio_hora', 'evt_senal_ordenes_n'];

(async () => {
  const ADMID = uid(ADM), U1 = uid(C1), DUENO = uid(TERRAZA);
  const PREF0 = sql(`select notif_prefs::text from users where id = '${U1}'`);
  const GEN0 = sql(`select label::text from event_genres where key = 'tipico'`);
  const limpiar = () => {
    for (const k of KEYS) sql(`delete from platform_config where key = '${k}'`);
    sql(`update tickets set status = 'void', void_reason = 'prueba' where status in ('valid', 'used') and event_id in (select id from events where title->>'es' like '%[a6j %')`);
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where title->>'es' like '%[a6j %' and status <> 'cancelled'`);
    sql(`update event_format_categories set enabled = true where category_id = 'NEG-NOCHE' and format = 'clase'`);
    sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and queue = 'repUsr' and id in (select queue_item_id from mod_flags where rule_key = 'evt' and detail like '%${TAG}%')`);
  };
  limpiar();
  // Evento de prueba de La Terraza mañana (General 10, una mesa) y cortesías de C1 (un boleto de cortesía también ocupa lugar).
  const evento = (dias, nombre) => {
    const tk = JSON.stringify([{ id: 'gen', n: { es: 'General', en: 'General' }, s: { es: '', en: '' }, p: 1500, cap: 10, off: false }]);
    const mt = JSON.stringify([{ id: 'pista', z: { es: 'Mesa · Pista', en: 'Table · Dance floor' }, seats: 4, min: 12000, dep: 4000, cap: 1 }]);
    const id = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, tables_cfg, addons_cfg, sales_until)
      values ('', 'hzl', '${NEG}', 'noche', '{"es":"${nombre} ${TAG}","en":"${nombre} EN ${TAG}"}', (now() at time zone 'America/New_York')::date + ${dias}, 1320, 1560, 'tickets', 'live', now(), now(), '${ADMID}', 60, '${ADMID}', 21,
              '${tk}'::jsonb, '${mt}'::jsonb, '[]'::jsonb, 'day_before') returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${id})`);
    return { id, f: sql(`select id from event_dates where event_id = ${id}`), slug: sql(`select slug from events where id = ${id}`), tipo: sql(`select id from ticket_types where event_id = ${id} and cfg_key = 'gen'`) };
  };
  const cortesias = (E, user, q) => {
    sql(`update ticket_stock set sold_n = sold_n + ${q} where ticket_type_id = ${E.tipo} and event_date_id = ${E.f}`);
    const op = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, confirmed_at, client_key, is_test)
      values ('B-' || nextval('ticket_order_seq'), 'tickets', 'hzl', '${NEG}', '${DUENO}', 'confirmed', '{"comp": true, "event_id": ${E.id}, "event_date_id": ${E.f}}'::jsonb, 0, 0, 'none', now(), gen_random_uuid(), true) returning id`).split('\n')[0];
    sql(`insert into tickets (event_date_id, event_id, city_id, ticket_type_id, operation_id, holder_user_id, admits, kind, price_cents, fee_cents, discount_cents, comp_name, comp_by)
         select ${E.f}, ${E.id}, 'hzl', ${E.tipo}, ${op}, ${user ? `'${user}'` : 'null'}, 1, 'comp', 0, 0, 0, 'Prueba', '${DUENO}' from generate_series(1, ${q})`);
    return op;
  };
  const E = evento(1, 'Noche de cierre'); cortesias(E, U1, 2);
  const br = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404|Failed to load resource/.test(m.text())) err.push('console: ' + m.text()); }); };
  const nueva = async (w, h, mobile) => { const c = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile }); const p = await c.newPage(); mira(p); return p; };
  const confirmar = async (p, plantilla, cta) => { await clic(p.getByText(plantilla, { exact: true })); await clic(p.getByRole('button', { name: cta, exact: true }).last()); };
  try {
    const ad = await nueva(1360, 900); await entrar(ad, ADM);
    // ── 1 · Configuración › Eventos ──
    await ad.goto(B + '/admin/sistema/configuracion');
    ok(await contiene(ad, 'EVENTOS · AVISOS Y RECORDATORIOS') && await contiene(ad, 'EVENTOS · LA PUERTA') && await contiene(ad, 'EVENTOS · EVENTO PRIVADO') && await contiene(ad, 'EVENTOS · CONFIANZA'), 'Configuración › Eventos en subgrupos (publicar, venta, después de comprar, cambios y pago, puerta, evento privado, avisos, Confianza)');
    ok(await contiene(ad, 'Hora del recordatorio del día antes') && await contiene(ad, 'Señal: órdenes desde un mismo dispositivo') && await contiene(ad, 'Boletos guardados mientras pagas'), 'cada clave de la fase con su etiqueta');
    const filas = Number(sql(`select count(*) from config_keys where section = 'eventos'`));
    ok(filas === 47, `las ${filas} claves de la sección eventos en config_keys (0106–0115)`);
    await clic(ad.getByText('Día de pago de eventos', { exact: true }));
    ok(await contiene(ad, 'Todavía no se cambia aquí') && sql(`select editable from config_keys where key = 'evt_pago_dia'`) === 'f', 'evt_pago_dia en SOLO LECTURA: los textos dicen «el martes»');
    await ad.screenshot({ path: OUT + 'e6j-config-d.png', fullPage: true });
    const cambiar = async (label, v) => {
      await ad.goto(B + '/admin/sistema/configuracion'); await clic(ad.getByText(label, { exact: true }));
      const f = await vis(ad.locator('input[aria-label^="VALOR NUEVO"]')); await f.fill(String(v));
      await confirmar(ad, 'Ajuste con datos reales', 'Guardar');
    };
    const hNY = Number(sql(`select extract(hour from now() at time zone 'America/New_York')::int`)), hora = Math.max(6, Math.min(20, hNY));
    await cambiar('Hora del recordatorio del día antes', 21);
    ok(await contiene(ad, 'Entre 6 h (hora local) y 20 h (hora local).') && !sql(`select value::text from platform_config where key = 'evt_recordatorio_hora'`), 'fuera de límites (21 h): la acción lo rechaza y nada cambia');
    ok(/fuera de los límites/.test(sqlFalla(`insert into platform_config (key, value) values ('evt_recordatorio_hora', '23')`) || ''), 'la base también lo rechaza (trigger)');
    if (hora !== 10) { await cambiar('Hora del recordatorio del día antes', hora); ok(await espera(() => sql(`select value::text from platform_config where key = 'evt_recordatorio_hora'`) === String(hora)), `evt_recordatorio_hora = ${hora} (la hora de ahora en Hazleton)`); }
    else ok(true, 'evt_recordatorio_hora ya es la hora de ahora (10)');
    if (hora !== 10) { const au = sql(`select before::text || ' → ' || after::text from audit_entries where action = 'config.cambiar' and target_id = 'evt_recordatorio_hora' order by id desc limit 1`); ok(au.includes('10 h') && au.includes(`${hora} h`), `auditoría antes → después: ${au}`); }

    // ── 2 · «Mañana: …» una vez, con el título lleno ──
    const pc = await nueva(390, 844, true); await entrar(pc, C1);
    sql(`update users set notif_prefs = notif_prefs - 'evt' - 'evtR' - 'evtG' where id = '${U1}'`);
    const puedeHoy = hNY >= 6 && hNY <= 20;
    barrido(); barrido();
    const rec = sql(`select count(*) || '|' || coalesce(max(title), '') from notifications where user_id = '${U1}' and tpl = 'bol_recordatorio' and ref_id = '${E.f}'`);
    if (puedeHoy) {
      ok(rec.startsWith('1|') && rec.includes('Noche de cierre') && !rec.includes('{evento}'), `«Mañana: …» llegó UNA vez con dos barridos y el título lleno: ${rec}`);
      ok(sql(`select count(*) from evt_avisos_enviados where kind = 'bol_manana' and ref = '${E.f}:${U1}'`) === '1', 'evt_avisos_enviados lo apunta una vez (solo inserción)');
      ok(/solo de inserción/.test(sqlFalla(`delete from evt_avisos_enviados where ref = '${E.f}:${U1}'`) || ''), 'la base no deja borrar un aviso ya mandado');
    } else ok(true, `fuera de 6–20 h en Hazleton (${hNY} h): el recordatorio se prueba en horario`);
    // El título con variables ahora se llena (también en avisos viejos con {negocio}, {evento}).
    ok(sql(`select count(*) from notifications where created_at > now() - interval '10 minutes' and title like '%{%}%'`) === '0', 'ningún aviso nuevo con una {variable} sin llenar en el título');

    // ── 3 · Mi cuenta › Avisos › Eventos ──
    await pc.goto(B + '/cuenta/avisos');
    ok(await contiene(pc, 'EVENTOS') && await contiene(pc, 'Boletos y cambios') && await contiene(pc, 'Recordatorios') && await contiene(pc, 'Eventos que guardas') && await contiene(pc, 'Siempre te llega'), 'Mi cuenta › Avisos › Eventos: tres interruptores y lo que siempre llega');
    const h12 = `${hora % 12 || 12} ${hora < 12 ? 'AM' : 'PM'}`;
    // 9b-1 · Configuración se lee con una caché de 15 s: si la hora cambió hace un momento (fuera de las 10 AM), se recarga hasta 20 s.
    { let v = false; for (let i = 0; i < 10 && !v; i++) { if (i) { await new Promise((r) => setTimeout(r, 2000)); await pc.goto(B + '/cuenta/avisos'); } v = await contiene(pc, `DESDE LAS ${h12}`); }
      ok(v, `la hora del recordatorio sale de Configuración (${h12})`); }
    const tog = async (t) => clic(pc.getByText(t, { exact: true }).locator('xpath=ancestor::*[.//*[@role="switch"]][1]').locator('[role="switch"]').first());
    await tog('Recordatorios'); await tog('Boletos y cambios');
    ok(await espera(() => sql(`select coalesce(notif_prefs->>'evtR', '') || coalesce(notif_prefs->>'evt', '') from users where id = '${U1}'`) === 'falsefalse'), 'apagados y guardados en la cuenta');
    await pc.screenshot({ path: OUT + 'e6j-avisos-m.png', fullPage: true });
    const E2v = evento(1, 'Segunda noche'); cortesias(E2v, U1, 1);
    barrido();
    if (puedeHoy) ok(sql(`select count(*) from notifications where user_id = '${U1}' and tpl = 'bol_recordatorio' and ref_id = '${E2v.f}'`) === '0' && sql(`select count(*) from evt_avisos_enviados where ref = '${E2v.f}:${U1}'`) === '1', 'Recordatorios apagado: el de la segunda noche no llega (y no se vuelve a intentar)');
    // Lo crítico no se apaga: el Super Admin reemite su boleto → «Tu boleto tiene un QR nuevo» llega igual.
    const cod = sql(`select code from tickets where event_date_id = ${E.f} and holder_user_id = '${U1}' order by id limit 1`);
    await ad.goto(B + `/admin/eventos/boleto/${cod}`); await clic(ad.getByText('Reemitir', { exact: true }));
    await confirmar(ad, 'Perdió el teléfono', 'Confirmar');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${U1}' and tpl = 'bol_reemitido' and body like '%${cod}%'`) === '1'), 'con «Boletos y cambios» apagado, lo crítico (QR nuevo) llega igual');
    sql(`update users set notif_prefs = '${PREF0}'::jsonb where id = '${U1}'`);

    // ── 4 · Tu semana ──
    await pc.goto(B + '/cuenta');
    ok(await contiene(pc, 'Tu semana') && await contiene(pc, `Noche de cierre ${TAG} · 2 boletos`) && await contiene(pc, 'TU QR ESTÁ EN BOLETOS'), 'Mi cuenta › Tu semana con los boletos de mañana');
    await pc.screenshot({ path: OUT + 'e6j-tu-semana-m.png', fullPage: true });

    // ── 5 · Ajustar cupo ──
    await ad.goto(B + `/admin/eventos/${E.id}`);
    ok(await contiene(ad, 'CUPOS ·') && await contiene(ad, 'General') && await contiene(ad, '2 / 10') && await contiene(ad, 'VENTA EN LÍNEA HASTA'), 'la ficha del Super Admin: CUPOS de la fecha (vendidos / cupo) y hasta cuándo se vende');
    const ajustar = async (nombre, v) => {
      await clic(ad.getByText(nombre, { exact: true }).locator('xpath=ancestor::*[.//*[normalize-space(text())="Ajustar cupo"]][1]').getByText('Ajustar cupo', { exact: true }));
      const f = await vis(ad.locator('input[aria-label^="CUPO NUEVO"]')); await f.fill(String(v));
      await confirmar(ad, 'El lugar bajó su aforo', 'Ajustar');
    };
    await ajustar('General', 1);
    ok(await contiene(ad, 'No baja de lo vendido y apartado: 2.') && sql(`select quantity from ticket_stock where ticket_type_id = ${E.tipo} and event_date_id = ${E.f}`) === '10', 'por debajo de lo vendido: la acción lo rechaza y nada cambia');
    await ad.goto(B + `/admin/eventos/${E.id}`); await ajustar('General', 2);
    ok(await espera(() => sql(`select quantity from ticket_stock where ticket_type_id = ${E.tipo} and event_date_id = ${E.f}`) === '2'), 'cupo ajustado a 2 (lo vendido)');
    ok(sql(`select count(*) from event_stock_overrides where event_date_id = ${E.f} and quantity = 2 and by_user = '${ADMID}'`) === '1' && sql(`select count(*) from event_changes where event_date_id = ${E.f} and kind = 'capacity_adjusted' and by_kind = 'admin'`) === '1'
      && sql(`select count(*) from audit_entries where action = 'evento.cupo.ajustar' and target_id = '${E.id}'`) === '1', 'el ajuste queda en event_stock_overrides, event_changes y la auditoría');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${DUENO}' and tpl = 'evt_ajuste_admin' and body like '%${TAG}%'`) === '1'), 'el organizador recibe «To’Latino ajustó tu evento» con el motivo');
    ok(/check|cupo|quantity/i.test(sqlFalla(`insert into event_stock_overrides (event_id, event_date_id, city_id, kind, ref_id, quantity, reason, by_user) values (${E.id}, ${E.f}, 'hzl', 'tipo', ${E.tipo}, 1, 'prueba base', '${ADMID}'); update ticket_stock set updated_at = now() where ticket_type_id = ${E.tipo} and event_date_id = ${E.f}`) || ''), 'la base no deja bajar de lo vendido aunque alguien se salte la acción (check)');
    ok(sql(`select quantity from ticket_stock where ticket_type_id = ${E.tipo} and event_date_id = ${E.f}`) === '2', 'nada cambió');
    sql(`select evt_sincronizar_fechas(${E.id})`);
    ok(sql(`select quantity from ticket_stock where ticket_type_id = ${E.tipo} and event_date_id = ${E.f}`) === '2', 'el editor del organizador (cap 10) no deshace el ajuste de To’Latino (trigger evt_cupo_admin)');
    ok(/solo de inserción/.test(sqlFalla(`update event_stock_overrides set quantity = 9 where event_date_id = ${E.f}`) || ''), 'event_stock_overrides es de solo inserción');
    barrido(); barrido();
    ok(sql(`select count(*) from notifications where user_id = '${DUENO}' and tpl = 'evt_aforo90' and body like '%${TAG}%'`) === '1', '«Tu evento casi se agota» (100 % ≥ 90 % de Configuración) llegó UNA vez con dos barridos');
    await ad.goto(B + `/admin/eventos/${E.id}`);
    ok(await contiene(ad, 'ajustado por To\'Latino') && await contiene(ad, 'Cupo ajustado') && await contiene(ad, 'AGOTADO'), 'la ficha: ajustado por To’Latino, AGOTADO y el cambio en CAMBIOS DEL EVENTO');
    const pn = await nueva(1360, 900); await entrar(pn, TERRAZA);
    await pn.goto(B + `/panel/${NEG}/eventos?det=evt:${E.id}`);
    ok(await contiene(pn, 'To’Latino ajustó tu evento: General: cupo de 10 a 2. Motivo: El lugar bajó su aforo'), 'el panel del organizador lo dice con el motivo');
    await pn.screenshot({ path: OUT + 'e6j-panel-ajuste-d.png', fullPage: true });

    // ── 6 · Extender ventas ──
    await ad.goto(B + `/admin/eventos/${E.id}`);
    await clic(ad.getByText('Extender ventas', { exact: true }));
    await clic(ad.getByText('Al empezar', { exact: true }));
    await confirmar(ad, 'Lo pidió el organizador', 'Extender');
    ok(await espera(() => sql(`select (sales_extended_until = starts_at)::text from event_dates where id = ${E.f}`) === 'true'), 'venta extendida: cierra al empezar (antes: un día antes)');
    ok(sql(`select (bol_venta_hasta(e, d) = d.starts_at)::text from events e join event_dates d on d.event_id = e.id where d.id = ${E.f}`) === 'true', 'bol_venta_hasta lo lee: la ficha vende hasta el inicio');
    ok(/venta_extendida/.test(sqlFalla(`update event_dates set sales_extended_until = starts_at + interval '1 minute' where id = ${E.f}`) || ''), 'la base no deja extender después del inicio (D1: en la puerta no se vende)');
    ok(sql(`select count(*) from event_changes where event_date_id = ${E.f} and kind = 'sales_extended'`) === '1' && sql(`select count(*) from audit_entries where action = 'evento.venta.extender' and target_id = '${E.id}'`) === '1', 'event_changes y auditoría');
    await ad.goto(B + `/admin/eventos/${E.id}`);
    ok(await contiene(ad, 'extendida por To\'Latino') && !(await texto(ad)).includes('Extender ventas'), 'la ficha dice «extendida por To’Latino» y ya no ofrece extender');
    await ad.screenshot({ path: OUT + 'e6j-ficha-cupos-d.png', fullPage: true });

    // ── 7 · Alerta «evento con sobreventa» ──
    await ad.goto(B + '/admin/eventos');
    ok(!(await texto(ad)).includes('EVENTO CON SOBREVENTA'), 'sin sobreventa no sale la alerta');
    const OPX = cortesias({ ...E }, null, 0) || null; // operación vacía (sin boletos) para el boleto de más
    sql(`insert into tickets (event_date_id, event_id, city_id, ticket_type_id, operation_id, holder_user_id, admits, kind, price_cents, fee_cents, discount_cents, comp_name, comp_by) values (${E.f}, ${E.id}, 'hzl', ${E.tipo}, ${OPX}, null, 1, 'comp', 0, 0, 0, 'Fuera de la regla', '${DUENO}')`);
    await ad.goto(B + '/admin/eventos');
    ok(await contiene(ad, 'EVENTO CON SOBREVENTA') && await contiene(ad, '3 vivos de 2'), 'un boleto fuera de la regla → «EVENTO CON SOBREVENTA · 3 vivos de 2» en Eventos y boletos');
    await ad.goto(B + '/admin');
    ok(await contiene(ad, 'EVENTO CON SOBREVENTA'), 'y en el Inicio del Super Admin');
    sql(`update tickets set status = 'void', void_reason = 'prueba' where operation_id = ${OPX}`);
    await ad.goto(B + '/admin/eventos');
    ok(!(await texto(ad)).includes('EVENTO CON SOBREVENTA'), 'anulado el boleto de más, la alerta se va');
    await ad.screenshot({ path: OUT + 'e6j-eventos-d.png', fullPage: true });

    // ── 8 · Catálogo de formatos y géneros ──
    await ad.goto(B + '/admin/eventos/catalogo');
    ok(await contiene(ad, 'FORMATOS · 5') && await contiene(ad, 'Fiesta o show') && await contiene(ad, 'GÉNEROS DE MÚSICA') && await contiene(ad, 'ASÍ SALEN EN LOS FILTROS DE EVENTOS'), 'Catálogo: formatos con sus categorías y géneros con su vista previa');
    await ad.screenshot({ path: OUT + 'e6j-catalogo-d.png', fullPage: true });
    await clic(ad.getByText('Típico', { exact: true }).locator('xpath=ancestor::*[.//*[normalize-space(text())="Editar"]][1]').getByText('Editar', { exact: true }));
    await (await vis(ad.locator('input[aria-label="NOMBRE EN ESPAÑOL"]'))).fill('Típico y perico');
    ok(await contiene(ad, 'VISTA PREVIA · LOS FILTROS DE EVENTOS') && await contiene(ad, 'Típico y perico'), 'la vista previa cambia al escribir');
    await ad.screenshot({ path: OUT + 'e6j-catalogo-genero-d.png', fullPage: true });
    await clic(ad.getByText('Guardar', { exact: true })); await confirmar(ad, 'Nombre más claro', 'Guardar');
    ok(await espera(() => sql(`select label->>'es' from event_genres where key = 'tipico'`) === 'Típico y perico') && sql(`select count(*) from audit_entries where action = 'evento.catalogo.genero' and target_id = 'tipico'`) !== '0', 'género renombrado con auditoría');
    await pn.goto(B + `/panel/${NEG}/eventos`);
    ok(await contiene(pn, 'Clase o taller'), 'antes: La Terraza (Noche) puede publicar «Clase o taller»');
    await ad.goto(B + '/admin/eventos/catalogo'); await clic(ad.getByText('Clase o taller', { exact: true }));
    await clic(ad.getByText('Vida Nocturna', { exact: true }));
    await confirmar(ad, 'No encaja con la categoría', 'Quitar');
    ok(await espera(() => sql(`select enabled::text from event_format_categories where category_id = 'NEG-NOCHE' and format = 'clase'`) === 'false'), 'Noche ya no publica «Clase o taller» (se apaga, no se borra)');
    await pn.goto(B + `/panel/${NEG}/eventos`);
    ok(await espera(async () => { await pn.reload(); return !(await texto(pn)).includes('Clase o taller'); }), 'el panel ya no lo ofrece en «Lo que puedes publicar»');
    sql(`update event_format_categories set enabled = true where category_id = 'NEG-NOCHE' and format = 'clase'`);
    sql(`update event_genres set label = '${GEN0}'::jsonb where key = 'tipico'`);

    // ── 9 · Confianza › Fraude › Eventos ──
    const antes = Number(sql(`select count(*) from evt_senales where kind = 'rafaga'`));
    sql(`insert into platform_config (key, value) values ('evt_senal_ordenes_n', '50') on conflict (key) do update set value = excluded.value`);
    const con50 = Number(sql(`select count(*) from evt_senales where kind = 'rafaga'`));
    sql(`update platform_config set value = '2' where key = 'evt_senal_ordenes_n'`);
    const con2 = Number(sql(`select count(*) from evt_senales where kind = 'rafaga'`));
    ok(con50 === 0 && con2 >= antes && antes > 0, `el umbral de Configuración se lee en la base al decidir (ráfaga con 50: ${con50}; con 4: ${antes}; con 2: ${con2})`);
    sql(`delete from platform_config where key = 'evt_senal_ordenes_n'`);
    await ad.goto(B + '/admin/confianza?tab=fraud');
    ok(await contiene(ad, 'EVENTOS Y BOLETOS · 30 DÍAS'), 'Confianza › Fraude › EVENTOS Y BOLETOS');
    const senal = sql(`select x.kind || '|' || x.user_id from evt_senales x join users u on u.id = x.user_id where u.status <> 'deleted' and not exists (select 1 from staff_members m where m.user_id = x.user_id and m.status = 'active')
                         and not exists (select 1 from mod_flags f join queue_items q on q.id = f.queue_item_id where f.rule_key = 'evt' and f.target_id = x.user_id::text and q.status = 'open') limit 1`);
    if (senal) {
      const [kind, su] = senal.split('|');
      await clic(ad.getByText('Abrir caso', { exact: true }));
      await clic(ad.getByText('Posible reventa de boletos', { exact: true }));
      const mot = await vis(ad.locator('textarea')); if (mot) await mot.fill(`Posible reventa de boletos ${TAG}`);
      await clic(ad.getByRole('button', { name: 'Abrir caso', exact: true }).last());
      ok(await espera(() => sql(`select count(*) from mod_flags f join queue_items q on q.id = f.queue_item_id where f.rule_key = 'evt' and q.queue = 'repUsr' and q.status = 'open' and f.created_at > now() - interval '2 minutes'`) !== '0'), `«Abrir caso» (${kind}) → Colas › Reportes de usuario con la marca «Señal de Eventos»`);
      ok(sql(`select count(*) from audit_entries where action = 'usuario.evt.caso' and at > now() - interval '2 minutes'`) !== '0', 'con auditoría');
      await ad.goto(B + '/admin/confianza?tab=fraud');
      ok(await contiene(ad, 'CASO ABIERTO'), 'la señal dice CASO ABIERTO');
      sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and queue = 'repUsr' and id in (select queue_item_id from mod_flags where rule_key = 'evt' and created_at > now() - interval '5 minutes')`);
      void su;
    } else ok(true, 'sin señales abiertas en la base local para abrir un caso');
    await ad.screenshot({ path: OUT + 'e6j-confianza-d.png', fullPage: true });

    // ── 10 · Usuarios 360° › Actividad, Negocios 360° › Eventos, Analítica › Eventos, Notificaciones › Solo Eventos ──
    await ad.goto(B + `/admin/usuarios/${U1}?tab=act`);
    ok(await contiene(ad, 'BOLETOS DE EVENTOS') && await contiene(ad, cod) && await contiene(ad, 'cortesía') && await contiene(ad, 'RSVP'), 'Usuarios 360° › Actividad: sus boletos (código, cortesía) y RSVP');
    await ad.screenshot({ path: OUT + 'e6j-u360-act-d.png', fullPage: true });
    await ad.goto(B + `/admin/negocios/${NEG}?tab=cont`);
    ok(await contiene(ad, 'EVENTOS ·') && (await contiene(ad, 'LIQUIDACIONES ·', 3000) || await contiene(ad, 'CANCELACIONES ·', 3000)), 'Negocios 360° › Contenido › Eventos con liquidaciones y cancelaciones');
    await ad.goto(B + '/admin/analitica?tab=evt');
    const v = sql(`select coalesce(sum(vistas), 0) || '|' || coalesce(sum(ordenes), 0) || '|' || coalesce(sum(rsvp), 0) from evt_analitica_dia where dia >= (now() at time zone 'America/New_York')::date - 29`).split('|');
    ok(await contiene(ad, 'VISTAS DE EVENTOS') && await contiene(ad, 'ÓRDENES DE BOLETOS') && await contiene(ad, 'ASISTENCIA') && await contiene(ad, 'EVENTO PRIVADO') && await contiene(ad, 'POR FORMATO'), 'Analítica › Eventos: de ver a ir, dinero, la puerta, evento privado, por formato, ciudad y organizador');
    const t = await texto(ad);
    ok(t.includes(`VISTAS DE EVENTOS ${Number(v[0]).toLocaleString('en-US')}`) && t.includes(`ÓRDENES DE BOLETOS ${v[1]}`) && t.includes(`RSVP ${v[2]}`), `las cifras salen de las vistas (vistas ${v[0]} · órdenes ${v[1]} · RSVP ${v[2]})`);
    ok(t.includes('Solo cifras por ciudad, formato y día: nunca quién compró, fue o entró.') && !/5705550|@/.test(t), 'sin personas: ni teléfonos ni correos');
    await ad.screenshot({ path: OUT + 'e6j-analitica-d.png', fullPage: true });
    await ad.goto(B + '/admin/notificaciones?evt=1');
    ok(await contiene(ad, 'Solo Eventos') && await contiene(ad, 'EVENTOS · LO QUE NO ES CRÍTICO SE APAGA') && await contiene(ad, 'Mañana: {evento}') && await contiene(ad, 'SE APAGA EN RECORDATORIOS'), 'Notificaciones › Solo Eventos: el grupo y sus interruptores');
    await ad.screenshot({ path: OUT + 'e6j-notif-d.png', fullPage: true });

    // ── 11 · Teléfono 390 del Super Admin y sin permiso ──
    const am = await nueva(390, 844, true); await entrar(am, ADM);
    for (const [u, f] of [['/admin/sistema/configuracion', 'e6j-config-m'], ['/admin/eventos/catalogo', 'e6j-catalogo-m'], [`/admin/eventos/${E.id}`, 'e6j-ficha-cupos-m'], ['/admin/analitica?tab=evt', 'e6j-analitica-m'], ['/admin/confianza?tab=fraud', 'e6j-confianza-m']]) {
      await am.goto(B + u); await am.waitForLoadState('networkidle');
      const anchoOk = await am.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      ok(anchoOk, `${u} a 390 sin scroll horizontal`); await am.screenshot({ path: OUT + f + '.png', fullPage: true });
    }
    const vc = await nueva(1360, 900); await entrar(vc, C2);
    await vc.goto(B + '/admin/eventos/catalogo');
    ok(!(await texto(vc)).includes('GÉNEROS DE MÚSICA'), 'un vecino no abre el catálogo del Super Admin');
    ok(err.length === 0, `sin errores en el navegador${err.length ? ': ' + err.slice(0, 3).join(' | ') : ''}`);
  } finally {
    await br.close();
    sql(`update users set notif_prefs = '${PREF0}'::jsonb where id = '${U1}'`);
    sql(`update event_genres set label = '${GEN0}'::jsonb where key = 'tipico'`);
    limpiar();
  }
  console.log(`adm6j ✓ ${n}`);
})().catch((e) => { console.error(e); process.exit(1); });
