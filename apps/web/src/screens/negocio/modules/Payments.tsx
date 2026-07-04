'use client';

// Cuenta → Pagos. Real revenue derived from the business's completed orders
// (business_orders, migration 0028). Automatic PAYOUTS need a payment processor
// (Stripe) which is a deliberate deferral per CLAUDE.md (bootstrapped; evaluate at
// the transaction phase) — so the deposits section is an honest "connect
// payments" state rather than fake payout rows. Demo shows a sample summary.

import { useEffect, useState } from 'react';
import { DollarSign, Loader2, Receipt, ShoppingBag, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useBizAdmin } from '@/lib/bizAdmin';
import type { PanelCtx } from '@/screens/negocio/tabs';

type Summary = { revenue: number; orders: number };

export function PaymentsModule({ ctx }: { ctx: PanelCtx }) {
  const { L } = ctx;
  const admin = useBizAdmin();
  const router = useRouter();
  const real = admin.active;
  const persistable = !admin.demo && !!real;

  const [sum, setSum] = useState<Summary>({ revenue: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!persistable || !real || !supabase) {
      setSum(admin.demo ? { revenue: 48120, orders: 1284 } : { revenue: 0, orders: 0 });
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

  if (admin.loading || loading) {
    return (
      <div className="flex items-center justify-center rounded-card border border-hair bg-white py-16 text-muted shadow-card">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!real) {
    return (
      <div className="mx-auto max-w-[440px] rounded-card border border-hair bg-white p-6 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
          <Store size={24} className="text-primary" strokeWidth={2.2} />
        </span>
        <h3 className="mt-4 text-[17px] font-extrabold text-ink">{L('Conecta tu negocio', 'Connect your business')}</h3>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-semibold leading-relaxed text-muted">
          {L('Publica tu negocio para ver tus ingresos y pagos.', 'Publish your business to see revenue and payouts.')}
        </p>
        <button onClick={() => router.push('/negocio/publicar')} className="mt-5 cursor-pointer rounded-btn bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white shadow-cta-sm">
          {L('Publicar negocio', 'Publish business')}
        </button>
      </div>
    );
  }

  const money = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const avg = sum.orders ? sum.revenue / sum.orders : 0;

  const kpi = (Icon: typeof DollarSign, c: string, bg: string, label: string, value: string) => (
    <div className="rounded-card border border-hair bg-white p-4 shadow-card">
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

      {/* honest deferred-payouts state (payments need Stripe — evaluated at the transaction phase) */}
      <div className="mt-4 rounded-card border border-hair bg-white p-5 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lilac">
          <DollarSign size={22} className="text-primary" strokeWidth={2.2} />
        </span>
        <h3 className="mt-3 text-[15px] font-extrabold text-ink">{L('Depósitos automáticos', 'Automatic payouts')}</h3>
        <p className="mx-auto mt-1.5 max-w-[380px] text-[12.5px] font-semibold leading-relaxed text-muted">
          {L('Para recibir pagos y depósitos a tu banco, conectaremos un procesador de pagos. Está en camino — por ahora gestionas los pedidos y sus totales desde Pedidos.', "To receive payments and bank deposits we'll connect a payment processor. It's on the way — for now you manage orders and their totals in Pedidos.")}
        </p>
        <span className="mt-3 inline-block rounded-full bg-amber-bg px-3 py-1 text-[11px] font-extrabold text-amber-ink">
          {L('Próximamente', 'Coming soon')}
        </span>
      </div>
    </div>
  );
}
