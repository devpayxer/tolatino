"use client";
/* Lo que vendes de Venta de Autos (4ic · fase4-iglesias-inmuebles-autos.md §1b hueco #2, §4ic y §5). Compuesto solo con los bloques del
   panel (rows, step, chips, field, kv, note, photos, mprev, kpis, acts):
   - «Inventario»: la lista con su estado (En el lote · Apartado en persona · Vendido · Oculto) y el editor de cada vehículo (VIN, año,
     marca, modelo, versión, carrocería, millaje, transmisión, combustible, tracción, título, historial, inspección de PA, garantía, «no va
     por la calle», CDL, precio, fotos). El total en la puerta lo calcula el servidor mientras se escribe el precio (autosTotal): aquí solo
     se muestra, con su desglose. «Tómale foto al precio del parabrisas» es la ayuda de las fotos.
   - «Tu herramienta · Inventario del lote» (dash2-cat.js L429–443): cada toque se guarda, deja su línea en la auditoría y el servidor
     recalcula el total en la puerta y el pago de ejemplo de todos los carros. REGLAS que no se apagan.
   Cada vehículo que se pinta lleva sus notas (notasCarro): un título salvage dice siempre que no se maneja en la calle. */
import { ctaPro } from "./pro-cta";
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import {
  BODIES, BODY, BUYERS_GUIDE, DRIVE, ESTADO_CARRO, FUEL, GARANTIA, LINEA_AUTOS_SUB, MESES_BHPH, MESES_PAGO, NO_OBLIGATORIA, PARABRISAS, SALVAGE, SIN_GARANTIA, TITULO, TOPE_CARROS_FREE, TRANS,
  anioDeVin, bhphTexto, conCdl, conInventario, garantiaTexto, limpiarVin, lineaAutos, marcaDeVin, nombreCarro, notasCarro, pagoTexto, pctBp, pideMillas, puertaTexto, reglasAutos, resumenAutos, sinVin,
  tituloAutos, totalPagoTexto, usd, vinValido, visibleCarro,
  type Bhph, type Body, type CarroAuto, type Drive, type EstadoCarro, type Fuel, type Garantia, type HerrAutos, type Pago, type Puerta, type Titulo, type Trans,
} from "@/lib/autos-comun";
import { subirFoto } from "@/lib/subir-foto";
import { cortoVis } from "@/lib/inmuebles-comun";
import { DIA_FE, horaFe } from "@/lib/fe-comun";
import { autosEstado, autosGuardar, autosHerramienta, autosTotal } from "./acciones-autos";
import type { Ctx, Sec } from "./Panel";

const lock = (t: string, s: string): Fila => ({ icon: "lock", ibg: "rgba(11,14,18,.06)", ifg: "var(--tl-ink)", t, s, compact: true });
const bi = (x: { es: string; en: string } | null | undefined, es: boolean) => (x ? (es ? x.es : x.en || x.es) : "");
const tone = (s: EstadoCarro) => (s === "lot" ? "signal" : s === "pending" ? "action" : s === "hidden" ? "neutral" : "danger");
const millasL = (x: Pick<CarroAuto, "miles" | "hours">, es: boolean) => (x.miles != null ? `${x.miles.toLocaleString("en-US")} ${es ? "millas" : "miles"}` : x.hours != null ? `${x.hours.toLocaleString("en-US")} ${es ? "horas de motor" : "engine hours"}` : "");
const estL = (s: EstadoCarro, es: boolean) => (es ? ESTADO_CARRO[s][0] : ESTADO_CARRO[s][1]);

/* La fila de «Inventario» y la de «Tu herramienta» en Lo que vendes. */
export function filaInventario(c: Ctx): Fila | null {
  const h = c.svc?.autos, { E2 } = c;
  if (!h || !conInventario(h.kind)) return null;
  const vis = h.carros.filter((x) => visibleCarro(x.status) && x.adm == null).length;
  return { icon: "car", t: E2("Inventario", "Inventory"), s: h.carros.length ? E2(`${h.carros.length} vehículos · ${vis} en tu página`, `${h.carros.length} vehicles · ${vis} on your page`) : E2("Agrega el primero: VIN, precio y fotos.", "Add the first one: VIN, price and photos."),
    tag: vis ? E2("EN TU PÁGINA", "LIVE") : null, tone: "signal", chev: true, onClick: () => c.go("mod", "inventario") };
}
export function filaHerramientaAutos(c: Ctx): Fila | null {
  const h = c.svc?.autos, { E2, es } = c;
  if (!h) return null;
  if (!conInventario(h.kind)) return { icon: "car", t: E2("Tu herramienta", "Your tool"), s: resumenAutos(h, es), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action" };
  return { icon: "car", t: tituloAutos(h, es), s: resumenAutos(h, es), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") };
}

/* ── Inventario: la lista ── */
export function inventarioBloques(c: Ctx): Sec {
  const h = c.svc!.autos!, { E2, es, ui } = c, f = (ui.autoF as string) || "all";
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: E2("Inventario", "Inventory"), onBack: () => c.go("mod"),
    s: E2("Cada vehículo con su VIN, su millaje, su título y el total en la puerta que calcula To’Latino.", "Each vehicle with its VIN, mileage, title and the out-the-door total calculated by To’Latino."),
    act: { l: E2("Agregar", "Add"), icon: "plus", onClick: () => c.det("auto:new") } }];
  out.push({ type: "note", tone: "ink", icon: "lock", t: bi(lineaAutos(h.kind, h.pro), es) });
  const vis = h.carros.filter((x) => visibleCarro(x.status) && x.adm == null);
  out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("EN TU PÁGINA", "ON YOUR PAGE"), v: String(vis.length), s: !h.pro ? E2(`Free: hasta ${TOPE_CARROS_FREE}`, `Free: up to ${TOPE_CARROS_FREE}`) : undefined },
    { k: E2("APARTADOS", "ON HOLD"), v: String(h.carros.filter((x) => x.status === "pending").length) }, { k: E2("VENDIDOS · 30 DÍAS", "SOLD · 30 DAYS"), v: String(h.vendidos30) }] });
  const F: [string, string, (x: CarroAuto) => boolean][] = [["all", E2("Todos", "All"), () => true], ["lot", E2("En el lote", "On the lot"), (x) => visibleCarro(x.status) && x.adm == null],
    ["sold", E2("Vendidos", "Sold"), (x) => x.status === "sold"], ["hidden", E2("Ocultos", "Hidden"), (x) => x.status === "hidden" || x.adm != null]];
  out.push({ type: "chips", items: F.map(([k, l, fn]) => ({ l: `${l} · ${h.carros.filter(fn).length}`, v: f === k ? "selected" : "filter", onClick: () => c.setUi({ autoF: k }) })) });
  const L = h.carros.filter((F.find((x) => x[0] === f) ?? F[0]!)[2]);
  if (!L.length) out.push({ type: "empty", icon: "car", t: h.carros.length ? E2("Nada aquí", "Nothing here") : E2("Aún no tienes vehículos", "No vehicles yet"),
    s: E2("Con el VIN, el millaje y el precio ya sale en tu página con su total en la puerta.", "With the VIN, mileage and price it shows on your page with its out-the-door total."), cta: E2("Agregar", "Add"), onCta: () => c.det("auto:new") });
  else out.push({ type: "rows", cols: c.desk && c.w >= 1100 && !c.ruta.det ? "repeat(2,minmax(0,1fr))" : undefined, items: L.map((x): Fila => ({
    key: x.id, img: x.fotos[0] ? `url("${x.fotos[0]}")` : undefined, imgIni: x.fotos[0] ? undefined : x.make.slice(0, 1), imgW: "52px", t: bi(x.name, es),
    s: [millasL(x, es), es ? TITULO[x.title][0] : TITULO[x.title][1], x.title === "salvage" ? bi(SALVAGE, es) : ""].filter(Boolean).join(" · "),
    m: x.adm != null ? E2("OCULTO POR TO’LATINO", "HIDDEN BY TO’LATINO") : `${E2("EN LA PUERTA", "OUT THE DOOR")} ${usd(x.puerta.otd)}`,
    mFg: x.adm != null ? "var(--tl-danger)" : undefined, r: usd(x.puerta.price), tag: estL(x.status, es).toUpperCase(), tone: tone(x.status), chev: true, onClick: () => c.det(`auto:${x.id}`) })) });
  if (!h.pro) out.push({ type: "note", tone: "warn", t: E2(`Con Free se ven ${TOPE_CARROS_FREE} vehículos en tu página. Los vendidos u ocultos no cuentan.`, `On Free, ${TOPE_CARROS_FREE} vehicles show on your page. Sold or hidden ones do not count.`), ...ctaPro(c, "Pro") });
  out.push({ type: "note", tone: "info", icon: "info", t: bi(LINEA_AUTOS_SUB, es) });
  return { blocks: out, ed: null };
}

/* ── Vehículo: el editor (auto:new · auto:{id}) ── */
type FC = {
  vin: string; year: string; make: string; model: string; trim: string; body: Body; miles: string; hours: string; trans: Trans | null; fuel: Fuel | null; drive: Drive | null; title: Titulo;
  history: boolean; historySrc: string; inspeccion: boolean; warranty: Garantia; wMonths: string; wMiles: string; street: boolean; cdl: boolean; price: string; desc: string; descEn: string; fotos: string[];
};
type Cot = { price: number; puerta: Puerta; est: Pago | null; bhph: Bhph | null };
const dol = (s: string) => Math.round(parseFloat(s.replace(/[^0-9.]/g, "")) || 0) * 100;
const num = (v: string, n = 9) => v.replace(/[^0-9]/g, "").slice(0, n);
let espera: ReturnType<typeof setTimeout> | null = null;

export function carroDetalle(c: Ctx, id: string): Sec {
  const { E2, es } = c, h = c.svc?.autos, isNew = id === "new", x0 = h?.carros.find((x) => x.id === id) ?? null;
  if (!h || (!isNew && !x0)) return { blocks: [{ type: "head", t: E2("Ya no está", "No longer here"), onBack: c.closeDet }], ed: null };
  const base: FC = x0 ? {
    vin: x0.vin ?? "", year: String(x0.year), make: x0.make, model: x0.model, trim: x0.trim ?? "", body: x0.body, miles: x0.miles != null ? String(x0.miles) : "", hours: x0.hours != null ? String(x0.hours) : "",
    trans: x0.trans, fuel: x0.fuel, drive: x0.drive, title: x0.title, history: x0.history, historySrc: x0.historySrc ?? "", inspeccion: x0.inspeccion, warranty: x0.warranty,
    wMonths: x0.wMonths != null ? String(x0.wMonths) : "", wMiles: x0.wMiles != null ? String(x0.wMiles) : "", street: x0.street, cdl: x0.cdl, price: String(x0.puerta.price / 100),
    desc: x0.desc.es, descEn: x0.desc.en === x0.desc.es ? "" : x0.desc.en, fotos: x0.fotos,
  } : {
    vin: "", year: "", make: "", model: "", trim: "", body: h.kind === "moto" ? "moto" : h.kind === "work" ? "trabajo" : "carro", miles: "", hours: "", trans: "automatica", fuel: "gasolina", drive: null, title: "limpio",
    history: false, historySrc: "", inspeccion: true, warranty: h.garantia ? "dealer" : "como_esta", wMonths: h.garantia ? String(h.garantia) : "", wMiles: h.garantia ? String(h.garantia * 1000) : "",
    street: true, cdl: false, price: "", desc: "", descEn: "", fotos: [],
  };
  const F = c.form<FC>(`det:auto:${id}`, base), d = F.d, set = F.set, B = BODY[d.body];
  const vin = limpiarVin(d.vin), yr = Number(d.year) || 0, cents = dol(d.price);
  // El total en la puerta mientras se escribe el precio: lo calcula el servidor (impuesto de la ciudad, placas y cargo ≤ tope).
  const cotizar = (precio: number) => {
    if (espera) clearTimeout(espera);
    if (!(precio >= 10000)) { c.setUi({ [`otd:${id}`]: null }); return; }
    espera = setTimeout(() => { void autosTotal(c.d.id, precio).then((r) => c.setUi({ [`otd:${id}`]: r.ok ? ({ price: precio, puerta: r.puerta, est: r.est, bhph: r.bhph } as Cot) : null })).catch(() => undefined); }, 350);
  };
  const cot = c.ui[`otd:${id}`] as Cot | null | undefined;
  const vivo: Cot | null = cot && cot.price === cents ? cot : x0 && cents === x0.puerta.price ? { price: x0.puerta.price, puerta: x0.puerta, est: x0.est, bhph: x0.bhph } : null;
  const out: (Bloque | null)[] = [{ type: "head", eye: isNew ? E2("VEHÍCULO NUEVO", "NEW VEHICLE") : `${E2("VEHÍCULO", "VEHICLE")} · ${estL(x0!.status, es).toUpperCase()}`,
    t: isNew ? E2("Nuevo vehículo", "New vehicle") : bi(x0!.name, es), s: isNew ? E2("Con el VIN, el millaje y el precio ya sale en tu página con su total en la puerta.", "With the VIN, mileage and price it shows on your page with its out-the-door total.") : [es ? B.es : B.en, millasL(x0!, es)].filter(Boolean).join(" · "), onBack: c.closeDet }];
  if (x0?.adm != null) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`To’Latino ocultó este vehículo: no sale en tu página. Motivo: ${x0.adm}`, `To’Latino hid this vehicle: it is not on your page. Reason: ${x0.adm}`) });
  // Fotos: la primera sale en la lista. La ayuda de captura: el precio del parabrisas.
  out.push({ type: "photos", k: E2("FOTOS · LA PRIMERA SALE EN LA LISTA", "PHOTOS · THE FIRST ONE SHOWS IN THE LIST"), count: `${d.fotos.length}/12`, cols: 4, items: d.fotos.map((u) => ({ key: u, bg: `url("${u}")`, onClick: () => set({ fotos: d.fotos.filter((z) => z !== u) }) })),
    addL: E2("Subir foto", "Upload photo"), onAdd: d.fotos.length >= 12 ? undefined : () => c.pickFiles(true, async (fs) => { const L = [...d.fotos]; for (const f of fs.slice(0, 12 - L.length)) { const r = await subirFoto(f); if (r.ok && r.url) L.push(r.url); else { c.toast(r.mensaje ? r.mensaje[es ? "es" : "en"] : E2("No se pudo subir la foto.", "Couldn’t upload the photo.")); break; } } set({ fotos: L }); }) });
  out.push({ type: "note", tone: "info", icon: "image", t: E2(`${bi(PARABRISAS, true)}: así el precio de la app es el mismo del carro. Toca una foto para quitarla; nada de personas ni papeles con datos.`, `${bi(PARABRISAS, false)}: so the app price matches the car. Tap a photo to remove it; no people or documents with personal data.`) });
  out.push({ type: "chips", k: E2("QUÉ ES", "WHAT IT IS"), items: BODIES.map((k) => ({ l: es ? BODY[k].es : BODY[k].en, v: d.body === k ? "selected" : "filter", onClick: () => set({ body: k, street: BODY[k].calle && d.title !== "salvage", cdl: conCdl(k) ? d.cdl : false }) })) });
  // VIN: 17 letras y números (sin I, O ni Q). El servidor revisa el dígito verificador; aquí solo se avisa mientras se escribe.
  out.push({ type: "group", k: E2("EL VEHÍCULO", "THE VEHICLE") },
    { type: "field", k: sinVin(d.body, yr || 2000) ? E2("VIN · OPCIONAL", "VIN · OPTIONAL") : "VIN", val: d.vin, max: 17, count: `${vin.length}/17`, ph: "1HGCM82633A004352", help: E2("Está en el parabrisas, abajo del lado del chofer, y en la puerta.", "It is on the windshield, driver’s side, and on the door."), onChange: (v) => set({ vin: limpiarVin(v) }) });
  if (vin.length === 17 && !vinValido(vin)) out.push({ type: "note", tone: "warn", icon: "info", t: E2("Ese VIN no cuadra con su dígito verificador: revisa letra por letra.", "That VIN does not match its check digit: check it character by character.") });
  if (vin.length === 17 && vinValido(vin) && (!d.year || !d.make)) {
    const ay = anioDeVin(vin, new Date().getFullYear()), mk = marcaDeVin(vin);
    if (ay || mk) out.push({ type: "acts", pt: "0", items: [{ l: E2("Llenar año y marca con el VIN", "Fill year and make from the VIN"), v: "secondary", icon: "check", onClick: () => set({ year: d.year || (ay ? String(ay) : ""), make: d.make || (mk ?? "") }) }] });
  }
  out.push({ type: "field", k: E2("AÑO DEL MODELO", "MODEL YEAR"), val: d.year, im: "numeric", max: 4, ph: "2018", onChange: (v) => set({ year: num(v, 4) }) },
    { type: "field", k: E2("MARCA", "MAKE"), val: d.make, max: 30, ph: "Toyota", onChange: (v) => set({ make: v.slice(0, 30) }) },
    { type: "field", k: E2("MODELO", "MODEL"), val: d.model, max: 40, ph: "RAV4", onChange: (v) => set({ model: v.slice(0, 40) }) },
    { type: "field", k: E2("VERSIÓN · OPCIONAL", "TRIM · OPTIONAL"), val: d.trim, max: 40, ph: "LE AWD", onChange: (v) => set({ trim: v.slice(0, 40) }) });
  if (d.body === "bote") out.push({ type: "field", k: E2("HORAS DE MOTOR", "ENGINE HOURS"), val: d.hours, im: "numeric", suf: E2("horas", "hours"), onChange: (v) => set({ hours: num(v, 6) }) });
  else out.push({ type: "field", k: pideMillas(d.body) ? E2("MILLAJE", "MILEAGE") : E2("MILLAJE · OPCIONAL", "MILEAGE · OPTIONAL"), val: d.miles, im: "numeric", suf: E2("millas", "miles"), onChange: (v) => set({ miles: num(v, 7) }) });
  if (!["bote", "golf", "trailer", "remolque"].includes(d.body)) {
    out.push({ type: "chips", k: E2("TRANSMISIÓN", "TRANSMISSION"), items: TRANS.map(([k, le, ln]) => ({ l: es ? le : ln, v: d.trans === k ? "selected" : "filter", onClick: () => set({ trans: d.trans === k ? null : k }) })) },
      { type: "chips", k: E2("COMBUSTIBLE", "FUEL"), items: FUEL.map(([k, le, ln]) => ({ l: es ? le : ln, v: d.fuel === k ? "selected" : "filter", onClick: () => set({ fuel: d.fuel === k ? null : k }) })) },
      { type: "chips", k: E2("TRACCIÓN · OPCIONAL", "DRIVETRAIN · OPTIONAL"), items: DRIVE.map(([k, le, ln]) => ({ l: es ? le : ln, v: d.drive === k ? "selected" : "filter", onClick: () => set({ drive: d.drive === k ? null : k }) })) });
  }
  // Título e historial: lo declara el dealer (To'Latino no compra historiales); salvage = no va por la calle.
  out.push({ type: "group", k: E2("TÍTULO E HISTORIAL", "TITLE AND HISTORY") },
    { type: "chips", k: E2("TÍTULO", "TITLE"), items: (["limpio", "reconstruido", "salvage"] as Titulo[]).map((t) => ({ l: es ? TITULO[t][0] : TITULO[t][1], v: d.title === t ? "selected" : "filter", onClick: () => set({ title: t, street: t === "salvage" ? false : BODY[d.body].calle }) })) });
  if (d.title === "salvage") out.push({ type: "note", tone: "danger", icon: "ban", t: bi(SALVAGE, es) });
  out.push({ type: "rows", cols: c.desk ? "repeat(2,minmax(0,1fr))" : undefined, items: [
    { icon: "check", t: E2("Tiene historial del carro", "Has a vehicle history report"), s: E2("Lo das tú; To’Latino no compra historiales.", "You provide it; To’Latino does not buy reports."), tgOn: d.history, onTg: () => set({ history: !d.history }), compact: true },
    { icon: "shield", t: E2("Inspección de PA al día", "PA inspection current"), tgOn: d.inspeccion, onTg: () => set({ inspeccion: !d.inspeccion }), compact: true },
    d.title === "salvage" ? lock(E2("No va por la calle", "Not street legal"), E2("Salvage: hasta pasar la inspección de PA.", "Salvage: until it passes PA inspection."))
      : { icon: "car", t: E2("Va por la calle", "Street legal"), s: d.street ? E2("Se puede manejar en la calle.", "Can be driven on the street.") : E2("Tu página dice «No va por la calle».", "Your page says “Not street legal”."), tgOn: d.street, onTg: () => set({ street: !d.street }), compact: true },
    ...(conCdl(d.body) ? [{ icon: "law", t: E2("Necesita CDL (26,001 libras o más)", "Needs a CDL (26,001 lbs or more)"), tgOn: d.cdl, onTg: () => set({ cdl: !d.cdl }), compact: true } as Fila] : [])] });
  if (d.history) out.push({ type: "field", k: E2("DE QUIÉN ES EL HISTORIAL", "WHO PROVIDES THE HISTORY"), val: d.historySrc, max: 30, ph: "Carfax", onChange: (v) => set({ historySrc: v.slice(0, 30) }) });
  // Garantía: lo mismo que la Buyers Guide de la ventana.
  out.push({ type: "group", k: E2("GARANTÍA", "WARRANTY") },
    { type: "chips", items: (["como_esta", "dealer", "fabrica", "certificado"] as Garantia[]).map((g) => ({ l: es ? GARANTIA[g][0] : GARANTIA[g][1], v: d.warranty === g ? "selected" : "filter", onClick: () => set({ warranty: g, wMonths: g === "como_esta" ? "" : d.wMonths || "3", wMiles: g === "como_esta" ? "" : d.wMiles }) })) });
  if (d.warranty !== "como_esta") out.push({ type: "field", k: E2("MESES", "MONTHS"), val: d.wMonths, im: "numeric", max: 3, suf: E2("meses", "months"), onChange: (v) => set({ wMonths: num(v, 3) }) },
    { type: "field", k: E2("MILLAS · OPCIONAL", "MILES · OPTIONAL"), val: d.wMiles, im: "numeric", suf: E2("millas", "miles"), onChange: (v) => set({ wMiles: num(v, 6) }) });
  out.push({ type: "note", tone: "ink", icon: "law", t: bi(BUYERS_GUIDE, es) });
  // Precio y total en la puerta (del servidor).
  out.push({ type: "group", k: E2("PRECIO", "PRICE") },
    { type: "field", k: E2("PRECIO · ANTES DE IMPUESTO, PLACAS Y CARGOS", "PRICE · BEFORE TAX, TAGS AND FEES"), val: d.price, pre: "$", im: "numeric", ph: "0", onChange: (v) => { const p = num(v, 6); set({ price: p }); cotizar(dol(p)); } });
  out.push({ type: "kv", items: [{ k: E2("EN LA PUERTA · LO CALCULA TO’LATINO", "OUT THE DOOR · CALCULATED BY TO’LATINO"), v: vivo ? puertaTexto(vivo.puerta, es) : cents ? E2("Calculando…", "Calculating…") : E2("Escribe el precio", "Type the price") }] });
  if (vivo?.est) out.push({ type: "note", tone: "info", icon: "dollar", t: `${pagoTexto(vivo.est, es)}. ${totalPagoTexto(vivo.est, es)}.` });
  if (vivo?.bhph) out.push({ type: "note", tone: "info", icon: "dollar", t: `${bhphTexto(vivo.bhph, es)}.` });
  if (h.kind === "bhph" && vivo && !vivo.bhph) out.push({ type: "note", tone: "warn", icon: "dollar", t: E2("Con tu enganche y tu pago a la semana no se cubre el total en la puerta de este carro: no sale plan de pagos. Cámbialos en Tu herramienta.", "Your down payment and weekly payment do not cover this car’s out-the-door total: no payment plan shows. Change them in Your tool.") });
  out.push({ type: "field", k: E2("DESCRIPCIÓN · OPCIONAL", "DESCRIPTION · OPTIONAL"), val: d.desc, area: true, rows: 3, max: 300, count: `${d.desc.length}/300`, ph: E2("Un dueño, gomas nuevas, mantenimiento al día…", "One owner, new tires, maintenance up to date…"),
    help: E2("El pago al mes y el enganche los calcula To’Latino con la tasa y los meses: no los escribas aquí.", "Monthly payments and down payments are calculated by To’Latino with the rate and term: don’t type them here."), onChange: (v) => set({ desc: v.slice(0, 300) }) },
    { type: "field", k: E2("DESCRIPCIÓN EN INGLÉS · OPCIONAL", "DESCRIPTION IN ENGLISH · OPTIONAL"), val: d.descEn, area: true, rows: 2, max: 300, onChange: (v) => set({ descEn: v.slice(0, 300) }) });
  // Así se ve (con el total del servidor) y lo que dice debajo.
  const nombre = yr && d.make && d.model ? nombreCarro(yr, d.make, d.model, d.trim || null) : E2("Año, marca y modelo", "Year, make and model");
  const notas = notasCarro({ title: d.title, street: d.street, body: d.body, cdl: d.cdl, warranty: d.warranty, wMonths: Number(d.wMonths) || null, wMiles: Number(d.wMiles) || null, history: d.history, historySrc: d.historySrc || null }, es);
  out.push({ type: "mprev", k: E2("ASÍ SE VE EN TU PÁGINA", "HOW IT LOOKS ON YOUR PAGE"), name: nombre, desc: (es ? d.desc : d.descEn || d.desc) || "", price: cents ? usd(cents) : "$0",
    tags: [...(vivo ? [{ label: `${E2("EN LA PUERTA", "OUT THE DOOR")} ${usd(vivo.puerta.otd)}`, tone: "ink" }] : []), ...(d.miles ? [{ label: `${Number(d.miles).toLocaleString("en-US")} ${E2("MILLAS", "MILES")}`, tone: "neutral" }] : []),
      { label: (es ? TITULO[d.title][0] : TITULO[d.title][1]).toUpperCase(), tone: d.title === "limpio" ? "signal" : "danger" }], image: d.fotos[0] ?? "" });
  for (const t of notas) out.push({ type: "note", tone: t === bi(SALVAGE, es) ? "danger" : "info", icon: t === bi(SALVAGE, es) ? "ban" : "info", t });
  if (!isNew) out.push({ type: "chips", k: E2("ESTADO · SE GUARDA AL TOCAR", "STATUS · SAVED WHEN TAPPED"), items: (["lot", "pending", "sold", "hidden"] as EstadoCarro[]).map((s) => ({ l: estL(s, es), v: x0!.status === s ? "selected" : "filter",
    onClick: () => c.run(() => autosEstado(c.d.id, id, s), E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.")) })) });
  // El dígito verificador lo revisa el servidor al guardar (y dice qué está mal); aquí solo que estén los 17.
  const miss = [!sinVin(d.body, yr || 2000) && vin.length !== 17 ? "VIN" : null, !(yr >= 1900) ? E2("año", "year") : null, !d.make.trim() ? E2("marca", "make") : null, !d.model.trim() ? E2("modelo", "model") : null,
    pideMillas(d.body) && !d.miles ? E2("millaje", "mileage") : null, !(cents >= 10000) ? E2("precio", "price") : null, d.warranty !== "como_esta" && !Number(d.wMonths) ? E2("meses de garantía", "warranty months") : null].filter(Boolean);
  if (miss.length && F.dirty) out.push({ type: "note", tone: "warn", t: E2(`Para guardar falta: ${miss.join(" · ")}.`, `To save, add: ${miss.join(" · ")}.`) });
  return { blocks: out, ed: { F, l: isNew ? E2("Agregar", "Add") : E2("Guardar", "Save"), valid: !miss.length, always: isNew,
    toast: E2("Guardado · ya se ve en tu página", "Saved · it shows on your page now"), onDone: () => c.closeDet(),
    apply: (z: FC) => autosGuardar(c.d.id, isNew ? "new" : id, {
      vin: z.vin, year: z.year ? Number(z.year) : null, make: z.make, model: z.model, trim: z.trim, body: z.body, miles: z.miles ? Number(z.miles) : null, hours: z.hours ? Number(z.hours) : null,
      trans: z.trans, fuel: z.fuel, drive: z.drive, title: z.title, history: z.history, historySrc: z.historySrc, inspeccion: z.inspeccion, warranty: z.warranty,
      wMonths: z.wMonths ? Number(z.wMonths) : null, wMiles: z.wMiles ? Number(z.wMiles) : null, street: z.street, cdl: z.cdl, price: dol(z.price), desc: { es: z.desc, en: z.descEn }, fotos: z.fotos,
    }) } };
}

/* ── Tu herramienta: «Inventario del lote» (dash2-cat.js L429–443) ── */
export function herramientaAutosBloques(c: Ctx): Sec {
  const h = c.svc!.autos!, { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined;
  const ok = E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.");
  const save = (p: Parameters<typeof autosHerramienta>[1], m = ok) => c.run(() => autosHerramienta(c.d.id, p), m);
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"), t: tituloAutos(h, es),
    s: E2("Financiamiento, garantía, el cargo del dealer y lo que está en el lote. Cada cambio recalcula el total en la puerta de todos tus carros.", "Financing, warranty, the dealer fee and what is on the lot. Each change recalculates the out-the-door total of all your cars.") }];
  out.push({ type: "note", tone: "ink", icon: "lock", t: bi(lineaAutos(h.kind, h.pro), es) });
  const bhph = h.kind === "bhph", tax = h.taxBp ?? 0;
  if (bhph) {
    out.push({ type: "step", t: E2("Enganche", "Down payment"), s: E2("Lo que pagan para llevarse el carro.", "What they pay to drive off."), v: usd(h.bhphDown), onM: () => save({ bhphEng: Math.max(0, h.bhphDown - 10000) }), onP: () => save({ bhphEng: h.bhphDown + 10000 }) },
      { type: "step", t: E2("Pago a la semana", "Weekly payment"), s: E2("Sale en cada carro con el total pagado y la tasa.", "Shows on each car with the total paid and the rate."), v: usd(h.bhphWeek), onM: () => { if (h.bhphWeek - 500 < 2500) { c.toast(E2("El pago a la semana va desde $25.", "The weekly payment starts at $25.")); return; } save({ bhphSem: h.bhphWeek - 500 }); }, onP: () => save({ bhphSem: h.bhphWeek + 500 }) },
      { type: "chips", k: E2("MESES", "MONTHS"), items: MESES_BHPH.map((n) => ({ l: String(n), v: h.bhphMonths === n ? "selected" : "filter", onClick: () => save({ bhphMeses: n }) })) },
      { type: "rows", items: [{ icon: "check", t: E2("Reportas los pagos al crédito", "You report payments to credit"), s: h.reporta ? E2("Tu página dice que pagar a tiempo sube el puntaje.", "Your page says paying on time builds credit.") : E2("Tu página dice que no reportas.", "Your page says you do not report."), tgOn: h.reporta, onTg: () => save({ reporta: !h.reporta }) }] });
  } else {
    out.push({ type: "rows", k: E2("FINANCIAMIENTO Y GARANTÍA", "FINANCING AND WARRANTY"), cols: cols2, items: [
      { icon: "dollar", t: E2("Financias en el lote", "You finance in-house"), tgOn: h.fin, onTg: () => save({ fin: !h.fin }), compact: true },
      { icon: "card", t: E2("Financias con ITIN", "You finance with ITIN"), tgOn: h.itin, onTg: () => save({ itin: !h.itin }), compact: true },
      { icon: "check", t: E2("Financias sin historial de crédito", "You finance with no credit history"), tgOn: h.noCredit, onTg: () => save({ noCredit: !h.noCredit }), compact: true },
      { icon: "car", t: E2("Aceptas carros a cambio", "You take trade-ins"), tgOn: h.trade, onTg: () => save({ trade: !h.trade }), compact: true },
      { icon: "home", t: E2("Prueba de manejo en casa", "Test drive at home"), tgOn: h.casa, onTg: () => save({ casa: !h.casa }), compact: true }] });
    if (h.fin) {
      out.push({ type: "step", t: h.itin ? E2("Enganche con ITIN desde", "ITIN down payment from") : E2("Enganche desde", "Down payment from"), s: E2("Sale en cada carro con la tasa y los meses.", "Shows on each car with the rate and term."), v: usd(h.itinDown),
        onM: () => { if (h.itinDown - 10000 < 50000) { c.toast(E2("El enganche va desde $500.", "The down payment starts at $500.")); return; } save({ enganche: h.itinDown - 10000 }); }, onP: () => save({ enganche: h.itinDown + 10000 }) });
      out.push({ type: "chips", k: E2("PAGO DE EJEMPLO · MESES", "EXAMPLE PAYMENT · TERM"), help: E2("con tasa, meses y enganche juntos", "rate, term and down payment together"),
        items: [{ l: E2("Sin ejemplo", "No example"), v: h.termM == null ? "selected" : "filter", onClick: () => save({ pago: null }) },
          ...MESES_PAGO.filter((n) => n >= 24).map((n) => ({ l: `${n}`, v: h.termM === n ? "selected" : "filter", onClick: () => save({ pago: { aprBp: h.aprBp ?? 1490, meses: n } }) }))] });
      if (h.aprBp != null && h.termM != null) out.push({ type: "step", t: E2("Tasa (APR) del ejemplo", "Example rate (APR)"), s: E2("La que das por escrito a la mayoría.", "The one you put in writing for most buyers."), v: pctBp(h.aprBp),
        onM: () => save({ pago: { aprBp: Math.max(0, h.aprBp! - 50), meses: h.termM! } }), onP: () => { if (h.aprBp! + 50 > 3000) { c.toast(E2("La tasa va hasta 30 %.", "The rate goes up to 30%.")); return; } save({ pago: { aprBp: h.aprBp! + 50, meses: h.termM! } }); } });
      out.push({ type: "note", tone: "info", icon: "info", t: `${bi(NO_OBLIGATORIA, es)} ${bi(SIN_GARANTIA, es)}` });
    }
    out.push({ type: "chips", k: E2("GARANTÍA EN MOTOR Y TRANSMISIÓN", "POWERTRAIN WARRANTY"), items: ([[0, E2("Se vende como está", "Sold as is")], [3, E2("3 meses", "3 months")], [6, E2("6 meses", "6 months")]] as [number, string][]).map(([n, l]) => ({ l, v: h.garantia === n ? "selected" : "filter", onClick: () => save({ garantia: n }) })) });
    out.push({ type: "note", tone: "ink", icon: "law", t: bi(BUYERS_GUIDE, es) });
  }
  out.push({ type: "step", t: E2("Cargo del dealer", "Dealer fee"), s: E2(`Se suma al total en la puerta de cada carro. Tope de PA: ${usd(h.tope)}.`, `Added to each car’s out-the-door total. PA cap: ${usd(h.tope)}.`), v: usd(h.fee),
    onM: () => save({ cargo: Math.max(0, h.fee - 5000) }), onP: () => { if (h.fee + 5000 > h.tope) { c.toast(E2(`El cargo del dealer no puede pasar del tope de PA (${usd(h.tope)}).`, `The dealer fee cannot exceed the PA cap (${usd(h.tope)}).`)); return; } save({ cargo: h.fee + 5000 }); } });
  const V = h.carros.filter((x) => x.adm == null && x.status !== "hidden"), enApp = V.filter((x) => visibleCarro(x.status)).length;
  out.push({ type: "step", t: E2("Carros en el lote", "Cars on the lot"), s: E2("Los que tienes, aunque no todos estén en la app.", "All you have, even if not all are in the app."), v: String(Math.max(h.lot, enApp)),
    onM: () => { if (h.lot - 1 < enApp) { c.toast(E2("En el lote hay al menos los que están en la app.", "The lot has at least the ones in the app.")); return; } save({ lote: h.lot - 1 }); }, onP: () => save({ lote: Math.max(h.lot, enApp) + 1 }) });
  // 4ie · Horas de prueba de manejo «cualquier carro»: patrón semanal → 14 días adelante; toca para prender o apagar. La prueba es gratis.
  const P0 = h.prueba.pattern, pDow = (c.ui.pDow as number | undefined) ?? 6, pMin = (c.ui.pMin as number | undefined) ?? 600;
  const savePrueba = (pattern: typeof P0, cupo = h.prueba.cupo) => save({ prueba: { pattern, cupo } }, E2("Guardado: las horas ya salen en tu página.", "Saved: the times show on your page now."));
  out.push({ type: "group", k: E2("HORAS DE PRUEBA DE MANEJO · CUALQUIER CARRO", "TEST DRIVE TIMES · ANY CAR") });
  if (P0.length) out.push({ type: "chips", k: E2(`${h.prueba.horas} ABIERTAS EN 14 DÍAS`, `${h.prueba.horas} OPEN IN 14 DAYS`), help: E2("toca para prender o apagar", "tap to turn on or off"),
    items: P0.map((v, i) => ({ l: cortoVis(v.dow, v.min, es), v: v.on ? "selected" : "filter", onClick: () => savePrueba(P0.map((x, j) => (j === i ? { ...x, on: !x.on } : x))) })) });
  else out.push({ type: "note", tone: "info", icon: "calendar", t: E2("Sin horas de prueba: la gente te llama para pedirla. Agrega una y la piden en la app.", "No test drive times: people call to ask. Add one and they request it in the app.") });
  out.push({ type: "chips", k: E2("DÍA", "DAY"), items: DIA_FE.map((d, i) => ({ l: es ? d[0] : d[1], v: pDow === i ? "selected" : "filter", onClick: () => c.setUi({ pDow: i }) })) },
    { type: "step", t: E2("Hora de prueba", "Test drive time"), v: horaFe(pMin), onM: () => c.setUi({ pMin: Math.max(360, pMin - 30) }), onP: () => c.setUi({ pMin: Math.min(1320, pMin + 30) }) },
    { type: "acts", pt: "0", items: [{ l: E2("Agregar hora", "Add time"), v: "secondary", icon: "plus", off: c.pending || P0.some((x) => x.dow === pDow && x.min === pMin) || P0.length >= 21, onClick: () => savePrueba([...P0, { dow: pDow, min: pMin, on: true }]) },
      ...(P0.length ? [{ l: E2("Quitar las apagadas", "Remove the off ones"), v: "ghost", off: c.pending || !P0.some((x) => !x.on), onClick: () => savePrueba(P0.filter((x) => x.on)) }] : [])] },
    { type: "step", t: E2("Personas por hora", "People per time"), s: E2("Cuántas pruebas caben a la misma hora.", "How many test drives fit at the same time."), v: String(h.prueba.cupo), onM: () => savePrueba(P0, Math.max(1, h.prueba.cupo - 1)), onP: () => savePrueba(P0, Math.min(5, h.prueba.cupo + 1)) });
  out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("EN EL LOTE", "ON THE LOT"), v: String(Math.max(h.lot, enApp)) }, { k: E2("VENDIDOS", "SOLD"), v: String(h.vendidos30), s: E2("30 días", "30 days") }, { k: E2("EN LA APP", "IN THE APP"), v: String(enApp) }] });
  if (!V.length) out.push({ type: "note", tone: "info", icon: "car", t: E2("Agrega tus carros en Inventario: VIN, millaje, precio y fotos.", "Add your cars in Inventory: VIN, mileage, price and photos."), cta: E2("Inventario", "Inventory"), onCta: () => c.go("mod", "inventario") });
  for (const x of V) {
    const vend = x.status === "sold";
    out.push({ type: "group", k: bi(x.name, es).toUpperCase(), link: E2("Editar", "Edit"), onLink: () => c.det(`auto:${x.id}`) });
    out.push({ type: "rows", items: [{ icon: "car", t: vend ? E2("Vendido", "Sold") : E2("En el lote", "On the lot"), s: vend ? E2("Ya no sale en la app.", "No longer in the app.") : puertaTexto(x.puerta, es),
      tag: vend ? E2("VENDIDO", "SOLD") : x.status === "pending" ? E2("APARTADO", "ON HOLD") : null, tone: "neutral", compact: true,
      tgOn: !vend, onTg: () => { if (!vend && enApp <= 1) { c.toast(E2("Deja al menos un carro en la app.", "Keep at least one car in the app.")); return; } save({ estado: { item: x.id, status: vend ? "lot" : "sold" } }); } }] });
    if (vend) continue;
    out.push({ type: "step", t: E2("Precio", "Price"), s: E2("Antes de impuesto, placas y cargos.", "Before tax, plates and fees."), v: usd(x.puerta.price),
      onM: () => save({ precio: { item: x.id, cents: Math.max(10000, x.puerta.price - 10000) } }), onP: () => save({ precio: { item: x.id, cents: x.puerta.price + 10000 } }) });
    const L = [x.est ? pagoTexto(x.est, es) : "", x.bhph ? bhphTexto(x.bhph, es) : "", ...notasCarro(x, es).filter((t) => t === bi(SALVAGE, es))].filter(Boolean);
    for (const t of L) out.push({ type: "note", tone: t === bi(SALVAGE, es) ? "danger" : "info", icon: t === bi(SALVAGE, es) ? "ban" : "dollar", t });
  }
  out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: reglasAutos(h.kind, tax).map(([t, s]) => lock(bi(t, es), bi(s, es))) });
  if (!h.pro) out.push({ type: "note", tone: "warn", t: E2(`Con Free se ven ${TOPE_CARROS_FREE} vehículos en tu página.`, `On Free, ${TOPE_CARROS_FREE} vehicles show on your page.`), ...ctaPro(c, "Pro") });
  return { blocks: out, ed: null };
}

export { garantiaTexto };
export type { HerrAutos };
