/* Comunidad (APP-COM · APP-GAM · APP-PATIO) — datos de ejemplo de Hazleton, PA. Fotos: Pexels (reales).
   Solo lo carga "To'Latino Comunidad.dc.html" (carga diferida: no pesa en el arranque del prototipo).
   Hoy = jue 24 sep 2026, 12:30 PM. h = horas atrás. Pares [es, en]. */
(function () {
  const IMG = (id, w) => typeof id === 'string' && /^(data:|https?:|blob:)/.test(id) ? id : 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&w=' + (w || 320);
  const RANKS = [
    ['Recluta', 'Recruit', 'Verificaste tu teléfono', 'You verified your phone', 'Publicar, comentar y votar', 'Post, comment and vote'],
    ['Vecino', 'Neighbor', 'Una publicación con 5 votos +', 'One post with 5 upvotes', 'Insignia de vecino y perfil completo', 'Neighbor badge and full profile'],
    ['Cabo', 'Corporal', '5 comentarios con votos +', '5 comments with upvotes', 'Crear encuestas', 'Create polls'],
    ['Sargento', 'Sergeant', '3 recomendaciones de negocio con votos', '3 business recommendations with votes', 'Tu rango se ve en tus comentarios', 'Your rank shows on your comments'],
    ['Sargento Mayor', 'Sergeant Major', '4 semanas activas seguidas', '4 active weeks in a row', 'Destacar 1 recomendación al mes', 'Feature 1 recommendation a month'],
    ['Teniente', 'Lieutenant', 'Aportes constantes y 3 reseñas verificadas', 'Steady help and 3 verified reviews', 'Mesas privadas en El Patio', 'Private tables in El Patio'],
    ['Capitán', 'Captain', 'Vecinos que invitaste y participan', 'Neighbors you invited who take part', 'Abrir torneos del barrio', 'Open neighborhood tournaments'],
    ['Comandante', 'Commander', 'Historial limpio y muchos votos', 'Clean record and many votes', 'Tus reportes se revisan primero', 'Your reports are reviewed first'],
    ['Coronel', 'Colonel', 'Por invitación del equipo', 'By team invitation', 'Moderación local', 'Local moderation'],
    ['General del Barrio', 'Neighborhood General', 'Top de la ciudad · 3 plazas', 'Top of the city · 3 seats', 'Voz en las decisiones de la ciudad', 'A say in city decisions'],
  ];
  const PTS = [
    ['Voto + en tu publicación', 'Upvote on your post', '+2'],
    ['Voto + en tu comentario', 'Upvote on your comment', '+1'],
    ['"Yo también" en tu recomendación', '"Me too" on your recommendation', '+3'],
    ['Quien preguntó marca "Me sirvió"', 'The asker marks "Helped me"', '+10'],
    ['Reseña verificada de un negocio', 'Verified business review', '+15'],
    ['Primera recomendación de un negocio, con 3 votos', 'First recommendation of a business, with 3 votes', '+50'],
  ];
  const PTS_RULES = [
    ['Máximo 100 puntos al día.', 'Up to 100 points a day.'],
    ['Estar conectado, seguir o tener seguidores no da puntos.', 'Being online, following or having followers earns nothing.'],
    ['Un voto − baja el orden de la publicación, no tu rango.', 'A downvote lowers the post, not your rank.'],
    ['Si algo se borra por las reglas, se restan sus puntos.', 'If something is removed for breaking the rules, its points go too.'],
  ];
  const RULES = [
    ['Habla de Hazleton y de lo que pasa aquí.', 'Talk about Hazleton and what happens here.'],
    ['Recomienda por experiencia, nunca tu propio negocio. Tu negocio publica en sus Novedades.', 'Recommend from experience, never your own business. Your business posts in its Updates.'],
    ['Nada de ventas, rifas ni cadenas.', 'No sales, raffles or chain messages.'],
    ['No publiques teléfonos, direcciones ni fotos de otras personas sin su permiso.', "Don't post other people's phones, addresses or photos without permission."],
    ['Respeto siempre: sin insultos ni acoso.', 'Respect always: no insults or harassment.'],
    ['Una emergencia no se pregunta aquí: llama al 911.', "An emergency isn't asked here: call 911."],
  ];
  const REP = [
    ['spam', 'Venta, spam o cadena', 'Sales, spam or chain message'],
    ['priv', 'Datos de otra persona', "Someone else's personal info"],
    ['acoso', 'Insulto o acoso', 'Insult or harassment'],
    ['falso', 'Información falsa', 'False information'],
    ['propio', 'Se recomienda a sí mismo', 'Self-promotion'],
    ['otro', 'Otra cosa', 'Something else'],
  ];
  const TEMAS = [['comida', 'Comida', 'Food'], ['belleza', 'Belleza', 'Beauty'], ['autos', 'Autos', 'Cars'], ['hogar', 'Hogar', 'Home'], ['salud', 'Salud', 'Health'], ['tramites', 'Trámites', 'Paperwork'], ['fiestas', 'Fiestas', 'Parties'], ['ninos', 'Niños', 'Kids'], ['otro', 'Otro', 'Other']];
  /* Vecinos. rk = rango 1–10 · ph = foto · since = en Hazleton desde · z = zona · fme = te sigue · pts = puntos totales · mo = este mes */
  const U = {
    tl: { n: "To'Latino Hazleton", s: "To'Latino Hazleton", off: 1, z: ['CUENTA OFICIAL', 'OFFICIAL ACCOUNT'], bio: ['La cuenta de la ciudad: pregunta de la semana, encuestas y avisos.', 'The city account: question of the week, polls and notices.'] },
    ramon: { n: 'Ramón Peralta', s: 'Ramón P.', nick: 'Don Ramón', rk: 10, ph: 13430312, since: 1995, fund: 1, z: ['NORTH END', 'NORTH END'], pts: 9820, mo: 486, bio: ['Jubilado de la fábrica. Si hay un aviso de la ciudad, lo pongo aquí primero.', 'Retired from the plant. If the city posts a notice, I put it here first.'], bdg: ['fund', 'avisos', 'mejor'] },
    alta: { n: 'Altagracia Núñez', s: 'Altagracia N.', nick: 'Doña Alta', rk: 9, ph: 13430313, since: 1998, fund: 1, z: ['DOWNTOWN', 'DOWNTOWN'], pts: 6140, mo: 398, bio: ['Costurera de toda la vida. Moderadora del barrio: si algo no va, me avisas.', 'Seamstress all my life. Neighborhood moderator: if something is off, tell me.'], bdg: ['fund', 'mod', 'mejor'] },
    carmen: { n: 'Carmen Ureña', s: 'Carmen U.', rk: 7, ph: 20454135, since: 2003, fund: 1, z: ['SOUTH SIDE', 'SOUTH SIDE'], pts: 3510, mo: 301, bio: ['Organizo el dominó del parque los sábados. En El Patio me encuentras siempre.', 'I run Saturday dominoes at the park. You always find me in El Patio.'], bdg: ['fund', 'campeona', 'patio'] },
    yami: { n: 'Yamileth Reyes', s: 'Yamileth R.', nick: 'Yami', rk: 6, ph: 16160871, since: 2014, fund: 1, z: ['HEIGHTS', 'HEIGHTS'], pts: 2840, mo: 412, bio: ['Mamá de dos, enfermera de noche. Pregunto todo antes de gastar.', 'Mom of two, night nurse. I ask before I spend.'], bdg: ['fund', 'mejor'] },
    mily: { n: 'Milagros Santos', s: 'Milagros S.', nick: 'Mily', rk: 6, ph: 14566062, since: 2016, z: ['EAST END', 'EAST END'], pts: 2410, mo: 355, bio: ['Cocino los domingos y pruebo todo lo nuevo que abre.', 'I cook on Sundays and try everything new that opens.'], bdg: ['rec50'] },
    luz: { n: 'Luz María Taveras', s: 'Luz María T.', rk: 5, ph: 13975904, since: 2009, z: ['DOWNTOWN', 'DOWNTOWN'], pts: 1690, mo: 288, bio: ['Trabajo en la clínica. Si preguntas por salud, te digo a dónde ir sin seguro.', 'I work at the clinic. Ask about health and I tell you where to go without insurance.'], bdg: ['mejor'] },
    marisol: { n: 'Marisol Gómez', s: 'Marisol G.', rk: 4, ph: 7665704, since: 2018, fme: 1, z: ['HEIGHTS', 'HEIGHTS'], pts: 910, mo: 197, bio: ['Peluquera. Cuando alguien nuevo llega al barrio, le escribo.', 'Hairdresser. When someone new arrives, I write to them.'], bdg: [] },
    hector: { n: 'Héctor Vargas', s: 'Héctor V.', rk: 4, ph: 16160952, since: 2011, z: ['HAZLE TWP', 'HAZLE TWP'], pts: 1020, mo: 240, bio: ['Boricua en Hazleton. Arreglo lo que puedo y recomiendo al que sabe.', 'Puerto Rican in Hazleton. I fix what I can and recommend who knows.'], bdg: [] },
    kelvin: { n: 'Kelvin Almonte', s: 'Kelvin A.', rk: 3, ph: 6102841, since: 2019, z: ['NORTH END', 'NORTH END'], pts: 420, mo: 131, bio: ['Almacén de día, papá a tiempo completo.', 'Warehouse by day, full-time dad.'], bdg: [] },
    frank: { n: 'Frank Liriano', s: 'Frank L.', rk: 3, ph: 9159678, since: 2020, z: ['WEST HAZLETON', 'WEST HAZLETON'], pts: 380, mo: 156, bio: ['Mecánico de afición. Pregúntame antes de ir al taller.', 'Hobby mechanic. Ask me before you go to the shop.'], bdg: [] },
    anthony: { n: 'Anthony Pichardo', s: 'Anthony P.', rk: 3, ph: 29881401, since: 2021, z: ['SOUTH SIDE', 'SOUTH SIDE'], pts: 350, mo: 118, bio: ['Estudio en LCCC. Juego dominó mejor que mi abuelo.', 'I study at LCCC. I play dominoes better than my grandpa.'], bdg: [] },
    cheo: { n: 'José Batista', s: 'José B.', nick: 'Cheo', rk: 2, ph: 11579595, since: 2007, z: ['EAST END', 'EAST END'], pts: 190, mo: 90, bio: ['Chofer de guagua escolar. Conozco todas las calles.', 'School bus driver. I know every street.'], bdg: [] },
    rosa: { n: 'Rosa Jiménez', s: 'Rosa J.', nick: 'Doña Rosa', rk: 2, ph: 29889352, since: 2001, z: ['ALTER ST', 'ALTER ST'], pts: 140, mo: 64, bio: ['Abuela de seis. Voy a misa en San Gabriel.', "Grandma of six. I go to Mass at St. Gabriel's."], bdg: [] },
    gaby: { n: 'Gabriela Morales', s: 'Gabriela M.', nick: 'Gaby', rk: 2, ph: 20045343, since: 2022, z: ['DIAMOND AVE', 'DIAMOND AVE'], pts: 110, mo: 41, bio: ['Mexicana, recién llegada con mi niña.', 'From Mexico, newly arrived with my little girl.'], bdg: [] },
    danny: { n: 'Danny Cruz', s: 'Danny C.', rk: 1, ph: 1681010, city: 'Allentown, PA', since: 2026, z: ['ALLENTOWN, PA', 'ALLENTOWN, PA'], pts: 10, mo: 10, bio: ['Me mudo a Hazleton en noviembre.', "I'm moving to Hazleton in November."], bdg: [] },
  };
  const BDG = {
    fund: ['Fundador de Hazleton', 'Hazleton Founder', 'Entre los primeros 500 vecinos', 'Among the first 500 neighbors'],
    mejor: ['Mejor respuesta ×10', 'Top answer ×10', '10 respuestas marcadas "Me sirvió"', '10 answers marked "Helped me"'],
    avisos: ['Avisos de la ciudad', 'City notices', 'Sus avisos ayudaron a más de 1,000 vecinos', 'Notices that helped 1,000+ neighbors'],
    mod: ['Moderadora local', 'Local moderator', 'Por invitación del equipo', 'By team invitation'],
    campeona: ['Campeona de dominó', 'Dominoes champion', 'Copa de agosto', 'August cup'],
    patio: ['100 partidas', '100 games', 'En El Patio', 'In El Patio'],
    rec50: ['50 recomendaciones votadas', '50 voted recommendations', 'Sus recomendaciones ayudan', 'Her recommendations help'],
  };
  /* Negocios que se mencionan (id del prototipo): [nombre, rubro es, rubro en, ★, reseñas, mi, foto, pro, verificado] */
  const BZ = {
    'sabor-dominicano': ['Sabor Dominicano', 'COMIDA DOMINICANA', 'DOMINICAN FOOD', 4.8, 212, 0.3, 39122376, 1, 1],
    'panaderia-la-espiga': ['Panadería La Espiga', 'PANADERÍA', 'BAKERY', 4.9, 301, 0.7, 35993723, 1, 1],
    'cafe-quisqueya': ['Café Quisqueya', 'CAFETERÍA', 'CAFÉ', 4.8, 120, 0.4, 19252265, 1, 1],
    'empanadas-dona-tere': ['Empanadas Doña Tere', 'EMPANADAS', 'EMPANADAS', 4.9, 64, 1.1, 36905236, 1, 1],
    'dulces-mama-yoli': ['Dulces de Mamá Yoli', 'REPOSTERÍA', 'CAKES', 4.9, 22, 1.4, 37228442, 0, 0],
    'barberia-el-primo': ['Barbería El Primo', 'BARBERÍA', 'BARBERSHOP', 4.9, 176, 0.4, 4969842, 1, 1],
    'salon-glamour': ['Salón Glamour Dominicano', 'SALÓN DE BELLEZA', 'HAIR SALON', 4.8, 143, 0.7, 7195805, 1, 1],
    'junior-a-domicilio': ['Junior Barbero a Domicilio', 'BARBERO A DOMICILIO', 'MOBILE BARBER', 4.8, 37, 0, 19140178, 1, 0],
    'pequenos-cortes': ['Pequeños Cortes Kids', 'CORTES PARA NIÑOS', 'KIDS CUTS', 4.7, 44, 1.3, 7697358, 1, 1],
    'taller-hermanos-pena': ['Taller Hermanos Peña', 'MECÁNICO', 'MECHANIC', 4.8, 211, 0.6, 33814734, 1, 1],
    'frenos-jimenez': ['Frenos y Alineación Jiménez', 'FRENOS', 'BRAKES', 4.9, 88, 1.7, 34277926, 1, 1],
    'quisqueya-auto-repair': ['Quisqueya Auto Repair', 'TRANSMISIÓN', 'TRANSMISSION', 4.7, 164, 1.1, 4116170, 1, 1],
    'llantera-el-cibao': ['Llantera El Cibao', 'LLANTAS', 'TIRES', 4.8, 256, 1.4, 3807167, 1, 1],
    'plomeria-rodriguez': ['Plomería Rodríguez 24/7', 'PLOMERÍA', 'PLUMBING', 4.7, 241, 1.2, 29226620, 1, 1],
    'cesped-nieve-los-primos': ['Césped y Nieve Los Primos', 'REMOCIÓN DE NIEVE', 'SNOW REMOVAL', 4.5, 24, 2.1, 37554739, 0, 0],
    'clinica-esperanza': ['Clínica Comunitaria Esperanza', 'CLÍNICA DE BAJO COSTO', 'LOW-COST CLINIC', 4.7, 318, 0.3, 6129444, 1, 1],
    'pediatria-los-pinos': ['Pediatría Los Pinos', 'PEDIATRÍA', 'PEDIATRICS', 4.9, 176, 0.9, 39192346, 1, 1],
    'dental-sonrisa': ['Dental Sonrisa Hazleton', 'DENTISTA', 'DENTIST', 4.7, 233, 0.6, 6627325, 1, 1],
    'sastreria-don-julio': ['Sastrería Don Julio', 'SASTRERÍA', 'TAILOR', 4.9, 34, 0.4, 36883230, 0, 0],
    'lavanderia-burbujas': ['Lavandería Burbujas', 'LAVANDERÍA', 'LAUNDROMAT', 4.4, 57, 0.6, 4700400, 0, 0],
  };
  const c = (id, u, h, es, en, up, o) => Object.assign({ id, u, h, es, en, up, dn: 0 }, o || {});
  /* Publicaciones. k: q pregunta · r recomendación · e encuesta · p post. mi = millas de ti. */
  const POSTS = [
    { id: 'tl-sastre', k: 'q', u: 'tl', h: 50, mi: 0, pin: 1, tema: 'otro', up: 64, dn: 1,
      es: 'Pregunta de la semana: ¿quién conoce un buen sastre en Hazleton? Cuéntanos a quién vas y qué te arregló.',
      en: 'Question of the week: who knows a good tailor in Hazleton? Tell us who you go to and what they fixed.',
      cm: [c('ts1', 'alta', 44, 'Don Julio, en la Wyoming. Me subió el ruedo de tres pantalones en un día y me cobró $8 cada uno. Solo efectivo.', 'Don Julio, on Wyoming. He hemmed three pairs of pants in a day for $8 each. Cash only.', 23, { biz: 'sastreria-don-julio', rp: [
          c('ts1a', 'cheo', 40, 'Confirmo. Y te deja el traje como nuevo.', 'I confirm. He leaves your suit like new.', 6),
          c('ts1b', 'gaby', 20, '¿Hace vestidos de quince?', 'Does he do quinceañera dresses?', 1),
          c('ts1c', 'alta', 18, '@Gaby Sí, Don Julio los hace. Pídeselo con un mes de tiempo.', '@Gaby Yes, Don Julio makes them. Give him a month.', 4, { re: 'ts1b', biz: 'sastreria-don-julio' })] }),
        c('ts2', 'hector', 30, 'Yo también voy donde Don Julio. Me arregló el traje de la boda de mi hija en dos días.', 'I go to Don Julio too. He fixed my suit for my daughter\'s wedding in two days.', 9),
        c('ts3', 'luz', 26, 'Para cosas sencillas, la Lavandería Burbujas hace ruedos y cremalleras mientras lavas.', 'For simple things, Lavandería Burbujas does hems and zippers while you do laundry.', 7, { biz: 'lavanderia-burbujas' }),
        c('ts4', 'mily', 12, '¿Alguien sabe quién hace uniformes para un equipo de pelota?', 'Anyone know who makes uniforms for a baseball team?', 2)] },
    { id: 'q-mecanico', k: 'q', u: 'yami', h: 2, mi: 0.8, tema: 'autos', up: 42, dn: 0,
      es: '¿Alguien conoce un mecánico honesto por aquí? El carro hace un ruido raro cuando freno y no quiero que me cobren de más.',
      en: "Does anyone know an honest mechanic around here? My car makes a weird noise when I brake and I don't want to be overcharged.",
      cm: [c('qm1', 'ramon', 1.5, 'Taller Hermanos Peña, en la 9. Te mandan el estimado a la app y no tocan nada sin tu OK. Rafael me enseñó las pastillas viejas.', 'Taller Hermanos Peña, on 9th. They send the estimate to the app and touch nothing without your OK. Rafael showed me the old pads.', 14, { biz: 'taller-hermanos-pena', rp: [c('qm1a', 'yami', 1, 'Gracias, Don Ramón. Voy mañana temprano.', 'Thanks, Don Ramón. Going tomorrow morning.', 3)] }),
        c('qm2', 'frank', 1.2, 'Si es solo de frenos, Jiménez. El precio que te dicen es el que pagas.', "If it's just brakes, Jiménez. The price they quote is what you pay.", 9, { biz: 'frenos-jimenez' }),
        c('qm3', 'kelvin', 1, 'Yo fui a Quisqueya Auto Repair por la transmisión y bien.', 'I went to Quisqueya Auto Repair for the transmission and it went fine.', 3, { biz: 'quisqueya-auto-repair' }),
        c('qm4', 'anthony', 0.5, 'Revisa que no sea una goma. A mí me pasó igual.', 'Check it is not a tire. Same thing happened to me.', 2)] },
    { id: 'p-agua', k: 'p', u: 'ramon', h: 1, mi: 0.4, up: 67, dn: 0,
      es: 'Aviso: mañana viernes cortan el agua en la Wyoming St, de la 7 a la 9, de 9 AM a 12 PM por una reparación. Llenen sus galones esta noche.',
      en: 'Notice: tomorrow, Friday, water is off on Wyoming St, from 7th to 9th, 9 AM to 12 PM for a repair. Fill your jugs tonight.',
      cm: [c('pa1', 'marisol', 0.8, 'Gracias, Don Ramón. ¿Sabe si llega hasta la Laurel?', 'Thanks, Don Ramón. Do you know if it reaches Laurel?', 4, { rp: [c('pa1a', 'ramon', 0.6, 'Según el aviso de la ciudad, no. Solo de la 7 a la 9.', 'According to the city notice, no. Only 7th to 9th.', 6)] })] },
    { id: 'r-espiga', k: 'r', u: 'luz', h: 4, mi: 0.7, biz: 'panaderia-la-espiga', para: ['Pan de agua', 'Pan de agua'], up: 41, dn: 1,
      es: 'El pan de agua sale caliente a las 7. Llegué 7:10 y ya había fila, pero vale la pena. Si llamas antes, te lo guardan.',
      en: 'The pan de agua comes out hot at 7. I got there at 7:10 and there was a line, but it is worth it. Call ahead and they hold it for you.',
      cm: [c('re1', 'cheo', 3, 'Y el bizcocho por libra también. El de piña.', 'The cake by the pound too. The pineapple one.', 8), c('re2', 'rosa', 2, 'Yo voy todos los domingos después de misa.', 'I go every Sunday after Mass.', 3)] },
    { id: 'e-festival', k: 'e', u: 'tl', h: 20, mi: 0, left: 52, up: 38, dn: 0,
      es: 'Encuesta de la semana: ¿qué quieres más en el Festival Dominicano del 12 de octubre?',
      en: 'Poll of the week: what do you want most at the October 12 Dominican Festival?',
      opts: [['Más puestos de comida', 'More food stands', 112], ['Tarima con merengue en vivo', 'Live merengue stage', 86], ['Zona para los niños', "Kids' area", 47]], cm: [] },
    { id: 'q-pediatra', k: 'q', u: 'gaby', h: 6, mi: 1.1, tema: 'salud', salud: 1, solved: 'qp1', up: 29, dn: 0,
      es: '¿Algún pediatra que hable español y acepte Medicaid? Mi niña tiene fiebre desde anoche.',
      en: 'Any pediatrician who speaks Spanish and takes Medicaid? My girl has had a fever since last night.',
      cm: [c('qp1', 'mily', 5.5, 'Pediatría Los Pinos. Todos hablan español, aceptan Medicaid y CHIP, y te dan cita el mismo día si llamas temprano.', 'Pediatría Los Pinos. Everyone speaks Spanish, they take Medicaid and CHIP, and give same-day visits if you call early.', 12, { biz: 'pediatria-los-pinos' }),
        c('qp2', 'luz', 5, 'Si no consigues cita, la Clínica Esperanza atiende sin seguro también.', 'If you cannot get a visit, Clínica Esperanza also sees you without insurance.', 6, { biz: 'clinica-esperanza' }),
        c('qp3', 'yami', 4, 'Si la fiebre no baja o le cuesta respirar, no esperes: urgencias.', "If the fever won't break or she struggles to breathe, don't wait: ER.", 9)] },
    { id: 'p-coco', k: 'p', u: 'rosa', h: 3, mi: 0.9, ph: [13821852], up: 31, dn: 0,
      es: 'Se me perdió Coco cerca de la Alter St. Es marroncito, chiquito, con collar rojo. Si lo ven, avísenme por aquí.',
      en: 'I lost Coco near Alter St. He is small and brown with a red collar. If you see him, let me know here.',
      cm: [c('pc1', 'anthony', 2, 'Vi uno así por la 22 y la Diamond hace como una hora.', 'I saw one like that by 22nd and Diamond about an hour ago.', 7), c('pc2', 'marisol', 1.5, 'Lo compartí con el grupo de la iglesia.', 'I shared it with the church group.', 3)] },
    { id: 'r-junior', k: 'r', u: 'kelvin', h: 9, mi: 1.2, biz: 'junior-a-domicilio', para: ['Cortes para niños', 'Kids cuts'], up: 22, dn: 0,
      es: 'Vino a la casa a pelar a mis dos niños y a mí. Llegó a la hora y dejó todo limpio.',
      en: 'He came over to cut my two boys and me. On time and left everything clean.', cm: [c('rj1', 'gaby', 7, '¿Cuánto cobra por niño?', 'How much per kid?', 1, { rp: [c('rj1a', 'kelvin', 6, '$18 cada uno en la casa. Lo ves en su página.', '$18 each at home. It is on his page.', 3)] })] },
    { id: 'e-patio', k: 'e', u: 'carmen', h: 12, mi: 1.6, left: 60, up: 19, dn: 0,
      es: '¿Qué prefieren para el torneo de dominó de octubre?', en: 'What do you prefer for the October dominoes tournament?',
      opts: [['Sábado en la tarde', 'Saturday afternoon', 41], ['Domingo después de misa', 'Sunday after Mass', 23], ['Viernes en la noche', 'Friday night', 9]], cm: [] },
    { id: 'q-ingles', k: 'q', u: 'danny', h: 5, mi: 0, tema: 'otro', up: 11, dn: 0,
      es: 'Me mudo a Hazleton en noviembre. ¿Dónde dan clases de inglés gratis por la noche?',
      en: "I'm moving to Hazleton in November. Where are free evening English classes?",
      cm: [c('qi1', 'carmen', 4, 'En la biblioteca pública, martes y jueves a las 6. Y la iglesia San Gabriel da los sábados.', "At the public library, Tuesdays and Thursdays at 6. St. Gabriel's church has Saturdays.", 5)] },
    { id: 'r-plomero', k: 'r', u: 'hector', h: 22, mi: 1.9, biz: 'plomeria-rodriguez', para: ['Emergencia de plomería', 'Plumbing emergency'], up: 35, dn: 1,
      es: 'Se me reventó un tubo a las 2 de la mañana. Llegaron en 40 minutos y me dieron el precio antes de tocar nada.',
      en: 'A pipe burst at 2 in the morning. They arrived in 40 minutes and gave me the price before touching anything.', cm: [] },
    { id: 'p-desfile', k: 'p', u: 'carmen', h: 30, mi: 1.6, ph: [33477087, 33477086, 33541319], up: 88, dn: 0,
      es: 'Así se vio el desfile dominicano del domingo en la Broad St. Gracias a todos los que salieron con su bandera.',
      en: 'This is how Sunday\'s Dominican parade looked on Broad St. Thanks to everyone who came out with their flag.',
      cm: [c('pd1', 'yami', 28, '¡Qué bonito quedó! El año que viene salgo con los niños.', 'So beautiful! Next year I am going with the kids.', 5)] },
    { id: 'r-sabor', k: 'r', u: 'mily', h: 28, mi: 0.3, biz: 'sabor-dominicano', para: ['Mofongo', 'Mofongo'], up: 27, dn: 2,
      es: 'El mofongo de chicharrón de los jueves es el mejor de Hazleton. Pídelo con el caldo aparte.',
      en: 'Thursday pork-rind mofongo is the best in Hazleton. Ask for the broth on the side.', cm: [] },
    { id: 'q-nieve', k: 'q', u: 'cheo', h: 44, mi: 1.4, tema: 'hogar', up: 18, dn: 0,
      es: '¿Quién quita nieve con contrato por todo el invierno? El año pasado me dejaron plantado dos veces.',
      en: 'Who does snow removal on a contract for the whole winter? Last year they stood me up twice.',
      cm: [c('qn1', 'frank', 40, 'Césped y Nieve Los Primos. Te dan el contrato por escrito y pasan antes de las 7.', 'Césped y Nieve Los Primos. Written contract and they come before 7.', 6, { biz: 'cesped-nieve-los-primos' })] },
  ];
  /* Hoy en el barrio (24 h, de los negocios). [id, cat, [[tipo, es, en, h], …]] */
  const HOY = [
    ['sabor-dominicano', 'comida', [['of', 'Mofongo de chicharrón $12, hasta agotar.', 'Pork-rind mofongo $12, while it lasts.', 2], ['nv', 'Hoy hay sancocho, desde las 12 PM.', 'Sancocho today, from 12 PM.', 4]]],
    ['clinica-esperanza', 'salud', [['av', 'Vacuna de la gripe gratis hoy, de 2 a 6 PM. Sin cita.', 'Free flu shots today, 2 to 6 PM. No appointment.', 3]]],
    ['barberia-el-primo', 'belleza', [['av', 'Hoy sin cita hasta las 3 PM. Espera de 20 minutos.', 'Walk-ins until 3 PM today. 20-minute wait.', 1]]],
    ['panaderia-la-espiga', 'comida', [['nv', 'Pan de agua caliente desde las 7 AM.', 'Hot pan de agua from 7 AM.', 5], ['ll', 'Bizcocho de piña por libra, pídelo hoy.', 'Pineapple cake by the pound, order today.', 6]]],
    ['taller-hermanos-pena', 'autos', [['av', 'Recibimos carros hasta las 4 PM para entregarlos mañana.', 'We take cars until 4 PM for pickup tomorrow.', 2]]],
    ['salon-glamour', 'belleza', [['of', 'Keratina $120 esta semana.', 'Keratin $120 this week.', 5]]],
    ['llantera-el-cibao', 'autos', [['ll', 'Llegaron gomas usadas de 16 y 17 pulgadas desde $45 instaladas.', 'Used 16 and 17 inch tires in, from $45 installed.', 6]]],
    ['empanadas-dona-tere', 'comida', [['of', 'Docena de empanadas $15 este sábado.', 'A dozen empanadas $15 this Saturday.', 8]]],
    ['plomeria-rodriguez', 'hogar', [['of', 'Mantenimiento de calentador $89 hasta el 30.', 'Water heater tune-up $89 until the 30th.', 8]]],
    ['dental-sonrisa', 'salud', [['nv', 'Este sábado atendemos niños de 9 a 1.', 'This Saturday we see kids 9 to 1.', 10]]],
    ['cafe-quisqueya', 'comida', [['of', 'Café con leche y pan con queso $4 hasta las 11.', 'Café con leche and cheese bread $4 until 11.', 1]]],
  ];
  const HOY_T = { of: ['OFERTA', 'DEAL'], nv: ['NOVEDAD', 'NEW'], ll: ['LLEGÓ', 'JUST IN'], av: ['AVISO', 'NOTICE'] };
  /* Cupones que los negocios ofrecen por monedas. [id, negocio, es, en, monedas] */
  const COUPONS = [
    ['cup-cafe', 'cafe-quisqueya', 'Café con leche gratis', 'Free café con leche', 80],
    ['cup-espiga', 'panaderia-la-espiga', '$3 en pan y dulces', '$3 off bread and sweets', 120],
    ['cup-tere', 'empanadas-dona-tere', '3 empanadas gratis', '3 free empanadas', 150],
    ['cup-primo', 'barberia-el-primo', '$5 en tu corte', '$5 off your cut', 250],
    ['cup-cibao', 'llantera-el-cibao', 'Rotación de gomas gratis', 'Free tire rotation', 300],
  ];
  /* Tabla del Barrio: puntos del mes por vecino [general, recomendaciones, respuestas] */
  const TABLA = { sep: { ramon: [486, 190, 210], yami: [412, 150, 230], alta: [398, 220, 150], mily: [355, 240, 70], carmen: [301, 80, 120], luz: [288, 90, 170], hector: [240, 130, 60], marisol: [197, 60, 90], frank: [156, 70, 70], kelvin: [131, 50, 40], anthony: [118, 20, 60], cheo: [90, 30, 40], rosa: [64, 10, 30], gaby: [41, 0, 10] },
    ago: { alta: [520, 260, 180], ramon: [470, 170, 220], carmen: [410, 90, 160], yami: [366, 140, 190], luz: [310, 100, 180], mily: [298, 200, 60], hector: [201, 110, 50], marisol: [180, 50, 80], cheo: [122, 40, 50], frank: [110, 50, 40], kelvin: [96, 30, 40], rosa: [70, 10, 40] } };
  const PATIO = {
    torneo: { id: 'copa-sabor', biz: 'sabor-dominicano', name: ['Copa Sabor Dominicano', 'Sabor Dominicano Cup'], when: ['Sáb 3 oct · 2 PM', 'Sat Oct 3 · 2 PM'], cupo: 16, ins: 11, fee: 50,
      prize: ['Cena para dos en Sabor Dominicano ($40) para la pareja campeona', 'Dinner for two at Sabor Dominicano ($40) for the winning pair'], prize2: ['Postre para dos para el segundo lugar', 'Dessert for two for second place'],
      rounds: [['Octavos', 'Round of 16', 'Sáb 3 oct', 'Sat Oct 3'], ['Cuartos', 'Quarterfinals', 'Dom 4 oct', 'Sun Oct 4'], ['Semifinal', 'Semifinal', 'Sáb 10 oct', 'Sat Oct 10'], ['Final', 'Final', 'Dom 11 oct', 'Sun Oct 11']],
      rules: [['Dominó en parejas, a 100 puntos.', 'Partner dominoes, to 100 points.'], ['Se juega por turnos: cada ronda tiene todo el día para terminarse.', 'Turn-based: each round has the whole day to finish.'], ['Te sales hasta el viernes 2 a las 6 PM y te devolvemos las monedas.', 'Leave by Friday Oct 2, 6 PM and we return your coins.'], ['El premio es un cupón del negocio: lo canjeas en el local.', 'The prize is a business coupon: you redeem it in store.']] },
    rank: [['carmen', 24, 6], ['ramon', 21, 8], ['cheo', 17, 9], ['hector', 12, 7], ['anthony', 9, 10]],
    ph: { hero: 6838587, torneo: 7104168, parchis: 11646952 },
  };
  const CHATS = { marisol: [['them', '¡Bienvenida al barrio, Ana! Si necesitas algo, pregunta por aquí o escríbeme.', 'Welcome to the neighborhood, Ana! If you need anything, ask here or write to me.', 1]] };
  /* Respuestas simuladas cuando otros ven lo que publicas: por tema de la pregunta */
  const SIM = {
    comida: ['mily', 'Prueba Sabor Dominicano. Pregunta por el plato del día.', 'Try Sabor Dominicano. Ask for the dish of the day.', 'sabor-dominicano'],
    belleza: ['marisol', 'En Salón Glamour te atienden bien y el precio es el que ves.', 'At Salón Glamour they treat you well and the price is what you see.', 'salon-glamour'],
    autos: ['ramon', 'Taller Hermanos Peña. Te mandan el estimado antes de tocar nada.', 'Taller Hermanos Peña. They send the estimate before touching anything.', 'taller-hermanos-pena'],
    hogar: ['hector', 'Plomería Rodríguez llega rápido y te dice el precio antes.', 'Plomería Rodríguez comes fast and tells you the price first.', 'plomeria-rodriguez'],
    salud: ['luz', 'La Clínica Esperanza atiende sin seguro y en español.', 'Clínica Esperanza sees you without insurance and in Spanish.', 'clinica-esperanza'],
    ninos: ['gaby', 'A mi niña la llevo a Pediatría Los Pinos.', 'I take my girl to Pediatría Los Pinos.', 'pediatria-los-pinos'],
    fiestas: ['carmen', 'Para el bizcocho, Dulces de Mamá Yoli. Encárgalo con tiempo.', 'For the cake, Dulces de Mamá Yoli. Order ahead.', 'dulces-mama-yoli'],
    tramites: ['alta', 'En la biblioteca te ayudan con los formularios gratis los miércoles.', 'The library helps with forms for free on Wednesdays.', ''],
    otro: ['yami', 'Buena pregunta. Yo también quiero saber.', 'Good question. I want to know too.', ''],
    r: ['kelvin', 'Yo también lo recomiendo. Siempre cumple.', 'I recommend them too. They always deliver.', ''],
    p: ['rosa', 'Gracias por avisar, Ana.', 'Thanks for letting us know, Ana.', ''],
    e: ['cheo', 'Ya voté. A ver qué sale.', 'I voted. Let us see what wins.', ''],
  };
  const CHAT_SIM = { marisol: ['Claro que sí. Mañana te paso el número del salón.', 'Of course. Tomorrow I send you the salon number.'], def: ['¡Dale! Hablamos.', 'Sure! Talk soon.'] };
  window.TLCom = { IMG, RANKS, PTS, PTS_RULES, RULES, REP, TEMAS, U, BDG, BZ, POSTS, HOY, HOY_T, COUPONS, TABLA, PATIO, CHATS, SIM, CHAT_SIM, VECINOS: 1240 };
})();
