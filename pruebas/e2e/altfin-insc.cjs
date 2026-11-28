// 9t (28 nov, LAUNCH «Cuando el cliente no contesta a “otra salida / otra hora”, nadie se entera») · Clases e inscripciones: el lugar propuso otro grupo (u otra
// fecha) y el cliente no contestó a tiempo (vencerInsc, el archivo REAL): la inscripción se cancela (alt_vencida, por el sistema), el cupo del otro grupo vuelve y
// la matrícula retenida se suelta como siempre, y ahora se avisa UNA vez al cliente (insc_alt_fin) y UNA al lugar (biz_insc_alt_fin), con lo que pasó con la matrícula;
// otras pasadas no avisan más; la que todavía está a tiempo no se toca.
// Y las otras clases del mismo barrido (al revés): una inscripción SIN respuesta (no «otro grupo») avisa solo insc_exp; en Iglesias el aviso del cliente es el de la
// iglesia (insc_fe_alt_fin) y, en consejería u oración, el NEUTRO (insc_fen_alt_fin), y el del lugar nunca nombra el servicio de una consejería.
// Precondiciones propias (corre dos veces seguidas): su negocio, su cliente y sus inscripciones; el barrido va filtrado por SU negocio y SU número.
// Uso: node pruebas/e2e/altfin-insc.cjs   (la base de pruebas arriba; sin servidor). Cada comprobación escribe «✓ …» o «✗ …» (pruebas/lib/alt-fin.cjs › ok) y el total al final.
const A = require('../lib/alt-fin.cjs');
const { db, q1, ok, avisados, P } = A;
const I = A.modulo('apps/web/lib/inscripciones.ts', { './ninos-privado': {} });

(async () => {
  try {
    const u = await A.usuario('AltFinInsc');
    console.log('Clases: el otro grupo que el cliente no contestó a tiempo avisa a los dos');
    const B = await A.negocio('af-i', 'NEG-EDU', 'Prueba altfin clases');
    const it = (await q1(`insert into items (business_id, name, price_cents, sell, status) values ($1, '{"es":"Clase altfin","en":"Class altfin"}'::jsonb, 2500, true, 'live') returning id::text`, [B])).id;
    const grupo = async (n) => (await q1(`insert into class_groups (business_id, city_id, item_id, label, starts_on, seats_total, seats_booked, status, purpose) values ($1, 'hzl', $3::bigint, '{"es":"Grupo altfin","en":"Group altfin"}'::jsonb, current_date + 10, 10, $2, 'open', 'insc') returning id::text`, [B, n, it])).id;
    const insc = async (status, vence, mat, det = {}) => {
      const nu = A.num('I'), alt = await grupo(3);
      const op = (await q1(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, deposit_cents, pay_mode, pay_status, client_key, is_test, respond_by)
          values ($1, 'enrollment', 'hzl', $2, $3, $4, $5::jsonb, 0, 0, $6, 'app', $7, gen_random_uuid(), true, $8::timestamptz) returning id::text`,
        [nu, B, u, status, JSON.stringify({ k: 'clase', rubro: 'edu', svc: { es: 'Clase altfin', en: 'Class altfin' }, alt_group_id: alt, ...det }), mat, mat ? 'held' : null, vence])).id;
      const pi = mat ? await A.retencion(op, u, B, mat) : null;
      if (status === 'change_proposed') await A.propuesta(op, u, vence, { group_id: alt });
      return { num: nu, op, pi, alt };
    };
    const barrer = (numero) => I.vencerInsc({ negocio: B, numero });
    const X = await insc('change_proposed', new Date(Date.now() - 60e3), 2500), Y = await insc('change_proposed', new Date(Date.now() + 3600e3), 2500);
    await A.comprobarAvisos({ X, Y, B, u, tpl: 'insc_alt_fin', tplNeg: 'biz_insc_alt_fin', barrer,
      money: (c, n) => {
        ok(P.liberadas.filter((x) => x === X.pi).length === 1, 'la matrícula se soltó una sola vez en la pasarela');
        ok(c.dev && c.dev.es.includes('Se liberó tu matrícula de $25') && c.dev.en.includes('fee was released'), 'el cliente lee que se liberó su matrícula (ES/EN)');
        ok(n.dinero && n.dinero.es.includes('Se liberó su matrícula de $25') && n.dinero.en.includes('fee was released'), 'el lugar lee lo mismo (ES/EN)');
        ok(n.cliente && n.servicio && n.servicio.es === 'Clase altfin', 'el aviso del lugar lleva al cliente y el servicio (ES/EN)');
      } });
    ok((await q1(`select seats_booked::int as n from class_groups where id = $1::bigint`, [X.alt])).n === 2, 'el cupo del otro grupo volvió (3 → 2)');
    ok((await q1(`select status as st from change_proposals where operation_id = $1::bigint`, [X.op])).st === 'expired', 'el otro grupo propuesto vence');

    // Al revés 1 · Una inscripción SIN respuesta (pendiente) no es «otro grupo»: avisa lo de siempre y nada de lo nuevo.
    const Z = await insc('pending', new Date(Date.now() - 60e3), 2500);
    let n0 = avisados.length;
    await barrer(Z.num);
    const z = avisados.slice(n0).map((a) => a[2]);
    ok(z.includes('insc_exp') && !z.includes('insc_alt_fin') && !z.includes('biz_insc_alt_fin') && !z.includes('insc_fe_alt_fin'), `pendiente vencida: solo «insc_exp» (${z.join(', ')})`);

    // Al revés 2 · Sin matrícula el aviso dice que no se cobró nada y el del lugar lo dice sin hablar de una matrícula.
    const S = await insc('change_proposed', new Date(Date.now() - 60e3), 0);
    n0 = avisados.length;
    await barrer(S.num);
    const s = avisados.slice(n0);
    ok(s.length === 2 && s.find((a) => a[2] === 'insc_alt_fin')[3].dev.es.includes('No se cobró nada') && s.find((a) => a[2] === 'biz_insc_alt_fin')[3].dinero.en.includes('Nothing was charged'), 'sin matrícula: «No se cobró nada» (ES/EN) en los dos avisos');

    // Al revés 3 · Iglesias: la plantilla de la iglesia; en consejería, la neutra; y el aviso del lugar no nombra el servicio de una consejería.
    const Fe = await insc('change_proposed', new Date(Date.now() - 60e3), 0, { rubro: 'fe', k: 'fecha', svc: { es: 'Misa altfin', en: 'Mass altfin' } });
    const Ne = await insc('change_proposed', new Date(Date.now() - 60e3), 0, { rubro: 'fe', k: 'fecha', neutro: true, svc: { es: 'Consejería altfin', en: 'Counseling altfin' } });
    n0 = avisados.length;
    await barrer(Fe.num);
    const fe = avisados.slice(n0).map((a) => a[2]);
    ok(fe.length === 2 && fe.includes('insc_fe_alt_fin') && fe.includes('biz_insc_alt_fin'), `iglesia: «insc_fe_alt_fin» al cliente y el del lugar (${fe.join(', ')})`);
    n0 = avisados.length;
    await barrer(Ne.num);
    const ne = avisados.slice(n0);
    ok(ne.length === 2 && ne.some((a) => a[2] === 'insc_fen_alt_fin') && !ne.some((a) => a[2] === 'insc_fe_alt_fin' || a[2] === 'insc_alt_fin'), `consejería: solo la plantilla neutra «insc_fen_alt_fin» (${ne.map((a) => a[2]).join(', ')})`);
    const nb = ne.find((a) => a[2] === 'biz_insc_alt_fin');
    ok(nb && nb[3].servicio.es === 'una inscripción' && nb[3].servicio.en === 'an enrollment', 'el aviso del lugar de una consejería no nombra el servicio');
    const mig = require('fs').readFileSync(require('path').join(require('../lib/entorno.cjs').RAIZ, 'packages/db/migrations/0230_avisos_otra_salida_sin_respuesta.sql'), 'utf8');
    const fen = mig.split('\n').find((l) => l.includes("('insc_fen_alt_fin'")) || '';
    ok(/"es":/.test(fen) && /"en":/.test(fen) && !/\{(negocio|servicio|cliente|motivo|nota|item|nino)\}/.test(fen), 'la plantilla neutra (ES/EN) no lleva negocio, servicio ni motivo');

    // Lo de esta corrida no queda vivo.
    await db.query(`update operations set respond_by = now() - interval '1 minute' where id = $1::bigint`, [Y.op]);
    await I.vencerInsc({ negocio: B });
    ok((await q1(`select status as st from operations where id = $1::bigint`, [Y.op])).st === 'cancelled', 'al vencer, la otra también (nada queda retenido de esta corrida)');
  } catch (e) { A.fallo(e); }
  await A.cerrar('altfin-insc');
})();
