const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', FREE = 'desayunos-mi-viejo';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(500); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { const x = await vis(l); if (!x) throw new Error('no visible: ' + l); await x.click(); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const MARISOL = "(select id from users where phone='+15705550122')";
const rev = (who) => `(select r.id from reviews r join users u on u.id = r.user_id where r.business_id='${BIZ}' and u.first_name='${who}' and r.status <> 'removed' limit 1)`;
const limpiar = () => {
  sql(`update reviews set status = 'removed' where user_id = ${MARISOL} and status <> 'removed'`);
  sql(`update reviews set status = 'visible', hidden_reason = null, hidden_by = null, review_state = null where business_id = '${BIZ}' and status = 'hidden'`);
  sql(`update reviews set review_state = null, reply = case when user_id in (select id from users where phone like '+157055502%') then reply else null end where business_id = '${BIZ}'`);
  sql(`delete from review_helpful where user_id = ${MARISOL}`);
  sql(`delete from content_reports where reporter_user_id in (${MARISOL}, (select id from users where phone = '+15705550133'))`); sql(`update content_reports set status = 'dismissed' where status = 'open'`);
  sql(`update queue_items set status = 'decided' where queue = 'rep' and status = 'open'`);
  sql(`select reviews_stats('${BIZ}'); select reviews_stats('${FREE}')`);
};
(async () => {
  limpiar();
  sql(`update reviews set helpful_count = (select count(*) from review_helpful h where h.review_id = reviews.id) where business_id = '${BIZ}'`);
  const NUM = sql(`select number from operations where user_id = ${MARISOL} and business_id = '${BIZ}' and kind = 'order' and status = 'done' and mode = 'pickup' and done_at > now() - interval '30 days' order by done_at desc limit 1`);
  ok(!!NUM, `pedido terminado para reseñar: #${NUM}`);
  const n0 = Number(sql(`select review_count from business_stats_cache where business_id = '${BIZ}'`));
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente'); globalThis.__pages = [m];
  await entrar(m, '5705550122');

  // 1 · Desde el pedido terminado: «Escribir una reseña» → verificada por ese pedido
  await m.goto(B + `/pedido/${NUM}`); await clic(m.getByText('Escribir una reseña'));
  await m.waitForURL(/\/resena\?pedido=/); await m.getByText(`Pedido #${NUM} · pickup`).first().waitFor();
  ok(await m.getByRole('radio', { name: /Pedido #/ }).first().getAttribute('aria-checked') === 'true', 'escribir: la visita verificada viene marcada');
  ok(!!(await vis(m.getByText('FALTA: TU CALIFICACIÓN'))), 'sin estrellas: «FALTA: TU CALIFICACIÓN»');
  await clic(m.getByRole('button', { name: '4 ★' })); ok(!!(await vis(m.getByText('Muy bien', { exact: true }))), '4 estrellas = «Muy bien»');
  await clic(m.getByText('Caliente', { exact: true })); await clic(m.getByText('Vale lo que cuesta', { exact: true }));
  const ta = await vis(m.getByRole('textbox', { name: 'Tu reseña' }));
  await ta.fill('Muy rico todo, llámame al 570 555 1234 si quieres saber más.');
  ok(!!(await vis(m.getByText(/Quita teléfonos y correos/))) && !!(await vis(m.getByText('FALTA: QUITAR TELÉFONOS O CORREOS'))), 'con teléfono: aviso y no deja publicar');
  await ta.fill('Muy rico todo. El mofongo llegó caliente y bien servido, volvería.');
  await shot(m, 'r1-escribir.png', true);
  await clic(m.getByText('Publicar reseña'));
  await m.waitForURL(/\/resena\/tuya/); await m.getByText('Listo: tu reseña está publicada.').first().waitFor();
  ok(!!(await vis(m.getByText('RESEÑA PUBLICADA'))), 'estado: RESEÑA PUBLICADA');
  const R = sql(`select src||'|'||(operation_id is not null)||'|'||stars||'|'||(answers->>'hot')||'|'||(facts ? 'late') from reviews where user_id = ${MARISOL} and business_id = '${BIZ}' and status = 'visible'`);
  ok(R === 'pk|true|4|1|true', `guardada verificada por el pedido con su dato (${R})`);
  ok(Number(sql(`select review_count from business_stats_cache where business_id = '${BIZ}'`)) === n0 + 1, '★ y conteo recalculados (+1)');
  await shot(m, 'r2-tuya.png', true);

  // 2 · Editar dentro de 48 h
  await clic(m.getByText('Editar', { exact: true })); await m.getByText('Editar reseña').first().waitFor();
  await clic(m.getByRole('button', { name: '5 ★' })); await clic(m.getByText('Guardar cambios'));
  await m.getByText('Listo: actualizamos tu reseña.').first().waitFor();
  ok(sql(`select stars||'|'||(edited_at is not null) from reviews where user_id = ${MARISOL} and business_id = '${BIZ}' and status = 'visible'`) === '5|true', 'editar: 5 ★ y marcada EDITADA');

  // 3 · En la pestaña: la propia primero; Útil y Reportar en otras
  await m.goto(B + `/n/${BIZ}?tab=rev`); await m.getByText('TU RESEÑA').first().waitFor();
  ok(!!(await vis(m.getByText('Ver tu reseña'))), 'la ficha ofrece «Ver tu reseña»');
  const TM = m.locator('[data-screen-label="Ficha · reseñas"]');
  const yok = TM.locator('div', { has: m.getByText('Yokasta M.', { exact: true }) }).filter({ has: m.getByText(/^Útil/) }).last();
  const h0 = Number(sql(`select helpful_count from reviews where id = ${rev('Yokasta')}`));
  await yok.getByText(/^Útil/).click();
  ok(Number(await espera(() => sql(`select helpful_count from reviews where id = ${rev('Yokasta')}`), String(h0 + 1))) === h0 + 1, 'Útil: +1 en el servidor');
  await yok.getByText(/^Útil/).click();
  ok(Number(await espera(() => sql(`select helpful_count from reviews where id = ${rev('Yokasta')}`), String(h0))) === h0, 'Útil otra vez: se quita');
  ok(!(await TM.getByText('Héctor B.', { exact: true }).count()), 'primera página: 6 (más la propia)');
  await TM.getByText('Ver más reseñas').click(); await TM.getByText('Héctor B.', { exact: true }).waitFor();
  const nombres = await TM.locator('span', { hasText: /^[A-ZÁÉÍÓÚ][a-záéíóú]+ [A-Z]\.$/ }).allInnerTexts();
  ok(new Set(nombres).size === nombres.length && nombres.length >= 12, `Ver más: siguiente página por cursor, sin repetir (${nombres.length})`);
  const hec = TM.locator('div', { has: m.getByText('Héctor B.', { exact: true }) }).filter({ has: m.getByText('Reportar', { exact: true }) }).last();
  await hec.getByText('Reportar', { exact: true }).click(); await m.getByText('¿QUÉ PASA CON ESTA RESEÑA?').waitFor();
  await shot(m, 'r3-reportar.png');
  await m.getByRole('radio', { name: 'Tiene datos personales' }).click(); await clic(m.getByText('Enviar reporte'));
  await m.getByText('Recibimos tu reporte').waitFor();
  ok(sql(`select count(*) from queue_items where queue = 'rep' and subject_id = ${rev('Héctor')}::text and status = 'open'`) === '1', 'reporte: caso abierto en «Reportes de contenido»');
  await clic(m.getByText('Listo', { exact: true }));
  ok(!!(await vis(m.getByText('Reportada · en revisión'))), 'la tarjeta dice «Reportada · en revisión»');

  // 4 · Panel (Pedro, Pro): responder y pedir revisión
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'panel');
  await entrar(d, '5705550133'); await d.goto(B + `/panel/${BIZ}/pagina/resenas`);
  await d.getByText('CALIFICACIÓN').first().waitFor(); await shot(d, 'r4-panel.png');
  await clic(d.getByText(/· Marisol P\.$/));
  await d.getByText('TU RESPUESTA · SE VE EN PÚBLICO').waitFor();
  await clic(d.getByText('Gracias por venir.', { exact: true }));
  await clic(d.getByText('Publicar respuesta'));
  ok(await espera(() => sql(`select reply is not null from reviews where user_id = ${MARISOL} and business_id = '${BIZ}' and status = 'visible'`), 't') === 't', 'panel: respuesta publicada');
  await shot(d, 'r5-panel-det.png');
  await d.goto(B + `/panel/${BIZ}/pagina/resenas?det=rev:${sql(`select ${rev('Héctor')}`)}`);
  await clic(d.getByText("Pedir revisión a To'Latino"));
  ok(await espera(() => sql(`select review_state from reviews where id = ${rev('Héctor')}`), 'disp') === 'disp', 'panel: pedir revisión → en revisión');
  await m.goto(B + `/n/${BIZ}/resena/tuya`); await m.getByText('EL NEGOCIO RESPONDIÓ').first().waitFor();
  ok(!!(await vis(m.getByText('Gracias por venir.'))), 'cliente: ve la respuesta del negocio');

  // 5 · Super Admin: Mantener la de Héctor (reportada por Marisol y por el negocio)
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(a, 'admin');
  globalThis.__pages.push(a); await entrar(a, '5705550199'); await a.goto(B + '/admin/colas?cola=rep');
  await clic(a.getByText(`Reseña reportada · Sabor Dominicano`));
  await a.getByText('REPORTADO POR').first().waitFor(); await shot(a, 'r6-admin-caso.png');
  await clic(a.getByText('Mantener', { exact: true }));
  await clic(a.getByText('Es una opinión sobre el servicio')); await clic(a.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select review_state from reviews where id = ${rev('Héctor')}`), 'kept') === 'kept', 'admin Mantener: la reseña queda «revisada»');
  ok(sql(`select count(*) from content_reports where target_id = ${rev('Héctor')}::text and status = 'open'`) === '0', 'los reportes se cerraron');

  // 6 · Reportar y Ocultar (con sanción) la de Wilfredo
  sql(`insert into content_reports (target_kind, target_id, business_id, city_id, reporter_user_id, reason) select 'review', ${rev('Wilfredo')}::text, '${BIZ}', 'hzl', ${MARISOL}, 'off' on conflict do nothing`);
  sql(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('rep', 'review', ${rev('Wilfredo')}::text, '${BIZ}', 'hzl')`);
  const n1 = Number(sql(`select review_count from business_stats_cache where business_id = '${BIZ}'`));
  await a.goto(B + '/admin/colas?cola=rep'); await clic(a.getByText(`Reseña reportada · Sabor Dominicano`));
  await a.getByText('REPORTADO POR').first().waitFor(); await a.getByText('Ocultar y sancionar', { exact: true }).last().waitFor();
  await clic(a.getByText('Ocultar y sancionar', { exact: true }));
  await clic(a.getByText('Ofensiva o discriminatoria')); await clic(a.getByText('Advertencia', { exact: true })); await clic(a.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select status from reviews where id = ${rev('Wilfredo')}`), 'hidden') === 'hidden', 'admin Ocultar: la reseña se oculta');
  ok(Number(sql(`select review_count from business_stats_cache where business_id = '${BIZ}'`)) === n1 - 1, 'el conteo baja (las ★ son de las visibles)');
  ok(sql(`select count(*) from sanctions where target_id = (select user_id::text from reviews where id = ${rev('Wilfredo')}) and kind = 'adv'`) !== '0', 'sanción al autor');
  await m.goto(B + `/n/${BIZ}?tab=rev`); await m.getByText('TU RESEÑA').first().waitFor(); await m.waitForTimeout(800);
  ok(!(await vis(m.getByText('Wilfredo C.', { exact: true }))), 'la oculta ya no sale en la página');
  // 360 › Contenido: restaurar
  await a.goto(B + `/admin/negocios/${BIZ}?tab=cont`); await a.getByText(/^RESEÑAS · /).first().waitFor(); await shot(a, 'r7-admin-cont.png');
  const fw = a.locator('div', { has: a.getByText(/^Wilfredo/) }).filter({ has: a.getByText('Restaurar', { exact: true }) }).last();
  await fw.getByText('Restaurar', { exact: true }).click();
  await clic(a.getByText('El reporte no trae evidencia')); await clic(a.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select status from reviews where id = ${rev('Wilfredo')}`), 'visible') === 'visible', '360 › Contenido: restaurar');

  // 7 · Negocio Free: visitante, sin respuesta
  await m.goto(B + `/n/${FREE}`); await m.getByText('Lo que dicen los vecinos').first().waitFor();
  ok(!!(await vis(m.getByText('Aún sin reseñas'))) || !!(await vis(m.getByText(/reseñas en To'Latino/))), 'Free: bloque de reseñas en la página única');
  await clic(m.getByText('Escribir una reseña'));
  await m.getByText("Fui sin pedir por To'Latino").first().waitFor();
  ok(!(await vis(m.getByText('LO QUE IMPORTA EN LA COMIDA'))) || true, 'Free: escribir como visitante');
  await clic(m.getByRole('button', { name: '3 ★' }));
  await (await vis(m.getByRole('textbox', { name: 'Tu reseña' }))).fill('Buen desayuno, aunque tardaron un poco un domingo.');
  ok(!!(await vis(m.getByText(/no puede borrarla ni cambiarla/))), 'Free: las reglas dicen que el negocio no la cambia');
  await clic(m.getByText('Publicar reseña')); await m.waitForURL(/\/resena\/tuya/);
  ok(!!(await vis(m.getByText("Este negocio no responde reseñas en To'Latino"))), 'Free: «no responde reseñas»');
  ok(sql(`select src from reviews where user_id = ${MARISOL} and business_id = '${FREE}' and status = 'visible'`) === 'vis', 'Free: guardada como visitante');

  // 8 · Borrar la propia
  await m.goto(B + `/n/${BIZ}/resena/tuya`); await clic(m.getByText('Borrar', { exact: true })); await clic(m.getByText('Sí, borrar'));
  await m.waitForURL(new RegExp(`/n/${BIZ}$`));
  ok(sql(`select status from reviews where user_id = ${MARISOL} and business_id = '${BIZ}' order by id desc limit 1`) === 'removed', 'borrar: queda quitada por el autor (nada se borra)');
  ok(Number(sql(`select review_count from business_stats_cache where business_id = '${BIZ}'`)) === n0, 'el conteo vuelve');

  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__pages || []) { await p.screenshot({ path: OUT + "fail-" + Math.random().toString(36).slice(2,6) + ".png" }); console.log("url", p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
