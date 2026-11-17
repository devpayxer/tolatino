/* Hogar y Auto (oficios): plan del negocio (catálogo, equipo, tarjeta, filtros, horario) e historia (citas, apartados, rentas, reseñas, novedades). */
import { Rng, q, J, BI, redondea, fotosDeSubs, px, hash, diaDeVida, money, CIUDADES } from "./base.mjs";
import { elegirClientes, CLIENTES } from "./nucleo.mjs";
import { textoResena, textoReplica, armarNovedades } from "./textos.mjs";

const inc = (a) => a;
const NOMBRE_STAFF_H = ["Edwin", "Jorge", "Víctor", "Ángel", "Nelson", "Samuel", "Gabriel", "Darío", "Efraín", "Ismael", "Alberto", "Rubén"], NOMBRE_STAFF_M = ["Yanira", "Sonia", "Lourdes", "Idalia", "Esperanza", "Carolina", "Evelyn", "Wendy", "Ivelisse", "Nancy"];
const AP = ["Rodríguez", "Martínez", "Díaz", "Pérez", "Santana", "Jiménez", "Almonte", "Peña", "Reyes", "Núñez", "Vargas", "Féliz", "Batista", "Méndez", "Ortiz", "Rosario", "Mejía", "Castillo", "Ramírez", "Torres", "Soto", "Colón", "Medina", "Polanco", "Guzmán", "Morel", "Brito", "Cruz", "Paulino", "Heredia"];

const escala = (n, f) => Math.max(1, Math.round(n * f));

function defServicio(mod, key, B, r, i, fotos) {
  const [es, en, des, den, kind, price0, dur, attrs0, opts0] = mod.SERV[key];
  const a = JSON.parse(JSON.stringify(attrs0 ?? {})), f = 0.9 + r.next() * 0.24;
  let price = price0;
  if (kind === "area") price = Math.max(50, Math.round((price0 * f) / 50) * 50);
  else if (price0 > 0) price = redondea(price0 * f, price0 >= 20000 ? 500 : 100);
  if (a.rng) a.rng = a.rng.map((x) => redondea(x * f, 5000));
  if (a.min) a.min = redondea(a.min * f, 500);
  if (a.alt) a.alt = redondea(a.alt * f, 500);
  if (a.sur) a.sur = redondea(a.sur * f, 500);
  if (a.sz) a.sz = a.sz.map((x) => redondea(x * f, 100));
  if (a.x) a.x = a.x.map((x) => ({ ...x, p: redondea(x.p * f, 100) }));
  if (kind === "cotiza") price = a.rng[0];
  if (kind === "diag" && price0 === 0) price = 0;
  const opts = (opts0 ?? []).map((g) => ({ ...g, o: g.o.map((o) => ({ ...o, p: o.p === 0 ? 0 : o.p < 0 ? -redondea(-o.p * f, 500) : redondea(o.p * f, 100) })) }));
  const dur2 = a.days || kind === "grua" ? null : dur;
  return { m: "svc", key, es, en, des, den, kind, price, dur: dur2, from: ["desde", "pres", "cotiza"].includes(kind), attrs: a, opts, fotos: [px(fotos[(i * 7 + B.idx) % fotos.length])], feat: i < 2, sort: i };
}

export function planOficio(mod, B) {
  const r = new Rng(B.seed + ":plan"), sub = mod.SUBS.find((s) => s.id === B.sub), cfg = mod.POR_SUB[B.sub], hogar = mod.RUBRO === "hogar";
  const ciudad = CIUDADES[B.city], subs = [B.sub, ...r.some(sub.otras, r.int(1, 2))];
  const fotos = fotosDeSubs(subs, mod.CAT), gal = r.shuffle(fotos).slice(0, Math.min(fotos.length, r.int(6, 8)));
  const keys = [...cfg.base, ...r.some(cfg.resto, r.int(3, 5))];
  const tieneEmer = hogar && cfg.emer && r.chance(0.72);
  if (tieneEmer) keys.push(cfg.emer);
  if (hogar && cfg.plan && r.chance(0.45)) keys.push(cfg.plan);
  const items = keys.map((k, i) => defServicio(mod, k, B, r, i, fotos));
  // Secciones por forma de cobrar (en el orden en que salen)
  const orden = ["visita", "diag", "fijo", "hora", "area", "desde", "cotiza", "pres", "insp", "goma", "lav", "emer", "plan", "grua"];
  const sec = [];
  for (const k of orden) { const its = items.filter((x) => x.kind === k); if (its.length) sec.push({ k, its }); }
  const agrupa = hogar ? [["Diagnóstico y visitas", "Visits and diagnosis", ["visita", "hora"]], ["Trabajos con precio", "Priced jobs", ["fijo", "area"]], ["Presupuestos", "Estimates", ["pres"]], ["Emergencias 24/7", "Emergencies 24/7", ["emer"]], ["Planes", "Plans", ["plan"]]]
    : [["Diagnóstico", "Diagnosis", ["diag"]], ["Mantenimiento", "Maintenance", ["fijo", "goma", "lav"]], ["Reparaciones", "Repairs", ["desde", "cotiza"]], ["Inspección y emisiones", "Inspection and emissions", ["insp"]]];
  const secciones = [];
  let sortSec = 0;
  for (const [es, en, ks] of agrupa) { const its = items.filter((x) => ks.includes(x.kind)); if (its.length) secciones.push({ es, en, sort: sortSec++, items: its }); }
  // Tienda (apartar) y renta
  const tiendaDef = mod.TIENDA[B.sub] ?? [];
  const conTienda = tiendaDef.length && r.chance(hogar ? 0.5 : 0.55);
  const tienda = conTienda ? r.some(tiendaDef, r.int(3, tiendaDef.length)).map((t, i) => ({ m: "shop", es: t[0], en: t[1], des: t[2], den: t[3], price: redondea(t[4] * (0.92 + r.next() * 0.16), t[4] >= 10000 ? 500 : 100), stock: "qty", left: Math.max(1, Math.floor(t[5] * r.next())) + 1, par: t[5], fotos: [px(fotos[(i * 5 + B.idx + 3) % fotos.length])], channels: ["pick"], sort: i })) : [];
  const conRenta = hogar && ["NEG-HOGAR-01", "NEG-HOGAR-03", "NEG-HOGAR-02"].includes(B.sub) && r.chance(0.55);
  const renta = conRenta ? r.some(mod.RENTA, r.int(3, 5)).map((t, i) => ({ m: "renta", es: t[0], en: t[1], des: `Renta por día · depósito $${t[3] / 100}`, den: `Daily rental · $${t[3] / 100} deposit`, price: t[2], dep: t[3], unit: "dia", stock: "qty", left: t[4], par: t[4], fotos: [px(fotos[(i * 3 + B.idx + 9) % fotos.length])], channels: ["pick"], sort: i })) : [];
  const sueltos = [];
  const tiendaItems = tienda.length ? { m: "shop", es: "Tienda", en: "Shop", sort: 10, items: tienda } : null;
  const rentaItems = renta.length ? { m: "renta", es: "Renta de herramienta", en: "Tool rental", sort: 11, items: renta } : null;
  // Modelo del negocio, equipo y herramienta
  const crew = hogar ? r.int(1, 6) : r.int(2, 7);
  const modelo = hogar ? (crew <= 1 ? "solo" : "shop") : (B.sub === "NEG-AUTO-02" ? "solo" : crew >= 4 ? "bay" : "shop");
  const dom = !hogar && B.sub === "NEG-AUTO-02";
  const tieneWalk = items.some((x) => x.attrs.walk), iDom = items.some((x) => x.attrs.w === "dom");
  const h24 = tieneEmer, eta = r.pick([30, 45, 60, 60, 90]);
  const warrM = hogar ? null : r.pick([6, 12, 12, 24, 24, 36]), warrMi = hogar ? null : { 6: 6000, 12: 12000, 24: 24000, 36: 36000 }[warrM];
  const cutoff = hogar ? null : r.pick([11, 12, 14, 15]);
  const rate = redondea((hogar ? 9500 : 9000) * (0.9 + r.next() * 0.3), 500);
  // Reglas de reserva
  const dep = r.chance(0.5) ? 0 : r.pick([2500, 3000, 4000, 5000]);
  const polKinds = dep ? (hogar ? ["fijo", "pres"] : ["desde", "cotiza"]) : [];
  const settings = [
    `insert into booking_policies (business_id, auto_approve, response_min, expires_h, deposit_cents, cancel_free_h, tolerance_min, deposit_kinds, deposit_big_over_cents, deposit_big_cents, deposit_min_price_cents, staff_pick) values (b, ${r.chance(0.35)}, ${r.pick([15, 30, 30, 60])}, 2, ${dep}, ${r.pick([2, 12, 24, 24])}, 15, ${polKinds.length ? "array[" + polKinds.map((k) => `'${k}'`).join(",") + "]::text[]" : "'{}'::text[]"}, null, null, null, true) on conflict (business_id) do nothing;`,
    `insert into trade_settings (business_id, labor_rate_cents, warranty_months, warranty_miles, same_day_cutoff_h, bays, h24, emergency_eta_min) values (b, ${rate}, ${warrM ?? "null"}, ${warrMi ?? "null"}, ${cutoff ?? "null"}, ${modelo === "bay" ? r.int(3, 8) : !hogar && modelo === "shop" ? r.int(2, 4) : "null"}, ${h24}, ${eta}) on conflict (business_id) do nothing;`,
  ];
  // Horario
  const sat = r.pick([[8, 14], [8, 15], [9, 14], [8, 13]]), lv = hogar ? r.pick([[7, 18], [7, 19], [8, 17], [7, 17]]) : r.pick([[8, 18], [8, 17], [7, 18], [8, 19]]);
  const dom0 = (!hogar && B.sub === "NEG-AUTO-03") || r.chance(0.15) ? [[10, 15]] : null;
  const R = (a) => (a ? [[`${String(a[0]).padStart(2, "0")}:00`, `${String(a[1]).padStart(2, "0")}:00`]] : null);
  const semana = [dom0 ? R(dom0[0]) : null, R(lv), R(lv), R(lv), R(lv), R(lv), R(sat)];
  // Filtros derivados (lib/oficios.ts › recalcularFiltros) + etiquetas propias
  const F = new Set(), citas = true;
  if (tieneWalk) F.add("walkin");
  if (items.some((s) => !s.attrs.walk && s.kind !== "grua")) { F.add("cita"); F.add("online"); }
  if (iDom) F.add("domicilio");
  if (items.some((s) => s.kind === "diag" && (!s.price || s.attrs.cred))) F.add("diagfree");
  if (items.some((s) => (s.kind === "pres" && !s.price) || (s.kind === "visita" && (s.attrs.free || !s.price)))) F.add("presfree");
  if (items.some((s) => s.kind === "hora")) F.add("hora");
  if (hogar && items.some((s) => ["fijo", "area"].includes(s.kind))) F.add("trabajo");
  if (items.some((s) => s.kind === "plan")) F.add("plan");
  if (h24 || items.some((s) => s.kind === "emer")) F.add("h24");
  if (dep > 0) F.add("deposit");
  if (warrM) F.add("garantia");
  const modulos = ["svc", "citas", "cot", "staff", "nov"];
  if (tienda.length) { modulos.push("shop"); F.add("tienda"); }
  if (renta.length) { modulos.push("renta"); F.add("renta"); }
  if (hogar) { F.add("lic"); if (r.chance(0.75)) F.add("seguro"); if (B.founded <= 2016) F.add("y10"); if (r.chance(0.6)) F.add("sameday"); if (semana[0] || semana[6]) F.add("finde"); F.add("galeria"); const t = new Set(items.map((x) => x.kind)); F.add(t.has("pres") ? "tg" : "tm"); if (items.some((x) => x.kind === "fijo" && x.price < 12000)) F.add("tp"); }
  else { if (r.chance(0.5)) F.add("ase"); if (items.some((s) => s.kind === "insp")) F.add("inspector"); if (r.chance(0.7)) F.add("seguro"); if (cutoff) F.add("sameday"); if (r.chance(0.3)) F.add("cortesia"); if (r.chance(0.25)) F.add("financia"); if (B.founded <= 2016) F.add("y10"); }
  // Tarjeta
  const primeraVisita = items.find((x) => x.kind === "visita" || x.kind === "diag");
  const tarjeta = {
    eta: h24 ? BI(`Emergencia 24/7 · llega en ~${eta} min`, `24/7 emergency · arrives in ~${eta} min`) : hogar ? BI(r.pick(["Cita esta semana", "Presupuesto gratis en tu casa", "Mismo día si llamas temprano"]), r.pick(["Booking this week", "Free estimate at your home", "Same day if you call early"])) : BI(r.pick(["Cita hoy o mañana", "Sin cita hasta las 4 PM", "Resultados el mismo día"]), r.pick(["Booking today or tomorrow", "Walk-ins until 4 PM", "Same-day results"])),
    fee: primeraVisita && primeraVisita.price > 0 ? BI(`${hogar ? "Visita" : "Diagnóstico"} ${money(primeraVisita.price)} · se descuenta`, `${hogar ? "Visit" : "Diagnosis"} ${money(primeraVisita.price)} · credited to the job`) : BI(hogar ? "Presupuesto gratis" : "Diagnóstico gratis", hogar ? "Free estimate" : "Free diagnosis"),
    offer: oferta(mod, B, items, tienda, r),
  };
  const aten = r.pick([[1, 2], [2, 3], [3, 4]]);
  const attrs = hogar ? { m: modelo, crew, hogar: 1, tarjeta } : { m: modelo, mk: r.some(mod.MARCAS, r.int(8, 14)), veh: r.pick([["c", "s"], ["c", "s"], ["c", "s", "t"]]), auto: 1, ...(modelo === "bay" ? { bays: r.int(3, 8) } : {}), warr: [warrM, warrMi], tarjeta };
  // Equipo
  const first = (m) => (m ? r.pick(NOMBRE_STAFF_M) : r.pick(NOMBRE_STAFF_H));
  const ownerName = `${B.owner.nombre} ${B.owner.ap}`;
  const nStaff = Math.min(3, Math.max(1, crew - 1)), staffRoles = mod.ROLES.staff[B.sub];
  const sobre = ownerBio(mod, B, r);
  const team = [{ name: ownerName, nick: r.chance(0.3) ? r.pick(["Chelo", "Beto", "Tito", "Papi", "Yeyo", "Chino", "Nene", "Gordo"]) : null, role: BI(...mod.ROLES.owner[B.sub]), since: B.founded, langs: ["es", "en"].slice(0, r.chance(0.5) ? 2 : 1), bio: sobre, bookings: true, spec: [] }];
  for (let i = 0; i < nStaff; i++) { const m = i === 2 || r.chance(0.2); team.push({ name: `${first(m)} ${r.pick(AP)}`, role: BI(...staffRoles[i]), since: r.int(B.founded + 1, 2024), langs: r.chance(0.4) ? ["es", "en"] : ["es"], bio: null, bookings: i < 2 }); }
  const about = aboutOficio(mod, B, sub, ciudad, h24, tienda.length > 0, renta.length > 0, r);
  const plan = {
    subs, galeria: gal, items, secciones: [...secciones, ...(tiendaItems ? [tiendaItems] : []), ...(rentaItems ? [rentaItems] : [])], settings,
    about, attrs, filtros: [...F], amenities: amenidades(mod, h24, tienda.length > 0, hogar, r), langs: r.chance(0.55) ? ["es", "en"] : ["es"], modulos, semana, team,
    deCasa: dom, radio: hogar ? r.pick([15, 20, 25, 30, 35]) : dom ? r.pick([10, 15, 20]) : null, operation: dom ? "casa" : "local", svcModel: "emp", stripe: true,
    faqs: faqsOficio(mod, B, items, h24, dep, ciudad, warrM, warrMi, r), h24, eta, tienda, renta, dep, certOwner: null, hogar,
  };
  plan.posts = novedadesOficio(mod, B, plan, r);
  return plan;
}

function oferta(mod, B, items, tienda, r) {
  if (mod.RUBRO === "hogar") {
    const o = { "NEG-HOGAR-01": ["Revisión de la casa antes del invierno $59", "Pre-winter home check $59"], "NEG-HOGAR-02": ["Revisión de llaves y mangueras $49 antes del frío", "Valve and hose check $49 before the cold"], "NEG-HOGAR-03": ["Cámara de la línea $149 si destapamos", "Camera line inspection $149 if we clear it"], "NEG-HOGAR-04": ["Revisión del calentador $59 antes del frío", "Water heater check $59 before the cold"], "NEG-HOGAR-05": ["Detectores de humo instalados $99", "Smoke detectors installed $99"] }[B.sub];
    return BI(...o);
  }
  const o = { "NEG-AUTO-01": ["Revisión de 20 puntos gratis con cada cambio de aceite", "Free 20-point check with every oil change"], "NEG-AUTO-02": ["Sin costo de traslado en tu zona", "No travel fee in your area"], "NEG-AUTO-03": ["Cambio de aceite sintético $49", "Synthetic oil change $49"], "NEG-AUTO-04": ["Luz de check engine: lectura gratis", "Check engine light: free reading"], "NEG-AUTO-05": ["Pastillas delanteras desde $129", "Front pads from $129"] }[B.sub];
  return BI(...o);
}
function amenidades(mod, h24, tienda, hogar, r) {
  const a = ["acepta-tarjeta", "presupuesto-gratis", "con-seguro", "plan-de-pagos"];
  if (hogar) { a.push("con-licencia"); if (h24) a.push("emergencia-24-7"); } else { a.push("sala-de-espera", "estacionamiento"); if (r.chance(0.4)) a.push("wi-fi"); if (r.chance(0.5)) a.push("garantia"); }
  if (tienda) a.push("productos-a-la-venta", "apartado");
  return [...new Set(a)];
}
function ownerBio(mod, B, r) {
  const n = B.owner.nombre, anio = B.founded;
  const v = [
    BI(`Empecé en ${anio} con una camioneta y una caja de herramientas. Hoy somos un equipo y seguimos tratando cada ${mod.RUBRO === "hogar" ? "casa" : "carro"} como si fuera el de mi mamá.`, `I started in ${anio} with a truck and a toolbox. Today we are a team and we still treat every ${mod.RUBRO === "hogar" ? "home" : "car"} like it was my mother’s.`),
    BI(`Llegué de Santo Domingo y abrí en ${anio}. Mi regla es simple: el precio por escrito antes de empezar y nada de sorpresas al final.`, `I came from Santo Domingo and opened in ${anio}. My rule is simple: the price in writing before we start and no surprises at the end.`),
    BI(`Aprendí el oficio con mi tío y abrí por mi cuenta en ${anio}. Aquí te explicamos el problema en español o en inglés, como prefieras.`, `I learned the trade from my uncle and went out on my own in ${anio}. Here we explain the problem in Spanish or English, whichever you prefer.`),
    BI(`Llevo desde ${anio} en el valle. Lo que más me enorgullece es que la gente nos llama otra vez y nos recomienda a sus vecinos.`, `I have been in the valley since ${anio}. What I am proudest of is that people call us again and recommend us to their neighbors.`),
  ];
  return r.pick(v);
}
function aboutOficio(mod, B, sub, ciudad, h24, tienda, renta, r) {
  const hogar = mod.RUBRO === "hogar", c = ciudad.nombre, y = B.founded;
  const tipo = { "NEG-HOGAR-01": ["Multiservicios y arreglos para la casa", "Handyman and home repairs"], "NEG-HOGAR-02": ["Plomería familiar", "Family plumbing"], "NEG-HOGAR-03": ["Destape de drenajes y líneas de alcantarilla", "Drain and sewer line cleaning"], "NEG-HOGAR-04": ["Instalación y reparación de calentadores de agua", "Water heater installation and repair"], "NEG-HOGAR-05": ["Electricistas con licencia", "Licensed electricians"],
    "NEG-AUTO-01": ["Taller mecánico de todo tipo de reparaciones", "Full-service repair shop"], "NEG-AUTO-02": ["Mecánico que va a tu casa", "A mechanic who comes to you"], "NEG-AUTO-03": ["Cambio de aceite rápido y honesto", "Fast, honest oil changes"], "NEG-AUTO-04": ["Diagnóstico con escáner y electrónica del carro", "Scanner diagnostics and car electronics"], "NEG-AUTO-05": ["Frenos y suspensión", "Brakes and suspension"] }[B.sub];
  const extra = [h24 ? ["Emergencias 24/7.", "24/7 emergencies."] : null, tienda ? ["Apartas piezas desde la app y las recoges en 48 horas.", "Reserve parts in the app and pick them up within 48 hours."] : null, renta ? ["También rentamos herramienta por día.", "We also rent tools by the day."] : null].filter(Boolean);
  const lic = hogar ? ["Contratista registrado en Pennsylvania (HIC), con seguro.", "Pennsylvania-registered contractor (HIC), insured."] : ["Mecánicos con experiencia y garantía por escrito.", "Experienced mechanics and a written warranty."];
  const es = `${tipo[0]} en ${c} desde ${y}. ${lic[0]} ${extra.map((e) => e[0]).join(" ")} Hablamos español e inglés.`.replace(/\s+/g, " ").trim();
  const en = `${tipo[1]} in ${c} since ${y}. ${lic[1]} ${extra.map((e) => e[1]).join(" ")} We speak Spanish and English.`.replace(/\s+/g, " ").trim();
  return BI(es, en);
}
function faqsOficio(mod, B, items, h24, dep, ciudad, warrM, warrMi, r) {
  const hogar = mod.RUBRO === "hogar", c = ciudad.nombre, F = [];
  if (hogar) {
    F.push(["¿Dan el precio antes de empezar?", "Do you give the price before starting?", "Sí. Te mandamos el precio por escrito en la app y solo empezamos cuando lo aceptas. Si aparece algo extra, te pedimos tu OK antes de hacerlo.", "Yes. We send the price in writing in the app and only start once you accept it. If something extra comes up, we ask for your OK first."]);
    F.push(["¿Tienen licencia y seguro?", "Are you licensed and insured?", "Estamos registrados como contratistas de mejoras del hogar (HIC) en Pennsylvania y tenemos seguro de responsabilidad. Pídenos el comprobante cuando quieras.", "We are registered as a home improvement contractor (HIC) in Pennsylvania and carry liability insurance. Ask us for proof any time."]);
    F.push([h24 ? "¿Atienden emergencias de noche y fines de semana?" : "¿Atienden emergencias?", h24 ? "Do you handle night and weekend emergencies?" : "Do you handle emergencies?", h24 ? `Sí, las 24 horas. Normalmente llegamos en unos ${r.pick([45, 60, 60, 90])} minutos dentro de la zona de ${c}.` : "Fuera del horario no, pero si nos escribes por la app te contestamos a primera hora y buscamos el primer espacio.", h24 ? `Yes, 24 hours. We usually arrive in about ${r.pick([45, 60, 60, 90])} minutes inside the ${c} area.` : "Not outside business hours, but if you message us in the app we reply first thing and find the first opening."]);
    F.push(["¿Qué zona cubren?", "What area do you cover?", `Vamos a casas en ${c} y los pueblos de alrededor, hasta unas ${r.pick([15, 20, 25])} millas. Si estás más lejos, escríbenos y vemos.`, `We go to homes in ${c} and the surrounding towns, up to about ${r.pick([15, 20, 25])} miles. If you are farther, message us and we will see.`]);
    F.push(["¿Cómo se paga?", "How do I pay?", "Con tarjeta en la app al terminar, o en efectivo o tarjeta en persona. Te damos el recibo en el momento.", "By card in the app when we finish, or cash or card in person. You get the receipt on the spot."]);
    F.push(["¿La visita se cobra?", "Is the visit charged?", dep ? `La visita lleva un depósito de ${money(dep)} que se descuenta del trabajo si lo hacemos con nosotros.` : "La visita de diagnóstico se descuenta del trabajo si lo hacemos con nosotros. Los presupuestos son gratis.", dep ? `The visit takes a ${money(dep)} deposit that is credited to the job if we do it.` : "The diagnostic visit is credited to the job if we do it. Estimates are free."]);
  } else {
    F.push(["¿Dan el estimado antes de reparar?", "Do you give an estimate before repairing?", "Sí. Te mandamos el estimado por la app, con fotos y cada línea por separado, y tú decides qué se hace. No tocamos nada sin tu OK.", "Yes. We send the estimate in the app, with photos and each line separate, and you decide what is done. We touch nothing without your OK."]);
    F.push(["¿Tienen garantía?", "Do you offer a warranty?", warrM ? `Sí: ${warrM} meses o ${warrMi.toLocaleString("en-US")} millas en piezas y mano de obra, por escrito.` : "Sí, por escrito. Pregúntanos por la garantía de cada trabajo.", warrM ? `Yes: ${warrM} months or ${warrMi.toLocaleString("en-US")} miles on parts and labor, in writing.` : "Yes, in writing. Ask about the warranty on each job."]);
    F.push(["¿Puedo esperar o debo dejarlo?", "Can I wait or do I need to leave it?", "Depende del trabajo: cada servicio dice si es mientras esperas, si lo dejas o si funciona de las dos maneras. Si lo dejas, te avisamos por mensaje cuando esté listo.", "It depends on the job: each service says whether you wait, leave it, or either way. If you leave it, we message you when it is ready."]);
    F.push(["¿Hacen la inspección de PA?", "Do you do the PA inspection?", items.some((x) => x.kind === "insp") ? "Sí, inspección de seguridad y emisiones. Si no pasa, te damos el estimado de lo que falta." : "Preguntamos por la estación más cercana y te ayudamos a prepararlo para pasar.", items.some((x) => x.kind === "insp") ? "Yes, safety and emissions inspection. If it fails, we give you an estimate of what is needed." : "We point you to the nearest station and help you get it ready to pass."]);
    F.push(["¿Hablan español?", "Do you speak Spanish?", "Sí, todo el equipo. También en inglés, si lo prefieres.", "Yes, the whole team. English too, if you prefer."]);
    F.push(["¿Cómo se paga?", "How do I pay?", "Con tarjeta en la app, o en efectivo o tarjeta en el taller. El total va por escrito antes de empezar.", "By card in the app, or cash or card at the shop. The total is in writing before we start."]);
  }
  return F;
}
function novedadesOficio(mod, B, plan, r) {
  const hogar = mod.RUBRO === "hogar", s = plan.items[1] ?? plan.items[0], c = CIUDADES[B.city].nombre;
  const L = hogar ? [
    { title: "Revisión antes del invierno", body: `Antes del frío revisamos tuberías, calentador y llaves exteriores en ${c}. Escríbenos por la app y te damos el primer espacio libre.` },
    { title: "Ya hacemos presupuestos por la app", body: "Mándanos fotos del trabajo y te respondemos con el precio por escrito. Sin visita para lo sencillo." },
    { title: "Abrimos los sábados", body: "Desde este mes atendemos los sábados hasta el mediodía. Reserva tu hora en la app." },
    { kind: "oferta", title: `${s.es} con descuento`, body: `Por tiempo limitado: ${s.es.toLowerCase()} a precio especial. Mismo equipo, mismo cuidado de siempre.`, was: Math.max(s.price + 2000, 6000), now: Math.max(s.price, 4000) },
    { title: "Gracias por las 5 estrellas", body: "Este año ya vamos por varios cientos de visitas. Gracias a cada vecino que nos recomienda." },
    { title: "Aviso de tormenta", body: h24Texto(plan), kind: "aviso" },
    { title: "Plan de mantenimiento", body: "Pregunta por nuestros planes: una visita fija, el mismo equipo y prioridad cuando algo falla." },
    { title: "Nuevo en el equipo", body: "Se une un técnico más para acortar la espera. Los tiempos de cita bajan esta semana." },
    { title: "Qué revisar antes de llamar", body: "Cierra la llave de paso, toma una foto y mándanosla por la app. Con eso muchas veces ya sabemos qué llevar." },
    { title: "Horario de feriados", body: "En los feriados atendemos solo emergencias. Las citas normales vuelven al día siguiente." },
  ] : [
    { title: "Revisión de frenos gratis en noviembre", body: `Pasa por el taller en ${c} y revisamos tus frenos sin costo. Si hace falta algo, te damos el estimado con fotos.` },
    { title: "Estimados por la app", body: "Ya mandamos el estimado con fotos de cada pieza. Tú apruebas línea por línea." },
    { title: "Listos para el invierno", body: "Batería, gomas y anticongelante antes de la primera helada. Reserva tu cita en la app." },
    { kind: "oferta", title: `${s.es} a precio especial`, body: `Esta semana: ${s.es.toLowerCase()} con descuento. Cupos limitados por día.`, was: Math.max(s.price + 1500, 5000), now: Math.max(s.price, 3500) },
    { title: "Inspección de PA", body: "Hacemos la inspección y las emisiones en el día. Si no pasa, te decimos qué falta antes de gastar." },
    { title: "Gracias por confiar en nosotros", body: "Un año más cuidando los carros del valle. Gracias por cada recomendación." },
    { title: "Nuevo escáner", body: "Llegó un escáner nuevo que lee más módulos. Diagnósticos más rápidos y precisos." },
    { title: "Horario de feriados", body: "En los feriados cerramos. Reserva antes y te apartamos el espacio." },
    { title: "Garantía por escrito", body: "Cada trabajo lleva garantía en piezas y mano de obra, por escrito. Pregúntanos por los detalles." },
    { title: "Cuándo cambiar el aceite", body: "Con aceite sintético, cada 7,500 millas; convencional, cada 3,000 a 5,000. Pregúntanos cuál lleva tu carro." },
  ];
  const lista = L.map((x) => ({ ...x, kind: x.kind ?? "novedad" }));
  return armarNovedades(B, lista, r, r.int(5, 9));
}
const h24Texto = (plan) => (plan.h24 ? "Si hay tormenta o corte de luz, seguimos atendiendo emergencias las 24 horas. Escríbenos por la app o llámanos." : "Con tormenta fuerte reprogramamos las citas del día. Te avisamos por mensaje.");

/* ── Historia ── */
const ESTADOS_PAST = [["done", 0.8], ["cancelled", 0.11], ["declined", 0.03], ["expired", 0.02], ["noshow", 0.04]];
export function historiaOficio(mod, B, plan, ctx) {
  const r = new Rng(B.seed + ":hist"), hogar = mod.RUBRO === "hogar";
  const N = Math.max(60, escala(hogar ? 120 : 150, B.size)), U = r.int(3, 7);
  const svc = plan.items.filter((x) => x.kind !== "plan");
  const pesos = svc.map((x, i) => [x, x.kind === "emer" ? 0.4 : i < 3 ? 3 : 1]);
  const clientes = elegirClientes(B, r, N + U + 20);
  const dias = Array.from({ length: N }, () => diaDeVida(r, B.founded)).sort((a, b) => a - b);
  const filas = [], eventos = [];
  const base = hogar ? 31 : 32;
  let n = 0;
  const num = () => `C-${base}${String(ctx.contador.c++).padStart(5, "0")}`;
  const mem = (st) => { const k = r.int(0, Math.min(plan.team.length - 1, 3)); return `${st === "x" ? "" : ""}${memberId(B, plan.team[k] ? k : 0)}`; };
  const horas = hogar ? [8, 9, 10, 12, 13, 14, 15, 16] : [8, 9, 10, 11, 13, 14, 15, 16];
  const pasadas = dias.map((d) => ({ d, up: false })), futuras = Array.from({ length: U }, () => ({ d: r.int(1, 12), up: true })).sort((a, b) => a.d - b.d);
  for (const { d, up } of [...pasadas, ...futuras]) {
    const c = clientes[n % clientes.length]; n++;
    const it = r.weighted(pesos), mm = r.pick(horas) * 60 + r.pick([0, 0, 30]);
    const st = up ? r.weighted([["confirmed", 0.7], ["pending", 0.3]]) : r.weighted(ESTADOS_PAST);
    const calc = precio(it, r, hogar);
    const veh = hogar ? null : `${r.int(2008, 2024)} ${r.pick(mod.CARROS)}`;
    const lead = it.kind === "emer" ? 0 : r.int(1, 5), sentD = up ? -r.int(1, 4) : d - lead, sentM = r.int(7, 21) * 60 + r.pick([0, 12, 24, 40]);
    const ansD = up ? (st === "pending" ? null : sentD) : sentD, ansM = sentM + r.int(5, 90);
    const pagaApp = calc.total > 0 && r.chance(hogar ? 0.5 : 0.4) && !(st === "declined" || st === "expired");
    const o = { num: num(), kind: "appointment", city: B.city, biz: B.id, ph: c.tel, mem: memberId(B, r.int(0, Math.min(2, plan.team.length - 1))), st: st === "noshow" ? "done" : st, sd: st === "noshow" ? "noshow" : null, d, m: mm, dur: it.dur ?? 60,
      det: { demo: "c", cat: mod.CAT, rubro: mod.RUBRO, svc: { es: it.es, en: it.en }, svcId: it.key, base: calc.sub, ...(veh ? { veh: { t: veh } } : {}), ...(calc.emer ? { emergencia: true } : {}) },
      sub: calc.sub, dep: 0, tot: calc.total, pm: pagaApp && st === "done" ? "app" : "local", ps: pagaApp && st === "done" ? "captured" : null,
      sentD, sentM, ansD, ansM, ck: null, party: null };
    if (st === "pending") { o.ansD = null; o.ansM = null; o.pm = "local"; o.ps = null; }
    if (st === "confirmed") { o.pm = "local"; o.ps = null; }
    if (st === "done" || st === "noshow") { o.doneD = d; o.doneM = mm + (it.dur ?? 60) + r.int(0, 45); }
    if (st === "noshow") { o.tot = 0; o.sub = 0; o.pm = "none"; o.ps = null; o.doneM = mm + 30; }
    if (st === "cancelled") { o.cancD = Math.min(d, Math.max(sentD, d - r.int(0, 2))); o.cancM = r.int(7, 20) * 60; o.cby = r.weighted([["user", 0.7], ["business", 0.25], ["admin", 0.05]]); o.creason = o.cby === "user" ? r.pick(["Cambié de planes", "Ya lo resolví por mi cuenta", "No voy a estar en casa", "Encontré otra fecha"]) : r.pick(["Se nos cruzó otra emergencia", "Reprogramamos por clima", "No tenemos la pieza"]); o.pm = "local"; o.ps = null; }
    if (st === "declined") { o.pm = "local"; o.ps = null; o.ansD = sentD; o.ansM = ansM; }
    if (st === "expired") { o.ansD = null; o.ansM = null; o.pm = "local"; o.ps = null; }
    if (!up && d > -1) { o.d = -1; }
    filas.push({ ...o, _it: it, _veh: veh, _c: c, _up: up });
    // eventos
    const E = eventos;
    E.push({ num: o.num, kind: "sent", actor: "user", d: sentD, m: sentM });
    if (o.ansD != null && st !== "declined") E.push({ num: o.num, kind: "accepted", actor: "business", d: o.ansD, m: o.ansM });
    if (st === "declined") E.push({ num: o.num, kind: "declined", actor: "business", d: o.ansD, m: o.ansM });
    if (st === "expired") E.push({ num: o.num, kind: "expired", actor: "system", d: Math.min(-1, sentD + 1), m: sentM });
    if (st === "cancelled") E.push({ num: o.num, kind: "cancelled", actor: o.cby === "user" ? "user" : o.cby === "admin" ? "admin" : "business", d: o.cancD, m: o.cancM });
    if (st === "done") {
      const late = hogar ? (r.chance(0.07) ? r.int(15, 70) : 0) : 0;
      if (hogar) { o._late = late; E.push({ num: o.num, kind: "arrived", actor: "business", d: o.d, m: mm + (late ? 120 + late : r.int(-5, 100)) }); }
      E.push({ num: o.num, kind: "done", actor: "member", d: o.doneD, m: o.doneM });
    }
    if (st === "noshow") E.push({ num: o.num, kind: "noshow", actor: "member", d: o.d, m: mm + 30 });
  }
  return { filas, eventos, clientes };
}

function precio(it, r, hogar) {
  const k = it.kind, a = it.attrs;
  let sub = it.price, emer = false;
  if (k === "hora") sub = it.price * r.int(a.mh ?? 1, (a.mh ?? 1) + 2);
  else if (k === "area") sub = Math.max(a.min ?? 0, it.price * r.int(8, 60));
  else if (k === "pres") { const [lo, hi] = a.rng ?? [20000, 80000]; sub = redondea(lo + r.next() * (hi - lo), 500); }
  else if (k === "cotiza") { const [lo, hi] = a.rng; sub = redondea(lo + r.next() * (hi - lo), 500); }
  else if (k === "emer") { sub = it.price + (r.chance(0.5) ? (a.sur ?? 0) : 0) + (r.chance(0.5) ? r.int(2, 12) * 1000 : 0); emer = true; }
  else if (k === "diag" && it.price === 0) sub = r.chance(0.4) ? a.alt ?? 0 : 0;
  else if (k === "lav" && a.sz) sub = a.sz[r.int(0, 2)];
  else if (k === "desde") sub = it.price + (r.chance(0.5) ? redondea(it.price * (0.1 + r.next() * 0.8), 500) : 0);
  else if (k === "fijo" && r.chance(0.3) && a.x?.length) sub = it.price + a.x[0].p;
  else if (k === "visita" && a.free) sub = 0;
  return { sub, total: sub, emer };
}
export const memberId = (B, i) => `democ:m:${B.id}:${i}`;
