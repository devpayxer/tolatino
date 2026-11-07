"use client";
/* Ficha de Transporte (4x · prototipo neg-trans-listing.js listingAdd L77–97, sheetVals L98–103, resAdd L104–105 y neg-trans-kind.js
   post). Tesis: ¿cuánto es el viaje en total y sale a la hora? La línea fija «El precio del viaje es cerrado antes de salir.» va en la
   pestaña, la hoja, el Resumen y el riel. Precio cerrado con lo que incluye; la próxima salida con los asientos que quedan; la
   licencia verificada. Sin la licencia de su tipo no se reserva en la app («Licencia en revisión»: se llama). El servidor decide. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType, type MouseEvent } from "react";
import { LINEA_TRANS, metaTrans, precioTrans, type SvcTrans } from "@/lib/transporte-comun";
import type { TransPublico } from "@/lib/trans-publico";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const stop = (e?: MouseEvent) => e?.stopPropagation();
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const SALE: Record<string, [string, string]> = { sab: ["Sábado", "Saturday"], mie: ["Miércoles", "Wednesday"], "15d": ["Cada 15 días", "Every 2 weeks"] };

export function useViaje(tp: TransPublico | null, es: boolean, pro: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [hoja, setHoja] = useState<string | null>(null);
  if (!tp) return null;
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), linea = nm(LINEA_TRANS), h = tp.h;
  const btn = (s: SvcTrans) => (s.k === "caja" ? E2("Enviar", "Send") : s.k === "cotiza" ? E2("Pedir precio", "Get a price") : E2("Reservar", "Book"));
  const item = (s: SvcTrans) => { const P = precioTrans(s, es); return { id: s.id, name: nm(s.name), foto: s.foto, price: P.l, meta: [P.s, metaTrans(s, es)].filter(Boolean).join(" · "), btn: btn(s) }; };
  const secs = [...tp.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: tp.servicios.filter((s) => s.sec === sc.id).map(item) })),
    { title: E2("OTROS", "OTHER"), items: tp.servicios.filter((s) => !tp.secciones.some((sc) => sc.id === s.sec)).map(item) }].filter((x) => x.items.length);
  // Notas (L82–83): la línea + lo que incluye el total; el asiento de niño; la licencia en revisión.
  const notes: [string, string][] = [["dollar", `${linea} ${E2("El total incluye lo que dice «incluye». Nada se agrega al llegar.", "The total includes what “includes” says. Nothing is added on arrival.")}`]];
  if (h?.nino) notes.push(["users", E2("Asiento de niño sin costo si lo pides al reservar.", "Free child seat if you ask when booking.")]);
  if (h?.rampa) notes.push(["users", E2("Van con rampa para silla de ruedas.", "Van with a wheelchair ramp.")]);
  if (pro && !tp.licOk) notes.push(["shield", tp.licEnRevision ? E2("Licencia en revisión: por ahora se reserva llamando.", "License under review: for now, book by phone.") : E2("Todavía no muestra su licencia: por ahora se reserva llamando.", "No license shown yet: for now, book by phone.")]);
  const precios = tp.servicios.filter((s) => s.cents > 0).map((s) => s.cents);
  const desde = !pro ? (tp.h24 ? E2("Abierto 24 horas", "Open 24 hours") : E2("Llama para tu viaje", "Call about your trip")) : precios.length ? `${E2("Desde ", "From ")}${usd(Math.min(...precios))}` : E2("Servicios", "Services");
  const disp = tp.h24 ? "24/7" : h?.hoy ? E2("Hoy", "Today") : E2("Con reserva", "By booking");
  const riel: { k: string; v: string }[] = h?.kind === "caja" && h.shipDay
    ? [{ k: E2("PRECIO", "PRICE"), v: E2("Cerrado", "Fixed") }, { k: E2("SALE", "SHIPS"), v: es ? SALE[h.shipDay]![0] : SALE[h.shipDay]![1] }, { k: E2("LLEGA EN", "ARRIVES IN"), v: h.shipWeeks ? E2(`${h.shipWeeks.replace("-", " a ")} semanas`, `${h.shipWeeks.replace("-", " to ")} weeks`) : "—" }]
    : [{ k: E2("PRECIO", "PRICE"), v: E2("Cerrado", "Fixed") }, { k: E2("DISPONIBLE", "AVAILABLE"), v: disp }, h?.rampa ? { k: E2("RAMPA", "RAMP"), v: E2("Sí", "Yes") } : { k: E2("CRUZA ESTADOS", "CROSSES STATES"), v: tp.tags.includes("estados") ? E2("Sí", "Yes") : E2("No", "No") }];
  const llamar = () => { if (tp.negocio.telefono) location.href = `tel:${tp.negocio.telefono}`; };
  return { tp, es, E2, nm, pro, secs, notes, riel, desde, linea, hoja, router, llamar,
    abrir: (id: string, e?: MouseEvent) => { stop(e); if (pro) setHoja(id); }, cerrar: () => setHoja(null), top: tp.servicios.slice(0, pro ? 4 : 5).map(item) };
}
export type Vi = NonNullable<ReturnType<typeof useViaje>>;

function Fila({ v, it, tarjeta }: { v: Vi; it: Vi["top"][number]; tarjeta?: boolean }) {
  const can = v.pro;
  return (
    <div role={can ? "button" : undefined} tabIndex={can ? 0 : undefined} onClick={(e) => v.abrir(it.id, e)} onKeyDown={(e) => { if (can && e.key === "Enter") v.abrir(it.id); }}
      className={`${tarjeta ? "flex items-center gap-[13px] rounded-[18px] border border-ink/[.08] bg-white p-3.5" : "flex items-center gap-[13px] border-b border-ink/[.07] py-3.5"} ${can ? "cursor-pointer" : ""}`}>
      <span className="h-14 w-14 flex-none rounded-[15px] bg-photo-bg" style={fondo(it.foto)} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold leading-[1.3]">{it.name}</div>
        {it.meta && <div className="mt-1 font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{it.meta}</div>}
        <div className="mt-1.5 font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{it.price}</div>
      </div>
      {can && <Button variant="soft" size="md" onClick={(e: MouseEvent) => v.abrir(it.id, e)}>{it.btn}</Button>}
    </div>
  );
}
const Nota = ({ ic, t }: { ic: string; t: string }) => (
  <div className="flex items-start gap-[11px] rounded-2xl bg-action/[.07] px-3.5 py-[13px]"><span className="grid flex-none pt-px"><Icon name={ic} size={17} color="var(--tl-action)" /></span><span className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/75">{t}</span></div>
);

export function ViTab({ v, desk }: { v: Vi; desk: boolean }) {
  return (
    <div data-screen-label={desk ? "Ficha · servicios · desktop" : "Ficha · servicios"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
      {v.notes.map(([ic, t]) => <Nota key={t} ic={ic} t={t} />)}
      <div className="flex flex-col gap-[22px]">
        {v.secs.map((sc) => (
          <div key={sc.title}>
            <div className="font-mono text-[11px] font-extrabold tracking-[0.14em] text-ink/45">{sc.title}</div>
            <div className={desk ? "mt-3 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1"}>{sc.items.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* La hoja del servicio (sheetVals L98–103): foto, precio, salidas, INCLUYE, cómo se paga y la línea. */
export function ViHoja({ v }: { v: Vi }) {
  const { tp, E2, es, nm } = v;
  if (!v.hoja) return null;
  const s = tp.servicios.find((x) => x.id === v.hoja);
  if (!s) return null;
  const P = precioTrans(s, es), meta = metaTrans(s, es), cot = s.k === "cotiza";
  const pago = cot ? E2("Mandas fotos y te dan el precio cerrado. No se cobra nada hasta que lo aceptes.", "Send photos and get a fixed price. Nothing is charged until you accept it.")
    : E2("Se retiene en tu tarjeta al reservar y se cobra cuando confirman. Si no sale o no confirman, se libera completo.", "Held on your card when you book and charged once they confirm. If it does not run or they do not confirm, it is fully released.");
  const enApp = tp.booking;
  const go = () => { if (!enApp) return v.llamar(); v.router.push(`/n/${tp.negocio.id}/viaje?s=${s.id}`); };
  const cta = !tp.booking ? E2("Llama para reservar", "Call to book") : s.k === "caja" ? E2("Enviar una caja", "Send a box") : cot ? E2("Pedir precio cerrado", "Get a fixed price") : E2("Reservar", "Book");
  const ruta = [s.from ? nm(s.from) : "", s.to ? nm(s.to) : ""].filter(Boolean).join(" → ");
  return (
    <div data-screen-label="Servicio · Transporte" className="fixed inset-0 z-[60]">
      <div onClick={v.cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={nm(s.name)} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex-1 overflow-y-auto">
          <div className="relative h-[170px] flex-none bg-photo-bg" style={fondo(s.foto ?? tp.negocio.foto)}>
            <button type="button" aria-label={E2("Cerrar", "Close")} onClick={v.cerrar} className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[.94]"><Icon name="close" size={15} strokeWidth={2.4} /></button>
          </div>
          <div className="flex flex-col gap-4 px-5 pb-6 pt-[18px]">
            <div>
              <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{nm(s.name)}</div>
              <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</span><span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{P.s}</span></div>
              {nm(s.desc) && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{nm(s.desc)}</p>}
            </div>
            {(ruta || meta) && <div className="rounded-2xl bg-paper px-4 py-3">{ruta && <div className="text-[13.5px] font-bold">{ruta}{s.dmin ? ` · ${Math.floor(s.dmin / 60)} h${s.dmin % 60 ? ` ${s.dmin % 60} min` : ""}` : ""}</div>}{meta && <div className="mt-1 font-mono text-[10px] font-semibold tracking-[0.04em] text-ink/55">{meta}</div>}</div>}
            {s.inc.length > 0 && (
              <div data-screen-label="Servicio · incluye" className="rounded-2xl border border-ink/[.08] px-4 py-3">
                <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("EL PRECIO INCLUYE", "THE PRICE INCLUDES")}</div>
                {s.inc.map((z) => <div key={z.es} className="mt-2 flex items-start gap-2 text-[13px] font-semibold leading-[1.45]"><span className="grid flex-none pt-0.5"><Icon name="check" size={14} color="var(--tl-open-text)" /></span>{nm(z)}</div>)}
              </div>)}
            <Nota ic={cot ? "image" : "dollar"} t={`${pago} ${v.linea}`} />
          </div>
        </div>
        <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
          <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{E2("PRECIO CERRADO", "FIXED PRICE")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</div></div>
          <div className="flex min-w-0 flex-1"><Button block icon={!enApp ? "phone" : s.k === "caja" ? "bag" : "calendar"} onClick={go}>{cta}</Button></div>
        </div>
      </div>
    </div>
  );
}

export function ViResumen({ v, desk, onAll }: { v: Vi; desk: boolean; onAll?: () => void }) {
  const { E2, tp, nm } = v;
  const lic = tp.lic.map((l) => nm(l.titulo)).join(" · ");
  const facts: [string, string, string][] = [
    ["dollar", E2("PRECIO", "PRICE"), E2("Cerrado antes de salir, con lo que dice «incluye»", "Fixed before leaving, with what “includes” lists")],
    ...(lic ? [["shield", E2("LICENCIA", "LICENSE"), `${lic} · ${E2("verificada por To’Latino", "verified by To’Latino")}`] as [string, string, string]] : []),
    ...(tp.h?.bags ? [["bag", E2("EQUIPAJE", "LUGGAGE"), `${E2(`${tp.h.bags} maletas incluidas`, `${tp.h.bags} bags included`)}${tp.h.extraBag != null ? E2(` · la extra ${usd(tp.h.extraBag)}`, ` · extra bag ${usd(tp.h.extraBag)}`) : ""}`] as [string, string, string]] : []),
    ["card", E2("PAGO", "PAYMENT"), E2("Con tarjeta al confirmar · si no sale, se devuelve", "By card on confirmation · refunded if it does not run")],
  ];
  return (
    <div>
      {v.pro && (
        <div data-screen-label="Resumen · cuánto es en total" className="mb-5 rounded-[18px] bg-ink px-4 py-4 text-white">
          <div className="font-mono text-[9px] font-bold tracking-[0.14em] text-white/60">{E2("¿CUÁNTO ES EN TOTAL?", "HOW MUCH IN TOTAL?")}</div>
          <div className="mt-1.5 font-display text-[16px] font-extrabold leading-[1.25] tracking-[-0.02em]">{v.linea}</div>
          <div className="mt-1.5 text-pretty text-[12.5px] font-medium leading-[1.55] text-white/70">{E2("Precio cerrado con peajes y lo que incluye. Lo pagas al confirmar; si no sale, se devuelve.", "Fixed price with tolls and what is included. You pay on confirmation; if it does not run, it is refunded.")}</div>
        </div>)}
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]">{E2("Servicios", "Services")}</div>
        {onAll && <button type="button" onClick={onAll} className="text-[12.5px] font-bold text-action">{E2("Ver todos", "See all")}</button>}
      </div>
      <div data-screen-label={desk ? "Resumen desktop · servicios" : "Resumen · servicios"} className={desk ? "mt-4 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1.5"}>
        {v.top.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} />)}
      </div>
      {!v.pro && <div className="mt-3 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{`${E2("No reserva en To’Latino: llama para tu viaje.", "No To’Latino bookings: call about your trip.")} ${v.linea}`}</div>}
      {v.pro && (
        <div data-screen-label="Resumen · datos del viaje" className="mt-6 rounded-[18px] border border-ink/[.08] bg-white px-4">
          {facts.map(([ic, k, val], i) => (
            <div key={k} className={`flex items-start gap-3 py-3.5 ${i ? "border-t border-ink/[.06]" : ""}`}>
              <span className="grid flex-none pt-0.5"><Icon name={ic} size={17} color="rgba(11,14,18,.55)" /></span>
              <div className="min-w-0 flex-1"><div className="font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{k}</div><div className="mt-1 text-pretty text-[13.5px] font-semibold leading-[1.45]">{val}</div></div>
            </div>))}
        </div>)}
    </div>
  );
}

function Cta({ v, onCta, block }: { v: Vi; onCta: () => void; block?: boolean }) {
  const { E2 } = v;
  if (!v.pro || !v.tp.booking) return v.tp.negocio.telefono ? <Button icon="phone" block={block} onClick={v.llamar}>{E2("Llamar", "Call")}</Button> : null;
  return <Button icon="calendar" block={block} onClick={onCta}>{E2("Reservar", "Book")}</Button>;
}
export function ViRiel({ v, onCta }: { v: Vi; onCta: () => void }) {
  const { E2 } = v;
  return (
    <div data-screen-label="Ficha · Booking · columna" className="flex flex-col gap-4 rounded-[22px] border border-ink/10 bg-white p-[22px] shadow-[0_24px_48px_-34px_rgba(11,14,18,.45)]">
      <div className="font-display text-[28px] font-extrabold leading-none tracking-[-0.04em]">{v.desde}</div>
      {v.pro && <div className="grid grid-cols-3 gap-2">
        {v.riel.map((m) => <div key={m.k} className="min-w-0 rounded-[14px] bg-paper px-2.5 py-[11px]"><div className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-ink/45">{m.k}</div><div className="mt-1.5 text-[13px] font-bold leading-[1.3]">{m.v}</div></div>)}
      </div>}
      <div className="text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60">{v.pro && v.tp.booking ? `${v.linea} ${E2("Reservas aquí; el negocio confirma.", "Book here; the business confirms.")}` : `${v.linea} ${E2("Llama para tu viaje.", "Call about your trip.")}`}</div>
      <div className="flex"><Cta v={v} onCta={onCta} block /></div>
    </div>
  );
}
export function ViBarra({ v, onCta }: { v: Vi; onCta: () => void }) {
  if (v.hoja) return null;
  const sub = v.pro ? `${v.riel[1]!.k} · ${v.riel[1]!.v}` : v.tp.zone ? v.E2(`VA HASTA ${v.tp.zone} MI`, `TRAVELS ${v.tp.zone} MI`) : "";
  return (
    <div data-screen-label="Ficha · barra de Transporte" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{v.desde}</div>
        {sub && <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{sub.toUpperCase()}</div>}
      </div>
      <Cta v={v} onCta={onCta} />
    </div>
  );
}
