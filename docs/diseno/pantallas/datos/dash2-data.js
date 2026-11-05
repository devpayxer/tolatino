/* Panel del negocio v2 (segunda opinión) — datos de ejemplo con historial. Hoy = jue 24 sep 2026, 12:30 PM.
   Tres negocios: Sabor Dominicano (Pro · vende), Barbería El Primo (Pro · agenda), Empanadas Doña Luz (Free · solo se publica).
   Cada objeto sigue el trío listado → detalle → editor del plan. Textos [es, en]. */
(function () {
  const P = (id, h) => /^(data:|https?:)/.test(String(id)) ? String(id) : 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300);
  const D = (on, a, b, two, a2, b2) => ({ on, a, b, two: !!two, a2: a2 || 17, b2: b2 || 21 });
  const rev = (id, who, stars, text, when, type, extra, reply) => ({ id, who, stars, text, when, type, extra: extra || null, reply: reply || null });
  const BIZ = {
    'sabor-dominicano': {
      name: 'Sabor Dominicano', cat: 'NEG-FOOD', plan: 'pro', ph: 39122376, logo: 38330332, owner: 'Rosa Peña', nick: 'Doña Rosa', phone: '(570) 455-0192', wa: true, ig: '@sabordominicanohz', fb: '', op: 'local',
      subs: ['Dominicana', 'Comida criolla', 'Catering'], addr: '412 N Wyoming St', ref: 'Al lado de la lavandería', casa: false, zone: 3, langs: ['es', 'en'],
      hours: [D(false), D(true, 11, 21), D(true, 11, 21), D(true, 11, 21), D(true, 11, 22), D(true, 10, 23), D(true, 10, 20)], sched: ['raza', 'thx', 'nav'], byMod: true, modOff: 30,
      about: 'Cocina criolla como en Santiago: pernil al horno, mofongo con chicharrón y sancocho los sábados. Llevamos 9 años en Hazleton y cocinamos con la receta de mi mamá.',
      amen: ['Mesas adentro', 'Para llevar', 'Catering', 'Estacionamiento', 'Acepta tarjeta'], gallery: [39122376, 38330332, 39143744, 35993723, 9120377, 7447291, 34822475, 29075345], seal: 'ok', email: 'sabor@gmail.com',
      mods: ['menu', 'pedidos', 'rsv', 'eventos', 'staff', 'nov', 'jobs'],
      itemCats: ['Platos', 'Acompañantes', 'Bebidas', 'Postres'],
      items: [
        { id: 'i1', name: 'Mofongo de chicharrón', price: 14, unit: 'u', cat: 'Platos', ph: 39122376, sell: 1, ago: 0, desc: 'Plátano majado con chicharrón, caldito aparte.', pop: 61, opts: 2 },
        { id: 'i2', name: 'Pernil con arroz y habichuelas', price: 12, unit: 'u', cat: 'Platos', ph: 38330332, sell: 1, ago: 0, desc: 'Pernil al horno, arroz blanco y habichuelas rojas.', pop: 44, opts: 1 },
        { id: 'i3', name: 'Pollo guisado', price: 11, unit: 'u', cat: 'Platos', ph: 39143744, sell: 1, ago: 0, desc: '', pop: 37, opts: 1 },
        { id: 'i4', name: 'Sancocho', price: 13, unit: 'u', cat: 'Platos', ph: 35993723, sell: 1, ago: 1, desc: 'Solo sábados. Siete carnes.', pop: 22, opts: 0, until: 'Sábados' },
        { id: 'i5', name: 'Tostones', price: 5, unit: 'u', cat: 'Acompañantes', ph: 9120377, sell: 1, ago: 0, desc: '', pop: 29, opts: 0 },
        { id: 'i6', name: 'Maduros', price: 4, unit: 'u', cat: 'Acompañantes', ph: 7447291, sell: 1, ago: 0, desc: '', pop: 18, opts: 0 },
        { id: 'i7', name: 'Morir soñando', price: 4, unit: 'u', cat: 'Bebidas', ph: 34822475, sell: 0, ago: 0, desc: 'Solo en el local.', pop: 9, opts: 0 },
        { id: 'i8', name: 'Habichuelas con dulce', price: 5, unit: 'u', cat: 'Postres', ph: 29075345, sell: 1, ago: 0, desc: 'Temporada de Cuaresma.', pop: 6, opts: 0 }
      ],
      reviews: [
        rev('r1', 'Rafael D.', 5, 'El mofongo llegó caliente y con el caldito aparte, como debe ser.', ['ayer', 'yesterday'], 'delivery', ['Llegó caliente · a tiempo', 'Arrived hot · on time'], ['Gracias, Rafael. El caldito aparte es ley.', 'Thanks, Rafael. Broth on the side is the rule.']),
        rev('r2', 'Milagros S.', 2, 'Tardó 20 minutos más de lo prometido y el arroz venía frío.', ['hoy', 'today'], 'delivery', ['Llegó tibio · 22 min tarde', 'Arrived lukewarm · 22 min late']),
        rev('r3', 'Yesenia G.', 5, 'Reservamos para 6 y la mesa estaba lista. El pernil, brutal.', ['hace 3 días', '3 days ago'], 'reserva', ['Mesa a tiempo', 'Table on time'], null),
        rev('r4', 'Carlos P.', 4, 'Buena comida, la fila del pickup un poco lenta un viernes.', ['hace 5 días', '5 days ago'], 'pickup', ['Listo 8 min tarde', 'Ready 8 min late'], null),
        rev('r5', 'Ana M.', 5, 'Sancocho de sábado: el mejor de Hazleton.', ['hace 1 semana', '1 week ago'], 'visita', null, ['¡Gracias! Los sábados desde las 11.', 'Thanks! Saturdays from 11.'])
      ],
      nov: [
        { id: 'n1', type: 'oferta', t: ['Pernil + arroz $10 hasta las 3', 'Pernil + rice $10 until 3'], st: 'live', when: ['Hoy · quedan 2 h 30', 'Today · 2 h 30 left'], views: 184, saves: 23, orders: 9 },
        { id: 'n2', type: 'aviso', t: ['Cerramos el jue 26 nov (Acción de Gracias)', 'Closed Thu Nov 26 (Thanksgiving)'], st: 'prog', when: ['Programada · sale el 20 nov', 'Scheduled · goes out Nov 20'], views: 0, saves: 0, orders: 0 },
        { id: 'n3', type: 'novedad', t: ['Llegó el sancocho de siete carnes', 'Seven-meat sancocho is here'], st: 'done', when: ['Sáb 19 sep', 'Sat Sep 19'], views: 412, saves: 31, orders: 27 }
      ],
      faq: [{ q: ['¿Hacen catering?', 'Do you cater?'], a: ['Sí, desde 20 personas. Pide precio con 48 h.', 'Yes, from 20 people. Ask for a price 48 h ahead.'] }, { q: ['¿Tienen opciones sin carne?', 'Any meatless options?'], a: ['Mofongo de vegetales y arroz con habichuelas.', 'Vegetable mofongo and rice with beans.'] }],
      rel: [{ name: 'Sabor Dominicano · Alter St', type: 'suc', st: 'ok', s: ['412 Alter St · misma carta', '412 Alter St · same menu'] }, { name: 'Colmado Peña', type: 'dueno', st: 'pend', s: ['Solicitud enviada · esperando', 'Request sent · waiting'] }],
      team: [{ id: 't1', name: 'Yanet Almonte', role: ['Cocina y caja', 'Kitchen and register'], st: 'ok', ph: 5699505, svc: ['Pernil', 'Sancocho'], hrs: 'igual', today: ['En turno hasta 9 PM', 'On shift until 9 PM'] }, { id: 't2', name: 'Junior Peña', role: ['Delivery y mesas', 'Delivery and tables'], st: 'ok', ph: 31409070, svc: [], hrs: 'otro', today: ['Entra a las 5 PM', 'Starts at 5 PM'] }, { id: 't3', name: 'Yahaira Cruz', role: ['Cocina', 'Kitchen'], st: 'inv', ph: null, svc: [], hrs: 'igual', today: ['Invitación enviada', 'Invite sent'] }],
      req: [
        { id: 'd-1042', k: 'ped', st: 'pend', who: 'Ana M.', t: ['Pedido #1042 · Delivery', 'Order #1042 · Delivery'], s: ['2 platos · 58 W Oak St · hace 3 min', '2 dishes · 58 W Oak St · 3 min ago'], amt: 31.40, lines: [['Mofongo de chicharrón', 1, 14], ['Pernil con arroz y habichuelas', 1, 12]], fee: 3, tip: 4.4, note: ['Sin cebolla en el mofongo', 'No onion on the mofongo'], pay: ['Tarjeta ·· 4242 · retenido', 'Card ·· 4242 · held'], eta: '12:35 PM', tl: [['12:27 PM', 'Pedido enviado', 'Order sent']] },
        { id: 'd-1041', k: 'ped', st: 'hoy', who: 'Luis R.', t: ['Pedido #1041 · Pickup', 'Order #1041 · Pickup'], s: ['En cocina · listo 12:45 PM', 'Cooking · ready 12:45 PM'], amt: 22.00, lines: [['Pollo guisado', 2, 11]], pay: ['Paga al recoger', 'Pays at pickup'], tl: [['12:10 PM', 'Pedido enviado', 'Order sent'], ['12:12 PM', 'Aceptado por Yanet', 'Accepted by Yanet'], ['12:20 PM', 'En cocina', 'Cooking']] },
        { id: 'd-1039', k: 'ped', st: 'done', who: 'Carmen T.', t: ['Pedido #1039 · Delivery', 'Order #1039 · Delivery'], s: ['Entregado 11:58 AM · a tiempo', 'Delivered 11:58 AM · on time'], amt: 27.80, lines: [['Sancocho', 1, 13], ['Tostones', 2, 5]], pay: ['Cobrado · Visa ·· 1187', 'Charged · Visa ·· 1187'], tl: [['11:20 AM', 'Pedido enviado', 'Order sent'], ['11:22 AM', 'Aceptado', 'Accepted'], ['11:41 AM', 'Salió con Miguel', 'Out with Miguel'], ['11:58 AM', 'Entregado · foto', 'Delivered · photo']] },
        { id: 'd-r88', k: 'rsv', st: 'pend', who: 'Carlos P.', t: ['Mesa para 4 · hoy 7:30 PM', 'Table for 4 · today 7:30 PM'], s: ['Terraza · cumpleaños · hace 8 min', 'Terrace · birthday · 8 min ago'], note: ['Traen bizcocho', 'Bringing a cake'], tl: [['12:22 PM', 'Solicitud enviada', 'Request sent']] },
        { id: 'd-r87', k: 'rsv', st: 'ok', who: 'Yesenia G.', t: ['Mesa para 2 · vie 8 PM', 'Table for 2 · Fri 8 PM'], s: ['Confirmada · adentro', 'Confirmed · inside'], tl: [['Ayer', 'Solicitud enviada', 'Request sent'], ['Ayer', 'Confirmada por Rosa', 'Confirmed by Rosa']] },
        { id: 'd-cat', k: 'cot', st: 'pend', who: 'Iglesia Monte Sion', t: ['Catering · 60 personas · sáb 3 oct', 'Catering · 60 people · Sat Oct 3'], s: ['Pide precio con pernil y arroz · 2 fotos', 'Asks a price with pernil and rice · 2 photos'], tl: [['11:50 AM', 'Solicitud enviada', 'Request sent']] },
        { id: 'd-b1', k: 'bol', st: 'ok', who: 'Noche de merengue en vivo', t: ['38 de 80 boletos · 4 de 10 mesas', '38 of 80 tickets · 4 of 10 tables'], s: ['Sáb 26 sep · 9 PM · $570 vendidos', 'Sat Sep 26 · 9 PM · $570 sold'] },
        { id: 'd-p1', k: 'pago', st: 'ok', who: "To'Latino", t: ['Pago del viernes · $412.80', 'Friday payout · $412.80'], s: ['A tu banco ·· 0721 · vie 25 sep', 'To your bank ·· 0721 · Fri Sep 25'], amt: 412.80, lines: [['Pedidos con tarjeta (18)', 1, 438.20], ['Comisión de cobro', 1, -12.90], ['Reembolso #1031', 1, -12.50]] },
        { id: 'd-p0', k: 'pago', st: 'done', who: "To'Latino", t: ['Pago del martes · $388.15', 'Tuesday payout · $388.15'], s: ['Pagado · mar 22 sep', 'Paid · Tue Sep 22'], amt: 388.15 }
      ],
      msgs: [
        { id: 'm1', who: 'Iglesia Monte Sion', last: ['¿Pueden llevar las bandejas el sábado a las 2?', 'Can you bring the trays Saturday at 2?'], time: '12:18 PM', n: 2, to: 'Yanet', th: [[0, '¿Hacen catering para 60?', 'Do you cater for 60?'], [1, 'Sí. Pernil, arroz y ensalada desde $14 por persona.', 'Yes. Pernil, rice and salad from $14 per person.'], [0, '¿Pueden llevar las bandejas el sábado a las 2?', 'Can you bring the trays Saturday at 2?']] },
        { id: 'm2', who: 'Ana M.', last: ['Pedido #1042: ¿el mofongo trae ajo?', 'Order #1042: does the mofongo have garlic?'], time: '12:27 PM', n: 1, to: null, th: [[0, '¿El mofongo trae ajo?', 'Does the mofongo have garlic?']] },
        { id: 'm3', who: 'Wilkin (proveedor)', last: ['Mañana llego con el plátano a las 8.', 'Tomorrow I bring the plantains at 8.'], time: '9:04 AM', n: 0, to: 'Rosa', th: [[0, 'Mañana llego con el plátano a las 8.', 'Tomorrow I bring the plantains at 8.']] }
      ],
      events: [{ id: 'e1', t: 'Noche de merengue en vivo', d: ['Sáb 26 sep · 9 PM – 2 AM', 'Sat Sep 26 · 9 PM – 2 AM'], ph: 6166796, st: 'sale', sold: 38, cap: 80, gross: 570, tiers: [['General', 15, 30, 60], ['VIP', 30, 8, 20]], tables: [['Mesa · 4 personas', 120, 4, 10]], addons: [['Cubeta de Presidente (6)', 30, 11]], lineup: [['9:00 PM', 'DJ Rumba'], ['10:30 PM', 'Grupo Fuego Latino']], age: 21, doors: [['Yanet', 'scan'], ['Miguel', 'scan']], rules: { re: true, id: true } }],
      riders: [['Miguel', 'ok', 6, 84], ['Yefri', 'ok', 3, 41], ['Ramón', 'off', 0, 0]],
      ins: {
        views: [1284, 312, 44], contacts: [96, 41, 6], orders: [142, 38, 5], conv: 11, series7: [38, 52, 41, 60, 44, 47, 30], series30: [22, 30, 41, 36, 48, 52, 44, 39, 60, 55, 47, 41, 38, 52, 41, 60, 44, 47, 30, 35, 49, 58, 62, 51, 43, 39, 46, 57, 61, 44],
        clicks: [['Llamar', 'Call', 38], ['WhatsApp', 'WhatsApp', 27], ['Cómo llegar', 'Directions', 19], ['Mensaje', 'Message', 8], ['Compartir', 'Share', 4]],
        searches: [['comida dominicana', 61], ['mofongo', 44], ['restaurante cerca', 29], ['sancocho', 18], ['catering hazleton', 12]],
        src: [['Búsqueda', 'Search', 46], ['Hoy en el barrio', 'Today nearby', 21], ['Comunidad', 'Community', 18], ['Link compartido', 'Shared link', 15]],
        peak: [['11 AM', 30], ['12 PM', 92], ['1 PM', 78], ['6 PM', 64], ['7 PM', 88], ['8 PM', 51]],
        photos: [[39122376, 412], [38330332, 288], [35993723, 201]], rank: [2, 24], recommend: 37, followers: 214, saves: 89, top: [['Mofongo de chicharrón', 61], ['Pernil con arroz', 44], ['Pollo guisado', 37]]
      },
      pay: 'on', bank: '·· 0721', dlv: { delivery: true, pickup: true, ship: false, zone: 3, fee: 3, min: 15, prep: 25, ride: 10, dEnd: 0, who: 'team', ext: 'doordash', free: 40, pkNote: 'Pide en la caja con tu número de pedido.' }, modCfg: { pedidos: { sched: 1, auto: 0, card: 1, cashP: 1, cashD: 1, tip: 1 } },
      log: [['12:02 PM', 'Yanet aceptó el pedido #1040', 'Yanet accepted order #1040'], ['11:40 AM', 'Yanet respondió a Iglesia Monte Sion', 'Yanet replied to Iglesia Monte Sion'], ['9:15 AM', 'Rosa cambió el horario del domingo', 'Rosa changed Sunday hours'], ['Ayer', 'Rosa publicó la oferta de pernil', 'Rosa posted the pernil deal']],
      mods_: [['Yanet Almonte', ['ord', 'msg'], 'ok', 'Hoy 11:40 AM'], ['Miguel Reyes', ['dlv'], 'ok', 'Hoy 8:02 AM']]
    },
    'barberia-el-primo': {
      name: 'Barbería El Primo', cat: 'NEG-BELL', plan: 'pro', ph: 4969842, logo: null, owner: 'Luis "El Primo" Batista', nick: 'El Primo', phone: '(570) 455-0311', wa: true, ig: '@elprimobarber', fb: '', op: 'local',
      subs: ['Barbería', 'Barba y arreglo masculino', 'Niños'], addr: '205 N Wyoming St', ref: 'Segundo piso, entrada por Laurel', casa: false, zone: 0, langs: ['es', 'en'],
      hours: [D(false), D(true, 9, 19), D(true, 9, 19), D(true, 9, 19), D(true, 9, 20), D(true, 8, 20), D(true, 9, 15)], sched: ['nav'], byMod: false, modOff: 30,
      about: 'Barbería de barrio en Wyoming St desde 2016. Somos cuatro barberos y cada uno renta su silla: tiene su agenda, sus precios y sus reseñas. Llegas y esperas turno, o reservas con el barbero que quieras.',
      amen: ['Sin cita', 'Sala de espera', 'Productos a la venta', 'Wi-Fi', 'Acepta tarjeta'], gallery: [4969842, 39559312, 18503633, 7195805, 7755521, 3993136], seal: 'pend', email: '',
      mods: ['svc', 'citas', 'staff', 'shop', 'nov'],
      itemCats: ['Cortes', 'Barba', 'Niños', 'Tienda'],
      items: [
        { id: 's1', name: 'Corte clásico', price: 20, unit: 'fijo', dur: 30, cat: 'Cortes', ph: 4969842, sell: 1, ago: 0, desc: 'Tijera y máquina, con acabado de navaja.', pop: 31, opts: 0 },
        { id: 's2', name: 'Fade', price: 22, unit: 'fijo', dur: 40, cat: 'Cortes', ph: 39559312, sell: 1, ago: 0, desc: '', pop: 48, opts: 1 },
        { id: 's3', name: 'Corte + barba', price: 30, unit: 'fijo', dur: 50, cat: 'Barba', ph: 18503633, sell: 1, ago: 0, desc: 'Toalla caliente incluida.', pop: 39, opts: 0 },
        { id: 's4', name: 'Arreglo de barba', price: 12, unit: 'fijo', dur: 20, cat: 'Barba', ph: 7195805, sell: 1, ago: 0, desc: '', pop: 14, opts: 0 },
        { id: 's5', name: 'Corte de niño', price: 15, unit: 'fijo', dur: 25, cat: 'Niños', ph: 7755521, sell: 1, ago: 0, desc: 'Hasta 10 años.', pop: 22, opts: 0 },
        { id: 's6', name: 'Pomada de fijación fuerte', price: 16, unit: 'u', cat: 'Tienda', ph: 7755553, sell: 1, ago: 0, desc: 'Acabado mate · 4 oz', pop: 6, opts: 0, stock: 6 },
        { id: 's7', name: 'Aceite para barba', price: 14, unit: 'u', cat: 'Tienda', ph: 4969864, sell: 1, ago: 0, desc: 'Con aceite de argán · 1 oz', pop: 4, opts: 0, stock: 9 },
        { id: 's8', name: 'Cepillo de 360 waves', price: 12, unit: 'u', cat: 'Tienda', ph: 18213699, sell: 1, ago: 0, desc: 'Cerdas de jabalí', pop: 3, opts: 0, stock: 3 },
        { id: 's9', name: 'Máquina de detallado', price: 45, unit: 'u', cat: 'Tienda', ph: 10517484, sell: 1, ago: 0, desc: 'Inalámbrica', pop: 2, opts: 0, stock: 2 }
      ],
      reviews: [
        rev('b1', 'Héctor L.', 5, 'Luis me dejó el fade perfecto y a la hora.', ['hoy', 'today'], 'cita', ['A la hora · con Luis', 'On time · with Luis']),
        rev('b2', 'Andrés V.', 4, 'Buen corte. La espera sin cita un sábado fue larga.', ['hace 4 días', '4 days ago'], 'visita', ['Fui sin cita', 'Walk-in'], ['Los sábados conviene reservar. Gracias, Andrés.', 'Saturdays are best with a booking. Thanks, Andrés.']),
        rev('b3', 'Mariela F.', 5, 'A mi hijo le encantó, súper pacientes con él.', ['hace 1 semana', '1 week ago'], 'cita', ['A la hora · con Kelvin', 'On time · with Kelvin'])
      ],
      nov: [{ id: 'n1', type: 'cupon', t: ['Seguidores: $3 menos en corte + barba', 'Followers: $3 off cut + beard'], st: 'live', when: ['Hasta el 30 sep', 'Until Sep 30'], views: 96, saves: 12, orders: 4 }],
      faq: [{ q: ['¿Atienden sin cita?', 'Do you take walk-ins?'], a: ['Sí, de martes a viernes. Sábado conviene reservar.', 'Yes, Tuesday to Friday. Saturdays are best booked.'] }],
      rel: [],
      team: [{ id: 't1', name: 'Kelvin Rosario', role: ['Renta silla 2 · su propio negocio', 'Rents chair 2 · own business'], st: 'ok', ph: 18483772, svc: [], hrs: 'propio', today: ['Su agenda es suya', 'Own schedule'] }, { id: 't2', name: 'Andy Mejía', role: ['Renta silla 3 · su propio negocio', 'Rents chair 3 · own business'], st: 'ok', ph: 12946033, svc: [], hrs: 'propio', today: ['Su agenda es suya', 'Own schedule'] }, { id: 't3', name: 'Johan Peralta', role: ['Renta silla 4 · su propio negocio', 'Rents chair 4 · own business'], st: 'ok', ph: 9387375, svc: [], hrs: 'propio', today: ['No trabaja hoy', 'Off today'] }],
      req: [
        { id: 'b-c1', k: 'cita', st: 'pend', who: 'Luis R.', t: ['Corte + barba · hoy 3:30 PM', 'Cut + beard · today 3:30 PM'], s: ['Con Luis · depósito $5 · hace 5 min', 'With Luis · $5 deposit · 5 min ago'], amt: 30, dep: 5, note: ['Degradado bajo, barba en línea', 'Low fade, lined beard'], tl: [['12:25 PM', 'Solicitud enviada · depósito cobrado', 'Request sent · deposit charged']] },
        { id: 'b-c2', k: 'cita', st: 'pend', who: 'Mariela F.', t: ['Corte de niño · vie 10 AM', 'Kids cut · Fri 10 AM'], s: ['Con cualquiera · para Dylan, 6 años', 'With anyone · for Dylan, age 6'], amt: 15, tl: [['12:02 PM', 'Solicitud enviada', 'Request sent']] },
        { id: 'b-c3', k: 'cita', st: 'hoy', who: 'Andrés V.', t: ['Fade · hoy 1:00 PM', 'Fade · today 1:00 PM'], s: ['Con Luis · confirmada', 'With Luis · confirmed'], amt: 22, tl: [['Ayer', 'Solicitud enviada', 'Request sent'], ['Ayer', 'Confirmada por Luis', 'Confirmed by Luis']] },
        { id: 'b-c4', k: 'cita', st: 'hoy', who: 'Kevin S.', t: ['Corte clásico · hoy 4:30 PM', 'Classic cut · today 4:30 PM'], s: ['Con Kelvin · confirmada', 'With Kelvin · confirmed'], amt: 20 },
        { id: 'b-c5', k: 'cita', st: 'done', who: 'Héctor L.', t: ['Fade · hoy 10:00 AM', 'Fade · today 10:00 AM'], s: ['Terminada · pagó en el local', 'Done · paid in shop'], amt: 22 },
        { id: 'b-a1', k: 'ped', st: 'pend', who: 'Frank M.', t: ['Apartado · Pomada de fijación fuerte', 'Hold · Strong hold pomade'], s: ['Paga al recoger · 48 h', 'Pays at pickup · 48 h'], amt: 16, lines: [['Pomada de fijación fuerte', 1, 16]] },
        { id: 'b-p1', k: 'pago', st: 'ok', who: "To'Latino", t: ['Depósitos de la semana · $85', 'This week’s deposits · $85'], s: ['A tu banco ·· 3310 · lun 28 sep', 'To your bank ·· 3310 · Mon Sep 28'], amt: 85 }
      ],
      msgs: [{ id: 'm1', who: 'Luis R.', last: ['¿Puedo llegar 10 min tarde?', 'Can I be 10 min late?'], time: '12:25 PM', n: 1, to: null, th: [[0, '¿Puedo llegar 10 min tarde?', 'Can I be 10 min late?']] }, { id: 'm2', who: 'Kelvin (silla 3)', last: ['El sábado cubro desde las 9.', 'Saturday I cover from 9.'], time: '10:12 AM', n: 0, to: 'Luis', th: [[0, 'El sábado cubro desde las 9.', 'Saturday I cover from 9.']] }],
      events: [], riders: [],
      ins: { views: [862, 198, 31], contacts: [71, 22, 4], orders: [118, 27, 4], conv: 14, series7: [22, 31, 28, 35, 40, 26, 16], series30: [18, 24, 30, 26, 33, 41, 22, 19, 35, 38, 30, 27, 24, 31, 28, 35, 40, 26, 16, 21, 29, 36, 44, 32, 25, 22, 30, 39, 42, 27],
        clicks: [['Llamar', 'Call', 22], ['WhatsApp', 'WhatsApp', 31], ['Cómo llegar', 'Directions', 12], ['Mensaje', 'Message', 5], ['Compartir', 'Share', 1]], searches: [['barbería', 52], ['fade hazleton', 30], ['corte de niño', 14], ['barbero cerca', 9]],
        src: [['Búsqueda', 'Search', 52], ['Hoy en el barrio', 'Today nearby', 17], ['Comunidad', 'Community', 22], ['Link compartido', 'Shared link', 9]], peak: [['10 AM', 40], ['12 PM', 55], ['3 PM', 70], ['5 PM', 95], ['6 PM', 88], ['7 PM', 42]],
        photos: [[4969842, 240], [39559312, 171], [18503633, 98]], rank: [1, 18], recommend: 22, followers: 131, saves: 47, top: [['Fade', 48], ['Corte + barba', 39], ['Corte clásico', 31]] },
      pay: 'on', bank: '·· 3310', dlv: null, log: [['12:02 PM', 'Kelvin confirmó la cita de Kevin S.', 'Kelvin confirmed Kevin S.’s booking']], mods_: [['Kelvin Rosario', ['ord', 'msg'], 'ok', 'Hoy 12:02 PM']]
    },
    'empanadas-dona-luz': {
      name: 'Empanadas Doña Luz', cat: 'NEG-FOOD', plan: 'free', ph: 6166796, logo: null, owner: 'Luz Herrera', nick: 'Doña Luz', phone: '(570) 455-0877', wa: true, ig: '', fb: '', op: 'casa',
      subs: ['Empanadas', 'Comida casera'], addr: '', ref: '', casa: true, zone: 5, langs: ['es'],
      hours: [D(false), D(false), D(false), D(false), D(true, 16, 20), D(true, 10, 18), D(true, 10, 16)], sched: [], byMod: false, modOff: 30,
      about: 'Empanadas de pollo, carne y queso hechas en casa. Pedidos por WhatsApp con un día de aviso.',
      amen: ['Para llevar'], gallery: [6166796, 9120377, 7447291], seal: 'none', email: '',
      mods: ['menu'], itemCats: ['Empanadas'],
      items: [{ id: 'e1', name: 'Empanada de pollo', price: 2.5, unit: 'u', cat: 'Empanadas', ph: 6166796, sell: 0, ago: 0, desc: '', pop: 0, opts: 0 }, { id: 'e2', name: 'Docena surtida', price: 26, unit: 'u', cat: 'Empanadas', ph: 9120377, sell: 0, ago: 0, desc: 'Pollo, carne y queso.', pop: 0, opts: 0 }],
      reviews: [rev('l1', 'José A.', 5, 'Las mejores empanadas de queso. Pedí 3 docenas para un cumpleaños.', ['hace 2 semanas', '2 weeks ago'], 'visita', null)],
      nov: [], faq: [], rel: [], team: [], req: [], msgs: [{ id: 'm1', who: 'José A.', last: ['¿Tiene para el sábado 2 docenas?', 'Do you have 2 dozen for Saturday?'], time: '11:02 AM', n: 1, to: null, th: [[0, '¿Tiene para el sábado 2 docenas?', 'Do you have 2 dozen for Saturday?']] }],
      events: [], riders: [], ins: { views: [214, 61, 9], contacts: [19, 7, 1], orders: [0, 0, 0], conv: 0, series7: [6, 9, 7, 12, 10, 11, 6], series30: [], clicks: [['Llamar', 'Call', 4], ['WhatsApp', 'WhatsApp', 13], ['Cómo llegar', 'Directions', 2], ['Mensaje', 'Message', 0], ['Compartir', 'Share', 0]], searches: [['empanadas', 21], ['comida casera', 8]], src: [], peak: [], photos: [[6166796, 88]], rank: [9, 24], recommend: 4, followers: 12, saves: 9, top: [] },
      pay: 'na', bank: '', dlv: null, log: [], mods_: []
    }
  };
  const AREAS = [['page', 'Tu página', 'Your page'], ['ord', 'Pedidos y citas', 'Orders and bookings'], ['msg', 'Mensajes', 'Messages'], ['cat', 'Lo que vendes', 'What you sell'], ['dlv', 'Entrega', 'Delivery'], ['evt', 'Eventos', 'Events'], ['cit', 'Agenda', 'Schedule'], ['set', 'Cobros y ajustes', 'Payouts and settings']];
  const HOLI = [['raza', 'Día de la Raza · lun 12 oct', 'Columbus Day · Mon Oct 12', 'Cierra 6 PM', 'Closes 6 PM'], ['thx', 'Acción de Gracias · jue 26 nov', 'Thanksgiving · Thu Nov 26', 'Cerrado', 'Closed'], ['nav', 'Nochebuena y Navidad · 24–25 dic', 'Christmas Eve and Day · Dec 24–25', 'Cerrado', 'Closed'], ['vac', 'Vacaciones · 4–11 ene', 'Vacation · Jan 4–11', 'Cerrado', 'Closed'], ['rey', 'Día de Reyes · mié 6 ene', 'Three Kings Day · Wed Jan 6', 'Cierra 3 PM', 'Closes 3 PM']];
  /* Fechas de cada feriado (HOLI): d = días [año, mes 0–11, día] · b = hora de cierre ese día (0 = cerrado) · n = nombre en la página. Lo leen la página (Próximos cambios), Reservaciones y el Super Admin. */
  const HOLD = { raza: { d: [[2026, 9, 12]], b: 18, n: ['Día de la Raza · feriado', 'Columbus Day · holiday'] }, thx: { d: [[2026, 10, 26]], b: 0, n: ['Acción de Gracias', 'Thanksgiving'] }, nav: { d: [[2026, 11, 24], [2026, 11, 25]], b: 0, n: ['Nochebuena y Navidad', 'Christmas Eve and Day'] }, vac: { d: [4, 5, 6, 7, 8, 9, 10, 11].map(x => [2027, 0, x]), b: 0, n: ['Vacaciones', 'Vacation'] }, rey: { d: [[2027, 0, 6]], b: 15, n: ['Día de Reyes', 'Three Kings Day'] } };
  const NOVT = [['oferta', 'Oferta', 'Deal', 'dollar'], ['hoy', 'Hoy hay', 'Today we have', 'hot'], ['aviso', 'Aviso de horario', 'Hours notice', 'clock'], ['encuesta', 'Encuesta', 'Poll', 'help'], ['cupon', 'Cupón para seguidores', 'Followers coupon', 'ticket'], ['novedad', 'Novedad', 'Update', 'news']];
  /* Pedidos en línea + Entrega (Panel v2 · Lo que vendes · Pedidos en línea y Entrega). Una sola lectura para el panel, la página (menú, checkout y pedido),
     El Compa y el Super Admin. over.dlv = cómo entrega · over.modCfg.pedidos = reglas del pedido · over.menuCfg = pausa, mucho trabajo y último pedido ·
     tl-adm-v1.biz[id].modOff.pedidos | .dlv = pausa de To'Latino. Cliente de prueba: vive en 58 W Oak St, a 1.2 mi (zona de 1 mi = no le llega). */
  const PED0 = { sched: 1, auto: 0, card: 1, cashP: 0, cashD: 0, tip: 1 };
  const DLV0 = { delivery: false, pickup: true, ship: false, zone: 3, fee: 3, free: 0, min: 0, prep: 25, ride: 10, dEnd: 0, who: 'team', ext: 'doordash', pkNote: '', shipFee: 8, shipFree: 0, shipD: '3-5' };
  const EXT = { doordash: ['DoorDash', 'DoorDash'], uber: ['Uber Eats', 'Uber Eats'], otra: ['otra app de delivery', 'another delivery app'] };
  const ZONE = { 1: ['centro de Hazleton', 'downtown Hazleton'], 3: ['Hazleton y West Hazleton', 'Hazleton and West Hazleton'], 5: ['Hazleton, West Hazleton y Hazle Township', 'Hazleton, West Hazleton and Hazle Township'], 10: ['hasta Drums, Conyngham y Sugarloaf', 'as far as Drums, Conyngham and Sugarloaf'] };
  const HOME = { mi: 1.2, l: '58 W Oak St' };
  const rdj = k => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
  const fmtH = h => { const H = ((h % 24) + 24) % 24, hh = Math.floor(H), m = Math.round((H - hh) * 60); return ((hh % 12) || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (hh < 12 ? ' AM' : ' PM'); };
  const mny = n => '$' + (+n % 1 ? (+n).toFixed(2) : String(+n));
  function pcfg(id, ov0) { const b = BIZ[id] || {}, ov = ov0 || (rdj('tl-dash2-v1').over || {})[id] || {}, ab = (rdj('tl-adm-v1').biz || {})[id] || {}, mo = ab.modOff || {};
    const mods = Array.isArray(ov.mods) ? ov.mods : (b.mods || []), rawD = { ...DLV0, ...(b.dlv || {}), ...(ov.dlv || {}) }, rawP = { ...PED0, ...((b.modCfg || {}).pedidos || {}), ...((ov.modCfg || {}).pedidos || {}) };
    const mc = { last: 15, busy: 0, pause: null, ...(b.menuCfg || {}), ...(ov.menuCfg || {}) }, hrs = ov.hours || b.hours || [], h = hrs[3] || null, stripe = ov.stripe || ov.pay || b.stripe || b.pay || 'na';
    const c = { rawD, rawP, mods, stripe, busy: +mc.busy || 0, pause: mc.pause || null, last: +mc.last || 0, own: mods.includes('pedidos'), admOff: !!mo.pedidos, dlvAdm: !!mo.dlv, sched: rawP.sched ? 1 : 0, auto: rawP.auto ? 1 : 0, zone: +rawD.zone || 3, fee: +rawD.fee || 0, free: +rawD.free || 0, min: +rawD.min || 0, pkNote: rawD.pkNote || '', ship: !!rawD.ship };
    c.dlvOn = !!rawD.delivery && !c.dlvAdm; c.pkOn = !!rawD.pickup; c.ext = rawD.who === 'ext';
    c.card = rawP.card && stripe === 'on' ? 1 : 0; c.cashP = rawP.cashP && c.pkOn ? 1 : 0; c.cashD = rawP.cashD && c.dlvOn && !c.ext ? 1 : 0; c.tip = rawP.tip && c.dlvOn ? 1 : 0;
    c.payP = !!(c.card || c.cashP); c.payD = !!(c.card || c.cashD);
    c.modes = [c.dlvOn && c.payD ? 'delivery' : null, c.pkOn && c.payP ? 'pickup' : null].filter(Boolean);
    c.on = c.own && !c.admOff && c.modes.length > 0;
    const ride = +rawD.ride || 10; c.pk = (+rawD.prep || 0) + c.busy; c.dl = [c.pk + ride, c.pk + 2 * ride];
    c.open = h && h.on ? h.a : null; c.close = h && h.on ? (h.two ? h.b2 : h.b) : null;
    c.lastAt = c.close == null ? null : c.close - c.last / 60; c.dlvTo = c.close == null ? null : Math.min(c.lastAt, c.close - (+rawD.dEnd || 0) / 60);
    c.out = c.dlvOn && c.zone < HOME.mi; return c; }
  const extL = (c, es) => (EXT[(c.rawD || c).ext] || EXT.doordash)[es ? 0 : 1];
  /* Una línea por forma de entrega y pago, como la ve el cliente (El Compa y el Super Admin la usan tal cual). */
  function psum(c, es) { const E2 = (a, b) => es ? a : b, L = [];
    if (!c.own) return E2('Pedidos en línea apagado: el menú se ve, pero no se pide en la app.', 'Online orders off: the menu shows but cannot be ordered in the app.');
    if (c.admOff) return E2('Pedidos en línea pausados por To\u2019Latino.', 'Online orders paused by To\u2019Latino.');
    if (c.dlvOn) L.push(E2('Delivery hasta ', 'Delivery up to ') + c.zone + ' mi (' + (ZONE[c.zone] || ZONE[3])[es ? 0 : 1] + ') · ' + (c.fee ? mny(c.fee) : E2('gratis', 'free')) + (c.free && c.fee ? E2(', gratis desde ', ', free from ') + mny(c.free) : '') + (c.min ? E2(' · mínimo ', ' · minimum ') + mny(c.min) : '') + E2(' · llega en ', ' · arrives in ') + c.dl[0] + '–' + c.dl[1] + ' min' + (c.ext ? E2(' · lo lleva ', ' · delivered by ') + extL(c, es) : ''));
    else if (c.dlvAdm) L.push(E2('Delivery pausado por To\u2019Latino', 'Delivery paused by To\u2019Latino'));
    if (c.pkOn) L.push(E2('Pickup · listo en ', 'Pickup · ready in ') + c.pk + ' min' + (c.pkNote ? ' · ' + c.pkNote.replace(/\.$/, '') : ''));
    const pay = [c.card ? E2('tarjeta en la app', 'card in the app') : null, c.cashP ? E2('efectivo al recoger', 'cash at pickup') : null, c.cashD ? E2('efectivo al recibir', 'cash on delivery') : null].filter(Boolean);
    if (pay.length) L.push(E2('Pagan con ', 'They pay by ') + pay.join(E2(' o ', ' or ')));
    if (c.pause) L.push(E2('En pausa hasta ', 'Paused until ') + c.pause);
    return L.join('. ') + '.'; }
  /* La página lee Entrega: etiquetas delivery/pickup, «Pickup 25 min» y «Delivery $3» de tarjetas y ficha salen del panel (en el prototipo, Sabor Dominicano). */
  let pedK = null;
  (window.TLReg = window.TLReg || []).push(() => { const A = window.TLAll, F = window.TLFood, L = [].concat((A && A.B) || [], (F && F.B) || []).filter(b => b && b.id === 'sabor-dominicano'); if (!L.length) return;
    let k = ''; try { k = (localStorage.getItem('tl-dash2-v1') || '') + '|' + (localStorage.getItem('tl-adm-v1') || ''); } catch (e) {} if (k === pedK && L.every(b => b._ped)) return; pedK = k; const c = pcfg('sabor-dominicano');
    L.forEach(b => { if (!b._pd0) b._pd0 = { tags: b.tags.slice() }; const t = b._pd0.tags.filter(x => (x !== 'delivery' || c.dlvOn) && (x !== 'pickup' || c.pkOn)); if (c.dlvOn && !t.includes('delivery')) t.push('delivery'); if (c.pkOn && !t.includes('pickup')) t.push('pickup'); b.tags = t;
      b.eta = c.pkOn ? 'Pickup ' + c.pk + ' min' : c.dlvOn ? 'Delivery ' + c.dl[0] + '–' + c.dl[1] + ' min' : ''; b.fee = c.dlvOn ? (c.fee ? 'Delivery $' + c.fee : 'Delivery gratis') : ''; b.feeEn = c.dlvOn ? (c.fee ? 'Delivery $' + c.fee : 'Free delivery') : ''; b._ped = c; }); });
  /* Envío por correo (Panel · Entrega, solo Tienda o Renta) → la Tienda del cliente: TLTienda.OPTS[id].envio/envioFree/envioD y la etiqueta 'envio'. */
  let shipK = null; (window.TLReg = window.TLReg || []).push(() => { const TI = window.TLTienda; if (!TI || !TI.OPTS) return; let k = ''; try { k = (localStorage.getItem('tl-dash2-v1') || '') + '|' + (localStorage.getItem('tl-adm-v1') || ''); } catch (e) {} const A = window.TLAll, Ls = [].concat((A && A.B) || [], TI.B || []);
    Object.keys(BIZ).forEach(id => { const b0 = BIZ[id]; if (!(b0.mods || []).some(m => m === 'shop' || m === 'renta')) return; const L = Ls.filter(b => b && b.id === id && !b.merc); if (!L.length) return; if (k === shipK && L.every(b => b._shp)) return;
      const c = pcfg(id), D = c.rawD, on = !!D.ship && !c.dlvAdm && (c.mods.includes('shop') || c.mods.includes('renta')), O0 = TI._o0 = TI._o0 || {}; if (!(id in O0)) O0[id] = Object.assign({}, TI.OPTS[id] || {});
      TI.OPTS[id] = Object.assign({}, O0[id], { envio: on ? +D.shipFee || 0 : null, envioFree: on ? +D.shipFree || 0 : 0, envioD: on ? String(D.shipD || '3-5') : '' });
      L.forEach(b => { if (!b._sh0) b._sh0 = { tags: (b.tags || []).slice() }; const t = b._sh0.tags.filter(x => x !== 'envio'); if (on) t.push('envio'); b.tags = t; b._shp = 1; }); }); shipK = k; });
  const TLPed = { PED0, DLV0, EXT, ZONE, HOME, cfg: pcfg, sum: psum, extL, fmt: fmtH, money: mny };
  window.TLPed = TLPed;
  window.TLDash2 = { BIZ, AREAS, HOLI, HOLD, NOVT, P, PED: TLPed };
})();
