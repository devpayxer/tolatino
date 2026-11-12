// 4nd · Noche: reseña verificada (lista con entrada; preguntas de noche, dato de la reserva, ≤2★ → Ayuda), «Lo que importa de noche»
// en la ficha, Ayuda con la noche («Cobraron más cover» pide foto; «No me descontaron el depósito» → el local propone → aceptar = se
// devuelve exacto por Stripe; «Me sentí inseguro» va directo a To'Latino con prioridad) y el bloque de ayuda en el panel.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9a · 7d: con El Compa encendido, «Ayuda con …» abre primero su hoja; la razón «Algo no salió bien / no está bien» lleva al formulario de
// siempre (?de=compa). Ir directo a /ayuda?de=compa es «ya pasé por la hoja».
// Con la operación todavía viva la hoja no trae esa razón (Cancelar, Otra hora, Otra cosa): ahí se sigue como «ya pasé por la hoja».
const pasarHoja = async (p) => { await p.waitForLoadState('networkidle'); const r = p.getByText(/^(Algo no está bien|Algo no salió bien)$/); if (await r.count()) { await r.first().click(); await p.waitForURL(/de=compa/); } else if (!/de=compa/.test(p.url())) await p.goto(p.url() + (p.url().includes('?') ? '&' : '?') + 'de=compa'); };
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', NEG = 'la-terraza-night', FOTO = ENT.rec('fotos') + '/portada.jpg';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const MARISOL = "(select id from users where phone = '+15705550122')";
const AY = (n, col) => sql(`select ${col} from help_requests h join operations o on o.id = h.operation_id where o.number = '${n}'`);
(async () => {
  require('../lib/negocio-nuevo.cjs').sinTopeDeAyuda('5705550122'); // 9b-1 · el tope de 5 ayudas al día de Marisol (ver lib)
  // Tres noches de Marisol en La Terraza (de la prueba 4nc): una lista que entró, una mesa con depósito cobrado y otra para «inseguro».
  // 9b-1 · Las tres noches las hace noc4c: si en esta base no están (base nueva, otro orden, o noc4c falló), se corre noc4c antes.
  const { requiere } = require('../lib/requiere.cjs');
  requiere('noc4c', () => sql(`select (select count(*) from operations where user_id = ${MARISOL} and business_id = '${NEG}' and kind = 'night' and details->>'k' = 'lista' and status = 'done' and status_detail = 'entro') > 0 and (select count(*) from operations where user_id = ${MARISOL} and business_id = '${NEG}' and kind = 'night' and status = 'cancelled' and cancelled_by = 'business') > 0`) === 't' ? 'si' : '', { que: 'las noches de noc4c' });
  const L = sql(`select number from operations where user_id = ${MARISOL} and business_id = '${NEG}' and kind = 'night' and details->>'k' = 'lista' and status = 'done' and status_detail = 'entro' order by id desc limit 1`);
  const M = sql(`select o.number from operations o join payments p on p.operation_id = o.id and p.kind = 'deposit' and p.status = 'captured' where o.user_id = ${MARISOL} and o.business_id = '${NEG}' and o.kind = 'night' and o.status = 'done' order by o.id desc limit 1`);
  const I = sql(`select number from operations where user_id = ${MARISOL} and business_id = '${NEG}' and kind = 'night' and status = 'cancelled' and cancelled_by = 'business' order by id desc limit 1`);
  ok(!!L && !!M && !!I, `noches de prueba: lista ${L}, mesa ${M}, otra ${I}`);
  sql(`update operations set status = 'done', status_detail = 'entro', done_at = now() - interval '1 hour' where number = '${I}'`);
  sql(`update operations set done_at = now() - interval '1 hour' where number in ('${L}', '${M}')`);
  sql(`delete from queue_items where subject_kind = 'help_request' and subject_id in (select h.id::text from help_requests h join operations o on o.id = h.operation_id where o.number in ('${L}', '${M}', '${I}'))`);
  sql(`delete from help_requests where operation_id in (select id from operations where number in ('${L}', '${M}', '${I}'))`);
  sql(`update help_requests set created_at = created_at - interval '1 day' where user_id = ${MARISOL} and created_at > now() - interval '1 day'`);
  sql(`update reviews set status = 'removed' where business_id = '${NEG}' and user_id = ${MARISOL} and status <> 'removed'`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122'); m.on('pageerror', (e) => err.push(e.message));

  // ── Reseña verificada ──
  await m.goto(`${B}/noche/${L}`); await m.getByText('BUENA NOCHE').first().waitFor();
  await clic(m.getByRole('button', { name: 'Calificar' })); await m.waitForURL(/\/resena/);
  await m.getByText('TU NOCHE · DATO DE LA RESERVA').first().waitFor();
  ok(!!(await vis(m.getByText(`Noche ${L} · lista o mesa`))), 'la verificada dice la noche');
  ok(!!(await vis(m.getByText('Fui sin reservar · Pagué en la puerta'))), 'visitante: «Fui sin reservar · Pagué en la puerta»');
  ok(!!(await vis(m.getByText('PAGASTE EN LA APP'))) && !!(await vis(m.getByText('PERSONAS'))), 'dato de la reserva: personas y lo pagado en la app');
  await clic(m.getByRole('radio', { name: /2 estrellas|2 stars/ }).or(m.getByRole('button', { name: /^2$/ })).first()).catch(async () => { await m.locator('[aria-label*="2"]').first().click(); });
  for (const t of ['¿COBRARON EL COVER PUBLICADO?', '¿LA FILA FUE LA QUE DECÍA?', '¿REGLAS CLARAS?', '¿TE SENTISTE SEGURO?', '¿LA MÚSICA FUE LA ANUNCIADA?', 'TRATO EN LA PUERTA']) ok(!!(await vis(m.getByText(t))), t);
  const grupo = async (t, o) => clic(m.getByText(t).locator('xpath=ancestor::div[1]/following-sibling::*[1]').getByText(o, { exact: true }).or(m.locator(`[aria-label="${t}"]`).getByText(o, { exact: true })));
  await grupo('¿COBRARON EL COVER PUBLICADO?', 'Cobraron más').catch(async () => { await clic(m.getByText('Cobraron más', { exact: true })); });
  await grupo('¿LA FILA FUE LA QUE DECÍA?', 'Mucho más').catch(async () => { await clic(m.getByText('Mucho más', { exact: true })); });
  await (await vis(m.locator('textarea'))).fill('Decía cover de diez dólares y en la puerta cobraron quince a las diez y media.');
  ok(!!(await vis(m.getByText(/pídelo en Ayuda con la noche/))), '≤2★: la reseña no devuelve dinero, ve a Ayuda con la noche');
  await m.screenshot({ path: OUT + 'n4d-resena-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: /^Publicar/ }));
  ok(await espera(() => sql(`select src || '|' || (answers->>'coverOk') || '|' || (answers->>'filaOk') || '|' || (facts->>'pax') from reviews where business_id = '${NEG}' and user_id = ${MARISOL} and status = 'visible'`), 'cita|0|c|3') === 'cita|0|c|3', 'reseña verificada con sus respuestas y el dato de la reserva');
  await m.goto(`${B}/n/${NEG}?tab=rev`); await m.waitForLoadState('networkidle');
  ok(!!(await vis(m.getByText('LO QUE IMPORTA DE NOCHE').first())), 'la ficha: «Lo que importa de noche»');
  ok(!!(await vis(m.getByText('Cobraron más cover').first())), 'la tarjeta de la reseña: «Cobraron más cover»');

  // ── Ayuda: cobraron más cover (foto obligatoria) ──
  await m.goto(`${B}/noche/${L}/ayuda?de=compa`);
  const f = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f.getByText('¿Qué pasó?').first().waitFor();
  ok(!!(await vis(f.getByText('Ayuda con la noche').first())), 'título «Ayuda con la noche»');
  ok((await f.locator('[data-screen-label="Ayuda con la cita · qué pasó"]').getByRole('button').count()) === 8, 'noche: 8 motivos');
  await clic(f.getByText('Cobraron más cover', { exact: true })); ok(!!(await vis(f.getByText('Fotos · obligatorias'))), 'cobraron más cover: foto obligatoria');
  await (await vis(f.getByLabel('Qué pasó'))).fill('Decía $10 y en la puerta cobraron $15 a las 10:40.');
  await f.locator('input[type="file"]').first().setInputFiles(FOTO); await f.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await clic(f.getByRole('radio', { name: /Que me devuelvan/ }));
  await m.screenshot({ path: OUT + 'n4d-ayuda-m.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.getByText('PENDIENTE').first().waitFor();
  ok(AY(L, "h.reason || '|' || h.wants || '|' || h.status") === 'cover|devolver|open', 'guardada: cover · devolver · abierta');
  ok(sql(`select bool_and(m.private) from media m join help_requests h on m.owner_kind = 'help' and m.owner_id = h.id::text join operations o on o.id = h.operation_id where o.number = '${L}'`) !== '', 'la foto del recibo quedó en la ayuda');

  // ── Ayuda: no me descontaron el depósito → el local propone $50 → aceptar = devolución exacta ──
  const DEV0 = Number(sql(`select p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${M}' and p.kind = 'deposit'`));
  await m.goto(`${B}/noche/${M}/ayuda?de=compa`); await f.getByText('¿Qué pasó?').first().waitFor();
  await clic(f.getByText('No me descontaron el depósito', { exact: true }));
  await (await vis(f.getByLabel('Qué pasó'))).fill('Pagué la cuenta completa y no me descontaron los $50 del depósito.');
  await f.locator('input[type="file"]').first().setInputFiles(FOTO); await f.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.getByText('PENDIENTE').first().waitFor();
  const t = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(t, '5705550366'); t.on('pageerror', (e) => err.push(e.message));
  const det = t.locator('[data-screen-label="Panel v2 · detalle"]');
  await t.goto(`${B}/panel/${NEG}/hoy?det=noche:${M}`); await det.getByText(/AYUDA CON LA CITA · H-|AYUDA · H-/).first().waitFor().catch(() => {});
  ok(!!(await vis(det.getByText('No le descontaron el depósito').first())), 'panel: el motivo con su nombre de Noche');
  await clic(det.getByText('Proponer otra cosa', { exact: true }));
  await (await vis(det.getByPlaceholder(/\d+(\.\d{2})?/))).fill('50');
  await (await vis(det.locator('textarea'))).fill('Tienes razón: te devolvemos los $50 del depósito.');
  await t.screenshot({ path: OUT + 'n4d-panel-ayuda-d.png', fullPage: true });
  await clic(det.getByRole('button', { name: 'Enviar respuesta' }));
  ok(await espera(() => AY(M, "h.status || '|' || h.decision || '|' || h.offer_cents"), 'answered|alt|5000') === 'answered|alt|5000', 'el local propone $50');
  await m.goto(`${B}/noche/${M}/ayuda?de=compa`); await m.getByText('TE PROPONEN UN CAMBIO').first().waitFor();
  await clic(m.getByRole('button', { name: 'Aceptar $50' }));
  ok(await espera(() => sql(`select (p.refunded_cents - ${DEV0})::text || '|' || p.status from payments p join operations o on o.id = p.operation_id where o.number = '${M}' and p.kind = 'deposit'`), '5000|refunded') === '5000|refunded', 'aceptó: el depósito de $50 devuelto exacto por Stripe');

  // ── Ayuda: me sentí inseguro → directo a To'Latino ──
  await m.goto(`${B}/noche/${I}/ayuda?de=compa`); await f.getByText('¿Qué pasó?').first().waitFor();
  await clic(f.getByRole('button', { name: 'Me sentí inseguro', exact: true }));
  ok(!!(await vis(f.getByText(/llama al 911 primero/))), 'el 911 primero');
  await (await vis(f.getByLabel('Qué pasó'))).fill('Hubo una pelea en la puerta y nadie de seguridad hizo nada.');
  await clic(f.getByRole('radio', { name: /Solo quiero avisar/ }));
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.waitForTimeout(1500);
  ok(AY(I, "h.reason || '|' || h.status || '|' || h.escalated_by") === 'inseguro|escalated|system', 'inseguro: escalada sola, sin esperar al local');
  ok(sql(`select priority from queue_items q join help_requests h on q.subject_kind = 'help_request' and h.id::text = q.subject_id where q.subject_kind = 'help_request' and h.operation_id = (select id from operations where number = '${I}')`) === 'alta', "en la cola de To'Latino con prioridad alta");
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK noc4d');
})().catch((e) => { console.error(e); process.exit(1); });
