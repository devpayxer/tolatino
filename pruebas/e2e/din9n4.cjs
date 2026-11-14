// 9n-4 · El dinero y los flujos que faltan (LAUNCH «→ 9n»), contra el simulador de pagos del sandbox (nunca Stripe de verdad):
//   A) cita con depósito y la tarjeta que pide 3-D Secure (4000 0027 6000 3184): la hoja, «No fui yo» (no hay cita) y «Confirmar» → la cita sale con
//      la MISMA retención (un solo cobro) (teléfono 390, ES);
//   B) el estimado del hogar: aprobar con la tarjeta que el banco rechaza (0002) → error y elegir otra → la que pide 3-D Secure → la hoja → retenido;
//      «algo más» con 3-D Secure (escritorio 1360 para el negocio);
//   C) fiesta, noche, viaje, inscripción, visita y evento privado: el depósito con 3-D Secure abre la hoja y sale con la misma retención;
//   D) mercado: «Pedir OK por $X más» → la hoja del banco → retenido aparte y cobrado lo real una vez; «No, que corten»; el sustituto por libra; el
//      recordatorio de los 10 min (EN, 1360);
//   E) «Volver a Pro» desde Free con 3-D Secure: la hoja en Tu plan → Pro activo con un solo cobro (escritorio 1360, EN);
//   F) reponer sin costo (panel) → pedido nuevo de $0 aceptado; la visita de garantía a $0 desde la ayuda aceptada;
//   G) el barrido: «Mañana es tu visita» para la visita de $0 del plan; «Me lo devolvieron» que nadie contesta se recuerda y se cierra solo; el
//      Repartidor ofrece solo el delivery aceptado (y avisa una vez si nadie lo toma); la noche especial con el precio real del boleto.
// Precondiciones propias (orden indiferente, dos veces seguidas en la misma base): cuentas nuevas con teléfonos 555 libres y SUS tarjetas; los
// negocios quedan como estaban (lo que se cambia se devuelve al final). Nada depende de otra prueba. SOLO=A,B corre solo esas partes.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright');
const { entrarComo, telLibre, sql, abiertoTodoElDia, direccion, medios, publicarBarberia } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT, FOTO = ENT.rec('fotos') + '/portada.jpg';
const SOLO = (process.env.SOLO || '').split(',').filter(Boolean);
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 48; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500)); };
const espera = async (f, v, veces = 80) => { for (let i = 0; i < veces; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const tel390 = (b, locale = 'es-US') => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale });
const desk = (b, locale = 'es-US') => b.newContext({ viewport: { width: 1360, height: 900 }, locale });
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `din9n4-${nom}.png`, fullPage: full });
const U = (t) => `(select id from users where phone = '+1${t}')`;
// La tarjeta de esta cuenta (del simulador: pm_sim_visa_<últimos 4>_<8 hex al azar>, única en toda la base); la última que se guarda queda predeterminada.
const suTarjeta = (t, l4) => {
  const pm = `pm_sim_visa_${l4}_${require('crypto').randomBytes(4).toString('hex')}`;
  sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated) values (${U(t)}, '${pm}', 'visa', '${l4}', '12/30', false, true)`);
  sql(`update payment_methods set is_default = (stripe_pm_id = '${pm}') where user_id = ${U(t)}`);
  return pm;
};
const PM3DS = (t) => suTarjeta(t, '3184');
const hoja = (p) => p.locator('[data-pantalla="PAGO-3DS"]');
const idioma = async (ctx, lang) => { await ctx.addCookies([{ name: 'tl_lang', value: lang, url: B }]); };
// La verificación pendiente más nueva de alguien (pi|estado|monto).
const pendiente = (t) => sql(`select pi || '|' || status || '|' || amount_cents from payment_actions where user_id = ${U(t)} order by created_at desc limit 1`);
const devolver = []; // lo que se cambió de los negocios, para dejarlo como estaba
const parte = (k) => !SOLO.length || SOLO.includes(k);

(async () => {
  sql(`insert into platform_config (key, value, note, updated_by) values ('entorno', '"pruebas"'::jsonb, 'Sandbox (din9n4)', 'semilla') on conflict (key) do update set value = excluded.value`);
  const b = await chromium.launch();
  const err = [], abiertas = [];
  const mirar = (p, tag) => { p.on('pageerror', (e) => err.push(`${tag} ${e.message}`)); };
  try {
    // ── A · Cita con depósito y 3-D Secure (teléfono 390, ES) ──
    if (parte('A')) {
      console.log('A · cita con depósito: el banco pide confirmar');
      const BIZ = 'barberia-el-primo', LUIS = `(select id from business_members where business_id = '${BIZ}' and kind = 'owner')`;
      const SV = sql(`select id from items where business_id = '${BIZ}' and module = 'svc' and name->>'es' = 'Fade' and removed_at is null order by id limit 1`);
      const antes = sql(`select chair_deposit_cents || '|' || chair_auto from business_members where id = ${LUIS}`).split('|');
      devolver.push(() => sql(`update business_members set chair_deposit_cents = ${antes[0]}, chair_auto = ${antes[1]} where id = ${LUIS}`));
      sql(`update business_members set chair_deposit_cents = 1000, chair_auto = false where id = ${LUIS}`);
      const T = telLibre(); const cx = await tel390(b); abiertas.push(cx); const m = await cx.newPage(); mirar(m, 'cita');
      await entrarComo(m, T, { nombre: 'Celia', apellido: 'Nueve' }); PM3DS(T);
      const reservar = async () => {
        await m.goto(B + `/n/${BIZ}/cita?s=${SV}&con=${sql(`select ${LUIS}`)}`);
        const bk = m.locator('[data-screen-label="APP-NEG-BOOKING · móvil"]'); await bk.getByText('DÍA', { exact: true }).waitFor();
        await m.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
        for (let d = 0; d < 7; d++) {
          const dias = bk.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM|HOY) / });
          await dias.nth(d + 1).click(); await m.waitForTimeout(400); await m.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
          const libres = bk.locator('[role="radio"][aria-checked="false"]:not([disabled]):not([aria-disabled="true"])').filter({ hasText: /^\d{1,2}:\d{2} (AM|PM)$/ });
          if (await libres.count()) { await libres.last().click(); break; }
        }
        for (let k = 0; k < 2; k++) { await m.locator('[data-screen-label="Booking · barra"]').getByRole('button', { name: 'Continuar' }).click(); await m.waitForTimeout(300); }
        await bk.getByText('ANTES DE ENVIAR').waitFor();
        await m.locator('[data-screen-label="Booking · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
      };
      const citas0 = sql(`select count(*) from operations where user_id = ${U(T)} and kind = 'appointment'`);
      await reservar();
      await hoja(m).first().waitFor({ timeout: 20000 });
      ok(/Tu banco pide confirmar/.test(await texto(m)) && /3-D SECURE · \$10/.test(await texto(m)), 'la hoja «Tu banco pide confirmar» con el depósito ($10, lo decidió el servidor)');
      await shot(m, 'a-cita-hoja-390', false);
      ok(sql(`select count(*) from operations where user_id = ${U(T)} and kind = 'appointment'`) === citas0, 'todavía no hay cita: nada se guarda sin la verificación');
      const P1 = pendiente(T).split('|');
      ok(P1[1] === 'pendiente' && P1[2] === '1000', 'la verificación queda pendiente a su nombre por $10');
      // «No fui yo»: el banco no confirma → no hay cita ni cobro.
      await clic(hoja(m).getByRole('button', { name: 'No fui yo' }));
      await m.getByText(/Tu banco no confirmó el pago/).first().waitFor({ timeout: 15000 });
      ok(sql(`select status from payment_actions where pi = '${P1[0]}'`) === 'fallo' && sql(`select count(*) from operations where user_id = ${U(T)} and kind = 'appointment'`) === citas0, '«No fui yo»: la verificación falla y no hay cita');
      await clic(hoja(m).getByRole('button', { name: 'Cerrar' }));
      // Otra vez: «Confirmar con mi banco» → la cita sale con la MISMA retención verificada.
      await reservar();
      await hoja(m).first().waitFor({ timeout: 20000 });
      const P2 = pendiente(T).split('|');
      ok(P2[0] !== P1[0] && P2[1] === 'pendiente', 'otra vez: una verificación nueva (la que falló no se reusa)');
      await clic(hoja(m).getByRole('button', { name: 'Confirmar con mi banco' }));
      await m.waitForURL(/\/cita\/C-\d+$/, { timeout: 25000 });
      const C1 = m.url().split('/').pop();
      ok(sql(`select p.kind || '|' || p.status || '|' || p.stripe_payment_intent || '|' || p.held_cents from payments p join operations o on o.id = p.operation_id where o.number = '${C1}'`) === `deposit|held|${P2[0]}|1000`, `cita ${C1}: el depósito retenido es el MISMO cobro que se verificó`);
      ok(sql(`select count(*) from payment_actions where base_idem = (select base_idem from payment_actions where pi = '${P2[0]}')`) === '1' && sql(`select status from payment_actions where pi = '${P2[0]}'`) === 'verificada', 'la verificación queda hecha y la cita la reusó: un solo cobro en el banco');
      ok(sql(`select count(*) from payments where user_id = ${U(T)} and stripe_payment_intent = '${P1[0]}'`) === '0', 'lo de «No fui yo» nunca entró al libro');
      await shot(m, 'a-cita-hecha-390');
      devolver.push(() => sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${U(T)} and status in ('pending', 'confirmed')`));
    }
    // ── B · El estimado del hogar: la tarjeta que el banco rechaza, luego 3-D Secure; «algo más» con 3-D Secure ──
    if (parte('B')) {
      console.log('B · estimado: rechazo (0002) → otra tarjeta con 3-D Secure; algo más con «No fui yo» y otra tarjeta');
      const H = 'plomeria-rodriguez';
      const antes = sql(`select coalesce((select pay_card::text from delivery_settings where business_id = '${H}'), 'null')`);
      sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated) values ('${H}', 'acct_sim_${H}', 'enabled', true, true, '[]'::jsonb, '7788', true) on conflict (business_id) do nothing`);
      sql(`insert into delivery_settings (business_id, pay_card) values ('${H}', true) on conflict (business_id) do update set pay_card = true`);
      devolver.push(() => sql(`update delivery_settings set pay_card = ${antes === 'null' ? 'false' : antes} where business_id = '${H}'`));
      const T = telLibre(); const cx = await tel390(b); abiertas.push(cx); const m = await cx.newPage(); mirar(m, 'estimado');
      await entrarComo(m, T, { nombre: 'Elsa', apellido: 'Nueve' });
      suTarjeta(T, '4242'); suTarjeta(T, '3184'); suTarjeta(T, '0002'); // la predeterminada: la que el banco rechaza
      const SVC = sql(`select id from items where business_id = '${H}' and name->>'es' = 'Visita y diagnóstico' and removed_at is null order by id limit 1`);
      const C = 'C-' + sql(`select nextval('operations_appt_seq')`);
      sql(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, details, subtotal_cents, total_cents, deposit_cents, pay_mode, confirmed_at, answered_at, client_key, is_test)
           select '${C}', 'appointment', 'hzl', '${H}', ${U(T)}, (select id from business_members where business_id = '${H}' and kind = 'owner'), 'confirmed', date_trunc('hour', now()), 120,
                  jsonb_build_object('rubro', 'hogar', 'svc', jsonb_build_object('es', 'Visita y diagnóstico', 'en', 'Visit and diagnosis'), 'svcId', '${SVC}', 'casa', jsonb_build_object('dir', '112 W Oak St, 18201', 'tenure', 'dueno'),
                                     'win', (extract(hour from now() at time zone 'America/New_York') * 60 + 120)::int, 'area', 'bano', 'acceso', 'casa'), 8900, 8900, 0, 'local', now(), now(), gen_random_uuid(), true`);
      devolver.push(() => sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where number = '${C}' and status = 'confirmed'`));
      const det = () => sql(`select status || '|' || coalesce(status_detail, '') from operations where number = '${C}'`);
      const cd = await desk(b); abiertas.push(cd); await medios(cd); const h = await cd.newPage(); mirar(h, 'panel-hogar');
      await entrarComo(h, '5705550222');
      const ht = h.locator('[data-screen-label="Panel v2 · detalle"]');
      const foto = async (boton) => { const fc = h.waitForEvent('filechooser'); await clic(boton); await (await fc).setFiles(FOTO); };
      await h.goto(B + `/panel/${H}/hoy?det=cita:${C}`); await clic(ht.getByRole('button', { name: 'Llegué' }));
      ok(await espera(det, 'confirmed|in') === 'confirmed|in', 'el negocio llegó a la casa');
      await h.goto(B + `/panel/${H}/hoy?det=cita:${C}`); await clic(ht.getByRole('button', { name: 'Armar el precio completo' }));
      await ht.getByLabel('QUÉ ES', { exact: true }).fill('Cambiar la válvula de la ducha');
      await ht.getByLabel('POR QUÉ · LA MEDIDA O EL CÓDIGO', { exact: true }).fill('La válvula gotea por dentro y no cierra del todo.');
      await ht.getByLabel('MATERIAL', { exact: true }).fill('Válvula Moen');
      await ht.getByLabel('PRECIO DE LA PIEZA · DÓLARES', { exact: true }).fill('120');
      await clic(ht.getByRole('button', { name: 'Mano de obra +' }));
      await foto(ht.getByText('Tomar o subir foto'));
      await ht.getByText('1/1', { exact: true }).first().waitFor({ timeout: 20000 });
      await clic(ht.getByRole('button', { name: 'Mandar al cliente' }));
      ok(await espera(det, 'confirmed|est') === 'confirmed|est', 'el precio completo, mandado al cliente');
      const pagos = () => sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${C}'`);
      // 1) La tarjeta que el banco rechaza (0002): error, nada retenido, y elegir otra.
      await m.goto(B + `/cita/${C}`); await m.getByText('PRECIO COMPLETO · TU OK').first().waitFor();
      await clic(m.getByRole('button', { name: /Aprobar 1 trabajo/ }));
      await m.getByText('Tu banco la rechazó. Prueba con otra tarjeta.').first().waitFor({ timeout: 15000 });
      ok(det() === 'confirmed|est' && pagos() === '0', 'rechazada (0002): «Tu banco la rechazó», el estimado sigue esperando y nada se retuvo');
      await shot(m, 'b-estimado-rechazada-390');
      const elegir = async (l4) => { await clic(m.locator('[data-screen-label="Cita · tarjeta"]')); const mp = m.locator('[data-screen-label="Método de pago"]'); await clic(mp.getByText(new RegExp(l4))); await clic(mp.getByText(/^Usar /)); await mp.waitFor({ state: 'detached' }); };
      // 2) Otra tarjeta, la que pide 3-D Secure: la hoja → confirmar → retenido con ESE cobro.
      await elegir('3184');
      await clic(m.getByRole('button', { name: /Aprobar 1 trabajo/ }));
      await hoja(m).first().waitFor({ timeout: 20000 });
      const linea = Number(sql(`select line_total_cents from estimate_lines l join operations o on o.id = l.operation_id where o.number = '${C}'`));
      ok(new RegExp(`3-D SECURE · \\$${(linea / 100).toFixed(2)}`).test(await texto(m)), `la hoja con lo aprobado ($${(linea / 100).toFixed(2)}, de la base)`);
      ok(det() === 'confirmed|est' && pagos() === '0', 'sin la verificación, el estimado sigue sin aprobar');
      const P = pendiente(T).split('|');
      await clic(hoja(m).getByRole('button', { name: 'Confirmar con mi banco' }));
      ok(await espera(det, 'confirmed|work') === 'confirmed|work', 'verificado → aprobado y trabajando');
      ok(sql(`select p.kind || '|' || p.status || '|' || p.stripe_payment_intent from payments p join operations o on o.id = p.operation_id where o.number = '${C}'`) === `estimate|held|${P[0]}`, 'retenido lo aprobado con el MISMO cobro verificado');
      // 3) «Algo más» con 3-D Secure: «No fui yo» → no se aprueba; con la 4242 → retenido aparte.
      await h.goto(B + `/panel/${H}/hoy?det=cita:${C}`); await clic(ht.getByRole('button', { name: 'Encontré algo más' }));
      await clic(ht.getByRole('button', { name: 'Plomería', exact: true })); await clic(ht.getByText('Llave de paso del inodoro', { exact: true }));
      await foto(ht.getByText('Tomar o subir foto')); await h.waitForTimeout(600);
      await clic(ht.getByRole('button', { name: 'Preguntarle' }));
      ok(await espera(det, 'confirmed|xtra') === 'confirmed|xtra', '«algo más» preguntado');
      await shot(h, 'b-panel-algo-mas-1360', false);
      await m.goto(B + `/cita/${C}`); await m.getByText('ALGO MÁS · TU OK').first().waitFor();
      await elegir('3184'); await clic(m.getByRole('button', { name: /Sí, hazlo/ }));
      await hoja(m).first().waitFor({ timeout: 20000 });
      await clic(hoja(m).getByRole('button', { name: 'No fui yo' }));
      await hoja(m).getByText(/Tu banco no confirmó el pago/).first().waitFor({ timeout: 15000 });
      ok(det() === 'confirmed|xtra' && sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${C}' and p.kind = 'extra'`) === '0', '«No fui yo» en «algo más»: sigue esperando y nada se retuvo');
      await clic(hoja(m).getByRole('button', { name: 'Cerrar' }));
      await elegir('4242');
      await clic(m.getByRole('button', { name: /Sí, hazlo/ }));
      ok(await espera(det, 'confirmed|work') === 'confirmed|work', 'con otra tarjeta (4242): aprobado sin hoja');
      const xt = sql(`select line_total_cents from estimate_lines l join operations o on o.id = l.operation_id where o.number = '${C}' and is_extra`);
      ok(sql(`select p.status || '|' || p.held_cents || '|' || p.card_last4 from payments p join operations o on o.id = p.operation_id where o.number = '${C}' and p.kind = 'extra'`) === `held|${xt}|4242`, `«algo más» retenido aparte en la 4242 ($${(Number(xt) / 100).toFixed(2)})`);
      await shot(m, 'b-estimado-hecho-390');
    }
    // ── C · Fiesta y noche: el depósito con 3-D Secure (la fiesta en inglés, la mesa VIP en español; 390) ──
    if (parte('C')) {
      console.log('C · fiesta y mesa VIP de noche: el depósito pide confirmar');
      const conHoja = async (p, T, re, nombre) => {
        await hoja(p).first().waitFor({ timeout: 20000 });
        const P = pendiente(T).split('|');
        ok(P[1] === 'pendiente' && Number(P[2]) > 0, `${nombre}: la hoja del banco con el depósito ($${(Number(P[2]) / 100).toFixed(2)}) y nada guardado todavía`);
        await clic(hoja(p).getByRole('button', { name: /^(Confirmar con mi banco|Confirm with my bank)$/ }));
        await p.waitForURL(re, { timeout: 25000 });
        const num = p.url().match(/[A-Z]-\d+/)[0];
        ok(sql(`select p.kind || '|' || p.status || '|' || p.stripe_payment_intent from payments p join operations o on o.id = p.operation_id where o.number = '${num}'`) === `deposit|held|${P[0]}`, `${nombre} ${num}: retenido con el MISMO cobro verificado`);
        devolver.push(() => sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where number = '${num}' and status in ('pending', 'change_proposed', 'confirmed')`));
        return num;
      };
      // Fiesta (EN, 390): un sábado lejano libre.
      const F = 'salon-imperial';
      const PACK = sql(`select id from items where business_id = '${F}' and svc_kind = 'pack' and removed_at is null and sell and status = 'live' order by sort, id limit 1`);
      const T1 = telLibre(); const cf = await tel390(b, 'en-US'); abiertas.push(cf); await idioma(cf, 'en'); const f = await cf.newPage(); mirar(f, 'fiesta');
      await entrarComo(f, T1, { nombre: 'Fina', apellido: 'Nueve' }); PM3DS(T1);
      let dia = null;
      for (let k = 0; k < 20 && !dia; k++) {
        const d = sql(`select (h + ((6 - extract(dow from h)::int + 7) % 7) + ${56 + 7 * k})::text from (select (now() at time zone 'America/New_York')::date as h) z`);
        if (sql(`select count(*) from party_days where business_id = '${F}' and day = '${d}' and removed_at is null`) === '0' && sql(`select count(*) from operations where business_id = '${F}' and kind = 'party' and status in ('pending', 'change_proposed', 'confirmed') and (scheduled_at at time zone 'America/New_York')::date = '${d}'`) === '0') dia = d;
      }
      ok(!!dia, `un sábado libre del salón (${dia})`);
      await f.goto(B + `/n/${F}/fiesta?s=${PACK}&d=${dia}`); await f.getByText('EVENT').first().waitFor();
      await clic(f.getByRole('button', { name: 'Quinceañera' })); await clic(f.getByRole('radio', { name: /150 guests/ }));
      await clic(f.getByRole('button', { name: 'Continue' }));
      await f.getByText('START TIME').first().waitFor();
      const horas = await f.locator('[role="radio"][aria-label$=" PM"]:not([aria-disabled="true"]), [role="radio"][aria-label$=" AM"]:not([aria-disabled="true"])').evaluateAll((L) => L.map((e) => e.getAttribute('aria-label')));
      await clic(f.getByRole('radio', { name: horas[0], exact: true }));
      await clic(f.getByRole('button', { name: 'Continue' }));
      await f.getByText('HOW YOU PAY').first().waitFor();
      await clic(f.getByRole('button', { name: 'Send request' }));
      await hoja(f).first().waitFor({ timeout: 20000 });
      ok(/Your bank asks you to confirm/.test(await texto(f)), 'la hoja en inglés: «Your bank asks you to confirm»');
      await shot(f, 'c-fiesta-hoja-390-en', false);
      await conHoja(f, T1, /\/fiesta\/F-\d+/, 'fiesta');
      // Mesa VIP de Noche (ES, 390).
      const NEG = 'la-terraza-night', VIP = sql(`select id from items where business_id = '${NEG}' and svc_kind = 'vip' and removed_at is null order by id limit 1`);
      const T2 = telLibre(); const cn = await tel390(b); abiertas.push(cn); const p = await cn.newPage(); mirar(p, 'noche');
      await entrarComo(p, T2, { nombre: 'Nora', apellido: 'Nueve' }); PM3DS(T2);
      await p.goto(`${B}/n/${NEG}/noche?s=${VIP}&p=4`); await p.getByText('¿CUÁNTOS VAN?').first().waitFor();
      await clic(p.getByRole('button', { name: 'Continuar' }));
      let elegido = false;
      for (const lab of await p.locator('[role="radio"][aria-label]:not([aria-disabled="true"])').evaluateAll((L) => L.map((e) => e.getAttribute('aria-label')))) {
        if (!/^[A-ZÁÉÍÓÚ]{3} \d+$/.test(lab)) continue;
        await clic(p.getByRole('radio', { name: lab, exact: true }));
        const hs = await p.locator('[role="radio"][aria-label$=" PM"]:not([aria-disabled="true"]), [role="radio"][aria-label$=" AM"]:not([aria-disabled="true"])').evaluateAll((L) => L.map((e) => e.getAttribute('aria-label')));
        if (hs.length) { await clic(p.getByRole('radio', { name: hs[0], exact: true })); elegido = true; break; }
      }
      ok(elegido, 'una noche con horas para la mesa VIP');
      await clic(p.getByRole('button', { name: 'Continuar' }));
      await p.getByText('BUENO SABER').first().waitFor();
      await clic(p.getByRole('button', { name: 'Enviar solicitud' }));
      await hoja(p).first().waitFor({ timeout: 20000 });
      await shot(p, 'c-noche-hoja-390', false);
      await conHoja(p, T2, /\/noche\/N-\d+/, 'mesa VIP');
      // Inscripción con matrícula (ES, 390): la matrícula se retiene con 3-D Secure.
      const EDU = 'ingles-para-todos', CIU = sql(`select id from items where business_id = '${EDU}' and name->>'es' = 'Preparación para ciudadanía' and removed_at is null order by id limit 1`);
      const ci0 = sql(`select coalesce(deposit_cents::text, 'null') || '|' || svc_attrs::text from items where id = ${CIU}`); const corte = ci0.indexOf('|');
      devolver.push(() => sql(`update items set deposit_cents = ${ci0.slice(0, corte)}, svc_attrs = '${ci0.slice(corte + 1)}'::jsonb where id = ${CIU}`));
      sql(`update items set deposit_cents = 5500, svc_attrs = svc_attrs || '{"dep":5500}'::jsonb where id = ${CIU}`);
      const T3 = telLibre(); const ci = await tel390(b); abiertas.push(ci); const q = await ci.newPage(); mirar(q, 'inscripcion');
      await entrarComo(q, T3, { nombre: 'Inés', apellido: 'Nueve' }); PM3DS(T3);
      await q.goto(`${B}/n/${EDU}/inscribirme?svc=${CIU}`); await q.getByText(/^(¿PARA QUIÉN ES\?|NOTA · OPCIONAL)$/).first().waitFor();
      await clic(q.getByRole('button', { name: 'Continuar' }));
      if (!(await vis(q.locator('button[role="radio"][aria-checked="true"]')))) { const r = await vis(q.locator('button[role="radio"]:not([disabled])')); if (r) await r.click(); }
      await clic(q.getByRole('button', { name: 'Continuar' }));
      await q.getByText('BUENO SABER').first().waitFor();
      await clic(q.getByRole('button', { name: 'Enviar solicitud' }));
      await conHoja(q, T3, /\/insc\/I-\d+/, 'inscripción');
    }
    // ── D · Mercado: el pedido con 3-D Secure, el sustituto por libra, «Pedir OK por $X más», «No, que corten», el recordatorio y el OK con la hoja ──
    if (parte('D')) {
      console.log('D · mercado: el OK por más (EN, 390) y el panel (ES, 1360)');
      const M = 'supermercado-la-cosecha', id = (x) => sql(`select id from items where business_id = '${M}' and name->>'es' = '${x}' and removed_at is null order by id limit 1`);
      sql(`update items set sold_out = false, stock_left = greatest(stock_left, stock_par), stock_day = null where business_id = '${M}' and name->>'es' in ('Pierna de cerdo', 'Arroz 10 lb', 'Bistec de res')`);
      const rs = sql(`select slot_cap || '|' || sub_default from retail_settings where business_id = '${M}'`).split('|');
      sql(`update retail_settings set slot_cap = 20, sub_default = 'similar' where business_id = '${M}'`);
      devolver.push(() => sql(`update retail_settings set slot_cap = ${rs[0]}, sub_default = '${rs[1]}' where business_id = '${M}'`));
      devolver.push(abiertoTodoElDia(M));
      const T = telLibre(); const cx = await tel390(b, 'en-US'); abiertas.push(cx); await idioma(cx, 'en'); const m = await cx.newPage(); mirar(m, 'mercado');
      await entrarComo(m, T, { nombre: 'Mara', apellido: 'Nueve' }); PM3DS(T);
      const L = [{ item: id('Pierna de cerdo'), q: 3, o: 1 }, { item: id('Arroz 10 lb'), q: 1, o: null }];
      await m.goto(B + `/n/${M}`); await m.evaluate(([b2, l]) => localStorage.setItem('tl-mercado', JSON.stringify({ biz: b2, lines: l })), [M, L]);
      await m.goto(B + `/n/${M}/mercado`); await m.getByText('1 · Your order').first().waitFor();
      const hr = m.locator('[role="radiogroup"][aria-label="Time"] [role="radio"]:not([disabled]):not([aria-disabled="true"])');
      if (!(await vis(hr))) await clic(m.getByRole('button', { name: 'Tomorrow', exact: true }));
      await clic(m.locator('[role="radiogroup"][aria-label="Time"] [role="radio"]:not([disabled]):not([aria-disabled="true"])').first());
      await clic(m.getByRole('button', { name: 'Send order' }));
      // El pedido mismo pide 3-D Secure: la hoja → confirmar → el pedido sale con esa retención.
      await hoja(m).first().waitFor({ timeout: 20000 });
      const P0 = pendiente(T).split('|');
      await clic(hoja(m).getByRole('button', { name: 'Confirm with my bank' }));
      await m.waitForURL(/\/mercado\/M-\d+/, { timeout: 25000 });
      const N = m.url().match(/M-\d+/)[0], O = sql(`select id from operations where number = '${N}'`);
      const held0 = Number(sql(`select held_cents from payments where operation_id = ${O} and kind = 'full' and status = 'held' and stripe_payment_intent = '${P0[0]}'`));
      ok(held0 > 0, `${N}: el pedido salió con la retención verificada ($${(held0 / 100).toFixed(2)})`);
      // Panel: aceptar, pesar de más (con foto), «no hay» el arroz → sustituto POR LIBRA.
      const cd = await desk(b); abiertas.push(cd); await medios(cd); const h = await cd.newPage(); mirar(h, 'panel-mercado');
      await entrarComo(h, '5705550288');
      const D = h.locator('aside[data-screen-label="Panel v2 · detalle"]');
      const panel = async () => { await h.goto(B + `/panel/${M}/hoy?det=merc:${N}`); await D.getByText(N).first().waitFor(); };
      const st = () => sql(`select status || '|' || coalesce(status_detail, '') from operations where id = ${O}`);
      await panel(); await clic(D.getByRole('button', { name: 'Aceptar' }));
      ok(await espera(st, 'confirmed|preparando') === 'confirmed|preparando', 'el mercado aceptó');
      const pesar = async (nombre, lb) => {
        await panel();
        const f = await vis(D.getByLabel(`PESO REAL · LB · ${nombre.toUpperCase()}`)); await f.fill(String(lb));
        const [fc] = await Promise.all([h.waitForEvent('filechooser'), clic(D.getByText(`Foto de ${nombre}`, { exact: true }))]); await fc.setFiles(FOTO);
        await h.waitForTimeout(1500); await clic(D.getByRole('button', { name: `Guardar peso de ${nombre}` }));
        await espera(() => sql(`select weight_final::text from operation_lines where operation_id = ${O} and name->>'es' = '${nombre}' and status = 'ok'`), String(lb));
      };
      await pesar('Pierna de cerdo', 8.5);
      await panel(); await clic(D.getByRole('button', { name: 'No hay Arroz 10 lb' }));
      await clic(D.getByText('Bistec de res', { exact: true }));
      const LA = sql(`select id from operation_lines where operation_id = ${O} and name->>'es' = 'Arroz 10 lb'`);
      ok(await espera(() => sql(`select (proposed->>'lb')::text from change_proposals where operation_id = ${O} and line_id = ${LA} and status = 'open'`), '1') === '1', 'no hay arroz → proponen bistec POR LIBRA (1 lb)');
      await m.goto(B + `/mercado/${N}`); await m.getByText(/lb, weighed with a photo/).first().waitFor();
      ok(true, 'el cliente ve el sustituto por libra: «$X/lb · 1 lb, weighed with a photo»');
      await clic(m.getByRole('button', { name: 'Yes, swap it' }));
      ok(await espera(() => sql(`select weight_est::text from operation_lines where operation_id = ${O} and sub_of = ${LA}`), '1.00') === '1.00', 'aceptado: entra como línea por peso (se pesa con su foto)');
      await pesar('Bistec de res', 1.4);
      // Mandar: pasa lo retenido → no sale sin pedir el OK.
      await panel(); await clic(D.getByRole('button', { name: /^Pedir OK por \$/ }).or(D.getByRole('button', { name: 'Mandar al cliente' })).first());
      await espera(st, 'confirmed|pesado');
      let mas = Number(sql(`select (details->>'ok_mas')::int from operations where id = ${O}`));
      ok(st() === 'confirmed|pesado' && mas > 0, `el peso pasa lo retenido: «Pedir OK por $${(mas / 100).toFixed(2)} más» (lo calcula la base)`);
      ok(sql(`select count(*) from notifications where tpl = 'merc_mas' and ref_id = '${N}'`) === '1', 'aviso al cliente: «Tu pedido pesó más»');
      await panel(); ok(!(await vis(D.getByRole('button', { name: 'Está listo' }))), 'sin su OK no se marca listo');
      await shot(h, 'd-panel-pide-ok-1360');
      // El cliente: «No, cut less».
      await m.goto(B + `/mercado/${N}`); await m.getByText(/THEY ASK YOUR OK FOR/).first().waitFor();
      await shot(m, 'd-mercado-ok-mas-390-en');
      await clic(m.getByRole('button', { name: 'No, cut less' }));
      ok(await espera(() => sql(`select (details ? 'ok_mas_no')::text from operations where id = ${O}`), 'true') === 'true', '«No, cut less»: el mercado lo sabe');
      ok(sql(`select count(*) from notifications where tpl = 'biz_merc_mas_no' and ref_id = '${N}'`) === '1', 'aviso al mercado: «No quiere pagar más»');
      // El mercado corta un poco y vuelve a pedir el OK (sigue pasando).
      await pesar('Pierna de cerdo', 8.0);
      await panel(); await clic(D.getByRole('button', { name: /^Pedir OK por \$/ }));
      ok(await espera(() => sql(`select (not (details ? 'ok_mas_no'))::text from operations where id = ${O}`), 'true') === 'true', 'el peso nuevo: otra vez el OK por más (el «no» era del peso anterior)');
      mas = Number(sql(`select (details->>'ok_mas')::int from operations where id = ${O}`));
      // El recordatorio de los 10 min (una vez): el peso se mandó hace 11 minutos.
      sql(`update operations set details = jsonb_set(details, '{weighed_at}', to_jsonb(now() - interval '11 minutes')) where id = ${O}`);
      await m.goto(B + `/mercado/${N}`); await m.getByText(/THEY ASK YOUR OK FOR/).first().waitFor();
      ok(await espera(() => sql(`select count(*) from notifications where tpl = 'merc_rec10' and ref_id = '${N}'`), '1') === '1', 'a los 10 min sin tocar «Looks good, charge»: un recordatorio');
      await m.reload(); await m.getByText(/THEY ASK YOUR OK FOR/).first().waitFor();
      ok(sql(`select count(*) from notifications where tpl = 'merc_rec10' and ref_id = '${N}'`) === '1', 'el recordatorio sale una sola vez');
      // «Looks good, charge»: la hoja del banco → se retiene lo que falta → se cobra lo real una vez.
      const real = Number(sql(`select coalesce(sum(final_cents + round(final_cents * tax_pct / 100)), 0)::int + coalesce((select delivery_cents from operations where id = ${O}), 0) from operation_lines where operation_id = ${O}`));
      await clic(m.locator('[data-screen-label="Pedido del mercado · OK por más"]').getByRole('button', { name: /^Looks good, charge/ }));
      await hoja(m).first().waitFor({ timeout: 20000 });
      ok(new RegExp(`3-D SECURE · \\$${(mas / 100).toFixed(2)}`).test(await texto(m)), `la hoja del banco por lo que falta ($${(mas / 100).toFixed(2)})`);
      ok(sql(`select count(*) from payments where operation_id = ${O} and kind = 'extra'`) === '0', 'sin la verificación, nada más retenido');
      await clic(hoja(m).getByRole('button', { name: 'Confirm with my bank' }));
      ok(await espera(() => sql(`select coalesce(sum(amount_cents) filter (where status = 'captured'), 0)::text from payments where operation_id = ${O}`), String(real)) === String(real), `cobrado lo real una vez: $${(real / 100).toFixed(2)}`);
      ok(sql(`select string_agg(kind || ':' || status || ':' || (amount_cents <= held_cents)::text, ',' order by kind) from payments where operation_id = ${O}`) === 'extra:captured:true,full:captured:true', 'la primera retención y la del OK, cada una cobrada sin pasar de lo suyo');
      ok(Number(sql(`select held_cents from payments where operation_id = ${O} and kind = 'extra'`)) === mas, 'lo del OK retenido = lo que la base calculó');
      await panel(); await clic(D.getByRole('button', { name: 'Está listo' })); await espera(st, 'confirmed|listo');
      await panel(); await clic(D.getByRole('button', { name: 'Lo recogió' }));
      ok(await espera(st, 'done|done') === 'done|done' && sql(`select coalesce(sum(amount_cents) filter (where status = 'captured'), 0)::text from payments where operation_id = ${O}`) === String(real), 'lo recogió: no se cobra otra vez');
      await shot(m, 'd-mercado-cobrado-390-en');
    }
    // ── E · «Volver a Pro» desde Free con 3-D Secure: la hoja en Tu plan (escritorio 1360, EN) ──
    if (parte('E')) {
      console.log('E · Volver a Pro: el banco pide confirmar y la hoja se abre en Tu plan');
      const bar = await publicarBarberia(b);
      const PM = suTarjeta(bar.tel, '3184');
      sql(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, trial_choice, ended_at) values ('${bar.id}', 'ended', 'month', '${bar.uid}', null, 'no_continue', now() - interval '2 days')
           on conflict (business_id) do update set status = 'ended', ended_at = now() - interval '2 days', current_period_end = null, card_pm = null, failed_attempts = 0, next_attempt_at = null`);
      sql(`insert into business_stats_cache (business_id, plan) values ('${bar.id}', 'free') on conflict (business_id) do update set plan = 'free'`);
      const cd = await desk(b, 'en-US'); abiertas.push(cd); await idioma(cd, 'en'); const d = await cd.newPage(); mirar(d, 'tu-plan');
      await entrarComo(d, bar.tel);
      await d.goto(B + `/panel/${bar.id}/cobros/plan`);
      await clic(d.getByText(/^Back to Pro · /));
      await clic(d.getByRole('button', { name: 'Use Visa ·· 3184' }));
      await hoja(d).last().waitFor({ timeout: 20000 });
      const RA = sql(`select pi || '|' || status || '|' || kind from payment_actions where business_id = '${bar.id}' order by created_at desc limit 1`).split('|');
      ok(RA[1] === 'pendiente' && RA[2] === 'renovacion' && sql(`select status from subscriptions where business_id = '${bar.id}'`) === 'ended', 'el banco pide confirmar: la hoja se abre en Tu plan y el plan sigue en Free');
      ok(sql(`select count(*) from notifications where tpl = 'pro_verify' and user_id = '${bar.uid}'`) === '0', 'en sesión no le llega además el aviso con el enlace');
      await shot(d, 'e-volver-pro-hoja-1360-en', false);
      await clic(hoja(d).getByRole('button', { name: 'Confirm with my bank' }));
      ok(await espera(() => sql(`select status from subscriptions where business_id = '${bar.id}'`), 'active') === 'active', 'confirmado: Pro activo');
      ok(sql(`select count(*) from subscription_events where business_id = '${bar.id}' and kind = 'charged'`) === '1' && sql(`select count(*) from subscription_events where business_id = '${bar.id}' and kind = 'back_to_pro'`) === '1', 'un solo cobro anotado y la vuelta a Pro');
      ok(sql(`select count(*) from payment_actions where business_id = '${bar.id}'`) === '1' && sql(`select plan from business_stats_cache where business_id = '${bar.id}'`) === 'pro', 'un solo cobro en el banco; la página ya es Pro');
      ok(Date.parse(sql(`select to_char(current_period_end at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from subscriptions where business_id = '${bar.id}'`)) > Date.now() + 25 * 86400000, 'el período empieza hoy (un mes de Pro desde la vuelta)');
      await d.goto(B + `/panel/${bar.id}/cobros/plan`); await d.waitForTimeout(800);
      ok(sql(`select count(*) from subscription_events where business_id = '${bar.id}' and kind = 'charged'`) === '1', 'abrir Tu plan otra vez no cobra de nuevo');
      await shot(d, 'e-volver-pro-listo-1360-en', false);
    }
    // ── F · Reponer sin costo (panel, 1360) y la visita de garantía a $0 (teléfono 390) ──
    if (parte('F')) {
      console.log('F · reponer con un pedido de $0 y la visita sin cargo');
      // F1 · Un pedido entregado de Sabor Dominicano con su ayuda «Que me lo repongan» (falta un plato): el dueño responde «Reponer sin costo».
      const BIZ = 'sabor-dominicano', T = telLibre(); const cx = await tel390(b); abiertas.push(cx); const m = await cx.newPage(); mirar(m, 'repone');
      await entrarComo(m, T, { nombre: 'Rita', apellido: 'Nueve' }); direccion(T);
      const FLAN = sql(`select id from items where business_id = '${BIZ}' and name->>'es' = 'Flan de leche' and removed_at is null limit 1`);
      const N = sql(`select nextval('operations_order_seq')`);
      sql(`insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, ready_at, subtotal_cents, tax_cents, total_cents, pay_mode, respond_by, confirmed_at, answered_at, done_at, client_key, is_test, details, delivery_cents, tip_cents)
           values ('${N}', 'order', 'hzl', '${BIZ}', ${U(T)}, 'done', 'delivered', 'delivery', now() - interval '1 hour', 900, 0, 1200, 'entrega', now(), now(), now(), now() - interval '30 minutes', gen_random_uuid(), true,
                   jsonb_build_object('to', jsonb_build_object('label', 'casa', 'street', '420 N Wyoming St', 'apt', 'Apt 2', 'zip', '18201', 'mi', 0.4)), 300, 0)`);
      const O = sql(`select id from operations where number = '${N}'`);
      sql(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values (${O}, ${FLAN}, '{"es":"Flan de leche","en":"Milk flan"}'::jsonb, 2, 450, 900, 0, '[]'::jsonb)`);
      sql(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, items, wants, body) values ('H-' || nextval('help_request_number_seq'), ${O}, '${BIZ}', 'hzl', ${U(T)}, 'falta', '[{"n":"Flan de leche","q":1}]'::jsonb, 'reponer', 'Faltó un flan')`);
      const cd = await desk(b); abiertas.push(cd); const d = await cd.newPage(); mirar(d, 'panel-repone');
      await entrarComo(d, '5705550133');
      const dt = d.locator('[data-screen-label="Panel v2 · detalle"]');
      await d.goto(B + `/panel/${BIZ}/hoy?det=ped:${N}`);
      await dt.getByLabel(/TU RESPUESTA · LA VE EN SU PEDIDO/).first().fill('Disculpa: te mandamos el flan que faltó, sin costo.');
      await clic(dt.getByRole('button', { name: 'Reponer sin costo' }));
      const nuevo = await espera(() => sql(`select coalesce((select w.number from help_requests h join operations w on w.id = h.replacement_op_id where h.operation_id = ${O}), '')`) !== '' ? 'si' : 'no', 'si') === 'si'
        ? sql(`select w.number from help_requests h join operations w on w.id = h.replacement_op_id where h.operation_id = ${O}`) : null;
      ok(!!nuevo, `repuesto: pedido nuevo #${nuevo}`);
      ok(sql(`select status || '|' || stage || '|' || mode || '|' || total_cents || '|' || pay_mode || '|' || (free_quota_month is null)::text from operations where number = '${nuevo}'`) === 'confirmed|accepted|delivery|0|none|true', 'de $0 (pay_mode none), aceptado, a la misma dirección y fuera del tope de Free');
      ok(sql(`select string_agg(qty || ':' || unit_price_cents || ':' || line_total_cents, ',') from operation_lines where operation_id = (select id from operations where number = '${nuevo}')`) === '1:0:0', 'el flan que faltó (1), en $0');
      ok(sql(`select count(*) from payments where operation_id = (select id from operations where number = '${nuevo}')`) === '0', 'ningún cobro: reponer no toca la tarjeta');
      ok(sql(`select status from help_requests where operation_id = ${O}`) === 'answered' && sql(`select count(*) from notifications where tpl = 'pedido_repuesto' and user_id = ${U(T)}`) === '1', 'la ayuda queda respondida y al cliente le llega «Te reponen tu pedido»');
      ok(sql(`select count(*) from delivery_codes where operation_id = (select id from operations where number = '${nuevo}')`) === '1', 'sigue el flujo del Repartidor (su código de entrega, como cualquier delivery)');
      await shot(d, 'f-panel-repuesto-1360', false);
      await m.goto(B + `/pedido/${nuevo}`); await m.getByText(/Reposición sin costo del pedido/).first().waitFor();
      await shot(m, 'f-pedido-repuesto-390');
      devolver.push(() => sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where number = '${nuevo}' and status = 'confirmed'`));
      // F2 · La visita del hogar que quedó mal: el negocio aceptó «que vuelva sin cargo» → la visita de garantía a $0.
      const H = 'plomeria-rodriguez', T2 = telLibre(); const cv = await tel390(b); abiertas.push(cv); const v = await cv.newPage(); mirar(v, 'garantia');
      await entrarComo(v, T2, { nombre: 'Gala', apellido: 'Nueve' }); suTarjeta(T2, '4242');
      sql(`insert into user_addresses (user_id, label, street, apt, zip, city_id, is_default, geo, geo_quality) values (${U(T2)}, 'casa', '112 W Oak St', '', '18201', 'hzl', true, st_geogfromtext('POINT(-75.9746 40.9584)'), 'numero')`);
      sql(`insert into user_homes (user_id, address_id, kind, tenure, is_default) values (${U(T2)}, (select id from user_addresses where user_id = ${U(T2)} order by created_at desc limit 1), 'casa', 'dueno', true)`);
      const SVC = sql(`select id from items where business_id = '${H}' and name->>'es' = 'Visita y diagnóstico' and removed_at is null order by id limit 1`);
      const C = 'C-' + sql(`select nextval('operations_appt_seq')`);
      sql(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, status_detail, scheduled_at, duration_min, details, subtotal_cents, total_cents, deposit_cents, pay_mode, confirmed_at, answered_at, done_at, client_key, is_test)
           select '${C}', 'appointment', 'hzl', '${H}', ${U(T2)}, (select id from business_members where business_id = '${H}' and kind = 'owner'), 'done', 'done', now() - interval '1 day', 120,
                  jsonb_build_object('rubro', 'hogar', 'svc', jsonb_build_object('es', 'Visita y diagnóstico', 'en', 'Visit and diagnosis'), 'svcId', '${SVC}', 'sel', '{}'::jsonb, 'casa', jsonb_build_object('dir', '112 W Oak St, 18201', 'tenure', 'dueno')),
                  8900, 8900, 0, 'local', now() - interval '2 days', now() - interval '2 days', now() - interval '1 day', gen_random_uuid(), true`);
      sql(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, items, wants, body, status, decision, reply, reply_at, reply_by)
           select 'H-' || nextval('help_request_number_seq'), o.id, '${H}', 'hzl', ${U(T2)}, 'quedo', '[]'::jsonb, 'reponer', 'La llave sigue goteando', 'answered', 'ok', 'Tienes razón: volvemos sin cargo.', now(), (select user_id from business_members where business_id = '${H}' and kind = 'owner')
             from operations o where o.number = '${C}'`);
      const HN = sql(`select h.number from help_requests h join operations o on o.id = h.operation_id where o.number = '${C}'`);
      await v.goto(B + `/cita/${C}/ayuda`);
      await clic(v.getByRole('button', { name: 'Reservar la visita sin cargo' }));
      await v.waitForURL(new RegExp(`warr=${HN}`), { timeout: 15000 });
      const bk = v.locator('[data-screen-label="APP-NEG-BOOKING · móvil"]').or(v.locator('body')).first();
      await v.getByText(/GARANTÍA · SIN CARGO/i).first().waitFor({ timeout: 15000 });
      ok(true, 'el Booking del mismo servicio dice «Garantía · sin cargo» (sin depósito ni tarjeta)');
      await shot(v, 'f-garantia-booking-390');
      await clic(v.getByRole('button', { name: 'Continuar' })); await v.waitForTimeout(500); // 1 · Tu casa → 2 · Franja de llegada
      await v.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
      let hecho = false;
      for (let k = 0; k < 7 && !hecho; k++) {
        const libres = v.locator('[role="radio"][aria-checked="false"]:not([disabled]):not([aria-disabled="true"])').filter({ hasText: /^\d{1,2}(:\d{2})? ?(AM|PM)?–/ });
        const x = await vis(libres); if (x) { await x.click(); hecho = true; break; }
        const dias = v.locator('[role="radio"][aria-label]:not([aria-disabled="true"])').filter({ hasText: /^\D{2,4}\s*\d+$/ });
        const vd = []; for (let i = 0; i < await dias.count(); i++) if (await dias.nth(i).isVisible()) vd.push(dias.nth(i));
        if (vd.length > k + 1) { await vd[k + 1].click(); await v.waitForTimeout(500); }
      }
      ok(hecho, 'una franja de llegada libre');
      await clic(v.getByRole('button', { name: 'Continuar' })); await v.waitForTimeout(500);
      void bk;
      await clic(v.getByRole('button', { name: /^(Enviar solicitud|Confirmar cita|Confirmar visita)$/ }));
      await v.waitForURL(/\/cita\/C-\d+$/, { timeout: 20000 });
      const C2 = v.url().split('/').pop();
      ok(sql(`select total_cents || '|' || deposit_cents || '|' || pay_mode || '|' || (details->>'warr') || '|' || (free_quota_month is null)::text from operations where number = '${C2}'`) === `0|0|none|${HN}|true`, `visita de garantía ${C2}: $0, sin depósito, ligada a la solicitud ${HN}`);
      ok(sql(`select count(*) from payments where operation_id = (select id from operations where number = '${C2}')`) === '0', 'nada retenido ni cobrado');
      ok(sql(`select w.number from help_requests h join operations w on w.id = h.warranty_op_id where h.number = '${HN}'`) === C2, 'la garantía queda usada (una sola)');
      await v.goto(B + `/cita/${C}/ayuda`); await v.getByRole('button', { name: new RegExp(`Ver tu visita sin cargo · ${C2}`) }).first().waitFor();
      ok(!(await vis(v.getByRole('button', { name: 'Reservar la visita sin cargo' }))), 'ya no se ofrece otra: «Ver tu visita sin cargo»');
      // Otra vez por el enlace: el servidor no deja una segunda.
      await v.goto(B + `/n/${H}/visita?s=${SVC}&warr=${HN}`); await v.waitForTimeout(500);
      devolver.push(() => sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where number = '${C2}' and status in ('pending', 'confirmed')`));
    }
    // ── G · Lo que hace el barrido: el recordatorio de la visita de $0 del plan, «Me lo devolvieron» que se cierra solo, el Repartidor que ofrece solo
    //        (con el interruptor del panel) y avisa una vez, el programado con su recordatorio; y la noche especial con el precio real del boleto ──
    if (parte('G')) {
      console.log('G · barrido: plan, «Me lo devolvieron», Repartidor y la noche especial');
      const barrer = () => require('child_process').execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
      const hasta = async (f, v, seg = 75) => { for (let i = 0; i < seg / 3; i++) { barrer(); if (f() === v) return v; await new Promise((r) => setTimeout(r, 3000)); } return f(); };
      // G1 · La visita de $0 de un plan del hogar, mañana a esta hora: «Mañana es tu visita» con la franja.
      const T = telLibre(); sql(`insert into users (phone, first_name, last_name, home_city_id, lang, is_test) values ('+1${T}', 'Pía', 'Nueve', 'hzl', 'es', true)`);
      const H = 'plomeria-rodriguez', CP = 'C-' + sql(`select nextval('operations_appt_seq')`);
      sql(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, buffer_min, details, subtotal_cents, total_cents, deposit_cents, pay_mode, confirmed_at, answered_at, client_key, is_test)
           select '${CP}', 'appointment', 'hzl', '${H}', ${U(T)}, (select id from business_members where business_id = '${H}' and kind = 'owner'), 'confirmed', date_trunc('hour', now()) + interval '20 hours', 120, 0,
                  jsonb_build_object('rubro', 'hogar', 'k', 'plan', 'plan', 'P-9n4', 'sms', true, 'svc', jsonb_build_object('es', 'Mantenimiento', 'en', 'Maintenance')), 0, 0, 0, 'app', now() - interval '1 hour', now() - interval '1 hour', gen_random_uuid(), true`);
      devolver.push(() => sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where number = '${CP}' and status = 'confirmed'`));
      ok(await hasta(() => sql(`select count(*) from notifications where tpl = 'plan_visita' and ref_id = '${CP}'`), '1') === '1', 'la visita de $0 del plan: «Mañana es tu visita» (24 h antes)');
      ok(/entre \d{1,2}:\d{2} (AM|PM) y las \d{1,2}:\d{2} (AM|PM)/.test(sql(`select body from notifications where tpl = 'plan_visita' and ref_id = '${CP}'`)), 'dice la franja de llegada: ' + sql(`select body from notifications where tpl = 'plan_visita' and ref_id = '${CP}'`));
      barrer(); ok(sql(`select count(*) from notifications where tpl in ('plan_visita', 'cita_rec') and ref_id = '${CP}'`) === '1', 'una sola vez');
      // G2 · «Me lo devolvieron» que nadie contesta (Bienes Raíces): recordatorio a la mitad y cierre a los 14 días, con su aviso.
      const INM = 'rentas-hazleton-latino', T2 = telLibre(); const cv = await tel390(b); abiertas.push(cv); const v = await cv.newPage(); mirar(v, 'devuelto');
      await entrarComo(v, T2, { nombre: 'Dora', apellido: 'Nueve' });
      const DN = 'D-' + sql(`select nextval('visit_seq')`);
      sql(`insert into operations (number, kind, city_id, business_id, user_id, status, status_detail, scheduled_at, duration_min, details, subtotal_cents, total_cents, pay_mode, confirmed_at, answered_at, done_at, client_key, is_test)
           values ('${DN}', 'visit', 'hzl', '${INM}', ${U(T2)}, 'done', 'done', now() - interval '20 days', 30, jsonb_build_object('rubro', 'inm', 'what', 'visita', 'item', jsonb_build_object('es', 'Casa de prueba', 'en', 'Test house'), 'dia', to_char(now() - interval '20 days', 'YYYY-MM-DD'), 'min', 600), 0, 0, 'none', now() - interval '21 days', now() - interval '21 days', now() - interval '20 days', gen_random_uuid(), true)`);
      sql(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, items, wants, body, status, decision, offer_cents, reply, reply_at)
           select 'H-' || nextval('help_request_number_seq'), o.id, '${INM}', 'hzl', ${U(T2)}, 'fotos', '[]'::jsonb, 'devolver', 'Me cobraron la solicitud', 'answered', 'alt', 2500, 'Te devolvemos los $25.', now() - interval '20 days' from operations o where o.number = '${DN}'`);
      const HID = sql(`select h.id from help_requests h join operations o on o.id = h.operation_id where o.number = '${DN}'`);
      sql(`update help_requests set outside_refund = 'pending' where id = ${HID}`);
      ok(sql(`select (outside_pending_at > now() - interval '1 minute')::text from help_requests where id = ${HID}`) === 'true', 'la base anota desde cuándo espera «Me lo devolvieron»');
      sql(`update help_requests set outside_pending_at = now() - interval '8 days' where id = ${HID}`);
      ok(await hasta(() => sql(`select count(*) from notifications where tpl = 'help_devuelto_rec' and user_id = ${U(T2)}`), '1') === '1', 'a la mitad del plazo (8 de 14 días): un recordatorio');
      ok(sql(`select status from help_requests where id = ${HID}`) === 'answered' && !/Rentas|Hazleton Latino/.test(sql(`select body from notifications where tpl = 'help_devuelto_rec' and user_id = ${U(T2)}`)), 'sigue abierta y el aviso no dice el lugar');
      barrer(); ok(sql(`select count(*) from notifications where tpl = 'help_devuelto_rec' and user_id = ${U(T2)}`) === '1', 'el recordatorio sale una sola vez');
      sql(`update help_requests set outside_pending_at = now() - interval '15 days' where id = ${HID}`);
      ok(await hasta(() => sql(`select status || '|' || closed_by || '|' || outside_refund from help_requests where id = ${HID}`), 'resolved|system|expired') === 'resolved|system|expired', 'a los 14 días se cierra sola (system · expired; nada se borra)');
      ok(sql(`select count(*) from notifications where tpl = 'help_devuelto_cierre' and user_id = ${U(T2)}`) === '1', 'con su aviso: «Cerramos tu solicitud»');
      await v.goto(B + `/vis/${DN}/ayuda`); await v.getByText(/Se cerró sola/).first().waitFor({ timeout: 15000 });
      ok(true, 'la persona lo ve en su solicitud: «Se cerró sola…»'); await shot(v, 'g-devuelto-cerrada-390');
      // G3 · El Repartidor: el dueño enciende «Ofrecer solo» (panel, 1360); un delivery aceptado sin repartidor se ofrece solo; el programado, con recordatorio.
      const BIZ = 'sabor-dominicano';
      const prev = sql(`select coalesce((select auto_offer::text || '|' || coalesce(who, 'team') || '|' || coalesce(delivery, false)::text from delivery_settings where business_id = '${BIZ}'), 'false|team|false')`).split('|');
      devolver.push(() => sql(`update delivery_settings set auto_offer = ${prev[0]}, who = '${prev[1]}', delivery = ${prev[2]} where business_id = '${BIZ}'`));
      sql(`update delivery_settings set auto_offer = false, who = 'team', delivery = true where business_id = '${BIZ}'`);
      const DRV = sql(`select id from delivery_drivers where business_id = '${BIZ}' and status = 'active' and user_id is not null order by id limit 1`);
      const prevOn = sql(`select online::text from delivery_drivers where id = ${DRV}`);
      devolver.push(() => sql(`update delivery_drivers set online = ${prevOn} where id = ${DRV}`));
      sql(`update delivery_drivers set online = true where id = ${DRV}`);
      const cd = await desk(b); abiertas.push(cd); const d = await cd.newPage(); mirar(d, 'panel-entrega');
      await entrarComo(d, '5705550133');
      await d.goto(B + `/panel/${BIZ}/entrega`); await d.getByText('AL RECOGER Y AL ENTREGAR').first().waitFor({ timeout: 15000 });
      const fila = d.getByText('Ofrecer solo a los repartidores', { exact: true }).first();
      await fila.locator('xpath=ancestor::*[.//*[@role="switch"]][1]').locator('[role="switch"]').first().click();
      ok(await espera(() => sql(`select auto_offer::text from delivery_settings where business_id = '${BIZ}'`), 'true') === 'true', 'el dueño encendió «Ofrecer solo»');
      ok(sql(`select count(*) from audit_entries where action = 'entrega.ofrecer_solo' and at > now() - interval '5 minutes'`) !== '0', 'queda en la auditoría');
      await shot(d, 'g-panel-ofrecer-solo-1360', false);
      const T3 = telLibre(); sql(`insert into users (phone, first_name, last_name, home_city_id, lang, is_test) values ('+1${T3}', 'Olga', 'Nueve', 'hzl', 'es', true)`);
      const pedido = (prog) => { const n2 = sql(`select nextval('operations_order_seq')`);
        sql(`insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, scheduled_at, ready_at, subtotal_cents, tax_cents, total_cents, pay_mode, respond_by, confirmed_at, answered_at, client_key, is_test, details, delivery_cents, tip_cents)
             values ('${n2}', 'order', 'hzl', '${BIZ}', ${U(T3)}, 'confirmed', 'accepted', 'delivery', ${prog ? "now() + interval '40 minutes'" : 'null'}, now() + interval '${prog ? 20 : 15} minutes', 900, 0, 1200, 'entrega', now(), now(), now(), gen_random_uuid(), true,
                     jsonb_build_object('to', jsonb_build_object('label', 'casa', 'street', '420 N Wyoming St', 'apt', '', 'zip', '18201', 'mi', 0.4)), 300, 0)`);
        devolver.push(() => sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where number = '${n2}' and status = 'confirmed'`));
        return n2; };
      const seg0 = sql(`select coalesce((select value::text from platform_config where key = 'oferta_seg'), '')`);
      devolver.push(() => sql(seg0 ? `update platform_config set value = '${seg0}'::jsonb where key = 'oferta_seg'` : `update platform_config set value = (select to_jsonb(def::int) from config_keys where key = 'oferta_seg') where key = 'oferta_seg'`));
      sql(`insert into platform_config (key, value, note, updated_by) values ('oferta_seg', '20'::jsonb, 'din9n4', 'semilla') on conflict (key) do update set value = '20'::jsonb`);
      await new Promise((r) => setTimeout(r, 16000)); // la caché de Configuración del servidor (15 s)
      const PN = pedido(false), OP = sql(`select id from operations where number = '${PN}'`);
      ok(await hasta(() => sql(`select count(*) from delivery_offers where operation_id = ${OP} and created_by is null and status = 'open'`), '1') === '1', `el pedido #${PN} se ofreció solo a los repartidores en línea`);
      ok(sql(`select count(*) from notifications where tpl = 'drv_oferta' and ref_id = '${PN}' and position('${T3.slice(-4)}' in body) = 0`) === '1', 'al repartidor le llega la oferta (sin el teléfono del cliente)');
      // Las ofertas vencen solas (oferta_seg en 20 s para la prueba; se devuelve al final): a la tercera sin nadie, el aviso.
      for (let k = 2; k <= 3; k++) ok(await hasta(() => sql(`select count(*) from delivery_offers where operation_id = ${OP} and created_by is null`), String(k), 90) === String(k), `venció sin nadie: oferta ${k} de 3`);
      ok(await hasta(() => sql(`select count(*) from notifications where tpl = 'biz_reparto_nadie' and ref_id = '${PN}'`), '1') === '1', 'nadie lo tomó en 3 ofertas: un aviso al negocio «Nadie tomó el pedido»');
      ok(sql(`select count(*) from delivery_offers where operation_id = ${OP} and created_by is null`) === '3', 'y no se ofrece más solo (el tope de Configuración)');
      barrer(); ok(sql(`select count(*) from notifications where tpl = 'biz_reparto_nadie' and ref_id = '${PN}'`) === '1', 'el aviso sale una sola vez');
      const PP = pedido(true), OPP = sql(`select id from operations where number = '${PP}'`);
      ok(await hasta(() => sql(`select count(*) from notifications where tpl = 'biz_programado' and ref_id = '${PP}'`), '1') === '1', `el programado #${PP}: a 30 min de estar listo, el recordatorio al negocio`);
      ok(sql(`select count(*) from delivery_offers where operation_id = ${OPP} and created_by is null`) === '1', 'y se ofrece solo a esa hora (no al aceptarlo)');
      // G4 · La noche especial con boleto en la ficha: el precio real del boleto más barato y «Comprar boletos».
      const NEG = 'la-terraza-night', EV = sql(`select e.id from events e where e.business_id = '${NEG}' and exists (select 1 from event_dates x where x.event_id = e.id and x.listable and x.ends_at > now()) and exists (select 1 from ticket_types t where t.event_id = e.id and not t.off and t.quantity > 0) order by e.id limit 1`);
      ok(!!EV, 'un evento publicado del local, con boletos a la venta');
      const desde = Number(sql(`select min(price_cents) from ticket_types where event_id = ${EV} and not off and quantity > 0 and (sales_end_at is null or sales_end_at > now())`));
      const IT = sql(`insert into items (business_id, module, name, price_cents, svc_kind, svc_attrs, sell, status) values ('${NEG}', 'svc', '{"es":"Noche especial 9n4","en":"Special night 9n4"}'::jsonb, 99900, 'evento', '{"event_id":"${EV}"}'::jsonb, true, 'live') returning id`);
      devolver.push(() => sql(`update items set removed_at = now(), status = 'hidden' where id = ${IT.split('\n')[0]}`));
      const cf = await tel390(b); abiertas.push(cf); const f = await cf.newPage(); mirar(f, 'ficha-noche');
      await f.goto(B + `/n/${NEG}`); await f.getByText('Noche especial 9n4').first().waitFor({ timeout: 15000 });
      const t = await texto(f);
      ok(t.includes(`Desde $${desde / 100}`) && !t.includes('$999') && /BOLETO · [A-ZÁÉÍÓÚ]{3} (\d{1,2} [A-Z]{3}|[A-Z]{3} \d{1,2})/.test(t), `la noche especial dice el precio real del boleto («Desde $${desde / 100}») y su fecha, no el del servicio` + (t.includes(`Desde $${desde / 100}`) ? '' : ' · la página dice: ' + t.slice(Math.max(0, t.indexOf('Noche especial 9n4') - 200), t.indexOf('Noche especial 9n4') + 300)));
      ok(!!(await vis(f.getByText('Comprar boletos'))), '«Comprar boletos» abre su evento');
      await shot(f, 'g-ficha-noche-especial-390');
    }
  } catch (e) {
    console.error(e);
    for (const c of abiertas) for (const p of c.pages()) await p.screenshot({ path: OUT + `din9n4-fallo-${Math.random().toString(36).slice(2, 6)}.png`, fullPage: true }).catch(() => {});
    process.exitCode = 1;
  } finally {
    for (const f of devolver.reverse()) { try { f(); } catch (e) { console.error('devolver', e.message); } }
    await b.close();
  }
  if (err.length) { console.error('errores en la página:', err.join(' | ')); process.exitCode = 1; }
  if (!process.exitCode) console.log(`OK din9n4 · ${n} ✓`);
})();
