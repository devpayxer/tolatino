"use client";
/* APP-NEG-EVENTO-PRIVADO · formulario (To'Latino Evento privado.dc.html, isForm): móvil en 3 pasos con StepHeader y barra fija
   (Tu evento · Fecha y hora · Menú y presupuesto); escritorio en una página con la columna de 372 (el restaurante, TU EVENTO, enviar).
   Línea fija: «Nada se cobra hasta que aceptes su propuesta. Al aceptar, se cobra el depósito y se descuenta del total.» Todo sale del
   sistema de diseño (StepHeader, Chip, IconButton, DateStrip, TimeSlots, AddOnRow, DepositNote, BusinessRow, Button, Icon). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import { AREAS_EVP, OCASIONES, PRESUPUESTOS, dinero, horaL, lbl } from "@/lib/evento-privado-comun";
import type { PaginaEvp } from "@/lib/evento-privado";
import { pedirEvpAccion } from "./acciones";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button" | "Chip" | "StepHeader" | "DateStrip" | "TimeSlots" | "IconButton" | "AddOnRow" | "DepositNote" | "BusinessRow";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, StepHeader, DateStrip, TimeSlots, IconButton, AddOnRow, DepositNote, BusinessRow } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10.5px] font-extrabold tracking-[0.12em]";
const CAJA = "rounded-[17px] border border-ink/[.08] bg-white";
const DOW = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const MESL = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const sumar = (ymd: string, n: number) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diaCorto = (ymd: string, es: boolean) => { const d = new Date(`${ymd}T12:00:00Z`), w = DOW[es ? "es" : "en"][d.getUTCDay()]!, m = MESL[es ? "es" : "en"][d.getUTCMonth()]!; const ww = w.charAt(0) + w.slice(1).toLowerCase(); return es ? `${ww} ${d.getUTCDate()} ${m}` : `${ww} ${m} ${d.getUTCDate()}`; };
const TURNOS: [string, string, number[]][] = [["ALMUERZO", "LUNCH", [660, 690, 720, 750, 780, 810, 840]], ["CENA", "DINNER", [1050, 1080, 1110, 1140, 1170, 1200, 1230]]];

export function PedirEvp({ x, es, p0 }: { x: PaginaEvp; es: boolean; p0: number }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), a = x.aj;
  const areas = [...a.areas, ...(a.wholeCents != null ? ["todo"] : [])];
  const [paso, setPaso] = useState(1), [occ, setOcc] = useState(""), [p, setP] = useState(Math.min(a.capacity, Math.max(a.minParty, p0 || a.minParty)));
  const [area, setArea] = useState(areas[0] ?? "salon"), [dia, setDia] = useState(x.desde), [h, setH] = useState<number | null>(null), [dur, setDur] = useState(3);
  const [menu, setMenu] = useState(a.menus[0]?.k ?? ""), [bud, setBud] = useState("30"), [ext, setExt] = useState<string[]>([]), [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const clave = useRef(uuid());
  const B = x.negocio.nombre;
  const dias = Array.from({ length: 14 }, (_, k) => sumar(x.desde, k)).map((d) => ({ id: d, dow: DOW[es ? "es" : "en"][new Date(`${d}T12:00:00Z`).getUTCDay()], num: String(Number(d.slice(8))) }));
  const lejos = dias.some((d) => d.id === dia) ? "" : dia;
  const falta = !occ ? E2("Elige qué celebran.", "Pick what you are celebrating.") : h == null ? E2("Elige la hora.", "Pick the time.") : "";
  const okPaso = (n: number) => (n === 1 ? !!occ : n === 2 ? h != null : true);
  const lleno = x.yo != null && x.pendientes >= x.maxPend;
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const enviar = async () => {
    if (falta) { setError(falta); return; }
    if (!x.yo) return entrar();
    if (ocupado || h == null) return;
    setOcupado(true); setError(null);
    const r = await pedirEvpAccion(x.negocio.id, { fecha: dia, m: h, horas: dur, personas: p, occ, area, menu, bud, ext, nota, clave: clave.current })
      .catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (r.ok) { router.push(`/privado/${r.numero}`); return; }
    if ("entrar" in r && r.entrar) return entrar();
    setOcupado(false); setError(es ? r.msg.es : r.msg.en);
    if ("fecha" in r && r.fecha) { setH(null); setPaso(2); }
  };
  const sigue = () => { if (paso === 3) return void enviar(); if (!okPaso(paso)) { setError(falta); return; } setError(null); setPaso(paso + 1); window.scrollTo({ top: 0 }); };
  const radio = (on: boolean) => `box-border h-5 w-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`;
  const menuSel = a.menus.find((z) => z.k === menu);
  const resumen: [string, string][] = [["party", occ ? lbl(OCASIONES, occ, es) : E2("Ocasión por elegir", "Occasion to pick")], ["users", `${p} ${E2("personas", "guests")} · ${es ? AREAS_EVP[area]?.es : AREAS_EVP[area]?.en}`],
    ["calendar", `${diaCorto(dia, es)}${h != null ? ` · ${horaL(h)} – ${horaL(h + dur * 60)}` : E2(" · hora por elegir", " · time to pick")}`], ["restaurant", `${menuSel ? (es ? menuSel.es : menuSel.en || menuSel.es) : ""} · ${lbl(PRESUPUESTOS, bud, es)}${E2(" p/p", " pp")}`]];
  const respL = E2(`${B} suele responder en ${a.replyH} h con una propuesta. Si no responde a tiempo, se cancela sola.`, `${B} usually replies within ${a.replyH} h with a proposal. If they do not reply in time, it cancels on its own.`);
  const sendL = x.yo ? E2("Enviar solicitud", "Send request") : E2("Entrar y enviar", "Sign in and send");

  const sec1 = (<>
    <div className="flex flex-col gap-2.5"><span className={K}>{E2("¿QUÉ CELEBRAN?", "WHAT ARE YOU CELEBRATING?")}</span>
      <div className="flex flex-wrap gap-2">{OCASIONES.map(([k, l1, l2]) => <Chip key={k} variant={occ === k ? "selected" : "filter"} onClick={() => { setOcc(k); setError(null); }}>{es ? l1 : l2}</Chip>)}</div></div>
    <div className="flex flex-col gap-2.5"><span className={K}>{E2("¿CUÁNTOS SON?", "HOW MANY GUESTS?")}</span>
      <div className={`flex items-center gap-3.5 px-4 py-3.5 ${CAJA}`}>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]"><span className="font-display text-[22px] font-extrabold leading-none tracking-[-0.03em]">{p} {E2("personas", "guests")}</span>
          <span className="text-[12px] font-medium leading-[1.45] text-ink/60">{E2(`Desde ${a.minParty} hasta ${a.capacity} personas.`, `From ${a.minParty} to ${a.capacity} guests.`)}</span></div>
        <IconButton icon="minus" size={42} label={E2("Menos", "Fewer")} onClick={() => setP(Math.max(a.minParty, p - 1))} />
        <IconButton icon="plus" size={42} label={E2("Más", "More")} onClick={() => setP(Math.min(a.capacity, p + 1))} />
      </div></div>
    <div className="flex flex-col gap-2.5"><span className={K}>{E2("¿DÓNDE LOS SIENTAN?", "WHERE DO YOU SIT?")}</span>
      <div role="radiogroup" aria-label={E2("Dónde los sientan", "Where you sit")} className={`px-4 ${CAJA}`}>{areas.map((k, i) => (
        <button key={k} type="button" role="radio" aria-checked={area === k} onClick={() => setArea(k)} className={`flex w-full items-center gap-3 py-[13px] text-left ${i ? "border-t border-ink/[.08]" : ""}`}>
          <span className={radio(area === k)} /><span className="min-w-0 flex-1"><span className="block text-[14px] font-bold leading-[1.35]">{es ? AREAS_EVP[k]?.es : AREAS_EVP[k]?.en}</span>
            <span className="mt-0.5 block text-[12px] font-medium leading-[1.45] text-ink/55">{k === "todo" ? (a.wholeCents ? E2(`Cierran el local para ustedes. Tiene costo aparte (${dinero(a.wholeCents)}).`, `They close the place for you. Extra cost (${dinero(a.wholeCents)}).`) : E2("Cierran el local para ustedes.", "They close the place for you.")) : E2("Juntan las mesas para su grupo.", "They put tables together for your group.")}</span></span>
        </button>))}</div></div>
  </>);
  const sec2 = (<>
    <div className="flex flex-col gap-2.5"><span className={K}>{E2("¿QUÉ DÍA?", "WHICH DAY?")}</span>
      <div className="grid min-w-0"><DateStrip days={dias} selected={lejos ? "" : dia} onSelect={(id: string) => { setDia(id); setError(null); }} /></div>
      <span className="text-[12px] font-medium leading-[1.45] text-ink/60">{E2(`Con ${Math.round((Date.parse(x.desde) - Date.parse(x.hoy)) / 864e5)} días o más para que preparen la comida.`, `At least ${Math.round((Date.parse(x.desde) - Date.parse(x.hoy)) / 864e5)} days ahead so they can prepare the food.`)}</span>
      <label className="block"><span className={`${K} text-ink/50`}>{E2("OTRA FECHA", "ANOTHER DATE")}</span>
        <input type="date" aria-label={E2("Otra fecha", "Another date")} value={lejos} min={x.desde} max={x.hasta} onChange={(e) => { if (e.target.value) setDia(e.target.value); }}
          className={`mt-2 box-border h-11 w-full rounded-[13px] border bg-white px-3.5 font-mono text-[13.5px] font-bold outline-none ${lejos ? "border-ink" : "border-ink/[.12]"}`} /></label>
    </div>
    {TURNOS.map(([k1, k2, L]) => (
      <div key={k1} className="flex flex-col gap-2.5"><span className={K}>{es ? k1 : k2}</span>
        <TimeSlots slots={L.map((m) => ({ t: horaL(m) }))} selected={h != null && L.includes(h) ? horaL(h) : ""} onSelect={(t: string) => { setH(L.find((m) => horaL(m) === t) ?? null); setError(null); }} /></div>))}
    <div className="flex flex-col gap-2.5"><span className={K}>{E2("¿CUÁNTO DURA?", "HOW LONG?")}</span>
      <div className="flex flex-wrap gap-2">{[2, 3, 4].map((n) => <Chip key={n} variant={dur === n ? "selected" : "filter"} onClick={() => setDur(n)}>{`${n} h`}</Chip>)}</div></div>
  </>);
  const sec3 = (<>
    <div className="flex flex-col gap-2.5"><span className={K}>{E2("¿QUÉ VAN A COMER?", "WHAT WILL YOU EAT?")}</span>
      <div role="radiogroup" aria-label={E2("Qué van a comer", "What you will eat")} className={`px-4 ${CAJA}`}>{a.menus.map((z, i) => (
        <button key={z.k} type="button" role="radio" aria-checked={menu === z.k} onClick={() => setMenu(z.k)} className={`flex w-full items-center gap-3 py-[13px] text-left ${i ? "border-t border-ink/[.08]" : ""}`}>
          <span className={radio(menu === z.k)} /><span className="min-w-0 flex-1"><span className="block text-[14px] font-bold leading-[1.35]">{es ? z.es : z.en || z.es}</span>
            <span className="mt-0.5 block text-[12px] font-medium leading-[1.45] text-ink/55">{[es ? z.des : z.desEn || z.des, z.cents != null ? E2(`Desde ${dinero(z.cents)} por persona`, `From ${dinero(z.cents)} per person`) : ""].filter(Boolean).join(" · ")}</span></span>
        </button>))}</div></div>
    <div className="flex flex-col gap-2.5"><span className={K}>{E2("PRESUPUESTO POR PERSONA", "BUDGET PER PERSON")}</span>
      <div className="flex flex-wrap gap-2">{PRESUPUESTOS.map(([k, l1, l2]) => <Chip key={k} variant={bud === k ? "selected" : "filter"} onClick={() => setBud(k)}>{es ? l1 : l2}</Chip>)}</div></div>
    {a.extras.length > 0 && <div className="flex flex-col gap-2.5"><span className={K}>{E2("TAMBIÉN NECESITAN", "YOU ALSO NEED")}</span>
      <div className="flex flex-col gap-2">{a.extras.map((z) => <AddOnRow key={z.k} label={es ? z.es : z.en || z.es} price={z.cents == null ? E2("Lo cotizan", "They quote it") : z.cents === 0 ? E2("Sin cargo", "No charge") : dinero(z.cents)} checked={ext.includes(z.k)}
        onToggle={() => setExt(ext.includes(z.k) ? ext.filter((y) => y !== z.k) : [...ext, z.k])} />)}</div></div>}
    <div className="flex flex-col gap-2.5"><span className={K}>{E2("ALGO MÁS · OPCIONAL", "ANYTHING ELSE · OPTIONAL")}</span>
      <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 300))} rows={3} aria-label={E2("Algo más", "Anything else")} placeholder={E2("Alergias, sorpresas, a qué hora llega el bizcocho…", "Allergies, surprises, when the cake arrives…")}
        className="box-border w-full resize-none rounded-[14px] border-[1.5px] border-ink/[.14] bg-white px-3.5 py-3 text-[14px] font-medium leading-[1.5] outline-none" /></div>
    <DepositNote>{E2("Nada se cobra hasta que aceptes su propuesta. Al aceptar, se cobra el depósito y se descuenta del total.", "Nothing is charged until you accept their proposal. When you accept, the deposit is charged and taken off the total.")}</DepositNote>
    <div className={`flex items-center gap-3 px-4 py-3.5 ${CAJA}`}><Icon name="users" size={18} color="rgba(11,14,18,.6)" />
      <div className="min-w-0 flex-1"><div className="text-[14px] font-bold leading-[1.35]">{x.yo ? `${E2("A nombre de ", "Under ")}${x.yo.nombre || E2("tu cuenta", "your account")}` : E2("Entra para enviarla", "Sign in to send it")}</div>
        <div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/55">{x.yo ? `··${x.yo.tel4}${E2(" · te avisamos en tus avisos", " · we notify you in your notifications")}` : E2("Te mandamos un código por SMS. Lo que llenaste se queda igual.", "We text you a code. What you filled in stays the same.")}</div></div></div>
  </>);
  const errorB = error ? <div role="alert" className="text-[12.5px] font-semibold leading-[1.45] text-danger">{error}</div> : null;
  const llenoB = lleno ? <div className="rounded-[14px] bg-pro/[.14] px-3.5 py-3 text-[12.5px] font-bold leading-[1.45] text-pro-ink">{E2(`Tienes ${x.pendientes} solicitudes esperando respuesta. Espera a que te contesten para pedir otra.`, `You have ${x.pendientes} requests waiting for a reply. Wait for an answer before requesting another.`)}</div> : null;

  return (
    <div data-screen-label="APP-NEG-EVENTO-PRIVADO" className="min-h-[100dvh] bg-paper">
      {/* Teléfono: 3 pasos con StepHeader y barra fija */}
      <div className="lg:hidden">
        <StepHeader title={[E2("Tu evento", "Your event"), E2("Fecha y hora", "Date and time"), E2("Menú y presupuesto", "Menu and budget")][paso - 1]} step={paso} total={3} backLabel={E2("Volver", "Back")}
          onBack={() => (paso > 1 ? (setPaso(paso - 1), setError(null)) : router.push(`/n/${x.negocio.id}?tab=rsv`))} />
        <div className="flex flex-col gap-[22px] px-5 pb-7 pt-4">{llenoB}{paso === 1 ? sec1 : paso === 2 ? sec2 : sec3}</div>
        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-ink/[.08] bg-paper/[.96] px-5 pb-6 pt-3 backdrop-blur-[14px]">
          {errorB}
          <div className="flex items-center gap-3.5">
            <div className="min-w-0 flex-1"><div className="font-mono text-[10px] font-bold tracking-[0.1em] text-ink/50">{`${E2("PASO ", "STEP ")}${paso}${E2(" DE 3", " OF 3")}`}</div>
              <div className="mt-[3px] truncate font-display text-[14px] font-extrabold leading-[1.3] tracking-[-0.02em]">{`${p} ${E2("personas", "guests")} · ${diaCorto(dia, es)}${h != null ? ` · ${horaL(h)}` : ""}`}</div></div>
            <div className="flex min-w-[150px] flex-none"><Button block disabled={ocupado || (paso === 3 && lleno)} onClick={sigue}>{paso === 3 ? sendL : E2("Continuar", "Continue")}</Button></div>
          </div>
        </div>
      </div>
      {/* Escritorio: una página con la columna de 372 */}
      <div className="mx-auto hidden max-w-[1180px] grid-cols-[minmax(0,1fr)_372px] items-start gap-12 px-[30px] pb-16 pt-[22px] lg:grid">
        <div className="flex min-w-0 flex-col gap-[22px]">
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => router.push(`/n/${x.negocio.id}?tab=rsv`)} className="flex items-center gap-1.5 self-start text-[13px] font-bold text-action"><Icon name="chevronLeft" size={15} color="var(--tl-action)" strokeWidth={2} />{B}</button>
            <span className="font-mono text-[10.5px] font-bold tracking-[0.12em] text-ink/50">{`${E2("EVENTO PRIVADO · ", "PRIVATE EVENT · ")}${B}`.toUpperCase()}</span>
            <h1 className="m-0 text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em]">{E2("Pide tu evento privado", "Request your private event")}</h1>
            <p className="m-0 max-w-[620px] text-pretty text-[14px] font-medium leading-[1.6] text-ink/65">{E2(`${B} atiende grupos de ${a.minParty} o más como evento privado. Cuéntales qué necesitas y te mandan una propuesta con el precio total.`, `${B} hosts groups of ${a.minParty} or more as a private event. Tell them what you need and they send a proposal with the full price.`)}</p>
          </div>
          {llenoB}{sec1}{sec2}{sec3}
        </div>
        <div data-sticky-rail="1" className="sticky top-6 flex flex-col gap-3.5">
          <BusinessRow name={B} meta={`${x.negocio.ciudad}${x.negocio.direccion ? ` · ${x.negocio.direccion}` : ""}`.toUpperCase()} image={x.negocio.foto ?? undefined} />
          <div className={`flex flex-col gap-[9px] px-[18px] py-4 ${CAJA}`}><span className="font-mono text-[10px] font-extrabold tracking-[0.12em] text-ink/50">{E2("TU EVENTO", "YOUR EVENT")}</span>
            {resumen.map(([ic, t]) => <div key={ic} className="flex items-center gap-2.5 text-[13.5px] font-semibold leading-[1.4]"><Icon name={ic} size={15} color="rgba(11,14,18,.55)" /><span className="min-w-0 flex-1">{t}</span></div>)}</div>
          {errorB}
          <div className="flex"><Button block disabled={ocupado || lleno} onClick={() => void enviar()}>{sendL}</Button></div>
          <span className="text-pretty text-[12px] font-medium leading-[1.5] text-ink/60">{respL}</span>
        </div>
      </div>
    </div>
  );
}
