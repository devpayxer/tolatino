/* NEG-SALUD · 5 subcategorías principales (las 5 primeras del catálogo por `sort`): medicina general, clínica sin cita y urgencias, clínica comunitaria
   de bajo costo, pediatría, ginecología y obstetricia. 10 negocios cada una. Sin datos médicos en el texto público (guardián privacidadSalud):
   las reseñas y los avisos hablan del trato, el tiempo y el precio; nunca de un diagnóstico. */
import { usd, HOY } from "./comun.mjs";
import { crear, poner, horario, persona, precio, bi, reiniciarIds, rolGenero } from "./negocio.mjs";
import { citasHistoria } from "./citas.mjs";
import { resenas, novedades, seguidores } from "./historia.mjs";

const CAT = "NEG-SALUD";
const S = (sec, es, en, de, dn, p, d, k, o = {}) => ({ sec, es, en, de, dn, p, d, k, core: !!o.core, esc: !!o.esc, fisica: !!o.fisica });
const SEGURO = { medicaid: "Medicaid", medicare: "Medicare", chip: "CHIP", ccbh: "Community Care", highmark: "Highmark", geisinger: "Geisinger Health Plan", upmc: "UPMC", aetna: "Aetna", cigna: "Cigna", uhc: "UnitedHealthcare", delta: "Delta Dental", vsp: "VSP", eyemed: "EyeMed" };
const SEG_PUB = ["medicaid", "medicare", "chip"];

const SUBS = [
  {
    sub: "NEG-SALUD-01", tipo: "general", nombres: ["Centro Médico Familiar Luz de Vida", "Clínica Salud para Todos", "Consultorio Dr. Almonte y Asociados", "Medicina Familiar del Valle", "Centro de Salud Buen Samaritano", "Clínica Familiar La Esperanza del Barrio", "Consultorio Médico San Rafael", "Centro Médico Tres Palmas", "Doctores del Pueblo", "Clínica Vida y Salud Latina"],
    secs: ["Consultas | Visits", "Prevención | Prevention", "Por video | Video"],
    svc: [
      S(0, "Consulta de medicina general", "Primary care visit", "Te ve un médico o una enfermera practicante. Trae tu seguro o tu identificación.", "A doctor or nurse practitioner sees you. Bring your insurance or ID.", 8500, 25, "cons", { core: true }),
      S(0, "Cita el mismo día", "Same-day visit", "Hay espacios cada mañana para quien no puede esperar.", "There are openings every morning for those who cannot wait.", 9500, 20, "cons"),
      S(1, "Chequeo anual", "Annual checkup", "Examen completo y análisis básicos. Con Medicaid o Medicare no pagas.", "Full exam and basic labs. With Medicaid or Medicare you pay nothing.", 0, 40, "free", { core: true }),
      S(1, "Vacunas", "Vaccines", "Gripe, niños y adultos. Gratis con tu seguro.", "Flu, kids and adults. Free with your insurance.", 0, 10, "free", { core: true }),
      S(1, "Examen físico para trabajo o escuela", "Work or school physical", "Con el formulario lleno el mismo día.", "With the form filled out the same day.", 6000, 25, "proc", { fisica: true }),
      S(1, "Análisis de sangre básicos", "Basic blood work", "Con orden médica, resultados en un par de días.", "With a doctor's order, results in a couple of days.", 4500, 15, "proc"),
      S(2, "Consulta por video", "Video visit", "Hoy mismo, desde tu teléfono. Para recetas y resultados.", "Same day, from your phone. For refills and results.", 5500, 15, "tele", { core: true }),
    ],
    about: [["Centro médico familiar en {c} desde {y}. {o} y su equipo atienden a toda la familia en español e inglés: chequeos, vacunas, seguimiento de tu salud y recetas. Aceptamos Medicaid, Medicare y muchos seguros; sin seguro, precio fijo.", "Family medical center in {c} since {y}. {o} and the team see the whole family in Spanish and English: checkups, vaccines, ongoing care and prescriptions. We take Medicaid, Medicare and many plans; without insurance, a flat price."],
      ["Desde {y} en {st}, un consultorio donde te explican todo con calma. Médicos y enfermeras que hablan tu idioma, intérprete si lo necesitas y citas el mismo día.", "Since {y} on {st}, a clinic where everything is explained calmly. Doctors and nurses who speak your language, an interpreter if you need one, and same-day visits."],
      ["{n} abrió en {y} para que las familias de {c} tengan un médico de cabecera. Horario de tarde y sábados para que no pierdas el trabajo.", "{n} opened in {y} so {c} families have a primary doctor. Evening and Saturday hours so you do not miss work."]],
    horas: (r) => [null, [480, 1020], [480, 1020], [480, 1080], [480, 1020], [480, 960], r.chance(0.6) ? [540, 780] : null],
    faqs: [["¿Aceptan mi seguro? | Do you take my insurance?", "Aceptamos Medicaid, Medicare, CHIP y varios seguros privados; la lista está en la ficha. Si no sabes, llama y lo revisamos contigo. | We take Medicaid, Medicare, CHIP and several private plans; the list is on this page. If you are not sure, call and we will check with you."],
      ["¿Qué pasa si no tengo seguro? | What if I have no insurance?", "Atendemos sin seguro con precio fijo; lo ves antes de reservar. | We see patients without insurance for a flat price you see before booking."],
      ["¿Hablan español? | Do you speak Spanish?", "Sí, el personal es bilingüe y hay intérprete cuando hace falta. | Yes, the staff is bilingual and an interpreter is available when needed."],
      ["¿Cómo cuido mi privacidad? | How do you protect my privacy?", "Tu cita no dice por qué vienes. Lo que cuentes en la consulta queda entre tú y el médico. | Your booking does not say why you come. What you share in the visit stays between you and the doctor."]],
  },
  {
    sub: "NEG-SALUD-02", tipo: "urgencias", nombres: ["Urgencias Express del Valle", "Clínica Sin Cita Rápida", "Care Ahora Urgent Care", "Urgencias Familiares 24 Horas del Pueblo", "Atención Inmediata Santa Clara", "Clínica de Urgencias El Buen Pastor", "Urgencias La Esquina", "Salud Ya Walk-In Clinic", "Urgencias Don Pedro", "Clínica Rápida Amanecer"],
    secs: ["Sin cita | Walk-in", "Pruebas y curaciones | Tests and care", "Por video | Video"],
    svc: [
      S(0, "Urgencia sin cita", "Walk-in urgent care", "Cortadas, torceduras, fiebre alta, infecciones. Llegas y te ponen en la fila.", "Cuts, sprains, high fever, infections. Walk in and join the line.", 12500, 30, "walk", { core: true }),
      S(0, "Examen físico para el trabajo", "Work physical", "El mismo día, con el formulario sellado.", "The same day, with your form stamped.", 6000, 25, "proc", { fisica: true }),
      S(1, "Rayos X", "X-ray", "El mismo día, leído por el médico.", "Same day, read by the doctor.", 9500, 20, "proc", { core: true }),
      S(1, "Prueba de COVID, gripe o estreptococo", "COVID, flu or strep test", "Resultado en 15 minutos.", "Result in 15 minutes.", 4500, 15, "proc", { core: true }),
      S(1, "Curación de heridas y puntos", "Wound care and stitches", "Limpieza, puntos y vacuna del tétanos si hace falta.", "Cleaning, stitches and tetanus shot if needed.", 15000, 30, "proc"),
      S(1, "Vacuna del tétanos", "Tetanus shot", "Sin cita, en 10 minutos.", "No appointment, 10 minutes.", 6500, 10, "proc"),
      S(2, "Consulta por video", "Video visit", "Hasta las 9 PM, también sábado y domingo.", "Until 9 PM, weekends too.", 5900, 15, "tele", { core: true }),
    ],
    about: [["Clínica de urgencias sin cita en {c} desde {y}. Atendemos cortadas, torceduras, fiebre, infecciones y pruebas rápidas, con rayos X en el lugar. Abrimos tarde y los fines de semana; sin seguro, precio fijo.", "Walk-in urgent care in {c} since {y}. We handle cuts, sprains, fever, infections and quick tests, with X-ray on site. Open late and weekends; no insurance, flat price."],
      ["{n}, en {st} desde {y}: llegas, te registras en la tablet y te vemos por orden. Hablamos español, aceptamos Medicaid y los principales seguros.", "{n} on {st} since {y}: walk in, check in on the tablet and be seen in order. We speak Spanish and take Medicaid and the major plans."],
      ["Urgencias de barrio. Desde {y} en {c}, con médico, rayos X y laboratorio rápido bajo el mismo techo.", "A neighborhood urgent care. Since {y} in {c}, with a doctor, X-ray and quick lab under one roof."]],
    horas: () => [[540, 1260], [480, 1260], [480, 1260], [480, 1260], [480, 1260], [480, 1260], [540, 1260]],
    faqs: [["¿Necesito cita? | Do I need an appointment?", "No. Llegas, te registras y te atienden por orden de llegada. También puedes reservar tu lugar en la app. | No. Walk in, check in and you are seen in order. You can also save your spot in the app."],
      ["¿Cuánto es la espera? | How long is the wait?", "Es de unos 20 a 40 minutos; la ficha muestra la espera de hoy. | Usually 20 to 40 minutes; this page shows today's wait."],
      ["¿Atienden sin seguro? | Do you see patients without insurance?", "Sí, con precio fijo que ves antes de ir. | Yes, at a flat price you see before going."],
      ["¿Qué hago en una emergencia grave? | What if it is a serious emergency?", "Llama al 911 o ve a la sala de emergencias. Esta clínica no reemplaza una emergencia. | Call 911 or go to the emergency room. This clinic does not replace emergency care."]],
  },
  {
    sub: "NEG-SALUD-03", tipo: "comunitaria", nombres: ["Clínica Comunitaria La Familia", "Centro de Salud del Pueblo", "Clínica Comunitaria Manos Unidas", "Salud para el Barrio", "Clínica Popular Padre Luis", "Centro Comunitario de Salud Esperanza", "Clínica Raíces", "Clínica Comunitaria Santa Teresa", "Casa de Salud Nuestra Gente", "Centro de Salud Vecinos Unidos"],
    secs: ["Consultas | Visits", "Ayuda y apoyo | Help and support", "Por video | Video"],
    svc: [
      S(0, "Consulta según tus ingresos", "Income-based visit", "Pagas de $20 a $60 según lo que ganas. No piden papeles ni seguro social.", "Pay $20 to $60 based on income. No papers or SSN required.", 2000, 20, "cons", { core: true, esc: true }),
      S(0, "Sin cita en la mañana", "Morning walk-in", "De 8 a 11 AM. Llegas temprano y te atienden por orden.", "8 to 11 AM. Come early and be seen in order.", 2000, 25, "walk", { core: true, esc: true }),
      S(0, "Planificación familiar", "Family planning", "Consulta y orientación, según tus ingresos.", "Visit and guidance, based on your income.", 2000, 30, "cons", { esc: true }),
      S(0, "Consejería de salud mental", "Counseling", "Hablas con una consejera en español. Según tus ingresos.", "You talk with a counselor in Spanish. Based on your income.", 2500, 45, "cons", { esc: true }),
      S(1, "Vacunas para niños y adultos", "Vaccines for kids and adults", "Gratis o a bajo costo.", "Free or low cost.", 0, 10, "free", { core: true }),
      S(1, "Ayuda para inscribirte a un seguro", "Help signing up for insurance", "Te acompañan con Medicaid, CHIP o el mercado de seguros.", "They walk you through Medicaid, CHIP or the marketplace.", 0, 30, "free", { core: true }),
      S(2, "Consulta por video", "Video visit", "Desde tu casa, según tus ingresos.", "From home, based on your income.", 2500, 20, "tele", { esc: true }),
    ],
    about: [["Clínica comunitaria en {c} desde {y}. Atendemos a toda persona, con o sin seguro, con o sin papeles: pagas según lo que ganas. Personal que habla español y un intérprete para otros idiomas.", "Community clinic in {c} since {y}. We see everyone, insured or not, with or without papers: you pay based on what you earn. Staff who speak Spanish and an interpreter for other languages."],
      ["{n} nació en {y} para que nadie en {c} se quede sin médico por no tener dinero. Consultas a bajo costo, vacunas y ayuda para inscribirte a un seguro.", "{n} began in {y} so that no one in {c} goes without a doctor for lack of money. Low-cost visits, vaccines and help signing up for insurance."],
      ["Desde {y} en {st}: salud al alcance de la comunidad. No pedimos seguro social ni identificación para atenderte.", "Since {y} on {st}: health care within the community's reach. We do not ask for a Social Security number or ID to see you."]],
    horas: () => [null, [480, 1020], [480, 1020], [480, 1020], [480, 1020], [480, 960], null],
    faqs: [["¿Cuánto pago? | How much do I pay?", "Depende de tus ingresos: entre $20 y $60 la consulta. Te lo decimos antes de reservar. | It depends on your income: $20 to $60 a visit. We tell you before you book."],
      ["¿Me piden papeles? | Do you ask for papers?", "No. No pedimos seguro social ni estatus migratorio para atenderte. | No. We do not ask for a Social Security number or immigration status to see you."],
      ["¿Hay intérprete? | Is there an interpreter?", "Sí, en español y en otros idiomas con aviso. | Yes, in Spanish and in other languages with notice."],
      ["¿Pueden ayudarme con Medicaid? | Can you help with Medicaid?", "Sí, una persona del equipo te ayuda a llenar la solicitud sin costo. | Yes, a team member helps you fill out the application at no cost."]],
  },
  {
    sub: "NEG-SALUD-04", tipo: "pediatria", nombres: ["Pediatría Los Angelitos", "Consultorio Pediátrico Sonrisas", "Pediatría Dr. Valdez", "Centro Pediátrico Mi Niño Sano", "Pediatría Familiar Arco Iris", "Clínica de Niños San Judas", "Pediatría Pequeños Pasos", "Consultorio Pediátrico Luna", "Pediatría Crecer Feliz", "Pediatría Dra. Núñez y Equipo"],
    secs: ["Consultas | Visits", "Chequeos y vacunas | Checkups and vaccines", "Por video | Video"],
    svc: [
      S(0, "Consulta pediátrica", "Pediatric visit", "Niños y adolescentes. Con calma y sin prisa.", "Kids and teens. Calm and unhurried.", 8500, 20, "cons", { core: true }),
      S(0, "Cita el mismo día para niños", "Same-day visit for kids", "Espacios cada mañana para que no esperes.", "Openings every morning so you do not wait.", 9500, 20, "cons", { core: true }),
      S(0, "Visita del recién nacido", "Newborn visit", "Primer control, con tiempo para tus preguntas.", "First checkup, with time for your questions.", 9000, 30, "cons"),
      S(1, "Chequeo del niño sano", "Well-child checkup", "Crecimiento, desarrollo y vacunas al día. Gratis con tu seguro.", "Growth, development and vaccines up to date. Free with your insurance.", 0, 30, "free", { core: true }),
      S(1, "Vacunas", "Vaccines", "El calendario completo. Gratis con tu seguro; sábados sin cita.", "The full schedule. Free with your insurance; walk-in Saturdays.", 0, 10, "free", { core: true }),
      S(1, "Examen físico para escuela o deporte", "School or sports physical", "Con el formulario listo el mismo día.", "With the form ready the same day.", 4500, 20, "proc"),
      S(2, "Consulta por video", "Video visit", "Hoy mismo, desde tu teléfono.", "Same day, from your phone.", 5500, 15, "tele", { core: true }),
    ],
    about: [["Pediatría en {c} desde {y}. {o} y su equipo cuidan a niños y adolescentes en español e inglés: chequeos, vacunas y citas el mismo día. Aceptamos Medicaid, CHIP y los principales seguros.", "Pediatrics in {c} since {y}. {o} and the team care for kids and teens in Spanish and English: checkups, vaccines and same-day visits. We take Medicaid, CHIP and major plans."],
      ["Desde {y} en {st}: el consultorio de {c} donde los niños entran sin miedo. Sala de espera con juegos y horario de tarde para los papás que trabajan.", "Since {y} on {st}: {c}'s clinic where kids walk in without fear. A play area in the waiting room and afternoon hours for working parents."],
      ["{n}: un lugar pensado para los más chiquitos. Atendemos desde recién nacidos hasta los 18 años.", "{n}: a place designed for the little ones. We see newborns through age 18."]],
    horas: () => [null, [480, 1020], [480, 1020], [480, 1110], [480, 1020], [480, 960], [540, 780]],
    faqs: [["¿Desde qué edad atienden? | From what age do you see patients?", "Desde recién nacidos hasta los 18 años. | From newborns through age 18."],
      ["¿Aceptan CHIP y Medicaid? | Do you take CHIP and Medicaid?", "Sí, y la consulta del niño sano no tiene costo con ellos. | Yes, and the well-child visit has no charge with them."],
      ["¿Pueden darme cita para hoy? | Can you see my child today?", "Reservamos espacios cada mañana para niños que no pueden esperar. | We keep openings each morning for kids who cannot wait."],
      ["¿Puedo venir con mis otros hijos? | Can I bring my other children?", "Claro, hay sala de juegos en la espera. | Of course, there is a play area in the waiting room."]],
  },
  {
    sub: "NEG-SALUD-05", tipo: "gineco", nombres: ["Centro de la Mujer Flor de Vida", "Ginecología y Obstetricia Dra. Cabrera", "Salud de la Mujer La Esperanza", "Clínica de la Mujer Mariposa", "Consultorio Ginecológico Santa Ana", "Centro Femenino Luz y Salud", "Obstetricia y Mujer del Valle", "Mujer Sana Centro Médico", "Ginecología Familiar Alba", "Consultorio de la Mujer Divina Gracia"],
    secs: ["Consultas | Visits", "Embarazo | Pregnancy", "Por video | Video"],
    svc: [
      S(0, "Examen anual de la mujer", "Annual well-woman exam", "Chequeo completo y orientación. Gratis con tu seguro.", "Full checkup and guidance. Free with your insurance.", 0, 40, "free", { core: true }),
      S(0, "Consulta ginecológica", "Gynecology visit", "Con una doctora, en un espacio cómodo y privado.", "With a female doctor, in a comfortable and private space.", 12000, 30, "cons", { core: true }),
      S(0, "Planificación familiar", "Family planning", "Orientación y métodos, con calma y sin juicios.", "Guidance and options, calm and judgment-free.", 9000, 30, "cons"),
      S(0, "Papanicolaou", "Pap test", "Rápido y con resultado por mensaje seguro.", "Quick, with results by secure message.", 6500, 20, "proc"),
      S(1, "Primer control del embarazo", "First pregnancy visit", "Para empezar tu cuidado con tiempo para preguntas.", "To start your care with time for questions.", 11000, 40, "cons", { core: true }),
      S(1, "Control prenatal", "Prenatal visit", "Seguimiento durante el embarazo, según tu plan.", "Follow-up through pregnancy, per your plan.", 8500, 30, "cons"),
      S(1, "Ultrasonido", "Ultrasound", "Con la doctora, en el mismo consultorio.", "With the doctor, in the same office.", 9500, 30, "proc"),
      S(2, "Consulta por video", "Video visit", "Resultados, recetas y preguntas desde casa.", "Results, refills and questions from home.", 6500, 20, "tele", { core: true }),
    ],
    about: [["Salud de la mujer en {c} desde {y}. {o} y su equipo atienden con privacidad y respeto: exámenes anuales, planificación familiar y cuidado del embarazo, en español e inglés. Con doctora si lo prefieres.", "Women's health in {c} since {y}. {o} and the team care with privacy and respect: annual exams, family planning and pregnancy care, in Spanish and English. With a female doctor if you prefer."],
      ["Desde {y} en {st}: un consultorio donde la mujer se siente escuchada. Aceptamos Medicaid y los principales seguros; sin seguro, precio fijo.", "Since {y} on {st}: a clinic where women feel heard. We take Medicaid and major plans; without insurance, a flat price."],
      ["{n} abrió en {y}. Acompañamos a las mujeres de {c} en cada etapa, con citas puntuales y un equipo que habla tu idioma.", "{n} opened in {y}. We accompany the women of {c} at every stage, with on-time visits and a team that speaks your language."]],
    horas: () => [null, [480, 1020], [480, 1020], [480, 1080], [480, 1020], [480, 960], null],
    faqs: [["¿Puedo pedir una doctora? | Can I ask for a female doctor?", "Sí, al reservar eliges con quién; hay doctoras en el equipo. | Yes, when booking you choose who; there are female doctors on the team."],
      ["¿Aceptan Medicaid? | Do you take Medicaid?", "Sí, y la mayoría de los exámenes preventivos no tienen costo con tu seguro. | Yes, and most preventive exams have no cost with your insurance."],
      ["¿Mi cita es privada? | Is my booking private?", "Sí. La cita no dice por qué vienes y los avisos no mencionan el servicio. | Yes. The booking does not say why you come and notices do not mention the service."],
      ["¿Qué traigo a la primera cita? | What do I bring to my first visit?", "Tu identificación, tu tarjeta de seguro si tienes y la lista de tus medicinas. | Your ID, your insurance card if you have one and a list of your medications."]],
  },
];

const ROL = {
  general: [["Médico general | Primary care physician", "md"], ["Enfermera practicante | Nurse practitioner", "crnp"], ["Asistente médico | Physician assistant", "pac"], ["Enfermera | Registered nurse", "rn"]],
  urgencias: [["Médico de urgencias | Urgent care physician", "md"], ["Enfermera practicante | Nurse practitioner", "crnp"], ["Asistente médico | Physician assistant", "pac"], ["Enfermera | Registered nurse", "rn"]],
  comunitaria: [["Médico de familia | Family physician", "md"], ["Enfermera practicante | Nurse practitioner", "crnp"], ["Trabajadora social clínica | Clinical social worker", "lcsw"], ["Enfermera | Registered nurse", "rn"]],
  pediatria: [["Pediatra | Pediatrician", "md"], ["Enfermera practicante pediátrica | Pediatric nurse practitioner", "crnp"], ["Pediatra | Pediatrician", "md"], ["Enfermera | Registered nurse", "rn"]],
  gineco: [["Ginecóloga y obstetra | OB-GYN", "md"], ["Partera certificada | Certified nurse-midwife", "cnm"], ["Ginecóloga | Gynecologist", "md"], ["Enfermera practicante | Nurse practitioner", "crnp"]],
};

const BANCO = {
  pos: {
    open: ["Me atendieron con mucho respeto y sin prisa. | They treated me with great respect and without rushing.", "{p} se tomó el tiempo de explicarme todo en español. | {p} took the time to explain everything to me in Spanish.", "La atención fue rápida y el personal muy amable. | The service was quick and the staff very kind.",
      "Llevo años viniendo con toda mi familia. | I have been coming with my whole family for years.", "Por fin un lugar donde me entienden. | Finally a place where they understand me.", "Salí tranquilo de la consulta. | I left the visit feeling at ease.",
      "Me dieron la cita para el mismo día. | They gave me a same-day appointment.", "Todo estuvo limpio y bien organizado. | Everything was clean and well organized.", "El consultorio es cómodo y la recepción muy atenta. | The office is comfortable and the front desk very attentive."],
    det: ["Me dijeron el precio antes de la cita y fue el mismo. | They told me the price before the visit and it was the same.", "Aceptaron mi seguro sin problemas. | They accepted my insurance with no trouble.", "No esperé más de diez minutos. | I did not wait more than ten minutes.",
      "Respondieron mis preguntas con paciencia. | They answered my questions patiently.", "Me avisaron por mensaje un día antes. | They sent me a reminder message the day before.", "Pude reservar desde la app en un minuto. | I booked in the app in a minute.",
      "Había intérprete y no tuve que pedirlo dos veces. | There was an interpreter and I did not have to ask twice.", "La privacidad se respeta: nadie preguntó de más. | Privacy is respected: no one asked more than needed.", "El cobro fue claro, sin sorpresas. | Billing was clear, with no surprises."],
    close: ["Se lo recomiendo a mi familia y amigos. | I recommend them to my family and friends.", "Seguiré viniendo. | I will keep coming.", "Muy agradecido con todo el equipo. | Very grateful to the whole team.", "Cinco estrellas. | Five stars."],
  },
  mid: {
    open: ["La atención fue buena, aunque esperé más de lo que decía la cita. | The care was good, though I waited longer than the booking said.", "El personal fue amable, pero la cita empezó tarde. | The staff was kind, but the appointment started late.", "Bien en general; el estacionamiento es difícil. | Fine overall; parking is hard."],
    det: ["Me hubiera gustado más tiempo para mis preguntas. | I would have liked more time for my questions.", "El precio me pareció algo alto sin seguro. | The price felt a little high without insurance.", "Tardaron en contestar el teléfono. | They took a while to answer the phone."],
    midClose: ["Espero que mejoren los tiempos. | I hope the wait times improve.", "Voy a volver a intentarlo. | I will give it another try."],
  },
  neg: {
    open: ["Esperé mucho más de lo que decía mi cita. | I waited much longer than my booking said.", "No me quedó claro lo que iba a pagar. | It was not clear what I would pay.", "Sentí que me atendieron con prisa. | I felt I was rushed."],
    det: ["Nadie me avisó del retraso. | Nobody told me about the delay.", "En la recepción me dieron información distinta a la de la app. | The front desk gave me different information than the app.", "Esperaba más claridad con el cobro. | I expected clearer billing."],
  },
  rPos: ["Gracias por su confianza. Aquí estamos para su familia. | Thank you for your trust. We are here for your family.", "Nos alegra saberlo. Gracias por venir. | We are glad to hear it. Thank you for coming.", "Gracias por sus palabras; las compartimos con todo el equipo. | Thank you for your words; we share them with the whole team."],
  rMid: ["Gracias por contarnos. Estamos ajustando la agenda para respetar su hora. | Thanks for telling us. We are adjusting the schedule to respect your time."],
  rNeg: ["Lamentamos la espera. Llame a la oficina y lo revisamos con usted. | We are sorry about the wait. Call the office and we will go over it with you.", "Gracias por avisarnos. Hemos cambiado cómo damos las horas y cómo explicamos los precios. | Thank you for letting us know. We changed how we give times and how we explain prices.", "Tiene razón; le pedimos disculpas. Escríbanos para aclararlo. | You are right; we apologize. Write to us so we can clear it up."],
  answers: (est, r, o) => ({ lengua: r.weighted([["es", 70], ["int", 18], ["no", est <= 2 ? 25 : 4]]), explico: est >= 4 ? 1 : est === 3 ? 0 : -1, cobro: est >= 3 ? 1 : 0, trato: est >= 4 ? 1 : est === 3 ? 0 : -1 }),
  facts: (o) => ({ seg: !!o.o.det.seguro && o.o.det.seguro.kind !== "none", segOk: !!o.o.det.seguro && o.o.det.seguro.kind !== "none" && o.o.det.seguro.acepta, pago: o.o.det.precio }),
};
const NOV = [
  { kind: "novedad", t: "Ya reservas tu cita en la app | You can now book online", b: "Elige servicio, doctor y hora. Tu cita no dice por qué vienes. | Choose service, doctor and time. Your booking does not say why you come." },
  { kind: "novedad", t: "Ahora aceptamos más seguros | We now take more insurance plans", b: "Revisa la lista en nuestra página. Si el tuyo no está, llámanos. | Check the list on our page. If yours is not there, call us." },
  { kind: "aviso", t: "Horario de los días festivos | Holiday hours", b: "Cerramos el día feriado y abrimos al siguiente con horario normal. | Closed on the holiday, open the next day on regular hours.", day: "Feriado", hrs: "closed", hrsT: "" },
  { kind: "novedad", t: "Se une una nueva doctora al equipo | A new doctor joins the team", b: "Habla español e inglés y ya tiene agenda abierta. | She speaks Spanish and English and her schedule is open." },
  { kind: "novedad", t: "Vacunas de temporada disponibles | Seasonal vaccines available", b: "Gratis con tu seguro; los sábados sin cita. | Free with your insurance; walk-in on Saturdays." },
  { kind: "hoy", t: "Hay citas libres hoy | Same-day openings", b: "Reserva en la app o llámanos. | Book in the app or call us." },
  { kind: "encuesta", t: "¿Qué horario te sirve más? | Which hours work best for you?", b: "", poll: ["Más temprano | Earlier", "Más tarde | Later", "Sábados | Saturdays"] },
  { kind: "novedad", t: "Intérprete sin costo | Interpreter at no cost", b: "Pídelo al reservar y lo tendremos en tu cita. | Ask when you book and we will have one at your visit." },
  { kind: "novedad", t: "Cumplimos años en {c} | Our anniversary in {c}", b: "Gracias a las familias que confían en nosotros desde {y}. | Thank you to the families who have trusted us since {y}." },
  { kind: "aviso", t: "Cerramos por mantenimiento | Closed for maintenance", b: "Un día de arreglos en el consultorio. Las citas se reprograman solas. | One day of office repairs. Bookings are rescheduled automatically.", day: "Un día", hrs: "closed", hrsT: "" },
];

export function construir(si, k, ord) {
  const cfg = SUBS[si], nombre = cfg.nombres[k];
  const b = crear({ cat: CAT, sub: cfg.sub, si, k, ord, nombre, mujer: cfg.tipo === "gineco" ? true : undefined });
  const r = b.r;
  b.factor = 0.9 + r() * 0.26;
  const anos = 2026 - b.founded;
  b.langs = ["es", "en"];
  b.subs = [cfg.sub, ...(cfg.tipo === "general" ? ["NEG-SALUD-04", "NEG-SALUD-45"].filter(() => r.chance(0.35)) : cfg.tipo === "pediatria" ? ["NEG-SALUD-45"].filter(() => r.chance(0.5)) : cfg.tipo === "gineco" ? ["NEG-SALUD-06"].filter(() => r.chance(0.6)) : cfg.tipo === "comunitaria" ? ["NEG-SALUD-01"] : ["NEG-SALUD-01"].filter(() => r.chance(0.3)))];
  const aboutT = r.pick(cfg.about), f = (t) => t.replace(/\{o\}/g, b.owner.fn).replace(/\{st\}/g, b.calle).replace(/\{y\}/g, b.founded).replace(/\{c\}/g, b.cityNombre).replace(/\{n\}/g, nombre).replace(/\{a\}/g, anos);
  b.about = { es: f(aboutT[0]), en: f(aboutT[1]) };
  poner(b, CAT, cfg.sub, 6);
  b.mods = ["svc", "citas", "staff", "nov"];
  horario(b, cfg.horas(r));
  // equipo con licencia
  const ROLES = ROL[cfg.tipo], n = r.int(2, 4);
  b.members = []; b.lic = [];
  const evitar = [b.owner.fn];
  const fem = cfg.tipo === "gineco";
  const mk = (kind, nombreP, rol, licKind, since, owner, fm) => {
    const m = { kind, name: nombreP, role: bi(rolGenero(rol, fm)), langs: r.chance(0.5) ? ["es", "en"] : ["es"], spec: [], since, auto: r.chance(0.4), resp: [15, 30, 60][r.int(0, 2)], dep: 0, bio: bi(`${rol.split(" | ")[0]} con ${r.int(4, 22)} años de experiencia. Atiende en español. | ${rol.split(" | ")[1]} with ${r.int(4, 22)} years of experience. Sees patients in Spanish.`) };
    if (owner) m.name = nombreP;
    b.members.push(m); b.lic.push({ kind: licKind, m: b.members.length - 1 });
  };
  mk("owner", `${b.owner.fn} ${b.owner.ln}`, ROLES[0][0], ROLES[0][1], b.founded, true, b.owner.f);
  for (let j = 1; j < n + 1 && j < ROLES.length + 1; j++) {
    const [rol, lk] = ROLES[j % ROLES.length];
    const fm = fem ? true : r.chance(0.5), p = persona(r, fm, evitar); evitar.push(p.fn);
    mk("staff", p.nombre, rol, lk, r.int(b.founded, 2024), false, fm);
  }
  b.members.forEach((m, i) => { m.takes = b.lic[i].kind !== "rn" && b.lic[i].kind !== "lcsw"; });
  if (!b.members.some((m) => m.takes)) b.members[0].takes = true;
  // servicios
  const elegidos = cfg.svc.filter((s) => s.core || r.chance(0.7));
  b.secs = cfg.secs.map(bi);
  b.items = elegidos.map((s, i) => {
    const p = s.p === 0 ? 0 : precio(b, s.p);
    return { sort: i, sec: s.sec, name: bi(`${s.es} | ${s.en}`), descr: bi(`${s.de} | ${s.dn}`), price: p, dur: s.d, buf: 0, kind: s.k, attrs: s.esc ? { esc: true } : {}, photos: r.chance(0.75) ? [b.photos[(i + 1) % b.photos.length]] : [], who: [] };
  });
  const usadas = [...new Set(b.items.map((x) => x.sec))].sort((a, c) => a - c), mapa = new Map(usadas.map((s, n2) => [s, n2]));
  b.secs = usadas.map((s) => bi(cfg.secs[s])); b.items.forEach((x) => { x.sec = mapa.get(x.sec); });
  // herramienta de salud
  const publicos = r.shuffle(SEG_PUB).slice(0, cfg.tipo === "comunitaria" ? 3 : r.int(2, 3));
  const priv = r.shuffle(["highmark", "geisinger", "upmc", "aetna", "cigna", "uhc"]).slice(0, cfg.tipo === "comunitaria" ? 1 : r.int(1, 4));
  const insList = cfg.tipo === "comunitaria" ? [...new Set(["medicaid", "chip", "medicare", ...priv.slice(0, 1)])] : [...new Set(["medicaid", ...publicos, ...priv])];
  if (cfg.tipo === "pediatria" && !insList.includes("chip")) insList.push("chip");
  const cash = cfg.tipo === "comunitaria" ? 2500 : cfg.tipo === "urgencias" ? [11500, 12500, 13000][r.int(0, 2)] : [7500, 8500, 9000, 9500, 10000][r.int(0, 4)];
  const tieneTele = b.items.some((x) => x.kind === "tele");
  b.hs = { ins: insList, sin: true, cash, langs: ["es", "en"], tele: tieneTele, nuevos: r.chance(0.94), wait: cfg.tipo === "urgencias" ? r.pick([15, 20, 25, 30, 40]) : null, escala: cfg.tipo === "comunitaria", sinid: cfg.tipo === "comunitaria" || r.chance(0.12), interp: cfg.tipo === "comunitaria" || r.chance(0.35) };
  b.pol = { auto: b.members[0].auto, resp: b.members[0].resp, exp: 2, dep: 0, cxh: [2, 4, 12, 24][r.int(0, 3)], tol: 15, pick: true };
  // filtros (lo que calcula recalcularFiltrosSP + los fijos del catálogo)
  const fv = ["cita", "online"];
  if (b.items.some((x) => x.kind === "walk")) fv.push("walk");
  if (insList.length) fv.push("seguro"); for (const kx of ["medicaid", "medicare", "chip"]) if (insList.includes(kx)) fv.push(kx);
  fv.push("sinseguro", "esp", "medesp"); if (b.hs.escala) fv.push("escala"); if (b.hs.sinid) fv.push("sinid"); if (tieneTele) fv.push("tele"); if (b.hs.interp) fv.push("interp");
  if (cfg.tipo !== "urgencias" || r.chance(0.5)) fv.push("hoy");
  if (b.hours[6].open) fv.push("finde"); if (b.hours.some((h) => h.open && h.ranges[0] && h.ranges[0][1] >= "20:00")) fv.push("noche");
  if (cfg.tipo === "pediatria" || cfg.tipo === "general") fv.push("ninos"); if (cfg.tipo === "gineco") fv.push("mujer"); if (cfg.tipo === "general" && r.chance(0.5)) fv.push("mayor");
  if (b.founded <= 2016) fv.push("y10");
  b.fv = [...new Set(fv)];
  b.pay = ["local"];
  const docs = b.members.length;
  b.attrs = { m: "shop", salud: 1, ins: insList, cash: cash / 100, docs, ...(b.hs.wait ? { wait: b.hs.wait } : {}),
    tarjeta: { eta: bi(cfg.tipo === "urgencias" ? `Sin cita · espera de unos ${b.hs.wait} min | Walk-in · about ${b.hs.wait} min wait` : `Con cita en la app | Book in the app`),
      fee: bi(cfg.tipo === "comunitaria" ? `Según tus ingresos · desde ${usd(2000)} | Income-based · from ${usd(2000, false)}` : `${insList.slice(0, 2).map((x) => SEGURO[x]).join(" y ")} · sin seguro ${usd(cash)} | ${insList.slice(0, 2).map((x) => SEGURO[x]).join(" & ")} · uninsured ${usd(cash, false)}`) } };
  b.amenities = r.shuffle(["wifi", "estacionamiento", "accesible", "sala-ninos", "interprete"]).slice(0, 3);
  b.faqs = cfg.faqs.map(([q, a]) => ({ q: bi(q), a: bi(a) }));

  // historia de visitas
  const tam = r.weighted([[1, 3], [2, 4], [3, 3]]);
  const N = { 1: r.int(45, 80), 2: r.int(90, 150), 3: r.int(160, 230) }[tam];
  const pesos = b.items.map((x) => [x, x.kind === "tele" ? 0.6 : x.kind === "walk" ? 3 : x.kind === "free" ? 1.4 : 2]);
  const NOMB = (key) => ({ es: SEGURO[key], en: SEGURO[key] });
  const elegir = (bb, rr) => ({ item: rr.weighted(pesos), mi: rr.weighted(b.members.map((m, mi) => [mi, m.takes ? (mi === 0 ? 1.6 : 1) : 0]).filter((z) => z[1] > 0)) });
  const detalle = (bb, item, M, rr) => {
    // el seguro de quien viene: acepta / no acepta / sin seguro
    const x = rr(); let seg;
    if (x < 0.55) seg = { kind: rr.pick(insList.filter((z) => SEG_PUB.includes(z)).length ? insList.filter((z) => SEG_PUB.includes(z)) : ["medicaid"]), insurer: null, plan: null };
    else if (x < 0.65 && insList.some((z) => !SEG_PUB.includes(z))) { const pv = rr.pick(insList.filter((z) => !SEG_PUB.includes(z))); seg = { kind: "priv", insurer: pv, plan: null }; }
    else if (x < 0.75) seg = { kind: "priv", insurer: rr.pick(["cigna", "uhc", "aetna", "highmark"].filter((z) => !insList.includes(z)).concat(["delta"])), plan: null };
    else seg = { kind: "none", insurer: null, plan: null };
    if (seg.kind !== "priv") seg.insurer = seg.kind === "none" ? null : seg.kind;
    const acc = seg.kind !== "none" && (seg.kind === "priv" ? !!seg.insurer && insList.includes(seg.insurer) : insList.includes(seg.kind));
    const nombreS = seg.kind === "none" ? { es: "Sin seguro", en: "No insurance" } : NOMB(seg.insurer);
    const sinSeg = item.kind === "free" ? (b.hs.sin ? cash : 0) : item.price;
    const total = acc ? 0 : sinSeg;
    const pub = seg.kind === "medicaid" || seg.kind === "chip";
    const lab = acc ? (item.kind === "free" || pub ? ["$0", "$0"] : ["Copago", "Copay"]) : [usd(total), usd(total, false)];
    const pie = acc ? (item.kind === "free" || pub ? ["CON TU SEGURO", "WITH YOUR INSURANCE"] : ["SEGÚN TU PLAN", "PER YOUR PLAN"]) : seg.kind === "none" ? ["SIN SEGURO", "UNINSURED"] : ["SIN SEGURO", "UNINSURED"];
    const hijo = cfg.tipo === "pediatria" ? true : rr.chance(0.12);
    return { det: { rubro: "salud", svc: item.name, k: item.kind, tele: item.kind === "tele", para: hijo ? "hijo" : "yo", sms: true, cualquiera: false, seguro: { kind: seg.kind, insurer: seg.insurer, plan: null, last4: null, acepta: acc, nombre: nombreS }, precio: { es: `${lab[0]} · ${pie[0]}`, en: `${lab[1]} · ${pie[1]}` }, sinSeg }, sub: total, tot: total, dur: Math.max(15, item.dur) };
  };
  const { ops, hechas } = citasHistoria(b, r, { N, proximas: r.int(4, 8), hooks: { elegir, detalle } });
  b.ops = ops;
  const rv = resenas(b, hechas, BANCO, r, { min: 22, max: 62 });
  b.reviews = rv.reseñas; b.helpful = rv.util;
  b.posts = novedades(b, NOV, r, { n: r.int(6, 9) });
  b.follows = seguidores(b, r);
  return b;
}

export function todos(inicio = 50) {
  reiniciarIds();
  const L = [];
  for (let si = 0; si < SUBS.length; si++) for (let k = 0; k < 10; k++) L.push(construir(si, k, inicio + si * 10 + k));
  return L;
}
