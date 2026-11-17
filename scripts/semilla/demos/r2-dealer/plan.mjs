/* Ronda 2 · Venta de Autos: el plan de cada negocio (ficha, equipo, preguntas, inventario con VIN válido y total en la puerta, servicios) y su historia.
   Reutiliza de la ronda 1 las fórmulas (enLaPuerta, pagoEjemplo) y la historia de pruebas de manejo (historiaDealer). Todo determinista. */
import { Rng, q, J, TA, BI, redondea, px, crearVin, diaDeVida, money, CIUDADES, fotosDeSubs } from "../c/base.mjs";
import { elegirClientes } from "../c/nucleo.mjs";
import { enLaPuerta, pagoEjemplo, historiaDealer } from "../c/dealer.mjs";
import { memberId } from "../c/oficios.mjs";
import { SUBS, CAT, TAG } from "./subs.mjs";
import { FAMILIAS } from "./modelos.mjs";
import { SERV } from "./servicios.mjs";
import { VOCAB, NOTAS, NOTA_PROYECTO, NOTA_SALV, NOTA_RECO, NOTA_CERT, novedadesVenta, novedadesServ } from "./textos.mjs";

const CAP = 47700, TAX_BP = 600, HOY = 2026;
export const VINS = new Set();            // todos los VIN de este agente: ninguno se repite
const CARRETERA = new Set(["carro", "suv", "van", "pickup", "trabajo", "caja", "trailer", "moto", "scooter", "rv"]);
const CON_HISTORIAL = new Set(["carro", "suv", "van", "pickup", "trabajo"]);
const pideMillas = (b) => ["carro", "suv", "van", "pickup", "trabajo", "caja", "moto", "scooter"].includes(b);
export const esServicio = (sub) => ["fin", "placas", "cash", "taller", "envio", "mayor"].includes(sub.kind);

/* Cuántos en el lote y cuántos vendidos (para la historia): lo caro y lo grande, menos. */
const LOTE = { cert: [9, 15], lux: [7, 12], pickup: [10, 17], suv: [10, 17], van: [9, 15], trabajo: [8, 14], flota: [8, 14], caja: [6, 11], semi: [5, 9], remolque: [10, 16], moto: [10, 16], atv: [9, 15], scooter: [9, 14], bote: [7, 12], rv: [6, 11], golf: [8, 14], clasico: [7, 12], salv: [9, 15], broker: [9, 15], consig: [9, 15], dueno: [9, 15], casa: [10, 16] };
/* kilómetros... millas por año */
const MILLAS = { trabajo: [12000, 22000], flota: [12000, 22000], caja: [15000, 30000], moto: [1500, 4500], scooter: [800, 3500], lux: [6000, 11000], cert: [9000, 13000] };
const GARANTIA_OK = new Set(["carro", "suv", "van", "pickup", "trabajo", "moto", "scooter"]);

function mkVehiculo(r, B, F, fam, vendido, i, cfg, usados) {
  const bodyFam = F.body;
  let m, year, miles = null, hours = null, price, title = "limpio", street = true, vin = null, nombre, nota, trim = null, foto, cdl = false, proyecto = false;
  const ymin = fam === "cert" ? 2018 : fam === "lux" ? 2016 : fam === "salv" ? 2012 : fam === "casa" ? 2013 : 2012;
  const ymax = fam === "cert" ? 2023 : fam === "salv" ? 2021 : ["bote", "golf", "atv", "rv", "remolque", "moto", "scooter"].includes(fam) ? 2024 : 2023;
  for (let t = 0; t < 8; t++) {
    vin = null; miles = null; hours = null;
    if (F.clasicos) {
      m = r.pick(F.clasicos); year = m.year; proyecto = !!m.proyecto;
      price = redondea(Math.round(m.lo + r.next() * (m.hi - m.lo)) * 100, 50000);
      if (year >= 1981) vin = crearVin(m.wmi, m.vds, year, "K", 110000 + r.int(0, 9999));
      trim = null; foto = m.foto;
      miles = r.int(18, 140) * 1000;
      nombre = `${year} ${m.make} ${m.model}`.slice(0, 60);
    } else {
      m = r.pick(F.modelos);
      const lo = Math.max(m.y[0], ymin), hi = Math.min(m.y[1], ymax);
      year = lo > hi ? hi : r.int(lo, hi);
      const age = Math.max(0, HOY - year), mi = m.mi ?? MILLAS[fam] ?? [8000, 12500];
      if (pideMillas(m.body)) miles = Math.round(Math.max(age, 0.6) * r.int(mi[0], mi[1])); else if (m.horas) hours = Math.round(Math.max(age, 1) * r.int(25, 110));
      let p = m.base * Math.pow(m.dep ?? 0.9, age) * (0.9 + r.next() * 0.2) * (miles ? 1 - Math.min(0.25, miles / 700000) : 1);
      if (year >= 2025) p = m.base * (1.02 + r.next() * 0.08);
      price = redondea(Math.max(m.floor ?? 4500, p) * 100, 10000);
      trim = r.pick(m.trims); foto = m.foto; cdl = !!m.cdl;
      if (m.wmi && !F.sinVin) vin = crearVin(m.wmi, m.vds, year, "K", 110000 + r.int(0, 9999));
      nombre = `${year} ${m.make} ${m.model} ${trim}`.slice(0, 60);
    }
    if (!usados.has(nombre) || t === 7) break;
  }
  if (usados.has(nombre)) nombre = `${nombre.slice(0, 54)} #${usados.size}`;
  usados.add(nombre);
  while (vin && VINS.has(vin)) vin = crearVin(m.wmi, m.vds, year, "K", 110000 + r.int(0, 9999));
  if (vin) VINS.add(vin);
  const body = m.body ?? bodyFam;
  if (m.street === false) street = false;
  // Título
  if (fam === "salv") { if (r.chance(0.42)) { title = "salvage"; street = false; price = redondea(Math.max(150000, price * 0.42), 10000); } else { title = "reconstruido"; price = redondea(price * 0.66, 10000); } }
  else if (CON_HISTORIAL.has(body) && !F.clasicos && fam !== "cert" && r.chance(0.07)) { title = "reconstruido"; price = redondea(price * 0.72, 10000); }
  if (title === "salvage") street = false;
  const history = title === "salvage" ? false : CON_HISTORIAL.has(body) && !proyecto && year >= 1981 ? (fam === "cert" ? true : r.chance(0.8)) : false;
  const src = history ? r.pick(["Carfax", "Carfax", "AutoCheck"]) : null;
  let warranty = "como_esta", wm = null, wmi = null;
  if (fam === "cert" && title === "limpio") { warranty = "certificado"; wm = 84; wmi = 100000; }
  else if (year >= 2024 && ["golf", "remolque", "atv", "rv", "bote", "moto", "scooter"].includes(fam) && title === "limpio") { warranty = "fabrica"; wm = 12; wmi = 12000; }
  else if (cfg.garDef > 0 && title === "limpio" && GARANTIA_OK.has(body) && !proyecto) { warranty = "dealer"; wm = cfg.garDef; wmi = cfg.garDef * 1000; }
  const pt = enLaPuerta(price, TAX_BP, cfg.tags, cfg.fee);
  const est = cfg.fin ? pagoEjemplo(pt.otd, cfg.itinDown, cfg.apr, cfg.term) : null;
  let nt = fam === "clasico" && proyecto ? NOTA_PROYECTO : title === "salvage" ? NOTA_SALV : title === "reconstruido" ? NOTA_RECO : warranty === "certificado" ? NOTA_CERT : r.pick(NOTAS[body] ?? NOTAS.carro);
  nota = nt;
  const d = vendido ? -r.int(5, Math.max(20, (2026 - B.founded) * 330)) : 0;
  return { m, year, trim, miles, hours, price, title, street, vin, history, src, warranty, wm, wmi, pt, est, bh: null, nota, nombre, vendido, body, cdl, foto, d, pa: r.chance(0.5),
    fuel: m.fuel ?? null, drive: m.drive ?? null, trans: m.trans ?? null, make: m.make, model: m.model };
}

function itemVehiculo(B, v, i) {
  const col = ["item_id", "business_id", "city_id", "vin", "year", "make", "model", "trim_level", "body", "miles", "engine_hours", "transmission", "fuel", "drivetrain", "title", "history_report", "history_src", "pa_inspection", "warranty", "warranty_months", "warranty_miles", "street_legal", "cdl", "price_cents", "tax_bp", "tax_cents", "tags_cents", "doc_fee_cents", "otd_cents", "est_down_cents", "est_apr_bp", "est_months", "est_payment_cents", "est_total_cents", "bhph_down_cents", "bhph_week_cents", "bhph_weeks", "bhph_total_cents", "bhph_apr_bp", "status", "status_at"];
  const e = v.est, p = v.pt;
  const vals = ["it", "b", "x.city_id", q(v.vin), v.year, q(v.make), q(v.model), q(v.trim), q(v.body), v.miles ?? "null", v.hours ?? "null", q(v.trans), q(v.fuel), q(v.drive), q(v.title), v.history, q(v.src), v.pa, q(v.warranty), v.wm ?? "null", v.wmi ?? "null", v.street, v.cdl, v.price, p.taxBp, p.tax, p.tags, p.fee, p.otd,
    e?.down ?? "null", e?.aprBp ?? "null", e?.months ?? "null", e?.pago ?? "null", e?.total ?? "null", "null", "null", "null", "null", "null", q(v.vendido ? "sold" : "lot"), v.vendido ? `pg_temp.c_ts(${v.d}, 840)` : "now()"];
  return {
    m: "svc", es: v.nombre, en: v.nombre, des: v.nota[0], den: v.nota[1], price: v.price, dur: 30, kind: "auto", attrs: {}, fotos: [px(v.foto)], sort: i, ret: true,
    after: `insert into vehicle_listings (${col.join(", ")}) select ${vals.join(", ")} from businesses x where x.id = b;`,
  };
}

const R = (a, b) => [[`${String(a).padStart(2, "0")}:00`, `${String(b).padStart(2, "0")}:00`]];
function horario(r, kind) {
  if (["fin", "placas", "cash", "envio"].includes(kind)) { const lv = r.pick([R(9, 17), R(9, 18), R(10, 18)]); return [null, lv, lv, lv, lv, lv, r.chance(0.6) ? r.pick([R(9, 13), R(10, 14)]) : null]; }
  if (kind === "taller") { const lv = r.pick([R(8, 17), R(8, 18)]); return [null, lv, lv, lv, lv, lv, r.pick([R(8, 14), R(9, 14)])]; }
  if (kind === "mayor") { const lv = r.pick([R(8, 17), R(9, 17)]); return [null, lv, lv, lv, lv, lv, kind === "mayor" && r.chance(0.5) ? R(9, 12) : null]; }
  const lv = r.pick([R(9, 18), R(9, 19), R(10, 19)]), sab = r.pick([R(9, 16), R(10, 16), R(9, 15)]);
  return [r.chance(0.2) ? R(11, 15) : null, lv, lv, lv, lv, lv, sab];
}

function equipo(B, r, sub, V) {
  const H = ["Edwin", "Jorge", "Víctor", "Ángel", "Nelson", "Samuel", "Gabriel", "Darío", "Efraín", "Ismael"], M = ["Yanira", "Sonia", "Lourdes", "Idalia", "Carolina", "Evelyn", "Wendy", "Ivelisse"];
  const AP = ["Rodríguez", "Martínez", "Díaz", "Pérez", "Santana", "Jiménez", "Almonte", "Peña", "Reyes", "Núñez", "Vargas", "Féliz", "Batista", "Méndez", "Ortiz", "Rosario"];
  const bio = r.pick([BI(`Empecé en ${B.founded} con un solo cliente a la vez. Hoy sigo explicando todo por escrito antes de que firmes, línea por línea.`, `I started in ${B.founded} with one customer at a time. Today I still explain everything in writing before you sign, line by line.`), BI("Aquí no hay sorpresas: el precio, los impuestos y los cargos, todo por escrito.", "No surprises here: the price, taxes and fees, all in writing."), BI("Llegué a Pennsylvania en 2003. Por eso sé lo que se siente hacer esto por primera vez y ayudo a otros a hacerlo bien.", "I came to Pennsylvania in 2003. That is why I know how it feels to do this for the first time and help others do it right.")]);
  const roles = { fin: ["Asesor de financiamiento", "Financing advisor", "Papeles y firmas", "Paperwork and signing"], placas: ["Tramitador", "Paperwork agent", "Atención al cliente", "Customer service"], cash: ["Tasador", "Appraiser", "Papeles y pagos", "Paperwork and payments"], taller: ["Mecánico jefe", "Lead mechanic", "Asesor de servicio", "Service advisor"], envio: ["Coordinador de envíos", "Shipping coordinator", "Documentos y aduana", "Documents and customs"], mayor: ["Gerente de inventario", "Inventory manager", "Papeles y cuentas", "Paperwork and accounts"] }[sub.kind] ?? ["Asesor de ventas", "Sales advisor", "Financiamiento y papeles", "Financing and paperwork"];
  const t = [{ name: `${B.owner.nombre} ${B.owner.ap}`, role: BI(esServicio(sub) ? "Dueño y gerente" : "Dueño y gerente de ventas", esServicio(sub) ? "Owner and manager" : "Owner and sales manager"), since: B.founded, langs: ["es", "en"], bio, bookings: true }];
  t.push({ name: `${r.pick(H)} ${r.pick(AP)}`, role: BI(roles[0], roles[1]), since: r.int(B.founded + 1, 2023), langs: ["es", "en"], bio: null, bookings: true });
  t.push({ name: `${r.pick(M)} ${r.pick(AP)}`, role: BI(roles[2], roles[3]), since: r.int(B.founded + 1, 2023), langs: ["es"], bio: null, bookings: false });
  if (r.chance(0.4)) t.push({ name: `${r.pick(H)} ${r.pick(AP)}`, role: BI(sub.kind === "taller" ? "Mecánico" : esServicio(sub) ? "Asistente" : "Preparación de vehículos", sub.kind === "taller" ? "Mechanic" : esServicio(sub) ? "Assistant" : "Vehicle prep"), since: r.int(B.founded + 1, 2024), langs: ["es"], bio: null, bookings: false });
  return t;
}

/* ── Preguntas frecuentes ── */
function faqsVenta(B, sub, V, d, ciudad, r) {
  const F = [], a = (x) => (V.g === "f" ? "la" : "el") + " " + x;
  F.push(["¿El precio incluye impuestos y placas?", "Does the price include taxes and tags?", `No: el precio es antes de impuestos. En cada ficha verás el total en la puerta: precio + impuesto de PA (6 %) + placas y título (${money(d.tags)}) + cargo del dealer (${money(d.fee)}).`, `No: the price is before taxes. On each listing you will see the out-the-door total: price + PA tax (6%) + tags and title (${money(d.tags)}) + dealer fee (${money(d.fee)}).`]);
  F.push(["¿Cuál es el cargo del dealer?", "What is the dealer fee?", `${money(d.fee)}, por debajo del tope que fija Pennsylvania. Siempre está en el total en la puerta, antes de firmar.`, `${money(d.fee)}, below the cap set by Pennsylvania. It is always in the out-the-door total, before you sign.`]);
  F.push(["¿Financian con ITIN o sin crédito?", "Do you finance with an ITIN or no credit?", d.itin ? `Sí, con ITIN y un enganche desde ${money(d.itinDown)}. La tasa, los meses y el total van por escrito; nadie garantiza la aprobación antes de revisar tus papeles.` : "Trabajamos con bancos y cooperativas; te decimos la tasa y los meses por escrito. Nadie garantiza la aprobación.", d.itin ? `Yes, with an ITIN and a down payment from ${money(d.itinDown)}. Rate, term and total are in writing; no one guarantees approval before reviewing your papers.` : "We work with banks and credit unions; we tell you the rate and term in writing. No one guarantees approval."]);
  F.push([`¿Puedo llevar ${a(V.s)} a mi mecánico antes de comprar?`, `Can I take the ${V.en} to my mechanic before buying?`, "Sí, siempre. Nos dices cuándo y lo preparamos. Si algo sale en la revisión, lo hablamos antes de firmar.", "Yes, always. Tell us when and we get it ready. If anything comes up in the check, we talk about it before you sign."]);
  F.push(["¿Aceptan lo mío como parte de pago?", "Do you take my trade-in?", d.trade ? "Sí. Te damos la oferta por escrito, gratis, y puedes comparar sin compromiso." : "Por ahora no recibimos cambios; si quieres vender lo tuyo, te decimos a quién preguntar.", d.trade ? "Yes. We give you the offer in writing, free, and you can compare with no commitment." : "We do not take trade-ins right now; if you want to sell yours, we will point you to who to ask."]);
  F.push(["¿Cómo pido una prueba?", "How do I book a test?", `En la ficha eliges una hora libre y nos llega al instante.${d.casa ? " También la hacemos en tu casa." : ""} Antes de la prueba no se cobra nada.`, `On the listing you pick a free time and it reaches us instantly.${d.casa ? " We also do it at your home." : ""} Nothing is charged before the test.`]);
  F.push(["¿Qué pasa con el título?", "What about the title?", "Cada ficha dice si el título es limpio, reconstruido o salvage. Un salvage no se maneja en la calle hasta pasar la inspección de PA.", "Each listing says whether the title is clean, rebuilt or salvage. A salvage vehicle cannot be driven on the street until it passes PA inspection."]);
  const fam = sub.fam;
  if (["trabajo", "flota", "caja", "semi", "remolque"].includes(fam)) F.push(["¿Necesito CDL?", "Do I need a CDL?", "Los de 26,001 libras o más necesitan CDL; la ficha lo dice. Si tienes dudas, te decimos qué licencia pide el que te interesa.", "Those of 26,001 lbs or more need a CDL; the listing says so. If in doubt, we tell you which license the one you like requires."]);
  if (["moto", "scooter"].includes(fam)) F.push(["¿Qué licencia necesito?", "What license do I need?", "Para manejarla en la calle necesitas licencia clase M o permiso de aprendiz. Antes de comprar te explicamos qué papel pedir.", "To ride on the street you need a class M license or learner’s permit. Before you buy we explain what to ask for."]);
  if (["atv", "golf", "bote"].includes(fam)) F.push(["¿Va por la calle?", "Is it street legal?", "No. La ficha lo dice y te explicamos antes de comprar qué papeles o registro necesita según dónde lo vayas a usar.", "No. The listing says so and before you buy we explain which papers or registration it needs depending on where you will use it."]);
  if (fam === "rv") F.push(["¿Puedo ver por dentro y probar los equipos?", "Can I see inside and test the equipment?", "Sí. Probamos contigo el aire, la estufa, el agua y la batería antes de que firmes.", "Yes. We test the A/C, stove, water and battery with you before you sign."]);
  if (fam === "clasico") F.push(["¿Puedo ver fotos de abajo y de adentro?", "Can I see underside and interior photos?", "Sí, a pedido, y puedes venir con tu mecánico. Los proyectos dicen claramente qué falta.", "Yes, on request, and you can bring your mechanic. Projects say clearly what is missing."]);
  if (fam === "salv" || fam === "cert") F.push([fam === "salv" ? "¿Puedo asegurarlo y registrarlo?" : "¿Qué significa «certificado»?", fam === "salv" ? "Can I insure and register it?" : "What does “certified” mean?", fam === "salv" ? "Un reconstruido que pasó la inspección de PA se puede registrar. Un salvage, no, hasta repararlo e inspeccionarlo. Cada ficha lo dice." : "Pasó la inspección del programa y trae garantía por escrito. La ficha dice meses y millas.", fam === "salv" ? "A rebuilt vehicle that passed PA inspection can be registered. A salvage one cannot until repaired and inspected. Each listing says so." : "It passed the program inspection and comes with a written warranty. The listing says months and miles."]);
  if (["broker", "consig", "dueno"].includes(fam)) F.push(["¿Cuánto cobran?", "What do you charge?", "La tarifa es fija y va por escrito antes de empezar; nunca pagues antes de ver el carro y el título.", "The fee is flat and in writing before we start; never pay before seeing the car and the title."]);
  return F;
}
function faqsServ(B, sub, S, ciudad) {
  const c = ciudad.nombre, F = [];
  F.push(["¿Cómo pido una cita?", "How do I book an appointment?", "En la app eliges el servicio y una hora libre. Te confirmamos al instante o te decimos si hay que mover la hora.", "In the app you pick the service and a free time. We confirm instantly or tell you if the time needs to move."]);
  F.push(["¿Cuánto cuesta?", "How much does it cost?", "El precio va en cada servicio, por escrito. Si algo cambia, te lo decimos antes de empezar y tú decides.", "The price is on each service, in writing. If anything changes, we tell you before starting and you decide."]);
  if (S.tema === "ITIN" || S.tema === "primer" || S.tema === "dealer") F.push(["¿Me garantizan la aprobación?", "Do you guarantee approval?", "No. Nadie puede garantizarla antes de revisar tus papeles. Te decimos con claridad qué opciones hay y la tasa, los meses y el total por escrito.", "No. No one can guarantee it before reviewing your papers. We tell you clearly what options exist and the rate, term and total in writing."]);
  if (S.tema === "ITIN") F.push(["¿Guardan mi número de ITIN?", "Do you store my ITIN number?", "No. En la app no se guarda número de ITIN, seguro social, ingresos ni cuentas de banco.", "No. The app does not store ITIN numbers, social security numbers, income or bank accounts."]);
  if (S.tema === "garantía" || S.tema === "GAP") F.push(["¿Es obligatoria?", "Is it required?", "No. Nadie te puede exigir una garantía extendida ni un GAP para darte el préstamo.", "No. No one can make you buy an extended warranty or GAP to get the loan."]);
  if (S.tema === "placas") F.push(["¿Qué tarifa cobra el estado?", "What does the state charge?", "La tarifa de PennDOT va aparte de lo nuestro. Te decimos las dos cosas antes de empezar.", "The PennDOT fee is separate from ours. We tell you both before starting."]);
  if (S.tema === "efectivo" || S.tema === "avalúo") F.push(["¿Me cobran por la grúa o la oferta?", "Do you charge for the tow or the offer?", "No. La oferta es gratis, por escrito y después de ver el carro; nadie te cobra por la grúa.", "No. The offer is free, in writing and after seeing the car; no one charges you for the tow."]);
  if (S.tema === "taller") F.push(["¿Pueden revisar un carro antes de que lo compre?", "Can you inspect a car before I buy it?", "Sí. Es la revisión previa a la compra, con informe por escrito.", "Yes. It is the pre-purchase inspection, with a written report."]);
  if (S.tema === "envío") F.push(["¿Qué papeles piden?", "Which papers do you need?", "El título, una identificación y la factura de compra. Si hay préstamo, la carta del prestamista. Te decimos el resto según el destino.", "The title, an ID and the bill of sale. If there is a loan, the lender’s letter. We tell you the rest depending on the destination."]);
  if (S.tema === "subasta" || S.tema === "mayoreo") F.push(["¿Necesito licencia de dealer?", "Do I need a dealer license?", S.tema === "mayoreo" ? "Sí, para comprar al mayoreo pedimos tu licencia de dealer de PA." : "Para pujar en la subasta de dealers, sí; para la pública, solo registrarte como comprador. Te decimos cuál aplica.", S.tema === "mayoreo" ? "Yes, to buy wholesale we ask for your PA dealer license." : "For the dealer auction, yes; for the public one you just register as a buyer. We tell you which applies."]);
  F.push(["¿Hablan español?", "Do you speak Spanish?", `Sí. Atendemos en español e inglés en ${c}.`, `Yes. We serve in Spanish and English in ${c}.`]);
  return F;
}

function aboutVenta(B, sub, V, ciudad, d, gar) {
  const c = ciudad.nombre, y = B.founded;
  const tit = { cert: ["Autos usados certificados", "Certified pre-owned cars"], lux: ["Autos de lujo", "Luxury cars"], pickup: ["Camionetas y pickups", "Trucks and pickups"], suv: ["SUVs", "SUVs"], van: ["Vans y minivans", "Vans and minivans"], trabajo: ["Vehículos de trabajo", "Work vehicles"], flota: ["Venta a flotas y empresas", "Fleet and business sales"], caja: ["Camiones de caja", "Box trucks"], semi: ["Tráileres y camiones pesados", "Semi trucks and heavy trucks"], remolque: ["Remolques", "Trailers"], moto: ["Motocicletas", "Motorcycles"], atv: ["Cuatrimotos y UTV", "ATVs and UTVs"], scooter: ["Scooters y ciclomotores", "Scooters and mopeds"], bote: ["Botes y motos acuáticas", "Boats and jet skis"], rv: ["Casas rodantes y campers", "RVs and campers"], golf: ["Carritos de golf", "Golf carts"], clasico: ["Clásicos y proyectos", "Classic and project cars"], salv: ["Carros con título reconstruido o salvage", "Cars with rebuilt or salvage title"], broker: ["Búsqueda de autos por encargo", "Car finding service"], consig: ["Venta de autos en consignación", "Consignment car sales"], dueno: ["Venta por dueño con apoyo del lote", "Private seller listings with lot support"], casa: ["Autos con prueba y entrega a domicilio", "Cars with home test drive and delivery"] }[sub.fam];
  const e = [d.itin ? ["Financiamos con ITIN.", "We finance with an ITIN."] : null, ["El total en la puerta, con impuestos y placas, va en cada ficha.", "The out-the-door total, with taxes and tags, is on every listing."], gar ? [`Garantía de ${gar} meses en motor y transmisión.`, `${gar}-month powertrain warranty.`] : null, d.trade ? ["Recibimos lo tuyo como parte de pago.", "We take your vehicle in trade."] : null, d.casa ? ["Prueba y entrega en tu casa.", "Home test drive and delivery."] : null].filter(Boolean);
  return BI(`${tit[0]} en ${c} desde ${y}. ${e.map((x) => x[0]).join(" ")} Hablamos español e inglés.`, `${tit[1]} in ${c} since ${y}. ${e.map((x) => x[1]).join(" ")} We speak Spanish and English.`);
}

/* ── Plan de un negocio que vende vehículos ── */
function planVenta(B, sub, r) {
  const F = FAMILIAS[sub.fam], V = VOCAB[sub.fam], ciudad = CIUDADES[B.city], fam = sub.fam, kind = sub.kind, nuevo = kind === "new";
  const subs = [B.sub, ...r.some(sub.otras, r.int(1, 2))];
  const fotos = fotosDeSubs(subs, CAT), gal = r.shuffle(fotos).slice(0, Math.min(fotos.length, r.int(6, 8)));
  const tags = r.pick([13500, 15000, 15000, 16500]), fee = Math.min(nuevo ? r.pick([34900, 39900, 44900, 47700]) : r.pick([29900, 34900, 39900, 44900, 47700]), CAP);
  const fin = nuevo || r.chance(0.65), itin = fin && r.chance(nuevo ? 0.3 : 0.55), noCredit = !nuevo && r.chance(0.1);
  const itinDown = r.pick([100000, 150000, 150000, 200000]), apr = fin ? r.pick(nuevo ? [549, 699, 799, 899] : [899, 1149, 1299, 1490, 1690]) : null, term = fin ? r.pick(nuevo ? [48, 60, 72] : [36, 48, 60]) : null;
  const trade = r.chance(0.8), casa = fam === "casa" ? true : ["cert", "lux", "pickup", "suv", "van", "broker", "consig", "dueno"].includes(fam) && r.chance(0.3), garDef = nuevo || fam === "salv" ? 0 : GARANTIA_OK.has(F.body) && fam !== "clasico" ? r.pick([0, 3, 3, 6]) : 0;
  const cfg = { tags, fee, fin, itin, itinDown, apr, term, garDef };
  const [l0, l1] = LOTE[fam] ?? [9, 15], nLote = r.int(l0, l1), nVend = r.int(8, 20);
  const usados = new Set(), veh = [];
  for (let i = 0; i < nLote; i++) veh.push(mkVehiculo(r, B, F, fam, false, i, cfg, usados));
  for (let i = 0; i < nVend; i++) veh.push(mkVehiculo(r, B, F, fam, true, i + 50, cfg, usados));
  const sueltos = veh.map((v, i) => itemVehiculo(B, v, i));
  // Servicios: los de financiamiento de siempre (opcionales) y, si es broker/consignación/dueño, su tarifa fija
  const fotoSrv = px(fotos[0] ?? "7144195"), servicios = [];
  const add = (s, sort, foto = fotoSrv) => servicios.push({ m: "svc", es: s.es, en: s.en, des: s.des, den: s.den, price: Math.round(s.usd * 100), from: s.desde, dur: s.dur, attrs: {}, fotos: [foto], sort });
  const ex = SERV[fam];
  if (ex) ex.items.forEach((s, i) => add(s, i));
  else {
    if (trade) add({ es: "Tasación de lo tuyo (trade-in)", en: "Trade-in appraisal", des: "Gratis y por escrito. Te decimos cuánto vale antes de que decidas.", den: "Free and in writing. We tell you what it is worth before you decide.", usd: 0, dur: 30 }, 90);
    if (r.chance(0.5)) add({ es: "Garantía extendida · 3 años", en: "Extended warranty · 3 years", des: "Motor, transmisión y aire. No es obligatoria para el préstamo.", den: "Engine, transmission and A/C. Not required for the loan.", usd: Math.round(1295 * (0.9 + r.next() * 0.25) / 5) * 5, dur: 30 }, 91);
    if (r.chance(0.4)) add({ es: "GAP", en: "GAP", des: "Paga lo que debes si el seguro da menos. No es obligatorio.", den: "Pays what you owe if insurance pays less. Not required.", usd: Math.round(495 * (0.9 + r.next() * 0.25) / 5) * 5, dur: 30 }, 92);
    if (itin) add({ es: "Precalificación con ITIN", en: "ITIN pre-qualification", des: "Gratis. Te decimos cuánto te prestan antes de ir al dealer. Nadie garantiza la aprobación.", den: "Free. We tell you how much you can borrow before you visit the dealer. No one guarantees approval.", usd: 0, dur: 60 }, 93);
  }
  const secciones = servicios.length ? [{ es: "Servicios", en: "Services", sort: 0, items: servicios }] : [];
  const patrones = [[600, 720, 900], [660, 840, 1020], [600, 780, 960], [540, 720, 900, 1020]];
  const horas = r.pick(patrones), dias = r.pick([[1, 2, 3, 4, 5, 6], [2, 3, 4, 5, 6], [1, 2, 3, 4, 5], [1, 3, 4, 5, 6]]);
  const pattern = dias.flatMap((dd) => horas.map((m) => ({ dow: dd, min: m, on: true }))).slice(0, 21);
  const visibles = veh.filter((v) => !v.vendido).length;
  const settings = ajustes(B, { fee, tags, fin, itin, noCredit, itinDown, apr, term, trade, casa, reporta: false, garDef, lot: visibles + r.int(0, 3), pattern, cupo: r.pick([1, 1, 2, 2, 3]) });
  const V0 = veh.filter((v) => !v.vendido), Fv = new Set();
  if (itin) Fv.add("itin");
  if (noCredit) Fv.add("sincredito");
  if (itin && itinDown <= 150000) Fv.add("enganche");
  if (garDef > 0 || V0.some((v) => v.warranty !== "como_esta")) Fv.add("garantia");
  if (trade) Fv.add("tradein");
  if (V0.length && V0.every((v) => v.title === "limpio" && v.history)) Fv.add("limpio");
  if (casa) Fv.add("casa");
  Fv.add("prueba"); Fv.add("esp"); if (B.founded <= 2016) Fv.add("y10");
  const n = visibles;
  const eta = BI(`${n} ${n === 1 ? V.s : V.p} en el lote`, `${n} ${n === 1 ? V.en : V.enp} on the lot`);
  const feeT = itin ? BI("Financian con ITIN · tasa, meses y enganche por escrito", "ITIN financing · rate, term and down payment in writing") : garDef ? BI(`Garantía de ${garDef} meses en motor y transmisión`, `${garDef}-month powertrain warranty`) : casa ? BI("Prueba de manejo en tu casa", "Test drive at your home") : null;
  const attrs = { m: "shop", eng: itinDown, ...(garDef ? { gar: [`${garDef} meses o ${garDef * 1000} millas`, `${garDef} months or ${garDef * 1000} miles`] } : {}), autos_der: ["eta", ...(feeT ? ["fee"] : [])], tarjeta: { eta, ...(feeT ? { fee: feeT } : {}) } };
  const d = { fee, tags, fin, itin, itinDown, apr, term, bhph: false, casa, trade };
  const plan = {
    subs, galeria: gal, secciones, sueltos, settings, about: aboutVenta(B, sub, V, ciudad, d, garDef), attrs, filtros: [...Fv],
    amenities: ["acepta-tarjeta", "estacionamiento", "sala-de-espera", ...(fin ? ["financiamiento"] : []), ...(itin ? ["acepta-itin"] : []), ...(trade ? ["trade-in"] : []), ...(garDef ? ["garantia"] : [])],
    langs: ["es", "en"], modulos: ["svc", "staff", "nov"], semana: horario(r, kind), team: equipo(B, r, sub, V), deCasa: false, operation: "local", svcModel: "emp", stripe: false,
    faqs: faqsVenta(B, sub, V, d, ciudad, r), veh, ds: d, tienda: [], renta: [], kind, V,
    licencias: ex?.lic ?? ["pa_dealer", "pa_vendedor_autos"], inventario: true,
  };
  plan.posts = novedadesVenta({ ...B, ciudadNombre: ciudad.nombre }, plan, V, r);
  return plan;
}

function ajustes(B, s) {
  return [
    `if (select coalesce((value #>> '{}')::int, 0) from platform_config where key = 'dealer_doc_fee_cap_cents') < ${s.fee} or (select parts_bp from tax_rules where city_id = ${q(B.city)} and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) is distinct from ${TAX_BP} then raise exception 'el tope de PA o el impuesto de la ciudad no son los que usa esta semilla'; end if;`,
    `insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default, bhph_down_cents, bhph_week_cents, bhph_months, lot_total, test_pattern, test_cupo)
  values (b, ${q(B.city)}, null, ${s.fee}, ${s.tags}, ${s.fin}, ${s.itin}, ${s.noCredit}, ${s.itinDown}, ${s.apr ?? "null"}, ${s.term ?? "null"}, ${s.trade}, ${s.casa}, ${s.reporta}, ${s.garDef}, 100000, 9500, 18, ${s.lot}, ${J(s.pattern)}, ${s.cupo}) on conflict (business_id) do nothing;`,
  ];
}

/* ── Plan de un negocio que vende servicios ── */
function planServicio(B, sub, r) {
  const S = SERV[sub.fam], ciudad = CIUDADES[B.city];
  const subs = [B.sub, ...r.some(sub.otras, Math.min(sub.otras.length, r.int(1, 2)))];
  const fotos = fotosDeSubs(subs, CAT), gal = r.shuffle(fotos).slice(0, Math.min(fotos.length, r.int(6, 8)));
  const fotoSrv = px(fotos[0] ?? "7144195");
  const items = S.items.map((s, i) => ({ m: "svc", key: `s${i}`, es: s.es, en: s.en, des: s.des, den: s.den, price: Math.round(s.usd * 100), from: s.desde, dur: s.dur, attrs: {}, fotos: [px(r.pick(fotos.length ? fotos : ["7144195"]))], sort: i }));
  // Si hay precios, ficha con algo de cobro en la app; todo lo demás se paga en persona
  const secciones = [{ es: "Servicios", en: "Services", sort: 0, items }];
  const fee = Math.min(r.pick([29900, 34900, 39900]), CAP), tags = r.pick([13500, 15000]);
  const fin = !!S.fin, itin = !!S.itin, itinDown = r.pick([100000, 150000, 150000, 200000]);
  const settings = ajustes(B, { fee, tags, fin, itin, noCredit: false, itinDown, apr: null, term: null, trade: !!S.trade, casa: false, reporta: false, garDef: 0, lot: 0, pattern: [], cupo: 1 });
  const Fv = new Set(["esp"]);
  if (itin) Fv.add("itin");
  if (S.trade) Fv.add("tradein");
  if (S.taller) Fv.add("garantia");
  if (B.founded <= 2016) Fv.add("y10");
  const feeT = { ITIN: BI("Financian con ITIN · tasa, meses y enganche por escrito", "ITIN financing · rate, term and down payment in writing"), primer: BI("Tu primer carro, paso a paso y por escrito", "Your first car, step by step and in writing"), dealer: BI("Tasa, meses y total por escrito", "Rate, term and total in writing"), "garantía": BI("Qué cubre y qué no, por escrito", "What it covers and what it does not, in writing"), GAP: BI("No es obligatorio · precio por escrito", "Not required · price in writing"), placas: BI("Lo de PennDOT y la tarifa de la oficina, antes de empezar", "PennDOT fees and the office fee, before starting"), "avalúo": BI("Avalúo gratis y por escrito", "Free written appraisal"), efectivo: BI("Oferta gratis, por escrito y sin cobro de grúa", "Free written offer, no tow charge"), taller: BI("El precio es el total por escrito antes de empezar", "The price is the written total before starting"), "envío": BI("Cotización por escrito antes de pagar", "Written quote before you pay"), subasta: BI("La tarifa del comprador, antes de pujar", "The buyer fee, before you bid"), mayoreo: BI("Precio de mayoreo por escrito", "Wholesale price in writing") }[S.tema];
  const attrs = { m: "shop", eng: itinDown, autos_der: feeT ? ["fee"] : [], tarjeta: feeT ? { fee: feeT } : {} };
  const nuevoFee = null; void nuevoFee;
  const plan = {
    subs, galeria: gal, secciones, sueltos: [], settings, about: BI(`${S.about[0]} en ${ciudad.nombre} desde ${B.founded}. El precio y lo que incluye van por escrito antes de empezar. Hablamos español e inglés.`, `${S.about[1]} in ${ciudad.nombre} since ${B.founded}. The price and what it includes are in writing before we start. We speak Spanish and English.`),
    attrs, filtros: [...Fv], amenities: ["acepta-tarjeta", "estacionamiento", "sala-de-espera", ...(S.fin ? ["financiamiento"] : []), ...(itin ? ["acepta-itin"] : []), ...(S.trade ? ["trade-in"] : [])],
    langs: ["es", "en"], modulos: ["svc", "staff", "nov"], semana: horario(r, sub.kind), team: equipo(B, r, sub, null), deCasa: false, operation: "local", svcModel: "emp", stripe: !!S.stripe, faqs: faqsServ(B, sub, S, ciudad), items,
    veh: [], ds: { fee, tags, fin, itin, itinDown, apr: null, term: null, bhph: false, casa: false, trade: !!S.trade }, tienda: [], renta: [], kind: sub.kind, V: null,
    licencias: S.lic, inventario: false, S,
  };
  plan.posts = novedadesServ({ ...B, ciudadNombre: ciudad.nombre }, plan, S, r);
  void fotoSrv;
  return plan;
}

export function planR2(B) {
  const r = new Rng(B.seed + ":plan"), sub = SUBS.find((s) => s.id === B.sub);
  return esServicio(sub) ? planServicio(B, sub, r) : planVenta(B, sub, r);
}

/* ── Historia ── */
const nl = (n, ctx) => `${31000000 + (ctx.n = (ctx.n ?? 0) + 1)}`;
export function historiaR2(B, plan, ctx) {
  const sub = SUBS.find((s) => s.id === B.sub);
  return plan.inventario ? historiaVenta(B, plan, ctx) : historiaServicio(B, plan, ctx, sub);
}
function historiaVenta(B, plan, ctx) {
  // La historia de pruebas de manejo de la ronda 1; los vehículos sin millas (botes, remolques…) se cuentan sin «millas».
  const clon = { ...plan, veh: plan.veh.map((v) => ({ ...v, miles: v.miles ?? 0, _nomi: v.miles == null })) };
  const h = historiaDealer(B, clon, { contador: { d: 0 } });
  const nuevo = new Map();
  for (const o of h.filas) { const n = `D-${nl(null, ctx)}`; nuevo.set(o.num, n); o.num = n; const v = o._veh; if (v._nomi) { const es = v.title === "limpio" ? "Título limpio" : v.title === "reconstruido" ? "Título reconstruido" : "Título salvage", en = v.title === "limpio" ? "Clean title" : v.title === "reconstruido" ? "Rebuilt title" : "Salvage title"; o.det.sub = { es: `${v.year} · ${es}`, en: `${v.year} · ${en}` }; o.det.miles = null; } o.det.r2 = TAG; }
  for (const e of h.eventos) e.num = nuevo.get(e.num);
  return h;
}
const ESTADOS = [["done", 0.8], ["cancelled", 0.1], ["declined", 0.03], ["expired", 0.03], ["noshow", 0.04]];
function historiaServicio(B, plan, ctx, sub) {
  const r = new Rng(B.seed + ":hist"), N = Math.max(40, Math.min(110, Math.round(70 * B.size))), U = r.int(3, 6);
  const items = plan.items, pesos = items.map((x, i) => [x, i < 3 ? 3 : 1]);
  const clientes = elegirClientes(B, r, N + U + 15);
  const dias = Array.from({ length: N }, () => diaDeVida(r, B.founded)).sort((a, b) => a - b);
  const filas = [], eventos = [];
  let n = 0;
  const horas = [9, 10, 11, 13, 14, 15, 16];
  for (const { d, up } of [...dias.map((d) => ({ d, up: false })), ...Array.from({ length: U }, () => ({ d: r.int(1, 12), up: true })).sort((a, b) => a.d - b.d)]) {
    const c = clientes[n % clientes.length]; n++;
    const it = r.weighted(pesos), mm = r.pick(horas) * 60 + r.pick([0, 0, 30]);
    const st = up ? r.weighted([["confirmed", 0.7], ["pending", 0.3]]) : r.weighted(ESTADOS);
    const sub0 = it.price > 0 && it.from && r.chance(0.4) ? it.price + Math.round(it.price * (0.1 + r.next() * 0.5) / 500) * 500 : it.price;
    const sentD = up ? -r.int(1, 4) : d - r.int(1, 4), sentM = r.int(7, 21) * 60 + r.pick([0, 12, 24, 40]);
    const pagaApp = plan.stripe && sub0 > 0 && r.chance(0.35) && st === "done";
    const num = `C-${nl(null, ctx)}`;
    const o = { num, kind: "appointment", city: B.city, biz: B.id, ph: c.tel, mem: memberId(B, r.int(0, Math.min(2, plan.team.length - 1))), st: st === "noshow" ? "done" : st, sd: st === "noshow" ? "noshow" : null, d, m: mm, dur: it.dur ?? 30,
      det: { demo: "c", r2: TAG, cat: CAT, rubro: "dealer", svc: { es: it.es, en: it.en }, svcId: it.key, base: sub0 }, sub: sub0, dep: 0, tot: sub0, pm: pagaApp ? "app" : "local", ps: pagaApp ? "captured" : null,
      sentD, sentM, ansD: up ? (st === "pending" ? null : sentD) : sentD, ansM: sentM + r.int(5, 90), party: null };
    if (st === "pending") { o.ansD = null; o.ansM = null; o.pm = "local"; o.ps = null; }
    if (st === "confirmed") { o.pm = "local"; o.ps = null; }
    if (st === "done" || st === "noshow") { o.doneD = d; o.doneM = mm + (it.dur ?? 30) + r.int(0, 30); }
    if (st === "noshow") { o.tot = 0; o.sub = 0; o.pm = "none"; o.ps = null; o.doneM = mm + 30; }
    if (st === "cancelled") { o.cancD = Math.min(d, Math.max(sentD, d - r.int(0, 2))); o.cancM = r.int(7, 20) * 60; o.cby = r.weighted([["user", 0.75], ["business", 0.25]]); o.creason = o.cby === "user" ? r.pick(["Cambié de planes", "Ya lo resolví", "No me da el horario", "Encontré otra fecha"]) : r.pick(["Se nos cruzó otra cita", "Reprogramamos por clima"]); o.pm = "local"; o.ps = null; }
    if (st === "declined" || st === "expired") { o.pm = "local"; o.ps = null; if (st === "expired") { o.ansD = null; o.ansM = null; } }
    if (!up && d > -1) o.d = -1;
    if (o.pm === "local" && st !== "done") o.ps = null;
    filas.push({ ...o, _it: it, _veh: null, _c: c, _up: up });
    const E = eventos;
    E.push({ num, kind: "sent", actor: "user", d: sentD, m: sentM });
    if (o.ansD != null && st !== "declined") E.push({ num, kind: "accepted", actor: "business", d: o.ansD, m: o.ansM });
    if (st === "declined") E.push({ num, kind: "declined", actor: "business", d: o.ansD ?? sentD, m: o.ansM ?? sentM + 20 });
    if (st === "expired") E.push({ num, kind: "expired", actor: "system", d: Math.min(-1, sentD + 1), m: sentM });
    if (st === "cancelled") E.push({ num, kind: "cancelled", actor: o.cby === "user" ? "user" : "business", d: o.cancD, m: o.cancM });
    if (st === "done") E.push({ num, kind: "done", actor: "member", d: o.doneD, m: o.doneM });
    if (st === "noshow") E.push({ num, kind: "noshow", actor: "member", d: o.d, m: mm + 30 });
  }
  return { filas, eventos, clientes };
}
