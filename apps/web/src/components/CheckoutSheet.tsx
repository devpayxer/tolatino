'use client';

// On-site checkout (Stripe Payment Element) — the buyer pays inside To'Latino's own
// branded sheet instead of Stripe's hosted page (DoorDash-style). Stripe still renders
// the card fields inside secure iframes, so we never touch raw card data (PCI stays
// minimal). Design-system tokens drive the Element's appearance. The parent creates the
// PaymentIntent (startMarketplacePayment) and passes its clientSecret here; on success
// Stripe redirects to `${returnPath}?pay=success&pid=…`, where PurchaseReturnToast polls
// the staged purchase until the webhook fulfills it and shows the confirmation.

import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { IconLock as Lock } from '@tabler/icons-react';
import { getStripe } from '@/lib/stripe';
import { useLang } from '@/lib/i18n';
import { Overlay, OverlayTitle, PrimaryBtn } from '@/components/ui';

// Stripe Elements appearance mapped to the To'Latino design tokens (primary #7B61FF,
// ink #1E1B2E, pink danger, Plus Jakarta Sans, 12px radius).
const appearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#7B61FF',
    colorText: '#1E1B2E',
    colorTextSecondary: '#6B6880',
    colorDanger: '#D6336C',
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
    fontSizeBase: '15px',
  },
  rules: {
    '.Input': { borderColor: '#E4E0F0', boxShadow: 'none' },
    '.Input:focus': { borderColor: '#7B61FF', boxShadow: '0 0 0 1px #7B61FF' },
    '.Label': { fontWeight: '700', color: '#4A4763' },
  },
};

const money = (cents: number) => '$' + (cents / 100).toFixed(2);

function PayForm({ amount, returnPath, pendingId, onClose }: {
  amount: number; returnPath: string; pendingId: string; onClose: () => void;
}) {
  const { L } = useLang();
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');

  const pay = async () => {
    if (!stripe || !elements || busy) return;
    setBusy(true); setErr('');
    // On success Stripe redirects the browser to return_url; we only get back here
    // on an immediate error (card declined / validation) — show it, stay on the sheet.
    const return_url = `${window.location.origin}${returnPath}?pay=success&pid=${encodeURIComponent(pendingId)}`;
    const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url } });
    if (error) { setErr(error.message || L('No se pudo procesar el pago. Revisa tus datos.', 'Payment could not be processed. Check your details.')); setBusy(false); }
  };

  return (
    <>
      <OverlayTitle title={L('Pagar', 'Pay')} onClose={onClose} />
      <div className="mb-4 flex items-baseline justify-between rounded-field bg-lilac-2 px-4 py-3">
        <span className="text-[12.5px] font-bold text-ink-2">{L('Total a pagar', 'Total to pay')}</span>
        <span className="text-[20px] font-extrabold text-ink">{money(amount)}</span>
      </div>
      <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs' }} />
      {err && <div className="mt-3 rounded-field bg-pink-bg px-3 py-2.5 text-[12px] font-bold text-pink-dark">{err}</div>}
      <PrimaryBtn className="mt-4" onClick={pay} disabled={!stripe || !ready || busy}>
        {busy ? L('Procesando…', 'Processing…') : `${L('Pagar', 'Pay')} · ${money(amount)}`}
      </PrimaryBtn>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted">
        <Lock size={13} stroke={2.2} />
        {L('Pago seguro cifrado, procesado por Stripe.', 'Secure encrypted payment, processed by Stripe.')}
      </div>
    </>
  );
}

export function CheckoutSheet({ open, clientSecret, amount, returnPath, pendingId, onClose }: {
  open: boolean;
  clientSecret: string | null;
  amount: number;
  returnPath: string;
  pendingId: string;
  onClose: () => void;
}) {
  if (!open || !clientSecret) return null;
  return (
    <Overlay open onClose={onClose} width={460} fullHeightSheet>
      <Elements stripe={getStripe()} options={{ clientSecret, appearance }}>
        <PayForm amount={amount} returnPath={returnPath} pendingId={pendingId} onClose={onClose} />
      </Elements>
    </Overlay>
  );
}
