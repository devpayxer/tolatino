/* Arma un negocio de NEG-SALUD (ronda 2) con las piezas del grupo B (b/negocio, b/citas, b/historia) y los datos de datos1/datos2.
   Misma forma de objeto que b/salud.mjs, así que lo emite b/sql.mjs sin tocarlo. Sin datos médicos en el texto público. */
import { usd, HOY, CLIENTES, rngDe } from "../b/comun.mjs";
import { crear, poner, horario, persona, precio, bi } from "../b/negocio.mjs";
import { citasHistoria } from "../b/citas.mjs";
import { resenas, novedades } from "../b/historia.mjs";
import { BANCO, NOV } from "./banco.mjs";

const CAT = "NEG-SALUD";
export const SUFIJO_ID = "-r2s";
const SEGURO = { medicaid: "Medicaid", medicare: "Medicare", chip: "CHIP", highmark: "Highmark", geisinger: "Geisinger Health Plan", upmc: "UPMC", aetna: "Aetna", cigna: "Cigna", uhc: "UnitedHealthcare", delta: "Delta Dental", vsp: "VSP", eyemed: "EyeMed" };
const SEG_PUB = ["medicaid", "medicare", "chip"];
const PRIV = ["highmark", "geisinger", "upmc", "aetna", "cigna", "uhc"];

const LUGAR = ["del Valle", "Santa Lucía", "Nueva Esperanza", "La Fe", "Los Pinos", "Buen Pastor", "del Norte", "San Rafael", "Alba", "Horizonte", "Las Palmas", "Cumbre", "Mi Familia", "del Parque", "Santa Ana", "Vida Plena", "San Miguel", "del Río", "Primavera", "Unidos", "La Colina", "El Roble", "Aurora", "Montaña", "Costa Verde", "Santa Clara", "Sol y Luna", "Sendero", "Los Almendros"];
const PERS = ["Dra. Medina", "Dr. Batista", "Dr. Colón y Asociados", "Dra. Figueroa", "Dra. Polanco", "Dr. Sosa", "Dr. Lantigua", "Dra. Beltré", "Dr. Paulino", "Dra. Guzmán", "Dr. Tavárez", "Dra. Quiñones"];
const FAM_CON_PERS = new Set(["med", "dent", "vis", "ther", "ment", "nutr", "aest", "vet"]);

const KIND_ROL = { md: "Médico | Physician", crnp: "Enfermera practicante | Nurse practitioner", pac: "Asistente médico | Physician assistant", rn: "Enfermera | Registered nurse", dpt: "Terapeuta físico | Physical therapist", ot: "Terapeuta ocupacional | Occupational therapist", slp: "Terapeuta del habla | Speech-language pathologist", psy: "Psicólogo | Psychologist", lpc: "Consejero profesional | Licensed professional counselor", lcsw: "Trabajador social clínico | Licensed clinical social worker", dds: "Dentista | Dentist", rdh: "Higienista dental | Dental hygienist", od: "Optometrista | Optometrist", dc: "Quiropráctico | Chiropractor", rph: "Farmacéutico | Pharmacist", cnm: "Partera certificada | Certified nurse-midwife", ldn: "Nutricionista | Dietitian-nutritionist" };
const FAM = {
  med: { k0: "md", staff: ["md", "crnp", "pac", "rn"] }, dent: { k0: "dds", staff: ["dds", "rdh", "dds", "rdh"] }, vis: { k0: "od", staff: ["od", "od"] }, ther: { k0: null, staff: [] }, ment: { k0: "psy", staff: ["lpc", "lcsw"] },
  nutr: { k0: "ldn", staff: ["ldn", "Asistente de nutrición | Nutrition assistant"] }, aest: { k0: "md", staff: ["crnp", "rn"] }, lab: { k0: "md", staff: ["rn", "crnp"] }, farm: { k0: "rph", staff: ["rph", "Técnica de farmacia | Pharmacy technician"] },
  eq: { k0: null, staff: ["Técnico de equipo | Equipment technician"] }, home: { k0: null, staff: ["rn", "Cuidadora certificada | Certified caregiver"] }, trans: { k0: null, staff: ["Conductor certificado | Certified driver"] },
  tele: { k0: "md", staff: ["crnp", "pac"] }, vet: { k0: null, staff: ["Técnica veterinaria | Veterinary technician"] },
};
const SOLO_FEM = new Set(["Partera", "Coordinadora", "Cuidadora", "Despachadora", "Directora", "Enfermera", "Veterinaria", "Asesora", "Técnica", "Conductora", "Médica"]);
const aFem = (rol) => {
  const [es, en] = rol.split(" | ");
  const w = es.split(" ");
  if (w[0].endsWith("or")) w[0] += "a"; else if (w[0].endsWith("o")) w[0] = w[0].slice(0, -1) + "a";
  const F = w.join(" ").replace(/\bcertificado\b/, "certificada").replace(/\btitulado\b/, "titulada");
  return en ? `${F} | ${en}` : F;
};
const esSoloFem = (rol) => SOLO_FEM.has(rol.split(" ")[0]);

const HORAS = {
  std: () => [null, [480, 1020], [480, 1020], [480, 1080], [480, 1020], [480, 960], null],
  stdS: (r) => [null, [480, 1020], [480, 1020], [480, 1080], [480, 1020], [480, 960], r.chance(0.5) ? [540, 780] : null],
  tarde: () => [null, [540, 1140], [540, 1140], [480, 1080], [540, 1140], [480, 960], [540, 780]],
  dent: (r) => [null, [480, 1020], [480, 1020], [480, 1020], [480, 1020], [480, 840], r.chance(0.5) ? [540, 780] : null],
  lab: () => [null, [420, 1020], [420, 1020], [420, 1020], [420, 1020], [420, 960], [480, 780]],
  farm: () => [[600, 1080], [540, 1260], [540, 1260], [540, 1260], [540, 1260], [540, 1260], [540, 1200]],
  home: () => [[420, 1200], [420, 1200], [420, 1200], [420, 1200], [420, 1200], [420, 1200], [420, 1200]],
  trans: () => [[360, 1260], [360, 1260], [360, 1260], [360, 1260], [360, 1260], [360, 1260], [360, 1260]],
  tele: () => [[420, 1380], [420, 1380], [420, 1380], [420, 1380], [420, 1380], [420, 1380], [420, 1380]],
  vet: () => [null, [480, 1080], [480, 1080], [480, 1080], [480, 1080], [480, 960], [540, 780]],
};
const horasDe = (fam, r) => ({ med: () => (r.chance(0.5) ? HORAS.tarde() : HORAS.stdS(r)), dent: () => HORAS.dent(r), vis: () => HORAS.stdS(r), ther: () => HORAS.tarde(), ment: () => HORAS.tarde(), nutr: () => HORAS.stdS(r), aest: () => HORAS.stdS(r),
  lab: () => HORAS.lab(), farm: () => HORAS.farm(), eq: () => HORAS.stdS(r), home: () => HORAS.home(), trans: () => HORAS.trans(), tele: () => HORAS.tele(), vet: () => HORAS.vet() }[fam]());

function insFor(cfg, r) {
  const priv = (a, b2) => r.shuffle(PRIV).slice(0, r.int(a, b2));
  const u = (a) => [...new Set(a)];
  switch (cfg.ins) {
    case "pub": return u(["medicaid", ...(r.chance(0.85) ? ["medicare"] : []), ...(cfg.ninos && r.chance(0.7) ? ["chip"] : []), ...priv(1, 4)]);
    case "pub2": return u(["medicaid", "medicare", ...priv(1, 3)]);
    case "mm": return u(["medicaid", "medicare", ...priv(0, 3)]);
    case "mm1": return u(["medicaid", ...priv(1, 2)]);
    case "priv": return u([...(r.chance(0.5) ? ["medicaid"] : []), ...priv(2, 4)]);
    case "dent": return u(["medicaid", "delta", ...r.shuffle(["aetna", "cigna", "uhc"]).slice(0, r.int(0, 2))]);
    case "dentk": return u(["medicaid", "chip", "delta", ...r.shuffle(["aetna", "cigna", "uhc"]).slice(0, r.int(0, 2))]);
    case "vis": return u(["vsp", "eyemed", ...(r.chance(0.6) ? ["medicaid"] : [])]);
    case "hear": return u(["medicaid", ...priv(0, 2)]);
    default: return [];
  }
}

function faqsDe(cfg, insList, cash, sin) {
  const nom = cfg.es.toLowerCase(), pub = insList.filter((x) => SEG_PUB.includes(x));
  const q1 = insList.length
    ? ["¿Aceptan mi seguro? | Do you take my insurance?", `Aceptamos ${insList.slice(0, 3).map((x) => SEGURO[x]).join(", ")} y otros; la lista completa está en la ficha. Si no estás seguro, llama y lo revisamos contigo. | We take ${insList.slice(0, 3).map((x) => SEGURO[x]).join(", ")} and others; the full list is on this page. If you are not sure, call and we will check with you.`]
    : ["¿Cómo se paga? | How does payment work?", "Los precios están en la ficha y no cambian al llegar. Pagas en el lugar con tarjeta o efectivo. | Prices are on this page and do not change when you arrive. You pay on site by card or cash."];
  const q2 = ["¿Hablan español? | Do you speak Spanish?", "Sí, el equipo es bilingüe y hay intérprete cuando hace falta. | Yes, the team is bilingual and an interpreter is available when needed."];
  const e = {
    home: ["¿Cómo empiezo? | How do I get started?", "Reserva la primera visita en la app o llámanos; te decimos qué necesitamos y cuándo podemos empezar. | Book the first visit in the app or call us; we tell you what we need and when we can start."],
    trans: ["¿Con cuánta anticipación reservo? | How far ahead should I book?", "Lo mejor es un día antes; para viajes de la misma mañana, llámanos y vemos si hay un conductor libre. | The best is a day ahead; for same-morning rides, call us and we will see if a driver is free."],
    farm: ["¿Hacen entregas? | Do you deliver?", "Sí, en la ciudad y cerca; el costo está en la ficha. | Yes, in town and nearby; the cost is on this page."],
    vet: ["¿Atienden urgencias? | Do you take urgent visits?", "Sí, sin cita en el horario de atención; si es grave, llámanos antes de venir. | Yes, walk-in during open hours; if it is serious, call us before coming."],
    tele: ["¿Necesito una cita? | Do I need an appointment?", "Puedes reservar para hoy mismo desde tu teléfono; te llega el enlace por mensaje. | You can book for today from your phone; the link arrives by text message."],
  }[cfg.fam] ?? ["¿Cómo cuido mi privacidad? | How do you protect my privacy?", "Tu cita no dice por qué vienes. Lo que cuentes queda entre tú y el equipo. | Your booking does not say why you come. What you share stays between you and the team."];
  const q3 = cfg.escala ? ["¿Cuánto pago? | How much do I pay?", "Depende de tus ingresos; te lo decimos antes de reservar. No pedimos papeles. | It depends on your income; we tell you before you book. We do not ask for papers."]
    : sin !== false ? [`¿Qué pasa si no tengo seguro? | What if I have no insurance?`, `Te atendemos con precio fijo; ves el precio de ${nom} antes de reservar (desde ${usd(cash)}). | We see you at a flat price; you see the ${cfg.en.toLowerCase()} price before booking (from ${usd(cash, false)}).`]
      : ["¿Cuánto cuesta? | What does it cost?", "Está cubierto por Medicare y Medicaid; la familia no paga por el servicio. | It is covered by Medicare and Medicaid; the family does not pay for the service."];
  return [q1, q2, e, q3];
}

export function construir(cfg, k, idx) {
  const fam = FAM[cfg.fam], sub = `NEG-SALUD-${String(cfg.n).padStart(2, "0")}`;
  // nombre (no hay dos iguales dentro de la subcategoría: 7 es primo con 28 y con 40)
  const pool = FAM_CON_PERS.has(cfg.fam) ? [...LUGAR, ...PERS] : LUGAR;
  const nombre = `${cfg.tipos[k % cfg.tipos.length]} ${pool[(cfg.n * 5 + k * 7) % pool.length]}`;
  const g = rngDe(`r2s:g:${cfg.n}:${k}`);
  const mujer = cfg.mujer ? true : esSoloFem(cfg.doc) ? true : cfg.sex === "mujer" ? g() < 0.8 : undefined;
  const b = crear({ cat: CAT, sub, si: cfg.n, k, ord: idx, nombre, mujer });
  const r = b.r;
  b.id = b.id + SUFIJO_ID;
  b.owner.phone = `+1484555${1200 + idx}`;
  b.owner.email = `${b.owner.fn}.${b.owner.ln}.r2s${idx}@demo.example`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9.@]/g, "");
  b.factor = 0.9 + r() * 0.26;
  const anos = 2026 - b.founded;
  b.langs = ["es", "en"];
  b.subs = [sub];
  const aboutT = cfg.ab, f = (t) => t.replace(/\{o\}/g, b.owner.fn).replace(/\{st\}/g, b.calle).replace(/\{y\}/g, b.founded).replace(/\{c\}/g, b.cityNombre).replace(/\{n\}/g, nombre).replace(/\{a\}/g, anos);
  b.about = { es: f(aboutT[0]), en: f(aboutT[1]) };
  poner(b, CAT, sub, 6);
  b.mods = ["svc", "citas", "staff", "nov"];
  horario(b, horasDe(cfg.fam, r));

  // equipo (la persona titular + 1 a 4) y licencias
  const k0 = cfg.k0 !== undefined ? cfg.k0 : fam.k0;
  const pool2 = (cfg.roles ?? fam.staff).filter((x) => (KIND_ROL[x] ?? x) !== cfg.doc);
  const staffRoles = pool2.length ? pool2 : fam.staff;
  b.members = []; b.lic = [];
  const evitar = [b.owner.fn];
  const mk = (kind, nombreP, rol, licKind, since, fm, takes) => {
    let rl = rol; if (fm) rl = aFem(rol);
    const m = { kind, name: nombreP, role: bi(rl), langs: r.chance(0.5) ? ["es", "en"] : ["es"], spec: [], since, auto: r.chance(0.4), resp: [15, 30, 60][r.int(0, 2)], dep: 0, takes,
      bio: bi(`${rl.split(" | ")[0]} con ${r.int(3, 22)} años de experiencia. Atiende en español. | ${rol.split(" | ")[1] ?? rol.split(" | ")[0]} with ${r.int(3, 22)} years of experience. Sees clients in Spanish.`) };
    b.members.push(m);
    if (licKind) b.lic.push({ kind: licKind, m: b.members.length - 1 });
  };
  mk("owner", `${b.owner.fn} ${b.owner.ln}`, cfg.doc, k0, b.founded, b.owner.f, true);
  const nStaff = r.int(1, 4);
  for (let j = 0; j < nStaff; j++) {
    const tok = staffRoles[j % staffRoles.length], rol = KIND_ROL[tok] ?? tok, lk = KIND_ROL[tok] ? tok : null;
    const fm = esSoloFem(rol) ? true : r.chance(0.5), p = persona(r, fm, evitar); evitar.push(p.fn);
    mk("staff", p.nombre, rol, lk, r.int(b.founded, 2024), fm, lk !== "rn" && lk !== "lcsw");
  }
  if (!b.members.some((m) => m.takes)) b.members[0].takes = true;

  // servicios (todos los núcleo y casi todos los demás)
  const parsed = cfg.svc.map((s) => { const [sec, es, en, p, d, kd, core] = s.split("|"); return { sec: +sec, es, en, p: +p, d: +d, k: kd, core: core === "1" }; });
  let elegidos = parsed.filter((s) => s.core || r.chance(0.8));
  if (elegidos.length < 4) elegidos = parsed;
  const DESC = {
    cons: ["Te atienden con calma y te explican todo en español. Trae tu seguro o tu identificación.", "You are seen unhurried and everything is explained in Spanish. Bring your insurance or ID."],
    proc: ["Se hace en el lugar; te decimos el precio antes de reservar.", "Done on site; we tell you the price before you book."],
    free: ["Sin costo con tu seguro; sin seguro, precio fijo.", "No cost with your insurance; flat price without."],
    walk: ["Sin cita, por orden de llegada.", "No appointment, in order of arrival."],
    tele: ["Desde tu teléfono, en español, con enlace por mensaje.", "From your phone, in Spanish, with a link by text message."],
  };
  b.items = elegidos.map((s, i) => ({ sort: i, sec: s.sec, name: bi(`${s.es} | ${s.en}`), descr: bi(DESC[s.k].join(" | ")), price: s.p === 0 ? 0 : precio(b, s.p), dur: Math.max(15, s.d), buf: 0, kind: s.k, attrs: cfg.escala ? { esc: true } : {}, photos: r.chance(0.75) ? [b.photos[(i + 1) % b.photos.length]] : [], who: [] }));
  const usadas = [...new Set(b.items.map((x) => x.sec))].sort((a, c) => a - c), mapa = new Map(usadas.map((s, n2) => [s, n2]));
  b.secs = usadas.map((s) => bi(cfg.secs[s])); b.items.forEach((x) => { x.sec = mapa.get(x.sec); });

  // herramienta de salud
  const insList = insFor(cfg, r);
  const sin = cfg.sin !== false;
  const cash = Math.min(40000, Math.max(2000, cfg.cash + (cfg.escala ? 0 : r.int(-1, 1) * 500)));
  const tieneTele = b.items.some((x) => x.kind === "tele"), tieneWalk = b.items.some((x) => x.kind === "walk");
  b.hs = { ins: insList, sin, cash, langs: ["es", "en"], tele: tieneTele, nuevos: r.chance(0.94), wait: tieneWalk ? r.pick([10, 15, 20, 25, 30]) : null, escala: !!cfg.escala, sinid: !!cfg.sinid || r.chance(0.1), interp: !!cfg.escala || r.chance(0.4) };
  b.pol = { auto: b.members[0].auto, resp: b.members[0].resp, exp: 2, dep: 0, cxh: [2, 4, 12, 24][r.int(0, 3)], tol: 15, pick: true };
  const fv = ["cita", "online"];
  if (tieneWalk) fv.push("walk");
  if (insList.length) fv.push("seguro"); for (const kx of SEG_PUB) if (insList.includes(kx)) fv.push(kx);
  if (sin) fv.push("sinseguro");
  fv.push("esp", "medesp"); if (b.hs.escala) fv.push("escala"); if (b.hs.sinid) fv.push("sinid"); if (tieneTele) fv.push("tele"); if (b.hs.interp) fv.push("interp");
  if (tieneWalk || r.chance(0.5)) fv.push("hoy");
  if (b.hours[6].open) fv.push("finde"); if (b.hours.some((h) => h.open && h.ranges[0] && h.ranges[0][1] >= "20:00")) fv.push("noche");
  if (cfg.ninos) fv.push("ninos"); if (cfg.sex === "mujer") fv.push("mujer"); if (cfg.mayor) fv.push("mayor");
  if (b.founded <= 2016) fv.push("y10");
  b.fv = [...new Set(fv)];
  b.pay = ["local"];
  const nom2 = (l) => l.slice(0, 2).map((x) => SEGURO[x]);
  b.attrs = { m: "shop", salud: 1, ins: insList, cash: cash / 100, docs: b.members.length, ...(b.hs.wait ? { wait: b.hs.wait } : {}),
    tarjeta: { eta: bi(b.hs.wait ? `Sin cita · espera de unos ${b.hs.wait} min | Walk-in · about ${b.hs.wait} min wait` : `Con cita en la app | Book in the app`),
      fee: bi(cfg.escala ? `Según tus ingresos · desde ${usd(2000)} | Income-based · from ${usd(2000, false)}`
        : !sin ? `Cubierto por ${nom2(insList).join(" y ")} | Covered by ${nom2(insList).join(" & ")}`
        : insList.length ? `${nom2(insList).join(" y ")} · sin seguro ${usd(cash)} | ${nom2(insList).join(" & ")} · uninsured ${usd(cash, false)}`
        : `Precio fijo desde ${usd(cash)} | Flat price from ${usd(cash, false)}`) } };
  b.amenities = r.shuffle(["wifi", "estacionamiento", "accesible", "sala-ninos", "interprete"]).slice(0, 3);
  b.faqs = faqsDe(cfg, insList, cash, sin).map(([q, a]) => ({ q: bi(q), a: bi(a) }));

  // historia de visitas (más liviana que la ronda 1)
  const N = r.int(40, 105);
  const pesos = b.items.map((x) => [x, x.kind === "tele" ? 0.6 : x.kind === "walk" ? 3 : x.kind === "free" ? 1.4 : 2]);
  const elegir = () => ({ item: r.weighted(pesos), mi: r.weighted(b.members.map((m, mi) => [mi, m.takes ? (mi === 0 ? 1.6 : 1) : 0]).filter((z) => z[1] > 0)) });
  const pubs = insList.filter((z) => SEG_PUB.includes(z)), privs = insList.filter((z) => !SEG_PUB.includes(z));
  const detalle = (bb, item, M, rr) => {
    const x = rr(); let seg;
    if (!insList.length) seg = { kind: "none", insurer: null };
    else if (x < 0.55 && pubs.length) seg = { kind: rr.pick(pubs), insurer: null };
    else if (x < 0.7 && privs.length) seg = { kind: "priv", insurer: rr.pick(privs) };
    else if (x < 0.8) seg = { kind: "priv", insurer: rr.pick(["cigna", "uhc", "aetna", "highmark"].filter((z) => !insList.includes(z)).concat(["delta"])) };
    else seg = { kind: "none", insurer: null };
    if (seg.kind !== "priv") seg.insurer = seg.kind === "none" ? null : seg.kind;
    const acc = seg.kind !== "none" && (seg.kind === "priv" ? !!seg.insurer && insList.includes(seg.insurer) : insList.includes(seg.kind));
    const nombreS = seg.kind === "none" ? { es: "Sin seguro", en: "No insurance" } : { es: SEGURO[seg.insurer], en: SEGURO[seg.insurer] };
    const sinSeg = item.kind === "free" ? (sin ? cash : 0) : item.price;
    const total = acc ? 0 : sinSeg;
    const pub = seg.kind === "medicaid" || seg.kind === "chip";
    const lab = acc ? (item.kind === "free" || pub || item.price === 0 ? ["$0", "$0"] : ["Copago", "Copay"]) : [usd(total), usd(total, false)];
    const pie = acc ? (item.kind === "free" || pub ? ["CON TU SEGURO", "WITH YOUR INSURANCE"] : ["SEGÚN TU PLAN", "PER YOUR PLAN"]) : ["SIN SEGURO", "UNINSURED"];
    const hijo = cfg.ninos ? rr.chance(0.4) : rr.chance(0.05);
    return { det: { rubro: "salud", svc: item.name, k: item.kind, tele: item.kind === "tele", para: hijo ? "hijo" : "yo", sms: true, cualquiera: false, seguro: { kind: seg.kind, insurer: seg.insurer, plan: null, last4: null, acepta: acc, nombre: nombreS }, precio: { es: `${lab[0]} · ${pie[0]}`, en: `${lab[1]} · ${pie[1]}` }, sinSeg }, sub: total, tot: total, dur: Math.max(15, item.dur) };
  };
  const { ops, hechas } = citasHistoria(b, r, { N, proximas: r.int(3, 6), hooks: { elegir, detalle } });
  b.ops = ops;
  const rv = resenas(b, hechas, BANCO, r, { min: 15, max: 40 });
  b.reviews = rv.reseñas; b.helpful = rv.util;
  const clinica = ["med", "dent", "vis", "ther", "ment", "lab", "tele"].includes(cfg.fam);
  const pool3 = NOV.filter((p) => (insList.length || !/seguros/.test(p.t)) && (clinica || !/doctora/.test(p.t)) && (["med", "lab", "farm", "home", "tele"].includes(cfg.fam) || !/Vacunas de temporada/.test(p.t)));
  b.posts = novedades(b, pool3, r, { n: r.int(3, 6) });
  b.follows = seguidores2(b, r);
  return b;
}

/* Seguidores: 15 a 80 personas del padrón (más de su ciudad). */
function seguidores2(b, r) {
  const n = r.int(15, 80), mia = r.shuffle(CLIENTES.filter((c) => c.city === b.city).map((c) => c.i)), otra = r.shuffle(CLIENTES.filter((c) => c.city !== b.city).map((c) => c.i));
  const S = new Set();
  while (S.size < n) { if (r() < 0.65 && mia.length) S.add(mia.shift()); else if (otra.length) S.add(otra.shift()); else if (mia.length) S.add(mia.shift()); else break; }
  return [...S];
}
