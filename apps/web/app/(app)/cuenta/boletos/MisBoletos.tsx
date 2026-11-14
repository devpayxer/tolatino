"use client";
/* USR-BOLETOS (diseño «To'Latino Mi cuenta» USR-BOLETOS · Eventos msVals): Próximos · Pasados, una fila por orden con la fecha en caja,
   cuántos boletos, «CON QR» / «USADO» / «DEVUELTO»; tocar abre la orden con los QR. Sin boletos: ir a Eventos. */
import { useRouter } from "next/navigation";
import type { GrupoMis, MisBoletos as MB } from "@/lib/boletos";
import { diaCorto, hora, mesCorto } from "@/lib/evt-comun";
import { Marco, useCuentaUi, type Bloque, type Fila, type Yo } from "../Marco";
import { filasDe, guardarBoleto, recordarIdioma, registrarSWBoletos } from "@/lib/boletos-sin-conexion";
import { estadoBoleto } from "../../eventos/orden/[num]/Orden";
import { boletosParaGuardar } from "./acciones-wallet";
import { useEffect } from "react";
import { sinRed } from "@/lib/nativo/senal";

export function MisBoletos({ d, f, es, yo }: { d: MB; f: "proximos" | "pasados"; es: boolean; yo: Yo }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  useEffect(() => { registrarSWBoletos(); recordarIdioma(es); }, [es]);   // 6h · los boletos que abras con señal se ven sin señal
  // 9m · Y TODOS los próximos, sin abrirlos uno por uno (L896): con señal, cada QR vivo se guarda cifrado en el teléfono (como al abrirlo).
  useEffect(() => {
    if (!d.proximos.length || sinRed()) return;
    let vivo = true;
    void boletosParaGuardar(es).then(async (L) => {
      for (const { b, evento: ev } of L) {
        if (!vivo || !b.matriz) return;
        const [t, bg, fg] = estadoBoleto(b, es);
        const cuando = ev.rango ? ev.rango.toUpperCase() : `${diaCorto(ev.dia, es).toUpperCase()} · ${hora(ev.h0)}`;
        await guardarBoleto({ code: b.code, filas: filasDe(b.matriz), tipo: b.mesa ? `${b.tipo} · ${b.admits} ${es ? "entradas" : "entries"}` : b.vale ? `${b.tipo} · ${b.vale}` : b.tipo,
          nombre: (b.nombre || (es ? "A tu nombre" : "In your name")).toUpperCase(), estado: t, estadoBg: bg, estadoFg: fg, titulo: ev.title, cuando, lugar: ev.venue, dia: ev.dia }, b.code).catch(() => undefined);
      }
    }).catch(() => undefined);
    return () => { vivo = false; };
  }, [d.proximos.length, es]); // eslint-disable-line react-hooks/exhaustive-deps
  const fila = (g: GrupoMis, pasado: boolean): Fila => ({
    key: g.numero, t: g.title, s: `${diaCorto(g.dia, es).toUpperCase()} · ${hora(g.h0)} · ${g.venue}`.toUpperCase(),
    // 6d · Recibido de otra persona (o cortesía): se abre el boleto (la orden es de quien pagó). Enviados y transferidos se dicen.
    x: g.recibido ? `${g.vivos} ${g.vivos === 1 ? E2("boleto", "ticket") : E2("boletos", "tickets")} · ${E2("te lo mandaron", "sent to you")}`
      : `${g.n} ${g.n === 1 ? E2("boleto", "ticket") : E2("boletos", "tickets")}${g.mesa ? E2(" · con mesa", " · with table") : ""}${g.transferidos ? E2(` · ${g.transferidos} transferido${g.transferidos === 1 ? "" : "s"}`, ` · ${g.transferidos} transferred`) : ""}${g.enviando ? E2(` · ${g.enviando} en camino`, ` · ${g.enviando} on the way`) : ""} · ${E2("orden", "order")} ${g.numero}`,
    date: { dd: String(Number(g.dia.slice(8, 10))), mo: mesCorto(g.dia, es) }, dbg: g.dark ? "var(--tl-ink)" : undefined, dfg: g.dark ? "var(--tl-white)" : undefined,
    tag: g.vivos === 0 && g.enviando ? [E2("ENVIADO", "SENT"), "action"] : g.vivos === 0 ? (g.devueltos ? [E2("DEVUELTO", "REFUNDED"), "neutral"] : g.transferidos ? [E2("TRANSFERIDO", "TRANSFERRED"), "neutral"] : [E2("ANULADO", "VOID"), "danger"])
      : pasado ? [E2("PASADO", "PAST"), "neutral"] : g.recibido ? [E2("RECIBIDO · CON QR", "RECEIVED · WITH QR"), "signal"] : [E2("CON QR", "WITH QR"), "signal"],
    chev: true, on: () => router.push(g.recibido ? `/cuenta/boletos/${g.codigos[0]}` : `/eventos/orden/${g.numero}`),
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
