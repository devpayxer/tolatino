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
// 27 nov, 2ª tanda (los de «bucle por elemento sin el ayudante» y compaRetencion): en cada uno, el primero de dos lanza (la base, el aviso, el almacén o
// Stripe de mentira) y el segundo sigue; la tarea sale fallida diciendo cuál. 12 soporte · 13 compaRespuestasAuto · 14 compaCanales (y la purga corre) ·
// 15 compaRetencion · 16 push (SMS de respaldo; los tokens vencen igual) · 17 errores · 18 beta · 19 tiendas · 20 reportes · 21 datosPurga · 22 salud (una
// sola escritura) · 23 despliegues y mantenimientoAviso · 24 campanas · 25 verificaciones (3-D Secure) · 26 avisoApertura · 27 vacantes · 28 ofertas ·
// 29 fotosEntrega y fotosSinEnviar · 30 colasTomado (una sola escritura) · 31 fotosVariantes · 32 fotosRevision · 33 fotosPrivadas · 34 ayudaDevuelto ·
// 35 repartoSolo. Donde la selección depende de la hora de la ciudad (apertura, vacantes) o de la base compartida (la oferta sola), la selección es de
// mentira (`falso`) y lo demás es la base de verdad; lo que se ve es que el elemento de detrás llegó a la base (`corrio`).
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
  // 2ª tanda · `falso` (texto, parámetros) → un resultado hace que ESA consulta conteste eso sin llegar a Postgres (la selección de un barrido que depende
  // de la hora de la ciudad, o la toma de otro proceso); `vistas` guarda cada consulta que llegó (para ver que el elemento de detrás sí corrió).
  let falso = null;
  const vistas = [];
  let sp = 0;
  const cliente = { query: (sql, p) => {
    const t = typeof sql === 'string' ? sql : sql?.text ?? '';
    if (veneno && veneno(t, p ?? [])) return Promise.reject(new Error('veneno de la prueba'));
    const f = falso && falso(t, p ?? []);
    if (f) return Promise.resolve(f);
    vistas.push([t, p ?? []]);
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
  const sinVeneno = () => { veneno = null; rompe = null; falso = null; avisos.length = 0; vistas.length = 0; };
  // ¿Llegó a la base una consulta como `re` con `id` entre sus parámetros?
  const corrio = (re, id) => vistas.some(([t, p]) => re.test(t) && (id === undefined || p.map(String).includes(String(id))));
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

    // ════ 2ª tanda (27 nov): los de «bucle por elemento sin el ayudante» y compaRetencion ════
    const RUN2 = crypto.randomBytes(3).toString('hex');
    const MED = { mediosListos: () => true };
    const JPG = await require(path.join(RAIZ, 'apps/web/node_modules/sharp'))({ create: { width: 400, height: 300, channels: 3, background: { r: 200, g: 120, b: 40 } } }).jpeg().toBuffer();
    const opsLibres = async (k) => (await qs(`select o.id::text, o.number as num, o.business_id as biz, o.city_id as city, o.user_id::text as uid from operations o
        where o.user_id is not null and o.business_id is not null and not exists (select 1 from help_requests h where h.operation_id = o.id) and not exists (select 1 from rentals r where r.operation_id = o.id)
          and not exists (select 1 from delivery_offers f where f.operation_id = o.id and f.status = 'open')
        order by o.id desc offset 5 limit $1`, [k]));
    const foto = async (o) => { const id = randomUUID(); await replica(() => c.query(`insert into media (id, owner_kind, owner_id, url, uploaded_by, status, private, rev_sin_c2, created_at)
        values ($1::uuid, $2, $3, $4, $5::uuid, $6, $7, $8, $9)`, [id, o.kind, o.owner, (o.url ?? '').replace('ID', id), o.by, o.status ?? 'visible', o.privada ?? true, o.sinC2 ?? false, o.at ?? '2000-01-01'])); return id; };
    const mediaDe = async (id) => q1(`select status, private, var_at is not null as var, purged_at is not null as purgada from media where id = $1::uuid`, [id]);
    const subio2 = await usuario('Barrido2');

    // ── 12 · soporte: dos casos que pasaron su plazo; el aviso del primero lanza → el segundo recibe el suyo ──
    {
      const SE = cargar('apps/web/lib/soporte-equipo.ts', { './reportar': {}, './admin': {}, './compa/tapar': {}, './db': base, './panel': {}, './soporte': {}, './soporte-comun': { TEMAS: {} }, './avisos': AVISOS });
      const staff = await usuario('Soporte'), cliente9 = await usuario('Cliente');
      const caso = async () => (await q1(`insert into support_cases (number, user_id, city_id, topic, status, priority, sla_due_at, assigned_staff_id, origin)
          values ('TK-' || (90000000 + floor(random() * 9999999))::bigint, $1::uuid, 'hzl', 'cuenta', 'new', 'normal', now() - interval '1 hour', $2::uuid, 'form') returning number as num`, [cliente9, staff])).num;
      const K1 = await caso(), K2 = await caso();
      sinVeneno(); rompe = (_u, ref) => ref?.[1] === K1;
      const msg = await corre(() => SE.barrerSoporte());
      ok(avisos.some((a) => a.ref === `support:${K2}`) && !avisos.some((a) => a.ref === `support:${K1}`), 'soporte: el aviso del primer caso vencido lanza y el segundo recibe el suyo (los dos ya subieron a «alta»)');
      ok(resumen(msg, 'soporte', K1), `soporte: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 13 · compaRespuestasAuto: dos hilos esperando a El Compa; el turno del primero lanza → el segundo se contesta ──
    {
      const turnos = [];
      let rotoH = null;
      const RA = cargar('apps/web/lib/compa/respuesta-auto.ts', { '../db': base, '../config': {}, './interruptores': {}, './contexto-negocio': {}, './tope': {}, '../barrido-uno': UNO,
        './conversacion': { turnoAuto: async (h) => { if (h === rotoH) throw new Error('modelo caído (prueba)'); turnos.push(h); return { que: 'auto' }; } } });
      const N = await negocio(`c-${RUN2}`);
      const hilo = async () => (await q1(`insert into chat_threads (user_id, business_id, compa_pending_until) values ($1::uuid, $2, '2000-01-01') returning id::text`, [await usuario('Hilo'), N])).id;
      const H1 = await hilo(), H2 = await hilo();
      sinVeneno(); rotoH = H1;
      const msg = await corre(() => RA.contestarPendientes());
      ok(turnos.includes(H2) && !turnos.includes(H1), 'compaRespuestasAuto: el turno del primer hilo lanza y el segundo se contesta');
      ok(resumen(msg, 'compaRespuestasAuto', `hilo ${H1}`), `compaRespuestasAuto: la tarea sale fallida diciendo cuál (antes contestarAuto se lo tragaba; «${msg.slice(0, 140)}»)`);
    }

    // ── 14 · compaCanales: dos entradas sin procesar; la toma de la primera lanza → la segunda se procesa y la purga corre ──
    {
      const CA = cargar('apps/web/lib/compa/canales.ts', { '../admin': {}, '../cifrado': { descifrar: () => null, cifrar: () => Buffer.alloc(0), huella: () => '' }, '../config': { valor: async () => 30 }, '../cuenta': {},
        '../db': base, '../entorno': { ENTORNO: 'pruebas' }, './conversacion': {}, './enlace': {}, './canales-proveedor': {}, '../sms': {}, './interruptores': {}, './tapar': { TAPADO: '', tapar: (x) => ({ texto: x }) },
        './tope': {}, '../barrido-uno': UNO });
      const ent = async () => (await replica(() => q1(`insert into compa_inbound (provider, channel, provider_msg_id, signature_ok, from_hash, to_number, city_id, kind, body, received_at)
          values ('sim', 'sms', $1, true, $2, '+15705550000', 'hzl', 'text', 'hola', '2000-01-01') returning id::text`, [`b9t9b-${randomUUID()}`, crypto.randomBytes(32).toString('hex')]))).id;
      const E1 = await ent(), E2 = await ent();
      sinVeneno(); veneno = (t, p) => /update compa_inbound set estado = 'procesando'/.test(t) && String(p[0]) === E1;
      const msg = await corre(() => CA.barrerCanales());
      const st = async (e) => (await q1(`select estado, result from compa_inbound where id = $1::bigint`, [e]));
      const s2 = await st(E2), s1 = await st(E1);
      ok(s2.estado === 'hecho' && s2.result === 'sin_ruta' && s1.estado === 'recibido', `compaCanales: la toma de la primera entrada lanza y la segunda se procesa (${s1.estado} / ${s2.estado}:${s2.result})`);
      ok(corrio(/update compa_outbound set body = null, purged_at = now\(\)/, 30), 'compaCanales: la purga por retención corre igual (antes la tarea se cortaba en la entrada)');
      ok(resumen(msg, 'compaCanales', `entrada ${E1}`), `compaCanales: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 15 · compaRetencion: dos fotos de un caso de una cuenta borrada; el almacén no deja borrar la primera → la segunda sale ──
    {
      let rotaUrl = null;
      const borradas = [];
      const CP = cargar('apps/web/lib/compa/purga.ts', { '../db': base, '../barrido-uno': UNO, '../medios': MED,
        '../fotos-privadas': { borrarConVariantes: async (u) => { if (u === rotaUrl) throw new Error('almacenamiento 503 (prueba)'); borradas.push(u); } } });
      const u = await usuario('Borrada');
      const caso = (await replica(async () => q1(`insert into support_cases (number, user_id, city_id, topic, status, sla_due_at, origin, purged_at)
          values ('TK-' || (90000000 + floor(random() * 9999999))::bigint, $1::uuid, 'hzl', 'cuenta', 'new', now(), 'form', '2000-01-01') returning id::text`, [u]))).id;
      const F1 = await foto({ kind: 'support', owner: caso, url: 'privado/a/ID.jpg', by: subio2 }), F2 = await foto({ kind: 'support', owner: caso, url: 'privado/a/ID.jpg', by: subio2 });
      sinVeneno(); rotaUrl = `privado/a/${F1}.jpg`;
      const msg = await corre(() => CP.barrerRetencion(1));
      ok(borradas.includes(`privado/a/${F2}.jpg`) && (await mediaDe(F2)).status === 'removed' && (await mediaDe(F1)).status === 'visible', 'compaRetencion: el almacén no deja borrar la primera foto y la segunda sale (la primera, a la vuelta siguiente)');
      ok(resumen(msg, 'compaRetencion', F1), `compaRetencion: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 16 · push: dos avisos cuyo push nunca se resolvió; el SMS de respaldo del primero lanza → el del segundo sale ──
    {
      const sms = [];
      let rotoN = null;
      const PC = cargar('apps/web/lib/push/cola.ts', { '../cifrado': {}, '../config': { valores: async () => ({ push_lote: 0, push_por_minuto: 0, push_reintentos: 0 }) }, '../db': base, '../app-nativa-comun': {},
        './apns': {}, './fcm': {}, './llaves': {}, './webpush': {}, '../barrido-uno': UNO,
        '../avisos': { smsRespaldo: async (id) => { if (id === rotoN) throw new Error('sms roto (prueba)'); sms.push(id); } } });
      const u = await usuario('Push');
      const tpl = (await q1(`select key from notif_templates order by key limit 1`)).key;
      const aviso = async () => (await replica(async () => q1(`insert into notifications (user_id, tpl, title, body, sms_status, push_status, created_at)
          values ($1::uuid, $2, 'Prueba', 'Prueba', 'respaldo', 'pendiente', now() - interval '30 days') returning id::text`, [u, tpl]))).id;
      const N1 = await aviso(), N2 = await aviso();
      // Lo demás de la cola de la base compartida no entra en esta prueba (otra corrida puede tener push en camino).
      sinVeneno(); rotoN = N1; falso = (t) => /^\s*select n\.id::text from notifications n\s+where n\.push_status = 'pendiente'/.test(t) ? { rows: [], rowCount: 0 } : null;
      const msg = await corre(() => PC.barrerPush());
      ok(sms.includes(N2) && !sms.includes(N1), 'push: el SMS de respaldo del primer aviso lanza y el del segundo sale (los dos ya quedaron en «fallo»)');
      ok(corrio(/update push_tokens set revoked_at = now\(\), revoked_reason = 'vencido'/), 'push: los tokens sin uso vencen igual (antes la tarea se cortaba en el SMS)');
      ok(resumen(msg, 'push', `aviso ${N1}`), `push: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 17 · errores: dos grupos nuevos; la alerta del primero lanza → la del segundo se anota y avisa ──
    {
      const EV = cargar('apps/web/lib/errores/vivo.ts', { '../config': { valor: async () => 1000000 }, '../db': base, '../avisos': AVISOS, '../barrido-uno': UNO });
      const grupo = async () => (await q1(`insert into app_error_groups (fingerprint, app, platform, kind, title, status, count, first_seen)
          values ($1, 'web', 'web', 'js', 'Error de prueba 9t9b', 'nuevo', 900000000, now()) returning id::text`, [crypto.randomBytes(20).toString('hex')])).id;
      const G1 = await grupo(), G2 = await grupo();
      sinVeneno(); veneno = (t, p) => /insert into app_error_alerts/.test(t) && String(p[0]) === G1;
      const msg = await corre(() => EV.barrerErrores(10));
      ok(!!(await q1(`select 1 as x from app_error_alerts where group_id = $1::bigint`, [G2])) && !(await q1(`select 1 as x from app_error_alerts where group_id = $1::bigint`, [G1])), 'errores: la alerta del primer grupo lanza y la del segundo queda anotada');
      ok(corrio(/select errores_purgar\(5000\)/), 'errores: la purga corre igual');
      ok(resumen(msg, 'errores', `${G1}:nuevo:`), `errores: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 18 · beta: dos testers por sincronizar; el primero lanza → el segundo se revisa (sin llave de Apple: «sin_llave») ──
    {
      const BE = cargar('apps/web/lib/beta.ts', { './admin': {}, './app-nativa-comun': {}, './cifrado': { descifrar: () => null }, './config': {}, './cuenta': {}, './db': base, './entorno': { ENTORNO: 'pruebas' },
        './tiendas/llavero': { leer: async () => null }, './tiendas/asc': {}, './tiendas/direcciones': { URL_ASC: () => 'http://127.0.0.1:9' }, './avisos': AVISOS, './medios': MED, './tiendas/apk-prueba': {} });
      const quien = await usuario('Invita');
      const tester = async () => { const u = await usuario('Tester'); return (await q1(`insert into beta_testers (user_id, app, platform, channel, invited_by, invite_reason, email_enc, email_hash, status, sync, sync_at)
          values ($1::uuid, 'cliente', 'ios', 'testflight', $2::uuid, 'prueba 9t9b', $3, $4, 'invitado', 'pendiente', null) returning id::text`, [u, quien, crypto.randomBytes(40), crypto.randomBytes(32).toString('hex')])).id; };
      const T1 = await tester(), T2 = await tester();
      sinVeneno(); veneno = (t, p) => /from beta_testers t join users u on u\.id = t\.user_id where t\.id = \$1::bigint/.test(t) && String(p[0]) === T1;
      const msg = await corre(() => BE.barrerBeta(20));
      const sy = async (x) => (await q1(`select sync from beta_testers where id = $1::bigint`, [x])).sync;
      ok(corrio(/from beta_testers t join users u on u\.id = t\.user_id where t\.id = \$1::bigint/, T2) && await sy(T1) === 'pendiente', `beta: el primer tester lanza y el segundo se revisa (${await sy(T2)})`);
      ok(resumen(msg, 'beta', `tester ${T1}`), `beta: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 19 · tiendas: dos builds para Play interno; el primero lanza → el segundo se intenta y los pedidos y los jti siguen ──
    {
      const TU = cargar('apps/web/lib/tiendas/tuberia.ts', { '../admin': {}, '../app-nativa-comun': {}, '../config': {}, '../db': base, '../entorno': { ENTORNO: 'pruebas' }, './asc': {}, '../barrido-uno': UNO,
        './direcciones': {}, './github': {}, './llavero': { leer: async () => null }, './oidc': {}, './play': {}, '../medios': MED });
      const build = async (k) => (await replica(() => q1(`insert into app_builds (app, platform, version, build, channel, status, bundle_key, updated_at, commit_sha)
          values ('cliente', 'android', '9.9.9', $1, 'play_interno', 'subido', $2, '2000-01-01', 'abcdef1') returning id::text`, [900000000 + crypto.randomInt(99999999), `privado/aab/b9t9b-${RUN2}-${k}.aab`]))).id;
      const B1 = await build(1), B2 = await build(2);
      // Lo de TestFlight de la base compartida no entra en esta prueba.
      sinVeneno(); veneno = (t, p) => /from app_builds b where id = \$1::bigint and channel = 'play_interno'/.test(t) && String(p[0]) === B1;
      falso = (t) => /channel = 'testflight_interno' and status in \('subido', 'procesando'\)/.test(t) ? { rows: [], rowCount: 0 } : null;
      const msg = await corre(() => TU.barrerTiendas());
      const at = async (x) => (await q1(`select updated_at > '2000-01-02' as nuevo from app_builds where id = $1::bigint`, [x])).nuevo;
      ok(await at(B2) && !(await at(B1)), 'tiendas: el primer build lanza y el segundo se intenta (sin llave de Google: queda para la vuelta siguiente)');
      ok(corrio(/select ci_oidc_purgar\(\) as n/), 'tiendas: los pedidos y los jti siguen (antes la tarea se cortaba en el build)');
      ok(resumen(msg, 'tiendas', `build ${B1}`), `tiendas: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 20 · reportes: dos reportes programados; el primero lanza → el segundo queda mandado ──
    {
      const RP = cargar('apps/web/lib/reportes.ts', { './admin': {}, './admin-analitica': {}, './correo': { BASE_URL: () => '', encolar: async () => undefined }, './correo/plantillas': {}, './db': base,
        './db-analisis': { dbAnalisis: () => cliente } });
      const st = await usuario('Analitica');
      await replica(() => c.query(`insert into staff_members (user_id, role, status) values ($1::uuid, 'admin', 'active')`, [st]));
      const rep = async (tab) => (await q1(`insert into scheduled_reports (by_staff_id, tab, cada, status, created_at) values ($1::uuid, $2, 'dia', 'activo', '2000-01-01') returning id::text`, [st, tab])).id;
      const R1 = await rep('ppl'), R2 = await rep('sum');
      sinVeneno(); veneno = (t, p) => /update scheduled_reports set last_sent_at = now\(\)/.test(t) && String(p[0]) === R1;
      const msg = await corre(() => RP.barrerReportes());
      const ls = async (x) => (await q1(`select last_sent_at is not null as m from scheduled_reports where id = $1::bigint`, [x])).m;
      ok(await ls(R2) && !(await ls(R1)), 'reportes: el primer reporte lanza y el segundo queda mandado');
      ok(resumen(msg, 'reportes', `reporte ${R1}`), `reportes: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 21 · datosPurga: dos cuentas vencidas; la primera lanza → la segunda se purga (queda su purge_runs) ──
    {
      const DP = cargar('apps/web/lib/datos/purgar.ts', { '../db': base, './mapa': { mapa: async () => [], ident: (x) => `"${x}"` }, '../mensajes-vecinos': { MENSAJES_DE: (x) => `select x.id from dm_messages x where x.sender_user_id = ${x}` },
        '../barrido-uno': UNO, '../avisos': AVISOS, '../medios': MED });
      const vencida = async () => { const u = await usuario('Purga'); await replica(() => c.query(`update users set delete_at = '2000-01-01' where id = $1::uuid`, [u])); return u; };
      const U1 = await vencida(), U2 = await vencida();
      sinVeneno(); veneno = (t, p) => /select phone as tel, home_city_id as city/.test(t) && p[0] === U1;
      const msg = await corre(() => DP.purgarVencidas(5));
      const run = async (u) => !!(await q1(`select 1 as x from purge_runs where user_id = $1::uuid`, [u]));
      ok(await run(U2) && !(await run(U1)), 'datosPurga: la primera cuenta lanza y la segunda se purga (queda su corrida)');
      ok(resumen(msg, 'datosPurga', `cuenta ${U1}`), `datosPurga: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 22 · salud: las cinco filas de la medición en una sola escritura ──
    {
      const SA = cargar('apps/web/lib/sistema/salud.ts', { '../db': base, '../admin': {}, '../cambios-config': {}, '../entorno': { ENTORNO: 'pruebas' }, '../subida': {}, '../avisos': AVISOS, '../barrido-uno': UNO });
      sinVeneno(); falso = (t) => /select extract\(epoch from now\(\) - max\(at\)\)::float as hace from health_checks/.test(t) ? { rows: [{ hace: null }], rowCount: 1 } : null;
      const msg = await corre(() => SA.medirSalud());
      const n5 = (await q1(`select count(*)::int as n from health_checks where at = now() and not is_test and service in ('base', 'barrido', 'push', 'disco', 'errores')`)).n;
      ok(msg === '' && n5 === 5 && vistas.filter(([t]) => /insert into health_checks/.test(t)).length === 1, `salud: las cinco filas (${n5}) en una sola escritura (antes una por una: una que fallaba dejaba la medición a medias)`);
    }

    // ── 23 · despliegues y mantenimientoAviso ──
    {
      let rotaW = null, anunciadas = [];
      const DS = cargar('apps/web/lib/sistema/despliegues.ts', { '../db': base, '../admin': {}, '../config': { valores: async () => ({}) }, '../entorno': { ENTORNO: 'produccion' }, '../avisos': AVISOS, '../barrido-uno': UNO,
        './respaldos-comun': cargar('apps/web/lib/sistema/respaldos-comun.ts'),
        '../cms-admin': { anunciarMantenimiento: async (w) => { if (w.id === rotaW) throw new Error('anuncio roto (prueba)'); anunciadas.push(w.id); return 1; }, retirarAnunciosDeMantenimiento: async () => 0 } });
      const dep = async () => (await q1(`insert into deploy_releases (entorno, commit_sha, started_at, finished_at, result, reason, founder_ok_ref)
          values ('produccion', $1, '2000-01-01', '2000-01-01', 'fallo', 'prueba 9t9b', 'prueba 9t9b del barrido') returning id::text`, [crypto.randomBytes(20).toString('hex')])).id;
      const D1 = await dep(), D2 = await dep();
      sinVeneno(); veneno = (t, p) => /update deploy_releases set noticed_at = now\(\)/.test(t) && String(p[0]) === D1;
      const msg = await corre(() => DS.avisarDespliegues());
      const vista = async (x) => (await q1(`select noticed_at is not null as v from deploy_releases where id = $1::bigint`, [x])).v;
      ok(await vista(D2) && !(await vista(D1)), 'despliegues: el primero lanza y el segundo queda avisado');
      ok(resumen(msg, 'despliegues', `despliegue ${D1}`), `despliegues: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
      const quien = await usuario('Mantenimiento');
      const ven = async (k) => (await q1(`insert into maintenance_windows (from_at, to_at, message, by_staff, reason) values (now() + make_interval(mins => $1), now() + make_interval(mins => $1 + 60),
          '{"es": "Prueba 9t9b", "en": "Test 9t9b"}', $2::uuid, 'prueba 9t9b') returning id::text`, [k, quien])).id;
      const W1 = await ven(1), W2 = await ven(2);
      sinVeneno(); rotaW = W1; anunciadas = [];
      const msg2 = await corre(() => DS.avisarMantenimiento());
      ok(anunciadas.includes(W2) && !anunciadas.includes(W1), 'mantenimientoAviso: el anuncio de la primera ventana lanza y la segunda se anuncia');
      ok(resumen(msg2, 'mantenimientoAviso', `ventana ${W1}`), `mantenimientoAviso: la tarea sale fallida diciendo cuál («${msg2.slice(0, 140)}»)`);
    }

    // ── 24 · campanas: dos campañas que tocan; el lote de la primera lanza → el de la segunda se intenta ──
    {
      const CM = cargar('apps/web/lib/crecimiento/campanas.ts', { '../admin': {}, '../avisos': AVISOS, '../config': { valores: async () => ({ campana_lote: 10, campana_por_semana: 3, campana_sms_por_mes: 3 }) },
        '../correo': {}, '../correo/plantillas': {}, '../db': base, './comun': {}, '../barrido-uno': UNO });
      const quien = await usuario('Campana');
      const camp = async () => (await q1(`insert into campaigns (name, city_id, kind, channel, template_key, title, body, created_by, status, scheduled_at, segment)
          values ('Prueba 9t9b', 'hzl', 'aviso', 'inapp', 'mkt_campana_app', '{"es": "Hola", "en": "Hi"}', '{"es": "Prueba", "en": "Test"}', $1::uuid, 'programada', '2000-01-01', '{}') returning id::text`, [quien])).id;
      const C1 = await camp(), C2 = await camp();
      const TOMA = /from campaigns k join cities ci on ci\.id = k\.city_id\s+where k\.id = \$1::bigint/;
      // La de la segunda contesta «la tiene otro proceso» (sin lote): lo que se prueba es que se intentó, no el segmento de la base compartida.
      sinVeneno(); veneno = (t, p) => TOMA.test(t) && String(p[0]) === C1; falso = (t, p) => (TOMA.test(t) && String(p[0]) === C2 ? (vistas.push([t, p]), { rows: [], rowCount: 0 }) : null);
      const msg = await corre(() => CM.campanasProgramadas());
      ok(corrio(TOMA, C2), 'campanas: el lote de la primera campaña lanza y el de la segunda se intenta');
      ok(resumen(msg, 'campanas', `campaña ${C1}`), `campanas: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 25 · verificaciones (3-D Secure: suelta dinero): dos verificaciones vencidas; soltar la primera lanza → la segunda se suelta y vence ──
    {
      const soltadas = [];
      let rotoPi = null;
      const VE = cargar('apps/web/lib/pagos/verificacion.ts', { '../db': base, './pasarela': {}, '../barrido-uno': UNO, '../rentas': {}, '../suscripcion': {},
        '../cobros': { SUELTA_ESPERA_MIN: 60, soltarSuelta: async (pi) => { if (pi === rotoPi) throw new Error('Stripe 500 (prueba)'); soltadas.push(pi); return { e: 'liberada' }; } } });
      const u = await usuario('Verifica');
      const accion = async () => { const pi = `pi_b9t9b_${randomUUID().replace(/-/g, '')}`; await c.query(`insert into payment_actions (pi, base_idem, idem, user_id, kind, amount_cents, expires_at, status)
          values ($1, $2, $3, $4::uuid, 'en_sesion', 1000, '2000-01-01', 'pendiente')`, [pi, `b9t9b-${pi}`, `b9t9b-${pi}-i`, u]); return pi; };
      const P1 = await accion(), P2 = await accion();
      sinVeneno(); rotoPi = P1;
      const msg = await corre(() => VE.vencerVerificaciones());
      const est = async (pi) => (await q1(`select status from payment_actions where pi = $1`, [pi])).status;
      ok(soltadas.includes(P2) && await est(P2) === 'vencida' && await est(P1) === 'pendiente', 'verificaciones: soltar la primera lanza y la segunda se suelta y vence (la primera, a la vuelta siguiente)');
      ok(soltadas.filter((x) => x === P2).length === 1, 'verificaciones: cada retención se suelta una sola vez en la corrida');
      ok(resumen(msg, 'verificaciones', P1), `verificaciones: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 26 · avisoApertura: dos ciudades con su lista (la ventana de 9 a 9 depende de la hora de la ciudad: la selección es de mentira) ──
    {
      const AP = cargar('apps/web/lib/ciudades/aviso.ts', { '../avisos': AVISOS, '../config': { valores: async () => ({ ciudad_aviso_lote: 50 }) }, '../correo': { BASE_URL: () => '', encolar: async () => undefined }, '../correo/plantillas': {}, '../db': base,
        './comun': { AVISO_DESDE: 9, AVISO_HASTA: 20 }, '../barrido-uno': UNO });
      const Z1 = `z9t9b${RUN2}a`, Z2 = `z9t9b${RUN2}b`;
      const LISTA = /from city_waitlist w where w\.city_id = \$1 and w\.notified_at is null/;
      sinVeneno(); falso = (t) => (/from cities c\s+join lateral/.test(t) ? { rows: [{ id: Z1, name: 'Uno', launch: '1' }, { id: Z2, name: 'Dos', launch: '2' }], rowCount: 2 } : null);
      veneno = (t, p) => LISTA.test(t) && p[0] === Z1;
      const msg = await corre(() => AP.avisarAperturas());
      ok(corrio(LISTA, Z2), 'avisoApertura: el lote de la primera ciudad lanza y el de la segunda corre');
      ok(resumen(msg, 'avisoApertura', `ciudad ${Z1}`), `avisoApertura: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 27 · vacantes: dos avisos de vacante (la ventana de 9 a 9 depende de la hora de la ciudad: la selección es de mentira) ──
    {
      const AL = cargar('apps/web/lib/alertas.ts', { './avisos': AVISOS, './db': base });
      const ua = await usuario('Vacante');
      const fila = (a, j) => ({ a, uid: ua, job: j, puesto: 'Cocinero', negocio: 'Prueba', bid: 'b', ciudad: 'Hazleton' });
      sinVeneno(); falso = (t) => (/from search_alerts a join cities c on c\.id = a\.city_id/.test(t) ? { rows: [fila('-91', '-81'), fila('-92', '-82')], rowCount: 2 } : null);
      veneno = (t, p) => /insert into notif_once \(key\) values/.test(t) && p[0] === 'vacante:-91:-81';
      const msg = await corre(() => AL.barrerVacantes());
      ok(avisos.some((a) => a.ref === 'job:-82') && !avisos.some((a) => a.ref === 'job:-81'), 'vacantes: el primer aviso lanza y el segundo sale');
      ok(resumen(msg, 'vacantes', '-91:-81'), `vacantes: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }

    // ── 28 · ofertas: dos ofertas de reparto que vencieron; el aviso al negocio de la primera lanza → el de la segunda sale ──
    {
      const OF = cargar('apps/web/lib/repartidor-ofertas.ts', { './config': {}, './db': base, './reparto-comun': { detPanel: (x) => x, KIND_REPARTO: "('order')", listoParaRepartoSql: () => 'true', NUM_REPARTO: /x/ },
        './ruta': {}, './avisos': AVISOS });
      const [o1, o2] = await opsLibres(2);
      for (const o of [o1, o2]) await replica(() => c.query(`insert into delivery_offers (operation_id, business_id, city_id, expires_at, status) values ($1::bigint, $2, $3, now() - interval '1 minute', 'open')`, [o.id, o.biz, o.city]));
      sinVeneno(); rompe = (b, ref) => b === o1.biz && ref?.[1] === o1.num;
      const msg = await corre(() => OF.vencerOfertas());
      ok(avisos.some((a) => a.uid === o2.biz && a.ref === `order:${o2.num}`) && !avisos.some((a) => a.uid === o1.biz && a.ref === `order:${o1.num}`), 'ofertas: el aviso de la primera oferta vencida lanza y el de la segunda sale');
      ok(resumen(msg, 'ofertas', `${o1.biz}:${o1.num}`), `ofertas: la tarea sale fallida diciendo cuál (antes se perdía en silencio; «${msg.slice(0, 140)}»)`);
    }

    // ── 29 · fotosEntrega y fotosSinEnviar: dos fotos cada una; el almacén no deja borrar la primera → la segunda sale ──
    {
      let rotaUrl = null;
      const BCV = { borrarConVariantes: async (u) => { if (u === rotaUrl) throw new Error('almacenamiento 503 (prueba)'); } };
      const RB = cargar('apps/web/lib/repartidor-barrido.ts', { './config': { cfgSql: cfg }, './db': base, './fotos-privadas': BCV, './medios': MED });
      const [o] = await opsLibres(1);
      const E1 = await foto({ kind: 'delivery', owner: o.id, url: 'privado/e/ID.jpg', by: subio2 }), E2 = await foto({ kind: 'delivery', owner: o.id, url: 'privado/e/ID.jpg', by: subio2 });
      sinVeneno(); rotaUrl = `privado/e/${E1}.jpg`;
      const msg = await corre(() => RB.purgarFotosEntrega());
      ok((await mediaDe(E2)).purgada && !(await mediaDe(E1)).purgada, 'fotosEntrega: el almacén no deja borrar la primera foto y la segunda sale');
      ok(resumen(msg, 'fotosEntrega', E1), `fotosEntrega: la tarea sale fallida diciendo cuál (antes try/catch → continue, en silencio; «${msg.slice(0, 140)}»)`);
      const MP = cargar('apps/web/lib/mensajes-purga.ts', { './db': base, './fotos-privadas': BCV, './medios': MED });
      const M1 = await foto({ kind: 'chat', owner: 'pendiente', url: 'privado/m/ID.jpg', by: subio2 }), M2 = await foto({ kind: 'chat', owner: 'pendiente', url: 'privado/m/ID.jpg', by: subio2 });
      sinVeneno(); rotaUrl = `privado/m/${M1}.jpg`;
      const msg2 = await corre(() => MP.purgarFotosSinEnviar());
      ok((await mediaDe(M2)).purgada && !(await mediaDe(M1)).purgada, 'fotosSinEnviar: el almacén no deja borrar la primera foto y la segunda sale');
      ok(resumen(msg2, 'fotosSinEnviar', M1), `fotosSinEnviar: la tarea sale fallida diciendo cuál («${msg2.slice(0, 140)}»)`);
    }

    // ── 30 · colasTomado: dos casos tomados que vencieron se sueltan con sus dos renglones de auditoría en una sola escritura ──
    {
      const RB = cargar('apps/web/lib/repartidor-barrido.ts', { './config': { cfgSql: cfg }, './db': base, './fotos-privadas': {}, './medios': MED });
      const quien = await usuario('Colas');
      const item = async () => (await q1(`insert into queue_items (queue, subject_kind, subject_id, status, assigned_to, assigned_at, city_id) values ('sop', 'help_request', $1, 'open', $2::uuid, '2000-01-01', 'hzl') returning id::text`,
        [`b9t9b-${randomUUID()}`, quien])).id;
      const Q1 = await item(), Q2 = await item();
      sinVeneno();
      const msg = await corre(() => RB.soltarTomados());
      const aud = (await q1(`select count(*)::int as n from audit_entries where action = 'cola.tomado_vencio' and target_id = any($1::text[]) and before->>'tomado' = $2`, [[Q1, Q2], quien])).n;
      const libres = (await q1(`select count(*)::int as n from queue_items where id = any($1::bigint[]) and assigned_to is null`, [[Q1, Q2]])).n;
      ok(msg === '' && aud === 2 && libres === 2 && vistas.filter(([t]) => /insert into audit_entries/.test(t)).length === 1, `colasTomado: los dos se sueltan con sus ${aud} renglones de auditoría en una sola escritura`);
    }

    // ── 31 · fotosVariantes: dos fotos públicas sin variantes; el almacén falla con la primera → la segunda las recibe ──
    {
      const guardadas = new Map();
      let rotaK = null;
      const FV = cargar('apps/web/lib/fotos-variantes.ts', { './db': base, './medios': { ...MED, leerObjeto: async (k) => { if (k === rotaK) throw new Error('almacenamiento 500: lento'); if (guardadas.has(k)) return guardadas.get(k); throw new Error('almacenamiento 404: NoSuchKey'); },
        guardarObjeto: async (k, b) => { guardadas.set(k, b); }, existeObjeto: async () => true, borrarObjeto: async () => undefined } });
      const V1 = await foto({ kind: 'business', owner: 'b9t9b', url: '/medios/n/ID.jpg', by: subio2, privada: false, at: '1999-01-01' }), V2 = await foto({ kind: 'business', owner: 'b9t9b', url: '/medios/n/ID.jpg', by: subio2, privada: false, at: '1999-01-01' });
      guardadas.set(`n/${V2}.jpg`, JPG);
      sinVeneno(); rotaK = `n/${V1}.jpg`;
      const msg = await corre(() => FV.barrerVariantes());
      ok((await mediaDe(V2)).var && !(await mediaDe(V1)).var, 'fotosVariantes: el almacén falla con la primera foto y la segunda recibe sus variantes');
      ok(resumen(msg, 'fotosVariantes', V1), `fotosVariantes: la tarea sale fallida diciendo cuál (antes contaba «fallos» y salía bien; «${msg.slice(0, 140)}»)`);
    }

    // ── 32 · fotosRevision: dos fotos retenidas; la primera lanza → la segunda se vuelve a revisar ──
    {
      const R0 = { on: false, p: {} };
      const FR = cargar('apps/web/lib/fotos-revision.ts', { './avisos': AVISOS, './db': base, './fotos-decision': cargar('apps/web/lib/fotos-decision.ts'), './fotos-privadas': {}, './fotos-variantes': {}, './fotos-segunda-opinion': {},
        './medios': { ...MED, leerObjeto: async () => { throw new Error('almacenamiento 404: NoSuchKey'); } }, './moderacion': { reglasMod: async () => ({ foto1: R0, foto2: { on: true, p: {} }, foto3: R0, foto4: R0 }) }, './moderacion-img': {} });
      const ret = async () => { const id = await foto({ kind: 'business', owner: 'b9t9b', url: '/medios/n/ID.jpg', by: subio2, privada: false, status: 'review' });
        await replica(() => c.query(`update media set rev_llave = 'privado/rev/' || id::text || '.jpg', rev_siguiente = null, rev_intentos = 0 where id = $1::uuid`, [id])); return id; };
      const X1 = await ret(), X2 = await ret();
      const FILA = /rev_sin_c2, private from media\s+where id = \$1::uuid and rev_llave is not null/;
      sinVeneno(); veneno = (t, p) => FILA.test(t) && p[0] === X1;
      const msg = await corre(() => FR.barrerRevision());
      ok(corrio(FILA, X2), 'fotosRevision: la primera foto lanza y la segunda se vuelve a revisar');
      ok(resumen(msg, 'fotosRevision', X1), `fotosRevision: la tarea sale fallida diciendo cuál (antes .catch(() => "nada"); «${msg.slice(0, 140)}»)`);
    }

    // ── 33 · fotosPrivadas: dos fotos de destino privado que siguen bajo n/; mover la primera lanza → la segunda pasa a su llave privada ──
    {
      const MEDP = { ...MED, borrarObjeto: async () => undefined, leerObjeto: async () => { throw new Error('almacenamiento 404: NoSuchKey'); } };
      const FP = cargar('apps/web/lib/fotos-privadas.ts', { './db': base, './fotos-variantes': cargar('apps/web/lib/fotos-variantes.ts', { './db': base, './medios': MEDP }), './medios': MEDP });
      const P1 = await foto({ kind: 'request', owner: '0', url: 'https://ejemplo.invalid/ID.jpg', by: subio2, privada: false, sinC2: true, status: 'review', at: '1999-01-01' });
      const P2 = await foto({ kind: 'request', owner: '0', url: 'https://ejemplo.invalid/ID.jpg', by: subio2, privada: false, sinC2: true, status: 'review', at: '1999-01-01' });
      sinVeneno(); veneno = (t, p) => /set url = \$2, private = true, var_widths = null/.test(t) && p[0] === P1;
      const msg = await corre(() => FP.barrerPrivadas());
      ok((await mediaDe(P2)).private && !(await mediaDe(P1)).private, 'fotosPrivadas: mover la primera lanza y la segunda pasa a su llave privada');
      ok(resumen(msg, 'fotosPrivadas', P1), `fotosPrivadas: la tarea sale fallida diciendo cuál (antes try/catch → fallos++, en silencio; «${msg.slice(0, 140)}»)`);
    }

    // ── 34 · ayudaDevuelto: dos «Me lo devolvieron» sin respuesta pasado el plazo; el aviso de cierre de la primera lanza → la segunda recibe el suyo ──
    {
      const AY = cargar('apps/web/lib/ayuda-cita.ts', { './config': { cfgSql: cfg, valor: async () => 0 }, './plazo-txt': { horasTxt: () => '' }, './colas': { COLA_AYUDA_SQL: "'sop'" },
        './db': base, './cobros': {}, './ayuda': {}, './ayuda-estafa': {}, './dinero-comun': {}, './medios': MED, './avisos': AVISOS, './noche-vigilar': {}, './fotos-privadas': {} });
      const ayuda = async (o) => (await replica(async () => q1(`insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, status, outside_refund, outside_pending_at)
          values ('H-' || (800000 + floor(random() * 99999))::int, $1::bigint, $2, $3, $4::uuid, 'otro', 'answered', 'pending', '2000-01-01') returning number as n`, [o.id, o.biz, o.city, o.uid]))).n;
      const [o1, o2] = await opsLibres(2);
      const A1 = await ayuda(o1), A2 = await ayuda(o2);
      sinVeneno(); rompe = (_u, ref) => ref?.[1] === A1;
      const msg = await corre(() => AY.cerrarDevueltosSinRespuesta());
      ok(avisos.some((a) => a.tpl === 'help_devuelto_cierre' && a.ref === `help:${A2}`) && !avisos.some((a) => a.ref === `help:${A1}`), 'ayudaDevuelto: el aviso de la primera lanza y la segunda recibe su recordatorio y su cierre');
      ok(resumen(msg, 'ayudaDevuelto', `cierre ${A1}`), `ayudaDevuelto: la tarea sale fallida diciendo cuál (antes se perdía en silencio; «${msg.slice(0, 140)}»)`);
    }

    // ── 35 · repartoSolo: dos pedidos para la oferta sola que ya pasaron el tope de ofertas; «nadie» del primero lanza → el segundo sigue ──
    {
      const RS = cargar('apps/web/lib/repartidor-auto.ts', { './config': { valor: async () => 0 }, './db': base, './reparto-comun': { detPanel: (x) => x, KIND_REPARTO: "('order')" }, './repartidor-ofertas': {}, './avisos': AVISOS });
      const NADIE = /update operations set details = details \|\| jsonb_build_object\('rep_nadie', now\(\)\)/;
      sinVeneno(); falso = (t) => (/from operations o join delivery_settings d on d\.business_id = o\.business_id/.test(t) ? { rows: [{ numero: 'P9T9B-1', biz: 'b9t9b-x', n: 5 }, { numero: 'P9T9B-2', biz: 'b9t9b-x', n: 5 }], rowCount: 2 }
        : /^\s*update operations o set details = o\.details \|\| jsonb_build_object\('rec_prog', now\(\)\)/.test(t) ? { rows: [], rowCount: 0 } : null);
      veneno = (t, p) => NADIE.test(t) && p[1] === 'P9T9B-1';
      const msg = await corre(() => RS.asignarSolos());
      ok(corrio(NADIE, 'P9T9B-2'), 'repartoSolo: el primer pedido lanza y el segundo sigue («nadie lo tomó»)');
      ok(resumen(msg, 'repartoSolo', 'b9t9b-x:P9T9B-1'), `repartoSolo: la tarea sale fallida diciendo cuál («${msg.slice(0, 140)}»)`);
    }
  } catch (e) { console.error(e); malas++; } finally {
    await c.query('rollback').catch(() => undefined);
    await c.end();
  }
  console.log(`\n${malas ? 'FALLA' : 'OK'} barr9t9b (${n} comprobaciones${malas ? `, ${malas} mal` : ''})`);
  process.exit(malas ? 1 : 0);
})();
