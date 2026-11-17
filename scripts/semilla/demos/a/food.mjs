/* Grupo A · FOOD · 5 subcategorías principales (por orden del catálogo, sort 1–5): Comida casera · Cocina de fin de semana · Comida preparada por semana ·
   Chef privado · Catering y banquetes. Cada una con 10 negocios (2 por ciudad), la cocina de un país latino, menú completo, opciones y ~10 años de pedidos. */
import { rng, q, j, arr, bi, photoUrl, MES_ES, money, diasAtras } from "./comun.mjs";
import { armar, ciudadDe, anioFundado, dias, maxDiasDe, estrellas, siguiente } from "./negocio.mjs";
import { SEC, GRUPOS, COCINAS, COCINA_KEYS, FOTOS } from "./food-menu.mjs";
import { horario, rango } from "./comun.mjs";

const SUBS = ["NEG-FOOD-01", "NEG-FOOD-02", "NEG-FOOD-03", "NEG-FOOD-04", "NEG-FOOD-05"];
const NOMBRES = [
  [["Sazón de Abuela Lucía", "dom"], ["Cocina Casera Doña Chela", "mex"], ["El Fogón de Doña Carmen", "pr"], ["Casa Paisa de Marina", "col"], ["La Cocina de Mamá Rosy", "sal"],
   ["Sabor Catracho de Doña Nelly", "hon"], ["Mi Casita Venezolana", "ven"], ["La Cocinita de Yaneisy", "cub"], ["Doña Yolanda en tu Mesa", "dom"], ["Sazón Michoacano de Doña Lupe", "mex"]],
  [["Barbacoa y Birria los Sábados", "mex"], ["Sancocho de los Domingos", "dom"], ["Pasteles y Pernil de Fin de Semana", "pr"], ["Fin de Semana Paisa", "col"], ["Las Pupusas del Sábado", "sal"],
   ["Baleadas de Fin de Semana", "hon"], ["Arepera del Fin de Semana", "ven"], ["Lechón de Domingo Casa Cuba", "cub"], ["Chivo y Locrio de Don Wilfredo", "dom"], ["Pozole del Domingo Doña Mari", "mex"]],
  [["Meal Prep Criollo by Yaneris", "dom"], ["Semana Fácil Comida Mexicana", "mex"], ["Boricua Meal Prep", "pr"], ["Almuerzos de la Semana Paisa", "col"], ["Lunch Box Salvadoreño", "sal"],
   ["Fit Latino Meal Prep", "hon"], ["Menú de la Semana Caracas", "ven"], ["Cubanito Meal Prep", "cub"], ["Tupper Casero Latino", "dom"], ["Preparados Doña Rocío", "mex"]],
  [["Chef Wilmer · Cena en tu Casa", "dom"], ["Chef Alejandra · Sabores de México", "mex"], ["Chef Boricua a Domicilio", "pr"], ["Chef Camila · Cocina Colombiana Privada", "col"], ["Chef Emerson · Mesa Salvadoreña", "sal"],
   ["Chef Dayana · Experiencia Catracha", "hon"], ["Chef Gabriel · Cena Venezolana", "ven"], ["Chef Osmany · Cocina Cubana de Autor", "cub"], ["Chef Ismael · Alta Cocina Criolla", "dom"], ["Chef Valeria · Menú de Autor", "mex"]],
  [["Catering Sabor Criollo", "dom"], ["Banquetes Doña Amparo", "mex"], ["Catering Isla del Encanto", "pr"], ["Banquetes La Fiesta Paisa", "col"], ["Catering El Salvador en tu Evento", "sal"],
   ["Banquetes Honduras 504", "hon"], ["Catering Venezuela Sabrosa", "ven"], ["Banquetes Cuba en Mesa", "cub"], ["Eventos y Banquetes Los Compadres", "dom"], ["Catering Tres Reyes", "mex"]],
];

const FOTOS_NEGOCIO = {
  0: [[39122376, 38330332, 39143744, 27556972, 14686443], [6310256, 5837188, 4958774, 29465179, 5920644], [33776459, 12181619, 39333423, 37121074, 27556971], [15135087, 36905236, 37368697, 5836619, 1633668],
      [12261167, 9700895, 5836619, 36905236, 27556972], [32291149, 19781592, 6310256, 1633668, 27397342], [33917296, 5836619, 5920681, 32912393, 1633668], [13640378, 30811288, 5920681, 2097090, 5779787]],
  1: [[27397342, 27556981, 14686443, 36857725, 38330332], [6310256, 29465179, 14179987, 5920644, 4958774], [33776459, 12181619, 39333423, 37121074, 8954034], [15135087, 27397342, 36905236, 5836619, 1633668],
      [12261167, 9700895, 36905236, 5836619, 11712500], [19781592, 32291149, 6310256, 8954034, 27397342], [33917296, 5836619, 5920681, 32912393, 2097090], [13640378, 30811288, 31917730, 7931037, 5779787]],
  2: [[34429484, 1633668, 27556972, 2097090, 5779787], [34429484, 6310256, 5837188, 8364557, 1633668], [34429484, 12181619, 33776459, 2097090, 5779787], [34429484, 15135087, 1633668, 5779787, 2097090],
      [34429484, 12261167, 1633668, 2097090, 5779787], [34429484, 32291149, 1633668, 5779787, 2097090], [34429484, 33917296, 5836619, 2097090, 5779787], [34429484, 13640378, 1633668, 2097090, 5779787]],
  3: [[19524049, 36857725, 37121074, 27556981, 20300401], [19524049, 6310256, 29465179, 5920644, 33674417], [19524049, 33776459, 39333423, 37121074, 9501562], [19524049, 15135087, 36905236, 1633668, 32590852],
      [19524049, 12261167, 9700895, 2097090, 9501562], [19524049, 32291149, 14786461, 5779787, 9501562], [19524049, 33917296, 5836619, 1633668, 32590852], [19524049, 13640378, 30811288, 2097090, 9501562]],
  4: [[2337843, 12253092, 34321369, 36408393, 31917730], [37516560, 2337843, 12253092, 29465179, 5920644], [2337843, 33776459, 39333423, 34321369, 36408393], [2337843, 15135087, 12253092, 36905236, 34321369],
      [2337843, 12261167, 9700895, 34321369, 36408393], [2337843, 32291149, 12253092, 34321369, 36408393], [2337843, 33917296, 5836619, 12253092, 34321369], [2337843, 13640378, 30811288, 12253092, 34321369]],
};
const COCINA_IDX = { dom: 0, mex: 1, pr: 2, col: 3, sal: 4, hon: 5, ven: 6, cub: 7 };

// ── Horarios por subcategoría ──
const HORAS = [
  (r) => horario({ 0: rango("11:00", "18:00"), 1: rango("10:00", "20:00"), 2: rango("10:00", "20:00"), 3: rango("10:00", "20:00"), 4: rango("10:00", "20:00"), 5: rango("10:00", "21:00"), 6: rango("10:00", "21:00") }),
  (r) => horario({ 0: rango("10:00", "18:00"), 5: rango("16:00", "21:00"), 6: rango("10:00", "21:00") }),
  (r) => horario({ 0: rango("10:00", "14:00"), 1: rango("08:00", "16:00"), 2: rango("08:00", "16:00"), 3: rango("08:00", "16:00"), 4: rango("08:00", "16:00"), 5: rango("08:00", "14:00") }),
  (r) => horario({ 1: rango("09:00", "18:00"), 2: rango("09:00", "18:00"), 3: rango("09:00", "18:00"), 4: rango("09:00", "20:00"), 5: rango("09:00", "20:00"), 6: rango("09:00", "20:00") }),
  (r) => horario({ 1: rango("08:00", "18:00"), 2: rango("08:00", "18:00"), 3: rango("08:00", "18:00"), 4: rango("08:00", "18:00"), 5: rango("08:00", "18:00"), 6: rango("09:00", "17:00") }),
];

// ── Menú de cada subcategoría ──
const grupoDef = (k, cocina) => {
  if (k === "carne") return { n: GRUPOS.carne.n, req: true, max: 1, o: cocina.carne };
  return GRUPOS[k];
};
const item = (d, extra = {}) => ({ es: d.es, en: d.en, de: d.de, den: d.den, p: d.p, ph: d.ph, g: d.g, t: d.t, ...extra });

function menuCasera(c, r, ix) {
  const sec = (k) => c.platos.filter((x) => x.sec === k).map((x) => item(x));
  const out = [];
  const des = sec("des"), alm = sec("alm");
  if (des.length) out.push({ k: "des", n: SEC.des, avail: "own", av: { f: 420, t: 660, d: [0, 1, 2, 3, 4, 5, 6] }, items: des });
  const dia = alm.slice(0, Math.min(alm.length, 4)).map((x) => ({ ...x, p: Math.max(895, x.p - 200), de: `${x.de} Con bebida del día.`, den: `${x.den} With the drink of the day.` }));
  out.push({ k: "alm", n: ["Almuerzo del día", "Lunch special"], avail: "own", av: { f: 660, t: 960, d: [1, 2, 3, 4, 5] }, items: dia.map((x) => ({ ...x, es: x.es + " (almuerzo)", en: x.en + " (lunch)" })) });
  out.push({ k: "alm2", n: SEC.alm, avail: "siempre", items: alm });
  for (const k of ["sop", "ant", "lad", "pos", "beb"]) { const it = sec(k); if (it.length) out.push({ k, n: SEC[k], avail: "siempre", items: it }); }
  return out;
}
function menuFinde(c, r) {
  const sec = (k) => c.platos.filter((x) => x.sec === k).map((x) => item(x));
  const esp = c.platos.filter((x) => x.sec === "alm" || x.sec === "sop").slice(0, 5).map((x, i) => item(x, { p: x.p + 300, de: `${x.de} Solo sábado y domingo, hasta agotar.`, den: `${x.den} Saturday and Sunday only, while it lasts.`, stock: { mode: "qty", left: 6 + i * 3, par: 30 - i * 3 }, feat: i < 2 }));
  const out = [{ k: "esp", n: ["Especiales del fin de semana", "Weekend specials"], avail: "siempre", items: esp }];
  const alm = sec("alm").slice(3);
  if (alm.length) out.push({ k: "alm", n: SEC.alm, avail: "siempre", items: alm });
  for (const k of ["sop", "ant", "lad", "pos", "beb"]) { const it = sec(k); if (it.length) out.push({ k, n: SEC[k], avail: "siempre", items: it }); }
  return out;
}
const PLAN_G = { prot: { n: ["Proteína", "Protein"], req: true, max: 1, o: [["Pollo", "Chicken", 0], ["Res", "Beef", 150], ["Cerdo", "Pork", 100], ["Vegetariano", "Vegetarian", 0]] },
  porcion: { n: ["Porción", "Portion"], req: true, max: 1, o: [["Regular (500 g)", "Regular (500 g)", 0], ["Grande (700 g)", "Large (700 g)", 250], ["Fit (350 g)", "Fit (350 g)", -100]] },
  dias: { n: ["Días de entrega", "Delivery days"], req: true, max: 1, o: [["Lunes a viernes", "Monday to Friday", 0], ["Lunes, miércoles y viernes", "Mon, Wed and Fri", 0]] },
  base: { n: ["Base", "Base"], req: true, max: 1, o: [["Arroz blanco", "White rice", 0], ["Arroz integral", "Brown rice", 100], ["Ensalada", "Salad", 0], ["Verduras al vapor", "Steamed vegetables", 0]] } };
function menuPrep(c, r) {
  const alm = c.platos.filter((x) => x.sec === "alm").slice(0, 6);
  const nom = c.es;
  const planes = [
    { es: `Plan 5 almuerzos · cocina ${nom}`, en: `5-lunch plan · ${c.en} kitchen`, de: "Cinco almuerzos para la semana, listos para calentar. Se entrega o se recoge el domingo.", den: "Five lunches for the week, ready to heat. Delivered or picked up on Sunday.", p: 5495, ph: FOTOS.gen[0], g: ["prot", "porcion", "dias"], t: [], feat: true },
    { es: `Plan 10 almuerzos · cocina ${nom}`, en: `10-lunch plan · ${c.en} kitchen`, de: "Diez almuerzos: dos semanas o almuerzo y cena. Con 10 % menos por almuerzo.", den: "Ten lunches: two weeks or lunch and dinner. 10% less per meal.", p: 9995, ph: FOTOS.gen[1], g: ["prot", "porcion", "dias"], t: [] },
    { es: "Plan familiar · 4 personas, 5 días", en: "Family plan · 4 people, 5 days", de: "Veinte porciones para la semana, con dos acompañantes cada día.", den: "Twenty portions for the week, with two sides each day.", p: 17995, ph: FOTOS.gen[3], g: ["prot", "dias"], t: [] },
    { es: "Plan desayunos fit · 5 días", en: "Fit breakfast plan · 5 days", de: "Cinco desayunos de avena, huevo o yogur con fruta.", den: "Five breakfasts of oats, eggs or yogurt with fruit.", p: 3995, ph: FOTOS.gen[2], g: ["dias"], t: ["hue", "lac"] },
  ];
  const ind = alm.map((x) => item(x, { p: Math.round((x.p - 150) / 5) * 5, g: ["prot", "porcion"].concat(x.g.filter((y) => y === "salsa")), de: `${x.de} Porción para calentar en casa.`, den: `${x.den} Portion to heat at home.` }));
  const bowls = [
    { es: "Bowl de pollo con vegetales", en: "Chicken and vegetable bowl", de: "Pollo a la plancha, base a elegir, vegetales salteados.", den: "Grilled chicken, base of your choice, sautéed vegetables.", p: 1095, ph: FOTOS.gen[5], g: ["base"], t: [] },
    { es: "Bowl vegetariano de frijoles", en: "Bean vegetarian bowl", de: "Frijoles, arroz, aguacate y pico de gallo.", den: "Beans, rice, avocado and pico de gallo.", p: 995, ph: FOTOS.gen[4], g: ["base"], t: ["veg", "sg"] },
  ];
  const sn = [
    { es: "Jugo verde de la semana (6)", en: "Green juice of the week (6)", de: "Seis botellas de jugo prensado en frío.", den: "Six bottles of cold-pressed juice.", p: 2495, ph: 27518954, g: [], t: ["veg", "sg"] },
    { es: "Snack proteico: huevos duros (12)", en: "Protein snack: hard-boiled eggs (12)", de: "Una docena, listos para llevar.", den: "A dozen, ready to go.", p: 695, ph: 5779787, g: [], t: ["hue"] },
    { es: "Postre de la semana", en: "Dessert of the week", de: "Flan, tres leches o arroz con leche, porción individual.", den: "Flan, tres leches or rice pudding, single serving.", p: 450, ph: 9501562, g: [], t: ["lac", "hue"] },
  ];
  return [{ k: "plan", n: ["Planes de la semana", "Weekly plans"], avail: "siempre", items: planes }, { k: "ind", n: ["Almuerzos individuales", "Single lunches"], avail: "siempre", items: ind },
    { k: "bowl", n: ["Bowls", "Bowls"], avail: "siempre", items: bowls }, { k: "sn", n: ["Jugos y snacks", "Juices and snacks"], avail: "siempre", items: sn }];
}
const CHEF_G = { alerg: { n: ["Alergias o dieta", "Allergies or diet"], req: false, max: 3, o: [["Sin gluten", "Gluten-free", 0], ["Vegetariano", "Vegetarian", 0], ["Sin mariscos", "No shellfish", 0], ["Sin frutos secos", "No nuts", 0]] },
  serv: { n: ["Servicio", "Service"], req: false, max: 3, o: [["Mesero (4 h)", "Server (4 h)", 12000], ["Vajilla y cristalería", "Tableware and glassware", 6000], ["Maridaje de vinos", "Wine pairing", 4500]] },
  tiempos: { n: ["Tiempos", "Courses"], req: true, max: 1, o: [["3 tiempos", "3 courses", 0], ["5 tiempos", "5 courses", 3000]] } };
function menuChef(c, r) {
  const alm = c.platos.filter((x) => x.sec === "alm" || x.sec === "sop");
  const ex = [
    { es: "Cena privada para 2 · menú de autor", en: "Private dinner for 2 · chef's menu", de: `Cocina ${c.es} de autor en tu casa: compras, cocina, sirve y deja todo limpio. Precio por pareja.`, den: `${c.en} cuisine in your home: shopping, cooking, serving and cleanup. Price per couple.`, p: 16000, ph: 19524049, g: ["tiempos", "alerg", "serv"], t: [], feat: true },
    { es: "Menú degustación · por persona", en: "Tasting menu · per person", de: "Mínimo 6 personas. Cinco tiempos con un maridaje de la casa.", den: "Minimum 6 guests. Five courses with a house pairing.", p: 8500, ph: 19524049, g: ["alerg", "serv"], t: [] },
    { es: "Brunch privado · por persona", en: "Private brunch · per person", de: "Mínimo 4 personas. Platos de la casa y bebidas.", den: "Minimum 4 guests. House dishes and drinks.", p: 4500, ph: 15640157, g: ["alerg"], t: ["hue", "lac"] },
    { es: "Clase de cocina en casa · por persona", en: "In-home cooking class · per person", de: "Dos horas y media aprendiendo tres platos; comes lo que cocinas.", den: "Two and a half hours learning three dishes; you eat what you cook.", p: 6000, ph: 19524049, g: [], t: [] },
    { es: "Cena de cumpleaños o aniversario · por persona", en: "Birthday or anniversary dinner · per person", de: "Mínimo 8 personas. Entrada, plato fuerte y postre.", den: "Minimum 8 guests. Starter, main and dessert.", p: 5500, ph: 2097090, g: ["alerg", "serv"], t: [] },
  ];
  const ent = c.platos.filter((x) => x.sec === "ant").slice(0, 3).map((x) => item(x, { p: x.p + 800, de: `${x.de} Porción para compartir en mesa.`, den: `${x.den} Sharing portion for the table.` }));
  const pri = alm.slice(0, 5).map((x) => item(x, { p: x.p + 1500, g: x.g.filter((y) => y === "carne" || y === "arroz"), de: `${x.de} Emplatado de chef.`, den: `${x.den} Chef plating.` }));
  const pos = c.platos.filter((x) => x.sec === "pos").map((x) => item(x, { p: x.p + 500, de: `${x.de} Emplatado de restaurante.`, den: `${x.den} Restaurant plating.` }));
  return [{ k: "exp", n: ["Experiencias", "Experiences"], avail: "siempre", items: ex }, { k: "ent", n: ["Entradas", "Starters"], avail: "siempre", items: ent },
    { k: "pri", n: ["Platos fuertes", "Main courses"], avail: "siempre", items: pri }, { k: "pos", n: SEC.pos, avail: "siempre", items: pos }];
}
const CAT_G = { tam: { n: ["Tamaño de la bandeja", "Tray size"], req: true, max: 1, o: [["10 personas", "10 people", 0], ["25 personas", "25 people", 0]] }, serv: { n: ["Servicio", "Service"], req: false, max: 3, o: [["Entrega y montaje", "Delivery and setup", 7500], ["Mesero (4 h)", "Server (4 h)", 12000], ["Platos y cubiertos desechables", "Disposable plates and cutlery", 3500]] },
  tamp: { n: ["Invitados", "Guests"], req: true, max: 1, o: [["25 personas", "25 people", 0], ["50 personas", "50 people", 0], ["100 personas", "100 people", 0]] } };
function menuCatering(c, r) {
  const alm = c.platos.filter((x) => x.sec === "alm" || x.sec === "sop");
  const bandejas = alm.slice(0, 7).map((x, i) => ({ es: `${x.es} · bandeja`, en: `${x.en} · tray`, de: `${x.de} Rinde 10 personas la mediana y 25 la grande.`, den: `${x.den} Serves 10 (medium) or 25 (large).`, p: Math.round(x.p * 8 / 100) * 100 - 5, ph: x.ph, g: ["tam", "serv"], t: x.t, feat: i < 2, mult: true }));
  const paq = [
    { es: "Paquete Fiesta · 25 invitados", en: "Party package · 25 guests", de: "Dos platos fuertes, arroz, ensalada, postre y bebida. Entrega y montaje incluidos.", den: "Two mains, rice, salad, dessert and drink. Delivery and setup included.", p: 54900, ph: 2337843, g: ["serv"], t: [], feat: true },
    { es: "Paquete Boda y Quinceañera · 100 invitados", en: "Wedding and quinceañera package · 100 guests", de: "Tres platos fuertes, dos acompañantes, entremeses, postre, meseros y montaje.", den: "Three mains, two sides, starters, dessert, servers and setup.", p: 229900, ph: 12253092, g: ["serv"], t: [] },
    { es: "Paquete Oficina · almuerzos para 20", en: "Office package · lunches for 20", de: "Platos individuales empacados, con bebida; entrega puntual.", den: "Individually packed meals with a drink; on-time delivery.", p: 28900, ph: 34321369, g: [], t: [] },
    { es: "Buffet completo · por persona (mín. 40)", en: "Full buffet · per person (min. 40)", de: "Dos proteínas, tres acompañantes, ensalada y postre.", den: "Two proteins, three sides, salad and dessert.", p: 2395, ph: 36408393, g: ["serv"], t: [] },
  ];
  const ant = c.platos.filter((x) => x.sec === "ant").slice(0, 4).map((x) => item(x, { es: `${x.es} · docena`, en: `${x.en} · dozen`, p: Math.round(x.p * 2.6 / 5) * 5, de: `${x.de} Por docena, para entremeses.`, den: `${x.den} By the dozen, for starters.`, g: [] }));
  const pos = c.platos.filter((x) => x.sec === "pos").map((x) => item(x, { es: `${x.es} · bandeja de 12`, en: `${x.en} · tray of 12`, p: Math.round(x.p * 9 / 100) * 100 - 5, g: [], de: `${x.de} Porciones individuales.`, den: `${x.den} Single portions.` }));
  const beb = c.platos.filter((x) => x.sec === "beb").map((x) => item(x, { es: `${x.es} · dispensador 3 galones`, en: `${x.en} · 3-gallon dispenser`, p: 3900, g: [], de: "Rinde 30 vasos; con hielo.", den: "Serves 30 cups; with ice." }));
  return [{ k: "band", n: ["Bandejas", "Trays"], avail: "siempre", items: bandejas }, { k: "paq", n: ["Paquetes de evento", "Event packages"], avail: "siempre", items: paq },
    { k: "ant", n: ["Entremeses", "Starters"], avail: "siempre", items: ant }, { k: "pos", n: ["Postres", "Desserts"], avail: "siempre", items: pos }, { k: "beb", n: ["Bebidas", "Drinks"], avail: "siempre", items: beb }];
}
const MENUS = [menuCasera, menuFinde, menuPrep, menuChef, menuCatering];
const EXTRA_G = [{}, {}, PLAN_G, CHEF_G, CAT_G];

// ── Textos ──
const OWNER_ROLE = [["Dueña y cocinera", "Owner and cook"], ["Dueño y cocinero", "Owner and cook"]];
const ABOUT = [
  (n, c, f, o, st) => bi(`${n} cocina ${c.es} en casa desde ${f}. ${o} prepara todo cada mañana con sazón de familia: el almuerzo del día de lunes a viernes y los platos fuertes de siempre. Se recoge en ${st} o llega a tu puerta.`,
    `${n} has been cooking ${c.en} food at home since ${f}. ${o} prepares everything each morning with family seasoning: the weekday lunch special and the usual main dishes. Pick up on ${st} or have it delivered.`),
  (n, c, f, o, st) => bi(`Cocina ${c.es} solo de viernes a domingo, desde ${f}. ${o} y su familia cocinan en pequeñas tandas para que todo salga recién hecho; los especiales se acaban, así que pide con tiempo. Recoge en ${st}.`,
    `${c.en} cooking Friday to Sunday only, since ${f}. ${o} and family cook in small batches so everything comes fresh; the specials sell out, so order early. Pick up on ${st}.`),
  (n, c, f, o, st) => bi(`${n} prepara tu semana de comida ${c.es} desde ${f}: cinco o diez almuerzos listos para calentar, con porciones medidas y sin conservantes. ${o} cocina los domingos y entrega o se recoge en ${st}.`,
    `${n} prepares your week of ${c.en} meals since ${f}: five or ten lunches ready to heat, with measured portions and no preservatives. ${o} cooks on Sundays; delivery or pickup on ${st}.`),
  (n, c, f, o, st) => bi(`${o} lleva cocina ${c.es} de autor a tu mesa desde ${f}: cenas privadas, brunch, cumpleaños y clases de cocina en tu casa. Compra, cocina, sirve y deja todo limpio. Se reserva con una semana de anticipación.`,
    `${o} brings ${c.en} chef-driven cooking to your table since ${f}: private dinners, brunch, birthdays and in-home cooking classes. Shops, cooks, serves and cleans up. Book one week ahead.`),
  (n, c, f, o, st) => bi(`Banquetes y catering de cocina ${c.es} desde ${f}. ${o} y su equipo atienden bautizos, bodas, quinceañeras y oficinas: bandejas, paquetes por invitado y buffet con entrega y montaje. Cocina propia en ${st}.`,
    `${c.en} catering and banquets since ${f}. ${o} and the team serve baptisms, weddings, quinceañeras and offices: trays, per-guest packages and buffet with delivery and setup. Own kitchen on ${st}.`),
];
const FAQS = [
  (b, d) => [
    [bi("¿Hacen delivery?", "Do you deliver?"), bi(`Sí, hasta ${d.zone} millas por $${(d.fee / 100).toFixed(2)}. El pedido mínimo es de $${(d.min / 100).toFixed(0)}. También puedes recoger.`, `Yes, up to ${d.zone} miles for $${(d.fee / 100).toFixed(2)}. The minimum order is $${(d.min / 100).toFixed(0)}. You can also pick up.`)],
    [bi("¿Cuál es el almuerzo del día?", "What is the daily lunch special?"), bi("De lunes a viernes de 11 AM a 4 PM hay cuatro platos con bebida a precio de almuerzo. Míralo en el menú.", "Monday to Friday from 11 AM to 4 PM there are four dishes with a drink at lunch price. See the menu.")],
    [bi("¿Se puede pagar con tarjeta?", "Can I pay by card?"), bi("Sí, en la app y en el local. También aceptamos efectivo.", "Yes, in the app and in store. We also take cash.")],
    [bi("¿Tienen opciones sin gluten o vegetarianas?", "Do you have gluten-free or vegetarian options?"), bi("Varios acompañantes y platos van sin gluten o vegetarianos; mira las etiquetas del menú o pregúntanos.", "Several sides and dishes are gluten-free or vegetarian; check the menu tags or ask us.")],
    [bi("¿Cocinan por encargo para fiestas?", "Do you cook to order for parties?"), bi("Sí, con tres días de anticipación. Escríbenos por Mensajes.", "Yes, with three days' notice. Message us.")]],
  (b, d) => [
    [bi("¿Qué días abren?", "What days are you open?"), bi("Viernes por la tarde, sábado y domingo. Entre semana no cocinamos para vender.", "Friday evening, Saturday and Sunday. We do not cook to sell on weekdays.")],
    [bi("¿Los especiales se acaban?", "Do the specials sell out?"), bi("Sí. Cocinamos una cantidad fija cada fin de semana; en el menú ves cuántos quedan.", "Yes. We cook a fixed amount each weekend; the menu shows how many are left.")],
    [bi("¿Puedo encargar para el domingo?", "Can I order ahead for Sunday?"), bi("Claro. Programa tu pedido hasta con 6 días de anticipación.", "Of course. Schedule your order up to 6 days ahead.")],
    [bi("¿Hacen delivery?", "Do you deliver?"), bi(`Sábados y domingos, hasta ${d.zone} millas. El resto de los días no hay cocina.`, `Saturdays and Sundays, up to ${d.zone} miles. No kitchen on other days.`)],
    [bi("¿Cómo pago?", "How do I pay?"), bi("En la app con tarjeta o en el local con efectivo o tarjeta.", "In the app by card or in store with cash or card.")]],
  (b, d) => [
    [bi("¿Cómo funciona el plan semanal?", "How does the weekly plan work?"), bi("Eliges el plan, la proteína y la porción. Cocinamos el domingo; recoges o te lo entregamos ese mismo día, listo para calentar.", "You pick the plan, protein and portion. We cook on Sunday; pick up or delivery that day, ready to heat.")],
    [bi("¿Cuánto duran las comidas en el refrigerador?", "How long do the meals keep in the fridge?"), bi("Hasta 5 días en refrigerador y hasta 3 meses congeladas. Cada envase trae la fecha.", "Up to 5 days refrigerated and up to 3 months frozen. Each container has the date.")],
    [bi("¿Puedo cambiar o pausar mi semana?", "Can I change or pause my week?"), bi("Hasta el jueves antes de las 6 PM sin costo. Escríbenos por Mensajes.", "Until Thursday 6 PM at no cost. Message us.")],
    [bi("¿Hacen porciones fit o sin gluten?", "Do you do fit or gluten-free portions?"), bi("Sí: porción fit de 350 g y opciones sin gluten. Dinos tus alergias en el pedido.", "Yes: a 350 g fit portion and gluten-free options. Tell us your allergies in the order.")],
    [bi("¿Entregan?", "Do you deliver?"), bi(`Sí, el domingo, hasta ${d.zone} millas por $${(d.fee / 100).toFixed(2)}.`, `Yes, on Sunday, up to ${d.zone} miles for $${(d.fee / 100).toFixed(2)}.`)]],
  (b, d) => [
    [bi("¿Qué incluye una cena privada?", "What does a private dinner include?"), bi("Compras, cocina, servicio de mesa y limpieza al final. El precio es por pareja o por persona, según la experiencia.", "Shopping, cooking, table service and cleanup. The price is per couple or per person, depending on the experience.")],
    [bi("¿Con cuánta anticipación debo reservar?", "How far ahead should I book?"), bi("Con una semana; para fechas como Día de las Madres o Navidad, con un mes.", "One week; for dates like Mother's Day or Christmas, one month.")],
    [bi("¿Cocinan en mi casa?", "Do you cook in my home?"), bi(`Sí, dentro de ${d.zone} millas. Solo necesitamos una cocina funcional y una mesa.`, `Yes, within ${d.zone} miles. We only need a working kitchen and a table.`)],
    [bi("¿Manejan alergias y dietas?", "Do you handle allergies and diets?"), bi("Sí, las anotas al pedir y ajustamos el menú.", "Yes, note them when ordering and we adjust the menu.")],
    [bi("¿Cuándo se paga?", "When do I pay?"), bi("El pedido retiene el total en tu tarjeta y se cobra al terminar el servicio.", "The order holds the total on your card and it is charged after the service.")]],
  (b, d) => [
    [bi("¿Cuál es el pedido mínimo?", "What is the minimum order?"), bi(`$${(d.min / 100).toFixed(0)} y con tres días de anticipación; para bodas y quinceañeras, dos semanas.`, `$${(d.min / 100).toFixed(0)} with three days' notice; for weddings and quinceañeras, two weeks.`)],
    [bi("¿Incluyen montaje y meseros?", "Do you include setup and servers?"), bi("Son opcionales: entrega y montaje, meseros por 4 horas, y platos desechables. Los eliges al pedir.", "They are optional: delivery and setup, servers for 4 hours, and disposable plates. You pick them when ordering.")],
    [bi("¿Cuántas personas rinde una bandeja?", "How many people does a tray serve?"), bi("La mediana rinde 10 personas y la grande 25.", "The medium serves 10 people and the large 25.")],
    [bi("¿Hasta dónde llegan?", "How far do you deliver?"), bi(`Hasta ${d.zone} millas de nuestra cocina; más lejos se cotiza.`, `Up to ${d.zone} miles from our kitchen; further is quoted.`)],
    [bi("¿Cómo se paga?", "How do I pay?"), bi("Con tarjeta en la app (se retiene al pedir) o el saldo en efectivo el día del evento.", "By card in the app (held when you order) or the balance in cash on the event day.")]],
];

// ── Opciones, ajustes de entrega por subcategoría ──
const DELIV = [
  { pickup: true, delivery: true, zone: 3, fee: 399, min: 1500, prep: 20, free: 5000 },
  { pickup: true, delivery: true, zone: 5, fee: 499, min: 2500, prep: 25, free: 0 },
  { pickup: true, delivery: true, zone: 5, fee: 599, min: 3000, prep: 60, free: 8000 },
  { pickup: false, delivery: true, zone: 10, fee: 1500, min: 6000, prep: 120, free: 0 },
  { pickup: true, delivery: true, zone: 10, fee: 2500, min: 15000, prep: 120, free: 0 },
];
const FILTROS = [["delivery", "pickup", "menudia", "desayuno", "online"], ["pickup", "delivery", "finde", "online"], ["delivery", "pickup", "menudia", "online"], ["catering", "delivery", "online"], ["catering", "delivery", "pickup", "online"]];
const AMEN = [["para-llevar", "mesas-adentro", "acepta-tarjeta", "estacionamiento"], ["para-llevar", "acepta-tarjeta", "para-ninos"], ["para-llevar", "acepta-tarjeta", "wi-fi"], ["acepta-tarjeta", "catering", "accesible"], ["catering", "acepta-tarjeta", "estacionamiento", "accesible"]];

// ── Armado del negocio ──
function armarMenu(subIx, c, r) {
  const sections = MENUS[subIx](c, r, subIx);
  const defs = {};
  const need = new Set();
  sections.forEach((s) => s.items.forEach((it) => it.g.forEach((k) => need.add(k))));
  for (const k of need) defs[k] = EXTRA_G[subIx][k] ?? grupoDef(k, c);
  return { sections, defs };
}

function itemsPlanos(menu) {
  const out = [];
  for (const s of menu.sections) for (const it of s.items) out.push(it);
  return out;
}

function sqlMenu(menu, r, disp) {
  const flat = [];
  let sql = "";
  const usado = new Set();
  const gdef = (k) => { const d = menu.defs[k]; return d; };
  const ensure = (k) => {
    if (usado.has(k)) return "";
    usado.add(k);
    const d = gdef(k);
    return `  insert into option_groups (business_id, name, required, max_pick, options) values (b, ${j(bi(d.n[0], d.n[1]))}, ${d.req}, ${d.max}, ${j(d.o.map((o) => ({ es: o[0], en: o[1], cents: o[2], on: true })))}) returning id into gid;
  gk := gk || jsonb_build_object(${q(k)}, gid);
`;
  };
  menu.sections.forEach((s, si) => {
    sql += `  insert into item_sections (business_id, module, name, sort, avail, av) values (b, 'menu', ${j(bi(s.n[0], s.n[1]))}, ${si}, ${q(s.avail)}, ${s.av ? j(s.av) : "null"}) returning id into s;\n`;
    s.items.forEach((it, ii) => {
      for (const k of it.g) sql += ensure(k);
      const stock = it.stock ?? (r.chance(0.12) ? { mode: "day", left: r.int(4, 22), par: 24 } : { mode: "none", left: 0, par: 10 });
      const sold = r.chance(0.035);
      const ext = it.feat ?? (ii < 1 && r.chance(0.5));
      flat.push(it);
      it.ord = flat.length;
      sql += `  insert into items (business_id, module, section_id, name, descr, price_cents, photos, channels, sold_out, stock_mode, stock_left, stock_par, stock_day, tags, featured, avail, group_ids, sort)
    values (b, 'menu', s, ${j(bi(it.es, it.en))}, ${j(bi(it.de, it.den))}, ${it.p}, array[${q(photoUrl(it.ph))}]::text[], ${arr(disp.delivery ? (disp.pickup ? ["dlv", "pick"] : ["dlv"]) : ["pick"])}, ${sold}, ${q(stock.mode)}, ${stock.left}, ${stock.par}, (now() at time zone 'America/New_York')::date,
            ${arr(it.t.filter((x) => x !== "pica" || true))}, ${!!ext}, 'cat', array[${it.g.map((k) => `(gk->>${q(k)})::bigint`).join(", ")}]::bigint[], ${ii});\n`;
    });
  });
  return { sql, flat };
}

const NOTAS = ["Sin cebolla, por favor.", "Bien caliente, que voy llegando.", "Toque en la puerta de atrás.", "Poquito picante.", "Sin sal en el arroz.", "Con servilletas extra.", "Es para un cumpleaños, gracias.", "Leave at the door, please.", "No onions please.", "Extra sauce on the side."];
const ESTADOS_MALOS = [["cancelled", "user", "Me equivoqué de pedido."], ["cancelled", "business", "Se nos acabó un ingrediente."], ["declined", null, null], ["expired", null, null]];

function genOrdenes(r, b, menu, flat, disp, subIx, nOps, base) {
  const maxD = maxDiasDe(b.founded);
  const hoursDef = b.hours;
  const pop = flat.map((it, i) => ({ it, w: (it.feat ? 3 : 1) * (it.p < 1600 ? 2 : 1) * (it.es.includes("(almuerzo)") ? 1.5 : 1) }));
  const wsum = pop.reduce((s, x) => s + x.w, 0);
  const pickItem = () => { let u = r() * wsum; for (const x of pop) { u -= x.w; if (u <= 0) return x.it; } return pop[0].it; };
  const ops = [];
  const regulares = Array.from({ length: 36 }, () => r.int(0, 246));
  for (let k = 0; k < nOps; k++) {
    // día (recientes más), en un día en que el negocio abre
    let d = k < 22 ? r.int(0, 29) : dias(r, maxD), h, tries = 0;
    while (tries++ < 14) {
      const wd = ((new Date(Date.UTC(2026, 10, 17)).getUTCDay() - d) % 7 + 7) % 7;
      h = hoursDef[wd];
      if (h.open) break;
      d += 1;
    }
    const rg = h.ranges[0];
    const [o0, o1] = [rg[0], rg[1]].map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)));
    const m = r.int(o0 + 20, Math.max(o0 + 21, o1 - 40));
    const u = r.chance(0.55) ? r.pick(regulares) : r.int(0, 246);
    const delivery = disp.delivery && (!disp.pickup || r.chance(subIx === 3 || subIx === 4 ? 0.75 : 0.4));
    const nLines = subIx === 4 ? r.int(1, 3) : r.int(1, 4);
    const L = [];
    const usados = new Set();
    for (let l = 0; l < nLines; l++) {
      const it = pickItem();
      if (usados.has(it.ord)) continue;
      usados.add(it.ord);
      const ops2 = [];
      let unit = it.p;
      for (const gk of it.g) {
        const gd = menu.defs[gk];
        if (!gd.req && !r.chance(0.28)) continue;
        const picks = gd.req ? 1 : r.int(1, Math.min(gd.max, 2));
        const pool = r.shuffle(gd.o.map((o, ix) => ix)).slice(0, picks);
        for (const ix of pool) { const o = gd.o[ix]; unit += o[2]; ops2.push({ g: { es: gd.n[0], en: gd.n[1] }, o: { es: o[0], en: o[1] } }); }
      }
      const qty = subIx === 4 ? r.pick([1, 1, 1, 2, 2, 3]) : subIx === 3 ? r.pick([1, 1, 2, 2, 4]) : r.pick([1, 1, 1, 1, 2, 2, 3]);
      L.push([it.ord, qty, unit, 6, ops2, r.chance(0.07) ? r.pick(["Bien cocido", "Sin picante", "Cortado en cuatro", "Extra salsa"]) : null]);
    }
    const sub = L.reduce((s, x) => s + x[1] * x[2], 0), tax = Math.round(L.reduce((s, x) => s + (x[1] * x[2] * 6) / 100, 0));
    const dlv = delivery ? (disp.free && sub >= disp.free ? 0 : disp.fee) : 0;
    const tip = delivery && r.chance(0.55) ? Math.round((sub * r.pick([0.15, 0.18, 0.2])) / 5) * 5 : 0;
    const tot = sub + tax + dlv + tip;
    const recent = d < 400;
    const pm = r.weighted([[recent ? "a" : "l", 55], ["l", 30], [delivery ? "e" : "l", 15]]);
    const pmode = delivery && pm === "l" ? "e" : pm;
    const bad = r.chance(0.07) ? r.pick(ESTADOS_MALOS) : null;
    const op = { q: base + k, n: String(5000000 + base + k), d, m, u, mo: delivery ? "d" : "p", pm: pmode, st: bad ? bad[0] : "done", sub, tax, dlv, tip, tot, L, prep: Math.max(10, disp.prep + r.int(-6, 10)) };
    if (bad && bad[1]) { op.cb = bad[1]; op.cr = bad[2]; }
    if (r.chance(0.12)) op.nt = r.pick(NOTAS);
    if (delivery) op.det = { to: { label: "casa", street: `${r.int(2, 98) * 10 + 1} ${r.pick(["N Church St", "W 4th St", "Maple Ave", "Oak St", "Linden St", "Main St", "Park Ave"])}`, apt: r.chance(0.3) ? `Apt ${r.int(1, 12)}` : null, zip: b.addr.zip, mi: +(r.int(3, disp.zone * 10) / 10).toFixed(1) }, drop: { drop: "mano", at: [], note: "" } };
    else op.det = { address: b.addr.text, pickupNote: { es: "Pide en la caja con tu número de pedido.", en: "Ask at the register with your order number." } };
    if (pmode === "a") { op.br = r.pick(["visa", "visa", "mastercard", "amex"]); op.l4 = r.pick(["4242", "4444", "0005", "1881", "9424"]); }
    ops.push(op);
  }
  // Pedidos programados que vienen (1 a 3): confirmados, con hora en el futuro.
  const fut = r.int(1, 3);
  for (let k = 0; k < fut; k++) {
    const base2 = ops.length;
    const it = pickItem();
    const unit = it.p, qty = r.int(1, 3), sub = unit * qty, tax = Math.round(sub * 0.06), dlv = 0;
    ops.push({ q: base + base2, n: String(5000000 + base + base2), d: 0, m: 720, fut: r.int(180, 2600), u: r.int(0, 246), mo: "p", pm: "l", st: "confirmed", sub, tax, dlv, tip: 0, tot: sub + tax, prep: disp.prep,
      L: [[it.ord, qty, unit, 6, [], null]], det: { address: b.addr.text, pickupNote: { es: "Pide en la caja con tu número de pedido.", en: "Ask at the register with your order number." } } });
  }
  return ops;
}

// ── Reseñas ──
const RES_ES5 = [
  "La {d} estaba riquísima, con el sazón de casa. {x}", "Pedí {d} y llegó calientito y en su punto. {x}", "Increíble la {d}; se nota que cocinan con cariño. {x}", "Todo fresco y bien sazonado, la {d} es lo mejor. {x}",
  "Porciones generosas y buen precio. Repetimos la {d}. {x}", "Hacía años que no probaba una {d} así. {x}", "La {d} sabe a la cocina de mi mamá. {x}", "Pedido perfecto: la {d} y todo lo demás. {x}",
];
const RES_ES4 = ["Muy buena la {d}, aunque tardó un poquito. {x}", "Rica la {d} y buen servicio; le subiría la sal. {x}", "Buena comida y buen precio, la {d} cumple. {x}", "La {d} estaba sabrosa. Me gustaría ver más opciones. {x}"];
const RES_ES3 = ["La {d} estaba bien, pero llegó tibia. {x}", "Demoró más de lo prometido, aunque la comida estaba buena. {x}", "La porción de {d} me pareció pequeña para el precio. {x}"];
const RES_ES2 = ["La {d} llegó fría y tarde. {x}", "Esperaba más de la {d}; le faltó sazón y llegó tarde. {x}", "Faltó una parte del pedido y tuve que llamar. {x}"];
const X_ES5 = ["Atención muy amable.", "Entrega puntual.", "Ya somos clientes de hace años.", "Lo recomiendo con los ojos cerrados.", "Volvemos el próximo fin de semana.", "Gracias por tanto cariño.", "Se lo recomendé a toda la familia."];
const X_ES3 = ["Espero que mejoren.", "Les doy otra oportunidad.", "El trato sí fue amable."];
const RES_EN5 = ["The {d} was delicious, tastes like home. {x}", "I ordered the {d} and it arrived hot and perfect. {x}", "Incredible {d}; you can tell they cook with love. {x}", "Fresh and well seasoned, the {d} is the best. {x}", "Generous portions and a fair price. We reorder the {d}. {x}"];
const RES_EN4 = ["Very good {d}, though it took a little while. {x}", "Tasty {d} and good service. {x}"];
const RES_EN3 = ["The {d} was fine but arrived lukewarm. {x}", "It took longer than promised, though the food was good. {x}"];
const RES_EN2 = ["The {d} arrived cold and late. {x}", "Part of my order was missing and I had to call. {x}"];
const X_EN5 = ["Very friendly service.", "On-time delivery.", "We have been customers for years.", "Highly recommend.", "We will be back next weekend."];
const X_EN3 = ["Hope they improve.", "I will give them another try."];
const REPLY_ES5 = ["Gracias por tu reseña. Te esperamos pronto.", "Un gusto atenderte. ¡Buen provecho!", "Gracias por tus palabras; se las paso al equipo.", "Gracias por la confianza. Vuelve cuando quieras."];
const REPLY_ES3 = ["Gracias por avisarnos. Lamentamos la demora; ya ajustamos los tiempos. Te invitamos a probar de nuevo.", "Tienes razón y lo estamos corrigiendo. Escríbenos y te lo compensamos en tu próximo pedido.", "Gracias por tu honestidad. Tomamos nota para mejorar el servicio."];
const REPLY_EN5 = ["Thank you for your review. See you soon.", "Our pleasure. Enjoy!", "Thanks for the kind words; we will pass them on to the team."];
const REPLY_EN3 = ["Thank you for telling us. We are sorry for the delay and have adjusted our times. Please try us again.", "You are right and we are fixing it. Message us and we will make it up on your next order."];
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");

function genResenas(r, b, ops, flat, nRev) {
  const hechas = ops.filter((o) => o.st === "done");
  // un reseñista por persona: la operación más reciente de cada cliente
  const porU = new Map();
  for (const o of hechas.sort((a, b2) => a.d - b2.d)) if (!porU.has(o.u)) porU.set(o.u, o);
  const cand = r.shuffle([...porU.values()]).slice(0, nRev);
  const out = [];
  for (const o of cand) {
    const s = estrellas(r);
    const en = r.chance(0.28);
    const ln = o.L.map((x) => flat[x[0] - 1]).filter(Boolean);
    const dish = (en ? ln[0]?.en : ln[0]?.es) ?? "comida";
    const dishN = en ? dish : dish.replace(/ \(almuerzo\)$/, "");
    const pool = en ? (s >= 5 ? RES_EN5 : s === 4 ? RES_EN4 : s === 3 ? RES_EN3 : RES_EN2) : (s >= 5 ? RES_ES5 : s === 4 ? RES_ES4 : s === 3 ? RES_ES3 : RES_ES2);
    const xs = en ? (s >= 4 ? X_EN5 : X_EN3) : (s >= 4 ? X_ES5 : X_ES3);
    const body = fmt(r.pick(pool), { d: dishN.toLowerCase().startsWith("la ") ? dishN : dishN, x: r.pick(xs) }).trim();
    const asw = s >= 5 ? { taste: 1, hot: 1, val: r.pick([1, 1, 0]) } : s === 4 ? { taste: 1, hot: r.pick([1, 0]), val: r.pick([1, 0]) } : s === 3 ? { taste: 0, hot: r.pick([0, -1]), val: 0 } : { taste: -1, hot: -1, val: r.pick([0, -1]) };
    const rv = { o: o.q, s, l: en ? "en" : "es", b: body.length < 22 ? body + " Todo muy bien." : body, a: asw, src: o.mo === "d" ? "dl" : "pk", d: r.int(0, 3), rc: o.L.slice(0, 2).map((x) => x[0]), h: r.chance(0.3) ? r.int(1, 7) : 0 };
    if (o.mo === "d") rv.f = { late: s >= 4 ? r.int(-8, 4) : r.int(8, 30) };
    if (s <= 3 || r.chance(0.42)) { rv.r = r.pick(s <= 3 ? (en ? REPLY_EN3 : REPLY_ES3) : (en ? REPLY_EN5 : REPLY_ES5)); rv.rl = en ? "en" : "es"; }
    out.push(rv);
  }
  return out;
}

// ── Novedades ──
function genNovedades(r, b, flat, subIx, c) {
  const P = [];
  const caros = flat.filter((x) => x.p >= 900 && x.p < 4000);
  const o1 = r.pick(caros), o2 = r.pick(caros), o3 = r.pick(flat);
  const rebaja = (x) => Math.round((x.p * r.pick([0.8, 0.85, 0.9])) / 5) * 5;
  P.push({ k: "oferta", t: `${o1.es} a ${money(rebaja(o1))} hoy`.slice(0, 60), b: "Hasta agotar. Pídelo en la app.", d: 1, pin: true, it: o1.ord, was: o1.p, now: rebaja(o1), v: r.int(6, 40) });
  P.push({ k: "hoy", t: `Hoy hay ${o2.es}`.slice(0, 60), b: "Recién hecho esta mañana. Son pocas porciones.", d: 0, it: o2.ord, v: r.int(4, 30) });
  P.push({ k: "encuesta", t: "¿Qué cocinamos esta semana?", b: "Vota y cocinamos el más pedido.", d: 5, e: 24 * 4, poll: r.shuffle(flat.filter((x) => x.p >= 900)).slice(0, 3).map((x) => x.es.slice(0, 40)), v: r.int(8, 30) });
  const dt = new Date(Date.UTC(2026, 10, 17 + r.int(8, 15))), dnames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  P.push({ k: "aviso", t: `El ${dnames[dt.getUTCDay()]} ${dt.getUTCDate()} de ${MES_ES[dt.getUTCMonth()]} cerramos temprano`.slice(0, 60), b: "Gracias por entender.", d: 2, e: 24 * 14, av: { day: `${dnames[dt.getUTCDay()][0].toUpperCase()}${dnames[dt.getUTCDay()].slice(1)} ${dt.getUTCDate()} ${MES_ES[dt.getUTCMonth()].slice(0, 3)}`, hrs: "early", hrsT: "9 AM – 3 PM" }, v: r.int(2, 14) });
  P.push({ k: "cupon", t: "Cupón de seguidores: $5 en tu pedido", b: "Para quien nos sigue: $5 de descuento en pedidos desde $25.", d: 3, e: 24 * 20, cc: `SEGUIR${5 + (b.n % 5)}`, co: 500, cm: 2500, cu: 100, au: "fol", v: r.int(4, 22) });
  P.push({ k: "novedad", t: `Cumplimos ${2026 - b.founded} años en ${b.addr.text.split(", ")[1].replace(" PA", "")}`.slice(0, 60), b: `Gracias a cada familia que nos eligió desde ${b.founded}. Seguimos cocinando igual.`, d: 20 + r.int(0, 30), e: 24 * 30, v: r.int(10, 60) });
  P.push({ k: "novedad", t: ["Ahora aceptamos pedidos programados", "Nuevo horario de fin de semana", "Estrenamos empaques que mantienen el calor", "Ya hacemos delivery más lejos"][b.n % 4], b: "Programa tu pedido con hasta 6 días de anticipación desde la app.", d: 60 + r.int(0, 80), e: 24 * 20, v: r.int(8, 40) });
  P.push({ k: "oferta", t: `${o3.es} con descuento de temporada`.slice(0, 60), b: "Oferta de otro mes, ya terminada.", d: 140 + r.int(0, 300), e: 24 * 5, it: o3.ord, was: o3.p, now: rebaja(o3), v: r.int(3, 20) });
  P.push({ k: "novedad", t: "Reconocimiento a nuestros clientes más fieles", b: "Entre todos nuestros seguidores del año sorteamos un almuerzo para la familia.", d: 300 + r.int(0, 600), e: 24 * 7, v: r.int(5, 30) });
  return P;
}

export function generarFood() {
  const negocios = [];
  let baseOps = 0;
  for (let si = 0; si < 5; si++) {
    for (let k = 0; k < 10; k++) {
      const [name, ck] = NOMBRES[si][k];
      const c = COCINAS[ck];
      const city = ciudadDe(si, k);
      const r = rng(`food:${name}`);
      const founded = anioFundado(r);
      const menu = armarMenu(si, c, r);
      const n = siguiente();
      const disp = { ...DELIV[si], pay_card: true };
      const stDir = null;
      const fotoSet = FOTOS_NEGOCIO[si][COCINA_IDX[ck]];
      const own = null;
      const filter = [...FILTROS[si]];
      if (founded <= 2016) filter.push("y10");
      const hours = HORAS[si](r);
      const bz = armar({
        n, cat: "NEG-FOOD", name, subs: [SUBS[si], c.sub], city, founded, street: undefined,
        about: null, attrs: null, filter, mods: ["menu", "pedidos", "nov", "staff"], amenities: AMEN[si], hours, photoIds: fotoSet, faqs: [],
        role: bi("Dueño y cocinero", "Owner and cook"), bio: null, team: [],
      });
      bz.about = ABOUT[si](name, c, founded, bz.owner.first, bz.addr.street);
      const ownerFirst = bz.owner.first;
      bz.owner.role = FIRST_FEM(ownerFirst) ? bi("Dueña y cocinera", "Owner and cook") : bi("Dueño y cocinero", "Owner and cook");
      bz.owner.bio = bi(`${ownerFirst} cocina ${c.es} desde ${founded}. Todo sale de su cocina, con recetas de familia.`, `${ownerFirst} has cooked ${c.en} food since ${founded}. Everything comes out of the kitchen, from family recipes.`);
      bz.team = EQUIPO(si, r, founded);
      bz.faqs = FAQS[si](bz, disp).map(([qq, a]) => ({ q: qq, a }));
      bz.disp = disp; bz.si = si; bz.cocina = ck;
      // menú → SQL, ítems planos
      const { sql: sqlItems, flat } = sqlMenu(menu, r, disp);
      bz.menu = menu; bz.flat = flat;
      // tarjeta (ficha y buscador)
      const eta = disp.pickup ? `Pickup ${disp.prep} min` : `Delivery ${disp.prep} min`;
      const fee = disp.delivery ? `Delivery $${(disp.fee / 100).toFixed(2).replace(/\.00$/, "")}` : null;
      const posts = genNovedades(r, bz, flat, si, c);
      const of = posts[0];
      bz.attrs = { tarjeta: { eta: bi(eta, eta), ...(fee ? { fee: bi(fee, fee) } : {}), offer: bi(`${of.t.replace(/ hoy$/, "")}, hasta agotar`, `${flat.find((x) => x.ord === of.it).en} ${money(of.now)}, while it lasts`) } };
      bz.sqlExtra = `  insert into delivery_settings (business_id, pickup, delivery, prep_min, scheduled_orders, auto_accept, pay_card, pay_cash_pickup, pay_cash_delivery, ask_tip, zone_mi, fee_cents, free_over_cents, min_order_cents, travel_min, who, pickup_note, proof)
  values (b, ${disp.pickup}, ${disp.delivery}, ${disp.prep}, true, ${si === 0 || si === 2}, true, true, ${si < 2}, true, ${disp.zone}, ${disp.fee}, ${disp.free}, ${disp.min}, ${disp.zone <= 3 ? 10 : disp.zone <= 5 ? 15 : 20}, 'team', ${j(bi("Pide en la caja con tu número de pedido.", "Ask at the register with your order number."))}, false) on conflict (business_id) do nothing;
  insert into menu_settings (business_id, last_min, busy_min, low_alert) values (b, 15, 0, 3) on conflict (business_id) do nothing;
${sqlItems}`;
      const nOps = [() => r.int(130, 330), () => r.int(70, 190), () => r.int(100, 240), () => r.int(40, 120), () => r.int(50, 150)][si]();
      const ops = genOrdenes(r, bz, menu, flat, disp, si, nOps, baseOps);
      baseOps += ops.length + 5;
      bz.hist = { ops, reviews: genResenas(r, bz, ops, flat, Math.min(80, Math.max(20, Math.round(ops.filter((o) => o.st === "done").length * r.pick([0.22, 0.28, 0.34]))))), posts };
      negocios.push(bz);
    }
  }
  return negocios;
}
const FIRST_FEM = (n) => /a$|^(Carmen|Luz|Mercedes|Inés|Dolores|Beatriz|Isabel)$/.test(n) && !/^(José|Jesús)$/.test(n);
const ROLES_EQ = [["Cocina", "Kitchen"], ["Caja y mostrador", "Register and counter"], ["Delivery", "Delivery driver"], ["Ayudante de cocina", "Kitchen helper"], ["Atención y pedidos", "Orders and service"], ["Repostería", "Pastry"], ["Servicio y montaje", "Service and setup"], ["Sous chef", "Sous chef"]];
function EQUIPO(si, r, founded) {
  const nombres = r.shuffle(["Anyelina", "Yoel", "Kimberly", "Josué", "Marcela", "Elvis", "Nathalie", "Brayan", "Lisbeth", "Darwin", "Yuleisy", "Franklin"]);
  const roles = si === 3 ? [7, 6] : si === 4 ? [6, 0, 2] : si === 2 ? [0, 4] : [0, 1, 2];
  return roles.slice(0, r.int(1, 3)).map((ri, i) => ({ name: `${nombres[i]} ${r.pick(["Cruz", "Mejía", "Peña", "Rosario", "Santana", "Díaz", "Ortega"])}`, role: bi(ROLES_EQ[ri][0], ROLES_EQ[ri][1]), since: Math.min(2025, founded + r.int(1, 6)) }));
}
