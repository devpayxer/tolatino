"use client";
/* ADM-NEG · 360° › Operación (Super Admin.dc.html, pestaña «oper»): cómo trabaja el negocio con lo que le piden. Cifras de 90 y 30 días, las vistas
   de 7 días, lo que tocan en su ficha, lo que le queda si es Free y sus operaciones de 90 días por tipo (de a 8), cada una a Transacciones.
   Solo lectura; sale a quien ve transacciones (tx:ver), como Dinero. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import type { Oper360 } from "@/lib/admin-negocio-oper";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"HBars" | "AdminNote", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const dia = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "");
const DOW = ["D", "L", "M", "M", "J", "V", "S"];
const KIND: Record<string, [string, string]> = { order: ["Pedido", "bag"], market_order: ["Pedido del mercado", "bag"], appointment: ["Cita", "calendar"], visit: ["Visita", "key"], enrollment: ["Inscripción", "users"],
  party: ["Fiesta", "party"], trip: ["Viaje", "truck"], table: ["Mesa", "calendar"], night: ["Noche", "drink"], private_event: ["Evento privado", "party"], tickets: ["Boletos", "ticket"],
  hold: ["Apartado", "bag"], rental: ["Renta", "wrench"], plan: ["Plan", "calendar"] };
const ST: Record<string, [string, string]> = { pend: ["PENDIENTE", "neutral"], curso: ["EN CURSO", "action"], done: ["TERMINADO", "signal"], cx: ["CANCELADO", "neutral"], no: ["NO SE DIO", "danger"] };
const TOQUE: Record<string, string> = { call: "Llamar", whatsapp: "WhatsApp", directions: "Cómo llegar", web: "Sitio web", msg: "Mensaje", share: "Compartir", menu: "Menú" };
const CHIPS: [string, string][] = [["all", "Todo"], ["ped", "Pedidos"], ["cita", "Citas"], ["rsv", "Mesas"], ["bol", "Boletos"], ["apt", "Apartados"]];

export function N360Oper({ o, id, grupo, desk }: { o: Oper360; id: string; grupo: string; desk: boolean }) {
  const router = useRouter();
  const ir = (k: string, antes?: string) => router.push(`/admin/negocios/${id}?tab=oper${k !== "all" ? `&k=${k}` : ""}${antes ? `&antes=${antes}` : ""}`, { scroll: false });
  const cols = desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", max7 = Math.max(1, ...o.dias.map((d) => d.n));
  const B: Bloque[] = [
    { type: "kpis", cols, items: [
      { k: "OPERACIONES · 90 D", v: String(o.k90.ops) },
      { k: "ACEPTA", v: o.k90.acepta == null ? "—" : `${o.k90.acepta} %`, s: "de lo que le piden" },
      { k: "RESPONDE EN", v: o.k90.resp == null ? "—" : `${o.k90.resp} min`, s: "promedio" },
      { k: "CANCELADAS", v: String(o.k90.canc), s: "o que no se dieron" },
    ] },
    { type: "kpis", cols, items: [
      { k: "VISTAS · 30 D", v: String(o.k30.vistas) },
      { k: "CONTACTOS", v: String(o.k30.contactos), s: "toques en su ficha" },
      { k: "PEDIDOS O CITAS", v: String(o.k30.ops) },
      { k: "CONVERSIÓN", v: o.k30.conv == null ? "—" : `${o.k30.conv} %` },
    ] },
    { type: "chart", k: "VISTAS · 7 DÍAS", v: String(o.dias.reduce((a, d) => a + d.n, 0)),
      bars: o.dias.map((d, i) => ({ h: `${Math.max(4, Math.round((d.n / max7) * 84))}px`, on: i === o.dias.length - 1, l: DOW[new Date(`${d.d}T12:00:00Z`).getUTCDay()] })) },
  ];
  const top = o.toques[0]?.n ?? 1;
  const free: Bloque[] = o.free ? [{ type: "note", tone: "info", icon: "info", t: `Free: le ${o.free.quedan === 1 ? "queda" : "quedan"} ${o.free.quedan} de ${o.free.cap} pedidos o citas en línea este mes; después, Llamar.`,
    cta: "Ir a Planes", onCta: () => router.push("/admin/planes?tab=subs") }] : [];
  const lista: Bloque[] = [
    { type: "group", k: "OPERACIONES · 90 DÍAS", link: o.cuenta.all ? "Ver en Transacciones" : undefined, onLink: () => router.push(`/admin/transacciones?q=${encodeURIComponent(id)}`) },
    ...(o.cuenta.all ? [{ type: "chips", items: CHIPS.filter(([k]) => k === "all" || o.cuenta[k]).map(([k, l]) => ({ l: `${l} · ${o.cuenta[k] ?? 0}`, v: grupo === k ? "selected" : "filter", onClick: () => ir(k) })) } as Bloque] : []),
    o.filas.length
      ? { type: "rows", items: o.filas.map((x) => ({ key: x.num, icon: KIND[x.k]?.[1] ?? "bag", t: `${KIND[x.k]?.[0] ?? x.k} ${x.num}${x.total ? ` · ${money(x.total)}` : ""}`, s: `${x.quien} · ${dia(x.at)}`,
          tag: ST[x.st]?.[0], tone: ST[x.st]?.[1] ?? "neutral", chev: true, onClick: () => router.push(`/admin/transacciones?q=${encodeURIComponent(x.num)}`) })) }
      : { type: "note", tone: "info", icon: "bag", t: "Sin operaciones en 90 días." },
  ];
  if (o.siguiente) lista.push({ type: "acts", items: [{ l: "Ver más", v: "secondary", icon: "chevronDown", onClick: () => ir(grupo, o.siguiente!) }] });
  return (
    <>
      <PanelBloques bloques={B} />
      {o.toques.length ? <A.HBars label="LO QUE TOCAN EN SU FICHA" help="30 días"
        items={o.toques.map((t) => ({ label: TOQUE[t.k] ?? t.k, width: `${Math.round((t.n / top) * 100)}%`, color: "var(--tl-action)", value: String(t.n) }))} /> : null}
      <PanelBloques bloques={[...free, ...lista]} />
    </>
  );
}
