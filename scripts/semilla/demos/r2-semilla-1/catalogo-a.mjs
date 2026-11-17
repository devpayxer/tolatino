/* r2-semilla-1 · bancos de «lo que vende» para FOOD y MERC. Cada ítem de comida: {sc (sección), es, en, p (centavos)}. Sin emoji. */
import { COCINAS, SEC, COCINA_KEYS } from "../a/food-menu.mjs";
import { PRODUCTOS, DEF_SEC } from "../a/merc-cat.mjs";

/* ── FOOD ── */
const f = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean).map((l) => { const [sc, es, en, p] = l.split("|"); return { sc: +sc, es, en, p: Math.round(parseFloat(p) * 100) }; });
const FB = (secs, txt) => ({ secs, items: f(txt) });
const coc = (k) => {
  const c = COCINAS[k], keys = [...new Set(c.platos.map((x) => x.sec))];
  return { secs: keys.map((x) => SEC[x]), items: c.platos.map((x) => ({ sc: keys.indexOf(x.sec), es: x.es, en: x.en, p: x.p, de: x.de, den: x.den })) };
};
const EXTRA = {
  ecu: FB([["Platos fuertes", "Main dishes"], ["Entradas", "Starters"], ["Bebidas", "Drinks"]], `0|Seco de pollo|Chicken seco|13.95
0|Hornado con llapingachos|Roast pork with llapingachos|15.95
0|Fritada con mote|Fried pork with hominy|14.95
0|Encebollado de pescado|Fish encebollado|12.95
0|Ceviche de camarón|Shrimp ceviche|14.95
1|Bolón de verde con queso|Green plantain bolón with cheese|6.95
1|Empanadas de viento (3)|Cheese empanadas de viento (3)|6.50
1|Tigrillo|Tigrillo|8.95
2|Colada morada|Colada morada|3.95
2|Jugo de naranjilla|Naranjilla juice|3.50`),
  parr: FB([["Parrilla", "Grill"], ["Acompañantes", "Sides"], ["Postres y bebidas", "Desserts and drinks"]], `0|Bife de chorizo|Sirloin strip|24.95
0|Asado de tira|Short ribs|21.95
0|Entraña a la parrilla|Grilled skirt steak|23.95
0|Parrillada para dos|Mixed grill for two|49.95
0|Chorizo y morcilla|Chorizo and blood sausage|13.95
0|Provoleta|Grilled provolone|9.95
1|Papas rústicas|Rustic potatoes|5.95
1|Ensalada mixta|Mixed salad|6.50
1|Chimichurri de la casa|House chimichurri|2.50
2|Flan con dulce de leche|Flan with dulce de leche|6.95
2|Vino de la casa (copa)|House wine (glass)|8.00`),
  esp: FB([["Tapas", "Tapas"], ["Platos", "Plates"], ["Postres", "Desserts"]], `0|Tortilla española|Spanish omelet|8.95
0|Patatas bravas|Patatas bravas|7.50
0|Croquetas de jamón (6)|Ham croquettes (6)|9.50
0|Gambas al ajillo|Garlic shrimp|13.95
1|Paella valenciana (2 personas)|Valencian paella (serves 2)|36.00
1|Pollo al ajillo|Garlic chicken|17.95
1|Fabada asturiana|Asturian bean stew|16.95
2|Churros con chocolate|Churros with chocolate|7.50
2|Crema catalana|Catalan cream|6.95`),
  asia: FB([["Platos", "Plates"], ["Entradas", "Starters"], ["Sopas", "Soups"]], `0|Arroz frito especial|Special fried rice|11.95
0|Lo mein de pollo|Chicken lo mein|11.50
0|Pollo General Tso|General Tso's chicken|13.95
0|Res con brócoli|Beef with broccoli|14.50
0|Camarones al ajo|Garlic shrimp|15.95
1|Rollitos primavera (3)|Spring rolls (3)|5.50
1|Wontons fritos (6)|Fried wontons (6)|6.95
2|Sopa agripicante|Hot and sour soup|5.95
2|Sopa wonton|Wonton soup|6.50`),
  ita: FB([["Pizzas", "Pizzas"], ["Pastas", "Pastas"], ["Extras", "Extras"]], `0|Pizza margarita|Margherita pizza|13.95
0|Pizza de pepperoni|Pepperoni pizza|15.95
0|Pizza hawaiana|Hawaiian pizza|16.50
0|Pizza de cuatro quesos|Four-cheese pizza|17.50
1|Espagueti a la boloñesa|Spaghetti bolognese|14.95
1|Fettuccine Alfredo|Fettuccine Alfredo|14.95
1|Lasaña de la casa|House lasagna|16.50
2|Palitos de ajo|Garlic breadsticks|6.50
2|Ensalada César|Caesar salad|8.95
2|Tiramisú|Tiramisu|7.50`),
  mar: FB([["Del mar", "From the sea"], ["Entradas", "Starters"], ["Bebidas", "Drinks"]], `0|Pescado frito entero|Whole fried fish|19.95
0|Camarones al ajillo|Garlic shrimp|18.95
0|Arroz con mariscos|Seafood rice|21.95
0|Filete de pescado a la plancha|Grilled fish fillet|17.95
0|Langostinos empanizados|Breaded prawns|19.50
1|Ceviche mixto|Mixed ceviche|15.95
1|Cóctel de camarón|Shrimp cocktail|14.50
1|Tostones con ceviche|Tostones with ceviche|11.95
2|Limonada natural|Fresh lemonade|3.50
2|Cerveza fría|Cold beer|4.50`),
  pollo: FB([["Pollos", "Chicken"], ["Acompañantes", "Sides"], ["Bebidas", "Drinks"]], `0|Pollo entero asado|Whole roasted chicken|14.95
0|Medio pollo asado|Half roasted chicken|8.95
0|Cuarto de pollo con papas|Quarter chicken with fries|7.95
0|Combo familiar (2 pollos)|Family combo (2 chickens)|28.95
1|Yuca frita|Fried yuca|4.50
1|Ensalada de repollo|Coleslaw|3.50
1|Arroz con frijoles|Rice and beans|3.95
1|Papas fritas grandes|Large fries|4.50
2|Refresco de 2 litros|2-liter soda|3.50`),
  burger: FB([["Hamburguesas", "Burgers"], ["Acompañantes", "Sides"], ["Bebidas y postres", "Drinks and desserts"]], `0|Hamburguesa clásica|Classic burger|9.95
0|Hamburguesa con queso y tocino|Bacon cheeseburger|12.50
0|Hamburguesa picante|Spicy burger|11.95
0|Hamburguesa de pollo crujiente|Crispy chicken burger|10.95
0|Perro caliente especial|Loaded hot dog|7.95
1|Papas fritas|French fries|4.50
1|Aros de cebolla|Onion rings|5.50
1|Papas con queso|Cheese fries|6.50
2|Malteada de vainilla|Vanilla milkshake|5.95
2|Refresco|Soda|2.50`),
  desay: FB([["Desayunos", "Breakfast"], ["Bebidas", "Drinks"]], `0|Huevos revueltos con tostadas|Scrambled eggs with toast|7.95
0|Huevos rancheros|Huevos rancheros|9.95
0|Pancakes con frutas|Pancakes with fruit|8.95
0|Mangú con huevo y salami|Mangú with egg and salami|10.95
0|Sándwich de desayuno|Breakfast sandwich|7.50
0|Tamal con atol|Tamal with atol|6.50
0|Avena con canela|Cinnamon oatmeal|4.95
1|Café con leche|Coffee with milk|3.50
1|Jugo de naranja natural|Fresh orange juice|4.50`),
  pan: FB([["Panes", "Breads"], ["Dulces", "Sweet bread"], ["Salados", "Savory"]], `0|Pan de agua (6)|Pan de agua (6)|4.50
0|Pan sobao|Pan sobao|3.95
0|Bolillos (6)|Bolillos (6)|4.95
1|Concha|Concha|1.95
1|Pan de coco|Coconut bread|2.50
1|Churro relleno|Filled churro|2.95
1|Tres leches (porción)|Tres leches (slice)|5.50
2|Pastelito de guayaba|Guava pastry|2.50
2|Empanada de carne|Beef empanada|2.95
2|Pan de queso|Cheese bread|2.50`),
  repos: FB([["Pasteles", "Cakes"], ["Individuales", "Single servings"], ["Por encargo", "Custom orders"]], `0|Pastel de tres leches (8 porciones)|Tres leches cake (8 slices)|32.00
0|Pastel de chocolate (8 porciones)|Chocolate cake (8 slices)|34.00
0|Pastel de vainilla con fresas|Vanilla cake with strawberries|35.00
0|Cheesecake de guayaba|Guava cheesecake|36.00
1|Cupcakes (6)|Cupcakes (6)|18.00
1|Porción de pastel|Cake slice|5.50
1|Alfajores (6)|Alfajores (6)|9.00
2|Pastel personalizado de cumpleaños|Custom birthday cake|65.00
2|Pastel de quinceañera (3 pisos)|Quinceañera cake (3 tiers)|220.00
2|Mesa de dulces para 30|Dessert table for 30|180.00`),
  post: FB([["Postres", "Desserts"], ["Bebidas", "Drinks"]], `0|Flan de caramelo|Caramel flan|4.95
0|Arroz con leche|Rice pudding|4.50
0|Tembleque|Tembleque|4.95
0|Tres leches|Tres leches|5.50
0|Churros con dulce de leche|Churros with dulce de leche|6.50
0|Majarete|Majarete|4.50
0|Brazo gitano|Swiss roll|5.50
1|Chocolate caliente|Hot chocolate|3.95
1|Café con leche|Coffee with milk|3.50`),
  hel: FB([["Helados", "Ice cream"], ["Paletas", "Popsicles"], ["Para llevar", "To go"]], `0|Helado de coco (bola)|Coconut ice cream (scoop)|3.50
0|Helado de mamey (bola)|Mamey ice cream (scoop)|3.75
0|Helado de fresa con crema|Strawberries and cream ice cream|3.75
0|Banana split|Banana split|7.95
1|Paleta de mango con chile|Mango popsicle with chili|2.95
1|Paleta de fresa con crema|Strawberry cream popsicle|2.95
1|Paleta de limón|Lemon popsicle|2.50
2|Litro de helado|Pint of ice cream|8.50
2|Raspado de sabores|Flavored shaved ice|3.95`),
  anto: FB([["Antojitos", "Snacks"], ["Dulces", "Sweets"], ["Bebidas", "Drinks"]], `0|Elote con mayonesa y queso|Street corn with mayo and cheese|4.50
0|Esquites|Esquites|4.50
0|Tostilocos|Tostilocos|6.50
0|Fruta con chile y limón|Fruit with chili and lime|5.50
1|Cocadas (3)|Coconut sweets (3)|4.00
1|Dulce de leche cortada|Cut-milk fudge|3.50
1|Mazapán y tamarindo|Mazapán and tamarind candy|3.00
2|Agua fresca de jamaica|Hibiscus agua fresca|3.50
2|Tejuino|Tejuino|4.00`),
  jugo: FB([["Jugos", "Juices"], ["Batidos", "Smoothies"], ["Extras", "Extras"]], `0|Jugo de naranja natural|Fresh orange juice|5.50
0|Jugo de piña|Pineapple juice|5.50
0|Jugo verde|Green juice|6.50
0|Jugo de zanahoria y naranja|Carrot and orange juice|5.95
1|Batido de mango|Mango smoothie|6.50
1|Batido de fresa y plátano|Strawberry banana smoothie|6.50
1|Batido de avena y canela|Oat and cinnamon smoothie|6.50
1|Morir soñando|Morir soñando|5.95
2|Shot de jengibre|Ginger shot|3.50
2|Proteína extra|Protein boost|1.50`),
  cafe: FB([["Café", "Coffee"], ["Para acompañar", "To go with it"]], `0|Café americano|Americano|2.95
0|Café con leche|Coffee with milk|3.50
0|Capuchino|Cappuccino|4.25
0|Latte de vainilla|Vanilla latte|4.75
0|Café cubano|Cuban coffee|2.50
0|Frappé de caramelo|Caramel frappe|5.50
1|Croissant de jamón y queso|Ham and cheese croissant|4.95
1|Pastelito de guayaba|Guava pastry|2.50
1|Tostada con aguacate|Avocado toast|6.50`),
  beb: FB([["Bebidas", "Drinks"], ["Barra y eventos", "Bar and events"]], `0|Jarra de limonada|Lemonade pitcher|12.00
0|Jarra de agua de jamaica|Hibiscus pitcher|12.00
0|Coquito (botella)|Coquito (bottle)|20.00
0|Morir soñando|Morir soñando|4.50
0|Ponche de frutas (galón)|Fruit punch (gallon)|18.00
1|Barra móvil: 2 horas (hasta 30 personas)|Mobile bar: 2 hours (up to 30 guests)|350.00
1|Barra móvil: 4 horas (hasta 60 personas)|Mobile bar: 4 hours (up to 60 guests)|650.00
1|Bartender por hora|Bartender per hour|45.00`),
  hielo: FB([["Hielo y agua", "Ice and water"]], `0|Bolsa de hielo 10 lb|10 lb ice bag|3.00
0|Bolsa de hielo 20 lb|20 lb ice bag|5.00
0|Garrafón de agua 5 galones|5-gallon water jug|7.00
0|Cartón de agua embotellada (24)|Case of bottled water (24)|6.50
0|Hielo seco (por lb)|Dry ice (per lb)|3.50
0|Entrega para fiestas (hasta 100 lb)|Party delivery (up to 100 lb)|60.00`),
  cat: FB([["Menús por persona", "Menus per person"], ["Bandejas", "Trays"], ["Servicio", "Service"]], `0|Menú criollo por persona (mín. 20)|Criollo menu per person (min. 20)|18.00
0|Menú buffet premium por persona (mín. 30)|Premium buffet per person (min. 30)|26.00
0|Menú infantil por niño|Kids menu per child|9.00
1|Bandeja de arroz y habichuelas (20 porciones)|Rice and beans tray (20 servings)|60.00
1|Bandeja de pollo guisado (20 porciones)|Stewed chicken tray (20 servings)|95.00
1|Bandeja de pernil (20 porciones)|Roast pork tray (20 servings)|110.00
1|Bandeja de ensalada (20 porciones)|Salad tray (20 servings)|45.00
2|Mesero por hora|Server per hour|30.00
2|Montaje y recogida|Setup and pickup|100.00
2|Entrega y calentadores|Delivery and warmers|75.00`),
  chef: FB([["Experiencias", "Experiences"], ["Extras", "Extras"]], `0|Cena de 3 tiempos para 2|3-course dinner for 2|140.00
0|Cena de 4 tiempos para 4|4-course dinner for 4|320.00
0|Degustación de 6 tiempos (por persona)|6-course tasting (per person)|95.00
0|Brunch privado (por persona)|Private brunch (per person)|45.00
1|Compra de ingredientes|Grocery shopping|35.00
1|Maridaje de vinos (por persona)|Wine pairing (per person)|30.00
1|Limpieza de cocina|Kitchen cleanup|40.00`),
  sem: FB([["Planes semanales", "Weekly plans"], ["Platos sueltos", "Single meals"]], `0|Plan de 5 almuerzos|5-lunch plan|60.00
0|Plan de 5 cenas|5-dinner plan|65.00
0|Plan completo (5 almuerzos y 5 cenas)|Full plan (5 lunches and 5 dinners)|115.00
0|Plan fit (5 comidas bajas en carbohidrato)|Fit plan (5 low-carb meals)|70.00
1|Pollo guisado con arroz|Stewed chicken with rice|10.95
1|Carne con vegetales|Beef with vegetables|11.95
1|Pasta con pollo|Chicken pasta|10.95
1|Sopa de la semana (32 oz)|Soup of the week (32 oz)|9.00`),
  cam: FB([["Camión", "Truck"], ["Bebidas", "Drinks"]], `0|Tacos de asada (3)|Carne asada tacos (3)|9.95
0|Quesadilla grande|Large quesadilla|9.50
0|Burrito de pollo|Chicken burrito|10.95
0|Torta cubana|Cubana torta|11.50
0|Nachos con carne|Loaded nachos|9.95
0|Elote preparado|Prepared corn|4.50
1|Agua fresca|Agua fresca|3.00
1|Refresco|Soda|2.50`),
};
export function bancoFood(subs, hashN) {
  const mapa = { "NEG-FOOD-10": () => coc("dom"), "NEG-FOOD-11": () => coc("pr"), "NEG-FOOD-12": () => coc("cub"), "NEG-FOOD-16": () => EXTRA.ecu, "NEG-FOOD-19": () => coc("hon"), "NEG-FOOD-20": () => EXTRA.parr,
    "NEG-FOOD-22": () => EXTRA.esp, "NEG-FOOD-25": () => EXTRA.asia, "NEG-FOOD-26": () => EXTRA.ita, "NEG-FOOD-27": () => coc("mex"), "NEG-FOOD-28": () => coc("sal"), "NEG-FOOD-29": () => coc("ven"), "NEG-FOOD-30": () => coc("col"),
    "NEG-FOOD-31": () => coc("mex"), "NEG-FOOD-32": () => EXTRA.mar, "NEG-FOOD-33": () => EXTRA.parr, "NEG-FOOD-35": () => EXTRA.pollo, "NEG-FOOD-38": () => EXTRA.burger, "NEG-FOOD-39": () => EXTRA.desay, "NEG-FOOD-40": () => coc("dom"),
    "NEG-FOOD-42": () => EXTRA.pan, "NEG-FOOD-43": () => EXTRA.repos, "NEG-FOOD-44": () => EXTRA.repos, "NEG-FOOD-45": () => EXTRA.post, "NEG-FOOD-46": () => EXTRA.hel, "NEG-FOOD-47": () => EXTRA.anto, "NEG-FOOD-48": () => EXTRA.jugo,
    "NEG-FOOD-49": () => EXTRA.cafe, "NEG-FOOD-50": () => EXTRA.beb, "NEG-FOOD-52": () => EXTRA.beb, "NEG-FOOD-53": () => EXTRA.hielo, "NEG-FOOD-05": () => EXTRA.cat, "NEG-FOOD-04": () => EXTRA.chef, "NEG-FOOD-03": () => EXTRA.sem,
    "NEG-FOOD-06": () => EXTRA.cam, "NEG-FOOD-07": () => EXTRA.cam, "NEG-FOOD-01": () => coc(COCINA_KEYS[hashN % 8]), "NEG-FOOD-08": () => coc(COCINA_KEYS[(hashN + 3) % 8]) };
  const ord = [...subs.filter((s) => +s.slice(-2) >= 10), ...subs.filter((s) => +s.slice(-2) < 10)];
  for (const s of ord) if (mapa[s]) return mapa[s]();
  return coc(COCINA_KEYS[hashN % 8]);
}

/* ── MERC ── */
const ORI = { "NEG-MERC-12": "mx", "NEG-MERC-13": "do", "NEG-MERC-14": "ca", "NEG-MERC-15": "sa" };
const pr = (x) => ({ sc: x.key, es: x.es, en: x.en, p: x.p, unit: x.unit, de: x.de, den: x.den, ebt: x.ebt, tax: x.tax });
const mk = (sc, txt) => txt.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [es, en, p, unit] = l.split("|"); return { sc, es, en, p: Math.round(parseFloat(p) * 100), unit: unit || "u", ebt: false, tax: 6 }; });
const MX = {
  lic: mk("beb", `Cerveza nacional (6 pack)|Domestic beer (6-pack)|9.99
Cerveza mexicana (12 pack)|Mexican beer (12-pack)|18.99
Tequila reposado 750 ml|Reposado tequila 750 ml|29.99
Ron dominicano 750 ml|Dominican rum 750 ml|24.99
Aguardiente 750 ml|Aguardiente 750 ml|22.99
Vino tinto 750 ml|Red wine 750 ml|11.99
Whisky 750 ml|Whiskey 750 ml|27.99
Vodka 750 ml|Vodka 750 ml|19.99
Hielo 10 lb|Ice 10 lb|3.50
Refresco mezclador 2 L|Mixer soda 2 L|2.99
Limones (bolsa)|Limes (bag)|2.99
Vasos desechables (50)|Disposable cups (50)|4.99`),
  tab: mk("limp", `Cigarros (cajetilla)|Cigarettes (pack)|9.99
Tabaco para pipa 1.5 oz|Pipe tobacco 1.5 oz|11.99
Cigarro puro dominicano|Dominican cigar|7.99
Caja de cigarros puros (10)|Cigar box (10)|59.99
Encendedor|Lighter|1.99
Papel para liar|Rolling papers|2.49
Humidor de viaje|Travel humidor|24.99
Cortador de puros|Cigar cutter|12.99
Cenicero de vidrio|Glass ashtray|8.99
Carbón para hookah (caja)|Hookah charcoal (box)|6.99`),
  vap: mk("limp", `Dispositivo recargable|Rechargeable device|24.99
Cartucho de repuesto (2)|Replacement pod (2)|11.99
Líquido 30 ml|E-liquid 30 ml|14.99
Cargador USB|USB charger|7.99
Batería de repuesto|Replacement battery|9.99
Bobinas de repuesto (5)|Replacement coils (5)|12.99
Estuche de viaje|Carry case|6.99
Limpiador de dispositivo|Device cleaner|4.99`),
  bot: mk("limp", `Vela de siete días|Seven-day candle|4.99
Incienso (paquete)|Incense (pack)|3.99
Hierbas para té de la casa (bolsa)|House herbal tea (bag)|6.99
Ruda (manojo)|Rue (bunch)|2.99
Manzanilla seca (bolsa)|Dried chamomile (bag)|3.99
Estampa religiosa|Prayer card|1.99
Imagen de santo 8 pulgadas|Saint statue 8 in|19.99
Aceite esencial de lavanda|Lavender essential oil|9.99
Jabón de azufre|Sulfur soap|3.99
Agua de florida|Florida water|7.99`),
  agu: mk("beb", `Garrafón de agua 5 galones|5-gallon water jug|6.50
Cartón de agua embotellada (24)|Case of bottled water (24)|5.99
Bolsa de hielo 10 lb|10 lb ice bag|3.00
Bolsa de hielo 20 lb|20 lb ice bag|5.00
Agua alcalina (6 botellas)|Alkaline water (6 bottles)|8.99
Dispensador de mesa|Tabletop dispenser|29.99
Recarga de garrafón|Jug refill|3.50
Entrega a domicilio (hasta 5 garrafones)|Home delivery (up to 5 jugs)|9.00`),
  mas: mk("limp", `Alimento para perro adulto 15 lb|Adult dog food 15 lb|24.99
Alimento para cachorro 8 lb|Puppy food 8 lb|18.99
Alimento para gato 10 lb|Cat food 10 lb|19.99
Arena para gato 20 lb|Cat litter 20 lb|12.99
Premios para perro (bolsa)|Dog treats (bag)|6.99
Collar ajustable|Adjustable collar|8.99
Correa 6 pies|6 ft leash|9.99
Plato doble de acero|Double steel bowl|11.99
Juguete de cuerda|Rope toy|5.99
Shampoo para mascotas|Pet shampoo|7.99`),
  dol: mk("limp", `Detergente líquido|Liquid detergent|1.25
Papel de cocina (2 rollos)|Paper towels (2 rolls)|1.25
Escoba|Broom|1.25
Cubeta plástica|Plastic bucket|1.25
Velas aromáticas|Scented candles|1.25
Bolsas de basura (20)|Trash bags (20)|1.25
Cuaderno escolar|School notebook|1.25
Lápices (12)|Pencils (12)|1.25
Platos desechables (25)|Disposable plates (25)|1.25
Esponjas (3)|Sponges (3)|1.25
Cargador de celular|Phone charger|1.25
Globos de fiesta (20)|Party balloons (20)|1.25`),
};
const KEYSET = { "0": ["desp", "beb", "lacteo", "viveres", "pan", "limp"], "1": ["res", "cerdo", "pollo", "viveres", "desp", "lacteo", "pan", "cong", "beb", "limp"], "2": ["desp", "viveres", "lacteo", "beb", "limp"],
  "3": ["res", "cerdo", "pollo", "chivo", "emb", "menu"], "4": ["pescado", "marisco", "congmar", "prep", "viveres"] };
function sacar(tipo, origen, h) {
  const cl = KEYSET[tipo];
  const l = PRODUCTOS.filter((x) => cl.includes(x.key) && (x.inn.includes(tipo) || ["lacteo", "pan", "beb", "viveres"].includes(x.key)) && (!x.o || x.o.includes(origen) || (h + x.es.length) % 5 === 0));
  return l.slice(0, 40).map(pr);
}
export function bancoMerc(subs, hashN) {
  const S = subs.map((s) => s.slice(-2));
  const origen = subs.map((s) => ORI[s]).find(Boolean) ?? ["do", "mx", "ca", "sa", "car"][hashN % 5];
  if (S.includes("21")) return { items: MX.lic };
  if (S.includes("23")) return { items: MX.tab };
  if (S.includes("24")) return { items: MX.vap };
  if (S.includes("25")) return { items: MX.bot };
  if (S.includes("26")) return { items: MX.agu };
  if (S.includes("27")) return { items: MX.mas };
  if (S.includes("20")) return { items: MX.dol };
  if (S.includes("06") || S.includes("18")) return { items: PRODUCTOS.filter((x) => ["viveres", "pan", "lacteo"].includes(x.key) || (x.key === "desp" && x.p < 300)).slice(0, 30).map(pr) };
  if (S.includes("08")) return { items: PRODUCTOS.filter((x) => ["emb", "prep", "lacteo", "pan", "beb"].includes(x.key)).map(pr) };
  if (S.includes("10")) return { items: PRODUCTOS.filter((x) => ["lacteo", "pan"].includes(x.key)).map(pr) };
  const tipo = S.includes("04") ? "3" : S.includes("05") ? "4" : S.includes("02") || S.includes("17") ? "1" : S.includes("12") || S.includes("13") || S.includes("14") || S.includes("15") ? "2" : "0";
  return { items: sacar(tipo, origen, hashN) };
}
export const SEC_MERC = DEF_SEC;
