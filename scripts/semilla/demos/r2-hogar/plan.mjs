/* Ronda 2 · Hogar · plan de cada negocio (catálogo, equipo, tarjeta, filtros, horario, preguntas, novedades).
   Es la versión de c/oficios.mjs (planOficio) para las subcategorías 06–58: toma los textos de cada subcategoría de subsN.mjs en vez de los fijos de las cinco primeras. */
import { Rng, BI, redondea, fotosDeSubs, px, CIUDADES, money } from "../c/base.mjs";
import { armarNovedades } from "../c/textos.mjs";

export const MOD = { CAT: "NEG-HOGAR", RUBRO: "hogar" };
const NOMBRE_STAFF_H = ["Edwin", "Jorge", "Víctor", "Ángel", "Nelson", "Samuel", "Gabriel", "Darío", "Efraín", "Ismael", "Alberto", "Rubén"], NOMBRE_STAFF_M = ["Yanira", "Sonia", "Lourdes", "Idalia", "Esperanza", "Carolina", "Evelyn", "Wendy", "Ivelisse", "Nancy"];
const AP = ["Rodríguez", "Martínez", "Díaz", "Pérez", "Santana", "Jiménez", "Almonte", "Peña", "Reyes", "Núñez", "Vargas", "Féliz", "Batista", "Méndez", "Ortiz", "Rosario", "Mejía", "Castillo", "Ramírez", "Torres", "Soto", "Colón", "Medina", "Polanco", "Guzmán", "Morel", "Brito", "Cruz", "Paulino", "Heredia"];
const LIC = {
  hic: [["Contratista registrado en Pennsylvania (HIC), con seguro.", "Pennsylvania-registered contractor (HIC), insured."], ["Estamos registrados como contratistas de mejoras del hogar (HIC) en Pennsylvania y tenemos seguro de responsabilidad. Pídenos el comprobante cuando quieras.", "We are registered as a home improvement contractor (HIC) in Pennsylvania and carry liability insurance. Ask us for proof any time."]],
  ins: [["Negocio con seguro de responsabilidad.", "Business with liability insurance."], ["Tenemos seguro de responsabilidad. Pídenos el comprobante cuando quieras.", "We carry liability insurance. Ask us for proof any time."]],
  pest: [["Aplicadores con licencia de pesticidas de Pennsylvania y seguro.", "Pennsylvania-licensed pesticide applicators, insured."], ["Nuestros aplicadores tienen la licencia de pesticidas de Pennsylvania y tenemos seguro de responsabilidad. Pídenos el comprobante cuando quieras.", "Our applicators hold the Pennsylvania pesticide license and we carry liability insurance. Ask us for proof any time."]],
};

function defServicio(tupla, key, B, r, i, fotos) {
  const [es, en, des, den, kind, price0, dur, attrs0, opts0] = tupla;
  const a = JSON.parse(JSON.stringify(attrs0 ?? {})), f = 0.9 + r.next() * 0.24;
  let price = price0;
  if (kind === "area") price = Math.max(25, Math.round((price0 * f) / 5) * 5);
  else if (price0 > 0) price = redondea(price0 * f, price0 >= 20000 ? 500 : price0 >= 3000 ? 100 : 50);
  if (a.rng) a.rng = a.rng.map((x) => redondea(x * f, x >= 100000 ? 5000 : 1000));
  if (a.min) a.min = redondea(a.min * f, 500);
  if (a.sur) a.sur = redondea(a.sur * f, 500);
  if (a.x) a.x = a.x.map((x) => ({ ...x, p: redondea(x.p * f, 100) }));
  if (a.days) a.days = [Math.min(30, a.days[0]), Math.min(30, a.days[1])];
  const opts = (opts0 ?? []).map((g) => ({ ...g, o: g.o.map((o) => ({ ...o, p: o.p === 0 ? 0 : o.p < 0 ? -redondea(-o.p * f, 500) : redondea(o.p * f, 100) })) }));
  if (!a.days && dur > 480) a.days = [1, Math.ceil(dur / 480)]; // más de 8 h: se muestra en días
  const dur2 = a.days ? null : Math.max(15, dur); // la operación pide de 15 a 600 min
  return { m: "svc", key, es, en, des, den, kind, price, dur: dur2, from: ["desde", "pres", "cotiza"].includes(kind), attrs: a, opts, fotos: [px(fotos[(i * 7 + B.idx) % fotos.length])], feat: i < 2, sort: i };
}

const GENERICAS = [
  { title: "Ya hacemos presupuestos por la app", body: "Mándanos fotos del trabajo y te respondemos con el precio por escrito. Sin visita para lo sencillo." },
  { title: "Abrimos los sábados", body: "Desde este mes atendemos los sábados hasta el mediodía. Reserva tu hora en la app." },
  { title: "Gracias por las 5 estrellas", body: "Este año ya vamos por varios cientos de trabajos. Gracias a cada vecino que nos recomienda." },
  { title: "Nuevo en el equipo", body: "Se une una persona más para acortar la espera. Los tiempos de cita bajan esta semana." },
  { title: "Horario de feriados", body: "En los feriados atendemos solo lo urgente. Las citas normales vuelven al día siguiente." },
];

export function planHogar(S, B) {
  const r = new Rng(B.seed + ":plan"), ciudad = CIUDADES[B.city], c = ciudad.nombre;
  const subs = [B.sub, ...r.some(S.otras, r.int(1, 2))];
  // Fotos: primero las de la subcategoría y las parecidas; si faltan, las de la categoría
  const prop = fotosDeSubs(subs, "-"), resto = fotosDeSubs([], "NEG-HOGAR").filter((x) => !prop.includes(x));
  const nGal = r.int(6, 8), gal = [...r.shuffle(prop).slice(0, nGal), ...r.shuffle(resto)].slice(0, nGal);
  const fotos = gal;
  // Servicios
  const entradas = S.base.map((t, i) => [t, `${B.sub}:b${i}`]);
  const alAzar = r.some(S.resto.map((t, i) => [t, `${B.sub}:r${i}`]), Math.min(S.resto.length, r.int(Math.max(3, S.resto.length - 2), S.resto.length)));
  const tieneEmer = !!S.emer && r.chance(0.72), conPlan = !!S.plan && r.chance(0.45);
  const lista = [...entradas, ...alAzar, ...(tieneEmer ? [[S.emer, `${B.sub}:emer`]] : []), ...(conPlan ? [[S.plan, `${B.sub}:plan`]] : [])];
  const items = lista.map(([t, k], i) => defServicio(t, k, B, r, i, fotos));
  const secciones = [];
  let sortSec = 0;
  for (const [es, en, ks] of [["Diagnóstico y visitas", "Visits and diagnosis", ["visita", "hora"]], ["Trabajos con precio", "Priced jobs", ["fijo", "area"]], ["Presupuestos", "Estimates", ["pres"]], ["Emergencias 24/7", "Emergencies 24/7", ["emer"]], ["Planes", "Plans", ["plan"]]]) {
    const its = items.filter((x) => ks.includes(x.kind));
    if (its.length) secciones.push({ es, en, sort: sortSec++, items: its });
  }
  // Tienda (apartar, 48 h) y renta de herramienta
  const tiendaDef = S.tienda ?? [];
  const tienda = tiendaDef.length && r.chance(0.6) ? r.some(tiendaDef, r.int(Math.min(3, tiendaDef.length), tiendaDef.length)).map((t, i) => ({ m: "shop", es: t[0], en: t[1], des: t[2], den: t[3], price: redondea(t[4] * (0.92 + r.next() * 0.16), t[4] >= 10000 ? 500 : 100), stock: "qty", left: Math.max(1, Math.floor(t[5] * r.next())) + 1, par: t[5], fotos: [px(fotos[(i * 5 + B.idx + 3) % fotos.length])], channels: ["pick"], sort: i })) : [];
  const rentaDef = S.renta ?? [];
  const renta = rentaDef.length && r.chance(0.65) ? rentaDef.map((t, i) => ({ m: "renta", es: t[0], en: t[1], des: `Renta por día · depósito $${t[3] / 100}`, den: `Daily rental · $${t[3] / 100} deposit`, price: t[2], dep: t[3], unit: "dia", stock: "qty", left: t[4], par: t[4], fotos: [px(fotos[(i * 3 + B.idx + 9) % fotos.length])], channels: ["pick"], sort: i })) : [];
  const todas = [...secciones, ...(tienda.length ? [{ m: "shop", es: "Tienda", en: "Shop", sort: 10, items: tienda }] : []), ...(renta.length ? [{ m: "renta", es: "Renta de herramienta", en: "Tool rental", sort: 11, items: renta }] : [])];
  // Equipo, modelo y reglas
  const crew = r.int(1, 6), modelo = crew <= 1 ? "solo" : "shop";
  const h24 = tieneEmer || items.some((x) => x.kind === "emer"), eta = r.pick([30, 45, 60, 60, 90]);
  const rate = redondea(9500 * (0.9 + r.next() * 0.3), 500);
  const dep = r.chance(0.5) ? 0 : r.pick([2500, 3000, 4000, 5000]);
  const settings = [
    `insert into booking_policies (business_id, auto_approve, response_min, expires_h, deposit_cents, cancel_free_h, tolerance_min, deposit_kinds, deposit_big_over_cents, deposit_big_cents, deposit_min_price_cents, staff_pick) values (b, ${r.chance(0.35)}, ${r.pick([15, 30, 30, 60])}, 2, ${dep}, ${r.pick([2, 12, 24, 24])}, 15, ${dep ? "array['fijo','pres']::text[]" : "'{}'::text[]"}, null, null, null, true) on conflict (business_id) do nothing;`,
    `insert into trade_settings (business_id, labor_rate_cents, warranty_months, warranty_miles, same_day_cutoff_h, bays, h24, emergency_eta_min) values (b, ${rate}, null, null, null, null, ${h24}, ${eta}) on conflict (business_id) do nothing;`,
  ];
  // Horario
  const sat = r.pick([[8, 14], [8, 15], [9, 14], [8, 13]]), lv = r.pick([[7, 18], [7, 19], [8, 17], [7, 17]]);
  const dom0 = r.chance(0.15) ? [10, 15] : null;
  const R = (a) => (a ? [[`${String(a[0]).padStart(2, "0")}:00`, `${String(a[1]).padStart(2, "0")}:00`]] : null);
  const semana = [R(dom0), R(lv), R(lv), R(lv), R(lv), R(lv), R(sat)];
  // Filtros (lib/oficios.ts › recalcularFiltros) y etiquetas propias
  const F = new Set(["cita", "online"]);
  if (items.some((s) => (s.kind === "pres" && !s.price) || (s.kind === "visita" && (s.attrs.free || !s.price)))) F.add("presfree");
  if (items.some((s) => s.kind === "hora")) F.add("hora");
  if (items.some((s) => ["fijo", "area"].includes(s.kind))) F.add("trabajo");
  if (items.some((s) => s.kind === "plan")) F.add("plan");
  if (h24) F.add("h24");
  if (dep > 0) F.add("deposit");
  const modulos = ["svc", "citas", "cot", "staff", "nov"];
  if (tienda.length) { modulos.push("shop"); F.add("tienda"); }
  if (renta.length) { modulos.push("renta"); F.add("renta"); }
  const conLic = S.lic === "hic" || S.lic === "pest";
  if (conLic) F.add("lic");
  if (S.lic === "ins" || r.chance(0.75)) F.add("seguro");
  if (B.founded <= 2016) F.add("y10");
  if (r.chance(0.6)) F.add("sameday");
  if (semana[0] || semana[6]) F.add("finde");
  F.add("galeria");
  const t = new Set(items.map((x) => x.kind)); F.add(t.has("pres") ? "tg" : "tm");
  if (items.some((x) => x.kind === "fijo" && x.price < 12000)) F.add("tp");
  // Tarjeta
  const primeraVisita = items.find((x) => x.kind === "visita");
  const tarjeta = {
    eta: h24 ? BI(`Emergencia 24/7 · llega en ~${eta} min`, `24/7 emergency · arrives in ~${eta} min`) : BI(r.pick(["Cita esta semana", "Presupuesto gratis en tu casa", "Mismo día si llamas temprano"]), r.pick(["Booking this week", "Free estimate at your home", "Same day if you call early"])),
    fee: primeraVisita && primeraVisita.price > 0 ? BI(`Visita ${money(primeraVisita.price)} · se descuenta`, `Visit ${money(primeraVisita.price)} · credited to the job`) : BI("Presupuesto gratis", "Free estimate"),
    offer: BI(...S.offer),
  };
  const attrs = { m: modelo, crew, hogar: 1, tarjeta };
  // Equipo
  const first = (m) => (m ? r.pick(NOMBRE_STAFF_M) : r.pick(NOMBRE_STAFF_H));
  const nStaff = Math.min(3, Math.max(1, crew - 1));
  const y = B.founded, n0 = B.owner.nombre;
  const bios = [
    BI(`Empecé en ${y} con una camioneta y una caja de herramientas. Hoy somos un equipo y seguimos tratando cada casa como si fuera la de mi mamá.`, `I started in ${y} with a truck and a toolbox. Today we are a team and we still treat every home like it was my mother’s.`),
    BI(`Llegué de Santo Domingo y abrí en ${y}. Mi regla es simple: el precio por escrito antes de empezar y nada de sorpresas al final.`, `I came from Santo Domingo and opened in ${y}. My rule is simple: the price in writing before we start and no surprises at the end.`),
    BI(`Aprendí el oficio con mi tío y abrí por mi cuenta en ${y}. Aquí te explicamos el trabajo en español o en inglés, como prefieras.`, `I learned the trade from my uncle and went out on my own in ${y}. Here we explain the job in Spanish or English, whichever you prefer.`),
    BI(`Llevo desde ${y} en el valle. Lo que más me enorgullece es que la gente nos llama otra vez y nos recomienda a sus vecinos.`, `I have been in the valley since ${y}. What I am proudest of is that people call us again and recommend us to their neighbors.`),
  ];
  const team = [{ name: `${n0} ${B.owner.ap}`, nick: r.chance(0.3) ? r.pick(["Chelo", "Beto", "Tito", "Papi", "Yeyo", "Chino", "Nene", "Gordo"]) : null, role: BI(...S.owner), since: y, langs: ["es", "en"].slice(0, r.chance(0.5) ? 2 : 1), bio: r.pick(bios), bookings: true, spec: [] }];
  for (let i = 0; i < nStaff; i++) { const m = i === 2 || r.chance(0.2); team.push({ name: `${first(m)} ${r.pick(AP)}`, role: BI(...S.staff[i]), since: r.int(y + 1, 2024), langs: r.chance(0.4) ? ["es", "en"] : ["es"], bio: null, bookings: i < 2 }); }
  // Texto del negocio
  const lic = LIC[S.lic] ?? LIC.ins;
  const extra = [h24 ? ["Emergencias 24/7.", "24/7 emergencies."] : null, tienda.length ? ["Apartas productos desde la app y los recoges en 48 horas.", "Reserve products in the app and pick them up within 48 hours."] : null, renta.length ? ["También rentamos herramienta por día.", "We also rent tools by the day."] : null].filter(Boolean);
  const about = BI(`${S.tipo[0]} en ${c} desde ${y}. ${lic[0][0]} ${extra.map((e) => e[0]).join(" ")} Hablamos español e inglés.`.replace(/\s+/g, " ").trim(), `${S.tipo[1]} in ${c} since ${y}. ${lic[0][1]} ${extra.map((e) => e[1]).join(" ")} We speak Spanish and English.`.replace(/\s+/g, " ").trim());
  const am = ["acepta-tarjeta", "con-seguro", "plan-de-pagos"];
  if (F.has("presfree")) am.push("presupuesto-gratis");
  if (conLic) am.push("con-licencia");
  if (h24) am.push("emergencia-24-7");
  if (tienda.length) am.push("productos-a-la-venta", "apartado");
  // Preguntas frecuentes
  const zona = r.pick([15, 20, 25]);
  const faqs = [
    ["¿Dan el precio antes de empezar?", "Do you give the price before starting?", "Sí. Te mandamos el precio por escrito en la app y solo empezamos cuando lo aceptas. Si aparece algo extra, te pedimos tu OK antes de hacerlo.", "Yes. We send the price in writing in the app and only start once you accept it. If something extra comes up, we ask for your OK first."],
    [S.lic === "pest" ? "¿Tienen licencia y seguro?" : "¿Tienen seguro?", S.lic === "pest" ? "Are you licensed and insured?" : "Are you insured?", lic[1][0], lic[1][1]],
    h24 ? ["¿Atienden emergencias de noche y fines de semana?", "Do you handle night and weekend emergencies?", `Sí, las 24 horas. Normalmente llegamos en unos ${eta} minutos dentro de la zona de ${c}.`, `Yes, 24 hours. We usually arrive in about ${eta} minutes inside the ${c} area.`]
      : ["¿Qué tan pronto pueden venir?", "How soon can you come?", "Normalmente tenemos espacio dentro de la semana. Reserva por la app y te confirmamos el primer horario libre.", "We usually have room within the week. Book in the app and we confirm the first free slot."],
    ["¿Qué zona cubren?", "What area do you cover?", `Atendemos en ${c} y los pueblos de alrededor, hasta unas ${zona} millas. Si estás más lejos, escríbenos y vemos.`, `We serve ${c} and the surrounding towns, up to about ${zona} miles. If you are farther, message us and we will see.`],
    ["¿Cómo se paga?", "How do I pay?", "Con tarjeta en la app al terminar, o en efectivo o tarjeta en persona. Te damos el recibo en el momento.", "By card in the app when we finish, or cash or card in person. You get the receipt on the spot."],
    ["¿El presupuesto se cobra?", "Is the estimate charged?", dep ? `La visita lleva un depósito de ${money(dep)} que se descuenta del trabajo si lo hacemos con nosotros.` : primeraVisita && primeraVisita.price > 0 ? "La visita de diagnóstico se descuenta del trabajo si lo hacemos con nosotros. Los presupuestos son gratis." : "No. Los presupuestos son gratis.", dep ? `The visit takes a ${money(dep)} deposit that is credited to the job if we do it.` : primeraVisita && primeraVisita.price > 0 ? "The diagnostic visit is credited to the job if we do it. Estimates are free." : "No. Estimates are free."],
    ...(S.faq ?? []),
  ];
  // Novedades (3 a 6)
  const novs = [...S.news.map(([title, body]) => ({ title, body })), ...r.some(GENERICAS, 3)];
  const s1 = items.find((x) => x.kind === "fijo") ?? items[0];
  if (s1 && s1.price > 0) novs.push({ kind: "oferta", title: `${s1.es} con descuento`.slice(0, 60), body: `Por tiempo limitado: ${s1.es.toLowerCase()} a precio especial. Mismo equipo, mismo cuidado de siempre.`, was: s1.price + Math.max(1000, Math.round(s1.price * 0.12 / 100) * 100), now: s1.price });
  const posts = armarNovedades(B, novs.map((x) => ({ ...x, kind: x.kind ?? "novedad" })), r, r.int(3, 6));
  return {
    subs, galeria: gal, items, secciones: todas, settings, about, attrs, filtros: [...F], amenities: [...new Set(am)], langs: r.chance(0.55) ? ["es", "en"] : ["es"], modulos, semana, team,
    deCasa: false, radio: r.pick([15, 20, 25, 30, 35]), operation: "local", svcModel: "emp", stripe: true, faqs, h24, eta, tienda, renta, dep, certOwner: null, hogar: true, posts,
  };
}
