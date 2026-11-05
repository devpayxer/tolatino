/* Novedades del negocio (pestaña base, solo Pro). Cada publicación es una herramienta: oferta · hoy hay · aviso de horario · encuesta · cupón para seguidores · novedad · evento · vacante.
   h = horas desde que se publicó (< 24 → también sale en "Hoy en el barrio"). up/dn = votos. cm = comentarios [nombre, es, en, h, votos, respuesta del negocio [es, en]]. */
(function () {
  const POSTS = {
    'sabor-dominicano': [
      { id: 'n1', k: 'oferta', pin: 1, h: 2, es: 'Mofongo de chicharrón a $12 hoy, hasta agotar. Con caldo de pollo.', en: 'Pork-rind mofongo for $12 today, while it lasts. With chicken broth.', item: 'mofongo', was: 14, now: 12, left: 14, endEs: 'Hasta agotar · hoy', endEn: 'While it lasts · today', up: 48, dn: 2,
        cm: [['Yesenia M.', '¿Lo tienen para delivery también?', 'Is it available for delivery too?', 1, 9, ['Sí, Yesenia. El precio es el mismo en delivery y pickup.', 'Yes, Yesenia. Same price for delivery and pickup.']], ['Rafael T.', 'El mejor mofongo de Hazleton, sin discusión.', 'Best mofongo in Hazleton, no contest.', 1, 14]] },
      { id: 'n2', k: 'encuesta', h: 5, es: '¿Qué cocinamos el sábado en la noche?', en: 'What should we cook Saturday night?', opts: [['Chivo guisado', 'Goat stew', 41], ['Pescado frito', 'Fried fish', 33], ['Locrio de pollo', 'Chicken locrio', 19]], endsH: 43, up: 22, dn: 0,
        cm: [['Carmen R.', 'Chivo, como el del mes pasado.', 'Goat, like last month.', 3, 6]] },
      { id: 'n3', k: 'cupon', h: 9, es: 'Para quienes nos siguen: $3 de descuento en pedidos de $15 o más.', en: 'For our followers: $3 off orders of $15 or more.', code: 'SABOR3', off: 3, min: 15, left: 37, endEs: 'Vence el domingo 27 sep', endEn: 'Expires Sunday Sep 27', up: 30, dn: 1, cm: [] },
      { id: 'n4', k: 'horario', h: 20, es: 'El lunes 12 de octubre, Día de la Raza, cerramos a las 6 PM.', en: 'Monday October 12, Columbus Day, we close at 6 PM.', dayEs: 'Lunes 12 oct', dayEn: 'Monday Oct 12', hrs: '11 AM – 6 PM', up: 12, dn: 0,
        cm: [['Luis P.', '¿Y el domingo abren normal?', 'Are you open as usual on Sunday?', 18, 3, ['Sí, Luis: domingo de 11 AM a 9 PM.', 'Yes, Luis: Sunday 11 AM to 9 PM.']]] },
      { id: 'n5', k: 'hoy', h: 30, es: 'Llegó el flan de leche de doña Rosa. Son poquitos.', en: "Doña Rosa's flan is in. Just a few.", item: 'flan', up: 35, dn: 1, cm: [] },
      { id: 'n6', k: 'evento', h: 34, es: 'Este viernes: noche de merengue en vivo. Entrada libre.', en: 'This Friday: live merengue night. Free entry.', ev: 0, up: 57, dn: 3, cm: [['Wendy S.', '¡Allá nos vemos!', 'See you there!', 20, 4]] },
      { id: 'n7', k: 'nov', h: 72, es: 'Estrenamos terraza: 8 mesas afuera para las noches de septiembre. Se puede reservar.', en: 'Our new patio is open: 8 tables outside for September nights. Reservations available.', up: 64, dn: 2, cm: [] },
      { id: 'n8', k: 'vacante', h: 96, es: 'Buscamos ayudante de cocina. Tiempo completo.', en: "We're hiring a kitchen helper. Full time.", job: 0, up: 18, dn: 0, cm: [] }
    ]
  };
  window.TLNov = { POSTS };
})();
