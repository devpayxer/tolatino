'use client';

// Cuenta → Pagos. Real revenue derived from the business's completed orders
// (business_orders, migration 0028). Automatic PAYOUTS need a payment processor
// (Stripe) which is a deliberate deferral per CLAUDE.md (bootstrapped; evaluate at
// the transaction phase) — so the deposits section is an honest "connect
// payments" state rather than fake payout rows. Demo shows a sample summary.

import { useEffect, useState } from 'react';
import { IconCheck as Check, IconCurrencyDollar as DollarSign, IconExternalLink as ExternalLink, IconLoader2 as Loader2, IconReceipt as Receipt, IconShoppingBag as ShoppingBag, IconBuildingStore as Store } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useBizAdmin } from '@/lib/bizAdmin';
import type { PanelCtx } from '@/screens/negocio/tabs';
import { startConnectOnboarding, getConnectStatus, type ConnectStatus } from '@/lib/stripe';
import { Toast } from '@/screens/negocio/modules/_page';

type Summary = { revenue: number; orders: number };

export function PaymentsModule({ ctx }: { ctx: PanelCtx }) {
  const { L } = ctx;
  // Este módulo no tenía forma de avisar de nada. Mismo aviso que usa Facturación.
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2600); };
  const admin = useBizAdmin();
  const router = useRouter();
  const real = admin.active;
  const persistable = !admin.demo && !!real;

  const [sum, setSum] = useState<Summary>({ revenue: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!persistable || !real || !supabase) {
      setSum({ revenue: 0, orders: 0 }); // sin ingresos fabricados: el modo demo ya no existe (regla #8)
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase!
        .from('business_orders')
        .select('total,status')
        .eq('business_id', real.id)
        .eq('status', 'completed');
      if (cancelled) return;
      const rows = (data as { total: number | null }[]) ?? [];
      setSum({ revenue: rows.reduce((a, r) => a + Number(r.total ?? 0), 0), orders: rows.length });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  // Stripe Connect account status (payouts to the seller's bank).
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);
  useEffect(() => {
    if (!persistable || !real) { setConnect(null); return; }
    let cancelled = false;
    getConnectStatus(real.id).then((s) => { if (!cancelled) setConnect(s); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  // On return from Stripe onboarding (?connect=done|refresh), re-sync + clean the URL.
  useEffect(() => {
    if (typeof window === 'undefined' || !real) return;
    if (new URLSearchParams(window.location.search).get('connect')) {
      getConnectStatus(real.id).then(setConnect);
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id]);

  const connectOnboard = async () => {
    if (!real) return;
    setConnectBusy(true);
    const { url, error } = await startConnectOnboarding(real.id);
    setConnectBusy(false);
    // Sin este aviso el botón «Conectar» no hacía NADA visible cuando fallaba:
    // el dueño pulsaba, no pasaba nada, y se quedaba sin poder cobrar sin saber
    // por qué. (Auditoría de Negocios, 2026-08-04.)
    if (!url) {
      flash(error === 'offline'
        ? L('Sin conexión. Revisa tu internet.', 'No connection. Check your internet.')
        : L('No pudimos abrir la conexión con Stripe. Inténtalo de nuevo.', "We couldn't open the Stripe connection. Try again."));
      return;
    }
    window.location.href = url;
  };

  if (admin.loading || loading) {
    return (
      <div className="flex items-center justify-center rounded-card border border-line bg-white py-16 text-muted shadow-card">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!real) {
    return (
      <div className="mx-auto max-w-[440px] rounded-card border border-line bg-white p-6 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
          <Store size={24} className="text-primary" stroke={2.2} />
        </span>
        <h3 className="mt-4 text-[17px] font-extrabold text-ink">{L('Conecta tu negocio', 'Connect your business')}</h3>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-semibold leading-relaxed text-muted">
          {L('Publica tu negocio para ver tus ingresos y pagos.', 'Publish your business to see revenue and payouts.')}
        </p>
        <button onClick={() => router.push('/negocio/publicar')} className="tap-y mt-5 cursor-pointer rounded-btn bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white shadow-cta-sm">
          {L('Publicar negocio', 'Publish business')}
        </button>
      </div>
    );
  }

  const money = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const avg = sum.orders ? sum.revenue / sum.orders : 0;

  const kpi = (Icon: typeof DollarSign, c: string, bg: string, label: string, value: string) => (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <span className="flex h-9 w-9 items-center justify-center rounded-btn" style={{ background: bg }}>
        <Icon size={16} strokeWidth={2.2} style={{ color: c }} />
      </span>
      <div className="mt-2.5 text-[20px] font-extrabold text-ink">{value}</div>
      <div className="text-[11.5px] font-bold text-muted">{label}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="grid grid-cols-3 gap-3">
        {kpi(DollarSign, '#1F8A4C', '#E3F5EA', L('Ingresos', 'Revenue'), money(sum.revenue))}
        {kpi(ShoppingBag, '#6D4DF6', '#F1EFFA', L('Pedidos', 'Orders'), String(sum.orders))}
        {kpi(Receipt, '#B5791A', '#FCEFD6', L('Ticket prom.', 'Avg ticket'), money(avg))}
      </div>
      <div className="mt-3 text-[11px] font-semibold text-muted">
        {L('Ingresos de pedidos completados en To’Latino.', 'Revenue from completed To’Latino orders.')}
      </div>

      {/* Stripe Connect — real payouts to the seller's bank */}
      {(() => {
        const active = !!connect?.charges_enabled;
        const pending = !!connect?.details_submitted && !connect?.charges_enabled;
        return (
          <div className="mt-4 rounded-card border border-line bg-white p-5 shadow-card">
            <div className="flex items-start gap-3">
              <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${active ? 'bg-green-bg' : 'bg-lilac'}`}>
                {active ? <Check size={22} className="text-green-dark" stroke={2.6} /> : <DollarSign size={22} className="text-primary" stroke={2.2} />}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-extrabold text-ink">{L('Recibir pagos y depósitos', 'Receive payments & payouts')}</h3>
                <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-muted">
                  {active
                    ? L('Tu cuenta está conectada. Los cobros de pedidos, boletos y reservas se depositan a tu banco automáticamente.', 'Your account is connected. Order, ticket and booking payments deposit to your bank automatically.')
                    : pending
                      ? L('Stripe está verificando tu cuenta. Completa los datos pendientes para empezar a recibir pagos.', 'Stripe is verifying your account. Finish the pending details to start receiving payments.')
                      : L('Conecta una cuenta con Stripe para cobrar a tus clientes y recibir depósitos a tu banco. Toma unos minutos.', 'Connect a Stripe account to charge customers and get bank deposits. It takes a few minutes.')}
                </p>
                {active ? (
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-bg px-3 py-1 text-[11px] font-extrabold text-green-dark"><Check size={12} stroke={3} />{L('Recibiendo pagos', 'Receiving payments')}</span>
                ) : (
                  <button onClick={connectOnboard} disabled={connectBusy || connect === null} className="tap-y mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm disabled:opacity-60">
                    {connectBusy ? L('Abriendo Stripe…', 'Opening Stripe…') : <>{pending ? L('Continuar verificación', 'Continue verification') : L('Conectar con Stripe', 'Connect with Stripe')}<ExternalLink size={13} stroke={2.4} /></>}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      <Toast msg={toast} />
    </div>
  );
}
