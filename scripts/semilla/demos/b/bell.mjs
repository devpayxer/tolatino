/* NEG-BELL · 5 subcategorías principales (las 5 primeras del catálogo por `sort`): barbería, barbero a domicilio, cortes para niños,
   barba y arreglo masculino, salón de belleza. 10 negocios cada una. */
import { rngDe, usd, redondeo, desdeDia, sumaDias, diaN, HOY } from "./comun.mjs";
import { crear, poner, horario, persona, precio, bi, reiniciarIds } from "./negocio.mjs";
import { citasHistoria } from "./citas.mjs";
import { resenas, novedades, seguidores } from "./historia.mjs";

const CAT = "NEG-BELL";

/* [sección, es, en, descEs, descEn, precio, min, buffer, desde?, extra?, núcleo?] */
const S = (sec, es, en, de, dn, p, d, o = {}) => ({ sec, es, en, de, dn, p, d, buf: o.buf ?? 5, from: !!o.from, extra: !!o.extra, core: !!o.core, dep: o.dep ?? 0 });

const SUBS = [
  {
    sub: "NEG-BELL-01", tipo: "barberia", modelo: "chair", quien: ["h", "n"],
    nombres: ["Barbería La Esquina Fresca", "Los Duros del Fade", "Barbería Tres Coronas", "El Taller del Barbero", "Fade Kings Latino", "Barbería Don Chepe", "Navaja y Estilo", "Barbería El Maestro Fino", "Cortes Criollos", "Barbería Patio Quisqueyano"],
    secs: ["Cortes | Cuts", "Barba | Beard", "Niños | Kids", "Extras | Extras"],
    svc: [
      S(0, "Corte clásico", "Classic cut", "Máquina y tijera, con lavado.", "Clippers and scissors, with wash.", 2200, 30, { from: true, core: true }),
      S(0, "Fade", "Fade", "Low, mid o high, terminado con navaja.", "Low, mid or high, finished with a razor.", 2700, 40, { from: true, core: true }),
      S(0, "Corte + barba", "Cut + beard", "Fade y barba perfilada con toalla caliente.", "Fade and shaped beard with a hot towel.", 3700, 55, { from: true, core: true }),
      S(0, "Corte con tijera", "Scissor cut", "Solo tijera, para pelo largo o rizado.", "Scissors only, for long or curly hair.", 3000, 40),
      S(0, "Buzz cut", "Buzz cut", "Una sola medida, rápido.", "One length, quick.", 1500, 20),
      S(1, "Arreglo de barba", "Beard trim", "Perfilado con navaja.", "Shaped with a razor.", 1400, 20, { from: true, core: true }),
      S(1, "Afeitado clásico", "Classic shave", "Toalla caliente y navaja.", "Hot towel and straight razor.", 2200, 30),
      S(1, "Tinte de barba", "Beard color", "Cubre las canas con un color natural.", "Covers gray with a natural color.", 2000, 25),
      S(2, "Corte de niño", "Kids cut", "Hasta 12 años.", "Up to 12 years old.", 1800, 25, { core: true }),
      S(2, "Primer corte", "First haircut", "Con paciencia y un dulce.", "With patience and a lollipop.", 1500, 20),
      S(3, "Diseño o líneas", "Design or lines", "Líneas o un diseño en la nuca.", "Lines or a design at the nape.", 500, 10, { extra: true }),
      S(3, "Cejas con navaja", "Razor brows", "Perfilado con navaja.", "Shaped with a razor.", 500, 5, { extra: true }),
      S(3, "Lavado y masaje capilar", "Wash and scalp massage", "Con champú y toalla caliente.", "Shampoo and a hot towel.", 700, 10, { extra: true }),
    ],
    about: [
      ["Barbería de barrio en {st} desde {y}. {o} y su equipo cortan todos los días: fades limpios, barba perfilada y buena conversación. Llegas y esperas turno, o reservas con el barbero que quieras.", "Neighborhood barbershop on {st} since {y}. {o} and the crew cut every day: clean fades, shaped beards and good conversation. Walk in and wait, or book the barber you want."],
      ["En {st} llevamos desde {y} cuidando el corte de {c}. Cada silla tiene su agenda, sus precios y sus reseñas; el que llega sin cita se sienta y espera su turno con un café.", "On {st} since {y}, looking after {c}'s haircuts. Each chair has its own schedule, prices and reviews; walk-ins sit down with a coffee and wait their turn."],
      ["{n} abrió en {y} con una silla y hoy somos un equipo. Fade, tijera, barba y niños. Ambiente latino, música y navajas limpias.", "{n} opened in {y} with one chair and today we are a team. Fade, scissors, beard and kids. Latino vibe, music and clean razors."],
      ["Más de {a} años cortando en {c}. Aquí se viene por el corte y se vuelve por el trato: hablamos español e inglés y respetamos tu hora.", "Over {a} years cutting hair in {c}. People come for the cut and return for the treatment: we speak Spanish and English and respect your time."],
    ],
    horas: (r) => [r.chance(0.5) ? [600, 900] : null, null, [540, 1170], [540, 1170], [540, 1170], [540, 1200], [540, 1200]].map((x, i) => (i === 1 ? [540, 1170] : x)),
    faqs: [
      ["¿Necesito cita? | Do I need an appointment?", "No siempre. Puedes llegar y esperar turno, pero con cita en la app tienes tu hora asegurada con el barbero que quieras. | Not always. You can walk in and wait, but booking in the app secures your time with the barber you want."],
      ["¿Cortan a niños? | Do you cut kids' hair?", "Sí, hasta 12 años tienen su precio de niño. Los más chiquitos pasan primero si vienen con prisa. | Yes, kids up to 12 have their own price. The smallest ones go first if they are in a hurry."],
      ["¿Qué pasa si llego tarde? | What if I arrive late?", "Tenemos 15 minutos de tolerancia. Pasado ese tiempo, el barbero puede dar tu hora a otro cliente. | We allow 15 minutes. After that, the barber may give your time to another client."],
      ["¿Aceptan tarjeta? | Do you take cards?", "Sí, tarjeta, efectivo y la app. El depósito de la cita se descuenta del total. | Yes, card, cash and the app. The booking deposit is deducted from the total."],
    ],
  },
  {
    sub: "NEG-BELL-02", tipo: "domicilio", modelo: "emp", quien: ["h", "n"],
    nombres: ["Barbero en Casa", "Domicilio Fino Cuts", "Tijeras Móviles", "El Barbero Ambulante", "Corte a la Puerta", "Barbería Móvil El Gallo", "Fade a Domicilio JR", "Tu Barbero Contigo", "Cortes Sobre Ruedas", "Barbero Express Familiar"],
    secs: ["Cortes en casa | Cuts at home", "Barba | Beard", "Familia | Family", "Extras | Extras"],
    svc: [
      S(0, "Corte a domicilio", "At-home cut", "Voy a tu casa con todo mi equipo.", "I come to your home with all my gear.", 3500, 40, { from: true, core: true, buf: 15 }),
      S(0, "Fade a domicilio", "At-home fade", "Low, mid o high, terminado con navaja.", "Low, mid or high, finished with a razor.", 4000, 50, { from: true, core: true, buf: 15 }),
      S(0, "Corte + barba a domicilio", "At-home cut + beard", "Fade y barba perfilada en tu sala.", "Fade and shaped beard in your living room.", 5500, 65, { from: true, core: true, buf: 15 }),
      S(1, "Arreglo de barba a domicilio", "At-home beard trim", "Perfilado con navaja.", "Shaped with a razor.", 2200, 25, { core: true, buf: 15 }),
      S(2, "Corte de niño en casa", "Kids cut at home", "Hasta 12 años, sin salir de casa.", "Up to 12 years old, without leaving home.", 2500, 30, { buf: 15 }),
      S(2, "Corte para abuelos", "Senior cut", "Con calma y sin que tengan que salir.", "Calm, and they do not have to go out.", 2800, 35, { buf: 15 }),
      S(2, "Dos o más cortes en la misma casa", "Two or more cuts, same home", "Precio por persona a partir de dos cortes.", "Per-person price from two cuts.", 3000, 40, { from: true, buf: 10 }),
      S(3, "Cargo por distancia (más de 10 millas)", "Distance fee (over 10 miles)", "Se suma si estás fuera de la zona normal.", "Added if you are outside the normal zone.", 1000, 5, { extra: true }),
      S(3, "Diseño o líneas", "Design or lines", "Líneas o un diseño en la nuca.", "Lines or a design at the nape.", 500, 10, { extra: true }),
      S(3, "Cejas con navaja", "Razor brows", "Perfilado con navaja.", "Shaped with a razor.", 500, 5, { extra: true }),
    ],
    about: [
      ["Barbero a domicilio en {c} y alrededores desde {y}. {o} llega a tu casa con silla, capa y todo el equipo: cortes para toda la familia sin que nadie tenga que salir.", "Mobile barber in {c} and nearby since {y}. {o} comes to your home with chair, cape and all the gear: haircuts for the whole family without anyone leaving the house."],
      ["Desde {y} llevamos la barbería a tu puerta. Reservas la hora, {o} confirma y llega puntual. Ideal para abuelos, niños y quien no tiene tiempo.", "Since {y} we bring the barbershop to your door. You book a time, {o} confirms and arrives on time. Ideal for grandparents, kids and busy people."],
      ["{n}: corte y barba a domicilio. Atendemos {c} y un radio de unas 10 millas. Llevamos nuestra propia sábana y limpiamos al terminar.", "{n}: haircut and beard at your home. We cover {c} and about a 10-mile radius. We bring our own cape and clean up when done."],
    ],
    horas: () => [null, [600, 1200], [600, 1200], [600, 1200], [600, 1200], [600, 1260], [540, 1200]],
    faqs: [
      ["¿Hasta dónde llegan? | How far do you go?", "Cubrimos {c} y un radio de unas 10 millas. Más lejos se suma un cargo por distancia. | We cover {c} and about a 10-mile radius. Farther out adds a distance fee."],
      ["¿Qué necesito en casa? | What do I need at home?", "Una silla firme y un lugar con luz. Nosotros traemos capa, máquinas y escoba. | A sturdy chair and a well-lit spot. We bring the cape, clippers and a broom."],
      ["¿Pueden cortar a toda la familia? | Can you cut the whole family's hair?", "Sí. Desde dos personas hay precio de familia y reservamos el tiempo seguido. | Yes. From two people there is a family price and we book the time back to back."],
      ["¿Cómo pago? | How do I pay?", "Con tarjeta en la app o en efectivo al terminar. El depósito de la cita se descuenta. | By card in the app or cash at the end. The booking deposit is deducted."],
    ],
  },
  {
    sub: "NEG-BELL-03", tipo: "ninos", modelo: "emp", quien: ["n"],
    nombres: ["Peluquería Pequeños Reyes", "Mini Fade Kids", "Cortecitos Felices", "El Rincón del Chamaquito", "Barbería Los Principitos", "Pelo de Ángel Kids", "Tijeritas de Oro", "Cuarto de Barbero Junior", "Corte Chiquitín", "Barbitas y Bigotes Infantil"],
    secs: ["Cortes | Cuts", "Primeras veces | First times", "Extras | Extras"],
    svc: [
      S(0, "Corte de niño", "Kids cut", "Silla con carrito, dibujos y mucha paciencia.", "Car-shaped chair, cartoons and lots of patience.", 1800, 25, { core: true }),
      S(0, "Fade de niño", "Kids fade", "Degradado limpio, a su gusto.", "Clean fade, the way they like it.", 2200, 30, { core: true }),
      S(0, "Corte de bebé", "Baby haircut", "Para los más chiquitos, con mamá o papá al lado.", "For the littlest ones, with mom or dad next to them.", 1500, 20),
      S(0, "Corte de adolescente", "Teen cut", "De 13 a 17 años.", "Ages 13 to 17.", 2400, 30, { core: true }),
      S(1, "Primer corte con recuerdo", "First haircut keepsake", "Con certificado y un mechón guardado.", "With a certificate and a saved lock of hair.", 2500, 30),
      S(1, "Cita tranquila (sin ruido ni prisa)", "Quiet appointment (no noise, no rush)", "Más tiempo, luz baja y sin máquinas ruidosas al principio.", "More time, soft light and no loud clippers at first.", 2200, 40),
      S(1, "Corte para dos hermanos", "Two siblings cut", "Dos niños, un solo turno.", "Two kids, one visit.", 3200, 45),
      S(2, "Diseño o líneas", "Design or lines", "Líneas o una figura a su gusto.", "Lines or a shape of their choice.", 500, 10, { extra: true }),
      S(2, "Peinado para foto o fiesta", "Photo or party styling", "Gel suave y peinado listo.", "Soft gel and ready-to-go style.", 1200, 15, { extra: true }),
      S(2, "Gel o cera", "Gel or wax", "Un toque para que dure el día.", "A touch to last all day.", 400, 5, { extra: true }),
    ],
    about: [
      ["Peluquería para niños en {c} desde {y}. Sillas con forma de carro, dibujos en la pared y {o}, que tiene paciencia de santa. Sin gritos ni lágrimas, casi siempre.", "Kids' haircut shop in {c} since {y}. Car-shaped chairs, cartoons on the wall and {o}, who has the patience of a saint. No screaming or tears, almost always."],
      ["En {n} cortamos pelo de niños desde {y}. Primer corte, fade de escuela y peinado de fiesta. Los papás esperan sentados con café.", "At {n} we have been cutting kids' hair since {y}. First haircuts, school fades and party styling. Parents wait seated with coffee."],
      ["Desde {y}, el lugar de {c} para los chamacos. Atendemos desde bebés hasta adolescentes y tenemos horas tranquilas para los que se asustan.", "Since {y}, {c}'s place for the little ones. We serve babies through teenagers and have quiet hours for the ones who get scared."],
    ],
    horas: (r) => [null, null, [600, 1080], [600, 1080], [600, 1140], [600, 1140], [540, 1080]].map((x, i) => (i === 1 && r.chance(0.5) ? [600, 1020] : x)),
    faqs: [
      ["¿Desde qué edad cortan? | From what age do you cut?", "Desde bebés. El corte de bebé se hace con mamá o papá al lado. | From babies. Baby haircuts are done with mom or dad beside them."],
      ["Mi hijo se asusta con las máquinas | My child is afraid of clippers", "Tenemos cita tranquila: más tiempo, luz baja y empezamos con tijera. | We have quiet appointments: more time, soft light and we start with scissors."],
      ["¿Puedo quedarme con él? | Can I stay with him?", "Claro, los papás se sientan junto a la silla. | Of course, parents sit next to the chair."],
      ["¿Hay precio para hermanos? | Is there a siblings price?", "Sí, dos hermanos en un solo turno tienen un precio especial. | Yes, two siblings in one visit get a special price."],
    ],
  },
  {
    sub: "NEG-BELL-04", tipo: "barba", modelo: "emp", quien: ["h"],
    nombres: ["La Barba del Patrón", "Barba Fina Studio", "Caballeros del Filo", "Navaja de Oro Caballeros", "Barbería Don Facundo", "El Arreglo Perfecto", "Barba y Bigote Boricua", "Salón de Caballeros El Gran Señor", "Filo y Fino", "Barbería El Bigote Dorado"],
    secs: ["Barba | Beard", "Caballero | Gentleman", "Extras | Extras"],
    svc: [
      S(0, "Barba completa", "Full beard sculpt", "Medida, perfilado y aceite.", "Sizing, shaping and oil.", 2800, 35, { core: true }),
      S(0, "Afeitado con navaja", "Straight razor shave", "Toalla caliente, espuma y navaja de filo.", "Hot towel, lather and a straight razor.", 3000, 40, { core: true }),
      S(0, "Arreglo rápido de barba", "Quick beard trim", "Para mantener la forma entre citas.", "To keep the shape between visits.", 1600, 20, { core: true }),
      S(0, "Recorte de bigote", "Mustache trim", "Limpio y a la medida.", "Clean and sized to fit.", 1000, 15),
      S(0, "Tinte de barba", "Beard color", "Color natural que cubre las canas.", "Natural color that covers gray.", 2500, 30),
      S(1, "Corte + barba", "Cut + beard", "Corte de caballero y barba perfilada.", "Gentleman's cut and shaped beard.", 4200, 60, { core: true }),
      S(1, "Corte de caballero", "Gentleman's cut", "Tijera y máquina, con acabado a navaja.", "Scissors and clippers, razor finish.", 2800, 35, { core: true }),
      S(1, "Facial para hombre", "Men's facial", "Limpieza, vapor y mascarilla.", "Cleansing, steam and mask.", 3500, 35),
      S(1, "Tratamiento de vapor para la barba", "Steam beard treatment", "Suaviza y quita la picazón.", "Softens and relieves itching.", 2000, 20),
      S(2, "Cejas con navaja", "Razor brows", "Perfilado con navaja.", "Shaped with a razor.", 500, 5, { extra: true }),
      S(2, "Aceite y bálsamo", "Oil and balm finish", "Para terminar con brillo.", "To finish with shine.", 600, 5, { extra: true }),
      S(2, "Toalla caliente", "Hot towel add-on", "Un toque de calma al final.", "A touch of calm at the end.", 500, 5, { extra: true }),
    ],
    about: [
      ["Estudio de barba y arreglo masculino en {c}. Desde {y} cuidamos la barba como se merece: navaja, toalla caliente y mucha paciencia. {o} atiende solo con cita para no apurarte.", "Beard and men's grooming studio in {c}. Since {y} we have cared for beards the way they deserve: straight razor, hot towel and patience. {o} sees clients by appointment so you are never rushed."],
      ["En {st} desde {y}: barba, bigote y afeitado clásico. Un lugar tranquilo para caballeros que quieren salir impecables.", "On {st} since {y}: beards, mustaches and the classic shave. A quiet place for gentlemen who want to leave looking sharp."],
      ["{n} nació en {y} de una idea sencilla: que un hombre pueda afeitarse con navaja como antes. Hoy también hacemos corte, facial y tinte de barba.", "{n} was born in {y} from a simple idea: a man should be able to get a straight-razor shave like before. Today we also do cuts, facials and beard color."],
    ],
    horas: () => [null, null, [600, 1140], [600, 1140], [600, 1200], [600, 1200], [600, 1080]],
    faqs: [
      ["¿Es solo con cita? | Is it by appointment only?", "Sí, para darte el tiempo que necesita una barba bien hecha. Reservas en la app. | Yes, to give you the time a good beard needs. Book in the app."],
      ["¿Cuánto dura un afeitado con navaja? | How long is a straight-razor shave?", "Unos 40 minutos con toalla caliente. | About 40 minutes with a hot towel."],
      ["¿Qué hago antes de venir? | What should I do before coming?", "Nada especial. Si traes foto del estilo que quieres, mejor. | Nothing special. A photo of the style you want helps."],
      ["¿Venden productos? | Do you sell products?", "Tenemos aceite y bálsamo para la barba en el local. | We have beard oil and balm in the shop."],
    ],
  },
  {
    sub: "NEG-BELL-05", tipo: "salon", modelo: "emp", quien: ["m", "q"],
    nombres: ["Salón Divas del Caribe", "Estética Marisol", "Salón Rizos y Más", "Belleza Tropical", "Salón Mil Colores", "Estilo Latino Beauty", "Salón La Reina del Peinado", "Glamour Dominicano Salón", "Salón Yesenia", "Belleza Pura Vida"],
    secs: ["Corte y peinado | Cut and style", "Color | Color", "Tratamientos | Treatments", "Novias y fiestas | Brides and parties", "Extras | Extras"],
    svc: [
      S(0, "Corte de dama", "Women's cut", "Con lavado y secado.", "With wash and blow-dry.", 4000, 45, { from: true, core: true, buf: 10 }),
      S(0, "Secado y peinado", "Blow-dry and style", "Brushing o ondas, como lo pidas.", "Blowout or waves, as you ask.", 3000, 40, { core: true, buf: 10 }),
      S(0, "Planchado", "Flat iron", "Liso con plancha y protector de calor.", "Straight with a flat iron and heat protectant.", 2500, 30, { buf: 10 }),
      S(0, "Corte de niña", "Girls' cut", "Hasta 12 años.", "Up to 12 years old.", 2500, 30, { buf: 10 }),
      S(1, "Tinte de raíz", "Root color", "Retoque de raíz con producto sin amoníaco.", "Root touch-up with ammonia-free color.", 5500, 90, { from: true, core: true, buf: 10 }),
      S(1, "Tinte completo", "Full color", "Todo el largo, con tratamiento.", "Full length, with treatment.", 8500, 120, { from: true, buf: 10 }),
      S(1, "Mechas", "Highlights", "Mechas o reflejos a tu gusto.", "Highlights to your taste.", 12000, 150, { from: true, buf: 15 }),
      S(1, "Balayage", "Balayage", "Degradado de color natural.", "Natural color gradient.", 16000, 180, { from: true, buf: 15, dep: 2000 }),
      S(2, "Keratina", "Keratin smoothing", "Reduce el frizz por meses.", "Reduces frizz for months.", 15000, 150, { from: true, buf: 15, dep: 2000 }),
      S(2, "Hidratación profunda", "Deep conditioning", "Mascarilla y vapor.", "Mask and steam.", 3500, 40, { core: true, buf: 10 }),
      S(2, "Alisado dominicano", "Dominican blowout", "Secado a mano y plancha, liso y con movimiento.", "Hand blow-dry and flat iron, smooth with movement.", 4500, 60, { core: true, buf: 10 }),
      S(3, "Peinado de fiesta", "Party style", "Para bodas, graduaciones y cumpleaños.", "For weddings, graduations and birthdays.", 6000, 60, { buf: 10 }),
      S(3, "Peinado de novia (con prueba)", "Bridal style (with trial)", "Prueba un mes antes y el día de la boda.", "A trial a month before and the wedding day.", 15000, 120, { buf: 15, dep: 5000 }),
      S(3, "Peinado de quinceañera", "Quinceañera style", "Peinado y retoque para el gran día.", "Style and touch-up for the big day.", 9000, 90, { buf: 15, dep: 3000 }),
      S(3, "Maquillaje", "Makeup", "Para fiesta, foto o evento.", "For a party, photos or an event.", 6500, 60, { buf: 10 }),
      S(4, "Cejas con cera o hilo", "Brow wax or thread", "Perfiladas a tu medida.", "Shaped to fit your face.", 1500, 15, { extra: true }),
      S(4, "Manicure", "Manicure", "Limado, cutícula y esmalte.", "Shaping, cuticle care and polish.", 2500, 35, { extra: true }),
    ],
    about: [
      ["Salón de belleza en {c} desde {y}. {o} y su equipo hacen corte, color, alisados y peinados de fiesta para toda la familia. Aquí te peinan como en casa, con cariño y buen café.", "Beauty salon in {c} since {y}. {o} and the team do cuts, color, smoothing and party styling for the whole family. Warm hospitality and good coffee."],
      ["En {st} desde {y}: tintes, mechas, keratina y el mejor alisado dominicano de {c}. Reserva con tu estilista de siempre o prueba una nueva.", "On {st} since {y}: color, highlights, keratin and {c}'s best Dominican blowout. Book your usual stylist or try someone new."],
      ["{n} abrió en {y} para que las mujeres de {c} se sintieran bellas sin gastar de más. Novias, quinceañeras y el día a día.", "{n} opened in {y} so the women of {c} could feel beautiful without overspending. Brides, quinceañeras and everyday looks."],
      ["Más de {a} años de salón. Trabajamos todo tipo de cabello, rizado, liso y teñido, con productos que cuidan el pelo.", "Over {a} years in the salon. We work with all hair types, curly, straight and colored, with products that care for your hair."],
    ],
    horas: (r) => [r.chance(0.4) ? [600, 900] : null, null, [540, 1110], [540, 1110], [540, 1170], [540, 1170], [540, 1080]],
    faqs: [
      ["¿Cuánto tarda un tinte? | How long does a color take?", "Una raíz, unas dos horas; un balayage puede tomar tres. Te damos la duración al reservar. | A root touch-up takes about two hours; balayage can take three. You see the time when you book."],
      ["¿Piden depósito? | Do you ask for a deposit?", "Solo para servicios largos y de fiesta (novia, quince, balayage). Se descuenta del total. | Only for long and party services (bridal, quince, balayage). It is deducted from the total."],
      ["¿Atienden cabello rizado? | Do you work with curly hair?", "Sí, cortamos en seco y tenemos productos para rizos. | Yes, we cut dry and carry curl products."],
      ["¿Puedo llevar una foto? | Can I bring a photo?", "Claro, trae la foto y la estilista te dice qué se puede lograr. | Of course, bring it and the stylist will tell you what is possible."],
    ],
  },
];

const STAFF_ROLE = {
  barberia: { owner: "Barbero · dueño | Barber · owner", renter: "Barbero · renta su silla | Barber · rents his chair", staff: "Barbero | Barber" },
  domicilio: { owner: "Barbero a domicilio · dueño | Mobile barber · owner", staff: "Barbero a domicilio | Mobile barber" },
  ninos: { owner: "Barbera de niños · dueña | Kids' barber · owner", staff: "Barbero de niños | Kids' barber" },
  barba: { owner: "Barbero · dueño | Barber · owner", staff: "Barbero | Barber" },
  salon: { owner: "Estilista · dueña | Stylist · owner", staff: "Estilista | Stylist", renter: "Estilista · renta su estación | Stylist · rents her station" },
};
const ESP = {
  barberia: ["Fade | Fade", "Barba | Beard", "Diseños | Designs", "Corte clásico | Classic cut"],
  domicilio: ["Corte a domicilio | At-home cuts", "Fade | Fade", "Cortes familiares | Family cuts"],
  ninos: ["Niños | Kids", "Primer corte | First haircut", "Paciencia | Patient with little ones"],
  barba: ["Afeitado con navaja | Straight razor", "Barba | Beard", "Facial | Facial"],
  salon: ["Color | Color", "Alisados | Smoothing", "Rizos | Curls", "Peinados de fiesta | Party styles"],
};

/* Bancos de reseñas, respuestas y novedades (es | en). {s} servicio, {p} persona, {c} ciudad, {n} negocio, {o} dueño. */
const BANCO = {
  pos: {
    open: ["Salí feliz con mi {s}. | I left happy with my {s}.", "{p} me hizo el mejor {s} que he tenido. | {p} gave me the best {s} I have ever had.", "Llevo años viniendo y nunca me han fallado. | I have been coming for years and they have never let me down.",
      "Atención de primera desde que entras. | First-class service from the moment you walk in.", "El lugar está limpio y el ambiente es bueno. | The place is clean and the vibe is good.", "Me recomendaron este lugar y valió la pena. | A friend recommended this place and it was worth it.",
      "Puntuales y cuidadosos con cada detalle. | On time and careful with every detail.", "Por fin encontré dónde arreglarme en {c}. | I finally found a place in {c} to get taken care of.", "Muy buen trato, hablan español y te explican todo. | Great treatment, they speak Spanish and explain everything.",
      "Fui con {p} por primera vez y ya soy cliente fijo. | I went to {p} for the first time and I am already a regular."],
    det: ["El {s} quedó parejo y duró semanas. | The {s} came out even and lasted weeks.", "{p} escucha lo que uno quiere y no se pasa. | {p} listens to what you want and never overdoes it.", "El precio es justo por la calidad. | The price is fair for the quality.",
      "La cita empezó a la hora que me dieron. | My appointment started right on time.", "Me lo dejaron como lo pedí, con foto y todo. | They did it exactly as I asked, photo and all.", "Hay café, buena música y nadie te apura. | There is coffee, good music and nobody rushes you.",
      "Lo reservé por la app en un minuto. | I booked it in the app in a minute.", "Se nota que saben lo que hacen. | You can tell they know what they are doing.", "Me explicaron cómo cuidarlo en casa. | They showed me how to take care of it at home.",
      "Mis hijos salieron contentos y yo también. | My kids left happy and so did I.", "Todo muy limpio, con herramientas desinfectadas. | Everything very clean, with sanitized tools."],
    close: ["Ya tienen un cliente fijo. | You have a regular customer now.", "Vuelvo el próximo mes. | I will be back next month.", "Se lo recomiendo a toda mi familia. | I recommend it to my whole family.", "Cinco estrellas sin pensarlo. | Five stars without thinking.", "Gracias por el buen servicio. | Thanks for the great service."],
  },
  mid: {
    open: ["Está bien, pero esperé más de lo que dijeron. | It is fine, but I waited longer than they said.", "El resultado fue bueno, aunque no exactamente lo que pedí. | The result was good, though not exactly what I asked for.", "Buen servicio, el precio me pareció un poco alto. | Good service, the price felt a bit high.", "Me atendieron bien pero el local estaba muy lleno. | They treated me well but the place was packed."],
    det: ["Con un poco más de puntualidad serían cuatro o cinco estrellas. | With a bit more punctuality it would be four or five stars.", "El {s} estuvo correcto, nada especial. | The {s} was decent, nothing special.", "{p} fue amable, pero tardó más de lo esperado. | {p} was kind, but took longer than expected."],
    midClose: ["Voy a darles otra oportunidad. | I will give them another chance.", "Espero que mejoren los tiempos de espera. | I hope the wait times improve."],
  },
  neg: {
    open: ["No quedé contento con el resultado. | I was not happy with the result.", "Esperé mucho más de lo que dijeron en la cita. | I waited much longer than what the booking said.", "Esperaba más por lo que cobran. | I expected more for what they charge."],
    det: ["El {s} quedó disparejo y tuve que arreglarlo en otro lado. | The {s} came out uneven and I had to get it fixed elsewhere.", "Nadie me avisó del retraso. | Nobody told me about the delay.", "Me cobraron un extra que no me explicaron antes. | They charged an extra nobody explained beforehand."],
  },
  rPos: ["Gracias por venir y por tus palabras. Te esperamos pronto. | Thanks for coming and for your kind words. See you soon.", "Nos alegra que hayas salido contento. Aquí tienes tu silla. | We are glad you left happy. Your chair is waiting.", "Gracias por la confianza. Un saludo de todo el equipo. | Thank you for trusting us. Greetings from the whole team.", "Qué bueno saberlo. Cualquier ajuste, escríbenos. | Great to hear. Message us for any touch-up."],
  rMid: ["Gracias por contarnos. Estamos ajustando los tiempos para respetar tu hora. | Thanks for telling us. We are adjusting schedules to respect your time.", "Tomamos nota de lo que dices. Ven otra vez y cuéntanos cómo te fue. | We took note. Come again and tell us how it goes."],
  rNeg: ["Lamentamos que no haya salido bien. Escríbenos y lo arreglamos sin costo. | We are sorry it did not go well. Message us and we will fix it at no charge.", "Gracias por avisarnos, nos importa. Pasa por el local y lo revisamos juntos. | Thank you for letting us know, it matters. Stop by and we will review it together.", "Tienes razón en lo del retraso. Ya cambiamos cómo damos las horas. | You are right about the delay. We have changed how we assign times."],
  answers: (est, r) => (r.chance(0.5) ? { wait: est >= 4 ? "a" : est === 3 ? "b" : "c" } : {}),
};

const NOV_BARBER = [
  { kind: "novedad", t: "Ya tomamos citas en la app | We now take bookings in the app", b: "Reserva tu hora con el barbero que quieras y llega sin esperar. | Book with the barber you want and walk in without waiting." },
  { kind: "novedad", t: "Nuevo barbero en el equipo | A new barber joins the team", b: "Ya puedes reservar su agenda desde la página. Bienvenido al equipo. | You can book their schedule from the page now. Welcome to the team." },
  { kind: "aviso", t: "Este lunes cerramos temprano | We close early this Monday", b: "Abrimos de 9 AM a 3 PM por un evento familiar. Gracias por entender. | We open 9 AM to 3 PM for a family event. Thanks for understanding.", day: "Lunes", hrs: "early", hrsT: "9 AM – 3 PM" },
  { kind: "oferta", t: "Corte + barba a precio especial | Cut + beard special price", b: "Solo esta semana, con cita. | This week only, with an appointment.", off: 0.82, it: (b) => b.items.find((x) => /barba/i.test(x.name.es) && /\+|completa/.test(x.name.es))?.sort ?? 0 },
  { kind: "hoy", t: "Turnos libres hoy por la tarde | Open spots this afternoon", b: "Pásate sin cita o reserva en la app. | Walk in or book in the app." },
  { kind: "encuesta", t: "¿Qué horario prefieres los sábados? | What Saturday hours do you prefer?", b: "", poll: ["Desde las 8 AM | From 8 AM", "Hasta las 8 PM | Until 8 PM", "Como está | As it is"] },
  { kind: "novedad", t: "Estrenamos nuevo local en {c} | We moved to a new shop in {c}", b: "Más espacio, más sillas y la misma calidad de siempre. | More room, more chairs and the same quality." },
  { kind: "novedad", t: "Regalamos tarjetas de lealtad | Loyalty cards are here", b: "A la décima visita, el corte es gratis. Pídela en tu próxima cita. | On your tenth visit the cut is free. Ask for it on your next visit." },
  { kind: "aviso", t: "Cerramos por el feriado | Closed for the holiday", b: "Volvemos al día siguiente con horario normal. | Back the next day on regular hours.", day: "Feriado", hrs: "closed", hrsT: "" },
  { kind: "novedad", t: "Cumplimos años en {c} | Our anniversary in {c}", b: "Gracias a los clientes que llevan con nosotros desde {y}. | Thank you to the clients who have been with us since {y}." },
];
const NOV_SALON = [
  { kind: "novedad", t: "Ya reservas tu cita en la app | You can now book in the app", b: "Elige estilista, servicio y hora en un minuto. | Pick stylist, service and time in a minute." },
  { kind: "novedad", t: "Llegó la keratina nueva | New keratin treatment is here", b: "Sin formol y con garantía de resultado. Pregunta por la prueba. | Formaldehyde-free with a results guarantee. Ask about a trial." },
  { kind: "aviso", t: "Horario de quinceañeras y bodas | Quince and wedding schedule", b: "Reserva con un mes de anticipación para tu prueba de peinado. | Book a month ahead for your hair trial.", day: "Todo el año", hrs: "early", hrsT: "Con cita" },
  { kind: "oferta", t: "Hidratación profunda con descuento | Deep conditioning discount", b: "Esta semana, con cualquier corte. | This week, with any cut.", off: 0.8, it: (b) => b.items.find((x) => /Hidratación|Secado/.test(x.name.es))?.sort ?? 0 },
  { kind: "hoy", t: "Turnos libres hoy | Open spots today", b: "Quedan espacios esta tarde para secado y peinado. | A few afternoon spots left for blow-dries and styling." },
  { kind: "encuesta", t: "¿Qué servicio quieres que agreguemos? | Which service should we add?", b: "", poll: ["Uñas | Nails", "Pestañas | Lashes", "Tratamiento facial | Facial"] },
  { kind: "novedad", t: "Nueva estilista en el equipo | New stylist on the team", b: "Especialista en rizos y color. Ya tiene agenda abierta. | Curl and color specialist. Her schedule is open." },
  { kind: "novedad", t: "Cumplimos años en {c} | Our anniversary in {c}", b: "Gracias por confiar en nosotras desde {y}. | Thank you for trusting us since {y}." },
  { kind: "aviso", t: "Cerramos por el feriado | Closed for the holiday", b: "Abrimos al día siguiente en horario normal. | Back the next day on regular hours.", day: "Feriado", hrs: "closed", hrsT: "" },
  { kind: "novedad", t: "Productos para rizos a la venta | Curl products in store", b: "Cremas y geles que usamos en el salón, ahora para tu casa. | The creams and gels we use in the salon, now for your home." },
];

function elegirServicios(r, cfg) {
  const base = cfg.svc.filter((s) => s.core), otros = cfg.svc.filter((s) => !s.core && !s.extra), extras = cfg.svc.filter((s) => s.extra);
  const L = [...base, ...otros.filter(() => r.chance(0.72)), ...extras.filter(() => r.chance(0.7))];
  if (L.length < 6) L.push(...otros.filter((s) => !L.includes(s)));
  return cfg.svc.filter((s) => L.includes(s));
}

export function construir(si, k, ord) {
  const cfg = SUBS[si], nombre = cfg.nombres[k];
  const b = crear({ cat: CAT, sub: cfg.sub, si, k, ord, nombre, mujer: cfg.tipo === "salon" || cfg.tipo === "ninos" ? true : cfg.tipo === "barberia" || cfg.tipo === "barba" || cfg.tipo === "domicilio" ? false : undefined });
  const r = b.r;
  b.factor = 0.88 + r() * 0.34;
  b.langs = r.chance(0.3) ? ["es", "en"] : ["es"]; if (cfg.tipo === "salon" && r.chance(0.5)) b.langs = ["es", "en"];
  b.subs = [cfg.sub, ...(cfg.tipo === "barberia" ? ["NEG-BELL-04", "NEG-BELL-03"].filter(() => r.chance(0.45)) : cfg.tipo === "salon" ? ["NEG-BELL-06", "NEG-BELL-08", "NEG-BELL-12"].filter(() => r.chance(0.4)) : cfg.tipo === "ninos" ? ["NEG-BELL-01"] : cfg.tipo === "domicilio" ? ["NEG-BELL-01"] : ["NEG-BELL-01"])];
  b.subs = [...new Set(b.subs)].slice(0, 3);
  const tamano = r.weighted([[1, 3], [2, 4], [3, 3]]);
  const anos = 2026 - b.founded;
  const aboutT = r.pick(cfg.about), f = (t) => t.replace(/\{o\}/g, b.owner.fn).replace(/\{st\}/g, b.calle).replace(/\{y\}/g, b.founded).replace(/\{c\}/g, b.cityNombre).replace(/\{n\}/g, nombre).replace(/\{a\}/g, anos);
  b.about = { es: f(aboutT[0]), en: f(aboutT[1]) };
  poner(b, CAT, cfg.sub, 6);
  b.mods = ["svc", "citas", "staff", "nov"];
  b.svcModel = cfg.modelo === "chair" ? "chair" : "emp";
  b.rent = b.svcModel === "chair" ? [10000, 12500, 15000, 17500][r.int(0, 3)] : null;
  b.operation = "local";
  if (cfg.tipo === "domicilio") b.radius = r.int(8, 15);
  // horario
  const H = cfg.horas(r).map((x) => (x ? x.slice() : null));
  horario(b, H);
  // equipo
  const nSill = cfg.tipo === "domicilio" || cfg.tipo === "barba" ? r.int(1, 2) : cfg.tipo === "ninos" ? r.int(2, 3) : cfg.tipo === "barberia" ? r.int(3, 5) : r.int(3, 6);
  const evitar = [b.owner.fn];
  b.members = [];
  const roleOwner = STAFF_ROLE[cfg.tipo].owner;
  const wkDe = (kind) => {
    const dias = H.map((h) => (h ? h : null));
    return dias.map((h) => (h ? [Math.max(8, h[0] / 60 + (kind === "renter" ? r.int(0, 2) : 0)), Math.min(21, h[1] / 60 - (kind === "renter" ? r.int(0, 2) : 0))] : null));
  };
  const nsm = (kind, esp) => ({ langs: b.langs.length > 1 || r.chance(0.3) ? ["es", "en"] : ["es"], spec: r.shuffle(ESP[cfg.tipo]).slice(0, 2).map(bi), since: r.int(b.founded, 2024), esp });
  b.members.push({ kind: "owner", name: `${b.owner.fn} ${b.owner.ln}`, nick: null, role: bi(roleOwner), seat: cfg.modelo === "chair" ? 1 : null, auto: r.chance(0.5), resp: [15, 30, 60][r.int(0, 2)], dep: 0, ...nsm("owner"), since: b.founded, bio: bi(`${cfg.tipo === "salon" ? "Estilista" : "Barbero"} desde hace ${anos} años. Atiende con cita para no apurarte. | ${cfg.tipo === "salon" ? "Stylist" : "Barber"} for ${anos} years. Books by appointment so you are never rushed.`) });
  for (let j = 1; j < nSill; j++) {
    const fem = cfg.tipo === "salon" || cfg.tipo === "ninos" ? r.chance(0.85) : false;
    const p = persona(r, fem, evitar); evitar.push(p.fn);
    const kind = cfg.modelo === "chair" ? (r.chance(0.6) ? "renter" : "staff") : (cfg.tipo === "salon" && r.chance(0.4) ? "staff" : "staff");
    const role = STAFF_ROLE[cfg.tipo][kind] ?? STAFF_ROLE[cfg.tipo].staff;
    const wk = r.chance(0.55) ? wkDe(kind) : null;
    b.members.push({ kind, name: p.nombre, role: bi(role), seat: cfg.modelo === "chair" ? j + 1 : null, auto: r.chance(0.4), resp: [15, 30, 60][r.int(0, 2)], dep: 0, ...nsm(kind), wk, bio: bi(`${cfg.tipo === "salon" ? "Estilista" : "Barbero"} con ${r.int(3, 18)} años de oficio. | ${cfg.tipo === "salon" ? "Stylist" : "Barber"} with ${r.int(3, 18)} years of experience.`) });
  }
  // servicios y quién los hace
  const sv = elegirServicios(r, cfg);
  b.secs = cfg.secs.map(bi);
  const depDueno = r.chance(0.45) ? [500, 1000, 1000, 1500][r.int(0, 3)] : 0;
  b.pol = { auto: b.members[0].auto, resp: b.members[0].resp, exp: 2, dep: depDueno, cxh: [2, 4, 12, 24][r.int(0, 3)], tol: 15, pick: true };
  if (cfg.modelo === "chair") b.members[0].dep = depDueno;
  b.items = sv.map((s, n) => {
    const p = precio(b, s.p);
    const who = [];
    b.members.forEach((m, mi) => {
      if (s.extra) return;
      const ok = mi === 0 || r.chance(cfg.tipo === "salon" ? 0.55 : 0.9) || (s.core && r.chance(0.95));
      if (!ok) return;
      const delta = cfg.modelo === "chair" && mi > 0 ? [-200, -100, 0, 0, 100, 200][r.int(0, 5)] : 0;
      who.push({ m: mi, price: delta ? Math.max(500, p + delta) : null });
    });
    if (!s.extra && !who.length) who.push({ m: 0, price: null });
    const it = { sort: n, sec: s.sec, name: bi(`${s.es} | ${s.en}`), descr: bi(`${s.de} | ${s.dn}`), price: p, dur: s.d, buf: s.buf, from: s.from, extra: s.extra, who: s.extra ? [] : who, kind: null, attrs: {}, dep: 0 };
    it.photos = r.chance(0.7) && !s.extra ? [b.photos[(n + 1) % b.photos.length]] : [];
    return it;
  });
  // secciones sin servicios no se crean vacías: se compactan
  const usadas = [...new Set(b.items.map((x) => x.sec))].sort((a, c) => a - c), mapa = new Map(usadas.map((s, n) => [s, n]));
  b.secs = usadas.map((s) => bi(cfg.secs[s])); b.items.forEach((x) => { x.sec = mapa.get(x.sec); });
  // filtros, atributos y tarjeta
  const minimo = Math.min(...b.items.filter((x) => !x.extra).map((x) => x.price));
  const fv = ["cita", "online"]; if (cfg.tipo === "barberia" || cfg.tipo === "ninos") fv.push("walkin"); if (cfg.tipo === "domicilio") fv.push("domicilio"); if (cfg.tipo === "ninos" || b.items.some((x) => /niñ|kids/i.test(x.name.es))) fv.push("kids"); if (depDueno || b.items.some((x) => x.dep)) fv.push("deposit");
  b.fv = [...new Set(fv)];
  b.pay = depDueno ? ["local", "app"] : ["local"];
  b.attrs = { m: cfg.modelo === "chair" ? "chair" : cfg.tipo === "domicilio" ? "solo" : "shop", who: cfg.quien, bell: 1, ...(cfg.modelo === "chair" ? { chairs: b.members.length } : {}), ...(cfg.tipo === "domicilio" ? { soloCita: 1 } : {}),
    tarjeta: { eta: bi(cfg.tipo === "barberia" || cfg.tipo === "ninos" ? `Sin cita · se atiende por turno | Walk-ins welcome · served by turn` : cfg.tipo === "domicilio" ? `A domicilio en ${b.cityNombre} y ${b.radius} millas | At your home in ${b.cityNombre} and ${b.radius} miles` : `Con cita en la app | By appointment in the app`), fee: bi(`Desde ${usd(minimo)} | From ${usd(minimo, false)}`) } };
  b.amenities = r.shuffle(["wifi", "cafe", "estacionamiento", "tarjeta", "accesible"]).slice(0, 3);
  b.faqs = cfg.faqs.map(([q, a]) => ({ q: bi(q.replace(/\{c\}/g, b.cityNombre)), a: bi(a.replace(/\{c\}/g, b.cityNombre)) }));

  // historia
  const N = { 1: r.int(60, 95), 2: r.int(120, 190), 3: r.int(210, 300) }[tamano] * (cfg.tipo === "salon" ? 0.9 : 1);
  const peso = b.items.filter((x) => !x.extra).map((x) => ({ x, w: x.dur <= 40 ? 3 : 1 }));
  const elegir = (bb, rr) => {
    const item = rr.weighted(peso.map((p) => [p.x, p.w]));
    const poss = item.who.map((w) => w.m), conPeso = poss.map((m) => [m, m === 0 ? 1.7 : 1]);
    return { item, mi: rr.weighted(conPeso) };
  };
  const detalle = (bb, item, M, rr, ctx) => {
    const w = item.who.find((x) => b.members[x.m] === M), cents = w?.price ?? item.price;
    const dep = M === b.members[0] && b.pol.dep ? Math.min(b.pol.dep, cents) : 0;
    const kid = /niñ|kids|bebé|baby|adolesc|hermanos/i.test(item.name.es);
    return { det: { svc: item.name, opts: [], adds: [], para: kid ? "kid" : "me", nombre: null, edad: kid ? rr.int(3, 14) : null, sms: true, cualquiera: false, base: cents, sel: {} }, sub: cents, tot: cents, dep };
  };
  const { ops, hechas } = citasHistoria(b, r, { N: Math.round(N), proximas: r.int(4, 8), hooks: { elegir, detalle } });
  b.ops = ops;
  const rv = resenas(b, hechas, BANCO, r, { min: 22, max: 66 });
  b.reviews = rv.reseñas; b.helpful = rv.util;
  b.posts = novedades(b, cfg.tipo === "salon" ? NOV_SALON : NOV_BARBER, r, { n: r.int(7, 10) });
  b.follows = seguidores(b, r);
  b.lic = [];
  return b;
}

export function todos(inicio = 0) {
  reiniciarIds();
  const L = [];
  for (let si = 0; si < SUBS.length; si++) for (let k = 0; k < 10; k++) L.push(construir(si, k, inicio + si * 10 + k));
  return L;
}
export const sub5 = SUBS.map((s) => s.sub);
