// 9t (28 nov, LAUNCH «Cuando el cliente no contesta a “otra salida / otra hora”, nadie se entera») · Noche: el local propuso otra hora y el cliente no contestó a
// tiempo (vencerNoche, el archivo REAL): la reserva se cancela (alt_vencida, por el sistema), la retención del depósito se suelta como siempre y ahora se avisa UNA
// vez al cliente (noche_alt_fin) y UNA al local (biz_noche_alt_fin), con lo que pasó con el depósito; otras pasadas no avisan más; la que todavía está a tiempo no
// se toca; y una mesa SIN respuesta (no «otra hora») sigue avisando solo noche_exp.
// Precondiciones propias (corre dos veces seguidas): su negocio, su cliente y sus reservas; el barrido va filtrado por SU negocio y SU número.
// Uso: node pruebas/e2e/altfin-noche.cjs   (la base de pruebas arriba; sin servidor). Cada comprobación escribe «✓ …» o «✗ …» (pruebas/lib/alt-fin.cjs › ok) y el total al final.
const A = require('../lib/alt-fin.cjs');
const { db, q1, ok, avisados, P } = A;
const N = A.modulo('apps/web/lib/noche-reservas.ts');

(async () => {
  try {
    const u = await A.usuario('AltFinNoche');
    console.log('Noche: la otra hora que el cliente no contestó a tiempo avisa a los dos');
    const B = await A.negocio('af-n', 'NEG-NOCHE', 'Prueba altfin noche');
    const mesa = async (status, vence, dep) => {
      const nu = A.num('N');
      const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, night_date, party_size, details, subtotal_cents, total_cents, deposit_cents, pay_mode, pay_status, client_key, is_test, respond_by)
          values ($1, 'night', 'hzl', $2, $3, $4, ((now() at time zone 'America/New_York')::date + 3), 4, $5::jsonb, 0, 0, $6, 'app', $7, gen_random_uuid(), true, $8::timestamptz) returning id::text`,
        [nu, B, u, status, JSON.stringify({ k: 'mesa', arrive: 1320, hold: 30, svc: { es: 'Mesa altfin', en: 'Table altfin' } }), dep, dep ? 'held' : null, vence])).id;
      const pi = dep ? await A.retencion(op, u, B, dep) : null;
      if (status === 'change_proposed') await A.propuesta(op, u, vence, { m: 1380 });
      return { num: nu, op, pi };
    };
    const X = await mesa('change_proposed', new Date(Date.now() - 60e3), 2000), Y = await mesa('change_proposed', new Date(Date.now() + 3600e3), 2000);
    await A.comprobarAvisos({ X, Y, B, u, tpl: 'noche_alt_fin', tplNeg: 'biz_noche_alt_fin', barrer: (numero) => N.vencerNoche({ negocio: B, numero }),
      money: (c, n) => {
        ok(P.liberadas.filter((x) => x === X.pi).length === 1, 'el depósito se soltó una sola vez en la pasarela');
        ok(c.dev && c.dev.es.includes('Se liberó tu depósito de $20') && c.dev.en.includes('deposit was released'), `el cliente lee que se liberó su depósito (ES/EN)`);
        ok(n.dinero && n.dinero.es.includes('Se liberó su depósito de $20') && n.dinero.en.includes('deposit was released'), 'el local lee lo mismo (ES/EN)');
        ok(n.cliente && n.noche && c.noche, 'los dos avisos llevan la noche y el cliente (ES/EN)');
      } });
    ok((await q1(`select status as st from change_proposals where operation_id = $1::bigint`, [X.op])).st === 'expired', 'la otra hora propuesta vence');
    // Sin depósito: el aviso dice que no se cobró nada (el cliente) y no habla de dinero (el local).
    const W = await mesa('change_proposed', new Date(Date.now() - 60e3), 0);
    const n1 = avisados.length;
    await N.vencerNoche({ negocio: B, numero: W.num });
    const w = avisados.slice(n1);
    ok(w.length === 2 && w.find((a) => a[2] === 'noche_alt_fin')[3].dev.es.includes('No se cobró nada') && w.find((a) => a[2] === 'biz_noche_alt_fin'), 'sin depósito: «No se cobró nada» y los dos avisos igual');
    // Una mesa SIN respuesta (pendiente) no es «otra hora»: avisa lo de siempre y nada de lo nuevo.
    const Z = await mesa('pending', new Date(Date.now() - 60e3), 2000);
    const n0 = avisados.length;
    await N.vencerNoche({ negocio: B, numero: Z.num });
    const z = avisados.slice(n0).map((a) => a[2]);
    ok(z.includes('noche_exp') && !z.includes('noche_alt_fin') && !z.includes('biz_noche_alt_fin'), `pendiente vencida: solo «noche_exp» (${z.join(', ')})`);
    // Lo de esta corrida no queda vivo.
    await db.query(`update operations set respond_by = now() - interval '1 minute' where id = $1::bigint`, [Y.op]);
    await N.vencerNoche({ negocio: B });
    ok((await q1(`select status as st from operations where id = $1::bigint`, [Y.op])).st === 'cancelled', 'al vencer, la otra también (nada queda retenido de esta corrida)');
  } catch (e) { A.fallo(e); }
  await A.cerrar('altfin-noche');
})();
