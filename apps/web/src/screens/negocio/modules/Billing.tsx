'use client';

// Plan y facturación / Billing module (business dashboard). Four sub-tabs:
// Plan (tier-styled current-plan card + usage meters + next invoice + add-on
// toggles + cancel), Comparar (Free/Verified/Premium feature table + pick
// buttons), Pagos (payment cards + billing info fields) and Facturas (YTD +
// invoice history with download). Tier-aware throughout via a LOCAL plan
// state so "Confirm upgrade" / "Cancel" actually restyle the plan card.
// Mobile-first single column; on desktop each tab expands into multi-column
// grids with a sticky side rail. Upgrade takes over the screen as a full-screen
// ModulePage; Cancel is a small centered confirm dialog (never a bottom sheet).

import { useEffect, useState } from 'react';
import { IconAlertTriangle as AlertTriangle, IconCalendar as Calendar, IconCheck as Check, IconDownload as Download, IconFileText as FileText, IconPhoto as ImageIcon, IconLock as Lock, IconMail as Mail, IconMapPin as MapPin, IconMessage2 as MessageSquare, IconPencil as Pencil, IconPlus as Plus, IconShield as Shield, IconShoppingBag as ShoppingBag, IconStar as Star, IconUsers as Users, IconX as X, IconBolt as Zap } from '@tabler/icons-react';
import type { PanelCtx, TabKey, Tier } from '@/screens/negocio/tabs';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import { SectionTabs, type SectionTab } from '@/components/SectionTabs';
import { useBizAdmin } from '@/lib/bizAdmin';
import { startCheckout, openBillingPortal } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { useScrollLock } from '@/lib/scrollLock';

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

type Sub = 'plan' | 'compare' | 'methods' | 'invoices';
type AddonKey = 'featured' | 'boost' | 'seats' | 'sms';

export function BillingModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L } = ctx;
  void tab; // panel-level key ('billing'); sub-tabs are managed locally below.
  const admin = useBizAdmin();
  const real = admin.active; // real signed-in business → charge via Stripe; demo → local restyle

  // Local plan state so upgrade/cancel restyle the card live (like the prototype).
  const [tier, setTier] = useState<Tier>(ctx.tier);
  const isFree = tier === 'free';
  const isPaid = tier !== 'free';
  const isPremium = tier === 'premium';

  const [sub, setSub] = useState<Sub>('plan');
  const [addons, setAddons] = useState<Record<AddonKey, boolean>>({ featured: false, boost: false, seats: false, sms: false });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  useScrollLock(cancelOpen);
  const [pick, setPick] = useState<'verified' | 'premium'>('premium');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 2000);
  };

  // Keep the card in sync with the real business tier (updates after the webhook).
  useEffect(() => { setTier(ctx.tier); }, [ctx.tier]);

  // Handle the return from Stripe Checkout (?checkout=success|cancel).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('checkout');
    if (q === 'success') flash(L('¡Pago recibido! Activando tu plan…', 'Payment received! Activating your plan…'));
    else if (q === 'cancel') flash(L('Pago cancelado', 'Checkout canceled'));
    if (q) window.history.replaceState({}, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meta = { free: { name: 'Free', price: '$0/mes' }, verified: { name: 'Verified', price: '$19/mes' }, premium: { name: 'Premium', price: '$49/mes' } }[tier];

  // A REAL signed-in business shows its REAL subscription (business_subscriptions)
  // and manages its card/invoices in the Stripe portal — never invented data.
  // The fabricated cards/invoices/renewal are shown ONLY in demo/showcase mode.
  const isReal = !!real && !admin.demo;
  const [subInfo, setSubInfo] = useState<{ current_period_end: string | null; status: string | null } | null>(null);
  useEffect(() => {
    if (!isReal || !real || !supabase) { setSubInfo(null); return; }
    let off = false;
    void supabase.from('business_subscriptions').select('current_period_end,status').eq('business_id', real.id).maybeSingle()
      .then(({ data }) => { if (!off) setSubInfo((data as { current_period_end: string | null; status: string | null } | null) ?? null); });
    return () => { off = true; };
  }, [isReal, real?.id]);
  const realRenew = subInfo?.current_period_end
    ? new Date(subInfo.current_period_end).toLocaleDateString(ctx.es ? 'es-US' : 'en-US', { day: 'numeric', month: 'short' })
    : null;
  const renewDate = isReal ? (realRenew ?? L('—', '—')) : L('14 Nov', 'Nov 14');

  const openPortal = async () => {
    if (!real) return;
    setBusy(true);
    const { url, error } = await openBillingPortal(real.id);
    setBusy(false);
    if (url) { window.location.href = url; return; }
    flash(error === 'no subscription' ? L('No tienes una suscripción activa', 'No active subscription') : L('No se pudo abrir el portal', 'Could not open the portal'));
  };
  const portalCta = (
    <div className="mx-auto max-w-md rounded-card border border-hair bg-white p-6 text-center shadow-card">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lilac"><Lock size={22} className="text-primary" stroke={2.2} /></span>
      <div className="mt-3 text-[14px] font-extrabold text-ink">{L('Administra tus pagos en Stripe', 'Manage payments in Stripe')}</div>
      <p className="mt-1.5 text-[12px] font-semibold leading-relaxed text-muted">
        {L('Tu método de pago y tus facturas se administran en el portal seguro de Stripe.', 'Your card and invoices live in Stripe’s secure portal.')}
      </p>
      <button onClick={openPortal} disabled={busy} className="mt-4 cursor-pointer rounded-btn bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white disabled:opacity-60">
        {L('Abrir portal de pagos', 'Open billing portal')}
      </button>
    </div>
  );

  const openUpgrade = (p?: 'verified' | 'premium') => {
    setPick(p ?? (isFree ? 'verified' : 'premium'));
    setUpgradeOpen(true);
  };
  const confirmUpgrade = async () => {
    // Real business → Stripe Checkout (redirect). Demo → local restyle (showcase).
    if (real && !admin.demo) {
      setBusy(true);
      const { url, error } = await startCheckout(pick, real.id);
      setBusy(false);
      if (url) { window.location.href = url; return; }
      flash(error === 'offline' ? L('Sin conexión', 'Offline') : L('No se pudo iniciar el pago. Intenta de nuevo.', 'Could not start checkout. Try again.'));
      return;
    }
    setTier(pick);
    setUpgradeOpen(false);
    flash(L('¡Listo! Ahora eres ', "You're now on ") + (pick === 'verified' ? 'Verified' : 'Premium'));
  };
  const confirmCancel = async () => {
    // Real business → Stripe Billing Portal (manage / cancel). Demo → local restyle.
    if (real && !admin.demo) {
      setBusy(true);
      const { url, error } = await openBillingPortal(real.id);
      setBusy(false);
      if (url) { window.location.href = url; return; }
      setCancelOpen(false);
      flash(error === 'no subscription' ? L('No tienes una suscripción activa', 'No active subscription') : L('No se pudo abrir el portal', 'Could not open the portal'));
      return;
    }
    setTier('free');
    setCancelOpen(false);
    flash(L('Plan cancelado · activo hasta 14 Nov', 'Plan canceled · active until Nov 14'));
  };
  const toggleAddon = (k: AddonKey) => {
    setAddons((a) => ({ ...a, [k]: !a[k] }));
    flash(addons[k] ? L('Complemento quitado', 'Add-on removed') : L('Complemento agregado', 'Add-on added'));
  };

  // ---------- sub-tabs ----------
  const subtabs: [Sub, string][] = [
    ['plan', L('Plan', 'Plan')],
    ['compare', L('Comparar', 'Compare')],
    ['methods', L('Pagos', 'Methods')],
    ['invoices', L('Facturas', 'Invoices')],
  ];

  // ---------- plan card config (tier-styled) ----------
  const dark = isPaid;
  const planCard = isFree
    ? {
        bg: '#fff', blob: 'rgba(123,97,255,.06)', badge: '○', name: 'Free', price: '· $0/mes',
        renew: L('Sin tarjeta', 'No card'),
        line: L('Listado básico. Mejora para desbloquear módulos e insignia.', 'Basic listing. Upgrade to unlock modules and the badge.'),
        upgrade: { label: L('Mejorar a Verified · $19/mes', 'Upgrade to Verified · $19/mo'), bg: '#7B61FF', c: '#fff', to: 'verified' as const },
        showChange: false,
      }
    : isPremium
      ? {
          bg: 'linear-gradient(150deg,#2A2440,#1E1B2E)', blob: 'rgba(244,183,64,.16)', badge: '✦', name: 'Premium', price: '· $49/mes',
          renew: L('Renueva 14 Nov', 'Renews Nov 14'),
          line: L('Insights AI, posición destacada y soporte prioritario.', 'Insights AI, featured placement and priority support.'),
          upgrade: null, showChange: true,
        }
      : {
          bg: 'linear-gradient(150deg,#7B61FF,#6743E2)', blob: 'rgba(255,255,255,.14)', badge: '✓', name: 'Verified', price: '· $19/mes',
          renew: L('Renueva 14 Nov', 'Renews Nov 14'),
          line: L('Insignia verificada, todos los módulos y 5× visibilidad.', 'Verified badge, all modules and 5× visibility.'),
          upgrade: { label: L('Mejorar a Premium · $49/mes', 'Upgrade to Premium · $49/mo'), bg: '#F4B740', c: '#1E1B2E', to: 'premium' as const },
          showChange: true,
        };

  const kickerCls = dark ? 'text-white/80' : 'text-amber-ink';
  const subCls = dark ? 'text-white/60' : 'text-muted-2';
  const fgCls = dark ? 'text-white' : 'text-ink';
  const ghostRing = dark ? 'rgba(255,255,255,.25)' : 'rgba(30,27,46,.15)';

  const planCardEl = (
    <div className="relative overflow-hidden rounded-card p-[18px]" style={{ background: planCard.bg }}>
      <div className="absolute -right-8 -top-8 h-[120px] w-[120px] rounded-full" style={{ background: planCard.blob }} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className={`text-[9.5px] font-extrabold uppercase tracking-[.06em] ${kickerCls}`}>{planCard.badge} {L('Plan actual', 'Current plan')}</span>
          <span className={`text-[10.5px] font-bold ${subCls}`}>{planCard.renew}</span>
        </div>
        <div className="mt-3 flex items-baseline gap-2.5">
          <span className={`text-[30px] font-extrabold tracking-[-.02em] ${fgCls}`}>{planCard.name}</span>
          <span className={`text-[14px] font-bold ${subCls}`}>{planCard.price}</span>
        </div>
        <div className={`mt-1 text-[11.5px] font-medium leading-snug ${subCls}`}>{planCard.line}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {planCard.upgrade && (
            <button
              onClick={() => openUpgrade(planCard.upgrade!.to)}
              className="cursor-pointer rounded-btn px-[15px] py-[11px] text-[12px] font-extrabold"
              style={{ background: planCard.upgrade.bg, color: planCard.upgrade.c }}
            >
              {planCard.upgrade.label} ›
            </button>
          )}
          {planCard.showChange && (
            <button
              onClick={() => openUpgrade()}
              className={`cursor-pointer rounded-btn border bg-transparent px-[15px] py-[11px] text-[12px] font-extrabold ${fgCls}`}
              style={{ borderColor: ghostRing }}
            >
              {L('Cambiar plan', 'Change plan')}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ---------- usage meters ----------
  const usage: { Icon: typeof ShoppingBag; label: string; value: string; max: string; pct: number }[] = isFree
    ? [
        { Icon: ShoppingBag, label: L('Pedidos', 'Orders'), value: '0', max: L('Verified', 'Verified'), pct: 0 },
        { Icon: Calendar, label: L('Reservas', 'Bookings'), value: '0', max: L('Verified', 'Verified'), pct: 0 },
        { Icon: ImageIcon, label: L('Fotos', 'Photos'), value: '1', max: '1', pct: 100 },
        { Icon: Users, label: L('Miembros', 'Staff seats'), value: '2', max: '2', pct: 100 },
      ]
    : [
        { Icon: ShoppingBag, label: L('Pedidos', 'Orders'), value: '284', max: '1,000', pct: 28 },
        { Icon: Calendar, label: L('Reservas', 'Bookings'), value: '128', max: '500', pct: 26 },
        { Icon: ImageIcon, label: L('Fotos', 'Photos'), value: '34', max: '∞', pct: 8 },
        { Icon: Users, label: L('Miembros', 'Staff seats'), value: '14', max: '20', pct: 70 },
      ];
  const barColor = (pct: number) => (pct >= 90 ? '#D6336C' : pct >= 75 ? '#F4B740' : '#7B61FF');

  const usageEl = (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-extrabold text-ink">{L('Uso este mes', 'Usage this month')}</span>
        <span className="text-[10.5px] font-semibold text-muted-2">Oct 2025</span>
      </div>
      <div className="flex flex-col gap-3">
        {usage.map((u) => {
          const danger = u.pct >= 90;
          return (
            <div key={u.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-soft">
                  <u.Icon size={13} strokeWidth={2.2} className="text-muted-2" />{u.label}
                </span>
                <span className={`text-[11px] font-extrabold ${danger ? 'text-pink-dark' : 'text-muted-2'}`}>{u.value} / {u.max}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-lilac-line">
                <div className="h-full rounded-full" style={{ width: `${u.pct}%`, background: barColor(u.pct) }} />
              </div>
            </div>
          );
        })}
      </div>
      {isFree && (
        <div className="mt-3 flex items-center gap-2.5 rounded-field bg-amber-bg px-3 py-2.5">
          <AlertTriangle size={16} stroke={2.2} className="flex-none text-amber-ink" />
          <span className="text-[10.5px] font-semibold leading-snug text-amber-ink">
            {L('Llegaste al límite de fotos del plan Free. Mejora para subir ilimitadas.', "You've hit the Free photo limit. Upgrade for unlimited.")}
          </span>
        </div>
      )}
    </div>
  );

  // ---------- next invoice ----------
  const base = isPremium ? 49 : 19;
  const addonPrices: Record<AddonKey, number> = { featured: 15, boost: 20, seats: 8, sms: 5 };
  const addonLineDefs: [AddonKey, string, string][] = [
    ['boost', L('Impulso patrocinado', 'Sponsored boost'), '$20.00'],
    ['featured', L('Posición destacada', 'Featured placement'), '$15.00'],
    ['seats', L('Asientos extra (5)', 'Extra seats (5)'), '$8.00'],
    ['sms', L('Créditos SMS', 'SMS credits'), '$5.00'],
  ];
  const addonSum = (Object.keys(addons) as AddonKey[]).reduce((s, k) => s + (addons[k] ? addonPrices[k] : 0), 0);
  const nextTotal = `$${base + addonSum}.00`;

  const nextInvoiceEl = (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Próxima factura', 'Next invoice')}</div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-ink-soft">{meta.name} · {L('mensual', 'monthly')}</span>
          <span className="text-[12px] font-bold text-ink">${base}.00</span>
        </div>
        {addonLineDefs.filter(([k]) => addons[k]).map(([k, label, price]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-muted">{label}</span>
            <span className="text-[12px] font-semibold text-ink-soft">{price}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-hair-strong pt-3">
        <span className="text-[13px] font-extrabold text-ink">{L('Total a pagar', 'Total due')}</span>
        <span className="text-[16px] font-extrabold text-ink">{nextTotal}</span>
      </div>
      <div className="mt-1.5 text-[10px] font-semibold text-muted-2">{L('Se cobra el', 'Charges on')} {renewDate}{!isReal ? ' · Visa ••4421' : ''}</div>
    </div>
  );

  // ---------- add-ons ----------
  const addonDefs: { key: AddonKey; Icon: typeof Star; bg: string; c: string; label: string; price: string }[] = [
    { key: 'featured', Icon: Star, bg: '#FCEFD6', c: '#B5791A', label: L('Posición destacada', 'Featured placement'), price: `$15/${L('mes', 'mo')}` },
    { key: 'boost', Icon: Zap, bg: '#F1EFFA', c: '#6D4DF6', label: L('Impulso patrocinado', 'Sponsored boost'), price: `$20/${L('sem', 'wk')}` },
    { key: 'seats', Icon: Users, bg: '#E4ECFB', c: '#2A5C8A', label: L('5 asientos extra', '5 extra staff seats'), price: `$8/${L('mes', 'mo')}` },
    { key: 'sms', Icon: MessageSquare, bg: '#E3F5EA', c: '#1F8A4C', label: L('500 créditos SMS', '500 SMS credits'), price: `$5/${L('mes', 'mo')}` },
  ];
  const addonsEl = (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-extrabold text-ink">{L('Complementos', 'Add-ons')}</span>
        <span className="text-[10.5px] font-semibold text-muted-2">{L('Opcional', 'Optional')}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {addonDefs.map((a) => {
          const on = addons[a.key];
          return (
            <div key={a.key} className={`flex items-center gap-2.5 rounded-tile border p-2.5 ${on ? 'border-[rgba(123,97,255,.25)] bg-lilac-3' : 'border-hair bg-white'}`}>
              <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px]" style={{ background: a.bg }}>
                <a.Icon size={16} strokeWidth={2.2} style={{ color: a.c }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-extrabold text-ink">{a.label}</span>
                <span className="block text-[10px] font-medium text-muted">{a.price}</span>
              </span>
              <button
                onClick={() => toggleAddon(a.key)}
                aria-label={a.label}
                className={`relative h-[26px] w-11 flex-none cursor-pointer rounded-full transition-colors ${on ? 'bg-primary' : 'bg-lilac-line'}`}
              >
                <span className="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-cta-sm transition-all" style={{ left: on ? 21 : 3 }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ---------- compare table ----------
  const Y = '✓', N = '—';
  const planHeads: { name: string; price: string; current: boolean; hi: boolean }[] = [
    { name: 'Free', price: '$0', current: isFree, hi: false },
    { name: 'Verified', price: '$19/mo', current: tier === 'verified', hi: true },
    { name: 'Premium', price: '$49/mo', current: isPremium, hi: false },
  ];
  const compareRows: [string, string, string, string][] = [
    [L('Listado básico', 'Basic listing'), Y, Y, Y],
    [L('Fotos', 'Photos'), '1', '∞', '∞+vid'],
    [L('Insignia verificada', 'Verified badge'), N, Y, Y],
    [L('Módulos', 'Modules'), N, Y, Y],
    [L('Pedidos y entrega', 'Orders & delivery'), N, Y, Y],
    [L('Eventos y boletos', 'Events & tickets'), N, Y, Y],
    [L('Posición destacada', 'Featured placement'), N, N, Y],
    ['Insights AI', N, N, Y],
    [L('Soporte', 'Support'), 'Email', L('Prioridad', 'Priority'), '24/7'],
  ];

  const compareEl = (
    <div className="mx-auto flex max-w-3xl flex-col gap-3.5">
      <div className={`${cardCls} overflow-hidden !rounded-card`}>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[380px] border-collapse text-[10.5px]">
            <thead>
              <tr>
                <th className="bg-lilac-3 px-3 py-3 text-left text-[10px] font-extrabold text-muted">{L('Función', 'Feature')}</th>
                {planHeads.map((h) => (
                  <th key={h.name} className={`px-1.5 py-2.5 text-center ${h.hi ? 'bg-lilac-2' : 'bg-lilac-3'}`}>
                    <div className={`text-[11px] font-extrabold ${h.hi ? 'text-primary-dark' : 'text-ink'}`}>{h.name}</div>
                    <div className="mt-0.5 text-[8.5px] font-bold text-muted-2">{h.price}</div>
                    {h.current && <div className="mt-1 inline-block rounded bg-green-bg px-1.5 py-px text-[7.5px] font-extrabold text-green-dark">{L('Actual', 'Current')}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((r) => (
                <tr key={r[0]}>
                  <td className="border-t border-hair px-3 py-2.5 text-[10.5px] font-semibold text-ink-soft">{r[0]}</td>
                  <td className="border-t border-hair px-1.5 py-2.5 text-center text-[10px] font-bold text-muted-2">{r[1]}</td>
                  <td className="border-t border-hair bg-lilac-3 px-1.5 py-2.5 text-center text-[10px] font-extrabold text-ink">{r[2]}</td>
                  <td className="border-t border-hair px-1.5 py-2.5 text-center text-[10px] font-bold text-ink-soft">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => openUpgrade('verified')}
          className={`cursor-pointer rounded-btn py-3 text-[12.5px] font-extrabold text-white ${tier === 'verified' ? 'bg-ink' : 'bg-primary shadow-cta-sm'}`}
        >
          {L('Elegir Verified', 'Choose Verified')}
        </button>
        <button
          onClick={() => openUpgrade('premium')}
          className="cursor-pointer rounded-btn bg-ink py-3 text-[12.5px] font-extrabold text-amber"
        >
          {L('Elegir Premium', 'Choose Premium')}
        </button>
      </div>
      <div className="flex items-center gap-2.5 rounded-tile bg-lilac-2 px-4 py-3">
        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-primary">
          <Shield size={16} stroke={2.2} className="text-white" />
        </span>
        <div>
          <div className="text-[12px] font-extrabold text-ink">{L('Garantía de 14 días', '14-day guarantee')}</div>
          <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-ink-3">{L('Cancela cuando quieras. Sin contratos.', 'Cancel anytime. No contracts.')}</div>
        </div>
      </div>
    </div>
  );

  // ---------- payment methods ----------
  const cards = [
    { brand: 'VISA', brandBg: 'linear-gradient(135deg,#1A1F71,#3B4F9F)', label: 'Visa ••4421', exp: L('Vence 03/27 · Elisabeth R.', 'Exp 03/27 · Elisabeth R.'), isDefault: true },
    { brand: 'MC', brandBg: 'linear-gradient(135deg,#EB001B,#F79E1B)', label: 'Mastercard ••8821', exp: L('Vence 11/26 · Respaldo', 'Exp 11/26 · Backup'), isDefault: false },
  ];
  const billingInfo = [
    { Icon: Mail, bg: '#F1EFFA', c: '#6D4DF6', label: L('Correo de facturación', 'Billing email'), value: 'pagos@lupitas.com' },
    { Icon: MapPin, bg: '#FCEFD6', c: '#B5791A', label: L('Dirección', 'Billing address'), value: '5821 Bellaire Blvd, Houston' },
    { Icon: FileText, bg: '#E3F5EA', c: '#1F8A4C', label: L('RFC / EIN', 'Tax ID / EIN'), value: 'XX-XXX2487' },
  ];

  const methodsEl = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`${cardCls} flex items-center gap-3 p-3.5`}>
            <span className="flex h-9 w-[54px] flex-none items-center justify-center rounded-lg text-[10px] font-extrabold tracking-[.05em] text-white" style={{ background: c.brandBg }}>{c.brand}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[12.5px] font-extrabold text-ink">{c.label}</span>
                {c.isDefault && <span className="rounded bg-lilac px-1.5 py-px text-[8px] font-extrabold text-primary-dark">{L('Predeterminada', 'Default')}</span>}
              </div>
              <div className="mt-0.5 text-[10.5px] font-medium text-muted-2">{c.exp}</div>
            </div>
            <button onClick={() => flash(L('Editando tarjeta…', 'Editing card…'))} className="flex-none cursor-pointer p-1 text-muted-2" aria-label={L('Editar', 'Edit')}>
              <Pencil size={14} stroke={2.2} />
            </button>
          </div>
        ))}
        <button
          onClick={() => flash(L('Abriendo formulario de tarjeta…', 'Opening card form…'))}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-btn-lg border-[1.5px] border-dashed border-lilac-ring bg-white p-3.5 text-[12.5px] font-extrabold text-primary-dark"
        >
          <Plus size={15} stroke={2.4} />{L('Agregar método de pago', 'Add payment method')}
        </button>
      </div>

      <div className="flex flex-col gap-3 xl:sticky xl:top-[74px]">
        <div className={`${cardCls} px-4 py-1`}>
          {billingInfo.map((b, i) => (
            <div key={b.label} className={`flex items-center gap-3 py-3 ${i < billingInfo.length - 1 ? 'border-b border-hair' : ''}`}>
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px]" style={{ background: b.bg }}>
                <b.Icon size={14} strokeWidth={2.2} style={{ color: b.c }} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-semibold text-muted-2">{b.label}</div>
                <div className="mt-0.5 truncate text-[12px] font-bold text-ink">{b.value}</div>
              </div>
              <button onClick={() => flash(L('Editando…', 'Editing…'))} className="flex-none cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-1">
          <Lock size={14} stroke={2.2} className="flex-none text-muted-2" />
          <span className="text-[10px] font-medium leading-snug text-muted-2">
            {L('Pagos protegidos y encriptados. To’Latino nunca guarda tu número completo.', 'Payments are secured and encrypted. To’Latino never stores your full number.')}
          </span>
        </div>
      </div>
    </div>
  );

  // ---------- invoices ----------
  const invoices: [string, string][] = [
    ['INV-2487', L('14 Oct, 2025', 'Oct 14, 2025')],
    ['INV-2280', L('14 Sep, 2025', 'Sep 14, 2025')],
    ['INV-2102', L('14 Ago, 2025', 'Aug 14, 2025')],
    ['INV-1908', L('14 Jul, 2025', 'Jul 14, 2025')],
    ['INV-1740', L('14 Jun, 2025', 'Jun 14, 2025')],
  ];
  const invoicesEl = (
    <div className="mx-auto flex max-w-3xl flex-col">
      <div className="mb-3.5 grid grid-cols-2 gap-3">
        <div className={`${cardCls} p-3.5`}>
          <div className="text-[10px] font-semibold text-muted">{L('Pagado este año', 'Paid this year')}</div>
          <div className="mt-1 text-[20px] font-extrabold text-ink">$190.00</div>
        </div>
        <div className={`${cardCls} p-3.5`}>
          <div className="text-[10px] font-semibold text-muted">{L('Próximo cobro', 'Next charge')}</div>
          <div className="mt-1 text-[20px] font-extrabold text-ink">{nextTotal}</div>
        </div>
      </div>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[13px] font-extrabold text-ink">{L('Historial', 'History')}</span>
        <button onClick={() => flash(L('Exportando facturas (CSV)…', 'Exporting invoices (CSV)…'))} className="cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Exportar todo', 'Export all')}</button>
      </div>
      <div className={`${cardCls} px-4 py-1`}>
        {invoices.map((iv, i) => (
          <div key={iv[0]} className={`flex items-center gap-3 py-3 ${i < invoices.length - 1 ? 'border-b border-hair' : ''}`}>
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-green-bg">
              <FileText size={16} stroke={2.2} className="text-green-dark" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-extrabold text-ink">{iv[0]}</div>
              <div className="mt-0.5 text-[10px] font-medium text-muted-2">{iv[1]} · Verified · {L('mensual', 'monthly')}</div>
            </div>
            <div className="flex-none text-right">
              <div className="text-[12.5px] font-extrabold text-ink">$19.00</div>
              <span className="rounded bg-green-bg px-1.5 py-px text-[8.5px] font-extrabold text-green-dark">{L('Pagada', 'Paid')}</span>
            </div>
            <button onClick={() => flash(L('Descargando ', 'Downloading ') + iv[0])} className="flex-none cursor-pointer p-1 text-muted-2" aria-label={L('Descargar', 'Download')}>
              <Download size={16} stroke={2.2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // ---------- upgrade sheet content ----------
  const planOpts: { key: 'verified' | 'premium'; name: string; price: string; popular: boolean; feats: string[] }[] = [
    { key: 'verified', name: 'Verified', price: '$19/mes', popular: true, feats: [L('Insignia verificada', 'Verified badge'), L('Todos los módulos', 'All modules'), L('Fotos ilimitadas · 5× visibilidad', 'Unlimited photos · 5× visibility')] },
    { key: 'premium', name: 'Premium', price: '$49/mes', popular: false, feats: [L('Todo lo de Verified', 'Everything in Verified'), L('Insights AI + posición destacada', 'Insights AI + featured'), L('Soporte 24/7', '24/7 support')] },
  ];
  const pickMeta = { verified: ['Verified', '$19/mes'], premium: ['Premium', '$49/mes'] }[pick];

  // ---------- upgrade page (full-screen) ----------
  const upgradePage = (
    <ModulePage
      title={L('Elige tu plan', 'Choose your plan')}
      subtitle={L('Mejora tu cuenta', 'Upgrade your account')}
      onBack={() => setUpgradeOpen(false)}
      footer={
        <>
          <button onClick={confirmUpgrade} disabled={busy} className="w-full cursor-pointer rounded-btn-lg bg-primary p-3.5 text-[13.5px] font-extrabold text-white shadow-cta disabled:opacity-60">
            {busy ? L('Redirigiendo a Stripe…', 'Redirecting to Stripe…') : <>{L('Confirmar · ', 'Confirm · ')}{pickMeta[0]} {pickMeta[1]}</>}
          </button>
          <div className="mt-2.5 text-center text-[9.5px] font-medium leading-snug text-muted-2">
            {L('Se cobra hoy. Renovación automática mensual. Cancela cuando quieras.', 'Charged today. Auto-renews monthly. Cancel anytime.')}
          </div>
        </>
      }
    >
      <div className="text-[12px] font-medium leading-snug text-muted">
        {L('Mejora para desbloquear módulos, insignia verificada y más visibilidad.', 'Upgrade to unlock modules, the verified badge and more visibility.')}
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        {planOpts.map((p) => {
          const on = pick === p.key;
          return (
            <button key={p.key} onClick={() => setPick(p.key)} className={`cursor-pointer rounded-card border-2 p-4 text-left ${on ? 'border-primary bg-lilac-3' : 'border-hair bg-white'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[16px] font-extrabold ${p.key === 'premium' ? 'text-ink' : 'text-primary-dark'}`}>{p.name}</span>
                  {p.popular && <span className="rounded-md bg-amber px-2 py-0.5 text-[8.5px] font-extrabold text-ink">{L('Popular', 'Popular')}</span>}
                </div>
                <span className={`text-[15px] font-extrabold ${p.key === 'premium' ? 'text-ink' : 'text-primary-dark'}`}>{p.price}</span>
              </div>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {p.feats.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[11px] font-semibold text-ink-soft">
                    <Check size={13} stroke={2.6} className="flex-none text-green" />{f}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </ModulePage>
  );

  // ---------- render ----------
  // Upgrade takes over the screen as a full page (no cramped bottom sheet).
  if (upgradeOpen) return <>{upgradePage}<Toast msg={toast} /></>;

  return (
    <div className="relative pb-8">
      <SectionTabs
        className="mb-4"
        tabs={subtabs as SectionTab<Sub>[]}
        value={sub}
        onChange={setSub}
      />

      {sub === 'plan' && (
        <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {planCardEl}
            {/* Usage meters carry fabricated activity counts — showcase only until
                real per-business metering is wired. A real dashboard never invents stats. */}
            {!isReal && usageEl}
          </div>
          <div className="flex flex-col gap-4 xl:sticky xl:top-[74px]">
            {isPaid && nextInvoiceEl}
            {/* Add-ons aren't billable products yet (toggles are local-only), so a real
                business must not see a non-functional purchase surface. */}
            {!isReal && addonsEl}
            {isPaid && (
              <button onClick={() => setCancelOpen(true)} className="cursor-pointer py-2 text-center text-[11.5px] font-bold text-muted-2 underline">
                {L('Cancelar suscripción', 'Cancel subscription')}
              </button>
            )}
          </div>
        </div>
      )}

      {sub === 'compare' && compareEl}
      {sub === 'methods' && (isReal ? portalCta : methodsEl)}
      {sub === 'invoices' && (isReal ? portalCta : invoicesEl)}

      {/* ---------- Cancel confirm (small centered dialog) ---------- */}
      {cancelOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(30,27,46,.45)' }}
          onClick={() => setCancelOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[calc(100%-32px)] w-full max-w-[440px] overflow-y-auto rounded-card bg-white p-5 shadow-modal"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-tile bg-pink-bg">
              <AlertTriangle size={22} stroke={2.2} className="text-pink-dark" />
            </span>
            <div className="mt-3 text-[18px] font-extrabold text-ink">{L('¿Cancelar tu plan?', 'Cancel your plan?')}</div>
            <div className="mt-1.5 text-[12px] font-medium leading-relaxed text-muted">
              {isReal
                ? L(`Tu plan sigue activo hasta el final del periodo (${renewDate}). Después tu listado pasa a Free.`, `Your plan stays active until the end of the period (${renewDate}). After that your listing reverts to Free.`)
                : L('Tu plan sigue activo hasta el 14 de noviembre. Después tu listado pasa a Free.', 'Your plan stays active until Nov 14. After that your listing reverts to Free.')}
            </div>
            <div className="mt-3.5 rounded-tile border border-hair bg-white p-3">
              <div className="mb-2 text-[11px] font-extrabold text-amber-ink">{L('PERDERÁS:', "YOU'LL LOSE:")}</div>
              <div className="flex flex-col gap-1.5">
                {[
                  L('Insignia verificada y prioridad', 'Verified badge & priority'),
                  L('Menú, reservas, pedidos y eventos', 'Menu, bookings, orders & events'),
                  L('Fotos ilimitadas (vuelve a 1)', 'Unlimited photos (back to 1)'),
                ].map((l) => (
                  <div key={l} className="flex items-center gap-2 text-[11px] font-semibold text-ink-soft">
                    <X size={13} stroke={2.6} className="flex-none text-pink-dark" />{l}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setCancelOpen(false)} className="mt-4 w-full cursor-pointer rounded-btn-lg bg-primary p-3.5 text-[13px] font-extrabold text-white shadow-cta">
              {L('Mantener mi plan', 'Keep my plan')}
            </button>
            <button onClick={confirmCancel} className="mt-2.5 w-full cursor-pointer rounded-btn-lg border border-pink-bg bg-white p-3 text-[12.5px] font-extrabold text-pink-dark">
              {L('Sí, cancelar', 'Yes, cancel')}
            </button>
          </div>
        </div>
      )}

      <Toast msg={toast} />
    </div>
  );
}
