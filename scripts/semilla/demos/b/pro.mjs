/* NEG-PRO · 5 subcategorías principales (las 5 primeras del catálogo por `sort`): abogado de inmigración, ayuda con documentos de inmigración,
   trámites de consulado y pasaporte, abogado general, derecho familiar. Todas son «legales» en la app (licencias, «lo que no hago» y EL TOTAL POR ESCRITO).
   Nada se cobra en la app (pay_mode local): el honorario se paga a la oficina y lo del gobierno lo paga el cliente. Sin números de caso en ningún texto. */
import { usd, sumaDias, diaN, HOY } from "./comun.mjs";
import { crear, poner, horario, persona, precio, bi, reiniciarIds, rolGenero } from "./negocio.mjs";
import { citasHistoria } from "./citas.mjs";
import { resenas, novedades, seguidores, ts } from "./historia.mjs";

const CAT = "NEG-PRO";
/* [sección, es, en, descEs, descEn, honorario, min, tipo, {gov, rem, cred, no, hrs, core, mes}] */
const S = (sec, es, en, de, dn, p, d, k, o = {}) => ({ sec, es, en, de, dn, p, d, k, gov: o.gov ?? 0, rem: o.rem !== false, cred: !!o.cred, no: o.no ?? null, hrs: o.hrs ?? null, core: !!o.core });

const SUBS = [
  {
    sub: "NEG-PRO-01", tipo: "inmigracion", lic: [["abogado", 0], ["abogado", 1]], nombres: ["Bufete Almonte y Asociados", "Oficina Legal Cabrera Inmigración", "Abogada Mercedes Valdez", "Centro Legal Familia Unida", "Ferreira Immigration Law", "Oficina Jurídica Santana", "Bufete Hernández Inmigración", "Abogado Rafael Peña y Equipo", "Defensa Migratoria del Valle", "Bufete Ramírez y Colón"],
    secs: ["Inmigración | Immigration", "Defensa | Defense"],
    svc: [
      S(0, "Consulta de inmigración", "Immigration consultation", "Una abogada o abogado revisa tu caso, te dice qué opciones tienes y cuánto cuesta cada una. Se descuenta si lo contratas.", "An attorney reviews your case, tells you your options and what each costs. Credited if you hire.", 7500, 45, "cons", { cred: true, core: true }),
      S(0, "Renovar la green card (I-90)", "Renew green card (I-90)", "Llenan y envían el formulario, revisan tus papeles y te acompañan hasta la cita de huellas.", "They fill and file the form, check your papers and guide you to the biometrics appointment.", 35000, 60, "fijo", { gov: 46500, core: true }),
      S(0, "Ciudadanía (N-400)", "Citizenship (N-400)", "Formulario, revisión de tu historial y preparación para la entrevista y el examen.", "Form, history review and prep for the interview and test.", 95000, 60, "fijo", { gov: 76000, core: true, no: "Si tienes un arresto en tu historial, primero hace falta la consulta. | If you have an arrest on record, the consultation comes first." }),
      S(0, "Petición familiar (I-130)", "Family petition (I-130)", "Para pedir a tu esposo o esposa, hijos o padres.", "To petition your spouse, children or parents.", 120000, 60, "fijo", { gov: 67500, core: true }),
      S(0, "Permiso de trabajo (I-765)", "Work permit (I-765)", "Formulario, evidencia y envío.", "Form, evidence and filing.", 45000, 45, "fijo", { gov: 52000 }),
      S(0, "Consulta por video o teléfono", "Video or phone consultation", "Desde tu casa, con el mismo abogado.", "From home, with the same attorney.", 5000, 30, "cons", { cred: true }),
      S(1, "Defensa en corte de inmigración", "Immigration court defense", "Te representa ante el juez. El precio depende del caso; te lo dan por escrito en la consulta.", "Represents you before the judge. Price depends on the case; you get it in writing at the consultation.", 350000, 60, "cotiza", { rem: false }),
      S(1, "Asilo", "Asylum", "Preparación del caso y acompañamiento en cada paso. Total por escrito en la consulta.", "Case preparation and support at every step. Total in writing at the consultation.", 300000, 60, "cotiza", { rem: false }),
    ],
    cant: ["No garantiza que aprueben tu caso | Does not guarantee your case is approved", "Abogados con licencia en PA | Licensed PA attorneys"],
    about: [["Abogados de inmigración en {c} desde {y}. {o} y su equipo te explican tus opciones con claridad y te dan el total por escrito antes de empezar. Hablamos español e inglés.", "Immigration attorneys in {c} since {y}. {o} and the team explain your options clearly and give you the total in writing before we begin. We speak Spanish and English."],
      ["Desde {y} en {st}, acompañamos a familias de {c} con green cards, ciudadanía y peticiones familiares. Cada caso lo lleva una abogada con licencia.", "Since {y} on {st}, we have supported {c} families with green cards, citizenship and family petitions. A licensed attorney handles every case."],
      ["{n}: oficina de inmigración sin letra chiquita. Primera consulta con precio fijo, que se descuenta si nos contratas.", "{n}: an immigration office with no fine print. A flat-price first consultation, credited if you hire us."]],
    horas: (r) => [null, [540, 1050], [540, 1050], [540, 1050], [540, 1050], [540, 960], r.chance(0.5) ? [600, 780] : null],
  },
  {
    sub: "NEG-PRO-02", tipo: "documentos", lic: [["acreditado", 0], ["notario", 1]], nombres: ["Ayuda Migratoria La Puerta Abierta", "Centro de Documentos Nuevo Camino", "Servicios Migratorios Esperanza", "Trámites y Papeles Don Luis", "Asistencia de Inmigración Mano Amiga", "Centro de Ayuda Migratoria Nuestra Tierra", "Documentos al Día", "Servicios de Inmigración Puente Seguro", "Papeles en Orden Latino", "Ayuda de Inmigración Santa María"],
    secs: ["Formularios | Forms", "Acompañamiento | Support"],
    svc: [
      S(0, "Revisión de tus documentos", "Document review", "Una persona acreditada revisa tus papeles y te dice qué formulario sigue.", "An accredited representative reviews your papers and tells you which form is next.", 4000, 30, "cons", { cred: true, core: true }),
      S(0, "Renovar la green card (I-90)", "Renew green card (I-90)", "Llenado del formulario y revisión final antes de enviarlo.", "Form preparation and a final review before filing.", 15000, 45, "fijo", { gov: 46500, core: true }),
      S(0, "Ciudadanía (N-400)", "Citizenship (N-400)", "Llenado del formulario y preparación para la entrevista.", "Form preparation and interview practice.", 30000, 60, "fijo", { gov: 76000, core: true, no: "No damos consejo si tienes un arresto o una orden de deportación: te mandamos con un abogado. | We do not advise if you have an arrest or a removal order: we refer you to an attorney." }),
      S(0, "Permiso de trabajo (I-765)", "Work permit (I-765)", "Llenado del formulario y lista de documentos.", "Form preparation and document checklist.", 20000, 45, "fijo", { gov: 52000, core: true }),
      S(0, "Petición familiar (I-130)", "Family petition (I-130)", "Llenado y revisión del paquete completo.", "Preparation and review of the full package.", 40000, 60, "fijo", { gov: 67500 }),
      S(1, "Acompañamiento a la cita de huellas", "Biometrics appointment support", "Te explicamos qué llevar y te acompañamos.", "We explain what to bring and go with you.", 6000, 30, "fijo"),
      S(1, "Cartas y copias certificadas", "Letters and certified copies", "Cartas de apoyo y copias de tus documentos.", "Support letters and copies of your documents.", 2500, 20, "fijo"),
    ],
    cant: ["No somos abogados y no damos consejo legal | We are not attorneys and do not give legal advice", "Representantes acreditados (DOJ) y notarios | DOJ-accredited representatives and notaries"],
    about: [["Ayuda con documentos de inmigración en {c} desde {y}. Llenamos formularios y te acompañamos en el trámite, con una representante acreditada por el Departamento de Justicia. No somos abogados: si tu caso lo necesita, te mandamos con uno.", "Immigration paperwork help in {c} since {y}. We fill out forms and support you through the process, with a representative accredited by the Department of Justice. We are not attorneys: if your case needs one, we refer you."],
      ["{n}, en {st} desde {y}: formularios bien llenados y precios claros, por escrito. Atendemos en español.", "{n} on {st} since {y}: forms done right and clear prices, in writing. We serve you in Spanish."],
      ["Desde {y} ayudamos a las familias de {c} a tener sus papeles en orden: renovaciones, ciudadanía y permisos de trabajo.", "Since {y} we have helped {c} families keep their papers in order: renewals, citizenship and work permits."]],
    horas: (r) => [null, [540, 1020], [540, 1020], [540, 1080], [540, 1020], [540, 960], r.chance(0.6) ? [600, 840] : null],
  },
  {
    sub: "NEG-PRO-03", tipo: "consulado", lic: [["notario", 0], ["ata", 1]], nombres: ["Trámites Consulares La Patria", "Gestoría Pasaporte Rápido", "Notaría y Consulado Hermanos Peña", "Apostillas y Trámites del Cibao", "Documentos Consulares Quisqueya", "Gestoría Latina de Documentos", "Notaría Pública La Esquina", "Trámites Consulares Tierra Querida", "Servicios Consulares y Notaría Colón", "Pasaportes y Poderes Mi Raíz"],
    secs: ["Consulado y pasaporte | Consulate and passport", "Notaría y traducción | Notary and translation"],
    svc: [
      S(0, "Consulta de trámites", "Procedures consultation", "Te decimos qué documentos necesitas y cuánto cuesta cada trámite.", "We tell you which documents you need and what each procedure costs.", 0, 20, "cons", { core: true }),
      S(0, "Renovación de pasaporte", "Passport renewal", "Revisamos tu solicitud, tus fotos y agendamos tu cita en el consulado.", "We review your application and photos and book your consulate appointment.", 6500, 40, "fijo", { gov: 12000, core: true }),
      S(0, "Matrícula consular", "Consular ID", "Preparación de documentos y cita.", "Document preparation and appointment.", 5000, 30, "fijo", { gov: 3500, core: true }),
      S(0, "Acta de nacimiento o de matrimonio", "Birth or marriage certificate", "La pedimos a tu país y te la entregamos.", "We request it from your country and deliver it to you.", 5500, 30, "fijo", { gov: 2500 }),
      S(1, "Poder notarial", "Power of attorney", "Redacción y firma ante notario.", "Drafting and signing before a notary.", 5000, 30, "fijo", { core: true }),
      S(1, "Apostilla de documentos", "Document apostille", "Trámite completo ante el estado.", "Complete process with the state.", 4500, 25, "fijo", { gov: 2500 }),
      S(1, "Traducción certificada", "Certified translation", "Con certificación aceptada por USCIS y escuelas.", "With certification accepted by USCIS and schools.", 3500, 25, "fijo", { core: true }),
      S(1, "Firma notarial sin cita", "Walk-in notary", "Llegas y firmas con tu identificación.", "Walk in and sign with your ID.", 1500, 15, "walk"),
    ],
    cant: ["No damos consejo legal ni de inmigración | We do not give legal or immigration advice", "Notarios y traductores certificados | Notaries and certified translators"],
    about: [["Trámites de consulado, pasaporte y notaría en {c} desde {y}. Renovamos pasaportes, sacamos matrículas, apostillamos y traducimos con certificación. Todo con precio claro y por escrito.", "Consulate, passport and notary services in {c} since {y}. We renew passports, process consular IDs, apostille and translate with certification. Everything with a clear, written price."],
      ["Desde {y} en {st}: evitamos que viajes y hagas filas. {o} y su equipo se encargan del trámite y te avisan cuando está listo.", "Since {y} on {st}: we save you the trip and the lines. {o} and the team handle the process and tell you when it is ready."],
      ["{n}: notaría pública, traducciones y gestiones ante el consulado para la comunidad de {c}.", "{n}: public notary, translations and consulate procedures for the {c} community."]],
    horas: (r) => [r.chance(0.4) ? [600, 840] : null, [540, 1080], [540, 1080], [540, 1080], [540, 1080], [540, 1080], [540, 900]],
  },
  {
    sub: "NEG-PRO-04", tipo: "general", lic: [["abogado", 0], ["abogado", 1]], nombres: ["Oficina Legal Valdez y Núñez", "Bufete Jurídico Colón", "Abogado Carlos Medina", "Asesoría Legal del Pueblo", "Firma Legal Domínguez", "Bufete de Familia Báez", "Abogada Laura Paulino y Asociados", "Oficina de Abogados Tavárez", "Bufete Jiménez y Cruz", "Despacho Legal Santa Rosa"],
    secs: ["Consultas | Consultations", "Documentos y contratos | Documents and contracts"],
    svc: [
      S(0, "Consulta legal", "Legal consultation", "Un abogado revisa tu situación y te explica tus opciones. Se descuenta si lo contratas.", "An attorney reviews your situation and explains your options. Credited if you hire.", 7500, 45, "cons", { cred: true, core: true }),
      S(0, "Asesoría por hora", "Hourly advice", "Por hora, con un estimado de horas por escrito.", "Hourly, with an estimate of hours in writing.", 20000, 60, "hora", { hrs: "2–6", core: true }),
      S(1, "Revisión de contrato de renta o trabajo", "Lease or work contract review", "Te decimos qué firmas y qué cuidar.", "We tell you what you are signing and what to watch.", 12000, 45, "fijo", { core: true }),
      S(1, "Carta legal", "Legal letter", "Redactada y enviada con el membrete del bufete.", "Drafted and sent on firm letterhead.", 25000, 45, "fijo"),
      S(1, "Poder notarial y testamento", "Power of attorney and will", "Documento completo y firma ante notario.", "Complete document and signing before a notary.", 35000, 60, "fijo", { core: true }),
      S(1, "Demanda en corte menor", "Small claims case", "Preparación del caso y acompañamiento. Total por escrito en la consulta.", "Case preparation and support. Total in writing at the consultation.", 120000, 60, "cotiza", { rem: false }),
    ],
    cant: ["No garantiza el resultado de tu caso | Does not guarantee the outcome of your case", "Abogados con licencia en PA | Licensed PA attorneys"],
    about: [["Abogados generales en {c} desde {y}. Contratos, documentos, deudas y casos civiles. Te explicamos en español e inglés y te damos el total por escrito antes de empezar.", "General attorneys in {c} since {y}. Contracts, documents, debts and civil matters. We explain in Spanish and English and give you the total in writing before we start."],
      ["{n}, en {st} desde {y}: un abogado de confianza para la familia y el pequeño negocio.", "{n} on {st} since {y}: a trusted attorney for the family and the small business."],
      ["Desde {y} ayudamos a la comunidad de {c} con documentos legales claros y precios fijos.", "Since {y} we have helped the {c} community with clear legal documents and flat prices."]],
    horas: (r) => [null, [540, 1050], [540, 1050], [540, 1050], [540, 1050], [540, 960], r.chance(0.3) ? [600, 780] : null],
  },
  {
    sub: "NEG-PRO-05", tipo: "familiar", lic: [["abogado", 0], ["abogado", 1]], nombres: ["Abogada de Familia Altagracia Reyes", "Bufete Familiar Luz y Derecho", "Oficina de Derecho Familiar Soto", "Centro Legal de la Familia Latina", "Firma Familiar Torres y Medina", "Defensa de la Familia Colón", "Abogados de Familia Del Valle", "Derecho Familiar Domínguez", "Bufete Familiar Reyes y Paulino", "Asesoría Familiar Puente de Vida"],
    secs: ["Consultas | Consultations", "Familia | Family"],
    svc: [
      S(0, "Consulta de derecho familiar", "Family law consultation", "Te explicamos tus opciones con calma. Se descuenta si nos contratas.", "We explain your options calmly. Credited if you hire us.", 7500, 45, "cons", { cred: true, core: true }),
      S(1, "Divorcio sin pelea", "Uncontested divorce", "Cuando los dos están de acuerdo. Incluye los papeles de la corte.", "When both agree. Includes the court papers.", 110000, 45, "fijo", { gov: 25000, core: true }),
      S(1, "Pensión alimenticia", "Child support", "Solicitud o cambio, con los documentos preparados.", "Filing or modification, with documents prepared.", 90000, 45, "fijo", { gov: 10000, core: true }),
      S(1, "Custodia y visitas", "Custody and visitation", "El precio depende del caso; lo recibes por escrito en la consulta.", "Price depends on the case; you receive it in writing at the consultation.", 250000, 60, "cotiza", { rem: false, core: true }),
      S(1, "Mediación familiar", "Family mediation", "Una sola sesión con los dos para llegar a un acuerdo.", "A joint session to reach an agreement.", 15000, 60, "hora", { hrs: "2–4" }),
      S(1, "Orden de protección", "Protection order", "Preparación y acompañamiento en la audiencia.", "Preparation and support at the hearing.", 30000, 60, "fijo", { gov: 0 }),
    ],
    cant: ["No garantiza el resultado de tu caso | Does not guarantee the outcome of your case", "Abogados de familia con licencia en PA | Licensed PA family attorneys"],
    about: [["Derecho familiar en {c} desde {y}. Divorcios, custodia, pensión alimenticia y acuerdos entre familias, con respeto y en español. El total, siempre por escrito.", "Family law in {c} since {y}. Divorce, custody, child support and agreements between families, with respect and in Spanish. The total is always in writing."],
      ["En {st} desde {y}, {o} acompaña a las familias de {c} en los momentos difíciles con claridad y sin letra chiquita.", "On {st} since {y}, {o} accompanies {c} families through difficult times with clarity and no fine print."],
      ["{n}: oficina de derecho familiar. Divorcios sin pelea a precio fijo y mediación cuando hay desacuerdo.", "{n}: family law office. Flat-price uncontested divorces and mediation when there is disagreement."]],
    horas: (r) => [null, [540, 1050], [540, 1050], [540, 1050], [540, 1050], [540, 960], r.chance(0.3) ? [600, 780] : null],
  },
];

const BANCO = {
  pos: {
    open: ["Me explicaron mi caso con calma y en español. | They explained my case calmly and in Spanish.", "{p} fue claro desde la primera consulta. | {p} was clear from the first consultation.", "Me dieron el total por escrito antes de empezar. | They gave me the total in writing before we began.",
      "Sentí que me trataban con respeto. | I felt treated with respect.", "Me dijeron con honestidad lo que podían y no podían hacer. | They told me honestly what they could and could not do.", "Todo el trámite fue ordenado y sin sorpresas. | The whole process was orderly and without surprises.",
      "Respondieron cada pregunta que tenía. | They answered every question I had.", "Por fin encontré una oficina de confianza en {c}. | I finally found a trustworthy office in {c}."],
    det: ["El precio fue el mismo que me dieron por escrito. | The price was the same as the one they gave me in writing.", "Me avisaron de cada paso por mensaje. | They told me each step by message.", "Cumplieron la fecha que me prometieron. | They met the date they promised.",
      "Me explicaron lo que paga el gobierno y lo que paga la oficina. | They explained what the government charges and what the office charges.", "La consulta se descontó del total, como dijeron. | The consultation was credited to the total, as they said.", "Reservé por la app y la cita empezó a tiempo. | I booked in the app and the appointment started on time.",
      "Me dijeron cuándo necesitaba un abogado y cuándo no. | They told me when I needed an attorney and when I did not."],
    close: ["Se lo recomiendo a mi familia. | I recommend them to my family.", "Volvería sin dudarlo. | I would go back without hesitation.", "Gracias a todo el equipo. | Thanks to the whole team.", "Cinco estrellas. | Five stars."],
  },
  mid: {
    open: ["La consulta fue útil, aunque esperé en la sala más de lo que decía la cita. | The consultation was useful, though I waited longer than the booking said.", "Buen trabajo, pero me hubiera gustado más aviso de cada paso. | Good work, but I would have liked more updates on each step.", "Me explicaron bien; el precio total me pareció alto. | They explained well; the total price felt high."],
    det: ["Tardaron en responder un mensaje. | They took a while to answer a message.", "El trámite fue bien, con un par de retrasos. | The process went fine, with a couple of delays."],
    midClose: ["Espero que mejoren la comunicación. | I hope communication improves.", "Aun así, el servicio cumplió. | Even so, the service delivered."],
  },
  neg: {
    open: ["Esperaba más comunicación durante el trámite. | I expected more communication during the process.", "Esperé más de lo que decía mi cita. | I waited more than my booking said.", "El total final no coincidió con lo que entendí. | The final total did not match what I understood."],
    det: ["Tuve que llamar varias veces para saber cómo iba todo. | I had to call several times to find out how things were going.", "Nadie me avisó del retraso. | Nobody told me about the delay.", "Me costó entender lo que cubría el precio. | It was hard to understand what the price covered."],
  },
  rPos: ["Gracias por su confianza. Aquí estamos para lo que necesite. | Thank you for your trust. We are here for whatever you need.", "Nos alegra haber ayudado. Gracias por contarlo. | We are glad we could help. Thank you for sharing.", "Gracias por sus palabras; las compartimos con el equipo. | Thank you for your words; we share them with the team."],
  rMid: ["Gracias por su opinión. Ahora avisamos cada paso por mensaje. | Thank you for your feedback. We now send an update at every step."],
  rNeg: ["Lamentamos que no haya sido la experiencia que esperaba. Llámenos y lo aclaramos con el total por escrito en la mano. | We are sorry it was not the experience you expected. Call us and we will go over it with the written total in hand.", "Tiene razón en lo de la espera. Cambiamos cómo damos las horas. | You are right about the wait. We changed how we give times."],
  answers: (est, r) => ({ lengua: r.weighted([["es", 78], ["int", 14], ["no", est <= 2 ? 20 : 3]]), explico: est >= 4 ? 1 : est === 3 ? 0 : -1, cobro: est >= 3 ? 1 : 0, trato: est >= 4 ? 1 : est === 3 ? 0 : -1, ley: est >= 3 ? 1 : 0, fecha: est >= 4 ? "a" : est === 3 ? "b" : "c" }),
  facts: (o) => (o.total ? { tot: o.total, hired: o.hired } : { hired: !!o.hired }),
};
const NOV = [
  { kind: "novedad", t: "Ya reservas tu consulta en la app | You can now book your consultation in the app", b: "Elige el servicio, el profesional y la hora. El total te lo damos por escrito. | Choose the service, the professional and the time. We give you the total in writing." },
  { kind: "novedad", t: "Consultas por video | Video consultations", b: "Si no puedes venir, te atendemos por video o teléfono. | If you cannot come in, we see you by video or phone." },
  { kind: "aviso", t: "Horario especial en feriados | Holiday hours", b: "Cerramos el día feriado. Las consultas se reprograman desde la app. | Closed on the holiday. Consultations can be rescheduled in the app.", day: "Feriado", hrs: "closed", hrsT: "" },
  { kind: "novedad", t: "Nuevo profesional en el equipo | A new professional joins the team", b: "Ya puedes reservar con él o ella desde nuestra página. | You can book with them from our page now." },
  { kind: "hoy", t: "Hay consultas disponibles hoy | Consultations open today", b: "Reserva en la app o llámanos. | Book in the app or call us." },
  { kind: "encuesta", t: "¿Qué horario te sirve más? | Which hours work best for you?", b: "", poll: ["Más temprano | Earlier", "Más tarde | Later", "Sábados | Saturdays"] },
  { kind: "novedad", t: "Charla gratis para la comunidad | Free community talk", b: "Una charla de preguntas y respuestas, en español, en nuestra oficina. | A Q&A session in Spanish at our office." },
  { kind: "novedad", t: "Cumplimos años en {c} | Our anniversary in {c}", b: "Gracias a las familias que confían en nosotros desde {y}. | Thank you to the families who have trusted us since {y}." },
  { kind: "aviso", t: "Cambios de precio del gobierno | Government fee changes", b: "Revisa la ficha: actualizamos lo que cobra el gobierno en cada trámite. | Check the page: we updated what the government charges for each procedure.", day: "Vigente", hrs: "early", hrsT: "" },
];

export function construir(si, k, ord) {
  const cfg = SUBS[si], nombre = cfg.nombres[k];
  const b = crear({ cat: CAT, sub: cfg.sub, si, k, ord, nombre });
  const r = b.r;
  b.factor = 0.88 + r() * 0.3;
  const anos = 2026 - b.founded;
  b.langs = ["es", "en"];
  b.subs = [cfg.sub, ...(cfg.tipo === "inmigracion" ? ["NEG-PRO-02"].filter(() => r.chance(0.2)) : cfg.tipo === "general" ? ["NEG-PRO-05", "NEG-PRO-13"].filter(() => r.chance(0.35)) : cfg.tipo === "familiar" ? ["NEG-PRO-06"].filter(() => r.chance(0.6)) : cfg.tipo === "consulado" ? ["NEG-PRO-15", "NEG-PRO-16"].filter(() => r.chance(0.5)) : ["NEG-PRO-01"].filter(() => r.chance(0.2)))];
  const aboutT = r.pick(cfg.about), f = (t) => t.replace(/\{o\}/g, b.owner.fn).replace(/\{st\}/g, b.calle).replace(/\{y\}/g, b.founded).replace(/\{c\}/g, b.cityNombre).replace(/\{n\}/g, nombre).replace(/\{a\}/g, anos);
  b.about = { es: f(aboutT[0]), en: f(aboutT[1]) };
  poner(b, CAT, cfg.sub, 6);
  b.mods = ["svc", "citas", "staff", "nov"];
  horario(b, cfg.horas(r));
  // equipo con licencia
  b.members = []; b.lic = [];
  const rolDe = { inmigracion: ["Abogado de inmigración · titular | Immigration attorney · principal", "Abogado de inmigración | Immigration attorney", "Asistente legal | Legal assistant"], documentos: ["Representante acreditada (DOJ) | DOJ-accredited representative", "Notario público | Notary public", "Asistente de documentos | Document assistant"],
    consulado: ["Notaria pública · dueña | Notary public · owner", "Traductora certificada | Certified translator", "Gestor de trámites | Procedures agent"], general: ["Abogado · titular | Attorney · principal", "Abogado asociado | Associate attorney", "Asistente legal | Legal assistant"], familiar: ["Abogada de familia · titular | Family law attorney · principal", "Abogada asociada | Associate attorney", "Asistente legal | Legal assistant"] }[cfg.tipo];
  const nM = r.int(2, 3), evitar = [b.owner.fn];
  b.members.push({ kind: "owner", name: `${b.owner.fn} ${b.owner.ln}`, role: bi(rolGenero(rolDe[0], b.owner.f)), langs: ["es", "en"], spec: [], since: b.founded, auto: r.chance(0.5), resp: [15, 30, 60][r.int(0, 2)], dep: 0, bio: bi(`Atiende en español e inglés desde hace ${anos} años. | Serves clients in Spanish and English for ${anos} years.`) });
  for (let j = 1; j < nM; j++) {
    const fm = r.chance(0.5), p = persona(r, fm, evitar); evitar.push(p.fn);
    b.members.push({ kind: "staff", name: p.nombre, role: bi(rolGenero(rolDe[j], fm)), langs: r.chance(0.5) ? ["es", "en"] : ["es"], spec: [], since: r.int(b.founded, 2024), auto: r.chance(0.4), resp: [15, 30, 60][r.int(0, 2)], dep: 0, bio: bi(`${rolDe[j].split(" | ")[0]}. Habla español. | ${rolDe[j].split(" | ")[1]}. Speaks Spanish.`) });
  }
  b.members.forEach((m, i) => { m.takes = i < 2; });
  for (const [kind, m] of cfg.lic) if (m < b.members.length) b.lic.push({ kind, m });
  // servicios
  const elegidos = cfg.svc.filter((s) => s.core || r.chance(0.65));
  b.secs = cfg.secs.map(bi);
  b.items = elegidos.map((s, i) => {
    const p = s.p === 0 ? 0 : precio(b, s.p), gov = s.gov ? Math.round(s.gov / 100) * 100 : 0;
    const attrs = { ...(s.rem ? { rem: true } : {}), ...(gov ? { gov } : {}), ...(s.cred ? { cred: true } : {}), ...(s.hrs ? { hrs: s.hrs, unit: "hora" } : {}), ...(s.no ? { no: [bi(s.no)] } : {}) };
    return { sort: i, sec: s.sec, name: bi(`${s.es} | ${s.en}`), descr: bi(`${s.de} | ${s.dn}`), price: p, dur: s.d, buf: 0, kind: s.k, attrs, photos: r.chance(0.7) ? [b.photos[(i + 1) % b.photos.length]] : [], who: [], gov };
  });
  const usadas = [...new Set(b.items.map((x) => x.sec))].sort((a, c) => a - c), mapa = new Map(usadas.map((s, n2) => [s, n2]));
  b.secs = usadas.map((s) => bi(cfg.secs[s])); b.items.forEach((x) => { x.sec = mapa.get(x.sec); });
  b.ps = { days: r.pick([3, 5, 7, 10, 14]), warr: 0, est: true, cos: null, cmp: false, plan: r.chance(0.55), urg: r.chance(0.3) };
  b.pol = { auto: b.members[0].auto, resp: b.members[0].resp, exp: 2, dep: 0, cxh: [2, 4, 12, 24][r.int(0, 3)], tol: 15, pick: true };
  const hay = (kx) => b.items.some((x) => x.kind === kx);
  const fv = ["cita", "online", "esp"]; if (hay("fijo")) fv.push("fijo"); if (hay("hora")) fv.push("hora"); if (b.items.some((x) => x.kind === "cons" && !x.price)) fv.push("gratis");
  if (b.items.some((x) => x.attrs.rem)) fv.push("remoto"); fv.push("presencial"); if (b.ps.plan) fv.push("plan"); if (b.ps.urg) fv.push("urgente");
  if (b.hours[6].open) fv.push("sabado"); if (b.founded <= 2016) fv.push("y10");
  b.fv = [...new Set(fv)];
  b.pay = ["local"];
  const consulta = b.items.find((x) => x.kind === "cons" && x.price);
  b.attrs = { m: "shop", lic: [...new Set(b.lic.map((l) => l.kind))], licL: bi(cfg.cant[1]), cant: [bi(cfg.cant[0]).es, bi(cfg.cant[0]).en], docs: b.members.length,
    tarjeta: { eta: bi(`Consulta con cita en la app | Consultation by appointment in the app`), fee: consulta ? bi(`Consulta ${usd(consulta.price)} · se descuenta si lo contratas | Consultation ${usd(consulta.price, false)} · credited if you hire`) : bi(`Consulta gratis · total por escrito | Free consultation · total in writing`) } };
  b.amenities = r.shuffle(["wifi", "estacionamiento", "accesible", "interprete", "tarjeta"]).slice(0, 3);
  b.faqs = [
    { q: bi("¿Cuánto me van a cobrar en total? | What will the total be?"), a: bi("Después de la consulta te mandamos el total por escrito: honorario, lo que cobra el gobierno y los extras que quieras. Tú decides si lo aceptas. | After the consultation we send you the total in writing: fee, what the government charges and any extras you want. You decide whether to accept.") },
    { q: bi("¿Qué hace y qué no hace esta oficina? | What does this office do and not do?"), a: bi(`${cfg.cant[0]}. Las licencias del equipo están verificadas en la ficha. | ${cfg.cant[0].split(" | ")[1]}. The team's licenses are verified on this page.`) },
    { q: bi("¿Puedo consultar por video? | Can I consult by video?"), a: bi("Sí, en los servicios que lo permiten; lo ves al reservar. | Yes, for the services that allow it; you see it when booking.") },
    { q: bi("¿Se guarda lo que cuento? | Is what I share kept private?"), a: bi("Tu cita no dice el trámite. Lo que cuentas en la consulta es confidencial. | Your booking does not state the matter. What you share in the consultation is confidential.") },
    { q: bi("¿Dónde pago? | Where do I pay?"), a: bi("En la oficina. La app no cobra tarjetas por estos servicios, y lo del gobierno lo pagas tú directamente. | At the office. The app does not charge cards for these services, and the government fee you pay directly.") },
  ].slice(0, r.int(4, 5));

  // historia: consultas y su desenlace (el total por escrito)
  const tam = r.weighted([[1, 3], [2, 4], [3, 3]]);
  const N = { 1: r.int(35, 60), 2: r.int(65, 110), 3: r.int(115, 170) }[tam];
  b.totales = [];
  const fijos = b.items.filter((x) => x.kind === "fijo" || x.kind === "cotiza");
  const elegir = (bb, rr) => ({ item: rr.weighted(b.items.map((x) => [x, x.kind === "cons" ? 4 : x.kind === "fijo" ? 3 : 1])), mi: rr.weighted(b.members.map((m, mi) => [mi, m.takes ? (mi === 0 ? 1.5 : 1) : 0]).filter((z) => z[1] > 0)) });
  const detalle = (bb, item, M, rr, ctx) => {
    const modo = item.attrs.rem && rr.chance(0.35) ? rr.pick(["video", "telefono"]) : "oficina";
    const total = item.kind === "cons" || item.kind === "walk" ? item.price : 0;
    const P = precioPro(item);
    return { det: { rubro: "pro", legal: true, svc: item.name, k: item.kind, modo, sms: true, cualquiera: false, precio: P, honorario: item.price, gov: item.gov, cred: !!item.attrs.cred, hrs: item.attrs.hrs ?? null }, sub: total, tot: total, dur: Math.max(15, item.dur) };
  };
  const final = (o, rr, ctx) => {
    const item = ctx.item;
    const reciente = diaN(HOY) - diaN(ctx.dia) <= 24;
    if (ctx.futura || o.st === "cancelled" || (o.st === "done" && o.sd === "noshow")) return;
    // qué se contrata: la consulta lleva a un trámite; un trámite fijo se contrata directo
    const cont = item.kind === "cons" || item.kind === "walk" ? (fijos.length ? rr.pick(fijos) : null) : item;
    const resultado = !cont ? "solo" : rr.weighted([["hired", item.kind === "cons" ? 40 : 82], ["nohire", item.kind === "cons" ? 44 : 10], ["solo", item.kind === "cons" ? 16 : 8]]);
    const fee0 = cont ? (cont.kind === "cotiza" ? Math.round((cont.price * (0.85 + rr() * 0.4)) / 10000) * 10000 : cont.price) : 0;
    const fee = Math.max(10000, fee0), gov = cont ? cont.gov : 0, credit = item.kind === "cons" && item.attrs.cred ? Math.min(fee, item.price) : 0;
    const extras = rr.chance(0.3) ? [rr.pick([{ name: bi("Traducción de documentos | Document translation"), cents: 4500 }, { name: bi("Entrega urgente | Rush delivery"), cents: 6000 }, { name: bi("Copias certificadas | Certified copies"), cents: 2500 }])] : [];
    const dia1 = sumaDias(ctx.dia, rr.int(0, 2));
    const tot0 = { i: o.i, fee, gov, credit, hours: cont?.attrs.hrs ?? null, extras, note: null, cat: ts(dia1, 720 + rr.int(0, 300)) };
    if (reciente && resultado !== "solo" && o.st === "done" && rr.chance(0.7)) {
      // el desenlace sigue abierto: confirmada, con el total mandado o aceptado
      o.st = "confirmed"; o.done = null; o.sd = rr.chance(0.5) ? "quote" : "hired";
      if (o.sd === "quote") b.totales.push({ ...tot0, status: "sent", xok: [], aat: null });
      else { const xo = extras.length && rr.chance(0.6) ? [0] : []; b.totales.push({ ...tot0, status: "accepted", xok: xo, aat: ts(sumaDias(dia1, 1), 900) }); o.tot = fee - credit + xo.reduce((s, i) => s + extras[i].cents, 0); o.sub = o.tot; }
      ctx.hecha && (ctx.hecha.abierta = true);
      return;
    }
    if (reciente && resultado === "solo" && o.st === "done") { o.st = "confirmed"; o.done = null; o.sd = "consulted"; return; }
    if (resultado === "hired") {
      const fin = sumaDias(ctx.dia, rr.int(5, 55)), finOk = diaN(fin) < diaN(HOY) ? fin : sumaDias(HOY, -1);
      const xo = extras.length && rr.chance(0.6) ? [0] : [];
      o.done = ts(finOk, rr.int(600, 1000)); o.sd = "done";
      const tot = fee - credit + xo.reduce((s, i) => s + extras[i].cents, 0);
      o.tot = tot; o.sub = tot;
      b.totales.push({ ...tot0, status: "accepted", xok: xo, aat: ts(sumaDias(dia1, 1), 900) });
      ctx.hecha.dia = finOk; ctx.hecha.total = tot; ctx.hecha.hired = true;
    } else if (resultado === "nohire") {
      const venc = rr.chance(0.4);
      const fin = venc ? sumaDias(dia1, 8) : sumaDias(dia1, rr.int(1, 5)), finOk = diaN(fin) < diaN(HOY) ? fin : sumaDias(HOY, -1);
      o.done = ts(finOk, rr.int(600, 1000)); o.sd = "nohire";
      b.totales.push({ ...tot0, status: venc ? "expired" : "declined", xok: [], aat: null });
      ctx.hecha.dia = finOk; ctx.hecha.total = fee - credit + gov; ctx.hecha.hired = false;
    } else { ctx.hecha.hired = false; }
  };
  const precioPro = (it) => {
    if (it.kind === "fijo") return it.gov ? { es: `${usd(it.price + it.gov)} · HONORARIO ${usd(it.price)} + GOBIERNO ${usd(it.gov)}`, en: `${usd(it.price + it.gov, false)} · FEE ${usd(it.price, false)} + GOVERNMENT ${usd(it.gov, false)}` } : { es: usd(it.price), en: usd(it.price, false) };
    if (it.kind === "cons") return it.price ? { es: `${usd(it.price)} · ${it.attrs.cred ? "SE DESCUENTA SI LO CONTRATAS" : "CONSULTA"}`, en: `${usd(it.price, false)} · ${it.attrs.cred ? "CREDITED IF YOU HIRE" : "CONSULTATION"}` } : { es: "Gratis · CONSULTA GRATIS", en: "Free · FREE CONSULTATION" };
    if (it.kind === "hora") return { es: `${usd(it.price)}/hora · ESTIMADO ${it.attrs.hrs} H`, en: `${usd(it.price, false)}/hour · ESTIMATED ${it.attrs.hrs} H` };
    if (it.kind === "cotiza") return { es: `Desde ${usd(it.price)} · TOTAL POR ESCRITO EN LA CONSULTA`, en: `From ${usd(it.price, false)} · TOTAL IN WRITING AT THE CONSULTATION` };
    return { es: usd(it.price), en: usd(it.price, false) };
  };
  const { ops, hechas } = citasHistoria(b, r, { N, proximas: r.int(3, 6), hooks: { elegir, detalle, final } });
  b.ops = ops;
  // las consultas que ya no son «hechas» (siguen abiertas) no se reseñan
  const cerradas = hechas.filter((h) => !h.abierta && h.o.st === "done" && h.o.sd !== "noshow");
  const rv = resenas(b, cerradas, BANCO, r, { min: 20, max: 56 });
  b.reviews = rv.reseñas; b.helpful = rv.util;
  b.posts = novedades(b, NOV, r, { n: r.int(6, 9) });
  b.follows = seguidores(b, r);
  return b;
}

export function todos(inicio = 100) {
  reiniciarIds();
  const L = [];
  for (let si = 0; si < SUBS.length; si++) for (let k = 0; k < 10; k++) L.push(construir(si, k, inicio + si * 10 + k));
  return L;
}
