// 4ie · Pedir visita, prueba de manejo y fecha: dos personas por la última hora → una · otra hora aceptada y rechazada · vence a las 4 h
// (reloj movido + barrido) · se rentó con 3 visitas vivas → 3 canceladas sin culpa y avisadas · cuarto: la dirección no sale en el HTML del
// cliente hasta confirmar · prueba en casa: el dealer no ve la dirección antes de confirmar (y cada vista queda auditada) · nota con SSN y
// tarjeta → guardada tapada · Iglesias: catecismo para mi hijo con datos cifrados (y borrados a los 30 días), «Pedir fecha» y consejería
// neutra · Pasó → la reseña se abre · 3 «No vino» → Plantones · ningún pago en todo el flujo. Teléfono y escritorio; se resetea solo.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { const x = await vis(l); if (!x) throw new Error('no visible: ' + l); await x.click(); };
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const st = (num) => sql(`select status || coalesce(':' || status_detail, '') from operations where number = '${num}'`);
const booked = (g) => Number(sql(`select seats_booked from class_groups where id = ${g}`));
const html = async (p, url) => { await p.goto(B + url); await p.waitForLoadState('networkidle'); return p.content(); };
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const diaL = (ymd) => { const d = new Date(`${ymd}T12:00:00Z`); return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MES[d.getUTCMonth()]}`; };
const horaL = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`; };
const INM = 'rentas-hazleton-latino', DL = 'autos-el-cibao', FE = 'parroquia-santa-maria', CONS = 'consejeria-familiar-shalom';
// 9b-1 · Las tres casas de la semilla por su nombre (antes los ids 1139–1141 de una base vieja).
const casa = (n) => sql(`select id from items where business_id = 'rentas-hazleton-latino' and name->>'es' = '${n}' and removed_at is null order by id limit 1`);
const P1 = casa('2 cuartos · 312 Alter St'), P2 = casa('3 cuartos · casa · 90 W Diamond Ave'), P3 = casa('Estudio · 15 E Broad St');
// El cuarto de pruebas de Rentas Hazleton Latino (lo crea inm4ib y lo retira al volver a correr): se toma el último y se revive abajo.
// 9b-1 · Si no está (base nueva, u otro orden), lo hace inm4ib (requiere).
const CUARTO = require('../lib/requiere.cjs').requiere('inm4ib', () => sql(`select pl.item_id from property_listings pl where pl.business_id = 'rentas-hazleton-latino' and pl.kind = 'cuarto' and not pl.addr_public order by pl.item_id desc limit 1`), { que: 'el cuarto de pruebas de Rentas Hazleton Latino' });
// De la semilla (nunca de otra prueba, que los retira al volver a correr): catecismo, bautizo («Pedir fecha») y consejería.
const svcDe = (neg, n) => sql(`select id from items where business_id = '${neg}' and module = 'svc' and name->>'es' = '${n}' and removed_at is null order by id limit 1`);
const CATE = svcDe('parroquia-santa-maria', 'Catecismo · primera comunión'), BENDICION = (() => {
  // «Pedir fecha» sin grupos: la prueba crea el suyo una vez (nombre propio, nadie más lo retira).
  const ya = svcDe('parroquia-santa-maria', 'Prueba 4ie · Bendición'); if (ya) return ya;
  return sql(`insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, photos, sell, sort) values ('parroquia-santa-maria', 'svc', '{"es":"Prueba 4ie · Bendición","en":"Test 4ie · Blessing"}', '{"es":"","en":""}', 2500, 30, 'clase', '{"fe":"don","dur":{"es":"Con cita · 30 minutos","en":"By appointment · 30 minutes"}}', '{}', true, 99) returning id`).split('\n')[0];
})(), CONSEJ = svcDe('consejeria-familiar-shalom', 'Consejería de pareja');
const CARRO = sql(`select v.item_id from vehicle_listings v join items i on i.id = v.item_id where v.business_id = '${DL}' and v.status = 'lot' and i.status = 'live' and i.removed_at is null order by v.item_id limit 1`);
const pagos = () => sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.kind = 'visit' or (o.kind = 'enrollment' and o.details->>'rubro' = 'fe')`);
// La hora libre n-ésima de una propiedad (o «cualquier carro» del dealer): id, día y minuto.
const grupo = (where, n = 0) => { const r = sql(`select g.id || '|' || g.starts_on || '|' || g.start_min from class_groups g join cities c on c.id = g.city_id where ${where} and g.status = 'open' and g.seats_total - g.seats_outside - g.seats_booked >= 1 and ((g.starts_on + make_interval(mins => g.start_min)) at time zone c.timezone) > now() + interval '3 hours' order by g.starts_on, g.start_min offset ${n} limit 1`); const [id, dia, min] = r.split('|'); return { id, dia, min: Number(min) }; };

// Pedir (paso 1: día y hora; paso 2: revisa y envía).
async function pedir(p, neg, item, o = {}) {
  await p.goto(`${B}/n/${neg}/ver?item=${item}`); await p.getByRole('radiogroup').first().waitFor();
  if (o.g) { await clic(p.getByRole('button', { name: diaL(o.g.dia), exact: true })); await clic(p.locator('button[role="radio"]').filter({ hasText: horaL(o.g.min) })); }
  else { const r = await vis(p.locator('button[role="radio"]:not([disabled])')); await r.click(); }
  if (o.casa) { await clic(p.getByRole('switch', { name: 'Prueba en casa' })); await (await vis(p.getByLabel('Calle y número'))).fill(o.casa.calle); await (await vis(p.getByLabel('Código postal'))).fill(o.casa.zip); }
  if (o.shot1) await p.screenshot({ path: OUT + o.shot1, fullPage: true });
  await clic(p.getByRole('button', { name: 'Continuar' }));
  await p.getByText('BUENO SABER').first().waitFor();
  if (o.licencia) await clic(p.getByRole('checkbox', { name: /Sí, tengo licencia vigente/ }));
  if (o.trade) { await clic(p.getByRole('switch', { name: 'Carro a cambio' })); await (await vis(p.getByLabel('Año'))).fill('2012'); await (await vis(p.getByLabel('Marca'))).fill('Toyota'); await (await vis(p.getByLabel('Modelo'))).fill('Corolla'); await (await vis(p.getByLabel('Millas'))).fill('140000'); }
  if (o.nota) await (await vis(p.getByLabel('Nota'))).fill(o.nota);
  if (o.shot2) await p.screenshot({ path: OUT + o.shot2, fullPage: true });
  if (o.sinEnviar) return null;
  await clic(p.getByRole('button', { name: 'Enviar solicitud' }));
  await p.waitForURL(/\/vis\/D-\d+/, { timeout: 15000 });
  return p.url().match(/D-\d+/)[0];
}
async function inscFe(p, neg, svc, o = {}) {
  await p.goto(`${B}/n/${neg}/inscribirme?svc=${svc}`); await p.getByText(/^(¿PARA QUIÉN ES\?|NOTA · OPCIONAL)$/).first().waitFor();
  if (o.hijo) {
    await clic(p.getByText('Para mi hijo o hija'));
    await (await vis(p.getByLabel('Nombre de pila'))).fill(o.hijo.nombre);
    await (await vis(p.getByLabel('Edad'))).selectOption(String(o.hijo.edad));
    await clic(p.getByRole('checkbox', { name: /Soy su mamá/ }));
  }
  if (o.nota) await (await vis(p.getByLabel('Nota'))).fill(o.nota);
  await clic(p.getByRole('button', { name: 'Continuar' }));
  if (o.fecha) { await clic(p.getByRole('button', { name: /^(lun|mar|mié|jue|vie|sáb|dom) \d+ [a-z]+$/ }).nth(1)); await clic(p.getByRole('button', { name: 'En la mañana', exact: true })); }
  else if (!(await vis(p.locator('button[role="radio"][aria-checked="true"]')))) { const r = await vis(p.locator('button[role="radio"]:not([disabled])')); if (r) await r.click(); }
  await clic(p.getByRole('button', { name: 'Continuar' }));
  await p.getByText('BUENO SABER').first().waitFor();
  if (o.shot) await p.screenshot({ path: OUT + o.shot, fullPage: true });
  await clic(p.getByRole('button', { name: 'Enviar solicitud' }));
  await p.waitForURL(/\/insc\/I-\d+/, { timeout: 15000 });
  return p.url().match(/I-\d+/)[0];
}

(async () => {
  // ── Punto de partida (se resetea solo: pasa al volver a correrlo) ──
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancel_reason = 'prueba', respond_by = null where kind = 'visit' and status in ('pending', 'change_proposed', 'confirmed')`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', respond_by = null where kind = 'enrollment' and business_id in ('${FE}', '${CONS}') and status in ('pending', 'change_proposed', 'confirmed')`);
  sql(`update class_groups set seats_booked = 0 where purpose in ('visita', 'prueba') or business_id in ('${FE}', '${CONS}')`);
  sql(`update items set removed_at = null, status = 'live' where id = ${CUARTO}`);
  sql(`update property_listings set status = 'available', status_at = now() where item_id in (${P1}, ${P2}, ${P3}, ${CUARTO})`);
  sql(`update items set svc_attrs = svc_attrs || '{"visit_pattern":[{"dow":1,"min":600,"on":true},{"dow":2,"min":600,"on":true},{"dow":3,"min":600,"on":true},{"dow":4,"min":1020,"on":true},{"dow":5,"min":1080,"on":true},{"dow":6,"min":660,"on":true}],"cupo":1}'::jsonb where id in (${P1}, ${P2}, ${P3}, ${CUARTO})`);
  sql(`update inm_settings set derived_on = null where business_id = '${INM}'`);
  sql(`update queue_items set status = 'decided', decided_at = now() where queue = 'plantones' and status = 'open'`);
  sql(`update operations set status_detail = 'prueba_vieja' where kind = 'visit' and status_detail = 'noshow' and business_id = '${DL}'`);
  sql(`update users set first_name = coalesce(nullif(first_name, ''), 'Prueba') where phone in ('+15705550299', '+15705550288', '+15705550122')`);
  sql(`update dealer_settings set home_test = true, trade = true where business_id = '${DL}'`);
  barrer(); // rehace las horas de visita (14 días) y las de prueba de manejo
  const pagos0 = pagos();
  const b = await chromium.launch(); const err = [];
  const ctx = async (tel, w = 390) => { const p = await (await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: w < 500 ? 2 : 1 })).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) err.push(m.text()); }); await entrar(p, tel); return p; };
  const cli = await ctx('5705550122'), p2 = await ctx('5705550299'), p3 = await ctx('5705550288');
  const yes = await ctx('5705550433'), juan = await ctx('5705550444'), luis = await ctx('5705550422');

  // 0 · La hoja de la propiedad lleva a «Pedir visita» (ya no a llamar).
  await cli.goto(`${B}/n/${INM}?tab=svc`); await clic(cli.getByRole('button', { name: 'Pedir visita' }).first());
  await clic(cli.getByRole('dialog').getByRole('button', { name: 'Pedir visita' }));
  await cli.waitForURL(/\/ver\?item=/); ok(true, 'la hoja de la propiedad lleva a «Pedir visita»');

  // 1 · Visita con una nota que trae un seguro social y una tarjeta → se guarda tapada. Hoy $0, la hora queda apartada.
  const g1 = grupo(`g.item_id = ${P1} and g.purpose = 'visita'`);
  const V1 = await pedir(cli, INM, P1, { g: g1, nota: 'Mi seguro es 123-45-6789 y la tarjeta 4111 1111 1111 1111, llego en carro', shot1: 'v4ie-dia-m.png', shot2: 'v4ie-revisa-m.png' });
  ok(st(V1) === 'pending' && booked(g1.id) === 1, `${V1}: pendiente y la hora apartada`);
  const nota = sql(`select customer_note from operations where number = '${V1}'`);
  ok(!/123-45-6789|4111/.test(nota) && /•••-••-••••/.test(nota) && /llego en carro/.test(nota), `la nota se guardó tapada: «${nota}»`);
  ok(sql(`select (details->>'move_in_cents') is not null and total_cents = 0 and deposit_cents = 0 and pay_mode = 'none' from operations where number = '${V1}'`) === 't', 'copia «Para mudarte» y nace con $0 y sin forma de pago');
  await cli.getByText('PENDIENTE').first().waitFor(); await cli.screenshot({ path: OUT + 'v4ie-pend-m.png', fullPage: true });
  ok(sql(`select count(*) from notifications n join business_members m on m.user_id = n.user_id and m.business_id = '${INM}' where n.ref_id = '${V1}' and n.tpl = 'biz_vis'`) !== '0', 'al negocio le llega «Nueva solicitud»');

  // 2 · Dos personas por la última hora (cupo 1) → solo una.
  const gR = grupo(`g.item_id = ${P2} and g.purpose = 'visita'`);
  await Promise.all([p2, p3].map((p) => pedir(p, INM, P2, { g: gR, sinEnviar: true })));
  await Promise.all([p2, p3].map(async (p) => { const x = await vis(p.getByRole('button', { name: 'Enviar solicitud' })); await x.click(); }));
  await espera(() => Number(sql(`select count(*) from operations where kind = 'visit' and details->>'group_id' = '${gR.id}' and status = 'pending'`)) >= 1, 8000);
  await new Promise((r) => setTimeout(r, 2500));
  const vivasR = Number(sql(`select count(*) from operations where kind = 'visit' and details->>'group_id' = '${gR.id}' and status = 'pending'`));
  ok(vivasR === 1 && booked(gR.id) === 1, `dos por la última hora → ${vivasR} pasa y la hora no se pasa (seats_booked = ${booked(gR.id)})`);
  const perdedor = [p2, p3].find((p) => !/\/vis\//.test(p.url()));
  ok(!!perdedor && !!(await vis(perdedor.getByText(/Esa hora ya la tomó otra persona|Esa hora ya no está/))), 'a quien no alcanzó le dice «Esa hora ya la tomó otra persona»');
  const ganador = [p2, p3].find((p) => /\/vis\//.test(p.url())), VR = ganador.url().match(/D-\d+/)[0];

  // 3 · Panel: Hoy «Esperan tu respuesta» → Otra hora → la persona acepta (confirmada a la nueva hora).
  await yes.goto(`${B}/panel/${INM}/hoy`); await yes.getByText(/ESPERAN TU RESPUESTA · \d+/).first().waitFor();
  await yes.screenshot({ path: OUT + 'v4ie-panel-hoy-m.png', fullPage: true }); ok(true, 'Hoy: las visitas esperan respuesta');
  await yes.goto(`${B}/panel/${INM}/hoy?det=vis:${V1}`); await clic(yes.getByRole('button', { name: 'Otra hora' }));
  await clic(yes.getByRole('button', { name: /^(lun|mar|mié|jue|vie|sáb|dom) \d+ \w+ · \d/ }).nth(1));
  ok(await espera(() => st(V1) === 'change_proposed' && booked(g1.id) === 0), 'otra hora: la pedida se suelta y la propuesta queda apartada');
  await cli.goto(`${B}/vis/${V1}`); await cli.getByText('TE PROPONEN UN CAMBIO').first().waitFor();
  await cli.screenshot({ path: OUT + 'v4ie-otra-m.png', fullPage: true });
  await clic(cli.getByRole('button', { name: 'Aceptar', exact: true }));
  ok(await espera(() => st(V1) === 'confirmed'), 'aceptar la otra hora → confirmada');
  ok(sql(`select count(*) from notifications n where n.ref_id = '${V1}' and n.tpl = 'vis_alt'`) === '1', 'le llegó «Te proponen otra hora»');
  // … y otra hora rechazada («No me sirve») → cancelada, la hora vuelve.
  await yes.goto(`${B}/panel/${INM}/hoy?det=vis:${VR}`); await clic(yes.getByRole('button', { name: 'Otra hora' }));
  await clic(yes.getByRole('button', { name: /^(lun|mar|mié|jue|vie|sáb|dom) \d+ \w+ · \d/ }).first());
  ok(await espera(() => st(VR) === 'change_proposed'), 'otra hora propuesta a la segunda persona');
  const altR = sql(`select details->>'alt_group_id' from operations where number = '${VR}'`);
  await ganador.goto(`${B}/vis/${VR}`); await clic(ganador.getByRole('button', { name: 'No me sirve' }));
  ok(await espera(() => st(VR) === 'cancelled' && booked(gR.id) === 0 && (!altR || booked(altR) === 0)), '«No me sirve» → cancelada y las dos horas libres');

  // 4 · Vence a las 4 h hábiles (reloj movido + barrido) → SIN RESPUESTA, la hora vuelve.
  const gE = grupo(`g.item_id = ${P2} and g.purpose = 'visita'`, 1);
  const VE = await pedir(p3, INM, P2, { g: gE });
  ok(sql(`select respond_by <= scheduled_at - interval '1 hour' and respond_by <= now() + interval '4 days' from operations where number = '${VE}'`) === 't', 'el plazo nunca pasa de la hora − 1 h');
  sql(`update operations set respond_by = now() - interval '1 minute' where number = '${VE}'`); barrer();
  ok(await espera(() => st(VE) === 'expired:sin_respuesta' && booked(gE.id) === 0), 'vence sin respuesta → SIN RESPUESTA y la hora queda libre');
  ok(sql(`select count(*) from notifications where ref_id = '${VE}' and tpl = 'vis_exp'`) === '1', 'le llegó «Sin respuesta»');

  // 5 · Se rentó con 3 visitas vivas → 3 canceladas sin culpa y avisadas.
  const R3 = [];
  for (const [i, p] of [cli, p2, p3].entries()) R3.push(await pedir(p, INM, P3, { g: grupo(`g.item_id = ${P3} and g.purpose = 'visita'`, 0) }));
  ok(R3.every((n) => st(n) === 'pending'), `3 visitas vivas a la misma propiedad (${R3.join(', ')})`);
  await yes.goto(`${B}/panel/${INM}/vendes/propiedades?det=inm:${P3}`); await yes.getByText('ESTADO · SE GUARDA AL TOCAR').first().waitFor();
  await clic(yes.getByText('Rentada', { exact: true }));
  ok(await espera(() => R3.every((n) => st(n) === 'cancelled:rentada')), 'se rentó → las 3 canceladas sin culpa (cancel_reason retirado · rentada)');
  ok(await espera(() => R3.every((n) => sql(`select count(*) from notifications where ref_id = '${n}' and tpl = 'vis_vendido'`) === '1')), 'y las 3 personas avisadas «Ya no está disponible»');
  await cli.goto(`${B}/vis/${R3[0]}`); await cli.getByText('Ya se rentó').first().waitFor(); await cli.screenshot({ path: OUT + 'v4ie-rentada-m.png', fullPage: true });
  ok(sql(`select count(*) from class_groups where item_id = ${P3} and purpose = 'visita' and status = 'open' and seats_booked > 0`) === '0', 'las horas de esa propiedad quedaron libres');
  sql(`update property_listings set status = 'available' where item_id = ${P3}`);

  // 6 · Cuarto: la dirección exacta no está en el HTML del cliente hasta confirmar; después sí.
  const calle = sql(`select addr_line from property_listings where item_id = ${CUARTO}`);
  const VC = await pedir(p2, INM, CUARTO, { g: grupo(`g.item_id = ${CUARTO} and g.purpose = 'visita'`) });
  ok(!(await html(p2, `/vis/${VC}`)).includes(calle), `cuarto pendiente: «${calle}» no está en el HTML del cliente`);
  ok(!(await html(p2, `/n/${INM}`)).includes(calle) && !(await html(p2, `/n/${INM}/ver?item=${P1}`)).includes(calle), 'ni en la ficha ni en la pantalla de pedir');
  await yes.goto(`${B}/panel/${INM}/hoy?det=vis:${VC}`); await clic(yes.getByRole('button', { name: 'Confirmar', exact: true }));
  ok(await espera(() => st(VC) === 'confirmed'), 'el negocio confirma el cuarto');
  ok((await html(p2, `/vis/${VC}`)).includes(calle), 'confirmada: la dirección exacta ya está en su pantalla');
  ok(sql(`select count(*) from notifications where ref_id = '${VC}' and tpl = 'vis_ok' and body like '%${calle}%'`) === '1', 'y en el aviso de confirmación');
  await p2.screenshot({ path: OUT + 'v4ie-conf-cuarto-m.png', fullPage: true });

  // 7 · Prueba de manejo en casa: el dealer no ve la dirección antes de confirmar; confirmada sí, y cada vista queda auditada.
  await cli.goto(`${B}/n/${DL}?tab=svc`); await clic(cli.getByRole('button', { name: 'Prueba de manejo' }).first());
  await clic(cli.getByRole('dialog').getByRole('button', { name: 'Prueba de manejo' })); await cli.waitForURL(/\/ver\?item=/); ok(true, 'la hoja del carro lleva a «Prueba de manejo»');
  const VP = await pedir(cli, DL, CARRO, { g: grupo(`g.business_id = '${DL}' and g.purpose = 'prueba' and g.item_id is null`), casa: { calle: '45 Calle de Prueba', zip: '18201' }, licencia: true, trade: true, shot1: 'v4ie-prueba-casa-m.png', shot2: 'v4ie-prueba-revisa-m.png' });
  ok(sql(`select (details->>'at_home')::boolean and (details->>'has_license')::boolean and details->'trade_in'->>'make' = 'Toyota' and (details->>'otd_cents') is not null from operations where number = '${VP}'`) === 't', `${VP}: en casa, «tiene licencia», carro a cambio y la copia del total en la puerta`);
  ok(sql(`select count(*) from op_private p join operations o on o.id = p.operation_id where o.number = '${VP}' and p.reason = 'casa' and position('Calle' in encode(p.note_enc, 'escape')) = 0`) === '1', 'la dirección de su casa va cifrada');
  const audit0 = Number(sql(`select count(*) from audit_entries where action = 'vis.ver_direccion' and target_id = '${VP}'`));
  const antes = await html(juan, `/panel/${DL}/hoy?det=vis:${VP}`);
  ok(!antes.includes('45 Calle de Prueba') && /la dirección se ve cuando confirmas/.test(antes), 'el dealer no ve la dirección antes de confirmar');
  await juan.screenshot({ path: OUT + 'v4ie-dealer-pend-m.png', fullPage: true });
  await clic(juan.getByRole('button', { name: 'Confirmar', exact: true }));
  ok(await espera(() => st(VP) === 'confirmed'), 'el dealer confirma la prueba');
  ok((await html(juan, `/panel/${DL}/hoy?det=vis:${VP}`)).includes('45 Calle de Prueba'), 'confirmada: el dealer ve la dirección');
  ok(Number(sql(`select count(*) from audit_entries where action = 'vis.ver_direccion' and target_id = '${VP}'`)) > audit0, 'cada vista de la dirección queda en la auditoría');
  await juan.screenshot({ path: OUT + 'v4ie-dealer-conf-m.png', fullPage: true });

  // 8 · Pasó → la reseña se abre (estrellas en su pantalla → Escribir reseña verificada).
  sql(`update operations set scheduled_at = now() - interval '1 hour' where number = '${VP}'`);
  await juan.goto(`${B}/panel/${DL}/hoy`); await juan.getByText(/VISITAS DE HOY/).first().waitFor();
  await clic(juan.getByRole('button', { name: 'Pasó', exact: true }));
  ok(await espera(() => st(VP) === 'done'), 'el dealer marca «Pasó»');
  ok(sql(`select count(*) from notifications where ref_id = '${VP}' and tpl = 'vis_resena'`) === '1', 'le llega «¿Cómo te fue?»');
  await cli.goto(`${B}/vis/${VP}`); await cli.getByText('¿Cómo te fue en la prueba?').first().waitFor(); await cli.screenshot({ path: OUT + 'v4ie-paso-m.png', fullPage: true });
  await clic(cli.getByRole('button', { name: '5 estrellas' })); await cli.waitForURL(/\/resena\?pedido=D-/);
  ok(!(await vis(cli.getByText(/no tienes|sin un pedido|necesitas un pedido/i))), 'la reseña se abre con la prueba de manejo como verificada');
  // 3 «No vino» en 30 días → cola «Plantones».
  for (const p of [p2, p3]) { const n = await pedir(p, DL, CARRO, { g: grupo(`g.business_id = '${DL}' and g.purpose = 'prueba' and g.item_id is null`), licencia: true }); sql(`update operations set status = 'done', status_detail = 'noshow', done_at = now() where number = '${n}'`); }
  const VN = await pedir(cli, DL, CARRO, { g: grupo(`g.business_id = '${DL}' and g.purpose = 'prueba' and g.item_id is null`), licencia: true });
  await juan.goto(`${B}/panel/${DL}/hoy?det=vis:${VN}`); await clic(juan.getByRole('button', { name: 'Confirmar', exact: true })); await espera(() => st(VN) === 'confirmed');
  sql(`update operations set scheduled_at = now() - interval '30 minutes' where number = '${VN}'`);
  await juan.goto(`${B}/panel/${DL}/hoy?det=vis:${VN}`); await clic(juan.getByRole('button', { name: 'No vino' }));
  ok(await espera(() => st(VN) === 'done:noshow'), '«No vino» (sin multa)');
  ok(sql(`select count(*) from queue_items where queue = 'plantones' and business_id = '${DL}' and status = 'open'`) === '1', '3 «No vino» en 30 días → caso en Colas › Plantones');

  // 9 · Iglesias: catecismo «para mi hijo» (datos cifrados, solo en el panel con auditoría, borrados a los 30 días).
  const IC = await inscFe(cli, FE, CATE, { hijo: { nombre: 'Mateo', edad: 8 }, shot: 'v4ie-catecismo-m.png' });
  ok(sql(`select count(*) from op_private p join operations o on o.id = p.operation_id where o.number = '${IC}' and p.reason = 'nino' and position('Mateo' in encode(p.note_enc, 'escape')) = 0`) === '1', `${IC}: los datos del niño van cifrados`);
  ok(sql(`select (details->>'rubro') = 'fe' and deposit_cents = 0 and pay_mode = 'none' from operations where number = '${IC}'`) === 't', 'Iglesias: $0 y sin forma de pago');
  await luis.goto(`${B}/panel/${FE}/hoy?det=insc:${IC}`); await luis.getByText('Mateo').first().waitFor(); ok(true, 'la parroquia ve el nombre del niño solo en el detalle');
  await luis.screenshot({ path: OUT + 'v4ie-fe-panel-m.png', fullPage: true });
  await clic(luis.getByRole('button', { name: 'Confirmar', exact: true }));
  ok(await espera(() => st(IC) === 'confirmed') && sql(`select count(*) from notifications where ref_id = '${IC}' and tpl = 'insc_fe_ok'`) === '1', 'confirmada con el aviso de la iglesia (insc_fe_ok)');
  sql(`update operations set status = 'cancelled', cancelled_at = now() - interval '31 days' where number = '${IC}'`); barrer();
  ok(await espera(() => sql(`select note_enc is null from op_private p join operations o on o.id = p.operation_id where o.number = '${IC}'`) === 't'), 'a los 30 días los datos del niño se borran');
  // «Pedir fecha» (la bendición de la casa): la fecha deseada y la franja; la oficina propone otra fecha.
  const IF = await inscFe(p2, FE, BENDICION, { fecha: true, shot: 'v4ie-pedir-fecha-m.png' });
  ok(sql(`select (details->>'fecha')::boolean and details->>'franja' = 'manana' from operations where number = '${IF}'`) === 't', `${IF}: «Pedir fecha» con la fecha y la franja`);
  await luis.goto(`${B}/panel/${FE}/hoy?det=insc:${IF}`); await clic(luis.getByRole('button', { name: 'Otra fecha' }));
  await clic(luis.getByRole('button', { name: /^(lun|mar|mié|jue|vie|sáb|dom) \d+ \w+$/ }).nth(2)); await clic(luis.getByRole('button', { name: 'En la tarde', exact: true }));
  ok(await espera(() => st(IF) === 'change_proposed'), 'la oficina propone otra fecha');
  await p2.goto(`${B}/insc/${IF}`); await clic(p2.getByRole('button', { name: 'Aceptar', exact: true }));
  ok(await espera(() => st(IF) === 'confirmed' && sql(`select details->>'franja' from operations where number = '${IF}'`) === 'tarde'), 'acepta la otra fecha → confirmada en la tarde');
  // Consejería: aviso neutro y nota cifrada (nunca en operations).
  const ICS = await inscFe(p3, CONS, CONSEJ, { fecha: true, nota: 'Es por mi matrimonio, mi ITIN 912-70-1234' });
  ok(sql(`select coalesce(customer_note, '') = '' and (details->>'neutro')::boolean from operations where number = '${ICS}'`) === 't', `${ICS}: consejería neutra, sin la nota en la operación`);
  ok(sql(`select count(*) from op_private p join operations o on o.id = p.operation_id where o.number = '${ICS}' and p.reason = 'fe' and position('matrimonio' in encode(p.note_enc, 'escape')) = 0`) === '1', 'la nota de consejería va cifrada');
  sql(`update operations set respond_by = now() - interval '1 minute' where number = '${ICS}'`); barrer();
  ok(await espera(() => sql(`select count(*) from notifications where ref_id = '${ICS}' and tpl = 'insc_fen_exp' and body not like '%Shalom%'`) === '1'), 'su aviso es neutro (insc_fen_exp, sin el lugar)');

  // 10 · Mi cuenta y escritorio.
  await cli.goto(`${B}/cuenta/citas`); ok(!!(await vis(cli.getByText(/VISITA D-\d+/).first())), 'Mi cuenta › Citas y reservas lista las visitas');
  const d = await ctx('5705550122', 1360);
  const gd = grupo(`g.item_id = ${P1} and g.purpose = 'visita'`, 2);
  const d2 = await ctx('5705550288', 1360); // sin visita viva a esa propiedad (si no, la pantalla lleva a la suya)
  await d2.goto(`${B}/n/${INM}/ver?item=${P1}`); await d2.getByText('Antes de enviar').first().waitFor();
  await clic(d2.getByRole('button', { name: diaL(gd.dia), exact: true })); await clic(d2.locator('button[role="radio"]').filter({ hasText: horaL(gd.min) }));
  await d2.screenshot({ path: OUT + 'v4ie-pedir-d.png', fullPage: true });
  await d.goto(`${B}/vis/${V1}`); await d.getByText('CONFIRMADA').first().waitFor(); await d.screenshot({ path: OUT + 'v4ie-conf-d.png', fullPage: true });
  const yd = await ctx('5705550433', 1360); await yd.goto(`${B}/panel/${INM}/vendes/visitas`); await yd.getByText('POR PROPIEDAD · 90 DÍAS').first().waitFor(); await yd.screenshot({ path: OUT + 'v4ie-panel-visitas-d.png', fullPage: true });
  const ad = await ctx('5705550199', 1360); await ad.goto(`${B}/admin/transacciones?tab=vis`); await ad.getByText(/Visita D-|Prueba de manejo D-/).first().waitFor(); await ad.screenshot({ path: OUT + 'v4ie-admin-tx-d.png', fullPage: true });
  ok(true, 'Super Admin › Transacciones › Visitas');
  await ad.goto(`${B}/admin/colas`); await ad.getByText(/Plantones · /).first().waitFor(); ok(true, 'Super Admin › Colas › Plantones');

  // 11 · Ningún pago en todo el flujo.
  ok(pagos() === pagos0 && pagos0 === '0', 'ningún pago ni retención en visitas ni en Iglesias');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  // Limpieza: lo vivo de la prueba no se queda abierto (lo demás queda como historial, nada se borra).
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancel_reason = 'prueba', respond_by = null where kind = 'visit' and status in ('pending', 'change_proposed', 'confirmed')`);
  sql(`update class_groups set seats_booked = 0 where purpose in ('visita', 'prueba')`);
  await b.close(); console.log('OK vis4ie');
})().catch((e) => { console.error(e); process.exit(1); });
