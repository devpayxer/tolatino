"use client";
/* APP-NEG-TIENDA-ESTADO (diseño neg-tienda-flow.js › citaVals, sobre la vista del estado de la cita): enviado · te lo
   guardan · falta algo · no lo tienen · venció · recogido · cancelado; los pasos, tu apartado (cada artículo y cómo) y
   Cómo llegar · Cancelar · Quitarlo · Buscar otra tienda; al recogerlo, «¿Cómo te fue?» con reseña verificada. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { ApartadoVista } from "@/lib/apartados";
import { apartadoAccion } from "./acciones";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const dinero = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const hora = (t: string | null) => (t ? new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "");
const DIA = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const MO = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };

export function ApartadoEstado({ x, es }: { x: ApartadoVista; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null), [flash, setFlash] = useState<string | null>(null), [confirmar, setConfirmar] = useState(false);
  const hacer = async (que: "cancelar" | "quitar", ok: string) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await apartadoAccion(x.numero, que).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false); setConfirmar(false);
    if (r.ok) { setFlash(ok); setTimeout(() => setFlash(null), 3200); router.refresh(); } else setError(es ? r.msg.es : r.msg.en);
  };
  const fH = (iso: string) => { const d = new Date(iso), p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d), g = (t: string) => p.find((z) => z.type === t)?.value ?? "";
    const dd = new Date(Date.UTC(Number(g("year")), Number(g("month")) - 1, Number(g("day")), 12)); return es ? `${DIA.es[dd.getUTCDay()]} ${dd.getUTCDate()} de ${MO.es[dd.getUTCMonth()]} · ${hora(iso)}` : `${DIA.en[dd.getUTCDay()]}, ${MO.en[dd.getUTCMonth()]} ${dd.getUTCDate()} · ${hora(iso)}`; };
  const falta = x.lineas.find((l) => l.st === "out");
  const LINE = E2("El precio que ves es el que pagas en la caja.", "The price you see is the price you pay at the register.");
  const vence = x.detalle === "sin_respuesta" ? [E2("No respondieron a tiempo", "They did not reply in time"), E2("No se cobró nada. Puedes apartarlo en otra tienda.", "Nothing was charged. You can hold it at another store.")]
    : x.detalle === "sin_decision" ? [E2("No decidiste a tiempo", "No decision in time"), E2("Lo que faltaba no estaba y el resto volvió al estante. No se cobró nada.", "The missing item was not there and the rest went back on the shelf. Nothing was charged.")]
      : [E2("No pasaste en 48 h", "You did not come within 48 h"), E2("Volvió al estante. No se cobró nada.", "Back on the shelf. Nothing was charged.")];
  const H: Record<ApartadoVista["st"], [string, string, string, string, string, string]> = {
    pending: ["clock", "bg-action/10", "var(--tl-action)", E2("APARTADO ENVIADO", "HOLD SENT"), `${E2("Esperando a ", "Waiting for ")}${x.bname}`, E2("Confirman que lo tienen antes de tu hora. No se ha cobrado nada.", "They confirm stock before your time. Nothing has been charged.")],
    confirmed: ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("TE LO GUARDAN", "HELD FOR YOU"), `${E2("Hasta el ", "Until ")}${fH(x.hasta)}`, `${E2("En la caja pagas ", "At the register you pay ")}${dinero(x.tot)}.`],
    change_proposed: ["warning", "bg-pro/20", "var(--tl-pro-ink)", E2("FALTA ALGO", "ITEM MISSING"), falta ? nm(falta.n) : "", E2("La tienda no lo tiene. Quítalo y sigue con lo demás, o cancela.", "The store does not have it. Remove it and keep the rest, or cancel.")],
    declined: ["warning", "bg-danger/10", "var(--tl-danger)", E2("NO LO TIENEN", "NOT IN STOCK"), E2("Se agotó antes de apartarlo", "It sold out before your hold"), E2("No se cobró nada.", "Nothing was charged.")],
    expired: ["clock", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("VENCIÓ", "EXPIRED"), vence[0]!, vence[1]!],
    done: ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("RECOGIDO", "PICKED UP"), E2("Gracias por usar To'Latino", "Thanks for using To'Latino"), `${E2("Pagaste ", "You paid ")}${dinero(x.tot)}.`],
    cancelled: ["close", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("CANCELADO", "CANCELLED"), E2("Cancelaste el apartado", "You cancelled the hold"), E2("No se cobró nada.", "Nothing was charged.")],
  };
  const h = H[x.st];
  const pos = ({ pending: 0, change_proposed: 0, confirmed: 1, done: 2 } as Record<string, number>)[x.st];
  const steps = pos == null ? [] : [[E2("Enviado", "Sent"), hora(x.enviado)], [E2("Guardado", "Held"), hora(x.guardado)], [E2("Recogido", "Picked up"), hora(x.recogido)]].map(([label, time], i) => ({ label, time, state: i < pos || x.st === "done" ? "done" : i === pos ? "current" : "next" }));
  const llegar = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(x.dir || x.bname)}`, "_blank", "noopener");
  const acts: [string, string, () => void, boolean?][] = x.st === "change_proposed" ? [["check", E2("Quitarlo y seguir", "Remove it and continue"), () => void hacer("quitar", E2("Listo: te guardan lo demás", "Done: they keep the rest")), true], ["close", E2("Cancelar el apartado", "Cancel the hold"), () => setConfirmar(true)]]
    : x.st === "pending" || x.st === "confirmed" ? [["pin", E2("Cómo llegar", "Directions"), llegar], ["close", E2("Cancelar", "Cancel"), () => setConfirmar(true)]]
      : x.st === "done" ? [] : [["search", E2("Volver a la tienda", "Back to the store"), () => router.push(`/n/${x.biz}?tab=shop`)]];
  const vivas = x.lineas.filter((l) => l.st !== "removed");
  const rows: [string, string, boolean][] = [...vivas.map((l): [string, string, boolean] => [`${nm(l.n)}${l.qty > 1 ? ` × ${l.qty}` : ""}`.toUpperCase(), l.st === "out" ? E2("No había", "Out") : dinero(l.total), l.st === "out"]),
    [E2("CÓMO", "HOW"), E2("Recoger en tienda", "Pick up in store"), false], ...(x.st === "pending" || x.st === "confirmed" || x.st === "change_proposed" ? [[E2("CUÁNDO PASAS", "WHEN YOU COME"), fH(new Date(new Date(x.hasta).getTime() - 48 * 3600000).toISOString()), false] as [string, string, boolean]] : []),
    ...(x.nota ? [[E2("TU NOTA", "YOUR NOTE"), `«${x.nota}»`, false] as [string, string, boolean]] : [])];
  return (
    <div data-screen-label="APP-NEG-TIENDA-ESTADO" className="min-h-[100dvh] bg-paper pb-10">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver a la tienda", "Back to the store")} onClick={() => router.push(`/n/${x.biz}?tab=shop`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{E2("Tu apartado", "Your hold")}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${E2("APARTADO #", "HOLD #")}${x.numero} · ${x.bname}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div data-screen-label="Apartado · estado" className="rounded-[20px] border border-ink/[.07] bg-white px-[18px] pb-5 pt-6 text-center">
          <div className={`mx-auto grid h-[60px] w-[60px] place-items-center rounded-[20px] ${h[1]}`}><Icon name={h[0]} size={26} color={h[2]} strokeWidth={2.2} /></div>
          <div className="mt-[13px] font-mono text-[9.5px] font-bold tracking-[0.14em]" style={{ color: h[2] }}>{h[3]}</div>
          <h1 className="m-0 mt-2 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.04em]">{h[4]}</h1>
          <p className="m-0 mt-[9px] text-pretty text-[13px] leading-[1.55] text-ink/[.62]">{h[5]}</p>
        </div>
        {steps.length > 0 && <div className="grid"><OrderTracker steps={steps} /></div>}
        {x.st === "done" && (
          <div className="rounded-[18px] border border-ink/[.07] bg-white p-4 text-center">
            <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("¿Cómo te fue?", "How was it?")}</div>
            <div className="mt-1 text-[12.5px] font-medium text-ink/60">{E2("Tu reseña sale verificada.", "Your review shows as verified.")}</div>
            <div className="mt-3 flex justify-center gap-1.5">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} ${E2(n === 1 ? "estrella" : "estrellas", n === 1 ? "star" : "stars")}`} onClick={() => router.push(`/n/${x.biz}/resena?pedido=${x.numero}&e=${n}`)} className="grid h-10 w-10 place-items-center rounded-xl bg-paper"><Icon name="star" size={20} color="rgba(11,14,18,.35)" /></button>)}</div>
          </div>
        )}
        <div className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
          <div className="border-b border-ink/[.07] px-[15px] py-3 font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("TU APARTADO", "YOUR HOLD")}</div>
          <div className="px-[15px] py-0.5">{rows.map(([k, v, out], n) => (
            <div key={`${k}${n}`} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className={`flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] ${out ? "text-danger line-through" : "text-ink/[.42]"}`}>{k}</span><span className={`text-pretty text-right text-[13px] font-semibold leading-[1.45] ${out ? "text-danger" : ""}`}>{v}</span></div>))}
            <div className="flex justify-between gap-3.5 border-t border-ink/[.06] py-[11px]"><span className="font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{E2("EN LA CAJA", "AT THE REGISTER")}</span><span className="font-display text-[15px] font-extrabold">{dinero(x.tot)}</span></div></div>
        </div>
        <div className="flex items-start gap-2 rounded-[14px] bg-white px-3.5 py-3"><span className="grid flex-none pt-0.5"><Icon name="dollar" size={14} color="var(--tl-open-text)" /></span><span className="text-pretty text-[12px] font-semibold leading-[1.45] text-ink/70">{LINE}</span></div>
        {acts.length > 0 && <div className="grid grid-cols-2 gap-2">{acts.map(([icon, l, on, prim]) => <div key={l} className="grid"><Button variant={prim ? "primary" : "secondary"} size="md" icon={icon} disabled={ocupado} onClick={on}>{l}</Button></div>)}
          <div className="grid"><Button variant="secondary" size="md" icon="bubble" onClick={() => router.push(`/cuenta/mensajes/${x.biz}`)}>{E2("Mensaje", "Message")}</Button></div></div>}
      </div>
      {confirmar && (
        <div className="fixed inset-0 z-[60]">
          <div onClick={() => setConfirmar(false)} className="absolute inset-0 bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={E2("¿Cancelar el apartado?", "Cancel the hold?")} className="absolute inset-x-0 bottom-0 rounded-t-[26px] bg-white px-5 pb-7 pt-6 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
            <div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{E2("¿Cancelar el apartado?", "Cancel the hold?")}</div>
            <p className="m-0 mt-2 text-pretty text-[13px] leading-[1.55] text-ink/65">{E2("Vuelve al estante y la tienda lo sabe. No se cobra nada.", "It goes back on the shelf and the store is told. Nothing is charged.")}</p>
            <div className="mt-5 flex flex-col gap-2">
              <div className="grid"><Button variant="danger" disabled={ocupado} onClick={() => void hacer("cancelar", E2("Listo: apartado cancelado", "Done: hold cancelled"))}>{E2("Sí, cancelar", "Yes, cancel")}</Button></div>
              <div className="grid"><Button variant="secondary" onClick={() => setConfirmar(false)}>{E2("No, lo quiero", "No, keep it")}</Button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
