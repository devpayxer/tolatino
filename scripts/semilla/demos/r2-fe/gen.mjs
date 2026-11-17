// NEG-FE ronda 2: arma los 380 negocios (subcategorías 06..43, 10 por cada una, 2 por ciudad), su historia y el SQL (que arma sqlComun del grupo D).
import { rng, bi, ymd, addDays, withTime, ANCHOR_D, H, horario, s, n, j, ts, dateLit, CIUDADES, CLIENTES, CITY_IDS, NOMBRES_F, NOMBRES_M, APELLIDOS, fechasEnvio, uuidOf } from "../d/comun.mjs";
import { negociosBase, fichaComun, novedades, ponerResenas, cicloClientes, resena } from "../d/base.mjs";
import { sqlItems } from "../d/items.mjs";
import { cohortes, matriculas, sqlGrupos, etiqueta } from "../d/grupos.mjs";
import { SUBS } from "./subs.mjs";
import { ITEMS, WORSHIP } from "./catalogo.mjs";
import { PACKS } from "./textos.mjs";

/* ── Clientes de esta ronda: +1 717 555 4800…5099 (300) ── */
CLIENTES.length = 0;
{ const r = rng("clientes-r2fe"); for (let k = 4800; k <= 5099; k++) { const f = r.chance(0.55); CLIENTES.push({ phone: `+1717555${k}`, first: r.pick(f ? NOMBRES_F : NOMBRES_M), last: r.pick(APELLIDOS), city: r.pick(CITY_IDS) }); } }
const OWNER0 = 12725550000; // dueños +12725550000…0379
const NUM0 = 37000000;      // operaciones I-37000001…
const NEUTRO_FE = /consejer|counsel|capell|chaplain|oraci[oó]n|prayer|recuperaci|recovery|duelo|grief/i;

const slug = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dolares = (r, c, tot) => { const x = c * (0.85 + r.f() * 0.3); return Math.max(1, tot ? Math.round(x / 50) * 50 : x < 30 ? Math.round(x) : Math.round(x / 5) * 5) * 100; };
const rangoFun = (c) => Math.min(3000000, Math.max(50000, c));

/* ── Lo que el app deriva de los horarios (fe-comun.ts etaHorarios y fe.ts recalcularFiltrosFe); la barrida del servidor lo rehace cada día ── */
const DIA = [["domingo", "Sunday"], ["lunes", "Monday"], ["martes", "Tuesday"], ["miércoles", "Wednesday"], ["jueves", "Thursday"], ["viernes", "Friday"], ["sábado", "Saturday"]];
const hora = (min) => { const h = Math.floor(min / 60), m = min % 60, h12 = h % 12 || 12; return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`; };
const largo = (dow, min, es) => `${DIA[dow][es ? 0 : 1]} ${hora(min)}`;
const lst = (L, y) => (L.length <= 1 ? L.join("") : `${L.slice(0, -1).join(", ")} ${y} ${L[L.length - 1]}`);
function eta(Hs, es) { const G = []; for (const x of [...Hs].sort((p, q) => p.dow - q.dow || p.min - q.min)) { const l = es ? x.label.es : x.label.en || x.label.es, g = G.find((z) => z.l === l); if (g) g.d.push(largo(x.dow, x.min, es)); else G.push({ l, d: [largo(x.dow, x.min, es)] }); } return G.slice(0, 2).map((g) => `${g.l}: ${lst(g.d.slice(0, 3), es ? "y" : "and")}`).join(" · "); }
const FREQ = { semana: ["Una caja por familia a la semana", "One box per family per week"], quince: ["Una caja por familia cada 15 días", "One box per family every 15 days"], mes: ["Una caja por familia al mes", "One box per family per month"] };

/* ── Qué es cada lugar (para el «Sobre nosotros») ── */
const QUE = {
  "NEG-FE-06": ["una iglesia metodista", "a Methodist church"], "NEG-FE-07": ["una iglesia adventista", "an Adventist church"], "NEG-FE-08": ["una iglesia cristiana sin denominación", "a non-denominational Christian church"],
  "NEG-FE-09": ["un salón de reuniones de los Testigos de Jehová", "a Jehovah's Witnesses meeting hall"], "NEG-FE-10": ["una capilla de los Santos de los Últimos Días", "a Latter-day Saints meetinghouse"], "NEG-FE-11": ["una iglesia ortodoxa", "an Orthodox church"],
  "NEG-FE-12": ["un centro islámico con mezquita", "an Islamic center with a mosque"], "NEG-FE-13": ["una sinagoga", "a synagogue"],
  "NEG-FE-14": ["un ministerio cristiano", "a Christian ministry"], "NEG-FE-15": ["un ministerio juvenil", "a youth ministry"], "NEG-FE-16": ["un ministerio de damas", "a women's ministry"], "NEG-FE-17": ["un ministerio de varones", "a men's ministry"],
  "NEG-FE-18": ["un ministerio de alabanza y coro", "a worship and choir ministry"], "NEG-FE-19": ["una red de estudios bíblicos y células", "a network of Bible studies and cell groups"], "NEG-FE-20": ["una escuela dominical", "a Sunday school"],
  "NEG-FE-21": ["un centro de catequesis y preparación de sacramentos", "a catechesis and sacrament preparation center"], "NEG-FE-22": ["una pastoral de bautizos", "a baptism ministry"], "NEG-FE-23": ["una pastoral de primera comunión y confirmación", "a first communion and confirmation ministry"],
  "NEG-FE-24": ["una pastoral de misas de quinceañera", "a quinceañera Mass ministry"], "NEG-FE-25": ["una capilla para bodas religiosas", "a chapel for religious weddings"],
  "NEG-FE-26": ["un centro de consejería matrimonial y familiar", "a marriage and family counseling center"], "NEG-FE-27": ["un centro de consejería cristiana", "a Christian counseling center"], "NEG-FE-28": ["un ministerio de recuperación", "a recovery ministry"],
  "NEG-FE-29": ["una casa de servicios funerarios", "a funeral services provider"], "NEG-FE-30": ["una funeraria", "a funeral home"], "NEG-FE-31": ["un servicio de cremación", "a cremation service"], "NEG-FE-32": ["un servicio de repatriación de restos", "a repatriation of remains service"],
  "NEG-FE-33": ["un servicio de memoriales y novenarios", "a memorial and novenario service"], "NEG-FE-34": ["un servicio de capellanía", "a chaplaincy service"], "NEG-FE-35": ["una línea de oración y apoyo", "a prayer and support line"],
  "NEG-FE-36": ["una despensa de alimentos", "a food pantry"], "NEG-FE-37": ["un ropero comunitario", "a community clothing closet"], "NEG-FE-38": ["un programa de refugio y ayuda de emergencia", "a shelter and emergency aid program"],
  "NEG-FE-39": ["un centro de ayuda migratoria", "an immigration help center"], "NEG-FE-40": ["un grupo de labor comunitaria y misiones", "a community outreach and missions group"], "NEG-FE-41": ["un programa de voluntariado", "a volunteer program"],
  "NEG-FE-42": ["una tienda de artículos religiosos", "a religious goods store"], "NEG-FE-43": ["una botánica", "a botánica shop"],
};
function aboutDe(b, S) {
  const [q, qe] = QUE[S.id], C = CIUDADES[b.city].n, bil = b.fe.bil ? [" e inglés", " and English"] : ["", ""];
  switch (S.fam) {
    case "iglesia": return bi(`${b.name} es ${q} de ${C} desde ${b.founded}. Reuniones en español${bil[0]}, clases gratis para la comunidad y ayuda a quien la necesita. ${S.noDon ? "No hay colectas; la entrada es libre." : "Todo es gratis o con un donativo sugerido que cada quien da si puede; si no puedes, no se cobra."} En la app no se paga nada.`,
      `${b.name} is ${qe} in ${C} since ${b.founded}. Meetings in Spanish${bil[1]}, free classes for the community and help for those who need it. ${S.noDon ? "There are no collections; entry is free." : "Everything is free or with a suggested donation each person gives if they can; if you cannot, nothing is charged."} Nothing is paid in the app.`);
    case "ministerio": return bi(`${b.name} es ${q} de ${C} desde ${b.founded}. Reuniones en español${bil[0]}, grupos, talleres gratis y servicio a la comunidad. Las actividades son gratis; para algunos retiros hay un donativo sugerido y, si no puedes, no se cobra.`,
      `${b.name} is ${qe} in ${C} since ${b.founded}. Meetings in Spanish${bil[1]}, groups, free workshops and service to the community. Activities are free; for some retreats there is a suggested donation and, if you cannot, nothing is charged.`);
    case "sacr": return bi(`${b.name} es ${q} de ${C} desde ${b.founded}. Charlas de preparación, grupos con cupo y fechas de ceremonia. La preparación es gratis; para las celebraciones hay un donativo sugerido y, si no puedes, no se cobra. Nadie pregunta por tu estatus migratorio.`,
      `${b.name} is ${qe} in ${C} since ${b.founded}. Preparation talks, groups with openings and ceremony dates. Preparation is free; for celebrations there is a suggested donation and, if you cannot, nothing is charged. Nobody asks about your immigration status.`);
    case "consejo": return bi(`${b.name} es ${q} de ${C} desde ${b.founded}. Citas privadas y confidenciales en español, con alguien que escucha sin juzgar. Las citas son gratis y no hace falta pertenecer a ninguna iglesia. Si estás en crisis, llama o escribe al 988.`,
      `${b.name} is ${qe} in ${C} since ${b.founded}. Private, confidential appointments in Spanish with someone who listens without judging. Appointments are free and you do not need to belong to any church. If you are in crisis, call or text 988.`);
    case "fun": return bi(`${b.name} es ${q} de ${C} desde ${b.founded}. Atendemos a las familias en español, con el total por escrito antes de firmar y sin presión. Una cita para planear con calma es gratis. En la app no se paga nada.`,
      `${b.name} is ${qe} in ${C} since ${b.founded}. We serve families in Spanish, with the total in writing before signing and no pressure. An appointment to plan calmly is free. Nothing is paid in the app.`);
    case "oracion": return bi(`${b.name} es ${q} de ${C} desde ${b.founded}. Compañía y oración para quien la pida, de cualquier creencia o ninguna, en español. Es gratis y confidencial; nunca se cobra por oración. Si estás en crisis, llama o escribe al 988.`,
      `${b.name} is ${qe} in ${C} since ${b.founded}. Company and prayer for anyone who asks, of any belief or none, in Spanish. It is free and confidential; prayer is never charged. If you are in crisis, call or text 988.`);
    case "ayuda": return bi(`${b.name} es ${q} de ${C} desde ${b.founded}. La ayuda es gratis y nadie pregunta tu estatus. Atendemos en español y damos citas a quien las necesita. Siempre buscamos voluntarios y donaciones.`,
      `${b.name} is ${qe} in ${C} since ${b.founded}. Help is free and nobody asks your status. We serve in Spanish and give appointments to those who need them. We are always looking for volunteers and donations.`);
    default: return bi(`${b.name} es ${q} de ${C} desde ${b.founded}. Artículos, libros y regalos, con atención en español. El precio que ves es el de la caja; nada se compra en la app.${S.botanica ? " Artesanías y tradiciones del Caribe; sin afirmaciones de salud: los productos no tratan ni curan nada." : ""}`,
      `${b.name} is ${qe} in ${C} since ${b.founded}. Items, books and gifts, with service in Spanish. The price you see is the register price; nothing is bought in the app.${S.botanica ? " Crafts and traditions of the Caribbean; no health claims: products do not treat or cure anything." : ""}`);
  }
}
function horasDe(b, S, r) {
  const d = (...x) => x.map(([a, c]) => [a, c]);
  switch (S.fam) {
    case "iglesia": {
      const sab = S.sat, mez = S.tr === "mezquita", sin = S.tr === "sinagoga";
      return [sab ? null : [["08:00", "13:30"]], null, [["09:00", "17:00"]], [["09:00", "17:00"], ["18:30", "21:00"]], [["09:00", "17:00"]], mez ? [["12:00", "15:00"], ["17:00", "21:00"]] : sin ? [["10:00", "15:00"], ["18:00", "21:00"]] : [["09:00", "17:00"], ["18:30", "21:00"]], sab || mez || sin ? [["09:00", "14:00"]] : null];
    }
    case "ministerio": return [[["09:00", "13:00"]], null, [["17:00", "21:00"]], [["17:00", "21:00"]], [["17:00", "21:00"]], [["17:00", "21:30"]], [["09:00", "14:00"]]];
    case "sacr": return [[["08:00", "13:00"]], null, [["09:00", "17:00"]], [["09:00", "17:00"]], [["09:00", "17:00"]], [["09:00", "17:00"]], [["09:00", "13:00"]]];
    case "consejo": return [null, [["10:00", "20:00"]], [["10:00", "20:00"]], [["10:00", "20:00"]], [["10:00", "20:00"]], [["10:00", "15:00"]], null];
    case "fun": return b.fe.h24 ? [0, 1, 2, 3, 4, 5, 6].map(() => [["00:00", "23:59"]]) : [[["12:00", "18:00"]], [["09:00", "20:00"]], [["09:00", "20:00"]], [["09:00", "20:00"]], [["09:00", "20:00"]], [["09:00", "20:00"]], [["09:00", "18:00"]]];
    case "oracion": return [null, [["17:00", "21:30"]], [["17:00", "21:30"]], [["17:00", "21:30"]], [["17:00", "21:30"]], [["17:00", "21:30"]], [["10:00", "14:00"]]];
    case "ayuda": { const dias = new Set([...(S.dias || [2, 5]), ...(r.chance(0.5) ? [r.pick([1, 2, 3, 4, 5])] : [])]); return [0, 1, 2, 3, 4, 5, 6].map((x) => (dias.has(x) ? (r.chance(0.5) ? [["09:00", "13:00"]] : [["14:00", "18:00"]]) : null)); }
    default: return [r.chance(0.7) ? [["12:00", "17:00"]] : null, [["10:00", "19:00"]], [["10:00", "19:00"]], [["10:00", "19:00"]], [["10:00", "19:00"]], [["10:00", "19:00"]], [["10:00", "19:00"]]];
  }
}
const AMENIDAD = (b, S) => ["estacionamiento", ...(S.fam === "consejo" || S.fam === "oracion" ? [] : ["accesible"]), ...(S.fam === "fun" || S.fam === "tienda" ? ["acepta-tarjeta"] : []), ...(["iglesia", "ministerio", "sacr"].includes(S.fam) ? ["para-ninos"] : []),
  ...(b.fe.help.includes("despensa") ? ["despensa"] : []), ...(b.fe.help.includes("transporte") ? ["transporte"] : []), ...(b.fe.help.includes("jovenes") ? ["para-jovenes"] : [])];
const AYUDAS = ["despensa", "ropa", "transporte", "jovenes", "ninos", "bodas"];

/* ── La ficha de cada negocio: servicios, horarios, herramienta de Iglesias, filtros y tarjeta ── */
function ficha(b, S, r) {
  const P = PACKS[S.fam], fam = S.fam, lista = ITEMS[S.id];
  // Servicios: los básicos siempre, el resto por probabilidad; la tienda y las funerarias llevan todo lo que corresponde.
  const sel = lista.filter((x) => x.core || x.tienda || (x.p == null ? true : r.chance(x.p)));
  if (fam !== "tienda" && !sel.some((x) => x.flow !== "info")) sel.push(lista.find((x) => x.flow !== "info"));
  if (S.repat && !sel.some((x) => x.rep)) sel.push(lista.find((x) => x.rep));
  const secs = [...new Set(sel.map((x) => x.sec[0]))];
  b.items = sel.map((x, k) => {
    const tot = !!x.tot, cents = x.tienda ? x.c * 100 : tot ? rangoFun(dolares(r, x.c, true)) : x.c ? dolares(r, x.c, false) : 0;
    const dur = x.dur ? bi(x.dur[0], x.dur[1]) : null, sem = x.sem || 0;
    const attrs = x.tienda ? {} : tot ? { fe: "tot" } : x.flow === "curso" ? { fe: cents ? "don" : "gratis", sem, ...(dur ? { dur } : {}) } : { fe: cents ? "don" : "gratis", ...(dur ? { dur } : {}) };
    return { sec: bi(x.sec[0], x.sec[1]), secSort: secs.indexOf(x.sec[0]), name: bi(x.name[0], x.name[1]), descr: bi(x.desc[0], x.desc[1]), cents, dur: 60, kind: x.tienda || tot ? "fijo" : x.flow === "curso" ? "curso" : "clase", attrs, pfrom: false, photo: b.pics[k % b.pics.length], sort: k,
      dep: 0, flow: x.flow, curso: x.flow === "curso" ? x : null, charla: x.flow === "charla" ? x : null, dows: x.dows, min: x.min, seats: x.seats, sem, tienda: !!x.tienda };
  });
  // Horarios de la semana
  b.worship = [];
  const used = new Set();
  (WORSHIP[S.id] || []).forEach((w, i) => {
    if (i > 0 && !r.chance(w.p)) return;
    const dow = Array.isArray(w.d) ? r.pick(w.d) : w.d, min = Array.isArray(w.m) ? r.pick(w.m) : w.m, key = `${dow}:${min}:${w.kind}`;
    if (used.has(key)) return; used.add(key);
    b.worship.push({ dow, min, label: bi(w.es, w.en), lang: w.lang, kind: w.kind });
  });
  const bil = b.worship.some((w) => w.lang === "en" || w.lang === "bil") || (fam !== "tienda" && r.chance(0.35));
  const help = fam === "iglesia" ? r.sample(AYUDAS, r.i(0, 3)) : AYUDAS.filter((x) => (S.help || []).includes(x) && (fam === "ayuda" || r.chance(0.85)));
  b.fe = { kind: S.kind, bil, help: AYUDAS.filter((x) => help.includes(x)), sinid: fam === "ayuda" ? r.chance(0.85) : r.chance(0.5), freq: r.pick(["semana", "quince", "mes"]), h24: fam === "fun" && r.chance(0.45), plan: fam === "fun" && r.chance(0.6) ? 12 : 0, rep: r.pick(["3–5", "5–7", "7–10"]), catequesis: true,
    repatria: b.items.some((x) => /^repatriaci/i.test(x.name.es)), hayCurso: b.items.some((x) => x.kind === "curso") };
  b.radius = null; b.fromHome = false; b.languages = bil ? ["es", "en"] : ["es"]; b.payments = ["local"];
  b.about = aboutDe(b, S); b.amenities = AMENIDAD(b, S); b.hours = horario(horasDe(b, S, r));
  b.modules = ["svc", "staff", "nov"];
  // Filtros y tarjeta: lo que deriva el app (recalcularFiltrosFe), puesto desde el principio; la barrida del servidor lo rehace.
  const F = new Set(); const tj = {}, extra = {}; let der = [];
  const conHor = !["ayuda", "fun", "tienda"].includes(S.kind);
  if (conHor) {
    if (S.kind === "misa" && b.worship.some((w) => w.kind === "misa" && (w.lang === "es" || w.lang === "bil"))) F.add("misaesp");
    if (b.worship.some((w) => w.lang === "es" || w.lang === "bil")) F.add("esp");
    if (bil) F.add("bil"); b.fe.help.forEach((x) => F.add(x));
    if (b.worship.length) tj.eta = bi(eta(b.worship, true), eta(b.worship, false));
    if (S.kind === "misa" && b.fe.hayCurso) tj.fee = bi("Catecismo: inscripciones abiertas", "Catechism: registration open");
    else if (b.fe.help.includes("transporte")) tj.fee = b.worship.some((w) => w.dow === 0) ? bi("Transporte gratis los domingos", "Free Sunday rides") : bi("Transporte gratis los días de servicio", "Free rides on service days");
    else if (bil) tj.fee = bi("Español e inglés", "Spanish and English");
    der = ["misaesp", "bil", ...AYUDAS, "esp"];
  } else if (S.kind === "ayuda") {
    if (b.fe.sinid) F.add("sinid"); if (b.fe.help.includes("ropa")) F.add("ropa");
    tj.eta = b.fe.sinid ? bi("Sin papeles ni cita", "No papers or appointment") : bi("Sin cita · trae una ID", "No appointment · bring an ID");
    tj.fee = bi(FREQ[b.fe.freq][0], FREQ[b.fe.freq][1]); extra.freq = [FREQ[b.fe.freq][0] + ".", FREQ[b.fe.freq][1] + "."]; extra.agot = 0; der = ["sinid", "ropa"];
    F.add("esp"); if (b.fe.help.includes("despensa")) F.add("despensa"); if (b.fe.help.includes("transporte")) F.add("transporte");
  } else if (S.kind === "fun") {
    if (b.fe.h24) F.add("24h"); if (b.fe.repatria) F.add("repatria");
    if (b.fe.repatria) tj.eta = bi(`Repatriación a RD en ${b.fe.rep} días`, `Repatriation to the DR in ${b.fe.rep} days`); else if (b.fe.h24) tj.eta = bi("Atiende las 24 horas", "Open 24 hours");
    tj.fee = bi("Precio completo por escrito antes de firmar", "Full written price before signing"); extra.rep = b.fe.rep; der = ["24h", "repatria"]; F.add("esp");
  } else F.add("esp");
  if (b.founded <= 2016) F.add("y10");
  if (S.cat) F.add("catolica");
  b.filters = [...F];
  b.attrs = { m: "shop", tarjeta: tj, fe_der: Object.keys(tj), ...extra };
  // Sellos: 501(c)(3) en lo que es de una comunidad; funerarias, la licencia de PA; ayuda migratoria, el reconocimiento del DOJ; las tiendas, ninguno.
  const L = [], num = (p) => `PRUEBA-${p}${r.i(100000, 999999)}`, rev = () => addDays(ANCHOR_D, r.i(60, 330));
  if (S.lic === "pa_funeraria") L.push({ kind: "pa_funeraria", title: bi("Funeraria con licencia de PA", "PA-licensed funeral home"), num: num("FD-"), review: rev() });
  else if (S.lic !== "none") L.push({ kind: "irs_501c3", title: bi("Organización sin fines de lucro 501(c)(3)", "Nonprofit organization 501(c)(3)"), num: num(""), review: rev() });
  if (S.lic === "fe_doj") L.push({ kind: "fe_doj", title: bi("Representante acreditado (DOJ)", "Accredited representative (DOJ)"), num: num("DOJ-"), review: rev() });
  b.licenses = L;
  fichaComun(b, P);
}

/* ── Fechas de grupos (charlas de un día) y solicitudes de fecha ── */
const SAB = (d0, dow = 6) => withTime(addDays(d0, ((dow - d0.getUTCDay()) + 7) % 7), 0);
function operacionesDe(b, S, seq, pend, ph) {
  const r = rng(`r2ops:${b.id}`), next = cicloClientes(r), P = PACKS[S.fam];
  const T = 40 + Math.round(80 * b.vol * b.vol), target = 15 + Math.round(25 * b.vol * b.vol), neutroB = S.kind === "consejo" || S.kind === "oracion";
  const grupos = [], ops = [];
  const cursos = b.items.filter((x) => x.curso), charlas = b.items.filter((x) => x.charla), fechas = b.items.filter((x) => x.flow === "fecha");
  const desde = Math.max(2016, b.founded);
  const gs = cursos.length ? cohortes(r, desde, cursos.map((c) => ({ name: c.name.es, sem: c.sem, dows: c.dows, min: c.min, dur: 120, seats: c.seats || 14 })), 3) : [];
  for (const c of cursos) if (!gs.some((g) => g.item === c.name.es && g.estado !== "finished")) { const d = addDays(ANCHOR_D, r.i(8, 40)), dd = addDays(d, (((c.dows[0] ?? 1) - d.getUTCDay()) + 7) % 7); gs.push({ item: c.name.es, starts: dd, ends: addDays(dd, c.sem * 7 - 1), dows: c.dows, min: c.min, dur: 120, seats: c.seats || 14, estado: "open", label: etiqueta(dd, "open"), booked: 0 }); }
  for (const c of charlas) {
    const modo = c.sec.es === SAC_ES ? "charla" : "dia", fechasG = fechasEnvio(r, 6, desde, -50); let last = null;
    for (const d0 of fechasG) { const d = SAB(d0); if (last && (d - last) / 86400000 < 25) continue; last = d; const estado = d > ANCHOR_D ? "open" : "finished"; gs.push({ item: c.name.es, starts: d, ends: d, dows: [], min: c.min || 600, dur: 120, seats: c.seats || 12, estado, label: etiqueta(d, estado, modo), booked: 0 }); }
    if (!gs.some((g) => g.item === c.name.es && g.estado === "open")) { const dd = SAB(addDays(ANCHOR_D, r.i(7, 35))); gs.push({ item: c.name.es, starts: dd, ends: dd, dows: [], min: c.min || 600, dur: 120, seats: c.seats || 12, estado: "open", label: etiqueta(dd, "open", modo), booked: 0 }); }
  }
  gs.forEach((g) => (g.b = b.id));
  const itemOf = (g) => b.items.find((x) => x.name.es === g.item);
  const neutroDe = (it) => neutroB || NEUTRO_FE.test(`${it.name.es} ${it.name.en}`);
  const detBase = (it, label, startsOn, endsOn, min, dows) => ({ rubro: "fe", k: it.kind, item_id: null, svc: it.name, group_id: null, band_id: null, group: label, starts_on: startsOn, ends_on: endsOn, start_min: min, dows, for: "yo", guardian_ok: false, level: null, team_name: null, price_cents: it.cents,
    mat_cents: 0, mat_app: 0, plan_n: null, cert: null, cert_by: null, oficial: false, no: [], contract_m: 0, cancel_fee_cents: 0, g1: false, sms: true, neutro: neutroDe(it), cuidado: false });
  const os = gs.length ? matriculas(r, b, gs, next, seq, {
    num: NUM0, fill: [[0.12, 0.38], [0.1, 0.3]], fe: true,
    item: (g) => { const it = itemOf(g); return { name: it.name.es, lname: it.name, cents: it.cents, kind: it.kind, attrs: it.attrs, it }; }, mat: () => 0,
    det: (g, c, itx) => detBase(itx.it, g.label, ymd(g.starts), g.ends ? ymd(g.ends) : null, g.min, g.dows),
  }) : [];
  ops.push(...os); grupos.push(...gs);
  // «Pedir fecha»: la solicitud de una fecha y una franja (la oficina confirma, propone otra o dice que no hay).
  const nF = fechas.length ? Math.max(10, T - os.length) : 0;
  const FR = [["manana", "En la mañana", "Morning", 540], ["tarde", "En la tarde", "Afternoon", 840], ["noche", "En la noche", "Evening", 1080]];
  const MES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], MES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const corta = (d, es) => (es ? `${d.getUTCDate()} ${MES_ES[d.getUTCMonth()]}` : `${MES_EN[d.getUTCMonth()]} ${d.getUTCDate()}`);
  const wsel = fechas.map((_, i) => (i === 0 ? 3 : 2));
  const vivos = new Set();
  const clienteOk = (it, vivo) => { for (let k = 0; k < 12; k++) { const c = next(); const key = `${c.phone}|${b.id}|${it.name.es}`; if (vivo && (vivos.has(key) || (pend.get(c.phone) || 0) >= 4)) continue; if (vivo) vivos.add(key); return c; } return next(); };
  const mk = (it, sent, wanted, franja, estado) => {
    seq.n++; const live = estado === "pending" || estado === "confirmed", c = clienteOk(it, live), ck = uuidOf(`${b.id}:${seq.n}`), fr = franja;
    const label = bi(`${corta(wanted, true)} · ${fr[1]}`, `${corta(wanted, false)} · ${fr[2]}`), sched = withTime(wanted, fr[3]);
    const det = { ...detBase(it, label, ymd(wanted), null, fr[3], []), fecha: true, franja: fr[0] };
    const ansAt = new Date(sent.getTime() + r.i(1, 20) * 3600000);
    const o = { b: b.id, ck, num: `I-${NUM0 + seq.n}`, kind: "enrollment", ph: c.phone, sent, sched, dur: 60, ps: 1, sub: 0, tot: 0, dep: 0, pm: "none", item: it.name.es, qty: 1, unit: 0, lname: it.name, ev: [["insc_sent", "user", sent]], note: null, det, iref: it.name.es };
    if (estado === "pending") { o.st = "pending"; o.resp = new Date(sent.getTime() + 24 * 3600000); pend.set(c.phone, (pend.get(c.phone) || 0) + 1); }
    else if (estado === "confirmed") { o.st = "confirmed"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["insc_ok", "business", ansAt]); }
    else if (estado === "done") { o.st = "done"; o.ans = ansAt; o.conf = ansAt; o.done = withTime(wanted, fr[3] + r.i(60, 200)); o.ev.push(["insc_ok", "business", ansAt], ["insc_done", "business", o.done]); }
    else if (estado === "cancelled") { o.st = "cancelled"; o.ans = ansAt; o.conf = ansAt; o.canc = new Date(Math.min(sched.getTime() - 86400000, ansAt.getTime() + r.i(2, 60) * 3600000)); if (o.canc < ansAt) o.canc = new Date(ansAt.getTime() + 3600000); o.cby = "user"; o.creason = "cambio_planes"; o.ev.push(["insc_ok", "business", ansAt], ["insc_cancel_ok", "user", o.canc]); }
    else if (estado === "declined") { o.st = "declined"; o.ans = ansAt; o.ev.push(["insc_no", "business", ansAt]); }
    else { o.st = "expired"; o.sd = "sin_respuesta"; o.resp = new Date(sent.getTime() + 24 * 3600000); o.ev.push(["insc_exp", "system", o.resp]); }
    ops.push(o);
  };
  if (nF) {
    const pickIt = () => r.weighted(fechas, wsel), pickFr = () => r.pick(FR);
    const nLive = Math.min(nF - 4, r.i(3, 8)), nRec = r.i(2, 6), nOld = Math.max(0, nF - nLive - nRec);
    const dOld = fechasEnvio(r, nOld, Math.max(2016, b.founded + 1), 40);
    for (const sent of dOld) { const roll = r.f(), est = roll < 0.8 ? "done" : roll < 0.87 ? "cancelled" : roll < 0.93 ? "declined" : roll < 0.97 ? "expired" : "done"; mk(pickIt(), sent, withTime(addDays(sent, r.i(3, 28)), 0), pickFr(), est); }
    for (let k = 0; k < nRec; k++) { const sd = r.i(6, 38), sent = withTime(addDays(ANCHOR_D, -sd), r.i(8 * 60, 20 * 60)), wd = Math.min(sd - 2, r.i(3, 20)); mk(pickIt(), sent, withTime(addDays(sent, wd), 0), pickFr(), r.chance(0.9) ? "done" : "cancelled"); }
    for (let k = 0; k < nLive; k++) {
      const roll = r.f(); let sentD = roll < 0.35 ? r.i(0, 1) : r.i(1, 10); const sent = withTime(addDays(ANCHOR_D, -sentD), r.i(8 * 60, 18 * 60));
      const est = roll < 0.35 ? "pending" : roll < 0.9 ? "confirmed" : "cancelled"; const wanted = withTime(addDays(ANCHOR_D, r.i(2, 45)), 0);
      if (est === "cancelled") { mk(pickIt(), sent, wanted, pickFr(), "cancelled"); const o = ops[ops.length - 1]; o.canc = new Date(Math.max(o.ans.getTime() + 3600000, Math.min(o.canc.getTime(), ANCHOR_D.getTime()))); o.ev[o.ev.length - 1][2] = o.canc; }
      else mk(pickIt(), sent, wanted, pickFr(), est);
    }
  }
  // Reseñas: de las solicitudes terminadas (una por persona); si faltan, de personas que fueron al lugar (reseña de visitante, sin solicitud).
  ponerResenas(r, P, (rr, st) => ({ trato: st >= 4 ? 1 : st === 3 ? 0 : -1, gratis: st >= 3 ? 1 : -1, espanol: 1, ayudaron: st >= 4 ? 1 : 0, empezo: st >= 4 ? "a" : st === 3 ? "b" : "c", bienvenido: st >= 4 ? 1 : -1 }), ops, target);
  const conResena = new Set(ops.filter((o) => o.review).map((o) => o.ph)), vis = [];
  const faltan = target - conResena.size;
  if (faltan > 0) {
    const cands = r.shuffle(CLIENTES).filter((c) => !conResena.has(c.phone)).slice(0, faltan), fs = fechasEnvio(r, cands.length, Math.max(2016, b.founded + 1), 4);
    cands.forEach((c, i) => {
      const rv = resena(r, P, (rr, st) => ({ trato: st >= 4 ? 1 : st === 3 ? 0 : -1, gratis: st >= 3 ? 1 : -1, espanol: 1, ayudaron: st >= 4 ? 1 : 0, empezo: st >= 4 ? "a" : st === 3 ? "b" : "c", bienvenido: st >= 4 ? 1 : -1 }), { done: fs[i] }, usedNone);
      if (!rv) return; rv.rec = r.chance(0.5) && b.items.length ? r.pick(b.items).name.es : null; vis.push({ ph: c.phone, at: new Date(fs[i].getTime() + rv.d * 86400000), ...rv });
    });
  }
  ph.vis.push(...vis.map((v) => ({ b: b.id, ...v })));
  return { ops, grupos };
}
const usedNone = new Set(), SAC_ES = "Sacramentos y fechas";

/* ── Después de crear operaciones y grupos: el grupo y el servicio de cada solicitud (details.group_id e item_id) ── */
function sqlDetalle(ops) {
  const out = [];
  const rg = ops.filter((o) => o.gref).map((o) => `(${s(o.ck)}, ${s(o.ph)}, ${s(o.b)}, ${s(o.gref.item)}, ${dateLit(o.gref.starts)})`);
  out.push("create temp table _og (ck text, ph text, b text, item text, starts date) on commit drop;");
  for (let k = 0; k < rg.length; k += 600) out.push(`insert into _og values\n${rg.slice(k, k + 600).join(",\n")};`);
  out.push(`update operations op set details = op.details || jsonb_build_object('group_id', g.id::text, 'item_id', i.id::text) from _og x, users u, items i, class_groups g
 where u.phone = x.ph and op.user_id = u.id and op.client_key = x.ck::uuid and i.business_id = x.b and i.name->>'es' = x.item and i.module = 'svc' and i.removed_at is null
   and g.business_id = x.b and g.item_id = i.id and g.starts_on = x.starts and g.purpose = 'insc' and coalesce(op.details->>'group_id', '') = '';`);
  const rf = ops.filter((o) => o.iref).map((o) => `(${s(o.ck)}, ${s(o.ph)}, ${s(o.b)}, ${s(o.iref)})`);
  out.push("create temp table _oi (ck text, ph text, b text, item text) on commit drop;");
  for (let k = 0; k < rf.length; k += 600) out.push(`insert into _oi values\n${rf.slice(k, k + 600).join(",\n")};`);
  out.push(`update operations op set details = op.details || jsonb_build_object('item_id', i.id::text) from _oi x, users u, items i
 where u.phone = x.ph and op.user_id = u.id and op.client_key = x.ck::uuid and i.business_id = x.b and i.name->>'es' = x.item and i.module = 'svc' and i.removed_at is null and coalesce(op.details->>'item_id', '') = '';`);
  return out;
}
function sqlVis(vis) {
  if (!vis.length) return [];
  const out = ["create temp table _rv (b text, ph text, stars int, body text, lang text, ans jsonb, rec text, reply text, rlang text, at timestamp, rd int) on commit drop;"];
  const rows = vis.map((v) => `(${s(v.b)}, ${s(v.ph)}, ${v.stars}, ${s(v.body)}, ${s(v.lang)}, ${j(v.ans)}, ${s(v.rec)}, ${s(v.reply)}, ${s(v.rlang)}, ${ts(v.at)}, ${v.rd})`);
  for (let k = 0; k < rows.length; k += 500) out.push(`insert into _rv values\n${rows.slice(k, k + 500).join(",\n")};`);
  out.push(`insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang, answers, rec, reply, reply_at, reply_by, reply_lang, created_at)
select r.b, bz.city_id, u.id, null, 'vis', r.stars, r.body, r.lang, r.ans,
       coalesce((select array_agg(i.id::text) from items i where i.business_id = r.b and i.name->>'es' = r.rec and i.removed_at is null), '{}'::text[]),
       r.reply, case when r.reply is not null then (r.at at time zone 'America/New_York') + interval '1 day' * r.rd end, case when r.reply is not null then bz.owner_user_id end, r.rlang, r.at at time zone 'America/New_York'
  from _rv r join users u on u.phone = r.ph join businesses bz on bz.id = r.b
on conflict do nothing;`);
  return out;
}

export function generar() {
  const negocios = negociosBase("FE", "NEG-FE", SUBS, { ficha });
  negocios.forEach((b, i) => { b.id = `${slug(b.name)}-${b.city}-r2fe`; b.ownerPhone = `+${OWNER0 + i}`; b.gi = i; });
  const ids = new Set(negocios.map((b) => b.id)); if (ids.size !== negocios.length) throw new Error("ids repetidos");
  // Volumen más ligero que en la ronda 1: 3 a 6 novedades (las más recientes primero) y hasta 80 seguidores.
  for (const b of negocios) { const r = rng(`r2lig:${b.id}`); novedades(b, PACKS[b.sub.fam], []); b.posts = b.posts.slice(0, r.i(3, 6)); b.follows = b.follows.slice(0, r.i(15, 80)); }
  const ops = [], grupos = [], seq = { n: 0 }, pend = new Map(), ph = { vis: [] };
  for (const b of negocios) { const x = operacionesDe(b, b.sub, seq, pend, ph); ops.push(...x.ops); grupos.push(...x.grupos); }
  if (seq.n >= 999999) throw new Error("demasiadas operaciones");
  // Una persona no tiene más de 4 solicitudes esperando respuesta (el app deja 5): las que sobran ya están confirmadas.
  { const p = new Map(); for (const o of ops) if (o.st === "pending") { const k = (p.get(o.ph) || 0) + 1; p.set(o.ph, k); if (k > 4) { o.st = "confirmed"; o.ans = o.conf = new Date(o.sent.getTime() + 3 * 3600000); o.resp = null; o.ev.push(["insc_ok", "business", o.ans]); } } }
  const wt = negocios.flatMap((b) => b.worship.map((w, i) => ({ b: b.id, ...w, srt: i })));
  const extra = [...sqlItems(negocios)];
  extra.push(`create temp table _fs (b text, bil boolean, help text[], sinid boolean, freq text, h24 boolean, plan int, rep text, cat boolean) on commit drop;`,
    `insert into _fs values\n${negocios.map((b) => `(${s(b.id)}, ${b.fe.bil}, array[${b.fe.help.map(s).join(",")}]::text[], ${b.fe.sinid}, ${s(b.fe.freq)}, ${b.fe.h24}, ${b.fe.plan}, ${s(b.fe.rep)}, ${b.fe.catequesis})`).join(",\n")};`);
  extra.push(`insert into fe_settings (business_id, city_id, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
select x.b, bz.city_id, x.bil, x.help, x.sinid, x.freq, x.h24, x.plan, x.rep, x.cat from _fs x join businesses bz on bz.id = x.b on conflict (business_id) do nothing;`);
  extra.push(`insert into insc_settings (business_id, city_id, rubro, esp) select x.b, bz.city_id, 'fe', true from _fs x join businesses bz on bz.id = x.b on conflict (business_id) do nothing;`);
  if (wt.length) {
    extra.push(`create temp table _wt (b text, dow int, mn int, label jsonb, lang text, kind text, srt int) on commit drop;`);
    for (let k = 0; k < wt.length; k += 500) extra.push(`insert into _wt values ${wt.slice(k, k + 500).map((w) => `(${s(w.b)}, ${w.dow}, ${w.min}, ${j(w.label)}, ${s(w.lang)}, ${s(w.kind)}, ${w.srt})`).join(",\n")};`);
    extra.push(`insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select x.b, bz.city_id, x.dow, x.mn, x.label, x.lang, x.kind, x.srt from _wt x join businesses bz on bz.id = x.b
 where not exists (select 1 from worship_times w where w.business_id = x.b and w.dow = x.dow and w.start_min = x.mn and w.kind = x.kind and w.removed_at is null);`);
  }
  extra.push(...sqlGrupos(negocios, grupos));
  return { negocios, ops, extra, after: [...sqlDetalle(ops), ...sqlVis(ph.vis)], cat: "NEG-FE", file: "demo-x-fe.sql", vis: ph.vis.length, grupos };
}
