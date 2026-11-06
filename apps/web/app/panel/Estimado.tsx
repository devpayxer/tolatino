"use client";
/* El estimado línea por línea en el detalle de la cita (4d). El diseño no trae esta pantalla (plan §1 hueco #1): se compone
   con los bloques del panel (chips, campos, −/+, fotos, filas, notas) y lo que el cliente ve sale de neg-auto-flow.js /
   neg-hogar-flow.js (necesario ahora · recomendado pronto · puede esperar; por qué; pieza + mano de obra + impuesto; foto).
   El total que se ve mientras se arma es solo para mirar: los montos los calcula la base al mandarlo. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { CitaPanel } from "@/lib/citas-panel";
import type { LineaEst, Plantilla } from "@/lib/estimados";
import { subirFoto } from "@/lib/subir-foto";
import { estimadoMandar, extraPedir, finalAjustar, plantillasEstimado } from "./acciones-estimado";
import type { Ctx } from "./Panel";

const money = (c: number) => (c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`);
type Draft = { k: string; urg: "now" | "soon" | "later"; t: string; why: string; pn: string; pc: string; h: number; foto: string | null; fotoU: string | null; tEn?: string; whyEn?: string; pnEn?: string };
const nueva = (): Draft => ({ k: Math.random().toString(36).slice(2, 10), urg: "now", t: "", why: "", pn: "", pc: "", h: 0, foto: null, fotoU: null });
const intacta = (d: Draft) => !d.t.trim() && !d.why.trim() && !d.pn.trim() && !d.pc && !d.h;
const cents = (s: string) => Math.round((Number(String(s).replace(/[^\d.]/g, "")) || 0) * 100);
const URG = (E2: Ctx["E2"]): Record<Draft["urg"], [string, string]> => ({ now: [E2("NECESARIO AHORA", "NEEDED NOW"), "danger"], soon: [E2("RECOMENDADO PRONTO", "RECOMMENDED SOON"), "action"], later: [E2("PUEDE ESPERAR", "CAN WAIT"), "neutral"] });
const linea = (d: Draft) => ({ urg: d.urg, t: d.t, why: d.why, tEn: d.tEn, whyEn: d.whyEn, piezas: d.pn.trim() || cents(d.pc) ? [{ n: d.pn.trim() || d.t, cents: cents(d.pc) }] : [], piezasEn: d.pnEn ? [d.pnEn] : undefined, horas: d.h, foto: d.foto });
const deTpl = (p: Plantilla, es: boolean): Draft => ({ k: Math.random().toString(36).slice(2, 10), urg: p.extra ? "now" : p.urg, t: es ? p.t.es : p.t.en, why: es ? p.why.es : p.why.en, pn: p.parts[0] ? (es ? p.parts[0].n.es : p.parts[0].n.en) : "", pc: p.parts.length ? String(p.parts.reduce((n, x) => n + x.cents, 0) / 100) : "", h: p.horas, foto: null, fotoU: null, tEn: p.t.en, whyEn: p.why.en, pnEn: p.parts[0]?.n.en });

/* Lo que el panel ve del estimado ya mandado y del dinero de la cita. */
export function estimadoVista(c: Ctx, x: CitaPanel): Bloque[] {
  const { E2, es } = c, e = x.est;
  if (!e) return [];
  const out: Bloque[] = [], nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), U = URG(E2);
  const fila = (l: LineaEst): Fila => ({ key: l.id, img: l.foto ?? undefined, icon: l.foto ? undefined : "wrench", t: nm(l.t), s: `${nm(l.why)} · ${l.hrs ? `${l.hrs} h · ` : ""}${E2("impuesto", "tax")} ${money(l.tax)}`,
    r: l.final != null && l.final < l.tot ? `${money(l.final)} (${money(l.tot)})` : money(l.tot), tag: l.dec === "ok" ? E2("APROBADA", "APPROVED") : l.dec === "no" ? E2("NO APROBADA", "DECLINED") : U[l.urg][0], tone: l.dec === "ok" ? "signal" : l.dec === "no" ? "neutral" : U[l.urg][1], dim: l.dec === "no", chev: false });
  if (e.estimado) out.push({ type: "rows", k: `${x.rubro === "hogar" ? E2("PRECIO COMPLETO", "FULL PRICE") : E2("ESTIMADO", "ESTIMATE")} · ${E2("VERSIÓN", "VERSION")} ${e.estimado.v}${e.estimado.st === "sent" ? E2(" · ESPERA SU OK", " · AWAITING OK") : ""}`, items: e.estimado.lineas.map(fila) });
  if (e.extras.length) out.push({ type: "rows", k: E2("ALGO MÁS", "SOMETHING ELSE"), items: e.extras.map(fila) });
  const d = e.dinero;
  if (e.estimado || e.extras.length) out.push({ type: "kv", items: [
    { k: E2("APROBADO", "APPROVED"), v: money(d.aprobado) },
    ...(d.base ? [{ k: x.rubro === "hogar" ? E2("VISITA O SERVICIO", "VISIT OR SERVICE") : E2("SERVICIO O DIAGNÓSTICO", "SERVICE OR DIAGNOSIS"), v: d.credito ? `${money(d.base)} · ${E2("se descuenta", "credited")}` : money(d.base) }] : []),
    ...(d.dep ? [{ k: E2("DEPÓSITO PAGADO", "DEPOSIT PAID"), v: `−${money(d.dep)}` }] : []),
    ...(d.retenido ? [{ k: E2("RETENIDO EN SU TARJETA", "HELD ON THEIR CARD"), v: money(d.retenido) }] : []),
    ...(d.cobrado ? [{ k: E2("COBRADO", "CHARGED"), v: money(d.cobrado) }] : []),
    { k: E2("POR COBRAR EN EL LOCAL", "TO COLLECT IN PERSON"), v: money(d.local) },
  ] });
  return out;
}

/* Armar (o rehacer) el estimado. */
export function estimadoArmar(c: Ctx, x: CitaPanel, xtra = false): Bloque[] {
  const { E2, es } = c, U = URG(E2);
  const key = xtra ? "xtD" : "estL";
  // La foto de cada línea vive aparte (estF_<k>): la subida termina cuando quiere y no pisa la lista.
  const L: Draft[] = (xtra ? [(c.ui.xtD as Draft | undefined) ?? nueva()] : ((c.ui.estL as Draft[] | undefined) ?? [])).map((d) => { const f = c.ui[`estF_${d.k}`] as { foto: string; fotoU: string } | null | undefined; return f === undefined ? d : { ...d, foto: f?.foto ?? null, fotoU: f?.fotoU ?? null }; });
  const i: number | null = xtra ? 0 : (c.ui.estI as number | null | undefined) ?? null;
  const set = (j: number, p: Partial<Draft>) => xtra ? c.setUi({ xtD: { ...L[0]!, ...p } }) : c.setUi({ estL: L.map((d, k) => (k === j ? { ...d, ...p } : d)) });
  const tpl = (c.ui.estTpl as Plantilla[] | undefined) ?? [], cls = c.ui.estCls as string | undefined;
  const tot = (d: Draft) => { const p = cents(d.pc), lab = Math.round(d.h * x.rate); return p + lab + Math.round((p * x.taxBp) / 10000); };
  const out: Bloque[] = [{ type: "group", k: xtra ? E2("ALGO MÁS · PREGÚNTALE ANTES DE HACERLO", "SOMETHING ELSE · ASK BEFORE DOING IT") : x.rubro === "hogar" ? E2("PRECIO COMPLETO · LÍNEA POR LÍNEA", "FULL PRICE · LINE BY LINE") : E2("ESTIMADO · LÍNEA POR LÍNEA", "ESTIMATE · LINE BY LINE") }];
  if (!xtra && L.length) out.push({ type: "rows", items: L.map((d, j) => ({ key: `d${j}`, img: d.fotoU ?? undefined, icon: d.fotoU ? undefined : "wrench", t: d.t || E2("Línea sin nombre", "Untitled line"), s: d.why || E2("Falta por qué", "Missing why"), r: money(tot(d)), tag: U[d.urg][0], tone: U[d.urg][1], chev: true,
    onClick: () => c.setUi({ estI: i === j ? null : j }), acts: [{ l: E2("Quitar", "Remove"), v: "secondary", icon: null, onClick: () => c.setUi({ estL: L.filter((_, k) => k !== j), estI: null }) }] })) });
  // Plantillas por clase de trabajo (las del prototipo: frenos, motor, plomería, panel…)
  const clases = [...new Map(tpl.filter((p) => p.extra === xtra || !xtra).map((p) => [p.cls, p.clsName])).entries()];
  if (clases.length) {
    out.push({ type: "chips", k: E2("EMPIEZA CON UNA PLANTILLA", "START FROM A TEMPLATE"), items: clases.map(([k, n]) => ({ l: es ? n.es : n.en, v: cls === k ? "selected" : "filter", onClick: () => c.setUi({ estCls: cls === k ? null : k }) })) });
    if (cls) out.push({ type: "rows", items: tpl.filter((p) => p.cls === cls && (xtra ? p.extra : !p.extra)).map((p, j) => ({ key: `t${j}`, icon: "plus", t: es ? p.t.es : p.t.en, s: es ? p.why.es : p.why.en, tag: U[p.extra ? "now" : p.urg][0], tone: U[p.extra ? "now" : p.urg][1], chev: false,
      onClick: () => { const M = L.filter((d) => !intacta(d)); return xtra ? c.setUi({ xtD: { ...deTpl(p, es), k: L[0]!.k }, estCls: null }) : c.setUi({ estL: [...M, deTpl(p, es)], estI: M.length, estCls: null }); } })) });
  }
  if (!xtra) out.push({ type: "acts", items: [{ l: E2("Agregar línea", "Add line"), v: "secondary", icon: "plus", off: L.length >= 20, onClick: () => c.setUi({ estL: [...L, nueva()], estI: L.length }) }] });
  // El editor de la línea abierta
  if (i != null && L[i]) {
    const d = L[i]!;
    if (!xtra) out.push({ type: "chips", k: E2("¿QUÉ TAN URGENTE?", "HOW URGENT?"), items: (["now", "soon", "later"] as const).map((u) => ({ l: U[u][0], v: d.urg === u ? "selected" : "filter", onClick: () => set(i, { urg: u }) })) });
    out.push({ type: "field", k: E2("QUÉ ES", "WHAT IT IS"), val: d.t, max: 90, count: `${d.t.length}/90`, ph: x.rubro === "hogar" ? E2("Ej.: Llave de paso del inodoro", "E.g.: Toilet shutoff valve") : E2("Ej.: Pastillas delanteras", "E.g.: Front brake pads"), onChange: (v) => set(i, { t: v.slice(0, 90), tEn: undefined }) });
    out.push({ type: "field", area: true, rows: 2, max: 240, k: E2("POR QUÉ · LA MEDIDA O EL CÓDIGO", "WHY · THE MEASUREMENT OR THE CODE"), val: d.why, count: `${d.why.length}/240`, ph: E2("Ej.: Quedan 2 mm; el mínimo seguro es 3 mm.", "E.g.: 2 mm left; the safe minimum is 3 mm."), onChange: (v) => set(i, { why: v.slice(0, 240), whyEn: undefined }) });
    out.push({ type: "field", k: x.rubro === "hogar" ? E2("MATERIAL", "MATERIAL") : E2("PIEZA", "PART"), val: d.pn, max: 60, ph: E2("Ej.: Pastillas de cerámica", "E.g.: Ceramic pads"), onChange: (v) => set(i, { pn: v.slice(0, 60), pnEn: undefined }) });
    out.push({ type: "field", k: E2("PRECIO DE LA PIEZA · DÓLARES", "PART PRICE · DOLLARS"), val: d.pc, pre: "$", im: "decimal", ph: "0", onChange: (v) => set(i, { pc: v.replace(/[^\d.]/g, "").slice(0, 8) }) });
    out.push({ type: "step", t: E2("Mano de obra", "Labor"), s: `${E2("Horas", "Hours")} × ${money(x.rate)} ${E2("la hora (Tu herramienta)", "per hour (Your tools)")}`, v: `${d.h} h`, onM: () => set(i, { h: Math.max(0, Math.round((d.h - 0.5) * 10) / 10) }), onP: () => set(i, { h: Math.min(200, Math.round((d.h + 0.5) * 10) / 10) }) });
    out.push({ type: "photos", k: d.urg === "now" || xtra ? E2("FOTO · OBLIGATORIA: EL CLIENTE LA VE", "PHOTO · REQUIRED: THE CLIENT SEES IT") : E2("FOTO · OPCIONAL", "PHOTO · OPTIONAL"), count: `${d.fotoU ? 1 : 0}/1`, cols: 3,
      items: d.fotoU ? [{ key: d.fotoU, bg: `url("${d.fotoU}")`, onClick: () => c.setUi({ [`estF_${d.k}`]: null }) }] : [],
      addL: E2("Tomar o subir foto", "Take or upload photo"), onAdd: d.fotoU ? undefined : () => c.pickFiles(false, async (fs) => { const r = await subirFoto(fs[0]!); if (r.ok && r.id && r.url) c.setUi({ [`estF_${d.k}`]: { foto: r.id, fotoU: r.url } }); else c.toast(r.mensaje ? r.mensaje[es ? "es" : "en"] : E2("No se pudo subir la foto.", "Couldn’t upload the photo.")); }) });
  }
  const P = L.reduce((n, d) => n + cents(d.pc), 0), LAB = L.reduce((n, d) => n + Math.round(d.h * x.rate), 0), TAX = L.reduce((n, d) => n + Math.round((cents(d.pc) * x.taxBp) / 10000), 0);
  if (L.length && (L.some((d) => d.t) || xtra)) out.push({ type: "kv", items: [{ k: x.rubro === "hogar" ? E2("MATERIALES", "MATERIALS") : E2("PIEZAS", "PARTS"), v: money(P) }, { k: E2("MANO DE OBRA", "LABOR"), v: money(LAB) },
    { k: x.rubro === "hogar" ? E2("IMPUESTO SOBRE MATERIALES", "TAX ON MATERIALS") : E2("IMPUESTO SOBRE PIEZAS", "TAX ON PARTS"), v: money(TAX) }, { k: E2("TOTAL", "TOTAL"), v: money(P + LAB + TAX) }] });
  const falta = L.find((d) => !d.t.trim() || !d.why.trim() || (cents(d.pc) <= 0 && d.h <= 0) || ((d.urg === "now" || xtra) && !d.foto));
  const n = x.who.split(" ")[0];
  out.push({ type: "note", tone: falta ? "warn" : "info", t: falta
    ? E2(`«${falta.t || "Línea"}»: falta ${!falta.t.trim() ? "qué es" : !falta.why.trim() ? "por qué" : cents(falta.pc) <= 0 && falta.h <= 0 ? "el precio" : "la foto"}.`, `“${falta.t || "Line"}”: missing ${!falta.t.trim() ? "what it is" : !falta.why.trim() ? "why" : cents(falta.pc) <= 0 && falta.h <= 0 ? "the price" : "the photo"}.`)
    : xtra ? E2(`Paras hasta que ${n} decida. Si dice que no, no se hace ni se cobra.`, `You stop until ${n} decides. If they say no, it is not done or charged.`)
      : E2(`${n} aprueba línea por línea. Solo se retiene lo que apruebe; nada se hace sin su OK.`, `${n} approves line by line. Only what they approve is held; nothing is done without their OK.`) });
  out.push({ type: "acts", items: [
    { l: xtra ? E2("Preguntarle", "Ask them") : E2("Mandar al cliente", "Send to the client"), v: "primary", icon: "check", off: !L.length || !!falta || c.pending,
      onClick: () => c.run(() => (xtra ? extraPedir(c.d.id, x.numero, linea(L[0]!)) : estimadoMandar(c.d.id, x.numero, L.map(linea))), xtra ? E2(`${n} ya tiene la pregunta.`, `${n} has the question.`) : E2(`${n} ya tiene el estimado.`, `${n} has the estimate.`), () => c.setUi(xtra ? { xtD: null, xtOpen: false } : { estL: null, estI: null, estOpen: false })) },
    { l: E2("Cancelar", "Cancel"), v: "secondary", icon: null, onClick: () => c.setUi(xtra ? { xtD: null, xtOpen: false } : { estL: null, estI: null, estOpen: false }) }] });
  return out;
}

/* Abrir el constructor (carga las plantillas de la categoría una vez). */
export function abrirEstimado(c: Ctx, x: CitaPanel, xtra = false) {
  const base: Draft[] = !xtra && x.est?.estimado?.st === "sent" ? x.est.estimado.lineas.map((l) => ({ k: Math.random().toString(36).slice(2, 10), urg: l.urg, t: c.es ? l.t.es : l.t.en, why: c.es ? l.why.es : l.why.en, pn: l.parts[0] ? (c.es ? l.parts[0].n.es : l.parts[0].n.en) : "", pc: String(l.partsC / 100), h: l.hrs, foto: l.fotoId, fotoU: l.foto })) : [];
  c.setUi(xtra ? { xtOpen: true, xtD: nueva(), estCls: null } : { estOpen: true, estL: base.length ? base : [nueva()], estI: base.length ? null : 0, estCls: null });
  if (!c.ui.estTpl) void plantillasEstimado(c.d.id).then((t) => c.setUi({ estTpl: t }));
}

/* Lo final: cada línea aprobada puede bajar (nunca subir) antes de entregar. */
export function loFinal(c: Ctx, x: CitaPanel): Bloque[] {
  const { E2, es } = c, ap = [...(x.est?.estimado?.lineas ?? []), ...(x.est?.extras ?? [])].filter((l) => l.dec === "ok");
  if (!ap.length) return [];
  if (!c.ui.finOpen) return [{ type: "acts", items: [{ l: E2("Lo final (si algo salió más barato)", "Final amount (if something came in cheaper)"), v: "secondary", icon: "edit", onClick: () => c.setUi({ finOpen: true, fin: Object.fromEntries(ap.map((l) => [l.id, String((l.final ?? l.tot) / 100)])) }) }] }];
  const F = (c.ui.fin as Record<string, string>) ?? {};
  const malo = ap.find((l) => cents(F[l.id] ?? "") > l.tot);
  return [
    { type: "group", k: E2("LO FINAL · PUEDE BAJAR, NUNCA SUBIR", "FINAL · CAN GO DOWN, NEVER UP") },
    ...ap.map((l): Bloque => ({ type: "field", k: `${(es ? l.t.es : l.t.en).toUpperCase()} · ${E2("APROBADO", "APPROVED")} ${money(l.tot)}`, val: F[l.id] ?? "", pre: "$", im: "decimal", onChange: (v) => c.setUi({ fin: { ...F, [l.id]: v.replace(/[^\d.]/g, "").slice(0, 8) } }) })),
    ...(malo ? [{ type: "note", tone: "warn", t: E2(`«${es ? malo.t.es : malo.t.en}» no puede pasar ${money(malo.tot)}.`, `“${malo.t.en}” cannot go over ${money(malo.tot)}.`) } as Bloque] : []),
    { type: "acts", items: [{ l: E2("Guardar lo final", "Save final"), v: "primary", icon: "check", off: !!malo || c.pending, onClick: () => c.run(() => finalAjustar(c.d.id, x.numero, Object.fromEntries(ap.map((l) => [l.id, cents(F[l.id] ?? String(l.tot / 100))]))), E2("Lo final quedó guardado.", "Final saved."), () => c.setUi({ finOpen: false })) },
      { l: E2("Cancelar", "Cancel"), v: "secondary", icon: null, onClick: () => c.setUi({ finOpen: false }) }] },
  ];
}
