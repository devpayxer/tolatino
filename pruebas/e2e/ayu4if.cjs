// 4if · Reseñas y Ayuda de Iglesias, Bienes Raíces y Autos. «Me cobraron por ver» con foto → directo a «Posible estafa» → la propiedad en
// pausa (la ficha ya no la ofrece) → el admin decide «Sin acción» → la propiedad vuelve. Dealer: «El precio en la puerta fue más» → el dealer
// acepta → la persona confirma «Me lo devolvieron» → cerrada. Iglesias: «Me pidieron dinero por la ayuda» → directo, «Pedir fecha» en pausa →
// el admin sanciona; una reseña de visitante no cuenta como verificada; la reseña de Iglesias no ofrece fotos. Reseña verificada de una visita
// con las preguntas del rubro → «Lo que importa en Bienes Raíces» y «De N visitas y citas por To'Latino en los últimos 12 meses.». Ningún pago ni
// devolución en todo el flujo. Teléfono y escritorio; se resetea solo (pasa al volver a correrlo).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9a · 7d: con El Compa encendido, «Ayuda con …» abre primero su hoja; la razón «Algo no salió bien / no está bien» lleva al formulario de
// siempre (?de=compa). Ir directo a /ayuda?de=compa es «ya pasé por la hoja».
// Con la operación todavía viva la hoja no trae esa razón (Cancelar, Otra hora, Otra cosa): ahí se sigue como «ya pasé por la hoja».
const pasarHoja = async (p) => { await p.waitForLoadState('networkidle'); const r = p.getByText(/^(Algo no está bien|Algo no salió bien)$/); if (await r.count()) { await r.first().click(); await p.waitForURL(/de=compa/); } else if (!/de=compa/.test(p.url())) await p.goto(p.url() + (p.url().includes('?') ? '&' : '?') + 'de=compa'); };
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', FOTO = ENT.rec('fotos') + '/portada.jpg';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { let x; for (let i = 0; i < 48; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const ve = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const diaL = (ymd) => { const d = new Date(`${ymd}T12:00:00Z`); return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MES[d.getUTCMonth()]}`; };
const horaL = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`; };
const INM = 'rentas-hazleton-latino', DL = 'autos-el-cibao', FE = 'parroquia-santa-maria';
// De la semilla, que ninguna otra prueba usa: la propiedad Section 8 de Cedar St, el segundo carro del lote y el bautizo (charlas).
const PROP = sql(`select pl.item_id from property_listings pl join items i on i.id = pl.item_id where pl.business_id = '${INM}' and i.name->>'es' = '1 cuarto · Section 8 · Cedar St' and i.removed_at is null`);
const CARRO = sql(`select v.item_id from vehicle_listings v join items i on i.id = v.item_id where v.business_id = '${DL}' and i.name->>'es' = '2017 Toyota Camry SE' and i.removed_at is null`);
const BAUT = sql(`select id from items where business_id = '${FE}' and module = 'svc' and name->>'es' = 'Bautizo' and removed_at is null order by id limit 1`);
const U1 = "(select id from users where phone = '+15705550299')", U2 = "(select id from users where phone = '+15705550288')", U3 = "(select id from users where phone = '+15705550122')";
const AY = (n, col) => sql(`select ${col} from help_requests h join operations o on o.id = h.operation_id where o.number = '${n}'`);
const st = (num) => sql(`select status || coalesce(':' || status_detail, '') from operations where number = '${num}'`);
const pagos = () => sql(`select count(*) || ':' || coalesce(sum(p.refunded_cents), 0) from payments p join operations o on o.id = p.operation_id where o.kind = 'visit' or (o.kind = 'enrollment' and o.business_id = '${FE}')`);
const grupo = (where) => { const r = sql(`select g.id || '|' || g.starts_on || '|' || g.start_min from class_groups g join cities c on c.id = g.city_id where ${where} and g.status = 'open' and g.seats_total - g.seats_outside - g.seats_booked >= 1 and ((g.starts_on + make_interval(mins => g.start_min)) at time zone c.timezone) > now() + interval '3 hours' order by g.starts_on, g.start_min limit 1`); const [id, dia, min] = r.split('|'); return { id, dia, min: Number(min) }; };
async function pedir(p, neg, item, o = {}) {
  await p.goto(`${B}/n/${neg}/ver?item=${item}`); await p.getByRole('radiogroup').first().waitFor();
  if (o.g) { await clic(p.getByRole('button', { name: diaL(o.g.dia), exact: true })); await clic(p.locator('button[role="radio"]').filter({ hasText: horaL(o.g.min) })); }
  else { const r = await vis(p.locator('button[role="radio"]:not([disabled])')); await r.click(); }
  await clic(p.getByRole('button', { name: 'Continuar' })); await p.getByText('BUENO SABER').first().waitFor();
  if (o.licencia) await clic(p.getByRole('checkbox', { name: /Sí, tengo licencia vigente/ }));
  await clic(p.getByRole('button', { name: 'Enviar solicitud' })); await p.waitForURL(/\/vis\/D-\d+/, { timeout: 15000 });
  return p.url().match(/D-\d+/)[0];
}
// Lo que la prueba pausó o retiró en una corrida anterior vuelve a verse (solo lo suyo, por el motivo que deja la app).
const reset = () => {
  sql(`update items set status = 'live', hidden_reason = null, hidden_by = null where id in (${PROP}, ${CARRO}) and status = 'hidden' and (hidden_reason like 'Pausa por revisión%' or hidden_reason like 'Retirado por To''Latino%')`);
  sql(`update businesses set modules_off = modules_off - 'svc' where id = '${FE}' and (modules_off->'svc'->>'reason' like 'Pausa por revisión%' or modules_off->'svc'->>'reason' like 'Retirado por To''Latino%')`);
  sql(`update help_requests set unpaused_at = now() where paused_at is not null and unpaused_at is null and business_id in ('${INM}', '${DL}', '${FE}')`);
  sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where queue = 'estafa' and status = 'open'`);
};

(async () => {
  require('../lib/negocio-nuevo.cjs').sinTopeDeAyuda('5705550122'); // 9b-1 · el tope de 5 ayudas al día de Marisol (ver lib)
  reset();
  // Re-corrida: el servidor deja 20 fotos privadas por hora por persona; las de corridas anteriores se corren 2 h atrás.
  sql(`update media set created_at = created_at - interval '2 hours' where private and created_at > now() - interval '1 hour' and uploaded_by in (select id from users where phone in ('+15705550122', '+15705550299', '+15705550288'))`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancel_reason = 'prueba', respond_by = null where kind = 'visit' and status in ('pending', 'change_proposed', 'confirmed') and user_id = ${U1}`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', respond_by = null where kind = 'enrollment' and business_id = '${FE}' and status in ('pending', 'change_proposed', 'confirmed') and user_id = ${U2}`);
  sql(`update class_groups g set seats_booked = (select count(*) from operations o where o.kind in ('visit', 'enrollment') and o.status in ('pending', 'change_proposed', 'confirmed') and (o.details->>'group_id' = g.id::text)) where g.item_id in (${PROP}, ${BAUT}) or (g.business_id = '${DL}' and g.purpose = 'prueba')`);
  sql(`update reviews set status = 'removed' where status <> 'removed' and ((user_id = ${U1} and business_id in ('${INM}', '${DL}')) or (user_id in (${U2}, ${U3}) and business_id = '${FE}'))`);
  sql(`select reviews_stats(b) from unnest(array['${INM}', '${DL}', '${FE}']) b`);
  sql(`update help_requests set created_at = created_at - interval '1 day' where user_id in (${U1}, ${U2}) and created_at > now() - interval '1 day'`);
  sql(`update operations set free_quota_month = null where business_id in ('${INM}', '${DL}', '${FE}') and user_id in (${U1}, ${U2}) and free_quota_month is not null`);
  sql(`update property_listings set status = 'available', status_at = now() - interval '30 days' where item_id = ${PROP}`);
  sql(`update vehicle_listings set status = 'lot', status_at = now() - interval '30 days' where item_id = ${CARRO}`);
  barrer();
  const pagos0 = pagos();
  const b = await chromium.launch(); const err = [];
  const ctx = async (tel, d) => { const p = await (await b.newContext(d ?? { ...devices['iPhone 13'] })).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) err.push(m.text()); }); await entrar(p, tel); return p; };
  const D = { viewport: { width: 1360, height: 900 } };
  const y = await ctx('5705550299'), h = await ctx('5705550288'), m = await ctx('5705550122', D);
  const yes = await ctx('5705550433', D), juan = await ctx('5705550444', D), luis = await ctx('5705550422', D), ad = await ctx('5705550199', D);
  const PNAME = sql(`select name->>'es' from items where id = ${PROP}`);

  // ── 1 · Bienes Raíces: «Me cobraron por ver» con foto → directo a «Posible estafa» y la propiedad en pausa ──
  ok(!!PROP && !!CARRO && !!BAUT, `fixtures de la semilla: propiedad ${PROP}, carro ${CARRO}, bautizo ${BAUT}`);
  const V1 = await pedir(y, INM, PROP, { g: grupo(`g.item_id = ${PROP} and g.purpose = 'visita'`) });
  await yes.goto(`${B}/panel/${INM}/hoy?det=vis:${V1}`); await clic(yes.getByRole('button', { name: 'Confirmar', exact: true }));
  ok(await espera(() => st(V1), 'confirmed') === 'confirmed', `${V1}: la agencia confirma`);
  await y.goto(`${B}/vis/${V1}`); await y.getByText('CONFIRMADA').first().waitFor();
  ok(!(await vis(y.getByRole('button', { name: 'Ayuda con la visita' }))), 'antes de la hora no hay Ayuda (todavía no pasó)');
  sql(`update operations set scheduled_at = now() - interval '20 minutes' where number = '${V1}'`); // llegó la hora: está en la puerta
  await y.goto(`${B}/vis/${V1}`); await clic(y.getByRole('button', { name: 'Ayuda con la visita' })); await y.waitForURL(/\/vis\/D-\d+\/ayuda(\?|$)/); await pasarHoja(y);
  const f = y.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f.getByText('¿Qué pasó?').first().waitFor();
  ok((await f.locator('[data-screen-label="Ayuda con la cita · qué pasó"]').getByRole('button').count()) === 5, 'Bienes Raíces: 5 motivos');
  ok(await ve(f.getByText(/Para mudarte, lo que viste: \$/)), 'la cabeza muestra la copia de «Para mudarte» que vio al pedir');
  await clic(f.getByRole('button', { name: 'Me cobraron por ver la propiedad', exact: true }));
  ok(await ve(f.getByText('Fotos · obligatorias')) && await ve(y.getByText(/va directo a To’Latino, con prioridad/)), '«cobraron por ver»: foto obligatoria y aviso de que va directo');
  await (await vis(f.getByLabel('Qué pasó'))).fill('Al llegar la agente me pidió $50 en efectivo para enseñarme el apartamento.');
  await f.locator('input[type="file"]').first().setInputFiles(FOTO); await f.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await clic(f.getByRole('radio', { name: /Que me devuelvan/ })); await (await vis(f.getByLabel('Cuánto'))).fill('50');
  await y.screenshot({ path: OUT + 'h4if-ayuda-ver-m.png', fullPage: true });
  await y.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await y.getByText(/EN REVISIÓN DE TO’LATINO · PRIORIDAD/).first().waitFor();
  ok(AY(V1, "h.reason || '|' || h.wants || '|' || h.amount_cents || '|' || h.status || '|' || h.escalated_by") === 'ver|devolver|5000|escalated|system', 'guardada: ver · devolver $50 · escalada sola (sin esperar 24 h)');
  const HN1 = AY(V1, 'h.number'), Q1 = sql(`select q.id || '|' || q.queue || '|' || q.priority from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id where h.number = '${HN1}' and q.status = 'open'`);
  ok(Q1.split('|')[1] === 'estafa' && Q1.split('|')[2] === 'alta', `en la cola «Posible estafa» con prioridad (${Q1})`);
  ok(sql(`select count(*) from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id where h.number = '${HN1}' and q.queue = 'sop'`) === '0', 'no se duplica en Soporte');
  ok(sql(`select bool_and(m.private) from media m join help_requests h on m.owner_kind = 'help' and m.owner_id = h.id::text where h.number = '${HN1}'`) === 't', 'la foto de la ayuda es privada');
  const pz1 = sql(`select status || '|' || (hidden_reason like 'Pausa por revisión de To''Latino (${HN1})%') from items where id = ${PROP}`);
  ok(pz1 === 'hidden|true', `la propiedad queda en pausa con el motivo (${pz1})`);
  ok(await ve(y.getByText(/el anuncio está en pausa/)), 'la persona ve que el anuncio está en pausa');
  await y.screenshot({ path: OUT + 'h4if-estado-revision-m.png', fullPage: true });
  await m.goto(`${B}/n/${INM}?tab=svc`); await m.waitForLoadState('networkidle');
  ok(!(await m.content()).includes(PNAME), 'la ficha pública ya no ofrece la propiedad');
  ok(sql(`select count(*) from notifications n where n.ref_id = '${HN1}' and n.tpl = 'biz_help_pausa'`) !== '0' && sql(`select count(*) from notifications n where n.ref_id = '${HN1}' and n.tpl = 'help_directo'`) !== '0', 'avisos: al negocio la pausa, a la persona que lo revisa To\'Latino');
  await yes.goto(`${B}/panel/${INM}/hoy?det=vis:${V1}`); ok(await ve(yes.getByText(/Fue directo a To’Latino \(posible estafa\)/)), 'el panel de la agencia: fue directo a To\'Latino');
  await yes.screenshot({ path: OUT + 'h4if-panel-visita-d.png', fullPage: true });

  // Super Admin › Colas › Posible estafa → «Sin acción · se ve otra vez»
  const QID1 = Q1.split('|')[0];
  await ad.goto(B + '/admin/colas'); ok(await ve(ad.getByText(/Posible estafa · /).first()), 'Colas: «Posible estafa» en la lista');
  await ad.goto(B + `/admin/colas?cola=estafa&caso=${QID1}`); await ad.getByText('EN PAUSA').first().waitFor();
  ok(await ve(ad.getByText(/Le cobraron por ver la propiedad/).first()) && await ve(ad.getByText(/Para mudarse \$/).first()), 'el caso: el motivo, lo pausado y lo que vio al pedir');
  ok(!(await vis(ad.getByRole('button', { name: 'Resolver y devolver' }))), 'el caso no ofrece devolver dinero');
  await ad.screenshot({ path: OUT + 'h4if-admin-estafa-d.png', fullPage: true });
  await clic(ad.getByRole('button', { name: 'Sin acción · se ve otra vez' }));
  await clic(ad.getByText('Hablamos con el negocio y lo corrigió; te devolvió lo cobrado.'));
  await clic(ad.getByRole('button', { name: 'Cerrar sin acción' }));
  ok(await ve(ad.getByText(/Sin acción: el anuncio se ve otra vez/).first()), 'decidido: sin acción');
  ok(sql(`select status || '|' || coalesce(hidden_reason, '') from items where id = ${PROP}`) === 'live|', 'la propiedad vuelve a verse');
  ok(AY(V1, "h.status || '|' || h.closed_by || '|' || (h.unpaused_at is not null)") === 'resolved|admin|true', 'la solicitud se resuelve (To\'Latino) y la pausa se levanta');
  ok(sql(`select decision from queue_items where id = ${QID1}`) === 'sin_accion', 'el caso queda decidido «sin acción»');
  ok(sql(`select count(*) from audit_entries where action in ('ayuda.estafa.pausar', 'ayuda.estafa.reanudar', 'estafa.sin_accion') and (after::text like '%${HN1}%' or before::text like '%${HN1}%')`) === '3', 'pausa, reanudación y decisión en la auditoría');
  await m.goto(`${B}/n/${INM}?tab=svc`); await m.waitForLoadState('networkidle'); ok((await m.content()).includes(PNAME), 'la ficha vuelve a ofrecer la propiedad');
  await y.goto(`${B}/vis/${V1}/ayuda?de=compa`); ok(await ve(y.getByText('RESPUESTA DE TO’LATINO')), 'la persona ve la respuesta de To\'Latino');

  // ── 2 · Reseña verificada de la visita (pasó a las 24 h) con las preguntas de Bienes Raíces ──
  sql(`update operations set scheduled_at = now() - interval '25 hours' where number = '${V1}'`); barrer();
  ok(await espera(() => st(V1), 'done:sin_marcar') === 'done:sin_marcar', 'el barrido la da por pasada');
  await y.goto(`${B}/n/${INM}/resena?pedido=${V1}&e=4`);
  ok(await ve(y.getByText('TU VISITA · DATO DE LA VISITA')) && await ve(y.getByText('¿LO QUE PIDEN PARA MUDARTE ERA LO QUE VISTE?')) && await ve(y.getByText('LO QUE IMPORTA EN BIENES RAÍCES')), 'reseña: dato de la visita y preguntas de Bienes Raíces');
  await clic(y.locator('div').filter({ hasText: /^¿LO QUE PIDEN PARA MUDARTE ERA LO QUE VISTE\?/ }).getByText('Sí', { exact: true }));
  await clic(y.locator('div').filter({ hasText: /^¿VER LA PROPIEDAD FUE GRATIS\?/ }).getByText('Me cobraron', { exact: true }));
  await clic(y.locator('div').filter({ hasText: /^¿LLEGARON A LA HORA\?/ }).getByText('Sí', { exact: true }));
  await (await vis(y.getByLabel('Tu reseña'))).fill('El apartamento es como en las fotos, pero al llegar me pidieron dinero por verlo.');
  await y.screenshot({ path: OUT + 'h4if-resena-visita-m.png', fullPage: true });
  await clic(y.getByRole('button', { name: /^Publicar/ })); await y.waitForURL((u) => !/\/resena\?/.test(u.toString())).catch(() => {});
  ok(await espera(() => sql(`select r.src || '|' || (answers->>'mudarOk') || '|' || (answers->>'verGratis') || '|' || (answers->>'llegaron') || '|' || (facts->>'que') || '|' || ((facts->>'tot') is not null) from reviews r join operations o on o.id = r.operation_id where o.number = '${V1}' and r.status = 'visible'`), 'cita|1|0|a|visita|true') === 'cita|1|0|a|visita|true', 'reseña verificada con sus respuestas y la copia del total en el dato');
  await y.goto(`${B}/n/${INM}?tab=rev`);
  ok(await ve(y.getByText('LO QUE IMPORTA EN BIENES RAÍCES').first()) && await ve(y.getByText(/De \d+ visitas y citas por To'Latino en los últimos 12 meses\./).first()), 'ficha: «Lo que importa en Bienes Raíces» y la línea de 12 meses');
  ok(await ve(y.getByText('VER FUE GRATIS').first()), 'el rótulo sale de la pregunta que se hizo');
  await y.screenshot({ path: OUT + 'h4if-ficha-lo-que-importa-m.png', fullPage: true });

  // ── 3 · Dealer: «El precio en la puerta fue más» → el dealer acepta → «Me lo devolvieron» ──
  const yd = await ctx('5705550299', D);
  const V2 = await pedir(y, DL, CARRO, { g: grupo(`g.business_id = '${DL}' and g.purpose = 'prueba' and g.item_id is null`), licencia: true });
  await juan.goto(`${B}/panel/${DL}/hoy?det=vis:${V2}`); await clic(juan.getByRole('button', { name: 'Confirmar', exact: true }));
  ok(await espera(() => st(V2), 'confirmed') === 'confirmed', `${V2}: el dealer confirma la prueba`);
  sql(`update operations set scheduled_at = now() - interval '2 hours' where number = '${V2}'`);
  await juan.goto(`${B}/panel/${DL}/hoy?det=vis:${V2}`); await clic(juan.getByRole('button', { name: 'Pasó', exact: true }));
  ok(await espera(() => st(V2), 'done') === 'done', 'el dealer marca «Pasó»');
  await yd.goto(`${B}/vis/${V2}`); await clic(yd.getByRole('button', { name: 'Ayuda con el dealer' })); await yd.waitForURL(/\/ayuda(\?|$)/); await pasarHoja(yd);
  const g = yd.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await g.getByText('¿Qué pasó?').first().waitFor();
  ok(await ve(g.getByText(/En la puerta, lo que viste: \$/)), 'la cabeza muestra el total en la puerta que vio al pedir');
  await clic(g.getByRole('button', { name: 'El precio en la puerta fue más', exact: true })); ok(await ve(g.getByText('Fotos · obligatorias')), 'precio: foto obligatoria');
  ok(!(await vis(yd.getByText(/va directo a To’Latino, con prioridad/))), 'el precio espera al dealer (no es directo)');
  await (await vis(g.getByLabel('Qué pasó'))).fill('En la oficina el total fue $800 más que el precio en la puerta de la app.');
  await g.locator('input[type="file"]').first().setInputFiles(FOTO); await g.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  ok(await ve(g.getByRole('radio', { name: /Que lo arreglen antes de firmar/ })), 'qué quieres: arreglarlo antes de firmar (Autos)');
  await clic(g.getByRole('radio', { name: /Que me devuelvan/ })); await (await vis(g.getByLabel('Cuánto'))).fill('800');
  await yd.screenshot({ path: OUT + 'h4if-ayuda-dealer-d.png', fullPage: true });
  await clic(g.getByRole('button', { name: 'Enviar solicitud' }));
  await yd.getByText('PENDIENTE').first().waitFor();
  ok(AY(V2, "h.reason || '|' || h.wants || '|' || h.status") === 'precio|devolver|open', 'guardada: precio · devolver · abierta (espera al dealer)');
  const HN2 = AY(V2, 'h.number');
  ok(sql(`select count(*) from notifications where ref_id = '${HN2}' and tpl = 'biz_vis_help'`) !== '0', 'al dealer le llega «Un cliente pide ayuda con una visita»');
  await juan.goto(`${B}/panel/${DL}/hoy`); ok(await ve(juan.getByText(new RegExp(`Prueba o cita #${V2}`)).first()), 'panel Hoy: «Ayuda que espera tu respuesta» con el número D-');
  await juan.screenshot({ path: OUT + 'h4if-panel-hoy-d.png', fullPage: true });
  await juan.goto(`${B}/panel/${DL}/hoy?det=vis:${V2}`); const det = juan.locator('[data-screen-label="Panel v2 · detalle"]');
  ok(await ve(det.getByText('El precio en la puerta fue más').first()), 'panel: el motivo con su nombre');
  await clic(det.getByText('Tiene razón', { exact: true }));
  ok(await ve(det.getByText(/Nada se cobró en To'Latino\. Si aceptas devolver, lo devuelves tú directamente/).first()), 'panel: nada vuelve a una tarjeta; se devuelve directo');
  await (await vis(det.locator('textarea'))).fill('Tienes razón: el cargo extra no iba. Te devolvemos los $800 en la oficina.');
  await clic(det.getByRole('button', { name: 'Enviar respuesta' }));
  ok(await espera(() => AY(V2, "h.status || '|' || h.decision || '|' || h.outside_refund"), 'answered|ok|pending') === 'answered|ok|pending', 'el dealer acepta: «Me lo devolvieron» queda pendiente');
  await juan.screenshot({ path: OUT + 'h4if-panel-ayuda-d.png', fullPage: true });
  await yd.goto(`${B}/vis/${V2}/ayuda?de=compa`); await yd.getByText('ACEPTÓ').first().waitFor();
  ok(await ve(yd.getByText(/no pasó por la app/).first()), 'la persona: se lo devuelve el dealer, fuera de la app');
  await yd.screenshot({ path: OUT + 'h4if-me-lo-devolvieron-d.png', fullPage: true });
  await clic(yd.getByRole('button', { name: 'Me lo devolvieron' }));
  ok(await espera(() => AY(V2, "h.status || '|' || h.closed_by || '|' || h.outside_refund || '|' || h.refunded_cents"), 'resolved|user|confirmed|0') === 'resolved|user|confirmed|0', '«Me lo devolvieron»: cerrada por la persona, nada devuelto por la app');
  ok(sql(`select count(*) from notifications where ref_id = '${HN2}' and tpl = 'biz_help_devuelto'`) !== '0', 'al dealer le llega la confirmación');

  // ── 4 · Iglesias: reseña de visitante (no cuenta como verificada) · «Me pidieron dinero por la ayuda» → directo, «Pedir fecha» en pausa → sanción ──
  await m.goto(`${B}/n/${FE}/resena`); ok(await ve(m.getByText('¿LA AYUDA FUE GRATIS?')), 'reseña de Iglesias: sus preguntas');
  ok(!(await vis(m.getByText('FOTOS · OPCIONAL'))) && await ve(m.getByText(/Las reseñas de iglesias no llevan fotos/)), 'la reseña de Iglesias no ofrece fotos');
  ok(!(await vis(m.getByRole('radio', { name: /Tu lugar/ }))), 'sin fecha por To\'Latino solo cabe «visitante»');
  await clic(m.getByRole('button', { name: '5 ★', exact: true }));
  await clic(m.locator('div').filter({ hasText: /^¿HABÍA SERVICIO EN ESPAÑOL\?/ }).getByText('Sí', { exact: true }));
  await (await vis(m.getByLabel('Tu reseña'))).fill('Voy a la misa en español de los domingos; nos reciben con mucho cariño.');
  await m.screenshot({ path: OUT + 'h4if-resena-iglesia-d.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Publicar reseña', exact: true })); await m.waitForURL((u) => !/\/resena/.test(u.toString()), { timeout: 8000 }).catch(async () => console.log('    (sigue en la reseña:', await m.locator('[role="alert"]').allInnerTexts(), ')'));
  ok(await espera(() => sql(`select src || '|' || (answers->>'espanol') from reviews where business_id = '${FE}' and user_id = ${U3} and status = 'visible'`), 'vis|1') === 'vis|1', 'reseña de visitante guardada');
  ok(sql(`select count(*) from reviews where business_id = '${FE}' and status = 'visible' and src <> 'vis'`) === '0', 'no cuenta como verificada');
  await m.goto(`${B}/n/${FE}?tab=rev`); ok(await ve(m.getByText('Voy a la misa en español de los domingos', { exact: false })), 'la reseña de visitante se ve en la ficha');
  await m.screenshot({ path: OUT + 'h4if-iglesia-resenas-d.png', fullPage: true });
  ok(!(await vis(m.getByText(/VERIFICADAS POR FECHA O CATECISMO/))) && !(await vis(m.getByText('VERIFICADA', { exact: true }))), 'ficha: sin conteo ni sello de verificada');
  const I1 = await (async () => {
    await h.goto(`${B}/n/${FE}/inscribirme?svc=${BAUT}`); await h.getByText(/^(¿PARA QUIÉN ES\?|NOTA · OPCIONAL)$/).first().waitFor();
    await clic(h.getByRole('button', { name: 'Continuar' }));
    if (!(await vis(h.locator('button[role="radio"][aria-checked="true"]')))) { const r = await vis(h.locator('button[role="radio"]:not([disabled])')); if (r) await r.click(); }
    await clic(h.getByRole('button', { name: 'Continuar' })); await h.getByText('BUENO SABER').first().waitFor();
    await clic(h.getByRole('button', { name: 'Enviar solicitud' })); await h.waitForURL(/\/insc\/I-\d+/, { timeout: 15000 });
    return h.url().match(/I-\d+/)[0];
  })();
  await luis.goto(`${B}/panel/${FE}/hoy?det=insc:${I1}`); await clic(luis.getByRole('button', { name: 'Confirmar', exact: true }));
  await espera(() => sql(`select status from operations where number = '${I1}'`), 'confirmed');
  sql(`update operations set status = 'done', done_at = now() where number = '${I1}'`); // la charla ya pasó
  await h.goto(`${B}/insc/${I1}`); await clic(h.getByRole('button', { name: 'Ayuda con la iglesia' })); await h.waitForURL(/\/insc\/I-\d+\/ayuda(\?|$)/); await pasarHoja(h);
  const k = h.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await k.getByText('¿Qué pasó?').first().waitFor();
  await clic(k.getByRole('button', { name: 'Me pidieron dinero por la ayuda', exact: true }));
  ok(await ve(h.getByText(/«Pedir fecha» de este lugar queda en pausa/).first()), 'Iglesias: va directo y avisa la pausa de «Pedir fecha»');
  await (await vis(k.getByLabel('Qué pasó'))).fill('Para darme la fecha del bautizo me pidieron $40 que no decía en ningún lado.');
  await k.locator('input[type="file"]').first().setInputFiles(FOTO); await k.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  ok(await ve(k.getByRole('radio', { name: /Que me llamen/ })), 'qué quieres: que me llamen (Iglesias)');
  await h.screenshot({ path: OUT + 'h4if-ayuda-iglesia-m.png', fullPage: true });
  await h.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await h.getByText(/EN REVISIÓN DE TO’LATINO · PRIORIDAD/).first().waitFor();
  const HN3 = AY(I1, 'h.number'), Q3 = sql(`select q.id || '|' || q.queue from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id where h.number = '${HN3}' and q.status = 'open'`);
  ok(Q3.split('|')[1] === 'estafa', 'a «Posible estafa»');
  ok(sql(`select modules_off->'svc'->>'reason' like 'Pausa por revisión%' from businesses where id = '${FE}'`) === 't', '«Pedir fecha» de la parroquia en pausa');
  ok(sql(`select count(*) from notifications where ref_id = '${HN3}' and user_id = ${U2} and (body::text ilike '%Santa%' or body::text ilike '%parroquia%' or body::text ilike '%bautizo%')`) === '0', 'los avisos a la persona son neutros (sin el lugar ni el servicio)');
  await ad.goto(B + `/admin/colas?cola=estafa&caso=${Q3.split('|')[0]}`); await ad.getByText('EN PAUSA').first().waitFor();
  ok(await ve(ad.getByText(/Le pidieron dinero por la ayuda/).first()), 'el caso de Iglesias con su motivo');
  await clic(ad.getByRole('button', { name: 'Sancionar' }));
  await clic(ad.getByText(/La ayuda de la iglesia es gratis\. Revisamos lo que nos mandaste/));
  await clic(ad.getByRole('button', { name: 'Sancionar', exact: true }).last());
  ok(await ve(ad.getByText(/Sancionado: el anuncio queda fuera/).first()), 'decidido: sanción');
  ok(sql(`select modules_off->'svc'->>'reason' like 'Retirado por To''Latino (${HN3})%' from businesses where id = '${FE}'`) === 't', 'sancionado: «Pedir fecha» queda fuera con el motivo de To\'Latino');
  ok(sql(`select count(*) from sanctions where target_kind = 'business' and target_id = '${FE}' and kind = 'adv' and reason like '%${HN3}%'`) === '1', 'una advertencia al negocio (sanctions)');
  ok(AY(I1, "h.status || '|' || h.closed_by") === 'resolved|admin', 'la solicitud se resuelve');
  ok(sql(`select count(*) from notifications where ref_id = '${HN3}' and tpl = 'fe_help_done'`) !== '0', 'a la persona: «resuelta» neutro');

  // ── 5 · Nada de dinero ──
  ok(pagos() === pagos0, `ningún pago ni devolución en todo el flujo (${pagos0})`);
  ok(sql(`select count(*) from help_requests where number in ('${HN1}', '${HN2}', '${HN3}') and refunded_cents <> 0`) === '0', 'ninguna ayuda con «devuelto por la app»');

  reset(); // la parroquia vuelve a recibir fechas (lo que esta prueba retiró)
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK ayu4if');
})().catch((e) => { console.error(e); try { reset(); } catch {} process.exit(1); });
