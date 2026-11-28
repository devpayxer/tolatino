// 9t (28 nov, LAUNCH «Cuando el cliente no contesta a “otra salida / otra hora”, nadie se entera») · Fiestas: el salón propuso otra hora y el cliente no contestó a
// tiempo (barrerFiestas, el archivo REAL): la reserva se cancela (alt_vencida, por el sistema), la retención del depósito se suelta como siempre y ahora se avisa
// UNA vez al cliente (fiesta_alt_fin) y UNA al negocio (biz_fiesta_alt_fin), con lo que pasó con el depósito; otras pasadas no avisan más; la que todavía está a
// tiempo no se toca; y una solicitud SIN respuesta (no «otra hora») sigue avisando solo fiesta_exp.
// Precondiciones propias (corre dos veces seguidas): su negocio, su cliente y sus reservas; el barrido va filtrado por SU negocio y SU número.
// Uso: node pruebas/e2e/altfin-fiestas.cjs   (la base de pruebas arriba; sin servidor). Cada comprobación escribe «✓ …» o «✗ …» (pruebas/lib/alt-fin.cjs › ok) y el total al final.
const A = require('../lib/alt-fin.cjs');
const { db, q1, ok, avisados, P } = A;
const F = A.modulo('apps/web/lib/fiestas-reservas.ts');

(async () => {
  try {
    const u = await A.usuario('AltFinFiesta');
    console.log('Fiestas: la otra hora que el cliente no contestó a tiempo avisa a los dos');
    const B = await A.negocio('af-f', 'NEG-FIESTA', 'Prueba altfin fiestas');
    const fiesta = async (status, vence, dep) => {
      const nu = A.num('F');
      const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, party_size, details, subtotal_cents, total_cents, deposit_cents, pay_mode, pay_status, client_key, is_test, respond_by)
          values ($1, 'party', 'hzl', $2, $3, $4, now() + interval '20 days', 240, 30, $5::jsonb, 30000, 30000, $6, 'app', $7, gen_random_uuid(), true, $8::timestamptz) returning id::text`,
        [nu, B, u, status, JSON.stringify({ k: 'salon', g: 30, svc: { es: 'Salón altfin', en: 'Hall altfin' } }), dep, dep ? 'held' : null, vence])).id;
      const pi = dep ? await A.retencion(op, u, B, dep) : null;
      if (status === 'change_proposed') await A.propuesta(op, u, vence, { m: 840 });
      return { num: nu, op, pi };
    };
    const X = await fiesta('change_proposed', new Date(Date.now() - 60e3), 5000), Y = await fiesta('change_proposed', new Date(Date.now() + 3600e3), 5000);
    await A.comprobarAvisos({ X, Y, B, u, tpl: 'fiesta_alt_fin', tplNeg: 'biz_fiesta_alt_fin', barrer: (numero) => F.barrerFiestas({ negocio: B, numero }),
      money: (c, n) => {
        ok(P.liberadas.filter((x) => x === X.pi).length === 1, 'el depósito se soltó una sola vez en la pasarela');
        ok(c.dev && c.dev.es.includes('Se liberó tu depósito de $50') && c.dev.en.includes('deposit was released'), 'el cliente lee que se liberó su depósito (ES/EN)');
        ok(n.dinero && n.dinero.es.includes('Se liberó su depósito de $50') && n.dinero.en.includes('deposit was released'), 'el negocio lee lo mismo (ES/EN)');
        ok(n.cliente && n.dia && c.dia, 'los dos avisos llevan el día y el cliente (ES/EN)');
      } });
    ok((await q1(`select status as st from change_proposals where operation_id = $1::bigint`, [X.op])).st === 'expired', 'la otra hora propuesta vence');
    // Una solicitud SIN respuesta (pendiente) no es «otra hora»: avisa lo de siempre y nada de lo nuevo.
    const Z = await fiesta('pending', new Date(Date.now() - 60e3), 5000);
    const n0 = avisados.length;
    await F.barrerFiestas({ negocio: B, numero: Z.num });
    const z = avisados.slice(n0).map((a) => a[2]);
    ok(z.includes('fiesta_exp') && !z.includes('fiesta_alt_fin') && !z.includes('biz_fiesta_alt_fin'), `pendiente vencida: solo «fiesta_exp» (${z.join(', ')})`);
    // Lo de esta corrida no queda vivo.
    await db.query(`update operations set respond_by = now() - interval '1 minute' where id = $1::bigint`, [Y.op]);
    await F.barrerFiestas({ negocio: B });
    ok((await q1(`select status as st from operations where id = $1::bigint`, [Y.op])).st === 'cancelled', 'al vencer, la otra también (nada queda retenido de esta corrida)');
  } catch (e) { A.fallo(e); }
  await A.cerrar('altfin-fiestas');
})();
