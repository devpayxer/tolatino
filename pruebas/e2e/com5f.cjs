// 5f · Puntos, rangos, insignias y Tabla del Barrio. Teléfono 390 y escritorio 1360. Cuentas nuevas por corrida para quien gana puntos
// (P autora, Q pregunta, N invitada: el libro es de solo inserción y el rango solo sube); votantes fijos con un dispositivo cada uno.
// 1 voto + → +2 y progreso · quitar → asiento inverso · otra vez → +2 · cuenta 2 en el MISMO dispositivo de un votante → callado, sin
// puntos · cuenta en el dispositivo de la autora → sin puntos · voto en lo oficial → nadie gana · «Me sirvió» +10 · reseña verificada +15
// (y «+15 PUNTOS» en la tarjeta) · primera recomendación de un negocio con 3 votos +50 una vez · el admin ajusta + con motivo (auditado) →
// voto que cruza 100 → Vecino con aviso · tope 100 del día (lo que pasa no se guarda; 101 por insert directo → rechazado) · ocultar por las
// reglas → se restan · apelación levantada (otra persona) → vuelven · Tabla: orden igual a SQL, pestañas, mi lugar, excluido no sale,
// cuenta oficial nunca · admin «Cerrar el mes» → aviso a los 3 y General del Barrio · renombrar un rango (vista previa) → la Comunidad lo
// muestra · invitar: código NOMBRE-N y enlace → invitado «SE UNIÓ». Sin errores de consola. Deja todo como estaba (lo que el libro guarda
// queda como historia, revertido).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const TAG = '[c5f]';
const ADM = '5705550199', ADM2 = '5705550188', V = ['5705550751', '5705550752', '5705550753', '5705550754', '5705550755'], D2 = '5705550761', D3 = '5705550762';
const libre = (pre) => { for (;;) { const t = pre + String(Math.floor(Math.random() * 1000)).padStart(3, '0'); if (!sql(`select 1 from users where phone = '+1${t}'`)) return t; } };
const P_ = libre('5705558'), Q_ = libre('5705558'), N_ = libre('5705558');
const total = (u) => +sql(`select coalesce((select points_total from community_profiles where user_id = '${u}'), 0)`);
const hoyBruto = (u) => +sql(`select coalesce(sum(delta), 0) from points_entries e join users x on x.id = e.user_id join cities c on c.id = x.home_city_id where e.user_id = '${u}' and e.motive = 'regla' and e.delta > 0 and e.local_day = (now() at time zone c.timezone)::date`);
const tarjeta = (p, t) => p.locator('[data-screen-label="Publicación · comentario"], [data-screen-label="Publicación · la más votada"]').filter({ hasText: t }).first();

(async () => {
  require('../lib/negocio-nuevo.cjs').equipo('5705550188'); // 9b-1 · el equipo de prueba que esta prueba usa (antes lo creaba otra prueba)
  const b = await chromium.launch(); const err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 404|status of 503|pexels/.test(m.text())) err.push('console: ' + m.text()); }); };
  const tel = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); mira(p); return p; };
  const esc = async () => { const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); mira(p); return p; };
  const vecino = (t, nombre) => {
    const id = uid(t);
    sql(`insert into community_profiles (user_id) values ('${id}') on conflict do nothing`);
    sql(`update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true, adult_ok_at = coalesce(adult_ok_at, now()), welcome_at = coalesce(welcome_at, now()) where user_id = '${id}'`);
    sql(`update users set status = 'active', status_until = null, status_reason = null, home_city_id = 'hzl', zone_id = null where id = '${id}'`);
    return id;
  };
  const preparar = async (p, t, nombre) => { await entrar(p, t); await api(p, '/api/cuenta/perfil', { nombre, apellido: 'Prueba' }); return vecino(t, nombre); };

  // ── Preparación: lo de corridas anteriores queda borrado (estado); autora P, quien pregunta Q, votantes (uno por dispositivo) y los dos admin ──
  sql(`update com_posts set status = 'deleted', deleted_at = coalesce(deleted_at, now()) where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update com_comments set status = 'deleted', deleted_at = coalesce(deleted_at, now()) where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update reviews set status = 'removed', hidden_at = now(), hidden_reason = 'autor' where body like 'La cena para dos estuvo buenísima%' and status = 'visible'`);
  const pp = await tel(); const RP = await preparar(pp, P_, 'Paola');
  const qp = await tel(); const RQ = await preparar(qp, Q_, 'Quique');
  const vp = []; for (let i = 0; i < V.length; i++) { const p = await tel(); vp.push({ p, id: await preparar(p, V[i], 'Votante' + (i + 1)) }); }
  ok(total(RP) === 0 && sql(`select rank_level from community_profiles where user_id = '${RP}'`) === '1', `autora nueva (${P_}): 0 puntos, Recluta`);
  sql(`update user_blocks set removed_at = now() where removed_at is null and (user_id in ('${RP}', '${RQ}') or target_user_id in ('${RP}', '${RQ}'))`);
  // La pregunta de P (fixture: publicada hace 1 h) y su respuesta en la pregunta de Q.
  const PQ = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, publish_at, created_at) values ('hzl', 'user', '${RP}', 'pregunta', 'comida', '¿Dónde venden pastelitos de yuca los domingos en Hazleton? ${TAG}', now() - interval '1 hour', now() - interval '1 hour') returning id`).split('\n')[0];
  const QQ = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, publish_at, created_at) values ('hzl', 'user', '${RQ}', 'pregunta', 'hogar', '¿Quién arregla calentadores de agua por aquí? ${TAG}', now() - interval '2 hours', now() - interval '2 hours') returning id`).split('\n')[0];
  const QC = sql(`insert into com_comments (post_id, author_user_id, body) values (${QQ}, '${RP}', 'A mí me lo arregló un plomero de la Wyoming, rápido y barato ${TAG}') returning id`).split('\n')[0];

  // ── 1 · Un voto + en mi publicación → +2 y el progreso; quitarlo → asiento inverso; otra vez → +2 (idempotente) ──
  const v1 = vp[0].p;
  await v1.goto(B + '/comunidad/p/' + PQ); await v1.getByRole('button', { name: 'Votar a favor' }).first().waitFor();
  await clic(v1.getByRole('button', { name: 'Votar a favor' }));
  ok(await espera(() => total(RP) === 2) && sql(`select rule_key || ':' || delta || ':' || target_id from points_entries where user_id = '${RP}' order by id desc limit 1`) === `voto_post:2:${PQ}`, 'voto + en mi publicación → +2 (voto_post) en el libro');
  ok(sql(`select points || ':' || recs || ':' || answers from monthly_boards mb join cities c on c.id = mb.city_id where mb.user_id = '${RP}' and mb.month = date_trunc('month', (now() at time zone c.timezone)::date)::date`) === '2:0:0', 'la Tabla del mes de su ciudad suma lo mismo (derivada)');
  await pp.goto(B + '/comunidad/rango'); await pp.getByText('LA ESCALERA DEL BARRIO').waitFor();
  ok(await contiene(pp, '2 / 100 PTS') && await contiene(pp, '1 / 5 VOTOS + EN UNA PUBLICACIÓN') && await contiene(pp, 'Voto + en tu publicación'), 'Tu rango: «Para Vecino» con 2 / 100 puntos y 1 / 5 votos');
  await pp.screenshot({ path: OUT + 'c5f-rango-m.png', fullPage: true });
  await clic(v1.getByRole('button', { name: 'Votar a favor' }));
  ok(await espera(() => total(RP) === 0) && sql(`select motive || ':' || delta || ':' || reason from points_entries where user_id = '${RP}' order by id desc limit 1`) === 'reverso:-2:voto', 'quitar el voto → asiento inverso (−2), nada se borra');
  await clic(v1.getByRole('button', { name: 'Votar a favor' }));
  ok(await espera(() => total(RP) === 2) && sql(`select count(*) from points_entries where user_id = '${RP}' and ref_id = 'post:${PQ}:${vp[0].id}'`) === '3', 'votar otra vez → +2 (una cadena: +2 −2 +2; neto 2)');

  // ── 2 · Mismo dispositivo: otra cuenta en el teléfono de V1 → voto callado, sin puntos; otra cuenta en el teléfono de P → sin puntos ──
  const RD2 = await preparar(v1, D2, 'Doble');
  await v1.goto(B + '/comunidad/p/' + PQ); await v1.getByRole('button', { name: 'Votar a favor' }).first().waitFor();
  await clic(v1.getByRole('button', { name: 'Votar a favor' }));
  ok(await espera(() => sql(`select counted from com_votes where target_kind = 'post' and target_id = ${PQ} and user_id = '${RD2}'`) === 'f') && total(RP) === 2, 'segunda cuenta en el mismo dispositivo que vota → callado y sin puntos');
  const RD3 = await preparar(pp, D3, 'Prestado');
  await pp.goto(B + '/comunidad/p/' + PQ); await pp.getByRole('button', { name: 'Votar a favor' }).first().waitFor();
  await clic(pp.getByRole('button', { name: 'Votar a favor' }));
  ok(await espera(() => sql(`select counted from com_votes where target_kind = 'post' and target_id = ${PQ} and user_id = '${RD3}'`) === 't') && total(RP) === 2 && sql(`select count(*) from points_entries where ref_id = 'post:${PQ}:${RD3}'`) === '0', 'cuenta que usó el dispositivo de la autora → el voto cuenta para el orden, pero no da puntos');
  await entrar(pp, P_);
  // Lo de la cuenta oficial: nadie gana puntos con sus votos.
  const OF = sql(`select id from com_posts where author_kind = 'official' and city_id = 'hzl' and status = 'visible' order by id limit 1`);
  if (OF) { const n0 = sql('select count(*) from points_entries'); await vp[1].p.goto(B + '/comunidad/p/' + OF); await vp[1].p.getByRole('button', { name: 'Votar a favor' }).first().waitFor(); await clic(vp[1].p.getByRole('button', { name: 'Votar a favor' }));
    ok(await espera(() => sql(`select count(*) from com_votes where target_kind = 'post' and target_id = ${OF} and user_id = '${vp[1].id}'`) !== '0') && sql('select count(*) from points_entries') === n0, 'votar lo de la cuenta oficial → nadie gana puntos');
    await clic(vp[1].p.getByRole('button', { name: 'Votar a favor' })); }

  // ── 3 · Más votos de dispositivos distintos (V2–V5): +2 cada uno ──
  for (const v of vp.slice(1)) { await v.p.goto(B + '/comunidad/p/' + PQ); await v.p.getByRole('button', { name: 'Votar a favor' }).first().waitFor(); await clic(v.p.getByRole('button', { name: 'Votar a favor' })); }
  ok(await espera(() => total(RP) === 10) && sql(`select up_n from com_posts where id = ${PQ}`) === '6', '4 votos más de otros dispositivos → 10 puntos; la publicación tiene 6 votos + (5 dan puntos)');

  // ── 4 · «Me sirvió» → +10 a quien respondió ──
  await qp.goto(B + '/comunidad/p/' + QQ); await tarjeta(qp, 'plomero de la Wyoming').waitFor();
  await clic(tarjeta(qp, 'plomero de la Wyoming').getByText('Me sirvió', { exact: true }));
  ok(await espera(() => total(RP) === 20) && sql(`select rule_key || ':' || delta || ':' || tab from points_entries where user_id = '${RP}' order by id desc limit 1`) === 'me_sirvio:10:ans', '«Me sirvió» → +10 (cuenta en Respuestas)');

  // ── 5 · Reseña verificada → +15 y «+15 PUNTOS» en la tarjeta ──
  const NUM = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, pay_mode, client_key, is_test, scheduled_at, done_at, details)
    values ('R-' || nextval('operations_table_seq'), 'table', 'hzl', 'sabor-dominicano', '${RP}', 'done', 'local', gen_random_uuid(), true, now() - interval '3 hours', now() - interval '1 hour', '{"party": 2}'::jsonb) returning number`).split('\n')[0];
  await pp.goto(B + `/n/sabor-dominicano/resena?pedido=${NUM}`); await pp.getByLabel('Tu reseña').first().waitFor();
  await clic(pp.getByRole('button', { name: '5 ★', exact: true }));
  await (await vis(pp.getByLabel('Tu reseña'))).fill('La cena para dos estuvo buenísima, el mofongo llegó caliente y nos atendieron muy bien.');
  await clic(pp.getByRole('button', { name: /^Publicar/ }));
  ok(await espera(() => total(RP) === 35) && sql(`select rule_key || ':' || delta from points_entries where user_id = '${RP}' order by id desc limit 1`) === 'resena_verificada:15', 'reseña verificada (de su mesa) → +15');
  const REV = sql(`select id from reviews where user_id = '${RP}' and business_id = 'sabor-dominicano' and status = 'visible'`);
  await pp.goto(B + '/n/sabor-dominicano?tab=rev'); ok(await contiene(pp, '1 RESEÑA · +15 PUNTOS'), 'la tarjeta de su reseña dice «1 RESEÑA · +15 PUNTOS»');
  await pp.screenshot({ path: OUT + 'c5f-resena-m.png', fullPage: false });

  // ── 6 · Primera recomendación de un negocio con 3 votos → +50, una sola vez ──
  const BIZ = sql(`select b.id from businesses b where b.city_id = 'hzl' and b.status = 'active' and not exists (select 1 from com_posts p where p.business_id = b.id) and not exists (select 1 from com_comments c where c.business_id = b.id)
    and not exists (select 1 from business_members m where m.user_id = '${RP}' and m.business_id = b.id) and not exists (select 1 from points_entries e where e.rule_key = 'primera_rec' and e.ref_id = 'hzl:' || b.id) order by b.id limit 1`);
  const PR = sql(`insert into com_posts (city_id, author_kind, author_user_id, kind, body, business_id, publish_at, created_at) values ('hzl', 'user', '${RP}', 'recomendacion', 'Muy recomendado: cumplen lo que dicen y te tratan bien ${TAG}', '${BIZ}', now() - interval '30 minutes', now() - interval '30 minutes') returning id`).split('\n')[0];
  for (const v of vp.slice(0, 3)) { if (v === vp[0]) await entrar(v.p, V[0]); await v.p.goto(B + '/comunidad/p/' + PR); await v.p.getByRole('button', { name: 'Votar a favor' }).first().waitFor(); await clic(v.p.getByRole('button', { name: 'Votar a favor' })); }
  ok(await espera(() => total(RP) === 94) && sql(`select count(*) from points_entries where user_id = '${RP}' and rule_key = 'yo_tambien'`) === '3' && sql(`select count(*) from points_entries where rule_key = 'primera_rec' and ref_id = 'hzl:${BIZ}'`) === '1',
    '3 votos en su recomendación → +3 cada uno (Recomendaciones) y +50 de la primera recomendación del negocio con 3 votos');

  // ── 7 · El admin ajusta + con motivo (auditado y avisado); un voto cruza 100 → Vecino con aviso ──
  const ad = await esc(); await entrar(ad, ADM);
  await ad.goto(B + `/admin/usuarios/${RP}?tab=comunidad&sub=pym`) /* 5i: Puntos y monedas es una sub-pestaña */; await ad.getByText('PUNTOS Y RANGO').waitFor();
  ok(await contiene(ad, 'RANGO ACTUAL') && await contiene(ad, 'Máximo 100 puntos al día'), 'Usuarios 360° › Comunidad › Puntos: rango, puntos y la regla');
  await clic(ad.getByRole('button', { name: 'Ajustar puntos' }));
  await clic(ad.getByText('Sumar', { exact: true })); await ad.getByLabel('CANTIDAD').fill('9000');
  await clic(ad.getByText('Error del sistema', { exact: true })); await clic(ad.getByRole('button', { name: 'Aplicar' }));
  ok(await contiene(ad, 'Tu rol ajusta hasta 5,000 puntos de una vez.'), 'tope por rol: más de 5,000 de una vez → no');
  await ad.getByLabel('CANTIDAD').fill('4'); await clic(ad.getByRole('button', { name: 'Aplicar' }));
  ok(await espera(() => total(RP) === 98) && sql(`select count(*) from audit_entries where action = 'gam.puntos.ajustar' and target_id = '${RP}' and reason = 'Error del sistema'`) === '1'
    && sql(`select count(*) from notifications where user_id = '${RP}' and tpl = 'gam_ajuste'`) === '1', 'ajuste +4 con motivo → libro (ajuste), auditoría y aviso a la persona');
  await ad.goto(B + `/admin/usuarios/${RP}?tab=comunidad&sub=pym`) /* 5i: Puntos y monedas es una sub-pestaña */; await ad.getByText('PUNTOS · MOVIMIENTOS').waitFor();
  ok(await contiene(ad, 'Ajuste del equipo: Error del sistema'), 'el 360° lista el ajuste con quién y el motivo');
  await ad.screenshot({ path: OUT + 'c5f-u360-puntos-d.png', fullPage: true });
  await qp.goto(B + '/comunidad/p/' + PQ); await qp.getByRole('button', { name: 'Votar a favor' }).first().waitFor(); await clic(qp.getByRole('button', { name: 'Votar a favor' }));
  ok(await espera(() => total(RP) === 100 && sql(`select rank_level from community_profiles where user_id = '${RP}'`) === '2'), 'un voto más → 100 puntos y una publicación con 5+ votos → sube a Vecino (2)');
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RP}' and tpl = 'gam_rank' and body like 'Ahora eres Vecino%'`) === '1'), 'aviso «Subiste de rango · Ahora eres Vecino…»');
  await pp.goto(B + '/comunidad/rango'); ok(await contiene(pp, 'RANGO 2 DE 10') && await contiene(pp, 'Para Cabo'), 'Tu rango: Vecino, «Para Cabo»');

  // ── 8 · Tope del día: 100; lo que pasa no se guarda ──
  const bruto = hoyBruto(RP);
  await vp[0].p.goto(B + '/comunidad/p/' + QQ); await tarjeta(vp[0].p, 'plomero de la Wyoming').waitFor();
  await clic(tarjeta(vp[0].p, 'plomero de la Wyoming').locator('div[style*="height: 34px"], div[style*="height:34px"]').first().locator('> span').first());
  ok(await espera(() => hoyBruto(RP) === bruto + 1), `voto + en su comentario → +1 (lleva ${bruto + 1} de 100 hoy)`);
  const resto = +sql(`select pts_sumar('${RP}', 'me_sirvio', 'e2e', '${Date.now()}', null, null, 'ans')`);
  ok(resto === 100 - (bruto + 1) && hoyBruto(RP) === 100, `«Me sirvió» de +10 con ${100 - bruto - 1} de espacio → se guardan ${resto} (lo que pasa del tope no se guarda)`);
  const t100 = total(RP);
  await entrar(vp[3].p, V[3]); await vp[3].p.goto(B + '/comunidad/p/' + PR); await vp[3].p.getByRole('button', { name: 'Votar a favor' }).first().waitFor(); await clic(vp[3].p.getByRole('button', { name: 'Votar a favor' }));
  ok(await espera(() => sql(`select up_n from com_posts where id = ${PR}`) === '4') && total(RP) === t100 && sql(`select count(*) from points_entries where rule_key = 'primera_rec' and ref_id = 'hzl:${BIZ}'`) === '1', 'ya en 100 hoy: un voto más no suma y la primera recomendación no se paga otra vez');
  ok(/tope diario/.test(sqlErr(`select set_config('tl.puntos', 'si', false); insert into points_entries (user_id, city_id, delta, rule_key, motive, ref_kind, ref_id, month_key, local_day) select '${RP}', 'hzl', 1, 'voto_post', 'regla', 'e2e', 'x${Date.now()}', date_trunc('month', (now() at time zone 'America/New_York')::date)::date, (now() at time zone 'America/New_York')::date`)), 'el punto 101 del día por insert directo → la base lo rechaza');
  ok(/solo de inserción/.test(sqlErr(`update points_entries set delta = 50 where user_id = '${RP}'`)) && /solo de inserción/.test(sqlErr(`delete from points_entries where user_id = '${RP}'`)), 'el libro no se cambia ni se borra');
  ok(/derivados/.test(sqlErr(`update community_profiles set rank_level = 9 where user_id = '${RP}'`)) && /derivados/.test(sqlErr(`update community_profiles set points_total = 5000 where user_id = '${RP}'`)), 'rango y puntos a mano → la base lo rechaza');
  await pp.goto(B + '/comunidad/rango'); ok(await contiene(pp, '100 DE 100 HOY'), 'Tu rango: «100 DE 100 HOY»');

  // ── 9 · Ocultar por las reglas → se restan; apelación levantada por otra persona → vuelven ──
  const antesOc = total(RP);
  await ad.goto(B + `/admin/contenido?tab=pub&q=${encodeURIComponent('Muy recomendado: cumplen')}`); await ad.getByText('Publicaciones').first().waitFor();
  await clic(ad.getByText('Ocultar', { exact: true })); await clic(ad.getByText('Spam o publicidad')); await clic(ad.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select status from com_posts where id = ${PR}`) === 'hidden') && await espera(() => total(RP) === antesOc - 59), 'el equipo oculta la recomendación → se restan sus 59 puntos (3 votos + la primera recomendación)');
  ok(sql(`select count(*) from points_entries where user_id = '${RP}' and target_id = '${PR}' and motive = 'reverso' and reason = 'oculto'`) === '4', 'cuatro asientos inversos con el motivo «oculto»');
  await pp.goto(B + `/cuenta/moderacion?k=com_post&id=${PR}`); await pp.getByLabel('POR QUÉ ES UN ERROR').waitFor();
  await pp.getByLabel('POR QUÉ ES UN ERROR').fill('Es mi experiencia de verdad con ese negocio, no es publicidad ni me pagan.');
  await clic(pp.getByRole('button', { name: 'Enviar apelación' })); ok(await contiene(pp, 'Recibimos tu apelación. Te respondemos en 72 h.'), 'la autora apela');
  const AP = sql(`select id from appeals where user_id = '${RP}' and target_kind = 'com_post' and target_id = '${PR}'`);
  const QA = sql(`select id from queue_items where queue = 'apel' and subject_id = '${AP}' and status = 'open'`);
  const ad2 = await esc(); await entrar(ad2, ADM2);
  await ad2.goto(B + '/admin/colas?caso=' + QA); await ad2.getByText('LO QUE ESCRIBIÓ').first().waitFor();
  await clic(ad2.getByRole('button', { name: 'Levantar' })); await clic(ad2.getByText('Tenía razón: no rompe las reglas', { exact: true })); await clic(ad2.getByRole('button', { name: 'Levantar' }));
  ok(await espera(() => sql(`select status from com_posts where id = ${PR}`) === 'visible') && await espera(() => total(RP) === antesOc), 'otra persona del equipo levanta la apelación → vuelve y sus 59 puntos también');
  ok(sql(`select count(*) from points_entries where user_id = '${RP}' and target_id = '${PR}' and motive = 'restaurado'`) === '4', 'cuatro asientos «restaurado» (el inverso del inverso)');

  // ── 10 · La Tabla del Barrio: orden = SQL, pestañas, mi lugar, excluido no sale, cuenta oficial nunca ──
  const orden = (col) => sql(`select u.first_name || ' ' || left(u.last_name, 1) || '.' from monthly_boards mb join users u on u.id = mb.user_id join cities c on c.id = mb.city_id
    where mb.city_id = 'hzl' and mb.month = date_trunc('month', (now() at time zone c.timezone)::date)::date and not mb.excluded and mb.${col} > 0 and u.phone not like '+1570555075%' and u.phone not like '+1570555076%'
      and not exists (select 1 from user_blocks ub where ub.removed_at is null and ub.kind = 'block' and ((ub.user_id = '${RP}' and ub.target_user_id = u.id) or (ub.user_id = u.id and ub.target_user_id = '${RP}')))
    order by mb.${col} desc, mb.user_id limit 12`).split('\n').filter(Boolean);
  const filas = async (p) => (await p.$$eval('[data-fila]', (els) => els.map((e) => [e.getAttribute('data-fila'), e.innerText.replace(/\s+/g, ' ')])));
  const cuadra = async (p, col) => { const F = await filas(p), O = orden(col); return O.length > 0 && O.every((n, i) => F[i] && F[i][1].includes(n.replace(' Prueba', ''))) ; };
  await pp.goto(B + '/comunidad/tabla'); await pp.getByText('Tabla del Barrio').first().waitFor();
  ok(await cuadra(pp, 'points'), 'General: el orden de la pantalla es el de la base (puntos del mes, y luego persona)');
  const pos = sql(`select count(*) + 1 from monthly_boards o join cities c on c.id = o.city_id where o.city_id = 'hzl' and o.month = date_trunc('month', (now() at time zone c.timezone)::date)::date and not o.excluded and o.points > 0 and (o.points > (select points from monthly_boards m where m.user_id = '${RP}' and m.month = o.month and m.city_id = 'hzl') or (o.points = (select points from monthly_boards m where m.user_id = '${RP}' and m.month = o.month and m.city_id = 'hzl') and o.user_id < '${RP}'))`);
  ok(await contiene(pp, `Vas #${pos} con`), `mi lugar: «Vas #${pos} con … puntos»`);
  ok(!(await texto(pp)).includes("To'Latino Hazleton") && sql(`select count(*) from monthly_boards mb left join users u on u.id = mb.user_id where u.id is null`) === '0', 'la cuenta oficial no está en la Tabla (ni en la base)');
  await pp.screenshot({ path: OUT + 'c5f-tabla-m.png', fullPage: true });
  await clic(pp.getByRole('button', { name: 'Recomendaciones' })); await pp.waitForURL(/t=rec/); await pp.waitForTimeout(400);
  ok(await cuadra(pp, 'recs'), 'Recomendaciones: el orden es el de la base');
  await clic(pp.getByRole('button', { name: 'Respuestas' })); await pp.waitForURL(/t=resp/); await pp.waitForTimeout(400);
  ok(await cuadra(pp, 'answers'), 'Respuestas: el orden es el de la base');
  // El admin excluye a Héctor del mes en curso → no sale; aviso con motivo.
  const RH = uid('5705557008');
  await ad.goto(B + '/admin/gamificacion?tab=tabla'); await ad.getByText('MES · HAZLETON').waitFor();
  await ad.screenshot({ path: OUT + 'c5f-admin-tabla-d.png', fullPage: true });
  const fila = ad.locator('div').filter({ has: ad.getByText(/^\d+ · Héctor Vargas$/) }).filter({ has: ad.getByRole('button', { name: 'Excluir' }) }).last();
  await clic(fila.getByRole('button', { name: 'Excluir' })); await clic(ad.getByText('Anillo de votos', { exact: true })); await clic(ad.getByRole('button', { name: 'Excluir' }));
  ok(await espera(() => sql(`select excluded from monthly_boards mb join cities c on c.id = mb.city_id where mb.user_id = '${RH}' and mb.month = date_trunc('month', (now() at time zone c.timezone)::date)::date`) === 't')
    && sql(`select count(*) from audit_entries where action = 'gam.tabla.excluir' and target_id = '${RH}' and reason = 'Anillo de votos'`) !== '0', 'el admin excluye con motivo (auditoría)');
  ok(await espera(() => sql(`select count(*) from notifications where user_id = '${RH}' and tpl = 'gam_excluido' and created_at > now() - interval '2 minutes'`) !== '0'), 'la persona excluida recibe el aviso con el motivo');
  await pp.goto(B + '/comunidad/tabla'); await pp.getByText('Tabla del Barrio').first().waitFor();
  ok(!(await texto(pp)).includes('Héctor V.') && await cuadra(pp, 'points'), 'el excluido no sale y el orden sigue cuadrando con la base');
  const pd = await esc(); await entrar(pd, P_);
  await pd.goto(B + '/comunidad/tabla'); await pd.getByText('Tabla del Barrio').first().waitFor(); await pd.screenshot({ path: OUT + 'c5f-tabla-d.png', fullPage: true });
  await pd.goto(B + '/comunidad/rango'); await pd.getByText('LA ESCALERA DEL BARRIO').waitFor(); await pd.screenshot({ path: OUT + 'c5f-rango-d.png', fullPage: true });
  await ad.goto(B + '/admin/gamificacion?tab=tabla'); await ad.getByText('MES · HAZLETON').waitFor();
  await clic(ad.locator('div').filter({ has: ad.getByText('— Héctor Vargas', { exact: true }) }).filter({ has: ad.getByRole('button', { name: 'Volver a incluir' }) }).last().getByRole('button', { name: 'Volver a incluir' }));
  await clic(ad.getByText('Revisamos y no hubo trampa', { exact: true })); await clic(ad.getByRole('button', { name: 'Volver a incluir' }));
  ok(await espera(() => sql(`select excluded from monthly_boards mb join cities c on c.id = mb.city_id where mb.user_id = '${RH}' and mb.month = date_trunc('month', (now() at time zone c.timezone)::date)::date`) === 'f'), 'volver a incluir (deja la Tabla como estaba)');

  // ── 11 · «Cerrar el mes» (Admin): los 3 primeros reciben el aviso y quien ya es Comandante toma la plaza de General del Barrio ──
  // Estado de la prueba: el mes anterior de Hazleton lo cerró la semilla; se reabre solo aquí (SQL de prueba) para cerrarlo desde la pantalla.
  const ANT = sql(`select to_char(date_trunc('month', (now() at time zone 'America/New_York')::date) - interval '1 month', 'YYYY-MM-DD')`);
  sql(`alter table board_closures disable trigger board_closures_guardia; update board_closures set closed_at = null, closed_by = null, report = '{}' where city_id = 'hzl' and month = '${ANT}'; alter table board_closures enable trigger board_closures_guardia;`);
  sql(`select com_derivados_on(); update monthly_boards set position = null, seat = false, prize_coins = 0 where city_id = 'hzl' and month = '${ANT}'`);
  sql(`delete from user_badges where badge_key = 'top_mes' and month = '${ANT}'`);
  const RR = uid('5705557001'); sql(`select pts_rango('${RR}')`);
  ok(sql(`select rank_level from community_profiles where user_id = '${RR}'`) === '8', 'con el mes reabierto, Ramón vuelve a Comandante (la plaza sale del cierre)');
  await ad.goto(B + '/admin/gamificacion?tab=tabla&m=anterior'); await ad.getByText('está congelado').first().waitFor();
  await clic(ad.getByText('Cerrar el mes', { exact: true }));
  ok(await contiene(ad, '1 · la tabla queda fija · 2 · los excluidos no reciben premio · 3 · se avisa a los 3 primeros'), '«Cerrar el mes» con sus 4 pasos');
  await clic(ad.getByText('Revisión de fraude terminada', { exact: true }));
  await ad.screenshot({ path: OUT + 'c5f-admin-cerrar-d.png', fullPage: true });
  const T1 = sql('select now()');
  await clic(ad.getByRole('button', { name: 'Cerrar el mes' }));
  ok(await espera(() => sql(`select closed_at is not null from board_closures where city_id = 'hzl' and month = '${ANT}'`) === 't') && sql(`select count(*) from audit_entries where action = 'gam.tabla.cerrar' and target_id = 'hzl:${ANT}'`) !== '0', 'el mes queda cerrado (auditoría)');
  const top = sql(`select string_agg(u.phone, ',' order by mb.position) from monthly_boards mb join users u on u.id = mb.user_id where mb.city_id = 'hzl' and mb.month = '${ANT}' and mb.position <= 3`);
  ok(top === '+15705557002,+15705557001,+15705557003', 'los 3 primeros: Altagracia, Ramón y Carmen');
  ok(await espera(() => sql(`select count(*) from notifications where tpl = 'gam_top3' and ref_id like 'hzl:${ANT}:%' and created_at >= '${T1}'`) === '3'), 'los 3 reciben «Quedaste entre los 3 primeros»');
  ok(sql(`select rank_level from community_profiles where user_id = '${RR}'`) === '10' && sql(`select body like '%General del Barrio%' from notifications where user_id = '${RR}' and tpl = 'gam_top3' order by id desc limit 1`) === 't', 'Ramón (Comandante) → General del Barrio, y el aviso lo dice');
  ok(sql(`select cp.rank_level from community_profiles cp join users u on u.id = cp.user_id where u.phone = '+15705557002'`) === '9', 'Altagracia sigue Coronel (lo da el equipo)');
  ok(/ya se cerró/.test(sqlErr(`select * from tabla_cerrar('hzl', '${ANT}', null, 200)`)) && /no cambia/.test(sqlErr(`update board_closures set closed_at = now() where city_id = 'hzl' and month = '${ANT}'`)), 'un mes cerrado no se cierra otra vez ni cambia');

  // ── 12 · Renombrar un rango con vista previa → la Comunidad lo muestra; se deja como estaba ──
  await ad.goto(B + '/admin/gamificacion'); await ad.getByText('LA ESCALERA', { exact: false }).count();
  await clic(ad.locator('div').filter({ has: ad.getByText('2 · Vecino', { exact: true }) }).filter({ has: ad.getByRole('button', { name: 'Cambiar nombre' }) }).last().getByRole('button', { name: 'Cambiar nombre' }));
  await ad.getByLabel('NOMBRE EN ESPAÑOL').fill('Vecino del barrio'); await ad.getByLabel('NOMBRE EN INGLÉS').fill('Block neighbor');
  ok(await contiene(ad, '2 · VECINO DEL BARRIO'), 'vista previa del nombre nuevo');
  await clic(ad.getByText('Más claro para los vecinos', { exact: true }));
  await ad.screenshot({ path: OUT + 'c5f-admin-renombrar-d.png', fullPage: true });
  await clic(ad.getByRole('button', { name: 'Guardar' }));
  ok(await espera(() => sql(`select name->>'es' from ranks where level = 2`) === 'Vecino del barrio') && sql(`select count(*) from audit_entries where action = 'gam.rango.renombrar' and target_id = '2'`) !== '0', 'guardado con auditoría');
  await pp.goto(B + '/comunidad'); ok(await contiene(pp, 'Vecino del barrio'), 'la Comunidad ya lo muestra (pastilla del rango)');
  await ad.goto(B + '/admin/gamificacion'); await ad.screenshot({ path: OUT + 'c5f-admin-rangos-d.png', fullPage: true });
  await clic(ad.locator('div').filter({ has: ad.getByText('2 · Vecino del barrio', { exact: true }) }).filter({ has: ad.getByRole('button', { name: 'Cambiar nombre' }) }).last().getByRole('button', { name: 'Cambiar nombre' }));
  await ad.getByLabel('NOMBRE EN ESPAÑOL').fill('Vecino'); await ad.getByLabel('NOMBRE EN INGLÉS').fill('Neighbor');
  await clic(ad.getByText('Lo pidió el fundador', { exact: true })); await clic(ad.getByRole('button', { name: 'Guardar' }));
  ok(await espera(() => sql(`select name->>'es' || '/' || (name->>'en') from ranks where level = 2`) === 'Vecino/Neighbor'), 'nombre de vuelta: Vecino / Neighbor');

  // ── 13 · Perfil con insignias (Ramón) · Invitar: código NOMBRE-N → la cuenta nueva por el enlace queda como invitada ──
  // 9b-1 · Se recarga hasta 30 s: la insignia del cierre del mes llega después (antes una sola carga; a veces todavía no estaba).
  { let v = false; for (let i = 0; i < 6 && !v; i++) { await pp.goto(B + `/comunidad/v/${RR}`); v = await contiene(pp, 'INSIGNIAS', 2000) && await contiene(pp, 'Top del mes', 2000) && await contiene(pp, 'Avisos de la ciudad', 2000); if (!v) await new Promise((r) => setTimeout(r, 3000)); }
    ok(v, 'perfil de Ramón: insignias (Top del mes, Avisos de la ciudad…)'); }
  await pp.screenshot({ path: OUT + 'c5f-perfil-insignias-m.png', fullPage: true });
  await pp.goto(B + '/cuenta/invitar'); const CODE = sql(`select code from referral_codes where user_id = '${RP}'`);
  ok(/^PAOLA-\d+[A-Z]?$/.test(CODE) && await contiene(pp, CODE), `Invita vecinos: tu código ${CODE}`);
  const np = await tel(); await np.goto(B + `/i/${CODE.toLowerCase()}`); await np.waitForURL(/\/entrar/);
  await entrar(np, N_); await api(np, '/api/cuenta/perfil', { nombre: 'Nora', apellido: 'Prueba' });
  ok(await espera(() => sql(`select status from referrals where promoter_user_id = '${RP}' and referred_user_id = '${uid(N_)}'`) === 'joined'), 'cuenta nueva por el enlace → «SE UNIÓ» (cuenta para Capitán cuando participe)');
  await pp.goto(B + '/cuenta/invitar'); ok(await contiene(pp, 'SE UNIÓ') && await contiene(pp, 'Nora P.'), 'Tus invitados: Nora P. · SE UNIÓ');
  await pp.screenshot({ path: OUT + 'c5f-invitar-m.png', fullPage: true });

  // ── Fin: todo como estaba (las publicaciones de prueba quedan borradas; el libro guarda la historia, revertida) ──
  sql(`update com_posts set status = 'deleted', deleted_at = now() where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update com_comments set status = 'deleted', deleted_at = now() where body like '%${TAG}%' and status <> 'deleted'`);
  sql(`update reviews set status = 'removed', hidden_at = now(), hidden_reason = 'autor' where id = ${REV}`);
  ok(sql(`select count(*) from com_posts where body like '%${TAG}%' and status <> 'deleted'`) === '0', 'publicaciones de prueba borradas (sus puntos, revertidos en el libro)');
  ok(err.length === 0, 'sin errores de consola' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log('com5f: todo bien');
})().catch((e) => { console.error(e); process.exit(1); });
