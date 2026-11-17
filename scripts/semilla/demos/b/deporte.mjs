/* NEG-DEPORTE · 5 subcategorías principales (las 5 primeras del catálogo por `sort`): gimnasio, gimnasio 24 horas, entrenador personal, clases grupales,
   zumba y baile fitness. Lo que vende: membresías, pases de un día, horas con entrenador y retos/cursos de temporada, con sus grupos y cupos.
   Historia: inscripciones (kind enrollment, números I-…) de ~10 años; las membresías vivas siguen activas, las demás terminaron o se dieron de baja. */
import { usd, HOY, diaN, desdeDia, sumaDias, dow, diaPesado, hhmm } from "./comun.mjs";
import { crear, poner, horario, persona, precio, bi, reiniciarIds } from "./negocio.mjs";
import { habituales, resenas, novedades, seguidores, ts } from "./historia.mjs";

const CAT = "NEG-DEPORTE";
const I = (es, en, de, dn, p, d, k, o = {}) => ({ es, en, de, dn, p, d, k, g1: !!o.g1, sem: o.sem ?? null, dep: o.dep ?? 0, inc: o.inc ?? null, core: o.core !== false, slots: o.slots ?? null });

const SUBS = [
  {
    sub: "NEG-DEPORTE-01", tipo: "gimnasio", nombres: ["Gimnasio Power Latino", "Iron Barrio Fitness", "Gimnasio El Campeón", "Fuerza y Vida Gym", "Gimnasio La Cima", "Cuerpo de Acero", "Gimnasio Tres Pesas", "Fit Familiar Gym", "Gimnasio Músculo Boricua", "Gimnasio Energía Total"],
    items: [
      I("Membresía mensual", "Monthly membership", "Acceso a todas las máquinas y pesas libres. Cancelas cuando quieras si no tienes contrato.", "Access to all machines and free weights. Cancel anytime if you have no contract.", 3500, 60, "mes", { g1: true, inc: ["Sin cuota de inscripción | No signup fee", "Casillero gratis | Free locker"] }),
      I("Membresía familiar", "Family membership", "Hasta 4 personas de la misma casa.", "Up to 4 people from the same home.", 7000, 60, "mes", { core: false }),
      I("Pase de un día", "Day pass", "Sin membresía, para probar o si estás de visita.", "No membership, to try it out or if you are visiting.", 1200, 60, "clase"),
      I("Entrenador personal", "Personal trainer", "Sesión de 1 hora, en español.", "1-hour session, in Spanish.", 4500, 60, "hora", { slots: [[[1, 3], 1080], [[6], 540]] }),
    ],
    about: [["Gimnasio de barrio en {c} desde {y}. Pesas libres, máquinas y cardio, con entrenadores que hablan español y te ayudan a empezar. Sin contrato y primera visita gratis.", "Neighborhood gym in {c} since {y}. Free weights, machines and cardio, with Spanish-speaking trainers who help you get started. No contract and a free first visit."],
      ["{n} abrió en {y} en {st}. Un gimnasio donde se entrena en serio y sin pena: música latina, ambiente de familia y precios que puedes pagar.", "{n} opened in {y} on {st}. A gym where you train seriously without shyness: Latin music, a family atmosphere and prices you can afford."],
      ["Más de {a} años entrenando a {c}. Venimos a sudar, a hacer amigos y a cumplir metas.", "Over {a} years training {c}. We come to sweat, make friends and reach goals."]],
    horas: (r) => [[480, 1080], [300, 1320], [300, 1320], [300, 1320], [300, 1320], [300, 1260], [420, 1140]],
    faqs: [["¿Hay contrato? | Is there a contract?", "Tú eliges: mes a mes sin contrato, o contrato de 6 o 12 meses con precio menor. La ficha dice qué tiene cada uno. | Your choice: month to month with no contract, or a 6 or 12-month contract at a lower price. The page shows what each has."], ["¿Puedo probar antes de pagar? | Can I try before paying?", "Sí, tu primera visita es gratis una vez cada 90 días. | Yes, your first visit is free once every 90 days."], ["¿Cuidan a los niños? | Do you watch children?", "En algunos horarios hay cuidado de niños mientras entrenas; se indica en la ficha. | At some hours there is childcare while you train; it is noted on the page."], ["¿Hay entrenador en español? | Is there a Spanish-speaking trainer?", "Sí, todo el equipo habla español. | Yes, the whole team speaks Spanish."]],
  },
  {
    sub: "NEG-DEPORTE-02", tipo: "gimnasio24", nombres: ["Gimnasio 24 Horas Sin Parar", "Fitness Día y Noche", "Anytime Gym del Valle", "Gimnasio Madrugador 24/7", "Gym Nonstop Latino", "Gimnasio Luna y Sol 24 Horas", "Turno Libre Fitness 24", "Gimnasio Siempre Abierto", "Gym 24 Siete", "Gimnasio Doble Turno 24h"],
    items: [
      I("Membresía 24 horas", "24-hour membership", "Entras a cualquier hora con tu llave digital. Cancelas cuando quieras.", "Come in any hour with your digital key. Cancel any time.", 3000, 60, "mes", { g1: true, inc: ["Acceso las 24 horas | 24-hour access", "Cámaras y entrada con llave | Cameras and keyed entry"] }),
      I("Membresía anual", "Annual membership", "Contrato de 12 meses con precio menor.", "12-month contract at a lower price.", 2500, 60, "mes", { core: false }),
      I("Pase de un día", "Day pass", "Sin membresía.", "No membership.", 1000, 60, "clase"),
      I("Entrenador personal", "Personal trainer", "Sesión de 1 hora; elige el horario que te sirva.", "1-hour session; choose the hour that suits you.", 4000, 60, "hora", { slots: [[[2, 4], 1140], [[0], 600]] }),
    ],
    about: [["Gimnasio 24 horas en {c} desde {y}. Entrenas cuando puedas: antes del trabajo, en la noche o en la madrugada, con entrada segura y cámaras. Sin contrato.", "24-hour gym in {c} since {y}. Train whenever you can: before work, at night or in the early morning, with secure entry and cameras. No contract."],
      ["{n}, en {st} desde {y}: abierto todos los días, a toda hora. Máquinas, pesas libres y una zona de estiramiento.", "{n} on {st} since {y}: open every day, around the clock. Machines, free weights and a stretching area."],
      ["Para quienes trabajan en turnos: desde {y}, {c} tiene un gimnasio que no cierra.", "For people who work shifts: since {y}, {c} has a gym that never closes."]],
    horas: () => [[0, 1439], [0, 1439], [0, 1439], [0, 1439], [0, 1439], [0, 1439], [0, 1439]],
    faqs: [["¿Cómo entro de noche? | How do I get in at night?", "Con la llave digital de tu cuenta; cada entrada queda registrada. | With the digital key in your account; every entry is logged."], ["¿Hay alguien presente? | Is anyone on site?", "Hay personal de día y cámaras las 24 horas. | There is staff by day and cameras around the clock."], ["¿Hay contrato? | Is there a contract?", "Mes a mes sin contrato, o anual con precio menor. | Month to month with no contract, or annual at a lower price."]],
  },
  {
    sub: "NEG-DEPORTE-03", tipo: "entrenador", nombres: ["Entrenador Personal Rafael Peña", "Fit con Yari Entrenamiento Personal", "Coach Eduardo Rosario", "Entrenamiento Personal Carlos Vargas", "Cuerpo y Mente con Mayra", "Entrenador Personal Luis Matos", "Coach Daisy Fitness", "Entrenamiento Funcional Don Franklin", "Metas con Coach Samuel", "Entrenador Personal Ángel Soto"],
    items: [
      I("Sesión de prueba", "Trial session", "Una sesión para conocernos y armar tu plan.", "One session to meet and build your plan.", 2000, 45, "clase", { g1: true }),
      I("Sesión personal", "Personal session", "Una hora uno a uno, en español.", "One hour, one on one, in Spanish.", 6000, 60, "hora", { slots: [[[1, 3, 5], 1080], [[2, 4], 450], [[6], 540]] }),
      I("Sesión en pareja", "Partner session", "Una hora para dos personas, con un solo entrenador.", "One hour for two people with one trainer.", 8500, 60, "hora", { core: false, slots: [[[6], 600]] }),
      I("Plan mensual de 8 sesiones", "Monthly plan of 8 sessions", "Ocho sesiones al mes con seguimiento por mensaje.", "Eight sessions a month with follow-up by message.", 22000, 60, "mes", { inc: ["Plan de comidas básico | Basic meal plan", "Seguimiento por mensaje | Follow-up by message"] }),
    ],
    about: [["Entrenamiento personal en {c} desde {y}. {o} arma un plan para ti: bajar de peso, ganar fuerza o moverte sin dolor, con sesiones uno a uno en español.", "Personal training in {c} since {y}. {o} builds a plan for you: lose weight, gain strength or move without pain, with one-on-one sessions in Spanish."],
      ["{n}: entrenamiento con atención total. Desde {y} en {st}, con sesiones en el gimnasio o al aire libre.", "{n}: training with full attention. Since {y} on {st}, with sessions at the gym or outdoors."],
      ["Metas reales, con pasos claros. Más de {a} años ayudando a la gente de {c} a entrenar con constancia.", "Real goals with clear steps. Over {a} years helping {c} people train consistently."]],
    horas: () => [[420, 780], [360, 1200], [360, 1200], [360, 1200], [360, 1200], [360, 1080], [480, 840]],
    faqs: [["¿Cómo empiezo? | How do I start?", "Con una sesión de prueba: hablamos de tus metas y armamos tu plan. | With a trial session: we talk about your goals and build your plan."], ["¿Dónde entrenamos? | Where do we train?", "En el gimnasio donde trabajo o al aire libre; lo eliges al reservar. | At the gym where I work or outdoors; you choose when booking."], ["¿Qué pasa si falto? | What if I miss a session?", "Avisas con un día de anticipación y se reprograma sin costo. | Tell me a day ahead and it is rescheduled at no cost."]],
  },
  {
    sub: "NEG-DEPORTE-04", tipo: "grupales", nombres: ["Clases Grupales Fuerza en Equipo", "Estudio Funcional Latino", "Cardio Barrio Clases", "Boot Camp Hermanos Medina", "Estudio Mueve Tu Cuerpo", "Clases de Cardio y Fuerza Vida Sana", "Circuito Fit Estudio", "Entrena en Comunidad", "Clases Energía y Ritmo", "Estudio Funcional Los Valientes"],
    items: [
      I("Clase suelta", "Drop-in class", "Entras a la clase que quieras, sin membresía.", "Join any class you like, no membership.", 1800, 55, "clase", { slots: [[[1, 3], 1110], [[2, 4], 450], [[6], 570]] }),
      I("Membresía de clases ilimitadas", "Unlimited classes membership", "Todas las clases del horario, todos los días.", "Every class on the schedule, every day.", 7500, 55, "mes", { g1: true, inc: ["Todas las clases | All classes", "Primera clase gratis | First class free"] }),
      I("Reto de 6 semanas", "6-week challenge", "Tres clases por semana con medición de progreso al inicio y al final.", "Three classes a week with progress checks at the start and the end.", 15000, 55, "curso", { sem: 6, dep: 2000, slots: [[[1, 3, 5], 1110]] }),
    ],
    about: [["Clases grupales en {c} desde {y}: cardio, fuerza y funcional para todos los niveles, con coaches que corrigen y animan. Primera clase gratis.", "Group classes in {c} since {y}: cardio, strength and functional training for every level, with coaches who correct and cheer. First class free."],
      ["En {st} desde {y}, {n} es el lugar donde se entrena en equipo. Clases de 55 minutos, en mañana y noche.", "On {st} since {y}, {n} is where people train together. 55-minute classes, morning and evening."],
      ["Entrenar acompañado cambia todo. Desde {y}, la comunidad de {c} viene a movernos juntos.", "Training with company changes everything. Since {y}, the {c} community comes to move together."]],
    horas: () => [[480, 780], [330, 1260], [330, 1260], [330, 1260], [330, 1260], [330, 1140], [480, 840]],
    faqs: [["¿Necesito experiencia? | Do I need experience?", "No. Cada clase tiene versiones para principiantes y avanzados. | No. Every class has beginner and advanced versions."], ["¿Cuántos van a cada clase? | How many people per class?", "Entre 12 y 25 personas; reservas tu lugar en la app. | Between 12 and 25 people; you save your spot in the app."], ["¿Puedo cancelar mi lugar? | Can I cancel my spot?", "Sí, hasta 4 horas antes. | Yes, up to 4 hours before."]],
  },
  {
    sub: "NEG-DEPORTE-05", tipo: "zumba", nombres: ["Zumba con Yari", "Ritmo Latino Baile Fitness", "Zumba Fiesta Total", "Baile Fitness Sabor y Salud", "Mueve el Esqueleto Zumba", "Estudio de Baile Fitness Caribe", "Zumba Mami Fit", "Salsa y Zumba Fit", "Estudio Bachata Fitness", "Zumba y Merengue en Movimiento"],
    items: [
      I("Clase de zumba", "Zumba class", "Una clase de una hora, sin membresía.", "A one-hour class, no membership.", 1200, 60, "clase", { slots: [[[1, 3], 1110], [[2, 4], 1140], [[6], 600]] }),
      I("Mensual: 2 clases por semana", "Monthly: 2 classes a week", "Hasta 8 clases al mes.", "Up to 8 classes a month.", 3500, 60, "mes", { g1: true, inc: ["Primera clase gratis | First class free"] }),
      I("Mensual ilimitado", "Unlimited monthly", "Todas las clases del mes.", "Every class in the month.", 5500, 60, "mes", { core: false }),
      I("Curso de baile fitness de 4 semanas", "4-week dance fitness course", "Aprende los pasos de salsa, bachata y merengue mientras entrenas.", "Learn salsa, bachata and merengue steps while you work out.", 9000, 60, "curso", { sem: 4, dep: 1500, slots: [[[2, 4], 1140]] }),
    ],
    about: [["Zumba y baile fitness en {c} desde {y}. Salsa, merengue, bachata y reguetón para sudar sonriendo. Para todas las edades, sin necesidad de saber bailar.", "Zumba and dance fitness in {c} since {y}. Salsa, merengue, bachata and reggaeton to sweat while smiling. All ages, no dance skills needed."],
      ["{o} da clases en {st} desde {y}: música alta, mucha energía y el mejor ambiente de {c}.", "{o} has taught on {st} since {y}: loud music, lots of energy and the best atmosphere in {c}."],
      ["{n}: el baile que te pone en forma. Primera clase gratis.", "{n}: the dance that gets you in shape. First class free."]],
    horas: () => [[540, 720], [1020, 1260], [1020, 1260], [1020, 1260], [1020, 1260], [1020, 1140], [540, 780]],
    faqs: [["¿Tengo que saber bailar? | Do I need to know how to dance?", "No, los pasos se enseñan en la clase. | No, the steps are taught in class."], ["¿Qué llevo? | What should I bring?", "Ropa cómoda, tenis y agua. | Comfortable clothes, sneakers and water."], ["¿Hay clases para mayores? | Are there classes for older adults?", "Sí, hay una clase suave los sábados por la mañana. | Yes, there is a gentle class on Saturday mornings."]],
  },
];

const BANCO = {
  pos: {
    open: ["Desde que empecé me siento con más energía. | Since I started I feel more energetic.", "{p} me ayudó a arrancar sin pena. | {p} helped me get started without embarrassment.", "El ambiente es de familia y todos te saludan. | The atmosphere is family-like and everyone greets you.", "Llevo años y no pienso cambiarme. | I have been here for years and do not plan to switch.",
      "Un lugar limpio, con buena música y buenos coaches. | A clean place with good music and good coaches.", "Fui a probar y me quedé. | I came to try it and stayed.", "Entrenar aquí me cambió la rutina. | Training here changed my routine."],
    det: ["El equipo está limpio y hay suficiente para todos. | The equipment is clean and there is enough for everyone.", "El horario me sirve antes y después del trabajo. | The hours work before and after work.", "Me explicaron el precio y el contrato antes de firmar. | They explained the price and the contract before I signed.", "Pude cancelar cuando quise, sin vueltas. | I could cancel whenever I wanted, no hassle.",
      "Los entrenadores corrigen con paciencia. | The trainers correct with patience.", "La primera clase fue gratis y no me presionaron. | The first class was free and they did not pressure me.", "Reservé mi lugar en la app en un minuto. | I booked my spot in the app in a minute.", "Hay cuidado de niños y eso me ayuda muchísimo. | There is childcare and that helps me a lot."],
    close: ["Se lo recomiendo a toda mi familia. | I recommend it to my whole family.", "Cinco estrellas. | Five stars.", "Ya llevé a dos amigas. | I already brought two friends.", "Vale cada dólar. | Worth every dollar."],
  },
  mid: {
    open: ["Buen lugar, pero se llena mucho a las 6 PM. | Good place, but it gets crowded at 6 PM.", "El entrenamiento es bueno; el precio me pareció algo alto. | The training is good; the price felt a bit high.", "Me gusta, aunque faltan algunas máquinas en las horas pico. | I like it, though some machines are missing at peak hours."],
    det: ["Con más espacio sería perfecto. | With more room it would be perfect.", "El estacionamiento es difícil. | Parking is difficult."],
    midClose: ["Aun así sigo viniendo. | I still keep coming.", "Espero que amplíen el horario. | I hope they extend the hours."],
  },
  neg: {
    open: ["Tuve problemas para cancelar mi membresía. | I had trouble cancelling my membership.", "Las clases empezaron tarde varias veces. | Classes started late several times.", "El equipo estaba descompuesto cuando fui. | The equipment was broken when I went."],
    det: ["No me explicaron bien el cobro mensual. | They did not explain the monthly charge well.", "Nadie me avisó del cambio de horario. | Nobody told me about the schedule change.", "Esperaba más limpieza en los vestidores. | I expected cleaner locker rooms."],
  },
  rPos: ["Gracias por entrenar con nosotros. ¡Nos vemos en la próxima clase! | Thanks for training with us. See you in the next class!", "Nos alegra tenerte aquí. Gracias por tu reseña. | We are glad to have you here. Thanks for your review.", "Gracias por tus palabras; las compartimos con todo el equipo. | Thank you for your words; we share them with the whole team."],
  rMid: ["Gracias por tu opinión. Estamos revisando las horas pico. | Thanks for your feedback. We are reviewing peak hours."],
  rNeg: ["Lamentamos la experiencia. Escríbenos y lo resolvemos contigo. | We are sorry about the experience. Message us and we will fix it with you.", "Tienes razón; ya cambiamos cómo avisamos los cambios de horario. | You are right; we changed how we announce schedule changes.", "Gracias por avisarnos. Revisamos el equipo y los vestidores esta semana. | Thank you for telling us. We checked the equipment and locker rooms this week."],
  answers: (est, r) => ({ totalOk: est >= 3 ? 1 : 0, horarioOk: est >= 3 ? 1 : 0, trato: est >= 4 ? 1 : est === 3 ? 0 : -1, salirOk: est >= 3 ? 1 : 0, entrenan: est >= 4 ? 1 : est === 3 ? 0 : -1, limpioEq: est >= 3 ? 1 : 0 }),
  facts: (o) => ({ dia: o.dia, tot: o.tot ?? 0, certDado: false }),
};
const NOV = [
  { kind: "novedad", t: "Inscríbete desde la app | Sign up from the app", b: "Elige tu membresía o tu clase y reserva tu lugar en un minuto. | Choose your membership or class and save your spot in a minute." },
  { kind: "novedad", t: "Primera clase gratis | First class free", b: "Ven a probar sin compromiso. Una vez cada 90 días. | Come try with no commitment. Once every 90 days." },
  { kind: "aviso", t: "Cambio de horario por feriado | Holiday schedule change", b: "Abrimos con horario reducido el día feriado. | We open on reduced hours on the holiday.", day: "Feriado", hrs: "early", hrsT: "8 AM – 2 PM" },
  { kind: "oferta", t: "Membresía con descuento este mes | Membership discount this month", b: "Para los que se inscriban esta semana. | For those who sign up this week.", off: 0.85, it: (b) => b.items.find((x) => x.kind === "mes")?.sort ?? 0 },
  { kind: "novedad", t: "Nuevas máquinas y pesas | New machines and weights", b: "Ampliamos la zona de pesas libres para que no esperes. | We expanded the free weights area so you do not wait." },
  { kind: "hoy", t: "Quedan lugares en la clase de hoy | Spots left in today's class", b: "Reserva en la app antes de que se llene. | Book in the app before it fills." },
  { kind: "encuesta", t: "¿Qué clase quieres que agreguemos? | Which class should we add?", b: "", poll: ["Más temprano | Earlier", "En la noche | In the evening", "Fin de semana | Weekend"] },
  { kind: "novedad", t: "Cuidado de niños mientras entrenas | Childcare while you train", b: "En horarios seleccionados. Pregunta en el mostrador. | At selected hours. Ask at the front desk." },
  { kind: "novedad", t: "Cumplimos años en {c} | Our anniversary in {c}", b: "Gracias a quienes entrenan con nosotros desde {y}. | Thank you to those who have trained with us since {y}." },
  { kind: "aviso", t: "Mantenimiento de equipos | Equipment maintenance", b: "Un día de ajustes; las clases siguen. | One day of adjustments; classes continue.", day: "Un día", hrs: "early", hrsT: "Clases normales" },
];

const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], DIAS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hora12 = (m, es) => { const h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12; return `${h12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${ap}`; };
const etiqueta = (dows, min) => ({ es: `${dows.length === 1 ? DIAS_ES[dows[0]] : dows.slice(0, -1).map((d) => DIAS_ES[d]).join(", ") + " y " + DIAS_ES[dows[dows.length - 1]]} · ${hora12(min)}`, en: `${dows.map((d) => DIAS_EN[d]).join(", ")} · ${hora12(min)}` });

export function construir(si, k, ord) {
  const cfg = SUBS[si], nombre = cfg.nombres[k];
  const b = crear({ cat: CAT, sub: cfg.sub, si, k, ord, nombre, mujer: cfg.tipo === "zumba" ? true : undefined });
  const r = b.r;
  b.factor = 0.85 + r() * 0.35;
  const anos = 2026 - b.founded;
  b.langs = ["es", "en"]; if (r.chance(0.4)) b.langs = ["es"];
  b.subs = [cfg.sub, ...(cfg.tipo === "gimnasio24" ? ["NEG-DEPORTE-01"] : cfg.tipo === "grupales" ? ["NEG-DEPORTE-05", "NEG-DEPORTE-13"].filter(() => r.chance(0.3)) : cfg.tipo === "zumba" ? ["NEG-DEPORTE-04"].filter(() => r.chance(0.6)) : cfg.tipo === "entrenador" ? ["NEG-DEPORTE-01"].filter(() => r.chance(0.3)) : ["NEG-DEPORTE-03"].filter(() => r.chance(0.4)))];
  const aboutT = r.pick(cfg.about), f = (t) => t.replace(/\{o\}/g, b.owner.fn).replace(/\{st\}/g, b.calle).replace(/\{y\}/g, b.founded).replace(/\{c\}/g, b.cityNombre).replace(/\{n\}/g, nombre).replace(/\{a\}/g, anos);
  b.about = { es: f(aboutT[0]), en: f(aboutT[1]) };
  poner(b, CAT, cfg.sub, 6);
  b.mods = ["svc", "staff", "nov"];
  horario(b, cfg.horas(r));
  // equipo: entrenadores
  b.members = [];
  const evitar = [b.owner.fn], nM = cfg.tipo === "entrenador" ? 1 : r.int(2, 4);
  b.members.push({ kind: "owner", name: `${b.owner.fn} ${b.owner.ln}`, role: bi(cfg.tipo === "zumba" ? "Instructora · dueña | Instructor · owner" : cfg.tipo === "entrenador" ? "Entrenador personal | Personal trainer" : "Entrenador · dueño | Trainer · owner"), langs: b.langs, since: b.founded, auto: false, resp: 30, dep: 0, spec: [], bio: bi(`Entrena a la comunidad desde ${b.founded}. | Has trained the community since ${b.founded}.`) });
  for (let j = 1; j < nM; j++) { const p = persona(r, cfg.tipo === "zumba" ? true : r.chance(0.45), evitar); evitar.push(p.fn); b.members.push({ kind: "staff", name: p.nombre, role: bi(cfg.tipo === "zumba" ? "Instructora | Instructor" : "Entrenador | Trainer"), langs: ["es", "en"], since: r.int(b.founded, 2024), auto: false, resp: 30, dep: 0, spec: [], bio: bi(`Certificado, con ${r.int(3, 15)} años de experiencia. | Certified, with ${r.int(3, 15)} years of experience.`) }); }
  b.members.forEach((m) => { m.takes = false; });
  // servicios
  const elegidos = cfg.items.filter((x) => x.core || r.chance(0.5));
  b.secs = [bi(cfg.tipo === "entrenador" ? "Entrenamiento | Training" : "Membresías y clases | Memberships and classes")];
  b.items = elegidos.map((x, i) => {
    const attrs = { ...(x.g1 ? { g1: true } : {}), ...(x.inc ? { inc: x.inc.map(bi) } : {}), ...(x.sem ? { sem: x.sem } : {}), ...(x.dep ? { dep: precio(b, x.dep) } : {}) };
    const price = precio(b, x.p), dep = x.dep ? Math.min(Math.round(precio(b, x.dep) / 100) * 100, price - 100) : 0;
    return { sort: i, sec: 0, name: bi(`${x.es} | ${x.en}`), descr: bi(`${x.de} | ${x.dn}`), price, dur: x.d, buf: 0, kind: x.k, attrs: x.dep ? { ...attrs, dep } : attrs, dep, photos: r.chance(0.7) ? [b.photos[(i + 1) % b.photos.length]] : [], who: [], cfg: x };
  });
  // herramienta
  const mes = b.items.find((x) => x.kind === "mes");
  const contrato = cfg.tipo === "entrenador" ? 0 : r.weighted([[0, 6], [6, 2], [12, 2]]);
  b.insc = { esp: b.langs.includes("es"), contrato, salir: contrato ? [0, 5000, 10000, 15000][r.int(0, 3)] : 0, insc: contrato ? [0, 1000, 2500][r.int(0, 2)] : 0, guard: (cfg.tipo === "gimnasio" || cfg.tipo === "gimnasio24") && r.chance(0.5), reply: 24 };
  // grupos
  b.groups = [];
  const hoyDia = HOY, dowHoy = dow(HOY);
  const lunes = sumaDias(HOY, ((1 - dowHoy + 7) % 7) || 7);
  b.items.forEach((x) => {
    if (x.kind === "mes") { b.groups.push({ item: x.sort, label: bi("Empieza hoy | Start today"), starts: hoyDia, ends: null, dows: [], min: null, dur: null, seats: r.int(10, 30), outside: r.int(0, 6), booked: 0, status: "open" }, { item: x.sort, label: bi("Empieza el lunes | Start Monday"), starts: lunes, ends: null, dows: [1], min: null, dur: null, seats: r.int(8, 20), outside: 0, booked: 0, status: "open" }); }
    if ((x.kind === "hora" || x.kind === "clase") && x.cfg.slots) for (const [ds, min] of x.cfg.slots) b.groups.push({ item: x.sort, label: bi(`${etiqueta(ds, min).es} | ${etiqueta(ds, min).en}`), starts: sumaDias(HOY, -r.int(30, 900)), ends: null, dows: ds, min, dur: x.dur, seats: x.kind === "hora" ? r.int(1, 3) : r.int(12, 30), outside: 0, booked: 0, status: "started" });
  });
  // temporadas (cursos): una terminada por trimestre desde que existe el negocio + la próxima abierta
  const curso = b.items.find((x) => x.kind === "curso");
  const temporadas = [];
  if (curso) {
    const [ds, min] = curso.cfg.slots[0], semanas = curso.cfg.sem;
    let ini = sumaDias(`${Math.max(b.founded + 1, 2017)}-01-0${r.int(5, 9)}`, 0);
    while (diaN(ini) + semanas * 7 < diaN(HOY) - 14) {
      const fin = sumaDias(ini, semanas * 7);
      temporadas.push({ ini, fin });
      ini = sumaDias(ini, r.pick([112, 126, 140, 154]));
    }
    for (const t of temporadas) { t.g = { label: `Temporada ${t.ini.slice(0, 7)}`, starts: t.ini }; }
    const proxIni = sumaDias(HOY, r.int(9, 24));
    b.groups.push({ item: curso.sort, label: bi(`Empieza el ${proxIni.slice(8)}/${proxIni.slice(5, 7)} · ${hora12(min)} | Starts ${proxIni.slice(5, 7)}/${proxIni.slice(8)} · ${hora12(min)}`), starts: proxIni, ends: sumaDias(proxIni, semanas * 7), dows: ds, min, dur: curso.dur, seats: 0, outside: 0, booked: 0, status: "open", abierta: true });
  }
  // filtros y atributos
  const fv = ["esp"]; if (b.insc.contrato === 0 && mes) fv.push("sincontrato"); if (b.insc.guard) fv.push("guarderia"); if (b.items.some((x) => x.attrs.g1)) fv.push("gratis1");
  if (mes) fv.push("membresia"); if (b.items.some((x) => x.kind === "clase")) fv.push("visita"); if (curso) fv.push("ligas");
  fv.push("techado"); if (cfg.tipo === "gimnasio24") fv.push("24h"); if (b.founded <= 2016) fv.push("y10");
  b.fv = [...new Set(fv.filter((x) => x !== "ligas"))];
  b.pay = ["local"];
  b.amenities = r.shuffle(["wifi", "estacionamiento", "vestidores", "regaderas", "casilleros", "aire-acondicionado"]).slice(0, 4).concat(cfg.tipo === "gimnasio24" ? ["24h"] : []);
  b.attrs = { m: "shop", tarjeta: { eta: bi(contrato ? `Contrato de ${contrato} meses · cancelar antes ${b.insc.salir ? `cuesta ${usd(b.insc.salir)}` : "no cuesta"} | ${contrato}-month contract · early cancellation ${b.insc.salir ? `costs ${usd(b.insc.salir, false)}` : "is free"}` : "Sin contrato · cancela cuando quieras | No contract · cancel any time"),
    fee: mes ? bi(`${usd(mes.price)} al mes · ${b.insc.insc ? `inscripción ${usd(b.insc.insc)}` : "sin cuota de inscripción"} | ${usd(mes.price, false)} a month · ${b.insc.insc ? `signup ${usd(b.insc.insc, false)}` : "no signup fee"}`) : bi(`Desde ${usd(Math.min(...b.items.map((x) => x.price)))} | From ${usd(Math.min(...b.items.map((x) => x.price)), false)}`) } };
  b.faqs = cfg.faqs.map(([q, a]) => ({ q: bi(q), a: bi(a) }));

  // historia: inscripciones
  const tam = r.weighted([[1, 3], [2, 4], [3, 3]]);
  const N = { 1: r.int(55, 95), 2: r.int(110, 170), 3: r.int(180, 250) }[tam];
  const quien = habituales(b, r, 110);
  const ini0 = b.proSince > "2016-11-20" ? b.proSince : "2016-11-20", ayer = sumaDias(HOY, -1);
  const ops = [], hechas = [];
  const pesoK = { mes: 4, clase: 3, hora: cfg.tipo === "entrenador" ? 6 : 2, curso: 1.2 };
  let i = 0;
  const base = (x, o) => ({ rubro: "dep", k: x.kind, svc: x.name, group: null, starts_on: null, ends_on: null, start_min: null, dows: [], for: "yo", guardian_ok: false, level: null, team_name: null, price_cents: 0, mat_cents: x.kind === "curso" ? x.dep : 0, mat_app: 0, plan_n: 0, cert: null, cert_by: null, oficial: false, no: null, contract_m: x.kind === "mes" ? b.insc.contrato : 0, cancel_fee_cents: x.kind === "mes" ? b.insc.salir : 0, g1: false, sms: true, neutro: false, cuidado: false, ...o });
  const escala = (dia, p) => Math.max(500, Math.round((p * (0.72 + 0.28 * Math.min(1, (diaN(dia) - diaN("2016-11-01")) / 3650))) / 100) * 100); // los precios de antes eran menores
  const cursoOps = new Map();
  for (let n = 0; n < N + 6; n++) {
    const fut = n >= N;
    const x = r.weighted(b.items.map((z) => [z, pesoK[z.kind] ?? 1]));
    const u = quien();
    const dia = fut ? sumaDias(HOY, r.int(1, 12)) : diaPesado(r, ini0, ayer, 2.0);
    const min = x.kind === "mes" ? 480 : (b.groups.find((g) => g.item === x.sort && g.min != null)?.min ?? r.pick([420, 480, 1080, 1110, 1140]));
    const o = { i, kind: "enrollment", u, m: null, it: x.sort, pax: 1, buf: 0, sub: 0, tot: 0, dep: 0, pay: "none" };
    const price = escala(dia, x.price);
    o.sub = price; o.tot = price; o.pay = price > 0 ? "local" : "none";
    const lead = r.int(60, 60 * 24 * 12), resp = r.int(5, 600);
    const base0 = diaN(dia) - Math.ceil(lead / 1440);
    const sent = desdeDia(Math.max(base0, diaN(ini0) - 1));
    o.sent = ts(sent, r.int(480, 1200)); o.ans = ts(sent, Math.min(1439, 480 + resp));
    if (x.kind === "curso" && temporadas.length && !fut) {
      const t = r.pick(temporadas);
      const d0 = t.ini, idx = temporadas.indexOf(t);
      o.loc = ts(d0, x.cfg.slots[0][1]); o.det = base(x, { group: bi(`Temporada ${d0.slice(0, 7)} | Season ${d0.slice(0, 7)}`), starts_on: d0, ends_on: t.fin, start_min: x.cfg.slots[0][1], dows: x.cfg.slots[0][0], price_cents: price, mat_app: x.dep });
      o.g = { label: `Temporada ${d0.slice(0, 7)}`, starts: d0 };
      o.sent = ts(sumaDias(d0, -r.int(3, 20)), 700); o.ans = ts(sumaDias(d0, -r.int(1, 2)), 900);
      if (sumaDias(d0, -3) < ini0) { continue; }
      cursoOps.set(`${d0}`, (cursoOps.get(`${d0}`) ?? 0) + 1);
      if (x.dep) { o.dep = escala(dia, x.dep); o.pay = "app"; o.ps = "captured"; o.det.mat_app = o.dep; o.det.mat_cents = o.dep; }
      const cx = r.chance(0.07);
      if (cx) { o.st = "cancelled"; o.cb = "user"; o.cr = "baja"; o.canc = ts(sumaDias(d0, -r.int(1, 2)), 1000); o.dep = 0; o.pay = "local"; delete o.ps; cursoOps.set(`${d0}`, cursoOps.get(`${d0}`) - 1); }
      else { o.st = "done"; o.sd = "done"; o.done = ts(t.fin, 1200); hechas.push({ i, u, dia: t.fin, min: 1200, persona: b.members[0].name.split(" ")[0], svcTxt: x.name, rec: [x.sort], tot: o.dep }); }
    } else if (x.kind === "curso") { n--; continue; }
    else if (x.kind === "mes") {
      const meses = r.weighted([[1, 20], [2, 14], [3, 14], [6, 18], [12, 18], [24, 10], [36, 6]]);
      const fin = sumaDias(dia, Math.round(meses * 30.4));
      const g1 = x.attrs.g1 && r.chance(0.3);
      o.det = base(x, { starts_on: dia, price_cents: price, g1: !!g1 });
      o.loc = ts(dia, 480);
      if (fut) { o.det.starts_on = dia; delete o.loc; o.rel = diaN(dia) - diaN(HOY); o.tm = "08:00"; o.st = "confirmed"; o.sd = null; o.sago = r.int(60, 3000); o.ansm = r.int(10, 400); delete o.sent; delete o.ans; }
      else if (diaN(fin) >= diaN(HOY)) { o.st = "confirmed"; o.sd = "started"; }
      else if (r.chance(0.18)) { o.st = "cancelled"; o.cb = "user"; o.cr = "baja"; o.canc = ts(sumaDias(dia, Math.round(meses * 30.4 * 0.6) + 1), 1000); }
      else { o.st = "done"; o.sd = "done"; o.done = ts(fin, 1100); hechas.push({ i, u, dia: fin, min: 1100, persona: b.members[0].name.split(" ")[0], svcTxt: x.name, rec: [x.sort], tot: 0 }); }
    } else {
      // pase de un día o hora con entrenador
      o.det = base(x, { starts_on: dia, start_min: min, price_cents: price });
      if (fut) { o.rel = diaN(dia) - diaN(HOY); o.tm = hhmm(min); o.st = "confirmed"; o.sd = null; o.sago = r.int(60, 3000); o.ansm = r.int(10, 400); delete o.sent; delete o.ans; }
      else { o.loc = ts(dia, min); const q = r.chance(0.05); if (q) { o.st = "cancelled"; o.cb = "user"; o.cr = "baja"; o.canc = ts(sumaDias(dia, -1), 1000); } else { o.st = "done"; o.sd = "done"; o.done = ts(dia, Math.min(1439, min + x.dur)); hechas.push({ i, u, dia, min, persona: b.members[r.int(0, b.members.length - 1)].name.split(" ")[0], svcTxt: x.name, rec: [x.sort], tot: 0 }); } }
    }
    if (o.dep) o.det.mat_app = o.dep;
    ops.push(o); i++;
  }
  // los cupos de las temporadas: terminadas llenas; la abierta con lugares libres
  if (curso) {
    for (const t of temporadas) { const n = cursoOps.get(t.ini) ?? 0; if (!n) continue; b.groups.push({ item: curso.sort, label: bi(`Temporada ${t.ini.slice(0, 7)} | Season ${t.ini.slice(0, 7)}`), starts: t.ini, ends: t.fin, dows: curso.cfg.slots[0][0], min: curso.cfg.slots[0][1], dur: curso.dur, seats: Math.max(n, 10), outside: Math.max(0, Math.max(n, 10) - n), booked: n, status: "finished" }); }
    const ab = b.groups.find((g) => g.abierta); if (ab) { ab.seats = r.int(14, 28); ab.outside = r.int(4, 9); ab.booked = 0; delete ab.abierta; }
  }
  b.ops = ops;
  const rv = resenas(b, hechas, BANCO, r, { min: 20, max: 60 });
  b.reviews = rv.reseñas; b.helpful = rv.util;
  b.posts = novedades(b, NOV, r, { n: r.int(6, 9) });
  b.follows = seguidores(b, r);
  b.lic = [];
  return b;
}

export function todos(inicio = 150) {
  reiniciarIds();
  const L = [];
  for (let si = 0; si < SUBS.length; si++) for (let k = 0; k < 10; k++) L.push(construir(si, k, inicio + si * 10 + k));
  return L;
}
