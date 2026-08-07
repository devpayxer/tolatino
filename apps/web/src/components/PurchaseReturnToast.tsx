'use client';

// Post-payment return (DoorDash's "Order Processing" screen). When the buyer
// comes back from Stripe with ?pay=success&pid=<pending_purchase id>, we poll the
// staged purchase (RLS: buyer reads own) until the webhook fulfills it, then show
// a "¡Pedido recibido!" sheet — order code, ETA banner, a LIVE status tracker that
// starts at "Esperando confirmación" (the business hasn't accepted yet) and only
// advances once it does, receipt, and a CTA to full tracking (Mi cuenta → order
// detail). Tickets/bookings/rentals get their kind-specific confirmation.
// ?pay=cancel keeps the light toast.

import { useEffect, useRef, useState } from 'react';
import { imgUrl, ANCHO } from '@/lib/img';
import { useRouter } from 'next/navigation';
import { IconCheck as Check, IconChevronRight as ChevronRight, IconClock as Clock, IconLoader2 as Loader2, IconReceipt as Receipt, IconTicket as Ticket, IconX as X } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useMyActivity, useOrderPoll } from '@/lib/myActivity';
import { clearCart } from '@/lib/cartStore';
import { Overlay, PrimaryBtn } from '@/components/ui';
import { orderStageIdx, OrderStepsVertical } from '@/components/OrderSteps';

type PendingRow = {
  id: string; kind: string; ref: string; status: string;
  amount: number; subtotal: number;
  payload: {
    items?: { name: string; qty: number; price?: number; opts?: string; img?: string }[];
    business?: string; channel?: string;
    fulfillment?: { eta_range?: string; address?: string; delivery_fee?: number; tip?: number; service_fee?: number; paid_total?: number; kind?: string };
    // booking (kind='booking') appointment detail — shown on the confirmation card
    service_name?: string; starts_at?: string; staff_name?: string; variant?: string;
    // rental (kind='rental') detail
    item_name?: string; start_at?: string; end_at?: string | null;
  } | null;
  result: { id?: string; code?: string; tickets?: string[] } | null;
};

export function PurchaseReturnToast() {
  const { L } = useLang();
  const act = useMyActivity();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false); // waiting on the webhook
  const [row, setRow] = useState<PendingRow | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pay = params.get('pay');
    const pid = params.get('pid');
    if (pay !== 'success' && pay !== 'cancel') return;
    cleanUrl();

    if (pay === 'cancel') {
      setToast(L('Pago cancelado. Tu carrito sigue disponible.', 'Payment canceled. Your cart is still there.'));
      const t = window.setTimeout(() => setToast(null), 3600);
      return () => window.clearTimeout(t);
    }

    // success — refresh activity now (and again shortly, fulfillment is async)
    act.refresh();
    const again = window.setTimeout(() => act.refresh(), 2500);

    if (!pid || !supabase) {
      setToast(L('¡Pago exitoso! Tu compra está confirmada.', 'Payment successful! Your purchase is confirmed.'));
      const t = window.setTimeout(() => setToast(null), 4200);
      return () => { window.clearTimeout(t); window.clearTimeout(again); };
    }

    // Poll the staged purchase until the webhook fulfills it (~1s cadence, 25s cap).
    setConfirming(true);
    let tries = 0;
    const poll = async () => {
      tries += 1;
      const { data } = await supabase!
        .from('pending_purchases')
        .select('id,kind,ref,status,amount,subtotal,payload,result')
        .eq('id', pid)
        .maybeSingle();
      const r = data as PendingRow | null;
      if (r && r.status !== 'pending') {
        setConfirming(false);
        setRow(r);
        act.refresh();
        // A paid+fulfilled online order is done → drop that business's saved cart
        // so the (now-ordered) items don't reappear on the next visit. Refunded /
        // failed keeps the cart so the buyer can retry.
        if (r.kind === 'order' && r.status === 'fulfilled' && r.ref) clearCart(r.ref);
        return;
      }
      if (tries >= 25) {
        setConfirming(false);
        setToast(L('Pago recibido — tu confirmación aparecerá en Mi cuenta en un momento.', 'Payment received — your confirmation will appear in My account shortly.'));
        window.setTimeout(() => setToast(null), 5200);
        return;
      }
      pollRef.current = window.setTimeout(poll, 1000);
    };
    void poll();
    return () => { if (pollRef.current) window.clearTimeout(pollRef.current); window.clearTimeout(again); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete('pay');
    url.searchParams.delete('pid');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }

  const money = (n: number | undefined | null) => (n == null ? '' : `$${Number(n).toFixed(2)}`);
  const f = row?.payload?.fulfillment;
  const isDelivery = row?.payload?.channel === 'delivery';
  // STORE order (all lines are products) → Amazon voice: packing, day-based
  // delivery window, "we'll tell you when it's ready for store pickup".
  const isStore = f?.kind === 'store';
  // Reflect the REAL order stage (live from Mi actividad). Just after payment it's
  // 'new' → "Esperando confirmación"; if the owner accepts while this is open, it
  // advances on its own. Falls back to 0 until the order row loads.
  const orderId = row?.result?.id;
  const liveOrder = orderId ? act.orders.find((o) => o.id === orderId) : undefined;
  const stageIdx = orderStageIdx(liveOrder);
  const bizName = row?.payload?.business ?? (L('El negocio', 'The business'));
  // Keep the open sheet advancing even if the Realtime websocket isn't delivering.
  useOrderPoll(row?.kind === 'order' && row.status === 'fulfilled' ? orderId ?? null : null);

  return (
    <>
      {(toast || confirming) && (
        <div className="fixed inset-x-0 top-[70px] z-[70] flex justify-center px-4">
          <div className="flex max-w-[92vw] items-center gap-2.5 rounded-full bg-ink px-4 py-2.5 text-[13px] font-extrabold text-white shadow-modal">
            {confirming
              ? <><Loader2 size={15} className="flex-none animate-spin" /><span className="truncate">{L('Confirmando tu pago…', 'Confirming your payment…')}</span></>
              : <><span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/20"><X size={13} stroke={3.2} /></span><span className="truncate">{toast}</span></>}
          </div>
        </div>
      )}

      {/* full confirmation sheet (design: Order Processing) */}
      <Overlay open={!!row} onClose={() => setRow(null)} width={460}>
        {row && (row.status === 'fulfilled' ? (
          <div className="flex flex-col">
            <div className="flex flex-col items-center pt-2 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
                <Check size={30} stroke={3.2} className="text-green" />
              </span>
              <div className="mt-3.5 text-[20px] font-extrabold text-ink">
                {row.kind === 'order' ? (isStore ? L('¡Gracias por tu compra!', 'Thanks for your purchase!') : L('¡Pedido recibido!', 'Order placed!'))
                  : row.kind === 'ticket' ? L('¡Boletos confirmados!', 'Tickets confirmed!')
                  : row.kind === 'booking' ? L('¡Cita confirmada!', 'Appointment confirmed!')
                  : L('¡Renta pagada!', 'Rental paid!')}
              </div>
              <div className="mt-1 max-w-[320px] text-[12.5px] font-semibold leading-relaxed text-muted">
                {row.kind === 'order'
                  ? stageIdx > 0
                    ? isStore
                      ? L(`${bizName} confirmó tu compra y está empacando tu pedido.`, `${bizName} confirmed your purchase and is packing your order.`)
                      : L(`${bizName} confirmó tu pedido y lo está preparando.`, `${bizName} confirmed your order and is preparing it.`)
                    : isStore
                      ? L(`Tu pago fue procesado. ${bizName} confirmará tu compra en breve.`, `Your payment went through. ${bizName} will confirm your purchase shortly.`)
                      : L(`Enviamos tu pedido a ${bizName}. Te avisamos apenas lo confirme.`, `We sent your order to ${bizName}. We'll let you know as soon as they confirm it.`)
                  : row.kind === 'ticket'
                    ? L('Tu pago fue procesado y tus boletos ya están en Mi cuenta.', 'Your payment went through and your tickets are in My account.')
                    : row.kind === 'booking'
                      ? L(`Tu pago aseguró tu cita en ${bizName} — te esperamos.`, `Your payment secured your appointment at ${bizName} — see you there.`)
                      : L('Tu pago fue procesado y la confirmación está en Mi cuenta.', 'Your payment went through and the confirmation is in My account.')}
              </div>

              {/* appointment / rental summary card (paid via OUR checkout sheet) */}
              {(row.kind === 'booking' || row.kind === 'rental') && (
                <div className="mt-3 w-full max-w-[300px] rounded-card-sm border border-line bg-white p-4 text-left">
                  <div className="text-[14px] font-extrabold text-ink">{row.payload?.service_name ?? row.payload?.item_name ?? ''}</div>
                  {row.kind === 'booking' && row.payload?.staff_name && (
                    <div className="mt-1 text-[12px] font-bold text-ink-soft">{L('con', 'with')} {row.payload.staff_name}{row.payload?.variant ? ` · ${row.payload.variant}` : ''}</div>
                  )}
                  {(row.payload?.starts_at || row.payload?.start_at) && (
                    <div className="mt-2 border-t border-hair pt-2 text-[12.5px] font-bold text-ink-soft">
                      {new Date((row.payload?.starts_at ?? row.payload?.start_at)!).toLocaleString(L('es-US', 'en-US'), { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}
              {row.kind === 'order' && row.result?.code && (
                <span className="mt-2 rounded-full bg-lilac-2 px-3 py-1 text-[11px] font-extrabold text-primary-dark">{L('Pedido', 'Order')} {row.result.code}</span>
              )}
            </div>

            {/* ETA banner — store orders show the store's day-based window
                ("2–5 días") or, for pickup, a "we'll tell you when it's ready" note */}
            {row.kind === 'order' && (f?.eta_range ? (
              <div className="mt-4 flex items-center gap-3 rounded-card bg-primary px-4 py-3.5 text-white">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/20"><Clock size={19} stroke={2.4} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10.5px] font-bold uppercase tracking-[.04em] text-white/80">
                    {isStore
                      ? isDelivery ? L('Entrega estimada', 'Estimated delivery') : L('Listo para recoger', 'Ready for pickup')
                      : isDelivery ? L('Llega en aprox.', 'Estimated arrival') : L('Listo para recoger en', 'Ready for pickup in')}
                  </span>
                  <span className="block text-[17px] font-extrabold">{f.eta_range}</span>
                </span>
              </div>
            ) : isStore && !isDelivery ? (
              <div className="mt-4 flex items-center gap-3 rounded-card bg-lilac-2 px-4 py-3.5">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white"><Clock size={18} stroke={2.2} className="text-primary-dark" /></span>
                <span className="min-w-0 flex-1 text-[12.5px] font-bold leading-snug text-ink-soft">{L('Te avisaremos cuando tu pedido esté listo para recoger en tienda.', "We'll let you know when your order is ready for store pickup.")}</span>
              </div>
            ) : null)}

            {/* estado en vivo — arranca en "Esperando confirmación" (paso 1 activo,
                sin palomita) y avanza solo cuando el negocio acepta. */}
            {row.kind === 'order' && (
              <div className="mt-4"><OrderStepsVertical stageIdx={stageIdx} isDelivery={isDelivery} store={isStore} /></div>
            )}

            {/* resumen (los pedidos de tienda llevan miniaturas, como Amazon) */}
            <div className="mt-3 rounded-card border border-line bg-white p-4 text-[12.5px] font-semibold text-ink-2">
              {(row.payload?.items ?? []).slice(0, 6).map((it, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-0.5">
                  {isStore && (
                    <span className="relative h-9 w-9 flex-none overflow-hidden rounded-lg bg-lilac-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {it.img && <img src={imgUrl(it.img, ANCHO.tarjeta)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{it.qty}× {it.name}</span>
                  {it.price != null && <span className="flex-none">{money(it.price * it.qty)}</span>}
                </div>
              ))}
              {row.kind === 'ticket' && row.result?.tickets && (
                <div className="flex items-center gap-2 py-0.5"><Ticket size={14} className="flex-none text-primary" stroke={2.4} />{row.result.tickets.length} {L('boletos emitidos', 'tickets issued')}</div>
              )}
              <div className="mt-1.5 flex justify-between border-t border-hair pt-2 text-[13.5px] font-extrabold text-ink">
                <span>{L('Total pagado', 'Total charged')}</span><span>{money(row.amount / 100)}</span>
              </div>
            </div>

            <PrimaryBtn className="mt-4" onClick={() => {
              const target = row.kind === 'order'
                ? `/cuenta/?sec=pedidos${row.result?.id ? `&order=${row.result.id}` : ''}`
                : row.kind === 'ticket' ? '/cuenta/?sec=boletos' : row.kind === 'booking' ? '/cuenta/?sec=reservas' : '/cuenta/?sec=rentas';
              setRow(null);
              router.push(target);
            }}>
              {row.kind === 'order' ? L('Seguir mi pedido', 'Track my order') : L('Ver en Mi cuenta', 'View in My account')}
              <ChevronRight size={15} stroke={2.8} className="ml-0.5 inline" />
            </PrimaryBtn>
            <button onClick={() => setRow(null)} className="mt-2 w-full cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white py-2.5 text-[12.5px] font-extrabold text-ink">
              {L('Seguir explorando', 'Keep browsing')}
            </button>
          </div>
        ) : (
          // paid-but-refunded (fulfillment failed → auto-refund) — be honest about it
          <div className="flex flex-col items-center px-2 py-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-bg"><Receipt size={24} className="text-pink-dark" stroke={2.2} /></span>
            <div className="mt-3 text-[17px] font-extrabold text-ink">{L('Pago reembolsado', 'Payment refunded')}</div>
            <div className="mt-1 max-w-[300px] text-[12.5px] font-semibold leading-relaxed text-muted">
              {L('No pudimos completar tu compra (p. ej. se agotó) y tu pago fue reembolsado automáticamente.', "We couldn't complete your purchase (e.g. sold out) and your payment was automatically refunded.")}
            </div>
            <PrimaryBtn className="mt-4" onClick={() => setRow(null)}>{L('Entendido', 'Got it')}</PrimaryBtn>
          </div>
        ))}
      </Overlay>
    </>
  );
}
