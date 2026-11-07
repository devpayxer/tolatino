"use client";
/* APP-NEG-TRANS-ESTADO (neg-trans-flow.js citaVals L56–74): PENDIENTE · CONFIRMADO · OTRA SALIDA PROPUESTA · NO PUEDEN · SIN RESPUESTA ·
   EN CAMINO · LLEGASTE · CANCELADO. La línea fija «El precio del viaje es cerrado antes de salir.» Pasos (Enviado · Confirmado · En
   camino · Llegó), tu viaje, tu dinero (retenido / cobrado / liberado / devuelto / la mitad) y las acciones: Cómo llegar · Llamar ·
   Cancelar (con la regla de 24 h) · Aceptar esta salida / No me sirve. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { LINEA_TRANS } from "@/lib/transporte-comun";
import type { ViajeVista } from "@/lib/viajes";
import { viajeAccion } from "./acciones";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const dinero = (c: number) => { const d = c / 100; return `$${d % 1 ? d.toFixed(2) : Math.round(d).toLocaleString("en-US")}`; };
const horaL = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;
const hora = (t: number | undefined) => (t ? new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "");
const DS = { es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const MS = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };

export function ViajeEstado({ x, es }: { x: ViajeVista; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), linea = nm(LINEA_TRANS);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null), [flash, setFlash] = useState<string | null>(null), [confirmar, setConfirmar] = useState(false);
  const hacer = async (que: "cancelar" | "aceptar" | "nogracias", ok: string) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await viajeAccion(x.numero, que).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false); setConfirmar(false);
    if (r.ok) { setFlash(ok); setTimeout(() => setFlash(null), 3200); router.refresh(); } else setError(es ? r.msg.es : r.msg.en);
  };
  const dL = (ymd: string) => { const d = new Date(`${ymd}T12:00:00Z`); return es ? `${DS.es[d.getUTCDay()]} ${d.getUTCDate()} ${MS.es[d.getUTCMonth()]}` : `${DS.en[d.getUTCDay()]} ${MS.en[d.getUTCMonth()]} ${d.getUTCDate()}`; };
  const B = x.negocio.nombre, cuando = `${dL(x.ymd)} · ${horaL(x.m)}`, st = x.pago.st, liberado = st === "released", dev = x.pago.devuelto;
  const devT = liberado ? E2(`Liberamos los ${dinero(x.tot)} retenidos.`, `We released the ${dinero(x.tot)} hold.`) : dev ? E2(`Te devolvimos ${dinero(dev)}.`, `We refunded ${dinero(dev)}.`) : "";
  const camino = x.status === "confirmed" && x.detalle === "camino";
  const H: Record<string, [string, string, string, string, string, string]> = {
    pending: ["clock", "bg-action/10", "var(--tl-action)", E2("PENDIENTE", "PENDING"), `${E2("Esperando a ", "Waiting for ")}${B}`, `${x.tot && st === "held" ? E2(`Se retuvieron ${dinero(x.tot)}. Si no confirman, se liberan.`, `${dinero(x.tot)} is held. If they do not confirm, it is released.`) : E2("Si no confirman, no se cobra nada.", "If they do not confirm, nothing is charged.")} ${linea}`],
    confirmed: camino ? ["truck", "bg-signal/[.18]", "var(--tl-open-text)", E2("EN CAMINO", "ON THE WAY"), E2("Ya salió", "It left"), x.to ? E2(`Va a ${nm(x.to)}.`, `Going to ${nm(x.to)}.`) : ""]
      : ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("CONFIRMADO", "CONFIRMED"), x.tarde != null ? E2(`${dL(x.ymd)} · sale a las ${horaL(x.tarde)}`, `${dL(x.ymd)} · leaves at ${horaL(x.tarde)}`) : cuando,
        `${st === "captured" ? E2(`Cobrado ${dinero(x.tot)} · precio cerrado.`, `${dinero(x.tot)} charged · fixed price.`) : ""}${x.tarde != null ? E2(" La salida va tarde.", " The departure is late.") : ""}`.trim()],
    change_proposed: ["warning", "bg-pro/20", "var(--tl-pro-ink)", E2("OTRA SALIDA PROPUESTA", "ANOTHER DEPARTURE PROPOSED"), x.alt ? `${dL(x.alt.ymd)} · ${horaL(x.alt.m)}` : "", E2("Si no te sirve, se libera lo retenido.", "If it does not work, the hold is released.")],
    declined: ["warning", "bg-danger/10", "var(--tl-danger)", E2("NO PUEDEN", "THEY CAN'T"), E2("No hay cupo", "No room"), devT || E2("No se cobró nada.", "Nothing was charged.")],
    expired: ["clock", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("SIN RESPUESTA", "NO REPLY"), E2("No contestaron a tiempo", "No reply in time"), devT || E2("No se cobró nada.", "Nothing was charged.")],
    cancelled: ["close", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("CANCELADO", "CANCELLED"), x.motivoNeg ? E2(`${B} canceló la salida`, `${B} cancelled the departure`) : E2("Cancelaste el viaje", "You cancelled the trip"),
      x.motivoNeg ? `«${x.motivoNeg}». ${devT || E2("Te devolvemos todo.", "You get everything back.")}` : x.cobroMitad ? E2(`Se cobró la mitad: ${dinero(x.cobroMitad)}. ${devT}`, `Half was charged: ${dinero(x.cobroMitad)}. ${devT}`) : devT || E2("No se cobró nada.", "Nothing was charged.")],
    done: ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("LLEGASTE", "YOU ARRIVED"), cuando, E2(`Pagaste ${dinero(x.tot)}.`, `You paid ${dinero(x.tot)}.`)],
  };
  const h = H[x.status] ?? H.pending!;
  const ev = (k: string) => x.linea.find((z) => z.kind === k)?.at;
  const pos = ({ pending: 0, change_proposed: 0, confirmed: camino ? 2 : 1, done: 3 } as Record<string, number>)[x.status];
  const steps = pos == null ? [] : [[E2("Enviado", "Sent"), hora(ev("sent"))], [E2("Confirmado", "Confirmed"), hora(ev("accepted") ?? ev("alt_accepted"))], [E2("En camino", "On the way"), hora(ev("run_departed"))], [E2("Llegó", "Arrived"), hora(ev("run_arrived"))]]
    .map(([label, time], i) => ({ label, time, state: i < pos || x.status === "done" ? "done" : i === pos ? "current" : "next" }));
  const pas = x.k === "asiento" ? `${x.adults} ${x.adults === 1 ? E2("adulto", "adult") : E2("adultos", "adults")}${x.kids ? ` + ${x.kids} ${x.kids === 1 ? E2("niño", "child") : E2("niños", "children")}` : ""}${x.childSeat ? E2(" · asiento de niño", " · child seat") : ""}` : `${x.adults} ${x.adults === 1 ? E2("persona", "person") : E2("personas", "people")}`;
  const rows: [string, string][] = [[E2("SERVICIO", "SERVICE"), nm(x.svc)], [E2("CUÁNDO", "WHEN"), cuando], [E2("PASAJEROS", "PASSENGERS"), pas],
    ...(x.k === "asiento" ? [[E2("MALETAS", "BAGS"), `${E2(`${x.bagsIncl} incluidas por persona`, `${x.bagsIncl} included per person`)}${x.bagsExtra ? E2(` + ${x.bagsExtra} extra`, ` + ${x.bagsExtra} extra`) : ""}`] as [string, string]] : []),
    ...(x.from ? [[E2("SALE DE", "LEAVES FROM"), nm(x.from)] as [string, string]] : []), ...(x.pickup ? [[E2("RECOGIDA", "PICKUP"), x.pickup] as [string, string]] : []), ...(x.to ? [[E2("VA A", "GOES TO"), nm(x.to)] as [string, string]] : [])];
  const estDinero = st === "held" ? E2("RETENIDO", "HELD") : st === "captured" ? E2("COBRADO", "CHARGED") : liberado ? E2("LIBERADO", "RELEASED") : st === "refunded" ? E2("DEVUELTO", "REFUNDED") : st === "partially_refunded" ? E2("LA MITAD", "HALF") : E2("EN EL NEGOCIO", "AT THE BUSINESS");
  const vivo = ["pending", "change_proposed", "confirmed"].includes(x.status) && !camino;
  const regla = x.status !== "confirmed" ? E2("Aún no confirman: liberamos todo.", "Not confirmed yet: we release everything.")
    : x.horasFaltan >= 24 ? E2(`Faltan más de 24 horas: te devolvemos ${dinero(x.tot)}.`, `More than 24 hours left: we refund ${dinero(x.tot)}.`) : E2(`Faltan menos de 24 horas: se cobra la mitad (${dinero(Math.floor(x.tot / 2))}) y te devolvemos el resto.`, `Less than 24 hours left: half is charged (${dinero(Math.floor(x.tot / 2))}) and the rest is refunded.`);
  const llegar = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(x.from ? nm(x.from) : x.negocio.direccion ?? B)}`, "_blank", "noopener");
  return (
    <div data-screen-label="APP-NEG-TRANS-ESTADO" className="min-h-[100dvh] bg-paper pb-10">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver al negocio", "Back to the business")} onClick={() => router.push(`/n/${x.negocio.id}`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{E2("Tu viaje", "Your trip")}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${E2("VIAJE #", "TRIP #")}${x.numero} · ${B}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div data-screen-label="Viaje · estado" className="rounded-[20px] border border-ink/[.07] bg-white px-[18px] pb-5 pt-6 text-center">
          <div className={`mx-auto grid h-[60px] w-[60px] place-items-center rounded-[20px] ${h[1]}`}><Icon name={h[0]} size={26} color={h[2]} strokeWidth={2.2} /></div>
          <div className="mt-[13px] font-mono text-[9.5px] font-bold tracking-[0.14em]" style={{ color: h[2] }}>{h[3]}</div>
          <h1 className="m-0 mt-2 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.04em]">{h[4]}</h1>
          {h[5] && <p className="m-0 mt-[9px] text-pretty text-[13px] leading-[1.55] text-ink/[.62]">{h[5]}</p>}
        </div>
        {x.status === "change_proposed" && x.alt && (
          <div data-screen-label="Viaje · otra salida" className="flex flex-col gap-2.5 rounded-[18px] border border-ink/[.07] bg-white p-4">
            <div className="text-[13.5px] font-bold">{E2(`Pediste ${cuando}. Te proponen ${dL(x.alt.ymd)} a las ${horaL(x.alt.m)}.`, `You asked for ${cuando}. They propose ${dL(x.alt.ymd)} at ${horaL(x.alt.m)}.`)}</div>
            <div className="flex gap-2.5"><div className="flex min-w-0 flex-1"><Button block icon="check" disabled={ocupado} onClick={() => void hacer("aceptar", E2("Listo: tu viaje quedó confirmado", "Done: your trip is confirmed"))}>{E2("Aceptar esta salida", "Accept this departure")}</Button></div>
              <div className="flex min-w-0 flex-1"><Button block variant="secondary" disabled={ocupado} onClick={() => void hacer("nogracias", E2("Listo: liberamos lo retenido", "Done: we released the hold"))}>{E2("No me sirve", "Doesn’t work")}</Button></div></div>
          </div>)}
        {steps.length > 0 && <div className="grid"><OrderTracker steps={steps} /></div>}
        <div data-screen-label="Viaje · tu viaje" className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
          <div className="border-b border-ink/[.07] px-[15px] py-3"><span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("TU VIAJE", "YOUR TRIP")}</span></div>
          <div className="px-[15px] py-0.5">{rows.map(([k, v], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v}</span></div>)}</div>
        </div>
        <div data-screen-label="Viaje · tu dinero" className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
          <div className="border-b border-ink/[.07] px-[15px] py-3"><span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("TU DINERO", "YOUR MONEY")}</span></div>
          <div className="px-[15px] py-0.5">
            <div className="flex justify-between gap-3 py-[11px]"><span className="text-[12.5px] font-semibold">{E2("Precio cerrado", "Fixed price")}{x.pago.l4 ? <span className="ml-1.5 font-mono text-[9.5px] text-ink/45">{`${(x.pago.marca ?? "").toUpperCase()} ·· ${x.pago.l4}`}</span> : null}</span><span className="text-[12.5px] font-bold">{`${dinero(x.tot)} · ${estDinero}`}</span></div>
            {x.inc.length > 0 && <div className="border-t border-ink/[.06] py-[11px] text-[12px] font-medium leading-[1.5] text-ink/65">{E2("Incluye: ", "Includes: ")}{x.inc.map((z) => nm(z)).join(" · ")}. {E2("Nada se agrega al llegar.", "Nothing is added on arrival.")}</div>}
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {vivo && (x.from || x.negocio.direccion) && x.k === "asiento" && <Button variant="secondary" icon="pin" onClick={llegar}>{E2("Cómo llegar a la salida", "Directions to the departure")}</Button>}
          {x.negocio.telefono && vivo && <Button variant="secondary" icon="phone" onClick={() => { location.href = `tel:${x.negocio.telefono}`; }}>{E2("Llamar", "Call")}</Button>}
          {vivo && <Button variant="ghost" icon="close" onClick={() => setConfirmar(true)}>{E2("Cancelar el viaje", "Cancel the trip")}</Button>}
          {["declined", "expired", "cancelled"].includes(x.status) && <Button variant="secondary" icon="calendar" onClick={() => router.push(`/n/${x.negocio.id}?tab=svc`)}>{E2("Reservar otra salida", "Book another departure")}</Button>}
        </div>
      </div>
      {confirmar && (
        <div data-screen-label="Viaje · cancelar" className="fixed inset-0 z-[70]">
          <div onClick={() => setConfirmar(false)} className="absolute inset-0 bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={E2("Cancelar", "Cancel")} className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-[26px] bg-white px-5 pb-6 pt-5 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[460px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
            <div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{E2("¿Cancelar el viaje?", "Cancel the trip?")}</div>
            <p className="m-0 text-pretty text-[13.5px] leading-[1.55] text-ink/70">{regla}</p>
            <div className="flex gap-2.5"><div className="flex min-w-0 flex-1"><Button block variant="secondary" onClick={() => setConfirmar(false)}>{E2("No, volver", "No, go back")}</Button></div>
              <div className="flex min-w-0 flex-1"><Button block disabled={ocupado} onClick={() => void hacer("cancelar", E2("Listo: cancelado", "Done: cancelled"))}>{E2("Sí, cancelar", "Yes, cancel")}</Button></div></div>
          </div>
        </div>)}
    </div>
  );
}
