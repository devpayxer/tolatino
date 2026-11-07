"use client";
/* APP-NEG-EDU-ESTADO (neg-edu-flow.js citaVals L66–73): PENDIENTE · CONFIRMADA · EN CURSO / ACTIVA · TERMINADA · TE PROPONEN UN CAMBIO ·
   NO PUDO · SIN RESPUESTA · CANCELACIÓN PEDIDA · CANCELADA. Pasos (Enviada · Confirmada · En curso · Terminada), tu inscripción (lo que
   se copió al enviar), tu dinero (matrícula retenida / cobrada / liberada / devuelta / se quedó; lo que se paga en el lugar; el plan por
   escrito con las cuotas marcadas) y las acciones: Cómo llegar · Llamar · Cancelar / Cancelar mi membresía (con la regla real). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { contratoTexto } from "@/lib/deporte-comun";
import { fechaCorta, FORMA, LINEA_EDU, usdI, VOC } from "@/lib/inscripciones-comun";
import { DONATIVO, LINEA_FE } from "@/lib/fe-comun";
import type { InscVista } from "@/lib/inscripciones";
import { inscAccion } from "./acciones";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const fechaHora = (t: string, es: boolean) => new Date(t).toLocaleString(es ? "es-US" : "en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

export function InscEstado({ x, es }: { x: InscVista; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string } | null) => (b ? (es ? b.es : b.en || b.es) : "");
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null), [flash, setFlash] = useState<string | null>(null), [confirmar, setConfirmar] = useState(false);
  const hacer = async (que: "cancelar" | "aceptar" | "nogracias", ok: string) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await inscAccion(x.numero, que).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false); setConfirmar(false);
    if (r.ok) { setFlash(ok); setTimeout(() => setFlash(null), 3200); router.refresh(); } else setError(es ? r.msg.es : r.msg.en);
  };
  // 4ie · Iglesias: «Tu lugar», la fecha y la franja; nada se cobra; consejería y capellanía, neutras.
  const fe = x.rubro === "fe";
  const B = x.negocio.nombre, V = VOC[x.rubro], matL = nm(V.mat), memb = x.k === "mes" || x.k === "semana", curso = x.k === "curso";
  const cuando = nm(x.cuando) || E2("Empiezas cuando te confirmen", "You start once confirmed");
  const liberado = x.pago === "released", devuelto = x.devuelto;
  const devT = x.mat ? (liberado ? E2(`Se liberó tu ${matL.toLowerCase()} de ${usdI(x.mat)}.`, `Your ${usdI(x.mat)} ${matL.toLowerCase()} was released.`) : devuelto ? E2(`Te devolvimos ${usdI(devuelto)} · 3 a 5 días.`, `We refunded ${usdI(devuelto)} · 3 to 5 days.`) : x.pago === "held" ? E2(`Se libera tu ${matL.toLowerCase()} de ${usdI(x.mat)}.`, `Your ${usdI(x.mat)} ${matL.toLowerCase()} is released.`) : "") : E2("No se cobró nada.", "Nothing was charged.");
  const certL = x.cert ? (x.oficial ? E2(`Certificado oficial: ${nm(x.cert)}`, `Official certificate: ${nm(x.cert)}`) : E2(`Constancia de la escuela: ${nm(x.cert)}`, `School certificate: ${nm(x.cert)}`)) : "";
  const G = "var(--tl-open-text)", grey = "rgba(11,14,18,.6)";
  const H: Record<string, [string, string, string, string, string, string]> = {
    pending: ["clock", "bg-action/10", "var(--tl-action)", E2("PENDIENTE", "PENDING"), `${E2("Esperando a ", "Waiting for ")}${B}`,
      x.mat ? E2(`Pagaste la ${matL.toLowerCase()} (${usdI(x.mat)}): está retenida y se cobra cuando confirmen. Si no confirman, se devuelve.`, `Your ${matL.toLowerCase()} (${usdI(x.mat)}) is held and charged when they confirm. If they do not, it is returned.`) : E2("No se ha cobrado nada.", "Nothing has been charged.")],
    confirmed: x.detalle === "cancel_req"
      ? ["clock", "bg-pro/20", "var(--tl-pro-ink)", E2("CANCELACIÓN PEDIDA", "CANCELLATION REQUESTED"), x.bajaPedida ? E2(`Pediste la baja el ${fechaHora(x.bajaPedida, true)}`, `You asked to cancel on ${fechaHora(x.bajaPedida, false)}`) : E2("Pediste la baja", "You asked to cancel"), E2("Queda cancelada cuando el lugar la confirme o a las 72 horas. Guarda esta pantalla como constancia.", "It is cancelled when the place confirms or after 72 hours. Keep this screen as proof.")]
      : x.detalle === "started"
      ? ["check", "bg-signal/[.18]", G, memb ? E2("ACTIVA", "ACTIVE") : x.rubro === "ninos" ? E2("ASISTIENDO", "ATTENDING") : E2("EN CURSO", "IN PROGRESS"), cuando, x.plan ? E2(`Plan: ${x.plan.cal.length} pagos de ${usdI(x.plan.cal[x.plan.cal.length - 1]?.cents ?? 0)} en la escuela.`, `Plan: ${x.plan.cal.length} payments of ${usdI(x.plan.cal[x.plan.cal.length - 1]?.cents ?? 0)} at the school.`) : memb ? E2(`Pagas ${usdI(x.precio)} ${nm(FORMA[x.k].por)} en el lugar.`, `You pay ${usdI(x.precio)} ${nm(FORMA[x.k].por)} at the place.`) : E2("Que te vaya muy bien.", "All the best.")]
      : ["check", "bg-signal/[.18]", G, E2("CONFIRMADA", "CONFIRMED"), fe && x.grupo ? nm(x.grupo) : cuando, fe ? E2("Te esperamos.", "See you there.") : E2("Trae una identificación el primer día.", "Bring an ID on the first day.")],
    change_proposed: ["warning", "bg-pro/20", "var(--tl-pro-ink)", E2("TE PROPONEN UN CAMBIO", "A CHANGE IS PROPOSED"), x.alt ? nm(x.alt.label) : "", fe ? E2("Esa fecha no se puede. Si la nueva no te sirve, no pasa nada.", "That date is not possible. If the new one does not work, nothing happens.") : E2("Ese grupo ya no está libre. Si el nuevo no te sirve, se libera todo.", "That group is no longer open. If the new one does not work, everything is released.")],
    declined: ["warning", "bg-danger/10", "var(--tl-danger)", E2("NO PUDO", "NOT POSSIBLE"), fe && x.fecha ? E2("No hay esa fecha", "That date is not available") : E2("No hay cupo", "No openings"), devT],
    expired: ["clock", "bg-ink/[.06]", grey, E2("SIN RESPUESTA", "NO REPLY"), E2("No contestaron a tiempo", "No reply in time"), devT],
    cancelled: ["close", "bg-ink/[.06]", grey, E2("CANCELADA", "CANCELLED"),
      x.cancelo === "grupo" ? E2(`${B} canceló el grupo`, `${B} cancelled the group`) : x.cancelo === "negocio" ? E2(`${B} canceló tu inscripción`, `${B} cancelled your enrollment`) : x.cancelo === "baja" ? E2("Tu membresía quedó cancelada", "Your membership is cancelled") : E2("La cancelaste tú", "You cancelled it"),
      x.motivoNeg ? `«${x.motivoNeg}». ${devT || E2("Te devolvemos todo.", "Full refund.")}` : x.perdio ? E2(`La ${matL.toLowerCase()} de ${usdI(x.mat)} se quedó con ${B}: ya había empezado.`, `${B} kept the ${usdI(x.mat)} ${matL.toLowerCase()}: it had already started.`) : x.cancelo === "baja" ? E2("Guarda este aviso como constancia.", "Keep this as proof.") : devT],
    done: ["check", "bg-signal/[.18]", G, E2("TERMINADA", "FINISHED"), x.certDado ? E2("¡Felicidades!", "Congratulations!") : E2("Gracias por usar To’Latino", "Thanks for using To’Latino"), x.certDado ? certL : E2("Tu reseña ayuda a otros a elegir.", "Your review helps others choose.")],
  };
  const h = H[x.estado] ?? H.pending!;
  const pos = ({ pending: 0, change_proposed: 0, confirmed: x.detalle === "started" ? 2 : 1, done: 4 } as Record<string, number>)[x.estado];
  const steps = pos == null || x.detalle === "cancel_req" ? [] : x.pasos.map((p, i) => ({ label: nm(p.t), time: "", state: i < pos ? "done" : i === pos ? "current" : "next" }));
  const rows: [string, string][] = [[fe ? E2("TU LUGAR", "YOUR SPOT") : E2("INSCRIPCIÓN", "ENROLLMENT"), nm(x.svc)], ...(x.grupo ? [[fe && x.fecha ? E2("FECHA", "DATE") : E2("GRUPO", "GROUP"), nm(x.grupo)] as [string, string]] : []),
    ...(x.inicio && !x.fecha ? [[E2("EMPIEZA", "STARTS"), `${fechaCorta(x.inicio, es)}${x.fin ? ` · ${E2("termina", "ends")} ${fechaCorta(x.fin, es)}` : ""}`] as [string, string]] : []),
    [E2("PARA", "FOR"), x.para === "hijo" ? (x.nino ? x.nino.nombre : E2("Tu hijo o hija", "Your child")) : x.para === "otro" ? E2("Otra persona", "Someone else") : E2("Para ti", "For you")],
    ...(x.nivel ? [[E2("NIVEL", "LEVEL"), { cero: E2("Desde cero", "From zero"), algo: E2("Sé algo", "I know some"), medio: E2("Intermedio", "Intermediate") }[x.nivel]] as [string, string]] : []),
    ...(x.equipo ? [[E2("EQUIPO", "TEAM"), x.equipo] as [string, string]] : []),
    ...(certL ? [[E2("TE LLEVAS", "YOU GET"), certL] as [string, string]] : []),
    ...(x.rubro === "dep" && x.k === "mes" ? [[E2("CONTRATO", "CONTRACT"), contratoTexto({ contrato: x.contrato, salir: x.salir }, es)] as [string, string]] : []),
    ...(x.g1 ? [[E2("PRIMERA CLASE", "FIRST CLASS"), E2("Gratis", "Free")] as [string, string]] : [])];
  const matEstado = !x.mat ? "" : x.pago === "held" ? E2("RETENIDA", "HELD") : x.pago === "captured" ? E2("COBRADA", "CHARGED") : liberado ? E2("LIBERADA", "RELEASED") : devuelto ? E2("DEVUELTA", "REFUNDED") : x.perdio ? E2("SE QUEDÓ", "KEPT") : "";
  const resto = x.precio - (curso ? x.mat || x.matLocal : 0);
  const vivo = ["pending", "change_proposed", "confirmed"].includes(x.estado) && x.detalle !== "cancel_req";
  const empezo = x.detalle === "started" || (!!x.inicio && x.inicio <= x.hoy);
  const reglaCx = memb && x.estado === "confirmed" ? `${x.rubro === "dep" && x.k === "mes" ? `${contratoTexto({ contrato: x.contrato, salir: x.salir }, es)}. ` : ""}${E2("Pides la baja aquí con fecha y hora; el lugar la confirma o a las 72 horas queda cancelada. To'Latino no cobra penalidades.", "You ask to cancel here with date and time; the place confirms or after 72 hours it is cancelled. To'Latino charges no penalties.")}`
    : x.estado !== "confirmed" ? E2("Aún no confirman: te liberamos todo.", "Not confirmed yet: we release everything.")
    : !x.mat ? E2("Cancelar es gratis.", "Cancelling is free.")
    : !empezo ? E2(`Todavía no empieza: te devolvemos ${usdI(x.mat)}.`, `It has not started yet: we refund ${usdI(x.mat)}.`)
    : E2(`Ya empezó: la ${matL.toLowerCase()} de ${usdI(x.mat)} no se devuelve.`, `It already started: the ${usdI(x.mat)} ${matL.toLowerCase()} is not refunded.`);
  const llegar = () => { if (x.negocio.direccion) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${x.negocio.direccion}, ${B}`)}`, "_blank", "noopener"); };
  const caja = "overflow-hidden rounded-[18px] border border-ink/[.07] bg-white", Kh = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
  return (
    <div data-screen-label="APP-NEG-EDU-ESTADO" className="min-h-[100dvh] bg-paper pb-10">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver al lugar", "Back to the place")} onClick={() => router.push(`/n/${x.negocio.id}`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{fe ? E2("Tu lugar", "Your spot") : E2("Tu inscripción", "Your enrollment")}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${fe ? E2("TU LUGAR #", "YOUR SPOT #") : E2("INSCRIPCIÓN #", "ENROLLMENT #")}${x.numero} · ${B}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div data-screen-label="Inscripción · estado" className="rounded-[20px] border border-ink/[.07] bg-white px-[18px] pb-5 pt-6 text-center">
          <div className={`mx-auto grid h-[60px] w-[60px] place-items-center rounded-[20px] ${h[1]}`}><Icon name={h[0]} size={26} color={h[2]} strokeWidth={2.2} /></div>
          <div className="mt-[13px] font-mono text-[9.5px] font-bold tracking-[0.14em]" style={{ color: h[2] }}>{h[3]}</div>
          <h1 className="m-0 mt-2 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.04em]">{h[4]}</h1>
          <p className="m-0 mt-[9px] text-pretty text-[13px] leading-[1.55] text-ink/[.62]">{h[5]}</p>
        </div>
        {x.estado === "change_proposed" && x.alt && (
          <div data-screen-label="Inscripción · otro grupo" className="flex flex-col gap-2.5 rounded-[18px] border border-ink/[.07] bg-white p-4">
            <div className="text-[13.5px] font-bold">{fe && x.fecha ? E2(`Te proponen: ${nm(x.alt.label)}.`, `They propose: ${nm(x.alt.label)}.`) : E2(`Te proponen: ${nm(x.alt.label)} · empieza el ${fechaCorta(x.alt.inicio, true)}.`, `They propose: ${nm(x.alt.label)} · starts ${fechaCorta(x.alt.inicio, false)}.`)}</div>
            {x.mat > 0 && <div className="text-[12.5px] font-medium text-ink/60">{E2(`Si aceptas, se cobra tu ${matL.toLowerCase()} de ${usdI(x.mat)}. Si no, se libera.`, `If you accept, your ${usdI(x.mat)} ${matL.toLowerCase()} is charged. If not, it is released.`)}</div>}
            <div className="flex gap-2.5"><div className="flex min-w-0 flex-1"><Button block icon="check" disabled={ocupado} onClick={() => void hacer("aceptar", E2("Listo: inscripción confirmada", "Done: enrollment confirmed"))}>{E2("Aceptar", "Accept")}</Button></div>
              <div className="flex min-w-0 flex-1"><Button block variant="secondary" disabled={ocupado} onClick={() => void hacer("nogracias", E2("Listo: se liberó todo", "Done: everything was released"))}>{E2("No me sirve", "Doesn’t work")}</Button></div></div>
          </div>)}
        {steps.length > 0 && <div className="grid"><OrderTracker steps={steps} /></div>}
        <div data-screen-label="Inscripción · tu inscripción" className={caja}>
          <div className="border-b border-ink/[.07] px-[15px] py-3"><span className={Kh}>{E2("TU INSCRIPCIÓN", "YOUR ENROLLMENT")}</span></div>
          <div className="px-[15px] py-0.5">{rows.map(([k, v], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v}</span></div>)}</div>
        </div>
        <div data-screen-label="Inscripción · tu dinero" className={caja}>
          <div className="border-b border-ink/[.07] px-[15px] py-3"><span className={Kh}>{E2("TU DINERO", "YOUR MONEY")}</span></div>
          <div className="px-[15px] py-0.5">
            <div className="flex justify-between gap-3 py-[11px]"><span className="text-[12.5px] font-semibold">{fe ? E2("En la app", "In the app") : E2("Precio", "Price")}</span><span className="text-right text-[12.5px] font-bold">{fe ? `$0 · ${x.precio ? `${E2("Donativo sugerido", "Suggested donation")} ${usdI(x.precio)}: ${nm(DONATIVO).split("·")[1]?.trim() ?? ""}` : E2("Es gratis", "It is free")}` : x.precio ? `${usdI(x.precio)} ${nm(FORMA[x.k].por)}` : E2("Gratis si calificas", "Free if you qualify")}</span></div>
            {curso && (x.mat || x.matLocal) ? <div className="flex justify-between gap-3 border-t border-ink/[.06] py-[11px]"><span className="text-[12.5px] font-semibold">{matL}</span><span className="text-[12.5px] font-bold">{x.mat ? `${usdI(x.mat)}${matEstado ? ` · ${matEstado}` : ""}` : `${usdI(x.matLocal)} · ${E2("EN EL LUGAR", "AT THE PLACE")}`}</span></div> : null}
            {curso && resto > 0 && !x.plan && <div className="flex justify-between gap-3 border-t border-ink/[.06] py-[11px]"><span className="text-[12.5px] font-semibold">{E2("El resto", "The rest")}</span><span className="text-right text-[12.5px] font-bold">{`${usdI(resto)} · ${E2("en la escuela el primer día", "at the school on day one")}`}</span></div>}
            {memb && <div className="flex justify-between gap-3 border-t border-ink/[.06] py-[11px]"><span className="text-[12.5px] font-semibold">{E2("Cómo se paga", "How you pay")}</span><span className="text-right text-[12.5px] font-bold">{E2("En el lugar; nada en la tarjeta", "At the place; nothing on your card")}</span></div>}
          </div>
        </div>
        {x.plan && (
          <div data-screen-label="Inscripción · plan por escrito" className={caja}>
            <div className="border-b border-ink/[.07] px-[15px] py-3"><span className={Kh}>{E2("PLAN DE PAGOS · POR ESCRITO", "PAYMENT PLAN · IN WRITING")}</span></div>
            <div className="px-[15px] py-0.5">{x.plan.cal.map((p, n) => <div key={p.n} className={`flex justify-between gap-3 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="text-[12.5px] font-semibold">{E2(`Pago ${p.n}`, `Payment ${p.n}`)} · {fechaCorta(p.due, es)}</span><span className="text-[12.5px] font-bold">{usdI(p.cents)} · {x.plan!.pagadas.includes(p.n) ? E2("PAGADO", "PAID") : E2("EN LA ESCUELA", "AT THE SCHOOL")}</span></div>)}</div>
            <div className="border-t border-ink/[.07] px-[15px] py-3 text-[11.5px] font-medium leading-[1.5] text-ink/55">{nm(x.plan.texto)}</div>
          </div>)}
        <div className="flex flex-col gap-2.5">
          {vivo && x.negocio.direccion && <Button variant="secondary" icon="pin" onClick={llegar}>{E2("Cómo llegar", "Directions")}</Button>}
          {x.negocio.telefono && vivo && <Button variant="secondary" icon="phone" onClick={() => { location.href = `tel:${x.negocio.telefono}`; }}>{E2("Llamar", "Call")}</Button>}
          {vivo && <Button variant="ghost" icon="close" onClick={() => setConfirmar(true)}>{memb && x.estado === "confirmed" ? E2("Cancelar mi membresía", "Cancel my membership") : fe ? E2("Cancelar", "Cancel") : E2("Cancelar la inscripción", "Cancel the enrollment")}</Button>}
          {x.estado === "done" && !x.resena && <Button icon="star" onClick={() => router.push(`/n/${x.negocio.id}/resena?pedido=${x.numero}`)}>{E2("Calificar", "Rate")}</Button>}
          {(x.estado === "done" || (x.estado === "confirmed" && (x.detalle === "started" || x.detalle === "cancel_req")) || (x.estado === "cancelled" && (!!x.motivoNeg || x.mat > 0))) && <Button variant="secondary" icon="help" onClick={() => router.push(`/insc/${x.numero}/ayuda`)}>{E2("Ayuda con la inscripción", "Enrollment help")}</Button>}
          {!vivo && x.estado !== "confirmed" && <Button variant="secondary" icon="calendar" onClick={() => router.push(`/n/${x.negocio.id}?tab=svc`)}>{fe ? E2("Pedir otra fecha", "Ask for another date") : E2("Ver otros grupos", "See other groups")}</Button>}
        </div>
        <div className="text-pretty text-center text-[12px] font-medium leading-[1.5] text-ink/50">{fe ? nm(LINEA_FE) : x.rubro === "edu" ? nm(LINEA_EDU) : E2("Solo se cobra lo que ves aquí: nada que aparezca después en la tarjeta.", "Only what you see here is charged: nothing showing up later on your card.")}</div>
      </div>
      {confirmar && (
        <div data-screen-label="Inscripción · cancelar" className="fixed inset-0 z-[70]">
          <div onClick={() => setConfirmar(false)} className="absolute inset-0 bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={E2("Cancelar", "Cancel")} className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-[26px] bg-white px-5 pb-6 pt-5 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[460px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
            <div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{memb && x.estado === "confirmed" ? E2("¿Cancelar tu membresía?", "Cancel your membership?") : E2("¿Cancelar la inscripción?", "Cancel the enrollment?")}</div>
            <p className="m-0 text-pretty text-[13.5px] leading-[1.55] text-ink/70">{reglaCx}</p>
            <div className="flex gap-2.5"><div className="flex min-w-0 flex-1"><Button block variant="secondary" onClick={() => setConfirmar(false)}>{E2("No, volver", "No, go back")}</Button></div>
              <div className="flex min-w-0 flex-1"><Button block disabled={ocupado} onClick={() => void hacer("cancelar", memb && x.estado === "confirmed" ? E2("Listo: pediste la baja", "Done: cancellation requested") : E2("Listo: cancelada", "Done: cancelled"))}>{E2("Sí, cancelar", "Yes, cancel")}</Button></div></div>
          </div>
        </div>)}
    </div>
  );
}
