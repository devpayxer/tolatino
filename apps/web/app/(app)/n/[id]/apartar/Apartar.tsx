"use client";
/* APP-NEG-TIENDA-APARTADO (diseño neg-tienda-flow.js › bookVals, sobre la vista del Booking de Auto/Hogar):
   1 Tu apartado (lo que apartaste, nota para la tienda, avisos por SMS) → 2 Cuándo pasas (hoy, mañana o pasado; la hora)
   → 3 Revisa y envía (precio, cómo se paga: hoy $0 · en la caja; bueno saber). En escritorio, todo en una página con el
   resumen al lado. Compuesto con el sistema de diseño. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { OpcionesApartar } from "@/lib/apartados";
import { guardarCarrito, leerCarrito, type Carrito } from "../Tienda";
import { mandarApartado } from "./acciones";

type N = "Icon" | "Button" | "StepHeader" | "DateStrip" | "TimeSlots" | "PaymentSummary";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, StepHeader, DateStrip, TimeSlots, PaymentSummary } = UI as unknown as Record<N, ComponentType<any>>;
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const dinero = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const DOW = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const hL = (m: number) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`; };

export function Apartar({ o, es, yo }: { o: OpcionesApartar; es: boolean; yo: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [carro, setCarro] = useState<Carrito | null>(null), [paso, setPaso] = useState(0), [nota, setNota] = useState(""), [sms, setSms] = useState(true);
  const [i, setI] = useState(() => Math.max(0, o.dias.findIndex((d) => d.horas.length))), [h, setH] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null);
  const clave = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "");
  useEffect(() => { setCarro(leerCarrito(o.negocio.id).filter((l) => o.arts.some((a) => a.id === l.item))); }, [o]);
  const volver = () => router.push(`/n/${o.negocio.id}?tab=shop`);
  const L = (carro ?? []).map((l) => ({ ...l, a: o.arts.find((x) => x.id === l.item)! })).filter((l) => l.a);
  const tot = L.reduce((s, l) => s + l.a.precio * l.qty, 0), n = L.reduce((s, l) => s + l.qty, 0);
  const quitar = (id: string) => { const c = (carro ?? []).filter((l) => l.item !== id); setCarro(c); guardarCarrito(o.negocio.id, c); };
  const dia = o.dias[i] ?? null, dL = (k: string, f: string) => { const d = new Date(`${f}T12:00:00Z`); return k === "hoy" ? E2("Hoy", "Today") : k === "man" ? E2("Mañana", "Tomorrow") : `${(es ? DOW.es : DOW.en)[d.getUTCDay()]!.charAt(0)}${(es ? DOW.es : DOW.en)[d.getUTCDay()]!.slice(1).toLowerCase()} ${d.getUTCDate()}`; };
  const whenL = dia && h != null ? `${dL(dia.k, dia.f)} · ${hL(h)}` : "—";
  const miss = [!L.length ? E2("Tu apartado está vacío", "Your hold is empty") : null, h == null ? E2("Elige cuándo pasas", "Pick when you come") : null].filter(Boolean) as string[];
  const okPaso = paso === 0 ? L.length > 0 : h != null && L.length > 0;
  const enviar = async () => {
    if (!yo) return router.push(`/entrar?volver=${encodeURIComponent(location.pathname)}`);
    if (miss.length || ocupado || !dia || h == null) return;
    setOcupado(true); setError(null);
    const r = await mandarApartado({ negocio: o.negocio.id, lineas: L.map((l) => ({ item: l.item, qty: l.qty })), dia: dia.f, hora: h, nota, sms, clave: clave.current }).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (r.ok) { guardarCarrito(o.negocio.id, []); router.push(`/apartado/${r.numero}`); } else setError(es ? r.msg.es : r.msg.en);
  };
  const sigue = () => { if (paso < 2) { setPaso(paso + 1); window.scrollTo({ top: 0 }); } else void enviar(); };
  const LINE = E2("El precio que ves es el que pagas en la caja.", "The price you see is the price you pay at the register.");
  const tarjetaAp = (
    <div className={`flex items-center gap-3 p-4 ${caja}`}>
      <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name="bag" size={20} color="var(--tl-white)" /></span>
      <span className="min-w-0 flex-1"><span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{E2("TU APARTADO", "YOUR HOLD")}</span>
        <span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{`${n} ${n === 1 ? E2("artículo", "item") : E2("artículos", "items")} · ${dinero(tot)}`}</span>
        <span className="mt-1.5 flex items-center gap-[5px] text-[11.5px] font-bold text-open-text"><Icon name="check" size={13} color="currentColor" />{LINE}</span></span>
      <button type="button" onClick={volver} className="flex-none text-[12.5px] font-bold text-action">{E2("Editar", "Edit")}</button>
    </div>
  );
  const lineas = (
    <div className={`flex flex-col gap-2.5 p-4 ${caja}`}>
      {carro && !L.length && <div className="text-[12.5px] font-medium text-ink/60">{E2("No tienes nada apartado en esta tienda.", "You have nothing on hold at this store.")}</div>}
      {L.map((l) => (
        <div key={l.item} className="flex items-center gap-3">
          <span className="h-12 w-12 flex-none rounded-xl bg-photo-bg" style={l.a.foto ? { backgroundImage: `url(${l.a.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
          <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold leading-[1.3]">{nm(l.a.n)}</span><span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{`× ${l.qty} · ${dinero(l.a.precio * l.qty)}`}</span></span>
          <button type="button" onClick={() => quitar(l.item)} className="flex-none text-[12px] font-bold text-danger">{E2("Quitar", "Remove")}</button>
        </div>))}
    </div>
  );
  const notaB = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div>
        <div className="flex justify-between gap-2.5"><span className="font-display text-[16px] font-extrabold tracking-[-0.03em]">{E2("Nota para la tienda", "Note for the store")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length} / 200</span></div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 200))} rows={2} aria-label={E2("Nota para la tienda", "Note for the store")} placeholder={E2("Ej.: es para regalo…", "E.g. it is a gift…")} className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
      </div>
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{E2("Avisos por SMS", "Text updates")}</span><span className="mt-0.5 block text-[12px] font-medium text-ink/55">{E2("Cuando esté listo y antes de que venza.", "When it is ready and before it expires.")}</span></span>
        <span role="switch" aria-checked={sms} aria-label={E2("Avisos por SMS", "Text updates")} tabIndex={0} onClick={() => setSms(!sms)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSms(!sms); } }} className="relative h-6 w-[42px] flex-none cursor-pointer rounded-full" style={{ background: sms ? "var(--tl-ink)" : "rgba(11,14,18,.15)" }}><span className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-[left]" style={{ left: sms ? 21 : 3 }} /></span>
      </div>
    </div>
  );
  const dias = o.dias.map((d, k) => ({ id: `d${k}`, dow: d.k === "hoy" ? E2("HOY", "TODAY") : (es ? DOW.es : DOW.en)[new Date(`${d.f}T12:00:00Z`).getUTCDay()], num: String(new Date(`${d.f}T12:00:00Z`).getUTCDate()), off: !d.horas.length }));
  const cuando = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div><div className={K}>{E2("DÍA", "DAY")}</div><div className="mt-[11px] grid min-w-0"><DateStrip days={dias} selected={`d${i}`} onSelect={(id: string) => { setI(Number(id.slice(1))); setH(null); }} /></div></div>
      <div><div className={K}>{E2("HORA EN QUE PASAS", "PICKUP TIME")}</div>
        {dia?.horas.length ? <div className="mt-[9px] grid"><TimeSlots slots={dia.horas.map((m) => ({ t: hL(m), taken: false }))} selected={h != null ? hL(h) : ""} onSelect={(t: string) => { const m = dia.horas.find((z) => hL(z) === t); if (m != null) setH(m); }} /></div>
          : <div className="mt-2 text-[12.5px] font-medium text-ink/60">{E2("Cerrado ese día.", "Closed that day.")}</div>}</div>
      <div className="flex items-start gap-2 rounded-[12px] bg-paper px-3 py-2.5"><span className="grid flex-none pt-0.5"><Icon name="clock" size={14} color="var(--tl-open-text)" /></span><span className="text-pretty text-[12px] font-semibold leading-[1.45] text-ink/70">{E2("Te lo guardan 48 horas desde esa hora.", "They keep it 48 hours from that time.")}</span></div>
    </div>
  );
  const filas: [string, string][] = [[E2("ARTÍCULOS", "ITEMS"), String(n)], [E2("CÓMO", "HOW"), E2("Recoger en tienda", "Pick up in store")], [E2("CUÁNDO", "WHEN"), whenL], [E2("TE LO GUARDAN", "HELD UNTIL"), E2("48 horas", "48 hours")]];
  const resumen = (
    <div className={`overflow-hidden ${caja}`}>
      <div className="border-b border-ink/[.07] px-[15px] py-3.5"><div className={K}>{E2("RESUMEN", "SUMMARY")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{E2("Tu apartado", "Your hold")}</div><div className="mt-1 font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{o.negocio.nombre.toUpperCase()}</div></div>
      <div className="px-[15px] py-0.5">{filas.map(([k, v2], z) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${z ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v2}</span></div>)}</div>
    </div>
  );
  const pay = { screenLabel: "Apartado · pago", priceLabel: E2("PRECIO", "PRICE"), lines: L.map((l) => ({ label: `${nm(l.a.n)} · × ${l.qty}`, value: dinero(l.a.precio * l.qty) })), totalLabel: E2("En la caja", "At the register"), total: dinero(tot), howLabel: E2("CÓMO SE PAGA", "HOW YOU PAY"), bar: null,
    rows: [{ label: E2("Hoy", "Today"), sub: E2("Apartar no cobra nada.", "Holding costs nothing."), value: dinero(0), dot: "var(--tl-ink)", color: "var(--tl-ink)" }, { label: E2("En la caja", "At the register"), sub: E2("Lo mismo que ves aquí.", "The same as you see here."), value: dinero(tot), dot: "rgba(11,14,18,.18)", color: "var(--tl-ink)" }], card: null };
  const bueno = (
    <div className={`p-4 ${caja}`}>
      <div className={K}>{E2("BUENO SABER", "GOOD TO KNOW")}</div>
      <div className="mt-3 flex flex-col gap-2.5">{[LINE, E2("Si no pasas en 48 horas, vuelve al estante y no se cobra nada.", "If you do not come within 48 hours, it goes back on the shelf and nothing is charged."), E2("La tienda confirma que lo tiene; si falta algo, tú decides si sigues con lo demás.", "The store confirms it has it; if something is missing, you decide whether to keep the rest.")].map((t, z) => <div key={z} className="flex items-start gap-2.5"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open)" strokeWidth={2.2} /></span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{t}</span></div>)}</div>
    </div>
  );
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const T = [E2("Tu apartado", "Your hold"), E2("Cuándo pasas", "When you come"), E2("Revisa y envía", "Review and send")];
  return (
    <div className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-NEG-TIENDA-APARTADO · móvil" className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid"><StepHeader title={T[paso]} step={paso + 1} total={3} backLabel={E2("Volver", "Back")} onBack={paso > 0 ? () => { setPaso(paso - 1); window.scrollTo({ top: 0 }); } : volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">
          {paso === 0 && <>{tarjetaAp}{lineas}{notaB}</>}
          {paso === 1 && cuando}
          {paso === 2 && <>{resumen}<PaymentSummary {...pay} />{bueno}</>}
          {errorBox}
        </div>
        <div data-screen-label="Apartado · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{E2("HOY PAGAS", "TODAY YOU PAY")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{dinero(0)}</div>
              <div className="mt-1 font-mono text-[8.5px] font-semibold tracking-[0.08em] text-ink/45">{`${E2("EN LA CAJA ", "AT THE REGISTER ")}${dinero(tot)}`}</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!okPaso || ocupado} onClick={sigue}>{paso === 2 ? (ocupado ? E2("Apartando…", "Holding…") : E2("Apartar", "Hold")) : E2("Continuar", "Continue")}</Button></div>
          </div>
          {!okPaso && miss[0] && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{(paso === 0 ? miss[0] : miss[miss.length - 1]!).toUpperCase()}</div>}
        </div>
      </div>
      <div data-screen-label="APP-NEG-TIENDA-APARTADO · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{o.negocio.nombre}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">{E2("Tu apartado", "Your hold")}</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{o.negocio.nombre.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{T[0]}</div><div className="flex flex-col gap-3">{tarjetaAp}{lineas}{notaB}</div></div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{T[1]}</div>{cuando}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Antes de enviar", "Before you send")}</div>{bueno}</div>
          </div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            {resumen}<PaymentSummary {...pay} />
            <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              {miss.length > 0 && <div className="text-center text-[12px] font-bold text-pro-ink">{miss[0]}</div>}
              <div className="flex items-center gap-3.5">
                <div className="flex-none pl-0.5"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{E2("HOY PAGAS", "TODAY YOU PAY")}</div><div className="mt-1 font-display text-[21px] font-extrabold leading-none tracking-[-0.02em]">{dinero(0)}</div></div>
                <div className="flex min-w-0 flex-1"><Button variant="primary" block disabled={miss.length > 0 || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Apartando…", "Holding…") : E2("Apartar", "Hold")}</Button></div>
              </div>
              {errorBox}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
