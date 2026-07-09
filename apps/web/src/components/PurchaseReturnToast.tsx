'use client';

// Global toast shown when the buyer returns from Stripe Checkout for a marketplace
// purchase (order / tickets). The purchase itself is fulfilled server-side by the
// payments webhook, so here we only confirm + refresh My activity so the new order/
// tickets appear. Uses the `?pay=success|cancel` param (kept distinct from the
// business-subscription `?checkout=` param so the two never collide).

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useMyActivity } from '@/lib/myActivity';

export function PurchaseReturnToast() {
  const { L } = useLang();
  const act = useMyActivity();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pay = params.get('pay');
    if (pay !== 'success' && pay !== 'cancel') return;
    if (pay === 'success') {
      setMsg({ ok: true, text: L('¡Pago exitoso! Tu compra está confirmada.', 'Payment successful! Your purchase is confirmed.') });
      // Fulfillment is async (webhook) — refresh now and shortly after so the new
      // order/tickets land in "Mi cuenta" without a manual reload.
      act.refresh();
      const t = window.setTimeout(() => act.refresh(), 2500);
      const clear = window.setTimeout(() => setMsg(null), 4200);
      cleanUrl();
      return () => { window.clearTimeout(t); window.clearTimeout(clear); };
    }
    setMsg({ ok: false, text: L('Pago cancelado. Tu carrito sigue disponible.', 'Payment canceled. Your cart is still there.') });
    const clear = window.setTimeout(() => setMsg(null), 3600);
    cleanUrl();
    return () => window.clearTimeout(clear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete('pay');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }

  if (!msg) return null;
  return (
    <div className="fixed inset-x-0 top-[70px] z-[70] flex justify-center px-4">
      <div className={`flex max-w-[92vw] items-center gap-2.5 rounded-full px-4 py-2.5 text-[13px] font-extrabold text-white shadow-modal ${msg.ok ? 'bg-green' : 'bg-ink'}`}>
        <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${msg.ok ? 'bg-white/25' : 'bg-white/15'}`}>
          {msg.ok ? <Check size={13} strokeWidth={3.2} /> : <X size={13} strokeWidth={3.2} />}
        </span>
        <span className="truncate">{msg.text}</span>
      </div>
    </div>
  );
}
