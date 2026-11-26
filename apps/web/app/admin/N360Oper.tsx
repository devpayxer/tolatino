"use client";
/* ADM-NEG · 360° › Operación (Super Admin.dc.html, pestaña «oper»): cómo trabaja el negocio con lo que le piden. Cifras de 90 y 30 días, las vistas
   de 7 días, lo que tocan en su ficha, lo que le queda si es Free y sus operaciones de 90 días por tipo (de a 8), cada una a Transacciones.
   Solo lectura; sale a quien ve transacciones (tx:ver), como Dinero. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import type { Oper360 } from "@/lib/admin-negocio-oper";
import { useE2 } from "./idioma-admin";

type EF = (es: string, en: string) => string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"HBars" | "AdminNote", ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const dia = (iso: string, en = false) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "");
const DOW = (E2: EF) => [E2("D", "S"), E2("L", "M"), E2("M", "T"), E2("M", "W"), E2("J", "T"), E2("V", "F"), "S"];
const KIND = (E2: EF): Record<string, [string, string]> => ({
  order: [E2("Pedido", "Order"), "bag"], market_order: [E2("Pedido del mercado", "Market order"), "bag"],
  appointment: [E2("Cita", "Booking"), "calendar"], visit: [E2("Visita", "Visit"), "key"], enrollment: [E2("Inscripción", "Enrollment"), "users"],
  party: [E2("Fiesta", "Party"), "party"], trip: [E2("Viaje", "Trip"), "truck"], table: [E2("Mesa", "Table"), "calendar"],
  night: [E2("Noche", "Night"), "drink"], private_event: [E2("Evento privado", "Private event"), "party"],
  tickets: [E2("Boletos", "Tickets"), "ticket"], hold: [E2("Apartado", "Hold"), "bag"], rental: [E2("Renta", "Rental"), "wrench"],
  plan: ["Plan", "calendar"]
});
const ST = (E2: EF): Record<string, [string, string]> => ({
  pend: [E2("PENDIENTE", "PENDING"), "neutral"], curso: [E2("EN CURSO", "IN PROGRESS"), "action"], done: [E2("TERMINADO", "DONE"), "signal"],
  cx: [E2("CANCELADO", "CANCELLED"), "neutral"], no: [E2("NO SE DIO", "DIDN’T HAPPEN"), "danger"]
});
const TOQUE = (E2: EF): Record<string, string> => ({
  call: E2("Llamar", "Call"), whatsapp: "WhatsApp", directions: E2("Cómo llegar", "Directions"), web: E2("Sitio web", "Website"),
  msg: E2("Mensaje", "Message"), share: E2("Compartir", "Share"), menu: E2("Menú", "Menu")
});
const CHIPS = (E2: EF): [string, string][] => [["all", E2("Todo", "All")], ["ped", E2("Pedidos", "Orders")], ["cita", E2("Citas", "Bookings")], ["rsv", E2("Mesas", "Tables")], ["bol", E2("Boletos", "Tickets")], ["apt", E2("Apartados", "Holds")]];

export function N360Oper({ o, id, grupo, desk }: { o: Oper360; id: string; grupo: string; desk: boolean }) {
  const router = useRouter(), { E2 } = useE2(), en = E2("", "x") === "x", dow = DOW(E2), kind = KIND(E2), st = ST(E2), toque = TOQUE(E2);
  const ir = (k: string, antes?: string) => router.push(`/admin/negocios/${id}?tab=oper${k !== "all" ? `&k=${k}` : ""}${antes ? `&antes=${antes}` : ""}`, { scroll: false });
  const cols = desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", max7 = Math.max(1, ...o.dias.map((d) => d.n));
  const B: Bloque[] = [
    { type: "kpis", cols, items: [
      { k: E2("OPERACIONES · 90 D", "PURCHASES · 90 D"), v: String(o.k90.ops) },
      { k: E2("ACEPTA", "ACCEPTS"), v: o.k90.acepta == null ? "—" : `${o.k90.acepta} %`, s: E2("de lo que le piden", "of what is requested") },
      { k: E2("RESPONDE EN", "REPLIES IN"), v: o.k90.resp == null ? "—" : `${o.k90.resp} min`, s: E2("promedio", "average") },
      { k: E2("CANCELADAS", "CANCELLED"), v: String(o.k90.canc), s: E2("o que no se dieron", "or didn’t happen") },
    ] },
    { type: "kpis", cols, items: [
      { k: E2("VISTAS · 30 D", "VIEWS · 30 D"), v: String(o.k30.vistas) },
      { k: E2("CONTACTOS", "CONTACTS"), v: String(o.k30.contactos), s: E2("toques en su ficha", "taps on their page") },
      { k: E2("PEDIDOS O CITAS", "ORDERS OR BOOKINGS"), v: String(o.k30.ops) },
      { k: E2("CONVERSIÓN", "CONVERSION"), v: o.k30.conv == null ? "—" : `${o.k30.conv} %` },
    ] },
    { type: "chart", k: E2("VISTAS · 7 DÍAS", "VIEWS · 7 DAYS"), v: String(o.dias.reduce((a, d) => a + d.n, 0)),
      bars: o.dias.map((d, i) => ({ h: `${Math.max(4, Math.round((d.n / max7) * 84))}px`, on: i === o.dias.length - 1, l: dow[new Date(`${d.d}T12:00:00Z`).getUTCDay()] })) },
  ];
  const top = o.toques[0]?.n ?? 1;
  const free: Bloque[] = o.free ? [{ type: "note", tone: "info", icon: "info", t: E2(`Free: le ${o.free.quedan === 1 ? "queda" : "quedan"} ${o.free.quedan} de ${o.free.cap} pedidos o citas en línea este mes; después, Llamar.`, `Free: ${o.free.quedan} of ${o.free.cap} online orders or bookings left this month; then, Call.`),
    cta: E2("Ir a Planes", "Go to Plans"), onCta: () => router.push("/admin/planes?tab=subs") }] : [];
  const lista: Bloque[] = [
    { type: "group", k: E2("OPERACIONES · 90 DÍAS", "PURCHASES · 90 DAYS"), link: o.cuenta.all ? E2("Ver en Transacciones", "See in Transactions") : undefined, onLink: () => router.push(`/admin/transacciones?q=${encodeURIComponent(id)}`) },
    ...(o.cuenta.all ? [{ type: "chips", items: CHIPS(E2).filter(([k]) => k === "all" || o.cuenta[k]).map(([k, l]) => ({ l: `${l} · ${o.cuenta[k] ?? 0}`, v: grupo === k ? "selected" : "filter", onClick: () => ir(k) })) } as Bloque] : []),
    o.filas.length
      ? { type: "rows", items: o.filas.map((x) => ({ key: x.num, icon: kind[x.k]?.[1] ?? "bag", t: `${kind[x.k]?.[0] ?? x.k} ${x.num}${x.total ? ` · ${money(x.total)}` : ""}`, s: `${x.quien} · ${dia(x.at, en)}`,
          tag: st[x.st]?.[0], tone: st[x.st]?.[1] ?? "neutral", chev: true, onClick: () => router.push(`/admin/transacciones?q=${encodeURIComponent(x.num)}`) })) }
      : { type: "note", tone: "info", icon: "bag", t: E2("Sin operaciones en 90 días.", "No purchases in 90 days.") },
  ];
  if (o.siguiente) lista.push({ type: "acts", items: [{ l: E2("Ver más", "See more"), v: "secondary", icon: "chevronDown", onClick: () => ir(grupo, o.siguiente!) }] });
  return (
    <>
      <PanelBloques bloques={B} />
      {o.toques.length ? <A.HBars label={E2("LO QUE TOCAN EN SU FICHA", "WHAT PEOPLE TAP ON THEIR PAGE")} help={E2("30 días", "30 days")}
        items={o.toques.map((t) => ({ label: toque[t.k] ?? t.k, width: `${Math.round((t.n / top) * 100)}%`, color: "var(--tl-action)", value: String(t.n) }))} /> : null}
      <PanelBloques bloques={[...free, ...lista]} />
    </>
  );
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
