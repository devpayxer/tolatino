"use client";
/* 9k · ADM-TX › Disputas (Super Admin.dc.html secTx; cola «disputa» de 120 h): cifras (falta responder, vencen pronto, el banco revisa, ganadas y perdidas en
   90 días), filtros y una fila por disputa con su plazo, la evidencia (archivos armados y enviados al banco) y el caso de Colas donde se responde. Compuesto con
   las piezas del panel (head, kpis, tabs, chips, rows, empty, acts). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { DatosDisputas, FiltroDisp } from "@/lib/admin-disputas";
import { useAncho } from "./Colas";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const EST: Record<string, [string, string]> = { needs_response: ["FALTA RESPONDER", "danger"], under_review: ["EL BANCO REVISA", "action"], won: ["GANADA", "signal"], lost: ["PERDIDA", "neutral"], accepted: ["ACEPTADA", "neutral"] };
const fecha = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function DisputasTx({ d, f }: { d: DatosDisputas; f: FiltroDisp }) {
  const router = useRouter(), desk = useAncho() >= 1024, k = d.kpi;
  const BASE = "/admin/transacciones/disputas";
  const ir = (q: Record<string, string>) => router.push(BASE + (Object.keys(q).length ? `?${new URLSearchParams(q)}` : ""));
  const B: Bloque[] = [
    { type: "head", eye: "TRANSACCIONES", t: "Disputas con el banco", s: "Cola de 120 horas. Cada disputa se responde con su evidencia —el recibo en PDF, la conversación con el cliente y la constancia de entrega— antes del plazo del banco; los archivos se suben a Stripe en el mismo envío. Tres días antes del plazo llega la alerta al equipo.", h1: desk ? 26 : 22 },
    { type: "tabs", items: [{ l: "Transacciones", on: false, onClick: () => router.push("/admin/transacciones") }, { l: "Disputas", on: true, onClick: () => ir({}) }] },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "FALTA RESPONDER", v: String(k.abiertas), s: "con plazo del banco", bg: "var(--tl-ink)", fg: "var(--tl-white)", onClick: () => ir({ f: "abiertas" }) },
      { k: "VENCEN PRONTO", v: String(k.vencen), s: k.vencen ? "responde hoy" : "ninguna cerca del plazo", sFg: k.vencen ? "var(--tl-danger)" : undefined, onClick: () => ir({ f: "vencen" }) },
      { k: "EL BANCO REVISA", v: String(k.revisa), s: "evidencia enviada", onClick: () => ir({ f: "revisa" }) },
      { k: "90 DÍAS", v: `${k.ganadas} · ${k.perdidas}`, s: "ganadas · perdidas o aceptadas", onClick: () => ir({ f: "cerradas" }) },
    ] },
    { type: "chips", items: ([["abiertas", "Falta responder"], ["vencen", "Vencen pronto"], ["revisa", "El banco revisa"], ["cerradas", "Cerradas"]] as const).map(([v, l]) => ({ l, v: f === v ? "selected" : "filter", onClick: () => ir({ f: v }) })) },
    d.filas.length ? { type: "rows", items: d.filas.map((x) => ({
      key: x.id, icon: "card", t: `Disputa · ${x.num ? (/^\d+$/.test(x.num) ? `pedido #${x.num}` : x.num) : x.id} · ${money(x.monto)}`,
      s: `${x.nombre ?? "Negocio"} · ${x.motivo}${x.due ? ` · plazo del banco ${fecha(x.due)}${x.estado === "needs_response" && x.horas != null ? (x.horas > 0 ? ` (faltan ${x.horas} h)` : " (venció)") : ""}` : ""} · ${x.enviados ? `evidencia enviada (${x.enviados} archivos)` : x.archivos ? `${x.archivos} archivos listos, sin enviar` : "evidencia sin armar"}${x.sim ? " · sandbox" : ""}`,
      tag: EST[x.estado]?.[0] ?? x.estado, tone: x.estado === "needs_response" && x.horas != null && x.horas <= 72 ? "danger" : EST[x.estado]?.[1] ?? "neutral", chev: !!x.caso,
      onClick: x.caso ? () => router.push(`/admin/colas?cola=disputa&caso=${x.caso}`) : undefined,
    })) } : { type: "empty", icon: "check", t: f === "cerradas" ? "Sin disputas cerradas" : "Sin disputas aquí", s: "Llegan del banco por Stripe; en el sandbox se simulan desde Transacciones." },
    ...(d.sigue ? [{ type: "acts" as const, items: [{ l: "Ver más", v: "secondary", onClick: () => ir({ f, antes: d.sigue! }) }] }] : []),
  ];
  return <PanelBloques bloques={B} h1={desk ? 26 : 22} />;
}
