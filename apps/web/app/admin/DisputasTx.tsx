"use client";
/* 9k · ADM-TX › Disputas (Super Admin.dc.html secTx; cola «disputa» de 120 h): cifras (falta responder, vencen pronto, el banco revisa, ganadas y perdidas en
   90 días), filtros y una fila por disputa con su plazo, la evidencia (archivos armados y enviados al banco) y el caso de Colas donde se responde. Compuesto con
   las piezas del panel (head, kpis, tabs, chips, rows, empty, acts). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { DatosDisputas, FiltroDisp } from "@/lib/admin-disputas";
import { useAncho } from "./Colas";
import { useE } from "./idioma-admin";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const EST: Record<string, [string, string]> = { needs_response: ["FALTA RESPONDER", "danger"], under_review: ["EL BANCO REVISA", "action"], won: ["GANADA", "signal"], lost: ["PERDIDA", "neutral"], accepted: ["ACEPTADA", "neutral"] };
const EST_EN: Record<string, string> = { needs_response: "NEEDS RESPONSE", under_review: "BANK REVIEWING", won: "WON", lost: "LOST", accepted: "ACCEPTED" };
const fecha = (iso: string, en = false) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function DisputasTx({ d, f }: { d: DatosDisputas; f: FiltroDisp }) {
  const router = useRouter(), desk = useAncho() >= 1024, k = d.kpi, E = useE(), en = E("", "x") === "x";
  const BASE = "/admin/transacciones/disputas";
  const ir = (q: Record<string, string>) => router.push(BASE + (Object.keys(q).length ? `?${new URLSearchParams(q)}` : ""));
  const B: Bloque[] = [
    { type: "head", eye: E("TRANSACCIONES", "TRANSACTIONS"), t: E("Disputas con el banco", "Bank disputes"), s: E("Cola de 120 horas. Cada disputa se responde con su evidencia —el recibo en PDF, la conversación con el cliente y la constancia de entrega— antes del plazo del banco; los archivos se suben a Stripe en el mismo envío. Tres días antes del plazo llega la alerta al equipo.", "120-hour queue. Each dispute is answered with its evidence (the PDF receipt, the conversation with the customer and the proof of delivery) before the bank’s deadline; the files are uploaded to Stripe in the same submission. The team gets an alert three days before the deadline."), h1: desk ? 26 : 22 },
    { type: "tabs", items: [{ l: E("Transacciones", "Transactions"), on: false, onClick: () => router.push("/admin/transacciones") }, { l: E("Disputas", "Disputes"), on: true, onClick: () => ir({}) }] },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("FALTA RESPONDER", "NEEDS RESPONSE"), v: String(k.abiertas), s: E("con plazo del banco", "with a bank deadline"), bg: "var(--tl-ink)", fg: "var(--tl-white)", onClick: () => ir({ f: "abiertas" }) },
      { k: E("VENCEN PRONTO", "DUE SOON"), v: String(k.vencen), s: k.vencen ? E("responde hoy", "respond today") : E("ninguna cerca del plazo", "none near the deadline"), sFg: k.vencen ? "var(--tl-danger)" : undefined, onClick: () => ir({ f: "vencen" }) },
      { k: E("EL BANCO REVISA", "BANK REVIEWING"), v: String(k.revisa), s: E("evidencia enviada", "evidence sent"), onClick: () => ir({ f: "revisa" }) },
      { k: E("90 DÍAS", "90 DAYS"), v: `${k.ganadas} · ${k.perdidas}`, s: E("ganadas · perdidas o aceptadas", "won · lost or accepted"), onClick: () => ir({ f: "cerradas" }) },
    ] },
    { type: "chips", items: ([["abiertas", E("Falta responder", "Needs response")], ["vencen", E("Vencen pronto", "Due soon")], ["revisa", E("El banco revisa", "Bank reviewing")], ["cerradas", E("Cerradas", "Closed")]] as const).map(([v, l]) => ({ l, v: f === v ? "selected" : "filter", onClick: () => ir({ f: v }) })) },
    d.filas.length ? { type: "rows", items: d.filas.map((x) => ({
      key: x.id, icon: "card", t: `${E("Disputa", "Dispute")} · ${x.num ? (/^\d+$/.test(x.num) ? `${E("pedido", "order")} #${x.num}` : x.num) : x.id} · ${money(x.monto)}`,
      s: en ? `${x.nombre ?? "Business"} · ${x.motivo}${x.due ? ` · bank deadline ${fecha(x.due, true)}${x.estado === "needs_response" && x.horas != null ? (x.horas > 0 ? ` (${x.horas} h left)` : " (expired)") : ""}` : ""} · ${x.enviados ? `evidence sent (${x.enviados} files)` : x.archivos ? `${x.archivos} files ready, not sent` : "evidence not assembled"}${x.sim ? " · sandbox" : ""}`
        : `${x.nombre ?? "Negocio"} · ${x.motivo}${x.due ? ` · plazo del banco ${fecha(x.due)}${x.estado === "needs_response" && x.horas != null ? (x.horas > 0 ? ` (faltan ${x.horas} h)` : " (venció)") : ""}` : ""} · ${x.enviados ? `evidencia enviada (${x.enviados} archivos)` : x.archivos ? `${x.archivos} archivos listos, sin enviar` : "evidencia sin armar"}${x.sim ? " · sandbox" : ""}`,
      tag: (en ? EST_EN[x.estado] : EST[x.estado]?.[0]) ?? x.estado, tone: x.estado === "needs_response" && x.horas != null && x.horas <= 72 ? "danger" : EST[x.estado]?.[1] ?? "neutral", chev: !!x.caso,
      onClick: x.caso ? () => router.push(`/admin/colas?cola=disputa&caso=${x.caso}`) : undefined,
    })) } : { type: "empty", icon: "check", t: f === "cerradas" ? E("Sin disputas cerradas", "No closed disputes") : E("Sin disputas aquí", "No disputes here"), s: E("Llegan del banco por Stripe; en el sandbox se simulan desde Transacciones.", "They come from the bank through Stripe; in the sandbox they are simulated from Transactions.") },
    ...(d.sigue ? [{ type: "acts" as const, items: [{ l: E("Ver más", "See more"), v: "secondary", onClick: () => ir({ f, antes: d.sigue! }) }] }] : []),
  ];
  return <PanelBloques bloques={B} h1={desk ? 26 : 22} />;
}
