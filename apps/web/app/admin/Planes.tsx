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
import { alertaDecidir, alertaNota, alertaPreguntar, conciliacionNota, conciliarOtraVez } from "./acciones-conciliacion";
import { devolverOtraVezTx } from "./acciones-tx";
import type { DiaConc, FilaDif } from "@/lib/conciliacion";
import type { FilaAlerta, OpcionRevision, PorQueNo } from "@/lib/dinero-alertas";
/* 9k · Planes › Ingresos · Conciliación (el guardián del dinero) y las alertas del dinero. */
export type Conc = { dias: DiaConc[]; dia: string | null; difs: { filas: FilaDif[]; sigue: string | null }; alertas: { filas: FilaAlerta[]; sigue: string | null }; todas: boolean } | null;
type EF = (es: string, en: string) => string;
const KIND_DIF = (E2: EF): Record<string, string> => ({ payment_intent: E2("Cobro", "Charge"), refund: E2("Devolución", "Refund"), transfer: E2("Transferencia al organizador", "Transfer to organizer"), transfer_reversal: E2("Reversión de transferencia", "Transfer reversal"), payout: E2("Pago al banco", "Bank payout"), dispute: E2("Disputa", "Dispute"), hold_orphan: E2("Retención suelta", "Orphan hold") });
const PROB_DIF = (E2: EF): Record<string, string> => ({ falta_en_libro: E2("está en Stripe y no en nuestro libro", "in Stripe but not in our ledger"), falta_en_stripe: E2("está en nuestro libro y no en Stripe", "in our ledger but not in Stripe"), monto: E2("el monto no coincide", "amount doesn’t match"), estado: E2("el estado no coincide", "status doesn’t match") });
const EST_DIA = (E2: EF): Record<string, [string, string]> => ({ cuadra: [E2("CUADRA", "BALANCED"), "signal"], diferencias: [E2("DIFERENCIAS", "DIFFERENCES"), "danger"], fallo: [E2("FALLÓ", "FAILED"), "danger"], sin_correr: [E2("SIN CORRER", "NOT RUN"), "neutral"] });
const ALERTA = (E2: EF): Record<string, string> => ({ refund_stuck: E2("Devolución atascada", "Stuck refund"), transfer_reversal_stuck: E2("Transferencia sin saldo para revertir", "Transfer with no balance to reverse"), dispute_due: E2("Disputa por vencer", "Dispute due soon"), recon_diff: E2("El dinero no cuadra", "The money doesn’t balance"), recon_no_corrio: E2("La conciliación no corrió", "Reconciliation didn’t run"), payout_failed: E2("Pago al banco que falló", "Failed bank payout"), refund_failed: E2("Devolución que Stripe dio por fallida", "Refund Stripe marked as failed"), charge_unapplied: E2("Cobro de Pro sin aplicar", "Unapplied Pro charge"), transfer_stuck: E2("Transferencia al organizador sin respuesta", "Organizer transfer with no answer"), charge_stuck: E2("Cobro de Pro sin respuesta", "Pro charge with no answer"), offsession_stuck: E2("Cobro con tarjeta guardada sin respuesta", "Saved-card charge with no answer"), offsession_unapplied: E2("Cobro con tarjeta guardada sin aplicar", "Unapplied saved-card charge"), gateway_review: E2("Lo que dijo Stripe no se cierra solo", "What Stripe said doesn’t close by itself"), hold_stuck: E2("Retención renovada sin respuesta", "Renewed hold with no answer"), extra_refund_stuck: E2("Devolver lo que Stripe hizo de más", "Refund what Stripe made in excess") });
/* 9t5 · Lo que dijo la última consulta a la pasarela (la escribe el servidor; aquí solo se nombra). */
/* 9t6 (0205) · Por qué algo que Stripe tiene no se puede elegir en «Elegir cuál vale» (lo decide el servidor; aquí solo se nombra). */
const POR_QUE_NO = (E2: EF): Record<PorQueNo, string> => ({ otro_monto: E2("otro monto: no es el de la intención", "another amount: not the intent’s"), no_salio: E2("no salió", "it didn’t go through"), en_curso: E2("sigue en curso en Stripe", "still in progress at Stripe"), periodo_cobrado: E2("ese período ya estaba cobrado", "that period was already charged") });
const CONSULTA = (E2: EF): Record<string, string> => ({ hecho: E2("sí salió", "it went through"), fallido: E2("el banco dijo que no o se canceló", "the bank declined it or it was canceled"), en_curso: E2("sigue en curso en Stripe", "still in progress at Stripe"), no_hallado: E2("no está en Stripe", "it isn’t in Stripe"), varios: E2("hay más de uno en Stripe", "there’s more than one in Stripe"), monto_distinto: E2("está en Stripe con otro monto", "it’s in Stripe with another amount"), sin_respuesta: E2("Stripe no contestó la consulta", "Stripe didn’t answer the query") });
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";
import { useE2 } from "./idioma-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "BarChart" | "HBars", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const EST = (E2: EF): Record<string, [string, string, string]> => ({ trial: [E2("EN PRUEBA", "ON TRIAL"), "action", E2("En prueba", "On trial")], active: ["PRO", "signal", "Pro"], canceling: [E2("PASA A FREE", "MOVING TO FREE"), "neutral", E2("Pasa a Free", "Moving to Free")], past_due: [E2("COBRO FALLIDO", "FAILED CHARGE"), "danger", E2("Cobro fallido", "Failed charge")], courtesy: [E2("CORTESÍA", "COURTESY"), "action", E2("Cortesía", "Courtesy")], ended: ["FREE", "neutral", "Free"] });
const KIND = (E2: EF): Record<string, string> => ({ ped: E2("Pedidos de comida", "Food orders"), merc: E2("Pedidos del mercado", "Market orders"), cita: E2("Citas y solicitudes", "Appointments and requests"), bol: E2("Boletos", "Tickets"), apt: E2("Apartados y layaway", "Holds and layaway"), rsv: E2("Reservaciones de mesa", "Table reservations"), plan: E2("Planes del hogar", "Home plans"), renta: E2("Rentas", "Rentals"), fiesta: E2("Depósitos de fiestas", "Party deposits"), viaje: E2("Viajes, envíos y mudanzas", "Trips, shipping and moving") });
const fecha = (iso: string | null, en = false) => (iso ? new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "") : "—");

export function Planes({ d, ing, imp = null, conc = null, tab, est, editar, aprobar, exportar, dinero = false }: { d: DatosPlanes; ing?: Ingresos | null; imp?: ReglaImpuesto[] | null; conc?: Conc; tab: TabPlan; est: string | null; editar: boolean; aprobar: boolean; exportar?: boolean; dinero?: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, { E2 } = useE2();
  const en = E2("", "x") === "x", loc = en ? "en-US" : "es-US", KD = KIND_DIF(E2), PD = PROB_DIF(E2), ED = EST_DIA(E2), AL = ALERTA(E2), CO = CONSULTA(E2), ES = EST(E2), KI = KIND(E2);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const ir = (t: string, e?: string) => router.push(t === "res" && !e ? "/admin/planes" : `/admin/planes?tab=${t}${e ? `&est=${e}` : ""}`);
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("PLANES Y SUSCRIPCIONES", "PLANS AND SUBSCRIPTIONS"), t: E2("Planes y suscripciones", "Plans and subscriptions"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  /* 9k · La conciliación diaria y las alertas del dinero (compuesto con las piezas del panel: group, rows, note, acts; hueco del diseño, REVISION 9k). */
  const usd = (c: number) => `${c < 0 ? "−" : ""}$${(Math.abs(c) / 100).toFixed(2)}`;
  /* 9t6 (0205) · «Elegir cuál vale»: cada cosa que Stripe tiene, con su monto, cuándo salió (en la zona de la ciudad de la alerta; sin ciudad, la del
     sandbox, como el resto del Super Admin) y su id completo, el primero arriba (el servidor ya las manda en ese orden). Lo que no se puede elegir va
     como información en el texto de la hoja, con el porqué. */
  const PQ = POR_QUE_NO(E2);
  const cuandoSalio = (iso: string, tz: string | null) => new Intl.DateTimeFormat(loc, { timeZone: tz ?? "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");
  const etiqueta = (h: OpcionRevision, tz: string | null) => [h.centavos != null ? usd(h.centavos) : null, h.creado ? cuandoSalio(h.creado, tz) : null, h.id].filter((x): x is string => !!x).join(" · ");
  const nosePuede = (r: { hallados: OpcionRevision[]; tz: string | null; mas: number }) => {
    const no = r.hallados.filter((h) => !h.vale);
    return `${no.length ? ` ${E2("No se puede elegir", "Can’t be chosen")}: ${no.map((h) => `${etiqueta(h, r.tz)} (${h.por ? PQ[h.por] : E2("no vale", "doesn’t count")})`).join("; ")}.` : ""}${r.mas ? ` ${E2(`Y ${r.mas} más en Stripe que no se muestran aquí.`, `And ${r.mas} more in Stripe not shown here.`)}` : ""}`;
  };
  const diaL = (ymd: string) => new Intl.DateTimeFormat(loc, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, "");
  const irIng = (q: Record<string, string>) => router.push(`/admin/planes?tab=ing&${new URLSearchParams(q)}`);
  const nota = (titulo: string, cta: string, plantillas: string[], hacer: (m: string) => Promise<ResAdm>, peligro = false) => setConf({ titulo, cta, peligro, sub: E2("La nota queda en la auditoría con tu nombre.", "The note stays in the audit log with your name."), plantillas, nota: "interna", hacer: (m) => hacer(m) });
  const conciliacion = (c: NonNullable<Conc>): Bloque[] => {
    const sel = c.dias.find((x) => x.dia === c.dia) ?? null;
    return [
      { type: "group", k: E2("CONCILIACIÓN DIARIA · STRIPE CONTRA NUESTRO LIBRO", "DAILY RECONCILIATION · STRIPE VS. OUR LEDGER") },
      { type: "note", tone: "info", icon: "info", t: E2("Cada mañana se cuadra el día anterior, objeto por objeto: cobros, devoluciones, transferencias, pagos al banco, disputas y retenciones sueltas. Una diferencia sin dueño avisa al equipo y sale en Inicio.", "Every morning the previous day is balanced, object by object: charges, refunds, transfers, bank payouts, disputes and orphan holds. A difference with no owner alerts the team and shows on Home.") },
      { type: "rows", items: c.dias.map((x) => ({ key: x.dia, icon: x.estado === "cuadra" ? "check" : x.estado === "sin_correr" ? "clock" : "warning", t: diaL(x.dia),
        s: x.estado === "sin_correr" ? E2("todavía no corre", "hasn’t run yet") : x.estado === "fallo" ? E2("Stripe no respondió: vuelve a conciliarlo", "Stripe didn’t respond: reconcile it again") : x.estado === "cuadra" ? E2(`cuadra · ${x.stripeN} en Stripe, ${x.libroN} en el libro`, `balanced · ${x.stripeN} in Stripe, ${x.libroN} in the ledger`) : E2(`${x.diferencias} diferencia${x.diferencias === 1 ? "" : "s"}${x.sinDueno ? ` · ${x.sinDueno} sin dueño` : " · todas con dueño"} · ${usd(x.diferenciaCents)}`, `${x.diferencias} difference${x.diferencias === 1 ? "" : "s"}${x.sinDueno ? ` · ${x.sinDueno} with no owner` : " · all owned"} · ${usd(x.diferenciaCents)}`),
        tag: ED[x.estado]![0], tone: ED[x.estado]![1], chev: true, onClick: () => irIng({ dia: x.dia }), compact: true, bd: x.dia === c.dia ? "1.5px solid var(--tl-ink)" : undefined })) },
      ...(c.dia ? [
        { type: "group" as const, k: `${E2("DIFERENCIAS DEL", "DIFFERENCES FOR")} ${diaL(c.dia).toUpperCase()}${sel?.corrioAt ? ` · ${E2("CORRIÓ", "RAN")} ${new Intl.DateTimeFormat(loc, { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(sel.corrioAt))}` : ""}` },
        ...(c.difs.filas.length ? [{ type: "rows" as const, items: c.difs.filas.map((f) => ({ key: f.id, icon: f.kind === "dispute" ? "law" : "dollar", t: `${KD[f.kind] ?? f.kind}: ${PD[f.problem] ?? f.problem}`,
          s: `${f.nombre ?? "To’Latino"} · ${f.stripeId ?? f.ledgerRef ?? ""} · Stripe ${f.stripeCents == null ? "—" : usd(f.stripeCents)}${f.stripeStatus ? ` (${f.stripeStatus})` : ""} · ${E2("libro", "ledger")} ${f.ledgerCents == null ? "—" : usd(f.ledgerCents)}${f.ledgerStatus ? ` (${f.ledgerStatus})` : ""}${f.dueno ? ` · ${f.dueno.accion === "resuelta" ? E2("resuelta por", "resolved by") : f.dueno.accion === "me_hago_cargo" ? E2("de", "owned by") : E2("reabierta por", "reopened by")} ${f.dueno.quien}: ${f.dueno.nota}` : ""}`,
          tag: !f.dueno || f.dueno.accion === "reabierta" ? E2("SIN DUEÑO", "NO OWNER") : f.dueno.accion === "resuelta" ? E2("RESUELTA", "RESOLVED") : E2("CON DUEÑO", "OWNED"), tone: !f.dueno || f.dueno.accion === "reabierta" ? "danger" : f.dueno.accion === "resuelta" ? "signal" : "action", chev: false,
          acts: dinero ? [
            ...(!f.dueno || f.dueno.accion === "reabierta" ? [{ l: E2("Me hago cargo", "I’ll take it"), v: "secondary", onClick: () => nota(E2("Me hago cargo de la diferencia", "I’ll take this difference"), E2("Me hago cargo", "I’ll take it"), [E2("La reviso hoy con Stripe.", "I’ll check it with Stripe today."), E2("Es un cobro de prueba del sandbox.", "It’s a sandbox test charge."), E2("Lo veo con el negocio.", "I’ll sort it out with the business.")], (m) => conciliacionNota(f.key, "me_hago_cargo", m)) }] : []),
            ...(f.dueno?.accion !== "resuelta" ? [{ l: E2("Resuelta", "Resolved"), v: "secondary", onClick: () => nota(E2("Cómo se resolvió", "How it was resolved"), E2("Marcar resuelta", "Mark resolved"), [E2("Stripe lo corrigió; el libro ya cuadra.", "Stripe fixed it; the ledger balances now."), E2("Era un cruce de medianoche: cuadra al día siguiente.", "It was a midnight crossover: it balances the next day."), E2("Se ajustó el libro con su caso.", "The ledger was adjusted with its case.")], (m) => conciliacionNota(f.key, "resuelta", m)) }] : []),
            ...(f.dueno && f.dueno.accion !== "reabierta" ? [{ l: E2("Reabrir", "Reopen"), v: "secondary", onClick: () => nota(E2("Por qué se reabre", "Why reopen it"), E2("Reabrir", "Reopen"), [E2("Volvió a salir al conciliar otra vez.", "It came up again on re-reconciling."), E2("La nota no era correcta.", "The note wasn’t correct.")], (m) => conciliacionNota(f.key, "reabierta", m)) }] : []),
          ] : undefined })) }]
          : [{ type: "empty" as const, icon: "check", t: sel?.estado === "sin_correr" ? E2("Este día todavía no se concilió", "This day hasn’t been reconciled yet") : E2("Sin diferencias", "No differences"), s: sel?.estado === "fallo" ? E2("La corrida falló: vuelve a conciliarlo.", "The run failed: reconcile it again.") : E2("Stripe y nuestro libro dicen lo mismo.", "Stripe and our ledger agree.") }]),
        ...(c.difs.sigue ? [{ type: "acts" as const, items: [{ l: E2("Ver más", "See more"), v: "secondary", onClick: () => irIng({ dia: c.dia!, antes: c.difs.sigue! }) }] }] : []),
        ...(dinero ? [{ type: "acts" as const, items: [{ l: E2("Conciliar otra vez", "Reconcile again"), v: "secondary", onClick: () => nota(`${E2("Conciliar otra vez", "Reconcile again")} · ${diaL(c.dia!)}`, E2("Conciliar", "Reconcile"), [E2("Stripe ya corrigió el objeto.", "Stripe already fixed the object."), E2("La corrida de la mañana falló.", "The morning run failed.")], (m) => conciliarOtraVez(c.dia!, m)) }] }] : []),
      ] : []),
      { type: "group", k: c.todas ? E2("ALERTAS DEL DINERO · TODAS", "MONEY ALERTS · ALL") : E2("ALERTAS DEL DINERO · ABIERTAS", "MONEY ALERTS · OPEN"), link: c.todas ? E2("Solo abiertas", "Open only") : E2("Ver todas", "See all"), onLink: () => irIng({ ...(c.dia ? { dia: c.dia } : {}), ...(c.todas ? {} : { alertas: "todas" }) }) },
      ...(c.alertas.filas.length ? [{ type: "rows" as const, items: c.alertas.filas.map((a) => ({ key: a.id, icon: a.kind === "dispute_due" ? "law" : "warning", t: `${(a.fallo ? AL.refund_failed : AL[a.kind]) ?? a.kind}${a.monto ? ` · ${usd(a.monto)}` : ""}`,
        // 0209 · (d) La devolución de un patrocinio que Stripe dio por fallida después de su alerta «sin respuesta»: el título y lo último que dijo Stripe.
        s: `${(en ? a.detalle.en : a.detalle.es) || a.detalle.es}${a.fallo ? ` · ${CO.fallido}${a.fallo.codigo ? ` (${a.fallo.codigo})` : ""} · ${new Intl.DateTimeFormat(loc, { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(a.fallo.at)).replace(/\./g, "")}` : ""}${a.nombre ? ` · ${a.nombre}` : ""}${a.consulta ? ` · ${E2("Última consulta a Stripe", "Last Stripe query")} (${new Intl.DateTimeFormat(loc, { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(a.consulta.at)).replace(/\./g, "")}${a.consulta.origen === "equipo" ? E2(", pedida por el equipo", ", asked by the team") : ""}): ${CO[a.consulta.resultado] ?? a.consulta.resultado}${a.consulta.stripe ? ` · ${a.consulta.stripe}` : ""}` : ""}${a.nota ? ` · ${a.nota.quien}: ${a.nota.nota}` : ""}`, tag: a.estado === "abierta" ? E2("ABIERTA", "OPEN") : a.estado === "con_dueno" ? E2("CON DUEÑO", "OWNED") : E2("RESUELTA", "RESOLVED"), tone: a.estado === "abierta" ? "danger" : a.estado === "con_dueno" ? "action" : "signal", chev: false,
        acts: dinero && a.estado !== "resuelta" ? [
          ...(a.estado === "abierta" ? [{ l: E2("Me hago cargo", "I’ll take it"), v: "secondary", onClick: () => nota(E2("Me hago cargo de la alerta", "I’ll take this alert"), E2("Me hago cargo", "I’ll take it"), [E2("La reviso hoy.", "I’ll check it today."), E2("Hablo con el negocio.", "I’ll talk to the business.")], (m) => alertaNota(a.id, "me_hago_cargo", m)) }] : []),
          // 9t5 · Solo si la intención sigue en camino (lo decide el servidor): la misma consulta del barrido, ahora. Nadie dice aquí «sí se cobró».
          ...(a.preguntar ? [{ l: E2("Preguntar a Stripe ahora", "Ask Stripe now"), v: "secondary", onClick: () => nota(E2("Preguntar a Stripe qué pasó", "Ask Stripe what happened"), E2("Preguntar a Stripe", "Ask Stripe"), [E2("El negocio pregunta por este cobro.", "The business is asking about this charge."), E2("Reviso la alerta de hoy.", "I’m reviewing today’s alert.")], (m) => alertaPreguntar(a.id, m)) }] : []),
          // 9t6 · gateway_review: elegir cuál vale (o ninguno). Lo que se ofrece lo dice el servidor; al guardar, vuelve a preguntar a Stripe y decide con eso.
          ...(a.revisar ? [{ l: E2("Elegir cuál vale", "Choose which counts"), v: "secondary", onClick: () => setConf({ titulo: E2("Qué vale de lo que tiene Stripe", "What counts of what Stripe has"), cta: E2("Decidir", "Decide"), peligro: true,
            sub: `${a.revisar!.devuelve ? E2("Se vuelve a preguntar a Stripe antes de guardar. La que elijas queda como la hecha; lo que salió de más no se deshace desde aquí (queda en la auditoría para verlo con la persona). La nota queda en la auditoría con tu nombre.", "Stripe is asked again before saving. The one you choose stays as the done one; what went out in excess isn’t undone from here (it stays in the audit log to sort out with the person). The note stays in the audit log with your name.")
              : E2("Se vuelve a preguntar a Stripe antes de guardar. Lo que sobra se devuelve (una transferencia, se revierte; una retención, se suelta). La nota queda en la auditoría con tu nombre.", "Stripe is asked again before saving. What’s left over is refunded (a transfer is reversed; a hold is released). The note stays in the audit log with your name.")}${nosePuede(a.revisar!)}`,
            elegir: { label: E2("VALE", "COUNTS"), items: [...a.revisar!.hallados.filter((h) => h.vale).map((h) => ({ k: h.id, l: etiqueta(h, a.revisar!.tz) })), ...(a.revisar!.ninguno ? [{ k: "ninguno", l: E2("Ninguno: devolver todo lo que salió", "None: refund everything that went through") }] : [])] },
            plantillas: a.revisar!.devuelve ? [E2("Devolución duplicada: vale la primera.", "Duplicate refund: the first one counts."), E2("Lo vi en Stripe: vale la de este monto.", "I checked Stripe: the one with this amount counts.")]
              : [E2("Cobro duplicado: se queda el primero.", "Duplicate charge: the first one stays."), E2("Se cobró dos veces el mismo período: devolver.", "The same period was charged twice: refund."), E2("El monto no es el de la intención: devolver y cobrar otra vez.", "The amount isn’t the intent’s: refund and charge again.")],
            nota: "interna", hacer: (m, e) => alertaDecidir(a.id, e ?? "", m) }) }] : []),
          // 9t7 · Antes de marcarla, el servidor le pregunta a Stripe: si salió, la cierra como hecha (no a mano); si no contesta, no cambia nada. También la
          // devolución de lo que sobró (extra_refund_stuck).
          ...(a.aMano ? [{ l: E2("Resolver a mano", "Resolve manually"), v: "secondary", onClick: () => setConf({ titulo: a.kind === "transfer_reversal_stuck" ? E2("Se le cobró al organizador fuera de Stripe", "The organizer was charged outside Stripe") : E2("La devolución se hizo fuera de Stripe", "The refund was made outside Stripe"),
            cta: E2("Resolver a mano", "Resolve manually"), peligro: true,
            sub: E2("Antes de guardar, se le pregunta a Stripe: si dice que salió, se cierra como hecha y no se marca a mano; si no contesta, no cambia nada. La nota queda en la auditoría con tu nombre.", "Before saving, Stripe is asked: if it says it went out, it closes as done and isn’t marked manually; if it doesn’t answer, nothing changes. The note stays in the audit log with your name."),
            plantillas: a.kind === "transfer_reversal_stuck" ? [E2("El organizador pagó por transferencia; comprobante en el caso.", "The organizer paid by transfer; receipt in the case."), E2("Se descontó de su próxima liquidación fuera de Stripe.", "Deducted from their next settlement outside Stripe.")] : [E2("Se le mandó un cheque al cliente.", "A check was sent to the customer."), E2("Se le devolvió por transferencia bancaria; comprobante en el caso.", "Refunded by bank transfer; receipt in the case.")],
            nota: "interna", hacer: (m) => alertaNota(a.id, "resuelta_a_mano", m) }) }] : []),
          // 0209 · «Devolver otra vez» unos boletos (refund_failed): lo ofrece el servidor con el monto de la fallida; al guardar, la base vuelve a decidir
          // (una sola por fallida, nunca más de lo cobrado menos lo devuelto). El mismo permiso que Transacciones › Devolver.
          ...(a.otraVez ? [{ l: E2("Devolver otra vez", "Refund again"), v: "secondary", onClick: () => setConf({ titulo: `${E2("Devolver otra vez", "Refund again")} · ${usd(a.otraVez!)}`, cta: E2("Devolver otra vez", "Refund again"), peligro: true,
            sub: E2("Se devuelve lo mismo que falló, a la misma tarjeta, una sola vez. Los boletos siguen devueltos. La nota queda en la auditoría con tu nombre.", "The same amount that failed is refunded to the same card, only once. The tickets stay refunded. The note stays in the audit log with your name."),
            plantillas: [E2("Hablé con la persona: quiere su dinero de vuelta.", "I spoke with the person: they want their money back."), E2("El banco de la persona confirmó que ya puede recibirla.", "The person’s bank confirmed it can receive it now.")],
            nota: "interna", hacer: (m) => devolverOtraVezTx(a.id, m) }) }] : []),
          // 9t6 · Una gateway_review que se puede decidir se cierra decidiendo (si solo se marcara resuelta, la intención seguiría en camino).
          ...(a.revisar ? [] : [{ l: E2("Resuelta", "Resolved"), v: "secondary", onClick: () => nota(E2("Cómo se resolvió", "How it was resolved"), E2("Marcar resuelta", "Mark resolved"), [E2("Stripe ya lo hizo.", "Stripe already did it."), E2("Se respondió la disputa con evidencia.", "The dispute was answered with evidence."), E2("El banco del negocio ya recibió el pago.", "The business’s bank received the payout.")], (m) => alertaNota(a.id, "resuelta", m)) }]),
        ] : undefined })) }]
        : [{ type: "empty" as const, icon: "check", t: E2("Ninguna alerta abierta", "No open alerts"), s: E2("Devoluciones, transferencias, disputas y pagos al banco al día.", "Refunds, transfers, disputes and bank payouts up to date.") }]),
      ...(c.alertas.sigue ? [{ type: "acts" as const, items: [{ l: E2("Ver más alertas", "See more alerts"), v: "secondary", onClick: () => irIng({ ...(c.dia ? { dia: c.dia } : {}), ...(c.todas ? { alertas: "todas" } : {}), aantes: c.alertas.sigue! }) }] }] : []),
    ];
  };
  const k = d.kpi;
  const B: Bloque[] = [
    { type: "head", eye: E2("DINERO Y CRECIMIENTO", "MONEY AND GROWTH"), t: E2("Planes y suscripciones", "Plans and subscriptions"), s: E2("Free y Pro: qué incluye cada uno, la prueba, el precio, los cobros fallidos y las comisiones.", "Free and Pro: what each includes, the trial, the price, failed charges and fees."), h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "MRR", v: money(k.mrr), s: E2(`${k.activos + k.anuales} Pro activos${k.anuales ? ` · ${k.anuales} anuales` : ""}`, `${k.activos + k.anuales} active Pro${k.anuales ? ` · ${k.anuales} annual` : ""}`), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E2("EN PRUEBA", "ON TRIAL"), v: String(k.prueba), s: k.prueba7 ? E2(`${k.prueba7} terminan en 7 días`, `${k.prueba7} end in 7 days`) : E2("ninguna termina esta semana", "none end this week"), onClick: () => ir("subs", "trial") },
      { k: E2("COBRO FALLIDO", "FAILED CHARGE"), v: String(k.fallidos), s: E2("3 intentos en 7 días", "3 attempts in 7 days"), onClick: () => ir("subs", "past_due") },
      { k: E2("FREE AL TECHO", "FREE AT CAP"), v: String(k.techo), s: E2(`${d.cfg.tope} en línea este mes · solo Llamar`, `${d.cfg.tope} online this month · Call only`) },
    ] },
    { type: "tabs", items: ([["res", E2("Planes", "Plans")], ["subs", E2("Suscripciones", "Subscriptions")], ["fees", E2("Comisiones", "Fees")], ["ing", E2("Ingresos", "Revenue")], ["tax", E2("Impuestos", "Taxes")]] as const).map(([t, l]) => ({ l, on: tab === t, onClick: () => ir(t) })) },
  ];
  if (tab === "res") {
    B.push({ type: "group", k: "FREE" }, { type: "kv", items: [{ k: E2("TECHO MENSUAL EN LÍNEA", "MONTHLY ONLINE CAP"), v: E2(`${d.cfg.tope} pedidos o citas · después, Llamar`, `${d.cfg.tope} orders or appointments · then, Call`) }, { k: E2("PÁGINA", "PAGE"), v: E2("Una sola página, pocas fotos y 5 ítems; reseñas sin respuesta", "A single page, few photos and 5 items; no review replies") }] });
    B.push({ type: "group", k: "PRO" }, { type: "kv", items: [{ k: E2("PRECIO", "PRICE"), v: E2(`${money(d.cfg.precio)} al mes · anual = 10 meses`, `${money(d.cfg.precio)} a month · annual = 10 months`) }, { k: E2("PRUEBA", "TRIAL"), v: E2(`${d.cfg.prueba} días sin tarjeta · HZL30 = 60`, `${d.cfg.prueba} days, no card · HZL30 = 60`) }, { k: E2("COBRO FALLIDO", "FAILED CHARGE"), v: E2("3 intentos en 7 días con aviso; al tercero, Free (nada se borra)", "3 attempts in 7 days with notice; after the third, Free (nothing is deleted)") }, { k: E2("CORTESÍA", "COURTESY"), v: E2(`${k.cortesia} negocios`, `${k.cortesia} businesses`) }] });
    B.push({ type: "note", tone: "ink", icon: "info", t: E2("El precio, la prueba y el techo de Free son decisión del fundador: se cambian con una actualización de To’Latino, con su OK. Extender una prueba o dar cortesía se hace por negocio en Suscripciones.", "The price, the trial and the Free cap are the founder’s decision: they change with a To’Latino update, with their OK. Extending a trial or giving courtesy is done per business in Subscriptions.") });
  }
  if (tab === "subs") {
    B.push({ type: "chips", items: [["", E2("Todas", "All")], ["trial", E2("En prueba", "On trial")], ["past_due", E2("Cobro fallido", "Failed charge")], ["active", "Pro"], ["canceling", E2("Pasa a Free", "Moving to Free")], ["courtesy", E2("Cortesía", "Courtesy")], ["ended", "Free"]].map(([v, l]) => ({ l: l!, v: (est ?? "") === v ? "selected" : "filter", onClick: () => ir("subs", v || undefined) })) });
  }
  const filas = tab === "subs" ? d.subs : [];
  const acciones = (x: DatosPlanes["subs"][number]) => [
    { label: E2("Ver negocio", "View business"), variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.negocio}`) },
    ...(editar && x.estado === "trial" ? [{ label: E2("Extender prueba", "Extend trial"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Extender la prueba · ${x.nombre}`, `Extend the trial · ${x.nombre}`), cta: E2("Extender", "Extend"), sub: E2("El dueño lo ve en Tu plan. Entre 1 y 60 días.", "The owner sees it in Your plan. Between 1 and 60 days."), valor: { k: E2("DÍAS", "DAYS"), ini: "7", max: 2 }, plantillas: [E2("Se le pasó la prueba sin usarla.", "The trial ran out without being used."), E2("Problema técnico de To’Latino.", "To’Latino technical issue."), E2("Evento de la ciudad.", "City event.")], nota: "interna", hacer: (m, _e, v) => planExtender(x.negocio, v, m) }) }] : []),
    ...(aprobar && x.estado !== "courtesy" ? [{ label: E2("Cortesía", "Courtesy"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Pro de cortesía · ${x.nombre}`, `Courtesy Pro · ${x.nombre}`), cta: E2("Dar cortesía", "Give courtesy"), sub: E2("Pro sin cobro por N días; después vuelve a Free y su contenido Pro se guarda.", "Pro at no charge for N days; then it goes back to Free and its Pro content is kept."), valor: { k: E2("DÍAS", "DAYS"), ini: "30", max: 3 }, plantillas: [E2("Socio fundador.", "Founding partner."), E2("Compensación por un problema.", "Compensation for an issue."), E2("Negocio de la comunidad.", "Community business.")], nota: "interna", hacer: (m, _e, v) => planCortesia(x.negocio, v, m) }) }] : []),
    ...(aprobar && x.estado === "courtesy" ? [{ label: E2("Quitar cortesía", "Remove courtesy"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Quitar cortesía · ${x.nombre}`, `Remove courtesy · ${x.nombre}`), cta: E2("Quitar", "Remove"), peligro: true, sub: E2("Pasa a Free hoy; nada se borra.", "Moves to Free today; nothing is deleted."), nota: "interna", hacer: (m) => planQuitarCortesia(x.negocio, m) }) }] : []),
    ...(editar && x.estado === "past_due" ? [{ label: E2("Reintentar cobro", "Retry charge"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Reintentar el cobro · ${x.nombre}`, `Retry the charge · ${x.nombre}`), cta: E2("Reintentar", "Retry"), sub: E2("Se cobra ya con la tarjeta guardada del dueño.", "Charges now with the owner’s saved card."), plantillas: [E2("El dueño cambió su tarjeta.", "The owner changed their card."), E2("El banco ya lo autorizó.", "The bank already authorized it.")], nota: "interna", hacer: (m) => planReintentar(x.negocio, m) }) }] : []),
  ];
  if (tab === "fees") {
    B.push({ type: "note", tone: "info", icon: "info", t: E2("Comisión solo sobre lo cobrado con tarjeta en la app; el cargo de la tarjeta lo absorbe la comisión. Un cambio aplica en 30 días y los negocios reciben el aviso; lo ya vendido no cambia.", "Fee only on what’s charged by card in the app; the fee covers the card processing cost. A change applies in 30 days and businesses get notified; past sales don’t change.") });
    B.push({ type: "rows", items: d.fees.map((f) => ({ key: f.id, icon: "dollar", t: KI[f.kind] ?? f.kind, s: f.vigente ? (f.reason ?? E2("Vigente", "Current")) : `${E2("Programada desde el", "Scheduled from")} ${fecha(f.desde, en)} · ${f.reason ?? ""}`,
      r: `${f.rate_bp / 100} %${f.fixed_cents ? ` + ${money(f.fixed_cents)}` : ""}`, tag: f.vigente ? null : E2("PROGRAMADO", "SCHEDULED"), tone: "action", chev: false,
      acts: aprobar && f.vigente && f.kind !== "rsv" ? [{ l: E2("Programar cambio", "Schedule change"), v: "secondary", onClick: () => setConf({ titulo: `${E2("Nueva comisión", "New fee")} · ${KI[f.kind]}`, cta: E2("Programar", "Schedule"), sub: E2(`Ahora: ${f.rate_bp / 100} %. Aplica en 30 días; lo ya vendido no cambia.`, `Now: ${f.rate_bp / 100}%. Applies in 30 days; past sales don’t change.`), valor: { k: E2("PORCENTAJE (0 A 30)", "PERCENT (0 TO 30)"), ini: String(f.rate_bp / 100), max: 5 }, nota: "interna", hacer: (m, _e, v) => comisionProgramar(f.kind, v, m) }) }] : undefined })) });
  }
  if (tab === "tax") {
    // 9n-19 · Impuestos (L471), compuesto como Comisiones: la vigente de cada ciudad y categoría y las programadas; un cambio es una regla nueva.
    const CAT: Record<string, [string, string]> = { "NEG-AUTO": [E2("Taller (Auto)", "Auto shop"), E2("Partes", "Parts")], "NEG-HOGAR": [E2("Hogar", "Home services"), E2("Materiales", "Materials")],
      "NEG-DEALER": [E2("Venta de autos", "Car sales"), E2("Precio", "Price")], "NEG-FOOD": [E2("Comida (evento privado)", "Food (private event)"), E2("Consumo", "Food and drink")] };
    const pc = (bp: number) => `${bp / 100} %`;
    B.push({ type: "note", tone: "info", icon: "info", t: E2("El impuesto de cada ciudad y categoría: sobre las partes o el precio, y sobre la mano de obra. Un cambio es una regla nueva desde una fecha y queda en la auditoría; lo ya cotizado o vendido no cambia. Revísalo con el contador antes de cambiarlo.", "Each city and category’s tax: on parts or price, and on labor. A change is a new rule from a date and stays in the audit log; what was already quoted or sold doesn’t change. Check with the accountant before changing it.") });
    B.push((imp ?? []).length ? { type: "rows", items: (imp ?? []).map((x) => {
      const [cn, pn] = CAT[x.cat] ?? [x.cat, E2("Partes", "Parts")];
      return { key: x.id, icon: "dollar", t: `${x.ciudad} · ${cn}`, s: x.vigente ? (x.motivo ?? E2("Vigente", "Current")) : `${E2("Programada desde el", "Scheduled from")} ${fecha(x.desde, en)}${x.motivo ? ` · ${x.motivo}` : ""}`,
        r: `${pn} ${pc(x.partes)} · ${E2("Mano de obra", "Labor")} ${pc(x.mano)}`, tag: x.vigente ? null : E2("PROGRAMADA", "SCHEDULED"), tone: "action", chev: false,
        acts: aprobar && x.vigente ? [{ l: E2("Programar cambio", "Schedule change"), v: "secondary", onClick: () => setConf({ titulo: `${E2("Nuevo impuesto", "New tax")} · ${x.ciudad} · ${cn}`, cta: E2("Programar", "Schedule"),
          sub: E2(`Ahora: ${pn} ${pc(x.partes)}, mano de obra ${pc(x.mano)}. Lo ya cotizado o vendido no cambia.`, `Now: ${pn} ${pc(x.partes)}, labor ${pc(x.mano)}. What was already quoted or sold doesn’t change.`),
          elegir: { label: E2("QUÉ CAMBIA Y DESDE CUÁNDO", "WHAT CHANGES AND FROM WHEN"), items: [["partes", pn], ["mano", E2("Mano de obra", "Labor")]].flatMap(([k, l]) =>
            [["ahora", E2("desde ahora", "from now")], ["mes", E2("desde el 1.º del mes que viene", "from the 1st of next month")], ["enero", E2("desde el 1.º de enero", "from January 1")]].map(([c, lc]) => ({ k: `${k}:${c}`, l: `${l} · ${lc}` }))) },
          valor: { k: E2("PORCENTAJE (0 A 20)", "PERCENT (0 TO 20)"), ini: String(x.partes / 100), max: 5 },
          plantillas: [E2("Cambió la ley del estado.", "State law changed."), E2("Indicación del contador.", "Accountant’s instruction."), E2("Impuesto local de la ciudad.", "City local tax.")],
          nota: "interna", hacer: (m, e, v) => impuestoProgramar(x.ciudadId, x.cat, e ?? "", v, m) }) }] : undefined };
    }) } : { type: "empty", icon: "dollar", t: E2("Sin reglas de impuesto", "No tax rules"), s: E2("Las de tus ciudades salen aquí.", "Your cities’ rules show here.") });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      {tab === "ing" && ing ? (() => {
        // Ingresos (diseño «ing»): comisiones de 8 semanas (la actual resaltada), Pro de 8 semanas, comisión por categoría.
        const dia = (ymd: string) => new Intl.DateTimeFormat(loc, { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, "");
        const tot = ing.semanas.reduce((a, w) => a + w.fee, 0), totPro = ing.semanas.reduce((a, w) => a + w.pro, 0), mx = Math.max(1, ...ing.categorias.map((k) => k.fee));
        const descargar = async () => { const r = await ingresosCsv(); if (!r.ok || !r.archivo) { setToast(r.ok ? E2("No se pudo.", "It didn’t work.") : r.mensaje); return; }
          const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`\ufeff${r.archivo}`], { type: "text/csv;charset=utf-8" })); a.download = r.nombre ?? "tolatino-ingresos.csv"; document.body.appendChild(a); a.click(); a.remove(); setToast(r.mensaje ?? E2("Descargado.", "Downloaded.")); };
        return (<>
          <A.BarChart label={E2("COMISIONES · 8 SEMANAS", "FEES · 8 WEEKS")} value={money(tot)} note={E2(`Más Pro: ${money(totPro)} cobrados en 8 semanas · MRR ${money(d.kpi.mrr)} al mes.`, `Plus Pro: ${money(totPro)} collected in 8 weeks · MRR ${money(d.kpi.mrr)} a month.`)}
            bars={ing.semanas.map((w, i) => ({ value: w.fee, label: dia(w.ini), color: i === ing.semanas.length - 1 ? "var(--tl-action)" : "rgba(75,55,245,.35)" }))} />
          <A.BarChart label={E2("COBROS DE PRO · 8 SEMANAS", "PRO CHARGES · 8 WEEKS")} value={money(totPro)} bars={ing.semanas.map((w, i) => ({ value: w.pro, label: dia(w.ini), color: i === ing.semanas.length - 1 ? "var(--tl-ink)" : "rgba(11,14,18,.3)" }))} />
          {ing.categorias.length ? <A.HBars label={E2("COMISIÓN POR CATEGORÍA · 90 DÍAS", "FEE BY CATEGORY · 90 DAYS")} items={ing.categorias.map((k) => ({ label: k.cat, width: `${Math.round((k.fee / mx) * 100)}%`, value: money(k.fee), color: "var(--tl-ink)" }))} />
            : <PanelBloques bloques={[{ type: "empty", icon: "dollar", t: E2("Sin comisiones en 90 días", "No fees in 90 days"), s: E2("Aparecen cuando los negocios cobran con tarjeta.", "They show up when businesses charge by card.") }]} />}
          <PanelBloques bloques={[{ type: "note", tone: "info", icon: "info", t: E2("Comisión = lo que To’Latino se queda de cada cobro con tarjeta, neto de devoluciones. Pro = cobros de suscripción. Los pagos a los negocios salen cada martes por Stripe.", "Fee = what To’Latino keeps from each card charge, net of refunds. Pro = subscription charges. Payouts to businesses go out every Tuesday through Stripe.") },
            ...(exportar ? [{ type: "acts" as const, items: [{ l: E2("Exportar CSV", "Export CSV"), v: "secondary", icon: "folder", onClick: () => { void descargar(); } }] }] : [])]} />
          {conc ? <PanelBloques bloques={conciliacion(conc)} h1={desk ? 26 : 22} /> : null}
        </>);
      })() : null}
      {tab === "subs" && (filas.length ? <A.AdminList rows={filas.map((x) => ({ icon: "wallet", title: x.nombre, sub: `${ES[x.estado]?.[2] ?? x.estado}${x.fin ? ` · ${x.estado === "trial" ? E2("termina", "ends") : x.estado === "past_due" ? E2("próximo intento", "next attempt") : x.estado === "ended" ? E2("desde", "since") : x.estado === "courtesy" ? E2("hasta", "until") : E2("próximo cobro", "next charge")} ${fecha(x.fin, en)}` : ""}${x.intentos ? E2(` · intento ${x.intentos} de 3`, ` · attempt ${x.intentos} of 3`) : ""}${x.ciclo === "year" ? E2(" · anual", " · annual") : ""}${x.dueño ? ` · ${x.dueño}` : ""}`,
        tag: ES[x.estado]?.[0] ?? x.estado, tone: ES[x.estado]?.[1] ?? "neutral", actions: acciones(x) }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "wallet", t: E2("Nada con ese filtro", "Nothing with that filter"), s: E2("Prueba otro estado.", "Try another status.") }]} />)}
      <Toast t={toast} desk={desk} />
    </div>
  );
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
