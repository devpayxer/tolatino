"use client";
/* Cobros (Panel v2 · DASH-COBROS · det «stripe» y movimientos, dash2-pay.js): conectar la cuenta de cobro con Stripe
   (Tus datos · Datos fiscales · Tu banco · Verificación), revisando, la cuenta lista (banco, cuándo te llega, cargo de la
   tarjeta incluido en la comisión, retención), lo de esta semana y los últimos cobros con tarjeta. «Plan» llega con Pro. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { CobrosPanel } from "@/lib/cobros";
import { cobrosActualizar, cobrosConectar, cobrosStripe } from "./acciones-cobros";
import type { Ctx } from "./Panel";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const MES: [string, string][] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
const fecha = (c: Ctx, ymd: string) => { const d = new Date(`${ymd}T12:00:00Z`), m = MES[d.getUTCMonth()]!; return c.es ? `mar ${d.getUTCDate()} ${m[0]}` : `Tue ${m[1]} ${d.getUTCDate()}`; };
const cuando = (c: Ctx, iso: string) => new Intl.DateTimeFormat(c.es ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

const DSP = (E2: (a: string, b: string) => string): Record<string, [string, string]> => ({ needs_response: [E2("EN DISPUTA", "DISPUTED"), "danger"], under_review: [E2("EN DISPUTA", "DISPUTED"), "danger"], won: [E2("GANADA", "WON"), "signal"], lost: [E2("PERDIDA", "LOST"), "danger"], accepted: [E2("DEVUELTO", "REFUNDED"), "danger"] });
export function cobrosBloques(c: Ctx, x: CobrosPanel | undefined): Bloque[] {
  const { E2, d } = c;
  if (!x) return [{ type: "head", t: E2("Cobros", "Payouts") }, { type: "empty", icon: "card", t: E2("Sin acceso", "No access"), s: E2("Solo el dueño maneja los cobros.", "Only the owner manages payouts.") }];
  const st = x.cuenta.estado, done = st === "enabled" || st === "restricted";
  const ir = (url?: string) => { if (url) { if (url.startsWith("/")) c.nav(url); else window.location.href = url; } };
  const out: Bloque[] = [{ type: "head", eye: E2("COBROS CON TARJETA", "CARD PAYOUTS"),
    t: done ? E2("Tu cuenta de cobros", "Your payout account") : st === "pending" ? E2("Revisando tu cuenta", "Reviewing your account") : E2("Cobra con tarjeta en la app", "Take cards in the app"),
    s: E2("Solo hace falta para cobrar con tarjeta. Vender, agendar y cobrar en persona funciona sin esto.", "Only needed to take cards. Selling, booking and in-person payments work without it.") }];
  if (x.modo === "simulador") out.push({ type: "note", tone: "info", icon: "info", t: E2("Sandbox: los cobros van contra el simulador de To’Latino. Ninguna tarjeta real se cobra.", "Sandbox: payouts run against To’Latino’s simulator. No real card is charged.") });
  if (x.modo === "apagado" && !done) { out.push({ type: "note", tone: "warn", icon: "clock", t: E2("Los cobros con tarjeta todavía no están encendidos en To’Latino. Sigue vendiendo en el local.", "Card payouts are not on in To’Latino yet. Keep selling in person.") }); return out; }
  if (st === "restricted") out.push({ type: "note", tone: "warn", icon: "warning", t: E2(`Stripe necesita un dato más${x.cuenta.pide.length ? ` (${x.cuenta.pide.length})` : ""}.`, `Stripe needs one more detail${x.cuenta.pide.length ? ` (${x.cuenta.pide.length})` : ""}.`), cta: E2("Completar en Stripe", "Complete in Stripe"), onCta: () => c.run(() => cobrosStripe(d.id), undefined, (r) => ir(r?.url)) });
  if (x.cuenta.pausado) out.push({ type: "note", tone: "danger", icon: "lock", t: `${E2("Pagos al banco retenidos por To’Latino", "Payouts held by To’Latino")}${x.cuenta.motivo ? `: ${x.cuenta.motivo}` : ""}. ${E2("Salen cuando se resuelva; no se pierde nada.", "They go out once resolved; nothing is lost.")}` });
  const pasos: [string, string, string, string][] = [
    ["Tus datos", "Your details", "Nombre, fecha de nacimiento y dirección.", "Name, date of birth and address."],
    ["Datos fiscales", "Tax details", "Stripe te pide tu SSN, ITIN o EIN: lo exige la ley para pagarte. To’Latino no lo ve ni lo guarda.", "Stripe asks for your SSN, ITIN or EIN: the law requires it to pay you. To’Latino never sees or stores it."],
    ["Tu banco", "Your bank", "Número de ruta y de cuenta.", "Routing and account number."],
    ["Verificación", "Verification", "La hace Stripe, nuestro socio de pagos, en minutos.", "Done by Stripe, our payments partner, in minutes."],
  ];
  out.push({ type: "rows", items: pasos.map(([te, tn, se, sn], i): Fila => { const ok = done; return { icon: ok ? "check" : "lock", ifg: ok ? "var(--tl-open-text)" : "rgba(11,14,18,.45)", ibg: "var(--tl-paper)", t: `${i + 1}. ${E2(te, tn)}`, s: E2(se, sn), compact: true, chev: false }; }) });
  if (done) {
    out.push({ type: "kv", items: [
      { k: E2("BANCO", "BANK"), v: x.cuenta.banco ? `·· ${x.cuenta.banco}` : E2("En Stripe", "In Stripe") },
      { k: E2("CUÁNDO TE LLEGA", "WHEN IT ARRIVES"), v: E2("Cada martes · lo de lunes a domingo", "Every Tuesday · Monday to Sunday") },
      { k: E2("CARGO DE LA TARJETA", "CARD PROCESSING"), v: E2("Incluido en la comisión", "Included in the fee") },
      { k: E2("RETENCIÓN", "HOLD"), v: x.cuenta.pausado ? E2("Retenidos por To’Latino", "Held by To’Latino") : E2("Ninguna", "None") },
    ] });
    out.push({ type: "acts", items: [
      { l: E2("Cambiar banco", "Change bank"), v: "secondary", icon: "card", off: c.pending, onClick: () => c.run(() => cobrosStripe(d.id), undefined, (r) => ir(r?.url)) },
      { l: E2("Encender la tarjeta en Pedidos", "Turn on cards in Orders"), v: "secondary", icon: "bag", onClick: () => c.go("mod", "pedidos") },
    ] });
    out.push({ type: "note", tone: "ink", icon: "dollar", t: E2(`Qué se cobra: en pedidos pagados con tarjeta, To’Latino se queda con el ${x.tasa / 100} % del subtotal; el envío y la propina te llegan completos. El cargo de la tarjeta sale de esa comisión. En efectivo o en el local, nada.`, `What is charged: on orders paid by card, To’Latino keeps ${x.tasa / 100}% of the subtotal; delivery fee and tip reach you in full. Card processing comes out of that fee. Cash or in person: nothing.`) });
    out.push({ type: "group", k: E2("ESTA SEMANA · LUNES A DOMINGO", "THIS WEEK · MONDAY TO SUNDAY") });
    out.push({ type: "kpis", cols: c.desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("COBRADO CON TARJETA", "TAKEN BY CARD"), v: money(x.semana.cobrado), s: `${x.semana.n} ${x.semana.n === 1 ? E2("pedido", "order") : E2("pedidos", "orders")}`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E2("COMISIÓN", "FEE"), v: `−${money(x.semana.comision)}` },
      { k: E2("DEVUELTO", "REFUNDED"), v: `−${money(x.semana.devuelto)}` },
      { k: E2("TE LLEGA", "YOU GET"), v: money(x.semana.neto), s: E2(`el ${fecha(c, x.semana.martes)}`, `on ${fecha(c, x.semana.martes)}`) },
    ] });
    const TG: Record<string, [string, string]> = { held: [E2("RETENIDO", "HELD"), "neutral"], captured: [E2("COBRADO", "CHARGED"), "signal"], released: [E2("LIBERADO", "RELEASED"), "neutral"], refunded: [E2("DEVUELTO", "REFUNDED"), "danger"], partially_refunded: [E2("DEVUELTO EN PARTE", "PARTLY REFUNDED"), "action"], failed: [E2("FALLÓ", "FAILED"), "danger"] };
    // Disputas (2r): el cliente reclamó el cobro con su banco. To'Latino responde con la evidencia del pedido.
    const enDisputa = x.cobros.filter((p) => p.disputa === "needs_response" || p.disputa === "under_review");
    if (enDisputa.length) out.push({ type: "note", tone: "warn", icon: "warning", t: E2(`${enDisputa.length === 1 ? `El pedido #${enDisputa[0]!.num} está` : `${enDisputa.length} pedidos están`} en disputa con el banco del cliente. To’Latino responde con la evidencia del pedido; no tienes que hacer nada. Te avisamos el resultado.`, `${enDisputa.length === 1 ? `Order #${enDisputa[0]!.num} is` : `${enDisputa.length} orders are`} disputed with the customer’s bank. To’Latino responds with the order evidence; you don’t need to do anything. We will tell you the result.`) });
    out.push(x.cobros.length ? { type: "rows", k: E2("ÚLTIMOS COBROS CON TARJETA", "LATEST CARD CHARGES"), items: x.cobros.map((p): Fila => ({
      key: p.num, icon: "card", t: `${E2("Pedido", "Order")} #${p.num} · ${p.quien}`, s: `${cuando(c, p.at)}${p.tarjeta ? ` · ${p.tarjeta}` : ""}${p.estado === "captured" || p.estado === "partially_refunded" ? ` · ${E2("comisión", "fee")} ${money(Math.round(p.comision * (p.monto - p.devuelto) / p.monto))}` : ""}${p.devuelto ? ` · ${E2("devuelto", "refunded")} ${money(p.devuelto)}` : ""}`,
      r: money(p.monto), tag: p.disputa ? DSP(E2)[p.disputa]?.[0] ?? p.disputa : TG[p.estado]?.[0] ?? p.estado, tone: p.disputa ? DSP(E2)[p.disputa]?.[1] ?? "danger" : TG[p.estado]?.[1] ?? "neutral", chev: true, onClick: () => c.nav(`/panel/${d.id}/hoy?det=ped:${p.num}`) })) }
      : { type: "empty", icon: "card", t: E2("Todavía no hay cobros con tarjeta", "No card charges yet"), s: E2("Cuando alguien pague con tarjeta, lo ves aquí con su comisión.", "When someone pays by card, you see it here with its fee.") });
  } else if (st === "pending") {
    out.push({ type: "note", tone: "info", icon: "clock", t: E2("Revisando… te avisamos cuando esté lista. Mientras, sigues vendiendo en el local.", "Reviewing… we will let you know when it is ready. Meanwhile you keep selling in person.") });
    out.push({ type: "acts", items: [
      { l: E2("Seguir en Stripe", "Continue in Stripe"), v: "primary", icon: "card", off: c.pending, onClick: () => c.run(() => cobrosConectar(d.id), undefined, (r) => ir(r?.url)) },
      { l: E2("Ver si ya está", "Check if it is ready"), v: "secondary", off: c.pending, onClick: () => c.run(() => cobrosActualizar(d.id), E2("Actualizado.", "Updated.")) },
    ] });
  } else {
    out.push({ type: "acts", items: [
      { l: E2("Conectar con Stripe", "Connect with Stripe"), v: "primary", icon: "card", off: c.pending, onClick: () => c.run(() => cobrosConectar(d.id), undefined, (r) => ir(r?.url)) },
      { l: E2("Ahora no", "Not now"), v: "secondary", onClick: () => c.go("hoy") },
    ] });
  }
  return out;
}
