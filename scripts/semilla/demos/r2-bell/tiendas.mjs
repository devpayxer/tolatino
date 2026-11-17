/* Ronda 2 · NEG-BELL · las 3 subcategorías de TIENDA (37 vitaminas y suplementos · 38 productos naturales y herbales · 39 tienda de productos de belleza).
   Usan las piezas de la ronda 1 del grupo A (apartado: a/negocio.mjs, a/textos.mjs, a/sql.mjs) con catálogo de producto completo, existencias,
   apartados (recoger y pagar en la caja) y su historia. Sin marcas reales; sin promesas de salud: solo descripción del producto. */
import { rng, bi, money, horario, rango } from "../a/comun.mjs";
import { armar, ciudadDe, anioFundado, dias, maxDiasDe } from "../a/negocio.mjs";
import { genResenas, genNovedades } from "../a/textos.mjs";
import { fotosDe, conTam } from "../b/comun.mjs";

const CAT = "NEG-BELL";
/* [sección es, en, [[es, en, centavos, descripción es, en, impuesto %]]] */
const P = (es, en, p, de = "", dn = "", tax = 0) => [es, en, p, de, dn, tax];

const SUBS = [
  { sub: "NEG-BELL-37", tipo: "vit", nombres: ["Vitaminas La Fuente", "Naturalmente Vitaminas Latino", "Suplementos Vida y Fuerza", "Tienda de Vitaminas Sol", "Vitamina Plus Mercado", "Nutri Tienda Esperanza", "Suplementos El Roble", "Vitaminas y Más Dalila", "Centro de Suplementos Aura", "Tienda Vital Latina"],
    secs: [
      ["Vitaminas", "Vitamins", [P("Vitamina C 500 mg (100 tabletas)", "Vitamin C 500 mg (100 tablets)", 1200, "Frasco con 100 tabletas.", "Bottle of 100 tablets."), P("Vitamina D3 1000 UI (120 cápsulas)", "Vitamin D3 1000 IU (120 softgels)", 1400, "Cápsulas blandas.", "Softgels."), P("Multivitamínico para adultos (90 tabletas)", "Adult multivitamin (90 tablets)", 1800, "Una al día.", "One a day."), P("Multivitamínico para mujeres (60 tabletas)", "Women's multivitamin (60 tablets)", 2000, "", ""), P("Multivitamínico para hombres (60 tabletas)", "Men's multivitamin (60 tablets)", 2000, "", ""), P("Complejo B (100 tabletas)", "B-complex (100 tablets)", 1300, "", ""), P("Vitamina E 400 UI (60 cápsulas)", "Vitamin E 400 IU (60 softgels)", 1500, "", ""), P("Vitamina B12 1000 mcg (100 tabletas)", "Vitamin B12 1000 mcg (100 tablets)", 1100, "", "")]],
      ["Minerales", "Minerals", [P("Calcio con vitamina D (120 tabletas)", "Calcium with vitamin D (120 tablets)", 1400, "", ""), P("Magnesio 400 mg (100 tabletas)", "Magnesium 400 mg (100 tablets)", 1300, "", ""), P("Zinc 50 mg (100 tabletas)", "Zinc 50 mg (100 tablets)", 900, "", ""), P("Hierro 65 mg (100 tabletas)", "Iron 65 mg (100 tablets)", 1000, "", ""), P("Potasio 99 mg (100 tabletas)", "Potassium 99 mg (100 tablets)", 900, "", "")]],
      ["Aceites y omega", "Oils and omega", [P("Omega-3 (120 cápsulas)", "Omega-3 (120 softgels)", 2200, "Aceite de pescado.", "Fish oil."), P("Aceite de linaza (90 cápsulas)", "Flaxseed oil (90 softgels)", 1600, "", ""), P("Aceite de coco orgánico (16 oz)", "Organic coconut oil (16 oz)", 1500, "Para cocinar o para el cuerpo.", "For cooking or body use."), P("Aceite de oliva extra virgen (17 oz)", "Extra virgin olive oil (17 oz)", 1400, "", "")]],
      ["Proteínas y energía", "Protein and energy", [P("Proteína en polvo, vainilla (2 lb)", "Protein powder, vanilla (2 lb)", 3400, "", ""), P("Proteína en polvo, chocolate (2 lb)", "Protein powder, chocolate (2 lb)", 3400, "", ""), P("Barras de proteína (caja de 12)", "Protein bars (box of 12)", 2400, "", ""), P("Creatina monohidratada (300 g)", "Creatine monohydrate (300 g)", 2600, "", ""), P("Colágeno en polvo (14 oz)", "Collagen powder (14 oz)", 2800, "", "")]],
      ["Para niños", "For kids", [P("Gomitas multivitamínicas para niños (60)", "Kids' multivitamin gummies (60)", 1400, "Para mayores de 4 años; guárdalas fuera del alcance de los niños.", "For ages 4 and up; store out of reach of children."), P("Vitamina D en gotas para bebé", "Vitamin D drops for infants", 1200, "", "")]],
      ["Accesorios", "Accessories", [P("Pastillero semanal", "Weekly pill organizer", 500, "", "", 6), P("Licuadora portátil para batidos", "Portable shaker bottle", 900, "", "", 6), P("Cortador de pastillas", "Pill cutter", 600, "", "", 6)]],
    ],
    about: [(n, o, f, st) => bi(`${n} lleva vitaminas y suplementos en ${st} desde ${f}. ${o} te ayuda a leer etiquetas y a comparar. No damos consejos médicos: si tomas medicamentos o tienes una condición, pregunta primero a tu médico o farmacéutico.`, `${n} has carried vitamins and supplements on ${st} since ${f}. ${o} helps you read labels and compare. We do not give medical advice: if you take medication or have a condition, ask your doctor or pharmacist first.`),
      (n, o, f, st) => bi(`En ${st} desde ${f}: vitaminas, minerales, proteínas y aceites. Aparta en la app, paga en la caja cuando pases. ${o} atiende en español e inglés.`, `On ${st} since ${f}: vitamins, minerals, proteins and oils. Hold in the app, pay at the register when you stop by. ${o} serves you in Spanish and English.`)],
    faq: [[bi("¿Me pueden recomendar qué tomar?", "Can you recommend what to take?"), bi("No damos consejos médicos. Te ayudamos a leer etiquetas; para saber qué te conviene, habla con tu médico o farmacéutico.", "We do not give medical advice. We help you read labels; to know what suits you, talk to your doctor or pharmacist.")],
      [bi("¿Cómo vencen los productos?", "How do expiration dates work?"), bi("Todo se vende con fecha de vencimiento vigente; si algo llega vencido, lo cambiamos.", "Everything is sold with a valid expiration date; if something is expired, we replace it.")]] },
  { sub: "NEG-BELL-38", tipo: "herb", nombres: ["Hierbas del Campo", "Botánica Raíces Vivas", "Productos Naturales Santa Rosa", "Herbolario La Abuela", "Naturaleza Viva Tienda", "Botánica Don Eusebio", "Tienda Natural Manantial", "Hierbas y Tés Doña Chela", "Raíces y Remedios Caseros Tienda", "Naturista El Girasol"],
    secs: [
      ["Tés e infusiones", "Teas and infusions", [P("Té de manzanilla (20 bolsitas)", "Chamomile tea (20 bags)", 500, "Infusión de flor de manzanilla.", "Chamomile flower infusion."), P("Té de menta (20 bolsitas)", "Mint tea (20 bags)", 500, "", ""), P("Té de jengibre y limón (20 bolsitas)", "Ginger and lemon tea (20 bags)", 600, "", ""), P("Té de hibisco (jamaica) en flor (4 oz)", "Hibiscus (jamaica) flowers (4 oz)", 700, "", ""), P("Té de tilo (20 bolsitas)", "Linden tea (20 bags)", 600, "", ""), P("Mezcla de té para la noche (20 bolsitas)", "Evening tea blend (20 bags)", 700, "", ""), P("Té verde (25 bolsitas)", "Green tea (25 bags)", 600, "", "")]],
      ["Hierbas secas", "Dried herbs", [P("Hierbabuena seca (2 oz)", "Dried spearmint (2 oz)", 400, "", ""), P("Orégano seco (2 oz)", "Dried oregano (2 oz)", 400, "", ""), P("Ruda seca (1 oz)", "Dried rue (1 oz)", 400, "Uso tradicional.", "Traditional use."), P("Canela en rama (3 oz)", "Cinnamon sticks (3 oz)", 500, "", ""), P("Flor de azahar (1 oz)", "Orange blossom (1 oz)", 600, "", ""), P("Anís estrella (2 oz)", "Star anise (2 oz)", 500, "", ""), P("Manzanilla en flor (2 oz)", "Chamomile flowers (2 oz)", 500, "", "")]],
      ["Aceites y ungüentos", "Oils and balms", [P("Aceite de coco virgen (16 oz)", "Virgin coconut oil (16 oz)", 1200, "Para cocinar o el cuidado de la piel.", "For cooking or skin care."), P("Aceite de ricino (8 oz)", "Castor oil (8 oz)", 900, "", "", 6), P("Gel de sábila (aloe) (12 oz)", "Aloe vera gel (12 oz)", 800, "Para después del sol.", "For after the sun.", 6), P("Ungüento de caléndula (2 oz)", "Calendula balm (2 oz)", 900, "", "", 6), P("Aceite de almendras dulces (8 oz)", "Sweet almond oil (8 oz)", 1100, "", "", 6)]],
      ["Semillas y granos", "Seeds and grains", [P("Semillas de linaza (16 oz)", "Flaxseed (16 oz)", 600, "", ""), P("Semillas de chía (12 oz)", "Chia seeds (12 oz)", 900, "", ""), P("Avena en hojuelas (24 oz)", "Rolled oats (24 oz)", 500, "", ""), P("Miel de abeja pura (12 oz)", "Pure honey (12 oz)", 1000, "", ""), P("Polen de abeja (8 oz)", "Bee pollen (8 oz)", 1400, "", "")]],
      ["Velas y aromas", "Candles and aromas", [P("Vela aromática de lavanda", "Lavender scented candle", 900, "", "", 6), P("Incienso natural (20 varitas)", "Natural incense (20 sticks)", 500, "", "", 6), P("Aceite esencial de lavanda (0.5 oz)", "Lavender essential oil (0.5 oz)", 1200, "Solo para aromas; no ingerir.", "For aroma only; do not ingest.", 6), P("Aceite esencial de eucalipto (0.5 oz)", "Eucalyptus essential oil (0.5 oz)", 1200, "Solo para aromas; no ingerir.", "For aroma only; do not ingest.", 6)]],
      ["Utensilios", "Tools", [P("Colador de té de acero", "Steel tea infuser", 500, "", "", 6), P("Frasco de vidrio con tapa", "Glass jar with lid", 700, "", "", 6)]],
    ],
    about: [(n, o, f, st) => bi(`${n} es una tienda de productos naturales en ${st} desde ${f}: tés, hierbas secas, aceites, miel y semillas. ${o} te cuenta cómo se usan tradicionalmente; no damos consejos médicos ni vendemos hierbas como cura.`, `${n} is a natural-products shop on ${st} since ${f}: teas, dried herbs, oils, honey and seeds. ${o} tells you how they are traditionally used; we do not give medical advice or sell herbs as a cure.`),
      (n, o, f, st) => bi(`En ${st} desde ${f}: el rincón de las hierbas de la abuela. Apartas en la app y pasas a recoger; ${o} te prepara tu bolsa.`, `On ${st} since ${f}: grandma's herb corner. Hold in the app and stop by to pick up; ${o} prepares your bag.`)],
    faq: [[bi("¿Estas hierbas curan enfermedades?", "Do these herbs cure illness?"), bi("No. Son productos de uso tradicional y no sustituyen la atención médica. Si tienes una condición o tomas medicamentos, consulta a tu médico.", "No. These are traditionally used products and do not replace medical care. If you have a condition or take medication, ask your doctor.")],
      [bi("¿Cómo guardo las hierbas?", "How do I store the herbs?"), bi("En frasco cerrado, lejos de la luz y el calor; duran unos doce meses.", "In a closed jar away from light and heat; they last about twelve months.")]] },
  { sub: "NEG-BELL-39", tipo: "bs", nombres: ["Beauty Supply La Reina", "Distribuidora de Belleza Mía", "Todo Belleza Supply", "Beauty Supply Caribe", "Mundo del Cabello Supply", "Belleza Total Tienda", "Estilo y Más Beauty Supply", "Supply Cabello y Piel Latino", "Beauty Outlet Dalia", "Tienda de Belleza El Trébol"],
    secs: [
      ["Cuidado del cabello", "Hair care", [P("Champú hidratante (16 oz)", "Hydrating shampoo (16 oz)", 900, "", "", 6), P("Acondicionador hidratante (16 oz)", "Hydrating conditioner (16 oz)", 900, "", "", 6), P("Mascarilla profunda para rizos (12 oz)", "Deep curl mask (12 oz)", 1400, "", "", 6), P("Gel de definición para rizos (16 oz)", "Curl-defining gel (16 oz)", 1100, "", "", 6), P("Crema para peinar sin enjuague (8 oz)", "Leave-in styling cream (8 oz)", 1000, "", "", 6), P("Aceite capilar de argán (4 oz)", "Argan hair oil (4 oz)", 1300, "", "", 6), P("Champú sin sulfatos (12 oz)", "Sulfate-free shampoo (12 oz)", 1300, "", "", 6), P("Protector de calor en spray (8 oz)", "Heat protectant spray (8 oz)", 1000, "", "", 6)]],
      ["Extensiones y pelucas", "Extensions and wigs", [P("Pelo para trenzas, pack de 3", "Braiding hair, pack of 3", 1200, "", "", 6), P("Extensiones de clip (20 pulgadas)", "Clip-in extensions (20 inch)", 5500, "", "", 6), P("Peluca corta sintética", "Short synthetic wig", 3500, "", "", 6), P("Peluca larga ondulada", "Long wavy wig", 5500, "", "", 6), P("Gorro para peluca (2 piezas)", "Wig caps (2 pack)", 500, "", "", 6), P("Pegamento para encaje (1.4 oz)", "Lace glue (1.4 oz)", 1100, "", "", 6)]],
      ["Herramientas", "Tools", [P("Plancha de cerámica", "Ceramic flat iron", 4500, "", "", 6), P("Secador profesional con difusor", "Professional dryer with diffuser", 5500, "", "", 6), P("Cepillo redondo (set de 3)", "Round brush (set of 3)", 1400, "", "", 6), P("Peine de cola", "Rat-tail comb", 300, "", "", 6), P("Máquina de corte inalámbrica", "Cordless clippers", 4900, "", "", 6), P("Tijeras de corte para salón", "Salon cutting shears", 3500, "", "", 6), P("Capa de corte", "Cutting cape", 1200, "", "", 6)]],
      ["Uñas", "Nails", [P("Esmalte (color a elegir)", "Nail polish (color of your choice)", 500, "", "", 6), P("Set de limas y pulidores", "File and buffer set", 600, "", "", 6), P("Gel en pote (0.5 oz)", "Gel pot (0.5 oz)", 1200, "", "", 6), P("Polvo acrílico (2 oz)", "Acrylic powder (2 oz)", 1500, "", "", 6), P("Lámpara LED para uñas", "LED nail lamp", 3200, "", "", 6)]],
      ["Maquillaje y piel", "Makeup and skin", [P("Base líquida (tono a elegir)", "Liquid foundation (shade of your choice)", 900, "", "", 6), P("Labial mate (tono a elegir)", "Matte lipstick (shade of your choice)", 700, "", "", 6), P("Pestañas postizas (5 pares)", "Strip lashes (5 pairs)", 600, "", "", 6), P("Crema hidratante facial (2 oz)", "Facial moisturizer (2 oz)", 1100, "", "", 6), P("Protector solar facial (3 oz)", "Facial sunscreen (3 oz)", 1300, "", "", 6)]],
      ["Accesorios", "Accessories", [P("Bufanda de satén para dormir", "Satin sleep scarf", 800, "", "", 6), P("Ligas y pinzas (pack de 20)", "Hair ties and clips (pack of 20)", 400, "", "", 6), P("Gorro de ducha (3 piezas)", "Shower cap (3 pack)", 400, "", "", 6)]],
    ],
    about: [(n, o, f, st) => bi(`${n} abastece a salones y a quien se arregla en casa en ${st} desde ${f}: productos para el cabello, extensiones, herramientas y uñas. ${o} te ayuda a elegir.`, `${n} supplies salons and anyone who styles at home on ${st} since ${f}: hair products, extensions, tools and nails. ${o} helps you choose.`),
      (n, o, f, st) => bi(`En ${st} desde ${f}: todo para el cabello y las uñas, con precios para estilistas. Aparta en la app y paga en la caja.`, `On ${st} since ${f}: everything for hair and nails, with prices for stylists. Hold in the app and pay at the register.`)],
    faq: [[bi("¿Tienen precio para estilistas?", "Do you have stylist pricing?"), bi("Sí, con tu licencia de cosmetología o una tarjeta de negocio; pregunta en la caja.", "Yes, with your cosmetology license or a business card; ask at the register.")],
      [bi("¿Puedo devolver una peluca o un producto abierto?", "Can I return a wig or an opened product?"), bi("Las pelucas y los productos abiertos no se devuelven por higiene; lo cerrado, sí, dentro del plazo.", "Wigs and opened products cannot be returned for hygiene; unopened items can within the window.")]] },
];

const HORAS = [
  () => horario({ 0: rango("12:00", "17:00"), 1: rango("10:00", "19:00"), 2: rango("10:00", "19:00"), 3: rango("10:00", "19:00"), 4: rango("10:00", "19:30"), 5: rango("10:00", "19:30"), 6: rango("10:00", "18:30") }),
  () => horario({ 1: rango("09:30", "18:30"), 2: rango("09:30", "18:30"), 3: rango("09:30", "18:30"), 4: rango("09:30", "19:00"), 5: rango("09:30", "19:00"), 6: rango("09:30", "17:30") }),
  () => horario({ 0: rango("11:00", "17:00"), 1: rango("10:00", "19:30"), 2: rango("10:00", "19:30"), 3: rango("10:00", "19:30"), 4: rango("10:00", "20:00"), 5: rango("10:00", "20:00"), 6: rango("10:00", "19:00") }),
];

function genHolds(r, b, flat, disp, nOps, base, numero) {
  const maxD = Math.min(2500, maxDiasDe(b.founded));
  const pick = () => flat[r.int(0, flat.length - 1)];
  const reg = Array.from({ length: 30 }, () => r.int(0, 246));
  const ops = [];
  const MALOS = [["cancelled", "user", "Ya no la necesito."], ["cancelled", "business", "Se vendió en la tienda."], ["declined", null, null], ["expired", null, null], ["expired", null, null, "acc"], ["expired", null, null, "acc"]];
  for (let k = 0; k < nOps; k++) {
    let d = k < 10 ? r.int(0, 29) : dias(r, maxD), h, t = 0;
    while (t++ < 14) { const wd = ((new Date(Date.UTC(2026, 10, 17)).getUTCDay() - d) % 7 + 7) % 7; h = b.hours[wd]; if (h.open) break; d += 1; }
    const rg = h.ranges[0].map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)));
    const m = r.int(rg[0] + 20, Math.max(rg[0] + 21, rg[1] - 60));
    const envio = disp.ship && r.chance(0.2);
    const nL = r.int(1, 4), L = [], used = new Set();
    let sub = 0;
    for (let l = 0; l < nL; l++) {
      const it = pick();
      if (used.has(it.ord)) continue;
      used.add(it.ord);
      const qty = r.pick([1, 1, 1, 2]);
      L.push([it.ord, qty, it.p, null, it.tax]);
      sub += qty * it.p;
    }
    const tax = Math.round(L.reduce((s, x) => s + (x[1] * x[2] * x[4]) / 100, 0));
    const dlv = envio ? (sub >= 7500 ? 0 : 799) : 0;
    const bad = r.chance(0.12) ? r.pick(MALOS) : null;
    const idx = ops.length;
    const op = { q: base + idx, n: numero(base + idx), d, m, u: r.chance(0.45) ? r.pick(reg) : r.int(0, 246), co: envio ? "envio" : "tienda", st: bad ? bad[0] : "done", sub: sub + tax, dlv, tot: sub + tax + dlv, pm: envio ? "a" : "l", L };
    if (bad && bad[1]) { op.cb = bad[1]; op.cr = bad[2]; }
    if (bad && bad[3]) op.acc = true;
    if (bad && bad[0] === "declined") op.sd = "sin_existencia";
    if (bad && bad[0] === "expired" && !bad[3]) op.sd = "sin_respuesta";
    const dia = new Date(Date.UTC(2026, 10, 17) - d * 864e5).toISOString().slice(0, 10);
    if (!envio) op.det = { dia, hora: m };
    else op.det = { to: { label: "casa", street: `${r.int(2, 98) * 10 + 1} ${r.pick(["N Church St", "W 4th St", "Maple Ave", "Oak St", "Linden St"])}`, apt: null, zip: b.addr.zip }, ship: true, ship_days: "3-5", tracking: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111" };
    if (op.pm === "a") { op.br = r.pick(["visa", "visa", "mastercard", "amex"]); op.l4 = r.pick(["4242", "4444", "0005", "1881", "9424"]); }
    ops.push(op);
  }
  for (let k = 0; k < r.int(1, 3); k++) {
    const it = pick(), idx = ops.length;
    ops.push({ q: base + idx, n: numero(base + idx), d: 0, m: 720, fut: 1, u: r.int(0, 246), co: "tienda", st: "confirmed", sub: it.p, dlv: 0, tot: it.p, pm: "l", L: [[it.ord, 1, it.p, null, it.tax]], det: { dia: new Date(Date.UTC(2026, 10, 18)).toISOString().slice(0, 10), hora: 720 } });
  }
  return ops;
}

const RESENAS = {
  es: { 5: ["Aparté {d} en la app y lo tenían listo cuando llegué. {x}", "Buen precio por {d} y la atención fue excelente. {x}", "Encontré {d} tal como lo vi en la página. {x}", "Me ayudaron a elegir {d} sin presionarme. {x}"], 4: ["Buena tienda; {d} me gustó, aunque la fila en la caja era larga. {x}", "Buen precio de {d}. {x}", "Todo bien con {d}; me gustaría más variedad. {x}"], 3: ["El {d} estaba bien pero a la tienda le faltaba surtido. {x}", "Tardaron en atenderme en la caja. {x}"], 2: ["Aparté {d} y al llegar ya no lo tenían. {x}", "El precio de {d} en la caja no era el de la app. {x}"],
    x5: ["Los recomiendo.", "Voy a volver.", "Atención muy amable.", "Gracias por todo.", "Ya somos clientes de años."], x3: ["Espero que mejoren.", "Les doy otra oportunidad."] },
  en: { 5: ["I held {d} in the app and it was ready when I arrived. {x}", "Great price for {d} and excellent service. {x}", "I found {d} just as I saw it on the page. {x}", "They helped me pick {d} without pressure. {x}"], 4: ["Nice shop; I liked {d}, though the register line was long. {x}", "Fair price for {d}. {x}", "All good with {d}; I would like more variety. {x}"], 3: ["The {d} was fine but the shop needed more stock. {x}", "Service at the register was slow. {x}"], 2: ["I held {d} and when I arrived they did not have it. {x}", "The register price for {d} was not the app price. {x}"],
    x5: ["Highly recommend.", "I will be back.", "Very friendly.", "Customers for years."], x3: ["Hope they improve.", "I will give them another chance."] },
  rEs5: ["Gracias por tu reseña. Aquí te esperamos.", "Un gusto atenderte. Vuelve pronto.", "Gracias por tu confianza; se la paso al equipo."], rEs3: ["Gracias por avisarnos. Estamos ajustando el surtido y la caja; escríbenos y lo resolvemos.", "Lamentamos la espera. Tomamos nota para atender más rápido."],
  rEn5: ["Thank you for your review. See you soon.", "Our pleasure. Come back soon."], rEn3: ["Thank you for telling us. We are adjusting stock and the register; message us and we will make it right.", "Sorry for the wait. We took note to serve faster."],
};

/* si = 0..2 (37, 38, 39); k = 0..9; idx = número global del negocio; base = primer número de operación local; numero(i) = «A-…» */
export function construirTienda(si, k, idx, base, numero) {
  const cfg = SUBS[si], name = cfg.nombres[k], city = ciudadDe(si, k);
  const r = rng(`r2tienda:${name}`);
  const founded = anioFundado(r);
  const ship = r.chance(0.4), hold = r.pick([24, 48, 48, 72]), ret = r.pick([7, 15, 15, 30]);
  const disp = { hold, ret, ship };
  const filter = ["tienda"]; // el filtro «Tienda» de Belleza
  const bz = armar({ n: 600 + idx, cat: CAT, name, subs: [cfg.sub], city, founded, about: null, attrs: null, filter, mods: ["shop", "nov", "staff"], amenities: ["acepta-tarjeta", "apartado", "pickup-en-tienda", ...(ship ? ["envio"] : []), "estacionamiento", "accesible"],
    hours: HORAS[(si + k) % 3](), photoIds: [0], faqs: [], role: bi("Dueña", "Owner"), bio: null, team: [] });
  bz.id = `${bz.id}-${cfg.sub.slice(-2)}`;
  const fotos = fotosDe(CAT, cfg.sub, r, 8).map(conTam);
  bz.photos = fotos.slice(0, 6); bz.logo = fotos[6] ?? fotos[0];
  bz.about = cfg.about[k % 2](name, bz.owner.first, founded, bz.addr.street);
  bz.owner.role = bi("Dueño y comprador", "Owner and buyer");
  bz.owner.bio = bi(`${bz.owner.first} abrió la tienda en ${founded} y sigue atendiendo en el piso.`, `${bz.owner.first} opened the store in ${founded} and still works the floor.`);
  bz.team = r.shuffle(["Yaritza Soto", "Marcos Peña", "Katherine Mejía", "Elvis Núñez", "Odalis Cruz", "Franklin Rosario"]).slice(0, r.int(1, 3)).map((nm, i) => ({ name: nm, role: bi(["Ventas", "Caja", "Inventario"][i % 3], ["Sales", "Register", "Inventory"][i % 3]), since: Math.min(2025, founded + r.int(1, 7)) }));
  bz.faqs = [[bi("¿Cómo funciona el apartado?", "How does holding an item work?"), bi(`Eliges en la app, lo guardamos por ${hold} horas y pagas en la caja cuando vengas. No se cobra nada antes.`, `Pick in the app, we hold it for ${hold} hours and you pay at the register when you come in. Nothing is charged before.`)],
    [bi("¿Puedo cambiar o devolver?", "Can I exchange or return?"), bi(`Sí, dentro de ${ret} días con el recibo si está sin abrir.`, `Yes, within ${ret} days with the receipt if unopened.`)],
    [bi("¿Hacen envío?", "Do you ship?"), bi(ship ? "Sí, a todo el país en 3 a 5 días." : "Por ahora solo recoges en la tienda.", ship ? "Yes, nationwide in 3 to 5 days." : "For now, pickup in store only.")],
    ...cfg.faq].map(([qq, a]) => ({ q: qq, a }));
  // catálogo
  const COL = [["", ""], [" · tamaño grande", " · large size"], [" · tamaño de viaje", " · travel size"]];
  const sections = cfg.secs.map(([es, en, lista]) => ({ n: [es, en], items: lista.filter(() => r.chance(0.94)).flatMap((x) => [x, ...(r.chance(0.18) ? [[x[0] + COL[1][0], x[1] + COL[1][1], Math.round(x[2] * 1.6 / 100) * 100, x[3], x[4], x[5]]] : r.chance(0.12) ? [[x[0] + COL[2][0], x[1] + COL[2][1], Math.max(300, Math.round(x[2] * 0.5 / 100) * 100), x[3], x[4], x[5]]] : [])]).map((x) => ({ es: x[0], en: x[1], p: Math.max(100, Math.round(x[2] * (0.9 + (k % 5) * 0.04) / 50) * 50), de: x[3], den: x[4], tax: x[5] })) }));
  const j = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
  const qs = (s) => `'${String(s).replace(/'/g, "''")}'`;
  let sql = `  insert into retail_settings (business_id, ebt, cash, weighs_front, sub_default, slot_cap, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_every_days, lay_cancel_pct)
  values (b, false, true, false, 'call', ${r.pick([4, 6, 8])}, ${hold}, ${ret}, false, 20, 4, 14, 10) on conflict (business_id) do nothing;
  insert into delivery_settings (business_id, pickup, delivery, pay_card, pay_cash_pickup, ship, ship_fee_cents, ship_free_over_cents, ship_days, prep_min, pickup_note)
  values (b, true, false, true, true, ${ship}, ${ship ? 799 : 0}, ${ship ? 7500 : 0}, '3-5', 20, ${j(bi("Pasa por la caja con tu número de apartado.", "Stop by the register with your hold number."))}) on conflict (business_id) do nothing;
`;
  const flat = [];
  sections.forEach((s, ssi) => {
    sql += `  insert into item_sections (business_id, module, name, sort) values (b, 'shop', ${j(bi(s.n[0], s.n[1]))}, ${ssi}) returning id into s;\n`;
    s.items.forEach((it, ii) => {
      const f = { ord: flat.length + 1, es: it.es, en: it.en, p: it.p, tallas: null, stock: null, unit: "u", tax: it.tax, key: "t" };
      flat.push(f);
      const foto = r.pick(bz.photos);
      sql += `  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort, featured, sold_out)
    values (b, 'shop', s, ${j(bi(it.es, it.en))}, ${j(bi(it.de || "", it.den || ""))}, ${it.p}, 'u', ${it.tax}, array[${qs(foto)}]::text[], 'unid', false, 0, false, null, '{}', false, ${ii}, ${ii === 0 && r.chance(0.5)}, ${r.chance(0.03)}) returning id into i;\n`;
    });
  });
  bz.flat = flat; bz.sqlExtra = sql;
  bz.attrs = { m: "shop", hold_hours: hold, tarjeta: { eta: bi(`Aparta ${hold} h · pagas en la caja`, `${hold} h hold · pay at the register`), fee: bi(`${flat[0].es} desde ${money(Math.min(...flat.map((x) => x.p)))}`, `${flat[0].en} from ${money(Math.min(...flat.map((x) => x.p)))}`) } };
  const posts = genNovedades(r, bz, flat, {
    oferta: "Hasta el domingo. Aparta en la app y pagas en la caja.", hoy: (x) => `Llegó ${x.es.toLowerCase()}`.slice(0, 60), hoyB: "Quedan pocas piezas. Apártalo en la app.",
    encuesta: { t: "¿Qué quieres que traigamos?", b: "Vota y lo pedimos para el próximo surtido.", o: ["Más variedad", "Más marcas económicas", "Productos para niños"] },
    avisoT: "cerramos temprano", cupon: { t: "Cupón de seguidores: $5 en tu apartado", b: "Para quien nos sigue: $5 de descuento en compras desde $40.", pref: "BELL", off: 500, min: 4000 },
    nov2: [["Llegó el surtido de temporada", "Productos nuevos esta semana."], ["Ahora puedes apartar desde la app", "Elige y pasa a recoger; no se cobra nada antes."]],
    nov3: ["Gracias por tantos años", "Entre nuestros clientes más fieles sorteamos una tarjeta de regalo."],
  });
  const o1 = flat.find((x) => x.ord === posts[0].it);
  bz.attrs.tarjeta.offer = bi(`${o1.es} desde ${money(posts[0].now)} hasta el domingo`, `${o1.en} from ${money(posts[0].now)} through Sunday`);
  const ops = genHolds(r, bz, flat, disp, r.int(40, 100), base, numero);
  const nRev = Math.min(40, Math.max(15, Math.round(ops.filter((o) => o.st === "done").length * r.pick([0.3, 0.4, 0.5]))));
  const reviews = genResenas(r, ops, nRev, {
    vale: (o) => o.st === "done", srcDe: (o) => (o.co === "envio" ? "dl" : "pk"), recDe: (o) => o.L.slice(0, 2).map((x) => x[0]), nombreDe: (o) => { const x = flat[o.L[0][0] - 1]; return { es: x.es, en: x.en }; },
    resp: (rr, s) => (s >= 5 ? { trato: 1, caja: 1, tenian: 1, guardo: 1, cambio: rr.pick(["ok", "na"]) } : s === 4 ? { trato: 1, caja: 1, tenian: 1, guardo: 1, cambio: "na" } : s === 3 ? { trato: 0, caja: rr.pick([1, 0]), tenian: 0, guardo: 1, cambio: "na" } : { trato: -1, caja: 0, tenian: 0, guardo: 0, cambio: rr.pick(["no", "na"]) }),
    ...RESENAS,
  });
  bz.hist = { ops, reviews, posts: posts.slice(0, 6) };
  bz.fol.n = Math.min(bz.fol.n, 80);
  return bz;
}
