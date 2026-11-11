"use client";
/* Lo que vendes de Bienes Raíces (4ib · fase4-iglesias-inmuebles-autos.md §1b hueco #1, §4ib y §5). Compuesto solo con los bloques del
   panel (rows, step, chips, field, kv, note, photos, mprev):
   - «Propiedades»: la lista con su estado (Disponible · Apartada · Rentada · Vendida · Oculta) y el editor de cada una (tipo, dirección y
     «mostrar solo la zona», recámaras, baños, pies², renta + depósito + solicitud o precio, lo que incluye, lo que piden, desde cuándo,
     contrato, fotos y horas de visita). «Para mudarte» y la cuota estimada los calcula el servidor al guardar: aquí solo se muestran.
   - «Tu herramienta»: «Propiedades y visitas» (renta), «Casas en venta», «Préstamos y requisitos» y «Cuartos y lo que incluye»
     (dash2-cat.js L508–533), con sus REGLAS que no se apagan. Los montos que toca son los de la propiedad (una sola fuente).
   Cada propiedad que se pinta lleva el pie de igualdad de oportunidad y la nota de los animales de servicio (guardián viviendaJusta). */
import { ctaPro } from "./pro-cta";
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { DIA_FE, horaFe } from "@/lib/fe-comun";
import {
  ANIMALES_SERVICIO, CUOTA_NOTA, DIAS_PRECAL, EHO, ENGANCHES, ENGANCHE_MIN, ESTADO, KINDS_PROP, LAVANDERIA, NO_PAGUES, PROP, SIN_NUMEROS, TOPE_PROP_FREE, UTIL,
  alMes, conCuota, cortoVis, cuotaTexto, fechaInm, lineaInm, mudarteTexto, porL, reglasInm, resumenInm, sinPropiedades, soloZona, tituloInm, usd, visible,
  type Deal, type EstadoProp, type HerrInm, type KindProp, type Laundry, type PropInm, type Util, type VisitaPat,
} from "@/lib/inmuebles-comun";
import { subirFoto } from "@/lib/subir-foto";
import { inmEstado, inmGuardar, inmHerramienta } from "./acciones-inm";
import type { Ctx, Sec } from "./Panel";

const lock = (t: string, s: string): Fila => ({ icon: "lock", ibg: "rgba(11,14,18,.06)", ifg: "var(--tl-ink)", t, s, compact: true });
const VIV = (k: KindProp) => !["local", "oficina", "bodega", "cocina", "salon", "almacen", "parqueo"].includes(k);
const bi = (x: { es: string; en: string } | null | undefined, es: boolean) => (x ? (es ? x.es : x.en || x.es) : "");
const cuartos = (p: PropInm, es: boolean) => [p.beds != null && VIV(p.kind) ? (p.beds === 0 ? (es ? "Estudio" : "Studio") : `${p.beds} ${es ? "rec." : "bd"}`) : "", p.baths != null && p.baths > 0 ? `${String(p.baths)} ${es ? (p.baths === 1 ? "baño" : "baños") : "ba"}` : "", p.sqft ? `${p.sqft.toLocaleString("en-US")} ${es ? "pies²" : "sq ft"}` : ""].filter(Boolean).join(" · ");
const precioL = (p: Pick<PropInm, "rent" | "price" | "kind">, es: boolean) => (p.rent != null ? `${usd(p.rent)}${porL(p.kind, es)}` : p.price != null ? usd(p.price) : "");
const tone = (s: EstadoProp) => (s === "available" ? "signal" : s === "pending" ? "action" : s === "hidden" ? "neutral" : "danger");

/* La fila de «Propiedades» y la de «Tu herramienta» en Lo que vendes. */
export function filaPropiedades(c: Ctx): Fila | null {
  const h = c.svc?.inm, { E2 } = c;
  if (!h || sinPropiedades(h.kind)) return null;
  const vis = h.props.filter((p) => visible(p.status) && !p.adm).length;
  return { icon: "key", t: E2("Propiedades", "Properties"), s: h.props.length ? E2(`${h.props.length} propiedades · ${vis} en tu página`, `${h.props.length} properties · ${vis} on your page`) : E2("Agrega la primera: renta, depósito y horas de visita.", "Add the first one: rent, deposit and viewing times."),
    tag: vis ? E2("EN TU PÁGINA", "LIVE") : null, tone: "signal", chev: true, onClick: () => c.go("mod", "propiedades") };
}
export function filaHerramientaInm(c: Ctx): Fila | null {
  const h = c.svc?.inm, { E2, es } = c;
  if (!h) return null;
  if (sinPropiedades(h.kind)) return { icon: "key", t: E2("Tu herramienta", "Your tool"), s: resumenInm(h, es), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action" };
  return { icon: "key", t: tituloInm(h, es), s: resumenInm(h, es), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") };
}

/* El pie de toda propiedad que se pinta (vivienda justa y estafas de renta, §3). */
function pie(c: Ctx, p: { deal: Deal; kind: KindProp }): Bloque[] {
  const es = c.es;
  return [{ type: "note", tone: "ink", icon: "home", t: `${bi(EHO, es)}. ${bi(ANIMALES_SERVICIO, es)}` },
    ...(p.deal === "renta" && VIV(p.kind) ? [{ type: "note", tone: "info", icon: "shield", t: bi(NO_PAGUES, es) } as Bloque] : [])];
}

/* ── Propiedades: la lista ── */
export function propiedadesBloques(c: Ctx): Sec {
  const h = c.svc!.inm!, { E2, es, ui } = c, f = (ui.inmF as string) || "all";
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: E2("Propiedades", "Properties"), onBack: () => c.go("mod"),
    s: E2("Lo que necesitan para mudarse o comprar, qué piden y cuándo pueden verla. Ver es gratis.", "What it takes to move in or buy, what is required and when they can see it. Viewing is free."),
    act: { l: E2("Agregar", "Add"), icon: "plus", onClick: () => c.det("inm:new") } }];
  out.push({ type: "note", tone: "ink", icon: "lock", t: bi(lineaInm(h.kind, h.subs), es) });
  const vis = h.props.filter((p) => visible(p.status) && !p.adm);
  out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("EN TU PÁGINA", "ON YOUR PAGE"), v: String(vis.length), s: !h.pro ? E2(`Free: hasta ${TOPE_PROP_FREE}`, `Free: up to ${TOPE_PROP_FREE}`) : undefined },
    { k: E2("RENTADAS", "RENTED"), v: String(h.props.filter((p) => p.status === "rented").length) }, { k: E2("VENDIDAS", "SOLD"), v: String(h.props.filter((p) => p.status === "sold").length) }] });
  const F: [string, string, (p: PropInm) => boolean][] = [["all", E2("Todas", "All"), () => true], ["available", E2("Disponibles", "Available"), (p) => visible(p.status)],
    ["rented", E2("Rentadas", "Rented"), (p) => p.status === "rented"], ["sold", E2("Vendidas", "Sold"), (p) => p.status === "sold"], ["hidden", E2("Ocultas", "Hidden"), (p) => p.status === "hidden" || !!p.adm]];
  out.push({ type: "chips", items: F.map(([k, l, fn]) => ({ l: `${l} · ${h.props.filter(fn).length}`, v: f === k ? "selected" : "filter", onClick: () => c.setUi({ inmF: k }) })) });
  const L = h.props.filter((F.find((x) => x[0] === f) ?? F[0]!)[2]);
  if (!L.length) out.push({ type: "empty", icon: "key", t: h.props.length ? E2("Nada aquí", "Nothing here") : E2("Aún no tienes propiedades", "No properties yet"),
    s: E2("Con la renta, el depósito, la dirección y una hora de visita ya sale en tu página.", "With rent, deposit, address and one viewing time it shows on your page."), cta: E2("Agregar", "Add"), onCta: () => c.det("inm:new") });
  else out.push({ type: "rows", cols: c.desk && c.w >= 1100 && !c.ruta.det ? "repeat(2,minmax(0,1fr))" : undefined, items: L.map((p): Fila => ({
    key: p.id, img: p.fotos[0] ? `url("${p.fotos[0]}")` : undefined, imgIni: p.fotos[0] ? undefined : (bi(p.name, es) || "P").slice(0, 1), imgW: "52px", t: bi(p.name, es),
    s: [es ? PROP[p.kind].es : PROP[p.kind].en, cuartos(p, es)].filter(Boolean).join(" · "),
    m: p.adm != null ? E2("OCULTA POR TO’LATINO", "HIDDEN BY TO’LATINO") : p.moveIn != null ? `${E2("PARA MUDARTE", "TO MOVE IN")} ${usd(p.moveIn)}` : p.cuota != null ? cuotaTexto(p.cuota, p.downPct, es).toUpperCase() : undefined,
    mFg: p.adm != null ? "var(--tl-danger)" : undefined, r: precioL(p, es), tag: (es ? ESTADO[p.status][0] : ESTADO[p.status][1]).toUpperCase(), tone: tone(p.status), chev: true, onClick: () => c.det(`inm:${p.id}`) })) });
  if (!h.pro) out.push({ type: "note", tone: "warn", t: E2(`Con Free se ven ${TOPE_PROP_FREE} propiedades en tu página. Las rentadas, vendidas u ocultas no cuentan.`, `On Free, ${TOPE_PROP_FREE} properties show on your page. Rented, sold or hidden ones do not count.`), ...ctaPro(c, "Pro") });
  out.push({ type: "note", tone: "ink", icon: "home", t: `${bi(EHO, es)}. ${bi(ANIMALES_SERVICIO, es)}` });
  return { blocks: out, ed: null };
}

/* ── Propiedad: el editor (inm:new · inm:{id}) ── */
type FP = {
  deal: Deal; kind: KindProp; name: string; en: string; desc: string; descEn: string; fotos: string[]; beds: number | null; baths: number | null; sqft: string;
  rent: string; price: string; dep: string; fee: string; otroL: string; otroC: string; pct: number; disp: string | null; furnished: boolean; pets: boolean; s8: boolean; ssnReq: boolean;
  utilities: Util[]; parking: boolean; laundry: Laundry; papers: string; papersEn: string; lease: string; leaseEn: string; mayores: boolean; addr: string; zip: string; zona: boolean;
  visitas: VisitaPat[]; cupo: number; vDow: number; vMin: number;
};
const dol = (s: string) => Math.round((parseFloat(s.replace(/[^0-9.]/g, "")) || 0)) * 100;
const num = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 9);

export function propiedadDetalle(c: Ctx, id: string): Sec {
  const { E2, es } = c, h = c.svc?.inm, isNew = id === "new", p0 = h?.props.find((x) => x.id === id) ?? null;
  if (!h || (!isNew && !p0)) return { blocks: [{ type: "head", t: E2("Ya no está", "No longer here"), onBack: c.closeDet }], ed: null };
  const deal0: Deal = p0?.deal ?? (h.kind === "venta" ? "venta" : "renta");
  const base: FP = p0 ? {
    deal: p0.deal, kind: p0.kind, name: p0.name.es, en: p0.name.en === p0.name.es ? "" : p0.name.en, desc: p0.desc.es, descEn: p0.desc.en === p0.desc.es ? "" : p0.desc.en, fotos: p0.fotos,
    beds: p0.beds, baths: p0.baths, sqft: p0.sqft ? String(p0.sqft) : "", rent: p0.rent != null ? String(p0.rent / 100) : "", price: p0.price != null ? String(p0.price / 100) : "", dep: String(p0.dep / 100), fee: String(p0.appFee / 100),
    otroL: p0.fees[0]?.label.es ?? "", otroC: p0.fees[0] ? String(p0.fees[0].cents / 100) : "", pct: p0.downPct ?? 10, disp: p0.disponible, furnished: p0.furnished, pets: p0.pets, s8: p0.s8, ssnReq: p0.ssnReq,
    utilities: p0.utilities, parking: p0.parking, laundry: p0.laundry, papers: p0.papers?.es ?? "", papersEn: p0.papers && p0.papers.en !== p0.papers.es ? p0.papers.en : "", lease: p0.lease?.es ?? "",
    leaseEn: p0.lease && p0.lease.en !== p0.lease.es ? p0.lease.en : "", mayores: p0.senior, addr: p0.addr ?? "", zip: p0.zip ?? "", zona: !p0.addrPublic, visitas: p0.visitas, cupo: p0.cupo, vDow: 6, vMin: 600,
  } : {
    deal: deal0, kind: deal0 === "venta" ? "venta_casa" : h.kind === "cuarto" ? "cuarto" : "apto", name: "", en: "", desc: "", descEn: "", fotos: [], beds: 2, baths: 1, sqft: "", rent: "", price: "", dep: "", fee: "0", otroL: "", otroC: "",
    pct: 10, disp: h.fechas[0] ?? null, furnished: h.kind === "cuarto" && h.mueble, pets: h.pets, s8: h.s8, ssnReq: !h.itin, utilities: h.kind === "cuarto" && h.util ? ["luz", "agua", "internet"] : [], parking: false, laundry: "no",
    papers: "", papersEn: "", lease: "", leaseEn: "", mayores: false, addr: "", zip: "", zona: h.kind === "cuarto", visitas: [], cupo: 1, vDow: 6, vMin: 600,
  };
  const F = c.form<FP>(`det:inm:${id}`, base), d = F.d, set = F.set, P = PROP[d.kind], zonaFija = soloZona(d.kind);
  const out: (Bloque | null)[] = [{ type: "head", eye: isNew ? E2("PROPIEDAD NUEVA", "NEW PROPERTY") : `${E2("PROPIEDAD", "PROPERTY")} · ${d.deal === "renta" ? E2("EN RENTA", "FOR RENT") : E2("EN VENTA", "FOR SALE")}`,
    t: isNew ? E2("Nueva propiedad", "New property") : bi(p0!.name, es), s: isNew ? E2("Con el nombre, lo que pagan, la dirección y una hora de visita ya sale en tu página.", "With the name, what they pay, the address and one viewing time it shows on your page.") : [es ? P.es : P.en, cuartos(p0!, es)].filter(Boolean).join(" · "), onBack: c.closeDet }];
  if (p0?.adm != null) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`To’Latino ocultó esta propiedad: no sale en tu página. Motivo: ${p0.adm}`, `To’Latino hid this property: it is not on your page. Reason: ${p0.adm}`) });
  if (p0?.senior && p0.seniorSt === "review") out.push({ type: "note", tone: "info", icon: "clock", t: E2("To’Latino revisa la declaración de vivienda para mayores.", "To’Latino is reviewing the senior housing declaration.") });
  // Fotos (las que ya están en tu galería o nuevas).
  out.push({ type: "photos", k: E2("FOTOS · LA PRIMERA SALE EN LA LISTA", "PHOTOS · THE FIRST ONE SHOWS IN THE LIST"), count: `${d.fotos.length}/8`, cols: 4, items: d.fotos.map((u) => ({ key: u, bg: `url("${u}")`, onClick: () => set({ fotos: d.fotos.filter((x) => x !== u) }) })),
    addL: E2("Subir foto", "Upload photo"), onAdd: d.fotos.length >= 8 ? undefined : () => c.pickFiles(true, async (fs) => { const L = [...d.fotos]; for (const f of fs.slice(0, 8 - L.length)) { const r = await subirFoto(f); if (r.ok && r.url) L.push(r.url); else { c.toast(r.mensaje ? r.mensaje[es ? "es" : "en"] : E2("No se pudo subir la foto.", "Couldn’t upload the photo.")); break; } } set({ fotos: L }); }) });
  if (d.fotos.length) out.push({ type: "note", tone: "info", icon: "image", t: E2("Toca una foto para quitarla. Nada de personas ni papeles en las fotos.", "Tap a photo to remove it. No people or documents in photos.") });
  if (isNew) out.push({ type: "chips", k: E2("¿SE RENTA O SE VENDE?", "FOR RENT OR FOR SALE?"), items: (["renta", "venta"] as Deal[]).map((x) => ({ l: x === "renta" ? E2("En renta", "For rent") : E2("En venta", "For sale"), v: d.deal === x ? "selected" : "filter",
    onClick: () => set({ deal: x, kind: x === "venta" ? "venta_casa" : "apto", zona: false }) })) });
  out.push({ type: "chips", k: E2("QUÉ ES", "WHAT IT IS"), items: KINDS_PROP.filter((k) => PROP[k][d.deal]).map((k) => ({ l: es ? PROP[k].es : PROP[k].en, v: d.kind === k ? "selected" : "filter", onClick: () => set({ kind: k, zona: soloZona(k) ? true : d.zona, mayores: k === "mayores" ? d.mayores : false }) })) });
  if (d.kind === "mayores") out.push({ type: "rows", items: [{ icon: "law", t: E2("Es vivienda para mayores de 62 bajo la excepción de la ley", "It is 62-and-over housing under the legal exemption"), s: E2("Solo si la propiedad está declarada así. To’Latino lo revisa antes de que salga.", "Only if the property is declared as such. To’Latino reviews it before it shows."), tgOn: d.mayores, onTg: () => set({ mayores: !d.mayores }) }] });
  out.push({ type: "field", k: E2("NOMBRE · LO VE LA GENTE", "NAME · PEOPLE SEE IT"), val: d.name, max: 60, count: `${d.name.length}/60`, ph: zonaFija || d.zona ? E2("Ej. Cuarto amueblado · North End", "e.g. Furnished room · North End") : E2("Ej. 2 recámaras · Alter St", "e.g. 2 bedrooms · Alter St"), onChange: (v) => set({ name: v.slice(0, 60) }) },
    { type: "field", k: E2("NOMBRE EN INGLÉS · OPCIONAL", "NAME IN ENGLISH · OPTIONAL"), val: d.en, max: 60, ph: E2("Si lo dejas vacío, sale en español.", "Leave empty to show the Spanish one."), onChange: (v) => set({ en: v.slice(0, 60) }) },
    { type: "field", k: E2("DESCRIPCIÓN · OPCIONAL", "DESCRIPTION · OPTIONAL"), val: d.desc, area: true, rows: 3, max: 300, count: `${d.desc.length}/300`, ph: E2("Patio, sótano, cerca de la escuela…", "Yard, basement, near the school…"), onChange: (v) => set({ desc: v.slice(0, 300) }) },
    { type: "field", k: E2("DESCRIPCIÓN EN INGLÉS · OPCIONAL", "DESCRIPTION IN ENGLISH · OPTIONAL"), val: d.descEn, area: true, rows: 2, max: 300, onChange: (v) => set({ descEn: v.slice(0, 300) }) });
  out.push({ type: "group", k: E2("LA PROPIEDAD", "THE PROPERTY") });
  if (VIV(d.kind) && d.kind !== "terreno") out.push({ type: "step", t: E2("Recámaras", "Bedrooms"), v: d.beds == null ? "—" : d.beds === 0 ? E2("Estudio", "Studio") : String(d.beds), onM: () => set({ beds: Math.max(0, (d.beds ?? 1) - 1) }), onP: () => set({ beds: Math.min(12, (d.beds ?? -1) + 1) }) },
    { type: "step", t: E2("Baños", "Baths"), v: d.baths == null ? "—" : String(d.baths), onM: () => set({ baths: Math.max(0, (d.baths ?? 1) - 0.5) }), onP: () => set({ baths: Math.min(12, (d.baths ?? 0) + 0.5) }) });
  out.push({ type: "field", k: E2("PIES² · OPCIONAL", "SQ FT · OPTIONAL"), val: d.sqft, im: "numeric", suf: E2("pies²", "sq ft"), onChange: (v) => set({ sqft: num(v) }) });
  // Lo que pagan: «Para mudarte» y la cuota estimada salen del servidor (se recalculan al guardar).
  if (d.deal === "renta") {
    out.push({ type: "group", k: E2("LO QUE PAGAN", "WHAT THEY PAY") },
      { type: "field", k: P.per === "hora" ? E2("PRECIO POR HORA", "PRICE PER HOUR") : P.per === "fecha" ? E2("PRECIO POR FECHA", "PRICE PER DATE") : E2("RENTA AL MES", "MONTHLY RENT"), val: d.rent, pre: "$", im: "numeric", ph: "0", onChange: (v) => set({ rent: num(v) }) });
    if (alMes(d.kind)) {
      const r = dol(d.rent);
      out.push({ type: "field", k: E2("DEPÓSITO", "DEPOSIT"), val: d.dep, pre: "$", im: "numeric", ph: "0", help: r ? E2(`Hasta 2 meses de renta: ${usd(2 * r)}. Se devuelve al mudarse, menos daños con foto.`, `Up to 2 months of rent: ${usd(2 * r)}. Returned at move-out, minus photo-documented damage.`) : E2("Hasta 2 meses de renta.", "Up to 2 months of rent."), onChange: (v) => set({ dep: num(v) }) },
        { type: "field", k: E2("CUOTA DE SOLICITUD", "APPLICATION FEE"), val: d.fee, pre: "$", im: "numeric", ph: "0", help: E2("0 si no cobras. Si cobras (hasta $100), entra en «Para mudarte».", "0 if you don’t charge. If you do (up to $100), it goes into “To move in”."), onChange: (v) => set({ fee: num(v) }) },
        { type: "field", k: E2("OTRO PAGO OBLIGATORIO PARA MUDARSE · OPCIONAL", "OTHER REQUIRED MOVE-IN PAYMENT · OPTIONAL"), val: d.otroL, max: 40, ph: E2("Ej. Último mes", "e.g. Last month"), onChange: (v) => set({ otroL: v.slice(0, 40) }) });
      if (d.otroL.trim()) out.push({ type: "field", k: E2("CUÁNTO", "HOW MUCH"), val: d.otroC, pre: "$", im: "numeric", ph: "0", onChange: (v) => set({ otroC: num(v) }) });
      out.push({ type: "kv", items: [{ k: E2("PARA MUDARTE · LO CALCULA TO’LATINO", "TO MOVE IN · CALCULATED BY TO’LATINO"), v: p0?.moveIn != null && !F.dirty ? mudarteTexto(p0, es) : E2("Se calcula al guardar", "Calculated when you save") }] });
    }
  } else {
    out.push({ type: "group", k: E2("PRECIO", "PRICE") }, { type: "field", k: E2("PRECIO DE VENTA", "SALE PRICE"), val: d.price, pre: "$", im: "numeric", ph: "0", onChange: (v) => set({ price: num(v) }) });
    if (conCuota(d.kind)) {
      out.push({ type: "chips", k: E2("ENGANCHE PARA LA CUOTA ESTIMADA", "DOWN PAYMENT FOR THE ESTIMATED PAYMENT"), items: ENGANCHES.map((n) => ({ l: `${n} %`, v: d.pct === n ? "selected" : "filter", onClick: () => set({ pct: n }) })) });
      out.push({ type: "kv", items: [{ k: E2("CUOTA ESTIMADA · LA CALCULA TO’LATINO", "ESTIMATED PAYMENT · CALCULATED BY TO’LATINO"), v: p0?.cuota != null && !F.dirty ? cuotaTexto(p0.cuota, p0.downPct, es) : E2("Cuota estimada: se calcula al guardar", "Estimated payment: calculated when you save") }] });
      out.push({ type: "note", tone: "info", icon: "info", t: bi(CUOTA_NOTA, es) });
    }
  }
  if (d.deal === "renta") out.push({ type: "chips", k: E2("DESDE CUÁNDO", "AVAILABLE FROM"), items: [...h.fechas.map((f) => ({ l: fechaInm(f, h.hoy, es), v: d.disp === f ? "selected" : "filter", onClick: () => set({ disp: f }) })),
    ...(d.disp && !h.fechas.includes(d.disp) ? [{ l: fechaInm(d.disp, h.hoy, es), v: "selected", onClick: () => undefined }] : [])] });
  if (VIV(d.kind)) {
    out.push({ type: "chips", k: E2("LO QUE INCLUYE · UTILIDADES", "WHAT IS INCLUDED · UTILITIES"), help: E2("toca para prender o apagar", "tap to turn on or off"), items: UTIL.map(([k, le, ln]) => ({ l: es ? le : ln, v: d.utilities.includes(k) ? "selected" : "filter",
      onClick: () => set({ utilities: d.utilities.includes(k) ? d.utilities.filter((x) => x !== k) : [...d.utilities, k] }) })) });
    out.push({ type: "rows", cols: c.desk ? "repeat(2,minmax(0,1fr))" : undefined, items: [{ icon: "home", t: E2("Amueblado", "Furnished"), tgOn: d.furnished, onTg: () => set({ furnished: !d.furnished }), compact: true },
      { icon: "car", t: E2("Parqueo", "Parking"), tgOn: d.parking, onTg: () => set({ parking: !d.parking }), compact: true }] });
    out.push({ type: "chips", k: E2("LAVANDERÍA", "LAUNDRY"), items: LAVANDERIA.map(([k, le, ln]) => ({ l: es ? le : ln, v: d.laundry === k ? "selected" : "filter", onClick: () => set({ laundry: k }) })) });
  }
  if (d.deal === "renta" && VIV(d.kind)) {
    out.push({ type: "rows", k: E2("REQUISITOS · LO QUE ACEPTAS", "REQUIREMENTS · WHAT YOU ACCEPT"), cols: c.desk ? "repeat(2,minmax(0,1fr))" : undefined, items: [
      { icon: "card", t: E2("Sin seguro social · aceptas ITIN", "No SSN · you take ITIN"), s: d.ssnReq ? E2("Piden seguro social.", "SSN required.") : E2("ITIN, pasaporte o carta del trabajo.", "ITIN, passport or work letter."), tgOn: !d.ssnReq, onTg: () => set({ ssnReq: !d.ssnReq }), compact: true },
      { icon: "home", t: E2("Aceptas Section 8", "You take Section 8"), tgOn: d.s8, onTg: () => set({ s8: !d.s8 }), compact: true },
      { icon: "heart", t: E2("Aceptas mascotas", "Pets allowed"), tgOn: d.pets, onTg: () => set({ pets: !d.pets }), compact: true },
      lock(E2("Animales de servicio y de apoyo", "Service and support animals"), bi(ANIMALES_SERVICIO, es))] });
  }
  out.push({ type: "field", k: d.deal === "renta" ? E2("LO QUE PIDEN · SOLO QUÉ PAPELES", "WHAT THEY ASK FOR · ONLY WHICH PAPERS") : E2("LO QUE PIDEN · OPCIONAL", "WHAT IS REQUIRED · OPTIONAL"), val: d.papers, area: true, rows: 2, max: 200, count: `${d.papers.length}/200`,
    ph: E2("Ej. 2 recibos de pago o carta del trabajo y una ID de cualquier país.", "e.g. 2 pay stubs or a work letter and an ID from any country."), help: bi(SIN_NUMEROS, es), onChange: (v) => set({ papers: v.slice(0, 200) }) },
    { type: "field", k: E2("LO QUE PIDEN EN INGLÉS · OPCIONAL", "WHAT IS REQUIRED IN ENGLISH · OPTIONAL"), val: d.papersEn, area: true, rows: 2, max: 200, onChange: (v) => set({ papersEn: v.slice(0, 200) }) });
  if (d.deal === "renta") out.push({ type: "field", k: E2("CONTRATO · OPCIONAL", "LEASE · OPTIONAL"), val: d.lease, max: 80, ph: E2("Ej. 12 meses", "e.g. 12 months"), onChange: (v) => set({ lease: v.slice(0, 80) }) },
    { type: "field", k: E2("CONTRATO EN INGLÉS · OPCIONAL", "LEASE IN ENGLISH · OPTIONAL"), val: d.leaseEn, max: 80, onChange: (v) => set({ leaseEn: v.slice(0, 80) }) });
  // Dirección: el servidor la ubica; con «solo la zona» la exacta llega al confirmar la visita (cuartos, siempre).
  out.push({ type: "group", k: E2("DIRECCIÓN", "ADDRESS") },
    { type: "field", k: E2("CALLE Y NÚMERO", "STREET AND NUMBER"), val: d.addr, max: 120, ph: E2("Ej. 312 Alter St", "e.g. 312 Alter St"), onChange: (v) => set({ addr: v.slice(0, 120) }) },
    { type: "field", k: E2("CÓDIGO POSTAL", "ZIP CODE"), val: d.zip, im: "numeric", max: 5, ph: "18201", onChange: (v) => set({ zip: v.replace(/\D/g, "").slice(0, 5) }) },
    { type: "rows", items: [zonaFija ? lock(E2("Mostrar solo la zona", "Show the zone only"), E2("En cuartos la dirección exacta llega cuando confirmas la visita.", "For rooms the exact address arrives when you confirm the visit."))
      : { icon: "pin", t: E2("Mostrar solo la zona", "Show the zone only"), s: d.zona ? E2("Tu página dice la zona; la dirección llega cuando confirmas la visita.", "Your page shows the zone; the address arrives when you confirm the visit.") : E2("Tu página dice la dirección.", "Your page shows the address."), tgOn: d.zona, onTg: () => set({ zona: !d.zona }) }] });
  if (p0 && !p0.ubicada) out.push({ type: "note", tone: "warn", icon: "pin", t: E2("No encontramos esta dirección en el mapa. Revisa la calle y el número; mientras, sale la zona de tu negocio.", "We couldn’t find this address on the map. Check the street and number; meanwhile your business area shows.") });
  // Horas de visita (patrón semanal): ver es gratis; se abren 14 días adelante.
  out.push({ type: "group", k: E2("HORAS DE VISITA · CADA SEMANA", "VIEWING TIMES · EVERY WEEK") });
  if (d.visitas.length) out.push({ type: "rows", cols: c.desk ? "repeat(2,minmax(0,1fr))" : undefined, items: d.visitas.map((v, i) => ({ key: `${v.dow}:${v.min}`, icon: "calendar", t: cortoVis(v.dow, v.min, es), compact: true,
    tgOn: v.on, onTg: () => set({ visitas: d.visitas.map((x, j) => (j === i ? { ...x, on: !x.on } : x)) }), acts: [{ l: E2("Quitar", "Remove"), v: "soft", onClick: () => set({ visitas: d.visitas.filter((_, j) => j !== i) }) }] })) });
  else out.push({ type: "note", tone: d.deal === "renta" && VIV(d.kind) ? "warn" : "info", icon: "calendar", t: E2("Deja al menos una hora de visita: así te piden verla por la app.", "Keep at least one viewing time: that is how people ask to see it in the app.") });
  out.push({ type: "chips", k: E2("AGREGAR UNA HORA · DÍA", "ADD A TIME · DAY"), items: DIA_FE.map((x, i) => ({ l: es ? x[0] : x[1], v: d.vDow === i ? "selected" : "filter", onClick: () => set({ vDow: i }) })) },
    { type: "step", t: E2("Hora de visita", "Viewing time"), v: horaFe(d.vMin), onM: () => set({ vMin: Math.max(360, d.vMin - 30) }), onP: () => set({ vMin: Math.min(1320, d.vMin + 30) }) },
    { type: "acts", pt: "0", items: [{ l: E2("Agregar hora", "Add time"), v: "secondary", icon: "plus", off: d.visitas.some((x) => x.dow === d.vDow && x.min === d.vMin) || d.visitas.length >= 14,
      onClick: () => set({ visitas: [...d.visitas, { dow: d.vDow, min: d.vMin, on: true }].sort((a, b) => a.dow - b.dow || a.min - b.min) }) }] },
    { type: "step", t: E2("Personas por hora", "People per time"), s: E2("Cuántas visitas caben a la misma hora.", "How many visits fit at the same time."), v: String(d.cupo), onM: () => set({ cupo: Math.max(1, d.cupo - 1) }), onP: () => set({ cupo: Math.min(10, d.cupo + 1) }) });
  // Así se ve (con los montos del servidor).
  const prev = p0 && !F.dirty ? p0 : null;
  out.push({ type: "mprev", k: E2("ASÍ SE VE EN TU PÁGINA", "HOW IT LOOKS ON YOUR PAGE"), name: (es ? d.name : d.en || d.name) || E2("Nombre de la propiedad", "Property name"), desc: (es ? d.desc : d.descEn || d.desc) || "",
    price: prev ? precioL(prev, es) : d.deal === "renta" ? `${usd(dol(d.rent))}${porL(d.kind, es)}` : usd(dol(d.price)),
    tags: [...(prev?.moveIn != null ? [{ label: `${E2("PARA MUDARTE", "TO MOVE IN")} ${usd(prev.moveIn)}`, tone: "ink" }] : []), ...(prev?.cuota != null ? [{ label: cuotaTexto(prev.cuota, prev.downPct, es).toUpperCase(), tone: "ink" }] : []),
      { label: E2("VER ES GRATIS", "VIEWING IS FREE"), tone: "signal" }, ...(d.deal === "renta" && !d.ssnReq ? [{ label: E2("SIN SEGURO SOCIAL", "NO SSN"), tone: "neutral" }] : [])], image: d.fotos[0] ?? "" });
  out.push(...pie(c, d));
  if (!isNew) out.push({ type: "chips", k: E2("ESTADO · SE GUARDA AL TOCAR", "STATUS · SAVED WHEN TAPPED"), items: (["available", "pending", d.deal === "renta" ? "rented" : "sold", "hidden"] as EstadoProp[]).map((s) => ({ l: es ? ESTADO[s][0] : ESTADO[s][1], v: p0!.status === s ? "selected" : "filter",
    onClick: () => c.run(() => inmEstado(c.d.id, id, s), E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.")) })) });
  const precio = d.deal === "venta" ? dol(d.price) : 0;
  const miss = [d.name.trim().length < 3 ? E2("nombre", "name") : null, d.deal === "renta" ? (dol(d.rent) ? null : E2("renta", "rent")) : precio ? null : E2("precio", "price"),
    d.addr.trim().length < 4 ? E2("dirección", "address") : null, d.zip.length !== 5 ? E2("código postal", "ZIP") : null,
    d.deal === "renta" && VIV(d.kind) && !d.visitas.some((v) => v.on) ? E2("una hora de visita", "a viewing time") : null, d.kind === "mayores" && !d.mayores ? E2("la declaración de mayores", "the senior declaration") : null].filter(Boolean);
  if (miss.length && F.dirty) out.push({ type: "note", tone: "warn", t: E2(`Para guardar falta: ${miss.join(" · ")}.`, `To save, add: ${miss.join(" · ")}.`) });
  return { blocks: out, ed: { F, l: isNew ? E2("Agregar", "Add") : E2("Guardar", "Save"), valid: !miss.length, always: isNew,
    toast: E2("Guardado · ya se ve en tu página", "Saved · it shows on your page now"), onDone: () => c.closeDet(),
    apply: (x: FP) => inmGuardar(c.d.id, isNew ? "new" : id, {
      deal: x.deal, kind: x.kind, name: { es: x.name, en: x.en }, desc: { es: x.desc, en: x.descEn }, fotos: x.fotos, beds: VIV(x.kind) && x.kind !== "terreno" ? x.beds : null, baths: VIV(x.kind) && x.kind !== "terreno" ? x.baths : null,
      sqft: x.sqft ? Number(x.sqft) : null, rent: x.deal === "renta" ? dol(x.rent) : null, price: x.deal === "venta" ? dol(x.price) : null,
      dep: dol(x.dep), appFee: dol(x.fee), fee: x.otroL.trim() ? { label: { es: x.otroL.trim(), en: x.otroL.trim() }, cents: dol(x.otroC) } : null, downPct: x.deal === "venta" && conCuota(x.kind) ? x.pct : null,
      disponible: x.deal === "renta" ? x.disp : null, furnished: x.furnished, pets: x.pets, s8: x.s8, ssnReq: x.ssnReq, utilities: x.utilities, parking: x.parking, laundry: x.laundry,
      papers: { es: x.papers, en: x.papersEn }, lease: { es: x.lease, en: x.leaseEn }, mayores: x.mayores, addr: x.addr, zip: x.zip, soloZona: x.zona, visitas: x.visitas, cupo: x.cupo,
    }) } };
}

/* ── Tu herramienta: «Propiedades y visitas» y sus variantes (dash2-cat.js L508–533) ── */
export function herramientaInmBloques(c: Ctx): Sec {
  const h = c.svc!.inm!, { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined;
  const ok = E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.");
  const save = (p: Parameters<typeof inmHerramienta>[1], m = ok) => c.run(() => inmHerramienta(c.d.id, p), m);
  const HEAD = h.kind === "hipo" ? E2("Si aceptas ITIN, el enganche mínimo y cuántos días tardas en precalificar. Precalificar es gratis.", "Whether you take ITIN, the minimum down payment and how many days pre-qualifying takes. Pre-qualifying is free.")
    : h.kind === "venta" ? E2("Lo que está en venta, su precio y la cuota estimada. Ver una casa es gratis.", "What is for sale, its price and the estimated payment. Viewing a home is free.")
    : h.kind === "cuarto" ? E2("Desde cuándo están libres, lo que incluyen y lo que piden. Ver es gratis.", "When they are free, what is included and what is required. Viewing is free.")
    : E2("Lo que está disponible, cuánto necesitan para mudarse y cuándo pueden verlo. Ver es gratis.", "What is available, what it takes to move in and when they can see it. Viewing is free.");
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"), t: tituloInm(h, es), s: HEAD }];
  out.push({ type: "note", tone: "ink", icon: "lock", t: bi(lineaInm(h.kind, h.subs), es) });
  const reglas = () => out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: reglasInm(h.kind, h.softPull, h.nmls).map(([t, s]) => lock(bi(t, es), bi(s, es))) });
  const V = h.props.filter((p) => !p.adm);

  if (h.kind === "hipo") {
    out.push({ type: "rows", k: E2("REQUISITOS", "REQUIREMENTS"), items: [{ icon: "card", t: E2("Aceptas ITIN", "You take ITIN"), s: h.itin ? E2("Tu página dice «Con ITIN».", "Your page says «With ITIN».") : E2("Solo con seguro social.", "SSN only."), tgOn: h.itin, onTg: () => save({ itin: !h.itin }) },
      { icon: "shield", t: E2("Precalificas sin afectar el crédito", "You pre-qualify without hurting credit"), s: h.softPull ? E2("Tu página dice «No afecta tu crédito».", "Your page says «Does not hurt your credit».") : E2("Apagado: tu página dice «Precalificar es gratis y no te compromete».", "Off: your page says «Pre-qualifying is free and does not commit you»."), tgOn: h.softPull, onTg: () => save({ soft: !h.softPull }) }] });
    out.push({ type: "chips", k: E2("ENGANCHE MÍNIMO", "MINIMUM DOWN PAYMENT"), items: ENGANCHE_MIN.map((n) => ({ l: `${n} %`, v: h.minDown === n ? "selected" : "filter", onClick: () => save({ minDown: n }) })) });
    out.push({ type: "chips", k: E2("DÍAS PARA PRECALIFICAR", "DAYS TO PRE-QUALIFY"), items: DIAS_PRECAL.map((n) => ({ l: `${n} ${n === 1 ? E2("día", "day") : E2("días", "days")}`, v: h.prequal === n ? "selected" : "filter", onClick: () => save({ prequal: n }) })) });
    reglas();
    return { blocks: out, ed: null };
  }

  if (h.kind === "venta") {
    const S = V.filter((p) => p.deal === "venta");
    out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("EN VENTA", "FOR SALE"), v: String(S.filter((p) => visible(p.status)).length) }, { k: E2("VENDIDAS", "SOLD"), v: String(S.filter((p) => p.status === "sold").length) }, { k: E2("CONSULTAS GRATIS", "FREE CONSULTS"), v: String(h.gratis) }] });
    if (!S.length) out.push({ type: "note", tone: "info", icon: "home", t: E2("Agrega tus casas en Propiedades: precio, enganche y horas de visita.", "Add your homes in Properties: price, down payment and viewing times."), cta: E2("Propiedades", "Properties"), onCta: () => c.go("mod", "propiedades") });
    for (const p of S) {
      const vend = p.status === "sold";
      out.push({ type: "group", k: bi(p.name, es).toUpperCase() });
      out.push({ type: "rows", items: [{ icon: "key", t: vend ? E2("Vendida", "Sold") : E2("En venta", "For sale"), s: vend ? E2("Ya no sale en la app.", "No longer in the app.") : E2("Sale en tu página con el precio y la cuota estimada.", "Shows on your page with the price and estimated payment."), tgOn: !vend,
        onTg: () => save({ estado: { item: p.id, status: vend ? "available" : "sold" } }), compact: true }] });
      if (!vend && p.price != null) {
        out.push({ type: "step", t: E2("Precio", "Price"), s: E2("El precio de venta.", "The sale price."), v: usd(p.price), onM: () => save({ precio: { item: p.id, cents: Math.max(100000, p.price! - 100000) } }), onP: () => save({ precio: { item: p.id, cents: p.price! + 100000 } }) });
        if (p.cuota != null) out.push({ type: "rows", items: [{ icon: "dollar", t: E2("Cuota estimada al mes", "Estimated monthly payment"), s: `${cuotaTexto(p.cuota, p.downPct, es)}. ${bi(CUOTA_NOTA, es)}`, r: usd(p.cuota), compact: true }] });
      }
    }
    out.push({ type: "rows", k: E2("LO QUE DICE TU PÁGINA", "WHAT YOUR PAGE SAYS"), cols: cols2, items: [{ icon: "dollar", t: E2("Comprador sin comisión", "No buyer commission"), tgOn: h.sinCom, onTg: () => save({ sinCom: !h.sinCom }), compact: true },
      { icon: "card", t: E2("Compran con ITIN", "Buy with ITIN"), tgOn: h.itin, onTg: () => save({ itin: !h.itin }), compact: true }] });
    reglas();
    return { blocks: out, ed: null };
  }

  if (h.kind === "cuarto") {
    out.push({ type: "chips", k: E2("LIBRE DESDE", "FREE FROM"), items: h.fechas.map((f) => ({ l: fechaInm(f, h.hoy, es), v: h.libre === f ? "selected" : "filter", onClick: () => save({ libre: f }) })) });
    const sinSsn = V.filter((p) => p.deal === "renta").every((p) => !p.ssnReq);
    out.push({ type: "rows", k: E2("LO QUE INCLUYE", "WHAT IS INCLUDED"), cols: cols2, items: [{ icon: "bolt", t: E2("Luz, agua e internet", "Power, water and internet"), tgOn: h.util, onTg: () => save({ util: !h.util }), compact: true },
      { icon: "home", t: E2("Amueblado", "Furnished"), tgOn: h.mueble, onTg: () => save({ mueble: !h.mueble }), compact: true }, { icon: "card", t: E2("Sin seguro social", "No SSN"), tgOn: sinSsn, onTg: () => save({ sinSsn: !sinSsn }), compact: true }] });
  }

  // Renta (también cuartos, locales y bodegas): por propiedad, Disponible / Rentada, la renta, el depósito y las horas de visita.
  const R = V.filter((p) => p.deal === "renta");
  if (h.kind === "rent") out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("DISPONIBLES", "AVAILABLE"), v: String(R.filter((p) => p.status === "available").length) },
    { k: E2("EN LA APP", "IN THE APP"), v: String(R.filter((p) => visible(p.status)).length) }, { k: E2("RENTADAS", "RENTED"), v: String(R.filter((p) => p.status === "rented").length) }] });
  if (!R.length) out.push({ type: "note", tone: "info", icon: "key", t: E2("Agrega tus propiedades: renta, depósito y horas de visita.", "Add your properties: rent, deposit and viewing times."), cta: E2("Propiedades", "Properties"), onCta: () => c.go("mod", "propiedades") });
  for (const p of R) {
    const off = p.status === "rented" || p.status === "hidden";
    out.push({ type: "group", k: bi(p.name, es).toUpperCase(), link: E2("Editar", "Edit"), onLink: () => c.det(`inm:${p.id}`) });
    out.push({ type: "rows", items: [{ icon: "key", t: off ? (p.status === "rented" ? E2("Rentada", "Rented") : E2("Oculta", "Hidden")) : E2("Disponible", "Available"),
      s: off ? E2("Ya no sale en la app.", "No longer in the app.") : p.moveIn != null ? mudarteTexto(p, es) : E2("Sale en tu página.", "Shows on your page."), tag: off ? (es ? ESTADO[p.status][0] : ESTADO[p.status][1]).toUpperCase() : null, tone: "neutral",
      tgOn: !off, onTg: () => save({ estado: { item: p.id, status: off ? "available" : "rented" } }), compact: true }] });
    if (off || p.rent == null) continue;
    out.push({ type: "step", t: alMes(p.kind) ? E2("Renta al mes", "Monthly rent") : E2("Precio", "Price"), s: alMes(p.kind) ? E2("Lo que pagan cada mes.", "What they pay each month.") : E2("El total que sale en tu página.", "The total shown on your page."), v: usd(p.rent),
      onM: () => save({ renta: { item: p.id, cents: Math.max(500, p.rent! - (alMes(p.kind) ? 2500 : 500)) } }), onP: () => save({ renta: { item: p.id, cents: p.rent! + (alMes(p.kind) ? 2500 : 500) } }) });
    if (alMes(p.kind)) out.push({ type: "step", t: E2("Depósito", "Deposit"), s: E2(`Hasta 2 meses (${usd(2 * p.rent)}). Se devuelve al mudarse, menos daños con foto.`, `Up to 2 months (${usd(2 * p.rent)}). Returned at move-out, minus photo-documented damage.`), v: usd(p.dep),
      onM: () => save({ deposito: { item: p.id, cents: Math.max(0, p.dep - 2500) } }), onP: () => { if (p.dep + 2500 > 2 * p.rent!) { c.toast(E2("El depósito no puede pasar de 2 meses de renta.", "The deposit cannot be more than 2 months of rent.")); return; } save({ deposito: { item: p.id, cents: p.dep + 2500 } }); } });
    if (p.visitas.length) out.push({ type: "chips", k: E2("HORAS DE VISITA", "VIEWING TIMES"), help: E2("toca para prender o apagar", "tap to turn on or off"), items: p.visitas.map((v, i) => ({ l: cortoVis(v.dow, v.min, es), v: v.on ? "selected" : "filter", onClick: () => {
      if (v.on && VIV(p.kind) && p.visitas.filter((x) => x.on).length <= 1) { c.toast(E2("Deja al menos una hora de visita.", "Keep at least one viewing time.")); return; }
      save({ visita: { item: p.id, i, on: !v.on } }); } })) });
    else out.push({ type: "note", tone: "warn", icon: "calendar", t: E2("Sin horas de visita: agrégalas en la propiedad.", "No viewing times: add them in the property."), cta: E2("Editar", "Edit"), onCta: () => c.det(`inm:${p.id}`) });
  }
  if (h.kind === "rent" && R.length) {
    const Rv = R.filter((p) => VIV(p.kind)), sinSsn = Rv.length > 0 && Rv.every((p) => !p.ssnReq), pets = Rv.length > 0 && Rv.every((p) => p.pets);
    out.push({ type: "rows", k: E2("REQUISITOS · EN TODAS TUS PROPIEDADES", "REQUIREMENTS · ON ALL YOUR PROPERTIES"), cols: cols2, items: [{ icon: "card", t: E2("Sin seguro social · aceptas ITIN", "No SSN · you take ITIN"), tgOn: sinSsn, onTg: () => save({ sinSsn: !sinSsn }) },
      { icon: "heart", t: E2("Aceptas mascotas", "Pets allowed"), tgOn: pets, onTg: () => save({ pets: !pets }) }] });
  }
  reglas();
  out.push({ type: "note", tone: "ink", icon: "home", t: `${bi(EHO, es)}. ${bi(ANIMALES_SERVICIO, es)}` });
  return { blocks: out, ed: null };
}

export type { HerrInm };
