// 9t (28 nov, LAUNCH «Cuando el cliente no contesta a “otra salida / otra hora”, nadie se entera») · Visitas de propiedades (Bienes Raíces): el negocio propuso otra hora y
// el cliente no contestó a tiempo (barrerVisitas, el archivo REAL): la visita se cancela (alt_vencida, por el sistema), la hora propuesta vuelve a estar libre y ahora
// se avisa UNA vez al cliente (vis_alt_fin) y UNA al negocio (biz_vis_alt_fin); otras pasadas no avisan más; la que todavía está a tiempo no se toca; y una solicitud
// SIN respuesta (no «otra hora») sigue avisando solo vis_exp. Una visita es $0 en la app: no hay retención que soltar.
// Precondiciones propias (corre dos veces seguidas): su negocio, su cliente y sus visitas; el barrido va filtrado por SU negocio y SU número.
// Uso: node pruebas/e2e/altfin-visitas.cjs   (la base de pruebas arriba; sin servidor). Cada comprobación escribe «✓ …» o «✗ …» (pruebas/lib/alt-fin.cjs › ok) y el total al final.
const A = require('../lib/alt-fin.cjs');
const { db, q1, ok, avisados } = A;
const V = A.modulo('apps/web/lib/visitas-inm.ts');

(async () => {
  try {
    const u = await A.usuario('AltFinVisita');
    console.log('Visitas: la otra hora que el cliente no contestó a tiempo avisa a los dos');
    const B = await A.negocio('af-vi', 'NEG-INMUEBLE', 'Prueba altfin visitas');
    const it = (await q1(`insert into items (business_id, name, price_cents, sell, status) values ($1, '{"es":"Casa altfin","en":"House altfin"}'::jsonb, 0, false, 'live') returning id::text`, [B])).id;
    const dia = (await q1(`select ((now() at time zone 'America/New_York')::date + 5)::text as d`)).d;
    const grupo = async () => (await q1(`insert into class_groups (business_id, city_id, item_id, label, starts_on, seats_total, seats_booked, status, purpose) values ($1, 'hzl', $2::bigint, '{"es":"Hora altfin","en":"Time altfin"}'::jsonb, current_date + 5, 1, 1, 'open', 'visita') returning id::text`, [B, it])).id;
    const visita = async (status, vence) => {
      const nu = A.num('VS'), alt = await grupo();
      const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, details, subtotal_cents, total_cents, pay_mode, client_key, is_test, respond_by)
          values ($1, 'visit', 'hzl', $2, $3, $4, now() + interval '5 days', $5::jsonb, 0, 0, 'none', gen_random_uuid(), true, $6::timestamptz) returning id::text`,
        [nu, B, u, status, JSON.stringify({ what: 'visita', dia, min: 600, item_id: it, item: { es: 'Casa altfin', en: 'House altfin' }, alt_group_id: alt }), vence])).id;
      if (status === 'change_proposed') await A.propuesta(op, u, vence, { dia, min: 660 });
      return { num: nu, op, alt };
    };
    const X = await visita('change_proposed', new Date(Date.now() - 60e3)), Y = await visita('change_proposed', new Date(Date.now() + 3600e3));
    await A.comprobarAvisos({ X, Y, B, u, tpl: 'vis_alt_fin', tplNeg: 'biz_vis_alt_fin', barrer: (numero) => V.barrerVisitas({ negocio: B, numero }),
      money: (c, n) => {
        ok(c.num === X.num && c.cuando && c.cuando.es && c.cuando.en, 'el aviso al cliente lleva el número y cuándo (ES/EN)');
        ok(n.num === X.num && n.cliente && n.cuando && n.cuando.en, 'el aviso al negocio lleva el número, el cliente y cuándo (ES/EN)');
      } });
    ok((await q1(`select seats_booked::int as n from class_groups where id = $1::bigint`, [X.alt])).n === 0, 'la hora propuesta volvió a estar libre');
    ok((await q1(`select status as st from change_proposals where operation_id = $1::bigint`, [X.op])).st === 'expired', 'la otra hora propuesta vence');
    // Una solicitud SIN respuesta (pendiente) no es «otra hora»: avisa lo de siempre y nada de lo nuevo.
    const Z = await visita('pending', new Date(Date.now() - 60e3));
    const n0 = avisados.length;
    await V.barrerVisitas({ negocio: B, numero: Z.num });
    const z = avisados.slice(n0).map((a) => a[2]);
    ok(z.includes('vis_exp') && !z.includes('vis_alt_fin') && !z.includes('biz_vis_alt_fin'), `pendiente vencida: solo «vis_exp» (${z.join(', ')})`);
    // Lo de esta corrida no queda vivo.
    await db.query(`update operations set respond_by = now() - interval '1 minute' where id = $1::bigint`, [Y.op]);
    await V.barrerVisitas({ negocio: B, numero: Y.num });
    ok((await q1(`select status as st from operations where id = $1::bigint`, [Y.op])).st === 'cancelled', 'al vencer, la otra también (nada queda vivo de esta corrida)');
  } catch (e) { A.fallo(e); }
  await A.cerrar('altfin-visitas');
})();
