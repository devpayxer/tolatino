// 7i · Super Admin completo de El Compa y Soporte (cierre de la Fase 7), con el motor «simulador»:
// el motor anota «lo que no supo» TAPADO (vecino y panel) → Resumen (KPI, barras, copiloto, marcadas, horario, NO SUPO) → «Anotado» y «Corregido en
// {artículo}» → Conversaciones › ficha anotada → «Marcar respuesta incorrecta» con motivo / «Quitar la marca» + Historial + filtro «Marcadas»;
// permisos y ciudades con las peticiones REALES repetidas por otro rol (Solo lectura, Soporte de otra ciudad); Configuración › El Compa (retención,
// modelo de cada papel) y › Soporte (el horario que leen las pantallas del cliente); Notificaciones (grupo Soporte) y Mi cuenta › Avisos › Soporte;
// Analítica › El Compa y Soporte sin personas; Usuarios 360° › El Compa; Soporte con el plazo de 30 días; la PURGA con el reloj (12 meses → solo
// cifras; cuenta borrada → a los 30 días) y la base que no deja reescribir. 390 y 1360.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100', TOK = ENT.TOK;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const compa = (p, b) => p.evaluate(async ([b, t]) => { const r = await fetch('/api/interno/compa', { method: 'POST', headers: { 'content-type': 'application/json', 'x-barrido-token': t }, body: JSON.stringify(b) }); return { st: r.status, ...(await r.json().catch(() => ({}))) }; }, [b, TOK]);
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const cfg = (k, v) => sql(v == null ? `delete from platform_config where key = '${k}'` : `insert into platform_config (key, value, note) values ('${k}', to_jsonb(${v}), 'prueba adm7i') on conflict (key) do update set value = excluded.value`);
const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
const barrido = () => fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': TOK } }).then((r) => r.json());
const ADM = '5705550199', DAYANA = '5705550677', LUCIA = '5705550693', SOFIA = '5705550694', MARI = '5705550122', DUENO = '5705550133', NEG = 'sabor-dominicano', BORRA = '5705550981';
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });

(async () => {
  const AU = uid(ADM), MU = uid(MARI), DU = uid(DUENO);
  // ── Preparar: todo encendido, sin pausas, límites holgados; lo que dejó una corrida anterior de esta prueba se quita (solo esta base) ──
  sql(`update feature_flags set enabled = true where key like 'compa.%'`);
  sql(`update compa_pauses set lifted_at = now(), lifted_by = '${AU}', lift_reason = 'prueba adm7i' where lifted_at is null`);
  cfg('compa_msgs_hora', 200); cfg('compa_msgs_dia', 1000); cfg('compa_espera_ms', 4000); cfg('compa_tope_mes_cents', null); cfg('compa_turnos_max', 100); cfg('compa_retener_meses', null);
  cfg('soporte_hasta_h', null); cfg('soporte_casos_dia_max', 50);
  sql(`set session_replication_role = replica; delete from compa_reviews where not is_test; delete from compa_unknowns where not is_test; update compa_reviews set cleared_at = null, cleared_by = null, clear_reason = null where is_test`);
  sql(`set session_replication_role = replica; update compa_unknowns set status = 'open', note = null, decided_by = null, decided_at = null, fixed_slug = null where is_test and query_tapada not like '¿Qué pidió Ana%'`);
  sql(`set session_replication_role = replica; update compa_models set role = 'cotidiano' where id = 'claude-haiku-5-5'; update compa_models set role = null, status = 'off' where id = 'claude-haiku-prueba'`);
  sql(`update compa_conversations set closed_at = now(), outcome = 'self_resolved' where closed_at is null and outcome = 'open'`);

  const br = await chromium.launch(), errs = [], cap = [], sesiones = {};
  const ctx = async (w = 390) => br.newContext({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: w > 500 ? 1 : 2,
    userAgent: w > 500 ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15' : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  const pagina = async (k, w) => { const cx = await ctx(w); const p = await cx.newPage(); p.on('pageerror', (e) => errs.push(`${k}: ${e.message}`));
    p.on('request', (r) => { const a = r.headers()['next-action']; if (a && r.method() === 'POST') cap.push({ k, url: r.url(), a, body: r.postData(), tree: r.headers()['next-router-state-tree'] }); }); return p; };
  const como = async (tel, w = 390) => { const k = `${tel}-${w}`; if (!sesiones[k]) { const p = await pagina(k, w); await entrar(p, tel); sesiones[k] = p; } return sesiones[k]; };
  const repetir = (p, r, body) => p.evaluate(async ([u, a, b, t]) => { const x = await fetch(u, { method: 'POST', headers: { 'next-action': a, 'content-type': 'text/plain;charset=UTF-8', accept: 'text/x-component', ...(t ? { 'next-router-state-tree': t } : {}) }, body: b }); return x.status + ' ' + (await x.text()); }, [r.url, r.a, body ?? r.body, r.tree]);
  const confirmar = async (p, plantilla, cta, elegir) => {
    if (elegir) await p.getByText(elegir, { exact: true }).first().click();
    await p.getByText(plantilla, { exact: true }).first().click();
    await boton(p, cta).last().click();
  };

  console.log('1 · El motor anota «lo que no supo»: la pregunta TAPADA, sin la persona, una vez por conversación (vecino y panel)');
  const pm = await como(MARI, 390);
  const preg = '¿Hay kumquats glaseados zxq?';
  const t1 = await compa(pm, { op: 'turno', texto: preg });
  ok(t1.ok && t1.tipo === 'no_se', `El Compa contesta «No tengo ese dato» (tipo ${t1.tipo})`);
  const u1 = sql(`select q.id || '|' || q.audience || '|' || q.status || '|' || q.query_tapada from compa_unknowns q join compa_conversations c on c.id = q.conversation_id where c.number = '${t1.conversacion}'`).split('|');
  ok(u1[1] === 'vecino' && u1[2] === 'open', 'anotada: audiencia vecino, abierta');
  ok(u1[3] === sql(`select m.text from compa_messages m join compa_conversations c on c.id = m.conversation_id where c.number = '${t1.conversacion}' and m.sender = 'user' order by m.id limit 1`), `la pregunta es la del mensaje ya TAPADO (la misma t.texto): «${u1[3]}»`);
  ok(sql(`select count(*) from information_schema.columns where table_name = 'compa_unknowns' and column_name in ('user_id', 'phone', 'staff_id')`) === '0', 'compa_unknowns no tiene a la persona');
  await compa(pm, { op: 'turno', texto: preg, conversacion: t1.conversacion });
  ok(sql(`select count(*) from compa_unknowns q join compa_conversations c on c.id = q.conversation_id where c.number = '${t1.conversacion}'`) === '1', 'la misma pregunta en la misma conversación: una vez');
  let rech = ''; try { sql(`insert into compa_unknowns (conversation_id, city_id, audience, query_tapada) select id, city_id, 'vecino', 'mi tarjeta 4242 4242 4242 4242' from compa_conversations where number = '${t1.conversacion}'`); } catch (e) { rech = String(e.stderr ?? e.message); }
  ok(/compa_sin_secretos/.test(rech), 'la base rechaza una tarjeta en lo que no supo');
  const pd = await como(DUENO, 1360);
  await pd.goto(B + `/panel/${NEG}/compa`); await pd.getByRole('textbox', { name: 'TU PREGUNTA' }).waitFor();
  const nNeg0 = +sql(`select count(*) from compa_unknowns where audience = 'negocio' and not is_test`);
  await pd.getByRole('textbox', { name: 'TU PREGUNTA' }).fill('kumquats zxq qwv'); await pd.getByText('Preguntar', { exact: true }).click();
  ok(await espera(() => +sql(`select count(*) from compa_unknowns where audience = 'negocio' and not is_test`) === nNeg0 + 1), 'el panel también: audiencia negocio');

  console.log('2 · Resumen (por defecto, como el diseño): KPI de 7 días, barras, copiloto, marcadas, horario del equipo y LO QUE EL COMPA NO SUPO');
  const pa = await como(ADM, 1360);
  await pa.goto(B + '/admin/compa'); await pa.getByText('LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA').waitFor();
  let T = await texto(pa);
  for (const k of ['CONVERSACIONES · 7 D', 'RESOLVIÓ SOLO', 'A UNA PERSONA', 'ACCIONES CONFIRMADAS', 'POR QUÉ PASÓ A UNA PERSONA · 7 D', 'DÓNDE CONTESTA · 7 D', 'POR DÓNDE ESCRIBEN · 7 D', 'COPILOTO EN SOPORTE', 'MARCADAS POR EL EQUIPO', 'PERSONAS DEL EQUIPO'])
    ok(T.includes(k), `Resumen: «${k}»`);
  ok(/lun–vie 9 AM–6 PM/.test(T), 'PERSONAS DEL EQUIPO: «lun–vie 9 AM–6 PM» (de Configuración › Soporte)');
  ok(T.includes('«¿Hay kumquats glaseados zxq?»') && T.includes('¿Hacen envíos a Freeland?'), 'la pregunta del motor (tapada) y la de la semilla, en la lista');
  ok(!T.includes('Marisol') && !T.includes('5705550122'), 'la lista no dice quién preguntó');
  const tot7 = +sql(`select count(*) from compa_conversations where started_at > now() - interval '7 days'`);
  ok(T.includes(`CONVERSACIONES · 7 D ${tot7}`), `KPI de la base: ${tot7} conversaciones en 7 días`);
  await pa.screenshot({ path: OUT + 'e7i-resumen-1360.png', fullPage: true });
  const pa3 = await como(ADM, 390);
  await pa3.goto(B + '/admin/compa'); await pa3.getByText('LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA').waitFor(); await pa3.waitForTimeout(300);
  ok(await pa3.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '390: sin scroll horizontal');
  await pa3.screenshot({ path: OUT + 'e7i-resumen-390.png', fullPage: true });

  console.log('3 · «Anotado» y «Corregido en {artículo}» (Admin); Solo lectura ve cifras sin la pregunta y su acción repetida no cambia nada');
  const idU = u1[0];
  const fila = (p, re, btn) => p.locator('div', { has: p.getByText(re) }).filter({ has: p.getByText(btn, { exact: true }) }).last().getByText(btn, { exact: true });
  await fila(pa, /kumquats glaseados zxq/, 'Anotado').click();
  await pa.waitForSelector('text=Queda como pendiente para corregir la ayuda');
  await confirmar(pa, 'Falta en la ayuda: se agrega en el próximo despliegue.', 'Anotar');
  ok(await espera(() => sql(`select status from compa_unknowns where id = ${idU}`) === 'noted'), 'anotada (estado noted) con quién');
  const anotarReq = cap.filter((x) => x.k === `${ADM}-1360` && x.body && x.body.includes(`"${idU}"`) && x.body.includes('"noted"')).pop();
  ok(!!anotarReq, 'la petición real de «Anotado» quedó capturada');
  ok(sql(`select reason from audit_entries where action = 'compa.no_supo_anotado' order by id desc limit 1`) === 'Falta en la ayuda: se agrega en el próximo despliegue.', 'en la auditoría con el motivo');
  await pa.goto(B + '/admin/compa?ns=noted'); await pa.getByText('Anotadas', { exact: true }).waitFor();
  ok((await texto(pa)).includes('ANOTADO'), 'chip «Anotadas»: sale con ANOTADO');
  await fila(pa, /kumquats glaseados zxq/, 'Corregido en…').click();
  await pa.waitForSelector('text=ARTÍCULO DEL CENTRO DE AYUDA');
  const art = sql(`select title->>'es' from help_articles where slug = 'el-compa'`);
  await confirmar(pa, 'Se agregó a la ayuda.', 'Guardar', art);
  ok(await espera(() => sql(`select status || '|' || fixed_slug from compa_unknowns where id = ${idU}`) === 'fixed|el-compa'), `corregida en «${art}» (fixed_slug el-compa)`);
  await pa.goto(B + '/admin/compa?ns=fixed'); await pa.getByText('Corregidas', { exact: true }).waitFor();
  ok((await texto(pa)).includes(`Corregido en ${art}`), `la fila dice «Corregido en ${art}»`);
  await pa.screenshot({ path: OUT + 'e7i-nosupo-corregido-1360.png', fullPage: true });
  let dbR = ''; try { sql(`update compa_unknowns set status = 'open', decided_at = null, decided_by = null, fixed_slug = null where id = ${idU}`); } catch (e) { dbR = String(e.stderr ?? e.message); }
  ok(/el estado solo avanza/.test(dbR), 'la base no deja volver a «abierta»');
  try { sql(`delete from compa_unknowns where id = ${idU}`); dbR = ''; } catch (e) { dbR = String(e.stderr ?? e.message); }
  ok(/no se borra/.test(dbR), 'ni borrarla');
  const pl = await como(LUCIA, 1360);
  await pl.goto(B + '/admin/compa'); await pl.getByText('LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA').waitFor();
  T = await texto(pl);
  ok(!T.includes('Freeland') && T.includes('Pregunta de un vecino') && T.includes('Tu rol ve las cifras. La pregunta la leen Admin y Soporte.'), 'Solo lectura: cifras y «Pregunta de un vecino», sin el texto');
  ok(!(await pl.getByText('Anotado', { exact: true }).count()), 'Solo lectura: sin «Anotado»');
  const idOpen = sql(`select id from compa_unknowns where status = 'open' and query_tapada like '%Freeland%' limit 1`);
  const rl = await repetir(pl, anotarReq, anotarReq.body.replace(`"${idU}"`, `"${idOpen}"`));
  ok(/marcar es de Admin y Soporte/.test(rl) && sql(`select status from compa_unknowns where id = ${idOpen}`) === 'open', 'la acción real de «Anotado» repetida por Solo lectura: rechazada y nada cambia');

  console.log('4 · Conversaciones › ficha anotada: «Marcar respuesta incorrecta» con motivo, Historial, filtro «Marcadas», «Quitar la marca»');
  const CP = t1.conversacion, reads = () => +sql(`select count(*) from compa_reads r join compa_conversations c on c.id = r.conversation_id where c.number = '${CP}'`);
  const r0 = reads();
  await pa.goto(B + `/admin/compa?cp=${CP}`); await pa.getByText('QUIÉN LA LEYÓ').waitFor();
  ok(reads() === r0 + 1, 'abrir la ficha deja una lectura en compa_reads');
  T = await texto(pa);
  ok(T.includes('¿Hay kumquats glaseados zxq?') && T.includes('No tengo ese dato'), 'el hilo, como se guardó');
  ok(T.includes('Contestó sin IA') || T.includes('El Compa · IA'), 'la ficha dice si contestó con IA o sin ella');
  await boton(pa, 'Marcar respuesta incorrecta').first().click();
  await pa.waitForSelector('text=¿Qué contestó mal El Compa?');
  await confirmar(pa, 'Tenía que pasar a una persona.', 'Marcar', 'Debía pasar a una persona');
  ok(await espera(() => sql(`select r.reason || '|' || r.note || '|' || (r.staff_id = '${AU}') from compa_reviews r join compa_conversations c on c.id = r.conversation_id where c.number = '${CP}' and r.cleared_at is null`) === 'should_hand_off|Tenía que pasar a una persona.|true'), 'marcada: motivo de la lista, nota y quién');
  const marcarReq = cap.filter((x) => x.k === `${ADM}-1360` && x.body && x.body.includes(`"${CP}"`) && x.body.includes('should_hand_off')).pop();
  ok(!!marcarReq, 'la petición real de «Marcar» quedó capturada');
  await pa.getByText(/Marcada por/).first().waitFor();
  T = await texto(pa);
  ok(/Marcada por .* · Debía pasar a una persona: Tenía que pasar a una persona\./.test(T), 'la ficha: «Marcada por … · Debía pasar a una persona: …»');
  ok(/HISTORIAL.*Marcó · Marca: Debía pasar a una persona/.test(T), 'Historial: «Marcó · Marca: Debía pasar a una persona»');
  ok(T.includes('Quitar la marca') && !T.includes('Marcar respuesta incorrecta'), 'ahora ofrece «Quitar la marca»');
  ok(sql(`select count(*) from compa_messages m join compa_conversations c on c.id = m.conversation_id where c.number = '${CP}' and m.text ilike '%marc%'`) === '0', 'al vecino no le llega nada (ningún mensaje nuevo en su conversación)');
  await pa.screenshot({ path: OUT + 'e7i-ficha-marcada-1360.png', fullPage: true });
  const otra = await repetir(pa, marcarReq);
  ok(/Ya está marcada/.test(otra), 'marcar dos veces: «Ya está marcada» (una viva por conversación)');
  await pa.goto(B + '/admin/compa?tab=conv&res=flag'); await pa.getByText(/CONVERSACIONES/).first().waitFor();
  T = await texto(pa);
  ok(T.includes(CP) && T.includes('Marcadas'), `RESULTADO «Marcadas»: sale ${CP}`);
  const nFl = +sql(`select count(*) from compa_reviews where cleared_at is null`);
  await pa.goto(B + '/admin/compa'); await pa.getByText('MARCADAS POR EL EQUIPO').waitFor();
  ok((await texto(pa)).includes(`MARCADAS POR EL EQUIPO ${nFl}`), `Resumen › MARCADAS POR EL EQUIPO: ${nFl}`);
  // Solo lectura y Soporte de otra ciudad, con la petición real.
  const rlm = await repetir(pl, marcarReq, marcarReq.body.replace(CP, sql(`select number from compa_conversations where city_id = 'hzl' and number <> '${CP}' order by id desc limit 1`)));
  ok(/marcar es de Admin y Soporte/.test(rlm), 'Solo lectura repitiendo «Marcar»: rechazado');
  const ps = await como(SOFIA, 1360), rs0 = reads();
  await ps.goto(B + `/admin/compa?cp=${CP}`); await ps.waitForTimeout(800);
  T = await texto(ps);
  ok(T.includes('Esa conversación no existe') && !T.includes('kumquats') && reads() === rs0, 'Soporte de Allentown (Sofía) no abre una conversación de Hazleton y no queda lectura');
  const rsm = await repetir(ps, marcarReq, marcarReq.body.replace(CP, sql(`select number from compa_conversations where city_id = 'hzl' and number <> '${CP}' and not exists (select 1 from compa_reviews r where r.conversation_id = compa_conversations.id and r.cleared_at is null) order by id desc limit 1`)));
  ok(/Esa conversación no existe/.test(rsm), 'Sofía repitiendo «Marcar» sobre una de Hazleton: «no existe»');
  const pdy = await como(DAYANA, 390);
  await pdy.goto(B + `/admin/compa?cp=${CP}`); await pdy.getByText('QUIÉN LA LEYÓ').waitFor();
  await boton(pdy, 'Quitar la marca').first().click();
  await pdy.waitForSelector('text=La conversación deja de contar como marcada');
  await confirmar(pdy, 'Revisado: la respuesta estaba bien.', 'Quitar la marca');
  ok(await espera(() => sql(`select count(*) from compa_reviews r join compa_conversations c on c.id = r.conversation_id where c.number = '${CP}' and r.cleared_at is not null and r.clear_reason = 'Revisado: la respuesta estaba bien.'`) === '1'), 'Soporte (Dayana) quita la marca con motivo');
  await pdy.getByText('Marcar respuesta incorrecta').first().waitFor();
  ok(/Quitó la marca · Marca: sin marca/.test(await texto(pdy)), 'Historial: «Quitó la marca»');
  await pdy.screenshot({ path: OUT + 'e7i-ficha-390.png', fullPage: true });
  try { sql(`delete from compa_reviews where conversation_id = (select id from compa_conversations where number = '${CP}')`); dbR = ''; } catch (e) { dbR = String(e.stderr ?? e.message); }
  ok(/no se borra/.test(dbR), 'la base no deja borrar una marca');
  try { sql(`update compa_reviews set reason = 'tone' where conversation_id = (select id from compa_conversations where number = '${CP}')`); dbR = ''; } catch (e) { dbR = String(e.stderr ?? e.message); }
  ok(/solo se quita la marca/.test(dbR), 'ni cambiarla');

  console.log('5 · Configuración › El Compa (retención editable, modelo de cada papel) y › Soporte (el horario que leen las pantallas)');
  await pa.goto(B + '/admin/sistema/configuracion'); await pa.getByText('MODELO DE CADA PAPEL').waitFor();
  T = await texto(pa);
  ok(/Se guardan las conversaciones/.test(T) && !/Se guardan las conversaciones[^·]*· SOLO LECTURA/.test(T) && !/La purga por retención todavía no corre/.test(T), 'la retención ya se cambia aquí (la purga corre)');
  ok(T.includes('Modelo de vecinos, panel y respuestas') && T.includes('Claude Haiku 5.5') && T.includes('Modelo del copiloto del equipo') && T.includes('Claude Sonnet 5.5'), 'MODELO DE CADA PAPEL: Haiku cotidiano, Sonnet copiloto');
  ok(T.includes('Las pantallas de Soporte y El Compa dicen: «El equipo atiende lunes a viernes, de 9 AM a 6 PM»'), 'Soporte: la línea del horario como la leen las pantallas');
  await pa.screenshot({ path: OUT + 'e7i-config-1360.png', fullPage: true });
  await pa3.goto(B + '/admin/sistema/configuracion'); await pa3.getByText('MODELO DE CADA PAPEL').waitFor(); await pa3.waitForTimeout(300);
  ok(await pa3.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Configuración 390: sin scroll horizontal');
  await pa3.screenshot({ path: OUT + 'e7i-config-390.png', fullPage: true });
  // La retención con límites y auditoría.
  await pa.getByText('Se guardan las conversaciones', { exact: true }).first().click();
  await pa.waitForSelector('text=VALOR NUEVO');
  await pa.locator('input').first().fill('48');
  await pa.getByText('Ajuste con datos reales', { exact: true }).click(); await boton(pa, 'Guardar').last().click();
  ok(await espera(async () => (await texto(pa)).includes('Entre 1 meses y 36 meses')), 'fuera de los límites (48 meses): rechazado con su motivo');
  await pa.locator('input').first().fill('6'); await boton(pa, 'Guardar').last().click();
  ok(await espera(() => sql(`select cfg_int('compa_retener_meses')`) === '6'), 'retención: 6 meses');
  ok(sql(`select reason from audit_entries where action = 'config.cambiar' and target_id = 'compa_retener_meses' order by id desc limit 1`) === 'Ajuste con datos reales', 'con motivo en la auditoría');
  cfg('compa_retener_meses', null);
  // El modelo cotidiano: solo los encendidos de la lista de precios; auditoría.
  sql(`insert into compa_models (id, label, input_per_mtok_microusd, output_per_mtok_microusd, cache_read_per_mtok_microusd, cache_write_per_mtok_microusd, geo_pct, role, priced_at, status) values ('claude-haiku-prueba', 'Haiku de prueba', 100000, 500000, 10000, 125000, 110, null, '2026-11-11', 'on') on conflict (id) do update set status = 'on', role = null`);
  await pa.goto(B + '/admin/sistema/configuracion'); await pa.getByText('MODELO DE CADA PAPEL').waitFor();
  await pa.getByText('Modelo de vecinos, panel y respuestas', { exact: true }).first().click();
  await pa.waitForSelector('text=Solo los modelos encendidos en la lista de precios');
  ok(!(await pa.getByText(/Simulador del sandbox ·/).count()), 'el simulador nunca se ofrece');
  await confirmar(pa, 'Mejor calidad al mismo costo', 'Guardar', 'Haiku de prueba · $0.10 / $0.50 por millón de tokens');
  ok(await espera(() => sql(`select id from compa_models where role = 'cotidiano'`) === 'claude-haiku-prueba'), 'el modelo cotidiano pasa a «Haiku de prueba»');
  ok(sql(`select after->>'Modelo de vecinos, panel y respuestas' || '|' || reason from audit_entries where action = 'compa.modelo' order by id desc limit 1`) === 'Haiku de prueba|Mejor calidad al mismo costo', 'auditoría: antes → después y motivo');
  const modeloReq = cap.filter((x) => x.k === `${ADM}-1360` && x.body && x.body.includes('claude-haiku-prueba')).pop();
  ok(/Solo un Admin/.test(await repetir(pdy, modeloReq, modeloReq.body.replace('claude-haiku-prueba', 'claude-haiku-5-5'))) && sql(`select id from compa_models where role = 'cotidiano'`) === 'claude-haiku-prueba', 'Soporte repitiendo la acción real: rechazado');
  ok(/ya tiene el otro papel/.test(await repetir(pa, modeloReq, modeloReq.body.replace('claude-haiku-prueba', 'claude-sonnet-5-5'))), 'Sonnet ya es del copiloto: no se pone en dos papeles');
  ok(/no está encendido/.test(await repetir(pa, modeloReq, modeloReq.body.replace('claude-haiku-prueba', 'simulador'))), 'el simulador (o uno apagado) no se elige ni repitiendo la petición');
  await repetir(pa, modeloReq, modeloReq.body.replace('claude-haiku-prueba', 'claude-haiku-5-5').replace('Mejor calidad al mismo costo', 'Volver a Haiku'));
  ok(sql(`select id from compa_models where role = 'cotidiano'`) === 'claude-haiku-5-5', 'y de vuelta a Claude Haiku 5.5');
  sql(`update compa_models set status = 'off' where id = 'claude-haiku-prueba'`);
  // El horario del equipo lo leen las pantallas del cliente.
  cfg('soporte_hasta_h', 17);
  const pm2 = await como(MARI, 1360);
  // (Configuración se lee con una caché de 15 s por proceso: el valor nuevo sale a más tardar en 15 s.)
  ok(await espera(async () => { await pm2.goto(B + '/soporte'); return /de 9 AM a 5 PM/.test(await texto(pm2)); }, 25000), 'Soporte del vecino: «… de 9 AM a 5 PM» con el valor nuevo');
  await pm.goto(B + '/cuenta/avisos'); await pm.getByText('SOPORTE').first().waitFor();
  T = await texto(pm);
  ok(T.includes('Lo de tus casos siempre te llega') && T.includes('El equipo atiende lunes a viernes, de 9 AM a 5 PM.'), 'Mi cuenta › Avisos › Soporte: siempre llega y el horario de Configuración');
  await pm.screenshot({ path: OUT + 'e7i-avisos-390.png', fullPage: true });
  cfg('soporte_hasta_h', null);

  console.log('6 · Avisos: lo del caso en el grupo Soporte, sin interruptor (llega aunque la persona apague todo)');
  ok(sql(`select string_agg(key || ':' || grp || ':' || coalesce(pref, '-'), ',' order by key) from notif_templates where key in ('sop_recibido', 'sop_respuesta', 'sop_resuelto', 'compa_caso', 'compa_caso_negocio')`)
    === 'compa_caso:support:-,compa_caso_negocio:support:-,sop_recibido:support:-,sop_respuesta:support:-,sop_resuelto:support:-', 'las 5 plantillas del caso: grupo support, sin pref');
  const prefs0 = sql(`select notif_prefs::text from users where id = '${MU}'`);
  sql(`update users set notif_prefs = '{"ord":false,"cit":false,"emp":false,"hoy":false,"of":false,"com":false,"msg":false,"evt":false,"evtR":false,"evtG":false,"quiet":true}'::jsonb where id = '${MU}'`);
  const nAv = +sql(`select count(*) from notifications where user_id = '${MU}' and tpl = 'compa_caso'`);
  const tp = await compa(pm, { op: 'turno', texto: 'Quiero hablar con una persona, por favor' });
  ok(tp.ok && tp.persona?.caso, `pasa a una persona (${tp.persona?.caso})`);
  ok(await espera(() => +sql(`select count(*) from notifications where user_id = '${MU}' and tpl = 'compa_caso'`) === nAv + 1), 'el aviso «Tu caso pasó a Soporte» llega aunque tenga todo apagado');
  sql(`update users set notif_prefs = '${prefs0}'::jsonb where id = '${MU}'`);
  await pa.goto(B + '/admin/notificaciones?sop=1'); await pa.getByText('SOPORTE · LO DEL CASO SIEMPRE LLEGA').waitFor();
  T = await texto(pa);
  ok(/Solo Soporte y El Compa · \d+/.test(T) && T.includes('Recibimos tu caso') && T.includes('Tu caso pasó a Soporte'), 'Notificaciones › «Solo Soporte y El Compa» con el grupo Soporte');
  await pa.screenshot({ path: OUT + 'e7i-notif-1360.png', fullPage: true });

  console.log('7 · Analítica › El Compa y Soporte (sin personas) y Soporte con el plazo de 30 días');
  ok(sql(`select count(*) from information_schema.columns where table_name in ('compa_analitica_dia', 'soporte_analitica_dia') and column_name ~ '(user|staff|phone|name|text|query|summary|body)'`) === '0', 'las vistas no tienen columnas de personas ni de texto');
  await pa.goto(B + '/admin/analitica?tab=cpa'); await pa.getByText('POR QUÉ PASÓ A UNA PERSONA').first().waitFor();
  T = await texto(pa);
  for (const k of ['EL COMPA', 'CONVERSACIONES', 'GASTO DE IA', 'ESPERA DE LA IA', 'NO SUPO', 'MARCADAS', 'DÓNDE CONTESTA', 'POR DÓNDE ESCRIBEN', 'SOPORTE', 'PLAZO CUMPLIDO', '1.ª RESPUESTA', '¿SE RESOLVIÓ?', 'POR TEMA', 'POR CIUDAD']) ok(T.includes(k), `Analítica: «${k}»`);
  ok(!/Marisol|Yaritza|Héctor|Dayana|570555|CP-\d|TK-\d/.test(T), 'sin nombres, teléfonos, conversaciones ni casos');
  const conv30 = +sql(`select coalesce(sum(conversaciones), 0) from compa_analitica_dia where dia >= (now() at time zone 'America/New_York')::date - 29`);
  ok(T.includes(`CONVERSACIONES ${conv30.toLocaleString('en-US')}`), `cifra de la vista: ${conv30} conversaciones en 30 días`);
  await pa.screenshot({ path: OUT + 'e7i-analitica-1360.png', fullPage: true });
  await pa3.goto(B + '/admin/analitica?tab=cpa'); await pa3.getByText('POR QUÉ PASÓ A UNA PERSONA').first().waitFor(); await pa3.waitForTimeout(300);
  await pa3.screenshot({ path: OUT + 'e7i-analitica-390.png', fullPage: true });
  await pl.goto(B + '/admin/analitica?tab=cpa'); await pl.getByText('POR QUÉ PASÓ A UNA PERSONA').first().waitFor();
  ok(true, 'Solo lectura ve la analítica (analit:ver)');
  await pa.goto(B + '/admin/soporte'); await pa.getByText('PLAZO CUMPLIDO · 30 D').waitFor();
  ok(/FUERA DE PLAZO · 30 D \d+ de \d+ casos/.test(await texto(pa)) && /DESDE EL COMPA \d+ de \d+ casos en 30 días/.test(await texto(pa)), 'Soporte: plazo cumplido, fuera de plazo y desde El Compa (30 días)');
  await pa.screenshot({ path: OUT + 'e7i-soporte-1360.png', fullPage: true });
  await pa3.goto(B + '/admin/soporte'); await pa3.getByText('PLAZO CUMPLIDO · 30 D').waitFor(); await pa3.waitForTimeout(300); await pa3.screenshot({ path: OUT + 'e7i-soporte-390.png', fullPage: true });
  await pa3.goto(B + '/admin/notificaciones?sop=1'); await pa3.getByText('SOPORTE · LO DEL CASO SIEMPRE LLEGA').waitFor(); await pa3.waitForTimeout(300); await pa3.screenshot({ path: OUT + 'e7i-notif-390.png', fullPage: true });
  await pm2.goto(B + '/cuenta/avisos'); await pm2.getByText('SOPORTE').first().waitFor(); await pm2.waitForTimeout(300); await pm2.screenshot({ path: OUT + 'e7i-avisos-1360.png', fullPage: true });

  console.log('8 · Usuarios 360° › El Compa: cifras y conversaciones sin texto; el hilo solo en la ficha anotada');
  await pa.goto(B + `/admin/usuarios/${MU}?tab=compa`); await pa.getByText('SUS CONVERSACIONES').waitFor();
  T = await texto(pa);
  ok(T.includes('CONVERSACIONES · 30 D') && T.includes(CP) && !T.includes('kumquats'), 'Usuarios 360° › El Compa: la conversación por número, sin lo que se habló');
  await pa.screenshot({ path: OUT + 'e7i-u360-1360.png', fullPage: true });
  const r1 = reads();
  await pa.getByText(new RegExp(`^${CP} · Vecinos`)).first().click(); await pa.getByText('QUIÉN LA LEYÓ').waitFor();
  ok(reads() === r1 + 1 && pa.url().includes(`cp=${CP}`), 'tocarla abre la ficha y queda la lectura');
  await pl.goto(B + `/admin/usuarios/${MU}?tab=compa`); await pl.getByText('SUS CONVERSACIONES').waitFor();
  ok((await texto(pl)).includes('Tu rol ve las cifras') && !(await pl.locator(`text=${CP} · Vecinos`).locator('xpath=ancestor-or-self::*[@role="button" or self::button]').count()), 'Solo lectura: las cifras y la lista sin abrir');
  await pa3.goto(B + `/admin/usuarios/${MU}?tab=compa`); await pa3.getByText('SUS CONVERSACIONES').waitFor(); await pa3.waitForTimeout(300);
  await pa3.screenshot({ path: OUT + 'e7i-u360-390.png', fullPage: true });

  console.log('9 · La PURGA con el reloj: 12 meses → solo cifras; cuenta borrada → a los 30 días; la base no deja reescribir');
  // Una conversación vieja (13 meses) cerrada, con su pregunta sin saber, su marca y su paso a una persona; otra de 11 meses.
  const tv = await compa(pm, { op: 'turno', texto: 'kumquats qwv azul' });
  const tn = await compa(pm, { op: 'turno', texto: 'kumquats qwv jbk' });
  const viejo = tv.conversacion, nuevo = tn.conversacion;
  sql(`insert into compa_reviews (conversation_id, city_id, staff_id, reason, note) select id, city_id, '${AU}', 'wrong_info', 'Nota de prueba de la purga.' from compa_conversations where number = '${viejo}'`);
  sql(`update compa_conversations set closed_at = now(), outcome = 'self_resolved' where number in ('${viejo}', '${nuevo}') and closed_at is null`);
  sql(`set session_replication_role = replica; update compa_conversations set started_at = now() - interval '13 months' where number = '${viejo}'; update compa_conversations set started_at = now() - interval '11 months' where number = '${nuevo}'`);
  const antesView = +sql(`select coalesce(sum(conversaciones), 0) from compa_analitica_dia`);
  await barrido();
  const pv = sql(`select (c.purged_at is not null) || '|' || c.outcome || '|' || c.turns_n || '|' || (select bool_and(m.text is null and m.purged_at is not null) from compa_messages m where m.conversation_id = c.id)
    || '|' || (select bool_and(q.query_tapada is null) from compa_unknowns q where q.conversation_id = c.id) || '|' || (select bool_and(r.note is null and r.reason = 'wrong_info') from compa_reviews r where r.conversation_id = c.id)
    from compa_conversations c where c.number = '${viejo}'`);
  ok(pv === 'true|self_resolved|1|true|true|true', `13 meses (retención 12): texto vacío, pregunta y nota vacías; quedan resultado, turnos y motivo (${pv})`);
  ok(sql(`select (purged_at is null) || '|' || (select bool_and(text is not null) from compa_messages where conversation_id = c.id) from compa_conversations c where number = '${nuevo}'`) === 'true|true', '11 meses: intacta');
  ok(+sql(`select coalesce(sum(conversaciones), 0) from compa_analitica_dia`) === antesView, 'la analítica cuenta lo mismo (solo cifras)');
  await pa.goto(B + `/admin/compa?cp=${viejo}`); await pa.getByText('QUIÉN LA LEYÓ').waitFor();
  T = await texto(pa);
  ok(/El texto se borró el .* por la retención/.test(T) && T.includes('(borrado por la retención)') && !T.includes('kumquats qwv azul'), 'la ficha: «El texto se borró… por la retención» y el hilo sin texto');
  ok(!T.includes('Marcar respuesta incorrecta'), 'una purgada no se marca');
  await pa.screenshot({ path: OUT + 'e7i-purgada-1360.png', fullPage: true });
  // Con la retención en 6 meses, la de 11 también.
  cfg('compa_retener_meses', 6); await barrido();
  ok(sql(`select purged_at is not null from compa_conversations where number = '${nuevo}'`) === 't', 'retención en 6 meses (Configuración): la de 11 meses también se purga');
  cfg('compa_retener_meses', null);
  // Cuenta borrada (D5): una cuenta de prueba con un caso de Soporte (con copiloto) y una conversación cerrada y otra abierta.
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, is_test) values ('+1${BORRA}', now(), 'Borrada', 'Prueba', 'hzl', true) on conflict (phone) do update set delete_at = null, status = 'active'`);
  const BU = uid(BORRA);
  const pb = await como(BORRA, 390);
  const tb1 = await compa(pb, { op: 'turno', texto: 'Me cobraron doble el pedido de ayer' });
  ok(tb1.ok && tb1.persona?.caso, `la cuenta que se va a borrar abre un caso (${tb1.persona?.caso})`);
  const tb2 = await compa(pb, { op: 'turno', texto: 'kumquats qwv zzk' });
  sql(`update compa_conversations set closed_at = now(), outcome = 'self_resolved' where number = '${tb2.conversacion}' and closed_at is null`);
  const tb3 = await compa(pb, { op: 'turno', texto: 'kumquats qwv bbq' });   // abierta
  sql(`insert into support_messages (case_id, city_id, sender, staff_id, body) select id, city_id, 'staff', '${uid(DAYANA)}', 'Hola Borrada, lo reviso hoy.' from support_cases where number = '${tb1.persona.caso}'`);
  // Una foto privada del caso (como las que sube la persona): su archivo sale del almacenamiento con la purga.
  const foto = sql(`insert into media (owner_kind, owner_id, url, private, uploaded_by) select 'support', id::text, 'privado/prueba-adm7i-' || gen_random_uuid() || '.jpg', true, '${BU}' from support_cases where number = '${tb1.persona.caso}' returning id`).split('\n')[0];
  // Pedido de borrado hace 10 días (delete_at = +20 días): nada se purga todavía.
  sql(`update users set delete_at = now() + interval '20 days', delete_reason = 'priv' where id = '${BU}'`);
  await barrido();
  ok(sql(`select (purged_at is null)::text from support_cases where number = '${tb1.persona.caso}'`) === 'true' && sql(`select (purged_at is null)::text from compa_conversations where number = '${tb2.conversacion}'`) === 'true', 'pedido de borrado en curso (faltan 20 días): nada se purga');
  // El reloj: pasaron los 30 días.
  sql(`update users set delete_at = now() - interval '1 hour' where id = '${BU}'`);
  await barrido();
  const pc = sql(`select (c.purged_at is not null) || '|' || (c.summary is null) || '|' || (c.device is null) || '|' || c.status || '|' || c.topic || '|' || (select bool_and(m.body is null) from support_messages m where m.case_id = c.id)
    from support_cases c where c.number = '${tb1.persona.caso}'`);
  ok(/^true\|true\|true\|[a-z_]+\|pago\|true$/.test(pc), `a los 30 días: el caso queda (estado y tema) sin resumen, dispositivo ni mensajes (${pc})`);
  const pur = (cp) => sql(`select (purged_at is not null)::text from compa_conversations where number = '${cp}'`);
  ok(pur(tb2.conversacion) === 'true' && pur(tb1.conversacion) === 'false' && pur(tb3.conversacion) === 'false', 'su conversación cerrada se purga; las abiertas (la que pasó a Soporte y otra) esperan a cerrarse');
  sql(`update compa_conversations set closed_at = now(), outcome = case when outcome = 'open' then 'self_resolved' else outcome end where number in ('${tb1.conversacion}', '${tb3.conversacion}')`); await barrido();
  ok(pur(tb1.conversacion) === 'true' && pur(tb3.conversacion) === 'true', 'al cerrarse (el barrido las cierra a las 24 h), la pasada siguiente las purga');
  ok(sql(`select status || '|' || url || '|' || (purged_at is not null) from media where id = '${foto}'`) === 'removed|privado/borrada|true', 'la foto privada del caso: archivo borrado y la fila queda «removed»');
  ok(sql(`select bool_and(h.summary is null and h.purged_at is not null) from compa_handoffs h join compa_conversations c on c.id = h.conversation_id where c.number = '${tb1.conversacion}'`) === 't', 'y el resumen al pasar a una persona');
  await pa.goto(B + `/admin/soporte?caso=${tb1.persona.caso}`); await pa.getByText(tb1.persona.caso).first().waitFor();
  ok((await texto(pa)).includes('(Se borró: la cuenta se cerró hace más de 30 días.)') && !(await texto(pa)).includes('lo reviso hoy'), 'Soporte › el caso: «Se borró: la cuenta se cerró…»');
  // La base no deja reescribir ni purgar a medias.
  const mid = sql(`select m.id from compa_messages m join compa_conversations c on c.id = m.conversation_id where c.number = '${nuevo}' limit 1`);
  try { sql(`update compa_messages set text = 'otra cosa', purged_at = null where id = ${mid}`); dbR = ''; } catch (e) { dbR = String(e.stderr ?? e.message); }
  ok(/solo de inserción/.test(dbR), 'un mensaje purgado no vuelve a tener texto');
  const mvivo = sql(`select m.id from compa_messages m join compa_conversations c on c.id = m.conversation_id where c.number = '${t1.conversacion}' limit 1`);
  try { sql(`update compa_messages set text = null, purged_at = now(), sender = 'system' where id = ${mvivo}`); dbR = ''; } catch (e) { dbR = String(e.stderr ?? e.message); }
  ok(/solo de inserción/.test(dbR), 'la purga no puede cambiar nada más que el texto');
  try { sql(`update support_messages set body = 'otra' where case_id = (select id from support_cases where number = '${tb1.persona.caso}')`); dbR = ''; } catch (e) { dbR = String(e.stderr ?? e.message); }
  ok(/solo de inserción/.test(dbR), 'ni un mensaje de Soporte purgado');
  sql(`update users set delete_at = null, delete_reason = null where id = '${BU}'`);

  ok(!errs.length, `sin errores de página${errs.length ? ': ' + errs.join(' | ') : ''}`);
  const log = fs.readFileSync(S + '/server.log', 'utf8');
  ok(!/kumquats|Hola Borrada|570555012/.test(log), 'el registro del servidor no tiene textos de las conversaciones');
  await br.close();
  console.log(`\n${n} comprobaciones ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
