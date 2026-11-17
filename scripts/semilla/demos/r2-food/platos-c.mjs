/* R2 · FOOD · catálogos de platos (parte C: panadería, dulces, helados, bebidas, barra y hielo). Mismo formato que platos-a.mjs. */

export const C = {};

C.panaderia = {
  ph: [35993723, 9120377, 7447291, 37228442],
  sec: {
    "Pan salado / Savory bread": `Pan de agua (6)|Water bread (6)|Recién horneado, por la mañana.|Fresh from the oven, in the morning.|3.95|0||veg
Pan sobao (4)|Pan sobao (4)|Suave y ligeramente dulce.|Soft and lightly sweet.|3.95|0||lac,hue
Pan de sal (10)|Pan de sal (10)|Panecillos de la casa.|House rolls.|3.50|0||veg
Pan de bono (6)|Pan de bono (6)|De queso y almidón de yuca.|Cheese and cassava starch rolls.|4.95|1||lac,hue,sg
Telera (4)|Telera (4)|Para tortas.|For tortas.|3.75|1||veg
Pan integral|Whole wheat loaf|Barra de 24 oz.|24 oz loaf.|4.95|1||veg
Baguette|Baguette|Crujiente.|Crusty.|3.25|1||veg`,
    "Pan dulce / Sweet bread": `Concha (3)|Concha (3)|Con azúcar de vainilla o chocolate.|With vanilla or chocolate sugar.|4.50|2||lac,hue
Cuernito de mantequilla (4)|Butter croissant (4)|Hojaldrado.|Flaky.|6.50|2||lac,hue
Empanada de guayaba (2)|Guava pastry (2)|Hojaldre con guayaba y queso.|Puff pastry with guava and cheese.|4.50|3||lac
Quesito (2)|Quesito (2)|De queso crema.|Cream cheese.|4.50|3||lac,hue
Mallorca con jamón y queso|Mallorca with ham and cheese|Pan dulce con azúcar glas.|Sweet bread with powdered sugar.|5.95|3||lac,hue
Bizcochito dominicano (6)|Dominican biscuit (6)|Con anís.|With anise.|3.95|2||lac,hue
Rosca de reyes|Three Kings ring|Se pide con una semana; temporada.|Order one week ahead; seasonal.|24.95|3||lac,hue`,
    "Pasteles y galletas / Cakes and cookies": `Pastel tres leches (porción)|Tres leches slice|Esponjoso.|Fluffy.|4.95|3||lac,hue
Flan de coco (porción)|Coconut flan slice|Con caramelo.|With caramel.|4.50|3||lac,hue
Galletas de mantequilla (12)|Butter cookies (12)|Caseras.|Homemade.|7.95|2||lac,hue
Brazo gitano|Swiss roll|Relleno de crema.|Cream-filled.|11.95|3||lac,hue`,
    "Café / Coffee": `Café con leche|Coffee with milk|Caliente.|Hot.|2.95|0|leche|lac
Chocolate caliente|Hot chocolate|Con espuma.|Frothy.|3.25|0||lac`,
  },
};

C.reposteria = {
  ph: [30233153, 17315403, 32590852, 9501562, 11712500, 37228442],
  sec: {
    "Pasteles / Cakes": `Pastel de tres leches|Tres leches cake|Para 12 personas; con una semana de aviso.|Serves 12; one week notice.|39.95|2|sabP,tamP|lac,hue
Pastel de chocolate|Chocolate cake|Capas de bizcocho y ganache.|Layers of sponge and ganache.|42.95|0|tamP,rellP|lac,hue
Pastel de zanahoria|Carrot cake|Con crema de queso.|With cream cheese frosting.|40.95|0|tamP|lac,hue,nuez
Pastel de vainilla con fresas|Vanilla strawberry cake|Crema batida y fresas frescas.|Whipped cream and fresh strawberries.|41.95|1|tamP|lac,hue
Pastel de guayaba y queso|Guava and cheese cake|Dulce y ácido.|Sweet and tart.|38.95|1|tamP|lac,hue
Cheesecake de maracuyá|Passion fruit cheesecake|Base de galleta.|Cookie base.|36.95|4|tamP|lac,hue`,
    "Cupcakes y porciones / Cupcakes and slices": `Cupcakes (6)|Cupcakes (6)|Sabor a elegir.|Choose a flavor.|15.95|5|sabP|lac,hue
Mini pasteles (12)|Mini cakes (12)|Para regalar.|For gifting.|27.95|5|sabP|lac,hue
Porción de pastel|Cake slice|Del día.|Of the day.|4.95|3||lac,hue
Brownies (6)|Brownies (6)|Con nueces opcionales.|Optional walnuts.|13.95|5||lac,hue,nuez
Alfajores (12)|Alfajores (12)|Con dulce de leche.|With dulce de leche.|14.95|5||lac,hue`,
    "Para fiestas / For parties": `Mesa de postres (30 personas)|Dessert table (30 guests)|Mini postres surtidos; con 5 días de aviso.|Assorted mini desserts; 5 days notice.|179.00|2||lac,hue
Pastel de quinceañera|Quinceañera cake|Tres pisos, para 60 personas.|Three tiers, serves 60.|249.00|0|sabP|lac,hue
Pastel de boda|Wedding cake|Dos pisos, para 40 personas.|Two tiers, serves 40.|229.00|0|sabP|lac,hue`,
  },
};

C.decoracion = {
  ph: [30233153, 17315403, 11712500, 32590852, 9501562],
  sec: {
    "Pasteles decorados / Decorated cakes": `Pastel de cumpleaños personalizado|Custom birthday cake|Diseño a tu gusto, para 15 personas; con 7 días de aviso.|Custom design, serves 15; 7 days notice.|89.00|0|sabP,tamP|lac,hue
Pastel de figura en fondant|Fondant figure cake|Personaje o tema, con modelado a mano.|Character or theme, hand-modeled.|149.00|1|sabP,tamP|lac,hue
Pastel de revelación de género|Gender reveal cake|Relleno sorpresa.|Surprise filling.|79.00|2|sabP|lac,hue
Pastel de bautizo|Baptism cake|Decoración blanca y dorada.|White and gold decoration.|99.00|2|sabP,tamP|lac,hue
Pastel de graduación|Graduation cake|Con birrete y nombre.|With cap and name.|85.00|2|sabP,tamP|lac,hue
Pastel de aniversario|Anniversary cake|Con flores de crema.|With buttercream flowers.|79.00|3|sabP,tamP|lac,hue`,
    "Cupcakes y galletas decoradas / Cupcakes and decorated cookies": `Cupcakes decorados (12)|Decorated cupcakes (12)|Tema a elegir.|Your choice of theme.|42.00|4|sabP|lac,hue
Galletas decoradas (12)|Decorated cookies (12)|Con glaseado real.|With royal icing.|36.00|4||lac,hue
Pops de pastel (12)|Cake pops (12)|Con chocolate.|Chocolate coated.|30.00|4||lac,hue`,
    "Servicios / Services": `Consulta de diseño|Design consultation|Media hora; se descuenta si encargas el pastel.|Half hour; deducted if you order the cake.|25.00|0||
Entrega y montaje|Delivery and setup|Dentro de 15 millas.|Within 15 miles.|35.00|0||
Topper personalizado|Custom topper|Letras o figura.|Letters or figure.|15.00|0||`,
  },
};

C.postres = {
  ph: [33674417, 9501562, 32590852, 11712500, 37228442],
  sec: {
    "Postres fríos / Cold desserts": `Flan de queso|Cream cheese flan|Con caramelo.|With caramel.|5.50|0||lac,hue
Tres leches|Tres leches|Porción generosa.|Generous slice.|5.95|2||lac,hue
Tembleque|Tembleque|Coco y canela.|Coconut and cinnamon.|4.95|1||lac
Arroz con leche|Rice pudding|Con canela.|With cinnamon.|4.50|1||lac
Majarete|Majarete|Maíz y coco.|Corn and coconut.|4.50|1||lac
Gelatina de mosaico|Mosaic gelatin|Con crema.|With cream.|3.95|3||lac
Cheesecake de guayaba|Guava cheesecake|Porción.|Slice.|6.50|0||lac,hue`,
    "Postres calientes / Warm desserts": `Churros con cajeta (5)|Churros with cajeta (5)|Recién fritos.|Freshly fried.|6.95|4||lac
Buñuelos con miel (3)|Buñuelos with syrup (3)|De temporada.|Seasonal.|5.95|4||hue
Plátanos fritos con helado|Fried plantains with ice cream|Con canela.|With cinnamon.|7.50|4||lac
Pudín de pan|Bread pudding|Con salsa de vainilla.|With vanilla sauce.|5.95|4||lac,hue`,
    "Cajas / Boxes": `Caja de 6 postres surtidos|Box of 6 assorted desserts|Elige sabores.|Choose flavors.|27.95|0||lac,hue
Charola de flanes (12)|Flan tray (12)|Para fiestas.|For parties.|49.00|0||lac,hue
Bebida de la casa|House drink|Café o chocolate.|Coffee or chocolate.|3.50|0||lac`,
  },
};

C.helados = {
  ph: [8678930, 12939801, 12666797, 33709196],
  sec: {
    "Helados / Ice cream": `Helado, una bola|Ice cream, one scoop|Sabor a elegir; cono o vaso.|Choose a flavor; cone or cup.|3.95|0|sabH,topH|lac
Helado, dos bolas|Ice cream, two scoops|Dos sabores.|Two flavors.|5.95|0|sabH,topH|lac
Banana split|Banana split|Tres bolas y banano.|Three scoops and banana.|8.95|0|topH|lac,nuez
Helado de coco en su concha|Coconut ice cream in the shell|De temporada.|Seasonal.|6.95|1||lac
Pinta de helado|Pint of ice cream|Para llevar.|To go.|7.50|0|sabH|lac
Malteada|Milkshake|Con helado artesanal.|Made with handmade ice cream.|6.50|0|sabH,tamC|lac`,
    "Paletas / Paletas": `Paleta de fresa con crema|Strawberries and cream paleta|Con trozos de fruta.|With fruit pieces.|3.25|1||lac
Paleta de mango con chile|Mango chile paleta|Dulce con picante.|Sweet with a kick.|3.25|1||pica
Paleta de limón|Lemon paleta|De agua, refrescante.|Water-based, refreshing.|2.75|1||
Paleta de coco|Coconut paleta|Con coco rallado.|With shredded coconut.|3.25|1||lac
Paleta de pepino con chile|Cucumber chile paleta|De agua.|Water-based.|2.95|1||pica
Caja de 10 paletas|Box of 10 paletas|Surtidas.|Assorted.|24.00|1||lac`,
    "Bebidas y postres / Drinks and desserts": `Raspado de frutas|Fruit shaved ice|Con leche condensada.|With condensed milk.|4.95|2|sabJ|lac
Mangonada|Mangonada|Mango, chamoy y tajín.|Mango, chamoy and tajín.|7.50|2||pica
Fresas con crema|Strawberries and cream|Vaso grande.|Large cup.|6.95|3||lac`,
  },
};

C.antojitos = {
  ph: [5837188, 4958774, 37228442, 8954034, 5920644],
  sec: {
    "Antojitos salados / Savory snacks": `Elote en vaso|Corn in a cup|Con mayonesa, queso y chile.|With mayo, cheese and chile.|4.95|0|pica|lac
Churros con cajeta|Churros with cajeta|Recién hechos.|Freshly made.|5.50|2||lac
Chicharrones preparados|Loaded pork rinds|Con salsa y limón.|With salsa and lime.|5.95|3|pica|
Tostilocos|Tostilocos|Papitas con jícama, pepino y cacahuates.|Chips with jícama, cucumber and peanuts.|7.50|0|pica|nuez,pica
Fruta con chile|Fruit with chile|Mango, jícama y pepino.|Mango, jícama and cucumber.|5.95|0|pica|veg,sg
Platanitos fritos|Plantain chips|Con sal y limón.|With salt and lime.|3.95|3||veg,sg
Pastelitos de guayaba (3)|Guava pastries (3)|Hojaldre.|Puff pastry.|4.50|3||lac`,
    "Dulces / Candy": `Bolsa de dulces mexicanos|Mexican candy bag|Surtido de 12 piezas.|Assortment of 12 pieces.|9.95|2||pica
Dulce de leche cortada|Cortada fudge|Casero.|Homemade.|4.95|2||lac
Coco rallado dulce|Sweet shredded coconut|Casero.|Homemade.|3.95|2||
Cocadas (4)|Cocadas (4)|Coco y azúcar.|Coconut and sugar.|4.95|2||
Tamarindo cubierto de chile|Chile tamarind|Dulce y picante.|Sweet and spicy.|2.95|2||pica
Alegrías de amaranto|Amaranth bars|Con miel.|With honey.|2.95|2||`,
    "Bebidas / Drinks": `Agua fresca del día|Agua fresca of the day|Vaso grande.|Large cup.|3.50|4|vaso,azu|
Café de olla|Pot coffee|Caliente.|Hot.|3.00|4||
Champurrado|Champurrado|Chocolate y maíz.|Chocolate and corn.|3.95|4||lac`,
  },
};

C.jugos = {
  ph: [27518954, 8215113, 4239, 3651045, 20300401, 33709196],
  sec: {
    "Jugos naturales / Fresh juices": `Jugo de naranja|Orange juice|Exprimido al momento.|Squeezed to order.|4.95|0|tamC|
Jugo de zanahoria y naranja|Carrot and orange juice|Dulce y fresco.|Sweet and fresh.|5.50|1|tamC|
Jugo verde|Green juice|Piña, apio, pepino y espinaca.|Pineapple, celery, cucumber and spinach.|6.95|1|tamC|
Jugo de remolacha|Beet juice|Con naranja y jengibre.|With orange and ginger.|6.50|1|tamC|
Jugo de guanábana|Soursop juice|Con agua o leche.|With water or milk.|5.95|2|tamC|lac
Limonada de menta|Mint lemonade|Fría.|Cold.|4.50|3|tamC,azu|`,
    "Batidos / Smoothies": `Batido de mango|Mango smoothie|Con leche o agua.|With milk or water.|6.25|2|tamC,leche|lac
Batido de fresa y banano|Strawberry banana smoothie|Con yogur.|With yogurt.|6.25|2|tamC,leche|lac
Batido de mamey|Mamey smoothie|Cremoso.|Creamy.|6.50|2|tamC,leche|lac
Batido proteico de avena|Oat protein shake|Con avena, banano y canela.|With oats, banana and cinnamon.|7.25|2|tamC|lac
Morir soñando|Morir soñando|Naranja y leche.|Orange and milk.|5.50|4|tamC|lac
Batido de aguacate|Avocado shake|Con leche condensada.|With condensed milk.|6.50|2|tamC|lac`,
    "Bowls y snacks / Bowls and snacks": `Bowl de açaí|Açaí bowl|Con granola y fruta.|With granola and fruit.|10.95|5||veg,nuez
Ensalada de frutas|Fruit salad|Con yogur opcional.|Optional yogurt.|6.50|5||veg,sg
Shot de jengibre y limón|Ginger lemon shot|2 oz.|2 oz.|3.00|5||veg,sg`,
  },
};

C.cafeteria = {
  ph: [19252265, 36238393, 8444432, 15640157],
  sec: {
    "Café / Coffee": `Espresso|Espresso|Doble opcional.|Optional double.|2.75|0|tamC|
Café con leche|Coffee with milk|Granulado o vapor.|Steamed.|3.95|0|tamC,leche|lac
Cappuccino|Cappuccino|Espuma de leche.|Milk foam.|4.50|0|tamC,leche|lac
Latte de vainilla|Vanilla latte|Con jarabe casero.|With house syrup.|5.25|0|tamC,leche|lac
Café cubano (colada)|Cuban coffee (colada)|Cuatro tacitas.|Four small cups.|3.25|0||
Café helado|Iced coffee|Con leche de avena opcional.|Optional oat milk.|4.95|0|tamC,leche|
Chocolate caliente|Hot chocolate|Con crema batida.|With whipped cream.|4.25|0|tamC|lac`,
    "Para comer / To eat": `Tostada de aguacate|Avocado toast|Pan artesanal y huevo opcional.|Artisan bread and optional egg.|8.95|3|extra|veg
Croissant de jamón y queso|Ham and cheese croissant|Calientito.|Warm.|5.95|3||lac,hue
Pastelito de guayaba|Guava pastry|Hojaldre.|Puff pastry.|2.95|3||lac
Sándwich de pavo|Turkey sandwich|Con queso suizo.|With Swiss cheese.|8.95|3||lac
Bizcocho del día|Cake of the day|Porción.|Slice.|4.50|3||lac,hue
Galleta de avena|Oatmeal cookie|Casera.|Homemade.|2.50|3||lac,hue`,
    "Té y granos / Tea and beans": `Té caliente|Hot tea|Manzanilla, menta o negro.|Chamomile, mint or black.|3.00|0||
Café en grano 12 oz|Coffee beans 12 oz|Tostado local; molido a elección.|Locally roasted; ground to order.|13.95|0||
Bolsa de café molido 12 oz|Ground coffee 12 oz|Mezcla de la casa.|House blend.|12.95|0||`,
  },
};

C.bebidasEsp = {
  ph: [12666797, 27518954, 8215113, 20300401, 33709196],
  sec: {
    "Té de burbujas / Bubble tea": `Té con leche y perlas|Milk tea with pearls|Té negro, leche y perlas de tapioca.|Black tea, milk and tapioca pearls.|5.95|0|tamC,boba,azu|lac
Té de taro|Taro milk tea|Cremoso, con perlas.|Creamy, with pearls.|6.25|0|tamC,boba,azu|lac
Té verde de mango|Mango green tea|Con gelatina de coco.|With coconut jelly.|5.95|1|tamC,boba,azu|
Té de fresa con crema|Strawberry cream tea|Fresco.|Fresh.|6.25|1|tamC,boba,azu|lac
Té de maracuyá|Passion fruit tea|Con trozos de fruta.|With fruit pieces.|5.95|2|tamC,boba,azu|
Té de jamaica con perlas|Hibiscus tea with pearls|Sin leche.|Dairy-free.|5.50|2|tamC,boba,azu|`,
    "Especiales / Specialties": `Smoothie de piña y coco|Pineapple coconut smoothie|Cremoso.|Creamy.|6.50|3|tamC|lac
Frappé de café|Coffee frappé|Con crema batida.|With whipped cream.|6.50|3|tamC|lac
Limonada de fresa|Strawberry lemonade|Con popping boba.|With popping boba.|5.75|3|tamC,boba|
Bebida de horchata con canela|Cinnamon horchata drink|Estilo café.|Café style.|5.25|4|tamC|lac
Bebida de cacao y coco|Cacao and coconut drink|Fría.|Cold.|5.50|4|tamC|lac`,
    "Para compartir / To share": `Jarra de té de frutas (64 oz)|Fruit tea pitcher (64 oz)|Para cuatro.|Serves four.|18.95|2||
Caja de 6 tés|Box of 6 teas|Surtidos; pedir con 2 horas.|Assorted; order 2 hours ahead.|34.95|2|boba|`,
  },
};

C.aguas = {
  ph: [3651045, 27518954, 8215113, 4239, 12939801],
  sec: {
    "Aguas frescas / Aguas frescas": `Horchata|Horchata|Arroz y canela.|Rice and cinnamon.|3.95|0|vaso,azu|lac
Agua de jamaica|Hibiscus water|Fresca.|Fresh.|3.75|1|vaso,azu|
Agua de tamarindo|Tamarind water|Dulce y ácida.|Sweet and tart.|3.75|2|vaso,azu|
Agua de sandía|Watermelon water|Con limón.|With lime.|3.95|3|vaso,azu|
Agua de pepino con limón|Cucumber lime water|Refrescante.|Refreshing.|3.95|3|vaso,azu|
Agua de piña|Pineapple water|Natural.|Natural.|3.95|3|vaso,azu|
Agua de mango|Mango water|Natural.|Natural.|3.95|3|vaso,azu|`,
    "Raspados / Shaved ice": `Raspado de fresa|Strawberry shaved ice|Con leche condensada.|With condensed milk.|4.95|4|tamC|lac
Raspado de tamarindo con chile|Chile tamarind shaved ice|Dulce y picante.|Sweet and spicy.|4.95|4|tamC|pica
Raspado de coco|Coconut shaved ice|Con coco rallado.|With shredded coconut.|4.95|4|tamC|lac
Raspado de mango|Mango shaved ice|Con chamoy opcional.|Optional chamoy.|5.25|4|tamC|
Mangonada|Mangonada|Mango, chamoy y tajín.|Mango, chamoy and tajín.|7.50|4||pica
Cubilete de frutas|Fruit cup|Con chile y limón.|With chile and lime.|6.50|4||veg,sg`,
    "Garrafones y jarras / Jugs and pitchers": `Jarra de agua fresca (1 galón)|Fresh water pitcher (1 gallon)|Sabor a elegir.|Choose a flavor.|12.95|0||
Garrafón de agua fresca (3 galones)|Fresh water jug (3 gallons)|Para fiestas; con dispensador.|For parties; with dispenser.|34.95|0||
Bolsa de vasos (50)|Cups (50)|Con tapa.|With lids.|6.00|0||`,
  },
};

C.bartender = {
  ph: [32347121, 4485375],
  sec: {
    "Barra móvil / Mobile bar": `Barra clásica · 3 horas|Classic bar · 3 hours|Bartender, barra, vasos y hielo. El licor lo aporta el cliente conforme a la ley; hasta 50 invitados.|Bartender, bar setup, glassware and ice. Alcohol supplied by the client in accordance with the law; up to 50 guests.|450.00|0|bartInv,bartExtra|
Barra premium · 4 horas|Premium bar · 4 hours|Dos bartenders, barra iluminada y cristalería; hasta 100 invitados.|Two bartenders, lit bar and glassware; up to 100 guests.|890.00|0|bartInv,bartExtra|
Barra sin alcohol · 3 horas|Mocktail bar · 3 hours|Mocktails, aguas frescas y limonadas; hasta 80 invitados.|Mocktails, aguas frescas and lemonades; up to 80 guests.|390.00|1|bartExtra|
Barra de café y chocolate · 3 horas|Coffee and chocolate bar · 3 hours|Estación de café, chocolate y postres; hasta 60 invitados.|Coffee, chocolate and dessert station; up to 60 guests.|420.00|1|bartExtra|
Barra de mimosas y brunch · 3 horas|Mimosa and brunch bar · 3 hours|Barra de jugos, frutas y mimosas; el espumoso lo aporta el cliente.|Juice, fruit and mimosa bar; sparkling wine supplied by the client.|480.00|0|bartExtra|`,
    "Servicios sueltos / Add-on services": `Bartender por hora|Bartender per hour|Mínimo 3 horas.|3-hour minimum.|55.00|0||
Cristalería (por 50)|Glassware (per 50)|Copas y vasos limpios.|Clean glasses and cups.|65.00|1||
Hielo para el evento (100 lb)|Event ice (100 lb)|Entrega e instalación.|Delivery and setup.|95.00|1||
Menú de cócteles personalizado|Custom cocktail menu|Diseñado contigo y tarjeta impresa.|Designed with you and a printed card.|75.00|0||
Taller de coctelería para grupos|Group mixology class|Hasta 12 personas, 2 horas.|Up to 12 people, 2 hours.|280.00|0||`,
    "Mocktails por vaso / Mocktails by the glass": `Mojito sin alcohol|Virgin mojito|Hierbabuena, limón y soda.|Mint, lime and soda.|6.00|1||
Piña colada sin alcohol|Virgin piña colada|Piña y coco.|Pineapple and coconut.|6.50|1||lac
Margarita de fresa sin alcohol|Virgin strawberry margarita|Escarchada con sal y chile.|Rimmed with salt and chile.|6.50|1||`,
  },
};

C.hielo = {
  ph: [27650516, 10376368],
  sec: {
    "Hielo / Ice": `Bolsa de hielo 10 lb|10 lb bag of ice|Hielo en cubos, de agua filtrada.|Cube ice from filtered water.|3.50|0||
Bolsa de hielo 20 lb|20 lb bag of ice|Para neveras y fiestas.|For coolers and parties.|5.95|0||
Bloque de hielo 25 lb|25 lb ice block|Dura más tiempo.|Lasts longer.|8.50|1||
Hielo triturado 10 lb|10 lb crushed ice|Para bebidas y mariscos.|For drinks and seafood.|4.50|0||
Paquete para fiesta (100 lb)|Party pack (100 lb)|Entrega a domicilio y nevera de regalo.|Home delivery and loaner cooler.|34.95|1||
Hielo para eventos (500 lb)|Event ice (500 lb)|Entrega programada; pedir con 24 horas.|Scheduled delivery; order 24 hours ahead.|139.00|1||`,
    "Agua embotellada / Bottled water": `Garrafón de agua 5 galones|5-gallon water jug|Agua purificada; cambio de envase.|Purified water; container exchange.|6.50|0||
Garrafón nuevo con envase|New 5-gallon jug with bottle|Primera compra.|First purchase.|18.95|0||
Caja de 24 botellas (16.9 oz)|Case of 24 bottles (16.9 oz)|Agua purificada.|Purified water.|6.95|0||
Caja de 40 botellas (16.9 oz)|Case of 40 bottles (16.9 oz)|Para eventos.|For events.|9.95|1||
Pallet de 1,000 botellas|Pallet of 1,000 bottles|Entrega con camión; pedir con 3 días.|Truck delivery; order 3 days ahead.|179.00|1||`,
    "Servicios / Services": `Entrega a domicilio|Home delivery|Dentro de 10 millas.|Within 10 miles.|9.00|0||
Dispensador de agua en renta (mes)|Water dispenser rental (month)|Fría y caliente.|Hot and cold.|12.00|1||
Suscripción semanal de garrafones|Weekly jug subscription|Dos garrafones por semana, entrega fija.|Two jugs per week, fixed delivery.|24.00|1||`,
  },
};
