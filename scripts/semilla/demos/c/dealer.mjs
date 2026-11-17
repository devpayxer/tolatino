/* Dealer (NEG-DEALER) · las 5 principales = las primeras 5 por orden del catálogo:
   01 Agencia de autos nuevos · 02 Lote de autos usados · 03 Lote independiente · 04 Compre aquí pague aquí · 05 Sin crédito.
   Inventario con VIN válido (dígito verificador), total en la puerta (impuesto de PA 6 % de tax_rules, placas, cargo del dealer ≤ tope 47700), pago de ejemplo y compre-aquí-pague-aquí
   con las mismas fórmulas de lib/autos.ts (enLaPuerta, pagoEjemplo, totalBhph); títulos limpio / reconstruido / salvage con sus reglas. */
import { Rng, q, J, TA, BI, redondea, px, crearVin, vinValido, diaDeVida, money, CIUDADES, fotosDeSubs } from "./base.mjs";
import { elegirClientes, CLIENTES } from "./nucleo.mjs";
import { armarNovedades } from "./textos.mjs";
import { armarResenas } from "./resenas.mjs";

export const CAT = "NEG-DEALER";
export const SUBS = [
  { id: "NEG-DEALER-01", es: "Agencia de autos nuevos", en: "New car dealer", kind: "new", otras: ["NEG-DEALER-08", "NEG-DEALER-11", "NEG-DEALER-10"],
    negocios: ["Cumbre Motors", "Lehigh Premier Autos", "Valle del Susquehanna Autos", "Lackawanna Auto Plaza", "Berks Nuevos y Certificados", "Montaña Motors", "Autos Nuevos del Valle", "Wyoming Auto Group", "Keystone Premier Motors", "Schuylkill Auto Mall"] },
  { id: "NEG-DEALER-02", es: "Lote de autos usados", en: "Used car lot", kind: "lot", otras: ["NEG-DEALER-08", "NEG-DEALER-11", "NEG-DEALER-06"],
    negocios: ["Autos Usados Don Chino", "Lote La Estrella Allentown", "Autos Selectos Wilkes-Barre", "Autos Usados El Primo", "Lote Reading Latino", "Autos Garantizados Hazleton", "Lehigh Valley Used Cars", "Autos Buen Precio Wyoming", "Lote Scranton Selecto", "Autos Usados Los Compadres"] },
  { id: "NEG-DEALER-03", es: "Lote independiente", en: "Independent lot", kind: "lot", otras: ["NEG-DEALER-02", "NEG-DEALER-10", "NEG-DEALER-25"],
    negocios: ["Lote Independiente Don Pedro", "Independiente Auto Sales Allentown", "Lote El Cibaeño Wilkes-Barre", "Lote Independiente Cerro Alto", "Lote Berks Auto", "Autos Independientes Hazleton", "Lote Los Hermanos Allentown", "Lote La Montaña Wyoming", "Independiente Motors Scranton", "Lote Santa María Reading"] },
  { id: "NEG-DEALER-04", es: "Compre aquí pague aquí", en: "Buy here pay here", kind: "bhph", otras: ["NEG-DEALER-05", "NEG-DEALER-02"],
    negocios: ["Compre Aquí Pague Aquí Allentown", "Pague Aquí Su Carro Hazleton", "Carros a Plazos Wilkes-Barre", "Auto Plazos Scranton", "Compre Aquí Reading", "Carros Fáciles Hazleton", "Pague Semanal Autos Allentown", "Auto Crédito Casa Wyoming", "Carros a Su Medida Scranton", "Plan Semanal Autos Reading"] },
  { id: "NEG-DEALER-05", es: "Sin crédito", en: "No credit needed", kind: "bhph", otras: ["NEG-DEALER-04", "NEG-DEALER-06"],
    negocios: ["Autos Sin Crédito Hazleton", "Sin Crédito Autos Allentown", "Tu Carro Sin Crédito Wilkes-Barre", "Autos Sin Crédito Scranton", "Sin Crédito Reading Autos", "Carro Sin Historial Hazleton", "Autos Aprobados Allentown", "Sin Crédito Wyoming Motors", "Carros Sin Crédito Scranton", "Autos Sin Banco Reading"] },
];
export const RUBRO = "dealer";

const CAP = 47700, TAX_BP = 600;
/* Modelos con foto verificada en las semillas del repo. base = precio de lista nuevo; mi = millas por año. */
const MODELOS = [
  { make: "Honda", model: "Civic", trims: ["LX", "EX", "Sport"], body: "carro", wmi: "2HG", vds: "FC2F5", foto: "6794821", base: 24000, fuel: "gasolina", drive: "fwd", trans: "cvt", y: [2012, 2023] },
  { make: "Toyota", model: "Camry", trims: ["LE", "SE", "XLE"], body: "carro", wmi: "4T1", vds: "BF1FK", foto: "11285174", base: 28000, fuel: "gasolina", drive: "fwd", trans: "automatica", y: [2012, 2023] },
  { make: "Toyota", model: "Corolla", trims: ["L", "LE", "SE"], body: "carro", wmi: "2T1", vds: "BURHE", foto: "11285174", fotoNuevo: "2127039", base: 22500, fuel: "gasolina", drive: "fwd", trans: "cvt", y: [2011, 2023] },
  { make: "Toyota", model: "RAV4", trims: ["LE", "XLE", "LE AWD"], body: "suv", wmi: "2T3", vds: "BFREV", foto: "28086865", base: 30000, fuel: "gasolina", drive: "awd", trans: "automatica", y: [2013, 2023] },
  { make: "Nissan", model: "Altima", trims: ["S", "SV", "SR"], body: "carro", wmi: "1N4", vds: "AL3AP", foto: "5864402", base: 26000, fuel: "gasolina", drive: "fwd", trans: "cvt", y: [2012, 2022] },
  { make: "Nissan", model: "Rogue", trims: ["S", "SV", "SV AWD"], body: "suv", wmi: "5N1", vds: "AT3MV", foto: "5864402", base: 28000, fuel: "gasolina", drive: "awd", trans: "cvt", y: [2013, 2022] },
  { make: "Ford", model: "F-150", trims: ["XL", "XLT 4x4", "Lariat 4x4"], body: "pickup", wmi: "1FT", vds: "FW1E5", foto: "8066253", base: 38000, fuel: "gasolina", drive: "4x4", trans: "automatica", y: [2012, 2022] },
  { make: "Chevrolet", model: "Silverado 1500", trims: ["WT", "LT", "LT 4x4"], body: "pickup", wmi: "1GC", vds: "UKEEC", foto: "9115472", base: 40000, fuel: "gasolina", drive: "4x4", trans: "automatica", y: [2012, 2022] },
  { make: "Toyota", model: "Sienna", trims: ["LE", "XLE"], body: "van", wmi: "5TD", vds: "KK3DC", foto: "20846594", base: 38000, fuel: "gasolina", drive: "fwd", trans: "automatica", y: [2012, 2022] },
  { make: "Honda", model: "Accord", trims: ["LX", "EX", "Sport"], body: "carro", wmi: "1HG", vds: "CR2F3", foto: "16350076", base: 28000, fuel: "gasolina", drive: "fwd", trans: "cvt", y: [2012, 2023] },
  { make: "Honda", model: "CR-V", trims: ["LX", "EX", "EX AWD"], body: "suv", wmi: "2HK", vds: "RW2H5", foto: "116675", base: 31000, fuel: "gasolina", drive: "awd", trans: "cvt", y: [2013, 2023] },
];
const NOTAS = [
  ["Un solo dueño. Mantenimiento al día y llantas en buen estado.", "One owner. Maintenance up to date and tires in good shape."],
  ["Interior limpio, aire frío y sin luces en el tablero.", "Clean interior, cold A/C and no dash warning lights."],
  ["Se revisó en el taller antes de ponerlo a la venta.", "Inspected in the shop before going on sale."],
  ["Llaves de repuesto y manuales. Listo para entregar.", "Spare keys and manuals. Ready to deliver."],
  ["Cambio de aceite y frenos hechos al recibirlo.", "Oil change and brakes done when we took it in."],
  ["Muy buen consumo de gasolina. Ideal para el trabajo diario.", "Great fuel economy. Ideal for daily commuting."],
  ["Sin accidentes reportados. Historial disponible.", "No reported accidents. History available."],
];
const NOTA_SALV = ["Título salvage: se vende para reparar. No se maneja en la calle hasta pasar la inspección de PA.", "Salvage title: sold to be repaired. It cannot be driven on the street until it passes PA inspection."];
const NOTA_RECO = ["Título reconstruido: ya pasó la inspección de PA. Pregunta por el informe de reparación.", "Rebuilt title: it passed PA inspection. Ask for the repair report."];

/* ── fórmulas de lib/autos.ts ── */
export const enLaPuerta = (price, taxBp, tags, fee) => { const tax = Math.floor((price * taxBp + 5000) / 10000); return { price, taxBp, tax, tags, fee, otd: price + tax + tags + fee }; };
export function pagoEjemplo(otd, enganche, aprBp, meses) {
  if (enganche == null || aprBp == null || meses == null || ![12, 24, 36, 48, 60, 72].includes(meses) || !(enganche >= 0) || !(aprBp >= 0)) return null;
  const P = otd - enganche; if (P <= 0) return null;
  const r = aprBp / 10000 / 12, pago = Math.round(r === 0 ? P / meses : (P * r) / (1 - Math.pow(1 + r, -meses)));
  return { down: enganche, aprBp, months: meses, pago, total: enganche + pago * meses };
}
export function totalBhph(otd, enganche, semana, meses) {
  const weeks = Math.round((meses * 52) / 12), total = enganche + semana * weeks, fin = otd - enganche;
  if (![12, 18, 24, 36].includes(meses) || fin <= 0 || total < otd) return null;
  const vp = (i) => (i === 0 ? semana * weeks : (semana * (1 - Math.pow(1 + i, -weeks))) / i);
  let lo = 0, hi = 1;
  for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (vp(m) > fin) lo = m; else hi = m; }
  const aprBp = Math.round(((lo + hi) / 2) * 52 * 10000);
  return aprBp > 20000 ? null : { down: enganche, week: semana, weeks, months: meses, total, aprBp };
}

export function planDealer(B) {
  const r = new Rng(B.seed + ":plan"), sub = SUBS.find((s) => s.id === B.sub), kind = sub.kind, ciudad = CIUDADES[B.city];
  const subs = [B.sub, ...r.some(sub.otras, r.int(1, 2))];
  const fotos = fotosDeSubs(subs, CAT), gal = r.shuffle(fotos).slice(0, Math.min(fotos.length, r.int(6, 8)));
  // Herramienta del dealer
  const bhph = kind === "bhph", nuevo = kind === "new";
  const tags = r.pick([13500, 15000, 15000, 16500]), feeWant = nuevo ? r.pick([34900, 39900, 44900, 47700]) : bhph ? r.pick([19900, 29900, 34900, 39900, 44900]) : r.pick([29900, 34900, 39900, 44900, 47700]);
  const fee = Math.min(feeWant, CAP);
  const fin = !bhph && (nuevo || r.chance(0.65)), itin = !bhph && fin && r.chance(nuevo ? 0.3 : 0.55), noCredit = bhph || (!nuevo && r.chance(0.12));
  const itinDown = r.pick([100000, 150000, 150000, 200000]), apr = fin ? (nuevo ? r.pick([499, 649, 749, 899]) : r.pick([899, 1149, 1299, 1490, 1690])) : null, term = fin ? (nuevo ? r.pick([48, 60, 72]) : r.pick([36, 48, 60])) : null;
  const trade = !bhph && r.chance(0.8), casa = r.chance(0.35), reporta = bhph && r.chance(0.6), garDef = nuevo ? 0 : bhph ? r.pick([0, 3]) : r.pick([0, 3, 3, 6]);
  const bDown = bhph ? r.pick([100000, 100000, 150000, 200000]) : 99900 - 99900 + 100000, bWeek = bhph ? r.pick([9500, 10000, 10500, 11500, 12500]) : 9500, bMonths = bhph ? r.pick([18, 24, 24, 36]) : 18;
  // Inventario
  const nLote = bhph ? r.int(10, 18) : nuevo ? r.int(10, 18) : r.int(9, 17), nVend = r.int(14, 36);
  const veh = [];
  const usados = new Set();
  const hoy = 2026;
  const mkVeh = (vendido, i) => {
    const m = r.pick(MODELOS);
    let year, miles;
    if (nuevo && !vendido && i < nLote * 0.55) { year = r.pick([2025, 2026]); miles = r.int(5, 60); }
    else if (nuevo) { year = r.int(2020, 2024); miles = year * 0 + Math.round((hoy - year) * r.int(7000, 12000)); }
    else if (bhph) { year = r.int(Math.max(m.y[0], 2008), Math.min(m.y[1], 2016)); miles = Math.round((hoy - year) * r.int(9000, 13500)); }
    else { year = r.int(Math.max(m.y[0], 2012), Math.min(m.y[1], 2022)); miles = Math.round((hoy - year) * r.int(8000, 12500)); }
    const age = hoy - year, nuevoMod = year >= 2025;
    let price = nuevoMod ? m.base * (1.02 + r.next() * 0.08) : m.base * Math.pow(0.9, age) * (0.9 + r.next() * 0.2) * (1 - Math.min(0.25, miles / 700000));
    price = redondea(Math.max(bhph ? 2500 : 4500, price) * 100, 10000);
    if (bhph) price = Math.min(price, 8200 * 100 - (r.int(0, 12) * 10000));
    const trim = r.pick(m.trims);
    // Título: casi todo limpio; algunos reconstruidos y, en lotes independientes, algún salvage (no se maneja en la calle)
    let title = "limpio", street = true;
    if (!nuevo && !bhph && r.chance(0.07)) { title = "reconstruido"; price = redondea(price * 0.72, 10000); }
    if (kind === "lot" && B.sub === "NEG-DEALER-03" && i === 3 && r.chance(0.7) && !vendido) { title = "salvage"; street = false; price = redondea(Math.max(1500 * 100, price * 0.45), 10000); }
    let vin;
    do { vin = crearVin(m.wmi, m.vds, year, "A", 100000 + r.int(0, 899999)); } while (usados.has(vin));
    usados.add(vin);
    const history = title === "salvage" ? false : r.chance(nuevo ? 0.3 : 0.8), src = history ? r.pick(["Carfax", "Carfax", "AutoCheck"]) : null;
    const cert = nuevo && !nuevoMod && r.chance(0.7), fabrica = nuevoMod;
    let warranty = "como_esta", wm = null, wmi = null;
    if (fabrica) { warranty = "fabrica"; wm = 36; wmi = 36000; }
    else if (cert) { warranty = "certificado"; wm = 84; wmi = 100000; }
    else if (!bhph && garDef > 0 && title === "limpio") { warranty = "dealer"; wm = garDef; wmi = garDef * 1000; }
    else if (bhph && garDef > 0) { warranty = "dealer"; wm = garDef; wmi = garDef * 1000; }
    if (title === "salvage") { warranty = "como_esta"; wm = null; wmi = null; }
    const pt = enLaPuerta(price, TAX_BP, tags, fee);
    const est = fin && !bhph ? pagoEjemplo(pt.otd, itinDown, apr, term) : null, bh = bhph ? totalBhph(pt.otd, bDown, bWeek, bMonths) : null;
    const nota = title === "salvage" ? NOTA_SALV : title === "reconstruido" ? NOTA_RECO : r.pick(NOTAS);
    const nombre = `${year} ${m.make} ${m.model} ${trim}`.slice(0, 60);
    return { m, year, trim, miles, price, title, street, vin, history, src, warranty, wm, wmi, pt, est, bh, nota, nombre, vendido, pa: r.chance(0.5), foto: nuevoMod && m.fotoNuevo ? m.fotoNuevo : m.foto, d: vendido ? -r.int(5, Math.max(20, (2026 - B.founded) * 330)) : 0 };
  };
  for (let i = 0; i < nLote; i++) veh.push(mkVeh(false, i));
  // BHPH: si el plan semanal no cubre un carro, no hay plan para ese carro (la app no lo muestra): se baja el precio a lo que cubre
  for (const v of veh) if (bhph && !v.bh) { let p = v.price; while (p > 150000 && !totalBhph(enLaPuerta(p, TAX_BP, tags, fee).otd, bDown, bWeek, bMonths)) p -= 10000; v.price = p; v.pt = enLaPuerta(p, TAX_BP, tags, fee); v.bh = totalBhph(v.pt.otd, bDown, bWeek, bMonths); }
  for (let i = 0; i < nVend; i++) { const v = mkVeh(true, i + 50); if (bhph && !totalBhph(v.pt.otd, bDown, bWeek, bMonths)) { v.bh = null; } veh.push(v); }
  const sueltos = veh.map((v, i) => itemVehiculo(B, v, i));
  // Servicios financieros opcionales (nunca obligatorios)
  const servicios = [];
  const fotoSrv = px(fotos[0] ?? "7144195");
  if (!nuevo || r.chance(0.5)) servicios.push({ m: "svc", es: "Tasación de tu carro (trade-in)", en: "Trade-in appraisal", des: "Gratis y por escrito. Te decimos cuánto vale antes de que decidas.", den: "Free and in writing. We tell you what it is worth before you decide.", price: 0, dur: 30, attrs: {}, fotos: [fotoSrv], sort: 90 });
  if (r.chance(0.6)) servicios.push({ m: "svc", es: "Garantía extendida · 3 años", en: "Extended warranty · 3 years", des: "Motor, transmisión y aire. No es obligatoria para el préstamo.", den: "Engine, transmission and A/C. Not required for the loan.", price: redondea(129500 * (0.9 + r.next() * 0.25), 500), dur: 30, attrs: {}, fotos: [fotoSrv], sort: 91 });
  if (r.chance(0.5)) servicios.push({ m: "svc", es: "GAP", en: "GAP", des: "Paga lo que debes si el seguro da menos. No es obligatorio.", den: "Pays what you owe if insurance pays less. Not required.", price: redondea(49500 * (0.9 + r.next() * 0.25), 500), dur: 30, attrs: {}, fotos: [fotoSrv], sort: 92 });
  if (!bhph && r.chance(0.5)) servicios.push({ m: "svc", es: "Precalificación con ITIN", en: "ITIN pre-qualification", des: "Gratis. Te decimos cuánto te prestan antes de ir al dealer. Nadie garantiza la aprobación.", den: "Free. We tell you how much you can borrow before you visit the dealer. No one guarantees approval.", price: 0, dur: 60, attrs: {}, fotos: [fotoSrv], sort: 93 });
  const secciones = servicios.length ? [{ es: "Servicios", en: "Services", sort: 0, items: servicios }] : [];
  // Prueba de manejo: patrón semanal (el barrido abre las horas 14 días adelante)
  const patrones = [[600, 720, 900], [660, 840, 1020], [600, 780, 960], [540, 720, 900, 1020]];
  const horas = r.pick(patrones), dias = r.pick([[1, 2, 3, 4, 5, 6], [2, 3, 4, 5, 6], [1, 2, 3, 4, 5], [1, 3, 4, 5, 6]]);
  const pattern = dias.flatMap((d) => horas.map((m) => ({ dow: d, min: m, on: true }))).slice(0, 21);
  const visibles = veh.filter((v) => !v.vendido).length;
  const settings = [
    `if (select coalesce((value #>> '{}')::int, 0) from platform_config where key = 'dealer_doc_fee_cap_cents') < ${fee} or (select parts_bp from tax_rules where city_id = ${q(B.city)} and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) is distinct from ${TAX_BP} then raise exception 'el tope de PA o el impuesto de la ciudad no son los que usa esta semilla'; end if;`,
    `insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default, bhph_down_cents, bhph_week_cents, bhph_months, lot_total, test_pattern, test_cupo)
  values (b, ${q(B.city)}, null, ${fee}, ${tags}, ${fin}, ${itin}, ${noCredit}, ${itinDown}, ${apr ?? "null"}, ${term ?? "null"}, ${trade}, ${casa}, ${reporta}, ${garDef}, ${bDown}, ${bWeek}, ${bMonths}, ${visibles + r.int(0, 3)}, ${J(pattern)}, ${r.pick([1, 1, 2, 2, 3])}) on conflict (business_id) do nothing;`,
  ];
  // Filtros derivados (lib/autos.ts › recalcularFiltrosAutos) y etiquetas propias
  const V = veh.filter((v) => !v.vendido), F = new Set();
  if (itin) F.add("itin");
  if (bhph || noCredit || subs.includes("NEG-DEALER-05")) F.add("sincredito");
  if ((itin && itinDown <= 150000) || (bhph && bDown <= 150000)) F.add("enganche");
  if (garDef > 0 || V.some((v) => v.warranty !== "como_esta")) F.add("garantia");
  if (trade) F.add("tradein");
  if (V.length && V.every((v) => v.title === "limpio" && v.history)) F.add("limpio");
  if (casa) F.add("casa");
  if (bhph && reporta) F.add("reporta");
  F.add("prueba");
  F.add("esp"); if (B.founded <= 2016) F.add("y10");
  const n = Math.max(visibles, visibles + 0);
  const eta = BI(`${n} ${n === 1 ? "carro" : "carros"} en el lote`, `${n} ${n === 1 ? "car" : "cars"} on the lot`);
  const feeT = bhph ? BI("Sin crédito · el total que pagas, por escrito en cada carro", "No credit · the total you pay, in writing on every car") : itin ? BI("Financian con ITIN · tasa, meses y enganche por escrito", "ITIN financing · rate, term and down payment in writing") : garDef ? BI(`Garantía de ${garDef} meses en motor y transmisión`, `${garDef}-month powertrain warranty`) : casa ? BI("Prueba de manejo en tu casa", "Test drive at your home") : null;
  const tarjeta = { eta, ...(feeT ? { fee: feeT } : {}) };
  const attrs = { m: "shop", eng: itinDown, ...(garDef ? { gar: [`${garDef} meses o ${garDef * 1000} millas`, `${garDef} months or ${garDef * 1000} miles`] } : {}), autos_der: ["eta", ...(feeT ? ["fee"] : [])], tarjeta };
  const semana = horarioDealer(r, nuevo);
  const crew = r.int(3, 9);
  const team = equipoDealer(B, r, kind, crew);
  const about = aboutDealer(B, sub, ciudad, kind, itin, bhph, garDef, trade, casa);
  const plan = {
    subs, galeria: gal, secciones, sueltos: sueltos, settings, about, attrs, filtros: [...F], amenities: ["acepta-tarjeta", "estacionamiento", "sala-de-espera", "financiamiento", ...(itin ? ["acepta-itin"] : []), ...(trade ? ["trade-in"] : []), ...(garDef ? ["garantia"] : [])].filter((x, i, a) => a.indexOf(x) === i),
    langs: ["es", "en"], modulos: ["svc", "staff", "nov"], semana, team, deCasa: false, operation: "local", svcModel: "emp", stripe: false,
    faqs: faqsDealer(B, kind, fee, tags, itin, itinDown, bhph, bDown, bWeek, bMonths, trade, casa, garDef, ciudad, r), veh, ds: { fee, tags, fin, itin, itinDown, apr, term, bhph, bDown, bWeek, bMonths, casa, trade }, tienda: [], renta: [], kind,
    licencias: bhph ? ["pa_dealer", "pa_vendedor_autos", "pa_venta_plazos"] : ["pa_dealer", "pa_vendedor_autos"],
  };
  plan.posts = novedadesDealer(B, plan, r);
  return plan;
}

function itemVehiculo(B, v, i) {
  const col = ["id", "item_id", "business_id", "city_id", "vin", "year", "make", "model", "trim_level", "body", "miles", "engine_hours", "transmission", "fuel", "drivetrain", "title", "history_report", "history_src", "pa_inspection", "warranty", "warranty_months", "warranty_miles", "street_legal", "cdl", "price_cents", "tax_bp", "tax_cents", "tags_cents", "doc_fee_cents", "otd_cents", "est_down_cents", "est_apr_bp", "est_months", "est_payment_cents", "est_total_cents", "bhph_down_cents", "bhph_week_cents", "bhph_weeks", "bhph_total_cents", "bhph_apr_bp", "status", "status_at"].filter((c) => c !== "id");
  const e = v.est, b = v.bh, p = v.pt, m = v.m;
  const vals = ["it", "b", "x.city_id", q(v.vin), v.year, q(m.make), q(m.model), q(v.trim), q(m.body), v.miles, "null", q(m.trans), q(m.fuel), q(m.drive), q(v.title), v.history, q(v.src), v.pa, q(v.warranty), v.wm ?? "null", v.wmi ?? "null", v.street, "false", v.price, p.taxBp, p.tax, p.tags, p.fee, p.otd,
    e?.down ?? "null", e?.aprBp ?? "null", e?.months ?? "null", e?.pago ?? "null", e?.total ?? "null", b?.down ?? "null", b?.week ?? "null", b?.weeks ?? "null", b?.total ?? "null", b?.aprBp ?? "null", q(v.vendido ? "sold" : "lot"), v.vendido ? `pg_temp.c_ts(${v.d}, 840)` : "now()"];
  return {
    m: "svc", es: v.nombre, en: v.nombre, des: v.nota[0], den: v.nota[1], price: v.price, dur: 30, kind: "auto", attrs: {}, fotos: [px(v.foto)], sort: i, ret: true,
    after: `insert into vehicle_listings (${col.join(", ")}) select ${vals.join(", ")} from businesses x where x.id = b;`,
  };
}

function horarioDealer(r, nuevo) {
  const R = (a, b) => [[`${String(a).padStart(2, "0")}:00`, `${String(b).padStart(2, "0")}:00`]];
  const lv = nuevo ? R(9, 20) : r.pick([R(9, 18), R(9, 19), R(10, 19)]), sab = nuevo ? R(9, 17) : r.pick([R(9, 16), R(10, 16), R(9, 15)]);
  return [r.chance(0.2) ? R(11, 15) : null, lv, lv, lv, lv, lv, sab];
}
function equipoDealer(B, r, kind, crew) {
  const H = ["Edwin", "Jorge", "Víctor", "Ángel", "Nelson", "Samuel", "Gabriel", "Darío", "Efraín", "Ismael"], M = ["Yanira", "Sonia", "Lourdes", "Idalia", "Carolina", "Evelyn", "Wendy", "Ivelisse"];
  const AP = ["Rodríguez", "Martínez", "Díaz", "Pérez", "Santana", "Jiménez", "Almonte", "Peña", "Reyes", "Núñez", "Vargas", "Féliz", "Batista", "Méndez", "Ortiz", "Rosario"];
  const bio = r.pick([BI(`Empecé vendiendo un carro a la vez en ${B.founded}. Hoy sigo explicando el total en la puerta antes de que firmes, línea por línea.`, `I started selling one car at a time in ${B.founded}. Today I still explain the out-the-door total before you sign, line by line.`), BI(`Aquí no hay sorpresas: el precio, los impuestos, las placas y el cargo del dealer, todo por escrito. Y tu mecánico puede revisar el carro antes de firmar.`, `No surprises here: the price, taxes, tags and dealer fee, all in writing. And your mechanic can check the car before you sign.`), BI(`Llegué a Pennsylvania en 2003 y compré mi primer carro con ITIN. Por eso sé lo que se siente y ayudo a otros a hacerlo bien.`, `I came to Pennsylvania in 2003 and bought my first car with an ITIN. That is why I know how it feels and help others do it right.`)]);
  const t = [{ name: `${B.owner.nombre} ${B.owner.ap}`, role: BI("Dueño y gerente de ventas", "Owner and sales manager"), since: B.founded, langs: ["es", "en"], bio, bookings: true }];
  t.push({ name: `${r.pick(H)} ${r.pick(AP)}`, role: BI("Asesor de ventas", "Sales advisor"), since: r.int(B.founded + 1, 2023), langs: ["es", "en"], bio: null, bookings: true });
  t.push({ name: `${r.pick(M)} ${r.pick(AP)}`, role: BI(kind === "bhph" ? "Cobros y papeles" : "Financiamiento y papeles", kind === "bhph" ? "Payments and paperwork" : "Financing and paperwork"), since: r.int(B.founded + 1, 2023), langs: ["es"], bio: null, bookings: false });
  if (crew > 5) t.push({ name: `${r.pick(H)} ${r.pick(AP)}`, role: BI("Mecánico del lote", "Lot mechanic"), since: r.int(B.founded + 1, 2024), langs: ["es"], bio: null, bookings: false });
  return t;
}
function aboutDealer(B, sub, ciudad, kind, itin, bhph, gar, trade, casa) {
  const c = ciudad.nombre, y = B.founded;
  const t = { new: ["Agencia de autos nuevos y certificados", "New and certified car dealership"], lot: ["Lote de autos seleccionados", "Selected used car lot"], bhph: ["Carros con plan semanal, sin necesidad de crédito", "Cars with a weekly payment plan, no credit required"] }[kind];
  const e = [itin ? ["Financiamos con ITIN.", "We finance with an ITIN."] : null, bhph ? ["El enganche, el pago a la semana y el total que pagas van por escrito en cada carro.", "The down payment, the weekly payment and the total you pay are in writing on every car."] : ["El total en la puerta, con impuestos y placas, va en cada carro.", "The out-the-door total, with taxes and tags, is on every car."], gar ? [`Garantía de ${gar} meses en motor y transmisión.`, `${gar}-month powertrain warranty.`] : null, trade ? ["Recibimos tu carro como parte de pago.", "We take your car in trade."] : null, casa ? ["Prueba de manejo en tu casa.", "Test drive at your home."] : null].filter(Boolean);
  return BI(`${t[0]} en ${c} desde ${y}. ${e.map((x) => x[0]).join(" ")} Hablamos español e inglés.`, `${t[1]} in ${c} since ${y}. ${e.map((x) => x[1]).join(" ")} We speak Spanish and English.`);
}
function faqsDealer(B, kind, fee, tags, itin, itinDown, bhph, bDown, bWeek, bMonths, trade, casa, gar, ciudad, r) {
  const c = ciudad.nombre, F = [];
  F.push(["¿El precio incluye impuestos y placas?", "Does the price include taxes and tags?", `No: el precio es antes de impuestos. En cada carro verás el total en la puerta: precio + impuesto de PA (6 %) + placas y título (${money(tags)}) + cargo del dealer (${money(fee)}).`, `No: the price is before taxes. On each car you will see the out-the-door total: price + PA tax (6%) + tags and title (${money(tags)}) + dealer fee (${money(fee)}).`]);
  F.push(["¿Cuál es el cargo del dealer?", "What is the dealer fee?", `${money(fee)}, por debajo del tope que fija Pennsylvania. Siempre está en el total en la puerta, antes de firmar.`, `${money(fee)}, below the cap set by Pennsylvania. It is always in the out-the-door total, before you sign.`]);
  if (bhph) F.push(["¿Cómo funciona el plan semanal?", "How does the weekly plan work?", `Das un enganche (desde ${money(bDown)}) y pagas a la semana por ${bMonths} meses. El total que pagas al final, con la tasa que resulta, va por escrito en cada carro antes de firmar.`, `You pay a down payment (from ${money(bDown)}) and pay weekly for ${bMonths} months. The total you end up paying, with the resulting rate, is in writing on each car before you sign.`]);
  else F.push(["¿Financian con ITIN o sin crédito?", "Do you finance with an ITIN or no credit?", itin ? `Sí, con ITIN y un enganche desde ${money(itinDown)}. La tasa, los meses y el total van por escrito; nadie garantiza la aprobación antes de revisar tus papeles.` : "Trabajamos con bancos y cooperativas; te decimos la tasa y los meses por escrito. Nadie garantiza la aprobación.", itin ? `Yes, with an ITIN and a down payment from ${money(itinDown)}. Rate, term and total are in writing; no one guarantees approval before reviewing your papers.` : "We work with banks and credit unions; we tell you the rate and term in writing. No one guarantees approval."]);
  F.push(["¿Puedo llevar el carro a mi mecánico antes de comprar?", "Can I take the car to my mechanic before buying?", "Sí, siempre. Nos dices cuándo y lo preparamos. Si algo sale en la revisión, lo hablamos antes de firmar.", "Yes, always. Tell us when and we get it ready. If anything comes up in the check, we talk about it before you sign."]);
  F.push(["¿Aceptan mi carro como parte de pago?", "Do you take my car as a trade-in?", trade ? "Sí. Te damos la oferta por escrito, gratis, y puedes comparar sin compromiso." : "Por ahora no recibimos carros como parte de pago; si quieres vender el tuyo, te decimos a quién preguntar.", trade ? "Yes. We give you the offer in writing, free, and you can compare with no commitment." : "We do not take trade-ins right now; if you want to sell yours, we will point you to who to ask."]);
  F.push(["¿Cómo pido una prueba de manejo?", "How do I book a test drive?", `En la ficha de cada carro eliges una hora libre y nos llega al instante.${casa ? " También la hacemos en tu casa." : ""} Antes de la prueba no se cobra nada.`, `On each car you pick a free time and it reaches us instantly.${casa ? " We also do it at your home." : ""} Nothing is charged before the test drive.`]);
  F.push(["¿Qué pasa con el título?", "What about the title?", "Cada carro dice si el título es limpio, reconstruido o salvage. Un salvage no se maneja en la calle hasta pasar la inspección de PA.", "Each car says whether the title is clean, rebuilt or salvage. A salvage car cannot be driven on the street until it passes PA inspection."]);
  return F;
}
function novedadesDealer(B, plan, r) {
  const v = plan.veh.find((x) => !x.vendido), c = CIUDADES[B.city].nombre;
  const L = [
    { title: "Llegaron carros nuevos al lote", body: `Esta semana entraron varios carros al lote de ${c}. Cada uno trae su total en la puerta, el título y el historial. Reserva tu prueba de manejo en la app.` },
    { title: "Prueba de manejo sin compromiso", body: "Elige una hora libre en la ficha del carro. Antes de la prueba no se cobra nada y el total en la puerta ya está a la vista." },
    { title: v ? `Nuevo: ${v.nombre}` : "Carro nuevo en el lote", body: v ? `Ya está en el lote. Millas, título y total en la puerta en su ficha. Pide tu hora de prueba.` : "Entró un carro nuevo al lote. Mira el total en la puerta en su ficha." },
    { title: "Trae tu mecánico", body: "Puedes llevar cualquier carro del lote a tu mecánico antes de firmar. Nos avisas y lo preparamos." },
    { title: "Horario de feriados", body: "En los feriados cerramos. Reserva tu prueba de manejo con tiempo y te apartamos la hora." },
    { title: "Gracias por 10 años", body: "Gracias a cada familia que confió en nosotros y nos recomendó. Seguimos con el trato claro de siempre." },
    { title: "Con ITIN sí se puede", body: plan.ds.itin ? `Financiamos con ITIN, con enganche desde ${money(plan.ds.itinDown)}. Tasa, meses y total por escrito.` : "Pregúntanos por opciones de financiamiento. Te decimos la tasa y los meses por escrito." },
    { title: "Tasación de tu carro", body: plan.ds.trade ? "Trae tu carro y te damos una oferta por escrito, gratis. Compárala sin compromiso." : "Si vas a vender tu carro, te orientamos para que obtengas un precio justo." },
    { title: "Antes del invierno", body: "Revisión de batería y llantas en todos los carros antes de la primera helada. Llámanos o escribe por la app." },
    { title: "Lo que incluye el total en la puerta", body: "Precio, impuesto de Pennsylvania, placas y título, y el cargo del dealer. Todo se ve en cada carro antes de que firmes." },
  ];
  return armarNovedades(B, L.map((x) => ({ ...x, kind: "novedad" })), r, r.int(5, 9));
}

/* ── Historia: pruebas de manejo (visitas) ── */
export function historiaDealer(B, plan, ctx) {
  const r = new Rng(B.seed + ":hist"), N = Math.max(40, Math.round(75 * B.size)), U = r.int(3, 7);
  const filas = [], eventos = [], clientes = elegirClientes(B, r, N + U + 15);
  const dias = Array.from({ length: N }, () => diaDeVida(r, B.founded)).sort((a, b) => a - b);
  const todos = [...dias.map((d) => ({ d, up: false })), ...Array.from({ length: U }, () => ({ d: r.int(1, 12), up: true })).sort((a, b) => a.d - b.d)];
  const horas = plan.settingsHoras ?? [600, 720, 900, 840, 1020];
  let n = 0;
  for (const { d, up } of todos) {
    const c = clientes[n++ % clientes.length];
    const v = r.pick(plan.veh);
    const st = up ? r.weighted([["confirmed", 0.75], ["pending", 0.25]]) : r.weighted([["done", 0.66], ["done_noshow", 0.12], ["cancelled", 0.12], ["cancelled_gone", 0.04], ["expired", 0.06]]);
    const num = `D-33${String(ctx.contador.d = (ctx.contador.d ?? 0) + 1).padStart(5, "0")}`, mm = r.pick(horas);
    const sentD = up ? -r.int(1, 3) : d - r.int(0, 3), sentM = r.int(8, 21) * 60 + r.pick([0, 20, 40]);
    const home = plan.ds.casa && r.chance(0.2);
    const det = { demo: "c", cat: CAT, rubro: "dealer", what: "prueba", min: mm, sms: true, kind: null, year: v.year, miles: v.miles, title: v.title, ciudad: CIUDADES[B.city].nombre, item: { es: v.nombre, en: v.nombre }, sub: { es: `${v.year} · ${v.miles.toLocaleString("en-US")} millas · ${v.title === "limpio" ? "Título limpio" : v.title === "reconstruido" ? "Título reconstruido" : "Título salvage"}`, en: `${v.year} · ${v.miles.toLocaleString("en-US")} miles · ${v.title === "limpio" ? "Clean title" : v.title === "reconstruido" ? "Rebuilt title" : "Salvage title"}` },
      puerta: { fee: v.pt.fee, otd: v.pt.otd, tax: v.pt.tax, tags: v.pt.tags, price: v.pt.price, taxBp: v.pt.taxBp }, otd_cents: v.pt.otd, price_cents: v.pt.price, doc_fee_cents: v.pt.fee, at_home: home, has_license: true, solo_zona: false, ...(v.est ? { est_payment: { down: v.est.down, pago: v.est.pago, aprBp: v.est.aprBp, total: v.est.total, months: v.est.months } } : {}), ...(v.bh ? { bhph: { down: v.bh.down, week: v.bh.week, weeks: v.bh.weeks, months: v.bh.months, total: v.bh.total, aprBp: v.bh.aprBp } } : {}), ...(r.chance(0.18) ? { trade_in: { make: r.pick(["Toyota", "Honda", "Nissan", "Ford"]), model: r.pick(["Corolla", "Civic", "Altima", "Focus"]), year: r.int(2006, 2015), miles: r.int(90, 190) * 1000 } } : {}) };
    const o = { num, kind: "visit", city: B.city, biz: B.id, ph: c.tel, mem: null, st: st === "done_noshow" ? "done" : st === "cancelled_gone" ? "cancelled" : st, sd: st === "done" ? "done" : st === "done_noshow" ? "noshow" : st === "cancelled_gone" ? "vendida" : st === "expired" ? "sin_respuesta" : null,
      d, m: mm, dur: null, det, sub: 0, tot: 0, pm: "none", ps: null, party: 1, sentD, sentM, ansD: st === "pending" || st === "expired" ? null : sentD, ansM: sentM + r.int(1, 30), _veh: v, _c: c, _it: { es: v.nombre, en: v.nombre }, _up: up, mode: null };
    if (st === "done" || st === "done_noshow") { o.doneD = d; o.doneM = mm + (st === "done" ? r.int(25, 70) : 20); }
    if (st === "cancelled" || st === "cancelled_gone") { o.cancD = d; o.cancM = Math.max(480, mm - r.int(60, 600)); o.cby = st === "cancelled_gone" ? "system" : "user"; o.creason = st === "cancelled_gone" ? null : r.pick(["Cambié de planes", "Ya compré otro carro", "No me da el horario", "Encontré uno más cerca"]); }
    filas.push(o);
    eventos.push({ num, kind: "vis_sent", actor: "user", d: sentD, m: sentM });
    if (o.ansD != null) eventos.push({ num, kind: "vis_ok", actor: "member", d: o.ansD, m: o.ansM });
    if (st === "done") eventos.push({ num, kind: "vis_done", actor: "member", d, m: o.doneM });
    if (st === "done_noshow") eventos.push({ num, kind: "vis_noshow", actor: "member", d, m: o.doneM });
    if (st === "expired") eventos.push({ num, kind: "vis_exp", actor: "system", d: Math.min(-1, sentD + 1), m: sentM });
    if (st === "cancelled") eventos.push({ num, kind: "cancelled", actor: "user", d, m: o.cancM });
    if (st === "cancelled_gone") eventos.push({ num, kind: "vis_listing_gone", actor: "member", d, m: o.cancM });
  }
  return { filas, eventos, clientes };
}

const ok3 = (s) => (s >= 4 ? 1 : s === 3 ? 0 : -1), ok2 = (s) => (s >= 4 ? 1 : 0), okm = (s) => (s >= 4 ? 1 : -1);
export const CONFIG = {
  archivo: "demo-c-dealer.sql", titulo: "Dealer (10 negocios en cada una de: Agencia de autos nuevos, Lote de autos usados, Lote independiente, Compre aquí pague aquí, Sin crédito)",
  mod: { CAT, SUBS, RUBRO }, idx: 100, tipo: "dealer", plan: planDealer, hist: historiaDealer,
  resenas: () => ({
    src: "cita", terminada: (f) => f.kind === "visit" && f.st === "done" && f.sd === "done",
    respuestas: (f, s, r) => ({ trato: ok3(s), puertaOk: okm(s), tituloOk: ok2(s), fotosOk: ok2(s), aTiempo: s >= 4 ? "a" : s === 3 ? "b" : "c", sinPresion: okm(s) }),
    hechos: (f) => ({ dia: new Date(Date.UTC(2026, 10, 17) + f.d * 86400000).toISOString().slice(0, 10), que: "prueba", tot: f.det.otd_cents }),
  }),
  extras: (B, plan, h) => ({
    sql: [
      `insert into licenses (business_id, city_id, kind, title, can, cannot, issuer, registry_url, status, source, sort, checked_at, next_review)
select b.id, b.city_id, k.key, k.title, k.can, coalesce(k.cannot, '[]'::jsonb), k.issuer->>'es', k.registry_url, 'valid', 'semilla', o.n, now(), (now() + interval '3 months')::date
  from businesses b cross join lateral unnest(${TA(plan.licencias)}) with ordinality o(k, n) join license_kinds k on k.key = o.k
 where b.id = ${q(B.id)} and not exists (select 1 from licenses l where l.business_id = b.id and l.kind = k.key);`,
    ], cuenta: { vehiculos: plan.veh.length, vendidos: plan.veh.filter((v) => v.vendido).length },
  }),
  final: (ids) => `-- «dia» de cada prueba y el id de su carro salen de lo ya guardado; las licencias se refrescan con la función de la base
update operations o set details = o.details || jsonb_build_object('dia', (o.scheduled_at at time zone 'America/New_York')::date::text)
 where o.details->>'demo' = 'c' and o.details->>'cat' = 'NEG-DEALER' and not (o.details ? 'dia');
update operations o set details = o.details || jsonb_build_object('item_id', i.id::text)
  from items i where o.details->>'demo' = 'c' and o.details->>'cat' = 'NEG-DEALER' and not (o.details ? 'item_id') and i.business_id = o.business_id and i.module = 'svc' and i.name->>'es' = o.details#>>'{item,es}';
select licencias_refrescar(id) from unnest(${TA(ids)}) id;`,
};
