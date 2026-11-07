"use client";
/* APP-NEG-FIESTA-CITA (neg-fiesta-flow.js citaVals L86–116): PENDIENTE · FECHA CONFIRMADA / VISITA CONFIRMADA · TE PROPONEN UN
   CAMBIO · NO PUDIERON (con sus fechas libres) · SIN RESPUESTA · CANCELADA · FIESTA TERMINADA. La línea fija «La fecha no es tuya
   hasta que te la confirmen.» va mientras no esté confirmada. Pasos, tu fiesta, tu dinero (depósito · resto el día del evento ·
   total) y las acciones: Llamar · Cancelar (con la regla que aplica) · Aceptar esta hora / No me sirve · Pedir esta. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { diaFiesta, EVT, LINEA_FIESTA } from "@/lib/fiestas-comun";
import type { FiestaVista } from "@/lib/fiestas-reservas";
import { fiestaAccion } from "./acciones";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const dinero = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const horaL = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;
const hora = (t: number | undefined) => (t ? new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function FiestaEstado({ x, es }: { x: FiestaVista; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), linea = nm(LINEA_FIESTA);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null), [flash, setFlash] = useState<string | null>(null), [confirmar, setConfirmar] = useState(false);
  const hacer = async (que: "cancelar" | "aceptar" | "nogracias", ok: string) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await fiestaAccion(x.numero, que).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false); setConfirmar(false);
    if (r.ok) { setFlash(ok); setTimeout(() => setFlash(null), 3200); router.refresh(); } else setError(es ? r.msg.es : r.msg.en);
  };
  const B = x.negocio.nombre, dia = cap(diaFiesta(x.ymd, es)), cuando = `${dia} · ${horaL(x.m)}`, dep = x.dep, vis = x.visita;
  const liberado = x.pago.st === "released", devuelto = x.pago.devuelto;
  const devT = dep ? (liberado ? E2(`Se liberó tu depósito de ${dinero(dep)}.`, `Your ${dinero(dep)} deposit was released.`) : devuelto ? E2(`Te devolvimos ${dinero(devuelto)}.`, `We refunded ${dinero(devuelto)}.`) : x.pago.st === "held" ? E2(`Se libera tu depósito de ${dinero(dep)}.`, `Your ${dinero(dep)} deposit is being released.`) : "") : "";
  const H: Record<string, [string, string, string, string, string, string]> = {
    pending: ["clock", "bg-action/10", "var(--tl-action)", E2("PENDIENTE", "PENDING"), `${E2("Esperando a ", "Waiting for ")}${B}`, `${linea} ${E2("Responden en menos de 24 h. Si no confirman, se libera tu depósito completo.", "They reply within 24 h. If they do not confirm, your deposit is fully released.")}`],
    confirmed: ["check", "bg-signal/[.18]", "var(--tl-open-text)", vis ? E2("VISITA CONFIRMADA", "TOUR CONFIRMED") : E2("FECHA CONFIRMADA", "DATE CONFIRMED"), cuando, vis ? E2("La visita no aparta la fecha.", "The tour does not hold the date.") : E2("La fecha es tuya. El acuerdo por escrito con lo que incluye está abajo.", "The date is yours. The written agreement with what is included is below.")],
    change_proposed: ["warning", "bg-pro/20", "var(--tl-pro-ink)", E2("TE PROPONEN UN CAMBIO", "A CHANGE IS PROPOSED"), x.alt ? `${dia} · ${horaL(x.alt.m)}` : dia, E2("La fecha está libre, pero a otra hora. Si no te sirve, se libera tu depósito.", "The date is free, but at another time. If it does not work, your deposit is released.")],
    declined: ["warning", "bg-danger/10", "var(--tl-danger)", E2("NO PUDIERON", "THEY COULD NOT"), x.detalle === "lleno" ? E2("El día se llenó con otra fiesta", "The day filled with another party") : E2("Esa fecha ya no está libre", "That date is no longer free"), `${devT} ${E2("Mira abajo sus fechas libres.", "See their free dates below.")}`.trim()],
    expired: ["clock", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("SIN RESPUESTA", "NO REPLY"), E2("No contestaron en 24 h", "No reply within 24 h"), `${devT} ${E2("Mira abajo sus fechas libres.", "See their free dates below.")}`.trim()],
    cancelled: ["close", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("CANCELADA", "CANCELLED"), x.motivoNeg ? E2(`${B} canceló la fecha`, `${B} cancelled the date`) : E2("Cancelaste la fecha", "You cancelled the date"),
      x.motivoNeg ? `«${x.motivoNeg}». ${devT || E2("Te devolvemos el depósito completo.", "Your deposit is refunded in full.")}` : x.perdio ? E2(`El depósito de ${dinero(dep)} se quedó con ${B}.`, `The ${dinero(dep)} deposit was kept by ${B}.`) : devT || E2("No se cobró nada.", "Nothing was charged.")],
    done: ["check", "bg-signal/[.18]", "var(--tl-open-text)", vis ? E2("VISITA HECHA", "TOUR DONE") : E2("FIESTA TERMINADA", "PARTY DONE"), cuando, vis ? E2("Si te gustó, pide la fecha.", "If you liked it, request the date.") : E2(`Pagaste ${dinero(x.acuerdo?.fee ?? x.tot)} en total, como dice el acuerdo.`, `You paid ${dinero(x.acuerdo?.fee ?? x.tot)} in total, per the agreement.`)],
  };
  const h = H[x.status] ?? H.pending!;
  const ev = (k: string) => x.linea.find((z) => z.kind === k)?.at;
  const pos = ({ pending: 0, change_proposed: 0, confirmed: x.pasada ? 2 : 1, done: 3 } as Record<string, number>)[x.status];
  const pasos = [[E2("Solicitud enviada", "Request sent"), hora(ev("sent"))], [vis ? E2("Visita confirmada", "Tour confirmed") : E2("Fecha confirmada", "Date confirmed"), hora(ev("accepted") ?? ev("alt_accepted"))], [E2("El día", "The day"), ""], [E2("Terminada", "Done"), hora(ev("done"))]];
  const steps = pos == null ? [] : pasos.map(([label, time], i) => ({ label, time, state: i < pos || x.status === "done" ? "done" : i === pos ? "current" : "next" }));
  const evL = EVT.find((z) => z[0] === x.e);
  const rows: [string, string][] = [[E2("SERVICIO", "SERVICE"), `${nm(x.svc)}${x.k === "unid" && x.qty > 1 ? ` × ${x.qty}` : x.horas ? ` · ${x.horas} h` : ""}`], [E2("FECHA", "DATE"), cuando],
    ...(vis ? [] : [[E2("EVENTO", "EVENT"), `${evL ? (es ? evL[1] : evL[2]) : "—"}${x.g ? ` · ${x.g}${E2(" invitados", " guests")}` : ""}`] as [string, string]]),
    [E2("DÓNDE", "WHERE"), x.donde && x.donde.k !== "local" ? `${x.donde.t}${x.donde.mi != null ? ` · ${x.donde.mi} mi` : ""}` : (x.negocio.direccion ?? B)], ...(x.nota ? [[E2("TU NOTA", "YOUR NOTE"), `«${x.nota}»`] as [string, string]] : [])];
  const resto = Math.max(0, x.tot - dep), cotiza = x.k === "cotiza";
  const depEstado = !dep ? "" : x.pago.st === "held" ? E2("RETENIDO", "HELD") : x.pago.st === "captured" ? E2("COBRADO", "CHARGED") : liberado ? E2("LIBERADO", "RELEASED") : devuelto ? E2("DEVUELTO", "REFUNDED") : x.perdio ? E2("SE QUEDÓ", "KEPT") : "";
  const vivo = ["pending", "change_proposed", "confirmed"].includes(x.status) && !(x.status === "confirmed" && x.pasada);
  const reglaCx = x.status !== "confirmed" ? E2("Aún no confirman: te liberamos todo.", "Not confirmed yet: we release everything.")
    : x.diasFaltan >= x.cancelDias ? E2(`Faltan ${x.diasFaltan} días (${x.cancelDias} o más): te devolvemos ${dinero(dep)}.`, `${x.diasFaltan} days left (${x.cancelDias} or more): we refund ${dinero(dep)}.`)
      : dep ? E2(`Faltan menos de ${x.cancelDias} días: el depósito de ${dinero(dep)} se queda con ${B}.`, `Less than ${x.cancelDias} days left: ${B} keeps the ${dinero(dep)} deposit.`) : E2("No pagaste depósito: no se cobra nada.", "You paid no deposit: nothing is charged.");
  const libresQ = (d: string) => router.push(`/n/${x.negocio.id}/fiesta?s=${x.svcId}&d=${d}`);
  return (
    <div data-screen-label="APP-NEG-FIESTA-CITA" className="min-h-[100dvh] bg-paper pb-10">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver al negocio", "Back to the business")} onClick={() => router.push(`/n/${x.negocio.id}`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{vis ? E2("Tu visita", "Your tour") : E2("Tu fiesta", "Your party")}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${E2("FIESTA #", "PARTY #")}${x.numero} · ${B}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div data-screen-label="Fiesta · estado" className="rounded-[20px] border border-ink/[.07] bg-white px-[18px] pb-5 pt-6 text-center">
          <div className={`mx-auto grid h-[60px] w-[60px] place-items-center rounded-[20px] ${h[1]}`}><Icon name={h[0]} size={26} color={h[2]} strokeWidth={2.2} /></div>
          <div className="mt-[13px] font-mono text-[9.5px] font-bold tracking-[0.14em]" style={{ color: h[2] }}>{h[3]}</div>
          <h1 className="m-0 mt-2 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.04em]">{h[4]}</h1>
          <p className="m-0 mt-[9px] text-pretty text-[13px] leading-[1.55] text-ink/[.62]">{h[5]}</p>
        </div>
        {x.status === "change_proposed" && x.alt && (
          <div data-screen-label="Fiesta · otra hora" className="flex flex-col gap-2.5 rounded-[18px] border border-ink/[.07] bg-white p-4">
            <div className="text-[13.5px] font-bold">{E2(`Pediste las ${horaL(x.m)}. Te proponen las ${horaL(x.alt.m)}.`, `You asked for ${horaL(x.m)}. They propose ${horaL(x.alt.m)}.`)}</div>
            <div className="flex gap-2.5"><div className="flex min-w-0 flex-1"><Button block icon="check" disabled={ocupado} onClick={() => void hacer("aceptar", E2("Listo: la fecha es tuya", "Done: the date is yours"))}>{E2("Aceptar esta hora", "Accept this time")}</Button></div>
              <div className="flex min-w-0 flex-1"><Button block variant="secondary" disabled={ocupado} onClick={() => void hacer("nogracias", E2("Listo: se liberó tu depósito", "Done: your deposit was released"))}>{E2("No me sirve", "Doesn’t work")}</Button></div></div>
          </div>)}
        {steps.length > 0 && <div className="grid"><OrderTracker steps={steps} /></div>}
        <div data-screen-label="Fiesta · tu fiesta" className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
          <div className="border-b border-ink/[.07] px-[15px] py-3"><span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{vis ? E2("TU VISITA", "YOUR TOUR") : E2("TU FIESTA", "YOUR PARTY")}</span></div>
          <div className="px-[15px] py-0.5">{rows.map(([k, v], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v}</span></div>)}</div>
        </div>
        {!vis && (
          <div data-screen-label="Fiesta · tu dinero" className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
            <div className="border-b border-ink/[.07] px-[15px] py-3"><span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("TU DINERO", "YOUR MONEY")}</span></div>
            <div className="px-[15px] py-0.5">
              <div className="flex justify-between gap-3 py-[11px]"><span className="text-[12.5px] font-semibold">{E2("Depósito", "Deposit")}{x.pago.l4 ? <span className="ml-1.5 font-mono text-[9.5px] text-ink/45">{`${(x.pago.marca ?? "").toUpperCase()} ·· ${x.pago.l4}`}</span> : null}</span><span className="text-[12.5px] font-bold">{dep ? `${dinero(dep)}${depEstado ? ` · ${depEstado}` : ""}` : E2("No pidió", "None")}</span></div>
              <div className="flex justify-between gap-3 border-t border-ink/[.06] py-[11px]"><span className="text-[12.5px] font-semibold">{E2("Resto, el día del evento", "Rest, on the event day")}</span><span className="text-[12.5px] font-bold">{["declined", "expired", "cancelled"].includes(x.status) ? E2("No se cobra", "Not charged") : cotiza ? E2("Según el acuerdo", "Per the agreement") : `${dinero(resto)} · ${E2("a ", "to ")}${B}`}</span></div>
              <div className="flex justify-between gap-3 border-t border-ink/[.06] py-3 text-[14px] font-extrabold"><span>TOTAL</span><span>{cotiza ? `${E2("Desde ", "From ")}${dinero(x.tot)}` : dinero(x.tot)}</span></div>
            </div>
            {x.acuerdo && (
              <details className="border-t border-ink/[.06] px-[15px] py-3"><summary className="cursor-pointer text-[12.5px] font-bold text-action">{E2(`El acuerdo por escrito · versión ${x.acuerdo.v}`, `The written agreement · version ${x.acuerdo.v}`)}</summary>
                <div className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-[1.55] text-ink/70">
                  <div>{E2(`Total ${dinero(x.acuerdo.fee)} · depósito ${dinero(x.acuerdo.credit)} (se descuenta) · resto ${dinero(x.acuerdo.total)} a ${B}, como lo acuerden.`, `Total ${dinero(x.acuerdo.fee)} · deposit ${dinero(x.acuerdo.credit)} (credited) · rest ${dinero(x.acuerdo.total)} to ${B}, as agreed.`)}</div>
                  {x.inc.length > 0 && <div>{E2("Incluye: ", "Includes: ")}{x.inc.map((z) => nm(z)).join(" · ")}. {E2("Lo que no está escrito, no está incluido.", "If it is not written, it is not included.")}</div>}
                  <div>{E2(`Cancelar: gratis hasta ${x.cancelDias} días antes; después, el depósito se queda con el negocio. Lo extra se pide antes y por escrito.`, `Cancel: free up to ${x.cancelDias} days before; after that, the business keeps the deposit. Extras are agreed beforehand and in writing.`)}</div>
                </div></details>)}
          </div>)}
        {["declined", "expired"].includes(x.status) && x.libres.length > 0 && (
          <div data-screen-label="Fiesta · fechas libres" className="flex flex-col gap-2 rounded-[18px] border border-ink/[.07] bg-white p-4">
            <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{`${E2("FECHAS LIBRES EN ", "FREE DATES AT ")}${B}`.toUpperCase()}</div>
            {x.libres.map((d) => (
              <div key={d} className="flex items-center justify-between gap-3 border-t border-ink/[.06] pt-2 first:border-0 first:pt-0">
                <span className="text-[13.5px] font-bold">{cap(diaFiesta(d, es))}</span>
                <Button variant="soft" size="md" onClick={() => libresQ(d)}>{E2("Pedir esta", "Request this one")}</Button>
              </div>))}
          </div>)}
        <div className="flex flex-col gap-2.5">
          {x.negocio.telefono && vivo && <Button variant="secondary" icon="phone" onClick={() => { location.href = `tel:${x.negocio.telefono}`; }}>{E2("Llamar", "Call")}</Button>}
          {vivo && <Button variant="ghost" icon="close" onClick={() => setConfirmar(true)}>{vis ? E2("Cancelar la visita", "Cancel the tour") : E2("Cancelar la fecha", "Cancel the date")}</Button>}
          {x.status === "done" && !vis && <Button variant="secondary" icon="party" onClick={() => router.push(`/n/${x.negocio.id}?tab=svc`)}>{E2("Otra fiesta", "Another party")}</Button>}
        </div>
      </div>
      {confirmar && (
        <div data-screen-label="Fiesta · cancelar" className="fixed inset-0 z-[70]">
          <div onClick={() => setConfirmar(false)} className="absolute inset-0 bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={E2("Cancelar", "Cancel")} className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-[26px] bg-white px-5 pb-6 pt-5 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[460px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
            <div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{vis ? E2("¿Cancelar la visita?", "Cancel the tour?") : E2("¿Cancelar la fecha?", "Cancel the date?")}</div>
            <p className="m-0 text-pretty text-[13.5px] leading-[1.55] text-ink/70">{reglaCx}</p>
            <div className="flex gap-2.5"><div className="flex min-w-0 flex-1"><Button block variant="secondary" onClick={() => setConfirmar(false)}>{E2("No, volver", "No, go back")}</Button></div>
              <div className="flex min-w-0 flex-1"><Button block disabled={ocupado} onClick={() => void hacer("cancelar", E2("Listo: cancelada", "Done: cancelled"))}>{E2("Sí, cancelar", "Yes, cancel")}</Button></div></div>
          </div>
        </div>)}
    </div>
  );
}
