"use client";
/* APP-NEG-EVENTO-PRIVADO · estado (To'Latino Evento privado.dc.html, isSt): Tag + número, título, pasos (OrderTracker), la propuesta (filas,
   subtotal, impuesto de la ciudad, total, depósito, «Lo pagas en el local el día del evento», VÁLIDA N H y la política de cancelar), la nota de
   dinero, las acciones, LO QUE PEDISTE y, si no pudieron, OTROS QUE HACEN EVENTOS PRIVADOS. Escritorio: la columna con el restaurante y TU EVENTO.
   Los montos vienen del servidor (la propuesta guardada); aquí solo se muestran. Hueco compuesto: «Pedir un cambio» y el cambio de un evento
   confirmado (hoja con los campos del formulario y la misma tarjeta de la propuesta). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import { AREAS_EVP, HORAS_EVP, OCASIONES, PRESUPUESTOS, diaEvp, dinero, horaL, lbl, nm } from "@/lib/evento-privado-comun";
import type { EvpVista } from "@/lib/evento-privado";
import { MetodoPago, marcaL, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../pago/MetodoPago";
import { aceptarEvpAccion, cambioEvpAccion, evpClienteAccion } from "./acciones";
import { uuid } from "@/lib/uuid";
import { abrirComoLlegar } from "@/lib/como-llegar";

type N = "Icon" | "Button" | "OrderTracker" | "Tag" | "BusinessRow" | "IconButton";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker, Tag, BusinessRow, IconButton } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10.5px] font-extrabold tracking-[0.12em]";
const CAJA = "rounded-[17px] border border-ink/[.08] bg-white";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const hora = (t: number | undefined) => (t ? new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "");
type Q = NonNullable<EvpVista["quote"]>;

export function EstadoEvp({ x, es, pago }: { x: EvpVista; es: boolean; pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), B = x.negocio.nombre;
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null), [flash, setFlash] = useState<string | null>(null);
  const [cx, setCx] = useState(false), [cambio, setCambio] = useState(false), [rechazo, setRechazo] = useState(false);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null), [hoja, setHoja] = useState(false);
  const [cNota, setCNota] = useState(""), [cP, setCP] = useState<number | null>(null), [cFecha, setCFecha] = useState(""), [cH, setCH] = useState<number | null>(null);
  const clave = useRef(uuid());
  const listo = (t: string) => { setFlash(t); setTimeout(() => setFlash(null), 3200); router.refresh(); };
  const fallo = (r: { msg: { es: string; en: string } }) => setError(es ? r.msg.es : r.msg.en);
  const correr = async <T extends { ok: boolean }>(f: () => Promise<T>, ok: string, after?: () => void) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await f().catch(() => ({ ok: false, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }) as unknown as T);
    setOcupado(false);
    if (r.ok) { after?.(); listo(ok); } else fallo(r as unknown as { msg: { es: string; en: string } });
    return r;
  };
  const aceptar = async (q: Q) => {
    if (!tarjeta) { setHoja(true); return; }
    if (ocupado) return; setOcupado(true); setError(null); setRechazo(false);
    const r = await aceptarEvpAccion(x.numero, q.v, tarjeta.pm, clave.current).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (r.ok) { listo(E2("Listo: tu evento quedó confirmado", "Done: your event is confirmed")); return; }
    if ("tarjeta" in r && r.tarjeta) setRechazo(true);
    fallo(r); clave.current = uuid();
  };

  const cuando = (ymd: string, m: number, dur: number) => `${cap(diaEvp(ymd, es))} · ${horaL(m)} – ${horaL(m + dur)}`;
  const q = x.quote, ac = x.acuerdo, chg = x.cambio, st = x.status, det = x.detalle;
  const iDay = q && st === "change_proposed" ? q.ymd : x.ymd, iM = q && st === "change_proposed" ? q.m : x.m, iDur = q && st === "change_proposed" ? q.dur : x.dur;
  const pagado = x.pago.st === "captured" || x.pago.st === "partially_refunded" || x.pago.st === "refunded" || x.pago.st === "held";
  const card = x.pago.l4 ? `${marcaL(x.pago.marca ?? "")} ·· ${x.pago.l4}` : E2("tu tarjeta", "your card");
  const enTiempo = x.hLeft >= x.cancelH;
  const TAG: Record<string, [string, string]> = {
    pending: [E2("PENDIENTE", "PENDING"), "action"], quote: [E2("TE MANDARON SU PROPUESTA", "PROPOSAL RECEIVED"), "action"], alt: [E2("TE PROPONEN UN CAMBIO", "CHANGE PROPOSED"), "action"],
    counter: [E2("PEDISTE UN CAMBIO", "YOU ASKED FOR A CHANGE"), "action"], confirmed: [E2("CONFIRMADO", "CONFIRMED"), "signal"], declined: [E2("NO PUDO", "DECLINED"), "danger"],
    expired: [det === "propuesta_vencida" ? E2("LA PROPUESTA VENCIÓ", "PROPOSAL EXPIRED") : E2("SIN RESPUESTA", "NO REPLY"), "neutral"], cancelled: [E2("CANCELADO", "CANCELED"), "neutral"], done: [E2("PASÓ EL EVENTO", "EVENT DONE"), "neutral"],
  };
  const tk = st === "change_proposed" ? (det === "alt" ? "alt" : det === "counter" ? "counter" : "quote") : st;
  const tag = TAG[tk] ?? TAG.pending!;
  const mensaje = () => router.push(`/cuenta/mensajes/${x.negocio.id}?op=${encodeURIComponent(x.numero)}`);
  const ics = () => {
    const ymd = x.ymd.replaceAll("-", ""), hm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}${String(m % 60).padStart(2, "0")}00`;
    const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ToLatino//ES", "BEGIN:VEVENT", `UID:${x.numero}@tolatino`, `DTSTART:${ymd}T${hm(x.m)}`, `DTEND:${ymd}T${hm(Math.min(x.m + x.dur, 1439))}`,
      `SUMMARY:${E2("Evento privado · ", "Private event · ")}${x.p} ${E2("personas", "guests")} · ${B}`, `LOCATION:${(x.negocio.direccion ?? "").replace(/[,;]/g, "\\$&")}`,
      `DESCRIPTION:${E2("Evento privado #", "Private event #")}${x.numero}${ac ? ` · ${E2("Resta ", "Left ")}${dinero(Math.max(0, ac.tot - ac.dep))}` : ""}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" })); a.download = `${x.numero}.ics`; a.click();
  };
  const llegar = x.negocio.lat != null && x.negocio.lng != null ? () => abrirComoLlegar({ lat: x.negocio.lat, lng: x.negocio.lng }) : null;
  const otraVez = () => router.push(`/n/${x.negocio.id}/evento-privado?p=${x.p}`);

  // Pasos
  const sentAt = x.linea.find((e) => e.kind === "sent")?.at;
  const steps = [
    { label: E2("Solicitud enviada", "Request sent"), time: hora(sentAt), state: "done" },
    { label: `${E2("Propuesta de ", "Proposal from ")}${B}`, time: st === "pending" ? "" : "", state: st === "pending" ? "current" : ["declined", "expired"].includes(st) && !q ? "next" : "done" },
    { label: E2("Aceptas y pagas el depósito", "You accept and pay the deposit"), time: ac ? dinero(ac.dep) : "", state: ac ? "done" : st === "change_proposed" ? "current" : "next" },
    { label: E2("El día del evento", "Event day"), time: cap(diaEvp(x.ymd, es, true)), state: st === "done" ? "done" : st === "confirmed" ? "current" : "next" },
  ];
  // Título y subtítulo
  const H: Record<string, [string, string]> = {
    pending: [E2("Solicitud enviada", "Request sent"), E2(`${B} responde con una propuesta y el precio total. Si no responde a tiempo, se cancela sola.`, `${B} replies with a proposal and the full price. If they do not reply in time, it cancels on its own.`)],
    quote: [E2("Te mandaron su propuesta", "They sent their proposal"), q ? E2(`Revísala y decide. Vale hasta ${new Date(q.vence).toLocaleString("es-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" })}; después vence.`, `Review it and decide. Valid until ${new Date(q.vence).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" })}; then it expires.`) : ""],
    alt: [E2("Te proponen otra fecha", "They suggest another date"), q ? `${q.nota ? `${q.nota} ` : ""}${cuando(q.ymd, q.m, q.dur)}.` : ""],
    counter: [E2("Pediste un cambio", "You asked for a change"), E2(`${B} te responde. Mientras, su propuesta sigue y la puedes aceptar.`, `${B} will reply. Meanwhile, their proposal still stands and you can accept it.`)],
    confirmed: [E2("Tu evento está confirmado", "Your event is confirmed"), `${cuando(x.ymd, x.m, x.dur)} · ${B}. ${E2("Si algo cambia, te avisamos aquí y en tus avisos.", "If anything changes, we let you know here and in your notifications.")}`],
    declined: [E2(`${B} no puede esa fecha`, `${B} cannot do that date`), x.motivoNo ? `«${x.motivoNo}»` : ""],
    expired: [det === "propuesta_vencida" ? E2("La propuesta venció", "The proposal expired") : E2("No respondieron a tiempo", "They did not reply in time"), det === "propuesta_vencida" ? E2("Pasó el tiempo para aceptarla y la solicitud se cerró sola.", "The time to accept it passed and the request closed on its own.") : E2("Pasó el tiempo sin respuesta y la solicitud se canceló sola.", "Time passed without a reply and the request canceled on its own.")],
    cancelled: [x.motivoNeg ? E2(`${B} canceló el evento`, `${B} canceled the event`) : E2("Cancelaste el evento", "You canceled the event"), x.motivoNeg ? `«${x.motivoNeg}»` : x.detalle === null && x.linea.some((e) => e.kind === "quote_no") ? E2("No aceptaste la propuesta.", "You did not accept the proposal.") : cap(diaEvp(x.ymd, es))],
    done: [E2("Pasó tu evento", "Your event is over"), `${cuando(x.ymd, x.m, x.dur)} · ${B}`],
  };
  const h = H[tk] ?? H.pending!;
  // La nota de dinero
  let nota: [string, string, "ink" | "ok" | "warn" | "bad", string] | null = null;
  if (st === "pending" || (st === "change_proposed" && !rechazo)) nota = [E2("No se cobra nada todavía.", "Nothing is charged yet."), E2("El depósito se cobra solo si aceptas su propuesta.", "The deposit is only charged if you accept their proposal."), "ink", "dollar"];
  if (st === "change_proposed" && rechazo) nota = [E2("Tu tarjeta fue rechazada. No se cobró nada.", "Your card was declined. Nothing was charged."), E2("Prueba otra vez o usa otra tarjeta. La propuesta sigue apartada.", "Try again or use another card. The proposal is still held."), "bad", "warning"];
  if (st === "confirmed" && ac) nota = [`${E2("Depósito cobrado: ", "Deposit charged: ")}${dinero(ac.dep)} · ${card}`, E2(`Resta ${dinero(Math.max(0, ac.tot - ac.dep))}: lo pagas en el local el día del evento.`, `${dinero(Math.max(0, ac.tot - ac.dep))} left: you pay it there on the event day.`), "ok", "check"];
  if (st === "declined" || st === "expired") nota = [E2("No se cobró nada.", "Nothing was charged."), "", "ink", "dollar"];
  if (st === "cancelled") nota = pagado ? (x.perdio ? [`${E2("El depósito se quedó con ", "The deposit stayed with ")}${B}`, E2(`Cancelaste a menos de ${x.cancelH} h del evento.`, `You canceled less than ${x.cancelH} h before the event.`), "warn", "dollar"]
    : [`${x.pago.devuelto ? E2("Te devolvimos ", "We refunded ") : E2("Te devolvemos ", "We refund ")}${dinero(x.pago.devuelto || x.pago.monto)}${E2(" a tu ", " to your ")}${card}`, E2("Llega en 3–5 días hábiles.", "It arrives in 3–5 business days."), "ink", "dollar"])
    : [E2("No se cobró nada.", "Nothing was charged."), "", "ink", "dollar"];
  if (st === "done" && ac) nota = [`${E2("Depósito: ", "Deposit: ")}${dinero(ac.dep)} · ${E2("descontado del total", "taken off the total")}`, "", "ink", "dollar"];
  const NB = { ink: "bg-white border border-ink/[.08]", ok: "bg-signal/[.16]", warn: "bg-pro/[.14]", bad: "bg-danger/[.08]" } as const;
  const NF = { ink: "var(--tl-ink)", ok: "var(--tl-open-text)", warn: "var(--tl-pro-ink)", bad: "var(--tl-danger)" } as const;

  // Acciones
  type A = { l: string; v: string; on: () => void; ic: string; off?: boolean };
  let acts: A[] = [];
  if (st === "pending") acts = [{ l: E2("Mensaje", "Message"), v: "secondary", on: mensaje, ic: "chat" }, { l: E2("Cancelar solicitud", "Cancel request"), v: "secondary", on: () => setCx(true), ic: "close" }];
  if (st === "change_proposed" && q) acts = [
    { l: `${det === "alt" ? `${E2("Aceptar el ", "Accept ")}${diaEvp(q.ymd, es, true)}` : E2("Aceptar", "Accept")}${E2(" y pagar ", " and pay ")}${dinero(q.dep)}`, v: "primary", on: () => void aceptar(q), ic: "check", off: ocupado },
    ...(det !== "counter" && x.asks.length < x.cambiosMax ? [{ l: E2("Pedir un cambio", "Ask for a change"), v: "secondary", on: () => setCambio(true), ic: "chat" }] : [{ l: E2("Mensaje", "Message"), v: "secondary", on: mensaje, ic: "chat" }]),
    det === "alt" ? { l: E2("Buscar otra fecha", "Find another date"), v: "secondary", on: otraVez, ic: "calendar" } : { l: E2("Agregar al calendario", "Add to calendar"), v: "secondary", on: ics, ic: "calendar" },
    { l: E2("No, gracias", "No, thanks"), v: "secondary", on: () => void correr(() => evpClienteAccion(x.numero, "nogracias"), E2("Listo: no se cobró nada", "Done: nothing was charged")), ic: "close", off: ocupado }];
  if (st === "confirmed") acts = [{ l: E2("Agregar al calendario", "Add to calendar"), v: "secondary", on: ics, ic: "calendar" }, ...(llegar ? [{ l: E2("Cómo llegar", "Directions"), v: "secondary", on: llegar, ic: "pin" }] : []),
    { l: E2("Mensaje", "Message"), v: "secondary", on: mensaje, ic: "chat" }, ...(!det && x.asks.length < x.cambiosMax && !x.pasada ? [{ l: E2("Pedir un cambio", "Ask for a change"), v: "secondary", on: () => setCambio(true), ic: "edit" }] : []),
    ...(!x.pasada ? [{ l: E2("Cancelar el evento", "Cancel the event"), v: "secondary", on: () => setCx(true), ic: "close" }] : [])];
  if (st === "declined" || st === "expired") acts = [{ l: E2("Probar otra fecha", "Try another date"), v: "primary", on: otraVez, ic: "calendar" }, { l: E2("Reservar mesas aparte", "Book separate tables"), v: "secondary", on: () => router.push(`/n/${x.negocio.id}?tab=rsv`), ic: "restaurant" }];
  if (st === "cancelled") acts = [{ l: E2("Pedir otro evento", "Request another event"), v: "secondary", on: otraVez, ic: "party" }];
  if (st === "done") acts = [...(!x.resena ? [{ l: E2("Calificar", "Rate"), v: "primary", on: () => router.push(`/n/${x.negocio.id}/resena?pedido=${x.numero}`), ic: "star" }] : []),
    { l: E2("Ayuda con el evento", "Event help"), v: "secondary", on: () => router.push(`/privado/${x.numero}/ayuda`), ic: "help" }, { l: E2("Pedir otro evento", "Request another event"), v: "secondary", on: otraVez, ic: "party" }];

  const tablaQ = (z: Q, titulo: string, valida: string, conPago: boolean) => (
    <div data-screen-label="Evento privado · propuesta" className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-ink bg-white p-[18px]">
      <div className="flex items-baseline justify-between gap-3"><span className="font-display text-[17px] font-extrabold leading-[1.2] tracking-[-0.02em]">{titulo}</span>{valida ? <span className="flex-none font-mono text-[10px] font-bold tracking-[0.08em] text-ink/50">{valida}</span> : null}</div>
      <div className="text-[12.5px] font-semibold text-ink/60">{`${cuando(z.ymd, z.m, z.dur)} · ${z.p} ${E2("personas", "guests")} · ${E2("versión", "version")} ${z.v}`}</div>
      {z.lines.map((r, i) => (
        <div key={i} className={`flex justify-between gap-3 pt-2.5 ${i ? "border-t border-ink/[.07]" : ""}`}>
          <div className="min-w-0"><div className="text-[13.5px] font-bold leading-[1.35]">{nm(r.l, es)}</div><div className="mt-0.5 text-[12px] font-medium leading-[1.4] text-ink/55">{r.cents ? (r.q > 1 ? `${r.q} × ${dinero(r.unit)}` : "") : E2("Sin cargo", "No charge")}</div></div>
          <span className="flex-none font-mono text-[13px] font-bold">{r.cents ? dinero(r.cents) : "—"}</span>
        </div>))}
      <div className="flex flex-col gap-[7px] border-t border-ink/[.08] pt-2.5 text-[13px] font-medium text-ink/70">
        {([[E2("Subtotal", "Subtotal"), dinero(z.sub), 500, ""], [`${E2("Impuesto", "Tax")} ${(z.taxBp / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} %`, dinero(z.tax), 500, ""], ["Total", dinero(z.tot), 800, "var(--tl-ink)"],
          [z.kind === "change" ? E2("Depósito ya pagado", "Deposit already paid") : conPago ? `${E2("Depósito cobrado · ", "Deposit charged · ")}${card}` : E2("Depósito al aceptar", "Deposit when you accept"), dinero(z.dep), 700, conPago || z.kind === "change" ? "var(--tl-open-text)" : "var(--tl-pro-ink)"],
          [E2("Lo pagas en el local el día del evento", "You pay there on the event day"), dinero(Math.max(0, z.tot - z.dep)), 500, ""]] as [string, string, number, string][]).map(([l, v, fw, fg]) => (
          <div key={l} className="flex justify-between gap-3" style={{ fontWeight: fw, color: fg || undefined }}><span>{l}</span><span className="font-mono">{v}</span></div>))}
      </div>
      {nm(z.inc, es) ? <div className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70"><b className="font-bold">{E2("Incluye: ", "Includes: ")}</b>{nm(z.inc, es)}</div> : null}
      <span className="text-pretty text-[12px] font-medium leading-[1.5] text-ink/60">{E2(`Cancelar: gratis hasta ${z.cancelH} h antes (te devolvemos el depósito en 3–5 días hábiles). Después: el depósito se queda con ${B}. La propina no está incluida.`, `Cancel: free up to ${z.cancelH} h before (deposit back in 3–5 business days). After that: ${B} keeps the deposit. Tip not included.`)}</span>
      {z.st === "sent" && z.kind !== "change" && pago && (
        <button type="button" onClick={() => setHoja(true)} className="flex items-center gap-3 rounded-[14px] border border-ink/10 px-3.5 py-3 text-left">
          <Icon name="card" size={17} color="rgba(11,14,18,.6)" />
          <span className="min-w-0 flex-1"><span className="block font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{E2("TARJETA DEL DEPÓSITO · SE COBRA AL ACEPTAR", "DEPOSIT CARD · CHARGED WHEN YOU ACCEPT")}</span>
            <span className="mt-0.5 block text-[13.5px] font-bold">{tarjeta ? tarjetaL(tarjeta) : E2("Elige tu tarjeta", "Choose your card")}</span></span>
          <span className="flex-none text-[12px] font-bold text-action">{tarjeta ? E2("Cambiar", "Change") : E2("Elegir", "Choose")}</span>
        </button>)}
    </div>
  );
  const kv: [string, string][] = [[E2("OCASIÓN", "OCCASION"), lbl(OCASIONES, x.pedido.occ, es)], [E2("PERSONAS", "GUESTS"), `${x.pedido.personas} · ${es ? AREAS_EVP[x.pedido.area]?.es : AREAS_EVP[x.pedido.area]?.en}`],
    [E2("CUÁNDO", "WHEN"), cuando(x.pedido.ymd, x.pedido.m, x.pedido.horas * 60)], [E2("MENÚ", "MENU"), `${nm(x.pedido.menu, es)} · ${lbl(PRESUPUESTOS, x.pedido.bud, es)}${E2(" por persona", " per person")}`],
    [E2("EXTRAS", "EXTRAS"), x.pedido.ext.map((z) => nm(z, es)).join(" · ") || "—"], ...(x.pedido.nota ? [[E2("NOTA", "NOTE"), x.pedido.nota] as [string, string]] : []),
    ...x.asks.map((a) => [a.kind === "change" ? E2("CAMBIO PEDIDO", "CHANGE ASKED") : E2("PEDISTE", "YOU ASKED"), a.nota] as [string, string]),
    [E2("A NOMBRE DE", "NAME"), `${x.yo.nombre}${x.yo.tel4 ? ` · ··${x.yo.tel4}` : ""}`]];
  const resumen: [string, string][] = [["party", lbl(OCASIONES, x.pedido.occ, es)], ["users", `${x.p} ${E2("personas", "guests")} · ${es ? AREAS_EVP[x.pedido.area]?.es : AREAS_EVP[x.pedido.area]?.en}`], ["calendar", cuando(iDay, iM, iDur)], ["restaurant", nm(x.pedido.menu, es)]];
  const izq = (
    <div className="flex min-w-0 flex-col gap-[22px]">
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => router.push(`/n/${x.negocio.id}`)} className="flex items-center gap-1.5 self-start text-[13px] font-bold text-action"><Icon name="chevronLeft" size={15} color="var(--tl-action)" strokeWidth={2} />{B}</button>
        <div className="flex flex-wrap items-center gap-2.5"><Tag tone={tag[1]}>{tag[0]}</Tag><span className="font-mono text-[10.5px] font-bold tracking-[0.1em] text-ink/50">{`${E2("EVENTO PRIVADO #", "PRIVATE EVENT #")}${x.numero}`}</span></div>
        <h1 className="m-0 text-balance font-display text-[24px] font-extrabold leading-[1.12] tracking-[-0.035em] lg:text-[30px]">{h[0]}</h1>
        {h[1] ? <p className="m-0 text-pretty text-[14px] font-medium leading-[1.6] text-ink/[.68]">{h[1]}</p> : null}
      </div>
      {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
      <div className="grid"><OrderTracker steps={steps} /></div>
      {q && st === "change_proposed" && tablaQ(q, `${E2("La propuesta de ", "Proposal from ")}${B}`, q.vence > Date.now() ? E2(`VÁLIDA ${Math.max(1, Math.round((q.vence - Date.now()) / 36e5))} H`, `VALID ${Math.max(1, Math.round((q.vence - Date.now()) / 36e5))} H`) : "", false)}
      {chg && st === "confirmed" && (<>
        {tablaQ(chg, `${E2("El cambio que te manda ", "The change from ")}${B}`, E2(`VÁLIDO ${Math.max(1, Math.round((chg.vence - Date.now()) / 36e5))} H`, `VALID ${Math.max(1, Math.round((chg.vence - Date.now()) / 36e5))} H`), false)}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <div className="flex"><Button block size="lg" icon="check" disabled={ocupado} onClick={() => void correr(() => evpClienteAccion(x.numero, "cambio_ok", chg.v), E2("Listo: tu evento quedó con el cambio", "Done: your event has the change"))}>{E2("Aceptar el cambio", "Accept the change")}</Button></div>
          <div className="flex"><Button block size="lg" variant="secondary" icon="close" disabled={ocupado} onClick={() => void correr(() => evpClienteAccion(x.numero, "cambio_no"), E2("Listo: sigue lo acordado", "Done: the agreement stands"))}>{E2("Seguir como estaba", "Keep it as it was")}</Button></div>
        </div></>)}
      {st === "confirmed" && det === "change_req" && <div className="rounded-[17px] bg-action/[.07] px-4 py-3.5 text-[13px] font-bold leading-[1.45] text-action-hover">{E2(`Pediste un cambio. ${B} te responde; mientras, sigue lo acordado.`, `You asked for a change. ${B} will reply; meanwhile, the agreement stands.`)}</div>}
      {x.motivoCambioNo && st === "confirmed" && !det && <div className="rounded-[17px] border border-ink/[.08] bg-white px-4 py-3.5 text-[13px] font-medium leading-[1.5] text-ink/70">{E2(`${B} no pudo hacer el cambio: «${x.motivoCambioNo}». Tu evento sigue como lo acordaron.`, `${B} could not make the change: “${x.motivoCambioNo}”. Your event stays as agreed.`)}</div>}
      {ac && ["confirmed", "done"].includes(st) && !chg && tablaQ(ac, E2("Lo que acordaron", "What you agreed"), "", true)}
      {nota && (
        <div className={`flex items-start gap-2.5 rounded-[17px] px-4 py-3.5 ${NB[nota[2]]}`}>
          <Icon name={nota[3]} size={17} color={NF[nota[2]]} strokeWidth={2} />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]"><span className="text-pretty text-[13.5px] font-bold leading-[1.45]" style={{ color: NF[nota[2]] }}>{nota[0]}</span>{nota[1] ? <span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/65">{nota[1]}</span> : null}</div>
        </div>)}
      {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{acts.map((a) => <div key={a.l} className="flex"><Button block size="lg" variant={a.v} icon={a.ic} disabled={a.off} onClick={a.on}>{a.l}</Button></div>)}</div>
      <div className="flex flex-col gap-2.5"><span className={K}>{E2("LO QUE PEDISTE", "WHAT YOU ASKED FOR")}</span>
        <div className={`px-4 py-1 ${CAJA}`}>{kv.map(([k, v], i) => <div key={`${k}${i}`} className={`flex gap-3.5 py-[11px] ${i ? "border-t border-ink/[.07]" : ""}`}><span className="w-24 flex-none font-mono text-[9.5px] font-bold leading-[1.6] tracking-[0.1em] text-ink/50">{k}</span><span className="min-w-0 flex-1 text-pretty text-[13.5px] font-semibold leading-[1.45]">{v}</span></div>)}</div></div>
      {x.otros.length > 0 && <div className="flex flex-col gap-2.5"><span className={K}>{E2("OTROS QUE HACEN EVENTOS PRIVADOS", "OTHERS THAT HOST PRIVATE EVENTS")}</span>
        {x.otros.map((o) => <BusinessRow key={o.id} name={o.nombre} meta={E2(`HASTA ${o.cap} PERSONAS`, `UP TO ${o.cap} GUESTS`)} image={o.foto ?? undefined} slot={E2("Pedir", "Request")} onClick={() => router.push(`/n/${o.id}/evento-privado?p=${x.p}`)} />)}</div>}
    </div>
  );
  return (
    <div data-screen-label="APP-NEG-EVENTO-PRIVADO · estado" className="min-h-[100dvh] bg-paper">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-start gap-12 px-5 pb-10 pt-4 lg:grid-cols-[minmax(0,1fr)_372px] lg:px-[30px] lg:pb-16 lg:pt-[22px]">
        {izq}
        <div data-sticky-rail="1" className="hidden flex-col gap-3.5 lg:sticky lg:top-6 lg:flex">
          <BusinessRow name={B} meta={(x.negocio.direccion ?? "").toUpperCase()} image={x.negocio.foto ?? undefined} />
          <div className={`flex flex-col gap-[9px] px-[18px] py-4 ${CAJA}`}><span className="font-mono text-[10px] font-extrabold tracking-[0.12em] text-ink/50">{E2("TU EVENTO", "YOUR EVENT")}</span>
            {resumen.map(([ic, t]) => <div key={ic} className="flex items-center gap-2.5 text-[13.5px] font-semibold leading-[1.4]"><Icon name={ic} size={15} color="rgba(11,14,18,.55)" /><span className="min-w-0 flex-1">{t}</span></div>)}</div>
        </div>
      </div>
      {cx && (
        <div data-screen-label="Evento privado · cancelar" className="fixed inset-0 z-[96]">
          <div onClick={() => setCx(false)} className="absolute inset-0 bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={E2("Cancelar", "Cancel")} className="absolute inset-x-0 bottom-0 flex flex-col gap-3.5 rounded-t-[26px] bg-white px-[22px] pb-7 pt-[22px] lg:inset-auto lg:left-1/2 lg:top-24 lg:w-[480px] lg:-translate-x-1/2 lg:rounded-[22px]">
            <span className="font-display text-[20px] font-extrabold leading-[1.2] tracking-[-0.03em]">{st === "confirmed" ? E2("¿Cancelar el evento?", "Cancel the event?") : E2("¿Cancelar la solicitud?", "Cancel the request?")}</span>
            <span className="text-pretty text-[13.5px] font-medium leading-[1.55] text-ink/[.68]">{st === "confirmed" ? (enTiempo ? E2(`Faltan más de ${x.cancelH} h: te devolvemos ${dinero(x.pago.monto - x.pago.devuelto)} en 3–5 días hábiles.`, `More than ${x.cancelH} h left: we refund ${dinero(x.pago.monto - x.pago.devuelto)} in 3–5 business days.`) : E2(`Faltan menos de ${x.cancelH} h: el depósito de ${dinero(x.pago.monto)} se queda con ${B}.`, `Less than ${x.cancelH} h left: the ${dinero(x.pago.monto)} deposit stays with ${B}.`)) : E2(`No se cobró nada. ${B} recibe el aviso.`, `Nothing was charged. ${B} gets the notice.`)}</span>
            <div className="flex"><Button block disabled={ocupado} onClick={() => void correr(() => evpClienteAccion(x.numero, "cancelar"), E2("Listo: cancelado", "Done: canceled"), () => setCx(false))}>{E2("Sí, cancelar", "Yes, cancel")}</Button></div>
            <div className="flex"><Button block variant="secondary" onClick={() => setCx(false)}>{E2("No", "No")}</Button></div>
          </div>
        </div>)}
      {cambio && (
        <div data-screen-label="Evento privado · pedir un cambio" className="fixed inset-0 z-[96]">
          <div onClick={() => setCambio(false)} className="absolute inset-0 bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={E2("Pedir un cambio", "Ask for a change")} className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col gap-3.5 overflow-y-auto rounded-t-[26px] bg-white px-[22px] pb-7 pt-[22px] lg:inset-auto lg:left-1/2 lg:top-16 lg:w-[480px] lg:-translate-x-1/2 lg:rounded-[22px]">
            <span className="font-display text-[20px] font-extrabold leading-[1.2] tracking-[-0.03em]">{E2("Pedir un cambio", "Ask for a change")}</span>
            <span className="text-pretty text-[13px] font-medium leading-[1.55] text-ink/[.68]">{st === "confirmed" ? E2(`${B} te responde con el cambio. Mientras, sigue lo acordado y no se cobra nada más.`, `${B} replies with the change. Meanwhile, the agreement stands and nothing more is charged.`) : E2(`${B} te manda una propuesta nueva. Mientras, esta sigue y la puedes aceptar.`, `${B} sends you a new proposal. Meanwhile, this one stands and you can accept it.`)}</span>
            <div className="flex flex-col gap-2"><span className={`${K} text-ink/50`}>{E2("PERSONAS · OPCIONAL", "GUESTS · OPTIONAL")}</span>
              <div className={`flex items-center gap-3.5 px-4 py-3 ${CAJA}`}><span className="min-w-0 flex-1 font-display text-[18px] font-extrabold">{cP ?? x.p} {E2("personas", "guests")}</span>
                <IconButton icon="minus" size={40} label={E2("Menos", "Fewer")} onClick={() => setCP(Math.max(2, (cP ?? x.p) - 1))} /><IconButton icon="plus" size={40} label={E2("Más", "More")} onClick={() => setCP(Math.min(500, (cP ?? x.p) + 1))} /></div></div>
            <label className="flex flex-col gap-2"><span className={`${K} text-ink/50`}>{E2("OTRA FECHA · OPCIONAL", "ANOTHER DATE · OPTIONAL")}</span>
              <input type="date" aria-label={E2("Otra fecha", "Another date")} value={cFecha} onChange={(e) => setCFecha(e.target.value)} className="box-border h-11 w-full rounded-[13px] border border-ink/[.12] bg-white px-3.5 font-mono text-[13.5px] font-bold outline-none" /></label>
            {cFecha && <label className="flex flex-col gap-2"><span className={`${K} text-ink/50`}>{E2("HORA", "TIME")}</span>
              <select aria-label={E2("Hora", "Time")} value={cH ?? ""} onChange={(e) => setCH(e.target.value ? Number(e.target.value) : null)} className="box-border h-11 w-full rounded-[13px] border border-ink/[.12] bg-white px-3 text-[14px] font-bold outline-none">
                <option value="">{horaL(x.m)}</option>{HORAS_EVP.map((m) => <option key={m} value={m}>{horaL(m)}</option>)}</select></label>}
            <label className="flex flex-col gap-2"><span className={`${K} text-ink/50`}>{E2("QUÉ QUIERES CAMBIAR", "WHAT YOU WANT TO CHANGE")}</span>
              <textarea value={cNota} onChange={(e) => setCNota(e.target.value.slice(0, 300))} rows={3} placeholder={E2("Ej.: somos 30, ¿pueden hacer pollo en vez de cerdo?", "E.g.: we are 30, can you do chicken instead of pork?")}
                className="box-border w-full resize-none rounded-[14px] border-[1.5px] border-ink/[.14] bg-white px-3.5 py-3 text-[14px] font-medium leading-[1.5] outline-none" /></label>
            <span className="text-[12px] font-medium leading-[1.45] text-ink/55">{E2("Va también a Mensajes, con el número de tu solicitud. Sin teléfonos.", "It also goes to Messages, with your request number. No phone numbers.")}</span>
            {error && <div role="alert" className="text-[12.5px] font-semibold text-danger">{error}</div>}
            <div className="flex"><Button block disabled={ocupado || cNota.trim().length < 4} onClick={() => void correr(() => cambioEvpAccion(x.numero, { nota: cNota, personas: cP, fecha: cFecha || null, m: cFecha ? cH : null }), E2("Listo: le pediste el cambio", "Done: you asked for the change"), () => { setCambio(false); setCNota(""); setCP(null); setCFecha(""); setCH(null); })}>{E2("Enviar", "Send")}</Button></div>
            <div className="flex"><Button block variant="secondary" onClick={() => setCambio(false)}>{E2("Volver", "Back")}</Button></div>
          </div>
        </div>)}
      {hoja && pago && q && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={null} modo={pago.modo} pk={pago.pk}
          nota={`${E2("DEPÓSITO DE ", "DEPOSIT OF ")}${dinero(q.dep)} · ${E2("SE COBRA AL ACEPTAR", "CHARGED WHEN YOU ACCEPT")}`}
          onClose={() => setHoja(false)}
          onUsar={(t, nueva) => { if (nueva && !tarjetas.some((z) => z.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); setRechazo(false); setError(null); }} />
      )}
    </div>
  );
}
