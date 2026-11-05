/* Ficha de Mercados (APP-NEG-LISTING-PRO/FREE · NEG-MERC) — datos + motor. Hoy: jue 24 sep 2026, 12:30 PM.
   Tesis: ¿lo pesan delante de mí? Línea fija: "Lo que va por peso se pesa delante de ti y pagas el peso real." (ficha, hoja, pedido, estado).
   Pestaña Servicios = la tienda: productos k lb (precio por libra; la cantidad es un estimado) · unid (por pieza o paquete) · plato (comida lista).
     La hoja pide cantidad (+ corte o punto para carne y víveres) y agrega al pedido del mercado: s.mcart = { biz, lines: [{ key, q, o }] }.
   Pedido por libra: se retiene el estimado + 10 %; al pesar se cobra el peso real con la foto de la balanza; sustituir pide tu OK (etapa 3).
   Reseñas: pesaron delante de ti · cobraron el peso real · fresco · precio del estante = caja · sustituciones con tu OK · trato. */
(function boot() {
  const X = window.TLListing, SD = window.TLStaff, ME = window.TLMerc, ALL = window.TLAll; if (!X || !SD || !ME || !ALL) return setTimeout(boot, 40);
  const fmt = X.fmt, money = n => '$' + (Math.round(n * 100) % 100 ? (Math.round(n * 100) / 100).toFixed(2) : Math.round(n).toLocaleString('en-US'));
  const U = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 300) + ')';
  const biz = id => ALL.B.find(b => b.id === id), stop = e => { if (e && e.stopPropagation) e.stopPropagation(); };
  const PR = ME.PROD, PH = ME.SUBPH, W = (...a) => a, WK = (h, sat, sun) => W(sun || null, h, h, h, h, h, sat || null);
  const pr = (n, ne, d, de, p, k, ph, o) => Object.assign({ n, ne, d, de, p, k, ph }, o || {});
  const LINE = ME.line;
  const CUT = [['Entero', 'Whole'], ['En trozos', 'In pieces'], ['Para guisar', 'For stew'], ['Molido', 'Ground']];
  const PUNTO = [['Verde', 'Green'], ['Pintón', 'Half-ripe'], ['Maduro', 'Ripe']];
  const PESC = [['Entero', 'Whole'], ['Limpio y escamado', 'Cleaned and scaled'], ['En filete', 'Filleted']];
  const SVC = {
    'supermercado-la-cosecha': [['Carnicería', 'Butcher', [
      pr('Pierna de cerdo', 'Pork shoulder', 'Con cuero o sin cuero.', 'Skin on or off.', 2.49, 'lb', PR.cerdo, { cut: CUT }), pr('Pollo entero', 'Whole chicken', 'Oferta hasta el domingo.', 'On sale through Sunday.', 1.29, 'lb', PR.pollo, { cut: CUT.slice(0, 3), was: 1.79 }),
      pr('Bistec de res', 'Beef steak', 'Cortado fino para bistec encebollado.', 'Thin cut for bistec encebollado.', 6.99, 'lb', PR.res)]],
      ['Frutas y víveres', 'Produce', [pr('Plátano verde', 'Green plantain', 'Por unidad.', 'Each.', 0.45, 'unid', PR.platano, { punto: PUNTO }), pr('Yuca', 'Cassava', 'Fresca, no congelada.', 'Fresh, not frozen.', 1.29, 'lb', PR.yuca), pr('Aguacate', 'Avocado', 'Grande, de Santo Domingo.', 'Large, Dominican.', 1.99, 'unid', PR.aguacate, { punto: [['Para hoy', 'For today'], ['Para 2 días', 'For 2 days']] })]],
      ['Despensa', 'Pantry', [pr('Arroz 10 lb', 'Rice 10 lb', 'Grano largo.', 'Long grain.', 8.99, 'unid', PR.arroz), pr('Habichuelas rojas', 'Red beans', 'Lata de 15 oz.', '15 oz can.', 1.19, 'unid', PR.habichuela), pr('Café Santo Domingo', 'Santo Domingo coffee', '1 lb molido.', '1 lb ground.', 7.49, 'unid', PR.cafe)]]],
    'carniceria-el-cibao': [['Carnes', 'Meats', [
      pr('Chivo', 'Goat', 'Cortado para guisar, con hueso.', 'Cut for stew, bone-in.', 6.99, 'lb', PR.chivo, { cut: CUT.slice(1, 3) }), pr('Pierna de cerdo', 'Pork shoulder', 'Para pernil.', 'For pernil.', 2.29, 'lb', PR.cerdo, { cut: CUT }),
      pr('Pollo en piezas', 'Chicken pieces', 'Muslo y encuentro.', 'Thighs and legs.', 1.89, 'lb', PR.pollo), pr('Longaniza dominicana', 'Dominican longaniza', 'Hecha aquí.', 'Made in-house.', 5.49, 'lb', PR.salami)]],
      ['Quesos y salami', 'Cheese & salami', [pr('Salami dominicano', 'Dominican salami', 'Induveca o Campesino.', 'Induveca or Campesino.', 4.99, 'unid', PR.salami), pr('Queso de freír', 'Frying cheese', 'Por libra.', 'By the pound.', 5.99, 'lb', PR.queso)]]],
    'bodega-don-pepe': [['Del mostrador', 'From the counter', [
      pr('Sándwich de salami y queso', 'Salami and cheese sandwich', 'En pan de agua.', 'On water bread.', 5.5, 'plato', PR.salami), pr('Café con leche', 'Coffee with milk', 'Grande.', 'Large.', 1, 'unid', PR.cafe), pr('Pastelito de pollo', 'Chicken pastelito', 'Hechos en la mañana.', 'Made this morning.', 1.5, 'unid', PR.pastelito)]],
      ['Bodega', 'Bodega', [pr('Salami Induveca', 'Induveca salami', 'Pieza de 1 lb.', '1 lb piece.', 5.49, 'unid', PR.salami), pr('Plátano verde', 'Green plantain', 'Por unidad.', 'Each.', 0.5, 'unid', PR.platano, { punto: PUNTO })]]],
    'pescaderia-del-mar': [['Pescado', 'Fish', [
      pr('Chillo', 'Red snapper', 'Entero; limpiarlo es gratis.', 'Whole; cleaning is free.', 7.99, 'lb', PR.pescado, { cut: PESC }), pr('Camarón grande', 'Large shrimp', 'Con cáscara.', 'Shell-on.', 9.99, 'lb', PR.camaron),
      pr('Bacalao salado', 'Salt cod', 'Sin espinas.', 'Boneless.', 11.99, 'lb', PR.pescado)]]],
    'mercado-quisqueyano': [['Víveres', 'Root vegetables', [
      pr('Plátano verde', 'Green plantain', '3 por $1.', '3 for $1.', 0.34, 'unid', PR.platano, { punto: PUNTO }), pr('Yuca', 'Cassava', 'Fresca.', 'Fresh.', 1.29, 'lb', PR.yuca), pr('Guineíto verde', 'Green bananas', 'Por libra.', 'By the pound.', 0.89, 'lb', PR.guineo), pr('Ají cubanela', 'Cubanelle peppers', 'Por libra.', 'By the pound.', 2.49, 'lb', PR.aji)]],
      ['Despensa', 'Pantry', [pr('Habichuelas rojas', 'Red beans', 'Lata de 15 oz.', '15 oz can.', 1.09, 'unid', PR.habichuela), pr('Café Santo Domingo', 'Santo Domingo coffee', '1 lb molido.', '1 lb ground.', 6.99, 'unid', PR.cafe)]]],
    'la-guadalupana': [['Tortillería', 'Tortillas', [pr('Tortillas de maíz', 'Corn tortillas', 'Calientes, cada hora.', 'Hot, every hour.', 2.5, 'unid', PR.tortilla), pr('Carne para asar', 'Carne asada', 'Marinada.', 'Marinated.', 6.49, 'lb', PR.res), pr('Queso fresco', 'Queso fresco', 'Por libra.', 'By the pound.', 4.99, 'lb', PR.queso)]]],
    'frutas-el-conuco': [['Frutas', 'Fruit', [pr('Aguacate grande', 'Large avocado', 'Para hoy o para 2 días.', 'For today or 2 days.', 1.5, 'unid', PR.aguacate, { punto: [['Para hoy', 'For today'], ['Para 2 días', 'For 2 days']] }), pr('Chinola', 'Passion fruit', 'Para jugo.', 'For juice.', 2.99, 'lb', PR.chinola), pr('Mango', 'Mango', 'Banilejo cuando hay.', 'Banilejo when available.', 1.25, 'unid', PR.mango), pr('Cebolla roja', 'Red onion', 'Por libra.', 'By the pound.', 1.19, 'lb', PR.cebolla)]]],
    'mayorista-caribe': [['Al por mayor', 'Wholesale', [pr('Saco de arroz 50 lb', '50 lb rice sack', 'Grano largo.', 'Long grain.', 32, 'unid', PR.arroz), pr('Caja de habichuelas (24)', 'Case of beans (24)', 'Latas de 15 oz.', '15 oz cans.', 22, 'unid', PR.habichuela), pr('Caja de plátanos (50 lb)', 'Plantain case (50 lb)', 'Verde.', 'Green.', 28, 'unid', PR.platano)]]],
    'la-esquinita-deli': [['Comida del día', 'Daily plates', [pr('Plato del día', 'Daily plate', 'Arroz, habichuelas, carne del día y ensalada. Hasta las 3 PM.', 'Rice, beans, meat of the day and salad. Until 3 PM.', 9, 'plato', PR.comida), pr('Pastelito', 'Pastelito', 'Pollo, res o queso.', 'Chicken, beef or cheese.', 1.5, 'unid', PR.pastelito)]], ['Panadería', 'Bakery', [pr('Pan de agua', 'Water bread', 'Caliente en la mañana.', 'Hot in the morning.', 0.5, 'unid', PR.pan)]]],
    'los-catrachos': [['Lácteos', 'Dairy', [pr('Quesillo', 'Quesillo', 'Hondureño, por libra.', 'Honduran, by the pound.', 5.99, 'lb', PR.queso), pr('Crema', 'Crema', 'Frasco de 15 oz.', '15 oz jar.', 3.49, 'unid', PR.queso)]], ['Carnes', 'Meats', [pr('Chorizo catracho', 'Honduran chorizo', 'Por libra.', 'By the pound.', 4.99, 'lb', PR.salami)]]],
    'agua-hielo-cristal': [['Agua e hielo', 'Water & ice', [pr('Botellón 5 galones', '5-gallon jug', 'Cambias el vacío.', 'Swap your empty.', 2.5, 'unid', PR.agua), pr('Hielo 20 lb', '20 lb ice', 'Para fiestas.', 'For parties.', 4, 'unid', PR.hielo)]]],
    'mercado-el-condor': [['Despensa de tu país', 'Pantry from home', [pr('Harina P.A.N.', 'P.A.N. flour', 'Blanca, 2.2 lb. Para arepas.', 'White, 2.2 lb. For arepas.', 4.29, 'unid', PR.arroz), pr('Ají amarillo en pasta', 'Ají amarillo paste', 'De Perú, frasco de 7.5 oz.', 'From Peru, 7.5 oz jar.', 3.49, 'unid', PR.aji), pr('Café colombiano', 'Colombian coffee', '1 lb molido.', '1 lb ground.', 9.49, 'unid', PR.cafe), pr('Yerba mate 1 kg', 'Yerba mate 1 kg', 'Con palo.', 'With stems.', 8.99, 'unid', PR.cafe)]],
      ['Congelados', 'Frozen', [pr('Pulpa de lulo', 'Lulo pulp', 'Para jugo, 14 oz.', 'For juice, 14 oz.', 2.99, 'unid', PR.chinola), pr('Empanadas colombianas (12)', 'Colombian empanadas (12)', 'Listas para freír.', 'Ready to fry.', 11.99, 'unid', PR.pastelito), pr('Choclo peruano', 'Peruvian corn', 'Grano gigante, 1 lb.', 'Giant kernel, 1 lb.', 4.49, 'unid', PR.cebolla)]]],
    'licores-la-cumbre': [['Ron y licores', 'Rum & spirits', [pr('Brugal Añejo', 'Brugal Añejo', '750 ml.', '750 ml.', 24.99, 'unid'), pr('Barceló Imperial', 'Barceló Imperial', '750 ml.', '750 ml.', 34.99, 'unid'), pr('Mamajuana preparada', 'Prepared mamajuana', 'Botella lista, de la casa.', 'Ready bottle, house-made.', 19.99, 'unid')]],
      ['Cerveza y vino', 'Beer & wine', [pr('Presidente · caja de 24', 'Presidente · case of 24', 'Fría si la pides antes.', 'Cold if you order ahead.', 32, 'unid'), pr('Vino tinto chileno', 'Chilean red wine', '750 ml.', '750 ml.', 12.99, 'unid')]],
      ['Cigarros', 'Cigars', [pr('Cigarro dominicano hecho a mano', 'Handmade Dominican cigar', 'Por unidad.', 'Each.', 6.5, 'unid')]]],
    'botanica-siete-potencias': [['Hierbas y té', 'Herbs & tea', [pr('Manzanilla seca', 'Dried chamomile', 'Bolsa de 2 oz.', '2 oz bag.', 2.5, 'unid'), pr('Ruda fresca', 'Fresh rue', 'Manojo, llega martes y viernes.', 'Bunch, arrives Tue and Fri.', 3, 'unid'), pr('Té de jengibre y canela', 'Ginger and cinnamon tea', 'Mezcla de la casa, 4 oz.', 'House blend, 4 oz.', 4.5, 'unid')]],
      ['Velas y aceites', 'Candles & oils', [pr('Vela de 7 días', '7-day candle', 'Varios colores.', 'Several colors.', 3.99, 'unid'), pr('Agua de Florida', 'Florida water', '7.5 oz.', '7.5 oz.', 5.99, 'unid'), pr('Aceite de coco', 'Coconut oil', '8 oz, sin perfume.', '8 oz, unscented.', 6.5, 'unid')]]],
    'la-economica': [['Para la casa', 'For the home', [pr('Detergente líquido', 'Liquid detergent', '40 oz.', '40 oz.', 1.25, 'unid'), pr('Esponjas (3)', 'Sponges (3)', 'Para fregar.', 'For dishes.', 1.25, 'unid'), pr('Bolsas de basura (10)', 'Trash bags (10)', '13 galones.', '13 gallons.', 1.25, 'unid')]],
      ['Mascotas', 'Pets', [pr('Comida de perro 15 lb', '15 lb dog food', 'Adulto, pollo y arroz.', 'Adult, chicken and rice.', 16.99, 'unid'), pr('Comida de gato 7 lb', '7 lb cat food', 'Adulto.', 'Adult.', 9.99, 'unid'), pr('Arena para gato 20 lb', '20 lb cat litter', 'Sin olor.', 'Unscented.', 8.49, 'unid')]]],
  };
  const OPTS = { 'mercado-el-condor': { envio: 3.99, min: 20 }, 'la-economica': { envio: 5.99, min: 25 }, 'mercado-quisqueyano': { envio: 3.99, min: 15 }, 'supermercado-la-cosecha': { envio: 4.99, min: 20 }, 'carniceria-el-cibao': { envio: 4.99, min: 25 }, 'la-esquinita-deli': { envio: 2.99, min: 10 }, 'agua-hielo-cristal': { envio: 0, min: 7.5 }, 'mayorista-caribe': { envio: 15, min: 100 } };
  const STAFF = {
    'mercado-el-condor': [['Rosa Huamán', 'Dueña', 'Owner', 2018, 16817332, ['es', 'en'], [['Perú', 'Peru'], ['Colombia', 'Colombia']], ['Si no lo tengo, te lo pido para el jueves.', 'If I do not have it, I order it for Thursday.'], WK([8, 20], [8, 20], [9, 17])]],
    'licores-la-cumbre': [['Wilfredo Peña', 'Dueño', 'Owner', 2014, 19653561, ['es', 'en'], [['Ron', 'Rum'], ['Cigarros', 'Cigars']], ['Pido ID a todo el mundo, también en el pickup.', 'I check everyone\'s ID, at pickup too.'], WK([10, 22], [10, 23], [12, 20])]],
    'botanica-siete-potencias': [['Fefa Rosario', 'Dueña', 'Owner', 2010, 37758913, ['es'], [['Hierbas', 'Herbs']], ['Te explico qué es cada hierba. Para la salud, ve a tu médico.', 'I explain what each herb is. For your health, see your doctor.'], WK([10, 19], [10, 18])]],
    'la-economica': [['Marisela Ortiz', 'Gerente', 'Manager', 2020, 16866941, ['es', 'en'], [['Mascotas', 'Pets']], ['Los martes llega mercancía nueva; te aviso si te guardo algo.', 'New stock arrives Tuesdays; I let you know if I hold something.'], WK([8, 21], [8, 21], [9, 19])]],
    'supermercado-la-cosecha': [['Héctor Almonte', 'Carnicero', 'Butcher', 2014, 39284039, ['es', 'en'], [['Pernil', 'Pernil'], ['Cortes', 'Cuts']], ['Te peso la carne delante y te enseño la pantalla.', 'I weigh your meat in front of you and show you the display.'], WK([7, 15], [7, 15])], ['Luz Marte', 'Pedidos en línea', 'Online orders', 2020, 19899310, ['es', 'en'], [['Pedidos', 'Orders']], ['Te llamo si algo no hay antes de cambiarlo.', 'I call you before swapping anything out.'], WK([9, 17], [9, 17])]],
    'carniceria-el-cibao': [['Rafael "Fello" Núñez', 'Dueño · carnicero', 'Owner · butcher', 2008, 10959917, ['es', 'en'], [['Chivo', 'Goat'], ['Longaniza', 'Longaniza']], ['La balanza está de frente al cliente desde el primer día.', 'The scale has faced the customer since day one.'], WK([8, 20], [7, 20], [8, 15])]],
    'pescaderia-del-mar': [['Miguel Tavárez', 'Pescadero', 'Fishmonger', 2017, 37664403, ['es'], [['Limpieza', 'Cleaning']], ['Lo limpio mientras esperas.', 'I clean it while you wait.'], WK([9, 19], [8, 19])]],
    'mercado-quisqueyano': [['Carmen Rosario', 'Dueña', 'Owner', 2011, 15692687, ['es', 'en'], [['Víveres', 'Produce']], ['El plátano lo escojo yo como si fuera para mi casa.', 'I pick the plantains as if they were for my own home.'], WK([8, 21], [8, 21], [9, 18])]],
  };
  const ABOUT = {
    'mercado-el-condor': ['Productos de Perú, Colombia, Ecuador, Venezuela y Argentina. Envío el mismo día en Hazleton.', 'Products from Peru, Colombia, Ecuador, Venezuela and Argentina. Same-day delivery in Hazleton.', 2018],
    'licores-la-cumbre': ['Ron dominicano, cerveza fría, vino y cigarros hechos a mano. Solo 21+ con ID; no hay envío de alcohol.', 'Dominican rum, cold beer, wine and handmade cigars. 21+ with ID only; no alcohol delivery.', 2014],
    'botanica-siete-potencias': ['Hierbas, velas y aceites del Caribe. Lo que vendemos no reemplaza a tu médico.', 'Caribbean herbs, candles and oils. What we sell does not replace your doctor.', 2010],
    'la-economica': ['Todo para la casa a $1.25 y comida para tu perro o gato. Envío en Hazleton.', 'Home basics at $1.25 and food for your dog or cat. Delivery in Hazleton.', 2020],
    'supermercado-la-cosecha': ['Supermercado latino con carnicería y panadería. La balanza siempre de frente a ti.', 'Latin supermarket with butcher and bakery. The scale always faces you.', 2014],
    'carniceria-el-cibao': ['Carnicería dominicana: chivo, pernil y longaniza hecha aquí.', 'Dominican butcher: goat, pernil and in-house longaniza.', 2008],
    'bodega-don-pepe': ['La bodega de la esquina desde 2003. Café, sándwich y envíos de dinero.', 'The corner bodega since 2003. Coffee, sandwiches and money transfers.', 2003],
    'pescaderia-del-mar': ['Pescado fresco los martes y viernes. Limpiarlo es gratis.', 'Fresh fish Tuesdays and Fridays. Cleaning is free.', 2017],
    'mercado-quisqueyano': ['Víveres y productos dominicanos. Envío el mismo día.', 'Root vegetables and Dominican products. Same-day delivery.', 2011],
    'la-guadalupana': ['Tortillería y carnicería mexicana.', 'Mexican tortillería and butcher.', 2015],
    'frutas-el-conuco': ['Frutas y vegetales del Caribe.', 'Caribbean fruits and vegetables.', 2020],
    'mayorista-caribe': ['Al por mayor para bodegas, restaurantes y familias grandes.', 'Wholesale for bodegas, restaurants and big families.', 2006],
    'la-esquinita-deli': ['Plato del día, pastelitos y pan caliente.', 'Daily plates, pastelitos and hot bread.', 2018],
    'los-catrachos': ['Productos de Honduras, El Salvador y Guatemala.', 'Products from Honduras, El Salvador and Guatemala.', 2019],
    'agua-hielo-cristal': ['Agua de botellón y hielo a domicilio.', 'Jug water and ice delivered.', 2016],
  };
  /* Reseñas: pesa = pesaron delante / foto · peso = cobraron el peso real · fresco · caja = precio del estante = caja · sust = sustitución con tu OK */
  const RV = {
    'supermercado-la-cosecha': [{ n: 'Yokasta M.', lvl: 4, cnt: 23, d: 3, st: 5, src: 'ord', pesa: 1, peso: 1, fresco: 1, caja: 1, es: 'Pedí 5 lb de pernil, pesó 5.3 y me cobraron eso, con la foto de la balanza.', en: 'I ordered 5 lb of pork, it weighed 5.3 and that is what I paid, with the scale photo.', help: 22 },
      { n: 'Ramón A.', lvl: 6, cnt: 58, d: 11, st: 3, src: 'ord', pesa: 1, peso: 1, fresco: 1, caja: 0, sust: 0, es: 'Cambiaron el café por otra marca sin llamarme. El precio del estante no era el de la caja.', en: 'They swapped the coffee for another brand without calling. Shelf price did not match the register.', rep: ['Ramón, eso no debió pasar. Te devolvimos la diferencia.', 'Ramón, that should not have happened. We refunded the difference.', 10], help: 14 }],
    'carniceria-el-cibao': [{ n: 'Freddy D.', lvl: 7, cnt: 96, d: 5, st: 5, src: 'vis', pesa: 1, peso: 1, fresco: 1, caja: 1, es: 'Fello pesa delante de uno y corta como se lo pidas.', en: 'Fello weighs in front of you and cuts it how you ask.', help: 19 }],
    'pescaderia-del-mar': [{ n: 'Mariela S.', lvl: 3, cnt: 9, d: 8, st: 5, src: 'vis', pesa: 1, peso: 1, fresco: 1, caja: 1, es: 'Chillo fresquecito, pesado entero antes de limpiarlo.', en: 'Very fresh snapper, weighed whole before cleaning.', help: 9 }],
    'mercado-quisqueyano': [{ n: 'Anny V.', lvl: 4, cnt: 17, d: 6, st: 5, src: 'ord', pesa: 1, peso: 1, fresco: 1, caja: 1, sust: 1, es: 'No tenían guineíto y me llamaron antes de cambiarlo.', en: 'They were out of green bananas and called before swapping.', help: 11 }],
  };
  const STATS = { 'supermercado-la-cosecha': { ver: 310, orders: 280, pesa: 97, peso: 98, fresco: 93, caja: 91, sust: 90, trato: 93 }, 'carniceria-el-cibao': { ver: 200, orders: 180, pesa: 100, peso: 99, fresco: 97, caja: 98, sust: 96, trato: 97 },
    'mercado-quisqueyano': { ver: 190, orders: 170, pesa: 98, peso: 99, fresco: 94, caja: 96, sust: 95, trato: 96 }, 'pescaderia-del-mar': { ver: 90, orders: 80, pesa: 100, peso: 99, fresco: 98, caja: 97, sust: 96, trato: 96 } };

  const PEOPLE0 = {}; Object.keys(STAFF).forEach(id => { PEOPLE0[id] = STAFF[id].map(p => ({ ph: p[4], langs: p[5], sp: p[6], bio: p[7], wk: p[8], cert: null, rate: '', dishes: [] })); });
  const CAT0 = { title: ['Quién te atiende', 'Who serves you'], rate: 0, next: 0, cert: 0, cta: 'menu' };
  const mk = (b, r, k) => ({ id: b.id + '-m' + k, name: r.n, lvl: r.lvl, cnt: r.cnt, d: r.d, stars: r.st, src: r.src, pesa: r.pesa, peso: r.peso, fresco: r.fresco, caja: r.caja, sust: r.sust, es: r.es, en: r.en, reply: r.rep || null, help: r.help || 0, ph: [], rec: [], topics: [] });
  function rev(b) { if (!b.n) return []; if (RV[b.id]) return RV[b.id].map((r, k) => mk(b, r, k)); const i = b.id.length;
    return [{ n: ['Yokasta M.', 'Luis R.', 'Ramón A.', 'Daisy T.'][i % 4], lvl: 3, cnt: 8, d: 6, st: 5, src: 'vis', pesa: b.tags.includes('pesa') ? 1 : null, caja: 1, es: 'Buen precio y atienden en español.', en: 'Good prices and they serve you in Spanish.', help: 3 }].map((r, k) => mk(b, r, k)); }
  const stats = b => STATS[b.id] || { ver: 0, orders: 0, pesa: 96, peso: 97, fresco: 93, caja: 95, sust: 93, trato: 94 };
  function asp(b, st, es) { const E2 = (x, y) => es ? x : y;
    return [['scale', E2('PESARON DELANTE DE TI', 'WEIGHED IN FRONT OF YOU'), st.pesa, 'rgba(0,229,196,.16)', '#00695B'], ['dollar', E2('COBRARON EL PESO REAL', 'CHARGED THE REAL WEIGHT'), st.peso, 'rgba(255,176,32,.16)', '#8A5A00'],
      ['check', E2('FRESCO', 'FRESH'), st.fresco, 'rgba(0,229,196,.16)', '#00695B'], ['tag', E2('PRECIO DEL ESTANTE = CAJA', 'SHELF PRICE = REGISTER'), st.caja, 'rgba(75,55,245,.1)', '#4B37F5'],
      ['phone', E2('SUSTITUCIONES CON TU OK', 'SWAPS WITH YOUR OK'), st.sust, 'rgba(11,14,18,.06)', '#0B0E12'], ['heart', E2('TRATO', 'HOW THEY TREATED YOU'), st.trato, 'rgba(0,229,196,.16)', '#00695B']].map(([ic, k, v, bg, fg]) => ({ ic: ic === 'tag' ? 'dollar' : ic, k, v: v + '%', bg, fg })); }
  const aspNote = (b, st, es) => es ? 'De ' + st.orders + " compras calificadas en To'Latino en los últimos 90 días." : 'From ' + st.orders + " rated To'Latino purchases in the last 90 days.";
  function facts(r, es) { const E2 = (x, y) => es ? x : y, G = '#00695B', R = '#C0392B', A = '#8A5A00', f = [];
    if (r.pesa === 1) f.push(['scale', E2('Pesaron delante', 'Weighed in front'), G]); else if (r.pesa === 0) f.push(['scale', E2('No pesaron delante', 'Not weighed in front'), R]);
    if (r.peso === 1) f.push(['dollar', E2('Cobraron el peso real', 'Charged the real weight'), G]); else if (r.peso === 0) f.push(['dollar', E2('Cobraron más del peso', 'Charged over the weight'), R]);
    if (r.caja === 0) f.push(['dollar', E2('La caja no cobró el precio del estante', 'Register did not match the shelf'), A]);
    if (r.sust === 0) f.push(['phone', E2('Cambiaron algo sin preguntar', 'Swapped something without asking'), A]); else if (r.sust === 1) f.push(['phone', E2('Llamaron antes de sustituir', 'Called before swapping'), G]);
    if (r.fresco === 0) f.push(['warning', E2('No estaba fresco', 'Not fresh'), R]);
    return f; }
  function reg() { const X2 = window.TLListing, S2 = window.TLStaff, R2 = window.TLRev, A2 = window.TLAll; if (!X2 || !S2 || !A2) return;
    ME.B.forEach(b => { b.merc = 1; if (!A2.B.some(x => x.id === b.id)) A2.B.push(b); });
    if (!X2.ABOUT['carniceria-el-cibao']) { Object.keys(SVC).forEach(id => { X2.MENU[id] = SVC[id].map(([te, tn, its]) => [te, tn, its.map(it => [it.n, it.d, it.p || 0, 0, 0])]); }); Object.assign(X2.ABOUT, ABOUT); ME.B.forEach(b => { if (b.addr) X2.ADDR[b.id] = b.addr + ', Hazleton PA'; }); Object.keys(STAFF).forEach(id => { X2.STAFF[id] = STAFF[id].map(p => [p[0], p[1], p[2], p[3]]); }); }
    if (!S2.PEOPLE['carniceria-el-cibao']) { Object.keys(STAFF).forEach(id => { S2.PEOPLE[id] = PEOPLE0[id]; }); } S2.CAT.merc = CAT0;
    if (R2 && !R2._merc) { const f = R2.forBiz, st = R2.stats, tp = R2.top, tc = R2.topics; R2._merc = 1; R2.forBiz = (b, i) => b.merc ? rev(b) : f(b, i); R2.stats = b => b.merc ? stats(b) : st(b); R2.top = b => b.merc ? [] : tp(b); R2.topics = b => b.merc ? [] : tc(b); } }
  reg(); (window.TLReg = window.TLReg || []).push(reg);

  /* ---------- Precios y pedido ---------- */
  const svcs = id => SVC[id] || [], flatOf = id => [].concat(...svcs(id).map(g => g[2]));
  const itOf = (own, key) => { const [si, ii] = String(key).split(':').map(Number), g = svcs(own)[si]; return g && g[2][ii]; };
  const QTY = { lb: [1, 2, 3, 5, 10], unid: [1, 2, 3, 6, 12], plato: [1, 2, 3, 4] };
  const optOf = id => OPTS[id] || { envio: null, min: 0 };
  const canOrder = b => b.pro && (b.tags.includes('pickup') || b.tags.includes('envio'));
  function priceFor(it, b, es) { const E2 = (a, c) => es ? a : c;
    if (it.k === 'lb') return { l: money(it.p) + '/lb', s: E2('SE COBRA LO QUE PESE', 'YOU PAY WHAT IT WEIGHS') };
    return { l: money(it.p), s: it.k === 'plato' ? E2('LISTO PARA LLEVAR', 'READY TO GO') : '' }; }
  const lineEst = (it, q) => it.p * q;
  const cartOf = (s, bid) => s.mcart && s.mcart.biz === bid ? s.mcart : null;
  const cartTot = (b, cart) => { let est = 0, byLb = 0; (cart ? cart.lines : []).forEach(l => { const it = itOf(b.id, l.key); if (!it) return; const v = lineEst(it, l.q); est += v; if (it.k === 'lb') byLb += v; }); return { est, byLb, hold: est + byLb * 0.1, n: cart ? cart.lines.length : 0 }; };
  function addLine(C, s, b, key, q, o) { const cur = cartOf(s, b.id), lines = (cur ? cur.lines : []).filter(l => !(l.key === key && JSON.stringify(l.o) === JSON.stringify(o))).concat({ key, q, o });
    C.setState({ mcart: { biz: b.id, lines }, ash: null, mToast: s.mcart && s.mcart.biz !== b.id ? 'replaced' : 'added' }); }

  /* ---------- Ficha ---------- */
  const EMPTY_SH = { groups: [], adds: [], pros: [], people: [], lbl: {}, x: { veh: {}, inc: [], no: [] } };
  function listingAdd(C, s, es, b, V, setTab, E, t) {
    const E2 = (x, y) => es ? x : y, pro = !!b.pro, dk = s.view === 'desktop', tg = k => b.tags.includes(k), line = LINE[es ? 0 : 1], ord = canOrder(b), cart = cartOf(s, b.id), CT = cartTot(b, cart), op = optOf(b.id);
    const openSheet = key => e => { stop(e); const it = itOf(b.id, key); C.setState({ ash: { biz: b.id, own: b.id, key, opt: { q: 0, o: 0 }, add: [], stf: 'any', merc: 1 }, bshTop: dk ? C.vTop() : 0 }); };
    const dirs = e => { stop(e); C.encargo('APP-MAPA', 'APP-NEG-LISTING · Mercados · Cómo llegar', b.name, E2('Cómo llegar', 'Directions')); };
    const secs = svcs(b.id).map(([te, tn, its], si) => ({ title: (es ? te : tn).toUpperCase(), items: its.map((it, ii) => { const key = si + ':' + ii, P = priceFor(it, b, es), inCart = cart ? cart.lines.filter(l => l.key === key).reduce((a, l) => a + l.q, 0) : 0;
      return { name: es ? it.n : it.ne || it.n, desc: es ? it.d : it.de || it.d, bg: U(it.ph || b.ph[0], 200), meta: [P.s, it.was ? E2('ANTES ', 'WAS ') + money(it.was) : '', inCart ? E2('EN TU PEDIDO: ', 'IN YOUR ORDER: ') + inCart + (it.k === 'lb' ? ' LB' : '') : ''].filter(Boolean).join(' · '), price: P.l, sym: [], hasPre: false, preL: '', onPre: () => {},
        can: pro, cur: pro ? 'pointer' : 'default', onOpen: pro ? openSheet(key) : () => {}, onBook: ord ? openSheet(key) : dirs, btnL: ord ? E2('Agregar', 'Add') : E2('Cómo llegar', 'Directions') }; }) }));
    const notes = [['scale', line + ' ' + (tg('pesa') ? E2('Aquí la balanza está de frente al cliente.', 'Here the scale faces the customer.') : '')]];
    if (ord) notes.push(['dollar', E2('En pedidos por libra se retiene el estimado + 10 % y se cobra lo que pesó, con la foto de la balanza. Lo que sobra se libera.', 'For by-the-pound orders the estimate + 10% is held and you pay what it weighed, with the scale photo. The rest is released.')]);
    if (ord) notes.push(['phone', E2('Si algo no hay, te preguntan antes de cambiarlo. Sin tu OK no se sustituye.', 'If something is out, they ask before swapping. Nothing is swapped without your OK.')]);
    if (tg('ebt')) notes.push(['card', E2('Acepta EBT / SNAP en la tienda' + (ord ? ' y en pickup.' : '.'), 'Takes EBT / SNAP in store' + (ord ? ' and at pickup.' : '.'))]);
    const act = !(cart && CT.n) && window.TLMercFlow ? window.TLMercFlow.mineCard(C, s, es, b) : null;
    const mine = act ? act : cart && CT.n ? { k: E2('TU PEDIDO', 'YOUR ORDER'), tag: CT.n + (CT.n === 1 ? E2(' ARTÍCULO', ' ITEM') : E2(' ARTÍCULOS', ' ITEMS')), tone: 'action', t: E2('Estimado ', 'Estimate ') + money(CT.est), s: CT.byLb ? E2('Lo que va por peso se cobra al pesar', 'By-weight items are charged when weighed') : '', onClick: () => window.TLMercFlow ? window.TLMercFlow.start(C, b.id) : C.encargo('APP-NEG-MERC-PEDIDO', 'APP-NEG-LISTING · Mercados · Tu pedido', b.name, E2('Pedido del mercado', 'Market order')) } : null;
    V.sv = { isChair: false, modes: [], bySvc: true, byPro: false, secs, pros: [], notes: pro ? notes.slice(0, 4).map(([icon, t2]) => ({ icon, t: t2 })) : [], hasMine: !!mine, mine: mine || {}, lbl: { page: '', book: E2('Agregar', 'Add') } };
    V.sh = s.ash && s.ash.biz === b.id && s.ash.merc ? sheetVals(C, s, es, b) : EMPTY_SH;
    V.ax = { veh: { has: pro, ic: 'scale', k: E2('¿LO PESAN DELANTE DE TI?', 'IS IT WEIGHED IN FRONT OF YOU?'), t: tg('pesa') ? E2('Sí: la balanza está de frente al cliente', 'Yes: the scale faces the customer') : E2('Pregunta en el mostrador', 'Ask at the counter'), hasS: false, s: '', hasP: ord, p: ord ? E2('En pedidos: foto de la balanza en cada artículo por peso.', 'On orders: a scale photo for every by-weight item.') : '', hasOk: tg('pesa'), okT: E2('Verificado por reseñas de clientes', 'Verified by customer reviews'), okFg: '#00695B', okIc: 'check', cta: '', onClick: () => {} },
      sz: { has: false, chips: [] }, q: { has: false },
      line: { has: pro, t: line, s: E2('Aquí ves el precio por libra, lo que se retiene en un pedido y cómo se cobra el peso real.', 'Here you see the price per pound, what an order holds and how the real weight is charged.') },
      how: { has: pro && ord, t: line, steps: [E2('Agregas lo que quieres; por libra es un estimado.', 'Add what you want; by the pound is an estimate.'), E2('Se retiene el estimado + 10 %. No se cobra todavía.', 'The estimate + 10% is held. Nothing is charged yet.'), E2('Lo pesan y te mandan la foto de la balanza. Si algo no hay, te preguntan.', 'They weigh it and send the scale photo. If something is out, they ask.'), E2('Se cobra lo que pesó y se libera el resto.', 'You pay what it weighed and the rest is released.')].map((x, i) => ({ n: String(i + 1), t: x })) } };
    V.shop = { items: [], hold: '', hasChips: false, chips: [], empty: true, note: '' };
    V.hx = { gal: { has: false, items: [] } };
    const TD = [[E2('PICKUP', 'PICKUP'), tg('pickup') ? E2('En 30–45 min', 'In 30–45 min') : E2('No', 'No')], [E2('ENVÍO', 'DELIVERY'), tg('envio') && op.envio != null ? (op.envio ? money(op.envio) : E2('Gratis', 'Free')) + (op.min ? E2(' · mín. ', ' · min ') + money(op.min) : '') : E2('No', 'No')], [E2('PAGO', 'PAYMENT'), tg('ebt') ? 'EBT · ' + E2('tarjeta · efectivo', 'card · cash') : E2('Tarjeta · efectivo', 'Card · cash')]];
    const AM = { pesa: ['scale', 'Pesan delante de ti', 'Weighed in front of you'], ebt: ['card', 'EBT / SNAP', 'EBT / SNAP'], pickup: ['bag', 'Pickup', 'Pickup'], envio: ['truck', 'Envío a tu casa', 'Home delivery'], estac: ['parking', 'Estacionamiento', 'Parking'], domingo: ['calendar', 'Abre domingos', 'Open Sundays'], noche: ['clock', 'Abre tarde', 'Open late'], esp: ['language', 'Atiende en español', 'Serves in Spanish'], remesas: ['dollar', 'Envíos de dinero', 'Money transfers'], mayoreo: ['cart', 'Al por mayor', 'Wholesale'] };
    const amen = b.tags.filter(k => AM[k]).map(k => ({ icon: AM[k][0], l: es ? AM[k][1] : AM[k][2] }));
    const facts = [{ icon: 'scale', k: E2('BALANZA', 'SCALE'), v: tg('pesa') ? E2('De frente al cliente', 'Faces the customer') : E2('Pregunta en el mostrador', 'Ask at the counter') }, { icon: 'card', k: E2('PAGO', 'PAYMENT'), v: (tg('ebt') ? 'EBT / SNAP · ' : '') + E2('tarjeta · efectivo', 'card · cash') }, { icon: 'language', k: E2('IDIOMAS', 'LANGUAGES'), v: tg('esp') ? 'Español · English' : 'English' }].map((f, i) => Object.assign(f, { bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }));
    const fq = s.faqOpen, FQ = [[E2('¿Cómo se cobra lo que va por peso?', 'How are by-weight items charged?'), E2('Se retiene el estimado + 10 %. Lo pesan, te mandan la foto de la balanza y se cobra el peso real. El resto se libera en 3–5 días.', 'The estimate + 10% is held. They weigh it, send the scale photo and charge the real weight. The rest is released in 3–5 days.')],
      [E2('¿Y si algo no hay?', 'What if something is out?'), E2('Te preguntan antes de cambiarlo por otro. Si no contestas en 10 minutos, lo quitan y no se cobra.', 'They ask before swapping. If you do not answer in 10 minutes, it is removed and not charged.')],
      [E2('¿Aceptan EBT?', 'Do they take EBT?'), tg('ebt') ? E2('Sí, en la tienda y en pickup. El envío se paga con tarjeta.', 'Yes, in store and at pickup. Delivery fee is paid by card.') : E2('No.', 'No.')]];
    const toSvc = () => { setTab('svc'); C.scrollTop(); };
    Object.assign(V, { cta: ord ? (mine ? (act ? E2('Ver tu pedido', 'View your order') : E2('Ver pedido', 'View order')) : E2('Ordenar', 'Order')) : pro ? E2('Cómo llegar', 'Directions') : t.call, ctaIcon: ord ? 'bag' : pro ? 'pin' : 'phone', onCta: ord ? (mine ? mine.onClick : toSvc) : pro ? dirs : E('APP-NEG-CONTACTO', 'Llamar', 'Contactar al negocio'),
      goMenu: toSvc, isSvc: V.tab === 'svc', isShop: false, isMenu: false, notMenu: true, mBar: false, fromBar: true, railOrder: false,
      itemsTop: [].concat(...secs.map(x => x.items)).slice(0, pro ? 4 : 5).map(it => ({ name: it.name, desc: it.meta ? it.meta.charAt(0) + it.meta.slice(1).toLowerCase() : '', price: it.price })),
      amen, facts, faq: pro ? FQ.map(([q, a], i) => ({ q, a, open: fq === i, chev: fq === i ? '180deg' : '0deg', onToggle: () => C.setState({ faqOpen: fq === i ? null : i }) })) : [],
      fromLabel: mine && !act ? E2('Estimado ', 'Estimate ') + money(CT.est) : V.fromLabel, barSub: (TD[0][0] + ' · ' + TD[0][1]).toUpperCase(), svc: [], hasSvc: false,
      railNote: E2(line + (ord ? ' Pides aquí; se cobra lo que pesó.' : ''), line + (ord ? ' Order here; you pay what it weighed.' : '')),
      lbl: { ...V.lbl, items: E2('Productos', 'Products'), menuAll: E2('Ver productos', 'See products') } });
    V.bkRail = { has: pro, rows: TD.map(([k, x]) => ({ k, v: x })), note: V.railNote, hasMine: !!mine, mine: mine || {} };
    V.silla = { has: false };
  }
  function sheetVals(C, s, es, b) { const E2 = (x, y) => es ? x : y, q = s.ash, dk = s.view === 'desktop', it = itOf(b.id, q.key); if (!it) return EMPTY_SH;
    const up = o => C.setState(z => ({ ash: { ...z.ash, opt: { ...z.ash.opt, ...o } } })), P = priceFor(it, b, es), QS = QTY[it.k] || QTY.unid, qi = q.opt.q || 0, qv = QS[qi], ord = canOrder(b);
    const oList = it.cut || it.punto || null, oi = q.opt.o || 0;
    const groups = [{ title: it.k === 'lb' ? E2('¿Cuánto? · estimado', 'How much? · estimate') : E2('¿Cuántos?', 'How many?'), meta: E2('ELIGE 1', 'CHOOSE 1'), req: true, done: true, opts: QS.map((n, i) => ({ label: it.k === 'lb' ? n + ' lb' : String(n), price: money(it.p * n) + (it.k === 'lb' ? E2(' aprox.', ' approx.') : ''), selected: qi === i })), onToggle: i => up({ q: i }) }]
      .concat(oList ? [{ title: it.cut ? E2('¿Cómo lo quieres?', 'How do you want it?') : E2('¿De qué punto?', 'How ripe?'), meta: E2('ELIGE 1', 'CHOOSE 1'), req: true, done: true, opts: oList.map((o, i) => ({ label: o[es ? 0 : 1], price: '', selected: oi === i })), onToggle: i => up({ o: i }) }] : []);
    const est = lineEst(it, qv), other = s.mcart && s.mcart.biz !== b.id && s.mcart.lines.length;
    const go = () => { if (!ord) { C.setState({ ash: null }); return C.encargo('APP-MAPA', 'APP-NEG-LISTING · Mercados · hoja', b.name, E2('Cómo llegar', 'Directions')); } addLine(C, s, b, q.key, qv, oList ? { o: oi } : {}); };
    const payT = it.k === 'lb' ? E2('Es un estimado: pesa distinto cada pieza. Se retiene ' + money(est * 1.1) + ' y se cobra lo que pese, con la foto de la balanza.', 'This is an estimate: each piece weighs differently. ' + money(est * 1.1) + ' is held and you pay what it weighs, with the scale photo.') : E2('Precio del estante. Si no hay, te preguntan antes de cambiarlo.', 'Shelf price. If it is out, they ask before swapping.');
    return { open: !dk, dlg: dk, top: (s.bshTop || 80) + 'px', onClose: () => C.setState({ ash: null }), stop, name: es ? it.n : it.ne, desc: es ? it.d : it.de, bg: U(it.ph || b.ph[0], 700), price: P.l, meta: P.s,
      groups, adds: [], hasAdds: false, hasWho: false, isPick: false, isStaff: false, pros: [], people: [], stf: 'any', onStf: () => {},
      whoPend: false, whoDone: false, whoMeta: '', hasDep: true, depT: payT + (other ? E2(' Tienes un pedido en otro mercado; si agregas aquí, se reemplaza.', ' You have an order at another market; adding here replaces it.') : ''), total: money(est) + (it.k === 'lb' ? E2(' aprox.', ' approx.') : ''),
      durL: it.k === 'lb' ? E2('ESTIMADO', 'ESTIMATE') : 'TOTAL', cta: ord ? E2('Agregar al pedido', 'Add to order') : E2('Cómo llegar', 'Directions'), dis: false, onGo: go,
      lbl: { req: E2('Elige: ', 'Choose: '), ready: E2('Listo', 'Done'), adds: '', addsM: '', who: '', any: '', incK: '', noK: E2('IMPORTANTE', 'IMPORTANT') },
      x: { hasPre: false, preT: '', preS: '', preCta: '', onPre: () => {}, hasVeh: false, veh: {}, hasInc: false, inc: [], hasNo: false, no: [] } }; }
  function resAdd(C, s, es, b, v, td, trust) { const E2 = (x, y) => es ? x : y, tg = k => b.tags.includes(k), op = optOf(b.id);
    Object.assign(td, { s: (canOrder(b) ? E2('Pide para pickup' + (tg('envio') ? ' o envío' : '') + '; se cobra lo que pesó. ', 'Order for pickup' + (tg('envio') ? ' or delivery' : '') + '; you pay what it weighed. ') : E2('Ve directo; no toma pedidos en To\'Latino. ', 'Walk in; no To\'Latino orders. ')) + LINE[es ? 0 : 1],
      cols: [[E2('HASTA', 'UNTIL'), fmt((b.hrs || [9, 17])[1])], [E2('PAGO', 'PAYMENT'), tg('ebt') ? 'EBT' : E2('Tarjeta', 'Card')], [E2('ENVÍO', 'DELIVERY'), tg('envio') && op.envio != null ? (op.envio ? money(op.envio) : E2('Gratis', 'Free')) : E2('No', 'No')]].map(([k, x]) => ({ k, v: x })), hasNo: false, hasLink: false, hasFoot: false });
    if (!b.pro) return;
    const mk = (ic, label, tone) => ({ ic, t: label, fg: tone === 'ok' ? '#00695B' : '#4B37F5', icon: ic, label, tone });
    const T = [trust[0], tg('pesa') ? mk('scale', E2('Pesan delante de ti', 'Weighed in front of you'), 'ok') : null, tg('ebt') ? mk('card', 'EBT / SNAP', 'info') : null, trust.find(x => x.icon === 'star')].filter(Boolean); trust.splice(0, trust.length, ...T); }
  window.TLMercL = { SVC, STAFF, RV, OPTS, rev, stats, asp, aspNote, facts, listingAdd, sheetVals, resAdd, priceFor, svcs, flatOf, itOf, canOrder, cartOf, cartTot, lineEst, optOf, QTY, PEOPLE0 };
})();
