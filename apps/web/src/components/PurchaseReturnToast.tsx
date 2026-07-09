'use client';

// Post-payment return (DoorDash's "Order Processing" screen). When the buyer
// comes back from Stripe with ?pay=success&pid=<pending_purchase id>, we poll the
// staged purchase (RLS: buyer reads own) until the webhook fulfills it, then show
// a full "¡Pedido confirmado!" sheet — order code, ETA banner, status timeline,
// receipt and a CTA to live tracking (Mi cuenta → order detail). Tickets/bookings/
// rentals get their kind-specific confirmation. ?pay=cancel keeps the light toast.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Clock, Loader2, Receipt, Ticket, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useMyActivity } from '@/lib/myActivity';
import { Overlay, PrimaryBtn } from '@/components/ui';

type PendingRow = {
  id: string; kind: string; ref: string; status: string;
  amount: number; subtotal: number;
  payload: {
    items?: { name: string; qty: number; price?: number; opts?: string }[];
    business?: string; channel?: string;
    fulfillment?: { eta_range?: string; address?: string; delivery_fee?: number; tip?: number; service_fee?: number; paid_total?: number };
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

  return (
    <>
      {(toast || confirming) && (
        <div className="fixed inset-x-0 top-[70px] z-[70] flex justify-center px-4">
          <div className="flex max-w-[92vw] items-center gap-2.5 rounded-full bg-ink px-4 py-2.5 text-[13px] font-extrabold text-white shadow-modal">
            {confirming
              ? <><Loader2 size={15} className="flex-none animate-spin" /><span className="truncate">{L('Confirmando tu pago…', 'Confirming your payment…')}</span></>
              : <><span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/20"><X size={13} strokeWidth={3.2} /></span><span className="truncate">{toast}</span></>}
          </div>
        </div>
      )}

      {/* full confirmation sheet (design: Order Processing) */}
      <Overlay open={!!row} onClose={() => setRow(null)} width={460}>
        {row && (row.status === 'fulfilled' ? (
          <div className="flex flex-col">
            <div className="flex flex-col items-center pt-2 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
                <Check size={30} strokeWidth={3.2} className="text-green" />
              </span>
              <div className="mt-3.5 text-[20px] font-extrabold text-ink">
                {row.kind === 'order' ? L('¡Pedido confirmado!', 'Order placed!')
                  : row.kind === 'ticket' ? L('¡Boletos confirmados!', 'Tickets confirmed!')
                  : row.kind === 'booking' ? L('¡Reserva pagada!', 'Booking paid!')
                  : L('¡Renta pagada!', 'Rental paid!')}
              </div>
              <div className="mt-1 max-w-[320px] text-[12.5px] font-semibold leading-relaxed text-muted">
                {row.kind === 'order'
                  ? L(`${row.payload?.business ?? 'El negocio'} recibió tu pedido y lo está preparando.`, `${row.payload?.business ?? 'The business'} received your order and is preparing it.`)
                  : row.kind === 'ticket'
                    ? L('Tu pago fue procesado y tus boletos ya están en Mi cuenta.', 'Your payment went through and your tickets are in My account.')
                    : L('Tu pago fue procesado y la confirmación está en Mi cuenta.', 'Your payment went through and the confirmation is in My account.')}
              </div>
              {row.kind === 'order' && row.result?.code && (
                <span className="mt-2 rounded-full bg-lilac-2 px-3 py-1 text-[11px] font-extrabold text-primary-dark">{L('Pedido', 'Order')} {row.result.code}</span>
              )}
            </div>

            {/* ETA banner */}
            {row.kind === 'order' && f?.eta_range && (
              <div className="mt-4 flex items-center gap-3 rounded-card bg-primary px-4 py-3.5 text-white">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/20"><Clock size={19} strokeWidth={2.4} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10.5px] font-bold uppercase tracking-[.04em] text-white/80">{isDelivery ? L('Llega en aprox.', 'Estimated arrival') : L('Listo para recoger en', 'Ready for pickup in')}</span>
                  <span className="block text-[17px] font-extrabold">{f.eta_range}</span>
                </span>
              </div>
            )}

            {/* estado inicial */}
            {row.kind === 'order' && (
              <div className="mt-4 flex flex-col gap-0 rounded-card border border-hair bg-white p-4 shadow-card">
                {(isDelivery
                  ? [[L('Pedido confirmado', 'Order confirmed'), true], [L('Preparando tu pedido', 'Preparing your order'), false], [L('En camino', 'On the way'), false], [L('Entregado', 'Delivered'), false]]
                  : [[L('Pedido confirmado', 'Order confirmed'), true], [L('Preparando', 'Preparing'), false], [L('Listo para recoger', 'Ready for pickup'), false]]
                ).map(([label, done], i, arr) => (
                  <div key={String(label)} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${done ? 'bg-green' : i === 1 ? 'bg-primary' : 'bg-lilac-line'}`}>
                        {done ? <Check size={11} strokeWidth={3.6} className="text-white" /> : <span className={`h-1.5 w-1.5 rounded-full ${i === 1 ? 'animate-pulse bg-white' : 'bg-white/70'}`} />}
                      </span>
                      {i < arr.length - 1 && <span className={`w-[2px] flex-1 ${done ? 'bg-green' : 'bg-lilac-line'}`} style={{ minHeight: 14 }} />}
                    </div>
                    <div className={`pb-2.5 text-[12px] ${done ? 'font-extrabold text-ink' : i === 1 ? 'font-bold text-ink-soft' : 'font-semibold text-muted'}`}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* resumen */}
            <div className="mt-3 rounded-card border border-hair bg-white p-4 text-[12.5px] font-semibold text-ink-2 shadow-card">
              {(row.payload?.items ?? []).slice(0, 6).map((it, i) => (
                <div key={i} className="flex justify-between gap-3 py-0.5">
                  <span className="min-w-0 flex-1 truncate">{it.qty}× {it.name}</span>
                  {it.price != null && <span className="flex-none">{money(it.price * it.qty)}</span>}
                </div>
              ))}
              {row.kind === 'ticket' && row.result?.tickets && (
                <div className="flex items-center gap-2 py-0.5"><Ticket size={14} className="flex-none text-primary" strokeWidth={2.4} />{row.result.tickets.length} {L('boletos emitidos', 'tickets issued')}</div>
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
              <ChevronRight size={15} strokeWidth={2.8} className="ml-0.5 inline" />
            </PrimaryBtn>
            <button onClick={() => setRow(null)} className="mt-2 w-full cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white py-2.5 text-[12.5px] font-extrabold text-ink">
              {L('Seguir explorando', 'Keep browsing')}
            </button>
          </div>
        ) : (
          // paid-but-refunded (fulfillment failed → auto-refund) — be honest about it
          <div className="flex flex-col items-center px-2 py-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-bg"><Receipt size={24} className="text-pink-dark" strokeWidth={2.2} /></span>
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
