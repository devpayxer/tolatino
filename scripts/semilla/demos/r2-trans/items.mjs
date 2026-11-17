// «Lo que vende» de cada subcategoría (06…30): asientos en rutas, vehículo con chofer, cajas, precio cerrado con fotos y renta por día.
import { bi, usd } from "../d/comun.mjs";
import { PAISES } from "./datos.mjs";

export const CIUDAD_ES = { hzl: "Hazleton", alw: "Allentown", wbr: "Wilkes-Barre", scr: "Scranton", rdg: "Reading" };
export const VECINA = { hzl: ["Allentown", "Wilkes-Barre", "Scranton"], alw: ["Reading", "Hazleton", "Bethlehem"], wbr: ["Scranton", "Hazleton", "Allentown"], scr: ["Wilkes-Barre", "Hazleton", "Allentown"], rdg: ["Allentown", "Lancaster", "Pottstown"] };
const pr = (c, m, step = 500) => Math.round((c * m) / step) * step;
const hh = (h) => (h % 12 || 12) + (h < 12 ? " AM" : " PM");

export function construirItems(b, r, S, m) {
  const items = []; let k = 0;
  const city = CIUDAD_ES[b.city], vec = VECINA[b.city], from = b.addr.text.replace(/, [^,]*$/, "");
  const pic = () => b.pics[k % b.pics.length];
  const hora = (min) => `${Math.floor(min / 60) ? Math.floor(min / 60) + " h " : ""}${min % 60 ? (min % 60) + " min" : ""}`.trim();
  const seat = (to, cents, dmin, sal, pax, sec, secEn, nombre) => items.push({ sec: bi(sec, secEn), secSort: 0, name: nombre || bi(`${city} → ${to.es}`, `${city} → ${to.en}`), descr: bi(`Salidas ${sal.map(hh).join(", ")} desde ${from}. ${hora(dmin)}.`, `Departures ${sal.map(hh).join(", ")} from ${from}. ${hora(dmin)}.`), cents, dur: 60, kind: "asiento", attrs: { inc: [bi("Peajes", "Tolls"), bi("Calefacción y aire", "Heat and A/C")], sal, pax, to, dmin, from: bi(from, from) }, pfrom: false, photo: pic(), sort: k++ });
  const priv = (name, nameEn, descr, descrEn, cents, pax, wait, sec = "Servicios", secEn = "Services", dur = 60, inc = []) => items.push({ sec: bi(sec, secEn), secSort: 1, name: bi(name, nameEn), descr: bi(descr, descrEn), cents, dur: Math.min(480, dur), kind: "priv", attrs: { inc: [bi("Peajes", "Tolls"), ...inc, ...(wait ? [bi(`Espera de ${wait} min`, `${wait}-minute wait`)] : [])], pax, ...(wait ? { wait } : {}) }, pfrom: false, photo: pic(), sort: k++ });
  const caja = (name, nameEn, descr, descrEn, cents, to) => items.push({ sec: bi("Envíos", "Shipping"), secSort: 2, name: bi(name, nameEn), descr: bi(descr, descrEn), cents, dur: 60, kind: "caja", attrs: { inc: [bi("Recogida en tu casa", "Pickup at your home"), bi("Número de rastreo", "Tracking number")], ...(to ? { to } : {}) }, pfrom: false, photo: pic(), sort: k++ });
  const cot = (name, nameEn, descr, descrEn, cents, inc = []) => items.push({ sec: bi("Precio cerrado con fotos", "Fixed price from photos"), secSort: 3, name: bi(name, nameEn), descr: bi(descr, descrEn), cents, dur: 60, kind: "cotiza", attrs: { inc: [bi("Peajes", "Tolls"), ...inc] }, pfrom: true, photo: pic(), sort: k++ });
  const rent = (name, nameEn, cents, dep, par, mpd, mi, descr, descrEn) => items.push({ module: "renta", sec: bi("Renta por día", "Daily rental"), secSort: 0, name: bi(name, nameEn), descr: bi(`${descr} Renta por día · depósito ${usd(dep)}${mpd ? ` · ${mpd} millas por día incluidas` : ""}.`, `${descrEn} Daily rental · ${usd(dep)} deposit${mpd ? ` · ${mpd} miles per day included` : ""}.`), cents, dur: null, kind: null, unit: "dia", dep, par, attrs: mpd ? { mpd, mi } : {}, pfrom: false, photo: pic(), sort: k++ });

  switch (S.id) {
    case "NEG-TRANS-06": {
      const sals = [[5, 13, 21], [5, 13], [6, 14, 22]];
      vec.forEach((v, ix) => seat(bi(`Parque industrial de ${v}`, `${v} industrial park`), pr(900 + ix * 450, m, 100), 25 + ix * 20, sals[ix], r.pick([14, 15, 24, 30]), "Rutas a la planta", "Plant routes"));
      priv("Van para tu equipo (hasta 12)", "Van for your crew (up to 12)", "Para un turno o un evento de la empresa, a la hora que pidas.", "For a shift or a company event, at the time you ask for.", pr(18000, m, 1000), 12, 15);
      break; }
    case "NEG-TRANS-07": {
      const sals = [[4, 5], [5, 6], [4]];
      vec.forEach((v, ix) => seat(bi(ix === 1 ? `Empacadoras de ${v}` : `Campos y granjas de ${v}`, ix === 1 ? `${v} packing plants` : `${v} farms and fields`), pr(1000 + ix * 500, m, 100), 30 + ix * 20, sals[ix], r.pick([14, 15, 15, 24]), "Rutas al trabajo", "Work routes"));
      priv("Van de cuadrilla (hasta 15)", "Crew van (up to 15)", "Para una cuadrilla completa, desde su casa hasta el lugar de trabajo.", "For a full crew, from home to the worksite.", pr(20000, m, 1000), 15, 15);
      break; }
    case "NEG-TRANS-08": {
      seat(bi(`Escuelas de ${city}`, `${city} schools`), pr(900, m, 100), 25, [7, 15], r.pick([14, 20, 24]), "Rutas escolares", "School routes");
      seat(bi(`Escuelas de ${vec[0]}`, `${vec[0]} schools`), pr(1200, m, 100), 40, [7, 15], r.pick([14, 20]), "Rutas escolares", "School routes");
      if (r.chance(0.6)) seat(bi(`Programas de verano en ${vec[1]}`, `Summer programs in ${vec[1]}`), pr(1100, m, 100), 45, [8, 16], 14, "Rutas escolares", "School routes");
      priv("Viaje escolar especial (hasta 14)", "Special school trip (up to 14)", "Excursiones y actividades: ida y vuelta con adultos acompañantes.", "Field trips and activities: round trip with adult chaperones.", pr(24000, m, 1000), 14, 60, "Viajes especiales", "Special trips");
      break; }
    case "NEG-TRANS-09": {
      priv("Cita médica con espera (hasta 1 h)", "Appointment ride with wait (up to 1 h)", "Te llevan a tu cita, esperan hasta una hora y te regresan a casa.", "They take you to your appointment, wait up to an hour and bring you home.", pr(6000, m), 3, 60, "Traslados", "Rides");
      priv(`Cita en ${vec[0]} (ida y vuelta)`, `Appointment in ${vec[0]} (round trip)`, "Ida y vuelta con espera, con ayuda para subir y bajar.", "Round trip with a wait, with help getting in and out.", pr(10500, m), 3, 60, "Traslados", "Rides");
      priv("Traslado con silla de ruedas (rampa)", "Wheelchair ride (ramp)", "Van con rampa y cinturones de seguridad para la silla.", "Van with a ramp and wheelchair tie-downs.", pr(8000, m), 2, 60, "Con rampa", "With ramp");
      priv("Cita recurrente semanal (ida y vuelta)", "Weekly recurring appointment (round trip)", "El mismo día y hora cada semana, con el mismo conductor.", "The same day and time each week, with the same driver.", pr(5500, m), 2, 45, "Traslados", "Rides");
      if (r.chance(0.7)) priv("Compras y mandados con acompañante (2 h)", "Errands and shopping with a companion (2 h)", "Dos horas con acompañante para tus compras y mandados.", "Two hours with a companion for your shopping and errands.", pr(7000, m), 2, 0, "Acompañamiento", "Companionship", 120);
      break; }
    case "NEG-TRANS-10": {
      priv("Conductor designado: tú y tu carro", "Designated driver: you and your car", "Manejamos tu carro de regreso a casa con seguridad, hasta 10 millas.", "We drive your car home safely, up to 10 miles.", pr(4500, m), 3, 15, "Conductor designado", "Designated driver");
      priv("Regreso de un evento (hasta 25 millas)", "Ride home from an event (up to 25 miles)", "Para fiestas y salidas largas: dos conductores y tu carro.", "For parties and long nights: two drivers and your car.", pr(7500, m), 4, 15, "Conductor designado", "Designated driver");
      priv("Noche completa (hasta 4 h)", "Full night (up to 4 h)", "Un conductor a tu disposición toda la noche.", "A driver at your disposal all night.", pr(12000, m), 4, 0, "Por hora", "By the hour", 240);
      if (r.chance(0.6)) priv("Para dos carros (dos conductores)", "For two cars (two drivers)", "Dos conductores, dos carros, el mismo destino.", "Two drivers, two cars, the same destination.", pr(9000, m), 6, 15, "Conductor designado", "Designated driver");
      break; }
    case "NEG-TRANS-11": {
      priv("Chofer por 3 horas", "Chauffeur for 3 hours", "Auto con chofer para reuniones, compras o cenas.", "Car with chauffeur for meetings, shopping or dinners.", pr(21000, m, 1000), 4, 0, "Por hora", "By the hour", 180);
      priv("Chofer por 6 horas", "Chauffeur for 6 hours", "Medio día con chofer, con espera incluida.", "Half a day with a chauffeur, wait included.", pr(39000, m, 1000), 4, 0, "Por hora", "By the hour", 360);
      priv("Día completo (10 h)", "Full day (10 h)", "Chofer todo el día, con SUV o sedán de lujo.", "Chauffeur all day, with a luxury SUV or sedan.", pr(60000, m, 1000), 6, 0, "Por hora", "By the hour", 600);
      priv("Boda: auto con chofer", "Wedding: car with chauffeur", "Auto decorado con chofer para la ceremonia y la recepción.", "Decorated car with chauffeur for the ceremony and reception.", pr(32000, m, 1000), 4, 30, "Eventos", "Events", 240);
      if (r.chance(0.6)) priv("Cena y salida de noche (4 h)", "Dinner and night out (4 h)", "Te recogen, esperan y te regresan sin que te preocupes.", "They pick you up, wait and bring you back, no worries.", pr(26000, m, 1000), 4, 0, "Eventos", "Events", 240);
      break; }
    case "NEG-TRANS-12": {
      priv("Limosina hasta 8 pasajeros (3 h)", "Limo up to 8 passengers (3 h)", "Limosina con bebidas sin alcohol, música y luces.", "Limo with soft drinks, music and lights.", pr(45000, m, 1000), 8, 0, "Limosinas", "Limos", 180);
      priv("SUV limosina hasta 14 (3 h)", "SUV limo up to 14 (3 h)", "Más espacio para grupos grandes, con sonido y luces.", "More room for large groups, with sound and lights.", pr(65000, m, 1000), 14, 0, "Limosinas", "Limos", 180);
      priv("Party bus hasta 20 (4 h)", "Party bus up to 20 (4 h)", "Autobús de fiesta con sonido, luces y pista.", "Party bus with sound, lights and a dance floor.", pr(95000, m, 1000), 20, 0, "Party bus", "Party bus", 240);
      priv("Party bus hasta 30 (4 h)", "Party bus up to 30 (4 h)", "El más grande: ideal para bodas y eventos.", "The largest: ideal for weddings and events.", pr(130000, m, 5000), 30, 0, "Party bus", "Party bus", 240);
      priv("Quinceañera: limosina con decoración", "Quinceañera: decorated limo", "Limosina decorada con recogida y regreso en la fecha de la fiesta.", "Decorated limo with pickup and return on the party date.", pr(52000, m, 1000), 8, 30, "Eventos", "Events", 240);
      break; }
    case "NEG-TRANS-13": {
      priv("Entrega en la ciudad (hasta 20 lb)", "City delivery (up to 20 lb)", "Recogemos y entregamos dentro de la ciudad el mismo día.", "We pick up and deliver within the city the same day.", pr(1800, m, 100), 1, 0, "Entregas", "Deliveries", 45, [bi("Aviso al entregar", "Delivery notice")]);
      priv("Entrega a pueblos cercanos", "Delivery to nearby towns", "Hasta 25 millas, con aviso al recoger y al entregar.", "Up to 25 miles, with a notice at pickup and delivery.", pr(3500, m, 100), 1, 0, "Entregas", "Deliveries", 90);
      priv("Recoger y entregar con firma", "Pick up and deliver with signature", "Documentos y paquetes que necesitan firma de quien recibe.", "Documents and packages that need the recipient's signature.", pr(2800, m, 100), 1, 0, "Entregas", "Deliveries", 60);
      caja("Paquete a otra ciudad (1 caja)", "Package to another city (1 box)", "Hasta 40 lb, entrega al día siguiente en las ciudades de la zona.", "Up to 40 lb, next-day delivery in the area's cities.", pr(4500, m, 100), null);
      break; }
    case "NEG-TRANS-14": {
      priv("Mismo día (en 4 horas)", "Same day (within 4 hours)", "Recogida y entrega el mismo día, hasta 25 lb.", "Same-day pickup and delivery, up to 25 lb.", pr(3200, m, 100), 1, 0, "Entregas", "Deliveries", 60);
      priv("Urgente (en 1 hora)", "Rush (within 1 hour)", "Sale de inmediato y llega en una hora dentro de la ciudad.", "Leaves right away and arrives in an hour within the city.", pr(5500, m, 100), 1, 0, "Entregas", "Deliveries", 30);
      priv("Ruta de 5 paradas", "5-stop route", "Un mensajero para tus 5 entregas del día.", "One courier for your 5 deliveries of the day.", pr(9500, m, 500), 1, 0, "Rutas", "Routes", 180);
      priv("Documentos legales con firma", "Legal documents with signature", "Entrega con firma y foto de comprobante.", "Delivery with signature and proof photo.", pr(4500, m, 100), 1, 0, "Entregas", "Deliveries", 60);
      caja("Paquete mismo día a otra ciudad", "Same-day package to another city", "Hasta 30 lb a las ciudades vecinas.", "Up to 30 lb to the neighboring cities.", pr(7500, m, 500), null);
      break; }
    case "NEG-TRANS-15": {
      priv("Entrega de comida (por pedido)", "Food delivery (per order)", "Recogemos tu pedido en el restaurante y lo llevamos caliente.", "We pick up your order at the restaurant and bring it hot.", pr(1200, m, 100), 1, 0, "Entregas", "Deliveries", 30);
      priv("Pedido grande para oficina", "Large office order", "Para pedidos de 10 a 20 personas, en bolsa térmica.", "For orders of 10 to 20 people, in a thermal bag.", pr(2500, m, 100), 1, 0, "Entregas", "Deliveries", 45);
      priv("Reparto de 10 charolas (catering)", "Delivery of 10 trays (catering)", "Llevamos tus charolas a la fiesta, a la hora acordada.", "We bring your trays to the party, at the agreed time.", pr(6500, m, 500), 2, 0, "Catering", "Catering", 90);
      priv("Entrega programada diaria", "Scheduled daily delivery", "El mismo pedido a la misma hora, de lunes a viernes.", "The same order at the same time, Monday to Friday.", pr(1500, m, 100), 1, 0, "Entregas", "Deliveries", 30);
      break; }
    case "NEG-TRANS-16": {
      priv("Compras del súper (hasta 3 bolsas)", "Grocery run (up to 3 bags)", "Vamos a la tienda que elijas, compramos y entregamos.", "We go to the store you pick, shop and deliver.", pr(1800, m, 100), 1, 0, "Compras", "Shopping", 60);
      priv("Compras grandes (hasta 8 bolsas)", "Large grocery run (up to 8 bags)", "Para la compra de la semana, con ayuda hasta la puerta.", "For the weekly shop, with help up to the door.", pr(3200, m, 100), 1, 0, "Compras", "Shopping", 90);
      priv("Mandado de tienda (recoger y llevar)", "Store errand (pick up and deliver)", "Recogemos lo que ya compraste y lo llevamos a tu casa.", "We pick up what you already bought and bring it home.", pr(1500, m, 100), 1, 0, "Mandados", "Errands", 45);
      priv("Entrega de caja de mercado", "Market box delivery", "Llevamos tu caja de frutas y verduras al día y hora que elijas.", "We deliver your fruit and vegetable box on the day and time you choose.", pr(1400, m, 100), 1, 0, "Mandados", "Errands", 30);
      break; }
    case "NEG-TRANS-17": {
      const P = r.sample(PAISES, 2), a = P[0], c = P[1];
      caja(`Caja pequeña a ${a[0]}`, `Small box to ${a[1]}`, "Hasta 25 lb, puerta a puerta.", "Up to 25 lb, door to door.", pr(6500, m, 500), bi(a[0], a[1]));
      caja(`Caja mediana a ${a[0]}`, `Medium box to ${a[1]}`, "Hasta 50 lb, puerta a puerta.", "Up to 50 lb, door to door.", pr(9500, m, 500), bi(a[0], a[1]));
      caja(`Caja grande a ${a[0]}`, `Large box to ${a[1]}`, "Hasta 80 lb, puerta a puerta.", "Up to 80 lb, door to door.", pr(13500, m, 500), bi(a[0], a[1]));
      caja(`Tanque de 55 galones a ${c[0]}`, `55-gallon drum to ${c[1]}`, "Tanque sellado hasta 250 lb, con recogida en tu casa.", "Sealed drum up to 250 lb, with pickup at your home.", pr(22000, m, 1000), bi(c[0], c[1]));
      if (r.chance(0.6)) caja(`Caja grande a ${c[0]}`, `Large box to ${c[1]}`, "Hasta 80 lb, puerta a puerta.", "Up to 80 lb, door to door.", pr(14500, m, 500), bi(c[0], c[1]));
      break; }
    case "NEG-TRANS-18": {
      cot("Flete de carga (con fotos)", "Freight (from photos)", "Manda fotos y el destino: te devolvemos el precio cerrado.", "Send photos and the destination: we send back a fixed price.", pr(15000, m, 1000), [bi("Carga y descarga", "Loading and unloading")]);
      cot("Muebles y artículos grandes", "Furniture and large items", "Sofás, camas y electrodomésticos, con cobijas y correas.", "Sofas, beds and appliances, with blankets and straps.", pr(12000, m, 1000), [bi("Cobijas y correas", "Blankets and straps")]);
      cot("Flete a otro estado", "Freight to another state", "Carga hasta NY, NJ, MD y estados vecinos, con seguro de carga.", "Freight to NY, NJ, MD and neighboring states, with cargo insurance.", pr(35000, m, 1000), [bi("Seguro de carga", "Cargo insurance")]);
      priv("Camión con chofer (2 h)", "Truck with driver (2 h)", "Camión y chofer por dos horas para tu carga.", "Truck and driver for two hours for your load.", pr(12000, m, 1000), 2, 0, "Por hora", "By the hour", 120);
      break; }
    case "NEG-TRANS-19": {
      cot("Entrega urgente (hotshot)", "Rush delivery (hotshot)", "Sale de inmediato con tu carga, directo al destino.", "Leaves right away with your load, direct to the destination.", pr(25000, m, 1000));
      cot("Entrega de materiales de obra", "Construction material delivery", "Madera, bloques y herramienta, con carga y descarga.", "Lumber, blocks and tools, with loading and unloading.", pr(18000, m, 1000), [bi("Carga y descarga", "Loading and unloading")]);
      priv("Camión de caja 16 pies con chofer (4 h)", "16 ft box truck with driver (4 h)", "Camión de caja y chofer por cuatro horas.", "Box truck and driver for four hours.", pr(28000, m, 1000), 2, 0, "Por hora", "By the hour", 240);
      priv("Camión de caja por día (8 h)", "Box truck by the day (8 h)", "Camión y chofer todo el día para tus entregas.", "Truck and driver all day for your deliveries.", pr(48000, m, 1000), 2, 0, "Por hora", "By the hour", 480);
      break; }
    case "NEG-TRANS-20": {
      cot("Carga completa (FTL) regional", "Regional full truckload (FTL)", "Tráiler completo a destinos del noreste.", "Full trailer to destinations in the Northeast.", pr(90000, m, 5000), [bi("Seguro de carga", "Cargo insurance")]);
      cot("Carga parcial (LTL)", "Less-than-truckload (LTL)", "Tarimas sueltas: pagas solo el espacio que usas.", "Loose pallets: you pay only the space you use.", pr(35000, m, 1000), [bi("Seguro de carga", "Cargo insurance")]);
      cot("Contenedor del puerto a tu bodega", "Port container to your warehouse", "Recogemos el contenedor y lo llevamos a tu bodega.", "We pick up the container and bring it to your warehouse.", pr(60000, m, 5000));
      break; }
    case "NEG-TRANS-21": {
      cot("Minicargador o retroexcavadora", "Skid steer or backhoe", "Traslado en plataforma, con amarre y permisos.", "Flatbed transport, with tie-down and permits.", pr(28000, m, 1000), [bi("Amarre profesional", "Professional tie-down")]);
      cot("Montacargas o equipo de bodega", "Forklift or warehouse equipment", "Recogida y entrega con rampa y cargador.", "Pickup and delivery with ramp and loader.", pr(22000, m, 1000));
      cot("Remolque lowboy por viaje", "Lowboy trailer per trip", "Para equipo pesado: excavadoras y tractores.", "For heavy equipment: excavators and tractors.", pr(40000, m, 1000), [bi("Permisos de carga", "Load permits")]);
      priv("Traslado en plataforma (4 h)", "Flatbed haul (4 h)", "Plataforma y chofer por cuatro horas, dentro de la zona.", "Flatbed and driver for four hours, within the area.", pr(32000, m, 1000), 2, 0, "Por hora", "By the hour", 240);
      break; }
    case "NEG-TRANS-22": {
      cot("Carro en plataforma (dentro de PA)", "Car on a flatbed (within PA)", "Tu carro viaja cubierto y asegurado, de puerta a puerta.", "Your car travels covered and secured, door to door.", pr(18000, m, 1000), [bi("Seguro durante el viaje", "Insurance during the trip")]);
      cot("Carro a otro estado", "Car to another state", "Traslado interestatal con seguimiento del viaje.", "Interstate transport with trip tracking.", pr(55000, m, 1000), [bi("Seguro durante el viaje", "Insurance during the trip")]);
      cot("Moto en remolque", "Motorcycle on a trailer", "Moto asegurada con correas, dentro de PA y estados vecinos.", "Motorcycle secured with straps, within PA and neighboring states.", pr(12000, m, 1000));
      cot("Carro que no arranca (con winche)", "Car that will not start (with winch)", "Subimos el carro con winche, sin dañar el piso.", "We load the car with a winch, without damaging the floor.", pr(22000, m, 1000));
      break; }
    case "NEG-TRANS-23": {
      priv("Remolque hasta 10 millas", "Tow up to 10 miles", "Grúa de plataforma o gancho hasta 10 millas.", "Flatbed or hook tow up to 10 miles.", pr(9500, m), 3, 0, "Grúa", "Towing", 60);
      priv("Remolque hasta 25 millas", "Tow up to 25 miles", "Para llevar tu carro al taller que elijas.", "To take your car to the shop of your choice.", pr(15500, m), 3, 0, "Grúa", "Towing", 90);
      priv("Arranque de batería", "Battery jump start", "Llegamos con equipo y arrancamos tu carro.", "We arrive with equipment and start your car.", pr(5500, m), 1, 0, "Auxilio vial", "Roadside help", 30);
      priv("Cambio de llanta", "Tire change", "Cambiamos la llanta con tu repuesto.", "We change the tire with your spare.", pr(6500, m), 1, 0, "Auxilio vial", "Roadside help", 30);
      priv("Rescate con winche (zanja o nieve)", "Winch recovery (ditch or snow)", "Sacamos tu carro de la zanja o de la nieve.", "We pull your car out of the ditch or the snow.", pr(12000, m), 3, 0, "Auxilio vial", "Roadside help", 60);
      if (r.chance(0.7)) cot("Remolque de larga distancia", "Long-distance tow", "Manda el destino y los datos del carro: te damos el precio cerrado.", "Send the destination and the car details: we send a fixed price.", pr(25000, m, 1000));
      break; }
    case "NEG-TRANS-24": {
      cot("Mudanza de apartamento (con fotos)", "Apartment move (from photos)", "Camión, chofer y ayudantes. Manda fotos de los cuartos.", "Truck, driver and helpers. Send photos of the rooms.", pr(35000, m, 1000), [bi("Mantas y correas", "Blankets and straps")]);
      cot("Mudanza de casa (con fotos)", "House move (from photos)", "Para casas de 2 a 4 cuartos, con equipo completo.", "For 2 to 4 bedroom homes, with a full crew.", pr(75000, m, 1000), [bi("Mantas y correas", "Blankets and straps")]);
      cot("Mudanza a otro estado", "Move to another state", "Mudanza larga con seguro y fecha de llegada.", "Long-distance move with insurance and an arrival date.", pr(120000, m, 5000), [bi("Seguro de carga", "Cargo insurance")]);
      priv("Camión con chofer y 2 ayudantes (3 h)", "Truck with driver and 2 helpers (3 h)", "Para mudanzas chicas: tres horas con tres personas.", "For small moves: three hours with three people.", pr(33000, m, 1000), 3, 0, "Por hora", "By the hour", 180);
      break; }
    case "NEG-TRANS-25": {
      rent("Auto compacto", "Compact car", pr(4500, m, 500), 20000, r.i(2, 5), 150, 30, "Económico y fácil de estacionar.", "Economical and easy to park.");
      rent("Sedán mediano", "Midsize sedan", pr(5500, m, 500), 25000, r.i(2, 5), 150, 30, "Cinco pasajeros con maletero amplio.", "Five passengers with a roomy trunk.");
      rent("SUV de 5 pasajeros", "5-passenger SUV", pr(7500, m, 500), 30000, r.i(2, 4), 150, 35, "Ideal para viajes con familia.", "Ideal for family trips.");
      rent("Minivan de 7 pasajeros", "7-passenger minivan", pr(8500, m, 500), 30000, r.i(1, 3), 120, 35, "Espacio para toda la familia y las maletas.", "Room for the whole family and the luggage.");
      if (r.chance(0.6)) rent("Pickup de media tonelada", "Half-ton pickup", pr(8000, m, 500), 30000, r.i(1, 3), 120, 35, "Para cargar materiales y mudanzas chicas.", "For hauling materials and small moves.");
      break; }
    case "NEG-TRANS-26": {
      rent("Van de carga", "Cargo van", pr(8500, m, 500), 30000, r.i(1, 4), 100, 40, "Para mudanzas chicas y entregas.", "For small moves and deliveries.");
      rent("Van de 15 pasajeros", "15-passenger van", pr(14000, m, 500), 50000, r.i(1, 3), 100, 45, "Para grupos, iglesias y equipos.", "For groups, churches and teams.");
      rent("Camión de mudanza de 16 pies", "16 ft moving truck", pr(12500, m, 500), 40000, r.i(1, 4), 100, 40, "Con rampa; cabe un apartamento de 2 cuartos.", "With a ramp; fits a 2-bedroom apartment.");
      rent("Camioneta pickup", "Pickup truck", pr(7500, m, 500), 25000, r.i(2, 4), 120, 35, "Para materiales y trabajos de jardín.", "For materials and yard work.");
      if (r.chance(0.5)) rent("Camión de mudanza de 26 pies", "26 ft moving truck", pr(17500, m, 500), 60000, r.i(1, 2), 100, 50, "Para casas de 3 a 4 cuartos.", "For 3 to 4 bedroom homes.");
      break; }
    case "NEG-TRANS-27": {
      rent("Remolque abierto 5x8", "Open trailer 5x8", pr(3500, m, 500), 10000, r.i(2, 6), 0, 0, "Para jardín, escombro y muebles.", "For yard work, debris and furniture.");
      rent("Remolque cerrado 6x12", "Enclosed trailer 6x12", pr(6500, m, 500), 20000, r.i(1, 4), 0, 0, "Cerrado y con rampa trasera.", "Enclosed with a rear ramp.");
      rent("Remolque para carro", "Car hauler trailer", pr(8500, m, 500), 25000, r.i(1, 3), 0, 0, "Con rampas y winche.", "With ramps and winch.");
      rent("Remolque de volteo", "Dump trailer", pr(11000, m, 500), 30000, r.i(1, 2), 0, 0, "Para obra, grava y escombro.", "For construction, gravel and debris.");
      if (r.chance(0.6)) rent("Remolque para moto o moto de agua", "Motorcycle or jet ski trailer", pr(4000, m, 500), 10000, r.i(1, 3), 0, 0, "Con correas y rampa.", "With straps and a ramp.");
      break; }
    case "NEG-TRANS-28": {
      priv("Entrega en moto (hasta 10 lb)", "Motorcycle delivery (up to 10 lb)", "Rápido dentro de la ciudad, con aviso al entregar.", "Fast within the city, with a delivery notice.", pr(1500, m, 100), 1, 0, "Entregas", "Deliveries", 30);
      priv("Urgente en moto (30 min)", "Rush by motorcycle (30 min)", "Sale de inmediato y llega en media hora.", "Leaves right away and arrives in half an hour.", pr(2500, m, 100), 1, 0, "Entregas", "Deliveries", 30);
      priv("Ruta de 3 paradas", "3-stop route", "Un motociclista para tus 3 entregas.", "One rider for your 3 deliveries.", pr(3800, m, 100), 1, 0, "Rutas", "Routes", 90);
      priv("Recoger documentos y devolver", "Pick up documents and return", "Recogemos y devolvemos documentos con firma.", "We pick up and return documents with signature.", pr(2200, m, 100), 1, 0, "Entregas", "Deliveries", 45);
      break; }
    case "NEG-TRANS-29": {
      priv("Entrega en bici (centro, hasta 10 lb)", "Bike delivery (downtown, up to 10 lb)", "Rápido por el centro de la ciudad, sin tráfico.", "Fast through downtown, no traffic.", pr(1200, m, 100), 1, 0, "Entregas", "Deliveries", 30);
      priv("Ruta de 3 paradas en bici", "3-stop bike route", "Un ciclista para tus 3 entregas del centro.", "One cyclist for your 3 downtown deliveries.", pr(2800, m, 100), 1, 0, "Rutas", "Routes", 90);
      priv("Entregas del día para negocios (hasta 10)", "Daily deliveries for businesses (up to 10)", "Un ciclista dedicado a tu negocio durante el día.", "A cyclist dedicated to your business for the day.", pr(6000, m, 500), 1, 0, "Rutas", "Routes", 240);
      priv("Documentos con firma", "Documents with signature", "Entrega con firma y foto de comprobante.", "Delivery with signature and proof photo.", pr(1800, m, 100), 1, 0, "Entregas", "Deliveries", 45);
      break; }
    case "NEG-TRANS-30": {
      cot("Bote hasta 24 pies", "Boat up to 24 ft", "Traslado con remolque, de puerto a puerto o a tu casa.", "Transport by trailer, from marina to marina or to your home.", pr(35000, m, 1000));
      cot("Bote grande (24 a 36 pies)", "Large boat (24 to 36 ft)", "Con permisos de carga ancha y chofer con experiencia.", "With wide-load permits and an experienced driver.", pr(75000, m, 5000), [bi("Permisos de carga ancha", "Wide-load permits")]);
      cot("Casa rodante o trailer de viaje", "RV or travel trailer", "Llevamos tu casa rodante al campamento o al estacionamiento.", "We take your RV to the campground or the lot.", pr(55000, m, 1000));
      cot("Moto de agua o jet ski", "Jet ski", "Con remolque y correas, dentro de PA y estados vecinos.", "With trailer and straps, within PA and neighboring states.", pr(22000, m, 1000));
      break; }
    default: throw new Error("subcategoría sin items " + S.id);
  }
  items[0].featured = true;
  return items;
}
