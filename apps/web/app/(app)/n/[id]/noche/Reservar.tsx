"use client";
/* APP-NEG-NOCHE-RESERVA · móvil y desktop (neg-noche-flow.js bookVals L31–70). 1 Tu noche (cuántos van, ocasión, nota) → 2 Noche y hora
   (hoy y 6 noches; las cerradas o sin mesa no se eligen; la hora de llegada cada 30 min hasta la hora de la lista o 2 h antes del cierre;
   el cupo sale de las reservas reales) → 3 Revisa y envía (lo de la puerta, cómo se paga, tu depósito en cada caso, bueno saber, SMS).
   La lista es $0 y queda al instante; la mesa espera al local con el depósito retenido. La línea fija «El cover que ves es el que pagas en
   la puerta.» va en cada paso. Lo decide el servidor (reservarNoche); la pantalla solo muestra. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import { coverTexto, diaNoche, hNoche, LINEA_NOCHE, precioNoche, usdN } from "@/lib/noche-comun";
import type { BookingNoche } from "@/lib/noche-reservas";
import { MetodoPago, marcaB, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../../pago/MetodoPago";
import { reservarNocheAccion } from "./acciones";

type N = "Icon" | "Button" | "Chip" | "StepHeader" | "DateStrip" | "TimeSlots" | "PaymentSummary" | "DepositOutcomes";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, StepHeader, DateStrip, TimeSlots, PaymentSummary, DepositOutcomes } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const DOW = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const OCC: [string, string, string][] = [["bailar", "A bailar", "Dancing"], ["cumple", "Cumpleaños", "Birthday"], ["despedida", "Despedida", "Farewell"], ["celebra", "Celebración", "Celebration"]];

export function ReservarNoche({ b, es, pago, yo, pax0 }: { b: BookingNoche; es: boolean; pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null; yo: boolean; pax0: number }) {
  const E2 = (a: string, z: string) => (es ? a : z);
  const router = useRouter();
  const s = b.svc, lista = s.k === "lista", nm = (x: { es: string; en: string }) => (es ? x.es : x.en || x.es), linea = nm(LINEA_NOCHE);
  const maxP = Math.min(s.pax, lista ? 20 : 50, 10);
  const elegible = (n: BookingNoche["noches"][number]) => n.abre && n.slots.length > 0 && !(n.cupo != null && n.cupo < 1) && !n.llena && !(lista && b.mias.some((m) => m.fecha === n.fecha));
  const [paso, setPaso] = useState(0), [noche, setNoche] = useState(b.noches.find(elegible)?.fecha ?? b.noches[0]?.fecha ?? ""), [llega, setLlega] = useState<number | null>(null);
  const [pax, setPax] = useState(Math.max(1, Math.min(maxP, pax0))), [occ, setOcc] = useState(""), [nota, setNota] = useState(""), [sms, setSms] = useState(true);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null);
  const [hoja, setHoja] = useState(false), [declinada, setDeclinada] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const clave = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "");
  const N = b.noches.find((n) => n.fecha === noche), dep = b.dep, P = precioNoche({ ...s, pax: s.pax }, es);
  const nocheL = (f: string) => { const i = b.noches.findIndex((n) => n.fecha === f), n = b.noches[i]; return !n ? "" : i === 0 ? E2("Esta noche", "Tonight") : i === 1 ? E2("Mañana", "Tomorrow") : E2(`El ${diaNoche(n.dow, true)}`, diaNoche(n.dow, false)); };
  const ya = lista && b.mias.some((m) => m.fecha === noche);
  // Lo de la puerta (la vista; el servidor lo copia al enviar).
  const despues = N ? (N.after && b.listaHasta != null && N.after.min <= b.listaHasta ? N.after.cents : N.cover) : 0;
  const puerta = lista ? `${s.cents ? E2(`${usdN(s.cents)} por persona`, `${usdN(s.cents)} per person`) : E2("Gratis", "Free")}${b.listaHasta != null ? E2(` antes de las ${hNoche(b.listaHasta)}`, ` before ${hNoche(b.listaHasta)}`) : ""}${N ? E2(`; después, ${despues ? `cover ${usdN(despues)}` : "sin cover"}`, `; after that, ${despues ? `${usdN(despues)} cover` : "no cover"}`) : ""}`
    : s.hr ? `${usdN(s.cents)}${E2("/hora", "/hr")}` : s.cents ? E2(`Mínimo ${usdN(s.cents)} en consumo`, `${usdN(s.cents)} minimum spend`) : E2("Sin mínimo", "No minimum");
  const ok0 = pax >= 1 && pax <= maxP;
  const ok1 = !!N && elegible(N) && llega != null && N.slots.includes(llega);
  const listo = ok0 && ok1 && (!dep || !!tarjeta);
  const falta = !ok0 ? E2("¿Cuántos van?", "How many are going?") : ya ? E2("Ya estás en la lista de esa noche", "You are already on that night's list") : !N || !elegible(N) ? E2("Esa noche no se puede. Elige otra.", "That night is not available. Pick another.")
    : llega == null ? E2("Elige a qué hora llegan", "Pick when you arrive") : dep && !tarjeta ? E2("Elige la tarjeta del depósito", "Choose the deposit card") : "";
  const okPaso = paso === 0 ? ok0 : paso === 1 ? ok1 : listo;
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const volver = () => router.push(`/n/${b.negocio.id}?tab=svc`);
  const enviar = async () => {
    if (!listo || ocupado || llega == null) return;
    if (!yo) return entrar();
    setOcupado(true); setError(null);
    const r = await reservarNocheAccion(b.negocio.id, { svc: s.id, noche, llega, pax, ocasion: occ || null, nota, sms, pm: dep ? tarjeta?.pm ?? null : null, clave: clave.current })
      .catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (r.ok) { router.push(`/noche/${r.numero}`); return; }
    if ("entrar" in r && r.entrar) return entrar();
    setError(es ? r.msg.es : r.msg.en); setOcupado(false);
    if ("tarjeta" in r && r.tarjeta && tarjeta) { setDeclinada(tarjeta.pm); clave.current = crypto.randomUUID(); }
    if ("hora" in r && r.hora) { setLlega(null); setPaso(1); router.refresh(); }
  };
  const sigue = () => { if (!okPaso) return; if (paso === 2) return void enviar(); setPaso(paso + 1); window.scrollTo({ top: 0 }); };
  const TT = [E2("Tu noche", "Your night"), E2("Noche y hora", "Night and time"), E2("Revisa y envía", "Review and send")];

  // ── Bloques ──
  const lineaNota = <div className="flex items-start gap-2.5 rounded-[14px] bg-action/[.07] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="dollar" size={16} color="var(--tl-action)" /></span><span className="text-pretty text-[12.5px] font-bold leading-[1.45] text-action-hover">{linea}</span></div>;
  const tarjetaSvc = (
    <div className={`flex items-center gap-[13px] px-[15px] py-3.5 ${caja}`}>
      <span className="h-[54px] w-[54px] flex-none rounded-[15px] bg-photo-bg" style={s.foto ? { backgroundImage: `url(${s.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{nm(s.name)}</div>
        <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{[P.l, P.s, dep ? `${E2("DEPÓSITO ", "DEPOSIT ")}${usdN(dep)}` : ""].filter(Boolean).join(" · ").toUpperCase()}</div>
      </div>
      <button type="button" onClick={volver} className="flex-none text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</button>
    </div>
  );
  const bloqueNoche = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div>
        <div className={K}>{E2("¿CUÁNTOS VAN?", "HOW MANY ARE GOING?")}</div>
        <div role="radiogroup" aria-label={E2("Cuántos van", "How many are going")} className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: maxP }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" role="radio" aria-checked={pax === n} aria-label={String(n)} onClick={() => setPax(n)} className={`h-10 min-w-10 rounded-xl px-3 text-[14px] font-bold ${pax === n ? "bg-ink text-white" : "border border-ink/[.12] bg-white"}`}>{n}</button>))}
        </div>
        {lista && s.cents > 0 && <div className="mt-2 text-[12px] font-medium text-ink/60">{E2(`${usdN(s.cents * pax)} en la puerta si llegan antes de la hora de la lista.`, `${usdN(s.cents * pax)} at the door if you arrive before the list time.`)}</div>}
      </div>
      <div>
        <div className={K}>{E2("OCASIÓN · OPCIONAL", "OCCASION · OPTIONAL")}</div>
        <div className="mt-2 flex flex-wrap gap-2">{OCC.map(([k, a, z]) => <Chip key={k} variant={occ === k ? "selected" : "filter"} onClick={() => setOcc(occ === k ? "" : k)}>{es ? a : z}</Chip>)}</div>
        <div className="mt-1.5 text-[11.5px] font-medium leading-[1.45] text-ink/55">{E2("Si es cumpleaños, algunos locales traen algo a la mesa.", "If it is a birthday, some venues bring something to the table.")}</div>
      </div>
      <div>
        <div className="flex justify-between gap-2.5"><span className={K}>{E2("NOTA · OPCIONAL", "NOTE · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length}/200</span></div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 200))} rows={2} aria-label={E2("Nota", "Note")} placeholder={E2("Ej.: somos 6, llegamos juntos…", "E.g. there are 6 of us, arriving together…")}
          className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
      </div>
      {lineaNota}
    </div>
  );
  const dias = b.noches.map((n) => ({ id: n.fecha, dow: (es ? DOW.es : DOW.en)[n.dow], num: String(Number(n.fecha.slice(8))), off: !elegible(n) }));
  const slots = (N?.slots ?? []).map((m) => ({ t: hNoche(m), taken: false }));
  const bloqueHora = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div>
        <div className={K}>{E2("NOCHE · HOY Y LAS PRÓXIMAS 6", "NIGHT · TONIGHT AND THE NEXT 6")}</div>
        <div className="mt-[11px] grid min-w-0"><DateStrip days={dias} selected={noche} onSelect={(id: string) => { setNoche(id); setLlega(null); }} /></div>
      </div>
      {N && elegible(N) ? (<>
        <div className="flex items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px]">
          <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[12px] bg-ink"><Icon name="drink" size={18} color="var(--tl-white)" /></span>
          <span className="min-w-0 flex-1"><span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{nocheL(noche).toUpperCase()}</span>
            <span className="mt-0.5 block text-[14px] font-bold">{coverTexto({ cover: N.cover, after: N.after, edad: b.edad, fecha: N.fecha, dow: N.dow, cuando: "hoy", lista: null, cierra: null }, es)} · {b.edad}+</span>
            <span className="mt-1 block text-[11.5px] font-bold text-open-text">{lista ? (b.listaHasta != null ? E2(`La lista vale hasta las ${hNoche(b.listaHasta)}`, `The list is valid until ${hNoche(b.listaHasta)}`) : "") : N.cupo != null ? (N.cupo === 1 ? E2("Queda 1 mesa así esa noche", "1 table like this left that night") : E2(`Quedan ${N.cupo} mesas así esa noche`, `${N.cupo} tables like this left that night`)) : ""}</span></span>
        </div>
        <div><div className={K}>{E2("¿A QUÉ HORA LLEGAN?", "WHAT TIME DO YOU ARRIVE?")}</div><div className="mt-[9px] grid"><TimeSlots slots={slots} selected={llega != null ? hNoche(llega) : ""} onSelect={(t: string) => { const m = N.slots.find((z) => hNoche(z) === t); if (m != null) setLlega(m); }} /></div>
          {!lista && <div className="mt-2 text-[11.5px] font-medium leading-[1.45] text-ink/55">{E2(`La mesa se guarda ${b.hold} minutos después de tu hora.`, `The table is held ${b.hold} minutes after your time.`)}</div>}</div>
      </>) : <div className="rounded-[15px] bg-paper px-[15px] py-3.5 text-[13.5px] font-bold leading-[1.4]">{ya ? E2("Ya estás en la lista de esa noche.", "You are already on that night's list.") : N && N.abre && N.cupo === 0 ? E2("Esa noche ya no quedan mesas así.", "No tables like this are left that night.") : N?.llena ? E2("La lista de esa noche está llena: puedes entrar con el cover normal.", "That night's list is full: you can get in with the regular cover.") : E2("Esa noche no abre.", "Closed that night.")}</div>}
      {lineaNota}
    </div>
  );
  const filas: [string, string][] = [[lista ? E2("LISTA", "LIST") : E2("RESERVA", "BOOKING"), nm(s.name)], [E2("NOCHE", "NIGHT"), llega != null ? `${nocheL(noche)} · ${E2("llegas", "you arrive")} ${hNoche(llega)}` : nocheL(noche)],
    [E2("PERSONAS", "PEOPLE"), String(pax)], [E2("EN LA PUERTA", "AT THE DOOR"), puerta], [E2("EDAD", "AGE"), E2(`${b.edad}+ con identificación`, `${b.edad}+ with ID`)]];
  const resumen = (
    <div className={`overflow-hidden ${caja}`}>
      <div className="border-b border-ink/[.07] px-[15px] py-3.5"><div className={K}>{lista ? E2("RESUMEN · LISTA", "SUMMARY · LIST") : E2("RESUMEN · RESERVA", "SUMMARY · BOOKING")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{b.negocio.nombre}</div></div>
      <div className="px-[15px] py-0.5">{filas.map(([k, v2], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v2}</span></div>)}</div>
    </div>
  );
  const pay = {
    screenLabel: "Reserva · pago", priceLabel: E2("PRECIO", "PRICE"), lines: [{ label: nm(s.name), value: lista ? E2("Gratis", "Free") : dep ? E2(`Depósito ${usdN(dep)}`, `${usdN(dep)} deposit`) : E2("Sin depósito", "No deposit") }],
    totalLabel: E2("HOY PAGAS", "TODAY YOU PAY"), total: usdN(dep), howLabel: E2("CÓMO SE PAGA", "HOW YOU PAY"), bar: null,
    rows: [[lista ? E2("Anotarte", "Joining") : E2("Hoy, al enviar · depósito", "Today, on sending · deposit"), lista ? E2("Anotarte no cobra nada.", "Joining costs nothing.") : dep ? E2("Se retiene en tu tarjeta y se cobra cuando confirmen; se descuenta de tu cuenta. Si no confirman, se libera completo.", "Held on your card and charged when they confirm; it comes off your bill. If they do not confirm, it is fully released.") : E2("No pide depósito ni tarjeta.", "No deposit or card needed."), dep],
      [E2("En el local", "At the venue"), lista ? puerta : E2(`${puerta}. El mínimo es consumo, no un cargo aparte.`, `${puerta}. The minimum is spend, not an extra fee.`), null]]
      .map(([label, sub, v], k) => ({ label, sub, value: v == null ? E2("En el local", "At the venue") : usdN(Number(v)), dot: k === 0 && dep ? "var(--tl-ink)" : "rgba(11,14,18,.18)", color: "var(--tl-ink)" })),
    card: dep > 0 ? { screenLabel: "Reserva · método de pago", kind: yo && tarjeta ? "brand" : "none", brand: tarjeta ? marcaB(tarjeta.marca) : "", label: yo && tarjeta ? tarjetaL(tarjeta) : E2("Tu tarjeta", "Your card"),
      sub: !yo ? E2("ENTRA PARA ELEGIRLA", "SIGN IN TO CHOOSE IT") : declinada && tarjeta?.pm === declinada ? E2("TU BANCO LA RECHAZÓ · CAMBIA DE TARJETA", "YOUR BANK DECLINED IT · CHANGE CARD") : E2("TARJETA DEL DEPÓSITO · SE RETIENE AL ENVIAR", "DEPOSIT CARD · HELD WHEN YOU SEND"),
      change: yo && tarjeta ? E2("Cambiar", "Change") : E2("Elegir", "Choose"), onClick: () => (yo ? setHoja(true) : entrar()) } : null,
  };
  const corte = llega != null && llega < 480 ? hNoche(Math.max(0, llega - 120)) : "6 PM", GR = "var(--tl-open-text)", RD = "var(--tl-danger)", dev = `${E2("Se libera ", "Released ")}${usdN(dep)}`;
  const salidas = dep > 0 ? { screenLabel: "Reserva · tu depósito", title: `${E2("Tu depósito de ", "Your deposit of ")}${usdN(dep)}`.toUpperCase(),
    rows: [[E2("No hay mesa o no contestan", "No table or no reply"), dev, GR], [E2("Te proponen otra hora y no te sirve", "They propose another time and it does not work"), dev, GR],
      [E2(`Cancelas antes de las ${corte} de esa noche`, `You cancel before ${corte} that night`), `${E2("Te devolvemos ", "We refund ")}${usdN(dep)}`, GR], [E2(`Cancelas después de las ${corte}`, `You cancel after ${corte}`), E2("Se queda con el local", "Kept by the venue"), RD],
      [E2("No llegas, o no entras sin identificación", "You do not show, or get turned away without ID"), E2("Se queda con el local", "Kept by the venue"), RD], [E2("El local cancela", "The venue cancels"), `${E2("Te devolvemos ", "We refund ")}${usdN(dep)}`, GR]]
      .map(([label, value, color], k) => ({ label, value, color, top: k ? "1px solid rgba(11,14,18,.07)" : "none" })),
    foot: E2("Lo que se libera vuelve a tu tarjeta en unos días; lo devuelto, en 3 a 5 días hábiles.", "Released holds clear in a few days; refunds take 3 to 5 business days.") } : null;
  const bueno = (
    <div data-screen-label="Reserva · bueno saber" className={`flex flex-col gap-2.5 p-4 ${caja}`}>
      <div className={K}>{E2("BUENO SABER", "GOOD TO KNOW")}</div>
      {[linea, E2(`Todos con identificación: ${b.edad}+. Sin identificación no entras, aunque estés en la lista.`, `Everyone with ID: ${b.edad}+. No ID, no entry, even if you are on the list.`),
        lista ? E2("Puedes salir de la lista cuando quieras.", "You can leave the list any time.") : E2(`Cancelar antes de las ${corte} de esa noche devuelve el depósito; después, se queda con el local.`, `Cancelling before ${corte} that night refunds the deposit; after that, the venue keeps it.`),
        ...(lista ? [] : [E2(`Confirman en menos de ${b.reply >= 60 ? `${Math.round(b.reply / 60)} hora` : `${b.reply} min`}. La mesa se guarda ${b.hold} minutos después de tu hora.`, `They confirm within ${b.reply >= 60 ? `${Math.round(b.reply / 60)} hour` : `${b.reply} min`}. The table is held ${b.hold} minutes after your time.`)])]
        .map((t) => <div key={t} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.5] text-ink/75"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open-text)" /></span>{t}</div>)}
    </div>
  );
  const extras = (
    <div className={`flex flex-col gap-3.5 p-4 ${caja}`}>
      <div role="switch" aria-checked={sms} aria-label={E2("Avisos", "Alerts")} tabIndex={0} onClick={() => setSms(!sms)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setSms(!sms); } }} className="flex cursor-pointer items-center gap-3">
        <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{E2("Avisos", "Alerts")}</div><div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/55">{E2("Si sube el cover de esa noche, te avisamos en Avisos. La fila la ves en la página del local.", "If that night's cover goes up, we let you know in Alerts. The line shows on the venue page.")}</div></div>
        <span className={`relative h-6 w-[42px] flex-none rounded-full transition-colors ${sms ? "bg-ink" : "bg-ink/20"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${sms ? "translate-x-[21px]" : "translate-x-[3px]"}`} /></span>
      </div>
    </div>
  );
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const enviarL = lista ? E2("Anotarme", "Join the list") : E2("Enviar solicitud", "Send request");
  const payK = E2("HOY PAGAS", "TODAY YOU PAY"), barSub = `${E2("EN LA PUERTA: ", "AT THE DOOR: ")}${puerta}`.toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-NEG-NOCHE-RESERVA · móvil" className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid lg:top-0"><StepHeader title={TT[paso]} step={paso + 1} total={3} backLabel={E2("Volver", "Back")} onBack={paso > 0 ? () => { setPaso(paso - 1); window.scrollTo({ top: 0 }); } : volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">
          {paso === 0 && <>{tarjetaSvc}{bloqueNoche}</>}
          {paso === 1 && bloqueHora}
          {paso === 2 && <>{resumen}<PaymentSummary {...pay} />{salidas && <DepositOutcomes {...salidas} />}{bueno}{extras}</>}
          {errorBox}
        </div>
        <div data-screen-label="Reserva · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="min-w-0 flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{usdN(dep)}</div><div className="mt-1 max-w-[140px] truncate font-mono text-[8.5px] font-semibold tracking-[0.06em] text-ink/45">{barSub}</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!okPaso || ocupado} onClick={sigue}>{paso === 2 ? (ocupado ? E2("Enviando…", "Sending…") : enviarL) : E2("Continuar", "Continue")}</Button></div>
          </div>
          {!okPaso && falta && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{falta.toUpperCase()}</div>}
        </div>
      </div>
      <div data-screen-label="APP-NEG-NOCHE-RESERVA · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{b.negocio.nombre}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">{lista ? E2("Anotarme en la lista", "Join the list") : E2("Pedir la mesa", "Request the table")}</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{`${b.negocio.nombre} · ${nm(s.name)}`.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{TT[0]}</div><div className="flex flex-col gap-3">{tarjetaSvc}{bloqueNoche}</div></div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{TT[1]}</div>{bloqueHora}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Antes de enviar", "Before you send")}</div><div className="flex flex-col gap-3">{salidas && <DepositOutcomes {...salidas} />}{bueno}{extras}</div></div>
          </div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            {resumen}<PaymentSummary {...pay} />
            <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              {!listo && <div className="text-center text-[12px] font-bold text-pro-ink">{falta}</div>}
              <div className="flex items-center gap-3.5">
                <div className="flex-none pl-0.5"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[21px] font-extrabold leading-none tracking-[-0.02em]">{usdN(dep)}</div></div>
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
          nota={`${E2("PARA TU DEPÓSITO DE ", "FOR YOUR ")}${usdN(dep)}${E2("", " DEPOSIT")} · ${E2("SE RETIENE AL ENVIAR · SE COBRA AL CONFIRMAR", "HELD WHEN YOU SEND · CHARGED ON CONFIRMATION")}`}
          onClose={() => setHoja(false)}
          onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); if (declinada && t.pm !== declinada) setError(null); }} />
      )}
    </div>
  );
}
