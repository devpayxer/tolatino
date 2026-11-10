"use client";
/* APP-EVT-ORDEN · móvil y desktop (prototipo odVals L1399 · «Orden · estado · recibo»). «¡Listo, vas!», los boletos con su QR REAL
   (TicketQR con la matriz del texto firmado por el servidor) y «MUÉSTRALO EN LA PUERTA · SUBE EL BRILLO», la mesa, los pasos Boletos
   listos · Día del evento · En la puerta · Después, y Calendario · Cómo llegar · Recibo («Cargos de servicio · Incluidos»). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { BoletoVista, OrdenVista } from "@/lib/boletos";
import { diaCorto, dinero, hora } from "@/lib/evt-comun";

type N = "Icon" | "Button" | "TicketQR" | "OrderTracker" | "ReceiptCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, TicketQR, OrderTracker, ReceiptCard } = UI as unknown as Record<N, ComponentType<any>>;
const caja = "rounded-[18px] border border-ink/[.07] bg-white";

export function estadoBoleto(b: Pick<BoletoVista, "estado">, es: boolean): [string, string, string] {
  const E2 = (a: string, z: string) => (es ? a : z);
  // La etiqueta va sobre la cabecera oscura del boleto (TicketQR): colores con contraste sobre tinta.
  return b.estado === "valid" ? [E2("VÁLIDO", "VALID"), "rgba(0,229,196,.16)", "var(--tl-signal)"]
    : b.estado === "used" ? [E2("USADO", "USED"), "rgba(255,255,255,.14)", "var(--tl-white)"]
    : b.estado === "refunded" ? [E2("DEVUELTO", "REFUNDED"), "rgba(255,255,255,.14)", "var(--tl-white)"]
    : b.estado === "replaced" ? [E2("REEMITIDO", "REISSUED"), "rgba(255,255,255,.14)", "var(--tl-white)"]
    : [E2("ANULADO", "VOID"), "var(--tl-danger)", "var(--tl-white)"];
}
export function TarjetaBoleto({ b, es, cuando, ancho, onClick }: { b: BoletoVista; es: boolean; cuando: string; ancho?: number; onClick?: () => void }) {
  const [t, bg, fg] = estadoBoleto(b, es);
  const tipo = b.mesa ? `${b.tipo} · ${b.admits} ${es ? "entradas" : "entries"}` : b.tipo;
  return (
    <div data-boleto={b.code} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } }} className={onClick ? "cursor-pointer" : ""}>
      <TicketQR type={tipo} name={(b.nombre || (es ? "A tu nombre" : "In your name")).toUpperCase()} status={t} statusBg={bg} statusColor={fg} matrix={b.matriz} qrSize={ancho ? 168 : 200}
        qrLabel={es ? `Código QR del boleto ${b.code}` : `QR code for ticket ${b.code}`} used={b.estado !== "valid"} code={b.code} when={cuando} width={ancho} />
    </div>
  );
}

export function Orden({ o, es }: { o: OrdenVista; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [recibo, setRecibo] = useState(false);
  const cancelada = o.estado === "cancelled", ev = o.evento;
  const cuando = `${diaCorto(ev.dia, es).toUpperCase()} · ${hora(ev.h0)}`;
  const llegar = ev.lat != null && ev.lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${ev.lat},${ev.lng}` : ev.addr ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ev.addr)}` : null;
  const calendario = () => {
    const z = (s: string) => s.replace(/[-:]/g, "").replace(/\.\d+/, "");
    const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//To'Latino//Eventos//ES", "BEGIN:VEVENT", `UID:orden-${o.numero}@tolatino`, `DTSTART:${z(ev.start)}`, `DTEND:${z(ev.end)}`,
      `SUMMARY:${ev.title.replace(/[,;\n]/g, " ")}`, `LOCATION:${[ev.venue, ev.addr].filter(Boolean).join(" ").replace(/[,;\n]/g, " ")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" })); a.download = `boletos-${o.numero}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const vivos = o.boletos.filter((b) => b.estado === "valid").length;
  const pasos = [
    { label: E2("Boletos listos", "Tickets ready"), time: o.numero, state: "done" },
    { label: E2("Día del evento", "Event day"), time: cuando, state: ev.pasado ? "done" : ev.hoy ? "current" : "next" },
    { label: E2("En la puerta", "At the door"), time: E2("Muestra tu QR", "Show your QR"), state: ev.pasado ? "done" : "next" },
    { label: E2("Después", "After"), time: E2("¿Cómo estuvo?", "How was it?"), state: ev.pasado ? "current" : "next" },
  ];
  const cab = (d: boolean) => (
    <div data-screen-label="Orden · estado" className={d ? "" : "px-4 pt-4"}>
      <div className="font-mono text-[10.5px] font-bold tracking-[0.16em] text-ink/50">{`${E2("ORDEN", "ORDER")} ${o.numero}`}</div>
      <h1 className="m-0 mt-1.5 font-display font-extrabold leading-[1.05] tracking-[-0.045em]" style={{ fontSize: d ? 32 : 26 }}>{cancelada ? E2("No se completó", "Not completed") : E2("¡Listo, vas!", "You are going!")}</h1>
      <div className="mt-2 text-[13.5px] font-semibold text-ink/70">{`${ev.title} · ${cuando} · ${ev.venue}`}</div>
      {cancelada && <div role="alert" className="mt-3 rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{E2("Tu banco no completó el cobro. No se cobró nada y estos boletos no valen. Puedes comprar otra vez.", "Your bank did not complete the charge. Nothing was charged and these tickets are not valid. You can buy again.")}</div>}
    </div>
  );
  const boletos = (d: boolean) => (cancelada ? null : (
    <div data-screen-label="Orden · boletos">
      <div className={`flex items-baseline justify-between gap-2 ${d ? "" : "px-4"}`}>
        <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{ev.pasado ? E2("TUS BOLETOS", "YOUR TICKETS") : E2("MUÉSTRALO EN LA PUERTA · SUBE EL BRILLO", "SHOW IT AT THE DOOR · TURN UP THE BRIGHTNESS")}</span>
        <span className="font-mono text-[10px] font-bold tracking-[0.1em] text-ink/45">{`${vivos}/${o.boletos.length}`}</span>
      </div>
      <div className={d ? "mt-3 grid grid-cols-2 gap-4" : "hs mt-3 flex gap-3 overflow-x-auto px-4 pb-1"}>
        {o.boletos.map((b) => <TarjetaBoleto key={b.code} b={b} es={es} cuando={cuando} ancho={d ? undefined : 250} onClick={() => router.push(`/cuenta/boletos/${b.code}`)} />)}
      </div>
      <div className={`mt-2.5 text-[11.5px] font-medium leading-[1.5] text-ink/55 ${d ? "" : "px-4"}`}>{E2("Tu QR es la entrada; no hace falta imprimir. Si no hay señal, el código funciona igual. Toca un boleto para verlo grande.", "Your QR is your entry; no need to print. Without signal, the code still works. Tap a ticket to see it big.")}</div>
    </div>
  ));
  const acciones = (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={calendario}>{E2("Calendario", "Calendar")}</Button>
      {llegar && <Button variant="secondary" onClick={() => window.open(llegar, "_blank", "noopener")}>{E2("Cómo llegar", "Directions")}</Button>}
      <Button variant="secondary" onClick={() => setRecibo(!recibo)}>{E2("Recibo", "Receipt")}</Button>
    </div>
  );
  const reciboB = (
    <div data-screen-label="Orden · recibo">
      <ReceiptCard business={ev.org} address={ev.venue} status={cancelada ? E2("NO COBRADO", "NOT CHARGED") : o.devuelto ? E2("DEVUELTO", "REFUNDED") : E2("PAGADO", "PAID")} statusTone={cancelada ? "danger" : "signal"}
        meta={[{ k: E2("ORDEN", "ORDER"), v: o.numero }, { k: E2("FECHA", "DATE"), v: cuando }, ...(o.tarjeta ? [{ k: E2("TARJETA", "CARD"), v: o.tarjeta }] : [])]}
        lines={o.lineas.map((l) => ({ q: l.q, name: l.n, price: dinero(l.unit * l.q) }))}
        rows={[...(o.descuento ? [{ l: E2("Código de descuento", "Discount code"), v: `−${dinero(o.descuento)}` }] : []), { l: E2("Cargos de servicio", "Service fees"), v: E2("Incluidos", "Included") },
          ...(o.devuelto ? [{ l: E2("Devuelto", "Refunded"), v: `−${dinero(o.devuelto)}`, fg: "var(--tl-open-text)" }] : [])]}
        events={cancelada ? [] : [{ l: E2("Cobrado", "Charged"), sub: o.tarjeta ?? undefined, v: dinero(o.total), t: new Date(o.at).toLocaleString(es ? "es-US" : "en-US", { timeZone: ev.tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) },
          ...(o.devuelto ? [{ l: E2("Devuelto", "Refunded"), v: `−${dinero(o.devuelto)}`, fg: "var(--tl-open-text)", t: "" }] : [])]}
        total={dinero(o.total)} netLabel={cancelada ? E2("NO SE COBRÓ", "NOT CHARGED") : E2("TOTAL PAGADO", "TOTAL PAID")} net={dinero(cancelada ? 0 : o.total - o.devuelto)}
        foot={E2("El precio que pagaste ya incluye los cargos: nada más en la puerta.", "The price you paid already includes fees: nothing extra at the door.")} />
    </div>
  );
  return (
    <div data-pantalla="APP-EVT-ORDEN" className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-EVT-ORDEN · móvil" className="flex flex-col gap-4 pb-10 lg:hidden">
        {cab(false)}{boletos(false)}
        <div className="flex flex-col gap-3 px-4">{!cancelada && <OrderTracker steps={pasos} />}{acciones}{recibo && reciboB}
          <button type="button" onClick={() => router.push("/cuenta/boletos")} className="self-start text-[13px] font-bold text-action">{E2("Mis boletos", "My tickets")}</button></div>
      </div>
      <div data-screen-label="APP-EVT-ORDEN · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={() => router.push("/cuenta/boletos")} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{E2("Mis boletos", "My tickets")}</button>
        <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12">
          <div className="flex min-w-0 flex-col gap-5">{cab(true)}{boletos(true)}</div>
          <aside className={`sticky top-[96px] flex flex-col gap-3 p-4 ${caja}`}>{!cancelada && <OrderTracker steps={pasos} />}{acciones}{reciboB}</aside>
        </div>
      </div>
    </div>
  );
}
