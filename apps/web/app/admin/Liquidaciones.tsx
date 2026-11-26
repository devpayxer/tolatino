"use client";
/* 6e · Liquidaciones de eventos (Super Admin › Eventos y boletos; «Dinero / Transacciones: liquidaciones de eventos, retener o soltar con
   motivo», admin-dashboard L183–185). Hueco compuesto con las piezas del admin (head, kpis, chips, buscador, DenseTable / AdminList,
   ConfirmarMotivo) como Planes › Ingresos (2s, con su CSV). Los montos son los del libro (lib/evt-liquidacion.ts); aquí no se calcula nada. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ComponentType } from "react";
import type { FilaLiqAdm, LiqAdmin } from "@/lib/evt-liquidacion";
import { diaSemanaTxt } from "@/lib/plazo-txt";
import { liqCsv, liqRetener, liqSoltar } from "./acciones-eventos";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { useE2 } from "./idioma-admin";

type EF = (es: string, en: string) => string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "AdminNote", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dia = (ymd: string, en = false) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, "");
const ST = (E2: EF): Record<string, [string, string]> => ({
  pending: [E2("PENDIENTE", "PENDING"), "action"], held: [E2("RETENIDA", "HELD"), "danger"], paying: [E2("EN CAMINO", "ON THE WAY"), "action"],
  paid: [E2("PAGADA", "PAID"), "signal"], reversed: [E2("AJUSTADA", "ADJUSTED"), "neutral"]
});
const HOLD: Record<string, string> = { disputa: "Disputa abierta (sale sola al cerrarse)", nuevo: "Primer evento grande de un organizador nuevo", cuenta: "La cuenta de cobro no recibe pagos", admin: "Retenida por To'Latino" };
const HOLD_EN: Record<string, string> = { disputa: "Open dispute (releases on its own when closed)", nuevo: "First big event from a new organizer", cuenta: "The payout account can’t receive payments", admin: "Held by To'Latino" };

export function Liquidaciones({ d, st, q, puede }: { d: LiqAdmin; st: string | null; q: string; puede: { decidir: boolean; exportar: boolean } }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024, { E2 } = useE2(), en = E2("", "x") === "x", stTxt = ST(E2);
  const [qq, setQ] = useState(q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [pend, start] = useTransition();
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const head: Bloque = { type: "head", eye: E2("DINERO DE EVENTOS", "EVENT MONEY"), t: E2("Liquidaciones de eventos", "Event settlements"), s: E2(`Lo que se le transfiere a cada organizador por fecha, ${diaSemanaTxt(d.pagoDia, true)} después: lo cobrado menos la comisión, lo devuelto y lo perdido en disputas. Con una disputa abierta o un organizador nuevo, se retiene.`, `What each organizer is paid per date, the following ${diaSemanaTxt(d.pagoDia, false)}: what was charged minus the commission, refunds and dispute losses. With an open dispute or a new organizer, it is held.`), onBack: () => router.push("/admin/eventos"), h1: desk ? 26 : 22,
    act: puede.exportar ? { l: pend ? E2("Exportando…", "Exporting…") : E2("Exportar CSV", "Export CSV"), icon: "folder", onClick: () => start(async () => {
      const r = await liqCsv(st, q); if (!r.ok || !r.archivo) { setToast(r.ok ? E2("No se pudo.", "Couldn’t do it.") : r.mensaje); return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`﻿${r.archivo}`], { type: "text/csv;charset=utf-8" })); a.download = r.nombre ?? "tolatino-liquidaciones.csv"; document.body.appendChild(a); a.click(); a.remove(); setToast(r.mensaje ?? E2("Descargado.", "Downloaded.")); }) } : undefined };
  if (conf) return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={[{ ...head, onBack: () => setConf(null), act: undefined }]} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></div>;
  const k = d.kpi;
  const B: Bloque[] = [head,
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("POR PAGAR", "TO PAY"), v: money(k.martes), s: E2(`${k.nM} fechas pendientes`, `${k.nM} pending dates`), bg: "var(--tl-ink)", fg: "var(--tl-white)", onClick: () => ir({ st: "pending" }) },
      { k: E2("RETENIDAS", "HELD"), v: money(k.held), s: E2(`${k.nH} fechas`, `${k.nH} dates`), onClick: () => ir({ st: "held" }) },
      { k: E2("PAGADO · 30 DÍAS", "PAID · 30 DAYS"), v: money(k.pagado), s: E2(`${k.nP} transferencias`, `${k.nP} transfers`), onClick: () => ir({ st: "paid" }) },
      { k: E2("POR DESCONTAR", "TO DEDUCT"), v: money(k.deuda), s: E2("devuelto después de pagar", "refunded after payout") },
    ] },
    { type: "chips", items: ([["", E2("Todas", "All")], ["pending", E2("Pendientes", "Pending")], ["held", E2("Retenidas", "Held")], ["paying", E2("En camino", "On the way")], ["paid", E2("Pagadas", "Paid")], ["reversed", E2("Ajustadas", "Adjusted")]] as const).map(([v, l]) => ({ l, v: (st ?? "") === v ? "selected" : "filter", onClick: () => ir({ st: v || null }) })) },
  ];
  const acciones = (x: FilaLiqAdm) => [
    { label: E2("Ver evento", "See event"), variant: "secondary", onClick: () => router.push(`/admin/eventos/${x.eid}`) },
    ...(puede.decidir && (x.st === "pending" || (x.st === "held" && x.hk !== "admin" && x.hk !== "nuevo")) ? [{ label: E2("Retener", "Hold"), variant: "danger", onClick: () => setConf({ titulo: `${E2("Retener", "Hold")} · ${x.negocio} · ${x.evento}`, sub: E2("No se transfiere hasta que la sueltes. El organizador ve el motivo en Cobros.", "It isn’t transferred until you release it. The organizer sees the reason in Payments."), peligro: true, plantillas: [E2("Reportes de que el evento no pasó", "Reports that the event didn’t happen"), E2("Revisión de Confianza", "Trust review"), E2("Datos de la cuenta por confirmar", "Account details to confirm")], cta: E2("Retener", "Hold"), nota: "persona", hacer: (m) => liqRetener(x.id, m) }) }] : []),
    ...(puede.decidir && x.st === "held" && (x.hk === "admin" || x.hk === "nuevo") ? [{ label: E2("Soltar", "Release"), variant: "primary", onClick: () => setConf({ titulo: `${E2("Soltar", "Release")} · ${x.negocio} · ${x.evento}`, sub: x.hk === "nuevo" ? E2("Confianza ya lo miró: se paga en el siguiente barrido y sus próximos eventos no se retienen por ser nuevo.", "Trust already reviewed it: it’s paid in the next run, and their next events aren’t held for being new.") : E2("Se paga en el siguiente barrido si la fecha ya llegó a su día de pago.", "It’s paid in the next run if the date has reached its payout day."), plantillas: [E2("El evento pasó sin problemas", "The event went fine"), E2("Organizador conocido de la ciudad", "Known organizer in the city"), E2("Revisión terminada", "Review finished")], cta: E2("Soltar", "Release"), nota: "interna", hacer: (m) => liqSoltar(x.id, m) }) }] : []),
  ];
  const sub = (x: FilaLiqAdm) => en
    ? `${x.ciudad} · paid on ${dia(x.payOn, true)} · gross ${money(x.bruto)} · commission ${money(x.comision)}${x.devuelto ? ` · refunded ${money(x.devuelto)}` : ""}${x.disputa ? ` · disputes ${money(x.disputa)}` : ""}${x.descontado ? ` · adjustment ${money(x.descontado)}` : ""}${x.hk ? ` · ${HOLD_EN[x.hk] ?? x.hk}${x.hn ? `: ${x.hn}` : ""}` : ""}${x.error ? ` · last error: ${x.error} (${x.intentos} attempts)` : ""}`
    : `${x.ciudad} · se paga el ${dia(x.payOn)} · bruto ${money(x.bruto)} · comisión ${money(x.comision)}${x.devuelto ? ` · devuelto ${money(x.devuelto)}` : ""}${x.disputa ? ` · disputas ${money(x.disputa)}` : ""}${x.descontado ? ` · ajuste ${money(x.descontado)}` : ""}${x.hk ? ` · ${HOLD[x.hk] ?? x.hk}${x.hn ? `: ${x.hn}` : ""}` : ""}${x.error ? ` · último error: ${x.error} (${x.intentos} intentos)` : ""}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: qq.trim() || null }); }}>
        <input value={qq} onChange={(e) => setQ(e.target.value)} placeholder={E2("Negocio o evento", "Business or event")} aria-label={E2("Buscar", "Search")}
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 16px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
      </form>
      <A.AdminNote tone="info" icon="info">{E2("El monto lo calcula la base al pagar y queda fijo; la transferencia lleva una llave por fecha: nunca se paga dos veces. Una disputa abierta o una cuenta que no recibe pagos retiene sola y suelta sola.", "The amount is calculated by the database at payout and stays fixed; each transfer carries one key per date, so nothing is ever paid twice. An open dispute or an account that can’t receive payments holds and releases on its own.")}</A.AdminNote>
      {!d.filas.length ? <PanelBloques bloques={[{ type: "empty", icon: "wallet", t: E2("Nada con ese filtro", "Nothing with that filter"), s: E2("Aparecen cuando termina una fecha con boletos cobrados.", "They show up when a date with charged tickets ends.") }]} />
        : <A.AdminList rows={d.filas.map((x) => ({ icon: x.st === "held" ? "lock" : "wallet", title: `${x.evento} · ${money(x.neto)}`, sub: `${x.negocio} · ${dia(x.dia, en)} · ${sub(x)}`, tag: stTxt[x.st]?.[0] ?? x.st, tone: stTxt[x.st]?.[1] ?? "neutral", actions: acciones(x) }))} />}
      <Toast t={toast} desk={desk} />
    </div>);
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
