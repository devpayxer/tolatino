"use client";
/* APP-NEG-TRANS-RESERVA · móvil y desktop (neg-trans-flow.js bookVals L18–48). 1 Tu viaje (¿cuántos viajan? adultos y niños con
   su precio, asiento de niño, maletas incluidas y extra; vehículo completo: personas y dónde te recogen) → 2 Día y hora (hoy y 6
   días; una salida sin asientos sale tomada) → 3 Revisa y envía (precio cerrado con lo que incluye, cómo se paga: se retiene hoy y
   se cobra al confirmar, tu dinero caso por caso). La línea fija «El precio del viaje es cerrado antes de salir.» va en cada paso.
   Lo decide el servidor (reservarViaje); la pantalla solo muestra.
   4y-2: Tu envío (¿cuántas cajas? 1–4, recogida, DESTINATARIO privado, «Lo que no se puede mandar») y Tu mudanza (fotos 1–6,
   recogida y destino; hoy $0, el precio cerrado llega después). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import { subirFoto } from "@/lib/subir-foto";
import { LINEA_TRANS } from "@/lib/transporte-comun";
import type { BookingViaje } from "@/lib/viajes";
import { MetodoPago, marcaB, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../../pago/MetodoPago";
import { reservarViajeAccion } from "./acciones";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button" | "StepHeader" | "DateStrip" | "TimeSlots" | "PaymentSummary" | "DepositOutcomes" | "QtyStepper";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, StepHeader, DateStrip, TimeSlots, PaymentSummary, DepositOutcomes, QtyStepper } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const dinero = (c: number) => { const d = c / 100; return `$${d % 1 ? d.toFixed(2) : Math.round(d).toLocaleString("en-US")}`; };
const horaL = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;
const DOW = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const DL = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function ViajeBooking({ b, es, pago, yo }: { b: BookingViaje; es: boolean; pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null; yo: boolean }) {
  const E2 = (a: string, z: string) => (es ? a : z);
  const router = useRouter();
  const s = b.svc, asiento = s.k === "asiento", esCaja = s.k === "caja", cot = s.k === "cotiza", nm = (x: { es: string; en: string }) => (es ? x.es : x.en || x.es), linea = nm(LINEA_TRANS);
  const i0 = Math.max(0, b.dias.findIndex((d) => d.salidas.some((z) => z.libre)));
  const [paso, setPaso] = useState(0), [i, setI] = useState(i0), [sel, setSel] = useState<{ run: string; m: number } | null>(null);
  const [adults, setAdults] = useState(1), [kids, setKids] = useState(0), [ninoSeat, setNinoSeat] = useState(false), [extra, setExtra] = useState(0), [nota, setNota] = useState(""), [sms, setSms] = useState(true);
  const dirDef = b.dirs.find((d) => d.def && d.enZona);
  const [pickup, setPickup] = useState<string | null>(dirDef?.id ?? null);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null);
  const [hoja, setHoja] = useState(false), [declinada, setDeclinada] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const [boxes, setBoxes] = useState(1), [dest, setDest] = useState({ nombre: "", tel: "", prov: "", dir: "", ref: "" }), [prohibido, setProhibido] = useState(false), [drop, setDrop] = useState("");
  const [fotos, setFotos] = useState<{ id: string; url: string }[]>([]), [subiendo, setSubiendo] = useState(false), fileRef = useRef<HTMLInputElement>(null);
  const clave = useRef(uuid());

  const seats = adults + kids, child = s.child ?? s.cents;
  const bagsX = b.aj.extra == null ? 0 : extra;
  const tot = asiento ? adults * s.cents + kids * child + bagsX * (b.aj.extra ?? 0) : esCaja ? boxes * s.cents : cot ? 0 : s.cents;
  const destOk = dest.nombre.trim().length >= 3 && (dest.tel.match(/\d/g) ?? []).length >= 7 && dest.prov.trim().length >= 2 && dest.dir.trim().length >= 6;
  const enApp = b.enApp && tot > 0;
  const dia = b.dias[i]!, libres = dia.salidas.filter((z) => z.libre);
  const quedanSel = asiento && sel ? dia.salidas.find((z) => z.run === sel.run)?.quedan ?? 0 : 99;
  const ok0 = asiento ? adults >= 1 && seats <= 14 : esCaja ? !!pickup && destOk && prohibido : cot ? !!pickup && fotos.length > 0 && drop.trim().length >= 6 : (!s.pax || adults <= s.pax) && !!pickup;
  const ok1 = !!sel && (!asiento || quedanSel >= seats);
  const listo = ok0 && ok1 && (!enApp || !!tarjeta);
  const falta = !ok0 ? (asiento ? E2("¿Cuántos viajan?", "How many are traveling?") : cot && !fotos.length ? E2("Agrega al menos una foto", "Add at least one photo") : !pickup ? E2("Elige dónde recogen", "Pick the pickup address")
    : esCaja && !destOk ? E2("Completa el destinatario", "Complete the recipient") : esCaja && !prohibido ? E2("Confirma lo que no se puede mandar", "Confirm what can’t be shipped") : cot && drop.trim().length < 6 ? E2("Escribe a dónde va", "Write where it goes") : !pickup ? E2("Elige dónde te recogen", "Pick where they pick you up") : E2(`Caben hasta ${s.pax}`, `Fits up to ${s.pax}`))
    : !sel ? E2("Elige la salida", "Pick the departure") : asiento && quedanSel < seats ? E2(`Quedan ${quedanSel} asientos en esa salida`, `${quedanSel} seats left on that departure`) : enApp && !tarjeta ? E2("Elige la tarjeta", "Choose the card") : "";
  const okPaso = paso === 0 ? ok0 : paso === 1 ? ok1 : listo;
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const volver = () => router.push(`/n/${b.negocio.id}?tab=svc`);
  const enviar = async () => {
    if (!listo || ocupado || !sel) return;
    if (!yo) return entrar();
    setOcupado(true); setError(null);
    const r = await reservarViajeAccion(b.negocio.id, { svc: s.id, day: dia.ymd, m: sel.m, run: sel.run || null, adults, kids, childSeat: ninoSeat, bagsExtra: bagsX, pickup, nota, sms, pm: enApp ? tarjeta?.pm ?? null : null, clave: clave.current,
      ...(esCaja ? { boxes, dest, prohibido } : {}), ...(cot ? { drop, fotos: fotos.map((f) => f.id) } : {}) })
      .catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (r.ok) { router.push(`/viaje/${r.numero}`); return; }
    if ("entrar" in r && r.entrar) return entrar();
    setError(es ? r.msg.es : r.msg.en); setOcupado(false);
    if ("tarjeta" in r && r.tarjeta && tarjeta) { setDeclinada(tarjeta.pm); clave.current = uuid(); }
    if ("salida" in r && r.salida) { setSel(null); setPaso(1); router.refresh(); }
  };
  const sigue = () => { if (!okPaso) return; if (paso === 2) return void enviar(); setPaso(paso + 1); window.scrollTo({ top: 0 }); };
  const TT = [esCaja ? E2("Tu envío", "Your shipment") : cot ? E2("Tu mudanza", "Your move") : asiento ? E2("Tu viaje", "Your trip") : E2("Tu viaje", "Your ride"), E2("Día y hora", "Day and time"), E2("Revisa y envía", "Review and send")];
  const subir = async (file: File | undefined) => {
    if (!file || fotos.length >= 6) return;
    if (!yo) return entrar();
    setSubiendo(true); const r = await subirFoto(file); setSubiendo(false);
    if (r.ok && r.id && r.url) setFotos((L) => [...L, { id: r.id!, url: r.url! }]); else setError(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo."));
  };
  const campo = (k: keyof typeof dest, l: string, ph: string, max: number, tipo = "text") => (
    <label className="flex flex-col gap-1.5"><span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/[.42]">{l}</span>
      <input type={tipo} value={dest[k]} maxLength={max} placeholder={ph} aria-label={l} onChange={(e) => setDest({ ...dest, [k]: e.target.value.slice(0, max) })} className="box-border w-full rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13.5px] font-medium outline-none" /></label>);
  const dowN = new Date(`${dia.ymd}T12:00:00Z`).getUTCDay(), diaL = `${(es ? DL.es : DL.en)[dowN]} ${Number(dia.ymd.slice(8))}`;
  const cuando = sel ? `${cap(diaL)} · ${horaL(sel.m)}` : "—";

  const fila = (t: string, s2: string, val: number, dec: () => void, inc: () => void) => (
    <div className="flex items-center justify-between gap-3"><div><div className="text-[13.5px] font-bold">{t}</div><div className="mt-0.5 text-[11.5px] font-medium text-ink/55">{s2}</div></div><QtyStepper decLabel={E2("Uno menos", "One less")} incLabel={E2("Uno más", "One more")} value={val} onDec={dec} onInc={inc} /></div>
  );
  const lineaNota = <div className="flex items-start gap-2.5 rounded-[14px] bg-action/[.07] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="dollar" size={16} color="var(--tl-action)" /></span><span className="text-pretty text-[12.5px] font-bold leading-[1.45] text-action-hover">{linea}</span></div>;
  const bloqueViaje = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div className="flex items-center gap-[13px]">
        <span className="h-[54px] w-[54px] flex-none rounded-[15px] bg-photo-bg" style={s.foto ? { backgroundImage: `url(${s.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
        <div className="min-w-0 flex-1"><div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{nm(s.name)}</div>
          <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{(esCaja ? `${dinero(s.cents)} ${E2("POR CAJA", "PER BOX")}` : cot ? `${E2("DESDE ", "FROM ")}${dinero(s.cents)} · ${E2("PRECIO CERRADO CON FOTOS", "FIXED PRICE FROM PHOTOS")}` : asiento ? `${dinero(s.cents)} ${E2("POR PERSONA", "PER PERSON")}${s.child ? E2(` · NIÑO ${dinero(s.child)}`, ` · CHILD ${dinero(s.child)}`) : ""}` : `${dinero(s.cents)}${s.pax ? E2(` · HASTA ${s.pax} PERSONAS`, ` · UP TO ${s.pax} PEOPLE`) : ""}`).toUpperCase()}</div></div>
        <button type="button" onClick={volver} className="flex-none text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</button>
      </div>
      {!cot && <div className={K}>{esCaja ? E2("¿CUÁNTAS CAJAS?", "HOW MANY BOXES?") : E2("¿CUÁNTOS VIAJAN?", "HOW MANY ARE TRAVELING?")}</div>}
      {asiento ? (<>
        {fila(E2("Adultos", "Adults"), `${dinero(s.cents)} ${E2("cada uno", "each")}`, adults, () => setAdults(Math.max(1, adults - 1)), () => setAdults(Math.min(14 - kids, adults + 1)))}
        {fila(E2("Niños", "Children"), `${dinero(child)} ${E2("cada uno", "each")}`, kids, () => setKids(Math.max(0, kids - 1)), () => setKids(Math.min(14 - adults, kids + 1)))}
        {b.aj.nino && kids > 0 && (
          <div role="switch" aria-checked={ninoSeat} aria-label={E2("Asiento de niño", "Child seat")} tabIndex={0} onClick={() => setNinoSeat(!ninoSeat)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setNinoSeat(!ninoSeat); } }} className="flex cursor-pointer items-center gap-3">
            <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{E2("Asiento de niño", "Child seat")}</div><div className="mt-0.5 text-[12px] font-medium text-ink/55">{E2("Sin costo.", "Free.")}</div></div>
            <span className={`relative h-6 w-[42px] flex-none rounded-full ${ninoSeat ? "bg-ink" : "bg-ink/20"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${ninoSeat ? "translate-x-[21px]" : "translate-x-[3px]"}`} /></span>
          </div>)}
        <div className="border-t border-ink/[.07] pt-3.5"><div className={K}>{E2("MALETAS", "BAGS")}</div>
          <div className="mt-1.5 text-[12.5px] font-medium text-ink/65">{b.aj.bags ? E2(`${b.aj.bags} incluidas por persona.`, `${b.aj.bags} included per person.`) : E2("No incluye maletas.", "No bags included.")}</div>
          {b.aj.extra != null && <div className="mt-2.5">{fila(E2("Maletas extra", "Extra bags"), `${dinero(b.aj.extra)} ${E2("cada una · se pagan ahora", "each · paid now")}`, extra, () => setExtra(Math.max(0, extra - 1)), () => setExtra(Math.min(6, extra + 1)))}</div>}
        </div>
      </>) : (<>
        {s.k === "priv" && fila(E2("Personas", "People"), s.pax ? E2(`Caben hasta ${s.pax}`, `Fits up to ${s.pax}`) : "", adults, () => setAdults(Math.max(1, adults - 1)), () => setAdults(Math.min(s.pax ?? 56, adults + 1)))}
        {esCaja && fila(E2("Cajas", "Boxes"), `${dinero(s.cents)} ${E2("cada una · hasta 4", "each · up to 4")}`, boxes, () => setBoxes(Math.max(1, boxes - 1)), () => setBoxes(Math.min(4, boxes + 1)))}
        {cot && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2.5"><span className={K}>{E2("FOTOS", "PHOTOS")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{fotos.length} / 6</span></div>
            <div className="text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Cuartos, muebles grandes y escaleras. Con fotos el precio es cerrado.", "Rooms, large furniture and stairs. With photos the price is fixed.")}</div>
            <div className="flex flex-wrap gap-2.5">
              {fotos.map((f) => <span key={f.id} className="relative h-[76px] w-[76px] rounded-[13px] bg-photo-bg" style={{ backgroundImage: `url(${f.url})`, backgroundSize: "cover" }}><button type="button" aria-label={E2("Quitar foto", "Remove photo")} onClick={() => setFotos((L) => L.filter((z) => z.id !== f.id))} className="absolute -right-1.5 -top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-ink"><Icon name="close" size={10} color="var(--tl-white)" strokeWidth={2.6} /></button></span>)}
              {fotos.length < 6 && <button type="button" disabled={subiendo} onClick={() => (yo ? fileRef.current?.click() : entrar())} className="box-border flex h-[76px] w-[76px] flex-col items-center justify-center gap-1 rounded-[13px] border-[1.5px] border-dashed border-ink/[.22] text-ink/55"><Icon name="image" size={18} color="rgba(11,14,18,.5)" /><span className="text-[10.5px] font-bold">{subiendo ? E2("Subiendo…", "Uploading…") : E2("Foto", "Photo")}</span></button>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label={E2("Subir foto", "Upload photo")} onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          </div>)}
        <div className="border-t border-ink/[.07] pt-3.5">
          <div className={K}>{esCaja ? E2("¿DÓNDE RECOGEN LA CAJA?", "WHERE DO THEY PICK UP THE BOX?") : cot ? E2("¿DE DÓNDE SALE LA MUDANZA?", "WHERE DOES THE MOVE START?") : E2("¿DÓNDE TE RECOGEN?", "WHERE DO THEY PICK YOU UP?")}</div>
          <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label={E2("Dónde te recogen", "Pickup")}>
            {b.dirs.map((d) => { const on = pickup === d.id; return (
              <button key={d.id} type="button" role="radio" aria-checked={on} disabled={!d.enZona} onClick={() => setPickup(d.id)} className={`flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"} ${d.enZona ? "" : "opacity-50"}`}>
                <span className={`box-border h-5 w-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{d.t}</span><span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{d.enZona ? E2("TU DIRECCIÓN", "YOUR ADDRESS") : E2("FUERA DE SU ZONA", "OUTSIDE THEIR AREA")}</span></span>
              </button>); })}
          </div>
          <button type="button" onClick={() => (yo ? router.push(`/cuenta/direcciones?volver=${encodeURIComponent(location.pathname + location.search)}`) : entrar())} className="mt-2.5 text-[12.5px] font-bold text-action">{yo ? E2("Agregar otra dirección", "Add another address") : E2("Entra para elegir tu dirección", "Sign in to pick your address")}</button>
        </div>
        {esCaja && (
          <div data-screen-label="Envío · destinatario" className="flex flex-col gap-3 border-t border-ink/[.07] pt-3.5">
            <div><div className={K}>{E2("DESTINATARIO", "RECIPIENT")}</div><div className="mt-1 text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Solo lo ven tú y el negocio, para entregarla.", "Only you and the business see it, to deliver it.")}</div></div>
            {campo("nombre", E2("NOMBRE", "NAME"), E2("Ej.: Ana Rodríguez", "E.g. Ana Rodríguez"), 80)}
            {campo("tel", E2("TELÉFONO", "PHONE"), "+1 809 555 0101", 24, "tel")}
            {campo("prov", E2("PROVINCIA O CIUDAD", "PROVINCE OR CITY"), E2("Ej.: Santiago", "E.g. Santiago"), 60)}
            {campo("dir", E2("DIRECCIÓN", "ADDRESS"), E2("Calle, número, sector", "Street, number, area"), 200)}
            {campo("ref", E2("REFERENCIA · OPCIONAL", "LANDMARK · OPTIONAL"), E2("Ej.: frente al colmado", "E.g. across from the corner store"), 120)}
            <div role="switch" aria-checked={prohibido} aria-label={E2("Lo que no se puede mandar", "What can’t be shipped")} tabIndex={0} onClick={() => setProhibido(!prohibido)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setProhibido(!prohibido); } }} className="flex cursor-pointer items-center gap-3 rounded-[14px] bg-paper px-3.5 py-3">
              <div className="min-w-0 flex-1"><div className="text-[13px] font-bold">{E2("No lleva nada de lo que no se puede mandar", "It has nothing that can’t be shipped")}</div><div className="mt-0.5 text-[11.5px] font-medium leading-[1.45] text-ink/55">{E2("Armas, municiones, drogas, dinero en efectivo, líquidos inflamables, baterías sueltas y comida fresca.", "Weapons, ammunition, drugs, cash, flammable liquids, loose batteries and fresh food.")}</div></div>
              <span className={`relative h-6 w-[42px] flex-none rounded-full ${prohibido ? "bg-ink" : "bg-ink/20"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${prohibido ? "translate-x-[21px]" : "translate-x-[3px]"}`} /></span>
            </div>
          </div>)}
        {cot && (
          <label className="flex flex-col gap-1.5 border-t border-ink/[.07] pt-3.5"><span className={K}>{E2("¿A DÓNDE VA?", "WHERE IS IT GOING?")}</span>
            <input value={drop} maxLength={200} onChange={(e) => setDrop(e.target.value.slice(0, 200))} aria-label={E2("A dónde va", "Where it is going")} placeholder={E2("Ej.: 120 Alter St, Hazleton · 2.º piso", "E.g. 120 Alter St, Hazleton · 2nd floor")} className="box-border w-full rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13.5px] font-medium outline-none" /></label>)}
      </>)}
      <div>
        <div className="flex justify-between gap-2.5"><span className={K}>{E2("NOTA · OPCIONAL", "NOTE · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length}/200</span></div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 200))} rows={2} aria-label={E2("Nota", "Note")} placeholder={E2("Ej.: llevo un coche de bebé", "E.g. I'm bringing a stroller")} className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
      </div>
      {lineaNota}
    </div>
  );
  const dias = b.dias.map((d, k) => ({ id: `d${k}`, dow: k === 0 ? E2("HOY", "TODAY") : (es ? DOW.es : DOW.en)[new Date(`${d.ymd}T12:00:00Z`).getUTCDay()], num: String(Number(d.ymd.slice(8))), off: !d.salidas.some((z) => z.libre) }));
  const slots = dia.salidas.map((z) => ({ t: horaL(z.m), taken: !z.libre || (asiento && z.quedan < seats), run: z.run, m: z.m, q: z.quedan }));
  const bloqueHora = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div><div className={K}>{E2("DÍA", "DAY")}</div><div className="mt-[11px] grid min-w-0"><DateStrip days={dias} selected={`d${i}`} onSelect={(id: string) => { setI(Number(id.slice(1))); setSel(null); }} /></div></div>
      {libres.length ? (
        <div><div className={K}>{asiento ? E2("SALIDA", "DEPARTURE") : E2("HORA DE RECOGIDA", "PICKUP TIME")}</div>
          <div className="mt-[9px] grid"><TimeSlots slots={slots.map(({ t, taken }) => ({ t, taken }))} selected={sel ? horaL(sel.m) : ""} onSelect={(t: string) => { const x = slots.find((z) => z.t === t && !z.taken); if (x) setSel({ run: x.run, m: x.m }); }} /></div>
          {asiento && sel && <div className="mt-2.5 flex items-center gap-[9px] rounded-[13px] bg-action/[.07] px-[13px] py-[11px]"><Icon name="users" size={15} color="var(--tl-action)" /><span className="text-[12.5px] font-bold text-action-hover">{E2(`Quedan ${quedanSel} asientos`, `${quedanSel} seats left`)}{s.from ? E2(` · sale de ${nm(s.from)}`, ` · leaves from ${nm(s.from)}`) : ""}</span></div>}
        </div>
      ) : <div className="rounded-[15px] bg-paper px-[15px] py-3.5 text-[13.5px] font-bold leading-[1.4]">{asiento ? E2("No hay salidas con asientos ese día. Elige otro.", "No departures with seats that day. Pick another.") : E2("No quedan horas ese día. Elige otro.", "No times left that day. Pick another.")}</div>}
      {lineaNota}
    </div>
  );
  const pas = asiento ? `${adults} ${adults === 1 ? E2("adulto", "adult") : E2("adultos", "adults")}${kids ? ` + ${kids} ${kids === 1 ? E2("niño", "child") : E2("niños", "children")}` : ""}` : `${adults} ${adults === 1 ? E2("persona", "person") : E2("personas", "people")}`;
  const filas: [string, string][] = [[E2("SERVICIO", "SERVICE"), nm(s.name)], [E2("CUÁNDO", "WHEN"), cuando], ...(esCaja ? [[E2("CAJAS", "BOXES"), String(boxes)] as [string, string], [E2("DESTINATARIO", "RECIPIENT"), dest.nombre && dest.prov ? `${dest.nombre} · ${dest.prov}` : "—"] as [string, string]]
      : cot ? [[E2("FOTOS", "PHOTOS"), String(fotos.length)] as [string, string], [E2("VA A", "GOES TO"), drop.trim() || "—"] as [string, string]] : [[E2("PASAJEROS", "PASSENGERS"), pas] as [string, string]]),
    ...(asiento && s.from ? [[E2("SALE DE", "LEAVES FROM"), nm(s.from)] as [string, string]] : []), ...(!asiento ? [[E2("RECOGIDA", "PICKUP"), b.dirs.find((d) => d.id === pickup)?.t ?? "—"] as [string, string]] : []), [E2("NEGOCIO", "BUSINESS"), b.negocio.nombre]];
  const resumen = (
    <div className={`overflow-hidden ${caja}`}>
      <div className="border-b border-ink/[.07] px-[15px] py-3.5"><div className={K}>{E2("TU VIAJE", "YOUR TRIP")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{b.negocio.nombre}</div></div>
      <div className="px-[15px] py-0.5">{filas.map(([k, v2], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v2}</span></div>)}</div>
    </div>
  );
  const lines = asiento ? [{ label: `${E2("Adultos", "Adults")} · ${adults} × ${dinero(s.cents)}`, value: dinero(adults * s.cents) }, ...(kids ? [{ label: `${E2("Niños", "Children")} · ${kids} × ${dinero(child)}`, value: dinero(kids * child) }] : []), ...(bagsX ? [{ label: `${E2("Maletas extra", "Extra bags")} · ${bagsX} × ${dinero(b.aj.extra ?? 0)}`, value: dinero(bagsX * (b.aj.extra ?? 0)) }] : [])]
    : esCaja ? [{ label: `${E2("Cajas", "Boxes")} · ${boxes} × ${dinero(s.cents)}`, value: dinero(tot) }] : cot ? [{ label: nm(s.name), value: `${E2("Desde ", "From ")}${dinero(s.cents)}` }] : [{ label: nm(s.name), value: dinero(s.cents) }];
  const pay = {
    screenLabel: "Reserva · pago", priceLabel: E2("PRECIO CERRADO", "FIXED PRICE"), lines, totalLabel: cot ? E2("HOY", "TODAY") : "TOTAL", total: dinero(tot), howLabel: E2("CÓMO SE PAGA", "HOW YOU PAY"), bar: null,
    rows: enApp ? [{ label: E2("Hoy, al reservar · se retiene", "Today, when booking · held"), sub: E2("No se cobra todavía.", "Not charged yet."), value: dinero(tot), dot: "var(--tl-ink)", color: "var(--tl-ink)" },
      { label: E2("Al confirmar", "On confirmation"), sub: E2("Se cobra el mismo total, con lo que incluye. Nada se agrega al llegar.", "The same total is charged, with what is included. Nothing is added on arrival."), value: dinero(tot), dot: "rgba(11,14,18,.18)", color: "var(--tl-ink)" }]
      : cot ? [{ label: E2("Hoy, al pedir", "Today, when asking"), sub: E2("No se cobra nada.", "Nothing is charged."), value: "$0", dot: "var(--tl-ink)", color: "var(--tl-ink)" },
        { label: E2("Al aceptar el precio cerrado", "When you accept the fixed price"), sub: E2("Se cobra el precio que aceptas. Nada se agrega el día de la mudanza.", "The price you accept is charged. Nothing is added on moving day."), value: E2("Precio cerrado", "Fixed price"), dot: "rgba(11,14,18,.18)", color: "var(--tl-ink)" }]
      : [{ label: E2("Pagas al negocio", "You pay the business"), sub: E2("No se cobra nada en la app.", "Nothing is charged in the app."), value: dinero(tot), dot: "rgba(11,14,18,.18)", color: "var(--tl-ink)" }],
    card: enApp ? { screenLabel: "Reserva · método de pago", kind: yo && tarjeta ? "brand" : "none", brand: tarjeta ? marcaB(tarjeta.marca) : "", label: yo && tarjeta ? tarjetaL(tarjeta) : E2("Tu tarjeta", "Your card"),
      sub: !yo ? E2("ENTRA PARA ELEGIRLA", "SIGN IN TO CHOOSE IT") : declinada && tarjeta?.pm === declinada ? E2("TU BANCO LA RECHAZÓ · CAMBIA DE TARJETA", "YOUR BANK DECLINED IT · CHANGE CARD") : E2("SE RETIENE AL RESERVAR · SE COBRA AL CONFIRMAR", "HELD WHEN BOOKING · CHARGED ON CONFIRMATION"),
      change: yo && tarjeta ? E2("Cambiar", "Change") : E2("Elegir", "Choose"), onClick: () => (yo ? setHoja(true) : entrar()) } : null,
  };
  const GR = "var(--tl-open-text)", rel = `${E2("Se libera ", "Released ")}${dinero(tot)}`;
  const salidas = enApp ? { screenLabel: "Reserva · tu dinero", title: `${E2("Tus ", "Your ")}${dinero(tot)}`.toUpperCase(),
    rows: [[E2(`${b.negocio.nombre} no confirma`, `${b.negocio.nombre} does not confirm`), rel, GR], [asiento ? E2("Te proponen otra salida y no te sirve", "They propose another departure and it does not work") : E2("Te proponen otra hora y no te sirve", "They propose another time and it does not work"), rel, GR],
      [E2("Cancelas 24 h antes o más", "You cancel 24+ h before"), `${E2("Te devolvemos ", "We refund ")}${dinero(tot)}`, GR], [E2("Cancelas a menos de 24 h", "You cancel less than 24 h before"), `${E2("Se cobra la mitad: ", "Half is charged: ")}${dinero(Math.floor(tot / 2))}`, "var(--tl-danger)"],
      [esCaja ? E2("No recogen tu caja", "They do not pick up your box") : E2("La salida no sale", "The departure does not run"), `${E2("Te devolvemos ", "We refund ")}${dinero(tot)}`, GR]]
      .map(([label, value, color], k) => ({ label, value, color, top: k ? "1px solid rgba(11,14,18,.07)" : "none" })),
    foot: E2("Lo que se libera vuelve a tu tarjeta en unos días; lo devuelto, en 3 a 5 días hábiles.", "Released holds clear in a few days; refunds take 3 to 5 business days.") } : null;
  const extras = (
    <div className={`flex flex-col gap-3.5 p-4 ${caja}`}>
      <div role="switch" aria-checked={sms} aria-label={E2("Recordatorio", "Reminder")} tabIndex={0} onClick={() => setSms(!sms)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setSms(!sms); } }} className="flex cursor-pointer items-center gap-3">
        <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{E2("Recordatorio", "Reminder")}</div><div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/55">{E2("Te avisamos en Avisos cuando confirman, cuando sale y si va tarde.", "We let you know in Alerts when they confirm, when it leaves and if it is late.")}</div></div>
        <span className={`relative h-6 w-[42px] flex-none rounded-full transition-colors ${sms ? "bg-ink" : "bg-ink/20"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${sms ? "translate-x-[21px]" : "translate-x-[3px]"}`} /></span>
      </div>
    </div>
  );
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const payK = cot ? E2("HOY", "TODAY") : enApp ? E2("SE RETIENE", "HELD") : "TOTAL";
  const cta = esCaja ? E2("Enviar", "Send") : cot ? E2("Pedir precio cerrado", "Get a fixed price") : E2("Reservar", "Book");
  return (
    <div className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-NEG-TRANS-RESERVA · móvil" className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid lg:top-0"><StepHeader title={TT[paso]} step={paso + 1} total={3} backLabel={E2("Volver", "Back")} onBack={paso > 0 ? () => { setPaso(paso - 1); window.scrollTo({ top: 0 }); } : volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">
          {paso === 0 && bloqueViaje}
          {paso === 1 && bloqueHora}
          {paso === 2 && <>{resumen}<PaymentSummary {...pay} />{salidas && <DepositOutcomes {...salidas} />}{extras}</>}
          {errorBox}
        </div>
        <div data-screen-label="Reserva · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="min-w-0 flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{dinero(tot)}</div><div className="mt-1 font-mono text-[8.5px] font-semibold tracking-[0.06em] text-ink/45">{cot ? E2("NO SE COBRA NADA", "NOTHING CHARGED") : E2("PRECIO CERRADO", "FIXED PRICE")}</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!okPaso || ocupado} onClick={sigue}>{paso === 2 ? (ocupado ? E2("Enviando…", "Sending…") : cta) : E2("Continuar", "Continue")}</Button></div>
          </div>
          {!okPaso && falta && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{falta.toUpperCase()}</div>}
        </div>
      </div>
      <div data-screen-label="APP-NEG-TRANS-RESERVA · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{b.negocio.nombre}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">{E2("Reservar", "Book")}</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{`${b.negocio.nombre} · ${nm(s.name)}`.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{TT[0]}</div>{bloqueViaje}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{TT[1]}</div>{bloqueHora}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Antes de reservar", "Before you book")}</div><div className="flex flex-col gap-3">{salidas && <DepositOutcomes {...salidas} />}{extras}</div></div>
          </div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            {resumen}<PaymentSummary {...pay} />
            <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              {!listo && <div className="text-center text-[12px] font-bold text-pro-ink">{falta}</div>}
              <div className="flex items-center gap-3.5">
                <div className="flex-none pl-0.5"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[21px] font-extrabold leading-none tracking-[-0.02em]">{dinero(tot)}</div></div>
                <div className="flex min-w-0 flex-1"><Button variant="primary" block disabled={!listo || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : cta}</Button></div>
              </div>
              {errorBox}
            </div>
          </aside>
        </div>
      </div>
      {hoja && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={declinada} modo={pago.modo} pk={pago.pk}
          nota={`${E2("PARA TU VIAJE DE ", "FOR YOUR TRIP OF ")}${dinero(tot)} · ${E2("SE RETIENE AL RESERVAR · SE COBRA AL CONFIRMAR", "HELD WHEN BOOKING · CHARGED ON CONFIRMATION")}`}
          onClose={() => setHoja(false)}
          onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); if (declinada && t.pm !== declinada) setError(null); }} />
      )}
    </div>
  );
}
