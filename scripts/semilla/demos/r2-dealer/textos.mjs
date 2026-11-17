/* Ronda 2 · Venta de Autos: textos de ficción (reseñas, novedades, preguntas, notas de cada vehículo) que dependen de lo que vende cada familia. */
import { Rng, BI, money } from "../c/base.mjs";
import { armarNovedades } from "../c/textos.mjs";

const P = (...x) => x;

/* Cómo se llama lo que se vende: s sing., p plural, g género (m/f), en/enp inglés. */
export const VOCAB = {
  cert: { s: "carro certificado", p: "carros certificados", g: "m", en: "certified car", enp: "certified cars" },
  lux: { s: "auto de lujo", p: "autos de lujo", g: "m", en: "luxury car", enp: "luxury cars" },
  pickup: { s: "camioneta", p: "camionetas", g: "f", en: "truck", enp: "trucks" },
  suv: { s: "SUV", p: "SUVs", g: "f", en: "SUV", enp: "SUVs" },
  van: { s: "van", p: "vans", g: "f", en: "van", enp: "vans" },
  trabajo: { s: "vehículo de trabajo", p: "vehículos de trabajo", g: "m", en: "work vehicle", enp: "work vehicles" },
  flota: { s: "vehículo de flota", p: "vehículos de flota", g: "m", en: "fleet vehicle", enp: "fleet vehicles" },
  caja: { s: "camión de caja", p: "camiones de caja", g: "m", en: "box truck", enp: "box trucks" },
  semi: { s: "tráiler", p: "tráileres", g: "m", en: "semi truck", enp: "semi trucks" },
  remolque: { s: "remolque", p: "remolques", g: "m", en: "trailer", enp: "trailers" },
  moto: { s: "moto", p: "motos", g: "f", en: "motorcycle", enp: "motorcycles" },
  atv: { s: "cuatrimoto", p: "cuatrimotos", g: "f", en: "ATV", enp: "ATVs" },
  scooter: { s: "scooter", p: "scooters", g: "m", en: "scooter", enp: "scooters" },
  bote: { s: "bote", p: "botes", g: "m", en: "boat", enp: "boats" },
  rv: { s: "casa rodante", p: "casas rodantes", g: "f", en: "RV", enp: "RVs" },
  golf: { s: "carrito de golf", p: "carritos de golf", g: "m", en: "golf cart", enp: "golf carts" },
  clasico: { s: "clásico", p: "clásicos", g: "m", en: "classic", enp: "classics" },
  salv: { s: "carro", p: "carros", g: "m", en: "car", enp: "cars" },
  broker: { s: "carro", p: "carros", g: "m", en: "car", enp: "cars" },
  consig: { s: "carro", p: "carros", g: "m", en: "car", enp: "cars" },
  dueno: { s: "carro", p: "carros", g: "m", en: "car", enp: "cars" },
  casa: { s: "carro", p: "carros", g: "m", en: "car", enp: "cars" },
};
export const art = (V) => `${V.g === "f" ? "la" : "el"} ${V.s}`;
export const Art = (V) => `${V.g === "f" ? "La" : "El"} ${V.s}`;

/* ── Notas de cada vehículo (debajo del nombre) ── */
const N_CARRO = [
  P("Un solo dueño. Mantenimiento al día y llantas en buen estado.", "One owner. Maintenance up to date and tires in good shape."),
  P("Interior limpio, aire frío y sin luces en el tablero.", "Clean interior, cold A/C and no dash warning lights."),
  P("Se revisó en el taller antes de ponerlo a la venta.", "Inspected in the shop before going on sale."),
  P("Llaves de repuesto y manuales. Listo para entregar.", "Spare keys and manuals. Ready to deliver."),
  P("Sin accidentes reportados. Historial disponible.", "No reported accidents. History available."),
];
export const NOTAS = {
  carro: N_CARRO, suv: N_CARRO, van: [P("Puertas corredizas y aire atrás funcionando. Perfecta para la familia.", "Sliding doors and rear A/C working. Great for the family."), ...N_CARRO.slice(1)],
  pickup: [P("Cama sin golpes fuertes y gancho de remolque. Lista para trabajar.", "Bed with no heavy dents and a tow hitch. Ready to work."), P("Se revisó en el taller: frenos, suspensión y llantas.", "Shop-inspected: brakes, suspension and tires."), ...N_CARRO.slice(3)],
  trabajo: [P("Estantes y piso de trabajo listos. Mantenimiento de flota al día.", "Shelving and work floor in place. Fleet maintenance up to date."), P("Se revisó en el taller antes de ponerla a la venta.", "Inspected in the shop before going on sale."), P("Sin rótulos de empresa. Lista para trabajar mañana.", "No company lettering. Ready to work tomorrow.")],
  caja: [P("Caja sin goteras, piso de madera firme y puerta enrollable suave.", "Box with no leaks, solid wood floor and a smooth roll-up door."), P("Mantenimiento al día y llantas con buena huella.", "Maintenance up to date and tires with good tread."), P("Se revisó en el taller antes de ponerlo a la venta.", "Inspected in the shop before going on sale.")],
  trailer: [P("Motor revisado en el taller y llantas con buena huella. El millaje se da por escrito.", "Engine checked in the shop and tires with good tread. Mileage is given in writing."), P("Necesitas CDL. Pregunta por el historial de mantenimiento.", "You need a CDL. Ask for the maintenance records."), P("Cabina limpia, aire y litera funcionando.", "Clean cab, A/C and sleeper working.")],
  remolque: [P("Luces, frenos y rampas revisados. Se entrega con placa temporal si hace falta.", "Lights, brakes and ramps checked. Delivered with a temporary tag if needed."), P("Piso firme y sin óxido en el chasis.", "Solid floor and no rust on the frame."), P("Llantas nuevas y gancho listo para enganchar.", "New tires and hitch ready to connect.")],
  moto: [P("Se arranca a la primera. Cadena, frenos y llantas revisados.", "Starts on the first try. Chain, brakes and tires checked."), P("Sin caídas reportadas. Dos llaves.", "No reported drops. Two keys."), P("Necesitas licencia clase M o permiso de aprendiz para manejarla.", "You need a class M license or learner’s permit to ride it.")],
  cuatrimoto: [P("Arranca bien, tracción 4x4 funcionando y llantas buenas.", "Starts well, 4x4 working and good tires."), P("Servicio hecho: aceite, filtros y frenos.", "Serviced: oil, filters and brakes."), P("No va por la calle. Pregunta qué registro necesita.", "Not street legal. Ask which registration it needs.")],
  scooter: [P("Ideal para la ciudad: poco consumo y fácil de estacionar.", "Ideal for the city: low fuel use and easy to park."), P("Arranca a la primera y frenos revisados.", "Starts on the first try and brakes checked."), P("Dos llaves y casco de regalo.", "Two keys and a free helmet.")],
  bote: [P("Motor probado en el agua. Trailer incluido si hace falta.", "Engine tested on the water. Trailer included if needed."), P("Casco sin grietas y asientos en buen estado.", "Hull with no cracks and seats in good shape."), P("Se vende como está; puedes pedir una prueba en el lago.", "Sold as is; you can ask for a lake test.")],
  rv: [P("Techo sin goteras y todo el equipo funcionando: aire, estufa y baño.", "Roof with no leaks and all equipment working: A/C, stove and bathroom."), P("Se revisó el sistema de agua y la batería.", "Water system and battery checked."), P("Lista para el primer viaje.", "Ready for the first trip.")],
  golf: [P("Baterías revisadas y cargador incluido. Llantas en buen estado.", "Batteries checked and charger included. Tires in good shape."), P("No va por la calle. Ideal para campo, finca o comunidad.", "Not street legal. Great for a course, farm or community."), P("Frenos y dirección revisados.", "Brakes and steering checked.")],
  clasico: [P("Carrocería firme y motor que arranca. Fotos de abajo y de adentro a pedido.", "Solid body and a running engine. Underside and interior photos on request."), P("Restaurado por etapas, con recibos disponibles.", "Restored in stages, with receipts available."), P("Papeles y título en regla. Se vende como está.", "Papers and title in order. Sold as is.")],
};
export const NOTA_PROYECTO = P("Proyecto: lo restauras tú. Carrocería y mecánica por revisar, a un precio que lo refleja.", "Project: you restore it. Body and mechanicals to be checked, priced accordingly.");
export const NOTA_SALV = P("Título salvage: se vende para reparar. No se maneja en la calle hasta pasar la inspección de PA.", "Salvage title: sold to be repaired. It cannot be driven on the street until it passes PA inspection.");
export const NOTA_RECO = P("Título reconstruido: ya pasó la inspección de PA. Pregunta por el informe de reparación.", "Rebuilt title: it passed PA inspection. Ask for the repair report.");
export const NOTA_CERT = P("Certificado: pasó la inspección del programa, con garantía por escrito.", "Certified: passed the program inspection, with a written warranty.");

/* ── Reseñas ── {n} el nombre del vehículo, {v} "el carro"/"la moto", {d} dueño, {s} servicio, {V} Mayúscula ── */
const RV_VENTA = {
  abre5: [P("Excelente experiencia con {v}.", "Excellent experience with the {en}."), P("Nos trataron muy bien.", "They treated us very well."), P("Compra sin presión.", "No-pressure purchase."), P("Muy recomendados.", "Highly recommended.")],
  medio5: [P("El total en la puerta estaba claro desde la primera visita y no cambió al firmar.", "The out-the-door total was clear from the first visit and did not change at signing."),
    P("Reservé la prueba en la app y {v} estaba list{g} a la hora, limpi{g}.", "I booked the test in the app and the {en} was ready on time and clean."),
    P("Me enseñaron el título y el historial antes de hablar de dinero.", "They showed me the title and history before talking money."),
    P("{d} me explicó todo por escrito, con la tasa y los meses si iba a financiar.", "{d} explained everything in writing, with the rate and term if I was financing."),
    P("Puse a mi mecánico a revisar {v} y no hubo problema.", "I had my mechanic check the {en} and there was no problem."),
    P("Me aceptaron lo mío como parte de pago a un precio justo.", "They took my trade-in at a fair price.")],
  cierra5: [P("Volvería a comprar aquí.", "I would buy here again."), P("Se lo recomendé a mi cuñado y también compró.", "I told my brother-in-law and he bought too."), P("Ya llevo meses con {v} y cero problemas.", "I have had the {en} for months with zero problems.")],
  abre4: [P("Buena compra.", "Good purchase."), P("Todo bien en general.", "All good overall.")],
  medio4: [P("La prueba empezó unos minutos tarde pero me avisaron.", "The test started a few minutes late but they let me know."), P("El papeleo tomó más de lo que pensé, aunque todo fue claro.", "The paperwork took longer than I thought, though everything was clear.")],
  cierra4: [P("{V} es como lo describieron.", "The {en} is as described."), P("Recomendado.", "Recommended.")],
  abre3: [P("Regular.", "So-so."), P("Esperaba más.", "I expected more.")],
  medio3: [P("{V} estaba bien pero tuve que preguntar dos veces por el cargo del dealer.", "The {en} was fine but I had to ask twice about the dealer fee."), P("Tardaron en tener los papeles listos.", "They took a while to have the paperwork ready.")],
  cierra3: [P("Con mejor comunicación sería excelente.", "With better communication it would be excellent.")],
  abre2: [P("No fue lo que esperaba.", "It was not what I expected.")],
  medio2: [P("Fui a la hora de la prueba y {v} no estaba list{g}.", "I came at the test time and the {en} was not ready."), P("Me costó entender el total y tuve que pedirlo por escrito.", "I had trouble understanding the total and had to ask for it in writing.")],
  cierra2: [P("Respondieron cuando reclamé.", "They answered when I complained.")],
};
const RV_SERV = {
  abre5: [P("Excelente atención.", "Excellent service."), P("Muy profesionales y claros.", "Very professional and clear."), P("Me explicaron todo sin vueltas.", "They explained everything straight."), P("Muy recomendados.", "Highly recommended.")],
  medio5: [P("Para {s} me dieron el precio por escrito antes de empezar y fue el que pagué.", "For {s} they gave me the price in writing before starting and that is what I paid."),
    P("{d} me atendió a la hora de la cita y resolvió {s} en una sola visita.", "{d} saw me at my appointment time and handled {s} in one visit."),
    P("Me dijeron qué papeles llevar y no tuve que volver.", "They told me which papers to bring and I did not have to come back."),
    P("Nadie me presionó para comprar nada que no necesitaba.", "Nobody pressured me to buy anything I did not need."),
    P("Me contestaron en español y en inglés, y todo quedó por escrito.", "They answered in Spanish and English, and everything was in writing.")],
  cierra5: [P("Los vuelvo a usar sin pensarlo.", "I will use them again without thinking twice."), P("Se los recomendé a mi familia.", "I recommended them to my family."), P("Ya fui tres veces y siempre igual de bien.", "I have been three times and always just as good.")],
  abre4: [P("Buen servicio en general.", "Good service overall."), P("Todo bien, con un detalle.", "All good, with one small thing.")],
  medio4: [P("Esperé unos minutos más de lo dicho pero me avisaron.", "I waited a few minutes longer than said but they let me know."), P("Para {s} faltó un papel y lo resolvieron al día siguiente.", "For {s} one paper was missing and they sorted it out the next day.")],
  cierra4: [P("Cumplieron con lo prometido.", "They did what they promised."), P("Recomendado.", "Recommended.")],
  abre3: [P("Regular.", "So-so."), P("Esperaba un poco más.", "I expected a little more.")],
  medio3: [P("Tardaron más de lo dicho en {s} y casi no me avisaron.", "{s} took longer than they said and they barely kept me posted."), P("El precio final no estaba tan claro como pensé.", "The final price was not as clear as I thought.")],
  cierra3: [P("Con mejor comunicación serían excelentes.", "With better communication they would be excellent.")],
  abre2: [P("No quedé conforme.", "I was not satisfied.")],
  medio2: [P("Llegué a la cita y no estaba lista la persona que me iba a atender.", "I came to the appointment and the person who was to see me was not ready."), P("Tuve que pedir dos veces el precio por escrito.", "I had to ask twice for the price in writing.")],
  cierra2: [P("Al menos respondieron cuando reclamé.", "At least they answered when I complained.")],
};
export function textoResena(venta, V, stars, lang, v, r) {
  const T = venta ? RV_VENTA : RV_SERV, lvl = stars >= 5 ? "5" : stars <= 2 ? "2" : String(stars), li = lang === "es" ? 0 : 1;
  const fill = (t) => t.replace(/\{(\w+)\}/g, (_, k) => {
    if (k === "v") return V ? art(V) : "";
    if (k === "V") return V ? Art(V) : "";
    if (k === "en") return V ? V.en : "";
    if (k === "g") return V && V.g === "f" ? "a" : "o";
    return v[k] ?? "";
  });
  const a = r.pick(T["abre" + lvl]), m = r.pick(T["medio" + lvl]), c = r.chance(0.75) ? r.pick(T["cierra" + lvl]) : null;
  const m2 = r.chance(0.45) && stars >= 4 ? r.pick(T["medio" + lvl]) : null;
  let s = [fill(a[li]), fill(m[li]), m2 && m2 !== m ? fill(m2[li]) : null, c ? fill(c[li]) : null].filter(Boolean).join(" ");
  if (lang === "es") s = s.replace(/\bde el\b/g, "del").replace(/\bDe el\b/g, "Del");
  if (s.length < 24) s += lang === "es" ? " Todo en orden." : " All in order.";
  return s.slice(0, 600);
}

/* ── Novedades ── */
export function novedadesVenta(B, plan, V, r) {
  const v = plan.veh.find((x) => !x.vendido), c = B.ciudadNombre;
  const L = [
    { title: `Llegaron ${V.p} al lote`, body: `Esta semana entraron varios ${V.p === "SUVs" ? "SUVs" : V.p} al lote de ${c}. Cada uno trae su total en la puerta, el título y lo que incluye. Reserva tu prueba en la app.` },
    { title: "Prueba sin compromiso", body: "Elige una hora libre en la ficha. Antes de la prueba no se cobra nada y el total en la puerta ya está a la vista." },
    { title: v ? `Nuevo: ${v.nombre}`.slice(0, 60) : "Entró uno nuevo al lote", body: v ? "Ya está en el lote. Título, garantía y total en la puerta en su ficha. Pide tu hora de prueba." : "Entró uno nuevo al lote. Mira el total en la puerta en su ficha." },
    { title: "Trae a tu mecánico", body: "Puedes llevar cualquiera del lote a tu mecánico antes de firmar. Nos avisas y lo preparamos." },
    { title: "Horario de feriados", body: "En los feriados cerramos. Reserva tu prueba con tiempo y te apartamos la hora." },
    { title: "Gracias por confiar en nosotros", body: "Gracias a cada familia que nos eligió y nos recomendó. Seguimos con el trato claro de siempre." },
    { title: "Qué incluye el total en la puerta", body: "Precio, impuesto de Pennsylvania, placas y título, y el cargo del dealer. Todo se ve en cada ficha antes de que firmes." },
    { title: "Tasación de lo tuyo", body: plan.ds.trade ? "Trae lo que quieres cambiar y te damos una oferta por escrito, gratis. Compárala sin compromiso." : "Si vas a vender lo tuyo, te orientamos para que obtengas un precio justo." },
    { title: "Financiamiento", body: plan.ds.fin ? `Trabajamos con prestamistas. Te damos la tasa, los meses y el enganche por escrito${plan.ds.itin ? "; también con ITIN" : ""}. Nadie garantiza la aprobación.` : "Si necesitas financiar, te decimos con quién hablar. Tasa y meses siempre por escrito." },
    { title: "Antes del invierno", body: "Revisión de batería y llantas antes de la primera helada. Escríbenos por la app." },
  ];
  return armarNovedades({ ...B }, L.map((x) => ({ ...x, kind: "novedad" })), r, r.int(3, 6));
}
export function novedadesServ(B, plan, S, r) {
  const L = S.novedades.map(([t, b]) => ({ title: t, body: b, kind: "novedad" }));
  L.push({ title: "Cita en la app", body: "Elige una hora libre en la app y llega a tu cita. El precio va por escrito antes de empezar." }, { title: "Horario de feriados", body: "En los feriados cerramos. Reserva con tiempo y te apartamos la hora." }, { title: "Gracias por confiar en nosotros", body: "Gracias a cada familia que nos recomendó. Seguimos con el trato claro de siempre." });
  return armarNovedades({ ...B }, L, r, r.int(3, 6));
}

export { BI, money };
