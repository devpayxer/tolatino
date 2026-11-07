"use client";
/* USR-CITAS (diseño «To'Latino Mi cuenta» · citasV / citaRow): Próximas y Pasadas, cada una con su caja de fecha, el
   negocio, el estado, qué es, cuándo y para cuántos; lo que falta (esperando respuesta, te proponen otra hora, no pudo).
   «Volver a reservar» y «Escribir reseña» en las terminadas. Cada una abre su página. */
import { useRouter } from "next/navigation";
import type { EstMesa, MiOtro, MisReservas } from "@/lib/mi-cuenta";
import { Marco, useCuentaUi, type Bloque, type Fila, type Yo } from "../Marco";
import { cajaFecha, diaRel, horaDe } from "../fechas";

export const tagMesa = (st: EstMesa, es: boolean): [string, string] => {
  const E2 = (a: string, b: string) => (es ? a : b);
  return ({ pend: [E2("PENDIENTE", "PENDING"), "neutral"], alt: [E2("TE PROPONEN UN CAMBIO", "THEY PROPOSE A CHANGE"), "action"], ok: [E2("CONFIRMADA", "CONFIRMED"), "signal"], in: [E2("EN CURSO", "IN PROGRESS"), "action"],
    done: [E2("TERMINADA", "DONE"), "ink"], nos: [E2("NO LLEGASTE", "NO-SHOW"), "danger"], no: [E2("NO PUDO", "COULD NOT"), "danger"], exp: [E2("SIN RESPUESTA", "NO REPLY"), "neutral"], cx: [E2("CANCELADA", "CANCELED"), "neutral"] } as Record<EstMesa, [string, string]>)[st];
};

export function Citas({ d, f, es, yo, pagina, otros = [] }: { d: MisReservas; f: "up" | "past"; es: boolean; yo: Yo; pagina: boolean; otros?: MiOtro[] }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const ir = (q: string) => router.push("/cuenta/citas" + q);
  const B: Bloque[] = [{ type: "chips", items: [{ l: `${E2("Próximas", "Upcoming")} · ${d.n.up}`, on: f === "up", onClick: () => ir("") }, { l: `${E2("Pasadas", "Past")} · ${d.n.past}`, on: f === "past", onClick: () => ir("?f=past") }] }];
  if (f === "up" && d.filas.length) B.push({ type: "note", tone: "info", ic: "info", s: E2("Toda reservación es una solicitud: queda confirmada solo cuando el negocio responde.", "Every booking is a request: it is confirmed only when the business replies.") });
  B.push(d.filas.length ? { type: "rows", rows: d.filas.map((c): Fila => {
    const x = c.st === "pend" ? E2("Solicitud enviada · esperando respuesta", "Request sent · waiting for a reply") : c.st === "alt" ? E2("Te proponen un cambio. Ábrela para decidir.", "They propose a change. Open it to decide.")
      : c.st === "no" ? (c.cita ? E2("No pudo tomarla. Ábrela para buscar otra hora.", "They could not take it. Open it to find another time.") : E2("El restaurante no pudo. Ábrela para ver otras horas.", "The restaurant could not. Open it to see other times."))
        : c.st === "exp" ? (c.cita ? E2("No respondieron a tiempo. Si pagaste depósito, se devolvió.", "They did not reply in time. Any deposit was returned.") : E2("No respondieron a tiempo. No se te cobró nada.", "They did not reply in time. You were not charged.")) : "";
    const svc = c.svc ? (es ? c.svc.es : c.svc.en || c.svc.es) : "";
    return {
      key: c.num, date: cajaFecha(c.at, c.tz, es), dbg: c.up ? "var(--tl-ink)" : undefined, dfg: c.up ? "var(--tl-white)" : undefined, t: c.bname, tag: tagMesa(c.st, es),
      s: `${c.cita ? `${svc}${c.con ? ` ${E2("con", "with")} ${c.con}` : ""}` : `${E2("Mesa para ", "Table for ")}${c.p}`} · ${diaRel(c.dia, c.at, c.tz, es)} · ${horaDe(c.at, c.tz, es)}`.toUpperCase(), x, chev: true, on: () => router.push(c.fiesta ? `/fiesta/${c.num}` : c.cita ? `/cita/${c.num}` : `/reserva/${c.num}`),
      acts: c.st === "done" ? [[E2("Volver a reservar", "Book again"), "secondary", () => router.push(`/n/${c.biz}?tab=${c.cita ? "svc" : "rsv"}`)], ...(!c.rev ? [[E2("Escribir reseña", "Write review"), "primary", () => router.push(`/n/${c.biz}/resena?pedido=${c.num}`)] as [string, string, () => void]] : [])] : undefined,
    };
  }) } : { type: "empty", ic: "calendar", t: f === "up" ? E2("No tienes reservaciones próximas", "No upcoming bookings") : E2("Todavía no hay reservaciones pasadas", "No past bookings yet"),
    s: E2("Pide una cita o reserva mesa y aquí la ves con su estado.", "Book an appointment or a table and it shows here with its status."), cta: E2("Buscar dónde", "Find a place"), onCta: () => router.push("/negocios") });
  // 4g-3: planes del hogar, rentas de herramienta y apartados (cada uno abre su página).
  if (otros.length && !pagina) {
    const ST: Record<string, [string, string, string]> = { active: ["ACTIVO", "ACTIVE", "signal"], paused: ["EN PAUSA", "PAUSED", "action"], cancelled: ["CANCELADO", "CANCELLED", "neutral"],
      held: ["APARTADA", "ON HOLD", "action"], out: ["LA TIENES", "YOU HAVE IT", "signal"], back: ["DEVUELTA", "RETURNED", "ink"], expired: ["VENCIÓ", "EXPIRED", "neutral"],
      pending: ["ENVIADO", "SENT", "action"], change_proposed: ["FALTA ALGO", "ITEM MISSING", "action"], confirmed: ["TE LO GUARDAN", "HELD", "signal"], declined: ["NO LO TIENEN", "NOT IN STOCK", "danger"], done: ["RECOGIDO", "PICKED UP", "ink"] };
    const K = { plan: [E2("Plan", "Plan"), "calendar", "/plan/"], rental: [E2("Renta", "Rental"), "wrench", "/renta/"], hold: [E2("Apartado", "Hold"), "bag", "/apartado/"] } as const;
    B.push({ type: "sec", t: E2("Planes, rentas y apartados", "Plans, rentals and holds"), mt: "8px" });
    B.push({ type: "rows", rows: otros.map((o): Fila => { const t = ST[o.st] ?? [o.st.toUpperCase(), o.st.toUpperCase(), "neutral"]; return {
      key: o.num, ic: K[o.kind][1], t: o.bname, tag: [es ? t[0] : t[1], t[2]], s: `${K[o.kind][0]} ${o.num}${o.svc ? ` · ${es ? o.svc.es : o.svc.en || o.svc.es}` : ""}`.toUpperCase(), chev: true, on: () => router.push(`${K[o.kind][2]}${o.num}`) }; }) });
  }
  if (d.sig) B.push({ type: "more", l: E2("Ver más", "See more"), on: () => ir(`?f=past&antes=${d.sig}`) });
  if (pagina) B.push({ type: "more", l: E2("Volver a las más recientes", "Back to the latest"), on: () => ir("?f=past") });
  return <Marco es={es} code="USR-CITAS" t={E2("Citas y reservas", "Bookings")} s={`${d.n.up}${E2(" PRÓXIMAS · ", " UPCOMING · ")}${d.n.past}${E2(" PASADAS", " PAST")}`} blocks={B} yo={yo} ui={ui} />;
}
