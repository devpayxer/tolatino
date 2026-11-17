// 9n · El envío del mercado con el repartidor (LAUNCH «Envío del mercado con repartidor propio en /repartidor», 17 nov), de punta a punta, a 390
// (cliente y repartidor) y a 1360 (panel del mercado y Super Admin):
//  A · El mercado invita a su repartidor en Panel › Entrega (nuevo en el mercado) y pide el código de recogida; el repartidor entra con el código y se
//      pone en línea. Un pedido del mercado con envío y tarjeta → aceptar → pesar con foto → mandar al cliente (el cliente NO toca «Está bien,
//      cobrar») → «Está listo · para el repartidor» → «Ofrecer a los que están en línea» → el repartidor ve la oferta del mercado (el mercado, la
//      calle, cuántos artículos, «Pagado»; nunca el teléfono del cliente) y acepta → el código de recogida que dice el mercado (uno equivocado no
//      sirve) → «Recogí» (el cliente ve el mapa en vivo y «Ramiro te lo lleva») → el mercado ya no tiene «Entregado» y la base no lo deja cerrar
//      sin la prueba del repartidor → «Llegué» → el código del cliente (uno equivocado resta un intento) → «Entregado» → se cobra lo real UNA vez
//      (nunca más de lo retenido) y se libera el resto; el barrido no vuelve a cobrar. Panel, cliente y Super Admin (Transacciones con el
//      repartidor y «Ver recorrido»; Repartidores › 360° con la entrega del mercado) lo muestran.
//  B · El cliente aprueba el peso antes (se cobra ahí) → el repartidor lo entrega con la FOTO → no se cobra otra vez.
//  C · Sin repartidor: «Va en camino · lo llevo yo» → «Entregado» del mercado (el camino de antes) → cobrado una vez.
// Precondiciones propias: la clienta, el repartidor y el Admin son teléfonos 555 libres de esta corrida (con SU tarjeta y SU dirección); los pedidos son
// de esta corrida; lo que se cambia del mercado (código de recogida, horario) y el equipo se devuelve al terminar. Cuenta solo SUS filas.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { telefonoLibre } = require('../lib/telefono-libre.cjs');
const { tarjeta, direccion, abiertoTodoElDia, medios } = require('../lib/negocio-nuevo.cjs');
const OUT = ENT.OUT, B = ENT.B, MERC = 'supermercado-la-cosecha', P = '/panel/' + MERC, DUENO = '5705550288', FOTO = ENT.rec('fotos') + '/portada.jpg';
const sql = (q) => execSync(`docker exec -i ${ENT.DB} psql -U tolatino -d tolatino -At -v ON_ERROR_STOP=1`, { input: q, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel, nombre) => {
  await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`);
  const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); const v = await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba });
  if (!v.ok) throw new Error('no entró ' + tel); if (!v.nombre && nombre) await api(p, '/api/cuenta/perfil', { nombre: nombre[0], apellido: nombre[1] });
};
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const texto = async (p) => (await p.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
const clic = async (l) => { for (let i = 0; i < 48; i++) { const x = await vis(l); if (x) return x.click(); await dormir(250); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await texto(l.page())).slice(0, 400)); };
const verV = async (l, veces = 60) => { for (let i = 0; i < veces; i++) { if (await vis(l)) return true; await dormir(250); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await texto(l.page())).slice(0, 400)); };
const espera = async (f, v, veces = 80) => { for (let i = 0; i < veces; i++) { if (f() === v) return v; await dormir(250); } return f(); };
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const TEL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-US' }, DESK = { viewport: { width: 1360, height: 900 }, locale: 'es-US' };
const GEO = { geolocation: { latitude: 40.9562, longitude: -75.9741 }, permissions: ['geolocation'] }; // a unas cuadras del mercado (Hazleton)
const ID = crypto.randomBytes(3).toString('hex');
const NOMBRE = sql(`select name from businesses where id = '${MERC}'`);
const id = (nombre) => sql(`select id from items where business_id = '${MERC}' and name->>'es' = '${nombre}' and removed_at is null`);
const money = (c) => `$${(c / 100).toFixed(2)}`;

(async () => {
  const CLI = telefonoLibre('5705558'), REP = telefonoLibre('5705557'), ADM = telefonoLibre('5705556');
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values
        ('+1${CLI}', now(), 'Celia', 'Merc${ID}', 'hzl', 'es', true), ('+1${ADM}', now(), 'Adela', 'Merc${ID}', 'hzl', 'es', true) on conflict (phone) do nothing;`);
  const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
  const AU = uid(ADM);
  sql(`insert into staff_members (user_id, role, status) values ('${AU}', 'admin', 'active') on conflict (user_id) do update set role = 'admin', status = 'active';
       insert into staff_mfa_pruebas (phone, note) values ('+1${ADM}', 'merc9n · Admin propio de la corrida') on conflict do nothing;`);
  tarjeta(CLI); direccion(CLI);
  // El mercado: envío con su equipo y sin código de recogida al empezar (lo enciende la prueba en Entrega); se devuelve al terminar.
  const antes = sql(`select coalesce(pickup_code::text, 'false') || '|' || coalesce(who, 'team') || '|' || coalesce(auto_offer::text, 'false') from delivery_settings where business_id = '${MERC}'`).split('|');
  sql(`update delivery_settings set delivery = true, pay_card = true, who = 'team', pickup_code = false, auto_offer = false where business_id = '${MERC}';
       update items set sold_out = false, stock_left = greatest(stock_left, stock_par), stock_day = null where business_id = '${MERC}';
       update retail_settings set slot_cap = 6 where business_id = '${MERC}';
       update items set price_cents = 249 where business_id = '${MERC}' and name->>'es' = 'Pierna de cerdo';`);
  const volverHorario = abiertoTodoElDia(MERC);
  const b = await chromium.launch(); const err = []; const nums = [];
  const mk = async (o, nombre) => { const cx = await b.newContext(o); await medios(cx); const p = await cx.newPage(); p.on('pageerror', (e) => err.push(`${nombre}: ${e.message}`));
    p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_|EventSource/.test(x.text())) err.push(`${nombre} console ${x.text()}`); }); return p; };
  let DID = '';
  try {
    const c = await mk(TEL, 'cliente'), h = await mk(DESK, 'panel'), r = await mk({ ...TEL, ...GEO }, 'repartidor'), a = await mk(DESK, 'admin');
    await entrar(c, CLI); await entrar(h, DUENO); await entrar(r, REP, ['Ramiro', `Merc${ID}`]); await entrar(a, ADM);
    const Dt = h.locator('aside[data-screen-label="Panel v2 · detalle"]');
    // ── A0 · Entrega del mercado: invitar al repartidor y pedir el código de recogida ──
    console.log('A · el envío con el repartidor');
    await h.goto(B + P + '/entrega'); await verV(h.getByText(/TUS REPARTIDORES/));
    await clic(h.getByText('Invitar repartidor', { exact: true }));
    const campos = h.locator('main input'), nc = await campos.count(); await campos.nth(nc - 2).fill(`Ramiro Merc${ID}`); await campos.nth(nc - 1).fill(`(${REP.slice(0, 3)}) ${REP.slice(3, 6)}-${REP.slice(6)}`);
    await clic(h.getByText('Crear código', { exact: true })); await verV(h.getByText(/Dale este código: [A-Z0-9]{6}/));
    const codigo = /Dale este código: ([A-Z0-9]{6})/.exec(await texto(h))[1];
    ok(sql(`select status from delivery_drivers where business_id = '${MERC}' and phone = '+1${REP}' and status <> 'removed'`) === 'invited', `el mercado invita a su repartidor desde Panel › Entrega (código ${codigo})`);
    const fila = h.getByText('Código de recogida', { exact: true }).first();
    await fila.locator('xpath=ancestor::*[.//*[@role="switch"]][1]').locator('[role="switch"]').first().click();
    ok(await espera(() => sql(`select pickup_code::text from delivery_settings where business_id = '${MERC}'`), 'true') === 'true', 'el mercado pide el código de recogida');
    ok(!!(await vis(h.getByText(/En el mercado es siempre obligatoria/))), 'Entrega del mercado: la prueba de entrega es siempre obligatoria (no se apaga)');
    await h.screenshot({ path: OUT + 'merc9n-a0-entrega-1360.png', fullPage: true });
    await r.goto(B + '/repartidor'); await verV(r.getByText(/CÓDIGO DEL NEGOCIO/));
    await r.locator('input').first().fill(codigo); await clic(r.getByText('Moto', { exact: true })); await clic(r.getByText('Entrar al equipo', { exact: true }));
    const drv = () => sql(`select coalesce((select id::text from delivery_drivers where business_id = '${MERC}' and phone = '+1${REP}' and status = 'active'), '')`);
    for (let i = 0; i < 60 && !drv(); i++) await dormir(250);
    DID = drv();
    ok(!!DID, 'el repartidor entra al equipo del mercado con el código');
    await r.goto(B + '/repartidor'); await clic(r.getByRole('switch').first()); await verV(r.getByText(/Estás en línea/));
    ok(sql(`select online::text from delivery_drivers where id = ${DID}`) === 'true', 'el repartidor se pone en línea');

    // ── El pedido: envío con tarjeta ──
    const pedir = async (lines) => {
      await c.goto(B + `/n/${MERC}`); await c.evaluate(([bz, l]) => localStorage.setItem('tl-mercado', JSON.stringify({ biz: bz, lines: l })), [MERC, lines]);
      await c.goto(B + `/n/${MERC}/mercado`); await verV(c.getByText('1 · Tu pedido'));
      await clic(c.getByRole('radio', { name: /Envío a tu casa/ }));
      const libres = () => c.locator('[role="radiogroup"][aria-label="Hora"] [role="radio"]:not([disabled])');
      await dormir(300); if (!(await libres().count())) await clic(c.getByRole('button', { name: 'Mañana', exact: true }));
      await clic(libres().first());
      await clic(c.getByRole('button', { name: 'Enviar pedido' })); await c.waitForURL(/\/mercado\/M-\d+/, { timeout: 30000 });
      const N = c.url().match(/M-\d+/)[0]; nums.push(N); return [N, sql(`select id from operations where number = '${N}'`)];
    };
    const L = [{ item: id('Pierna de cerdo'), q: 3, o: 1 }, { item: id('Bistec de res'), q: 2, o: null }, { item: id('Arroz 10 lb'), q: 1, o: null }];
    const [NA, OA] = await pedir(L);
    const held = Number(sql(`select held_cents from payments where operation_id = ${OA} and kind = 'full' and status = 'held'`));
    ok(held > 0 && sql(`select mode || '|' || pay_mode from operations where id = ${OA}`) === 'delivery|app', `${NA}: envío con tarjeta, se retienen ${money(held)} (no se cobra todavía)`);
    // Panel: aceptar, pesar con foto, mandar.
    await h.goto(B + P + `/hoy?det=merc:${NA}`); await clic(Dt.getByRole('button', { name: 'Aceptar' }));
    ok(await espera(() => sql(`select status_detail from operations where id = ${OA}`), 'preparando') === 'preparando', 'el mercado acepta');
    ok(sql(`select count(*) from delivery_codes where operation_id = ${OA}`) === '1', 'el envío del mercado recibe sus códigos al aceptarse (como la comida)');
    const pesar = async (nombre, lb) => {
      const f = Dt.getByLabel(`PESO REAL · LB · ${nombre.toUpperCase()}`); await verV(f); await (await vis(f)).fill(String(lb));
      const [fc] = await Promise.all([h.waitForEvent('filechooser'), clic(Dt.getByText(`Foto de ${nombre}`, { exact: true }))]); await fc.setFiles(FOTO);
      await dormir(1500); await clic(Dt.getByRole('button', { name: `Guardar peso de ${nombre}` }));
      ok(await espera(() => sql(`select (weight_final is not null)::text from operation_lines where operation_id = ${OA} and name->>'es' = '${nombre}'`), 'true') === 'true', `${nombre}: pesó ${lb} lb con la foto de la balanza`);
    };
    await pesar('Pierna de cerdo', 2.82); await pesar('Bistec de res', 2.18);
    await clic(Dt.getByRole('button', { name: 'Mandar al cliente' }));
    ok(await espera(() => sql(`select status_detail from operations where id = ${OA}`), 'pesado') === 'pesado', 'mandado al cliente (el cliente no toca «Está bien, cobrar»: se cobra al entregar)');
    const real = Number(sql(`select coalesce(sum(l.final_cents), 0) + coalesce(sum(round(l.final_cents * l.tax_pct / 100)), 0) + max(o.delivery_cents) from operation_lines l join operations o on o.id = l.operation_id where o.id = ${OA}`));
    ok(real > 0 && real <= held, `total real ${money(real)} (lo calcula la base) de ${money(held)} retenidos`);
    // «Está listo · para el repartidor» y la oferta.
    await h.goto(B + P + `/hoy?det=merc:${NA}`); await clic(Dt.getByRole('button', { name: 'Está listo · para el repartidor' }));
    ok(await espera(() => sql(`select status_detail || '|' || stage from operations where id = ${OA}`), 'listo|ready') === 'listo|ready', 'con repartidores en la app, el envío queda listo para el repartidor (no «Va en camino»)');
    ok(sql(`select count(*) from notifications where tpl = 'merc_camino' and ref_id = '${NA}'`) === '0', 'el cliente todavía no recibe «va en camino»');
    await h.goto(B + P + `/hoy?det=merc:${NA}`); await verV(Dt.getByText('¿QUIÉN LO LLEVA?'));
    ok(!!(await vis(Dt.getByRole('button', { name: 'Va en camino · lo llevo yo' }))) && !(await vis(Dt.getByRole('button', { name: 'Entregado', exact: true }))), 'panel: ofrecer, asignar o «lo llevo yo»; sin «Entregado» propio');
    await clic(Dt.getByRole('button', { name: 'Ofrecer a los que están en línea' }));
    ok(await espera(() => sql(`select count(*) from delivery_offers where operation_id = ${OA} and status = 'open'`), '1') === '1', 'el mercado ofrece el envío a sus repartidores en línea (cuenta regresiva)');
    ok(sql(`select count(*) from notifications where tpl = 'drv_oferta' and ref_id = '${NA}' and position('${CLI.slice(-4)}' in body) = 0`) === '1', 'al repartidor le llega la oferta (sin el teléfono del cliente)');
    await h.screenshot({ path: OUT + 'merc9n-a1-oferta-panel-1360.png', fullPage: true });
    // Repartidor: la oferta del mercado.
    await r.goto(B + '/repartidor'); await verV(r.getByText(/te ofrece un pedido del mercado/));
    const tr = await texto(r);
    ok(/LLEVAS/.test(tr) && /3 artículos/.test(tr) && /Pagado/.test(tr) && tr.includes(NOMBRE) && tr.includes('420 N Wyoming St'), 'la oferta dice el mercado, a dónde, cuántos artículos y «Pagado»');
    ok(!tr.includes(CLI.slice(-4)) && !tr.includes(CLI.slice(3, 6) + '-' + CLI.slice(6)), 'el repartidor nunca ve el teléfono del cliente');
    await r.screenshot({ path: OUT + 'merc9n-a2-oferta-repartidor-390.png', fullPage: true });
    await clic(r.getByRole('button', { name: 'Aceptar', exact: true })); await r.waitForURL(new RegExp(`/repartidor\\?p=${NA}`), { timeout: 20000 });
    ok(await espera(() => sql(`select driver_id::text from operations where id = ${OA}`), DID) === DID, 'el repartidor acepta: el envío del mercado es suyo y la ruta empieza');
    ok(sql(`select count(*) from notifications where tpl = 'biz_oferta_ok' and ref_id = '${NA}'`) === '1', 'el mercado recibe «Aceptaron el pedido»');
    await verV(r.getByText(/PEDIDO DEL MERCADO/)); ok(!!(await vis(r.getByText(/Pedido del mercado: ya está pesado y pagado/))), 'el detalle dice que ya está pesado y pagado: no cobra nada y la prueba es obligatoria');
    ok(!(await texto(r)).includes(CLI.slice(-4)), 'el detalle del repartidor tampoco lleva el teléfono del cliente');
    // Código de recogida: el panel lo ve; uno equivocado no sirve.
    await h.goto(B + P + `/hoy?det=merc:${NA}`); await verV(Dt.getByText('CÓDIGO DE RECOGIDA'));
    const rec = sql(`select recogida from delivery_codes where operation_id = ${OA}`);
    ok((await texto(h)).includes(rec) && !(await texto(h)).includes(sql(`select cliente from delivery_codes where operation_id = ${OA}`) + ' '), 'el panel ve el código de recogida (y no el del cliente)');
    ok(!(await vis(Dt.getByRole('button', { name: 'Entregado', exact: true }))), 'con el repartidor, el panel no tiene «Entregado» propio');
    await h.screenshot({ path: OUT + 'merc9n-a3-repartidor-asignado-1360.png', fullPage: true });
    const malo = rec === '0000' ? '1111' : '0000';
    await r.goto(B + `/repartidor?p=${NA}`); await verV(r.getByText(/CÓDIGO DE RECOGIDA/));
    await (await vis(r.getByLabel('CÓDIGO DE RECOGIDA · TE LO DICE EL NEGOCIO'))).fill(malo); await clic(r.getByRole('button', { name: 'Recogí, voy en camino' }));
    await verV(r.getByText(/Ese no es el código de recogida/)); ok(sql(`select stage from operations where id = ${OA}`) === 'ready', 'un código de recogida equivocado no sirve');
    await (await vis(r.getByLabel('CÓDIGO DE RECOGIDA · TE LO DICE EL NEGOCIO'))).fill(rec); await clic(r.getByRole('button', { name: 'Recogí, voy en camino' }));
    ok(await espera(() => sql(`select stage || '|' || status_detail from operations where id = ${OA}`), 'on_the_way|camino') === 'on_the_way|camino', '«Recogí» con el código del mercado: en camino');
    ok(await espera(() => sql(`select count(*) from notifications where tpl = 'merc_camino' and ref_id = '${NA}'`), '1') === '1', 'el cliente recibe «Tu pedido va en camino»');
    // La base no deja cerrarlo sin la prueba del repartidor (el mercado no lo cierra él mismo).
    let cerro = true; try { sql(`update operations set status = 'done' where id = ${OA}`); } catch (e) { cerro = !/prueba del repartidor/.test(String(e.stderr)); }
    ok(!cerro, 'la base no deja cerrar el envío del mercado sin la prueba del repartidor');
    // Ruta en vivo: posiciones del repartidor; el cliente ve el mapa desde «Recogí».
    // El GPS de Playwright conserva la hora de la lectura de cuando se abrió el contexto (anterior al inicio de la entrega: la base la descarta);
    // el repartidor «se mueve» unos metros cada 2 s, como en la calle.
    const posiciones = () => Number(sql(`select count(*) from delivery_positions where operation_id = ${OA}`));
    // Como app8e: primero la banda «Compartiendo tu ubicación» (Safari arranca el GPS de la página más tarde), después se mueve.
    await r.locator('[data-banda="ubicacion"]').first().waitFor({ timeout: 20000 }).catch(() => console.log('  · sin la banda de ubicación todavía'));
    for (let i = 0; i < 25 && !posiciones(); i++) { await r.context().setGeolocation({ latitude: 40.9562 + i * 0.0002, longitude: -75.9741 }); await dormir(2000); }
    if (!posiciones()) console.log('  · la página:', JSON.stringify(await r.evaluate(() => new Promise((ok) => navigator.geolocation.getCurrentPosition((g) => ok({ t: g.timestamp, ahora: Date.now(), lat: g.coords.latitude }), (e) => ok({ error: e.code, msg: e.message }), { timeout: 5000 })))),
      '· banda:', await r.locator('[data-banda="ubicacion"]').count(), '· url:', r.url());
    ok((posiciones() > 0).toString() === 'true', 'el teléfono del repartidor comparte su ubicación (la base acepta las posiciones del envío del mercado)');
    await c.goto(B + `/mercado/${NA}`); await verV(c.getByText(/Ramiro te lo lleva/));
    await verV(c.locator('[data-pantalla="APP-PEDIDO-MAPA"]'), 80); ok(true, 'el cliente ve «Ramiro te lo lleva» y el mapa en vivo');
    const codCli = (await c.locator('[data-codigo-cliente]').innerText()).replace(/\D/g, '').slice(0, 4);
    ok(codCli === sql(`select cliente from delivery_codes where operation_id = ${OA}`), 'el cliente ve su código para recibir');
    await c.screenshot({ path: OUT + 'merc9n-a4-cliente-en-camino-390.png', fullPage: true });
    await h.goto(B + P + `/hoy?det=merc:${NA}`); await verV(Dt.getByText(/REPARTIDOR · EN VIVO/)); ok(true, 'el panel ve al repartidor en el mapa');
    // Llegué y el código del cliente.
    await r.goto(B + `/repartidor?p=${NA}`); await clic(r.getByRole('button', { name: 'Llegué' }));
    ok(await espera(() => sql(`select count(*) from notifications where tpl = 'merc_here' and ref_id = '${NA}'`), '1') === '1', 'el cliente recibe «Tu repartidor llegó»');
    await verV(r.getByText(/PRUEBA DE ENTREGA · OBLIGATORIA EN EL MERCADO/));
    const campoCli = r.getByLabel('O EL CÓDIGO DEL CLIENTE · 4 NÚMEROS');
    const malC = codCli === '0000' ? '1111' : '0000';
    await (await vis(campoCli)).fill(malC); await clic(r.getByRole('button', { name: 'Entregado', exact: true }));
    await verV(r.getByText(/Ese no es el código del cliente\. Te quedan \d intentos/)); ok(sql(`select status from operations where id = ${OA}`) === 'confirmed', 'un código del cliente equivocado resta un intento y no entrega');
    await (await vis(campoCli)).fill(codCli); await r.screenshot({ path: OUT + 'merc9n-a5-entregar-390.png', fullPage: true });
    await clic(r.getByRole('button', { name: 'Entregado', exact: true })); await verV(r.getByText(/Entregado\. Gracias/));
    ok(await espera(() => sql(`select status || '|' || status_detail || '|' || stage from operations where id = ${OA}`), 'done|done|delivered') === 'done|done|delivered', '«Entregado» del repartidor con el código del cliente');
    ok(sql(`select kind || '|' || (driver_id = ${DID})::text from delivery_proofs where operation_id = ${OA}`) === 'codigo|true', 'la prueba es del repartidor que lo llevó');
    ok(await espera(() => sql(`select status || '|' || amount_cents || '|' || (fee_cents > 0)::text from payments where operation_id = ${OA} and kind = 'full'`), `captured|${real}|true`) === `captured|${real}|true`, `al «Entregado» del repartidor se cobra lo real (${money(real)}) y se libera el resto (${money(held - real)})`);
    ok(sql(`select count(*) from notifications where tpl = 'merc_cobrado' and ref_id = '${NA}'`) === '1' && sql(`select count(*) from notifications where tpl = 'merc_entregado' and ref_id = '${NA}'`) === '1', 'el cliente recibe «Tu pedido llegó» y «Se cobraron …» una vez');
    ok(sql(`select ended_reason from delivery_tracks where operation_id = ${OA} order by id desc limit 1`) === 'entregado', 'la ruta en vivo se cierra sola al entregar');
    barrer(); barrer();
    ok(sql(`select count(*) || '|' || sum(amount_cents) from payments where operation_id = ${OA} and status = 'captured'`) === `1|${real}` && sql(`select count(*) from notifications where tpl = 'merc_cobrado' and ref_id = '${NA}'`) === '1', 'el barrido no vuelve a cobrar (un solo cobro, idempotente)');
    // Las vistas: panel, cliente y Super Admin.
    await h.goto(B + P + `/hoy?det=merc:${NA}`); await verV(Dt.getByText('PRUEBA DE ENTREGA'));
    ok(!!(await vis(Dt.getByText(/código del cliente/))) && !!(await vis(Dt.getByText(new RegExp(`Cobrado \\${money(real)}`)))), 'panel: la prueba (código del cliente) y lo cobrado');
    await h.screenshot({ path: OUT + 'merc9n-a6-panel-entregado-1360.png', fullPage: true });
    await c.goto(B + `/mercado/${NA}`); await verV(c.getByText('ENTREGADO')); ok(!!(await vis(c.getByText(`Pagaste ${money(real)}`))), `cliente: «Entregado · Pagaste ${money(real)}»`);
    await c.screenshot({ path: OUT + 'merc9n-a7-cliente-entregado-390.png', fullPage: true });
    await a.goto(B + '/admin/transacciones?tab=merc'); await verV(a.getByText(new RegExp(`repartidor Ramiro Merc${ID}`)));
    ok(true, 'Super Admin › Transacciones: el pedido del mercado con su repartidor');
    ok(!!(await vis(a.getByRole('button', { name: 'Ver recorrido' }))), 'Transacciones: «Ver recorrido» (con motivo) también en el envío del mercado');
    await a.screenshot({ path: OUT + 'merc9n-a8-admin-tx-1360.png', fullPage: false });
    await a.goto(B + `/admin/repartidores/${uid(REP)}`); await verV(a.getByText(new RegExp(`${NA} · Supermercado`)));
    ok(true, 'Super Admin › Repartidores › 360°: la entrega del mercado en sus últimas entregas');

    // ── B · El cliente aprueba antes; el repartidor entrega con la FOTO; no se cobra otra vez ──
    console.log('B · aprobado antes, entregado con foto');
    const [NB, OB] = await pedir([{ item: id('Arroz 10 lb'), q: 3, o: null }]);
    await h.goto(B + P + `/hoy?det=merc:${NB}`); await clic(Dt.getByRole('button', { name: 'Aceptar' }));
    await espera(() => sql(`select status_detail from operations where id = ${OB}`), 'preparando');
    await h.goto(B + P + `/hoy?det=merc:${NB}`); await clic(Dt.getByRole('button', { name: 'Mandar al cliente' }));
    await espera(() => sql(`select status_detail from operations where id = ${OB}`), 'pesado');
    await c.goto(B + `/mercado/${NB}`); await clic(c.getByRole('button', { name: /^Está bien, cobrar/ }));
    const realB = Number(sql(`select total_cents from operations where id = ${OB}`));
    ok(await espera(() => sql(`select status || '|' || amount_cents from payments where operation_id = ${OB} and kind = 'full'`), `captured|${realB}`) === `captured|${realB}`, `el cliente aprueba: se cobran ${money(realB)} ahí`);
    await h.goto(B + P + `/hoy?det=merc:${NB}`); await clic(Dt.getByRole('button', { name: 'Está listo · para el repartidor' }));
    await espera(() => sql(`select status_detail from operations where id = ${OB}`), 'listo');
    await h.goto(B + P + `/hoy?det=merc:${NB}`); await clic(Dt.getByRole('button', { name: 'Asignar' }));
    ok(await espera(() => sql(`select driver_id::text from operations where id = ${OB}`), DID) === DID, 'el mercado se lo asigna al repartidor');
    ok(sql(`select count(*) from notifications where tpl = 'drv_assigned' and ref_id = '${NB}'`) === '1', 'al repartidor le llega «Tienes una entrega»');
    await h.goto(B + P + `/hoy?det=merc:${NB}`); await verV(Dt.getByText('CÓDIGO DE RECOGIDA')); await clic(Dt.getByRole('button', { name: 'Ya se lo di' }));
    ok(await espera(() => sql(`select (recogido_at is not null)::text from delivery_codes where operation_id = ${OB}`), 'true') === 'true', 'el mercado confirma que se lo dio (sin el código)');
    await r.goto(B + `/repartidor?p=${NB}`); await clic(r.getByRole('button', { name: 'Recogí, voy en camino' }));
    await espera(() => sql(`select stage from operations where id = ${OB}`), 'on_the_way');
    await r.goto(B + `/repartidor?p=${NB}`); await clic(r.getByRole('button', { name: 'Llegué' }));
    await verV(r.getByRole('button', { name: 'Tomar foto' }));
    const [fc] = await Promise.all([r.waitForEvent('filechooser'), clic(r.getByRole('button', { name: 'Tomar foto' }))]); await fc.setFiles(FOTO);
    await verV(r.getByText('Foto de la entrega lista'), 80);
    await clic(r.getByRole('button', { name: 'Entregado', exact: true })); await verV(r.getByText(/Entregado\. Gracias/));
    ok(await espera(() => sql(`select status from operations where id = ${OB}`), 'done') === 'done' && sql(`select kind from delivery_proofs where operation_id = ${OB}`) === 'foto', 'entregado con la foto (privada) del repartidor');
    ok(sql(`select count(*) || '|' || sum(amount_cents) from payments where operation_id = ${OB} and status = 'captured'`) === `1|${realB}` && sql(`select count(*) from notifications where tpl = 'merc_cobrado' and ref_id = '${NB}'`) === '1', 'ya aprobado: al «Entregado» no se cobra otra vez');
    await c.goto(B + `/mercado/${NB}`); await verV(c.getByRole('button', { name: 'Ver la foto de la entrega' })); ok(true, 'el cliente ve la foto de la entrega');

    // ── C · Sin repartidor: el mercado lo lleva (el camino de antes) ──
    console.log('C · lo lleva el mercado');
    const [NC, OC] = await pedir([{ item: id('Arroz 10 lb'), q: 3, o: null }]);
    await h.goto(B + P + `/hoy?det=merc:${NC}`); await clic(Dt.getByRole('button', { name: 'Aceptar' }));
    await espera(() => sql(`select status_detail from operations where id = ${OC}`), 'preparando');
    await h.goto(B + P + `/hoy?det=merc:${NC}`); await clic(Dt.getByRole('button', { name: 'Mandar al cliente' }));
    await espera(() => sql(`select status_detail from operations where id = ${OC}`), 'pesado');
    await h.goto(B + P + `/hoy?det=merc:${NC}`); await clic(Dt.getByRole('button', { name: 'Está listo · para el repartidor' }));
    await espera(() => sql(`select status_detail from operations where id = ${OC}`), 'listo');
    await h.goto(B + P + `/hoy?det=merc:${NC}`); await clic(Dt.getByRole('button', { name: 'Va en camino · lo llevo yo' }));
    ok(await espera(() => sql(`select status_detail || '|' || coalesce(driver_id::text, '-') from operations where id = ${OC}`), 'camino|-') === 'camino|-', '«Va en camino · lo llevo yo»: sin repartidor, como antes');
    await h.goto(B + P + `/hoy?det=merc:${NC}`); await clic(Dt.getByRole('button', { name: 'Entregado', exact: true }));
    const realC = Number(sql(`select total_cents from operations where id = ${OC}`));
    ok(await espera(() => sql(`select o.status || '|' || p.status || '|' || p.amount_cents from operations o join payments p on p.operation_id = o.id and p.kind = 'full' where o.id = ${OC}`), `done|captured|${realC}`) === `done|captured|${realC}`, `«Entregado» del mercado: cobrado ${money(realC)} una vez`);

    ok(sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number in ('${nums.join("','")}') and p.status = 'captured' and p.amount_cents > p.held_cents`) === '0', 'ninguno cobró más de lo retenido');
    ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  } finally {
    sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where number in ('${nums.join("','") || '-'}') and status in ('pending', 'confirmed');
         update delivery_offers set status = 'cancelled' where status = 'open' and business_id = '${MERC}';
         update delivery_drivers set status = 'removed', removed_at = now(), removed_reason = 'merc9n', online = false, invite_code = null where business_id = '${MERC}' and phone = '+1${REP}' and status <> 'removed';
         update delivery_settings set pickup_code = ${antes[0] === 'true'}, who = '${antes[1] || 'team'}', auto_offer = ${antes[2] === 'true'} where business_id = '${MERC}';
         update staff_members set status = 'removed' where user_id = '${AU}';`);
    volverHorario();
    await b.close();
  }
  console.log(`OK merc9n · ${n} ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
