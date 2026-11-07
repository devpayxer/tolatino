/* Venta de Autos (Fase 4 · 4ic · fase4-iglesias-inmuebles-autos.md §1c, §2 «0093», §3, §4ic y §5). Tipos, textos y formatos que también
   usa el navegador. Sin consultas ni cuentas de dinero: el total en la puerta, el pago de ejemplo y el total de compre aquí pague aquí los
   calcula el servidor (lib/autos.ts) y aquí solo se escriben con sus palabras (siempre con tasa, meses y enganche; siempre «estimado»).
   Tipos de negocio por subcategoría (neg-dealer-kind.js KS L9–14; el prototipo recorre las subcategorías en su orden): venden lot · new ·
   bhph · work · moto · rv · lux · salv · mayor · broker; servicios cash · placas · fin · taller · envio. */
import type { Bi } from "./inscripciones-comun";

export type { Bi };
export type KindAutos = "lot" | "new" | "bhph" | "work" | "moto" | "rv" | "lux" | "salv" | "mayor" | "broker" | "cash" | "placas" | "fin" | "taller" | "envio";
export const KINDS_AUTOS: KindAutos[] = ["lot", "new", "bhph", "work", "moto", "rv", "lux", "salv", "mayor", "broker", "cash", "placas", "fin", "taller", "envio"];
export const KS_AUTOS: [string, KindAutos][] = [["Compre aquí pague aquí", "bhph"], ["Sin crédito", "bhph"], ["Agencia de autos nuevos", "new"], ["Certificados usados", "new"], ["Lote de autos usados", "lot"], ["Lote independiente", "lot"],
  ["Camionetas y pickups", "lot"], ["SUVs", "lot"], ["Vans y minivans", "lot"], ["Prueba y entrega a domicilio", "lot"], ["Vehículos de trabajo", "work"], ["Venta a flotas", "work"], ["Camiones de caja", "work"], ["Tráileres", "work"], ["Remolques", "work"],
  ["Motocicletas", "moto"], ["Cuatrimotos", "moto"], ["Scooters", "moto"], ["Botes y motos acuáticas", "rv"], ["Casas rodantes", "rv"], ["Carritos de golf", "rv"], ["Autos de lujo", "lux"], ["Clásicos y proyectos", "lux"],
  ["Título salvage y reconstruido", "salv"], ["Subasta de autos", "mayor"], ["Distribuidor mayorista", "mayor"], ["Broker y buscador de autos", "broker"], ["Venta en consignación", "broker"], ["Venta por dueño", "broker"],
  ["Compra de autos en efectivo", "cash"], ["Cambio y avalúo", "cash"], ["Placas, título y registro", "placas"], ["Financiamiento con ITIN", "fin"], ["Financiamiento para primer comprador", "fin"], ["Financiamiento del dealer", "fin"], ["Garantía extendida", "fin"], ["Seguro y GAP", "fin"],
  ["Taller del dealer", "taller"], ["Exportación y envío de vehículos", "envio"]];
/* kind(b) del prototipo: el tipo forzado gana; si no, la primera subcategoría (en su orden) que tenga tipo; si ninguna, lot. */
export const kindAutosDe = (subs: string[], override?: string | null): KindAutos =>
  override && (KINDS_AUTOS as string[]).includes(override) ? (override as KindAutos) : subs.map((s) => KS_AUTOS.find((k) => k[0] === s)?.[1]).find((k): k is KindAutos => !!k) ?? "lot";
/* Los que publican vehículos con su total en la puerta. La subasta y el mayorista quedan en directorio y contacto (§6 #20); compra en
   efectivo, placas, financiamiento, taller y envío van en Servicios (la gente pide cita o llama). */
export const conInventario = (k: KindAutos) => ["lot", "new", "bhph", "work", "moto", "rv", "lux", "salv", "broker"].includes(k);

/* La carrocería de cada vehículo: si lleva millaje (los botes llevan horas de motor) y si va por la calle de fábrica. */
export type Body = "carro" | "suv" | "van" | "pickup" | "trabajo" | "caja" | "trailer" | "remolque" | "moto" | "cuatrimoto" | "scooter" | "bote" | "rv" | "golf";
export const BODY: Record<Body, { es: string; en: string; millas: boolean; calle: boolean }> = {
  carro: { es: "Carro", en: "Car", millas: true, calle: true }, suv: { es: "SUV", en: "SUV", millas: true, calle: true }, van: { es: "Van o minivan", en: "Van or minivan", millas: true, calle: true },
  pickup: { es: "Pickup", en: "Pickup", millas: true, calle: true }, trabajo: { es: "Van de trabajo", en: "Work van", millas: true, calle: true }, caja: { es: "Camión de caja", en: "Box truck", millas: true, calle: true },
  trailer: { es: "Tráiler", en: "Semi trailer", millas: false, calle: true }, remolque: { es: "Remolque", en: "Trailer", millas: false, calle: true },
  moto: { es: "Moto", en: "Motorcycle", millas: true, calle: true }, cuatrimoto: { es: "Cuatrimoto", en: "ATV", millas: false, calle: false }, scooter: { es: "Scooter", en: "Scooter", millas: true, calle: true },
  bote: { es: "Bote", en: "Boat", millas: false, calle: false }, rv: { es: "Casa rodante o camper", en: "RV or camper", millas: false, calle: true }, golf: { es: "Carrito de golf", en: "Golf cart", millas: false, calle: false },
};
export const BODIES = Object.keys(BODY) as Body[];
export const pideMillas = (b: Body) => ["carro", "suv", "van", "pickup", "trabajo", "caja", "moto", "scooter"].includes(b);
export const sinVin = (b: Body, year: number) => b === "bote" || b === "golf" || year < 1981;
export const conCdl = (b: Body) => b === "trabajo" || b === "caja" || b === "trailer" || b === "remolque";
export type Trans = "automatica" | "manual" | "cvt";
export const TRANS: [Trans, string, string][] = [["automatica", "Automática", "Automatic"], ["manual", "Manual", "Manual"], ["cvt", "CVT", "CVT"]];
export type Fuel = "gasolina" | "diesel" | "hibrido" | "electrico" | "enchufable" | "flex";
export const FUEL: [Fuel, string, string][] = [["gasolina", "Gasolina", "Gas"], ["diesel", "Diésel", "Diesel"], ["hibrido", "Híbrido", "Hybrid"], ["electrico", "Eléctrico", "Electric"], ["enchufable", "Híbrido enchufable", "Plug-in hybrid"], ["flex", "Flex", "Flex fuel"]];
export type Drive = "fwd" | "rwd" | "awd" | "4x4";
export const DRIVE: [Drive, string, string][] = [["fwd", "Delantera", "FWD"], ["rwd", "Trasera", "RWD"], ["awd", "AWD", "AWD"], ["4x4", "4x4", "4x4"]];
export type Titulo = "limpio" | "reconstruido" | "salvage";
export const TITULO: Record<Titulo, [string, string]> = { limpio: ["Título limpio", "Clean title"], reconstruido: ["Título reconstruido", "Rebuilt title"], salvage: ["Título salvage", "Salvage title"] };
export type Garantia = "como_esta" | "dealer" | "fabrica" | "certificado";
export const GARANTIA: Record<Garantia, [string, string]> = { como_esta: ["Se vende como está", "Sold as is"], dealer: ["Garantía del dealer", "Dealer warranty"], fabrica: ["Garantía de fábrica", "Factory warranty"], certificado: ["Certificado del fabricante", "Manufacturer certified"] };
export type EstadoCarro = "lot" | "pending" | "sold" | "hidden";
export const ESTADO_CARRO: Record<EstadoCarro, [string, string]> = { lot: ["En el lote", "On the lot"], pending: ["Apartado en persona", "Held in person"], sold: ["Vendido", "Sold"], hidden: ["Oculto", "Hidden"] };
export const visibleCarro = (s: EstadoCarro) => s === "lot" || s === "pending";
export const MESES_PAGO = [12, 24, 36, 48, 60, 72] as const;
export const MESES_BHPH = [12, 18, 24, 36] as const;
export const GARANTIAS_DEALER = [0, 3, 6] as const;
export const TOPE_CARROS_FREE = 5;

/* Líneas fijas (§1c, verbatim; nunca se suavizan) y por tipo (neg-dealer-kind.js LINE L29–36). */
export const LINEA_AUTOS: Bi = { es: "El precio en la puerta: con impuestos, placas y cargos del dealer, antes de firmar.", en: "The out-the-door price: with taxes, tags and dealer fees, before you sign." };
export const LINEA_AUTOS_SUB: Bi = { es: "Cada carro dice millaje, título, historial y el total en la puerta. El pago al mes siempre con la tasa y los meses.", en: "Each car shows mileage, title, history and the out-the-door total. Monthly payments always with the rate and term." };
export const LINEA_BHPH: Bi = { es: "El enganche, el pago y el total que pagas al final se dan por escrito antes de firmar.", en: "Down payment, payment and the total you end up paying are put in writing before you sign." };
export const LINEA_FIN: Bi = { es: "La tasa, los meses y el total que pagas se dan por escrito; nadie garantiza la aprobación.", en: "Rate, term and total paid are put in writing; no one guarantees approval." };
export const LINEA_BROKER: Bi = { es: "La tarifa es fija y por escrito; nunca pagues antes de ver el carro y el título.", en: "The fee is flat and in writing; never pay before seeing the car and the title." };
export const LINEA_CASH: Bi = { es: "La oferta es gratis, por escrito y después de ver el carro; nadie te cobra por la grúa.", en: "The offer is free, in writing and after seeing the car; nobody charges you for the tow." };
export const LINEA_PLACAS: Bi = { es: "Lo de PennDOT y la tarifa de la oficina se dicen antes de empezar.", en: "PennDOT fees and the office fee are stated before starting." };
export const LINEA_TALLER: Bi = { es: "El precio es el total por escrito antes de empezar.", en: "The price is the written total before starting." };
export const LINEA_MAYOR: Bi = { es: "La tarifa del comprador y el total se dicen antes de pujar.", en: "The buyer fee and the total are stated before you bid." };
export function lineaAutos(k: KindAutos, pro: boolean): Bi {
  return k === "cash" ? LINEA_CASH : k === "placas" ? LINEA_PLACAS : k === "fin" ? LINEA_FIN : k === "taller" || k === "envio" ? LINEA_TALLER : k === "bhph" ? LINEA_BHPH
    : k === "broker" && !pro ? LINEA_BROKER : k === "mayor" ? LINEA_MAYOR : LINEA_AUTOS;
}
/* Un título salvage dice SIEMPRE esto (faq L55; guardián totalEnLaPuerta/salvage): en el panel, la ficha, la hoja y la revisión. */
export const SALVAGE: Bi = { es: "Título salvage: no se maneja en la calle hasta pasar la inspección de PA.", en: "Salvage title: it cannot be driven on the street until it passes PA inspection." };
export const RECONSTRUIDO: Bi = { es: "Título reconstruido: ya pasó la inspección de PA y se puede manejar.", en: "Rebuilt title: it passed PA inspection and can be driven." };
/* La garantía extendida y el GAP (L37–38, faq L60): siempre «No es obligatoria». */
export const NO_OBLIGATORIA: Bi = { es: "La garantía extendida y el GAP no son obligatorios: nadie te los puede exigir para darte el préstamo.", en: "Extended warranty and GAP are not required: no one can make you buy them to get the loan." };
export const esExtraFinanciero = (nombre: string) => /garant[ií]a extendida|extended warranty|\bgap\b/i.test(nombre);
/* «Como está» y la garantía tienen que coincidir con la Buyers Guide de la ventana (FTC Used Car Rule). */
export const BUYERS_GUIDE: Bi = { es: "Lo que digas de la garantía tiene que ser lo mismo que la Buyers Guide de la ventana del carro.", en: "What you say about the warranty must match the Buyers Guide on the car’s window." };
export const PARABRISAS: Bi = { es: "Tómale foto al precio del parabrisas", en: "Snap the windshield price" };
/* To'Latino no consulta crédito, no da préstamos y no garantiza la aprobación (§3). */
export const SIN_GARANTIA: Bi = { es: "To’Latino no consulta tu crédito, no da préstamos y nadie garantiza la aprobación.", en: "To’Latino does not check your credit, make loans or guarantee approval." };

/* Dinero en palabras (los montos ya vienen del servidor). */
export const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
export const pctBp = (bp: number) => `${(bp / 100).toFixed(2).replace(/\.?0+$/, "")} %`;
/* El total en la puerta con su desglose, tal como lo devolvió el servidor. */
export type Puerta = { price: number; taxBp: number; tax: number; tags: number; fee: number; otd: number };
export function puertaTexto(d: Puerta, es: boolean) {
  return es ? `En la puerta: ${usd(d.price)} + impuesto ${pctBp(d.taxBp)} ${usd(d.tax)} + placas y título ${usd(d.tags)} + cargo del dealer ${usd(d.fee)} = ${usd(d.otd)}`
    : `Out the door: ${usd(d.price)} + ${pctBp(d.taxBp).replace(" %", "%")} tax ${usd(d.tax)} + tags and title ${usd(d.tags)} + dealer fee ${usd(d.fee)} = ${usd(d.otd)}`;
}
/* El pago de ejemplo (Regulation Z): con enganche, meses y tasa juntos, y siempre «estimado, sujeto a aprobación». Sin los tres, nada. */
export type Pago = { down: number; aprBp: number; months: number; pago: number; total: number };
export function pagoTexto(p: Pago | null, es: boolean) {
  if (!p || p.down == null || p.aprBp == null || !p.months || !p.pago) return "";
  return es ? `Pago de ejemplo: ${usd(p.pago)} al mes con ${usd(p.down)} de enganche, ${p.months} meses al ${pctBp(p.aprBp)} APR (estimado, sujeto a aprobación)`
    : `Example payment: ${usd(p.pago)} a month with ${usd(p.down)} down, ${p.months} months at ${pctBp(p.aprBp).replace(" %", "%")} APR (estimated, subject to approval)`;
}
export const totalPagoTexto = (p: Pago, es: boolean) => (es ? `Total de enganche y pagos: ${usd(p.total)} (estimado)` : `Total of down payment and payments: ${usd(p.total)} (estimated)`);
/* Compre aquí pague aquí: enganche + pago a la semana × semanas = total pagado, con la tasa que resulta (L47, L222). */
export type Bhph = { down: number; week: number; weeks: number; months: number; total: number; aprBp: number };
export function bhphTexto(b: Bhph | null, es: boolean) {
  if (!b || b.down == null || !b.week || !b.weeks || b.aprBp == null) return "";
  return es ? `Sin crédito: ${usd(b.down)} de enganche y ${usd(b.week)} a la semana por ${b.months} meses (${b.weeks} pagos). Total pagado: ${usd(b.total)} · ${pctBp(b.aprBp)} APR (estimado, sujeto a aprobación)`
    : `No credit: ${usd(b.down)} down and ${usd(b.week)} a week for ${b.months} months (${b.weeks} payments). Total paid: ${usd(b.total)} · ${pctBp(b.aprBp).replace(" %", "%")} APR (estimated, subject to approval)`;
}

/* REGLAS · NO SE APAGAN (L443). El porcentaje es el de la ciudad (tax_rules), nunca escrito a mano. */
export function reglasAutos(k: KindAutos, taxBp: number): [Bi, Bi][] {
  const R: [Bi, Bi][] = [[{ es: "Total en la puerta antes de firmar", en: "Door total before signing" }, { es: `Precio + ${pctBp(taxBp)} + placas + cargo del dealer.`, en: `Price + ${pctBp(taxBp).replace(" %", "%")} + plates + dealer fee.` }],
    [{ es: "Con ITIN: tasa y meses por escrito", en: "With ITIN: rate and term in writing" }, { es: "Antes de la prueba de manejo, nada se cobra.", en: "Nothing is charged before the test drive." }]];
  if (k === "bhph") R[1] = [{ es: "El total pagado, por escrito", en: "The total paid, in writing" }, { es: "Enganche, pago y semanas antes de firmar. Antes de la prueba de manejo, nada se cobra.", en: "Down payment, payment and weeks before signing. Nothing is charged before the test drive." }];
  return R;
}

/* Lo que se dice de cada vehículo debajo de su nombre (máx. 4). Un título salvage lleva SIEMPRE su línea (guardián totalEnLaPuerta). */
export function notasCarro(x: Pick<CarroAuto, "title" | "street" | "body" | "cdl" | "warranty" | "wMonths" | "wMiles" | "history" | "historySrc">, es: boolean): string[] {
  const b = (t: Bi) => (es ? t.es : t.en);
  const L: string[] = [];
  if (x.title === "salvage") L.push(b(SALVAGE));
  else if (x.title === "reconstruido") L.push(b(RECONSTRUIDO));
  if (!x.street && x.title !== "salvage") L.push(es ? "No va por la calle." : "Not street legal.");
  if (x.cdl) L.push(es ? "Necesitas licencia CDL (26,001 libras o más)." : "You need a CDL (26,001 lbs or more).");
  else if (x.body === "moto" || x.body === "scooter") L.push(es ? "Necesitas licencia clase M o permiso de aprendiz." : "You need a class M license or learner’s permit.");
  L.push(garantiaTexto(x, es));
  if (x.history) L.push(es ? `Historial del carro${x.historySrc ? ` (${x.historySrc})` : ""}: lo da el dealer.` : `Vehicle history${x.historySrc ? ` (${x.historySrc})` : ""}: provided by the dealer.`);
  return L.slice(0, 4);
}
export function garantiaTexto(x: Pick<CarroAuto, "warranty" | "wMonths" | "wMiles">, es: boolean) {
  if (x.warranty === "como_esta" || !x.wMonths) return es ? "Se vende como está: pide que tu mecánico lo revise antes de firmar." : "Sold as is: have your mechanic check it before signing.";
  const m = x.wMonths, mi = x.wMiles ? x.wMiles.toLocaleString("en-US") : null;
  const t = m % 12 === 0 && m >= 24 ? (es ? `${m / 12} años` : `${m / 12} years`) : es ? `${m} ${m === 1 ? "mes" : "meses"}` : `${m} ${m === 1 ? "month" : "months"}`;
  const que = es ? GARANTIA[x.warranty][0] : GARANTIA[x.warranty][1];
  return `${que}: ${t}${mi ? (es ? ` o ${mi} millas` : ` or ${mi} miles`) : ""}${es ? ", por escrito." : ", in writing."}`;
}

/* ── VIN: 17 caracteres sin I, O ni Q y el dígito verificador (posición 9). La misma cuenta que vin_valido() de la base (0093). ── */
const VIN_PESOS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const VIN_LETRAS = "ABCDEFGHJKLMNPRSTUVWXYZ", VIN_VALORES = "12345678123457923456789";
export function vinValido(v: string): boolean {
  if (typeof v !== "string" || !/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) return false;
  let s = 0;
  for (let i = 0; i < 17; i++) { const ch = v[i]!; const n = /[0-9]/.test(ch) ? Number(ch) : Number(VIN_VALORES[VIN_LETRAS.indexOf(ch)]); s += n * VIN_PESOS[i]!; }
  const r = s % 11;
  return v[8] === (r === 10 ? "X" : String(r));
}
export const limpiarVin = (v: string) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);
/* El año del modelo sale de la letra 10 (ciclo de 30 años): la más reciente que no pase del año que viene. */
const VIN_ANIO = "ABCDEFGHJKLMNPRSTVWXY123456789";
export function anioDeVin(v: string, hoy: number): number | null {
  const i = VIN_ANIO.indexOf(v[9] ?? "");
  if (i < 0) return null;
  const L = [1980 + i, 2010 + i, 2040 + i].filter((y) => y <= hoy + 1);
  return L.length ? L[L.length - 1]! : null;
}
export const anioCoincide = (v: string, year: number) => year < 1981 || VIN_ANIO.indexOf(v[9] ?? "") === (((year - 1980) % 30) + 30) % 30;
/* La marca por el fabricante (los 3 primeros), sin servicio externo (§6 #11): solo una ayuda para llenar; el dealer la corrige. */
const WMI: [RegExp, string][] = [[/^(1HG|2HG|JHM|5FN|5J6|19X|SHH|19U|JH2|1HF)/, "Honda"], [/^(4T1|4T3|JT|2T1|2T3|5TD|5TF|5YF|3TM|4T4)/, "Toyota"], [/^(1FA|1FT|1FM|1FD|3FA|1FB|1FC|3FT|NM0)/, "Ford"],
  [/^(1GC|1G1|2G1|3GC|1GN|3GN|1GB|KL7)/, "Chevrolet"], [/^(1GT|3GT|1GK|2GT)/, "GMC"], [/^(1N4|1N6|JN1|JN8|5N1|3N1|3N6)/, "Nissan"], [/^(KMH|5NP|KM8)/, "Hyundai"], [/^(KNA|KND|5XY|KNM)/, "Kia"],
  [/^(1VW|3VW|WVW|WVG)/, "Volkswagen"], [/^(JM1|JM3|3MZ)/, "Mazda"], [/^(JF1|JF2|4S3|4S4)/, "Subaru"], [/^(1C4|1J4|1J8|3C4)/, "Jeep"], [/^(1C6|3C6|3D7)/, "Ram"], [/^(ZAM)/, "Maserati"],
  [/^(1G6)/, "Cadillac"], [/^(WBA|WBS|5UX)/, "BMW"], [/^(WDD|WDB|4JG|W1K)/, "Mercedes-Benz"], [/^(5YJ|7SA)/, "Tesla"], [/^(JAL|JAA|54D)/, "Isuzu"], [/^(JYA|JY4)/, "Yamaha"], [/^(JKA|JKB)/, "Kawasaki"], [/^(JS1|JS2)/, "Suzuki"]];
export const marcaDeVin = (v: string) => WMI.find(([re]) => re.test(v))?.[1] ?? null;

export const nombreCarro = (year: number, make: string, model: string, trim: string | null) => `${year} ${make} ${model}${trim ? ` ${trim}` : ""}`.replace(/\s+/g, " ").trim().slice(0, 60);

/* Lo que ve el panel (lo arma lib/autos.ts; los montos ya vienen calculados del servidor). */
export type CarroAuto = {
  id: string; name: Bi; desc: Bi; fotos: string[]; vin: string | null; year: number; make: string; model: string; trim: string | null; body: Body;
  miles: number | null; hours: number | null; trans: Trans | null; fuel: Fuel | null; drive: Drive | null; title: Titulo; history: boolean; historySrc: string | null; inspeccion: boolean;
  warranty: Garantia; wMonths: number | null; wMiles: number | null; street: boolean; cdl: boolean;
  puerta: Puerta; est: Pago | null; bhph: Bhph | null; status: EstadoCarro; adm: string | null;
};
export type HerrAutos = {
  kind: KindAutos; forzado: boolean; subs: string[]; pro: boolean; carros: CarroAuto[];
  fin: boolean; itin: boolean; noCredit: boolean; itinDown: number; aprBp: number | null; termM: number | null; trade: boolean; casa: boolean; reporta: boolean; garantia: number;
  fee: number; tags: number; tope: number; taxBp: number | null; lot: number; vendidos30: number; bhphDown: number; bhphWeek: number; bhphMonths: number; lic: string | null;
  // 4ie · Horas de prueba de manejo «cualquier carro» (patrón semanal → 14 días adelante) y cuántas siguen abiertas.
  prueba: { pattern: { dow: number; min: number; on: boolean }[]; cupo: number; horas: number };
};

export function tituloAutos(h: Pick<HerrAutos, "kind">, es: boolean) { return conInventario(h.kind) ? (es ? "Inventario del lote" : "Lot inventory") : es ? "Tu herramienta" : "Your tool"; }
const vivos = (h: HerrAutos) => h.carros.filter((x) => visibleCarro(x.status) && x.adm == null);
/* summary L321: «36 en el lote · 2 vendidos · ITIN desde $1,500 · garantía 3 meses · cargo del dealer $399». */
export function resumenAutos(h: HerrAutos, es: boolean) {
  if (!conInventario(h.kind)) return es ? "Lo tuyo va en Servicios: la gente pide cita o llama" : "Yours goes in Services: people book or call";
  const n = Math.max(h.lot, vivos(h).length), v = h.vendidos30;
  return [`${n} ${es ? "en el lote" : "on the lot"}`, v ? (es ? `${v} ${v === 1 ? "vendido" : "vendidos"}` : `${v} sold`) : "",
    h.kind === "bhph" ? `${es ? "enganche" : "down"} ${usd(h.bhphDown)} + ${usd(h.bhphWeek)}${es ? "/semana" : "/week"}`
      : [h.itin ? `ITIN${es ? " desde" : " from"} ${usd(h.itinDown)}` : "", h.garantia ? (es ? `garantía ${h.garantia} meses` : `${h.garantia}-month warranty`) : es ? "como está" : "as is"].filter(Boolean).join(" · "),
    `${es ? "cargo del dealer" : "dealer fee"} ${usd(h.fee)}`].filter(Boolean).join(" · ");
}
