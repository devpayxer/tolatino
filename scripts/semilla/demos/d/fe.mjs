// NEG-FE · 5 subcategorías principales: parroquia católica, misa en español, iglesia evangélica, pentecostal y bautista.
// Nada de dinero en los flujos de ayuda (donativo sugerido o gratis, depósito siempre 0) y ninguna foto de menores.
import { rng, bi, usd, addDays, withTime, ymd, ANCHOR_D, H, horario, s, n, j, CIUDADES, fechasEnvio } from "./comun.mjs";
import { negociosBase, fichaComun, novedades, ponerResenas, cicloClientes } from "./base.mjs";
import { sqlItems } from "./items.mjs";
import { cohortes, matriculas, sqlGrupos, sqlGrupoDeMatricula, etiqueta } from "./grupos.mjs";

export const SUBS = [
  { id: "NEG-FE-01", es: "Parroquia católica", en: "Catholic parish", also: "NEG-FE-21", kind: "misa", names: ["Parroquia San Judas Tadeo", "Parroquia Nuestra Señora de la Altagracia", "Parroquia Santa Rosa de Lima", "Parroquia San Miguel Arcángel", "Parroquia Sagrado Corazón", "Parroquia Santa Teresita", "Parroquia San Antonio de Padua", "Parroquia Nuestra Señora de Guadalupe", "Parroquia San Juan Diego", "Parroquia Santa Cecilia"] },
  { id: "NEG-FE-02", es: "Misa en español", en: "Spanish-language Mass", also: "NEG-FE-01", kind: "misa", names: ["Comunidad San José Obrero", "Capilla de la Virgen de Guadalupe", "Misa Hispana San Pedro", "Comunidad Nuestra Señora del Carmen", "Capilla San Martín de Porres", "Misa en Español Santa Ana", "Comunidad Hispana San Felipe", "Capilla Virgen de la Caridad", "Comunidad San Lucas", "Misa Hispana Santa María"] },
  { id: "NEG-FE-03", es: "Iglesia evangélica", en: "Evangelical church", also: "NEG-FE-14", kind: "culto", names: ["Iglesia Evangélica Casa de Oración", "Iglesia Cristiana Nueva Esperanza", "Iglesia Evangélica Monte Sinaí", "Iglesia Evangélica Luz del Mundo Hispano", "Iglesia Evangélica Fuente de Vida", "Iglesia Evangélica Roca Eterna", "Iglesia Evangélica Camino de Fe", "Iglesia Evangélica Pan de Vida", "Iglesia Evangélica El Buen Pastor", "Iglesia Evangélica Renacer"] },
  { id: "NEG-FE-04", es: "Iglesia pentecostal", en: "Pentecostal church", also: "NEG-FE-18", kind: "culto", names: ["Iglesia Pentecostal Fuego Nuevo", "Iglesia Pentecostal Río de Vida", "Iglesia Pentecostal Dios Habla", "Iglesia Pentecostal Torre Fuerte", "Iglesia Pentecostal Santa Unción", "Iglesia Pentecostal Aposento Alto", "Iglesia Pentecostal Manantial", "Iglesia Pentecostal Cristo Vive", "Iglesia Pentecostal Casa de Júbilo", "Iglesia Pentecostal Monte Carmelo"] },
  { id: "NEG-FE-05", es: "Iglesia bautista", en: "Baptist church", also: "NEG-FE-19", kind: "culto", names: ["Iglesia Bautista Betania", "Iglesia Bautista Getsemaní", "Iglesia Bautista Esperanza Viva", "Iglesia Bautista del Calvario", "Iglesia Bautista Siloé", "Iglesia Bautista Emmanuel", "Iglesia Bautista Ebenezer", "Iglesia Bautista Filadelfia", "Iglesia Bautista Hispana Central", "Iglesia Bautista Mi Refugio"] },
];

const G = (fe) => ({ fe });
/* Servicios por subcategoría: [sección, tipo, [es,en], [descr es,en], donativo $, atributos, grupo?] */
const CAT = {
  catolica: [
    ["Misas", "Masses", "clase", ["Misa en español", "Spanish Mass"], ["Fines de semana; los horarios exactos están en «Horario».", "Weekends; exact times are under “Hours”."], 0, G("gratis")],
    ["Misas", "Masses", "clase", ["Misa en inglés", "English Mass"], ["Domingo por la mañana.", "Sunday morning."], 0, G("gratis")],
    ["Sacramentos y celebraciones", "Sacraments and celebrations", "clase", ["Bautizo", "Baptism"], ["Charla de preparación para padres y padrinos, un sábado al mes. Donativo sugerido.", "Preparation talk for parents and godparents, one Saturday a month. Suggested donation."], 40, G("don"), { charla: true }],
    ["Sacramentos y celebraciones", "Sacraments and celebrations", "curso", ["Primera comunión y confirmación", "First communion and confirmation"], ["Un año de catequesis, los sábados por la mañana.", "A year of catechesis, Saturday mornings."], 0, { fe: "gratis", sem: 40, dur: bi("1 año · los sábados", "1 year · Saturdays") }, { curso: true, sem: 40 }],
    ["Sacramentos y celebraciones", "Sacraments and celebrations", "clase", ["Misa de quinceañera", "Quinceañera Mass"], ["Se pide la fecha con seis meses de anticipación. Dos charlas para la quinceañera y sus padres. Donativo sugerido.", "Ask for the date six months ahead. Two talks for the girl and her parents. Suggested donation."], 150, G("don"), { charla: true }],
    ["Sacramentos y celebraciones", "Sacraments and celebrations", "clase", ["Boda religiosa", "Church wedding"], ["Seis meses de preparación con charlas para la pareja. Donativo sugerido.", "Six months of preparation with talks for the couple. Suggested donation."], 300, G("don"), { charla: true }],
    ["Grupos y ministerios", "Groups and ministries", "clase", ["Ministerio juvenil", "Youth ministry"], ["Reunión semanal de jóvenes con oración y servicio.", "Weekly youth meeting with prayer and service."], 0, G("gratis")],
    ["Grupos y ministerios", "Groups and ministries", "curso", ["Catequesis para adultos", "Adult catechesis"], ["Para quien quiere prepararse para un sacramento o conocer la fe.", "For anyone preparing for a sacrament or learning the faith."], 0, { fe: "gratis", sem: 20, dur: bi("20 semanas · los miércoles", "20 weeks · Wednesdays") }, { curso: true, sem: 20 }],
  ],
  evang: [
    ["Cultos", "Services", "clase", ["Culto dominical", "Sunday service"], ["Alabanza, mensaje y oración. Todos son bienvenidos.", "Worship, message and prayer. Everyone is welcome."], 0, G("gratis")],
    ["Cultos", "Services", "clase", ["Oración de media semana", "Midweek prayer"], ["Un tiempo de oración y estudio entre semana.", "A time of prayer and study during the week."], 0, G("gratis")],
    ["Celebraciones", "Celebrations", "clase", ["Bautismo en agua", "Water baptism"], ["Una charla previa y la fecha del bautismo. Sin costo.", "A prior talk and the baptism date. No cost."], 0, G("gratis"), { charla: true }],
    ["Celebraciones", "Celebrations", "clase", ["Boda", "Wedding"], ["Consejería previa para la pareja y la ceremonia. Donativo sugerido.", "Pre-marriage counseling and the ceremony. Suggested donation."], 200, G("don"), { charla: true }],
    ["Grupos y ministerios", "Groups and ministries", "curso", ["Escuela bíblica para nuevos creyentes", "Bible school for new believers"], ["Ocho semanas para conocer lo básico de la fe.", "Eight weeks to learn the basics of the faith."], 0, { fe: "gratis", sem: 8, dur: bi("8 semanas · los domingos", "8 weeks · Sundays") }, { curso: true, sem: 8 }],
    ["Grupos y ministerios", "Groups and ministries", "clase", ["Ministerio de damas", "Women's ministry"], ["Reunión mensual de mujeres con estudio y convivio.", "Monthly gathering of women with study and fellowship."], 0, G("gratis")],
    ["Grupos y ministerios", "Groups and ministries", "clase", ["Ministerio de varones", "Men's ministry"], ["Desayuno y estudio un sábado al mes.", "Breakfast and study one Saturday a month."], 0, G("gratis")],
    ["Grupos y ministerios", "Groups and ministries", "clase", ["Ministerio juvenil", "Youth ministry"], ["Jóvenes los viernes por la noche, con música y mensaje.", "Youth on Friday nights, with music and a message."], 0, G("gratis")],
  ],
};
CAT.pent = [CAT.evang[0], ["Cultos", "Services", "clase", ["Noche de oración y ayuno", "Night of prayer and fasting"], ["Una noche de oración al mes.", "One night of prayer a month."], 0, G("gratis")], ...CAT.evang.slice(2)];
CAT.bau = [CAT.evang[0], ["Cultos", "Services", "clase", ["Estudio bíblico de miércoles", "Wednesday Bible study"], ["Estudio de un libro de la Biblia, con preguntas.", "Study of a book of the Bible, with questions."], 0, G("gratis")], ...CAT.evang.slice(2)];
const TIPO = { "NEG-FE-01": "catolica", "NEG-FE-02": "catolica", "NEG-FE-03": "evang", "NEG-FE-04": "pent", "NEG-FE-05": "bau" };

const P = {
  pos: { es: ["Nos recibieron con cariño desde la primera visita y nos explicaron todo sin prisa.", "Las charlas de preparación fueron claras y bien organizadas; se nota el cuidado.", "El servicio es en español y se siente comunidad; mi familia se integró enseguida.", "Pedí la fecha por la app y me contestaron pronto, con los pasos que faltaban.", "Todo es gratuito o con un donativo que cada quien da si puede; nunca nos presionaron.", "Los coordinadores son pacientes y responden las dudas de los padres.", "Un lugar tranquilo y respetuoso. Me sentí bienvenida desde el primer día.", "Las clases de preparación empezaron puntual y los materiales eran claros."], en: ["They welcomed us warmly from the first visit and explained everything without rushing.", "The preparation talks were clear and well organized; the care shows.", "The service is in Spanish and there is a real sense of community; my family joined in right away.", "I asked for the date in the app and they answered soon, with the steps still missing.", "Everything is free or with a donation each person gives if they can; they never pressured us.", "The coordinators are patient and answer parents' questions.", "A calm and respectful place. I felt welcome from the first day.", "Preparation classes started on time and the materials were clear."] },
  mid: { es: ["Buena comunidad; la fecha tardó en confirmarse.", "Las charlas estuvieron bien, aunque el salón es algo pequeño.", "Nos atendieron bien, solo faltó recordarnos la fecha."], en: ["Good community; the date took a while to be confirmed.", "The talks were fine, although the room is a bit small.", "They treated us well, they just should have reminded us of the date."] },
  neg: { es: ["Tardaron mucho en responder y la fecha cambió dos veces.", "No quedó claro qué documentos pedían y tuvimos que ir varias veces.", "Esperaba más organización en las charlas."], en: ["They took long to reply and the date changed twice.", "It was not clear which documents they wanted and we had to go several times.", "I expected more organization in the talks."] },
  cierre: { es: ["Dios los bendiga.", "Muy agradecidos.", "Los recomiendo a otras familias."], en: ["God bless you.", "Very grateful.", "I recommend them to other families."] },
  cierreNeg: { es: ["Espero que lo mejoren.", "", ""], en: ["I hope they improve this.", "", ""] },
  faqs: [
    { q: bi("¿Se cobra por los servicios?", "Is there a charge for services?"), a: bi("La ayuda de la iglesia es gratis. Para sacramentos y celebraciones hay un donativo sugerido; si no puedes, no se cobra.", "Church help is free. For sacraments and celebrations there is a suggested donation; if you cannot, nothing is charged.") },
    { q: bi("¿Cómo pido una fecha o me inscribo?", "How do I ask for a date or sign up?"), a: bi("Elige el servicio y la fecha, y envía la solicitud. La iglesia responde y te dice los pasos que faltan. En la app no se paga nada.", "Pick the service and date and send the request. The church replies and tells you the missing steps. Nothing is paid in the app.") },
    { q: bi("¿Hay servicio en español?", "Is there a service in Spanish?"), a: bi("Sí. Los horarios en español están en «Horario» y en la sección de servicios.", "Yes. Spanish times are under “Hours” and in the services section.") },
    { q: bi("¿Necesito documentos para la ayuda de alimentos o ropa?", "Do I need documents for food or clothing help?"), a: bi("No pedimos identificación para la despensa ni la ropa. Pasa en el horario de ayuda.", "We do not ask for ID for the pantry or clothing. Come by during help hours.") },
    { q: bi("¿Puedo ir con mis hijos?", "Can I come with my children?"), a: bi("Claro. Las familias son bienvenidas y hay actividades para los niños durante el servicio.", "Of course. Families are welcome and there are activities for children during the service.") },
    { q: bi("¿Dónde se estaciona?", "Where do I park?"), a: bi("Hay estacionamiento junto a la iglesia y en la calle.", "There is parking next to the church and on the street.") },
  ],
  team: [
    { role: bi("Pastor", "Pastor"), bio: bi("Guía los servicios y atiende a las familias.", "Leads services and cares for families."), spec: [] },
    { role: bi("Coordinadora de catequesis", "Catechesis coordinator"), bio: bi("Organiza los grupos de preparación.", "Organizes preparation groups."), spec: [] },
    { role: bi("Director de alabanza", "Worship leader"), bio: bi("Dirige la música de los servicios.", "Leads the music of the services."), spec: [] },
    { role: bi("Secretaria", "Office secretary"), bio: bi("Atiende las solicitudes de fechas.", "Handles date requests."), spec: [] },
  ],
  posts: [
    { kind: "novedad", title: "Despensa de alimentos el segundo sábado", body: "Gratis para quien lo necesite, sin pedir identificación. De 9 a 11 de la mañana." },
    { kind: "novedad", title: "Abrimos inscripciones de catequesis", body: "Los grupos nuevos empiezan pronto. Pide tu lugar desde la ficha." },
    { kind: "encuesta", title: "¿Qué horario te sirve para el estudio bíblico?", body: "Queremos abrir otro grupo.", poll: ["Miércoles en la noche", "Sábado en la mañana", "Domingo después del servicio", "Entre semana de día"] },
    { kind: "novedad", title: "Colecta de ropa para el invierno", body: "Recibimos abrigos y cobijas limpias; la ropa se reparte gratis." },
    { kind: "novedad", title: "Retiro de matrimonios", body: "Un día de reflexión para parejas. Cupo limitado, sin costo." },
    { kind: "novedad", title: "Nuevo horario de servicio en español", body: "Agregamos un servicio más en español. Los horarios están en la ficha." },
    { kind: "novedad", title: "Gracias a los voluntarios", body: "Gracias a quienes sirven cada semana en la cocina, la música y la limpieza." },
    { kind: "novedad", title: "Cerramos el lunes por mantenimiento", body: "La oficina vuelve a abrir el martes. Los servicios no cambian." },
  ],
};

const DOW = [["Dom", "Sun"], ["Lun", "Mon"], ["Mar", "Tue"], ["Mié", "Wed"], ["Jue", "Thu"], ["Vie", "Fri"], ["Sáb", "Sat"]];
function horariosCulto(r, S) {
  const w = [];
  if (S.kind === "misa") {
    w.push([6, 17 * 60, bi("Misa en español", "Spanish Mass"), "es", "misa"], [0, r.pick([540, 600, 660]), bi("Misa en español", "Spanish Mass"), "es", "misa"]);
    if (r.chance(0.7)) w.push([0, 480, bi("Misa en inglés", "English Mass"), "en", "misa"]);
    if (r.chance(0.5)) w.push([r.pick([2, 3, 4]), 19 * 60, bi("Misa entre semana", "Weekday Mass"), "es", "misa"]);
    w.push([r.pick([3, 4]), 19 * 60 + 30, bi("Grupo de oración", "Prayer group"), "es", "oracion"]);
  } else {
    w.push([0, r.pick([600, 660, 720]), bi("Culto dominical", "Sunday service"), "es", "culto"]);
    w.push([r.pick([3, 2]), 19 * 60 + 30, bi("Oración y estudio", "Prayer and study"), "es", "oracion"]);
    w.push([5, 19 * 60 + 30, bi("Jóvenes", "Youth"), "es", "grupo"]);
    if (r.chance(0.5)) w.push([0, 18 * 60, bi("Culto en inglés", "English service"), "en", "culto"]);
  }
  return w;
}

export function generar() {
  const negocios = negociosBase("FE", "NEG-FE", SUBS, {
    ficha(b, S, r) {
      const cat = CAT[TIPO[S.id]], items = []; let k = 0;
      const lista = cat.filter((row, i) => i < 2 || row[2] === "curso" || r.chance(0.8));
      const used = new Set();
      lista.forEach((row) => { const nm = row[3][0]; if (used.has(nm)) return; used.add(nm); const a = row[6] || {}, dona = a.fe === "don" ? Math.round((row[5] * (0.85 + r.f() * 0.3)) / 500) * 500 : 0;
        items.push({ sec: bi(row[0], row[1]), secSort: [...new Set(cat.map((x) => x[0]))].indexOf(row[0]), name: bi(row[3][0], row[3][1]), descr: bi(row[4][0], row[4][1]), cents: dona, dur: 60, kind: row[2], attrs: { ...a, ...(row[2] === "curso" ? {} : {}) }, pfrom: false, photo: b.pics[k % b.pics.length], sort: k++, dep: 0, charla: !!(row[7] || {}).charla, cur: row[7] && row[7].curso ? row[7].sem : 0 }); });
      b.items = items;
      b.worship = horariosCulto(r, S);
      b.fe = { kind: S.kind, bil: b.worship.some((w) => w[3] === "en"), help: r.sample(["despensa", "ropa", "transporte", "jovenes", "ninos", "bodas"], r.i(1, 3)), sinid: r.chance(0.6), freq: r.pick(["semana", "quince", "mes"]) };
      b.radius = null; b.fromHome = false; b.languages = b.fe.bil ? ["es", "en"] : ["es"];
      const quien = S.kind === "misa" ? "una comunidad católica" : "una comunidad cristiana";
      b.about = bi(`${b.name} es ${quien} de ${CIUDADES[b.city].n} desde ${b.founded}. Servicios en español${b.fe.bil ? " e inglés" : ""}, grupos de preparación, ministerios para jóvenes, damas y varones, y ayuda a quien la necesita. La ayuda de la iglesia es gratis; para sacramentos y celebraciones hay un donativo sugerido, y si no puedes, no se cobra.`, `${b.name} is a ${S.kind === "misa" ? "Catholic" : "Christian"} community in ${CIUDADES[b.city].n} since ${b.founded}. Services in Spanish${b.fe.bil ? " and English" : ""}, preparation groups, youth, women's and men's ministries, and help for those who need it. Church help is free; for sacraments and celebrations there is a suggested donation, and if you cannot, nothing is charged.`);
      b.amenities = ["estacionamiento", "accesible", "para-ninos", ...(b.fe.help.includes("despensa") ? ["despensa"] : []), ...(b.fe.help.includes("jovenes") ? ["para-jovenes"] : []), ...(b.fe.help.includes("transporte") ? ["transporte"] : [])];
      b.hours = horario(H.todos("09:00", "20:00").map((x, i) => (i === 1 ? null : i === 0 ? [["08:00", "13:30"]] : x)));
      const fv = ["esp", ...(S.kind === "misa" ? ["misaesp"] : []), ...(b.fe.bil ? ["bil"] : []), ...b.fe.help.filter((x) => ["despensa", "transporte"].includes(x)), ...(b.fe.help.includes("jovenes") ? ["jovenes"] : []), ...(b.fe.help.includes("bodas") ? ["bodas"] : []), ...(b.fe.sinid ? ["sinid"] : []), ...(S.kind === "misa" ? ["catolica"] : [])];
      if (b.founded <= 2016) fv.push("y10"); b.filters = fv;
      b.modules = ["svc"]; b.licenses = [{ kind: "irs_501c3", title: bi("Organización sin fines de lucro 501(c)(3)", "Nonprofit organization 501(c)(3)"), num: `PRUEBA-${r.i(100000, 999999)}`, review: addDays(ANCHOR_D, r.i(60, 330)) }];
      b.attrs = { m: "shop", tarjeta: {} };
      fichaComun(b, P);
    },
  });
  for (const b of negocios) novedades(b, P, []);
  const ops = [], grupos = [], seq = { n: 0 }, wt = [];
  for (const b of negocios) {
    const r = rng(`ops:${b.id}`), next = cicloClientes(r), target = Math.round(22 + b.vol * b.vol * 56);
    const cur = b.items.filter((x) => x.cur), cha = b.items.filter((x) => x.charla);
    const gs = cohortes(r, Math.max(2016, b.founded), cur.map((c) => ({ name: c.name.es, sem: c.cur, dows: [6], min: 600, dur: 120, seats: r.i(8, 16) })), 6);
    // charlas: una fecha a la vez, muchas a lo largo de los años
    for (const c of cha) { const fechas = fechasEnvio(r, Math.round((target * 1.4) / (cha.length * 6)) + 3, Math.max(2016, b.founded), -50); let last = null; for (const d0 of fechas) { const d = withTime(addDays(d0, ((6 - d0.getUTCDay()) + 7) % 7), 0); if (last && (d - last) / 86400000 < 20) continue; last = d; const estado = d > ANCHOR_D ? "open" : "finished"; gs.push({ item: c.name.es, starts: d, ends: d, dows: [], min: 600, dur: 120, seats: r.i(6, 12), estado, label: etiqueta(d, estado, "charla"), booked: 0 }); }
      if (!gs.some((g) => g.item === c.name.es && g.estado === "open")) { const d = addDays(ANCHOR_D, r.i(7, 30)); const dd = addDays(d, ((6 - d.getUTCDay()) + 7) % 7); gs.push({ item: c.name.es, starts: dd, ends: dd, dows: [], min: 600, dur: 120, seats: r.i(6, 12), estado: "open", label: etiqueta(dd, "open", "charla"), booked: 0 }); } }
    gs.forEach((g) => (g.b = b.id));
    const itemOf = (g) => b.items.find((x) => x.name.es === g.item);
    const os = matriculas(r, b, gs, next, seq, {
      num: 7500000 + 20000 * Math.floor(b.gi / 10), fill: [[0.2, 0.55], [0.15, 0.4]], fe: true,
      item: (g) => { const it = itemOf(g); return { name: it.name.es, lname: it.name, cents: it.cents, kind: it.kind, attrs: it.attrs }; }, mat: () => 0,
      det: (g, c, it) => ({ rubro: "fe", k: it.kind, item_id: null, svc: it.lname, group_id: null, band_id: null, group: g.label, starts_on: ymd(g.starts), ends_on: g.ends ? ymd(g.ends) : null, start_min: g.min, dows: g.dows, for: "yo", guardian_ok: false, level: null, team_name: null, price_cents: 0, mat_cents: 0, mat_app: 0, plan_n: null, cert: null, cert_by: null, oficial: false, no: [], contract_m: 0, cancel_fee_cents: 0, g1: false, sms: true, neutro: false, cuidado: false }),
    });
    ops.push(...os); grupos.push(...gs);
    ponerResenas(r, P, (rr, st) => ({ trato: st >= 4 ? 1 : st === 3 ? 0 : -1, gratis: st >= 3 ? 1 : -1, espanol: 1, ayudaron: st >= 4 ? 1 : 0, empezo: st >= 4 ? "a" : st === 3 ? "b" : "c", bienvenido: st >= 4 ? 1 : -1 }), os, target);
    for (const w of b.worship) wt.push({ b: b.id, dow: w[0], min: w[1], label: w[2], lang: w[3], kind: w[4] });
  }
  const extra = [...sqlItems(negocios)];
  extra.push(`create temp table _fs (b text, kind text, bil boolean, help text[], sinid boolean, freq text) on commit drop;`, `insert into _fs values ${negocios.map((b) => `(${s(b.id)}, ${s(b.fe.kind)}, ${b.fe.bil}, array[${b.fe.help.map(s).join(",")}]::text[], ${b.fe.sinid}, ${s(b.fe.freq)})`).join(",\n")};`);
  extra.push(`insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
select x.b, bz.city_id, x.kind, x.bil, x.help, x.sinid, x.freq, false, 0, '5–7', true from _fs x join businesses bz on bz.id = x.b on conflict (business_id) do nothing;`);
  extra.push(`create temp table _wt (b text, dow int, mn int, label jsonb, lang text, kind text, srt int) on commit drop;`, `insert into _wt values ${wt.map((w, i) => `(${s(w.b)}, ${w.dow}, ${w.min}, ${j(w.label)}, ${s(w.lang)}, ${s(w.kind)}, ${i % 9})`).join(",\n")};`);
  extra.push(`insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select x.b, bz.city_id, x.dow, x.mn, x.label, x.lang, x.kind, x.srt from _wt x join businesses bz on bz.id = x.b
 where not exists (select 1 from worship_times w where w.business_id = x.b and w.dow = x.dow and w.start_min = x.mn and w.removed_at is null);`);
  extra.push(...sqlGrupos(negocios, grupos));
  return { negocios, ops, extra, after: sqlGrupoDeMatricula(ops), cat: "NEG-FE", file: "demo-d-fe.sql" };
}
