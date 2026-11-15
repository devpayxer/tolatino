"use client";
/* ADM-NEG · 360° › Operación (Super Admin.dc.html, pestaña «oper»): cómo trabaja el negocio con lo que le piden. Cifras de 90 y 30 días, las vistas
   de 7 días, lo que tocan en su ficha, lo que le queda si es Free y sus operaciones de 90 días por tipo (de a 8), cada una a Transacciones.
   Solo lectura; sale a quien ve transacciones (tx:ver), como Dinero. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import type { Oper360 } from "@/lib/admin-negocio-oper";
import { useE } from "./idioma-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"HBars" | "AdminNote", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const dia = (iso: string, en = false) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "");
const DOW = ["D", "L", "M", "M", "J", "V", "S"], DOW_EN = ["S", "M", "T", "W", "T", "F", "S"];
const KIND: Record<string, [string, string, string]> = { order: ["Pedido", "Order", "bag"], market_order: ["Pedido del mercado", "Market order", "bag"], appointment: ["Cita", "Booking", "calendar"], visit: ["Visita", "Visit", "key"], enrollment: ["Inscripción", "Enrollment", "users"],
  party: ["Fiesta", "Party", "party"], trip: ["Viaje", "Trip", "truck"], table: ["Mesa", "Table", "calendar"], night: ["Noche", "Night", "drink"], private_event: ["Evento privado", "Private event", "party"], tickets: ["Boletos", "Tickets", "ticket"],
  hold: ["Apartado", "Hold", "bag"], rental: ["Renta", "Rental", "wrench"], plan: ["Plan", "Plan", "calendar"] };
const ST: Record<string, [string, string, string]> = { pend: ["PENDIENTE", "PENDING", "neutral"], curso: ["EN CURSO", "IN PROGRESS", "action"], done: ["TERMINADO", "DONE", "signal"], cx: ["CANCELADO", "CANCELLED", "neutral"], no: ["NO SE DIO", "DIDN’T HAPPEN", "danger"] };
const TOQUE: Record<string, [string, string]> = { call: ["Llamar", "Call"], whatsapp: ["WhatsApp", "WhatsApp"], directions: ["Cómo llegar", "Directions"], web: ["Sitio web", "Website"], msg: ["Mensaje", "Message"], share: ["Compartir", "Share"], menu: ["Menú", "Menu"] };
const CHIPS: [string, string, string][] = [["all", "Todo", "All"], ["ped", "Pedidos", "Orders"], ["cita", "Citas", "Bookings"], ["rsv", "Mesas", "Tables"], ["bol", "Boletos", "Tickets"], ["apt", "Apartados", "Holds"]];

export function N360Oper({ o, id, grupo, desk }: { o: Oper360; id: string; grupo: string; desk: boolean }) {
  const router = useRouter(), E = useE(), en = E("", "x") === "x", i = en ? 1 : 0;
  const ir = (k: string, antes?: string) => router.push(`/admin/negocios/${id}?tab=oper${k !== "all" ? `&k=${k}` : ""}${antes ? `&antes=${antes}` : ""}`, { scroll: false });
  const cols = desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", max7 = Math.max(1, ...o.dias.map((d) => d.n));
  const B: Bloque[] = [
    { type: "kpis", cols, items: [
      { k: E("OPERACIONES · 90 D", "PURCHASES · 90 D"), v: String(o.k90.ops) },
      { k: E("ACEPTA", "ACCEPTS"), v: o.k90.acepta == null ? "—" : `${o.k90.acepta} %`, s: E("de lo que le piden", "of what is requested") },
      { k: E("RESPONDE EN", "REPLIES IN"), v: o.k90.resp == null ? "—" : `${o.k90.resp} min`, s: E("promedio", "average") },
      { k: E("CANCELADAS", "CANCELLED"), v: String(o.k90.canc), s: E("o que no se dieron", "or didn’t happen") },
    ] },
    { type: "kpis", cols, items: [
      { k: E("VISTAS · 30 D", "VIEWS · 30 D"), v: String(o.k30.vistas) },
      { k: E("CONTACTOS", "CONTACTS"), v: String(o.k30.contactos), s: E("toques en su ficha", "taps on their page") },
      { k: E("PEDIDOS O CITAS", "ORDERS OR BOOKINGS"), v: String(o.k30.ops) },
      { k: E("CONVERSIÓN", "CONVERSION"), v: o.k30.conv == null ? "—" : `${o.k30.conv} %` },
    ] },
    { type: "chart", k: E("VISTAS · 7 DÍAS", "VIEWS · 7 DAYS"), v: String(o.dias.reduce((a, d) => a + d.n, 0)),
      bars: o.dias.map((d, i) => ({ h: `${Math.max(4, Math.round((d.n / max7) * 84))}px`, on: i === o.dias.length - 1, l: (en ? DOW_EN : DOW)[new Date(`${d.d}T12:00:00Z`).getUTCDay()] })) },
  ];
  const top = o.toques[0]?.n ?? 1;
  const free: Bloque[] = o.free ? [{ type: "note", tone: "info", icon: "info", t: E(`Free: le ${o.free.quedan === 1 ? "queda" : "quedan"} ${o.free.quedan} de ${o.free.cap} pedidos o citas en línea este mes; después, Llamar.`, `Free: ${o.free.quedan} of ${o.free.cap} online orders or bookings left this month; then, Call.`),
    cta: E("Ir a Planes", "Go to Plans"), onCta: () => router.push("/admin/planes?tab=subs") }] : [];
  const lista: Bloque[] = [
    { type: "group", k: E("OPERACIONES · 90 DÍAS", "PURCHASES · 90 DAYS"), link: o.cuenta.all ? E("Ver en Transacciones", "See in Transactions") : undefined, onLink: () => router.push(`/admin/transacciones?q=${encodeURIComponent(id)}`) },
    ...(o.cuenta.all ? [{ type: "chips", items: CHIPS.filter(([k]) => k === "all" || o.cuenta[k]).map(([k, l, lEn]) => ({ l: `${en ? lEn : l} · ${o.cuenta[k] ?? 0}`, v: grupo === k ? "selected" : "filter", onClick: () => ir(k) })) } as Bloque] : []),
    o.filas.length
      ? { type: "rows", items: o.filas.map((x) => ({ key: x.num, icon: KIND[x.k]?.[2] ?? "bag", t: `${KIND[x.k]?.[i] ?? x.k} ${x.num}${x.total ? ` · ${money(x.total)}` : ""}`, s: `${x.quien} · ${dia(x.at, en)}`,
          tag: ST[x.st]?.[i], tone: ST[x.st]?.[2] ?? "neutral", chev: true, onClick: () => router.push(`/admin/transacciones?q=${encodeURIComponent(x.num)}`) })) }
      : { type: "note", tone: "info", icon: "bag", t: E("Sin operaciones en 90 días.", "No purchases in 90 days.") },
  ];
  if (o.siguiente) lista.push({ type: "acts", items: [{ l: E("Ver más", "See more"), v: "secondary", icon: "chevronDown", onClick: () => ir(grupo, o.siguiente!) }] });
  return (
    <>
      <PanelBloques bloques={B} />
      {o.toques.length ? <A.HBars label={E("LO QUE TOCAN EN SU FICHA", "WHAT PEOPLE TAP ON THEIR PAGE")} help={E("30 días", "30 days")}
        items={o.toques.map((t) => ({ label: TOQUE[t.k]?.[i] ?? t.k, width: `${Math.round((t.n / top) * 100)}%`, color: "var(--tl-action)", value: String(t.n) }))} /> : null}
      <PanelBloques bloques={[...free, ...lista]} />
    </>
  );
}
