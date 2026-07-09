#!/usr/bin/env node
// Seed the REAL menu for El Sabor de Quisqueya (hz-sabor-quisqueya):
// 15 categories × 10 items (150 dishes) + reusable modifier groups, bilingual,
// stored EXACTLY like the dashboard Food module writes them (business_items
// kind='menu' + businesses.menu_config) so the owner can edit everything from
// the panel. Idempotent: replaces the business's menu items + config.
//
// Usage: node scripts/seed-menu-sabor.mjs > /tmp/menu.sql   (then sbsql --file)

const BIZ = '371fe078-0efe-4d8e-a94c-bb71f69b86e4';

// ---- Tiles (design-system striped placeholders, from lib/menuConfig MENU_TILES) ----
const T = [
  '#F3E2CE 0 8px,#ECD3B4 8px 16px', // tan
  '#FBEFD3 0 8px,#F5E1B0 8px 16px', // amber
  '#FCE3DC 0 8px,#F6CEC2 8px 16px', // peach
  '#E3F5EA 0 8px,#D6E7D0 8px 16px', // green
  '#EDE0D4 0 8px,#DFCBB6 8px 16px', // coffee
  '#F3D9E2 0 8px,#E8BFCD 8px 16px', // rose
  '#EFEBFF 0 8px,#E5DEF9 8px 16px', // lilac
  '#E4ECFB 0 8px,#D7E3F6 8px 16px', // blue
];

// ---- Reusable modifier groups (DoorDash-style) ----
const MODS = [
  { id: 'acomp', es: 'Elige tu acompañante', en: 'Choose your side', single: true, required: true, options: [
    { es: 'Arroz blanco y habichuelas', en: 'White rice & beans', price: 0 },
    { es: 'Moro de guandules', en: 'Pigeon-pea rice', price: 0 },
    { es: 'Yuca hervida', en: 'Boiled cassava', price: 0 },
    { es: 'Tostones', en: 'Fried green plantains', price: 1 },
    { es: 'Maduros', en: 'Sweet plantains', price: 1 },
    { es: 'Ensalada verde', en: 'Green salad', price: 1.5 },
  ]},
  { id: 'termino', es: 'Término de la carne', en: 'Meat doneness', single: true, required: false, options: [
    { es: 'Bien cocida', en: 'Well done', price: 0 },
    { es: 'Término medio', en: 'Medium', price: 0 },
    { es: 'Poco cocida', en: 'Rare', price: 0 },
  ]},
  { id: 'extras', es: 'Extras', en: 'Add-ons', single: false, required: false, options: [
    { es: 'Aguacate', en: 'Avocado', price: 2 },
    { es: 'Queso frito', en: 'Fried cheese', price: 2.5 },
    { es: 'Huevo frito', en: 'Fried egg', price: 1.5 },
    { es: 'Salami extra', en: 'Extra salami', price: 2.5 },
    { es: 'Cebollitas salteadas', en: 'Sautéed onions', price: 1 },
    { es: 'Salsa criolla', en: 'Creole sauce', price: 0.75 },
  ]},
  { id: 'picante', es: 'Nivel de picante', en: 'Spice level', single: true, required: false, options: [
    { es: 'Sin picante', en: 'No spice', price: 0 },
    { es: 'Suave', en: 'Mild', price: 0 },
    { es: 'Medio', en: 'Medium', price: 0 },
    { es: 'Fuerte', en: 'Hot', price: 0 },
  ]},
  { id: 'tamano-sopa', es: 'Tamaño', en: 'Size', single: true, required: true, options: [
    { es: 'Pequeño (16 oz)', en: 'Small (16 oz)', price: 0 },
    { es: 'Mediano (24 oz)', en: 'Medium (24 oz)', price: 3 },
    { es: 'Grande (32 oz)', en: 'Large (32 oz)', price: 5 },
  ]},
  { id: 'tamano-jugo', es: 'Tamaño', en: 'Size', single: true, required: true, options: [
    { es: '16 oz', price: 0 },
    { es: '22 oz', price: 1.5 },
    { es: 'Medio galón', en: 'Half gallon', price: 5 },
  ]},
  { id: 'base-batida', es: 'Base', en: 'Base', single: true, required: false, options: [
    { es: 'Con leche', en: 'With milk', price: 0 },
    { es: 'Con agua', en: 'With water', price: 0 },
    { es: 'Leche de avena', en: 'Oat milk', price: 0.75 },
  ]},
  { id: 'pan', es: 'Tipo de pan', en: 'Bread', single: true, required: false, options: [
    { es: 'Pan de agua', en: 'Water bread roll', price: 0 },
    { es: 'Pan tostado', en: 'Toasted', price: 0 },
    { es: 'Casabe', en: 'Cassava flatbread', price: 1 },
  ]},
  { id: 'salsas', es: 'Salsas', en: 'Sauces', single: false, required: false, options: [
    { es: 'Mayo-ketchup', price: 0.5 },
    { es: 'Wasakaka', price: 0.75 },
    { es: 'Salsa de ajo', en: 'Garlic sauce', price: 0.5 },
    { es: 'Picante casero', en: 'House hot sauce', price: 0.5 },
  ]},
];

// ---- 15 categories ----
const CATS = [
  { id: 'desayunos', es: 'Desayunos', en: 'Breakfast', icon: 'croissant', tile: T[0], schedEs: 'Hasta 11 AM', schedEn: 'Until 11 AM' },
  { id: 'platos', es: 'Platos criollos', en: 'Creole plates', icon: 'utensils', tile: T[1] },
  { id: 'pollo', es: 'Pollo', en: 'Chicken', icon: 'utensils', tile: T[2] },
  { id: 'res-cerdo', es: 'Res y cerdo', en: 'Beef & pork', icon: 'beef', tile: T[4] },
  { id: 'mariscos', es: 'Mariscos', en: 'Seafood', icon: 'fish', tile: T[7] },
  { id: 'sopas', es: 'Sopas y asopaos', en: 'Soups & stews', icon: 'soup', tile: T[1] },
  { id: 'arroces', es: 'Arroces y moros', en: 'Rice dishes', icon: 'utensils', tile: T[0] },
  { id: 'frituras', es: 'Frituras y picaderas', en: 'Fried bites', icon: 'utensils', tile: T[2] },
  { id: 'chimis', es: 'Chimis y yaroas', en: 'Chimis & yaroas', icon: 'sandwich', tile: T[5] },
  { id: 'acompanantes', es: 'Acompañantes', en: 'Sides', icon: 'salad', tile: T[3] },
  { id: 'ensaladas', es: 'Ensaladas', en: 'Salads', icon: 'salad', tile: T[3] },
  { id: 'infantil', es: 'Menú infantil', en: 'Kids menu', icon: 'icecream', tile: T[1] },
  { id: 'postres', es: 'Postres', en: 'Desserts', icon: 'cake', tile: T[5] },
  { id: 'jugos', es: 'Jugos y batidas', en: 'Juices & shakes', icon: 'cupsoda', tile: T[6] },
  { id: 'bebidas', es: 'Bebidas y café', en: 'Drinks & coffee', icon: 'coffee', tile: T[4] },
];

// ---- 150 items: [nameEs, descEs, descEn, price, opts] ----
// opts: { m: modIds[], pop, nu (isNew), diet: ['V','VG','GF'], al: allergens7, cmp: compareAt }
const A = (...xs) => { const a = [0,0,0,0,0,0,0]; for (const i of xs) a[i] = 2; return a; };
const ITEMS = {
  desayunos: [
    ['Mangú con los tres golpes', 'Puré de plátano verde con queso frito, salami y huevo, coronado con cebollitas rojas.', 'Green plantain mash with fried cheese, salami and egg, topped with red onions.', 11.99, { m: ['extras'], pop: 1, al: A(1, 2) }],
    ['Mangú con queso frito', 'Mangú cremoso con queso de freír dorado y cebollitas encurtidas.', 'Creamy plantain mash with golden fried cheese and pickled onions.', 8.99, { m: ['extras'], al: A(1) }],
    ['Mangú con salami', 'Mangú con salami dominicano frito en rodajas gruesas.', 'Plantain mash with thick-cut fried Dominican salami.', 8.99, { m: ['extras'] }],
    ['Revoltillo dominicano', 'Huevos revueltos con tomate, cebolla y ají cubanela; pan de agua incluido.', 'Scrambled eggs with tomato, onion and cubanela pepper; water bread included.', 7.99, { m: ['extras'], al: A(0, 2) }],
    ['Huevos fritos con tostones', 'Dos huevos fritos con tostones majados y sal de ajo.', 'Two fried eggs with smashed tostones and garlic salt.', 7.49, { m: ['salsas'], al: A(2) }],
    ['Salchichón frito con yuca', 'Salchichón dorado con yuca hervida y cebollas salteadas.', 'Crispy fried sausage with boiled cassava and sautéed onions.', 8.49, {}],
    ['Avena caliente', 'Avena cremosa con canela, clavo dulce y un toque de vainilla.', 'Warm oatmeal with cinnamon, sweet clove and a touch of vanilla.', 4.99, { diet: ['V'], al: A(0, 1) }],
    ['Pan con huevo y queso', 'Pan de agua tostado con huevo revuelto y queso danés derretido.', 'Toasted water bread with scrambled egg and melted Danish cheese.', 6.49, { m: ['pan'], al: A(0, 1, 2) }],
    ['Batata frita con queso', 'Batata dominicana frita con queso frito y miel de caña.', 'Fried Dominican sweet potato with fried cheese and cane syrup.', 7.99, { nu: 1, diet: ['V'], al: A(1) }],
    ['Desayuno del Cibao', 'Mangú, longaniza frita, aguacate y queso frito — pa’ empezar fuerte.', 'Plantain mash, fried longaniza, avocado and fried cheese — the full start.', 13.99, { pop: 1, al: A(1) }],
  ],
  platos: [
    ['La Bandera Dominicana', 'Arroz blanco, habichuelas rojas guisadas y pollo guisado — el plato nacional.', 'White rice, stewed red beans and braised chicken — the national dish.', 13.99, { m: ['acomp', 'picante'], pop: 1 }],
    ['Bistec encebollado', 'Bistec de res salteado con cebollas, ají y un toque de naranja agria.', 'Beef steak sautéed with onions, peppers and a touch of sour orange.', 16.99, { m: ['acomp', 'termino'], pop: 1 }],
    ['Res guisada', 'Carne de res guisada a fuego lento en salsa criolla con papas.', 'Slow-braised beef in creole sauce with potatoes.', 15.99, { m: ['acomp', 'picante'] }],
    ['Chivo guisado picante', 'Chivo tierno guisado al estilo Línea Noroeste con orégano y ají picante.', 'Tender goat stew, Northwest-style, with oregano and hot pepper.', 18.99, { m: ['acomp', 'picante'] }],
    ['Rabo encendido', 'Rabo de res guisado hasta despegarse del hueso, en salsa roja con fuego.', 'Oxtail braised till it falls off the bone, in a fiery red sauce.', 19.99, { m: ['acomp', 'picante'] }],
    ['Pechuga a la plancha', 'Pechuga jugosa a la plancha con ajo, limón y ensalada verde.', 'Juicy grilled chicken breast with garlic, lime and green salad.', 14.49, { m: ['acomp'], diet: ['GF'] }],
    ['Cerdo guisado', 'Trozos de cerdo guisados con auyama, cilantro ancho y ají gustoso.', 'Pork chunks stewed with squash, culantro and sweet peppers.', 15.49, { m: ['acomp', 'picante'] }],
    ['Pernil asado', 'Pierna de cerdo asada lenta, piel crocante y wasakaka de ajo.', 'Slow-roasted pork leg, crispy skin, garlic wasakaka.', 16.99, { m: ['acomp'], pop: 1 }],
    ['Costillas criollas BBQ', 'Costillas glaseadas con BBQ de guayaba, ahumadas en casa.', 'Ribs glazed with guava BBQ, smoked in-house.', 17.99, { m: ['acomp'], nu: 1 }],
    ['Berenjena guisada con arroz', 'Berenjena criolla guisada con tomate y ajíes, servida con arroz blanco.', 'Creole stewed eggplant with tomato and peppers over white rice.', 11.99, { m: ['acomp'], diet: ['V', 'VG'] }],
  ],
  pollo: [
    ['Pica pollo (2 piezas)', 'Pollo frito crocante marinado con limón y orégano; con tostones.', 'Crispy Dominican fried chicken marinated in lime and oregano; with tostones.', 9.99, { m: ['salsas'], pop: 1, al: A(0) }],
    ['Pica pollo (4 piezas)', 'Cuatro piezas de nuestro pica pollo dorado con tostones y ensalada.', 'Four pieces of our golden fried chicken with tostones and salad.', 15.99, { m: ['salsas'], pop: 1, al: A(0) }],
    ['Pollo guisado', 'Pollo criollo guisado en salsa de tomate con papa y zanahoria.', 'Creole chicken stewed in tomato sauce with potato and carrot.', 12.99, { m: ['acomp', 'picante'] }],
    ['Pollo al horno', 'Muslos horneados con sazón dominicano y mojo de ajo.', 'Baked chicken thighs with Dominican seasoning and garlic mojo.', 13.49, { m: ['acomp'], diet: ['GF'] }],
    ['Chicharrón de pollo', 'Trocitos de pollo fritos bien crocantes con limón agrio.', 'Extra-crispy fried chicken chunks with sour lime.', 12.99, { m: ['salsas', 'picante'], pop: 1, al: A(0) }],
    ['Alitas criollas (8)', 'Alitas fritas bañadas en salsa de guayaba picante o BBQ criolla.', 'Fried wings tossed in spicy guava or creole BBQ sauce.', 11.99, { m: ['salsas', 'picante'] }],
    ['Pollo frito entero', 'Pollo entero frito al estilo banca — para compartir.', 'Whole fried chicken, corner-shop style — for sharing.', 24.99, { m: ['salsas'], al: A(0) }],
    ['Pechuga rellena', 'Pechuga rellena de queso y jamón, empanizada y dorada.', 'Chicken breast stuffed with cheese and ham, breaded and fried.', 15.99, { al: A(0, 1) }],
    ['Pollo agridulce criollo', 'Pollo salteado en salsa agridulce de piña con ajíes.', 'Chicken sautéed in pineapple sweet-and-sour sauce with peppers.', 13.99, { nu: 1 }],
    ['Higaditos encebollados', 'Higaditos de pollo salteados con cebolla y vino tinto.', 'Chicken livers sautéed with onions and red wine.', 10.99, {}],
  ],
  'res-cerdo': [
    ['Carne frita dominicana', 'Trozos de res fritos con cebolla morada y tostones.', 'Dominican fried beef chunks with red onion and tostones.', 14.99, { m: ['acomp', 'salsas'], pop: 1 }],
    ['Chicharrón de cerdo', 'Chicharrón crocante estilo Villa Mella con yuca y encurtido.', 'Crispy Villa Mella-style pork rinds with cassava and pickled onions.', 13.99, { m: ['salsas'], pop: 1 }],
    ['Chuleta frita', 'Chuleta ahumada frita con cebollas y maduros.', 'Fried smoked pork chop with onions and sweet plantains.', 13.49, { m: ['acomp'] }],
    ['Chuleta a la plancha', 'Chuleta jugosa a la plancha con mojo criollo.', 'Grilled pork chop with creole mojo.', 13.49, { m: ['acomp'], diet: ['GF'] }],
    ['Longaniza frita', 'Longaniza dominicana curada en naranja agria, frita al momento.', 'Dominican sausage cured in sour orange, fried to order.', 11.99, { m: ['acomp'] }],
    ['Bistec a caballo', 'Bistec encebollado coronado con huevo frito.', 'Onion-smothered steak topped with a fried egg.', 17.99, { m: ['acomp', 'termino'], al: A(2) }],
    ['Carne ripiada', 'Falda de res desmenuzada y guisada con ajíes y tomate.', 'Shredded flank steak stewed with peppers and tomato.', 14.99, { m: ['acomp', 'picante'] }],
    ['Cerdo frito con maduros', 'Masitas de cerdo fritas con maduros caramelizados.', 'Fried pork bites with caramelized sweet plantains.', 13.99, { m: ['salsas'] }],
    ['Filete de res al ajillo', 'Filete salteado en mantequilla de ajo con papas criollas.', 'Steak sautéed in garlic butter with creole potatoes.', 18.99, { m: ['termino'], nu: 1, al: A(1) }],
    ['Puerco en puya (fin de semana)', 'Cerdo a la puya asado lento — solo sábados y domingos.', 'Spit-roasted pork, slow-cooked — weekends only.', 16.99, {}],
  ],
  mariscos: [
    ['Filete de pescado frito', 'Filete de mero frito entero con tostones y ensalada.', 'Whole fried grouper fillet with tostones and salad.', 17.99, { m: ['salsas'], pop: 1, al: A(5) }],
    ['Pescado con coco', 'Pescado guisado en leche de coco al estilo Samaná.', 'Fish stewed in coconut milk, Samaná-style.', 18.99, { m: ['acomp'], pop: 1, al: A(5) }],
    ['Camarones al ajillo', 'Camarones salteados en mantequilla de ajo y brandy.', 'Shrimp sautéed in garlic butter and brandy.', 17.99, { m: ['acomp'], al: A(1, 5) }],
    ['Camarones fritos', 'Camarones empanizados crocantes con mayo-ketchup.', 'Crispy breaded shrimp with mayo-ketchup.', 16.99, { al: A(0, 5) }],
    ['Mofongo de camarones', 'Mofongo de plátano con camarones al ajillo por encima.', 'Plantain mofongo topped with garlic shrimp.', 19.99, { pop: 1, al: A(5) }],
    ['Cangrejo guisado', 'Cangrejo criollo guisado con coco y ají gustoso.', 'Creole crab stewed with coconut and sweet peppers.', 18.99, { m: ['picante'], al: A(5) }],
    ['Pulpo a la vinagreta', 'Pulpo tierno en vinagreta de limón, cebolla morada y cilantro.', 'Tender octopus in lime vinaigrette with red onion and cilantro.', 19.99, { diet: ['GF'], al: A(5) }],
    ['Lambí guisado', 'Lambí (caracol) guisado suave en salsa criolla.', 'Conch stewed tender in creole sauce.', 21.99, { m: ['picante'], al: A(5) }],
    ['Ceviche dominicano', 'Pescado blanco curado en limón con ají, cebolla y batata frita.', 'White fish cured in lime with peppers, onion and sweet-potato chips.', 15.99, { nu: 1, diet: ['GF'], al: A(5) }],
    ['Pescado a la plancha', 'Filete a la plancha con mojo de ajo y vegetales salteados.', 'Grilled fillet with garlic mojo and sautéed vegetables.', 16.99, { m: ['acomp'], diet: ['GF'], al: A(5) }],
  ],
  sopas: [
    ['Sancocho de 7 carnes', 'El rey de los sancochos: siete carnes, víveres y aguacate.', 'The king of stews: seven meats, root vegetables and avocado.', 16.99, { m: ['tamano-sopa'], pop: 1 }],
    ['Sancocho de pollo', 'Sancocho espeso de pollo con auyama, yuca y plátano.', 'Hearty chicken sancocho with squash, cassava and plantain.', 13.99, { m: ['tamano-sopa'], pop: 1 }],
    ['Mondongo', 'Mondongo criollo bien sazonado con víveres y limón.', 'Well-seasoned creole tripe stew with root vegetables and lime.', 13.99, { m: ['tamano-sopa'] }],
    ['Asopao de pollo', 'Arroz caldoso con pollo, alcaparras y petit pois.', 'Brothy rice with chicken, capers and peas.', 12.99, { m: ['tamano-sopa'] }],
    ['Asopao de camarones', 'Asopao marinero cargado de camarones y ají cubanela.', 'Seafood-style brothy rice loaded with shrimp.', 16.99, { m: ['tamano-sopa'], al: A(5) }],
    ['Sopa de pescado', 'Caldo de pescado con yuca, plátano y un toque de coco.', 'Fish broth with cassava, plantain and a touch of coconut.', 13.99, { m: ['tamano-sopa'], al: A(5) }],
    ['Crema de auyama', 'Crema suave de auyama con crotones de casabe.', 'Silky squash cream with cassava croutons.', 8.99, { m: ['tamano-sopa'], diet: ['V'] }],
    ['Sopa de mariscos', 'Mezcla de camarón, pulpo y pescado en caldo criollo.', 'Shrimp, octopus and fish in a creole broth.', 17.99, { m: ['tamano-sopa'], al: A(5) }],
    ['Caldo de pollo casero', 'Caldito claro de pollo con fideos y verduras.', 'Homestyle chicken broth with noodles and vegetables.', 9.99, { m: ['tamano-sopa'], al: A(0) }],
    ['Sopa de res', 'Sopa de res con víveres del país y maíz.', 'Beef soup with island root vegetables and corn.', 12.99, { m: ['tamano-sopa'] }],
  ],
  arroces: [
    ['Moro de guandules con coco', 'Arroz con guandules cocido en leche de coco — sabor del Este.', 'Pigeon-pea rice cooked in coconut milk — Eastern-style flavor.', 6.99, { diet: ['V', 'VG'], pop: 1 }],
    ['Locrio de pollo', 'Arroz sazonado cocido junto al pollo — la paella dominicana.', 'Seasoned rice cooked with chicken — the Dominican paella.', 12.99, { m: ['picante'], pop: 1 }],
    ['Locrio de salami', 'Locrio dorado de salami dominicano con ajíes.', 'Golden rice cooked with Dominican salami and peppers.', 11.99, {}],
    ['Locrio de longaniza', 'Locrio de longaniza curada con naranja agria.', 'Rice cooked with sour-orange-cured sausage.', 12.99, {}],
    ['Arroz con camarones', 'Arroz marinero salteado con camarones y vegetales.', 'Seafood rice sautéed with shrimp and vegetables.', 15.99, { al: A(5) }],
    ['Moro de habichuelas negras', 'Moro oscuro de habichuelas negras con orégano.', 'Black-bean rice with oregano.', 6.49, { diet: ['V', 'VG'] }],
    ['Moro de habichuelas rojas', 'Moro clásico de habichuelas rojas.', 'Classic red-bean rice.', 6.49, { diet: ['V', 'VG'] }],
    ['Chofán criollo', 'Arroz frito dominicano-chino con cerdo, pollo y huevo.', 'Dominican-Chinese fried rice with pork, chicken and egg.', 13.99, { nu: 1, al: A(2, 4) }],
    ['Arroz con fideos', 'Arroz con fideos tostados en mantequilla.', 'Rice with butter-toasted noodles.', 5.99, { diet: ['V'], al: A(0, 1) }],
    ['Arroz blanco con habichuelas', 'La base de todo: arroz graneado y habichuelas guisadas.', 'The foundation: fluffy rice and stewed beans.', 5.99, { diet: ['V', 'VG'] }],
  ],
  frituras: [
    ['Tostones rellenos de camarón', 'Cestitas de tostón rellenas de camarones al ajillo.', 'Tostone cups filled with garlic shrimp.', 12.99, { pop: 1, al: A(5) }],
    ['Kipes (3)', 'Kipes crocantes de trigo rellenos de carne de res.', 'Crispy bulgur croquettes stuffed with ground beef.', 6.99, { m: ['salsas'], pop: 1, al: A(0) }],
    ['Pastelitos de pollo (3)', 'Empanaditas fritas de pollo desmenuzado.', 'Fried turnovers filled with shredded chicken.', 6.99, { m: ['salsas'], al: A(0) }],
    ['Pastelitos de queso (3)', 'Pastelitos rellenos de queso derretido.', 'Fried turnovers with melted cheese.', 6.49, { m: ['salsas'], diet: ['V'], al: A(0, 1) }],
    ['Empanada de res', 'Empanada grande de masa de maíz rellena de res ripiada.', 'Large corn-dough empanada stuffed with shredded beef.', 4.99, { m: ['salsas'] }],
    ['Croquetas de pollo (5)', 'Croquetas cremosas de pollo empanizadas.', 'Creamy breaded chicken croquettes.', 7.49, { al: A(0, 1, 2) }],
    ['Arepitas de yuca (6)', 'Arepitas dulces-saladas de yuca con anís.', 'Sweet-savory cassava fritters with anise.', 5.99, { diet: ['V'], al: A(2) }],
    ['Bollitos de yuca rellenos (4)', 'Bolitas de yuca rellenas de queso, fritas doraditas.', 'Cassava balls stuffed with cheese, fried golden.', 6.99, { diet: ['V'], al: A(1) }],
    ['Chicharrón mixto', 'Tabla de chicharrón de cerdo y pollo con yuca y encurtido.', 'Board of pork and chicken chicharrón with cassava and pickled onion.', 16.99, { m: ['salsas'] }],
    ['Picadera El Sabor (para 2)', 'Kipes, pastelitos, salami, queso frito, tostones y salsas.', 'Kipes, turnovers, salami, fried cheese, tostones and sauces.', 18.99, { pop: 1, al: A(0, 1) }],
  ],
  chimis: [
    ['Chimi de res', 'El clásico callejero: carne de res sazonada, repollo, tomate y salsa rosada en pan de agua.', 'The street classic: seasoned beef, cabbage, tomato and pink sauce on water bread.', 8.99, { m: ['extras', 'salsas'], pop: 1, al: A(0, 2) }],
    ['Chimi de pollo', 'Chimi de pollo a la plancha con repollo crujiente.', 'Grilled chicken chimi with crunchy cabbage.', 8.49, { m: ['extras', 'salsas'], al: A(0) }],
    ['Chimi de cerdo', 'Chimi de cerdo marinado en naranja agria.', 'Sour-orange marinated pork chimi.', 8.99, { m: ['extras', 'salsas'], al: A(0) }],
    ['Yaroa de res', 'Capas de papitas fritas, res, queso derretido y salsas.', 'Layers of fries, beef, melted cheese and sauces.', 11.99, { m: ['salsas'], pop: 1, al: A(1) }],
    ['Yaroa de pollo', 'Yaroa de pollo desmenuzado sobre papitas con queso gratinado.', 'Shredded-chicken yaroa over fries with broiled cheese.', 11.49, { m: ['salsas'], al: A(1) }],
    ['Yaroa mixta', 'Res + pollo + queso — la yaroa completa de madrugada.', 'Beef + chicken + cheese — the full late-night yaroa.', 12.99, { m: ['salsas'], pop: 1, al: A(1) }],
    ['Yaroa de maduros', 'Base de maduros dulces con carne y queso — agridulce perfecto.', 'Sweet-plantain base with meat and cheese — perfect sweet-savory.', 12.49, { nu: 1, al: A(1) }],
    ['Burger criolla', 'Carne de res, queso frito, maduro y salsa rosada en pan brioche.', 'Beef patty, fried cheese, sweet plantain and pink sauce on brioche.', 12.99, { m: ['extras', 'termino'], al: A(0, 1, 2) }],
    ['Burger doble El Sabor', 'Doble carne, doble queso, tocineta y cebollas al caldero.', 'Double patty, double cheese, bacon and pot-seared onions.', 15.99, { m: ['termino'], al: A(0, 1, 2) }],
    ['Sándwich de pernil', 'Pernil desmenuzado con encurtido en pan de agua tostado.', 'Shredded roast pork with pickled onions on toasted water bread.', 10.99, { m: ['pan', 'salsas'], al: A(0) }],
  ],
  acompanantes: [
    ['Tostones (orden)', 'Plátano verde majado y frito dos veces, con sal de ajo.', 'Twice-fried smashed green plantains with garlic salt.', 4.99, { m: ['salsas'], diet: ['V', 'VG'], pop: 1 }],
    ['Maduros (orden)', 'Plátanos maduros fritos, caramelizados por fuera.', 'Fried sweet plantains, caramelized edges.', 4.49, { diet: ['V', 'VG'] }],
    ['Yuca hervida con cebolla', 'Yuca tierna con mojo de cebolla morada.', 'Tender cassava with red-onion mojo.', 4.99, { diet: ['V', 'VG'] }],
    ['Batata frita', 'Bastones de batata dominicana fritos.', 'Dominican sweet-potato fries.', 4.99, { diet: ['V', 'VG'] }],
    ['Ensalada rusa', 'Papa, zanahoria, huevo y mayonesa — la de las fiestas.', 'Potato, carrot, egg and mayo — the party classic.', 5.49, { diet: ['V'], al: A(2) }],
    ['Aguacate (mitad)', 'Medio aguacate dominicano con sal y aceite de oliva.', 'Half a Dominican avocado with salt and olive oil.', 3.99, { diet: ['V', 'VG', 'GF'] }],
    ['Habichuelas guisadas (orden)', 'Habichuelas rojas guisadas con auyama y cilantro.', 'Red beans stewed with squash and cilantro.', 4.49, { diet: ['V', 'VG'] }],
    ['Arroz blanco (orden)', 'Arroz blanco graneado con su concón si llegas temprano.', 'Fluffy white rice — with crispy concón if you come early.', 3.99, { diet: ['V', 'VG'] }],
    ['Casabe con ajo', 'Casabe tostado con mantequilla de ajo.', 'Toasted cassava flatbread with garlic butter.', 4.49, { diet: ['V'], al: A(1) }],
    ['Queso frito (orden)', 'Queso de freír dorado en cuadritos.', 'Golden fried cheese cubes.', 5.99, { diet: ['V'], al: A(1) }],
  ],
  ensaladas: [
    ['Ensalada verde', 'Lechuga, tomate, pepino y cebolla con vinagreta de la casa.', 'Lettuce, tomato, cucumber and onion with house vinaigrette.', 6.99, { diet: ['V', 'VG', 'GF'] }],
    ['Ensalada mixta', 'Verde + zanahoria rallada, maíz y remolacha.', 'Green salad plus shredded carrot, corn and beets.', 7.99, { diet: ['V', 'VG', 'GF'] }],
    ['Ensalada César con pollo', 'César con pollo a la plancha y crotones de casabe.', 'Caesar with grilled chicken and cassava croutons.', 11.99, { al: A(1, 2, 5) }],
    ['Ensalada de coditos', 'Coditos con jamón, maíz y mayonesa criolla.', 'Macaroni salad with ham, corn and creole mayo.', 6.99, { al: A(0, 2) }],
    ['Ensalada tropical de aguacate', 'Aguacate, mango, cebolla morada y cilantro.', 'Avocado, mango, red onion and cilantro.', 9.99, { nu: 1, diet: ['V', 'VG', 'GF'] }],
    ['Ensalada de tomate y cebolla', 'Tomate barceló en rodajas con cebolla y orégano.', 'Sliced ripe tomato with onion and oregano.', 5.99, { diet: ['V', 'VG', 'GF'] }],
    ['Ensalada de repollo', 'Repollo encurtido con zanahoria y vinagre suave.', 'Pickled cabbage slaw with carrot and mild vinegar.', 4.99, { diet: ['V', 'VG', 'GF'] }],
    ['Ensalada de papa', 'Papa hervida con huevo, cebollín y mostaza.', 'Boiled potato with egg, scallion and mustard.', 5.99, { diet: ['V'], al: A(2) }],
    ['Ensalada de frutas', 'Frutas tropicales de temporada con miel y limón.', 'Seasonal tropical fruit with honey and lime.', 7.49, { diet: ['V', 'GF'] }],
    ['Bowl El Sabor', 'Arroz, habichuelas, aguacate, maduros y proteína a elegir.', 'Rice, beans, avocado, sweet plantains and your choice of protein.', 12.99, { m: ['picante'], nu: 1 }],
  ],
  infantil: [
    ['Nuggets con papitas', 'Nuggets de pollo con papas fritas y mayo-ketchup.', 'Chicken nuggets with fries and mayo-ketchup.', 7.99, { al: A(0) }],
    ['Mini burger con queso', 'Hamburguesita con queso y papitas.', 'Little cheeseburger with fries.', 8.49, { al: A(0, 1) }],
    ['Arroz con pollito desmenuzado', 'Arroz blanco con pollo guisado desmenuzado suave.', 'White rice with soft shredded stewed chicken.', 7.99, {}],
    ['Espagueti con salchicha', 'Espagueti rojo criollo con salchichas en rueditas.', 'Creole red spaghetti with sliced sausages.', 7.99, { al: A(0) }],
    ['Mini chimi', 'Chimi pequeño de res con poquita salsa.', 'Small beef chimi, easy on the sauce.', 6.99, { al: A(0) }],
    ['Pica pollo infantil (1 pieza)', 'Una pieza de pollo frito con tostones o papitas.', 'One piece of fried chicken with tostones or fries.', 6.49, { al: A(0) }],
    ['Tostones con queso frito', 'Tostones con cuadritos de queso frito.', 'Tostones with fried cheese cubes.', 6.99, { diet: ['V'], al: A(1) }],
    ['Mini yaroa', 'Yaroa chiquita de pollo con queso.', 'Small chicken yaroa with cheese.', 7.99, { al: A(1) }],
    ['Jugo + galleta', 'Jugo natural chiquito con galleta de leche.', 'Small fresh juice with a milk biscuit.', 4.49, { al: A(0, 1) }],
    ['Helado de vainilla', 'Copita de helado de vainilla con lluvia de chocolate.', 'Vanilla ice-cream cup with chocolate sprinkles.', 3.99, { diet: ['V'], al: A(1) }],
  ],
  postres: [
    ['Habichuelas con dulce', 'El postre de Semana Santa todo el año: cremoso, con batata y galletitas.', 'The Holy Week dessert, all year: creamy sweet beans with sweet potato and biscuits.', 5.99, { pop: 1, diet: ['V'], al: A(0, 1) }],
    ['Flan de leche', 'Flan casero de leche condensada con caramelo.', 'Homemade condensed-milk flan with caramel.', 5.49, { diet: ['V'], al: A(1, 2) }],
    ['Tres leches', 'Bizcocho empapado en tres leches con merengue.', 'Sponge cake soaked in three milks with meringue.', 6.49, { pop: 1, diet: ['V'], al: A(0, 1, 2) }],
    ['Majarete', 'Pudín suave de maíz con canela.', 'Silky corn pudding with cinnamon.', 4.99, { diet: ['V'], al: A(1) }],
    ['Dulce de coco tierno', 'Coco tierno en almíbar de caña con canela.', 'Young coconut in cane syrup with cinnamon.', 4.99, { diet: ['V', 'VG'] }],
    ['Dulce de leche cortada', 'Dulce criollo de leche cortada con pasas.', 'Creole curdled-milk sweet with raisins.', 4.99, { diet: ['V'], al: A(1) }],
    ['Arroz con leche', 'Arroz con leche cremoso con clavo y canela.', 'Creamy rice pudding with clove and cinnamon.', 4.99, { diet: ['V'], al: A(1) }],
    ['Bizcocho dominicano (porción)', 'Porción del clásico bizcocho con suspiro.', 'Slice of the classic Dominican cake with meringue.', 5.99, { diet: ['V'], al: A(0, 1, 2) }],
    ['Jalao de coco y jengibre', 'Bolitas de coco con miel de caña y jengibre.', 'Coconut-honey balls with ginger.', 3.99, { diet: ['V', 'VG'] }],
    ['Helado frito', 'Bola de helado empanizada y frita con miel.', 'Breaded fried ice-cream ball with honey.', 6.99, { nu: 1, diet: ['V'], al: A(0, 1, 2) }],
  ],
  jugos: [
    ['Morir soñando', 'Naranja, leche evaporada, azúcar y mucho hielo — el clásico.', 'Orange, evaporated milk, sugar and lots of ice — the classic.', 5.99, { m: ['tamano-jugo'], pop: 1, diet: ['V'], al: A(1) }],
    ['Jugo de chinola', 'Jugo natural de maracuyá dominicana.', 'Fresh Dominican passion-fruit juice.', 4.99, { m: ['tamano-jugo'], pop: 1, diet: ['V', 'VG'] }],
    ['Jugo de limón', 'Limonada criolla con azúcar de caña.', 'Creole limeade with cane sugar.', 4.49, { m: ['tamano-jugo'], diet: ['V', 'VG'] }],
    ['Jugo de tamarindo', 'Tamarindo natural, agridulce y frío.', 'Fresh tamarind juice, tangy and cold.', 4.99, { m: ['tamano-jugo'], diet: ['V', 'VG'] }],
    ['Jugo de piña', 'Piña natural licuada al momento.', 'Fresh pineapple, blended to order.', 4.99, { m: ['tamano-jugo'], diet: ['V', 'VG'] }],
    ['Batida de lechosa', 'Batida cremosa de papaya con leche y canela.', 'Creamy papaya shake with milk and cinnamon.', 5.99, { m: ['tamano-jugo', 'base-batida'], diet: ['V'], al: A(1) }],
    ['Batida de zapote', 'Batida espesa de zapote — pura crema tropical.', 'Thick sapote shake — pure tropical cream.', 6.49, { m: ['tamano-jugo', 'base-batida'], diet: ['V'], al: A(1) }],
    ['Batida de guineo', 'Batida de guineo maduro con avena.', 'Ripe banana shake with oats.', 5.99, { m: ['tamano-jugo', 'base-batida'], diet: ['V'], al: A(0, 1) }],
    ['Batida de mango', 'Mango criollo batido con hielo.', 'Creole mango blended with ice.', 5.99, { m: ['tamano-jugo', 'base-batida'], diet: ['V', 'VG'] }],
    ['Jugo de cereza', 'Cereza dominicana (acerola) — vitamina C pura.', 'Dominican acerola cherry — pure vitamin C.', 5.49, { m: ['tamano-jugo'], nu: 1, diet: ['V', 'VG'] }],
  ],
  bebidas: [
    ['Café dominicano (colao)', 'Café de greca, fuerte y dulce como debe ser.', 'Stovetop Dominican coffee, strong and sweet as it should be.', 2.49, { pop: 1, diet: ['V', 'VG'] }],
    ['Café con leche', 'Café colao con leche caliente espumada.', 'Dominican coffee with steamed milk.', 3.49, { diet: ['V'], al: A(1) }],
    ['Chocolate caliente criollo', 'Chocolate de tablilla con canela y jengibre.', 'Dominican bar chocolate with cinnamon and ginger.', 3.99, { diet: ['V'], al: A(1) }],
    ['Té de jengibre', 'Té caliente de jengibre con miel y limón.', 'Hot ginger tea with honey and lime.', 3.49, { diet: ['V', 'GF'] }],
    ['Malta Morena', 'Malta bien fría — pídela con leche condensada.', 'Ice-cold malt soda — ask for it with condensed milk.', 2.99, { diet: ['V'] }],
    ['Refresco rojo', 'El refresco rojo de la nostalgia, bien frío.', 'The nostalgic red soda, ice cold.', 2.49, { diet: ['V', 'VG'] }],
    ['Refresco (lata)', 'Coca-Cola, Sprite o Country Club.', 'Coke, Sprite or Country Club.', 1.99, { diet: ['V', 'VG'] }],
    ['Agua embotellada', 'Agua purificada 16.9 oz.', 'Bottled water 16.9 oz.', 1.49, { diet: ['V', 'VG', 'GF'] }],
    ['Cerveza Presidente (fría-fría)', 'La verde bien fría, como en la esquina. Solo mayores de 21.', 'Ice-cold Presidente, corner-store style. 21+ only.', 5.99, {}],
    ['Mamajuana (trago)', 'Trago de mamajuana curada de la casa. Solo mayores de 21.', 'Shot of house-cured mamajuana. 21+ only.', 6.99, {}],
  ],
};

// ---- build rows + config ----
const cats = CATS.map((c) => ({ ...c, visible: true }));
const config = {
  categories: cats,
  mods: MODS,
  dayparts: [],
  promos: [],
  tags: [],
  automation: { auto86: true, notifyLow: true, resetDaily: true, backorders: false },
  ordering: true,
};

const rows = [];
let sort = 0;
for (const c of CATS) {
  const list = ITEMS[c.id];
  if (!list || list.length !== 10) throw new Error(`cat ${c.id}: ${list ? list.length : 0} items`);
  for (const [name, es, en, price, o = {}] of list) {
    rows.push({
      name, description: es, price, section: c.id, sort: sort++,
      attrs: {
        en, diet: o.diet ?? [], allergens: o.al ?? [0, 0, 0, 0, 0, 0, 0], mods: o.m ?? [],
        stock: 'in', popular: !!o.pop, isNew: !!o.nu, loves: 0,
        ...(o.cmp != null ? { compareAt: o.cmp } : {}),
      },
    });
  }
}

const sql = `
begin;
update public.businesses set menu_config = $cfg$${JSON.stringify(config)}$cfg$::jsonb where id = '${BIZ}';
delete from public.business_items where business_id = '${BIZ}' and kind = 'menu';
insert into public.business_items (business_id, kind, name, description, price, unit, section, available, sort, image_url, attrs)
select '${BIZ}', 'menu', r.name, r.description, r.price, null, r.section, true, r.sort, null, r.attrs
from jsonb_to_recordset($rows$${JSON.stringify(rows)}$rows$::jsonb)
  as r(name text, description text, price numeric, section text, sort int, attrs jsonb);
commit;
`;
process.stdout.write(sql);
