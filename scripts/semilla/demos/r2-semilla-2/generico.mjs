/* Contenido genérico (por categoría y por nombre de subcategoría) para los negocios de la semilla base que no caen en una de las 5 subcategorías
   principales de la ronda 1. Nada de marcas ni personas reales, sin emoji, ES/EN. Los textos de inmuebles pasan el filtro de vivienda justa. */
import { Rng, BI, px, redondea, fotosDeSubs, hash } from "../c/base.mjs";
import { armarNovedades } from "../c/textos.mjs";
import { subEs, subEn } from "./base.mjs";

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const low = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
/* Nombre de ítem de ≤ 60 letras: si con la subcategoría se pasa, queda sin ella. */
const nm = (a, b, fallA, fallB) => ({ es: a.length <= 60 ? a : fallA ?? a.slice(0, 60), en: b.length <= 60 ? b : fallB ?? b.slice(0, 60) });
const inc = (...x) => x.map(([e, n]) => ({ es: e, en: n }));
const jit = (r, v, paso = 100) => redondea(v * (0.9 + r.next() * 0.24), paso);

export const FAM = { "NEG-HOGAR": "oficio", "NEG-AUTO": "oficio", "NEG-DEALER": "dealer", "NEG-INMUEBLE": "inm", "NEG-FIESTA": "fiesta", "NEG-TRANS": "trans", "NEG-EDU": "clases", "NEG-NINOS": "clases", "NEG-FE": "clases" };
export const OBJETIVO = { "NEG-HOGAR": 10, "NEG-AUTO": 9, "NEG-DEALER": 8, "NEG-INMUEBLE": 8, "NEG-FIESTA": 7, "NEG-TRANS": 6, "NEG-EDU": 6, "NEG-NINOS": 5, "NEG-FE": 6 };
export const AMENIDADES = {
  "NEG-HOGAR": ["acepta-tarjeta", "presupuesto-gratis", "con-seguro"], "NEG-AUTO": ["acepta-tarjeta", "presupuesto-gratis", "sala-de-espera", "estacionamiento"],
  "NEG-DEALER": ["acepta-tarjeta", "estacionamiento", "sala-de-espera"], "NEG-INMUEBLE": ["acepta-tarjeta", "sin-cita"], "NEG-FIESTA": ["acepta-tarjeta", "paquetes", "montaje-incluido"],
  "NEG-TRANS": ["acepta-tarjeta", "equipaje"], "NEG-EDU": ["acepta-tarjeta", "plan-de-pagos", "estacionamiento"], "NEG-NINOS": ["acepta-tarjeta", "estacionamiento"], "NEG-FE": ["estacionamiento", "accesible"],
};
export const LICENCIAS = { "NEG-DEALER": ["pa_dealer", "pa_vendedor_autos"], "NEG-INMUEBLE": ["pa_corredor"], "NEG-FIESTA": ["seguro_general"], "NEG-FE": ["irs_501c3"] };

/* ── Equipo (solo personal; el dueño real lo pone el negocio) ── */
const H = ["Edwin", "Jorge", "Víctor", "Ángel", "Nelson", "Samuel", "Gabriel", "Darío", "Efraín", "Ismael", "Alberto", "Rubén"], M = ["Yanira", "Sonia", "Lourdes", "Idalia", "Esperanza", "Carolina", "Evelyn", "Wendy", "Ivelisse", "Nancy"];
const AP = ["Rodríguez", "Martínez", "Díaz", "Pérez", "Santana", "Jiménez", "Almonte", "Peña", "Reyes", "Núñez", "Vargas", "Féliz", "Batista", "Méndez", "Ortiz", "Rosario", "Mejía", "Castillo", "Ramírez", "Torres", "Soto", "Colón", "Medina", "Polanco"];
const ROLES = {
  oficio: [["Técnico de campo", "Field technician"], ["Ayudante", "Helper"], ["Despacho y citas", "Dispatch and booking"]],
  dealer: [["Asesor de ventas", "Sales advisor"], ["Financiamiento y papeles", "Financing and paperwork"], ["Coordinación de pruebas de manejo", "Test drive coordinator"]],
  inm: [["Agente", "Agent"], ["Coordinación de visitas", "Showing coordinator"], ["Asistente de transacciones", "Transaction assistant"]],
  fiesta: [["Coordinadora de eventos", "Event coordinator"], ["Montaje y logística", "Setup and logistics"], ["Atención al cliente", "Customer service"]],
  trans: [["Conductor", "Driver"], ["Despacho", "Dispatch"], ["Atención al cliente", "Customer service"]],
  edu: [["Maestra", "Teacher"], ["Instructor", "Instructor"], ["Coordinación de inscripciones", "Enrollment coordinator"]],
  ninos: [["Maestra de aula", "Classroom teacher"], ["Asistente de aula", "Classroom assistant"], ["Coordinación y recepción", "Coordination and front desk"]],
  fe: [["Coordinación de ministerios", "Ministry coordinator"], ["Líder de alabanza", "Worship leader"], ["Secretaría y bienvenida", "Office and welcome"]],
};
const AUTO_ROLES = [["Mecánico", "Mechanic"], ["Técnico de servicio", "Service technician"], ["Atención al cliente", "Customer service"]];
export function equipo(B, r) {
  const k = B.cat === "NEG-NINOS" ? "ninos" : B.cat === "NEG-FE" ? "fe" : B.cat === "NEG-EDU" ? "edu" : FAM[B.cat], roles = B.cat === "NEG-AUTO" ? AUTO_ROLES : ROLES[k];
  const n = r.int(2, 3), out = [];
  for (let i = 0; i < n; i++) {
    const mujer = i === 2 || (i === 0 && ["fiesta", "edu", "ninos", "fe"].includes(k) ? r.chance(0.7) : r.chance(0.25));
    out.push({ name: `${r.pick(mujer ? M : H)} ${r.pick(AP)}`, role: BI(...roles[i]), since: r.int(B.founded + 1, 2024), langs: r.chance(0.45) ? ["es", "en"] : ["es"], bio: null, bookings: i < 2 });
  }
  return out;
}

/* ── Sobre nosotros ── */
export function sobre(B, r) {
  const S = low(subEs(B)), E = low(subEn(B)), y = B.founded, c = "Hazleton";
  const T = {
    "NEG-HOGAR": [`${cap(S)} en ${c} desde ${y}. Presupuesto por escrito antes de empezar, el precio que ves en la app es el que pagas y dejamos todo limpio. Hablamos español e inglés.`, `${cap(E)} in ${c} since ${y}. A written estimate before we start, the price you see in the app is the price you pay, and we leave everything clean. We speak Spanish and English.`],
    "NEG-AUTO": [`${cap(S)} en ${c} desde ${y}. Te explicamos el problema antes de tocar el carro, el estimado va por escrito y apartas tu hora desde la app. Hablamos español e inglés.`, `${cap(E)} in ${c} since ${y}. We explain the problem before touching the car, the estimate is in writing and you book your time in the app. We speak Spanish and English.`],
    "NEG-DEALER": [`${cap(S)} en ${c} desde ${y}. Cada unidad trae su precio claro y el total en la puerta se dice antes de firmar. Puedes llevarla a tu mecánico antes de decidir. Hablamos español e inglés.`, `${cap(E)} in ${c} since ${y}. Every unit shows a clear price and the out-the-door total is stated before you sign. You can take it to your mechanic before deciding. We speak Spanish and English.`],
    "NEG-INMUEBLE": [`${cap(S)} en ${c} desde ${y}. Ver una propiedad o pedir información es gratis, y el costo de mudarte o de cerrar se explica por escrito antes de firmar. Hablamos español e inglés.`, `${cap(E)} in ${c} since ${y}. Viewing a property or asking for information is free, and the cost of moving in or closing is explained in writing before you sign. We speak Spanish and English.`],
    "NEG-FIESTA": [`${cap(S)} en ${c} desde ${y}. Cada paquete dice qué incluye y cuántas horas, el anticipo es claro y el equipo llega a tiempo a montar. Hablamos español e inglés.`, `${cap(E)} in ${c} since ${y}. Every package says what it includes and for how many hours, the deposit is clear and the crew arrives on time to set up. We speak Spanish and English.`],
    "NEG-TRANS": [`${cap(S)} en ${c} desde ${y}. Precio por escrito antes de salir, choferes con experiencia y avisos en cada paso del viaje. Hablamos español e inglés.`, `${cap(E)} in ${c} since ${y}. A written price before you go, experienced drivers and updates at every step of the trip. We speak Spanish and English.`],
    "NEG-EDU": [`${cap(S)} en ${c} desde ${y}. Grupos pequeños, horarios para quien trabaja y un precio claro desde la inscripción. Hablamos español e inglés.`, `${cap(E)} in ${c} since ${y}. Small groups, schedules for people who work and a clear price from enrollment. We speak Spanish and English.`],
    "NEG-NINOS": [`${cap(S)} en ${c} desde ${y}. Un equipo conocido, horarios claros y la comunicación con las familias al día. Hablamos español e inglés.`, `${cap(E)} in ${c} since ${y}. A familiar team, clear schedules and day-to-day communication with parents. We speak Spanish and English.`],
    "NEG-FE": [`${cap(S)} en ${c} desde ${y}. Una comunidad abierta a quien quiera acercarse: horarios claros, actividades durante la semana y ayuda para quien la necesite. Hablamos español e inglés.`, `${cap(E)} in ${c} since ${y}. A community open to anyone who wants to join: clear schedules, activities during the week and help for those who need it. We speak Spanish and English.`],
  }[B.cat];
  return BI(T[0], T[1]);
}

/* ── Preguntas frecuentes (4–5 por categoría) ── */
export function preguntas(B) {
  const S = subEs(B), E = subEn(B);
  const F = {
    "NEG-HOGAR": [
      ["¿Cuánto cuesta?", "How much does it cost?", `En cada servicio de ${low(S)} verás el precio o el rango por escrito. Si el trabajo cambia, te lo decimos antes de seguir y tú decides.`, `Each ${low(E)} service shows the price or range in writing. If the job changes, we tell you before continuing and you decide.`],
      ["¿Cobran la visita?", "Do you charge for the visit?", "El presupuesto en tu casa es gratis; si el servicio lleva diagnóstico, se descuenta si haces el trabajo con nosotros.", "The estimate at your home is free; if the service includes a diagnosis, it is credited if you do the job with us."],
      ["¿Atienden emergencias?", "Do you handle emergencies?", "Sí, en el horario de emergencias que ves en la ficha. Te decimos cuánto tardamos en llegar.", "Yes, during the emergency hours shown on our page. We tell you how long it takes us to arrive."],
      ["¿Tienen seguro?", "Are you insured?", "Sí, trabajamos con seguro de responsabilidad. Si lo necesitas para un banco o un arrendador, te damos el comprobante.", "Yes, we carry liability insurance. If you need it for a bank or a landlord, we give you the certificate."],
      ["¿Cómo pido una cita?", "How do I book?", "Desde la ficha eliges el servicio y una hora libre; nos llega al instante y te confirmamos.", "From our page you pick the service and a free time; it reaches us instantly and we confirm."],
    ],
    "NEG-AUTO": [
      ["¿Cuánto cuesta el diagnóstico?", "How much is the diagnosis?", "Lo ves en la ficha del servicio. Si haces la reparación con nosotros, se descuenta del total.", "You see it on the service page. If you do the repair with us, it is credited to the total."],
      ["¿Dan garantía?", "Do you give a warranty?", "Sí, en piezas y mano de obra; el tiempo está en cada servicio. Si algo falla, vuelves y lo vemos.", "Yes, on parts and labor; the time is shown on each service. If something fails, come back and we take a look."],
      ["¿Puedo esperar mientras trabajan?", "Can I wait while you work?", "Para lo corto, sí: hay sala de espera. Para lo largo, lo dejas y te avisamos por la app cuando esté listo.", "For short jobs, yes: there is a waiting room. For longer ones, you leave it and we message you in the app when it is ready."],
      ["¿Me dan un estimado antes?", "Do I get an estimate first?", "Siempre, por escrito y con fotos si hace falta. No se hace nada que no hayas aprobado.", "Always, in writing and with photos if needed. Nothing is done that you have not approved."],
      ["¿Cómo aparto una hora?", "How do I book a time?", "En la ficha eliges el servicio y una hora libre; te confirmamos por mensaje.", "On our page you pick the service and a free time; we confirm by message."],
    ],
    "NEG-DEALER": [
      ["¿El precio incluye impuestos y placas?", "Does the price include taxes and tags?", "El precio es antes de impuestos. Antes de firmar te damos el total en la puerta: precio, impuesto de Pennsylvania, placas y título, y el cargo del dealer, por escrito.", "The price is before taxes. Before you sign we give you the out-the-door total: price, Pennsylvania tax, tags and title, and the dealer fee, in writing."],
      ["¿Puedo llevarlo a mi mecánico?", "Can I take it to my mechanic?", "Sí, siempre. Nos dices cuándo y lo preparamos; si sale algo en la revisión, lo hablamos antes de firmar.", "Yes, always. Tell us when and we get it ready; if anything comes up in the check, we talk about it before you sign."],
      ["¿Cómo pido una prueba o una visita?", "How do I ask for a test drive or visit?", "En la ficha eliges una hora libre y nos llega al instante. Antes no se cobra nada.", "On our page you pick a free time and it reaches us instantly. Nothing is charged beforehand."],
      ["¿Aceptan mi unidad como parte de pago?", "Do you take trade-ins?", "Te damos una oferta por escrito, gratis, y puedes compararla sin compromiso.", "We give you an offer in writing, free, and you can compare it with no commitment."],
      ["¿Qué papeles necesito?", "What papers do I need?", "Una ID y comprobante de domicilio; para financiar, te decimos qué más se necesita y nadie garantiza la aprobación antes de revisar.", "An ID and proof of address; to finance, we tell you what else is needed, and no one guarantees approval before reviewing."],
    ],
    "NEG-INMUEBLE": [
      ["¿Cobran por ver una propiedad?", "Do you charge to see a property?", "No. Ver una propiedad es gratis. Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.", "No. Viewing a property is free. Never pay a deposit before seeing the property and signing the contract."],
      ["¿Cómo reservo una visita?", "How do I book a showing?", "En cada anuncio eliges una hora libre y nos llega al instante. Si no puedes ir, cancela desde la app para liberar el horario.", "On each listing you pick a free time and it reaches us instantly. If you cannot make it, cancel in the app to free the slot."],
      ["¿Qué costos hay al mudarme o cerrar?", "What are the move-in or closing costs?", "Cada anuncio los muestra por escrito antes de que pidas la visita; nada queda fuera de lo que te dijimos.", "Each listing shows them in writing before you ask for a showing; nothing is left out of what we told you."],
      ["¿Qué papeles piden?", "What papers are required?", "Cada anuncio dice qué piden. Si algo no está claro, escríbenos y te respondemos el mismo día hábil.", "Each listing says what is required. If something is unclear, message us and we reply the same business day."],
      ["¿Atienden en español?", "Do you work in Spanish?", "Sí, atendemos en español e inglés.", "Yes, we work in Spanish and English."],
    ],
    "NEG-FIESTA": [
      ["¿Qué incluye cada paquete?", "What does each package include?", "Cada paquete lista lo que incluye y las horas. Lo que no está en la lista se cotiza aparte, antes de que apartes la fecha.", "Each package lists what it includes and the hours. Anything not on the list is quoted separately, before you book the date."],
      ["¿Cómo aparto la fecha?", "How do I book the date?", "Eliges el paquete y el día en la ficha y pagas un anticipo que se descuenta del total. Te confirmamos por mensaje.", "You pick the package and the day on our page and pay a deposit that is deducted from the total. We confirm by message."],
      ["¿Llegan a montar a tiempo?", "Do you arrive on time to set up?", "Sí. Acordamos la hora de montaje contigo y avisamos cuando el equipo sale.", "Yes. We agree the setup time with you and let you know when the crew leaves."],
      ["¿Puedo cambiar o cancelar?", "Can I change or cancel?", "Puedes mover la fecha con aviso; las condiciones de cancelación están en cada paquete.", "You can move the date with notice; the cancellation terms are on each package."],
      ["¿Tienen seguro?", "Are you insured?", "Sí, contamos con seguro de responsabilidad para el montaje y el servicio.", "Yes, we carry liability insurance for setup and service."],
    ],
    "NEG-TRANS": [
      ["¿Cuánto cuesta un viaje?", "How much is a trip?", "Ves el precio por escrito antes de reservar. No hay cargos escondidos: peajes y maletas dicen si están incluidos.", "You see the price in writing before booking. No hidden charges: tolls and bags say whether they are included."],
      ["¿Cómo reservo?", "How do I book?", "En la ficha eliges el viaje, la fecha y el punto de recogida; te confirmamos por mensaje.", "On our page you pick the trip, the date and the pickup point; we confirm by message."],
      ["¿Qué pasa si hay retraso?", "What if there is a delay?", "Te avisamos en cuanto lo sabemos. Cada servicio dice cuánto esperamos sin costo.", "We tell you as soon as we know. Each service says how long we wait at no charge."],
      ["¿Puedo llevar maletas?", "Can I bring luggage?", "Cada viaje dice cuántas maletas incluye y cuánto cuesta una extra.", "Each trip says how many bags it includes and what an extra one costs."],
      ["¿Puedo cancelar?", "Can I cancel?", "Sí; las condiciones de cancelación están en la ficha del viaje.", "Yes; the cancellation terms are on the trip page."],
    ],
    "NEG-EDU": [
      ["¿Cómo me inscribo?", "How do I enroll?", "Desde la ficha eliges el curso o la clase y el grupo; nos llega al instante y te confirmamos.", "From our page you pick the course or class and the group; it reaches us instantly and we confirm."],
      ["¿Cuánto cuesta?", "How much does it cost?", "Cada curso muestra el precio, la matrícula y los materiales. Si hay plan de pagos, también se ve ahí.", "Each course shows the price, enrollment fee and materials. If there is a payment plan, it shows there too."],
      ["¿Hay horarios para quien trabaja?", "Are there schedules for people who work?", "Sí, grupos de noche y de fin de semana. Cada grupo dice sus días y su hora.", "Yes, evening and weekend groups. Each group lists its days and time."],
      ["¿Puedo probar una clase?", "Can I try a class?", "Pregunta por la primera clase de prueba; si hay cupo, te la reservamos.", "Ask about a trial class; if there is room, we reserve it for you."],
      ["¿Dan certificado?", "Do you give a certificate?", "Al terminar recibes una constancia del centro. Si el curso tiene certificación oficial, la ficha lo dice.", "When you finish you get a certificate from the center. If the course has an official certification, the page says so."],
    ],
    "NEG-NINOS": [
      ["¿Cómo me inscribo?", "How do I enroll?", "Desde la ficha eliges el programa y nos llega al instante; te confirmamos y te decimos qué papeles llevar.", "From our page you pick the program and it reaches us instantly; we confirm and tell you which papers to bring."],
      ["¿Cuáles son los horarios?", "What are the hours?", "Cada programa muestra sus días y su hora. Si necesitas algo distinto, escríbenos.", "Each program shows its days and time. If you need something different, message us."],
      ["¿Cuánto cuesta?", "How much does it cost?", "El precio por semana o por mes está en cada programa; aceptamos subsidio si aplica y se dice en la ficha.", "The weekly or monthly price is on each program; we accept subsidy where it applies and the page says so."],
      ["¿Cómo me comunican lo que pasa en el día?", "How do you keep me posted during the day?", "Por mensaje en la app: avisos de entrada y salida y lo que necesites saber.", "By message in the app: arrival and pickup notices and anything you need to know."],
      ["¿Puedo visitar antes de decidir?", "Can I visit before deciding?", "Sí, pide una visita desde la ficha y te mostramos el lugar.", "Yes, ask for a visit from our page and we will show you around."],
    ],
    "NEG-FE": [
      ["¿Quién puede venir?", "Who can come?", "Cualquier persona que quiera acercarse. Las puertas están abiertas y no se cobra por asistir.", "Anyone who wants to join. The doors are open and there is no charge to attend."],
      ["¿Cuáles son los horarios?", "What are the service times?", "Los horarios de cada reunión están en la ficha y se actualizan cuando cambian.", "The time of each gathering is on our page and updated when it changes."],
      ["¿Cómo me apunto a una clase o grupo?", "How do I sign up for a class or group?", "Desde la ficha eliges la clase y nos llega al instante; te confirmamos por mensaje.", "From our page you pick the class and it reaches us instantly; we confirm by message."],
      ["¿Hay ayuda para quien la necesita?", "Is there help for people in need?", "Sí, según la semana: despensa, orientación y acompañamiento. Pregunta en la oficina o por mensaje.", "Yes, depending on the week: food pantry, guidance and support. Ask at the office or by message."],
      ["¿Cómo hago una donación?", "How do I donate?", "En persona o desde la app, si la comunidad la tiene activa. Recibes tu comprobante.", "In person or in the app, if the community has it on. You get your receipt."],
    ],
  };
  return F[B.cat].map((f) => [f[0], f[1], f[2], f[3]]);
}

/* ── Novedades ── */
export function novedades(B, r) {
  const S = low(subEs(B)), E = low(subEn(B));
  const C = {
    "NEG-HOGAR": [
      ["Presupuesto gratis esta semana", `Pide tu visita de ${S} desde la ficha: el presupuesto es gratis y por escrito.`],
      ["Antes del invierno", `Revisa tu casa antes del frío: te ayudamos con ${S} y lo que se acumuló en el año.`],
      ["Horario de feriados", "En los feriados atendemos solo emergencias. Las citas normales vuelven al día siguiente."],
      ["Gracias por las reseñas", "Cada reseña verificada nos ayuda a mejorar. Gracias a todos los que nos llamaron este año."],
      ["Plan de mantenimiento", "Un plan para tener tu casa al día durante el año, con un precio claro y el mismo equipo."],
      ["Trabajo terminado en un día", `Resolvimos varios trabajos de ${S} en una sola visita esta semana. Pide tu hora en la app.`],
      ["Lo que incluye cada servicio", "En cada servicio ves qué incluye y qué no, antes de apartar tu hora."],
      ["Nuevo horario de la tarde", "Abrimos más horas por la tarde para que puedas apartar después del trabajo."],
    ],
    "NEG-AUTO": [
      ["Revisión antes del invierno", `Batería, frenos y llantas antes de la primera helada. Aparta tu hora de ${S} en la app.`],
      ["Estimado por escrito", "Siempre te damos el estimado por escrito antes de empezar. Si cambia, te avisamos."],
      ["Horario de feriados", "En los feriados cerramos. Aparta tu hora con tiempo y te la guardamos."],
      ["Gracias por las reseñas", "Cada reseña verificada nos ayuda. Gracias por confiar en nosotros con tu carro."],
      ["Garantía en piezas y mano de obra", "Cada servicio dice cuánto dura su garantía. Si algo falla, vuelves y lo vemos."],
      ["Aparta tu hora desde la app", "Elige el servicio y una hora libre; te confirmamos por mensaje."],
      ["Diagnóstico con fotos", "Te mandamos fotos de lo que encontramos para que decidas con calma."],
    ],
    "NEG-DEALER": [
      ["Llegaron unidades nuevas al lote", `Esta semana entraron varias unidades de ${S}. Cada una trae su precio claro y el total en la puerta.`],
      ["Prueba sin compromiso", "Elige una hora libre en la ficha. Antes de la prueba no se cobra nada."],
      ["Trae tu mecánico", "Puedes llevar cualquier unidad a tu mecánico antes de firmar. Nos avisas y la preparamos."],
      ["Horario de feriados", "En los feriados cerramos. Reserva tu visita con tiempo."],
      ["Gracias por las reseñas", "Cada reseña verificada nos ayuda. Gracias a todos los que nos visitaron este año."],
      ["Lo que incluye el total en la puerta", "Precio, impuesto de Pennsylvania, placas y título, y el cargo del dealer: todo por escrito antes de firmar."],
    ],
    "NEG-INMUEBLE": [
      ["Visitas esta semana", `Abrimos horas de visita de lunes a sábado. Elige la tuya en la ficha; ver una propiedad es gratis.`],
      ["Guía para tu primera compra o renta", `Qué papeles llevar y cómo se calculan los costos de ${S}. Escríbenos y te mandamos la guía.`],
      ["Costos claros antes de firmar", "Cada anuncio muestra por escrito lo que pagas al mudarte o al cerrar."],
      ["Horario de feriados", "En los feriados atendemos solo por mensaje. Las visitas vuelven al día siguiente."],
      ["Gracias por las reseñas", "Cada reseña verificada nos ayuda. Gracias a todos los que visitaron una propiedad con nosotros."],
      ["Nunca pagues antes de ver", "Ver una propiedad es gratis. No pagues un depósito antes de verla y firmar el contrato."],
    ],
    "NEG-FIESTA": [
      ["Fechas de fin de año", `Ya tenemos agenda para las fiestas de fin de año. Aparta tu fecha de ${S} con un anticipo.`],
      ["Paquetes con todo incluido", "Cada paquete dice qué incluye y cuántas horas. Sin sorpresas el día de la fiesta."],
      ["Reunión para conocernos", "Cuéntanos tu idea en una reunión corta y te armamos el presupuesto por escrito."],
      ["Gracias por las reseñas", "Cada reseña verificada nos ayuda. Gracias a las familias que nos eligieron este año."],
      ["Montaje a tiempo", "Llegamos a montar a la hora acordada y avisamos cuando el equipo sale."],
      ["Horas extra disponibles", "Si la fiesta se alarga, la hora extra tiene un precio claro desde el principio."],
      ["Horario de feriados", "En los feriados atendemos por mensaje. Las visitas vuelven al día siguiente."],
    ],
    "NEG-TRANS": [
      ["Salidas de fin de semana", `Ya hay lugares para los viajes de ${S} de este fin de semana. Reserva en la app.`],
      ["Precio por escrito", "Ves el precio antes de reservar; peajes y maletas dicen si están incluidos."],
      ["Horario de feriados", "En los feriados hay menos salidas: reserva con tiempo y te confirmamos."],
      ["Gracias por las reseñas", "Cada reseña verificada nos ayuda. Gracias por viajar con nosotros."],
      ["Avisos del viaje", "Te avisamos cuando el chofer sale y cuando llega, por mensaje."],
      ["Maletas extra", "Cada viaje dice cuántas maletas incluye y cuánto cuesta una extra."],
    ],
    "NEG-EDU": [
      ["Inscripciones abiertas", `Quedan lugares en los grupos de ${S}. Inscríbete desde la ficha; te confirmamos por mensaje.`],
      ["Grupos de noche y fin de semana", "Horarios para quien trabaja. Cada grupo dice sus días y su hora."],
      ["Primera clase de prueba", "Pregunta por la clase de prueba; si hay cupo, te la reservamos."],
      ["Gracias por las reseñas", "Cada reseña verificada nos ayuda. Gracias a los estudiantes que compartieron su experiencia."],
      ["Plan de pagos", "Si lo necesitas, el curso se puede pagar en partes. Se ve en la ficha de cada curso."],
      ["Nuevo grupo empieza pronto", "Abrimos un grupo nuevo el mes que viene. Aparta tu lugar desde la app."],
      ["Horario de feriados", "En los feriados no hay clases. Las clases se reponen según el calendario de cada grupo."],
    ],
    "NEG-NINOS": [
      ["Inscripciones abiertas", `Hay lugares en ${S}. Pide una visita desde la ficha y te mostramos el lugar.`],
      ["Avisos por mensaje", "Te avisamos por mensaje de la entrada, la salida y lo que necesites saber."],
      ["Horario de feriados", "En los feriados cerramos. El calendario del año está en la ficha."],
      ["Gracias por las reseñas", "Cada reseña verificada nos ayuda. Gracias a las familias que confían en nosotros."],
      ["Visita antes de decidir", "Puedes conocer el lugar y al equipo antes de inscribirte."],
      ["Precio claro por semana y por mes", "Cada programa muestra su precio, y si aceptamos subsidio, también."],
    ],
    "NEG-FE": [
      ["Horario de la semana", "Los horarios de las reuniones de esta semana están en la ficha. Las puertas están abiertas."],
      ["Clases y grupos", `Hay lugares en los grupos de ${S}. Apúntate desde la ficha.`],
      ["Ayuda para quien la necesita", "Esta semana hay despensa y orientación. Pregunta en la oficina o por mensaje."],
      ["Gracias a los voluntarios", "Gracias a cada persona que ayudó este mes. Sin ustedes esto no se puede."],
      ["Horario de feriados", "En los feriados cambian algunos horarios; revisa la ficha."],
      ["Encuentro de la comunidad", "Te esperamos en el próximo encuentro. Trae a quien quieras."],
    ],
  }[B.cat];
  const L = C.map(([title, body]) => ({ title, body, kind: "novedad" }));
  return armarNovedades(B, L, r, r.int(4, 6));
}

/* ── Fotos ── */
import { FOTOS as FD } from "../d/fotos.mjs";
export function fotosPool(B) {
  const k = { "NEG-FIESTA": "FIESTA", "NEG-TRANS": "TRANS", "NEG-EDU": "EDU", "NEG-NINOS": "NINOS", "NEG-FE": "FE" }[B.cat];
  if (k) return FD[k];
  return fotosDeSubs([B.sub, ...B.subs0], B.cat).map((id) => px(id));
}
export function galeria(B, r) {
  const pool = fotosPool(B).filter((u) => !B.photos.includes(u));
  const falta = Math.max(0, 8 - B.photos.length);
  return r.shuffle(pool).slice(0, Math.min(falta, pool.length));
}

/* ── Ítems genéricos ── */
const mk = (o) => ({ m: "svc", ...o });
export function itemsOficio(B, r, fotos) {
  const S = subEs(B), E = subEn(B), hogar = B.cat === "NEG-HOGAR", F = (i) => [px(fotos[(i * 7 + B.idx) % fotos.length])];
  const L = [];
  if (hogar) {
    L.push(mk({ key: "g_visita", ...nm(`Visita y presupuesto de ${S}`, `${E} visit and estimate`, "Visita y presupuesto", "Visit and estimate"), des: "Vemos el trabajo en tu casa y te damos el precio por escrito. Gratis.", den: "We see the job at your home and give you the price in writing. Free.", kind: "visita", price: 0, dur: 45, attrs: { free: true }, feat: true }));
    L.push(mk({ key: "g_std", ...nm(`Servicio estándar de ${S}`, `Standard ${E} service`, "Servicio estándar", "Standard service"), des: "Mano de obra y limpieza al terminar. Si hace falta material, lo ves con su precio antes de comprarlo.", den: "Labor and cleanup when done. If material is needed, you see it with its price before we buy it.", kind: "fijo", price: jit(r, 12900), dur: 90, attrs: { inc: inc(["Mano de obra", "Labor"], ["Limpieza al terminar", "Cleanup when done"]) }, feat: true }));
    L.push(mk({ key: "g_hora", ...nm(`${cap(S)} por hora`, `${cap(E)} by the hour`, "Trabajo por hora", "Work by the hour"), des: "Para varios arreglos en la misma visita.", den: "For several fixes in the same visit.", kind: "hora", price: jit(r, 9500), dur: 60, attrs: { mh: 1, inc: inc(["Primera hora y herramientas", "First hour and tools"]), no: inc(["Materiales aparte, con precio antes de comprarlos", "Materials extra, priced before buying"]) } }));
    L.push(mk({ key: "g_diag", ...nm(`Revisión y diagnóstico de ${S}`, `${E} check and diagnosis`, "Revisión y diagnóstico", "Check and diagnosis"), des: "Revisamos, te explicamos qué pasa y te damos el precio del arreglo.", den: "We check, explain what is going on and give you the price of the fix.", kind: "fijo", price: jit(r, 7900), dur: 60, attrs: {} }));
    L.push(mk({ key: "g_peq", ...nm(`Reparación pequeña de ${S}`, `Small ${E} repair`, "Reparación pequeña", "Small repair"), des: "Arreglos cortos que se resuelven en una visita.", den: "Short fixes that get done in one visit.", kind: "fijo", price: jit(r, 8900), dur: 60, attrs: {} }));
    L.push(mk({ key: "g_inst", ...nm(`Instalación o reemplazo · ${S}`, `Installation or replacement · ${E}`, "Instalación o reemplazo", "Installation or replacement"), des: "Instalamos o cambiamos lo que haga falta, con prueba al terminar.", den: "We install or replace what is needed, tested when done.", kind: "fijo", price: jit(r, 18900), dur: 120, attrs: { inc: inc(["Prueba al terminar", "Test when done"]) } }));
    const lo = jit(r, 30000, 5000);
    L.push(mk({ key: "g_pres", ...nm(`Proyecto de ${S} con presupuesto`, `${cap(E)} project with estimate`, "Proyecto con presupuesto", "Project with estimate"), des: "Presupuesto por escrito con fotos de lo que se cambia y cuántos días.", den: "Written estimate with photos of what changes and how many days.", kind: "pres", price: lo, dur: 120, from: true, attrs: { rng: [lo, lo * 4], cred: true } }));
    L.push(mk({ key: "g_emer", ...nm(`Emergencia de ${S} 24/7`, `${cap(E)} emergency 24/7`, "Emergencia 24/7", "Emergency 24/7"), des: "Salimos a cualquier hora, también domingos.", den: "We go out any time, Sundays too.", kind: "emer", price: jit(r, 17500), dur: 60, attrs: { sur: 7500, inc: inc(["Salida y primera hora", "Call-out and first hour"]) } }));
    L.push(mk({ key: "g_plan", ...nm(`Plan de mantenimiento · ${S}`, `Maintenance plan · ${E}`, "Plan de mantenimiento", "Maintenance plan"), des: "Una visita para tener todo al día durante el año.", den: "One visit to keep everything up to date through the year.", kind: "plan", price: jit(r, 7900), dur: 60, attrs: { fr: "temp", inc: inc(["Revisión de puntos clave", "Key-point check"], ["Prioridad de cita", "Booking priority"]) } }));
  } else {
    const sub = B.sub, lav = ["NEG-AUTO-22", "NEG-AUTO-23", "NEG-AUTO-24"].includes(sub), goma = sub === "NEG-AUTO-13", grua = ["NEG-AUTO-34", "NEG-AUTO-35"].includes(sub), insp = sub === "NEG-AUTO-36";
    L.push(mk({ key: "a_diag", ...nm(`Diagnóstico de ${S}`, `${E} diagnosis`, "Diagnóstico", "Diagnosis"), des: "Revisamos y te decimos qué hace falta, con el precio por escrito.", den: "We check and tell you what is needed, with the price in writing.", kind: "diag", price: 0, dur: 60, attrs: { w: "ambos", alt: jit(r, 8500, 500) }, feat: true }));
    if (lav) L.push(mk({ key: "a_lav", ...nm(`${cap(S)} · auto, SUV o camioneta`, `${cap(E)} · car, SUV or truck`, "Lavado por tamaño", "Wash by size"), des: "El precio depende del tamaño del vehículo.", den: "The price depends on the vehicle size.", kind: "lav", price: 2500, dur: 45, attrs: { w: "espera", walk: true, sz: [jit(r, 2500), jit(r, 3200), jit(r, 4200)] }, feat: true }));
    if (goma) L.push(mk({ key: "a_goma", es: "Rotación y balanceo de gomas", en: "Tire rotation and balancing", des: "Las cuatro gomas rotadas y balanceadas mientras esperas.", den: "All four tires rotated and balanced while you wait.", kind: "goma", price: jit(r, 3200), dur: 45, attrs: { w: "espera", per: "goma", walk: true } }));
    if (grua) L.push(mk({ key: "a_grua", ...nm(`${cap(S)} · servicio local`, `${cap(E)} · local service`, "Servicio local de grúa", "Local towing"), des: "Servicio dentro de la zona; el precio total lo ves antes de pedirla.", den: "Service within the area; you see the full price before requesting.", kind: "grua", price: jit(r, 9500, 500), dur: null, attrs: { w: "dom" }, feat: true }));
    if (insp) L.push(mk({ key: "a_insp", es: "Inspección de seguridad de PA", en: "PA safety inspection", des: "Revisión completa y calcomanía si pasa.", den: "Full check and sticker if it passes.", kind: "insp", price: jit(r, 6200), dur: 60, attrs: { w: "ambos", inc: inc(["Revisión completa", "Full check"], ["Calcomanía", "Sticker"]) } }));
    L.push(mk({ key: "a_serv", ...nm(`Servicio de ${S}`, `${cap(E)} service`, "Servicio estándar", "Standard service"), des: "Servicio con precio fijo; piezas y mano de obra incluidas.", den: "Fixed-price service; parts and labor included.", kind: "fijo", price: jit(r, 11900), dur: 60, attrs: { w: "ambos" }, feat: !lav && !grua }));
    L.push(mk({ key: "a_rev", ...nm(`Revisión de ${S} antes del invierno`, `Pre-winter ${E} check`, "Revisión antes del invierno", "Pre-winter check"), des: "Revisión de los puntos clave antes de la primera helada.", den: "A check of the key points before the first frost.", kind: "fijo", price: jit(r, 4900), dur: 45, attrs: { w: "ambos" } }));
    L.push(mk({ key: "a_rep", ...nm(`Reparación de ${S} · desde`, `${cap(E)} repair · from`, "Reparación desde", "Repair from"), des: "El precio final depende de lo que se encuentre; te avisamos antes de seguir.", den: "The final price depends on what we find; we tell you before continuing.", kind: "desde", price: jit(r, 13600), dur: 90, from: true, attrs: { w: "ambos", inc: inc(["Mano de obra y prueba en carretera", "Labor and road test"]) } }));
    const lo = jit(r, 20000, 5000);
    L.push(mk({ key: "a_cot", ...nm(`Trabajo mayor de ${S}`, `Major ${E} job`, "Trabajo mayor", "Major job"), des: "Rango por escrito; la cifra final llega con fotos y la apruebas tú.", den: "Written range; the final figure comes with photos and you approve it.", kind: "cotiza", price: lo, dur: 120, from: true, attrs: { w: "deja", rng: [lo, lo * 3], days: [1, 3] } }));
    L.push(mk({ key: "a_rev2", ...nm(`Revisión antes de comprar · ${S}`, `Pre-purchase check · ${E}`, "Revisión antes de comprar", "Pre-purchase check"), des: "Revisamos el vehículo que vas a comprar y te damos el informe por escrito.", den: "We check the vehicle you are about to buy and give you a written report.", kind: "fijo", price: jit(r, 9500, 500), dur: 90, attrs: { w: "deja" } }));
  }
  return L.map((x, i) => ({ ...x, fotos: F(i), sort: i }));
}

export function itemsFiesta(B, r, fotos) {
  const S = subEs(B), E = subEn(B), F = (i) => [px0(fotos, i, B)];
  const base = jit(r, 35000, 500);
  const L = [
    mk({ es: "Reunión para conocernos", en: "Meet and plan", des: "Nos cuentas tu idea y te armamos el presupuesto por escrito. Gratis.", den: "You tell us your idea and we build the estimate in writing. Free.", kind: "visita", price: 0, dur: 30, attrs: {}, feat: true }),
    mk({ ...nm(`Paquete básico · ${S}`, `Basic package · ${E}`, "Paquete básico", "Basic package"), des: "Lo esencial para una fiesta sencilla, con montaje y desmontaje.", den: "The essentials for a simple party, with setup and teardown.", kind: "pack", price: base, dur: 240, attrs: { h: 4, inc: inc(["Montaje y desmontaje", "Setup and teardown"], ["Mesas, sillas y manteles", "Tables, chairs and linens"]), mont: true }, feat: true }),
    mk({ ...nm(`Paquete completo · ${S}`, `Full package · ${E}`, "Paquete completo", "Full package"), des: "Todo lo del básico más decoración y un coordinador durante el evento.", den: "Everything in the basic plus décor and a coordinator during the event.", kind: "pack", price: jit(r, base * 2.2, 500), dur: 360, attrs: { h: 6, inc: inc(["Todo lo del paquete básico", "Everything in the basic package"], ["Decoración del lugar", "Venue décor"], ["Coordinador durante el evento", "Coordinator during the event"]), mont: true }, feat: true }),
    mk({ ...nm(`Paquete premium · ${S}`, `Premium package · ${E}`, "Paquete premium", "Premium package"), des: "El paquete más completo, con ocho horas y servicio durante todo el evento.", den: "Our most complete package, with eight hours and service throughout the event.", kind: "pack", price: jit(r, base * 3.6, 500), dur: 480, attrs: { h: 8, inc: inc(["Todo lo del paquete completo", "Everything in the full package"], ["Servicio de meseros", "Wait staff"], ["Mesa de dulces", "Candy table"]), mont: true } }),
    mk({ es: "Hora extra", en: "Extra hour", des: "Si la fiesta se alarga, cada hora extra tiene este precio.", den: "If the party runs long, each extra hour is this price.", kind: "hora", price: jit(r, 9500), dur: 60, attrs: { min: 1 } }),
    mk({ es: "Servicio por persona", en: "Per-person service", des: "Atención por persona adicional a lo incluido en el paquete.", den: "Per-person service in addition to what the package includes.", kind: "unid", price: jit(r, 1800), dur: 60, attrs: { u: { es: "persona", en: "person" } } }),
    mk({ es: "Evento a tu medida", en: "Custom event", des: "Presupuesto por escrito según lo que necesites; lo apruebas antes de apartar la fecha.", den: "A written estimate based on what you need; you approve it before booking the date.", kind: "cotiza", price: jit(r, 90000, 500), dur: 120, from: true, attrs: {} }),
  ];
  return L.map((x, i) => ({ ...x, fotos: F(i), sort: i }));
}
const px0 = (fotos, i, B) => fotos[(i * 5 + B.idx) % fotos.length];

export function itemsTrans(B, r, fotos) {
  const S = subEs(B), E = subEn(B), F = (i) => [px0(fotos, i, B)], id = B.sub.slice(-2);
  const entrega = ["13", "14", "15", "17"].includes(id), flete = ["18", "19", "23", "24", "25", "26"].includes(id), servicio = ["06", "08", "09"].includes(id);
  const priv = (es, en, des, den, price, extra = {}) => mk({ es, en, des, den, kind: "priv", price: jit(r, price, 500), dur: 60, attrs: { inc: inc(["Peajes", "Tolls"], ["Maletas", "Luggage"], ["Espera de 15 min si hay retraso", "15-minute wait if delayed"]), pax: 4, wait: 15 }, ...extra });
  let L;
  if (entrega) L = [
    mk({ es: "Mandado dentro de la ciudad", en: "Errand within the city", des: "Mandas lo que necesitas y pagas el costo más la entrega.", den: "You send what you need and pay the cost plus delivery.", kind: "caja", price: jit(r, 1500), dur: 60, attrs: {}, feat: true }),
    mk({ es: "Paquete pequeño", en: "Small package", des: "Hasta 20 libras dentro del área, con aviso de entrega.", den: "Up to 20 pounds within the area, with a delivery notice.", kind: "caja", price: jit(r, 1800), dur: 60, attrs: {} }),
    mk({ es: "Paquete grande", en: "Large package", des: "Hasta 60 libras; el precio incluye la entrega en la puerta.", den: "Up to 60 pounds; the price includes door delivery.", kind: "caja", price: jit(r, 3500), dur: 60, attrs: {} }),
    mk({ es: "Entrega urgente", en: "Rush delivery", des: "Salimos en cuanto lo pides y te avisamos al entregar.", den: "We leave as soon as you ask and message you on delivery.", kind: "caja", price: jit(r, 2800), dur: 45, attrs: {}, feat: true }),
    mk({ ...nm(`${cap(S)} · a tu medida`, `${cap(E)} · custom`, "Servicio a tu medida", "Custom service"), des: "Cuéntanos qué enviar y a dónde; te damos el precio por escrito.", den: "Tell us what to send and where; we give you the price in writing.", kind: "cotiza", price: jit(r, 8000, 500), dur: 60, from: true, attrs: {} }),
  ];
  else if (flete) L = [
    mk({ ...nm(`${cap(S)} · servicio local`, `${cap(E)} · local service`, "Servicio local", "Local service"), des: "Dentro de la zona; el precio lo ves por escrito antes de reservar.", den: "Within the area; you see the price in writing before booking.", kind: "cotiza", price: jit(r, 12000, 500), dur: 60, from: true, attrs: { inc: inc(["Mantas y cintas", "Blankets and straps"]) }, feat: true }),
    mk({ es: "Apartamento pequeño", en: "Small apartment", des: "Camión y dos personas; el precio incluye carga y descarga.", den: "Truck and two people; the price includes loading and unloading.", kind: "cotiza", price: jit(r, 45000, 500), dur: 60, from: true, attrs: { inc: inc(["Mantas y cintas", "Blankets and straps"]) } }),
    mk({ es: "Casa de 3 cuartos", en: "3-bedroom house", des: "Camión de 26 pies y tres personas.", den: "26-foot truck and three people.", kind: "cotiza", price: jit(r, 90000, 500), dur: 60, from: true, attrs: { inc: inc(["Mantas y cintas", "Blankets and straps"]) } }),
    mk({ es: "Carga por tarima", en: "Pallet freight", des: "Por tarima, dentro de la región; ves el precio antes de reservar.", den: "Per pallet, within the region; you see the price before booking.", kind: "cotiza", price: jit(r, 15000, 500), dur: 60, from: true, attrs: {} }),
    mk({ es: "Viaje con chofer por el día", en: "Daily trip with driver", des: "Un día completo con chofer y vehículo.", den: "A full day with driver and vehicle.", kind: "cotiza", price: jit(r, 30000, 500), dur: 60, from: true, attrs: {} }),
  ];
  else if (servicio) L = [
    priv("Viaje local", "Local trip", "Dentro de la zona, con recogida en tu puerta.", "Within the area, with pickup at your door.", 2500, { feat: true }),
    priv("Traslado a una cita", "Ride to an appointment", "Ida y vuelta con espera incluida; te ayudamos a subir y bajar.", "Round trip with waiting included; we help you get in and out.", 4500, { feat: true }),
    priv("Ruta semanal", "Weekly route", "Los mismos días y a la misma hora cada semana; el precio es por viaje.", "The same days and time every week; the price is per trip.", 2200),
    mk({ es: "Servicio para grupos", en: "Group service", des: "Para empresas, escuelas o grupos; lo armamos contigo y ves el precio antes de reservar.", den: "For companies, schools or groups; we plan it with you and you see the price before booking.", kind: "cotiza", price: jit(r, 25000, 500), dur: 60, from: true, attrs: {} }),
  ];
  else L = [
    priv("Viaje local", "Local trip", "Dentro de la zona, con recogida en tu puerta.", "Within the area, with pickup at your door.", 2500, { feat: true }),
    priv("Al aeropuerto de Allentown (ABE)", "To Allentown airport (ABE)", "Recogida en tu casa a la hora acordada, con aviso cuando el chofer sale.", "Pickup at your home at the agreed time, with a notice when the driver leaves.", 7500, { feat: true }),
    priv("A Newark (EWR)", "To Newark (EWR)", "Viaje directo con precio fijo por escrito.", "Direct trip with a fixed price in writing.", 18000),
    priv("A Filadelfia (PHL)", "To Philadelphia (PHL)", "Viaje directo con precio fijo por escrito.", "Direct trip with a fixed price in writing.", 16000),
    mk({ es: "Viaje a otra ciudad", en: "Trip to another city", des: "Dinos a dónde y cuándo; te damos el precio por escrito.", den: "Tell us where and when; we give you the price in writing.", kind: "cotiza", price: jit(r, 20000, 500), dur: 60, from: true, attrs: {} }),
  ];
  return L.map((x, i) => ({ ...x, fotos: F(i), sort: i }));
}

export function itemsClases(B, r, fotos) {
  const S = subEs(B), E = subEn(B), F = (i) => [px0(fotos, i, B)];
  const fe = B.cat === "NEG-FE", ninos = B.cat === "NEG-NINOS";
  let L;
  if (fe) {
    const id = B.sub.slice(-2), g = (es, en, des, den, kind, price, attrs = {}, extra = {}) => mk({ es, en, des, den, kind, price, dur: 60, attrs, ...extra });
    if (["30", "31"].includes(id)) L = [
      g("Cita de orientación", "Guidance appointment", "Una conversación sin compromiso para explicarte las opciones y los precios.", "A no-commitment conversation to explain the options and prices.", "clase", 0, { fe: "gratis" }, { feat: true }),
      g(id === "31" ? "Cremación directa" : "Servicio funerario sencillo", id === "31" ? "Direct cremation" : "Simple funeral service", "El precio total por escrito, con lo que incluye y lo que no.", "The total price in writing, with what it includes and what it does not.", "fijo", jit(r, id === "31" ? 120000 : 450000, 5000), { fe: "tot", inc: inc(["Trámites y permisos", "Paperwork and permits"], ["Atención de la familia", "Family support"]) }, { feat: true }),
      g(id === "31" ? "Cremación con velorio" : "Servicio funerario completo", id === "31" ? "Cremation with viewing" : "Full funeral service", "Incluye velorio y traslado; el desglose va por escrito.", "Includes viewing and transport; the breakdown is in writing.", "fijo", jit(r, id === "31" ? 280000 : 780000, 5000), { fe: "tot", inc: inc(["Velorio", "Viewing"], ["Traslado", "Transport"]) }),
      g("Repatriación", "Repatriation", "Trámites con el consulado y traslado; el precio depende del destino y se da por escrito.", "Consulate paperwork and transport; the price depends on the destination and is given in writing.", "fijo", jit(r, 520000, 5000), { fe: "tot", inc: inc(["Trámites del consulado", "Consulate paperwork"]) }),
      g("Plan de previsión", "Pre-planning", "Deja todo organizado con anticipación; hablamos sin apuro.", "Arrange everything in advance; we talk with no rush.", "clase", 0, { fe: "gratis" }),
    ];
    else if (id === "26") L = [
      g("Primera consulta", "First consultation", "Una hora para conocernos y ver cómo podemos acompañarte.", "One hour to get to know each other and see how we can support you.", "clase", 0, { fe: "gratis" }, { feat: true }),
      g("Sesión de consejería", "Counseling session", "Sesión de una hora con cita previa.", "One-hour session by appointment.", "fijo", jit(r, 6000, 500), { fe: "tot" }, { feat: true }),
      g("Taller para parejas", "Couples workshop", "Un taller de varias semanas con otras parejas.", "A multi-week workshop with other couples.", "curso", 0, { fe: "gratis", dur: { es: "6 semanas · los sábados", en: "6 weeks · Saturdays" }, sem: 6 }),
      g("Orientación para la familia", "Family guidance", "Una conversación con alguien del equipo, con cita previa.", "A conversation with someone from the team, by appointment.", "clase", 0, { fe: "gratis" }),
    ];
    else if (id === "35") L = [
      g("Oración por teléfono", "Prayer by phone", "Alguien del equipo te acompaña por teléfono. Sin costo.", "Someone from the team keeps you company by phone. No cost.", "clase", 0, { fe: "gratis" }, { feat: true }),
      g("Visita a tu casa", "Home visit", "Una visita corta de acompañamiento, con cita previa.", "A short supportive visit, by appointment.", "clase", 0, { fe: "gratis" }),
      g("Grupo de oración semanal", "Weekly prayer group", "Nos reunimos cada semana; entra quien quiera.", "We meet every week; everyone is welcome.", "clase", 0, { fe: "gratis" }),
      g("Orientación y acompañamiento", "Guidance and support", "Una conversación con alguien del equipo, con cita previa.", "A conversation with someone from the team, by appointment.", "clase", 0, { fe: "gratis" }),
    ];
    else if (id === "36") L = [
      g("Registro para recibir despensa", "Sign up for the food pantry", "Te registras una vez y te decimos qué día pasar.", "You sign up once and we tell you which day to come.", "clase", 0, { fe: "gratis" }, { feat: true }),
      g("Entrega semanal de despensa", "Weekly pantry pickup", "Una caja de alimentos por hogar; el horario está en la ficha.", "One box of food per household; the schedule is on our page.", "clase", 0, { fe: "gratis" }, { feat: true }),
      g("Voluntariado", "Volunteering", "Apúntate para ayudar a empacar y repartir.", "Sign up to help pack and hand out.", "clase", 0, { fe: "gratis" }),
      g("Donar alimentos", "Donate food", "Dónde y cuándo dejar tu donación.", "Where and when to drop off your donation.", "clase", 0, { fe: "gratis" }),
    ];
    else if (id === "39") L = [
      g("Cita de orientación", "Guidance appointment", "Una conversación para entender tu caso y decirte a dónde acudir. No es asesoría legal.", "A conversation to understand your case and tell you where to go. This is not legal advice.", "clase", 0, { fe: "gratis" }, { feat: true }),
      g("Taller informativo", "Information workshop", "Una charla con información general y recursos de la comunidad.", "A talk with general information and community resources.", "curso", 0, { fe: "gratis", dur: { es: "2 semanas · los jueves", en: "2 weeks · Thursdays" }, sem: 2 }),
      g("Ayuda con papeles y citas", "Help with forms and appointments", "Te ayudamos a organizar tus papeles y a llegar a tus citas.", "We help you organize your papers and get to your appointments.", "clase", 0, { fe: "gratis" }),
      g("Acompañamiento", "Support", "Una persona del equipo te acompaña durante el proceso.", "Someone from the team supports you through the process.", "clase", 0, { fe: "gratis" }),
    ];
    else if (id === "24") L = [
      g("Charla de preparación", "Preparation talk", "Una charla para la familia antes de la fecha.", "A talk for the family before the date.", "clase", 0, { fe: "gratis" }, { feat: true }),
      g("Reservar la misa", "Reserve the Mass", "Apartas la fecha y la hora; te confirmamos por mensaje.", "You reserve the date and time; we confirm by message.", "clase", 0, { fe: "gratis" }, { feat: true }),
      g("Ensayo con el grupo", "Rehearsal with the group", "Un ensayo corto el día anterior.", "A short rehearsal the day before.", "clase", 0, { fe: "gratis" }),
      g("Curso de formación", "Formation course", "Varias semanas de preparación antes de la misa.", "Several weeks of preparation before the Mass.", "curso", 0, { fe: "gratis", dur: { es: "8 semanas · los sábados", en: "8 weeks · Saturdays" }, sem: 8 }),
    ];
    else L = [
      g("Servicio principal de la semana", "Main weekly service", "Abierto a todos. Los horarios están en la ficha.", "Open to everyone. Times are on our page.", "clase", 0, { fe: "gratis" }, { feat: true }),
      g("Clase para adultos", "Adult class", "Un grupo para aprender y conversar. Sin costo.", "A group to learn and talk. No cost.", "clase", 0, { fe: "gratis" }),
      g("Grupo de jóvenes", "Youth group", "Reunión semanal, con acompañamiento del equipo.", "Weekly gathering, supported by our team.", "clase", 0, { fe: "gratis" }),
      g("Curso de formación", "Formation course", "Un curso de varias semanas para quien quiera profundizar.", "A course of several weeks for anyone who wants to go deeper.", "curso", 0, { fe: "gratis", dur: { es: "10 semanas · los miércoles", en: "10 weeks · Wednesdays" }, sem: 10 }),
      g("Orientación y acompañamiento", "Guidance and support", "Una conversación con alguien del equipo, con cita previa.", "A conversation with someone from the team, by appointment.", "clase", 0, { fe: "gratis" }),
      g("Ayuda para quien la necesita", "Help for those in need", "Despensa y orientación según la semana; pregunta en la oficina.", "Pantry and guidance depending on the week; ask at the office.", "clase", 0, { fe: "gratis" }),
    ];
  } else if (ninos) {
    const id = B.sub.slice(-2), cuidado = ["01", "02", "05", "06", "07", "09", "10"].includes(id), deporte = ["16", "17", "19", "20", "21", "22"].includes(id);
    const visita = mk({ es: "Visita al lugar", en: "Visit the center", des: "Conoce el lugar y al equipo antes de decidir. Sin costo.", den: "See the place and meet the team before deciding. No cost.", kind: "clase", price: 0, dur: 60, attrs: {}, feat: true });
    if (cuidado) L = [
      visita,
      mk({ ...nm(`${cap(S)} · programa semanal`, `${cap(E)} · weekly program`, "Programa semanal", "Weekly program"), des: "Cobro por semana. Comidas y actividades según el programa.", den: "Billed weekly. Meals and activities depending on the program.", kind: "semana", price: jit(r, 21000, 500), dur: 60, attrs: { inc: inc(["Comidas", "Meals"], ["Actividades", "Activities"]) }, feat: true }),
      mk({ ...nm(`${cap(S)} · programa mensual`, `${cap(E)} · monthly program`, "Programa mensual", "Monthly program"), des: "Cobro por mes. Horario fijo de lunes a viernes.", den: "Billed monthly. Fixed schedule Monday to Friday.", kind: "mes", price: jit(r, 78000, 500), dur: 60, attrs: { inc: inc(["Comidas", "Meals"]) } }),
      mk({ es: "Medio día", en: "Half day", des: "Mañana o tarde, según el cupo del grupo.", den: "Morning or afternoon, depending on group availability.", kind: "semana", price: jit(r, 13000, 500), dur: 60, attrs: {} }),
    ];
    else if (deporte) L = [
      mk({ es: "Clase de prueba", en: "Trial class", des: "Prueba una clase antes de inscribirte. Sin costo.", den: "Try a class before enrolling. No cost.", kind: "clase", price: 0, dur: 60, attrs: {}, feat: true }),
      mk({ ...nm(`${cap(S)} · clases por mes`, `${cap(E)} · monthly classes`, "Clases por mes", "Monthly classes"), des: "Mensualidad con una o dos clases por semana; cancelas cuando quieras.", den: "Monthly fee with one or two classes a week; cancel any time.", kind: "mes", price: jit(r, 8500, 500), dur: 60, attrs: {}, feat: true }),
      mk({ ...nm(`${cap(S)} · temporada`, `${cap(E)} · season`, "Temporada", "Season"), des: "Una temporada de varias semanas, con matrícula.", den: "A season of several weeks, with enrollment fee.", kind: "curso", price: jit(r, 9500, 500), dur: 60, dep: 3000, attrs: { dep: 3000, sem: 10, horas: 30 } }),
      mk({ es: "Clase individual", en: "Private class", des: "Una hora con el instructor, a la hora que mejor te quede.", den: "One hour with the instructor, at the time that suits you.", kind: "clase", price: jit(r, 4500, 500), dur: 60, attrs: {} }),
    ];
    else L = [
      mk({ ...nm(`${cap(S)} · primera visita`, `${cap(E)} · first visit`, "Primera visita", "First visit"), des: "Una primera visita para conocernos; el precio está en la ficha.", den: "A first visit to get to know each other; the price is on our page.", kind: "clase", price: jit(r, 2500, 500), dur: 60, attrs: {}, feat: true }),
      mk({ ...nm(`${cap(S)} · sesión`, `${cap(E)} · session`, "Sesión", "Session"), des: "Una sesión con cita previa; te confirmamos por mensaje.", den: "One session by appointment; we confirm by message.", kind: "clase", price: jit(r, 5500, 500), dur: 60, attrs: {} }),
      mk({ es: "Paquete de varias sesiones", en: "Multi-session package", des: "Un paquete con precio por sesión más bajo.", den: "A package with a lower price per session.", kind: "mes", price: jit(r, 19000, 500), dur: 60, attrs: {} }),
    ];
  } else {
    L = [
      mk({ es: "Clase de prueba", en: "Trial class", des: "Prueba una clase y conoce al maestro antes de inscribirte.", den: "Try a class and meet the teacher before enrolling.", kind: "clase", price: 0, dur: 60, attrs: {}, feat: true }),
      mk({ ...nm(`${cap(S)} · nivel inicial`, `${cap(E)} · beginner level`, "Curso nivel inicial", "Beginner course"), des: "Un curso de varias semanas en grupo pequeño, con materiales.", den: "A multi-week course in a small group, with materials.", kind: "curso", price: jit(r, 24500, 500), dur: 90, dep: 4000, attrs: { dep: 4000, inc: inc(["Materiales del curso", "Course materials"]), sem: 10, horas: 30, plan_n: 3 }, feat: true }),
      mk({ ...nm(`${cap(S)} · nivel intermedio`, `${cap(E)} · intermediate level`, "Curso nivel intermedio", "Intermediate course"), des: "Para quien ya tiene la base y quiere avanzar.", den: "For those who already have the basics and want to move on.", kind: "curso", price: jit(r, 29500, 500), dur: 90, dep: 4000, attrs: { dep: 4000, sem: 10, horas: 30, plan_n: 3 } }),
      mk({ ...nm(`${cap(S)} · clases por mes`, `${cap(E)} · monthly classes`, "Clases por mes", "Monthly classes"), des: "Mensualidad con clases semanales; cancelas cuando quieras.", den: "Monthly fee with weekly classes; cancel any time.", kind: "mes", price: jit(r, 7000, 500), dur: 60, attrs: { g1: true, inc: inc(["Primera clase gratis", "First class free"]) } }),
      mk({ es: "Clase individual", en: "One-on-one class", des: "Una hora con el maestro, a la hora que mejor te quede.", den: "One hour with the teacher, at the time that suits you.", kind: "hora", price: jit(r, 4500, 500), dur: 60, attrs: {} }),
      mk({ es: "Grupo de conversación", en: "Conversation group", des: "Práctica en grupo de seis, con temas del día a día.", den: "Practice in a group of six, with everyday topics.", kind: "clase", price: jit(r, 1500, 500), dur: 60, attrs: {} }),
    ];
  }
  return L.map((x, i) => ({ ...x, fotos: F(i), sort: i }));
}

/* Secciones para el catálogo según la forma de cobrar */
export function secciones(items, cat) {
  const G = {
    "NEG-HOGAR": [["Visitas y presupuestos", "Visits and estimates", ["visita", "hora"]], ["Trabajos con precio", "Priced jobs", ["fijo", "area"]], ["Presupuestos", "Estimates", ["pres"]], ["Emergencias 24/7", "Emergencies 24/7", ["emer"]], ["Planes", "Plans", ["plan"]]],
    "NEG-AUTO": [["Diagnóstico", "Diagnosis", ["diag"]], ["Mantenimiento", "Maintenance", ["fijo", "goma", "lav", "insp", "grua"]], ["Reparaciones", "Repairs", ["desde", "cotiza"]]],
    "NEG-FIESTA": [["Para empezar", "To start", ["visita", "cotiza"]], ["Paquetes", "Packages", ["pack"]], ["Extras", "Extras", ["hora", "unid", "fijo"]]],
    "NEG-TRANS": [["Viajes", "Trips", ["priv", "asiento"]], ["Envíos y mandados", "Deliveries and errands", ["caja"]], ["A tu medida", "Custom", ["cotiza"]]],
    "NEG-EDU": [["Para empezar", "To start", ["clase"]], ["Cursos", "Courses", ["curso"]], ["Clases y mensualidades", "Classes and monthly plans", ["mes", "hora"]]],
    "NEG-NINOS": [["Visita", "Visit", ["clase"]], ["Programas", "Programs", ["semana", "mes"]], ["Talleres", "Workshops", ["curso"]]],
    "NEG-FE": [["Reuniones y clases", "Gatherings and classes", ["clase"]], ["Cursos", "Courses", ["curso"]]],
  }[cat];
  const out = []; let sort = 0;
  for (const [es, en, ks] of G) { const its = items.filter((x) => ks.includes(x.kind)); if (its.length) out.push({ es, en, sort: 20 + sort++, items: its }); }
  return out;
}
