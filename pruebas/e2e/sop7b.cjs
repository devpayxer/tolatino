// 7b · Soporte: la persona abre un caso (tarjeta escrita → tapada; foto privada), el equipo responde con una macro, la nota interna nunca le
// llega, «¿Se resolvió?» No → reabierto, Sí; «Abrir otro caso» enlazado; un miembro de un negocio abre uno desde el panel; Soporte devuelve $40
// (sí) y $60 (no: tope del rol), Admin devuelve $60 (sí), nunca más de lo cobrado, la misma llave dos veces = una devolución; IDOR con otro
// vecino y otro negocio (página, foto y acciones del servidor); SLA en la cola (y viernes 5:30 PM → lunes 4:30 PM); ligar a una operación;
// unir duplicados; macros sin HTML; límite de casos por día. Teléfono 390 y escritorio 1360.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const MAN = JSON.parse(fs.readFileSync(ENT.RAIZ + '/apps/web/.next/server/server-reference-manifest.json', 'utf8')).node;
const ACT = Object.fromEntries(Object.entries(MAN).map(([id, v]) => [v.exportedName, id]));
// Llama una acción del servidor tal como lo hace el navegador (misma sesión y origen), para probar lo que la pantalla no deja hacer.
const accion = (p, name, args) => p.evaluate(async ([id, args]) => (await fetch(location.pathname + location.search, { method: 'POST', headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, body: JSON.stringify(args) })).text(), [ACT[name], args]);
const MARISOL = '5705550122', YARITZA = '5705550299', HECTOR = '5705550288', YESENIA = '5705550433', JUAN = '5705550444', ADM = '5705550199', DAYANA = '5705550677';
const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
const caso = (num, col) => sql(`select ${col} from support_cases where number = '${num}'`);
const ultimo = (t) => sql(`select number from support_cases where user_id = '${uid(t)}' order by id desc limit 1`);
const cfg = (k, v) => sql(v == null ? `delete from platform_config where key = '${k}'` : `insert into platform_config (key, value, note) values ('${k}', to_jsonb(${v}), 'prueba sop7b') on conflict (key) do update set value = excluded.value`);
const RUN = String(Date.now() % 1000000);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAQ0lEQVR42u3OMQ0AAAgDIJfc6FrDOwEc5KQqYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYvoWnloDQZ9vyy4AAAAASUVORK5CYII=', 'base64'); // GUARDIAN-OK: un PNG de 64×64 de prueba

(async () => {
  // ── Preparar: un pedido de Marisol pagado con tarjeta ($150, cobrado en el simulador), límites de prueba ──
  const MU = uid(MARISOL);
  const op = sql(`with o as (insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, pay_mode, subtotal_cents, tax_cents, total_cents, done_at, is_test, client_key)
      values (nextval('operations_order_seq')::text, 'order', 'hzl', 'el-fogon', '${MU}', 'done', 'picked_up', 'pickup', 'app', 14000, 1000, 15000, now() - interval '2 hours', true, gen_random_uuid()) returning id, number)
    select id || '|' || number from o`).split('|');
  const OPID = op[0], OPNUM = op[1], PI = `pi_sim_sop7b-${OPID}`;
  sql(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card) values ('${PI}', 15000, 1500, 'acct_sim_el-fogon', 'succeeded', 15000, 'pm_sim_visa_4242')`);
  sql(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated)
       values (${OPID}, '${MU}', 'el-fogon', 'hzl', 'full', 'card', '${PI}', 15000, 15000, 1500, 'captured', 'visa', '4242', now(), now(), true)`);
  const pago = () => sql(`select status || '|' || amount_cents || '|' || refunded_cents from payments where operation_id = ${OPID}`);
  // Reloj movido para la prueba: los mensajes de corridas anteriores pasan a hace 2 h (el límite de 30 por hora es por persona). Solo en la base local.
  sql(`set session_replication_role = replica; update support_messages set at = at - interval '2 hours' where user_id in ('${MU}', '${uid(YESENIA)}', '${uid(HECTOR)}') and at > now() - interval '1 hour'`);
  cfg('soporte_casos_dia_max', 50); cfg('soporte_devolver_max_cents', null);
  await new Promise((r) => setTimeout(r, 16000)); // la caché de Configuración (15 s)
  const br = await chromium.launch();
  const tel = async () => br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const esc = async () => br.newContext({ viewport: { width: 1360, height: 900 } });

  console.log('0 · SLA en horas hábiles');
  ok(sql(`select to_char(soporte_sla('hzl', '2026-11-13 17:30 America/New_York', 8) at time zone 'America/New_York', 'Dy HH24:MI')`) === 'Mon 16:30', 'viernes 5:30 PM + 8 h hábiles (9–6) → lunes 4:30 PM');
  ok(sql(`select to_char(soporte_sla('hzl', '2026-11-14 11:00 America/New_York', 8) at time zone 'America/New_York', 'Dy HH24:MI')`) === 'Mon 17:00', 'sábado → lunes 5 PM (9 AM + 8 h)');

  console.log('1 · La persona abre un caso (390): tema, ¿cuál?, foto privada y una tarjeta escrita');
  let c = await tel(), p = await c.newPage(); p.on('pageerror', (e) => console.log('   ERR', e.message));
  await entrar(p, MARISOL);
  await p.goto(B + '/cuenta');
  ok((await texto(p)).includes('Ayuda y soporte'), 'Mi cuenta › «Ayuda y soporte»');
  await p.getByText('Ayuda y soporte', { exact: true }).first().click();
  await espera(async () => p.url().endsWith('/soporte'));
  ok((await texto(p)).includes('TUS CASOS') && (await texto(p)).includes('lunes a viernes, de 9 AM a 6 PM'), '/soporte: TUS CASOS y el horario de Configuración');
  await p.screenshot({ path: OUT + 'e7b-soporte-390.png', fullPage: true });
  await p.getByRole('button', { name: 'Escríbenos' }).first().click();
  await p.waitForSelector('[data-screen-label="Soporte · caso nuevo"]');
  await p.click('[data-tema="pago"]');
  await p.waitForSelector(`[data-op="${OPNUM}"]`);
  await p.click(`[data-op="${OPNUM}"]`);
  await p.fill('textarea[name=mensaje]', 'Me cobraron dos veces el pedido. Mi tarjeta es 4242 4242 4242 4242 y el cvv 123, por si lo necesitan.');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByText('Agregar una foto').click()]);
  await fc.setFiles({ name: 'recibo.png', mimeType: 'image/png', buffer: PNG });
  await espera(async () => (await texto(p)).includes('Cambiar foto'));
  await p.screenshot({ path: OUT + 'e7b-nuevo-390.png', fullPage: true });
  await p.getByRole('button', { name: 'Enviar' }).click();
  await p.waitForSelector('[data-screen-label="Soporte · caso"]');
  const TK1 = ultimo(MARISOL);
  ok(/^TK-\d+$/.test(TK1) && p.url().includes(`caso=${TK1}`), `caso abierto ${TK1}`);
  ok(caso(TK1, `topic || '|' || operation_id || '|' || status || '|' || origin`) === `pago|${OPID}|new|form`, 'tema pago, ligado al pedido, nuevo, desde el formulario');
  const body1 = sql(`select body from support_messages where case_id = (select id from support_cases where number = '${TK1}') and sender = 'user'`);
  ok(!/4242 4242/.test(body1) && !/cvv 123/.test(body1) && body1.includes('[tapado]'), `la tarjeta y el código quedaron tapados en la base («${body1.slice(0, 70)}…»)`);
  ok((await texto(p)).includes('[tapado]') && !(await texto(p)).includes('4242 4242'), 'en pantalla también tapado');
  ok(sql(`select count(*) from queue_items where queue = 'ticket' and subject_id = (select id::text from support_cases where number = '${TK1}') and status = 'open'`) === '1', 'entró a la cola «ticket»');
  ok(caso(TK1, `sla_due_at > created_at`) === 't', 'con su plazo (sla_due_at)');
  ok(sql(`select count(*) from notifications where tpl = 'sop_recibido' and ref_id = '${TK1}'`) === '1', 'aviso «Recibimos tu caso»');
  const foto = sql(`select m.id || '|' || m.private || '|' || m.owner_kind from media m join support_messages s on s.photo_media_id = m.id where s.case_id = (select id from support_cases where number = '${TK1}')`).split('|');
  ok(foto[1] === 'true' && foto[2] === 'support', 'la foto es privada y del caso');
  ok((await p.request.get(B + `/api/ayuda/foto/${foto[0]}`)).status() === 200, 'quien la subió la ve');
  ok((await p.locator('[data-estado="nuevo"]').count()) === 1 && (await texto(p)).includes('RECIBIDO'), 'estado RECIBIDO');
  await p.screenshot({ path: OUT + 'e7b-caso-390.png', fullPage: true });
  // Un toque = un caso: la misma clave dos veces abre uno.
  const clave = sql('select gen_random_uuid()');
  const a1 = await accion(p, 'casoAbrir', [{ tema: 'cuenta', texto: 'Quiero cambiar el correo de mi cuenta por favor', clave }, null]);
  const a2 = await accion(p, 'casoAbrir', [{ tema: 'cuenta', texto: 'Quiero cambiar el correo de mi cuenta por favor', clave }, null]);
  const m1 = /"numero":"(TK-\d+)"/.exec(a1)?.[1], m2 = /"numero":"(TK-\d+)"/.exec(a2)?.[1];
  ok(m1 && m1 === m2 && sql(`select count(*) from support_cases where client_key = '${clave}'`) === '1', `enviar dos veces con la misma clave = un caso (${m1})`);
  const TK2 = m1;
  // Una operación ajena no se puede elegir en «¿Cuál?».
  const ajena = sql(`select number from operations where user_id <> '${MU}' order by id desc limit 1`); if (!ajena) throw new Error('sin operación ajena');
  ok(/Elige una de la lista/.test(await accion(p, 'casoAbrir', [{ tema: 'pedido', operacion: ajena, texto: 'Este pedido no es mío pero quiero verlo', clave: sql('select gen_random_uuid()') }, null])), 'una operación de otra persona → «Elige una de la lista»');
  await c.close();

  console.log('2 · El equipo (Admin, 1360): SLA en la cola, macro, nota interna');
  c = await esc(); p = await c.newPage(); p.on('pageerror', (e) => console.log('   ERR', e.message));
  await entrar(p, ADM);
  await p.goto(B + '/admin/soporte');
  let t = await texto(p);
  // 8f · La base local acumula ~180 casos abiertos de corridas anteriores con plazo antes que el nuevo: la primera página (61) ya no lo trae.
  // Se busca por su número (la misma lista, con ?q=); el resto de la prueba no cambia.
  let enLista = t.includes(TK1);
  if (!enLista) { await p.goto(B + '/admin/soporte?q=' + TK1); enLista = (await texto(p)).includes(TK1); await p.goto(B + '/admin/soporte'); t = await texto(p); }
  ok(t.includes('Soporte') && t.includes('ABIERTOS') && enLista, 'Super Admin › Soporte con cifras y el caso nuevo');
  // 9a · Con tantos casos viejos vencidos, la primera página ya no trae uno «por vencer»: el nuevo (TK1) se busca por su número.
  const tk = (await (async () => { await p.goto(B + '/admin/soporte?q=' + TK1); const x = await texto(p); await p.goto(B + '/admin/soporte'); return x; })());
  ok(/VENCIDO · hace/.test(t) && /vence /.test(tk), 'la cola dice el plazo: «vence …» (el caso nuevo) y «VENCIDO» (los viejos)');
  await p.goto(B + '/admin'); await p.getByText('Soporte', { exact: true }).first().click();
  ok(await espera(async () => new URL(p.url()).pathname === '/admin/soporte'), 'el menú «Soporte» lleva a /admin/soporte');
  await p.goto(B + '/admin/colas?cola=ticket');
  ok((await texto(p)).includes(TK1), 'Colas › «Soporte · casos» también lo muestra');
  await p.goto(B + `/admin/soporte?caso=${TK1}`);
  await p.waitForSelector(`[data-tk-abierto="${TK1}"]`);
  t = await texto(p);
  ok(t.includes('Marisol') && t.includes('(570) 555-0122') && t.includes(`#${OPNUM}`) && t.includes('DISPOSITIVO Y VERSIÓN'), 'contexto automático: persona, teléfono, pedido, dispositivo');
  ok(t.includes('$150.00') && t.includes('Hasta lo cobrado'), 'lo pagado y el tope de Admin (hasta lo cobrado)');
  await p.getByText('Ya lo estoy viendo', { exact: true }).click();
  ok((await p.locator('textarea').first().inputValue()).startsWith('Hola Marisol.'), 'la macro llena la respuesta con {nombre}');
  await p.getByRole('button', { name: 'Enviar' }).click();
  ok(await espera(() => caso(TK1, 'status') === 'waiting'), 'respondido → TE RESPONDIERON (waiting)');
  ok(sql(`select macro_key from support_messages where case_id = (select id from support_cases where number = '${TK1}') and sender = 'staff'`) === 'ya-lo-veo', 'el mensaje guarda la macro');
  ok(sql(`select count(*) from queue_items where queue = 'ticket' and subject_id = (select id::text from support_cases where number = '${TK1}') and status = 'open'`) === '0', 'le toca a la persona: sale de la cola');
  ok(await espera(() => sql(`select count(*) from notifications where tpl = 'sop_respuesta' and ref_id = '${TK1}'`) === '1'), 'aviso «Te respondieron»');
  await p.getByText('Nota interna (solo el equipo)').click();
  await p.locator('textarea').first().fill(`NOTA-SECRETA-7B-${RUN}: revisar el cobro doble con Finanzas antes de devolver.`);
  await p.getByRole('button', { name: 'Guardar nota' }).click();
  ok(await espera(() => sql(`select count(*) from support_messages where internal and body like 'NOTA-SECRETA-7B-${RUN}%'`) === '1'), 'nota interna guardada (internal)');
  await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + 'e7b-admin-caso-1360.png', fullPage: true });
  await c.close();

  console.log('3 · La persona ve la respuesta y NUNCA la nota interna');
  c = await tel(); p = await c.newPage(); await entrar(p, MARISOL);
  await p.goto(B + `/soporte?caso=${TK1}`);
  t = await texto(p);
  ok(t.includes('Ya estoy viendo tu caso') && t.includes('TE RESPONDIERON'), 've la respuesta del equipo y TE RESPONDIERON');
  ok(!t.includes('NOTA-SECRETA') && !(await p.content()).includes('NOTA-SECRETA'), 'la nota interna no está ni en la pantalla ni en el HTML');
  await p.goto(B + '/soporte');
  ok(!(await p.content()).includes('NOTA-SECRETA'), 'ni en la lista');
  const rsc = await p.evaluate(async (u) => (await fetch(u, { headers: { RSC: '1' } })).text(), `/soporte?caso=${TK1}`);
  ok(!rsc.includes('NOTA-SECRETA') && rsc.includes('Ya estoy viendo'), 'ni en la carga RSC de la página');
  // Contesta → vuelve al equipo.
  await p.goto(B + `/soporte?caso=${TK1}`);
  await p.fill('input[name=respuesta]', 'Gracias. Fue el pedido de ayer al mediodía.');
  await p.click('[data-accion="enviar"]');
  ok(await espera(() => caso(TK1, 'status') === 'in_progress'), 'la persona contesta → vuelve al equipo (LO ESTÁN VIENDO)');
  ok(sql(`select count(*) from queue_items where queue = 'ticket' and subject_id = (select id::text from support_cases where number = '${TK1}') and status = 'open'`) === '1', 'y a la cola, con plazo nuevo');
  await c.close();

  console.log('4 · IDOR: otro vecino y otro negocio');
  c = await tel(); p = await c.newPage(); await entrar(p, YARITZA);
  await p.goto(B + `/soporte?caso=${TK1}`);
  t = await texto(p);
  ok(t.includes('Ese caso no existe') && !t.includes('Me cobraron dos veces') && !(await p.content()).includes('Me cobraron dos veces'), 'Yaritza no ve el caso de Marisol');
  ok((await p.request.get(B + `/api/ayuda/foto/${foto[0]}`)).status() === 404, 'ni su foto (404)');
  ok(/Ese caso no existe/.test(await accion(p, 'casoEscribir', [TK1, 'hola desde otra cuenta', null, null])), 'escribir en un caso ajeno → «Ese caso no existe»');
  ok(/Ese caso no existe/.test(await accion(p, 'casoResuelto', [TK1, null])), 'cerrar un caso ajeno → no');
  ok(/Ese caso no existe/.test(await accion(p, 'casoCalificar', [TK1, true, null])), 'calificar un caso ajeno → no');
  ok(sql(`select count(*) from support_messages where body = 'hola desde otra cuenta' and case_id = (select id from support_cases where number = '${TK1}')`) === '0' && caso(TK1, 'status') === 'in_progress', 'nada cambió en el caso');
  ok(/Ese negocio no existe/.test(await accion(p, 'casoAbrir', [{ tema: 'pago', texto: 'Quiero ver los pagos de este negocio', clave: sql('select gen_random_uuid()') }, 'rentas-hazleton-latino'])), 'abrir un caso de un negocio ajeno → no');
  await p.goto(B + '/soporte?negocio=rentas-hazleton-latino');
  ok((await texto(p)).includes('Sin acceso a este negocio'), 'el Soporte de un negocio ajeno → «Sin acceso»');
  ok((await p.goto(B + `/admin/soporte?caso=${TK1}`)).status() < 500 && !(await texto(p)).includes('Me cobraron dos veces'), 'un vecino no entra a Super Admin › Soporte');
  ok(/Entra con tu cuenta del equipo|no/.test(await accion(p, 'sopResponder', [TK1, 'respuesta falsa', null])) && sql(`select count(*) from support_messages where body = 'respuesta falsa'`) === '0', 'un vecino no puede llamar las acciones del equipo');
  await c.close();

  console.log('5 · Un miembro del negocio abre un caso desde Panel › Más (390)');
  c = await tel(); p = await c.newPage(); p.on('pageerror', (e) => console.log('   ERR', e.message)); await entrar(p, YESENIA);
  await p.goto(B + '/panel/rentas-hazleton-latino/mas');
  ok((await texto(p)).includes('Ayuda y Soporte'), 'Panel › Más › «Ayuda y Soporte»');
  await p.getByText('Ayuda y Soporte', { exact: true }).click();
  await espera(async () => p.url().includes('/soporte?negocio=rentas-hazleton-latino'));
  t = await texto(p);
  ok(t.includes('LOS CASOS DE TU NEGOCIO') && t.includes('RENTAS HAZLETON LATINO'), 'el Soporte del negocio, con sus casos');
  await p.getByRole('button', { name: 'Escríbenos' }).first().click();
  await p.waitForSelector('[data-tema]');
  const temas = await p.$$eval('[data-tema]', (xs) => xs.map((x) => x.getAttribute('data-tema')));
  ok(temas.join(',') === 'pago,cuenta,tecnico,sugerencia', `el negocio elige pago · cuenta · técnico · sugerencia (${temas.join(',')})`);
  await p.click('[data-tema="tecnico"]');
  await p.fill('textarea[name=mensaje]', 'El calendario del panel no me deja mover una visita al jueves.');
  await p.screenshot({ path: OUT + 'e7b-panel-nuevo-390.png', fullPage: true });
  await p.getByRole('button', { name: 'Enviar' }).click();
  await p.waitForSelector('[data-screen-label="Soporte · caso"]');
  const TKN = ultimo(YESENIA);
  ok(caso(TKN, `business_id || '|' || origin || '|' || topic`) === 'rentas-hazleton-latino|panel|tecnico', `${TKN}: del negocio, desde el panel`);
  await p.screenshot({ path: OUT + 'e7b-panel-caso-390.png', fullPage: true });
  await p.goto(B + `/soporte?caso=${TKN}`);
  ok((await texto(p)).includes('Ese caso no existe'), 'fuera del contexto del negocio el caso no sale en su Soporte personal');
  await c.close();
  c = await tel(); p = await c.newPage(); await entrar(p, JUAN);
  await p.goto(B + `/soporte?negocio=autos-el-cibao&caso=${TKN}`);
  ok((await texto(p)).includes('Ese caso no existe'), 'el dueño de otro negocio no lo ve en su panel');
  await p.goto(B + `/soporte?negocio=rentas-hazleton-latino&caso=${TKN}`);
  ok((await texto(p)).includes('Sin acceso a este negocio'), 'ni pidiendo el negocio ajeno');
  ok(/Ese caso no existe/.test(await accion(p, 'casoEscribir', [TKN, 'soy de otro negocio', null, 'autos-el-cibao'])), 'ni escribiendo en él');
  await c.close();

  console.log('6 · Resolver · ¿Se resolvió? No → reabierto · Sí · Abrir otro caso enlazado');
  c = await esc(); p = await c.newPage(); await entrar(p, ADM);
  await p.goto(B + `/admin/soporte?caso=${TK2}`);
  await p.getByRole('button', { name: 'Resolver' }).click();
  await p.locator('textarea').last().fill('Listo: cambiamos el correo de tu cuenta. Revisa tu bandeja para confirmarlo.');
  await p.getByRole('button', { name: 'Confirmar' }).click();
  ok(await espera(() => caso(TK2, 'status') === 'resolved'), `${TK2} resuelto por el equipo`);
  ok(await espera(() => sql(`select count(*) from notifications where tpl = 'sop_resuelto' and ref_id = '${TK2}'`) === '1'), 'aviso «Tu caso quedó resuelto»');
  await c.close();
  c = await tel(); p = await c.newPage(); await entrar(p, MARISOL);
  await p.goto(B + `/soporte?caso=${TK2}`);
  await p.waitForSelector('[data-screen-label="Soporte · ¿se resolvió?"]');
  await p.screenshot({ path: OUT + 'e7b-resuelto-390.png', fullPage: true });
  await p.locator('[data-screen-label="Soporte · ¿se resolvió?"]').getByText('No', { exact: true }).click();
  ok(await espera(() => caso(TK2, 'status') === 'reopened'), '«No» → reabierto (vuelve a la cola)');
  ok(sql(`select count(*) from queue_items where queue = 'ticket' and subject_id = (select id::text from support_cases where number = '${TK2}') and status = 'open'`) === '1', 'con su cola abierta otra vez');
  await c.close();
  c = await esc(); p = await c.newPage(); await entrar(p, ADM);
  await p.goto(B + `/admin/soporte?caso=${TK2}`);
  ok((await texto(p)).includes('NO se resolvió'), 'el equipo ve que la persona dijo que no');
  await p.getByRole('button', { name: 'Resolver' }).click();
  await p.locator('textarea').last().fill('Ahora sí: el correo nuevo ya quedó confirmado.');
  await p.getByRole('button', { name: 'Confirmar' }).click();
  ok(await espera(() => caso(TK2, 'status') === 'resolved'), 'resuelto otra vez');
  await c.close();
  c = await tel(); p = await c.newPage(); await entrar(p, MARISOL);
  await p.goto(B + `/soporte?caso=${TK2}`);
  await p.locator('[data-screen-label="Soporte · ¿se resolvió?"]').getByText('Sí', { exact: true }).click();
  ok(await espera(() => caso(TK2, 'csat') === 'yes'), '«Sí» → csat yes');
  await p.goto(B + `/soporte?caso=${TK2}`);
  await p.getByRole('button', { name: 'Abrir otro caso' }).click();
  await p.waitForSelector('[data-screen-label="Soporte · caso nuevo"]');
  ok((await texto(p)).includes(`ENLAZADO A ${TK2}`), '«Abrir otro caso» enlazado');
  await p.fill('textarea[name=mensaje]', 'Ahora no me llegan los recibos al correo nuevo.');
  await p.getByRole('button', { name: 'Enviar' }).click();
  await p.waitForSelector('[data-screen-label="Soporte · caso"]');
  const TK3 = ultimo(MARISOL);
  ok(caso(TK3, '(select number from support_cases x where x.id = support_cases.linked_case_id)') === TK2 && caso(TK3, 'topic') === 'cuenta', `${TK3} enlazado a ${TK2}, mismo tema`);
  await c.close();

  console.log('7 · Devolver: Soporte $60 no, $40 sí; Admin $60 sí; nunca más de lo cobrado; la misma llave = una vez');
  c = await esc(); p = await c.newPage(); p.on('pageerror', (e) => console.log('   ERR', e.message)); await entrar(p, DAYANA);
  await p.goto(B + `/admin/soporte?caso=${TK1}`);
  t = await texto(p);
  ok(t.includes('$50.00 de $50.00'), 'Dayana (Soporte) ve su tope: $50 por caso');
  const devolverUI = async (monto, msg) => {
    await p.getByRole('button', { name: 'Resolver y devolver' }).first().click();
    await p.locator('input').filter({ hasNot: p.locator('[type=hidden]') }).last().fill(monto);
    await p.locator('textarea').last().fill(msg);
    await p.getByRole('button', { name: 'Resolver y devolver' }).last().click();
    await p.waitForTimeout(1500);
  };
  await devolverUI('60', 'Te devolvemos lo cobrado de más.');
  ok((await texto(p)).includes('Tu rol devuelve hasta $50.00 por caso'), 'Soporte · $60 → rechazado por el tope del rol');
  ok(pago() === 'captured|15000|0' && sql(`select count(*) from support_refunds where case_id = (select id from support_cases where number = '${TK1}')`) === '0', 'no se llamó a la pasarela ni quedó nada');
  await p.goto(B + `/admin/soporte?caso=${TK1}`);
  await devolverUI('40', 'Tienes razón: te devolvemos $40 de lo cobrado de más a tu tarjeta.');
  ok(await espera(() => pago() === 'partially_refunded|15000|4000'), 'Soporte · $40 → devuelto ($40 a la tarjeta)');
  ok(sql(`select staff_role || '|' || cap_cents || '|' || status from support_refunds where case_id = (select id from support_cases where number = '${TK1}')`) === 'soporte|5000|done', 'la base anotó rol, tope aplicado y hecha');
  ok(caso(TK1, `status || '|' || refunded_cents`) === 'resolved|4000', 'el caso queda resuelto con $40 devueltos');
  ok(sql(`select count(*) from audit_entries where action = 'soporte.devolver' and target_id = '${TK1}'`) === '1', 'auditoría soporte.devolver');
  ok(sql(`select count(*) from notifications where tpl = 'pay_refund' and user_id = '${MU}' and created_at > now() - interval '5 minutes'`) >= '1', 'aviso de la devolución a la persona');
  await p.screenshot({ path: OUT + 'e7b-devolver-1360.png', fullPage: true });
  await c.close();
  c = await esc(); p = await c.newPage(); await entrar(p, ADM);
  await p.goto(B + `/admin/soporte?caso=${TK1}`);
  await p.getByRole('button', { name: 'Reabrir' }).click();
  await p.getByText('Falta un paso').click();
  await p.getByRole('button', { name: 'Confirmar' }).click();
  ok(await espera(() => caso(TK1, 'status') === 'reopened'), 'Admin reabre el caso');
  // Cumulativo: Dayana ya devolvió $40 en este caso → $20 más pasa del tope ($60 > $50).
  const cd = await br.newContext(), pd = await cd.newPage(); await entrar(pd, DAYANA); await pd.goto(B + `/admin/soporte?caso=${TK1}`);
  ok(/Tu rol devuelve hasta \$50\.00 por caso \(ya se devolvieron \$40\.00\)/.test(await accion(pd, 'sopDevolver', [TK1, '20', sql('select gen_random_uuid()'), 'Otros $20 de lo cobrado de más.'])), 'Soporte: $20 más en el mismo caso → el tope cuenta lo ya devuelto');
  ok(/Ahí no hay nada pagado|Tu rol/.test(await accion(pd, 'sopDevolver', [TK3, '5', sql('select gen_random_uuid()'), 'Te devolvemos algo por la molestia.'])), 'un caso sin operación pagada no devuelve');
  await cd.close();
  await p.goto(B + `/admin/soporte?caso=${TK1}`);
  ok(/Puedes devolver hasta \$110\.00/.test(await accion(p, 'sopDevolver', [TK1, '200', sql('select gen_random_uuid()'), 'Te devolvemos todo y más.'])), 'Admin · $200 sobre $150 cobrados → «Puedes devolver hasta $110.00» (nunca más de lo cobrado)');
  ok(pago() === 'partially_refunded|15000|4000', 'nada se movió');
  const K = sql('select gen_random_uuid()');
  const [d1, d2] = await Promise.all([accion(p, 'sopDevolver', [TK1, '60', K, 'Te devolvemos $60 más del cobro doble.']), accion(p, 'sopDevolver', [TK1, '60', K, 'Te devolvemos $60 más del cobro doble.'])]);
  ok(/"ok":true/.test(d1) || /"ok":true/.test(d2), 'Admin · $60 → devuelto (rol sin tope, hasta lo cobrado)');
  await p.waitForTimeout(1500);
  ok(pago() === 'partially_refunded|15000|10000', 'la misma llave dos veces a la vez = UNA devolución ($40 + $60)');
  ok(sql(`select count(*) from refunds where idem_key = 'tk-${K}'`) === '1' && sql(`select count(*) from sim_refunds where id = 're_sim_tk-${K}'`) === '1', 'una fila en refunds y una en la pasarela');
  const d3 = await accion(p, 'sopDevolver', [TK1, '60', K, 'Te devolvemos $60 más del cobro doble.']);
  ok(/Ya se devolvió/.test(d3) && pago() === 'partially_refunded|15000|10000', 'repetirla después → «Ya se devolvió», nada más');
  ok(sql(`select string_agg(staff_role || ':' || coalesce(cap_cents::text, 'sin tope') || ':' || amount_cents, ',' order by id) from support_refunds where status = 'done' and case_id = (select id from support_cases where number = '${TK1}')`) === 'soporte:5000:4000,admin:sin tope:6000', 'support_refunds: soporte $40 (tope $50) y admin $60 (sin tope)');
  ok(sql(`select status || '|' || coalesce(fail_reason, '') from support_refunds where amount_cents = 20000 and case_id = (select id from support_cases where number = '${TK1}')`).startsWith('failed|Puedes devolver hasta'), 'el intento de $200 queda «fallida» con su motivo');
  let insOk = true; try { sql(`delete from support_refunds where idem_key = 'tk-${K}'`); insOk = false; } catch { /* esperado */ }
  ok(insOk, 'support_refunds no se borra (la base lo impide)');
  // La base pone el tope aunque alguien se salte la app.
  let topeBase = false; try { sql(`insert into support_refunds (case_id, payment_id, idem_key, amount_cents, staff_id) values ((select id from support_cases where number = '${TK3}'), (select id from payments where operation_id = ${OPID}), 'tk-' || gen_random_uuid(), 100, '${uid(DAYANA)}')`); } catch (e) { topeBase = /devolucion_otro_cobro/.test(String(e.stderr)); }
  ok(topeBase, 'la base rechaza devolver un cobro que no es de la operación del caso');

  console.log('8 · Ligar a una operación, unir duplicados, macros sin HTML');
  await p.goto(B + `/admin/soporte?caso=${TK3}`);
  ok(/Esa operación no es de esta persona/.test(await accion(p, 'sopLigar', [TK3, ajena, 'Es la operación de la que habla'])), 'ligar a una operación ajena → no');
  await p.getByRole('button', { name: 'Ligar a una operación' }).click();
  await p.locator('input').last().fill(OPNUM);
  await p.getByText('Es la operación de la que habla').click();
  await p.getByRole('button', { name: 'Confirmar' }).click();
  ok(await espera(() => caso(TK3, 'operation_id') === OPID), `ligado al pedido #${OPNUM}`);
  ok(sql(`select count(*) from support_messages where case_id = (select id from support_cases where number = '${TK3}') and sys_key = 'ligado' and internal`) === '1', 'queda como nota interna');
  const TK4 = /"numero":"(TK-\d+)"/.exec(await (async () => { const cm = await br.newContext(), pm = await cm.newPage(); await entrar(pm, MARISOL); await pm.goto(B + '/soporte'); const r = await accion(pm, 'casoAbrir', [{ tema: 'cuenta', texto: 'Otra vez: no me llegan los recibos al correo.', clave: sql('select gen_random_uuid()') }, null]); await cm.close(); return r; })())?.[1];
  ok(/Solo se unen casos de la misma persona/.test(await accion(p, 'sopUnir', [TK4, 'TK-5204', 'Es el mismo problema'])), 'unir con un caso de otra persona → no');
  ok(/"ok":true/.test(await accion(p, 'sopUnir', [TK4, TK3, 'Es el mismo problema'])), `${TK4} unido a ${TK3}`);
  ok(caso(TK4, `status || '|' || (select number from support_cases x where x.id = support_cases.merged_into_id)`) === `merged|${TK3}`, 'queda «unido» con su enlace (nada se borra)');
  ok(/"ok":false/.test(await accion(p, 'sopMacroGuardar', [{ tituloEs: 'Mala', tituloEn: 'Bad', textoEs: 'Hola <script>alert(1)</script> {nombre}', textoEn: 'Hi <b>there</b> {name}' }, 'prueba de HTML'])), 'una macro con etiquetas → rechazada');
  ok(/"ok":false/.test(await accion(p, 'sopMacroGuardar', [{ tituloEs: 'Llave', tituloEn: 'Key', textoEs: 'Hola {telefono}, te escribimos.', textoEn: 'Hi {phone}, we wrote to you.' }, 'prueba de llaves'])), 'una macro con otra llave que no sea {nombre} → rechazada');
  let macroBase = false; try { sql(`insert into support_macros (key, title, body) values ('mala-${Date.now()}', '{"es":"Mala","en":"Bad"}', '{"es":"<img src=x onerror=alert(1)> hola","en":"<img src=x> hello there"}')`); } catch { macroBase = true; }
  ok(macroBase, 'la base también rechaza HTML en una macro');
  const tit = `Prueba 7b ${Date.now() % 100000}`;
  ok(/"ok":true/.test(await accion(p, 'sopMacroGuardar', [{ tituloEs: tit, tituloEn: 'Test 7b', textoEs: 'Hola {nombre}. Esto es una prueba de macros.', textoEn: 'Hi {name}. This is a macro test.', tema: 'cuenta' }, 'prueba sop7b'])), 'una macro de texto se guarda');
  ok(sql(`select count(*) from audit_entries where action = 'soporte.macro' and after->>'titulo' = '${tit}'`) === '1', 'con su auditoría');
  const mk = sql(`select key from support_macros where title->>'es' = '${tit}'`);
  ok(/"ok":true/.test(await accion(p, 'sopMacroEstado', [mk, false, 'ya no se usa'])) && sql(`select status from support_macros where key = '${mk}'`) === 'off', 'apagar una macro (no se borra)');
  await p.goto(B + '/admin/soporte?tab=macros');
  ok((await texto(p)).includes(tit) && (await texto(p)).includes('APAGADA'), 'Macros: la lista con la apagada');
  await p.screenshot({ path: OUT + 'e7b-macros-1360.png', fullPage: true });
  // El equipo ve la foto (y queda en la auditoría).
  ok((await p.request.get(B + `/api/ayuda/foto/${foto[0]}`)).status() === 200 && sql(`select count(*) from audit_entries where action = 'soporte.foto.ver' and target_id = '${TK1}'`) >= '1', 'el equipo ve la foto y queda en la auditoría');
  await p.goto(B + '/admin/soporte');
  await p.screenshot({ path: OUT + 'e7b-admin-cola-1360.png', fullPage: true });
  await c.close();

  console.log('9 · Usuarios 360° › Soporte y escritorio de la persona');
  c = await esc(); p = await c.newPage(); await entrar(p, ADM);
  await p.goto(B + `/admin/usuarios/${MU}?tab=soporte`);
  ok((await texto(p)).includes(TK1) && (await texto(p)).includes('CASOS DE SOPORTE'), 'Usuarios 360° › Soporte con sus casos');
  await p.goto(B + '/admin/negocios/rentas-hazleton-latino?tab=soporte');
  ok((await texto(p)).includes(TKN), 'Negocios 360° › Soporte con el caso del panel');
  await c.close();
  c = await esc(); p = await c.newPage(); await entrar(p, MARISOL);
  await p.goto(B + `/soporte?caso=${TK1}`);
  t = await texto(p);
  ok(t.includes('TE DEVOLVIMOS $40.00 A TU TARJETA') && t.includes('TE DEVOLVIMOS $60.00 A TU TARJETA'), 'la persona ve las dos devoluciones en su caso');
  await p.screenshot({ path: OUT + 'e7b-soporte-1360.png', fullPage: true });
  await p.goto(B + `/soporte?caso=${TK4}`);
  ok((await texto(p)).includes(`UNIDO A OTRO`) && (await texto(p)).includes(TK3), 'el caso unido le dice dónde seguir');
  await c.close();

  console.log('10 · Límite de casos por día');
  const hoyH = sql(`select count(*) from support_cases where user_id = '${uid(HECTOR)}' and created_at > now() - interval '1 day'`);
  cfg('soporte_casos_dia_max', +hoyH + 1); await new Promise((r) => setTimeout(r, 16000));
  c = await tel(); p = await c.newPage(); await entrar(p, HECTOR); await p.goto(B + '/soporte');
  ok(/"ok":true/.test(await accion(p, 'casoAbrir', [{ tema: 'tecnico', texto: 'La app tarda en abrir el mapa del barrio.', clave: sql('select gen_random_uuid()') }, null])), `caso ${+hoyH + 1} del día: sí`);
  ok(/Abriste muchos casos hoy/.test(await accion(p, 'casoAbrir', [{ tema: 'tecnico', texto: 'La app tarda en abrir el mapa del barrio otra vez.', clave: sql('select gen_random_uuid()') }, null])), 'el siguiente → límite');
  ok(/"ok":true/.test(await accion(p, 'casoAbrir', [{ tema: 'cuenta', texto: 'Alguien entró a mi cuenta y no fui yo, cambiaron mi nombre.', clave: sql('select gen_random_uuid()') }, null])), 'uno de seguridad (alguien entró a mi cuenta) nunca se frena');
  ok(caso(ultimo(HECTOR), 'priority') === 'alta', 'y entra con prioridad ALTA');
  await c.close();
  cfg('soporte_casos_dia_max', null);
  await br.close();
  console.log(`\n${n} ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
