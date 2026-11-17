// NEG-TRANS · 5 subcategorías principales: viajes locales, traslado al aeropuerto, camioneta de larga distancia, shuttle entre ciudades y viajes entre estados.
import { rng, bi, usd, addDays, withTime, ymd, ANCHOR_D, isFuture, fechasEnvio, uuidOf, H, horario, s, n, j, ts, CIUDADES } from "./comun.mjs";
import { negociosBase, fichaComun, novedades, ponerResenas, cicloClientes } from "./base.mjs";
import { sqlItems } from "./items.mjs";

export const SUBS = [
  { id: "NEG-TRANS-01", es: "Viajes locales", en: "Local rides", also: "NEG-TRANS-10", names: ["Taxi Amigo Latino", "Rutas del Valle Taxi", "Viajes La Paloma", "Carro Seguro Viajes", "Sol de Mi Barrio Taxi", "Mi Ride Latino", "Viajes Cerca de Ti", "Taxi Quisqueya Local", "El Pasajero Feliz", "Taxi Rápido del Barrio"] },
  { id: "NEG-TRANS-02", es: "Traslado al aeropuerto", en: "Airport transfer", also: "NEG-TRANS-11", names: ["Aeropuerto Directo Traslados", "Al Vuelo Traslados", "Puerta a Puerta Aeropuertos", "Vuelo Seguro Shuttle", "Despegue Traslados", "Terminal Express Latino", "Ruta Aérea Traslados", "Equipaje Listo Aeropuerto", "Pista Libre Traslados", "Primer Vuelo Traslados"] },
  { id: "NEG-TRANS-03", es: "Camioneta de larga distancia", en: "Long-distance van", also: "NEG-TRANS-17", names: ["Van Express Latina", "Ruta Quisqueya Viajes", "Camionetas El Cibao", "Nueva York Directo Viajes", "Cruce de Estados Van", "Estrella Dorada Transporte", "Camioneta Sin Fronteras", "Ruta del Norte Viajes", "Viajes Mi Tierra Van", "Cerro Azul Camionetas"] },
  { id: "NEG-TRANS-04", es: "Shuttle entre ciudades", en: "Intercity shuttle", also: null, names: ["Shuttle Valle del Lehigh", "Conexión Pocono Shuttle", "Enlace Tres Ciudades Shuttle", "Ruta Diaria Shuttle", "Shuttle Camino Real", "Línea Norte Shuttle", "Puente de Ciudades Shuttle", "Viaje Seguro Entre Ciudades", "Shuttle Montaña Azul", "Cada Hora Shuttle"] },
  { id: "NEG-TRANS-05", es: "Viajes entre estados", en: "Interstate trips", also: null, names: ["Interestatal Latino Viajes", "Tres Estados Viajes", "Rumbo a Florida Viajes", "Ruta 80 Viajes", "Atlántico Viajes Interestatales", "Costa a Costa Latino", "Camino Largo Viajes", "Dos Mares Viajes", "Autopista Latina Viajes", "Frontera Norte Viajes"] },
];

const VECINA = { hzl: [["Allentown", "ABE"], ["Wilkes-Barre", ""], ["Scranton", ""]], alw: [["Reading", ""], ["Hazleton", ""], ["Filadelfia", "PHL"]], wbr: [["Scranton", ""], ["Hazleton", ""], ["Allentown", ""]], scr: [["Wilkes-Barre", ""], ["Hazleton", ""], ["Allentown", ""]], rdg: [["Allentown", ""], ["Filadelfia", ""], ["Lancaster", ""]] };
const CIUDAD_ES = { hzl: "Hazleton", alw: "Allentown", wbr: "Wilkes-Barre", scr: "Scranton", rdg: "Reading" };
const DEST_LARGA = [["Washington Heights, NY", 4500, 165, [5, 13, 19]], ["Paterson / Passaic, NJ", 4000, 120, [6, 16]], ["Brooklyn, NY", 4800, 180, [5, 14]], ["Bronx, NY", 4600, 170, [6, 15]], ["Union City, NJ", 4200, 140, [7, 17]], ["Lawrence, MA", 7500, 330, [6]], ["Baltimore, MD", 6500, 270, [7]], ["Providence, RI", 8000, 330, [6]]];
const DEST_ESTADOS = [["Orlando, FL", 14000, 960, [6]], ["Charlotte, NC", 9500, 540, [6]], ["Baltimore, MD", 5500, 270, [7, 15]], ["Boston, MA", 9000, 390, [6]], ["Atlanta, GA", 12500, 780, [5]], ["Washington, DC", 6500, 300, [6, 14]], ["Miami, FL", 15500, 1080, [5]], ["Columbus, OH", 8500, 420, [6]]];
const AEROPUERTOS = [["A JFK", "To JFK", 22000], ["A Newark (EWR)", "To Newark (EWR)", 18000], ["A Allentown (ABE)", "To Allentown (ABE)", 7500], ["A Filadelfia (PHL)", "To Philadelphia (PHL)", 19000], ["A Wilkes-Barre/Scranton (AVP)", "To Wilkes-Barre/Scranton (AVP)", 7000], ["A LaGuardia (LGA)", "To LaGuardia (LGA)", 21000]];

const P = {
  pos: { es: ["Llegó a la hora acordada y el viaje fue tranquilo de principio a fin.", "El precio fue el que me dijeron en la app, sin sorpresas ni cargos extra.", "El conductor muy amable, ayudó con las maletas y manejó con cuidado.", "La camioneta estaba limpia y salimos puntuales. Llegamos antes de lo previsto.", "Apartar mi asiento en la app fue fácil y me confirmaron enseguida.", "Viajé con mis hijos y tenían el asiento de niño listo, se agradece.", "Me recogieron en la puerta de mi casa y me avisaron cuando estaban cerca.", "Ya es la tercera vez que viajo con ellos y siempre cumplen."], en: ["Arrived at the agreed time and the ride was calm from start to finish.", "The price was the one quoted in the app, no surprises or extra charges.", "The driver was very kind, helped with the bags and drove carefully.", "The van was clean and we left on time. We arrived earlier than expected.", "Booking my seat in the app was easy and they confirmed right away.", "I traveled with my kids and the child seat was ready, much appreciated.", "They picked me up at my door and let me know when they were close.", "This is the third time I travel with them and they always deliver."] },
  mid: { es: ["El viaje estuvo bien, aunque salimos unos 20 minutos tarde.", "Buen servicio en general; la camioneta iba muy llena.", "Todo correcto, solo faltó avisar del cambio de hora de salida."], en: ["The trip was fine, although we left about 20 minutes late.", "Good service overall; the van was very full.", "All good, they just should have announced the departure time change."] },
  neg: { es: ["Salimos más de una hora tarde y nadie nos avisó.", "El conductor iba con prisa y el viaje no fue cómodo.", "Tuve que cancelar y la devolución tardó más de lo que decían."], en: ["We left over an hour late and nobody told us.", "The driver was in a hurry and the ride was not comfortable.", "I had to cancel and the refund took longer than they said."] },
  cierre: { es: ["Los recomiendo.", "Volveré a viajar con ellos.", "Gracias por el buen trato."], en: ["I recommend them.", "I will ride with them again.", "Thanks for the good service."] },
  cierreNeg: { es: ["Espero que mejoren.", "", ""], en: ["I hope they improve.", "", ""] },
  faqs: [
    { q: bi("¿Cuánto equipaje puedo llevar?", "How much luggage can I bring?"), a: bi("Cada pasajero lleva las maletas que dice el servicio sin costo. Una maleta extra tiene un cargo que ves antes de pagar.", "Each passenger brings the bags the service lists at no cost. An extra bag has a fee you see before paying.") },
    { q: bi("¿Cuándo se cobra mi viaje?", "When is my trip charged?"), a: bi("Al reservar se retiene el total; se cobra cuando el negocio confirma. Si no confirma, se libera completo.", "The total is held when you book and charged when the business confirms. If it does not confirm, it is released in full.") },
    { q: bi("¿Puedo cancelar?", "Can I cancel?"), a: bi("Sí. Hasta 24 horas antes se devuelve completo; con menos tiempo se cobra la mitad.", "Yes. Up to 24 hours before, you get a full refund; with less time, half is charged.") },
    { q: bi("¿Viajan niños? ¿Hay asiento para niños?", "Do kids travel? Is there a child seat?"), a: bi("Sí. Marca «asiento de niño» al reservar y lo tenemos listo; los niños pagan su precio aparte.", "Yes. Check “child seat” when booking and we have it ready; kids pay their own fare.") },
    { q: bi("¿Dónde me recogen?", "Where do you pick me up?"), a: bi("Donde sale la camioneta o, en viajes privados, en la dirección que nos des dentro de nuestra zona.", "At the departure point or, on private trips, at the address you give us within our area.") },
    { q: bi("¿Atienden en español?", "Do you speak Spanish?"), a: bi("Sí, atendemos en español y en inglés.", "Yes, we serve you in Spanish and English.") },
  ],
  team: [
    { role: bi("Conductor", "Driver"), bio: bi("Maneja las rutas de la mañana.", "Drives the morning routes."), spec: [] },
    { role: bi("Conductora", "Driver"), bio: bi("Maneja las rutas de la tarde.", "Drives the afternoon routes."), spec: [] },
    { role: bi("Despacho", "Dispatch"), bio: bi("Confirma viajes y avisa si hay cambios.", "Confirms trips and tells you about changes."), spec: [] },
    { role: bi("Mecánico de la flota", "Fleet mechanic"), bio: bi("Revisa cada camioneta antes de salir.", "Checks every van before it leaves."), spec: [] },
  ],
  posts: [
    { kind: "novedad", title: "Salida nueva los domingos", body: "Agregamos una salida más los domingos por la tarde. Aparta tu asiento en la app." },
    { kind: "novedad", title: "Camionetas nuevas y limpias", body: "Sumamos una camioneta con más espacio para maletas. Misma tarifa." },
    { kind: "encuesta", title: "¿A qué hora prefieres salir?", body: "Queremos ajustar los horarios.", poll: ["Temprano en la mañana", "Mediodía", "Tarde", "Noche"] },
    { kind: "oferta", slot: "asiento", off: 0.1, title: "Precio especial entre semana", body: "De lunes a jueves, el asiento cuesta menos. Aparta en la app." },
    { kind: "novedad", title: "Avisamos si hay tráfico o nieve", body: "Si cambia la hora de salida, te llega un aviso al teléfono." },
    { kind: "novedad", title: "Asiento de niño sin costo", body: "Marca asiento de niño al reservar y lo tenemos listo." },
    { kind: "novedad", title: "Gracias por viajar con nosotros", body: "Cumplimos otro año de servicio. Gracias a todas las familias." },
    { kind: "novedad", title: "Cerramos el día feriado", body: "No habrá salidas ese día. Retomamos al siguiente." },
    { kind: "oferta", slot: "priv", off: 0.1, title: "Van completa con descuento", body: "Viaja con tu familia en una sola van y paga menos por persona." },
  ],
};
const pr = (c, m, step = 500) => Math.round((c * m) / step) * step;

export function generar() {
  const negocios = negociosBase("TRANS", "NEG-TRANS", SUBS, {
    ficha(b, S, r) {
      const m = 0.9 + r.f() * 0.25, from = b.addr.text.replace(/, [^,]*$/, ""), vec = VECINA[b.city], items = []; let k = 0;
      const base = { photo: null };
      const pic = () => b.pics[k % b.pics.length];
      const seat = (to, cents, dmin, sal, sec, secEn, child = true) => items.push({ sec: bi(sec, secEn), secSort: 0, name: bi(`${CIUDAD_ES[b.city]} → ${to[0]}`, `${CIUDAD_ES[b.city]} → ${to[1] || to[0]}`), descr: bi(`Salidas ${sal.map((h) => (h % 12 || 12) + (h < 12 ? " AM" : " PM")).join(", ")} desde ${from}. ${Math.floor(dmin / 60) ? Math.floor(dmin / 60) + " h " : ""}${dmin % 60 ? (dmin % 60) + " min" : ""}.`.replace(/ \.$/, "."), `Departures ${sal.map((h) => (h % 12 || 12) + (h < 12 ? " AM" : " PM")).join(", ")} from ${from}. ${Math.floor(dmin / 60) ? Math.floor(dmin / 60) + " h " : ""}${dmin % 60 ? (dmin % 60) + " min" : ""}.`.replace(/ \.$/, ".")), cents, dur: 60, kind: "asiento", attrs: { inc: [bi("Peajes", "Tolls"), bi("2 maletas", "2 bags")], sal, pax: r.pick([12, 14, 14, 15]), to: bi(to[0], to[1] || to[0]), dmin, from: bi(from, from), ...(child ? { child: pr(cents, 0.7, 500) } : {}) }, pfrom: false, photo: pic(), sort: k++ });
      const priv = (name, nameEn, descr, descrEn, cents, pax, wait, sec = "Viajes privados", secEn = "Private trips") => items.push({ sec: bi(sec, secEn), secSort: 1, name: bi(name, nameEn), descr: bi(descr, descrEn), cents, dur: 60, kind: "priv", attrs: { inc: [bi("Peajes", "Tolls"), bi("Maletas", "Luggage"), ...(wait ? [bi(`Espera de ${wait} min si hay retraso`, `${wait}-minute wait if delayed`)] : [])], pax, ...(wait ? { wait } : {}) }, pfrom: false, photo: pic(), sort: k++ });
      if (S.id === "NEG-TRANS-01") {
        priv("Viaje local", "Local ride", "Hasta 4 personas dentro de la ciudad y los pueblos cercanos. Sales a la hora que pidas.", "Up to 4 people within the city and nearby towns. You leave at the time you ask for.", pr(2500, m, 500), 4, 15, "Dentro de la ciudad", "Within the city");
        priv(`A ${vec[0][0]}`, `To ${vec[0][0]}`, "Hasta 4 personas. Te recogen en tu casa.", "Up to 4 people. Pickup at your home.", pr(7500, m), 4, 15, "Dentro de la ciudad", "Within the city");
        priv("Cita médica con espera", "Medical visit with wait", "Te llevan, esperan hasta 1 hora y te regresan.", "They take you, wait up to 1 hour and bring you back.", pr(6000, m), 4, 60, "Dentro de la ciudad", "Within the city");
        if (r.chance(0.7)) priv("Mandados y compras (2 horas)", "Errands and shopping (2 hours)", "Dos horas con el carro para tus compras.", "Two hours with the car for your errands.", pr(7000, m), 4, 0, "Dentro de la ciudad", "Within the city");
        if (r.chance(0.5)) priv("Conductor designado", "Designated driver", "Tú y tu carro, de regreso a casa con seguridad.", "You and your car, safely back home.", pr(4500, m), 3, 15, "Dentro de la ciudad", "Within the city");
      } else if (S.id === "NEG-TRANS-02") {
        const lista = r.sample(AEROPUERTOS, r.i(3, 5)); lista.forEach((a, ix) => priv(a[0], a[1], `Hasta 4 personas. Te recogen en tu casa${ix === 0 ? " y esperan si el vuelo se atrasa (hasta 1 h)" : ""}.`, `Up to 4 people. Pickup at your home${ix === 0 ? " and wait if your flight is delayed (up to 1 h)" : ""}.`, pr(a[2], m, 500), 4, ix === 0 ? 60 : 0, "Aeropuertos", "Airports"));
        priv("Van para el grupo (hasta 10)", "Group van (up to 10)", "Para familias grandes, con todas las maletas.", "For large families with all the luggage.", pr(26000, m, 1000), 10, 30, "Aeropuertos", "Airports");
      } else if (S.id === "NEG-TRANS-03") {
        r.sample(DEST_LARGA, r.i(3, 4)).forEach((d) => seat([d[0]], pr(d[1], m), d[2], d[3], "Salidas", "Departures"));
        priv("Van completa a Nueva York", "Private van to New York", "Hasta 12 personas, sales a la hora que quieras.", "Up to 12 people, leave whenever you want.", pr(42000, m, 1000), 12, 30);
        if (r.chance(0.4)) items.push({ sec: bi("Envíos", "Shipping"), secSort: 2, name: bi("Caja a Nueva York", "Box to New York"), descr: bi("Entregamos tu caja en la dirección que nos digas en Nueva York o Nueva Jersey.", "We deliver your box to the address you give us in New York or New Jersey."), cents: pr(3500, m), dur: 60, kind: "caja", attrs: { inc: [bi("Recogida en tu casa", "Pickup at your home")] }, pfrom: false, photo: pic(), sort: k++ });
      } else if (S.id === "NEG-TRANS-04") {
        vec.forEach((v, ix) => { const cents = pr(1500 + ix * 700, m, 100), c0 = Math.round(cents / 100) * 100; seat([v[0], v[0]], c0, 45 + ix * 25, ix === 0 ? [6, 9, 12, 16, 19] : [7, 13, 18], "Rutas diarias", "Daily routes", false); });
        priv("Shuttle privado entre ciudades", "Private intercity shuttle", "Hasta 8 personas, a la hora que pidas.", "Up to 8 people, at the time you ask for.", pr(16000, m, 1000), 8, 15);
      } else {
        r.sample(DEST_ESTADOS, r.i(3, 4)).forEach((d) => seat([d[0]], pr(d[1], m), d[2], d[3], "Salidas entre estados", "Interstate departures"));
        priv("Van completa interestatal", "Private interstate van", "Hasta 12 personas, con dos conductores en viajes largos.", "Up to 12 people, with two drivers on long trips.", pr(150000, m, 5000), 12, 30);
      }
      b.items = items;
      b.trans = { bags: r.pick([1, 2, 2, 2, 3]), extra: r.pick([1000, 1500, 2000, null]), child: items.some((x) => x.kind === "asiento") ? r.chance(0.8) : r.chance(0.5), ramp: r.chance(0.2) };
      b.radius = S.id === "NEG-TRANS-05" || S.id === "NEG-TRANS-03" ? 25 : r.pick([15, 20, 30]); b.fromHome = false; b.languages = r.chance(0.5) ? ["es", "en"] : ["es"];
      const que = S.id === "NEG-TRANS-01" ? "viajes locales" : S.id === "NEG-TRANS-02" ? "traslados a los aeropuertos" : S.id === "NEG-TRANS-03" ? "viajes en camioneta de larga distancia" : S.id === "NEG-TRANS-04" ? "shuttles entre ciudades" : "viajes entre estados";
      const queEn = S.id === "NEG-TRANS-01" ? "local rides" : S.id === "NEG-TRANS-02" ? "airport transfers" : S.id === "NEG-TRANS-03" ? "long-distance van trips" : S.id === "NEG-TRANS-04" ? "intercity shuttles" : "interstate trips";
      b.about = bi(`${b.name} hace ${que} desde ${CIUDADES[b.city].n} desde ${b.founded}. Camionetas limpias, conductores con licencia y precio cerrado desde que reservas: lo que ves en la app es lo que pagas. Atendemos en ${b.languages.length > 1 ? "español e inglés" : "español"}.`, `${b.name} runs ${queEn} from ${CIUDADES[b.city].n} since ${b.founded}. Clean vans, licensed drivers and a fixed price from the moment you book: what you see in the app is what you pay. We serve you in ${b.languages.length > 1 ? "Spanish and English" : "Spanish"}.`);
      b.amenities = ["equipaje", ...(b.trans.child ? ["asiento-de-nino"] : []), ...(S.id >= "NEG-TRANS-03" ? ["cruza-estados"] : []), "acepta-tarjeta"];
      const abierto24 = S.id === "NEG-TRANS-01" ? r.chance(0.4) : S.id === "NEG-TRANS-02" ? r.chance(0.6) : false;
      b.hours = horario(abierto24 ? H.todos("00:00", "23:59") : H.todos("05:00", "22:00"));
      const lic = []; const num = () => r.i(100000, 999999);
      lic.push({ kind: "pa_puc", title: bi("Autorización de la PUC de Pennsylvania", "Pennsylvania PUC authority"), num: `A-${num()}`, review: addDays(ANCHOR_D, r.i(40, 330)) }, { kind: "usdot", title: bi("Número USDOT", "USDOT number"), num: `${r.i(1000000, 3999999)}`, review: addDays(ANCHOR_D, r.i(40, 330)) });
      if (["NEG-TRANS-03", "NEG-TRANS-04", "NEG-TRANS-05"].includes(S.id)) lic.push({ kind: "fmcsa_mc", title: bi("Autoridad interestatal (MC)", "Interstate authority (MC)"), num: `MC-${num()}`, review: addDays(ANCHOR_D, r.i(40, 330)) });
      b.licenses = lic;
      const fv = ["esp", "viaje", "cerrado"]; if (items.some((x) => x.kind === "caja")) fv.push("envio"); if (b.trans.bags > 0 && items.some((x) => x.kind === "asiento")) fv.push("equipaje"); if (b.trans.child) fv.push("nino"); if (b.trans.ramp) fv.push("silla");
      if (lic.some((l) => l.kind === "fmcsa_mc") || items.some((x) => /NY|NJ|MA|MD|FL|NC|GA|DC|OH|RI/.test(x.attrs.to?.es || x.name.es))) fv.push("estados"); if (abierto24) fv.push("24h"); if (b.founded <= 2016) fv.push("y10");
      b.filters = fv; b.modules = ["svc", "citas"];
      const minC = Math.min(...items.filter((x) => x.cents > 0).map((x) => x.cents));
      b.attrs = { m: "shop", tarjeta: { fee: bi(`Desde ${usd(minC)} · precio cerrado`, `From ${usd(minC)} · fixed price`) } };
      fichaComun(b, P);
    },
  });
  for (const b of negocios) novedades(b, P, b.items.map((x) => ({ name: x.name.es, cents: x.cents, kind: x.kind })));

  /* ── Viajes: asientos en salidas con hora, o vehículo completo ── */
  const ops = [], runs = new Map(), seq = { n: 0 };
  for (const b of negocios) {
    const r = rng(`ops:${b.id}`), next = cicloClientes(r);
    const target = Math.round(22 + b.vol * b.vol * 56), total = Math.round(target * (r.f() * 0.9 + 1.8)) + r.i(4, 14);
    const sent = fechasEnvio(r, total, Math.max(2016, b.founded), 0);
    const seat = b.items.filter((x) => x.kind === "asiento"), priv = b.items.filter((x) => x.kind === "priv"), caja = b.items.filter((x) => x.kind === "caja");
    for (const sd of sent) {
      seq.n++; const c = next(); const ck = uuidOf(`${b.id}:${seq.n}`), numN = 7200000 + 20000 * Math.floor(b.gi / 10) + (seq.n % 100000);
      const it = seat.length && (r.chance(0.65) || !priv.length) ? r.pick(seat) : r.pick(priv);
      const lead = r.chance(0.5) ? r.i(0, 3) : r.i(4, 25); const day = addDays(sd, lead);
      const adults = it.kind === "asiento" ? r.weighted([1, 2, 3, 4], [40, 35, 15, 10]) : 1, kids = it.kind === "asiento" && it.attrs.child && r.chance(0.25) ? r.i(1, 2) : 0, bags = it.kind === "asiento" && b.trans.extra && r.chance(0.15) ? r.i(1, 2) : 0;
      const seats = adults + kids; let hour = it.kind === "asiento" ? r.pick(it.attrs.sal) : r.pick([5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20]); const sched = withTime(day, hour * 60 + (it.kind === "asiento" ? 0 : r.pick([0, 30])));
      const tot = it.kind === "asiento" ? adults * it.cents + kids * (it.attrs.child || it.cents) + bags * (b.trans.extra || 0) : it.cents * (it.kind === "caja" ? r.i(1, 3) : 1);
      const dur = Math.min(600, Math.max(15, it.attrs.dmin || 60));
      const o = { b: b.id, ck, num: `V-${numN}`, kind: "trip", ph: c.phone, sent: sd, sched, dur, ps: Math.min(500, seats || adults), sub: tot, tot, dep: 0, pm: "app", item: it.name.es, qty: Math.max(1, seats || 1), unit: it.cents, lname: it.name, ev: [["sent", "user", sd]], note: null,
        det: { svc: it.name, svcId: 0, k: it.kind, unit: it.cents, child: it.attrs.child || null, adults, kids, childSeat: kids > 0, bagsIncl: b.trans.bags, bagsExtra: bags, extraBag: b.trans.extra, inc: it.attrs.inc || [], from: it.attrs.from || null, to: it.attrs.to || null, run: null, pickup: it.kind === "asiento" ? null : { t: b.addr.text }, sms: true, terms: { cancelH: 24, feePct: 50 } } };
      const ansAt = new Date(sd.getTime() + r.i(1, 120) * 60000), future = isFuture(sched), roll = r.f(), pay = (st, amt = tot) => { o.payKind = "full"; o.payAmt = amt; o.payFee = Math.round(amt * 0.06); o.payStat = st; o.pstat = st; };
      let runKey = null;
      if (it.kind === "asiento") runKey = `${b.id}|${it.name.es}|${ymd(sched)}|${hour}`;
      if (future) {
        if ((ANCHOR_D - sd) / 3600000 <= 30 && roll < 0.22) { o.st = "pending"; o.resp = new Date(sd.getTime() + 24 * 3600000); pay("held"); o.seatSt = "held"; }
        else { o.st = "confirmed"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["accepted", "business", ansAt]); pay("captured"); o.seatSt = "held"; }
      } else if (roll < 0.86) { o.st = "done"; o.ans = ansAt; o.conf = ansAt; o.done = new Date(sched.getTime() + dur * 60000 + r.i(0, 40) * 60000); o.ev.push(["accepted", "business", ansAt]); if (it.kind === "asiento") o.ev.push(["run_departed", "business", sched], ["run_arrived", "business", o.done]); pay("captured"); o.seatSt = "boarded"; }
      else if (roll < 0.93) { o.st = "cancelled"; o.canc = new Date(Math.max(sd.getTime() + 3600000, sched.getTime() - r.i(2, 96) * 3600000)); if (o.canc > sched) o.canc = new Date(sched.getTime() - 3 * 3600000); o.cby = r.chance(0.85) ? "user" : "business"; o.creason = o.cby === "user" ? "cambio_planes" : "negocio"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["accepted", "business", ansAt], ["cancelled", o.cby === "user" ? "user" : "member", o.canc]); pay((sched - o.canc) / 3600000 >= 24 || o.cby === "business" ? "refunded" : "captured"); o.seatSt = "cancelled"; }
      else if (roll < 0.97) { o.st = "declined"; o.ans = ansAt; o.ev.push(["declined", "business", ansAt]); pay("released"); o.seatSt = "cancelled"; }
      else { o.st = "expired"; o.sd = "sin_respuesta"; o.resp = new Date(sd.getTime() + 86400000); o.ev.push(["expired", "system", o.resp]); pay("released"); o.seatSt = "cancelled"; }
      if (runKey) { o.runKey = runKey; const g = runs.get(runKey) || { b: b.id, item: it.name.es, at: sched, total: it.attrs.pax, booked: 0, past: !future, ops: [] }; if (o.seatSt !== "cancelled") g.booked += seats; g.ops.push(o); runs.set(runKey, g); o.runSeats = seats; }
      ops.push(o);
    }
    ponerResenas(r, P, (rr, st) => ({ trato: st >= 4 ? 1 : st === 3 ? 0 : -1, cerrado: st >= 3 ? 1 : 0, salio: st >= 4 ? "a" : st === 3 ? "b" : "c", llego: st >= 4 ? "a" : st === 3 ? "b" : "c", manejo: st >= 3 ? 1 : 0, carga: st >= 4 ? 1 : st === 3 ? 0 : -1 }), ops.filter((o) => o.b === b.id), target);
  }
  // Una salida no vende más asientos de los que tiene: si el lote llenó de más, el viaje pasa a otra hora.
  for (const g of runs.values()) { if (g.booked > g.total) { let ex = g.booked - g.total; for (const o of g.ops.slice().reverse()) { if (ex <= 0) break; if (o.seatSt !== "cancelled") { o.seatSt = "cancelled"; if (o.st === "done") { o.st = "cancelled"; o.done = null; o.canc = new Date(o.sent.getTime() + 3600000 * 3); o.cby = "business"; o.creason = "negocio"; o.ev = o.ev.filter((e) => !String(e[0]).startsWith("run_")); o.ev.push(["cancelled", "member", o.canc]); o.payStat = "refunded"; o.pstat = "refunded"; delete o.review; } ex -= o.runSeats; g.booked -= o.runSeats; } } } }

  const extra = [...sqlItems(negocios)];
  extra.push(`insert into trans_settings (business_id, bags_included, extra_bag_cents, child_seat, ramp)
values ${negocios.map((b) => `(${s(b.id)}, ${b.trans.bags}, ${n(b.trans.extra)}, ${b.trans.child}, ${b.trans.ramp})`).join(",\n       ")}
on conflict (business_id) do nothing;`);
  const after = [];
  // Las salidas con viajes (ya pasadas o por venir) y las de los próximos 6 días, como las crea el motor.
  extra.push(`create temp table _run (b text, item text, at timestamp, total int, booked int, st text) on commit drop;`);
  const rv = [...runs.values()].map((g) => `(${s(g.b)}, ${s(g.item)}, ${ts(g.at)}, ${g.total}, ${Math.min(g.booked, g.total)}, ${s(g.past ? "arrived" : "scheduled")})`);
  for (let k = 0; k < rv.length; k += 500) extra.push(`insert into _run values\n${rv.slice(k, k + 500).join(",\n")};`);
  after.push(`insert into trip_runs (business_id, city_id, item_id, run_at, seats_total, seats_booked, status, departed_at, arrived_at)
select r.b, bz.city_id, i.id, r.at at time zone '${"America/New_York"}', r.total, r.booked, r.st, case when r.st = 'arrived' then r.at at time zone '${"America/New_York"}' end, case when r.st = 'arrived' then (r.at + interval '2 hours') at time zone '${"America/New_York"}' end
  from _run r join businesses bz on bz.id = r.b join items i on i.business_id = r.b and i.name->>'es' = r.item and i.module = 'svc' and i.removed_at is null
 on conflict (item_id, run_at) do nothing;`);
  after.push(`insert into trip_runs (business_id, city_id, item_id, run_at, seats_total)
select i.business_id, bz.city_id, i.id, ((current_date + d) + make_interval(hours => h::int)) at time zone '${"America/New_York"}', least(56, greatest(1, coalesce((i.svc_attrs->>'pax')::int, 14)))
  from items i join businesses bz on bz.id = i.business_id cross join generate_series(0, 6) d cross join lateral jsonb_array_elements_text(coalesce(i.svc_attrs->'sal', '[]'::jsonb)) as sl(h)
 where bz.owner_user_id in (select id from users where phone between '+15705559750' and '+15705559999') and bz.category_id = 'NEG-TRANS' and i.module = 'svc' and i.svc_kind = 'asiento' and i.removed_at is null
 on conflict (item_id, run_at) do nothing;`);
  const seatRows = [...runs.values()].flatMap((g) => g.ops.map((o) => `(${s(o.ck)}, ${s(o.ph)}, ${s(g.b)}, ${s(g.item)}, ${ts(g.at)}, ${o.runSeats}, ${s(o.seatSt)})`));
  extra.push(`create temp table _rs (ck text, ph text, b text, item text, at timestamp, seats int, st text) on commit drop;`);
  for (let k = 0; k < seatRows.length; k += 600) extra.push(`insert into _rs values\n${seatRows.slice(k, k + 600).join(",\n")};`);
  after.push(`insert into run_seats (operation_id, run_id, seats, status)
select op.id, tr.id, x.seats, x.st from _rs x join users u on u.phone = x.ph join operations op on op.user_id = u.id and op.client_key = x.ck::uuid
  join items i on i.business_id = x.b and i.name->>'es' = x.item and i.module = 'svc' and i.removed_at is null join trip_runs tr on tr.item_id = i.id and tr.run_at = x.at at time zone '${"America/New_York"}'
 on conflict do nothing;`);
  after.push(`update operations op set details = op.details || jsonb_build_object('run', tr.id::text) from run_seats rs join trip_runs tr on tr.id = rs.run_id where rs.operation_id = op.id and op.kind = 'trip' and not (op.details ? 'run') and op.business_id = tr.business_id and tr.business_id in (select id from businesses where owner_user_id in (select id from users where phone between '+15705559750' and '+15705559999'));`);
  return { negocios, ops, extra, after, cat: "NEG-TRANS", file: "demo-d-trans.sql" };
}
