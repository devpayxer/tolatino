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

function PayForm({ amount, returnPath, pendingId, subscription, onClose, onSuccess }: {
  amount: number; returnPath: string; pendingId: string; subscription?: boolean; onClose: () => void;
  onSuccess?: () => void;
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
    // `redirect: 'if_required'` (2026-08-05): con TARJETA — el caso de casi
    // todos — el resultado vuelve AQUÍ, en la página, sin recargar. Antes se
    // dependía siempre del redirect de Stripe, y eso tenía dos costes: el
    // estado en memoria (p. ej. las fotos del alta) moría en la recarga, y el
    // `?sub=success` iba FIJO en la URL de vuelta — un pago fallido por un
    // método con redirección volvía con la marca de éxito puesta. Los métodos
    // que SÍ redirigen (Cash App, etc.) siguen su camino y la página de vuelta
    // debe mirar `redirect_status`, que Stripe añade con el resultado REAL.
    const qs = subscription ? '?sub=success' : `?pay=success&pid=${encodeURIComponent(pendingId)}`;
    const return_url = `${window.location.origin}${returnPath}${qs}`;
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url },
      redirect: 'if_required',
    });
    if (error) {
      setErr(error.message || L('No se pudo procesar el pago. Revisa tus datos.', 'Payment could not be processed. Check your details.'));
      setBusy(false);
      return;
    }
    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      // Pago resuelto sin salir de la página. Quien montó la hoja decide qué
      // sigue; sin `onSuccess`, se navega a donde Stripe habría redirigido —
      // mismo destino, mismos parámetros, cero contratos rotos.
      if (onSuccess) { onSuccess(); return; }
      window.location.assign(return_url);
      return;
    }
    // Estado raro sin redirect (requires_action sin manejar, etc.): decirlo.
    setErr(L('El pago no se completó. Intenta de nuevo.', "The payment didn't complete. Try again."));
    setBusy(false);
  };

  return (
    <>
      <OverlayTitle title={subscription ? L('Activar Verified', 'Activate Verified') : L('Pagar', 'Pay')} onClose={onClose} />
      <div className="mb-4 flex items-baseline justify-between rounded-field bg-lilac-2 px-4 py-3">
        <span className="text-[12.5px] font-bold text-ink-2">
          {subscription ? L('Hoy pagas', 'Charged today') : L('Total a pagar', 'Total to pay')}
        </span>
        <span className="text-[20px] font-extrabold text-ink">
          {money(amount)}{subscription && <span className="text-[11px] font-bold text-muted">/{L('mes', 'mo')}</span>}
        </span>
      </div>
      {subscription && (
        <p className="mb-3 text-[11.5px] font-semibold leading-[1.5] text-muted">
          {L('Se renueva cada mes. Cancela cuando quieras desde tu panel, en Facturación.',
             'Renews monthly. Cancel anytime from your dashboard, under Billing.')}
        </p>
      )}
      <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs' }} />
      {err && <div className="mt-3 rounded-field bg-pink-bg px-3 py-2.5 text-[12px] font-bold text-pink-dark">{err}</div>}
      <PrimaryBtn className="mt-4" onClick={pay} disabled={!stripe || !ready || busy}>
        {busy ? L('Procesando…', 'Processing…')
          : subscription ? `${L('Suscribirme', 'Subscribe')} · ${money(amount)}/${L('mes', 'mo')}`
            : `${L('Pagar', 'Pay')} · ${money(amount)}`}
      </PrimaryBtn>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted">
        <Lock size={13} stroke={2.2} />
        {L('Pago seguro cifrado, procesado por Stripe.', 'Secure encrypted payment, processed by Stripe.')}
      </div>
    </>
  );
}

export function CheckoutSheet({ open, clientSecret, amount, returnPath, pendingId = '', subscription, onClose, onSuccess }: {
  open: boolean;
  clientSecret: string | null;
  amount: number;
  returnPath: string;
  /** Compra en escena a la que volver. No aplica en modo suscripción. */
  pendingId?: string;
  /** Cobro recurrente (Verified): cambia el copy y la vuelta, mismo Element. */
  subscription?: boolean;
  onClose: () => void;
  /** Pago con tarjeta resuelto EN la página (sin redirect). Si falta, se navega
   *  a `returnPath` con los mismos parámetros que pondría Stripe. */
  onSuccess?: () => void;
}) {
  if (!open || !clientSecret) return null;
  return (
    <Overlay open onClose={onClose} width={460} fullHeightSheet>
      <Elements stripe={getStripe()} options={{ clientSecret, appearance }}>
        <PayForm amount={amount} returnPath={returnPath} pendingId={pendingId} subscription={subscription} onClose={onClose} onSuccess={onSuccess} />
      </Elements>
    </Overlay>
  );
}
