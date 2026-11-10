"use client";
/* USR-BOLETOS (diseño «To'Latino Mi cuenta» USR-BOLETOS · Eventos msVals): Próximos · Pasados, una fila por orden con la fecha en caja,
   cuántos boletos, «CON QR» / «USADO» / «DEVUELTO»; tocar abre la orden con los QR. Sin boletos: ir a Eventos. */
import { useRouter } from "next/navigation";
import type { GrupoMis, MisBoletos as MB } from "@/lib/boletos";
import { diaCorto, hora, mesCorto } from "@/lib/evt-comun";
import { Marco, useCuentaUi, type Bloque, type Fila, type Yo } from "../Marco";

export function MisBoletos({ d, f, es, yo }: { d: MB; f: "proximos" | "pasados"; es: boolean; yo: Yo }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const fila = (g: GrupoMis, pasado: boolean): Fila => ({
    key: g.numero, t: g.title, s: `${diaCorto(g.dia, es).toUpperCase()} · ${hora(g.h0)} · ${g.venue}`.toUpperCase(),
    x: `${g.n} ${g.n === 1 ? E2("boleto", "ticket") : E2("boletos", "tickets")}${g.mesa ? E2(" · con mesa", " · with table") : ""} · ${E2("orden", "order")} ${g.numero}`,
    date: { dd: String(Number(g.dia.slice(8, 10))), mo: mesCorto(g.dia, es) }, dbg: g.dark ? "var(--tl-ink)" : undefined, dfg: g.dark ? "var(--tl-white)" : undefined,
    tag: g.vivos === 0 ? (g.devueltos ? [E2("DEVUELTO", "REFUNDED"), "neutral"] : [E2("ANULADO", "VOID"), "danger"]) : pasado ? [E2("PASADO", "PAST"), "neutral"] : [E2("CON QR", "WITH QR"), "signal"],
    chev: true, on: () => router.push(`/eventos/orden/${g.numero}`),
  });
  const L = f === "proximos" ? d.proximos : d.pasados;
  const B: Bloque[] = [
    { type: "chips", items: [{ l: `${E2("Próximos", "Upcoming")} · ${d.proximos.length}`, on: f === "proximos", onClick: () => router.push("/cuenta/boletos") }, { l: `${E2("Pasados", "Past")} · ${d.pasados.length}`, on: f === "pasados", onClick: () => router.push("/cuenta/boletos?f=pasados") }] },
    L.length ? { type: "rows", rows: L.map((g) => fila(g, f === "pasados")) }
      : { type: "empty", ic: "ticket", t: f === "proximos" ? E2("No tienes boletos próximos", "No upcoming tickets") : E2("Sin boletos pasados", "No past tickets"),
          s: E2("Cuando compres boletos de un evento, aquí tienes tu QR. Funciona sin señal.", "When you buy event tickets, your QR lives here. It works without signal."), cta: E2("Ver eventos", "See events"), onCta: () => router.push("/eventos") },
    ...(f === "proximos" && d.proximos.length ? [{ type: "note", tone: "info", ic: "ticket", s: E2("Tu QR es la entrada: muéstralo en la puerta y sube el brillo. En la puerta no se venden boletos.", "Your QR is your entry: show it at the door and turn up the brightness. No tickets are sold at the door.") } as Bloque] : []),
  ];
  return <Marco es={es} code="USR-BOLETOS" t={E2("Boletos", "Tickets")} s={`${d.proximos.length}${E2(" PRÓXIMOS · ", " UPCOMING · ")}${d.pasados.length}${E2(" PASADOS", " PAST")}`} blocks={B} yo={yo} ui={ui} />;
}
