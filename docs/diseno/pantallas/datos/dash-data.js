/* Panel del negocio (DASH-*) — datos de ejemplo con historial. Hoy = jue 24 sep 2026, 12:30 PM. Plan: CLAUDE-plan.md "Dashboard — Secciones".
   k (tipo): ped pedido · cita · rsv reservación · cot cotización · bol boleto · rev reseña · pago. st: pend (espera tu respuesta) · ok · hoy · done · no.
   Se combinan con los objetos vivos del Prototipo (lo que el cliente pidió) en "Hoy". */
(function () {
  const P = id => 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=200';
  const BIZ = {
    'sabor-dominicano': {
      name: 'Sabor Dominicano', cat: 'NEG-FOOD', plan: 'pro', ph: 39122376, owner: 'Mayra Peña', mods: ['menu', 'pedidos', 'rsv', 'eventos', 'staff', 'nov', 'jobs'],
      req: [
        { id: 'd-1042', k: 'ped', st: 'pend', who: 'Ana M.', t: ['Pedido #1042 · Delivery', 'Order #1042 · Delivery'], s: ['2 platos · 58 W Oak St · hace 3 min', '2 dishes · 58 W Oak St · 3 min ago'], amt: 31.40, lines: [['Mofongo de chicharrón', 1, 14], ['Pernil con arroz y habichuelas', 1, 12]], note: ['Sin cebolla en el mofongo', 'No onion on the mofongo'] },
        { id: 'd-1041', k: 'ped', st: 'hoy', who: 'Luis R.', t: ['Pedido #1041 · Pickup', 'Order #1041 · Pickup'], s: ['En cocina · listo 12:45 PM', 'Cooking · ready 12:45 PM'], amt: 22.00, lines: [['Pollo guisado', 2, 11]] },
        { id: 'd-1039', k: 'ped', st: 'done', who: 'Carmen T.', t: ['Pedido #1039 · Delivery', 'Order #1039 · Delivery'], s: ['Entregado 11:58 AM · a tiempo', 'Delivered 11:58 AM · on time'], amt: 27.80, lines: [['Sancocho', 1, 13], ['Tostones', 2, 5]] },
        { id: 'd-r88', k: 'rsv', st: 'pend', who: 'Carlos P.', t: ['Mesa para 4 · hoy 7:30 PM', 'Table for 4 · today 7:30 PM'], s: ['Terraza · cumpleaños · hace 8 min', 'Terrace · birthday · 8 min ago'] },
        { id: 'd-r87', k: 'rsv', st: 'ok', who: 'Yesenia G.', t: ['Mesa para 2 · vie 8 PM', 'Table for 2 · Fri 8 PM'], s: ['Confirmada', 'Confirmed'] },
        { id: 'd-cat', k: 'cot', st: 'pend', who: 'Iglesia Monte Sion', t: ['Catering · 60 personas · sáb 3 oct', 'Catering · 60 people · Sat Oct 3'], s: ['Pide precio con pernil y arroz', 'Asks a price with pernil and rice'] },
        { id: 'd-v1', k: 'rev', st: 'pend', who: 'Rafael D.', t: ['★★★★★ «El mofongo llegó caliente»', '★★★★★ “The mofongo arrived hot”'], s: ['Delivery · verificada · ayer', 'Delivery · verified · yesterday'] },
        { id: 'd-v2', k: 'rev', st: 'pend', who: 'Milagros S.', t: ['★★ «Tardó 20 minutos más»', '★★ “It took 20 minutes longer”'], s: ['Delivery · verificada · 22 min tarde', 'Delivery · verified · 22 min late'] },
        { id: 'd-b1', k: 'bol', st: 'ok', who: 'Noche de merengue en vivo', t: ['38 de 80 boletos · 4 de 10 mesas', '38 of 80 tickets · 4 of 10 tables'], s: ['Sáb 26 sep · 9 PM', 'Sat Sep 26 · 9 PM'] },
        { id: 'd-p1', k: 'pago', st: 'ok', who: 'To\'Latino', t: ['Pago del viernes · $412.80', 'Friday payout · $412.80'], s: ['A tu banco ·· 0721 · vie 25 sep', 'To your bank ·· 0721 · Fri Sep 25'] }
      ],
      msgs: [
        { id: 'm1', who: 'Iglesia Monte Sion', last: ['¿Pueden llevar las bandejas el sábado a las 2?', 'Can you bring the trays Saturday at 2?'], time: '12:18 PM', n: 2, to: 'Rosa', th: [[0, '¿Hacen catering para 60?', 'Do you cater for 60?'], [1, 'Sí. Pernil, arroz y ensalada desde $14 por persona.', 'Yes. Pernil, rice and salad from $14 per person.'], [0, '¿Pueden llevar las bandejas el sábado a las 2?', 'Can you bring the trays Saturday at 2?']] },
        { id: 'm2', who: 'Ana M.', last: ['Pedido #1042: ¿el mofongo trae ajo?', 'Order #1042: does the mofongo have garlic?'], time: '12:27 PM', n: 1, to: null, th: [[0, '¿El mofongo trae ajo?', 'Does the mofongo have garlic?']] },
        { id: 'm3', who: 'Wilkin (proveedor)', last: ['Mañana llego con el plátano a las 8.', 'Tomorrow I bring the plantains at 8.'], time: '9:04 AM', n: 0, to: 'Mayra', th: [[0, 'Mañana llego con el plátano a las 8.', 'Tomorrow I bring the plantains at 8.']] }
      ],
      items: [['Mofongo de chicharrón', 14, 1, 'Platos'], ['Pernil con arroz y habichuelas', 12, 1, 'Platos'], ['Pollo guisado', 11, 1, 'Platos'], ['Sancocho (sábados)', 13, 1, 'Platos'], ['Tostones', 5, 1, 'Acompañantes'], ['Morir soñando', 4, 0, 'Bebidas']],
      events: [{ id: 'e1', t: 'Noche de merengue en vivo', d: ['Sáb 26 sep · 9 PM', 'Sat Sep 26 · 9 PM'], sold: 38, cap: 80, tables: [4, 10], price: 15, gross: 570, doors: [['Rosa', 'Escanear y vender'], ['Junior', 'Solo escanear']] }],
      team: [['Rosa Almonte', ['ord', 'msg'], 'ok', 'Hoy 11:40 AM'], ['Junior Peña', ['page'], 'inv', '—']],
      riders: [['Miguel', 'ok', 6, 84], ['Yefri', 'ok', 3, 41], ['Ramón', 'off', 0, 0]],
      ins: { views: 1284, contacts: 96, orders: 142, conv: 11, src: [['Búsqueda', 'Search', 46], ['Hoy en el barrio', 'Today nearby', 21], ['Comunidad', 'Community', 18], ['Link compartido', 'Shared link', 15]], peak: [['11 AM', 30], ['12 PM', 92], ['1 PM', 78], ['6 PM', 64], ['7 PM', 88], ['8 PM', 51]], top: [['Mofongo de chicharrón', 61], ['Pernil con arroz', 44], ['Pollo guisado', 37]] },
      pay: 'on', dlv: { delivery: true, pickup: true, ship: false, zone: 3, fee: 3, min: 15, eta: '25–40 min', who: 'team', ext: false }
    },
    'barberia-el-primo': {
      name: 'Barbería El Primo', cat: 'NEG-BELL', plan: 'pro', ph: 4969842, owner: 'Joel Martínez', mods: ['svc', 'citas', 'staff', 'shop', 'nov'],
      req: [
        { id: 'b-c1', k: 'cita', st: 'pend', who: 'Luis R.', t: ['Corte + barba · hoy 3:30 PM', 'Cut + beard · today 3:30 PM'], s: ['Con Joel · depósito $5 retenido · hace 5 min', 'With Joel · $5 deposit held · 5 min ago'], amt: 30 },
        { id: 'b-c2', k: 'cita', st: 'pend', who: 'Mariela F.', t: ['Corte de niño · vie 10 AM', 'Kids cut · Fri 10 AM'], s: ['Con cualquiera · para Dylan, 6 años', 'With anyone · for Dylan, age 6'], amt: 15 },
        { id: 'b-c3', k: 'cita', st: 'hoy', who: 'Andrés V.', t: ['Fade · hoy 1 PM', 'Fade · today 1 PM'], s: ['Con Joel · confirmada', 'With Joel · confirmed'], amt: 22 },
        { id: 'b-c4', k: 'cita', st: 'hoy', who: 'Kevin S.', t: ['Corte clásico · hoy 4:30 PM', 'Classic cut · today 4:30 PM'], s: ['Con Yoel · confirmada', 'With Yoel · confirmed'], amt: 20 },
        { id: 'b-a1', k: 'ped', st: 'pend', who: 'Frank M.', t: ['Apartado · Pomada Suavecito', 'Hold · Suavecito pomade'], s: ['Paga al recoger · 48 h', 'Pays at pickup · 48 h'], amt: 16 },
        { id: 'b-v1', k: 'rev', st: 'pend', who: 'Héctor L.', t: ['★★★★★ «Joel me dejó el fade perfecto»', '★★★★★ “Joel gave me a perfect fade”'], s: ['Cita verificada · hoy', 'Verified appointment · today'] },
        { id: 'b-p1', k: 'pago', st: 'ok', who: 'To\'Latino', t: ['Depósitos de la semana · $85', 'This week’s deposits · $85'], s: ['A tu banco ·· 3310 · lun 28 sep', 'To your bank ·· 3310 · Mon Sep 28'] }
      ],
      msgs: [
        { id: 'm1', who: 'Luis R.', last: ['¿Puedo llegar 10 min tarde?', 'Can I be 10 min late?'], time: '12:25 PM', n: 1, to: null, th: [[0, '¿Puedo llegar 10 min tarde?', 'Can I be 10 min late?']] },
        { id: 'm2', who: 'Kelvin (silla 2)', last: ['El sábado cubro desde las 9.', 'Saturday I cover from 9.'], time: '10:12 AM', n: 0, to: 'Joel', th: [[0, 'El sábado cubro desde las 9.', 'Saturday I cover from 9.']] }
      ],
      items: [['Corte clásico', 20, 1, 'Cortes'], ['Fade', 22, 1, 'Cortes'], ['Corte + barba', 30, 1, 'Cortes'], ['Corte de niño', 15, 1, 'Niños'], ['Pomada Suavecito', 16, 0, 'Tienda']],
      events: [],
      team: [['Yoel Castillo', ['cit'], 'ok', 'Hoy 12:02 PM']],
      riders: [],
      ins: { views: 862, contacts: 71, orders: 118, conv: 14, src: [['Búsqueda', 'Search', 52], ['Hoy en el barrio', 'Today nearby', 17], ['Comunidad', 'Community', 22], ['Link compartido', 'Shared link', 9]], peak: [['10 AM', 40], ['12 PM', 55], ['3 PM', 70], ['5 PM', 95], ['6 PM', 88], ['7 PM', 42]], top: [['Fade', 48], ['Corte + barba', 39], ['Corte clásico', 31]] },
      pay: 'on', dlv: null
    }
  };
  const AREAS = [['page', 'Tu página', 'Your page'], ['ord', 'Pedidos y citas', 'Orders and bookings'], ['msg', 'Mensajes', 'Messages'], ['evt', 'Eventos', 'Events'], ['dlv', 'Entrega', 'Delivery'], ['set', 'Ajustes y cobros', 'Settings and payouts'], ['cit', 'Agenda', 'Schedule']];
  const LOG = [['12:02 PM', 'Rosa aceptó el pedido #1040', 'Rosa accepted order #1040'], ['11:40 AM', 'Rosa respondió a Iglesia Monte Sion', 'Rosa replied to Iglesia Monte Sion'], ['9:15 AM', 'Mayra cambió el horario del domingo', 'Mayra changed Sunday hours']];
  window.TLDash = { BIZ, AREAS, LOG, P };
})();
