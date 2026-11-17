// NEG-EDU · 5 subcategorías principales: clases de inglés, clases de español, práctica de conversación, preparación para ciudadanía, GED.
import { rng, bi, usd, addDays, withTime, ymd, ANCHOR_D, H, horario, s, n, j, CIUDADES } from "./comun.mjs";
import { negociosBase, fichaComun, novedades, ponerResenas, cicloClientes } from "./base.mjs";
import { sqlItems } from "./items.mjs";
import { cohortes, matriculas, sqlGrupos, sqlGrupoDeMatricula } from "./grupos.mjs";

export const SUBS = [
  { id: "NEG-EDU-01", es: "Clases de inglés", en: "English classes", also: "NEG-EDU-03", names: ["Academia Puente al Inglés", "Inglés para Todos Hazleton", "Escuela Nuevo Horizonte", "Habla Inglés Ya", "Centro de Inglés La Esperanza", "Academia Luz del Idioma", "Instituto Mi Segundo Idioma", "Inglés Paso a Paso", "Escuela Camino Abierto", "Academia Inglés en Familia"] },
  { id: "NEG-EDU-02", es: "Clases de español", en: "Spanish classes", also: null, names: ["Español con Corazón", "Academia Voces Latinas", "Escuela de Español Mi Lengua", "Hablemos Español", "Instituto Cervantes del Valle", "Español Vivo Escuela", "Casa del Idioma Español", "Aula Latina de Español", "Español Sin Fronteras", "Academia Ñ"] },
  { id: "NEG-EDU-03", es: "Práctica de conversación en inglés", en: "English conversation practice", also: "NEG-EDU-01", names: ["Club Conversemos en Inglés", "Habla y Escucha Club", "Café de Conversación", "Charla Inglesa Club", "Mesa Redonda de Inglés", "Conversa Conmigo Inglés", "Rincón del Inglés", "Práctica Viva de Inglés", "Club de Voz Inglés", "Inglés al Hablar"] },
  { id: "NEG-EDU-04", es: "Preparación para ciudadanía", en: "Citizenship preparation", also: "NEG-EDU-01", names: ["Centro Ciudadanía Paso Firme", "Camino a la Ciudadanía", "Academia Nuevo Ciudadano", "Preparación Cívica del Valle", "Juramento Listo Academia", "Estrella y Raya Preparación", "Mi Ciudadanía Centro", "Aula Cívica Latina", "Meta Ciudadanía Academia", "Examen Seguro Ciudadanía"] },
  { id: "NEG-EDU-05", es: "GED y preparatoria abierta", en: "GED and adult high school", also: "NEG-EDU-06", names: ["Academia GED Horizonte", "Diploma en Marcha GED", "Segunda Oportunidad Escuela", "Centro GED Siempre Adelante", "Prepa Abierta del Valle", "Meta Diploma Academia", "Aula GED Familia", "Camino al Diploma", "GED Fácil Escuela", "Nuevo Comienzo GED"] },
];

const inc = (...a) => a.map((x) => bi(x[0], x[1]));
const C = (alts, descr, cents, sem, horas, dep, extra = {}) => ({ alts, descr, cents, sem, horas, dep, ...extra });
/* [nombre es/en alternos, descripción, precio, semanas, horas, matrícula, extras{plan, cert, oficial, inc, no, dows, min}] */
const CAT = {
  "NEG-EDU-01": { cursos: [
    C([["Inglés nivel 1 · principiantes", "English level 1 · beginners"], ["Inglés para principiantes", "English for beginners"]], ["Para empezar desde cero: saludos, trabajo, compras y la doctora.", "Start from zero: greetings, work, shopping and the doctor."], 24000, 10, 30, 4000, { plan: 3, dows: [2, 4], min: 1080, beginner: true, inc: inc(["Libro del curso", "Course book"], ["Examen de nivel", "Placement test"]) }),
    C([["Inglés nivel 2", "English level 2"], ["Inglés nivel 2 · básico", "English level 2 · basic"]], ["Conversación diaria, tiempos pasado y futuro, y lectura de formularios.", "Everyday conversation, past and future tenses, and reading forms."], 26000, 10, 30, 4000, { plan: 3, dows: [1, 3], min: 1110 }),
    C([["Inglés nivel 3 · intermedio", "English level 3 · intermediate"]], ["Para hablar con confianza en el trabajo y en la escuela de tus hijos.", "To speak with confidence at work and at your kids' school."], 28000, 10, 30, 5000, { plan: 3, dows: [2, 4], min: 1140 }),
    C([["Inglés para el trabajo", "English for work"]], ["Vocabulario de fábricas, almacenes, restaurantes y construcción.", "Vocabulary for factories, warehouses, restaurants and construction."], 19000, 6, 18, 3000, { dows: [6], min: 600, inc: inc(["Material impreso", "Printed material"]) }),
  ], mes: [["Conversación semanal", "Weekly conversation", "Una hora cada semana para practicar con tu grupo.", "One hour a week to practice with your group.", 6000]] },
  "NEG-EDU-02": { cursos: [
    C([["Español para principiantes", "Spanish for beginners"]], ["Para hablar desde la primera clase: saludos, familia, comida y viajes.", "Speak from the first class: greetings, family, food and travel."], 26000, 10, 30, 4000, { plan: 3, dows: [2, 4], min: 1080, beginner: true, inc: inc(["Libro del curso", "Course book"]) }),
    C([["Español para el trabajo en salud", "Spanish for healthcare work"]], ["Frases para pacientes, citas y emergencias. Para enfermeras y recepción.", "Phrases for patients, appointments and emergencies. For nurses and front desk."], 22000, 8, 24, 3500, { dows: [1, 3], min: 1110 }),
    C([["Español para viajeros", "Spanish for travelers"]], ["Cuatro semanas para defenderte en tu próximo viaje.", "Four weeks to get by on your next trip."], 12000, 4, 12, 2500, { dows: [6], min: 600 }),
    C([["Español para familias", "Spanish for families"]], ["Papás y niños aprenden juntos con juegos y canciones.", "Parents and kids learn together with games and songs."], 18000, 8, 16, 3000, { dows: [6], min: 660 }),
  ], mes: [["Club de español", "Spanish club", "Charla en español cada semana, para todos los niveles.", "Spanish chat every week, for all levels.", 5500]] },
  "NEG-EDU-03": { cursos: [
    C([["Conversación en seis semanas", "Six-week conversation"]], ["Pierde el miedo a hablar: grupos pequeños y mucha práctica.", "Lose the fear of speaking: small groups and lots of practice."], 12000, 6, 12, 2000, { dows: [2], min: 1110, beginner: true }),
    C([["Pronunciación y acento", "Pronunciation and accent"]], ["Sonidos que cuestan más al hispanohablante y cómo practicarlos.", "Sounds that are hardest for Spanish speakers and how to practice."], 14000, 6, 12, 2000, { dows: [4], min: 1110 }),
    C([["Inglés para entrevistas de trabajo", "English for job interviews"]], ["Preguntas típicas, cómo presentarte y practicar con simulacros.", "Typical questions, how to introduce yourself and mock interviews."], 11000, 4, 8, 2000, { dows: [6], min: 600 }),
  ], mes: [["Club de conversación", "Conversation club", "Un encuentro semanal con café para hablar inglés.", "A weekly meeting with coffee to speak English.", 4500], ["Conversación para mamás", "Conversation for moms", "Mientras los niños juegan cerca, practicas inglés.", "While the kids play nearby, you practice English.", 4000]] },
  "NEG-EDU-04": { cursos: [
    C([["Preparación para la entrevista de ciudadanía", "Citizenship interview preparation"]], ["Las 100 preguntas de cívica, lectura y escritura en inglés, y una entrevista de práctica.", "The 100 civics questions, reading and writing in English, and a practice interview."], 28000, 8, 24, 5500, { plan: 3, dows: [2, 4], min: 1110, inc: inc(["Libro de cívica", "Civics book"], ["Entrevista de práctica", "Practice interview"]), no: inc(["El formulario N-400 y la tarifa del gobierno no están incluidos. No damos asesoría legal.", "The N-400 form and government fee are not included. We do not give legal advice."]) }),
    C([["Repaso de las 100 preguntas", "Review of the 100 questions"]], ["Tres semanas de repaso intensivo antes de tu cita.", "Three weeks of intensive review before your appointment."], 9000, 3, 9, 1500, { dows: [6], min: 600 }),
    C([["Inglés para la entrevista", "English for the interview"]], ["Lectura y escritura de las oraciones que pide la entrevista.", "Reading and writing the sentences the interview asks for."], 15000, 6, 12, 2500, { dows: [1, 3], min: 1110, beginner: true }),
  ], mes: [["Clase de repaso semanal", "Weekly review class", "Repaso semanal de cívica y de inglés para tu entrevista.", "Weekly civics and English review for your interview.", 5000]] },
  "NEG-EDU-05": { cursos: [
    C([["GED · Matemáticas", "GED · Math"]], ["Álgebra, geometría y razonamiento. Examen de práctica cada mes.", "Algebra, geometry and reasoning. Practice test every month."], 32000, 12, 36, 5000, { plan: 3, dows: [1, 3], min: 1110, inc: inc(["Libro de práctica", "Practice book"], ["Examen de práctica mensual", "Monthly practice test"]), no: inc(["El examen oficial del GED se paga aparte.", "The official GED exam is paid separately."]) }),
    C([["GED · Lenguaje y escritura", "GED · Language and writing"]], ["Lectura, gramática y el ensayo que pide el examen.", "Reading, grammar and the essay the exam asks for."], 30000, 12, 36, 5000, { plan: 3, dows: [2, 4], min: 1110, no: inc(["El examen oficial del GED se paga aparte.", "The official GED exam is paid separately."]) }),
    C([["GED · Ciencias y estudios sociales", "GED · Science and social studies"]], ["Ciencias, historia y gobierno con ejemplos de la vida diaria.", "Science, history and government with everyday examples."], 30000, 12, 36, 5000, { plan: 3, dows: [6], min: 600, no: inc(["El examen oficial del GED se paga aparte.", "The official GED exam is paid separately."]) }),
    C([["GED paquete completo", "GED full package"]], ["Las cuatro materias en 16 semanas, con tutor y exámenes de práctica.", "All four subjects in 16 weeks, with a tutor and practice tests."], 78000, 16, 90, 8000, { plan: 3, dows: [1, 3], min: 1080, inc: inc(["Tutor asignado", "Assigned tutor"], ["Exámenes de práctica", "Practice tests"]), no: inc(["El examen oficial del GED se paga aparte.", "The official GED exam is paid separately."]) }),
  ], mes: [["Tutoría semanal de GED", "Weekly GED tutoring", "Una hora de tutoría cada semana, en la materia que más te cuesta.", "One hour of tutoring each week, in the subject you find hardest.", 7000]] },
};

const P = {
  pos: { es: ["La maestra explica con paciencia y el grupo es pequeño, así que sí se aprende.", "Empecé sin saber nada y en pocas semanas ya me defendía en el trabajo.", "Los horarios de la noche me sirvieron mucho porque trabajo de día.", "Me dieron el libro y un plan de pagos, y el total fue el que me dijeron desde el principio.", "El ambiente es muy amable; nadie se burla cuando uno se equivoca.", "Me inscribí desde la app, pagué la matrícula y el primer día ya tenía mi lugar.", "Los ejercicios son útiles y la maestra devuelve las tareas corregidas.", "Mi esposo y yo tomamos el curso juntos y lo recomendamos a todos en la iglesia."], en: ["The teacher explains patiently and the group is small, so you really learn.", "I started knowing nothing and within weeks I could manage at work.", "The evening schedule helped a lot because I work during the day.", "They gave me the book and a payment plan, and the total was the one they told me at the start.", "The atmosphere is very friendly; nobody laughs when you make a mistake.", "I enrolled from the app, paid the fee and on day one I already had my seat.", "The exercises are useful and the teacher returns homework corrected.", "My husband and I took the course together and recommend it to everyone."] },
  mid: { es: ["El curso está bien, pero el grupo era más grande de lo esperado.", "Buena maestra; el horario cambió una vez sin mucho aviso.", "Aprendí, aunque hubiera querido más práctica de conversación."], en: ["The course is good, but the group was larger than expected.", "Good teacher; the schedule changed once without much notice.", "I learned, although I would have liked more speaking practice."] },
  neg: { es: ["Cambiaron el horario y no pude seguir; la devolución tardó.", "El grupo se llenó y la maestra no alcanzaba a atender a todos.", "Esperaba más material de lo que recibí."], en: ["They changed the schedule and I could not continue; the refund took a while.", "The group filled up and the teacher could not attend to everyone.", "I expected more material than what I received."] },
  cierre: { es: ["Los recomiendo.", "Gracias, maestra.", "Voy a tomar el siguiente nivel."], en: ["I recommend them.", "Thank you, teacher.", "I will take the next level."] },
  cierreNeg: { es: ["Ojalá lo mejoren.", "", ""], en: ["I hope they improve this.", "", ""] },
  faqs: [
    { q: bi("¿Cómo me inscribo?", "How do I enroll?"), a: bi("Elige el grupo, paga la matrícula en la app y el resto en la escuela. La inscripción es tuya cuando la escuela la confirma.", "Pick the group, pay the enrollment fee in the app and the rest at the school. The seat is yours once the school confirms it.") },
    { q: bi("¿Hay plan de pagos?", "Is there a payment plan?"), a: bi("En los cursos largos puedes pagar el resto en 3 partes. Lo ves antes de confirmar.", "On longer courses you can pay the rest in 3 installments. You see it before confirming.") },
    { q: bi("¿Qué pasa si falto o el grupo se cancela?", "What if I miss class or the group is canceled?"), a: bi("Si la escuela cancela el grupo, se devuelve la matrícula completa. Si faltas, te damos el material de esa clase.", "If the school cancels the group, the enrollment fee is refunded in full. If you miss class, we give you that class's material.") },
    { q: bi("¿Dan certificado?", "Do you give a certificate?"), a: bi("Damos una constancia de asistencia. No es un título oficial del estado.", "We give a certificate of attendance. It is not an official state degree.") },
    { q: bi("¿Puedo ir con mi esposo o esposa?", "Can I come with my spouse?"), a: bi("Claro. Cada persona se inscribe por separado, y a veces hay descuento para dos.", "Of course. Each person enrolls separately, and sometimes there is a two-person discount.") },
    { q: bi("¿Hay clases de noche o fin de semana?", "Are there evening or weekend classes?"), a: bi("Sí, tenemos grupos entre semana de noche y los sábados en la mañana.", "Yes, we have weekday evening groups and Saturday mornings.") },
  ],
  team: [
    { role: bi("Maestra principal", "Lead teacher"), bio: bi("Enseña los grupos de la noche.", "Teaches the evening groups."), spec: [bi("Adultos", "Adults")] },
    { role: bi("Maestro", "Teacher"), bio: bi("Enseña los grupos de los sábados.", "Teaches the Saturday groups."), spec: [bi("Conversación", "Conversation")] },
    { role: bi("Coordinadora de inscripciones", "Enrollment coordinator"), bio: bi("Te ayuda a escoger el grupo y el pago.", "Helps you choose the group and payment."), spec: [] },
    { role: bi("Tutor de apoyo", "Support tutor"), bio: bi("Repasa contigo lo que no entendiste.", "Reviews with you what you did not understand."), spec: [] },
  ],
  posts: [
    { kind: "novedad", title: "Nuevo grupo de noche abierto", body: "Hay lugar en el grupo que empieza pronto. Inscríbete desde la ficha." },
    { kind: "novedad", title: "Ya tenemos plan de pagos", body: "En los cursos largos, paga la matrícula en la app y el resto en tres partes." },
    { kind: "encuesta", title: "¿En qué horario prefieres estudiar?", body: "Queremos abrir más grupos.", poll: ["Noche entre semana", "Sábado en la mañana", "Tarde entre semana", "En línea"] },
    { kind: "oferta", slot: "curso", off: 0.1, title: "Descuento si vienes con un familiar", body: "Inscríbete con tu esposo, esposa o hijo mayor y ahorra en el curso." },
    { kind: "novedad", title: "Libros nuevos para este semestre", body: "Estrenamos libros y ejercicios con audios para practicar en casa." },
    { kind: "novedad", title: "Gracias a nuestros graduados", body: "Otro grupo terminó su curso. Gracias por la confianza." },
    { kind: "novedad", title: "Cerramos por feriado", body: "No habrá clases ese día; se reponen la semana siguiente." },
    { kind: "novedad", title: "Examen de nivel gratis", body: "Si no sabes en qué nivel empezar, haz el examen de nivel sin costo." },
  ],
};

export function generar() {
  const negocios = negociosBase("EDU", "NEG-EDU", SUBS, {
    ficha(b, S, r) {
      const cat = CAT[S.id], m = 0.88 + r.f() * 0.28, items = []; let k = 0;
      const nCursos = r.i(3, cat.cursos.length), cursos = cat.cursos.slice(0, cat.cursos.length).sort(() => r.f() - 0.5).slice(0, nCursos);
      if (!cursos.some((c) => c.dows[0] !== 6)) cursos[0] = cat.cursos[0];
      cursos.forEach((cu, ix) => {
        const nm = r.pick(cu.alts), cents = Math.round((cu.cents * m) / 500) * 500, dep = Math.min(cents - 500, Math.round((cu.dep * m) / 500) * 500);
        const a = { sem: cu.sem, horas: cu.horas, dep, ...(cu.plan ? { plan_n: cu.plan } : {}), ...(cu.inc ? { inc: cu.inc } : {}), ...(cu.no ? { no: cu.no } : {}) };
        items.push({ sec: bi("Cursos", "Courses"), secSort: 0, name: bi(nm[0], nm[1]), descr: bi(cu.descr[0], cu.descr[1]), cents, dur: 60, kind: "curso", attrs: a, pfrom: false, photo: b.pics[k % b.pics.length], sort: k++, dep, curso: { sem: cu.sem, dows: cu.dows, min: cu.min, beginner: !!cu.beginner } });
      });
      const mes = r.chance(0.75) ? r.pick(cat.mes) : null;
      if (mes) items.push({ sec: bi("Clases por mes", "Monthly classes"), secSort: 1, name: bi(mes[0], mes[1]), descr: bi(mes[2], mes[3]), cents: Math.round((mes[4] * m) / 500) * 500, dur: 60, kind: "mes", attrs: { g1: true, inc: inc(["Primera clase gratis", "First class free"]) }, pfrom: false, photo: b.pics[k % b.pics.length], sort: k++, dep: 0, mes: { dows: r.pick([[2], [4], [6], [1]]), min: r.pick([1080, 1110, 600]) } });
      b.items = items;
      const lin = r.chance(0.3), hib = !lin && r.chance(0.15);
      b.edu = { linea: lin, hibrido: hib, esp: true, reply: r.pick([12, 24, 24, 48]) };
      b.radius = null; b.fromHome = false; b.languages = r.chance(0.6) ? ["es", "en"] : ["es"];
      const queEs = S.es.toLowerCase(), queEn = S.en.toLowerCase();
      b.about = bi(`${b.name} ofrece ${queEs} en ${CIUDADES[b.city].n} desde ${b.founded}. Grupos pequeños, maestros que hablan tu idioma y horarios de noche y fin de semana para quienes trabajan. Te inscribes desde la app y pagas la matrícula allí; el resto, en la escuela${items.some((x) => x.attrs.plan_n) ? " o en tres pagos" : ""}.${S.id === "NEG-EDU-04" ? " No damos asesoría legal." : ""}`, `${b.name} offers ${queEn} in ${CIUDADES[b.city].n} since ${b.founded}. Small groups, teachers who speak your language and evening and weekend schedules for people who work. You enroll in the app and pay the fee there; the rest at the school${items.some((x) => x.attrs.plan_n) ? " or in three payments" : ""}.${S.id === "NEG-EDU-04" ? " We do not give legal advice." : ""}`);
      b.amenities = [...(items.some((x) => x.attrs.plan_n) ? ["plan-de-pagos"] : []), "acepta-tarjeta", ...(r.chance(0.5) ? ["estacionamiento"] : []), ...(lin || hib ? ["en-linea"] : [])].filter(Boolean);
      b.hours = horario(r.chance(0.6) ? H.lunSabCorto("09:00", "21:00", "09:00", "14:00").map((x, i) => (i === 0 ? null : x)) : H.lunSab("14:00", "21:30").map((x, i) => (i === 0 ? null : x)));
      const fv = ["esp", "presencial"]; if (cursos.some((c) => c.beginner)) fv.push("princ"); if (b.founded <= 2016) fv.push("y10"); if (lin) fv.push("linea"); if (hib) fv.push("hibrido"); b.filters = fv;
      b.modules = ["svc"]; b.licenses = [];
      const pr = items.find((x) => x.kind === "curso"); b.attrs = { m: "shop", tarjeta: { fee: bi(`${pr.name.es} ${usd(pr.cents)}${items.some((x) => x.attrs.plan_n) ? " · plan de pagos" : ""}`, `${pr.name.en} ${usd(pr.cents)}${items.some((x) => x.attrs.plan_n) ? " · payment plan" : ""}`) } };
      fichaComun(b, P);
    },
  });
  for (const b of negocios) novedades(b, P, b.items.map((x) => ({ name: x.name.es, cents: x.cents, kind: x.kind })));

  const ops = [], grupos = [], seq = { n: 0 };
  for (const b of negocios) {
    const r = rng(`ops:${b.id}`), next = cicloClientes(r), target = Math.round(22 + b.vol * b.vol * 56);
    const cur = b.items.filter((x) => x.kind === "curso"), mes = b.items.filter((x) => x.kind === "mes");
    const porCurso = Math.max(4, Math.round((target * 1.9) / (Math.max(1, cur.length) * 6.5)));
    const gs = cohortes(r, Math.max(2016, b.founded), cur.map((c) => ({ name: c.name.es, sem: c.curso.sem, dows: c.curso.dows, min: c.curso.min, dur: 90, seats: r.i(8, 16) })), porCurso);
    for (const m of mes) gs.push({ ix: 99, item: m.name.es, starts: addDays(ANCHOR_D, -r.i(120, 900)), ends: null, dows: m.mes.dows, min: m.mes.min, dur: 60, seats: r.i(10, 16), estado: "started", label: bi("Grupo semanal", "Weekly group"), booked: 0 });
    gs.forEach((g) => (g.b = b.id));
    const itemOf = (g) => b.items.find((x) => x.name.es === g.item);
    const os = matriculas(r, b, gs, next, seq, {
      num: 7300000 + 20000 * Math.floor(b.gi / 10), fill: [[0.45, 0.9], [0.2, 0.6]],
      item: (g) => { const it = itemOf(g); return { name: it.name.es, lname: it.name, cents: it.cents, kind: it.kind, attrs: it.attrs }; },
      mat: (g, it) => (it.kind === "curso" ? it.attrs.dep : 0),
      det: (g, c, it, mat) => ({ rubro: "edu", k: it.kind, item_id: null, svc: it.lname, group_id: null, band_id: null, group: g.label, starts_on: ymd(g.starts), ends_on: g.ends ? ymd(g.ends) : null, start_min: g.min, dows: g.dows, for: "yo", guardian_ok: false, level: null, team_name: null, price_cents: it.cents, mat_cents: it.kind === "curso" ? mat : 0, mat_app: mat, plan_n: it.attrs.plan_n || null, cert: null, cert_by: null, oficial: false, no: it.attrs.no || [], contract_m: 0, cancel_fee_cents: 0, g1: it.kind === "mes", sms: true, neutro: false, cuidado: false }),
    });
    ops.push(...os); grupos.push(...gs);
    ponerResenas(r, P, (rr, st) => ({ totalOk: st >= 3 ? 1 : 0, horarioOk: st >= 3 ? 1 : 0, trato: st >= 4 ? 1 : st === 3 ? 0 : -1, certOk: st >= 4 ? 1 : 0, explican: st >= 4 ? 1 : st === 3 ? 0 : -1, aprendio: st >= 4 ? 1 : st === 3 ? 0 : -1 }), os, target);
  }
  const extra = [...sqlItems(negocios)];
  extra.push(`insert into insc_settings (business_id, city_id, rubro, how_presencial, how_linea, how_hibrido, esp, reply_h)
select x.b, bz.city_id, 'edu', true, x.l, x.h, true, x.rh from (values ${negocios.map((b) => `(${s(b.id)}, ${b.edu.linea}, ${b.edu.hibrido}, ${b.edu.reply})`).join(", ")}) x(b, l, h, rh) join businesses bz on bz.id = x.b
on conflict (business_id) do nothing;`);
  extra.push(...sqlGrupos(negocios, grupos));
  const after = sqlGrupoDeMatricula(ops);
  return { negocios, ops, extra, after, cat: "NEG-EDU", file: "demo-d-edu.sql" };
}
