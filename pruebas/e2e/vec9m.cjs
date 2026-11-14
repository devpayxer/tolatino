// 9m · Lo diferido del vecino que entra antes de abrir (fase9-apertura.md §4 9m, vec9m). Cada pieza a 390 y a 1360, ES y EN.
// 1 · Mensajes EN VIVO (SSE propio): la clienta (390) escribe y el panel del negocio (1360) lo ve sin recargar; el negocio contesta y le llega a la clienta en ≤ 1 s;
//     con la conversación abierta y quieta, la página no pregunta nada (ninguna petición en 6 s). Lo que se tapa: tarjeta y seguro social → «[tapado]» y la base
//     rechaza el que se salte la app.
// 2 · Empleos en Buscar y «Avísame de nuevas vacantes»; la alerta en Mi cuenta › Avisos con «Quitar»; el barrido avisa UNA vez por vacante nueva.
// 3 · Reportar una vacante y una novedad desde su página (a la cola de Contenido; una vez por persona). «¿Es tu negocio?» en la ficha de un negocio sin dueño.
// 4 · La hoja del plato con «Lleva o es» (alergias), «Lo que más mencionan» en Reseñas, los retiros del fabricante (NHTSA) en la hoja del carro, Buscar casa y carro.
// 5 · Mi cuenta: Pagos y movimientos, Mis boletos guarda TODOS los próximos (sin abrirlos), las sesiones con «iPhone · To'Latino 1.0 (12)», Buscar con la voz
//     (el aviso la primera vez y el interruptor en Privacidad).
// 6 · «Entra para pedir» (AuthSheet) en inglés con su error; el onboarding sigue a «Tu zona» después de «Tú»; el mini mapa del Inicio (1360) y los pines por recuadro.
// 7 · Las piezas con cuenta a 390 y 1360, en español y en inglés: su texto y sin scroll de lado.
// Precondiciones propias: personas nuevas con teléfonos 555 libres; El Compa apagado en el chat de Sabor Dominicano mientras dura (compaEnElChat); una vacante y unos
// retiros de esta corrida (se quitan al final); el huso de Hazleton donde ahora es de día para el barrido (vuelve al final). Cuenta solo sus filas (corre barajada y
// dos veces seguidas).
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, telLibre } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr ?? e.message); } };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `v9m-${nom}.png`, fullPage: full });
const espera = async (f, ms = 15000, cada = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, cada)); } return false; };
const vis = (p, t) => p.locator(`text="${t}" >> visible=true`).first(); // la versión que se ve (el teléfono y el escritorio traen la suya)
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const RUN = Date.now().toString(36), BIZ = 'sabor-dominicano', DUENO = '5705550133', MARISOL = '5705550122', BOLETOS = '5705550201';
const tel390 = (b, extra = {}) => b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, ...extra });
const desk = (b, extra = {}) => b.newContext({ viewport: { width: 1360, height: 900 }, ...extra });

(async () => {
  // ── Precondiciones propias ──
  const compa0 = sql(`select coalesce((select enabled::text from compa_business_settings where business_id = '${BIZ}'), '')`);
  sql(`update compa_business_settings set enabled = false where business_id = '${BIZ}'`);
  const tz0 = sql(`select timezone from cities where id = 'hzl'`);
  // Precondición propia: el tope de códigos por IP (20 por hora) cuenta TODAS las pruebas, que salen de la misma máquina; las entradas de los
  // teléfonos de prueba (570555xxxx) de esta hora pasan a la anterior. El tope por teléfono y la espera de 30 s siguen intactos para los demás.
  sql(`update otp_codes set created_at = created_at - interval '61 minutes' where phone like '+1570555%' and created_at > now() - interval '1 hour' and created_at < now() - interval '45 seconds'`);
  const V1 = telLibre(), V2 = telLibre(), V3 = telLibre();
  const b = await chromium.launch(), err = [], abiertas = [];
  const mirar = (p, tag) => p.on('pageerror', (e) => err.push(`${tag}: ${e.message}`));
  let job = null;
  try {
    // ── 1 · Mensajes en vivo ──
    console.log('1 · Mensajes en vivo (la clienta a 390, el negocio a 1360) y lo que se tapa');
    const cc = await tel390(b); abiertas.push(cc); const pc = await cc.newPage(); mirar(pc, 'clienta');
    await entrarComo(pc, V1, { nombre: 'Vera', apellido: 'Vivo' });
    const U1 = sql(`select id from users where phone = '+1${V1}'`);
    await pc.goto(B + `/cuenta/mensajes/${BIZ}`); await pc.getByPlaceholder(/Escribe a /).waitFor();
    const enviar = async (t) => { await pc.getByPlaceholder(/Escribe a /).fill(t); await pc.getByRole('button', { name: 'Enviar' }).click(); };
    await enviar(`Hola, ¿tienen mangú hoy? vec9m ${RUN}`);
    ok(await espera(() => sql(`select count(*) from chat_messages m join chat_threads t on t.id = m.thread_id where t.user_id = '${U1}' and m.body like '%vec9m ${RUN}'`) === '1'), 'la clienta escribe (se guarda)');
    const HILO = sql(`select id from chat_threads where user_id = '${U1}' and business_id = '${BIZ}'`);
    const cn = await desk(b); abiertas.push(cn); const pn = await cn.newPage(); mirar(pn, 'negocio');
    await entrarComo(pn, DUENO);
    await pn.goto(B + `/panel/${BIZ}/mensajes?det=msg:${HILO}`); await pn.getByText(`vec9m ${RUN}`).first().waitFor();
    // La clienta escribe otra vez: el panel la ve SIN recargar.
    let t0 = Date.now();
    await enviar(`¿Y tostones? vec9m-2 ${RUN}`);
    ok(await espera(async () => (await pn.getByText(`vec9m-2 ${RUN}`).count()) > 0, 5000, 50), `el panel del negocio ve el mensaje nuevo sin recargar (${Date.now() - t0} ms)`);
    // El negocio contesta: le llega a la clienta en ≤ 1 s (desde que el mensaje queda guardado).
    await pn.locator('textarea').last().fill(`Sí, hasta las 3 PM · resp ${RUN}`);
    t0 = Date.now();
    await pn.getByText('Enviar', { exact: true }).last().click();
    await espera(() => sql(`select count(*) from chat_messages where thread_id = ${HILO} and sender = 'business' and body like '%resp ${RUN}'`) === '1', 5000, 30);
    const guardado = Date.now();
    ok(await espera(async () => (await pc.getByText(`resp ${RUN}`).count()) > 0, 3000, 30), 'la respuesta del negocio aparece en el teléfono de la clienta sin recargar');
    const dt = Date.now() - guardado;
    ok(dt <= 1000, `y llega en ≤ 1 s desde que se guarda (${dt} ms; ${Date.now() - t0} ms desde el clic del negocio)`);
    // Directo en la base (otro teléfono del equipo del negocio): también llega en ≤ 1 s.
    t0 = Date.now();
    sql(`insert into chat_messages (thread_id, sender, sender_user_id, body) values (${HILO}, 'business', (select id from users where phone = '+1${DUENO}'), 'Directo · base ${RUN}')`);
    const t1 = Date.now();
    ok(await espera(async () => (await pc.getByText(`Directo · base ${RUN}`).count()) > 0, 3000, 30) && Date.now() - t1 <= 1000, `un mensaje guardado en la base llega en ≤ 1 s (${Date.now() - t1} ms)`);
    await shot(pc, 'chat-vivo-390'); await shot(pn, 'panel-vivo-1360', false);
    // Quieta, la conversación no pregunta nada (antes: cada 4–5 s).
    const posts = []; pc.on('request', (r) => { if (r.method() === 'POST') posts.push(r.url()); });
    await new Promise((r) => setTimeout(r, 6500));
    ok(posts.length === 0, `quieta 6 s, la conversación no pregunta nada (${posts.length} peticiones)`);
    // Lo que se tapa.
    await enviar('mi tarjeta es 4242 4242 4242 4242 y mi seguro 123-45-6789');
    ok(await espera(async () => /No compartas eso aquí/.test(await texto(pc))), 'la clienta ve «No compartas eso aquí. Nunca te lo pedimos.»');
    ok(await espera(() => sql(`select count(*) from chat_messages where thread_id = ${HILO} and body like 'mi tarjeta es [tapado]%' and body like '%seguro [tapado]%'`) === '1'), 'se guarda tapado («[tapado]»): ni la tarjeta ni el seguro social');
    ok(/mensajes_sin_secretos/.test(sqlErr(`insert into chat_messages (thread_id, sender, body) values (${HILO}, 'user', 'ssn 123-45-6789')`)), 'la base rechaza el que se salte la app');

    // ── 2 · Empleos en Buscar y las alertas ──
    console.log('2 · Empleos en Buscar, «Avísame de nuevas vacantes», Mi cuenta › Avisos con «Quitar» y el barrido una vez');
    await pc.goto(B + '/buscar?q=empleo'); await pc.locator('[data-screen-label="APP-BUSCAR · empleos"]').first().waitFor();
    ok((await pc.locator('[data-vacante]').count()) > 0, 'Buscar «empleo» trae las vacantes de la ciudad');
    await pc.getByRole('button', { name: 'Avísame de nuevas vacantes' }).click();
    ok(await espera(() => sql(`select count(*) from search_alerts where user_id = '${U1}' and kind = 'vacantes' and removed_at is null`) === '1'), '«Avísame de nuevas vacantes» queda (una por ciudad)');
    await pc.locator('[data-alerta-vacantes]').waitFor(); await shot(pc, 'buscar-empleos-390');
    // El barrido: una vacante nueva → un aviso; otra vuelta → nada más. (De día en la ciudad: el huso donde ahora es de día.)
    const dia = sql(`select tz from (values ('America/New_York'), ('Europe/Madrid'), ('Asia/Tokyo'), ('Pacific/Honolulu'), ('Asia/Kolkata'), ('America/Los_Angeles'), ('Australia/Sydney')) v(tz) where extract(hour from now() at time zone tz) between 10 and 19 order by tz limit 1`);
    sql(`update cities set timezone = '${dia}' where id = 'hzl'`);
    job = sql(`insert into job_postings (business_id, city_id, title, kind, pay_from_cents, openings, status, published_at, descr, requirements, benefits, days, start_min, end_min, lang_es, lang_en)
               select '${BIZ}', 'hzl', '{"es":"Cajera ${RUN}","en":"Cashier ${RUN}"}'::jsonb, kind, 1500, 1, 'live', now(), descr, requirements, benefits, days, start_min, end_min, lang_es, lang_en
                 from job_postings where business_id = '${BIZ}' and status = 'live' order by id limit 1 returning id`);
    barrer();
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${U1}' and tpl = 'vacante_nueva' and created_at > now() - interval '5 minutes'`) === '1'), 'el barrido avisa de la vacante nueva');
    barrer();
    ok(sql(`select count(*) from notifications where user_id = '${U1}' and tpl = 'vacante_nueva' and created_at > now() - interval '5 minutes'`) === '1', 'otra vuelta del barrido no repite el aviso (una vez por vacante)');
    sql(`update cities set timezone = '${tz0}' where id = 'hzl'`);
    await pc.goto(B + '/cuenta/avisos'); await pc.getByText('Tus alertas').first().waitFor();
    ok(/Vacantes nuevas en Hazleton/.test(await texto(pc)), 'Mi cuenta › Avisos › Tus alertas lista la alerta');
    await shot(pc, 'avisos-alertas-390');
    await pc.getByText('Quitar', { exact: true }).first().click();
    ok(await espera(() => sql(`select count(*) from search_alerts where user_id = '${U1}' and kind = 'vacantes' and removed_at is not null`) === '1'), '«Quitar» la deja quitada (removed_at: no se borra)');

    // ── 3 · Reportar y «¿Es tu negocio?» ──
    console.log('3 · Reportar una vacante y una novedad; «¿Es tu negocio?»');
    await pc.goto(B + `/n/${BIZ}/empleo/${job}`); await vis(pc, 'Reportar esta vacante').waitFor();
    await vis(pc, 'Reportar esta vacante').click(); await vis(pc, 'Es falso o engañoso').click();
    await vis(pc, 'Enviar reporte').click();
    ok(await espera(() => sql(`select count(*) from content_reports where target_kind = 'job' and target_id = '${job}' and reporter_user_id = '${U1}' and status = 'open'`) === '1'), 'la vacante reportada entra a la cola de Contenido');
    await shot(pc, 'vacante-reportada-390');
    await pc.goto(B + `/n/${BIZ}?tab=nov`); await vis(pc, 'Reportar esta publicación').waitFor();
    await vis(pc, 'Reportar esta publicación').click(); await vis(pc, 'Spam o publicidad engañosa').click();
    await vis(pc, 'Enviar reporte').click();
    ok(await espera(() => sql(`select count(*) from content_reports where target_kind = 'post' and reporter_user_id = '${U1}' and created_at > now() - interval '5 minutes'`) === '1'), 'la novedad reportada entra a la cola de Contenido');
    await pc.goto(B + '/n/panaderia-la-espiga'); await pc.locator('[data-es-tuyo]').waitFor();
    ok(/¿Es tu negocio\?/.test(await texto(pc)), 'la ficha de un negocio sin dueño trae «¿Es tu negocio?»');
    await pc.locator('[data-es-tuyo]').click(); await pc.waitForURL(/\/recuperar\/panaderia-la-espiga/);
    ok(true, 'y lleva a reclamarlo (/recuperar)');
    await pc.goto(B + `/n/${BIZ}`); await pc.locator('[data-pieza="mini-mapa"]').first().waitFor();
    ok((await pc.locator('[data-es-tuyo]').count()) === 0, 'un negocio con dueño no lo trae');

    // ── 4 · La ficha: alergias, temas, retiros; Buscar casa y carro ──
    console.log('4 · «Lleva o es», «Lo que más mencionan», los retiros de NHTSA y Buscar casa o carro');
    const cd = await desk(b); abiertas.push(cd); const pd = await cd.newPage(); mirar(pd, 'desk');
    await pd.goto(B + `/n/${BIZ}?tab=menu`); await pd.evaluate(() => { localStorage.removeItem('tl-carrito-v1'); localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' })); }); await pd.reload();
    await vis(pd, 'Pescado frito').click();
    ok(await espera(async () => (await pd.locator('[data-bloque="lleva"]').count()) > 0), 'la hoja del plato trae «Lleva o es»');
    ok(/PESCADO O MARISCOS/.test(await pd.locator('[data-bloque="lleva"]').innerText()), 'con lo que marcó el panel (pescado o mariscos)');
    await shot(pd, 'plato-lleva-1360', false);
    barrer();
    ok(await espera(() => sql(`select count(*) from review_topics where business_id = '${BIZ}' and n >= 2`) !== '0'), 'el barrido cuenta los temas de las reseñas (review_topics)');
    await pd.goto(B + `/n/${BIZ}?tab=rev`); await pd.locator('[data-bloque="temas"]:visible').first().waitFor();
    ok(/LO QUE MÁS MENCIONAN/.test(await pd.locator('[data-bloque="temas"]:visible').first().innerText()), 'Reseñas trae «Lo que más mencionan»');
    await shot(pd, 'temas-1360', false);
    const CARRO = sql(`select item_id from vehicle_listings where business_id = 'autos-el-cibao' and status = 'lot' and year = 2016 and make = 'Nissan' and model = 'Rogue' limit 1`);
    const CAMP = ('16V' + RUN.toUpperCase()).slice(0, 14);
    sql(`delete from vehicle_recalls where source = 'prueba' and make = 'NISSAN' and model = 'ROGUE' and year = 2016`);
    sql(`insert into vehicle_recalls (campaign, make, model, year, component, summary, remedy, report_date, source) values ('${CAMP}', 'NISSAN', 'ROGUE', 2016, 'AIR BAGS', 'La bolsa de aire del pasajero puede no abrirse (vec9m).', 'El concesionario la cambia gratis.', current_date, 'prueba')`);
    await pd.goto(B + `/n/autos-el-cibao?tab=svc&item=${CARRO}`);
    ok(await espera(async () => /RETIROS DEL FABRICANTE · 1/.test(await texto(pd))), 'la hoja del carro trae «Retiros del fabricante · 1» (NHTSA, por marca, modelo y año)');
    ok(/AIR BAGS/.test(await texto(pd)) && /nhtsa\.gov\/recalls/.test(await texto(pd)), 'con el componente y cómo confirmarlo con el VIN');
    await shot(pd, 'retiros-1360', false);
    await pc.goto(B + '/buscar/inventario?t=carro&desde=2015'); await pc.locator('[data-pantalla="APP-BUSCAR-INVENTARIO"]').waitFor();
    ok((await pc.locator('[data-inventario]').count()) > 0 && /CARROS/.test(await texto(pc)), 'Buscar carro (año desde 2015) trae carros del lote');
    await shot(pc, 'buscar-carro-390');
    await pd.goto(B + '/buscar/inventario?t=casa&modo=renta'); await pd.locator('[data-pantalla="APP-BUSCAR-INVENTARIO"]').waitFor();
    ok(/PROPIEDAD/.test(await texto(pd)), 'Buscar casa (renta) con sus filtros');
    await shot(pd, 'buscar-casa-1360');

    // ── 5 · Mi cuenta ──
    console.log('5 · Pagos y movimientos, Mis boletos sin señal, sesiones, Buscar con la voz');
    const cm = await tel390(b); abiertas.push(cm); const pm = await cm.newPage(); mirar(pm, 'marisol');
    await entrarComo(pm, MARISOL);
    await pm.goto(B + '/cuenta/pagos'); await pm.getByText('Movimientos').first().waitFor();
    ok(/Cobrado|Retenido|Devuelto|Liberado/.test(await texto(pm)), 'Pagos y movimientos lista lo cobrado con su orden');
    await shot(pm, 'pagos-390');
    const cb = await tel390(b); abiertas.push(cb); const pb = await cb.newPage(); mirar(pb, 'boletos');
    await entrarComo(pb, BOLETOS);
    const vivos = Number(sql(`select count(*) from tickets t join users u on u.id = t.holder_user_id join event_dates d on d.id = t.event_date_id where u.phone = '+1${BOLETOS}' and t.status = 'valid' and d.ends_at > now()`));
    await pb.goto(B + '/cuenta/boletos');
    const guardados = async () => pb.evaluate(() => new Promise((ok) => { const r = indexedDB.open('tl-boletos'); r.onsuccess = () => { try { const tx = r.result.transaction('b', 'readonly'); const c = tx.objectStore('b').count(); c.onsuccess = () => { r.result.close(); ok(c.result); }; c.onerror = () => { r.result.close(); ok(-1); }; } catch { r.result.close(); ok(-1); } }; r.onerror = () => ok(-1); }));
    ok(vivos > 0 && await espera(async () => (await guardados()) >= Math.min(vivos, 20), 15000, 300), `Mis boletos guarda los ${vivos} próximos en el teléfono sin abrirlos uno por uno`);
    sql(`insert into sessions (user_id, token_hash, platform, app, user_agent, expires_at, app_version, app_build, os_version, via) values ('${U1}', 'vec9m-${RUN}', 'ios', 'cliente', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) TLApp/cliente/ios/1.0.0 (12)', now() + interval '30 days', '1.0.0', 12, '17.5', 'codigo')`);
    await pc.goto(B + '/cuenta/ajustes/privacidad'); await pc.getByText('Sesiones abiertas').waitFor();
    const tp = await texto(pc);
    ok(/iPhone · To'Latino 1\.0 \(12\)/.test(tp), 'la sesión de la app dice «iPhone · To\'Latino 1.0 (12)»');
    ok(/Este navegador · /.test(tp) || /Este iPhone · /.test(tp), 'y la de este teléfono empieza con «Este …»');
    // Buscar con la voz: el aviso la primera vez («Ahora no») y el interruptor.
    await pc.goto(B + '/buscar'); await pc.getByRole('button', { name: 'Buscar con la voz' }).click();
    ok(await espera(async () => (await pc.locator('[data-aviso-voz]').count()) === 1) && /Apple o Google/.test(await pc.locator('[data-aviso-voz]').innerText()), 'la primera vez, el aviso: el reconocimiento es del teléfono o del navegador (Apple o Google)');
    await shot(pc, 'voz-aviso-390', false);
    await pc.getByRole('button', { name: 'Ahora no' }).click();
    await pc.goto(B + '/cuenta/ajustes/privacidad'); await pc.getByText('Buscar con la voz').first().waitFor();
    await pc.getByRole('switch', { name: 'Buscar con la voz' }).click();
    ok(await espera(() => sql(`select voice_search from users where id = '${U1}'`) === 't'), 'el interruptor de Privacidad lo enciende');
    await pc.getByRole('switch', { name: 'Buscar con la voz' }).click();
    ok(await espera(() => sql(`select voice_search from users where id = '${U1}'`) === 'f'), 'y lo apaga');
    await pc.goto(B + '/buscar'); await pc.locator('input[enterkeyhint="search"]').first().waitFor();
    ok((await pc.getByRole('button', { name: 'Buscar con la voz' }).count()) === 0, 'apagado, Buscar no muestra el micrófono');
    await shot(pc, 'privacidad-390');

    // ── 6 · AuthSheet en inglés, el onboarding, el Inicio y el mapa ──
    console.log('6 · «Sign in to order» (AuthSheet) en inglés, el onboarding hasta «Tu zona», el mini mapa del Inicio y los pines por recuadro');
    const ce = await tel390(b); abiertas.push(ce); await ce.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    const pe = await ce.newPage(); mirar(pe, 'en');
    await pe.goto(B + `/n/${BIZ}?tab=menu`); await pe.evaluate(() => { localStorage.removeItem('tl-carrito-v1'); localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' })); }); await pe.reload();
    const fila = pe.locator('[data-msec^="m-"]:not([data-msec="m-pop"]) div.grid').filter({ has: pe.getByText('Tostones', { exact: true }) }).last();
    await fila.getByRole('button', { name: /^(Add|Agregar)$/ }).click();
    await pe.locator('[data-screen-label="Ficha · barra del pedido"]').click();
    await pe.locator('[data-screen-label="Menú · tu pedido"]').getByText(/^(Ir a pagar|Checkout|Go to checkout)/).click();
    await pe.locator('[data-pieza="hoja-entrar"]').waitFor();
    ok(/Sign in to order/.test(await pe.locator('[data-pieza="hoja-entrar"]').innerText()) && /Send code/.test(await pe.locator('[data-pieza="hoja-entrar"]').innerText()), 'in English: «Sign in to order» · «Send code»');
    await pe.getByLabel('Your phone').fill(V2);
    await pe.getByText('Send code', { exact: true }).click();
    await pe.locator('[data-codigo-prueba]').waitFor();
    await pe.getByLabel('6-digit code').fill('000000');
    await pe.getByText('Verify and continue', { exact: true }).click();
    ok(await espera(async () => (await pe.locator('#tl-auth-error').innerText()).trim().length > 0), `a wrong code shows the server error (role=alert: «${(await pe.locator('#tl-auth-error').innerText()).trim()}»)`);
    await shot(pe, 'authsheet-en-390', false);
    const cod = await pe.locator('[data-codigo-prueba]').getAttribute('data-codigo-prueba');
    await pe.getByLabel('6-digit code').fill(cod);
    await pe.getByText('Verify and continue', { exact: true }).click();
    await pe.waitForURL(/\/entrar\?volver=/);
    ok(decodeURIComponent(pe.url()).includes(`/n/${BIZ}/pagar`), 'a new account goes to «You» (name only) and comes back to checkout');
    // El onboarding desde Entra (sin destino, L28): después de «Tú» sigue a «Tu zona», «Lo que te gusta», «El barrio» y la bienvenida de Fundadores.
    const co = await tel390(b); abiertas.push(co); const po = await co.newPage(); mirar(po, 'onb');
    await po.goto(B + '/entrar'); await po.locator('[data-pantalla="ONB-USR-1"]').waitFor();
    await po.getByLabel('Tu teléfono').fill(V3); await po.getByRole('button', { name: 'Enviarme el código' }).click();
    await po.locator('[data-modo-pruebas] b').waitFor();
    await po.getByLabel('Código').fill((await po.locator('[data-modo-pruebas] b').innerText()).trim());
    await po.getByRole('button', { name: 'Verificar' }).click();
    await po.locator('[data-pantalla="ONB-USR-2"]').waitFor();
    const ins = po.locator('[data-pantalla="ONB-USR-2"] input');
    await ins.nth(0).fill('Olga'); await ins.nth(1).fill('Onb');
    await po.getByRole('button', { name: 'Continuar' }).click();
    // La hoja de la llave (8d) sale una vez si el navegador la ofrece: «Ahora no».
    await espera(async () => (await po.locator('[data-pantalla="ONB-USR-3"], [data-pantalla="ONB-USR · llave"]').count()) > 0, 15000);
    if (await po.locator('[data-pantalla="ONB-USR · llave"]').count()) await po.getByRole('button', { name: 'Ahora no' }).click();
    await po.locator('[data-pantalla="ONB-USR-3"]').waitFor();
    ok(/PASO 3 DE 5/.test(await texto(po)) && /¿Por dónde vives\?/.test(await texto(po)), 'después de «Tú» sigue a «Tu zona» (paso 3 de 5), no a Mi cuenta mínima');
    await shot(po, 'onb-zona-390');
    await po.getByText('North End', { exact: true }).click(); await po.getByRole('button', { name: 'Continuar' }).click();
    await po.locator('[data-pantalla="ONB-USR-4"]').waitFor(); await po.getByRole('button', { name: 'Continuar' }).click();
    await po.locator('[data-pantalla="ONB-USR-5"]').waitFor();
    await po.getByRole('checkbox', { name: 'Acepto las reglas del barrio' }).click(); await po.getByRole('checkbox', { name: 'Tengo 18 años o más' }).click();
    await po.getByRole('button', { name: "Entrar a To'Latino" }).click();
    await po.locator('[data-pantalla="ONB-USR · bienvenida"]').waitFor();
    const U3 = sql(`select id from users where phone = '+1${V3}'`);
    ok(/FUNDADORES · #|N\.º /.test(await po.locator('[data-pantalla="ONB-USR · bienvenida"]').innerText()) && sql(`select (zone_id is not null)::text from users where id = '${U3}'`) === 'true', 'pasos 4 y 5 y la bienvenida (con su número de Fundadores)');
    await shot(po, 'onb-bienvenida-390');
    const ci = await desk(b); abiertas.push(ci); const pi = await ci.newPage(); mirar(pi, 'inicio');
    await pi.goto(B + '/'); await pi.locator('[data-pantalla="APP-HOME"]').waitFor();
    ok((await pi.locator('[data-bloque="mini-mapa"]').count()) === 1, 'el Inicio en escritorio trae el mini mapa propio en la columna derecha');
    await shot(pi, 'inicio-1360', false);
    const cuantos = async (u) => { await pi.goto(B + u); await pi.locator('[data-screen-label^="APP-NEG-MAPA"]').waitFor(); const m = /(\d+) NEGOCIOS? · EL MÁS CERCA/.exec(await texto(pi)); return m ? Number(m[1]) : 0; };
    const todos = await cuantos('/mapa'), centro = await cuantos('/mapa?caja=40.94,-75.99,40.97,-75.96'), lejos = await cuantos('/mapa?caja=41.50,-75.50,41.52,-75.48'), enorme = await cuantos('/mapa?caja=10,-120,40,-70');
    ok(todos > 0 && centro > 0 && centro <= todos, `el mapa trae los negocios del recuadro visible (?caja=): ${centro} de ${todos} en el centro de Hazleton`);
    ok(lejos === 0, `un recuadro sin negocios trae 0 (${lejos})`);
    ok(enorme === todos, `un recuadro demasiado grande se ignora y vuelve al radio (${enorme} = ${todos})`);

    // ── 7 · Cada pieza a 390 y a 1360, en español y en inglés (con cuenta), sin scroll de lado ──
    console.log('7 · Cada pieza a 390 y 1360, ES y EN');
    const PIEZAS = [
      ['/n/panaderia-la-espiga', '¿Es tu negocio?', 'Is this your business?'],
      [`/n/${BIZ}?tab=rev`, 'LO QUE MÁS MENCIONAN', 'WHAT PEOPLE MENTION MOST'],
      [`/n/autos-el-cibao?tab=svc&item=${CARRO}`, 'RETIROS DEL FABRICANTE · 1', 'MANUFACTURER RECALLS · 1'],
      [`/n/${BIZ}/empleo/${job}`, 'Reportar esta vacante', 'Report this job'],
      ['/buscar?q=empleo', 'Avísame de nuevas vacantes', 'Notify me of new jobs'],
      ['/buscar/inventario?t=carro', 'CARROS', 'CARS'],
      ['/cuenta/avisos', 'Tus alertas', 'Your alerts'],
      ['/cuenta/pagos', 'Movimientos', 'Activity'],
      ['/cuenta/ajustes/privacidad', 'Buscar con la voz', 'Search by voice'],
      [`/cuenta/mensajes/${BIZ}`, `Escribe a `, `Write to `],
    ];
    for (const [w, lang] of [[390, 'es'], [390, 'en'], [1360, 'es'], [1360, 'en']]) {
      // La misma sesión de la clienta (sus cookies), sin volver a pedir un código.
      const cx = await (w === 390 ? tel390(b, { storageState: await cc.storageState() }) : desk(b, { storageState: await cc.storageState() })); abiertas.push(cx);
      const px = await cx.newPage(); mirar(px, `${w}-${lang}`);
      await cx.addCookies([{ name: 'tl_lang', value: lang, url: B }]);
      const malas = [];
      for (const [u, es, en] of PIEZAS) {
        await px.goto(B + u); await px.waitForLoadState('networkidle').catch(() => {});
        const want = lang === 'es' ? es : en;
        const tx = (await px.innerText('body')) + ' ' + (await px.evaluate(() => [...document.querySelectorAll('[placeholder]')].map((x) => x.getAttribute('placeholder')).join(' ')));
        const ancho = await px.evaluate(() => document.documentElement.scrollWidth);
        if (!tx.includes(want)) malas.push(`${u}: falta «${want}»`);
        if (ancho > w + 1) malas.push(`${u}: scroll de lado (${ancho})`);
      }
      await px.goto(B + `/n/${BIZ}?tab=rev`); await shot(px, `temas-${w}-${lang}`, false);
      ok(!malas.length, `${w} · ${lang.toUpperCase()}: las ${PIEZAS.length} piezas con su texto y sin scroll de lado${malas.length ? ' → ' + malas.join(' | ') : ''}`);
    }
    ok(!err.length, `sin errores de la página (${err.join(' | ')})`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
    sql(`update cities set timezone = '${tz0}' where id = 'hzl'`);
    if (compa0) sql(`update compa_business_settings set enabled = ${compa0} where business_id = '${BIZ}'`);
    if (job) sql(`update job_postings set status = 'removed' where id = ${job}`);
    sql(`delete from vehicle_recalls where source = 'prueba' and summary like '%(vec9m)%'`);
  }
  console.log(`\nOK vec9m · ${n} ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
