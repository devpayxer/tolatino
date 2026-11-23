// AO · Anfitriones del barrio (las voces de la casa). Teléfono 390 y escritorio 1360.
// 1 lo propio de la app: con «negocio nuevo» encendido, el barrido hace que Doña Milagros lo publique (plantilla, sin IA) y se ve con su marca
// «Anfitriona» en la publicación (teléfono y escritorio) y en su perfil (texto fijo de voz de la casa, sin «Mensaje») · 2 un vecino pregunta de
// comida, pasa el tiempo (reloj movido) y responde UNA voz (Tato, «Anfitrión»), una sola vez · 3 si antes respondió una persona, ninguna ·
// 4 tema delicado (consulta legal o migratoria) → silencio · 5 ciudad con mucha actividad real en automático → cupo en cero, nadie responde ·
// 6 tope de costo alcanzado → no publica (queda «tope» en el registro) · 7 el Super Admin apaga una voz y pausa a todos desde Contenido ›
// Anfitriones (auditado) → nadie responde · 8 el vecino bloquea a una voz: ya no la ve y la voz no le responde · 9 la base no le da a un
// anfitrión puntos, mensajes privados ni sesión. Crea sus datos ([anf]) y deja todo como estaba (las voces y las ciudades apagadas).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = ENT.B;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let k = 0; k < 40; k++) { const x = await vis(l); if (x) { await x.click(); return; } await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t) => espera(async () => (await texto(p)).includes(t));
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrido = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const TAG = '[anf]', ADM = '5705550199', VA = '5705550861', VB = '5705550862';
const MIL = '0a0f0000-0000-4000-8000-000000000001', TATO = '0a0f0000-0000-4000-8000-000000000004', RAF = '0a0f0000-0000-4000-8000-000000000002';
const shot = async (p, n, full = false) => { await p.waitForTimeout(400); await p.screenshot({ path: OUT + n, fullPage: full }); };
const CFG = ['anf_tope_mes_cents', 'anf_t1_hasta', 'anf_t2_hasta', 'anf_t3_hasta', 'anf_pausa', 'anf_espera_min'];
const cfg = (k, v) => sql(`insert into platform_config (key, value, note, updated_at) values ('${k}', to_jsonb(${v}::int), 'prueba anf', now()) on conflict (key) do update set value = excluded.value, updated_at = now()`);
let BIZ = '', BIZ_T = ''; // el negocio que la prueba hace «nuevo» y su fecha de antes
const limpiar = () => {
  sql(`update com_hosts set active = false`); sql(`update com_host_kinds set active = false`);
  sql(`update com_host_cities set mode = 'off', manual_posts = 0, manual_replies = 0`);
  sql(`delete from platform_config where key in (${CFG.map((k) => `'${k}'`).join(', ')})`);
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()) where body like '%${TAG}%' and status <> 'deleted'`);
  for (const t of [VA, VB]) { const id = uid(t); if (id) sql(`update user_blocks set removed_at = now() where removed_at is null and user_id = '${id}'`); }
  if (BIZ && BIZ_T) sql(`update businesses set created_at = '${BIZ_T}' where id = '${BIZ}'`);
};
// Un post de un vecino, publicado hace `min` minutos (el reloj movido: así lo hacen las pruebas del barrido).
const post = (autor, body, topic = 'otro', min = 60) => sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, publish_at, created_at)
  values ('hzl', 'user', '${autor}', 'pregunta', '${topic}', '${body} ${TAG}', now() - interval '${min} minutes', now() - interval '${min} minutes') returning id`).split('\n')[0];
const vozEn = (p) => sql(`select coalesce(string_agg(c.author_user_id::text, ',' order by c.id), '') from com_comments c join users u on u.id = c.author_user_id where c.post_id = ${p} and u.kind = 'host' and c.status = 'visible'`).split(',').filter(Boolean);
const logDe = (ref) => sql(`select coalesce(string_agg(outcome || ':' || coalesce(reason, ''), ',' order by id), '') from com_host_log where city_id = 'hzl' and source_ref = '${ref}'`);

(async () => {
  limpiar();
  const b = await chromium.launch(); const err = []; globalThis.__p = [];
  const mira = (pg) => { globalThis.__p.push(pg); pg.on('pageerror', (e) => err.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404|status of 503|pexels/.test(m.text())) err.push('console: ' + m.text()); }); };
  const tel = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage(); mira(p); return p; };
  const esc = async () => { const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(p); return p; };
  const vecino = (t) => {
    const id = uid(t);
    sql(`insert into community_profiles (user_id) values ('${id}') on conflict do nothing`);
    sql(`update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true, adult_ok_at = coalesce(adult_ok_at, now()), welcome_at = coalesce(welcome_at, now()) where user_id = '${id}'`);
    sql(`update users set status = 'active', status_until = null, status_reason = null, home_city_id = 'hzl', zone_id = null, created_at = least(created_at, now() - interval '60 days') where id = '${id}'`);
    return id;
  };
  const preparar = async (p, t, nombre) => { await entrar(p, t); await api(p, '/api/cuenta/perfil', { nombre, apellido: 'Prueba' }); return vecino(t); };
  const pa = await tel(), pad = await esc(), pb = await tel();
  const VAID = await preparar(pa, VA, 'Ana'), VBID = await preparar(pb, VB, 'Beto');
  await entrar(pad, VA);

  // ── Encender: las ocho voces, solo «negocio nuevo», Hazleton en manual (1 publicación y 5 respuestas al día) ──
  sql(`update com_hosts set active = true`); sql(`update com_host_kinds set active = (key = 'negocio_nuevo')`);
  // El cupo del día cuenta lo ya publicado hoy (otra corrida el mismo día): 1 publicación y 5 respuestas MÁS de lo ya usado.
  const usadas = (k) => Number(sql(`select count(*) from com_host_log where city_id = 'hzl' and outcome = 'publicada' and kind ${k} and local_day = (now() at time zone 'America/New_York')::date`));
  const UP = usadas("<> 'respuesta'"), UR = usadas("= 'respuesta'");
  if (UP >= 20 || UR >= 45) throw new Error('el cupo manual de hoy en Hazleton ya no alcanza para otra corrida (base nueva)');
  sql(`update com_host_cities set mode = 'manual', manual_posts = ${UP + 1}, manual_replies = ${UR + 5} where city_id = 'hzl'`);
  cfg('anf_espera_min', 30);

  // ── 1 · Lo propio de la app: un negocio nuevo de verdad en la ciudad → Doña Milagros lo publica, marcada ──
  BIZ = sql(`select b.id from businesses b where b.city_id = 'hzl' and b.status = 'active' and not exists (select 1 from com_host_log l where l.city_id = 'hzl' and l.kind = 'negocio_nuevo' and l.source_ref = 'biz:' || b.id) order by b.id limit 1`);
  const BNAME = sql(`select name from businesses where id = '${BIZ}'`);
  BIZ_T = sql(`select created_at::text from businesses where id = '${BIZ}'`); sql(`update businesses set created_at = now() where id = '${BIZ}'`);
  barrido();
  const P1 = sql(`select coalesce(post_id::text, '') from com_host_log where city_id = 'hzl' and kind = 'negocio_nuevo' and source_ref = 'biz:${BIZ}' and outcome = 'publicada'`);
  ok(!!P1, `Doña Milagros publicó el negocio nuevo (${BNAME}) y quedó en el registro`);
  ok(sql(`select author_user_id::text || '|' || author_kind from com_posts where id = ${P1}`) === `${MIL}|user`, 'la publica la cuenta de la voz (un usuario de tipo anfitrión), por la puerta de siempre');
  ok(sql(`select motor || '|' || cost_microusd from com_host_log where post_id = ${P1}`) === 'plantilla|0', 'lo propio de la app sale de una plantilla: sin modelo y sin costo');
  sql(`update com_posts set body = body || ' ${TAG}' where id = ${P1}`); // para que limpiar() la retire al final (con la marca de la prueba)
  barrido();
  ok(usadas("<> 'respuesta'") === UP + 1, 'el cupo del día se respeta (la segunda pasada no publica otra)');
  await pa.goto(B + `/comunidad/p/${P1}`); await pa.getByText('Doña Milagros').first().waitFor();
  ok(/Anfitriona/i.test(await texto(pa)) && (await texto(pa)).includes(BNAME), 'teléfono: la publicación dice «Anfitriona» junto a Doña Milagros');
  await shot(pa, 'anf-publicacion-m.png');
  await pad.goto(B + `/comunidad/p/${P1}`); await pad.getByText('Doña Milagros').first().waitFor();
  ok(/Anfitriona/i.test(await texto(pad)), 'escritorio: la misma marca');
  await shot(pad, 'anf-publicacion-d.png');
  await pa.goto(B + `/comunidad/v/${MIL}`); await pa.getByText('Doña Milagros').first().waitFor();
  ok(await contiene(pa, 'Es una voz de la casa de To\'Latino') && /ANFITRIONA/.test(await texto(pa)), 'su perfil dice que es una voz de la casa, con su marca');
  ok(!(await vis(pa.getByRole('button', { name: 'Mensaje' }))), 'su perfil no ofrece «Mensaje» (no recibe mensajes privados)');
  ok(!/PUNTOS|INSIGNIAS/.test(await texto(pa)), 'ni puntos ni insignias');
  await shot(pa, 'anf-perfil-m.png', true);
  await pad.goto(B + `/comunidad/v/${MIL}`); await pad.getByText('Es una voz de la casa', { exact: false }).first().waitFor(); await shot(pad, 'anf-perfil-d.png');

  // ── 2 · Un vecino pregunta de comida, pasa el tiempo y responde UNA voz (la del tema: Tato), una sola vez ──
  const P2 = post(VAID, '¿Dónde hacen el mejor sancocho por aquí?', 'comida', 45);
  barrido(); barrido();
  ok(vozEn(P2).join(',') === TATO, 'responde una sola voz, la del tema (Tato, comida), aunque el barrido pase dos veces');
  ok(logDe(`post:${P2}`) === 'publicada:', 'queda una sola pieza en el registro, publicada, con su modelo y costo');
  ok(sql(`select motor || '|' || (cost_microusd > 0)::text from com_host_log where source_ref = 'post:${P2}'`) === 'simulador|true', 'fuera de producción, el simulador (nunca el proveedor real), con su costo estimado contra el tope propio');
  await pa.goto(B + `/comunidad/p/${P2}`); await pa.getByText('Tato').first().waitFor();
  ok(/ANFITRI[ÓO]N/i.test(await texto(pa)), 'teléfono: la respuesta dice «Anfitrión» junto a Tato');
  await shot(pa, 'anf-respuesta-m.png', true);
  await pad.goto(B + `/comunidad/p/${P2}`); await pad.getByText('Tato').first().waitFor(); await shot(pad, 'anf-respuesta-d.png');
  const Pnueva = post(VAID, 'Una publicación de hace un minuto, todavía sin esperar', 'otro', 1);
  barrido(); ok(vozEn(Pnueva).length === 0, 'antes de los minutos de espera, ninguna voz responde');

  // ── 3 · Si antes respondió una persona, ninguna voz ──
  const P3 = post(VAID, '¿Alguien sabe a qué hora abre la biblioteca?', 'otro', 60);
  sql(`insert into com_comments (post_id, author_user_id, body) values (${P3}, '${VBID}', 'A las nueve de la mañana ${TAG}')`);
  barrido(); ok(vozEn(P3).length === 0, 'una persona ya contestó: ninguna voz responde');

  // ── 4 · Tema delicado → silencio ──
  const P4 = post(VAID, 'Necesito un abogado para mi caso de asilo, ¿alguien conoce uno?', 'tramites', 60);
  barrido(); ok(vozEn(P4).length === 0, 'consulta legal o migratoria: ninguna voz responde');
  const l4 = logDe(`post:${P4}`); ok(l4 === 'descartada:delicado' || l4 === '', `silencio anotado como delicado (o retenida por la moderación): «${l4}»`);
  const P4b = post(VAID, 'Mi niño tiene fiebre alta desde anoche, ¿qué hago?', 'salud', 60);
  barrido(); ok(vozEn(P4b).length === 0, 'salud: ninguna voz responde');

  // ── 5 · Mucha actividad real en automático → cupos en cero ──
  sql(`update com_host_cities set mode = 'auto' where city_id = 'hzl'`); cfg('anf_t1_hasta', 1); cfg('anf_t2_hasta', 2); cfg('anf_t3_hasta', 3);
  await new Promise((r) => setTimeout(r, 1500));
  const P5 = post(VAID, '¿Qué tal el parque nuevo de la calle Broad?', 'otro', 60);
  barrido(); ok(vozEn(P5).length === 0, 'la ciudad ya conversa (actividad real por encima del último tramo): cupo en cero, nadie responde');
  const ad = await esc(); await entrar(ad, ADM); await ad.goto(B + '/admin/contenido?tab=anf');
  await ad.getByText('POR CIUDAD', { exact: false }).first().waitFor();
  ok(await contiene(ad, 'CUPO EN CERO') && await contiene(ad, 'Actividad real en 7 días'), 'el Super Admin ve la actividad real de la ciudad y su cupo en cero');
  sql(`delete from platform_config where key in ('anf_t1_hasta', 'anf_t2_hasta', 'anf_t3_hasta')`); sql(`update com_host_cities set mode = 'manual' where city_id = 'hzl'`);

  // ── 6 · Tope de costo alcanzado → no publica ──
  cfg('anf_tope_mes_cents', 0);
  const P6 = post(VAID, '¿Quién sabe de un buen pollo guisado?', 'comida', 60);
  barrido(); ok(vozEn(P6).length === 0 && logDe(`post:${P6}`) === 'descartada:tope', 'con el tope alcanzado no se publica y queda «tope» en el registro');
  sql(`delete from platform_config where key = 'anf_tope_mes_cents'`);

  // ── 7 · El Super Admin apaga una voz y pausa a todos (auditado) ──
  await ad.goto(B + '/admin/contenido?tab=anf'); await ad.getByText('LAS VOCES', { exact: false }).first().waitFor();
  await shot(ad, 'anf-admin-d.png', true);
  const T7 = sql('select now()');
  await clic(ad.getByRole('switch', { name: 'Rafelito · Anfitrión' }));
  await clic(ad.getByText('Prueba en el sandbox', { exact: true })); await clic(ad.getByRole('button', { name: 'Confirmar' }));
  ok(await espera(() => sql(`select active::text from com_hosts where user_id = '${RAF}'`) === 'false'), 'el admin apaga a Rafelito');
  ok(sql(`select count(*) from audit_entries where action = 'anfitrion.voz' and target_id = '${RAF}' and reason = 'Prueba en el sandbox' and at > '${T7}'`) === '1', 'queda en la auditoría con su motivo');
  await ad.goto(B + '/admin/contenido?tab=anf'); await ad.getByText('LAS VOCES', { exact: false }).first().waitFor();
  await clic(ad.getByText('Pausar a todos', { exact: true }));
  await clic(ad.getByText('Revisión del contenido', { exact: true })); await clic(ad.getByRole('button', { name: 'Pausar a todos' }));
  ok(await espera(() => sql(`select coalesce((select value::text from platform_config where key = 'anf_pausa'), '0')`) === '1'), '«Pausar a todos» queda puesto');
  ok(sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id = 'anf_pausa' and at > '${T7}'`) === '1', 'la pausa queda en la auditoría');
  await new Promise((r) => setTimeout(r, 1500));
  const P7 = post(VAID, '¿Quién juega pelota los domingos en el parque?', 'otro', 60);
  barrido(); ok(vozEn(P7).length === 0, 'con «Pausar a todos», ninguna voz responde');
  await ad.goto(B + '/admin/contenido?tab=anf'); await ad.getByText('Todas las voces están en pausa', { exact: false }).first().waitFor(); await shot(ad, 'anf-admin-pausa-d.png');
  const adm = await tel(); await entrar(adm, ADM); await adm.goto(B + '/admin/contenido?tab=anf'); await adm.getByText('LAS VOCES', { exact: false }).first().waitFor(); await shot(adm, 'anf-admin-m.png', true);
  sql(`delete from platform_config where key = 'anf_pausa'`); sql(`update com_hosts set active = true`);
  await new Promise((r) => setTimeout(r, 1500));

  // ── 8 · El vecino bloquea a una voz: ya no la ve y la voz no le responde ──
  await pa.goto(B + `/comunidad/v/${MIL}`); await pa.getByText('Doña Milagros').first().waitFor();
  await clic(pa.getByRole('button', { name: 'Opciones' })); await clic(pa.getByText('Bloquear a Doña', { exact: false }));
  const conf = await vis(pa.getByRole('button', { name: 'Bloquear' })); if (conf) await conf.click();
  ok(await espera(() => sql(`select count(*) from user_blocks where user_id = '${VAID}' and target_user_id = '${MIL}' and kind = 'block' and removed_at is null`) === '1'), 'el vecino bloqueó a Doña Milagros como a cualquiera');
  await pa.goto(B + `/comunidad/p/${P1}`); await pa.waitForTimeout(800);
  ok(!(await texto(pa)).includes(BNAME), 'ya no ve lo que publicó la voz bloqueada');
  sql(`update users set created_at = now() - interval '1 day' where id = '${VAID}'`); // recién llegado → le respondería Doña Milagros
  const P8 = post(VAID, 'Hola a todos, me acabo de mudar al barrio', 'otro', 60);
  barrido(); ok(vozEn(P8).length === 0 && logDe(`post:${P8}`) === 'descartada:bloqueo', 'la voz bloqueada no le responde (queda «bloqueo» en el registro)');
  sql(`update users set created_at = now() - interval '60 days' where id = '${VAID}'`);

  // ── 9 · La base no le da a un anfitrión puntos, mensajes privados ni sesión ──
  const falla = (q) => { try { sql(q); return false; } catch (e) { return /anfitrion_no_aplica/.test(String(e.stderr || e.message)); } };
  ok(falla(`insert into points_entries (user_id, city_id, delta, rule_key, motive, local_day, month_key) values ('${TATO}', 'hzl', 1, 'voto', 'ajuste', current_date, date_trunc('month', current_date))`), 'la base no le da puntos');
  ok(falla(`insert into dm_threads (a_user_id, b_user_id, started_by, city_id) values ('${VBID}', '${TATO}', '${VBID}', 'hzl')`), 'la base no le abre mensajes privados');
  ok(falla(`insert into sessions (user_id, token_hash, expires_at) values ('${TATO}', 'anf-prueba', now() + interval '1 hour')`), 'la base no le abre una sesión');

  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  limpiar(); await b.close(); console.log('OK anfAO');
})().catch(async (e) => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'failanf-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch { /* nada */ } try { limpiar(); } catch { /* nada */ } process.exit(1); });
