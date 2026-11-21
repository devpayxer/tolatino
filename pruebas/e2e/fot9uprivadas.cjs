// Fotos a la medida · F3 (21 nov) · Las fotos de destino PRIVADO contra la BASE de verdad (la de la corrida: DATABASE_URL de secretos.env), sin el
// servidor y sin almacén: el código REAL de lib/fotos-privadas.ts, lib/fotos-catalogo.ts y lib/ayuda-cita.ts (transpilado: pruebas/lib/ts-servidor.cjs),
// con un almacén de mentira (un Map) y TODO dentro de una transacción que al final se deshace (la base queda como estaba).
//   1. El permiso (permisoFotoPrivada), con una foto adjunta a una cita: quien la subió sí; el cliente de la cita sí; el negocio que la recibe sí
//      (el dueño, y quien es del equipo con «Pedidos»; sin «Pedidos» o con el acceso quitado, no); otro negocio no; otro cliente no; sin sesión no;
//      el equipo de To'Latino solo con un caso abierto de esa operación en una cola que ve y en su ciudad; una foto retenida, purgada o pública no.
//      La de una solicitud (cada negocio al que se mandó) y la del daño de una renta (cliente, negocio y el caso «renta»).
//   2. El catálogo (fotosDeCatalogoOk): rechaza la dirección de una foto privada, una de destino «privado» de antes, la de otra persona y una de afuera;
//      acepta una foto pública suya o de la galería del negocio y deja las que el artículo ya tenía.
//   3. barrerPrivadas: una foto de antes (bajo n/) pasa a privado/o/ con su dirección con permiso, su copia en una visita se reescribe y sale de n/.
//   4. purgarFotosAyuda: borra SOLO la foto privada de la ayuda (privado/a/) de una ayuda cerrada hace más del plazo, con su renglón en la auditoría;
//      sin almacén no hace nada.
//   5. El tope por hora (lib/fotos-revision.ts topeSubidas + topeQueFrena): el de cuenta nueva cuenta y frena SOLO las de destino público; una
//      privada solo responde al general de 60 (que cuenta todas).
// Guardián fotosPrivadasConPermiso. En el CI corre en el carril de punta a punta (hay base); aquí con DATABASE_URL apuntando a una base de pruebas.
const ENT = require('../lib/entorno.cjs');
const path = require('path'), { randomUUID } = require('crypto');
const { cargar, RAIZ } = require('../lib/ts-servidor.cjs');
const { Client } = require(path.join(RAIZ, 'apps/web/node_modules/pg'));
const sharp = require(path.join(RAIZ, 'apps/web/node_modules/sharp'));
let n = 0, malas = 0;
const ok = (x, m) => { if (x) { n++; console.log('  ✓', m); } else { malas++; console.log('  ✗', m); } };

(async () => {
  if (!process.env.DATABASE_URL) { console.log('  ✗ falta DATABASE_URL (la base de la corrida)'); process.exit(1); }
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // El código abre sus propias transacciones (tx, connect + begin/commit): aquí son puntos de guardado DENTRO de la transacción de la prueba.
  let sp = 0;
  const cliente = { query: (sql, p) => {
    const t = typeof sql === 'string' ? sql.trim().toLowerCase() : '';
    if (t === 'begin') return c.query(`savepoint s${++sp}`);
    if (t === 'commit') return c.query(`release savepoint s${sp--}`);
    if (t === 'rollback') return c.query(`rollback to savepoint s${sp--}`);
    return c.query(sql, p);
  }, release: () => undefined };
  const base = { db: () => ({ ...cliente, connect: async () => cliente }), tx: async (fn) => { await cliente.query('begin'); try { const r = await fn(cliente); await cliente.query('commit'); return r; } catch (e) { await cliente.query('rollback'); throw e; } } };
  const G = new Map(), borradas = [];
  let listos = true;
  const medios = {
    guardarObjeto: async (k, b) => { G.set(k, b); }, existeObjeto: async (k) => G.has(k),
    leerObjeto: async (k) => { if (!G.has(k)) throw new Error('almacenamiento 404: NoSuchKey'); return G.get(k); },
    borrarObjeto: async (k) => { borradas.push(k); G.delete(k); }, mediosListos: () => listos,
  };
  const V = cargar('apps/web/lib/fotos-variantes.ts', { './db': base, './medios': medios });
  const F = cargar('apps/web/lib/fotos-privadas.ts', { './db': base, './medios': medios, './fotos-variantes': V });
  const CAT = cargar('apps/web/lib/fotos-catalogo.ts', {});
  const AY = cargar('apps/web/lib/ayuda-cita.ts', { './config': { cfgSql: (k) => `cfg_int('${k}')`, valor: async () => 0 }, './plazo-txt': { horasTxt: () => '' }, './colas': { COLA_AYUDA_SQL: "'sop'" },
    './db': base, './cobros': {}, './ayuda': {}, './ayuda-estafa': {}, './medios': medios });
  const REV = cargar('apps/web/lib/fotos-revision.ts', { './db': base, './medios': medios, './fotos-privadas': F, './fotos-variantes': V, './avisos': {}, './fotos-decision': {},
    './fotos-segunda-opinion': {}, './moderacion': {}, './moderacion-img': {} });
  const q1 = async (sql, p) => (await c.query(sql, p)).rows[0];
  try {
    await c.query('begin');
    const tel = () => `+1570555${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const usuario = async (nombre) => { for (;;) { const t = tel(); const r = await c.query(`insert into users (phone, first_name) values ($1, $2) on conflict do nothing returning id::text`, [t, nombre]); if (r.rows[0]) return r.rows[0].id; } };
    // La cita (de la semilla) y sus dos lados; otro negocio con su dueño; otra persona.
    const op = await q1(`select o.id::text, o.user_id::text as cliente, o.business_id as negocio, o.city_id as ciudad from operations o
                          where o.kind = 'appointment' and o.user_id is not null
                            and not exists (select 1 from help_requests h where h.operation_id = o.id) and not exists (select 1 from rentals r where r.operation_id = o.id) order by o.id limit 1`);
    if (!op) throw new Error('la base no tiene una cita (falta la semilla de pruebas)');
    const subio = await usuario('Subio'), ajeno = await usuario('Ajeno'), empleado = await usuario('Empleado'), equipoU = await usuario('Equipo');
    // El dueño del negocio de la cita (si la semilla no le puso uno con cuenta, uno nuevo) y el de OTRO negocio que no es de este.
    const miembro = async (negocio, kind, u, acceso = '{}') => { await c.query(`insert into business_members (business_id, kind, display_name, user_id, status, panel_access) values ($1, $2, 'Prueba F3', $3::uuid, 'active', $4::text[])`, [negocio, kind, u, acceso]); return u; };
    const dueno = (await q1(`select user_id::text as u from business_members where business_id = $1 and kind = 'owner' and status = 'active' and panel_off_at is null and user_id is not null limit 1`, [op.negocio]))?.u
      ?? await miembro(op.negocio, 'owner', await usuario('Dueno'));
    const b2 = (await q1(`select id from businesses where id <> $1 and status = 'active' order by id limit 1`, [op.negocio])).id;
    const otro = { b: b2, u: await miembro(b2, 'owner', await usuario('OtroDueno')) };
    await miembro(op.negocio, 'staff', empleado, '{cat}');
    // La foto: la subió una persona (el cliente subió la de su cita; aquí, para separar «subió» de «cliente», otra cuenta), adjunta a la cita.
    const foto = async (x) => {
      const id = x.id ?? randomUUID();
      await c.query(`insert into media (id, owner_kind, owner_id, url, uploaded_by, status, private, rev_sin_c2, created_at) values ($1::uuid, $2, $3, $4, $5::uuid, $6, $7, $8, coalesce($9::timestamptz, now()))`,
        [id, x.kind, x.owner, x.url ?? F.urlPrivada(id), x.subio ?? subio, x.status ?? 'visible', x.privada ?? true, x.sinC2 ?? true, x.at ?? null]);
      return id;
    };
    const A = await foto({ kind: 'appointment', owner: op.id });
    const P = (u, id = A, equipo) => F.permisoFotoPrivada(c, id, { userId: u, equipo: equipo ? async () => equipo : undefined });
    const por = async (u, id = A, equipo) => { const r = await P(u, id, equipo); return r.ok ? r.por : 'no'; };
    ok(await por(subio) === 'subio', 'quien la subió → sí');
    ok(await por(op.cliente) === 'cliente', 'el cliente de la cita → sí');
    ok(await por(dueno) === 'negocio', 'el dueño del negocio que la recibe → sí');
    ok(await por(empleado) === 'no', 'del equipo del negocio pero sin «Pedidos» → no');
    await c.query(`update business_members set panel_access = '{ord}' where business_id = $1 and user_id = $2::uuid`, [op.negocio, empleado]);
    ok(await por(empleado) === 'negocio', 'del equipo del negocio con «Pedidos» → sí');
    await c.query(`update business_members set panel_off_at = now(), panel_off_by = $3::uuid, panel_off_reason = 'Prueba F3' where business_id = $1 and user_id = $2::uuid`, [op.negocio, empleado, equipoU]);
    ok(await por(empleado) === 'no', 'con el acceso al panel quitado → no');
    ok(await por(otro.u) === 'no', 'otro negocio → no');
    ok(await por(ajeno) === 'no', 'otro cliente → no');
    ok(await por(null) === 'no', 'sin sesión → no');
    const r1 = await P(subio);
    ok(r1.ok && r1.llave === `privado/o/${A}.jpg`, 'la llave que se lee es la privada (privado/o/<uuid>.jpg)');
    // El equipo: sin caso, con caso abierto en su cola y ciudad, en otra cola, en otra ciudad, con el caso cerrado.
    const eq = (colas, ciudades = []) => ({ id: equipoU, colas, ciudades, vidrio: async () => false });
    ok(await por(equipoU, A, eq(['sop', 'renta'])) === 'no', 'el equipo sin un caso abierto → no');
    const h = await q1(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason) values ('H-' || (900000 + floor(random() * 99999))::int, $1::bigint, $2, $3, $4::uuid, 'otro') returning id::text`,
      [op.id, op.negocio, op.ciudad, op.cliente]);
    const qi = await q1(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('sop', 'help_request', $1, $2, $3) returning id::text`, [h.id, op.negocio, op.ciudad]);
    const re = await P(equipoU, A, eq(['sop']));
    ok(re.ok && re.por === 'equipo' && re.caso.cola === 'sop' && re.caso.ref === h.id && re.staff === equipoU, 'el equipo con la ayuda de esa cita abierta en su cola → sí (y dice qué caso, para la auditoría)');
    ok(await por(equipoU, A, eq(['renta'])) === 'no', 'el equipo sin esa cola → no');
    ok(await por(equipoU, A, eq(['sop'], ['otra-ciudad'])) === 'no', 'el equipo de otra ciudad → no');
    ok(await por(equipoU, A, eq(['sop'], [op.ciudad])) === 'equipo', 'el equipo de esa ciudad → sí');
    await c.query(`update queue_items set status = 'decided' where id = $1::bigint`, [qi.id]);
    ok(await por(equipoU, A, eq(['sop'])) === 'no', 'el equipo con el caso ya cerrado → no');
    // La foto de la ayuda misma (owner help): el cliente y el negocio de la ayuda.
    const AH = await foto({ kind: 'help', owner: h.id, subio: op.cliente });
    ok(await por(dueno, AH) === 'negocio' && await por(ajeno, AH) === 'no', 'la foto de una «Ayuda con…»: el negocio de la ayuda sí, otro no');
    // Estados: retenida, purgada, pública, o con otra dirección → nadie (quien subió una retenida la ve por /api/medios/revision).
    const R = await foto({ kind: 'appointment', owner: op.id, status: 'review' });
    const PUB = await foto({ kind: 'user', owner: subio, url: undefined, privada: false, sinC2: false });
    await c.query(`update media set url = '/medios/n/' || id::text || '.jpg' where id = $1::uuid`, [PUB]);
    const OTRA = await foto({ kind: 'appointment', owner: op.id, url: '/medios/n/x.jpg' });
    ok(await por(subio, R) === 'no' && await por(subio, PUB) === 'no' && await por(subio, OTRA) === 'no', 'una retenida, una pública o una con otra dirección no salen por la ruta privada');
    await c.query(`update media set purged_at = now(), status = 'removed' where id = $1::uuid`, [A]);
    ok(await por(subio) === 'no' && await por(dueno) === 'no', 'una foto purgada → nadie');
    // La solicitud: cada negocio al que se mandó, y quien la pidió.
    const s = await q1(`select id::text, user_id::text as u from service_requests where user_id <> $1::uuid order by id limit 1`, [ajeno]);
    if (s) {
      await c.query(`insert into request_targets (request_id, business_id) values ($1::bigint, $2) on conflict do nothing`, [s.id, op.negocio]);
      const S = await foto({ kind: 'request', owner: s.id, subio: s.u });
      ok(await por(s.u, S) === 'subio' && await por(dueno, S) === 'negocio' && await por(otro.u, S) === 'no' && await por(ajeno, S) === 'no',
        'la foto de una solicitud: quien la pidió y el negocio al que se mandó sí; otro negocio y otra persona no');
    } else ok(false, 'la base no tiene una solicitud (semilla)');
    // El daño de una renta: la foto sigue «de quien la subió» (owner user) y el permiso sale de rentals.damage_photo.
    const it = await q1(`select id::text from items where business_id = $1 limit 1`, [op.negocio]);
    const op2 = await q1(`select o.id::text, o.user_id::text as cliente from operations o where o.business_id = $1 and o.id <> $2::bigint and o.user_id is not null
                            and not exists (select 1 from rentals r where r.operation_id = o.id) and not exists (select 1 from help_requests h where h.operation_id = o.id) limit 1`, [op.negocio, op.id]);
    if (it && op2) {
      const D = await foto({ kind: 'user', owner: dueno, subio: dueno });
      const rr = await q1(`insert into rentals (operation_id, business_id, user_id, city_id, item_id, item_name, price_cents, deposit_cents, days, rent_cents, pick_on, due_on, expires_at, status, payment_method, damage_cents, damage_photo)
                            values ($1::bigint, $2, $3::uuid, $4, $5::bigint, '{"es":"Escalera","en":"Ladder"}', 1000, 5000, 1, 1000, current_date, current_date + 1, now() + interval '2 days', 'back', 'pm_prueba_f3', 2500, $6::uuid) returning id::text`,
        [op2.id, op.negocio, op2.cliente, op.ciudad, it.id, D]);
      ok(await por(op2.cliente, D) === 'cliente' && await por(dueno, D) === 'subio' && await por(ajeno, D) === 'no', 'el daño de una renta: el cliente de la renta y el negocio sí; otro no');
      await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('renta', 'rental', $1, $2, $3)`, [rr.id, op.negocio, op.ciudad]);
      ok(await por(equipoU, D, eq(['renta'])) === 'equipo' && await por(equipoU, D, eq(['sop'])) === 'no', 'el equipo con el daño en la cola «renta» → sí; sin esa cola → no');
    } else ok(false, 'la base no tiene un artículo y otra operación del negocio (semilla)');
    ok(F.anchoServido([320, 640, 1080], 640, true) === 640 && F.anchoServido([320, 640], 1080, true) === 640 && F.anchoServido([320, 640], 640, false) === null && F.anchoServido([320], 500, true) === null && F.anchoServido([], 640, true) === null,
      '?w=: la variante que alcanza (o la más grande); sin WebP, un ancho que no es de los fijos o sin variantes, la maestra');
    ok(F.llaveDeUrl(F.urlPrivada(A)) === `privado/o/${A}.jpg` && F.llaveDeUrl(`/medios/n/${A}.jpg`) === `n/${A}.jpg` && F.llaveDeUrl('privado/a/x.jpg') === 'privado/a/x.jpg' && F.llaveDeUrl('https://images.pexels.com/x.jpg') === null && F.llaveDeUrl('privado/borrada') === null,
      'llaveDeUrl: la ruta con permiso → privado/o/, /medios/<llave> → la llave, privado/… tal cual, lo de afuera y lo borrado → nada');
    ok(V.clavesVariantes(`privado/o/${A}.jpg`, 500, [320, 500]).join() === [320, 500, 640, 1080, 1600].map((w) => `privado/o/${A}.w${w}.webp`).join(), 'la purga de una cuenta conoce las variantes privadas (clavesVariantes de privado/o/)');

    // ── 2. El catálogo ──
    const urlDe = (id) => `/medios/n/${id}.jpg`;
    const pubMia = await foto({ kind: 'user', owner: dueno, subio: dueno, privada: false, sinC2: false }); await c.query(`update media set url = $2 where id = $1::uuid`, [pubMia, urlDe(pubMia)]);
    const galeria = await foto({ kind: 'business', owner: op.negocio, subio: dueno, privada: false, sinC2: false }); await c.query(`update media set url = $2 where id = $1::uuid`, [galeria, urlDe(galeria)]);
    const privMia = await foto({ kind: 'user', owner: dueno, subio: dueno });
    const viejaPriv = await foto({ kind: 'user', owner: dueno, subio: dueno, privada: false, sinC2: true }); await c.query(`update media set url = $2 where id = $1::uuid`, [viejaPriv, urlDe(viejaPriv)]);
    const deOtro = await foto({ kind: 'user', owner: ajeno, subio: ajeno, privada: false, sinC2: false }); await c.query(`update media set url = $2 where id = $1::uuid`, [deOtro, urlDe(deOtro)]);
    const cat = (fotos, itemId = null) => CAT.fotosDeCatalogoOk(c, { negocio: op.negocio, userId: dueno, itemId, fotos });
    ok(await cat([urlDe(pubMia)]) && await cat([urlDe(galeria)]) && await cat([]), 'el catálogo acepta una foto pública suya o de la galería del negocio');
    ok(!(await cat([F.urlPrivada(privMia)])) && !(await cat([urlDe(privMia)])), 'un catálogo rechaza la dirección de una foto privada');
    ok(!(await cat([urlDe(viejaPriv)])), 'y la de una foto de destino «privado» de antes (aunque esté bajo n/)');
    ok(!(await cat([urlDe(deOtro)])) && !(await cat(['https://images.pexels.com/photos/1/x.jpg'])) && !(await cat([`/medios/n/${randomUUID()}.jpg`])), 'y la de otra persona, una de afuera o una que no existe');
    const item = await q1(`insert into items (business_id, module, name, price_cents, photos) values ($1, 'svc', '{"es":"Prueba F3","en":"F3 test"}', 1000, array['https://images.pexels.com/photos/1/x.jpg']) returning id::text`, [op.negocio]).catch(() => null);
    if (item) ok(await cat(['https://images.pexels.com/photos/1/x.jpg', urlDe(pubMia)], item.id) && !(await cat(['https://images.pexels.com/photos/2/y.jpg'], item.id)), 'las fotos que el artículo ya tenía siguen; una nueva de afuera no');
    else ok(false, 'no pude crear un artículo de prueba');

    // ── 3. barrerPrivadas: una foto de antes bajo n/ ──
    const jpg = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 120, g: 90, b: 60 } } }).jpeg().toBuffer();
    const s2 = await q1(`select id::text, user_id::text as u from service_requests order by id limit 1`);
    const VIEJA = randomUUID();
    await foto({ id: VIEJA, kind: 'request', owner: s2.id, subio: s2.u, url: urlDe(VIEJA), privada: false, sinC2: true, at: '2000-01-01' });
    await c.query(`update media set w = 800 where id = $1::uuid`, [VIEJA]);
    await c.query(`update service_requests set operation_id = $2::bigint where id = $1::bigint`, [s2.id, op.id]);
    await c.query(`update operations set details = coalesce(details, '{}'::jsonb) || jsonb_build_object('preFotos', jsonb_build_array($2::text, 'https://otra/foto.jpg')) where id = $1::bigint`, [op.id, urlDe(VIEJA)]);
    G.set(`n/${VIEJA}.jpg`, jpg); G.set(`n/${VIEJA}.w320.webp`, Buffer.from('w320'));
    const b = await F.barrerPrivadas();
    const fv = await q1(`select url, private from media where id = $1::uuid`, [VIEJA]);
    const det = await q1(`select details->'preFotos' as p from operations where id = $1::bigint`, [op.id]);
    ok(b.movidas >= 1 && fv.private && fv.url === F.urlPrivada(VIEJA), 'barrerPrivadas: la foto de antes queda privada con su dirección con permiso');
    ok(G.has(`privado/o/${VIEJA}.jpg`) && !G.has(`n/${VIEJA}.jpg`) && !G.has(`n/${VIEJA}.w320.webp`) && G.has(`privado/o/${VIEJA}.w320.webp`), 'su archivo pasó a privado/o/ (con variantes privadas) y salió de n/ (maestra y variantes)');
    ok(JSON.stringify(det.p) === JSON.stringify([F.urlPrivada(VIEJA), 'https://otra/foto.jpg']), 'su copia como texto en la visita (preFotos) se reescribió');
    ok((await P(s2.u, VIEJA)).ok, 'y quien la subió la sigue viendo, ahora por la ruta con permiso');
    await F.barrerPrivadas();
    const fv2 = await q1(`select url, private from media where id = $1::uuid`, [VIEJA]);
    ok(fv2.private && fv2.url === F.urlPrivada(VIEJA) && G.has(`privado/o/${VIEJA}.jpg`), 'otra vuelta no la vuelve a tocar (idempotente)');

    // ── 4. purgarFotosAyuda ──
    const ayuda = async (status, dias) => (await q1(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, status, resolved_at)
        select 'H-' || (800000 + floor(random() * 99999))::int, o.id, o.business_id, o.city_id, o.user_id, 'otro', $1, case when $1 = 'resolved' then now() - make_interval(days => $2) end
          from operations o where o.user_id is not null and not exists (select 1 from help_requests h where h.operation_id = o.id) and not exists (select 1 from rentals r where r.operation_id = o.id) order by o.id desc limit 1 returning id::text`, [status, dias])).id;
    const hVieja = await ayuda('resolved', 120), hReciente = await ayuda('resolved', 10), hAbierta = await ayuda('answered', 0);
    const fa = async (hid, url) => { const id = randomUUID(); await foto({ id, kind: 'help', owner: hid, url: url(id), privada: true, sinC2: false }); G.set(url(id), Buffer.from('x')); return id; };
    const enA = (id) => `privado/a/${id}.jpg`;
    const P1 = await fa(hVieja, enA), P2 = await fa(hReciente, enA), P3 = await fa(hAbierta, enA), P4 = await fa(hVieja, (id) => F.urlPrivada(id));
    listos = false;
    ok(await AY.purgarFotosAyuda() === 0 && (await q1(`select purged_at from media where id = $1::uuid`, [P1])).purged_at === null, 'purgarFotosAyuda sin almacén no hace nada (no marca borrado lo que sigue ahí)');
    listos = true;
    const nP = await AY.purgarFotosAyuda();
    const st = async (id) => (await q1(`select status || ':' || (purged_at is not null) || ':' || url as x from media where id = $1::uuid`, [id])).x;
    ok(nP >= 1 && await st(P1) === 'removed:true:privado/borrada' && !G.has(enA(P1)) && borradas.includes(enA(P1)), 'purgarFotosAyuda borra la foto privada de una ayuda cerrada hace más de 90 días (el archivo sale; la fila queda «borrada»)');
    ok(!!(await q1(`select 1 as x from audit_entries where action = 'ayuda.fotos.purga' and target_kind = 'media' and target_id = $1 and actor_kind = 'system'`, [P1])), 'y deja su renglón en la auditoría');
    ok(await st(P2) === `visible:false:${enA(P2)}` && G.has(enA(P2)), 'purgarFotosAyuda no toca una ayuda cerrada hace poco');
    ok(await st(P3) === `visible:false:${enA(P3)}`, 'ni una ayuda que no está cerrada');
    ok(await st(P4) === `visible:false:${F.urlPrivada(P4)}`, 'ni una foto de destino «privado» de /api/medios (no promete ese plazo)');

    // ── 5. El tope por hora ──
    const R4 = { c4: { nuevaDias: 7, nuevaHora: 10 } };
    const nuevaU = await usuario('Nueva'), viejaU = await usuario('Vieja');
    await c.query(`update users set created_at = now() - interval '30 days' where id = $1::uuid`, [viejaU]);
    const subidas = (u, k, privada) => c.query(`insert into media (owner_kind, owner_id, url, uploaded_by, status, private, rev_sin_c2) select 'user', $1::text, '/x/' || g, $1::uuid, 'visible', $3::boolean, $3::boolean from generate_series(1, $2::int) g`, [u, k, privada]);
    await subidas(nuevaU, 10, false);
    let t = await REV.topeSubidas(nuevaU, R4);
    ok(t.nueva && t.n === 10 && t.publicas === 10 && REV.topeQueFrena(t, false) === 'nueva', 'cuenta nueva con 10 públicas en la hora: la pública 11 → tope de cuenta nueva (429)');
    ok(REV.topeQueFrena(t, true) === null, 'cuenta nueva con el tope público agotado: una privada (de una operación) sigue subiendo');
    await subidas(nuevaU, 39, true);
    t = await REV.topeSubidas(nuevaU, R4);
    ok(t.n === 49 && t.publicas === 10 && REV.topeQueFrena(t, true) === null, 'las privadas no cuentan para el tope de cuenta nueva (49 en la hora, 10 públicas)');
    await subidas(nuevaU, 11, true);
    t = await REV.topeSubidas(nuevaU, R4);
    ok(t.n === 60 && REV.topeQueFrena(t, true) === 'general' && REV.topeQueFrena(t, false) === 'general', 'el tope general de 60 por hora frena también las privadas (cuenta todas)');
    await subidas(viejaU, 10, false);
    t = await REV.topeSubidas(viejaU, R4);
    ok(!t.nueva && REV.topeQueFrena(t, false) === null, 'una cuenta vieja con 10 públicas sigue subiendo');
    await c.query(`update media set created_at = now() - interval '2 hours' where uploaded_by = $1::uuid`, [nuevaU]);
    ok(REV.topeQueFrena(await REV.topeSubidas(nuevaU, R4), false) === null, 'las de hace más de una hora no cuentan');
  } catch (e) { console.error(e); malas++; } finally {
    await c.query('rollback').catch(() => undefined);
    await c.end();
  }
  console.log(`\n${malas ? 'FALLA' : 'OK'} (${n} comprobaciones${malas ? `, ${malas} mal` : ''})`);
  process.exit(malas ? 1 : 0);
})();
