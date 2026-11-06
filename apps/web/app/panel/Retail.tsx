"use client";
/* Lo que vendes › Tu herramienta de Mercados («Balanza y pedidos») y de Tiendas («Tallas y apartados»).
   Diseño: Panel v2 · dash2-cat.js (TOOLS NEG-MERC / NEG-TIENDA, blocksD); plan fase4-mercados-tiendas.md §6. Cada toque se
   guarda en el servidor (acciones-retail.ts) y la página y Buscar lo dicen al momento. Cupo por franja, «si algo no hay» y los
   números del layaway son huecos del diseño (#3, #6) compuestos con las mismas piezas (REVISION). */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { resumenRetail, type HerrMerc, type HerrTienda } from "@/lib/retail-comun";
import { mercAgotado, mercGuardar, mercPrecioLb, tallaExistencia, tiendaGuardar, type MercIn, type TiendaIn } from "./acciones-retail";
import type { Ctx, Sec } from "./Panel";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const lock = (t: string, s: string): Fila => ({ icon: "lock", ibg: "rgba(11,14,18,.06)", ifg: "var(--tl-ink)", t, s, compact: true });

/* La fila de Lo que vendes. */
export function filaHerramientaRetail(c: Ctx): Fila | null {
  const h = c.ret, { E2 } = c;
  if (!h) return null;
  return { icon: h.rubro === "merc" ? "scale" : "bag", t: h.rubro === "merc" ? E2("Balanza y pedidos", "Scale and orders") : E2("Tallas y apartados", "Sizes and holds"),
    s: resumenRetail(h, c.es), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") };
}

export function herramientaRetailBloques(c: Ctx): Sec {
  const h = c.ret!, { E2 } = c;
  const head: Bloque = { type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"),
    t: h.rubro === "merc" ? E2("Balanza y pedidos", "Scale and orders") : E2("Tallas y apartados", "Sizes and holds"),
    s: h.rubro === "merc" ? E2("Lo que va por peso se pesa delante del cliente y se cobra el peso real. Aquí pones el precio por libra y lo que se acabó hoy.", "What goes by weight is weighed in front of the customer at the real weight. Set the price per pound and what ran out today.")
      : E2("Cuántas quedan de cada talla y cuánto tiempo guardas un apartado. Una talla en 0 no se puede apartar.", "How many are left in each size and how long you hold an item. A size at 0 cannot be held.") };
  return { blocks: h.rubro === "merc" ? merc(c, h, head) : tienda(c, h, head), ed: null };
}

function merc(c: Ctx, S: HerrMerc, head: Bloque): (Bloque | null)[] {
  const { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined, nm = (x: { es: string; en: string }) => (es ? x.es : x.en || x.es);
  const ok = E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.");
  const save = (p: MercIn) => c.run(() => mercGuardar(c.d.id, p), ok);
  return [head,
    { type: "rows", k: E2("CÓMO ENTREGAS", "HOW YOU HAND OFF"), items: [
      { icon: "bag", t: "Pickup", tgOn: S.pk, onTg: () => { if (S.pk && !S.env) { c.toast(E2("Deja al menos una forma.", "Keep at least one.")); return; } save({ pk: !S.pk }); } },
      { icon: "truck", t: E2("Envío a casa", "Home delivery"), tgOn: S.env, onTg: () => { if (S.env && !S.pk) { c.toast(E2("Deja al menos una forma.", "Keep at least one.")); return; } save({ env: !S.env }); } }] },
    S.env ? { type: "step", t: E2("Costo del envío", "Delivery fee"), s: E2("Lo que paga el cliente por llevárselo a su casa.", "What the customer pays to have it brought home."), v: S.fee ? usd(S.fee) : E2("Gratis", "Free"),
      onM: () => save({ fee: Math.max(0, S.fee - 50) }), onP: () => save({ fee: Math.min(5000, S.fee + 50) }) } : null,
    S.env ? { type: "step", t: E2("Pedido mínimo para envío", "Delivery minimum"), s: E2("Para pickup no hay mínimo.", "No minimum for pickup."), v: S.min ? usd(S.min) : E2("Sin mínimo", "No minimum"),
      onM: () => save({ min: Math.max(0, S.min - 500) }), onP: () => save({ min: Math.min(50000, S.min + 500) }) } : null,
    // Hueco #3: cuántos pedidos caben por franja (pickup 30 min, envío 1 h).
    { type: "step", t: E2("Pedidos por franja", "Orders per time slot"), s: E2("Cuántos pedidos preparas a la vez. Una franja llena no se ofrece.", "How many orders you prepare at once. A full slot is not offered."), v: String(S.cap),
      onM: () => save({ cap: Math.max(1, S.cap - 1) }), onP: () => save({ cap: Math.min(30, S.cap + 1) }) },
    { type: "chips", k: E2("SI ALGO NO HAY · LO QUE SALE MARCADO AL PEDIR", "IF SOMETHING IS OUT · THE DEFAULT AT CHECKOUT"), items: ([["call", E2("Llamar al cliente", "Call the customer")], ["similar", E2("Uno parecido, con su OK", "A similar one, with their OK")], ["no", E2("Quitarlo", "Remove it")]] as const)
      .map(([k, l]) => ({ l, v: S.sub === k ? "selected" : "filter", onClick: () => save({ sub: k }) })) },
    { type: "rows", k: E2("CÓMO TE PAGAN EN LA TIENDA", "HOW YOU GET PAID IN STORE"), items: [
      { icon: "card", t: "EBT / SNAP", s: E2("Solo comida que no está caliente. No cubre alcohol, tabaco ni el envío.", "Only food that is not hot. Does not cover alcohol, tobacco or delivery."), tgOn: S.ebt, onTg: () => save({ ebt: !S.ebt }) },
      { icon: "dollar", t: E2("Efectivo", "Cash"), tgOn: S.cash, onTg: () => save({ cash: !S.cash }) }] },
    { type: "rows", items: [{ icon: "scale", t: E2("Se pesa delante del cliente", "Weighed in front of the customer"), s: E2("Sale «Pesan delante de ti» en tu página y en Buscar.", "Shows “Weighed in front of you” on your page and in Search."), tgOn: S.pesa, onTg: () => save({ pesa: !S.pesa }) }] },
    ...S.prods.filter((p) => p.peso).map((p): Bloque => ({ type: "step", t: nm(p.name), s: E2("Por libra · se pesa delante", "Per pound · weighed in front"), v: `${usd(p.price)}/lb`,
      onM: () => c.run(() => mercPrecioLb(c.d.id, p.id, Math.max(10, p.price - 10)), ok), onP: () => c.run(() => mercPrecioLb(c.d.id, p.id, p.price + 10), ok) })),
    S.prods.length ? { type: "rows", k: E2("SE ACABÓ HOY · TOCA PARA QUITAR DE LA APP", "RAN OUT TODAY · TAP TO HIDE IN THE APP"), cols: cols2, items: S.prods.map((p): Fila => ({ key: p.id, icon: p.peso ? "scale" : "cart", t: nm(p.name), s: `${usd(p.price)}${p.peso ? "/lb" : ""}`,
      tag: p.ago ? E2("AGOTADO HOY", "SOLD OUT TODAY") : null, tone: "danger", tgOn: !p.ago, onTg: () => c.run(() => mercAgotado(c.d.id, p.id, !p.ago), p.ago ? E2("Vuelve a salir en tu página.", "It shows on your page again.") : E2("Agotado hoy · mañana vuelve solo.", "Sold out today · back tomorrow by itself.")), compact: true })) }
      : { type: "note", tone: "info", t: E2("Cuando agregues productos en Productos, salen aquí para marcar lo que se acabó.", "When you add products under Products, they show here to mark what ran out.") },
    { type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: [lock(E2("Se pesa delante y con foto", "Weighed in front, with a photo"), E2("El cliente ve la balanza antes de pagar.", "The customer sees the scale before paying.")),
      lock(E2("Se cobra el peso real", "Real weight is charged"), E2("Se retiene el estimado + 10 % y se libera el resto.", "The estimate + 10% is held and the rest released.")), lock(E2("Sustituir solo con su OK", "Substitute only with their OK"), E2("Sin OK, no se cobra.", "Without OK, it is not charged."))] },
  ];
}

function tienda(c: Ctx, S: HerrTienda, head: Bloque): (Bloque | null)[] {
  const { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined, nm = (x: { es: string; en: string }) => (es ? x.es : x.en || x.es);
  const ok = E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.");
  const save = (p: TiendaIn) => c.run(() => tiendaGuardar(c.d.id, p), ok);
  const out: (Bloque | null)[] = [head,
    { type: "chips", k: E2("GUARDAS UN APARTADO", "YOU HOLD AN ITEM FOR"), items: ([24, 48, 72] as const).map((h) => ({ l: `${h} h`, v: S.hold === h ? "selected" : "filter", onClick: () => save({ hold: h }) })) },
    { type: "rows", items: [{ icon: "calendar", t: E2("Layaway · pagos para apartar", "Layaway · pay over time"), s: E2("El cliente abona y se lo lleva al terminar de pagar.", "The customer pays in parts and takes it when paid off."), tgOn: S.lay, onTg: () => save({ lay: !S.lay }) }] },
  ];
  // Hueco #6: los números del layaway (salen por escrito en el acuerdo que acepta el cliente).
  if (S.lay) out.push(
    { type: "step", t: E2("Abono para apartar", "Down payment"), s: E2("Lo que paga hoy para guardarlo.", "What they pay today to hold it."), v: `${S.down} %`, onM: () => save({ down: Math.max(10, S.down - 5) }), onP: () => save({ down: Math.min(50, S.down + 5) }) },
    { type: "step", t: E2("Pagos", "Payments"), s: E2("En cuántos pagos se reparte el resto.", "How many payments the rest is split into."), v: String(S.pagos), onM: () => save({ pagos: Math.max(2, S.pagos - 1) }), onP: () => save({ pagos: Math.min(6, S.pagos + 1) }) },
    { type: "chips", k: E2("CADA CUÁNTO", "HOW OFTEN"), items: ([7, 14, 30] as const).map((d) => ({ l: E2(`Cada ${d} días`, `Every ${d} days`), v: S.cada === d ? "selected" : "filter", onClick: () => save({ cada: d }) })) },
    { type: "step", t: E2("Cargo si no termina de pagar", "Fee if they do not finish"), s: E2("Se dice por escrito antes de aceptar. Lo demás se devuelve.", "Stated in writing before accepting. The rest is refunded."), v: `${S.cargo} %`, onM: () => save({ cargo: Math.max(0, S.cargo - 1) }), onP: () => save({ cargo: Math.min(10, S.cargo + 1) }) });
  out.push(
    { type: "step", t: E2("Cambios con el recibo", "Returns with receipt"), s: E2("0 = no acepta cambios. Sale en tu página.", "0 = no returns. Shows on your page."), v: S.dev ? E2(`${S.dev} días`, `${S.dev} days`) : E2("No", "No"),
      onM: () => save({ dev: Math.max(0, S.dev - 7) }), onP: () => save({ dev: Math.min(90, S.dev + 7) }) },
    { type: "rows", k: E2("PAGO", "PAYMENT"), items: [{ icon: "dollar", t: E2("Aceptas efectivo", "You take cash"), s: E2("La tarjeta siempre se acepta. El envío se cambia en Entrega.", "Cards are always accepted. Delivery is set in Delivery."), tgOn: S.cash, onTg: () => save({ cash: !S.cash }) }] });
  for (const it of S.inv) {
    out.push({ type: "group", k: nm(it.name).toUpperCase() });
    for (const t of it.tallas) out.push({ type: "step", t: `${nm(it.label)} ${t.label}`, s: t.stock ? E2("Se puede apartar", "Can be held") : E2("Agotada · no se aparta", "Sold out · cannot be held"), v: String(t.stock),
      onM: () => (t.stock ? c.run(() => tallaExistencia(c.d.id, t.id, -1), E2("Guardado.", "Saved.")) : undefined), onP: () => c.run(() => tallaExistencia(c.d.id, t.id, 1), E2("Guardado.", "Saved.")) });
  }
  if (!S.inv.length) out.push({ type: "note", tone: "info", t: E2("Cuando un producto tenga tallas en Productos, sale aquí para decir cuántas quedan.", "When a product has sizes under Products, it shows here to say how many are left.") });
  out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: [lock(E2("El precio de la app es el de la caja", "The app price is the register price"), E2("Sin cargos que aparezcan al pagar.", "No fees showing up at checkout.")),
    lock(E2("Hoy no se cobra el apartado", "Holding is free today"), E2("Pagas al recoger, en la caja.", "You pay at pickup, at the register."))] });
  return out;
}
