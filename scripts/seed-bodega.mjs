#!/usr/bin/env node
// seed-bodega.mjs — seed "Bodega La Bendición" (hz-bodega-bendicion): a full
// Instacart-grade Latino grocery test store. 30 product categories × 10 real
// products each (300 items), ~70 on sale (attrs.compareAt + badge Oferta), low /
// out-of-stock cases, 3 featured collections, delivery config, and the SAME test
// Stripe Connect account as El Sabor (same owner b@b.com) so card checkout works.
// Idempotent: re-running replaces the store's products + config.
// Run: node scripts/seed-bodega.mjs   (uses scripts/sbsql.mjs → SUPABASE_ACCESS_TOKEN)
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SLUG = 'hz-bodega-bendicion';

// Striped-tile palette (design-system placeholder imagery) — rotated per category.
const TILES = [
  ['#EFEBFF', '#E5DEF9'], ['#FCEBD6', '#F6DEC0'], ['#E3F5EA', '#D6EFDF'], ['#FBE9F0', '#F5D8E6'],
  ['#E5EFFB', '#D8E6F8'], ['#FCEFD6', '#F8E4BC'], ['#D6F3EF', '#C4EAE4'], ['#F3D9C8', '#E8C3AC'],
];
const tile = (i) => `${TILES[i % TILES.length][0]} 0 8px,${TILES[i % TILES.length][1]} 8px 16px`;

// [id, es, en, [ [nameEs, nameEn, price, compareAt?, badge?] ×10 ]]
// price = what you pay TODAY (the sale price); compareAt = the old price (display).
const CATS = [
  ['frutas', 'Frutas frescas', 'Fresh fruit', [
    ['Plátano verde · lb', 'Green plantain · lb', 0.79, null, 'Popular'],
    ['Aguacate Hass · c/u', 'Hass avocado · each', 1.49, 1.99, 'Oferta'],
    ['Mango Ataulfo · c/u', 'Ataulfo mango · each', 1.29, null, null],
    ['Limón verde · lb', 'Key lime · lb', 1.99, null, null],
    ['Naranja de jugo · bolsa 4 lb', 'Juice oranges · 4 lb bag', 4.99, 5.99, 'Oferta'],
    ['Piña dorada · c/u', 'Golden pineapple · each', 3.49, null, null],
    ['Guineo maduro · lb', 'Ripe banana · lb', 0.69, null, null],
    ['Papaya fresca · lb', 'Fresh papaya · lb', 1.89, null, null],
    ['Uvas rojas · lb', 'Red grapes · lb', 2.99, null, null],
    ['Tamarindo · 12 oz', 'Tamarind pods · 12 oz', 3.99, null, 'Nuevo'],
  ]],
  ['verduras', 'Verduras y víveres', 'Vegetables & roots', [
    ['Yuca fresca · lb', 'Fresh cassava · lb', 1.29, null, 'Popular'],
    ['Cilantro · manojo', 'Cilantro · bunch', 0.99, null, null],
    ['Tomate Roma · lb', 'Roma tomato · lb', 1.49, 1.99, 'Oferta'],
    ['Cebolla roja · lb', 'Red onion · lb', 1.19, null, null],
    ['Ajo fresco · 3 cabezas', 'Fresh garlic · 3 heads', 1.99, null, null],
    ['Chayote · c/u', 'Chayote squash · each', 1.39, null, null],
    ['Papa blanca · bolsa 5 lb', 'White potato · 5 lb bag', 4.49, null, null],
    ['Ají cubanela · lb', 'Cubanelle pepper · lb', 2.49, null, null],
    ['Plátano macho · c/u', 'Plantain · each', 0.89, null, null],
    ['Batata · lb', 'Sweet potato · lb', 1.59, 1.99, 'Oferta'],
  ]],
  ['carnes', 'Carnes de res', 'Beef', [
    ['Bistec de palomilla · lb', 'Top sirloin steak · lb', 7.99, 9.49, 'Oferta'],
    ['Carne molida 80/20 · lb', 'Ground beef 80/20 · lb', 5.49, null, 'Popular'],
    ['Falda para mechar · lb', 'Flank steak · lb', 8.99, null, null],
    ['Costilla de res · lb', 'Beef short ribs · lb', 6.99, null, null],
    ['Hueso de res para sopa · lb', 'Beef soup bones · lb', 3.49, null, null],
    ['Carne para guisar · lb', 'Beef stew meat · lb', 6.49, null, null],
    ['Lengua de res · lb', 'Beef tongue · lb', 7.49, null, null],
    ['Hígado de res · lb', 'Beef liver · lb', 3.99, null, null],
    ['Churrasco · lb', 'Skirt steak · lb', 11.99, 13.99, 'Oferta'],
    ['Patitas de res · lb', 'Beef feet · lb', 3.29, null, null],
  ]],
  ['pollo-cerdo', 'Pollo y cerdo', 'Chicken & pork', [
    ['Pollo entero fresco · lb', 'Whole fresh chicken · lb', 2.29, null, 'Popular'],
    ['Muslos de pollo · paquete familiar', 'Chicken thighs · family pack', 6.99, 8.49, 'Oferta'],
    ['Pechuga sin hueso · lb', 'Boneless chicken breast · lb', 4.49, null, null],
    ['Alitas de pollo · lb', 'Chicken wings · lb', 3.99, null, null],
    ['Chuleta de cerdo ahumada · lb', 'Smoked pork chop · lb', 4.99, null, null],
    ['Costillita de cerdo · lb', 'Pork ribs · lb', 4.79, null, null],
    ['Pernil (pierna de cerdo) · lb', 'Pork shoulder (pernil) · lb', 2.99, 3.79, 'Oferta'],
    ['Longaniza casera · lb', 'Homestyle longaniza · lb', 5.99, null, null],
    ['Chicharrón de cerdo · 8 oz', 'Pork cracklings · 8 oz', 4.49, null, null],
    ['Salami Induveca · 2 lb', 'Induveca salami · 2 lb', 9.99, null, 'Popular'],
  ]],
  ['mariscos', 'Pescados y mariscos', 'Fish & seafood', [
    ['Bacalao salado · lb', 'Salted cod · lb', 9.99, null, 'Popular'],
    ['Camarones medianos · lb', 'Medium shrimp · lb', 8.99, 10.99, 'Oferta'],
    ['Filete de tilapia · lb', 'Tilapia fillet · lb', 5.99, null, null],
    ['Pulpo entero · lb', 'Whole octopus · lb', 12.99, null, null],
    ['Cangrejo azul · docena', 'Blue crab · dozen', 24.99, null, null],
    ['Sardinas en lata · 15 oz', 'Canned sardines · 15 oz', 2.79, null, null],
    ['Filete de merluza · lb', 'Hake fillet · lb', 6.99, null, null],
    ['Calamares limpios · lb', 'Cleaned squid · lb', 7.99, null, null],
    ['Atún en agua · 3 pack', 'Tuna in water · 3 pack', 4.29, 4.99, 'Oferta'],
    ['Chillo entero · lb', 'Whole red snapper · lb', 10.99, null, null],
  ]],
  ['lacteos', 'Lácteos y huevos', 'Dairy & eggs', [
    ['Huevos grandes · 30 unidades', 'Large eggs · 30 count', 8.99, 9.99, 'Oferta'],
    ['Leche entera · galón', 'Whole milk · gallon', 4.29, null, 'Popular'],
    ['Crema mexicana · 15 oz', 'Mexican crema · 15 oz', 3.99, null, null],
    ['Mantequilla · 1 lb', 'Butter · 1 lb', 4.99, null, null],
    ['Leche evaporada Carnation · 12 oz', 'Carnation evaporated milk · 12 oz', 2.19, null, null],
    ['Leche condensada La Lechera · 14 oz', 'La Lechera condensed milk · 14 oz', 2.99, null, null],
    ['Yogur natural · 32 oz', 'Plain yogurt · 32 oz', 4.49, null, null],
    ['Leche de coco · 13.5 oz', 'Coconut milk · 13.5 oz', 2.49, null, null],
    ['Jugo de naranja fresco · 52 oz', 'Fresh orange juice · 52 oz', 5.49, 6.29, 'Oferta'],
    ['Flan casero · 4 pack', 'Homestyle flan · 4 pack', 4.99, null, 'Nuevo'],
  ]],
  ['quesos', 'Quesos latinos', 'Latin cheeses', [
    ['Queso de freír · lb', 'Frying cheese · lb', 6.49, null, 'Popular'],
    ['Queso fresco · 12 oz', 'Queso fresco · 12 oz', 4.99, 5.99, 'Oferta'],
    ['Queso Oaxaca · lb', 'Oaxaca cheese · lb', 7.99, null, null],
    ['Cotija rallado · 8 oz', 'Grated cotija · 8 oz', 5.49, null, null],
    ['Queso de papa (cheddar) · lb', 'Mild cheddar · lb', 5.99, null, null],
    ['Queso panela · 10 oz', 'Panela cheese · 10 oz', 4.79, null, null],
    ['Queso crema tropical · 8 oz', 'Tropical cream cheese · 8 oz', 3.49, null, null],
    ['Queso mozzarella · lb', 'Mozzarella · lb', 5.49, null, null],
    ['Queso geo (hoja) · lb', 'Queso de hoja · lb', 6.99, null, null],
    ['Requesón · 12 oz', 'Requesón · 12 oz', 3.99, null, null],
  ]],
  ['panaderia', 'Panadería', 'Bakery', [
    ['Pan de agua · 6 unidades', 'Pan de agua · 6 count', 3.49, null, 'Popular'],
    ['Pan sobao · barra', 'Pan sobao · loaf', 3.99, null, null],
    ['Telera · 4 unidades', 'Telera rolls · 4 count', 2.99, null, null],
    ['Concha surtida · c/u', 'Concha (assorted) · each', 1.29, null, 'Popular'],
    ['Bolillo · 5 unidades', 'Bolillo · 5 count', 2.49, null, null],
    ['Pan de coco · 4 unidades', 'Coconut bread · 4 count', 4.49, 4.99, 'Oferta'],
    ['Tres leches · porción', 'Tres leches slice', 3.99, null, null],
    ['Quesito · c/u', 'Quesito pastry · each', 1.99, null, null],
    ['Mallorca dulce · 2 unidades', 'Sweet mallorca · 2 count', 3.79, null, null],
    ['Pan tostado casero · bolsa', 'House toast bread · bag', 2.99, null, null],
  ]],
  ['tortillas', 'Tortillas y masa', 'Tortillas & masa', [
    ['Tortillas de maíz · 30 pack', 'Corn tortillas · 30 pack', 3.29, 3.99, 'Oferta'],
    ['Tortillas de harina · 10 pack', 'Flour tortillas · 10 pack', 2.99, null, 'Popular'],
    ['Maseca · 4.4 lb', 'Maseca corn flour · 4.4 lb', 5.49, null, null],
    ['Masa fresca para tamales · lb', 'Fresh tamale masa · lb', 2.49, null, null],
    ['Hojas de maíz para tamal · 8 oz', 'Corn husks · 8 oz', 3.99, null, null],
    ['Tostadas planas · 22 pack', 'Flat tostadas · 22 pack', 2.79, null, null],
    ['Sopes preformados · 10 pack', 'Preformed sopes · 10 pack', 3.49, null, null],
    ['Tortillas para burrito XL · 8 pack', 'XL burrito tortillas · 8 pack', 3.99, null, null],
    ['Empanada discos · 10 pack', 'Empanada discs · 10 pack', 3.29, null, null],
    ['Casabe · paquete', 'Casabe flatbread · pack', 4.99, null, 'Nuevo'],
  ]],
  ['arroz', 'Arroz y granos', 'Rice & grains', [
    ['Arroz Canilla · 5 lb', 'Canilla rice · 5 lb', 5.99, 6.99, 'Oferta'],
    ['Arroz jazmín · 5 lb', 'Jasmine rice · 5 lb', 7.49, null, null],
    ['Arroz para paella · 2 lb', 'Paella rice · 2 lb', 4.99, null, null],
    ['Quinua · 1 lb', 'Quinoa · 1 lb', 4.49, null, null],
    ['Avena en hojuelas · 42 oz', 'Rolled oats · 42 oz', 4.99, null, null],
    ['Harina de maíz precocida P.A.N. · 2 lb', 'P.A.N. precooked corn flour · 2 lb', 3.99, null, 'Popular'],
    ['Trigo bulgur · 1 lb', 'Bulgur wheat · 1 lb', 2.99, null, null],
    ['Arroz integral · 2 lb', 'Brown rice · 2 lb', 3.49, null, null],
    ['Cuscús · 12 oz', 'Couscous · 12 oz', 3.29, null, null],
    ['Maíz mote · 1 lb', 'Hominy corn · 1 lb', 2.79, null, null],
  ]],
  ['habichuelas', 'Habichuelas y frijoles', 'Beans', [
    ['Habichuelas rojas Goya · lata 15.5 oz', 'Goya red beans · 15.5 oz can', 1.69, 1.99, 'Oferta'],
    ['Frijol negro · bolsa 2 lb', 'Black beans · 2 lb bag', 3.49, null, 'Popular'],
    ['Habichuelas rosadas · bolsa 2 lb', 'Pink beans · 2 lb bag', 3.79, null, null],
    ['Frijol pinto · bolsa 4 lb', 'Pinto beans · 4 lb bag', 5.99, null, null],
    ['Gandules verdes · lata 15 oz', 'Green pigeon peas · 15 oz can', 1.99, null, null],
    ['Lentejas · bolsa 1 lb', 'Lentils · 1 lb bag', 1.99, null, null],
    ['Garbanzos · bolsa 1 lb', 'Chickpeas · 1 lb bag', 2.29, null, null],
    ['Habas secas · 14 oz', 'Dried fava beans · 14 oz', 2.99, null, null],
    ['Frijoles refritos · lata 16 oz', 'Refried beans · 16 oz can', 1.89, null, null],
    ['Habichuelas blancas · lata 15.5 oz', 'White beans · 15.5 oz can', 1.69, null, null],
  ]],
  ['pastas', 'Pastas y sopas', 'Pasta & soups', [
    ['Fideo cabello de ángel · 7 oz', 'Angel hair fideo · 7 oz', 0.99, null, 'Popular'],
    ['Espagueti · 1 lb', 'Spaghetti · 1 lb', 1.49, null, null],
    ['Coditos · 1 lb', 'Elbow macaroni · 1 lb', 1.49, null, null],
    ['Sopa de pollo Maggi · 8 cubos', 'Maggi chicken cubes · 8 pack', 2.29, null, null],
    ['Caldo de res Knorr · 7.9 oz', 'Knorr beef bouillon · 7.9 oz', 3.49, 3.99, 'Oferta'],
    ['Sopa instantánea de camarón · c/u', 'Instant shrimp soup · each', 1.19, null, null],
    ['Lasaña · 1 lb', 'Lasagna sheets · 1 lb', 2.49, null, null],
    ['Canelones · 8.8 oz', 'Cannelloni · 8.8 oz', 2.99, null, null],
    ['Sopa de mondongo lista · 24 oz', 'Ready mondongo soup · 24 oz', 6.99, null, 'Nuevo'],
    ['Fideos de arroz · 8 oz', 'Rice noodles · 8 oz', 2.79, null, null],
  ]],
  ['aceites', 'Aceites y mantecas', 'Oils & shortening', [
    ['Aceite de maíz Mazola · 40 oz', 'Mazola corn oil · 40 oz', 6.49, 7.49, 'Oferta'],
    ['Aceite de oliva extra virgen · 17 oz', 'Extra virgin olive oil · 17 oz', 7.99, null, null],
    ['Manteca vegetal · 3 lb', 'Vegetable shortening · 3 lb', 6.99, null, null],
    ['Aceite de coco · 14 oz', 'Coconut oil · 14 oz', 5.99, null, null],
    ['Aceite con achiote · 16 oz', 'Annatto oil · 16 oz', 4.49, null, 'Popular'],
    ['Manteca de cerdo · 1 lb', 'Pork lard · 1 lb', 3.99, null, null],
    ['Aceite de aguacate · 16.9 oz', 'Avocado oil · 16.9 oz', 8.99, null, 'Nuevo'],
    ['Aceite de canola · 48 oz', 'Canola oil · 48 oz', 5.49, null, null],
    ['Spray antiadherente · 6 oz', 'Cooking spray · 6 oz', 3.29, null, null],
    ['Ghee mantequilla clarificada · 8 oz', 'Ghee · 8 oz', 7.49, null, null],
  ]],
  ['salsas', 'Salsas y sazones', 'Sauces & seasonings', [
    ['Sofrito casero · 16 oz', 'House sofrito · 16 oz', 4.99, null, 'Popular'],
    ['Sazón Goya con culantro · 20 sobres', 'Goya sazón w/ culantro · 20 pk', 2.99, 3.49, 'Oferta'],
    ['Adobo Goya · 16.5 oz', 'Goya adobo · 16.5 oz', 3.99, null, null],
    ['Salsa verde Herdez · 16 oz', 'Herdez salsa verde · 16 oz', 2.79, null, null],
    ['Mole poblano Doña María · 8.25 oz', 'Doña María mole · 8.25 oz', 4.49, null, null],
    ['Chimichurri listo · 8 oz', 'Ready chimichurri · 8 oz', 4.99, null, null],
    ['Salsa de tomate española · 8 oz', 'Spanish tomato sauce · 8 oz', 0.89, null, null],
    ['Recaito Goya · 12 oz', 'Goya recaito · 12 oz', 2.99, null, null],
    ['Salsa picante valentina · 12.5 oz', 'Valentina hot sauce · 12.5 oz', 2.29, null, 'Popular'],
    ['Ketchup de plátano · 14 oz', 'Banana ketchup · 14 oz', 3.49, null, 'Nuevo'],
  ]],
  ['chiles', 'Chiles y especias', 'Chiles & spices', [
    ['Chile guajillo seco · 8 oz', 'Dried guajillo chile · 8 oz', 4.99, null, 'Popular'],
    ['Chile ancho seco · 8 oz', 'Dried ancho chile · 8 oz', 5.49, null, null],
    ['Chipotle en adobo · lata 7 oz', 'Chipotle in adobo · 7 oz can', 1.99, 2.49, 'Oferta'],
    ['Orégano dominicano · 2 oz', 'Dominican oregano · 2 oz', 3.49, null, null],
    ['Comino molido · 3 oz', 'Ground cumin · 3 oz', 2.49, null, null],
    ['Jalapeños en escabeche · 26 oz', 'Pickled jalapeños · 26 oz', 3.29, null, null],
    ['Achiote en pasta · 3.5 oz', 'Achiote paste · 3.5 oz', 2.99, null, null],
    ['Canela en rama · 1.5 oz', 'Cinnamon sticks · 1.5 oz', 3.99, null, null],
    ['Hoja de laurel · 0.5 oz', 'Bay leaves · 0.5 oz', 1.99, null, null],
    ['Chile de árbol · 4 oz', 'Chile de árbol · 4 oz', 3.79, null, null],
  ]],
  ['enlatados', 'Enlatados y frascos', 'Canned & jarred', [
    ['Maíz dulce · lata 15 oz', 'Sweet corn · 15 oz can', 1.29, null, null],
    ['Chiles rajas · lata 27 oz', 'Sliced green chiles · 27 oz', 3.49, null, null],
    ['Tomate triturado · lata 28 oz', 'Crushed tomatoes · 28 oz', 2.49, null, null],
    ['Leche de coco Goya · 13.5 oz', 'Goya coconut milk · 13.5 oz', 2.29, 2.69, 'Oferta'],
    ['Aceitunas manzanilla · 10 oz', 'Manzanilla olives · 10 oz', 3.99, null, null],
    ['Palmitos enteros · 14 oz', 'Hearts of palm · 14 oz', 4.49, null, null],
    ['Pimientos morrones · 12 oz', 'Roasted red peppers · 12 oz', 3.29, null, null],
    ['Nopalitos en salmuera · 30 oz', 'Nopalitos · 30 oz jar', 4.99, null, null],
    ['Frutas en almíbar · 15 oz', 'Fruit cocktail in syrup · 15 oz', 2.79, null, null],
    ['Dulce de leche · 15.8 oz', 'Dulce de leche · 15.8 oz', 4.99, null, 'Popular'],
  ]],
  ['snacks', 'Snacks y botanas', 'Snacks', [
    ['Platanitos verdes · 5 oz', 'Plantain chips · 5 oz', 2.29, null, 'Popular'],
    ['Chicharrones de harina · 6 oz', 'Duros wheat snacks · 6 oz', 1.99, null, null],
    ['Takis Fuego · 9.9 oz', 'Takis Fuego · 9.9 oz', 4.49, 4.99, 'Oferta'],
    ['Cacahuates japoneses · 14 oz', 'Japanese peanuts · 14 oz', 3.99, null, null],
    ['Yuca frita · 4.5 oz', 'Cassava chips · 4.5 oz', 2.49, null, null],
    ['Mix de frutas secas con chile · 8 oz', 'Chile fruit mix · 8 oz', 4.29, null, null],
    ['Semillas de calabaza · 6 oz', 'Pepitas · 6 oz', 3.49, null, null],
    ['Tostones congelados · 24 oz', 'Frozen tostones · 24 oz', 5.49, null, null],
    ['Palomitas con mantequilla · 3 pack', 'Butter popcorn · 3 pack', 2.99, null, null],
    ['Elote en vaso listo · c/u', 'Ready esquites cup · each', 3.99, null, 'Nuevo'],
  ]],
  ['galletas', 'Galletas y dulces', 'Cookies & candy', [
    ['Galletas María · 4 pack', 'María cookies · 4 pack', 3.49, null, 'Popular'],
    ['Mazapán De la Rosa · 12 pack', 'De la Rosa mazapán · 12 pk', 4.99, 5.99, 'Oferta'],
    ['Dulce de guayaba en barra · 14 oz', 'Guava paste bar · 14 oz', 3.99, null, null],
    ['Obleas con cajeta · 8 pack', 'Cajeta wafers · 8 pack', 4.49, null, null],
    ['Paletas de tamarindo · 10 pack', 'Tamarind lollipops · 10 pk', 3.99, null, null],
    ['Chocolate Abuelita · 19 oz', 'Abuelita chocolate · 19 oz', 5.49, null, 'Popular'],
    ['Galletas de coco · 11 oz', 'Coconut cookies · 11 oz', 2.99, null, null],
    ['Cocadas artesanales · 6 pack', 'Artisan cocadas · 6 pack', 5.99, null, null],
    ['Dulce de leche cortada · 16 oz', 'Dulce de leche cortada · 16 oz', 4.99, null, null],
    ['Gomitas enchiladas · 12 oz', 'Chili gummies · 12 oz', 3.79, null, null],
  ]],
  ['bebidas', 'Refrescos y sodas', 'Sodas & soft drinks', [
    ['Coca-Cola de vidrio mexicana · 4 pack', 'Mexican Coke glass · 4 pack', 6.99, 7.99, 'Oferta'],
    ['Jarritos surtidos · 6 pack', 'Assorted Jarritos · 6 pack', 7.49, null, 'Popular'],
    ['Malta India · 6 pack', 'Malta India · 6 pack', 6.49, null, null],
    ['Country Club frambuesa · 2 L', 'Country Club raspberry · 2 L', 2.99, null, null],
    ['Inca Kola · 2 L', 'Inca Kola · 2 L', 3.49, null, null],
    ['Agua mineral Topo Chico · 12 pack', 'Topo Chico · 12 pack', 13.99, null, null],
    ['Sidral Mundet · 2 L', 'Sidral Mundet · 2 L', 2.79, null, null],
    ['Refresco de coco · lata', 'Coconut soda · can', 1.29, null, null],
    ['Agua de 5 galones (recarga)', '5-gallon water refill', 2.49, null, null],
    ['Kola champagne · 2 L', 'Kola champagne · 2 L', 2.99, null, null],
  ]],
  ['jugos', 'Jugos y néctares', 'Juices & nectars', [
    ['Jugo de tamarindo · 33 oz', 'Tamarind juice · 33 oz', 3.49, null, null],
    ['Néctar de mango · 33.8 oz', 'Mango nectar · 33.8 oz', 2.99, 3.49, 'Oferta'],
    ['Jugo de guanábana · 33 oz', 'Soursop juice · 33 oz', 3.99, null, 'Popular'],
    ['Agua de jamaica concentrada · 32 oz', 'Hibiscus concentrate · 32 oz', 4.99, null, null],
    ['Horchata lista · 64 oz', 'Ready horchata · 64 oz', 4.49, null, null],
    ['Jugo de maracuyá · 33 oz', 'Passion fruit juice · 33 oz', 3.99, null, null],
    ['Coco agua natural · 17.5 oz', 'Coconut water · 17.5 oz', 2.49, null, null],
    ['Jugo de tomate Clamato · 32 oz', 'Clamato · 32 oz', 4.99, null, null],
    ['Néctar de pera · 6 pack', 'Pear nectar · 6 pack', 4.29, null, null],
    ['Limonada de coco lista · 52 oz', 'Coconut limeade · 52 oz', 4.99, null, 'Nuevo'],
  ]],
  ['cafe', 'Café y té', 'Coffee & tea', [
    ['Café Bustelo molido · 10 oz', 'Café Bustelo ground · 10 oz', 5.49, 6.49, 'Oferta'],
    ['Café Santo Domingo · 1 lb', 'Café Santo Domingo · 1 lb', 8.99, null, 'Popular'],
    ['Café de olla en polvo · 12 oz', 'Café de olla mix · 12 oz', 6.99, null, null],
    ['Té de manzanilla · 25 sobres', 'Chamomile tea · 25 bags', 2.99, null, null],
    ['Té de jengibre · 20 sobres', 'Ginger tea · 20 bags', 3.49, null, null],
    ['Café instantáneo · 7 oz', 'Instant coffee · 7 oz', 7.49, null, null],
    ['Chocolate de mesa Ibarra · 19 oz', 'Ibarra table chocolate · 19 oz', 5.99, null, null],
    ['Café en grano entero · 2 lb', 'Whole bean coffee · 2 lb', 15.99, 18.99, 'Oferta'],
    ['Mate argentino · 1 lb', 'Yerba mate · 1 lb', 8.49, null, 'Nuevo'],
    ['Té de tilo · 20 sobres', 'Linden tea · 20 bags', 2.99, null, null],
  ]],
  ['cereales', 'Cereales y desayuno', 'Cereal & breakfast', [
    ['Corn Flakes · 18 oz', 'Corn Flakes · 18 oz', 4.49, null, null],
    ['Avena Quaker · 42 oz', 'Quaker oats · 42 oz', 5.99, 6.99, 'Oferta'],
    ['Harina para pancakes · 32 oz', 'Pancake mix · 32 oz', 3.49, null, null],
    ['Miel de abeja pura · 12 oz', 'Pure honey · 12 oz', 5.99, null, null],
    ['Majarete listo (mezcla) · 8 oz', 'Majarete corn pudding mix · 8 oz', 3.99, null, 'Nuevo'],
    ['Granola con coco · 12 oz', 'Coconut granola · 12 oz', 4.99, null, null],
    ['Cereal Chocokrispis · 15 oz', 'Choco rice cereal · 15 oz', 4.99, null, 'Popular'],
    ['Crema de arroz · 14 oz', 'Cream of rice · 14 oz', 3.29, null, null],
    ['Fororo (harina tostada) · 1 lb', 'Fororo toasted flour · 1 lb', 3.99, null, null],
    ['Sirope de maple · 12 oz', 'Maple syrup · 12 oz', 5.49, null, null],
  ]],
  ['congelados', 'Congelados', 'Frozen', [
    ['Pulpa de fruta congelada · 14 oz', 'Frozen fruit pulp · 14 oz', 3.99, null, 'Popular'],
    ['Tamales de pollo · 6 pack', 'Chicken tamales · 6 pack', 9.99, 11.99, 'Oferta'],
    ['Empanadas de queso · 10 pack', 'Cheese empanadas · 10 pack', 8.49, null, null],
    ['Yuca pelada congelada · 3 lb', 'Frozen peeled cassava · 3 lb', 5.99, null, null],
    ['Maíz para esquites · 2 lb', 'Frozen corn for esquites · 2 lb', 4.49, null, null],
    ['Pupusas revueltas · 8 pack', 'Pupusas revueltas · 8 pack', 8.99, null, 'Popular'],
    ['Arepas precocidas · 10 pack', 'Precooked arepas · 10 pack', 6.99, null, null],
    ['Camarón empanizado · 1 lb', 'Breaded shrimp · 1 lb', 9.49, null, null],
    ['Fruta bomba en trozos · 1 lb', 'Frozen papaya chunks · 1 lb', 3.99, null, null],
    ['Churros listos para hornear · 12 pack', 'Bake-ready churros · 12 pk', 6.49, 7.49, 'Oferta'],
  ]],
  ['helados', 'Helados y postres', 'Ice cream & desserts', [
    ['Paletas de fruta natural · 6 pack', 'Fruit paletas · 6 pack', 6.99, null, 'Popular'],
    ['Helado de mamey · pinta', 'Mamey ice cream · pint', 5.49, 5.99, 'Oferta'],
    ['Helado de coco · pinta', 'Coconut ice cream · pint', 5.49, null, null],
    ['Bolis surtidos · 12 pack', 'Assorted bolis · 12 pack', 4.99, null, null],
    ['Nieve de garrafa fresa · cuarto', 'Hand-churned strawberry · qt', 8.99, null, null],
    ['Flan napolitano congelado · 16 oz', 'Frozen flan · 16 oz', 5.99, null, null],
    ['Cheesecake de guayaba · 6"', 'Guava cheesecake · 6"', 12.99, null, 'Nuevo'],
    ['Helado de dulce de leche · pinta', 'Dulce de leche pint', 5.99, null, null],
    ['Sándwich de helado · 6 pack', 'Ice cream sandwiches · 6 pk', 5.49, null, null],
    ['Raspado kit (jarabes) · 3 sabores', 'Shaved-ice syrup kit · 3', 8.99, null, null],
  ]],
  ['limpieza', 'Productos de limpieza', 'Cleaning', [
    ['Fabuloso lavanda · 56 oz', 'Fabuloso lavender · 56 oz', 3.99, 4.99, 'Oferta'],
    ['Cloro · 1 galón', 'Bleach · 1 gallon', 3.49, null, null],
    ['Jabón Zote rosa · barra', 'Zote pink bar soap', 1.99, null, 'Popular'],
    ['Detergente Ariel · 5 lb', 'Ariel detergent · 5 lb', 9.99, null, null],
    ['Esponjas de cocina · 6 pack', 'Kitchen sponges · 6 pack', 2.99, null, null],
    ['Suavizante Ensueño · 28 oz', 'Ensueño softener · 28 oz', 3.79, null, null],
    ['Escoba y recogedor · set', 'Broom & dustpan set', 8.99, null, null],
    ['Desinfectante en aerosol · 12 oz', 'Disinfectant spray · 12 oz', 4.49, null, null],
    ['Bolsas de basura · 45 pack', 'Trash bags · 45 pack', 6.99, null, null],
    ['Lavaplatos Axion · 28 oz', 'Axion dish paste · 28 oz', 3.29, null, null],
  ]],
  ['higiene', 'Higiene personal', 'Personal care', [
    ['Jabón Heno de Pravia · 3 pack', 'Heno de Pravia soap · 3 pk', 5.99, null, 'Popular'],
    ['Shampoo Savile · 34 oz', 'Savile shampoo · 34 oz', 6.49, 7.49, 'Oferta'],
    ['Pasta dental · 2 pack', 'Toothpaste · 2 pack', 4.99, null, null],
    ['Desodorante roll-on · c/u', 'Roll-on deodorant · each', 3.99, null, null],
    ['Agua de violetas · 7.5 oz', 'Violet water cologne · 7.5 oz', 5.99, null, null],
    ['Papel higiénico · 12 rollos', 'Toilet paper · 12 rolls', 8.99, null, null],
    ['Crema Concha Nácar · 2 oz', 'Concha Nácar cream · 2 oz', 6.49, null, null],
    ['Alcoholado 70 · 16 oz', 'Bay rum alcoholado · 16 oz', 4.99, null, 'Popular'],
    ['Toallitas húmedas · 80 pack', 'Wet wipes · 80 pack', 3.49, null, null],
    ['Vaporub · 3.5 oz', 'Vapor rub · 3.5 oz', 5.99, null, null],
  ]],
  ['bebe', 'Cuidado del bebé', 'Baby care', [
    ['Pañales talla 4 · 44 pack', 'Diapers size 4 · 44 pack', 13.99, 15.99, 'Oferta'],
    ['Fórmula infantil · 12.4 oz', 'Infant formula · 12.4 oz', 17.99, null, null],
    ['Toallitas para bebé · 3 pack', 'Baby wipes · 3 pack', 7.49, null, 'Popular'],
    ['Cereal de arroz para bebé · 8 oz', 'Baby rice cereal · 8 oz', 3.49, null, null],
    ['Compotas de fruta · 6 pack', 'Fruit baby food · 6 pack', 6.99, null, null],
    ['Shampoo para bebé · 13.6 oz', 'Baby shampoo · 13.6 oz', 4.99, null, null],
    ['Crema para rozaduras · 4 oz', 'Diaper rash cream · 4 oz', 5.49, null, null],
    ['Biberón anticólico · c/u', 'Anti-colic bottle · each', 7.99, null, null],
    ['Manzanilla para bebé · 8 oz', 'Baby chamomile wash · 8 oz', 4.49, null, 'Nuevo'],
    ['Pañales talla 1 · 40 pack', 'Diapers size 1 · 40 pack', 12.99, null, null],
  ]],
  ['mascotas', 'Mascotas', 'Pets', [
    ['Croquetas para perro · 16 lb', 'Dry dog food · 16 lb', 18.99, 21.99, 'Oferta'],
    ['Alimento para gato · 7 lb', 'Dry cat food · 7 lb', 11.99, null, null],
    ['Latas para perro · 6 pack', 'Wet dog food · 6 pack', 8.49, null, null],
    ['Arena para gato · 20 lb', 'Cat litter · 20 lb', 9.99, null, 'Popular'],
    ['Premios de pollo · 8 oz', 'Chicken treats · 8 oz', 4.99, null, null],
    ['Collar antipulgas · c/u', 'Flea collar · each', 7.99, null, null],
    ['Shampoo para mascotas · 16 oz', 'Pet shampoo · 16 oz', 5.99, null, null],
    ['Juguete de cuerda · c/u', 'Rope toy · each', 3.99, null, null],
    ['Latas para gato · 6 pack', 'Wet cat food · 6 pack', 7.49, null, null],
    ['Cama para mascota mediana', 'Medium pet bed', 19.99, null, 'Nuevo'],
  ]],
  ['farmacia', 'Farmacia básica', 'Basic pharmacy', [
    ['Acetaminofén 500mg · 100 tabs', 'Acetaminophen 500mg · 100', 6.99, null, 'Popular'],
    ['Ibuprofeno 200mg · 100 tabs', 'Ibuprofen 200mg · 100', 7.49, 8.49, 'Oferta'],
    ['Suero oral · 33.8 oz', 'Oral electrolyte · 33.8 oz', 4.99, null, null],
    ['Curitas surtidas · 100 pack', 'Assorted bandages · 100 pk', 3.99, null, null],
    ['Alcohol 70% · 16 oz', 'Rubbing alcohol · 16 oz', 2.99, null, null],
    ['Agua oxigenada · 16 oz', 'Hydrogen peroxide · 16 oz', 1.99, null, null],
    ['Té de hierbas medicinales · mix', 'Medicinal herb tea mix', 4.49, null, null],
    ['Vitamina C 500mg · 60 tabs', 'Vitamin C 500mg · 60', 6.49, null, null],
    ['Pomada de árnica · 2 oz', 'Arnica ointment · 2 oz', 5.99, null, 'Popular'],
    ['Termómetro digital · c/u', 'Digital thermometer', 8.99, null, null],
  ]],
  ['hogar', 'Hogar y cocina', 'Home & kitchen', [
    ['Caldero antiadherente · 6 qt', 'Nonstick caldero · 6 qt', 24.99, 29.99, 'Oferta'],
    ['Tortillera de madera · c/u', 'Wooden tortilla press', 16.99, null, 'Popular'],
    ['Molcajete de piedra · c/u', 'Stone molcajete', 29.99, null, null],
    ['Velas veladoras · 3 pack', 'Prayer candles · 3 pack', 5.99, null, null],
    ['Pilón de madera · c/u', 'Wooden pilón (mortar)', 19.99, null, null],
    ['Colador de café de tela · c/u', 'Cloth coffee strainer', 4.99, null, null],
    ['Sartén comal · 11"', 'Comal griddle · 11"', 14.99, null, null],
    ['Exprimidor de limones · c/u', 'Citrus squeezer', 7.99, null, null],
    ['Termo para café · 40 oz', 'Coffee thermos · 40 oz', 13.99, null, null],
    ['Juego de cucharas de madera · 6', 'Wooden spoon set · 6', 9.99, null, 'Nuevo'],
  ]],
];

if (CATS.length !== 30) { console.error(`expected 30 categories, got ${CATS.length}`); process.exit(1); }
for (const [id, , , prods] of CATS) if (prods.length !== 10) { console.error(`category ${id} has ${prods.length} products (want 10)`); process.exit(1); }

const esc = (s) => String(s).replace(/'/g, "''");

// product_config: 30 categories + 3 featured collections; selling ON.
const config = {
  categories: CATS.map(([id, es, en], i) => ({ id, es, en, icon: 'box', tile: tile(i), visible: true })),
  optionSets: [],
  collections: [
    { id: 'ofertas', es: 'Ofertas de la semana', en: 'Deals of the week', tile: '#FBE9F0 0 8px,#F5D8E6 8px 16px', productIds: [], featured: true },
    { id: 'nuevo', es: 'Lo nuevo de la bodega', en: 'New at the bodega', tile: '#E3F5EA 0 8px,#D6EFDF 8px 16px', productIds: [], featured: true },
    { id: 'favoritos', es: 'Favoritos del barrio', en: 'Neighborhood favorites', tile: '#EFEBFF 0 8px,#E5DEF9 8px 16px', productIds: [], featured: true },
  ],
  discounts: [], tags: [],
  automation: { trackStock: true, notifyLow: true, hideOutOfStock: false, backorders: false },
  selling: true,
};

const settings = {
  shipping: { delivery: { on: true, fee: '3.99', radius: '15', zones: [{ es: 'Hazleton centro', en: 'Hazleton core', toMi: 15, fee: 3.99, time: '45–60 min', color: '#7B61FF' }] } },
  delivery_ops: { minOrder: '10', prep: 20 },
};

// Deterministic stock: mostly healthy, ~1 sold-out + ~1 low per few categories.
const stockFor = (ci, pi) => {
  if ((ci % 4 === 1) && pi === 7) return 0;            // sold out (~8 items)
  if ((ci % 3 === 0) && pi === 5) return 3;            // low stock
  return 18 + ((ci * 13 + pi * 29) % 63);              // 18–80
};

let sql = `-- seed-bodega generated ${new Date().toISOString()}
-- Business shell (idempotent upsert by slug)
insert into public.businesses (slug, name, category_id, tagline_es, tagline_en, tier, price_level,
  about_es, about_en, address, city, phone, is_open, rating, reviews_count,
  tile_a, tile_b, location, owner_id, modules, settings, product_config,
  stripe_account_id, connect_charges_enabled, connect_details_submitted, timezone,
  specialty_es, specialty_en, hours_es, hours_en)
values ('${SLUG}', 'Bodega La Bendición', 'Grocery',
  'Tu súper latino: 300+ productos con entrega', 'Your Latino supermarket: 300+ products, delivered',
  'verified', '$',
  'Todo lo de tu país en un solo lugar: víveres, carnes, sazones, panadería y más. Pide en línea y te lo llevamos.',
  'Everything from back home in one place: produce, meats, seasonings, bakery and more. Order online for delivery.',
  '120 N Wyoming St, Hazleton, PA', 'Hazleton, PA', '(570) 555-0188', true, 0, 0,
  '#E3F5EA', '#D6EFDF', st_geogfromtext('POINT(-75.974 40.951)'),
  (select owner_id from public.businesses where slug='hz-sabor-quisqueya'),
  '{"updates": true}'::jsonb,
  '${esc(JSON.stringify(settings))}'::jsonb,
  '${esc(JSON.stringify(config))}'::jsonb,
  (select stripe_account_id from public.businesses where slug='hz-sabor-quisqueya'),
  true, true, 'America/New_York',
  'Productos latinos y entrega a domicilio', 'Latino groceries & home delivery',
  'Lun–Dom 7am–10pm', 'Mon–Sun 7am–10pm')
on conflict (slug) do update set
  product_config = excluded.product_config,
  settings = excluded.settings,
  stripe_account_id = excluded.stripe_account_id,
  connect_charges_enabled = excluded.connect_charges_enabled;

-- Replace the store's products wholesale (idempotent reseed)
delete from public.business_items where kind='product' and business_id=(select id from public.businesses where slug='${SLUG}');
insert into public.business_items (business_id, kind, name, description, price, section, available, sort, attrs) values
`;

const rows = [];
CATS.forEach(([catId, , catEn, prods], ci) => {
  prods.forEach(([es, en, price, compareAt, badge], pi) => {
    const stock = stockFor(ci, pi);
    const badges = [];
    if (compareAt) badges.push('Oferta');
    if (badge && badge !== 'Oferta' && !badges.includes(badge)) badges.push(badge);
    const attrs = {
      en, sku: `${catId.slice(0, 3).toUpperCase()}-${String(pi + 1).padStart(3, '0')}`,
      stock, reorder: 10, compareAt: compareAt ?? null,
      options: [], fulfill: ['local', 'pickup'], tax: 'goods', badges, sales: '',
    };
    rows.push(`((select id from public.businesses where slug='${SLUG}'), 'product', '${esc(es)}', '${esc(catEn)}', ${price}, '${catId}', true, ${ci * 100 + pi}, '${esc(JSON.stringify(attrs))}'::jsonb)`);
  });
});
sql += rows.join(',\n') + ';\n';
sql += `select count(*) as productos, count(*) filter (where (attrs->>'compareAt') is not null) as en_oferta, count(*) filter (where (attrs->>'stock')::int = 0) as agotados from public.business_items where kind='product' and business_id=(select id from public.businesses where slug='${SLUG}');\n`;

const out = resolve(HERE, '../.seed-bodega.sql');
writeFileSync(out, sql);
console.log(`sql written: ${out} (${rows.length} products)`);
const r = spawnSync('node', [resolve(HERE, 'sbsql.mjs'), '--file', out], { encoding: 'utf8', stdio: 'inherit' });
process.exit(r.status ?? 1);
