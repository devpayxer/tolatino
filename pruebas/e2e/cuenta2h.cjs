const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 20; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const UID = execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "select id from users where phone in ('+15705550122','+15705558123') limit 1"`).toString().trim();
const U = `'${UID}'::uuid`;
// 9b-1 · Al empezar, Marisol en Allentown (la prueba la cambia a Hazleton en «Mi ciudad»); al terminar (bien o mal) VUELVE a Hazleton, su ciudad de
// la semilla. Antes se quedaba en Allentown y todo lo que venía después la tenía ahí (adm7i veía su conversación de El Compa en Allentown).
const limpiar = (ciudad = 'hzl') => {
  sql(`update users set phone = '+15705550122' where phone = '+15705558123'`);
  sql(`update users set nick = null, email = null, email_verified = false, notif_prefs = '{}', delete_at = null, delete_reason = null, lang = 'es', home_city_id = '${ciudad}', home_city_changed_at = ${ciudad === 'hzl' ? 'null' : "now() - interval '40 days'"} where id = ${U}`);
  sql(`delete from favorites where user_id = ${U}`); sql(`delete from job_applications where user_id = ${U}`);
};
(async () => {
  limpiar('alw');
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'tel'); globalThis.__p = [m];
  await entrar(m, '5705550122');
  // Resumen
  await m.goto(B + '/cuenta'); await m.getByText('Tu semana').first().waitFor();
  ok(!!(await vis(m.getByText('COMPLETA TU CUENTA'))), 'Resumen: completa tu cuenta');
  ok(!!(await vis(m.getByText(/TU APOYO AL BARRIO/))), 'Resumen: tu apoyo al barrio');
  // Pedidos: filtro, ver más, abrir
  await clic(m.getByText('Pedidos', { exact: true }));
  await m.waitForURL(/\/cuenta\/pedidos$/); await m.getByText(/^Todos · \d+/).first().waitFor();
  const total = Number(sql(`select count(*) from operations where user_id = ${U} and kind in ('order', 'market_order')`));
  ok(!!(await vis(m.getByText(`Todos · ${total}`))), `Pedidos: ${total} en total`);
  await clic(m.getByText('Entregados', { exact: true })); await m.waitForURL(/f=hechos/);
  ok(!(await vis(m.getByText('CANCELADO', { exact: true }))), 'filtro Entregados: sin cancelados');
  await m.goto(B + '/cuenta/pedidos'); if (total > 30) { await clic(m.getByText('Ver más pedidos')); await m.waitForURL(/antes=/); await m.getByText('Volver a los más recientes').first().waitFor(); ok(true, 'Ver más (cursor)'); }
  const n1 = sql(`select number from operations where user_id = ${U} and kind = 'order' order by id desc limit 1`);
  await m.goto(B + '/cuenta/pedidos'); await clic(m.getByText(new RegExp(`^#${n1} ·`)));
  await m.waitForURL(new RegExp(`/pedido/${n1}$`)); ok(true, 'el pedido abre su página');
  // Citas
  await m.goto(B + '/cuenta/citas?f=past'); await m.getByText(/^Pasadas · \d+/).first().waitFor();
  ok(!!(await vis(m.getByText(/MESA PARA| · (HOY|AYER|[A-ZÁÉÍÓÚ]{3})/).first())), 'Citas: reservaciones pasadas (mesas, citas, fiestas o noches)');
  // Guardados
  sql(`insert into favorites (user_id, kind, target_id) values (${U}, 'business', 'el-fogon') on conflict do nothing`);
  await m.goto(B + '/cuenta/guardados'); await m.getByText('Negocios · 1').first().waitFor(); ok(true, 'Guardados: el negocio guardado');
  await clic(m.getByText('Editar', { exact: true })); await clic(m.getByText('Quitar', { exact: true }));
  ok(await espera(() => sql(`select count(*) from favorites where user_id = ${U}`), '0') === '0', 'Guardados: quitar');
  // Reseñas por escribir
  await m.goto(B + '/cuenta/resenas?f=pend'); await m.getByText(/^Por escribir · \d+/).first().waitFor(); ok(true, 'Reseñas: por escribir');
  // Empleos
  sql(`insert into job_applications (number, job_id, business_id, city_id, user_id, name, phone, experience, days, languages) select 'J-' || nextval('job_app_number_seq'), id, business_id, city_id, ${U}, 'Marisol Prueba', '+15705550122', 1, '{1,2}', '{es}' from job_postings where title->>'es' = 'Chofer de delivery' limit 1`);
  await m.goto(B + '/cuenta/empleos'); await m.getByText('Chofer de delivery').first().waitFor(); ok(!!(await vis(m.getByText('ENVIADA', { exact: true }))), 'Empleos: la solicitud con su estado');
  // Perfil: correo malo, luego bueno
  await m.goto(B + '/cuenta/perfil'); await m.getByText('NOMBRE · FOTO · CORREO').first().waitFor();
  await (await vis(m.getByPlaceholder('Ej.: Anita'))).fill('Mari');
  await (await vis(m.getByPlaceholder('ana@correo.com'))).fill('mari@correo');
  await clic(m.getByText('Guardar cambios', { exact: true })); await m.getByText('Revisa el correo.').first().waitFor(); ok(true, 'Perfil: correo inválido no se guarda');
  await (await vis(m.getByPlaceholder('ana@correo.com'))).fill('mari@example.com');
  await clic(m.getByText('Guardar cambios', { exact: true }));
  ok(await espera(() => sql(`select nick || '|' || email || '|' || email_verified from users where id = ${U}`), 'Mari|mari@example.com|false') === 'Mari|mari@example.com|false', 'Perfil: apodo y correo (sin verificar)');
  ok(sql(`select count(*) from account_changes where user_id = ${U} and kind = 'email' and "to" = 'mari@example.com'`) !== '0', 'Perfil: cambio de correo en el historial');
  await shot(m, 'h1-perfil.png');
  // Teléfono: código y cambio; luego volver
  await m.goto(B + '/cuenta/perfil/telefono'); await (await vis(m.getByPlaceholder('(570) 555-0199'))).fill('5705550122');
  await clic(m.getByText('Mandarme el código', { exact: true })); await m.getByText('Es el mismo número que ya tienes.').first().waitFor(); ok(true, 'Teléfono: no deja el mismo número');
  await (await vis(m.getByPlaceholder('(570) 555-0199'))).fill('5705550133');
  await clic(m.getByText('Mandarme el código', { exact: true })); await m.getByText(/ya tiene una cuenta/).first().waitFor(); ok(true, 'Teléfono: no deja un número con cuenta');
  await (await vis(m.getByPlaceholder('(570) 555-0199'))).fill('5705558123');
  await clic(m.getByText('Mandarme el código', { exact: true })); await m.getByText(/Sandbox: el código es \d{6}/).first().waitFor();
  const cod = (await (await vis(m.getByText(/Sandbox: el código es \d{6}/))).textContent()).match(/\d{6}/)[0];
  await (await vis(m.getByPlaceholder('482913'))).fill(cod === '000000' ? '111111' : '000000');
  await clic(m.getByText('Confirmar cambio', { exact: true })); await m.getByText('Ese código no es. Revísalo.').first().waitFor(); ok(true, 'Teléfono: código malo no cambia');
  await (await vis(m.getByPlaceholder('482913'))).fill(cod);
  await clic(m.getByText('Confirmar cambio', { exact: true }));
  ok(await espera(() => sql(`select phone from users where id = ${U}`), '+15705558123') === '+15705558123', 'Teléfono: cambiado con el código');
  sql(`update users set phone = '+15705550122' where phone = '+15705558123'`);
  // Avisos
  await m.goto(B + '/cuenta/avisos'); await m.getByText('Ofertas', { exact: true }).first().waitFor();
  const fila = m.locator('div', { has: m.getByText('Ofertas', { exact: true }) }).filter({ has: m.getByRole('switch') }).last();
  await fila.getByRole('switch').click();
  ok(await espera(() => sql(`select notif_prefs->>'of' from users where id = ${U}`), 'true') === 'true', 'Avisos: se guarda la preferencia');
  // Idioma
  await m.goto(B + '/cuenta/ajustes'); await clic(m.getByText('English', { exact: true }));
  await m.getByText('Settings', { exact: true }).first().waitFor();
  ok(sql(`select lang from users where id = ${U}`) === 'en', 'Ajustes: idioma de la cuenta y de la pantalla');
  await clic(m.getByText('Español', { exact: true })); await m.getByText('Ajustes', { exact: true }).first().waitFor();
  // Mi ciudad
  await m.goto(B + '/cuenta/ajustes/ciudad'); await clic(m.getByText('Cambiar a esta', { exact: true }));
  await clic(m.getByText('Cambiar', { exact: true }));
  ok(await espera(() => sql(`select home_city_id from users where id = ${U}`), 'hzl') === 'hzl', 'Mi ciudad: cambiada a una abierta');
  await m.reload(); ok(!!(await vis(m.getByText('BLOQUEADA 30 DÍAS'))), 'Mi ciudad: 30 días bloqueada');
  // Privacidad: cerrar otra sesión
  const o = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); await entrar(o, '5705550122'); globalThis.__p.push(o);
  const antes = Number(sql(`select count(*) from sessions where user_id = ${U} and signed_out_at is null and expires_at > now()`));
  await m.goto(B + '/cuenta/ajustes/privacidad'); await m.getByText('ESTA', { exact: true }).first().waitFor();
  await clic(m.getByText('Cerrar', { exact: true }));
  ok(await espera(() => Number(sql(`select count(*) from sessions where user_id = ${U} and signed_out_at is null and expires_at > now()`)) === antes - 1, true), 'Privacidad: cerrar otra sesión');
  // Borrar y cancelar; entrar cancela
  await m.goto(B + '/cuenta/ajustes/borrar'); await clic(m.getByText('Ya no la uso', { exact: true })); await clic(m.getByText('Seguir', { exact: true }));
  sql('delete from otp_codes'); await clic(m.getByText('Mandarme el código', { exact: true })); await m.getByText(/Sandbox: el código es \d{6}/).first().waitFor(); const c2 = (await (await vis(m.getByText(/Sandbox: el código es \d{6}/))).textContent()).match(/\d{6}/)[0];
  await (await vis(m.getByPlaceholder('482913'))).fill(c2); await clic(m.getByText('Borrar mi cuenta', { exact: true }).last());
  ok(await espera(() => sql(`select (delete_at > now() + interval '29 days')::text || '|' || delete_reason from users where id = ${U}`), 'true|uso') === 'true|uso', 'Borrar: programado a 30 días con el motivo');
  await m.goto(B + '/cuenta'); await m.getByText(/Tu cuenta se borra el/).first().waitFor(); ok(true, 'Resumen: aviso del borrado');
  await m.goto(B + '/cuenta/ajustes/borrar'); await clic(m.getByText('Cancelar el borrado', { exact: true }));
  ok(await espera(() => sql(`select coalesce(delete_at::text, 'null') from users where id = ${U}`), 'null') === 'null', 'Borrar: cancelar');
  sql(`update users set delete_at = now() + interval '30 days', delete_reason = 'uso' where id = ${U}`);
  await entrar(o, '5705550122');
  ok(sql(`select coalesce(delete_at::text, 'null') from users where id = ${U}`) === 'null', 'entrar cancela el borrado');
  // Escritorio: navegación
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'esc'); globalThis.__p.push(d);
  await entrar(d, '5705550122'); await d.goto(B + '/cuenta/guardados'); await d.locator('[data-screen-label="Mi cuenta · navegación"]').getByText('Empleos').click();
  await d.waitForURL(/\/cuenta\/empleos$/); ok(true, 'Escritorio: navegación de Mi cuenta');
  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
async function shot(p, n) { await p.waitForTimeout(400); await p.screenshot({ path: OUT + n, fullPage: true }); }
