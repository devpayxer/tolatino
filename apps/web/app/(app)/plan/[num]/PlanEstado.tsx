"use client";
/* APP-NEG-HOGAR-PLAN-ESTADO (diseño neg-hogar-plan.js › planStatus): plan activo · en pausa · cancelado; las próximas
   visitas, qué incluye, cómo se cobra (y lo cobrado), tu plan, y saltar la próxima · pausar un mes · cancelar · reanudar ·
   cambiar la tarjeta (si el banco la rechazó). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { PlanVista } from "@/lib/planes";
import { MetodoPago, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../pago/MetodoPago";
import { planAccion } from "./acciones";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const dinero = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const DL = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const MO = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const ORD = { es: ["1.er", "2.º", "3.er", "4.º"], en: ["1st", "2nd", "3rd", "4th"] };
const hL = (m: number) => { const h = Math.floor(m / 60) % 24; return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`; };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});

export function PlanEstado({ p, es, pago }: { p: PlanVista; es: boolean; pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null), [flash, setFlash] = useState<string | null>(null), [confirmar, setConfirmar] = useState(false), [hoja, setHoja] = useState(false);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []);
  const fL = (f: string) => { const d = new Date(`${f}T12:00:00Z`); return es ? `${DL.es[d.getUTCDay()]} ${d.getUTCDate()} ${MO.es[d.getUTCMonth()]}` : `${DL.en[d.getUTCDay()]}, ${MO.en[d.getUTCMonth()]} ${d.getUTCDate()}`; };
  const win = `${hL(p.win)}–${hL(p.win + 120)}`, nx = p.proximas[0]?.fecha ?? null;
  const hacer = async (que: "saltar" | "pausar" | "reanudar" | "cancelar" | "tarjeta", ok: string, pm?: string) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await planAccion(p.numero, que, pm).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false); setConfirmar(false);
    if (r.ok) { setFlash(ok); setTimeout(() => setFlash(null), 3200); router.refresh(); } else setError(es ? r.msg.es : r.msg.en);
  };
  const banco = p.st === "paused" && p.fallos >= 3;
  const H: Record<PlanVista["st"], [string, string, string, string, string, string]> = {
    active: ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("PLAN ACTIVO", "PLAN ACTIVE"), nx ? `${E2("Próxima visita: ", "Next visit: ")}${fL(nx)}` : "",
      `${win} · ${E2(`${dinero(p.precio)} al mes, el mismo día.`, `${dinero(p.precio)} a month, same day.`)} ${p.cobros.length ? "" : E2("Hoy no se cobró nada.", "Nothing charged today.")}${p.fallos ? E2(` Tu banco rechazó el último cobro: lo intentamos otra vez el ${p.reintento ? fL(p.reintento) : ""}.`, ` Your bank declined the last charge: we retry on ${p.reintento ? fL(p.reintento) : ""}.`) : ""}`],
    paused: ["clock", "bg-pro/20", "var(--tl-pro-ink)", E2("EN PAUSA", "PAUSED"), banco ? E2("Tu banco rechazó el cobro", "Your bank declined the charge") : nx ? `${E2("Vuelve el ", "Resumes ")}${fL(nx)}` : "",
      banco ? E2("Cambia la tarjeta y el plan sigue. Mientras, no hay visitas ni cobros.", "Change the card and the plan continues. Meanwhile, no visits or charges.") : E2("Este mes no se cobra ni hay visita.", "No charge and no visit this month.")],
    cancelled: ["close", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("CANCELADO", "CANCELLED"), E2("Ya no tienes este plan", "You no longer have this plan"), `${E2("No se cobra el mes siguiente.", "Next month is not charged.")}${p.cobros.length ? E2(` Cobrado en total: ${dinero(p.cobros.reduce((n, c) => n + c.monto, 0))}.`, ` Total charged: ${dinero(p.cobros.reduce((n, c) => n + c.monto, 0))}.`) : ""}`],
  };
  const h = H[p.st];
  const steps = [{ label: E2("Empezaste", "Started"), time: p.empezo, state: "done" }, { label: E2("Primera visita", "First visit"), time: "", state: p.visitas > 0 ? "done" : "current" }, { label: E2("Cada mes", "Every month"), time: "", state: p.visitas > 1 ? "done" : p.visitas > 0 ? "current" : "next" }];
  const dia = p.meses ? E2(`${(ORD.es)[p.nth - 1]} ${DL.es[p.dow]} de ${p.meses.map((m) => MO.es[m - 1]).join(" y ")}`, `${ORD.en[p.nth - 1]} ${DL.en[p.dow]} of ${p.meses.map((m) => MO.en[m - 1]).join(" and ")}`) : E2(`El ${ORD.es[p.nth - 1]} ${DL.es[p.dow]} de cada mes`, `The ${ORD.en[p.nth - 1]} ${DL.en[p.dow]} of each month`);
  const acts: [string, string, () => void][] = p.st === "active" ? [["calendar", E2("Saltar la próxima", "Skip the next one"), () => void hacer("saltar", E2("Listo: esa visita no va y ese mes no se cobra", "Done: that visit is skipped and not charged"))],
    ["clock", E2("Pausar un mes", "Pause one month"), () => void hacer("pausar", E2("Listo: plan en pausa un mes", "Done: plan paused one month"))], ["close", E2("Cancelar el plan", "Cancel the plan"), () => setConfirmar(true)]]
    : p.st === "paused" ? [...(banco ? [] : [["check", E2("Reanudar", "Resume"), () => void hacer("reanudar", E2("Listo: plan activo otra vez", "Done: plan active again"))] as [string, string, () => void]]), ["close", E2("Cancelar el plan", "Cancel the plan"), () => setConfirmar(true)]]
      : [["calendar", E2("Empezar otra vez", "Start again"), () => router.push(`/n/${p.negocio.id}?tab=svc`)]];
  return (
    <div data-screen-label="APP-NEG-HOGAR-PLAN-ESTADO" className="min-h-[100dvh] bg-paper pb-10">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver al negocio", "Back to the business")} onClick={() => router.push(`/n/${p.negocio.id}?tab=svc`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{nm(p.svc)}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${E2("PLAN #", "PLAN #")}${p.numero} · ${p.negocio.nombre}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div data-screen-label="Plan · estado" className="rounded-[20px] border border-ink/[.07] bg-white px-[18px] pb-5 pt-6 text-center">
          <div className={`mx-auto grid h-[60px] w-[60px] place-items-center rounded-[20px] ${h[1]}`}><Icon name={h[0]} size={26} color={h[2]} strokeWidth={2.2} /></div>
          <div className="mt-[13px] font-mono text-[9.5px] font-bold tracking-[0.14em]" style={{ color: h[2] }}>{h[3]}</div>
          <h1 className="m-0 mt-2 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.04em]">{cap(h[4])}</h1>
          <p className="m-0 mt-[9px] text-pretty text-[13px] leading-[1.55] text-ink/[.62]">{h[5]}</p>
        </div>
        {(banco || p.fallos > 0) && p.st !== "cancelled" && pago && <div className="grid"><Button block icon="card" onClick={() => setHoja(true)}>{E2("Cambiar la tarjeta", "Change the card")}</Button></div>}
        <div className="grid"><OrderTracker steps={steps} /></div>
        {p.proximas.length > 0 && (
          <div className="rounded-[18px] border border-ink/[.07] bg-white p-4">
            <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("PRÓXIMAS VISITAS", "UPCOMING VISITS")}</div>
            <div className="mt-2.5 flex flex-col gap-2">{p.proximas.map((v, i) => (
              <button key={v.fecha} type="button" disabled={!v.cita} onClick={() => v.cita && router.push(`/cita/${v.cita}`)} className="flex items-center gap-3 rounded-[14px] border border-ink/[.08] px-3 py-2.5 text-left">
                <span className="h-10 w-10 flex-none rounded-xl bg-photo-bg" style={fondo(p.negocio.foto)} />
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{`${cap(fL(v.fecha))} · ${win}`}</span>
                  <span className="mt-0.5 block font-mono text-[9.5px] font-semibold text-ink/55">{`${i === 0 && p.st === "active" ? E2("PRÓXIMA · ", "NEXT · ") : ""}${dinero(p.precio)}${E2(" AL MES", " A MONTH")}`}</span></span>
                {v.cita && <Icon name="chevronRight" size={15} color="rgba(11,14,18,.35)" />}</button>))}</div>
          </div>
        )}
        <div className="rounded-[18px] border border-ink/[.07] bg-white p-4">
          <div className="flex items-center gap-2.5"><span className="h-9 w-9 flex-none rounded-full bg-photo-bg" style={fondo(p.negocio.foto)} />
            <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{`${E2("TU PLAN · ", "YOUR PLAN · ")}${p.negocio.nombre}`.toUpperCase()}</div></div>
          <p className="m-0 mt-3 text-pretty text-[13px] font-medium leading-[1.55]">{E2("Cada visita te llega con lo que se hizo. Si algo necesita más tiempo o piezas, te piden tu OK antes.", "Each visit comes with what was done. If something needs more time or parts, they ask your OK first.")}</p>
          {p.inc.length > 0 && <div className="mt-3.5"><div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("INCLUYE", "INCLUDES")}</div>
            <div className="mt-2 flex flex-col gap-1.5">{p.inc.map((t) => <div key={t.es} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.45] text-ink/75"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open)" strokeWidth={2.2} /></span>{nm(t)}</div>)}</div></div>}
          <div className="mt-3.5"><div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("CÓMO SE COBRA", "HOW YOU ARE CHARGED")}</div>
            <div className="mt-2 flex flex-col gap-1.5 text-[12.5px] font-medium leading-[1.45] text-ink/70">
              <div>{E2(`${dinero(p.precio)} cada mes en tu ${p.tarjeta ?? "tarjeta"}${p.proxCobro && p.st !== "cancelled" ? `; el próximo, el ${fL(p.proxCobro)}` : ""}.`, `${dinero(p.precio)} monthly on your ${p.tarjeta ?? "card"}${p.proxCobro && p.st !== "cancelled" ? `; next on ${fL(p.proxCobro)}` : ""}.`)}</div>
              <div>{E2("Lo que pase de lo incluido se cotiza aparte y solo se hace con tu OK.", "Anything beyond what is included is quoted separately and only done with your OK.")}</div>
              {p.cobros.map((c) => <div key={c.seq} className="flex justify-between gap-3 font-mono text-[10.5px] font-semibold text-ink/55"><span>{E2(`COBRO ${c.seq}`, `CHARGE ${c.seq}`)}</span><span>{dinero(c.monto)}</span></div>)}
            </div></div>
        </div>
        <div className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
          <div className="border-b border-ink/[.07] px-[15px] py-3 font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("TU PLAN", "YOUR PLAN")}</div>
          <div className="px-[15px] py-0.5">
            {([[E2("CASA", "HOME"), p.casa ?? "—"], [E2("DÍA", "DAY"), `${dia} · ${win}`], ...(p.nota ? [[E2("QUÉ REVISAR", "WHAT TO CHECK"), `«${p.nota}»`]] : []), ...(p.acceso ? [[E2("CÓMO ENTRAR", "ACCESS"), p.acceso]] : [])] as [string, string][]).map(([k, v], n) => (
              <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-pretty text-right text-[13px] font-semibold leading-[1.45]">{v}</span></div>))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">{acts.map(([icon, l, on]) => <div key={l} className="grid"><Button variant="secondary" size="md" icon={icon} disabled={ocupado} onClick={on}>{l}</Button></div>)}
          <div className="grid"><Button variant="secondary" size="md" icon="bubble" onClick={() => router.push(`/cuenta/mensajes/${p.negocio.id}`)}>{E2("Mensaje", "Message")}</Button></div></div>
      </div>
      {confirmar && (
        <div className="fixed inset-0 z-[60]">
          <div onClick={() => setConfirmar(false)} className="absolute inset-0 bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={E2("¿Cancelar el plan?", "Cancel the plan?")} className="absolute inset-x-0 bottom-0 rounded-t-[26px] bg-white px-5 pb-7 pt-6 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
            <div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{E2("¿Cancelar el plan?", "Cancel the plan?")}</div>
            <p className="m-0 mt-2 text-pretty text-[13px] leading-[1.55] text-ink/65">{E2("No se cobra el mes siguiente y la próxima visita se quita. Lo ya cobrado no cambia.", "Next month is not charged and the next visit is removed. What was already charged does not change.")}</p>
            <div className="mt-5 flex flex-col gap-2">
              <div className="grid"><Button variant="danger" disabled={ocupado} onClick={() => void hacer("cancelar", E2("Listo: plan cancelado", "Done: plan cancelled"))}>{E2("Sí, cancelar", "Yes, cancel")}</Button></div>
              <div className="grid"><Button variant="secondary" onClick={() => setConfirmar(false)}>{E2("No, mantenerlo", "No, keep it")}</Button></div>
            </div>
          </div>
        </div>
      )}
      {hoja && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={null} declinada={null} modo={pago.modo} pk={pago.pk} guardarSiempre nota={E2("El plan se cobra con esta tarjeta desde ahora.", "The plan is charged to this card from now on.")}
          onClose={() => setHoja(false)} onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setHoja(false); void hacer("tarjeta", E2(`Listo: el plan se cobra con ${tarjetaL(t)}`, `Done: the plan is charged to ${tarjetaL(t)}`), t.pm); }} />
      )}
    </div>
  );
}
