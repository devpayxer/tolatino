// NEG-FIESTA · 5 subcategorías principales (las primeras por orden del catálogo): organizador de eventos, quinceañeras, bodas, baby shower y cumpleaños.
import { rng, bi, usd, addDays, withTime, ymd, ANCHOR_D, isFuture, fechasEnvio, uuidOf, H, horario, s, n, j, dateLit, ts, CIUDADES } from "./comun.mjs";
import { negociosBase, fichaComun, novedades, ponerResenas, cicloClientes } from "./base.mjs";

export const SUBS = [
  { id: "NEG-FIESTA-01", es: "Organizador de eventos", en: "Event planner", also: "NEG-FIESTA-06", names: ["Eventos Casa Grande", "Celebra Conmigo Eventos", "Estrella del Valle Eventos", "Fiesta y Más Producciones", "Manos a la Obra Eventos", "La Gran Ocasión", "Momentos Dorados Eventos", "Tierra Linda Celebraciones", "Punto de Encuentro Eventos", "Albahaca Eventos y Banquetes"] },
  { id: "NEG-FIESTA-02", es: "Organizador de quinceañeras", en: "Quinceañera planner", also: "NEG-FIESTA-53", names: ["Sueños de Cristal Quinceañeras", "Mis Quince Princesa", "Corona de Rosas Quince", "Vals de Cristal Eventos", "Quince Años Mariposa", "Tu Gran Noche Quinceañeras", "Rosa Blanca Quince", "Aurora Quinceañeras", "Mi Reina Quince", "Magia de Quince"] },
  { id: "NEG-FIESTA-03", es: "Organizador de bodas", en: "Wedding planner", also: "NEG-FIESTA-55", names: ["Bodas del Cielo", "Sí Quiero Bodas", "Anillo de Oro Bodas", "Novios de Montaña Bodas", "Jardín de Azahar Bodas", "Hasta Siempre Bodas", "Lazos de Amor Eventos", "Flor de Lis Bodas", "Primavera Nupcial", "Caminito al Altar Bodas"] },
  { id: "NEG-FIESTA-04", es: "Organizador de baby shower", en: "Baby shower planner", also: "NEG-FIESTA-14", names: ["Cigüeña Feliz Baby Showers", "Dulce Espera Eventos", "Nube Rosa Baby Shower", "Bienvenido Bebé Eventos", "Pañal de Oro Baby Showers", "Cuna de Estrellas", "Lluvia de Bendiciones Baby Shower", "Ositos y Globos Eventos", "Mi Primer Regalo Baby Shower", "Canastilla Dorada Eventos"] },
  { id: "NEG-FIESTA-05", es: "Fiestas de cumpleaños", en: "Birthday parties", also: "NEG-FIESTA-18", names: ["Cumple Feliz Fiestas", "Piñata Loca Fiestas", "Globos y Confeti", "Mundo de Colores Fiestas", "Pastel y Fiesta Cumpleaños", "Alegría Infantil Fiestas", "Sorpresa Total Cumpleaños", "Brinca y Ríe Fiestas", "Estrellitas Fiestas Infantiles", "El Cumpleañero Fiestas"] },
];

const M = (es, en) => bi(es, en);
const INC = {
  coord: [M("Cronograma del día", "Day-of timeline"), M("Un coordinador y un asistente", "A coordinator and an assistant"), M("Contacto con tus proveedores", "Contact with your vendors")],
  mont: [M("Montaje y desmontaje", "Setup and teardown"), M("Mesas, sillas y manteles", "Tables, chairs and linens"), M("Decoración base", "Base décor")],
  quince: [M("Decoración del salón y escenario", "Hall and stage décor"), M("Coordinación del vals y la entrada", "Waltz and entrance coordination"), M("Centros de mesa", "Centerpieces"), M("Coordinador durante todo el evento", "Coordinator for the whole event")],
  boda: [M("Coordinación de la ceremonia y la recepción", "Ceremony and reception coordination"), M("Cronograma con proveedores", "Vendor timeline"), M("Ensayo la víspera", "Rehearsal the day before"), M("Decoración de mesa principal", "Head table décor")],
  baby: [M("Arco de globos y mesa principal", "Balloon arch and head table"), M("Mesa de dulces básica", "Basic candy table"), M("Juegos y premios", "Games and prizes")],
  cumple: [M("Mesa, sillas y decoración temática", "Table, chairs and themed décor"), M("Animador", "Host"), M("Limpieza al terminar", "Cleanup after")],
};
const pk = (arr_, r) => r.pick(arr_);
/* Catálogo de servicios por subcategoría: [sección, tipo, nombres alternos, descripciones, precio $, duración min, atributos]. */
const CAT = {
  "NEG-FIESTA-01": [
    ["Planeación", "Planning", "cotiza", [["Planeación del evento", "Event planning"], ["Planeación a tu medida", "Custom planning"]], ["Lugar, proveedores y el día del evento; presupuesto por escrito.", "Venue, vendors and the day itself; budget in writing."], 1200, 120, {}, true],
    ["Planeación", "Planning", "pack", [["Coordinación del día", "Day-of coordination"], ["Coordinación el día del evento", "Event-day coordination"]], ["Alguien de nuestro equipo lleva el cronograma, recibe a los proveedores y resuelve lo que pase.", "Someone from our team runs the timeline, receives vendors and solves whatever comes up."], 600, 480, { inc: INC.coord, h: 8, cap: 200 }],
    ["Planeación", "Planning", "pack", [["Evento completo", "Full-service event"], ["Evento llave en mano", "Turnkey event"]], ["Desde el presupuesto hasta el desmontaje. Tú disfrutas, nosotros lo hacemos.", "From budget to teardown. You enjoy it, we do the work."], 2400, 480, { inc: [...INC.coord, ...INC.mont], h: 8, cap: 180, mont: true }],
    ["Planeación", "Planning", "hora", [["Hora extra", "Extra hour"]], ["Si el evento se alarga, la hora extra de coordinación.", "If the event runs long, the extra hour of coordination."], 75, 60, { min: 1 }],
    ["Planeación", "Planning", "visita", [["Reunión para conocernos", "Planning meeting"], ["Cita de planeación", "Planning appointment"]], ["Una charla de 30 minutos sin costo: qué quieres y cuánto cuesta.", "A free 30-minute chat: what you want and what it costs."], 0, 30, {}],
    ["Montaje y apoyo", "Setup and staff", "pack", [["Montaje y desmontaje", "Setup and teardown"]], ["Llegamos temprano, montamos y recogemos al final.", "We arrive early, set up and clean up at the end."], 450, 240, { inc: INC.mont, h: 4, mont: true }],
    ["Montaje y apoyo", "Setup and staff", "unid", [["Mesero", "Server"], ["Mesero con experiencia", "Experienced server"]], ["Por mesero, por evento de hasta 5 horas.", "Per server, per event of up to 5 hours."], 120, 300, { u: M("mesero", "server") }],
  ],
  "NEG-FIESTA-02": [
    ["Paquetes de quince", "Quince packages", "pack", [["Quince esencial", "Essential quince"], ["Quince clásico", "Classic quince"], ["Quince cristal", "Crystal quince"]], ["Decoración, coordinación y el vals ensayado. Para hasta 150 invitados.", "Décor, coordination and the rehearsed waltz. For up to 150 guests."], 3900, 360, { inc: INC.quince, h: 6, cap: 150, mont: true }, true],
    ["Paquetes de quince", "Quince packages", "pack", [["Quince completo", "Full quince"], ["Quince de ensueño", "Dream quince"], ["Quince premium", "Premium quince"]], ["Todo el evento: salón decorado, escenario, coreografía y coordinador. Hasta 250 invitados.", "The whole event: decorated hall, stage, choreography and coordinator. Up to 250 guests."], 6800, 480, { inc: [...INC.quince, M("Mesa de dulces", "Candy table")], h: 8, cap: 250, mont: true }],
    ["Extras", "Extras", "pack", [["Coreografía y chambelanes", "Choreography and court"], ["Vals y coreografía", "Waltz and choreography"]], ["Ocho ensayos con la quinceañera y su corte.", "Eight rehearsals with the quinceañera and her court."], 650, 240, { inc: [M("Ocho ensayos", "Eight rehearsals"), M("Coreógrafo", "Choreographer")], h: 4 }],
    ["Extras", "Extras", "unid", [["Centros de mesa", "Centerpieces"]], ["Flores o velas, por mesa.", "Flowers or candles, per table."], 35, 60, { u: M("mesa", "table") }],
    ["Extras", "Extras", "hora", [["Hora extra", "Extra hour"]], ["Hasta la 1 AM, por hora.", "Until 1 AM, per hour."], 150, 60, { min: 1 }],
    ["Primera cita", "First meeting", "visita", [["Cita para ver ideas", "Idea meeting"], ["Reunión con la familia", "Family meeting"]], ["Vengan a ver álbumes y colores, sin costo. 30 minutos.", "Come see albums and colors at no cost. 30 minutes."], 0, 30, {}],
  ],
  "NEG-FIESTA-03": [
    ["Paquetes de boda", "Wedding packages", "pack", [["Boda íntima", "Intimate wedding"], ["Boda pequeña", "Small wedding"]], ["Para hasta 60 invitados: ceremonia y recepción coordinadas.", "Up to 60 guests: ceremony and reception coordinated."], 3200, 360, { inc: INC.boda, h: 6, cap: 60, mont: true }, true],
    ["Paquetes de boda", "Wedding packages", "pack", [["Boda completa", "Full wedding"], ["Boda de ensueño", "Dream wedding"]], ["Hasta 200 invitados. Planeación de principio a fin.", "Up to 200 guests. Planning from start to finish."], 7500, 480, { inc: [...INC.boda, M("Mesa de dulces", "Candy table")], h: 8, cap: 200, mont: true }],
    ["Paquetes de boda", "Wedding packages", "pack", [["Coordinación del día de la boda", "Wedding-day coordination"], ["Coordinación de boda", "Wedding coordination"]], ["Tú planeaste todo; nosotros lo hacemos funcionar el día.", "You planned everything; we make it work on the day."], 900, 480, { inc: INC.coord, h: 8 }],
    ["Paquetes de boda", "Wedding packages", "cotiza", [["Boda a tu medida", "Custom wedding"]], ["Cuéntanos lo que quieres y te mandamos el presupuesto por escrito.", "Tell us what you want and we send a written budget."], 4500, 120, {}, false, true],
    ["Extras", "Extras", "unid", [["Centros de mesa", "Centerpieces"]], ["Flores frescas o velas, por mesa.", "Fresh flowers or candles, per table."], 45, 60, { u: M("mesa", "table") }],
    ["Extras", "Extras", "unid", [["Arco de ceremonia", "Ceremony arch"]], ["Arco con flores y telas.", "Arch with flowers and fabric."], 350, 120, { u: M("arco", "arch") }],
    ["Primera cita", "First meeting", "visita", [["Cita de pareja", "Couple's meeting"], ["Reunión para conocernos", "Planning meeting"]], ["30 minutos sin costo: fecha, presupuesto y estilo.", "30 minutes at no cost: date, budget and style."], 0, 30, {}],
  ],
  "NEG-FIESTA-04": [
    ["Paquetes", "Packages", "pack", [["Baby shower clásico", "Classic baby shower"], ["Baby shower sencillo", "Simple baby shower"]], ["Hasta 40 invitados, 4 horas. Decoración con el tema que elijas.", "Up to 40 guests, 4 hours. Décor in the theme you choose."], 650, 240, { inc: INC.baby, h: 4, cap: 40, mont: true }, true],
    ["Paquetes", "Packages", "pack", [["Baby shower premium", "Premium baby shower"], ["Baby shower completo", "Complete baby shower"]], ["Hasta 80 invitados, 5 horas, con fotos y recuerdos.", "Up to 80 guests, 5 hours, with photos and keepsakes."], 1350, 300, { inc: [...INC.baby, M("Recuerdos para los invitados", "Guest keepsakes")], h: 5, cap: 80, mont: true }],
    ["Extras", "Extras", "unid", [["Arco de globos", "Balloon arch"]], ["En los colores de tu tema.", "In your theme colors."], 180, 60, { u: M("arco", "arch") }],
    ["Extras", "Extras", "unid", [["Mesa de dulces", "Candy table"]], ["Mesa de dulces temática.", "Themed candy table."], 220, 60, { u: M("mesa", "table") }],
    ["Extras", "Extras", "hora", [["Hora extra", "Extra hour"]], ["Si la fiesta se alarga.", "If the party runs long."], 60, 60, { min: 1 }],
    ["Primera cita", "First meeting", "visita", [["Cita para ver temas", "Theme meeting"]], ["Ven a ver temas y colores, sin costo.", "Come see themes and colors at no cost."], 0, 30, {}],
  ],
  "NEG-FIESTA-05": [
    ["Paquetes", "Packages", "pack", [["Fiesta infantil de 3 horas", "3-hour kids party"], ["Fiesta infantil clásica", "Classic kids party"]], ["Hasta 30 invitados: mesa, sillas, decoración con tu tema y animador.", "Up to 30 guests: table, chairs, themed décor and host."], 420, 180, { inc: INC.cumple, h: 3, cap: 30, mont: true }, true],
    ["Paquetes", "Packages", "pack", [["Fiesta con brincolín y piñata", "Party with bounce house and piñata"], ["Fiesta completa con brincolín", "Full party with bounce house"]], ["Hasta 50 invitados, 4 horas, con brincolín, piñata y dulces.", "Up to 50 guests, 4 hours, with bounce house, piñata and candy."], 780, 240, { inc: [...INC.cumple, M("Brincolín y piñata", "Bounce house and piñata")], h: 4, cap: 50, mont: true }],
    ["Paquetes", "Packages", "pack", [["Cumpleaños para adultos", "Adult birthday"], ["Cumpleaños con música", "Birthday with music"]], ["Hasta 80 invitados, 5 horas, con música y mesa de botanas.", "Up to 80 guests, 5 hours, with music and snack table."], 950, 300, { inc: [M("Mesas y sillas", "Tables and chairs"), M("Música y sonido", "Music and sound"), M("Decoración", "Décor")], h: 5, cap: 80, mont: true }],
    ["Extras", "Extras", "unid", [["Piñata", "Piñata"]], ["Piñata temática con dulces.", "Themed piñata with candy."], 45, 30, { u: M("piñata", "piñata") }],
    ["Extras", "Extras", "unid", [["Brincolín", "Bounce house"]], ["Brincolín registrado e inspeccionado, por 4 horas.", "Registered and inspected bounce house, per 4 hours."], 160, 240, { u: M("brincolín", "bounce house") }],
    ["Extras", "Extras", "hora", [["Hora extra", "Extra hour"]], ["Si la fiesta se alarga.", "If the party runs long."], 55, 60, { min: 1 }],
    ["Primera cita", "First meeting", "visita", [["Cita para ver temas", "Theme meeting"]], ["Ven a ver temas y colores, sin costo.", "Come see themes and colors at no cost."], 0, 30, {}],
  ],
};
const EVT_POR_SUB = { "NEG-FIESTA-01": ["empresa", "boda", "cumple", "grad", "bautizo"], "NEG-FIESTA-02": ["quince"], "NEG-FIESTA-03": ["boda"], "NEG-FIESTA-04": ["baby"], "NEG-FIESTA-05": ["cumple"] };

const P = {
  pos: { es: ["Todo salió como lo habíamos hablado, sin sorpresas el día del evento.", "Llegaron temprano, montaron todo y los invitados no paraban de decir qué bonito se veía.", "Muy atentos desde la primera cita; nos explicaron el presupuesto por escrito y lo cumplieron.", "La coordinadora resolvió cada problema sin que nos diéramos cuenta. Se lo recomiendo a cualquiera.", "La decoración quedó igual que las fotos que nos enseñaron, y el montaje fue puntual.", "Pagamos el depósito en la app y el resto el día de la fiesta, todo clarito.", "Nos ayudaron con el cronograma y con los proveedores; nosotros solo disfrutamos.", "Trato muy amable y precios justos. Ya los estamos recomendando en la familia.", "Fue la fiesta que soñábamos, y el equipo estuvo pendiente hasta que se fue el último invitado."],
    en: ["Everything went the way we talked about it, no surprises on the day.", "They arrived early, set everything up and guests kept saying how beautiful it looked.", "Very attentive from the first meeting; they explained the budget in writing and kept to it.", "The coordinator handled every issue without us noticing. I recommend them to anyone.", "The décor matched the photos they showed us and setup was on time.", "We paid the deposit in the app and the rest on the party day, all very clear.", "They helped with the timeline and the vendors; we just enjoyed it.", "Very kind and fair prices. We are already recommending them to family."] },
  mid: { es: ["Buena fiesta en general, aunque el montaje empezó un poco tarde.", "El servicio estuvo bien, pero faltó comunicación una semana antes del evento.", "La decoración quedó bonita; hubiéramos querido más detalle en la mesa principal."], en: ["Good party overall, although setup started a little late.", "Service was fine, but communication was lacking the week before the event.", "The décor was nice; we would have liked more detail on the head table."] },
  neg: { es: ["Llegaron tarde al montaje y los invitados ya estaban esperando.", "Lo que nos mostraron no fue lo que recibimos; faltaron varias cosas del paquete.", "Tuvimos que insistir mucho para que contestaran antes de la fecha."], en: ["They arrived late to setup and guests were already waiting.", "What they showed us was not what we received; several items from the package were missing.", "We had to push a lot to get answers before the date."] },
  cierre: { es: ["Volveremos a contratarlos.", "Cinco estrellas bien merecidas.", "Gracias por una fecha inolvidable."], en: ["We will hire them again.", "Five well-earned stars.", "Thank you for an unforgettable date."] },
  cierreNeg: { es: ["Esperamos que mejoren.", "Les di la oportunidad de corregirlo.", ""], en: ["We hope they improve.", "I gave them the chance to fix it.", ""] },
  faqs: [
    { q: bi("¿Cómo aparto mi fecha?", "How do I book my date?"), a: bi("Elige el día libre en el calendario, el paquete y la hora. El negocio confirma y se cobra el depósito; la fecha no es tuya hasta que te la confirmen.", "Pick a free day on the calendar, the package and the time. The business confirms and the deposit is charged; the date is not yours until they confirm it.") },
    { q: bi("¿Cuánto es el depósito y se devuelve?", "How much is the deposit and is it refundable?"), a: bi("El depósito aparta la fecha y se descuenta del total. Si cancelas con tiempo, se devuelve completo; si no, pierdes el depósito.", "The deposit holds the date and comes off the total. If you cancel in time it is fully refunded; otherwise the deposit is kept.") },
    { q: bi("¿Montan y recogen todo?", "Do you set up and pick everything up?"), a: bi("Sí, montamos antes del evento y desmontamos al terminar. Llegamos 2 horas antes.", "Yes, we set up before the event and tear down after. We arrive 2 hours early.") },
    { q: bi("¿Van a mi casa, patio o salón?", "Do you come to my home, backyard or hall?"), a: bi("Sí, dentro de nuestra zona. Si queda más lejos, dínoslo y lo hablamos.", "Yes, within our service area. If it is farther, tell us and we talk it over.") },
    { q: bi("¿Hay opciones en español e inglés?", "Do you work in Spanish and English?"), a: bi("Sí, atendemos en español y en inglés.", "Yes, we work in Spanish and English.") },
    { q: bi("¿Puedo ver el lugar o hablar antes de apartar?", "Can I meet before booking?"), a: bi("Claro. Pide la cita de 30 minutos, sin costo, y platicamos de tu evento.", "Of course. Ask for the free 30-minute meeting and we talk about your event.") },
  ],
  team: [
    { role: bi("Coordinadora de eventos", "Event coordinator"), bio: bi("Lleva el cronograma el día del evento.", "Runs the timeline on the day."), spec: [bi("Cronograma", "Timeline")] },
    { role: bi("Diseño y decoración", "Design and décor"), bio: bi("Arma la decoración y el escenario.", "Builds the décor and stage."), spec: [bi("Decoración", "Décor")] },
    { role: bi("Montaje", "Setup crew"), bio: bi("Monta y desmonta mesas, sillas y manteles.", "Sets up and tears down tables, chairs and linens."), spec: [] },
    { role: bi("Atención a clientes", "Client care"), bio: bi("Contesta mensajes y organiza las citas.", "Answers messages and schedules meetings."), spec: [] },
  ],
  posts: [
    { kind: "novedad", title: "Ya tomamos fechas del próximo año", body: "Los sábados vuelan: aparta tu fecha con un depósito pequeño en la app." },
    { kind: "novedad", title: "Nueva decoración en tonos tierra", body: "Mantelería, centros de mesa y arcos en verdes y dorados. Pregunta por el paquete." },
    { kind: "encuesta", title: "¿Qué color te gusta más este año?", body: "Cuéntanos y armamos el próximo catálogo.", poll: ["Dorado", "Rosa palo", "Verde salvia", "Azul marino"] },
    { kind: "oferta", slot: "pack", off: 0.15, title: "Viernes y domingos con descuento", body: "Si tu fiesta es en viernes o domingo, tienes un precio especial en el paquete." },
    { kind: "novedad", title: "Abrimos citas de planeación gratis", body: "Reserva 30 minutos desde la ficha: vemos fecha, invitados y presupuesto." },
    { kind: "novedad", title: "Gracias por un año lleno de fiestas", body: "Gracias a todas las familias que nos confiaron su fecha. Seguimos con ganas." },
    { kind: "novedad", title: "Cerramos el lunes por mantenimiento", body: "Atendemos mensajes igual; el equipo de montaje descansa." },
    { kind: "oferta", slot: "unid", off: 0.2, title: "Extras al mejor precio este mes", body: "Centros de mesa y arreglos con descuento si lo pides junto con tu paquete." },
    { kind: "encuesta", title: "¿Qué día prefieres para tu fiesta?", body: "Queremos abrir más fechas.", poll: ["Sábado", "Domingo", "Viernes", "Entre semana"] },
    { kind: "novedad", title: "Fotos de las últimas fiestas", body: "Subimos las fotos de los últimos eventos para que veas cómo queda el montaje." },
  ],
};

function precio(base, mult) { const c = base * mult; if (c >= 500) return Math.round(c / 50) * 5000; if (c >= 100) return Math.round(c / 5) * 500; return Math.round(c / 5) * 500 || 500; }

export function generar() {
  const negocios = negociosBase("FIESTA", "NEG-FIESTA", SUBS, {
    ficha(b, S, r) {
      const subCat = CAT[S.id]; const mult = r.f() * 0.4 + 0.85;
      const items = []; const used = new Set();
      subCat.forEach((row, ix) => {
        const [sec, secEn, kind, alts, descr, base, dur, attrs, feat] = row; const raro = kind === "unid" || kind === "hora";
        if (raro && r.chance(0.2)) return; // no todos ofrecen todos los extras
        const nm = r.pick(alts); if (used.has(nm[0])) return; used.add(nm[0]);
        const cents = kind === "visita" ? 0 : precio(base, mult), a = { ...attrs };
        if (a.cap) a.cap = Math.max(20, Math.round((a.cap * (0.8 + r.f() * 0.5)) / 10) * 10);
        items.push({ sec: bi(sec, secEn), secSort: [...new Set(subCat.map((x) => x[0]))].indexOf(sec), name: bi(nm[0], nm[1]), descr: bi(descr[0], descr[1]), cents, dur, kind, attrs: a, pfrom: kind === "cotiza" || (kind === "pack" && r.chance(0.3)), photo: b.pics[ix % b.pics.length], sort: ix, featured: !!feat });
      });
      b.items = items;
      const packs = items.filter((x) => x.kind === "pack"), minPack = Math.min(...packs.map((x) => x.cents));
      b.fiesta = { dep: r.pick([10000, 15000, 20000, 25000, 30000, 40000]), guests: Math.max(...packs.map((x) => x.attrs.cap || 0), 50), perDay: r.chance(0.2) ? 2 : 1, cancel: r.pick([14, 30, 30, 45]) };
      b.radius = r.pick([15, 25, 30, 40, 50]); b.fromHome = r.chance(0.4);
      b.languages = r.chance(0.55) ? ["es", "en"] : ["es"];
      const sub = S.es.toLowerCase(), anios = 2026 - b.founded;
      b.about = bi(`${b.name} organiza ${S.id === "NEG-FIESTA-01" ? "eventos de todo tipo" : sub.replace("organizador de ", "").replace("fiestas de ", "fiestas de ")} en ${CIUDADES[b.city].n} y sus alrededores desde ${b.founded}. Somos un equipo pequeño de ${b.team ? b.team.length : 3} personas que cuida cada detalle: presupuesto por escrito, montaje puntual y alguien de nosotros contigo el día de tu fecha. Atendemos en ${b.languages.length > 1 ? "español e inglés" : "español"}.`,
        `${b.name} plans ${S.en.toLowerCase().replace(" planner", "").replace("birthday parties", "birthday parties")} events in ${CIUDADES[b.city].n} and nearby since ${b.founded}. We are a small team that cares about every detail: a written budget, on-time setup and someone from us with you on your date. We serve you in ${b.languages.length > 1 ? "Spanish and English" : "Spanish"}.`);
      b.amenities = ["montaje-incluido", "paquetes", "acepta-tarjeta", ...(b.radius > 0 ? ["traslado"] : []), ...(r.chance(0.4) ? ["estacionamiento"] : [])];
      b.hours = horario(r.chance(0.5) ? H.lunSabCorto("10:00", "19:00", "10:00", "16:00").map((x, i) => (i === 0 ? [["12:00", "16:00"]] : x)) : H.lunSab("11:00", "19:00").map((x, i) => (i === 0 ? null : x)));
      const fv = ["esp", "finde", "paquete", "visita", "deposit", "traslado"]; if (items.some((x) => x.attrs.mont)) fv.push("montaje"); if (items.some((x) => x.kind === "hora")) fv.push("hora");
      if (S.id === "NEG-FIESTA-05" || S.id === "NEG-FIESTA-04") fv.push("ninos"); if (r.chance(0.35)) fv.push("noche"); if (b.founded <= 2016) fv.push("y10");
      b.filters = fv;
      b.modules = ["svc", "citas"];
      b.attrs = { m: "shop", cap: b.fiesta.guests, dep: b.fiesta.dep / 100, tarjeta: { fee: bi(`Paquete desde ${usd(minPack)}${b.fiesta.dep ? ` · depósito ${usd(b.fiesta.dep)}` : ""}`, `Package from ${usd(minPack)}${b.fiesta.dep ? ` · ${usd(b.fiesta.dep)} deposit` : ""}`), ...(r.chance(0.5) ? { offer: bi("Viernes y domingo con descuento", "Friday and Sunday discount") } : {}) } };
      b.licenses = [{ kind: "seguro_general", title: bi("Seguro de responsabilidad", "Liability insurance"), num: `POL-${r.i(100000, 999999)}`, review: addDays(ANCHOR_D, r.i(40, 320)) }, ...(S.id === "NEG-FIESTA-05" && r.chance(0.7) ? [{ kind: "pa_inflables", title: bi("Inflables registrados e inspeccionados", "Registered and inspected inflatables"), num: `PA-${r.i(1000, 9999)}`, review: addDays(ANCHOR_D, r.i(40, 320)) }] : [])];
      fichaComun(b, P);
      b.nPack = packs.length;
    },
  });
  for (const b of negocios) novedades(b, P, b.items.map((x) => ({ name: x.name.es, cents: x.cents, kind: x.kind })));

  /* ── Operaciones: fechas de fiesta pedidas por la app, con depósito ── */
  const ops = [], pdManual = [], pdBook = [], seq = { n: 0 };
  for (const b of negocios) {
    const r = rng(`ops:${b.id}`), next = cicloClientes(r), usedRev = new Set();
    const target = Math.round(22 + b.vol * b.vol * 56); // 22–78 reseñas
    const total = Math.round(target * r.f() * 1.1 + target * 1.9) + r.i(2, 10);
    const sent = fechasEnvio(r, total, Math.max(2016, b.founded), 1);
    const packs = b.items.filter((x) => x.kind === "pack" || x.kind === "cotiza"), extras = b.items.filter((x) => x.kind === "unid"), visits = b.items.filter((x) => x.kind === "visita");
    const evs = EVT_POR_SUB[b.sub.id]; const diasFuturos = new Set(); const bookedDays = new Set();
    for (const sd of sent) {
      seq.n++; const c = next(); const ck = uuidOf(`${b.id}:${seq.n}`), numN = 7100000 + 20000 * Math.floor(b.gi / 10) + (seq.n % 100000);
      const isVisit = visits.length && r.chance(0.2); const it = isVisit ? visits[0] : r.chance(0.12) && extras.length ? r.pick(extras) : r.pick(packs.length ? packs : b.items);
      const lead = isVisit ? r.i(3, 18) : r.i(25, 200);
      let d = addDays(sd, lead); // el día de la fiesta (fin de semana si es paquete)
      if (!isVisit) { const w = d.getUTCDay(); const want = r.chance(0.62) ? 6 : r.pick([5, 0, 6]); d = addDays(d, (want - w + 7) % 7); }
      const mins = isVisit ? r.pick([600, 660, 720, 840, 900, 960]) : r.pick([660, 720, 840, 900, 1020]); const sched = withTime(d, mins);
      const calcQty = it.kind === "unid" ? r.i(4, 24) : 1, hrs = it.attrs.h || 4;
      const tot = isVisit ? 0 : it.kind === "unid" ? it.cents * calcQty : it.cents, dep = isVisit ? 0 : Math.min(tot, b.fiesta.dep);
      const dur = isVisit ? 30 : it.kind === "unid" ? Math.min(480, it.dur) : it.dur;
      const o = { b: b.id, ck, num: `F-${numN}`, kind: "party", ph: c.phone, sent: sd, sched, dur, ps: 1, sub: tot, tot, dep, pm: dep > 0 ? "app" : "local", item: it.name.es, qty: calcQty, unit: it.cents, lname: it.name, ev: [["sent", "user", sd]], note: null,
        det: { svc: it.name, svcId: 0, k: it.kind, qty: calcQty, horas: 0, unit: it.cents, u: it.attrs.u || null, inc: it.attrs.inc || [], h: it.attrs.h || null, cap: it.attrs.cap || null, mont: !!it.attrs.mont, visit: !!isVisit, e: isVisit ? null : r.pick(evs), g: isVisit ? null : Math.min(it.attrs.cap || 60, r.pick([25, 50, 100, 150, 200])), donde: { k: "local", t: b.addr.text, mi: null }, sms: true, terms: { v: 1, cancel: b.fiesta.cancel, dep, ip: null } } };
      const future = isFuture(sched), ansAt = new Date(sd.getTime() + r.i(1, 20) * 3600000);
      const pastDue = !future;
      const roll = r.f();
      if (future) {
        const recentSent = (ANCHOR_D - sd) / 86400000 <= 3;
        if (recentSent && roll < 0.2) { o.st = "pending"; o.resp = new Date(sd.getTime() + 24 * 3600000); o.pstat = dep ? "held" : null; if (dep) { o.payKind = "deposit"; o.payAmt = dep; o.payFee = Math.round(dep * 0.08); o.payStat = "held"; } }
        else { const dk = ymd(sched); if (!isVisit && (bookedDays.has(dk) || diasFuturos.has(dk))) continue; if (!isVisit) bookedDays.add(dk);
          o.st = "confirmed"; o.ans = ansAt; o.conf = ansAt; o.pstat = dep ? "captured" : null; o.ev.push(["accepted", "business", ansAt]); if (dep) { o.payKind = "deposit"; o.payAmt = dep; o.payFee = Math.round(dep * 0.08); o.payStat = "captured"; }
          if (!isVisit) pdBook.push({ b: b.id, day: sched, ck, ph: c.phone }); }
      } else if (roll < 0.83) { // terminó
        o.st = "done"; o.ans = ansAt; o.conf = ansAt; o.done = new Date(sched.getTime() + (dur + 1440 + r.i(0, 600)) * 60000); o.pstat = dep ? "captured" : null; o.ev.push(["accepted", "business", ansAt], ["done", "system", o.done]); if (dep) { o.payKind = "deposit"; o.payAmt = dep; o.payFee = Math.round(dep * 0.08); o.payStat = "captured"; }
      } else if (roll < 0.91) { o.st = "cancelled"; o.canc = new Date(sd.getTime() + r.i(2, 40) * 86400000); if (o.canc > sched) o.canc = new Date(sched.getTime() - 86400000 * 3); o.cby = r.chance(0.8) ? "user" : "business"; o.creason = o.cby === "user" ? "cambio_planes" : "negocio"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["accepted", "business", ansAt], ["cancelled", o.cby === "user" ? "user" : "member", o.canc]);
        if (dep) { o.payKind = "deposit"; o.payAmt = dep; o.payFee = Math.round(dep * 0.08); const hecho = (sched - o.canc) / 86400000 >= b.fiesta.cancel; o.payStat = hecho || o.cby === "business" ? "refunded" : "captured"; o.pstat = o.payStat === "refunded" ? "refunded" : "captured"; } }
      else if (roll < 0.96) { o.st = "declined"; o.ans = ansAt; o.ev.push(["declined", "business", ansAt]); o.pstat = dep ? "released" : null; if (dep) { o.payKind = "deposit"; o.payAmt = dep; o.payFee = 0; o.payStat = "released"; } }
      else { o.st = "expired"; o.sd = "sin_respuesta"; o.resp = new Date(sd.getTime() + 86400000); o.ev.push(["expired", "system", o.resp]); o.pstat = dep ? "released" : null; if (dep) { o.payKind = "deposit"; o.payAmt = dep; o.payFee = 0; o.payStat = "released"; } }
      ops.push(o);
    }
    ponerResenas(r, P, (rr, st) => ({ trato: st >= 4 ? 1 : st === 3 ? 0 : -1, llegaron: st >= 4 ? "a" : st === 3 ? "b" : "c", fotosOk: st >= 4 ? 1 : st === 3 ? 0 : -1, limpio: st >= 3 ? 1 : 0, paquete: st >= 4 ? 1 : 0 }), ops.filter((o) => o.b === b.id), target, (o) => o.det.visit);
    // Calendario: días ocupados a mano (próximos fines de semana) que no chocan con las reservas
    const mine = ops.filter((o) => o.b === b.id && o.kind === "party"), take = new Set(mine.filter((o) => o.st === "confirmed" && !o.det.visit).map((o) => ymd(o.sched)));
    const r2 = rng(`cal:${b.id}`); let g = 0; const cnt = r2.i(3, 8), manual = new Set();
    while (manual.size < cnt && g++ < 60) { const dd = addDays(ANCHOR_D, r2.i(3, 150)); const w = dd.getUTCDay(); if (![5, 6, 0].includes(w) && !r2.chance(0.1)) continue; const k = ymd(dd); if (take.has(k) || manual.has(k)) continue; manual.add(k); pdManual.push({ b: b.id, day: dd }); }
  }

  const extra = [];
  extra.push(...sqlItemsFor(negocios));
  extra.push(`insert into fiesta_settings (business_id, deposit_cents, guests_max, events_per_day, book_ahead_days, cancel_full_days)
values ${negocios.map((b) => `(${s(b.id)}, ${b.fiesta.dep}, ${b.fiesta.guests}, ${b.fiesta.perDay}, 180, ${b.fiesta.cancel})`).join(",\n       ")}
on conflict (business_id) do nothing;`);
  const after = [];
  extra.push(`create temp table _pd (b text, d date, ck text, ph text) on commit drop;`);
  const pdRows = [...pdManual.map((x) => `(${s(x.b)}, ${dateLit(x.day)}, null, null)`), ...pdBook.map((x) => `(${s(x.b)}, ${dateLit(x.day)}, ${s(x.ck)}, ${s(x.ph)})`)];
  extra.push(`insert into _pd values\n${pdRows.join(",\n")};`);
  extra.push(`insert into party_days (business_id, city_id, day, source) select p.b, bz.city_id, p.d, 'manual' from _pd p join businesses bz on bz.id = p.b where p.ck is null and not exists (select 1 from party_days x where x.business_id = p.b and x.day = p.d and x.removed_at is null) on conflict do nothing;`);
  after.push(`insert into party_days (business_id, city_id, day, source, operation_id) select p.b, bz.city_id, p.d, 'booking', op.id from _pd p join businesses bz on bz.id = p.b join users u on u.phone = p.ph join operations op on op.user_id = u.id and op.client_key = p.ck::uuid
 where p.ck is not null and not exists (select 1 from party_days x where x.operation_id = op.id);`);
  return { negocios, ops, extra, after, cat: "NEG-FIESTA", file: "demo-d-fiesta.sql" };
}
import { sqlItems } from "./items.mjs";
function sqlItemsFor(negocios) { return sqlItems(negocios); }
