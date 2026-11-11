"use client";
/* APP-NEG-EDU-INSCRIPCION con visit · móvil y desktop (neg-edu-flow.js bookVals L29–55 con VOCS inm / dealer; todayOf L24 y cobro L33:
   hoy $0 siempre). 1 Día y hora («Día de la visita» / «Día de la prueba»; las horas llenas no se eligen; prueba en casa con dirección si el
   dealer la ofrece) → 2 Revisa y envía (lo que pides · el día · el TOTAL: «Para mudarte» o «En la puerta»; CÓMO SE PAGA «Hoy $0»; BUENO SABER
   con la línea fija, lo que piden y, en Autos, «Trae tu licencia de conducir» con «Sí, tengo licencia vigente»; nota 0/200 con el aviso de
   números; carro a cambio opcional; avisos). Precalificación y oferta: solo día y hora para que llamen, ningún dato de dinero.
   La pantalla solo muestra lo que copió el servidor; lo decide pedirVisita. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ComponentType } from "react";
import { bhphTexto, pagoTexto, puertaTexto, usd as usdA } from "@/lib/autos-comun";
import { ANIMALES_SERVICIO, EHO, NO_PAGUES, cuotaTexto, mudarteTexto, usd } from "@/lib/inmuebles-comun";
import { AVISO_NOTA, LICENCIA, QUE, QUIEN, TENGO_LICENCIA, diaVis, horaVis, soloLlamada, type Bi } from "@/lib/visitas-inm-comun";
import type { BookingVis } from "@/lib/visitas-inm";
import { pedirVisitaAccion } from "./acciones";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button" | "Chip" | "StepHeader" | "PaymentSummary";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, StepHeader, PaymentSummary } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const campo = "box-border w-full rounded-[13px] border border-ink/[.12] bg-white px-[13px] py-[11px] text-[14px] font-medium outline-none";
const bi = (t: Bi, es: boolean) => (es ? t.es : t.en || t.es);
/* Vivienda justa (guardián viviendaJusta): toda propiedad que se pinta lleva el pie de igualdad de oportunidad y la nota de animales de servicio. */
function pie(es: boolean) {
  return (
    <div data-screen-label="Propiedad · vivienda justa" className="flex flex-col gap-1.5 rounded-2xl border border-ink/[.08] bg-white px-4 py-3">
      <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.1em] text-ink/60"><Icon name="home" size={14} color="rgba(11,14,18,.6)" />{bi(EHO, es).toUpperCase()}</div>
      <div className="text-pretty text-[12.5px] font-semibold leading-[1.5] text-ink/70">{bi(ANIMALES_SERVICIO, es)}</div>
    </div>
  );
}

export function Visita({ b, es, yo }: { b: BookingVis; es: boolean; yo: boolean }) {
  const E2 = (a: string, z: string) => (es ? a : z), nm = (x: Bi | null | undefined) => (x ? (es ? x.es : x.en || x.es) : "");
  const router = useRouter();
  const it = b.item, Q = QUE[it.que], cp = it.copia, llamada = soloLlamada(it.que), prueba = it.que === "prueba";
  const dias = useMemo(() => [...new Set(b.horas.map((h) => h.dia))], [b.horas]);
  const libre = (h: BookingVis["horas"][number]) => h.libres == null || h.libres > 0;
  const [paso, setPaso] = useState(0), [dia, setDia] = useState<string | null>(b.horas.find(libre)?.dia ?? null), [hora, setHora] = useState<string | null>(null);
  const [casa, setCasa] = useState(false), [calle, setCalle] = useState(""), [zip, setZip] = useState("");
  const [trade, setTrade] = useState(false), [tYear, setTYear] = useState(""), [tMake, setTMake] = useState(""), [tModel, setTModel] = useState(""), [tMiles, setTMiles] = useState("");
  const [licencia, setLicencia] = useState(false), [nota, setNota] = useState(""), [sms, setSms] = useState(true), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const clave = useRef(uuid());
  const H = b.horas.find((h) => h.id === hora) ?? null;
  const bloqueado = b.tope || b.pausa || !b.horas.length;
  // ── Validación de cada paso (el servidor lo vuelve a revisar todo) ──
  const okCasa = !casa || (calle.trim().length >= 4 && /^\d{5}$/.test(zip));
  const okTrade = !trade || (/^\d{4}$/.test(tYear) && tMake.trim().length >= 2 && tModel.trim().length >= 1);
  const ok0 = !!H && libre(H) && okCasa;
  const listo = ok0 && okTrade && (!prueba || licencia);
  const falta = !H ? E2("Elige el día y la hora", "Pick the day and time") : !okCasa ? E2("Escribe la calle y el código postal", "Write the street and ZIP code")
    : !okTrade ? E2("Completa el carro a cambio o quítalo", "Complete the trade-in or remove it") : prueba && !licencia ? E2("Marca que tienes licencia vigente", "Check that you have a valid license") : "";
  const okPaso = paso === 0 ? ok0 : listo;
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const volver = () => router.push(`/n/${b.negocio.id}`);
  const llamar = () => { if (b.negocio.telefono) location.href = `tel:${b.negocio.telefono}`; };
  const enviar = async () => {
    if (!listo || ocupado) return;
    if (!yo) return entrar();
    setOcupado(true); setError(null);
    const r = await pedirVisitaAccion(b.negocio.id, {
      item: it.id, hora: hora!, nota, sms, licencia: prueba ? licencia : undefined, casa: casa ? { calle: calle.trim(), zip } : null,
      trade: trade ? { year: Number(tYear), make: tMake.trim(), model: tModel.trim(), miles: tMiles === "" ? null : Number(tMiles) } : null, clave: clave.current,
    }).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (r.ok) { router.push(`/vis/${r.numero}`); return; }
    if ("entrar" in r && r.entrar) return entrar();
    setError(es ? r.msg.es : r.msg.en); setOcupado(false);
    if ("hora" in r && r.hora) { setPaso(0); setHora(null); router.refresh(); }
  };
  const sigue = () => { if (!okPaso) return; if (paso === 1) return void enviar(); setPaso(1); window.scrollTo({ top: 0 }); };
  const TT = [nm(Q.dia), E2("Revisa y envía", "Review and send")];
  // ── Lo copiado: el total que se muestra (Para mudarte · En la puerta · el precio del servicio). Lo calculó el servidor. ──
  const totalL = it.que === "visita" ? (cp.moveIn != null ? usd(cp.moveIn) : cp.price != null ? usd(cp.price) : "—")
    : prueba ? (cp.puerta ? usdA(cp.puerta.otd) : "—") : llamada ? E2("Gratis", "Free") : cp.svcCents ? usd(cp.svcCents) : E2("Gratis", "Free");
  const totalK = it.que === "visita" ? (cp.moveIn != null ? E2("PARA MUDARTE", "TO MOVE IN") : E2("PRECIO", "PRICE")) : prueba ? E2("EN LA PUERTA", "OUT THE DOOR") : E2("COSTO", "COST");
  const totalS = it.que === "visita" ? (cp.moveIn != null ? mudarteTexto({ rent: cp.rent, dep: cp.dep, appFee: cp.appFee, fees: cp.fees, moveIn: cp.moveIn }, es) : cp.cuota != null ? cuotaTexto(cp.cuota, cp.downPct, es) : "")
    : prueba && cp.puerta ? [puertaTexto(cp.puerta, es), pagoTexto(cp.est, es), bhphTexto(cp.bhph, es)].filter(Boolean).join(". ") : "";

  // ── Bloques ──
  const lineaNota = <div className="flex items-start gap-2.5 rounded-[14px] bg-action/[.07] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="check" size={16} color="var(--tl-action)" /></span><span className="text-pretty text-[12.5px] font-bold leading-[1.45] text-action-hover">{nm(b.linea)}</span></div>;
  const tarjetaItem = (
    <div className={`flex items-center gap-[13px] px-[15px] py-3.5 ${caja}`}>
      <span className="h-[54px] w-[54px] flex-none rounded-[15px] bg-photo-bg" style={it.foto ? { backgroundImage: `url(${it.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{nm(it.name)}</div>
        <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{[nm(it.sub), `${totalK} ${totalL}`].filter(Boolean).join(" · ").toUpperCase()}</div>
      </div>
      <button type="button" onClick={volver} className="flex-none text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</button>
    </div>
  );
  const opcion = (k: string, sel: boolean, ok: boolean, titulo: string, der: string, on: () => void) => (
    <button key={k} type="button" role="radio" aria-checked={sel} aria-disabled={!ok} disabled={!ok} onClick={on}
      className={`flex w-full items-center gap-3 rounded-[15px] px-3.5 py-[13px] text-left ${sel ? "border-[1.5px] border-ink bg-white" : "border border-ink/[.1] bg-white"} ${ok ? "" : "opacity-50"}`}>
      <span className={`grid h-[20px] w-[20px] flex-none place-items-center rounded-full ${sel ? "bg-ink" : "border-[1.5px] border-ink/30"}`}>{sel && <span className="h-2 w-2 rounded-full bg-white" />}</span>
      <span className="min-w-0 flex-1 text-[14px] font-bold leading-[1.3]">{titulo}</span>
      <span className="flex-none font-mono text-[10px] font-bold tracking-[0.08em]" style={{ color: ok ? "var(--tl-open-text)" : "rgba(11,14,18,.45)" }}>{der}</span>
    </button>
  );
  const libresL = (h: BookingVis["horas"][number]) => (h.libres == null ? E2("LIBRE", "OPEN") : h.libres ? E2(h.libres === 1 ? "QUEDA 1" : `QUEDAN ${h.libres}`, `${h.libres} LEFT`) : E2("TOMADA", "TAKEN"));
  const toggle = (on: boolean, set: (v: boolean) => void, t: string, s: string, label: string) => (
    <div role="switch" aria-checked={on} aria-label={label} tabIndex={0} onClick={() => set(!on)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); set(!on); } }} className="flex cursor-pointer items-center gap-3">
      <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{t}</div>{s && <div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/55">{s}</div>}</div>
      <span className={`relative h-6 w-[42px] flex-none rounded-full transition-colors ${on ? "bg-ink" : "bg-ink/20"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${on ? "translate-x-[21px]" : "translate-x-[3px]"}`} /></span>
    </div>
  );
  const bloqueHora = (
    <div className={`flex flex-col gap-3 p-4 ${caja}`}>
      {bloqueado ? (
        <div className="flex flex-col gap-2.5 rounded-[15px] bg-paper px-[15px] py-3.5">
          <div className="text-[13.5px] font-bold leading-[1.4]">{b.pausa ? E2(`${b.negocio.nombre} no recibe solicitudes en la app por ahora.`, `${b.negocio.nombre} is not taking requests in the app right now.`)
            : b.tope ? E2(`${b.negocio.nombre} ya recibió las solicitudes de este mes en la app.`, `${b.negocio.nombre} already got this month's in-app requests.`)
            : E2("Todavía no hay horas para pedir en la app.", "There are no times to request in the app yet.")} {E2("Llama al lugar: te dicen las horas.", "Call the place: they tell you the times.")}</div>
          {b.negocio.telefono && <Button variant="secondary" icon="phone" onClick={llamar}>{E2("Llamar", "Call")}</Button>}
        </div>
      ) : <>
        <div className={K}>{nm(Q.dia).toUpperCase()}</div>
        <div role="radiogroup" aria-label={nm(Q.dia)} className="flex flex-wrap gap-2">{dias.map((d) => <Chip key={d} variant={dia === d ? "selected" : "filter"} role="radio" aria-checked={dia === d} onClick={() => { setDia(d); setHora(null); }}>{diaVis(d, es)}</Chip>)}</div>
        <div className={K}>{E2("HORA", "TIME")}</div>
        <div role="radiogroup" aria-label={E2("Hora", "Time")} className="flex flex-col gap-2">{b.horas.filter((h) => h.dia === dia).map((h) => opcion(h.id, hora === h.id, libre(h), horaVis(h.min), libresL(h), () => setHora(h.id)))}</div>
        {llamada && <div className="text-[12px] font-medium leading-[1.5] text-ink/60">{E2("Es la hora en que te llaman al teléfono de tu cuenta. No se piden ingresos, crédito ni papeles por la app.", "It is the time they call the phone on your account. No income, credit or papers are asked in the app.")}</div>}
      </>}
      {b.casa && !bloqueado && (
        <div data-screen-label="Visita · prueba en casa" className="mt-1 flex flex-col gap-3 rounded-[15px] bg-paper px-3.5 py-3">
          {toggle(casa, setCasa, E2("Prueba de manejo en tu casa", "Test drive at your home"), E2("El dealer ve tu dirección solo cuando confirma.", "The dealer sees your address only once confirmed."), E2("Prueba en casa", "Test drive at home"))}
          {casa && <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2.5">
            <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold">{E2("Calle y número", "Street address")}</span><input value={calle} onChange={(e) => setCalle(e.target.value.slice(0, 120))} className={campo} aria-label={E2("Calle y número", "Street address")} autoComplete="street-address" /></label>
            <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold">{E2("Código postal", "ZIP code")}</span><input value={zip} inputMode="numeric" onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} className={campo} aria-label={E2("Código postal", "ZIP code")} autoComplete="postal-code" /></label>
          </div>}
        </div>)}
      {lineaNota}
    </div>
  );
  const filas: [string, string][] = [[nm(it.que === "visita" ? { es: "PROPIEDAD", en: "PROPERTY" } : prueba ? { es: "CARRO", en: "CAR" } : { es: "SERVICIO", en: "SERVICE" }), nm(it.name)],
    [llamada ? E2("TE LLAMAN", "THEY CALL YOU") : E2("DÍA", "DAY"), H ? `${diaVis(H.dia, es)} · ${horaVis(H.min)}` : "—"],
    ...(casa ? [[E2("DÓNDE", "WHERE"), E2("En tu casa", "At your home")] as [string, string]] : []),
    ...(llamada ? [] : [[totalK, totalL] as [string, string]])];
  const resumen = (
    <div className={`overflow-hidden ${caja}`}>
      <div className="border-b border-ink/[.07] px-[15px] py-3.5"><div className={K}>{E2("RESUMEN", "SUMMARY")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{b.negocio.nombre}</div></div>
      <div className="px-[15px] py-0.5">{filas.map(([k, v2], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v2}</span></div>)}</div>
    </div>
  );
  const pay = {
    screenLabel: "Visita · cómo se paga", priceLabel: E2("PRECIO", "PRICE"), lines: [{ label: nm(it.name), value: llamada ? E2("Gratis", "Free") : totalL }],
    totalLabel: E2("HOY PAGAS", "TODAY YOU PAY"), total: "$0", howLabel: E2("CÓMO SE PAGA", "HOW YOU PAY"), bar: null, card: null,
    rows: [[E2("Hoy", "Today"), `${nm(Q.gratis)} ${E2("No se pide tarjeta.", "No card needed.")}`, "$0"],
      ...(llamada ? [] : [[it.que === "visita" ? E2("Si la rentas o compras", "If you rent or buy") : prueba ? E2("Si lo compras", "If you buy it") : E2("En el lugar", "At the place"), totalS || E2("Se paga en el lugar, nunca en la app.", "Paid at the place, never in the app."), totalL]])]
      .map(([label, sub, v], k) => ({ label, sub, value: v, dot: k === 0 ? "var(--tl-ink)" : "rgba(11,14,18,.18)", color: "var(--tl-ink)" })),
  };
  const bueno = (
    <div data-screen-label="Visita · bueno saber" className={`flex flex-col gap-2.5 p-4 ${caja}`}>
      <div className={K}>{E2("BUENO SABER", "GOOD TO KNOW")}</div>
      {[nm(b.linea), ...(it.que === "visita" ? [it.ssnReq === false ? E2("No piden seguro social: con ITIN, pasaporte o carta del trabajo.", "No SSN required: ITIN, passport or work letter.") : "", it.papers ? `${E2("Lo que piden: ", "What they ask for: ")}${nm(it.papers)}` : "", E2("Los papeles se llevan en persona; nunca se mandan por la app.", "Papers are brought in person; never sent through the app."), nm(NO_PAGUES),
        it.soloZona ? E2("La dirección exacta te llega cuando confirman la visita.", "The exact address arrives once the visit is confirmed.") : ""] : []),
        E2("Cancelar es gratis, con un toque.", "Cancelling is free, with one tap.")].filter(Boolean)
        .map((t) => <div key={t} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.5] text-ink/75"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open-text)" /></span>{t}</div>)}
      {prueba && <>
        <div className="mt-1 flex items-start gap-2 text-[12.5px] font-bold leading-[1.5]"><span className="grid flex-none pt-0.5"><Icon name="car" size={13} color="var(--tl-ink)" /></span>{nm(LICENCIA)}</div>
        <div role="checkbox" aria-checked={licencia} tabIndex={0} onClick={() => setLicencia(!licencia)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setLicencia(!licencia); } }} className="flex cursor-pointer items-start gap-2.5 rounded-[13px] bg-paper px-3.5 py-3">
          <span className={`mt-px grid h-[20px] w-[20px] flex-none place-items-center rounded-[6px] ${licencia ? "bg-ink" : "border-[1.5px] border-ink/30 bg-white"}`}>{licencia && <Icon name="check" size={13} color="var(--tl-white)" strokeWidth={2.4} />}</span>
          <span className="text-[13px] font-bold leading-[1.4]">{nm(TENGO_LICENCIA)}</span>
        </div>
        <div className="text-[11.5px] font-medium leading-[1.5] text-ink/55">{E2("No pedimos el número ni la foto de tu licencia: la enseñas en persona.", "We do not ask for your license number or photo: you show it in person.")}</div>
      </>}
    </div>
  );
  const extras = (
    <div className={`flex flex-col gap-3.5 p-4 ${caja}`}>
      {b.trade && <div data-screen-label="Visita · carro a cambio" className="flex flex-col gap-3">
        {toggle(trade, setTrade, E2("Tengo un carro para dar a cambio", "I have a trade-in"), E2("Opcional. El dealer te dice cuánto vale en persona.", "Optional. The dealer tells you its value in person."), E2("Carro a cambio", "Trade-in"))}
        {trade && <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold">{E2("Año", "Year")}</span><input value={tYear} inputMode="numeric" onChange={(e) => setTYear(e.target.value.replace(/\D/g, "").slice(0, 4))} className={campo} aria-label={E2("Año", "Year")} /></label>
          <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold">{E2("Millas", "Miles")}</span><input value={tMiles} inputMode="numeric" onChange={(e) => setTMiles(e.target.value.replace(/\D/g, "").slice(0, 6))} className={campo} aria-label={E2("Millas", "Miles")} /></label>
          <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold">{E2("Marca", "Make")}</span><input value={tMake} onChange={(e) => setTMake(e.target.value.slice(0, 30))} className={campo} aria-label={E2("Marca", "Make")} /></label>
          <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold">{E2("Modelo", "Model")}</span><input value={tModel} onChange={(e) => setTModel(e.target.value.slice(0, 30))} className={campo} aria-label={E2("Modelo", "Model")} /></label>
        </div>}
      </div>}
      <div>
        <div className="flex justify-between gap-2.5"><span className={K}>{E2("NOTA · OPCIONAL", "NOTE · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length}/200</span></div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 200))} rows={2} aria-label={E2("Nota", "Note")} placeholder={E2(`Algo que deba saber ${nm(QUIEN[b.rubro])}…`, `Anything ${nm(QUIEN[b.rubro])} should know…`)}
          className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
        <div className="mt-1.5 text-[11.5px] font-medium leading-[1.45] text-ink/55">{nm(AVISO_NOTA)} {E2(`Solo la ve ${b.negocio.nombre}.`, `Only ${b.negocio.nombre} sees it.`)}</div>
      </div>
      {toggle(sms, setSms, E2("Avisos", "Alerts"), E2("Te avisamos en Avisos cuando confirmen y 2 horas antes de ir.", "We let you know in Alerts when they confirm and 2 hours before you go."), E2("Avisos", "Alerts"))}
    </div>
  );
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const enviarL = E2("Enviar solicitud", "Send request"), payK = E2("HOY PAGAS", "TODAY YOU PAY"), barSub = llamada ? E2("SIN COMPROMISO", "NO COMMITMENT") : `${totalK} ${totalL}`;

  return (
    <div className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-NEG-VISITA · móvil" className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid lg:top-0"><StepHeader title={TT[paso]} step={paso + 1} total={2} backLabel={E2("Volver", "Back")} onBack={paso > 0 ? () => { setPaso(0); window.scrollTo({ top: 0 }); } : volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">
          {paso === 0 && <>{tarjetaItem}{bloqueHora}</>}
          {paso === 1 && <>{resumen}<PaymentSummary {...pay} />{bueno}{extras}{it.que === "visita" && pie(es)}</>}
          {errorBox}
        </div>
        {!bloqueado && <div data-screen-label="Visita · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="min-w-0 flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">$0</div><div className="mt-1 max-w-[140px] truncate font-mono text-[8.5px] font-semibold tracking-[0.06em] text-ink/45">{barSub}</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!okPaso || ocupado} onClick={sigue}>{paso === 1 ? (ocupado ? E2("Enviando…", "Sending…") : enviarL) : E2("Continuar", "Continue")}</Button></div>
          </div>
          {!okPaso && falta && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{falta.toUpperCase()}</div>}
        </div>}
      </div>
      <div data-screen-label="APP-NEG-VISITA · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{b.negocio.nombre}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">{nm(Q.pedir)}</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{`${b.negocio.nombre} · ${nm(it.name)}`.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{TT[0]}</div><div className="flex flex-col gap-3">{tarjetaItem}{bloqueHora}</div></div>
            {!bloqueado && <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Antes de enviar", "Before you send")}</div><div className="flex flex-col gap-3">{bueno}{extras}{it.que === "visita" && pie(es)}</div></div>}
          </div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            {resumen}<PaymentSummary {...pay} />
            {!bloqueado && <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              {!listo && <div className="text-center text-[12px] font-bold text-pro-ink">{falta}</div>}
              <div className="flex items-center gap-3.5">
                <div className="flex-none pl-0.5"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[21px] font-extrabold leading-none tracking-[-0.02em]">$0</div></div>
                <div className="flex min-w-0 flex-1"><Button variant="primary" block disabled={!listo || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : enviarL}</Button></div>
              </div>
              <div className="text-center font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{barSub}</div>
              {errorBox}
            </div>}
          </aside>
        </div>
      </div>
    </div>
  );
}
