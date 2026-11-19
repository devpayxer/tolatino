// 9t · Reservación de mesa · la pantalla «no pudo» (LAUNCH «Avísame si se libera (lista de espera) y Otros restaurantes con mesa»; prototipo rsvStVals).
// Teléfono 390 y escritorio 1360, ES y EN.
// 1 · Sabor Dominicano con UNA mesa de 2 (la prueba lo deja así y lo devuelve al final): Bea tiene mañana a las 7:00 PM; la solicitud de Ana para la
//     misma hora «no pudo». En su pantalla: «Otros restaurantes con mesa» (Casa Borinquen sí; Cantina Don Beto, en pausa de To'Latino, nunca; Sabor
//     Dominicano tampoco) y «Avísame si se libera a esa hora». Ana se anota (una entrada viva; otra igual la base no la deja). Carla, con su propio «no
//     pudo» a la misma hora, se anota DESPUÉS.
// 2 · Mi cuenta › Avisos › Tus alertas: «Mesa en Sabor Dominicano» con «Quitar».
// 3 · Se libera (Bea cancela): el barrido le guarda la mesa a Ana (la primera de la fila) a SU nombre por rsv_espera_min minutos y le avisa UNA vez
//     (rsv_libre, con el enlace a esa mesa); Carla sigue esperando y no recibe nada; otro barrido no repite.
// 4 · Ana ve «Se liberó una mesa», toma la mesa (la solicitud abre con la mesa guardada y su cuenta regresiva) y la envía: su entrada queda «taken».
// 5 · Ana cancela su mesa nueva → se libera otra vez → el barrido se la guarda a Carla; Carla dice «No, gracias» desde Mi cuenta (Quitar): la retención
//     se suelta al momento y su entrada queda «left». Nada se borra.
// 6 · Solo la dueña: Carla no ve la reservación de Ana (404).
// 7 · Super Admin › Transacciones (Ana del equipo, 1360): la reservación con «lista de espera: tomó la mesa».
// 8 · ES/EN y 390/1360 de la pantalla «no pudo» sin scroll de lado.
// Precondiciones propias: personas nuevas con teléfonos 555 libres y sin silencio (prefs quiet=false: la prueba no depende de la hora); el horario y las
// mesas de Sabor Dominicano, el horario de Casa Borinquen y de Cantina Don Beto y la pausa de esta última se devuelven al final.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, telLibre, abiertoTodoElDia } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT, BIZ = 'sabor-dominicano', OTRO = 'casa-borinquen', PAUSA = 'cantina-don-beto';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr ?? e.message); } };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const ADM = '5705550199';
const ctxTel = (b, extra = {}) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });
const ctxDesk = (b, extra = {}) => b.newContext({ viewport: { width: 1360, height: 900 }, ...extra });
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `r9t-${nom}.png`, fullPage: full });
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const sinScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
// Mañana a las 7:00 PM en Hazleton (la cena de Sabor Dominicano va de 5:30 a 8:30 PM).
const MANANA = `((now() at time zone 'America/New_York')::date + 1 + time '19:00') at time zone 'America/New_York'`;
const mesa = (u, st) => sql(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, party_size, details, pay_mode, respond_by, answered_at, confirmed_at, client_key, is_test)
  values ('R-' || nextval('operations_table_seq'), 'table', 'hzl', '${BIZ}', '${u}', '${st}', ${MANANA}, 90, 2, '{\"area\":\"salon\",\"sms\":true}'::jsonb, 'none', now(), now(),
          case when '${st}' = 'confirmed' then now() end, gen_random_uuid(), true) returning number`).split('\n')[0];
const entrada = (u) => sql(`select status from reservation_waitlist where user_id = '${u}' and business_id = '${BIZ}' order by id desc limit 1`);
const avisos = (u) => Number(sql(`select count(*) from notifications where user_id = '${u}' and tpl = 'rsv_libre'`));

(async () => {
  const TA = telLibre(), TB = telLibre(), TC = telLibre();
  const ajustes0 = sql(`select json_build_object('areas', areas, 'join', join_tables, 'min', min_ahead_h)::text from reservation_settings where business_id = '${BIZ}'`);
  const devolver = [abiertoTodoElDia(BIZ), abiertoTodoElDia(OTRO), abiertoTodoElDia(PAUSA)];
  const pausa0 = sql(`select coalesce(modules_off, '{}'::jsonb)::text from businesses where id = '${PAUSA}'`);
  const b = await chromium.launch(); const err = [];
  const mirar = (p, tag) => { p.on('pageerror', (e) => err.push(tag + ' ' + e.message)); };
  try {
    sql(`update reservation_settings set areas = '{"salon":{"on":true,"t":{"2":1,"4":0,"6":0,"8":0}},"terraza":{"on":false,"t":{"2":0,"4":0,"6":0,"8":0}},"barra":{"on":false,"t":{"2":0,"4":0,"6":0,"8":0}}}'::jsonb,
         join_tables = false, min_ahead_h = 1 where business_id = '${BIZ}'`);
    sql(`update businesses set modules_off = coalesce(modules_off, '{}'::jsonb) || '{"rsv":{"reason":"rsv9t"}}'::jsonb where id = '${PAUSA}'`);
    sql(`delete from reservation_holds where business_id = '${BIZ}'`);
    // Lo que una corrida anterior dejó vivo a esa hora (de nadie de esta prueba) se cancela, para que la única mesa quede para Bea.
    sql(`update operations set status = 'cancelled', cancelled_at = now(), cancelled_by = 'system' where business_id = '${BIZ}' and kind = 'table' and status in ('pending', 'confirmed', 'change_proposed') and scheduled_at = ${MANANA}`);

    // ── 1 · «No pudo»: otros restaurantes y «Avísame si se libera» ──
    console.log('1 · «No pudo»: otros restaurantes con mesa y «Avísame si se libera»');
    const ca = await ctxTel(b), pa = await ca.newPage(); mirar(pa, 'ana');
    await entrarComo(pa, TA, { nombre: 'Ana', apellido: 'Espera' });
    const cb = await ctxTel(b), pb = await cb.newPage(); await entrarComo(pb, TB, { nombre: 'Bea', apellido: 'Mesa' });
    const cc = await ctxTel(b), pc = await cc.newPage(); mirar(pc, 'carla'); await entrarComo(pc, TC, { nombre: 'Carla', apellido: 'Fila' });
    const A = uid(TA), Bu = uid(TB), C = uid(TC);
    sql(`update users set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || '{"quiet": false}'::jsonb where id in ('${A}', '${C}')`);
    const nB = mesa(Bu, 'confirmed'), nA = mesa(A, 'declined'), nC = mesa(C, 'declined');
    await pa.goto(B + `/reserva/${nA}`); await pa.getByText('NO PUDO').first().waitFor();
    const otros = pa.locator('[data-screen-label="Reserva · otros restaurantes"]').first();
    await otros.waitFor();
    const tOtros = (await otros.innerText()).replace(/\s+/g, ' ');
    ok(/OTROS RESTAURANTES CON MESA/.test(tOtros), '«Otros restaurantes con mesa» en la pantalla «no pudo»');
    ok(/Casa Borinquen/.test(tOtros), 'sale un restaurante de la misma ciudad con mesa a esa hora (Casa Borinquen)');
    ok(!/Cantina Don Beto/.test(tOtros), 'nunca uno con Reservaciones en pausa de To\'Latino');
    ok(!/Sabor Dominicano/.test(tOtros), 'nunca el mismo restaurante que no pudo');
    ok((await otros.locator('button, [role=button]').count()) <= 5, 'la lista lleva tope (≤ 5)');
    await shot(pa, 'nopudo-390-es');
    ok(await sinScroll(pa), '390 · sin scroll de lado');
    await clic(pa.getByRole('button', { name: 'Avísame si se libera a esa hora' }));
    await pa.getByText('Estás en la lista de espera').first().waitFor();
    ok(entrada(A) === 'waiting', 'Ana se anota: una entrada «waiting» en la base');
    ok(/duplicate key|reservation_waitlist_viva/.test(sqlErr(`insert into reservation_waitlist (city_id, business_id, user_id, day, at_min, starts_at, party_size) select city_id, business_id, user_id, day, at_min, starts_at, party_size from reservation_waitlist where user_id = '${A}' and status = 'waiting'`)),
      'la base no deja otra entrada viva igual (índice único)');
    await shot(pa, 'anotada-390-es');
    await pc.goto(B + `/reserva/${nC}`); await clic(pc.getByRole('button', { name: 'Avísame si se libera a esa hora' }));
    await pc.getByText('Estás en la lista de espera').first().waitFor();
    ok(entrada(C) === 'waiting', 'Carla se anota después (segunda de la fila)');

    // ── 2 · Mi cuenta › Avisos ──
    console.log('2 · Mi cuenta › Avisos › Tus alertas');
    await pa.goto(B + '/cuenta/avisos'); await pa.getByText('Tus alertas').first().waitFor();
    ok(/Mesa en Sabor Dominicano/.test(await texto(pa)), 'la mesa que espera sale en «Tus alertas» con «Quitar»');
    await shot(pa, 'avisos-390-es');

    // ── 3 · Se libera: una vez, solo a la primera de la fila ──
    console.log('3 · Se libera una mesa: el barrido se la guarda a Ana y le avisa una vez');
    sql(`update operations set status = 'cancelled', cancelled_at = now(), cancelled_by = 'user' where number = '${nB}'`);
    barrer();
    ok(await espera(() => entrada(A) === 'offered'), 'Ana (la primera) pasa a «offered»');
    const hold = sql(`select hold_id from reservation_waitlist where user_id = '${A}' and status = 'offered'`);
    ok(sql(`select user_id from reservation_holds where id = '${hold}'`) === A, 'la mesa se guarda a nombre de Ana');
    const mins = Number(sql(`select round(extract(epoch from expires_at - created_at) / 60) from reservation_holds where id = '${hold}'`)), cfg = Number(sql(`select cfg_int('rsv_espera_min')`));
    ok(mins === cfg, `se guarda rsv_espera_min minutos (${mins})`);
    ok(avisos(A) === 1 && sql(`select href from notifications where user_id = '${A}' and tpl = 'rsv_libre'`) === `/n/${BIZ}/reservar?hold=${hold}`, 'un aviso rsv_libre para Ana con el enlace a su mesa');
    ok(entrada(C) === 'waiting' && avisos(C) === 0, 'Carla sigue en la fila y no recibe nada');
    barrer(); barrer();
    ok(avisos(A) === 1, 'otro barrido no repite el aviso');

    // ── 4 · Tomar la mesa ──
    console.log('4 · Ana toma la mesa');
    await pa.goto(B + `/reserva/${nA}`);
    await pa.locator('[data-screen-label="Reserva · mesa liberada"]').first().waitFor();
    ok(/Se liberó una mesa/.test(await texto(pa)), '«Se liberó una mesa» con «Tomar la mesa» y «No, gracias»');
    await shot(pa, 'liberada-390-es');
    await clic(pa.getByRole('button', { name: 'Tomar la mesa' }));
    await pa.waitForURL(/\/reservar\?hold=/);
    const det = pa.locator('[data-screen-label="APP-NEG-RESERVA · móvil"]');
    await det.getByText('Te guardamos esta mesa').waitFor();
    const t0 = await det.locator('span.font-mono').filter({ hasText: /^\d{1,2}:\d\d$/ }).first().innerText();
    ok(Number(t0.split(':')[0]) >= cfg - 1, `la cuenta regresiva es la de la lista de espera (${t0})`);
    await clic(pa.locator('[data-screen-label="Reserva · barra"]').getByText('Enviar solicitud'));
    await pa.waitForURL(/\/reserva\/R-\d+$/); const nA2 = pa.url().split('/').pop();
    ok(entrada(A) === 'taken', 'la entrada queda «taken» al enviar con esa mesa');

    // ── 5 · Se libera otra vez: Carla; «No, gracias» desde Mi cuenta ──
    console.log('5 · Se libera otra vez: Carla; «Quitar» suelta la mesa');
    sql(`update operations set status = 'cancelled', cancelled_at = now(), cancelled_by = 'user' where number = '${nA2}'`);
    barrer();
    ok(await espera(() => entrada(C) === 'offered'), 'la siguiente de la fila (Carla) recibe la mesa');
    ok(avisos(C) === 1, 'y su aviso, una vez');
    const holdC = sql(`select hold_id from reservation_waitlist where user_id = '${C}' and status = 'offered'`);
    await pc.goto(B + '/cuenta/avisos'); await pc.getByText('Tus alertas').first().waitFor();
    ok(/SE LIBERÓ: TE LA GUARDAMOS/.test(await texto(pc)), 'Mi cuenta dice que se le guardó');
    await clic(pc.getByText('Quitar', { exact: true }));
    ok(await espera(() => entrada(C) === 'left'), '«Quitar» deja la entrada «left» (no se borra)');
    ok(sql(`select count(*) from reservation_holds where id = '${holdC}'`) === '0', 'y la mesa guardada se suelta al momento');
    ok(/no se borra/.test(sqlErr(`delete from reservation_waitlist where user_id = '${C}'`)), 'la base no deja borrar una entrada');

    // ── 6 · Solo la dueña ──
    const r404 = await pc.goto(B + `/reserva/${nA}`);
    ok(r404.status() === 404, 'Carla no ve la reservación de Ana');

    // ── 7 · Super Admin › Transacciones ──
    console.log('7 · Super Admin › Transacciones');
    const cad = await ctxDesk(b), pad = await cad.newPage();
    await entrarComo(pad, ADM);
    await pad.goto(B + `/admin/transacciones?tab=rsv&q=${nA}`);
    await pad.getByText(/lista de espera: tomó la mesa/).first().waitFor();
    ok(true, 'la reservación de Ana con «lista de espera: tomó la mesa»');
    await shot(pad, 'admin-1360-es', false);

    // ── 8 · ES/EN, 390/1360 ──
    console.log('8 · ES/EN y 390/1360');
    const nD = mesa(C, 'declined');
    sql(`update operations set status = 'confirmed' where number = '${nB}'`);   // vuelve a estar llena a esa hora
    for (const [w, lang] of [[390, 'en'], [1360, 'es'], [1360, 'en']]) {
      const cx = await (w === 390 ? ctxTel(b, { storageState: await cc.storageState() }) : ctxDesk(b, { storageState: await cc.storageState() }));
      await cx.addCookies([{ name: 'tl_lang', value: lang, url: B }]);
      const px = await cx.newPage(); mirar(px, `${w}-${lang}`);
      await px.goto(B + `/reserva/${nD}`);
      // El teléfono y el escritorio están los dos en la página (uno oculto): se espera el que se ve.
      ok(await espera(async () => !!(await vis(px.getByText(lang === 'es' ? 'OTROS RESTAURANTES CON MESA' : 'OTHER RESTAURANTS WITH TABLES')))), `${w} · ${lang.toUpperCase()}: «Otros restaurantes con mesa» en su idioma`);
      ok(/Notify me if it opens up|Avísame si se libera a esa hora/.test(await texto(px)), `${w} · ${lang.toUpperCase()}: «Avísame si se libera» en su idioma`);
      ok(await sinScroll(px), `${w} · ${lang.toUpperCase()}: sin scroll de lado`);
      await shot(px, `nopudo-${w}-${lang}`);
      await cx.close();
    }
    ok(!err.length, 'sin errores en la página' + (err.length ? ' → ' + err.join(' | ') : ''));
  } finally {
    const a0 = JSON.parse(ajustes0);
    sql(`update reservation_settings set areas = '${JSON.stringify(a0.areas)}'::jsonb, join_tables = ${a0.join}, min_ahead_h = ${a0.min} where business_id = '${BIZ}'`);
    sql(`update businesses set modules_off = '${pausa0}'::jsonb where id = '${PAUSA}'`);
    for (const f of devolver) f();
    await b.close();
  }
  console.log(`\n${n} comprobaciones ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
