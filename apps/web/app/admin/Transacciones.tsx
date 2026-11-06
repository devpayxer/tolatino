"use client";
/* ADM-TX · Transacciones (Super Admin.dc.html secTx / txRow): cifras (hoy, terminados 90 d, no se dieron, reservaciones),
   búsqueda por número, negocio o cliente, pestañas (Todas, Pedidos, Reservaciones), estados y exportar a CSV. Hoy todo se
   paga en el local: sin retenido, devoluciones ni comisión hasta Stripe (2d). Citas, boletos y apartados con sus fases. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ComponentType } from "react";
import type { EstTx, FiltrosTx, ListaTx } from "@/lib/admin-tx";
import { exportarTx } from "./acciones-tx";
import { Toast, useAncho, useToast } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "Pager" | "Icon", ComponentType<any>>;
const ST: Record<EstTx, [string, string]> = { pend: ["PENDIENTE", "neutral"], curso: ["EN CURSO", "action"], done: ["TERMINADO", "signal"], cx: ["CANCELADO", "neutral"], no: ["NO SE DIO", "danger"] };
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cuando = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function Transacciones({ d, f, porPagina, exportar }: { d: ListaTx; f: FiltrosTx; porPagina: number; exportar: boolean }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024;
  const [q, setQ] = useState(f.q), [toast, setToast] = useToast(), [pend, start] = useTransition();
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("pag" in p)) u.delete("pag"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const tg = (k: EstTx) => { const l = f.st.includes(k) ? f.st.filter((x) => x !== k) : [...f.st, k]; ir({ st: l.join(",") || null }); };
  const bajar = () => start(async () => {
    const r = await exportarTx(Object.fromEntries(sp.entries()));
    if (!r.ok || !r.archivo) { setToast(r.ok ? "No se pudo." : r.mensaje); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`﻿${r.archivo}`], { type: "text/csv;charset=utf-8" })); a.download = r.nombre ?? "tolatino-transacciones.csv"; document.body.appendChild(a); a.click(); a.remove();
    setToast(r.mensaje ?? "Descargado.");
  });
  const k = d.kpi;
  const bloques: Bloque[] = [
    { type: "head", eye: `${d.total} EN 90 DÍAS`, t: "Transacciones", s: "Pedidos y reservaciones de los últimos 90 días. Hoy se paga en el local o al recibir: sin cobro con tarjeta ni devoluciones todavía.", h1: desk ? 26 : 22,
      act: exportar ? { l: pend ? "Exportando…" : "Exportar", icon: "folder", onClick: bajar } : undefined },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "HOY", v: String(k.hoy), s: `${money(k.hoyc)} en pedidos`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: "PEDIDOS TERMINADOS 90 D", v: String(k.done), s: `${money(k.donec)} pagados en el local`, onClick: () => ir({ st: "done" }) },
      { k: "NO SE DIERON 90 D", v: String(k.perdidos), s: "cancelados, rechazados o sin respuesta", onClick: () => ir({ st: "cx,no" }) },
      { k: "RESERVACIONES 90 D", v: String(k.rsv), s: "mesas", onClick: () => ir({ tab: "rsv" }) },
    ] },
    { type: "tabs", items: ([["all", "Todas"], ["ped", "Pedidos"], ["rsv", "Reservaciones"]] as const).map(([t, l]) => ({ l, on: f.tab === t, onClick: () => ir({ tab: t === "all" ? null : t }) })) },
  ];
  const a = d.total ? (f.pag - 1) * porPagina + 1 : 0, b = Math.min(d.total, f.pag * porPagina);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={bloques} h1={desk ? 26 : 22} />
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.45)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="# de pedido o reservación, negocio o cliente" aria-label="Buscar transacción"
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
      </form>
      <PanelBloques bloques={[{ type: "chips", items: (Object.keys(ST) as EstTx[]).map((x) => ({ l: { pend: "Pendiente", curso: "En curso", done: "Terminado", cx: "Cancelado", no: "No se dio" }[x], v: f.st.includes(x) ? "selected" : "filter", onClick: () => tg(x) })) }]} />
      {!d.filas.length ? <PanelBloques bloques={[{ type: "empty", icon: "card", t: "Nada con esos filtros", s: "Prueba otro estado o busca por número." }]} />
        : <A.AdminList rows={d.filas.map((x) => ({
          icon: x.k === "order" ? "bag" : "restaurant", title: `${x.k === "order" ? "Pedido" : "Reservación"} ${x.k === "order" ? `#${x.num}` : x.num} · ${x.bname}`,
          sub: `${x.quien} · ${cuando(x.at)} · ${x.k === "order" ? `${money(x.total)}${x.mode === "delivery" ? " · delivery" : " · pickup"}` : `mesa para ${x.p ?? "—"}`}${x.st === "cx" && x.detalle ? ` · canceló ${x.detalle === "user" ? "el cliente" : x.detalle === "business" ? "el negocio" : x.detalle === "admin" ? "To’Latino" : "el sistema"}` : ""}`,
          tag: ST[x.st][0], tone: ST[x.st][1],
          actions: [{ label: "Ver negocio", variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}`) }, { label: "Ver cliente", variant: "secondary", onClick: () => router.push(`/admin/usuarios/${x.uid}`) }],
        }))} />}
      {d.total > porPagina ? <A.Pager label={`${a}–${b} · ${d.total}`} hasPrev={f.pag > 1} hasNext={b < d.total} onPrev={() => ir({ pag: String(f.pag - 1) })} onNext={() => ir({ pag: String(f.pag + 1) })} /> : null}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
