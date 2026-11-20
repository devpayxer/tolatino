// Revisión automática de las fotos públicas (decisión AJ, 20 nov) · Prueba pura de los archivos REALES (transpilados: pruebas/lib/ts-servidor.cjs),
// sin servidor, sin base y sin almacén (corre en cualquier lado, también en el CI con las al revés):
//   - lib/fotos-decision.ts decidir(): TODAS las ramas — memoria rechazada/aprobada, capa 1 limpia/dudosa/clara, los bordes (= duda es dudosa,
//     = rechazo es clara), el modelo propio caído o apagado, la confianza (solo una dudosa de verdad; nunca una clara ni una sin puntaje), la
//     segunda opinión apagada / sin presupuesto / sin respuesta / publicar / rechazar / no_segura / basura, y que nada que falle publica
//   - leerSegunda (estricta), memoriaDe (persona manda, rechazo para cualquiera, aprobación solo de quien subió), umbralesDe (límites; rechazo
//     nunca por debajo de duda), mensajeSubida y los códigos HTTP (nunca 0 ni 400: el cliente no reintenta)
//   - lib/fotos-segunda-opinion.ts: una foto privada (marcada, de Mensajes/ayuda/entrega/reclamo, o con otra llave) NUNCA llega al modelo; a la que
//     va, solo la imagen reducida (≤ 640 px, JPEG) y la pauta; tope antes (sin reserva no se llama) y libro después (en el error y en la respuesta)
//   - el simulador (lib/compa/modelo-simulador.ts): el guion por el alto de la imagen que usa la prueba de punta a punta rev9u
// Guardianes fotosRevisionAntesDePublicar, fotosRevisionPrivacidad, fotosRevisionFalloCerrado. Punta a punta: pruebas/e2e/rev9u.cjs.
const path = require('path');
const { cargar, RAIZ } = require('../lib/ts-servidor.cjs');
const sharp = require(path.join(RAIZ, 'apps/web/node_modules/sharp'));
let n = 0, malas = 0;
const ok = (x, m) => { if (x) { n++; console.log('  ✓', m); } else { malas++; console.log('  ✗', m); } };

const D = cargar('apps/web/lib/fotos-decision.ts');
const U = D.umbralesDe({ duda_pct: 60, rechazo_pct: 85 });
const base = (o = {}) => ({ memoria: null, c1: { on: true, puntaje: 0.1 }, umbrales: U, confianza: false, ...o });
const es = (d, estado, capa, motivo) => d.estado === estado && (capa === undefined || d.capa === capa) && (motivo === undefined || d.motivo === motivo);

(async () => {
  console.log('decidir · capa 1');
  ok(es(D.decidir(base()), 'visible', 'c1', null), 'limpia (0.10 < 0.60) → visible, capa 1');
  ok(es(D.decidir(base({ c1: { on: true, puntaje: 0.5999 } })), 'visible', 'c1'), 'justo debajo de duda → visible');
  ok(D.decidir(base({ c1: { on: true, puntaje: 0.6 } })).estado === 'pedir_c2', 'borde: puntaje = duda → dudosa (pide la capa 2)');
  ok(D.decidir(base({ c1: { on: true, puntaje: 0.8499 } })).estado === 'pedir_c2', 'justo debajo de rechazo → dudosa');
  ok(es(D.decidir(base({ c1: { on: true, puntaje: 0.85 } })), 'rechazada', 'c1', 'desnudez'), 'borde: puntaje = rechazo → clara, rechazada (desnudez)');
  ok(es(D.decidir(base({ c1: { on: true, puntaje: 0.99 } })), 'rechazada', 'c1'), 'clara → rechazada');
  ok(es(D.decidir(base({ c1: { on: true, puntaje: 7 } })), 'rechazada', 'c1'), 'un puntaje fuera de rango se acota a 1 → rechazada');
  ok(D.decidir(base({ c1: { on: true, puntaje: null } })).estado === 'pedir_c2' && D.decidir(base({ c1: { on: true, puntaje: null } })).porque === 'sin_servicio', 'modelo propio caído → capa 2 (sin_servicio), nunca visible');
  ok(D.decidir(base({ c1: { on: true, puntaje: NaN } })).estado === 'pedir_c2', 'un puntaje que no es número = sin respuesta → capa 2');
  ok(D.decidir(base({ c1: { on: false, puntaje: 0.01 } })).porque === 'apagada', 'capa 1 apagada → todo a la capa 2 (aunque haya puntaje)');

  console.log('decidir · capa 4 (confianza)');
  ok(es(D.decidir(base({ c1: { on: true, puntaje: 0.7 }, confianza: true })), 'visible', 'c4'), 'dudosa con confianza → visible por la capa 4, sin la capa 2');
  ok(es(D.decidir(base({ c1: { on: true, puntaje: 0.9 }, confianza: true })), 'rechazada', 'c1'), 'clara con confianza → rechazada igual');
  ok(D.decidir(base({ c1: { on: true, puntaje: null }, confianza: true })).estado === 'pedir_c2', 'sin puntaje (modelo caído) con confianza → NO se publica: capa 2');
  ok(D.decidir(base({ c1: { on: false, puntaje: null }, confianza: true })).estado === 'pedir_c2', 'capa 1 apagada con confianza → capa 2');

  console.log('decidir · capa 2');
  const dud = (c2, o = {}) => D.decidir(base({ c1: { on: true, puntaje: 0.7 }, c2, ...o }));
  ok(es(dud({ estado: 'apagada' }), 'retenida', 'c2', 'apagada'), 'capa 2 apagada → retenida');
  ok(es(dud({ estado: 'sin_presupuesto' }), 'retenida', 'c2', 'sin_presupuesto'), 'capa 2 sin presupuesto → retenida');
  console.log('decidir · destino privado (va solo a un negocio o al equipo)');
  const priv = (o) => D.decidir(base({ privada: true, ...o }));
  ok(es(priv({ c1: { on: true, puntaje: 0.7 } }), 'retenida', 'c1', 'privada'), 'privada dudosa → retenida («privada»), sin pedir la segunda opinión');
  ok(es(priv({ c1: { on: true, puntaje: null } }), 'visible', 'c1', 'sin_servicio') && priv({ c1: { on: true, puntaje: null } }).puntaje === null, 'privada con el modelo propio sin respuesta → ENTRA (c1 · sin_servicio, como antes de AJ)');
  ok(es(priv({ c1: { on: false, puntaje: null } }), 'visible', 'c1', 'apagada'), 'privada con la capa 1 apagada → entra (c1 · apagada)');
  ok(es(priv({ c1: { on: true, puntaje: 0.1 } }), 'visible', 'c1', null) && es(priv({ c1: { on: true, puntaje: 0.9 } }), 'rechazada', 'c1', 'desnudez'), 'privada: la limpia entra igual y la clara se rechaza igual');
  ok(es(priv({ c1: { on: true, puntaje: 0.85 } }), 'rechazada', 'c1') && es(priv({ c1: { on: true, puntaje: 0.6 } }), 'retenida', 'c1', 'privada'), 'privada en los bordes: = rechazo se rechaza; = duda queda retenida');
  ok(es(priv({ memoria: { estado: 'rechazada', motivo: 'documento' }, c1: { on: true, puntaje: null } }), 'rechazada', 'memoria'), 'privada con contenido ya rechazado → rechazada (aunque el modelo esté caído)');
  ok([undefined, { estado: 'respuesta', json: { veredicto: 'publicar', motivo: '' } }].every((c2) => priv({ c1: { on: true, puntaje: 0.7 }, c2 }).estado === 'retenida'), 'privada dudosa: aunque alguien le pase una respuesta de la capa 2, no la usa');
  ok(es(D.decidir(base({ privada: false, c1: { on: true, puntaje: null }, c2: { estado: 'sin_respuesta' } })), 'retenida', 'c2', 'sin_servicio') && D.decidir(base({ privada: false, c1: { on: true, puntaje: null } })).estado === 'pedir_c2',
    'la PÚBLICA sin servicio sigue en fallo cerrado: pide la capa 2 y, sin respuesta, queda retenida');
  ok(es(dud({ estado: 'privada' }), 'retenida', 'c2', 'privada'), 'la capa 2 marcada «privada» (defensa) → retenida');
  ok(es(dud({ estado: 'sin_respuesta' }), 'retenida', 'c2', 'no_segura'), 'capa 2 no responde (dudosa) → retenida');
  ok(es(D.decidir(base({ c1: { on: true, puntaje: null }, c2: { estado: 'sin_respuesta' } })), 'retenida', 'c2', 'sin_servicio'), 'los dos modelos caídos → retenida (sin_servicio), nunca publicada');
  ok(es(dud({ estado: 'respuesta', json: { veredicto: 'publicar', motivo: '' } }), 'visible', 'c2'), 'capa 2 publicar → visible');
  ok(es(dud({ estado: 'respuesta', json: { veredicto: 'rechazar', motivo: 'documento' } }), 'rechazada', 'c2', 'documento'), 'capa 2 rechazar (documento) → rechazada con su motivo');
  for (const m of D.MOTIVOS) ok(es(dud({ estado: 'respuesta', json: { veredicto: 'rechazar', motivo: m } }), 'rechazada', 'c2', m), `capa 2 rechazar con «${m}» → rechazada`);
  ok(es(dud({ estado: 'respuesta', json: { veredicto: 'no_segura', motivo: '' } }), 'retenida', 'c2', 'no_segura'), 'capa 2 no_segura → retenida');
  const basura = [null, undefined, 'publicar', 42, [], ['publicar'], {}, { veredicto: 'publicar' }, { veredicto: 'PUBLICAR', motivo: '' }, { veredicto: 'publicar', motivo: 'desnudez' },
    { veredicto: 'rechazar', motivo: '' }, { veredicto: 'rechazar', motivo: 'feo' }, { veredicto: 'rechazar', motivo: 'reglas' }, { veredicto: 'publicar', motivo: '', nota: 'y además…' },
    { veredicto: 'aprobar', motivo: '' }, { veredicto: 'publicar', motivo: 0 }];
  for (const j of basura) ok(es(dud({ estado: 'respuesta', json: j }), 'retenida', 'c2', 'no_segura'), `respuesta que no encaja ${JSON.stringify(j) ?? 'undefined'} → retenida (no_segura)`);
  ok(es(dud({ estado: 'algo' }), 'retenida', 'c2', 'no_segura'), 'un estado desconocido de la capa 2 → retenida');
  ok(es(D.decidir(base({ c1: { on: false, puntaje: null }, c2: { estado: 'respuesta', json: { veredicto: 'publicar', motivo: '' } } })), 'visible', 'c2'), 'capa 1 apagada + capa 2 publicar → visible por la capa 2');

  console.log('decidir · memoria por contenido');
  ok(es(D.decidir(base({ memoria: { estado: 'rechazada', motivo: 'captura' }, c1: { on: true, puntaje: 0.01 } })), 'rechazada', 'memoria', 'captura'), 'contenido ya rechazado → rechazada directo (aunque el modelo lo vea limpio)');
  ok(es(D.decidir(base({ memoria: { estado: 'rechazada', motivo: 'desnudez' }, confianza: true })), 'rechazada', 'memoria'), 'ya rechazado con confianza → rechazado');
  ok(es(D.decidir(base({ memoria: { estado: 'aprobada' }, c1: { on: true, puntaje: 0.99 } })), 'visible', 'memoria'), 'contenido ya aprobado para esta persona → entra directo');
  ok(es(D.decidir(base({ memoria: { estado: 'aprobada' }, c1: { on: true, puntaje: null } })), 'visible', 'memoria'), 'ya aprobado entra aunque el modelo propio esté caído');

  console.log('nada que falle publica (todas las combinaciones)');
  let publicaMal = 0, combos = 0;
  const c2s = [undefined, { estado: 'apagada' }, { estado: 'privada' }, { estado: 'sin_presupuesto' }, { estado: 'sin_respuesta' }, { estado: 'respuesta', json: { veredicto: 'no_segura', motivo: '' } }, { estado: 'respuesta', json: 'x' }];
  for (const on of [true, false]) for (const p of [null, 0.6, 0.7, 0.85, 0.95]) for (const conf of [true, false]) for (const c2 of c2s) {
    combos++; const d = D.decidir(base({ c1: { on, puntaje: p }, confianza: conf, c2, privada: false }));
    const genuinaDudosa = on && p !== null && p >= 0.6 && p < 0.85;
    if (d.estado === 'visible' && !(conf && genuinaDudosa)) publicaMal++;
  }
  ok(publicaMal === 0, `de ${combos} combinaciones sin un «publicar» de un modelo, ninguna publica (salvo la dudosa de verdad con confianza)`);

  console.log('umbralesDe');
  const u0 = D.umbralesDe(undefined); ok(u0.duda === 0.6 && u0.rechazo === 0.85, 'sin valores: 0.60 y 0.85');
  const u1 = D.umbralesDe({ duda_pct: 5, rechazo_pct: 500 }); ok(u1.duda === 0.3 && u1.rechazo === 0.99, 'fuera de límites se acota (30 %–95 %, 50 %–99 %)');
  const u2 = D.umbralesDe({ duda_pct: 90, rechazo_pct: 70 }); ok(u2.duda === 0.9 && u2.rechazo === 0.9, 'rechazo por debajo de duda → rechazo = duda (nunca se cruza)');
  const u3 = D.umbralesDe({ duda_pct: 'x', rechazo_pct: null }); ok(u3.duda === 0.6 && u3.rechazo === 0.85, 'valores que no son número → los de fábrica');

  console.log('memoriaDe');
  const V = (decision, capa, mio, motivo = null) => ({ decision, capa, mio, motivo });
  ok(D.memoriaDe([]) === null, 'sin veredictos → sin memoria');
  ok(D.memoriaDe([V('publicar', 'c1', true)]) === null, 'publicada por la capa 1 → no es memoria (se vuelve a mirar, da lo mismo)');
  ok(D.memoriaDe([V('publicar', 'c2', true)])?.estado === 'aprobada', 'aprobada por la capa 2 a esta persona → entra directo');
  ok(D.memoriaDe([V('publicar', 'c2', false)]) === null, 'aprobada por la capa 2 a OTRA persona → no vale para mí');
  ok(D.memoriaDe([V('rechazar', 'c1', false, 'desnudez')])?.estado === 'rechazada', 'rechazada por la capa 1 a otra persona → rechazada para cualquiera');
  ok(D.memoriaDe([V('publicar', 'c2', true), V('rechazar', 'c2', false, 'captura')])?.motivo === 'captura', 'un rechazo de un modelo vale aunque haya una aprobación (sin persona)');
  ok(D.memoriaDe([V('publicar', 'persona', true), V('rechazar', 'c2', true, 'documento')])?.estado === 'aprobada', 'apelación ganada (persona publica) → el rechazo ya no vale; entra directo para quien la subió');
  ok(D.memoriaDe([V('publicar', 'persona', false), V('rechazar', 'c1', false)]) === null, 'apelación ganada por otra persona → para mí, revisión normal (ni rechazo ni entrada directa)');
  ok(D.memoriaDe([V('rechazar', 'persona', false, null), V('publicar', 'persona', true)])?.estado === 'rechazada', 'la decisión MÁS NUEVA de una persona manda (rechazó después) → rechazada');
  ok(D.memoriaDe([V('rechazar', 'persona', true, null)])?.motivo === 'reglas', 'una persona rechazó con su motivo → «no cumple las reglas»');

  console.log('mensajeSubida y códigos');
  const mr = D.mensajeSubida({ estado: 'rechazada', capa: 'c2', motivo: 'documento', puntaje: null });
  ok(/documento de identidad/.test(mr.es) && /ID/.test(mr.en) && /revise una persona/.test(mr.es), 'rechazada: el motivo y que puede pedir revisión (ES/EN)');
  const mt = D.mensajeSubida({ estado: 'retenida', capa: 'c2', motivo: 'no_segura', puntaje: null });
  ok(/en revisión/.test(mt.es) && /under review/.test(mt.en) && /avisamos/.test(mt.es), 'retenida: que está en revisión y se le avisa (ES/EN)');
  ok(D.HTTP_RECHAZADA === 422 && D.HTTP_RETENIDA === 202, 'rechazada 422 y retenida 202 (el cliente reintenta solo con 0 o 400)');
  ok(Object.keys(D.MOTIVO_TEXTO).every((k) => D.MOTIVO_TEXTO[k].es && D.MOTIVO_TEXTO[k].en), 'cada motivo en español e inglés');
  ok(!/\b(negocio|ciudad|nombre|tel[eé]fono|uploader)\b/i.test(D.PAUTA.replace(/guía de negocios|volante de un negocio/g, '')), 'la pauta no lleva nada de quién la subió, ni negocio, ni ciudad');
  ok(/captura: una captura de pantalla de otra aplicación o página web \(un cartel o volante de un negocio o de un evento NO es motivo de rechazo\)/.test(D.PAUTA) && !/anuncio/.test(D.PAUTA) && !/anuncio|\bad\b/.test(D.MOTIVO_TEXTO.captura.es + D.MOTIVO_TEXTO.captura.en), 'captura: solo una captura de pantalla; un cartel o volante no es motivo (la pauta y el motivo ES/EN)');
  const mp = D.mensajeSubida({ estado: 'retenida', capa: 'c2', motivo: 'privada', puntaje: null });
  ok(/revise una persona/.test(mp.es) && /ask a person/.test(mp.en), 'retenida por destino privado: pide revisión a una persona (ES/EN)');

  console.log('segunda opinión · privacidad, tope y libro');
  const llamadas = [], Q = [];
  const estado = { motor: 'simulador', reserva: 'r-1', falla: null };
  const modeloStub = {
    ErrorModelo: class extends Error { constructor(tipo, cobrar, msg, tokens) { super(msg); this.tipo = tipo; this.cobrar = cobrar; this.tokens = tokens; } },
    motorActivo: () => estado.motor,
    modelo: async (m) => (m === 'reglas' ? null : { motor: m, responder: async (e) => { llamadas.push(e); if (estado.falla) throw estado.falla; return { json: { veredicto: 'publicar', motivo: '' }, tokens: { entrada: 900, salida: 12, cacheLeida: 0, cacheEscrita: 0 }, motor: m, modelo: e.modelo }; } }),
  };
  const filas = new Map();
  const dbStub = { db: () => ({ query: async (sql, p) => {
    Q.push(sql);
    if (/foto2_reservar/.test(sql)) return { rows: [{ id: estado.reserva }] };
    if (/foto2_anotar/.test(sql)) return { rows: [{ c: '123' }] };
    if (/from media where id = \$1::uuid/.test(sql)) return { rows: filas.has(p[0]) ? [filas.get(p[0])] : [] };
    return { rows: [] };
  } }) };
  const S = cargar('apps/web/lib/fotos-segunda-opinion.ts', { './db': dbStub, '@/lib/compa/modelo': modeloStub, '@/lib/compa/tope': { modeloDe: async () => 'claude-haiku-5-5' }, './fotos-decision': D });
  const jpg = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 90, b: 60 } } }).jpeg().withExif({ IFD0: { Make: 'Camara' } }).toBuffer();
  const grande = await jpg(1600, 1200);
  const U1 = '11111111-1111-4111-8111-111111111111';
  const privadas = [
    [{ mediaId: null, llave: `n/${U1}.jpg`, privada: true, dueno: 'user', sinC2: false }, 'marcada privada'],
    [{ mediaId: null, llave: `n/${U1}.jpg`, privada: false, dueno: 'user', sinC2: true }, 'subida con destino privado (sin fila)'],
    [{ mediaId: '55555555-5555-4555-8555-555555555555', llave: `privado/rev/55555555-5555-4555-8555-555555555555.jpg`, privada: false, dueno: 'user', sinC2: false }, 'una fila con destino privado en la base (rev_sin_c2) aunque quien llama diga que no'],
    [{ mediaId: null, llave: `privado/m/${U1}.jpg`, privada: false, dueno: 'user' }, 'llave de Mensajes (privado/m/)'],
    [{ mediaId: null, llave: `privado/a/${U1}.jpg`, privada: false, dueno: 'user' }, 'llave de ayuda (privado/a/)'],
    [{ mediaId: null, llave: `privado/e/${U1}.jpg`, privada: false, dueno: 'user' }, 'llave de la entrega (privado/e/)'],
    [{ mediaId: null, llave: `privado/r/${U1}.jpg`, privada: false, dueno: 'user' }, 'llave de un reclamo (privado/r/)'],
    ...['chat', 'dm', 'help', 'support', 'claim'].map((d) => [{ mediaId: null, llave: `n/${U1}.jpg`, privada: false, dueno: d }, `dueño ${d}`]),
    [{ mediaId: null, llave: `n/${U1}.jpg`, privada: false, dueno: 'business' }, 'una subida sin fila que no es de la persona'],
    [{ mediaId: U1, llave: `n/${U1}.jpg`, privada: false, dueno: 'business' }, 'una fila que en la base es privada'],
    [{ mediaId: '22222222-2222-4222-8222-222222222222', llave: `privado/rev/22222222-2222-4222-8222-222222222222.jpg`, privada: false, dueno: 'user' }, 'una fila que en la base es de Mensajes'],
    [{ mediaId: '33333333-3333-4333-8333-333333333333', llave: `privado/rev/44444444-4444-4444-8444-444444444444.jpg`, privada: false, dueno: 'business' }, 'una llave que no es la de esa fila'],
  ];
  filas.set(U1, { private: true, owner_kind: 'business', url: `/medios/n/${U1}.jpg`, rev_llave: null });
  filas.set('55555555-5555-4555-8555-555555555555', { private: false, owner_kind: 'user', url: '/medios/n/55555555-5555-4555-8555-555555555555.jpg', rev_llave: 'privado/rev/55555555-5555-4555-8555-555555555555.jpg', rev_sin_c2: true });
  filas.set('22222222-2222-4222-8222-222222222222', { private: false, owner_kind: 'chat', url: 'privado/m/x.jpg', rev_llave: 'privado/rev/22222222-2222-4222-8222-222222222222.jpg' });
  filas.set('33333333-3333-4333-8333-333333333333', { private: false, owner_kind: 'business', url: '/medios/n/33333333-3333-4333-8333-333333333333.jpg', rev_llave: 'privado/rev/33333333-3333-4333-8333-333333333333.jpg' });
  for (const [f, que] of privadas) {
    const antes = llamadas.length, qa = Q.filter((x) => /foto2_reservar/.test(x)).length;
    let lanzo = false; try { await S.segundaOpinion(f, grande, { esperaMs: 8000 }); } catch { lanzo = true; }
    ok(lanzo && llamadas.length === antes && Q.filter((x) => /foto2_reservar/.test(x)).length === qa, `privada (${que}) → se niega: no llega al modelo ni reserva`);
  }
  const pub = { mediaId: null, llave: `n/${U1}.jpg`, privada: false, dueno: 'user', sinC2: false };
  const r1 = await S.segundaOpinion(pub, grande, { esperaMs: 8000 });
  const e1 = llamadas[llamadas.length - 1];
  const m1 = await sharp(Buffer.from(e1.imagen.base64, 'base64')).metadata();
  ok(r1.estado === 'respuesta' && r1.costo === 123 && r1.modelo === 'simulador', 'una pública: responde, con el costo liquidado (foto2_anotar)');
  ok(m1.format === 'jpeg' && Math.max(m1.width, m1.height) <= 640 && !m1.exif, `al modelo va la imagen reducida: JPEG ${m1.width}×${m1.height} (≤ 640), sin EXIF`);
  ok(e1.sistema === D.PAUTA && JSON.stringify(e1.datos) === '{}' && e1.trozos.length === 0 && e1.uso === 'foto' && JSON.stringify(e1.mensajes).length < 80, 'y solo la pauta: sin datos, sin ayuda, sin nada de la persona');
  const iRes = Q.findIndex((x) => /foto2_reservar/.test(x)), iAn = Q.findIndex((x, i) => i > iRes && /foto2_anotar/.test(x));
  ok(iRes >= 0 && iAn > iRes, 'tope ANTES (foto2_reservar) y libro DESPUÉS (foto2_anotar)');
  estado.reserva = null; const antes = llamadas.length;
  const r2 = await S.segundaOpinion(pub, grande, { esperaMs: 8000 });
  ok(r2.estado === 'sin_presupuesto' && llamadas.length === antes, 'sin reserva (al tope) → sin_presupuesto y NO se llama al modelo');
  estado.reserva = 'r-2'; estado.falla = new modeloStub.ErrorModelo('timeout', true, 'tiempo agotado');
  const na = Q.filter((x) => /foto2_anotar/.test(x)).length;
  const r3 = await S.segundaOpinion(pub, grande, { esperaMs: 8000 });
  ok(r3.estado === 'sin_respuesta' && Q.filter((x) => /foto2_anotar/.test(x)).length === na + 1, 'el modelo no responde → sin_respuesta, y el gasto se anota igual (camino del error)');
  estado.falla = null; estado.motor = 'reglas'; const antes2 = llamadas.length;
  const r4 = await S.segundaOpinion(pub, grande, { esperaMs: 8000 });
  ok(r4.estado === 'sin_respuesta' && llamadas.length === antes2, 'sin llave en producción (motor «reglas») → sin_respuesta (la foto queda retenida)');
  estado.motor = 'simulador';
  let lento = false; const t0 = Date.now();
  const S2 = cargar('apps/web/lib/fotos-segunda-opinion.ts', { './db': dbStub, '@/lib/compa/modelo': { ...modeloStub, modelo: async () => ({ responder: () => new Promise((r) => setTimeout(r, 5000)) }) }, '@/lib/compa/tope': { modeloDe: async () => 'x' }, './fotos-decision': D });
  const r5 = await S2.segundaOpinion(pub, grande, { esperaMs: 300 }); lento = Date.now() - t0 < 3000;
  ok(r5.estado === 'sin_respuesta' && lento, `tiempo límite: un modelo que tarda → sin_respuesta en ${Date.now() - t0} ms`);

  console.log('el simulador (guion de rev9u por el alto de la imagen)');
  const Sim = cargar('apps/web/lib/compa/modelo-simulador.ts', { '../entorno': { ENTORNO: 'pruebas' }, './modelo': { bloques: () => ['b'], ErrorModelo: modeloStub.ErrorModelo } });
  Sim.olvidarRecibidos();
  const pide = async (alto) => { const b = await jpg(402, alto); try { return (await Sim.simulador.responder({ uso: 'foto', modelo: 'simulador', lang: 'es', sistema: 'p', datos: {}, trozos: [], mensajes: [{ de: 'persona', texto: 'x' }], maxTokens: 60, esperaMs: 200, imagen: { tipo: 'image/jpeg', base64: b.toString('base64') } })).json; } catch (e) { return { error: e.tipo }; } };
  const v = {};
  for (const a of [301, 302, 303, 304, 305, 500]) v[a] = await pide(a);
  ok(D.leerSegunda(v[301]).v === 'publicar' && D.leerSegunda(v[500]).v === 'publicar', 'alto 301 (y cualquier otra foto) → publicar');
  ok(D.leerSegunda(v[302]).v === 'rechazar' && v[302].motivo === 'documento', 'alto 302 → rechazar (documento)');
  ok(D.leerSegunda(v[303]).v === 'no_segura', 'alto 303 → no_segura');
  ok(D.leerSegunda(v[304]).v === 'no_segura', 'alto 304 → una respuesta que no encaja (= no_segura)');
  ok(v[305].error === 'error', 'alto 305 → error del proveedor');
  const rec = Sim.recibidos().filter((x) => x.uso === 'foto');
  ok(rec.length === 6 && rec.every((x) => /^[0-9a-f]{64}$/.test(x.imagen.sha256) && x.imagen.ancho === 402), 'el simulador anota lo que recibe: la huella de cada imagen y su medida (rev9u lo revisa)');

  console.log(`\n${malas ? 'FALLA' : 'OK'} (${n} comprobaciones${malas ? `, ${malas} mal` : ''})`);
  process.exit(malas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
