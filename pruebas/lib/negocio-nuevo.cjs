// 9b-1 · Un negocio NUEVO publicado por el flujo real de /publica (vecino → dueño → «PUBLICADA»), para las pruebas que necesitan «un negocio
// recién publicado desde la app» con su dueño (admin1i, rec1j, panel, fich8i). Antes usaban `barberia-7747`, que solo existía en la base vieja
// de una máquina (la hizo una corrida de publica.cjs del 5 nov): en una base nueva no estaba y las cuatro fallaban. Ahora cada corrida hace el
// suyo, con un teléfono 555 libre (el repo es público), y nada depende del orden ni de lo que dejó otra prueba.
const ENT = require('./entorno.cjs');
const { execSync } = require('child_process');
const B = ENT.B, FP = ENT.rec('fotos') + '/';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
// Las fotos (/medios/…) las sirve Garage en el puerto web de la base de la corrida (base.sh: PRUEBAS_WEB_PUERTO, 3902 por defecto).
const PUERTO_MEDIOS = Number(process.env.PRUEBAS_WEB_PUERTO || 3902);
const medios = (ctx) => ctx.route('**/medios/**', async (r) => {
  const u = new URL(r.request().url());
  const body = await new Promise((ok) => require('http').get({ host: '127.0.0.1', port: PUERTO_MEDIOS, path: u.pathname.replace(/^\/medios/, ''), headers: { host: 'medios.web.garage' } }, (res) => { const c = []; res.on('data', (x) => c.push(x)); res.on('end', () => ok({ s: res.statusCode, b: Buffer.concat(c) })); }).on('error', () => ok({ s: 502, b: Buffer.alloc(0) })));
  return r.fulfill({ status: body.s, body: body.b, contentType: 'image/jpeg' });
});
// Un teléfono 570-555-XXXX sin cuenta y sin un negocio «barberia-XXXX» (el nombre del negocio sale de los últimos 4).
const telLibre = (pre = '570555') => {
  for (let i = 0; i < 200; i++) {
    const t = pre + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    if (sql(`select count(*) from users where phone = '+1${t}'`) === '0' && sql(`select count(*) from businesses where id like 'barberia-${t.slice(-4)}%'`) === '0') return t;
  }
  throw new Error('no hay un teléfono 555 libre');
};
/* Publica una barbería con el flujo de /publica (como publica.cjs) y devuelve { id, tel, nombre, uid }. */
async function publicarBarberia(browser, { tel = telLibre(), nombre: dueno = 'Mario', apellido = 'Peña' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await medios(ctx);
  const p = await ctx.newPage();
  const nombre = 'Barbería ' + tel.slice(-4);
  await p.goto(B + '/publica'); await p.getByText('Publica tu negocio en 5 minutos').waitFor();
  await p.getByPlaceholder('(570) 555-0134').fill(tel);
  await p.getByText('Enviarme el código').click();
  const cod = await p.locator('[data-modo-pruebas] b').textContent({ timeout: 8000 });
  await p.getByPlaceholder('······').fill(cod.trim());
  await p.getByText('Verificar').click();
  await p.getByText('¿Cómo te llamas?').waitFor();
  await p.getByPlaceholder('Rafael').fill(dueno); await p.getByPlaceholder('Núñez').fill(apellido);
  await p.getByText('Seguir', { exact: true }).last().click();
  await p.getByText('¿Qué tipo de negocio tienes?').waitFor({ timeout: 10000 });
  await p.getByText('Belleza', { exact: true }).first().click(); await p.locator('text=/¿QUÉ HACES/').waitFor({ timeout: 8000 });
  await p.locator('[data-screen-label="ONB-NEG-B1 · tu negocio"] span:has-text("Barbería")').first().click().catch(async () => { await p.locator('[data-screen-label="ONB-NEG-B1 · tu negocio"] div[style*="flex-wrap"] > *').first().click(); });
  await p.getByPlaceholder('Ej.: Barbería Don Fello').fill(nombre); await p.waitForTimeout(600);
  await p.getByText('Seguir', { exact: true }).last().click(); await p.waitForTimeout(900);
  for (let i = 0; i < 6; i++) {
    if (!(await p.locator('text=RESPONDE LO QUE FALTA').count())) break;
    const grupos = p.locator('[data-screen-label^="ONB-NEG-C1"] > div'); const n = await grupos.count();
    for (let g = 0; g < n; g++) { const opc = grupos.nth(g).locator('div[role=button], span[style*="border-radius: 999px"], div[style*="cursor: pointer"]').first(); if (await opc.count()) await opc.click().catch(() => {}); await p.waitForTimeout(120); }
  }
  await p.getByText('Seguir', { exact: true }).last().click(); await p.waitForTimeout(900);
  await p.locator('button, span, div').filter({ hasText: /^Seguir · / }).last().click(); await p.waitForTimeout(900);
  const dir = p.getByPlaceholder('312 N Wyoming St'); if (await dir.count()) await dir.fill('412 N Wyoming St');
  await p.waitForTimeout(400);
  await p.getByText('Seguir', { exact: true }).last().click(); await p.waitForTimeout(900);
  await p.locator('input[type=file]').nth(1).setInputFiles([FP + 'portada.jpg', FP + 'galeria.png']);
  await p.waitForFunction(() => document.querySelectorAll('[aria-label="Quitar foto"]').length === 2, null, { timeout: 20000 });
  await p.waitForTimeout(800);
  await p.locator('text=/^Publicar · /').last().click();
  await p.getByText('PUBLICADA').first().waitFor({ timeout: 15000 });
  await ctx.close();
  const fila = sql(`select b.id || '|' || u.id from businesses b join users u on u.id = b.owner_user_id where u.phone = '+1${tel}' order by b.created_at desc limit 1`);
  if (!fila) throw new Error(`publicarBarberia: no quedó el negocio de ${tel}`);
  const [id, uid] = fila.split('|');
  // La prueba entra después con el mismo teléfono: sin la espera entre códigos (solo los códigos de ESTE teléfono, nunca los de otros).
  sql(`delete from otp_codes where phone = '+1${tel}'`);
  return { id, tel, nombre, uid };
}
/* Un negocio SIN dueño (como los que siembra el sandbox), copia de uno de la semilla con otro id, otro nombre y su propio teléfono 555: para
   reclamarlo («Recuperar tu negocio») sin tocar los de la semilla, que otras pruebas usan con su dueño. Devuelve { id, nombre, tel }. */
function negocioSinDueno(base = 'bufete-almonte', prefijo = 'Reclamo') {
  const tel = telLibre(), n = tel.slice(-4), id = `${base.split('-')[0]}-reclamo-${n}`, nombre = `${prefijo} ${n}`;
  sql(`insert into businesses (id, city_id, category_id, subcategory_ids, name, status, origin, address, geo, phone, founded_year, about, filter_values, category_attrs, service_radius_mi, works_from_home, is_demo)
       select '${id}', city_id, category_id, subcategory_ids, '${nombre}', 'active', 'self', address, geo, '+1${tel}', founded_year, about, filter_values, category_attrs, service_radius_mi, works_from_home, false
         from businesses where id = '${base}'`);
  if (sql(`select count(*) from businesses where id = '${id}' and owner_user_id is null`) !== '1') throw new Error(`negocioSinDueno: no se creó ${id}`);
  return { id, nombre, tel };
}
/* Entra con un teléfono (código del modo pruebas) y, si la cuenta es nueva, le pone nombre por /api/cuenta/perfil (como el paso «¿Cómo te
   llamas?»). Borra solo los códigos de ESE teléfono (la espera entre códigos), nunca los de los demás. */
async function entrarComo(p, tel, { nombre = 'Vecino', apellido = 'Prueba' } = {}) {
  await p.goto(B + '/entrar');
  sql(`delete from otp_codes where phone = '+1${tel}'`);
  const api = (u, x) => p.evaluate(async ([u, x]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(x) })).json(), [u, x]);
  const a = await api('/api/cuenta/codigo', { telefono: tel }); if (!a.codigoPrueba) throw new Error('sin código ' + JSON.stringify(a));
  const v = await api('/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); if (!v.ok) throw new Error('no entró ' + JSON.stringify(v));
  if (!v.nombre) { const r = await api('/api/cuenta/perfil', { nombre, apellido }); if (!r.ok) throw new Error('sin nombre ' + JSON.stringify(r)); }
  return v;
}
/* La tarjeta guardada (del simulador de pagos: pm_sim_<marca>_<últimos 4>_<8 hex>; 0002 = el banco la rechaza) de alguien, ACTIVA. Si no
   la tiene, se la guarda como lo hace «Guardar tarjeta» (pago/acciones.ts: marca, últimos 4, vence, simulada). Con predeterminada, queda como la
   de siempre. Antes las pruebas apuntaban a ids de tarjetas de una base vieja (pm_sim_visa_4242_d5f820de) que una base nueva no tiene.
   La de 4242 de Marisol es la misma que ya usaban cit3c, silla3d y vi4b. Devuelve el stripe_pm_id. */
const SUFIJO = { '4242': 'c13c3c00', '0002': '7725ac2e' };
function tarjeta(tel, l4 = '4242', { predeterminada = true } = {}) {
  const u = `(select id from users where phone = '+1${tel}')`, pm = `pm_sim_visa_${l4}_${SUFIJO[l4] ?? '0b9b1000'}`;
  sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated) select ${u}, '${pm}', 'visa', '${l4}', '12/30', false, true
       where not exists (select 1 from payment_methods where user_id = ${u} and stripe_pm_id = '${pm}')`);
  sql(`update payment_methods set status = 'active' where user_id = ${u} and stripe_pm_id = '${pm}'`);
  if (predeterminada) sql(`update payment_methods set is_default = (stripe_pm_id = '${pm}') where user_id = ${u}`);
  return pm;
}
/* El tope de «Ayuda con …»: 5 solicitudes por persona en 24 h (lib/ayuda.ts y lib/ayuda-cita.ts). Marisol abre ayudas en ~12 pruebas de la
   regresión (pedidos, citas, inscripciones, fiestas, viajes, boletos, El Compa…): en una sola corrida pasaba el tope y la sexta prueba veía
   «Abriste muchas solicitudes hoy». Antes de abrir la suya, cada prueba corre 1 día hacia atrás las de ESA persona de las últimas 24 h (solo
   created_at, que es lo único que mira el tope; nada se borra ni cambia de estado). El tope en sí todavía no tiene su prueba (LAUNCH, 9b). */
function sinTopeDeAyuda(tel) {
  sql(`update help_requests set created_at = created_at - interval '1 day' where user_id = (select id from users where phone = '+1${tel}') and created_at > now() - interval '1 day'`);
}
/* El estado del SMS que la app le pone AHORA a un aviso de esa plantilla en modo pruebas, con la regla del servidor (lib/avisos.ts): lo
   crítico (y biz_req) siempre sale («pruebas»); lo demás, entre las 10 PM y las 7 AM de Hazleton, espera («silencio»). Antes las pruebas
   esperaban «pruebas» siempre y fallaban de noche. `quien` (una expresión SQL con el id: '${U}' o (select …)): si esa persona apagó las
   horas de silencio en sus preferencias (notif_prefs.quiet = false), le sale igual. */
function smsEsperado(tpl, quien = null) {
  const sinSilencio = quien ? `or coalesce((select notif_prefs->>'quiet' from users where id = ${quien}), '') = 'false'` : '';
  return sql(`select case when grp = 'crit' or key = 'biz_req' or extract(hour from now() at time zone 'America/New_York') between 7 and 21 ${sinSilencio} then 'pruebas' else 'silencio' end from notif_templates where key = '${tpl}'`);
}
/* Alguien del equipo (Super Admin) que la prueba necesita y que no es de la semilla: Beto (segundo Admin, 0188), Lucía (Solo lectura, 0693),
   Sofía (Soporte de Allentown, 0694). Antes los creaban usr1l y compa7g, y evt6a, com5d, com5f, adm7i… los daban por hechos (en una base
   nueva o en otro orden no estaban). Se crean como lo hacía compa7g: la persona si falta y su rol, activo, agregado por Ana. */
const EQUIPO = { '5705550188': ['Beto', 'admin', '{}'], '5705550693': ['Lucía', 'lectura', '{}'], '5705550694': ['Sofía', 'soporte', '{alw}'] };
function equipo(...tels) {
  for (const t of tels) {
    const [nom, rol, ci] = EQUIPO[t] ?? (() => { throw new Error(`equipo: ${t} no es del equipo de prueba`); })();
    sql(`insert into users (phone, first_name, last_name, home_city_id, lang, is_test) values ('+1${t}', '${nom}', 'Prueba', 'hzl', 'es', true) on conflict (phone) do update set first_name = coalesce(users.first_name, excluded.first_name), last_name = coalesce(users.last_name, excluded.last_name)`);
    sql(`insert into staff_members (user_id, role, cities, status, added_by) select u.id, '${rol}', '${ci}', 'active', (select id from users where phone = '+15705550199') from users u where u.phone = '+1${t}'
         on conflict (user_id) do update set role = excluded.role, cities = excluded.cities, status = 'active'`);
  }
}
/* Una dirección guardada y PREDETERMINADA (como «Mis direcciones»: la de casa) para quien la prueba usa: lo que la reserva o el pedido
   proponen solos («¿Dónde te recogen?»). Antes se daba por hecho la que otra prueba le había guardado a Marisol. Si ya tiene una activa
   predeterminada, no se toca; si tiene activas sin predeterminada, la más vieja pasa a serlo; si no tiene ninguna, se guarda «casa». */
function direccion(tel) {
  const u = `(select id from users where phone = '+1${tel}')`;
  if (sql(`select count(*) from user_addresses where user_id = ${u} and removed_at is null and is_default`) !== '0') return;
  const vieja = sql(`select id from user_addresses where user_id = ${u} and removed_at is null order by created_at limit 1`);
  if (vieja) { sql(`update user_addresses set is_default = true, updated_at = now() where id = '${vieja}'`); return; }
  sql(`insert into user_addresses (user_id, label, street, apt, zip, city_id, is_default, geo, geo_quality) values (${u}, 'casa', '420 N Wyoming St', 'Apt 2', '18201', 'hzl', true, st_geogfromtext('POINT(-75.97818 40.95560)'), 'numero')`);
}
/* Los topes del día de la Comunidad (publicaciones, comentarios, votos, conversaciones, reportes por persona: lib/moderacion.ts, limiteDia, desde
   la medianoche de su ciudad). Las mismas cuentas (Yaritza, Héctor, Marisol…) escriben en com5a…com5h, evt6… y El Compa: en una corrida entera
   llegaban al tope y la última prueba veía «Llegaste a 10 publicaciones hoy». Antes de escribir, lo que ESA persona escribió hoy pasa a ayer
   (solo created_at, que es lo único que cuenta el tope; sin disparar los triggers de lo publicado, como compa7d). El tope en sí lo prueba com5d. */
function sinTopesComunidad(...tels) {
  for (const tel of tels) {
    const u = `(select id from users where phone = '+1${tel}')`;
    sql(`set session_replication_role = replica;
      update com_posts set created_at = created_at - interval '1 day' where author_user_id = ${u} and created_at > now() - interval '1 day';
      update com_comments set created_at = created_at - interval '1 day' where author_user_id = ${u} and created_at > now() - interval '1 day';
      update com_votes set created_at = created_at - interval '1 day' where user_id = ${u} and created_at > now() - interval '1 day';
      update dm_threads set created_at = created_at - interval '1 day' where started_by = ${u} and created_at > now() - interval '1 day';
      update content_reports set created_at = created_at - interval '1 day' where reporter_user_id = ${u} and created_at > now() - interval '1 day'`);
  }
}
/* 9b-1 · «La noche» de Noche y de la Puerta cambia a las 6 AM de Hazleton (lib/noche.ts, NOCHE_SQL). Una prueba que pone una reserva en «esta
   noche» y la marca segundos después fallaba si entre las dos daban las 6 («Esto se marca la noche de la reserva»: evt6g a las 5:59 AM). Si
   faltan menos de `margen` segundos para las 6 AM, espera a que pasen. */
async function lejosDelCambioDeNoche(margen = 240) {
  const s = Number(sql(`select extract(epoch from (date_trunc('day', (now() at time zone 'America/New_York') - interval '6 hours') + interval '30 hours') - (now() at time zone 'America/New_York'))::int`));
  if (s < margen) { console.log(`  (faltan ${s} s para las 6 AM, cuando cambia la noche: se espera)`); await new Promise((r) => setTimeout(r, (s + 5) * 1000)); }
}
module.exports = { lejosDelCambioDeNoche, publicarBarberia, negocioSinDueno, entrarComo, telLibre, tarjeta, sinTopeDeAyuda, sinTopesComunidad, smsEsperado, equipo, direccion, medios, PUERTO_MEDIOS, sql };
