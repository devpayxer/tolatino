"use client";
/* APP-NEG-PEDIDO · móvil y desktop (prototipo ordVals): el estado del pedido (OrderTracker 2k), cuándo está listo, cómo
   se paga, dónde se recoge y lo que pediste. Mientras espera respuesta, la pantalla se actualiza sola. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, type ComponentType } from "react";
import type { PedidoVista } from "@/lib/pedir";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-line bg-white";
const ETAPAS = ["sent", "accepted", "preparing", "ready", "picked_up"];

export function Pedido({ p, es }: { p: PedidoVista; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const pendiente = p.status === "pending" && !p.sinRespuesta;
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (!pendiente) return;
    const t = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(t);
  }, [pendiente, router]);

  const nombres = es ? ["Pedido enviado", "Aceptado", "En la cocina", "Listo para recoger", "Recogido"] : ["Order sent", "Accepted", "In the kitchen", "Ready for pickup", "Picked up"];
  const st = Math.max(0, ETAPAS.indexOf(p.stage ?? "sent")), last = nombres.length - 1;
  const fin = p.status === "done" || st >= last;
  const cerrado = p.sinRespuesta || ["declined", "expired", "cancelled"].includes(p.status);
  const steps = nombres.map((label, i) => ({ label, time: i === 0 ? p.enviado : i === last ? p.listo : "", state: i < st || fin ? "done" : i === st ? "current" : "next" }));
  const H = [
    [E2("Pedido enviado", "Order sent"), E2(`${p.negocio.nombre} lo confirma antes de las ${p.respondeHasta}.`, `${p.negocio.nombre} confirms it before ${p.respondeHasta}.`)],
    [E2("Pedido aceptado", "Order accepted"), E2("La cocina ya lo tiene.", "The kitchen has it.")],
    [E2("En la cocina", "In the kitchen"), E2(`Estará listo a las ${p.listo}.`, `It will be ready at ${p.listo}.`)],
    [E2("Listo para recoger", "Ready for pickup"), `${E2("Pasa por ", "Go to ")}${p.negocio.direccion ?? p.negocio.nombre}. ${p.pickupNote || E2("Di tu número de pedido.", "Give your order number.")}`],
    [E2("Recogido", "Picked up"), E2("Buen provecho.", "Enjoy your meal.")],
  ] as const;
  const V = cerrado
    ? { eyebrow: p.sinRespuesta || p.status === "expired" ? E2("SIN RESPUESTA", "NO REPLY") : p.status === "declined" ? E2("NO PUDO", "COULD NOT") : E2("CANCELADO", "CANCELLED"),
        title: p.sinRespuesta || p.status === "expired" ? E2("No contestaron a tiempo", "They did not reply in time") : p.status === "declined" ? E2("No pudieron tomar tu pedido", "They could not take your order") : E2("Pedido cancelado", "Order cancelled"),
        sub: p.sinRespuesta || p.status === "expired" ? E2(`${p.negocio.nombre} no aceptó tu pedido a tiempo. No se cobró nada.`, `${p.negocio.nombre} did not accept your order in time. Nothing was charged.`) : E2("No se cobró nada.", "Nothing was charged."),
        hero: "bg-ink/5", ic: "close", fg: "var(--tl-ink)" }
    : { eyebrow: st === 0 ? E2("GRACIAS POR TU PEDIDO", "THANKS FOR YOUR ORDER") : fin ? E2("LISTO", "DONE") : E2("EN CURSO", "IN PROGRESS"), title: H[st]![0], sub: H[st]![1],
        hero: st === 0 ? "bg-signal/[.16]" : "bg-ink/5", ic: fin || st === 0 ? "check" : st === 3 ? "bag" : "clock", fg: st === 0 || fin ? "var(--tl-open-text)" : "var(--tl-ink)" };
  const etaK = cerrado ? "" : fin ? E2("RECOGIDO", "PICKED UP") : E2("LISTO A LAS", "READY AT");
  const money = cerrado ? E2("SIN COBRO", "NOT CHARGED") : E2(`PAGAS ${p.total} EN EL LOCAL AL RECOGER`, `PAY ${p.total} AT THE STORE AT PICKUP`);
  const volver = () => router.push(`/n/${p.negocio.id}`);
  const llamar = p.negocio.telefono ? () => { location.href = `tel:${p.negocio.telefono}`; } : null;

  const hero = (
    <div className="rounded-[22px] border border-line bg-white p-5 lg:p-6">
      <div className="flex items-start gap-3.5">
        <span className={`grid size-[46px] flex-none place-items-center rounded-[15px] ${V.hero}`}><Icon name={V.ic} size={22} color={V.fg} strokeWidth={2.2} /></span>
        <div className="min-w-0 flex-1">
          <div className={K}>{V.eyebrow}</div>
          <div className="mt-[7px] font-display text-[24px] font-extrabold leading-[1.1] tracking-[-0.04em] lg:text-[28px]">{V.title}</div>
          <div className="mt-[7px] text-pretty text-[13.5px] font-medium leading-[1.5] text-ink/[.62]">{V.sub}</div>
        </div>
      </div>
      <div className="mt-[18px] flex flex-wrap items-end justify-between gap-3 border-t border-ink/[.07] pt-4">
        {etaK ? <div><div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{etaK}</div><div className="mt-1.5 font-display text-[26px] font-extrabold leading-none tracking-[-0.045em]">{p.programado ?? p.listo}</div></div> : <div />}
        <span className={`rounded-lg px-[9px] py-1.5 font-mono text-[9.5px] font-extrabold tracking-[0.08em] ${cerrado ? "bg-signal/[.16] text-open-text" : "bg-pro/[.16] text-pro-ink"}`}>{money}</span>
      </div>
    </div>
  );
  const donde = (
    <div className={`${caja} px-4 py-3.5`}>
      <div className={K}>{E2("RECOGES EN", "PICK UP AT")}</div>
      <div className="mt-2 text-[13.5px] font-bold">{p.negocio.direccion ?? p.negocio.nombre}</div>
      {p.pickupNote && <div className="mt-1 text-[12px] font-medium leading-[1.45] text-ink/60">{p.pickupNote}</div>}
      {p.nota && <div className="mt-1 text-pretty text-[12px] font-medium leading-[1.45] text-ink/50">“{p.nota}”</div>}
    </div>
  );
  const lineas = (
    <div className={`${caja} p-[15px]`}>
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{E2("Tu pedido", "Your order")}</span>
        <span className="font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${p.count} ${es ? (p.count === 1 ? "ARTÍCULO" : "ARTÍCULOS") : p.count === 1 ? "ITEM" : "ITEMS"}`}</span>
      </div>
      <div className="mt-2">
        {p.lineas.map((l, i) => (
          <div key={i} className={`flex gap-2.5 py-2.5 ${i ? "border-t border-ink/[.07]" : ""}`}>
            <span className="min-w-5 flex-none font-display text-[12px] font-extrabold leading-[1.4]">{l.q}×</span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold leading-[1.35]">{l.name}</div>
              {l.sum && <div className="mt-0.5 text-[11.5px] font-medium leading-[1.4] text-ink/55">{l.sum}</div>}
            </div>
            <span className="flex-none font-mono text-[12.5px] font-bold">{l.price}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex flex-col gap-[9px] border-t border-line pt-3 text-[12.5px] font-medium text-ink/60">
        <div className="flex justify-between"><span>Subtotal</span><span className="font-mono text-ink">{p.sub}</span></div>
        <div className="flex justify-between"><span>{p.taxL}</span><span className="font-mono text-ink">{p.tax}</span></div>
        <div className="h-px bg-line" />
        <div className="flex items-baseline justify-between"><span className="text-[13.5px] font-bold text-ink">Total</span><span className="font-display text-[20px] font-extrabold leading-none tracking-[-0.02em] text-ink">{p.total}</span></div>
      </div>
    </div>
  );
  const botones = llamar && (
    <div className="flex"><Button variant="secondary" icon="phone" block onClick={llamar}>{E2("Llamar al negocio", "Call the business")}</Button></div>
  );

  return (
    <div data-pantalla="APP-NEG-PEDIDO" className="min-h-dvh bg-paper pb-10 lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:hidden">
        <button type="button" aria-label={E2("Cerrar", "Close")} onClick={volver} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{p.negocio.nombre}</div>
          <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{E2("PEDIDO #", "ORDER #")}{p.numero}</div>
        </div>
      </div>
      <div className="mx-auto hidden max-w-[1180px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{E2("Volver a ", "Back to ")}{p.negocio.nombre}</button>
        <div className="mt-2.5 font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{E2("PEDIDO #", "ORDER #")}{p.numero}</div>
      </div>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 pt-4 lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_372px] lg:items-start lg:gap-x-12 lg:gap-y-4 lg:px-0 lg:pt-0">
        <div className="flex min-w-0 flex-col gap-3 lg:gap-4">
          {hero}
          {!cerrado && <div className="grid lg:hidden"><OrderTracker steps={steps} /></div>}
          {!cerrado && <div className="hidden lg:grid"><OrderTracker steps={steps} horizontal /></div>}
          {donde}
          <div className="lg:hidden">{lineas}</div>
          <div className="lg:hidden">{botones}</div>
        </div>
        <div className="hidden flex-col gap-3.5 lg:flex lg:sticky lg:top-[96px]">{lineas}{botones}</div>
      </div>
    </div>
  );
}
