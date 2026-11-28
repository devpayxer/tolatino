// 9t (28 nov, LAUNCH «Cuando el cliente no contesta a “otra salida / otra hora”, nadie se entera») · Viajes: la ruta propuso otra salida y el cliente no contestó a
// tiempo (barrerViajes, el archivo REAL): la reserva se cancela (alt_vencida, por el sistema), los asientos vuelven y la retención se suelta como siempre, y
// ahora se avisa UNA vez al cliente (viaje_alt_fin) y UNA al negocio (biz_viaje_alt_fin), con lo que pasó con la retención; otras pasadas no avisan más; la que
// todavía está a tiempo no se toca; y una reserva SIN respuesta (no «otra salida») sigue avisando solo viaje_exp.
// Precondiciones propias (corre dos veces seguidas): su negocio, su cliente, su salida y sus viajes; el barrido va filtrado por SU negocio y SU número.
// Uso: node pruebas/e2e/altfin-viajes.cjs   (la base de pruebas arriba; sin servidor). Cada comprobación escribe «✓ …» o «✗ …» (pruebas/lib/alt-fin.cjs › ok) y el total al final.
const A = require('../lib/alt-fin.cjs');
const { db, q1, ok, avisados, P } = A;
const V = A.modulo('apps/web/lib/viajes.ts', { './transporte': {}, './transporte-comun': {}, './envios': {} });

(async () => {
  try {
    const u = await A.usuario('AltFinViaje');
    console.log('Viaje: la otra salida que el cliente no contestó a tiempo avisa a los dos');
    const B = await A.negocio('af-v', 'NEG-TRANS', 'Prueba altfin viajes');
    const it = (await q1(`insert into items (business_id, name, price_cents, sell, status) values ($1, '{"es":"Ruta altfin","en":"Route altfin"}'::jsonb, 2500, true, 'live') returning id::text`, [B])).id;
    const run = (await q1(`insert into trip_runs (business_id, city_id, item_id, run_at, seats_total, seats_booked) values ($1, 'hzl', $2::bigint, now() + interval '2 days', 14, 4) returning id::text`, [B, it])).id;
    const viaje = async (status, vence) => {
      const num = A.num('V');
      const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, details, subtotal_cents, total_cents, pay_mode, pay_status, client_key, is_test, respond_by)
          values ($1, 'trip', 'hzl', $2, $3, $4, now() + interval '2 days', $5::jsonb, 5000, 5000, 'app', 'held', gen_random_uuid(), true, $6::timestamptz) returning id::text`,
        [num, B, u, status, JSON.stringify({ k: 'asiento', run, adults: 2, kids: 0, svcId: it, svc: { es: 'Ruta altfin', en: 'Route altfin' } }), vence])).id;
      await db.query(`insert into run_seats (operation_id, run_id, seats, status) values ($1::bigint, $2::bigint, 2, 'held')`, [op, run]);
      const pi = await A.retencion(op, u, B, 5000, 'full');
      if (status === 'change_proposed') await A.propuesta(op, u, vence, { run, ymd: await A.hoy(), m: 600 });
      return { num, op, pi };
    };
    const X = await viaje('change_proposed', new Date(Date.now() - 60e3)), Y = await viaje('change_proposed', new Date(Date.now() + 3600e3));
    await A.comprobarAvisos({ X, Y, B, u, tpl: 'viaje_alt_fin', tplNeg: 'biz_viaje_alt_fin', barrer: (numero) => V.barrerViajes({ negocio: B, numero }),
      money: (c, n) => {
        ok(P.liberadas.filter((x) => x === X.pi).length === 1, 'la retención se soltó una sola vez en la pasarela');
        ok(c.dinero && c.dinero.es.includes('Liberamos lo retenido') && c.dinero.en.includes('released'), 'el cliente lee que se liberó lo retenido (ES/EN)');
        ok(n.dinero && n.dinero.es.includes('liberó') && n.dinero.en.includes('released') && n.cliente, 'el negocio lee lo mismo, con el nombre del cliente (ES/EN)');
      } });
    ok((await q1(`select seats_booked::int as n from trip_runs where id = $1::bigint`, [run])).n === 2, 'los 2 asientos volvieron a la salida');
    // Una reserva SIN respuesta (pendiente) no es «otra salida»: avisa lo de siempre y nada de lo nuevo.
    const Z = await viaje('pending', new Date(Date.now() - 60e3));
    const n0 = avisados.length;
    await V.barrerViajes({ negocio: B, numero: Z.num });
    const z = avisados.slice(n0).map((a) => a[2]);
    ok(z.includes('viaje_exp') && !z.includes('viaje_alt_fin') && !z.includes('biz_viaje_alt_fin'), `pendiente vencida: solo «viaje_exp» (${z.join(', ')})`);
    // Lo de esta corrida no queda vivo: la que estaba a tiempo vence por su camino.
    await db.query(`update operations set respond_by = now() - interval '1 minute' where id = $1::bigint`, [Y.op]);
    await V.barrerViajes({ negocio: B });
    ok((await q1(`select status as st from operations where id = $1::bigint`, [Y.op])).st === 'cancelled', 'al vencer, la otra también (nada queda retenido de esta corrida)');
  } catch (e) { A.fallo(e); }
  await A.cerrar('altfin-viajes');
})();
