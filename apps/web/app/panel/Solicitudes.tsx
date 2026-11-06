"use client";
/* Pre-estimados y presupuestos en el panel (4e). El diseño no trae esta pantalla (plan §1 hueco #3: respuesta
   estructurada): se compone con los bloques del panel. Lo que el negocio manda es lo que el cliente ve en su solicitud
   (neg-auto-pre.js / neg-hogar-pre.js › stVals): rango, qué incluye, qué puede cambiarlo y su respuesta. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { SolFila } from "@/lib/solicitudes";
import { solicitudResponder } from "./acciones-solicitudes";
import type { Ctx, Editor } from "./Panel";

type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
const LIGHTS: Record<string, [string, string]> = { ce: ["Check engine", "Check engine"], bat: ["Batería", "Battery"], temp: ["Temperatura", "Temperature"], abs: ["Frenos o ABS", "Brakes or ABS"], oil: ["Aceite", "Oil"], tpms: ["Presión de gomas", "Tire pressure"] };
const AREAS: Record<string, [string, string]> = { cocina: ["Cocina", "Kitchen"], bano: ["Baño", "Bathroom"], sotano: ["Sótano", "Basement"], cuarto: ["Cuarto", "Bedroom"], sala: ["Sala", "Living room"], afuera: ["Afuera", "Outside"], toda: ["Toda la casa", "Whole house"] };
const cents = (s: string) => Math.round((Number(String(s).replace(/[^\d.]/g, "")) || 0) * 100);
const money = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;

export function solicitudFila(c: Ctx, x: SolFila): Fila {
  const { E2, es } = c;
  return { key: x.numero, icon: x.mode === "pq" ? "document" : "image", t: `${x.mode === "pq" ? E2("Presupuesto", "Quote") : E2("Pre-estimado", "Pre-estimate")} #${x.numero}`,
    s: `${x.quien} · ${es ? x.svc.es : x.svc.en || x.svc.es}${x.veh ? ` · ${x.veh}` : x.casa ? ` · ${x.casa}` : ""} · ${E2("responde antes del ", "reply by ")}${es ? x.vence.es : x.vence.en}`,
    tag: E2("ESPERA TU RANGO", "AWAITING RANGE"), tone: "action", chev: true, onClick: () => c.det(`sol:${x.numero}`) };
}

export function solicitudDetalle(c: Ctx): Sec {
  const { E2, es } = c, x = c.citas?.solDet;
  if (!x) return { blocks: [{ type: "head", t: E2("Solicitud no encontrada", "Request not found"), onBack: c.closeDet }, { type: "empty", icon: "image", t: E2("Esa solicitud no existe", "That request does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), f = x.form, pq = x.mode === "pq";
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${pq ? E2("PRESUPUESTO", "QUOTE") : E2("PRE-ESTIMADO CON FOTOS", "PRE-ESTIMATE FROM PHOTOS")} · ${x.quien.toUpperCase()}`, t: `#${x.numero}`, s: `${nm(x.svc)}${pq && x.otros > 0 ? E2(` · lo pidió a ${x.otros + 1} negocios`, ` · sent to ${x.otros + 1} businesses`) : ""}`, onBack: c.closeDet },
    { type: "kv", items: [
      { k: E2("CLIENTE", "CLIENT"), v: x.quien },
      ...(f.veh ? [{ k: E2("VEHÍCULO", "VEHICLE"), v: `${f.veh.t}${f.veh.mi ? ` · ${f.veh.mi.toLocaleString("en-US")} mi` : ""}` }] : []),
      ...(f.casa ? [{ k: E2("CASA", "HOME"), v: f.casa.dir }] : []),
      ...(f.area ? [{ k: E2("DÓNDE", "WHERE"), v: (AREAS[f.area] ?? [f.area, f.area])[es ? 0 : 1] }] : []),
      ...(f.luces.length ? [{ k: E2("LUCES", "LIGHTS"), v: f.luces.map((k) => (LIGHTS[k] ?? [k, k])[es ? 0 : 1]).join(" · ") }] : []),
      ...(f.code ? [{ k: E2("CÓDIGO", "CODE"), v: f.code }] : []),
      ...(f.marca || f.edad ? [{ k: E2("EQUIPO", "EQUIPMENT"), v: [f.marca, f.edad].filter(Boolean).join(" · ") }] : []),
      { k: E2("PARA", "NEEDED"), v: f.cuando === "hoy" ? E2("Hoy", "Today") : f.cuando === "nada" ? E2("Sin prisa", "No rush") : E2("Esta semana", "This week") },
      { k: E2("RESPONDE ANTES DE", "REPLY BY"), v: es ? x.vence.es : x.vence.en },
    ] },
    f.nota ? { type: "note", tone: "ink", icon: "bubble", t: `«${f.nota}»` } : null,
    x.fotos.length ? { type: "photos", k: E2("FOTOS DEL CLIENTE", "CLIENT PHOTOS"), cols: 3, items: x.fotos.map((u) => ({ bg: `url(${u})`, key: u, onClick: () => window.open(u, "_blank", "noopener") })) } : null,
  ];
  if (x.st !== "sent") {
    const r = x.reply ?? {};
    out.push({ type: "note", tone: x.st === "no" ? "info" : "ok", icon: "check", t: x.st === "no" ? E2("Respondiste que no lo haces.", "You replied you don’t do it.")
      : x.st === "expired" ? E2("Pasó el plazo sin respuesta.", "The time passed without a reply.")
        : `${x.st === "see" ? E2("Respondiste: hay que verlo", "You replied: needs an inspection") : E2("Mandaste el rango", "You sent the range")} ${r.lo ? `${money(r.lo)}–${money(r.hi ?? r.lo)}` : ""}${x.st === "used" ? E2(" · reservó con él", " · they booked with it") : ""}.` });
    return { blocks: out, ed: null };
  }
  const ui = c.ui, que = (ui.solQ as string | undefined) ?? "rng", lo = (ui.solLo as string | undefined) ?? "", hi = (ui.solHi as string | undefined) ?? "";
  const inc = (ui.solInc as string | undefined) ?? "", chg = (ui.solChg as string | undefined) ?? "", nota = (ui.solN as string | undefined) ?? "", vis = (ui.solV as string | undefined) ?? "", dias = (ui.solD as string | undefined) ?? "";
  out.push({ type: "group", k: E2("TU RESPUESTA · LA VE EN SU SOLICITUD", "YOUR REPLY · SHOWN ON THEIR REQUEST") });
  out.push({ type: "chips", items: ([["rng", E2("Mandar un rango", "Send a range")], ["see", E2("Hay que verlo", "Needs an inspection")], ["no", E2("No lo hacemos", "We don’t do it")]] as const).map(([k, l]) => ({ l, v: que === k ? "selected" : "filter", onClick: () => c.setUi({ solQ: k }) })) });
  if (que !== "no") {
    out.push({ type: "field", k: E2("DESDE · DÓLARES", "FROM · DOLLARS"), val: lo, pre: "$", im: "decimal", ph: "180", onChange: (v) => c.setUi({ solLo: v.replace(/[^\d.]/g, "").slice(0, 8) }) });
    out.push({ type: "field", k: E2("HASTA · DÓLARES", "TO · DOLLARS"), val: hi, pre: "$", im: "decimal", ph: "260", onChange: (v) => c.setUi({ solHi: v.replace(/[^\d.]/g, "").slice(0, 8) }) });
    if (que === "rng") out.push({ type: "field", area: true, rows: 3, max: 600, k: E2("LO QUE INCLUYE · UNA COSA POR LÍNEA", "WHAT IT COVERS · ONE PER LINE"), val: inc, ph: E2("Pastillas delanteras\nMano de obra", "Front pads\nLabor"), onChange: (v) => c.setUi({ solInc: v.slice(0, 600) }) });
    out.push({ type: "field", area: true, rows: 3, max: 600, k: E2("LO QUE PUEDE CAMBIARLO · UNA POR LÍNEA", "WHAT CAN CHANGE IT · ONE PER LINE"), val: chg, ph: E2("Si los discos están bajo la medida mínima", "If the rotors are under minimum thickness"), onChange: (v) => c.setUi({ solChg: v.slice(0, 600) }) });
    if (pq) out.push({ type: "field", k: E2("VISITA PARA MEDIR · DÓLARES (0 = GRATIS)", "MEASURING VISIT · DOLLARS (0 = FREE)"), val: vis, pre: "$", im: "decimal", ph: "0", onChange: (v) => c.setUi({ solV: v.replace(/[^\d.]/g, "").slice(0, 7) }) });
    out.push({ type: "field", k: E2("CUÁNTO TARDA · OPCIONAL", "HOW LONG IT TAKES · OPTIONAL"), val: dias, ph: E2("Ej.: 2–3 horas o 3–5 días", "E.g. 2–3 hours or 3–5 days"), max: 20, onChange: (v) => c.setUi({ solD: v.slice(0, 20) }) });
  }
  out.push({ type: "field", area: true, rows: 3, max: 300, k: E2("TU MENSAJE · OPCIONAL", "YOUR MESSAGE · OPTIONAL"), val: nota, count: `${nota.length}/300`, ph: que === "see" ? E2("Con las fotos no puedo decirte bien. Hay que ponerlo en el elevador.", "I cannot tell from the photos. It needs to go on the lift.") : que === "no" ? E2("No hacemos ese trabajo.", "We don’t do that job.") : E2("Por las fotos, sale en ese rango. Te lo confirmo antes de tocar nada.", "From the photos it falls in that range. I confirm before touching anything."), onChange: (v) => c.setUi({ solN: v.slice(0, 300) }) });
  const L = (t: string) => t.split("\n").map((z) => z.trim()).filter(Boolean);
  const malo = que !== "no" && (!cents(lo) || cents(hi) < cents(lo));
  out.push({ type: "note", tone: malo ? "warn" : "info", t: malo ? E2("Pon desde y hasta (el «hasta» no puede ser menor).", "Enter from and to (“to” cannot be lower).")
    : que === "rng" ? E2("Es un rango, no un precio final. El precio real va en el estimado, después de verlo; nada se hace ni se cobra sin su OK.", "It is a range, not a final price. The real price goes in the estimate after you see it; nothing is done or charged without their OK.")
      : que === "see" ? E2("El cliente ve el rango amplio y puede reservar el diagnóstico o la visita.", "The client sees the wide range and can book the diagnosis or visit.") : E2("El cliente ve otros negocios de la ciudad que sí lo hacen.", "The client sees other businesses in the city that do it.") });
  out.push({ type: "acts", items: [{ l: E2("Mandar respuesta", "Send reply"), v: "primary", icon: "check", off: malo || c.pending,
    onClick: () => c.run(() => solicitudResponder(c.d.id, x.numero, { que, lo: cents(lo), hi: cents(hi), inc: L(inc), chg: L(chg), nota, visita: pq && vis !== "" ? cents(vis) : null, dias: dias || null }),
      E2(`${x.quien.split(" ")[0]} ya tiene tu respuesta.`, `${x.quien.split(" ")[0]} has your reply.`), () => c.setUi({ solQ: null, solLo: "", solHi: "", solInc: "", solChg: "", solN: "", solV: "", solD: "" })) }] });
  return { blocks: out, ed: null };
}
