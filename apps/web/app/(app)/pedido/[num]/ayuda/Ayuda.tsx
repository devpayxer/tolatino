"use client";
/* APP-NEG-PEDIDO-AYUDA · móvil y desktop (prototipo helpVals, pedido entregado): qué pasó (falta, equivocado, frío, dañado y,
   en delivery, tarde o no llegó; pago; otro), qué platos y cuántos, qué te gustaría y un detalle. Todo es una solicitud al
   negocio: responde en 24 horas; si no, To'Latino revisa. Con tarjeta, la devolución vuelve a la tarjeta; en el local, se arregla con el negocio. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { ItemAyuda, Motivo, Quiere } from "@/lib/ayuda";
import type { PedidoVista } from "@/lib/pedir";
import { ayudaPedir } from "../acciones";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-[15px]";
const POR_PLATO = new Set<Motivo>(["falta", "equivocado", "frio", "danado"]);

export function Ayuda({ p, puede, delivery, lineas, es }: { p: PedidoVista; puede: boolean; delivery: boolean; lineas: ItemAyuda[]; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [k, setK] = useState<Motivo | null>(null), [sel, setSel] = useState<Record<string, number>>({}), [quiere, setQuiere] = useState<Quiere>("avisar");
  const [txt, setTxt] = useState(""), [paso, setPaso] = useState(0), [error, setError] = useState(""), [enviando, setEnviando] = useState(false);
  const R: Record<Motivo, [string, string, string]> = {
    falta: ["bag", E2("Falta algo", "Something is missing"), E2("Elige qué platos no llegaron", "Pick the dishes that didn't arrive")],
    equivocado: ["restaurant", E2("Llegó algo equivocado", "Wrong item"), E2("Otro plato, o no como lo pediste", "A different dish, or not as ordered")],
    frio: ["hot", E2("Llegó frío o mal preparado", "Cold or poorly made"), E2("Dinos qué plato y qué pasó", "Tell us which dish and what happened")],
    danado: ["water", E2("Llegó dañado o derramado", "Damaged or spilled"), E2("Derramado, aplastado o con el envase roto", "Spilled, crushed or broken container")],
    tarde: ["clock", E2("Llegó tarde", "Arrived late"), E2("Después de la hora que te dijeron", "After the time they told you")],
    nollego: ["home", E2("No me llegó", "It never arrived"), E2("Lo marcaron entregado y no lo tienes", "Marked delivered and you don't have it")],
    pago: ["card", E2("Problema con el pago", "Payment issue"), p.pago ? E2(`Lo que se cobró en tu ${p.pago.tarjeta ?? "tarjeta"}`, `What was charged to your ${p.pago.tarjeta ?? "card"}`) : E2("Lo que pagaste al recibir o en el local", "What you paid on delivery or in store")],
    otro: ["chat", E2("Otro problema", "Something else"), E2(`Cuéntale a ${p.negocio.nombre} qué pasó`, `Tell ${p.negocio.nombre} what happened`)],
  };
  const keys: Motivo[] = delivery ? ["falta", "equivocado", "frio", "danado", "tarde", "nollego", "pago", "otro"] : ["falta", "equivocado", "frio", "danado", "pago", "otro"];
  const porPlato = !!k && POR_PLATO.has(k), items = lineas.filter((l) => (sel[l.n] ?? 0) > 0).map((l) => ({ n: l.n, q: sel[l.n]! }));
  const pasos = !k ? [] : porPlato ? ["platos", "det"] : ["det"], step = pasos[paso] ?? "home";
  const reponer = delivery && (porPlato || k === "nollego");
  const volver = () => (step === "home" ? router.push(`/pedido/${p.numero}`) : paso > 0 ? setPaso(paso - 1) : (setK(null), setPaso(0)));
  const enviar = async () => {
    if (enviando) return;
    setEnviando(true); setError("");
    const r = await ayudaPedir(p.numero, { reason: k!, items, wants: quiere, body: txt }).catch(() => null);
    if (r?.ok) { router.push(`/pedido/${p.numero}`); router.refresh(); return; }
    setEnviando(false); setError(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo enviar. Revisa tu conexión.", "Could not send. Check your connection."));
  };
  const titulo = step === "home" ? E2("Ayuda con el pedido", "Order help") : R[k!][1];
  const meta = `${E2("PEDIDO #", "ORDER #")}${p.numero} · ${p.negocio.nombre}`.toUpperCase();

  let cuerpo: React.ReactNode;
  if (!puede) cuerpo = (
    <div className={caja}><div className="text-[14px] font-bold">{E2("La ayuda se pide cuando ya recibiste el pedido, hasta 7 días después.", "Help can be asked once you got the order, up to 7 days after.")}</div>
      <div className="mt-1.5 text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2(`Si necesitas algo ahora, llama a ${p.negocio.nombre}.`, `If you need something now, call ${p.negocio.nombre}.`)}</div></div>);
  else if (step === "home") cuerpo = (<>
    <div className="px-1 text-pretty text-[13px] font-medium leading-[1.55] text-ink/60">{E2(`Todo es una solicitud a ${p.negocio.nombre}: responde en 24 horas; si no, To’Latino revisa.`, `Everything is a request to ${p.negocio.nombre}: they reply within 24 hours; if not, To’Latino reviews it.`)}</div>
    <div className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
      {keys.map((x, j) => (
        <button key={x} type="button" onClick={() => { setK(x); setPaso(0); setSel({}); setQuiere(delivery && (POR_PLATO.has(x) || x === "nollego") ? "reponer" : "avisar"); }} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${j ? "border-t border-ink/[.07]" : ""}`}>
          <span className="grid size-10 flex-none place-items-center rounded-xl bg-[rgba(75,55,245,.1)]"><Icon name={R[x][0]} size={18} color="var(--tl-action)" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold">{R[x][1]}</span><span className="mt-0.5 block text-[12px] font-medium text-ink/55">{R[x][2]}</span></span>
          <Icon name="chevronRight" size={15} color="rgba(11,14,18,.35)" />
        </button>))}
    </div></>);
  else if (step === "platos") cuerpo = (
    <div className={caja}>
      <div className={K}>{E2("¿QUÉ PLATOS?", "WHICH DISHES?")}</div>
      <div className="mt-2.5 flex flex-col">
        {lineas.map((l, j) => { const q = sel[l.n] ?? 0; return (
          <div key={j} className={`flex items-center gap-3 py-2.5 ${j ? "border-t border-ink/[.07]" : ""}`}>
            <span className="min-w-0 flex-1 text-[13.5px] font-semibold">{l.q > 1 ? `${l.q} × ` : ""}{l.n}</span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label={E2("Menos", "Less")} disabled={!q} onClick={() => setSel({ ...sel, [l.n]: Math.max(0, q - 1) })} className="grid size-8 place-items-center rounded-[10px] border border-ink/[.14] disabled:opacity-40"><Icon name="minus" size={14} /></button>
              <span className="w-5 text-center font-display text-[14px] font-extrabold">{q}</span>
              <button type="button" aria-label={E2("Más", "More")} disabled={q >= l.q} onClick={() => setSel({ ...sel, [l.n]: Math.min(l.q, q + 1) })} className="grid size-8 place-items-center rounded-[10px] border border-ink/[.14] disabled:opacity-40"><Icon name="plus" size={14} /></button>
            </div>
          </div>); })}
      </div>
    </div>);
  else cuerpo = (<>
    {items.length > 0 && <div className={caja}><div className={K}>{E2("LOS PLATOS", "THE DISHES")}</div><div className="mt-2 text-[13.5px] font-semibold">{items.map((x) => `${x.q} × ${x.n}`).join(" · ")}</div></div>}
    {k !== "pago" && k !== "otro" && (
      <div className={caja}>
        <div className={K}>{E2("¿QUÉ TE GUSTARÍA?", "WHAT WOULD YOU LIKE?")}</div>
        <div className="mt-2.5 flex flex-col gap-2">
          {([...(reponer ? [["reponer", E2("Que me lo repongan", "Replace it"), E2("Pides que te lo vuelvan a mandar, sin costo", "You ask them to send it again, at no cost")]] : []),
            ["devolver", E2("Que me devuelvan lo de esos platos", "Refund those dishes"), p.pago ? E2(`Si lo aprueban, vuelve a tu ${p.pago.tarjeta ?? "tarjeta"} en 3 a 5 días hábiles`, `If approved, it goes back to your ${p.pago.tarjeta ?? "card"} in 3 to 5 business days`) : E2("Pagaste al recibir o en el local: lo arreglas con el negocio", "You paid on delivery or in store: you settle it with the business")],
            ["avisar", E2("Solo quiero que lo sepan", "I just want them to know"), E2("Para que no vuelva a pasar", "So it doesn't happen again")]] as [Quiere, string, string][]).map(([v, l, s]) => (
            <button key={v} type="button" role="radio" aria-checked={quiere === v} onClick={() => setQuiere(v)} className={`flex items-center gap-3 rounded-[14px] border px-3.5 py-3 text-left ${quiere === v ? "border-ink border-[1.5px]" : "border-ink/[.1]"}`}>
              <span className={`box-border grid size-5 flex-none place-items-center rounded-full border-[1.5px] ${quiere === v ? "border-ink bg-ink" : "border-ink/25"}`}>{quiere === v && <span className="size-2 rounded-full bg-white" />}</span>
              <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{l}</span><span className="mt-0.5 block text-[12px] font-medium text-ink/55">{s}</span></span>
            </button>))}
        </div>
      </div>)}
    <div className={caja}>
      <div className="flex justify-between gap-2.5"><span className={K}>{k === "otro" ? E2("¿QUÉ PASÓ?", "WHAT HAPPENED?") : E2("CUÉNTANOS UN POCO MÁS (OPCIONAL)", "TELL US A LITTLE MORE (OPTIONAL)")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{txt.length}/300</span></div>
      <textarea value={txt} onChange={(e) => setTxt(e.target.value.slice(0, 300))} rows={3} aria-label={E2("Detalle", "Details")} placeholder={E2("Qué pasó y qué te gustaría que hicieran.", "What happened and what you would like them to do.")}
        className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] text-ink outline-none" />
    </div>
    <div className="flex items-start gap-2.5 rounded-[14px] bg-ink/[.04] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="clock" size={15} color="rgba(11,14,18,.6)" /></span>
      <span className="text-pretty text-[12px] font-medium leading-[1.55] text-ink/[.68]">{E2(`${p.negocio.nombre} responde en 24 horas. Lo ves en tu pedido. Si no responde, To’Latino revisa tu caso.`, `${p.negocio.nombre} replies within 24 hours. You see it on your order. If they don't, To’Latino reviews your case.`)}</span></div>
  </>);
  const falta = step === "platos" ? !items.length : step === "det" ? k === "otro" && !txt.trim() : true;
  const boton = puede && step !== "home" && (
    <Button variant="primary" block disabled={falta || enviando} onClick={() => (step === "platos" ? setPaso(paso + 1) : void enviar())}>{step === "platos" ? E2("Seguir", "Continue") : enviando ? E2("Enviando…", "Sending…") : E2("Enviar solicitud", "Send request")}</Button>);
  return (
    <div data-pantalla="APP-NEG-PEDIDO-AYUDA" className="min-h-dvh bg-paper pb-[130px] lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      <div data-screen-label="APP-NEG-PEDIDO-AYUDA · móvil" className="lg:hidden">
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3">
          <button type="button" aria-label={E2("Volver", "Back")} onClick={volver} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
          <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{titulo}</div><div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{meta}</div></div>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-4">{error && <div role="alert" className="rounded-[14px] bg-[rgba(192,57,43,.07)] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}{cuerpo}</div>
        {boton && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-5 pt-3 backdrop-blur-[14px]"><div className="flex">{boton}</div></div>}
      </div>
      <div data-screen-label="APP-NEG-PEDIDO-AYUDA · desktop" className="mx-auto hidden max-w-[720px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{step === "home" ? E2("Volver al pedido", "Back to order") : E2("Ayuda con el pedido", "Order help")}</button>
        <div className="mt-4 font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{meta}</div>
        <h1 className="mt-1.5 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.04em]">{titulo}</h1>
        <div className="mt-[18px] flex flex-col gap-3.5">{error && <div role="alert" className="rounded-[14px] bg-[rgba(192,57,43,.07)] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}{cuerpo}{boton && <div className="flex max-w-[320px]">{boton}</div>}</div>
      </div>
    </div>
  );
}
