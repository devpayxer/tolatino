// 9n-8 · Super Admin › Negocios: «Posibles duplicados», «Reclamos» y los cambios sensibles de un negocio (fusionar, cambiar categoría, transferir dueño),
// de punta a punta con las pantallas de verdad, a 1360 (quien pide) y a 390 (quien aplica):
//  1 · Dos negocios con el nombre casi igual salen solos en «Posibles duplicados» (la base escribe el par al crearlos) con «POR REVISAR».
//  2 · «Fusionar» (elige cuál queda) entra a Cambios sensibles; quien lo pidió no lo aplica; OTRA persona lo aplica desde el teléfono: la reseña y el
//      seguidor pasan al que queda, el duplicado queda «merged», su página lleva al que queda y su 360° lo dice.
//  3 · «No es duplicado» con motivo: el par queda «NO ES DUPLICADO» para siempre (la base no deja cambiar la decisión).
//  4 · «Cambiar categoría» y «Transferir dueño» desde el 360°: en la cola, el 360° dice que esperan; otra persona los aplica: la categoría nueva sin
//      subcategorías y el nuevo dueño entra al panel con su aviso.
//  5 · «Reclamos» › «Sin reclamar»: «Invitar a reclamar» sale una vez (después dice «invitación enviada»).
// Precondiciones propias: los dos Admin y la vecina son teléfonos 555 libres de esta corrida; los negocios son copias propias (negocioSinDueno) con nombres
// de esta corrida. Al final cierra los negocios de la corrida y quita al equipo.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { telefonoLibre } = require('../lib/telefono-libre.cjs');
const { negocioSinDueno } = require('../lib/negocio-nuevo.cjs');
const OUT = ENT.OUT, B = ENT.B;
const sql = (q) => execSync(`docker exec -i ${ENT.DB} psql -U tolatino -d tolatino -At -v ON_ERROR_STOP=1`, { input: q, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlFalla = (q) => { try { sql(q); return null; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) }); return { st: r.status, ...(await r.json().catch(() => ({}))) }; }, [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await dormir(250); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(300); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (t instanceof RegExp ? t.test(await texto(p)) : (await texto(p)).includes(t)), ms);
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });
// La fila (AdminRow) que tiene el texto y su acción: los botones del sistema de diseño son [role=button], no <button>.
const fila = (p, t, accion) => p.locator('div').filter({ hasText: t }).filter({ has: p.locator('[role=button]').filter({ hasText: new RegExp(`^${accion}$`) }) });
const ID = crypto.randomBytes(3).toString('hex');
const M = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-US' }, D = { viewport: { width: 1360, height: 900 }, locale: 'es-US' };

(async () => {
  const ADM = telefonoLibre('5705556'), AD2 = telefonoLibre('5705557'), VEC = telefonoLibre('5705559');
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values
        ('+1${ADM}', now(), 'Ana', 'Ocho${ID}', 'hzl', 'es', true), ('+1${AD2}', now(), 'Beto', 'Ocho${ID}', 'hzl', 'es', true),
        ('+1${VEC}', now(), 'Nora', 'Ocho${ID}', 'hzl', 'es', true) on conflict (phone) do nothing;`);
  const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
  const AU = uid(ADM), BU = uid(AD2), VU = uid(VEC);
  // Los negocios de la corrida (copias de bufete-almonte, sin dueño): un par para fusionar, otro par para «no es duplicado» y uno para categoría y dueño.
  const F1 = negocioSinDueno('bufete-almonte', `Panaderia Quisqueya ${ID}`), F2 = negocioSinDueno('bufete-almonte', `Panaderia Quisqueya ${ID}`);
  const N1 = negocioSinDueno('bufete-almonte', `Tortilleria Azteca ${ID}`), N2 = negocioSinDueno('bufete-almonte', `Tortilleria Azteca ${ID}`);
  const C1 = negocioSinDueno('bufete-almonte', `Mudanzas Boricua ${ID}`);
  const MIOS = [F1, F2, N1, N2, C1].map((x) => `'${x.id}'`).join(',');
  const limpiar = () => sql(`update businesses set status = 'closed', status_reason = 'prueba neg9n8', status_at = now() where id in (${MIOS}) and status <> 'merged';
       update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and business_id in (${MIOS});
       update sensitive_changes set status = 'rejected', decided_by = '${BU}', decided_at = now(), decision_reason = 'prueba' where status = 'pending' and target_id in (${MIOS});
       update staff_members set status = 'removed' where user_id in ('${AU}', '${BU}');
       update business_members set status = 'removed', removed_reason = 'left', removed_at = now() where business_id in (${MIOS}) and kind = 'staff' and status = 'active';
       update sessions set signed_out_at = now() where user_id in ('${AU}', '${BU}') and signed_out_at is null;`);
  sql(`insert into staff_members (user_id, role, cities, status, added_by) values ('${AU}', 'admin', '{}', 'active', '${AU}'), ('${BU}', 'admin', '{}', 'active', '${AU}')
       on conflict (user_id) do update set role = excluded.role, cities = excluded.cities, status = 'active';
       insert into staff_mfa_pruebas (phone, note) values ('+1${ADM}', 'neg9n8 · Admin que pide'), ('+1${AD2}', 'neg9n8 · Admin que aplica') on conflict do nothing;
       insert into reviews (business_id, city_id, user_id, src, stars, body, lang) select '${F2.id}', city_id, '${VU}', 'dl', 5, 'Pan sobao fresquecito todas las mañanas, muy recomendado.', 'es' from businesses where id = '${F2.id}';
       select reviews_stats('${F2.id}');
       insert into follows (follower_user_id, target_kind, target_id) values ('${VU}', 'business', '${F2.id}') on conflict do nothing;`);
  const br = await chromium.launch(), err = [];
  const mira = (pg) => { pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|status of 40[34]|Failed to load resource/.test(m.text())) err.push('console: ' + m.text()); }); };
  const nueva = async (cfg, tel) => { const c = await br.newContext(cfg), p = await c.newPage(); mira(p); if (tel) await entrar(p, tel); return p; };
  const aplicar = async (p, motivo) => { await clic(boton(p, 'Aplicar cambio')); await p.locator('textarea').last().fill(motivo); await clic(boton(p, 'Aplicar').last()); };
  const casoDe = (tipo, id) => sql(`select q.id from sensitive_changes x join queue_items q on q.subject_kind = 'sensitive_change' and q.subject_id = x.id where x.type = '${tipo}' and x.target_id = '${id}' and x.status = 'pending' and q.status = 'open' limit 1`);
  try {
    // ── 1 · Posibles duplicados ──
    console.log('1 · Posibles duplicados');
    const [a1, a2] = [F1.id, F2.id].sort();
    ok(sql(`select count(*) from business_dup_pairs where a_id = '${a1}' and b_id = '${a2}'`) === '1', 'la base escribió el par al crear el segundo negocio (business_dup_pairs, derivado)');
    const a = await nueva(D, ADM);
    await a.goto(B + '/admin/negocios?vista=dup');
    ok(await contiene(a, 'Posibles duplicados') && await contiene(a, F1.nombre) && await contiene(a, F2.nombre), 'la pestaña «Posibles duplicados» lista el par');
    ok(await contiene(a, 'POR REVISAR') && await contiene(a, 'Nombre casi igual'), 'por qué sale y su estado («POR REVISAR»)');
    await a.screenshot({ path: `${OUT}/n8-duplicados-d.png` });

    // ── 2 · Fusionar ──
    console.log('2 · Fusionar → Cambios sensibles → otra persona lo aplica');
    const fF = fila(a, F2.nombre, 'Fusionar').filter({ hasText: F1.nombre }).last();
    await clic(fF.getByText('Fusionar', { exact: true }));
    ok(await contiene(a, 'Elige cuál queda'), 'la confirmación pide cuál queda');
    await clic(a.getByText(`${F1.nombre} queda`, { exact: true }));
    await clic(a.getByText('El dueño publicó dos veces', { exact: true }));
    await clic(boton(a, 'Enviar a la cola').last());
    ok(await contiene(a, 'En la cola de Cambios sensibles'), 'queda en la cola (aviso)');
    ok(sql(`select payload->>'dup' || '|' || requested_by from sensitive_changes where type = 'mergeBiz' and target_id = '${F1.id}' and status = 'pending'`) === `${F2.id}|${AU}`, 'sensitive_changes mergeBiz: queda F1, se cierra F2, lo pidió Ana');
    await a.goto(B + '/admin/negocios?vista=dup');
    ok(await contiene(a, 'FUSIÓN EN LA COLA'), 'el par dice «FUSIÓN EN LA COLA»');
    const QF = casoDe('mergeBiz', F1.id);
    await a.goto(B + `/admin/colas?cola=cambio&caso=${QF}`);
    ok(await contiene(a, 'Lo pediste tú') && !(await a.getByText('Aplicar cambio', { exact: true }).count()), 'quien lo pidió no lo aplica («Lo pediste tú», sin «Aplicar cambio»)');
    const b = await nueva(M, AD2);
    await b.goto(B + `/admin/colas?cola=cambio&caso=${QF}`);
    ok(await contiene(b, 'Fusionar negocios') && await contiene(b, 'SE CIERRA'), 'en el teléfono, Beto ve qué queda y qué se cierra');
    await b.screenshot({ path: `${OUT}/n8-fusion-caso-m.png` });
    await aplicar(b, `Confirmado con la familia dueña ${ID}`);
    ok(await contiene(b, 'Aplicado'), 'Beto lo aplica');
    ok(sql(`select status || '|' || merged_into from businesses where id = '${F2.id}'`) === `merged|${F1.id}`, 'el duplicado queda «merged» con merged_into');
    ok(sql(`select count(*) from reviews where business_id = '${F1.id}' and user_id = '${VU}'`) === '1', 'la reseña pasó al que queda');
    ok(sql(`select review_count from business_stats_cache where business_id = '${F1.id}'`) === '1', 'las estrellas del que queda cuentan la reseña (reviews_stats)');
    ok(sql(`select count(*) from follows where target_kind = 'business' and target_id = '${F1.id}' and follower_user_id = '${VU}'`) === '1', 'el seguidor pasó al que queda');
    ok(sql(`select count(*) from audit_entries where action = 'negocio.fusionar' and target_id = '${F1.id}'`) === '1', 'auditoría negocio.fusionar');
    const v = await nueva(M);
    await v.goto(B + `/n/${F2.id}`);
    ok(await espera(async () => new URL(v.url()).pathname === `/n/${F1.id}`), 'la página del duplicado lleva al que queda');
    await a.goto(B + `/admin/negocios/${F2.id}`);
    ok(await contiene(a, `Fusionado con ${F1.nombre}`), 'el 360° del duplicado dice con cuál se fusionó');

    // ── 3 · No es duplicado ──
    console.log('3 · No es duplicado');
    await a.goto(B + '/admin/negocios?vista=dup');
    const fN = fila(a, N2.nombre, 'No es duplicado').filter({ hasText: N1.nombre }).last();
    await clic(fN.getByText('No es duplicado', { exact: true }));
    await clic(a.getByText('Son negocios distintos', { exact: true }));
    await clic(boton(a, 'Guardar').last());
    ok(await contiene(a, 'Ya no sale como posible duplicado'), 'queda decidido');
    await a.goto(B + `/admin/negocios/${N1.id}?tab=confianza`);
    ok(await contiene(a, 'NO ES DUPLICADO') && await contiene(a, 'Son negocios distintos'), 'en Confianza del 360° el par dice «NO ES DUPLICADO» con el motivo');
    const [n1, n2] = [N1.id, N2.id].sort();
    ok(/solo inserción/.test(sqlFalla(`update business_dup_decisions set reason = 'otra' where a_id = '${n1}' and b_id = '${n2}'`) ?? ''), 'la base no deja cambiar la decisión (solo inserción)');

    // ── 4 · Cambiar categoría y transferir dueño ──
    console.log('4 · Cambiar categoría y transferir dueño');
    await a.goto(B + `/admin/negocios/${C1.id}`);
    await clic(a.getByText('Cambiar categoría', { exact: true }));
    await clic(a.getByText('Comida y Bebidas', { exact: true }));
    await clic(a.getByText('Lo publicaron en la categoría equivocada', { exact: true }));
    await clic(boton(a, 'Enviar a la cola').last());
    ok(await contiene(a, 'Un cambio de categoría espera en Cambios sensibles'), 'el 360° dice que espera en la cola');
    await clic(a.getByText('Transferir dueño', { exact: true }));
    await a.locator('input').last().fill(VEC);
    await clic(a.getByText('Vendió el negocio', { exact: true }));
    await clic(boton(a, 'Enviar a la cola').last());
    ok(await contiene(a, 'Una transferencia de dueño espera en Cambios sensibles'), 'la transferencia también');
    await b.goto(B + `/admin/colas?cola=cambio&caso=${casoDe('changeCategory', C1.id)}`);
    ok(await contiene(b, 'Cambio de categoría') && await contiene(b, 'Comida y Bebidas'), 'Beto ve de qué categoría a cuál');
    await aplicar(b, `Revisado con el dueño ${ID}`);
    ok(await contiene(b, 'Aplicado'), 'Beto aplica el cambio de categoría');
    ok(sql(`select category_id || '|' || cardinality(subcategory_ids) from businesses where id = '${C1.id}'`) === 'NEG-FOOD|0', 'la categoría cambió y las subcategorías las elige el dueño');
    await b.goto(B + `/admin/colas?cola=cambio&caso=${casoDe('transferOwner', C1.id)}`);
    ok(await contiene(b, 'NUEVO DUEÑO') && await contiene(b, 'Nora'), 'Beto ve al nuevo dueño');
    await b.screenshot({ path: `${OUT}/n8-transferir-caso-m.png` });
    await aplicar(b, `Contrato de compraventa ${ID}`);
    ok(await contiene(b, 'Aplicado'), 'Beto aplica la transferencia');
    ok(sql(`select owner_user_id from businesses where id = '${C1.id}'`) === VU, 'Nora es la dueña');
    ok(sql(`select count(*) from business_members where business_id = '${C1.id}' and user_id = '${VU}' and kind = 'owner' and status = 'active'`) === '1', 'entra al panel como dueña');
    ok(sql(`select count(*) from notifications where user_id = '${VU}' and tpl = 'biz_transferido_nuevo'`) === '1', 'le llega su aviso (biz_transferido_nuevo)');

    // ── 4b · 9n-13 · Equipo › Quitar acceso al panel (y devolverlo) ──
    console.log('4b · Quitar y devolver el acceso al panel a alguien del equipo');
    sql(`insert into business_members (business_id, user_id, kind, display_name, phone, panel_access, status) values ('${C1.id}', '${BU}', 'staff', 'Beto Ocho${ID}', '+1${AD2}', '{all}', 'active')`);
    await b.goto(B + `/panel/${C1.id}`);
    ok(await contiene(b, `Mudanzas Boricua ${ID}`) && !(await contiene(b, 'Sin acceso a esta área', 500)), 'Beto, del equipo del negocio, entra al panel');
    await a.goto(B + `/admin/negocios/${C1.id}?tab=equipo`);
    await clic(fila(a, `Beto Ocho${ID}`, 'Quitar acceso').last().getByText('Quitar acceso', { exact: true }));
    await clic(a.getByText('Lo pidió el dueño por Soporte', { exact: true }));
    await clic(boton(a, 'Quitar acceso').last());
    ok(await contiene(a, 'Ya no entra al panel'), 'el equipo de To’Latino le quita el acceso');
    ok(sql(`select (panel_off_at is not null)::text || '|' || cardinality(panel_access) from business_members where business_id = '${C1.id}' and user_id = '${BU}'`) === 'true|1', 'queda marcado sin acceso; lo que el dueño le dio no cambia');
    ok(sql(`select count(*) from notifications where user_id = '${VU}' and tpl = 'biz_equipo_sin_acceso'`) === '1', 'la dueña recibe el aviso');
    await b.goto(B + `/panel/${C1.id}`);
    ok(await contiene(b, 'Sin acceso a esta área'), 'Beto ya no entra al panel');
    await a.goto(B + `/admin/negocios/${C1.id}?tab=equipo`);
    ok(await contiene(a, 'SIN ACCESO'), 'el 360° dice «SIN ACCESO»');
    await clic(fila(a, `Beto Ocho${ID}`, 'Devolver acceso').last().getByText('Devolver acceso', { exact: true }));
    await clic(a.getByText('Se revisó y está bien', { exact: true }));
    await clic(boton(a, 'Devolver').last());
    ok(await contiene(a, 'Vuelve a entrar al panel. El dueño recibe el aviso.'), 'se devuelve el acceso');
    ok(await espera(() => sql(`select (panel_off_at is null)::text from business_members where business_id = '${C1.id}' and user_id = '${BU}'`) === 'true'), 'en la base ya no está marcado sin acceso');
    await b.goto(B + `/panel/${C1.id}`);
    ok(await contiene(b, `Mudanzas Boricua ${ID}`) && !(await contiene(b, 'Sin acceso a esta área', 500)), 'Beto vuelve a entrar con lo que la dueña le dio');

    // ── 5 · Reclamos › Sin reclamar ──
    console.log('5 · Reclamos › Sin reclamar');
    await a.goto(B + '/admin/negocios?vista=rec');
    ok(await contiene(a, 'RECLAMOS POR DECIDIR') && await contiene(a, 'SIN RECLAMAR'), 'la vista «Reclamos» con sus dos grupos');
    // El sandbox tiene cientos de negocios sin dueño (la semilla): se abre «Sin reclamar» con el cursor de la propia pantalla justo antes de los de esta corrida.
    const REC = B + `/admin/negocios?vista=rec&cur=${encodeURIComponent(`tortilleria azteca ${ID}`)}`;
    await a.goto(REC);
    ok(await contiene(a, N2.nombre), 'el negocio sin dueño sale en «Sin reclamar» (página por cursor)');
    await clic(fila(a, N2.nombre, 'Invitar a reclamar').last().getByText('Invitar a reclamar', { exact: true }));
    await clic(a.getByText('Lo recomendaron vecinos', { exact: true }));
    await clic(boton(a, 'Enviar el SMS').last());
    ok(await contiene(a, 'Invitación enviada por SMS'), 'sale la invitación');
    ok(sql(`select count(*) from audit_entries where action = 'negocio.invitar_reclamar' and target_id = '${N2.id}'`) === '1', 'queda en la auditoría');
    await a.goto(REC);
    ok(await contiene(a, 'invitación enviada hoy'), 'después dice «invitación enviada hoy» y no se repite');
    await a.screenshot({ path: `${OUT}/n8-reclamos-d.png` });

    // ── 6 · 9n-18 · 360° › Operación: las cifras de 90 días salen de la base y cada operación lleva a Transacciones ──
    console.log('6 · 360° › Operación');
    const OB = sql(`select business_id from operations where sent_at > now() - interval '90 days' and not (kind = 'tickets' and pay_mode = 'none') group by business_id order by count(*) desc limit 1`);
    const OPS = sql(`select count(*) from operations where business_id = '${OB}' and sent_at > now() - interval '90 days' and not (kind = 'tickets' and pay_mode = 'none')`);
    await a.goto(B + `/admin/negocios/${OB}?tab=oper`);
    ok(await contiene(a, 'OPERACIONES · 90 D') && await contiene(a, 'VISTAS · 7 DÍAS') && await contiene(a, 'CONVERSIÓN'), 'la pestaña Operación con sus cifras');
    ok(await contiene(a, `Todo · ${OPS}`), `cuenta las ${OPS} operaciones de 90 días, como la base`);
    const NUM = sql(`select number from operations where business_id = '${OB}' and sent_at > now() - interval '90 days' and not (kind = 'tickets' and pay_mode = 'none') order by id desc limit 1`);
    ok(await contiene(a, NUM), 'la más reciente arriba');
    await a.screenshot({ path: `${OUT}/n8-operacion-d.png`, fullPage: true });
    await clic(a.getByText(new RegExp(` ${NUM.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}( ·|$)`)).first());
    await a.waitForURL(/\/admin\/transacciones\?q=/, { timeout: 15000 });
    ok(a.url().includes(encodeURIComponent(NUM)), 'tocar una operación abre Transacciones con su número');

    ok(!err.length, 'sin errores en la consola: ' + err.slice(0, 3).join(' | '));
    console.log(`\nneg9n8: ${n} comprobaciones`);
  } finally {
    limpiar();
    await br.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
