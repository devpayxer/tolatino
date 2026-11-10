"use client";
/* 6e · Liquidaciones de eventos (Super Admin › Eventos y boletos; «Dinero / Transacciones: liquidaciones de eventos, retener o soltar con
   motivo», admin-dashboard L183–185). Hueco compuesto con las piezas del admin (head, kpis, chips, buscador, DenseTable / AdminList,
   ConfirmarMotivo) como Planes › Ingresos (2s, con su CSV). Los montos son los del libro (lib/evt-liquidacion.ts); aquí no se calcula nada. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ComponentType } from "react";
import type { FilaLiqAdm, LiqAdmin } from "@/lib/evt-liquidacion";
import { liqCsv, liqRetener, liqSoltar } from "./acciones-eventos";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "AdminNote", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dia = (ymd: string) => new Intl.DateTimeFormat("es-US", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, "");
const ST: Record<string, [string, string]> = { pending: ["PENDIENTE", "action"], held: ["RETENIDA", "danger"], paying: ["EN CAMINO", "action"], paid: ["PAGADA", "signal"], reversed: ["AJUSTADA", "neutral"] };
const HOLD: Record<string, string> = { disputa: "Disputa abierta (sale sola al cerrarse)", nuevo: "Primer evento grande de un organizador nuevo", cuenta: "La cuenta de cobro no recibe pagos", admin: "Retenida por To'Latino" };

export function Liquidaciones({ d, st, q, puede }: { d: LiqAdmin; st: string | null; q: string; puede: { decidir: boolean; exportar: boolean } }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024;
  const [qq, setQ] = useState(q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [pend, start] = useTransition();
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const head: Bloque = { type: "head", eye: "DINERO DE EVENTOS", t: "Liquidaciones de eventos", s: "Lo que se le transfiere a cada organizador por fecha, el martes después: lo cobrado menos la comisión, lo devuelto y lo perdido en disputas. Con una disputa abierta o un organizador nuevo, se retiene.", onBack: () => router.push("/admin/eventos"), h1: desk ? 26 : 22,
    act: puede.exportar ? { l: pend ? "Exportando…" : "Exportar CSV", icon: "folder", onClick: () => start(async () => {
      const r = await liqCsv(st, q); if (!r.ok || !r.archivo) { setToast(r.ok ? "No se pudo." : r.mensaje); return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`﻿${r.archivo}`], { type: "text/csv;charset=utf-8" })); a.download = r.nombre ?? "tolatino-liquidaciones.csv"; document.body.appendChild(a); a.click(); a.remove(); setToast(r.mensaje ?? "Descargado."); }) } : undefined };
  if (conf) return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={[{ ...head, t: conf.titulo, onBack: () => setConf(null), act: undefined }]} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></div>;
  const k = d.kpi;
  const B: Bloque[] = [head,
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "POR PAGAR", v: money(k.martes), s: `${k.nM} fechas pendientes`, bg: "var(--tl-ink)", fg: "var(--tl-white)", onClick: () => ir({ st: "pending" }) },
      { k: "RETENIDAS", v: money(k.held), s: `${k.nH} fechas`, onClick: () => ir({ st: "held" }) },
      { k: "PAGADO · 30 DÍAS", v: money(k.pagado), s: `${k.nP} transferencias`, onClick: () => ir({ st: "paid" }) },
      { k: "POR DESCONTAR", v: money(k.deuda), s: "devuelto después de pagar" },
    ] },
    { type: "chips", items: ([["", "Todas"], ["pending", "Pendientes"], ["held", "Retenidas"], ["paying", "En camino"], ["paid", "Pagadas"], ["reversed", "Ajustadas"]] as const).map(([v, l]) => ({ l, v: (st ?? "") === v ? "selected" : "filter", onClick: () => ir({ st: v || null }) })) },
  ];
  const acciones = (x: FilaLiqAdm) => [
    { label: "Ver evento", variant: "secondary", onClick: () => router.push(`/admin/eventos/${x.eid}`) },
    ...(puede.decidir && (x.st === "pending" || (x.st === "held" && x.hk !== "admin" && x.hk !== "nuevo")) ? [{ label: "Retener", variant: "danger", onClick: () => setConf({ titulo: `Retener · ${x.negocio} · ${x.evento}`, sub: "No se transfiere hasta que la sueltes. El organizador ve el motivo en Cobros.", peligro: true, plantillas: ["Reportes de que el evento no pasó", "Revisión de Confianza", "Datos de la cuenta por confirmar"], cta: "Retener", hacer: (m) => liqRetener(x.id, m) }) }] : []),
    ...(puede.decidir && x.st === "held" && (x.hk === "admin" || x.hk === "nuevo") ? [{ label: "Soltar", variant: "primary", onClick: () => setConf({ titulo: `Soltar · ${x.negocio} · ${x.evento}`, sub: x.hk === "nuevo" ? "Confianza ya lo miró: se paga en el siguiente barrido y sus próximos eventos no se retienen por ser nuevo." : "Se paga en el siguiente barrido si la fecha ya llegó a su martes.", plantillas: ["El evento pasó sin problemas", "Organizador conocido de la ciudad", "Revisión terminada"], cta: "Soltar", hacer: (m) => liqSoltar(x.id, m) }) }] : []),
  ];
  const sub = (x: FilaLiqAdm) => `${x.ciudad} · se paga el ${dia(x.payOn)} · bruto ${money(x.bruto)} · comisión ${money(x.comision)}${x.devuelto ? ` · devuelto ${money(x.devuelto)}` : ""}${x.disputa ? ` · disputas ${money(x.disputa)}` : ""}${x.descontado ? ` · ajuste ${money(x.descontado)}` : ""}${x.hk ? ` · ${HOLD[x.hk] ?? x.hk}${x.hn ? `: ${x.hn}` : ""}` : ""}${x.error ? ` · último error: ${x.error} (${x.intentos} intentos)` : ""}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: qq.trim() || null }); }}>
        <input value={qq} onChange={(e) => setQ(e.target.value)} placeholder="Negocio o evento" aria-label="Buscar"
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 16px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
      </form>
      <A.AdminNote tone="info" icon="info">El monto lo calcula la base al pagar y queda fijo; la transferencia lleva una llave por fecha: nunca se paga dos veces. Una disputa abierta o una cuenta que no recibe pagos retiene sola y suelta sola.</A.AdminNote>
      {!d.filas.length ? <PanelBloques bloques={[{ type: "empty", icon: "wallet", t: "Nada con ese filtro", s: "Aparecen cuando termina una fecha con boletos cobrados." }]} />
        : <A.AdminList rows={d.filas.map((x) => ({ icon: x.st === "held" ? "lock" : "wallet", title: `${x.evento} · ${money(x.neto)}`, sub: `${x.negocio} · ${dia(x.dia)} · ${sub(x)}`, tag: ST[x.st]?.[0] ?? x.st, tone: ST[x.st]?.[1] ?? "neutral", actions: acciones(x) }))} />}
      <Toast t={toast} desk={desk} />
    </div>);
}
