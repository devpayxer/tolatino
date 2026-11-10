"use client";
/* APP-EVT-PAGO · móvil y desktop (prototipo pay L1337 · pyVals L1347 · «Pago · nombres · método · resumen»). «TUS BOLETOS ESTÁN GUARDADOS»
   con el tiempo que dio el servidor (el contador es solo pantalla: el apartado lo vence el servidor), nombre en cada boleto (opcional),
   la tarjeta (MetodoPago: guardada o nueva; simulador en el sandbox), el resumen con lo que decidió el servidor, «CARGOS INCLUIDOS · NADA
   MÁS EN LA PUERTA», ANTES DE PAGAR (y la línea de ID si es 18+ o 21+) y «Pagar $X». Tarjeta rechazada: «No se cobró nada y tus
   boletos siguen guardados.»; agotado mientras pagabas: «Se acabaron mientras pagabas. No se cobró nada.». */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { PantallaPago } from "@/lib/boletos";
import { diaCorto, dinero, hora } from "@/lib/evt-comun";
import { MetodoPago, marcaB, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../../pago/MetodoPago";
import { evtPagar, evtSoltar } from "../../acciones-boletos";

type N = "Icon" | "Button" | "StepHeader" | "PaymentSummary";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, StepHeader, PaymentSummary } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";

export function Pagar({ p, es, pago }: { p: PantallaPago; es: boolean; pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [seg, setSeg] = useState(p.estado === "held" ? p.segundos : 0);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago.tarjetas), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago.tarjetas.find((t) => t.def) ?? pago.tarjetas[0] ?? null);
  const [hoja, setHoja] = useState(false), [declinada, setDeclinada] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  // 6d · Una oferta de la lista de espera vencida no se vuelve a apartar (ya pasó a la siguiente persona).
  const [fin, setFin] = useState(p.estado === "released" || (p.espera && p.estado === "expired"));
  const nombresN = p.lineas.reduce((s, l) => s + (l.k === "a" ? 0 : l.k === "m" ? 1 : l.q), 0);
  const [nombres, setNombres] = useState<string[]>(() => Array.from({ length: nombresN }, () => ""));
  const t0 = useRef(Date.now());
  useEffect(() => { const i = setInterval(() => setSeg(Math.max(0, p.segundos - Math.floor((Date.now() - t0.current) / 1000))), 1000); return () => clearInterval(i); }, [p.segundos]);
  const mmss = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
  const etiquetas = p.lineas.flatMap((l) => (l.k === "t" ? Array.from({ length: l.q }, (_, i) => `${l.n}${l.q > 1 ? ` ${i + 1}` : ""}`) : l.k === "m" ? [l.n] : []));
  const pagar = async () => {
    if (!tarjeta || ocupado || fin) return;
    setOcupado(true); setError(null);
    const r = await evtPagar(p.apartado, tarjeta.pm, nombres).catch(() => null);
    if (r?.ok) { router.push(`/eventos/orden/${r.numero}`); return; }
    setOcupado(false);
    if (r && !r.ok && r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(location.pathname)}`); return; }
    setError(r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión. No se cobró nada.", "Could not do it. Check your connection. Nothing was charged."));
    if (r && !r.ok && r.tarjeta) setDeclinada(tarjeta.pm);
    if (r && !r.ok && r.vencido) setFin(true);
  };
  const cambiar = async () => { await evtSoltar(p.apartado).catch(() => null); router.push(`/eventos/${p.evento.slug}/boletos?fecha=${p.fecha}`); };
  const volverElegir = () => router.push(`/eventos/${p.evento.slug}/boletos?fecha=${p.fecha}`);
  const cuando = `${diaCorto(p.evento.dia, es).toUpperCase()} · ${hora(p.evento.h0)}`;

  const guardado = fin ? (
    <div role="alert" data-estado="vencido" className="rounded-[16px] bg-danger/[.08] px-4 py-3.5">
      <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-danger">{E2("YA NO ESTÁN GUARDADOS", "NO LONGER HELD")}</div>
      <div className="mt-1 text-[13px] font-semibold leading-[1.45]">{error ?? (p.espera && p.estado === "expired" ? E2("Tu turno venció y el lugar pasó a la siguiente persona. No se cobró nada.", "Your turn expired and the spot went to the next person. Nothing was charged.") : E2("Soltaste estos boletos. No se cobró nada.", "You let these tickets go. Nothing was charged."))}</div>
      <div className="mt-2.5"><Button variant="secondary" onClick={volverElegir}>{E2("Volver a elegir", "Pick again")}</Button></div>
    </div>
  ) : (
    <div data-screen-label="Pago · apartado" className="flex items-center gap-3 rounded-[16px] bg-ink px-4 py-3.5 text-white">
      <span className="grid size-[34px] flex-none place-items-center rounded-xl bg-white/10"><Icon name="clock" size={17} color="var(--tl-signal)" /></span>
      <span className="min-w-0 flex-1"><span className="block font-mono text-[10px] font-bold tracking-[0.14em] text-signal">{p.espera ? E2("SE LIBERÓ UN LUGAR · ES TU TURNO", "A SPOT OPENED UP · IT IS YOUR TURN") : E2("TUS BOLETOS ESTÁN GUARDADOS", "YOUR TICKETS ARE HELD")}</span>
        <span className="mt-0.5 block text-[12.5px] font-semibold text-white/75">{seg > 0 ? E2(`Te quedan ${mmss} para pagar.`, `You have ${mmss} left to pay.`) : p.espera ? E2("Se acabó tu turno: el lugar pasa a la siguiente persona de la lista.", "Your turn is over: the spot goes to the next person on the list.") : E2("Se acabó el tiempo: al pagar intentamos guardarlos otra vez.", "Time is up: when you pay we try to hold them again.")}</span></span>
      <button type="button" onClick={() => void cambiar()} className="flex-none text-[12px] font-bold text-white underline">{E2("Cambiar", "Change")}</button>
    </div>
  );
  const nombresB = nombresN > 0 ? (
    <div data-screen-label="Pago · nombres" className={`flex flex-col gap-2.5 p-4 ${caja}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><span className={K}>{E2("NOMBRE EN CADA BOLETO", "NAME ON EACH TICKET")}</span><span className="text-[11.5px] font-medium text-ink/50">{E2("Opcional", "Optional")}</span></div>
      {etiquetas.map((l, i) => (
        <label key={i} className="flex flex-col gap-1"><span className="text-[11.5px] font-bold text-ink/60">{l}</span>
          <input value={nombres[i] ?? ""} maxLength={40} onChange={(e) => setNombres((L) => L.map((x, k) => (k === i ? e.target.value.slice(0, 40) : x)))} placeholder={E2("A nombre de…", "Name…")}
            className="h-[42px] rounded-[12px] border border-ink/[.12] bg-white px-3 text-[13.5px] font-semibold outline-none" /></label>
      ))}
    </div>
  ) : null;
  const pay = {
    screenLabel: "Pago · resumen", priceLabel: E2("TU ORDEN", "YOUR ORDER"),
    lines: [...p.lineas.map((l) => ({ label: `${l.q > 1 ? `${l.q} × ` : ""}${l.n}`, sub: l.k === "m" ? E2(`Depósito · ${l.seats} entradas incluidas`, `Deposit · ${l.seats} entries included`) : l.k === "a" ? E2("Extra", "Extra") : undefined, value: dinero(l.unit * l.q) })),
      ...(p.descuento ? [{ label: E2("Código de descuento", "Discount code"), value: `−${dinero(p.descuento)}` }] : []),
      { label: E2("Cargos de servicio", "Service fees"), value: E2("Incluidos", "Included") }],
    totalLabel: E2("TOTAL", "TOTAL"), total: dinero(p.total), notes: [{ text: E2("CARGOS INCLUIDOS · NADA MÁS EN LA PUERTA", "FEES INCLUDED · NOTHING EXTRA AT THE DOOR") }],
    howLabel: E2("CÓMO SE PAGA", "HOW YOU PAY"), bar: null,
    rows: [{ label: E2("Hoy, al pagar", "Today, when you pay"), sub: E2("Se cobra ahora en tu tarjeta.", "Charged now to your card."), value: dinero(p.total), dot: "var(--tl-ink)", color: "var(--tl-ink)" }],
    card: { screenLabel: "Pago · método de pago", kind: tarjeta ? "brand" : "none", brand: tarjeta ? marcaB(tarjeta.marca) : "", label: tarjeta ? tarjetaL(tarjeta) : E2("Tu tarjeta", "Your card"),
      sub: declinada && tarjeta?.pm === declinada ? E2("TU BANCO LA RECHAZÓ · CAMBIA DE TARJETA", "YOUR BANK DECLINED IT · CHANGE CARD") : E2("SE COBRA AHORA", "CHARGED NOW"),
      change: tarjeta ? E2("Cambiar", "Change") : E2("Elegir", "Choose"), onClick: () => setHoja(true) },
  };
  const antes = (
    <div data-screen-label="Pago · antes de pagar" className={`flex flex-col gap-2.5 p-4 ${caja}`}>
      <div className={K}>{E2("ANTES DE PAGAR", "BEFORE YOU PAY")}</div>
      {[E2("El precio que ves es el que pagas: cargos incluidos. En la puerta no se venden boletos ni se cobra nada más.", "The price you see is what you pay: fees included. No tickets are sold and nothing extra is charged at the door."),
        E2("Devolución total si el evento se cancela.", "Full refund if the event is cancelled."),
        E2("Tu QR es la entrada; no hace falta imprimir. Si no hay señal, el código funciona igual.", "Your QR is your entry; no need to print. Without signal, the code still works."),
        ...(p.evento.edad >= 18 ? [E2(`Es ${p.evento.edad}+: si en la puerta no muestras ID, no entras.`, `It is ${p.evento.edad}+: if you do not show ID at the door, you do not get in.`)] : [])]
        .map((x) => <div key={x} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.5] text-ink/75"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open-text)" /></span>{x}</div>)}
    </div>
  );
  const evento = (
    <div className={`flex items-center gap-[13px] px-[15px] py-3.5 ${caja}`}>
      <span className="h-[58px] w-[46px] flex-none rounded-[12px] bg-photo-bg" style={p.evento.img ? { backgroundImage: `url(${p.evento.img})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
      <div className="min-w-0 flex-1"><div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{p.evento.title}</div>
        <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${cuando} · ${p.evento.venue}`.toUpperCase()}</div></div>
    </div>
  );
  const errorBox = error && !fin ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const cta = ocupado ? E2("Pagando…", "Paying…") : `${E2("Pagar", "Pay")} ${dinero(p.total)}`;
  const listo = !!tarjeta && !fin;

  return (
    <div data-pantalla="APP-EVT-PAGO" className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-EVT-PAGO · móvil" className="pb-[140px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid"><StepHeader title={E2("Pago", "Payment")} step={2} total={2} backLabel={E2("Volver", "Back")} onBack={() => void cambiar()} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">{guardado}{evento}{nombresB}<PaymentSummary {...pay} />{antes}{errorBox}</div>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <Button block disabled={!listo || ocupado} onClick={() => void pagar()}>{cta}</Button>
          {!tarjeta && !fin && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{E2("ELIGE LA TARJETA", "CHOOSE THE CARD")}</div>}
        </div>
      </div>
      <div data-screen-label="APP-EVT-PAGO · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={() => void cambiar()} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{E2("Cambiar boletos", "Change tickets")}</button>
        <h1 className="m-0 mt-3.5 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">{E2("Paga tus boletos", "Pay for your tickets")}</h1>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12">
          <div className="flex min-w-0 flex-col gap-3">{guardado}{evento}{nombresB}{antes}</div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            <PaymentSummary {...pay} />
            <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              <Button variant="primary" block disabled={!listo || ocupado} onClick={() => void pagar()}>{cta}</Button>
              {errorBox}
            </div>
          </aside>
        </div>
      </div>
      {hoja && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={declinada} modo={pago.modo} pk={pago.pk}
          nota={`${E2("PARA TUS BOLETOS · ", "FOR YOUR TICKETS · ")}${dinero(p.total)} · ${E2("SE COBRA AHORA", "CHARGED NOW")}`}
          onClose={() => setHoja(false)}
          onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); if (declinada && t.pm !== declinada) setError(null); }} />
      )}
    </div>
  );
}
