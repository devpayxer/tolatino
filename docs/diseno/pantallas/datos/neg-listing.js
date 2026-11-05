/* Página base del negocio (APP-NEG-LISTING-PRO / -FREE) — contenido de ejemplo por negocio. Hoy: jue 24 sep 2026. */
(function () {
  const P = (id, h) => 'url(https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 350) + ')';
  const POSTS = {
    'sabor-dominicano': [['of', 'Mofongo de chicharrón $12, hasta agotar.', 'Pork-rind mofongo $12, while it lasts.', 2, 0], ['nv', 'Hoy hay sancocho, desde las 12 PM.', 'Sancocho today, from 12 PM.', 4, 1], ['of', 'Delivery gratis en pedidos de más de $30.', 'Free delivery on orders over $30.', 6, 2]],
    'panaderia-la-espiga': [['nv', 'Pan de agua caliente desde las 7 AM.', 'Hot pan de agua from 7 AM.', 3, 0], ['ll', 'Bizcocho dominicano por libra, pídelo hoy.', 'Dominican cake by the pound, order today.', 5, 1]],
    'pollo-don-lucho': [['of', 'Pollo entero + papas $19 los martes.', 'Whole chicken + fries $19 on Tuesdays.', 4, 0]],
    'empanadas-dona-tere': [['of', 'Docena de empanadas $15 este sábado.', 'A dozen empanadas $15 this Saturday.', 8, 0], ['nv', 'Nuevo relleno: pollo con queso.', 'New filling: chicken and cheese.', 9, 1], ['of', 'Pedidos para el domingo hasta el viernes 6 PM.', 'Sunday orders until Friday 6 PM.', 11, 2]],
    'jugos-tropical': [['ll', 'Llegó la chinola: jugo grande $4.', 'Passion fruit is in: large juice $4.', 1, 0], ['of', 'Morir soñando 2 por $7 hasta las 3 PM.', 'Morir soñando 2 for $7 until 3 PM.', 3, 1]],
    'dulces-mama-yoli': [['nv', 'Tomando pedidos de bizcocho para el sábado.', 'Taking cake orders for Saturday.', 3, 0]],
  };
  const ABOUT = {
    'sabor-dominicano': ['Cocina dominicana en Wyoming St desde 2014. Doña Rosa y su familia cocinan todos los días: la bandera al mediodía, mofongo y chivo guisado en la noche. Catering para bautizos, cumpleaños y oficinas.', 'Dominican kitchen on Wyoming St since 2014. Doña Rosa and her family cook every day: la bandera at noon, mofongo and goat stew at night. Catering for baptisms, birthdays and offices.', 2014],
    'panaderia-la-espiga': ['Pan de agua, pan sobao y bizcocho dominicano horneados aquí desde las 5 AM. Encargos de bizcocho con 48 horas.', 'Pan de agua, pan sobao and Dominican cake baked here from 5 AM. Cake orders with 48 hours notice.', 2011],
    'fritura-dona-carmen': ['Frituras de la casa: quipes, pastelitos, chicharrón y yaniqueques. Pickup en la ventana de Alter St.', 'Home-style fried food: quipes, pastelitos, chicharrón and yaniqueques. Pickup at the Alter St window.', 2020],
    'el-fogon': ['Parrilla dominicana en Wyoming St: churrasco, chuleta ahumada y pica pollo al carbón. Abierto hasta la medianoche.', 'Dominican grill on Wyoming St: churrasco, smoked pork chops and charcoal fried chicken. Open until midnight.', 2017],
    "el-coqui-boricua": ["Comida puertorriqueña en Hazleton: mofongo, arroz con gandules, alcapurrias y alitas. Cocina la familia Rivera, de Bayamón.","Puerto Rican food in Hazleton: mofongo, arroz con gandules, alcapurrias and wings. Cooked by the Rivera family, from Bayamón.",2020],
    "la-habana-sandwich": ["Sándwich cubano, medianoche y tortas mexicanas en pan del día. Café cubano desde las 7 AM.","Cuban sandwich, medianoche and Mexican tortas on fresh bread. Cuban coffee from 7 AM.",2021],
    "asados-la-pampa": ["Parrilla argentina y brasileña a la leña: vacío, entraña, picanha y choripán. Argentinos y un parrillero brasileño en Hazleton.","Argentinian and Brazilian wood-fired grill: vacío, skirt steak, picanha and choripán. Argentinians and a Brazilian grill cook in Hazleton.",2019],
    "meal-prep-yuli": ["Comida de la semana hecha en cocina certificada: almuerzos dominicanos balanceados y un plan vegano. Pides hasta el domingo, llega el lunes.","Weekly meals from a certified kitchen: balanced Dominican lunches and a vegan plan. Order by Sunday, delivered Monday.",2022],
    "chef-ramon": ["Chef privado: cocino en tu casa cenas dominicanas y españolas para 2 a 20 personas. Cotización por escrito.","Private chef: I cook Dominican and Spanish dinners at your home for 2 to 20 people. Written quote.",2018],
    "barra-movil-el-trago": ["Barra móvil y bartenders para bodas, quinceañeras y cumpleaños. Tú pones las bebidas; nosotros, la barra y el servicio.","Mobile bar and bartenders for weddings, quinceañeras and birthdays. You bring the drinks; we bring the bar and service.",2021],
    "pasteles-arte-dulce": ["Pasteles decorados para bautizos, quinceañeras y bodas. Bizcocho dominicano con suspiro o fondant, hecho por encargo.","Decorated cakes for baptisms, quinceañeras and weddings. Dominican cake with meringue or fondant, made to order.",2017],
    "cocina-alma-delivery": ["Cocina solo para entrega, de 4 PM a 11 PM: burgers, bowls y chimis con sabor latino. Sin local: todo llega a tu puerta.","Delivery-only kitchen, 4 PM to 11 PM: burgers, bowls and chimis with Latin flavor. No storefront: everything comes to your door.",2023],
    'cafe-quisqueya': ['Café dominicano y desayunos desde las 7 AM: mangú, tostadas y café colado al momento.', 'Dominican coffee and breakfast from 7 AM: mangú, toast and fresh-brewed coffee.', 2019],
    'pollo-don-lucho': ['Pollo a la brasa al estilo peruano, marinado 24 horas y asado a la leña. También lomo saltado y ají de gallina.', 'Peruvian-style rotisserie chicken, marinated 24 hours and wood-roasted. Also lomo saltado and ají de gallina.', 2018],
    'tacos-el-guero': ['Camión de tacos en la esquina de Broad y Pine. Tortillas hechas a mano y al pastor del trompo, hasta las 2 AM.', 'Taco truck at the corner of Broad and Pine. Handmade tortillas and al pastor off the spit, until 2 AM.', 2021],
    'mariscos-la-bahia': ['Pescado y mariscos frescos al estilo de Samaná. Abre para la cena, de 4 PM a 10 PM.', 'Fresh fish and seafood, Samaná style. Open for dinner, 4 PM to 10 PM.', 2016],
    'empanadas-dona-tere': ['Empanadas colombianas hechas en casa, solo sábados y domingos. Pide con anticipación y pasa a recoger.', 'Homemade Colombian empanadas, Saturdays and Sundays only. Order ahead and pick up.', 2022],
    'jugos-tropical': ['Jugos naturales y batidos con la fruta del día: chinola, lechosa, guineo. Morir soñando como en la capital.', 'Fresh juices and shakes with the fruit of the day: passion fruit, papaya, banana. Morir soñando like back home.', 2020],
    'catering-hazleton': ['Catering dominicano para bautizos, quinceañeras y oficinas, de 20 a 200 personas. Cotización gratis; el precio final se confirma por escrito.', 'Dominican catering for baptisms, quinceañeras and offices, 20 to 200 guests. Free quote; the final price is confirmed in writing.', 2015],
    'dulces-mama-yoli': ['Bizcocho dominicano, suspiro y dulces caseros por encargo. Se recoge en N Laurel St.', 'Dominican cake, meringue frosting and homemade sweets to order. Pickup on N Laurel St.', 2019],
    'cocina-miguelina': ['Comida casera los fines de semana: sancocho, locrio y moro. Se acaba temprano.', 'Home cooking on weekends: sancocho, locrio and moro. It sells out early.', 2021],
    'pupuseria-morazan': ['Pupusas salvadoreñas hechas al momento, con curtido y salsa de la casa.', 'Salvadoran pupusas made to order, with curtido and house salsa.', 2017],
    'pizza-express': ['Pizza, calzones y alitas para llevar o delivery, hasta la medianoche.', 'Pizza, calzones and wings for pickup or delivery, until midnight.', 2012],
    'burger-81': ['Hamburguesas a la plancha y papas fritas, cerca de la I-81.', 'Griddled burgers and fries, near I-81.', 2018],
    'arepas-caracas': ['Arepas, cachapas y tequeños venezolanos desde el desayuno.', 'Venezuelan arepas, cachapas and tequeños from breakfast on.', 2020],
    'chimi-el-primo': ['Chimi, hot dog dominicano y papas locas en el camión de Alter St, de 6 PM a 2 AM.', 'Chimi burgers, Dominican hot dogs and loaded fries at the Alter St truck, 6 PM to 2 AM.', 2019],
    'flan-y-mas': ['Flanes y tres leches por porción o enteros, sábados y domingos.', 'Flan and tres leches by the slice or whole, Saturdays and Sundays.', 2022],
    'desayunos-mi-viejo': ['Desayuno dominicano desde las 6 AM: mangú, huevos con salami y café con leche.', 'Dominican breakfast from 6 AM: mangú, eggs with salami and café con leche.', 2016],
    'taqueria-guerrero': ['Tacos de trompo y de lengua, y tortas al estilo de Guerrero. Pozole los fines de semana.', 'Trompo and tongue tacos, and Guerrero-style tortas. Pozole on weekends.', 2015],
    'batidos-dona-ana': ['Batidos y jugos naturales hechos al momento con la fruta del día.', 'Shakes and fresh juices made to order with the fruit of the day.', 2021],
    'antojitos-la-guera': ['Elotes, esquites, raspados y mangonadas los fines de semana.', 'Elotes, esquites, shaved ice and mangonadas on weekends.', 2023],
  };
  const MENU = {
    'sabor-dominicano': [['Almuerzo', 'Lunch', [['La bandera', 'Arroz, habichuelas, pollo guisado y ensalada', 12], ['Chivo guisado', 'Con arroz blanco y tostones', 16], ['Pescado frito', 'Con tostones y ensalada', 18]]], ['De la casa', 'House specials', [['Mofongo de chicharrón', 'Con caldo de pollo', 12], ['Sancocho', 'Solo sábados y domingos', 14], ['Mangú con los tres golpes', 'Salami, queso frito y huevo', 11]]], ['Bebidas', 'Drinks', [['Morir soñando', 'Grande', 5], ['Jugo de chinola', 'Natural', 4]]]],
    'panaderia-la-espiga': [['Pan', 'Bread', [['Pan de agua', 'Docena', 6], ['Pan sobao', 'Docena', 7]]], ['Bizcochos', 'Cakes', [['Bizcocho dominicano', 'Por libra, relleno de piña', 18], ['Tres leches', 'Porción', 5]]]],
    'fritura-dona-carmen': [['Frituras', 'Fried', [['Quipe', 'Unidad', 2], ['Pastelito de pollo', 'Unidad', 2.5], ['Chicharrón', 'Libra', 12], ['Yaniqueque', 'Unidad', 2], ['Plato mixto', 'Salami, queso y tostones', 10]]]],
    'el-fogon': [['Parrilla', 'Grill', [['Churrasco', 'Con tostones y chimichurri', 24], ['Chuleta ahumada', 'Con moro y ensalada', 16], ['Pica pollo', 'Cuarto de pollo frito con tostones', 9]]], ['Acompañantes', 'Sides', [['Tostones', 'Porción', 5], ['Yuca frita', 'Porción', 5]]], ['Bebidas', 'Drinks', [['Morir soñando', 'Grande', 5]]]],
    'cafe-quisqueya': [['Desayunos', 'Breakfast', [['Mangú con los tres golpes', 'Salami, queso frito y huevo', 11], ['Tostada con huevo', 'Pan de agua, huevo y queso', 7], ['Avena caliente', 'Con canela', 4]]], ['Café', 'Coffee', [['Café con leche', 'Colado al momento', 3], ['Cortadito', 'Pequeño', 2.5], ['Chocolate caliente', 'Con queso de hoja', 3.5]]]],
    'pollo-don-lucho': [['Pollo a la brasa', 'Rotisserie chicken', [['Pollo entero', 'Con papas y ensalada', 22], ['Medio pollo', 'Con papas y ensalada', 12], ['Cuarto de pollo', 'Con papas', 8]]], ['Peruano', 'Peruvian', [['Lomo saltado', 'Con arroz y papas', 17], ['Ají de gallina', 'Con arroz', 14]]], ['Bebidas', 'Drinks', [['Chicha morada', 'Grande', 4], ['Inca Kola', 'Lata', 2.5]]]],
    'tacos-el-guero': [['Tacos', 'Tacos', [['Al pastor', 'Del trompo, con piña', 3.5], ['Asada', 'Con cebolla y cilantro', 3.5], ['Carnitas', 'Estilo Michoacán', 3.5]]], ['Platos', 'Plates', [['Quesabirria', 'Tres, con consomé', 14], ['Burrito de asada', 'Con frijoles y arroz', 12]]], ['Bebidas', 'Drinks', [['Horchata', 'Grande', 4]]]],
    'mariscos-la-bahia': [['Del mar', 'From the sea', [['Pescado frito', 'Chillo entero con tostones', 22], ['Camarones al ajillo', 'Con arroz blanco', 21], ['Mofongo de camarones', 'Con salsa criolla', 22]]], ['Sopas', 'Soups', [['Sopa de mariscos', 'Para uno', 16]]], ['Bebidas', 'Drinks', [['Jugo de chinola', 'Natural', 4]]]],
    'empanadas-dona-tere': [['Empanadas', 'Empanadas', [['De carne', 'Masa de maíz, papa y res', 1.75], ['De pollo', 'Masa de maíz, papa y pollo', 1.75], ['Pollo con queso', 'Nueva', 2], ['Docena surtida', 'Doce, con ají de la casa', 20]]], ['Para acompañar', 'Extras', [['Ají de la casa', 'Vasito', 1], ['Avena colombiana', 'Fría', 3.5]]]],
    'jugos-tropical': [['Jugos', 'Juices', [['Jugo de chinola', 'Grande', 4], ['Morir soñando', 'Grande', 4], ['Jugo verde', 'Apio, piña y espinaca', 5]]], ['Batidos', 'Shakes', [['Batido de lechosa', 'Grande', 5], ['Batido de guineo', 'Grande', 5]]]],
    'catering-hazleton': [['Bandejas', 'Trays', [['Arroz con pollo', 'Para 20 personas', 90], ['Pica pollo', 'Para 20 personas', 120], ['Pastelitos', '50 unidades', 60]]], ['Servicio', 'Service', [['Montaje y servicio', 'Hasta 4 horas', 150]]]],
    "el-coqui-boricua": [["Platos","Plates",[["Mofongo con pernil","Con caldo de pollo",15],["Arroz con gandules y pernil","Con ensalada",14]]],["Alitas y frituras","Wings & fritters",[["Alitas (10)","Guayaba BBQ o picantes",13],["Alcapurrias (2)","De carne",6]]]],
    "la-habana-sandwich": [["Sándwiches","Sandwiches",[["Cubano","Pernil, jamón, queso suizo, pepinillo",11],["Medianoche","En pan dulce",10],["Torta de milanesa","Pan telera, aguacate, jalapeño",12]]],["Café","Coffee",[["Café cubano","Colado al momento",2.5]]]],
    "asados-la-pampa": [["Parrilla","Grill",[["Parrillada para 2","Vacío, chorizo, morcilla, pollo",42],["Picanha","Con farofa y vinagreta",26],["Choripán","Con chimichurri",9]]],["Para empezar","Starters",[["Empanada argentina","Carne cortada a cuchillo",3.5],["Pan de queso (6)","Pão de queijo",6]]]],
    "meal-prep-yuli": [["Planes","Plans",[["Plan de 5 comidas","Almuerzo de lunes a viernes",55],["Plan de 10 comidas","Almuerzo y cena",99],["Plan vegano · 5","Cambia cada semana",58]]]],
    "chef-ramon": [["Cenas","Dinners",[["Cena para 6","Tres tiempos · desde",240],["Cena para 12","Tres tiempos · desde",420]]],["Clases","Classes",[["Clase en tu cocina","2 horas, hasta 6 personas",150]]]],
    "barra-movil-el-trago": [["Paquetes","Packages",[["Barra para 50 personas","4 horas, 1 bartender",450],["Bartender extra","Por hora",45],["Mocktails para niños","Hasta 30 niños",120]]]],
    "pasteles-arte-dulce": [["Pasteles","Cakes",[["Pastel decorado · 1 piso","Para 25 personas",85],["Pastel decorado · 2 pisos","Para 60 personas",160],["Cupcakes decorados (12)","Con tu tema",36]]]],
    "cocina-alma-delivery": [["Lo de la casa","House",[["Burger dominicana","Con salami frito y queso de hoja",12],["Bowl de pernil","Arroz, habichuelas, maduros",13],["Chimi de pollo","Con papas",10]]]],
    "hielo-agua-cristal": [["Hielo","Ice",[["Bolsa de hielo 10 lb","En cubos",3],["Bolsa de hielo 20 lb","En cubos",5]]],["Agua","Water",[["Botellón 5 gal","Trae el vacío",7]]]],
    "paella-valencia": [["Paellas","Paellas",[["Paella mixta para 2","Mariscos y pollo",34]]],["Tapas","Tapas",[["Tortilla española","Con alioli",9],["Croquetas de jamón (6)","Caseras",8]]]],
    "tamales-dona-chayo": [["Tamales","Tamales",[["Tamal colorado","Cerdo, en hoja de plátano",3.5],["Docena de tamales","Colorados o negros",38],["Chuchito","En tuza",2.5]]]],
    "baleadas-la-ceiba": [["Baleadas","Baleadas",[["Baleada sencilla","Frijoles, queso, mantequilla",3],["Baleada con todo","Con huevo y aguacate",5]]],["Platos","Plates",[["Pollo con tajadas","Con repollo y salsa",12]]]],
    "encebollado-el-guayas": [["Desayuno","Breakfast",[["Encebollado","Con chifles",12],["Bolón de verde","Queso o chicharrón",6]]],["Platos","Plates",[["Ceviche de camarón","Con canguil",14]]]],
    "wok-chofan-express": [["Platos","Plates",[["Chofán de la casa","Cerdo, pollo y camarón",12],["Pollo agridulce","Con arroz blanco",11],["Wonton frito (8)","Con salsa",6]]]],
    "buffet-la-mesa-latina": [["Buffet","Buffet",[["Almuerzo","Hasta las 4 PM",13.99],["Cena","Desde las 4 PM",16.99],["Caja para llevar","Por libra",7.99]]]],
    "paleteria-la-michoacana": [["Paletas y helado","Pops & ice cream",[["Paleta de fruta","Mango, fresa, coco",2.5],["Helado (2 bolas)","En vaso o cono",4.5]]],["Aguas y raspados","Aguas & raspados",[["Raspado","Tamarindo, mango, fresa",4],["Agua fresca grande","Horchata o jamaica",4.5]]]],
    "boba-tropical": [["Boba","Boba",[["Boba de dulce de leche","Con tapioca",6],["Boba de chinola","Sin té",6]]],["Frías","Cold",[["Café frío de horchata","Con canela",5.5]]]],
    "carrito-don-nico": [["Frituras","Fritters",[["Yaniqueque","Recién hecho",2],["Quipe","De carne",1.5],["Chicharrón (1/2 lb)","Con limón",6]]]],
    'empanadas-dona-luz': [['Empanadas', 'Empanadas', [['Empanada de pollo', 'Hecha en casa', 2.5], ['Empanada de queso', 'Hecha en casa', 2.5], ['Docena surtida', 'Pollo, carne y queso', 26]]]],
    'dulces-mama-yoli': [['Dulces', 'Sweets', [['Bizcocho dominicano', 'Por libra, con suspiro', 18], ['Majarete', 'Vasito', 4], ['Dulce de leche cortada', 'Porción', 5], ['Suspiritos', 'Docena', 6]]]],
    'cocina-miguelina': [['Fin de semana', 'Weekends', [['Sancocho', 'Con arroz blanco y aguacate', 12], ['Locrio de pollo', 'Con ensalada', 11], ['Moro con chuleta', 'Moro de guandules', 12], ['Asopao de pollo', 'Para uno', 10]]]],
    'pupuseria-morazan': [['Pupusas', 'Pupusas', [['Revuelta', 'Chicharrón, frijol y queso', 3], ['Queso con loroco', 'Unidad', 3.25], ['Frijol con queso', 'Unidad', 3]]], ['Más', 'More', [['Plátano frito', 'Con crema y frijoles', 6], ['Horchata', 'Grande', 3]]]],
    'pizza-express': [['Pizzas', 'Pizzas', [['Pizza de queso', 'Grande, 8 pedazos', 14], ['Pizza pepperoni', 'Grande, 8 pedazos', 16], ['Calzone', 'Jamón y queso', 11]]], ['Más', 'More', [['Alitas', '10 unidades', 13], ['Refresco', '2 litros', 4]]]],
    'burger-81': [['Hamburguesas', 'Burgers', [['Clásica', 'Con papas', 9], ['Doble con queso', 'Con papas', 12]]], ['Más', 'More', [['Papas fritas', 'Porción grande', 4], ['Batida de vainilla', 'Grande', 5]]]],
    'arepas-caracas': [['Arepas', 'Arepas', [['Reina pepiada', 'Pollo y aguacate', 9], ['Pabellón', 'Carne mechada, caraotas y plátano', 11]]], ['Más', 'More', [['Cachapa con queso', 'De mano', 10], ['Tequeños', '6 unidades', 8]]]],
    'chimi-el-primo': [['Del camión', 'From the truck', [['Chimi de res', 'Con repollo y salsa', 8], ['Chimi de pollo', 'Con repollo y salsa', 8], ['Hot dog dominicano', 'Con papitas', 5], ['Papas locas', 'Con queso y salami', 7]]], ['Bebidas', 'Drinks', [['Morir soñando', 'Grande', 4]]]],
    'flan-y-mas': [['Flanes', 'Flan', [['Flan de leche', 'Porción', 4], ['Flan de coco', 'Porción', 4.5], ['Flan entero', '8 porciones, por encargo', 24]]], ['Más', 'More', [['Tres leches', 'Porción', 5]]]],
    'desayunos-mi-viejo': [['Desayunos', 'Breakfast', [['Mangú con los tres golpes', 'Salami, queso frito y huevo', 10], ['Huevos con salami', 'Con pan tostado', 8], ['Avena', 'Caliente, con canela', 3.5]]], ['Bebidas', 'Drinks', [['Café con leche', 'Grande', 2.5]]]],
    'taqueria-guerrero': [['Tacos', 'Tacos', [['Tacos de trompo', 'Tres, con piña', 9], ['Tacos de lengua', 'Tres', 11]]], ['Platos', 'Plates', [['Torta de milanesa', 'Con aguacate', 11], ['Pozole rojo', 'Sábados y domingos', 13]]], ['Bebidas', 'Drinks', [['Agua de jamaica', 'Grande', 3]]]],
    'batidos-dona-ana': [['Batidos', 'Shakes', [['Batido de lechosa', 'Grande', 5], ['Batido de zapote', 'Grande', 5.5], ['Morir soñando', 'Grande', 4.5], ['Jugo de naranja', 'Natural', 4]]]],
    'antojitos-la-guera': [['Antojitos', 'Snacks', [['Elote preparado', 'Con mayonesa, queso y chile', 4], ['Esquites', 'Vaso grande', 4], ['Mangonada', 'Con chamoy y tajín', 6], ['Raspado de mango', 'Grande', 3.5]]]],
  };
  const GEN = [['Del día', 'Today', [['Plato del día', 'Pregunta qué hay hoy', 12], ['Especial de la casa', 'Con acompañante', 14], ['Bebida natural', 'Grande', 4]]]];
  const ADDR = {
    'sabor-dominicano-alter': '412 Alter St, Hazleton PA', 'sabor-dominicano': '412 N Wyoming St, Hazleton PA', 'panaderia-la-espiga': '28 E Broad St, Hazleton PA', 'el-fogon': '690 N Wyoming St, Hazleton PA', 'cafe-quisqueya': '15 W Broad St, Hazleton PA', 'pollo-don-lucho': '221 N Church St, Hazleton PA', 'tacos-el-guero': 'E Broad St y N Pine St, Hazleton PA', 'mariscos-la-bahia': '318 W Diamond Ave, Hazleton PA', 'empanadas-dona-tere': '144 N Laurel St, Hazleton PA', 'jugos-tropical': '57 E Broad St, Hazleton PA', 'catering-hazleton': '900 N Church St, Hazleton PA', 'fritura-dona-carmen': '155 Alter St, Hazleton PA', 'dulces-mama-yoli': '402 N Laurel St, Hazleton PA', 'empanadas-dona-luz': 'Peace St, Hazleton PA', 'cocina-miguelina': '233 Carson St, Hazleton PA', 'pupuseria-morazan': '18 N Wyoming St, Hazleton PA', 'pizza-express': '101 S Wyoming St, Hazleton PA', 'burger-81': '520 Airport Rd, Hazleton PA', 'arepas-caracas': '77 W Diamond Ave, Hazleton PA', 'chimi-el-primo': 'Alter St y E Oak St, Hazleton PA', 'flan-y-mas': '36 N Vine St, Hazleton PA', 'desayunos-mi-viejo': '12 S Laurel St, Hazleton PA', 'taqueria-guerrero': '300 N James St, Hazleton PA', 'batidos-dona-ana': '9 E Diamond Ave, Hazleton PA', 'antojitos-la-guera': '22 N Wyoming St, Hazleton PA' };
  const REV = [
    ['Yokasta M.', 'HACE 3 DÍAS', 5, 'La bandera como en casa. Pedí pickup y a los 20 minutos estaba lista, caliente.', 'The bandera tastes like home. Ordered pickup and it was ready and hot in 20 minutes.', 'Gracias, Yokasta. Te esperamos el sábado para el sancocho.', 4.12],
    ['Luis R.', 'HACE 1 SEMANA', 5, 'El mofongo vale la pena. Los viernes en la noche hay espera, llega temprano.', 'The mofongo is worth it. Friday nights there is a wait, get there early.', '', 2.14],
    ['Kathy P.', 'HACE 2 SEMANAS', 4, 'Buena comida y precio justo. El delivery tardó más de lo que decía la app.', 'Good food, fair price. Delivery took longer than the app said.', 'Tienes razón, ese día tuvimos un solo chofer. Ya contratamos otro.', 38.98],
  ];
  const NAMES = ['Yokasta M.', 'Luis R.', 'Kathy P.', 'Ramón A.', 'Daisy T.', 'Wilfredo C.', 'Mariela S.', 'José L.', 'Anny V.'];
  function revFor(b, i) {
    if (b.id === 'sabor-dominicano') return REV;
    const fin = b.days === 'finde';
    const G = [
      ['HACE 3 DÍAS', 5, 'Todo fresco y bien servido. Pedí para llevar y estaba listo a tiempo.', 'Everything fresh and generous. Ordered to go and it was ready on time.', 1],
      ['HACE 1 SEMANA', 5, fin ? 'Buen precio y te atienden en español. El sábado temprano hay fila.' : 'Buen precio y te atienden en español. Los viernes hay fila, llega temprano.', fin ? 'Fair prices and they speak Spanish. Early Saturday there is a line.' : 'Fair prices and they speak Spanish. Fridays there is a line, get there early.', 0],
      ['HACE 2 SEMANAS', 4, 'Rico, pero esperé más de lo que me dijeron. Igual vuelvo.', 'Tasty, but I waited longer than they said. I will be back anyway.', 2],
    ];
    return G.map((g, k) => { const name = NAMES[(i * 2 + k) % NAMES.length], first = name.split(' ')[0];
      return [name, g[0], g[1], g[2], g[3], g[4] === 1 ? 'Gracias, ' + first + '. Te esperamos pronto.' : g[4] === 2 ? 'Tienes razón, ese día estábamos cortos de personal. Ya lo resolvimos.' : '']; });
  }
  const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'], DOWEN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dur = m => { const h = Math.floor(m / 60), mm = m % 60; return h ? h + ' h' + (mm ? ' ' + mm + ' min' : '') : mm + ' min'; };
  const fmt = h => { const hh = Math.floor(h) % 24, m = Math.round((h - Math.floor(h)) * 60); return ((hh % 12) || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (hh < 12 ? ' AM' : ' PM'); };
  const rng = (a, b) => fmt(a) + ' – ' + fmt(b);
  const closeH = st => { const m = /cierra (\d+) (AM|PM)/.exec(st || ''); if (!m) return 21; const h = +m[1] % 12 + (m[2] === 'PM' ? 12 : 0); return h === 0 ? 24 : h < 6 ? h + 24 : h; };
  function hoursPro(b, es) {
    const NOW = 12.5, HR = b.hrs || [11, closeH(b.st)], o = HR[0], c = HR[1], fin = b.days === 'finde', open = !!b.open;
    const cl = (es ? ' · cierra a las ' : ' · closes at ') + fmt(c);
    const tl = fin ? [] : o >= 16 ? [[o, c, (es ? 'Cena' : 'Dinner') + cl]] : o < 11 ? [[o, 12, es ? 'Mañana' : 'Morning'], [12, c, (es ? 'Tarde' : 'Afternoon') + cl]] : [[o, 16, es ? 'Almuerzo' : 'Lunch'], [16, c, (es ? 'Cena' : 'Dinner') + cl]];
    const hpToday = fin ? [{ range: es ? 'Hoy cerrado' : 'Closed today', label: (es ? 'Abre sáb y dom · ' : 'Open Sat & Sun · ') + rng(o, c), op: 1, dot: '#fff', ring: 'rgba(11,14,18,.3)', nowDisp: 'none', lineDisp: 'none' }]
      : tl.map((t, i) => { const now = open && NOW >= t[0] && NOW < t[1], past = NOW >= t[1];
        return { range: rng(t[0], t[1]), label: t[2], op: past ? .45 : 1, dot: now ? '#00A88F' : '#fff', ring: now ? '#00A88F' : '#0B0E12', nowDisp: now ? 'inline-block' : 'none', lineDisp: i < tl.length - 1 ? 'block' : 'none' }; });
    const hpCountdown = fin ? (es ? 'sábado a las ' : 'Saturday at ') + fmt(o) : dur(Math.round(((open ? c : o) - NOW) * 60));
    const nextLabel = fin ? (es ? 'Abre el' : 'Opens') : open ? (es ? 'Cierra en' : 'Closes in') : (es ? 'Abre en' : 'Opens in');
    const CD = es ? 'Cerrado' : 'Closed', hol = [];
    if (fin) hol.push({ dateLong: es ? 'Sábado 31 oct' : 'Saturday Oct 31', name: es ? 'Halloween · horario extendido' : 'Halloween · extended hours', tagFg: '#4B37F5', text: rng(o, 21) });
    else if (o >= 16) hol.push({ dateLong: es ? 'Lunes 12 oct' : 'Monday Oct 12', name: es ? 'Día de la Raza · feriado' : 'Columbus Day · holiday', tagFg: '#C0392B', text: CD });
    else if (c > 18) hol.push({ dateLong: es ? 'Lunes 12 oct' : 'Monday Oct 12', name: es ? 'Día de la Raza · feriado' : 'Columbus Day · holiday', tagFg: '#4B37F5', text: rng(o, 18) });
    hol.push(fin ? { dateLong: es ? 'Domingo 29 nov' : 'Sunday Nov 29', name: es ? 'Fin de semana de Acción de Gracias' : 'Thanksgiving weekend', tagFg: '#C0392B', text: CD } : { dateLong: es ? 'Jueves 26 nov' : 'Thursday Nov 26', name: es ? 'Acción de Gracias' : 'Thanksgiving', tagFg: '#C0392B', text: CD });
    /* Próximos cambios: si el negocio está en el Panel v2, salen los feriados que eligió en Tu página · Horario (over.sched o la base) con sus fechas (TLDash2.HOLD). */
    { const T2 = window.TLDash2, b2 = T2 && T2.BIZ && T2.BIZ[b.id]; if (b2 && T2.HOLD) { let sc = b2.sched || [], b2h = b2.hours || null; try { const o2 = ((JSON.parse(localStorage.getItem('tl-dash2-v1') || '{}').over || {})[b.id]) || {}; if (Array.isArray(o2.sched)) sc = o2.sched; if (Array.isArray(o2.hours) && o2.hours.length === 7) b2h = o2.hours; } catch (e) {}
      const DWL = es ? ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], MOL = es ? ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], T0 = new Date(2026, 8, 24).getTime();
      const L2 = sc.map(k => T2.HOLD[k]).filter(Boolean).map(H2 => { const a = new Date(H2.d[0][0], H2.d[0][1], H2.d[0][2]), z = H2.d[H2.d.length - 1], e = new Date(z[0], z[1], z[2]);
        return { t: a.getTime(), te: e.getTime(), dateLong: H2.d.length > 1 ? (es ? a.getDate() + '–' + e.getDate() + ' ' + MOL[e.getMonth()] : MOL[e.getMonth()] + ' ' + a.getDate() + '–' + e.getDate()) : (es ? DWL[a.getDay()] + ' ' + a.getDate() + ' ' + MOL[a.getMonth()] : DWL[a.getDay()] + ' ' + MOL[a.getMonth()] + ' ' + a.getDate()), name: H2.n[es ? 0 : 1], ...(() => { const W = b2h ? b2h[(a.getDay() + 6) % 7] : null, wc = W && W.on ? (W.two ? W.b2 : W.b) : 0, wo = W && W.on ? W.a : o, shut2 = !H2.b || (b2h && !(W && W.on)) || (H2.b && wo >= H2.b); return { tagFg: shut2 ? '#C0392B' : '#4B37F5', text: shut2 ? CD : rng(wo, Math.min(H2.b, wc || H2.b)) }; })() }; }).filter(x => x.te >= T0).sort((x, y) => x.t - y.t).slice(0, 3);
      hol.length = 0; (L2.length ? L2 : [{ dateLong: es ? 'Sin cambios programados' : 'No scheduled changes', name: es ? 'Tu horario de siempre' : 'Regular hours', tagFg: 'rgba(11,14,18,.35)', text: '' }]).forEach(x => { delete x.t; delete x.te; hol.push(x); }); } }
    const SHUT = { range: CD, type: '', color: 'rgba(11,14,18,.12)', dash: 'transparent', fg: 'rgba(11,14,18,.45)', weight: 600 };
    const hpWeek = [...Array(7)].map((_, i) => { const d = new Date(2026, 8, 21 + i), dow = d.getDay(), isT = i === 3;
      const shut = (fin && !(dow === 0 || dow === 6)) || (b.closed || []).includes(dow) || (!!b.auto && dow === 0 && !b.sun), sp = dow === 6 && b.sat ? b.sat : dow === 0 && b.sun ? b.sun : null, early = !fin && !shut && !sp && dow === 0 && o < 16 && c > 18;
      return { d: isT ? (es ? 'HOY' : 'TODAY') : (es ? DOW[dow] : DOWEN[dow]), dc: isT ? (open ? '#00695B' : '#C0392B') : 'rgba(11,14,18,.55)',
        lines: shut ? [SHUT] : [{ range: sp ? rng(sp[0], sp[1]) : rng(o, early ? 18 : c), type: '', color: '#0B0E12', dash: 'transparent', fg: '#0B0E12', weight: isT ? 800 : 600 }],
        tag: early ? (es ? 'CIERRA TEMPRANO' : 'CLOSES EARLY') : '', tagDisp: early ? 'inline-block' : 'none', tagBg: 'rgba(192,57,43,.1)', tagFg: '#C0392B' }; });
    return { data: { hpToday, hpChanges: hol, hpWeek, hpCountdown }, dateLabel: es ? 'HOY · JUE 24 SEP' : 'TODAY · THU SEP 24', nextLabel };
  }
  function simpleWeek(b, es) {
    const HR = b.hrs || [11, closeH(b.st || 'cierra 11 PM')], fin = b.days === 'finde';
    const L = es ? ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return L.map((d, i) => { const dw = (i + 1) % 7, shut = fin ? i < 5 : b.closed ? b.closed.includes(dw) || (!!b.auto && dw === 0 && !b.sun && b.closed.length > 0) : i === 0, isT = i === 3, sp = dw === 6 && b.sat ? b.sat : dw === 0 && b.sun ? b.sun : null;
      return { d: isT ? (es ? 'HOY' : 'TODAY') : d, v: shut ? (es ? 'Cerrado' : 'Closed') : sp ? rng(sp[0], sp[1]) : HR[0] === 0 && HR[1] >= 24 ? (es ? '24 horas' : '24 hours') : rng(HR[0], HR[1]), dc: isT ? (b.open ? '#00695B' : '#C0392B') : 'rgba(11,14,18,.55)', w: isT ? 800 : 600, bt: i ? '1px solid rgba(11,14,18,.06)' : 'none' }; });
  }
  /* Pestañas por contenido: solo aparecen si el negocio tiene datos aquí. */
  const EVENTS = {
    'sabor-dominicano': [['Noche de merengue en vivo', 'Live merengue night', 'VIE 25 SEP · 8 PM', 'FRI SEP 25 · 8 PM', 'ENTRADA LIBRE', 'FREE ENTRY'], ['Sancocho del domingo en familia', 'Sunday family sancocho', 'DOM 27 SEP · 1 PM', 'SUN SEP 27 · 1 PM', '$14 POR PERSONA', '$14 PER PERSON']],
    'el-fogon': [['Playoffs de Grandes Ligas en pantalla grande', 'MLB playoffs on the big screen', 'SÁB 3 OCT · 7 PM', 'SAT OCT 3 · 7 PM', 'ENTRADA LIBRE', 'FREE ENTRY']],
    'panaderia-la-espiga': [['Clase de bizcocho dominicano', 'Dominican cake class', 'SÁB 10 OCT · 10 AM', 'SAT OCT 10 · 10 AM', '$25 · 12 CUPOS', '$25 · 12 SPOTS']],
  };
  const STAFF = {
    'sabor-dominicano': [['Rosa Peña', 'Dueña y cocinera', 'Owner and cook', 2014], ['Juan Carlos Peña', 'Cocina y parrilla', 'Kitchen and grill', 2014], ['Yanet Almonte', 'Salón y caja', 'Front and register', 2019], ['Miguel Reyes', 'Delivery', 'Delivery', 2022]],
    'el-fogon': [['Freddy Batista', 'Dueño y parrillero', 'Owner and grill master', 2017], ['Carolina Batista', 'Salón', 'Front of house', 2018]],
    'pollo-don-lucho': [['Luis Huamán', 'Dueño', 'Owner', 2018], ['Rocío Quispe', 'Cocina', 'Kitchen', 2019]],
    'el-coqui-boricua': [['Wanda Rivera', 'Dueña y cocinera', 'Owner and cook', 2020], ['Héctor Rivera', 'Frituras y alitas', 'Fritters and wings', 2020]],
    'la-habana-sandwich': [['Yoel Castillo', 'Dueño', 'Owner', 2021], ['Maritza Castillo', 'Plancha y café', 'Press and coffee', 2021]],
    'asados-la-pampa': [['Martín Ferreyra', 'Dueño y parrillero', 'Owner and grill master', 2019], ['Thiago Souza', 'Parrilla brasileña', 'Brazilian grill', 2021]],
    'meal-prep-yuli': [['Yulissa Mota', 'Dueña y cocinera', 'Owner and cook', 2022]],
    'chef-ramon': [['Ramón Estévez', 'Chef privado', 'Private chef', 2018]],
    'barra-movil-el-trago': [['Kelvin Durán', 'Dueño y bartender', 'Owner and bartender', 2021], ['Yesenia Durán', 'Bartender', 'Bartender', 2022]],
    'pasteles-arte-dulce': [['Dulce María Peña', 'Repostera y decoradora', 'Baker and cake decorator', 2017]],
    'cocina-alma-delivery': [['Andrés Molina', 'Dueño y cocinero', 'Owner and cook', 2023], ['Leidy Molina', 'Pedidos y entregas', 'Orders and delivery', 2023]],
    'panaderia-la-espiga': [['Ana Tavárez', 'Panadera', 'Baker', 2011], ['Héctor Tavárez', 'Horno y encargos', 'Oven and orders', 2013]],
  };
  const JOBS = {
    'sabor-dominicano': [['Ayudante de cocina', 'Kitchen helper', 'TIEMPO COMPLETO', 'FULL TIME', '$15–17/H', 'Preparación, limpieza y apoyo en la línea. Experiencia en cocina dominicana es un plus.', 'Prep, cleaning and line support. Dominican cooking experience is a plus.', 3], ['Chofer de delivery', 'Delivery driver', 'MEDIO TIEMPO', 'PART TIME', '$13/H + PROPINAS', 'Carro propio y licencia de PA. Tardes y fines de semana.', 'Own car and PA license. Evenings and weekends.', 6]],
    'el-fogon': [['Mesero o mesera', 'Server', 'MEDIO TIEMPO', 'PART TIME', '$10/H + PROPINAS', 'Jueves a domingo, de 6 PM al cierre. Español e inglés básico.', 'Thursday to Sunday, 6 PM to close. Spanish and basic English.', 2]],
    'pizza-express': [['Chofer de delivery', 'Delivery driver', 'TIEMPO COMPLETO', 'FULL TIME', '$14/H + PROPINAS', 'Carro propio, licencia de PA y récord limpio.', 'Own car, PA license and clean record.', 4]],
  };
  const RSV = ['sabor-dominicano', 'el-fogon', 'mariscos-la-bahia'];
  MENU['sabor-dominicano-alter'] = MENU['sabor-dominicano'];
  window.TLListing = { P, POSTS, ABOUT, MENU, GEN, ADDR, REV, revFor, hoursPro, simpleWeek, fmt, EVENTS, STAFF, JOBS, RSV };
})();
