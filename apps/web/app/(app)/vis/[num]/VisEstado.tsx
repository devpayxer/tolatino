"use client";
/* APP-NEG-EDU-ESTADO con visit (neg-edu-flow.js citaVals L66–73): PENDIENTE («Esperando a …» · «Hoy no pagas nada.») → CONFIRMADA (el día,
   la hora y la dirección · «Llega 5 minutos antes. Ver es gratis.» / «Trae tu licencia de conducir.») → PASÓ (estrellas → reseña) · TE
   PROPONEN UN CAMBIO (Aceptar · No me sirve) · NO PUDO · SIN RESPUESTA · CANCELADA («Ya se rentó» / «Ya se vendió» / «La cancelaste tú»).
   Pasos Enviada · Confirmada · Pasó. Acciones: Cómo llegar · Calendario · Mensaje · Cancelar (gratis, un toque). La dirección exacta de la
   propiedad solo llega confirmada (la manda el servidor). Nada se cobra. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { bhphTexto, pagoTexto, puertaTexto, usd as usdA } from "@/lib/autos-comun";
import { ANIMALES_SERVICIO, EHO, cuotaTexto, mudarteTexto, usd } from "@/lib/inmuebles-comun";
import { LICENCIA, QUE, cuandoVis, diaVis, horaVis, soloLlamada, type Bi } from "@/lib/visitas-inm-comun";
import type { VisVista } from "@/lib/visitas-inm";
import { visAccion } from "./acciones";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const bi = (t: Bi, es: boolean) => (es ? t.es : t.en || t.es);
/* Vivienda justa (guardián viviendaJusta): toda propiedad que se pinta lleva el pie de igualdad de oportunidad y la nota de animales de servicio. */
function pie(es: boolean) {
  return (
    <div data-screen-label="Propiedad · vivienda justa" className="flex flex-col gap-1.5 rounded-2xl border border-ink/[.08] bg-white px-4 py-3">
      <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.1em] text-ink/60"><Icon name="home" size={14} color="rgba(11,14,18,.6)" />{bi(EHO, es).toUpperCase()}</div>
      <div className="text-pretty text-[12.5px] font-semibold leading-[1.5] text-ink/70">{bi(ANIMALES_SERVICIO, es)}</div>
    </div>
  );
}

export function VisEstado({ x, es }: { x: VisVista; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: Bi | null | undefined) => (b ? (es ? b.es : b.en || b.es) : "");
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null), [flash, setFlash] = useState<string | null>(null);
  const hacer = async (que: "cancelar" | "aceptar" | "nogracias", ok: string) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await visAccion(x.numero, que).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (r.ok) { setFlash(ok); setTimeout(() => setFlash(null), 3200); router.refresh(); } else setError(es ? r.msg.es : r.msg.en);
  };
  const B = x.negocio.nombre, Q = QUE[x.que], cp = x.copia, llamada = soloLlamada(x.que), prueba = x.que === "prueba", cuando = cuandoVis(x.dia, x.min, es);
  const noFue = x.estado === "done" && x.detalle === "noshow";
  const donde = llamada ? E2("Te llaman al teléfono de tu cuenta", "They call the phone on your account") : x.enCasa ? E2("En tu casa", "At your home") : x.direccion ?? (x.que === "visita" ? x.zona : B);
  const okS = prueba ? nm(LICENCIA) : x.que === "visita" ? E2("Llega 5 minutos antes. Ver es gratis.", "Arrive 5 minutes early. Viewing is free.") : llamada ? E2("Te llaman a esa hora.", "They call you at that time.") : E2("Llega 5 minutos antes.", "Arrive 5 minutes early.");
  const nada = E2("No se cobró nada.", "Nothing was charged.");
  const cx = x.detalle === "rentada" ? E2("Ya se rentó", "It was rented") : x.detalle === "vendida" ? E2("Ya se vendió", "It was sold") : x.detalle === "retirada" ? E2("Ya no está disponible", "No longer available")
    : x.cancelo === "negocio" ? E2(`${B} la canceló`, `${B} cancelled it`) : x.cancelo === "alt_no" ? E2("No te sirvió la otra hora", "The other time did not work") : x.cancelo === "alt_vencida" ? E2("No respondiste a la otra hora", "You did not answer the other time") : E2("La cancelaste tú", "You cancelled it");
  const G = "var(--tl-open-text)", grey = "rgba(11,14,18,.6)";
  const H: Record<string, [string, string, string, string, string, string]> = {
    pending: ["clock", "bg-action/10", "var(--tl-action)", E2("PENDIENTE", "PENDING"), `${E2("Esperando a ", "Waiting for ")}${B}`, E2("Hoy no pagas nada.", "You pay nothing today.")],
    confirmed: ["check", "bg-signal/[.18]", G, E2("CONFIRMADA", "CONFIRMED"), `${cuando}${llamada ? "" : ` · ${donde}`}`, okS],
    change_proposed: ["warning", "bg-pro/20", "var(--tl-pro-ink)", E2("TE PROPONEN UN CAMBIO", "THEY PROPOSE A CHANGE"), x.alt ? cuandoVis(x.alt.dia, x.alt.min, es) : "", E2("Esa hora ya no está libre. Si esta no te sirve, no pasa nada.", "That time is no longer free. If this one does not work, nothing happens.")],
    declined: ["warning", "bg-danger/10", "var(--tl-danger)", E2("NO PUDO", "COULD NOT"), E2(`No hay ${nm(Q.t).toLowerCase()} a esa hora`, `No ${nm(Q.t).toLowerCase()} at that time`), nada],
    expired: ["clock", "bg-ink/[.06]", grey, E2("SIN RESPUESTA", "NO REPLY"), E2("No contestaron a tiempo", "No reply in time"), nada],
    cancelled: ["close", "bg-ink/[.06]", grey, E2("CANCELADA", "CANCELLED"), cx, x.motivoNeg ? `«${x.motivoNeg}». ${nada}` : x.cancelo === "retirado" ? `${E2("No es culpa tuya.", "It is not your fault.")} ${nada}` : nada],
    done: noFue ? ["close", "bg-ink/[.06]", grey, E2("NO FUISTE", "MISSED"), E2(`${B} marcó que no fuiste`, `${B} marked that you did not go`), E2("No hay multa. Si es un error, escríbele por Mensaje.", "There is no penalty. If it is a mistake, send them a Message.")]
      : ["verified", "bg-signal/[.18]", G, E2("PASÓ", "HAPPENED"), nm(Q.paso), E2("Tu reseña sale verificada.", "Your review shows as verified.")],
  };
  const h = H[x.estado] ?? H.pending!;
  const pos = ({ pending: 0, change_proposed: 0, confirmed: 1, done: 3 } as Record<string, number>)[x.estado];
  const steps = pos == null || noFue ? [] : x.pasos.map((p, i) => ({ label: nm(p.t), time: "", state: i < pos ? "done" : i === pos ? "current" : "next" }));
  const totalL = x.que === "visita" ? (cp.moveIn != null ? usd(cp.moveIn) : cp.price != null ? usd(cp.price) : "") : prueba ? (cp.puerta ? usdA(cp.puerta.otd) : "") : cp.svcCents ? usd(cp.svcCents) : "";
  const totalK = x.que === "visita" ? (cp.moveIn != null ? E2("PARA MUDARTE", "TO MOVE IN") : E2("PRECIO", "PRICE")) : prueba ? E2("EN LA PUERTA", "OUT THE DOOR") : E2("PRECIO", "PRICE");
  const detalleTotal = x.que === "visita" ? (cp.moveIn != null ? mudarteTexto({ rent: cp.rent, dep: cp.dep, appFee: cp.appFee, fees: cp.fees, moveIn: cp.moveIn }, es) : cp.cuota != null ? cuotaTexto(cp.cuota, cp.downPct, es) : "")
    : prueba && cp.puerta ? [puertaTexto(cp.puerta, es), pagoTexto(cp.est, es), bhphTexto(cp.bhph, es)].filter(Boolean).join(". ") : "";
  const rows: [string, string][] = [[nm(x.que === "visita" ? { es: "PROPIEDAD", en: "PROPERTY" } : prueba ? { es: "CARRO", en: "CAR" } : { es: "SERVICIO", en: "SERVICE" }), nm(x.item)],
    ...(nm(x.sub) ? [["", nm(x.sub)] as [string, string]] : []),
    [llamada ? E2("TE LLAMAN", "THEY CALL YOU") : E2("DÍA", "DAY"), cuando],
    ...(llamada ? [] : [[E2("DÓNDE", "WHERE"), donde] as [string, string]]),
    ...(totalL && !llamada ? [[totalK, totalL] as [string, string]] : []),
    ...(prueba && x.licencia ? [[E2("LICENCIA", "LICENSE"), E2("La tienes vigente", "You have a valid one")] as [string, string]] : []),
    ...(x.trade ? [[E2("A CAMBIO", "TRADE-IN"), `${x.trade.year} ${x.trade.make} ${x.trade.model}${x.trade.miles != null ? ` · ${x.trade.miles.toLocaleString("en-US")} ${E2("millas", "miles")}` : ""}`] as [string, string]] : []),
    ...(x.nota ? [[E2("TU NOTA", "YOUR NOTE"), `«${x.nota}»`] as [string, string]] : [])];
  const vivo = ["pending", "change_proposed", "confirmed"].includes(x.estado);
  const conf = x.estado === "confirmed";
  const llegar = () => { if (x.direccion) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(x.direccion)}`, "_blank", "noopener"); };
  // «Calendario»: un .ics con la hora (hora local del negocio).
  const ics = () => {
    const p = (n: number) => String(n).padStart(2, "0"), ymd = x.dia.replace(/-/g, ""), f = (m: number) => `${ymd}T${p(Math.floor(m / 60))}${p(m % 60)}00`;
    const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//To'Latino//Visitas//ES", "BEGIN:VEVENT", `UID:${x.numero}@tolatino`, `DTSTART:${f(x.min)}`, `DTEND:${f(x.min + 30)}`,
      `SUMMARY:${nm(Q.t)} · ${B}`, `LOCATION:${(llamada ? "" : donde).replace(/[,;]/g, " ")}`, `DESCRIPTION:${nm(Q.t)} ${x.numero}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" })); a.download = `${x.numero}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const caja = "overflow-hidden rounded-[18px] border border-ink/[.07] bg-white", Kh = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
  return (
    <div data-screen-label="APP-NEG-VISITA-ESTADO" className="min-h-[100dvh] bg-paper pb-10">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver al lugar", "Back to the place")} onClick={() => router.push(`/n/${x.negocio.id}`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{E2(`Tu ${nm(Q.t).toLowerCase()}`, `Your ${nm(Q.t).toLowerCase()}`)}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${nm(Q.num)}${x.numero} · ${B}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div data-screen-label="Visita · estado" className="rounded-[20px] border border-ink/[.07] bg-white px-[18px] pb-5 pt-6 text-center">
          <div className={`mx-auto grid h-[60px] w-[60px] place-items-center rounded-[20px] ${h[1]}`}><Icon name={h[0]} size={26} color={h[2]} strokeWidth={2.2} /></div>
          <div className="mt-[13px] font-mono text-[9.5px] font-bold tracking-[0.14em]" style={{ color: h[2] }}>{h[3]}</div>
          <h1 className="m-0 mt-2 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.04em]">{h[4]}</h1>
          <p className="m-0 mt-[9px] text-pretty text-[13px] leading-[1.55] text-ink/[.62]">{h[5]}</p>
        </div>
        {x.estado === "change_proposed" && x.alt && (
          <div data-screen-label="Visita · otra hora" className="flex flex-col gap-2.5 rounded-[18px] border border-ink/[.07] bg-white p-4">
            <div className="text-[13.5px] font-bold">{E2(`Te proponen: ${diaVis(x.alt.dia, true)} a las ${horaVis(x.alt.min)}.`, `They propose: ${diaVis(x.alt.dia, false)} at ${horaVis(x.alt.min)}.`)}</div>
            <div className="flex gap-2.5"><div className="flex min-w-0 flex-1"><Button block icon="check" disabled={ocupado} onClick={() => void hacer("aceptar", E2("Listo: quedó confirmada", "Done: it is confirmed"))}>{E2("Aceptar", "Accept")}</Button></div>
              <div className="flex min-w-0 flex-1"><Button block variant="secondary" disabled={ocupado} onClick={() => void hacer("nogracias", E2("Listo: quedó cancelada", "Done: it is cancelled"))}>{E2("No me sirve", "Doesn’t work")}</Button></div></div>
          </div>)}
        {steps.length > 0 && <div className="grid"><OrderTracker steps={steps} /></div>}
        {x.estado === "done" && !noFue && !x.resena && (
          <div data-screen-label="Visita · calificar" className="flex flex-col items-center gap-2.5 rounded-[18px] border border-ink/[.07] bg-white p-4 text-center">
            <div className="font-display text-[17px] font-extrabold tracking-[-0.02em]">{prueba ? E2("¿Cómo te fue en la prueba?", "How was the test drive?") : x.que === "visita" ? E2("¿Cómo te fue en la visita?", "How was the visit?") : E2("¿Cómo te fue?", "How was it?")}</div>
            <div className="flex gap-1.5">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={E2(`${n} estrellas`, `${n} stars`)} onClick={() => router.push(`/n/${x.negocio.id}/resena?pedido=${x.numero}&e=${n}`)} className="grid h-10 w-10 place-items-center rounded-[12px] bg-ink/[.05]"><Icon name="star" size={20} color="var(--tl-pro)" /></button>)}</div>
            <div className="text-[12px] font-medium text-ink/55">{E2("Tu reseña sale verificada.", "Your review shows as verified.")}</div>
          </div>)}
        <div data-screen-label="Visita · lo que pediste" className={caja}>
          <div className="border-b border-ink/[.07] px-[15px] py-3"><span className={Kh}>{`${E2("TU ", "YOUR ")}${nm(Q.t).toUpperCase()}`}</span></div>
          <div className="px-[15px] py-0.5">{rows.map(([k, v], n) => <div key={`${k}${n}`} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v}</span></div>)}</div>
          {x.que === "visita" && !conf && x.estado !== "done" && <div className="border-t border-ink/[.07] px-[15px] py-3 text-[11.5px] font-medium leading-[1.5] text-ink/55">{E2("La dirección exacta te llega cuando confirman la visita.", "The exact address arrives once the visit is confirmed.")}</div>}
        </div>
        <div data-screen-label="Visita · tu dinero" className={caja}>
          <div className="border-b border-ink/[.07] px-[15px] py-3"><span className={Kh}>{E2("TU DINERO", "YOUR MONEY")}</span></div>
          <div className="px-[15px] py-0.5">
            <div className="flex justify-between gap-3 py-[11px]"><span className="text-[12.5px] font-semibold">{E2("Hoy", "Today")}</span><span className="text-right text-[12.5px] font-bold">{`$0 · ${nm(Q.gratis)}`}</span></div>
            {detalleTotal && <div className="flex justify-between gap-3 border-t border-ink/[.06] py-[11px]"><span className="flex-none text-[12.5px] font-semibold">{x.que === "visita" ? E2("Si la rentas o compras", "If you rent or buy") : E2("Si lo compras", "If you buy it")}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{detalleTotal}</span></div>}
            <div className="border-t border-ink/[.06] py-[11px] text-[11.5px] font-medium leading-[1.5] text-ink/55">{E2("Lo de arriba es lo que viste al pedir: queda guardado aunque cambie después.", "This is what you saw when you asked: it stays saved even if it changes later.")}</div>
          </div>
        </div>
        {x.que === "visita" && pie(es)}
        <div className="flex flex-col gap-2.5">
          {vivo && x.direccion && !x.enCasa && <Button variant="secondary" icon="pin" onClick={llegar}>{E2("Cómo llegar", "Directions")}</Button>}
          {conf && <Button variant="secondary" icon="calendar" onClick={ics}>{E2("Calendario", "Calendar")}</Button>}
          <Button variant="secondary" icon="bubble" onClick={() => router.push(`/cuenta/mensajes/${x.negocio.id}?op=${encodeURIComponent(x.numero)}`)}>{E2("Mensaje", "Message")}</Button>
          {vivo && <Button variant="ghost" icon="close" disabled={ocupado} onClick={() => void hacer("cancelar", E2("Listo: cancelada. No se cobró nada.", "Done: cancelled. Nothing was charged."))}>{E2(`Cancelar la ${nm(Q.t).toLowerCase()}`, `Cancel the ${nm(Q.t).toLowerCase()}`)}</Button>}
          {vivo && <div className="text-center text-[11.5px] font-medium text-ink/50">{E2("Cancelar es gratis, con un toque.", "Cancelling is free, with one tap.")}</div>}
          {x.estado === "done" && <div data-screen-label="Visita · ayuda" className="text-pretty text-center text-[11.5px] font-medium leading-[1.5] text-ink/50">{E2("¿Algo no fue como se publicó? Escríbele al lugar por Mensaje. La ayuda con revisión de To'Latino para visitas llega pronto.", "Something was not as posted? Send the place a Message. To'Latino review help for visits is coming soon.")}</div>}
          {!vivo && x.estado !== "done" && <Button variant="secondary" icon="calendar" onClick={() => router.push(x.cancelo === "retirado" ? `/n/${x.negocio.id}` : `/n/${x.negocio.id}/ver?item=${x.itemId}`)}>{x.cancelo === "retirado" ? E2("Ver otras opciones", "See other options") : E2("Pedir otra hora", "Request another time")}</Button>}
        </div>
      </div>
    </div>
  );
}
