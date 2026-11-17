/* R2 · FOOD · perfiles por tipo de negocio: horario, entrega, filtros, comodidades, textos (acerca de, preguntas frecuentes, cargo del dueño) y ritmo de pedidos. */
import { bi, horario, rango } from "../a/comun.mjs";

const T = (a, b) => rango(a, b);
const todos = (a, b) => ({ 0: T(a, b), 1: T(a, b), 2: T(a, b), 3: T(a, b), 4: T(a, b), 5: T(a, b), 6: T(a, b) });
const VERB = { cook: ["cocinamos", "cocinamos", "cocinando"], hornea: ["horneamos", "horneamos", "horneando"], prep: ["preparamos", "preparamos", "preparando"] };

/* dlv = probabilidad de que un pedido sea a domicilio (si hay ambas modalidades); lines = máx. líneas; qty = reparto de cantidades; ops = [mín, máx] de pedidos. */
export const PERFILES = {
  rest: { hours: () => horario({ 0: T("11:00", "20:00"), 1: T("11:00", "21:00"), 2: T("11:00", "21:00"), 3: T("11:00", "21:00"), 4: T("11:00", "21:00"), 5: T("11:00", "22:00"), 6: T("11:00", "22:00") }),
    d: { pickup: true, delivery: true, zone: 5, fee: 399, min: 1500, prep: 25, free: 5000 }, dlv: 0.45, lines: 4, qty: [1, 1, 1, 1, 2, 2, 3], ops: [70, 120], gen: false, coc: VERB.cook, team: [0, 1, 2], tpl: "rest",
    filter: ["delivery", "pickup", "dinein", "online"], amen: ["para-llevar", "mesas-adentro", "acepta-tarjeta", "estacionamiento"], role: ["cocinero", "cook"], auto: false, cashDlv: true },
  truck: { hours: () => horario({ 0: T("11:00", "17:00"), 2: T("11:00", "19:00"), 3: T("11:00", "19:00"), 4: T("11:00", "19:00"), 5: T("11:00", "21:00"), 6: T("11:00", "21:00") }),
    d: { pickup: true, delivery: false, zone: 3, fee: 0, min: 0, prep: 15, free: 0 }, dlv: 0, lines: 3, qty: [1, 1, 1, 2, 2, 3], ops: [60, 120], gen: false, coc: VERB.cook, team: [0, 1], tpl: "truck",
    filter: ["pickup", "online"], amen: ["para-llevar", "acepta-tarjeta"], role: ["cocinero", "cook"], auto: true, cashDlv: false },
  street: { hours: () => horario({ 0: T("12:00", "20:00"), 4: T("16:00", "22:00"), 5: T("16:00", "23:00"), 6: T("12:00", "23:00") }),
    d: { pickup: true, delivery: false, zone: 1, fee: 0, min: 0, prep: 10, free: 0 }, dlv: 0, lines: 3, qty: [1, 1, 1, 2, 2, 3], ops: [50, 95], gen: false, coc: VERB.cook, team: [0], tpl: "street",
    filter: ["pickup", "online"], amen: ["para-llevar"], role: ["vendedor", "vendor"], auto: true, cashDlv: false },
  dark: { hours: () => horario({ 0: T("11:00", "22:00"), 1: T("11:00", "23:00"), 2: T("11:00", "23:00"), 3: T("11:00", "23:00"), 4: T("11:00", "23:00"), 5: T("11:00", "23:00"), 6: T("11:00", "23:00") }),
    d: { pickup: false, delivery: true, zone: 5, fee: 499, min: 1800, prep: 30, free: 4500 }, dlv: 1, lines: 4, qty: [1, 1, 1, 2, 2, 3], ops: [80, 120], gen: false, coc: VERB.cook, team: [0, 2], tpl: "dark",
    filter: ["delivery", "noche", "online"], amen: ["acepta-tarjeta"], role: ["cocinero", "cook"], auto: true, cashDlv: false },
  snack: { hours: () => horario({ 0: T("11:00", "19:00"), 1: T("10:00", "20:00"), 2: T("10:00", "20:00"), 3: T("10:00", "20:00"), 4: T("10:00", "20:00"), 5: T("10:00", "21:00"), 6: T("10:00", "21:00") }),
    d: { pickup: true, delivery: true, zone: 3, fee: 349, min: 1200, prep: 15, free: 4000 }, dlv: 0.3, lines: 4, qty: [1, 1, 1, 2, 2, 3], ops: [60, 120], gen: true, coc: VERB.prep, team: [0, 1], tpl: "shop",
    filter: ["pickup", "delivery", "online"], amen: ["para-llevar", "acepta-tarjeta"], role: ["encargado", "owner"], auto: false, cashDlv: true },
  brunch: { hours: () => horario(todos("06:00", "15:00")),
    d: { pickup: true, delivery: true, zone: 5, fee: 399, min: 1500, prep: 20, free: 4000 }, dlv: 0.35, lines: 4, qty: [1, 1, 1, 2, 2, 3], ops: [70, 120], gen: false, coc: VERB.cook, team: [0, 1, 4], tpl: "brunch",
    filter: ["desayuno", "pickup", "delivery", "dinein", "online"], amen: ["mesas-adentro", "para-llevar", "acepta-tarjeta", "para-ninos"], role: ["cocinero", "cook"], auto: false, cashDlv: true },
  buffet: { hours: () => horario({ 0: T("11:00", "22:00"), 1: T("11:00", "21:00"), 2: T("11:00", "21:00"), 3: T("11:00", "21:00"), 4: T("11:00", "21:00"), 5: T("11:00", "21:00"), 6: T("11:00", "22:00") }),
    d: { pickup: true, delivery: true, zone: 5, fee: 599, min: 3000, prep: 45, free: 8000 }, dlv: 0.4, lines: 3, qty: [1, 1, 2, 2, 3, 4], ops: [55, 100], gen: false, coc: VERB.cook, team: [0, 1, 6], tpl: "buffet",
    filter: ["dinein", "catering", "pickup", "online"], amen: ["mesas-adentro", "acepta-tarjeta", "estacionamiento", "accesible", "para-ninos", "catering"], role: ["cocinero", "cook"], auto: false, cashDlv: true },
  bakery: { hours: () => horario({ 0: T("07:00", "14:00"), 1: T("06:00", "19:00"), 2: T("06:00", "19:00"), 3: T("06:00", "19:00"), 4: T("06:00", "19:00"), 5: T("06:00", "19:00"), 6: T("06:00", "19:00") }),
    d: { pickup: true, delivery: true, zone: 3, fee: 399, min: 1500, prep: 20, free: 4000 }, dlv: 0.25, lines: 4, qty: [1, 1, 1, 2, 2, 3], ops: [70, 120], gen: true, coc: VERB.hornea, team: [5, 1, 4], tpl: "bakery",
    filter: ["pickup", "delivery", "desayuno", "online"], amen: ["para-llevar", "acepta-tarjeta", "estacionamiento"], role: ["panadero", "baker"], auto: true, cashDlv: true },
  cafe: { hours: () => horario({ 0: T("07:00", "14:00"), 1: T("06:30", "17:00"), 2: T("06:30", "17:00"), 3: T("06:30", "17:00"), 4: T("06:30", "17:00"), 5: T("06:30", "17:00"), 6: T("07:00", "16:00") }),
    d: { pickup: true, delivery: true, zone: 1, fee: 299, min: 1200, prep: 10, free: 0 }, dlv: 0.15, lines: 4, qty: [1, 1, 1, 1, 2, 3], ops: [75, 120], gen: true, coc: VERB.prep, team: [4, 1], tpl: "cafe",
    filter: ["pickup", "desayuno", "online"], amen: ["para-llevar", "mesas-adentro", "acepta-tarjeta", "wi-fi"], role: ["barista", "barista"], auto: true, cashDlv: true },
  cake: { hours: () => horario({ 2: T("09:00", "18:00"), 3: T("09:00", "18:00"), 4: T("09:00", "18:00"), 5: T("09:00", "18:00"), 6: T("09:00", "15:00") }),
    d: { pickup: true, delivery: true, zone: 10, fee: 1500, min: 3500, prep: 120, free: 0 }, dlv: 0.5, lines: 2, qty: [1, 1, 1, 1, 2], ops: [45, 85], gen: true, coc: VERB.hornea, team: [5, 4], tpl: "cake",
    filter: ["pickup", "catering", "online"], amen: ["acepta-tarjeta", "catering"], role: ["repostero", "pastry chef"], auto: false, cashDlv: false },
  bar: { hours: () => horario(todos("10:00", "19:00")),
    d: { pickup: false, delivery: true, zone: 10, fee: 2500, min: 15000, prep: 120, free: 0 }, dlv: 1, lines: 2, qty: [1, 1, 1, 2], ops: [45, 75], gen: true, coc: VERB.prep, team: [6, 4], tpl: "bar",
    filter: ["catering", "online"], amen: ["catering", "acepta-tarjeta"], role: ["bartender", "bartender"], auto: false, cashDlv: false },
  ice: { hours: () => horario(todos("07:00", "20:00")),
    d: { pickup: true, delivery: true, zone: 10, fee: 900, min: 1500, prep: 30, free: 6000 }, dlv: 0.5, lines: 3, qty: [1, 1, 2, 2, 3, 5], ops: [70, 120], gen: true, coc: VERB.prep, team: [2, 1], tpl: "ice",
    filter: ["pickup", "delivery", "online"], amen: ["para-llevar", "acepta-tarjeta", "estacionamiento"], role: ["encargado", "owner"], auto: true, cashDlv: true },
};

const g = (fem, a, b) => (fem ? a : b);
export const CARGO = (p, fem) => {
  const [es, en] = PERFILES[p].role;
  const esF = { cocinero: "cocinera", vendedor: "vendedora", encargado: "encargada", panadero: "panadera", repostero: "repostera" }[es];
  return bi(`${g(fem, "Dueña", "Dueño")} y ${fem && esF ? esF : es}`, `Owner and ${en}`);
};

/* ¿Qué dice «acerca de»? n = nombre, w = [es, en] lo que vende, f = año, o = nombre del dueño, st = calle. */
const ABOUT = {
  rest: (n, w, f, o, st) => bi(`${n} sirve ${w[0]} desde ${f}. ${o} y su equipo preparan todo cada día con recetas de familia. Pide para recoger en ${st} o a domicilio dentro de la zona de entrega.`,
    `${n} has served ${w[1]} since ${f}. ${o} and the team prepare everything each day from family recipes. Order for pickup on ${st} or delivery within the delivery zone.`),
  truck: (n, w, f, o, st) => bi(`${n} lleva ${w[0]} sobre ruedas desde ${f}. ${o} cocina en el camión y avisa en Novedades dónde estaciona cada día; también atiende fiestas y eventos. Pide por la app y recoge en la ventana.`,
    `${n} has brought ${w[1]} on wheels since ${f}. ${o} cooks in the truck and posts in Updates where it parks each day; it also serves parties and events. Order in the app and pick up at the window.`),
  street: (n, w, f, o, st) => bi(`${n} vende ${w[0]} desde ${f}. ${o} atiende su puesto cerca de ${st} de jueves a domingo; pide por la app y recoge sin esperar la fila.`,
    `${n} has sold ${w[1]} since ${f}. ${o} runs the stand near ${st} Thursday to Sunday; order in the app and pick up without waiting in line.`),
  dark: (n, w, f, o, st) => bi(`${n} es una cocina solo para entrega, abierta desde ${f}: ${w[0]}, sin local abierto al público. ${o} cocina cada pedido al momento y lo manda a tu puerta.`,
    `${n} is a delivery-only kitchen open since ${f}: ${w[1]}, with no storefront. ${o} cooks each order fresh and sends it to your door.`),
  shop: (n, w, f, o, st) => bi(`${n} prepara ${w[0]} desde ${f}. ${o} atiende el mostrador en ${st}: todo se hace en el día, con buen precio. Pide para recoger o a domicilio.`,
    `${n} has made ${w[1]} since ${f}. ${o} runs the counter on ${st}: everything is made the same day at a fair price. Order for pickup or delivery.`),
  brunch: (n, w, f, o, st) => bi(`${n} sirve ${w[0]} desde ${f}. ${o} abre temprano en ${st}, con café recién hecho, platos de la casa y mesas para toda la familia. También para llevar.`,
    `${n} has served ${w[1]} since ${f}. ${o} opens early on ${st}, with fresh coffee, house dishes and tables for the whole family. Also to go.`),
  buffet: (n, w, f, o, st) => bi(`${n} ofrece ${w[0]} desde ${f}. ${o} y su equipo renuevan la barra durante todo el servicio en ${st}; también bandejas para eventos y buffet por libra para llevar.`,
    `${n} has offered ${w[1]} since ${f}. ${o} and the team refresh the bar throughout service on ${st}; also event trays and takeout buffet by the pound.`),
  bakery: (n, w, f, o, st) => bi(`${n} hornea ${w[0]} desde ${f}. ${o} empieza de madrugada en ${st}: el pan sale caliente cada mañana, con pedidos para cumpleaños y reuniones.`,
    `${n} has baked ${w[1]} since ${f}. ${o} starts before dawn on ${st}: bread comes out warm every morning, with orders for birthdays and gatherings.`),
  cafe: (n, w, f, o, st) => bi(`${n} sirve ${w[0]} desde ${f}. ${o} tuesta y prepara en ${st}: café del día, pan fresco y un rincón tranquilo para el trabajo o la charla. Pide para recoger.`,
    `${n} has served ${w[1]} since ${f}. ${o} roasts and brews on ${st}: coffee of the day, fresh bread and a quiet corner for work or conversation. Order for pickup.`),
  cake: (n, w, f, o, st) => bi(`${n} hace ${w[0]} desde ${f}. ${o} diseña y hornea cada encargo en ${st}; se pide con una semana de anticipación para cumpleaños, bodas, bautizos y quinceañeras.`,
    `${n} has made ${w[1]} since ${f}. ${o} designs and bakes every order on ${st}; book one week ahead for birthdays, weddings, baptisms and quinceañeras.`),
  bar: (n, w, f, o, st) => bi(`${n} ofrece ${w[0]} desde ${f}. ${o} lleva la barra, el bartender y la cristalería a tu fiesta; el licor lo aporta el cliente conforme a la ley, y hay barras sin alcohol. Reserva con dos semanas.`,
    `${n} has offered ${w[1]} since ${f}. ${o} brings the bar, bartender and glassware to your party; alcohol is supplied by the client in accordance with the law, and alcohol-free bars are available. Book two weeks ahead.`),
  ice: (n, w, f, o, st) => bi(`${n} vende ${w[0]} desde ${f}. ${o} atiende en ${st} y entrega para fiestas, restaurantes y obras: bolsas, bloques, garrafones y entregas programadas.`,
    `${n} has sold ${w[1]} since ${f}. ${o} serves from ${st} and delivers for parties, restaurants and job sites: bags, blocks, jugs and scheduled deliveries.`),
};
export const aboutDe = (tpl, ...a) => ABOUT[tpl](...a);

const $ = (c) => (c / 100).toFixed(c % 100 === 0 ? 0 : 2);
/* Preguntas frecuentes (5), según el tipo. d = ajustes de entrega. */
export function faqsDe(tpl, d) {
  const dlv = bi(`Sí, hasta ${d.zone} ${d.zone === 1 ? "milla" : "millas"} por $${$(d.fee)}${d.min ? `; el pedido mínimo es de $${$(d.min)}` : ""}. También puedes recoger.`, `Yes, up to ${d.zone} ${d.zone === 1 ? "mile" : "miles"} for $${$(d.fee)}${d.min ? `; the minimum order is $${$(d.min)}` : ""}. You can also pick up.`);
  const card = [bi("¿Se puede pagar con tarjeta?", "Can I pay by card?"), bi("Sí, en la app y en el local; también aceptamos efectivo.", "Yes, in the app and in store; we also take cash.")];
  const alerg = [bi("¿Manejan alergias?", "Do you handle allergies?"), bi("Cada plato trae sus etiquetas; si tienes una alergia, anótala al pedir o pregúntanos antes.", "Each dish has its tags; if you have an allergy, note it when ordering or ask us first.")];
  const party = [bi("¿Hacen pedidos grandes para fiestas?", "Do you take large orders for parties?"), bi("Sí, con dos días de anticipación. Escríbenos por Mensajes con la fecha y las personas.", "Yes, with two days' notice. Message us with the date and number of guests.")];
  switch (tpl) {
    case "truck": case "street":
      return [[bi("¿Dónde están hoy?", "Where are you today?"), bi("Publicamos el lugar de cada día en Novedades. Desde la app puedes pedir y recoger en la ventana.", "We post each day's spot in Updates. From the app you can order and pick up at the window.")],
        [bi("¿Qué días abren?", "What days are you open?"), bi("Los días del horario de esta ficha; si cambiamos por el clima, lo avisamos en Novedades.", "The days in this page's hours; if we change because of weather, we post it in Updates.")], card,
        [bi("¿Atienden fiestas y eventos?", "Do you serve parties and events?"), bi("Sí, con una semana de anticipación; escríbenos con la fecha y los invitados.", "Yes, with a week's notice; message us with the date and guests.")], alerg];
    case "dark":
      return [[bi("¿Tienen local para recoger?", "Do you have a pickup location?"), bi("No; somos cocina solo para entrega. Todo llega a tu puerta.", "No; we are a delivery-only kitchen. Everything comes to your door.")],
        [bi("¿Hasta dónde entregan?", "How far do you deliver?"), dlv], [bi("¿Cuánto tarda?", "How long does it take?"), bi(`Entre ${d.prep} y ${d.prep + 20} minutos, según la hora.`, `Between ${d.prep} and ${d.prep + 20} minutes, depending on the hour.`)], card, alerg];
    case "cake": case "bar":
      return [[bi("¿Con cuánta anticipación debo pedir?", "How far ahead should I order?"), bi(tpl === "bar" ? "Con dos semanas; en fechas de temporada, un mes." : "Con una semana; para bodas y quinceañeras, un mes.", tpl === "bar" ? "Two weeks ahead; in peak season, one month." : "One week ahead; for weddings and quinceañeras, one month.")],
        [bi("¿Cómo se paga?", "How do I pay?"), bi("El pedido retiene el total en tu tarjeta; el saldo se cobra al entregar o al terminar el servicio.", "The order holds the total on your card; the balance is charged on delivery or after the service.")],
        [bi("¿Entregan y montan?", "Do you deliver and set up?"), dlv], [bi("¿Puedo personalizar mi pedido?", "Can I customize my order?"), bi("Sí. Cuéntanos el tema o la lista de invitados por Mensajes y te confirmamos el diseño.", "Yes. Tell us the theme or guest list by message and we confirm the design.")], alerg];
    case "ice":
      return [[bi("¿Entregan?", "Do you deliver?"), dlv], [bi("¿Venden por mayor?", "Do you sell wholesale?"), bi("Sí: paquetes de fiesta, hielo para eventos y pallets de agua; pregunta por precio por volumen.", "Yes: party packs, event ice and water pallets; ask about volume pricing.")],
        [bi("¿Cambian el garrafón vacío?", "Do you swap the empty jug?"), bi("Sí, al traer el envase vacío pagas solo el agua.", "Yes, bring the empty container and you only pay for the water.")], card,
        [bi("¿Entregan a restaurantes y obras?", "Do you deliver to restaurants and job sites?"), bi("Sí, con entregas programadas semanales o diarias.", "Yes, with weekly or daily scheduled deliveries.")]];
    case "buffet":
      return [[bi("¿Cuánto cuesta el buffet?", "How much is the buffet?"), bi("Es un precio fijo por persona, distinto para almuerzo, cena y fin de semana; los niños de 4 a 10 años pagan precio infantil. Míralo en el menú.", "It is a fixed price per person, different for lunch, dinner and weekends; children 4 to 10 pay the kids price. See the menu.")],
        [bi("¿Tienen bandejas para eventos?", "Do you have event trays?"), bi("Sí, para 20 personas o más; pídelas con 48 horas de anticipación.", "Yes, for 20 or more people; order 48 hours ahead.")], [bi("¿Hacen delivery?", "Do you deliver?"), dlv], card, alerg];
    default:
      return [[bi("¿Hacen delivery?", "Do you deliver?"), dlv], card, alerg, party,
        [bi("¿Puedo programar mi pedido?", "Can I schedule my order?"), bi("Sí, hasta con 6 días de anticipación desde la app.", "Yes, up to 6 days ahead from the app.")]];
  }
}
