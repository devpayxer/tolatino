"use client";
/* APP-NEG-CHECKOUT · móvil y desktop (prototipo ckVals). Pickup con pago en el local: dónde se recoge, cuándo (lo antes
   posible o una hora de hoy), cómo se paga, el resumen y Enviar pedido. El servidor vuelve a calcular todo al enviar. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import type { MenuPublico } from "@/lib/pedir";
import { calc, carritoGuardado, guardarCarrito, limpiar, type Linea } from "../MenuCliente";
import { enviarPedido } from "../acciones-pedido";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const hora = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const hm2m = (v: string) => { const [h = 0, m = 0] = v.split(":").map(Number); return h * 60 + m; };
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-[15px]";

export function Pagar({ m, es }: { m: MenuPublico; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const biz = m.negocio.id, est = m.estado;
  const [cart, setCart] = useState<Linea[] | null>(null);
  const [cuando, setCuando] = useState<string>(est.later ? est.slots[0]?.v ?? "asap" : "asap");
  const [verHoras, setVerHoras] = useState(false);
  const [error, setError] = useState<{ msg: string; menu: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const clave = useMemo(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(16).padStart(8, "0")}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`), []);
  useEffect(() => { setCart(limpiar(m, carritoGuardado(biz))); window.scrollTo(0, 0); }, [m, biz]);

  const lines = cart ?? [];
  const C = calc(m, lines);
  const volver = () => router.push(`/n/${biz}?tab=menu`);
  // Platos con horario propio (p. ej. almuerzo hasta las 4): se programa hasta media hora antes.
  const hasta = Math.min(99999, ...lines.map((l) => m.items[l.id]?.hasta ?? 99999));
  const slots = est.slots.filter((s) => hm2m(s.v) <= hasta - 30);
  const listo = est.now + est.readyMin + C.extra;
  const whenL = cuando === "asap" ? `${E2("Lo antes posible · ", "As soon as possible · ")}${hora(listo)}` : `${E2("Programado · ", "Scheduled · ")}${hora(hm2m(cuando))}`;
  const dia = est.dia.charAt(0).toUpperCase() + est.dia.slice(1);
  const whenSub = est.later && est.openAt != null ? E2(`${m.negocio.nombre} abre a las ${hora(est.openAt)} · hoy, ${est.dia}`, `${m.negocio.nombre} opens at ${hora(est.openAt)} · today, ${est.dia}`)
    : cuando === "asap" ? (!est.sched ? E2(`${m.negocio.nombre} no toma pedidos programados`, `${m.negocio.nombre} does not take scheduled orders`) : E2("O programa una hora de hoy", "Or schedule a time today"))
    : E2(`Hoy, ${est.dia}`, `Today, ${dia}`);
  const chips = (est.later ? [] : [{ l: E2("Lo antes posible", "ASAP"), v: "asap" }]).concat(slots.map((s) => ({ l: s.l, v: s.v })));
  const items = (n: number) => `${n} ${es ? (n === 1 ? "artículo" : "artículos") : n === 1 ? "item" : "items"}`;
  const countCaps = `${m.negocio.nombre.toUpperCase()} · ${items(C.count).toUpperCase()}`;
  const taxL = C.taxPct != null ? E2(`Impuestos (${C.taxPct}%)`, `Taxes (${C.taxPct}%)`) : E2("Impuestos", "Taxes");
  const cta = `${E2("Enviar pedido · ", "Place order · ")}${money(C.total)}`;
  const hold = E2(`Pagas ${money(C.total)} en el local al recoger. No se cobra nada en la app.`, `You pay ${money(C.total)} at the store when you pick up. Nothing is charged in the app.`);
  const sinPedidos = !est.canOrd;

  const enviar = async () => {
    if (!lines.length || enviando || sinPedidos) return;
    setEnviando(true); setError(null);
    try {
      const r = await enviarPedido({ negocio: biz, cuando, clave, lineas: lines.map((l) => ({ item: l.id, ch: l.ch, k: l.k, q: l.q, nota: l.nt })) });
      if (r.ok) { guardarCarrito(biz, []); router.push(`/pedido/${r.numero}`); return; }
      if (r.entrar || r.perfil) { router.push(`/entrar?volver=${encodeURIComponent(`/n/${biz}/pagar`)}`); return; }
      setError({ msg: es ? r.msg.es : r.msg.en, menu: !!r.menu }); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError({ msg: E2("No se pudo enviar. Revisa tu conexión y prueba de nuevo.", "Could not send. Check your connection and try again."), menu: false });
    }
    setEnviando(false);
  };

  const resumen = (
    <>
      <div className={K}>{E2("RESUMEN", "SUMMARY")}</div>
      <div className="mt-1.5">
        {lines.map((l, i) => {
          const it = m.items[l.id]!;
          const sum = [it.grp.flatMap((gk) => (l.ch[gk] || []).map((x) => m.grps[gk]?.o[x]?.l ?? "")).join(" · "), l.nt ? `“${l.nt}”` : ""].filter(Boolean).join(" · ");
          return (
            <div key={i} className={`flex gap-2.5 py-2.5 ${i ? "border-t border-ink/[.07]" : ""}`}>
              <span className="min-w-5 flex-none font-display text-[12px] font-extrabold leading-[1.4]">{l.q}×</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold leading-[1.35]">{it.name}</div>
                {sum && <div className="mt-0.5 text-[11.5px] font-medium leading-[1.4] text-ink/55">{sum}</div>}
              </div>
              <span className="flex-none font-mono text-[12.5px] font-bold">{money(C.unit(it, l.ch) * l.q)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex flex-col gap-[9px] border-t border-line pt-3 text-[12.5px] font-medium text-ink/60">
        <div className="flex justify-between"><span>Subtotal</span><span className="font-mono text-ink">{money(C.sub)}</span></div>
        <div className="flex justify-between"><span>{taxL}</span><span className="font-mono text-ink">{money(C.tax)}</span></div>
        <div className="h-px bg-line" />
        <div className="flex items-baseline justify-between"><span className="text-[13.5px] font-bold text-ink">Total</span><span className="font-display text-[20px] font-extrabold leading-none tracking-[-0.02em] text-ink">{money(C.total)}</span></div>
      </div>
    </>
  );
  const nota = (
    <div className="flex items-start gap-2.5 rounded-2xl bg-pro/[.12] px-3.5 py-[13px]">
      <span className="grid flex-none pt-px"><Icon name="lock" size={16} color="var(--tl-pro-ink)" /></span>
      <span className="text-pretty text-[12.5px] font-medium leading-[1.55] text-pro-ink">{hold}</span>
    </div>
  );

  return (
    <div data-pantalla="APP-NEG-CHECKOUT" className="min-h-dvh bg-paper pb-[130px] lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      {/* Teléfono: barra de arriba */}
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:hidden">
        <button type="button" aria-label={E2("Volver", "Back")} onClick={volver} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{E2("Finalizar pedido", "Checkout")}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{countCaps}</div>
        </div>
        <Icon name="shield" size={19} color="var(--tl-open)" />
      </div>
      {/* Escritorio: volver y título */}
      <div className="mx-auto hidden max-w-[1380px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{m.negocio.nombre}</button>
        <div className="mt-3.5 flex items-center gap-3"><h1 className="font-display text-[32px] font-extrabold leading-none tracking-[-0.045em]">{E2("Finalizar pedido", "Checkout")}</h1><Icon name="shield" size={22} color="var(--tl-open)" /></div>
        <div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{countCaps}</div>
      </div>

      {cart && !lines.length && (
        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
          <div className="text-[15px] font-bold">{E2("Tu pedido está vacío", "Your order is empty")}</div>
          <div className="text-[12.5px] font-medium text-ink/55">{E2("Vuelve al menú para agregar platos.", "Go back to the menu to add dishes.")}</div>
          <div className="mt-2.5 flex"><Button variant="secondary" onClick={volver}>{E2("Volver al menú", "Back to menu")}</Button></div>
        </div>
      )}

      {lines.length > 0 && (
        <div className="mx-auto max-w-[1380px] lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_372px] lg:items-start lg:gap-x-12 lg:gap-y-8">
          <div className="flex min-w-0 flex-col gap-3 px-4 pt-4 lg:gap-3.5 lg:p-0">
            {(error || sinPedidos) && (
              <div data-screen-label="Checkout · no se pudo enviar" role="alert" className="rounded-2xl border border-danger/25 bg-danger/[.08] px-[15px] py-3.5">
                <div className="flex items-start gap-[11px]">
                  <span className="grid flex-none pt-px"><Icon name="warning" size={17} color="var(--tl-danger)" /></span>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-bold leading-[1.4] text-danger">{error ? error.msg : est.closedT || E2("Este negocio no toma más pedidos en línea este mes.", "This business takes no more online orders this month.")}</div>
                    {!error && est.closedS && <div className="mt-[3px] text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/[.72]">{est.closedS}</div>}
                  </div>
                </div>
                {(error?.menu || sinPedidos) && <div className="mt-3 flex"><Button variant="secondary" size="md" onClick={volver}>{E2("Volver al menú", "Back to menu")}</Button></div>}
              </div>
            )}
            <div className={caja}>
              <div className="flex gap-1.5 rounded-[14px] bg-ink/5 p-1">
                <div className="flex h-[38px] flex-1 items-center justify-center gap-[7px] rounded-[11px] bg-white text-[12.5px] font-bold text-ink shadow-[0_1px_4px_rgba(11,14,18,.1)]"><Icon name="bag" size={15} />Pickup</div>
              </div>
              <div className={`mt-3.5 ${K}`}>PICKUP</div>
              <div className="mt-[11px] flex items-center gap-[11px]">
                <span className="grid size-9 flex-none place-items-center rounded-[11px] bg-action/10"><Icon name="store" size={17} color="var(--tl-action)" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold">{E2("Recoges en ", "Pick up at ")}{m.negocio.direccion ?? m.negocio.nombre}</div>
                  <div className="mt-0.5 text-[11.5px] font-medium text-ink/50">{m.negocio.pickupNote || E2("Di tu número de pedido.", "Give your order number.")}</div>
                </div>
                {m.negocio.lat != null && m.negocio.lng != null && (
                  <button type="button" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${m.negocio.lat},${m.negocio.lng}`, "_blank", "noopener")} className="flex-none text-[12px] font-bold text-action">{E2("Cómo llegar", "Directions")}</button>
                )}
              </div>
              <button type="button" disabled={!chips.length || sinPedidos} onClick={() => setVerHoras(!verHoras)} className="mt-[13px] flex w-full items-center gap-[11px] border-t border-ink/[.07] pt-[13px] text-left">
                <span className="grid size-9 flex-none place-items-center rounded-[11px] bg-signal/[.14]"><Icon name="clock" size={17} color="var(--tl-open-text)" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold">{whenL}</div>
                  <div className="mt-0.5 text-[11.5px] font-medium text-ink/50">{whenSub}</div>
                </div>
                {chips.length > 1 && <span className="flex-none text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</span>}
              </button>
              {verHoras && (
                <div className="mt-3 flex flex-wrap gap-[7px]">
                  {chips.map((x) => <Chip key={x.v} variant={x.v === cuando ? "selected" : "filter"} onClick={() => { setCuando(x.v); setVerHoras(false); }}>{x.l}</Chip>)}
                </div>
              )}
              {verHoras && hasta < 99999 && (
                <div className="mt-2.5 text-pretty text-[11.5px] font-medium leading-[1.5] text-ink/60">
                  {E2(`Tu pedido tiene platos que se sirven hasta las ${hora(hasta)}: puedes programar hasta las ${hora(hasta - 30)}.`, `Your order has dishes served until ${hora(hasta)}: you can schedule up to ${hora(hasta - 30)}.`)}
                </div>
              )}
            </div>
            <div className={caja}>
              <div className={K}>{E2("PAGO", "PAYMENT")}</div>
              <div className="mt-[11px] flex gap-1.5 rounded-[14px] bg-ink/5 p-1">
                <div className="flex h-[38px] min-w-0 flex-1 items-center justify-center gap-[7px] rounded-[11px] bg-white text-[12.5px] font-bold text-ink shadow-[0_1px_4px_rgba(11,14,18,.1)]"><Icon name="dollar" size={15} />{E2("Pagas en el local", "Pay at the store")}</div>
              </div>
            </div>
            <div className={`${caja} lg:hidden`}>{resumen}</div>
            <div className="lg:hidden">{nota}</div>
          </div>
          <div className="hidden lg:block lg:sticky lg:top-[96px]">
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white p-5 shadow-[var(--shadow-float)]">
                <div>{resumen}</div>
                <div className="flex"><Button variant="action" block disabled={enviando || sinPedidos} onClick={enviar}>{enviando ? E2("Enviando…", "Sending…") : cta}</Button></div>
              </div>
              {nota}
            </div>
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <div data-screen-label="Checkout · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-5 pt-3 backdrop-blur-[14px] lg:hidden">
          <div className="flex"><Button variant="action" block disabled={enviando || sinPedidos} onClick={enviar}>{enviando ? E2("Enviando…", "Sending…") : cta}</Button></div>
        </div>
      )}
    </div>
  );
}
