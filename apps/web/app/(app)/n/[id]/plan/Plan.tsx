"use client";
/* APP-NEG-HOGAR-PLAN (diseño neg-hogar-plan.js › planForm): tu casa, el día fijo (el mismo cada mes), la primera visita
   (3 opciones, franja de 2 h), qué quieres que revisen, cómo entrar, la tarjeta del plan y cómo funciona. Hoy no se cobra
   nada; el primer cobro es el día de la primera visita. Compuesto con el sistema de diseño. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import type { OficiosPublico } from "@/lib/oficios-publico";
import type { OpcionesPlan } from "@/lib/planes";
import { MetodoPago, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../../pago/MetodoPago";
import { HojaCasa, casaMeta, compatCasa, useOficio } from "../Oficios";
import { empezarElPlan } from "./acciones";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const dinero = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const DC = { es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const DL = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const MO = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const hL = (m: number) => { const h = Math.floor(m / 60) % 24; return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`; };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Plan({ op, svcId, o, es, yo, pago }: { op: OficiosPublico; svcId: string; o: OpcionesPlan; es: boolean; yo: boolean; pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter();
  const v = useOficio(op, es, yo)!;
  const s = op.servicios.find((x) => x.id === svcId)!, nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [dow, setDow] = useState(o.dias[0]?.dow ?? null), [fi, setFi] = useState(0), [nota, setNota] = useState(""), [acceso, setAcceso] = useState("");
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null);
  const [hoja, setHoja] = useState(false), [declinada, setDeclinada] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const clave = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "");
  const dia = o.dias.find((d) => d.dow === dow) ?? null, fecha = dia?.fechas[fi] ?? null;
  const fL = (f: string) => { const d = new Date(`${f}T12:00:00Z`); return es ? `${DL.es[d.getUTCDay()]} ${d.getUTCDate()} ${MO.es[d.getUTCMonth()]}` : `${DL.en[d.getUTCDay()]}, ${MO.en[d.getUTCMonth()]} ${d.getUTCDate()}`; };
  const win = dia ? `${hL(dia.m)}–${hL(dia.m + 120)}` : "";
  const cp = compatCasa(op, v.casa, es);
  const miss = [!v.casa ? E2("Agrega tu casa", "Add your home") : null, cp && !cp.ok ? cp.t : null, !fecha ? E2("Elige el día", "Pick the day") : null, !tarjeta ? E2("Elige la tarjeta del plan", "Choose the plan card") : null].filter(Boolean) as string[];
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const enviar = async () => {
    if (!yo) return entrar();
    if (miss.length || ocupado || !fecha || !tarjeta) return;
    setOcupado(true); setError(null);
    const r = await empezarElPlan({ negocio: op.negocio.id, svc: s.id, fecha, nota, acceso, pm: tarjeta.pm, clave: clave.current }).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (r.ok) router.push(`/plan/${r.numero}`); else { setError(es ? r.msg.es : r.msg.en); if ("tarjeta" in r && r.tarjeta) setDeclinada(tarjeta.pm); }
  };
  const mesesL = o.meses ? o.meses.map((m) => (es ? MO.es : MO.en)[m - 1]).join(E2(" y ", " and ")) : null;
  const como = [mesesL ? E2(`Visitas en ${mesesL}, el mismo día de la semana, en una franja de 2 horas.`, `Visits in ${mesesL}, same weekday, in a 2-hour window.`) : E2("El mismo día cada mes, en una franja de 2 horas. Va el mismo equipo.", "The same day every month, in a 2-hour window. The same crew comes."),
    E2(`Primer cobro de ${dinero(o.precio)} ${fecha ? `el ${fL(fecha)}` : "el día de la primera visita"}; después cada mes ese mismo día. Hoy no se cobra nada.`, `First ${dinero(o.precio)} charge ${fecha ? `on ${fL(fecha)}` : "on the first visit"}; then monthly on that same day. Nothing is charged today.`),
    E2("Pausas, saltas una visita o cancelas desde tu plan. Si cancelas, no se cobra el mes siguiente.", "Pause, skip a visit or cancel from your plan. If you cancel, next month is not charged.")];
  const barra = (
    <div className="flex flex-col gap-2">
      {miss.length > 0 && <div className="text-[12px] font-semibold leading-[1.45] text-ink/60"><span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{E2("TE FALTA · ", "STILL NEEDED · ")}</span>{miss.join(" · ")}</div>}
      <span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-open-text">{E2("HOY NO SE COBRA NADA · CANCELAS CUANDO QUIERAS", "NOTHING TODAY · CANCEL ANY TIME")}</span>
      <div className="grid"><Button block disabled={miss.length > 0 || ocupado} onClick={enviar}>{ocupado ? E2("Empezando…", "Starting…") : `${E2("Empezar el plan · ", "Start the plan · ")}${dinero(o.precio)}${E2("/mes", "/mo")}`}</Button></div>
    </div>
  );
  return (
    <div data-screen-label="APP-NEG-HOGAR-PLAN" className="min-h-[100dvh] bg-paper pb-[190px] lg:pb-14">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver", "Back")} onClick={() => router.push(`/n/${op.negocio.id}?tab=svc`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={16} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{nm(s.name)}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${dinero(o.precio)}${E2(" AL MES · ", " A MONTH · ")}${op.negocio.nombre}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[620px] flex-col gap-3 px-4 pt-4">
        <div className={`flex flex-col gap-3 p-4 ${caja}`}>
          <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("Tu casa", "Your home")}</div>
          <button type="button" onClick={() => v.setSheet("casa")} className="flex w-full items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px] text-left">
            <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name="home" size={20} color="var(--tl-white)" /></span>
            <span className="min-w-0 flex-1"><span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{v.casa ? E2("TU CASA", "YOUR HOME") : E2("OBLIGATORIO", "REQUIRED")}</span>
              <span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{v.casa ? v.casa.dir : E2("Agrega tu casa", "Add your home")}</span>
              {v.casa && <span className="mt-[3px] block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{casaMeta(v.casa, es)}</span>}
              {cp && <span className="mt-1.5 flex items-center gap-[5px] text-[11.5px] font-bold" style={{ color: cp.ok ? "var(--tl-open-text)" : "var(--tl-danger)" }}><Icon name={cp.ok ? "check" : "warning"} size={13} color="currentColor" />{cp.t}</span>}</span>
            <span className="flex-none text-[12.5px] font-bold text-action">{v.casa ? E2("Cambiar", "Change") : E2("Agregar", "Add")}</span>
          </button>
        </div>
        <div className={`flex flex-col gap-3 p-4 ${caja}`}>
          <div><div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("¿Qué día?", "Which day?")}</div>
            <div className="mt-1 text-[12px] font-medium text-ink/55">{mesesL ? E2(`Tus visitas son en ${mesesL}.`, `Your visits are in ${mesesL}.`) : E2("Tu día fijo cada mes.", "Your fixed day each month.")}</div></div>
          <div><div className={K}>{E2("DÍA FIJO", "FIXED DAY")}</div>
            <div className="mt-2 flex flex-wrap gap-2">{o.dias.map((d) => <Chip key={d.dow} variant={dow === d.dow ? "selected" : "filter"} onClick={() => { setDow(d.dow); setFi(0); }}>{(es ? DC.es : DC.en)[d.dow]}</Chip>)}</div></div>
        </div>
        {dia && (
          <div className={`flex flex-col gap-2.5 p-4 ${caja}`} role="radiogroup" aria-label={E2("Primera visita", "First visit")}>
            <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("Primera visita", "First visit")}</div>
            {dia.fechas.map((f, i) => { const on = fi === i; return (
              <button key={f} type="button" role="radio" aria-checked={on} onClick={() => setFi(i)} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
                <span className={`h-[18px] w-[18px] flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{`${cap(fL(f))} · ${win}`}</span>{i === 0 && <span className="mt-0.5 block text-[12px] font-medium text-ink/55">{E2("La más cercana", "The soonest")}</span>}</span>
              </button>); })}
          </div>
        )}
        <div className={`flex flex-col gap-4 p-4 ${caja}`}>
          <div>
            <div className="flex justify-between gap-2.5"><span className={K}>{E2("QUÉ QUIERES QUE REVISEN · OPCIONAL", "WHAT TO CHECK · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length} / 300</span></div>
            <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 300))} rows={2} aria-label={E2("Qué quieres que revisen", "What to check")} placeholder={E2("Ej.: revisar el grifo del baño y la puerta del patio…", "E.g. check the bathroom faucet and the patio door…")}
              className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
          </div>
          <div><div className={K}>{E2("CÓMO ENTRAR · SI NO ESTÁS", "HOW TO GET IN · IF YOU ARE NOT HOME")}</div>
            <input aria-label={E2("Cómo entrar", "How to get in")} value={acceso} onChange={(e) => setAcceso(e.target.value.slice(0, 100))} placeholder={E2("Ej.: llave con la vecina del 2", "E.g. key with the neighbor in #2")}
              className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-[13px] text-[13px] font-medium outline-none" /></div>
        </div>
        {o.tarjeta && pago ? (
          <button type="button" data-screen-label="Plan · tarjeta" onClick={() => (yo ? setHoja(true) : entrar())} className={`flex w-full items-center gap-3 p-4 text-left ${caja}`}>
            <span className="grid h-9 w-9 flex-none place-items-center rounded-[11px] bg-ink/5"><Icon name="card" size={16} /></span>
            <span className="min-w-0 flex-1"><span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{E2("TARJETA DEL PLAN", "PLAN CARD")}</span>
              <span className="mt-1 block text-[14px] font-bold">{tarjeta ? tarjetaL(tarjeta) : E2("Elige tu tarjeta", "Choose your card")}</span>
              <span className="mt-0.5 block font-mono text-[9.5px] font-semibold text-ink/50">{declinada && tarjeta?.pm === declinada ? E2("TU BANCO LA RECHAZÓ · CAMBIA DE TARJETA", "YOUR BANK DECLINED IT · CHANGE CARD") : E2(`SE COBRA ${dinero(o.precio)} CADA MES · HOY NADA`, `${dinero(o.precio)} EACH MONTH · NOTHING TODAY`)}</span></span>
            <span className="text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</span>
          </button>
        ) : <div className="rounded-[14px] bg-pro/[.14] px-3.5 py-3 text-[12.5px] font-semibold text-pro-ink">{E2("Este negocio todavía no cobra planes en la app. Llámalo para empezar.", "This business does not charge plans in the app yet. Call them to start.")}</div>}
        <div className={`p-4 ${caja}`}>
          <div className={K}>{E2("CÓMO FUNCIONA", "HOW IT WORKS")}</div>
          <div className="mt-3 flex flex-col gap-2.5">{como.map((t, i) => <div key={i} className="flex items-start gap-2.5"><span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-ink font-mono text-[10px] font-bold text-white">{i + 1}</span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{t}</span></div>)}</div>
        </div>
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div className="hidden lg:block">{barra}</div>
      </div>
      <div data-screen-label="Plan · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px] lg:hidden">{barra}</div>
      <HojaCasa v={v} />
      {hoja && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={declinada} modo={pago.modo} pk={pago.pk} guardarSiempre nota={E2("Se cobra cada mes el día de tu visita. Cancelas cuando quieras.", "Charged each month on your visit day. Cancel any time.")}
          onClose={() => setHoja(false)} onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); if (declinada && t.pm !== declinada) setError(null); }} />
      )}
    </div>
  );
}
