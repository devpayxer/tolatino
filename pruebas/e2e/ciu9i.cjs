// 9i · Ciudades: el asistente de apertura, la regla, la lista de espera, el estado «beta» y los barrios de las cinco (fase9-apertura.md §4 9i). Teléfono 390 y
// escritorio 1360.
// 1 · Super Admin › Ciudades (1360): el listado; Reading pasa a «beta» con motivo (historial «el equipo») y se invita a una vecina por teléfono.
// 2 · La beta: la vecina invitada ve Reading abierta (Inicio); otra persona ve «próximamente» y se anota en la lista («Avísame»).
// 3 · El asistente: Raúl, Ciudad manager de Reading (390, un paso por pantalla), confirma los pasos 1–5 con su evidencia; la base no deja saltarse un paso
//     ni abrir sin los pasos 1–6 (ni, en una base de producción, abrir sin el asistente); Raúl no puede «Comprobar» con la regla sin cumplir ni abrir.
// 4 · Ana (Admin, 1360): «Comprobar» con «Abrir igual» (Reading no tiene 30 negocios: queda anotado) y abre Reading (paso 7) → «on» al instante para todos.
// 5 · La lista avisada UNA vez: de noche en Reading no sale nada; de día, el barrido avisa por partes a cada persona de la lista una vez (bandeja/push; SMS
//     según la plantilla y el modo pruebas), quien no tiene cuenta queda «sin cuenta» y sin mensaje; otro barrido no repite. La invitada que no estaba en la
//     lista no recibe nada.
// 6 · Cerrar: Ana pide pasar Reading a «beta» con motivo; ella misma no lo puede aprobar (la base tampoco deja); Beto (390) lo aprueba → beta; la otra
//     persona vuelve a ver «próximamente». Quitar la invitación: la invitada también.
// 7 · Los barrios de las cinco en el selector de ciudad (Hazleton, abierta, en «desde dónde medimos»; las otras cuatro en la búsqueda de lugar).
// Precondiciones propias: la base dice «pruebas»; el equipo (Ana de la semilla, Beto y Raúl con equipo()); personas nuevas con teléfonos 555 libres; Reading
// arranca «próximamente» sin asistente en curso ni cierre pendiente (lo que dejó una corrida que se cortó se cancela con su motivo); su huso se pone donde
// ahora es de noche o de día y vuelve al final; Reading termina como estaba al empezar (beta, la de la semilla).
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, telLibre, equipo } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr ?? e.message); } };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const RUN = Date.now().toString(36);
const ADM = '5705550199', BETO = '5705550188', RAUL = '5705559702';
const ctxTel = (b, extra = {}) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });
const ctxDesk = (b, extra = {}) => b.newContext({ viewport: { width: 1360, height: 900 }, ...extra });
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `c9i-${nom}.png`, fullPage: full });
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
// La confirmación con motivo (ReasonConfirm): el motivo y el botón de esa hoja.
const confirmar = async (p, cta, m) => { await p.locator('textarea').last().fill(`${m} · ciu9i ${RUN}`); await clic(p.getByRole('button', { name: cta, exact: true })); };
// Un huso donde AHORA es de día (10–19 h) o de noche (1–5 h): la prueba no depende de la hora a la que corre.
const huso = (dia) => sql(`select tz from (values ('America/New_York'), ('Europe/Madrid'), ('Asia/Tokyo'), ('Pacific/Honolulu'), ('Asia/Kolkata'), ('America/Los_Angeles'), ('Australia/Sydney'), ('Asia/Dubai')) v(tz)
  where extract(hour from now() at time zone tz) ${dia ? 'between 10 and 19' : 'between 1 and 5'} order by tz limit 1`);
const pasos = () => Number(sql(`select count(*) from city_launch_steps s join city_launches l on l.id = s.launch_id where l.city_id = 'rdg' and l.status = 'en_curso'`));
const estado = () => sql(`select status from cities where id = 'rdg'`);
const verComo = async (b, tel, tag, tam = 390) => {
  const c = tam === 390 ? await ctxTel(b) : await ctxDesk(b), p = await c.newPage();
  await c.addCookies([{ name: 'tl_loc', value: 'rdg|centro|5', url: B }]);
  if (tel) await entrarComo(p, tel, { nombre: tag, apellido: 'Reading' });
  return { c, p };
};
const veAbierta = async (p) => { await p.goto(B + '/'); await p.waitForLoadState('domcontentloaded'); return (await p.locator('[data-pantalla="APP-HOME"]').count()) > 0 && (await p.locator('[data-screen-label="APP-CIUDAD-PRONTO"]').count()) === 0; };
const vePronto = async (p) => { await p.goto(B + '/'); await p.locator('[data-screen-label="APP-CIUDAD-PRONTO"]').first().waitFor({ timeout: 10000 }).catch(() => null); return (await p.locator('[data-screen-label="APP-CIUDAD-PRONTO"]').count()) > 0; };

(async () => {
  // ── Precondiciones propias ──
  sql(`insert into platform_config (key, value, note, updated_by) values ('entorno', '"pruebas"'::jsonb, 'Sandbox (ciu9i)', 'semilla') on conflict (key) do update set value = excluded.value`);
  equipo(BETO, RAUL);
  ok(sql(`select count(*) from staff_mfa_pruebas where phone = '+1${RAUL}'`) === '1', 'Raúl (Ciudad manager de Reading) es del equipo de ficción de las pruebas (semilla 0059)');
  const ANA = uid(ADM), st0 = estado(), tz0 = sql(`select timezone from cities where id = 'rdg'`);
  sql(`update city_launches set status = 'cancelada', cancelled_by = '${ANA}', cancel_reason = 'Limpieza de una corrida anterior de ciu9i' where city_id = 'rdg' and status = 'en_curso'`);
  sql(`update city_close_requests set status = 'retirada', decision_reason = 'Limpieza de una corrida anterior de ciu9i' where city_id = 'rdg' and status = 'pendiente'`);
  sql(`update cities set status = 'soon' where id = 'rdg'`);
  // La lista de espera de esta corrida: una persona con cuenta que se anotó en la landing (lista y acceso anticipado) y un teléfono sin cuenta («Avísame» del selector).
  const W1 = telLibre(), W3 = telLibre(), VEC1 = telLibre(), VEC2 = telLibre();
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values ('+1${W1}', now(), 'Wendy', 'Lista', 'rdg', 'es', true)`);
  sql(`insert into early_access (user_id, zip, city_id, lang, is_test) values ('${uid(W1)}', '19601', 'rdg', 'es', true)`);
  sql(`insert into city_waitlist (city_id, user_id, source) values ('rdg', '${uid(W1)}', 'coming_soon')`);
  sql(`insert into city_waitlist (city_id, contact, device, source) values ('rdg', '+1${W3}', gen_random_uuid(), 'city')`);
  const b = await chromium.launch();
  const abiertas = [], err = [];
  const mirar = (p, tag) => p.on('pageerror', (e) => err.push(`${tag}: ${e.message}`));
  try {
    // ── 1 · Super Admin › Ciudades: Reading a beta e invitar ──
    console.log('1 · Super Admin › Ciudades (1360): Reading pasa a beta con motivo y se invita a una vecina por teléfono');
    const v1 = await verComo(b, VEC1, 'Inés'); abiertas.push(v1.c); mirar(v1.p, 'invitada');
    const v2 = await verComo(b, VEC2, 'Óscar'); abiertas.push(v2.c); mirar(v2.p, 'otra');
    const ca = await ctxDesk(b), pa = await ca.newPage(); abiertas.push(ca); mirar(pa, 'ana');
    await entrarComo(pa, ADM);
    await pa.goto(B + '/admin/ciudades'); await pa.locator('[data-pantalla="ADM-CIUD"]').waitFor();
    let t = await texto(pa);
    ok(/Ciudades/.test(t) && /Hazleton, PA/.test(t) && /Reading, PA/.test(t) && /EN LISTA DE ESPERA/.test(t) && /de la regla/.test(t), 'el listado: las cinco ciudades con su lista de espera y la regla');
    await shot(pa, 'lista-1360');
    await clic(pa.getByText('Reading, PA', { exact: true }));
    await pa.locator('[data-ciudad="rdg"]').waitFor();
    t = await texto(pa);
    ok(/ASISTENTE DE APERTURA/.test(t) && /PASO 1 · CIUDAD Y CENTRO/.test(t) && /Centro de Reading/.test(t) && /Penn Square/.test(t), 'el detalle: el asistente en el paso 1 con su evidencia (el centro de Reading)');
    ok(/BARRIOS · 6/.test(t) && /Centre Park/.test(t) && /Glenside/.test(t) && /PUEBLOS CERCANOS \(15\)/.test(t), 'los barrios y los pueblos de Reading (L64)');
    await shot(pa, 'detalle-1360');
    await clic(pa.getByRole('button', { name: 'Pasar a beta (solo invitados)' }));
    await confirmar(pa, 'Pasar a beta', 'Beta cerrada con vecinos de confianza');
    ok(await espera(() => estado() === 'beta'), 'Reading quedó en beta');
    ok(sql(`select via || '|' || (actor = '${ANA}') from city_status_log where city_id = 'rdg' order by id desc limit 1`) === 'equipo|true', 'el libro de estados: «el equipo», con quién');
    ok(sql(`select count(*) from audit_entries where action = 'ciud.beta' and target_id = 'rdg' and reason like '%ciu9i ${RUN}'`) === '1', 'la auditoría con el motivo');
    const invitar = async (tel) => {
      await pa.goto(B + '/admin/ciudades/rdg'); await pa.locator('[data-estado="beta"]').waitFor();
      await clic(pa.getByText('Invitar', { exact: true }));
      await pa.getByLabel('TELÉFONO', { exact: true }).fill(tel);
      await clic(pa.getByRole('button', { name: 'Invitar', exact: true }));
      await confirmar(pa, 'Invitar', 'Vecina de confianza');
    };
    await invitar(W3);
    ok(await espera(async () => /todavía no tiene cuenta/.test(await texto(pa))) && sql(`select count(*) from city_beta_invites i join users u on u.id = i.user_id where u.phone = '+1${W3}'`) === '0', 'un teléfono sin cuenta no se puede invitar: «todavía no tiene cuenta»');
    await invitar(VEC1);
    ok(await espera(() => sql(`select count(*) from city_beta_invites where city_id = 'rdg' and user_id = '${uid(VEC1)}' and revoked_at is null`) === '1'), 'la vecina quedó invitada a la beta de Reading');

    // ── 2 · La beta: la invitada la ve abierta; la otra persona, «próximamente» ──
    console.log('2 · La beta: la invitada ve Reading abierta; la otra persona ve «próximamente» y se anota');
    ok(await veAbierta(v1.p), 'la invitada (390) ve el Inicio de Reading, al momento de invitarla');
    await shot(v1.p, 'beta-invitada-390');
    ok(await vePronto(v2.p), 'la otra persona (390) ve «próximamente» en Reading');
    await clic(v2.p.getByText(/Avísame cuando llegue a Reading/).first());
    ok(await espera(() => sql(`select count(*) from city_waitlist where city_id = 'rdg' and user_id = '${uid(VEC2)}' and removed_at is null`) === '1'), 'y se anota en la lista de espera de Reading («Avísame»)');
    await shot(v2.p, 'beta-otra-390');

    // ── 3 · El asistente: Raúl (390), pasos 1–5; la base no deja saltarse un paso ──
    console.log('3 · El asistente: Raúl, Ciudad manager de Reading (390), confirma los pasos 1–5');
    const cr = await ctxTel(b), pr = await cr.newPage(); abiertas.push(cr); mirar(pr, 'raul');
    await entrarComo(pr, RAUL);
    const NOMBRES = ['Ciudad y centro', 'Radio y barrios', 'Categorías de arranque', 'Equipo local', 'Negocios listos'];
    for (let i = 1; i <= 5; i++) {
      await pr.goto(B + '/admin/ciudades/rdg'); await pr.locator('[data-ciudad="rdg"]').waitFor();
      t = await texto(pr);
      if (i === 4) ok(/CIUDAD MANAGER Raúl R/.test(t), 'paso 4 · la evidencia nombra al equipo local (Raúl)');
      if (i === 3) { ok(/PASO 3 · CATEGORÍAS DE ARRANQUE/.test(t) && /COMIDA/.test(t) && /IGLESIAS/.test(t) && /PASO 3 de 7/.test(t), 'en el teléfono, un paso por pantalla (3 de 7) con las categorías clave'); await shot(pr, 'paso3-390'); }
      await clic(pr.getByRole('button', { name: `Confirmar paso ${i}: ${NOMBRES[i - 1]}` }));
      await confirmar(pr, 'Confirmar', `Revisado el paso ${i}`);
      ok(await espera(() => pasos() === i), `paso ${i} confirmado (${NOMBRES[i - 1]}) con su evidencia, quién y el motivo`);
    }
    const L = sql(`select id from city_launches where city_id = 'rdg' and status = 'en_curso'`);
    ok(sql(`select evidence->'ciudadManager'->>0 from city_launch_steps where launch_id = ${L} and step = 4`) === 'Raúl R', 'la evidencia del paso 4 guarda lo que el servidor vio');
    ok(/ciudad_paso: el asistente solo avanza/.test(sqlErr(`insert into city_launch_steps (launch_id, step, city_id, done_by, evidence, reason) values (${L}, 7, 'rdg', '${ANA}', '{"x":1}', 'saltar')`)), 'saltarse un paso → no (la base)');
    ok(/ciudad_paso: un paso del asistente no se cambia/.test(sqlErr(`update city_launch_steps set reason = 'otro' where launch_id = ${L} and step = 1`)), 'un paso hecho no se cambia (la base)');
    ok(/ciudad_apertura: faltan pasos del asistente \(5 de 6/.test(sqlErr(`begin; select set_config('tl.apertura', '${L}', true); update cities set status = 'on' where id = 'rdg'; rollback;`)), 'abrir con el asistente sin «Comprobar» → no (faltan pasos)');
    ok(/ciudad_apertura: una ciudad solo abre con el asistente/.test(sqlErr(`begin; update platform_config set value = '"produccion"'::jsonb where key = 'entorno'; update schema_seeds set name = 'x' || name where name like 'pruebas/%'; update cities set status = 'on' where id = 'rdg'; rollback;`)),
      'en una base de producción, abrir sin el asistente → no');
    ok(estado() === 'beta', 'Reading sigue en beta');
    await pr.goto(B + '/admin/ciudades/rdg'); await pr.locator('[data-ciudad="rdg"]').waitFor();
    t = await texto(pr);
    ok(/PASO 6 · COMPROBAR/.test(t) && /no cumple/.test(t) && /LAUNCH · PENDIENTES DE READING/.test(t) && /COMMIT QUE CORRE/.test(t), 'paso 6 · «Comprobar»: la regla, las líneas de LAUNCH de Reading y el commit');
    ok(await pr.getByRole('button', { name: 'Confirmar paso 6: Comprobar' }).isDisabled() && !(await pr.getByRole('button', { name: /Abrir igual/ }).count()), 'Raúl no puede comprobar con la regla sin cumplir ni «Abrir igual» (es de un Admin)');
    await shot(pr, 'paso6-raul-390');

    // ── 4 · Ana abre Reading ──
    console.log('4 · Ana (Admin, 1360): «Comprobar» con «Abrir igual» y abrir Reading');
    sql(`update cities set timezone = '${huso(false)}' where id = 'rdg'`); // de noche en Reading: el aviso espera
    await pa.goto(B + '/admin/ciudades/rdg'); await pa.locator('[data-ciudad="rdg"]').waitFor();
    await clic(pa.getByRole('button', { name: 'Abrir igual (la regla no se cumple)' }));
    await confirmar(pa, 'Confirmar', 'Reading abre con las otras cuatro (decisión A)');
    ok(await espera(() => pasos() === 6), 'paso 6 confirmado con «Abrir igual»');
    ok(sql(`select (evidence->>'abrirIgual') || '|' || (evidence->'regla'->>'cumple') || '|' || (evidence->'launch'->>'leida') || '|' || (evidence->'launch'->>'sandbox') from city_launch_steps where launch_id = ${L} and step = 6`) === 'true|false|true|true',
      'su evidencia: la regla no se cumplía, se decidió abrir igual y la LAUNCH del build se leyó (en el sandbox sus líneas avisan y no frenan)');
    await pa.reload(); await pa.locator('[data-ciudad="rdg"]').waitFor();
    t = await texto(pa);
    ok(/PASO 7 · AVISAR A LA LISTA DE ESPERA/.test(t) && /PERSONAS QUE RECIBEN EL AVISO/.test(t) && /SIN CUENTA \(NO SE LES ESCRIBE\)/.test(t), 'paso 7: cuántos reciben el aviso y quién no (sin cuenta)');
    await shot(pa, 'paso7-1360');
    await clic(pa.getByRole('button', { name: 'Abrir Reading' }));
    await confirmar(pa, 'Abrir la ciudad', 'Apertura de Reading');
    ok(await espera(() => estado() === 'on'), 'Reading quedó abierta (paso 7)');
    ok(sql(`select status || '|' || (select count(*) from city_launch_steps where launch_id = ${L}) from city_launches where id = ${L}`) === 'abierta|7', 'el asistente terminó «abierta» con sus 7 pasos');
    ok(sql(`select via || '|' || launch_id from city_status_log where city_id = 'rdg' order by id desc limit 1`) === `asistente|${L}`, 'el libro de estados: «con el asistente» y cuál');
    ok(await veAbierta(v2.p), 'al instante, la otra persona ve Reading abierta (sin esperar la copia de 60 s)');
    await shot(v2.p, 'abierta-otra-390');

    // ── 5 · La lista avisada una vez ──
    console.log('5 · La lista avisada UNA vez, de día y por partes');
    const avisos = (tel) => sql(`select count(*) from notifications where tpl = 'ciudad_abierta' and user_id = '${uid(tel)}'`);
    barrer();
    ok(avisos(W1) === '0' && avisos(VEC2) === '0' && sql(`select count(*) from city_waitlist where city_id = 'rdg' and user_id = '${uid(W1)}' and notified_at is null`) === '1', 'de noche en Reading no sale ningún aviso');
    sql(`update cities set timezone = '${huso(true)}' where id = 'rdg'`);
    for (let i = 0; i < 6 && sql(`select count(*) from city_waitlist where city_id = 'rdg' and notified_at is null and removed_at is null`) !== '0'; i++) barrer();
    ok(avisos(W1) === '1' && avisos(VEC2) === '1', 'de día: la de la landing y la del «Avísame» reciben su aviso');
    ok(sql(`select string_agg(notice_result, ',' order by id) from city_waitlist where city_id = 'rdg' and (user_id in ('${uid(W1)}', '${uid(VEC2)}') or contact = '+1${W3}')`) === 'avisado,sin_cuenta,avisado', 'la lista queda marcada: avisado · sin cuenta (no se le escribe) · avisado');
    ok(sql(`select count(*) from phone_messages where created_at > now() - interval '10 minutes' and tpl = 'ciudad_abierta'`) === '0', 'al teléfono sin cuenta no le sale ningún mensaje');
    ok(sql(`select (notified_at is not null)::text from early_access where user_id = '${uid(W1)}'`) === 'true', 'la lista de la landing queda avisada (early_access.notified_at)');
    ok(sql(`select count(*) from city_notices where city_id = 'rdg' and user_id = '${uid(W1)}'`) === '1', 'una sola marca por persona y ciudad (city_notices)');
    ok(sql(`select sms_status from notifications where tpl = 'ciudad_abierta' and user_id = '${uid(W1)}'`) === 'pruebas', 'sin la app, el aviso también va por SMS (en el sandbox, «en modo pruebas»)');
    barrer(); barrer();
    ok(avisos(W1) === '1' && avisos(VEC2) === '1', 'otro barrido no repite el aviso');
    ok(avisos(VEC1) === '0', 'la invitada que no estaba en la lista no recibe el aviso');
    await v2.p.goto(B + '/avisos'); t = await texto(v2.p);
    ok(/To'Latino ya abrió en Reading/.test(t), 'el aviso está en la bandeja de quien se anotó');
    await pa.reload(); await pa.locator('[data-estado="on"]').waitFor(); t = await texto(pa);
    ok(/AVISO DE APERTURA A LA LISTA DE ESPERA/.test(t) && /SIN CUENTA/.test(t), 'el Super Admin ve el avance del aviso');
    await shot(pa, 'abierta-1360');

    // ── 6 · Cerrar pide motivo y otra persona ──
    console.log('6 · Cerrar: lo pide Ana con motivo y lo aprueba otra persona (Beto)');
    await clic(pa.getByRole('button', { name: 'Pedir cierre' }));
    await clic(pa.getByText('en beta (solo invitados)', { exact: true }));
    await confirmar(pa, 'Pedir el cierre', 'Volver a la beta');
    const X = await (async () => { await espera(() => sql(`select count(*) from city_close_requests where city_id = 'rdg' and status = 'pendiente'`) === '1'); return sql(`select id from city_close_requests where city_id = 'rdg' and status = 'pendiente'`); })();
    ok(!!X && estado() === 'on', 'el pedido queda pendiente y Reading sigue abierta');
    await pa.reload(); await pa.locator('[data-ciudad="rdg"]').waitFor(); t = await texto(pa);
    ok(/CIERRE POR APROBAR/.test(t) && !(await pa.getByRole('button', { name: 'Aprobar el cierre' }).count()) && (await pa.getByRole('button', { name: 'Retirar mi pedido' }).count()) === 1, 'quien lo pidió no lo puede aprobar (solo retirarlo)');
    ok(/ciudad_cierre: lo aprueba otra persona/.test(sqlErr(`update city_close_requests set status = 'aprobada', decided_by = requested_by where id = ${X}`)), 'la base tampoco deja que la misma persona lo apruebe');
    ok(/ciudad_cierre/.test(sqlErr(`begin; update platform_config set value = '"produccion"'::jsonb where key = 'entorno'; update schema_seeds set name = 'x' || name where name like 'pruebas/%'; select set_config('tl.cierre', '${X}', true); update cities set status = 'beta' where id = 'rdg'; rollback;`)), 'con el pedido sin aprobar, la base no la cierra');
    const cb = await ctxTel(b), pb = await cb.newPage(); abiertas.push(cb); mirar(pb, 'beto');
    await entrarComo(pb, BETO);
    await pb.goto(B + '/admin/ciudades/rdg'); await pb.locator('[data-ciudad="rdg"]').waitFor();
    await shot(pb, 'cierre-beto-390');
    await clic(pb.getByRole('button', { name: 'Aprobar el cierre' }));
    await confirmar(pb, 'Aprobar', 'De acuerdo: vuelve a la beta');
    ok(await espera(() => estado() === 'beta'), 'otra persona (Beto, 390) lo aprueba: Reading vuelve a beta');
    ok(sql(`select via || '|' || close_id from city_status_log where city_id = 'rdg' order by id desc limit 1`) === `cierre|${X}`, 'el libro de estados: «cierre aprobado» y cuál');
    ok(await vePronto(v2.p) && await veAbierta(v1.p), 'al instante: la otra persona ve «próximamente» y la invitada sigue viéndola abierta');
    await pa.goto(B + '/admin/ciudades/rdg'); await pa.locator('[data-estado="beta"]').waitFor();
    await clic(pa.getByRole('button', { name: 'Quitar' }).first());
    await confirmar(pa, 'Quitar', 'Terminó su prueba');
    ok(await espera(() => sql(`select count(*) from city_beta_invites where city_id = 'rdg' and user_id = '${uid(VEC1)}' and revoked_at is null`) === '0'), 'quitar la invitación (nada se borra: queda «quitada»)');
    ok(await vePronto(v1.p), 'sin invitación, la vecina ve «próximamente»');

    // ── 7 · Los barrios de las cinco en el selector ──
    console.log('7 · Los barrios de las cinco ciudades en el selector');
    const BAR = [['Allentown, PA', 'Old Allentown'], ['Wilkes-Barre, PA', 'Parsons'], ['Scranton, PA', 'Green Ridge'], ['Reading, PA', 'Centre Park']];
    const cs = await ctxDesk(b), ps = await cs.newPage(); abiertas.push(cs); mirar(ps, 'selector');
    await cs.addCookies([{ name: 'tl_loc', value: 'hzl|centro|5', url: B }]);
    await ps.goto(B + '/?ciudad'); await ps.getByText('¿Dónde buscas?').first().waitFor();
    ok(await espera(async () => (await ps.getByText('North End', { exact: true }).count()) > 0, 6000), 'Hazleton, PA: el selector ofrece sus barrios (North End)');
    // Las ciudades que todavía no abren no ofrecen «desde dónde medimos» (como el prototipo: «Ver Reading»); sus barrios salen en la búsqueda de lugar.
    const Q = 'Dirección, barrio, ciudad o código postal';
    for (const [c, z] of BAR) {
      await ps.getByLabel(Q).first().fill(z);
      ok(await espera(async () => (await ps.getByText(z, { exact: true }).count()) > 0, 6000), `${c}: la búsqueda del selector encuentra su barrio (${z})`);
      if (c === 'Allentown, PA') await shot(ps, 'selector-allentown-1360', false);
    }
    const ct = await ctxTel(b), pt = await ct.newPage(); abiertas.push(ct); mirar(pt, 'selector-390');
    await pt.goto(B + '/?ciudad'); await pt.getByText('¿Dónde buscas?').first().waitFor();
    await pt.getByLabel(Q).first().fill('Hill Section');
    ok(await espera(async () => (await pt.getByText('Hill Section', { exact: true }).count()) > 0, 6000), 'en el teléfono también (Scranton: Hill Section)');
    await shot(pt, 'selector-scranton-390');
    ok(!err.length, `sin errores en las páginas (${err.join(' | ').slice(0, 300) || 'ninguno'})`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
    // Reading vuelve a como estaba (su huso y su estado); lo que la corrida creó queda con su historial (nada se borra).
    try { sql(`update cities set timezone = '${tz0}' where id = 'rdg'`); } catch { /* */ }
    try { sql(`update city_launches set status = 'cancelada', cancelled_by = '${uid(ADM)}', cancel_reason = 'Limpieza de ciu9i' where city_id = 'rdg' and status = 'en_curso'`); } catch { /* */ }
    try { sql(`update city_close_requests set status = 'retirada', decision_reason = 'Limpieza de ciu9i' where city_id = 'rdg' and status = 'pendiente'`); } catch { /* */ }
    try { if (estado() !== st0) sql(`update cities set status = '${st0}' where id = 'rdg'`); } catch { /* */ }
  }
  console.log(`\nciu9i: ${n} ✓`);
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
