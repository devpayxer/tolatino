// 9g · Super Admin › Analítica completa (fase9-apertura.md §4 9g): cada pestaña a 390 y 1360 con la semilla (sin personas: ni teléfonos ni correos);
// Dinero cuadra con los cobros de la base (y con las operaciones de la semilla 0055: lo que se cobró de ellas en 30 días es lo que dice la fórmula de la
// semilla); los derivados no se escriben a mano (la base lo rechaza) y sus tablas cuentan lo mismo que sus vistas; Gente con la retención por cohorte y
// los embudos; búsquedas sin resultado (lo de 2 o más personas sí, lo de una sola no); «Llamar» en una semilla se cuenta; las vistas sin repetidos;
// Hogar y Auto contra la base; programar un reporte, recibirlo en el simulador de correo y pausarlo (Solo lectura no programa); el reporte diario
// con «lo que necesita de ti» («Mándamelo ahora» al correo y como aviso) y, desde las 7:30, el del día con su alerta si salió después de las 8:00;
// Inicio con «ciudad viva». Teléfono 390 y escritorio 1360.
// Precondiciones propias: la base dice «pruebas», un Admin nuevo de esta corrida con su correo de prueba (deja el equipo al terminar), Lucía (Solo lectura), los derivados al día
// (como los rehace el barrido: metricas_resumir), una semilla de negocio propia, búsquedas y vistas de esta corrida. Lo que la prueba deja vuelve a como
// estaba o queda retirado (nada se borra: la semilla se retira, el reporte se pausa). Nada depende de otra prueba ni de la hora del día.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, telLibre, equipo } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr ?? e.message); } };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const RUN = Date.now().toString(36);
const LUCIA = '5705550693', BIZ = 'sabor-dominicano';
let ADM = null;   // un Admin propio de esta corrida (con su correo de prueba): su reporte programado y sus correos son solo suyos
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';   // un teléfono de verdad: los robots no cuentan
const ctxTel = (b, extra = {}) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });
const ctxDesk = (b, extra = {}) => b.newContext({ viewport: { width: 1360, height: 900 }, ...extra });
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `a9g-${nom}.png`, fullPage: full });
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const toast = (p, re) => p.getByRole('status').filter({ hasText: re }).first().waitFor({ timeout: 10000 });
const usd = (c) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const HOY = `(now() at time zone 'America/New_York')::date`;
// Los derivados como los rehace el barrido (la función de la base; nadie los escribe a mano).
const alDia = () => sql(`select metricas_resumir(${HOY} - 40)`);
// El barrido central (como el servicio del compose); si otro está corriendo, se espera.
const barrido = async () => {
  for (let i = 0; i < 40; i++) {
    const r = await fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': ENT.TOK } }).then((x) => x.json()).catch(() => ({}));
    if (r.corrio) return r;
    await new Promise((s) => setTimeout(s, 3000));
  }
  throw new Error('el barrido no corrió en 2 minutos');
};
const SIN_PERSONAS = (t) => !/\+?1?570555\d{4}|@[a-z0-9-]+\.[a-z]/i.test(t);
let SEMILLA = null;

(async () => {
  // ── Precondiciones propias ──
  sql(`insert into platform_config (key, value, note, updated_by) values ('entorno', '"pruebas"'::jsonb, 'Sandbox (ana9g)', 'semilla') on conflict (key) do update set value = excluded.value`);
  equipo(LUCIA);
  const T0 = sql(`select now()`);
  ADM = telLibre();
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test, email, email_verified) values ('+1${ADM}', now(), 'Admin', 'Analítica', 'hzl', 'es', true, 'admin.${RUN}@example.com', true)`);
  sql(`insert into staff_members (user_id, role, cities, status, added_by) select u.id, 'admin', '{}', 'active', (select id from users where phone = '+15705550199') from users u where u.phone = '+1${ADM}'`);
  // 9j · Todo el equipo entra con segundo factor: en el sandbox, el equipo de ficción de las pruebas lo da por la lista staff_mfa_pruebas (sin ella, /admin manda a /admin/dos-pasos).
  sql(`insert into staff_mfa_pruebas (phone, note) values ('+1${ADM}', 'ana9g · Admin propio de la corrida') on conflict do nothing`);
  const EMAIL = sql(`select email::text from users where phone = '+1${ADM}'`);
  ok(EMAIL === `admin.${RUN}@example.com`, `un Admin propio de esta corrida, con correo para recibir los reportes (${EMAIL})`);
  alDia();
  const b = await chromium.launch();
  const abiertas = [];
  try {
    const cd = await ctxDesk(b), pd = await cd.newPage(); abiertas.push(cd); await entrarComo(pd, ADM);
    const ct = await ctxTel(b), pt = await ct.newPage(); abiertas.push(ct); await entrarComo(pt, ADM);

    // ── 1 · Cada pestaña a 390 y 1360 ──
    console.log('1 · Cada pestaña de Analítica a 390 y 1360 (sin personas)');
    const TABS = [['sum', 'EMBUDO · DE BUSCAR A ACEPTADO'], ['ppl', 'RETENCIÓN POR COHORTE'], ['dinero', 'VENDIDO EN LÍNEA'], ['trust', 'SLA CUMPLIDO'], ['sp', 'SEGURO ACEPTADO'],
      ['ha', 'PRE-ESTIMADO → CITA'], ['mt', 'CON FOTO DE CADA PESO'], ['ft', 'SOLICITUDES DE FECHA'], ['no', 'CONFIRMADAS EN 60 MIN'], ['en', 'INSCRIPCIONES PEDIDAS'], ['ia', 'SOLICITUDES DE VISITA'],
      ['com', 'PREGUNTAS RESUELTAS'], ['evt', 'ÓRDENES DE BOLETOS'], ['cpa', 'POR QUÉ PASÓ A UNA PERSONA'], ['apps', 'INSTALACIONES ACTIVAS · 7 D'], ['nosup', 'Abrir en Catálogo'], ['rep', 'REPORTES PROGRAMADOS'],
      ['exp', 'Descargar CSV']];
    for (const [k, marca] of TABS) {
      for (const [p, w] of [[pd, 1360], [pt, 390]]) {
        await p.goto(B + `/admin/analitica?tab=${k}`); await p.getByText(marca).first().waitFor({ timeout: 15000 });
        const t = await texto(p);
        ok(t.includes('Analítica') && !/Application error|Something went wrong/.test(t) && SIN_PERSONAS(t), `${k} a ${w}: «${marca}» y sin teléfonos ni correos`);
        if (['sum', 'ppl', 'dinero', 'ha', 'rep', 'nosup'].includes(k)) await shot(p, `${k}-${w}`);
      }
    }

    // ── 2 · Dinero cuadra con la base y con la semilla ──
    console.log('2 · Dinero: las cifras cuadran con los cobros de la base y con las operaciones de la semilla');
    alDia();
    const D30 = `${HOY} - 29`;
    // Operaciones cobradas: las de cada día y tipo (una operación con depósito y saldo en días distintos cuenta en los dos días, como en el derivado).
    const base = sql(`select coalesce(sum(b), 0) || '|' || coalesce(sum(f), 0) || '|' || coalesce(sum(o), 0) from (select sum(p.amount_cents) as b, sum(p.fee_cents) as f, count(distinct x.id) as o
      from payments p join operations x on x.id = p.operation_id join cities ci on ci.id = x.city_id
      where p.captured_at is not null and (p.captured_at at time zone ci.timezone)::date >= ${D30} group by x.city_id, (p.captured_at at time zone ci.timezone)::date, x.kind) z`).split('|').map(Number);
    const dev = sql(`select coalesce(sum(r.amount_cents), 0) || '|' || count(*) from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id join cities ci on ci.id = o.city_id
      where r.status = 'done' and (r.created_at at time zone ci.timezone)::date >= ${D30}`).split('|').map(Number);
    const met = sql(`select coalesce(sum(bruto_cents), 0) || '|' || coalesce(sum(comision_cents), 0) || '|' || coalesce(sum(operaciones), 0) || '|' || coalesce(sum(devuelto_cents), 0) from metricas_dinero_dia where dia >= ${D30}`).split('|').map(Number);
    ok(met[0] === base[0] && met[1] === base[1] && met[2] === base[2] && met[3] === dev[0], `el derivado cuadra con los cobros: bruto ${usd(base[0])}, comisión ${usd(base[1])}, ${base[2]} operaciones, devuelto ${usd(dev[0])}`);
    // La semilla 0055: un pedido por día (1,500 + (i mod 7) × 250), una visita cada 3 días ($95, salvo «no llegó» cada 9) y una mesa cada 5 ($20): en 30 días.
    if (sql(`select count(*) from operations where details->>'semilla' = 'ana9g'`) !== '0') {
      let esperado = 0; for (let i = 1; i <= 29; i++) { esperado += 1500 + (i % 7) * 250; if (i % 3 === 0 && i % 9 !== 0) esperado += 9500; if (i % 5 === 0) esperado += 2000; }
      const sem = Number(sql(`select coalesce(sum(p.amount_cents), 0) from payments p join operations o on o.id = p.operation_id where o.details->>'semilla' = 'ana9g' and (p.captured_at at time zone 'America/New_York')::date >= ${D30}`));
      ok(sem === esperado, `las operaciones de la semilla en 30 días: ${usd(sem)} = la fórmula de la semilla (${usd(esperado)})`);
    } else ok(true, 'sin la semilla 0055 en esta base: solo se compara con los cobros');
    await pd.goto(B + '/admin/analitica?tab=dinero'); await pd.getByText('VENDIDO EN LÍNEA').first().waitFor();
    let t = await texto(pd);
    ok(t.includes(`VENDIDO EN LÍNEA ${usd(base[0])}`) && t.includes(`COMISIÓN ${usd(base[1])}`) && t.includes(`OPERACIONES COBRADAS ${base[2]}`), `la pantalla: vendido ${usd(base[0])}, comisión ${usd(base[1])}, ${base[2]} operaciones`);
    ok(t.includes(base[2] ? `TICKET PROMEDIO ${usd(base[0] / base[2])}` : 'TICKET PROMEDIO —'), 'el ticket promedio = vendido ÷ operaciones');
    const mrr = Number(sql(`select coalesce(round(sum(case when s.cycle = 'year' then s.price_cents / 12.0 else s.price_cents end) filter (where s.status in ('active', 'past_due', 'canceling'))), 0) from subscriptions s`));
    ok(t.includes(`MRR ${usd(mrr)}`), `MRR = las suscripciones Pro que pagan (${usd(mrr)})`);
    ok(t.includes('VENDIDO POR SEMANA · 8 SEMANAS') && t.includes('EMBUDO · PRUEBA PRO → PAGO') && t.includes('CONVERSIÓN A PRO') && t.includes('NO LLEGARON'), 'semanas, prueba Pro → pago, conversión y no llegaron');
    ok(t.includes('Solo cifras por ciudad, día y tipo: nunca quién pagó.') && SIN_PERSONAS(t), 'sin personas');
    // En inglés (el admin en el idioma de quien lo usa).
    const ce = await ctxDesk(b); await ce.addCookies([{ name: 'tl_lang', value: 'en', url: B }]); abiertas.push(ce); const pe = await ce.newPage(); await entrarComo(pe, ADM);
    await pe.goto(B + '/admin/analitica?tab=dinero'); await pe.getByText('SOLD ONLINE').first().waitFor();
    t = await texto(pe); ok(t.includes(`SOLD ONLINE ${usd(base[0])}`) && t.includes('PRO CONVERSION') && t.includes('Money'), 'Dinero en inglés: «SOLD ONLINE», «PRO CONVERSION»');
    await shot(pe, 'dinero-en-1360');

    // ── 3 · Los derivados: no se escriben a mano y cuentan lo mismo que sus vistas ──
    console.log('3 · Los derivados no se escriben a mano y sus tablas cuentan lo mismo que sus vistas');
    const e1 = sqlErr(['insert ', "into metricas_dinero_dia (city_id, dia, tipo) values ('hzl', current_date - 400, 'order')"].join(''));
    const e2 = sqlErr(['insert ', "into metricas_pro_dia (city_id, dia) values ('hzl', current_date - 400)"].join(''));
    const e3 = sqlErr(['insert ', "into compa_analitica_dia_cache (city_id, dia) values ('hzl', current_date - 400)"].join(''));
    ok(/derivado_no_editable/.test(e1) && /derivado_no_editable/.test(e2) && /derivado_no_editable/.test(e3), 'la base rechaza escribir metricas_* y *_cache fuera del barrido');
    alDia();
    for (const [v, c] of [['compa_analitica_dia', 'conversaciones'], ['soporte_analitica_dia', 'casos'], ['evt_analitica_dia', 'vistas'], ['evp_analitica_dia', 'pedidas'], ['evt_ventas_negocio_dia', 'ordenes']])
      ok(sql(`select coalesce(sum(${c}), 0) from ${v} where dia >= ${HOY} - 39`) === sql(`select coalesce(sum(${c}), 0) from ${v}_cache where dia >= ${HOY} - 39`), `${v}_cache = ${v} (${c}, 40 días)`);

    // ── 4 · Gente: retención por cohorte y embudos ──
    console.log('4 · Gente: retención por cohorte y embudos');
    await pd.goto(B + '/admin/analitica?tab=ppl'); await pd.getByText('RETENCIÓN POR COHORTE').first().waitFor();
    t = await texto(pd);
    const coh = sql(`select count(*) from metricas_retencion where cohorte >= date_trunc('week', ${HOY})::date - 77`);
    ok(Number(coh) === 0 ? t.includes('Todavía no hay cohortes') : /Semana del \d{4}-\d{2}-\d{2} D1 (\d+ %|—) · D7 (\d+ %|—) · D30 (\d+ %|—)/.test(t), `retención por cohorte semanal (${coh} cohortes): D1 · D7 · D30`);
    ok(t.includes('EMBUDO · VECINOS NUEVOS') && t.includes('EMBUDO · PUBLICA TU NEGOCIO PASO A PASO') && t.includes('Dónde y cuándo') && t.includes('Publicaron'), 'embudos: vecinos nuevos y Publica tu negocio paso a paso');

    // ── 5 · Búsquedas sin resultado: 2 o más personas sí, una sola no ──
    console.log('5 · Búsquedas sin resultado (search_logs): 2 o más personas sí, una sola no');
    const DOS = `zqv${RUN}`, UNA = `zqw${RUN}`;
    const cv = await ctxTel(b, { userAgent: UA }), pv = await cv.newPage(); abiertas.push(cv); const VEC = telLibre(); await entrarComo(pv, VEC, { nombre: 'Vecina', apellido: 'Analítica' });
    sql(`update users set home_city_id = 'hzl', is_test = true where phone = '+1${VEC}'`);
    const ca = await ctxTel(b, { userAgent: UA }), pa = await ca.newPage(); abiertas.push(ca);
    await pv.goto(B + `/buscar?q=${DOS}`); await pa.goto(B + `/buscar?q=${DOS}`); await pa.goto(B + `/buscar?q=${UNA}`);
    ok(sql(`select count(*) from search_logs where query in ('${DOS}', '${UNA}') and results = 0`) === '3', 'las tres búsquedas quedaron sin resultado en search_logs');
    await pd.goto(B + '/admin/analitica?tab=nosup'); await pd.getByText('Abrir en Catálogo').first().waitFor();
    t = await texto(pd);
    ok(t.includes('BUSCARON Y NO HUBO RESULTADOS') && t.includes(DOS) && !t.includes(UNA), `«${DOS}» (2 personas) sale; «${UNA}» (una sola) no`);

    // ── 6 · «Llamar» en una semilla y vistas sin repetidos ──
    console.log('6 · «Llamar» en una semilla se cuenta; las vistas sin repetidos');
    const NOM = `Plomería Prueba ${RUN}`, TS = telLibre(), UV = uid(VEC);
    sql(`insert into recommendations (by_user_id, city_id, business_name, category_id, "where", status) values ('${UV}', 'hzl', '${NOM}', 'NEG-HOGAR', 'sin_local', 'seeded')`);
    sql(`insert into seed_listings (recommendation_id, city_id, category_id, name, "where", phone, created_by) select r.id, 'hzl', 'NEG-HOGAR', '${NOM}', 'sin_local', '+1${TS}', '${UV}' from recommendations r where r.business_name = '${NOM}'`);
    SEMILLA = sql(`select id from seed_listings where name = '${NOM}'`);
    ok(!!SEMILLA, `la semilla de esta prueba (${NOM})`);
    // El tope de toques por red (60 por hora, como un negocio): lo de las pruebas anteriores de esta máquina pasa a hace 2 horas (solo «at»).
    if (Number(sql(`select count(*) from contact_taps where ip = '127.0.0.1' and at > now() - interval '1 hour'`)) > 40) sql(`update contact_taps set at = at - interval '2 hours' where ip = '127.0.0.1' and at > now() - interval '1 hour'`);
    await pv.goto(B + '/c/hogar'); await pv.getByText(NOM).first().waitFor({ timeout: 15000 });
    await pv.locator('div.grid').filter({ hasText: NOM }).last().getByText('Llamar', { exact: true }).click().catch(() => {});
    let toques = '0'; for (let i = 0; i < 20 && toques === '0'; i++) { await pv.waitForTimeout(300); toques = sql(`select count(*) from contact_taps where seed_id = ${SEMILLA}`); }
    ok(toques === '1' && sql(`select kind || '|' || (user_id = '${UV}') || '|' || (business_id is null) from contact_taps where seed_id = ${SEMILLA}`) === 'call|true|true', '«Llamar» en la semilla quedó contado (contact_taps.seed_id, sin negocio)');
    // Las vistas: dos veces la misma ficha el mismo día = 2 vistas y 1 sin repetidos.
    const V0 = sql(`select coalesce((select n || '|' || unicos from business_views_daily where business_id = '${BIZ}' and day = ${HOY}), '0|0')`).split('|').map(Number);
    await pv.goto(B + `/n/${BIZ}`); await pv.waitForLoadState('networkidle'); await pv.goto(B + `/n/${BIZ}`); await pv.waitForLoadState('networkidle');
    let V1 = V0; for (let i = 0; i < 30 && V1[0] < V0[0] + 2; i++) { await pv.waitForTimeout(300); V1 = sql(`select n || '|' || unicos from business_views_daily where business_id = '${BIZ}' and day = ${HOY}`).split('|').map(Number); }
    ok(V1[0] === V0[0] + 2 && V1[1] === V0[1] + 1, `dos vistas de la misma persona: vistas +2 (${V1[0]}), sin repetidos +1 (${V1[1]})`);
    await pd.goto(B + '/admin/analitica'); await pd.getByText('VISTAS DE FICHAS').first().waitFor();
    t = await texto(pd);
    const vis = sql(`select coalesce(sum(v.n), 0) || '|' || coalesce(sum(v.unicos), 0) from business_views_daily v where v.day >= ${D30}`).split('|').map(Number);
    ok(t.includes(`VISTAS DE FICHAS ${vis[0].toLocaleString('en-US')}`) && t.includes(`${vis[1].toLocaleString('en-US')} sin repetidos`), `Resumen: vistas ${vis[0]} y ${vis[1]} sin repetidos`);
    ok(t.includes('«LLAMAR» EN UNA SEMILLA') && t.includes('SEMILLAS QUE MÁS LLAMAN') && t.includes(NOM), 'Resumen: «Llamar» en una semilla y la semilla que más llaman');
    ok(t.includes('EMBUDO · DE BUSCAR A ACEPTADO') && t.includes('El negocio aceptó'), 'el embudo llega a «El negocio aceptó»');
    await shot(pd, 'resumen-1360');

    // ── 7 · Hogar y Auto contra la base ──
    console.log('7 · Hogar y Auto');
    const pre = sql(`select count(*) filter (where mode = 'pre') || '|' || count(*) filter (where mode = 'pre' and operation_id is not null) from service_requests where created_at > now() - interval '30 days'`).split('|').map(Number);
    await pd.goto(B + '/admin/analitica?tab=ha'); await pd.getByText('PRE-ESTIMADO → CITA').first().waitFor();
    t = await texto(pd);
    ok(t.includes(`${pre[1]} de ${pre[0]} pre-estimados`) && t.includes('HOGAR · LLEGÓ EN LA FRANJA') && t.includes('APROBADO') && t.includes('RESPUESTA A UNA EMERGENCIA'), `pre-estimado → cita (${pre[1]} de ${pre[0]}), la franja, aprobado contra cobrado y emergencias`);

    // ── 8 · Programar un reporte, recibirlo en el simulador y pausarlo ──
    console.log('8 · Programar un reporte por correo, recibirlo y pausarlo; Solo lectura no programa');
    const UB = uid(ADM);
    await pd.goto(B + '/admin/analitica?tab=rep'); await pd.getByText('REPORTES PROGRAMADOS').first().waitFor();
    await pd.locator('[role="switch"][aria-label="Dinero"]').click(); await toast(pd, /Programado/);
    ok(sql(`select status || '|' || cada from scheduled_reports where by_staff_id = '${UB}' and tab = 'dinero'`) === 'activo|semana', 'programado: Dinero, cada lunes (la base)');
    await pd.getByText('Cada día, 8 AM', { exact: true }).first().click(); await toast(pd, /Programado/);
    ok(sql(`select cada from scheduled_reports where by_staff_id = '${UB}' and tab = 'dinero'`) === 'dia', 'cada día (la base)');
    ok(sql(`select count(*) from audit_entries where action = 'analitica.programar' and actor_id = '${UB}' and target_id = 'dinero' and at >= '${T0}'`) === '2', 'cada cambio queda en la auditoría');
    // Su turno ya pasó (las 8:00 de hoy o de ayer): el barrido lo manda al simulador de correo.
    sql(`update scheduled_reports set created_at = now() - interval '3 days', last_sent_at = null where by_staff_id = '${UB}' and tab = 'dinero'`);
    const c0 = Number(sql(`select count(*) from email_outbox where tpl = 'report' and user_id = '${UB}'`));
    await barrido();
    ok(Number(sql(`select count(*) from email_outbox where tpl = 'report' and user_id = '${UB}'`)) === c0 + 1, 'el barrido lo mandó una vez');
    const correo = sql(`select status || '|' || to_email || '|' || subject from email_outbox where tpl = 'report' and user_id = '${UB}' order by id desc limit 1`);
    ok(correo.startsWith(`pruebas|${EMAIL}|Analítica · Dinero · `), `en el simulador de correo: ${correo}`);
    const html = sql(`select html from email_outbox where tpl = 'report' and user_id = '${UB}' order by id desc limit 1`);
    ok(html.includes('Vendido en línea') && html.includes('MRR') && html.includes('Solo cifras') && !/570555\d{4}/.test(html), 'el correo: vendido, MRR, «solo cifras» y ningún teléfono');
    ok(sql(`select (last_sent_at is not null)::text from scheduled_reports where by_staff_id = '${UB}' and tab = 'dinero'`) === 'true', 'queda cuándo salió');
    await barrido();
    ok(Number(sql(`select count(*) from email_outbox where tpl = 'report' and user_id = '${UB}'`)) === c0 + 1, 'en el mismo turno no sale dos veces');
    await pd.goto(B + '/admin/analitica?tab=rep'); await pd.getByText('REPORTES PROGRAMADOS').first().waitFor();
    await pd.locator('[role="switch"][aria-label="Dinero"]').click(); await toast(pd, /En pausa/);
    ok(sql(`select status from scheduled_reports where by_staff_id = '${UB}' and tab = 'dinero'`) === 'pausado', 'pausado (nada se borra)');
    sql(`update scheduled_reports set last_sent_at = now() - interval '3 days' where by_staff_id = '${UB}' and tab = 'dinero'`);
    await barrido();
    ok(Number(sql(`select count(*) from email_outbox where tpl = 'report' and user_id = '${UB}'`)) === c0 + 1, 'en pausa no sale');
    const cl = await ctxDesk(b), pl = await cl.newPage(); abiertas.push(cl); await entrarComo(pl, LUCIA);
    await pl.goto(B + '/admin/analitica?tab=rep'); await pl.getByText('REPORTES PROGRAMADOS').first().waitFor();
    t = await texto(pl);
    ok(t.includes('Tu rol no programa reportes.') && (await pl.locator('[role="switch"]').count()) === 0 && !t.includes('REPORTE DIARIO AL FUNDADOR'), 'Solo lectura: ve, no programa y no ve el reporte del fundador');

    // ── 9 · El reporte diario con «lo que necesita de ti» ──
    console.log('9 · El reporte diario: «Mándamelo ahora» (correo y aviso) con «lo que necesita de ti»; el del día desde las 7:30');
    const f0 = Number(sql(`select count(*) from email_outbox where tpl = 'founder_daily' and user_id = '${UB}'`));
    await pd.goto(B + '/admin/analitica?tab=rep'); await pd.getByText('REPORTE DIARIO AL FUNDADOR · 7:30 AM').first().waitFor();
    await pd.getByText('Mándamelo ahora', { exact: true }).first().click(); await toast(pd, /Te lo mandamos/);
    ok(Number(sql(`select count(*) from email_outbox where tpl = 'founder_daily' and user_id = '${UB}'`)) === f0 + 1, 'el reporte llegó al simulador de correo');
    const fh = sql(`select html from email_outbox where tpl = 'founder_daily' and user_id = '${UB}' order by id desc limit 1`);
    ok(fh.includes('Negocios nuevos') && fh.includes('Operaciones enviadas') && fh.includes('Vendido en línea') && fh.includes('Errores nuevos') && fh.includes('Vueltas atrás') && fh.includes('Colas vencidas') && fh.includes('Guardianes en vivo'),
      'el reporte: negocios nuevos, operaciones, dinero, errores, vueltas atrás, colas vencidas y guardianes en vivo');
    const pend = /Lo que necesita de ti: ([^<]*)</.exec(fh)?.[1] ?? '';
    ok(pend && (/^Nada por ahora\./.test(pend) || /\b8-[0-3] · /.test(pend)), `«Lo que necesita de ti»: ${pend.slice(0, 120)}`);
    ok(!/570555\d{4}/.test(fh), 'sin teléfonos');
    ok(sql(`select count(*) from notifications where user_id = '${UB}' and tpl = 'reporte_diario' and ref_kind = 'founder_report_copy' and created_at >= '${T0}'`) === '1', 'y como aviso (push) a quien lo pidió');
    ok(sql(`select count(*) from audit_entries where action = 'analitica.reporte_ahora' and actor_id = '${UB}' and at >= '${T0}'`) === '1', '«Mándamelo ahora» queda en la auditoría');
    // El del día: desde las 7:30 de Hazleton el barrido lo deja (uno por día, solo inserción); si salió a las 8:00 o después, queda su alerta.
    const min = Number(sql(`select (extract(hour from now() at time zone 'America/New_York') * 60 + extract(minute from now() at time zone 'America/New_York'))::int`));
    await barrido();
    const fila = sql(`select coalesce((select to_char(created_at at time zone 'America/New_York', 'HH24:MI') || '|' || jsonb_typeof(cifras->'pendientes') from founder_reports where kind = 'diario' and dia = ${HOY}), '')`);
    if (min >= 450) {
      ok(/^\d{2}:\d{2}\|array$/.test(fila), `desde las 7:30 el reporte de hoy existe con «lo que necesita de ti» (salió a las ${fila.slice(0, 5)})`);
      const [hh, mm] = fila.slice(0, 5).split(':').map(Number);
      if (hh * 60 + mm >= 480) ok(sql(`select count(*) from founder_reports where kind = 'alerta' and dia = ${HOY}`) === '1', 'salió a las 8:00 o después: queda su alerta (una)');
      else ok(true, 'salió antes de las 8:00: sin alerta');
      ok(/solo de inserción/.test(sqlErr(`update founder_reports set destinos = '[]' where kind = 'diario' and dia = ${HOY}`)), 'founder_reports no se cambia (solo inserción)');
    } else ok(fila === '' || /^\d{2}:\d{2}\|array$/.test(fila), 'antes de las 7:30 el barrido no lo manda todavía');
    await pd.goto(B + '/admin/analitica?tab=rep'); await pd.getByText('REPORTE DIARIO AL FUNDADOR · 7:30 AM').first().waitFor();
    t = await texto(pd);
    ok(fila ? t.includes('LO QUE NECESITA DE TI') && /\d{4}-\d{2}-\d{2} · salió \d{2}:\d{2}/.test(t) : t.includes('Todavía no ha salido ninguno') || /salió \d{2}:\d{2}/.test(t), 'Reportes: los del día con su hora y «lo que necesita de ti»');
    await shot(pd, 'reportes-1360');
    await pt.goto(B + '/admin/analitica?tab=rep'); await pt.getByText('REPORTES PROGRAMADOS').first().waitFor(); await pt.waitForTimeout(300); await shot(pt, 'reportes-390');

    // ── 10 · Inicio con «ciudad viva» ──
    console.log('10 · Super Admin › Inicio con «ciudad viva»');
    const viva = sql(`select (select count(*) from com_posts p where p.city_id = 'hzl' and p.status <> 'deleted' and p.author_kind = 'user' and p.created_at > now() - interval '7 days') || '|' ||
      (select count(distinct d.user_id) from user_days d where d.city_id = 'hzl' and d.day > ${HOY} - 7)`).split('|').map(Number);
    for (const [p, w] of [[pd, 1360], [pt, 390]]) {
      await p.goto(B + '/admin'); await p.locator('[data-ciudad-viva]').waitFor({ timeout: 15000 });
      const v = (await p.locator('[data-ciudad-viva]').innerText()).replace(/\s+/g, ' ');
      ok(v.includes('CIUDAD VIVA') && v.includes('Hazleton') && v.includes('SEMILLAS RECLAMADAS') && v.includes(`${viva[0]} en 7 días`) && /VECINOS ACTIVOS \d+/.test(v), `Inicio a ${w}: «ciudad viva» de Hazleton (${viva[0]} publicaciones en 7 días)`);
      await p.locator('[data-ciudad-viva]').scrollIntoViewIfNeeded(); await shot(p, `inicio-${w}`, false);
    }

    console.log(`\nana9g: ${n} comprobaciones ✓`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close().catch(() => {});
    try {
      if (SEMILLA) sql(`update seed_listings set status = 'removed', removed_at = now(), removed_by = (select id from users where phone = '+15705550199'), removed_reason = 'limpieza ana9g' where id = ${SEMILLA}`);
      if (ADM) {
        sql(`update scheduled_reports set status = 'pausado' where by_staff_id = (select id from users where phone = '+1${ADM}')`);
        // El Admin de esta corrida deja el equipo (nada se borra): así el reporte diario no sigue llegándole.
        sql(`update staff_members set status = 'removed', updated_at = now() where user_id = (select id from users where phone = '+1${ADM}')`);
      }
    } catch (e) { console.error('limpieza:', e.message); }
  }
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
