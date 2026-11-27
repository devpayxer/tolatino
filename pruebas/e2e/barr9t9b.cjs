// 9t9 (27 nov) · Barridos por clase, los que NO son de dinero (LAUNCH «Barridos por clase: lo que quedó de 9t9» (1) y (6)): en cada barrido convertido, UN
// elemento que falla no detiene a los demás, la tarea sale fallida diciendo cuántos de cuántos y cuál (lib/barrido-uno.ts), y nada se traga. Contra la BASE
// de verdad (DATABASE_URL de secretos.env), sin el servidor: el código REAL de cada lib (transpilado: pruebas/lib/ts-servidor.cjs) con su base en una
// transacción que al final se deshace (la base queda como estaba; la comparten otras corridas). El fallo se inyecta sin tocar la base: la consulta (o el
// aviso, o el almacén) de UN elemento lanza antes de llegar a Postgres (una consulta que falla en Postgres abortaría la transacción de la prueba).
//   1. puertaAbre: dos porteros de una fecha que abre en 30 min; el aviso del primero lanza → el segundo recibe el suyo.
//   2. eventoPrivado: dos solicitudes sin respuesta a tiempo; el renglón de la primera lanza → la segunda tiene el suyo. Al abrir la pantalla (con número)
//      el mismo fallo NO rompe la pantalla (queda en el registro; lo reporta el barrido de cada minuto).
//   3. bolRecordatorios: dos dueños de boleto de una fecha de mañana; el aviso del primero lanza → el segundo recibe «Mañana».
//   4. evtAforo: dos fechas que llegaron al aforo; el aviso de la primera lanza → la segunda lo recibe (y las dos quedan anotadas una vez).
//   5. datosArchivosVencer: dos archivos de datos para sacar del almacén; el almacén no deja borrar el primero → el segundo sale.
//   6. llavesVencen: dos llaves que vencen; la consulta de la primera lanza → la segunda avisa al equipo.
//   7. respaldosVigilar: sin restauración y sin respaldo; el motivo «sin restaurar» lanza → «atrasado» avisa.
//   8. temasResenas: dos negocios con reseñas nuevas; el conteo del primero lanza → el segundo tiene sus temas.
//   9. esperaMesas: dos restaurantes con fila de espera; el primero lanza → la fila del segundo se procesa.
//  10. fotosAyudaPurga: dos fotos privadas de una ayuda cerrada hace más del plazo; el almacén no deja borrar la primera → la segunda se purga.
//  11. evtAjustes (revertirDeudas, (6)): un organizador que debe y dos reversiones recién anotadas; la primera lanza → la segunda se manda y queda hecha.
// (llaves.purgarRetos es una sola sentencia, sin elementos: solo gana su orden; lo vigila el guardián.) Guardián barridoUnoPorUno (lista ND); al revés: alreves9t9.
const ENT = require('../lib/entorno.cjs');
const path = require('path'), crypto = require('crypto'), { randomUUID } = crypto;
const { cargar, RAIZ } = require('../lib/ts-servidor.cjs');
const { Client } = require(path.join(RAIZ, 'apps/web/node_modules/pg'));
let n = 0, malas = 0;
const ok = (x, m) => { if (x) { n++; console.log('  ✓', m); } else { malas++; console.log('  ✗', m); } };

(async () => {
  if (!process.env.DATABASE_URL) { console.log('  ✗ falta DATABASE_URL (la base de la corrida)'); process.exit(1); }
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // El veneno: una función (texto, parámetros) → true hace que ESA consulta lance sin llegar a Postgres.
  let veneno = null, despues = null;
  let sp = 0;
  const cliente = { query: (sql, p) => {
    const t = typeof sql === 'string' ? sql : sql?.text ?? '';
    if (veneno && veneno(t, p ?? [])) return Promise.reject(new Error('veneno de la prueba'));
    const l = t.trim().toLowerCase();
    if (l === 'begin') return c.query(`savepoint s${++sp}`);
    if (l === 'commit') return c.query(`release savepoint s${sp--}`);
    if (l === 'rollback') return c.query(`rollback to savepoint s${sp--}`);
    return c.query(sql, p).then((r) => { if (despues) despues(t, p ?? [], r); return r; });
  }, release: () => undefined };
  const base = { db: () => ({ ...cliente, connect: async () => cliente }), tx: async (fn) => { await cliente.query('begin'); try { const r = await fn(cliente); await cliente.query('commit'); return r; } catch (e) { await cliente.query('rollback'); throw e; } } };
  const UNO = cargar('apps/web/lib/barrido-uno.ts');
  const cfg = (k) => `cfg_int('${k}')`;
  const q1 = async (sql, p) => (await c.query(sql, p)).rows[0];
  const qs = async (sql, p) => (await c.query(sql, p)).rows;
  // Corre un barrido y devuelve el mensaje con el que salió fallido ('' si salió bien).
  const corre = async (f) => { try { await f(); return ''; } catch (e) { return String(e?.message ?? e); } };
  const resumen = (msg, tarea, id) => new RegExp(`^${tarea}: \\d+ de \\d+ fallaron \\(`).test(msg) && msg.includes(id);
  // Los avisos de mentira: anotan a quién y con qué ref; `rompe` (uid o ref) lanza.
  const avisos = [];
  let rompe = null;
  const avisar = async (uid, tpl, _v, o) => { if (rompe && rompe(uid, o?.ref)) throw new Error('aviso roto (prueba)'); avisos.push({ uid, tpl, ref: o?.ref?.join(':') }); return true; };
  const AVISOS = { avisar, avisarNegocio: async (biz, tpl, v, o) => avisar(biz, tpl, v, o) };
  const sinVeneno = () => { veneno = null; rompe = null; avisos.length = 0; };
  const replica = async (f) => { await c.query('set local session_replication_role = replica'); try { return await f(); } finally { await c.query('set local session_replication_role = origin'); } };

  try {
    await c.query('begin');
    const tel = () => `+1570555${String(crypto.randomInt(10000)).padStart(4, '0')}`;
    const usuario = async (nombre) => { for (;;) { const r = await c.query(`insert into users (phone, first_name) values ($1, $2) on conflict do nothing returning id::text`, [tel(), nombre]); if (r.rows[0]) return r.rows[0].id; } };
    const CAT = (await q1(`select id from categories order by id limit 1`)).id;
    const RUN = crypto.randomBytes(3).toString('hex');
    const negocio = async (k) => { const id = `b9t9b-${RUN}-${k}`; await c.query(`insert into businesses (id, city_id, category_id, name, status) values ($1, 'hzl', $2, $3, 'active')`, [id, CAT, `Barrido 9t9b ${k}`]); return id; };
    // Un evento vivo de boletos de la semilla (single) y una fecha nueva suya a la hora pedida.
    const ev = await q1(`select e.id::text, e.business_id as biz, e.city_id as city from events e where e.status = 'live' and e.entry = 'tickets' and e.kind = 'single'
                           and exists (select 1 from ticket_types tt where tt.event_id = e.id and not tt.off) and exists (select 1 from tickets t where t.event_id = e.id and t.holder_user_id is not null) order by e.id limit 1`);
    if (!ev) throw new Error('la base no tiene un evento vivo de boletos con dueños (falta la semilla de pruebas)');
    let kd = 0;
    const fecha = (inicio, puertas, dia = null) => replica(async () => (await q1(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date, day_index, status)
        values ($1::bigint, $2, now() + $3::interval, now() + $3::interval + interval '3 hours', now() + $4::interval, coalesce($5::date, ((now() + $3::interval) at time zone 'America/New_York')::date), $6, 'scheduled') returning id::text`,
      [ev.id, ev.city, inicio, puertas, dia, 20 + (kd++ % 9)])).id);

    // ── 1 · puertaAbre ──
    {
      const P = cargar('apps/web/lib/puerta.ts', { './db': base, './config': { cfgSql: cfg }, './boletos-qr': {}, './evt-comun': {}, './puerta-comun': { hora12: (x) => x }, './avisos': AVISOS, './noche-reservas': {} });
      const F = await fecha('1 hour', '30 minutes');
      const u1 = await usuario('Portero1'), u2 = await usuario('Portero2');
      // Sin el disparador de la invitación (la prueba no pasa por invitar y aceptar: el portero ya está activo).
      for (const u of [u1, u2]) await replica(() => c.query(`insert into door_staff (business_id, city_id, user_id, display_name, phone_enc, phone_hash, phone_last4, status, scope, accepted_at) values ($1, $2, $3::uuid, 'Portero 9t9b', '\\x00'::bytea, $4, '0000', 'active', 'all', now())`,
        [ev.biz, ev.city, u, crypto.randomBytes(32).toString('hex')]));
      sinVeneno(); rompe = (uid) => uid === u1;
      const msg = await corre(() => P.barrerPuertaAbre());
      ok(avisos.some((a) => a.uid === u2 && a.ref === `event_date:${F}`) && !avisos.some((a) => a.uid === u1), 'puertaAbre: el aviso del primer portero lanza y el segundo recibe «Hoy escaneas en la puerta»');
      ok(resumen(msg, 'puertaAbre', `${F}:${u1}`), `puertaAbre: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 2 · eventoPrivado ──
    {
      const EP = cargar('apps/web/lib/evento-privado.ts', { './db': base, './citas': {}, './cobros': {}, './devolucion-cancelar': {}, './config': { cfgSql: cfg, valores: async () => ({}) },
        './evento-privado-comun': { NUM_EP: /^EP-\d{1,10}$/ }, './pagos/pasarela': {}, './pagos/verificacion': {}, './avisos': AVISOS, './mensajes': {} });
      const molde = await q1(`select id from operations where kind = 'private_event' order by id limit 1`);
      if (!molde) throw new Error('la base no tiene un evento privado (falta la semilla de pruebas)');
      const pend = async () => replica(async () => q1(`insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, respond_by, scheduled_at, duration_min, party_size, details)
          select 'EP-' || (9000000000 + floor(random() * 99999999))::bigint, kind, city_id, business_id, user_id, pay_mode, gen_random_uuid(), 'pending', now() - interval '1 hour', now() + interval '20 days', duration_min, party_size, details
            from operations where id = $1 returning id::text, number as num`, [molde.id]));
      const A = await pend(), B = await pend();
      sinVeneno(); veneno = (t, p) => /insert into operation_events/.test(t) && p[0] === A.id;
      const msg = await corre(() => EP.vencerEvp({}));
      const evs = async (o) => (await q1(`select count(*)::int as n from operation_events where operation_id = $1::bigint and kind = 'expired'`, [o.id])).n;
      ok(await evs(B) === 1 && await evs(A) === 0, 'eventoPrivado: el renglón de la primera solicitud lanza y la segunda tiene el suyo («No respondieron a tiempo»)');
      ok(resumen(msg, 'eventoPrivado', A.num), `eventoPrivado: en el barrido central la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
      const C = await pend();
      veneno = (t, p) => /insert into operation_events/.test(t) && p[0] === C.id;
      const msg2 = await corre(() => EP.vencerEvp({ numero: C.num }));
      ok(msg2 === '' && (await q1(`select status from operations where id = $1::bigint`, [C.id])).status === 'expired', 'eventoPrivado: al abrir la pantalla (con número) el fallo de un elemento no la rompe (como antes); queda en el registro');
    }

    // ── 3 · bolRecordatorios ──
    // La hora de Configuración del recordatorio va en 0 (solo en esta prueba: lo que se prueba es el aislamiento, no la hora).
    const EA = cargar('apps/web/lib/evt-avisos.ts', { './db': base, './config': { cfgSql: (k) => (k === 'evt_recordatorio_hora' ? '0' : cfg(k)) }, './evt-comun': { cuandoBi: () => ({ es: '', en: '' }) }, './avisos': AVISOS });
    {
      const F = await fecha('1 day', '23 hours', await q1(`select (((now() at time zone 'America/New_York')::date) + 1)::text as d`).then((x) => x.d));
      const tk = await q1(`select id from tickets where event_id = $1::bigint and holder_user_id is not null and status = 'valid' order by id limit 1`, [ev.id]);
      const L = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', D = '23456789', al = (s, k) => Array.from({ length: k }, () => s[crypto.randomInt(s.length)]).join('');
      const dueno = async () => { const u = await usuario('Boleto'); await replica(() => c.query(`insert into tickets (code, event_id, event_date_id, city_id, valid_days, ticket_type_id, operation_id, holder_user_id, admits, kind, price_cents, status)
          select $2, event_id, $3::bigint, city_id, valid_days, ticket_type_id, operation_id, $4::uuid, admits, kind, price_cents, 'valid' from tickets where id = $1`, [tk.id, `TL-${al(L.replace(/[IO]/g, ''), 3)}-${al(D, 4)}`, F, u])); return u; };
      const u1 = await dueno(), u2 = await dueno();
      sinVeneno(); rompe = (uid) => uid === u1;
      const msg = await corre(() => EA.barrerRecordatoriosBoletos());
      ok(avisos.some((a) => a.uid === u2 && a.tpl === 'bol_recordatorio' && a.ref === `event_date:${F}`) && !avisos.some((a) => a.uid === u1), 'bolRecordatorios: el aviso del primer dueño lanza y el segundo recibe «Mañana»');
      ok(resumen(msg, 'bolRecordatorios', `${F}:${u1}`), `bolRecordatorios: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 4 · evtAforo ──
    {
      const tt = await q1(`select id::text from ticket_types where event_id = $1::bigint and not off order by id limit 1`, [ev.id]);
      const lleno = async (inicio) => { const F = await fecha(inicio, '0 minutes'); await replica(() => c.query(`insert into ticket_stock (ticket_type_id, event_date_id, city_id, quantity, sold_n) values ($1::bigint, $2::bigint, $3, 10, 10)`, [tt.id, F, ev.city])); return F; };
      const F1 = await lleno('2 hours'), F2 = await lleno('3 hours');
      sinVeneno(); rompe = (_b, ref) => ref?.[1] === F1;
      const msg = await corre(() => EA.barrerAforoEvt());
      ok(avisos.some((a) => a.tpl === 'evt_aforo90' && a.ref === `event_date:${F2}`) && !avisos.some((a) => a.ref === `event_date:${F1}`), 'evtAforo: el aviso de la primera fecha lanza y la segunda recibe «Tu evento casi se agota»');
      ok(resumen(msg, 'evtAforo', `fecha ${F1}`), `evtAforo: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
      ok((await q1(`select count(*)::int as n from evt_avisos_enviados where kind = 'aforo' and ref in ($1, $2)`, [F1, F2])).n === 2, 'evtAforo: las dos quedan anotadas una vez (otra vuelta no repite)');
      sinVeneno();
      await corre(() => EA.barrerAforoEvt());
      ok(!avisos.some((a) => [`event_date:${F1}`, `event_date:${F2}`].includes(a.ref)), 'evtAforo: la vuelta siguiente no las vuelve a mandar');
    }

    // ── 5 · datosArchivosVencer ──
    {
      const borradas = [];
      let rotaKey = null;
      const MED = { mediosListos: () => true, borrarObjeto: async (k) => { if (k === rotaKey) throw new Error('almacenamiento 503 (prueba)'); borradas.push(k); } };
      const DX = cargar('apps/web/lib/datos/exportar.ts', { '../db': base, '../csv': {}, '../pases/zip': {}, './mapa': {}, '../medios': MED, '../avisos': AVISOS, '../barrido-uno': UNO, '../cuenta': {}, '../llaves/llaves': {} });
      const arch = async () => { const u = await usuario('Datos'), k = `privado/exportes/${randomUUID()}.zip`;
        // Sin el disparador (al insertar, la base la deja «pendiente» y sin archivo): uno que falló con su archivo en el almacén, de hace mucho.
        return { k, id: (await replica(() => q1(`insert into data_exports (user_id, status, media_key, requested_at, error) values ($1::uuid, 'fallo', $2, now() - interval '400 days', 'prueba') returning id::text`, [u, k]))).id }; };
      const X1 = await arch(), X2 = await arch();
      sinVeneno(); rotaKey = X1.k;
      const msg = await corre(() => DX.vencerExportaciones());
      const ido = async (x) => (await q1(`select file_gone_at is not null as g from data_exports where id = $1::uuid`, [x.id])).g;
      ok(borradas.includes(X2.k) && await ido(X2) && !(await ido(X1)), 'datosArchivosVencer: el almacén no deja borrar el primero y el segundo sale (su fila queda sin archivo)');
      ok(resumen(msg, 'datosArchivosVencer', X1.id), `datosArchivosVencer: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 6 · llavesVencen ──
    {
      const SA = cargar('apps/web/lib/sistema/salud.ts', { '../db': base, '../admin': {}, '../cambios-config': {}, '../entorno': { ENTORNO: 'pruebas' }, '../subida': {}, '../avisos': AVISOS, '../barrido-uno': UNO });
      const subio = await usuario('Llavero');
      const llave = async (kind) => (await q1(`insert into store_secrets (kind, version, blob_enc, fingerprint, size_bytes, uploaded_by, expires_on) values ($1, 90 + floor(random() * 9000)::int, $2, $3, 100, $4::uuid, (now() at time zone 'America/New_York')::date + 20)
          returning id::text`, [kind, crypto.randomBytes(80), crypto.randomBytes(32).toString('hex'), subio])).id;
      const K1 = await llave('apns_key'), K2 = await llave('fcm_service_account');
      sinVeneno(); veneno = (t, p) => /ref_kind = 'llave_vence'/.test(t) && String(p[0]).startsWith(`${K1}:`);
      const msg = await corre(() => SA.avisarLlavesQueVencen());
      ok(avisos.some((a) => a.ref === `llave_vence:${K2}:30d`) && !avisos.some((a) => a.ref?.startsWith(`llave_vence:${K1}:`)), 'llavesVencen: la consulta de la primera llave lanza y la segunda avisa al equipo');
      ok(resumen(msg, 'llavesVencen', `llave ${K1}`), `llavesVencen: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 7 · respaldosVigilar (en producción; aquí, con el entorno de mentira) ──
    {
      const DS = cargar('apps/web/lib/sistema/despliegues.ts', { '../db': base, '../admin': {}, '../config': { valores: async () => ({}) }, '../entorno': { ENTORNO: 'produccion' }, '../avisos': AVISOS, '../barrido-uno': UNO,
        './respaldos-comun': cargar('apps/web/lib/sistema/respaldos-comun.ts'), '../cms-admin': {} });
      const hayRespaldos = (await q1(`select (select count(*) from restore_drills where not is_test) + (select count(*) from backup_runs where not is_test) as n`)).n;
      if (Number(hayRespaldos)) ok(true, 'respaldosVigilar: la base tiene respaldos de verdad: no se fabrica el caso (sin restaurar + atrasado)');
      else {
        sinVeneno(); veneno = (t, p) => /ref_kind = 'respaldo_alerta'/.test(t) && String(p[0]).startsWith('sin_restaurar:');
        const msg = await corre(() => DS.vigilarRespaldos());
        ok(avisos.some((a) => a.ref?.startsWith('respaldo_alerta:atrasado:')) && !avisos.some((a) => a.ref?.startsWith('respaldo_alerta:sin_restaurar:')), 'respaldosVigilar: el motivo «sin restaurar» lanza y «respaldo atrasado» avisa al equipo');
        ok(resumen(msg, 'respaldosVigilar', 'sin_restaurar'), `respaldosVigilar: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
      }
    }

    // ── 8 · temasResenas ──
    {
      const TE = cargar('apps/web/lib/temas.ts', { './db': base });
      const N1 = await negocio('t1'), N2 = await negocio('t2'), ur = await usuario('Resena');
      for (const b of [N1, N2]) await replica(() => c.query(`insert into reviews (business_id, city_id, user_id, src, stars, body, status, created_at) values ($1, 'hzl', $2::uuid, 'vis', 5, 'Muy buena atención y la comida muy rica, volvemos.', 'visible', '2001-01-01')`, [b, ur]));
      sinVeneno(); veneno = (t, p) => /from reviews where business_id = \$1 and status = 'visible'/.test(t) && p[0] === N1;
      const msg = await corre(() => TE.rehacerTemas());
      const temas = async (b) => (await q1(`select count(*)::int as n from review_topics where business_id = $1`, [b])).n;
      ok(await temas(N2) > 0 && await temas(N1) === 0, 'temasResenas: el conteo del primer negocio lanza y el segundo tiene sus temas');
      ok(resumen(msg, 'temasResenas', N1), `temasResenas: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 9 · esperaMesas ──
    {
      const M1 = await negocio('m1'), M2 = await negocio('m2'), uw = await usuario('Espera');
      // El motor de mesas de mentira: el primero lanza; el segundo ya no toma reservaciones en línea (null: su fila se cierra), lo más simple que se ve.
      const MS = cargar('apps/web/lib/mesa-espera.ts', { './db': base, './config': { valor: async () => 15 }, './avisos': AVISOS,
        './reservas': { vencerMesas: async () => undefined, fechaCorta: () => '', hora: () => '', motorMesa: async (_c, b) => { if (b === M1) throw new Error('motor roto (prueba)'); return null; } } });
      const fila = async (b) => (await q1(`insert into reservation_waitlist (city_id, business_id, user_id, day, at_min, starts_at, party_size, status, created_at) values ('hzl', $1, $2::uuid, (now() at time zone 'America/New_York')::date + 1, 600, now() + interval '1 minute', 2, 'waiting', now())
          returning id::text`, [b, uw])).id;
      const W1 = await fila(M1), W2 = await fila(M2);
      sinVeneno();
      const msg = await corre(() => MS.barrerEsperaMesas());
      const st = async (w) => (await q1(`select status from reservation_waitlist where id = $1::bigint`, [w])).status;
      ok(await st(W2) === 'expired' && await st(W1) === 'waiting', 'esperaMesas: el primer restaurante lanza y la fila del segundo se procesa');
      ok(resumen(msg, 'esperaMesas', M1), `esperaMesas: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 10 · fotosAyudaPurga ──
    {
      let rotaUrl = null;
      const borradas = [];
      const AY = cargar('apps/web/lib/ayuda-cita.ts', { './config': { cfgSql: cfg, valor: async () => 0 }, './plazo-txt': { horasTxt: () => '' }, './colas': { COLA_AYUDA_SQL: "'sop'" },
        './db': base, './cobros': {}, './ayuda': {}, './ayuda-estafa': {}, './dinero-comun': {}, './medios': { mediosListos: () => true }, './avisos': AVISOS, './noche-vigilar': {},
        './fotos-privadas': { borrarConVariantes: async (u) => { if (u === rotaUrl) throw new Error('almacenamiento 503 (prueba)'); borradas.push(u); } } });
      const h = (await q1(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, status, resolved_at)
          select 'H-' || (800000 + floor(random() * 99999))::int, o.id, o.business_id, o.city_id, o.user_id, 'otro', 'resolved', now() - interval '400 days'
            from operations o where o.user_id is not null and not exists (select 1 from help_requests h where h.operation_id = o.id) and not exists (select 1 from rentals r where r.operation_id = o.id) order by o.id desc limit 1 returning id::text`)).id;
      const subio = await usuario('Ayuda');
      const foto = async () => { const id = randomUUID(), url = `privado/a/${id}.jpg`;
        await c.query(`insert into media (id, owner_kind, owner_id, url, uploaded_by, status, private, rev_sin_c2) values ($1::uuid, 'help', $2, $3, $4::uuid, 'visible', true, false)`, [id, h, url, subio]); return { id, url }; };
      const F1 = await foto(), F2 = await foto();
      sinVeneno(); rotaUrl = F1.url;
      const msg = await corre(() => AY.purgarFotosAyuda());
      const st = async (f) => (await q1(`select status from media where id = $1::uuid`, [f.id])).status;
      ok(borradas.includes(F2.url) && await st(F2) === 'removed' && await st(F1) === 'visible', 'fotosAyudaPurga: el almacén no deja borrar la primera foto y la segunda se purga (la primera queda para la vuelta siguiente)');
      ok(resumen(msg, 'fotosAyudaPurga', F1.id), `fotosAyudaPurga: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 11 · evtAjustes (revertirDeudas): las reversiones recién anotadas de un organizador, cada una por su cuenta ──
    {
      const mandadas = [];
      const LQ = cargar('apps/web/lib/evt-liquidacion.ts', { './db': base, './config': { cfgSql: cfg, valor: async () => 0 }, './evt-comun': { dinero: (x) => `$${x}`, bi: (x) => x, cuandoBi: () => ({}), diaCorto: () => '', hora: () => '' },
        './pagos/pasarela': { pasarela: { revertirTransferencia: async (tr, amt) => { mandadas.push([tr, amt]); return { ok: true, id: `trr_9t9b_${mandadas.length}` }; } } },
        './cobros': { HORAS_LLAVE_STRIPE: 24, llaveDe: (i) => i }, './consulta-pasarela': { cerrarAlertaSola: async () => undefined }, './dinero-alertas': { alertar: async () => undefined }, './avisos': AVISOS });
      const O = await negocio('o1');
      // Dos liquidaciones pagadas hace mucho de dos fechas nuevas (sin cobros: lo que se recalcula es 0) y nada después: debe 1 000 + 1 000.
      const liq = async (dias) => { const F = await fecha(`-${dias + 1} days`, `-${dias + 1} days`);
        return replica(async () => (await q1(`insert into event_settlements (event_date_id, event_id, business_id, city_id, pay_on, status, base_cents, net_cents, destination, idem_key, transfer_id, paying_at, paid_at)
          values ($1::bigint, $2::bigint, $3, 'hzl', (now() - make_interval(days => $4))::date, 'paid', (evt_liq_calc($1::bigint)).base + 1000, (evt_liq_calc($1::bigint)).base + 1000, 'acct_sim_9t9b', 'evt-liq-' || $1, 'tr_9t9b_' || $1, now() - make_interval(days => $4), now() - make_interval(days => $4))
          returning id::text, net_cents as net`, [F, ev.id, O, dias])).id); };
      const S1 = await liq(500), S2 = await liq(400);
      const deuda = (await q1(`select evt_liq_deuda($1) as d`, [O])).d;
      if (deuda !== 2000) ok(false, `evtAjustes: el organizador de la prueba debe 2 000 (debe ${deuda}: lo recalculado de una fecha nueva no es 0)`);
      else {
        // La primera reversión que se anota para ESTE organizador (lo que devuelve su insert) lanza al leerse para mandarla.
        let rota = null;
        despues = (t, p, r) => { if (!rota && /insert into event_settlement_reversals/.test(t) && [S1, S2].includes(String(p[0]))) rota = r.rows[0]?.id; };
        sinVeneno(); veneno = (t, p) => /from event_settlement_reversals r join event_settlements s on s\.id = r\.settlement_id where r\.id = \$1::bigint/.test(t) && !!rota && String(p[0]) === rota;
        const msg = await corre(() => LQ.revertirDeudas());
        despues = null;
        const R = await qs(`select id::text, status, settlement_id::text as s from event_settlement_reversals where business_id = $1 order by id`, [O]);
        ok(R.length === 2 && R[0].id === rota && R.map((r) => r.status).join(',') === 'pending,done', `evtAjustes: dos reversiones anotadas; la primera lanza y la segunda se manda y queda hecha (${R.map((r) => r.status).join(',')})`);
        ok(R.length === 2 && resumen(msg, 'evtAjustes', `reversion ${R[0].id}`), `evtAjustes: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
        const mias = mandadas.filter((m) => /^tr_9t9b_/.test(m[0]));
        ok(mias.length === 1 && mias[0][1] === 1000, `evtAjustes: a la pasarela fue solo la que no lanzó, una vez (${JSON.stringify(mias)})`);
        ok(R.length === 2 && R[0].status === 'pending' && [S1, S2].includes(R[0].s), 'evtAjustes: la que lanzó queda pendiente, para la vuelta siguiente (o repararLiquidaciones)');
      }
    }
  } catch (e) { console.error(e); malas++; } finally {
    await c.query('rollback').catch(() => undefined);
    await c.end();
  }
  console.log(`\n${malas ? 'FALLA' : 'OK'} barr9t9b (${n} comprobaciones${malas ? `, ${malas} mal` : ''})`);
  process.exit(malas ? 1 : 0);
})();
