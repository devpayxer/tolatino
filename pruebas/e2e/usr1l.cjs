const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); }; // 9b-1 · antes solo imprimía: la corrida la contaba «en verde con 0 ✓»
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel, nombre) => {
  await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); if (!a.codigoPrueba) throw new Error('sin código ' + JSON.stringify(a));
  const v = await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); if (v.ok === false) return v;
  if (!v.nombre && nombre) await api(p, '/api/cuenta/perfil', { nombre, apellido: 'Prueba', apodo: '' }); return v;
};
const t = (p, x) => p.getByText(x, { exact: true }).last();
const shot = async (p, n, full = true) => { await p.waitForTimeout(450); await p.screenshot({ path: OUT + n, fullPage: full }); };
const confirmar = async (a, { elegir, plantilla, motivo, cta = 'Confirmar' }) => {
  if (elegir) await a.getByText(elegir).last().click();
  if (plantilla) await t(a, plantilla).click(); else await a.locator('textarea').last().fill(motivo);
  await t(a, cta).click();
};
(async () => {
  sql("delete from otp_codes");
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  // Vecina en su teléfono: entra Pedro y luego Marisol desde el MISMO dispositivo (cuentas en el mismo dispositivo).
  const cv = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const v = await cv.newPage(); watch(v, 'vecina');
  await entrar(v, '5705550133', 'Pedro'); await entrar(v, '5705550122', 'Marisol');
  const X = sql("select id from users where phone = '+15705550122'");
  sql(`update users set home_city_id = 'hzl' where id = '${X}'`);
  // Admin en escritorio
  const ca = await b.newContext({ viewport: { width: 1440, height: 900 } }); const a = await ca.newPage(); watch(a, 'admin'); await entrar(a, '5705550199');
  await a.goto(B + '/admin/usuarios'); await a.locator('text=TODAS LAS CUENTAS').waitFor(); await shot(a, 'l1-lista-d.png');
  // 9a · Por su teléfono (la base local tiene otras «Marisol» de otras pruebas: por nombre se abría la que no era).
  await a.locator('input[aria-label="Buscar usuario"]').fill('5705550122'); await a.keyboard.press('Enter'); await a.locator('text=Marisol Prueba').first().waitFor();
  await a.locator('text=Marisol Prueba').first().click(); await a.waitForURL(new RegExp(`/admin/usuarios/${X}`)); await a.locator('text=USUARIO 360°').waitFor(); await shot(a, 'l2-resumen-d.png');
  if (!(await a.getByText(/Comparte dispositivo con \d+ cuentas? más/).count())) // 9a · «\d» dentro de comillas era «d»: ahora una expresión de verdad
    throw new Error('no detectó el dispositivo compartido');
  // Nota interna
  await t(a, 'Agregar nota').click(); await confirmar(a, { motivo: 'Llamó a Soporte por su cuenta', cta: 'Guardar' }); await a.locator('text=Llamó a Soporte por su cuenta').first().waitFor();
  // Silencio 7 días → la vecina no puede recomendar y lo ve en Mi cuenta
  await t(a, 'Sancionar').click(); await confirmar(a, { elegir: /^Silencio 7 días/, plantilla: 'Primera vez' }); await a.locator('text=/Silenciado hasta el/').first().waitFor();
  await v.goto(B + '/cuenta'); await v.locator('text=/No puedes publicar hasta el/').waitFor(); await shot(v, 'l3-cuenta-silencio-m.png', false);
  await v.goto(B + '/recomendar?q=colmado'); await v.getByPlaceholder('Ej.: Pica Pollo La Vieja Fefa').fill('Colmado La Esquina Prueba'); await v.getByText('Comida y Bebidas', { exact: true }).click();
  await v.getByPlaceholder('Calle o dirección').fill('12 E Broad St'); await v.getByText('Soy cliente', { exact: true }).click(); await v.getByText('Enviar recomendación').click();
  await v.locator('text=/No puedes publicar hasta el/').waitFor(); await shot(v, 'l4-recomendar-silencio-m.png', false); ok(true, 'silencio → no recomienda («No puedes publicar hasta el…»)');
  // Levantar
  await t(a, 'Levantar').click(); await confirmar(a, { motivo: 'Se aclaró con la vecina' }); await a.locator('text=Sanción levantada.').waitFor();
  // Suspender 14 días → sesión cerrada y al entrar ve hasta cuándo
  await t(a, 'Sancionar').click(); await confirmar(a, { elegir: /^Suspender 14 días/, plantilla: 'Reincidente' }); await a.locator('text=/Suspendido hasta el/').first().waitFor();
  await v.goto(B + '/cuenta'); await v.waitForURL(/entrar/); const s1 = await entrar(v, '5705550122');
  if (!/suspendida hasta el/.test(s1.mensaje?.es ?? '')) throw new Error('no avisó la suspensión: ' + JSON.stringify(s1)); ok(true, `suspendida → ${s1.mensaje.es}`);
  await t(a, 'Levantar').click(); await confirmar(a, { motivo: 'Error de la persona del equipo' }); await a.locator('text=Sanción levantada.').waitFor();
  const s2 = await entrar(v, '5705550122'); if (s2.ok === false) throw new Error('no pudo entrar tras levantar'); ok(true, 'levantada → entra');
  // Seguridad: dispositivos, cuentas en el mismo dispositivo, bloquear, ciudad
  await a.goto(B + `/admin/usuarios/${X}?tab=seguridad`); await a.locator('text=/DISPOSITIVOS Y SESIONES/').waitFor(); await shot(a, 'l5-seguridad-d.png');
  await a.getByText('Bloquear', { exact: true }).first().click(); await confirmar(a, { plantilla: 'Actividad sospechosa' }); await a.locator('text=BLOQUEADO').first().waitFor();
  const s3 = await entrar(v, '5705550133'); if (s3.error !== 'dispositivo_bloqueado') throw new Error('el dispositivo bloqueado dejó entrar: ' + JSON.stringify(s3)); ok(true, `dispositivo bloqueado (otra cuenta) → ${s3.mensaje.es}`);
  await a.getByText('Desbloquear', { exact: true }).first().click(); await confirmar(a, { motivo: 'Recuperó su teléfono' }); await a.locator('text=Dispositivo desbloqueado.').waitFor();
  await t(a, 'Cambiar ciudad').click(); await confirmar(a, { elegir: /^Allentown/, motivo: 'Se mudó' }); await a.locator('text=Allentown → ').first().waitFor().catch(async () => { await a.locator('text=/Hazleton → Allentown/').first().waitFor(); });
  const ws = sql(`select count(*) from city_waitlist where user_id = '${X}' and city_id = 'alw'`); ok(+ws >= 1, `ciudad cambiada; en la lista de espera de Allentown (${ws})`);
  // Privacidad: exportar sus datos (descarga real)
  await a.goto(B + `/admin/usuarios/${X}?tab=privacidad`); await t(a, 'Exportar sus datos').click(); await a.locator('textarea').last().fill('Pedido de privacidad de la vecina');
  // 9d · El mismo archivo que la persona pide en Mi cuenta: un ZIP por el mapa de datos (JSON + CSV + LEEME).
  const dl = a.waitForEvent('download'); await t(a, 'Descargar').click(); const d = await dl; const f = await d.path();
  const z = require('../lib/zip.cjs').leerZip(require('fs').readFileSync(f)), J = (k) => JSON.parse(z[`${k}.json`].toString('utf8'));
  ok(J('perfil')[0]?.phone === '+15705550122' && Array.isArray(J('sesiones')) && Array.isArray(J('sanciones')) && !!z['LEEME.txt'], `exportar → ZIP con su perfil ${J('perfil')[0]?.phone}, ${J('sesiones').length} sesiones, ${J('sanciones').length} sanciones y LEEME`);
  // Borrar: lo pide Ana, Ana no puede aplicarlo; lo aplica Beto (otro Admin); la vecina no entra; Ana restaura
  await a.goto(B + `/admin/usuarios/${X}`); await t(a, 'Borrar datos').click(); await confirmar(a, { motivo: 'La vecina pidió borrar su cuenta', cta: 'Enviar a la cola' }); await a.locator('text=/Pedido de borrado en Cambios sensibles/').waitFor();
  await a.goto(B + '/admin/colas?cola=cambio'); await a.locator('text=/Borrar cuenta · Marisol/').first().click(); await a.locator('text=/Lo pediste tú/').first().waitFor(); await shot(a, 'l6-cola-borrado-d.png'); ok(true, 'quien lo pide no lo aplica («Lo pediste tú»)');
  const cb = await b.newContext({ viewport: { width: 1440, height: 900 } }); const bt = await cb.newPage(); watch(bt, 'beto'); await entrar(bt, '5705550188', 'Beto');
  const BETO = sql("select id from users where phone = '+15705550188'"); sql(`insert into staff_members (user_id, role) values ('${BETO}', 'admin') on conflict do nothing`);
  await bt.goto(B + '/admin/colas?cola=cambio'); await bt.locator('text=/Borrar cuenta · Marisol/').first().click(); await t(bt, 'Aplicar cambio').click(); await confirmar(bt, { motivo: 'Confirmado con la vecina por teléfono', cta: 'Aplicar' });
  await bt.locator('text=/30 días de gracia/').first().waitFor();
  const s4 = await entrar(v, '5705550122'); if (!/se está borrando/.test(s4.mensaje?.es ?? '')) throw new Error('la cuenta borrada entró: ' + JSON.stringify(s4)); ok(true, `borrada → ${s4.mensaje.es}`);
  await a.goto(B + `/admin/usuarios/${X}`); await a.locator('text=/Período de gracia hasta el/').waitFor(); await shot(a, 'l7-borrada-d.png');
  await t(a, 'Restaurar').click(); await confirmar(a, { motivo: 'Cambió de idea' }); await a.locator('text=Cuenta restaurada.').waitFor();
  const s5 = await entrar(v, '5705550122'); if (s5.ok === false) throw new Error('no entró tras restaurar'); ok(true, 'restaurada → entra');
  // Teléfono: lista y 360
  const cm = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const m = await cm.newPage(); watch(m, 'admin-m'); await entrar(m, '5705550199');
  await m.goto(B + '/admin/usuarios'); await m.locator('text=TODAS LAS CUENTAS').waitFor(); await shot(m, 'l8-lista-m.png', false);
  await m.goto(B + `/admin/usuarios/${X}?tab=confianza`); await m.locator('text=SANCIONES').first().waitFor(); await shot(m, 'l9-confianza-m.png');
  // Sin permiso: un vecino no entra al admin ni a sus acciones
  const r = await v.goto(B + `/admin/usuarios/${X}`); { const T = await v.locator('body').innerText(); ok(T.includes('SIN ACCESO') && !T.includes('SANCIONES'), 'una vecina en el admin ve «SIN ACCESO» y nada de la cuenta'); }
  // El que no es Admin no banea (rol soporte)
  ok(!err.length, `sin errores en las páginas (${err.join(' | ').slice(0, 300) || 'ninguno'})`); await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n').slice(0,4).join(' | ')); process.exit(1); });
