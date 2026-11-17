// NEG-FE ronda 2 · las subcategorías 06..43: servicios, horarios de la semana y flujos de cada una.
// Nada de dinero en los flujos de ayuda: gratis = $0, donativo = sugerido (nunca se cobra en la app), total = solo funerarias.
export const SEC = {
  serv: ["Servicios", "Services"], cel: ["Celebraciones", "Celebrations"], gru: ["Grupos y clases", "Groups and classes"], ayu: ["Ayuda gratis", "Free help"],
  sac: ["Sacramentos y fechas", "Sacraments and dates"], cit: ["Citas", "Appointments"], fun: ["Servicios y precio total", "Services and total price"],
  pro: ["Productos", "Products"], ora: ["Oración y acompañamiento", "Prayer and companionship"], vol: ["Servir", "Serving"],
};
export const DURV = ["Con cita · 1 hora", "By appointment · 1 hour"], DUR30 = ["Con cita · 30 minutos", "By appointment · 30 minutes"];
const A_PETICION = ["A petición · 1 hora", "On request · 1 hour"];
/* it(sección, flujo, [es,en], [descripción es,en], opciones). flujo: info (sin solicitud) · fecha («Pedir fecha») · curso (grupos con cupo) · charla (un día con cupo).
   opciones: c = dólares (donativo sugerido, o total en funeraria), tot, dur, sem, dows, min, seats, p (probabilidad de aparecer), core (siempre). */
const it = (sec, flow, name, desc, o = {}) => ({ sec: SEC[sec], flow, name, desc, ...o });

const CULTO_BASE = () => [
  it("serv", "info", ["Culto dominical", "Sunday service"], ["Alabanza, mensaje y oración. Todos son bienvenidos.", "Worship, message and prayer. Everyone is welcome."], { core: 1 }),
  it("serv", "info", ["Oración y estudio de entre semana", "Midweek prayer and study"], ["Un rato de oración y estudio, con café al final.", "A time of prayer and study, with coffee afterwards."], { core: 1 }),
  it("cel", "fecha", ["Bautismo", "Baptism"], ["Charla previa y fecha de la ceremonia. Donativo sugerido.", "A prior talk and the ceremony date. Suggested donation."], { c: 40, p: 0.8 }),
  it("cel", "fecha", ["Boda", "Wedding"], ["Orientación para la pareja y la ceremonia. Donativo sugerido.", "Guidance for the couple and the ceremony. Suggested donation."], { c: 200, p: 0.75 }),
  it("gru", "curso", ["Escuela para nuevos miembros", "New member class"], ["Ocho semanas para conocer la comunidad y lo básico de la fe.", "Eight weeks to get to know the community and the basics of the faith."], { sem: 8, dows: [0], min: 12 * 60 + 30, seats: 14, dur: ["8 semanas · los domingos", "8 weeks · Sundays"], p: 0.9 }),
  it("gru", "curso", ["Clases de inglés para la comunidad", "English classes for the community"], ["Clases gratis de inglés básico, abiertas a todos los vecinos.", "Free basic English classes open to all neighbors."], { sem: 10, dows: [2], min: 19 * 60, seats: 16, dur: ["10 semanas · los martes", "10 weeks · Tuesdays"], p: 0.7 }),
  it("gru", "info", ["Grupo de jóvenes", "Youth group"], ["Reunión semanal de jóvenes con música, conversación y servicio.", "Weekly youth meeting with music, conversation and service."], { p: 0.85 }),
  it("ayu", "fecha", ["Visita pastoral a domicilio", "Pastoral home visit"], ["Una visita de oración y compañía, a petición de la familia.", "A visit of prayer and company, at the family's request."], { dur: A_PETICION, p: 0.9 }),
];
const CULTO = {
  "NEG-FE-06": CULTO_BASE(),
  "NEG-FE-07": [
    it("serv", "info", ["Escuela sabática", "Sabbath school"], ["Estudio en grupos por edades antes del culto del sábado.", "Study in age groups before the Saturday service."], { core: 1 }),
    it("serv", "info", ["Culto de sábado", "Saturday service"], ["Alabanza, mensaje y oración. Todos son bienvenidos.", "Worship, message and prayer. Everyone is welcome."], { core: 1 }),
    it("serv", "info", ["Reunión de oración de miércoles", "Wednesday prayer meeting"], ["Una hora de oración y testimonios cortos.", "An hour of prayer and short testimonies."], {}),
    it("cel", "fecha", ["Bautismo", "Baptism"], ["Estudios previos y fecha de la ceremonia. Donativo sugerido.", "Prior studies and the ceremony date. Suggested donation."], { c: 30, p: 0.8 }),
    it("gru", "curso", ["Estudios bíblicos para quien quiere conocer más", "Bible studies for anyone who wants to learn"], ["Diez semanas de estudio, con materiales gratis.", "Ten weeks of study, with free materials."], { sem: 10, dows: [3], min: 19 * 60, seats: 14, dur: ["10 semanas · los miércoles", "10 weeks · Wednesdays"], p: 0.9 }),
    it("gru", "curso", ["Clases de cocina saludable", "Healthy cooking classes"], ["Seis semanas de cocina sencilla para la familia, gratis.", "Six weeks of simple family cooking, free."], { sem: 6, dows: [0], min: 16 * 60, seats: 14, dur: ["6 semanas · los domingos", "6 weeks · Sundays"], p: 0.6 }),
    it("ayu", "fecha", ["Visita pastoral a domicilio", "Pastoral home visit"], ["Una visita de oración y compañía, a petición.", "A visit of prayer and company, on request."], { dur: A_PETICION }),
  ],
  "NEG-FE-08": CULTO_BASE(),
  "NEG-FE-09": [
    it("serv", "info", ["Reunión del fin de semana", "Weekend meeting"], ["Un discurso público y estudio en grupo. La entrada es libre y no hay colectas.", "A public talk and group study. Entry is free and there are no collections."], { core: 1 }),
    it("serv", "info", ["Reunión de entre semana", "Midweek meeting"], ["Una reunión para estudiar y practicar en grupo. Abierta a las visitas.", "A meeting to study and practice together. Visitors welcome."], { core: 1 }),
    it("ayu", "fecha", ["Conversación bíblica gratuita", "Free Bible conversation"], ["Una visita para conversar y responder preguntas, sin compromiso.", "A visit to talk and answer questions, no commitment."], { dur: A_PETICION, core: 1 }),
    it("ayu", "fecha", ["Visita al salón de reuniones", "Visit to the meeting hall"], ["Recorrido del salón antes de una reunión, para quien llega por primera vez.", "A tour of the hall before a meeting, for first-time visitors."], { dur: DUR30 }),
    it("gru", "curso", ["Curso de lectura y comprensión", "Reading and comprehension course"], ["Doce semanas para leer mejor en español, gratis y abierto a todos.", "Twelve weeks to read better in Spanish, free and open to everyone."], { sem: 12, dows: [6], min: 10 * 60, seats: 12, dur: ["12 semanas · los sábados", "12 weeks · Saturdays"], p: 0.7 }),
  ],
  "NEG-FE-10": [
    it("serv", "info", ["Reunión sacramental", "Sacrament meeting"], ["La reunión principal del domingo, con himnos y mensajes. Todos son bienvenidos.", "The main Sunday meeting, with hymns and talks. Everyone is welcome."], { core: 1 }),
    it("serv", "info", ["Escuela dominical y clases", "Sunday school and classes"], ["Clases por edades después de la reunión principal.", "Classes by age after the main meeting."], { core: 1 }),
    it("gru", "info", ["Actividad de jóvenes de entre semana", "Midweek youth activity"], ["Deportes, servicio y conversación para jóvenes, un día entre semana.", "Sports, service and conversation for youth, one weeknight."], {}),
    it("ayu", "fecha", ["Visita de la rama a tu casa", "Visit from the branch at your home"], ["Una visita a petición para conversar, sin compromiso.", "A visit on request to talk, no commitment."], { dur: A_PETICION, core: 1 }),
    it("gru", "curso", ["Clases de inglés conversacional", "Conversational English classes"], ["Ocho semanas de práctica en grupos pequeños, gratis.", "Eight weeks of practice in small groups, free."], { sem: 8, dows: [2], min: 19 * 60, seats: 14, dur: ["8 semanas · los martes", "8 weeks · Tuesdays"], p: 0.8 }),
    it("ayu", "fecha", ["Ayuda para rastrear tu historia familiar", "Help tracing your family history"], ["Una cita con un voluntario para armar tu árbol familiar, gratis.", "An appointment with a volunteer to build your family tree, free."], { dur: DURV, p: 0.75 }),
  ],
  "NEG-FE-11": [
    it("serv", "info", ["Divina Liturgia del domingo", "Sunday Divine Liturgy"], ["La liturgia principal de la semana. Quien visita puede quedarse a observar.", "The main liturgy of the week. Visitors may stay and observe."], { core: 1 }),
    it("serv", "info", ["Vísperas del sábado", "Saturday Vespers"], ["Oración de la tarde, con cantos.", "Evening prayer, with chant."], { core: 1 }),
    it("cel", "fecha", ["Bautismo", "Baptism"], ["Charla previa y fecha de la ceremonia. Donativo sugerido.", "A prior talk and the ceremony date. Suggested donation."], { c: 60, p: 0.85 }),
    it("cel", "fecha", ["Boda", "Wedding"], ["Orientación para la pareja y fecha de la ceremonia. Donativo sugerido.", "Guidance for the couple and the ceremony date. Suggested donation."], { c: 300, p: 0.8 }),
    it("gru", "curso", ["Introducción a la fe ortodoxa", "Introduction to the Orthodox faith"], ["Ocho semanas de preguntas y conversación para quien quiere conocer la tradición.", "Eight weeks of questions and conversation for anyone who wants to learn the tradition."], { sem: 8, dows: [3], min: 19 * 60, seats: 12, dur: ["8 semanas · los miércoles", "8 weeks · Wednesdays"], p: 0.9 }),
    it("ayu", "fecha", ["Visita al templo con guía", "Guided visit to the church"], ["Un recorrido con explicación de los íconos y el espacio.", "A tour explaining the icons and the space."], { dur: DUR30 }),
    it("ayu", "fecha", ["Oración de memoria por una familia", "Memorial prayer for a family"], ["Una oración de memoria por un ser querido. Donativo sugerido.", "A memorial prayer for a loved one. Suggested donation."], { c: 50, p: 0.7 }),
  ],
  "NEG-FE-12": [
    it("serv", "info", ["Oración del viernes (Yumu'a)", "Friday prayer (Jumu'ah)"], ["La oración comunitaria de la semana, con sermón en español y árabe.", "The weekly community prayer, with a sermon in Spanish and Arabic."], { core: 1 }),
    it("serv", "info", ["Clase de estudio para la comunidad", "Community study class"], ["Estudio en español, con preguntas abiertas para quien visita.", "Study in Spanish, with open questions for visitors."], { core: 1 }),
    it("ayu", "fecha", ["Visita al centro para conocer el lugar", "Visit the center to see the place"], ["Un recorrido y una charla para vecinos, escuelas y quien tenga curiosidad.", "A tour and talk for neighbors, schools and anyone curious."], { dur: DURV, core: 1 }),
    it("gru", "curso", ["Clases de árabe para principiantes", "Beginner Arabic classes"], ["Diez semanas de lectura y escritura, gratis y abiertas a todos.", "Ten weeks of reading and writing, free and open to everyone."], { sem: 10, dows: [6], min: 11 * 60, seats: 14, dur: ["10 semanas · los sábados", "10 weeks · Saturdays"], p: 0.85 }),
    it("cel", "fecha", ["Ceremonia de matrimonio (nikah)", "Marriage ceremony (nikah)"], ["Consulta con el imán y fecha de la ceremonia. Donativo sugerido.", "A consultation with the imam and the ceremony date. Suggested donation."], { c: 150, p: 0.8 }),
    it("ayu", "info", ["Cena comunitaria abierta", "Open community dinner"], ["Una cena al mes, abierta a todos los vecinos. Gratis.", "A dinner once a month, open to all neighbors. Free."], { p: 0.7 }),
  ],
  "NEG-FE-13": [
    it("serv", "info", ["Servicio de Shabat del viernes", "Friday Shabbat service"], ["Cantos, oración y cena después. Quien visita es bienvenido.", "Songs, prayer and a meal afterwards. Visitors are welcome."], { core: 1 }),
    it("serv", "info", ["Servicio de Shabat del sábado", "Saturday Shabbat service"], ["Lectura y comentario de la semana, con kidush al final.", "Reading and commentary of the week, with kiddush at the end."], { core: 1 }),
    it("gru", "curso", ["Clases de hebreo para adultos", "Hebrew classes for adults"], ["Diez semanas de lectura básica del hebreo, gratis para quien se une.", "Ten weeks of basic Hebrew reading, free to those who join."], { sem: 10, dows: [0], min: 11 * 60, seats: 12, dur: ["10 semanas · los domingos", "10 weeks · Sundays"], p: 0.9 }),
    it("cel", "fecha", ["Preparación de Bar o Bat Mitzvá", "Bar or Bat Mitzvah preparation"], ["Reunión con el rabino para planear la preparación y la fecha. Donativo sugerido.", "A meeting with the rabbi to plan the preparation and the date. Suggested donation."], { c: 250, p: 0.9 }),
    it("cel", "fecha", ["Ceremonia de bodas", "Wedding ceremony"], ["Consulta y fecha de la ceremonia. Donativo sugerido.", "Consultation and ceremony date. Suggested donation."], { c: 300, p: 0.7 }),
    it("ayu", "fecha", ["Visita a la sinagoga con guía", "Guided visit to the synagogue"], ["Un recorrido y una charla para escuelas, vecinos y quien tenga curiosidad.", "A tour and talk for schools, neighbors and anyone curious."], { dur: DURV, core: 1 }),
  ],
};

const GRUPO = {
  "NEG-FE-14": [
    it("gru", "info", ["Reunión semanal del ministerio", "Weekly ministry meeting"], ["Alabanza, un mensaje corto y oración por las necesidades de la semana.", "Worship, a short message and prayer for the week's needs."], { core: 1 }),
    it("vol", "fecha", ["Visita a hospitales y hogares", "Visits to hospitals and homes"], ["Un equipo del ministerio visita a quien lo pida, con oración y compañía.", "A ministry team visits those who ask, with prayer and company."], { dur: DURV, core: 1 }),
    it("gru", "curso", ["Curso de discipulado", "Discipleship course"], ["Diez semanas de estudio en grupo para crecer en la fe.", "Ten weeks of group study to grow in the faith."], { sem: 10, dows: [4], min: 19 * 60, seats: 14, dur: ["10 semanas · los jueves", "10 weeks · Thursdays"], p: 0.9 }),
    it("gru", "curso", ["Taller de liderazgo para voluntarios", "Leadership workshop for volunteers"], ["Cuatro semanas para aprender a coordinar equipos y eventos.", "Four weeks to learn to coordinate teams and events."], { sem: 4, dows: [6], min: 10 * 60, seats: 16, dur: ["4 semanas · los sábados", "4 weeks · Saturdays"], p: 0.7 }),
    it("cel", "fecha", ["Oración en tu casa o negocio", "Prayer at your home or business"], ["Un equipo pasa a orar contigo. Donativo sugerido para el ministerio.", "A team comes to pray with you. Suggested donation for the ministry."], { c: 20, p: 0.7 }),
  ],
  "NEG-FE-15": [
    it("gru", "info", ["Reunión de jóvenes", "Youth meeting"], ["Música, juegos y un mensaje corto cada semana para jóvenes de 14 a 25 años.", "Music, games and a short message every week for ages 14 to 25."], { core: 1 }),
    it("gru", "info", ["Noche de servicio comunitario", "Community service night"], ["Una vez al mes, los jóvenes sirven en la despensa o limpian un parque.", "Once a month, youth serve at the pantry or clean a park."], { p: 0.85 }),
    it("gru", "curso", ["Taller de música y alabanza", "Music and worship workshop"], ["Ocho semanas para aprender instrumentos y tocar en el grupo.", "Eight weeks to learn instruments and play in the group."], { sem: 8, dows: [6], min: 15 * 60, seats: 12, dur: ["8 semanas · los sábados", "8 weeks · Saturdays"], p: 0.85 }),
    it("cel", "charla", ["Retiro de jóvenes", "Youth retreat"], ["Un día de actividades al aire libre. Donativo sugerido para el transporte.", "A day of outdoor activities. Suggested donation for transportation."], { c: 25, seats: 30, core: 1 }),
    it("ayu", "fecha", ["Conversación con el líder del grupo", "Talk with the group leader"], ["Una cita corta para conocer el grupo antes de venir.", "A short appointment to get to know the group before coming."], { dur: DUR30, p: 0.8 }),
  ],
  "NEG-FE-16": [
    it("gru", "info", ["Reunión mensual de damas", "Monthly women's meeting"], ["Estudio, oración y convivio una vez al mes.", "Study, prayer and fellowship once a month."], { core: 1 }),
    it("gru", "curso", ["Taller de costura y manualidades", "Sewing and crafts workshop"], ["Seis semanas de manualidades; los materiales básicos van incluidos.", "Six weeks of crafts; basic materials are included."], { sem: 6, dows: [6], min: 10 * 60, seats: 12, dur: ["6 semanas · los sábados", "6 weeks · Saturdays"], p: 0.9 }),
    it("cel", "charla", ["Desayuno anual de damas", "Annual women's breakfast"], ["Un desayuno con invitada especial y rifa de canastas. Donativo sugerido.", "A breakfast with a guest speaker and a basket raffle. Suggested donation."], { c: 15, seats: 40, core: 1 }),
    it("ayu", "fecha", ["Visita a mujeres enfermas o solas", "Visits to women who are sick or alone"], ["Un equipo de damas visita a quien lo pida, con compañía y oración.", "A team of women visits those who ask, with company and prayer."], { dur: DURV, p: 0.9 }),
    it("gru", "curso", ["Círculo de lectura y oración", "Reading and prayer circle"], ["Ocho semanas leyendo un libro juntas y orando por las necesidades del grupo.", "Eight weeks reading a book together and praying for the group's needs."], { sem: 8, dows: [3], min: 19 * 60, seats: 12, dur: ["8 semanas · los miércoles", "8 weeks · Wednesdays"], p: 0.8 }),
  ],
  "NEG-FE-17": [
    it("gru", "info", ["Desayuno y estudio de varones", "Men's breakfast and study"], ["Un sábado al mes, desayuno, estudio y oración.", "One Saturday a month: breakfast, study and prayer."], { core: 1 }),
    it("gru", "curso", ["Taller de oficios para el hogar", "Home repair workshop"], ["Seis semanas de arreglos básicos: plomería, pintura y electricidad sencilla.", "Six weeks of basic repairs: plumbing, painting and simple electrical."], { sem: 6, dows: [6], min: 9 * 60, seats: 12, dur: ["6 semanas · los sábados", "6 weeks · Saturdays"], p: 0.9 }),
    it("vol", "fecha", ["Jornada de reparaciones para vecinos", "Repair day for neighbors"], ["Un equipo arregla pequeñas cosas en casas de personas mayores, gratis.", "A team fixes small things at seniors' homes, free."], { dur: ["A petición · medio día", "On request · half a day"], core: 1 }),
    it("cel", "charla", ["Retiro de varones", "Men's retreat"], ["Un día de reflexión y convivencia. Donativo sugerido.", "A day of reflection and fellowship. Suggested donation."], { c: 20, seats: 30, p: 0.85 }),
    it("gru", "curso", ["Grupo de paternidad", "Fatherhood group"], ["Ocho semanas para compartir experiencias de ser padre.", "Eight weeks to share experiences of being a father."], { sem: 8, dows: [4], min: 19 * 60, seats: 12, dur: ["8 semanas · los jueves", "8 weeks · Thursdays"], p: 0.8 }),
  ],
  "NEG-FE-18": [
    it("gru", "info", ["Ensayo semanal del coro", "Weekly choir rehearsal"], ["Un ensayo abierto: quien quiera cantar puede unirse.", "An open rehearsal: anyone who wants to sing can join."], { core: 1 }),
    it("gru", "curso", ["Clases de canto y música", "Singing and music classes"], ["Doce semanas de canto, ritmo y lectura básica de música, gratis.", "Twelve weeks of singing, rhythm and basic music reading, free."], { sem: 12, dows: [6], min: 10 * 60, seats: 14, dur: ["12 semanas · los sábados", "12 weeks · Saturdays"], core: 1 }),
    it("ayu", "fecha", ["Audición para el coro", "Choir audition"], ["Una cita corta para escucharte y ubicar tu voz.", "A short appointment to hear you and place your voice."], { dur: DUR30, core: 1 }),
    it("cel", "fecha", ["Música para bodas y celebraciones", "Music for weddings and celebrations"], ["El coro canta en tu ceremonia. Donativo sugerido para el ministerio.", "The choir sings at your ceremony. Suggested donation for the ministry."], { c: 150, p: 0.85 }),
    it("cel", "charla", ["Concierto de Navidad", "Christmas concert"], ["Una noche de villancicos abierta a todos. Donativo sugerido.", "A night of carols open to everyone. Suggested donation."], { c: 5, seats: 60, p: 0.7 }),
  ],
  "NEG-FE-19": [
    it("gru", "info", ["Célula de hogar semanal", "Weekly home cell"], ["Reuniones pequeñas en casas de la comunidad, con estudio, oración y café.", "Small meetings in community homes, with study, prayer and coffee."], { core: 1 }),
    it("gru", "curso", ["Estudio de un libro de la Biblia", "Study of a book of the Bible"], ["Ocho semanas recorriendo un libro, con preguntas para conversar.", "Eight weeks through a book, with questions to discuss."], { sem: 8, dows: [3], min: 19 * 60, seats: 14, dur: ["8 semanas · los miércoles", "8 weeks · Wednesdays"], core: 1 }),
    it("ayu", "fecha", ["Pedir una célula cerca de ti", "Ask for a cell near you"], ["Te decimos qué grupo queda más cerca y cuándo se reúne.", "We tell you which group is nearest and when it meets."], { dur: DUR30, core: 1 }),
    it("gru", "curso", ["Capacitación para líderes de célula", "Cell leader training"], ["Cuatro semanas para aprender a guiar un grupo pequeño.", "Four weeks to learn to guide a small group."], { sem: 4, dows: [6], min: 10 * 60, seats: 12, dur: ["4 semanas · los sábados", "4 weeks · Saturdays"], p: 0.8 }),
    it("gru", "info", ["Estudio bíblico en línea", "Online Bible study"], ["Una videollamada semanal para quien no puede salir de casa.", "A weekly video call for those who cannot leave home."], { p: 0.7 }),
  ],
  "NEG-FE-20": [
    it("gru", "info", ["Escuela dominical para niños", "Children's Sunday school"], ["Clases por edades con historias, manualidades y cantos mientras los padres están en el servicio.", "Classes by age with stories, crafts and songs while parents are in the service."], { core: 1 }),
    it("gru", "info", ["Escuela dominical para adultos", "Adult Sunday school"], ["Estudio en grupo antes del culto.", "Group study before the service."], { core: 1 }),
    it("gru", "curso", ["Escuela bíblica de verano", "Summer Bible school"], ["Dos semanas de verano con actividades por edades. Inscripción de la familia.", "Two summer weeks with activities by age. Family registration."], { sem: 2, dows: [1, 2, 3, 4, 5], min: 9 * 60, seats: 20, dur: ["2 semanas · de lunes a viernes", "2 weeks · Monday to Friday"], p: 0.9 }),
    it("gru", "curso", ["Clases para adolescentes", "Classes for teenagers"], ["Doce semanas de estudio y conversación para adolescentes.", "Twelve weeks of study and conversation for teenagers."], { sem: 12, dows: [0], min: 10 * 60, seats: 14, dur: ["12 semanas · los domingos", "12 weeks · Sundays"], p: 0.8 }),
    it("ayu", "fecha", ["Visita a una clase con tu familia", "Visit a class with your family"], ["Una cita para conocer a las maestras y el salón antes de unirte.", "An appointment to meet the teachers and the room before joining."], { dur: DUR30, core: 1 }),
  ],
};

const SACR = {
  "NEG-FE-21": [
    it("sac", "curso", ["Catequesis para niños", "Children's catechesis"], ["Un año de clases los sábados por la mañana. Inscripción de la familia.", "A year of Saturday-morning classes. Family registration."], { sem: 36, dows: [6], min: 10 * 60, seats: 18, dur: ["1 año · los sábados", "1 year · Saturdays"], core: 1 }),
    it("sac", "curso", ["Catequesis para adultos", "Adult catechesis"], ["Para quien quiere prepararse para un sacramento o conocer la fe.", "For anyone preparing for a sacrament or learning the faith."], { sem: 20, dows: [3], min: 19 * 60, seats: 16, dur: ["20 semanas · los miércoles", "20 weeks · Wednesdays"], core: 1 }),
    it("sac", "charla", ["Charla para padres y padrinos de bautizo", "Talk for baptism parents and godparents"], ["Una charla previa al bautizo, un sábado al mes. Donativo sugerido.", "A talk before baptism, one Saturday a month. Suggested donation."], { c: 20, seats: 14, core: 1 }),
    it("sac", "fecha", ["Constancia de sacramentos", "Sacrament certificate"], ["Pide una constancia de bautizo, comunión o confirmación para otra parroquia.", "Ask for a baptism, communion or confirmation certificate for another parish."], { dur: DUR30, p: 0.9 }),
    it("sac", "curso", ["Preparación para la confirmación de adultos", "Adult confirmation preparation"], ["Seis meses de reuniones para recibir la confirmación.", "Six months of meetings to receive confirmation."], { sem: 24, dows: [4], min: 19 * 60, seats: 14, dur: ["24 semanas · los jueves", "24 weeks · Thursdays"], p: 0.7 }),
  ],
  "NEG-FE-22": [
    it("sac", "charla", ["Charla de preparación de bautizo", "Baptism preparation talk"], ["Una charla para padres y padrinos, un sábado al mes. Donativo sugerido.", "A talk for parents and godparents, one Saturday a month. Suggested donation."], { c: 20, seats: 14, core: 1 }),
    it("sac", "fecha", ["Bautizo de niños y bebés", "Baptism of children and babies"], ["Elige la fecha después de la charla. Donativo sugerido.", "Pick the date after the talk. Suggested donation."], { c: 40, core: 1 }),
    it("sac", "fecha", ["Bautizo de adultos", "Adult baptism"], ["Preparación y fecha acordadas con el sacerdote. Donativo sugerido.", "Preparation and date agreed with the priest. Suggested donation."], { c: 40, p: 0.8 }),
    it("sac", "fecha", ["Constancia de bautismo", "Baptism certificate"], ["Pide tu constancia para otra parroquia o un trámite.", "Ask for your certificate for another parish or a procedure."], { dur: DUR30, core: 1 }),
    it("sac", "info", ["Bendición de un recién nacido", "Blessing of a newborn"], ["Una bendición breve después de la misa, sin cita.", "A short blessing after Mass, no appointment."], { p: 0.7 }),
  ],
  "NEG-FE-23": [
    it("sac", "curso", ["Preparación de primera comunión", "First communion preparation"], ["Un año de catequesis, los sábados. Inscripción de la familia.", "A year of catechesis, Saturdays. Family registration."], { sem: 36, dows: [6], min: 10 * 60, seats: 18, dur: ["1 año · los sábados", "1 year · Saturdays"], core: 1 }),
    it("sac", "curso", ["Preparación de confirmación", "Confirmation preparation"], ["Seis meses de clases y retiro para jóvenes.", "Six months of classes and a retreat for youth."], { sem: 26, dows: [0], min: 11 * 60, seats: 18, dur: ["26 semanas · los domingos", "26 weeks · Sundays"], core: 1 }),
    it("sac", "fecha", ["Fecha de la ceremonia de primera comunión", "First communion ceremony date"], ["Elige la fecha con la oficina. Donativo sugerido.", "Pick the date with the office. Suggested donation."], { c: 30, p: 0.9 }),
    it("sac", "fecha", ["Fecha de la ceremonia de confirmación", "Confirmation ceremony date"], ["Elige la fecha con la oficina. Donativo sugerido.", "Pick the date with the office. Suggested donation."], { c: 30, p: 0.9 }),
    it("sac", "charla", ["Retiro de preparación", "Preparation retreat"], ["Un día de reflexión antes del sacramento. Donativo sugerido.", "A day of reflection before the sacrament. Suggested donation."], { c: 15, seats: 25, p: 0.8 }),
  ],
  "NEG-FE-24": [
    it("sac", "fecha", ["Misa de quinceañera", "Quinceañera Mass"], ["Se pide la fecha con seis meses de anticipación. Donativo sugerido.", "Ask for the date six months ahead. Suggested donation."], { c: 150, core: 1 }),
    it("sac", "curso", ["Charlas para la quinceañera y sus padres", "Talks for the quinceañera and her parents"], ["Cuatro sábados de charlas antes de la misa.", "Four Saturdays of talks before the Mass."], { sem: 4, dows: [6], min: 10 * 60, seats: 14, dur: ["4 semanas · los sábados", "4 weeks · Saturdays"], core: 1 }),
    it("sac", "fecha", ["Ensayo de la ceremonia", "Ceremony rehearsal"], ["Una visita para ensayar con la corte y el sacerdote.", "A visit to rehearse with the court and the priest."], { dur: DURV, p: 0.9 }),
    it("sac", "fecha", ["Renovación de promesas de bautismo", "Renewal of baptismal promises"], ["Una ceremonia sencilla para quien no pudo hacerla antes. Donativo sugerido.", "A simple ceremony for those who could not do it before. Suggested donation."], { c: 40, p: 0.6 }),
    it("sac", "info", ["Bendición de la quinceañera", "Blessing of the quinceañera"], ["Una bendición breve en la misa del domingo.", "A short blessing at the Sunday Mass."], { p: 0.6 }),
  ],
  "NEG-FE-25": [
    it("sac", "fecha", ["Boda religiosa", "Church wedding"], ["Seis meses de preparación con charlas para la pareja. Donativo sugerido.", "Six months of preparation with talks for the couple. Suggested donation."], { c: 300, core: 1 }),
    it("sac", "curso", ["Preparación matrimonial", "Marriage preparation"], ["Ocho semanas de charlas para parejas, con un retiro al final.", "Eight weeks of talks for couples, with a retreat at the end."], { sem: 8, dows: [6], min: 10 * 60, seats: 14, dur: ["8 semanas · los sábados", "8 weeks · Saturdays"], core: 1 }),
    it("sac", "fecha", ["Renovación de votos", "Renewal of vows"], ["Una ceremonia sencilla para parejas que cumplen años de casados. Donativo sugerido.", "A simple ceremony for couples marking an anniversary. Suggested donation."], { c: 100, p: 0.8 }),
    it("sac", "fecha", ["Consulta previa para tu boda", "Initial consultation for your wedding"], ["Una cita para ver fechas, documentos y pasos.", "An appointment to review dates, documents and steps."], { dur: DURV, core: 1 }),
    it("sac", "fecha", ["Ceremonia sin misa en la capilla", "Ceremony without Mass in the chapel"], ["La capilla para una ceremonia sencilla. Donativo sugerido.", "The chapel for a simple ceremony. Suggested donation."], { c: 150, p: 0.6 }),
  ],
};

const CONSEJO = {
  "NEG-FE-26": [
    it("cit", "fecha", ["Consejería de pareja", "Couples counseling"], ["Conversaciones privadas para parejas con alguien que escucha sin juzgar. Gratis.", "Private conversations for couples with someone who listens without judging. Free."], { dur: DURV, core: 1 }),
    it("cit", "fecha", ["Consejería familiar", "Family counseling"], ["Una cita para toda la familia o parte de ella.", "An appointment for the whole family or part of it."], { dur: DURV, core: 1 }),
    it("cit", "fecha", ["Primera cita de orientación", "First orientation appointment"], ["Para conocernos y ver qué tipo de ayuda necesitas.", "To get to know each other and see what kind of help you need."], { dur: DUR30, core: 1 }),
    it("gru", "curso", ["Taller de comunicación para parejas", "Communication workshop for couples"], ["Seis semanas de práctica en pareja. Gratis.", "Six weeks of practice as a couple. Free."], { sem: 6, dows: [4], min: 19 * 60, seats: 10, dur: ["6 semanas · los jueves", "6 weeks · Thursdays"], p: 0.85 }),
    it("cit", "fecha", ["Orientación para padres", "Guidance for parents"], ["Una cita para hablar de la crianza y la vida en casa.", "An appointment to talk about parenting and home life."], { dur: DURV, p: 0.8 }),
  ],
  "NEG-FE-27": [
    it("cit", "fecha", ["Consejería individual", "Individual counseling"], ["Una conversación privada con alguien que escucha sin juzgar. Gratis.", "A private conversation with someone who listens without judging. Free."], { dur: DURV, core: 1 }),
    it("cit", "fecha", ["Acompañamiento en momentos difíciles", "Support through hard times"], ["Citas de seguimiento con la misma persona.", "Follow-up appointments with the same person."], { dur: DURV, core: 1 }),
    it("cit", "fecha", ["Orientación en el duelo", "Support in grief"], ["Un espacio para hablar de una pérdida, con calma.", "A space to talk about a loss, calmly."], { dur: DURV, p: 0.9 }),
    it("gru", "curso", ["Grupo de apoyo mutuo", "Mutual support group"], ["Ocho semanas de grupo pequeño con confidencialidad.", "Eight weeks of a small confidential group."], { sem: 8, dows: [2], min: 19 * 60, seats: 10, dur: ["8 semanas · los martes", "8 weeks · Tuesdays"], p: 0.8 }),
    it("cit", "fecha", ["Primera cita de orientación", "First orientation appointment"], ["Para conocernos y ver qué ayuda necesitas. Si estás en crisis, llama o escribe al 988.", "To get to know each other and see what help you need. If you are in crisis, call or text 988."], { dur: DUR30, core: 1 }),
  ],
  "NEG-FE-28": [
    it("cit", "fecha", ["Primera cita con un acompañante", "First appointment with a companion"], ["Una conversación privada con alguien que ha pasado por ahí. Gratis.", "A private conversation with someone who has been there. Free."], { dur: DURV, core: 1 }),
    it("gru", "curso", ["Programa de doce pasos", "Twelve-step program"], ["Doce semanas de grupo, con acompañante y materiales gratis.", "Twelve weeks of group, with a companion and free materials."], { sem: 12, dows: [2], min: 19 * 60, seats: 14, dur: ["12 semanas · los martes", "12 weeks · Tuesdays"], core: 1 }),
    it("cit", "fecha", ["Cita para familiares", "Appointment for family members"], ["Una cita para quien acompaña a alguien en este camino.", "An appointment for someone supporting a person on this path."], { dur: DURV, p: 0.9 }),
    it("gru", "curso", ["Grupo de seguimiento de los jueves", "Thursday follow-up group"], ["Ocho semanas de seguimiento en grupo.", "Eight weeks of follow-up in a group."], { sem: 8, dows: [4], min: 19 * 60, seats: 12, dur: ["8 semanas · los jueves", "8 weeks · Thursdays"], p: 0.8 }),
    it("cit", "fecha", ["Orientación para encontrar otros recursos", "Guidance to find other resources"], ["Te ayudamos a encontrar otros servicios en el condado. Gratis.", "We help you find other services in the county. Free."], { dur: DUR30, p: 0.8 }),
  ],
};

const rep = (nombre, ciudad, c, p) => it("fun", "info", [`Repatriación a ${nombre}`, `Repatriation to ${ciudad}`], ["Traslado, documentos consulares y coordinación del vuelo. El total va por escrito antes de firmar.", "Transfer, consular papers and flight coordination. The total is given in writing before you sign."], { tot: 1, c, p, rep: 1 });
const CITA_FUN = it("cit", "fecha", ["Cita para planear un servicio", "Appointment to plan a service"], ["Una conversación sin presión para ver opciones y precios. No se cobra por preguntar.", "A no-pressure conversation to go over options and prices. Asking is free."], { dur: DURV, core: 1 });
const F_ = (es, en, d1, d2, c, o = {}) => it("fun", "info", [es, en], [d1, d2], { tot: 1, c, ...o });
const FUN = {
  "NEG-FE-29": [
    F_("Servicio funerario completo", "Complete funeral service", "Velorio, ceremonia, ataúd, flores sencillas y traslado al cementerio.", "Viewing, ceremony, casket, simple flowers and transfer to the cemetery.", 7800, { core: 1 }),
    F_("Servicio funerario sencillo", "Simple funeral service", "Ceremonia corta, ataúd básico y traslado.", "Short ceremony, basic casket and transfer.", 4900, { core: 1 }),
    F_("Servicio con cremación", "Service with cremation", "Velorio, ceremonia y cremación, con urna incluida.", "Viewing, ceremony and cremation, with urn included.", 5600),
    F_("Capilla para velorio (por noche)", "Chapel for viewing (per night)", "La capilla con sala para la familia y café.", "The chapel with a family room and coffee.", 900, { p: 0.8 }),
    F_("Transporte local de restos", "Local transport of remains", "Traslado dentro del condado.", "Transfer within the county.", 750, { p: 0.7 }),
    CITA_FUN,
  ],
  "NEG-FE-30": [
    F_("Servicio tradicional con velorio", "Traditional service with viewing", "Dos noches de velorio, misa o ceremonia, ataúd y carroza.", "Two nights of viewing, Mass or ceremony, casket and hearse.", 8400, { core: 1 }),
    F_("Servicio económico", "Economy service", "Una ceremonia breve y ataúd sencillo.", "A short ceremony and simple casket.", 4500, { core: 1 }),
    F_("Servicio de entierro con lote", "Burial service with plot", "Servicio completo y lote en un cementerio asociado.", "Complete service and a plot at an affiliated cemetery.", 11800, { p: 0.7 }),
    F_("Cremación directa", "Direct cremation", "Sin velorio; cremación y entrega de la urna a la familia.", "No viewing; cremation and urn delivered to the family.", 1900, { p: 0.8 }),
    F_("Flores y arreglos", "Flowers and arrangements", "Arreglos de la capilla y del ataúd.", "Chapel and casket arrangements.", 600, { p: 0.7 }),
    CITA_FUN,
  ],
  "NEG-FE-31": [
    F_("Cremación directa", "Direct cremation", "Cremación sin servicio, con urna sencilla y papeles incluidos.", "Cremation without a service, with a simple urn and paperwork included.", 1800, { core: 1 }),
    F_("Cremación con ceremonia", "Cremation with ceremony", "Una ceremonia breve antes de la cremación.", "A brief ceremony before the cremation.", 3900, { core: 1 }),
    F_("Cremación con velorio", "Cremation with viewing", "Velorio de una noche, ceremonia y cremación.", "One night of viewing, ceremony and cremation.", 5400, { p: 0.8 }),
    F_("Urna de madera", "Wooden urn", "Una urna de madera para la familia.", "A wooden urn for the family.", 250, { p: 0.8 }),
    F_("Esparcimiento de cenizas", "Scattering of ashes", "Coordinamos el esparcimiento donde lo permite la ley.", "We coordinate scattering where the law allows it.", 400, { p: 0.6 }),
    CITA_FUN,
  ],
  "NEG-FE-32": [
    { ...rep("República Dominicana", "the Dominican Republic", 4200), core: 1 }, { ...rep("México", "Mexico", 4800), core: 1 }, rep("Puerto Rico", "Puerto Rico", 3900, 0.9),
    rep("Colombia", "Colombia", 5600, 0.8), rep("Ecuador", "Ecuador", 5900, 0.7),
    F_("Preparación y documentos para el traslado", "Preparation and papers for transfer", "Preparación, ataúd de traslado y papeles del consulado.", "Preparation, transfer casket and consular papers.", 2400, { core: 1 }),
    CITA_FUN,
  ],
  "NEG-FE-33": [
    F_("Novenario completo (nueve días)", "Complete novenario (nine days)", "Rezos de nueve noches, con coordinación de la casa y el altar.", "Nine nights of prayers, with coordination of the home and altar.", 650, { core: 1 }),
    F_("Misa de aniversario", "Anniversary Mass", "Misa de recuerdo con invitaciones y flores.", "A memorial Mass with invitations and flowers.", 350, { core: 1 }),
    F_("Servicio memorial en el salón", "Memorial service in the hall", "Un salón para la familia, con sillas, café y pantalla de fotos.", "A hall for the family, with chairs, coffee and a photo screen.", 900, { p: 0.9 }),
    F_("Recordatorios impresos", "Printed remembrance cards", "Cien tarjetas de recuerdo con foto y oración.", "One hundred remembrance cards with photo and prayer.", 180, { p: 0.8 }),
    F_("Coordinación de la cena de despedida", "Coordination of the farewell meal", "Menú y mesas para la familia, con el total por escrito.", "Menu and tables for the family, with the total in writing.", 1200, { p: 0.6 }),
    CITA_FUN,
  ],
};

const ORACION = {
  "NEG-FE-34": [
    it("ora", "fecha", ["Visita de un capellán en el hospital", "Chaplain visit at the hospital"], ["Compañía y oración para quien lo pida, de cualquier creencia o ninguna. Gratis.", "Company and prayer for anyone who asks, of any belief or none. Free."], { dur: ["A petición · 30 minutos", "On request · 30 minutes"], core: 1 }),
    it("ora", "fecha", ["Acompañamiento a la familia", "Support for the family"], ["Un capellán acompaña a la familia durante una espera difícil.", "A chaplain keeps the family company during a hard wait."], { dur: DURV, core: 1 }),
    it("ora", "fecha", ["Visita a una persona privada de su libertad", "Visit to a person in custody"], ["A petición de la familia, con las reglas del lugar.", "At the family's request, following the facility's rules."], { dur: DURV, p: 0.7 }),
    it("ora", "fecha", ["Oración o rito a pedido", "Prayer or rite on request"], ["Una oración sencilla, en español o inglés.", "A simple prayer, in Spanish or English."], { dur: DUR30, p: 0.9 }),
    it("ora", "fecha", ["Llamada de consuelo", "Comfort call"], ["Una llamada breve de un capellán, a la hora que elijas.", "A brief call from a chaplain, at the time you choose."], { dur: DUR30, p: 0.8 }),
  ],
  "NEG-FE-35": [
    it("ora", "fecha", ["Pedir una llamada de oración", "Ask for a prayer call"], ["Una persona te llama a la hora que elijas. Gratis y confidencial.", "Someone calls you at the time you choose. Free and confidential."], { dur: DUR30, core: 1 }),
    it("ora", "fecha", ["Oración por mensaje", "Prayer by message"], ["Escribe tu petición y alguien responde con una oración.", "Write your request and someone replies with a prayer."], { dur: ["Mensaje · el mismo día", "Message · same day"], core: 1 }),
    it("ora", "fecha", ["Oración en persona", "Prayer in person"], ["Una cita corta en el templo o en un café.", "A short appointment at the church or at a café."], { dur: DUR30, p: 0.9 }),
    it("ora", "fecha", ["Oración con la familia", "Prayer with the family"], ["Una visita corta para orar con toda la familia en casa.", "A short visit to pray with the whole family at home."], { dur: DURV, p: 0.8 }),
    it("ora", "fecha", ["Compañía de un voluntario", "Company from a volunteer"], ["Una llamada de compañía semanal para quien está solo.", "A weekly company call for someone who is alone."], { dur: DUR30, p: 0.8 }),
  ],
};

const AYUDA = {
  "NEG-FE-36": [
    it("ayu", "info", ["Caja de alimentos para la familia", "Food box for the family"], ["Gratis, sin pedir identificación. Una caja por familia, según la frecuencia de la despensa.", "Free, no ID asked. One box per family, per the pantry's frequency."], { core: 1 }),
    it("ayu", "info", ["Comida caliente del sábado", "Saturday hot meal"], ["Un almuerzo para todos, sin inscripción.", "A lunch for everyone, no sign-up."], { p: 0.85 }),
    it("ayu", "info", ["Pañales y fórmula para bebés", "Diapers and baby formula"], ["Cuando hay disponibles, se reparten junto con la caja.", "When available, handed out with the food box."], { p: 0.7 }),
    it("ayu", "fecha", ["Ayuda para solicitar beneficios de comida", "Help applying for food benefits"], ["Una cita con una voluntaria para llenar la solicitud, gratis.", "An appointment with a volunteer to fill out the application, free."], { dur: DURV, core: 1 }),
    it("ayu", "fecha", ["Recoger una caja con cita", "Pick up a box by appointment"], ["Para quien trabaja en el horario de la despensa. Elige la fecha y la franja.", "For those who work during pantry hours. Pick the date and time of day."], { dur: DUR30, p: 0.9 }),
  ],
  "NEG-FE-37": [
    it("ayu", "info", ["Ropa para adultos y niños", "Clothing for adults and children"], ["Gratis, sin pedir identificación. Llévate lo que necesites.", "Free, no ID asked. Take what you need."], { core: 1 }),
    it("ayu", "info", ["Abrigos y cobijas de invierno", "Winter coats and blankets"], ["Desde octubre, hasta que se acaben.", "From October, while supplies last."], { core: 1 }),
    it("ayu", "info", ["Zapatos y uniformes escolares", "School shoes and uniforms"], ["En agosto y septiembre, un día por semana.", "In August and September, one day a week."], { p: 0.8 }),
    it("ayu", "fecha", ["Entregar ropa o donaciones", "Drop off clothing or donations"], ["Una cita para entregar donaciones limpias, sin esperar en fila.", "An appointment to drop off clean donations without waiting in line."], { dur: DUR30, core: 1 }),
    it("ayu", "fecha", ["Ropa para una entrevista de trabajo", "Clothing for a job interview"], ["Una cita para escoger ropa de oficina, gratis.", "An appointment to pick office clothing, free."], { dur: DURV, p: 0.8 }),
  ],
  "NEG-FE-38": [
    it("ayu", "info", ["Kit de higiene y comida de emergencia", "Hygiene kit and emergency food"], ["Para quien llega sin nada, el mismo día. Gratis.", "For someone arriving with nothing, same day. Free."], { core: 1 }),
    it("ayu", "info", ["Cama en noches de frío extremo", "Bed on extreme cold nights"], ["De noviembre a marzo, cuando la temperatura baja de 32 grados.", "From November to March, when the temperature drops below 32 degrees."], { p: 0.85 }),
    it("ayu", "fecha", ["Cita de ayuda de emergencia", "Emergency help appointment"], ["Una trabajadora social ve contigo qué ayuda hay: alimentos, ropa, un lugar donde pasar la noche.", "A social worker goes over the help available: food, clothing, a place to stay."], { dur: DURV, core: 1 }),
    it("ayu", "fecha", ["Orientación para encontrar vivienda", "Guidance to find housing"], ["Una cita para ver opciones de vivienda y otras agencias.", "An appointment to review housing options and other agencies."], { dur: DURV, core: 1 }),
    it("ayu", "info", ["Lavandería y duchas", "Laundry and showers"], ["Dos tardes por semana, sin cita.", "Two afternoons a week, no appointment."], { p: 0.7 }),
  ],
  "NEG-FE-39": [
    it("ayu", "fecha", ["Orientación migratoria", "Immigration guidance"], ["Una cita para entender tus opciones y qué papeles reunir. No es asesoría legal individual. Gratis.", "An appointment to understand your options and which papers to gather. Not individual legal advice. Free."], { dur: DURV, core: 1 }),
    it("ayu", "fecha", ["Formularios con una representante acreditada", "Forms with an accredited representative"], ["Cita con una representante acreditada del Departamento de Justicia.", "Appointment with an accredited representative of the Department of Justice."], { dur: DURV, core: 1 }),
    it("gru", "curso", ["Clases de preparación para la ciudadanía", "Citizenship preparation classes"], ["Doce semanas de historia, civismo e inglés, gratis.", "Twelve weeks of history, civics and English, free."], { sem: 12, dows: [2], min: 18 * 60 + 30, seats: 16, dur: ["12 semanas · los martes", "12 weeks · Tuesdays"], p: 0.9 }),
    it("ayu", "info", ["Charla de conoce tus derechos", "Know-your-rights talk"], ["Una charla informativa abierta a todos, una vez al mes.", "An informational talk open to everyone, once a month."], { p: 0.85 }),
    it("ayu", "fecha", ["Cita para encontrar un abogado de confianza", "Appointment to find a trusted attorney"], ["Te damos una lista de abogados y organizaciones reconocidas; desconfía de quien pide dinero sin contrato.", "We give you a list of attorneys and recognized organizations; be wary of anyone asking for money without a contract."], { dur: DUR30, p: 0.8 }),
  ],
  "NEG-FE-40": [
    it("vol", "info", ["Reparto de comida en el barrio", "Neighborhood food delivery"], ["Un equipo lleva cajas a familias que no pueden salir.", "A team takes boxes to families who cannot go out."], { core: 1 }),
    it("vol", "fecha", ["Jornada de limpieza del barrio", "Neighborhood cleanup day"], ["Una mañana de limpieza de una cuadra o un parque. Sumas tu equipo o te unimos a uno.", "A morning cleaning a block or park. Bring your team or we place you in one."], { dur: ["Una mañana · 3 horas", "One morning · 3 hours"], core: 1 }),
    it("vol", "fecha", ["Visita a adultos mayores", "Visits to older adults"], ["Una visita de compañía a quien vive solo.", "A company visit for someone who lives alone."], { dur: DURV, p: 0.9 }),
    it("vol", "info", ["Útiles escolares de agosto", "August school supplies"], ["Mochilas con útiles para niños de la zona, gratis.", "Backpacks with supplies for neighborhood children, free."], { p: 0.8 }),
    it("vol", "fecha", ["Información para un viaje misionero", "Information about a mission trip"], ["Una cita para conocer los viajes del año y cómo ayudar.", "An appointment to learn about this year's trips and how to help."], { dur: DUR30, p: 0.8 }),
  ],
  "NEG-FE-41": [
    it("vol", "fecha", ["Orientación para nuevos voluntarios", "New volunteer orientation"], ["Una cita para conocer las tareas y elegir tu turno.", "An appointment to learn the tasks and pick your shift."], { dur: DURV, core: 1 }),
    it("vol", "info", ["Turno de cocina de la despensa", "Pantry kitchen shift"], ["Los sábados por la mañana, ayuda a preparar y servir.", "On Saturday mornings, help prepare and serve."], { core: 1 }),
    it("vol", "info", ["Turno de reparto de cajas", "Box delivery shift"], ["Entrega de cajas con tu carro, una vez al mes.", "Deliver boxes with your car, once a month."], { p: 0.85 }),
    it("vol", "curso", ["Capacitación para voluntarios", "Volunteer training"], ["Dos semanas de capacitación en seguridad alimentaria y trato respetuoso.", "Two weeks of food safety and respectful service training."], { sem: 2, dows: [6], min: 10 * 60, seats: 16, dur: ["2 semanas · los sábados", "2 weeks · Saturdays"], p: 0.9 }),
    it("vol", "fecha", ["Voluntariado para estudiantes (horas de servicio)", "Student volunteering (service hours)"], ["Una cita para estudiantes que necesitan horas comunitarias.", "An appointment for students who need community service hours."], { dur: DURV, p: 0.8 }),
  ],
};

const P_ = (es, en, d1, d2, c) => it("pro", "info", [es, en], [d1, d2], { c, tienda: 1 });
const TIENDA = {
  "NEG-FE-42": [
    P_("Biblia en español, edición familiar", "Family Bible in Spanish", "Tapa dura, letra grande.", "Hardcover, large print.", 24),
    P_("Biblia de bolsillo", "Pocket Bible", "Para llevar a todas partes.", "To take everywhere.", 10),
    P_("Rosario de madera", "Wooden rosary", "Cuentas de madera, cruz sencilla.", "Wooden beads, simple cross.", 8),
    P_("Vela de oración", "Prayer candle", "Vela en vaso, unas 60 horas.", "Candle in a glass, about 60 hours.", 4),
    P_("Cruz para el hogar", "Cross for the home", "De madera, para colgar.", "Wooden, for hanging.", 15),
    P_("Libro de oraciones", "Prayer book", "Oraciones de cada día, en español.", "Daily prayers, in Spanish.", 12),
    P_("Imagen enmarcada", "Framed image", "Imagen devocional en marco de madera.", "Devotional image in a wooden frame.", 18),
    P_("Tarjetas para bautizo y primera comunión", "Cards for baptism and first communion", "Paquete de diez tarjetas con sobre.", "Pack of ten cards with envelopes.", 9),
    P_("Biblia para niños ilustrada", "Illustrated children's Bible", "Historias cortas con dibujos.", "Short stories with drawings.", 14),
    P_("Velas de iglesia (caja)", "Church candles (box)", "Caja de 12 velas blancas.", "Box of 12 white candles.", 16),
  ],
  "NEG-FE-43": [
    P_("Vela de siete días", "Seven-day candle", "Vela en vaso de vidrio.", "Candle in a glass jar.", 6),
    P_("Incienso (caja)", "Incense (box)", "Caja de varitas de incienso.", "Box of incense sticks.", 5),
    P_("Figura decorativa para el hogar", "Decorative figure for the home", "Figura de yeso pintada a mano.", "Hand-painted plaster figure.", 22),
    P_("Collar de cuentas", "Beaded necklace", "Artesanía de cuentas de colores.", "Colorful beaded craft.", 12),
    P_("Hierbas secas para té (bolsa)", "Dried herbs for tea (bag)", "Para infusiones de uso culinario; no sustituyen consejo médico.", "For culinary infusions; they do not replace medical advice.", 5),
    P_("Libro sobre tradiciones y costumbres", "Book on traditions and customs", "Historia y costumbres de la cultura del Caribe.", "History and customs of Caribbean culture.", 18),
    P_("Agua de colonia", "Cologne water", "Frasco de 8 onzas.", "8-ounce bottle.", 9),
    P_("Altar pequeño para el hogar", "Small home altar", "Repisa de madera con espacio para velas.", "Wooden shelf with space for candles.", 35),
    P_("Velas de colores (paquete)", "Colored candles (pack)", "Paquete de seis velas pequeñas.", "Pack of six small candles.", 8),
    P_("Platos y vasitos para ofrendas", "Plates and cups for offerings", "Juego de cerámica sencillo.", "Simple ceramic set.", 14),
  ],
};
export const ITEMS = { ...CULTO, ...GRUPO, ...SACR, ...CONSEJO, ...FUN, ...ORACION, ...AYUDA, ...TIENDA };

/* Horarios de la semana: día(s), minuto(s), nombre es/en, idioma, tipo, probabilidad. Un día y hora no se repiten. */
const W = (d, m, es, en, lang, kind, p = 1) => ({ d, m, es, en, lang, kind, p });
const CULTO_W = [W(0, [600, 660], "Culto dominical", "Sunday service", "es", "culto"), W(0, 750, "Culto en inglés", "English service", "en", "culto", 0.5), W([3, 2], 1170, "Oración y estudio", "Prayer and study", "es", "oracion"), W(5, 1170, "Jóvenes", "Youth", "es", "grupo")];
export const WORSHIP = {
  "NEG-FE-06": CULTO_W, "NEG-FE-08": CULTO_W,
  "NEG-FE-07": [W(6, 570, "Escuela sabática", "Sabbath school", "es", "grupo"), W(6, 660, "Culto de sábado", "Saturday service", "es", "culto"), W(3, 1170, "Oración de miércoles", "Wednesday prayer", "es", "oracion"), W(5, 1140, "Bienvenida del sábado", "Sabbath welcome", "es", "oracion", 0.6)],
  "NEG-FE-09": [W([6, 0], 600, "Reunión del fin de semana", "Weekend meeting", "es", "culto"), W([4, 2], 1170, "Reunión de entre semana", "Midweek meeting", "es", "culto"), W(0, 840, "Reunión en inglés", "English meeting", "en", "culto", 0.4)],
  "NEG-FE-10": [W(0, [540, 600], "Reunión sacramental", "Sacrament meeting", "es", "culto"), W(0, 680, "Escuela dominical y clases", "Sunday school and classes", "es", "grupo"), W(3, 1140, "Actividad de jóvenes", "Youth activity", "es", "grupo")],
  "NEG-FE-11": [W(6, 1080, "Vísperas", "Vespers", "es", "oracion"), W(0, 570, "Divina Liturgia", "Divine Liturgy", "es", "misa"), W(0, 690, "Divina Liturgia en inglés", "Divine Liturgy in English", "en", "misa", 0.6)],
  "NEG-FE-12": [W(5, 795, "Oración del viernes (Yumu'a)", "Friday prayer (Jumu'ah)", "bil", "culto"), W(6, 660, "Clase de estudio", "Study class", "es", "grupo"), W(0, 960, "Clase para familias", "Family class", "es", "grupo", 0.7)],
  "NEG-FE-13": [W(5, 1140, "Servicio de Shabat (viernes)", "Shabbat service (Friday)", "bil", "culto"), W(6, 570, "Servicio de Shabat (sábado)", "Shabbat service (Saturday)", "bil", "culto"), W(0, 600, "Escuela hebrea", "Hebrew school", "en", "grupo", 0.7)],
  "NEG-FE-14": [W(3, 1170, "Reunión del ministerio", "Ministry meeting", "es", "grupo"), W(6, 600, "Visitas y servicio", "Visits and service", "es", "grupo", 0.7), W(2, 1110, "Oración del ministerio", "Ministry prayer", "es", "oracion", 0.7)],
  "NEG-FE-15": [W(5, [1170, 1140], "Reunión de jóvenes", "Youth meeting", "es", "grupo"), W(6, 960, "Servicio comunitario", "Community service", "es", "grupo", 0.7), W(2, 1110, "Oración de jóvenes", "Youth prayer", "es", "oracion", 0.5)],
  "NEG-FE-16": [W(6, 600, "Reunión de damas", "Women's meeting", "es", "grupo"), W(3, 1170, "Oración de damas", "Women's prayer", "es", "oracion", 0.7), W(4, 1020, "Taller de damas", "Women's workshop", "es", "grupo", 0.6)],
  "NEG-FE-17": [W(6, 540, "Desayuno de varones", "Men's breakfast", "es", "grupo"), W(4, 1170, "Estudio de varones", "Men's study", "es", "grupo", 0.8), W(2, 1110, "Oración de varones", "Men's prayer", "es", "oracion", 0.5)],
  "NEG-FE-18": [W(4, 1170, "Ensayo del coro", "Choir rehearsal", "es", "grupo"), W(6, 600, "Clase de música", "Music class", "es", "grupo", 0.8), W(0, 570, "Calentamiento de voces", "Vocal warm-up", "es", "grupo", 0.6)],
  "NEG-FE-19": [W(2, 1170, "Célula del martes", "Tuesday cell", "es", "grupo"), W(4, 1170, "Célula del jueves", "Thursday cell", "es", "grupo"), W(6, 1020, "Célula de familias", "Family cell", "es", "grupo", 0.7), W(3, 1110, "Estudio en línea", "Online study", "es", "grupo", 0.5)],
  "NEG-FE-20": [W(0, 570, "Escuela dominical", "Sunday school", "es", "grupo"), W(0, 660, "Clase de adultos", "Adult class", "es", "grupo", 0.8), W(3, 1110, "Escuela bíblica de miércoles", "Wednesday Bible school", "es", "grupo", 0.5)],
  "NEG-FE-21": [W(6, 600, "Catequesis para niños", "Children's catechesis", "es", "grupo"), W(3, 1170, "Catequesis para adultos", "Adult catechesis", "es", "grupo"), W(0, 600, "Misa dominical", "Sunday Mass", "es", "misa", 0.8)],
  "NEG-FE-22": [W(6, 600, "Charla de bautizo", "Baptism talk", "es", "grupo"), W(0, 780, "Bautizos del domingo", "Sunday baptisms", "es", "grupo", 0.8), W(0, 600, "Misa dominical", "Sunday Mass", "es", "misa", 0.7)],
  "NEG-FE-23": [W(6, 600, "Clase de primera comunión", "First communion class", "es", "grupo"), W(0, 660, "Clase de confirmación", "Confirmation class", "es", "grupo"), W(0, 540, "Misa de familia", "Family Mass", "es", "misa", 0.8)],
  "NEG-FE-24": [W(6, 600, "Charla de quinceañeras", "Quinceañera talks", "es", "grupo"), W(5, 1110, "Ensayo de quinceañeras", "Quinceañera rehearsal", "es", "grupo", 0.7), W(6, 1080, "Misa de la tarde", "Evening Mass", "es", "misa", 0.8)],
  "NEG-FE-25": [W(6, 600, "Charla para parejas", "Talk for couples", "es", "grupo"), W(5, 1110, "Ensayo de bodas", "Wedding rehearsal", "es", "grupo", 0.7), W(0, 600, "Misa dominical", "Sunday Mass", "es", "misa", 0.6)],
  "NEG-FE-26": [W(4, 1170, "Taller para parejas", "Workshop for couples", "es", "grupo", 0.8), W(6, 600, "Charla de familia", "Family talk", "es", "grupo", 0.6)],
  "NEG-FE-27": [W(2, 1170, "Grupo de apoyo", "Support group", "es", "grupo"), W(4, 1110, "Oración de acompañamiento", "Companionship prayer", "es", "oracion", 0.6)],
  "NEG-FE-28": [W(2, 1170, "Reunión de recuperación", "Recovery meeting", "es", "grupo"), W(4, 1170, "Reunión de seguimiento", "Follow-up meeting", "es", "grupo"), W(6, 1080, "Reunión de familiares", "Family members meeting", "es", "grupo", 0.7)],
  "NEG-FE-34": [W([1, 3], 1110, "Oración por teléfono", "Prayer by phone", "es", "oracion"), W(5, 1020, "Oración en el hospital", "Hospital prayer", "es", "oracion", 0.7)],
  "NEG-FE-35": [W([1, 2], 1170, "Línea de oración (llamadas)", "Prayer line (calls)", "es", "oracion"), W(5, 1020, "Línea de oración (mensajes)", "Prayer line (messages)", "es", "oracion"), W(6, 600, "Línea de oración (mañana)", "Prayer line (morning)", "es", "oracion", 0.8)],
};
