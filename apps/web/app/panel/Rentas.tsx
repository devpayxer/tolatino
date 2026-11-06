"use client";
/* Rentas de herramienta en el panel (4f-2; plan §4f «listas Planes y Rentas», hueco #5 del plan: el diseño no trae esta
   pantalla del panel, se compone con sus bloques). Hoy: apartadas, las que tiene la gente y las devueltas con algo
   pendiente. El detalle: «La recogió» (se cobra la renta y se retiene el depósito), «La devolvió» (se libera; los días tarde
   salen del depósito), «La devolvió con un daño» (foto y monto: el cliente lo ve y decide) y «Cancelar el apartado». */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { RentaFila } from "@/lib/rentas";
import { subirFoto } from "@/lib/subir-foto";
import { rentaAccionPanel } from "./acciones-rentas";
import type { Ctx, Editor } from "./Panel";

type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const MES = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const DIA = { es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };

export function hoyRentas(c: Ctx): Bloque[] {
  const { E2, es } = c, L = c.citas?.rentas ?? [];
  if (!L.length) return [];
  const fL = (f: string) => { const d = new Date(`${f}T12:00:00Z`); return es ? `${DIA.es[d.getUTCDay()]} ${d.getUTCDate()} ${MES.es[d.getUTCMonth()]}` : `${DIA.en[d.getUTCDay()]} ${MES.en[d.getUTCMonth()]} ${d.getUTCDate()}`; };
  const fuera = L.filter((x) => x.st === "out").length;
  return [{ type: "rows", k: `${E2("RENTAS", "RENTALS")} · ${fuera} ${E2("FUERA", "OUT")}`, items: L.map((x: RentaFila): Fila => {
    const t = x.st === "held" ? [E2(`Recoge el ${fL(x.pick)}`, `Picks up ${fL(x.pick)}`), x.cardFailed ? E2("TARJETA NO PASÓ", "CARD DECLINED") : E2("APARTADA", "ON HOLD"), x.cardFailed ? "danger" : "action"]
      : x.st === "out" ? [E2(`Devuelve el ${fL(x.due)}`, `Returns ${fL(x.due)}`), x.tarde ? `${x.tarde} ${x.tarde === 1 ? E2("DÍA TARDE", "DAY LATE") : E2("DÍAS TARDE", "DAYS LATE")}` : E2("LA TIENE", "OUT"), x.tarde ? "danger" : "signal"]
        : [E2("Devuelta", "Returned"), x.dmgSt === "asked" ? E2("DAÑO · ESPERA SU OK", "DAMAGE · AWAITING OK") : x.dmgSt === "disputed" ? E2("DAÑO · LO REVISA TO’LATINO", "DAMAGE · TO’LATINO REVIEWS") : E2("DEVUELTA", "RETURNED"), x.dmgSt ? "action" : "neutral"];
    return { key: x.numero, icon: "wrench", t: `${x.cliente} · ${es ? x.n.es : x.n.en || x.n.es}`, s: `#${x.numero} · ${t[0]}`, tag: t[1], tone: t[2] as Fila["tone"], chev: true, onClick: () => c.det(`renta:${x.numero}`) };
  }) }];
}

export function rentaDetalle(c: Ctx): Sec {
  const { E2, es } = c, x = c.citas?.rentaDet;
  if (!x) return { blocks: [{ type: "head", t: E2("Renta no encontrada", "Rental not found"), onBack: c.closeDet }, { type: "empty", icon: "wrench", t: E2("Esa renta no existe", "That rental does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const fL = (f: string) => { const d = new Date(`${f}T12:00:00Z`); return es ? `${DIA.es[d.getUTCDay()]} ${d.getUTCDate()} ${MES.es[d.getUTCMonth()]}` : `${DIA.en[d.getUTCDay()]} ${MES.en[d.getUTCMonth()]} ${d.getUTCDate()}`; };
  const stL = { held: E2("APARTADA", "ON HOLD"), out: E2("LA TIENE", "OUT"), back: E2("DEVUELTA", "RETURNED"), cancelled: E2("CANCELADA", "CANCELLED"), expired: E2("VENCIDA", "EXPIRED") }[x.st];
  const depV = !x.dep ? E2("Sin depósito", "No deposit") : `${money(x.dep)}${x.depSt === "retenido" ? E2(" · retenido", " · held") : x.depSt === "liberado" ? E2(" · liberado", " · released") : x.depSt === "descontado" || x.depSt === "parcial" ? `${E2(" · se descontaron ", " · deducted ")}${money(x.depCobrado)}` : x.depSt === "no_retenido" ? E2(" · ya no retenido", " · no longer held") : E2(" · al recoger", " · at pickup")}`;
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("RENTA", "RENTAL")} · ${stL}`, t: nm(x.n), s: `#${x.numero} · ${x.cliente}`, onBack: c.closeDet },
    x.foto ? { type: "photos", cols: 3, items: [{ key: x.foto, bg: `url("${x.foto}")` }] } : null,
    { type: "kv", items: [
      { k: E2("CLIENTE", "CLIENT"), v: x.cliente },
      { k: E2("DÍAS", "DAYS"), v: `${x.dias}${x.week ? E2(" · semana, paga 5", " · week, pays 5") : ""}` },
      { k: E2("RENTA", "RENT"), v: `${money(x.rent)}${x.st === "held" ? E2(" · se cobra al recoger", " · charged at pickup") : E2(" · cobrada", " · charged")}` },
      { k: E2("DEPÓSITO", "DEPOSIT"), v: depV },
      { k: E2("RECOGE", "PICKS UP"), v: fL(x.pick) },
      { k: E2("DEVUELVE", "RETURNS"), v: `${fL(x.due)}${x.tardeHoy ? ` · ${x.tardeHoy} ${x.tardeHoy === 1 ? E2("día tarde", "day late") : E2("días tarde", "days late")}` : ""}` },
      ...(x.tarjeta ? [{ k: E2("TARJETA", "CARD"), v: x.tarjeta }] : []),
    ] },
  ];
  const acc = (a: Parameters<typeof rentaAccionPanel>[2], ok: string, after?: () => void) => c.run(() => rentaAccionPanel(c.d.id, x.numero, a), ok, after);
  const nombre = x.cliente.split(" ")[0];
  if (x.st === "held") {
    if (x.cardFailed) out.push({ type: "note", tone: "warn", icon: "card", t: E2(`La tarjeta de ${nombre} no pasó al recoger. Ya le pedimos cambiarla; te avisamos cuando lo haga. No la entregues hasta que pase.`, `${nombre}'s card did not go through at pickup. We asked them to change it and will let you know. Do not hand it over until it goes through.`) });
    out.push({ type: "note", tone: "info", icon: "info", t: x.dep ? E2(`Al tocar «La recogió» se cobran ${money(x.rent)} de renta y se retiene el depósito de ${money(x.dep)} en su tarjeta. Si el banco no deja, no se cobra nada.`, `Tapping “Picked up” charges ${money(x.rent)} rent and holds the ${money(x.dep)} deposit on their card. If the bank declines, nothing is charged.`)
      : E2(`Al tocar «La recogió» se cobran ${money(x.rent)} de renta en su tarjeta.`, `Tapping “Picked up” charges ${money(x.rent)} rent on their card.`) });
    out.push({ type: "acts", items: [
      { l: E2("La recogió", "Picked up"), v: "primary", icon: "check", off: c.pending, onClick: () => acc({ que: "recogio" }, E2(`Listo: ${nombre} la tiene. Renta cobrada.`, `Done: ${nombre} has it. Rent charged.`)) },
      { l: E2("Cancelar el apartado", "Cancel the hold"), v: "secondary", icon: "close", off: c.pending, onClick: () => acc({ que: "cancelar" }, E2("Apartado cancelado: volvió a la tienda.", "Hold cancelled: back on the shelf.")) }] });
  } else if (x.st === "out") {
    const ui = c.ui, dano = !!ui.rnD, max = Math.max(0, x.dep - Math.min(x.tardeHoy * x.p, x.dep));
    const dc = Math.min(max, Math.max(500, Number(ui.rnC ?? Math.min(2500, max)))), nota = String(ui.rnN ?? ""), f = ui.rnF as { id: string; url: string } | null | undefined;
    const lateC = Math.min(x.tardeHoy * x.p, x.dep);
    out.push({ type: "note", tone: x.tardeHoy ? "warn" : "info", icon: x.tardeHoy ? "clock" : "info", t: x.tardeHoy ? E2(`Llegó ${x.tardeHoy} ${x.tardeHoy === 1 ? "día" : "días"} tarde: al tocar «La devolvió» se descuentan ${money(lateC)} del depósito${x.dep > lateC ? ` y se libera el resto (${money(x.dep - lateC)})` : ""}.`, `${x.tardeHoy} ${x.tardeHoy === 1 ? "day" : "days"} late: tapping “Returned” takes ${money(lateC)} from the deposit${x.dep > lateC ? ` and releases the rest (${money(x.dep - lateC)})` : ""}.`)
      : x.dep ? E2(`Al tocar «La devolvió» se libera el depósito de ${money(x.dep)}.`, `Tapping “Returned” releases the ${money(x.dep)} deposit.`) : E2("Sin depósito: al devolverla se cierra la renta.", "No deposit: returning it closes the rental.") });
    if (!dano) out.push({ type: "acts", items: [
      { l: E2("La devolvió", "Returned"), v: "primary", icon: "check", off: c.pending, onClick: () => acc({ que: "devolvio" }, E2("Listo: devuelta.", "Done: returned.")) },
      ...(x.dep && max >= 100 ? [{ l: E2("La devolvió con un daño", "Returned with damage"), v: "secondary" as const, icon: "warning", off: c.pending, onClick: () => c.setUi({ rnD: true }) }] : [])] });
    else {
      out.push({ type: "group", k: E2("EL DAÑO · EL CLIENTE LO VE ANTES DE DESCONTAR", "THE DAMAGE · THE CLIENT SEES IT BEFORE ANYTHING IS DEDUCTED") });
      out.push({ type: "photos", k: E2("FOTO · OBLIGATORIA", "PHOTO · REQUIRED"), count: `${f ? 1 : 0}/1`, cols: 3, items: f ? [{ key: f.url, bg: `url("${f.url}")`, onClick: () => c.setUi({ rnF: null }) }] : [],
        addL: E2("Tomar o subir foto", "Take or upload photo"), onAdd: f ? undefined : () => c.pickFiles(false, async (fs) => { const r = await subirFoto(fs[0]!); if (r.ok && r.id && r.url) c.setUi({ rnF: { id: r.id, url: r.url } }); else c.toast(r.mensaje ? r.mensaje[es ? "es" : "en"] : E2("No se pudo subir la foto.", "Couldn’t upload the photo.")); }) });
      out.push({ type: "step", t: E2("Cuánto descontar", "How much to deduct"), s: E2(`Hasta ${money(max)}: lo que queda del depósito.`, `Up to ${money(max)}: what is left of the deposit.`), v: money(dc), onM: () => c.setUi({ rnC: Math.max(500, dc - 500) }), onP: () => c.setUi({ rnC: Math.min(max, dc + 500) }) });
      out.push({ type: "field", area: true, rows: 2, max: 300, k: E2("QUÉ SE DAÑÓ", "WHAT WAS DAMAGED"), val: nota, count: `${nota.length}/300`, ph: E2("Ej.: la manguera llegó cortada", "E.g. the hose came back cut"), onChange: (v) => c.setUi({ rnN: v.slice(0, 300) }) });
      out.push({ type: "note", tone: "info", icon: "shield", t: E2(`${nombre} ve la foto y el monto y decide. Si no está de acuerdo (o no responde en 72 horas), lo revisa To'Latino. El depósito sigue retenido mientras tanto.`, `${nombre} sees the photo and amount and decides. If they disagree (or do not answer in 72 hours), To'Latino reviews it. The deposit stays held meanwhile.`) });
      out.push({ type: "acts", items: [
        { l: E2("Mandar el daño", "Send the damage"), v: "primary", icon: "check", off: c.pending || !f || nota.trim().length < 4, onClick: () => acc({ que: "dano", cents: dc, foto: f!.id, nota }, E2(`${nombre} ya ve el daño.`, `${nombre} can see the damage.`), () => c.setUi({ rnD: false, rnF: null, rnN: "", rnC: null })) },
        { l: E2("Volver", "Back"), v: "secondary", icon: "close", off: c.pending, onClick: () => c.setUi({ rnD: false }) }] });
    }
  } else if (x.st === "back") {
    if (x.dmgSt) out.push({ type: "note", tone: x.dmgSt === "asked" || x.dmgSt === "disputed" ? "warn" : "ok", icon: "warning", t: x.dmgSt === "asked" ? E2(`Mandaste un daño de ${money(x.dmgC ?? 0)}. Espera el OK de ${nombre}${x.dmgEsperaH != null ? ` (si no responde en ${x.dmgEsperaH} h, lo revisa To'Latino)` : ""}.`, `You sent ${money(x.dmgC ?? 0)} damage. Waiting for ${nombre}'s OK${x.dmgEsperaH != null ? ` (if no answer in ${x.dmgEsperaH} h, To'Latino reviews it)` : ""}.`)
      : x.dmgSt === "disputed" ? E2(`${nombre} no está de acuerdo con el daño de ${money(x.dmgC ?? 0)}: To'Latino lo revisa con los dos.`, `${nombre} disagrees with the ${money(x.dmgC ?? 0)} damage: To'Latino reviews it with both.`)
        : x.dmgSt === "waived" ? E2("To'Latino decidió no descontar el daño.", "To'Latino decided not to deduct the damage.") : E2(`Se descontaron ${money(x.dmgC ?? 0)} por el daño.`, `${money(x.dmgC ?? 0)} deducted for the damage.`) });
    if (x.dmgFoto) out.push({ type: "photos", k: E2("FOTO DEL DAÑO", "DAMAGE PHOTO"), cols: 3, items: [{ key: x.dmgFoto, bg: `url("${x.dmgFoto}")`, onClick: () => window.open(x.dmgFoto!, "_blank", "noopener") }] });
    if (x.lateD) out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Llegó ${x.lateD} ${x.lateD === 1 ? "día" : "días"} tarde: ${money(x.lateC)} del depósito.`, `${x.lateD} ${x.lateD === 1 ? "day" : "days"} late: ${money(x.lateC)} from the deposit.`) });
  } else out.push({ type: "note", tone: "info", icon: "info", t: x.st === "expired" ? E2("Pasaron las 48 horas sin que la recogiera: volvió a la tienda. No se cobró nada.", "48 hours passed without pickup: back on the shelf. Nothing was charged.") : E2("Se canceló el apartado. No se cobró nada.", "The hold was cancelled. Nothing was charged.") });
  return { blocks: out, ed: null };
}
