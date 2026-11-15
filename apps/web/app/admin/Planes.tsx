"use client";
/* ADM-PLAN · Planes y suscripciones (Super Admin.dc.html secPlan): MRR, en prueba, cobro fallido y Free al techo; Planes
   (Free y Pro), Suscripciones (filtros por estado; extender prueba, cortesía, quitar cortesía, reintentar cobro) y
   Comisiones (vigentes y programadas con 30 días) e Ingresos (comisiones y Pro de 8 semanas, por categoría, CSV). */
import type { ReglaImpuesto } from "@/lib/admin-impuestos";
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { DatosPlanes, Ingresos, TabPlan } from "@/lib/admin-planes";
import { comisionProgramar, impuestoProgramar, ingresosCsv, planCortesia, planExtender, planQuitarCortesia, planReintentar } from "./acciones-planes";
import { alertaNota, conciliacionNota, conciliarOtraVez } from "./acciones-conciliacion";
import type { DiaConc, FilaDif } from "@/lib/conciliacion";
import type { FilaAlerta } from "@/lib/dinero-alertas";
/* 9k · Planes › Ingresos · Conciliación (el guardián del dinero) y las alertas del dinero. */
export type Conc = { dias: DiaConc[]; dia: string | null; difs: { filas: FilaDif[]; sigue: string | null }; alertas: { filas: FilaAlerta[]; sigue: string | null }; todas: boolean } | null;
type EF = (es: string, en: string) => string;
const KIND_DIF = (E: EF): Record<string, string> => ({ payment_intent: E("Cobro", "Charge"), refund: E("Devolución", "Refund"), transfer: E("Transferencia al organizador", "Transfer to organizer"), transfer_reversal: E("Reversión de transferencia", "Transfer reversal"), payout: E("Pago al banco", "Bank payout"), dispute: E("Disputa", "Dispute"), hold_orphan: E("Retención suelta", "Orphan hold") });
const PROB_DIF = (E: EF): Record<string, string> => ({ falta_en_libro: E("está en Stripe y no en nuestro libro", "in Stripe but not in our ledger"), falta_en_stripe: E("está en nuestro libro y no en Stripe", "in our ledger but not in Stripe"), monto: E("el monto no coincide", "amount doesn’t match"), estado: E("el estado no coincide", "status doesn’t match") });
const EST_DIA = (E: EF): Record<string, [string, string]> => ({ cuadra: [E("CUADRA", "BALANCED"), "signal"], diferencias: [E("DIFERENCIAS", "DIFFERENCES"), "danger"], fallo: [E("FALLÓ", "FAILED"), "danger"], sin_correr: [E("SIN CORRER", "NOT RUN"), "neutral"] });
const ALERTA = (E: EF): Record<string, string> => ({ refund_stuck: E("Devolución atascada", "Stuck refund"), transfer_reversal_stuck: E("Transferencia sin saldo para revertir", "Transfer with no balance to reverse"), dispute_due: E("Disputa por vencer", "Dispute due soon"), recon_diff: E("El dinero no cuadra", "The money doesn’t balance"), recon_no_corrio: E("La conciliación no corrió", "Reconciliation didn’t run"), payout_failed: E("Pago al banco que falló", "Failed bank payout") });
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";
import { useE } from "./idioma-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "BarChart" | "HBars", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const EST = (E: EF): Record<string, [string, string, string]> => ({ trial: [E("EN PRUEBA", "ON TRIAL"), "action", E("En prueba", "On trial")], active: ["PRO", "signal", "Pro"], canceling: [E("PASA A FREE", "MOVING TO FREE"), "neutral", E("Pasa a Free", "Moving to Free")], past_due: [E("COBRO FALLIDO", "FAILED CHARGE"), "danger", E("Cobro fallido", "Failed charge")], courtesy: [E("CORTESÍA", "COURTESY"), "action", E("Cortesía", "Courtesy")], ended: ["FREE", "neutral", "Free"] });
const KIND = (E: EF): Record<string, string> => ({ ped: E("Pedidos de comida", "Food orders"), merc: E("Pedidos del mercado", "Market orders"), cita: E("Citas y solicitudes", "Appointments and requests"), bol: E("Boletos", "Tickets"), apt: E("Apartados y layaway", "Holds and layaway"), rsv: E("Reservaciones de mesa", "Table reservations"), plan: E("Planes del hogar", "Home plans"), renta: E("Rentas", "Rentals"), fiesta: E("Depósitos de fiestas", "Party deposits"), viaje: E("Viajes, envíos y mudanzas", "Trips, shipping and moving") });
const fecha = (iso: string | null, en = false) => (iso ? new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "") : "—");

export function Planes({ d, ing, imp = null, conc = null, tab, est, editar, aprobar, exportar, dinero = false }: { d: DatosPlanes; ing?: Ingresos | null; imp?: ReglaImpuesto[] | null; conc?: Conc; tab: TabPlan; est: string | null; editar: boolean; aprobar: boolean; exportar?: boolean; dinero?: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, E = useE();
  const en = E("", "x") === "x", loc = en ? "en-US" : "es-US", KD = KIND_DIF(E), PD = PROB_DIF(E), ED = EST_DIA(E), AL = ALERTA(E), ES = EST(E), KI = KIND(E);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const ir = (t: string, e?: string) => router.push(t === "res" && !e ? "/admin/planes" : `/admin/planes?tab=${t}${e ? `&est=${e}` : ""}`);
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("PLANES Y SUSCRIPCIONES", "PLANS AND SUBSCRIPTIONS"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  /* 9k · La conciliación diaria y las alertas del dinero (compuesto con las piezas del panel: group, rows, note, acts; hueco del diseño, REVISION 9k). */
  const usd = (c: number) => `${c < 0 ? "−" : ""}$${(Math.abs(c) / 100).toFixed(2)}`;
  const diaL = (ymd: string) => new Intl.DateTimeFormat(loc, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, "");
  const irIng = (q: Record<string, string>) => router.push(`/admin/planes?tab=ing&${new URLSearchParams(q)}`);
  const nota = (titulo: string, cta: string, plantillas: string[], hacer: (m: string) => Promise<ResAdm>, peligro = false) => setConf({ titulo, cta, peligro, sub: E("La nota queda en la auditoría con tu nombre.", "The note stays in the audit log with your name."), plantillas, hacer: (m) => hacer(m) });
  const conciliacion = (c: NonNullable<Conc>): Bloque[] => {
    const sel = c.dias.find((x) => x.dia === c.dia) ?? null;
    return [
      { type: "group", k: E("CONCILIACIÓN DIARIA · STRIPE CONTRA NUESTRO LIBRO", "DAILY RECONCILIATION · STRIPE VS. OUR LEDGER") },
      { type: "note", tone: "info", icon: "info", t: E("Cada mañana se cuadra el día anterior, objeto por objeto: cobros, devoluciones, transferencias, pagos al banco, disputas y retenciones sueltas. Una diferencia sin dueño avisa al equipo y sale en Inicio.", "Every morning the previous day is balanced, object by object: charges, refunds, transfers, bank payouts, disputes and orphan holds. A difference with no owner alerts the team and shows on Home.") },
      { type: "rows", items: c.dias.map((x) => ({ key: x.dia, icon: x.estado === "cuadra" ? "check" : x.estado === "sin_correr" ? "clock" : "warning", t: diaL(x.dia),
        s: x.estado === "sin_correr" ? E("todavía no corre", "hasn’t run yet") : x.estado === "fallo" ? E("Stripe no respondió: vuelve a conciliarlo", "Stripe didn’t respond: reconcile it again") : x.estado === "cuadra" ? E(`cuadra · ${x.stripeN} en Stripe, ${x.libroN} en el libro`, `balanced · ${x.stripeN} in Stripe, ${x.libroN} in the ledger`) : E(`${x.diferencias} diferencia${x.diferencias === 1 ? "" : "s"}${x.sinDueno ? ` · ${x.sinDueno} sin dueño` : " · todas con dueño"} · ${usd(x.diferenciaCents)}`, `${x.diferencias} difference${x.diferencias === 1 ? "" : "s"}${x.sinDueno ? ` · ${x.sinDueno} with no owner` : " · all owned"} · ${usd(x.diferenciaCents)}`),
        tag: ED[x.estado]![0], tone: ED[x.estado]![1], chev: true, onClick: () => irIng({ dia: x.dia }), compact: true, bd: x.dia === c.dia ? "1.5px solid var(--tl-ink)" : undefined })) },
      ...(c.dia ? [
        { type: "group" as const, k: `${E("DIFERENCIAS DEL", "DIFFERENCES FOR")} ${diaL(c.dia).toUpperCase()}${sel?.corrioAt ? ` · ${E("CORRIÓ", "RAN")} ${new Intl.DateTimeFormat(loc, { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(sel.corrioAt))}` : ""}` },
        ...(c.difs.filas.length ? [{ type: "rows" as const, items: c.difs.filas.map((f) => ({ key: f.id, icon: f.kind === "dispute" ? "law" : "dollar", t: `${KD[f.kind] ?? f.kind}: ${PD[f.problem] ?? f.problem}`,
          s: `${f.nombre ?? "To’Latino"} · ${f.stripeId ?? f.ledgerRef ?? ""} · Stripe ${f.stripeCents == null ? "—" : usd(f.stripeCents)}${f.stripeStatus ? ` (${f.stripeStatus})` : ""} · ${E("libro", "ledger")} ${f.ledgerCents == null ? "—" : usd(f.ledgerCents)}${f.ledgerStatus ? ` (${f.ledgerStatus})` : ""}${f.dueno ? ` · ${f.dueno.accion === "resuelta" ? E("resuelta por", "resolved by") : f.dueno.accion === "me_hago_cargo" ? E("de", "owned by") : E("reabierta por", "reopened by")} ${f.dueno.quien}: ${f.dueno.nota}` : ""}`,
          tag: !f.dueno || f.dueno.accion === "reabierta" ? E("SIN DUEÑO", "NO OWNER") : f.dueno.accion === "resuelta" ? E("RESUELTA", "RESOLVED") : E("CON DUEÑO", "OWNED"), tone: !f.dueno || f.dueno.accion === "reabierta" ? "danger" : f.dueno.accion === "resuelta" ? "signal" : "action", chev: false,
          acts: dinero ? [
            ...(!f.dueno || f.dueno.accion === "reabierta" ? [{ l: E("Me hago cargo", "I’ll take it"), v: "secondary", onClick: () => nota(E("Me hago cargo de la diferencia", "I’ll take this difference"), E("Me hago cargo", "I’ll take it"), [E("La reviso hoy con Stripe.", "I’ll check it with Stripe today."), E("Es un cobro de prueba del sandbox.", "It’s a sandbox test charge."), E("Lo veo con el negocio.", "I’ll sort it out with the business.")], (m) => conciliacionNota(f.key, "me_hago_cargo", m)) }] : []),
            ...(f.dueno?.accion !== "resuelta" ? [{ l: E("Resuelta", "Resolved"), v: "secondary", onClick: () => nota(E("Cómo se resolvió", "How it was resolved"), E("Marcar resuelta", "Mark resolved"), [E("Stripe lo corrigió; el libro ya cuadra.", "Stripe fixed it; the ledger balances now."), E("Era un cruce de medianoche: cuadra al día siguiente.", "It was a midnight crossover: it balances the next day."), E("Se ajustó el libro con su caso.", "The ledger was adjusted with its case.")], (m) => conciliacionNota(f.key, "resuelta", m)) }] : []),
            ...(f.dueno && f.dueno.accion !== "reabierta" ? [{ l: E("Reabrir", "Reopen"), v: "secondary", onClick: () => nota(E("Por qué se reabre", "Why reopen it"), E("Reabrir", "Reopen"), [E("Volvió a salir al conciliar otra vez.", "It came up again on re-reconciling."), E("La nota no era correcta.", "The note wasn’t correct.")], (m) => conciliacionNota(f.key, "reabierta", m)) }] : []),
          ] : undefined })) }]
          : [{ type: "empty" as const, icon: "check", t: sel?.estado === "sin_correr" ? E("Este día todavía no se concilió", "This day hasn’t been reconciled yet") : E("Sin diferencias", "No differences"), s: sel?.estado === "fallo" ? E("La corrida falló: vuelve a conciliarlo.", "The run failed: reconcile it again.") : E("Stripe y nuestro libro dicen lo mismo.", "Stripe and our ledger agree.") }]),
        ...(c.difs.sigue ? [{ type: "acts" as const, items: [{ l: E("Ver más", "See more"), v: "secondary", onClick: () => irIng({ dia: c.dia!, antes: c.difs.sigue! }) }] }] : []),
        ...(dinero ? [{ type: "acts" as const, items: [{ l: E("Conciliar otra vez", "Reconcile again"), v: "secondary", onClick: () => nota(`${E("Conciliar otra vez", "Reconcile again")} · ${diaL(c.dia!)}`, E("Conciliar", "Reconcile"), [E("Stripe ya corrigió el objeto.", "Stripe already fixed the object."), E("La corrida de la mañana falló.", "The morning run failed.")], (m) => conciliarOtraVez(c.dia!, m)) }] }] : []),
      ] : []),
      { type: "group", k: c.todas ? E("ALERTAS DEL DINERO · TODAS", "MONEY ALERTS · ALL") : E("ALERTAS DEL DINERO · ABIERTAS", "MONEY ALERTS · OPEN"), link: c.todas ? E("Solo abiertas", "Open only") : E("Ver todas", "See all"), onLink: () => irIng({ ...(c.dia ? { dia: c.dia } : {}), ...(c.todas ? {} : { alertas: "todas" }) }) },
      ...(c.alertas.filas.length ? [{ type: "rows" as const, items: c.alertas.filas.map((a) => ({ key: a.id, icon: a.kind === "dispute_due" ? "law" : "warning", t: `${AL[a.kind] ?? a.kind}${a.monto ? ` · ${usd(a.monto)}` : ""}`,
        s: `${(en ? a.detalle.en : a.detalle.es) || a.detalle.es}${a.nombre ? ` · ${a.nombre}` : ""}${a.nota ? ` · ${a.nota.quien}: ${a.nota.nota}` : ""}`, tag: a.estado === "abierta" ? E("ABIERTA", "OPEN") : a.estado === "con_dueno" ? E("CON DUEÑO", "OWNED") : E("RESUELTA", "RESOLVED"), tone: a.estado === "abierta" ? "danger" : a.estado === "con_dueno" ? "action" : "signal", chev: false,
        acts: dinero && a.estado !== "resuelta" ? [
          ...(a.estado === "abierta" ? [{ l: E("Me hago cargo", "I’ll take it"), v: "secondary", onClick: () => nota(E("Me hago cargo de la alerta", "I’ll take this alert"), E("Me hago cargo", "I’ll take it"), [E("La reviso hoy.", "I’ll check it today."), E("Hablo con el negocio.", "I’ll talk to the business.")], (m) => alertaNota(a.id, "me_hago_cargo", m)) }] : []),
          ...(a.aMano ? [{ l: E("Resolver a mano", "Resolve manually"), v: "secondary", onClick: () => nota(a.kind === "refund_stuck" ? E("La devolución se hizo fuera de Stripe", "The refund was made outside Stripe") : E("Se le cobró al organizador fuera de Stripe", "The organizer was charged outside Stripe"), E("Resolver a mano", "Resolve manually"), a.kind === "refund_stuck" ? [E("Se le mandó un cheque al cliente.", "A check was sent to the customer."), E("Se le devolvió por transferencia bancaria; comprobante en el caso.", "Refunded by bank transfer; receipt in the case.")] : [E("El organizador pagó por transferencia; comprobante en el caso.", "The organizer paid by transfer; receipt in the case."), E("Se descontó de su próxima liquidación fuera de Stripe.", "Deducted from their next settlement outside Stripe.")], (m) => alertaNota(a.id, "resuelta_a_mano", m), true) }] : []),
          { l: E("Resuelta", "Resolved"), v: "secondary", onClick: () => nota(E("Cómo se resolvió", "How it was resolved"), E("Marcar resuelta", "Mark resolved"), [E("Stripe ya lo hizo.", "Stripe already did it."), E("Se respondió la disputa con evidencia.", "The dispute was answered with evidence."), E("El banco del negocio ya recibió el pago.", "The business’s bank received the payout.")], (m) => alertaNota(a.id, "resuelta", m)) },
        ] : undefined })) }]
        : [{ type: "empty" as const, icon: "check", t: E("Ninguna alerta abierta", "No open alerts"), s: E("Devoluciones, transferencias, disputas y pagos al banco al día.", "Refunds, transfers, disputes and bank payouts up to date.") }]),
      ...(c.alertas.sigue ? [{ type: "acts" as const, items: [{ l: E("Ver más alertas", "See more alerts"), v: "secondary", onClick: () => irIng({ ...(c.dia ? { dia: c.dia } : {}), ...(c.todas ? { alertas: "todas" } : {}), aantes: c.alertas.sigue! }) }] }] : []),
    ];
  };
  const k = d.kpi;
  const B: Bloque[] = [
    { type: "head", eye: E("DINERO Y CRECIMIENTO", "MONEY AND GROWTH"), t: E("Planes y suscripciones", "Plans and subscriptions"), s: E("Free y Pro: qué incluye cada uno, la prueba, el precio, los cobros fallidos y las comisiones.", "Free and Pro: what each includes, the trial, the price, failed charges and fees."), h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "MRR", v: money(k.mrr), s: E(`${k.activos + k.anuales} Pro activos${k.anuales ? ` · ${k.anuales} anuales` : ""}`, `${k.activos + k.anuales} active Pro${k.anuales ? ` · ${k.anuales} annual` : ""}`), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E("EN PRUEBA", "ON TRIAL"), v: String(k.prueba), s: k.prueba7 ? E(`${k.prueba7} terminan en 7 días`, `${k.prueba7} end in 7 days`) : E("ninguna termina esta semana", "none end this week"), onClick: () => ir("subs", "trial") },
      { k: E("COBRO FALLIDO", "FAILED CHARGE"), v: String(k.fallidos), s: E("3 intentos en 7 días", "3 attempts in 7 days"), onClick: () => ir("subs", "past_due") },
      { k: E("FREE AL TECHO", "FREE AT CAP"), v: String(k.techo), s: E(`${d.cfg.tope} en línea este mes · solo Llamar`, `${d.cfg.tope} online this month · Call only`) },
    ] },
    { type: "tabs", items: ([["res", E("Planes", "Plans")], ["subs", E("Suscripciones", "Subscriptions")], ["fees", E("Comisiones", "Fees")], ["ing", E("Ingresos", "Revenue")], ["tax", E("Impuestos", "Taxes")]] as const).map(([t, l]) => ({ l, on: tab === t, onClick: () => ir(t) })) },
  ];
  if (tab === "res") {
    B.push({ type: "group", k: "FREE" }, { type: "kv", items: [{ k: E("TECHO MENSUAL EN LÍNEA", "MONTHLY ONLINE CAP"), v: E(`${d.cfg.tope} pedidos o citas · después, Llamar`, `${d.cfg.tope} orders or appointments · then, Call`) }, { k: E("PÁGINA", "PAGE"), v: E("Una sola página, pocas fotos y 5 ítems; reseñas sin respuesta", "A single page, few photos and 5 items; no review replies") }] });
    B.push({ type: "group", k: "PRO" }, { type: "kv", items: [{ k: E("PRECIO", "PRICE"), v: E(`${money(d.cfg.precio)} al mes · anual = 10 meses`, `${money(d.cfg.precio)} a month · annual = 10 months`) }, { k: E("PRUEBA", "TRIAL"), v: E(`${d.cfg.prueba} días sin tarjeta · HZL30 = 60`, `${d.cfg.prueba} days, no card · HZL30 = 60`) }, { k: E("COBRO FALLIDO", "FAILED CHARGE"), v: E("3 intentos en 7 días con aviso; al tercero, Free (nada se borra)", "3 attempts in 7 days with notice; after the third, Free (nothing is deleted)") }, { k: E("CORTESÍA", "COURTESY"), v: E(`${k.cortesia} negocios`, `${k.cortesia} businesses`) }] });
    B.push({ type: "note", tone: "ink", icon: "info", t: E("El precio, la prueba y el techo de Free son decisión del fundador: se cambian con una actualización de To’Latino, con su OK. Extender una prueba o dar cortesía se hace por negocio en Suscripciones.", "The price, the trial and the Free cap are the founder’s decision: they change with a To’Latino update, with their OK. Extending a trial or giving courtesy is done per business in Subscriptions.") });
  }
  if (tab === "subs") {
    B.push({ type: "chips", items: [["", E("Todas", "All")], ["trial", E("En prueba", "On trial")], ["past_due", E("Cobro fallido", "Failed charge")], ["active", "Pro"], ["canceling", E("Pasa a Free", "Moving to Free")], ["courtesy", E("Cortesía", "Courtesy")], ["ended", "Free"]].map(([v, l]) => ({ l: l!, v: (est ?? "") === v ? "selected" : "filter", onClick: () => ir("subs", v || undefined) })) });
  }
  const filas = tab === "subs" ? d.subs : [];
  const acciones = (x: DatosPlanes["subs"][number]) => [
    { label: E("Ver negocio", "View business"), variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.negocio}`) },
    ...(editar && x.estado === "trial" ? [{ label: E("Extender prueba", "Extend trial"), variant: "secondary", onClick: () => setConf({ titulo: E(`Extender la prueba · ${x.nombre}`, `Extend the trial · ${x.nombre}`), cta: E("Extender", "Extend"), sub: E("El dueño lo ve en Tu plan. Entre 1 y 60 días.", "The owner sees it in Your plan. Between 1 and 60 days."), valor: { k: E("DÍAS", "DAYS"), ini: "7", max: 2 }, plantillas: [E("Se le pasó la prueba sin usarla.", "The trial ran out without being used."), E("Problema técnico de To’Latino.", "To’Latino technical issue."), E("Evento de la ciudad.", "City event.")], hacer: (m, _e, v) => planExtender(x.negocio, v, m) }) }] : []),
    ...(aprobar && x.estado !== "courtesy" ? [{ label: E("Cortesía", "Courtesy"), variant: "secondary", onClick: () => setConf({ titulo: E(`Pro de cortesía · ${x.nombre}`, `Courtesy Pro · ${x.nombre}`), cta: E("Dar cortesía", "Give courtesy"), sub: E("Pro sin cobro por N días; después vuelve a Free y su contenido Pro se guarda.", "Pro at no charge for N days; then it goes back to Free and its Pro content is kept."), valor: { k: E("DÍAS", "DAYS"), ini: "30", max: 3 }, plantillas: [E("Socio fundador.", "Founding partner."), E("Compensación por un problema.", "Compensation for an issue."), E("Negocio de la comunidad.", "Community business.")], hacer: (m, _e, v) => planCortesia(x.negocio, v, m) }) }] : []),
    ...(aprobar && x.estado === "courtesy" ? [{ label: E("Quitar cortesía", "Remove courtesy"), variant: "secondary", onClick: () => setConf({ titulo: E(`Quitar cortesía · ${x.nombre}`, `Remove courtesy · ${x.nombre}`), cta: E("Quitar", "Remove"), peligro: true, sub: E("Pasa a Free hoy; nada se borra.", "Moves to Free today; nothing is deleted."), hacer: (m) => planQuitarCortesia(x.negocio, m) }) }] : []),
    ...(editar && x.estado === "past_due" ? [{ label: E("Reintentar cobro", "Retry charge"), variant: "secondary", onClick: () => setConf({ titulo: E(`Reintentar el cobro · ${x.nombre}`, `Retry the charge · ${x.nombre}`), cta: E("Reintentar", "Retry"), sub: E("Se cobra ya con la tarjeta guardada del dueño.", "Charges now with the owner’s saved card."), plantillas: [E("El dueño cambió su tarjeta.", "The owner changed their card."), E("El banco ya lo autorizó.", "The bank already authorized it.")], hacer: (m) => planReintentar(x.negocio, m) }) }] : []),
  ];
  if (tab === "fees") {
    B.push({ type: "note", tone: "info", icon: "info", t: E("Comisión solo sobre lo cobrado con tarjeta en la app; el cargo de la tarjeta lo absorbe la comisión. Un cambio aplica en 30 días y los negocios reciben el aviso; lo ya vendido no cambia.", "Fee only on what’s charged by card in the app; the fee covers the card processing cost. A change applies in 30 days and businesses get notified; past sales don’t change.") });
    B.push({ type: "rows", items: d.fees.map((f) => ({ key: f.id, icon: "dollar", t: KI[f.kind] ?? f.kind, s: f.vigente ? (f.reason ?? E("Vigente", "Current")) : `${E("Programada desde el", "Scheduled from")} ${fecha(f.desde, en)} · ${f.reason ?? ""}`,
      r: `${f.rate_bp / 100} %${f.fixed_cents ? ` + ${money(f.fixed_cents)}` : ""}`, tag: f.vigente ? null : E("PROGRAMADO", "SCHEDULED"), tone: "action", chev: false,
      acts: aprobar && f.vigente && f.kind !== "rsv" ? [{ l: E("Programar cambio", "Schedule change"), v: "secondary", onClick: () => setConf({ titulo: `${E("Nueva comisión", "New fee")} · ${KI[f.kind]}`, cta: E("Programar", "Schedule"), sub: E(`Ahora: ${f.rate_bp / 100} %. Aplica en 30 días; lo ya vendido no cambia.`, `Now: ${f.rate_bp / 100}%. Applies in 30 days; past sales don’t change.`), valor: { k: E("PORCENTAJE (0 A 30)", "PERCENT (0 TO 30)"), ini: String(f.rate_bp / 100), max: 5 }, hacer: (m, _e, v) => comisionProgramar(f.kind, v, m) }) }] : undefined })) });
  }
  if (tab === "tax") {
    // 9n-19 · Impuestos (L471), compuesto como Comisiones: la vigente de cada ciudad y categoría y las programadas; un cambio es una regla nueva.
    const CAT: Record<string, [string, string]> = { "NEG-AUTO": [E("Taller (Auto)", "Auto shop"), E("Partes", "Parts")], "NEG-HOGAR": [E("Hogar", "Home services"), E("Materiales", "Materials")],
      "NEG-DEALER": [E("Venta de autos", "Car sales"), E("Precio", "Price")], "NEG-FOOD": [E("Comida (evento privado)", "Food (private event)"), E("Consumo", "Food and drink")] };
    const pc = (bp: number) => `${bp / 100} %`;
    B.push({ type: "note", tone: "info", icon: "info", t: E("El impuesto de cada ciudad y categoría: sobre las partes o el precio, y sobre la mano de obra. Un cambio es una regla nueva desde una fecha y queda en la auditoría; lo ya cotizado o vendido no cambia. Revísalo con el contador antes de cambiarlo.", "Each city and category’s tax: on parts or price, and on labor. A change is a new rule from a date and stays in the audit log; what was already quoted or sold doesn’t change. Check with the accountant before changing it.") });
    B.push((imp ?? []).length ? { type: "rows", items: (imp ?? []).map((x) => {
      const [cn, pn] = CAT[x.cat] ?? [x.cat, E("Partes", "Parts")];
      return { key: x.id, icon: "dollar", t: `${x.ciudad} · ${cn}`, s: x.vigente ? (x.motivo ?? E("Vigente", "Current")) : `${E("Programada desde el", "Scheduled from")} ${fecha(x.desde, en)}${x.motivo ? ` · ${x.motivo}` : ""}`,
        r: `${pn} ${pc(x.partes)} · ${E("Mano de obra", "Labor")} ${pc(x.mano)}`, tag: x.vigente ? null : E("PROGRAMADA", "SCHEDULED"), tone: "action", chev: false,
        acts: aprobar && x.vigente ? [{ l: E("Programar cambio", "Schedule change"), v: "secondary", onClick: () => setConf({ titulo: `${E("Nuevo impuesto", "New tax")} · ${x.ciudad} · ${cn}`, cta: E("Programar", "Schedule"),
          sub: E(`Ahora: ${pn} ${pc(x.partes)}, mano de obra ${pc(x.mano)}. Lo ya cotizado o vendido no cambia.`, `Now: ${pn} ${pc(x.partes)}, labor ${pc(x.mano)}. What was already quoted or sold doesn’t change.`),
          elegir: { label: E("QUÉ CAMBIA Y DESDE CUÁNDO", "WHAT CHANGES AND FROM WHEN"), items: [["partes", pn], ["mano", E("Mano de obra", "Labor")]].flatMap(([k, l]) =>
            [["ahora", E("desde ahora", "from now")], ["mes", E("desde el 1.º del mes que viene", "from the 1st of next month")], ["enero", E("desde el 1.º de enero", "from January 1")]].map(([c, lc]) => ({ k: `${k}:${c}`, l: `${l} · ${lc}` }))) },
          valor: { k: E("PORCENTAJE (0 A 20)", "PERCENT (0 TO 20)"), ini: String(x.partes / 100), max: 5 },
          plantillas: [E("Cambió la ley del estado.", "State law changed."), E("Indicación del contador.", "Accountant’s instruction."), E("Impuesto local de la ciudad.", "City local tax.")],
          hacer: (m, e, v) => impuestoProgramar(x.ciudadId, x.cat, e ?? "", v, m) }) }] : undefined };
    }) } : { type: "empty", icon: "dollar", t: E("Sin reglas de impuesto", "No tax rules"), s: E("Las de tus ciudades salen aquí.", "Your cities’ rules show here.") });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      {tab === "ing" && ing ? (() => {
        // Ingresos (diseño «ing»): comisiones de 8 semanas (la actual resaltada), Pro de 8 semanas, comisión por categoría.
        const dia = (ymd: string) => new Intl.DateTimeFormat(loc, { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, "");
        const tot = ing.semanas.reduce((a, w) => a + w.fee, 0), totPro = ing.semanas.reduce((a, w) => a + w.pro, 0), mx = Math.max(1, ...ing.categorias.map((k) => k.fee));
        const descargar = async () => { const r = await ingresosCsv(); if (!r.ok || !r.archivo) { setToast(r.ok ? E("No se pudo.", "It didn’t work.") : r.mensaje); return; }
          const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`\ufeff${r.archivo}`], { type: "text/csv;charset=utf-8" })); a.download = r.nombre ?? "tolatino-ingresos.csv"; document.body.appendChild(a); a.click(); a.remove(); setToast(r.mensaje ?? E("Descargado.", "Downloaded.")); };
        return (<>
          <A.BarChart label={E("COMISIONES · 8 SEMANAS", "FEES · 8 WEEKS")} value={money(tot)} note={E(`Más Pro: ${money(totPro)} cobrados en 8 semanas · MRR ${money(d.kpi.mrr)} al mes.`, `Plus Pro: ${money(totPro)} collected in 8 weeks · MRR ${money(d.kpi.mrr)} a month.`)}
            bars={ing.semanas.map((w, i) => ({ value: w.fee, label: dia(w.ini), color: i === ing.semanas.length - 1 ? "var(--tl-action)" : "rgba(75,55,245,.35)" }))} />
          <A.BarChart label={E("COBROS DE PRO · 8 SEMANAS", "PRO CHARGES · 8 WEEKS")} value={money(totPro)} bars={ing.semanas.map((w, i) => ({ value: w.pro, label: dia(w.ini), color: i === ing.semanas.length - 1 ? "var(--tl-ink)" : "rgba(11,14,18,.3)" }))} />
          {ing.categorias.length ? <A.HBars label={E("COMISIÓN POR CATEGORÍA · 90 DÍAS", "FEE BY CATEGORY · 90 DAYS")} items={ing.categorias.map((k) => ({ label: k.cat, width: `${Math.round((k.fee / mx) * 100)}%`, value: money(k.fee), color: "var(--tl-ink)" }))} />
            : <PanelBloques bloques={[{ type: "empty", icon: "dollar", t: E("Sin comisiones en 90 días", "No fees in 90 days"), s: E("Aparecen cuando los negocios cobran con tarjeta.", "They show up when businesses charge by card.") }]} />}
          <PanelBloques bloques={[{ type: "note", tone: "info", icon: "info", t: E("Comisión = lo que To’Latino se queda de cada cobro con tarjeta, neto de devoluciones. Pro = cobros de suscripción. Los pagos a los negocios salen cada martes por Stripe.", "Fee = what To’Latino keeps from each card charge, net of refunds. Pro = subscription charges. Payouts to businesses go out every Tuesday through Stripe.") },
            ...(exportar ? [{ type: "acts" as const, items: [{ l: E("Exportar CSV", "Export CSV"), v: "secondary", icon: "folder", onClick: () => { void descargar(); } }] }] : [])]} />
          {conc ? <PanelBloques bloques={conciliacion(conc)} h1={desk ? 26 : 22} /> : null}
        </>);
      })() : null}
      {tab === "subs" && (filas.length ? <A.AdminList rows={filas.map((x) => ({ icon: "wallet", title: x.nombre, sub: `${ES[x.estado]?.[2] ?? x.estado}${x.fin ? ` · ${x.estado === "trial" ? E("termina", "ends") : x.estado === "past_due" ? E("próximo intento", "next attempt") : x.estado === "ended" ? E("desde", "since") : x.estado === "courtesy" ? E("hasta", "until") : E("próximo cobro", "next charge")} ${fecha(x.fin, en)}` : ""}${x.intentos ? E(` · intento ${x.intentos} de 3`, ` · attempt ${x.intentos} of 3`) : ""}${x.ciclo === "year" ? E(" · anual", " · annual") : ""}${x.dueño ? ` · ${x.dueño}` : ""}`,
        tag: ES[x.estado]?.[0] ?? x.estado, tone: ES[x.estado]?.[1] ?? "neutral", actions: acciones(x) }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "wallet", t: E("Nada con ese filtro", "Nothing with that filter"), s: E("Prueba otro estado.", "Try another status.") }]} />)}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
