"use client";
/* ADM-NEG · 360° › Dinero (Super Admin.dc.html, pestaña «din»): cifras de 90 días, Stripe (cuenta, banco, pagos semanales
   y pausar pagos), plan y facturas (cortesía 30/60/90, extender prueba 7/14/30, reintentar, anular) y los últimos cobros con
   tarjeta. Cada acción pide motivo y queda en la auditoría; el servidor revisa el permiso otra vez. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import type { Dinero } from "@/lib/admin-dinero";
import { pagosPausar } from "./acciones-dinero";
import { planAnular, planCortesia, planExtender, planQuitarCortesia, planReintentar } from "./acciones-planes";
import type { Confirmar } from "./Colas";
import { useE2 } from "./idioma-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminNote" | "AdminList", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
let EN = false;
const fecha = (iso: string | null) => (iso ? new Intl.DateTimeFormat(EN ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "") : "—");
const dia = (iso: string) => new Intl.DateTimeFormat(EN ? "en-US" : "es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "");
type EF = (es: string, en: string) => string;
const CUENTA = (E2: EF): Record<string, [string, string]> => ({ enabled: [E2("Habilitada · recibe pagos", "Enabled · receives payouts"), "var(--tl-open-text)"], pending: [E2("Falta verificar la identidad", "Identity not verified yet"), "var(--tl-pro-ink)"], restricted: [E2("Restringida por Stripe", "Restricted by Stripe"), "var(--tl-pro-ink)"] });
const SUB = (E2: EF): Record<string, string> => ({ trial: E2("En prueba", "On trial"), active: E2("Activa", "Active"), canceling: E2("Pasa a Free al final del período", "Moves to Free at the end of the period"), past_due: E2("Cobro fallido", "Charge failed"), courtesy: E2("Pro de cortesía", "Courtesy Pro"), ended: E2("Free · el contenido Pro está guardado", "Free · Pro content is saved") });
const FAC = (E2: EF): Record<string, [string, string, string]> => ({ charged: [E2("Cobro de Pro", "Pro charge"), E2("PAGADA", "PAID"), "signal"], failed: [E2("Cobro fallido", "Charge failed"), E2("FALLÓ", "FAILED"), "danger"], trial_extended: [E2("Prueba extendida", "Trial extended"), E2("EQUIPO", "TEAM"), "neutral"], courtesy: [E2("Pro de cortesía", "Courtesy Pro"), E2("EQUIPO", "TEAM"), "action"], courtesy_removed: [E2("Cortesía quitada", "Courtesy removed"), E2("EQUIPO", "TEAM"), "neutral"], ended: [E2("Pasó a Free", "Moved to Free"), "FREE", "neutral"] });
const PAGO = (E2: EF): Record<string, [string, string]> => ({ held: [E2("RETENIDO", "HELD"), "action"], captured: [E2("COBRADO", "CHARGED"), "signal"], released: [E2("LIBERADO", "RELEASED"), "neutral"], refunded: [E2("DEVUELTO", "REFUNDED"), "neutral"], partially_refunded: [E2("DEVOLUCIÓN PARCIAL", "PARTIAL REFUND"), "action"], failed: [E2("FALLÓ", "FAILED"), "danger"] });
const DISP = (E2: EF): Record<string, string> => ({ needs_response: E2("DISPUTA · FALTA RESPONDER", "DISPUTE · NEEDS RESPONSE"), under_review: E2("DISPUTA · EL BANCO REVISA", "DISPUTE · BANK REVIEWING"), won: E2("DISPUTA GANADA", "DISPUTE WON"), lost: E2("DISPUTA PERDIDA", "DISPUTE LOST"), accepted: E2("DISPUTA ACEPTADA", "DISPUTE ACCEPTED") });
const POR = (E2: EF) => [E2("Disputa abierta con el banco", "Open dispute with the bank"), E2("Sospecha de fraude", "Suspected fraud"), E2("Muchas devoluciones seguidas", "Many refunds in a row"), E2("Pedido del dueño", "Owner’s request")];
const D = (n: number) => ({ k: String(n), l: EN ? `${n} days` : `${n} días` });

export function N360Dinero({ d, id, nombre, desk, setConf }: { d: Dinero; id: string; nombre: string; desk: boolean; setConf: (c: Confirmar) => void }) {
  const router = useRouter(), c = d.cuenta, s = d.sub, P = d.puede, k = d.kpi, { E2 } = useE2();
  EN = E2("", "x") === "x";
  const CU = CUENTA(E2), SB = SUB(E2), FA = FAC(E2), PG = PAGO(E2), DS = DISP(E2);
  const B: Bloque[] = [
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("COBRADO · 90 D", "CHARGED · 90 D"), v: money(k.cobrado), s: E2(`${k.n} ${k.n === 1 ? "cobro" : "cobros"} con tarjeta`, `${k.n} card ${k.n === 1 ? "charge" : "charges"}`) },
      { k: E2("RETENIDO AHORA", "HELD NOW"), v: money(k.retenido), s: E2("esperando que el negocio acepte", "waiting for the business to accept") },
      { k: E2("DEVUELTO", "REFUNDED"), v: money(k.devuelto), s: E2("90 días", "90 days") },
      { k: E2("COMISIÓN TO’LATINO", "TO’LATINO FEE"), v: money(k.comision), s: E2("sobre lo cobrado", "on what was charged"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
    ] },
    { type: "group", k: "STRIPE" },
    { type: "kv", cols: desk ? 3 : 1, items: [
      { k: E2("CUENTA", "ACCOUNT"), v: c ? CU[c.estado]?.[0] ?? c.estado : E2("Sin conectar · no cobra en línea", "Not connected · no online payments"), fg: c ? CU[c.estado]?.[1] : undefined },
      { k: E2("BANCO", "BANK"), v: c?.banco ? E2(`Termina en ${c.banco}`, `Ends in ${c.banco}`) : "—" },
      { k: E2("PAGOS", "PAYOUTS"), v: !c ? "—" : c.pausado ? E2("En pausa por To’Latino", "Paused by To’Latino") : E2("Cada semana · los martes", "Weekly · on Tuesdays"), fg: c?.pausado ? "var(--tl-pro-ink)" : undefined },
    ] },
  ];
  if (c?.pausado) B.push({ type: "note", tone: "danger", icon: "lock", t: E2(`Pagos en pausa desde el ${fecha(c.desde)}${c.quien ? ` por ${c.quien}` : ""}: ${c.motivo ?? "sin motivo"}. Se sigue cobrando; nada sale al banco hasta reanudar. El dueño lo ve en Cobros.`, `Payouts paused since ${fecha(c.desde)}${c.quien ? ` by ${c.quien}` : ""}: ${c.motivo ?? "no reason"}. Charging continues; nothing goes to the bank until resumed. The owner sees it in Payments.`) });
  if (c && c.pide.length) B.push({ type: "note", tone: "warn", icon: "info", t: E2(`Stripe todavía pide ${c.pide.length} ${c.pide.length === 1 ? "dato" : "datos"} al dueño. Mientras falten, los pagos al banco pueden detenerse.`, `Stripe still needs ${c.pide.length} ${c.pide.length === 1 ? "item" : "items"} from the owner. Until then, payouts may stop.`) });
  if (d.modo !== "stripe" || c?.sim) B.push({ type: "note", tone: "info", icon: "info", t: E2("Sandbox: los cobros van contra el simulador y no se mueve dinero real. Los pagos al banco se calculan de lo cobrado.", "Sandbox: charges go to the simulator and no real money moves. Payouts are calculated from what was charged.") });
  const L: Bloque[] = [];
  if (c && P.pausar && (c.estado === "enabled" || c.pausado)) L.push({ type: "acts", items: [c.pausado
    ? { l: E2("Reanudar pagos", "Resume payouts"), v: "action", icon: "check", onClick: () => setConf({ titulo: E2(`Reanudar los pagos de ${nombre}`, `Resume payouts for ${nombre}`), cta: E2("Reanudar", "Resume"), sub: E2("Lo pendiente sale el próximo martes. El dueño recibe el aviso.", "What’s pending goes out next Tuesday. The owner gets the notice."), plantillas: [E2("Se resolvió la disputa.", "The dispute was resolved."), E2("Se confirmó que no hubo fraude.", "Confirmed there was no fraud.")], nota: "interna", hacer: (m) => pagosPausar(id, false, m) }) }
    : { l: E2("Pausar pagos", "Pause payouts"), v: "danger", icon: "lock", onClick: () => setConf({ titulo: E2(`Pausar los pagos de ${nombre}`, `Pause payouts for ${nombre}`), cta: E2("Pausar", "Pause"), peligro: true, sub: E2("El dinero sigue cobrándose pero no sale al banco hasta que lo reanudes. Úsalo con disputas o sospecha de fraude. El dueño recibe el aviso.", "Money is still charged but doesn’t go to the bank until you resume. Use it with disputes or suspected fraud. The owner gets the notice."), plantillas: POR(E2), nota: "persona", hacer: (m) => pagosPausar(id, true, m) }) }] });

  const pagos: Bloque = d.pagos.length
    ? { type: "rows", items: d.pagos.map((p) => ({ key: p.martes, icon: "dollar", t: E2(`${money(p.monto)} al banco`, `${money(p.monto)} to the bank`), s: `${dia(p.martes)} · ${p.n} ${E2(p.n === 1 ? "cobro" : "cobros", p.n === 1 ? "charge" : "charges")}${c?.banco ? ` · ·· ${c.banco}` : ""}`,
        tag: p.st === "hold" ? E2("EN PAUSA", "PAUSED") : p.st === "next" ? E2("PRÓXIMO", "NEXT") : E2("ENVIADO", "SENT"), tone: p.st === "hold" ? "danger" : p.st === "next" ? "action" : "signal", chev: false })) }
    : { type: "note", tone: "info", icon: "dollar", t: c ? E2("Sin pagos al banco en las últimas 6 semanas.", "No payouts in the last 6 weeks.") : E2("Sin cuenta de cobro: el negocio cobra solo en el local.", "No payment account: the business only takes payment in person.") };

  const plan: Bloque[] = [{ type: "group", k: E2("PLAN Y FACTURAS", "PLAN AND INVOICES"), link: E2("Ver en Planes", "See in Plans"), onLink: () => router.push("/admin/planes?tab=subs") }];
  plan.push({ type: "kv", cols: desk ? 2 : 1, items: [
    { k: "PLAN", v: !s ? "Free" : s.estado === "courtesy" ? E2(`Pro de cortesía · hasta el ${fecha(s.fin)}`, `Courtesy Pro · until ${fecha(s.fin)}`) : s.estado === "ended" ? "Free" : `Pro · ${money(s.precio * (s.ciclo === "year" ? 10 : 1))}${s.ciclo === "year" ? E2(" al año", " a year") : E2(" al mes", " a month")}` },
    { k: E2("ESTADO", "STATUS"), v: !s ? E2("Sin plan", "No plan") : s.estado === "past_due" ? E2(`Cobro fallido · intento ${s.intentos} de 3`, `Charge failed · attempt ${s.intentos} of 3`) : s.estado === "trial" ? E2(`En prueba · termina el ${fecha(s.fin)}`, `On trial · ends ${fecha(s.fin)}`) : SB[s.estado] ?? s.estado, fg: s?.estado === "past_due" ? "var(--tl-pro-ink)" : undefined },
    ...(s && ["active", "past_due"].includes(s.estado) ? [{ k: s.estado === "past_due" ? E2("PRÓXIMO INTENTO", "NEXT ATTEMPT") : E2("PRÓXIMO COBRO", "NEXT CHARGE"), v: fecha(s.fin) }] : []),
    ...(s ? [{ k: E2("CLIENTE DESDE", "CUSTOMER SINCE"), v: fecha(s.desde) }] : []),
  ] });
  if (d.facturas.length) plan.push({ type: "rows", items: d.facturas.map((f) => ({ key: f.id, icon: f.kind === "charged" || f.kind === "failed" ? "card" : "clock",
    t: `${FA[f.kind]?.[0] ?? f.kind}${f.monto ? ` · ${money(f.monto)}` : ""}`, s: `${fecha(f.at)}${f.intento ? E2(` · intento ${f.intento} de 3`, ` · attempt ${f.intento} of 3`) : ""}${f.actor ? ` · ${f.actor}` : ""}`,
    tag: FA[f.kind]?.[1], tone: FA[f.kind]?.[2] ?? "neutral", chev: false })) });
  else plan.push({ type: "note", tone: "info", icon: "card", t: E2("Sin cobros de Pro todavía.", "No Pro charges yet.") });
  const pa: { l: string; v?: string; icon: string; onClick: () => void }[] = [];
  if (P.planA && s?.estado !== "courtesy" && !(s && ["active", "canceling"].includes(s.estado))) pa.push({ l: E2("Pro de cortesía", "Courtesy Pro"), icon: "dollar", onClick: () => setConf({ titulo: E2(`Pro de cortesía para ${nombre}`, `Courtesy Pro for ${nombre}`), cta: E2("Dar cortesía", "Give courtesy"), sub: E2("Pro sin cobro por el tiempo que elijas; después vuelve a Free y su contenido Pro se guarda.", "Pro at no charge for the time you choose; then it goes back to Free and its Pro content is saved."), elegir: { label: E2("POR CUÁNTO", "FOR HOW LONG"), items: [D(30), D(60), D(90)] }, plantillas: [E2("Socio fundador.", "Founding partner."), E2("Compensación por un problema.", "Compensation for a problem."), E2("Negocio de la comunidad.", "Community business.")], nota: "interna", hacer: (m, e) => planCortesia(id, e ?? "30", m) }) });
  if (P.planA && s?.estado === "courtesy") pa.push({ l: E2("Quitar cortesía", "Remove courtesy"), icon: "close", onClick: () => setConf({ titulo: E2(`Quitar la cortesía de ${nombre}`, `Remove the courtesy for ${nombre}`), cta: E2("Quitar", "Remove"), peligro: true, sub: E2("Pasa a Free hoy; nada se borra.", "Moves to Free today; nothing is deleted."), nota: "interna", hacer: (m) => planQuitarCortesia(id, m) }) });
  if (P.planE && s?.estado === "trial") pa.push({ l: E2("Extender prueba", "Extend trial"), icon: "clock", onClick: () => setConf({ titulo: E2(`Extender la prueba de ${nombre}`, `Extend the trial for ${nombre}`), cta: E2("Extender", "Extend"), sub: E2("El dueño lo ve en Tu plan.", "The owner sees it in Your plan."), elegir: { label: E2("CUÁNTO MÁS", "HOW MUCH MORE"), items: [D(7), D(14), D(30)] }, plantillas: [E2("Se le pasó la prueba sin usarla.", "The trial ran out without using it."), E2("Problema técnico de To’Latino.", "To’Latino technical problem."), E2("Evento de la ciudad.", "City event.")], nota: "interna", hacer: (m, e) => planExtender(id, e ?? "7", m) }) });
  if (P.planE && s?.estado === "past_due") pa.push({ l: E2("Reintentar cobro", "Retry charge"), v: "action", icon: "card", onClick: () => setConf({ titulo: E2(`Reintentar el cobro de ${nombre}`, `Retry the charge for ${nombre}`), cta: E2("Reintentar", "Retry"), sub: E2("Se cobra ya con la tarjeta guardada del dueño.", "It charges the owner’s saved card now."), plantillas: [E2("El dueño cambió su tarjeta.", "The owner changed their card."), E2("El banco ya lo autorizó.", "The bank already authorized it.")], nota: "interna", hacer: (m) => planReintentar(id, m) }) });
  if (P.planA && s && ["active", "trial", "past_due"].includes(s.estado)) pa.push({ l: E2("Anular suscripción", "Cancel subscription"), v: "danger", icon: "ban", onClick: () => setConf({ titulo: E2(`Anular la suscripción de ${nombre}`, `Cancel the subscription for ${nombre}`), cta: E2("Anular", "Cancel"), peligro: true,
    sub: s.estado === "past_due" ? E2("Pasa a Free hoy (este período no se pagó). Nada se borra.", "Moves to Free today (this period wasn’t paid). Nothing is deleted.") : s.estado === "trial" ? E2("El último día de la prueba pasa a Free. Nada se borra.", "On the last day of the trial it moves to Free. Nothing is deleted.") : E2("Sigue en Pro hasta el final del período y luego baja a Free. No se devuelve lo cobrado.", "Stays Pro until the end of the period, then goes to Free. What was charged isn’t refunded."), nota: "interna", hacer: (m) => planAnular(id, m) }) });
  if (pa.length) plan.push({ type: "acts", items: pa });

  const cobros: Bloque[] = [{ type: "group", k: E2("COBROS CON TARJETA", "CARD CHARGES"), link: d.cobros.length ? E2("Ver en Transacciones", "See in Transactions") : undefined, onLink: () => router.push(`/admin/transacciones?q=${encodeURIComponent(id)}`) }];
  return (
    <>
      <PanelBloques bloques={[...B, pagos, ...L, ...plan, ...cobros]} />
      {d.cobros.length ? <A.AdminList rows={d.cobros.map((x) => ({ icon: "card", title: `${x.num} · ${money(x.monto)}`, sub: `${x.quien} · ${dia(x.at)}${x.tarjeta ? ` · ${x.tarjeta}` : ""} · ${E2("comisión", "fee")} ${money(x.comision)}${x.devuelto ? ` · ${E2("devuelto", "refunded")} ${money(x.devuelto)}` : ""}`,
        tag: x.disputa ? DS[x.disputa] ?? E2("DISPUTA", "DISPUTE") : PG[x.estado]?.[0] ?? x.estado, tone: x.disputa ? (x.disputa === "won" ? "signal" : "danger") : PG[x.estado]?.[1] ?? "neutral" }))} />
        : <A.AdminNote tone="info" icon="card">{E2("Sin cobros con tarjeta todavía.", "No card charges yet.")}</A.AdminNote>}
    </>
  );
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
