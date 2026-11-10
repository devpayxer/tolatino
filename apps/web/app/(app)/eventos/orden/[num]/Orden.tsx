"use client";
/* APP-EVT-ORDEN · móvil y desktop (prototipo odVals L1399 · «Orden · estado · recibo»). «¡Listo, vas!», los boletos con su QR REAL
   (TicketQR con la matriz del texto firmado por el servidor) y «MUÉSTRALO EN LA PUERTA · SUBE EL BRILLO», la mesa, los pasos Boletos
   listos · Día del evento · En la puerta · Después, y Calendario · Cómo llegar · Recibo («Cargos de servicio · Incluidos»). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { BoletoVista, OrdenVista } from "@/lib/boletos";
import { diaCorto, dinero, hora } from "@/lib/evt-comun";
import { useToast } from "../../comun";
import { bolDeshacer, bolElegirCambio } from "../../acciones-despues";
import type { CambioOrden } from "@/lib/evt-cambios";
import { fechaHora, HojaAyuda, HojaCancelar, HojaNombre, HojaTransferir } from "../../Despues";

type N = "Icon" | "Button" | "TicketQR" | "OrderTracker" | "ReceiptCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, TicketQR, OrderTracker, ReceiptCard } = UI as unknown as Record<N, ComponentType<any>>;
const caja = "rounded-[18px] border border-ink/[.07] bg-white";

export function estadoBoleto(b: Pick<BoletoVista, "estado" | "envio"> & Partial<Pick<BoletoVista, "entro" | "sigue">>, es: boolean): [string, string, string] {
  const E2 = (a: string, z: string) => (es ? a : z);
  // La etiqueta va sobre la cabecera oscura del boleto (TicketQR): colores con contraste sobre tinta.
  // 6d · Enviado (transferencia pendiente: el QR anterior quedó anulado y no hay otro hasta que lo reciban o lo deshagas) y transferido.
  return b.envio ? [E2(`ENVIADO · ${b.envio.a}`, `SENT · ${b.envio.a}`), "rgba(255,176,32,.2)", "var(--tl-pro)"]
    : b.estado === "replaced" ? [E2("TRANSFERIDO", "TRANSFERRED"), "rgba(255,255,255,.14)", "var(--tl-white)"]
    : b.estado === "valid" ? [E2("VÁLIDO", "VALID"), "rgba(0,229,196,.16)", "var(--tl-signal)"]
    // 6g · Usado con la hora de la puerta; un pase de varios días que todavía entra otro día sigue en verde.
    : b.estado === "used" && b.sigue ? [E2("VÁLIDO · OTRO DÍA", "VALID · ANOTHER DAY"), "rgba(0,229,196,.16)", "var(--tl-signal)"]
    : b.estado === "used" ? [b.entro ? E2(`USADO · ${b.entro}`, `USED · ${b.entro}`) : E2("USADO", "USED"), "rgba(255,255,255,.14)", "var(--tl-white)"]
    : b.estado === "refunded" ? [E2("DEVUELTO", "REFUNDED"), "rgba(255,255,255,.14)", "var(--tl-white)"]
    : [E2("ANULADO", "VOID"), "var(--tl-danger)", "var(--tl-white)"];
}
export function TarjetaBoleto({ b, es, cuando, ancho, onClick }: { b: BoletoVista; es: boolean; cuando: string; ancho?: number; onClick?: () => void }) {
  const [t, bg, fg] = estadoBoleto(b, es);
  const tipo = b.mesa ? `${b.tipo} · ${b.admits} ${es ? "entradas" : "entries"}` : b.vale ? `${b.tipo} · ${b.vale}` : b.tipo;
  return (
    <div data-boleto={b.code} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } }} className={onClick ? "cursor-pointer" : ""}>
      <TicketQR type={tipo} name={(b.nombre || (es ? "A tu nombre" : "In your name")).toUpperCase()} status={t} statusBg={bg} statusColor={fg} matrix={b.matriz} qrSize={b.matriz ? (ancho ? 168 : 200) : 96}
        qrLabel={es ? `Código QR del boleto ${b.code}` : `QR code for ticket ${b.code}`} used={(b.estado !== "valid" && !b.sigue) || !!b.envio} code={b.code} when={cuando} width={ancho} />
    </div>
  );
}

export function Orden({ o, es, cambio = null }: { o: OrdenVista; es: boolean; cambio?: CambioOrden | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [recibo, setRecibo] = useState(false);
  // 6d · Las hojas de después de comprar y su aviso.
  const [hoja, setHoja] = useState<"tr" | "ayuda" | "cx" | "nombre" | null>(null), { toast, el } = useToast();
  const listo = (m: string) => { setHoja(null); toast(m); router.refresh(); };
  const cancelada = o.estado === "cancelled", ev = o.evento;
  const cuando = ev.rango ? ev.rango.toUpperCase() : `${diaCorto(ev.dia, es).toUpperCase()} · ${hora(ev.h0)}`;
  const llegar = ev.lat != null && ev.lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${ev.lat},${ev.lng}` : ev.addr ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ev.addr)}` : null;
  const calendario = () => {
    const z = (s: string) => s.replace(/[-:]/g, "").replace(/\.\d+/, "");
    const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//To'Latino//Eventos//ES", "BEGIN:VEVENT", `UID:orden-${o.numero}@tolatino`, `DTSTART:${z(ev.start)}`, `DTEND:${z(ev.end)}`,
      `SUMMARY:${ev.title.replace(/[,;\n]/g, " ")}`, `LOCATION:${[ev.venue, ev.addr].filter(Boolean).join(" ").replace(/[,;\n]/g, " ")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" })); a.download = `boletos-${o.numero}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const vivos = o.boletos.filter((b) => b.estado === "valid" && !b.envio).length;
  const V = o.ventanas, libres = o.boletos.filter((b) => b.estado === "valid" && !b.envio), enviando = o.boletos.filter((b) => b.envio);
  const devuelto = o.devoluciones.reduce((s, d) => s + d.monto, 0), enCamino = o.devoluciones.some((d) => d.estado === "pending");
  // 6e · «Me quedo» / «Devolución total»: el servidor decide si todavía se puede y cuánto vuelve (el 100 %).
  const [elige, setElige] = useState(false);
  const elegir = async (x: "keep" | "refund") => { setElige(true); const r = await bolElegirCambio(o.numero, x).catch(() => null); setElige(false);
    toast(r?.ok ? (x === "keep" ? E2("Listo: tus boletos valen para la nueva fecha.", "Done: your tickets are valid for the new date.") : E2(`Listo: te devolvemos ${dinero(r.monto)} completo en 3–5 días hábiles.`, `Done: we refund ${dinero(r.monto)} in full in 3–5 business days.`)) : r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again."));
    router.refresh(); };
  const deshacer = async (code: string) => { const r = await bolDeshacer(code).catch(() => null); toast(r?.ok ? E2("Listo: el boleto vuelve a ti con un QR nuevo.", "Done: the ticket is yours again with a new QR.") : r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again.")); router.refresh(); };
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
      {devuelto > 0 && <div role="status" data-screen-label="Orden · devolución" className="mt-3 rounded-[14px] bg-signal/[.14] px-3.5 py-3 text-[12.5px] font-semibold leading-[1.5] text-open-text">
        {(() => { const de = (k: string) => o.devoluciones.filter((d) => d.por === k).reduce((x, d) => x + d.monto, 0), cx = de("buyer"), bz = de("business"), ec = de("event_cancelled"), em = de("event_moved"), ot = devuelto - cx - bz - ec - em;
          return [cx ? E2(`Cancelaste boletos: te devolvemos ${dinero(cx)}.`, `You cancelled tickets: we refund ${dinero(cx)}.`) : "", bz ? E2(`${ev.org} te devolvió ${dinero(bz)}.`, `${ev.org} refunded you ${dinero(bz)}.`) : "",
            ec ? E2(`El evento se canceló: te devolvemos ${dinero(ec)}, cargos incluidos.`, `The event was cancelled: we refund ${dinero(ec)}, fees included.`) : "", em ? E2(`Pediste la devolución total por el cambio de fecha: ${dinero(em)}.`, `You asked for a full refund for the date change: ${dinero(em)}.`) : "",
            ot ? E2(`To'Latino te devolvió ${dinero(ot)}.`, `To'Latino refunded you ${dinero(ot)}.`) : ""].filter(Boolean).join(" "); })()}
        {` ${enCamino ? E2("Va en camino a tu tarjeta (3–5 días hábiles).", "It is on its way to your card (3–5 business days).") : E2("Ya salió a tu tarjeta (3–5 días hábiles en verse).", "It went out to your card (3–5 business days to show).")}`}</div>}
      {cambio?.cancelada && <div role="alert" data-screen-label="Orden · cancelado por el organizador" className="mt-3 rounded-[14px] border border-danger/30 bg-danger/[.06] px-3.5 py-3">
        <div className="text-[13.5px] font-extrabold text-danger">{E2("Este evento fue cancelado por el organizador", "This event was cancelled by the organizer")}</div>
        <div className="mt-1 text-[12.5px] font-semibold leading-[1.5] text-ink/70">{`${cambio.cancelada.motivo ? `${cambio.cancelada.motivo}. ` : ""}${cambio.cancelada.monto ? E2(`Se te devuelve todo: ${dinero(cambio.cancelada.monto)} a tu tarjeta en 3–5 días hábiles. No tienes que hacer nada.`, `You get everything back: ${dinero(cambio.cancelada.monto)} to your card in 3–5 business days. Nothing to do on your end.`)
          : E2("Se te devuelve todo lo que pagaste a tu tarjeta en 3–5 días hábiles. No tienes que hacer nada.", "You get everything you paid back to your card in 3–5 business days. Nothing to do on your end.")}`}</div>
      </div>}
      {cambio?.movido && <div role="status" data-screen-label="Orden · cambió de fecha" className="mt-3 rounded-[14px] border border-pro/40 bg-pro/[.08] px-3.5 py-3">
        <div className="text-[13.5px] font-extrabold text-pro-ink">{E2("El evento cambió de fecha", "The event changed its date")}</div>
        <div className="mt-1 text-[12.5px] font-semibold leading-[1.5] text-ink/70">{E2(`Nueva fecha: ${cambio.movido.ahora} (antes ${cambio.movido.antes}). Tus boletos valen igual, o te devolvemos todo.`, `New date: ${cambio.movido.ahora} (was ${cambio.movido.antes}). Your tickets still count, or we refund everything.`)}</div>
        {cambio.movido.puede ? <div className="mt-2.5 flex flex-wrap gap-2">
          <Button variant="primary" size="md" disabled={elige} onClick={() => void elegir("keep")}>{E2("Me quedo con la nueva fecha", "Keep the new date")}</Button>
          <Button variant="secondary" size="md" disabled={elige} onClick={() => void elegir("refund")}>{E2("Devolución total", "Full refund")}</Button>
        </div> : <div className="mt-2 font-mono text-[10.5px] font-bold tracking-[0.12em] text-ink/55">{cambio.movido.eleccion === "keep" ? E2("ELEGISTE QUEDARTE CON LA NUEVA FECHA", "YOU KEPT THE NEW DATE") : cambio.movido.eleccion === "refund" ? E2("PEDISTE LA DEVOLUCIÓN TOTAL", "YOU ASKED FOR A FULL REFUND") : E2("YA EMPEZÓ: TUS BOLETOS VALEN PARA LA NUEVA FECHA", "IT STARTED: YOUR TICKETS ARE FOR THE NEW DATE")}</div>}
      </div>}
      {cambio && cambio.avisos.length > 0 && <div data-screen-label="Orden · avisos del organizador" className={`mt-3 px-3.5 py-3 ${caja}`}>
        <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("AVISOS DEL ORGANIZADOR", "NOTICES FROM THE ORGANIZER")}</div>
        {cambio.avisos.map((a, i) => <div key={i} className="mt-1.5 text-[12.5px] font-semibold leading-[1.5] text-ink/80">{a.t}</div>)}
      </div>}
      {cancelada && <div role="alert" className="mt-3 rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{E2("Tu banco no completó el cobro. No se cobró nada y estos boletos no valen. Puedes comprar otra vez.", "Your bank did not complete the charge. Nothing was charged and these tickets are not valid. You can buy again.")}</div>}
    </div>
  );
  const boletos = (d: boolean) => (cancelada ? null : (
    <div data-screen-label="Orden · boletos">
      <div className={`flex items-baseline justify-between gap-2 ${d ? "" : "px-4"}`}>
        <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{ev.pasado ? E2("TUS BOLETOS", "YOUR TICKETS") : E2("MUÉSTRALO EN LA PUERTA · SUBE EL BRILLO", "SHOW IT AT THE DOOR · TURN UP THE BRIGHTNESS")}</span>
        <span className="font-mono text-[10px] font-bold tracking-[0.1em] text-ink/45">{`${vivos}/${o.boletos.filter((b) => !b.envio).length}`}</span>
      </div>
      <div className={d ? "mt-3 grid grid-cols-2 gap-4" : "hs mt-3 flex gap-3 overflow-x-auto px-4 pb-1"}>
        {o.boletos.filter((b) => !b.envio).map((b) => <TarjetaBoleto key={b.code} b={b} es={es} cuando={cuando} ancho={d ? undefined : 250} onClick={() => router.push(`/cuenta/boletos/${b.code}`)} />)}
      </div>
      <div className={`mt-2.5 text-[11.5px] font-medium leading-[1.5] text-ink/55 ${d ? "" : "px-4"}`}>{E2("Tu QR es la entrada; no hace falta imprimir. Si no hay señal, el código funciona igual. Toca un boleto para verlo grande.", "Your QR is your entry; no need to print. Without signal, the code still works. Tap a ticket to see it big.")}</div>
      {enviando.length > 0 && (
        <div data-screen-label="Orden · enviados" className={`mt-3 flex flex-col gap-2 ${d ? "" : "px-4"}`}>
          <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("ENVIADOS · ESPERANDO QUE LOS RECIBAN", "SENT · WAITING TO BE RECEIVED")}</div>
          {enviando.map((b) => (
            <div key={b.code} data-enviado={b.code} className={`flex items-center gap-3 px-3.5 py-3 ${caja}`}>
              <span className="grid size-9 flex-none place-items-center rounded-[11px] bg-pro/[.16]"><Icon name="share" size={16} color="var(--tl-pro-ink)" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold">{`${b.tipo} · ${b.code}`}</span>
                <span className="mt-0.5 block text-[11.5px] font-medium text-ink/55">{E2(`A ${b.envio!.a} · lo puede recibir hasta ${fechaHora(b.envio!.hasta, ev.tz, true)} · EL QR ANTERIOR QUEDA ANULADO`, `To ${b.envio!.a} · they can receive it until ${fechaHora(b.envio!.hasta, ev.tz, false)} · THE OLD QR IS VOIDED`)}</span></span>
              <Button variant="secondary" size="md" onClick={() => void deshacer(b.code)}>{E2("Deshacer", "Undo")}</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  ));
  const acciones = (
    <div className="flex flex-wrap gap-2">
      {!cancelada && !ev.pasado && V.transferir && libres.length > 0 && <Button variant="secondary" icon="share" onClick={() => setHoja("tr")}>{E2("Transferir boletos", "Transfer tickets")}</Button>}
      {!cancelada && <Button variant="secondary" icon="help" onClick={() => setHoja("ayuda")}>{E2("Ayuda con esta orden", "Help with this order")}</Button>}
      <Button variant="secondary" onClick={calendario}>{E2("Calendario", "Calendar")}</Button>
      {llegar && <Button variant="secondary" onClick={() => window.open(llegar, "_blank", "noopener")}>{E2("Cómo llegar", "Directions")}</Button>}
      <Button variant="secondary" onClick={() => setRecibo(!recibo)}>{E2("Recibo", "Receipt")}</Button>
    </div>
  );
  // 6d · Hasta cuándo (Configuración): transferir y cancelar con devolución.
  const plazos = cancelada || ev.pasado ? null : (
    <div data-screen-label="Orden · política" className="text-[11.5px] font-medium leading-[1.55] text-ink/60">
      <span className="block font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("POLÍTICA DE ESTE EVENTO", "THIS EVENT’S POLICY")}</span>
      {E2(`Transfieres hasta ${fechaHora(V.transferirHasta, ev.tz, true)} (${V.horasTransferir} h antes). Cancelas con devolución, menos el cargo de servicio, hasta ${fechaHora(V.cancelarHasta, ev.tz, true)} (${V.horasCancelar} h antes). Si el evento se cancela, te devolvemos todo.`,
        `You can transfer until ${fechaHora(V.transferirHasta, ev.tz, false)} (${V.horasTransferir} h before). You can cancel with a refund, minus the service fee, until ${fechaHora(V.cancelarHasta, ev.tz, false)} (${V.horasCancelar} h before). If the event is cancelled, you get everything back.`)}
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
        <div className="flex flex-col gap-3 px-4">{!cancelada && <OrderTracker steps={pasos} />}{acciones}{plazos}{recibo && reciboB}
          <button type="button" onClick={() => router.push("/cuenta/boletos")} className="self-start text-[13px] font-bold text-action">{E2("Mis boletos", "My tickets")}</button></div>
      </div>
      <div data-screen-label="APP-EVT-ORDEN · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={() => router.push("/cuenta/boletos")} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{E2("Mis boletos", "My tickets")}</button>
        <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12">
          <div className="flex min-w-0 flex-col gap-5">{cab(true)}{boletos(true)}</div>
          <aside className={`sticky top-[96px] flex flex-col gap-3 p-4 ${caja}`}>{!cancelada && <OrderTracker steps={pasos} />}{acciones}{plazos}{reciboB}</aside>
        </div>
      </div>
      {hoja === "tr" && <HojaTransferir es={es} boletos={libres.map((b) => ({ code: b.code, tipo: b.tipo }))} horas={V.horasTransferir} hasta={V.transferirHasta} tz={ev.tz} onClose={() => setHoja(null)} onDone={listo} />}
      {hoja === "cx" && <HojaCancelar es={es} numero={o.numero} tz={ev.tz} onClose={() => setHoja(null)} onDone={listo} />}
      {hoja === "nombre" && <HojaNombre es={es} horas={V.horasTransferir} boletos={libres.map((b) => ({ code: b.code, tipo: b.tipo, nombre: b.nombre }))} onClose={() => setHoja(null)} onDone={listo} />}
      {hoja === "ayuda" && <HojaAyuda es={es} numero={o.numero} horas={V.horasTransferir} puedeCancelar={V.cancelar} devuelto={devuelto > 0 && !libres.length} onClose={() => setHoja(null)} onCancelar={() => setHoja("cx")}
        onNombre={V.transferir && libres.length ? () => setHoja("nombre") : null} toast={toast} />}
      {el}
    </div>
  );
}
