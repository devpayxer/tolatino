/* Reseñas (base, todas las categorías · hoy Comida). Hoy: jue 24 sep 2026, 12:30 PM.
   src: dl = pedido delivery · pk = pickup · rsv = reservó mesa · vis = visitante (sin compra en To'Latino, se marca).
   hot: 1 caliente · 0 tibio · -1 frío · late: min después de la hora prometida (dato del pedido, no se edita) · val: 1 vale · 0 más o menos · -1 caro · taste: 1 · 0 · -1
   rec = platos que recomienda (ids de TLMenu o nombres) · ph = fotos (ids Pexels) · reply = [es, en, días] */
(function () {
  const RANKS = ['Recluta', 'Vecino', 'Cabo', 'Sargento', 'Sargento Mayor', 'Teniente', 'Capitán', 'Comandante', 'Coronel', 'General del Barrio'];
  const SD = [
    { id: 'sd1', name: 'Yokasta M.', lvl: 4, cnt: 23, d: 3, stars: 5, src: 'dl', hot: 1, late: -2, val: 1, taste: 1, rec: ['bandera'], ph: [27556972], help: 18, topics: ['bandera', 'delivery'],
      es: 'La bandera como en casa: el pollo guisado suave y las habichuelas con sazón. Pedí delivery y llegó caliente, antes de la hora que decía.', en: 'La bandera tastes like home: tender stewed chicken and well-seasoned beans. Ordered delivery and it arrived hot, before the time it said.',
      reply: ['Gracias, Yokasta. Te esperamos el sábado para el sancocho.', 'Thank you, Yokasta. See you Saturday for the sancocho.', 2] },
    { id: 'sd2', name: 'Mariela S.', lvl: 3, cnt: 9, d: 2, stars: 5, src: 'dl', hot: 1, late: 3, val: 1, taste: 1, rec: ['mangu', 'morir'], ph: [14810483, 20300401], help: 9, topics: ['desayuno'],
      es: 'Mangú con los tres golpes a las 11 de la mañana, como en la capital. El morir soñando llegó bien frío, que es como tiene que llegar.', en: 'Mangú with los tres golpes at 11 in the morning, just like back home. The morir soñando arrived ice cold, the way it should.',
      reply: ['Gracias, Mariela. Buen provecho.', 'Thank you, Mariela. Enjoy.', 1] },
    { id: 'sd3', name: 'Ramón A.', lvl: 6, cnt: 58, d: 5, stars: 5, src: 'pk', hot: 1, late: 0, val: 1, taste: 1, rec: ['chivo'], ph: [27556981], help: 15, topics: ['pickup'],
      es: 'El chivo guisado es el mejor de Hazleton. Pedí pickup para las 12:30 y a las 12:25 ya estaba listo en el mostrador.', en: 'The goat stew is the best in Hazleton. Ordered pickup for 12:30 and it was ready at the counter by 12:25.',
      reply: ['Gracias, Ramón. El chivo sale todos los días hasta que se acaba.', 'Thank you, Ramón. The goat stew is on every day until it runs out.', 4] },
    { id: 'sd4', name: 'Luis R.', lvl: 2, cnt: 4, d: 7, stars: 5, src: 'rsv', val: 1, taste: 1, rec: ['mofongo'], ph: [37121074, 39143744], help: 31, topics: ['mofongo', 'espera'],
      es: 'El mofongo de chicharrón vale la pena. Los viernes en la noche hay espera de unos 20 minutos aunque reserves; llega temprano.', en: 'The pork-rind mofongo is worth it. Friday nights there is about a 20 minute wait even with a reservation; get there early.',
      reply: null },
    { id: 'sd5', name: 'Daisy T.', lvl: 1, cnt: 1, d: 9, stars: 5, src: 'vis', taste: 1, rec: [], ph: [], help: 6, topics: ['atencion'],
      es: 'Fui con mi mamá un domingo. Nos atendió Yanet, súper amable, y nos explicó los platos en español y en inglés.', en: 'Went with my mom on a Sunday. Yanet served us, super kind, and explained the dishes in Spanish and English.',
      reply: null },
    { id: 'sd6', name: 'José L.', lvl: 2, cnt: 6, d: 11, stars: 4, src: 'pk', hot: 1, late: 12, val: 1, taste: 1, rec: ['flan'], ph: [], help: 7, topics: ['pickup', 'espera'],
      es: 'Rico todo, pero el pickup se atrasó 12 minutos a la hora del almuerzo. El flan, de lo mejor que he probado aquí.', en: 'Everything was tasty, but pickup ran 12 minutes late at lunchtime. The flan is some of the best I have had here.',
      reply: null },
    { id: 'sd7', name: 'Kathy P.', lvl: 3, cnt: 11, d: 14, stars: 4, src: 'dl', hot: 0, late: 22, val: 1, taste: 1, rec: ['picapollo'], ph: [], help: 24, topics: ['delivery', 'precio'],
      es: 'Buena comida y precio justo. El delivery llegó 22 minutos tarde y los tostones tibios. El pica pollo, perfecto.', en: 'Good food, fair price. Delivery was 22 minutes late and the tostones lukewarm. The fried chicken was perfect.',
      reply: ['Tienes razón, Kathy. Ese día tuvimos un solo chofer. Ya contratamos otro y te devolvimos el envío.', 'You are right, Kathy. We had one driver that day. We hired another and refunded your delivery fee.', 13] },
    { id: 'sd8', name: 'Wilfredo C.', lvl: 5, cnt: 34, d: 18, stars: 3, src: 'dl', hot: -1, late: 9, val: -1, taste: 1, rec: [], ph: [36857725], help: 29, topics: ['delivery', 'porciones'], edited: 1,
      es: 'El pescado llegó frío y para $18 esperaba más porción. El sabor sí estaba bien. Pedí ayuda con el pedido y me devolvieron el plato.', en: 'The fish arrived cold and for $18 I expected a bigger portion. The flavor was good. I used order help and they refunded the dish.',
      reply: ['Wilfredo, tienes razón. El pescado no viaja bien lejos; ahora solo lo mandamos hasta 2 millas.', 'Wilfredo, you are right. Fish does not travel well; we now only deliver it within 2 miles.', 17] },
    { id: 'sd9', name: 'Anny V.', lvl: 4, cnt: 17, d: 21, stars: 5, src: 'rsv', val: 1, taste: 1, rec: ['sancocho'], ph: [27397342, 38330332], help: 22, topics: ['sancocho'],
      es: 'Reservamos para 8 el domingo por el cumpleaños de mi papá. La mesa estaba lista a la hora y el sancocho de siete carnes, espectacular.', en: 'We booked for 8 on Sunday for my dad’s birthday. The table was ready on time and the seven-meat sancocho was spectacular.',
      reply: ['Felicidades a tu papá, Anny. Los esperamos otra vez.', 'Happy birthday to your dad, Anny. Come back soon.', 20] },
    { id: 'sd10', name: 'Héctor B.', lvl: 2, cnt: 3, d: 26, stars: 2, src: 'vis', taste: 0, rec: [], ph: [], help: 12, topics: ['espera'],
      es: 'Esperé 40 minutos por una mesa un viernes y nadie me dijo nada. La comida bien, pero así no vuelvo un viernes.', en: 'I waited 40 minutes for a table on a Friday and nobody said a word. The food was fine, but I won’t come back on a Friday like that.',
      reply: ['Héctor, lo sentimos. Ahora los viernes hay lista de espera en To’Latino y te avisamos por SMS cuando se libera la mesa.', 'Héctor, we are sorry. Fridays now have a To’Latino waitlist and we text you when your table is ready.', 25] },
    { id: 'sd11', name: 'Carmen G.', lvl: 5, cnt: 41, d: 30, stars: 5, src: 'dl', hot: 1, late: -4, val: 1, taste: 1, rec: ['mofongo'], ph: [], help: 14, topics: ['mofongo', 'delivery'],
      es: 'Pedí para la oficina, seis mofongos. Llegaron calientes, bien empacados y con el caldo aparte para que no se ablandaran.', en: 'Ordered six mofongos for the office. They arrived hot, well packed and with the broth on the side so they wouldn’t go soft.',
      reply: ['Gracias, Carmen. Para la oficina también hacemos catering.', 'Thank you, Carmen. We also cater for offices.', 29] },
    { id: 'sd12', name: 'Pedro N.', lvl: 3, cnt: 8, d: 35, stars: 5, src: 'pk', hot: 1, late: 0, val: 1, taste: 1, rec: ['chicharron'], ph: [8954034], help: 5, topics: ['porciones'],
      es: 'La libra de chicharrón da para tres. Crujiente de verdad.', en: 'The pound of pork belly feeds three. Truly crispy.', reply: null },
    { id: 'sd13', name: 'Rosanna F.', lvl: 1, cnt: 2, d: 40, stars: 4, src: 'vis', val: 0, taste: 1, rec: ['bandera'], ph: [], help: 3, topics: ['precio', 'bandera'],
      es: 'Rica la bandera. Un poco cara desde que subieron el precio, pero la porción es grande.', en: 'The bandera is tasty. A bit pricey since they raised it, but the portion is big.', reply: null },
    { id: 'sd14', name: 'Freddy D.', lvl: 7, cnt: 96, d: 45, stars: 5, src: 'dl', hot: 1, late: 1, val: 1, taste: 1, rec: ['chinola'], ph: [33709196], help: 11, topics: ['delivery'],
      es: 'Pido casi todas las semanas. Nunca me ha llegado frío y el jugo de chinola es natural de verdad.', en: 'I order almost every week. It has never arrived cold and the passion fruit juice is truly fresh.',
      reply: ['Freddy, gracias por ser de la casa.', 'Freddy, thanks for being family.', 44] },
  ];
  const SD_STATS = { ver: 168, orders: 148, hot: 94, time: 88, val: 90, taste: 4.9 };
  const SD_TOP = [['bandera', 41], ['mofongo', 36], ['chivo', 22], ['morir', 19]];
  const SD_TOPICS = [['bandera', 'La bandera', 'La bandera'], ['mofongo', 'Mofongo', 'Mofongo'], ['delivery', 'Delivery', 'Delivery'], ['pickup', 'Pickup', 'Pickup'], ['espera', 'Espera los viernes', 'Friday waits'], ['porciones', 'Porciones', 'Portions'], ['precio', 'Precio', 'Price'], ['atencion', 'Atención', 'Service']];
  const MORE = [
    [21, 3, 'Bien, pero la porción más pequeña que la última vez.', 'Good, but a smaller portion than last time.', 'Gracias por decirnos. Volvimos a la porción de antes.', 'Thanks for telling us. We went back to the usual portion.'],
    [33, 5, 'Siempre amables. Se nota que es negocio de familia.', 'Always kind. You can tell it is a family business.', '', ''],
  ];
  const DAYS = { 'HACE 3 DÍAS': 3, 'HACE 1 SEMANA': 7, 'HACE 2 SEMANAS': 14 };
  function forBiz(b, i) {
    const hid = r => !(window.TLAdm && window.TLAdm.revHidden(r.id));
    if (b.id === 'sabor-dominicano') return SD.filter(hid);
    const X = window.TLListing, base = X.revFor(b, i), pro = !!b.pro, dl = b.tags.includes('delivery'), pk = b.tags.includes('pickup'), di = b.tags.includes('dinein');
    const NM = ['Ramón A.', 'Daisy T.', 'Wilfredo C.', 'Mariela S.', 'José L.', 'Anny V.'];
    const rows = base.map(([name, meta, stars, es, en, reply], k) => ({ name, d: DAYS[meta] || 7, stars, es, en, reply: reply ? [reply, reply, Math.max(1, (DAYS[meta] || 7) - 1)] : null }))
      .concat(MORE.map(([d, stars, es, en, re, rn], k) => ({ name: NM[(i + k * 3) % NM.length], d, stars, es, en, reply: re ? [re, rn, d - 1] : null })));
    return rows.map((r, k) => { const src = !pro ? 'vis' : k === 0 ? (dl ? 'dl' : pk ? 'pk' : 'vis') : k === 1 ? 'vis' : k === 2 ? (pk ? 'pk' : dl ? 'dl' : 'vis') : k === 3 ? (di ? 'vis' : 'pk') : (dl ? 'dl' : 'vis');
      const ord = src === 'dl' || src === 'pk';
      return Object.assign({ id: b.id + '-r' + k, lvl: 1 + ((i + k * 2) % 6), cnt: 2 + ((i * 3 + k * 7) % 30), src, hot: ord ? (r.stars >= 4 ? 1 : 0) : undefined, late: ord ? (r.stars >= 5 ? 0 : r.stars === 4 ? 14 : 6) : undefined,
        val: r.stars >= 4 ? 1 : 0, taste: 1, rec: [], ph: k === 0 && b.ph[1] ? [b.ph[1]] : k === 2 && b.ph[2] ? [b.ph[2]] : [], help: 2 + ((i + k * 5) % 14), topics: [] }, r); }).filter(hid);
  }
  function stats(b) {
    if (b.id === 'sabor-dominicano') return SD_STATS;
    const pro = !!b.pro, ord = pro && (b.tags.includes('delivery') || b.tags.includes('pickup')) && b.tags.includes('online');
    return { ver: pro ? Math.round(b.n * 0.7) : 0, orders: ord ? Math.round(b.n * 0.6) : 0, hot: 86 + (b.n % 9), time: 79 + (b.n % 13), val: 84 + (b.n % 11), taste: Math.min(5, Math.round((b.r + 0.1) * 10) / 10) };
  }
  function top(b) {
    if (b.id === 'sabor-dominicano') return SD_TOP.map(([id, n]) => ({ id, n }));
    if (!b.pro) return [];
    const X = window.TLListing, m = (X.MENU[b.id] || []), flat = [].concat(...m.map(s => s[2]));
    return flat.slice(0, 3).map((it, k) => ({ name: it[0], n: Math.max(4, Math.round(b.n / (5 + k * 3))), ph: b.ph[k % b.ph.length] }));
  }
  function topics(b) { return b.id === 'sabor-dominicano' ? SD_TOPICS : []; }
  window.TLRev = { RANKS, forBiz, stats, top, topics };
})();
