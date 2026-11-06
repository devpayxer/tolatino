"use client";
/* APP-NEG-RENTAR (diseño neg-hogar-plan.js › rentForm, sobre la vista del pre-estimado): dónde la recoges (te la guardan
   48 horas), cuántos días (la semana paga 5), cuándo la recoges, la tarjeta con la que se cobra al recoger y cómo se cobra.
   Hoy no se cobra nada. Compuesto con el sistema de diseño. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import type { OpcionesRenta } from "@/lib/rentas";
import { MetodoPago, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../../pago/MetodoPago";
import { apartarLaRenta } from "./acciones";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const dinero = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const DIAS = [1, 2, 3, 7] as const;
const costo = (p: number, d: number) => (d >= 7 ? p * 5 : p * d);
const DL = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const MO = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const hL = (h: string) => { const [a, b] = h.split(":").map(Number); const H = (a ?? 0) % 24; return `${H % 12 || 12}${b ? `:${String(b).padStart(2, "0")}` : ""} ${H < 12 ? "AM" : "PM"}`; };
const addD = (f: string, n: number) => { const d = new Date(`${f}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export function Rentar({ o, es, yo, pago }: { o: OpcionesRenta; es: boolean; yo: boolean; pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [dias, setDias] = useState<number>(1), [pick, setPick] = useState(o.dias[0]?.f ?? null);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null);
  const [hoja, setHoja] = useState(false), [declinada, setDeclinada] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const clave = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "");
  const a = o.art, name = nm(a.n), cost = costo(a.precio, dias), back = pick ? addD(pick, dias) : null;
  const fL = (f: string) => { const d = new Date(`${f}T12:00:00Z`); return es ? `el ${DL.es[d.getUTCDay()]} ${d.getUTCDate()} de ${MO.es[d.getUTCMonth()]}` : `${DL.en[d.getUTCDay()]}, ${MO.en[d.getUTCMonth()]} ${d.getUTCDate()}`; };
  const pickL = (d: OpcionesRenta["dias"][number]) => { const x = new Date(`${d.f}T12:00:00Z`); return d.k === "hoy" ? E2("Hoy", "Today") : d.k === "man" ? E2("Mañana", "Tomorrow") : es ? `${DL.es[x.getUTCDay()]!.charAt(0).toUpperCase()}${DL.es[x.getUTCDay()]!.slice(1)} ${x.getUTCDate()}` : `${DL.en[x.getUTCDay()]} ${x.getUTCDate()}`; };
  const pickS = (d: OpcionesRenta["dias"][number]) => (d.h24 ? E2("Abierto 24 horas", "Open 24 hours") : d.k === "hoy" ? `${E2("Hasta las ", "Until ")}${hL(d.z)}` : `${hL(d.a)} – ${hL(d.z)}`);
  const miss = [!pick ? E2("Elige cuándo la recoges", "Pick when you pick it up") : null, o.tarjeta && !tarjeta ? E2("Elige la tarjeta", "Choose the card") : null].filter(Boolean) as string[];
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const enviar = async () => {
    if (!yo) return entrar();
    if (miss.length || ocupado || !pick || !tarjeta || !o.tarjeta) return;
    setOcupado(true); setError(null);
    const r = await apartarLaRenta({ negocio: o.negocio.id, item: a.id, dias, recoger: pick, pm: tarjeta.pm, clave: clave.current }).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (r.ok) router.push(`/renta/${r.numero}`); else { setError(es ? r.msg.es : r.msg.en); if ("tarjeta" in r && r.tarjeta) setDeclinada(tarjeta.pm); }
  };
  const how = [E2("Hoy no se cobra nada: te la apartan 48 horas.", "Nothing today: it is held for 48 hours."),
    E2(`Al recogerla se cobran ${dinero(cost)} de renta y se retiene el depósito de ${dinero(a.dep)}.`, `At pickup ${dinero(cost)} rent is charged and the ${dinero(a.dep)} deposit is held.`),
    E2(`La devuelves ${back ? fL(back) : "el último día"} y se libera el depósito. Si llega tarde, se cobra un día más; si llega dañada, te enseñan el daño con foto antes de descontar.`, `Return it on ${back ? fL(back) : "the last day"} and the deposit is released. If late, one more day is charged; if damaged, they show you with a photo before deducting.`)];
  const sinDep = a.dep === 0;
  if (sinDep) how[1] = E2(`Al recogerla se cobran ${dinero(cost)} de renta. No pide depósito.`, `At pickup ${dinero(cost)} rent is charged. No deposit.`);
  const barra = (
    <div className="flex flex-col gap-2">
      {miss.length > 0 && <div className="text-[12px] font-semibold leading-[1.45] text-ink/60"><span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{E2("TE FALTA · ", "STILL NEEDED · ")}</span>{miss.join(" · ")}</div>}
      <span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-open-text">{E2("HOY NO SE COBRA NADA", "NOTHING IS CHARGED TODAY")}</span>
      <div className="grid"><Button block disabled={miss.length > 0 || ocupado || !o.tarjeta} onClick={enviar}>{ocupado ? E2("Apartando…", "Holding…") : `${E2("Apartar · ", "Hold · ")}${dinero(cost)}${E2(" al recoger", " at pickup")}`}</Button></div>
    </div>
  );
  return (
    <div data-screen-label="APP-NEG-RENTAR" className="min-h-[100dvh] bg-paper pb-[190px] lg:pb-14">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver", "Back")} onClick={() => router.push(`/n/${o.negocio.id}?tab=shop`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={16} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{`${E2("Rentar · ", "Rent · ")}${name}`}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${dinero(a.precio)}${E2("/DÍA · ", "/DAY · ")}${sinDep ? E2("SIN DEPÓSITO", "NO DEPOSIT") : `${E2("DEPÓSITO ", "DEPOSIT ")}${dinero(a.dep)}`} · ${o.negocio.nombre}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[620px] flex-col gap-3 px-4 pt-4">
        <div className={`flex flex-col gap-3 p-4 ${caja}`}>
          <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("Dónde la recoges", "Where you pick it up")}</div>
          <div className="flex w-full items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px]">
            <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name="store" size={20} color="var(--tl-white)" /></span>
            <span className="min-w-0 flex-1"><span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{E2("RECOGES EN", "PICK UP AT")}</span>
              <span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{o.negocio.nombre}</span>
              {o.negocio.dir && <span className="mt-[3px] block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{o.negocio.dir.replace(/, Hazleton,? PA.*$/i, "").toUpperCase()}</span>}
              <span className="mt-1.5 flex items-center gap-[5px] text-[11.5px] font-bold text-open-text"><Icon name="check" size={13} color="currentColor" />{E2("Te la guardan 48 horas", "Held for you 48 hours")}</span></span>
            <button type="button" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o.negocio.dir || o.negocio.nombre)}`, "_blank", "noopener")} className="flex-none text-[12.5px] font-bold text-action">{E2("Cómo llegar", "Directions")}</button>
          </div>
        </div>
        <div className={`flex flex-col gap-3 p-4 ${caja}`}>
          <div><div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("¿Cuántos días?", "How many days?")}</div>
            <div className="mt-1 text-[12px] font-medium text-ink/55">{E2("Precio por día. La semana cuesta 5 días.", "Price per day. A week costs 5 days.")}</div></div>
          <div className="flex flex-wrap gap-2">{DIAS.map((d) => <Chip key={d} variant={dias === d ? "selected" : "filter"} onClick={() => setDias(d)}>{d === 7 ? E2("Semana · paga 5 días", "Week · pay 5 days") : `${d}${d === 1 ? E2(" día", " day") : E2(" días", " days")}`}</Chip>)}</div>
        </div>
        <div className={`flex flex-col gap-2.5 p-4 ${caja}`} role="radiogroup" aria-label={E2("¿Cuándo la recoges?", "When do you pick it up?")}>
          <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{E2("¿Cuándo la recoges?", "When do you pick it up?")}</div>
          {o.dias.length === 0 && <div className="text-[12.5px] font-medium text-ink/60">{E2("El negocio no abre en los próximos días. Llámalo.", "The business is not open in the next few days. Call them.")}</div>}
          {o.dias.map((d) => { const on = pick === d.f; return (
            <button key={d.f} type="button" role="radio" aria-checked={on} onClick={() => setPick(d.f)} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
              <span className={`h-[18px] w-[18px] flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
              <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{pickL(d)}</span><span className="mt-0.5 block text-[12px] font-medium text-ink/55">{pickS(d)}</span></span>
            </button>); })}
        </div>
        {o.tarjeta && pago ? (
          <button type="button" data-screen-label="Rentar · tarjeta" onClick={() => (yo ? setHoja(true) : entrar())} className={`flex w-full items-center gap-3 p-4 text-left ${caja}`}>
            <span className="grid h-9 w-9 flex-none place-items-center rounded-[11px] bg-ink/5"><Icon name="card" size={16} /></span>
            <span className="min-w-0 flex-1"><span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{E2("SE COBRA AL RECOGER CON", "CHARGED AT PICKUP TO")}</span>
              <span className="mt-1 block text-[14px] font-bold">{tarjeta ? tarjetaL(tarjeta) : E2("Elige tu tarjeta", "Choose your card")}</span>
              <span className="mt-0.5 block font-mono text-[9.5px] font-semibold text-ink/50">{declinada && tarjeta?.pm === declinada ? E2("TU BANCO LA RECHAZÓ · CAMBIA DE TARJETA", "YOUR BANK DECLINED IT · CHANGE CARD") : E2("HOY NO SE COBRA NADA", "NOTHING IS CHARGED TODAY")}</span></span>
            <span className="text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</span>
          </button>
        ) : <div className="rounded-[14px] bg-pro/[.14] px-3.5 py-3 text-[12.5px] font-semibold text-pro-ink">{E2("Este negocio todavía no renta en la app. Llámalo para apartarla.", "This business does not take rentals in the app yet. Call them to hold it.")}</div>}
        <div className={`p-4 ${caja}`}>
          <div className={K}>{E2("CÓMO SE COBRA", "HOW YOU ARE CHARGED")}</div>
          <div className="mt-3 flex flex-col gap-2.5">{how.map((t, i) => <div key={i} className="flex items-start gap-2.5"><span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-ink font-mono text-[10px] font-bold text-white">{i + 1}</span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{t}</span></div>)}</div>
          {!sinDep && <div className="mt-3.5 flex items-start gap-2 rounded-[12px] bg-paper px-3 py-2.5"><span className="grid flex-none pt-0.5"><Icon name="shield" size={14} color="var(--tl-open-text)" /></span><span className="text-pretty text-[12px] font-semibold leading-[1.45] text-ink/70">{E2("Lo retenido no es un cobro: el depósito vuelve a tu tarjeta al devolverla.", "A hold is not a charge: the deposit returns to your card when you bring it back.")}</span></div>}
        </div>
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div className="hidden lg:block">{barra}</div>
      </div>
      <div data-screen-label="Rentar · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px] lg:hidden">{barra}</div>
      {hoja && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={declinada} modo={pago.modo} pk={pago.pk} guardarSiempre nota={E2("Se cobra al recoger la herramienta. Hoy no se cobra nada.", "Charged when you pick up the tool. Nothing today.")}
          onClose={() => setHoja(false)} onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); if (declinada && t.pm !== declinada) setError(null); }} />
      )}
    </div>
  );
}
