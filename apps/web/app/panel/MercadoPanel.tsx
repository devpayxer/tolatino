"use client";
/* El pedido del mercado en el panel (4p · hueco #2 del plan: el diseño no trae «pesar», compuesto con los bloques del panel).
   Hoy: los que esperan que aceptes (10 min) y los de hoy. El detalle: aceptar / no puedo; por cada línea por libra el PESO REAL
   y la FOTO DE LA BALANZA (obligatoria); «No hay» → quitarlo o proponer otro producto (el cliente acepta en 10 min); «Mandar al
   cliente» (el total real nunca pasa lo retenido); listo / en camino; lo recogió / entregado (se cobra lo real si no lo aprobó). */
import { ayudaCita } from "./Citas";
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { FilaMerc, MercadoVista } from "@/lib/mercado";
import { subirFoto } from "@/lib/subir-foto";
import { mercNoHay, mercPaso, mercPesar } from "./acciones-mercado";
import type { Ctx, Editor } from "./Panel";

type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
type Bi = { es: string; en: string };
export type MercPanel = { hoy?: FilaMerc[]; det?: MercadoVista | null; prods?: { id: string; name: Bi; cents: number; k: string }[] };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export function hoyMercado(c: Ctx): Bloque[] {
  const { E2 } = c, L = c.mped?.hoy ?? [];
  if (!L.length) return [];
  const pend = L.filter((x) => x.st === "pending").length;
  const tag = (x: FilaMerc) => x.st === "pending" ? E2("ACEPTA EN 10 MIN", "ACCEPT IN 10 MIN") : x.st === "done" ? E2("ENTREGADO", "DONE")
    : x.detalle === "preparando" ? E2("POR PESAR", "TO WEIGH") : x.detalle === "pesado" ? E2("ESPERA AL CLIENTE", "AWAITING CLIENT") : x.detalle === "listo" ? E2("LISTO", "READY") : E2("EN CAMINO", "ON THE WAY");
  return [{ type: "rows", k: `${E2("PEDIDOS DEL MERCADO", "MARKET ORDERS")}${pend ? ` · ${pend} ${E2("POR ACEPTAR", "TO ACCEPT")}` : ""}`, items: L.map((x): Fila => ({
    key: x.numero, icon: x.modo === "delivery" ? "truck" : "bag", t: `${x.who} · ${x.n} ${x.n === 1 ? E2("artículo", "item") : E2("artículos", "items")} · ${E2("estimado ", "estimate ")}${money(x.est)}`,
    s: `${x.numero} · ${x.modo === "delivery" ? E2("envío", "delivery") : "pickup"} · ${x.cuando}`, tag: tag(x), tone: x.st === "pending" ? "action" : x.detalle === "preparando" ? "ink" : "signal", chev: true, onClick: () => c.det(`merc:${x.numero}`) })) }];
}

export function mercadoDetalle(c: Ctx): Sec {
  const { E2, es, ui } = c, x = c.mped?.det, nm = (b: Bi) => (es ? b.es : b.en || b.es);
  if (!x) return { blocks: [{ type: "head", t: E2("Pedido no encontrado", "Order not found"), onBack: c.closeDet }, { type: "empty", icon: "bag", t: E2("Ese pedido no existe", "That order does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const t = x.t, D = x.detalle, pesando = x.st === "confirmed" && (D === "preparando" || D === "pesado") && !x.aprobado;
  const stL = x.st === "pending" ? E2("POR ACEPTAR", "TO ACCEPT") : x.st === "confirmed" ? ({ preparando: E2("POR PESAR", "TO WEIGH"), pesado: E2("ESPERA AL CLIENTE", "AWAITING CLIENT"), listo: E2("LISTO", "READY"), camino: E2("EN CAMINO", "ON THE WAY") } as Record<string, string>)[D ?? ""] ?? ""
    : x.st === "done" ? E2("ENTREGADO", "DONE") : x.st === "declined" ? E2("NO PUDISTE", "DECLINED") : x.st === "expired" ? E2("VENCIÓ", "EXPIRED") : E2("CANCELADO", "CANCELLED");
  const subL = ({ call: E2("Llámame", "Call me"), similar: E2("Uno parecido, con su OK", "A similar one, with their OK"), no: E2("No sustituir", "Do not substitute") } as Record<string, string>)[x.sub] ?? x.sub;
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("PEDIDO DEL MERCADO", "MARKET ORDER")} · ${stL}`, t: x.numero, s: `${x.modo === "delivery" ? E2("Envío", "Delivery") : "Pickup"} · ${new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(x.cuando)).replace(/\./g, "")}`, onBack: c.closeDet },
    { type: "kv", items: [{ k: E2("ESTIMADO", "ESTIMATE"), v: money(t.est) }, { k: E2("PESO REAL", "REAL TOTAL"), v: money(t.real) }, { k: x.local ? E2("PAGA", "PAYS") : E2("RETENIDO", "HELD"), v: x.local ? E2("En el mercado", "At the market") : money(t.ret) }, { k: E2("SI ALGO NO HAY", "IF SOMETHING IS OUT"), v: subL }] },
    x.nota ? { type: "note", tone: "ink", icon: "bubble", t: `«${x.nota}»` } : null,
  ];
  if (x.st === "pending") out.push({ type: "acts", items: [
    { l: E2("Aceptar", "Accept"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "aceptar"), E2("Aceptado. Ahora arma y pesa.", "Accepted. Now prepare and weigh.")) },
    { l: E2("No puedo", "I can’t"), v: "secondary", icon: "close", off: c.pending, onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "rechazar"), E2("Listo: el cliente sabe y se liberó su retención.", "Done: the client knows and the hold was released.")) }] });
  // Líneas: pesar con foto, «no hay» (quitar o proponer).
  const L = x.lineas.filter((l) => l.st !== "removed");
  out.push({ type: "group", k: E2("SUS PRODUCTOS", "THEIR PRODUCTS") });
  for (const l of L) {
    const prop = x.props.find((p) => p.line === l.id);
    const s = l.st === "out" ? (prop ? E2(`No hay · propusiste ${nm(prop.name)} · espera al cliente`, `Out · you proposed ${nm(prop.name)} · awaiting client`) : E2("No hay · no se cobra", "Out · not charged"))
      : l.peso ? (l.lbReal != null ? E2(`Pidió ${l.lb} lb · pesó ${l.lbReal} lb`, `Asked ${l.lb} lb · weighed ${l.lbReal} lb`) : E2(`${l.lb} lb · por pesar`, `${l.lb} lb · to weigh`)) : `× ${l.q}`;
    out.push({ type: "rows", items: [{ key: l.id, icon: l.peso ? "scale" : "bag", t: `${nm(l.name)}${l.subOf ? E2(" · cambio aceptado", " · accepted swap") : ""}`, s: `${s}${l.ops.length ? ` · ${l.ops.join(" · ")}` : ""}`,
      r: l.st === "out" ? "$0.00" : money(l.lbReal != null || !l.peso ? l.final : l.est), tag: l.peso && l.lbReal == null && l.st === "ok" ? E2("PESAR", "WEIGH") : null, tone: "action", chev: false }] });
    if (!pesando || l.st !== "ok") continue;
    const k = `mw:${l.id}`, w = (ui[k] as { lb: string; foto: { id: string; url: string } | null } | undefined) ?? { lb: l.lbReal != null ? String(l.lbReal) : "", foto: null };
    if (l.peso) {
      out.push({ type: "field", k: `${E2("PESO REAL · LB", "REAL WEIGHT · LB")} · ${nm(l.name).toUpperCase()}`, val: w.lb, im: "decimal", ph: String(l.lb), onChange: (v) => c.setUi({ [k]: { ...w, lb: v.replace(/[^0-9.]/g, "").slice(0, 6) } }) });
      out.push({ type: "photos", k: `${E2("FOTO DE LA BALANZA · OBLIGATORIA", "SCALE PHOTO · REQUIRED")} · ${nm(l.name).toUpperCase()}`, cols: 3, items: w.foto ? [{ key: w.foto.id, bg: `url("${w.foto.url}")` }] : (l.foto ? [{ key: l.foto, bg: `url("${l.foto}")`, tag: E2("GUARDADA", "SAVED") }] : []),
        addL: `${E2("Foto de", "Photo of")} ${nm(l.name)}`, onAdd: () => c.pickFiles(false, async (fs) => { const r = await subirFoto(fs[0]!); if (r.ok && r.id && r.url) c.setUi({ [k]: { ...w, foto: { id: r.id, url: r.url } } }); else c.toast(r.mensaje ? r.mensaje[es ? "es" : "en"] : E2("No se pudo subir la foto.", "Couldn’t upload the photo.")); }) });
    }
    const elegir = ui.mNoHay === l.id;
    out.push({ type: "acts", items: [
      ...(l.peso ? [{ l: `${E2("Guardar peso de", "Save weight of")} ${nm(l.name)}`, v: "primary" as const, icon: "scale", off: c.pending || !w.lb || !w.foto, onClick: () => c.run(() => mercPesar(c.d.id, x.numero, l.id, w.lb, w.foto!.id), E2("Peso guardado con su foto.", "Weight saved with its photo."), () => c.setUi({ [k]: undefined })) }] : []),
      { l: `${E2("No hay", "Out of")} ${nm(l.name)}`, v: "secondary", icon: "warning", off: c.pending, onClick: () => c.setUi({ mNoHay: elegir ? null : l.id }) }] });
    if (elegir) {
      const P = (c.mped?.prods ?? []).filter((p) => p.k !== "peso" && !L.some((z) => z.name.es === p.name.es));
      out.push({ type: "note", tone: "info", t: x.sub === "no" ? E2("Pidió no sustituir: quítalo.", "They asked not to substitute: remove it.") : x.sub === "call" ? E2("Pidió que lo llames. Si acepta un cambio, propónlo aquí; si no contesta en 10 min, se quita.", "They asked you to call. If they accept a swap, propose it here; if no answer in 10 min, it is removed.") : E2("Propón uno parecido: lo acepta en 10 min o se quita.", "Propose a similar one: they accept within 10 min or it is removed.") },
        { type: "acts", items: [{ l: E2("Quitar · no se cobra", "Remove · not charged"), v: "secondary", icon: "close", off: c.pending, onClick: () => c.run(() => mercNoHay(c.d.id, x.numero, l.id, null), E2("Quitado: no se cobra.", "Removed: not charged."), () => c.setUi({ mNoHay: null })) }] });
      if (x.sub !== "no" && P.length) out.push({ type: "rows", k: E2("PROPONER EN SU LUGAR", "PROPOSE INSTEAD"), items: P.slice(0, 12).map((p): Fila => ({ key: `s${p.id}`, icon: "bag", t: nm(p.name), r: money(p.cents), compact: true, chev: true,
        onClick: () => c.run(() => mercNoHay(c.d.id, x.numero, l.id, p.id), E2("Propuesto: el cliente tiene 10 minutos.", "Proposed: the client has 10 minutes."), () => c.setUi({ mNoHay: null })) })) });
    }
  }
  if (pesando) {
    out.push({ type: "note", tone: "ink", icon: "scale", t: x.local ? E2(`Total real ${money(t.real)} · lo paga en el mercado.`, `Real total ${money(t.real)} · paid at the market.`) : t.real > t.ret ? E2(`El total real (${money(t.real)}) pasa lo retenido (${money(t.ret)}): corta menos. Sin su OK no se cobra más.`, `The real total (${money(t.real)}) is over the hold (${money(t.ret)}): cut less. Without their OK no more is charged.`) : E2(`Total real ${money(t.real)} de ${money(t.ret)} retenidos.`, `Real total ${money(t.real)} of ${money(t.ret)} held.`) });
    if (D === "preparando") out.push({ type: "acts", items: [{ l: E2("Mandar al cliente", "Send to the client"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "mandar"), E2("Mandado: el cliente ve el peso y las fotos.", "Sent: the client sees the weight and photos.")) }] });
  }
  if (x.st === "confirmed" && D === "pesado") out.push({ type: "acts", items: [{ l: x.modo === "delivery" ? E2("Va en camino", "On the way") : E2("Está listo", "It’s ready"), v: "primary", icon: x.modo === "delivery" ? "truck" : "bag", off: c.pending, onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "listo"), E2("Listo: el cliente lo sabe.", "Done: the client knows.")) }] });
  if (x.st === "confirmed" && (D === "listo" || D === "camino")) out.push({ type: "acts", items: [{ l: x.modo === "delivery" ? E2("Entregado", "Delivered") : E2("Lo recogió", "Picked up"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "entregado"), x.local ? E2("Listo.", "Done.") : E2("Listo: se cobró lo real y se liberó el resto.", "Done: the real total was charged and the rest released.")) }] });
  if (t.cobrado) out.push({ type: "note", tone: "ok", icon: "check", t: E2(`Cobrado ${money(t.cobrado)}${t.liberado ? ` · liberado ${money(t.liberado)}` : ""}.`, `Charged ${money(t.cobrado)}${t.liberado ? ` · released ${money(t.liberado)}` : ""}.`) });
  out.push(...ayudaCita(c, x.numero, E2("el cliente", "the client")));
  out.push({ type: "rows", k: E2("LÍNEA DE TIEMPO", "TIMELINE"), items: x.eventos.filter((e) => e.t.es).map((e, i): Fila => ({ key: `e${i}`, icon: "clock", t: nm(e.t), s: new Date(e.at).toLocaleTimeString(es ? "es-US" : "en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }), compact: true, chev: false })) });
  return { blocks: out, ed: null };
}
