/* R2 · FOOD · catálogos de platos (parte A: cocinas de restaurante sin catálogo en la ronda 1). Formato de línea:
   es|en|descEs|descEn|precio|foto(índice en ph)|grupos|etiquetas      (etiquetas: pica veg sg mar lac hue nuez)
   La clave de cada sección es «Nombre es / Name en». Fotos: solo IDs de images.pexels.com que ya están en las semillas del repo. */

export const A = {};

A.peruana = {
  ph: [8696558, 37228289, 17692193, 36857725, 14786461, 2097090, 5779787, 1633668],
  sec: {
    "Ceviches y tiraditos / Ceviches and tiraditos": `Ceviche clásico|Classic ceviche|Pescado fresco en leche de tigre, cebolla, camote y choclo.|Fresh fish in tiger's milk with onion, sweet potato and corn.|16.95|3|pica,extra|mar,pica
Ceviche mixto|Mixed ceviche|Pescado, camarón y pulpo con ají limo.|Fish, shrimp and octopus with limo chili.|19.95|4|pica|mar,pica
Tiradito al ají amarillo|Yellow chili tiradito|Láminas de pescado con crema de ají amarillo.|Sliced fish with yellow chili cream.|17.95|3|pica|mar,pica
Leche de tigre|Tiger's milk|Vaso del jugo del ceviche con cancha.|Glass of ceviche juice with toasted corn.|8.95|4|pica|mar,pica`,
    "Platos fuertes / Main dishes": `Lomo saltado|Lomo saltado|Res salteada al wok con cebolla, tomate, papas fritas y arroz.|Wok-seared beef with onion, tomato, fries and rice.|17.95|7|extra,quita|
Pollo a la brasa un cuarto|Quarter rotisserie chicken|Con papas fritas y ensalada, y cremas de ají.|With fries, salad and chili creams.|11.95|0|salsa,extra|
Ají de gallina|Ají de gallina|Pollo deshilachado en crema de ají amarillo, con arroz y papa.|Shredded chicken in yellow chili cream with rice and potato.|15.95|1|extra|lac,nuez,pica
Arroz chaufa de pollo|Chicken chaufa rice|Arroz frito estilo peruano con huevo y cebollino.|Peruvian-style fried rice with egg and scallion.|14.95|5|extra,quita|hue
Tallarín saltado|Tallarín saltado|Fideos salteados con res, verduras y salsa de soya.|Stir-fried noodles with beef, vegetables and soy sauce.|16.95|7|extra|
Seco de res con frejoles|Beef seco with beans|Res guisada con cilantro, frejoles canarios y arroz.|Cilantro beef stew with canary beans and rice.|16.95|7||
Pescado frito a lo macho|Fried fish a lo macho|Filete frito cubierto de salsa de mariscos.|Fried fillet topped with seafood sauce.|20.95|3||mar
Papa a la huancaína|Papa a la huancaína|Papas con crema de queso y ají amarillo.|Potatoes with cheese and yellow chili cream.|9.95|7||lac,veg,pica`,
    "Sopas / Soups": `Parihuela|Parihuela|Sopa de mariscos con ají panca.|Seafood soup with panca chili.|18.95|4|tam|mar,pica
Sopa criolla|Creole soup|Fideo fino, res y huevo.|Fine noodles, beef and egg.|11.95|7|tam|hue`,
    "Postres y bebidas / Desserts and drinks": `Suspiro limeño|Suspiro limeño|Manjar blanco con merengue de oporto.|Dulce de leche with port meringue.|6.95|7||lac,hue
Chicha morada|Chicha morada|Maíz morado con piña y canela.|Purple corn with pineapple and cinnamon.|4.95|5|vaso,azu|
Inca Kola 20 oz|Inca Kola 20 oz|Botella fría.|Chilled bottle.|3.25|5||`,
  },
};

A.ecuatoriana = {
  ph: [31495674, 30258612, 24289165, 27397342, 1633668, 8954034, 36857725],
  sec: {
    "Sopas y encebollados / Soups and encebollados": `Encebollado de albacora|Albacore encebollado|Sopa de pescado con yuca, cebolla curtida y limón.|Fish soup with yuca, pickled onion and lime.|13.95|0|tam,extra|mar
Encebollado mixto|Mixed encebollado|Con camarón y chifles.|With shrimp and plantain chips.|16.95|0|tam|mar
Caldo de bolas de verde|Green plantain dumpling soup|Bolas de plátano rellenas de carne en caldo de maní.|Plantain dumplings stuffed with meat in peanut broth.|12.95|3|tam|nuez
Locro de papa|Potato locro|Sopa cremosa de papa con queso y aguacate.|Creamy potato soup with cheese and avocado.|10.95|3|tam|lac,veg
Caldo de gallina|Hen soup|Con arroz y aguacate.|With rice and avocado.|11.95|3|tam|`,
    "Platos fuertes / Main dishes": `Hornado con mote|Roast pork with hominy|Cerdo al horno con mote, llapingachos y encurtido.|Oven-roasted pork with hominy, potato patties and pickled onion.|16.95|5|extra|
Seco de pollo|Chicken seco|Pollo guisado en cerveza y cilantro, con arroz y maduro.|Chicken stewed with cilantro, with rice and sweet plantain.|14.95|4|extra|
Ceviche de camarón|Shrimp ceviche|Camarón en salsa de tomate y limón, con chifles.|Shrimp in tomato and lime sauce, with plantain chips.|15.95|2|pica|mar
Guatita|Guatita|Callos en salsa de maní con arroz y aguacate.|Tripe in peanut sauce with rice and avocado.|15.95|5||nuez
Fritada con llapingachos|Fritada with potato patties|Cerdo frito con mote, tostado y ensalada.|Fried pork with hominy, toasted corn and salad.|15.95|5|extra|
Pescado frito con patacones|Fried fish with patacones|Pescado entero con arroz y ensalada.|Whole fish with rice and salad.|17.95|6||mar`,
    "Antojitos / Snacks": `Empanadas de viento (3)|Cheese empanadas (3)|Masa frita de queso con azúcar.|Fried cheese pastry with sugar.|6.95|4||lac
Humitas (2)|Humitas (2)|Tamal de choclo tierno con queso.|Fresh corn tamale with cheese.|6.50|4||lac,veg
Patacones con queso|Patacones with cheese|Plátano verde frito con queso fresco.|Fried green plantain with fresh cheese.|6.95|4||lac,veg`,
    "Bebidas y postres / Drinks and desserts": `Jugo de naranjilla|Naranjilla juice|Natural, sin azúcar añadida si prefieres.|Natural; no added sugar if you prefer.|4.50|4|vaso,azu|
Colada morada|Colada morada|Bebida espesa de maíz morado y frutas, de temporada.|Thick purple corn and fruit drink, seasonal.|4.95|4||
Helado de paila|Paila ice cream|Sorbete artesanal de frutas.|Handmade fruit sherbet.|4.50|4||`,
  },
};

A.guatemalteca = {
  ph: [29465179, 14179987, 8954034, 1633668, 5779787, 2097090],
  sec: {
    "Platos fuertes / Main dishes": `Pepián de pollo|Chicken pepián|Recado de chiles y semillas con arroz y tortillas.|Chile and seed stew with rice and tortillas.|15.95|0|tort|nuez,pica
Jocón|Jocón|Pollo en salsa verde de tomatillo y cilantro.|Chicken in green tomatillo and cilantro sauce.|14.95|1|tort|
Kak'ik|Kak'ik|Caldo de pavo con chile cobán y especias.|Turkey broth with cobán chile and spices.|16.95|2|tam|pica
Chiles rellenos|Stuffed peppers|Con carne y verduras, capeados, en salsa de tomate.|With meat and vegetables, battered, in tomato sauce.|15.95|3|extra|hue
Churrasco chapín|Chapín grilled steak|Con chirmol, guacamol y frijoles volteados.|With chirmol, guacamole and refried beans.|19.95|3|cocc|
Carne guisada|Stewed beef|Con arroz y tortillas.|With rice and tortillas.|13.95|3|tort|
Rellenitos de plátano (4)|Plantain rellenitos (4)|Plátano maduro relleno de frijol, con crema.|Sweet plantain filled with beans, with cream.|8.95|5||lac,veg`,
    "Tamales / Tamales": `Tamal colorado de cerdo|Red pork tamale|Masa en recado rojo, envuelta en hoja de plátano.|Masa in red recado, wrapped in banana leaf.|4.95|0|salsa|pica
Tamalitos de chipilín (3)|Chipilín tamalitos (3)|Hojas de maíz con queso.|Corn husks with cheese.|6.95|1||lac,veg
Paches de papa|Potato paches|Masa de papa con recado, típicos de los jueves.|Potato dough with recado, a Thursday tradition.|5.95|0||`,
    "Antojitos / Snacks": `Pupusas chapinas (3)|Chapín pupusas (3)|Con queso y frijol.|With cheese and beans.|8.95|3|salsa|lac,veg
Tostadas con guacamol (3)|Tostadas with guacamole (3)|Tostadas con guacamol, chirmol y queso.|Tostadas with guacamole, chirmol and cheese.|7.95|3||veg,lac
Plátanos en mole|Plantains in mole|Plátano maduro frito en mole de chocolate.|Fried sweet plantain in chocolate mole.|7.50|5||nuez`,
    "Bebidas y postres / Drinks and desserts": `Atol de elote|Corn atol|Caliente, dulce y espeso.|Hot, sweet and thick.|3.95|4||lac
Rosa de jamaica|Hibiscus drink|Fresca y sin leche.|Fresh, dairy-free.|3.50|4|vaso,azu|
Rellenitos con chocolate|Rellenitos with chocolate|Postre de plátano y frijol dulce.|Plantain and sweet bean dessert.|6.50|5||`,
  },
};

A.argentina = {
  ph: [31917730, 7931037, 34822475, 29075345, 6166796, 36905236],
  sec: {
    "Empanadas / Empanadas": `Empanada de carne cortada a cuchillo|Knife-cut beef empanada|Al horno, con cebolla, huevo y aceituna.|Baked, with onion, egg and olive.|3.75|5|salsa|hue
Empanada de humita|Humita empanada|Choclo cremoso con queso.|Creamy corn with cheese.|3.75|5|salsa|lac,veg
Empanada de jamón y queso|Ham and cheese empanada|Al horno.|Baked.|3.75|5|salsa|lac
Docena de empanadas surtidas|Dozen assorted empanadas|Para compartir; elige tus sabores al pedir.|To share; choose your flavors when ordering.|39.00|5|salsa|lac,hue`,
    "Parrilla / Grill": `Asado de tira|Short ribs|Costilla a las brasas con chimichurri.|Charcoal short ribs with chimichurri.|24.95|0|cocc,acomp|
Bife de chorizo|Sirloin steak|Corte de 12 oz con papas rústicas.|12 oz cut with rustic potatoes.|27.95|1|cocc,acomp|
Vacío|Flank steak|Cocción lenta a la parrilla.|Slow grilled.|25.95|2|cocc,acomp|
Choripán|Choripán|Chorizo criollo en pan con chimichurri.|Creole sausage in bread with chimichurri.|9.95|3|salsa|
Provoleta|Provoleta|Queso provolone a la parrilla con orégano.|Grilled provolone with oregano.|11.95|4||lac,veg
Parrillada para dos|Grill platter for two|Asado, vacío, chorizo, morcilla y papas.|Short ribs, flank, sausage, blood sausage and potatoes.|54.95|0|acomp|`,
    "Minutas / Quick plates": `Milanesa napolitana|Napolitana milanesa|Con jamón, salsa y queso gratinado, y papas fritas.|With ham, sauce and melted cheese, and fries.|17.95|4|acomp|lac,hue
Ñoquis con salsa|Gnocchi with sauce|Del día 29, con salsa boloñesa o fileto.|Day-29 gnocchi, bolognese or fileto sauce.|14.95|4||hue
Ensalada mixta|Mixed salad|Lechuga, tomate y cebolla.|Lettuce, tomato and onion.|6.95|4||veg,sg`,
    "Postres y bebidas / Desserts and drinks": `Flan con dulce de leche|Flan with dulce de leche|Con crema.|With cream.|6.95|4||lac,hue
Alfajor de maicena (2)|Maicena alfajores (2)|Rellenos de dulce de leche y coco.|Filled with dulce de leche and coconut.|4.50|4||lac,hue
Mate cocido|Mate cocido|Infusión caliente.|Hot infusion.|3.25|4||`,
  },
};

A.brasilena = {
  ph: [31917730, 7931037, 34822475, 2097090, 1633668, 5779787],
  sec: {
    "Rodízio y parrilla / Rodízio and grill": `Picanha na chapa|Picanha on the griddle|Picanha en láminas con arroz, farofa y vinagrete.|Sliced picanha with rice, farofa and vinaigrette.|24.95|0|cocc|
Rodízio por persona|Rodízio per person|Cortes sin límite en la mesa; mínimo dos personas.|Unlimited cuts at the table; minimum two people.|39.95|1||
Fraldinha|Fraldinha|Falda de res a las brasas.|Charcoal flank steak.|22.95|2|cocc|
Linguiça com cebola|Sausage with onions|Salchicha artesanal.|Handmade sausage.|13.95|2||
Frango à passarinho|Garlic fried chicken|Trozos de pollo frito con ajo.|Garlic fried chicken pieces.|14.95|2||`,
    "Platos de la casa / House dishes": `Feijoada completa|Feijoada completa|Frijol negro con cerdo y res, arroz, couve y naranja; sábados.|Black beans with pork and beef, rice, collard greens and orange; Saturdays.|19.95|3||
Moqueca de pescado|Fish moqueca|Pescado en leche de coco, dendê y pimiento, con arroz.|Fish in coconut milk, palm oil and pepper, with rice.|21.95|3||mar
Strogonoff de frango|Chicken stroganoff|Con arroz y papas paja.|With rice and shoestring potatoes.|15.95|3||lac
Prato feito|Prato feito|Arroz, feijão, bife, huevo y ensalada.|Rice, beans, steak, egg and salad.|14.95|3||hue`,
    "Salgados y postres / Savory snacks and desserts": `Pão de queijo (8)|Cheese bread (8)|Panecillos de queso recién horneados.|Freshly baked cheese rolls.|6.95|4||lac,hue,sg
Coxinha de frango (3)|Chicken coxinha (3)|Croqueta de pollo desmenuzado.|Shredded chicken croquettes.|7.95|4||
Brigadeiro (6)|Brigadeiro (6)|Bombones de chocolate.|Chocolate truffles.|7.50|5||lac
Guaraná|Guaraná|Lata fría.|Chilled can.|2.75|5||`,
  },
};

A.espanola = {
  ph: [24906297, 14786461, 5779787, 2097090, 1633668],
  sec: {
    "Paellas / Paellas": `Paella valenciana|Valencian paella|Pollo, conejo y verduras; mínimo dos personas, precio por persona.|Chicken, rabbit and vegetables; minimum two, price per person.|19.95|0||
Paella de mariscos|Seafood paella|Gambas, mejillones y calamar; precio por persona.|Prawns, mussels and squid; price per person.|23.95|0||mar
Arroz negro|Black rice|Con tinta de calamar y alioli.|With squid ink and aioli.|22.95|0||mar,hue
Fideuà|Fideuà|Fideos tostados con mariscos.|Toasted noodles with seafood.|21.95|0||mar`,
    "Tapas / Tapas": `Tortilla española|Spanish omelet|Papa y cebolla, con alioli.|Potato and onion, with aioli.|8.95|2|salsa|hue,veg
Croquetas de jamón (6)|Ham croquettes (6)|Cremosas, fritas al momento.|Creamy, fried to order.|9.95|3||lac
Patatas bravas|Patatas bravas|Con salsa brava y alioli.|With brava sauce and aioli.|8.50|3|pica|veg,pica
Gambas al ajillo|Garlic prawns|En aceite de oliva, con pan.|In olive oil, with bread.|13.95|1||mar
Pulpo a la gallega|Galician octopus|Con papa, pimentón y aceite de oliva.|With potato, paprika and olive oil.|17.95|1||mar
Pan con tomate|Tomato bread|Tostadas con tomate rallado.|Toast with grated tomato.|5.50|4||veg`,
    "Postres y bebidas / Desserts and drinks": `Crema catalana|Crema catalana|Con azúcar caramelizada.|With caramelized sugar.|6.95|4||lac,hue
Churros con chocolate|Churros with chocolate|Cuatro churros y taza de chocolate espeso.|Four churros and a cup of thick chocolate.|7.50|4||lac
Sangría sin alcohol|Alcohol-free sangria|Frutas y jugo de uva, jarra.|Fruit and grape juice, pitcher.|14.00|4||`,
  },
};

A.fusion = {
  ph: [36750270, 4940832, 6310256, 2097090, 5779787, 1633668],
  sec: {
    "Para empezar / Starters": `Tacos de bao de cerdo (2)|Pork bao tacos (2)|Pan bao al vapor con cerdo al pastor y piña.|Steamed bao with al pastor pork and pineapple.|9.95|0|pica|
Ceviche con sabor a sushi|Sushi-style ceviche|Atún, aguacate y salsa de ají amarillo.|Tuna, avocado and yellow chili sauce.|14.95|3|pica|mar,pica
Empanadas de kimchi y queso (3)|Kimchi and cheese empanadas (3)|Masa crujiente con kimchi.|Crispy dough with kimchi.|8.95|3|salsa|lac,pica
Nachos de plátano|Plantain nachos|Chips de plátano con guacamole y pico de gallo.|Plantain chips with guacamole and pico de gallo.|9.50|2||veg,sg`,
    "Platos fuertes / Main dishes": `Arroz chaufa criollo|Creole fried rice|Arroz frito con chorizo, plátano y huevo.|Fried rice with chorizo, plantain and egg.|14.95|1|extra|hue
Poke bowl latino|Latino poke bowl|Atún, mango, aguacate, edamame y arroz.|Tuna, mango, avocado, edamame and rice.|15.95|1|extra,quita|mar
Burrito de pernil|Pernil burrito|Cerdo asado lento, arroz, frijoles y salsa criolla.|Slow-roasted pork, rice, beans and creole salsa.|13.95|2|pica,extra|
Bowl de pollo teriyaki criollo|Creole teriyaki chicken bowl|Con arroz y vegetales salteados.|With rice and sautéed vegetables.|13.95|1|extra|
Hamburguesa de res con mofongo|Beef burger with mofongo|Pan brioche y queso, con ensalada.|Brioche bun and cheese, with salad.|15.95|2|extra,cocc|lac
Quesadilla de lechón|Roast pork quesadilla|Con queso y cebolla caramelizada.|With cheese and caramelized onion.|12.95|2|salsa|lac`,
    "Postres y bebidas / Desserts and drinks": `Tres leches de matcha|Matcha tres leches|Bizcocho humedecido con crema de té verde.|Sponge soaked in green tea cream.|6.95|4||lac,hue
Churros rellenos de dulce de leche (4)|Dulce de leche churros (4)|Con azúcar y canela.|With sugar and cinnamon.|6.95|4||lac
Limonada de maracuyá|Passion fruit lemonade|Hecha al momento.|Made to order.|4.50|5|vaso,azu|`,
  },
};

A.americana = {
  ph: [4109233, 8696558, 15640157, 17692193, 37228289, 2097090],
  sec: {
    "Desayuno todo el día / All-day breakfast": `Huevos con tocino|Eggs and bacon|Dos huevos, tocino, tostadas y papas.|Two eggs, bacon, toast and home fries.|10.95|2|extra|hue
Pancakes de suero (3)|Buttermilk pancakes (3)|Con mantequilla y sirope.|With butter and syrup.|9.50|2||lac,hue
Omelette del granjero|Farmer's omelet|Jamón, pimiento, cebolla y queso.|Ham, pepper, onion and cheese.|11.95|2|extra|hue,lac`,
    "Clásicos / Diner classics": `Hamburguesa clásica|Classic burger|Res, lechuga, tomate y queso, con papas.|Beef, lettuce, tomato and cheese, with fries.|13.95|0|extra,cocc|lac
Sándwich de pavo club|Turkey club|Pavo, tocino y tomate, en pan tostado.|Turkey, bacon and tomato on toasted bread.|12.95|0|extra|
Alitas de pollo (10)|Chicken wings (10)|Con salsa a elegir y aderezo.|With your choice of sauce and dressing.|13.95|3|salsaW|lac
Mac and cheese|Mac and cheese|Gratinado al horno.|Oven-baked.|8.95|0||lac,veg
Pollo frito con puré|Fried chicken with mash|Dos piezas y gravy.|Two pieces with gravy.|14.95|3||
Filete de pollo a la parrilla|Grilled chicken fillet|Con vegetales y papa al horno.|With vegetables and baked potato.|15.95|4||`,
    "Postres y bebidas / Desserts and drinks": `Pay de manzana|Apple pie|Con helado de vainilla.|With vanilla ice cream.|6.95|5||lac,hue
Malteada|Milkshake|De vainilla, chocolate o fresa.|Vanilla, chocolate or strawberry.|6.50|5|tamC|lac
Café de filtro|Drip coffee|Con rellenos ilimitados.|With free refills.|2.95|5||`,
  },
};

A.china = {
  ph: [4940832, 36750270, 2097090, 5779787],
  sec: {
    "Platos fuertes / Main dishes": `Chow mein de pollo|Chicken chow mein|Fideos salteados con vegetales.|Stir-fried noodles with vegetables.|12.95|0|extra,protC|
Arroz frito especial|Special fried rice|Con cerdo, camarón y huevo.|With pork, shrimp and egg.|12.95|1|extra|hue,mar
Pollo general Tso|General Tso's chicken|Pollo crujiente en salsa agridulce picante.|Crispy chicken in sweet and spicy sauce.|13.95|0|pica|pica
Res con brócoli|Beef with broccoli|Con arroz blanco.|With white rice.|14.95|1||
Camarones con vegetales|Shrimp with vegetables|Salteados al wok.|Wok-sautéed.|15.95|1||mar
Combo almuerzo|Lunch combo|Plato fuerte, arroz, rollito y sopa; hasta las 3 PM.|Main, rice, egg roll and soup; until 3 PM.|9.95|2|protC|`,
    "Entradas / Starters": `Rollitos primavera (2)|Spring rolls (2)|Vegetales crujientes.|Crispy vegetables.|3.95|3||veg
Dumplings al vapor (6)|Steamed dumplings (6)|De cerdo y cebollino.|Pork and chives.|8.95|3|salsa|
Sopa agripicante|Hot and sour soup|Tofu, hongos y huevo.|Tofu, mushrooms and egg.|5.95|3|tam|pica,hue`,
    "Bebidas / Drinks": `Té helado|Iced tea|Natural, sin gas.|Natural, still.|2.95|2|azu|
Té de jazmín caliente|Hot jasmine tea|Tetera para dos.|Pot for two.|3.50|2||`,
  },
};

A.italiana = {
  ph: [8471699, 2097090, 1633668, 5779787],
  sec: {
    "Pizzas / Pizzas": `Pizza margarita|Margherita pizza|Salsa de tomate, mozzarella y albahaca.|Tomato sauce, mozzarella and basil.|13.95|0|tamP2,extra|lac,veg
Pizza de pepperoni|Pepperoni pizza|Con mozzarella.|With mozzarella.|15.95|0|tamP2,extra|lac
Pizza hawaiana|Hawaiian pizza|Jamón y piña.|Ham and pineapple.|15.95|0|tamP2,extra|lac
Pizza de cuatro quesos|Four-cheese pizza|Mozzarella, parmesano, provolone y gorgonzola.|Mozzarella, parmesan, provolone and gorgonzola.|16.95|0|tamP2,extra|lac
Pizza latina|Latin pizza|Chorizo, maduros y queso.|Chorizo, sweet plantain and cheese.|17.95|0|tamP2,extra|lac
Slice de pizza|Pizza slice|Queso o pepperoni, por pedazo.|Cheese or pepperoni, by the slice.|3.50|0||lac`,
    "Pastas y horno / Pastas and oven": `Espagueti a la boloñesa|Spaghetti bolognese|Con salsa de carne.|With meat sauce.|13.95|1||
Lasaña de carne|Beef lasagna|Capas de pasta, carne y quesos.|Layers of pasta, meat and cheeses.|14.95|1||lac,hue
Fettuccine Alfredo|Fettuccine Alfredo|Con pollo opcional.|Optional chicken.|13.95|1|extra|lac
Calzone|Calzone|Relleno de ricota, mozzarella y jamón.|Filled with ricotta, mozzarella and ham.|12.95|0||lac
Alitas al horno (8)|Baked wings (8)|Con salsa a elegir.|With your choice of sauce.|11.95|2|salsaW|`,
    "Extras / Extras": `Palitos de ajo (6)|Garlic knots (6)|Con salsa marinara.|With marinara sauce.|5.95|1||lac,veg
Ensalada César|Caesar salad|Con crutones y parmesano.|With croutons and parmesan.|8.95|3|extra|lac
Tiramisú|Tiramisu|Porción individual.|Single slice.|6.50|3||lac,hue
Soda 2 litros|2-liter soda|Fría.|Chilled.|3.50|3||`,
  },
};
