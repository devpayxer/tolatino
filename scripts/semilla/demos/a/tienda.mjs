/* Grupo A · TIENDA · 5 subcategorías principales (sort 1–5): Ropa de mujer · Ropa de hombre · Ropa de niños · Vestidos de quinceañera y novia · Ropa formal y trajes.
   Artículos con tallas, existencias por talla, apartados (pickup y envío), plan de pagos donde corresponde y ~10 años de apartados. */
import { rng, q, j, arr, bi, photoUrl, money, horario, rango } from "./comun.mjs";
import { armar, ciudadDe, anioFundado, dias, maxDiasDe } from "./negocio.mjs";
import { genResenas as genRes, genNovedades as genNov } from "./textos.mjs";

const SUBS = ["NEG-TIENDA-01", "NEG-TIENDA-02", "NEG-TIENDA-03", "NEG-TIENDA-04", "NEG-TIENDA-05"];
const NOMBRES = [
  ["Boutique Marisol", "Moda Femenina Dulce Amanda", "Estilo y Más Boutique", "La Casa de la Blusa", "Boutique Elegancia Latina", "Moda y Color Yesenia", "Boutique La Coqueta", "Tendencias Dayana", "Vestimenta Rosa Linda", "Boutique Mujer Hermosa"],
  ["Moda Caballero El Charro", "Ropa para Él Don Julián", "Estilo Hombre Latino", "Caballeros Fino Estilo", "Moda Masculina El Patrón", "Camisas y Pantalones La Elegancia", "El Rey de la Moda Hombre", "Moda Hombre Santiago", "Boutique Don Alberto", "Casual Hombre Los Primos"],
  ["Moda Infantil Los Angelitos", "Ropita de Niños Carita Feliz", "Mundo Infantil Pequeños Pasos", "Kids Fashion La Chiquitina", "Ropa Infantil Dulce Ternura", "Niños Modernos", "Moda Bebé y Niños Doña Ana", "Uniformes y Ropa Escolar Los Estudiosos", "Tienda de Ropa Infantil Mi Tesoro", "Pequeños Gigantes Moda Infantil"],
  ["Quinceañeras Princesa Real", "Novias y Quince La Elegante", "Vestidos Sueño de Cristal", "Salón de Novias Corazón Latino", "Quince Años y Novias Mía", "Boutique Nupcial Isabella", "Vestidos de Quince Reina del Baile", "Novias del Valle", "Quinceañeras Lucero", "Vestidos y Trajes Gran Gala"],
  ["Trajes Don Ricardo", "Trajes Fino Estilo", "Trajes Elegantes El Dandi", "Ropa Formal Caballero", "Trajes y Esmoquin Gran Señor", "Casa del Traje Hispano", "Trajes de Etiqueta Santa Fe", "Moda Formal Alta Costura", "Trajes y Camisas Don Pedro", "Elegance Trajes Latinos"],
];
const Z = {
  m: ["S", "M", "L", "XL", "2X", "3X"], mn: ["2", "4", "6", "8", "10", "12", "14", "16"], h: ["S", "M", "L", "XL", "2X", "3X"], hp: ["30", "32", "34", "36", "38", "40", "42"], n: ["2T", "3T", "4T", "5", "6", "7", "8", "10", "12", "14"],
  q: ["2", "4", "6", "8", "10", "12", "14", "16", "18"], t: ["36R", "38R", "40R", "42R", "44R", "46R", "48R", "40L", "42L", "44L"], z: ["7", "8", "9", "10", "11", "12"], zn: ["10", "11", "12", "13", "1", "2", "3", "4"], u: ["Única"],
};
// [sección, es, en, centavos, tallas, foto, impuesto, descripción es, en]
const C = [
  // 0 · mujer
  [["Blusas y camisas", "Blouses and shirts", [["Blusa de encaje", "Lace blouse", 2400, "m", 8387807, "Blanca o negra.", "White or black."], ["Blusa casual de manga larga", "Long-sleeve casual blouse", 1900, "m", 36730407, "Tela suave que no se arruga.", "Soft fabric that does not wrinkle."],
    ["Camisa de lino", "Linen shirt", 2900, "m", 8386651, "Fresca para el verano.", "Cool for summer."], ["Top sin mangas", "Sleeveless top", 1500, "m", 8387807, "Varios colores.", "Several colors."], ["Blusa bordada", "Embroidered blouse", 3400, "m", 36730407, "Bordado a mano.", "Hand embroidered."]]],
   ["Jeans y pantalones", "Jeans and pants", [["Jeans de tiro alto", "High-rise jeans", 2900, "mn", 6068971, "Corte que estiliza.", "A flattering cut."], ["Jeans entubados", "Skinny jeans", 3200, "mn", 6069544, "Con elástico.", "With stretch."], ["Pantalón de vestir", "Dress pants", 3400, "mn", 6068971, "Para la oficina o la iglesia.", "For the office or church."],
    ["Leggings (2 piezas)", "Leggings (2-pack)", 1800, "m", 6069544, "Algodón suave.", "Soft cotton."], ["Pantalón palazzo", "Palazzo pants", 3000, "m", 6068971, "Ancho y fresco.", "Wide and cool."]]],
   ["Vestidos", "Dresses", [["Vestido de fiesta", "Party dress", 5900, "m", 8459366, "Largo, varios colores.", "Long, several colors."], ["Vestido casual de verano", "Casual summer dress", 3900, "m", 8459366, "Ligero y cómodo.", "Light and comfortable."], ["Vestido largo de noche", "Long evening dress", 8900, "mn", 8459366, "Con forro.", "Lined."],
    ["Vestido floral", "Floral dress", 4400, "m", 8387807, "Estampado de flores.", "Floral print."], ["Vestido camisero", "Shirt dress", 4200, "m", 36730407, "Con cinturón.", "With belt."]]],
   ["Abrigos y suéteres", "Coats and sweaters", [["Suéter tejido", "Knit sweater", 3600, "m", 8386651, "Para el invierno de Pennsylvania.", "For a Pennsylvania winter."], ["Cárdigan largo", "Long cardigan", 3900, "m", 8386651, "", ""], ["Chaqueta de mezclilla", "Denim jacket", 4900, "m", 6068971, "", ""], ["Abrigo de invierno", "Winter coat", 8900, "m", 8386651, "Con relleno térmico.", "With thermal fill."]]],
   ["Accesorios", "Accessories", [["Cartera", "Handbag", 3200, "u", 8201205, "Imitación cuero.", "Faux leather."], ["Bufanda", "Scarf", 1800, "u", 8201205, "", ""], ["Cinturón de cuero", "Leather belt", 1900, "u", 8201205, "", ""], ["Aretes de fantasía", "Fashion earrings", 1200, "u", 8201205, "", ""]]]],
  // 1 · hombre
  [["Camisas", "Shirts", [["Camisa de vestir", "Dress shirt", 3500, "h", 29765480, "Manga larga, planchado fácil.", "Long sleeve, easy care."], ["Guayabera", "Guayabera", 3900, "h", 29765480, "De lino, para el calor.", "Linen, for the heat."], ["Camisa casual", "Casual shirt", 2800, "h", 29765480, "", ""], ["Camisa vaquera", "Western shirt", 3600, "h", 29765480, "Con botones de presión.", "With snap buttons."], ["Polo", "Polo shirt", 2400, "h", 5560083, "", ""]]],
   ["Pantalones", "Pants", [["Pantalón de vestir", "Dress pants", 4200, "hp", 29765480, "", ""], ["Jeans clásicos", "Classic jeans", 3500, "hp", 6068971, "", ""], ["Pantalón cargo", "Cargo pants", 3800, "hp", 6068971, "", ""], ["Bermudas", "Shorts", 2600, "hp", 6068971, "", ""], ["Pantalón de trabajo", "Work pants", 3200, "hp", 6068971, "Resistente.", "Heavy duty."]]],
   ["Chaquetas y sudaderas", "Jackets and hoodies", [["Chaqueta de mezclilla", "Denim jacket", 5500, "h", 6068971, "", ""], ["Chamarra de invierno", "Winter jacket", 9500, "h", 1020372, "Impermeable.", "Waterproof."], ["Sudadera con capucha", "Hoodie", 3900, "h", 1020372, "", ""], ["Abrigo largo", "Long coat", 12900, "h", 1020372, "", ""]]],
   ["Básicos", "Basics", [["Camisetas básicas (3)", "Basic tees (3)", 2200, "h", 5560083, "", ""], ["Calcetines (6 pares)", "Socks (6 pairs)", 1400, "u", 5560083, "", ""], ["Bóxers (5)", "Boxers (5)", 2600, "h", 5560083, "", ""]]],
   ["Accesorios", "Accessories", [["Gorra", "Cap", 1800, "u", 701771, "", ""], ["Cinturón de cuero", "Leather belt", 2400, "u", 18726333, "", ""], ["Sombrero vaquero", "Cowboy hat", 4900, "h", 701771, "", ""], ["Cartera de hombre", "Men's wallet", 2800, "u", 8201205, "", ""]]]],
  // 2 · niños
  [["Niño", "Boys", [["Conjunto de niño", "Boy's set", 2800, "n", 5560083, "Camisa y pantalón.", "Shirt and pants."], ["Camiseta con estampado", "Graphic tee", 1200, "n", 5560083, "", ""], ["Pantalón jogger", "Jogger pants", 2000, "n", 1020372, "", ""], ["Jeans de niño", "Boy's jeans", 2400, "n", 6068971, "", ""], ["Chaqueta acolchada", "Quilted jacket", 4200, "n", 1020372, "Para el frío.", "For the cold."], ["Sudadera", "Sweatshirt", 2600, "n", 1020372, "", ""]]],
   ["Niña", "Girls", [["Vestido de niña", "Girl's dress", 3200, "n", 8459366, "", ""], ["Conjunto de niña", "Girl's set", 2900, "n", 8387807, "", ""], ["Mallas", "Leggings", 1400, "n", 6069544, "", ""], ["Pijama", "Pajamas", 2200, "n", 5560083, "", ""]]],
   ["Escolar", "School", [["Polo de uniforme", "Uniform polo", 1800, "n", 5560083, "Azul, blanco, rojo y negro.", "Navy, white, red and black."], ["Pantalón de uniforme", "Uniform pants", 2200, "n", 6068971, "", ""], ["Zapatos escolares", "School shoes", 3500, "zn", 18726333, "", ""]]],
   ["Calzado y más", "Shoes and more", [["Tenis", "Sneakers", 3900, "zn", 28271086, "", ""], ["Calcetines (5 pares)", "Socks (5 pairs)", 1200, "u", 5560083, "", ""], ["Gorra de niño", "Kids cap", 1400, "u", 701771, "", ""]]]],
  // 3 · quince y novia
  [["Vestidos de quince", "Quinceañera dresses", [["Vestido de quince tipo princesa", "Princess quinceañera dress", 38900, "q", 8459404, "Falda amplia con pedrería.", "Full skirt with beading."], ["Vestido de quince con cola", "Quinceañera dress with train", 52900, "q", 8459404, "Corsé con cordones.", "Lace-up corset."], ["Vestido corto de quince", "Short quinceañera dress", 25900, "q", 8459366, "Para la fiesta y el baile sorpresa.", "For the party and surprise dance."], ["Vestido de damas", "Damas dress", 9900, "q", 8459366, "Colores a juego.", "Matching colors."]]],
   ["Novias", "Bridal", [["Vestido de novia clásico", "Classic wedding dress", 59900, "m", 5618793, "", ""], ["Vestido de novia sirena", "Mermaid wedding dress", 69900, "m", 5618793, "", ""], ["Vestido de novia sencillo", "Simple wedding dress", 39900, "m", 5618793, "Para civil o jardín.", "For civil or garden weddings."], ["Vestido de niña de las flores", "Flower girl dress", 7900, "n", 8459366, "", ""]]],
   ["Chambelanes", "Chambelanes", [["Traje de chambelán", "Chambelán suit", 14900, "t", 29765480, "Con chaleco y corbatín.", "With vest and bow tie."], ["Camisa de vestir blanca", "White dress shirt", 3500, "h", 29765480, "", ""]]],
   ["Accesorios", "Accessories", [["Corona y tiara", "Crown and tiara", 4500, "u", 6764299, "", ""], ["Ramo de novia", "Bridal bouquet", 3500, "u", 6764299, "Flores artificiales de seda.", "Artificial silk flowers."], ["Zapatillas de quince", "Quinceañera heels", 6500, "z", 18726333, "", ""], ["Guantes y velo", "Gloves and veil", 2900, "u", 5618793, "", ""]]]],
  // 4 · formal
  [["Trajes", "Suits", [["Traje de 2 piezas", "Two-piece suit", 29900, "t", 29765480, "Saco y pantalón.", "Jacket and pants."], ["Traje de 3 piezas", "Three-piece suit", 38900, "t", 29765480, "Con chaleco.", "With vest."], ["Esmoquin", "Tuxedo", 44900, "t", 29765480, "Para bodas y graduaciones.", "For weddings and proms."], ["Saco sport", "Sport coat", 19900, "t", 29765480, "", ""]]],
   ["Camisas y pantalones", "Shirts and pants", [["Camisa de vestir", "Dress shirt", 3900, "h", 29765480, "", ""], ["Pantalón de vestir", "Dress pants", 6900, "hp", 29765480, "", ""], ["Chaleco", "Vest", 4900, "h", 29765480, "", ""]]],
   ["Corbatas y accesorios", "Ties and accessories", [["Corbata", "Tie", 2500, "u", 36883230, "", ""], ["Corbatín", "Bow tie", 1900, "u", 36883230, "", ""], ["Cinturón de cuero", "Leather belt", 3200, "u", 18726333, "", ""], ["Gemelos", "Cufflinks", 1800, "u", 36883230, "", ""]]],
   ["Zapatos", "Shoes", [["Zapatos de vestir", "Dress shoes", 8900, "z", 18726333, "Piel, suela de cuero.", "Leather, leather sole."], ["Mocasines", "Loafers", 7900, "z", 18726333, "", ""]]]],
];
const GALERIA = [[8387807, 36730407, 8386651, 8459366, 6068971, 8201205], [29765480, 5560083, 701771, 1020372, 6068971, 18726333], [5560083, 1020372, 28271086, 701771, 18726333, 6069544], [8459404, 8459366, 5618793, 6764299, 36883230, 18726333], [29765480, 36883230, 18726333, 5618793, 8201205, 701771]];
const HORAS = [
  () => horario({ 0: rango("12:00", "17:00"), 1: rango("10:00", "19:00"), 2: rango("10:00", "19:00"), 3: rango("10:00", "19:00"), 4: rango("10:00", "19:30"), 5: rango("10:00", "19:30"), 6: rango("10:00", "19:30") }),
  () => horario({ 0: rango("12:00", "17:00"), 1: rango("10:00", "19:00"), 2: rango("10:00", "19:00"), 3: rango("10:00", "19:00"), 4: rango("10:00", "19:30"), 5: rango("10:00", "19:30"), 6: rango("10:00", "19:30") }),
  () => horario({ 0: rango("12:00", "17:00"), 1: rango("09:30", "19:00"), 2: rango("09:30", "19:00"), 3: rango("09:30", "19:00"), 4: rango("09:30", "19:30"), 5: rango("09:30", "19:30"), 6: rango("09:30", "19:30") }),
  () => horario({ 2: rango("11:00", "19:00"), 3: rango("11:00", "19:00"), 4: rango("11:00", "20:00"), 5: rango("11:00", "20:00"), 6: rango("10:00", "19:00"), 0: rango("12:00", "17:00") }),
  () => horario({ 1: rango("10:00", "18:30"), 2: rango("10:00", "18:30"), 3: rango("10:00", "18:30"), 4: rango("10:00", "19:30"), 5: rango("10:00", "19:30"), 6: rango("10:00", "18:00") }),
];
const ABOUT = [
  (n, o, f, st) => bi(`${n} viste a la mujer latina en ${st} desde ${f}: blusas, jeans, vestidos y abrigos desde la talla S hasta la 3X. ${o} te ayuda a encontrar tu talla y puedes apartar por 48 horas sin pagar nada hasta que vengas.`, `${n} has dressed Latina women on ${st} since ${f}: blouses, jeans, dresses and coats from size S to 3X. ${o} helps you find your size and you can hold items for 48 hours with nothing paid until you come in.`),
  (n, o, f, st) => bi(`Ropa para hombre en ${st} desde ${f}: camisas, guayaberas, jeans, chaquetas y accesorios. ${o} atiende en español e inglés. Aparta lo que te gustó en la app y pruébatelo en la tienda.`, `Menswear on ${st} since ${f}: shirts, guayaberas, jeans, jackets and accessories. ${o} serves you in Spanish and English. Hold what you like in the app and try it on in store.`),
  (n, o, f, st) => bi(`${n} viste a los niños de la familia en ${st} desde ${f}: ropa diaria, uniformes escolares, calzado y ropa de fiesta, de 2T a 14. ${o} te guarda las tallas por 48 horas; ideal antes de que empiecen las clases.`, `${n} has dressed the family's kids on ${st} since ${f}: everyday wear, school uniforms, shoes and party clothes, 2T to 14. ${o} holds sizes for 48 hours; ideal before school starts.`),
  (n, o, f, st) => bi(`Vestidos de quinceañera y novia en ${st} desde ${f}. ${o} te recibe con cita para probarte, ajusta a tu medida y ofrece plan de pagos con abono. Vestidos de damas, chambelanes y accesorios en el mismo lugar.`, `Quinceañera and bridal dresses on ${st} since ${f}. ${o} welcomes you by appointment to try on, alters to your measurements and offers a down-payment plan. Damas dresses, chambelanes and accessories under one roof.`),
  (n, o, f, st) => bi(`Trajes, esmoquin y camisas de vestir en ${st} desde ${f}. ${o} te toma las medidas y los ajustes salen en tres días. Para bodas, graduaciones, bautizos y entrevistas.`, `Suits, tuxedos and dress shirts on ${st} since ${f}. ${o} takes your measurements and alterations are done in three days. For weddings, proms, baptisms and interviews.`),
];
const FAQS = [
  (b, d) => [[bi("¿Cómo funciona el apartado?", "How does holding an item work?"), bi(`Eliges tu talla en la app, la guardamos por ${d.hold} horas y pagas en la caja cuando vengas. No se cobra nada antes.`, `Pick your size in the app, we hold it for ${d.hold} hours and you pay at the register when you come in. Nothing is charged before.`)],
    [bi("¿Puedo cambiar o devolver?", "Can I exchange or return?"), bi(`Sí, dentro de ${d.ret} días con el recibo y la etiqueta puesta.`, `Yes, within ${d.ret} days with the receipt and tag attached.`)],
    [bi("¿Tienen tallas grandes?", "Do you carry plus sizes?"), bi("Sí, hasta la 3X en la mayoría de la ropa.", "Yes, up to 3X on most clothing.")],
    [bi("¿Hacen envío?", "Do you ship?"), bi(d.ship ? "Sí, a todo el país en 3 a 5 días." : "Por ahora solo recoges en la tienda.", d.ship ? "Yes, nationwide in 3 to 5 days." : "For now, pickup in store only.")],
    [bi("¿Qué formas de pago aceptan?", "What payment methods do you take?"), bi("Efectivo y tarjeta en la caja. El apartado no cobra nada hasta que recoges.", "Cash and card at the register. A hold charges nothing until you pick up.")]],
];
const FAQ_TIPO = [
  [], [],
  [[bi("¿Venden uniformes escolares?", "Do you sell school uniforms?"), bi("Sí, polos y pantalones en los colores que piden las escuelas del área. Antes de agosto surtimos de más.", "Yes, polos and pants in the colors local schools ask for. We stock extra before August.")]],
  [[bi("¿Necesito cita para probarme?", "Do I need an appointment to try on?"), bi("Recomendamos cita para quinceañeras y novias; escríbenos por Mensajes.", "We recommend an appointment for quinceañeras and brides; message us.")], [bi("¿Hacen ajustes?", "Do you do alterations?"), bi("Sí, a tu medida, con pruebas hasta que quedes feliz.", "Yes, to your measurements, with fittings until you are happy.")], [bi("¿Hay plan de pagos?", "Is there a payment plan?"), bi("Sí: abono del 20 % y el resto en 4 pagos cada 14 días.", "Yes: 20% down and the rest in 4 payments every 14 days.")]],
  [[bi("¿Hacen ajustes?", "Do you do alterations?"), bi("Sí, en tres días: bajos, mangas y cintura.", "Yes, in three days: hems, sleeves and waist.")]],
];

export function generarTienda() {
  const negocios = [];
  let baseOps = 0;
  for (let si = 0; si < 5; si++) {
    for (let k = 0; k < 10; k++) {
      const name = NOMBRES[si][k];
      const city = ciudadDe(si, k);
      const r = rng(`tienda:${name}`);
      const founded = anioFundado(r);
      const layaway = si === 3 || r.chance(0.3);
      const ship = r.chance(0.45);
      const hold = r.pick([24, 48, 48, 48, 72]);
      const ret = si === 3 ? 0 : r.pick([7, 15, 15, 30]);
      const disp = { hold, ret, ship, layaway };
      const n = 100 + si * 10 + k;
      const filter = ["apartado", "efectivo", "tallas", "estac"];
      if (layaway) filter.push("layaway");
      if (ship) filter.push("envio");
      if (r.chance(0.6)) filter.push("domingo");
      if (founded <= 2016) filter.push("y10");
      const g = GALERIA[si], fotoSet = [...g.slice(k % g.length), ...g.slice(0, k % g.length)];
      const hours = HORAS[si]();
      const bz = armar({ n, cat: "NEG-TIENDA", name, subs: [SUBS[si]].concat(si === 0 ? [r.pick(["NEG-TIENDA-16", "NEG-TIENDA-01"])].filter((x) => x !== SUBS[si]) : si === 1 ? ["NEG-TIENDA-08"].slice(0, k % 2) : si === 2 ? ["NEG-TIENDA-09"].slice(0, k % 2) : si === 3 ? ["NEG-TIENDA-16"].slice(0, k % 2) : ["NEG-TIENDA-11"].slice(0, k % 2)), city, founded,
        about: null, attrs: null, filter, mods: ["shop", "pedidos", "nov", "staff"], amenities: ["acepta-tarjeta", "apartado", "pickup-en-tienda", ...(ship ? ["envio"] : []), "estacionamiento", "accesible"], hours, photoIds: fotoSet, faqs: [], role: bi("Dueña", "Owner"), bio: null, team: [] });
      bz.about = ABOUT[si](name, bz.owner.first, founded, bz.addr.street);
      bz.owner.role = bi(["Dueño y comprador", "Dueño", "Dueño", "Dueño y diseñador", "Dueño y sastre"][si], ["Owner and buyer", "Owner", "Owner", "Owner and designer", "Owner and tailor"][si]);
      bz.owner.bio = bi(`${bz.owner.first} abrió la tienda en ${founded} y sigue atendiendo en el piso.`, `${bz.owner.first} opened the store in ${founded} and still works the floor.`);
      bz.team = r.shuffle(["Yaritza Soto", "Marcos Peña", "Katherine Mejía", "Elvis Núñez", "Odalis Cruz", "Franklin Rosario"]).slice(0, r.int(1, 3)).map((nm, i) => ({ name: nm, role: bi(["Ventas", "Caja", "Ajustes y costura"][i % 3], ["Sales", "Register", "Alterations"][i % 3]), since: Math.min(2025, founded + r.int(1, 7)) }));
      bz.faqs = [...FAQS[0](bz, disp), ...FAQ_TIPO[si]].map(([qq, a]) => ({ q: qq, a }));
      // catálogo: todas las secciones, de cada una la mayoría de los artículos
      const COL = [["negro", "black"], ["blanco", "white"], ["azul marino", "navy"], ["rojo", "red"], ["beige", "beige"], ["verde", "green"], ["vino", "burgundy"], ["gris", "gray"]];
      const sections = C[si].map(([en, ee, lista0]) => ({ n: [en, ee], items: lista0.filter(() => r.chance(0.92)).flatMap((x) => { const c1 = r.pick(COL); return [x, ...(r.chance(0.55) ? [[`${x[0]} · ${c1[0]}`, `${x[1]} · ${c1[1]}`, Math.round(x[2] * 1.05 / 100) * 100, x[3], x[4], x[5], x[6]]] : [])]; }).map((x) => ({ es: x[0], en: x[1], p: Math.max(300, Math.round((x[2] * (0.93 + r() * 0.16)) / 100) * 100 - (x[2] >= 2000 ? 100 : 0)), sz: x[3], ph: x[4], de: x[5], den: x[6], u: x[3] === "u" })) })).filter((s) => s.items.length);
      let sql = `  insert into retail_settings (business_id, ebt, cash, weighs_front, sub_default, slot_cap, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_every_days, lay_cancel_pct)
  values (b, false, true, false, 'call', ${r.pick([4, 6, 8])}, ${hold}, ${ret}, ${layaway}, 20, 4, 14, 10) on conflict (business_id) do nothing;
  insert into delivery_settings (business_id, pickup, delivery, pay_card, pay_cash_pickup, ship, ship_fee_cents, ship_free_over_cents, ship_days, prep_min, pickup_note)
  values (b, true, false, true, true, ${ship}, ${ship ? 799 : 0}, ${ship ? 7500 : 0}, '3-5', 20, ${j(bi("Pasa por la caja con tu número de apartado.", "Stop by the register with your hold number."))}) on conflict (business_id) do nothing;
`;
      const flat = [];
      sections.forEach((s, ssi) => {
        sql += `  insert into item_sections (business_id, module, name, sort) values (b, 'shop', ${j(bi(s.n[0], s.n[1]))}, ${ssi}) returning id into s;\n`;
        s.items.forEach((it, ii) => {
          const tallas = it.u ? null : Z[it.sz];
          const stock = tallas ? tallas.map(() => (r.chance(0.18) ? 0 : r.int(1, 6))) : null;
          if (stock && stock.every((x) => x === 0)) stock[2] = 2;
          const f = { ord: flat.length + 1, es: it.es, en: it.en, p: it.p, tallas, stock, unit: "u", tax: it.u ? 6 : 0, key: "t" };
          flat.push(f);
          sql += `  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort, featured, sold_out)
    values (b, 'shop', s, ${j(bi(it.es, it.en))}, ${j(bi(it.de || "", it.den || ""))}, ${it.p}, 'u', ${f.tax}, array[${q(photoUrl(it.ph))}]::text[], ${tallas ? "'talla'" : "'unid'"}, false, 0, false, ${tallas ? j(bi("Talla", "Size")) : "null"}, '{}', false, ${ii}, ${ii === 0 && r.chance(0.5)}, false) returning id into i;\n`;
          if (tallas) tallas.forEach((t, z) => { sql += `  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, ${q(t)}, ${z}, ${stock[z]});\n`; });
        });
      });
      bz.flat = flat; bz.sqlExtra = sql;
      const baratos = flat.filter((x) => x.p >= 1500);
      bz.attrs = { m: "shop", hold_hours: hold, tarjeta: { eta: bi(`Aparta ${hold} h · pagas en la caja`, `${hold} h hold · pay at the register`), fee: bi(`${flat[0].es} desde ${money(Math.min(...flat.map((x) => x.p)))}`, `${flat[0].en} from ${money(Math.min(...flat.map((x) => x.p)))}`) } };
      void baratos;
      const posts = genNov(r, bz, flat, {
        oferta: "Hasta el domingo. Aparta tu talla en la app y pagas en la caja.", hoy: (x) => `Llegó ${x.es.toLowerCase()} nuevo`, hoyB: "Quedan pocas tallas. Apártalo en la app.",
        encuesta: { t: "¿Qué quieres que traigamos?", b: "Vota y lo pedimos para la próxima temporada.", o: ["Más tallas grandes", "Más colores de temporada", "Ropa de fiesta"] },
        avisoT: "cerramos temprano", cupon: { t: "Cupón de seguidores: $5 en tu apartado", b: "Para quien nos sigue: $5 de descuento en compras desde $40.", pref: "MODA", off: 500, min: 4000 },
        nov2: [["Llegó la colección de temporada", "Nuevas tallas y colores esta semana."], ["Ahora puedes apartar desde la app", "Elige tu talla y pasa a probártelo; no se cobra nada antes."], ["Hacemos ajustes en tres días", "Bajos, mangas y cintura."]],
        nov3: ["Gracias por 10 años vistiéndote", "Entre nuestros clientes más fieles sorteamos una tarjeta de regalo."],
      });
      const o1 = flat.find((x) => x.ord === posts[0].it);
      bz.attrs.tarjeta.offer = bi(`${o1.es} desde ${money(posts[0].now)} hasta el domingo`, `${o1.en} from ${money(posts[0].now)} through Sunday`);
      const nOps = r.int(...[[50, 120], [40, 100], [40, 100], [25, 70], [25, 70]][si]);
      const ops = genHolds(r, bz, flat, disp, si, nOps, baseOps);
      baseOps += ops.length + 5;
      const nRev = Math.min(80, Math.max(20, Math.round(ops.filter((o) => o.st === "done").length * r.pick([0.3, 0.4, 0.5]))));
      const reviews = genRes(r, ops, nRev, {
        vale: (o) => o.st === "done", srcDe: (o) => (o.co === "envio" ? "dl" : "pk"), recDe: (o) => o.L.slice(0, 2).map((x) => x[0]), nombreDe: (o) => { const x = flat[o.L[0][0] - 1]; return { es: x.es, en: x.en }; },
        resp: (rr, s) => (s >= 5 ? { trato: 1, caja: 1, tenian: 1, talla: 1, guardo: 1, cambio: rr.pick(["ok", "na"]) } : s === 4 ? { trato: 1, caja: 1, tenian: 1, talla: rr.pick([1, 0]), guardo: 1, cambio: "na" } : s === 3 ? { trato: 0, caja: rr.pick([1, 0]), tenian: 0, talla: 0, guardo: 1, cambio: "na" } : { trato: -1, caja: 0, tenian: 0, talla: -1, guardo: 0, cambio: rr.pick(["no", "na"]) }),
        es: { 5: ["Aparté {d} en la app y lo tenían listo en mi talla. {x}", "Me quedó perfecto {d}; la atención fue excelente. {x}", "Muy buen precio por {d} y la calidad se nota. {x}", "Encontré {d} tal como lo vi en la página. {x}", "Me ayudaron a encontrar mi talla de {d}. {x}"],
          4: ["Buena tienda; {d} me gustó, aunque tuve que esperar en la caja. {x}", "Lindo {d} y buen precio. {x}", "Todo bien con {d}; me gustaría más colores. {x}"], 3: ["El {d} estaba bien pero no tenían mi talla. {x}", "Tardaron en atenderme en la caja. {x}"], 2: ["Aparté {d} y al llegar ya no estaba mi talla. {x}", "La calidad de {d} no fue la que esperaba. {x}"],
          x5: ["Los recomiendo.", "Voy a volver.", "Atención muy amable.", "Gracias por todo.", "Ya somos clientes de años."], x3: ["Espero que mejoren.", "Les doy otra oportunidad."] },
        en: { 5: ["I held {d} in the app and it was ready in my size. {x}", "{d} fit perfectly; excellent service. {x}", "Great price for {d} and the quality shows. {x}", "They helped me find my size in {d}. {x}"], 4: ["Nice store; I liked {d}, though the register line was long. {x}", "Lovely {d} and a fair price. {x}"],
          3: ["The {d} was fine but they did not have my size. {x}", "Service at the register was slow. {x}"], 2: ["I held {d} and when I arrived my size was gone. {x}", "The quality of {d} was not what I expected. {x}"], x5: ["Highly recommend.", "I will be back.", "Very friendly.", "Customers for years."], x3: ["Hope they improve.", "I will give them another chance."] },
        rEs5: ["Gracias por tu reseña. Aquí te esperamos.", "Un gusto atenderte. Vuelve pronto.", "Gracias por tu confianza; se la paso al equipo."], rEs3: ["Gracias por avisarnos. Estamos ajustando las existencias por talla; escríbenos y lo resolvemos.", "Lamentamos la espera. Tomamos nota para atender más rápido en la caja."], rEn5: ["Thank you for your review. See you soon.", "Our pleasure. Come back soon."], rEn3: ["Thank you for telling us. We are adjusting stock by size; message us and we will make it right."],
      });
      bz.hist = { ops, reviews, posts };
      negocios.push(bz);
    }
  }
  return negocios;
}

function genHolds(r, b, flat, disp, si, nOps, base) {
  const maxD = maxDiasDe(b.founded);
  const pick = () => flat[r.int(0, flat.length - 1)];
  const reg = Array.from({ length: 30 }, () => r.int(0, 246));
  const ops = [];
  const MALOS = [["cancelled", "user", "Ya no la necesito."], ["cancelled", "business", "Se vendió en la tienda."], ["declined", null, null], ["expired", null, null], ["expired", null, null, "acc"], ["expired", null, null, "acc"]];
  for (let k = 0; k < nOps; k++) {
    let d = k < 14 ? r.int(0, 29) : dias(r, maxD), h, t = 0;
    while (t++ < 14) { const wd = ((new Date(Date.UTC(2026, 10, 17)).getUTCDay() - d) % 7 + 7) % 7; h = b.hours[wd]; if (h.open) break; d += 1; }
    const rg = h.ranges[0].map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)));
    const m = r.int(rg[0] + 20, Math.max(rg[0] + 21, rg[1] - 60));
    const envio = disp.ship && r.chance(0.2);
    const nL = si === 3 ? r.pick([1, 1, 2]) : r.int(1, 3);
    const L = [], used = new Set();
    let sub = 0;
    for (let l = 0; l < nL; l++) {
      const it = pick();
      if (used.has(it.ord)) continue;
      used.add(it.ord);
      const qty = si === 3 ? 1 : r.pick([1, 1, 1, 2]);
      const lab = it.tallas ? r.pick(it.tallas) : null;
      L.push([it.ord, qty, it.p, lab, it.tax]);
      sub += qty * it.p;
    }
    const tax = Math.round(L.reduce((s, x) => s + (x[1] * x[2] * x[4]) / 100, 0));
    const dlv = envio ? (sub >= 7500 ? 0 : 799) : 0;
    const bad = r.chance(0.12) ? r.pick(MALOS) : null;
    const op = { q: base + k, n: `A-${5000000 + base + k}`, d, m, u: r.chance(0.45) ? r.pick(reg) : r.int(0, 246), co: envio ? "envio" : "tienda", st: bad ? bad[0] : "done", sub: sub + tax, dlv, tot: sub + tax + dlv, pm: envio ? "a" : "l", L };
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
    ops.push({ q: base + idx, n: `A-${5000000 + base + idx}`, d: 0, m: 720, fut: 1, u: r.int(0, 246), co: "tienda", st: "confirmed", sub: it.p, dlv: 0, tot: it.p, pm: "l", L: [[it.ord, 1, it.p, it.tallas ? it.tallas[2] : null, it.tax]], det: { dia: new Date(Date.UTC(2026, 10, 18)).toISOString().slice(0, 10), hora: 720 } });
  }
  return ops;
}
