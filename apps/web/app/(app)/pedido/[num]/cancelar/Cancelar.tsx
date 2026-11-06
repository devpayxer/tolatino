"use client";
/* APP-NEG-PEDIDO-CANCELAR · móvil y desktop (plantilla APP-NEG-PEDIDO-AYUDA, paso «cancel»): ¿Cancelar el pedido?,
   ¿por qué? (opcional), lo que no pagas y «Sí, cancelar» / «No, seguir con el pedido». Gratis mientras no lo aceptan;
   si ya lo aceptaron o está listo, lo dice y vuelve al pedido. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { PedidoVista } from "@/lib/pedir";
import { cancelarPedido } from "../acciones";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-[15px]";

export function Cancelar({ p, es }: { p: PedidoVista; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [motivo, setMotivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const libre = p.status === "pending" && !p.sinRespuesta;
  const volver = () => router.push(`/pedido/${p.numero}`);
  const MOT: [string, string, string][] = [["error", "Pedí algo equivocado", "I ordered the wrong thing"], ["tarda", "Tarda mucho", "It takes too long"], ["ya", "Ya no lo necesito", "I don't need it anymore"], ["otra", "Otro motivo", "Other reason"]];
  const box = libre ? null : {
    t: ["cancelled", "declined", "expired"].includes(p.status) || p.sinRespuesta ? E2("Este pedido ya está cancelado.", "This order is already cancelled.")
      : p.status === "done" ? E2("Este pedido ya se entregó.", "This order was already delivered.")
        : p.stage === "ready" ? E2("Tu pedido ya está listo.", "Your order is ready.") : E2("El negocio ya lo aceptó.", "The business already accepted it."),
    s: p.status === "done" ? "" : p.stage === "ready" ? E2("Pasa a recogerlo con tu número de pedido.", "Pick it up with your order number.")
      : p.status === "confirmed" ? E2(`La cocina ya empezó. Si necesitas cambiar algo, llama a ${p.negocio.nombre}.`, `The kitchen already started. If you need to change something, call ${p.negocio.nombre}.`) : "",
  };
  const si = async () => {
    if (enviando) return;
    setEnviando(true); setError(null);
    const r = await cancelarPedido(p.numero, motivo ?? "").catch(() => ({ ok: false as const, msg: { es: "No se pudo cancelar. Revisa tu conexión.", en: "Could not cancel. Check your connection." } }));
    if (r.ok) { router.push(`/pedido/${p.numero}`); router.refresh(); return; }
    setError(es ? r.msg.es : r.msg.en); setEnviando(false);
  };

  return (
    <div data-pantalla="APP-NEG-PEDIDO-CANCELAR" className="min-h-dvh bg-paper pb-[180px] lg:pb-16">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:static lg:mx-auto lg:max-w-[720px] lg:border-none lg:bg-transparent lg:px-0 lg:pt-6">
        <button type="button" aria-label={E2("Volver al pedido", "Back to order")} onClick={volver} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{E2("Ayuda con el pedido", "Order help")}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${E2("PEDIDO #", "ORDER #")}${p.numero} · ${p.negocio.nombre.toUpperCase()}`}</div>
        </div>
      </div>
      <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-4 pt-4">
        <div className="px-1 pb-0.5 pt-1">
          <div className="text-pretty font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{libre ? E2("¿Cancelar el pedido?", "Cancel this order?") : E2("Ya no se puede cancelar", "It can no longer be cancelled")}</div>
          {libre && <div className="mt-1.5 text-pretty text-[13px] font-medium leading-[1.5] text-ink/60">{E2("Gratis: aún no lo aceptan.", "Free: not accepted yet.")}</div>}
        </div>
        {error && <div role="alert" className="flex items-start gap-[11px] rounded-2xl border border-danger/25 bg-danger/[.08] px-[15px] py-3.5"><span className="grid flex-none pt-px"><Icon name="warning" size={17} color="var(--tl-danger)" /></span><span className="text-[13.5px] font-bold leading-[1.4] text-danger">{error}</span></div>}
        {box && (
          <div className="flex items-start gap-[11px] rounded-2xl bg-ink/5 px-[15px] py-3.5">
            <span className="grid flex-none pt-px"><Icon name="ban" size={17} color="var(--tl-ink)" strokeWidth={2} /></span>
            <div className="min-w-0"><div className="text-[13.5px] font-bold leading-[1.4]">{box.t}</div>{box.s && <div className="mt-1 text-pretty text-[12.5px] font-medium leading-[1.55]">{box.s}</div>}</div>
          </div>
        )}
        {libre && (
          <>
            <div className={caja}>
              <div className={K}>{E2("¿POR QUÉ? · OPCIONAL", "WHY? · OPTIONAL")}</div>
              <div className="mt-[11px] flex flex-wrap gap-[7px]">{MOT.map(([k, a, b]) => <Chip key={k} variant={motivo === k ? "selected" : "filter"} onClick={() => setMotivo(motivo === k ? null : k)}>{es ? a : b}</Chip>)}</div>
            </div>
            <div className={caja}>
              <div className="flex flex-col gap-[9px] text-[12.5px] font-medium text-ink/60">
                <div className="flex justify-between gap-3"><span className="min-w-0">Subtotal</span><span className="flex-none font-mono text-ink">{p.sub}</span></div>
                <div className="flex justify-between gap-3"><span className="min-w-0">{p.taxL}</span><span className="flex-none font-mono text-ink">{p.tax}</span></div>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
                <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/50">{E2("NO PAGAS NADA", "YOU PAY NOTHING")}</span>
                <span className="font-display text-[20px] font-extrabold leading-none tracking-[-0.02em]">{p.total}</span>
              </div>
            </div>
          </>
        )}
        <div data-screen-label="Ayuda · barra" className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-line bg-paper/95 px-4 pb-5 pt-3 backdrop-blur-[14px] lg:static lg:border-none lg:bg-transparent lg:px-0 lg:pt-2">
          {libre ? (
            <>
              <div className="flex"><Button variant="primary" block disabled={enviando} onClick={si}>{enviando ? E2("Cancelando…", "Cancelling…") : E2("Sí, cancelar el pedido", "Yes, cancel order")}</Button></div>
              <div className="flex"><Button variant="secondary" block onClick={volver}>{E2("No, seguir con el pedido", "No, keep my order")}</Button></div>
            </>
          ) : <div className="flex"><Button variant="secondary" block onClick={volver}>{E2("Volver al pedido", "Back to order")}</Button></div>}
        </div>
      </div>
    </div>
  );
}
