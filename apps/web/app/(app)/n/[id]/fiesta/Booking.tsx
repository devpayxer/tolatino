"use client";
/* APP-NEG-FIESTA-BOOKING · móvil y desktop (neg-fiesta-flow.js bookVals, vistas «ab»). 1 Tu fiesta (qué celebras, invitados,
   cuántas horas o cuántas unidades, nota) → 2 Fecha y hora (el calendario real: ocupada no se elige; la hora de inicio; si van
   a tu lugar, ¿dónde es la fiesta?) → 3 Revisa y envía (precio, cómo se paga, tu depósito en cada caso, avisos por SMS).
   En el teléfono un paso a la vez; en escritorio, todo en una página con la columna de pago. La línea fija «La fecha no es
   tuya hasta que te la confirmen.» va en cada paso. Lo decide el servidor (pedirFecha); la pantalla solo muestra. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import { diaFiesta, EVT, GUESTS, LINEA_FIESTA, metaFiesta, precioFiesta, sumarDias } from "@/lib/fiestas-comun";
import type { BookingFiesta } from "@/lib/fiestas-reservas";
import { MetodoPago, marcaB, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../../pago/MetodoPago";
import { pedirFechaAccion } from "./acciones";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button" | "Chip" | "StepHeader" | "DateStrip" | "TimeSlots" | "PaymentSummary" | "DepositOutcomes" | "QtyStepper";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, StepHeader, DateStrip, TimeSlots, PaymentSummary, DepositOutcomes, QtyStepper } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const dinero = (c: number) => { const d = c / 100; return `$${d % 1 ? d.toFixed(2) : Math.round(d).toLocaleString("en-US")}`; };
const horaL = (m: number) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const DOW = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const HF = [600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200], HV = [600, 660, 780, 840, 900, 960];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function BookingFiestaV({ b, es, pago, yo, inicial }: {
  b: BookingFiesta; es: boolean; pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null; yo: boolean; inicial: { dia: string | null; e: string; g: number | null };
}) {
  const E2 = (a: string, z: string) => (es ? a : z);
  const router = useRouter();
  const s = b.svc, vis = s.k === "visita", nm = (x: { es: string; en: string }) => (es ? x.es : x.en || x.es), linea = nm(LINEA_FIESTA);
  const libre = (d: string) => vis || !b.ocupadas.includes(d);
  const dentro = (d: string) => d > b.hoy && d <= b.hasta;
  const dia0 = inicial.dia && dentro(inicial.dia) && libre(inicial.dia) ? inicial.dia : (() => { for (let i = 1; i < 120; i++) { const d = sumarDias(b.hoy, i); if (dentro(d) && libre(d)) return d; } return sumarDias(b.hoy, 1); })();
  const [paso, setPaso] = useState(0), [dia, setDia] = useState(dia0), [hSel, setH] = useState<number | null>(null);
  const [ev, setEv] = useState(EVT.some((z) => z[0] === inicial.e) ? inicial.e : ""), [g, setG] = useState<number>(inicial.g && GUESTS.includes(inicial.g as never) ? inicial.g : 50);
  const [horas, setHoras] = useState(s.min ?? 1), [qty, setQty] = useState(Math.max(1, s.min ?? 1)), [nota, setNota] = useState(""), [sms, setSms] = useState(true);
  const dirDef = b.dirs.find((d) => d.def && d.enZona);
  const [donde, setDonde] = useState<{ k: "casa" | "salon"; id: string } | null>(dirDef ? { k: "casa", id: dirDef.id } : null);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null);
  const [hoja, setHoja] = useState(false), [declinada, setDeclinada] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const clave = useRef(uuid());

  // Lo que se cobra (la vista; el servidor recalcula con la misma regla al enviar).
  const qtyR = s.k === "unid" ? Math.min(2000, Math.max(s.min ?? 1, s.per ? Math.ceil(g / s.per) : qty)) : 1;
  const hR = s.k === "hora" ? Math.min(12, Math.max(s.min ?? 1, horas)) : null;
  const tot = vis ? 0 : s.k === "hora" ? s.cents * hR! : s.cents * qtyR;
  const dur = vis ? 30 : s.k === "pack" && s.h ? Math.min(600, Math.max(60, s.h * 60)) : s.k === "hora" ? hR! * 60 : 240;
  const dep = vis || !b.depositoEnApp ? 0 : Math.min(b.aj.dep, tot), rest = Math.max(0, tot - dep);
  const max = Math.min(b.aj.guests ?? 99999, s.cap ?? 99999), capBad = !vis && g > max;
  const P = precioFiesta(s, es), qL = s.k === "unid" ? `${qtyR} × ${dinero(s.cents)}` : s.k === "hora" ? `${hR} h × ${dinero(s.cents)}` : "";
  // Las horas del día: tomadas solo si ese día ya no caben más fiestas a esa hora (salen de las reservas, nunca al azar).
  const T = b.tomadas[dia] ?? [];
  const slots = (vis ? HV : HF).map((m) => ({ m, t: horaL(m), taken: !vis && T.filter((z) => m < z.m + z.d && z.m < m + dur).length >= b.aj.perDay }));
  const libreHoy = libre(dia) && dentro(dia);
  const dias = Array.from({ length: Math.min(60, Math.max(1, Math.round((Date.parse(b.hasta) - Date.parse(b.hoy)) / 864e5))) }, (_, k) => sumarDias(b.hoy, k + 1))
    .map((d) => ({ id: d, dow: (es ? DOW.es : DOW.en)[new Date(`${d}T12:00:00Z`).getUTCDay()], num: String(Number(d.slice(8))), off: !libre(d) }));
  const lejos = !dias.some((x) => x.id === dia) ? dia : "";
  const dondeL = !b.va ? (b.negocio.direccion ?? b.negocio.nombre) : donde ? (donde.k === "casa" ? b.dirs.find((d) => d.id === donde.id)?.t : b.salones.find((x) => x.id === donde.id)?.nombre) ?? "—" : "—";
  const evL = EVT.find((z) => z[0] === ev);
  const ok0 = (vis || !!ev) && !capBad;
  const ok1 = libreHoy && hSel != null && !slots.find((z) => z.m === hSel)?.taken && (!b.va || !!donde);
  const listo = ok0 && ok1 && (!dep || !!tarjeta);
  const falta = !vis && !ev ? E2("Elige qué celebras", "Pick what you are celebrating") : capBad ? E2(`Caben hasta ${max} invitados`, `Fits up to ${max} guests`)
    : !libreHoy ? E2("Esa fecha está ocupada. Elige otra.", "That date is booked. Pick another.") : hSel == null ? E2("Elige la hora de inicio", "Pick the start time")
      : b.va && !donde ? E2("Elige dónde es la fiesta", "Pick where the party is") : dep && !tarjeta ? E2("Elige la tarjeta del depósito", "Choose the deposit card") : "";
  const okPaso = paso === 0 ? ok0 : paso === 1 ? ok1 : listo;
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const volver = () => router.push(`/n/${b.negocio.id}?tab=svc`);
  const enviar = async () => {
    if (!listo || ocupado || hSel == null) return;
    if (!yo) return entrar();
    setOcupado(true); setError(null);
    const r = await pedirFechaAccion(b.negocio.id, { svc: s.id, day: dia, m: hSel, e: ev, g: vis ? null : g, qty: qtyR, horas: hR, donde: b.va ? donde : null, nota, sms, pm: dep ? tarjeta?.pm ?? null : null, clave: clave.current })
      .catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (r.ok) { router.push(`/fiesta/${r.numero}`); return; }
    if ("entrar" in r && r.entrar) return entrar();
    setError(es ? r.msg.es : r.msg.en); setOcupado(false);
    if ("tarjeta" in r && r.tarjeta && tarjeta) { setDeclinada(tarjeta.pm); clave.current = uuid(); }
    if ("fecha" in r && r.fecha) { setH(null); setPaso(1); router.refresh(); }
  };
  const sigue = () => { if (!okPaso) return; if (paso === 2) return void enviar(); setPaso(paso + 1); window.scrollTo({ top: 0 }); };
  const TT = vis ? [E2("Tu visita", "Your tour"), E2("Día y hora", "Day and time"), E2("Revisa y envía", "Review and send")] : [E2("Tu fiesta", "Your party"), E2("Fecha y hora", "Date and time"), E2("Revisa y envía", "Review and send")];

  // ── Bloques ──
  const tarjetaSvc = (
    <div className={`flex items-center gap-[13px] px-[15px] py-3.5 ${caja}`}>
      <span className="h-[54px] w-[54px] flex-none rounded-[15px] bg-photo-bg" style={s.foto ? { backgroundImage: `url(${s.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{nm(s.name)}</div>
        <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{[P.l, metaFiesta(s, es), dep ? `${E2("DEPÓSITO ", "DEPOSIT ")}${dinero(dep)}` : ""].filter(Boolean).join(" · ").toUpperCase()}</div>
      </div>
      <button type="button" onClick={volver} className="flex-none text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</button>
    </div>
  );
  const lineaNota = <div className="flex items-start gap-2.5 rounded-[14px] bg-action/[.07] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="dateFree" size={16} color="var(--tl-action)" /></span><span className="text-pretty text-[12.5px] font-bold leading-[1.45] text-action-hover">{linea}</span></div>;
  const bloqueFiesta = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      {vis ? <div className="text-pretty text-[13px] font-medium leading-[1.55] text-ink/70">{E2("La visita es gratis y no aparta la fecha. Si te gusta, pides la fecha con depósito.", "The tour is free and does not hold the date. If you like it, request the date with a deposit.")}</div> : (<>
        <div><div className={K}>{E2("EVENTO", "EVENT")}</div><div className="mt-2 flex flex-wrap gap-2">{EVT.map(([k, a, z]) => <Chip key={k} variant={ev === k ? "selected" : "filter"} onClick={() => setEv(ev === k ? "" : k)}>{es ? a : z}</Chip>)}</div></div>
        <div>
          <div className={K}>{E2("¿CUÁNTOS INVITADOS?", "HOW MANY GUESTS?")}</div>
          <div role="radiogroup" aria-label={E2("Cuántos invitados", "How many guests")} className="mt-2 grid grid-cols-2 gap-2">
            {GUESTS.map((n) => { const on = g === n; return (
              <button key={n} type="button" role="radio" aria-checked={on} onClick={() => setG(n)} className={`flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
                <span className={`box-border h-[18px] w-[18px] flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
                <span className="min-w-0 flex-1 text-[13px] font-bold">{n === 300 ? "300+" : n}{E2(" invitados", " guests")}</span>
                {s.k === "unid" && s.per && <span className="font-mono text-[10px] font-semibold text-ink/50">{dinero(s.cents * Math.max(s.min ?? 1, Math.ceil(n / s.per)))}</span>}
              </button>); })}
          </div>
          {capBad && <div role="alert" className="mt-2 rounded-[12px] bg-danger/[.08] px-3 py-2.5 text-[12.5px] font-semibold text-danger">{E2(`Caben hasta ${max} invitados.`, `Fits up to ${max} guests.`)}</div>}
        </div>
        {s.k === "hora" && <div className="flex items-center justify-between gap-3"><div><div className={K}>{E2("¿CUÁNTAS HORAS?", "HOW MANY HOURS?")}</div>{s.min ? <div className="mt-1 text-[11.5px] font-medium text-ink/55">{E2(`Mínimo ${s.min} h`, `Minimum ${s.min} h`)}</div> : null}</div><QtyStepper value={hR} onDec={() => setHoras(Math.max(s.min ?? 1, (hR ?? 1) - 1))} onInc={() => setHoras(Math.min(12, (hR ?? 1) + 1))} /></div>}
        {s.k === "unid" && !s.per && <div className="flex items-center justify-between gap-3"><div><div className={K}>{E2("¿CUÁNTOS?", "HOW MANY?")}</div><div className="mt-1 text-[11.5px] font-medium text-ink/55">{s.u ? nm(s.u) : ""}</div></div><QtyStepper value={qtyR} onDec={() => setQty(Math.max(s.min ?? 1, qtyR - 1))} onInc={() => setQty(Math.min(2000, qtyR + 1))} /></div>}
        {s.k === "unid" && s.per ? <div className="text-[12px] font-medium leading-[1.45] text-ink/60">{E2(`Para ${g} invitados: ${qtyR} × ${s.u ? nm(s.u) : "unidad"} (1 cada ${s.per}).`, `For ${g} guests: ${qtyR} × ${s.u ? nm(s.u) : "unit"} (1 per ${s.per}).`)}</div> : null}
      </>)}
      <div>
        <div className="flex justify-between gap-2.5"><span className={K}>{vis ? E2("NOTA · OPCIONAL", "NOTE · OPTIONAL") : E2("CUÉNTALES · OPCIONAL", "TELL THEM · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length}/300</span></div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 300))} rows={3} aria-label={E2("Nota", "Note")} placeholder={vis ? E2("Ej.: vamos a ser 3 personas", "E.g. there will be 3 of us") : E2("Ej.: quince de Ashley, colores rosa y dorado…", "E.g. Ashley’s quince, pink and gold…")}
          className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
      </div>
      {lineaNota}
    </div>
  );
  const sel = (on: boolean) => `flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`;
  const bloqueHora = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div>
        <div className={K}>{E2("DÍA · OCUPADA NO SE ELIGE", "DAY · BOOKED CAN'T BE PICKED")}</div>
        <div className="mt-[11px] grid min-w-0"><DateStrip days={dias} selected={lejos ? "" : dia} onSelect={(id: string) => { setDia(id); setH(null); }} /></div>
        {!vis && <label className="mt-3 block"><span className={K}>{E2("OTRA FECHA", "ANOTHER DATE")}</span>
          <input type="date" aria-label={E2("Otra fecha", "Another date")} value={lejos} min={sumarDias(b.hoy, 1)} max={b.hasta} onChange={(e) => { if (e.target.value) { setDia(e.target.value); setH(null); } }}
            className={`mt-2 box-border h-11 w-full rounded-[13px] border px-3.5 font-mono text-[13.5px] font-bold outline-none ${lejos ? "border-ink" : "border-ink/[.12]"}`} /></label>}
      </div>
      <div className="flex items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px]">
        <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[12px] bg-ink"><Icon name="dateFree" size={18} color="var(--tl-white)" /></span>
        <span className="min-w-0 flex-1"><span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{E2("TU FECHA", "YOUR DATE")}</span>
          <span className="mt-0.5 block text-[14px] font-bold">{cap(diaFiesta(dia, es))}{vis ? "" : E2(` · ${g} invitados`, ` · ${g} guests`)}</span>
          <span className="mt-1 flex items-center gap-[5px] text-[11.5px] font-bold" style={{ color: libreHoy ? "var(--tl-open-text)" : "var(--tl-danger)" }}><Icon name={libreHoy ? "check" : "warning"} size={13} color="currentColor" />{libreHoy ? `${E2("Libre el ", "Free on ")}${diaFiesta(dia, es)}` : `${E2("Ocupada el ", "Booked on ")}${diaFiesta(dia, es)}`}</span></span>
      </div>
      {libreHoy ? (
        <div><div className={K}>{vis ? E2("HORA DE LA VISITA", "TOUR TIME") : E2("HORA DE INICIO", "START TIME")}</div><div className="mt-[9px] grid"><TimeSlots slots={slots.map(({ t, taken }) => ({ t, taken }))} selected={hSel != null ? horaL(hSel) : ""} onSelect={(t: string) => { const x = slots.find((z) => z.t === t && !z.taken); if (x) setH(x.m); }} /></div>
          {!vis && <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] font-semibold tracking-[0.08em] text-ink/50"><span>{E2("DURA", "LENGTH")}</span><span>{dur >= 60 ? E2(`${Math.round(dur / 60)} HORAS`, `${Math.round(dur / 60)} HOURS`) : `${dur} MIN`}</span></div>}</div>
      ) : <div className="rounded-[15px] bg-paper px-[15px] py-3.5 text-[13.5px] font-bold leading-[1.4]">{E2("Esa fecha está ocupada. Elige otra.", "That date is booked. Pick another.")}</div>}
      {b.va && (
        <div className="border-t border-ink/[.07] pt-3.5">
          <div className={K}>{E2("¿DÓNDE ES LA FIESTA?", "WHERE IS THE PARTY?")}</div>
          <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label={E2("Dónde es la fiesta", "Where is the party")}>
            {b.dirs.map((d) => { const on = donde?.k === "casa" && donde.id === d.id; return (
              <button key={d.id} type="button" role="radio" aria-checked={on} disabled={!d.enZona} onClick={() => setDonde({ k: "casa", id: d.id })} className={`${sel(on)} ${d.enZona ? "" : "opacity-50"}`}>
                <span className={`box-border h-5 w-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{d.t}</span><span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{d.enZona ? E2("TU DIRECCIÓN", "YOUR ADDRESS") : E2("FUERA DE SU ZONA", "OUTSIDE THEIR AREA")}</span></span>
              </button>); })}
            {b.salones.map((x) => { const on = donde?.k === "salon" && donde.id === x.id; return (
              <button key={x.id} type="button" role="radio" aria-checked={on} onClick={() => setDonde({ k: "salon", id: x.id })} className={sel(on)}>
                <span className={`box-border h-5 w-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{x.nombre}</span><span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{E2("SALÓN", "VENUE")}{x.dir ? ` · ${x.dir.toUpperCase()}` : ""}</span></span>
              </button>); })}
          </div>
          <button type="button" onClick={() => (yo ? router.push(`/cuenta/direcciones?volver=${encodeURIComponent(location.pathname + location.search)}`) : entrar())} className="mt-2.5 text-[12.5px] font-bold text-action">{E2("Agregar otra dirección", "Add another address")}</button>
          {b.zone ? <div className="mt-1.5 text-[11.5px] font-medium leading-[1.45] text-ink/55">{E2(`Van hasta ${b.zone} millas de ${b.negocio.ciudad}.`, `They travel up to ${b.zone} miles from ${b.negocio.ciudad}.`)}</div> : null}
        </div>
      )}
      {lineaNota}
    </div>
  );
  const filas: [string, string][] = [[E2("SERVICIO", "SERVICE"), `${nm(s.name)}${qL ? ` · ${qL}` : ""}`], [E2("FECHA", "DATE"), hSel != null ? `${cap(diaFiesta(dia, es))} · ${E2("empieza ", "starts ")}${horaL(hSel)}` : "—"],
    ...(vis ? [] : [[E2("EVENTO", "EVENT"), `${evL ? (es ? evL[1] : evL[2]) : "—"} · ${g}${E2(" invitados", " guests")}`] as [string, string]]), [E2("DÓNDE", "WHERE"), dondeL]];
  const resumen = (
    <div className={`overflow-hidden ${caja}`}>
      <div className="border-b border-ink/[.07] px-[15px] py-3.5"><div className={K}>{E2("RESUMEN", "SUMMARY")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{b.negocio.nombre}</div></div>
      <div className="px-[15px] py-0.5">{filas.map(([k, v2], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v2}</span></div>)}</div>
    </div>
  );
  const como: [string, string, number | null][] = vis ? [[E2("Hoy", "Today"), E2("La visita es gratis y no aparta la fecha.", "The tour is free and does not hold the date."), 0]]
    : [[E2("Hoy, al enviar · depósito", "Today, on sending · deposit"), dep ? E2("Se retiene en tu tarjeta y se cobra cuando confirman: aparta la fecha. Si no confirman, se libera completo.", "Held on your card and charged once they confirm: it holds the date. If they do not confirm, it is fully released.") : E2("No pide depósito en la app.", "No deposit in the app."), dep],
      [E2("El día del evento", "On the event day"), `${E2("A ", "To ")}${b.negocio.nombre}${E2(", como diga el acuerdo por escrito.", ", per the written agreement.")}`, s.k === "cotiza" ? null : rest]];
  const pay = {
    screenLabel: "Booking · pago", priceLabel: E2("PRECIO", "PRICE"), lines: [{ label: `${nm(s.name)}${qL ? ` · ${qL}` : ""}`, value: vis ? E2("Gratis", "Free") : s.k === "cotiza" ? P.l : dinero(tot) }],
    totalLabel: s.k === "cotiza" ? E2("Desde", "From") : "TOTAL", total: vis ? "$0" : dinero(tot), howLabel: E2("CÓMO SE PAGA", "HOW YOU PAY"),
    bar: dep > 0 && rest > 0 ? { a: dep, b: rest } : null,
    rows: como.map(([label, sub, v], k) => ({ label, sub, value: v == null ? E2("Por escrito", "In writing") : dinero(v), dot: k === 0 && dep ? "var(--tl-ink)" : "rgba(11,14,18,.18)", color: "var(--tl-ink)" })),
    card: dep > 0 ? { screenLabel: "Booking · método de pago", kind: yo && tarjeta ? "brand" : "none", brand: tarjeta ? marcaB(tarjeta.marca) : "", label: yo && tarjeta ? tarjetaL(tarjeta) : E2("Tu tarjeta", "Your card"),
      sub: !yo ? E2("ENTRA PARA ELEGIRLA", "SIGN IN TO CHOOSE IT") : declinada && tarjeta?.pm === declinada ? E2("TU BANCO LA RECHAZÓ · CAMBIA DE TARJETA", "YOUR BANK DECLINED IT · CHANGE CARD") : E2("TARJETA DEL DEPÓSITO · SE RETIENE AL ENVIAR", "DEPOSIT CARD · HELD WHEN YOU SEND"),
      change: yo && tarjeta ? E2("Cambiar", "Change") : E2("Elegir", "Choose"), onClick: () => (yo ? setHoja(true) : entrar()) } : null,
  };
  const dev = `${E2("Se libera ", "Released ")}${dinero(dep)}`, GR = "var(--tl-open-text)";
  const salidas = dep > 0 ? { screenLabel: "Booking · tu depósito", title: `${E2("Tu depósito de ", "Your deposit of ")}${dinero(dep)}`.toUpperCase(),
    rows: [[E2(`${b.negocio.nombre} no puede`, `${b.negocio.nombre} cannot`), dev, GR], [E2("Te proponen otra hora y no te sirve", "They propose another time and it does not work"), dev, GR], [E2("No contestan en 24 h", "No reply within 24 h"), dev, GR],
      [E2(`Cancelas ${b.aj.cancel} días antes o más`, `You cancel ${b.aj.cancel}+ days before`), `${E2("Te devolvemos ", "We refund ")}${dinero(dep)}`, GR], [E2(`Cancelas a menos de ${b.aj.cancel} días`, `You cancel less than ${b.aj.cancel} days before`), `${E2("Se queda con ", "Kept by ")}${b.negocio.nombre}`, "var(--tl-danger)"]]
      .map(([label, value, color], k) => ({ label, value, color, top: k ? "1px solid rgba(11,14,18,.07)" : "none" })),
    foot: E2("Lo que se libera vuelve a tu tarjeta en unos días; lo devuelto, en 3 a 5 días hábiles.", "Released holds clear in a few days; refunds take 3 to 5 business days.") } : null;
  const bueno = (
    <div data-screen-label="Booking · bueno saber" className={`flex flex-col gap-2.5 p-4 ${caja}`}>
      <div className={K}>{E2("BUENO SABER", "GOOD TO KNOW")}</div>
      {(vis ? [E2("La visita no aparta la fecha. Si te gusta, pides la fecha con depósito.", "The tour does not hold the date. If you like it, request the date with a deposit.")]
        : [E2(`Responden en menos de 24 h. Si no confirman, ${dep ? "tu depósito se libera completo" : "no pasa nada"}.`, `They reply within 24 h. If they do not confirm, ${dep ? "your deposit is fully released" : "nothing happens"}.`),
          E2(`Cancelar: gratis hasta ${b.aj.cancel} días antes. Después: el depósito se queda con el negocio.`, `Cancel: free up to ${b.aj.cancel} days before. After that: the business keeps the deposit.`),
          E2("Lo que no está escrito en el paquete, no está incluido.", "If it is not written in the package, it is not included.")]).map((t) => <div key={t} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.5] text-ink/75"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open-text)" /></span>{t}</div>)}
    </div>
  );
  const extras = (
    <div className={`flex flex-col gap-3.5 p-4 ${caja}`}>
      <div role="switch" aria-checked={sms} aria-label={E2("Recordatorio", "Reminder")} tabIndex={0} onClick={() => setSms(!sms)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setSms(!sms); } }} className="flex cursor-pointer items-center gap-3">
        <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{E2("Recordatorio", "Reminder")}</div><div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/55">{E2("Te avisamos en Avisos cuando confirmen y una semana antes.", "We let you know in Alerts when they confirm and a week before.")}</div></div>
        <span className={`relative h-6 w-[42px] flex-none rounded-full transition-colors ${sms ? "bg-ink" : "bg-ink/20"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${sms ? "translate-x-[21px]" : "translate-x-[3px]"}`} /></span>
      </div>
    </div>
  );
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const enviarL = vis ? E2("Pedir visita", "Request tour") : E2("Enviar solicitud", "Send request");
  const payK = E2("HOY PAGAS", "TODAY YOU PAY"), barSub = vis ? E2("VISITA GRATIS", "FREE TOUR") : s.k === "cotiza" ? E2("EL TOTAL VA POR ESCRITO", "TOTAL IN WRITING") : `${E2("RESTO ", "REST ")}${dinero(rest)}${E2(" · EL DÍA DEL EVENTO", " · ON THE DAY")}`;

  return (
    <div className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-NEG-FIESTA-BOOKING · móvil" className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid lg:top-0"><StepHeader title={TT[paso]} step={paso + 1} total={3} backLabel={E2("Volver", "Back")} onBack={paso > 0 ? () => { setPaso(paso - 1); window.scrollTo({ top: 0 }); } : volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">
          {paso === 0 && <>{tarjetaSvc}{bloqueFiesta}</>}
          {paso === 1 && bloqueHora}
          {paso === 2 && <>{resumen}<PaymentSummary {...pay} />{salidas && <DepositOutcomes {...salidas} />}{bueno}{extras}</>}
          {errorBox}
        </div>
        <div data-screen-label="Booking · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="min-w-0 flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{dinero(dep)}</div><div className="mt-1 max-w-[130px] truncate font-mono text-[8.5px] font-semibold tracking-[0.06em] text-ink/45">{barSub}</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!okPaso || ocupado} onClick={sigue}>{paso === 2 ? (ocupado ? E2("Enviando…", "Sending…") : enviarL) : E2("Continuar", "Continue")}</Button></div>
          </div>
          {!okPaso && falta && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{falta.toUpperCase()}</div>}
        </div>
      </div>
      <div data-screen-label="APP-NEG-FIESTA-BOOKING · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{b.negocio.nombre}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">{vis ? E2("Pedir visita", "Request a tour") : E2("Pedir la fecha", "Request the date")}</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{`${b.negocio.nombre} · ${nm(s.name)}`.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{TT[0]}</div><div className="flex flex-col gap-3">{tarjetaSvc}{bloqueFiesta}</div></div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{TT[1]}</div>{bloqueHora}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Antes de enviar", "Before you send")}</div><div className="flex flex-col gap-3">{salidas && <DepositOutcomes {...salidas} />}{bueno}{extras}</div></div>
          </div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            {resumen}<PaymentSummary {...pay} />
            <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              {!listo && <div className="text-center text-[12px] font-bold text-pro-ink">{falta}</div>}
              <div className="flex items-center gap-3.5">
                <div className="flex-none pl-0.5"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[21px] font-extrabold leading-none tracking-[-0.02em]">{dinero(dep)}</div></div>
                <div className="flex min-w-0 flex-1"><Button variant="primary" block disabled={!listo || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : enviarL}</Button></div>
              </div>
              <div className="text-center font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{barSub}</div>
              {errorBox}
            </div>
          </aside>
        </div>
      </div>
      {hoja && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={declinada} modo={pago.modo} pk={pago.pk}
          nota={`${E2("PARA TU DEPÓSITO DE ", "FOR YOUR ")}${dinero(dep)}${E2("", " DEPOSIT")} · ${E2("SE RETIENE AL ENVIAR · SE COBRA AL CONFIRMAR", "HELD WHEN YOU SEND · CHARGED ON CONFIRMATION")}`}
          onClose={() => setHoja(false)}
          onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); if (declinada && t.pm !== declinada) setError(null); }} />
      )}
    </div>
  );
}
