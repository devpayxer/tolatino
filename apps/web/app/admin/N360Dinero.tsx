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
import { useE } from "./idioma-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminNote" | "AdminList", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
let EN = false;
const fecha = (iso: string | null) => (iso ? new Intl.DateTimeFormat(EN ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "") : "—");
const dia = (iso: string) => new Intl.DateTimeFormat(EN ? "en-US" : "es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "");
type EF = (es: string, en: string) => string;
const CUENTA = (E: EF): Record<string, [string, string]> => ({ enabled: [E("Habilitada · recibe pagos", "Enabled · receives payouts"), "var(--tl-open-text)"], pending: [E("Falta verificar la identidad", "Identity not verified yet"), "var(--tl-pro-ink)"], restricted: [E("Restringida por Stripe", "Restricted by Stripe"), "var(--tl-pro-ink)"] });
const SUB = (E: EF): Record<string, string> => ({ trial: E("En prueba", "On trial"), active: E("Activa", "Active"), canceling: E("Pasa a Free al final del período", "Moves to Free at the end of the period"), past_due: E("Cobro fallido", "Charge failed"), courtesy: E("Pro de cortesía", "Courtesy Pro"), ended: E("Free · el contenido Pro está guardado", "Free · Pro content is saved") });
const FAC = (E: EF): Record<string, [string, string, string]> => ({ charged: [E("Cobro de Pro", "Pro charge"), E("PAGADA", "PAID"), "signal"], failed: [E("Cobro fallido", "Charge failed"), E("FALLÓ", "FAILED"), "danger"], trial_extended: [E("Prueba extendida", "Trial extended"), E("EQUIPO", "TEAM"), "neutral"], courtesy: [E("Pro de cortesía", "Courtesy Pro"), E("EQUIPO", "TEAM"), "action"], courtesy_removed: [E("Cortesía quitada", "Courtesy removed"), E("EQUIPO", "TEAM"), "neutral"], ended: [E("Pasó a Free", "Moved to Free"), "FREE", "neutral"] });
const PAGO = (E: EF): Record<string, [string, string]> => ({ held: [E("RETENIDO", "HELD"), "action"], captured: [E("COBRADO", "CHARGED"), "signal"], released: [E("LIBERADO", "RELEASED"), "neutral"], refunded: [E("DEVUELTO", "REFUNDED"), "neutral"], partially_refunded: [E("DEVOLUCIÓN PARCIAL", "PARTIAL REFUND"), "action"], failed: [E("FALLÓ", "FAILED"), "danger"] });
const DISP = (E: EF): Record<string, string> => ({ needs_response: E("DISPUTA · FALTA RESPONDER", "DISPUTE · NEEDS RESPONSE"), under_review: E("DISPUTA · EL BANCO REVISA", "DISPUTE · BANK REVIEWING"), won: E("DISPUTA GANADA", "DISPUTE WON"), lost: E("DISPUTA PERDIDA", "DISPUTE LOST"), accepted: E("DISPUTA ACEPTADA", "DISPUTE ACCEPTED") });
const POR = (E: EF) => [E("Disputa abierta con el banco", "Open dispute with the bank"), E("Sospecha de fraude", "Suspected fraud"), E("Muchas devoluciones seguidas", "Many refunds in a row"), E("Pedido del dueño", "Owner’s request")];
const D = (n: number) => ({ k: String(n), l: EN ? `${n} days` : `${n} días` });

export function N360Dinero({ d, id, nombre, desk, setConf }: { d: Dinero; id: string; nombre: string; desk: boolean; setConf: (c: Confirmar) => void }) {
  const router = useRouter(), c = d.cuenta, s = d.sub, P = d.puede, k = d.kpi, E = useE();
  EN = E("", "x") === "x";
  const CU = CUENTA(E), SB = SUB(E), FA = FAC(E), PG = PAGO(E), DS = DISP(E);
  const B: Bloque[] = [
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("COBRADO · 90 D", "CHARGED · 90 D"), v: money(k.cobrado), s: E(`${k.n} ${k.n === 1 ? "cobro" : "cobros"} con tarjeta`, `${k.n} card ${k.n === 1 ? "charge" : "charges"}`) },
      { k: E("RETENIDO AHORA", "HELD NOW"), v: money(k.retenido), s: E("esperando que el negocio acepte", "waiting for the business to accept") },
      { k: E("DEVUELTO", "REFUNDED"), v: money(k.devuelto), s: E("90 días", "90 days") },
      { k: E("COMISIÓN TO’LATINO", "TO’LATINO FEE"), v: money(k.comision), s: E("sobre lo cobrado", "on what was charged"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
    ] },
    { type: "group", k: "STRIPE" },
    { type: "kv", cols: desk ? 3 : 1, items: [
      { k: E("CUENTA", "ACCOUNT"), v: c ? CU[c.estado]?.[0] ?? c.estado : E("Sin conectar · no cobra en línea", "Not connected · no online payments"), fg: c ? CU[c.estado]?.[1] : undefined },
      { k: E("BANCO", "BANK"), v: c?.banco ? E(`Termina en ${c.banco}`, `Ends in ${c.banco}`) : "—" },
      { k: E("PAGOS", "PAYOUTS"), v: !c ? "—" : c.pausado ? E("En pausa por To’Latino", "Paused by To’Latino") : E("Cada semana · los martes", "Weekly · on Tuesdays"), fg: c?.pausado ? "var(--tl-pro-ink)" : undefined },
    ] },
  ];
  if (c?.pausado) B.push({ type: "note", tone: "danger", icon: "lock", t: E(`Pagos en pausa desde el ${fecha(c.desde)}${c.quien ? ` por ${c.quien}` : ""}: ${c.motivo ?? "sin motivo"}. Se sigue cobrando; nada sale al banco hasta reanudar. El dueño lo ve en Cobros.`, `Payouts paused since ${fecha(c.desde)}${c.quien ? ` by ${c.quien}` : ""}: ${c.motivo ?? "no reason"}. Charging continues; nothing goes to the bank until resumed. The owner sees it in Payments.`) });
  if (c && c.pide.length) B.push({ type: "note", tone: "warn", icon: "info", t: E(`Stripe todavía pide ${c.pide.length} ${c.pide.length === 1 ? "dato" : "datos"} al dueño. Mientras falten, los pagos al banco pueden detenerse.`, `Stripe still needs ${c.pide.length} ${c.pide.length === 1 ? "item" : "items"} from the owner. Until then, payouts may stop.`) });
  if (d.modo !== "stripe" || c?.sim) B.push({ type: "note", tone: "info", icon: "info", t: E("Sandbox: los cobros van contra el simulador y no se mueve dinero real. Los pagos al banco se calculan de lo cobrado.", "Sandbox: charges go to the simulator and no real money moves. Payouts are calculated from what was charged.") });
  const L: Bloque[] = [];
  if (c && P.pausar && (c.estado === "enabled" || c.pausado)) L.push({ type: "acts", items: [c.pausado
    ? { l: E("Reanudar pagos", "Resume payouts"), v: "action", icon: "check", onClick: () => setConf({ titulo: E(`Reanudar los pagos de ${nombre}`, `Resume payouts for ${nombre}`), cta: E("Reanudar", "Resume"), sub: E("Lo pendiente sale el próximo martes. El dueño recibe el aviso.", "What’s pending goes out next Tuesday. The owner gets the notice."), plantillas: [E("Se resolvió la disputa.", "The dispute was resolved."), E("Se confirmó que no hubo fraude.", "Confirmed there was no fraud.")], nota: "interna", hacer: (m) => pagosPausar(id, false, m) }) }
    : { l: E("Pausar pagos", "Pause payouts"), v: "danger", icon: "lock", onClick: () => setConf({ titulo: E(`Pausar los pagos de ${nombre}`, `Pause payouts for ${nombre}`), cta: E("Pausar", "Pause"), peligro: true, sub: E("El dinero sigue cobrándose pero no sale al banco hasta que lo reanudes. Úsalo con disputas o sospecha de fraude. El dueño recibe el aviso.", "Money is still charged but doesn’t go to the bank until you resume. Use it with disputes or suspected fraud. The owner gets the notice."), plantillas: POR(E), nota: "persona", hacer: (m) => pagosPausar(id, true, m) }) }] });

  const pagos: Bloque = d.pagos.length
    ? { type: "rows", items: d.pagos.map((p) => ({ key: p.martes, icon: "dollar", t: E(`${money(p.monto)} al banco`, `${money(p.monto)} to the bank`), s: `${dia(p.martes)} · ${p.n} ${E(p.n === 1 ? "cobro" : "cobros", p.n === 1 ? "charge" : "charges")}${c?.banco ? ` · ·· ${c.banco}` : ""}`,
        tag: p.st === "hold" ? E("EN PAUSA", "PAUSED") : p.st === "next" ? E("PRÓXIMO", "NEXT") : E("ENVIADO", "SENT"), tone: p.st === "hold" ? "danger" : p.st === "next" ? "action" : "signal", chev: false })) }
    : { type: "note", tone: "info", icon: "dollar", t: c ? E("Sin pagos al banco en las últimas 6 semanas.", "No payouts in the last 6 weeks.") : E("Sin cuenta de cobro: el negocio cobra solo en el local.", "No payment account: the business only takes payment in person.") };

  const plan: Bloque[] = [{ type: "group", k: E("PLAN Y FACTURAS", "PLAN AND INVOICES"), link: E("Ver en Planes", "See in Plans"), onLink: () => router.push("/admin/planes?tab=subs") }];
  plan.push({ type: "kv", cols: desk ? 2 : 1, items: [
    { k: "PLAN", v: !s ? "Free" : s.estado === "courtesy" ? E(`Pro de cortesía · hasta el ${fecha(s.fin)}`, `Courtesy Pro · until ${fecha(s.fin)}`) : s.estado === "ended" ? "Free" : `Pro · ${money(s.precio * (s.ciclo === "year" ? 10 : 1))}${s.ciclo === "year" ? E(" al año", " a year") : E(" al mes", " a month")}` },
    { k: E("ESTADO", "STATUS"), v: !s ? E("Sin plan", "No plan") : s.estado === "past_due" ? E(`Cobro fallido · intento ${s.intentos} de 3`, `Charge failed · attempt ${s.intentos} of 3`) : s.estado === "trial" ? E(`En prueba · termina el ${fecha(s.fin)}`, `On trial · ends ${fecha(s.fin)}`) : SB[s.estado] ?? s.estado, fg: s?.estado === "past_due" ? "var(--tl-pro-ink)" : undefined },
    ...(s && ["active", "past_due"].includes(s.estado) ? [{ k: s.estado === "past_due" ? E("PRÓXIMO INTENTO", "NEXT ATTEMPT") : E("PRÓXIMO COBRO", "NEXT CHARGE"), v: fecha(s.fin) }] : []),
    ...(s ? [{ k: E("CLIENTE DESDE", "CUSTOMER SINCE"), v: fecha(s.desde) }] : []),
  ] });
  if (d.facturas.length) plan.push({ type: "rows", items: d.facturas.map((f) => ({ key: f.id, icon: f.kind === "charged" || f.kind === "failed" ? "card" : "clock",
    t: `${FA[f.kind]?.[0] ?? f.kind}${f.monto ? ` · ${money(f.monto)}` : ""}`, s: `${fecha(f.at)}${f.intento ? E(` · intento ${f.intento} de 3`, ` · attempt ${f.intento} of 3`) : ""}${f.actor ? ` · ${f.actor}` : ""}`,
    tag: FA[f.kind]?.[1], tone: FA[f.kind]?.[2] ?? "neutral", chev: false })) });
  else plan.push({ type: "note", tone: "info", icon: "card", t: E("Sin cobros de Pro todavía.", "No Pro charges yet.") });
  const pa: { l: string; v?: string; icon: string; onClick: () => void }[] = [];
  if (P.planA && s?.estado !== "courtesy" && !(s && ["active", "canceling"].includes(s.estado))) pa.push({ l: E("Pro de cortesía", "Courtesy Pro"), icon: "dollar", onClick: () => setConf({ titulo: E(`Pro de cortesía para ${nombre}`, `Courtesy Pro for ${nombre}`), cta: E("Dar cortesía", "Give courtesy"), sub: E("Pro sin cobro por el tiempo que elijas; después vuelve a Free y su contenido Pro se guarda.", "Pro at no charge for the time you choose; then it goes back to Free and its Pro content is saved."), elegir: { label: E("POR CUÁNTO", "FOR HOW LONG"), items: [D(30), D(60), D(90)] }, plantillas: [E("Socio fundador.", "Founding partner."), E("Compensación por un problema.", "Compensation for a problem."), E("Negocio de la comunidad.", "Community business.")], nota: "interna", hacer: (m, e) => planCortesia(id, e ?? "30", m) }) });
  if (P.planA && s?.estado === "courtesy") pa.push({ l: E("Quitar cortesía", "Remove courtesy"), icon: "close", onClick: () => setConf({ titulo: E(`Quitar la cortesía de ${nombre}`, `Remove the courtesy for ${nombre}`), cta: E("Quitar", "Remove"), peligro: true, sub: E("Pasa a Free hoy; nada se borra.", "Moves to Free today; nothing is deleted."), nota: "interna", hacer: (m) => planQuitarCortesia(id, m) }) });
  if (P.planE && s?.estado === "trial") pa.push({ l: E("Extender prueba", "Extend trial"), icon: "clock", onClick: () => setConf({ titulo: E(`Extender la prueba de ${nombre}`, `Extend the trial for ${nombre}`), cta: E("Extender", "Extend"), sub: E("El dueño lo ve en Tu plan.", "The owner sees it in Your plan."), elegir: { label: E("CUÁNTO MÁS", "HOW MUCH MORE"), items: [D(7), D(14), D(30)] }, plantillas: [E("Se le pasó la prueba sin usarla.", "The trial ran out without using it."), E("Problema técnico de To’Latino.", "To’Latino technical problem."), E("Evento de la ciudad.", "City event.")], nota: "interna", hacer: (m, e) => planExtender(id, e ?? "7", m) }) });
  if (P.planE && s?.estado === "past_due") pa.push({ l: E("Reintentar cobro", "Retry charge"), v: "action", icon: "card", onClick: () => setConf({ titulo: E(`Reintentar el cobro de ${nombre}`, `Retry the charge for ${nombre}`), cta: E("Reintentar", "Retry"), sub: E("Se cobra ya con la tarjeta guardada del dueño.", "It charges the owner’s saved card now."), plantillas: [E("El dueño cambió su tarjeta.", "The owner changed their card."), E("El banco ya lo autorizó.", "The bank already authorized it.")], nota: "interna", hacer: (m) => planReintentar(id, m) }) });
  if (P.planA && s && ["active", "trial", "past_due"].includes(s.estado)) pa.push({ l: E("Anular suscripción", "Cancel subscription"), v: "danger", icon: "ban", onClick: () => setConf({ titulo: E(`Anular la suscripción de ${nombre}`, `Cancel the subscription for ${nombre}`), cta: E("Anular", "Cancel"), peligro: true,
    sub: s.estado === "past_due" ? E("Pasa a Free hoy (este período no se pagó). Nada se borra.", "Moves to Free today (this period wasn’t paid). Nothing is deleted.") : s.estado === "trial" ? E("El último día de la prueba pasa a Free. Nada se borra.", "On the last day of the trial it moves to Free. Nothing is deleted.") : E("Sigue en Pro hasta el final del período y luego baja a Free. No se devuelve lo cobrado.", "Stays Pro until the end of the period, then goes to Free. What was charged isn’t refunded."), nota: "interna", hacer: (m) => planAnular(id, m) }) });
  if (pa.length) plan.push({ type: "acts", items: pa });

  const cobros: Bloque[] = [{ type: "group", k: E("COBROS CON TARJETA", "CARD CHARGES"), link: d.cobros.length ? E("Ver en Transacciones", "See in Transactions") : undefined, onLink: () => router.push(`/admin/transacciones?q=${encodeURIComponent(id)}`) }];
  return (
    <>
      <PanelBloques bloques={[...B, pagos, ...L, ...plan, ...cobros]} />
      {d.cobros.length ? <A.AdminList rows={d.cobros.map((x) => ({ icon: "card", title: `${x.num} · ${money(x.monto)}`, sub: `${x.quien} · ${dia(x.at)}${x.tarjeta ? ` · ${x.tarjeta}` : ""} · ${E("comisión", "fee")} ${money(x.comision)}${x.devuelto ? ` · ${E("devuelto", "refunded")} ${money(x.devuelto)}` : ""}`,
        tag: x.disputa ? DS[x.disputa] ?? E("DISPUTA", "DISPUTE") : PG[x.estado]?.[0] ?? x.estado, tone: x.disputa ? (x.disputa === "won" ? "signal" : "danger") : PG[x.estado]?.[1] ?? "neutral" }))} />
        : <A.AdminNote tone="info" icon="card">{E("Sin cobros con tarjeta todavía.", "No card charges yet.")}</A.AdminNote>}
    </>
  );
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
