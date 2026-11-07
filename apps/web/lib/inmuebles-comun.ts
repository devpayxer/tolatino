/* Bienes Raíces (Fase 4 · 4ib · fase4-iglesias-inmuebles-autos.md §1c, §2 «0092», §3, §4ib y §5). Tipos y textos que también usa el
   navegador (sin consultas ni cuentas de dinero: «Para mudarte» y la cuota estimada los calcula el servidor en lib/inmuebles.ts).
   Tipos de negocio por subcategoría (neg-inm-kind.js KS L9–17; el prototipo recorre las subcategorías en su orden): rent · cuarto ·
   venta · hipo · serv · derechos · comercial · alm. Cada propiedad tiene su tipo (property_listings.kind) y es de renta o de venta. */
import { DIA_FE, horaFe } from "./fe-comun";
import type { Bi } from "./inscripciones-comun";

export type { Bi };
export type KindInm = "rent" | "cuarto" | "venta" | "hipo" | "serv" | "derechos" | "comercial" | "alm";
export const KINDS_INM: KindInm[] = ["rent", "cuarto", "venta", "hipo", "serv", "derechos", "comercial", "alm"];
export const KS_INM: [string, KindInm][] = [["Cuartos en renta", "cuarto"], ["Vivienda compartida", "cuarto"],
  ["Apartamentos en renta", "rent"], ["Casas en renta", "rent"], ["Renta corta y amueblada", "rent"], ["Section 8 y vivienda accesible", "rent"], ["Vivienda para adultos mayores", "rent"], ["Renta con opción a compra", "rent"],
  ["Hipoteca con ITIN o sin crédito", "hipo"], ["Precalificación hipotecaria", "hipo"], ["Ayuda con el enganche", "hipo"],
  ["Ayuda y derechos del inquilino", "derechos"], ["Ayuda con desalojo", "derechos"],
  ["Bodegas de almacenamiento", "alm"], ["Renta de estacionamiento", "alm"],
  ["Local comercial", "comercial"], ["Oficinas", "comercial"], ["Bodega industrial", "comercial"], ["Renta de cocina comercial", "comercial"], ["Renta de espacio para eventos", "comercial"], ["Propiedad comercial en venta", "comercial"],
  ["Inspección de vivienda", "serv"], ["Avalúo", "serv"], ["Título y cierre", "serv"], ["Servicios para propietarios", "serv"], ["Servicios de HOA", "serv"], ["Fotografía inmobiliaria", "serv"], ["Ambientación para venta", "serv"], ["Compradores en efectivo", "serv"], ["Ejecución hipotecaria y venta corta", "serv"], ["Grupo de inversión inmobiliaria", "serv"],
  ["Agente inmobiliario", "venta"], ["Agente bilingüe", "venta"], ["Agente del comprador", "venta"], ["Agente del vendedor", "venta"], ["Casas en venta", "venta"], ["Condominios y townhouses", "venta"], ["Obra nueva", "venta"], ["Multifamiliar e inversión", "venta"], ["Terrenos", "venta"], ["Propiedad rural", "venta"], ["Casas móviles", "venta"], ["Parques de casas móviles", "venta"], ["Programas para primer comprador", "venta"],
  ["Administración de propiedades", "rent"]];
/* kind(b) del prototipo: el tipo forzado gana; si no, la primera subcategoría (en su orden) que tenga tipo; si ninguna, rent. */
export const kindInmDe = (subs: string[], override?: string | null): KindInm =>
  override && (KINDS_INM as string[]).includes(override) ? (override as KindInm) : subs.map((s) => KS_INM.find((k) => k[0] === s)?.[1]).find((k): k is KindInm => !!k) ?? "rent";
/* Los que no publican propiedades: lo suyo va en Servicios (la gente pide cita o llama). */
export const sinPropiedades = (k: KindInm) => k === "serv" || k === "derechos";

/* El tipo de cada propiedad (property_listings.kind): si se renta, si se vende y por qué se cobra la renta. */
export type KindProp = "apto" | "casa" | "cuarto" | "compartida" | "amueblado" | "opcion" | "s8" | "mayores" | "venta_casa" | "condo" | "obra" | "multi" | "terreno" | "rural" | "movil" | "lote_movil"
  | "local" | "oficina" | "bodega" | "cocina" | "salon" | "almacen" | "parqueo";
export type Deal = "renta" | "venta";
export const PROP: Record<KindProp, { es: string; en: string; renta: boolean; venta: boolean; per?: "hora" | "fecha" }> = {
  apto: { es: "Apartamento", en: "Apartment", renta: true, venta: false }, casa: { es: "Casa", en: "House", renta: true, venta: false },
  cuarto: { es: "Cuarto", en: "Room", renta: true, venta: false }, compartida: { es: "Vivienda compartida", en: "Shared housing", renta: true, venta: false },
  amueblado: { es: "Amueblado · renta corta", en: "Furnished · short term", renta: true, venta: false }, opcion: { es: "Renta con opción a compra", en: "Rent to own", renta: true, venta: false },
  s8: { es: "Section 8", en: "Section 8", renta: true, venta: false }, mayores: { es: "Vivienda para mayores de 62", en: "Housing for 62 and over", renta: true, venta: false },
  lote_movil: { es: "Lote para casa móvil", en: "Mobile home lot", renta: true, venta: false },
  venta_casa: { es: "Casa", en: "House", renta: false, venta: true }, condo: { es: "Condominio o townhouse", en: "Condo or townhouse", renta: false, venta: true },
  obra: { es: "Obra nueva", en: "New construction", renta: false, venta: true }, multi: { es: "Multifamiliar", en: "Multifamily", renta: false, venta: true },
  terreno: { es: "Terreno", en: "Land", renta: false, venta: true }, rural: { es: "Propiedad rural", en: "Rural property", renta: false, venta: true },
  movil: { es: "Casa móvil", en: "Mobile home", renta: false, venta: true },
  local: { es: "Local comercial", en: "Storefront", renta: true, venta: true }, oficina: { es: "Oficina", en: "Office", renta: true, venta: true }, bodega: { es: "Bodega", en: "Warehouse", renta: true, venta: true },
  cocina: { es: "Cocina comercial", en: "Commercial kitchen", renta: true, venta: false, per: "hora" }, salon: { es: "Salón de eventos", en: "Event hall", renta: true, venta: false, per: "fecha" },
  almacen: { es: "Bodega de almacenaje", en: "Storage unit", renta: true, venta: false }, parqueo: { es: "Estacionamiento", en: "Parking", renta: true, venta: false },
};
export const KINDS_PROP = Object.keys(PROP) as KindProp[];
/* Cuartos y vivienda compartida: la dirección exacta solo llega al confirmar la visita (§6 #15); la ficha muestra la zona. */
export const soloZona = (k: KindProp) => k === "cuarto" || k === "compartida";
/* Con «Para mudarte» (renta al mes): todo lo de vivienda y lo comercial al mes; la cocina por hora y el salón por fecha no. */
export const alMes = (k: KindProp) => !PROP[k].per;
/* Con cuota estimada (venta de vivienda): no en terrenos ni en lo comercial. */
export const conCuota = (k: KindProp) => ["venta_casa", "condo", "obra", "multi", "rural", "movil"].includes(k);
export const porL = (k: KindProp, es: boolean) => (PROP[k].per === "hora" ? (es ? "/hora" : "/hour") : PROP[k].per === "fecha" ? (es ? "/fecha" : "/date") : es ? "/mes" : "/mo");

export type Util = "luz" | "agua" | "gas" | "internet" | "basura" | "calefaccion";
export const UTIL: [Util, string, string][] = [["luz", "Luz", "Power"], ["agua", "Agua", "Water"], ["gas", "Gas", "Gas"], ["internet", "Internet", "Internet"], ["basura", "Basura", "Trash"], ["calefaccion", "Calefacción", "Heat"]];
export type Laundry = "no" | "edificio" | "unidad";
export const LAVANDERIA: [Laundry, string, string][] = [["no", "Sin lavandería", "No laundry"], ["edificio", "En el edificio", "In the building"], ["unidad", "En la unidad", "In the unit"]];
export const ENGANCHES = [3.5, 5, 10, 15, 20] as const;
export const ENGANCHE_MIN = [3.5, 10, 15, 20] as const;
export const DIAS_PRECAL = [1, 2, 3, 5] as const;
export type EstadoProp = "available" | "pending" | "rented" | "sold" | "hidden";
export const ESTADO: Record<EstadoProp, [string, string]> = { available: ["Disponible", "Available"], pending: ["Apartada", "On hold"], rented: ["Rentada", "Rented"], sold: ["Vendida", "Sold"], hidden: ["Oculta", "Hidden"] };
export const visible = (s: EstadoProp) => s === "available" || s === "pending";

/* Líneas fijas (§1c, verbatim; nunca se suavizan). */
export const LINEA_INM: Bi = { es: "Lo que pagas para mudarte está completo aquí: nadie cobra por ver una propiedad.", en: "What you pay to move in is all here: no one charges to see a property." };
export const LINEA_INM_SUB: Bi = { es: "Cada anuncio dice renta, depósito, qué incluye y qué papeles piden. Si te cobran por ver o por la solicitud sin decirlo, repórtalo.", en: "Each listing shows rent, deposit, what is included and which papers are required. If someone charges to view or apply without saying so, report it." };
export const LINEA_HIPO: Bi = { es: "La precalificación es gratis; nadie te garantiza la aprobación antes de revisar tus papeles.", en: "Pre-qualification is free; no one can guarantee approval before reviewing your papers." };
export const LINEA_VENTA: Bi = { es: "Ver una casa es gratis; el precio, la cuota estimada y lo que pagas al cerrar se dicen antes de firmar.", en: "Viewing a home is free; the price, estimated payment and closing costs are stated before you sign." };
export const LINEA_DERECHOS: Bi = { es: "La orientación es gratis; no son abogados y nadie te pregunta tu estatus.", en: "Guidance is free; they are not lawyers and nobody asks your status." };
export const LINEA_EFECTIVO: Bi = { es: "La oferta es por escrito y sin compromiso; compárala con la de un agente antes de aceptar.", en: "The offer is in writing with no commitment; compare it with an agent’s before accepting." };
export const LINEA_SERV: Bi = { es: "El precio es el total por escrito antes de empezar.", en: "The price is the written total before work starts." };
export const LINEA_COMERCIAL: Bi = { es: "Lo que pagas al mes y el contrato completo se ven antes de firmar.", en: "What you pay per month and the full contract are shown before you sign." };
/* LINE (kind L29–35). */
export function lineaInm(k: KindInm, subs: string[]): Bi {
  return k === "hipo" ? LINEA_HIPO : k === "venta" ? LINEA_VENTA : k === "serv" && subs.includes("Compradores en efectivo") ? LINEA_EFECTIVO : k === "serv" ? LINEA_SERV
    : k === "derechos" ? LINEA_DERECHOS : k === "comercial" || k === "alm" ? LINEA_COMERCIAL : LINEA_INM;
}
/* Vivienda justa (§3): el pie de cada propiedad y la nota fija de los animales de servicio (se usan en toda propiedad que se pinta). */
export const EHO: Bi = { es: "Igualdad de oportunidad en la vivienda", en: "Equal Housing Opportunity" };
export const ANIMALES_SERVICIO: Bi = { es: "Los animales de servicio y de apoyo no son mascotas: se aceptan siempre.", en: "Service and support animals are not pets: they are always accepted." };
/* Estafas de renta (§3): la línea y la hoja lo dicen. */
export const NO_PAGUES: Bi = { es: "Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.", en: "Never pay a deposit before seeing the property and signing the lease." };
/* Lo que piden: solo QUÉ papeles. El aviso del campo (§3). */
export const SIN_NUMEROS: Bi = { es: "No escribas tu seguro social ni números de cuenta aquí.", en: "Do not type your Social Security or account numbers here." };

/* REGLAS · NO SE APAGAN (L512, L520, L533). §6 #5: con cuota de solicitud publicada, la regla dice «nada fuera de lo publicado». */
export function reglasInm(k: KindInm, softPull: boolean, nmls: string | null): [Bi, Bi][] {
  if (k === "hipo") return [[{ es: "Precalificar es gratis", en: "Pre-qualifying is free" }, softPull ? { es: "Y no afecta tu crédito.", en: "And it does not hurt your credit." } : { es: "Y no te compromete.", en: "And it does not commit you." }],
    [{ es: "Nadie garantiza la aprobación", en: "No one guarantees approval" }, { es: "Tu página lo dice siempre.", en: "Your page always says so." }],
    [{ es: "Licencia NMLS a la vista", en: "NMLS license shown" }, nmls ? { es: `NMLS ${nmls}`, en: `NMLS ${nmls}` } : { es: "Agrégala en Tu página › Licencias.", en: "Add it in Your page › Licenses." }]];
  if (k === "venta") return [[{ es: "Ver una casa es gratis", en: "Viewing is free" }, { es: "Nadie cobra por enseñarla.", en: "Nobody charges to show it." }],
    [{ es: "La cuota dice «estimada»", en: "Payment says «estimated»" }, { es: "Con impuestos y seguro; nunca como promesa.", en: "With taxes and insurance; never as a promise." }]];
  return [[{ es: "Ver la propiedad es gratis", en: "Viewing is free" }, { es: "Nadie cobra por enseñarla.", en: "Nobody charges to show it." }],
    [{ es: "Para mudarte: primer mes + depósito", en: "To move in: first month + deposit" }, { es: "Nada fuera de lo publicado.", en: "Nothing beyond what is posted." }]];
}

export const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const pctL = (p: number) => `${String(p).replace(/\.0$/, "")} %`;
/* La cuota de venta SIEMPRE dice «estimada» (guardián cuotaEstimada): toda pantalla la pinta con esta función. */
export function cuotaTexto(cents: number, pct: number | null, es: boolean) {
  return es ? `Cuota estimada ${usd(cents)} al mes${pct ? ` con ${pctL(pct)} de enganche` : ""}` : `Estimated payment ${usd(cents)} a month${pct ? ` with ${pctL(pct)} down` : ""}`;
}
export const CUOTA_NOTA: Bi = { es: "Estimada con impuestos y seguro; la real depende del préstamo.", en: "Estimated with taxes and insurance; the real one depends on the loan." };
export function mudarteTexto(p: Pick<PropInm, "rent" | "dep" | "appFee" | "fees" | "moveIn">, es: boolean) {
  if (p.moveIn == null || p.rent == null) return "";
  const partes = [usd(p.rent), `${es ? "depósito" : "deposit"} ${usd(p.dep)}`, ...(p.appFee ? [`${es ? "solicitud" : "application"} ${usd(p.appFee)}`] : []), ...p.fees.map((f) => `${es ? f.label.es : f.label.en || f.label.es} ${usd(f.cents)}`)];
  return `${es ? "Para mudarte" : "To move in"}: ${partes.join(" + ")} = ${usd(p.moveIn)}`;
}

/* Fecha corta de una fecha ISO (sin zona: la fecha ya es de la ciudad): «1 dic» / «Dec 1»; «Hoy» si es hoy. */
const MES: [string, string][] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
export function fechaInm(iso: string | null, hoy: string, es: boolean) {
  if (!iso) return "";
  if (iso <= hoy) return es ? "Hoy" : "Today";
  const [, m, d] = iso.split("-").map(Number) as [number, number, number];
  return es ? `${d} ${MES[m - 1]![0]}` : `${MES[m - 1]![1]} ${d}`;
}
export const cortoVis = (dow: number, min: number, es: boolean) => `${DIA_FE[dow]![es ? 0 : 1]} ${horaFe(min)}`;

/* Lo que ve el panel (lo arma lib/inmuebles.ts; los montos ya vienen calculados del servidor). addr solo llega al panel del negocio. */
export type VisitaPat = { dow: number; min: number; on: boolean };
export type PropInm = {
  id: string; kind: KindProp; deal: Deal; name: Bi; desc: Bi; fotos: string[];
  beds: number | null; baths: number | null; sqft: number | null;
  rent: number | null; price: number | null; dep: number; appFee: number; fees: { label: Bi; cents: number }[];
  moveIn: number | null; cuota: number | null; downPct: number | null;
  disponible: string | null; furnished: boolean; pets: boolean; s8: boolean; ssnReq: boolean; utilities: Util[]; parking: boolean; laundry: Laundry;
  papers: Bi | null; lease: Bi | null; senior: boolean; seniorSt: "none" | "review" | "ok" | "rejected";
  addr: string | null; zip: string | null; ubicada: boolean; addrPublic: boolean;
  status: EstadoProp; adm: string | null; visitas: VisitaPat[]; cupo: number; horas: number;
};
export type HerrInm = {
  kind: KindInm; forzado: boolean; subs: string[]; props: PropInm[]; pro: boolean; hoy: string; fechas: string[];
  itin: boolean; s8: boolean; pets: boolean; minDown: number; prequal: number; softPull: boolean; sinCom: boolean; libre: string | null; util: boolean; mueble: boolean;
  nmls: string | null; gratis: number;
};
export const TOPE_PROP_FREE = 5;

export function tituloInm(h: Pick<HerrInm, "kind">, es: boolean) {
  return h.kind === "hipo" ? (es ? "Préstamos y requisitos" : "Loans and requirements") : h.kind === "venta" ? (es ? "Casas en venta" : "Homes for sale")
    : h.kind === "cuarto" ? (es ? "Cuartos y lo que incluye" : "Rooms and inclusions") : es ? "Propiedades y visitas" : "Properties and viewings";
}
const vivas = (h: HerrInm) => h.props.filter((p) => visible(p.status) && !p.adm);
/* summary L310–318 (la fila de Tu herramienta). */
export function resumenInm(h: HerrInm, es: boolean) {
  if (sinPropiedades(h.kind)) return es ? "Lo tuyo va en Servicios: la gente pide cita o llama" : "Yours goes in Services: people book or call";
  if (h.kind === "hipo") return `${es ? "Enganche desde" : "Down from"} ${pctL(h.minDown)}${h.itin ? (es ? " · con ITIN" : " · ITIN") : ""} · ${es ? "precalifica en" : "pre-qualifies in"} ${h.prequal} ${h.prequal === 1 ? (es ? "día" : "day") : es ? "días" : "days"}`;
  const V = vivas(h);
  if (h.kind === "venta") { const v = V.filter((p) => p.deal === "venta"); return `${v.length} ${es ? "en venta" : "for sale"}${v.length ? ` · ${es ? "desde" : "from"} ${usd(Math.min(...v.map((p) => p.price ?? 0)))}` : ""}${h.sinCom ? (es ? " · comprador sin comisión" : " · no buyer commission") : ""}${h.itin ? " · ITIN" : ""}`; }
  const R = V.filter((p) => p.deal === "renta"), sinSsn = R.length > 0 && R.every((p) => !p.ssnReq);
  if (h.kind === "cuarto") return `${R.length} ${R.length === 1 ? (es ? "libre" : "free") : es ? "libres" : "free"}${h.libre ? ` ${es ? "desde el" : "from"} ${fechaInm(h.libre, h.hoy, es)}` : ""}${h.util ? (es ? " · utilidades incluidas" : " · utilities included") : ""}${sinSsn ? (es ? " · sin seguro social" : " · no SSN") : ""}`;
  const mv = R.map((p) => p.moveIn).filter((x): x is number => x != null);
  return `${R.length} ${h.kind === "rent" ? (es ? "disponibles" : "available") : es ? "en la app" : "in the app"}${mv.length ? ` · ${es ? "para mudarte desde" : "move in from"} ${usd(Math.min(...mv))}` : ""}${sinSsn ? (es ? " · sin seguro social" : " · no SSN") : ""}`;
}
/* summary L319 (Super Admin): «6 disponibles · sin seguro social». */
export function resumenAdminInm(h: HerrInm) {
  if (sinPropiedades(h.kind) || h.kind === "hipo" || h.kind === "venta") return resumenInm(h, true);
  const R = vivas(h).filter((p) => p.deal === "renta");
  return `${R.length} disponibles · ${R.length && R.every((p) => !p.ssnReq) ? "sin seguro social" : "piden seguro social"}`;
}
