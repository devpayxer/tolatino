/* NEG-PRO · ronda 2: textos que se comparten entre las 55 subcategorías (reseñas, novedades, preguntas, «acerca de», extras de un total por escrito).
   Todo «es | en»; sin emoji; sin números de caso. */

/* ── Reseñas ── */
const POS_LEGAL = {
  open: ["Me explicaron mi caso con calma y en español. | They explained my case calmly and in Spanish.", "{p} fue claro desde la primera consulta. | {p} was clear from the first consultation.", "Me dieron el total por escrito antes de empezar. | They gave me the total in writing before we began.",
    "Sentí que me trataban con respeto. | I felt treated with respect.", "Me dijeron con honestidad lo que podían y no podían hacer. | They told me honestly what they could and could not do.", "Todo el trámite fue ordenado y sin sorpresas. | The whole process was orderly and without surprises.",
    "Respondieron cada pregunta que tenía. | They answered every question I had.", "Por fin encontré una oficina de confianza en {c}. | I finally found a trustworthy office in {c}."],
  det: ["El precio fue el mismo que me dieron por escrito. | The price was the same as the one they gave me in writing.", "Me avisaron de cada paso por mensaje. | They told me each step by message.", "Cumplieron la fecha que me prometieron. | They met the date they promised.",
    "Me explicaron lo que paga el gobierno y lo que paga la oficina. | They explained what the government charges and what the office charges.", "Reservé por la app y la cita empezó a tiempo. | I booked in the app and the appointment started on time.",
    "Me dijeron cuándo necesitaba ayuda profesional y cuándo no. | They told me when I needed professional help and when I did not."],
  close: ["Se lo recomiendo a mi familia. | I recommend them to my family.", "Volvería sin dudarlo. | I would go back without hesitation.", "Gracias a todo el equipo. | Thanks to the whole team.", "Cinco estrellas. | Five stars."],
};
const POS_NO = {
  open: ["Me dieron el precio antes de empezar y no cambió. | They gave me the price before starting and it did not change.", "{p} me explicó las opciones sin presionarme. | {p} explained the options without pressuring me.", "Quedó listo cuando prometieron. | It was ready when they promised.",
    "Me trataron con respeto y en español. | They treated me with respect and in Spanish.", "Fueron honestos con lo que hacía falta y lo que no. | They were honest about what was needed and what was not.", "Por fin un lugar de confianza en {c}. | Finally a trustworthy place in {c}.",
    "Respondieron todas mis preguntas. | They answered all my questions.", "Todo fue rápido y sin sorpresas. | Everything was quick and without surprises."],
  det: ["Reservé por la app y me atendieron a la hora. | I booked in the app and was seen on time.", "Me avisaron por mensaje cuando estuvo listo. | They messaged me when it was ready.", "No me cobraron nada que no hubiera aceptado. | They charged nothing I had not agreed to.",
    "El precio final fue el del presupuesto. | The final price matched the estimate.", "Me explicaron cada paso. | They explained each step."],
  close: ["Lo recomiendo. | I recommend it.", "Volveré. | I will be back.", "Gracias a todo el equipo. | Thanks to the whole team.", "Cinco estrellas. | Five stars."],
};
const MID_LEGAL = {
  open: ["La consulta fue útil, aunque esperé en la sala más de lo que decía la cita. | The consultation was useful, though I waited longer than the booking said.", "Buen trabajo, pero me hubiera gustado más aviso de cada paso. | Good work, but I would have liked more updates on each step.", "Me explicaron bien; el precio total me pareció alto. | They explained well; the total price felt high."],
  det: ["Tardaron en responder un mensaje. | They took a while to answer a message.", "El trámite fue bien, con un par de retrasos. | The process went fine, with a couple of delays."],
  midClose: ["Espero que mejoren la comunicación. | I hope communication improves.", "Aun así, el servicio cumplió. | Even so, the service delivered."],
};
const MID_NO = {
  open: ["El trabajo quedó bien, aunque tardó un poco más de lo prometido. | The work came out fine, though it took a bit longer than promised.", "Buen servicio, pero el precio me pareció algo alto. | Good service, but the price felt a little high.", "Me atendieron bien; la espera fue más larga de lo que decía mi cita. | They treated me well; the wait was longer than my booking said."],
  det: ["Tuve que preguntar cómo iba. | I had to ask how it was going.", "Hubo un pequeño retraso, pero avisaron. | There was a small delay, but they let me know."],
  midClose: ["Espero que mejoren los tiempos. | I hope timing improves.", "Aun así, cumplieron. | Even so, they delivered."],
};
const NEG = {
  open: ["Esperaba más comunicación durante el trámite. | I expected more communication during the process.", "Esperé más de lo que decía mi cita. | I waited more than my booking said.", "El total final no coincidió con lo que entendí. | The final total did not match what I understood."],
  det: ["Tuve que llamar varias veces para saber cómo iba todo. | I had to call several times to find out how things were going.", "Nadie me avisó del retraso. | Nobody told me about the delay.", "Me costó entender lo que cubría el precio. | It was hard to understand what the price covered."],
};
const R_POS = ["Gracias por su confianza. Aquí estamos para lo que necesite. | Thank you for your trust. We are here for whatever you need.", "Nos alegra haber ayudado. Gracias por contarlo. | We are glad we could help. Thank you for sharing.", "Gracias por sus palabras; las compartimos con el equipo. | Thank you for your words; we share them with the team."];
const R_MID = ["Gracias por su opinión. Ahora avisamos cada paso por mensaje. | Thank you for your feedback. We now send an update at every step.", "Gracias por decirlo. Estamos ajustando los tiempos para cumplir mejor. | Thank you for saying so. We are adjusting our timing to do better."];
const R_NEG = ["Lamentamos que no haya sido la experiencia que esperaba. Llámenos y lo aclaramos con el precio por escrito en la mano. | We are sorry it was not the experience you expected. Call us and we will go over it with the written price in hand.", "Tiene razón en lo de la espera. Cambiamos cómo damos las horas. | You are right about the wait. We changed how we give times."];

/* Una línea más por tipo de profesional (se suma a las «det» de las reseñas buenas). */
const DET_TIPO = {
  fam: ["Me trataron con delicadeza en un momento difícil. | They treated me with care at a difficult time."], penal: ["Me explicaron qué podía pasar sin prometerme nada. | They explained what could happen without promising anything."],
  injury: ["Nunca me cobraron por adelantado. | They never charged me up front."], law: ["Me explicaron el contrato cláusula por cláusula. | They explained the contract clause by clause."],
  doc: ["Me dijeron qué documentos llevar y no tuve que volver. | They told me which documents to bring and I did not have to return."], tax: ["Me explicaron cada línea de mi declaración. | They explained every line of my return."],
  fin: ["No me presionaron a firmar nada. | They did not pressure me to sign anything."], seg: ["Compararon varias compañías y me mostraron la diferencia. | They compared several carriers and showed me the difference."],
  repair: ["Me enseñaron la pieza dañada y la que pusieron. | They showed me the damaged part and the one they installed."], print: ["Me mandaron la prueba antes de imprimir. | They sent me a proof before printing."],
  money: ["La tasa y el total estaban claros antes de pagar. | The rate and total were clear before I paid."], biz: ["Salí con un plan claro de los siguientes pasos. | I left with a clear plan for the next steps."],
  digital: ["Me entregaron los archivos y las claves de todo. | They handed over all the files and logins."], build: ["Los planos se aprobaron a la primera. | The drawings were approved the first time."],
  svc: ["Muy puntuales y profesionales. | Very punctual and professional."], ofic: ["La ceremonia fue exactamente como la habíamos imaginado. | The ceremony was exactly as we had imagined it."],
};
export function banco(legal, tipo) {
  const P = legal ? POS_LEGAL : POS_NO, M = legal ? MID_LEGAL : MID_NO;
  return {
    pos: { ...P, det: [...P.det, ...(DET_TIPO[tipo] ?? [])] }, mid: M, neg: NEG, rPos: R_POS, rMid: R_MID, rNeg: R_NEG,
    answers: (est, r) => ({ lengua: r.weighted([["es", 78], ["int", 14], ["no", est <= 2 ? 20 : 3]]), explico: est >= 4 ? 1 : est === 3 ? 0 : -1, cobro: est >= 3 ? 1 : 0, trato: est >= 4 ? 1 : est === 3 ? 0 : -1, ...(legal ? { ley: est >= 3 ? 1 : 0 } : {}), fecha: est >= 4 ? "a" : est === 3 ? "b" : "c" }),
    facts: (o) => (o.total ? { tot: o.total, hired: o.hired } : { hired: !!o.hired }),
  };
}

/* ── Novedades ── */
export const NOV_LEGAL = [
  { kind: "novedad", t: "Ya reservas tu consulta en la app | You can now book your consultation in the app", b: "Elige el servicio, el profesional y la hora. El total te lo damos por escrito. | Choose the service, the professional and the time. We give you the total in writing." },
  { kind: "novedad", t: "Consultas por video | Video consultations", b: "Si no puedes venir, te atendemos por video o teléfono. | If you cannot come in, we see you by video or phone." },
  { kind: "aviso", t: "Horario especial en feriados | Holiday hours", b: "Cerramos el día feriado. Las citas se reprograman desde la app. | Closed on the holiday. Appointments can be rescheduled in the app.", day: "Feriado", hrs: "closed", hrsT: "" },
  { kind: "novedad", t: "Nuevo profesional en el equipo | A new professional joins the team", b: "Ya puedes reservar con él o ella desde nuestra página. | You can book with them from our page now." },
  { kind: "hoy", t: "Hay citas disponibles hoy | Appointments open today", b: "Reserva en la app o llámanos. | Book in the app or call us." },
  { kind: "encuesta", t: "¿Qué horario te sirve más? | Which hours work best for you?", b: "", poll: ["Más temprano | Earlier", "Más tarde | Later", "Sábados | Saturdays"] },
  { kind: "novedad", t: "Charla gratis para la comunidad | Free community talk", b: "Una charla de preguntas y respuestas, en español, en nuestra oficina. | A Q&A session in Spanish at our office." },
  { kind: "novedad", t: "Cumplimos años en {c} | Our anniversary in {c}", b: "Gracias a las familias que confían en nosotros desde {y}. | Thank you to the families who have trusted us since {y}." },
  { kind: "aviso", t: "Cambios de precio del gobierno | Government fee changes", b: "Revisa la ficha: actualizamos lo que cobra el gobierno en cada trámite. | Check the page: we updated what the government charges for each procedure.", day: "Vigente", hrs: "early", hrsT: "" },
];
export const NOV_NO = [
  { kind: "novedad", t: "Ya reservas tu cita en la app | You can now book in the app", b: "Elige el servicio, el profesional y la hora. Te confirmamos por mensaje. | Choose the service, the professional and the time. We confirm by message." },
  { kind: "novedad", t: "Presupuesto antes de empezar | Estimate before we start", b: "Te decimos el precio por escrito y no se cobra nada sin tu OK. | We give you the price in writing and nothing is charged without your OK." },
  { kind: "aviso", t: "Horario especial en feriados | Holiday hours", b: "Cerramos el día feriado. Las citas se reprograman desde la app. | Closed on the holiday. Appointments can be rescheduled in the app.", day: "Feriado", hrs: "closed", hrsT: "" },
  { kind: "novedad", t: "Nuevo integrante en el equipo | A new member joins the team", b: "Ya puedes reservar con él o ella desde nuestra página. | You can book with them from our page now." },
  { kind: "hoy", t: "Hay citas disponibles hoy | Appointments open today", b: "Reserva en la app o llámanos. | Book in the app or call us." },
  { kind: "encuesta", t: "¿Qué horario te sirve más? | Which hours work best for you?", b: "", poll: ["Más temprano | Earlier", "Más tarde | Later", "Sábados | Saturdays"] },
  { kind: "novedad", t: "Cumplimos años en {c} | Our anniversary in {c}", b: "Gracias a los vecinos que confían en nosotros desde {y}. | Thank you to the neighbors who have trusted us since {y}." },
  { kind: "novedad", t: "Atendemos en español e inglés | We serve in Spanish and English", b: "Pregunta lo que necesites; te respondemos en tu idioma. | Ask what you need; we answer in your language." },
];

/* ── Preguntas frecuentes ── */
const bi2 = (q, a) => ({ q, a });
export function faqs(legal, tipo, cant) {
  const cantEs = cant ? cant.split(" | ") : null;
  if (legal) return [
    bi2("¿Cuánto me van a cobrar en total? | What will the total be?", "Después de la consulta te mandamos el total por escrito: honorario, lo que cobra el gobierno y los extras que quieras. Tú decides si lo aceptas. | After the consultation we send you the total in writing: fee, what the government charges and any extras you want. You decide whether to accept."),
    bi2("¿Qué hace y qué no hace esta oficina? | What does this office do and not do?", `${cantEs ? cantEs[0] : "No garantiza resultados"}. Las licencias del equipo, si las hay, están verificadas en la ficha. | ${cantEs ? cantEs[1] ?? cantEs[0] : "Does not guarantee results"}. The team's licenses, if any, are verified on this page.`),
    bi2("¿Puedo consultar por video? | Can I consult by video?", "Sí, en los servicios que lo permiten; lo ves al reservar. | Yes, for the services that allow it; you see it when booking."),
    bi2("¿Se guarda lo que cuento? | Is what I share kept private?", "Tu cita no dice el trámite. Lo que cuentas en la consulta es confidencial. | Your booking does not state the matter. What you share in the consultation is confidential."),
    bi2("¿Dónde pago? | Where do I pay?", "En la oficina. La app no cobra tarjetas por estos servicios, y lo del gobierno lo pagas tú directamente. | At the office. The app does not charge cards for these services, and the government fee you pay directly."),
  ];
  const pay = bi2("¿Dónde pago? | Where do I pay?", "En el local. La app no cobra tarjetas por estos servicios. | At the shop. The app does not charge cards for these services.");
  const cita = bi2("¿Necesito cita? | Do I need an appointment?", "Puedes reservar en la app y te confirmamos por mensaje; algunos servicios también se atienden sin cita. | You can book in the app and we confirm by message; some services are also available without an appointment.");
  const T = {
    seg: [bi2("¿Cuánto cuesta la cotización? | Does a quote cost anything?", "Es gratis. Comparamos varias compañías y el precio final lo pone la compañía. | It is free. We compare several carriers and the carrier sets the final price."),
      bi2("¿Con qué compañías trabajan? | Which carriers do you work with?", "Con varias; las ves cuando pides la cotización. | With several; you see them when you ask for a quote."),
      bi2("¿Puedo cambiar mi póliza? | Can I change my policy?", "Sí. Revisamos si puedes pagar menos con la misma cobertura. | Yes. We check whether you can pay less with the same coverage."), pay],
    repair: [bi2("¿Cuánto cuesta el diagnóstico? | How much is the diagnosis?", "Lo revisamos y te decimos el precio antes de arreglar; no se cobra nada sin tu OK. | We check it and tell you the price before repairing; nothing is charged without your OK."),
      bi2("¿Cuánto tarda la reparación? | How long does the repair take?", "Casi siempre el mismo día o al siguiente; te avisamos por mensaje. | Usually the same or next day; we message you."),
      bi2("¿Tienen garantía? | Is there a warranty?", "Sí, en la pieza y en la mano de obra; la ficha dice los días. | Yes, on the part and labor; the page lists the days."), cita],
    print: [bi2("¿Me mandan una prueba antes de imprimir? | Do you send a proof before printing?", "Sí. No se imprime nada sin tu OK. | Yes. Nothing is printed without your OK."),
      bi2("¿Cuánto tarda mi pedido? | How long does my order take?", "Depende del trabajo; la ficha dice los días y te avisamos cuando esté listo. | It depends on the job; the page lists the days and we tell you when it is ready."),
      bi2("¿Puedo traer mi propio diseño? | Can I bring my own design?", "Sí, o te lo hacemos. | Yes, or we design it for you."), pay],
    digital: [bi2("¿Cuánto cuesta mi proyecto? | How much will my project cost?", "Te damos un presupuesto por escrito antes de empezar. Nada se cobra sin tu OK. | We give you a written estimate before starting. Nothing is charged without your OK."),
      bi2("¿Cuánto tarda? | How long does it take?", "Depende del proyecto; la ficha dice el tiempo de partida. | It depends on the project; the page lists the starting time."),
      bi2("¿Los archivos y las claves son míos? | Do I own the files and logins?", "Sí, todo se entrega a tu nombre al terminar. | Yes, everything is handed over in your name at the end."), cita],
    build: [bi2("¿Cuánto cuesta un proyecto? | How much does a project cost?", "Después de la consulta te damos el total por escrito. Nada se cobra sin tu OK. | After the consultation we give you the total in writing. Nothing is charged without your OK."),
      bi2("¿Qué incluye la visita al lugar? | What does the site visit include?", "Medimos, fotografiamos y revisamos el lugar. | We measure, photograph and review the site."),
      bi2("¿Esto sirve para el permiso de la ciudad? | Does this work for the city permit?", "Los profesionales con licencia firman y sellan lo que la ciudad pide; la ficha muestra la licencia. | Licensed professionals sign and seal what the city requires; the page shows the license."), pay],
    biz: [bi2("¿Cuánto cuesta? | How much does it cost?", "La primera consulta suele ser gratis; el resto lo ves en cada servicio. | The first consultation is usually free; the rest is shown on each service."),
      bi2("¿Cuánto tarda? | How long does it take?", "La ficha dice en cuántos días queda listo cada trámite. | The page says in how many days each procedure is ready."),
      bi2("¿Me dan el precio antes de empezar? | Do you give me the price before starting?", "Sí, por escrito. Nada se cobra sin tu OK. | Yes, in writing. Nothing is charged without your OK."), pay],
    money: [bi2("¿Cuánto cobran por enviar? | What do you charge to send?", "La tarifa, la tasa y el total se dicen antes de pagar. | The fee, the rate and the total are stated before you pay."),
      bi2("¿Qué necesito para enviar o cambiar un cheque? | What do I need to send money or cash a check?", "Una identificación vigente. Para montos grandes puedes reservar una cita. | A valid ID. For large amounts you can book an appointment."),
      bi2("¿Puedo ir sin cita? | Can I walk in?", "Sí, para casi todo. La cita es para montos grandes o trámites largos. | Yes, for almost everything. Appointments are for large amounts or longer procedures."), pay],
    svc: [bi2("¿Cómo se calcula el precio? | How is the price set?", "Por hora, por servicio o por ruta; lo ves en cada servicio y por escrito antes de empezar. | By the hour, by service or by route; you see it on each service and in writing before starting."),
      bi2("¿Tienen seguro? | Are you insured?", "Sí; pide el certificado en la consulta. | Yes; ask for the certificate at the consultation."),
      bi2("¿Cuánto tarda en empezar? | How soon can you start?", "La ficha dice el tiempo de partida; para urgencias, llama. | The page lists the starting time; for urgent needs, call."), pay],
    ofic: [bi2("¿Van a mi boda o evento? | Do you come to my wedding or event?", "Sí, hasta unas 40 millas de la ciudad. | Yes, up to about 40 miles from the city."),
      bi2("¿Puedo escribir mis propios votos? | Can I write my own vows?", "Claro; los revisamos juntos antes de la ceremonia. | Of course; we review them together before the ceremony."),
      bi2("¿Qué pasa con el papeleo legal de la boda? | What about the wedding paperwork?", "La licencia de matrimonio la tramita la pareja en el condado; el oficiante explica los pasos. | The couple gets the marriage license at the county; the officiant explains the steps."), pay],
  };
  return T[tipo] ?? T.biz;
}

/* ── «Acerca de» ── */
const TAIL = {
  seg: ["Comparamos varias compañías por ti. | We compare several carriers for you."], money: ["La tasa y el total, a la vista antes de pagar. | The rate and total shown before you pay."],
  repair: ["Diagnóstico claro y garantía en la reparación. | Clear diagnosis and a warranty on the repair."], print: ["Prueba antes de imprimir. | A proof before printing."],
  digital: ["Presupuesto por escrito antes de empezar. | Written estimate before we start."], build: ["Presupuesto por escrito antes de empezar. | Written estimate before we start."],
  biz: ["Precio claro y por escrito. | Clear, written pricing."], svc: ["Precio claro y por escrito. | Clear, written pricing."], ofic: ["Ceremonias a tu medida, en español e inglés. | Ceremonies tailored to you, in Spanish and English."],
};
export function acerca(legal, tipo, v) {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const f = (t) => t.replace(/\{o\}/g, v.o).replace(/\{st\}/g, v.st).replace(/\{y\}/g, v.y).replace(/\{c\}/g, v.c).replace(/\{n\}/g, v.n).replace(/\{a\}/g, v.a[0]).replace(/\{A\}/g, v.a[1]).replace(/\{Ac\}/g, cap(v.a[0])).replace(/\{Aen\}/g, cap(v.a[1]));
  const L = legal ? [
    ["{n}: {a} en {c} desde {y}. Atendemos en español e inglés y el total, siempre por escrito.", "{n}: {A} in {c} since {y}. We serve in Spanish and English and the total is always in writing."],
    ["En {st} desde {y}, {o} y su equipo ayudan a las familias de {c} con {a}. Sin letra chiquita.", "On {st} since {y}, {o} and the team help {c} families with {A}. No fine print."],
    ["{n} en {c}. {Ac} con explicaciones claras, cita en la app y precios a la vista.", "{n} in {c}. {Aen} with clear explanations, booking in the app and prices up front."],
  ] : [
    ["{n}: {a} en {c} desde {y}. Presupuesto antes de empezar; nada se cobra sin tu OK.", "{n}: {A} in {c} since {y}. Estimate before we start; nothing is charged without your OK."],
    ["En {st} desde {y}, {o} atiende a {c} con {a}. Trato directo y en español.", "On {st} since {y}, {o} serves {c} with {A}. Direct, friendly service in Spanish."],
    ["{n} en {c}: {a}. Reserva tu cita en la app y llega con tus preguntas.", "{n} in {c}: {A}. Book in the app and come with your questions."],
  ];
  const p = v.r.pick(L), tail = !legal && TAIL[tipo] && v.r.chance(0.7) ? TAIL[tipo][0].split(" | ") : null;
  return { es: f(p[0]) + (tail ? " " + tail[0] : ""), en: f(p[1]) + (tail ? " " + tail[1] : "") };
}

/* ── Extras de un total por escrito (cada uno: nombre y centavos) ── */
const EX = {
  doc: [["Traducción de documentos | Document translation", 4500], ["Entrega urgente | Rush delivery", 6000], ["Copias certificadas | Certified copies", 2500]],
  tax: [["Declaración estatal adicional | Additional state return", 4500], ["Entrega urgente | Rush delivery", 6000], ["Año anterior adicional | Additional prior year", 8000]],
  fin: [["Revisión extra de documentos | Extra document review", 3500], ["Reunión de seguimiento | Follow-up meeting", 5000]],
  legal: [["Traducción de documentos | Document translation", 4500], ["Entrega urgente | Rush delivery", 6000], ["Copias certificadas | Certified copies", 2500]],
  repair: [["Pieza de mayor calidad | Higher-grade part", 3000], ["Entrega urgente | Rush service", 2500]], print: [["Prueba impresa | Printed proof", 1500], ["Entrega urgente | Rush delivery", 3500]],
  digital: [["Ronda extra de cambios | Extra revision round", 5000], ["Entrega urgente | Rush delivery", 8000]], build: [["Visita adicional al lugar | Additional site visit", 15000], ["Copias selladas | Sealed copies", 3500]],
  biz: [["Reunión adicional | Additional meeting", 5000], ["Entrega urgente | Rush delivery", 6000]], svc: [["Horas adicionales | Additional hours", 5000]], ofic: [["Ensayo de la ceremonia | Ceremony rehearsal", 10000]],
  seg: [], money: [],
};
export const extrasDe = (tipo) => (EX[tipo] ?? EX.legal).map(([n, c]) => { const [es, en] = n.split(" | "); return { name: { es, en }, cents: c }; });

/* Rol en femenino cuando la persona es mujer (solo la parte en español, antes de « | »). */
const FEM = [[/\bBarbero\b/g, "Barbera"], [/\bdueño\b/g, "dueña"], [/\bAbogado\b/g, "Abogada"], [/\bNotario\b/g, "Notaria"], [/\bTraductor\b/g, "Traductora"], [/\bGestor\b/g, "Gestora"], [/\bPreparador\b/g, "Preparadora"],
  [/\bContador\b/g, "Contadora"], [/\bAsesor\b/g, "Asesora"], [/\bAsociado\b/g, "Asociada"], [/\basociado\b/g, "asociada"], [/\bCajero\b/g, "Cajera"], [/\bTécnico\b/g, "Técnica"], [/\bDiseñador\b/g, "Diseñadora"], [/\bProgramador\b/g, "Programadora"],
  [/\bIngeniero\b/g, "Ingeniera"], [/\bArquitecto\b/g, "Arquitecta"], [/\bTopógrafo\b/g, "Topógrafa"], [/\bConsultor\b/g, "Consultora"], [/\bCoordinador\b/g, "Coordinadora"], [/\bAdministrador\b/g, "Administradora"],
  [/\bFotógrafo\b/g, "Fotógrafa"], [/\bCamarógrafo\b/g, "Camarógrafa"], [/\bProductor\b/g, "Productora"], [/\bEditor\b/g, "Editora"], [/\bDirector\b/g, "Directora"], [/\bSupervisor\b/g, "Supervisora"], [/\bDespachador\b/g, "Despachadora"],
  [/\bMensajero\b/g, "Mensajera"], [/\bInvestigador\b/g, "Investigadora"], [/\bReclutador\b/g, "Reclutadora"], [/\bOperador\b/g, "Operadora"], [/\bImpresor\b/g, "Impresora"], [/\bMaestro\b/g, "Maestra"], [/\bGerente\b/g, "Gerente"],
  [/\bAgente\b/g, "Agente"], [/\bOriginador\b/g, "Originadora"], [/\bCorredor\b/g, "Corredora"], [/\bEstratega\b/g, "Estratega"], [/\bIntérprete\b/g, "Intérprete"], [/\bEspecialista\b/g, "Especialista"], [/\bDibujante\b/g, "Dibujante"],
  [/\bAyudante\b/g, "Ayudante"], [/\bOficiante\b/g, "Oficiante"], [/\bRedactor\b/g, "Redactora"]];
export function genero(rol, fem) {
  if (!fem) return rol;
  const [es, en] = rol.split(" | ");
  let F = es;
  for (const [re, to] of FEM) F = F.replace(re, to);
  return en ? `${F} | ${en}` : F;
}
