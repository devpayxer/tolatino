"use client";
/* APP-NEG-NOCHE-ESTADO (neg-noche-flow.js citaVals L83–102): ESTÁS EN LA LISTA · PENDIENTE · MESA CONFIRMADA · TE PROPONEN UN CAMBIO ·
   NO HAY MESA · SIN RESPUESTA · BUENA NOCHE · NO LLEGASTE · NO ENTRASTE: SIN IDENTIFICACIÓN · CANCELADA. El código de la puerta solo
   mientras está viva (y la mesa, ya confirmada). Pasos, tu noche (lo de la puerta como se copió al enviar), tu dinero (depósito ·
   mínimo «es consumo») y las acciones: Cómo llegar · Llamar · Salir de la lista / Cancelar (con la regla de esa noche a la hora real). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { diaNoche, hNoche, LINEA_NOCHE, usdN } from "@/lib/noche-comun";
import type { NocheVista } from "@/lib/noche-reservas";
import { nocheAccion } from "./acciones";
import { abrirComoLlegar } from "@/lib/como-llegar";
import { dosIdiomas } from "@/lib/dos-idiomas";
import { cobradoVisto, pideAlCancelar, pideSoltarSi, quedaVisto } from "@/lib/devolucion-cancelar";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const hora = (t: string | undefined) => (t ? new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "");
const OCC = (es: unknown): Record<string, string> => { const E2 = (a: string, b: string) => dosIdiomas(es, a, b); return { bailar: E2("A bailar", "Dancing"), cumple: E2("Cumpleaños", "Birthday"), despedida: E2("Despedida", "Farewell"), celebra: E2("Celebración", "Celebration") }; };

export function NocheEstado({ x, es }: { x: NocheVista; es: boolean }) {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null), [flash, setFlash] = useState<string | null>(null), [confirmar, setConfirmar] = useState(false);
  const hacer = async (que: "cancelar" | "aceptar" | "nogracias", ok: string) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await nocheAccion(x.numero, que).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false); setConfirmar(false);
    // 9v (quinta tanda) · «No me sirve» con la retención que la pasarela no soltó todavía (retenida): nunca «se liberó».
    if (r.ok) { setFlash("retenida" in r && r.retenida ? E2("Listo. La retención todavía no se soltó de tu tarjeta: la seguimos soltando sola.", "Done. The hold has not come off your card yet: we keep releasing it automatically.") : ok); setTimeout(() => setFlash(null), 3200); router.refresh(); } else setError(es ? r.msg.es : r.msg.en);
  };
  // 9n-3 · El plazo sale de la reserva (el que eligió el local o el de Configuración): ya no dice «1 hora» para todos.
  const espL = (m: number | null, es: boolean) => (m == null ? (es ? "un rato" : "a while") : m >= 60 ? (es ? `${Math.ceil(m / 60)} h` : `${Math.ceil(m / 60)} h`) : `${m} min`);
  const B = x.negocio.nombre, lista = x.k === "lista", dep = x.dep, linea = nm(LINEA_NOCHE);
  const noche = x.hoy ? E2("Esta noche", "Tonight") : E2(`El ${diaNoche(x.dow, true)}`, diaNoche(x.dow, false)), cuando = `${noche} · ${hNoche(x.llega)}`;
  const liberado = x.pago.st === "released", devuelto = x.pago.devuelto;
  // 9v · Lo que no está hecho se dice como está (cobros › devolucionesDe): en camino o que no salió; nunca «te devolvemos todo» sin mirar.
  const pendT = [x.devolucion.camino ? E2(`Te devolvemos ${usdN(x.devolucion.camino)}: va en camino a tu tarjeta.`, `We are refunding ${usdN(x.devolucion.camino)}: it is on its way to your card.`) : "",
    x.devolucion.fallida ? E2(`La devolución de ${usdN(x.devolucion.fallida)} no salió: escríbenos en Soporte y lo resolvemos.`, `The ${usdN(x.devolucion.fallida)} refund did not go through: write to us in Support and we will sort it out.`) : ""].filter(Boolean).join(" ");
  const devT0 = dep ? (liberado ? E2(`Se liberó tu depósito de ${usdN(dep)}.`, `Your ${usdN(dep)} deposit was released.`) : devuelto ? E2(`Te devolvimos ${usdN(devuelto)} · 3 a 5 días.`, `We refunded ${usdN(devuelto)} · 3 to 5 days.`) : x.pago.st === "held" ? E2(`No se cobró nada, pero la retención de ${usdN(x.pago.monto)} todavía no se soltó de tu tarjeta: la seguimos soltando sola.`, `Nothing was charged, but the ${usdN(x.pago.monto)} hold has not come off your card yet: we keep releasing it automatically.`) : "") : E2("No se cobró nada.", "Nothing was charged.");
  const devT = [devT0, pendT].filter(Boolean).join(" "), cobrado = cobradoVisto(x.pago), queda = quedaVisto(x.pago), retenido = dep > 0 && x.pago.st === "held";
  // 25 nov (regla 13 del guardián devueltoSoloSiSalio) · Lo que se va a INTENTAR, dicho como un intento y según el cobro en la base (lib/devolucion-cancelar.ts):
  // al cancelar a tiempo, lo retenido se pide soltar y de lo cobrado se pide la devolución de lo que queda (devolverAlCancelar); si no confirman o la otra hora no
  // te sirve, solo se suelta la retención (soltarRetencion). Nunca «te devolvemos el depósito» antes de actuar: lo que pasó lo dice devT después.
  const pideCx = nm(pideAlCancelar(x.pago, usdN)), sinCargo = E2("No se cobra nada.", "Nothing is charged.");
  // Lo que se queda el local (tarde o sin llegar) es lo que queda de lo COBRADO; si solo estaba retenido, todavía no se cobró; si ya se devolvió o se
  // soltó, lo que pasó (devT); nada de eso, «No se cobró nada».
  const quedoLocal = cobrado && queda > 0 ? (queda === dep ? E2(`El depósito de ${usdN(queda)} se quedó con el local.`, `The venue kept the ${usdN(queda)} deposit.`) : E2(`Lo que quedaba del depósito (${usdN(queda)}) se quedó con el local.`, `The venue kept what was left of the deposit (${usdN(queda)}).`))
    : retenido ? E2(`El depósito de ${usdN(x.pago.monto)} sigue retenido en tu tarjeta: todavía no se cobró.`, `The ${usdN(x.pago.monto)} deposit is still held on your card: it has not been charged yet.`) : devT || E2("No se cobró nada.", "Nothing was charged.");
  const codeL = x.code ? E2(`Código ${x.code}`, `Code ${x.code}`) : "";
  const H: Record<string, [string, string, string, string, string, string]> = {
    pending: ["clock", "bg-action/10", "var(--tl-action)", E2("PENDIENTE", "PENDING"), `${E2("Esperando a ", "Waiting for ")}${B}`, `${E2(`Confirman en menos de ${espL(x.resp, true)}.`, `They confirm within ${espL(x.resp, false)}.`)}${nm(pideSoltarSi("confirman", x.pago, usdN))}`],
    confirmed: lista
      ? ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("ESTÁS EN LA LISTA", "YOU ARE ON THE LIST"), `${codeL} · ${x.pax} ${x.pax === 1 ? E2("persona", "person") : E2("personas", "people")}`, `${E2("Di tu nombre y el código en la puerta.", "Say your name and the code at the door.")} ${x.puerta[es ? "es" : "en"]}.`]
      : ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("MESA CONFIRMADA", "TABLE CONFIRMED"), cuando, `${codeL}. ${E2(`Te guardan la mesa ${x.hold} min.`, `They hold the table ${x.hold} min.`)}`],
    change_proposed: ["warning", "bg-pro/20", "var(--tl-pro-ink)", E2("TE PROPONEN UN CAMBIO", "A CHANGE IS PROPOSED"), x.alt ? `${noche} · ${hNoche(x.alt.m)}` : noche, `${E2("A tu hora no tienen mesa.", "They have no table at your time.")}${nm(pideSoltarSi("sirve", x.pago, usdN))}`],
    declined: ["warning", "bg-danger/10", "var(--tl-danger)", E2("NO HAY MESA", "NO TABLE"), E2("Esa noche están llenos", "They are full that night"), devT],
    expired: ["clock", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("SIN RESPUESTA", "NO REPLY"), E2("No contestaron a tiempo", "No reply in time"), devT],
    cancelled: ["close", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("CANCELADA", "CANCELLED"), x.motivoNeg ? E2(`${B} canceló tu mesa`, `${B} cancelled your table`) : lista ? E2("Saliste de la lista", "You left the list") : E2("Cancelaste la reserva", "You cancelled the booking"),
      x.motivoNeg ? `«${x.motivoNeg}». ${devT || (cobrado ? E2("La devolución todavía no sale: escríbenos en Soporte y lo resolvemos.", "The refund has not gone out yet: write to us in Support and we will sort it out.") : E2("No se cobró nada.", "Nothing was charged."))}` : x.perdio ? quedoLocal : lista ? E2("No se cobró nada.", "Nothing was charged.") : devT],
    done: x.detalle === "noid" ? ["warning", "bg-danger/10", "var(--tl-danger)", E2("NO ENTRASTE · SIN IDENTIFICACIÓN", "NO ENTRY · NO ID"), noche, `${E2("La regla se leía antes de pedir: todos con identificación.", "The rule was shown before booking: everyone needs ID.")}${dep ? ` ${quedoLocal}` : ""}`]
      : x.detalle === "nollegaron" ? ["clock", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("NO LLEGASTE", "NO-SHOW"), noche, dep ? quedoLocal : E2("No se cobró nada.", "Nothing was charged.")]
      : x.detalle === "sin_entrar" ? ["clock", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("NO ENTRASTE", "YOU DID NOT GO IN"), noche, E2("La lista cerró a las 6 AM. No se cobró nada.", "The list closed at 6 AM. Nothing was charged.")]
      : ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("BUENA NOCHE", "GOOD NIGHT"), E2("Gracias por usar To’Latino", "Thanks for using To’Latino"), dep && cobrado ? E2(`Tu depósito de ${usdN(dep)} se descontó de tu cuenta en el local.`, `Your ${usdN(dep)} deposit came off your bill at the venue.`) : retenido ? quedoLocal : linea],
  };
  const h = H[x.status] ?? H.pending!;
  const ev = (k: string) => x.linea.find((z) => z.kind === k)?.at;
  const pasos = lista ? [[E2("En la lista", "On the list"), hora(ev("night_list"))], [noche, ""], [E2("Terminada", "Done"), ""]]
    : [[E2("Enviada", "Sent"), hora(ev("night_sent"))], [E2("Confirmada", "Confirmed"), hora(ev("night_ok") ?? ev("alt_accepted"))], [noche, ""], [E2("Terminada", "Done"), ""]];
  const enCurso = x.hoy && x.nowN >= x.llega;
  const pos = (lista ? { confirmed: enCurso ? 1 : 0, done: 3 } : { pending: 0, change_proposed: 0, confirmed: enCurso ? 2 : 1, done: 4 } as Record<string, number>)[x.status as "confirmed"];
  const steps = pos == null ? [] : pasos.map(([label, time], i) => ({ label, time, state: i < pos ? "done" : i === pos ? "current" : "next" }));
  const rows: [string, string][] = [[lista ? E2("LISTA", "LIST") : E2("RESERVA", "BOOKING"), nm(x.svc)], [E2("NOCHE", "NIGHT"), `${noche} · ${E2("llegas", "you arrive")} ${hNoche(x.llega)}`],
    [E2("PERSONAS", "PEOPLE"), String(x.pax)], [E2("EN LA PUERTA", "AT THE DOOR"), x.puerta[es ? "es" : "en"]], [E2("EDAD", "AGE"), E2(`Todos con identificación: ${x.edad}+.`, `Everyone with ID: ${x.edad}+.`)],
    ...(x.occ && OCC(es)[x.occ] ? [[E2("OCASIÓN", "OCCASION"), OCC(es)[x.occ]!] as [string, string]] : []), ...(x.nota ? [[E2("TU NOTA", "YOUR NOTE"), `«${x.nota}»`] as [string, string]] : []),
    ...(x.inN != null ? [[E2("ENTRARON", "GOT IN"), `${x.inN} ${E2("de", "of")} ${x.pax}`] as [string, string]] : [])];
  const depEstado = !dep ? "" : x.pago.st === "held" ? E2("RETENIDO", "HELD") : x.pago.st === "captured" ? E2("COBRADO", "CHARGED") : liberado ? E2("LIBERADO", "RELEASED") : devuelto ? E2("DEVUELTO", "REFUNDED") : x.perdio ? E2("SE QUEDÓ", "KEPT") : "";
  const vivo = ["pending", "change_proposed", "confirmed"].includes(x.status) && !(lista && x.inN);
  const corte = hNoche(x.cut ?? x.corteBase);
  const reglaCx = lista ? E2("Puedes salir de la lista cuando quieras. No se cobra nada.", "You can leave the list any time. Nothing is charged.")
    : x.status !== "confirmed" ? `${E2("Aún no confirman: es gratis.", "Not confirmed yet: it is free.")} ${pideCx || sinCargo}`
    : !dep ? E2("No dejaste depósito: no se cobra nada.", "You left no deposit: nothing is charged.")
    : x.nowN < (x.cut ?? x.corteBase) ? `${E2(`Antes de las ${corte} de esa noche: es gratis.`, `Before ${corte} that night: it is free.`)} ${pideCx || sinCargo}`
    : cobrado && queda > 0 ? (queda === dep ? E2(`Ya pasaron las ${corte}: el depósito de ${usdN(queda)} se queda con el local.`, `It is past ${corte}: the venue keeps the ${usdN(queda)} deposit.`)
      : E2(`Ya pasaron las ${corte}: lo que queda del depósito (${usdN(queda)}) se queda con el local.`, `It is past ${corte}: the venue keeps what is left of the deposit (${usdN(queda)}).`))
    : `${E2(`Ya pasaron las ${corte}.`, `It is past ${corte}.`)} ${pideCx || sinCargo}`;
  const llegar = () => { if (x.negocio.direccion) abrirComoLlegar({ dir: `${x.negocio.direccion}, ${B}` }); };
  return (
    <div data-screen-label="APP-NEG-NOCHE-ESTADO" className="min-h-[100dvh] bg-paper pb-10">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver al local", "Back to the venue")} onClick={() => router.push(`/n/${x.negocio.id}`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{E2("Tu noche", "Your night")}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/60">{`${E2("RESERVA #", "BOOKING #")}${x.numero} · ${B}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div data-screen-label="Noche · estado" className="rounded-[20px] border border-ink/[.07] bg-white px-[18px] pb-5 pt-6 text-center">
          <div className={`mx-auto grid h-[60px] w-[60px] place-items-center rounded-[20px] ${h[1]}`}><Icon name={h[0]} size={26} color={h[2]} strokeWidth={2.2} /></div>
          <div className="mt-[13px] font-mono text-[9.5px] font-bold tracking-[0.14em]" style={{ color: h[2] }}>{h[3]}</div>
          <h1 className="m-0 mt-2 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.04em]">{h[4]}</h1>
          <p className="m-0 mt-[9px] text-pretty text-[13px] leading-[1.55] text-ink/[.62]">{h[5]}</p>
        </div>
        {x.code && (
          <div data-screen-label="Noche · código de la puerta" className="flex items-center gap-4 rounded-[18px] bg-ink px-5 py-4 text-white">
            <div className="min-w-0 flex-1"><div className="font-mono text-[9px] font-bold tracking-[0.14em] text-white/60">{E2("CÓDIGO PARA LA PUERTA", "DOOR CODE")}</div>
              <div className="mt-1.5 text-[12.5px] font-medium text-white/75">{E2("Dilo con tu nombre. Es solo tuyo: no lo compartas.", "Say it with your name. It is only yours: do not share it.")}</div></div>
            <div className="font-mono text-[30px] font-extrabold tracking-[0.18em]">{x.code}</div>
          </div>)}
        {x.status === "change_proposed" && x.alt && (
          <div data-screen-label="Noche · otra hora" className="flex flex-col gap-2.5 rounded-[18px] border border-ink/[.07] bg-white p-4">
            <div className="text-[13.5px] font-bold">{E2(`Pediste las ${hNoche(x.llega)}. Te proponen las ${hNoche(x.alt.m)}.`, `You asked for ${hNoche(x.llega)}. They propose ${hNoche(x.alt.m)}.`)}</div>
            <div className="flex gap-2.5"><div className="flex min-w-0 flex-1"><Button block icon="check" disabled={ocupado} onClick={() => void hacer("aceptar", E2("Listo: mesa confirmada", "Done: table confirmed"))}>{E2("Aceptar esta hora", "Accept this time")}</Button></div>
              <div className="flex min-w-0 flex-1"><Button block variant="secondary" disabled={ocupado} onClick={() => void hacer("nogracias", retenido ? E2("Listo: se liberó tu depósito", "Done: your deposit was released") : E2("Listo: cancelada", "Done: cancelled"))}>{E2("No me sirve", "Doesn’t work")}</Button></div></div>
          </div>)}
        {steps.length > 0 && <div className="grid"><OrderTracker steps={steps} /></div>}
        <div data-screen-label="Noche · tu noche" className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
          <div className="border-b border-ink/[.07] px-[15px] py-3"><span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/60">{E2("TU NOCHE", "YOUR NIGHT")}</span></div>
          <div className="px-[15px] py-0.5">{rows.map(([k, v], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/60">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v}</span></div>)}</div>
        </div>
        {!lista && (
          <div data-screen-label="Noche · tu dinero" className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
            <div className="border-b border-ink/[.07] px-[15px] py-3"><span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/60">{E2("TU DINERO", "YOUR MONEY")}</span></div>
            <div className="px-[15px] py-0.5">
              <div className="flex justify-between gap-3 py-[11px]"><span className="text-[12.5px] font-semibold">{E2("Depósito", "Deposit")}{x.pago.l4 ? <span className="ml-1.5 font-mono text-[9.5px] text-ink/60">{`${(x.pago.marca ?? "").toUpperCase()} ·· ${x.pago.l4}`}</span> : null}</span>
                <span className="text-[12.5px] font-bold">{dep ? `${usdN(dep)}${depEstado ? ` · ${depEstado}` : ""}` : E2("Sin depósito", "No deposit")}</span></div>
              <div className="flex justify-between gap-3 border-t border-ink/[.06] py-[11px]"><span className="text-[12.5px] font-semibold">{E2("Mínimo", "Minimum")}</span><span className="text-right text-[12.5px] font-bold">{`${x.puerta[es ? "es" : "en"]} · ${E2("es consumo, no un cargo aparte", "it is spend, not an extra fee")}`}</span></div>
            </div>
          </div>)}
        <div className="flex flex-col gap-2.5">
          {vivo && x.negocio.direccion && <Button variant="secondary" icon="pin" onClick={llegar}>{E2("Cómo llegar", "Directions")}</Button>}
          {x.negocio.telefono && vivo && <Button variant="secondary" icon="phone" onClick={() => { location.href = `tel:${x.negocio.telefono}`; }}>{E2("Llamar", "Call")}</Button>}
          {vivo && <Button variant="ghost" icon="close" onClick={() => setConfirmar(true)}>{lista ? E2("Salir de la lista", "Leave the list") : E2("Cancelar la reserva", "Cancel the booking")}</Button>}
          {x.status === "done" && x.detalle === "entro" && !x.resena && <Button icon="star" onClick={() => router.push(`/n/${x.negocio.id}/resena?pedido=${x.numero}`)}>{E2("Calificar", "Rate")}</Button>}
          {(x.status === "done" || (x.status === "cancelled" && !!x.motivoNeg)) && <Button variant="secondary" icon="help" onClick={() => router.push(`/noche/${x.numero}/ayuda`)}>{E2("Ayuda con la noche", "Night help")}</Button>}
          {!vivo && <Button variant="secondary" icon="drink" onClick={() => router.push(`/n/${x.negocio.id}?tab=svc`)}>{E2("Otra noche", "Another night")}</Button>}
        </div>
        <div className="text-pretty text-center text-[12px] font-medium leading-[1.5] text-ink/60">{`${linea} ${E2("Si alguien corre peligro, llama al 911.", "If someone is in danger, call 911.")}`}</div>
      </div>
      {confirmar && (
        <div data-screen-label="Noche · cancelar" className="fixed inset-0 z-[70]">
          <div onClick={() => setConfirmar(false)} className="absolute inset-0 bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={E2("Cancelar", "Cancel")} className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-[26px] bg-white px-5 pb-6 pt-5 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[460px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
            <div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{lista ? E2("¿Salir de la lista?", "Leave the list?") : E2("¿Cancelar la reserva?", "Cancel the booking?")}</div>
            <p className="m-0 text-pretty text-[13.5px] leading-[1.55] text-ink/70">{reglaCx}</p>
            <div className="flex gap-2.5"><div className="flex min-w-0 flex-1"><Button block variant="secondary" onClick={() => setConfirmar(false)}>{E2("No, volver", "No, go back")}</Button></div>
              <div className="flex min-w-0 flex-1"><Button block disabled={ocupado} onClick={() => void hacer("cancelar", lista ? E2("Listo: saliste de la lista", "Done: you left the list") : E2("Listo: cancelada", "Done: cancelled"))}>{lista ? E2("Sí, salir", "Yes, leave") : E2("Sí, cancelar", "Yes, cancel")}</Button></div></div>
          </div>
        </div>)}
    </div>
  );
}
