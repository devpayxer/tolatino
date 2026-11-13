import "server-only";
import { db } from "./db";
import type { Bi } from "./inscripciones-comun";
import {
  BODY, conInventario, kindAutosDe, lineaAutos, pctBp, usd,
  type Bhph, type CarroAuto, type EstadoCarro, type KindAutos, type Pago, type Puerta,
} from "./autos-comun";
import type { SelloPub } from "./fe-publico";

/* La ficha de Venta de Autos (Fase 4 · 4id · fase4-iglesias-inmuebles-autos.md §1c, §3 «Precio en la puerta», §4id; neg-dealer-kind.js
   faq L39–63, metaOf L101–104, btnOf L106, tabL L107, post L110–160).
   - El total en la puerta (otd_cents) y su desglose los calculó el servidor (lib/autos.ts enLaPuerta) y la base comprueba la suma; aquí
     solo se leen. Un carro sin total en la puerta no sale (guardián totalEnLaPuerta).
   - El pago de ejemplo solo sale con enganche, tasa (APR) y meses juntos (Regulation Z; la base lo exige todo o nada) y siempre con
     «estimado, sujeto a aprobación» (autos-comun pagoTexto); compre aquí pague aquí, con el total pagado (bhphTexto).
   - Un título salvage lleva siempre su línea (autos-comun notasCarro). Los sellos (dealer de PA, vendedor, venta a plazos, NMLS) salen
     solo de una licencia «valid». Una consulta indexada para hasta 40 carros, sin N+1. */
export type CarroPub = Omit<CarroAuto, "adm" | "status"> & { status: EstadoCarro };
export type SvcAutoPub = { id: string; sec: string | null; name: Bi; desc: Bi; cents: number; foto: string | null };
export type AutosPublica = {
  negocio: { id: string; nombre: string; telefono: string | null; foto: string | null; radio: number | null; casa: boolean };
  kind: KindAutos; subs: string[]; linea: Bi; pro: boolean; esp: boolean; publica: boolean;
  carros: CarroPub[]; secciones: { id: string; name: Bi }[]; servicios: SvcAutoPub[];
  fin: boolean; itin: boolean; noCredit: boolean; trade: boolean; casa: boolean; reporta: boolean; garantia: number; lot: number; taxBp: number | null;
  sellos: SelloPub[]; lic: string | null;
  booking: boolean; // 4ie: la prueba de manejo, la oferta, la precalificación y la cita se piden en la app (/n/{id}/ver).
  td?: { k: string; v: string }[]; // las columnas de la tarjeta de Hoy (las pone la página)
};
export const TOPE_CARROS_FICHA = 40;
type FilaC = Omit<CarroPub, "puerta" | "est" | "bhph"> & { price: number; taxBp: number; tax: number; tagsC: number; feeC: number; otd: number | null;
  ed: number | null; ea: number | null; em: number | null; ep: number | null; et: number | null; bd: number | null; bw: number | null; bk: number | null; bt: number | null; ba: number | null };

export async function autosPublica(negocio: string): Promise<AutosPublica | null> {
  const b = (await db().query<{ id: string; name: string; phone: string | null; foto: string | null; radio: number | null; casaB: boolean; subs: string[]; fv: string[]; ca: Record<string, any> | null; plan: string;
    off: Record<string, unknown> | null; ov: string | null; fin: boolean | null; itin: boolean | null; nc: boolean | null; trade: boolean | null; casa: boolean | null; rep: boolean | null; gar: number | null; lot: number | null; tax: number | null }>(
    `select b.id, b.name, b.phone, b.service_radius_mi as radio, b.works_from_home as "casaB", b.filter_values as fv, b.category_attrs as ca, b.modules_off as off,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            coalesce((select array_agg(sc.name->>'es' order by array_position(b.subcategory_ids, sc.id)) from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs,
            coalesce((select st.plan from business_stats_cache st where st.business_id = b.id), 'free') as plan,
            s.kind_override as ov, s.fin, s.itin, s.no_credit as nc, s.trade, s.home_test as casa, s.reports_credit as rep, s.warranty_default as gar, s.lot_total as lot,
            (select t.parts_bp from tax_rules t where t.city_id = b.city_id and t.category_id = 'NEG-DEALER' and t.effective_from <= now() order by t.effective_from desc, t.id desc limit 1) as tax
       from businesses b left join dealer_settings s on s.business_id = b.id where b.id = $1 and b.status = 'active' and b.category_id = 'NEG-DEALER'`, [negocio])).rows[0];
  if (!b) return null;
  const [C, S, I, L] = await Promise.all([
    // Solo lo que se ve: en el lote o apartado en persona, a la venta, sin ocultar por el equipo y con su total en la puerta.
    db().query<FilaC>(
      `select i.id::text, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.photos as fotos, v.vin, v.year, v.make, v.model, v.trim_level as trim, v.body, v.miles, v.engine_hours as hours,
              v.transmission as trans, v.fuel, v.drivetrain as drive, v.title, v.history_report as history, v.history_src as "historySrc", v.pa_inspection as inspeccion, v.warranty,
              v.warranty_months as "wMonths", v.warranty_miles as "wMiles", v.street_legal as street, v.cdl, v.price_cents as price, v.tax_bp as "taxBp", v.tax_cents as tax, v.tags_cents as "tagsC",
              v.doc_fee_cents as "feeC", v.otd_cents as otd, v.est_down_cents as ed, v.est_apr_bp as ea, v.est_months as em, v.est_payment_cents as ep, v.est_total_cents as et,
              v.bhph_down_cents as bd, v.bhph_week_cents as bw, v.bhph_weeks as bk, v.bhph_total_cents as bt, v.bhph_apr_bp as ba, v.status
         from vehicle_listings v join items i on i.id = v.item_id
        where v.business_id = $1 and v.status in ('lot', 'pending') and v.otd_cents is not null and i.removed_at is null and i.status = 'live' and i.sell
        order by (v.status = 'lot') desc, i.sort, i.id limit ${TOPE_CARROS_FICHA}`, [negocio]),
    db().query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, item_sections.id`, [negocio]),
    (b.off ?? {}).svc ? Promise.resolve({ rows: [] as SvcAutoPub[] }) : db().query<SvcAutoPub>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, i.photos[1] as foto
         from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra
          and coalesce(i.svc_kind, '') not in ('renta', 'venta', 'auto') order by i.sort, i.id`, [negocio]),
    db().query<SelloPub>(
      `select l.kind, k.title as titulo, l.number as numero, k.number_label as etiqueta from licenses l join license_kinds k on k.key = l.kind
        where l.business_id = $1 and l.status = 'valid' and k.category_id = 'NEG-DEALER' order by k.sort, l.id`, [negocio]),
  ]);
  const carros: CarroPub[] = C.rows.map((x) => ({
    id: x.id, name: x.name, desc: x.desc, fotos: x.fotos ?? [], vin: x.vin, year: x.year, make: x.make, model: x.model, trim: x.trim, body: x.body, miles: x.miles, hours: x.hours, trans: x.trans, fuel: x.fuel,
    drive: x.drive, title: x.title, history: x.history, historySrc: x.historySrc, inspeccion: x.inspeccion, warranty: x.warranty, wMonths: x.wMonths, wMiles: x.wMiles, street: x.street, cdl: x.cdl, status: x.status,
    puerta: { price: x.price, taxBp: x.taxBp, tax: x.tax, tags: x.tagsC, fee: x.feeC, otd: x.otd! } as Puerta,
    // El pago de ejemplo existe solo con los tres (la base lo exige todo o nada); si falta uno, no hay pago.
    est: x.ep != null && x.ed != null && x.ea != null && x.em != null ? ({ down: x.ed, aprBp: x.ea, months: x.em, pago: x.ep, total: x.et! } as Pago) : null,
    bhph: x.bt != null && x.bd != null && x.bw != null && x.bk != null && x.ba != null ? ({ down: x.bd, week: x.bw, weeks: x.bk, months: Math.round((x.bk * 12) / 52), total: x.bt, aprBp: x.ba } as Bhph) : null,
  }));
  const fv = b.fv ?? [], onb = (b.ca?.onb ?? {}) as { tool?: Record<string, unknown>; own?: Record<string, unknown> };
  const itin = b.itin ?? (fv.includes("itin") || onb.tool?.itin === true), garOnb = Number(onb.tool?.gar ?? 0), kind = kindAutosDe(b.subs, b.ov), pro = b.plan === "pro";
  const usados = new Set(I.rows.map((x) => x.sec));
  return {
    negocio: { id: b.id, nombre: b.name, telefono: b.phone, foto: b.foto, radio: b.radio, casa: b.casaB },
    kind, subs: b.subs, linea: lineaAutos(kind, pro), pro, esp: fv.includes("esp"), publica: fv.includes("publica"),
    carros, secciones: S.rows.filter((x) => usados.has(x.id)), servicios: I.rows,
    // Sin fila todavía: lo que dice hoy la página o lo que se dijo en Publica tu negocio (como herramientaAutos).
    fin: b.fin ?? (itin || onb.own?.fin === "si" || onb.own?.fin === "itin"), itin, noCredit: b.nc ?? fv.includes("sincredito"), trade: b.trade ?? (fv.includes("tradein") || onb.tool?.trade === true),
    casa: b.casa ?? fv.includes("casa"), reporta: b.rep ?? fv.includes("reporta"), garantia: b.gar ?? (garOnb === 6 ? 6 : garOnb > 0 || fv.includes("garantia") ? 3 : 0),
    lot: Math.max(b.lot ?? 0, carros.length), taxBp: b.tax, sellos: L.rows, lic: L.rows.find((x) => x.kind === "pa_dealer")?.numero ?? null, booking: true,
  };
}

const minBy = <T,>(L: T[], f: (x: T) => number) => (L.length ? L.reduce((a, c) => (f(c) < f(a) ? c : a)) : null);
export const vende = (p: Pick<AutosPublica, "kind" | "pro">) => conInventario(p.kind) && !(p.kind === "broker" && !p.pro);
const pct = (p: AutosPublica, es: boolean) => (p.taxBp != null ? (es ? pctBp(p.taxBp) : pctBp(p.taxBp).replace(" %", "%")) : es ? "impuesto" : "tax");

/* Preguntas por tipo (faq L39–63) con los datos de verdad; la de Tu página gana (lo mezcla la página). */
export function faqAutos(p: AutosPublica, es: boolean): { q: string; a: string }[] {
  const E2 = (a: string, b: string) => (es ? a : b), c0 = minBy(p.carros, (x) => x.puerta.price), nm = (x: CarroPub) => (es ? x.name.es : x.name.en || x.name.es);
  const TOT = { q: E2("¿Cuánto pago en total?", "How much do I pay in total?"), a: c0 ? E2(`El precio + ${pct(p, true)} de impuesto + placas y título ${usd(c0.puerta.tags)} + el cargo del dealer ${usd(c0.puerta.fee)}. Por ejemplo, el ${nm(c0)}: ${usd(c0.puerta.price)} → ${usd(c0.puerta.otd)} en la puerta.`, `Price + ${pct(p, false)} tax + ${usd(c0.puerta.tags)} tags and title + ${usd(c0.puerta.fee)} dealer fee. For example, the ${nm(c0)}: ${usd(c0.puerta.price)} → ${usd(c0.puerta.otd)} out the door.`)
    : E2("El precio + impuesto + placas + el cargo del dealer, antes de firmar.", "Price + tax + tags + dealer fee, before you sign.") };
  const ITIN = { q: E2("¿Puedo comprar con ITIN?", "Can I buy with ITIN?"), a: p.itin ? E2("Sí. La tasa, los meses y el enganche te los dan por escrito antes de firmar; nadie garantiza la aprobación.", "Yes. Rate, term and down payment are put in writing before you sign; no one guarantees approval.") : E2("No financian con ITIN; puedes pagar al contado o traer tu préstamo.", "No ITIN financing; you can pay cash or bring your own loan.") };
  const GAR = { q: E2("¿Tiene garantía?", "Is there a warranty?"), a: p.garantia ? E2(`Sí: ${p.garantia} meses en motor y transmisión, por escrito. Cada carro dice la suya.`, `Yes: ${p.garantia} months on engine and transmission, in writing. Each car shows its own.`) : E2("Se vende como está; pide que tu mecánico lo revise antes de comprar. Cada carro dice la suya.", "Sold as is; have your mechanic check it before buying. Each car shows its own.") };
  const TRADE = { q: E2("¿Aceptan mi carro como parte de pago?", "Do you take trade-ins?"), a: p.trade ? E2("Sí. Te dicen cuánto vale por escrito y se descuenta del precio.", "Yes. They put its value in writing and take it off the price.") : E2("No en este negocio.", "Not at this business.") };
  const TIT = { q: E2("¿El título está limpio?", "Is the title clean?"), a: E2("Cada carro dice su título y si trae historial, y de quién. Si no lo dice, pregúntalo antes de la prueba.", "Each car states its title and whether it comes with a history report, and from whom. If not, ask before the test drive.") };
  const K: Record<KindAutos, { q: string; a: string }[]> = {
    lot: [TOT, ITIN, GAR, TRADE], new: [TOT, { q: E2("¿Qué cubre la garantía de fábrica?", "What does the factory warranty cover?"), a: E2("Los nuevos traen la de fábrica; los certificados usados, la del fabricante por escrito.", "New cars carry the factory warranty; certified pre-owned, the manufacturer’s in writing.") }, ITIN, TRADE],
    lux: [TOT, { q: E2("¿Lo puede revisar mi mecánico?", "Can my mechanic inspect it?"), a: E2("Sí, antes de firmar; se recomienda en clásicos y proyectos.", "Yes, before signing; recommended on classics and projects.") }, TIT, TRADE],
    bhph: [{ q: E2("¿Piden crédito?", "Do you check credit?"), a: p.noCredit ? E2("No. Lo que piden se lleva en persona; To’Latino no consulta tu crédito.", "No. What they ask for is brought in person; To’Latino does not check your credit.") : E2("Pregunta al llamar.", "Ask when you call.") },
      { q: E2("¿Cuánto pago al final?", "What do I pay in the end?"), a: E2("Cada carro dice el enganche, el pago a la semana, cuántos pagos, la tasa y el total que pagas al final, antes de firmar.", "Each car shows the down payment, weekly payment, number of payments, rate and the total you end up paying, before you sign.") },
      { q: E2("¿Qué pasa si me atraso?", "What if I fall behind?"), a: E2("El contrato dice cuántos días tienes antes de que recojan el carro: léelo antes de firmar.", "The contract says how many days you have before they pick up the car: read it before signing.") },
      { q: E2("¿Reportan mis pagos al crédito?", "Do you report payments to credit?"), a: p.reporta ? E2("Sí; pagar a tiempo te ayuda a subir tu puntaje.", "Yes; paying on time helps your score.") : E2("No. Si quieres construir crédito, pregúntalo antes de firmar.", "No. If you want to build credit, ask before signing.") }],
    work: [TOT, { q: E2("¿Necesito licencia CDL?", "Do I need a CDL?"), a: E2("Para 26,001 libras o más, sí. Cada vehículo lo dice.", "At 26,001 lbs or more, yes. Each vehicle says it.") }, GAR, TRADE],
    moto: [TOT, { q: E2("¿Necesito licencia de moto?", "Do I need a motorcycle license?"), a: E2("En PA, sí: clase M o permiso de aprendiz. Las cuatrimotos no van por la calle.", "In PA, yes: class M or a learner’s permit. ATVs are not street legal.") }, ITIN, GAR],
    rv: [TOT, { q: E2("¿Hay que registrarlo?", "Does it need registration?"), a: E2("Sí: los botes en la PA Fish & Boat Commission y las casas rodantes en PennDOT.", "Yes: boats with the PA Fish & Boat Commission and RVs with PennDOT.") }, { q: E2("¿Lo puedo probar?", "Can I try it?"), a: E2("Sí, con cita; la prueba es gratis.", "Yes, by appointment; the test is free.") }, ITIN],
    salv: [{ q: E2("¿Qué es un título salvage?", "What is a salvage title?"), a: E2("El seguro lo declaró pérdida total. Título salvage: no se maneja en la calle hasta pasar la inspección de PA. Reconstruido = ya la pasó.", "Insurance declared it a total loss. Salvage title: it cannot be driven on the street until it passes PA inspection. Rebuilt = it already passed.") },
      { q: E2("¿Lo puedo asegurar?", "Can I insure it?"), a: E2("El reconstruido sí; el salvage no se maneja en la calle hasta pasar la inspección.", "Rebuilt yes; salvage cannot be driven until it passes inspection.") }, { q: E2("¿Lo revisa mi mecánico?", "Can my mechanic check it?"), a: E2("Sí, antes de firmar.", "Yes, before signing.") }, TOT],
    mayor: [{ q: E2("¿Puedo comprar sin licencia de dealer?", "Can I buy without a dealer license?"), a: E2("En la subasta pública, sí. La venta mayorista es solo para dealers con licencia.", "At the public auction, yes. Wholesale is for licensed dealers only.") },
      { q: E2("¿Cuánto cobran?", "What do you charge?"), a: E2("La tarifa del comprador se dice antes de pujar.", "The buyer fee is stated before bidding.") }, { q: E2("¿Puedo ver el carro antes?", "Can I see the car first?"), a: E2("Pregunta al llamar; en To’Latino no se puja ni se aparta nada.", "Ask when you call; nothing is bid on or held on To’Latino.") }],
    broker: [{ q: E2("¿Cuánto cobran?", "What do you charge?"), a: E2("Una tarifa fija por escrito, nunca un porcentaje escondido.", "A flat fee in writing, never a hidden percentage.") },
      { q: E2("¿Es seguro comprarle a un dueño?", "Is buying from an owner safe?"), a: E2("Nunca pagues antes de ver el carro y el título a nombre del que vende.", "Never pay before seeing the car and the title in the seller’s name.") }, TIT, TOT],
    cash: [{ q: E2("¿Cuánto me dan?", "How much will you pay?"), a: E2("La oferta es gratis y por escrito, después de ver el carro.", "The offer is free and in writing, after seeing the car.") },
      { q: E2("¿Qué necesito?", "What do I need?"), a: E2("El título a tu nombre y tu identificación, en persona.", "The title in your name and your ID, in person.") },
      { q: E2("¿Lo recogen?", "Do you pick it up?"), a: p.negocio.radio ? E2(`Sí, hasta ${p.negocio.radio} millas; nadie te cobra por la grúa.`, `Yes, up to ${p.negocio.radio} miles; nobody charges you for the tow.`) : E2("Pregunta al llamar.", "Ask when you call.") }],
    placas: [{ q: E2("¿Qué papeles traigo?", "What papers do I bring?"), a: E2("El título firmado, tu identificación, prueba de seguro de PA y la inspección si aplica.", "Signed title, your ID, PA proof of insurance and inspection if needed.") },
      { q: E2("¿Cuánto cuesta?", "How much is it?"), a: E2("Lo de PennDOT más la tarifa de la oficina; se dice todo antes.", "PennDOT fees plus the office fee; all stated up front.") }],
    fin: [{ q: E2("¿Me garantizan la aprobación?", "Is approval guaranteed?"), a: E2("No. Nadie puede garantizarla antes de ver tus papeles.", "No. No one can guarantee it before seeing your papers.") },
      { q: E2("¿Qué es el GAP?", "What is GAP?"), a: E2("Paga lo que aún debes si chocas y el seguro da menos de lo que vale el préstamo. No es obligatorio.", "It pays what you still owe if you crash and insurance pays less than the loan. Not required.") },
      { q: E2("¿La garantía extendida es obligatoria?", "Is the extended warranty required?"), a: E2("No. Nadie te puede obligar a comprarla para darte el préstamo.", "No. No one can make you buy it to get the loan.") }, ITIN],
    taller: [{ q: E2("¿Tengo que haber comprado aquí?", "Did I have to buy here?"), a: E2("Pregunta al llamar.", "Ask when you call.") }, { q: E2("¿Me dan el presupuesto antes?", "Do I get an estimate first?"), a: E2("Sí, el total por escrito antes de empezar.", "Yes, the written total before work starts.") }],
    envio: [{ q: E2("¿Qué papeles necesito?", "What papers do I need?"), a: E2("El título original, limpio y a tu nombre.", "The original clean title in your name.") }, { q: E2("¿Puedo meter cosas dentro?", "Can I pack things inside?"), a: E2("No: la naviera y la aduana no lo permiten.", "No: the shipping line and customs do not allow it.") }],
  };
  return (K[p.kind] ?? K.lot).slice(0, 4);
}

/* La tarjeta de Hoy por tipo (post L124–135). Nunca un enganche o un pago sueltos (Regulation Z): el plan completo va en la frase. */
export function hoyAutos(p: AutosPublica, es: boolean, hoy: string) {
  const E2 = (a: string, b: string) => (es ? a : b), k = p.kind, b = (t: Bi) => (es ? t.es : t.en);
  const c0 = minBy(p.carros, (x) => x.puerta.otd), sMin = minBy(p.servicios.filter((x) => x.cents > 0), (x) => x.cents), idi = p.esp ? E2("Español", "Spanish") : E2("Inglés", "English");
  const DOOR = c0 ? { k: E2("EN LA PUERTA", "OUT THE DOOR"), v: `${E2("Desde", "From")} ${usd(c0.puerta.otd)}` } : { k: E2("PRECIO", "PRICE"), v: E2("Pregunta", "Ask") };
  const ITC = { k: E2("CON ITIN", "WITH ITIN"), v: p.itin ? E2("Sí · tasa y meses por escrito", "Yes · rate and term in writing") : "No" };
  const GRC = { k: E2("GARANTÍA", "WARRANTY"), v: p.garantia ? E2(`${p.garantia} meses`, `${p.garantia} months`) : p.carros.some((x) => x.warranty !== "como_esta") ? E2("Lo dice cada carro", "Each car says") : E2("Se vende como está", "Sold as is") };
  const limpios = p.carros.length > 0 && p.carros.every((x) => x.title === "limpio");
  const cols: { k: string; v: string }[] = k === "bhph" ? [DOOR, { k: E2("PLAN", "PLAN"), v: E2("Total pagado por escrito", "Total paid in writing") }, { k: E2("CRÉDITO", "CREDIT"), v: p.noCredit ? E2("No lo piden", "Not required") : E2("Pregunta", "Ask") }]
    : k === "fin" ? [{ k: E2("PRECALIFICACIÓN", "PRE-QUALIFICATION"), v: E2("Gratis", "Free") }, ITC, { k: E2("IDIOMA", "LANGUAGE"), v: idi }]
    : k === "salv" ? [DOOR, { k: E2("TÍTULO", "TITLE"), v: E2("Salvage o reconstruido", "Salvage or rebuilt") }, GRC]
    : k === "mayor" ? [{ k: E2("PRÓXIMA SUBASTA", "NEXT AUCTION"), v: E2("Pregunta", "Ask") }, { k: E2("TARIFA", "FEE"), v: sMin ? `${E2("Desde", "From")} ${usd(sMin.cents)}` : E2("Antes de pujar", "Before bidding") }, { k: E2("ABIERTA", "OPEN TO"), v: p.publica ? E2("Al público", "The public") : E2("Pregunta", "Ask") }]
    : vende(p) ? [DOOR, k === "work" || k === "rv" || k === "lux" || k === "broker" || k === "moto" ? { k: E2("TÍTULO", "TITLE"), v: limpios ? E2("Limpio", "Clean") : E2("Lo dice cada carro", "Each car says") } : ITC, GRC]
    : k === "cash" || k === "broker" ? [{ k: E2("OFERTA", "OFFER"), v: E2("Gratis, por escrito", "Free, in writing") }, p.negocio.radio ? { k: E2("VA HASTA", "GOES UP TO"), v: `${p.negocio.radio} mi` } : { k: E2("HOY", "TODAY"), v: hoy }, { k: E2("IDIOMA", "LANGUAGE"), v: idi }]
    : [{ k: E2("PRECIO", "PRICE"), v: sMin ? `${E2("Desde", "From")} ${usd(sMin.cents)}` : E2("Pregunta", "Ask") }, { k: E2("HOY", "TODAY"), v: hoy }, { k: E2("IDIOMA", "LANGUAGE"), v: idi }];
  const sub = !p.pro ? E2("Llama o pasa para ver el carro o pedir la cita. ", "Call or stop by to see the car or book. ")
    : vende(p) ? E2("La prueba de manejo es gratis; te confirman la hora y el carro te espera. ", "The test drive is free; they confirm the time and the car waits for you. ")
    : k === "cash" ? E2("Te llaman para ver el carro. ", "They call to see the car. ") : "";
  return { cols, sub: `${sub}${b(p.linea)}` };
}
export const cuerpo = (b: CarroPub, es: boolean) => (es ? BODY[b.body].es : BODY[b.body].en);
