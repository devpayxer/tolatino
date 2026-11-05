/* Ficha de Fiestas (APP-NEG-LISTING-PRO/FREE · NEG-FIESTA) — datos + motor. Hoy: jue 24 sep 2026, 12:30 PM.
   Tesis: ¿esa fecha está libre? Línea fija: "La fecha no es tuya hasta que te la confirmen." (ficha, hoja, Booking, estado).
   Tu fecha (como Mi vehículo / Tu seguro): s.fev = { e: tipo, i: día (offset), g: invitados, w: dónde }. Hoja = plantilla `hc` (s.hcs.fiesta).
     Cada servicio y la ficha dicen "Libre el …" u "Ocupada el …" + próximas fechas libres. Sin fecha: próximo sábado libre.
   Servicio k: pack (paquete cerrado; h horas; inc = lo que incluye) · hora (p por hora, min horas mínimas) · unid (por unidad; u = unidad) ·
     fijo · visita (visita al salón, gratis) · cotiza (desde p; total por escrito). cap = invitados · mont = incluye montaje · env = entrega incluida o precio.
   Reseñas: respetaron la fecha · llegaron a la hora · cobraron lo del paquete · quedó como en las fotos · recogieron y limpiaron · trato.
   Booking y estado = etapa 3 (encargo APP-NEG-FIESTA-BOOKING). */
(function boot() {
  const X = window.TLListing, SD = window.TLStaff, FI = window.TLFiesta, ALL = window.TLAll; if (!X || !SD || !FI || !ALL) return setTimeout(boot, 40);
  const NOW = 12.5, fmt = X.fmt, money = n => '$' + Math.round(n).toLocaleString('en-US');
  const U = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300) + ')';
  const PX = (id, h) => 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300);
  const biz = id => ALL.B.find(b => b.id === id), stop = e => { if (e && e.stopPropagation) e.stopPropagation(); };
  const day = i => new Date(2026, 8, 24 + i), DS = [['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']];
  const MO = [['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']];
  const dayL = (i, es) => { const d = day(i); return es ? DS[0][d.getDay()] + ' ' + d.getDate() + ' ' + MO[0][d.getMonth()] : DS[1][d.getDay()] + ' ' + MO[1][d.getMonth()] + ' ' + d.getDate(); };
  const PH = FI.SUBPH, sv = (n, ne, d, de, p, k, o) => Object.assign({ n, ne, d, de, p, k }, o || {}), W = (...a) => a, WK = (h, sat, sun) => W(sun || null, h, h, h, h, h, sat || null);
  const LINE = FI.line;
  const SVC = {
    'salon-imperial': [['Salón', 'Hall', [
      sv('Sábado · 6 horas', 'Saturday · 6 hours', 'Salón para 250, mesas redondas, sillas, manteles y pista. Tú traes la comida o la ponemos nosotros.', 'Hall for 250, round tables, chairs, linens and dance floor. Bring your food or we provide it.', 1800, 'pack', { h: 6, cap: 250, mont: 1, ph: PH['Salón de fiestas'], inc: [['Mesas, sillas y manteles', 'Tables, chairs and linens'], ['Pista y sonido básico', 'Dance floor and basic sound'], ['Seguridad y limpieza', 'Security and cleanup']] }),
      sv('Viernes o domingo · 6 horas', 'Friday or Sunday · 6 hours', 'Lo mismo que el sábado, 20 % menos.', 'Same as Saturday, 20% less.', 1440, 'pack', { h: 6, cap: 250, mont: 1, ph: PH['Salón de fiestas'] }),
      sv('Hora extra', 'Extra hour', 'Hasta la 1 AM.', 'Until 1 AM.', 200, 'hora', { min: 1, ph: PH['Salón de fiestas'] }),
      sv('Visita al salón', 'Venue tour', 'Ven a verlo antes de apartar. Gratis, 30 minutos.', 'See it before you book. Free, 30 minutes.', 0, 'visita', { ph: PH['Salón de fiestas'] })]],
      ['Decoración', 'Décor', [sv('Centros de mesa', 'Centerpieces', 'Flores o velas, por mesa.', 'Flowers or candles, per table.', 25, 'unid', { u: ['mesa', 'table'], ph: PH['Decoración y centros de mesa'] })]]],
    'suenos-de-quince': [['Quince', 'Quince', [
      sv('Paquete quince completo', 'Full quince package', 'Organización, coreografía, vestido, decoración y el día coordinado de principio a fin.', 'Planning, choreography, dress, décor and day-of coordination start to finish.', 3900, 'pack', { h: 0, ph: PH['Organizador de quinceañeras'], inc: [['Coordinación del día', 'Day-of coordination'], ['8 ensayos de coreografía', '8 choreography rehearsals'], ['Vestido y 2 cambios', 'Dress and 2 changes'], ['Decoración del salón', 'Hall décor']] }),
      sv('Coreografía y chambelanes', 'Choreography and escorts', '8 ensayos y el vals el día de la fiesta.', '8 rehearsals and the waltz on the day.', 650, 'fijo', { ph: PH['Chambelanes y coreografía'] }),
      sv('Renta de vestido', 'Dress rental', 'Con prueba y ajuste. Se devuelve el lunes.', 'With fitting and alterations. Return on Monday.', 280, 'fijo', { ph: PH['Renta de vestidos y trajes'] }),
      sv('Primera cita', 'First meeting', 'Te mostramos vestidos, fotos y paquetes. Gratis.', 'We show you dresses, photos and packages. Free.', 0, 'visita', { ph: PH['Organizador de quinceañeras'] })]]],
    'hazleton-party-rentals': [['Renta', 'Rentals', [
      sv('Mesa + 8 sillas', 'Table + 8 chairs', 'Mesa redonda o larga, sillas blancas.', 'Round or long table, white chairs.', 14, 'unid', { u: ['juego', 'set'], ph: PH['Renta de mesas y sillas'] }),
      sv('Carpa 20 × 30', '20 × 30 tent', 'Para 60 personas sentadas. Montaje incluido.', 'Seats 60. Setup included.', 450, 'fijo', { cap: 60, mont: 1, ph: PH['Renta de carpas'] }),
      sv('Manteles', 'Linens', 'Blancos o de color, lavados y planchados.', 'White or colored, washed and pressed.', 8, 'unid', { u: ['mantel', 'linen'], ph: PH['Mantelería'] }),
      sv('Brincolín', 'Bounce house', '6 horas, con entrega.', '6 hours, delivered.', 150, 'fijo', { mont: 1, ph: PH['Brincolines e inflables'] }),
      sv('Entrega, montaje y recogida', 'Delivery, setup and pickup', 'Hasta 25 millas de Hazleton.', 'Up to 25 miles from Hazleton.', 60, 'fijo', { ph: PH['Renta de artículos para fiesta'] })]]],
    'dj-el-cibaeno': [['Música', 'Music', [
      sv('DJ · 4 horas', 'DJ · 4 hours', 'Merengue, bachata, salsa, reguetón y lo que pidan. Con luces y micrófono.', 'Merengue, bachata, salsa, reggaeton and requests. Lights and mic included.', 450, 'pack', { h: 4, mont: 1, ph: PH['DJ'], inc: [['Sonido para 200 personas', 'Sound for 200 people'], ['Luces de pista', 'Dance floor lights'], ['Micrófono inalámbrico', 'Wireless mic']] }),
      sv('Hora extra', 'Extra hour', 'Se pide el mismo día.', 'Can be added on the day.', 90, 'hora', { min: 1, ph: PH['DJ'] }),
      sv('Animador y hora loca', 'Host and hora loca', 'Maestro de ceremonias, juegos y 30 min de hora loca.', 'MC, games and 30 min of hora loca.', 250, 'fijo', { ph: PH['Maestro de ceremonias y animador'] })]]],
    'mariachi-real-hazleton': [['Música', 'Music', [
      sv('Serenata · 45 minutos', 'Serenade · 45 minutes', '7 músicos con traje de gala.', '7 musicians in full dress.', 380, 'pack', { h: 0.75, ph: PH['Mariachi'] }),
      sv('Fiesta · 2 horas', 'Party · 2 hours', 'Con Las Mañanitas y las que pidan.', 'With Las Mañanitas and requests.', 900, 'pack', { h: 2, ph: PH['Mariachi'] }),
      sv('Trío romántico · 1 hora', 'Romantic trio · 1 hour', 'Boleros y bachata de guitarra.', 'Boleros and guitar bachata.', 300, 'pack', { h: 1, ph: PH['Trío y serenata'] })]]],
    'globos-y-mas': [['Decoración', 'Décor', [
      sv('Arco de globos', 'Balloon arch', '2.5 metros, dos o tres colores. Montaje incluido.', '8 feet, two or three colors. Setup included.', 180, 'fijo', { mont: 1, ph: PH['Decoración con globos'] }),
      sv('Fondo con nombre', 'Backdrop with name', 'Para la foto de la mesa principal.', 'For the head-table photo.', 220, 'fijo', { mont: 1, ph: PH['Fondos y arcos'] }),
      sv('Paquete quince o cumpleaños', 'Quince or birthday package', 'Arco, fondo, mesa principal y mesa de dulces.', 'Arch, backdrop, head table and candy table.', 520, 'pack', { h: 0, mont: 1, ph: PH['Mesa de dulces'], inc: [['Arco de globos', 'Balloon arch'], ['Fondo con nombre', 'Name backdrop'], ['Mesa de dulces', 'Candy table']] })]]],
    'momentos-foto-video': [['Fotos y video', 'Photo & video', [
      sv('Fotos · 4 horas', 'Photos · 4 hours', '300 fotos editadas en 2 semanas, en línea.', '300 edited photos in 2 weeks, online.', 650, 'pack', { h: 4, ph: PH['Fotógrafo'] }),
      sv('Fotos y video · 6 horas', 'Photos and video · 6 hours', 'Con video resumen de 5 minutos.', 'With a 5-minute highlight video.', 1400, 'pack', { h: 6, ph: PH['Videógrafo'] }),
      sv('Cabina 360', '360 booth', '3 horas, videos al teléfono al momento.', '3 hours, videos to phones instantly.', 450, 'pack', { h: 3, mont: 1, ph: PH['Cabina 360'] }),
      sv('Dron', 'Drone', 'Tomas del lugar desde arriba.', 'Aerial shots of the venue.', 200, 'fijo', { ph: PH['Fotografía con dron'] })]]],
    'dulce-tentacion': [['Bizcochos', 'Cakes', [
      sv('Bizcocho dominicano', 'Dominican cake', 'Relleno de piña o dulce de leche, suspiro. Por porción; mínimo 20.', 'Pineapple or dulce de leche filling, meringue. Per slice; 20 minimum.', 4, 'unid', { u: ['porción', 'slice'], ph: PH['Pastel y postres de evento'] }),
      sv('Mesa de dulces', 'Candy table', 'Para 50: cupcakes, galletas y dulces con tus colores.', 'For 50: cupcakes, cookies and sweets in your colors.', 250, 'fijo', { ph: PH['Mesa de dulces'] }),
      sv('Fuente de chocolate', 'Chocolate fountain', 'Con fruta y malvaviscos para 80.', 'With fruit and marshmallows for 80.', 280, 'fijo', { ph: PH['Fuente de chocolate'] })]]],
    'brincolines-la-alegria': [['Inflables', 'Inflatables', [
      sv('Brincolín · 6 horas', 'Bounce house · 6 hours', 'Entrega, montaje y recogida incluidos.', 'Delivery, setup and pickup included.', 150, 'fijo', { mont: 1, ph: PH['Brincolines e inflables'] }),
      sv('Tobogán de agua', 'Water slide', 'Para el verano; con lona para el patio.', 'For summer; with a yard tarp.', 250, 'fijo', { mont: 1, ph: PH['Brincolines e inflables'] }),
      sv('Juegos de feria', 'Carnival games', '5 juegos y premios para 30 niños.', '5 games and prizes for 30 kids.', 180, 'fijo', { ph: PH['Juegos y renta de feria'] })]]],
    'andrea-events': [['Organización', 'Planning', [
      sv('Coordinación del día', 'Day-of coordination', 'Llego a las 8 AM y me encargo de proveedores, horarios y ceremonia.', 'I arrive at 8 AM and handle vendors, timeline and ceremony.', 900, 'pack', { h: 12, ph: PH['Organizador de bodas'] }),
      sv('Boda completa', 'Full wedding', 'Desde la fecha hasta el último baile. Presupuesto y proveedores contigo.', 'From the date to the last dance. Budget and vendors with you.', 2500, 'cotiza', { ph: PH['Organizador de bodas'] }),
      sv('Primera cita', 'First meeting', 'Te cuento cómo trabajo y cuánto cuesta. Gratis.', 'I tell you how I work and what it costs. Free.', 0, 'visita', { ph: PH['Organizador de eventos'] })]]],
    'barra-movil-tropical': [['Barra', 'Bar', [
      sv('Barra · 4 horas', 'Bar · 4 hours', '2 bartenders, hielo, vasos y mezcladores. Tú traes la bebida.', '2 bartenders, ice, cups and mixers. You bring the drinks.', 550, 'pack', { h: 4, cap: 300, mont: 1, ph: PH['Barra móvil'] }),
      sv('Meseros', 'Waitstaff', 'Por mesero, 5 horas.', 'Per server, 5 hours.', 150, 'unid', { u: ['mesero', 'server'], ph: PH['Meseros'] })]]],

    'fiestas-magicas': [['Cumpleaños', 'Birthdays', [
      sv('Cumpleaños · 3 horas', 'Birthday · 3 hours', 'Animadora, juegos, piñata y la mesa decorada con tus colores. Para 30 niños.', 'Host, games, piñata and the table decorated in your colors. For 30 kids.', 420, 'pack', { h: 3, mont: 1, ph: PH['Fiestas de cumpleaños'], inc: [['Animadora y juegos', 'Host and games'], ['Piñata', 'Piñata'], ['Mesa decorada', 'Decorated table']] }),
      sv('Personaje · 1 hora', 'Character · 1 hour', 'Llega vestido: fotos, baile y la entrega del pastel.', 'Arrives in costume: photos, dancing and cake time.', 150, 'pack', { h: 1, ph: PH['Personajes y botargas'] }),
      sv('Show de magia · 45 minutos', 'Magic show · 45 minutes', 'Magia de cerca y en escena; el cumpleañero participa.', 'Close-up and stage magic; the birthday kid joins in.', 250, 'pack', { h: 0.75, ph: PH['Mago'] })]],
      ['Baby shower', 'Baby shower', [sv('Baby shower organizado', 'Planned baby shower', 'Fondo, mesa principal, juegos con premios y quien lleva el programa.', 'Backdrop, head table, games with prizes and someone running the program.', 600, 'pack', { h: 3, mont: 1, ph: PH['Organizador de baby shower'], inc: [['Fondo y mesa principal', 'Backdrop and head table'], ['Juegos con premios', 'Games with prizes'], ['Coordinación del programa', 'Program coordination']] }),
      sv('Primera cita', 'First meeting', 'Te cuento opciones y precios. Gratis.', 'Options and prices. Free.', 0, 'visita', { ph: PH['Organizador de baby shower'] })]]],
    'patio-en-grande': [['Montaje', 'Setup', [
      sv('Patio listo para 100', 'Backyard ready for 100', 'Carpa, 12 mesas, 100 sillas, pista y luces. Montamos el día antes y recogemos el día después.', 'Tent, 12 tables, 100 chairs, dance floor and lights. Set up the day before, picked up the day after.', 1650, 'pack', { h: 0, cap: 100, mont: 1, ph: PH['Montaje en patio'], inc: [['Carpa 20 × 40', '20 × 40 tent'], ['12 mesas y 100 sillas', '12 tables and 100 chairs'], ['Pista y luces', 'Dance floor and lights']] }),
      sv('Pista de baile 16 × 16', '16 × 16 dance floor', 'Negra o blanca, sobre grama o cemento.', 'Black or white, on grass or concrete.', 380, 'fijo', { mont: 1, ph: PH['Escenario y pista'] }),
      sv('Escenario 12 × 8', '12 × 8 stage', 'Para la banda o el DJ, con escalera y faldón.', 'For the band or DJ, with steps and skirting.', 450, 'fijo', { mont: 1, ph: PH['Escenario y pista'] }),
      sv('Planta de luz', 'Generator', '7,500 W silenciosa, con gasolina para 8 horas.', 'Quiet 7,500 W, fuel for 8 hours.', 220, 'fijo', { ph: PH['Plantas de luz'] }),
      sv('Baño portátil', 'Portable restroom', 'Uno por cada 50 invitados. Se entrega y se recoge.', 'One per 50 guests. Delivered and picked up.', 140, 'unid', { u: ['baño', 'unit'], ph: PH['Baños portátiles'] }),
      sv('Visita a tu patio', 'Backyard visit', 'Medimos y te decimos qué cabe. Gratis.', 'We measure and tell you what fits. Free.', 0, 'visita', { ph: PH['Montaje en patio'] })]]],
    'hora-loca-tropical': [['Animación', 'Entertainment', [
      sv('Hora loca · 30 minutos', 'Hora loca · 30 minutes', '4 bailarines con zancos y máscaras; pitos y collares para los invitados.', '4 dancers on stilts and in masks; whistles and necklaces for guests.', 350, 'pack', { h: 0.5, ph: PH['Bailarines y hora loca'], inc: [['4 bailarines', '4 dancers'], ['Pitos y collares para 100', 'Whistles and necklaces for 100']] }),
      sv('Cantante · 1 hora', 'Singer · 1 hour', 'Merengue, bachata y baladas, con su propio sonido.', 'Merengue, bachata and ballads, with own sound.', 300, 'pack', { h: 1, ph: PH['Cantante'] }),
      sv('Animador toda la fiesta', 'Host for the whole party', 'Presenta, lleva el programa y anima el vals y el brindis. 5 horas.', 'Emcees, runs the program, leads the waltz and toast. 5 hours.', 400, 'pack', { h: 5, ph: PH['Maestro de ceremonias y animador'] })]]],
  };
  Object.assign(SVC, {
    'payasita-chispita': [['Shows', 'Shows', [sv('Show de payasita · 1 hora', 'Clown show · 1 hour', 'Juegos, globos y concurso de baile para hasta 30 niños.', 'Games, balloons and a dance contest for up to 30 kids.', 180, 'pack', { h: 1, ph: PH['Payasos'] }), sv('Pintacaritas · 2 horas', 'Face painting · 2 hours', 'Hasta 40 caritas, pintura para piel sensible.', 'Up to 40 faces, paint for sensitive skin.', 120, 'pack', { h: 2, ph: PH['Payasos'] })]]],
    'floreria-la-orquidea': [['Flores', 'Flowers', [sv('Ramo de novia', 'Bridal bouquet', 'Lo ves en foto antes de hacerlo; flores de temporada.', 'You see it in a photo first; seasonal flowers.', 150, 'unid', { u: ['ramo', 'bouquet'], ph: PH['Florería'] }), sv('Centro de mesa', 'Centerpiece', 'Precio por mesa; mínimo 10.', 'Price per table; minimum 10.', 35, 'unid', { u: ['mesa', 'table'], ph: PH['Florería'] })]]],
    'sonido-perez': [['Sonido', 'Sound', [sv('Sonido para 150 · 5 horas', 'Sound for 150 · 5 hours', '2 bocinas, consola y micrófono; lo montan y lo recogen.', '2 speakers, mixer and mic; set up and picked up.', 250, 'pack', { h: 5, mont: 1, ph: PH['Renta de sonido'] }), sv('Luces de pista', 'Dance floor lights', 'Luces y máquina de humo.', 'Lights and fog machine.', 120, 'pack', { h: 5, ph: PH['Renta de sonido'] })]]],
    'hazleton-limo': [['Vehículos', 'Vehicles', [sv('Limosina · 3 horas', 'Limo · 3 hours', 'Hasta 10 personas, chofer con licencia; sin alcohol para menores.', 'Up to 10 people, licensed driver; no alcohol for minors.', 450, 'pack', { h: 3, ph: PH['Limosina y party bus'] }), sv('Party bus · 4 horas', 'Party bus · 4 hours', 'Hasta 20 personas, luces y sonido.', 'Up to 20 people, lights and sound.', 750, 'pack', { h: 4, ph: PH['Limosina y party bus'] })]]],
    'salon-los-compadres': [['Salón', 'Hall', [sv('Sábado · 5 horas', 'Saturday · 5 hours', 'Salón para 120 con mesas, sillas y cocina para tu comida.', 'Hall for 120 with tables, chairs and a kitchen for your food.', 950, 'pack', { h: 5, cap: 120, mont: 1, ph: PH['Salón de fiestas'] }), sv('Visita al salón', 'Hall visit', 'Gratis, con cita.', 'Free, by appointment.', 0, 'visita', { ph: PH['Salón de fiestas'] })]]],
    'taquiza-don-chuy': [['Taquiza', 'Taco bar', [sv('Taquiza para 50', 'Taco bar for 50', '4 guisos, tortillas a mano, salsas y 3 horas de servicio.', '4 fillings, handmade tortillas, salsas and 3 hours of service.', 650, 'pack', { h: 3, ph: PH['Taquiza y parrillada'] }), sv('Parrillada para 50', 'Grill for 50', 'Carne asada, pollo, cebollitas y frijoles.', 'Carne asada, chicken, grilled onions and beans.', 850, 'pack', { h: 3, ph: PH['Taquiza y parrillada'] })]]],
    'banda-la-dinastia': [['Música', 'Music', [sv('Banda en vivo · 3 horas', 'Live banda · 3 hours', '10 músicos con su propio sonido.', '10 musicians with their own sound.', 1800, 'pack', { h: 3, ph: PH['Banda & norteño'] }), sv('Norteño · 2 horas', 'Norteño · 2 hours', '4 músicos.', '4 musicians.', 800, 'pack', { h: 2, ph: PH['Banda & norteño'] })]]],
    'fiesta-mart': [['Tienda', 'Store', [sv('Piñata', 'Piñata', 'Hecha aquí; la de tu personaje por encargo.', 'Made here; your character to order.', 25, 'unid', { u: ['piñata', 'piñata'], ph: PH['Tienda de artículos de fiesta'] }), sv('50 invitaciones impresas', '50 printed invitations', 'Listas en 3 días.', 'Ready in 3 days.', 45, 'unid', { u: ['paquete', 'pack'], ph: PH['Tienda de artículos de fiesta'] })]]],
    'invitaciones-gaby': [['Invitaciones', 'Invitations', [sv('50 invitaciones', '50 invitations', 'Diseño contigo y prueba antes de imprimir.', 'Design with you and a proof before printing.', 60, 'unid', { u: ['paquete', 'pack'], ph: PH['Invitaciones e impresión'] }), sv('Invitación digital', 'Digital invitation', 'Para WhatsApp, con confirmación.', 'For WhatsApp, with RSVP.', 25, 'unid', { u: ['diseño', 'design'], ph: PH['Invitaciones e impresión'] })]]],
    'cabina-selfie-hazleton': [['Cabina', 'Booth', [sv('Cabina · 3 horas', 'Booth · 3 hours', 'Fotos ilimitadas impresas, accesorios y galería en línea.', 'Unlimited printed photos, props and online gallery.', 395, 'pack', { h: 3, mont: 1, ph: PH['Cabina de fotos'] }), sv('Hora extra', 'Extra hour', '', '', 95, 'hora', { ph: PH['Cabina de fotos'] })]]],
    'chispas-frias-pa': [['Efectos', 'Effects', [sv('4 máquinas · 2 tiros', '4 machines · 2 shots', 'Chispas frías para el vals o la entrada; con operador y seguro.', 'Cold sparks for the waltz or entrance; operator and insurance.', 450, 'pack', { h: 1, ph: PH['Pirotecnia y chispas frías'] }), sv('Humo bajo para el primer baile', 'Low fog for the first dance', '', '', 250, 'pack', { h: 1, ph: PH['Pirotecnia y chispas frías'] })]]],
    'keystone-eventos': [['Eventos', 'Events', [sv('Planeación del evento', 'Event planning', 'Lugar, proveedores y el día del evento; presupuesto por escrito.', 'Venue, vendors and day-of; budget in writing.', 1200, 'cotiza', { ph: PH['Eventos corporativos'] }), sv('Coordinación del día', 'Day-of coordination', '8 horas.', '8 hours.', 600, 'pack', { h: 8, ph: PH['Eventos corporativos'] })]]]
  });
  const STAFF = {
    'floreria-la-orquidea': [['Orquídea Valdez', 'Dueña · florista', 'Owner · florist', 2011, 5410101, ['es', 'en'], [['Ramos de novia', 'Bridal bouquets'], ['Centros de mesa', 'Centerpieces']], ['Te mando foto del ramo antes de hacerlo; si no te gusta, lo cambio.', 'I send you a photo of the bouquet first; if you do not like it, I change it.'], WK([10, 18], [9, 18], null)]],
    'salon-imperial': [['Rosa Imperial Díaz', 'Dueña', 'Owner', 2012, 37302655, ['es', 'en'], [['Bodas', 'Weddings'], ['Quinces', 'Quinces']], ['Te enseño el salón y te digo qué fechas tengo, sin apuro.', 'I show you the hall and tell you which dates I have, no rush.'], WK([10, 20], [10, 24], [10, 22])], ['Luis Batista', 'Montaje y seguridad', 'Setup and security', 2016, 39284039, ['es', 'en'], [['Montaje', 'Setup']], ['El salón listo 2 horas antes.', 'The hall ready 2 hours early.'], WK([12, 22], [10, 24], [10, 22])]],
    'suenos-de-quince': [['Yamilet Rosario', 'Organizadora · dueña', 'Planner · owner', 2017, 39283716, ['es', 'en'], [['Quinces', 'Quinces'], ['Vestidos', 'Dresses']], ['He organizado más de 200 quinces en Hazleton.', 'I have planned 200+ quinces in Hazleton.'], WK([11, 19], [10, 16])], ['Jonathan Peña', 'Coreógrafo', 'Choreographer', 2019, 10959917, ['es', 'en'], [['Vals', 'Waltz'], ['Sorpresa', 'Surprise dance']], ['Ensayos los sábados en el salón.', 'Rehearsals Saturdays at the hall.'], WK([15, 19], [10, 16])]],
    'hazleton-party-rentals': [['Mike Santana', 'Dueño', 'Owner', 2014, 39283964, ['es', 'en'], [['Carpas', 'Tents']], ['Si llueve, te avisamos el día antes para cambiar la carpa.', 'If it rains, we call the day before to switch the tent.'], WK([8, 18], [8, 20], [8, 14])], ['Kelvin Mota', 'Entregas y montaje', 'Delivery and setup', 2020, 19785046, ['es'], [['Montaje', 'Setup']], ['Llego a la hora que dijimos.', 'I arrive when we said.'], WK([8, 18], [8, 20])]],
    'mariachi-real-hazleton': [['Gerardo Ríos', 'Director', 'Band leader', 2010, 37664403, ['es', 'en'], [['Serenatas', 'Serenades']], ['Llegamos 15 minutos antes, afinados y listos.', 'We arrive 15 minutes early, tuned and ready.'], WK([10, 21], [9, 24], [9, 22])]],
    'momentos-foto-video': [['Paola Almonte', 'Fotógrafa', 'Photographer', 2016, 28386388, ['es', 'en'], [['Quinces', 'Quinces'], ['Bodas', 'Weddings']], ['Te entrego las fotos en 2 semanas o te devuelvo el depósito.', 'Photos in 2 weeks or your deposit back.'], WK([10, 19], [8, 24], [9, 22])], ['Rafael Méndez', 'Videógrafo', 'Videographer', 2018, 39284036, ['es', 'en'], [['Video', 'Video'], ['Dron', 'Drone']], ['Video resumen listo en 10 días.', 'Highlight video ready in 10 days.'], WK([12, 19], [8, 24], [9, 22])]],
    'brincolines-la-alegria': [['Marcos Liriano', 'Dueño', 'Owner', 2021, 34299170, ['es'], [['Inflables', 'Inflatables']], ['Los limpio y reviso antes de cada fiesta.', 'I clean and check them before every party.'], WK([8, 18], [7, 20], [7, 18])]],
    'dj-el-cibaeno': [['Yoel Taveras', 'DJ · dueño', 'DJ · owner', 2015, 3758102, ['es', 'en'], [['Merengue', 'Merengue'], ['Bachata', 'Bachata']], ['Llego una hora antes a montar y probar el sonido.', 'I arrive an hour early to set up and test the sound.'], WK([12, 22], [10, 24], [12, 22])]],
    'globos-y-mas': [['Milagros Peña', 'Decoradora · dueña', 'Decorator · owner', 2020, 6146948, ['es', 'en'], [['Arcos', 'Arches'], ['Mesas de dulces', 'Candy tables']], ['Te mando la foto de los colores antes de inflar.', 'I send you a photo of the colors before inflating.'], WK([10, 19], [8, 18])]],
    'dulce-tentacion': [['Yolanda Báez', 'Repostera · dueña', 'Baker · owner', 2018, 37330783, ['es'], [['Bizcocho dominicano', 'Dominican cake']], ['El bizcocho se hace el día antes, nunca congelado.', 'The cake is baked the day before, never frozen.'], WK([9, 18], [8, 15])]],
    'andrea-events': [['Andrea Fermín', 'Organizadora · dueña', 'Planner · owner', 2014, 6347901, ['es', 'en'], [['Bodas', 'Weddings'], ['Quinces', 'Quinces']], ['Te doy el presupuesto por escrito y lo cuidamos juntas.', 'I give you the budget in writing and we stick to it together.'], WK([10, 18])]],
    'fiestas-magicas': [['Karina Jáquez', 'Organizadora · dueña', 'Planner · owner', 2019, 4473398, ['es', 'en'], [['Cumpleaños', 'Birthdays'], ['Baby shower', 'Baby showers']], ['Los personajes llegan vestidos y se quedan la hora completa.', 'Characters arrive in costume and stay the full hour.'], WK([10, 19], [9, 20], [10, 18])]],
    'patio-en-grande': [['Ramón Ureña', 'Dueño', 'Owner', 2017, 10392126, ['es', 'en'], [['Montajes', 'Setups']], ['Antes de cobrarte, voy a medir tu patio.', 'Before I charge you, I come measure your yard.'], WK([8, 18], [7, 20], [8, 16])]],
    'hora-loca-tropical': [['Franklin Polanco', 'Animador · dueño', 'Host · owner', 2020, 34330228, ['es', 'en'], [['Hora loca', 'Hora loca'], ['Animación', 'Hosting']], ['Llegamos con todo puesto: zancos, máscaras y collares.', 'We arrive ready: stilts, masks and necklaces.'], WK([12, 21], [10, 24], [10, 22])]],
    'barra-movil-tropical': [['Carla Jiménez', 'Dueña · bartender', 'Owner · bartender', 2022, 28386386, ['es', 'en'], [['Cócteles', 'Cocktails']], ['Te ayudo a calcular cuánto comprar para que no sobre.', 'I help you figure out how much to buy so nothing is wasted.'], WK([12, 20], [10, 24], [10, 22])], ['Anthony Reyes', 'Bartender', 'Bartender', 2023, 4560374, ['es', 'en'], [['Mojitos', 'Mojitos']], ['Rápido en la barra.', 'Fast at the bar.'], WK([16, 20], [10, 24], [10, 22])]],
  };
  const ABOUT = {
    'salon-imperial': ['Salón para 250 con mesas, sillas y pista incluidas. Te mostramos el calendario real.', 'Hall for 250 with tables, chairs and dance floor included. We show you the real calendar.', 2012],
    'suenos-de-quince': ['Quinces completos: vestido, coreografía, decoración y el día coordinado.', 'Full quinces: dress, choreography, décor and the day coordinated.', 2017],
    'hazleton-party-rentals': ['Mesas, sillas, carpas y brincolines con entrega y montaje.', 'Tables, chairs, tents and bounce houses with delivery and setup.', 2014],
    'dj-el-cibaeno': ['DJ de merengue y bachata para fiestas en todo el condado.', 'Merengue and bachata DJ for parties across the county.', 2015],
    'mariachi-real-hazleton': ['Mariachi de 7 músicos para serenatas y fiestas.', 'Seven-piece mariachi for serenades and parties.', 2010],
    'globos-y-mas': ['Arcos, fondos y mesas de dulces con tus colores.', 'Arches, backdrops and candy tables in your colors.', 2020],
    'momentos-foto-video': ['Fotos y video de quinces y bodas. Entrega en 2 semanas.', 'Quince and wedding photo and video. Delivered in 2 weeks.', 2016],
    'dulce-tentacion': ['Bizcocho dominicano por porción para cualquier celebración.', 'Dominican cake by the slice for any celebration.', 2018],
    'brincolines-la-alegria': ['Brincolines limpios, entregados y montados.', 'Clean bounce houses, delivered and set up.', 2021],
    'andrea-events': ['Organizo bodas y quinces de principio a fin.', 'I plan weddings and quinces start to finish.', 2014],
    'barra-movil-tropical': ['Barra móvil con bartenders. Tú traes la bebida.', 'Mobile bar with bartenders. You bring the drinks.', 2022],
    'fiestas-magicas': ['Cumpleaños y baby showers con personajes, magia y juegos.', 'Birthdays and baby showers with characters, magic and games.', 2019],
    'patio-en-grande': ['Convertimos tu patio en salón: carpa, pista, escenario, luz y baños.', 'We turn your backyard into a venue: tent, dance floor, stage, power and restrooms.', 2017],
    'hora-loca-tropical': ['Hora loca, cantante y animador para quinces, bodas y cumpleaños.', 'Hora loca, singer and host for quinces, weddings and birthdays.', 2020],
  };
  /* Reseñas: fecha = respetaron la fecha · hora = llegaron a la hora · tot = cobraron lo del paquete · foto = quedó como en las fotos · limp = recogieron */
  const RV = {
    'salon-imperial': [
      { n: 'Yokasta M.', lvl: 4, cnt: 23, d: 12, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'El quince de mi hija quedó precioso. Cobraron lo del paquete, ni un peso más.', en: 'My daughter’s quince was beautiful. They charged the package, not a cent more.', rep: ['Gracias, Yokasta.', 'Thanks, Yokasta.', 10], help: 18 },
      { n: 'Ramón A.', lvl: 6, cnt: 58, d: 40, st: 3, src: 'cita', fecha: 1, hora: 0, tot: 1, foto: 1, limp: 1, es: 'Abrieron 40 minutos tarde y los invitados esperaron afuera.', en: 'They opened 40 minutes late and guests waited outside.', rep: ['Ramón, tienes razón. Te devolvimos la hora extra.', 'Ramón, you are right. We refunded the extra hour.', 38], help: 12 }],
    'suenos-de-quince': [{ n: 'Anny V.', lvl: 4, cnt: 17, d: 20, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'Yamilet estuvo en todo. El vals salió perfecto.', en: 'Yamilet handled everything. The waltz was perfect.', help: 15 }],
    'hazleton-party-rentals': [{ n: 'Freddy D.', lvl: 7, cnt: 96, d: 6, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'Carpa, mesas y sillas montadas a las 10 como dijeron. Recogieron el lunes.', en: 'Tent, tables and chairs set by 10 as promised. Picked up Monday.', help: 9 }],
    'dj-el-cibaeno': [{ n: 'Mariela S.', lvl: 3, cnt: 9, d: 9, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'Puso a bailar hasta a mi abuela. Llegó una hora antes a montar.', en: 'Got even my grandma dancing. Arrived an hour early to set up.', help: 11 }],
    'globos-y-mas': [{ n: 'Carmen G.', lvl: 5, cnt: 41, d: 15, st: 4, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 0, limp: 1, es: 'Bonito, pero los colores no eran exactamente los de la foto.', en: 'Pretty, but the colors were not exactly like the photo.', rep: ['Carmen, faltó un tono. Te lo avisamos tarde; disculpa.', 'Carmen, we ran out of one shade and told you late; sorry.', 14], help: 7 }],
    'momentos-foto-video': [{ n: 'Wilfredo C.', lvl: 5, cnt: 34, d: 30, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'Fotos en 12 días. Paola sabe dónde ponerse.', en: 'Photos in 12 days. Paola knows where to stand.', help: 10 }],
    'dulce-tentacion': [{ n: 'Daisy T.', lvl: 1, cnt: 2, d: 5, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'El bizcocho como el de allá. Lo entregaron a tiempo.', en: 'Cake like back home. Delivered on time.', help: 13 }],
    'andrea-events': [{ n: 'Héctor B.', lvl: 2, cnt: 3, d: 25, st: 5, src: 'cita', fecha: 1, hora: 1, tot: 1, foto: 1, limp: 1, es: 'Andrea manejó a todos los proveedores. Yo solo disfruté.', en: 'Andrea handled every vendor. I just enjoyed it.', help: 8 }],
  };
  const STATS = { 'salon-imperial': { ver: 120, orders: 110, fecha: 100, hora: 88, tot: 97, foto: 95, limp: 96, trato: 95 }, 'suenos-de-quince': { ver: 70, orders: 60, fecha: 100, hora: 95, tot: 98, foto: 97, limp: 97, trato: 98 },
    'hazleton-party-rentals': { ver: 190, orders: 170, fecha: 99, hora: 93, tot: 98, foto: 96, limp: 95, trato: 95 }, 'dj-el-cibaeno': { ver: 100, orders: 90, fecha: 100, hora: 97, tot: 98, foto: 97, limp: 98, trato: 97 },
    'mariachi-real-hazleton': { ver: 70, orders: 60, fecha: 100, hora: 96, tot: 99, foto: 98, limp: 99, trato: 98 }, 'globos-y-mas': { ver: 90, orders: 80, fecha: 99, hora: 94, tot: 97, foto: 88, limp: 97, trato: 96 },
    'momentos-foto-video': { ver: 80, orders: 70, fecha: 100, hora: 97, tot: 99, foto: 96, limp: 99, trato: 98 }, 'dulce-tentacion': { ver: 160, orders: 150, fecha: 100, hora: 96, tot: 99, foto: 95, limp: 99, trato: 98 } };

  const PEOPLE0 = {}; Object.keys(STAFF).forEach(id => { PEOPLE0[id] = STAFF[id].map(p => ({ ph: p[4], langs: p[5], sp: p[6], bio: p[7], wk: p[8], cert: null, rate: '', dishes: [] })); });
  const CAT0 = { title: ['El equipo', 'The team'], rate: 0, next: 0, cert: 0, cta: 'booking' };
  const mk = (b, r, k) => ({ id: b.id + '-f' + k, name: r.n, lvl: r.lvl, cnt: r.cnt, d: r.d, stars: r.st, src: r.src, fecha: r.fecha, hora: r.hora, tot: r.tot, foto: r.foto, limp: r.limp, es: r.es, en: r.en, reply: r.rep || null, help: r.help || 0, ph: [], rec: [], topics: [] });
  function rev(b) { if (!b.n) return []; if (RV[b.id]) return RV[b.id].map((r, k) => mk(b, r, k)); const i = b.id.length;
    return [{ n: ['Yokasta M.', 'Luis R.', 'Ramón A.', 'Daisy T.'][i % 4], lvl: 3, cnt: 8, d: 6, st: 5, src: 'vis', fecha: 1, hora: 1, tot: 1, es: 'Llegaron el día y a la hora que dijeron.', en: 'They came on the day and at the time they said.', help: 3 }].map((r, k) => mk(b, r, k)); }
  const stats = b => STATS[b.id] || { ver: 0, orders: 0, fecha: 99, hora: 93, tot: 97, foto: 94, limp: 96, trato: 95 };
  function asp(b, st, es) { const E2 = (x, y) => es ? x : y;
    return [['dateFree', E2('RESPETARON LA FECHA', 'KEPT THE DATE'), st.fecha, 'rgba(0,229,196,.16)', '#00695B'], ['clock', E2('LLEGARON A LA HORA', 'ARRIVED ON TIME'), st.hora, 'rgba(255,176,32,.16)', '#8A5A00'],
      ['dollar', E2('COBRARON LO DEL PAQUETE', 'CHARGED THE PACKAGE PRICE'), st.tot, 'rgba(255,176,32,.16)', '#8A5A00'], ['image', E2('QUEDÓ COMO EN LAS FOTOS', 'LOOKED LIKE THE PHOTOS'), st.foto, 'rgba(75,55,245,.1)', '#4B37F5'],
      ['check', E2('RECOGIERON Y LIMPIARON', 'PICKED UP AND CLEANED'), st.limp, 'rgba(11,14,18,.06)', '#0B0E12'], ['heart', E2('TRATO', 'HOW THEY TREATED YOU'), st.trato, 'rgba(0,229,196,.16)', '#00695B']].map(([ic, k, v, bg, fg]) => ({ ic, k, v: v + '%', bg, fg })); }
  const aspNote = (b, st, es) => es ? 'De ' + st.orders + " fiestas reservadas en To'Latino en los últimos 12 meses." : 'From ' + st.orders + " To'Latino-booked parties in the last 12 months.";
  function facts(r, es) { const E2 = (x, y) => es ? x : y, G = '#00695B', R = '#C0392B', A = '#8A5A00', f = [];
    if (r.fecha === 1) f.push(['dateFree', E2('Respetaron la fecha', 'Kept the date'), G]); else if (r.fecha === 0) f.push(['dateFree', E2('Cancelaron la fecha', 'Cancelled the date'), R]);
    if (r.hora === 1) f.push(['clock', E2('A la hora', 'On time'), G]); else if (r.hora === 0) f.push(['clock', E2('Llegaron tarde', 'Arrived late'), A]);
    if (r.tot === 0) f.push(['dollar', E2('Cobraron más del paquete', 'Charged more than the package'), R]);
    if (r.foto === 0) f.push(['image', E2('No quedó como en las fotos', 'Did not look like the photos'), A]);
    return f; }
  function reg() { const X2 = window.TLListing, S2 = window.TLStaff, R2 = window.TLRev, A2 = window.TLAll; if (!X2 || !S2 || !A2) return;
    FI.B.forEach(b => { b.fiesta = 1; if (!A2.B.some(x => x.id === b.id)) A2.B.push(b); });
    if (!X2.ABOUT['salon-imperial']) { Object.keys(SVC).forEach(id => { X2.MENU[id] = SVC[id].map(([te, tn, its]) => [te, tn, its.map(it => [it.n, it.d, it.p || 0, 0, 0])]); }); Object.assign(X2.ABOUT, ABOUT); FI.B.forEach(b => { if (b.addr && !/alrededores/.test(b.addr)) X2.ADDR[b.id] = b.addr + ', Hazleton PA'; }); Object.keys(STAFF).forEach(id => { X2.STAFF[id] = STAFF[id].map(p => [p[0], p[1], p[2], p[3]]); }); }
    if (!S2.PEOPLE['salon-imperial']) { Object.keys(STAFF).forEach(id => { S2.PEOPLE[id] = PEOPLE0[id]; }); } S2.CAT.fiesta = CAT0;
    if (R2 && !R2._fiesta) { const f = R2.forBiz, st = R2.stats, tp = R2.top, tc = R2.topics; R2._fiesta = 1; R2.forBiz = (b, i) => b.fiesta ? rev(b) : f(b, i); R2.stats = b => b.fiesta ? stats(b) : st(b); R2.top = b => b.fiesta ? [] : tp(b); R2.topics = b => b.fiesta ? [] : tc(b); } }
  reg(); (window.TLReg = window.TLReg || []).push(reg);

  /* ---------- Tu fecha ---------- */
  const EVT = [['quince', 'Quinceañera', 'Quinceañera'], ['boda', 'Boda', 'Wedding'], ['cumple', 'Cumpleaños', 'Birthday'], ['baby', 'Baby shower', 'Baby shower'], ['bautizo', 'Bautizo', 'Baptism'], ['grad', 'Graduación', 'Graduation'], ['empresa', 'Empresa', 'Company']];
  const DATES = [2, 3, 9, 10, 16, 23, 30, 37];
  const GUESTS = [25, 50, 100, 150, 200, 300];
  const WHERE = [['salon', 'En un salón', 'At a venue'], ['casa', 'En mi casa o patio', 'At home or backyard'], ['nose', 'Aún no sé', 'Not sure yet']];
  const fevOf = s => s.fev || null;
  const freeOn = (b, i) => !(b.busy || []).includes(i);
  const nextFree = (b, from) => { const out = []; for (const i of [2, 3, 9, 10, 16, 17, 23, 24, 30, 31, 37]) { if (i >= (from || 0) && freeOn(b, i)) out.push(i); if (out.length >= 3) break; } return out; };
  const capOk = (b, g) => b.cap == null || !g || b.cap >= g;
  function availOf(b, fe, es) { const E2 = (a, c) => es ? a : c; if (!fe || fe.i == null) { const nx = nextFree(b, 2)[0]; return { ok: true, none: true, t: nx != null ? E2('Próxima fecha libre: ', 'Next free date: ') + dayL(nx, es) : E2('Pregunta por fechas', 'Ask for dates'), short: nx != null ? dayL(nx, es) : '—' }; }
    const f = freeOn(b, fe.i), cp = capOk(b, fe.g), alt = nextFree(b, 2).filter(i => i !== fe.i).slice(0, 2);
    if (f && cp) return { ok: true, t: E2('Libre el ', 'Free on ') + dayL(fe.i, es) + (b.cap && fe.g ? E2(' · caben tus ' + fe.g, ' · fits your ' + fe.g) : ''), short: E2('Libre', 'Free') };
    if (!cp) return { ok: false, t: E2('Caben hasta ' + b.cap + ' · tú esperas ' + fe.g, 'Fits up to ' + b.cap + ' · you expect ' + fe.g), short: E2('No caben', 'Too small') };
    return { ok: false, t: E2('Ocupada el ', 'Booked on ') + dayL(fe.i, es) + (alt.length ? E2(' · libre ', ' · free ') + alt.map(i => dayL(i, es)).join(E2(' y ', ' and ')) : ''), short: E2('Ocupada', 'Booked') }; }
  function openFecha(C, s) { const fe = fevOf(s) || {}; C.setState({ hcs: { fiesta: 1, mode: 'form', f: { e: fe.e || '', i: fe.i == null ? '' : fe.i, g: fe.g || '', w: fe.w || '' }, top: s.view === 'desktop' ? C.vTop() : 0 } }); }
  function fechaVals(C, s, es) { const q = s.hcs, E2 = (a, c) => es ? a : c, dk = s.view === 'desktop', f = q.f || {};
    const up = o => C.setState(z => ({ hcs: { ...z.hcs, f: { ...z.hcs.f, ...o } } }));
    const ch = (key, opts) => opts.map(o => ({ l: o[1], v: f[key] === o[0] ? 'selected' : 'filter', onClick: () => up({ [key]: f[key] === o[0] ? '' : o[0] }) }));
    const F = (k, o) => Object.assign({ k, isChips: true, isInput: false, chips: [], val: '', onChange: () => {}, ph: '', hasHint: false, hint: '', hasSuf: false, suf: '' }, o);
    const fields = [F(E2('¿QUÉ CELEBRAS?', 'WHAT ARE YOU CELEBRATING?'), { chips: ch('e', EVT.map(e => [e[0], es ? e[1] : e[2]])) }),
      F(E2('¿QUÉ DÍA?', 'WHICH DAY?'), { chips: ch('i', DATES.map(i => [i, dayL(i, es)])), hasHint: true, hint: E2('Te decimos en cada negocio si esa fecha está libre.', 'We tell you at each business if that date is free.') }),
      F(E2('¿CUÁNTOS INVITADOS?', 'HOW MANY GUESTS?'), { chips: ch('g', GUESTS.map(g => [g, g === 300 ? '300+' : String(g)])) }),
      F(E2('¿DÓNDE?', 'WHERE?'), { chips: ch('w', WHERE.map(w => [w[0], es ? w[1] : w[2]])) })];
    const can = f.i !== '' && f.i != null;
    return { open: !dk, dlg: dk, top: (q.top || 80) + 'px', onClose: () => C.setState({ hcs: null }), stop, isList: false, isForm: true, hasBack: false, onBack: () => {}, onAdd: () => {}, list: [], fields,
      note: LINE[es ? 0 : 1] + ' ' + E2('Guardar tu fecha no aparta nada: solo te muestra quién está libre.', 'Saving your date holds nothing: it only shows who is free.'),
      cta: E2('Ver quién está libre', 'See who is free'), dis: !can, onCta: () => { if (!can) return; C.setState({ fev: { e: f.e, i: +f.i, g: +f.g || 0, w: f.w }, hcs: null }); },
      lbl: { title: E2('Tu fecha', 'Your date'), sub: E2('Día, invitados y dónde. Cambia cuando quieras.', 'Day, guests and where. Change it any time.'), add: '' } }; }

  /* ---------- Precios y rótulos ---------- */
  const svcs = id => SVC[id] || [], flatOf = id => [].concat(...svcs(id).map(g => g[2]));
  const wkOf = id => { const b = biz(id); return [0, 1, 2, 3, 4, 5, 6].map(d => (b.closed || []).includes(d) ? null : d === 0 ? (b.sun || null) : d === 6 ? (b.sat || null) : b.hrs); };
  function priceFor(it, b, es) { const E2 = (a, c) => es ? a : c;
    if (it.k === 'visita') return { l: E2('Gratis', 'Free'), s: '', tot: 0 };
    if (it.k === 'hora') return { l: money(it.p) + E2('/hora', '/hr'), s: it.min ? E2('MÍNIMO ', 'MIN ') + it.min + ' H' : '', tot: it.p };
    if (it.k === 'unid') return { l: (it.p % 1 ? '$' + it.p.toFixed(2) : money(it.p)) + E2(' por ', ' per ') + it.u[es ? 0 : 1], s: '', tot: it.p };
    if (it.k === 'cotiza') return { l: E2('Desde ', 'From ') + money(it.p), s: E2('TOTAL POR ESCRITO', 'WRITTEN TOTAL'), tot: it.p };
    return { l: money(it.p), s: it.k === 'pack' ? E2('PAQUETE', 'PACKAGE') : '', tot: it.p }; }
  function metaOf(it, b, es) { const E2 = (a, c) => es ? a : c, a = [];
    if (it.k === 'pack' && it.h) a.push(it.h < 1 ? Math.round(it.h * 60) + ' MIN' : it.h + (it.h === 1 ? E2(' HORA', ' HOUR') : E2(' HORAS', ' HOURS'))); if (it.k === 'visita') a.push(E2('VISITA · 30 MIN', 'TOUR · 30 MIN'));
    if (it.cap) a.push(E2('HASTA ', 'UP TO ') + it.cap + E2(' INVITADOS', ' GUESTS')); if (it.mont) a.push(E2('MONTAJE INCLUIDO', 'SETUP INCLUDED'));
    return a.join(' · '); }
  const walkOnly = b => b.tags.includes('walk') && !b.tags.includes('cita') && !b.tags.includes('visita');
  const depOf = b => b.dep || 0;

  /* ---------- Ficha ---------- */
  const EMPTY_SH = { groups: [], adds: [], pros: [], people: [], lbl: {}, x: { veh: {}, inc: [], no: [] } };
  function listingAdd(C, s, es, b, V, setTab, E, t) {
    const E2 = (x, y) => es ? x : y, pro = !!b.pro, dk = s.view === 'desktop', tg = k => b.tags.includes(k), line = LINE[es ? 0 : 1], fe = fevOf(s), av = availOf(b, fe, es);
    const openSheet = key => e => { stop(e); C.setState({ ash: { biz: b.id, own: b.id, key, opt: {}, add: [], stf: 'any', fiesta: 1, qty: 1 }, bshTop: dk ? C.vTop() : 0 }); };
    const dirs = e => { stop(e); C.encargo('APP-MAPA', 'APP-NEG-LISTING · Fiestas · Cómo llegar', b.name, E2('Cómo llegar', 'Directions')); };
    const secs = svcs(b.id).map(([te, tn, its], si) => ({ title: (es ? te : tn).toUpperCase(), items: its.map((it, ii) => { const key = si + ':' + ii, P = priceFor(it, b, es), m = metaOf(it, b, es);
      return { name: es ? it.n : it.ne || it.n, desc: es ? it.d : it.de || it.d, bg: U(it.ph || b.ph[0], 200), meta: [m, P.s, fe && it.k !== 'visita' ? av.short.toUpperCase() + E2(' EL ', ' ON ') + dayL(fe.i, es).toUpperCase() : ''].filter(Boolean).join(' · '), price: P.l, sym: [], hasPre: false, preL: '', onPre: () => {},
        can: pro, cur: pro ? 'pointer' : 'default', onOpen: pro ? openSheet(key) : () => {}, onBook: openSheet(key), btnL: it.k === 'visita' ? E2('Pedir visita', 'Request tour') : 'Booking' }; }) }));
    const notes = [['dateFree', line + ' ' + E2('Cada negocio muestra su calendario real; el depósito aparta la fecha solo cuando confirman.', 'Each business shows its real calendar; the deposit holds the date only once they confirm.')]];
    if (depOf(b)) notes.push(['dollar', E2('Depósito de ' + money(depOf(b)) + ' para apartar: se cobra al enviar y se descuenta del total. Si no confirman, se devuelve completo.', money(depOf(b)) + ' deposit to hold: charged on sending and credited to the total. If they do not confirm, refunded in full.')]);
    if (tg('traslado') && b.zone) notes.push(['truck', E2('Van a tu lugar hasta ' + b.zone + ' millas de Hazleton.', 'They come to you up to ' + b.zone + ' miles from Hazleton.')]);
    if (tg('montaje')) notes.push(['check', E2('Montaje incluido: llegan antes y recogen al terminar.', 'Setup included: they arrive early and pick up after.')]);
    V.sv = { isChair: false, modes: [], bySvc: true, byPro: false, secs, pros: [], notes: pro ? notes.slice(0, 4).map(([icon, t2]) => ({ icon, t: t2 })) : [], hasMine: false, mine: {}, lbl: { page: '', book: 'Booking' } };
    V.sh = s.ash && s.ash.biz === b.id && s.ash.fiesta ? sheetVals(C, s, es, b) : EMPTY_SH;
    const oc = e => { stop(e); openFecha(C, s); };
    V.ax = { veh: fe ? { has: pro, ic: 'dateFree', k: E2('TU FECHA', 'YOUR DATE'), t: dayL(fe.i, es) + (fe.g ? ' · ' + fe.g + E2(' invitados', ' guests') : ''), hasS: false, s: '', hasP: false, p: '', hasOk: true, okT: av.t, okFg: av.ok ? '#00695B' : '#C0392B', okIc: av.ok ? 'check' : 'warning', cta: E2('Cambiar', 'Change'), onClick: oc }
        : { has: pro, ic: 'dateFree', k: E2('¿ESTÁ LIBRE TU FECHA?', 'IS YOUR DATE FREE?'), t: E2('Agrega tu fecha', 'Add your date'), hasS: false, s: '', hasP: true, p: av.t, hasOk: false, okT: '', okFg: '#00695B', okIc: 'check', cta: E2('Agregar', 'Add'), onClick: oc },
      sz: { has: false, chips: [] }, q: { has: false },
      line: { has: pro, t: line, s: E2('Aquí ves el calendario real, el precio del paquete y lo que incluye. El depósito se devuelve si no te confirman.', 'Here you see the real calendar, the package price and what it includes. The deposit is refunded if they do not confirm.') },
      how: { has: pro, t: line, steps: [E2('Agrega tu fecha: te decimos si está libre.', 'Add your date: we tell you if it is free.'), E2('Pides la fecha y pagas el depósito para apartarla.', 'Request the date and pay the deposit to hold it.'), E2('El negocio confirma por escrito. Si no puede, te devolvemos el depósito completo.', 'The business confirms in writing. If they cannot, the deposit is refunded in full.'), E2('El resto lo pagas como diga el acuerdo, nunca más de lo confirmado.', 'You pay the rest per the agreement, never more than confirmed.')].map((x, i) => ({ n: String(i + 1), t: x })) } };
    V.shop = { items: [], hold: '', hasChips: false, chips: [], empty: true, note: '' };
    V.hx = { gal: { has: false, items: [] } };
    const f0 = flatOf(b.id), c0 = f0.find(x => x.k === 'pack') || f0.find(x => x.k !== 'visita') || f0[0], cP = c0 ? priceFor(c0, b, es) : null;
    const TD = [[fe ? E2('TU FECHA', 'YOUR DATE') : E2('PRÓXIMA LIBRE', 'NEXT FREE'), fe ? av.short + ' · ' + dayL(fe.i, es) : av.short], [E2('DEPÓSITO', 'DEPOSIT'), depOf(b) ? money(depOf(b)) : E2('No pide', 'None')], b.cap ? [E2('INVITADOS', 'GUESTS'), E2('Hasta ', 'Up to ') + b.cap] : b.zone ? [E2('VA HASTA', 'TRAVELS'), b.zone + ' mi'] : [E2('DESDE', 'FROM'), cP ? cP.l : '—']];
    const AM = { paquete: ['party', 'Paquetes', 'Packages'], montaje: ['check', 'Montaje incluido', 'Setup included'], traslado: ['truck', 'Va a tu lugar', 'Comes to you'], visita: ['pin', 'Visita al salón', 'Venue tour'], esp: ['language', 'Atiende en español', 'Serves in Spanish'], finde: ['calendar', 'Fines de semana', 'Weekends'], noche: ['clock', 'Hasta tarde', 'Late nights'], ninos: ['smile', 'Para niños', 'For kids'] };
    const amen = b.tags.filter(k => AM[k]).map(k => ({ icon: AM[k][0], l: es ? AM[k][1] : AM[k][2] }));
    const facts = [{ icon: 'dateFree', k: E2('FECHAS LIBRES', 'FREE DATES'), v: nextFree(b, 2).map(i => dayL(i, es)).join(' · ') || '—' }, { icon: 'dollar', k: E2('DEPÓSITO', 'DEPOSIT'), v: depOf(b) ? money(depOf(b)) + E2(' · se devuelve si no confirman', ' · refunded if not confirmed') : E2('No pide', 'None') },
      { icon: 'language', k: E2('IDIOMAS', 'LANGUAGES'), v: tg('esp') ? 'Español · English' : 'English' }, { icon: 'card', k: E2('PAGO', 'PAYMENT'), v: E2('Depósito con tarjeta · el resto como diga el acuerdo', 'Deposit by card · the rest per the agreement') }].map((f, i) => Object.assign(f, { bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }));
    const fq = s.faqOpen, FQ = [[E2('¿Está libre mi fecha?', 'Is my date free?'), E2('Agrega tu fecha arriba y te lo decimos. Próximas libres: ', 'Add your date above and we tell you. Next free: ') + (nextFree(b, 2).map(i => dayL(i, es)).join(', ') || '—') + '.'],
      [E2('¿Qué pasa con el depósito?', 'What about the deposit?'), depOf(b) ? E2('Se cobra al enviar la solicitud y se descuenta del total. Si no confirman o proponen otra fecha que no aceptas, se devuelve completo. Si cancelas después de confirmar, depende de la política del negocio.', 'Charged when you send the request and credited to the total. If they do not confirm or propose another date you decline, refunded in full. If you cancel after confirming, it depends on the business policy.') : E2('No pide depósito.', 'No deposit.')],
      [E2('¿Qué incluye el paquete?', 'What does the package include?'), E2('Cada paquete dice lo que incluye y lo que no. Lo que no está escrito, no está incluido.', 'Each package lists what is and is not included. If it is not written, it is not included.')],
      [E2('¿Y si llueve?', 'What if it rains?'), tg('montaje') ? E2('Te llaman el día antes para cambiar el plan sin costo.', 'They call the day before to change plans at no cost.') : E2('Pregúntalo al pedir la fecha.', 'Ask when requesting the date.')]];
    const toSvc = () => { setTab('svc'); C.scrollTop(); };
    Object.assign(V, { cta: walkOnly(b) ? E2('Cómo llegar', 'Directions') : pro ? 'Booking' : t.call, ctaIcon: walkOnly(b) ? 'pin' : pro ? 'calendar' : 'phone', onCta: walkOnly(b) ? dirs : pro ? toSvc : E('APP-NEG-CONTACTO', 'Llamar', 'Contactar al negocio'),
      goMenu: toSvc, isSvc: V.tab === 'svc', isShop: false, isMenu: false, notMenu: true, mBar: false, fromBar: true, railOrder: false,
      itemsTop: [].concat(...secs.map(x => x.items)).slice(0, pro ? 4 : 5).map(it => ({ name: it.name, desc: it.meta ? it.meta.charAt(0) + it.meta.slice(1).toLowerCase() : '', price: it.price })),
      amen, facts, faq: pro ? FQ.map(([q, a], i) => ({ q, a, open: fq === i, chev: fq === i ? '180deg' : '0deg', onToggle: () => C.setState({ faqOpen: fq === i ? null : i }) })) : [],
      fromLabel: !pro ? (walkOnly(b) ? E2('Ve directo a la tienda', 'Walk in') : E2('Llama para tu fecha', 'Call about your date')) : cP ? E2('Desde ', 'From ') + cP.l : V.fromLabel, barSub: pro ? (TD[0][0] + ' · ' + TD[0][1]).toUpperCase() : b.zone && !walkOnly(b) ? E2('VA HASTA ', 'TRAVELS ') + b.zone + ' MI' : E2('HOY HASTA LAS ', 'TODAY UNTIL ') + fmt((b.hrs || [9, 17])[1]), svc: [], hasSvc: false,
      railNote: pro ? E2(line + ' Pides la fecha aquí; el negocio confirma por escrito.', line + ' Request the date here; the business confirms in writing.') : E2(line + ' Llama para preguntar por tu fecha.', line + ' Call to ask about your date.'),
      lbl: { ...V.lbl, items: E2('Servicios', 'Services'), menuAll: E2('Ver servicios', 'See services') } });
    V.bkRail = { has: pro, rows: TD.map(([k, x]) => ({ k, v: x })), note: V.railNote, hasMine: false, mine: {} };
    V.silla = { has: false };
    const m = window.TLFiestaFlow && window.TLFiestaFlow.mineCard(C, s, es, b); if (m) { V.sv.hasMine = true; V.sv.mine = m; V.bkRail.hasMine = true; V.bkRail.mine = m; }
  }
  function sheetVals(C, s, es, b) { const E2 = (x, y) => es ? x : y, q = s.ash, dk = s.view === 'desktop', [si, ii] = String(q.key).split(':').map(Number), sec = svcs(b.id)[si], it = sec && sec[2][ii]; if (!it) return EMPTY_SH;
    const P = priceFor(it, b, es), fe = fevOf(s), av = availOf(b, fe, es), dep = depOf(b);
    const go = () => { C.setState({ ash: null }); if (window.TLFiestaFlow) return window.TLFiestaFlow.start(C, { biz: b.id, own: b.id, key: q.key }); C.encargo('APP-NEG-FIESTA-BOOKING', 'APP-NEG-LISTING-PRO · Servicios · ' + (es ? it.n : it.ne), b.name + ' · ' + (es ? it.n : it.ne), E2('Booking · Fiestas', 'Booking · Parties')); };
    const veh = { ic: 'dateFree', k: fe ? E2('TU FECHA', 'YOUR DATE') : E2('¿ESTÁ LIBRE TU FECHA?', 'IS YOUR DATE FREE?'), t: fe ? dayL(fe.i, es) + (fe.g ? ' · ' + fe.g + E2(' invitados', ' guests') : '') : E2('Agrégala y te decimos', 'Add it and we tell you'), s: '', hasOk: true, okT: av.t, okFg: av.ok ? '#00695B' : '#C0392B', okIc: av.ok ? 'check' : 'warning', cta: fe ? E2('Cambiar', 'Change') : E2('Agregar', 'Add'), onClick: e => { stop(e); openFecha(C, s); } };
    const inc = (it.inc || []).map(z => ({ t: z[es ? 0 : 1] }));
    const payT = it.k === 'visita' ? E2('La visita es gratis y no aparta la fecha.', 'The tour is free and does not hold the date.') : dep ? E2('Hoy pagas el depósito de ' + money(dep) + ' para apartar la fecha; se descuenta del total. Si no confirman, se devuelve completo.', 'Today you pay the ' + money(dep) + ' deposit to hold the date; credited to the total. If they do not confirm, refunded in full.') : E2('No pide depósito. Pagas como diga el acuerdo.', 'No deposit. You pay per the agreement.');
    return { open: !dk, dlg: dk, top: (s.bshTop || 80) + 'px', onClose: () => C.setState({ ash: null }), stop, name: es ? it.n : it.ne, desc: es ? it.d : it.de, bg: U(it.ph || b.ph[0], 700), price: P.l, meta: metaOf(it, b, es),
      groups: [], adds: [], hasAdds: false, hasWho: false, isPick: false, isStaff: false, pros: [], people: [], stf: 'any', onStf: () => {},
      whoPend: false, whoDone: false, whoMeta: '', hasDep: true, depT: payT + ' ' + LINE[es ? 0 : 1], total: P.l,
      durL: P.s || E2('PRECIO', 'PRICE'), cta: it.k === 'visita' ? E2('Pedir visita', 'Request tour') : fe && !av.ok ? E2('Ver otra fecha', 'Pick another date') : E2('Pedir la fecha', 'Request the date'), dis: false, onGo: fe && !av.ok && it.k !== 'visita' ? () => { C.setState({ ash: null }); openFecha(C, s); } : go,
      lbl: { req: '', ready: '', adds: '', addsM: '', who: '', any: '', incK: E2('INCLUYE', 'INCLUDES'), noK: E2('IMPORTANTE', 'IMPORTANT') },
      x: { hasPre: false, preT: '', preS: '', preCta: '', onPre: () => {}, hasVeh: true, veh, hasInc: inc.length > 0, inc, hasNo: false, no: [] } }; }
  function resAdd(C, s, es, b, v, td, trust) { const E2 = (x, y) => es ? x : y, tg = k => b.tags.includes(k), fe = fevOf(s), av = availOf(b, fe, es);
    if (!b.pro) { const wo = walkOnly(b); Object.assign(td, { s: wo ? E2('Tienda: ve directo, no hace falta cita.', 'Store: just walk in, no appointment needed.') : E2('No toma reservas en To\'Latino: llama para preguntar por tu fecha.', 'No To\'Latino bookings: call to ask about your date.') + ' ' + LINE[es ? 0 : 1], cols: [b.cap ? [E2('INVITADOS', 'GUESTS'), E2('Hasta ', 'Up to ') + b.cap] : b.zone && !wo ? [E2('VA HASTA', 'TRAVELS'), b.zone + ' mi'] : null, [E2('IDIOMA', 'LANGUAGE'), tg('esp') ? E2('Español', 'Spanish') : 'English'], [E2('HOY HASTA', 'TODAY UNTIL'), fmt((b.hrs || [9, 17])[1])]].filter(Boolean).map(([k, x]) => ({ k, v: x })), hasNo: false, hasLink: false, hasFoot: false }); return; }
    const f0 = flatOf(b.id), c0 = f0.find(x => x.k === 'pack') || f0.find(x => x.k !== 'visita') || f0[0], cP = c0 ? priceFor(c0, b, es) : null;
    Object.assign(td, { s: E2('Pides la fecha aquí y apartas con depósito; el negocio confirma por escrito. ', 'Request the date here and hold it with a deposit; the business confirms in writing. ') + LINE[es ? 0 : 1],
      cols: [[fe ? E2('TU FECHA', 'YOUR DATE') : E2('PRÓXIMA LIBRE', 'NEXT FREE'), fe ? av.short : av.short], [E2('DEPÓSITO', 'DEPOSIT'), depOf(b) ? money(depOf(b)) : E2('No pide', 'None')], [E2('DESDE', 'FROM'), cP ? cP.l : '—']].map(([k, x]) => ({ k, v: x })), hasNo: false, hasLink: false, hasFoot: false });
    const mk = (ic, label, tone) => ({ ic, t: label, fg: tone === 'ok' ? '#00695B' : '#4B37F5', icon: ic, label, tone });
    const T = [trust[0], mk('dateFree', E2('Calendario al día', 'Calendar up to date'), 'ok'), b.cap ? mk('users', E2('Hasta ' + b.cap + ' invitados', 'Up to ' + b.cap + ' guests'), 'info') : tg('traslado') && b.zone ? mk('truck', E2('Va hasta ' + b.zone + ' millas', 'Travels ' + b.zone + ' miles'), 'info') : null, trust.find(x => x.icon === 'star')].filter(Boolean); trust.splice(0, trust.length, ...T); }
  window.TLFiestaL = { SVC, STAFF, RV, rev, stats, asp, aspNote, facts, listingAdd, sheetVals, resAdd, priceFor, metaOf, wkOf, svcs, flatOf, walkOnly, depOf, availOf, nextFree, freeOn, fevOf, openFecha, fechaVals, dayL, EVT, DATES, GUESTS, WHERE, PEOPLE0 };
})();
