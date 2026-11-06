"use client";
/* Lo que vendes › Servicios y Tu herramienta de un taller (Auto) o un servicio del hogar (Hogar). Diseño: Panel v2
   asvBlocks / asvDet (dash2-asv.js, «Servicios de Auto») y dash2-cat.js blocksB («Taller y estimados» · «Visitas, planes y
   renta»). Servicios de Hogar no tiene pantalla en el diseño: es la misma de Auto con las formas de cobrar de Hogar
   (neg-hogar-listing.js: visita · fijo · hora · área · presupuesto · emergencia · plan) — anotado en docs/REVISION.md. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { subirFoto } from "@/lib/subir-foto";
import type { Attrs, Bi, OfiPanel, Oficio, Rubro } from "@/lib/oficios";
import { detalleL, precioL } from "@/lib/oficios-texto";
import { citasOficioGuardar, herramientaGuardar, oficioGuardar, rentaVisible, type CitasOficioIn, type OficioForm } from "./acciones-oficios";
import { citasModulo, servicioMover, servicioQuitar, servicioVisible } from "./acciones-servicios";
import type { Ctx, Sec } from "./Panel";

const money = (c: number) => { const d = (Number(c) || 0) / 100; return `$${d % 1 ? d.toFixed(2) : Math.round(d).toLocaleString("en-US")}`; };
const dol = (c: number | null | undefined) => (c ? String(c / 100) : "");
const cts = (v: string) => Math.round((parseFloat(String(v).replace(/[^0-9.]/g, "")) || 0) * 100);
const num = (v: string) => v.replace(/[^0-9.]/g, "").slice(0, 8);
const O = (c: Ctx): OfiPanel => c.ofi!;
const UNIT: Record<string, [string, string]> = { pie2: ["pie²", "sq ft"], cuarto: ["cuarto", "room"], salida: ["salida", "vent"] };

/* Las formas de cobrar (Auto: asvK del diseño; Hogar: compuesto con los tipos de neg-hogar-listing). */
export function formas(c: Ctx, r: Rubro): [string, string, string][] {
  const E2 = c.E2;
  return r === "auto" ? [
    ["fijo", E2("Precio cerrado", "Fixed price"), E2("Lo que ve el cliente es lo que paga.", "What the client sees is what they pay.")],
    ["desde", E2("Desde · final en el estimado", "From · final in the estimate"), E2("Precio mínimo; el final va en el estimado que el cliente aprueba.", "Minimum price; the final goes in the estimate the client approves.")],
    ["cotiza", E2("Se cotiza después de verlo", "Quoted after seeing it"), E2("Pones un rango típico; el precio sale del diagnóstico.", "You set a typical range; the price comes from the diagnosis.")],
    ["diag", E2("Diagnóstico", "Diagnosis"), E2("Lo que cobras por encontrar la falla.", "What you charge to find the problem.")],
    ["goma", E2("Por goma", "Per tire"), E2("Montaje, balanceo o ponchadura.", "Mounting, balancing or flats.")],
    ["insp", E2("Inspección de PA", "PA inspection"), E2("Seguridad o emisiones, con calcomanía.", "Safety or emissions, with sticker.")],
    ["lav", E2("Por tamaño de carro", "By car size"), E2("Lavado o detallado: carro, SUV o van.", "Wash or detail: car, SUV or van.")],
    ["grua", E2("Se llama · grúa", "Call · towing"), E2("No se reserva: el cliente te llama.", "No booking: the client calls you.")],
  ] : [
    ["visita", E2("Visita y diagnóstico", "Visit and diagnosis"), E2("Lo que cobras por ir y ver qué pasa.", "What you charge to come and see what is wrong.")],
    ["fijo", E2("Precio cerrado", "Fixed price"), E2("Lo que ve el cliente es lo que paga.", "What the client sees is what they pay.")],
    ["hora", E2("Por hora", "Per hour"), E2("Con un mínimo de horas; los materiales van aparte.", "With a minimum of hours; materials are extra.")],
    ["area", E2("Por medida", "By size"), E2("Por pie², cuarto o salida, con un mínimo.", "Per sq ft, room or vent, with a minimum.")],
    ["pres", E2("Presupuesto en tu casa", "Estimate at the home"), E2("Vas, mides y das el precio completo antes de empezar.", "You go, measure and give the full price before starting.")],
    ["emer", E2("Emergencia 24/7", "24/7 emergency"), E2("La salida, con el recargo incluido.", "The call-out, surcharge included.")],
    ["plan", E2("Plan", "Plan"), E2("Visitas fijas con cobro cada mes o por temporada.", "Set visits billed monthly or per season.")],
  ];
}
/* Las filas de Lo que vendes (Servicios · Tu herramienta · Citas). */
export function vendesOficios(c: Ctx): Fila[] {
  const { E2 } = c, X = O(c), vis = X.servicios.filter((s) => !s.oculto && s.adm == null).length, auto = X.rubro === "auto", t = X.tool;
  return [
    { icon: "wrench", t: E2("Servicios", "Services"), s: X.servicios.length ? E2(`${X.servicios.length} servicios · ${vis} en tu página`, `${X.servicios.length} services · ${vis} on your page`) : E2("Todavía no tienes servicios", "No services yet"),
      ...(X.off.svc != null ? { m: E2("PAUSADO POR TO’LATINO · NO SALE EN TU PÁGINA", "PAUSED BY TO’LATINO · NOT ON YOUR PAGE"), mFg: "var(--tl-danger)" } : {}), tag: vis && X.off.svc == null ? E2("EN TU PÁGINA", "LIVE") : null, tone: "signal", chev: true, onClick: () => c.go("mod", "servicios") },
    { icon: auto ? "wrench" : "home", t: auto ? E2("Taller y estimados", "Shop and estimates") : E2("Visitas, planes y renta", "Visits, plans and rentals"),
      s: auto ? E2(`${money(t.rate)}/h · garantía ${t.warrM ?? 12} meses · mismo día antes de las ${hL(t.cut ?? 14)}`, `${money(t.rate)}/h · ${t.warrM ?? 12}-month warranty · same day before ${hL(t.cut ?? 14)}`)
        : E2(`${money(t.rate)}/h · hasta ${t.zone ?? 20} mi · ${t.h24 ? "emergencias 24 h" : "sin emergencias"}`, `${money(t.rate)}/h · up to ${t.zone ?? 20} mi · ${t.h24 ? "24 h emergencies" : "no emergencies"}`),
      tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") },
    { icon: "calendar", t: E2("Citas", "Bookings"), s: !X.on ? E2("Apagado · tu página no recibe solicitudes en línea", "Off · your page takes no online requests") : `${X.pol.auto ? E2("Al instante", "Instant") : E2(`Tú confirmas · ~${X.pol.resp} min`, `You confirm · ~${X.pol.resp} min`)} · ${X.pol.dep ? E2(`depósito ${money(X.pol.dep)}`, `${money(X.pol.dep)} deposit`) : E2("sin depósito", "no deposit")}`,
      ...(X.off.citas != null ? { m: E2("PAUSADAS POR TO’LATINO", "PAUSED BY TO’LATINO"), mFg: "var(--tl-danger)" } : {}), tag: X.on && X.off.citas == null ? E2("ENCENDIDO", "ON") : null, tone: "signal", chev: true, onClick: () => c.go("mod", "citas") },
  ];
}
const hL = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;

/* ── Servicios: la lista (asvBlocks) ── */
export function oficiosBloques(c: Ctx): Sec {
  const { E2, es, ui } = c, X = O(c), ord = !!ui.ofOrd, vis = X.servicios.filter((s) => !s.oculto && s.adm == null), nA = X.servicios.filter((s) => s.adm != null).length;
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: E2("Servicios", "Services"), s: E2("Lo que pones aquí es lo que el cliente ve en Servicios y reserva en el Booking.", "What you set here is what clients see in Services and book."), onBack: () => c.go("mod"),
    act: { l: E2("Agregar", "Add"), icon: "plus", onClick: () => c.det("of:new") } }];
  if (X.off.svc != null) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino pausó tus Servicios: no salen en tu página. Motivo: ${X.off.svc}`, `To’Latino paused your Services: they do not show on your page. Reason: ${X.off.svc}`) });
  if (nA) out.push({ type: "note", tone: "danger", icon: "ban", t: nA === 1 ? E2("1 servicio lo ocultó To’Latino: no sale en tu página.", "1 service was hidden by To’Latino: it is not on your page.") : E2(`${nA} servicios los ocultó To’Latino: no salen en tu página.`, `${nA} services were hidden by To’Latino: they are not on your page.`) });
  const pc = X.servicios.length ? Math.round((vis.length / X.servicios.length) * 100) : 0;
  if (X.rubro === "auto") {
    const ps = vis.filter((s) => s.k !== "cotiza").map((s) => (s.k === "lav" && s.a.sz ? s.a.sz[0] : s.cents)).filter((p) => p > 0), dg = vis.find((s) => s.k === "diag"), nq = vis.filter((s) => s.k === "desde" || s.k === "cotiza").length;
    out.push({ type: "rvsum", icon: "wrench", t: E2(`${X.servicios.length} servicios`, `${X.servicios.length} services`), s: E2("Nada se hace ni se cobra sin el OK del cliente: los «desde» y «se cotiza» llevan estimado.", "Nothing is done or charged without the client’s OK: “from” and “quoted” need an estimate."),
      tag: E2(`${X.secciones.length} SECCIONES`, `${X.secciones.length} SECTIONS`), tone: "neutral", progT: E2(`${vis.length} de ${X.servicios.length} se ven en tu página`, `${vis.length} of ${X.servicios.length} show on your page`), progR: `${pc} %`, pct: `${Math.max(vis.length ? 3 : 0, pc)}%`, barC: "var(--tl-signal)",
      stats: [{ k: E2("DESDE", "FROM"), v: ps.length ? money(Math.min(...ps)) : "—", s: E2("el más barato", "the cheapest") }, { k: E2("DIAGNÓSTICO", "DIAGNOSIS"), v: dg ? (dg.cents ? money(dg.cents) : E2("Gratis", "Free")) : "—", s: dg?.a.cred ? E2("se descuenta", "credited") : "" }, { k: E2("CON ESTIMADO", "WITH ESTIMATE"), v: String(nq), s: E2("desde o se cotiza", "from or quoted") }],
      tools: [{ l: E2("Ver página", "View page"), icon: "search", onClick: () => window.open(`/n/${c.d.id}?tab=svc`, "_blank", "noopener") }, { l: E2("Agregar", "Add"), icon: "plus", onClick: () => c.det("of:new") }, { l: ord ? E2("Listo", "Done") : E2("Ordenar", "Reorder"), icon: ord ? "check" : "filter", onClick: () => c.setUi({ ofOrd: !ord }) }] });
  } else {
    const vt = vis.find((s) => s.k === "visita"), emer = vis.filter((s) => s.k === "emer").length, pres = vis.filter((s) => s.k === "pres").length;
    out.push({ type: "rvsum", icon: "home", t: E2(`${X.servicios.length} servicios`, `${X.servicios.length} services`), s: E2("Precio completo antes de empezar. Si algo cambia, le preguntas primero.", "Full price before starting. If something changes, you ask first."),
      tag: E2(`${X.secciones.length} SECCIONES`, `${X.secciones.length} SECTIONS`), tone: "neutral", progT: E2(`${vis.length} de ${X.servicios.length} se ven en tu página`, `${vis.length} of ${X.servicios.length} show on your page`), progR: `${pc} %`, pct: `${Math.max(vis.length ? 3 : 0, pc)}%`, barC: "var(--tl-signal)",
      stats: [{ k: E2("VISITA", "VISIT"), v: vt ? (vt.cents ? money(vt.cents) : E2("Gratis", "Free")) : "—", s: vt?.a.cred ? E2("se descuenta", "credited") : vt?.a.free ? E2("gratis con el arreglo", "free with the repair") : "" }, { k: E2("PRESUPUESTO", "ESTIMATE"), v: String(pres), s: E2("en su casa", "at their home") }, { k: "24/7", v: String(emer), s: E2("emergencias", "emergencies") }],
      tools: [{ l: E2("Ver página", "View page"), icon: "search", onClick: () => window.open(`/n/${c.d.id}?tab=svc`, "_blank", "noopener") }, { l: E2("Agregar", "Add"), icon: "plus", onClick: () => c.det("of:new") }, { l: ord ? E2("Listo", "Done") : E2("Ordenar", "Reorder"), icon: ord ? "check" : "filter", onClick: () => c.setUi({ ofOrd: !ord }) }] });
  }
  const row = (s: Oficio): Fila => ({ key: s.id, ...(s.foto ? { img: `url("${s.foto}")` } : { imgIni: (s.name.es || "?").slice(0, 1).toUpperCase() }), imgW: "44px", t: s.name.es || E2("Sin nombre", "Untitled"), s: detalleL(X.rubro, s, es), r: precioL(s, es),
    tag: s.adm != null ? E2("OCULTO POR TO’LATINO", "HIDDEN BY TO’LATINO") : s.oculto ? E2("OCULTO", "HIDDEN") : null, tone: s.adm != null ? "danger" : "neutral", dim: s.oculto || s.adm != null, tgOn: !s.oculto,
    onTg: () => c.run(() => servicioVisible(c.d.id, s.id, s.oculto), s.oculto ? E2(`«${s.name.es}» ya sale en tu página.`, `“${s.name.es}” now shows on your page.`) : E2(`«${s.name.es}» oculto: no sale ni se reserva.`, `“${s.name.es}” hidden: not shown or booked.`)),
    onClick: () => c.det(`of:${s.id}`), acts: ord ? [{ l: E2("Subir", "Up"), icon: "chevronUp", onClick: () => c.run(() => servicioMover(c.d.id, s.id, -1)) }, { l: E2("Bajar", "Down"), icon: "chevronDown", onClick: () => c.run(() => servicioMover(c.d.id, s.id, 1)) }] : [] });
  if (!X.servicios.length) out.push({ type: "empty", icon: "wrench", t: E2("Todavía no tienes servicios", "No services yet"), s: E2("Agrega lo que haces, cómo lo cobras y cuánto tarda.", "Add what you do, how you charge and how long it takes."), cta: E2("Agregar servicio", "Add service"), onCta: () => c.det("of:new") });
  for (const sec of X.secciones) {
    const L = X.servicios.filter((s) => s.sec === sec.id);
    if (!L.length) continue;
    out.push({ type: "rows", k: `${(es ? sec.name.es : sec.name.en || sec.name.es).toUpperCase()} · ${L.length}`, link: ord ? undefined : E2("Agregar", "Add"), onLink: ord ? undefined : () => c.det(`of:new:${sec.id}`), items: L.map(row) });
  }
  return { blocks: out, ed: null };
}

/* ── Un servicio (asvDet) ── */
type FOf = { name: string; en: string; desc: string; descEn: string; sec: string; newSec: string; k: string; price: string; dur: number; dias: boolean; days: [number, number]; w: string; walk: boolean; per: string;
  cred: boolean; alt: string; free: boolean; mh: number; u: string; min: string; sur: string; fr: string; rng: [string, string]; sz: [string, string, string]; inc: string[][]; no: string[][]; x: { n: string; en: string; p: string; m: number }[]; foto: string | null; visible: boolean };
export function oficioDetalle(c: Ctx, id: string): Sec {
  const { E2, es, ui } = c, X = O(c), auto = X.rubro === "auto", isNew = id === "new" || id.startsWith("new:"), s0 = X.servicios.find((x) => x.id === id), back = () => c.closeDet();
  if (!isNew && !s0) return { blocks: [{ type: "head", t: E2("Ya no está", "No longer here"), onBack: back }], ed: null };
  const lavB = auto && X.servicios.some((s) => s.k === "lav"), domB = auto && X.servicios.some((s) => s.a.w === "dom"), gruaB = auto && X.servicios.some((s) => s.k === "grua");
  const a0: Attrs = s0?.a ?? {};
  const base: FOf = s0 ? {
    name: s0.name.es, en: s0.name.en, desc: s0.desc.es, descEn: s0.desc.en, sec: s0.sec ?? "", newSec: "", k: s0.k, price: dol(s0.cents), dur: s0.dur ?? 60, dias: !!a0.days, days: a0.days ?? [1, 2], w: a0.w ?? "espera", walk: !!a0.walk, per: a0.per ?? "",
    cred: !!a0.cred, alt: dol(a0.alt), free: !!a0.free, mh: a0.mh ?? 1, u: a0.u ?? "pie2", min: dol(a0.min), sur: dol(a0.sur), fr: a0.fr ?? "mes", rng: [dol(a0.rng?.[0]), dol(a0.rng?.[1])], sz: [dol(a0.sz?.[0]), dol(a0.sz?.[1]), dol(a0.sz?.[2])],
    inc: (a0.inc ?? []).map((z) => [z.es, z.en]), no: (a0.no ?? []).map((z) => [z.es, z.en]), x: (a0.x ?? []).map((z) => ({ n: z.n.es, en: z.n.en, p: dol(z.p), m: z.m })), foto: s0.foto, visible: !s0.oculto,
  } : { name: "", en: "", desc: "", descEn: "", sec: id.startsWith("new:") ? id.slice(4) : X.secciones[0]?.id ?? "", newSec: X.secciones.length ? "" : auto ? "Taller" : E2("Servicios", "Services"), k: auto ? (lavB ? "lav" : "fijo") : "visita", price: auto ? "50" : "89",
    dur: 60, dias: false, days: [1, 2], w: domB ? "dom" : "espera", walk: false, per: "", cred: !auto, alt: "", free: false, mh: 1, u: "pie2", min: "", sur: "", fr: "mes", rng: auto ? ["500", "900"] : ["", ""], sz: ["20", "25", "30"], inc: [], no: [], x: [], foto: null, visible: true };
  const F = c.form<FOf>(`det:of:${id}`, base), d = F.d, setF = F.set, out: (Bloque | null)[] = [];
  if (s0?.adm != null) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`To’Latino ocultó este servicio: no sale en tu página. Motivo: ${s0.adm}`, `To’Latino hid this service: it is not on your page. Reason: ${s0.adm}`) });
  const secName = X.secciones.find((s) => s.id === d.sec)?.name.es ?? d.newSec;
  out.push({ type: "head", eye: `${E2("SERVICIO", "SERVICE")}${secName ? ` · ${secName.toUpperCase()}` : ""}`, t: isNew ? E2("Nuevo servicio", "New service") : s0!.name.es, s: isNew ? E2("Con nombre, cómo lo cobras y el tiempo ya se puede reservar.", "Name, how you charge and the time are enough to book.") : undefined, onBack: back });
  out.push({ type: "photos", k: E2("FOTO · LA VE EL CLIENTE EN SERVICIOS Y AL RESERVAR", "PHOTO · CLIENTS SEE IT IN SERVICES AND WHEN BOOKING"), count: `${d.foto ? 1 : 0}/1`, cols: 3, items: d.foto ? [{ key: d.foto, bg: `url("${d.foto}")`, onClick: () => setF({ foto: null }) }] : [],
    addL: E2("Subir foto", "Upload photo"), onAdd: d.foto ? undefined : () => c.pickFiles(false, async (fs) => { const r = await subirFoto(fs[0]!); if (r.ok && r.url) setF({ foto: r.url }); else c.toast(r.mensaje ? r.mensaje[es ? "es" : "en"] : E2("No se pudo subir la foto.", "Couldn’t upload the photo.")); }) });
  const gal = c.d.fotos.map((x) => x.url);
  if (gal.length && !d.foto) { out.push({ type: "acts", items: [{ l: ui.ofGal ? E2("Cerrar tu galería", "Close your gallery") : E2("Elegir de tu galería", "Pick from your gallery"), icon: "image", onClick: () => c.setUi({ ofGal: !ui.ofGal }) }] });
    if (ui.ofGal) out.push({ type: "photos", cols: 4, items: gal.slice(0, 12).map((ph) => ({ key: ph, bg: `url("${ph}")`, onClick: () => { setF({ foto: ph }); c.setUi({ ofGal: false }); } })) }); }
  const fld = (k: string, val: string, set: (v: string) => void, max: number, ph?: string, area?: boolean): Bloque => ({ type: "field", k, val, area, rows: 2, max, ph, count: `${val.length}/${max}`, onChange: (v) => set(v.slice(0, max)) });
  const usd = (k: string, val: string, set: (v: string) => void, help?: string, ph?: string): Bloque => ({ type: "field", k, val, pre: "$", im: "decimal", help, ph: ph ?? "0", onChange: (v) => set(num(v)) });
  out.push({ type: "group", k: E2("NOMBRE Y DESCRIPCIÓN", "NAME AND DESCRIPTION") }, fld(E2("NOMBRE", "NAME"), d.name, (v) => setF({ name: v }), 50, auto ? E2("Ej. Cambio de aceite", "e.g. Oil change") : E2("Ej. Cambiar grifo", "e.g. Replace faucet")),
    fld(E2("QUÉ SE HACE · OPCIONAL", "WHAT IS DONE · OPTIONAL"), d.desc, (v) => setF({ desc: v }), 140, auto ? E2("Ej. Hasta 5 cuartos, filtro nuevo y revisión de 20 puntos", "e.g. Up to 5 quarts, new filter and 20-point check") : E2("Ej. Cocina o baño. Llevamos el grifo o pones el tuyo.", "e.g. Kitchen or bathroom. We bring one or use yours."), true));
  const nueva = !X.secciones.some((s) => s.id === d.sec);
  out.push({ type: "group", k: E2("SECCIÓN", "SECTION") }, { type: "chips", items: [...X.secciones.map((s) => ({ l: s.name.es, v: d.sec === s.id ? "selected" : "filter", onClick: () => setF({ sec: s.id, newSec: "" }) })), { l: `+ ${E2("Nueva", "New")}`, v: nueva ? "selected" : "filter", onClick: () => setF({ sec: "", newSec: d.newSec }) }] });
  if (nueva) out.push(fld(E2("NUEVA SECCIÓN", "NEW SECTION"), d.newSec, (v) => setF({ newSec: v }), 30, auto ? E2("Ej. Suspensión, Eléctrico", "e.g. Suspension, Electrical") : E2("Ej. Plomería, Calentadores", "e.g. Plumbing, Water heaters")));
  // Cómo lo cobras (en Auto, el lavado y la grúa solo si el negocio ya los hace, como el diseño).
  const KS = formas(c, X.rubro).filter(([k]) => k === d.k || !auto || (k === "lav" ? lavB : k === "grua" ? gruaB : !lavB || k === "fijo"));
  out.push({ type: "group", k: E2("CÓMO LO COBRAS", "HOW YOU CHARGE") }, { type: "rows", items: KS.map(([k, l, s2]) => { const pick = () => setF({ k, ...(k === "grua" ? { w: "call", walk: false } : d.w === "call" ? { w: "espera" } : {}) }); return { t: l, s: s2, compact: true, chev: false, onClick: pick, sel: { on: d.k === k, onClick: pick } }; }) });
  if (d.k === "cotiza" || d.k === "pres") out.push(usd(E2("SUELE SALIR DESDE", "USUALLY FROM"), d.rng[0], (v) => setF({ rng: [v, d.rng[1]] }), d.k === "cotiza" ? E2("El rango que ve el cliente antes del diagnóstico.", "The range clients see before the diagnosis.") : E2("Opcional: el rango que ve el cliente antes de que vayas.", "Optional: the range clients see before you go.")), usd(E2("HASTA", "UP TO"), d.rng[1], (v) => setF({ rng: [d.rng[0], v] })));
  if (d.k === "lav") ([E2("CARRO", "CAR"), E2("SUV O PICKUP", "SUV OR PICKUP"), E2("VAN O 3 FILAS", "VAN OR 3 ROWS")] as string[]).forEach((l, i) => out.push(usd(l, d.sz[i]!, (v) => { const z = [...d.sz] as FOf["sz"]; z[i] = v; setF({ sz: z }); }, i ? undefined : E2("El cliente ve el precio de su tamaño.", "Clients see the price for their size."))));
  if (d.k !== "cotiza" && d.k !== "lav") {
    const pl = d.k === "desde" ? E2("DESDE", "FROM") : d.k === "diag" ? E2("PRECIO DEL DIAGNÓSTICO", "DIAGNOSIS PRICE") : d.k === "grua" ? E2("REMOLQUE HASTA 10 MILLAS", "TOW UP TO 10 MILES") : d.k === "visita" ? E2("PRECIO DE LA VISITA", "VISIT PRICE")
      : d.k === "hora" ? E2("PRECIO POR HORA", "PRICE PER HOUR") : d.k === "area" ? E2(`PRECIO POR ${UNIT[d.u]![0].toUpperCase()}`, `PRICE PER ${UNIT[d.u]![1].toUpperCase()}`) : d.k === "pres" ? E2("LA VISITA PARA MEDIR · 0 = GRATIS", "THE MEASURING VISIT · 0 = FREE") : d.k === "emer" ? E2("LA SALIDA", "THE CALL-OUT") : d.k === "plan" ? E2("PRECIO DEL PLAN", "PLAN PRICE") : E2("PRECIO", "PRICE");
    const ph = d.k === "desde" ? E2("El mínimo. Lo que salga de más va en el estimado y el cliente lo aprueba.", "The minimum. Anything more goes in the estimate for the client to approve.") : d.k === "diag" && !cts(d.price) ? E2("En 0 es gratis si hace el arreglo contigo.", "At 0 it is free if they do the repair with you.") : undefined;
    out.push(usd(pl, d.price, (v) => setF({ price: v }), ph));
  }
  if ((d.k === "diag" && cts(d.price)) || d.k === "visita" || d.k === "pres") out.push({ type: "rows", items: [{ icon: "dollar", t: E2("Se descuenta si lo arreglan aquí", "Credited if they fix it here"), s: d.cred ? E2("El cliente lo ve en Servicios y en el estimado.", "Clients see it in Services and in the estimate.") : E2("Apagado: se cobra aparte.", "Off: it is charged separately."), tgOn: d.cred, onTg: () => setF({ cred: !d.cred }) }] });
  if (d.k === "visita") out.push({ type: "rows", items: [{ icon: "check", t: E2("Gratis si hacen el arreglo contigo", "Free if they do the repair with you"), s: d.free ? E2("Si no, se cobra la visita.", "Otherwise, the visit is charged.") : E2("Apagado.", "Off."), tgOn: d.free, onTg: () => setF({ free: !d.free }) }] });
  if (d.k === "diag" && !cts(d.price)) out.push(usd(E2("SI NO HACE EL ARREGLO CONTIGO", "IF THEY DO NOT DO THE REPAIR WITH YOU"), d.alt, (v) => setF({ alt: v })));
  if (auto && ["fijo", "desde", "goma"].includes(d.k)) out.push({ type: "chips", k: E2("EL PRECIO ES", "THE PRICE IS"), items: ([["", E2("Por el trabajo", "Per job")], ["eje", E2("Por eje", "Per axle")], ["goma", E2("Por goma", "Per tire")], ["sensor", E2("Por sensor", "Per sensor")]] as [string, string][]).map(([k, l]) => ({ l, v: d.per === k ? "selected" : "filter", onClick: () => setF({ per: k }) })) });
  if (d.k === "hora") out.push({ type: "step", t: E2("Mínimo de horas", "Minimum hours"), s: E2("Lo que cobras aunque termines antes.", "What you charge even if you finish earlier."), v: `${d.mh} h`, onM: () => setF({ mh: Math.max(1, d.mh - 1) }), onP: () => setF({ mh: Math.min(8, d.mh + 1) }) });
  if (d.k === "area") out.push({ type: "chips", k: E2("POR", "PER"), items: Object.entries(UNIT).map(([k, l]) => ({ l: es ? l[0] : l[1], v: d.u === k ? "selected" : "filter", onClick: () => setF({ u: k }) })) }, usd(E2("MÍNIMO · OPCIONAL", "MINIMUM · OPTIONAL"), d.min, (v) => setF({ min: v })));
  if (d.k === "emer") out.push(usd(E2("RECARGO INCLUIDO · OPCIONAL", "SURCHARGE INCLUDED · OPTIONAL"), d.sur, (v) => setF({ sur: v }), E2("El cliente ve que la salida ya lo incluye.", "Clients see the call-out already includes it.")));
  if (d.k === "plan") out.push({ type: "chips", k: E2("SE COBRA", "BILLED"), items: ([["mes", E2("Cada mes", "Monthly")], ["temp", E2("Por temporada", "Per season")]] as [string, string][]).map(([k, l]) => ({ l, v: d.fr === k ? "selected" : "filter", onClick: () => setF({ fr: k }) })) });
  if (d.k !== "grua") {
    const MS = [15, 20, 30, 45, 60, 90, 120, 180, 240];
    out.push({ type: "group", k: E2("TIEMPO", "TIME") }, { type: "chips", items: ([[false, E2("En minutos u horas", "Minutes or hours")], [true, E2("En días", "In days")]] as [boolean, string][]).map(([k, l]) => ({ l, v: d.dias === k ? "selected" : "filter", onClick: () => setF({ dias: k }) })) });
    if (d.dias) out.push({ type: "step", t: E2("Desde", "From"), s: auto ? E2("Días hábiles en el taller.", "Business days at the shop.") : E2("Días de trabajo en la casa.", "Work days at the home."), v: `${d.days[0]} ${E2("días", "days")}`, onM: () => setF({ days: [Math.max(1, d.days[0] - 1), d.days[1]] }), onP: () => setF({ days: [Math.min(30, d.days[0] + 1), Math.max(d.days[1], Math.min(30, d.days[0] + 1))] }) },
      { type: "step", t: E2("Hasta", "Up to"), v: `${d.days[1]} ${E2("días", "days")}`, onM: () => setF({ days: [Math.min(d.days[0], Math.max(1, d.days[1] - 1)), Math.max(1, d.days[1] - 1)] }), onP: () => setF({ days: [d.days[0], Math.min(30, d.days[1] + 1)] }) });
    else {
      out.push({ type: "chips", k: E2("DURA", "TAKES"), items: [...MS.map((n) => ({ l: n < 60 ? `${n} min` : `${n / 60} h`, v: d.dur === n ? "selected" : "filter", onClick: () => setF({ dur: n }) })), { l: E2("Otro", "Other"), v: MS.includes(d.dur) ? "filter" : "selected", onClick: () => setF({ dur: MS.includes(d.dur) ? Math.min(600, d.dur + 5) : d.dur }) }] });
      if (!MS.includes(d.dur)) out.push({ type: "step", t: E2("Minutos", "Minutes"), v: `${d.dur} min`, onM: () => setF({ dur: Math.max(5, d.dur - 5) }), onP: () => setF({ dur: Math.min(600, d.dur + 5) }) });
    }
    if (auto) {
      const WS: [string, string][] = [["espera", E2("Espera en el taller", "Waits at the shop")], ["deja", E2("Lo deja", "Drops it off")], ["ambos", E2("Elige: espera o lo deja", "Chooses: wait or drop off")], ...(domB ? [["dom", E2("Vas donde está el carro", "You go to the car")] as [string, string]] : [])];
      out.push({ type: "chips", k: E2("EL CLIENTE", "THE CLIENT"), items: WS.map(([k, l]) => ({ l, v: d.w === k ? "selected" : "filter", onClick: () => setF({ w: k }) })) },
        { type: "rows", items: [{ icon: "clock", t: E2("Solo sin cita", "Walk-in only"), s: d.walk ? E2("No sale el Booking: el cliente llega y espera turno.", "No Booking: the client comes in and waits.") : E2("Apagado: se reserva con Booking.", "Off: it is booked with Booking."), tgOn: d.walk, onTg: () => setF({ walk: !d.walk }) }] });
    }
  }
  const lst = (key: "inc" | "no", k: string, ph: string, max: number) => {
    const L = d[key];
    out.push({ type: "group", k });
    L.forEach((z, i) => out.push(fld(`${E2("LÍNEA ", "LINE ")}${i + 1}`, z[0] ?? "", (v) => { const a = L.map((q) => [...q]); a[i] = [v, a[i]![1] ?? ""]; setF({ [key]: a } as Partial<FOf>); }, 90, ph)));
    out.push({ type: "acts", items: [L.length < max ? { l: E2("Agregar línea", "Add line"), icon: "plus", onClick: () => setF({ [key]: [...L, ["", ""]] } as Partial<FOf>) } : null, L.length ? { l: E2("Quitar la última", "Remove the last one"), v: "secondary", icon: "trash", onClick: () => setF({ [key]: L.slice(0, -1) } as Partial<FOf>) } : null].filter(Boolean) as never });
  };
  lst("inc", E2("INCLUYE · OPCIONAL", "INCLUDES · OPTIONAL"), auto ? E2("Ej. Filtro nuevo", "e.g. New filter") : E2("Ej. Revisión con cámara si hace falta", "e.g. Camera check if needed"), 5);
  lst("no", E2("NO INCLUYE · OPCIONAL", "NOT INCLUDED · OPTIONAL"), auto ? E2("Ej. Discos gastados: en el estimado", "e.g. Worn rotors: in the estimate") : E2("Ej. Llaves de paso: $45 cada una, con tu OK", "e.g. Shutoff valves: $45 each, with your OK"), 4);
  if (d.k !== "grua" && d.k !== "plan") {
    out.push({ type: "group", k: E2("EXTRAS · EL CLIENTE LOS SUMA AL RESERVAR", "EXTRAS · CLIENTS ADD THEM WHEN BOOKING") });
    d.x.forEach((z, i) => { const set = (p: Partial<FOf["x"][number]>) => setF({ x: d.x.map((q, j) => (j === i ? { ...q, ...p } : q)) });
      out.push(fld(`${E2("EXTRA ", "EXTRA ")}${i + 1}`, z.n, (v) => set({ n: v }), 50, auto ? E2("Ej. Rotación de gomas", "e.g. Tire rotation") : E2("Ej. Llave de paso nueva", "e.g. New shutoff valve")), usd(E2("SE SUMA", "ADDS"), z.p, (v) => set({ p: v })),
        { type: "step", t: E2("Tiempo de más", "Extra time"), v: `${z.m} min`, onM: () => set({ m: Math.max(0, z.m - 5) }), onP: () => set({ m: Math.min(240, z.m + 5) }) }); });
    out.push({ type: "acts", items: [d.x.length < 6 ? { l: E2("Agregar extra", "Add extra"), icon: "plus", onClick: () => setF({ x: [...d.x, { n: "", en: "", p: "10", m: 10 }] }) } : null, d.x.length ? { l: E2("Quitar el último", "Remove the last one"), v: "secondary", icon: "trash", onClick: () => setF({ x: d.x.slice(0, -1) }) } : null].filter(Boolean) as never });
  }
  if (s0?.opts.length) out.push({ type: "note", tone: "info", icon: "filter", t: `${E2("El cliente elige: ", "The client chooses: ")}${s0.opts.map((g) => `${g.t.es} (${g.o.map((o) => `${o.n.es}${o.p ? ` ${o.p > 0 ? "+" : "−"}${money(Math.abs(o.p))}` : ""}`).join(", ")})`).join(" · ")}${E2(". Para cambiar estas opciones, escríbenos.", ". To change these options, write to us.")}` });
  out.push({ type: "group", k: E2("EN INGLÉS · OPCIONAL", "IN ENGLISH · OPTIONAL") }, fld(E2("NOMBRE EN INGLÉS", "NAME IN ENGLISH"), d.en, (v) => setF({ en: v }), 50, E2("Si lo dejas vacío, sale en español.", "Leave empty to show the Spanish one.")));
  if (d.desc.trim()) out.push(fld(E2("QUÉ SE HACE EN INGLÉS", "WHAT IS DONE IN ENGLISH"), d.descEn, (v) => setF({ descEn: v }), 140, "", true));
  out.push({ type: "group", k: E2("EN TU PÁGINA", "ON YOUR PAGE") }, { type: "rows", items: [{ icon: "search", t: E2("Se ve en tu página", "Shows on your page"), s: d.visible ? E2("Sale en Servicios y se puede reservar.", "Shows in Services and can be booked.") : E2("Apagado: no sale ni se reserva. Queda guardado.", "Off: not shown or booked. It stays saved."), tgOn: d.visible, onTg: () => setF({ visible: !d.visible }) }] });
  // Lo que se manda al servidor (que vuelve a validar todo) y la vista previa con los mismos datos.
  const attrs = (): Attrs => ({
    ...(d.dias && d.k !== "grua" ? { days: d.days } : {}), ...(auto ? { w: d.k === "grua" ? "call" : d.w as Attrs["w"], ...(d.walk && d.k !== "grua" ? { walk: true } : {}), ...(["fijo", "desde", "goma"].includes(d.k) && d.per ? { per: d.per as Attrs["per"] } : {}) } : {}),
    ...(d.cred ? { cred: true } : {}), ...(d.free && d.k === "visita" ? { free: true } : {}), ...(d.k === "diag" && !cts(d.price) ? { alt: cts(d.alt) } : {}), ...(d.k === "hora" ? { mh: d.mh } : {}), ...(d.k === "area" ? { u: d.u as Attrs["u"], ...(cts(d.min) ? { min: cts(d.min) } : {}) } : {}),
    ...(d.k === "emer" && cts(d.sur) ? { sur: cts(d.sur) } : {}), ...(d.k === "plan" ? { fr: d.fr as Attrs["fr"] } : {}), ...((d.k === "cotiza" || d.k === "pres") && cts(d.rng[0]) && cts(d.rng[1]) ? { rng: [cts(d.rng[0]), cts(d.rng[1])] as [number, number] } : {}),
    ...(d.k === "lav" ? { sz: d.sz.map(cts) as [number, number, number] } : {}), ...(a0.sym ? { sym: a0.sym } : {}),
    inc: d.inc.filter((z) => (z[0] ?? "").trim()).map((z): Bi => ({ es: z[0]!.trim(), en: (z[1] ?? "").trim() })), no: d.no.filter((z) => (z[0] ?? "").trim()).map((z): Bi => ({ es: z[0]!.trim(), en: (z[1] ?? "").trim() })),
    x: d.x.filter((z) => z.n.trim()).map((z) => ({ n: { es: z.n.trim(), en: z.en.trim() }, p: cts(z.p), m: z.m })),
  });
  const cents = d.k === "cotiza" ? cts(d.rng[0]) : d.k === "lav" ? cts(d.sz[0]) : cts(d.price), pv = { k: d.k, cents, dur: d.dias || d.k === "grua" ? null : d.dur, a: attrs() };
  out.push({ type: "rows", k: E2("ASÍ LO VE EL CLIENTE", "HOW THE CLIENT SEES IT"), items: [{ ...(d.foto ? { img: `url("${d.foto}")` } : { imgIni: (d.name || "?").slice(0, 1).toUpperCase() }), imgW: "44px", t: (es ? d.name : d.en || d.name) || E2("Nombre del servicio", "Service name"), s: detalleL(X.rubro, pv, es), r: precioL(pv, es),
    m: d.k === "grua" ? E2("BOTÓN «LLAMAR»", "“CALL” BUTTON") : d.walk ? E2("SIN BOOKING · LLEGA Y ESPERA", "NO BOOKING · WALK IN") : "BOOKING", chev: false }] });
  const miss = [d.name.trim().length < 2 ? E2("el nombre", "the name") : null, !d.sec && !d.newSec.trim() ? E2("la sección", "the section") : null,
    d.k === "cotiza" ? (!(cts(d.rng[0]) > 0 && cts(d.rng[1]) >= cts(d.rng[0])) ? E2("el rango", "the range") : null) : d.k === "lav" ? (!d.sz.every((v) => cts(v) > 0) ? E2("el precio de cada tamaño", "the price for each size") : null)
      : d.k === "diag" ? (!(cts(d.price) > 0 || cts(d.alt) > 0) ? E2("el precio si no hace el arreglo contigo", "the price if they do not repair with you") : null)
      : ["desde", "hora", "area", "emer", "plan"].includes(d.k) && !cts(d.price) ? E2("el precio", "the price") : null].filter(Boolean);
  if (miss.length && (F.dirty || isNew)) out.push({ type: "note", tone: "warn", t: `${E2("Para guardar falta: ", "To save, add: ")}${miss.join(" · ")}.` });
  const tail = s0 ? [ui.ofDel === s0.id ? { l: E2(`Sí, quitar «${s0.name.es}»`, `Yes, remove “${s0.name.es}”`), v: "danger", icon: "trash", onClick: () => c.run(() => servicioQuitar(c.d.id, s0.id), E2("Quitado. Las citas ya hechas lo conservan.", "Removed. Bookings already made keep it."), () => { c.setUi({ ofDel: null }); back(); }) }
    : { l: E2("Quitar servicio", "Remove service"), v: "secondary", icon: "trash", onClick: () => c.setUi({ ofDel: s0.id }) }, ...(ui.ofDel === s0.id ? [{ l: "No", v: "secondary", onClick: () => c.setUi({ ofDel: null }) }] : [])] : [];
  const apply = (x: FOf) => oficioGuardar(c.d.id, s0 ? s0.id : "new", { name: x.name, en: x.en, desc: x.desc, descEn: x.descEn, sec: x.sec, newSec: x.newSec, k: x.k, cents, dur: pv.dur, a: attrs(), foto: x.foto, visible: x.visible } satisfies OficioForm);
  return { blocks: out, tail: tail.length ? [{ type: "acts", items: tail }] : [], ed: { F, l: isNew ? E2("Agregar", "Add") : E2("Guardar", "Save"), valid: !miss.length, always: isNew, apply, onDone: back, toast: E2("Guardado · el cliente ya lo ve así.", "Saved · clients see it like this now.") } };
}

/* ── Tu herramienta (blocksB): cada toque se guarda ── */
export function herramientaBloques(c: Ctx): Sec {
  const { E2 } = c, X = O(c), A = X.rubro === "auto", S = X.tool;
  const lock = (t: string, s: string): Fila => ({ icon: "lock", ibg: "rgba(11,14,18,.06)", ifg: "var(--tl-ink)", t, s, compact: true });
  const cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined;
  const save = (p: Parameters<typeof herramientaGuardar>[1]) => c.run(() => herramientaGuardar(c.d.id, p), E2("Guardado · tu página ya lo dice.", "Saved · your page says so now."));
  const planesL = X.servicios.filter((s) => s.k === "plan" && s.adm == null);
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), t: A ? E2("Taller y estimados", "Shop and estimates") : E2("Visitas, planes y renta", "Visits, plans and rentals"),
    s: A ? E2("Tu tarifa, la garantía y a qué hora entregas el mismo día. El estimado le llega al cliente línea por línea y nada se hace sin su OK.", "Your rate, warranty and same-day cutoff. Customers get the estimate line by line and nothing is done without their OK.")
      : E2("Tu tarifa, hasta dónde vas, emergencias, tus planes y lo que rentas.", "Your rate, how far you go, emergencies, your plans and what you rent."), onBack: () => c.go("mod") },
    { type: "step", t: E2("Mano de obra por hora", "Labor per hour"), s: E2("Con esto se arma cada línea del estimado.", "Every estimate line is built with this."), v: money(S.rate), onM: () => save({ rate: Math.max(4000, S.rate - 500) }), onP: () => save({ rate: Math.min(25000, S.rate + 500) }) }];
  if (A) {
    out.push({ type: "chips", k: E2("GARANTÍA DEL TRABAJO", "WORK WARRANTY"), items: ([[3, 3000], [12, 12000], [24, 24000]] as [number, number][]).map((w) => ({ l: `${w[0]}${E2(" meses · ", " months · ")}${w[1].toLocaleString("en-US")} mi`, v: S.warrM === w[0] && S.warrMi === w[1] ? "selected" : "filter", onClick: () => save({ warr: w }) })) },
      { type: "chips", k: E2("LISTO EL MISMO DÍA SI LO DEJAN ANTES DE", "SAME DAY IF DROPPED OFF BY"), items: [11, 12, 14, 15].map((h) => ({ l: hL(h), v: S.cut === h ? "selected" : "filter", onClick: () => save({ cut: h }) })) },
      { type: "rows", k: E2("REGLAS DEL ESTIMADO · NO SE APAGAN", "ESTIMATE RULES · ALWAYS ON"), cols: cols2, items: [lock(E2("Línea por línea", "Line by line"), E2("Necesario · recomendado · puede esperar, con pieza y mano de obra.", "Needed · recommended · can wait, with part and labor.")),
        lock(E2("Nada extra sin su OK", "Nothing extra without their OK"), E2("Cada extra va con foto y precio; si dice que no, no se hace.", "Each extra comes with a photo and price; if they say no, it is not done.")),
        lock(E2("Impuesto solo en piezas", "Tax on parts only"), E2("6 % de PA sobre las piezas, no sobre la mano de obra.", "6% PA tax on parts, not on labor.")), lock(E2("Piezas viejas", "Old parts"), E2("Se le entregan al cliente al recoger.", "Handed to the customer at pickup."))] },
      { type: "note", tone: "info", icon: "info", t: E2("El diagnóstico se descuenta del trabajo si el cliente lo aprueba.", "The diagnosis is credited if the customer approves the work.") });
  } else {
    out.push({ type: "chips", k: E2("HASTA DÓNDE VAS", "HOW FAR YOU GO"), items: [10, 15, 20, 30].map((z) => ({ l: `${z} mi`, v: S.zone === z ? "selected" : "filter", onClick: () => save({ zone: z }) })) },
      { type: "rows", items: [{ icon: "emergency", t: E2("Emergencias 24 h", "24 h emergencies"), s: E2("Sale en «Emergencia en casa» con su precio.", "Shows under “Home emergency” with its price."), tgOn: S.h24, onTg: () => save({ h24: !S.h24 }) }] },
      // dash2-cat.js blocksB: un interruptor por plan y por artículo que renta (apagado = no sale en tu página; lo ya empezado sigue).
      planesL.length ? { type: "rows", k: E2("PLANES · COBRO CADA MES", "PLANS · BILLED MONTHLY"), cols: cols2, items: planesL.map((p): Fila => ({ icon: "calendar", t: c.es ? p.name.es : p.name.en || p.name.es, s: E2(`${money(p.cents)} al mes · primer cobro el día de la primera visita`, `${money(p.cents)} a month · first charge on the first visit`), tgOn: !p.oculto,
        onTg: () => c.run(() => servicioVisible(c.d.id, p.id, p.oculto), p.oculto ? E2("El plan ya sale en tu página.", "The plan now shows on your page.") : E2("Plan apagado: no sale en tu página. Los que ya lo tienen siguen.", "Plan off: not on your page. Existing plans continue.")) })) } : null,
      X.rentas.length ? { type: "rows", k: E2("RENTA DE HERRAMIENTA · APARTADA 48 H", "TOOL RENTAL · HELD 48 H"), cols: cols2, items: X.rentas.map((r): Fila => ({ icon: "wrench", t: c.es ? r.n.es : r.n.en || r.n.es, s: E2(`${money(r.p)} por día · depósito ${money(r.dep)} (se libera al devolver)`, `${money(r.p)} a day · deposit ${money(r.dep)} (released on return)`), tgOn: r.on,
        onTg: () => c.run(() => rentaVisible(c.d.id, r.id, !r.on), r.on ? E2("Apagado: no sale en tu Tienda. Lo ya apartado sigue.", "Off: not in your Shop. Existing holds continue.") : E2("Ya sale en tu Tienda.", "Now shows in your Shop.")) })) } : null,
      { type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: [lock(E2("Precio completo antes de empezar", "Full price before starting"), E2("Presupuesto por línea; materiales con precio antes de comprarlos.", "Line-by-line quote; materials priced before buying.")),
        lock(E2("La visita se descuenta", "The visit is credited"), E2("Si el cliente aprueba el trabajo.", "If the customer approves the work.")), lock(E2("Impuesto solo en materiales", "Tax on materials only"), E2("6 % de PA sobre materiales.", "6% PA tax on materials."))] });
  }
  return { blocks: out, ed: null };
}

/* ── Citas de un taller o servicio del hogar (Panel v2 · citas, con el depósito de DEP: por forma, trabajo grande y mínimo) ── */
type FCo = { auto: boolean; resp: number; dep: string; cxh: number; pick: boolean; kinds: string[]; big: boolean; bigOver: string; bigAmt: string; min: string };
export function citasOficioBloques(c: Ctx): Sec {
  const { E2 } = c, X = O(c), p = X.pol;
  const F = c.form<FCo>("cito", { auto: p.auto, resp: p.resp, dep: dol(p.dep), cxh: p.cxh, pick: p.pick, kinds: p.kinds ?? [], big: p.big != null, bigOver: dol(p.bigOver), bigAmt: dol(p.big), min: dol(p.min) }), d = F.d;
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: E2("Citas", "Bookings"), s: E2("Cómo te piden cita en tu página: si confirmas tú, el depósito y hasta cuándo se cancela gratis.", "How clients book on your page: whether you confirm, the deposit and the free cancellation window."), onBack: () => c.go("mod") }];
  if (X.off.citas != null) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino pausó tus Citas: tu página no recibe solicitudes en línea. Motivo: ${X.off.citas}`, `To’Latino paused your Bookings: your page takes no online requests. Reason: ${X.off.citas}`) });
  else if (!X.on) out.push({ type: "note", tone: "warn", icon: "calendar", t: E2("Citas está apagado: tu página no recibe solicitudes en línea.", "Bookings is off: your page takes no online requests."), cta: E2("Encender", "Turn on"), onCta: () => c.run(() => citasModulo(c.d.id, true), E2("Citas encendido.", "Bookings on.")) });
  out.push({ type: "rows", items: [{ icon: "check", t: E2("Aprobar citas al instante", "Approve bookings instantly"), s: E2("Apagado: tú confirmas cada una. Recomendado.", "Off: you confirm each one. Recommended."), tgOn: d.auto, onTg: () => F.set({ auto: !d.auto }) }] });
  if (!d.auto) out.push({ type: "chips", k: E2("TARDAS EN CONTESTAR", "YOU REPLY IN"), help: E2(`EL CLIENTE LO VE EN TU PÁGINA · SI NO CONTESTAS EN ${p.exp} HORAS, LA SOLICITUD VENCE Y SE DEVUELVE EL DEPÓSITO`, `CLIENTS SEE IT ON YOUR PAGE · IF YOU DON’T REPLY IN ${p.exp} HOURS, THE REQUEST EXPIRES AND THE DEPOSIT IS REFUNDED`),
    items: ([[15, "15 min"], [30, "30 min"], [60, "1 h"], [180, "3 h"]] as [number, string][]).map(([n, l]) => ({ l, v: d.resp === n ? "selected" : "filter", onClick: () => F.set({ resp: n }) })) });
  out.push({ type: "group", k: E2("DEPÓSITO AL PEDIR LA CITA", "DEPOSIT WHEN BOOKING") },
    { type: "field", k: E2("DEPÓSITO", "DEPOSIT"), val: d.dep, pre: "$", im: "numeric", ph: "0", help: E2("De 5 en 5. Se cobra al enviar y se descuenta del total; si no confirmas, se devuelve. En 0, sin depósito.", "In steps of 5. Charged when sent and taken off the total; refunded if you don’t confirm. At 0, no deposit."), onChange: (v) => F.set({ dep: v.replace(/\D/g, "").slice(0, 3) }) });
  if (cts(d.dep)) {
    const KS = formas(c, X.rubro).filter(([k]) => (X.rubro === "auto" ? ["fijo", "diag", "lav", "goma", "insp"] : ["visita", "fijo", "hora", "area", "pres"]).includes(k));
    out.push({ type: "chips", k: E2("SOLO EN · VACÍO = EN TODOS", "ONLY ON · EMPTY = ALL"), items: KS.map(([k, l]) => ({ l, v: d.kinds.includes(k) ? "selected" : "filter", onClick: () => F.set({ kinds: d.kinds.includes(k) ? d.kinds.filter((x) => x !== k) : [...d.kinds, k] }) })) },
      { type: "rows", items: [{ icon: "dollar", t: E2("Más depósito en trabajos grandes", "Bigger deposit on big jobs"), s: d.big ? E2("Desde el precio que pongas, el depósito es otro.", "From the price you set, the deposit is different.") : E2("Apagado.", "Off."), tgOn: d.big, onTg: () => F.set({ big: !d.big }) }] });
    if (d.big) out.push({ type: "field", k: E2("TRABAJO GRANDE · DESDE", "BIG JOB · FROM"), val: d.bigOver, pre: "$", im: "numeric", ph: "1000", onChange: (v) => F.set({ bigOver: v.replace(/\D/g, "").slice(0, 6) }) },
      { type: "field", k: E2("DEPÓSITO DEL TRABAJO GRANDE", "BIG JOB DEPOSIT"), val: d.bigAmt, pre: "$", im: "numeric", ph: "150", onChange: (v) => F.set({ bigAmt: v.replace(/\D/g, "").slice(0, 5) }) });
    out.push({ type: "field", k: E2("SOLO SI EL TRABAJO CUESTA DESDE · OPCIONAL", "ONLY IF THE JOB COSTS FROM · OPTIONAL"), val: d.min, pre: "$", im: "numeric", ph: "0", onChange: (v) => F.set({ min: v.replace(/\D/g, "").slice(0, 6) }) });
  }
  out.push({ type: "chips", k: E2("CANCELAR GRATIS HASTA", "FREE CANCELLATION UP TO"), help: E2("SI CANCELAN MÁS TARDE O NO ESTÁN, EL DEPÓSITO SE QUEDA CONTIGO", "IF THEY CANCEL LATER OR ARE NOT THERE, YOU KEEP THE DEPOSIT"),
    items: ([[2, E2("2 h antes", "2 h before")], [4, E2("4 h antes", "4 h before")], [12, E2("12 h antes", "12 h before")], [24, E2("24 h antes", "24 h before")], [72, E2("3 días antes", "3 days before")]] as [number, string][]).map(([n, l]) => ({ l, v: d.cxh === n ? "selected" : "filter", onClick: () => F.set({ cxh: n }) })) });
  if (X.on && X.off.citas == null) out.push({ type: "acts", items: [{ l: E2("Apagar Citas", "Turn off Bookings"), v: "ghost", icon: "ban", onClick: () => c.run(() => citasModulo(c.d.id, false), E2("Citas apagado: tu página no recibe solicitudes en línea.", "Bookings off: your page takes no online requests.")) }] });
  const okDep = cts(d.dep) % 500 === 0 && (!d.big || (cts(d.bigOver) > 0 && cts(d.bigAmt) % 500 === 0 && cts(d.bigAmt) > 0)) && cts(d.min) % 500 === 0;
  if (!okDep) out.push({ type: "note", tone: "warn", t: E2("Los montos van de 5 en 5 dólares; el trabajo grande necesita desde qué precio y su depósito.", "Amounts go in steps of $5; a big job needs its starting price and its deposit.") });
  return { blocks: out, ed: { F, l: E2("Guardar", "Save"), valid: okDep, apply: (x: FCo) => citasOficioGuardar(c.d.id, { auto: x.auto, resp: x.resp, dep: cts(x.dep), cxh: x.cxh, pick: x.pick, kinds: x.kinds, bigOver: x.big ? cts(x.bigOver) : null, big: x.big ? cts(x.bigAmt) : null, min: cts(x.min) || null } satisfies CitasOficioIn), toast: E2("Guardado.", "Saved.") } };
}
