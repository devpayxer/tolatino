/* R2 · FOOD · catálogos de platos (parte B: antojos y platos por especialidad). Mismo formato que platos-a.mjs. */

export const B = {};

B.tacos = {
  ph: [6310256, 5837188, 4958774, 29465179, 14179987, 8364557, 37516560, 5920644],
  sec: {
    "Tacos / Tacos": `Taco al pastor|Al pastor taco|Con piña, cebolla y cilantro.|With pineapple, onion and cilantro.|3.25|0|tort,salsa|
Taco de carne asada|Carne asada taco|Bistec a la parrilla.|Grilled steak.|3.50|1|tort,salsa|
Taco de birria con consomé|Birria taco with consommé|Res en chile guajillo, queso derretido.|Beef in guajillo chile, melted cheese.|4.50|2|tort,salsa|lac,pica
Taco de lengua|Beef tongue taco|Suave y dorada.|Tender and browned.|3.75|1|tort,salsa|
Taco de pollo|Chicken taco|Pollo a la parrilla.|Grilled chicken.|3.25|0|tort,salsa|
Taco de chorizo|Chorizo taco|Con cebolla.|With onion.|3.25|0|tort,salsa|pica
Orden de tacos (3)|Taco order (3)|Elige la carne; con cebolla y cilantro.|Choose the meat; with onion and cilantro.|9.75|0|tort,salsa|`,
    "Antojitos / Specialties": `Gringa de pastor|Al pastor gringa|Tortilla de harina con queso y pastor.|Flour tortilla with cheese and al pastor.|6.95|1|salsa|lac
Quesadilla grande|Large quesadilla|Con carne a elegir.|With your choice of meat.|9.50|5|salsa|lac
Torta de asada|Carne asada torta|Pan telera, frijoles, aguacate y queso.|Telera bread, beans, avocado and cheese.|10.95|5|extra,quita|lac
Nachos con carne|Nachos with meat|Con queso, frijoles y jalapeños.|With cheese, beans and jalapeños.|10.95|6|extra|lac,pica
Elote preparado|Loaded street corn|Con mayonesa, queso y chile.|With mayo, cheese and chile.|4.95|7|pica|lac`,
    "Bebidas / Drinks": `Horchata|Horchata|Arroz y canela.|Rice and cinnamon.|3.95|7|vaso,azu|lac
Jamaica|Hibiscus water|Fría y sin leche.|Cold, dairy-free.|3.75|7|vaso,azu|
Refresco mexicano|Mexican soda|Botella de vidrio.|Glass bottle.|3.25|7||`,
  },
};

B.pupusas = {
  ph: [9700895, 12261167, 5836619, 36905236],
  sec: {
    "Pupusas / Pupusas": `Pupusa revuelta|Revuelta pupusa|Chicharrón, frijol y queso.|Pork, beans and cheese.|3.25|0|masa,salsa|lac
Pupusa de queso con loroco|Cheese and loroco pupusa|Flor de loroco y queso.|Loroco flower and cheese.|3.25|0|masa,salsa|lac,veg
Pupusa de frijol con queso|Bean and cheese pupusa|La más pedida.|The most ordered.|3.00|0|masa,salsa|lac,veg
Pupusa de chicharrón|Pork pupusa|Con salsa y curtido.|With salsa and curtido.|3.25|0|masa,salsa|
Pupusa de ayote|Squash pupusa|Con queso.|With cheese.|3.25|0|masa,salsa|lac,veg
Pupusa de camarón|Shrimp pupusa|Con queso.|With cheese.|4.25|0|masa,salsa|lac,mar
Orden de 3 pupusas|Order of 3 pupusas|Con curtido y salsa roja.|With curtido and red salsa.|9.50|0|masa,salsa|lac`,
    "Platos y antojitos / Plates and snacks": `Yuca frita con chicharrón|Fried yuca with pork|Con curtido.|With curtido.|9.95|1||
Pastelitos de carne (3)|Meat pastelitos (3)|Fritos, con curtido.|Fried, with curtido.|6.95|3|salsa|
Tamal de elote (2)|Corn tamales (2)|Dulces, con crema.|Sweet, with cream.|5.95|1||lac,veg
Plato típico salvadoreño|Salvadoran combo plate|Frijoles, queso, crema, plátano y huevo.|Beans, cheese, cream, plantain and egg.|11.95|2||hue,lac
Platanos fritos con crema|Fried plantains with cream|Con frijoles refritos.|With refried beans.|6.50|2||lac,veg`,
    "Bebidas y dulces / Drinks and sweets": `Horchata de morro|Morro horchata|Semilla de morro y canela.|Morro seed and cinnamon.|3.95|1|vaso,azu|nuez
Chocolate caliente|Hot chocolate|Con espuma.|Frothy.|3.50|1||lac
Quesadilla salvadoreña|Salvadoran quesadilla|Pan dulce de queso y ajonjolí.|Sweet cheese bread with sesame.|4.50|1||lac,hue`,
  },
};

B.arepas = {
  ph: [5836619, 5920681, 33917296, 32912393, 15135087],
  sec: {
    "Arepas rellenas / Stuffed arepas": `Reina pepiada|Reina pepiada|Pollo y aguacate.|Chicken and avocado.|8.95|0|salsa|
Pabellón|Pabellón arepa|Carne mechada, frijoles negros, plátano y queso.|Shredded beef, black beans, plantain and cheese.|9.95|1|salsa|lac
Domino|Domino arepa|Frijoles negros y queso blanco.|Black beans and white cheese.|7.95|1|salsa|lac,veg
Catira|Catira|Pollo desmechado y queso amarillo.|Shredded chicken and yellow cheese.|8.95|0|salsa|lac
Arepa de pernil|Pork leg arepa|Con tomate y queso.|With tomato and cheese.|9.50|1|salsa|lac
Arepa solo queso|Cheese arepa|Queso de mano.|Hand-pulled cheese.|6.95|1|salsa|lac,veg`,
    "Antojos venezolanos / Venezuelan bites": `Tequeños (6)|Tequeños (6)|Palitos de queso en masa, con salsa de ajo.|Cheese sticks in dough, with garlic sauce.|8.50|2|salsa|lac
Cachapa con queso|Cachapa with cheese|Panqueque de maíz tierno con queso de mano.|Sweet corn pancake with hand-pulled cheese.|10.95|2|extra|lac
Empanada de carne mechada|Shredded beef empanada|Harina de maíz, frita.|Fried corn dough.|4.50|3|salsa|
Patacón de pollo|Chicken patacón|Plátano verde prensado, pollo y aguacate.|Pressed green plantain, chicken and avocado.|11.95|2|salsa|
Pastelito de queso|Cheese pastelito|Frito.|Fried.|3.95|3||lac`,
    "Bebidas / Drinks": `Papelón con limón|Papelón with lime|Caña de azúcar y limón, fría.|Cane sugar and lime, cold.|3.95|4|vaso|
Chicha venezolana|Venezuelan chicha|Arroz, leche y canela.|Rice, milk and cinnamon.|4.50|4||lac
Malta|Malta|Botella fría.|Chilled bottle.|2.75|4||`,
  },
};

B.empanadas = {
  ph: [36905236, 37368697, 32912393, 6166796],
  sec: {
    "Empanadas fritas / Fried empanadas": `Empanada de pollo|Chicken empanada|Pollo guisado.|Stewed chicken.|3.75|0|salsa|
Empanada de carne|Beef empanada|Res sazonada con papa.|Seasoned beef with potato.|3.75|0|salsa|
Empanada de queso|Cheese empanada|Queso derretido.|Melted cheese.|3.50|1|salsa|lac
Empanada de camarón|Shrimp empanada|Con salsa criolla.|With creole sauce.|4.50|2|salsa|mar
Empanada de pizza|Pizza empanada|Queso y jamón.|Cheese and ham.|3.75|1|salsa|lac
Empanada de guayaba y queso|Guava and cheese empanada|Dulce.|Sweet.|3.75|3||lac`,
    "Al horno / Baked": `Empanada horneada de carne|Baked beef empanada|Estilo criollo.|Creole style.|3.95|3|salsa|hue
Empanada horneada de espinaca|Baked spinach empanada|Con queso.|With cheese.|3.95|3|salsa|lac,veg
Empanada horneada de jamón y queso|Baked ham and cheese|De la casa.|House special.|3.95|3|salsa|lac`,
    "Paquetes / Packs": `Media docena surtida|Half dozen assorted|Elige sabores.|Pick your flavors.|20.95|0|salsa|
Docena surtida|Dozen assorted|Para la mesa.|For the table.|39.95|0|salsa|
Bandeja para fiesta (50)|Party tray (50)|Con salsas; pedir con 48 horas.|With sauces; order 48 hours ahead.|165.00|0|salsa|
Salsa de ají|Chili sauce|Frasco 8 oz.|8 oz jar.|4.50|0||pica`,
    "Bebidas / Drinks": `Jugo natural|Fresh juice|Del día.|Of the day.|3.95|1|vaso,azu|
Café con leche|Coffee with milk|Caliente.|Hot.|2.95|1||lac`,
  },
};

B.tamales = {
  ph: [29465179, 14179987, 5920644, 8954034],
  sec: {
    "Tamales / Tamales": `Tamal de cerdo en salsa roja|Pork tamale in red sauce|Masa suave en hoja de maíz.|Soft masa in corn husk.|4.25|0|salsa|pica
Tamal de pollo en salsa verde|Chicken tamale in green sauce|Hoja de maíz.|Corn husk.|4.25|0|salsa|pica
Tamal de rajas con queso|Poblano and cheese tamale|Vegetariano.|Vegetarian.|4.25|0|salsa|lac,veg,pica
Tamal dulce|Sweet tamale|Con pasas y fresa.|With raisins and strawberry.|3.75|1||veg
Tamal oaxaqueño|Oaxacan tamale|Mole negro y pollo, hoja de plátano.|Black mole and chicken, banana leaf.|5.50|1|salsa|nuez,pica
Pastel de cerdo y arroz|Pork and rice pastel|Estilo centroamericano.|Central American style.|5.50|2||`,
    "Docenas / Dozens": `Docena de tamales surtidos|Dozen assorted tamales|Elige tus sabores.|Pick your flavors.|45.00|0|salsa|
Media docena de tamales|Half dozen tamales|De un solo sabor.|One flavor.|24.00|0|salsa|
Paquete navideño (4 docenas)|Holiday pack (4 dozen)|Pedir con una semana de anticipación.|Order one week ahead.|165.00|0||`,
    "Bebidas / Drinks": `Atole de champurrado|Champurrado atole|Chocolate y maíz, caliente.|Chocolate and corn, hot.|3.95|3||lac
Atole de vainilla|Vanilla atole|Caliente.|Hot.|3.50|3||lac
Café de olla|Pot coffee|Con piloncillo y canela.|With piloncillo and cinnamon.|3.25|3||`,
  },
};

B.mariscos = {
  ph: [14786461, 30258612, 24289165, 36857725, 31495674],
  sec: {
    "Del mar / From the sea": `Ceviche de camarón|Shrimp ceviche|Limón, cebolla, cilantro y aguacate.|Lime, onion, cilantro and avocado.|14.95|0|pica,extra|mar,pica
Coctel de camarón|Shrimp cocktail|Con salsa de tomate y aguacate.|With tomato sauce and avocado.|15.95|0|tamC|mar
Camarones a la diabla|Devil shrimp|En salsa picosa, con arroz.|In spicy sauce, with rice.|18.95|1||mar,pica
Pescado frito entero|Whole fried fish|Con tostones y ensalada.|With tostones and salad.|19.95|3|salsa|mar
Filete de pescado empanizado|Breaded fish fillet|Con arroz y ensalada.|With rice and salad.|16.95|3||mar
Tacos de pescado (3)|Fish tacos (3)|Con repollo y salsa de chipotle.|With cabbage and chipotle sauce.|13.95|4|tort|mar,pica
Mariscada|Seafood platter|Camarón, pulpo, calamar y pescado.|Shrimp, octopus, squid and fish.|29.95|2||mar
Sopa de mariscos|Seafood soup|Con camarón, pescado y verduras.|With shrimp, fish and vegetables.|17.95|2|tam|mar`,
    "Aperitivos / Starters": `Calamares fritos|Fried calamari|Con salsa tártara.|With tartar sauce.|11.95|2||mar
Aguachile verde|Green aguachile|Camarón en limón y chile serrano.|Shrimp in lime and serrano chile.|15.95|0|pica|mar,pica
Tostada de ceviche (2)|Ceviche tostadas (2)|Con aguacate.|With avocado.|7.95|0||mar`,
    "Bebidas / Drinks": `Michelada sin alcohol|Virgin michelada|Limón, sal y salsa picante.|Lime, salt and hot sauce.|4.95|0||pica
Limonada mineral|Mineral lemonade|Fría.|Cold.|3.95|0|vaso,azu|`,
  },
};

B.parrilla = {
  ph: [34822475, 29075345, 6166796, 31917730, 7931037],
  sec: {
    "Cortes a la parrilla / Grilled cuts": `Churrasco|Skirt steak|10 oz, con papas y ensalada.|10 oz, with potatoes and salad.|23.95|0|cocc,acomp|
Ribeye|Ribeye|14 oz de res, a las brasas.|14 oz charcoal-grilled beef.|31.95|1|cocc,acomp|
Costillas de cerdo|Pork ribs|Media tira glaseada.|Glazed half rack.|21.95|2|acomp|
Pechuga a la parrilla|Grilled chicken breast|Con chimichurri.|With chimichurri.|16.95|3|acomp|
Chuleta ahumada|Smoked pork chop|Con tostones.|With tostones.|17.95|2|acomp|
Parrillada familiar|Family grill platter|Cuatro carnes y chorizo; sirve 4 a 5.|Four meats and chorizo; serves 4 to 5.|79.95|3|acomp|
Chorizo criollo|Creole chorizo|A las brasas, con arepa.|Charcoal-grilled, with arepa.|8.95|2||`,
    "Acompañantes / Sides": `Papas fritas|French fries|Porción grande.|Large portion.|4.95|4||veg,sg
Yuca frita|Fried yuca|Con salsa de ajo.|With garlic sauce.|5.50|4||veg,sg
Ensalada de la casa|House salad|Lechuga, tomate y aguacate.|Lettuce, tomato and avocado.|6.50|4||veg,sg
Maduros|Sweet plantains|Fritos.|Fried.|4.95|4||veg,sg`,
    "Bebidas y postres / Drinks and desserts": `Limonada|Lemonade|Natural.|Fresh.|3.95|4|vaso,azu|
Flan|Flan|Con caramelo.|With caramel.|5.50|4||lac,hue`,
  },
};

B.bbq = {
  ph: [34822475, 29075345, 6166796, 7931037, 31917730],
  sec: {
    "Ahumados / Smoked meats": `Costillas de cerdo, media tira|Pork ribs, half rack|Ahumadas 8 horas con salsa BBQ.|Smoked 8 hours with BBQ sauce.|22.95|0|acomp,salsaW|
Brisket por libra|Brisket by the pound|Res ahumada en rebanadas.|Sliced smoked beef.|26.95|1|acomp|
Pulled pork sándwich|Pulled pork sandwich|Cerdo deshebrado con coleslaw.|Pulled pork with coleslaw.|11.95|2|acomp|
Pollo ahumado medio|Smoked half chicken|Con dos acompañantes.|With two sides.|15.95|3|acomp|
Chorizo asado|Roasted chorizo|A la leña, con arepa.|Wood-fired, with arepa.|9.95|2||
Platter de tres carnes|Three-meat platter|Costilla, brisket y pollo, con dos acompañantes.|Ribs, brisket and chicken, with two sides.|29.95|0|acomp|`,
    "Acompañantes / Sides": `Coleslaw|Coleslaw|Fresco.|Fresh.|4.50|4||lac,veg
Frijoles estilo BBQ|BBQ beans|Con tocino.|With bacon.|4.50|4||
Mac and cheese|Mac and cheese|Gratinado.|Baked.|5.50|4||lac,veg
Elote asado|Grilled corn|Con mantequilla y queso.|With butter and cheese.|4.95|4||lac,veg`,
    "Para compartir / To share": `Bandeja para 10|Tray for 10|Costilla, pollo y dos acompañantes.|Ribs, chicken and two sides.|179.00|0||
Asado para el equipo|Team cookout|Cuatro carnes para 20; pedir con 3 días.|Four meats for 20; order 3 days ahead.|329.00|0||
Salsa BBQ de la casa 16 oz|House BBQ sauce 16 oz|Dulce o picante.|Sweet or spicy.|7.50|0||`,
  },
};

B.polloAsado = {
  ph: [8696558, 37228289, 17692193, 2097090, 5779787],
  sec: {
    "Pollo a la brasa / Rotisserie chicken": `Pollo entero|Whole chicken|Con papas y ensalada; rinde 4.|With fries and salad; serves 4.|19.95|0|salsa,extra|
Medio pollo|Half chicken|Con papas y ensalada.|With fries and salad.|11.95|1|salsa,extra|
Un cuarto de pollo|Quarter chicken|Pierna o pechuga, con papas.|Leg or breast, with fries.|8.95|2|salsa,extra|
Combo familiar|Family combo|Dos pollos, papas grandes, ensalada y 2 litros.|Two chickens, large fries, salad and 2-liter soda.|42.95|0|salsa|
Alitas a la brasa (8)|Rotisserie wings (8)|Con salsa de ajo.|With garlic sauce.|10.95|2|salsa|
Pollo con arroz chaufa|Chicken with chaufa rice|Cuarto de pollo y arroz frito.|Quarter chicken with fried rice.|12.95|1||hue`,
    "Acompañantes / Sides": `Papas fritas|French fries|Porción grande.|Large portion.|4.50|3||veg,sg
Ensalada fresca|Fresh salad|De la casa.|House salad.|4.50|3||veg,sg
Yuca frita|Fried yuca|Con ají.|With chili sauce.|4.95|3||veg,sg
Maduros|Sweet plantains|Fritos.|Fried.|4.50|3||veg,sg
Cremas de la casa (3)|House sauces (3)|Ají, ajo y rocoto.|Chili, garlic and rocoto.|3.00|3||pica`,
    "Bebidas / Drinks": `Chicha morada 16 oz|Chicha morada 16 oz|Casera.|Homemade.|3.95|4||
Gaseosa 2 litros|2-liter soda|Fría.|Chilled.|3.50|4||`,
  },
};

B.polloFrito = {
  ph: [14686443, 8696558, 17692193, 37228289, 2097090],
  sec: {
    "Pollo frito / Fried chicken": `Combo 2 piezas|2-piece combo|Con papas y bebida.|With fries and a drink.|9.95|0|salsa|
Combo 3 piezas|3-piece combo|Con papas y bebida.|With fries and a drink.|11.95|0|salsa|
Cubeta de 8 piezas|8-piece bucket|Con dos acompañantes.|With two sides.|21.95|1|salsa|
Sándwich de pollo crujiente|Crispy chicken sandwich|Pan brioche, pepinillos y mayonesa.|Brioche bun, pickles and mayo.|9.95|2|extra,pica|
Tenders (5)|Tenders (5)|Con aderezo.|With dip.|9.50|2|salsa|
Pica pollo|Pica pollo|Trozos fritos con tostones.|Fried pieces with tostones.|12.95|0|salsa|`,
    "Alitas / Wings": `Alitas (10)|Wings (10)|Con salsa a elegir.|With your choice of sauce.|13.95|3|salsaW|lac
Alitas (20)|Wings (20)|Para compartir.|To share.|24.95|3|salsaW|lac
Boneless (12)|Boneless (12)|Con salsa y aderezo.|With sauce and dressing.|12.95|3|salsaW|lac
Combo alitas y cerveza sin alcohol|Wings and non-alcoholic beer combo|10 alitas y dos botellas.|10 wings and two bottles.|18.95|3|salsaW|`,
    "Acompañantes / Sides": `Papas fritas|French fries|Porción grande.|Large portion.|4.50|4||veg,sg
Ensalada de repollo|Coleslaw|Fresca.|Fresh.|3.95|4||lac,veg
Tostones|Tostones|Con mayoketchup.|With mayo-ketchup.|5.50|4||veg,sg
Galleta con miel|Biscuit with honey|Calientita.|Warm.|2.50|4||lac,hue`,
  },
};

B.sandwiches = {
  ph: [30811288, 5920681, 2097090, 5779787, 1633668],
  sec: {
    "Sándwiches / Sandwiches": `Cubano|Cuban sandwich|Cerdo, jamón, queso suizo y pepinillo, prensado.|Pork, ham, Swiss cheese and pickle, pressed.|11.95|0|extra|lac
Medianoche|Medianoche|Pan dulce con cerdo, jamón y queso.|Sweet bread with pork, ham and cheese.|11.95|0|extra|lac
Pan con lechón|Roast pork sandwich|Con cebolla y mojo.|With onion and mojo.|10.95|0|extra|
Sándwich de pollo a la parrilla|Grilled chicken sandwich|Con aguacate y tomate.|With avocado and tomato.|10.95|1|extra,pan|
Triple de jamón y queso|Triple ham and cheese|En pan de molde.|On sliced bread.|9.95|1|extra,pan|lac
Sándwich vegetariano|Vegetarian sandwich|Aguacate, queso, tomate y lechuga.|Avocado, cheese, tomato and lettuce.|9.95|2|pan|lac,veg`,
    "Tortas y chimis / Tortas and chimis": `Torta de milanesa|Milanesa torta|Con frijoles, aguacate y queso.|With beans, avocado and cheese.|11.50|3|pica,extra|lac,hue
Torta cubana|Cubana torta|Jamón, salchicha, huevo y queso.|Ham, sausage, egg and cheese.|12.50|3|pica,extra|lac,hue
Chimi dominicano|Dominican chimi|Hamburguesa en pan de agua con repollo.|Burger on water bread with cabbage.|8.95|3|salsa|
Pambazo|Pambazo|Pan bañado en salsa roja, con papa y chorizo.|Bread dipped in red sauce, with potato and chorizo.|8.95|3||pica`,
    "Acompañantes / Sides": `Papitas|Chips|Bolsa.|Bag.|1.75|4||veg,sg
Tostones|Tostones|Con salsa de ajo.|With garlic sauce.|5.50|4||veg,sg
Batido de mamey|Mamey shake|Con leche.|With milk.|5.50|4|tamC|lac
Refresco|Soda|Lata.|Can.|1.75|4||`,
  },
};

B.hamburguesas = {
  ph: [4109233, 2097090, 5779787, 17692193, 1633668],
  sec: {
    "Hamburguesas / Burgers": `Clásica|Classic|Res, lechuga, tomate, cebolla y queso.|Beef, lettuce, tomato, onion and cheese.|9.95|0|cocc,extra|lac
Doble con queso|Double cheese|Dos carnes y doble queso.|Two patties and double cheese.|12.95|0|cocc,extra|lac
Burger latina|Latin burger|Con chorizo, aguacate y salsa de ají.|With chorizo, avocado and chili sauce.|12.95|0|cocc,extra|lac,pica
Burger de pollo crujiente|Crispy chicken burger|Con pepinillos.|With pickles.|10.95|0|extra|
Burger con tocino y BBQ|Bacon BBQ burger|Con aros de cebolla.|With onion rings.|13.50|0|cocc,extra|lac
Burger vegetariana|Veggie burger|Frijol negro y quinoa.|Black bean and quinoa.|10.95|0|extra|veg
Perro caliente especial|Special hot dog|Con papitas, queso y salsas.|With crushed chips, cheese and sauces.|6.95|0|salsa|lac`,
    "Acompañantes / Sides": `Papas fritas|French fries|Crujientes.|Crispy.|4.25|1||veg,sg
Aros de cebolla|Onion rings|Con aderezo.|With dip.|5.50|1||
Tostones con ketchup|Tostones with ketchup|Ocho piezas.|Eight pieces.|5.50|1||veg,sg
Ensalada pequeña|Small salad|Con aderezo.|With dressing.|4.50|1||veg,sg`,
    "Combos y bebidas / Combos and drinks": `Combo clásica|Classic combo|Burger clásica, papas y soda.|Classic burger, fries and soda.|13.50|2||
Malteada|Milkshake|Vainilla, chocolate o fresa.|Vanilla, chocolate or strawberry.|6.25|2|tamC|lac
Soda|Soda|Refill gratis.|Free refill.|2.50|2||`,
  },
};

B.desayunos = {
  ph: [15640157, 19252265, 14810483, 2097090, 5779787],
  sec: {
    "Desayunos / Breakfast": `Mangú con tres golpes|Mangú with three hits|Plátano majado, salami, queso frito y huevo.|Mashed plantain, salami, fried cheese and egg.|11.95|2||hue,lac
Huevos al gusto con tostones|Eggs your way with tostones|Dos huevos y queso frito.|Two eggs and fried cheese.|9.95|0|extra|hue,lac
Desayuno americano|American breakfast|Huevos, tocino, tostadas y papas.|Eggs, bacon, toast and home fries.|10.95|0||hue
Chilaquiles rojos|Red chilaquiles|Con huevo, crema y queso.|With egg, cream and cheese.|11.50|0|pica|hue,lac,pica
Arepa con huevo y queso|Arepa with egg and cheese|Calientita.|Warm.|7.95|0||hue,lac
Tostada de aguacate con huevo|Avocado toast with egg|Pan artesanal.|Artisan bread.|9.95|3||hue,veg
Avena con frutas|Oatmeal with fruit|Con canela.|With cinnamon.|6.50|3||veg`,
    "Panqueques y dulces / Pancakes and sweets": `Panqueques (3)|Pancakes (3)|Con mantequilla y sirope.|With butter and syrup.|8.95|3||lac,hue
Tostada francesa|French toast|Pan de agua con canela.|Cinnamon water bread.|8.95|3||lac,hue
Waffle con fresas|Waffle with strawberries|Con crema.|With cream.|9.50|3||lac,hue`,
    "Café y bebidas / Coffee and drinks": `Café con leche|Coffee with milk|Grande.|Large.|3.50|1|leche|lac
Café negro|Black coffee|De filtro.|Drip.|2.50|1||
Jugo de naranja|Orange juice|Natural.|Fresh.|4.25|4|tamC|
Chocolate caliente|Hot chocolate|Con espuma.|Frothy.|3.75|1||lac`,
  },
};

B.buffet = {
  ph: [36408393, 2337843, 12253092, 34321369, 1633668],
  sec: {
    "Buffet / Buffet": `Buffet libre almuerzo|Lunch buffet|Seis platos calientes, ensaladas y postres; de lunes a viernes.|Six hot dishes, salads and desserts; Monday to Friday.|14.95|0||
Buffet libre cena|Dinner buffet|Ocho platos calientes, estación de carnes y postres.|Eight hot dishes, carving station and desserts.|18.95|0||
Buffet de fin de semana|Weekend buffet|Platos típicos y estación de parrilla.|Traditional dishes and grill station.|21.95|0||
Buffet infantil|Kids buffet|Niños de 4 a 10 años.|Children 4 to 10.|9.95|0||
Buffet para llevar por libra|Takeout buffet by the pound|Elige de la barra.|Choose from the bar.|9.95|1|tamC|`,
    "Bandejas para eventos / Event trays": `Bandeja de arroz con pollo (20)|Chicken and rice tray (20)|Pedir con 48 horas.|Order 48 hours ahead.|89.00|2||
Bandeja de pernil (20)|Roast pork tray (20)|Con moro.|With moro rice.|109.00|2||
Bandeja de ensalada (20)|Salad tray (20)|Fresca.|Fresh.|49.00|2||veg
Bandeja de postres (24)|Dessert tray (24)|Surtidos.|Assorted.|59.00|2||lac,hue`,
    "Bebidas / Drinks": `Bebida libre|Free-refill drink|Con el buffet.|With the buffet.|2.95|3||
Jugo natural|Fresh juice|Del día.|Of the day.|3.50|3||`,
  },
};

B.vegetariana = {
  ph: [5779787, 2097090, 1633668, 37516560, 27518954, 7931037],
  sec: {
    "Platos fuertes / Main dishes": `Bowl de frijoles y aguacate|Bean and avocado bowl|Arroz integral, frijoles, aguacate y pico de gallo.|Brown rice, beans, avocado and pico de gallo.|12.95|0|extra,pica|veg,sg
Tacos de hongos (3)|Mushroom tacos (3)|Hongos salteados con cebolla y salsa verde.|Sautéed mushrooms with onion and green salsa.|11.95|3|tort,salsa|veg
Hamburguesa de lentejas|Lentil burger|Con papas al horno.|With baked potatoes.|12.95|1|extra|veg
Curry de garbanzos|Chickpea curry|Con arroz y plátano maduro.|With rice and sweet plantain.|13.95|2||veg,sg
Pupusas de queso vegano (3)|Vegan cheese pupusas (3)|Con curtido.|With curtido.|10.95|1|salsa|veg
Lasaña de verduras|Vegetable lasagna|Con calabacín y espinaca.|With zucchini and spinach.|13.95|1||veg,lac
Ensalada de quinoa|Quinoa salad|Con vegetales asados y limón.|With roasted vegetables and lime.|11.95|0||veg,sg`,
    "Desayunos y snacks / Breakfast and snacks": `Tofu revuelto|Tofu scramble|Con tomate, cebolla y pimiento.|With tomato, onion and pepper.|9.95|2||veg,sg
Hummus con vegetales|Hummus with vegetables|Con pan pita.|With pita bread.|8.95|2||veg
Barra de granola|Granola bar|Casera, con semillas.|Homemade, with seeds.|3.50|2||veg,nuez`,
    "Jugos y postres / Juices and desserts": `Jugo verde|Green juice|Piña, pepino, apio y limón.|Pineapple, cucumber, celery and lime.|6.95|4|tamC,azu|veg,sg
Batido de avena y mango|Oat and mango smoothie|Con leche de avena.|With oat milk.|6.95|4|tamC|veg
Mousse de aguacate|Avocado mousse|Con cacao.|With cacao.|5.95|4||veg`,
  },
};
