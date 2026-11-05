/* Mi cuenta (USR-*) — historial de ejemplo del prototipo, Hazleton, PA. Hoy = jue 24 sep 2026, 12:30 PM.
   day = días desde hoy. Pares [es, en]. {n} = nombre o apodo del usuario, {s} = nombre corto (Ana R.).
   Lo ve cualquier cuenta con "CUENTA: Con historial" en la barra del prototipo. Fotos: Pexels. */
(function () {
  const RANKS = [['Recluta', 'Recruit'], ['Vecino', 'Neighbor'], ['Cabo', 'Corporal'], ['Sargento', 'Sergeant'], ['Sargento Mayor', 'Sergeant Major'], ['Teniente', 'Lieutenant'], ['Capitán', 'Captain'], ['Comandante', 'Commander'], ['Coronel', 'Colonel'], ['General del Barrio', 'Neighborhood General']];
  /* Respaldo si la ficha no está cargada: [nombre, rubro es, en, foto, dirección] */
  const BZ = {
    'sabor-dominicano': ['Sabor Dominicano', 'Comida dominicana', 'Dominican food', 39122376, '231 N Wyoming St'],
    'panaderia-la-espiga': ['Panadería La Espiga', 'Panadería', 'Bakery', 35993723, '118 E Broad St'],
    'empanadas-dona-tere': ['Empanadas Doña Tere', 'Empanadas', 'Empanadas', 36905236, '402 Alter St'],
    'tacos-el-guero': ['Tacos El Güero', 'Tacos', 'Tacos', 7388095, '301 N Wyoming St'],
    'cafe-quisqueya': ['Café Quisqueya', 'Cafetería', 'Café', 19252265, '27 W Broad St'],
    'el-fogon': ['El Fogón de Wyoming St', 'Parrilla y carnes', 'Grill', 38330332, '15 S Wyoming St'],
    'salon-glamour': ['Salón Glamour Dominicano', 'Salón de belleza', 'Hair salon', 7195805, '77 N Laurel St'],
    'pequenos-cortes': ['Pequeños Cortes Kids', 'Cortes para niños', 'Kids cuts', 7697358, '19 W Broad St'],
    'taller-hermanos-pena': ['Taller Hermanos Peña', 'Mecánico', 'Mechanic', 33814734, '540 W 9th St'],
    'llantera-el-cibao': ['Llantera El Cibao', 'Llantas', 'Tires', 3807167, '610 N Church St'],
    'plomeria-rodriguez': ['Plomería Rodríguez 24/7', 'Plomería', 'Plumbing', 7859953, '88 E 5th St'],
    'clinica-esperanza': ['Clínica Comunitaria Esperanza', 'Clínica de bajo costo', 'Low-cost clinic', 6129444, '20 E Diamond Ave'],
    'dental-sonrisa': ['Dental Sonrisa Hazleton', 'Dentista', 'Dentist', 6809652, '145 N Laurel St'],
    'pediatria-los-pinos': ['Pediatría Los Pinos', 'Pediatría', 'Pediatrics', 39192346, '310 N Church St'],
    'electro-hogar-caribe': ['Electro Hogar Caribe', 'Electrodomésticos', 'Appliances', 4700400, '400 W Broad St'],
  };
  /* Pedidos. st: live (en curso, stage 0–4) · done · rel (liberado). */
  const O = [
    { id: '1051', biz: 'sabor-dominicano', mode: 'dl', st: 'live', stage: 3, day: 0, time: '12:10 PM', eta: '12:45 PM', driver: 'Miguel', lines: [['Pollo guisado con moro', 'Stewed chicken with rice and beans', 1, 13], ['Tostones', 'Tostones', 1, 4], ['Jugo de chinola', 'Passion fruit juice', 1, 3.5]], fee: 3.99, tipP: 18, card: 'k1' },
    { id: '1042', biz: 'sabor-dominicano', mode: 'dl', st: 'done', day: -3, time: '7:32 PM', lines: [['Mofongo de chicharrón', 'Pork-rind mofongo', 1, 12, 'Caldo aparte'], ['Sancocho dominicano', 'Dominican sancocho', 1, 11], ['Morir soñando', 'Morir soñando', 2, 4]], fee: 3.99, tipP: 18, fact: ['Llegó caliente · 8 min antes de lo prometido', 'Arrived hot · 8 min earlier than promised'], rev: 'rv1', card: 'k1' },
    { id: '1019', biz: 'tacos-el-guero', mode: 'pk', st: 'done', day: -6, time: '8:40 PM', lines: [['Tacos al pastor', 'Tacos al pastor', 3, 2.75], ['Horchata grande', 'Large horchata', 1, 3]], fee: 0, tipP: 0, fact: ['Listo a la hora que te dijeron', 'Ready when they said'], req: 'rq2', card: 'k1' },
    { id: '0987', biz: 'panaderia-la-espiga', mode: 'pk', st: 'done', day: -12, time: '8:05 AM', lines: [['Pan de agua', 'Pan de agua', 6, 0.75], ['Bizcocho de piña · 1 lb', 'Pineapple cake · 1 lb', 1, 12]], fee: 0, tipP: 0, fact: ['Listo a la hora que te dijeron', 'Ready when they said'], card: 'k1' },
    { id: '0871', biz: 'empanadas-dona-tere', mode: 'pk', st: 'rel', day: -19, time: '11:10 AM', lines: [['Docena de empanadas', 'Dozen empanadas', 1, 15]], fee: 0, tipP: 0, why: ['No aceptaron en 10 minutos. Te liberamos el total y no se cobró nada.', 'Not accepted within 10 minutes. We released the full amount; nothing was charged.'], card: 'k2' },
    { id: '0803', biz: 'sabor-dominicano', mode: 'dl', st: 'done', day: -28, time: '1:10 PM', lines: [['Plato del día', 'Dish of the day', 2, 10.5]], fee: 3.99, tipP: 15, fact: ['Llegó tibio · a tiempo', 'Arrived warm · on time'], req: 'rq1', card: 'k1' },
  ];
  const AP = [
    { id: 'ap2', biz: 'llantera-el-cibao', item: ['2 gomas usadas 16" · instaladas', '2 used 16" tires · installed'], p: 90, until: 1, untilT: '5:00 PM' },
    { id: 'ap1', biz: 'salon-glamour', item: ['Aceite de argán · 4 oz', 'Argan oil · 4 oz'], p: 18, until: 2, untilT: '6:00 PM' },
  ];
  const C = [
    { id: 'c-fogon', k: 'mesa', biz: 'el-fogon', t: ['Mesa para 4', 'Table for 4'], day: 0, time: '8:00 PM', st: 'pend', sub: ['Terraza · a nombre de {s}', 'Patio · under {s}'], sent: ['Solicitud enviada hace 20 min · suelen responder en 15 min', 'Request sent 20 min ago · they usually reply in 15 min'], free: ['Cancelas gratis hasta 2 horas antes.', 'Free cancellation up to 2 hours before.'] },
    { id: 'c-glamour', k: 'cita', biz: 'salon-glamour', t: ['Keratina + corte', 'Keratin + haircut'], with: 'Mayra', day: 2, time: '10:00 AM', st: 'ok', dur: ['2 h 30 min', '2 h 30 min'], total: 150, dep: 30, free: ['Cancelas gratis hasta mañana a las 10:00 AM. Después, el depósito se queda con el salón.', 'Free cancellation until tomorrow 10:00 AM. After that, the salon keeps the deposit.'], note: ['Llega con el pelo seco.', 'Come with dry hair.'], chat: 'm-glamour' },
    { id: 'c-pena', k: 'auto', biz: 'taller-hermanos-pena', t: ['Frenos delanteros', 'Front brakes'], veh: '2016 Honda CR-V', day: 4, time: '8:30 AM', st: 'ok', total: 0, dep: 0, w: ['Lo dejas · te lo devuelven el mismo día', 'Drop off · same-day return'], free: ['Cancelas gratis hasta 2 horas antes. Sin depósito.', 'Free cancellation up to 2 hours before. No deposit.'], chat: 'm-pena' },
    { id: 'c-plomero', k: 'hogar', biz: 'plomeria-rodriguez', t: ['Revisar el calentador de agua', 'Check the water heater'], with: 'Luis Rodríguez', day: 6, time: '9:00 AM', st: 'ok', total: 89, dep: 0, sub: ['Llegan entre 9:00 y 11:00 AM · 58 W Oak St, Apt 2', 'Arrival 9:00–11:00 AM · 58 W Oak St, Apt 2'], note: ['Te dan el precio completo antes de empezar. Si hace falta una pieza, te piden tu OK.', 'They give the full price before starting. If a part is needed, they ask for your OK.'], free: ['Cancelas gratis hasta el día anterior.', 'Free cancellation until the day before.'], chat: 'm-plomero' },
    { id: 'c-dental', k: 'salud', biz: 'dental-sonrisa', t: ['Limpieza dental', 'Dental cleaning'], day: 9, time: '10:30 AM', st: 'pend', ins: 'Medicaid · aceptado', sent: ['Solicitud enviada ayer · confirman hoy antes de las 5 PM', 'Request sent yesterday · they confirm today before 5 PM'], free: ['Cancelas gratis hasta 24 horas antes.', 'Free cancellation up to 24 hours before.'], chat: 'm-dental' },
    { id: 'c-clinica', k: 'salud', biz: 'clinica-esperanza', t: ['Vacuna de la gripe', 'Flu shot'], day: -14, time: '3:20 PM', st: 'done', total: 0, rev: 'rv2' },
    { id: 'c-kids', k: 'cita', biz: 'pequenos-cortes', t: ['Corte para niños × 2', 'Kids cut × 2'], with: 'Luis', day: -25, time: '11:00 AM', st: 'done', total: 36, dep: 0 },
    { id: 'c-glamour-ago', k: 'cita', biz: 'salon-glamour', t: ['Color y secado', 'Color and blow-dry'], with: 'Mayra', day: -40, time: '2:00 PM', st: 'done', total: 95, dep: 20, rev: 'rv3' },
  ];
  const T = [
    { id: 't-merengue', ev: ['Noche de merengue en vivo', 'Live merengue night'], org: 'El Fogón de Wyoming St', day: 9, time: '9:00 PM', place: '15 S Wyoming St', n: 2, type: ['Cover', 'Cover'], p: 15, st: 'up', code: 'TL-NM-4R7C', ph: 14364672 },
    { id: 't-festival', ev: ['Festival Dominicano de Hazleton', 'Hazleton Dominican Festival'], org: "Ciudad de Hazleton · To'Latino", day: 18, time: '12:00 PM', place: 'Broad St · Downtown', n: 2, type: ['Entrada general', 'General admission'], p: 10, st: 'up', code: 'TL-FD-7K2Q', ph: 33477087 },
    { id: 't-bachata', ev: ['Noche de bachata', 'Bachata night'], org: 'Club Quisqueya', day: -26, time: '9:00 PM', place: 'N Wyoming St', n: 1, type: ['Cover', 'Cover'], p: 10, st: 'used', used: '9:14 PM', code: 'TL-NB-3M8A', ph: 1709920 },
  ];
  const FAV = { biz: ['sabor-dominicano', 'panaderia-la-espiga', 'cafe-quisqueya', 'salon-glamour', 'taller-hermanos-pena', 'llantera-el-cibao', 'dental-sonrisa', 'pediatria-los-pinos'],
    items: [['Mofongo de chicharrón', 'Pork-rind mofongo', 'sabor-dominicano', 12, 39122376], ['Pollo guisado con moro', 'Stewed chicken with rice and beans', 'sabor-dominicano', 13, 38330332], ['Bizcocho de piña · 1 lb', 'Pineapple cake · 1 lb', 'panaderia-la-espiga', 12, 35993723], ['Tacos al pastor', 'Tacos al pastor', 'tacos-el-guero', 2.75, 7388095], ['Café con leche grande', 'Large café con leche', 'cafe-quisqueya', 2.5, 19252265]],
    ev: [['Copa Sabor Dominicano', 'Sabor Dominicano Cup', 9, '2:00 PM', 'EL PATIO · DOMINÓ POR TURNOS', 'EL PATIO · TURN-BASED DOMINOES', 7104168, 'APP-PATIO-TORNEO']] };
  const ADDR = [
    { id: 'a1', lab: 'casa', st: '58 W Oak St', apt: 'Apt 2', zip: '18201', ins: 'Timbre de arriba. Si no contesto, déjalo con Doña Rosa del primer piso.', def: 1 },
    { id: 'a2', lab: 'trabajo', st: '125 Commerce Dr', apt: '', zip: '18202', ins: 'Recepción. Pregunta por mí en la entrada de empleados.', def: 0 },
    { id: 'a3', lab: 'otra', name: 'Casa de mami', st: '402 Alter St', apt: '1er piso', zip: '18201', ins: 'Toca fuerte, el timbre no sirve.', def: 0 },
  ];
  const CARDS = [{ id: 'k1', br: 'Visa', l4: '4242', exp: '08/28', def: 1 }, { id: 'k2', br: 'Mastercard', l4: '5100', exp: '11/27', def: 0 }];
  const WALLET = 12.4;
  /* Movimientos: [día, es, en, monto, tipo, método] tipo: cob · ret · lib · ree · dep · dev */
  const MOVES = [
    [0, 'Sabor Dominicano · pedido #1051', 'Sabor Dominicano · order #1051', -29.41, 'ret', 'Visa •• 4242'],
    [-1, 'El Fogón · 2 cover · merengue en vivo', 'El Fogón · 2 covers · live merengue', -30, 'cob', 'Visa •• 4242'],
    [-2, 'Salón Glamour · depósito de tu cita', 'Salón Glamour · booking deposit', -30, 'dep', 'Visa •• 4242'],
    [-3, 'Sabor Dominicano · pedido #1042', 'Sabor Dominicano · order #1042', -42.43, 'cob', 'Visa •• 4242'],
    [-6, 'Tacos El Güero · pedido #1019', 'Tacos El Güero · order #1019', -11.93, 'cob', 'Visa •• 4242'],
    [-6, 'Festival Dominicano · 2 entradas', 'Dominican Festival · 2 tickets', -20, 'cob', 'Visa •• 4242'],
    [-12, 'Panadería La Espiga · pedido #0987', 'Panadería La Espiga · order #0987', -17.49, 'cob', 'Visa •• 4242'],
    [-19, 'Empanadas Doña Tere · pedido #0871', 'Empanadas Doña Tere · order #0871', 15.9, 'lib', 'Mastercard •• 5100'],
    [-26, 'Club Quisqueya · noche de bachata', 'Club Quisqueya · bachata night', -10, 'cob', 'Visa •• 4242'],
    [-27, 'Reembolso · pedido #0803', 'Refund · order #0803', 5, 'ree', 'Wallet'],
    [-28, 'Sabor Dominicano · pedido #0803', 'Sabor Dominicano · order #0803', -29.4, 'cob', 'Visa •• 4242'],
    [-40, 'Salón Glamour · depósito · color y secado', 'Salón Glamour · deposit · color and blow-dry', -20, 'dep', 'Visa •• 4242'],
  ];
  const REQS = [
    { id: 'rq2', order: '1019', biz: 'tacos-el-guero', why: ['Faltó la horchata', 'The horchata was missing'], sol: ['$3.18 a tu Wallet', '$3.18 to your Wallet'], st: 'rev', day: -5, resp: null, note: ['El negocio no respondió en 24 horas. To’Latino lo está revisando y te contesta hoy.', 'The business did not reply within 24 hours. To’Latino is reviewing it and replies today.'] },
    { id: 'rq1', order: '0803', biz: 'sabor-dominicano', why: ['Llegó frío o mal preparado', 'Arrived cold or badly made'], sol: ['$5.00 a tu Wallet', '$5.00 to your Wallet'], st: 'ok', day: -27, resp: ['Disculpa, {n}. Te devolvimos $5 y la próxima va bien caliente.', 'Sorry, {n}. We refunded $5 and next time it goes out piping hot.'] },
  ];
  const REV = [
    { id: 'rv1', biz: 'sabor-dominicano', stars: 5, day: -3, t: ['El mofongo llegó caliente y antes de la hora. El caldo aparte, como lo pedí.', 'The mofongo arrived hot and early. Broth on the side, as I asked.'], fact: ['DELIVERY · PEDIDO #1042 · LLEGÓ CALIENTE', 'DELIVERY · ORDER #1042 · ARRIVED HOT'], useful: 6, resp: ['¡Gracias, {n}! Te esperamos el jueves para el mofongo.', 'Thanks, {n}! See you Thursday for the mofongo.'] },
    { id: 'rv2', biz: 'clinica-esperanza', stars: 4, day: -13, t: ['Me atendieron en español y sin cita. La espera fue de 40 minutos.', 'They saw me in Spanish without an appointment. The wait was 40 minutes.'], fact: ['VISITA · VACUNA DE LA GRIPE', 'VISIT · FLU SHOT'], useful: 3 },
    { id: 'rv3', biz: 'salon-glamour', stars: 5, day: -39, t: ['Mayra me dejó el color exacto que le enseñé en la foto. Me atendió a la hora y el precio fue el publicado.', 'Mayra matched the exact color from my photo. On time, and the price was the posted one.'], fact: ['CITA #C-2291 · A LA HORA · PRECIO PUBLICADO', 'BOOKING #C-2291 · ON TIME · POSTED PRICE'], useful: 11, resp: ['Gracias a ti, {n}. Mayra te manda saludos.', 'Thank you, {n}. Mayra says hi.'] },
    { id: 'rv4', biz: 'llantera-el-cibao', stars: 4, day: -61, t: ['Rápidos y honestos: me dijeron que una goma todavía servía. El balanceo se cobra aparte, pero estaba en el precio publicado.', 'Quick and honest: they told me one tire was still fine. Balancing is extra, but it was in the posted price.'], fact: ['CITA · 2 GOMAS INSTALADAS', 'BOOKING · 2 TIRES INSTALLED'], useful: 4 },
  ];
  const PEND = [['tacos-el-guero', 'PEDIDO #1019', 'ORDER #1019', -6], ['panaderia-la-espiga', 'PEDIDO #0987', 'ORDER #0987', -12], ['pequenos-cortes', 'CITA · CORTE PARA NIÑOS', 'BOOKING · KIDS CUT', -25]];
  const THREADS = [
    { id: 'm-sabor', biz: 'sabor-dominicano', ctx: ['Pedido #1051 · en camino', 'Order #1051 · on the way'], msgs: [['them', 'Hola {n}, Miguel salió con tu pedido. Llega a las 12:45.', 'Hi {n}, Miguel is on his way with your order. Arriving at 12:45.', 0.2]], unread: 1 },
    { id: 'm-glamour', biz: 'salon-glamour', ctx: ['Cita · sáb 26 sep, 10:00 AM', 'Booking · Sat Sep 26, 10:00 AM'], msgs: [['them', 'Hola {n}, tu cita del sábado a las 10:00 quedó confirmada con Mayra.', 'Hi {n}, your Saturday 10:00 booking with Mayra is confirmed.', 26], ['them', 'Llega con el pelo seco, por favor.', 'Please come with dry hair.', 26]], unread: 1 },
    { id: 'm-dental', biz: 'dental-sonrisa', ctx: ['Solicitud · sáb 3 oct, 10:30 AM', 'Request · Sat Oct 3, 10:30 AM'], msgs: [['them', 'Recibimos tu solicitud. Confirmamos hoy antes de las 5 PM. Trae tu tarjeta de Medicaid.', 'We got your request. We confirm today before 5 PM. Bring your Medicaid card.', 20]], unread: 0 },
    { id: 'm-plomero', biz: 'plomeria-rodriguez', ctx: ['Visita · mié 30 sep, 9:00 AM', 'Visit · Wed Sep 30, 9:00 AM'], msgs: [['me', '¿Pueden venir antes de las 11? Entro a trabajar a mediodía.', 'Can you come before 11? I start work at noon.', 30], ['them', 'Sí, Luis llega a las 9:00. Si se atrasa, te escribimos por aquí.', 'Yes, Luis arrives at 9:00. If he runs late, we message you here.', 29]], unread: 0 },
    { id: 'm-pena', biz: 'taller-hermanos-pena', ctx: ['Cita · lun 28 sep, 8:30 AM', 'Booking · Mon Sep 28, 8:30 AM'], msgs: [['me', '¿Puedo dejarlo desde el domingo en la noche?', 'Can I drop it off Sunday night?', 22], ['them', 'Sí. Deja la llave en el buzón rojo de la entrada.', 'Yes. Leave the key in the red box at the entrance.', 21]], unread: 0 },
  ];
  const REPLY = { 'm-sabor': ['Miguel ya está cerca. Cualquier cosa, te escribimos.', 'Miguel is close. We will write if anything changes.'], 'm-glamour': ['Perfecto, te esperamos.', 'Perfect, see you then.'], 'm-pena': ['Anotado. Cualquier cosa nos escribes.', 'Noted. Write us anytime.'], 'm-dental': ['Anotado. Te confirmamos en un rato.', 'Noted. We will confirm shortly.'], 'm-plomero': ['Perfecto. Luis te avisa al salir.', 'Great. Luis will text when he leaves.'], def: ['Recibido. Te contestamos en breve.', 'Got it. We will reply shortly.'] };
  const INVITED = [['Gabriela M.', 1, 20045343], ['Rosa J.', 1, 29889352], ['Kelvin A.', 1, 6102841], ['Danny C.', 0, 1681010]];
  const SESSIONS = [['Este iPhone', 'This iPhone', 'AHORA · HAZLETON, PA', 'NOW · HAZLETON, PA', 1], ['Chrome en Windows', 'Chrome on Windows', 'HACE 2 DÍAS · HAZLETON, PA', '2 DAYS AGO · HAZLETON, PA', 0]];
  window.TLUsr = { RANKS, BZ, O, AP, C, T, FAV, ADDR, CARDS, WALLET, MOVES, REQS, REV, PEND, THREADS, REPLY, INVITED, SESSIONS };
})();
